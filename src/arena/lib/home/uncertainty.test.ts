/**
 * Wer zählt zur Vergleichsgruppe, wenn ein neues Modell dazukommt?
 *
 * Diese Frage entscheidet, ob die veröffentlichten Konfidenzintervalle
 * stimmen. Der Bootstrap rechnet über die Ereignisse, die ALLE Beteiligten
 * gemeinsam getippt haben – ein Neuzugang mit einer Handvoll Tipps würde
 * diese Menge zusammenschrumpfen und damit die Intervalle des gesamten
 * Feldes verfälschen. Sie würden enger aussehen, also sicherer, obwohl
 * weniger dahintersteht.
 */
import { describe, expect, it } from 'vitest';
import '../plugins';
import type { CategoryDescriptor } from '../categories/index';
import { references, type ReferenceRule } from '../references/index';
import { computeStandings } from '../scoring/standings';
import type { ArenaEvent, ArenaModel, EventsFile, PredictionsFile } from '../types';
import { uncertaintyFor } from './home-data';

const MODELS: ArenaModel[] = [
  { id: 'alpha', name: 'Alpha', provider: 'P', color: '#111' },
  { id: 'beta', name: 'Beta', provider: 'P', color: '#222' },
  { id: 'newcomer', name: 'Newcomer', provider: 'P', color: '#333' },
];

const TOTAL = 40;
/** Der Neuzugang tippt nur die letzten vier Ereignisse – wie ein echter Späteinsteiger. */
const LATE_FROM = TOTAL - 4;

function events(): EventsFile {
  const list: ArenaEvent[] = Array.from({ length: TOTAL }, (_, index) => ({
    id: `e${index}`,
    title: `Spiel ${index}`,
    utcDate: `2026-06-${String((index % 28) + 1).padStart(2, '0')}T18:00:00.000Z`,
    status: 'RESOLVED',
    predictionType: 'scoreline',
    // Ergebnisse variieren: Eine Referenz, die immer richtig liegt, hätte
    // Verlust null – dann ist der Quotient des Prediction Score nicht
    // bildbar und die Kategorie wäre kein brauchbarer Prüfaufbau.
    resolution: { kind: 'scoreline', home: index % 3, away: index % 2 },
  })) as ArenaEvent[];
  return { category: 'football-worldcup', events: list };
}

function predictions(withNewcomer: boolean): PredictionsFile {
  const map: PredictionsFile['predictions'] = {};
  for (let index = 0; index < TOTAL; index += 1) {
    const id = `e${index}`;
    map[id] = {
      alpha: { value: { kind: 'scoreline', home: 1, away: 0 }, createdAt: '2026-05-01T00:00:00.000Z' },
      beta: { value: { kind: 'scoreline', home: 2, away: 1 }, createdAt: '2026-05-01T00:00:00.000Z' },
    };
    if (withNewcomer && index >= LATE_FROM) {
      map[id]!.newcomer = {
        value: { kind: 'scoreline', home: 0, away: 3 },
        createdAt: '2026-05-01T00:00:00.000Z',
      };
    }
  }
  return { category: 'football-worldcup', predictions: map };
}

const three = (value: string) => ({ en: value, de: value, es: value });

/** Referenz „immer 1:0" – dieselbe Bauart wie die echte WM-Referenz. */
const ALWAYS_ONE_NIL: ReferenceRule = {
  id: 'test-uncertainty-1-0',
  label: three('Always 1-0'),
  note: three('test'),
  appliesTo: ['scoreline'],
  predict: () => ({ kind: 'scoreline', home: 1, away: 0 }),
};
references.register(ALWAYS_ONE_NIL);

const DESCRIPTOR: CategoryDescriptor = {
  id: 'football-worldcup',
  dataSource: 'live',
  label: three('WM'),
  blurb: three(''),
  question: three(''),
  accent: '#fff',
  predictionType: 'scoreline',
  metricIds: ['kicktipp-points'],
  primaryMetric: 'kicktipp-points',
  referenceRuleId: ALWAYS_ONE_NIL.id,
  eventTitle: () => ({ primary: 'x' }),
};

function entryFor(withNewcomer: boolean) {
  const descriptor = DESCRIPTOR;
  const evts = events();
  const preds = predictions(withNewcomer);
  const standings = computeStandings(MODELS, evts, preds, descriptor, 'en');
  return {
    id: descriptor.id,
    descriptor,
    events: evts,
    predictions: preds,
    standings,
    primaryMetric: undefined,
    reference: {
      rule: ALWAYS_ONE_NIL,
      label: '',
      note: '',
      retroactive: false,
      formatted: '',
      value: null,
    },
  } as never;
}

describe('uncertaintyFor mit einem Späteinsteiger', () => {
  it('lässt die Intervalle des etablierten Feldes unangetastet', () => {
    const without = uncertaintyFor(entryFor(false));
    const with_ = uncertaintyFor(entryFor(true));
    expect(without).not.toBeNull();
    expect(with_).not.toBeNull();

    // Die gemeinsame Ereignismenge darf NICHT auf die vier Tipps des
    // Neuzugangs zusammenfallen.
    expect(with_!.commonEvents).toBe(without!.commonEvents);
    expect(with_!.commonEvents).toBe(TOTAL);

    for (const id of ['alpha', 'beta']) {
      expect(with_!.valueInterval[id]).toEqual(without!.valueInterval[id]);
      expect(with_!.probabilityFirst[id]).toBe(without!.probabilityFirst[id]);
    }
  });

  it('gibt dem Späteinsteiger ein eigenes Intervall, aber keine Rangaussage', () => {
    const result = uncertaintyFor(entryFor(true))!;
    const interval = result.valueInterval['newcomer'];

    expect(interval).toBeDefined();
    expect(Number.isFinite(interval![0])).toBe(true);
    expect(Number.isFinite(interval![1])).toBe(true);
    expect(interval![0]).toBeLessThanOrEqual(interval![1]);

    // Rang und P(#1) setzen eine gemeinsame Ereignismenge voraus – wer über
    // andere Ereignisse gemessen wurde, hat keinen vergleichbaren Rang.
    expect(result.probabilityFirst['newcomer']).toBeUndefined();
    expect(result.rankInterval['newcomer']).toBeUndefined();
    expect(result.pairs.some((pair) => pair.a === 'newcomer' || pair.b === 'newcomer')).toBe(false);
  });
});
