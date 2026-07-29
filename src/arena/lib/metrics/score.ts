/**
 * Prediction Score als Metrik – dieselbe Registry wie alle anderen, damit er
 * ohne Sonderweg als Spalte, Ranking-Grundlage und Hero-Zahl dienen kann.
 *
 * Rechnerisch ist er der Skill-Score × 100 (siehe scoring/score.ts für die
 * Begründung der Skala). Er braucht wie dieser eine Referenz: entweder einen
 * Referenz-Teilnehmer mit eigenen Vorhersagen (baselineModelId) oder eine
 * deterministische Referenzregel (referenceRuleId) – die Standings-Engine
 * liefert beides als `baselineSamples` an.
 */
import { formatFixed } from '../i18n/format';
import { scoreFromLossRatio } from '../scoring/score';
import { averageLoss } from './skill';
import { metrics, type Metric, type MetricValue } from './index';

export const predictionScore: Metric = {
  id: 'prediction-score',
  label: { en: 'Prediction Score', de: 'Prediction Score', es: 'Prediction Score' },
  description: {
    en: 'The headline figure (SCORE_V1): 100 × (1 − loss(model) / loss(reference)). 0 means as good as the naive reference, 100 means perfect, negative means worse than the reference. The loss ratio cancels the unit, so the score is comparable across categories; the overall board aggregates it via the geometric mean of the ratios.',
    de: 'Die Leitzahl (SCORE_V1): 100 × (1 − Verlust(Modell) / Verlust(Referenz)). 0 heißt so gut wie die naive Referenz, 100 perfekt, negativ schlechter als die Referenz. Der Verlustquotient kürzt die Einheit weg, deshalb ist der Score über Kategorien vergleichbar; das Gesamt-Board aggregiert ihn über das geometrische Mittel der Quotienten.',
    es: 'La cifra principal (SCORE_V1): 100 × (1 − pérdida(modelo) / pérdida(referencia)). 0 significa tan bueno como la referencia ingenua, 100 perfecto, negativo peor que la referencia. El cociente de pérdidas elimina la unidad, por lo que la puntuación es comparable entre categorías; la tabla general la agrega mediante la media geométrica de los cocientes.',
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
    // Perfekte Referenz: kein sinnvoller Quotient bildbar.
    if (baselineLoss === 0) return null;

    return { value: scoreFromLossRatio(modelLoss / baselineLoss), n: samples.length };
  },
  format: (v, locale) => formatFixed(v.value, locale, 1),
};

metrics.register(predictionScore);
