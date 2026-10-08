/**
 * Reads public profile data from GitHub's REST API (no token, so it's subject
 * to GitHub's unauthenticated rate limit of 60 requests/hour per IP). One
 * analysis uses about 9 requests.
 */

const API = 'https://api.github.com';
const README_LIMIT = 6;
const USERNAME = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export class GithubError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const request = async (path, { raw = false, signal } = {}) => {
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      signal,
      headers: { Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json' },
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new GithubError('Couldn’t reach GitHub. Check your connection and try again.', 'network');
  }
  if (response.status === 404) throw new GithubError('Not found', 'not_found');
  if ((response.status === 403 || response.status === 429) && response.headers.get('x-ratelimit-remaining') === '0') {
    const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000;
    const when = reset ? new Date(reset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'a little while';
    throw new GithubError(`GitHub’s public API limit was reached for your network. Try again after ${when}.`, 'rate_limited');
  }
  if (!response.ok) throw new GithubError(`GitHub returned an error (${response.status}). Try again shortly.`, 'http');
  return raw ? response.text() : response.json();
};

export const normalizeUsername = (input = '') =>
  input
    .trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .split(/[/?#]/)[0];

export const fetchGithubData = async (input, { signal } = {}) => {
  const username = normalizeUsername(input);
  if (!USERNAME.test(username)) throw new GithubError('That doesn’t look like a GitHub username.', 'invalid');

  let user;
  try {
    user = await request(`/users/${username}`, { signal });
  } catch (error) {
    if (error.code === 'not_found') throw new GithubError(`No GitHub user called “${username}”.`, 'not_found');
    throw error;
  }
  const repos = await request(`/users/${username}/repos?per_page=100&sort=pushed&type=owner`, { signal });
  const events = await request(`/users/${username}/events/public?per_page=100`, { signal }).catch(() => []);

  const now = Date.now();
  const candidates = repos
    .filter((r) => !r.fork)
    .map((r) => ({ r, rank: r.stargazers_count * 3 + Math.max(0, 365 - (now - new Date(r.pushed_at)) / 86400000) / 30 }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, README_LIMIT)
    .map((x) => x.r);
  const readmeTexts = await Promise.all(
    candidates.map((repo) => request(`/repos/${username}/${encodeURIComponent(repo.name)}/readme`, { raw: true, signal }).catch(() => null)),
  );
  const readmes = Object.fromEntries(candidates.map((repo, i) => [repo.name, readmeTexts[i] ? readmeTexts[i].slice(0, 20000) : '']));

  return { user, repos, events: Array.isArray(events) ? events : [], readmes };
};
