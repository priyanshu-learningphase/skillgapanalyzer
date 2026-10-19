/**
 * Python execution (browser side) via our own /api/execute, which forwards
 * to a configured Judge0 service. The browser never talks to the provider.
 */

import { buildPythonProgram, parsePythonOutput } from '../lib/labGrading';

let statusPromise = null;

/** Which server-side languages are available. Cached for the session. */
export const getExecutionStatus = ({ refresh = false } = {}) => {
  if (!statusPromise || refresh) {
    statusPromise = fetch('/api/health', { headers: { accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => ({ enabled: Boolean(data?.execution?.enabled), languages: data?.execution?.languages || [], reachable: true }))
      .catch(() => ({ enabled: false, languages: [], reachable: false }));
  }
  return statusPromise;
};

/** Run every test of a challenge in Python; returns the same shape as the JS sandbox. */
export const runPythonTests = async (challenge, code) => {
  let response;
  try {
    response = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ language: 'python', code: buildPythonProgram(challenge, code) }),
    });
  } catch {
    return { ok: false, error: 'Couldn’t reach the server.' };
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, error: data.message || `The server returned ${response.status}.` };
  const results = parsePythonOutput(data.stdout);
  if (!results) return { ok: false, error: data.stderr ? data.stderr.split('\n').filter(Boolean).slice(-3).join('\n') : `Your program didn’t finish (${data.status}).` };
  const logs = String(data.stdout || '')
    .split('\n')
    .filter((l) => l && !l.startsWith('__SKILLGAP_RESULTS__'))
    .slice(0, 50);
  return { ok: true, results, logs };
};
