/**
 * Typ `binary` – Wahrscheinlichkeit für ein Ja/Nein-Ereignis (0..1).
 *
 * Gewertet wird mit Proper Scoring Rules (Brier, Log-Loss). Die belohnen
 * ehrliche Wahrscheinlichkeiten: Wer aus Angst vor Fehlern immer 0.5 sagt,
 * verliert – wer overconfident 0.99 sagt und falsch liegt, verliert stärker.
 * Genau deshalb ist dieser Typ für ein zitierfähiges Benchmark der wertvollste.
 */
import type { PredictionValue, Resolution } from '../types';
import { isFiniteNumber, predictionTypes, type PredictionTypeHandler } from './index';

const PERCENT_FORMAT = new Intl.NumberFormat('de-DE', {
  style: 'percent',
  maximumFractionDigits: 1,
});

function isProbability(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

export const binaryHandler: PredictionTypeHandler = {
  id: 'binary',
  label: 'Wahrscheinlichkeit (Ja/Nein)',
  cellHint: '0.70 oder 70%',

  validate(value: unknown): value is PredictionValue {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return v.kind === 'binary' && isProbability(v.probability);
  },

  validateResolution(value: unknown): value is Resolution {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return v.kind === 'binary' && typeof v.outcome === 'boolean';
  },

  /** "0.7", "0,7", "70%" -> 0.7. Werte ausserhalb 0..1 werden verworfen. */
  parseCell(cell: string): PredictionValue | null {
    const text = cell.trim();
    if (text === '') return null;
    const isPercent = text.endsWith('%');
    const numberPart = (isPercent ? text.slice(0, -1) : text).replace(',', '.').trim();
    if (!/^\d*\.?\d+$/.test(numberPart)) return null;
    const raw = Number(numberPart);
    if (!Number.isFinite(raw)) return null;
    const probability = isPercent ? raw / 100 : raw;
    return isProbability(probability) ? { kind: 'binary', probability } : null;
  },

  formatValue(value: PredictionValue): string {
    return value.kind === 'binary' ? PERCENT_FORMAT.format(value.probability) : '—';
  },

  formatResolution(resolution: Resolution): string {
    if (resolution.kind !== 'binary') return '—';
    return resolution.outcome ? 'eingetreten' : 'nicht eingetreten';
  },

  /**
   * Stufen nach dem Brier-Beitrag des einzelnen Tipps. Damit wird eine
   * zurückhaltende, aber richtige Aussage besser bewertet als eine
   * overconfidente falsche – konsistent mit dem Ranking der Kategorie.
   */
  describeOutcome(prediction, resolution) {
    if (prediction.kind !== 'binary' || resolution.kind !== 'binary') return null;
    const target = resolution.outcome ? 1 : 0;
    const squaredError = (prediction.probability - target) ** 2;
    const quality =
      squaredError <= 0.05
        ? 'exact'
        : squaredError <= 0.15
          ? 'close'
          : squaredError <= 0.3
            ? 'fair'
            : 'miss';
    const correctSide =
      (prediction.probability > 0.5 && resolution.outcome) ||
      (prediction.probability < 0.5 && !resolution.outcome);
    // Bewusst NICHT die Wahrscheinlichkeit wiederholen – die steht schon in der
    // Wert-Spalte. Stattdessen der Brier-Beitrag: die Zahl, die ins Ranking eingeht.
    return {
      label: `${correctSide ? '✓' : '✗'} ${squaredError.toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      quality,
      detail: `Brier-Beitrag ${squaredError.toLocaleString('de-DE', { maximumFractionDigits: 3 })} · Ergebnis: ${
        resolution.outcome ? 'eingetreten' : 'nicht eingetreten'
      }`,
    };
  },
};

predictionTypes.register(binaryHandler);
