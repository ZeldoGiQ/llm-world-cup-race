import { useCallback, useEffect, useRef, useState } from 'react';
import type { EventsFile, PredictionsFile } from './types';

/**
 * Daten-Layer der Arena – kategorie-parametrisiert.
 *
 * Bewusst dasselbe bewährte Muster wie im WM-Tippspiel (Polling, Refresh beim
 * Zurückkehren auf den Tab, defensives Normalisieren, letzter Stand bleibt bei
 * Fehlern sichtbar). Der einzige Unterschied: Die Pfade ergeben sich aus der
 * Kategorie, nicht aus Konstanten.
 *
 * Genau hier setzt später ein Backend an: Ein zweiter Adapter, der statt der
 * statischen JSONs eine API abfragt, lässt Komponenten und Engine unberührt.
 */

/** Statische Dummy-/Snapshot-Daten ändern sich selten – 5 Minuten genügen. */
export const ARENA_POLL_INTERVAL_MS = 300_000;

export interface ArenaData {
  eventsFile: EventsFile;
  predictionsFile: PredictionsFile;
}

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return (await response.json()) as T;
}

/**
 * Kaputte oder fehlende Felder dürfen die Oberfläche nie zum Absturz bringen –
 * die Daten kommen aus statischen Dateien, die von Skripten geschrieben werden.
 */
function normalize(
  categoryId: string,
  eventsFile: EventsFile,
  predictionsFile: PredictionsFile,
): ArenaData {
  return {
    eventsFile: {
      category: eventsFile?.category ?? categoryId,
      updatedAt:
        typeof eventsFile?.updatedAt === 'string' ? eventsFile.updatedAt : '1970-01-01T00:00:00Z',
      events: Array.isArray(eventsFile?.events) ? eventsFile.events : [],
    },
    predictionsFile: {
      category: predictionsFile?.category ?? categoryId,
      predictions:
        predictionsFile?.predictions && typeof predictionsFile.predictions === 'object'
          ? predictionsFile.predictions
          : {},
    },
  };
}

export function useArenaData(categoryId: string) {
  const [data, setData] = useState<ArenaData | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [lastFailed, setLastFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const lastFetchRef = useRef(0);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [eventsFile, predictionsFile] = await Promise.all([
        loadJson<EventsFile>(`/arena-data/${categoryId}/events.json`),
        loadJson<PredictionsFile>(`/arena-data/${categoryId}/predictions.json`),
      ]);
      setData(normalize(categoryId, eventsFile, predictionsFile));
      lastFetchRef.current = Date.now();
      setFetchedAt(lastFetchRef.current);
      setLastFailed(false);
    } catch {
      // Letzten erfolgreichen Stand stehen lassen, nur das Flag setzen.
      setLastFailed(true);
    } finally {
      setRefreshing(false);
    }
  }, [categoryId]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), ARENA_POLL_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchRef.current > 60_000) {
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
