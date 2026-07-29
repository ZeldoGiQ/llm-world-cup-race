/**
 * Der Prediction Score – die eine Währung der Plattform (SCORE_V1).
 *
 *   Score = 100 × (1 − Verlust(Modell) / Verlust(Referenz))
 *
 *   0 = so gut wie die dumme Referenz (Random-Walk, konstantes 1:0)
 *   100 = perfekt · negativ = schlechter als die Referenz
 *
 * Warum diese Form: Verlustquotienten sind skalenfrei – Kicktipp-Punkte,
 * absolute Fehler und Brier-Beiträge werden vergleichbar, weil die Einheit
 * sich herauskürzt. Die Referenz als Nulllinie macht die Zahl lesbar, ohne
 * ihre Herkunft zu verstecken. Kategorie-Score und Gesamtscore benutzen
 * DIESELBE Skala; der Gesamtscore aggregiert über das geometrische Mittel der
 * Quotienten (Standardform für Verhältniszahlen).
 *
 * Versionierung: Eine Änderung an dieser Definition ist SCORE_V2. Publizierte
 * V1-Werte werden niemals umgeschrieben – eine Zahl, die sich rückwirkend
 * ändert, zitiert niemand.
 *
 * Spuren: Der Score existiert je Erhebungs-Spur und wird nie über Spuren
 * hinweg gemischt. Die Spur ist über die Harness-Version jeder einzelnen
 * Vorhersage nachweisbar.
 */

export const SCORE_VERSION = 'SCORE_V1';

/** Erhebungs-Spuren. Reihenfolge = Anzeigereihenfolge des Spur-Schalters. */
export const TRACKS = [
  {
    id: 'knowledge-cap',
    /** Harness-Versionen, deren Vorhersagen in diese Spur zählen. */
    harnessVersions: ['HARNESS_V2'],
    live: true,
  },
  {
    id: 'web-search',
    harnessVersions: ['HARNESS_V3'],
    live: false,
  },
] as const;

export type TrackId = (typeof TRACKS)[number]['id'];

/** Kategorie-Ebene: ein Verlustquotient → Score. */
export function scoreFromLossRatio(ratio: number): number {
  return 100 * (1 - ratio);
}

/** Gesamt-Ebene: geometrisches Mittel der Quotienten → Score. */
export function scoreFromLossRatios(ratios: number[]): number | null {
  if (ratios.length === 0) return null;
  const meanLog = ratios.reduce((sum, ratio) => sum + Math.log(ratio), 0) / ratios.length;
  return 100 * (1 - Math.exp(meanLog));
}
