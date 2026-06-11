import { SCORING, type ScoringConfig } from './config';
import type { Match, Model, PredictionsFile } from './types';

export type PointsCategory = 'exact' | 'goalDiff' | 'tendency' | 'none';

export interface ScoreResult {
  points: number;
  category: PointsCategory;
}

/**
 * Kicktipp-Schema für einen einzelnen Tipp:
 *   - exaktes Ergebnis                          -> exact   (Default 4)
 *   - richtige Tordifferenz, nicht exakt,
 *     kein Remis                                -> goalDiff (Default 3)
 *   - richtige Tendenz (Sieg/Remis/Niederlage)  -> tendency (Default 2)
 *   - sonst                                     -> 0
 *
 * Wichtig: Ein nicht-exakt getipptes Remis (z. B. 2:2 getippt, 1:1 gespielt)
 * hat zwar "richtige Tordifferenz" (0), zählt aber per Definition nur als
 * Tendenz – goalDiff gilt ausschliesslich für Nicht-Remis.
 */
export function scorePrediction(
  prediction: { home: number; away: number },
  result: { home: number; away: number },
  config: ScoringConfig = SCORING,
): ScoreResult {
  if (prediction.home === result.home && prediction.away === result.away) {
    return { points: config.exact, category: 'exact' };
  }

  const predDiff = prediction.home - prediction.away;
  const resultDiff = result.home - result.away;

  if (predDiff === resultDiff && resultDiff !== 0) {
    return { points: config.goalDiff, category: 'goalDiff' };
  }

  const sign = (n: number): -1 | 0 | 1 => (n > 0 ? 1 : n < 0 ? -1 : 0);
  if (sign(predDiff) === sign(resultDiff)) {
    return { points: config.tendency, category: 'tendency' };
  }

  return { points: 0, category: 'none' };
}

export interface StandingRow {
  model: Model;
  rank: number;
  points: number;
  exactHits: number;
  goalDiffHits: number;
  tendencyHits: number;
  /** Anzahl beendeter Spiele, für die das Modell einen Tipp abgegeben hat */
  scoredMatches: number;
}

/**
 * Leaderboard aus matches + predictions berechnen (deterministisch, rein clientseitig).
 * Gewertet werden nur FINISHED-Spiele mit vollständigem Ergebnis.
 * Fehlende Tipps zählen nicht als gewertetes Spiel und geben 0 Punkte.
 *
 * Sortierung: Punkte > exakte Treffer > gewertete Spiele > Name (stabil).
 * Rang: Standard-Wettkampf-Ranking (Gleichstand teilt Rang, danach wird übersprungen).
 */
export function computeStandings(
  models: Model[],
  matches: Match[],
  predictionsFile: PredictionsFile,
  config: ScoringConfig = SCORING,
): StandingRow[] {
  const rows: StandingRow[] = models.map((model) => ({
    model,
    rank: 0,
    points: 0,
    exactHits: 0,
    goalDiffHits: 0,
    tendencyHits: 0,
    scoredMatches: 0,
  }));
  const byModelId = new Map(rows.map((row) => [row.model.id, row]));
  const allPredictions = predictionsFile?.predictions ?? {};

  for (const match of matches) {
    if (match.status !== 'FINISHED') continue;
    const { home, away } = match.score;
    if (typeof home !== 'number' || typeof away !== 'number') continue;

    const matchPredictions = allPredictions[String(match.id)];
    if (!matchPredictions) continue;

    for (const [modelId, prediction] of Object.entries(matchPredictions)) {
      const row = byModelId.get(modelId);
      // Unbekannte Modell-IDs (nicht in models.json) werden ignoriert.
      if (!row || !prediction) continue;
      if (typeof prediction.home !== 'number' || typeof prediction.away !== 'number') continue;

      const { points, category } = scorePrediction(prediction, { home, away }, config);
      row.points += points;
      row.scoredMatches += 1;
      if (category === 'exact') row.exactHits += 1;
      else if (category === 'goalDiff') row.goalDiffHits += 1;
      else if (category === 'tendency') row.tendencyHits += 1;
    }
  }

  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.exactHits - a.exactHits ||
      b.scoredMatches - a.scoredMatches ||
      a.model.name.localeCompare(b.model.name, 'de'),
  );

  let previousKey = '';
  let previousRank = 0;
  rows.forEach((row, index) => {
    const key = `${row.points}|${row.exactHits}|${row.scoredMatches}`;
    row.rank = key === previousKey ? previousRank : index + 1;
    previousKey = key;
    previousRank = row.rank;
  });

  return rows;
}

/**
 * Bewertung eines Tipps für die Anzeige an einem konkreten Spiel.
 * FINISHED -> endgültige Punkte, LIVE -> vorläufige Punkte, sonst null.
 */
export function scoreForDisplay(
  match: Match,
  prediction: { home: number; away: number } | undefined,
  config: ScoringConfig = SCORING,
): (ScoreResult & { provisional: boolean }) | null {
  if (!prediction) return null;
  if (match.status !== 'FINISHED' && match.status !== 'LIVE') return null;
  const { home, away } = match.score;
  if (typeof home !== 'number' || typeof away !== 'number') return null;
  return {
    ...scorePrediction(prediction, { home, away }, config),
    provisional: match.status === 'LIVE',
  };
}
