/**
 * Code execution for languages the browser can't run safely (Python).
 *
 * Integration boundary for a Judge0-compatible service
 * (https://judge0.com — self-hosted or a hosted plan). Configure:
 *   JUDGE0_URL          base URL, e.g. https://judge0.example.com
 *   JUDGE0_KEY          optional API key
 *   JUDGE0_AUTH_HEADER  header for the key (default X-Auth-Token; RapidAPI uses X-RapidAPI-Key)
 *   JUDGE0_PYTHON_ID    language id for Python 3 (default 71)
 * Without JUDGE0_URL the endpoint reports "not configured" and the app labels
 * Python challenges as unavailable — nothing is faked.
 */

export class ExecutionError extends Error {
  constructor(message, status = 502, code = 'execution_failed') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const executionConfigFrom = (env) => ({
  url: (env.JUDGE0_URL || '').replace(/\/+$/, ''),
  key: env.JUDGE0_KEY || '',
  authHeader: env.JUDGE0_AUTH_HEADER || 'X-Auth-Token',
  languages: { python: Number(env.JUDGE0_PYTHON_ID) || 71 },
  timeoutMs: 20000,
});

export const MAX_CODE = 20000;
export const MAX_STDIN = 50000;

export const validateExecutionRequest = (body, config) => {
  if (!body || typeof body !== 'object') return 'Body must be a JSON object.';
  if (!config.languages[body.language]) return `Unsupported language. Supported: ${Object.keys(config.languages).join(', ')}.`;
  if (typeof body.code !== 'string' || !body.code.trim()) return 'Code is required.';
  if (body.code.length > MAX_CODE) return `Code is limited to ${MAX_CODE} characters.`;
  if (body.stdin != null && (typeof body.stdin !== 'string' || body.stdin.length > MAX_STDIN)) return `stdin is limited to ${MAX_STDIN} characters.`;
  return null;
};

/** Run code once on the configured Judge0 service and wait for the result. */
export const executeCode = async (config, { language, code, stdin = '' }, fetchImpl = fetch) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetchImpl(`${config.url}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(config.key ? { [config.authHeader]: config.key } : {}) },
      body: JSON.stringify({ language_id: config.languages[language], source_code: code, stdin, cpu_time_limit: 3, wall_time_limit: 6, memory_limit: 128000 }),
      signal: controller.signal,
    });
    if (!response.ok) throw new ExecutionError(`The execution service returned ${response.status}.`, 502);
    const data = await response.json();
    return {
      status: data.status?.description || 'Unknown',
      stdout: (data.stdout || '').slice(0, 20000),
      stderr: (data.stderr || data.compile_output || '').slice(0, 5000),
      time: data.time ?? null,
    };
  } catch (error) {
    if (error.name === 'AbortError') throw new ExecutionError('The execution service took too long to respond.', 504, 'execution_timeout');
    if (error instanceof ExecutionError) throw error;
    throw new ExecutionError('Couldn’t reach the execution service.', 502);
  } finally {
    clearTimeout(timer);
  }
};
