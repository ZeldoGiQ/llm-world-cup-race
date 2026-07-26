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
  label: { en: 'MAE', de: 'MAE', es: 'MAE' },
  description: {
    en: 'Mean absolute error: the average distance between estimate and actual value, in the unit of the target. Robust against outliers.',
    de: 'Mittlerer absoluter Fehler: durchschnittliche Abweichung der Schätzung vom tatsächlichen Wert, in der Einheit der Zielgröße. Robust gegenüber Ausreißern.',
    es: 'Error absoluto medio: la desviación promedio entre la estimación y el valor real, en la unidad del objetivo. Robusto frente a valores atípicos.',
  },
  appliesTo: ['numeric'],
  betterDirection: 'lower',
  compute(samples: Sample[]): MetricValue | null {
    const pairs = samplesOfKind(samples, 'numeric');
    if (pairs.length === 0) return null;
    const average = mean(pairs.map((p) => Math.abs(p.prediction.value - p.resolution.value)));
    return average === null ? null : { value: average, n: pairs.length };
  },
  format: (v, locale) => formatFixed(v.value, locale, 2),
};

/** Wurzel des mittleren quadratischen Fehlers – bestraft grosse Ausreisser stärker. */
export const rmse: Metric = {
  id: 'rmse',
  label: { en: 'RMSE', de: 'RMSE', es: 'RMSE' },
  description: {
    en: 'Root mean squared error. Penalises individual large misses far more heavily than the MAE does.',
    de: 'Wurzel des mittleren quadratischen Fehlers. Bestraft einzelne große Fehlschätzungen deutlich stärker als der MAE.',
    es: 'Raíz del error cuadrático medio. Penaliza los errores grandes individuales mucho más que el MAE.',
  },
  appliesTo: ['numeric'],
  betterDirection: 'lower',
  compute(samples: Sample[]): MetricValue | null {
    const pairs = samplesOfKind(samples, 'numeric');
    if (pairs.length === 0) return null;
    const average = mean(pairs.map((p) => (p.prediction.value - p.resolution.value) ** 2));
    return average === null ? null : { value: Math.sqrt(average), n: pairs.length };
  },
  format: (v, locale) => formatFixed(v.value, locale, 2),
};

/**
 * Mittlerer absoluter prozentualer Fehler.
 * Events mit Ist-Wert 0 werden übersprungen (Division durch Null); bleiben
 * dadurch keine Events übrig, ist die Metrik nicht berechenbar (null).
 */
export const mape: Metric = {
  id: 'mape',
  label: { en: 'MAPE', de: 'MAPE', es: 'MAPE' },
  description: {
    en: 'Mean absolute percentage error: the deviation relative to the actual value. Makes categories of different magnitudes comparable. Events with an actual value of zero are skipped.',
    de: 'Mittlerer absoluter prozentualer Fehler: Abweichung relativ zum tatsächlichen Wert. Macht Kategorien mit unterschiedlichen Größenordnungen vergleichbar. Events mit Ist-Wert 0 werden übersprungen.',
    es: 'Error porcentual absoluto medio: la desviación relativa al valor real. Permite comparar categorías de magnitudes distintas. Se omiten los eventos cuyo valor real es cero.',
  },
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
  format: (v, locale) => formatPercent(v.value, locale, 2),
};

metrics.register(mae);
metrics.register(rmse);
metrics.register(mape);
