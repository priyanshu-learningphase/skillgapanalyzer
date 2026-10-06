/**
 * Gemini provider
 *
 * Calls the Gemini REST API directly (no SDK) with structured JSON output.
 * Swap this module to use a different model provider; the rest of the server
 * only depends on `generateJson`.
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export class AiProviderError extends Error {
  constructor(message, { status = 502, code = 'ai_error' } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Gemini's responseSchema expects upper-case OpenAPI type names. */
const toGeminiSchema = (schema) => {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (!schema || typeof schema !== 'object') return schema;
  const out = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'type' && typeof value === 'string') out.type = value.toUpperCase();
    else if (key === 'properties') {
      out.properties = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toGeminiSchema(v)]));
    } else out[key] = toGeminiSchema(value);
  }
  return out;
};

export const generateJson = async ({ apiKey, model, timeoutMs, systemPrompt, payload, schema }) => {
  if (!apiKey) throw new AiProviderError('AI is not configured on the server.', { status: 503, code: 'ai_unavailable' });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload) }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 16384,
          responseMimeType: 'application/json',
          responseSchema: toGeminiSchema(schema),
        },
      }),
    });
  } catch (error) {
    const timedOut = error.name === 'AbortError';
    throw new AiProviderError(timedOut ? 'The AI request timed out.' : 'Could not reach the AI provider.', {
      status: timedOut ? 504 : 502,
      code: timedOut ? 'ai_timeout' : 'ai_network',
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // Don't forward provider error bodies to the client; they can echo request details.
    const detail = await response.text().catch(() => '');
    console.error(`[skillgap] Gemini ${response.status}: ${detail.slice(0, 500)}`);
    const code = response.status === 429 ? 'ai_rate_limited' : 'ai_error';
    throw new AiProviderError(
      response.status === 429 ? 'The AI provider is rate limiting requests.' : 'The AI provider returned an error.',
      { status: response.status === 429 ? 429 : 502, code },
    );
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!text) throw new AiProviderError('The AI provider returned an empty response.', { code: 'ai_empty' });
  try {
    return JSON.parse(text);
  } catch {
    throw new AiProviderError('The AI response was not valid JSON.', { code: 'ai_invalid_json' });
  }
};
