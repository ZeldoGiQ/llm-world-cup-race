/**
 * PredictionType-Registry.
 *
 * Ein Handler kapselt alles, was von der Form eines Vorhersagewerts abhängt:
 * Validierung (Daten kommen aus JSON und sind zur Laufzeit `unknown`), Parsing
 * aus einer CSV-Zelle und Formatierung für die Anzeige.
 *
 * Bewusst NICHT hier: welche Metriken zu einem Typ passen. Das deklarieren die
 * Metriken selbst über `appliesTo` – eine Quelle der Wahrheit statt doppelter
 * Buchführung an beiden Enden.
 *
 * Alle anzeigenden Funktionen erhalten die Sprache explizit, damit Zahlen und
 * Texte je Locale korrekt erscheinen (1,234.5 vs. 1.234,5).
 */
import type { Locale, Localized } from '../i18n/locales';
import { Registry } from '../registry';
import type { PredictionValue, Resolution } from '../types';

/**
 * Wie gut lag ein einzelner Tipp? Bewusst grobe Stufen statt Zahlen, damit die
 * Event-Liste über alle Vorhersage-Typen hinweg einheitlich einfärben kann.
 */
export type OutcomeQuality = 'exact' | 'close' | 'fair' | 'miss';

export interface OutcomeDescription {
  /** Kurzlabel, z. B. '+4', 'Δ 12.40', '✓ 0.04' */
  label: string;
  quality: OutcomeQuality;
  /** Ausführliche Erklärung für den Tooltip */
  detail: string;
}

export interface PredictionTypeHandler {
  id: string;
  /** Klartext für Methodik-Seite und Tooltips */
  label: Localized<string>;
  /** Erwartetes Zellformat für den späteren CSV-Import, z. B. '2-1' */
  cellHint: string;

  /** Type-Guard für aus JSON geladene Werte. */
  validate(value: unknown): value is PredictionValue;
  /** Type-Guard für ein aufgelöstes Ergebnis. */
  validateResolution(value: unknown): value is Resolution;
  /** CSV-Zelle -> Wert; null bei ungültiger Eingabe (nie werfen). */
  parseCell(cell: string): PredictionValue | null;

  formatValue(value: PredictionValue, locale: Locale): string;
  formatResolution(resolution: Resolution, locale: Locale): string;

  /**
   * Bewertung eines Tipps gegen das Ergebnis für die Anzeige.
   * null, wenn Typ von Tipp und Ergebnis nicht zusammenpassen.
   */
  describeOutcome(
    prediction: PredictionValue,
    resolution: Resolution,
    locale: Locale,
  ): OutcomeDescription | null;
}

export const predictionTypes = new Registry<PredictionTypeHandler>('PredictionType');

/** Zahl-Guard, der NaN und Infinity ausschliesst (JSON kann beides liefern). */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Ganzzahl >= 0 – für Tore/Score-Werte. */
export function isGoalCount(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}
