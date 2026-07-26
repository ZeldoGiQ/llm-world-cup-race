import { describe, expect, it } from 'vitest';
import { binaryHandler } from './binary';
import { numericHandler } from './numeric';
import { scorelineHandler } from './scoreline';
import { predictionTypes } from './index';

describe('scoreline-Handler', () => {
  it('validiert korrekte Werte', () => {
    expect(scorelineHandler.validate({ kind: 'scoreline', home: 2, away: 1 })).toBe(true);
    expect(scorelineHandler.validate({ kind: 'scoreline', home: 0, away: 0 })).toBe(true);
  });

  it('lehnt kaputte Werte aus JSON ab', () => {
    expect(scorelineHandler.validate(null)).toBe(false);
    expect(scorelineHandler.validate({ kind: 'numeric', value: 2 })).toBe(false);
    expect(scorelineHandler.validate({ kind: 'scoreline', home: 2 })).toBe(false);
    expect(scorelineHandler.validate({ kind: 'scoreline', home: -1, away: 0 })).toBe(false);
    expect(scorelineHandler.validate({ kind: 'scoreline', home: 1.5, away: 0 })).toBe(false);
    expect(scorelineHandler.validate({ kind: 'scoreline', home: '2', away: '1' })).toBe(false);
    expect(scorelineHandler.validate({ kind: 'scoreline', home: NaN, away: 0 })).toBe(false);
  });

  it('parst gängige Zellformate', () => {
    expect(scorelineHandler.parseCell('2-1')).toEqual({ kind: 'scoreline', home: 2, away: 1 });
    expect(scorelineHandler.parseCell('2:1')).toEqual({ kind: 'scoreline', home: 2, away: 1 });
    expect(scorelineHandler.parseCell(' 3 – 0 ')).toEqual({ kind: 'scoreline', home: 3, away: 0 });
  });

  it('gibt null bei ungültigen Zellen zurück statt zu werfen', () => {
    for (const cell of ['', 'abc', '2', '2-', '-1', '2-1-0', '1,5-2']) {
      expect(scorelineHandler.parseCell(cell)).toBeNull();
    }
  });

  it('zeigt Ergebnisse sprachneutral als H:A', () => {
    // Ein Spielstand liest sich in allen drei Sprachen gleich.
    for (const locale of ['en', 'de', 'es'] as const) {
      expect(scorelineHandler.formatValue({ kind: 'scoreline', home: 2, away: 1 }, locale)).toBe(
        '2:1',
      );
      expect(
        scorelineHandler.formatResolution({ kind: 'scoreline', home: 0, away: 3 }, locale),
      ).toBe('0:3');
    }
  });
});

describe('numeric-Handler', () => {
  it('validiert endliche Zahlen und lehnt NaN/Infinity ab', () => {
    expect(numericHandler.validate({ kind: 'numeric', value: 4512.3 })).toBe(true);
    expect(numericHandler.validate({ kind: 'numeric', value: -12 })).toBe(true);
    expect(numericHandler.validate({ kind: 'numeric', value: NaN })).toBe(false);
    expect(numericHandler.validate({ kind: 'numeric', value: Infinity })).toBe(false);
    expect(numericHandler.validate({ kind: 'numeric' })).toBe(false);
  });

  it('parst deutsche Schreibweise (Komma als Dezimaltrenner)', () => {
    expect(numericHandler.parseCell('4512,3')).toEqual({ kind: 'numeric', value: 4512.3 });
    expect(numericHandler.parseCell('4.512,30')).toEqual({ kind: 'numeric', value: 4512.3 });
  });

  it('parst englische Schreibweise (Punkt als Dezimaltrenner)', () => {
    expect(numericHandler.parseCell('4512.3')).toEqual({ kind: 'numeric', value: 4512.3 });
    // Der frühere, rein deutsche Parser hätte hieraus fälschlich 4,5123 gemacht.
    expect(numericHandler.parseCell('4,512.30')).toEqual({ kind: 'numeric', value: 4512.3 });
  });

  it('liest ein einzelnes Trennzeichen mit drei Folgeziffern als Tausendertrenner', () => {
    expect(numericHandler.parseCell('1.500')).toEqual({ kind: 'numeric', value: 1500 });
    expect(numericHandler.parseCell('1,500')).toEqual({ kind: 'numeric', value: 1500 });
  });

  it('parst einfache Zahlen ohne Trennzeichen', () => {
    expect(numericHandler.parseCell('-8')).toEqual({ kind: 'numeric', value: -8 });
    expect(numericHandler.parseCell('0')).toEqual({ kind: 'numeric', value: 0 });
    expect(numericHandler.parseCell('12.5')).toEqual({ kind: 'numeric', value: 12.5 });
  });

  it('gibt null bei ungültigen Zellen zurück', () => {
    for (const cell of ['', 'abc', '--5', '1.2.3.4x']) {
      expect(numericHandler.parseCell(cell)).toBeNull();
    }
  });

  it('formatiert Zahlen je Sprache unterschiedlich', () => {
    const value = { kind: 'numeric', value: 4512.5 } as const;
    const en = numericHandler.formatValue(value, 'en');
    const de = numericHandler.formatValue(value, 'de');
    // Englisch: Punkt als Dezimaltrenner, Deutsch: Komma.
    expect(en).toContain('.');
    expect(en).toMatch(/4,512/);
    expect(de).toContain(',');
    expect(de).toMatch(/4\.512/);
    expect(en).not.toBe(de);
  });
});

