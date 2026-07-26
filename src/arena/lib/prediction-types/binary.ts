/**
 * Typ `binary` – Wahrscheinlichkeit für ein Ja/Nein-Ereignis (0..1).
 *
 * Gewertet wird mit Proper Scoring Rules (Brier, Log-Loss). Die belohnen
 * ehrliche Wahrscheinlichkeiten: Wer aus Angst vor Fehlern immer 0.5 sagt,
 * verliert – wer overconfident 0.99 sagt und falsch liegt, verliert stärker.
 * Genau deshalb ist dieser Typ für ein zitierfähiges Benchmark der wertvollste.
 */
import { formatFixed, formatPercent } from '../i18n/format';
import type { Locale } from '../i18n/locales';
import type { PredictionValue, Resolution } from '../types';
import {
  isFiniteNumber,
  predictionTypes,
  type OutcomeDescription,
  type PredictionTypeHandler,
} from './index';

const OUTCOME_WORDS: Record<Locale, { yes: string; no: string }> = {
  en: { yes: 'occurred', no: 'did not occur' },
  de: { yes: 'eingetreten', no: 'nicht eingetreten' },
  es: { yes: 'ocurrió', no: 'no ocurrió' },
};

const BRIER_CONTRIBUTION: Record<Locale, string> = {
  en: 'Brier contribution',
  de: 'Brier-Beitrag',
  es: 'Aporte al Brier',
};

const RESULT_WORD: Record<Locale, string> = { en: 'Outcome', de: 'Ergebnis', es: 'Resultado' };

function isProbability(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

export const binaryHandler: PredictionTypeHandler = {
  id: 'binary',
  label: {
    en: 'Probability (yes/no)',
    de: 'Wahrscheinlichkeit (Ja/Nein)',
    es: 'Probabilidad (sí/no)',
  },
  cellHint: '0.70 / 70%',

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

  formatValue(value: PredictionValue, locale: Locale): string {
    return value.kind === 'binary' ? formatPercent(value.probability, locale, 0) : '—';
  },

  formatResolution(resolution: Resolution, locale: Locale): string {
    if (resolution.kind !== 'binary') return '—';
    const words = OUTCOME_WORDS[locale];
    return resolution.outcome ? words.yes : words.no;
  },

  /**
   * Stufen nach dem Brier-Beitrag des einzelnen Tipps. Damit wird eine
   * zurückhaltende, aber richtige Aussage besser bewertet als eine
   * overconfidente falsche – konsistent mit dem Ranking der Kategorie.
   */
  describeOutcome(prediction, resolution, locale): OutcomeDescription | null {
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
    const words = OUTCOME_WORDS[locale];
    // Bewusst NICHT die Wahrscheinlichkeit wiederholen – die steht schon in der
    // Wert-Spalte. Stattdessen der Brier-Beitrag: die Zahl, die ins Ranking eingeht.
    return {
      label: `${correctSide ? '✓' : '✗'} ${formatFixed(squaredError, locale, 2)}`,
      quality,
      detail: `${BRIER_CONTRIBUTION[locale]} ${formatFixed(squaredError, locale, 3)} · ${
        RESULT_WORD[locale]
      }: ${resolution.outcome ? words.yes : words.no}`,
    };
  },
};

predictionTypes.register(binaryHandler);
