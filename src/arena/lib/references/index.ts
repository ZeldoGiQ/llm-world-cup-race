/**
 * Referenzregeln – die Messlatte, wenn es keinen Referenz-Teilnehmer mit
 * eigenen Vorhersagen gibt.
 *
 * Warum es beides braucht: Ein Referenz-Teilnehmer (Buchmacher-Konsens,
 * Random-Walk) liegt als Modell mit eigenen Zeilen in den Daten. Für eine
 * abgeschlossene Kategorie wie die Fußball-WM existiert so etwas nicht mehr –
 * nachträglich Vorhersagen einzutragen wäre genau der Betrug, den das Projekt
 * ausschließt. Eine Referenzregel löst das anders: sie ist eine Funktion, die
 * für jedes Event deterministisch dieselbe Vorhersage erzeugt („immer 1:0").
 * Damit entsteht kein Datensatz, der Vorher-Wissen behaupten würde, sondern
 * eine reproduzierbare Bezugslinie.
 *
 * Ehrlichkeitspflicht: Eine Regel, die erst NACH den ersten Ergebnissen
 * festgeschrieben wurde, muss `retroactive: true` tragen. Die Oberfläche zeigt
 * das an der Referenzzeile an – sonst würde eine im Nachhinein gewählte Latte
 * wie eine vorab vereinbarte aussehen.
 *
 * Wie jedes Plugin hier: neue Regel = neue Datei + register(). Kein Kern-Code
 * kennt eine konkrete Regel.
 */
import type { Localized } from '../i18n/locales';
import { Registry } from '../registry';
import type { ArenaEvent, PredictionTypeId, PredictionValue } from '../types';

export interface ReferenceRule {
  id: string;
  /** Anzeigename der Zeile, z. B. „Immer 1:0" */
  label: Localized<string>;
  /**
   * Begründung der Wahl UND Offenlegung ihrer Schwächen. Erscheint direkt an
   * der Referenzzeile, nicht in einer Fußnote.
   */
  note: Localized<string>;
  /**
   * true = die Regel wurde erst nach der ersten Auflösung festgeschrieben.
   * Muss sichtbar gemacht werden, weil eine nachträglich gewählte Referenz
   * die Höhe des Skill-Scores mitbestimmt.
   */
  retroactive?: boolean;
  appliesTo: PredictionTypeId[];
  /** Deterministische Vorhersage für ein Event; null = Regel nicht anwendbar. */
  predict(event: ArenaEvent): PredictionValue | null;
}

export const references = new Registry<ReferenceRule>('Referenzregel');
