/**
 * Feed "yahoo-finance" → Kategorie stocks-index.
 *
 * Wochenschluss von S&P 500, DAX und Nasdaq 100. Der Lock liegt Montag 00:00 UTC,
 * aufgelöst wird nach dem Freitagsschluss – alle Modelle haben damit dieselbe
 * volle Handelswoche als Vorhersagehorizont.
 *
 * Zur Quelle, offen gesagt: Der Chart-Endpunkt von Yahoo ist nicht offiziell
 * dokumentiert und kann sich ändern. Das ist hier vertretbar, weil ein Ausfall
 * folgenlos bleibt – ein Event, dessen Quelle keinen Wert liefert, wird ungültig
 * und für niemanden gewertet, statt falsch aufgelöst zu werden. Der zuvor
 * geplante CSV-Feed von Stooq fiel weg, weil Stooq Abrufe hinter eine
 * JavaScript-Bot-Prüfung gestellt hat.
 *
 * Handelstag-Logik: Yahoo liefert Zeitstempel der Börsenöffnung in UTC. Der
 * Handelstag wird deshalb über den gemeldeten Zeitzonen-Offset (`gmtoffset`)
 * bestimmt und nicht über die UTC-Kalenderdatum – sonst würde ein Index mit
 * späterer Öffnung gelegentlich dem Vortag zugeschlagen.
 */
import { getJson, type DraftEvent, type FeedSource, type ResolvedEvent } from './types.mts';

const CATEGORY = 'stocks-index';
const BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

const INDICES = [
  { yahoo: '^GSPC', symbol: 'S&P 500', currency: 'USD' },
  { yahoo: '^GDAXI', symbol: 'DAX', currency: 'EUR' },
  { yahoo: '^NDX', symbol: 'Nasdaq 100', currency: 'USD' },
];

interface DailyClose {
  /** Handelstag in der Zeitzone der Börse, als YYYY-MM-DD. */
  date: string;
  close: number;
}

/**
 * Tagesschlusskurse holen. Tage ohne Wert (Feiertag, laufender Tag) fallen
 * heraus – ein `null` wird nie als Kurs gedeutet.
 */
async function dailyCloses(yahooSymbol: string, range = '2mo'): Promise<DailyClose[]> {
  const raw = (await getJson(
    `${BASE}/${encodeURIComponent(yahooSymbol)}?interval=1d&range=${range}`,
    { 'User-Agent': 'Mozilla/5.0 (compatible; FutureBench/1.0; +https://www.futurebench.ai)' },
  )) as {
    chart?: {
      result?: {
        meta?: { gmtoffset?: number };
        timestamp?: number[];
        indicators?: { quote?: { close?: (number | null)[] }[] };
      }[];
      error?: unknown;
    };
  };

  const result = raw.chart?.result?.[0];
  const timestamps = result?.timestamp;
  const closes = result?.indicators?.quote?.[0]?.close;
  if (!Array.isArray(timestamps) || !Array.isArray(closes)) {
    throw new Error(`Yahoo: keine Kursreihe für ${yahooSymbol}.`);
  }

  const offsetSeconds = typeof result?.meta?.gmtoffset === 'number' ? result.meta.gmtoffset : 0;
  const rows: DailyClose[] = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const close = closes[i];
    if (typeof close !== 'number' || !Number.isFinite(close)) continue;
    rows.push({
      date: new Date((timestamps[i] + offsetSeconds) * 1000).toISOString().slice(0, 10),
      close: Math.round(close * 100) / 100,
    });
  }

  if (rows.length === 0) throw new Error(`Yahoo: nur leere Kurswerte für ${yahooSymbol}.`);
  return rows;
}

/**
 * Kommender Montag 00:00 UTC (Lock) und der Freitag derselben Woche.
 * Exportiert, weil Datumsarithmetik getestet gehört (siehe yahoo-finance.test.mts).
 */
export function tradingWeek(minUtcDate: Date): { lock: Date; monday: string; friday: string } {
  const lock = new Date(minUtcDate);
  lock.setUTCHours(0, 0, 0, 0);
  // 1 = Montag. Vorwärts laufen, bis ein Montag NACH minUtcDate erreicht ist.
  do {
    lock.setUTCDate(lock.getUTCDate() + 1);
  } while (lock.getUTCDay() !== 1 || lock <= minUtcDate);

  return {
    lock,
    monday: lock.toISOString().slice(0, 10),
    friday: new Date(lock.getTime() + 4 * 86_400_000).toISOString().slice(0, 10),
  };
}

