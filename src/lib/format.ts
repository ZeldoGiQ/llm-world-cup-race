import type { PointsCategory } from './scoring';
import type { MatchStatus, Model } from './types';

/** Deutsche Bezeichnungen der Punkt-Kategorien (Tooltips, Badges). */
export const CATEGORY_LABELS: Record<PointsCategory, string> = {
  exact: 'exaktes Ergebnis',
  goalDiff: 'richtige Tordifferenz',
  tendency: 'richtige Tendenz',
  none: 'daneben',
};

/* ------------------------------------------------------------------ */
/* Flaggen: FIFA-Dreibuchstaben-Code (TLA) -> ISO-3166-alpha-2 -> Emoji */
/* ------------------------------------------------------------------ */

const TLA_TO_ISO2: Record<string, string> = {
  // Nord-/Mittel-/Südamerika
  USA: 'US', MEX: 'MX', CAN: 'CA', ARG: 'AR', BRA: 'BR', URU: 'UY', PAR: 'PY',
  CHI: 'CL', COL: 'CO', PER: 'PE', ECU: 'EC', VEN: 'VE', BOL: 'BO', CRC: 'CR',
  PAN: 'PA', HON: 'HN', GUA: 'GT', SLV: 'SV', JAM: 'JM', HAI: 'HT', CUW: 'CW',
  TRI: 'TT', SUR: 'SR', NCA: 'NI', CUB: 'CU', DOM: 'DO',
  // Europa
  GER: 'DE', FRA: 'FR', ESP: 'ES', POR: 'PT', NED: 'NL', BEL: 'BE', ITA: 'IT',
  SUI: 'CH', AUT: 'AT', POL: 'PL', CZE: 'CZ', SVK: 'SK', SVN: 'SI', HUN: 'HU',
  ROU: 'RO', BUL: 'BG', GRE: 'GR', TUR: 'TR', UKR: 'UA', NOR: 'NO', SWE: 'SE',
  DEN: 'DK', FIN: 'FI', ISL: 'IS', IRL: 'IE', ALB: 'AL', BIH: 'BA', MKD: 'MK',
  MNE: 'ME', SRB: 'RS', CRO: 'HR', GEO: 'GE', ARM: 'AM', AZE: 'AZ', ISR: 'IL',
  LUX: 'LU', LTU: 'LT', EST: 'EE', LVA: 'LV', CYP: 'CY', MLT: 'MT',
  // Afrika
  MAR: 'MA', TUN: 'TN', ALG: 'DZ', EGY: 'EG', NGA: 'NG', GHA: 'GH', SEN: 'SN',
  CIV: 'CI', CMR: 'CM', MLI: 'ML', BFA: 'BF', CPV: 'CV', RSA: 'ZA', COD: 'CD',
  GAB: 'GA', GUI: 'GN', ZAM: 'ZM', ZIM: 'ZW', KEN: 'KE', TAN: 'TZ', UGA: 'UG',
  MOZ: 'MZ', BEN: 'BJ', TOG: 'TG', LBY: 'LY', SDN: 'SD', ETH: 'ET', ANG: 'AO',
  NAM: 'NA', GNB: 'GW', EQG: 'GQ', MTN: 'MR', MAD: 'MG', COM: 'KM', BDI: 'BI',
  RWA: 'RW',
  // Asien & Ozeanien
  JPN: 'JP', KOR: 'KR', PRK: 'KP', CHN: 'CN', AUS: 'AU', NZL: 'NZ', KSA: 'SA',
  IRN: 'IR', IRQ: 'IQ', UAE: 'AE', QAT: 'QA', JOR: 'JO', UZB: 'UZ', IDN: 'ID',
  IND: 'IN', THA: 'TH', VIE: 'VN', MAS: 'MY', SGP: 'SG', PHI: 'PH', BHR: 'BH',
  KUW: 'KW', OMA: 'OM', SYR: 'SY', LBN: 'LB', PLE: 'PS', TPE: 'TW', HKG: 'HK',
  KGZ: 'KG', TJK: 'TJ', TKM: 'TM', AFG: 'AF', BAN: 'BD', SRI: 'LK', NEP: 'NP',
  MYA: 'MM', FIJ: 'FJ', PNG: 'PG', SOL: 'SB', TAH: 'PF', NCL: 'NC', VAN: 'VU',
  SAM: 'WS', TGA: 'TO',
};

