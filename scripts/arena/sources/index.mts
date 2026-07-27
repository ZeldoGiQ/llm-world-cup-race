/**
 * Feed-Registry. Neuer Feed = Datei anlegen + eine Zeile hier.
 * Ingest- und Resolve-Job kennen keinen einzigen Feed namentlich.
 */
import { coingeckoSource } from './coingecko.mts';
import { footballDataSource } from './football-data.mts';
import { stooqSource } from './stooq.mts';
import type { FeedSource } from './types.mts';

export const FEEDS: FeedSource[] = [footballDataSource, stooqSource, coingeckoSource];

export function feedById(id: string): FeedSource | undefined {
  return FEEDS.find((feed) => feed.id === id);
}
