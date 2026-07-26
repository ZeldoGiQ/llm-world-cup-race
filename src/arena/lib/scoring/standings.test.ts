import { describe, expect, it } from 'vitest';
import '../metrics/accuracy';
import '../metrics/error';
import '../metrics/probabilistic';
import '../metrics/skill';
import '../prediction-types/scoreline';
import '../prediction-types/numeric';
import '../prediction-types/binary';
import type { CategoryDescriptor } from '../categories/index';
import type { ArenaEvent, ArenaModel, EventsFile, PredictionsFile } from '../types';
import { computeStandings } from './standings';

const MODELS: ArenaModel[] = [
  { id: 'a', name: 'Modell A', provider: 'X', color: '#111111' },
  { id: 'b', name: 'Modell B', provider: 'Y', color: '#222222' },
  { id: 'c', name: 'Modell C', provider: 'Z', color: '#333333' },
  { id: 'base', name: 'Baseline', provider: 'Referenz', color: '#444444', baseline: true },
];

function scorelineEvent(id: string, home: number, away: number, status = 'RESOLVED'): ArenaEvent {
  return {
    id,
    title: `Event ${id}`,
    utcDate: '2026-06-01T12:00:00Z',
    status: status as ArenaEvent['status'],
    predictionType: 'scoreline',
    resolution: status === 'RESOLVED' ? { kind: 'scoreline', home, away } : null,
    metadata: {},
  };
}

function eventsFile(events: ArenaEvent[]): EventsFile {
  return { category: 'test', updatedAt: '2026-06-01T00:00:00Z', events };
}

function predictionsFile(
  raw: Record<string, Record<string, { home: number; away: number }>>,
): PredictionsFile {
  const predictions: PredictionsFile['predictions'] = {};
  for (const [eventId, byModel] of Object.entries(raw)) {
    predictions[eventId] = {};
    for (const [modelId, value] of Object.entries(byModel)) {
      predictions[eventId]![modelId] = {
        value: { kind: 'scoreline', ...value },
        createdAt: '2026-05-01T00:00:00Z',
      };
    }
  }
  return { category: 'test', predictions };
}

const three = (value: string) => ({ en: value, de: value, es: value });

const DESCRIPTOR: CategoryDescriptor = {
  id: 'test',
  label: three('Test'),
  blurb: three(''),
  question: three(''),
  accent: '#22d3ee',
  predictionType: 'scoreline',
  metricIds: ['kicktipp-points', 'exact-acc'],
  primaryMetric: 'kicktipp-points',
  eventTitle: (event) => ({ primary: event.title }),
};

