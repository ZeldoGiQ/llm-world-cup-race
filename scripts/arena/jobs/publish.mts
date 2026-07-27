/**
 * Job "publish" – DB → public/arena-data/** (+ models.json, registry.json).
 *
 * Der EINZIGE Job, dessen Ausgabe committet wird (Single Writer, keine
 * Push-Races). Der Commit ist der Lock-Beweis: eine Prediction liegt damit
 * öffentlich und zeitgestempelt im Git, bevor das Event beginnt.
 *
 * Zwei harte Regeln:
 *  - Geschrieben wird nur bei inhaltlicher Änderung (writeIfChanged) – sonst
 *    entstehen Leer-Commits und unnötige Vercel-Deploys.
 *  - Eine Prediction mit created_at > utc_date wird NIE exportiert. Das kann
 *    nur durch einen Fehler entstehen; der Export verweigert sie und meldet es.
 *
 *   node --experimental-strip-types scripts/arena/jobs/publish.mts
 */
import path from 'node:path';
import {
  db,
  fetchAll,
  unwrap,
  type EventRow,
  type FailureRow,
  type ModelRow,
  type PredictionRow,
} from '../lib/db.mts';
import { ROOT } from '../lib/env.mts';
import {
  buildEventsFile,
  buildFailuresFile,
  buildPredictionsFile,
  writeIfChanged,
  type CategoryExport,
} from '../lib/export-json.mts';
import { exportModels, exportRegistry } from '../lib/registry-export.mts';
import { runJob } from '../lib/runs.mts';

const OUT_ROOT = path.join(ROOT, 'public/arena-data');

async function main(): Promise<void> {
  await runJob('publish', async () => {
    const events = await fetchAll<EventRow>(
      'events',
      'category, id, title, titles, utc_date, status, prediction_type, resolution, metadata, source, open_at, expected_resolution_at, resolved_at, void_reason',
      ['category', 'id'],
    );
    const predictions = await fetchAll<PredictionRow>(
      'predictions',
      'category, event_id, model_id, value, created_at',
      ['category', 'event_id', 'model_id'],
    );
    const failures = await fetchAll<FailureRow>(
      'prediction_failures',
      'category, event_id, model_id, code, detail, created_at',
      ['id'],
    );
    const models = unwrap(
      await db().from('models').select('*').order('id'),
      'models lesen',
    ) as ModelRow[];

    const lockByEvent = new Map(events.map((e) => [`${e.category} ${e.id}`, e.utc_date]));

    // Lock-Integrität: nach dem Lock erhobene Predictions gehören nicht in den
    // Export. Sie bleiben in der DB (Audit), zählen aber nie.
    // Verglichen wird über Date.parse, nicht als Text: Postgres liefert
    // "+00:00", der Exporter schreibt "Z" – ein Textvergleich gemischter
    // ISO-Schreibweisen ist an der Sekundengrenze nicht verlässlich.
    const late: string[] = [];
    const exportable = predictions.filter((p) => {
      const lock = lockByEvent.get(`${p.category} ${p.event_id}`);
      if (lock && Date.parse(p.created_at) > Date.parse(lock)) {
        late.push(`${p.category}/${p.event_id}/${p.model_id}`);
        return false;
      }
      return true;
    });
    if (late.length > 0) {
      console.error(`Nach dem Lock erhoben, NICHT exportiert: ${late.join(', ')}`);
    }

    const updatedAt = new Date().toISOString();
    const categoryIds = [...new Set(events.map((e) => e.category))].sort();
    let written = 0;

    for (const category of categoryIds) {
      const data: CategoryExport = {
        category,
        updatedAt,
        events: events.filter((e) => e.category === category),
        predictions: exportable.filter((p) => p.category === category),
        failures: failures.filter((f) => f.category === category),
      };

      const dir = path.join(OUT_ROOT, category);
      if (await writeIfChanged(path.join(dir, 'events.json'), buildEventsFile(data))) written += 1;
      if (await writeIfChanged(path.join(dir, 'predictions.json'), buildPredictionsFile(data))) {
        written += 1;
      }
      const failuresFile = buildFailuresFile(data);
      if (Object.keys(failuresFile.failures as object).length > 0) {
        if (await writeIfChanged(path.join(dir, 'failures.json'), failuresFile)) written += 1;
      }
    }

    if (await exportRegistry(categoryIds)) written += 1;
    if (await exportModels(models)) written += 1;

    return {
      categories: categoryIds.length,
      events: events.length,
      predictions: exportable.length,
      lateSkipped: late.length,
      filesWritten: written,
    };
  });
}

await main();
