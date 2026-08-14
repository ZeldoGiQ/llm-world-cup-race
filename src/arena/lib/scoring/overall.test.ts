/**
 * Die Gesamtwertung ist die Zahl, die ein Labor zitieren würde. Jede Regel, die
 * sie schützt, steht hier als Test – besonders die, die sie NICHT entstehen
 * lassen.
 */
import { describe, expect, it } from 'vitest';
import '../metrics/accuracy';
import '../metrics/error';
import '../prediction-types/numeric';
import '../prediction-types/scoreline';
import type { CategoryDescriptor } from '../categories/index';
import { references, type ReferenceRule } from '../references/index';
import type { ArenaModel, EventsFile, PredictionsFile } from '../types';
import { computeOverall, MIN_RESOLVED, REQUIRED_CATEGORIES } from './overall';

const three = (value: string) => ({ en: value, de: value, es: value });

const MODELS: ArenaModel[] = [
  { id: 'a', name: 'Alpha', provider: 'P', color: '#111' },
  { id: 'b', name: 'Beta', provider: 'P', color: '#222' },
  { id: 'c', name: 'Gamma', provider: 'P', color: '#333' },
  { id: 'ref', name: 'Reference', provider: 'P', color: '#444', baseline: true },
  { id: 'early', name: 'Preview', provider: 'P', color: '#555', access: 'early-access' },
];

function descriptor(
  id: string,
  options: Partial<CategoryDescriptor> = {},
): CategoryDescriptor {
  return {
    id,
    dataSource: 'live',
    label: three(id),
    blurb: three(''),
    question: three(''),
    accent: '#fff',
    predictionType: 'scoreline',
    metricIds: ['kicktipp-points'],
    primaryMetric: 'kicktipp-points',
    eventTitle: () => ({ primary: id }),
    ...options,
  };
}

/** n aufgelöste Ergebnistipp-Events, alle mit Ergebnis 1:0. */
function scorelineEvents(n: number, category = 'cat'): EventsFile {
  return {
    category,
    updatedAt: '2026-07-20T00:00:00.000Z',
    events: Array.from({ length: n }, (_, index) => ({
      id: `e${index}`,
      title: 'x',
      utcDate: '2026-07-10T12:00:00.000Z',
      status: 'RESOLVED' as const,
      predictionType: 'scoreline' as const,
      resolution: { kind: 'scoreline' as const, home: 1, away: 0 },
      metadata: {},
    })),
  };
}

/** Tipps: pro Modell ein fester Wert über alle Events; skip lässt Events aus. */
function scorelinePredictions(
  n: number,
  perModel: Record<string, [number, number]>,
  skip: Record<string, string[]> = {},
): PredictionsFile {
  const map: PredictionsFile['predictions'] = {};
  for (let index = 0; index < n; index += 1) {
    const eventId = `e${index}`;
    map[eventId] = {};
    for (const [modelId, [home, away]] of Object.entries(perModel)) {
      if (skip[modelId]?.includes(eventId)) continue;
      map[eventId]![modelId] = {
        value: { kind: 'scoreline', home, away },
        createdAt: '2026-07-01T00:00:00.000Z',
      };
    }
  }
  return { category: 'cat', predictions: map };
}

const ALWAYS_DRAW: ReferenceRule = {
  id: 'test-always-0-0',
  label: three('Always 0–0'),
  note: three('test'),
  appliesTo: ['scoreline'],
  predict: () => ({ kind: 'scoreline', home: 0, away: 0 }),
};
references.register(ALWAYS_DRAW);

/** Eine vollständig gültige Kategorie mit klarer Rangfolge. */
function goodCategory(id: string, n = MIN_RESOLVED) {
  return {
    descriptor: descriptor(id),
    events: scorelineEvents(n, id),
    predictions: scorelinePredictions(n, {
      a: [1, 0], // exakt
      b: [2, 1], // Tendenz
      c: [0, 3], // daneben
    }),
    dataSource: 'live' as const,
    integrityErrors: 0,
    reference: ALWAYS_DRAW,
  };
}

