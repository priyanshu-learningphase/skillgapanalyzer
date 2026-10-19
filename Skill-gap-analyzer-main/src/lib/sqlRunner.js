/**
 * Client for the SQL lab worker. Queries that run too long (e.g. a runaway
 * recursive CTE) are stopped by terminating the worker.
 */

let worker = null;
let seq = 0;
const pending = new Map();

const failAll = (error) => {
  for (const p of pending.values()) {
    clearTimeout(p.timer);
    p.resolve({ ok: false, error });
  }
  pending.clear();
};

const getWorker = () => {
  if (worker) return worker;
  worker = new Worker(new URL('../workers/sqlWorker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    const p = pending.get(data.id);
    if (!p) return;
    pending.delete(data.id);
    clearTimeout(p.timer);
    p.resolve(data);
  };
  worker.onerror = (e) => {
    failAll(`The SQL engine failed to load${e.message ? `: ${e.message}` : '.'}`);
    worker?.terminate();
    worker = null;
  };
  return worker;
};

/**
 * Run each query on each dataset.
 * @returns {Promise<{ ok, results?: Array<Array<{ ok, columns, rows, error }>>, error?, timedOut? }>}
 */
export const runSql = ({ datasets, queries, timeoutMs = 8000 }) =>
  new Promise((resolve) => {
    if (queries.some((q) => q.length > 5000)) {
      resolve({ ok: false, error: 'Query is too long (5,000 characters max).' });
      return;
    }
    const id = ++seq;
    const w = getWorker();
    const timer = setTimeout(() => {
      pending.delete(id);
      worker?.terminate();
      worker = null;
      failAll('Stopped.');
      resolve({ ok: false, timedOut: true, error: `Stopped after ${timeoutMs / 1000} seconds. Check for a query that never finishes.` });
    }, timeoutMs);
    pending.set(id, { resolve, timer });
    w.postMessage({ id, datasets, queries });
  });