export const yahooFinanceSource: FeedSource = {
  id: 'yahoo-finance',
  categories: [CATEGORY],

  async fetchEvents({ cap, minUtcDate }) {
    const { lock, monday, friday } = tradingWeek(minUtcDate);
    const drafts: DraftEvent[] = [];

    for (const index of INDICES.slice(0, Math.max(cap, 0))) {
      const closes = await dailyCloses(index.yahoo, '1mo');
      const previous = closes[closes.length - 1];

      drafts.push({
        category: CATEGORY,
        id: `yf-${index.yahoo.replace('^', '').toLowerCase()}-${friday}`,
        title: `${index.symbol} close on ${friday}`,
        titles: {
          en: `${index.symbol} close on ${friday}`,
          de: `${index.symbol}-Schlusskurs am ${friday}`,
          es: `Cierre de ${index.symbol} el ${friday}`,
        },
        utcDate: lock.toISOString(),
        predictionType: 'numeric',
        metadata: {
          symbol: index.symbol,
          yahooSymbol: index.yahoo,
          currency: index.currency,
          previousClose: previous.close,
          previousCloseDate: previous.date,
          weekStart: monday,
          targetDate: friday,
          period: `Week ending ${friday}`,
        },
        // Nach US-Börsenschluss (20:00–21:00 UTC) und deutlich nach Xetra-Schluss.
        expectedResolutionAt: `${friday}T22:30:00.000Z`,
        resolutionRule:
          `Closing level of ${index.symbol} (Yahoo Finance symbol ${index.yahoo}) on the last ` +
          `trading day of the week from ${monday} to ${friday}, in ${index.currency}, rounded to ` +
          `two decimals. Read from the daily series of ` +
          `${BASE}/${index.yahoo}?interval=1d, field indicators.quote[0].close, with the trading ` +
          `day derived in the exchange's own timezone. If ${friday} is a market holiday, the last ` +
          `trading day of that same week counts. If no close is published for that week, the ` +
          `event is voided and scores nothing for anyone.`,
        context: [
          `Index: ${index.symbol}, quoted in ${index.currency}`,
          `Last close before lock: ${previous.close} on ${previous.date}`,
          `Target: closing level on Friday ${friday} (or the last trading day of that week)`,
          'Predictions lock on Monday 00:00 UTC, so the whole trading week is still ahead.',
        ],
      });
    }

    return drafts;
  },

  async resolve(events) {
    const results: ResolvedEvent[] = [];

    for (const event of events) {
      const yahooSymbol = String(event.metadata.yahooSymbol ?? '');
      const targetDate = String(event.metadata.targetDate ?? '');
      const weekStart = String(event.metadata.weekStart ?? '');

      if (!yahooSymbol || !targetDate || !weekStart) {
        results.push({
          category: event.category,
          id: event.id,
          resolution: null,
          voidReason: 'Event ohne verwertbare yahooSymbol/targetDate/weekStart-Metadaten.',
        });
        continue;
      }

      const closes = await dailyCloses(yahooSymbol);
      // Letzter Handelstag innerhalb der Zielwoche – deckt die Feiertagsregel ab.
      const inWeek = closes.filter((row) => row.date >= weekStart && row.date <= targetDate);
      const chosen = inWeek[inWeek.length - 1];

      if (!chosen) {
        // Noch kein Wert: offen lassen. Der Job voidet erst nach der Frist.
        results.push({ category: event.category, id: event.id, resolution: null });
        continue;
      }

      /*
       * Entscheidend: Der Lock liegt am Montag, das Ziel ist der Freitag. Ohne
       * diese Prüfung würde schon der Montagsschluss (oder bei laufender Sitzung
       * gar ein Intraday-Preis) als Wochenschluss durchgehen – vier Tage zu früh
       * und für jedes Event falsch. Deshalb: nur der Zieltag selbst zählt.
       * Erst wenn dessen Handelsschluss vorbei ist und trotzdem kein Wert für
       * ihn existiert, greift die Feiertagsregel und der letzte Handelstag der
       * Woche wird genommen.
       */
      const deadlinePassed = Date.now() > Date.parse(`${targetDate}T22:30:00.000Z`);
      if (chosen.date !== targetDate && !deadlinePassed) {
        results.push({ category: event.category, id: event.id, resolution: null });
        continue;
      }

      results.push({
        category: event.category,
        id: event.id,
        resolution: { kind: 'numeric', value: chosen.close },
        evidence: {
          source: `yahoo-finance/${yahooSymbol}`,
          tradingDay: chosen.date,
          close: chosen.close,
          week: `${weekStart}..${targetDate}`,
        },
      });
    }

    return results;
  },
};
