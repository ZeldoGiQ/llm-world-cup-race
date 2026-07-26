/**
 * Proper Scoring Rules für Wahrscheinlichkeitsvorhersagen (`binary`).
 *
 * Das sind die wissenschaftlich belastbaren Metriken des Benchmarks: Sie sind
 * "proper", d. h. der erwartete Score wird genau dann minimal, wenn ein Modell
 * seine ehrliche Überzeugung nennt. Reine Trefferquote (Accuracy) belohnt
 * dagegen Overconfidence und ist als Ranking-Kriterium angreifbar – sie ist
 * hier nur Beigabe.
 */
import type { Sample } from '../types';
import {
  formatFixed,
  formatPercent,
  mean,
  metrics,
  samplesOfKind,
  type Metric,
  type MetricValue,
} from './index';

/** Brier-Score: mittlerer quadratischer Fehler der Wahrscheinlichkeit. 0 = perfekt, 1 = maximal falsch. */
export const brier: Metric = {
  id: 'brier',
  label: 'Brier',
  description:
    'Brier-Score: mittlerer quadratischer Abstand zwischen genannter Wahrscheinlichkeit und tatsächlichem Ausgang (0 = perfekt, 0,25 = uninformiertes 50/50, 1 = mit voller Überzeugung falsch). Proper Scoring Rule – belohnt ehrliche Wahrscheinlichkeiten statt Overconfidence.',
  appliesTo: ['binary'],
  betterDirection: 'lower',
  compute(samples: Sample[]): MetricValue | null {
    const pairs = samplesOfKind(samples, 'binary');
    if (pairs.length === 0) return null;
    const average = mean(
      pairs.map((p) => (p.prediction.probability - (p.resolution.outcome ? 1 : 0)) ** 2),
    );
    return average === null ? null : { value: average, n: pairs.length };
  },
  format: (v) => formatFixed(v.value, 3),
};

/**
 * Log-Loss (negative Log-Likelihood). Bestraft sichere Fehlprognosen drastisch.
 * Wahrscheinlichkeiten werden auf [eps, 1-eps] geklemmt, weil log(0) = -Infinity
 * wäre und ein einziger 0/1-Fehltipp die Metrik sonst unbrauchbar machen würde.
 */
const EPSILON = 1e-15;

export const logLoss: Metric = {
  id: 'log-loss',
  label: 'Log-Loss',
  description:
    'Negative Log-Likelihood: bestraft mit hoher Überzeugung abgegebene Fehlprognosen drastisch stärker als der Brier-Score. Wahrscheinlichkeiten werden minimal von 0 und 1 weggeklemmt, damit ein einzelner Totalirrer den Wert nicht auf unendlich treibt.',
  appliesTo: ['binary'],
  betterDirection: 'lower',
  compute(samples: Sample[]): MetricValue | null {
    const pairs = samplesOfKind(samples, 'binary');
    if (pairs.length === 0) return null;
    const average = mean(
      pairs.map((p) => {
        const clamped = Math.min(Math.max(p.prediction.probability, EPSILON), 1 - EPSILON);
        return p.resolution.outcome ? -Math.log(clamped) : -Math.log(1 - clamped);
      }),
    );
    return average === null ? null : { value: average, n: pairs.length };
  },
  format: (v) => formatFixed(v.value, 3),
};

/**
 * Trefferquote bei Schwelle 0,5 – nur als leicht lesbare Beigabe.
 * Wahrscheinlichkeiten von exakt 0,5 zählen als nicht getroffen (keine Aussage).
 */
export const accuracyAtHalf: Metric = {
  id: 'accuracy-50',
  label: 'Trefferquote',
  description:
    'Anteil richtiger Ja/Nein-Aussagen bei Schwelle 50 %. Nur zur Einordnung – für das Ranking sind Brier und Log-Loss maßgeblich, weil Trefferquote Overconfidence nicht bestraft.',
  appliesTo: ['binary'],
  betterDirection: 'higher',
  compute(samples: Sample[]): MetricValue | null {
    const pairs = samplesOfKind(samples, 'binary');
    if (pairs.length === 0) return null;
    const hits = pairs.filter(
      (p) =>
        (p.prediction.probability > 0.5 && p.resolution.outcome) ||
        (p.prediction.probability < 0.5 && !p.resolution.outcome),
    ).length;
    return { value: hits / pairs.length, n: pairs.length };
  },
  format: (v) => formatPercent(v.value),
};

metrics.register(brier);
metrics.register(logLoss);
metrics.register(accuracyAtHalf);
