/**
 * Feed "Stooq" → Kategorie stocks-index (ersetzt die Beispieldaten).
 *
 * Wochenschluss von S&P 500, DAX und Nasdaq 100 als CSV ohne API-Key. Der Lock
 * liegt Montag 00:00 UTC, aufgelöst wird nach dem Freitagsschluss – so haben
 * alle Modelle dieselbe volle Handelswoche als Vorhersagehorizont.
 */
import { getText, type DraftEvent, type FeedSource, type ResolvedEvent } from './types.mts';

const CATEGORY = 'stocks-index';

const INDICES = [
  { stooq: '^spx', symbol: 'S&P 500' },
  { stooq: '^dax', symbol: 'DAX' },
  { stooq: '^ndq', symbol: 'Nasdaq 100' },
];

/** Letzte Zeile der Quote-CSV: Datum, Open, High, Low, Close, Volume. */
async function lastClose(stooqSymbol: string): Promise<{ date: string; close: number }> {
  const csv = await getText(
    `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqSymbol)}&i=d`,
  );
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error(`Stooq: keine Daten für ${stooqSymbol}.`);
  const columns = lines[lines.length - 1].split(',');
  const close = Number(columns[4]);
  if (!Number.isFinite(close)) throw new Error(`Stooq: Schlusskurs für ${stooqSymbol} unlesbar.`);
  return { date: columns[0], close };
}

/** Kommender Montag 00:00 UTC (Lock) und der zugehörige Freitag. */
function week(minUtcDate: Date): { lock: Date; friday: string } {
  const lock = new Date(minUtcDate);
  lock.setUTCHours(0, 0, 0, 0);
  // 1 = Montag
  do {
    lock.setUTCDate(lock.getUTCDate() + 1);
  } while (lock.getUTCDay() !== 1 || lock <= minUtcDate);
  const friday = new Date(lock.getTime() + 4 * 86_400_000);
  return { lock, friday: friday.toISOString().slice(0, 10) };
}

export const stooqSource: FeedSource = {
  id: 'stooq',
  categories: [CATEGORY],

  async fetchEvents({ cap, minUtcDate }) {
    const { lock, friday } = week(minUtcDate);
    const drafts: DraftEvent[] = [];

    for (const index of INDICES.slice(0, Math.max(cap, 0))) {
      const previous = await lastClose(index.stooq);
      drafts.push({
        category: CATEGORY,
        id: `stooq-${index.stooq.replace('^', '')}-${friday}`,
        title: `${index.symbol} close on ${friday}`,
        titles: {
          en: `${index.symbol} close on ${friday}`,
          de: `${index.symbol}-Schlusskurs am ${friday}`,
          es: `Cierre de ${index.symbol} el ${friday}`,
        },
        // Lock am Montag: die ganze Handelswoche liegt in der Zukunft.
        utcDate: lock.toISOString(),
        predictionType: 'numeric',
        metadata: {
          symbol: index.symbol,
          stooqSymbol: index.stooq,
          previousClose: previous.close,
          previousCloseDate: previous.date,
          targetDate: friday,
          period: `Week ending ${friday}`,
        },
        expectedResolutionAt: `${friday}T22:00:00.000Z`,
        resolutionRule:
          `Official closing level of ${index.symbol} on ${friday} as published by Stooq ` +
          `(daily CSV for ${index.stooq}, Close column). If ${friday} is a market holiday, ` +
          `the last trading day of that week counts. If Stooq publishes no close for that week, ` +
          `the event is voided.`,
        context: [
          `Index: ${index.symbol}`,
          `Last close before lock: ${previous.close} on ${previous.date}`,
          `Target: closing level on Friday ${friday}`,
        ],
      });
    }

    return drafts;
  },

  async resolve(events) {
    const results: ResolvedEvent[] = [];

    for (const event of events) {
      const stooqSymbol = String(event.metadata.stooqSymbol ?? '');
      const targetDate = String(event.metadata.targetDate ?? '');
      if (!stooqSymbol || !targetDate) {
        results.push({
          category: event.category,
          id: event.id,
          resolution: null,
          voidReason: 'Event ohne verwertbare stooqSymbol/targetDate-Metadaten.',
        });
        continue;
      }

      const csv = await getText(`https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqSymbol)}&i=d`);
      const rows = csv
        .trim()
        .split(/\r?\n/)
        .slice(1)
        .map((line) => line.split(','))
        .filter((columns) => columns.length >= 5 && Number.isFinite(Number(columns[4])));

      // Freitag selbst, sonst der letzte Handelstag der Woche (Feiertagsregel).
      const weekStart = new Date(new Date(`${targetDate}T00:00:00Z`).getTime() - 4 * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const candidates = rows.filter((c) => c[0] >= weekStart && c[0] <= targetDate);
      const chosen = candidates[candidates.length - 1];

      if (!chosen) {
        results.push({ category: event.category, id: event.id, resolution: null });
        continue;
      }

      results.push({
        category: event.category,
        id: event.id,
        resolution: { kind: 'numeric', value: Number(chosen[4]) },
        evidence: { source: `stooq/${stooqSymbol}`, tradingDay: chosen[0], close: chosen[4] },
      });
    }

    return results;
  },
};
