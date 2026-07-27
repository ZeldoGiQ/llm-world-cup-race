/**
 * Feed-Interface: eine Quelle erzeugt Events UND löst sie später auf.
 *
 * Die drei ehernen Regeln aus scripts/fetch-results.mjs gelten für jeden Feed:
 *   1. Fehler (kein Key, Nicht-200, Timeout, kaputtes JSON) → werfen, nichts
 *      anfassen. Der Job protokolliert und lässt den Bestand unberührt.
 *   2. Nur inhaltliche Änderungen schreiben (übernimmt der Upsert/Export).
 *   3. Unbekanntes wird nie gewertet – kein Status-Rateraten, im Zweifel VOID.
 */

export interface DraftEvent {
  category: string;
  id: string;
  title: string;
  /** Nur bei Prosa-/Template-Titeln; Eigennamen bleiben ohne Übersetzung. */
  titles?: Record<string, string>;
  utcDate: string;
  predictionType: 'scoreline' | 'numeric' | 'binary';
  metadata: Record<string, unknown>;
  expectedResolutionAt?: string;
  /** Wörtliche Auflösungsregel – steht im Prompt und bindet den Resolver. */
  resolutionRule?: string;
  /** Klartext-Kontext für den Prompt (Vorwoche, Liga, Spieltag …). */
  context?: string[];
}

export interface ResolvedEvent {
  category: string;
  id: string;
  /** Datenvertrags-Resolution oder null, wenn (noch) nicht auflösbar. */
  resolution: Record<string, unknown> | null;
  /** Gesetzt statt resolution, wenn das Event endgültig ungültig ist. */
  voidReason?: string;
  /** Beleg für die resolutions-Audit-Tabelle. */
  evidence?: Record<string, unknown>;
}

export interface FeedSource {
  /** Feed-ID; landet in events.source und in ops_config.feed_caps. */
  id: string;
  /** Zielkategorie(n) dieses Feeds. */
  categories: string[];
  /**
   * Neue Events beschaffen. `cap` ist das Volumen-Limit aus ops_config,
   * `minUtcDate` der frühste erlaubte Lock (jetzt + Vorlauf).
   */
  fetchEvents(options: { cap: number; minUtcDate: Date }): Promise<DraftEvent[]>;
  /** Fällige Events deterministisch auflösen. */
  resolve(events: { category: string; id: string; metadata: Record<string, unknown> }[]): Promise<ResolvedEvent[]>;
}

/** GET mit Timeout; jeder Fehler wird zur Exception (Regel 1). */
export async function getJson(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 20_000,
): Promise<unknown> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
  return response.json();
}

/** GET für Textformate (CSV). */
export async function getText(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 20_000,
): Promise<string> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
  return response.text();
}
