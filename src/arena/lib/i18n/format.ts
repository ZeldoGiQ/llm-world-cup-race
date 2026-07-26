/**
 * Locale-fähige Formatierung für die Arena.
 *
 * Ersetzt die auf Deutsch festgelegten Helfer des WM-Tippspiels
 * (formatKickoff/formatAgo/formatTimestamp), die dort bewusst unangetastet
 * bleiben. Alle Funktionen erhalten die Sprache explizit als Argument – es gibt
 * keinen globalen Zustand, damit Server-Rendering und Client identisch
 * formatieren und Komponenten testbar bleiben.
 */
import { INTL_LOCALE, type Locale } from './locales';

/** Intl-Objekte sind teuer zu erzeugen – pro Sprache/Optionen einmal anlegen. */
const numberCache = new Map<string, Intl.NumberFormat>();
const dateCache = new Map<string, Intl.DateTimeFormat>();

function numberFormatter(locale: Locale, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = numberCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(INTL_LOCALE[locale], options);
    numberCache.set(key, formatter);
  }
  return formatter;
}

function dateFormatter(locale: Locale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = dateCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(INTL_LOCALE[locale], options);
    dateCache.set(key, formatter);
  }
  return formatter;
}

/* ------------------------------------------------------------------ */
/* Zahlen                                                              */
/* ------------------------------------------------------------------ */

export function formatNumber(
  value: number,
  locale: Locale,
  options: Intl.NumberFormatOptions = { maximumFractionDigits: 2 },
): string {
  return numberFormatter(locale, options).format(value);
}

/** Feste Nachkommastellen – für Metrikwerte, damit Spalten ruhig stehen. */
export function formatFixed(value: number, locale: Locale, digits = 3): string {
  return numberFormatter(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Anteil (0..1) als Prozentwert. */
export function formatPercent(value: number, locale: Locale, digits = 1): string {
  return numberFormatter(locale, {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Ganzzahl mit Tausendertrennung. */
export function formatInteger(value: number, locale: Locale): string {
  return numberFormatter(locale, { maximumFractionDigits: 0 }).format(value);
}

/**
 * Feste Nachkommastellen mit explizitem Vorzeichen ausser bei Null.
 * Über Intl statt handgesetztem "+", damit die Vorzeichenstellung der jeweiligen
 * Sprache folgt.
 */
export function formatSigned(value: number, locale: Locale, digits = 3): string {
  return numberFormatter(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: 'exceptZero',
  }).format(value);
}

/* ------------------------------------------------------------------ */
/* Datum & Zeit                                                        */
/* ------------------------------------------------------------------ */

/** Kurzes Datum mit Wochentag, z. B. "Thu, Jun 11" / "Do., 11.06." */
export function formatDayShort(iso: string, locale: Locale, timeZone?: string): string {
  return dateFormatter(locale, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone,
  }).format(new Date(iso));
}

/** Nur Uhrzeit. */
export function formatTime(iso: string, locale: Locale, timeZone?: string): string {
  return dateFormatter(locale, { hour: '2-digit', minute: '2-digit', timeZone }).format(
    new Date(iso),
  );
}

/** Datum + Uhrzeit, kompakt. */
export function formatDateTime(iso: string, locale: Locale): string {
  return dateFormatter(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

/**
 * Datum ohne Uhrzeit, z. B. "Jun 11, 2026".
 *
 * Bewusst fest in UTC: Dieses Datum wird sowohl beim Bauen (Server, dort UTC) als
 * auch im Browser (Zeitzone des Besuchers) gerendert. Ohne feste Zone entstünde
 * an Tagesgrenzen ein Unterschied zwischen Server-HTML und Hydration.
 */
export function formatDate(iso: string, locale: Locale): string {
  return dateFormatter(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso));
}

/** Monat + Jahr für Gruppenüberschriften – ebenfalls UTC, siehe formatDate(). */
export function formatMonthYear(iso: string, locale: Locale): string {
  return dateFormatter(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(iso),
  );
}

/**
 * Ereigniszeitpunkt in der Zeitzone des Besuchers, plus UTC als neutrale
 * Referenz, wenn beide abweichen.
 *
 * Anders als im WM-Tippspiel wird bewusst NICHT Europe/Berlin als zweite Zone
 * gezeigt: Bei internationalem Publikum ist UTC die neutrale Bezugsgröße.
 */
export function formatEventTime(
  iso: string,
  locale: Locale,
): { local: string; utc: string | null } {
  const local = `${formatDayShort(iso, locale)} · ${formatTime(iso, locale)}`;
  const utc = `${formatDayShort(iso, locale, 'UTC')} · ${formatTime(iso, locale, 'UTC')}`;
  return { local, utc: utc === local ? null : utc };
}

/**
 * Verstrichene Zeit ("3 min ago" / "vor 3 Min." / "hace 3 min").
 * Nutzt Intl.RelativeTimeFormat, damit die Sprachlogik nicht nachgebaut werden muss.
 */
export function formatAgo(ms: number, locale: Locale): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const relative = new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: 'auto' });
  if (seconds < 60) return relative.format(-seconds, 'second');
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return relative.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return relative.format(-hours, 'hour');
  return relative.format(-Math.round(hours / 24), 'day');
}
