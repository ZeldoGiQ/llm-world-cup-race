/**
 * Skill-Score – die zitierfähige Kernzahl des Benchmarks.
 *
 * Absolute Fehlermasse allein sagen wenig: Ein Brier von 0,18 kann exzellent
 * oder mittelmässig sein, je nachdem, wie schwer die Fragen waren. Erst der
 * Vergleich mit einer Referenz beantwortet die eigentliche Frage:
 * **Schlägt das Modell die Baseline?** (Buchmacher-Konsens, Random-Walk,
 * letzte Umfrage.)
 *
 *   skill = 1 − Verlust(Modell) / Verlust(Baseline)
 *
 *   > 0  besser als die Baseline      = 0  gleich gut      < 0  schlechter
 *
 * Damit die Zahl typunabhängig funktioniert, wird pro Vorhersage-Typ ein
 * Verlust in vergleichbarer Skala definiert (siehe `sampleLoss`). Der Quotient
 * kürzt die Einheit weg, deshalb ist der Score über Kategorien hinweg
 * vergleichbar – anders als rohe Punkte oder ein MAE in Indexpunkten.
 */
import { scorePrediction } from '../../../lib/scoring';
import { SCORING } from '../../../lib/config';
import { formatSigned } from '../i18n/format';
import type { Sample } from '../types';
import { mean, metrics, type Metric, type MetricValue } from './index';

/**
 * Verlust eines einzelnen Paares, klein = gut.
 *   scoreline -> 1 − Punkte/Maximalpunkte  (0 bei exaktem Treffer, 1 bei daneben)
 *   numeric   -> absoluter Fehler
 *   binary    -> quadratischer Wahrscheinlichkeitsfehler (Brier-Beitrag)
 * Gibt null, wenn Vorhersage und Ergebnis nicht zum selben Typ gehören.
 */
export function sampleLoss(sample: Sample): number | null {
  const { prediction, resolution } = sample;
  if (prediction.kind === 'scoreline' && resolution.kind === 'scoreline') {
    const { points } = scorePrediction(prediction, resolution);
    return 1 - points / SCORING.exact;
  }
  if (prediction.kind === 'numeric' && resolution.kind === 'numeric') {
    return Math.abs(prediction.value - resolution.value);
  }
  if (prediction.kind === 'binary' && resolution.kind === 'binary') {
    return (prediction.probability - (resolution.outcome ? 1 : 0)) ** 2;
  }
  return null;
}

export function averageLoss(samples: Sample[]): number | null {
  const losses: number[] = [];
  for (const sample of samples) {
    const loss = sampleLoss(sample);
    if (loss !== null) losses.push(loss);
  }
  return mean(losses);
}

export const skillScore: Metric = {
  id: 'skill-score',
  label: { en: 'Skill', de: 'Skill', es: 'Habilidad' },
  description: {
    en: 'Skill score against the baseline: 1 − loss(model) / loss(baseline). Above 0 means better than the reference (bookmaker consensus, random walk or latest poll), 0 means equal, negative means worse. The ratio cancels out the unit, which makes this figure comparable across categories and the basis of the overall leaderboard.',
    de: 'Skill-Score gegenüber der Baseline: 1 − Verlust(Modell) / Verlust(Baseline). Über 0 heißt besser als die Referenz (Buchmacher-Konsens, Random-Walk bzw. letzte Umfrage), 0 gleich gut, negativ schlechter. Der Quotient kürzt die Einheit weg – deshalb ist diese Zahl auch über Kategorien hinweg vergleichbar und die Grundlage des Gesamt-Leaderboards.',
    es: 'Puntuación de habilidad frente a la línea base: 1 − pérdida(modelo) / pérdida(línea base). Por encima de 0 significa mejor que la referencia (consenso de casas de apuestas, camino aleatorio o última encuesta), 0 igual y negativo peor. El cociente elimina la unidad, por lo que esta cifra es comparable entre categorías y sirve de base para la clasificación general.',
  },
  appliesTo: ['*'],
  requiresBaseline: true,
  betterDirection: 'higher',
  compute(samples, context): MetricValue | null {
    const baselineSamples = context?.baselineSamples;
    if (!baselineSamples || baselineSamples.length === 0) return null;

    const modelLoss = averageLoss(samples);
    const baselineLoss = averageLoss(baselineSamples);
    if (modelLoss === null || baselineLoss === null) return null;
    // Perfekte Baseline: kein sinnvoller Quotient bildbar.
    if (baselineLoss === 0) return null;

    return { value: 1 - modelLoss / baselineLoss, n: samples.length };
  },
  // Vorzeichen explizit über Intl (signDisplay), damit "+0,42" bzw. "+0.42" auf
  // den ersten Blick zeigt, dass die Baseline geschlagen wurde – und die
  // Vorzeichenstellung der jeweiligen Sprache folgt.
  format: (v, locale) => formatSigned(v.value, locale, 3),
};

metrics.register(skillScore);
