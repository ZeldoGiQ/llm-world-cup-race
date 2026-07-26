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

  it('formatiert mit deutschem Doppelpunkt', () => {
    expect(scorelineHandler.formatValue({ kind: 'scoreline', home: 2, away: 1 })).toBe('2:1');
    expect(scorelineHandler.formatResolution({ kind: 'scoreline', home: 0, away: 3 })).toBe('0:3');
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

  it('parst englische und deutsche Zahlformate', () => {
    expect(numericHandler.parseCell('4512.3')).toEqual({ kind: 'numeric', value: 4512.3 });
    expect(numericHandler.parseCell('4512,3')).toEqual({ kind: 'numeric', value: 4512.3 });
    expect(numericHandler.parseCell('4.512,3')).toEqual({ kind: 'numeric', value: 4512.3 });
    expect(numericHandler.parseCell('-8')).toEqual({ kind: 'numeric', value: -8 });
    expect(numericHandler.parseCell('0')).toEqual({ kind: 'numeric', value: 0 });
  });

  it('gibt null bei ungültigen Zellen zurück', () => {
    for (const cell of ['', 'abc', '1.2.3', '--5']) {
      expect(numericHandler.parseCell(cell)).toBeNull();
    }
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

  it('formatiert Ergebnis in Klartext', () => {
    expect(binaryHandler.formatResolution({ kind: 'binary', outcome: true })).toBe('eingetreten');
    expect(binaryHandler.formatResolution({ kind: 'binary', outcome: false })).toBe(
      'nicht eingetreten',
    );
  });
});

describe('describeOutcome (Tipp-Bewertung für die Anzeige)', () => {
  it('stuft Ergebnistipps nach dem Kicktipp-Schema', () => {
    const res = { kind: 'scoreline', home: 2, away: 1 } as const;
    expect(scorelineHandler.describeOutcome({ kind: 'scoreline', home: 2, away: 1 }, res)).toMatchObject({
      label: '+4',
      quality: 'exact',
    });
    expect(scorelineHandler.describeOutcome({ kind: 'scoreline', home: 3, away: 2 }, res)).toMatchObject({
      label: '+3',
      quality: 'close',
    });
    // 3:0 auf 2:1 -> Sieger richtig, Differenz falsch = nur Tendenz
    expect(scorelineHandler.describeOutcome({ kind: 'scoreline', home: 3, away: 0 }, res)).toMatchObject({
      label: '+2',
      quality: 'fair',
    });
    expect(scorelineHandler.describeOutcome({ kind: 'scoreline', home: 0, away: 2 }, res)).toMatchObject({
      label: '0',
      quality: 'miss',
    });
  });

  it('stuft Zahlenschätzungen nach relativer Abweichung', () => {
    const res = { kind: 'numeric', value: 1000 } as const;
    expect(numericHandler.describeOutcome({ kind: 'numeric', value: 1002 }, res)!.quality).toBe('exact');
    expect(numericHandler.describeOutcome({ kind: 'numeric', value: 1012 }, res)!.quality).toBe('close');
    expect(numericHandler.describeOutcome({ kind: 'numeric', value: 1030 }, res)!.quality).toBe('fair');
    expect(numericHandler.describeOutcome({ kind: 'numeric', value: 1200 }, res)!.quality).toBe('miss');
  });

  it('nutzt bei Zahlen die absolute Abweichung als Label', () => {
    const outcome = numericHandler.describeOutcome(
      { kind: 'numeric', value: 1012.5 },
      { kind: 'numeric', value: 1000 },
    )!;
    expect(outcome.label).toBe('Δ 12,5');
  });

  it('stuft Wahrscheinlichkeiten nach Brier-Beitrag und markiert die Seite', () => {
    const yes = { kind: 'binary', outcome: true } as const;
    const good = binaryHandler.describeOutcome({ kind: 'binary', probability: 0.9 }, yes)!;
    expect(good.quality).toBe('exact');
    expect(good.label).toContain('✓');

    const bad = binaryHandler.describeOutcome({ kind: 'binary', probability: 0.1 }, yes)!;
    expect(bad.quality).toBe('miss');
    expect(bad.label).toContain('✗');
  });

  it('gibt null bei unpassenden Typen zurück', () => {
    expect(
      scorelineHandler.describeOutcome({ kind: 'numeric', value: 1 }, { kind: 'numeric', value: 1 }),
    ).toBeNull();
    expect(
      binaryHandler.describeOutcome(
        { kind: 'binary', probability: 0.5 },
        { kind: 'numeric', value: 1 },
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
});
