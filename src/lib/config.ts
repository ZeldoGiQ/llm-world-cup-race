/**
 * Punktwerte nach Kicktipp-Schema – zentral konfigurierbar.
 * Gewertet werden ausschliesslich Spiele mit Status FINISHED.
 */
export const SCORING = {
  /** exaktes Ergebnis */
  exact: 4,
  /** richtige Tordifferenz (kein Remis, nicht exakt) */
  goalDiff: 3,
  /** richtige Tendenz (Sieg/Remis/Niederlage) */
  tendency: 2,
} as const;

export type ScoringConfig = { exact: number; goalDiff: number; tendency: number };

/** Auto-Refresh-Intervall des Clients */
export const POLL_INTERVAL_MS = 90_000;

/** Max. Anzahl Spiele in der Sektion "Live & als Nächstes" */
export const MAX_SPOTLIGHT_MATCHES = 6;
