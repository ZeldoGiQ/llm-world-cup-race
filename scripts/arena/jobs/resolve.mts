/**
 * Job "resolve" – fällige Events auflösen.
 *
 * Deterministisch über den Feed, der das Event erzeugt hat: dieselbe Quelle und
 * dieselbe Extraktionsregel, die bei der Erstellung fixiert wurde. Kein
 * Nachdenken, keine Operator-Diskretion.
 *
 * VOID-Katalog (mechanisch, abschließend):
 *  - Feed meldet abgesagt/verschoben/kein verwertbares Ergebnis
 *  - Quelle liefert nach der Frist (Default 7 Tage) weiterhin keinen Wert
 *  - Wert verletzt den Datenvertrag des Event-Typs
 * VOID ist permanent und bleibt sichtbar – kein Selektions-Verdacht.
 *
 *   node --experimental-strip-types scripts/arena/jobs/resolve.mts
 */
import { validateResolution } from '../lib/contract.mts';
import { db, unwrap, type EventRow } from '../lib/db.mts';
import { notifyDiscord } from '../lib/notify.mts';
import { runJob } from '../lib/runs.mts';
import { feedById } from '../sources/index.mts';
import type { ResolvedEvent } from '../sources/types.mts';

/** Nach dieser Frist ohne Ergebnis wird ein Event endgültig ungültig. */
const VOID_AFTER_DAYS = 7;

async function writeResolution(event: EventRow, result: ResolvedEvent): Promise<'resolved' | 'void'> {
  if (result.voidReason) {
    await db()
      .from('events')
      .update({ status: 'VOID', void_reason: result.voidReason, resolved_at: new Date().toISOString() })
      .eq('category', event.category)
      .eq('id', event.id);
    await db().from('resolutions').insert({
      category: event.category,
      event_id: event.id,
      proposed: { void: result.voidReason },
      resolver: `deterministic:${event.source}`,
      evidence: result.evidence ?? {},
      accepted: true,
    });
    return 'void';
  }

  await db()
    .from('events')
    .update({
      status: 'RESOLVED',
      resolution: result.resolution,
      resolved_at: new Date().toISOString(),
    })
    .eq('category', event.category)
    .eq('id', event.id);
  await db().from('resolutions').insert({
    category: event.category,
    event_id: event.id,
    proposed: result.resolution,
    resolver: `deterministic:${event.source}`,
    evidence: result.evidence ?? {},
    accepted: true,
  });
  return 'resolved';
}

async function main(): Promise<void> {
  await runJob('resolve', async () => {
    const nowIso = new Date().toISOString();

    // Fällig = Lock vorbei und noch nicht abgeschlossen.
    const dueByLock = unwrap(
      await db()
        .from('events')
        .select('*')
        .in('status', ['UPCOMING', 'LIVE'])
        .lte('utc_date', nowIso)
        .order('utc_date'),
      'fällige Events lesen',
    ) as EventRow[];

    /*
     * Zweites Tor: Der Lock ist nur der Vorhersage-Schluss, nicht der Zeitpunkt,
     * ab dem ein Ergebnis existiert. Ein Aktien-Event lockt Montag 00:00 und
     * wird erst am Freitagabend messbar; ein Spiel ist erst nach Abpfiff
     * ausgewertet. Ohne diese Grenze würde ein Resolver einen Zwischenwert als
     * Endergebnis festschreiben – und Resolutions werden nicht revidiert.
     */
    const events = dueByLock.filter(
      (event) => !event.expected_resolution_at || event.expected_resolution_at <= nowIso,
    );
    const tooEarly = dueByLock.length - events.length;
    if (tooEarly > 0) console.log(`${tooEarly} Events gelockt, aber noch nicht messbar – warten.`);

    if (events.length === 0) {
      return { due: 0, resolved: 0, void: 0, pending: 0, notYetMeasurable: tooEarly };
    }

    const bySource = new Map<string, EventRow[]>();
    for (const event of events) {
      if (!bySource.has(event.source)) bySource.set(event.source, []);
      bySource.get(event.source)!.push(event);
    }

    let resolved = 0;
    let voided = 0;
    let pending = 0;
    const problems: string[] = [];

    for (const [source, sourceEvents] of bySource) {
      const feed = feedById(source);
      if (!feed) {
        // z. B. 'scout' (Phase 2) oder ein entfernter Feed – nicht hier zuständig.
        pending += sourceEvents.length;
        continue;
      }

      let results: ResolvedEvent[];
      try {
        results = await feed.resolve(
          sourceEvents.map((e) => ({ category: e.category, id: e.id, metadata: e.metadata ?? {} })),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        problems.push(`${source}: ${message}`);
        console.error(`${source} nicht auflösbar: ${message}`);
        pending += sourceEvents.length;
        continue; // Regel 1: Fehler → Bestand unangetastet
      }

      const byId = new Map(results.map((r) => [`${r.category} ${r.id}`, r]));

      for (const event of sourceEvents) {
        const result = byId.get(`${event.category} ${event.id}`);
        const overdue =
          Date.now() - new Date(event.expected_resolution_at ?? event.utc_date).getTime() >
          VOID_AFTER_DAYS * 86_400_000;

        if (!result || (!result.resolution && !result.voidReason)) {
          if (overdue) {
            voided += 1;
            await writeResolution(event, {
              category: event.category,
              id: event.id,
              resolution: null,
              voidReason: `Quelle liefert nach ${VOID_AFTER_DAYS} Tagen kein Ergebnis.`,
            });
          } else {
            pending += 1;
          }
          continue;
        }

        // Datenvertrag prüfen, bevor irgendetwas gewertet wird.
        if (result.resolution && !validateResolution(event.prediction_type, result.resolution)) {
          voided += 1;
          await writeResolution(event, {
            ...result,
            resolution: null,
            voidReason: `Ergebnis der Quelle verletzt den ${event.prediction_type}-Vertrag.`,
          });
          continue;
        }

        const outcome = await writeResolution(event, result);
        if (outcome === 'resolved') {
          resolved += 1;
          console.log(`${event.category}/${event.id}: ${JSON.stringify(result.resolution)}`);
        } else {
          voided += 1;
          console.log(`${event.category}/${event.id}: VOID – ${result.voidReason}`);
        }
      }
    }

    if (problems.length > 0) {
      await notifyDiscord(`⚠️ arena-resolve: ${problems.join('\n')}`);
    }

    return {
      due: events.length,
      resolved,
      void: voided,
      pending,
      notYetMeasurable: tooEarly,
      failedSources: problems.length,
    };
  });
}

await main();
