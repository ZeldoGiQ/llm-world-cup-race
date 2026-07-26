/**
 * Fehlermasse für Zahlenschätzungen (`numeric`) – Aktienkurse, Prozentwerte,
 * Mengen. Kleiner ist besser.
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

/** Mittlerer absoluter Fehler – robust, in der Einheit der Zielgrösse. */
export const mae: Metric = {
  id: 'mae',
  label: 'MAE',
  description:
    'Mittlerer absoluter Fehler: durchschnittliche Abweichung der Schätzung vom tatsächlichen Wert, in der Einheit der Zielgrösse. Robust gegenüber Ausreissern.',
  appliesTo: ['numeric'],
  betterDirection: 'lower',
  compute(samples: Sample[]): MetricValue | null {
    const pairs = samplesOfKind(samples, 'numeric');
    if (pairs.length === 0) return null;
    const average = mean(pairs.map((p) => Math.abs(p.prediction.value - p.resolution.value)));
    return average === null ? null : { value: average, n: pairs.length };
  },
  format: (v) => formatFixed(v.value, 2),
};

/** Wurzel des mittleren quadratischen Fehlers – bestraft grosse Ausreisser stärker. */
export const rmse: Metric = {
  id: 'rmse',
  label: 'RMSE',
  description:
    'Wurzel des mittleren quadratischen Fehlers. Bestraft einzelne grosse Fehlschätzungen deutlich stärker als der MAE.',
  appliesTo: ['numeric'],
  betterDirection: 'lower',
  compute(samples: Sample[]): MetricValue | null {
    const pairs = samplesOfKind(samples, 'numeric');
    if (pairs.length === 0) return null;
    const average = mean(pairs.map((p) => (p.prediction.value - p.resolution.value) ** 2));
    return average === null ? null : { value: Math.sqrt(average), n: pairs.length };
  },
  format: (v) => formatFixed(v.value, 2),
};

/**
 * Mittlerer absoluter prozentualer Fehler.
 * Events mit Ist-Wert 0 werden übersprungen (Division durch Null); bleiben
 * dadurch keine Events übrig, ist die Metrik nicht berechenbar (null).
 */
export const mape: Metric = {
  id: 'mape',
  label: 'MAPE',
  description:
    'Mittlerer absoluter prozentualer Fehler: Abweichung relativ zum tatsächlichen Wert. Macht Kategorien mit unterschiedlichen Grössenordnungen vergleichbar. Events mit Ist-Wert 0 werden übersprungen.',
  appliesTo: ['numeric'],
  betterDirection: 'lower',
  compute(samples: Sample[]): MetricValue | null {
    const usable = samplesOfKind(samples, 'numeric').filter((p) => p.resolution.value !== 0);
    if (usable.length === 0) return null;
    const average = mean(
      usable.map(
        (p) => Math.abs(p.prediction.value - p.resolution.value) / Math.abs(p.resolution.value),
      ),
    );
    return average === null ? null : { value: average, n: usable.length };
  },
  format: (v) => formatPercent(v.value, 2),
};

metrics.register(mae);
metrics.register(rmse);
metrics.register(mape);
