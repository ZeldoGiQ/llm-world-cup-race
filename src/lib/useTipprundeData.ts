import { useCallback, useEffect, useRef, useState } from 'react';
import { POLL_INTERVAL_MS } from './config';
import type { MatchesFile, PredictionsFile } from './types';

export interface TipprundeData {
  matchesFile: MatchesFile;
  predictionsFile: PredictionsFile;
}

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return (await response.json()) as T;
}

/** Defensive Normalisierung – kaputte/fehlende Felder dürfen die UI nie crashen. */
function normalize(matchesFile: MatchesFile, predictionsFile: PredictionsFile): TipprundeData {
  return {
    matchesFile: {
      updatedAt:
        typeof matchesFile?.updatedAt === 'string' ? matchesFile.updatedAt : '1970-01-01T00:00:00Z',
      matches: Array.isArray(matchesFile?.matches) ? matchesFile.matches : [],
    },
    predictionsFile: {
      predictions:
        predictionsFile?.predictions && typeof predictionsFile.predictions === 'object'
          ? predictionsFile.predictions
          : {},
    },
  };
}

/**
 * Lädt matches.json + predictions.json von /data/... und pollt alle 90 s.
 * Bei Fehlern bleibt der letzte erfolgreiche Stand sichtbar (kein Layout-Shift,
 * kein Datenverlust) – nur ein Flag signalisiert das fehlgeschlagene Update.
 */
export function useTipprundeData() {
  const [data, setData] = useState<TipprundeData | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [lastFailed, setLastFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const lastFetchRef = useRef(0);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [matchesFile, predictionsFile] = await Promise.all([
        loadJson<MatchesFile>('/data/matches.json'),
        loadJson<PredictionsFile>('/data/predictions.json'),
      ]);
      setData(normalize(matchesFile, predictionsFile));
      lastFetchRef.current = Date.now();
      setFetchedAt(lastFetchRef.current);
      setLastFailed(false);
    } catch {
      setLastFailed(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    // Beim Tab-Wechsel zurück zur Seite sofort aktualisieren (max. alle 30 s)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchRef.current > 30_000) {
        void refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refresh]);

  return { data, fetchedAt, lastFailed, refreshing, refresh };
}
