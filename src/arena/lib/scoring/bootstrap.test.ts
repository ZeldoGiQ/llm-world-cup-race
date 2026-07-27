/**
 * Der Bootstrap trägt die wichtigste Aussage der Startseite: ob ein Vorsprung
 * echt ist oder Rauschen. Entsprechend scharf muss er abgesichert sein.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../metrics/accuracy';
import '../metrics/error';
import '../prediction-types/numeric';
import '../prediction-types/scoreline';
import { metrics } from '../metrics/index';
import type { Sample } from '../types';
import { bootstrapCategory, quantile, xorshift32 } from './bootstrap';

const kicktipp = metrics.get('kicktipp-points');

function scorelineSamples(pairs: Array<[number, number, number, number]>): Sample[] {
  return pairs.map(([ph, pa, rh, ra]) => ({
    prediction: { kind: 'scoreline', home: ph, away: pa },
    resolution: { kind: 'scoreline', home: rh, away: ra },
  }));
}

describe('xorshift32', () => {
  it('liefert bei gleichem Seed dieselbe Folge', () => {
    const a = xorshift32(42);
    const b = xorshift32(42);
    const first = Array.from({ length: 10 }, () => a());
    const second = Array.from({ length: 10 }, () => b());
    expect(first).toEqual(second);
  });

  it('bleibt im Bereich [0,1)', () => {
    const rng = xorshift32(7);
    for (let i = 0; i < 1000; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('fängt Seed 0 ab – xorshift bliebe dort für immer bei null', () => {
    const rng = xorshift32(0);
    expect(rng()).toBeGreaterThan(0);
  });
});

describe('quantile', () => {
  it('bleibt bei Länge 1 und 2 endlich', () => {
    expect(quantile([5], 0.5)).toBe(5);
    expect(quantile([1, 3], 0.5)).toBe(2);
    expect(Number.isFinite(quantile([1, 3], 0.05))).toBe(true);
  });

  it('klemmt Wahrscheinlichkeiten außerhalb [0,1]', () => {
    expect(quantile([1, 2, 3], -1)).toBe(1);
    expect(quantile([1, 2, 3], 2)).toBe(3);
  });
});

describe('bootstrapCategory', () => {
  it('ist bei gleichem Seed reproduzierbar – Voraussetzung für einen stabilen Build', () => {
    const samplesByModel = new Map<string, Sample[]>([
      ['a', scorelineSamples([[2, 1, 2, 1], [1, 0, 0, 0], [3, 1, 2, 0]])],
      ['b', scorelineSamples([[0, 0, 2, 1], [1, 0, 1, 0], [0, 2, 2, 0]])],
    ]);
    const first = bootstrapCategory({ samplesByModel, metric: kicktipp, draws: 200 });
    const second = bootstrapCategory({ samplesByModel, metric: kicktipp, draws: 200 });
    expect(first).toEqual(second);
  });

  it('nutzt den injizierten Generator', () => {
    // rng = 0 zieht immer Index 0 – damit ist jede Ziehung das erste Event.
    const samplesByModel = new Map<string, Sample[]>([
      ['exact', scorelineSamples([[2, 1, 2, 1], [0, 0, 5, 5]])],
      ['miss', scorelineSamples([[0, 3, 2, 1], [5, 5, 5, 5]])],
    ]);
    const result = bootstrapCategory({
      samplesByModel,
      metric: kicktipp,
      draws: 50,
      rng: () => 0,
    });
    expect(result.probabilityFirst.exact).toBe(1);
    expect(result.probabilityFirst.miss).toBe(0);
    expect(result.rankInterval.exact).toEqual([1, 1]);
  });

  it('folgt bei "kleiner ist besser" der Verlust-Ordnung, nicht der Zahlengröße', () => {
    const mae = metrics.get('mae');
    const samplesByModel = new Map<string, Sample[]>([
      [
        'close',
        [
          { prediction: { kind: 'numeric', value: 101 }, resolution: { kind: 'numeric', value: 100 } },
          { prediction: { kind: 'numeric', value: 99 }, resolution: { kind: 'numeric', value: 100 } },
        ],
      ],
      [
        'far',
        [
          { prediction: { kind: 'numeric', value: 150 }, resolution: { kind: 'numeric', value: 100 } },
          { prediction: { kind: 'numeric', value: 50 }, resolution: { kind: 'numeric', value: 100 } },
        ],
      ],
    ]);
    const result = bootstrapCategory({ samplesByModel, metric: mae, draws: 200 });
    // Der kleinere MAE muss Rang 1 halten, obwohl seine Zahl kleiner ist.
    expect(result.probabilityFirst.close).toBe(1);
    expect(result.probabilityFirst.far).toBe(0);
  });

  it('bleibt bei einem Modell und einem Event ohne NaN', () => {
    const samplesByModel = new Map<string, Sample[]>([
      ['solo', scorelineSamples([[1, 0, 1, 0]])],
    ]);
    const result = bootstrapCategory({ samplesByModel, metric: kicktipp, draws: 20 });
    expect(result.probabilityFirst.solo).toBe(1);
    expect(result.rankInterval.solo).toEqual([1, 1]);
    expect(Number.isFinite(result.valueInterval.solo![0])).toBe(true);
    expect(result.pairs).toEqual([]);
  });

  it('gibt bei leerer Eingabe leere Ergebnisse statt zu werfen', () => {
    const result = bootstrapCategory({ samplesByModel: new Map(), metric: kicktipp, draws: 10 });
    expect(result.probabilityFirst).toEqual({});
    expect(result.commonEvents).toBe(0);
  });

  it('weist ungepaarte Stichproben zurück – sonst wäre der Vergleich still falsch', () => {
    const samplesByModel = new Map<string, Sample[]>([
      ['a', scorelineSamples([[1, 0, 1, 0], [2, 1, 2, 1]])],
      ['b', scorelineSamples([[1, 0, 1, 0]])],
    ]);
    expect(() => bootstrapCategory({ samplesByModel, metric: kicktipp, draws: 10 })).toThrow(
      /gemeinsame Event-Menge/,
    );
  });

  it('erkennt einen echten Unterschied als getrennt und einen knappen nicht', () => {
    // 40 Events: "gut" trifft immer exakt, "schlecht" liegt immer daneben.
    const exact = Array.from({ length: 40 }, () => [2, 1, 2, 1] as [number, number, number, number]);
    const wrong = Array.from({ length: 40 }, () => [0, 3, 2, 1] as [number, number, number, number]);
    const clear = bootstrapCategory({
      samplesByModel: new Map([
        ['good', scorelineSamples(exact)],
        ['bad', scorelineSamples(wrong)],
      ]),
      metric: kicktipp,
      draws: 500,
    });
    expect(clear.pairs[0]!.separated).toBe(true);

    // Identische Leistung darf nie als getrennt gelten.
    const tied = bootstrapCategory({
      samplesByModel: new Map([
        ['a', scorelineSamples(exact)],
        ['b', scorelineSamples(exact)],
      ]),
      metric: kicktipp,
      draws: 500,
    });
    expect(tied.pairs[0]!.separated).toBe(false);
  });
});

describe('Reproduzierbarkeit des Builds', () => {
  it('verwendet in den Scoring-Modulen kein Math.random', () => {
    // Ein statischer Build muss byte-identisch reproduzierbar sein: sonst
    // erzeugt jeder Lauf neue Zahlen, der Publish-Job committet endlos, und der
    // Commit als Zeitbeweis verliert seinen Wert.
    // fileURLToPath statt Hand-Entzerrung: der Projektpfad enthält Leerzeichen,
    // die in der URL als %20 stehen.
    const here = path.dirname(fileURLToPath(import.meta.url));
    for (const file of ['bootstrap.ts', 'overall.ts']) {
      const source = readFileSync(path.join(here, file), 'utf8');
      // Auf die Aufrufform prüfen, nicht auf den Namen: die Dokumentation in
      // bootstrap.ts erklärt ausdrücklich, warum Math.random hier fehlt.
      expect(source, `${file} darf Math.random nicht aufrufen`).not.toMatch(/Math\s*\.\s*random\s*\(/);
    }
  });
});
