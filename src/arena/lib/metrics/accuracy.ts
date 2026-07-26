/**
 * Metriken für Ergebnistipps (`scoreline`).
 *
 * `kicktipp-points` nutzt bewusst die bereits im WM-Tippspiel bewährte und
 * getestete Funktion `scorePrediction()` (src/lib/scoring.ts) – read-only
 * importiert, nicht kopiert. So bleibt die Wertung identisch zur WM-Seite.
 */
import { scorePrediction } from '../../../lib/scoring';
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
  label: 'Punkte',
  description:
    'Summe nach Kicktipp-Schema: 4 Punkte für das exakte Ergebnis, 3 für die richtige Tordifferenz (kein Remis), 2 für die richtige Tendenz. Vergleichbar nur bei gleicher Anzahl gewerteter Events – sonst "Punkte/Event" heranziehen.',
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
  format: (v) => String(v.value),
};

/** Punkte pro gewertetem Event – fair auch bei unterschiedlich vielen Tipps. */
export const pointsPerEvent: Metric = {
  id: 'points-per-event',
  label: 'Punkte/Event',
  description:
    'Durchschnittliche Kicktipp-Punkte pro gewertetem Event. Fairer Vergleich, wenn Modelle unterschiedlich viele Tipps abgegeben haben.',
  appliesTo: ['scoreline'],
  betterDirection: 'higher',
  compute(samples: Sample[]): MetricValue | null {
    const pairs = samplesOfKind(samples, 'scoreline');
    if (pairs.length === 0) return null;
    const average = mean(pairs.map((p) => scorePrediction(p.prediction, p.resolution).points));
    return average === null ? null : { value: average, n: pairs.length };
  },
  format: (v) => formatFixed(v.value, 2),
};

/** Anteil exakt getroffener Ergebnisse. */
export const exactAccuracy: Metric = {
  id: 'exact-acc',
  label: 'Exakt',
  description: 'Anteil der Events, deren Ergebnis exakt richtig vorhergesagt wurde.',
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
  format: (v) => formatPercent(v.value),
};

/** Anteil richtiger Tendenzen (Sieg/Remis/Niederlage), exakte Treffer eingeschlossen. */
export const tendencyAccuracy: Metric = {
  id: 'tendency-acc',
  label: 'Tendenz',
  description:
    'Anteil der Events, bei denen die Richtung stimmte (Heimsieg, Remis oder Auswärtssieg) – exakte Treffer eingeschlossen.',
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
  format: (v) => formatPercent(v.value),
};

metrics.register(kicktippPoints);
metrics.register(pointsPerEvent);
metrics.register(exactAccuracy);
metrics.register(tendencyAccuracy);
