/**
 * Datumsarithmetik der Aktien-Events. Der Lock muss immer auf einem Montag
 * 00:00 UTC liegen, echt nach dem frühesten erlaubten Zeitpunkt, und der
 * Zielfreitag genau vier Tage später – sonst würde die Vorhersagewoche
 * verrutschen oder ein Event schon tot geboren werden.
 */
import { describe, expect, it } from 'vitest';
import { tradingWeek } from './yahoo-finance.mts';

function weekdayOf(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

describe('tradingWeek', () => {
  it('liefert den nächsten Montag als Lock', () => {
    // Mittwoch, 29. Juli 2026
    const { lock, monday, friday } = tradingWeek(new Date('2026-07-29T12:00:00Z'));
    expect(lock.toISOString()).toBe('2026-08-03T00:00:00.000Z');
    expect(monday).toBe('2026-08-03');
    expect(friday).toBe('2026-08-07');
  });

  it('überspringt den laufenden Montag, statt in die Vergangenheit zu zeigen', () => {
    // Montag, 27. Juli 2026, mitten am Tag – dieser Montag ist als Lock vorbei.
    const { monday } = tradingWeek(new Date('2026-07-27T09:00:00Z'));
    expect(monday).toBe('2026-08-03');
  });

  it('nimmt bei Sonntag den unmittelbar folgenden Montag', () => {
    const { monday } = tradingWeek(new Date('2026-08-02T23:00:00Z'));
    expect(monday).toBe('2026-08-03');
  });

  it('liegt der Lock immer echt in der Zukunft und auf einem Montag', () => {
    // Jeder Tag eines Jahres als Startpunkt.
    for (let day = 0; day < 365; day += 1) {
      const from = new Date(Date.UTC(2026, 0, 1, 6, 0, 0) + day * 86_400_000);
      const { lock, monday, friday } = tradingWeek(from);
      expect(lock.getTime(), `Lock nicht in der Zukunft ab ${from.toISOString()}`).toBeGreaterThan(
        from.getTime(),
      );
      expect(lock.getUTCDay(), `Lock kein Montag ab ${from.toISOString()}`).toBe(1);
      expect(lock.toISOString().endsWith('T00:00:00.000Z')).toBe(true);
      expect(weekdayOf(friday), `Ziel kein Freitag ab ${from.toISOString()}`).toBe(5);
      // Der Zielfreitag gehört zur Woche des Locks, nicht zur nächsten.
      expect(new Date(`${friday}T00:00:00Z`).getTime() - new Date(`${monday}T00:00:00Z`).getTime()).toBe(
        4 * 86_400_000,
      );
    }
  });

  it('gibt dem Lock höchstens eine Woche Vorlauf', () => {
    for (let hour = 0; hour < 24 * 14; hour += 7) {
      const from = new Date(Date.UTC(2026, 6, 1) + hour * 3_600_000);
      const { lock } = tradingWeek(from);
      expect(lock.getTime() - from.getTime()).toBeLessThanOrEqual(7 * 86_400_000);
    }
  });
});
