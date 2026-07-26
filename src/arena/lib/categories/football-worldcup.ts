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
import { flagEmoji, germanTeamName, stageLabel } from '../../../lib/format';
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

/**
 * Ergänzung zur geteilten Übersetzungstabelle in src/lib/format.ts: Diese drei
 * Schreibweisen liefert die Datenquelle abweichend, alle übrigen Teamnamen sind
 * im Deutschen identisch. Bewusst hier lokal statt im WM-Code ergänzt, damit der
 * Bestand unangetastet bleibt.
 */
const NAME_SUPPLEMENT: Record<string, string> = {
  'Bosnia-Herzegovina': 'Bosnien-Herzegowina',
  'Cape Verde Islands': 'Kap Verde',
  'Congo DR': 'DR Kongo',
};

function teamName(apiName: string | null | undefined): string {
  if (!apiName) return germanTeamName(apiName);
  return NAME_SUPPLEMENT[apiName] ?? germanTeamName(apiName);
}

export const footballWorldCup: CategoryDescriptor = {
  id: 'football-worldcup',
  label: 'Fussball-WM 2026',
  blurb:
    'Alle 104 Spiele der Weltmeisterschaft. Sechs Modelle haben jedes Spiel vor Anpfiff getippt – die Ergebnisse sind vollständig, das Turnier ist abgeschlossen.',
  question: 'Endstand nach 120 Minuten (ohne Elfmeterschiessen)',
  accent: '#34d399',
  predictionType: 'scoreline',
  metricIds: ['kicktipp-points', 'points-per-event', 'exact-acc', 'tendency-acc'],
  primaryMetric: 'kicktipp-points',

  eventTitle(event) {
    const { home, away } = meta(event);
    const homeTla = home?.tla ?? '???';
    const awayTla = away?.tla ?? '???';
    return {
      primary: `${homeTla} – ${awayTla}`,
      secondary: `${teamName(home?.name)} – ${teamName(away?.name)}`,
      leading: [flagEmoji(home?.tla), flagEmoji(away?.tla)],
    };
  },

  groupOf(event) {
    const { stage, group } = meta(event);
    if (group) return `Gruppe ${group}`;
    return stage ? stageLabel(stage) : 'Sonstige';
  },
};

categories.register(footballWorldCup);
