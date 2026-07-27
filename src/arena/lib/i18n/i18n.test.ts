/**
 * Absicherung der Mehrsprachigkeit.
 *
 * Zwei Dinge, die ohne Test still kaputtgehen:
 *  1. Eine fehlende Übersetzung fällt im Betrieb kaum auf – sie zeigt sich nur
 *     als englischer Text mitten in einer deutschen Seite.
 *  2. Zahl- und Datumsformate müssen der Sprache folgen, sonst steht in der
 *     englischen Fassung „4.512,30".
 */
import { describe, expect, it } from 'vitest';
import '../plugins';
import { categories } from '../categories/index';
import { references } from '../references/index';
import { metrics } from '../metrics/index';
import { predictionTypes } from '../prediction-types/index';
import { groupName, stageName, teamName } from './football-terms';
import {
  formatAgo,
  formatDate,
  formatFixed,
  formatInteger,
  formatMonthYear,
  formatPercent,
  formatSigned,
} from './format';
import {
  arenaPath,
  arenaUrl,
  assertNoReservedCategoryId,
  DEFAULT_LOCALE,
  isLocale,
  LOCALES,
  modelName,
  modelProvider,
  PREFIXED_LOCALES,
  pick,
} from './locales';
import { __messages, t, type MessageKey } from './messages';
import modelsJson from '../../data/models.json';
import type { ArenaModel } from '../types';

