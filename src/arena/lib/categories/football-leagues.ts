/**
 * Kategorie "Fussball-Ligen" – echte Daten, laufender Betrieb.
 *
 * Speist sich aus dem football-data.org-Feed (Top-5-Ligen, Champions League,
 * Brasileirão u. a.). Gleicher Vorhersage-Typ wie die WM, aber dauerhaft offen:
 * jede Woche neue Spiele, gruppiert nach Wettbewerb.
 *
 * Bewusst OHNE Skill-Score: eine Buchmacher-Referenz liegt in den Daten nicht
 * vor, und eine erfundene Baseline neben echten Ergebnissen wäre irreführend.
 */
import type { ArenaEvent } from '../types';
import { categories, type CategoryDescriptor } from './index';

interface LeagueMetadata {
  competition: string | null;
  matchday: number | null;
  home: { name: string; tla: string | null } | null;
  away: { name: string; tla: string | null } | null;
}

function meta(event: ArenaEvent): LeagueMetadata {
  return event.metadata as unknown as LeagueMetadata;
}

export const footballLeagues: CategoryDescriptor = {
  id: 'football-leagues',
  dataSource: 'live',
  // A-priori-Referenz: am 29.07.2026 fixiert, vor der ersten Auflösung.
  referenceRuleId: 'constant-1-0-apriori',
  label: {
    en: 'Football leagues',
    de: 'Fußball-Ligen',
    es: 'Ligas de fútbol',
  },
  blurb: {
    en: 'Fixtures from the top leagues worldwide, predicted before kick-off. Scored with the Kicktipp scheme: 4 points for the exact score, 3 for the goal difference, 2 for the outcome.',
    de: 'Spiele der weltweit führenden Ligen, getippt vor Anpfiff. Gewertet nach dem Kicktipp-Schema: 4 Punkte für das exakte Ergebnis, 3 für die Tordifferenz, 2 für die Tendenz.',
    es: 'Partidos de las principales ligas del mundo, predichos antes del inicio. Se evalúa con el esquema Kicktipp: 4 puntos por el marcador exacto, 3 por la diferencia de goles, 2 por el resultado.',
  },
  question: {
    en: 'Score after 90 minutes',
    de: 'Endstand nach 90 Minuten',
    es: 'Resultado tras 90 minutos',
  },
  accent: '#4ade80',
  predictionType: 'scoreline',
  metricIds: ['prediction-score', 'points-per-event', 'exact-acc', 'tendency-acc', 'kicktipp-points'],
  primaryMetric: 'points-per-event',

  eventTitle(event, locale) {
    const { home, away } = meta(event);
    // Vereinsnamen sind Eigennamen und bleiben unübersetzt.
    return {
      primary: event.titles?.[locale] ?? event.title,
      secondary:
        home?.tla && away?.tla ? `${home.tla} – ${away.tla}` : (meta(event).competition ?? undefined),
    };
  },

  groupOf(event) {
    return meta(event).competition ?? 'Other';
  },
};

categories.register(footballLeagues);
