/**
 * Kategorie "Krypto" – echte Daten, numerische Punktschätzung.
 *
 * Tagesschlusskurs (00:00 UTC) von BTC und ETH aus dem CoinGecko-Feed. Wie bei
 * Aktien ist der Random-Walk die Messlatte: wer ihn nicht schlägt, hat keine
 * Prognosefähigkeit gezeigt – bei Krypto besonders hart, weil die Volatilität
 * hoch und die Vorhersagbarkeit gering ist.
 */
import { formatDate, formatMonthYear, formatNumber } from '../i18n/format';
import type { Locale } from '../i18n/locales';
import { categories, type CategoryDescriptor } from './index';

interface CryptoMetadata {
  symbol: string;
  previousClose: number;
}

const PREVIOUS_DAY: Record<Locale, string> = {
  en: 'Previous close',
  de: 'Vortagesschluss',
  es: 'Cierre anterior',
};

export const crypto: CategoryDescriptor = {
  id: 'crypto',
  dataSource: 'live',
  label: { en: 'Crypto', de: 'Krypto', es: 'Cripto' },
  blurb: {
    en: 'Daily closing price of major cryptocurrencies at 00:00 UTC. Scored on the deviation in US dollars and measured against a random walk as the reference.',
    de: 'Tagesschlusskurs großer Kryptowährungen um 00:00 UTC. Gewertet wird die Abweichung in US-Dollar – gemessen gegen den Random-Walk als Referenz.',
    es: 'Precio de cierre diario de las principales criptomonedas a las 00:00 UTC. Se evalúa la desviación en dólares, medida frente a un camino aleatorio como referencia.',
  },
  question: {
    en: 'Closing price at 00:00 UTC',
    de: 'Schlusskurs um 00:00 UTC',
    es: 'Precio de cierre a las 00:00 UTC',
  },
  accent: '#f7931a',
  predictionType: 'numeric',
  metricIds: ['mae', 'mape', 'rmse', 'skill-score'],
  primaryMetric: 'mape',
  baselineModelId: 'baseline-randomwalk',
  baselineNote: {
    en: 'Random walk: forecasts the last known closing price unchanged. Hard to beat for crypto, where volatility is high and predictability is low.',
    de: 'Random-Walk: prognostiziert den letzten bekannten Schlusskurs unverändert. Bei Krypto schwer zu schlagen – hohe Volatilität, geringe Vorhersagbarkeit.',
    es: 'Camino aleatorio: pronostica el último precio de cierre conocido sin cambios. Difícil de superar en cripto, con alta volatilidad y baja previsibilidad.',
  },
  unit: { en: 'USD', de: 'USD', es: 'USD' },

  eventTitle(event, locale) {
    const data = event.metadata as unknown as CryptoMetadata;
    return {
      primary: `${data.symbol ?? 'Crypto'} · ${formatDate(event.utcDate, locale)}`,
      secondary:
        typeof data.previousClose === 'number'
          ? `${PREVIOUS_DAY[locale]} ${formatNumber(data.previousClose, locale)} USD`
          : undefined,
    };
  },

  groupOf(event, locale) {
    return formatMonthYear(event.utcDate, locale);
  },
};

categories.register(crypto);