describe('Sprachen und Pfade', () => {
  it('hat Englisch als Standardsprache ohne Präfix', () => {
    expect(DEFAULT_LOCALE).toBe('en');
    expect(arenaPath('en')).toBe('/arena');
    expect(arenaPath('en', 'methodology')).toBe('/arena/methodology');
  });

  it('präfixt nur die Alternativsprachen', () => {
    expect(PREFIXED_LOCALES).toEqual(['de', 'es']);
    expect(arenaPath('de')).toBe('/arena/de');
    expect(arenaPath('es', 'stocks-index')).toBe('/arena/es/stocks-index');
  });

  it('baut absolute Adressen für canonical und hreflang', () => {
    expect(arenaUrl('en')).toMatch(/^https:\/\/.+\/arena$/);
    expect(arenaUrl('de', 'methodology')).toMatch(/^https:\/\/.+\/arena\/de\/methodology$/);
  });

  it('erkennt gültige Sprachcodes', () => {
    expect(isLocale('de')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it('weist Kategorie-IDs ab, die mit Sprach- oder Methodik-Pfaden kollidieren', () => {
    // Sonst würde /arena/de still zur Kategorieseite statt zur deutschen Fassung.
    expect(() => assertNoReservedCategoryId('de')).toThrow(/reservierten/);
    expect(() => assertNoReservedCategoryId('es')).toThrow(/reservierten/);
    expect(() => assertNoReservedCategoryId('methodology')).toThrow(/reservierten/);
    expect(() => assertNoReservedCategoryId('stocks-index')).not.toThrow();
  });

  it('fällt bei fehlender Übersetzung auf die Standardsprache zurück', () => {
    const partial = { en: 'fallback' } as unknown as Record<string, string>;
    expect(pick(partial as never, 'de')).toBe('fallback');
  });
});

describe('Vollständigkeit des Katalogs', () => {
  const keys = Object.keys(__messages) as MessageKey[];

  it('enthält jeden Text in allen drei Sprachen', () => {
    const missing: string[] = [];
    for (const key of keys) {
      for (const locale of LOCALES) {
        const value = __messages[key][locale];
        if (!value || value.trim() === '') missing.push(`${key}/${locale}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('verwendet in allen Sprachen dieselben Platzhalter', () => {
    const mismatches: string[] = [];
    for (const key of keys) {
      const names = (text: string) => (text.match(/\{(\w+)\}/g) ?? []).sort().join(',');
      const reference = names(__messages[key][DEFAULT_LOCALE]);
      for (const locale of LOCALES) {
        if (names(__messages[key][locale]) !== reference) mismatches.push(`${key}/${locale}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('setzt Platzhalter ein und lässt unbekannte stehen', () => {
    const translate = t('en');
    expect(translate('events.count', { shown: 3, total: 12 })).toBe('3 of 12 events');
    // Fehlender Wert bleibt sichtbar, damit ein Tippfehler auffällt.
    expect(translate('events.count', { shown: 3 })).toContain('{total}');
  });

  it('liefert je Sprache unterschiedliche Texte', () => {
    expect(t('en')('nav.methodology')).toBe('Methodology');
    expect(t('de')('nav.methodology')).toBe('Methodik');
    expect(t('es')('nav.methodology')).toBe('Metodología');
  });

  it('wählt Singular und Plural korrekt', () => {
    // Ohne Pluralregel stünde dort „solo 1 eventos" bzw. „nur 1 Events".
    expect(t('en').plural('standings.provisionalShort', 1)).toBe('provisional · only 1 event');
    expect(t('en').plural('standings.provisionalShort', 5)).toBe('provisional · only 5 events');
    expect(t('de').plural('standings.provisionalShort', 1)).toBe('vorläufig · nur 1 Event');
    expect(t('de').plural('standings.provisionalShort', 5)).toBe('vorläufig · nur 5 Events');
    expect(t('es').plural('standings.provisionalShort', 1)).toBe('provisional · solo 1 evento');
    expect(t('es').plural('standings.provisionalShort', 5)).toBe('provisional · solo 5 eventos');
  });

  it('nutzt bei Null die Pluralform', () => {
    expect(t('en').plural('standings.provisionalShort', 0)).toContain('events');
    expect(t('de').plural('standings.provisionalShort', 0)).toContain('Events');
  });
});

describe('Vollständigkeit der Plugin-Texte', () => {
  it('hat für jede Metrik Label und Beschreibung in allen Sprachen', () => {
    const missing: string[] = [];
    for (const metric of metrics.list()) {
      for (const locale of LOCALES) {
        if (!metric.label[locale]) missing.push(`${metric.id}.label/${locale}`);
        if (!metric.description[locale]) missing.push(`${metric.id}.description/${locale}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('hat für jede Kategorie alle Texte in allen Sprachen', () => {
    const missing: string[] = [];
    for (const category of categories.list()) {
      for (const locale of LOCALES) {
        if (!category.label[locale]) missing.push(`${category.id}.label/${locale}`);
        if (!category.blurb[locale]) missing.push(`${category.id}.blurb/${locale}`);
        if (!category.question[locale]) missing.push(`${category.id}.question/${locale}`);
        if (category.baselineNote && !category.baselineNote[locale]) {
          missing.push(`${category.id}.baselineNote/${locale}`);
        }
        if (category.unit && !category.unit[locale]) missing.push(`${category.id}.unit/${locale}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('hat für jeden Vorhersage-Typ ein Label in allen Sprachen', () => {
    for (const handler of predictionTypes.list()) {
      for (const locale of LOCALES) {
        expect(handler.label[locale], `${handler.id}/${locale}`).toBeTruthy();
      }
    }
  });
});

describe('Modellnamen', () => {
  const models = modelsJson as ArenaModel[];

  it('lässt Eigennamen echter Sprachmodelle unübersetzt', () => {
    const claude = models.find((model) => model.id === 'claude')!;
    for (const locale of LOCALES) {
      expect(modelName(claude, locale)).toBe('Claude Fable 5');
    }
  });

  it('übersetzt die Begriffsnamen der Referenz-Teilnehmer', () => {
    const randomWalk = models.find((model) => model.id === 'baseline-randomwalk')!;
    expect(modelName(randomWalk, 'en')).toBe('Random walk');
    expect(modelName(randomWalk, 'de')).toBe('Random-Walk');
    expect(modelName(randomWalk, 'es')).toBe('Camino aleatorio');
  });

  it('übersetzt auch den Anbieter der Referenz-Teilnehmer', () => {
    const poll = models.find((model) => model.id === 'baseline-poll')!;
    expect(modelProvider(poll, 'en')).toBe('Reference');
    expect(modelProvider(poll, 'de')).toBe('Referenz');
    expect(modelProvider(poll, 'es')).toBe('Referencia');
  });

  it('hat für jeden Referenz-Teilnehmer alle drei Sprachen', () => {
    const missing: string[] = [];
    for (const model of models.filter((m) => m.baseline)) {
      for (const locale of LOCALES) {
        if (!model.names?.[locale]) missing.push(`${model.id}.names/${locale}`);
        if (!model.providers?.[locale]) missing.push(`${model.id}.providers/${locale}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('enthält in den Modelldaten keinen deutschen Resttext', () => {
    // Englisch ist Standardsprache: kanonische Felder müssen englisch sein.
    const german = /(Referenz|Beispiel|Konsens|Letzte|Umfrage)/;
    const offenders = models
      .filter((model) => german.test(model.name) || german.test(model.provider))
      .map((model) => model.id);
    expect(offenders).toEqual([]);
  });
});

describe('Formatierung folgt der Sprache', () => {
  it('nutzt sprachgerechte Dezimal- und Tausendertrenner', () => {
    expect(formatInteger(1234567, 'en')).toBe('1,234,567');
    expect(formatInteger(1234567, 'de')).toBe('1.234.567');
    expect(formatFixed(12.5, 'en', 2)).toBe('12.50');
    expect(formatFixed(12.5, 'de', 2)).toBe('12,50');
  });

  it('zeigt Prozentwerte sprachgerecht', () => {
    expect(formatPercent(0.125, 'en', 1)).toContain('12.5');
    expect(formatPercent(0.125, 'de', 1)).toContain('12,5');
  });

  it('setzt beim Skill-Score ein Vorzeichen, ausser bei Null', () => {
    expect(formatSigned(0.567, 'en', 3)).toBe('+0.567');
    expect(formatSigned(-0.234, 'en', 3)).toBe('-0.234');
    expect(formatSigned(0, 'en', 3)).toBe('0.000');
    expect(formatSigned(0.567, 'de', 3)).toBe('+0,567');
  });

  it('formatiert Datumsangaben deterministisch in UTC', () => {
    // Ohne feste Zone könnten Build (UTC) und Browser an Tagesgrenzen abweichen.
    const iso = '2026-06-11T23:30:00Z';
    // dateStyle 'medium': en-US schreibt den Monat aus, de-DE nutzt Ziffern.
    expect(formatDate(iso, 'en')).toMatch(/Jun 11, 2026/);
    expect(formatDate(iso, 'de')).toMatch(/11\.06\.2026/);
    expect(formatMonthYear(iso, 'es')).toMatch(/junio/);
    // Entscheidend ist die feste Zone: 23:30 UTC bleibt der 11., nicht der 12.
    expect(formatDate(iso, 'de')).not.toMatch(/12\./);
  });

  it('formuliert verstrichene Zeit in der jeweiligen Sprache', () => {
    expect(formatAgo(45_000, 'en')).toMatch(/second/);
    expect(formatAgo(45_000, 'de')).toMatch(/Sekunde/);
    expect(formatAgo(5 * 60_000, 'es')).toMatch(/minuto/);
  });
});

describe('Fußball-Vokabular', () => {
  it('übersetzt Teamnamen', () => {
    expect(teamName('Germany', 'en')).toBe('Germany');
    expect(teamName('Germany', 'de')).toBe('Deutschland');
    expect(teamName('Germany', 'es')).toBe('Alemania');
    expect(teamName('Ivory Coast', 'es')).toBe('Costa de Marfil');
  });

  it('korrigiert unübliche Schreibweisen der Datenquelle', () => {
    expect(teamName('Congo DR', 'en')).toBe('DR Congo');
    expect(teamName('Cape Verde Islands', 'de')).toBe('Kap Verde');
  });

  it('zeigt unbekannte Teams unverändert statt leer', () => {
    expect(teamName('Atlantis', 'de')).toBe('Atlantis');
  });

  it('übersetzt Turnierphasen und Gruppen', () => {
    expect(stageName('GROUP_STAGE', 'en')).toBe('Group stage');
    expect(stageName('LAST_16', 'es')).toBe('Octavos de final');
    expect(stageName('FINAL', 'de')).toBe('Finale');
    expect(groupName('A', 'en')).toBe('Group A');
    expect(groupName('A', 'es')).toBe('Grupo A');
  });

  it('macht unbekannte Phasen lesbar', () => {
    expect(stageName('SOME_NEW_STAGE', 'en')).toBe('Some new stage');
  });
});

describe('Ehrlichkeitsregeln der Startseite', () => {
  const homeKeys = (Object.keys(__messages) as MessageKey[]).filter((key) =>
    key.startsWith('home.'),
  );

  it('behauptet nirgends einen Sieger ohne Unsicherheitsangabe', () => {
    /*
     * Die schärfste Regel der Seite. Groks Vorsprung von sechs Punkten liegt im
     * Messfehler – das 95-Prozent-Intervall der Differenz enthält die Null. Wer
     * daraus „gewinnt" macht, behauptet mehr als die Daten tragen, und genau das
     * würde die Zitierfähigkeit kosten. „Führt" plus Intervall ist erlaubt.
     */
    const forbidden = [
      'wins',
      'winner',
      'the best model',
      'best-performing',
      'gewinnt',
      'sieger',
      'bestes modell',
      'gana',
      'ganador',
      'mejor modelo',
    ];
    for (const key of homeKeys) {
      for (const [locale, text] of Object.entries(__messages[key])) {
        const lower = text.toLowerCase();
        for (const word of forbidden) {
          expect(lower, `${key} (${locale}) enthält "${word}"`).not.toContain(word);
        }
      }
    }
  });

  it('nennt bei der Gesamtwertung immer die Zahl der Kategorien', () => {
    // Sonst stünde „kategorienübergreifend" ohne Angabe, worüber gemittelt wurde.
    for (const locale of LOCALES) {
      const title = __messages['home.overall.title'][locale];
      expect(title).toContain('{counted}');
      expect(title).toContain('{total}');
    }
  });

  it('führt zählabhängige Kategorietexte als Singular und Plural', () => {
    const translate = t('de');
    expect(translate.plural('home.cat.pending', 1)).toContain('Ereignis offen');
    expect(translate.plural('home.cat.pending', 5)).toContain('Ereignisse offen');
  });

  it('hat für jede Referenzregel Label und Begründung in allen Sprachen', () => {
    for (const rule of references.list()) {
      for (const locale of LOCALES) {
        expect(rule.label[locale], `${rule.id}.label[${locale}]`).toBeTruthy();
        expect(rule.note[locale], `${rule.id}.note[${locale}]`).toBeTruthy();
      }
      // Eine nachträglich festgeschriebene Regel muss das im Text offenlegen.
      if (rule.retroactive) {
        expect(rule.note.en.toLowerCase()).toMatch(/after|retroactive/);
        expect(rule.note.de.toLowerCase()).toMatch(/nach|nachträglich/);
      }
    }
  });
});
