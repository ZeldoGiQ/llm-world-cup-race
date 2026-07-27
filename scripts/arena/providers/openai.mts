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
  // `extra` steht ZUERST: es ist eine Stellschraube für Zusatzparameter, keine
  // Erlaubnis, Modell, Prompt oder Limits zu überschreiben. Andernfalls könnte
  // ein Eintrag im Studio still ein anderes Modell antworten lassen – und die
  // Prediction wäre dem falschen Teilnehmer zugeordnet und nicht mehr löschbar.
  const body: Record<string, unknown> = {
    ...(request.model.extra ?? {}),
    model: request.model.api_model,
    instructions: request.system,
    input: request.user,
    max_output_tokens: request.maxOutputTokens,
    ...(request.search ? { tools: [{ type: 'web_search' }] } : {}),
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
  let refusal: string | undefined;

  for (const item of output as Record<string, unknown>[]) {
    if (item.type === 'web_search_call') searchCalls += 1;
    const content = Array.isArray(item.content) ? (item.content as Record<string, unknown>[]) : [];
    for (const part of content) {
      if (typeof part.text === 'string') parts.push(part.text);
      if (part.type === 'refusal' && typeof part.refusal === 'string') refusal = part.refusal;
    }
  }

  const rawUsage = (raw.usage ?? {}) as Record<string, unknown>;
  const usage = {
    inputTokens: num(rawUsage.input_tokens),
    outputTokens: num(rawUsage.output_tokens),
    searchCalls,
  };

  // Ein Refusal ist ein Ergebnis, kein Transportfehler – endgültig, aber
  // bezahlt: der Verbrauch wird mitgegeben, damit er in api_costs landet.
  if (refusal !== undefined) {
    throw new ProviderError(refusal.slice(0, 200), 'refusal', false, usage);
  }

  return {
    text: parts.join('\n'),
    usage,
    reportedModel: typeof raw.model === 'string' ? raw.model : null,
    latencyMs: Date.now() - started,
  };
}