describe('binary-Handler', () => {
  it('validiert Wahrscheinlichkeiten im Intervall 0..1', () => {
    expect(binaryHandler.validate({ kind: 'binary', probability: 0 })).toBe(true);
    expect(binaryHandler.validate({ kind: 'binary', probability: 1 })).toBe(true);
    expect(binaryHandler.validate({ kind: 'binary', probability: 0.62 })).toBe(true);
    expect(binaryHandler.validate({ kind: 'binary', probability: 1.2 })).toBe(false);
    expect(binaryHandler.validate({ kind: 'binary', probability: -0.1 })).toBe(false);
  });

  it('validiert das Ergebnis als Boolean', () => {
    expect(binaryHandler.validateResolution({ kind: 'binary', outcome: true })).toBe(true);
    expect(binaryHandler.validateResolution({ kind: 'binary', outcome: false })).toBe(true);
    expect(binaryHandler.validateResolution({ kind: 'binary', outcome: 'ja' })).toBe(false);
  });

  it('parst Dezimal- und Prozentschreibweise', () => {
    expect(binaryHandler.parseCell('0.7')).toEqual({ kind: 'binary', probability: 0.7 });
    expect(binaryHandler.parseCell('0,7')).toEqual({ kind: 'binary', probability: 0.7 });
    expect(binaryHandler.parseCell('70%')).toEqual({ kind: 'binary', probability: 0.7 });
    expect(binaryHandler.parseCell('100%')).toEqual({ kind: 'binary', probability: 1 });
  });

  it('lehnt Werte ausserhalb 0..1 ab', () => {
    expect(binaryHandler.parseCell('1.4')).toBeNull();
    expect(binaryHandler.parseCell('140%')).toBeNull();
    expect(binaryHandler.parseCell('abc')).toBeNull();
    expect(binaryHandler.parseCell('')).toBeNull();
  });

  it('formatiert das Ergebnis in jeder Sprache in Klartext', () => {
    const yes = { kind: 'binary', outcome: true } as const;
    const no = { kind: 'binary', outcome: false } as const;
    expect(binaryHandler.formatResolution(yes, 'en')).toBe('occurred');
    expect(binaryHandler.formatResolution(no, 'en')).toBe('did not occur');
    expect(binaryHandler.formatResolution(yes, 'de')).toBe('eingetreten');
    expect(binaryHandler.formatResolution(no, 'de')).toBe('nicht eingetreten');
    expect(binaryHandler.formatResolution(yes, 'es')).toBe('ocurrió');
    expect(binaryHandler.formatResolution(no, 'es')).toBe('no ocurrió');
  });

  it('formatiert Wahrscheinlichkeiten als Prozentwert', () => {
    for (const locale of ['en', 'de', 'es'] as const) {
      expect(binaryHandler.formatValue({ kind: 'binary', probability: 0.7 }, locale)).toMatch(/70/);
    }
  });
});

