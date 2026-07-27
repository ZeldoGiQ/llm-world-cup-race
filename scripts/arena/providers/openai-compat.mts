/**
 * OpenAI-kompatible Chat-Completions – deckt xAI, Alibaba (Qwen), Moonshot
 * (Kimi), DeepSeek und jeden weiteren Anbieter dieser Art ab.
 *
 * Der einzige Unterschied zwischen ihnen ist, WIE Web-Suche eingeschaltet wird.
 * Das steht als `search_mode` in der providers-Tabelle – ein neuer Anbieter
 * braucht deshalb nur eine Zeile im Admin, keinen Code.
 */
import { num, postJson, type CallRequest, type CallResult } from './types.mts';

/** Anbieterspezifische Suchparameter, additiv auf den Standard-Body. */
function searchParams(mode: string): Record<string, unknown> {
  switch (mode) {
    // xAI: Live Search über search_parameters
    case 'xai-params':
      return { search_parameters: { mode: 'auto', return_citations: true } };
    // Alibaba/DashScope: enable_search-Flag
    case 'qwen-flag':
      return { enable_search: true };
    // Moonshot/Kimi: eingebautes $web_search-Tool
    case 'kimi-builtin':
      return {
        tools: [{ type: 'builtin_function', function: { name: '$web_search' } }],
      };
    default:
      return {};
  }
}

export async function callOpenAICompat(request: CallRequest): Promise<CallResult> {
  const started = Date.now();
  const baseUrl = (request.provider.base_url ?? '').replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error(
      `Provider "${request.provider.id}": base_url fehlt (im Studio nachtragen).`,
    );
  }

  // `extra` zuerst – siehe openai.mts: Zusatzparameter ja, Überschreiben von
  // Modell, Prompt oder Limits nein.
  const body: Record<string, unknown> = {
    ...(request.model.extra ?? {}),
    model: request.model.api_model,
    messages: [
      { role: 'system', content: request.system },
      { role: 'user', content: request.user },
    ],
    max_tokens: request.maxOutputTokens,
    ...(request.search ? searchParams(request.provider.search_mode) : {}),
  };

  const raw = (await postJson(
    `${baseUrl}/chat/completions`,
    { Authorization: `Bearer ${request.apiKey}` },
    body,
    request.timeoutMs,
  )) as Record<string, unknown>;

  const choices = Array.isArray(raw.choices) ? (raw.choices as Record<string, unknown>[]) : [];
  const parts: string[] = [];
  for (const choice of choices) {
    const message = (choice.message ?? {}) as Record<string, unknown>;
    if (typeof message.content === 'string') parts.push(message.content);
  }

  const usage = (raw.usage ?? {}) as Record<string, unknown>;
  // Such-Aufrufe melden diese APIs uneinheitlich; wo nichts kommt, wird bei
  // aktivierter Suche konservativ 1 gezählt (Kostenschätzung nach oben).
  const reported = num(usage.num_sources_used) || num(usage.search_count);
  return {
    text: parts.join('\n'),
    usage: {
      inputTokens: num(usage.prompt_tokens),
      outputTokens: num(usage.completion_tokens),
      searchCalls: reported || (request.search ? 1 : 0),
    },
    reportedModel: typeof raw.model === 'string' ? raw.model : null,
    latencyMs: Date.now() - started,
  };
}
