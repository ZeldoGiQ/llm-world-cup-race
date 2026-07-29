/**
 * Der Prediction Score ist die Zahl, die zitiert werden soll — jede Eigenschaft,
 * die dieses Versprechen trägt, steht hier als Test. Die Echtdaten-Werte sind
 * gegen die Handrechnung aus der Pilotrunde fixiert.
 */
import { describe, expect, it } from 'vitest';
import '../plugins';
import { categories } from '../categories/index';
import { metrics } from '../metrics/index';
import { computeStandings } from './standings';
import { computeOverall, MIN_RESOLVED } from './overall';
import { scoreFromLossRatio, scoreFromLossRatios, SCORE_VERSION, TRACKS } from './score';
import type { ArenaModel, EventsFile, PredictionsFile, Sample } from '../types';
import modelsJson from '../../data/models.json';
import wcEvents from '../../../../public/arena-data/football-worldcup/events.json';
import wcPredictions from '../../../../public/arena-data/football-worldcup/predictions.json';

const models = modelsJson as ArenaModel[];

describe('Score-Formel (SCORE_V1)', () => {
  it('setzt die Referenz auf exakt 0 und Perfektion auf 100', () => {
    expect(scoreFromLossRatio(1)).toBe(0);
    expect(scoreFromLossRatio(0)).toBe(100);
  });

  it('wird negativ, wenn ein Modell schlechter ist als die Referenz', () => {
    expect(scoreFromLossRatio(1.5)).toBeLessThan(0);
  });

  it('aggregiert über das geometrische Mittel, nicht das arithmetische', () => {
    // Zwei Kategorien mit Quotienten 0,5 und 2: arithmetisch wäre der Mittelwert
    // 1,25 (Score −25), geometrisch exakt 1 (Score 0) — ein Modell, das einmal
    // doppelt so gut und einmal doppelt so schlecht ist, ist netto Referenzniveau.
    expect(scoreFromLossRatios([0.5, 2])).toBeCloseTo(0, 10);
    expect(scoreFromLossRatios([1, 1])).toBeCloseTo(0, 10);
    expect(scoreFromLossRatios([])).toBeNull();
  });

  it('trägt eine eingefrorene Versionskennung und definierte Spuren', () => {
    expect(SCORE_VERSION).toBe('SCORE_V1');
    const ids = TRACKS.map((track) => track.id);
    expect(ids).toContain('knowledge-cap');
    expect(ids).toContain('web-search');
    // Keine Harness-Version darf in zwei Spuren zählen — sonst wären Werte mischbar.
    const versions = TRACKS.flatMap((track) => track.harnessVersions);
    expect(new Set(versions).size).toBe(versions.length);
  });
});

describe('Prediction Score auf den echten WM-Daten', () => {
  const standings = computeStandings(
    models,
    wcEvents as unknown as EventsFile,
    wcPredictions as unknown as PredictionsFile,
    categories.get('football-worldcup'),
    'en',
  );
  const scoreOf = (modelId: string) =>
    standings.rows
      .find((row) => row.model.id === modelId)!
      .cells.find((cell) => cell.metricId === 'prediction-score')!.value!.value;

  it('reproduziert die Handrechnung der Pilotrunde', () => {
    // Verlust = 1 − Punkte/416; Referenz „immer 1:0" = 128 Punkte → Verlust 0,6923.
    expect(scoreOf('grok')).toBeCloseTo(21.5, 1);
    expect(scoreOf('claude')).toBeCloseTo(19.4, 1);
    // Exakt: 100 × (1 − 0,649038/0,692308) = 6,25 – nicht auf 6,3 runden,
    // die Handrechnung ist die Erwartung, nicht ihre Zusammenfassung im Chat.
    expect(scoreOf('qwen')).toBeCloseTo(6.25, 2);
  });

  it('ordnet identisch zur Punktwertung — der Score ändert nie die Reihenfolge', () => {
    const byScore = [...standings.rows]
      .filter((row) => row.rank > 0)
      .sort((a, b) => scoreOf(b.model.id) - scoreOf(a.model.id))
      .map((row) => row.model.id);
    const byRank = standings.rows.filter((row) => row.rank > 0).map((row) => row.model.id);
    expect(byScore).toEqual(byRank);
  });

  it('speist die Referenz aus der Regel, ohne dass ein Datensatz entsteht', () => {
    // Die WM hat keinen Referenz-Teilnehmer mit Tipps — der Score existiert
    // trotzdem, weil die Standings-Engine die Regel zur Laufzeit auswertet.
    expect(categories.get('football-worldcup').baselineModelId).toBeUndefined();
    expect(standings.baselineRows).toHaveLength(0);
    expect(Number.isFinite(scoreOf('grok'))).toBe(true);
  });
});