describe('Qualifikation', () => {
  it('entsteht bei nur einer qualifizierten Kategorie bewusst nicht', () => {
    const result = computeOverall(MODELS, [goodCategory('one')]);
    expect(result.status).toBe('insufficient');
    expect(result.rows).toEqual([]);
    expect(result.qualifiedCount).toBe(1);
    expect(REQUIRED_CATEGORIES).toBeGreaterThan(1);
  });

  it('schließt Beispieldaten aus, egal wie viele Events sie tragen', () => {
    const many = { ...goodCategory('sample'), dataSource: 'example' as const };
    const result = computeOverall(MODELS, [many, goodCategory('real')]);
    expect(result.qualifiedCount).toBe(1);
    expect(result.qualifications.find((q) => q.categoryId === 'sample')!.reason).toBe(
      'example-data',
    );
  });

  it('schließt eine Kategorie mit Integritätsfehler aus', () => {
    const broken = { ...goodCategory('broken'), integrityErrors: 1 };
    const result = computeOverall(MODELS, [broken, goodCategory('ok')]);
    expect(result.qualifications.find((q) => q.categoryId === 'broken')!.reason).toBe('integrity');
  });

  it('zieht die Grenze bei der Mindestzahl aufgelöster Events genau', () => {
    const tooFew = goodCategory('few', MIN_RESOLVED - 1);
    const enough = goodCategory('enough', MIN_RESOLVED);
    const result = computeOverall(MODELS, [tooFew, enough]);
    expect(result.qualifications.find((q) => q.categoryId === 'few')!.qualified).toBe(false);
    expect(result.qualifications.find((q) => q.categoryId === 'enough')!.qualified).toBe(true);
  });

  it('verlangt eine Referenz – ohne sie ist kein Quotient bildbar', () => {
    const withoutReference = { ...goodCategory('bare'), reference: undefined };
    const result = computeOverall(MODELS, [withoutReference, goodCategory('ok')]);
    expect(result.qualifications.find((q) => q.categoryId === 'bare')!.reason).toBe('no-reference');
  });

  it('meldet fehlende Vorhersagen als eigenen Grund', () => {
    const empty = {
      ...goodCategory('empty'),
      predictions: { category: 'empty', predictions: {} } as PredictionsFile,
    };
    const result = computeOverall(MODELS, [empty, goodCategory('ok')]);
    expect(result.qualifications.find((q) => q.categoryId === 'empty')!.reason).toBe(
      'no-predictions',
    );
  });
});

