/**
 * Der Export ist die Schnittstelle zum Frontend-Datenvertrag. Was hier
 * festgenagelt wird: deterministische Reihenfolge, Vertragstreue der Schlüssel,
 * kein Schreiben ohne inhaltliche Änderung.
 */
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { EventRow, FailureRow, PredictionRow } from './db.mts';
import {
  buildEventsFile,
  buildFailuresFile,
  buildPredictionsFile,
  toArenaEvent,
  writeIfChanged,
  type CategoryExport,
} from './export-json.mts';

function event(overrides: Partial<EventRow> = {}): EventRow {
  return {
    category: 'demo',
    id: 'e1',
    title: 'A – B',
    titles: null,
    utc_date: '2026-08-01T18:00:00.000Z',
    status: 'UPCOMING',
    prediction_type: 'scoreline',
    resolution: null,
    metadata: { competition: 'Demo League' },
    source: 'test',
    open_at: null,
    expected_resolution_at: null,
    resolved_at: null,
    void_reason: null,
    ...overrides,
  };
}

function prediction(overrides: Partial<PredictionRow> = {}): PredictionRow {
  return {
    category: 'demo',
    event_id: 'e1',
    model_id: 'gpt',
    value: { kind: 'scoreline', home: 2, away: 1 },
    raw: {},
    provenance: {},
    run_id: null,
    created_at: '2026-07-31T10:00:00.000Z',
    ...overrides,
  };
}

function failure(overrides: Partial<FailureRow> = {}): FailureRow {
  return {
    category: 'demo',
    event_id: 'e1',
    model_id: 'grok',
    code: 'timeout',
    detail: null,
    created_at: '2026-07-31T11:00:00.000Z',
    ...overrides,
  };
}

function exportData(overrides: Partial<CategoryExport> = {}): CategoryExport {
  return {
    category: 'demo',
    updatedAt: '2026-08-02T00:00:00.000Z',
    events: [event()],
    predictions: [prediction()],
    failures: [],
    ...overrides,
  };
}

describe('toArenaEvent', () => {
  it('erzeugt die Vertragsschlüssel in fester Reihenfolge', () => {
    expect(Object.keys(toArenaEvent(event()))).toEqual([
      'id',
      'title',
      'utcDate',
      'status',
      'predictionType',
      'resolution',
      'metadata',
    ]);
  });

  it('nimmt titles nur auf, wenn sie existieren', () => {
    const withTitles = toArenaEvent(event({ titles: { en: 'A vs B', de: 'A gegen B', es: 'A contra B' } }));
    expect(withTitles.titles).toEqual({ en: 'A vs B', de: 'A gegen B', es: 'A contra B' });
    expect('titles' in toArenaEvent(event())).toBe(false);
  });

  it('exportiert eine resolution nur bei Status RESOLVED', () => {
    const resolution = { kind: 'scoreline', home: 1, away: 1 };
    expect(toArenaEvent(event({ status: 'RESOLVED', resolution })).resolution).toEqual(resolution);
    // Eine VOID- oder LIVE-Zeile darf niemals ein Ergebnis behaupten.
    expect(toArenaEvent(event({ status: 'VOID', resolution })).resolution).toBeNull();
    expect(toArenaEvent(event({ status: 'LIVE', resolution })).resolution).toBeNull();
  });
});