describe('Gesamtscore', () => {
  it('liefert predictionScore = 100 × overallSkill', () => {
    const three = (value: string) => ({ en: value, de: value, es: value });
    const descriptor = (id: string) => ({
      id,
      dataSource: 'live' as const,
      label: three(id),
      blurb: three(''),
      question: three(''),
      accent: '#fff',
      predictionType: 'scoreline' as const,
      metricIds: ['kicktipp-points'],
      primaryMetric: 'kicktipp-points',
      eventTitle: () => ({ primary: id }),
    });
    const events = (id: string): EventsFile => ({
      category: id,
      updatedAt: '2026-07-20T00:00:00.000Z',
      events: Array.from({ length: MIN_RESOLVED }, (_, index) => ({
        id: `e${index}`,
        title: 'x',
        utcDate: '2026-07-10T12:00:00.000Z',
        status: 'RESOLVED' as const,
        predictionType: 'scoreline' as const,
        resolution: { kind: 'scoreline' as const, home: 1, away: 0 },
        metadata: {},
      })),
    });
    const predictions = (id: string): PredictionsFile => ({
      category: id,
      predictions: Object.fromEntries(
        Array.from({ length: MIN_RESOLVED }, (_, index) => [
          `e${index}`,
          {
            a: { value: { kind: 'scoreline', home: 1, away: 0 }, createdAt: '2026-07-01T00:00:00.000Z' },
            b: { value: { kind: 'scoreline', home: 2, away: 1 }, createdAt: '2026-07-01T00:00:00.000Z' },
            c: { value: { kind: 'scoreline', home: 0, away: 3 }, createdAt: '2026-07-01T00:00:00.000Z' },
          },
        ]),
      ),
    });
    const rule = {
      id: 'test-ref',
      label: three('ref'),
      note: three('test'),
      appliesTo: ['scoreline' as const],
      predict: () => ({ kind: 'scoreline' as const, home: 0, away: 0 }),
    };
    const testModels: ArenaModel[] = [
      { id: 'a', name: 'A', provider: 'P', color: '#111' },
      { id: 'b', name: 'B', provider: 'P', color: '#222' },
      { id: 'c', name: 'C', provider: 'P', color: '#333' },
    ];
    const input = (id: string) => ({
      descriptor: descriptor(id),
      events: events(id),
      predictions: predictions(id),
      dataSource: 'live' as const,
      integrityErrors: 0,
      reference: rule,
    });
    const overall = computeOverall(testModels, [input('x'), input('y')]);
    expect(overall.status).toBe('ready');
    for (const row of overall.rows) {
      expect(row.predictionScore).toBeCloseTo((row.overallSkill ?? 0) * 100, 10);
    }
  });
});

describe('Score-Metrik in der Registry', () => {
  it('ist als Plugin registriert und verlangt eine Referenz', () => {
    const metric = metrics.get('prediction-score');
    expect(metric.requiresBaseline).toBe(true);
    expect(metric.betterDirection).toBe('higher');
    // Ohne Referenz keine Zahl — lieber leer als eine Zahl ohne Bezugslinie.
    const samples: Sample[] = [
      {
        prediction: { kind: 'scoreline', home: 1, away: 0 },
        resolution: { kind: 'scoreline', home: 1, away: 0 },
      },
    ];
    expect(metric.compute(samples, {})).toBeNull();
  });
});
