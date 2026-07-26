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
  label: 'Sport-Mix',
  blurb:
    'Spiele aus mehreren europäischen Ligen. Gleiche Tipp-Form wie bei der WM, aber eigene Metrik-Auswahl und laufender Betrieb mit offenen Partien.',
  question: 'Endstand nach 90 Minuten',
  accent: '#d97757',
  predictionType: 'scoreline',
  metricIds: ['points-per-event', 'exact-acc', 'tendency-acc', 'skill-score'],
  primaryMetric: 'points-per-event',
  baselineModelId: 'baseline-market',
  baselineNote:
    'Buchmacher-Konsens: das aus den Quoten abgeleitete wahrscheinlichste Ergebnis. Trifft die Tendenz meist, das exakte Ergebnis selten.',

  eventTitle(event) {
    const data = event.metadata as unknown as MixedMetadata;
    return {
      primary: event.title,
      secondary: data.league,
    };
  },

  groupOf(event) {
    return (event.metadata as unknown as MixedMetadata).league ?? 'Sonstige';
  },
};

categories.register(sportsMixed);
