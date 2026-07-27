/**
 * Feed "CoinGecko" → Kategorie crypto.
 *
 * Legt für BTC und ETH je ein Event auf den nächsten Tagesschluss 00:00 UTC an
 * (Lock = der Zeitpunkt selbst) und löst es danach über die history-API auf.
 * Kein API-Key nötig; der Free-Endpunkt reicht für 2 Aufrufe je Lauf.
 *
 * Titel entstehen als dreisprachige Templates im Generator (Muster P2) – so
 * kostet die Mehrsprachigkeit keinen einzigen LLM-Call.
 */
import { getJson, type DraftEvent, type FeedSource, type ResolvedEvent } from './types.mts';

const CATEGORY = 'crypto';
const BASE = 'https://api.coingecko.com/api/v3';

const COINS = [
  { id: 'bitcoin', symbol: 'BTC' },
  { id: 'ethereum', symbol: 'ETH' },
];

/** Nächstes 00:00 UTC, das mindestens minUtcDate erreicht. */
function nextMidnightUtc(minUtcDate: Date): Date {
  const midnight = new Date(minUtcDate);
  midnight.setUTCHours(0, 0, 0, 0);
  while (midnight <= minUtcDate) midnight.setUTCDate(midnight.getUTCDate() + 1);
  return midnight;
}

async function currentPrice(coinId: string): Promise<number> {
  const raw = (await getJson(`${BASE}/simple/price?ids=${coinId}&vs_currencies=usd`)) as Record<
    string,
    { usd?: number }
  >;
  const price = raw[coinId]?.usd;
  if (typeof price !== 'number' || !Number.isFinite(price)) {
    throw new Error(`CoinGecko: kein Preis für ${coinId}.`);
  }
  return price;
}

export const coingeckoSource: FeedSource = {
  id: 'coingecko',
  categories: [CATEGORY],

  async fetchEvents({ cap, minUtcDate }) {
    const target = nextMidnightUtc(minUtcDate);
    const day = target.toISOString().slice(0, 10);
    const drafts: DraftEvent[] = [];

    for (const coin of COINS.slice(0, Math.max(cap, 0))) {
      const previousClose = await currentPrice(coin.id);
      drafts.push({
        category: CATEGORY,
        id: `cg-${coin.symbol.toLowerCase()}-${day}`,
        title: `${coin.symbol} close on ${day}`,
        titles: {
          en: `${coin.symbol} close on ${day}`,
          de: `${coin.symbol}-Schlusskurs am ${day}`,
          es: `Cierre de ${coin.symbol} el ${day}`,
        },
        utcDate: target.toISOString(),
        predictionType: 'numeric',
        metadata: { symbol: coin.symbol, coinId: coin.id, previousClose, day },
        expectedResolutionAt: new Date(target.getTime() + 2 * 3_600_000).toISOString(),
        resolutionRule:
          `USD price of ${coin.symbol} as reported by the CoinGecko API for ${day} at 00:00 UTC ` +
          `(endpoint /coins/${coin.id}/history?date=DD-MM-YYYY, field market_data.current_price.usd). ` +
          `Rounded to two decimals. If CoinGecko does not report a price for that date, the event is voided.`,
        context: [
          `Asset: ${coin.symbol} (${coin.id}) priced in USD`,
          `Latest price known at event creation: ${previousClose.toFixed(2)} USD`,
          'Resolution uses the CoinGecko daily snapshot at 00:00 UTC.',
        ],
      });
    }

    return drafts;
  },

  async resolve(events) {
    const results: ResolvedEvent[] = [];

    for (const event of events) {
      const coinId = String(event.metadata.coinId ?? '');
      const day = String(event.metadata.day ?? '');
      if (!coinId || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        results.push({
          category: event.category,
          id: event.id,
          resolution: null,
          voidReason: 'Event ohne verwertbare coinId/day-Metadaten.',
        });
        continue;
      }

      // CoinGecko erwartet DD-MM-YYYY.
      const [year, month, dayOfMonth] = day.split('-');
      const raw = (await getJson(
        `${BASE}/coins/${coinId}/history?date=${dayOfMonth}-${month}-${year}&localization=false`,
      )) as { market_data?: { current_price?: { usd?: number } } };

      const price = raw.market_data?.current_price?.usd;
      if (typeof price !== 'number' || !Number.isFinite(price)) {
        // Noch nicht verfügbar: offen lassen. Der Job voidet erst nach Frist.
        results.push({ category: event.category, id: event.id, resolution: null });
        continue;
      }

      results.push({
        category: event.category,
        id: event.id,
        resolution: { kind: 'numeric', value: Math.round(price * 100) / 100 },
        evidence: { source: `coingecko/history/${coinId}`, date: day, usd: price },
      });
    }

    return results;
  },
};