// England/Schottland/Wales haben eigene Emoji-Flaggen (Unicode-Tag-Sequenzen)
const SPECIAL_FLAGS: Record<string, string> = {
  ENG: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  SCO: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  WAL: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}',
};

/** Flaggen-Emoji aus FIFA-TLA; Fallback ⚽ für unbekannte/offene Teams. */
export function flagEmoji(tla: string | null | undefined): string {
  if (!tla) return '⚽';
  const code = tla.toUpperCase();
  if (SPECIAL_FLAGS[code]) return SPECIAL_FLAGS[code];
  const iso = TLA_TO_ISO2[code] ?? (code.length === 2 ? code : null);
  if (!iso) return '⚽';
  // Regional Indicator Symbols: 'A' (65) -> U+1F1E6
  return iso.replace(/./g, (c) => String.fromCodePoint(0x1f1a5 + c.charCodeAt(0)));
}

/* ------------------------------------------------------------------ */
/* Deutsche Teamnamen (API liefert englische Namen)                    */
/* ------------------------------------------------------------------ */

const GERMAN_TEAM_NAMES: Record<string, string> = {
  Germany: 'Deutschland', France: 'Frankreich', Spain: 'Spanien', Italy: 'Italien',
  Netherlands: 'Niederlande', Belgium: 'Belgien', Switzerland: 'Schweiz',
  Austria: 'Österreich', Croatia: 'Kroatien', Serbia: 'Serbien', Poland: 'Polen',
  Czechia: 'Tschechien', 'Czech Republic': 'Tschechien', Slovakia: 'Slowakei',
  Slovenia: 'Slowenien', Hungary: 'Ungarn', Romania: 'Rumänien',
  Bulgaria: 'Bulgarien', Greece: 'Griechenland', Turkey: 'Türkei',
  Türkiye: 'Türkei', Norway: 'Norwegen', Sweden: 'Schweden', Denmark: 'Dänemark',
  Finland: 'Finnland', Iceland: 'Island', Ireland: 'Irland', Albania: 'Albanien',
  'Bosnia and Herzegovina': 'Bosnien-Herzegowina', 'North Macedonia': 'Nordmazedonien',
  England: 'England', Scotland: 'Schottland', Wales: 'Wales', Portugal: 'Portugal',
  Mexico: 'Mexiko', Canada: 'Kanada', 'United States': 'USA', USA: 'USA',
  Brazil: 'Brasilien', Argentina: 'Argentinien', Colombia: 'Kolumbien',
  Bolivia: 'Bolivien', 'Costa Rica': 'Costa Rica', Jamaica: 'Jamaika',
  Curaçao: 'Curaçao', 'Trinidad and Tobago': 'Trinidad und Tobago',
  'South Africa': 'Südafrika', Morocco: 'Marokko', Tunisia: 'Tunesien',
  Algeria: 'Algerien', Egypt: 'Ägypten', 'Ivory Coast': 'Elfenbeinküste',
  "Côte d'Ivoire": 'Elfenbeinküste', Cameroon: 'Kamerun',
  'Cape Verde': 'Kap Verde', 'Cabo Verde': 'Kap Verde', 'DR Congo': 'DR Kongo',
  Japan: 'Japan', 'South Korea': 'Südkorea', 'Korea Republic': 'Südkorea',
  Australia: 'Australien', 'New Zealand': 'Neuseeland',
  'Saudi Arabia': 'Saudi-Arabien', Iraq: 'Irak', Qatar: 'Katar',
  Jordan: 'Jordanien', Uzbekistan: 'Usbekistan', Indonesia: 'Indonesien',
  Russia: 'Russland', TBD: 'Noch offen',
};

