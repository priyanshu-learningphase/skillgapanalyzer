/**
 * SQL lab worker: runs queries in an in-memory SQLite database (sql.js).
 * Every query gets a fresh database built from the dataset, so queries can't
 * affect each other. Runs off the main thread and can be terminated.
 */

import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url';

let SQL = null;

const runOne = (schema, query) => {
  const db = new SQL.Database();
  try {
    db.exec(schema);
    const out = db.exec(query);
    const last = out[out.length - 1] || { columns: [], values: [] };
    return { ok: true, columns: last.columns, rows: last.values.slice(0, 200), truncated: last.values.length > 200 };
  } catch (error) {
    return { ok: false, error: error.message };
  } finally {
    db.close();
  }
};

self.onmessage = async ({ data }) => {
  const { id, datasets, queries } = data;
  try {
    SQL ||= await initSqlJs({ locateFile: () => wasmUrl });
    const results = datasets.map((schema) => queries.map((query) => runOne(schema, query)));
    self.postMessage({ id, ok: true, results });
  } catch (error) {
    self.postMessage({ id, ok: false, error: `The SQL engine couldn’t start: ${error.message}` });
  }
};