describe('buildEventsFile', () => {
  it('sortiert nach utcDate, dann nach id', () => {
    const data = exportData({
      events: [
        event({ id: 'c', utc_date: '2026-08-02T12:00:00.000Z' }),
        event({ id: 'b', utc_date: '2026-08-01T12:00:00.000Z' }),
        event({ id: 'a', utc_date: '2026-08-01T12:00:00.000Z' }),
      ],
      predictions: [],
    });
    const file = buildEventsFile(data) as { events: { id: string }[] };
    expect(file.events.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('buildPredictionsFile', () => {
  it('schreibt Modelle alphabetisch und nur value + createdAt', () => {
    const data = exportData({
      predictions: [
        prediction({ model_id: 'kimi' }),
        prediction({ model_id: 'claude' }),
        prediction({ model_id: 'gpt' }),
      ],
    });
    const file = buildPredictionsFile(data) as {
      predictions: Record<string, Record<string, unknown>>;
    };
    expect(Object.keys(file.predictions.e1)).toEqual(['claude', 'gpt', 'kimi']);
    expect(Object.keys(file.predictions.e1.claude as object)).toEqual(['value', 'createdAt']);
  });

  it('lässt Events ohne Tipps ganz aus', () => {
    const data = exportData({
      events: [event({ id: 'e1' }), event({ id: 'e2' })],
      predictions: [prediction({ event_id: 'e1' })],
    });
    const file = buildPredictionsFile(data) as { predictions: Record<string, unknown> };
    expect(Object.keys(file.predictions)).toEqual(['e1']);
  });
});

describe('buildFailuresFile', () => {
  it('exportiert Failures erst nach dem Lock', () => {
    const beforeLock = exportData({
      events: [event({ utc_date: '2099-01-01T00:00:00.000Z' })],
      predictions: [],
      failures: [failure()],
    });
    expect(buildFailuresFile(beforeLock)).toEqual({ category: 'demo', failures: {} });

    const afterLock = exportData({
      events: [event({ utc_date: '2026-08-01T18:00:00.000Z' })],
      predictions: [],
      failures: [failure()],
    });
    const file = buildFailuresFile(afterLock) as {
      failures: Record<string, Record<string, { code: string }>>;
    };
    expect(file.failures.e1.grok.code).toBe('timeout');
  });

  it('verschweigt Failures, wenn am Ende doch ein Tipp kam', () => {
    const data = exportData({
      predictions: [prediction({ model_id: 'grok' })],
      failures: [failure({ model_id: 'grok' })],
    });
    expect(buildFailuresFile(data)).toEqual({ category: 'demo', failures: {} });
  });

  it('nimmt bei mehreren Fehlversuchen den letzten Code', () => {
    const data = exportData({
      predictions: [],
      failures: [
        failure({ code: 'timeout', created_at: '2026-07-31T10:00:00.000Z' }),
        failure({ code: 'invalid-output', created_at: '2026-07-31T12:00:00.000Z' }),
      ],
    });
    const file = buildFailuresFile(data) as {
      failures: Record<string, Record<string, { code: string }>>;
    };
    expect(file.failures.e1.grok.code).toBe('invalid-output');
  });
});

describe('writeIfChanged', () => {
  it('schreibt neu, überspringt gleichen Inhalt, schreibt bei echter Änderung', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'arena-export-'));
    const file = path.join(dir, 'events.json');

    expect(await writeIfChanged(file, { category: 'demo', updatedAt: 'A', events: [] })).toBe(true);
    // Nur updatedAt anders -> kein Schreiben, kein Leer-Commit, kein Deploy.
    expect(await writeIfChanged(file, { category: 'demo', updatedAt: 'B', events: [] })).toBe(false);
    expect(await writeIfChanged(file, { category: 'demo', updatedAt: 'B', events: [1] })).toBe(true);

    const written = JSON.parse(await readFile(file, 'utf8'));
    expect(written.updatedAt).toBe('B');
    expect(written.events).toEqual([1]);
  });

  it('schreibt über eine kaputte Datei, statt zu werfen', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'arena-export-'));
    const file = path.join(dir, 'events.json');
    await writeFile(file, '{ das ist kein json', 'utf8');
    expect(await writeIfChanged(file, { ok: true })).toBe(true);
  });

  it('endet mit genau einem Zeilenumbruch und 2-Space-Einrückung', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'arena-export-'));
    const file = path.join(dir, 'x.json');
    await writeIfChanged(file, { a: { b: 1 } });
    const raw = await readFile(file, 'utf8');
    expect(raw.endsWith('}\n')).toBe(true);
    expect(raw).toContain('\n  "a": {\n    "b": 1\n  }');
  });
});
