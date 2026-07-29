/**
 * Referenzregel „immer 1:0" für Ergebnistipps.
 *
 * 1:0 ist das häufigste Ergebnis der WM-Geschichte vor 2026 – die Regel lässt
 * sich also aus Daten begründen, die vor dem Turnier vorlagen. Genau darauf
 * kommt es an: Die beste Konstante für dieses Turnier wäre 2:1 gewesen
 * (130 statt 128 Punkte), aber die kennt man erst hinterher. Eine an die
 * Ergebnisse angepasste Latte würde die Modelle künstlich klein aussehen
 * lassen und wäre keine Referenz, sondern ein Gegner mit Vorwissen.
 *
 * Bleibt trotzdem unehrlich, wenn man es verschweigt: festgeschrieben wurde
 * die Regel erst nach dem Turnier, weil die Kategorie beim Aufbau der Arena
 * schon beendet war. Daher `retroactive: true` und die Sensitivitätsspanne in
 * der Notiz – wie stark die Wahl der Konstante den Skill-Score bewegt, steht
 * damit auf der Seite und nicht nur im Kopf des Betreibers.
 */
import { references, type ReferenceRule } from './index';

export const constantOneNil: ReferenceRule = {
  id: 'constant-1-0',
  label: {
    en: 'Always 1–0 (home win)',
    de: 'Immer 1:0 (Heimsieg)',
    es: 'Siempre 1–0 (victoria local)',
  },
  note: {
    en: 'The most common World Cup result before 2026 — chosen from data that existed beforehand, not fitted to this tournament. Written down after the tournament had finished, which is disclosed here because the choice moves the skill figure: against plausible constants it ranges from 0.21 to 0.34. A fitted constant (2–1) would have scored higher and is deliberately not used.',
    de: 'Das häufigste WM-Ergebnis vor 2026 – gewählt aus Daten, die vorher vorlagen, nicht an dieses Turnier angepasst. Festgeschrieben wurde die Regel erst nach dem Turnier; das steht hier, weil die Wahl den Skill-Wert bewegt: gegen plausible Konstanten liegt er zwischen 0,21 und 0,34. Eine angepasste Konstante (2:1) hätte besser abgeschnitten und wird bewusst nicht verwendet.',
    es: 'El resultado más común de los Mundiales antes de 2026, elegido con datos previos y no ajustado a este torneo. La regla se fijó después de que el torneo terminara, lo que se declara aquí porque la elección mueve la cifra de habilidad: frente a constantes plausibles va de 0,21 a 0,34. Una constante ajustada (2–1) habría puntuado más alto y no se usa a propósito.',
  },
  retroactive: true,
  appliesTo: ['scoreline'],
  predict: () => ({ kind: 'scoreline', home: 1, away: 0 }),
};

references.register(constantOneNil);

/**
 * Dieselbe Regel, aber VORAB festgeschrieben – für die laufenden Fußball-Ligen.
 *
 * Der Unterschied zur WM-Variante ist nicht die Vorhersage, sondern der
 * Zeitpunkt der Festlegung: Diese Regel wurde am 29. Juli 2026 fixiert, bevor
 * ein einziges Liga-Event aufgelöst war. Sie ist damit eine echte
 * A-priori-Referenz und trägt kein retroactive-Etikett. Getrennte IDs, weil
 * die Offenlegung („nachträglich" ja/nein) Teil der Regel-Identität ist.
 */
export const constantOneNilApriori: ReferenceRule = {
  id: 'constant-1-0-apriori',
  label: constantOneNil.label,
  note: {
    en: 'The most common result in professional football, written down on 29 July 2026 — before any league event had resolved. A genuine a-priori reference: it was fixed first, the outcomes came later.',
    de: 'Das häufigste Ergebnis im Profifußball, festgeschrieben am 29. Juli 2026 – bevor ein einziges Liga-Event aufgelöst war. Eine echte A-priori-Referenz: Erst die Regel, dann die Ergebnisse.',
    es: 'El resultado más común en el fútbol profesional, fijado el 29 de julio de 2026, antes de que se resolviera un solo evento de liga. Una referencia a priori genuina: primero la regla, después los resultados.',
  },
  appliesTo: ['scoreline'],
  predict: () => ({ kind: 'scoreline', home: 1, away: 0 }),
};

references.register(constantOneNilApriori);
