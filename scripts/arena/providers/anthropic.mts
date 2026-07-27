/**
 * Anthropic – Messages API mit dem web_search-Server-Tool.
 *
 * Das Server-Tool läuft anbieterseitig: ein einziger Request genügt, es gibt
 * keine Tool-Loop im Runner. max_uses begrenzt die Suchtiefe auf die
 * Harness-Obergrenze.
 */
import { num, postJson, ProviderError, type CallRequest, type CallResult } from './types.mts';
import { HARNESS_LIMITS } from '../../../src/arena/lib/harness/config.ts';

export async function callAnthropic(request: CallRequest): Promise<CallResult> {
  const started = Date.now();
  const body: Record<string, unknown> = {
    model: request.model.api_model,
    system: request.system,
    messages: [{ role: 'user', content: request.user }],
    max_tokens: request.maxOutputTokens,
    ...(request.search
      ? {
          tools: [
            { type: 'web_search_20250305', name: 'web_search', max_uses: HARNESS_LIMITS.maxToolCalls },
          ],
        }
      : {}),
    ...(request.model.extra ?? {}),
  };

  const raw = (await postJson(
    'https://api.anthropic.com/v1/messages',
    { 'x-api-key': request.apiKey, 'anthropic-version': '2023-06-01' },
    body,
    request.timeoutMs,
  )) as Record<string, unknown>;

  const content = Array.isArray(raw.content) ? (raw.content as Record<string, unknown>[]) : [];
  const parts: string[] = [];
  for (const block of content) {
    if (block.type === 'text' && typeof block.text === 'string') parts.push(block.text);
  }

  if (raw.stop_reason === 'refusal') {
    throw new ProviderError('Modell hat die Antwort verweigert.', 'refusal', false);
  }

  const usage = (raw.usage ?? {}) as Record<string, unknown>;
  const serverToolUse = (usage.server_tool_use ?? {}) as Record<string, unknown>;
  return {
    text: parts.join('\n'),
    usage: {
      inputTokens: num(usage.input_tokens),
      outputTokens: num(usage.output_tokens),
      searchCalls: num(serverToolUse.web_search_requests),
    },
    reportedModel: typeof raw.model === 'string' ? raw.model : null,
    latencyMs: Date.now() - started,
  };
}
