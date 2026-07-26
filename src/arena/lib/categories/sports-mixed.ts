/**
 * Kategorie "Sport-Mix" – Ergebnistipps über mehrere Ligen (DUMMY-DATEN).
 *
 * Zeigt zwei Dinge: (a) derselbe Vorhersage-Typ wie die WM lässt sich in einer
 * völlig anderen Kategorie mit anderer Metrik-Auswahl wiederverwenden, und (b) die
 * Oberfläche kommt mit laufenden, offenen und abgesagten Events gleichzeitig
 * zurecht.
 *
 * Baseline: Buchmacher-Konsens – solide in der Tendenz, selten exakt.
 */
import type { ArenaEvent } from '../types';
import { categories, type CategoryDescriptor } from './index';

interface MixedMetadata {
  league: string;
  home: { name: string } | null;
  away: { name: string } | null;
}

export const sportsMixed: CategoryDescriptor = {
  id: 'sports-mixed',
  label: { en: 'Mixed sports', de: 'Sport-Mix', es: 'Deportes varios' },
  blurb: {
    en: 'Fixtures from several European leagues. Same prediction format as the World Cup, but with its own metric selection and live operation including open fixtures.',
    de: 'Spiele aus mehreren europäischen Ligen. Gleiche Tipp-Form wie bei der WM, aber eigene Metrik-Auswahl und laufender Betrieb mit offenen Partien.',
    es: 'Partidos de varias ligas europeas. El mismo formato de predicción que el Mundial, pero con su propia selección de métricas y operación en vivo con partidos abiertos.',
  },
  question: {
    en: 'Score after 90 minutes',
    de: 'Endstand nach 90 Minuten',
    es: 'Resultado tras 90 minutos',
  },
  accent: '#d97757',
  predictionType: 'scoreline',
  metricIds: ['points-per-event', 'exact-acc', 'tendency-acc', 'skill-score'],
  primaryMetric: 'points-per-event',
  baselineModelId: 'baseline-market',
  baselineNote: {
    en: 'Bookmaker consensus: the most likely score implied by the odds. Usually right on the outcome, rarely on the exact score.',
    de: 'Buchmacher-Konsens: das aus den Quoten abgeleitete wahrscheinlichste Ergebnis. Trifft die Tendenz meist, das exakte Ergebnis selten.',
    es: 'Consenso de las casas de apuestas: el resultado más probable derivado de las cuotas. Suele acertar el resultado, rara vez el marcador exacto.',
  },

  eventTitle(event: ArenaEvent, locale) {
    const data = event.metadata as unknown as MixedMetadata;
    return {
      // Vereinsnamen sind Eigennamen und bleiben unübersetzt.
      primary: event.titles?.[locale] ?? event.title,
      secondary: data.league,
    };
  },

  groupOf(event) {
    return (event.metadata as unknown as MixedMetadata).league ?? 'Other';
  },
};

categories.register(sportsMixed);