describe('computeStandings (datengetrieben)', () => {
  it('rankt nach der primären Metrik und baut Spalten aus metricIds', () => {
    const events = eventsFile([scorelineEvent('e1', 2, 1), scorelineEvent('e2', 1, 0)]);
    const predictions = predictionsFile({
      e1: { a: { home: 2, away: 1 }, b: { home: 3, away: 1 }, c: { home: 0, away: 2 } },
      e2: { a: { home: 1, away: 0 }, b: { home: 2, away: 1 }, c: { home: 1, away: 1 } },
    });

    const standings = computeStandings(MODELS, events, predictions, DESCRIPTOR, 'en');

    expect(standings.columns.map((c) => c.metricId)).toEqual(['kicktipp-points', 'exact-acc']);
    expect(standings.resolvedEvents).toBe(2);
    // a: 4+4 = 8 (zweimal exakt)
    // b: e1 3:1 auf 2:1 -> nur Tendenz (2), e2 2:1 auf 1:0 -> Tordifferenz (3) = 5
    // c: beide Male falsche Tendenz = 0
    expect(standings.rows.map((r) => [r.model.id, r.primaryValue])).toEqual([
      ['a', 8],
      ['b', 5],
      ['c', 0],
    ]);
    expect(standings.rows.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(standings.rows[0]!.cells[1]!.formatted).toBe('100.0%');
  });

  it('wertet nur aufgelöste Events, keine offenen', () => {
    const events = eventsFile([
      scorelineEvent('e1', 2, 1),
      scorelineEvent('e2', 0, 0, 'UPCOMING'),
      scorelineEvent('e3', 0, 0, 'LIVE'),
      scorelineEvent('e4', 0, 0, 'VOID'),
    ]);
    const predictions = predictionsFile({
      e1: { a: { home: 2, away: 1 } },
      e2: { a: { home: 1, away: 0 } },
      e3: { a: { home: 1, away: 0 } },
      e4: { a: { home: 1, away: 0 } },
    });

    const standings = computeStandings(MODELS, events, predictions, DESCRIPTOR, 'en');
    const a = standings.rows.find((r) => r.model.id === 'a')!;
    expect(standings.resolvedEvents).toBe(1);
    expect(standings.openEvents).toBe(2);
    expect(a.scored).toBe(1);
    expect(a.primaryValue).toBe(4);
    expect(a.openPredictions).toBe(2); // UPCOMING + LIVE, nicht VOID
  });

  it('zählt fehlende Tipps nicht als gewertetes Event', () => {
    const events = eventsFile([scorelineEvent('e1', 2, 1), scorelineEvent('e2', 1, 0)]);
    const predictions = predictionsFile({ e1: { a: { home: 2, away: 1 } } });

    const standings = computeStandings(MODELS, events, predictions, DESCRIPTOR, 'en');
    const a = standings.rows.find((r) => r.model.id === 'a')!;
    const b = standings.rows.find((r) => r.model.id === 'b')!;
    expect(a.scored).toBe(1);
    expect(b.scored).toBe(0);
    expect(b.primaryValue).toBeNull();
    expect(b.cells[0]!.formatted).toBe('—');
  });

  it('sortiert Modelle ohne Wert nach hinten und lässt sie ohne Rang', () => {
    const events = eventsFile([scorelineEvent('e1', 2, 1)]);
    const predictions = predictionsFile({ e1: { c: { home: 2, away: 1 } } });

    const standings = computeStandings(MODELS, events, predictions, DESCRIPTOR, 'en');
    expect(standings.rows[0]!.model.id).toBe('c');
    expect(standings.rows[0]!.rank).toBe(1);
    expect(standings.rows.slice(1).every((r) => r.rank === 0)).toBe(true);
  });

  it('ignoriert unbekannte Modell-IDs in den Daten', () => {
    const events = eventsFile([scorelineEvent('e1', 2, 1)]);
    const predictions = predictionsFile({ e1: { unbekannt: { home: 2, away: 1 } } });

    const standings = computeStandings(MODELS, events, predictions, DESCRIPTOR, 'en');
    expect(standings.rows).toHaveLength(3); // a, b, c – Baseline separat
    expect(standings.rows.every((r) => r.primaryValue === null)).toBe(true);
  });

  it('teilt bei Gleichstand den Rang und überspringt danach', () => {
    const events = eventsFile([scorelineEvent('e1', 2, 1)]);
    const predictions = predictionsFile({
      e1: { a: { home: 1, away: 0 }, b: { home: 1, away: 0 }, c: { home: 0, away: 3 } },
    });

    const standings = computeStandings(MODELS, events, predictions, DESCRIPTOR, 'en');
    expect(standings.rows.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it('führt die eigene Baseline getrennt und ohne Rang', () => {
    const withBaseline: CategoryDescriptor = { ...DESCRIPTOR, baselineModelId: 'base' };
    const events = eventsFile([scorelineEvent('e1', 2, 1)]);
    const predictions = predictionsFile({
      e1: { a: { home: 2, away: 1 }, base: { home: 1, away: 0 } },
    });

    const standings = computeStandings(MODELS, events, predictions, withBaseline, 'en');
    expect(standings.rows.map((r) => r.model.id)).not.toContain('base');
    expect(standings.baselineRows).toHaveLength(1);
    expect(standings.baselineRows[0]!.model.id).toBe('base');
    expect(standings.baselineRows[0]!.rank).toBe(0);
  });

  it('blendet Baselines fremder Kategorien komplett aus', () => {
    // DESCRIPTOR hat keine baselineModelId -> die globale Baseline "base"
    // gehört zu einer anderen Kategorie und darf hier nicht auftauchen.
    const events = eventsFile([scorelineEvent('e1', 2, 1)]);
    const predictions = predictionsFile({
      e1: { a: { home: 2, away: 1 }, base: { home: 1, away: 0 } },
    });

    const standings = computeStandings(MODELS, events, predictions, DESCRIPTOR, 'en');
    expect(standings.baselineRows).toHaveLength(0);
    expect(standings.rows.map((r) => r.model.id)).toEqual(
      expect.not.arrayContaining(['base']),
    );
  });

  it('rankt bei "kleiner ist besser" in umgekehrter Richtung', () => {
    const numericDescriptor: CategoryDescriptor = {
      ...DESCRIPTOR,
      predictionType: 'numeric',
      metricIds: ['mae'],
      primaryMetric: 'mae',
    };
    const events: EventsFile = {
      category: 'test',
      updatedAt: '',
      events: [
        {
          id: 'e1',
          title: '',
          utcDate: '2026-06-01T12:00:00Z',
          status: 'RESOLVED',
          predictionType: 'numeric',
          resolution: { kind: 'numeric', value: 100 },
          metadata: {},
        },
      ],
    };
    const predictions: PredictionsFile = {
      category: 'test',
      predictions: {
        e1: {
          a: { value: { kind: 'numeric', value: 110 }, createdAt: '' }, // Fehler 10
          b: { value: { kind: 'numeric', value: 102 }, createdAt: '' }, // Fehler 2
        },
      },
    };

    const standings = computeStandings(MODELS, events, predictions, numericDescriptor, 'en');
    expect(standings.rows[0]!.model.id).toBe('b'); // kleinerer Fehler zuerst
    expect(standings.rows[0]!.primaryValue).toBe(2);
  });

  it('berechnet den Skill-Score gegen die Baseline über dieselben Events', () => {
    const skillDescriptor: CategoryDescriptor = {
      ...DESCRIPTOR,
      metricIds: ['kicktipp-points', 'skill-score'],
      primaryMetric: 'kicktipp-points',
      baselineModelId: 'base',
    };
    const events = eventsFile([scorelineEvent('e1', 2, 1), scorelineEvent('e2', 1, 0)]);
    const predictions = predictionsFile({
      // a trifft beides exakt (Verlust 0), Baseline liegt beide Male daneben
      e1: { a: { home: 2, away: 1 }, base: { home: 0, away: 2 } },
      e2: { a: { home: 1, away: 0 }, base: { home: 0, away: 3 } },
    });

    const standings = computeStandings(MODELS, events, predictions, skillDescriptor, 'en');
    const a = standings.rows.find((r) => r.model.id === 'a')!;
    const skill = a.cells.find((c) => c.metricId === 'skill-score')!;
    expect(skill.value?.value).toBe(1); // perfekt gegenüber komplett falscher Baseline
    expect(skill.formatted.startsWith('+')).toBe(true);
  });

  it('liefert für den Skill-Score "—" wenn keine Baseline konfiguriert ist', () => {
    const noBaseline: CategoryDescriptor = {
      ...DESCRIPTOR,
      metricIds: ['kicktipp-points', 'skill-score'],
    };
    const events = eventsFile([scorelineEvent('e1', 2, 1)]);
    const predictions = predictionsFile({ e1: { a: { home: 2, away: 1 } } });

    const standings = computeStandings(MODELS, events, predictions, noBaseline, 'en');
    const a = standings.rows.find((r) => r.model.id === 'a')!;
    expect(a.cells.find((c) => c.metricId === 'skill-score')!.formatted).toBe('—');
  });

  it('ignoriert unbekannte metricIds statt zu brechen', () => {
    const withGhost: CategoryDescriptor = {
      ...DESCRIPTOR,
      metricIds: ['kicktipp-points', 'gibt-es-nicht'],
    };
    const events = eventsFile([scorelineEvent('e1', 2, 1)]);
    const predictions = predictionsFile({ e1: { a: { home: 2, away: 1 } } });

    const standings = computeStandings(MODELS, events, predictions, withGhost, 'en');
    expect(standings.columns.map((c) => c.metricId)).toEqual(['kicktipp-points']);
  });

  it('entzieht Modellen mit zu geringer Abdeckung den Rang und markiert sie vorläufig', () => {
    // 4 aufgelöste Events -> mindestens 2 Tipps für einen Rang nötig.
    const events = eventsFile([
      scorelineEvent('e1', 2, 1),
      scorelineEvent('e2', 1, 0),
      scorelineEvent('e3', 0, 0),
      scorelineEvent('e4', 3, 1),
    ]);
    const predictions = predictionsFile({
      // a tippt alles mittelmässig, c nur ein einziges Event – dafür exakt.
      e1: { a: { home: 1, away: 0 }, c: { home: 2, away: 1 } },
      e2: { a: { home: 1, away: 0 } },
      e3: { a: { home: 0, away: 0 } },
      e4: { a: { home: 2, away: 0 } },
    });

    const standings = computeStandings(MODELS, events, predictions, DESCRIPTOR, 'en');
    const a = standings.rows.find((r) => r.model.id === 'a')!;
    const c = standings.rows.find((r) => r.model.id === 'c')!;

    // c hätte mit 4 Punkten aus einem Event den besseren Schnitt, darf aber
    // nicht vor a stehen – sonst würde ein Glückstreffer die Tabelle anführen.
    expect(c.scored).toBe(1);
    expect(c.provisional).toBe(true);
    expect(c.rank).toBe(0);
    expect(a.provisional).toBe(false);
    expect(a.rank).toBe(1);
    expect(standings.rows.indexOf(a)).toBeLessThan(standings.rows.indexOf(c));
  });

  it('vergibt lückenlose Ränge und überspringt vorläufige Modelle', () => {
    // 4 aufgelöste Events -> Schwelle 2 Tipps. c tippt nur eines und bleibt aussen vor.
    const events = eventsFile([
      scorelineEvent('e1', 2, 1),
      scorelineEvent('e2', 1, 0),
      scorelineEvent('e3', 0, 0),
      scorelineEvent('e4', 3, 1),
    ]);
    const predictions = predictionsFile({
      e1: { a: { home: 2, away: 1 }, b: { home: 1, away: 0 }, c: { home: 2, away: 1 } },
      e2: { a: { home: 1, away: 0 }, b: { home: 2, away: 1 } },
      e3: { a: { home: 0, away: 0 }, b: { home: 1, away: 1 } },
      e4: { a: { home: 3, away: 1 }, b: { home: 2, away: 0 } },
    });

    const standings = computeStandings(MODELS, events, predictions, DESCRIPTOR, 'en');
    const ranked = standings.rows.filter((row) => row.rank > 0);
    expect(ranked.map((row) => row.model.id)).toEqual(['a', 'b']);
    expect(ranked.map((row) => row.rank)).toEqual([1, 2]);
    expect(standings.rows.find((row) => row.model.id === 'c')!.provisional).toBe(true);
  });

  it('lässt bei ausreichender Abdeckung alle Modelle ranken', () => {
    // 2 aufgelöste Events -> Schwelle 1 Tipp, also ist ein einzelner Tipp genug.
    const events = eventsFile([scorelineEvent('e1', 2, 1), scorelineEvent('e2', 1, 0)]);
    const predictions = predictionsFile({
      e1: { a: { home: 2, away: 1 }, b: { home: 1, away: 0 }, c: { home: 3, away: 0 } },
      e2: { a: { home: 1, away: 0 }, b: { home: 2, away: 1 } },
    });

    const standings = computeStandings(MODELS, events, predictions, DESCRIPTOR, 'en');
    expect(standings.rows.filter((row) => row.rank > 0).map((row) => row.rank)).toEqual([1, 2, 3]);
  });

  it('überlebt leere Daten', () => {
    const empty = computeStandings(MODELS, eventsFile([]), { category: 't', predictions: {} }, DESCRIPTOR, 'en');
    expect(empty.rows).toHaveLength(3);
    expect(empty.resolvedEvents).toBe(0);
    expect(empty.rows.every((r) => r.primaryValue === null && r.rank === 0)).toBe(true);
  });

  it('ignoriert Tipps mit kaputtem Wert aus den JSON-Daten', () => {
    const events = eventsFile([scorelineEvent('e1', 2, 1)]);
    const predictions: PredictionsFile = {
      category: 'test',
      predictions: {
        e1: {
          a: { value: { kind: 'scoreline', home: -1, away: 0 } as never, createdAt: '' },
          b: { value: { kind: 'scoreline', home: 2, away: 1 }, createdAt: '' },
        },
      },
    };

    const standings = computeStandings(MODELS, events, predictions, DESCRIPTOR, 'en');
    expect(standings.rows.find((r) => r.model.id === 'a')!.scored).toBe(0);
    expect(standings.rows.find((r) => r.model.id === 'b')!.scored).toBe(1);
  });
});
