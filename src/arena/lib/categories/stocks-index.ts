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
import type { ArenaEvent } from '../types';
import { categories, type CategoryDescriptor } from './index';

interface StocksMetadata {
  symbol: string;
  previousClose: number;
  period: string;
}

export const stocksIndex: CategoryDescriptor = {
  id: 'stocks-index',
  label: 'Aktienindex',
  blurb:
    'Wöchentlicher Schlusskurs eines Aktienindex. Gewertet wird die Abweichung in Indexpunkten – gemessen gegen den Random-Walk als Referenz.',
  question: 'Schlusskurs am Freitag',
  accent: '#22d3ee',
  predictionType: 'numeric',
  metricIds: ['mae', 'mape', 'rmse', 'skill-score'],
  primaryMetric: 'mae',
  baselineModelId: 'baseline-randomwalk',
  baselineNote:
    'Random-Walk: prognostiziert den letzten bekannten Schlusskurs unverändert. Klassische Messlatte für Finanzprognosen.',
  unit: 'Indexpunkte',

  eventTitle(event) {
    const data = event.metadata as unknown as StocksMetadata;
    const date = new Date(event.utcDate).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return {
      primary: `${data.symbol ?? 'Index'} · ${date}`,
      secondary:
        typeof data.previousClose === 'number'
          ? `Vorwoche ${data.previousClose.toLocaleString('de-DE')}`
          : data.period,
    };
  },

  groupOf(event) {
    return new Date(event.utcDate).toLocaleDateString('de-DE', {
      month: 'long',
      year: 'numeric',
    });
  },
};

categories.register(stocksIndex);
