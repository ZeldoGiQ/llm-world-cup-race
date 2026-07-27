/**
 * Der Wettkampf-Ausführer: setzt HARNESS_V1 für jedes Modell identisch durch.
 *
 * Ablauf je (Event × Modell):
 *   1 Versuch + bis zu maxTransportRetries bei Transportfehlern (429/5xx/Timeout)
 *   → Antwort parsen → bei Formatfehler bis zu maxRepairTurns mit festem
 *   Repair-Prompt OHNE Suche → gültiger Wert oder Failure-Code.
 *
 * Werte werden nie koerziert. Jeder Versuch – auch jeder Fehlversuch – wird als
 * api_costs-Zeile erfasst, damit der Budget-Guard die Wahrheit sieht.
 */
import { HARNESS_LIMITS, HARNESS_VERSION } from '../../../src/arena/lib/harness/config.ts';
import { costUsd, recordCost } from '../lib/budget.mts';
import type { ModelRow, ProviderRow } from '../lib/db.mts';
import { getSecret } from '../lib/env.mts';
import { parseAnswer } from '../lib/parse-answer.mts';
import { buildPrompt, buildRepairPrompt, type PromptEvent } from '../lib/prompt.mts';
import { callAnthropic } from './anthropic.mts';
import { callGoogle } from './google.mts';
import { callOpenAICompat } from './openai-compat.mts';
import { callOpenAI } from './openai.mts';
import { ProviderError, type CallRequest, type CallResult, type ProviderAdapter } from './types.mts';

const ADAPTERS: Record<ProviderRow['api_kind'], ProviderAdapter> = {
  openai: callOpenAI,
  anthropic: callAnthropic,
  google: callGoogle,
  'openai-compat': callOpenAICompat,
};

export type FailureCode =
  | 'refusal'
  | 'invalid-output'
  | 'timeout'
  | 'api-error'
  | 'rate-limited'
  | 'late';

export interface AskSuccess {
  ok: true;
  value: Record<string, unknown>;
  provenance: Record<string, unknown>;
  /** Roh-Antwort für die Audit-Spalte predictions.raw – nie öffentlich geloggt. */
  raw: Record<string, unknown>;
}

export interface AskFailure {
  ok: false;
  code: FailureCode;
  detail: string;
}

export type AskResult = AskSuccess | AskFailure;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Backoff zwischen Transport-Retries; kurz gehalten, damit Läufe planbar bleiben. */
const RETRY_DELAYS_MS = [15_000, 60_000];

export interface AskOptions {
  runId: string;
  provider: ProviderRow;
  model: ModelRow;
  event: PromptEvent;
  eventId: string;
}

