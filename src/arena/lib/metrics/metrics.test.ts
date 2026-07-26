import { describe, expect, it } from 'vitest';
import type { Sample } from '../types';
import { exactAccuracy, kicktippPoints, pointsPerEvent, tendencyAccuracy } from './accuracy';
import { mae, mape, rmse } from './error';
import { accuracyAtHalf, brier, logLoss } from './probabilistic';
import { sampleLoss, skillScore } from './skill';
import { metrics, metricsFor } from './index';

/* Hilfen zum kompakten Aufbau von Stichproben */
const sl = (ph: number, pa: number, rh: number, ra: number): Sample => ({
  prediction: { kind: 'scoreline', home: ph, away: pa },
  resolution: { kind: 'scoreline', home: rh, away: ra },
});
const num = (p: number, r: number): Sample => ({
  prediction: { kind: 'numeric', value: p },
  resolution: { kind: 'numeric', value: r },
});
const bin = (p: number, outcome: boolean): Sample => ({
  prediction: { kind: 'binary', probability: p },
  resolution: { kind: 'binary', outcome },
});

describe('scoreline-Metriken', () => {
  const samples = [
    sl(2, 1, 2, 1), // exakt      -> 4
    sl(3, 2, 2, 1), // Differenz  -> 3
    sl(1, 0, 3, 1), // Tendenz    -> 2
    sl(0, 2, 2, 0), // daneben    -> 0
  ];

  it('summiert Kicktipp-Punkte wie die WM-Wertung', () => {
    expect(kicktippPoints.compute(samples)).toEqual({ value: 9, n: 4 });
  });

  it('rechnet Punkte pro Event', () => {
    expect(pointsPerEvent.compute(samples)).toEqual({ value: 2.25, n: 4 });
  });

  it('zählt exakte Treffer als Anteil', () => {
    expect(exactAccuracy.compute(samples)).toEqual({ value: 0.25, n: 4 });
  });

  it('zählt Tendenz inklusive exakter Treffer', () => {
    // exakt + Differenz + Tendenz stimmen in der Richtung, nur das letzte nicht
    expect(tendencyAccuracy.compute(samples)).toEqual({ value: 0.75, n: 4 });
  });

  it('gibt null bei leerer Stichprobe', () => {
    expect(kicktippPoints.compute([])).toBeNull();
    expect(exactAccuracy.compute([])).toBeNull();
    expect(tendencyAccuracy.compute([])).toBeNull();
    expect(pointsPerEvent.compute([])).toBeNull();
  });

  it('ignoriert Paare mit falschem Typ', () => {
    expect(kicktippPoints.compute([...samples, num(1, 1)])).toEqual({ value: 9, n: 4 });
  });
});

describe('numeric-Metriken', () => {
  // Fehler: 2, 4, 6  -> MAE 4, RMSE sqrt((4+16+36)/3) = sqrt(18.666..)
  const samples = [num(102, 100), num(96, 100), num(106, 100)];

  it('berechnet MAE', () => {
    expect(mae.compute(samples)).toEqual({ value: 4, n: 3 });
  });

  it('berechnet RMSE und bestraft Ausreisser stärker als MAE', () => {
    const result = rmse.compute(samples)!;
    expect(result.value).toBeCloseTo(Math.sqrt((4 + 16 + 36) / 3), 10);
    expect(result.value).toBeGreaterThan(mae.compute(samples)!.value);
  });

  it('berechnet MAPE relativ zum Ist-Wert', () => {
    const result = mape.compute(samples)!;
    expect(result.value).toBeCloseTo((0.02 + 0.04 + 0.06) / 3, 10);
    expect(result.n).toBe(3);
  });

  it('überspringt bei MAPE Events mit Ist-Wert 0 (keine Division durch Null)', () => {
    const withZero = [...samples, num(5, 0)];
    const result = mape.compute(withZero)!;
    expect(result.n).toBe(3); // das Null-Event fällt heraus
    expect(Number.isFinite(result.value)).toBe(true);
  });

  it('gibt null, wenn ausschliesslich Ist-Werte 0 vorliegen', () => {
    expect(mape.compute([num(5, 0), num(2, 0)])).toBeNull();
  });

  it('MAE ist 0 bei perfekten Schätzungen', () => {
    expect(mae.compute([num(100, 100), num(50, 50)])!.value).toBe(0);
  });
});

