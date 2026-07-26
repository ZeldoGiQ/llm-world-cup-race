/**
 * Typ `scoreline` – Ergebnistipp mit zwei Torzahlen (Heim:Auswärts).
 * Deckt Fussball und jede andere Sportart mit zwei Parteien ab.
 */
import { scorePrediction } from '../../../lib/scoring';
import type { PredictionValue, Resolution } from '../types';
import { isGoalCount, predictionTypes, type PredictionTypeHandler } from './index';

/** "2-1", "2:1", "2 – 1" – tolerant gegenüber Trennzeichen und Leerraum. */
const CELL_PATTERN = /^(\d{1,3})\s*[-:–]\s*(\d{1,3})$/;

export const scorelineHandler: PredictionTypeHandler = {
  id: 'scoreline',
  label: 'Ergebnistipp',
  cellHint: '2-1',

  validate(value: unknown): value is PredictionValue {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return v.kind === 'scoreline' && isGoalCount(v.home) && isGoalCount(v.away);
  },

  validateResolution(value: unknown): value is Resolution {
    return scorelineHandler.validate(value);
  },

  parseCell(cell: string): PredictionValue | null {
    const match = CELL_PATTERN.exec(cell.trim());
    if (!match) return null;
    return { kind: 'scoreline', home: Number(match[1]), away: Number(match[2]) };
  },

  formatValue(value: PredictionValue): string {
    return value.kind === 'scoreline' ? `${value.home}:${value.away}` : '—';
  },

  formatResolution(resolution: Resolution): string {
    return resolution.kind === 'scoreline' ? `${resolution.home}:${resolution.away}` : '—';
  },

  /** Nutzt die Kicktipp-Wertung: 4 exakt, 3 Tordifferenz, 2 Tendenz, 0 daneben. */
  describeOutcome(prediction, resolution) {
    if (prediction.kind !== 'scoreline' || resolution.kind !== 'scoreline') return null;
    const { points, category } = scorePrediction(prediction, resolution);
    const detail =
      category === 'exact'
        ? 'Exaktes Ergebnis'
        : category === 'goalDiff'
          ? 'Richtige Tordifferenz'
          : category === 'tendency'
            ? 'Richtige Tendenz'
            : 'Falsche Tendenz';
    const quality =
      category === 'exact'
        ? 'exact'
        : category === 'goalDiff'
          ? 'close'
          : category === 'tendency'
            ? 'fair'
            : 'miss';
    return { label: points > 0 ? `+${points}` : '0', quality, detail: `${detail} · ${points} Punkte` };
  },
};

predictionTypes.register(scorelineHandler);
