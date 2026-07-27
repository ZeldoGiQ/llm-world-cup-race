/**
 * OpenAI – Responses API mit nativem web_search-Tool.
 *
 * Die Responses API liefert die Antwort als output-Array (Reasoning-Items,
 * Tool-Calls, Message-Items). Wir sammeln alle Textteile ein; der Parser
 * nimmt daraus den letzten JSON-Block.
 */
import { num, postJson, ProviderError, type CallRequest, type CallResult } from './types.mts';

export async function callOpenAI(request: CallRequest): Promise<CallResult> {
  const started = Date.now();
  const body: Record<string, unknown> = {
    model: request.model.api_model,
    instructions: request.system,
    input: request.user,
    max_output_tokens: request.maxOutputTokens,
    ...(request.search ? { tools: [{ type: 'web_search' }] } : {}),
    ...(request.model.extra ?? {}),
  };

  const raw = (await postJson(
    'https://api.openai.com/v1/responses',
    { Authorization: `Bearer ${request.apiKey}` },
    body,
    request.timeoutMs,
  )) as Record<string, unknown>;

  const output = Array.isArray(raw.output) ? raw.output : [];
  const parts: string[] = [];
  let searchCalls = 0;

  for (const item of output as Record<string, unknown>[]) {
    if (item.type === 'web_search_call') searchCalls += 1;
    const content = Array.isArray(item.content) ? (item.content as Record<string, unknown>[]) : [];
    for (const part of content) {
      if (typeof part.text === 'string') parts.push(part.text);
      // Ein Refusal ist ein Ergebnis – als endgültiger Fehler markiert.
      if (part.type === 'refusal' && typeof part.refusal === 'string') {
        throw new ProviderError(part.refusal.slice(0, 200), 'refusal', false);
      }
    }
  }

  const usage = (raw.usage ?? {}) as Record<string, unknown>;
  return {
    text: parts.join('\n'),
    usage: {
      inputTokens: num(usage.input_tokens),
      outputTokens: num(usage.output_tokens),
      searchCalls,
    },
    reportedModel: typeof raw.model === 'string' ? raw.model : null,
    latencyMs: Date.now() - started,
  };
}