describe('probabilistische Metriken', () => {
  it('Brier ist 0 bei perfekter Sicherheit und richtigem Ausgang', () => {
    expect(brier.compute([bin(1, true), bin(0, false)])).toEqual({ value: 0, n: 2 });
  });

  it('Brier ist 1 bei voller Überzeugung und falschem Ausgang', () => {
    expect(brier.compute([bin(1, false), bin(0, true)])).toEqual({ value: 1, n: 2 });
  });

  it('Brier ist 0,25 bei durchgehend 50/50', () => {
    expect(brier.compute([bin(0.5, true), bin(0.5, false)])).toEqual({ value: 0.25, n: 2 });
  });

  it('Brier rechnet den quadratischen Fehler korrekt', () => {
    // (0.8-1)^2 = 0.04 ; (0.3-0)^2 = 0.09 -> Mittel 0.065
    expect(brier.compute([bin(0.8, true), bin(0.3, false)])!.value).toBeCloseTo(0.065, 10);
  });

  it('Log-Loss bleibt bei sicherer Fehlprognose endlich (Clipping gegen log(0))', () => {
    const result = logLoss.compute([bin(0, true)])!;
    expect(Number.isFinite(result.value)).toBe(true);
    expect(result.value).toBeGreaterThan(30); // hart bestraft, aber nicht unendlich
  });

  it('Log-Loss ist nahe 0 bei perfekter, richtiger Sicherheit', () => {
    expect(logLoss.compute([bin(1, true)])!.value).toBeCloseTo(0, 10);
  });

  it('Log-Loss entspricht ln(2) bei 50/50', () => {
    expect(logLoss.compute([bin(0.5, true)])!.value).toBeCloseTo(Math.LN2, 10);
  });

  it('bestraft Overconfidence stärker als Zurückhaltung', () => {
    const overconfident = logLoss.compute([bin(0.99, false)])!.value;
    const cautious = logLoss.compute([bin(0.6, false)])!.value;
    expect(overconfident).toBeGreaterThan(cautious);
  });

  it('Trefferquote wertet exakt 0,5 nicht als Treffer', () => {
    expect(accuracyAtHalf.compute([bin(0.5, true), bin(0.9, true)])).toEqual({ value: 0.5, n: 2 });
  });

  it('gibt null bei leerer Stichprobe', () => {
    expect(brier.compute([])).toBeNull();
    expect(logLoss.compute([])).toBeNull();
    expect(accuracyAtHalf.compute([])).toBeNull();
  });
});

describe('sampleLoss', () => {
  it('ist 0 bei exaktem Ergebnistipp und 1 bei völlig falschem', () => {
    expect(sampleLoss(sl(2, 1, 2, 1))).toBe(0);
    expect(sampleLoss(sl(0, 2, 2, 0))).toBe(1);
  });

  it('ist der absolute Fehler bei Zahlen', () => {
    expect(sampleLoss(num(105, 100))).toBe(5);
  });

  it('ist der quadratische Fehler bei Wahrscheinlichkeiten', () => {
    expect(sampleLoss(bin(0.8, true))).toBeCloseTo(0.04, 10);
  });

  it('gibt null bei gemischten Typen', () => {
    expect(
      sampleLoss({
        prediction: { kind: 'numeric', value: 1 },
        resolution: { kind: 'binary', outcome: true },
      }),
    ).toBeNull();
  });
});

describe('skill-score', () => {
  it('ist positiv, wenn das Modell besser als die Baseline ist', () => {
    const model = [num(101, 100), num(99, 100)]; // MAE 1
    const baseline = [num(104, 100), num(96, 100)]; // MAE 4
    const result = skillScore.compute(model, { baselineSamples: baseline })!;
    expect(result.value).toBeCloseTo(1 - 1 / 4, 10);
  });

  it('ist 0 bei identischer Leistung', () => {
    const samples = [num(102, 100), num(98, 100)];
    expect(skillScore.compute(samples, { baselineSamples: samples })!.value).toBe(0);
  });

  it('ist negativ, wenn das Modell schlechter ist', () => {
    const model = [num(110, 100)];
    const baseline = [num(102, 100)];
    expect(skillScore.compute(model, { baselineSamples: baseline })!.value).toBeLessThan(0);
  });

  it('funktioniert typübergreifend auch für Wahrscheinlichkeiten', () => {
    const model = [bin(0.9, true)]; // Verlust 0.01
    const baseline = [bin(0.5, true)]; // Verlust 0.25
    expect(skillScore.compute(model, { baselineSamples: baseline })!.value).toBeCloseTo(
      1 - 0.01 / 0.25,
      10,
    );
  });

  it('gibt null ohne Baseline', () => {
    expect(skillScore.compute([num(1, 1)])).toBeNull();
    expect(skillScore.compute([num(1, 1)], { baselineSamples: [] })).toBeNull();
  });

  it('gibt null bei perfekter Baseline (kein Quotient bildbar)', () => {
    expect(
      skillScore.compute([num(105, 100)], { baselineSamples: [num(100, 100)] }),
    ).toBeNull();
  });
});

describe('Metrik-Registry', () => {
  it('kennt alle registrierten Metriken', () => {
    expect(metrics.ids().sort()).toEqual(
      [
        'accuracy-50',
        'brier',
        'exact-acc',
        'kicktipp-points',
        'log-loss',
        'mae',
        'mape',
        'points-per-event',
        'rmse',
        'skill-score',
        'tendency-acc',
      ].sort(),
    );
  });

  it('filtert Metriken passend zum Vorhersage-Typ', () => {
    const scorelineIds = metricsFor('scoreline').map((m) => m.id);
    expect(scorelineIds).toContain('kicktipp-points');
    expect(scorelineIds).toContain('skill-score'); // appliesTo ['*']
    expect(scorelineIds).not.toContain('brier');

    const binaryIds = metricsFor('binary').map((m) => m.id);
    expect(binaryIds).toContain('brier');
    expect(binaryIds).not.toContain('mae');
  });

  it('markiert Richtung "kleiner ist besser" bei Fehlermassen', () => {
    expect(metrics.get('mae').betterDirection).toBe('lower');
    expect(metrics.get('brier').betterDirection).toBe('lower');
    expect(metrics.get('kicktipp-points').betterDirection).toBe('higher');
    expect(metrics.get('skill-score').betterDirection).toBe('higher');
  });
});
