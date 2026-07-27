/**
 * Harness-Limits (HARNESS_V1) – die eine Wahrheitsquelle für Runner UND
 * Methodik-Seite. Bewusst ohne Imports: die Datei wird sowohl vom Frontend
 * (Vite, extensionslos) als auch vom Backend-Runner (node --experimental-
 * strip-types, mit expliziter .ts-Endung) geladen.
 *
 * Eine Änderung an Limits oder Prompt-Template = neue Harness-Version;
 * Werte verschiedener Versionen werden nie gemischt.
 */

export const HARNESS_VERSION = 'HARNESS_V1';

export const HARNESS_LIMITS = {
  /** Obergrenze Such-/Tool-Aufrufe je Prediction (wo der Provider es zulässt). */
  maxToolCalls: 20,
  /** Obergrenze Output-Tokens je Antwort (Modell-Spalte kann enger sein). */
  maxOutputTokens: 16_000,
  /** Timeout je API-Versuch (AbortController). */
  callTimeoutMs: 300_000,
  /** Transport-Retries (429/5xx/Timeout) zusätzlich zum ersten Versuch. */
  maxTransportRetries: 2,
  /** Repair-Turns bei kaputtem JSON/Schema-Verstoß – fester Repair-Prompt. */
  maxRepairTurns: 2,
} as const;

/** Öffentliche Grund-Codes für "kein Tipp" – abschließender Katalog. */
export const FAILURE_CODES = [
  'refusal',
  'invalid-output',
  'timeout',
  'api-error',
  'rate-limited',
  'late',
] as const;

export type FailureCode = (typeof FAILURE_CODES)[number];
