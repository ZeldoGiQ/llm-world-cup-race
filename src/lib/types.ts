/**
 * Zentrale Typen der App.
 *
 * Status-Mapping football-data.org -> App (passiert in scripts/fetch-results.mjs):
 *   SCHEDULED, TIMED              -> UPCOMING
 *   IN_PLAY, PAUSED               -> LIVE
 *   FINISHED, AWARDED             -> FINISHED
 *   SUSPENDED, POSTPONED, CANCELLED -> OTHER (dezent anzeigen, nie werten)
 */
export type MatchStatus = 'UPCOMING' | 'LIVE' | 'FINISHED' | 'OTHER';

export interface Team {
  /** football-data.org Team-ID, null bei noch unbekannten K.-o.-Teilnehmern */
  id: number | null;
  name: string;
  /** FIFA-Dreibuchstaben-Code (z. B. GER), null wenn unbekannt */
  tla: string | null;
}

export interface Score {
  home: number | null;
  away: number | null;
}

export interface Match {
  /** Match-ID von football-data.org – Schlüssel für predictions.json */
  id: number;
  stage: string;
  /** Gruppenbuchstabe A–L, null in K.-o.-Runden */
  group: string | null;
  /** Anstoss in UTC (ISO-8601) – Anzeige immer lokalisiert */
  utcDate: string;
  status: MatchStatus;
  home: Team;
  away: Team;
  /** Reguläres Endergebnis (fullTime). Elfmeterschiessen wird ignoriert. */
  score: Score;
}

export interface MatchesFile {
  updatedAt: string;
  matches: Match[];
}

export interface Prediction {
  home: number;
  away: number;
  /** Abgabezeitpunkt – Basis für das Badge "getippt vor Anpfiff" */
  createdAt?: string;
}

/** modelId -> Tipp (fehlende Modelle sind erlaubt und werden als "—" angezeigt) */
export type MatchPredictions = Record<string, Prediction>;

export interface PredictionsFile {
  /** matchId (als String) -> Tipps pro Modell */
  predictions: Record<string, MatchPredictions>;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  /** Akzentfarbe für Avatar/Chips (Hex) */
  color: string;
}
