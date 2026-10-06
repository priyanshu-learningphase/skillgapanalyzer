/**
 * Minimal .env loader for the standalone server (Vite loads .env itself in
 * development). Existing process variables always take precedence.
 */

import { existsSync, readFileSync } from 'node:fs';

export const loadEnvFile = (path) => {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^(['"])(.*)\1$/, '$2');
  }
};

/** Read AI settings from an env object. Keys never reach the browser bundle. */
export const aiConfigFrom = (env) => {
  const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '';
  if (!env.GEMINI_API_KEY && env.VITE_GEMINI_API_KEY) {
    console.warn(
      '[skillgap] VITE_GEMINI_API_KEY is deprecated. Rename it to GEMINI_API_KEY so it is never exposed to the browser.',
    );
  }
  return {
    apiKey,
    model: env.GEMINI_MODEL || 'gemini-2.5-flash',
    timeoutMs: Number(env.AI_TIMEOUT_MS) || 60000,
  };
};
