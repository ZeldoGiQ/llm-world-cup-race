/**
 * Google – generateContent mit Google-Search-Grounding.
 *
 * Grounding wird als Tool aktiviert; die Anzahl der Suchanfragen steht in
 * groundingMetadata.webSearchQueries (nicht in usageMetadata).
 */
import { num, postJson, type CallRequest, type CallResult } from './types.mts';

export async function callGoogle(request: CallRequest): Promise<CallResult> {
  const started = Date.now();
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: request.system }] },
    contents: [{ role: 'user', parts: [{ text: request.user }] }],
    generationConfig: { maxOutputTokens: request.maxOutputTokens },
    ...(request.search ? { tools: [{ google_search: {} }] } : {}),
    ...(request.model.extra ?? {}),
  };

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(request.model.api_model)}:generateContent`;

  const raw = (await postJson(
    url,
    { 'x-goog-api-key': request.apiKey },
    body,
    request.timeoutMs,
  )) as Record<string, unknown>;

  const candidates = Array.isArray(raw.candidates) ? (raw.candidates as Record<string, unknown>[]) : [];
  const parts: string[] = [];
  let searchCalls = 0;

  for (const candidate of candidates) {
    const content = (candidate.content ?? {}) as Record<string, unknown>;
    const contentParts = Array.isArray(content.parts) ? (content.parts as Record<string, unknown>[]) : [];
    for (const part of contentParts) {
      if (typeof part.text === 'string') parts.push(part.text);
    }
    const grounding = (candidate.groundingMetadata ?? {}) as Record<string, unknown>;
    if (Array.isArray(grounding.webSearchQueries)) searchCalls += grounding.webSearchQueries.length;
  }

  const usage = (raw.usageMetadata ?? {}) as Record<string, unknown>;
  return {
    text: parts.join('\n'),
    usage: {
      inputTokens: num(usage.promptTokenCount),
      outputTokens: num(usage.candidatesTokenCount),
      searchCalls,
    },
    reportedModel: typeof raw.modelVersion === 'string' ? raw.modelVersion : null,
    latencyMs: Date.now() - started,
  };
}
