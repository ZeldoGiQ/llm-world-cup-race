/**
 * Job "ingest" – Feeds erzeugen neue Events.
 *
 * Idempotent per Upsert auf (category, id): ein zweiter Lauf am selben Tag legt
 * nichts doppelt an. Bereits existierende Events werden NICHT überschrieben –
 * ihre Auflösungsregel und ihr Lock sind ab Erstellung fixiert.
 *
 * Ein fehlschlagender Feed stoppt die anderen nicht (Regel: Fehler → Bestand
 * unangetastet, weitermachen).
 *
 *   node --experimental-strip-types scripts/arena/jobs/ingest.mts
 */
import { writeRandomWalkPredictions } from '../lib/baseline.mts';
import { db, opsConfig, unwrap } from '../lib/db.mts';
import { notifyDiscord } from '../lib/notify.mts';
import { runJob } from '../lib/runs.mts';
import { FEEDS } from '../sources/index.mts';
import type { DraftEvent } from '../sources/types.mts';

/** Vorlauf: früher als das darf kein neuer Lock liegen (Modelle brauchen Zeit). */
const DEFAULT_MIN_LEAD_HOURS = 24;

function toRow(draft: DraftEvent, source: string): Record<string, unknown> {
  return {
    category: draft.category,
    id: draft.id,
    title: draft.title,
    titles: draft.titles ?? null,
    utc_date: draft.utcDate,
    status: 'UPCOMING',
    prediction_type: draft.predictionType,
    resolution: null,
    metadata: {
      ...draft.metadata,
      // Auflösungsvertrag + Prompt-Kontext werden mit dem Event fixiert.
      ...(draft.resolutionRule ? { resolutionRule: draft.resolutionRule } : {}),
      ...(draft.context ? { context: draft.context } : {}),
    },
    source,
    expected_resolution_at: draft.expectedResolutionAt ?? null,
  };
}

/**
 * Verlegte Termine behandeln.
 *
 * Der Lock ist der Anpfiff. Wird ein Spiel VORVERLEGT und niemand merkt es,
 * fragt der Predict-Job es nach dem echten Beginn ab – das Modell könnte den
 * Stand nachschlagen, und `created_at < utc_date` bliebe formal wahr. Der
 * Invarianten-Check kann diesen Fall deshalb prinzipiell nicht sehen; er muss
 * hier abgefangen werden.
 *
 * Mechanisch, ohne Ermessen:
 *   - noch keine Prediction  -> Termin nachziehen (das Event ist unbelastet)
 *   - schon Predictions da   -> VOID, weil die Tipps zu einem anderen Zeitpunkt
 *                               erhoben wurden als dem jetzt gültigen
 */
async function reconcileSchedule(
  drafts: DraftEvent[],
  existingIds: Set<string>,
  predictedIds: Set<string>,
): Promise<{ shifted: number; voided: number }> {
  let shifted = 0;
  let voided = 0;

  for (const draft of drafts) {
    const key = `${draft.category} ${draft.id}`;
    if (!existingIds.has(key)) continue;

    const current = unwrap(
      await db()
        .from('events')
        .select('utc_date, status, expected_resolution_at')
        .eq('category', draft.category)
        .eq('id', draft.id)
        .single(),
      `Event ${key} lesen`,
    ) as { utc_date: string; status: string; expected_resolution_at: string | null };

    if (current.status !== 'UPCOMING') continue;
    if (Date.parse(current.utc_date) === Date.parse(draft.utcDate)) continue;

    if (predictedIds.has(key)) {
      await db()
        .from('events')
        .update({
          status: 'VOID',
          void_reason:
            `Termin verlegt (${current.utc_date} -> ${draft.utcDate}), nachdem Vorhersagen ` +
            `erhoben wurden. Die Tipps galten für einen anderen Zeitpunkt.`,
          resolved_at: new Date().toISOString(),
        })
        .eq('category', draft.category)
        .eq('id', draft.id);
      voided += 1;
      console.log(`  ${key}: VOID – Termin nach Abgabe verlegt.`);
    } else {
      await db()
        .from('events')
        .update({
          utc_date: draft.utcDate,
          expected_resolution_at: draft.expectedResolutionAt ?? current.expected_resolution_at,
        })
        .eq('category', draft.category)
        .eq('id', draft.id);
      shifted += 1;
      console.log(`  ${key}: Termin nachgezogen ${current.utc_date} -> ${draft.utcDate}`);
    }
  }

  return { shifted, voided };
}

