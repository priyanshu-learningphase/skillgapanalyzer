/**
 * Job-market data provider: Adzuna (https://developer.adzuna.com), which has
 * an India endpoint. Configure ADZUNA_APP_ID and ADZUNA_APP_KEY on the
 * server; without them /api/market reports "not configured" and the app shows
 * an empty state — it never invents market data.
 *
 * Results are cached in memory for 6 hours per query to stay within the
 * provider's rate limits.
 */

export class MarketError extends Error {
  constructor(message, status = 502, code = 'market_unavailable') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const marketConfigFrom = (env) => ({
  appId: env.ADZUNA_APP_ID || '',
  appKey: env.ADZUNA_APP_KEY || '',
  country: (env.ADZUNA_COUNTRY || 'in').toLowerCase(),
  pages: 2,
  timeoutMs: 15000,
});

export const isMarketConfigured = (config) => Boolean(config.appId && config.appKey);

const CACHE_TTL = 6 * 60 * 60 * 1000;

export const createMarketFetcher = (config, fetchImpl = (...args) => fetch(...args)) => {
  const cache = new Map();
  return async ({ query, where }) => {
    const key = `${config.country}|${query}|${where}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL) return { ...hit.value, cached: true };

    const ads = [];
    let total = null;
    for (let page = 1; page <= config.pages; page += 1) {
      const url = new URL(`https://api.adzuna.com/v1/api/jobs/${config.country}/search/${page}`);
      url.searchParams.set('app_id', config.appId);
      url.searchParams.set('app_key', config.appKey);
      url.searchParams.set('results_per_page', '50');
      url.searchParams.set('what', query);
      if (where) url.searchParams.set('where', where);
      url.searchParams.set('sort_by', 'date');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeoutMs);
      let response;
      try {
        response = await fetchImpl(url.toString(), { headers: { accept: 'application/json' }, signal: controller.signal });
      } catch (error) {
        throw new MarketError(error.name === 'AbortError' ? 'The job-market provider took too long to respond.' : 'Couldn’t reach the job-market provider.', 502);
      } finally {
        clearTimeout(timer);
      }
      if (response.status === 429) throw new MarketError('The job-market provider’s rate limit was reached. Try again later.', 429, 'market_rate_limited');
      if (!response.ok) throw new MarketError(`The job-market provider returned ${response.status}.`, 502);
      const data = await response.json();
      total ??= Number(data.count) || 0;
      const results = Array.isArray(data.results) ? data.results : [];
      ads.push(
        ...results.map((r) => ({
          title: r.title || '',
          description: r.description || '',
          company: r.company?.display_name || '',
          created: r.created || null,
          salary_min: r.salary_min ?? null,
          salary_max: r.salary_max ?? null,
          salary_is_predicted: r.salary_is_predicted ?? '1',
        })),
      );
      if (results.length < 50) break;
    }
    const value = { ads, total, fetchedAt: new Date().toISOString() };
    cache.set(key, { at: Date.now(), value });
    return { ...value, cached: false };
  };
};
