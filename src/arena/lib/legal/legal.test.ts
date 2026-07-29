import { describe, expect, it } from 'vitest';
import { LOCALES } from '../i18n/locales';
import { operatorComplete, type Operator } from './operator';
import { privacySections } from './texts';

const full: Operator = {
  name: 'Beispiel Person',
  address: ['Beispielstraße 1', '12345 Beispielstadt'],
  email: 'kontakt@example.org',
};

describe('operatorComplete', () => {
  it('erkennt vollständige Angaben', () => {
    expect(operatorComplete(full)).toBe(true);
  });

  it('lässt kein Pflichtfeld stillschweigend durchrutschen', () => {
    // Eine falsche oder halbe Anbieterkennzeichnung ist schlimmer als eine
    // sichtbar fehlende – deshalb muss jedes leere Feld die Seite in den
    // „unvollständig"-Zustand zwingen.
    expect(operatorComplete({ ...full, name: '  ' })).toBe(false);
    expect(operatorComplete({ ...full, address: [] })).toBe(false);
    expect(operatorComplete({ ...full, address: ['', ' '] })).toBe(false);
    expect(operatorComplete({ ...full, email: '' })).toBe(false);
  });
});

describe('Datenschutzerklärung', () => {
  it('liegt in allen Sprachen mit denselben Abschnitten vor', () => {
    const reference = privacySections('en').map((section) => section.id);
    expect(reference.length).toBeGreaterThan(5);
    for (const locale of LOCALES) {
      expect(privacySections(locale).map((section) => section.id)).toEqual(reference);
    }
  });

  it('hat in jeder Sprache in jedem Abschnitt Text', () => {
    for (const locale of LOCALES) {
      for (const section of privacySections(locale)) {
        expect(section.heading.trim().length).toBeGreaterThan(0);
        expect(section.body.length).toBeGreaterThan(0);
        for (const paragraph of section.body) {
          expect(paragraph.trim().length).toBeGreaterThan(20);
        }
      }
    }
  });

  it('behauptet nichts, was diese Seite gar nicht tut', () => {
    // Regression gegen Textbaustein-Generatoren: Wer hier später Absätze über
    // Cookies, Kontaktformulare oder Analysedienste einfügt, ohne dass es sie
    // gibt, macht die Erklärung falsch.
    const forbidden = [
      /wir verwenden cookies/i,
      /kontaktformular/i,
      /google analytics/i,
      /newsletter anmeld/i,
      /we use cookies/i,
      /contact form/i,
    ];
    for (const locale of LOCALES) {
      const text = privacySections(locale)
        .flatMap((section) => [section.heading, ...section.body, ...(section.list ?? [])])
        .join(' ');
      for (const pattern of forbidden) {
        expect(text).not.toMatch(pattern);
      }
    }
  });
});
