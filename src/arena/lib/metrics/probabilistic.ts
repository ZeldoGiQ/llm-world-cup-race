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
  label: { en: 'Brier', de: 'Brier', es: 'Brier' },
  description: {
    en: 'Brier score: the mean squared distance between the stated probability and the actual outcome (0 = perfect, 0.25 = uninformative 50/50, 1 = confidently wrong). A proper scoring rule — it rewards honest probabilities instead of overconfidence.',
    de: 'Brier-Score: mittlerer quadratischer Abstand zwischen genannter Wahrscheinlichkeit und tatsächlichem Ausgang (0 = perfekt, 0,25 = uninformiertes 50/50, 1 = mit voller Überzeugung falsch). Proper Scoring Rule – belohnt ehrliche Wahrscheinlichkeiten statt Overconfidence.',
    es: 'Puntuación de Brier: distancia cuadrática media entre la probabilidad declarada y el resultado real (0 = perfecto, 0,25 = un 50/50 sin información, 1 = equivocado con plena convicción). Es una regla de puntuación propia: premia las probabilidades honestas en lugar del exceso de confianza.',
  },
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
  format: (v, locale) => formatFixed(v.value, locale, 3),
};

/**
 * Log-Loss (negative Log-Likelihood). Bestraft sichere Fehlprognosen drastisch.
 * Wahrscheinlichkeiten werden auf [eps, 1-eps] geklemmt, weil log(0) = -Infinity
 * wäre und ein einziger 0/1-Fehltipp die Metrik sonst unbrauchbar machen würde.
 */
const EPSILON = 1e-15;

export const logLoss: Metric = {
  id: 'log-loss',
  label: { en: 'Log loss', de: 'Log-Loss', es: 'Pérdida log.' },
  description: {
    en: 'Negative log-likelihood: penalises confidently wrong forecasts far more sharply than the Brier score. Probabilities are clipped marginally away from 0 and 1 so that a single total miss cannot drive the value to infinity.',
    de: 'Negative Log-Likelihood: bestraft mit hoher Überzeugung abgegebene Fehlprognosen drastisch stärker als der Brier-Score. Wahrscheinlichkeiten werden minimal von 0 und 1 weggeklemmt, damit ein einzelner Totalirrtum den Wert nicht auf unendlich treibt.',
    es: 'Pérdida logarítmica (log-loss): penaliza los pronósticos equivocados con alta convicción mucho más que la puntuación de Brier. Las probabilidades se recortan mínimamente respecto de 0 y 1 para que un único error total no lleve el valor al infinito.',
  },
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
  format: (v, locale) => formatFixed(v.value, locale, 3),
};

/**
 * Trefferquote bei Schwelle 0,5 – nur als leicht lesbare Beigabe.
 * Wahrscheinlichkeiten von exakt 0,5 zählen als nicht getroffen (keine Aussage).
 */
export const accuracyAtHalf: Metric = {
  id: 'accuracy-50',
  label: { en: 'Hit rate', de: 'Trefferquote', es: 'Acierto' },
  description: {
    en: 'Share of correct yes/no calls at a 50 % threshold. Shown for orientation only — the ranking uses Brier and log loss, because hit rate does not penalise overconfidence.',
    de: 'Anteil richtiger Ja/Nein-Aussagen bei Schwelle 50 %. Nur zur Einordnung – für das Ranking sind Brier und Log-Loss maßgeblich, weil die Trefferquote Overconfidence nicht bestraft.',
    es: 'Proporción de aciertos en decisiones sí/no con umbral del 50 %. Se muestra solo como referencia: la clasificación usa Brier y pérdida logarítmica, porque el acierto no penaliza el exceso de confianza.',
  },
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
  format: (v, locale) => formatPercent(v.value, locale),
};

metrics.register(brier);
metrics.register(logLoss);
metrics.register(accuracyAtHalf);
