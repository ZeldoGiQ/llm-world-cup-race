/**
 * Deterministischer JSON-Export – erzeugt exakt den Frontend-Datenvertrag.
 *
 * Determinismus-Regeln:
 * - Events sortiert nach (utcDate, id); Objekt-Schlüssel in Vertragsreihenfolge.
 * - predictions.json: Event-IDs in Event-Reihenfolge, Modell-IDs alphabetisch.
 * - Geschrieben wird nur bei INHALTLICHER Änderung – updatedAt allein zählt
 *   nicht (dieselbe Regel wie scripts/fetch-results.mjs, verhindert
 *   Leer-Commits und damit unnötige Vercel-Deploys).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { EventRow, PredictionRow, FailureRow } from './db.mts';

/**
 * Zeitstempel in die kanonische Z-Schreibweise bringen.
 *
 * Postgres liefert timestamptz als "2026-07-29T20:00:00+00:00", der bestehende
 * Datenbestand nutzt "2026-06-11T19:00:00Z". Beides ist gültiges ISO-8601 und
 * für `new Date()` gleichwertig – aber ein TEXTvergleich zweier Schreibweisen
 * ist es nicht ('+' < '.'), und im Export wird sortiert und verglichen. Deshalb
 * bekommt jeder exportierte Zeitstempel dieselbe Form.
 */
export function isoZ(timestamp: string): string {
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? timestamp : new Date(parsed).toISOString();
}

/** ArenaEvent in Vertragsreihenfolge der Schlüssel aufbauen. */
export function toArenaEvent(row: EventRow): Record<string, unknown> {
  return {
    id: row.id,
    title: row.title,
    ...(row.titles ? { titles: row.titles } : {}),
    utcDate: isoZ(row.utc_date),
    status: row.status,
    predictionType: row.prediction_type,
    resolution: row.status === 'RESOLVED' ? (row.resolution ?? null) : null,
    metadata: row.metadata ?? {},
  };
}

export interface CategoryExport {
  category: string;
  updatedAt: string;
  events: EventRow[];
  predictions: PredictionRow[];
  /** Alle Failure-Zeilen der Kategorie (append-only aus prediction_failures). */
  failures: FailureRow[];
}

function sortEvents(events: EventRow[]): EventRow[] {
  return [...events].sort(
    (a, b) => Date.parse(a.utc_date) - Date.parse(b.utc_date) || a.id.localeCompare(b.id),
  );
}

export function buildEventsFile(data: CategoryExport): Record<string, unknown> {
  return {
    category: data.category,
    updatedAt: data.updatedAt,
    events: sortEvents(data.events).map(toArenaEvent),
  };
}

export function buildPredictionsFile(data: CategoryExport): Record<string, unknown> {
  const order = sortEvents(data.events).map((e) => e.id);
  const byEvent = new Map<string, Map<string, PredictionRow>>();
  for (const p of data.predictions) {
    if (!byEvent.has(p.event_id)) byEvent.set(p.event_id, new Map());
    byEvent.get(p.event_id)!.set(p.model_id, p);
  }

  const predictions: Record<string, Record<string, unknown>> = {};
  for (const eventId of order) {
    const models = byEvent.get(eventId);
    if (!models) continue;
    const entry: Record<string, unknown> = {};
    for (const modelId of [...models.keys()].sort()) {
      const p = models.get(modelId)!;
      entry[modelId] = { value: p.value, createdAt: isoZ(p.created_at) };
    }
    predictions[eventId] = entry;
  }

  return { category: data.category, predictions };
}

/**
 * Öffentliche Failure-Records („A refusal is a result") – bewusst als EIGENE
 * Datei neben dem Vertrag: predictions.json kennt nur {value, createdAt}, ein
 * Fremdformat dort könnte die UI brechen. failures.json ist rein additiv;
 * exportiert wird je (Event, Modell) ohne gültige Prediction der letzte Code,
 * und erst nach dem Lock (vorher kann ein Retry noch liefern).
 */
export function buildFailuresFile(data: CategoryExport): Record<string, unknown> {
  // Zeitvergleich numerisch, nicht als Text – siehe isoZ().
  const now = Date.parse(data.updatedAt);
  const lockPassed = new Set(
    data.events.filter((e) => Date.parse(e.utc_date) <= now).map((e) => e.id),
  );
  const hasPrediction = new Set(data.predictions.map((p) => `${p.event_id} ${p.model_id}`));

  const latest = new Map<string, FailureRow>();
  for (const f of data.failures) {
    if (!lockPassed.has(f.event_id)) continue;
    const key = `${f.event_id} ${f.model_id}`;
    if (hasPrediction.has(key)) continue;
    const existing = latest.get(key);
    if (!existing || existing.created_at < f.created_at) latest.set(key, f);
  }

  const failures: Record<string, Record<string, unknown>> = {};
  for (const event of sortEvents(data.events)) {
    const entry: Record<string, unknown> = {};
    const pairs = [...latest.entries()]
      .filter(([key]) => key.startsWith(`${event.id} `))
      .sort(([a], [b]) => a.localeCompare(b));
    for (const [key, row] of pairs) {
      entry[key.slice(event.id.length + 1)] = { code: row.code, createdAt: isoZ(row.created_at) };
    }
    if (Object.keys(entry).length > 0) failures[event.id] = entry;
  }

  return { category: data.category, failures };
}

/* ------------------------------------------------------------------ */
/* Schreiben nur bei inhaltlicher Änderung                             */
/* ------------------------------------------------------------------ */

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => key in bObj && deepEqual(aObj[key], bObj[key]));
}

/** Vergleich ohne updatedAt – nur echte Inhalte lösen einen Commit aus. */
function sameContent(a: unknown, b: unknown): boolean {
  const strip = (value: unknown): unknown => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
    const { updatedAt: _ignored, ...rest } = value as Record<string, unknown>;
    return rest;
  };
  return deepEqual(strip(a), strip(b));
}

/**
 * Datei schreiben, wenn sich der Inhalt (ohne updatedAt) geändert hat.
 * Rückgabe: true = geschrieben.
 */
export async function writeIfChanged(filePath: string, content: unknown): Promise<boolean> {
  let existing: unknown;
  try {
    existing = JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    existing = undefined; // fehlt oder kaputt -> schreiben
  }
  if (existing !== undefined && sameContent(existing, content)) return false;

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
  return true;
}
