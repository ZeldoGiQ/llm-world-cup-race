/**
 * Metriken für Ergebnistipps (`scoreline`).
 *
 * `kicktipp-points` nutzt bewusst die bereits im WM-Tippspiel bewährte und
 * getestete Funktion `scorePrediction()` (src/lib/scoring.ts) – read-only
 * importiert, nicht kopiert. So bleibt die Wertung identisch zur WM-Seite.
 */
import { scorePrediction } from '../../../lib/scoring';
import { formatInteger } from '../i18n/format';
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

const sign = (n: number): -1 | 0 | 1 => (n > 0 ? 1 : n < 0 ? -1 : 0);

/** Summe der Kicktipp-Punkte (4 exakt / 3 Tordifferenz / 2 Tendenz). */
export const kicktippPoints: Metric = {
  id: 'kicktipp-points',
  label: { en: 'Points', de: 'Punkte', es: 'Puntos' },
  description: {
    en: 'Total points under the Kicktipp scheme: 4 for the exact score, 3 for the correct goal difference (draws excluded), 2 for the correct outcome. Only comparable when models were scored on the same number of events — otherwise use points per event.',
    de: 'Summe nach Kicktipp-Schema: 4 Punkte für das exakte Ergebnis, 3 für die richtige Tordifferenz (kein Remis), 2 für den richtigen Spielausgang. Nur vergleichbar, wenn gleich viele Events gewertet wurden – sonst „Punkte/Event" heranziehen.',
    es: 'Puntos totales según el esquema Kicktipp: 4 por el resultado exacto, 3 por la diferencia de goles correcta (sin empates), 2 por el resultado correcto. Solo es comparable si se evaluó el mismo número de eventos; de lo contrario, use puntos por evento.',
  },
  appliesTo: ['scoreline'],
  betterDirection: 'higher',
  compute(samples: Sample[]): MetricValue | null {
    const pairs = samplesOfKind(samples, 'scoreline');
    if (pairs.length === 0) return null;
    let total = 0;
    for (const { prediction, resolution } of pairs) {
      total += scorePrediction(prediction, resolution).points;
    }
    return { value: total, n: pairs.length };
  },
  format: (v, locale) => formatInteger(v.value, locale),
};

/** Punkte pro gewertetem Event – fair auch bei unterschiedlich vielen Tipps. */
export const pointsPerEvent: Metric = {
  id: 'points-per-event',
  label: { en: 'Points/event', de: 'Punkte/Event', es: 'Puntos/evento' },
  description: {
    en: 'Average Kicktipp points per scored event. Fair comparison when models submitted different numbers of predictions.',
    de: 'Durchschnittliche Kicktipp-Punkte pro gewertetem Event. Fairer Vergleich, wenn Modelle unterschiedlich viele Tipps abgegeben haben.',
    es: 'Puntos Kicktipp promedio por evento evaluado. Permite comparar de forma justa cuando los modelos enviaron distinta cantidad de predicciones.',
  },
  appliesTo: ['scoreline'],
  betterDirection: 'higher',
  compute(samples: Sample[]): MetricValue | null {
    const pairs = samplesOfKind(samples, 'scoreline');
    if (pairs.length === 0) return null;
    const average = mean(pairs.map((p) => scorePrediction(p.prediction, p.resolution).points));
    return average === null ? null : { value: average, n: pairs.length };
  },
  format: (v, locale) => formatFixed(v.value, locale, 2),
};

/** Anteil exakt getroffener Ergebnisse. */
export const exactAccuracy: Metric = {
  id: 'exact-acc',
  label: { en: 'Exact', de: 'Exakt', es: 'Exacto' },
  description: {
    en: 'Share of events whose exact score was predicted correctly.',
    de: 'Anteil der Events, deren Ergebnis exakt richtig vorhergesagt wurde.',
    es: 'Proporción de eventos cuyo resultado exacto se predijo correctamente.',
  },
  appliesTo: ['scoreline'],
  betterDirection: 'higher',
  compute(samples: Sample[]): MetricValue | null {
    const pairs = samplesOfKind(samples, 'scoreline');
    if (pairs.length === 0) return null;
    const hits = pairs.filter(
      (p) => p.prediction.home === p.resolution.home && p.prediction.away === p.resolution.away,
    ).length;
    return { value: hits / pairs.length, n: pairs.length };
  },
  format: (v, locale) => formatPercent(v.value, locale),
};

/** Anteil richtiger Spielausgänge (Sieg/Remis/Niederlage), exakte Treffer eingeschlossen. */
export const tendencyAccuracy: Metric = {
  id: 'tendency-acc',
  label: { en: 'Outcome', de: 'Tendenz', es: 'Resultado' },
  description: {
    en: 'Share of events where the direction was right (home win, draw or away win) — exact hits included.',
    de: 'Anteil der Events, bei denen die Richtung stimmte (Heimsieg, Remis oder Auswärtssieg) – exakte Treffer eingeschlossen.',
    es: 'Proporción de eventos en los que se acertó la dirección (victoria local, empate o victoria visitante), incluidos los aciertos exactos.',
  },
  appliesTo: ['scoreline'],
  betterDirection: 'higher',
  compute(samples: Sample[]): MetricValue | null {
    const pairs = samplesOfKind(samples, 'scoreline');
    if (pairs.length === 0) return null;
    const hits = pairs.filter(
      (p) =>
        sign(p.prediction.home - p.prediction.away) === sign(p.resolution.home - p.resolution.away),
    ).length;
    return { value: hits / pairs.length, n: pairs.length };
  },
  format: (v, locale) => formatPercent(v.value, locale),
};

metrics.register(kicktippPoints);
metrics.register(pointsPerEvent);
metrics.register(exactAccuracy);
metrics.register(tendencyAccuracy);