export async function askModel(options: AskOptions): Promise<AskResult> {
  const { runId, provider, model, event, eventId } = options;
  const apiKey = getSecret(provider.secret_name);
  if (!apiKey) {
    return {
      ok: false,
      code: 'api-error',
      detail: `Secret ${provider.secret_name} nicht gesetzt – Modell übersprungen.`,
    };
  }

  const adapter = ADAPTERS[provider.api_kind];
  const prompt = buildPrompt(event);
  const maxOutputTokens = Math.min(model.max_output_tokens, HARNESS_LIMITS.maxOutputTokens);

  let attempts = 0;
  let repairTurns = 0;
  let userMessage = prompt.user;
  let search = true;
  let lastFailure: AskFailure = { ok: false, code: 'api-error', detail: 'Kein Versuch ausgeführt.' };
  const totals = { inputTokens: 0, outputTokens: 0, searchCalls: 0 };
  let reportedModel: string | null = null;
  let lastLatency = 0;

  while (attempts <= HARNESS_LIMITS.maxTransportRetries + HARNESS_LIMITS.maxRepairTurns) {
    attempts += 1;
    const request: CallRequest = {
      provider,
      model,
      apiKey,
      system: prompt.system,
      user: userMessage,
      search,
      maxOutputTokens,
      timeoutMs: HARNESS_LIMITS.callTimeoutMs,
    };

    let result: CallResult;
    try {
      result = await adapter(request);
    } catch (error) {
      const providerError =
        error instanceof ProviderError
          ? error
          : new ProviderError(error instanceof Error ? error.message : String(error), 'api-error', false);

      // Eine Verweigerung kommt mit HTTP 200 und verbrauchten Tokens: der Call
      // ist bezahlt, auch wenn kein Wert herauskam. Nur echte Transportfehler
      // (kein Response) sind kostenlos.
      const failedUsage = providerError.usage ?? { inputTokens: 0, outputTokens: 0, searchCalls: 0 };
      await recordCost({
        runId,
        modelId: model.id,
        purpose: repairTurns > 0 ? 'repair' : 'predict',
        category: event.category,
        eventId,
        usage: failedUsage,
        costUsd: costUsd(model, failedUsage),
        status: providerError.code,
      });

      lastFailure = { ok: false, code: providerError.code, detail: providerError.message };
      if (!providerError.retryable) return lastFailure;

      const delay = RETRY_DELAYS_MS[Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)];
      console.log(`  ${model.id}: ${providerError.code}, Retry in ${delay / 1000}s`);
      await sleep(delay);
      continue;
    }

    totals.inputTokens += result.usage.inputTokens;
    totals.outputTokens += result.usage.outputTokens;
    totals.searchCalls += result.usage.searchCalls;
    reportedModel = result.reportedModel ?? reportedModel;
    lastLatency = result.latencyMs;

    const parsed = parseAnswer(result.text, event.predictionType);
    await recordCost({
      runId,
      modelId: model.id,
      purpose: repairTurns > 0 ? 'repair' : 'predict',
      category: event.category,
      eventId,
      usage: result.usage,
      costUsd: costUsd(model, result.usage),
      latencyMs: result.latencyMs,
      status: parsed.ok ? 'ok' : `parse-${parsed.reason}`,
    });

    if (parsed.ok) {
      return {
        ok: true,
        value: parsed.value,
        provenance: {
          harnessVersion: HARNESS_VERSION,
          promptHash: prompt.hash,
          apiModel: model.api_model,
          reportedModel,
          requestedAt: event.requestedAt,
          attempts,
          repairTurns,
          latencyMs: lastLatency,
          inputTokens: totals.inputTokens,
          outputTokens: totals.outputTokens,
          searchCalls: totals.searchCalls,
          // Beim Repair-Turn ist die Suche aus – das muss die Provenance sagen,
          // sonst behauptet sie eine Recherche, die nicht stattgefunden hat.
          searchEnabled: search,
          sampling: 'provider-default',
          ...(parsed.rationale ? { rationale: parsed.rationale } : {}),
          ...(parsed.sources.length > 0 ? { sources: parsed.sources } : {}),
        },
        raw: { text: result.text, reportedModel, attempts, repairTurns },
      };
    }

    // Formatfehler: fester Repair-Prompt, keine neue Suche, Wert unverändert.
    lastFailure = { ok: false, code: 'invalid-output', detail: parsed.detail };
    if (repairTurns >= HARNESS_LIMITS.maxRepairTurns) return lastFailure;
    repairTurns += 1;
    search = false;
    // Die Frage MUSS mitgehen. Der Transport ist Single-Turn und trägt keine
    // History – würde hier nur der Repair-Prompt stehen, wüsste das Modell im
    // zweiten Versuch nicht mehr, worum es geht, und lieferte einen
    // schemakonformen, aber erfundenen Wert. Der landet dann unlöschbar in der
    // Datenbank und im öffentlichen Leaderboard.
    userMessage = `${prompt.user}\n\n---\n\n${buildRepairPrompt(event.predictionType, parsed.detail)}`;
    console.log(`  ${model.id}: ${parsed.reason} → Repair-Turn ${repairTurns}`);
  }

  return lastFailure;
}