describe('describeOutcome (Tipp-Bewertung für die Anzeige)', () => {
  it('stuft Ergebnistipps nach dem Kicktipp-Schema', () => {
    const res = { kind: 'scoreline', home: 2, away: 1 } as const;
    expect(
      scorelineHandler.describeOutcome({ kind: 'scoreline', home: 2, away: 1 }, res, 'en'),
    ).toMatchObject({ label: '+4', quality: 'exact' });
    expect(
      scorelineHandler.describeOutcome({ kind: 'scoreline', home: 3, away: 2 }, res, 'en'),
    ).toMatchObject({ label: '+3', quality: 'close' });
    // 3:0 auf 2:1 -> Sieger richtig, Differenz falsch = nur Tendenz
    expect(
      scorelineHandler.describeOutcome({ kind: 'scoreline', home: 3, away: 0 }, res, 'en'),
    ).toMatchObject({ label: '+2', quality: 'fair' });
    expect(
      scorelineHandler.describeOutcome({ kind: 'scoreline', home: 0, away: 2 }, res, 'en'),
    ).toMatchObject({ label: '0', quality: 'miss' });
  });

  it('übersetzt die Begründung des Ergebnistipps', () => {
    const res = { kind: 'scoreline', home: 2, away: 1 } as const;
    const pred = { kind: 'scoreline', home: 2, away: 1 } as const;
    expect(scorelineHandler.describeOutcome(pred, res, 'en')!.detail).toContain('Exact score');
    expect(scorelineHandler.describeOutcome(pred, res, 'de')!.detail).toContain('Exaktes Ergebnis');
    expect(scorelineHandler.describeOutcome(pred, res, 'es')!.detail).toContain('Resultado exacto');
  });

  it('stuft Zahlenschätzungen nach relativer Abweichung', () => {
    const res = { kind: 'numeric', value: 1000 } as const;
    expect(numericHandler.describeOutcome({ kind: 'numeric', value: 1002 }, res, 'en')!.quality).toBe(
      'exact',
    );
    expect(numericHandler.describeOutcome({ kind: 'numeric', value: 1012 }, res, 'en')!.quality).toBe(
      'close',
    );
    expect(numericHandler.describeOutcome({ kind: 'numeric', value: 1030 }, res, 'en')!.quality).toBe(
      'fair',
    );
    expect(numericHandler.describeOutcome({ kind: 'numeric', value: 1200 }, res, 'en')!.quality).toBe(
      'miss',
    );
  });

  it('nutzt bei Zahlen die absolute Abweichung als Label, sprachgerecht formatiert', () => {
    const res = { kind: 'numeric', value: 1000 } as const;
    const pred = { kind: 'numeric', value: 1012.5 } as const;
    expect(numericHandler.describeOutcome(pred, res, 'en')!.label).toBe('Δ 12.5');
    expect(numericHandler.describeOutcome(pred, res, 'de')!.label).toBe('Δ 12,5');
  });

  it('stuft Wahrscheinlichkeiten nach Brier-Beitrag und markiert die Seite', () => {
    const yes = { kind: 'binary', outcome: true } as const;
    const good = binaryHandler.describeOutcome({ kind: 'binary', probability: 0.9 }, yes, 'en')!;
    expect(good.quality).toBe('exact');
    expect(good.label).toContain('✓');

    const bad = binaryHandler.describeOutcome({ kind: 'binary', probability: 0.1 }, yes, 'en')!;
    expect(bad.quality).toBe('miss');
    expect(bad.label).toContain('✗');
  });

  it('gibt null bei unpassenden Typen zurück', () => {
    expect(
      scorelineHandler.describeOutcome(
        { kind: 'numeric', value: 1 },
        { kind: 'numeric', value: 1 },
        'en',
      ),
    ).toBeNull();
    expect(
      binaryHandler.describeOutcome(
        { kind: 'binary', probability: 0.5 },
        { kind: 'numeric', value: 1 },
        'en',
      ),
    ).toBeNull();
  });
});

describe('Registry', () => {
  it('kennt alle drei Handler nach dem Import', () => {
    expect(predictionTypes.ids().sort()).toEqual(['binary', 'numeric', 'scoreline']);
  });

  it('wirft bei unbekannter ID und toleriert find()', () => {
    expect(() => predictionTypes.get('gibtsnicht')).toThrow(/Unbekannte/);
    expect(predictionTypes.find('gibtsnicht')).toBeUndefined();
    expect(predictionTypes.get('numeric').id).toBe('numeric');
  });

  it('lehnt doppelte Registrierung ab', () => {
    expect(() => predictionTypes.register(scorelineHandler)).toThrow(/bereits registriert/);
  });

  it('hat für jeden Handler alle drei Sprachen', () => {
    for (const handler of predictionTypes.list()) {
      for (const locale of ['en', 'de', 'es'] as const) {
        expect(handler.label[locale], `${handler.id}/${locale}`).toBeTruthy();
      }
    }
  });
});
