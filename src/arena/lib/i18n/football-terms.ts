/**
 * Lokalisiertes Fußball-Vokabular für die WM-Kategorie.
 *
 * Das WM-Tippspiel hat eigene, ausschließlich deutsche Helfer (`germanTeamName`,
 * `stageLabel`). Die bleiben unangetastet – die Arena braucht dieselben Begriffe
 * in drei Sprachen und hält sie deshalb hier.
 *
 * Englisch entspricht der Schreibweise der Datenquelle, mit wenigen Korrekturen
 * dort, wo die Quelle unüblich schreibt (etwa "Congo DR" statt "DR Congo").
 */
import type { Locale } from './locales';
import { DEFAULT_LOCALE } from './locales';

/**
 * Teamnamen je Sprache. Schlüssel ist der Name aus der Datenquelle.
 * Fehlt ein Eintrag, wird der Quellname unverändert angezeigt – so führt ein
 * neuer Teilnehmer nie zu einer leeren Zelle.
 */
const TEAM_NAMES: Record<string, Partial<Record<Locale, string>>> = {
  Algeria: { en: 'Algeria', de: 'Algerien', es: 'Argelia' },
  Argentina: { en: 'Argentina', de: 'Argentinien', es: 'Argentina' },
  Australia: { en: 'Australia', de: 'Australien', es: 'Australia' },
  Austria: { en: 'Austria', de: 'Österreich', es: 'Austria' },
  Belgium: { en: 'Belgium', de: 'Belgien', es: 'Bélgica' },
  'Bosnia-Herzegovina': {
    en: 'Bosnia and Herzegovina',
    de: 'Bosnien-Herzegowina',
    es: 'Bosnia y Herzegovina',
  },
  Brazil: { en: 'Brazil', de: 'Brasilien', es: 'Brasil' },
  Canada: { en: 'Canada', de: 'Kanada', es: 'Canadá' },
  'Cape Verde Islands': { en: 'Cape Verde', de: 'Kap Verde', es: 'Cabo Verde' },
  Colombia: { en: 'Colombia', de: 'Kolumbien', es: 'Colombia' },
  'Congo DR': { en: 'DR Congo', de: 'DR Kongo', es: 'RD del Congo' },
  Croatia: { en: 'Croatia', de: 'Kroatien', es: 'Croacia' },
  Curaçao: { en: 'Curaçao', de: 'Curaçao', es: 'Curazao' },
  Czechia: { en: 'Czechia', de: 'Tschechien', es: 'Chequia' },
  Ecuador: { en: 'Ecuador', de: 'Ecuador', es: 'Ecuador' },
  Egypt: { en: 'Egypt', de: 'Ägypten', es: 'Egipto' },
  England: { en: 'England', de: 'England', es: 'Inglaterra' },
  France: { en: 'France', de: 'Frankreich', es: 'Francia' },
  Germany: { en: 'Germany', de: 'Deutschland', es: 'Alemania' },
  Ghana: { en: 'Ghana', de: 'Ghana', es: 'Ghana' },
  Haiti: { en: 'Haiti', de: 'Haiti', es: 'Haití' },
  Iran: { en: 'Iran', de: 'Iran', es: 'Irán' },
  Iraq: { en: 'Iraq', de: 'Irak', es: 'Irak' },
  'Ivory Coast': { en: 'Ivory Coast', de: 'Elfenbeinküste', es: 'Costa de Marfil' },
  Japan: { en: 'Japan', de: 'Japan', es: 'Japón' },
  Jordan: { en: 'Jordan', de: 'Jordanien', es: 'Jordania' },
  Mexico: { en: 'Mexico', de: 'Mexiko', es: 'México' },
  Morocco: { en: 'Morocco', de: 'Marokko', es: 'Marruecos' },
  Netherlands: { en: 'Netherlands', de: 'Niederlande', es: 'Países Bajos' },
  'New Zealand': { en: 'New Zealand', de: 'Neuseeland', es: 'Nueva Zelanda' },
  Norway: { en: 'Norway', de: 'Norwegen', es: 'Noruega' },
  Panama: { en: 'Panama', de: 'Panama', es: 'Panamá' },
  Paraguay: { en: 'Paraguay', de: 'Paraguay', es: 'Paraguay' },
  Portugal: { en: 'Portugal', de: 'Portugal', es: 'Portugal' },
  Qatar: { en: 'Qatar', de: 'Katar', es: 'Catar' },
  'Saudi Arabia': { en: 'Saudi Arabia', de: 'Saudi-Arabien', es: 'Arabia Saudí' },
  Scotland: { en: 'Scotland', de: 'Schottland', es: 'Escocia' },
  Senegal: { en: 'Senegal', de: 'Senegal', es: 'Senegal' },
  'South Africa': { en: 'South Africa', de: 'Südafrika', es: 'Sudáfrica' },
  'South Korea': { en: 'South Korea', de: 'Südkorea', es: 'Corea del Sur' },
  Spain: { en: 'Spain', de: 'Spanien', es: 'España' },
  Sweden: { en: 'Sweden', de: 'Schweden', es: 'Suecia' },
  Switzerland: { en: 'Switzerland', de: 'Schweiz', es: 'Suiza' },
  Tunisia: { en: 'Tunisia', de: 'Tunesien', es: 'Túnez' },
  Turkey: { en: 'Türkiye', de: 'Türkei', es: 'Turquía' },
  'United States': { en: 'United States', de: 'USA', es: 'Estados Unidos' },
  Uruguay: { en: 'Uruguay', de: 'Uruguay', es: 'Uruguay' },
  Uzbekistan: { en: 'Uzbekistan', de: 'Usbekistan', es: 'Uzbekistán' },
  TBD: { en: 'To be decided', de: 'Noch offen', es: 'Por definir' },
};

