/**
 * Feed-Registry. Neuer Feed = Datei anlegen + eine Zeile hier.
 * Ingest- und Resolve-Job kennen keinen einzigen Feed namentlich.
 *
 * Die Feed-ID landet in events.source und bindet ein Event dauerhaft an den
 * Code, der es auflösen darf. Eine ID wird deshalb nach ihrer Datenquelle
 * benannt und nie umbenannt – ein Wechsel der Quelle ist ein neuer Feed.
 */
import { coingeckoSource } from './coingecko.mts';
import { footballDataSource } from './football-data.mts';
import { yahooFinanceSource } from './yahoo-finance.mts';
import type { FeedSource } from './types.mts';

export const FEEDS: FeedSource[] = [footballDataSource, yahooFinanceSource, coingeckoSource];

export function feedById(id: string): FeedSource | undefined {
  return FEEDS.find((feed) => feed.id === id);
}
