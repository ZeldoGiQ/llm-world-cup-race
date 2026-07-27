/**
 * Google – generateContent mit Google-Search-Grounding.
 *
 * Grounding wird als Tool aktiviert; die Anzahl der Suchanfragen steht in
 * groundingMetadata.webSearchQueries (nicht in usageMetadata).
 */
import { num, postJson, type CallRequest, type CallResult } from './types.mts';

export async function callGoogle(request: CallRequest): Promise<CallResult> {
  const started = Date.now();
  // `extra` zuerst, und generationConfig wird TIEF gemischt: bei Google liegen
  // die naheliegenden Zusatzparameter (thinkingConfig, temperature) innerhalb
  // von generationConfig. Ein flacher Spread würde maxOutputTokens still
  // löschen – die Stellschraube wäre eine Falle.
  const extra = (request.model.extra ?? {}) as Record<string, unknown>;
  const extraGenerationConfig = (extra.generationConfig ?? {}) as Record<string, unknown>;
  const body: Record<string, unknown> = {
    ...extra,
    systemInstruction: { parts: [{ text: request.system }] },
    contents: [{ role: 'user', parts: [{ text: request.user }] }],
    generationConfig: { ...extraGenerationConfig, maxOutputTokens: request.maxOutputTokens },
    ...(request.search ? { tools: [{ google_search: {} }] } : {}),
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
      // Google weist Denk- und Werkzeug-Tokens SEPARAT aus, rechnet sie aber
      // zu den normalen Preisen ab. Ohne sie wäre die Kostenschätzung um ein
      // Vielfaches zu niedrig – und der Budget-Guard würde zu spät greifen.
      inputTokens: num(usage.promptTokenCount) + num(usage.toolUsePromptTokenCount),
      outputTokens: num(usage.candidatesTokenCount) + num(usage.thoughtsTokenCount),
      searchCalls,
    },
    reportedModel: typeof raw.modelVersion === 'string' ? raw.modelVersion : null,
    latencyMs: Date.now() - started,
  };
}
