/**
 * AI service (browser side)
 *
 * Talks to our own /api server — never to the model provider directly, so no
 * API key ever ships to the browser.
 */

export class AiRequestError extends Error {
  constructor(message, code = 'ai_error', status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

let statusPromise = null;

/** Whether the server has AI configured. Cached for the session. */
export const getAiStatus = ({ refresh = false } = {}) => {
  if (!statusPromise || refresh) {
    statusPromise = fetch('/api/health', { headers: { accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => ({ enabled: Boolean(data?.ai?.enabled), model: data?.ai?.model || null, reachable: true }))
      .catch(() => ({ enabled: false, model: null, reachable: false }));
  }
  return statusPromise;
};

const MESSAGES = {
  ai_unavailable: 'AI personalisation is not configured on the server.',
  ai_timeout: 'The AI took too long to respond.',
  ai_rate_limited: 'The AI provider is busy right now.',
  rate_limited: 'Too many roadmap requests — try again in a few minutes.',
  ai_invalid_response: 'The AI returned a roadmap that failed validation.',
};

export const enrichRoadmap = async (request, { signal } = {}) => {
  let response;
  try {
    response = await fetch('/api/roadmap/enrich', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(request),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new AiRequestError('Network error — check your connection.', 'network');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AiRequestError(MESSAGES[data.error] || data.message || 'The AI request failed.', data.error, response.status);
  }
  return data;
};