/** Anzeigename auf Deutsch, Fallback = API-Name. */
export function germanTeamName(apiName: string | null | undefined): string {
  if (!apiName) return 'Noch offen';
  return GERMAN_TEAM_NAMES[apiName] ?? apiName;
}

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: 'Gruppenphase',
  LAST_32: 'Sechzehntelfinale',
  ROUND_OF_32: 'Sechzehntelfinale',
  LAST_16: 'Achtelfinale',
  ROUND_OF_16: 'Achtelfinale',
  QUARTER_FINALS: 'Viertelfinale',
  QUARTER_FINAL: 'Viertelfinale',
  SEMI_FINALS: 'Halbfinale',
  SEMI_FINAL: 'Halbfinale',
  THIRD_PLACE: 'Spiel um Platz 3',
  THIRD_PLACE_PLAYOFF: 'Spiel um Platz 3',
  FINAL: 'Finale',
};

/** Deutsche Phasen-Bezeichnung; unbekannte Stages werden lesbar formatiert. */
export function stageLabel(stage: string): string {
  if (STAGE_LABELS[stage]) return STAGE_LABELS[stage];
  const pretty = stage.toLowerCase().replace(/_/g, ' ');
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

export const STATUS_LABELS: Record<MatchStatus, string> = {
  UPCOMING: 'Anstehend',
  LIVE: 'Live',
  FINISHED: 'Beendet',
  OTHER: 'Verschoben/abgesagt',
};

/* ------------------------------------------------------------------ */
/* Zeit & Datum (intern UTC, Anzeige lokal + Europe/Berlin)            */
/* ------------------------------------------------------------------ */

function kickoffString(date: Date, timeZone?: string): string {
  const day = new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone,
  }).format(date);
  const time = new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date);
  return `${day} · ${time}`;
}

/**
 * Anstosszeit in der Zeitzone des Besuchers; falls abweichend zusätzlich
 * Europe/Berlin (Zielgruppe DACH).
 */
export function formatKickoff(utcDate: string): { local: string; berlin: string | null } {
  const date = new Date(utcDate);
  const local = kickoffString(date);
  const berlin = kickoffString(date, 'Europe/Berlin');
  return { local, berlin: berlin === local ? null : berlin };
}

/** Kurzes Datum "Do., 11.06." (lokal oder gegebene Zeitzone). */
export function formatDayShort(utcDate: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone,
  }).format(new Date(utcDate));
}

/** Nur die Uhrzeit (lokal), z. B. für kompakte Spielplan-Zeilen. */
export function formatTime(utcDate: string): string {
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(utcDate),
  );
}

/** Tagesüberschrift für den Spielplan (lokale Zeitzone des Besuchers). */
export function formatDateHeading(utcDate: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(utcDate));
}

/** Datenstand-Tooltip, z. B. "11.06.2026, 20:05". */
export function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

/** "vor 12 s" / "vor 3 min" / "vor 2 h" für den Aktualisiert-Chip. */
export function formatAgo(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `vor ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `vor ${minutes} min`;
  return `vor ${Math.round(minutes / 60)} h`;
}

/* ------------------------------------------------------------------ */
/* Modell-Avatare (Initialen auf farbigem Kreis, keine Logo-Dateien)   */
/* ------------------------------------------------------------------ */

/** Initialen aus dem Modellnamen: "Gemini 3 Pro" -> "G3", "Grok 4" -> "G4". */
export function modelInitials(name: string): string {
  const tokens = name.split(/[\s-]+/).filter(Boolean);
  if (tokens.length === 0) return '?';
  const first = tokens[0]!.charAt(0);
  const second = tokens.length > 1 ? tokens[1]!.charAt(0) : (tokens[0]!.charAt(1) ?? '');
  return (first + second).toUpperCase();
}

/** Lesbare Textfarbe (hell/dunkel) für einen farbigen Avatar-Hintergrund. */
export function avatarTextColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  if (hex.length < 6) return '#0a0c10';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  // relative Luminanz (vereinfacht) – hell genug -> dunkler Text
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#0a0c10' : '#f2f4f9';
}

/** Anzeigeformat eines Tipps/Ergebnisses: 2:1 (deutsche Konvention). */
export function formatScore(home: number, away: number): string {
  return `${home}:${away}`;
}

export function modelById(models: Model[], id: string): Model | undefined {
  return models.find((m) => m.id === id);
}
