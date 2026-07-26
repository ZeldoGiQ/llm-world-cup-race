/**
 * Typ `numeric` – Punktschätzung einer Zahl (Indexstand, Prozentwert, Menge).
 * Bewertet wird über Fehlermasse (MAE/MAPE/RMSE), nicht über Treffer/Nicht-Treffer.
 */
import { formatNumber, formatPercent } from '../i18n/format';
import type { Locale } from '../i18n/locales';
import type { PredictionValue, Resolution } from '../types';
import {
  isFiniteNumber,
  predictionTypes,
  type OutcomeDescription,
  type PredictionTypeHandler,
} from './index';

const NUMBER_OPTIONS: Intl.NumberFormatOptions = {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
};

const DEVIATION_WORD: Record<Locale, string> = {
  en: 'Deviation',
  de: 'Abweichung',
  es: 'Desviación',
};

/**
 * Parst Zahlen in deutscher UND englischer Schreibweise.
 *
 * Heuristik: Das **zuletzt** auftretende Trennzeichen ist das Dezimaltrennzeichen,
 * alle übrigen sind Tausendertrenner. Damit werden sowohl "4.512,30" (deutsch)
 * als auch "4,512.30" (englisch) korrekt gelesen – eine rein deutsche Auslegung
 * würde "4,512.3" fälschlich zu 4,5123 machen.
 *
 * Sonderfall: Steht nur ein einzelnes Trennzeichen und folgen ihm genau drei
 * Ziffern, ist die Absicht mehrdeutig ("1.500" = 1500 oder 1,5?). Dann gilt es
 * als Tausendertrenner, weil das in Kursdaten der übliche Fall ist.
 */
function parseFlexibleNumber(raw: string): number | null {
  const text = raw.trim().replace(/\s/g, '');
  if (text === '') return null;
  if (!/^[+-]?[\d.,]+$/.test(text)) return null;

  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  let normalized: string;

  if (lastComma === -1 && lastDot === -1) {
    normalized = text;
  } else {
    const decimalIndex = Math.max(lastComma, lastDot);
    const decimalChar = text[decimalIndex]!;
    const otherChar = decimalChar === ',' ? '.' : ',';
    const decimals = text.length - decimalIndex - 1;
    const onlyOneSeparator = !text.includes(otherChar) && text.indexOf(decimalChar) === decimalIndex;

    if (onlyOneSeparator && decimals === 3) {
      // Mehrdeutig -> als Tausendertrenner lesen.
      normalized = text.split(decimalChar).join('');
    } else {
      normalized = text.split(otherChar).join('');
      normalized =
        normalized.slice(0, normalized.lastIndexOf(decimalChar)) +
        '.' +
        normalized.slice(normalized.lastIndexOf(decimalChar) + 1);
    }
  }

  if (!/^[+-]?\d*\.?\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export const numericHandler: PredictionTypeHandler = {
  id: 'numeric',
  label: {
    en: 'Numeric estimate',
    de: 'Zahlenschätzung',
    es: 'Estimación numérica',
  },
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
    const parsed = parseFlexibleNumber(cell);
    return parsed === null ? null : { kind: 'numeric', value: parsed };
  },

  formatValue(value: PredictionValue, locale: Locale): string {
    return value.kind === 'numeric' ? formatNumber(value.value, locale, NUMBER_OPTIONS) : '—';
  },

  formatResolution(resolution: Resolution, locale: Locale): string {
    return resolution.kind === 'numeric'
      ? formatNumber(resolution.value, locale, NUMBER_OPTIONS)
      : '—';
  },

  /**
   * Stufen nach relativer Abweichung, damit die Bewertung unabhängig von der
   * Grössenordnung funktioniert (Indexstand 6000 vs. Prozentwert 40).
   */
  describeOutcome(prediction, resolution, locale): OutcomeDescription | null {
    if (prediction.kind !== 'numeric' || resolution.kind !== 'numeric') return null;
    const absolute = Math.abs(prediction.value - resolution.value);
    const reference = Math.abs(resolution.value);
    const relative = reference === 0 ? (absolute === 0 ? 0 : Infinity) : absolute / reference;
    const quality =
      relative <= 0.005 ? 'exact' : relative <= 0.015 ? 'close' : relative <= 0.04 ? 'fair' : 'miss';
    const absoluteText = formatNumber(absolute, locale, NUMBER_OPTIONS);
    const relativeText = Number.isFinite(relative) ? ` (${formatPercent(relative, locale, 2)})` : '';
    return {
      label: `Δ ${absoluteText}`,
      quality,
      detail: `${DEVIATION_WORD[locale]} ${absoluteText}${relativeText}`,
    };
  },
};

predictionTypes.register(numericHandler);
