/**
 * Market insights (browser side). Talks to our /api/market, which holds the
 * provider keys server-side.
 */

export class MarketRequestError extends Error {
  constructor(message, status = 0, notConfigured = false) {
    super(message);
    this.status = status;
    this.notConfigured = notConfigured;
  }
}

let statusPromise = null;

/** Whether the server has a market data provider. Cached for the session. */
export const getMarketStatus = ({ refresh = false } = {}) => {
  if (!statusPromise || refresh) {
    statusPromise = fetch('/api/health', { headers: { accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => ({ enabled: Boolean(data?.market?.enabled), reachable: true }))
      .catch(() => ({ enabled: false, reachable: false }));
  }
  return statusPromise;
};

export const fetchMarketInsights = async ({ role, location, level }) => {
  // Skip the request when the server has already said it has no provider.
  const status = await getMarketStatus();
  if (status.reachable && !status.enabled) throw new MarketRequestError('Not configured.', 501, true);
  const params = new URLSearchParams({ role, location, level });
  let response;
  try {
    response = await fetch(`/api/market?${params}`, { headers: { accept: 'application/json' } });
  } catch {
    throw new MarketRequestError('Couldn’t reach the server.');
  }
  const data = await response.json().catch(() => ({}));
  if (response.status === 501 || data.configured === false) throw new MarketRequestError(data.message || 'Not configured.', 501, true);
  if (response.status === 404 && !data.error) throw new MarketRequestError('The insights API isn’t available on this deployment.', 404, true);
  if (!response.ok) throw new MarketRequestError(data.message || `The server returned ${response.status}.`, response.status);
  return data;
};
