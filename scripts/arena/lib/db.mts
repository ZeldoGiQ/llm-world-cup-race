/**
 * Supabase-Zugriff der Backend-Jobs.
 *
 * Ausschließlich mit dem Service-Key (umgeht RLS); der Anon-Key wird im ganzen
 * Projekt nirgends verwendet. Zeilentypen spiegeln scripts/arena/sql/001_init.sql.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSecret, requireSecret } from './env.mts';

/**
 * Akzeptierte Secret-Namen für den Service-Key, in dieser Reihenfolge.
 * Mehrere, weil das Supabase-Dashboard je nach Ansicht andere Bezeichnungen
 * vorschlägt – ein falsch benanntes Secret soll nicht den ganzen Betrieb stoppen.
 */
const SERVICE_KEY_NAMES = ['SUPABASE_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE'];

function serviceKey(): string {
  for (const name of SERVICE_KEY_NAMES) {
    const value = getSecret(name);
    if (value) return value;
  }
  throw new Error(
    `Kein Supabase-Service-Key gefunden. Erwartet als Secret unter einem dieser Namen: ` +
      `${SERVICE_KEY_NAMES.join(', ')}.`,
  );
}

let client: SupabaseClient | undefined;

export function db(): SupabaseClient {
  if (!client) {
    client = createClient(requireSecret('SUPABASE_URL'), serviceKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/** Supabase-Antwort auspacken; Fehler werden mit Kontext zu echten Exceptions. */
export function unwrap<T>(
  result: { data: T | null; error: { message: string } | null },
  context: string,
): T {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  if (result.data === null) throw new Error(`${context}: keine Daten erhalten.`);
  return result.data;
}

/* ------------------------------------------------------------------ */
/* Zeilentypen (Spiegel von 001_init.sql)                              */
/* ------------------------------------------------------------------ */

export interface ProviderRow {
  id: string;
  api_kind: 'openai' | 'openai-compat' | 'anthropic' | 'google';
  base_url: string | null;
  secret_name: string;
  search_mode: string;
  enabled: boolean;
}

export interface ModelRow {
  id: string;
  provider_id: string;
  api_model: string;
  name: string;
  color: string;
  version: string | null;
  release_date: string | null;
  access: 'public' | 'early-access';
  price_input_usd: number;
  price_output_usd: number;
  price_search_usd: number;
  max_output_tokens: number;
  extra: Record<string, unknown>;
  enabled: boolean;
  hidden: boolean;
  retired_at: string | null;
}

export interface EventRow {
  category: string;
  id: string;
  title: string;
  titles: Record<string, string> | null;
  utc_date: string;
  status: 'UPCOMING' | 'LIVE' | 'RESOLVED' | 'VOID';
  prediction_type: 'scoreline' | 'numeric' | 'binary';
  resolution: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  source: string;
  open_at: string | null;
  expected_resolution_at: string | null;
  resolved_at: string | null;
  void_reason: string | null;
}

export interface PredictionRow {
  category: string;
  event_id: string;
  model_id: string;
  value: Record<string, unknown>;
  raw: Record<string, unknown>;
  provenance: Record<string, unknown>;
  run_id: string | null;
  created_at: string;
}

export interface FailureRow {
  category: string;
  event_id: string;
  model_id: string;
  code: 'refusal' | 'invalid-output' | 'timeout' | 'api-error' | 'rate-limited' | 'late';
  detail: string | null;
  created_at: string;
}

/**
 * Alle Zeilen einer Tabelle holen – seitenweise und deterministisch sortiert.
 *
 * Supabase liefert höchstens 1000 Zeilen je Anfrage. Ein einfaches `select()`
 * schneidet also still ab, und zwar bei Heap-Reihenfolge genau die neuesten
 * Zeilen – dort, wo ein frischer Invariantenverstoß liegen würde. Die
 * Sortierung ist Pflicht, weil `range()` ohne `order()` keine stabile
 * Seitenaufteilung garantiert und Zeilen doppelt oder gar nicht kommen können.
 */
export async function fetchAll<T>(
  table: string,
  columns: string,
  orderBy: string[],
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    let query = db().from(table).select(columns);
    for (const column of orderBy) query = query.order(column);
    const page = unwrap(await query.range(from, from + pageSize - 1), `${table} lesen`) as T[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

/** ops_config-Wert lesen; fallback, wenn der Key (noch) nicht existiert. */
export async function opsConfig<T>(key: string, fallback: T): Promise<T> {
  const { data, error } = await db().from('ops_config').select('value').eq('key', key).maybeSingle();
  if (error) throw new Error(`ops_config "${key}": ${error.message}`);
  return (data?.value as T) ?? fallback;
}

/**
 * ops_config-Wert schreiben. Für Jobs, die sich etwas merken müssen – etwa
 * welche Katalog-Einträge schon gemeldet wurden, damit dieselbe Meldung
 * nicht jeden Tag erneut kommt und dadurch aufhört, gelesen zu werden.
 */
export async function setOpsConfig(key: string, value: unknown): Promise<void> {
  const { error } = await db().from('ops_config').upsert({ key, value }, { onConflict: 'key' });
  if (error) throw new Error(`ops_config "${key}" schreiben: ${error.message}`);
}
