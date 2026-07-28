/**
 * Harness-Limits (HARNESS_V1) – die eine Wahrheitsquelle für Runner UND
 * Methodik-Seite. Bewusst ohne Imports: die Datei wird sowohl vom Frontend
 * (Vite, extensionslos) als auch vom Backend-Runner (node --experimental-
 * strip-types, mit expliziter .ts-Endung) geladen.
 *
 * Eine Änderung an Limits oder Prompt-Template = neue Harness-Version;
 * Werte verschiedener Versionen werden nie gemischt.
 */

/**
 * HARNESS_V2 – ohne Abruf externer Quellen.
 *
 * V1 sah vor, dass jedes Modell mit seiner anbietereigenen Web-Suche
 * recherchiert. Gemessen worden wäre damit das ausgelieferte Produkt inklusive
 * Suchwerkzeug – mit dem Nachteil, dass die Suchqualität je Anbieter
 * unterschiedlich und unkontrolliert ist.
 *
 * V2 dreht das um: Alle Modelle laufen über denselben Zugang ohne Suchwerkzeug
 * und bekommen damit exakt dieselben Informationen – die Frage, die
 * Auflösungsregel und den Kontext, den der Feed mitliefert (etwa den letzten
 * bekannten Kurs). Gemessen wird dadurch enger, aber sauberer vergleichbar:
 * Wie gut prognostiziert ein Modell aus Weltwissen und einer identischen
 * Kurzinformation?
 *
 * V1 wurde nie ausgeführt – es existiert keine einzige Prediction unter dieser
 * Version. Werte verschiedener Harness-Versionen werden grundsätzlich nie
 * gemischt; die Version steht in der Provenance jeder Prediction.
 */
export const HARNESS_VERSION = 'HARNESS_V2';

/** Steht kein Suchwerkzeug zur Verfügung, sagt der Prompt das ausdrücklich. */
export const HARNESS_RETRIEVAL = false;

export const HARNESS_LIMITS = {
  /** Obergrenze Such-/Tool-Aufrufe je Prediction (in V2 ohne Wirkung, siehe oben). */
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