async function main(): Promise<void> {
  await runJob('ingest', async (runId) => {
    const caps = await opsConfig<Record<string, number>>('feed_caps', {});
    const minLeadHours = (await opsConfig<{ minLeadHours?: number }>('ingest', {})).minLeadHours
      ?? DEFAULT_MIN_LEAD_HOURS;
    const minUtcDate = new Date(Date.now() + minLeadHours * 3_600_000);

    const stats: Record<string, unknown> = {};
    const problems: string[] = [];
    let created = 0;
    let shifted = 0;
    let voided = 0;

    for (const feed of FEEDS) {
      const cap = caps[feed.id] ?? 10;
      try {
        const drafts = await feed.fetchEvents({ cap, minUtcDate });
        if (drafts.length === 0) {
          stats[feed.id] = 0;
          continue;
        }

        const ids = drafts.map((draft) => draft.id);
        const existing = unwrap(
          await db().from('events').select('category, id').in('id', ids),
          'vorhandene Events lesen',
        ) as { category: string; id: string }[];
        const existingIds = new Set(existing.map((row) => `${row.category} ${row.id}`));

        const predicted = unwrap(
          await db().from('predictions').select('category, event_id').in('event_id', ids),
          'vorhandene Predictions lesen',
        ) as { category: string; event_id: string }[];
        const predictedIds = new Set(predicted.map((row) => `${row.category} ${row.event_id}`));

        // Nur wirklich neue Events einfügen: Auflösungsregel und Kontext eines
        // bestehenden Events bleiben unberührt (bei Erstellung fixiert).
        const { error } = await db()
          .from('events')
          .upsert(drafts.map((draft) => toRow(draft, feed.id)), {
            onConflict: 'category,id',
            ignoreDuplicates: true,
          });
        if (error) throw new Error(error.message);

        // Termine der bestehenden Events gegen den Feed abgleichen.
        const reconciled = await reconcileSchedule(drafts, existingIds, predictedIds);
        shifted += reconciled.shifted;
        voided += reconciled.voided;

        // Referenz-Teilnehmer sofort mit anlegen: nach dem Lock ist das nicht
        // mehr erlaubt, und ohne Baseline bleibt der Skill-Score dauerhaft leer.
        const newDrafts = drafts.filter((d) => !existingIds.has(`${d.category} ${d.id}`));
        const baselines = await writeRandomWalkPredictions(newDrafts, runId);

        const fresh = newDrafts.length;
        stats[feed.id] = { new: fresh, known: existingIds.size, baselines, ...reconciled };
        created += fresh;
        console.log(
          `${feed.id}: ${drafts.length} Events angeboten (Cap ${cap}), davon ${fresh} neu.`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        problems.push(`${feed.id}: ${message}`);
        stats[feed.id] = `error: ${message}`;
        console.error(`${feed.id} fehlgeschlagen: ${message}`);
      }
    }

    if (problems.length > 0) {
      await notifyDiscord(`⚠️ arena-ingest: ${problems.length} Feed(s) fehlgeschlagen\n${problems.join('\n')}`);
    }
    if (voided > 0) {
      await notifyDiscord(
        `⚠️ arena-ingest: ${voided} Event(s) ungültig, weil der Termin nach der Abgabe verlegt wurde.`,
      );
    }

    return { created, shifted, voided, feeds: stats, failedFeeds: problems.length };
  });
}

await main();
