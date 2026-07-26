/**
 * Typ `numeric` – Punktschätzung einer Zahl (Indexstand, Prozentwert, Menge).
 * Bewertet wird über Fehlermasse (MAE/MAPE/RMSE), nicht über Treffer/Nicht-Treffer.
 */
import type { PredictionValue, Resolution } from '../types';
import { isFiniteNumber, predictionTypes, type PredictionTypeHandler } from './index';

const NUMBER_FORMAT = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Akzeptiert "4512.3", "4512,3" und "4.512,3" (deutsches Tausendertrennzeichen).
 * Heuristik: Kommt ein Komma vor, gilt es als Dezimaltrennzeichen und Punkte
 * sind Tausendertrenner. Sonst ist der Punkt das Dezimaltrennzeichen.
 */
function parseGermanOrPlainNumber(raw: string): number | null {
  const text = raw.trim().replace(/\s/g, '');
  if (text === '') return null;
  const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
  if (!/^[+-]?\d*\.?\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export const numericHandler: PredictionTypeHandler = {
  id: 'numeric',
  label: 'Zahlenschätzung',
  cellHint: '4512.30',

  validate(value: unknown): value is PredictionValue {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return v.kind === 'numeric' && isFiniteNumber(v.value);
  },

  validateResolution(value: unknown): value is Resolution {
    return numericHandler.validate(value);
  },

  parseCell(cell: string): PredictionValue | null {
    const parsed = parseGermanOrPlainNumber(cell);
    return parsed === null ? null : { kind: 'numeric', value: parsed };
  },

  formatValue(value: PredictionValue): string {
    return value.kind === 'numeric' ? NUMBER_FORMAT.format(value.value) : '—';
  },

  formatResolution(resolution: Resolution): string {
    return resolution.kind === 'numeric' ? NUMBER_FORMAT.format(resolution.value) : '—';
  },

  /**
   * Stufen nach relativer Abweichung, damit die Bewertung unabhängig von der
   * Grössenordnung funktioniert (Indexstand 6000 vs. Prozentwert 40).
   */
  describeOutcome(prediction, resolution) {
    if (prediction.kind !== 'numeric' || resolution.kind !== 'numeric') return null;
    const absolute = Math.abs(prediction.value - resolution.value);
    const reference = Math.abs(resolution.value);
    const relative = reference === 0 ? (absolute === 0 ? 0 : Infinity) : absolute / reference;
    const quality =
      relative <= 0.005 ? 'exact' : relative <= 0.015 ? 'close' : relative <= 0.04 ? 'fair' : 'miss';
    const relativeText = Number.isFinite(relative)
      ? ` (${(relative * 100).toLocaleString('de-DE', { maximumFractionDigits: 2 })} %)`
      : '';
    return {
      label: `Δ ${NUMBER_FORMAT.format(absolute)}`,
      quality,
      detail: `Abweichung ${NUMBER_FORMAT.format(absolute)}${relativeText}`,
    };
  },
};

predictionTypes.register(numericHandler);
