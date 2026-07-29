/**
 * Angaben zum Betreiber – die einzige Stelle, an der sie stehen.
 *
 * Impressum und Datenschutzerklärung lesen beide von hier. Diese Daten kann
 * niemand erfinden und niemand herleiten: Sie müssen vom Betreiber selbst
 * kommen, und sie müssen stimmen, weil eine falsche Anbieterkennzeichnung
 * abmahnbar ist.
 *
 * Solange `name` oder `address` leer sind, zeigen beide Seiten offen an, dass
 * die Angaben fehlen, statt etwas zu behaupten. Der Test in operator.test.ts
 * hält fest, dass ein leeres Feld nie stillschweigend durchrutscht.
 *
 * Ausfüllen: Werte eintragen, `npm run build`, fertig.
 */
export interface Operator {
  /** Vollständiger Name der verantwortlichen Person oder Firma */
  name: string;
  /** Ladungsfähige Anschrift, Zeile für Zeile. Kein Postfach. */
  address: string[];
  /** Erreichbare E-Mail-Adresse */
  email: string;
  /** Optional: Telefonnummer */
  phone?: string;
  /** Optional: Umsatzsteuer-Identifikationsnummer, falls vorhanden */
  vatId?: string;
  /**
   * Vertretungsberechtigte – bei Kapitalgesellschaften Pflicht (§ 5 DDG).
   * Bei einer Einzelperson bleibt das Feld leer.
   */
  representative?: string;
  /** Registergericht und -nummer – bei eingetragenen Gesellschaften Pflicht. */
  register?: { court: string; number: string };
  /**
   * Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV: bei redaktionell
   * gestalteten Angeboten eine natürliche Person mit Anschrift.
   */
  contentResponsible?: string[];
}

export const OPERATOR: Operator = {
  name: 'Heisenberg IT GmbH',
  address: ['Wittener Str. 210', '44803 Bochum', 'Deutschland'],
  email: 'info@heisenberg-it.de',
  vatId: 'DE456684681',
  representative: 'Hannes Ftuni',
  register: { court: 'Amtsgericht Bochum', number: 'HRB 22116' },
  contentResponsible: ['Hannes Ftuni', 'Wittener Str. 210', '44803 Bochum'],
};

/** Sind alle Pflichtfelder gefüllt? */
export function operatorComplete(operator: Operator = OPERATOR): boolean {
  return (
    operator.name.trim().length > 0 &&
    operator.address.some((line) => line.trim().length > 0) &&
    operator.email.trim().length > 0
  );
}
