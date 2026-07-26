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
 */
import { Registry } from '../registry';
import type { ArenaEvent, PredictionTypeId } from '../types';

/** Beschriftung eines Events – von den Komponenten einheitlich gerendert. */
export interface EventTitle {
  /** Hauptzeile, z. B. "MEX – RSA" oder "S&P 500" */
  primary: string;
  /** Zusatzzeile, z. B. "Mexiko – Südafrika" oder "Wochenschluss" */
  secondary?: string;
  /** Voranstehende Symbole, z. B. Flaggen-Emojis */
  leading?: string[];
}

export interface CategoryDescriptor {
  id: string;
  /** Anzeigename, z. B. "Aktienindex" */
  label: string;
  /** Ein Satz für Kachel und Seitenkopf */
  blurb: string;
  /** Was genau vorhergesagt wird, z. B. "Schlusskurs am Freitag" */
  question: string;
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
  baselineNote?: string;
  /** Einheit für Zahlenwerte, z. B. "Indexpunkte" */
  unit?: string;

  eventTitle(event: ArenaEvent): EventTitle;
  /** Optionale Gruppierung in der Event-Liste (Phase, Liga, Monat …) */
  groupOf?(event: ArenaEvent): string;
}

export const categories = new Registry<CategoryDescriptor>('Kategorie');
