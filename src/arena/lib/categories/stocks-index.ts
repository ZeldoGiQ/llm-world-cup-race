/**
 * Kategorie "Aktienindex" – numerische Punktschätzung (DUMMY-DATEN).
 *
 * Diese Kategorie erzwingt einen anderen Vorhersage-Typ als der Sport und damit
 * andere Metriken (Fehlermasse statt Punkte). Sie ist der Beweis, dass die Engine
 * wirklich typunabhängig ist.
 *
 * Baseline: Random-Walk ("nächster Schlusskurs = letzter Schlusskurs") – in der
 * Finanzliteratur die klassische Messlatte. Ein Modell, das den Random-Walk nicht
 * schlägt, hat keine echte Prognosefähigkeit gezeigt.
 */
import { formatDate, formatMonthYear, formatNumber } from '../i18n/format';
import type { Locale } from '../i18n/locales';
import type { ArenaEvent } from '../types';
import { categories, type CategoryDescriptor } from './index';

interface StocksMetadata {
  symbol: string;
  previousClose: number;
  period: string;
}

const PREVIOUS_WEEK: Record<Locale, string> = {
  en: 'Previous week',
  de: 'Vorwoche',
  es: 'Semana anterior',
};

export const stocksIndex: CategoryDescriptor = {
  id: 'stocks-index',
  dataSource: 'live',
  label: { en: 'Stock index', de: 'Aktienindex', es: 'Índice bursátil' },
  blurb: {
    en: 'Weekly closing price of a stock index. Scored on the deviation in index points and measured against a random walk as the reference.',
    de: 'Wöchentlicher Schlusskurs eines Aktienindex. Gewertet wird die Abweichung in Indexpunkten – gemessen gegen den Random-Walk als Referenz.',
    es: 'Precio de cierre semanal de un índice bursátil. Se evalúa la desviación en puntos del índice, medida frente a un camino aleatorio como referencia.',
  },
  question: {
    en: 'Friday closing price',
    de: 'Schlusskurs am Freitag',
    es: 'Precio de cierre del viernes',
  },
  accent: '#22d3ee',
  predictionType: 'numeric',
  metricIds: ['mae', 'mape', 'rmse', 'skill-score'],
  primaryMetric: 'mae',
  baselineModelId: 'baseline-randomwalk',
  baselineNote: {
    en: 'Random walk: forecasts the last known closing price unchanged. The classic yardstick for financial forecasts.',
    de: 'Random-Walk: prognostiziert den letzten bekannten Schlusskurs unverändert. Klassische Messlatte für Finanzprognosen.',
    es: 'Camino aleatorio: pronostica el último precio de cierre conocido sin cambios. Es la referencia clásica para pronósticos financieros.',
  },
  unit: { en: 'index points', de: 'Indexpunkte', es: 'puntos del índice' },

  eventTitle(event, locale) {
    const data = event.metadata as unknown as StocksMetadata;
    return {
      primary: `${data.symbol ?? 'Index'} · ${formatDate(event.utcDate, locale)}`,
      secondary:
        typeof data.previousClose === 'number'
          ? `${PREVIOUS_WEEK[locale]} ${formatNumber(data.previousClose, locale)}`
          : data.period,
    };
  },

  groupOf(event, locale) {
    return formatMonthYear(event.utcDate, locale);
  },
};

categories.register(stocksIndex);
