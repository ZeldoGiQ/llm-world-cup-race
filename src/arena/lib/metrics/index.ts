/**
 * Metrik-Registry – der Schlüssel für "beliebig um Metriken erweiterbar".
 *
 * Jede Metrik ist eine eigenständige, reine, getestete Einheit. Sie deklariert
 * selbst, für welche Vorhersage-Typen sie gilt (`appliesTo`), und ist damit
 * sofort in jeder Kategorie nutzbar, die ihre ID in `metricIds` aufnimmt –
 * ohne Änderung an Engine oder Komponenten.
 *
 * Beschriftungen sind mehrsprachig (`Localized`) und die Formatierung erhält die
 * Sprache explizit. Ein neues Plugin bleibt dadurch in einer Datei vollständig –
 * es gibt keinen zentralen Katalog, in dem Metrik-Texte nachgetragen werden müssen.
 */
import type { Locale, Localized } from '../i18n/locales';
import {
  formatFixed as formatFixedLocale,
  formatPercent as formatPercentLocale,
} from '../i18n/format';
import { Registry } from '../registry';
import type { ArenaModel, Sample } from '../types';

export interface MetricValue {
  value: number;
  /** Anzahl gewerteter Events – kleine Stichproben nie überinterpretieren. */
  n: number;
}

export interface MetricContext {
  /** Stichprobe des Baseline-Teilnehmers, auf dieselben Events beschränkt. */
  baselineSamples?: Sample[];
  baselineModel?: ArenaModel;
}

export interface Metric {
  id: string;
  /** Spaltenkopf – in allen Sprachen kurz halten. */
  label: Localized<string>;
  /** Erklärung für die Methodik-Seite (einzige Quelle, keine Doppelpflege). */
  description: Localized<string>;
  /** IDs der Vorhersage-Typen, für die die Metrik gilt; ['*'] = alle */
  appliesTo: string[];
  /** Braucht ein Baseline-Modell; ohne eines -> compute() gibt null. */
  requiresBaseline?: boolean;
  /** null, wenn nicht berechenbar (leere Stichprobe, fehlende Baseline). */
  compute(samples: Sample[], context?: MetricContext): MetricValue | null;
  /** Richtung für Ranking und Pfeil-Anzeige. */
  betterDirection: 'higher' | 'lower';
  format(value: MetricValue, locale: Locale): string;
}

export const metrics = new Registry<Metric>('Metrik');

/** Alle Metriken, die für einen Vorhersage-Typ in Frage kommen. */
export function metricsFor(predictionTypeId: string): Metric[] {
  return metrics
    .list()
    .filter((m) => m.appliesTo.includes('*') || m.appliesTo.includes(predictionTypeId));
}

/* ------------------------------------------------------------------ */
/* Gemeinsame Helfer                                                   */
/* ------------------------------------------------------------------ */

/** Mittelwert; leere Liste -> null (nie NaN nach aussen geben). */
export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/** Anteil (0..1) als Prozentwert in der jeweiligen Sprache. */
export function formatPercent(value: number, locale: Locale, digits = 1): string {
  return formatPercentLocale(value, locale, digits);
}

/** Feste Dezimalstellen in der jeweiligen Sprache. */
export function formatFixed(value: number, locale: Locale, digits = 3): string {
  return formatFixedLocale(value, locale, digits);
}

/**
 * Reduziert Samples auf die Paare, deren Vorhersage UND Ergebnis denselben
 * `kind` haben. Schützt gegen gemischte/kaputte Daten aus JSON.
 */
export function samplesOfKind<K extends Sample['prediction']['kind']>(
  samples: Sample[],
  kind: K,
): Array<{
  prediction: Extract<Sample['prediction'], { kind: K }>;
  resolution: Extract<Sample['resolution'], { kind: K }>;
}> {
  const out: Array<{ prediction: never; resolution: never }> = [];
  for (const s of samples) {
    if (s.prediction.kind === kind && s.resolution.kind === kind) {
      out.push({ prediction: s.prediction as never, resolution: s.resolution as never });
    }
  }
  return out as never;
}
