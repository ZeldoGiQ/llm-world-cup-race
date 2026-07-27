/**
 * Antwort-Parser des Harness: extrahiert den LETZTEN fenced-JSON-Block aus dem
 * Modell-Output und validiert ihn gegen den Datenvertrag.
 *
 * Politik (für alle Modelle identisch, mechanisch, keine Diskretion):
 * - Erwartet wird { "prediction": <PredictionValue>, "rationale"?, "sources"? }.
 *   Ein nackter PredictionValue ohne Wrapper wird ebenfalls akzeptiert –
 *   das ist Schema-Toleranz, keine Wert-Koerzierung.
 * - Werte werden NIE repariert (1.3 wird nicht 1.0). Ungültig ist ungültig;
 *   der Aufrufer entscheidet über Repair-Turns mit festem Repair-Prompt.
 * - rationale wird auf 500 Zeichen gekappt, sources auf 5 URLs – gespeichert,
 *   aber nie bewertet.
 */
import { validatePredictionValue, type PredictionTypeId } from './contract.mts';

export interface ParsedAnswer {
  ok: true;
  value: Record<string, unknown>;
  rationale: string | null;
  sources: string[];
}

export interface ParseFailure {
  ok: false;
  /** no-json = kein parsbarer Block · invalid-value = JSON ok, Vertrag verletzt */
  reason: 'no-json' | 'invalid-value';
  detail: string;
}

export type ParseResult = ParsedAnswer | ParseFailure;

const FENCE_PATTERN = /```(?:json)?\s*\n?([\s\S]*?)```/g;

/** Letzten parsbaren JSON-Block finden; ohne Fences die ganze Antwort probieren. */
export function extractLastJson(text: string): unknown | undefined {
  let lastParsed: unknown | undefined;
  for (const match of text.matchAll(FENCE_PATTERN)) {
    try {
      lastParsed = JSON.parse(match[1].trim());
    } catch {
      // kaputter Block – vielleicht ist ein späterer intakt
    }
  }
  if (lastParsed !== undefined) return lastParsed;
  try {
    return JSON.parse(text.trim());
  } catch {
    return undefined;
  }
}

export function parseAnswer(text: string, type: PredictionTypeId): ParseResult {
  const parsed = extractLastJson(text);
  if (parsed === undefined || typeof parsed !== 'object' || parsed === null) {
    return { ok: false, reason: 'no-json', detail: 'Kein parsbarer JSON-Block in der Antwort.' };
  }

  const obj = parsed as Record<string, unknown>;
  const candidate = 'prediction' in obj ? obj.prediction : obj;

  if (!validatePredictionValue(type, candidate)) {
    return {
      ok: false,
      reason: 'invalid-value',
      detail: `JSON gefunden, aber kein gültiger ${type}-Wert (kind/Felder prüfen).`,
    };
  }

  const rationale =
    typeof obj.rationale === 'string' && obj.rationale.trim().length > 0
      ? obj.rationale.trim().slice(0, 500)
      : null;
  const sources = Array.isArray(obj.sources)
    ? obj.sources.filter((s): s is string => typeof s === 'string').slice(0, 5)
    : [];

  return { ok: true, value: candidate as Record<string, unknown>, rationale, sources };
}
