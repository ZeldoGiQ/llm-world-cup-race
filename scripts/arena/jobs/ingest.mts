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
import { db, opsConfig } from '../lib/db.mts';
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

async function main(): Promise<void> {
  await runJob('ingest', async () => {
    const caps = await opsConfig<Record<string, number>>('feed_caps', {});
    const minLeadHours = (await opsConfig<{ minLeadHours?: number }>('ingest', {})).minLeadHours
      ?? DEFAULT_MIN_LEAD_HOURS;
    const minUtcDate = new Date(Date.now() + minLeadHours * 3_600_000);

    const stats: Record<string, unknown> = {};
    const problems: string[] = [];
    let created = 0;

    for (const feed of FEEDS) {
      const cap = caps[feed.id] ?? 10;
      try {
        const drafts = await feed.fetchEvents({ cap, minUtcDate });
        if (drafts.length === 0) {
          stats[feed.id] = 0;
          continue;
        }

        // Nur wirklich neue Events einfügen: bestehende bleiben unberührt,
        // damit Lock und Auflösungsregel nie nachträglich wandern.
        const { error } = await db()
          .from('events')
          .upsert(drafts.map((draft) => toRow(draft, feed.id)), {
            onConflict: 'category,id',
            ignoreDuplicates: true,
          });
        if (error) throw new Error(error.message);

        stats[feed.id] = drafts.length;
        created += drafts.length;
        console.log(`${feed.id}: ${drafts.length} Events angeboten (Cap ${cap}).`);
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

    return { offered: created, feeds: stats, failedFeeds: problems.length };
  });
}

await main();
