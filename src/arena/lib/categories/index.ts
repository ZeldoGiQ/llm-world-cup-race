/**
 * Kategorie-Registry – komponiert Vorhersage-Typ und Metriken zu einer Domäne.
 *
 * Ein Deskriptor sagt: "Ich bin Aktien, meine Vorhersagen sind Zahlen, meine
 * Spalten sind MAE/MAPE/Skill, gerankt wird nach MAE, meine Baseline ist der
 * Random-Walk – und so beschriftet man eines meiner Events."
 *
 * Deskriptoren liefern bewusst **strukturierte Daten statt React-Knoten**
 * (`EventTitle`). So bleibt die gesamte lib-Schicht frei von UI-Abhängigkeiten,
 * ist ohne DOM testbar, und die Darstellung entscheiden allein die Komponenten.
 *
 * Alle Texte sind mehrsprachig; textbildende Funktionen erhalten die Sprache.
 */
import type { Locale, Localized } from '../i18n/locales';
import { Registry } from '../registry';
import type { ArenaEvent, PredictionTypeId } from '../types';

/** Beschriftung eines Events – von den Komponenten einheitlich gerendert. */
export interface EventTitle {
  /** Hauptzeile, z. B. "MEX – RSA" oder "S&P 500" */
  primary: string;
  /** Zusatzzeile, z. B. "Mexico – South Africa" oder "Weekly close" */
  secondary?: string;
  /** Voranstehende Symbole, z. B. Flaggen-Emojis */
  leading?: string[];
}

export interface CategoryDescriptor {
  id: string;
  /**
   * Echte Daten oder Beispieldaten?
   *
   * Pflichtfeld ohne Standardwert – Absicht: Wer eine Kategorie anlegt und die
   * Angabe vergisst, bekommt einen Typfehler statt stillschweigend als „echt"
   * zu gelten. Beispieldaten zählen in keine Kennzahl der Startseite und in
   * keine Gesamtwertung. Eine Deklaration als `live` wird zusätzlich von
   * `classifyCategoryData()` gegengeprüft und bei Indizien abgestuft.
   */
  dataSource: 'live' | 'example';
  /** Anzeigename, z. B. "Stock index" */
  label: Localized<string>;
  /** Ein Satz für Kachel und Seitenkopf */
  blurb: Localized<string>;
  /** Was genau vorhergesagt wird, z. B. "Friday closing price" */
  question: Localized<string>;
  /** Akzentfarbe der Kategorie (Hex) */
  accent: string;
  predictionType: PredictionTypeId;
  /** Metrik-IDs = Tabellenspalten in Anzeigereihenfolge */
  metricIds: string[];
  /** Metrik, nach der gerankt wird (muss in metricIds stehen) */
  primaryMetric: string;
  /** Modell-ID des Referenz-Teilnehmers für den Skill-Score */
  baselineModelId?: string;
  /** Erläuterung der Baseline für die Methodik-Seite */
  baselineNote?: Localized<string>;
  /**
   * Referenzregel statt Referenz-Teilnehmer (`src/arena/lib/references/`).
   *
   * Für abgeschlossene Kategorien, in denen niemand mehr Vorhersagen abgeben
   * kann: eine deterministische Funktion erzeugt die Bezugslinie, ohne dass
   * nachträglich Daten in die Dateien geschrieben werden müssten.
   */
  referenceRuleId?: string;
  /** Einheit für Zahlenwerte, z. B. "index points" */
  unit?: Localized<string>;

  eventTitle(event: ArenaEvent, locale: Locale): EventTitle;
  /** Optionale Gruppierung in der Event-Liste (Phase, Liga, Monat …) */
  groupOf?(event: ArenaEvent, locale: Locale): string;
}

export const categories = new Registry<CategoryDescriptor>('Kategorie');
