/**
 * Sprachen der Arena.
 *
 * Englisch ist Standard und läuft ohne URL-Präfix; Deutsch und Spanisch sind die
 * Alternativsprachen mit Präfix. Bewusst ohne Astros eingebaute i18n-Konfiguration,
 * weil astro.config.mjs zum unangetasteten WM-Bestand gehört – die Lokalisierung
 * läuft daher allein über Dateirouten unter src/pages/arena/.
 */
export const LOCALES = ['en', 'de', 'es'] as const;
export type Locale = (typeof LOCALES)[number];

/** Standardsprache – ohne Präfix erreichbar. */
export const DEFAULT_LOCALE: Locale = 'en';

/** Sprachen mit URL-Präfix (alles außer der Standardsprache). */
export const PREFIXED_LOCALES = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);

/** Eigenbezeichnung für den Sprachumschalter – immer in der jeweiligen Sprache. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
};

/** Kurzform für kompakte Umschalter. */
export const LOCALE_SHORT: Record<Locale, string> = { en: 'EN', de: 'DE', es: 'ES' };

/** BCP-47-Tags für Intl-APIs und das lang-Attribut. */
export const INTL_LOCALE: Record<Locale, string> = {
  en: 'en-US',
  de: 'de-DE',
  es: 'es-ES',
};

/** og:locale erwartet Unterstrich-Schreibweise. */
export const OG_LOCALE: Record<Locale, string> = {
  en: 'en_US',
  de: 'de_DE',
  es: 'es_ES',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Ein Text in allen Sprachen. */
export type Localized<T = string> = Record<Locale, T>;

/**
 * Wert für eine Sprache holen, mit Rückfall auf die Standardsprache.
 * Fehlende Übersetzungen führen so nie zu leeren Stellen in der Oberfläche.
 */
export function pick<T>(value: Localized<T>, locale: Locale): T {
  return value[locale] ?? value[DEFAULT_LOCALE];
}

/* ------------------------------------------------------------------ */
/* Pfade                                                               */
/* ------------------------------------------------------------------ */

/**
 * Absolute Basis-Adresse für canonical- und hreflang-Angaben.
 *
 * Eigene Konstante, weil `site` in astro.config.mjs nicht gesetzt ist und die
 * Datei zum unangetasteten WM-Bestand gehört – `Astro.site` wäre deshalb
 * undefined. Suchmaschinen erwarten bei hreflang absolute URLs.
 */
export const ARENA_ORIGIN = 'https://www.futurebench.ai';

/**
 * Pfadsegmente, die keine Kategorie-ID sein dürfen.
 *
 * Hintergrund: `/arena/<segment>` wird sowohl von der Kategorie-Route als auch
 * von den Sprach- und Methodik-Routen bedient. Hieße eine Kategorie „de" oder
 * „methodology", würde eine der Seiten still überschrieben – Astro warnt dabei
 * nicht zuverlässig. Deshalb wird die Kollision beim Bauen aktiv abgewiesen.
 */
export const RESERVED_PATH_SEGMENTS: readonly string[] = [
  ...LOCALES,
  'methodology',
  // Neue feste Seiten und der Share-Endpunkt – eine Kategorie mit diesen IDs
  // würde die jeweilige Route still überschreiben.
  'proof',
  'models',
  'share',
  'leaderboards',
  'imprint',
  'privacy',
];

/** Wirft, wenn eine Kategorie-ID mit einem reservierten Segment kollidiert. */
export function assertNoReservedCategoryId(id: string): void {
  if (RESERVED_PATH_SEGMENTS.includes(id)) {
    throw new Error(
      `Kategorie-ID "${id}" kollidiert mit einem reservierten Pfadsegment ` +
        `(${RESERVED_PATH_SEGMENTS.join(', ')}). Bitte umbenennen, sonst überschreiben sich ` +
        `/arena/${id} und die gleichnamige Sprach- bzw. Methodik-Seite.`,
    );
  }
}

/** '' für Englisch, '/de' bzw. '/es' für die Alternativsprachen. */
export function localePrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '' : `/${locale}`;
}

/**
 * Baut einen Arena-Pfad.
 *   arenaPath('en')                    -> '/arena'
 *   arenaPath('de')                    -> '/arena/de'
 *   arenaPath('es', 'methodology')     -> '/arena/es/methodology'
 *   arenaPath('en', 'stocks-index')    -> '/arena/stocks-index'
 */
export function arenaPath(locale: Locale, sub = ''): string {
  const tail = sub ? `/${sub}` : '';
  return `/arena${localePrefix(locale)}${tail}`;
}

/** Absolute Adresse – für canonical, hreflang und og:url. */
export function arenaUrl(locale: Locale, sub = ''): string {
  return `${ARENA_ORIGIN}${arenaPath(locale, sub)}`;
}

/* ------------------------------------------------------------------ */
/* Modellnamen                                                         */
/* ------------------------------------------------------------------ */

/**
 * Anzeigename eines Teilnehmers.
 *
 * Echte Sprachmodelle tragen Eigennamen („Claude Fable 5"), die nie übersetzt
 * werden. Referenz-Teilnehmer sind dagegen Begriffe („Random walk") und liefern
 * deshalb Übersetzungen mit. Fehlt eine, greift der kanonische Name.
 */
export function modelName(
  model: { name: string; names?: Partial<Record<Locale, string>> },
  locale: Locale,
): string {
  return model.names?.[locale] ?? model.name;
}

/** Anbieter eines Teilnehmers, analog zu modelName(). */
export function modelProvider(
  model: { provider: string; providers?: Partial<Record<Locale, string>> },
  locale: Locale,
): string {
  return model.providers?.[locale] ?? model.provider;
}