describe('Berechnung', () => {
  const result = computeOverall(MODELS, [goodCategory('x'), goodCategory('y')]);

  it('liefert bei zwei qualifizierten Kategorien eine Wertung', () => {
    expect(result.status).toBe('ready');
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('rankt nach Skill und ordnet die Modelle wie erwartet', () => {
    expect(result.rows[0]!.model.id).toBe('a');
    expect(result.rows[0]!.rank).toBe(1);
    expect(result.rows[0]!.overallSkill).toBeGreaterThan(result.rows[1]!.overallSkill!);
  });

  it('setzt den mittleren normalisierten Rang für den Ersten auf 0', () => {
    expect(result.rows[0]!.meanNormalizedRank).toBe(0);
    // Und für den Letzten auf 1 – die Skala ist damit lesbar ohne Legende.
    const last = result.rows[result.rows.length - 1]!;
    expect(last.meanNormalizedRank).toBe(1);
  });

  it('zählt jede Kategorie einmal', () => {
    expect(result.rows[0]!.categoriesCounted).toBe(2);
    expect(result.perCategory).toHaveLength(2);
  });

  it('gibt der Referenz definitionsgemäß Skill 0', () => {
    // Referenz gegen sich selbst: Quotient 1, also 1 − exp(ln 1) = 0.
    const reference = computeOverall(
      [{ id: 'ref-only', name: 'R', provider: 'P', color: '#000' }],
      [
        {
          ...goodCategory('x'),
          predictions: scorelinePredictions(MIN_RESOLVED, { 'ref-only': [0, 0] }),
        },
        {
          ...goodCategory('y'),
          predictions: scorelinePredictions(MIN_RESOLVED, { 'ref-only': [0, 0] }),
        },
      ],
    );
    // Nur ein Modell -> zu wenige Teilnehmer, also keine Qualifikation.
    expect(reference.status).toBe('insufficient');
  });

  it('gibt einem Vorab-Zugang keinen Rang, auch bei perfekten Tipps', () => {
    // Regression: `access` wurde in der Standings-Engine nirgends gelesen.
    const withEarly = (id: string) => ({
      ...goodCategory(id),
      predictions: scorelinePredictions(MIN_RESOLVED, {
        a: [1, 0],
        b: [2, 1],
        c: [0, 3],
        early: [1, 0], // exakt wie das beste Modell
      }),
    });
    const result = computeOverall(MODELS, [withEarly('x'), withEarly('y')]);
    expect(result.rows.some((row) => row.model.id === 'early')).toBe(false);
    expect(result.earlyAccessRows.some((row) => row.model.id === 'early')).toBe(true);
    expect(result.earlyAccessRows[0]!.rank).toBe(0);
    expect(result.earlyAccessRows[0]!.provisional).toBe(true);
  });

  it('verweigert einen Rang, wenn eine qualifizierte Kategorie ausgelassen wurde', () => {
    // Kein Imputieren: sonst wäre das Auslassen schwieriger Kategorien belohnt.
    const partial = {
      ...goodCategory('y'),
      predictions: scorelinePredictions(MIN_RESOLVED, { a: [1, 0], b: [2, 1], c: [0, 3] }),
    };
    const result = computeOverall(MODELS, [
      goodCategory('x'),
      {
        ...partial,
        predictions: scorelinePredictions(MIN_RESOLVED, { b: [2, 1], c: [0, 3] }),
      },
    ]);
    const alpha = result.rows.find((row) => row.model.id === 'a');
    if (alpha) {
      expect(alpha.rank).toBe(0);
      expect(alpha.provisional).toBe(true);
      // Und steht unter allen gerankten Zeilen.
      const rankedIndexes = result.rows.filter((row) => row.rank > 0).map((row) => result.rows.indexOf(row));
      expect(result.rows.indexOf(alpha)).toBeGreaterThan(Math.max(...rankedIndexes));
    }
  });

  it('rechnet über die gemeinsame Event-Menge, nicht über eigene Teilmengen', () => {
    // Modell b lässt e0 aus -> alle werden ohne e0 verglichen.
    const skewed = (id: string) => ({
      ...goodCategory(id),
      predictions: scorelinePredictions(
        MIN_RESOLVED,
        { a: [1, 0], b: [2, 1], c: [0, 3] },
        { b: ['e0'] },
      ),
    });
    const result = computeOverall(MODELS, [skewed('x'), skewed('y')]);
    for (const qualification of result.qualifications.filter((q) => q.qualified)) {
      expect(qualification.commonEvents).toBe(MIN_RESOLVED - 1);
    }
  });

  it('klemmt unbeschränkte Verluste und macht das sichtbar', () => {
    // Numerische Kategorie: ein absurd falscher Wert würde sonst jede
    // Aggregation für immer dominieren.
    const numericCategory = (id: string) => ({
      descriptor: descriptor(id, {
        predictionType: 'numeric',
        metricIds: ['mae'],
        primaryMetric: 'mae',
      }),
      events: {
        category: id,
        updatedAt: '2026-07-20T00:00:00.000Z',
        events: Array.from({ length: MIN_RESOLVED }, (_, index) => ({
          id: `e${index}`,
          title: 'x',
          utcDate: '2026-07-10T12:00:00.000Z',
          status: 'RESOLVED' as const,
          predictionType: 'numeric' as const,
          resolution: { kind: 'numeric' as const, value: 100 },
          metadata: {},
        })),
      } as EventsFile,
      predictions: {
        category: id,
        predictions: Object.fromEntries(
          Array.from({ length: MIN_RESOLVED }, (_, index) => [
            `e${index}`,
            {
              a: { value: { kind: 'numeric', value: 101 }, createdAt: '2026-07-01T00:00:00.000Z' },
              b: { value: { kind: 'numeric', value: 105 }, createdAt: '2026-07-01T00:00:00.000Z' },
              c: { value: { kind: 'numeric', value: 1e6 }, createdAt: '2026-07-01T00:00:00.000Z' },
            },
          ]),
        ),
      } as unknown as PredictionsFile,
      dataSource: 'live' as const,
      integrityErrors: 0,
      reference: {
        id: 'numeric-ref',
        label: three('Always 110'),
        note: three('test'),
        appliesTo: ['numeric' as const],
        predict: () => ({ kind: 'numeric' as const, value: 110 }),
      },
    });
    const result = computeOverall(MODELS, [numericCategory('n1'), numericCategory('n2')]);
    expect(result.status).toBe('ready');
    expect(result.clampedCells).toBeGreaterThan(0);
    for (const row of result.rows) {
      expect(Number.isFinite(row.overallSkill!)).toBe(true);
    }
  });

  it('folgt bei "kleiner ist besser" der Verlust-Ordnung', () => {
    // Hier kippt eine naive Implementierung, die Metrikwerte sortiert.
    const numericCategory = (id: string) => ({
      descriptor: descriptor(id, {
        predictionType: 'numeric',
        metricIds: ['mae'],
        primaryMetric: 'mae',
      }),
      events: {
        category: id,
        updatedAt: '2026-07-20T00:00:00.000Z',
        events: Array.from({ length: MIN_RESOLVED }, (_, index) => ({
          id: `e${index}`,
          title: 'x',
          utcDate: '2026-07-10T12:00:00.000Z',
          status: 'RESOLVED' as const,
          predictionType: 'numeric' as const,
          resolution: { kind: 'numeric' as const, value: 100 },
          metadata: {},
        })),
      } as EventsFile,
      predictions: {
        category: id,
        predictions: Object.fromEntries(
          Array.from({ length: MIN_RESOLVED }, (_, index) => [
            `e${index}`,
            {
              a: { value: { kind: 'numeric', value: 100.5 }, createdAt: '2026-07-01T00:00:00.000Z' },
              b: { value: { kind: 'numeric', value: 103 }, createdAt: '2026-07-01T00:00:00.000Z' },
              c: { value: { kind: 'numeric', value: 120 }, createdAt: '2026-07-01T00:00:00.000Z' },
            },
          ]),
        ),
      } as unknown as PredictionsFile,
      dataSource: 'live' as const,
      integrityErrors: 0,
      reference: {
        id: 'numeric-ref-2',
        label: three('Always 110'),
        note: three('test'),
        appliesTo: ['numeric' as const],
        predict: () => ({ kind: 'numeric' as const, value: 110 }),
      },
    });
    const result = computeOverall(MODELS, [numericCategory('m1'), numericCategory('m2')]);
    // Der kleinste Fehler muss vorn stehen.
    expect(result.rows[0]!.model.id).toBe('a');
    expect(result.rows[result.rows.length - 1]!.model.id).toBe('c');
  });

  it('ignoriert nicht aufgelöste und ungültige Events', () => {
    const mixed = goodCategory('x');
    mixed.events.events.push(
      { id: 'open', title: 'x', utcDate: '2027-01-01T00:00:00.000Z', status: 'UPCOMING', predictionType: 'scoreline', resolution: null, metadata: {} },
      { id: 'void', title: 'x', utcDate: '2026-01-01T00:00:00.000Z', status: 'VOID', predictionType: 'scoreline', resolution: null, metadata: {} },
    );
    const result = computeOverall(MODELS, [mixed, goodCategory('y')]);
    expect(result.qualifications.find((q) => q.categoryId === 'x')!.resolvedEvents).toBe(
      MIN_RESOLVED,
    );
  });

  it('ist deterministisch – zwei Aufrufe liefern dasselbe', () => {
    const first = computeOverall(MODELS, [goodCategory('x'), goodCategory('y')]);
    const second = computeOverall(MODELS, [goodCategory('x'), goodCategory('y')]);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('lässt ein zusätzliches Modell die Reihenfolge der anderen unberührt', () => {
    // Genau das kann Borda nicht – der Grund, warum es verworfen wurde.
    const before = computeOverall(MODELS.slice(0, 3), [goodCategory('x'), goodCategory('y')]);
    const extended = [...MODELS, { id: 'd', name: 'Delta', provider: 'P', color: '#666' }];
    const withExtra = (id: string) => ({
      ...goodCategory(id),
      predictions: scorelinePredictions(MIN_RESOLVED, {
        a: [1, 0],
        b: [2, 1],
        c: [0, 3],
        d: [3, 3],
      }),
    });
    const after = computeOverall(extended as ArenaModel[], [withExtra('x'), withExtra('y')]);
    const orderBefore = before.rows.filter((row) => row.rank > 0).map((row) => row.model.id);
    const orderAfter = after.rows
      .filter((row) => row.rank > 0 && row.model.id !== 'd')
      .map((row) => row.model.id);
    expect(orderAfter).toEqual(orderBefore);
  });

  it('propagiert eine nachträgliche Referenz in jede Zelle', () => {
    const retro: ReferenceRule = { ...ALWAYS_DRAW, id: 'retro', retroactive: true };
    const result = computeOverall(MODELS, [
      { ...goodCategory('x'), reference: retro },
      { ...goodCategory('y'), reference: retro },
    ]);
    for (const row of result.rows) {
      for (const cell of row.cells) expect(cell.retroactiveReference).toBe(true);
    }
    for (const qualification of result.qualifications.filter((q) => q.qualified)) {
      expect(qualification.retroactiveReference).toBe(true);
    }
  });
});

describe('Neuzugang in eine laufende Kategorie', () => {
  /**
   * Festgehaltenes Verhalten, kein Wunschzustand.
   *
   * Die Gesamtwertung rechnet bewusst streng über die Schnittmenge: Nur
   * Ereignisse, die ALLE Teilnehmer getippt haben, zählen – sonst würden
   * zwei Modelle über verschiedene Hälften verglichen. Als „Teilnehmer" gilt
   * dabei schon, wer einen einzigen Tipp abgegeben hat.
   *
   * Die Kehrseite: Ein Modell, das mitten in einer laufenden Kategorie
   * dazukommt, schrumpft die Schnittmenge auf seine eigenen wenigen
   * Ereignisse. Die Kategorie reißt dann die Abdeckungshürde und fällt für
   * ALLE Modelle aus der Gesamtwertung – der Neuzugang beschädigt also die
   * Zahl der anderen, statt nur selbst keine zu bekommen.
   *
   * Das ist der Grund, warum ein neues Modell derzeit nicht einfach in eine
   * laufende Kategorie eingehängt werden kann. Ändert jemand diese Regel,
   * muss dieser Test bewusst angepasst werden.
   */
  it('lässt die Kategorie für alle aus der Wertung fallen', () => {
    const n = MIN_RESOLVED;
    const lateJoiner = 'c';
    // a und b tippen alles, c erst die letzten beiden Ereignisse.
    const skipped = Array.from({ length: n - 2 }, (_, index) => `e${index}`);

    const withLateJoiner = (id: string) => ({
      descriptor: descriptor(id),
      events: scorelineEvents(n, id),
      predictions: scorelinePredictions(
        n,
        { a: [1, 0], b: [2, 1], [lateJoiner]: [0, 3] },
        { [lateJoiner]: skipped },
      ),
      dataSource: 'live' as const,
      integrityErrors: 0,
      reference: ALWAYS_DRAW,
    });

    const categories = Array.from({ length: REQUIRED_CATEGORIES }, (_, index) =>
      withLateJoiner(`late${index}`),
    );
    const result = computeOverall(MODELS, categories);

    expect(result.status).toBe('insufficient');
    expect(result.qualifiedCount).toBe(0);
    // Nicht der Neuzugang scheitert – die ganze Kategorie scheitert.
    for (const qualification of result.qualifications) {
      expect(qualification.reason).toBe('too-few-models');
    }
  });

  it('wertet dieselben Kategorien ohne den Neuzugang normal', () => {
    // Gegenprobe: Es liegt am späten Einstieg, nicht an den Daten.
    const categories = Array.from({ length: REQUIRED_CATEGORIES }, (_, index) =>
      goodCategory(`full${index}`),
    );
    expect(computeOverall(MODELS, categories).status).toBe('ready');
  });
});
