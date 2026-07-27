/**
 * Kategorie "Fussball-WM 2026" – die einzige mit **echten** Daten.
 *
 * Speist sich aus dem abgeschlossenen WM-Tippspiel (104 Spiele, 6 Modelle) und
 * beweist damit, dass die generische Engine an realen Zahlen dasselbe Ergebnis
 * liefert wie die ursprüngliche Seite.
 *
 * Bewusst OHNE Skill-Score: Für die WM gibt es keine echte Buchmacher-Referenz in
 * den Daten. Eine erfundene Baseline neben echten Ergebnissen wäre irreführend –
 * deshalb erscheint hier keine, und die Spalte fehlt schlicht. Genau dafür sind
 * die Metrik-Spalten pro Kategorie konfigurierbar.
 */
import { flagEmoji } from '../../../lib/format';
import { groupName, stageName, teamName } from '../i18n/football-terms';
import type { ArenaEvent } from '../types';
import { categories, type CategoryDescriptor } from './index';

interface WorldCupMetadata {
  stage: string | null;
  group: string | null;
  home: { name: string; tla: string | null } | null;
  away: { name: string; tla: string | null } | null;
}

function meta(event: ArenaEvent): WorldCupMetadata {
  return event.metadata as unknown as WorldCupMetadata;
}

export const footballWorldCup: CategoryDescriptor = {
  id: 'football-worldcup',
  dataSource: 'live',
  label: {
    en: 'FIFA World Cup 2026',
    de: 'Fußball-WM 2026',
    es: 'Mundial 2026',
  },
  blurb: {
    en: 'All 104 matches of the World Cup. Six models predicted every match before kick-off — the results are complete and the tournament is over.',
    de: 'Alle 104 Spiele der Weltmeisterschaft. Sechs Modelle haben jedes Spiel vor Anpfiff getippt – die Ergebnisse sind vollständig, das Turnier ist abgeschlossen.',
    es: 'Los 104 partidos del Mundial. Seis modelos predijeron cada partido antes del inicio; los resultados están completos y el torneo ha finalizado.',
  },
  question: {
    en: 'Score after 120 minutes (penalty shootouts excluded)',
    de: 'Endstand nach 120 Minuten (ohne Elfmeterschießen)',
    es: 'Resultado tras 120 minutos (sin tanda de penales)',
  },
  accent: '#34d399',
  // Kein Referenz-Teilnehmer möglich: Das Turnier ist beendet, nachträglich
  // Tipps einzutragen wäre Vorher-Wissen. Stattdessen eine deterministische
  // Referenzregel, deren Nachträglichkeit auf der Seite offengelegt wird.
  referenceRuleId: 'constant-1-0',
  predictionType: 'scoreline',
  metricIds: ['kicktipp-points', 'points-per-event', 'exact-acc', 'tendency-acc'],
  primaryMetric: 'kicktipp-points',

  eventTitle(event, locale) {
    const { home, away } = meta(event);
    const homeTla = home?.tla ?? '???';
    const awayTla = away?.tla ?? '???';
    return {
      primary: `${homeTla} – ${awayTla}`,
      secondary: `${teamName(home?.name, locale)} – ${teamName(away?.name, locale)}`,
      leading: [flagEmoji(home?.tla), flagEmoji(away?.tla)],
    };
  },

  groupOf(event, locale) {
    const { stage, group } = meta(event);
    if (group) return groupName(group, locale);
    return stageName(stage, locale);
  },
};

categories.register(footballWorldCup);
