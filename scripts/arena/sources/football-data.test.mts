/**
 * Fußball-Auflösung: Der Prompt fragt den Stand nach 90 Minuten und die
 * eingefrorene Auflösungsregel sagt ausdrücklich, dass Verlängerung und
 * Elfmeterschießen nicht zählen. Genau das muss der Resolver liefern.
 *
 * Warum das ein scharfer Test ist: `score.fullTime` ist bei Verlängerung der
 * 120-Minuten-Stand und bei Elfmeterschießen laut API-Doku sogar der Stand
 * inklusive Elfmetertore (1:1 n. V., 6:5 i. E. -> 7:6). Wer es unbesehen
 * verwendet, wertet jeden korrekten 1:1-Tipp als falsch.
 */
import { describe, expect, it } from 'vitest';
import { scoreAfter90 } from './football-data.mts';

describe('scoreAfter90', () => {
  it('nimmt bei regulärem Spielende den Endstand', () => {
    expect(scoreAfter90({ duration: 'REGULAR', fullTime: { home: 2, away: 1 } })).toEqual({
      home: 2,
      away: 1,
    });
  });

  it('behandelt ein fehlendes duration-Feld als regulär', () => {
    expect(scoreAfter90({ fullTime: { home: 0, away: 0 } })).toEqual({ home: 0, away: 0 });
  });

  it('nimmt bei Verlängerung den Stand nach 90 Minuten, nicht nach 120', () => {
    expect(
      scoreAfter90({
        duration: 'EXTRA_TIME',
        fullTime: { home: 3, away: 2 }, // 120-Minuten-Stand
        regularTime: { home: 1, away: 1 },
      }),
    ).toEqual({ home: 1, away: 1 });
  });

  it('nimmt beim Elfmeterschießen den regulären Stand, nicht den Schützenstand', () => {
    expect(
      scoreAfter90({
        duration: 'PENALTY_SHOOTOUT',
        fullTime: { home: 7, away: 6 }, // enthält die Elfmetertore
        regularTime: { home: 1, away: 1 },
      }),
    ).toEqual({ home: 1, away: 1 });
  });

  it('rät nicht, wenn der reguläre Stand fehlt – null führt zu VOID', () => {
    // Ein falsches Ergebnis würde jeden korrekten Tipp entwerten; VOID ist folgenlos.
    expect(
      scoreAfter90({ duration: 'EXTRA_TIME', fullTime: { home: 3, away: 2 }, regularTime: null }),
    ).toBeNull();
    expect(scoreAfter90({ duration: 'PENALTY_SHOOTOUT', fullTime: { home: 7, away: 6 } })).toBeNull();
  });

  it('lehnt unvollständige und nicht-numerische Paare ab', () => {
    expect(scoreAfter90({ duration: 'REGULAR', fullTime: { home: 2, away: null } })).toBeNull();
    expect(scoreAfter90({ duration: 'REGULAR', fullTime: null })).toBeNull();
    expect(scoreAfter90(undefined)).toBeNull();
  });
});