export function teamName(sourceName: string | null | undefined, locale: Locale): string {
  if (!sourceName) return TEAM_NAMES.TBD![locale] ?? TEAM_NAMES.TBD![DEFAULT_LOCALE]!;
  const entry = TEAM_NAMES[sourceName];
  return entry?.[locale] ?? entry?.[DEFAULT_LOCALE] ?? sourceName;
}

/** Turnierphasen der WM. */
const STAGE_LABELS: Record<string, Record<Locale, string>> = {
  GROUP_STAGE: { en: 'Group stage', de: 'Gruppenphase', es: 'Fase de grupos' },
  LAST_32: { en: 'Round of 32', de: 'Sechzehntelfinale', es: 'Dieciseisavos de final' },
  LAST_16: { en: 'Round of 16', de: 'Achtelfinale', es: 'Octavos de final' },
  ROUND_OF_16: { en: 'Round of 16', de: 'Achtelfinale', es: 'Octavos de final' },
  QUARTER_FINALS: { en: 'Quarter-finals', de: 'Viertelfinale', es: 'Cuartos de final' },
  SEMI_FINALS: { en: 'Semi-finals', de: 'Halbfinale', es: 'Semifinales' },
  THIRD_PLACE: { en: 'Third-place play-off', de: 'Spiel um Platz 3', es: 'Tercer puesto' },
  FINAL: { en: 'Final', de: 'Finale', es: 'Final' },
};

export function stageName(stage: string | null | undefined, locale: Locale): string {
  if (!stage) return '';
  const entry = STAGE_LABELS[stage];
  if (entry) return entry[locale] ?? entry[DEFAULT_LOCALE];
  // Unbekannte Phase lesbar machen statt SCREAMING_SNAKE_CASE zu zeigen.
  const pretty = stage.toLowerCase().replace(/_/g, ' ');
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

/** "Group A" / "Gruppe A" / "Grupo A" */
const GROUP_WORD: Record<Locale, string> = { en: 'Group', de: 'Gruppe', es: 'Grupo' };

export function groupName(group: string, locale: Locale): string {
  return `${GROUP_WORD[locale] ?? GROUP_WORD[DEFAULT_LOCALE]} ${group}`;
}

/** Zusätze zum Spielverlauf – erscheinen am Ergebnis. */
export const MATCH_DURATION_LABELS: Record<'EXTRA_TIME' | 'PENALTY_SHOOTOUT', Record<Locale, string>> =
  {
    EXTRA_TIME: { en: 'a.e.t.', de: 'n. V.', es: 'tras la prórroga' },
    PENALTY_SHOOTOUT: { en: 'pens', de: 'i. E.', es: 'en penales' },
  };
