/**
 * Ein Interface für alle Anbieter. Vier Adapter genügen, weil OpenAI-kompatible
 * APIs (xAI, Alibaba, Moonshot, DeepSeek …) über base_url + search_mode
 * abgedeckt werden – neue Anbieter dieser Art brauchen NIE neuen Code.
 */
import type { ModelRow, ProviderRow } from '../lib/db.mts';

export interface CallRequest {
  provider: ProviderRow;
  model: ModelRow;
  apiKey: string;
  system: string;
  user: string;
  /** true = Web-Suche anfordern (aus bei Repair-Turns – dort nur Formatfix). */
  search: boolean;
  maxOutputTokens: number;
  timeoutMs: number;
}

export interface CallResult {
  /** Vollständiger Text der Antwort; der Parser sucht darin den JSON-Block. */
  text: string;
  usage: { inputTokens: number; outputTokens: number; searchCalls: number };
  /** Von der API gemeldete Modell-ID – deckt stille Modell-Drift auf. */
  reportedModel: string | null;
  latencyMs: number;
}

export type ProviderErrorCode = 'timeout' | 'rate-limited' | 'api-error' | 'refusal';

export class ProviderError extends Error {
  code: ProviderErrorCode;
  /** true = Transportfehler (429/5xx/Timeout) und damit wiederholbar. */
  retryable: boolean;

  // Bewusst ohne Parameter-Properties: `node --experimental-strip-types`
  // entfernt Typen nur, es transformiert nicht – Parameter-Properties wären
  // ein Syntaxfehler zur Laufzeit.
  constructor(message: string, code: ProviderErrorCode, retryable: boolean) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.retryable = retryable;
  }
}

export type ProviderAdapter = (request: CallRequest) => Promise<CallResult>;

/** HTTP-Status → Fehler-Code + Retry-Entscheidung (für alle Adapter gleich). */
export function classifyHttp(status: number, body: string): ProviderError {
  const detail = body.slice(0, 300).replace(/\s+/g, ' ');
  if (status === 429) return new ProviderError(`HTTP 429: ${detail}`, 'rate-limited', true);
  if (status >= 500) return new ProviderError(`HTTP ${status}: ${detail}`, 'api-error', true);
  return new ProviderError(`HTTP ${status}: ${detail}`, 'api-error', false);
}

/** fetch mit Timeout; AbortError wird als retryable Timeout klassifiziert. */
export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isTimeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    throw new ProviderError(
      isTimeout ? `Timeout nach ${timeoutMs} ms` : `Netzwerkfehler: ${message}`,
      isTimeout ? 'timeout' : 'api-error',
      true,
    );
  }

  if (!response.ok) throw classifyHttp(response.status, await response.text());

  try {
    return await response.json();
  } catch {
    throw new ProviderError('Antwort war kein JSON.', 'api-error', true);
  }
}

export function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
