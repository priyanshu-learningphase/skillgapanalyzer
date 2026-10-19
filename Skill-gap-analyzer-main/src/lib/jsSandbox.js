/**
 * Run user JavaScript against test cases in an isolated sandbox.
 *
 * Isolation:
 *  - A hidden <iframe sandbox="allow-scripts"> gets an opaque origin, so the
 *    code can't read the app's storage, cookies or DOM.
 *  - Its Content-Security-Policy blocks all network requests (default-src 'none').
 *  - The code runs in a Worker inside that frame; removing the frame stops it,
 *    which is how infinite loops are cut off after the time limit.
 * User code never runs in the app's own window.
 */

const BOOTSTRAP = `<!doctype html><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' blob:; worker-src blob:">
<script>
window.addEventListener('message', function (e) {
  var d = e.data || {};
  if (!d.nonce) return;
  var src = [
    '"use strict";',
    'var __logs = [];',
    'var __fmt = function (v) { try { return typeof v === "string" ? v : JSON.stringify(v); } catch (x) { return String(v); } };',
    'var console = { log: function () { if (__logs.length < 50) __logs.push(Array.prototype.map.call(arguments, __fmt).join(" ")); } };',
    'console.error = console.warn = console.info = console.debug = console.log;',
    d.code,
    ';self.onmessage = function (m) {',
    '  var results = m.data.tests.map(function (args) {',
    '    try {',
    '      if (typeof ' + d.fn + ' !== "function") return { ok: false, error: "Define a function named ' + d.fn + '." };',
    '      var value = ' + d.fn + '.apply(null, args);',
    '      return { ok: true, value: JSON.parse(JSON.stringify(value === undefined ? null : value)) };',
    '    } catch (err) { return { ok: false, error: String((err && err.message) || err) }; }',
    '  });',
    '  postMessage({ results: results, logs: __logs });',
    '};'
  ].join("\\n");
  var worker;
  try {
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  } catch (err) {
    parent.postMessage({ nonce: d.nonce, error: 'The sandbox could not start: ' + err.message }, '*');
    return;
  }
  worker.onmessage = function (m) { parent.postMessage({ nonce: d.nonce, results: m.data.results, logs: m.data.logs }, '*'); worker.terminate(); };
  worker.onerror = function (ev) { ev.preventDefault(); parent.postMessage({ nonce: d.nonce, error: ev.message || 'Your code has an error.' }, '*'); worker.terminate(); };
  worker.postMessage({ tests: d.tests });
});
parent.postMessage({ ready: true }, '*');
</script>`;

const FN_NAME = /^[A-Za-z_$][\w$]*$/;

/**
 * @returns {Promise<{ ok, results?: Array<{ ok, value, error }>, logs?: string[], error?, timedOut? }>}
 */
export const runJsInSandbox = ({ code, functionName, tests, timeoutMs = 4000 }) =>
  new Promise((resolve) => {
    if (!FN_NAME.test(functionName)) {
      resolve({ ok: false, error: 'Invalid function name.' });
      return;
    }
    if (code.length > 20000) {
      resolve({ ok: false, error: 'Code is too long (20,000 characters max).' });
      return;
    }
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
    const nonce = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    let done = false;

    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      iframe.remove(); // also terminates the worker
      resolve(result);
    };
    const onMessage = (e) => {
      if (e.source !== iframe.contentWindow) return;
      const data = e.data || {};
      if (data.ready) {
        iframe.contentWindow.postMessage({ nonce, code, fn: functionName, tests: tests.map((t) => t.args) }, '*');
        return;
      }
      if (data.nonce !== nonce) return;
      finish(data.error ? { ok: false, error: data.error } : { ok: true, results: data.results, logs: data.logs || [] });
    };
    window.addEventListener('message', onMessage);
    const timer = setTimeout(() => finish({ ok: false, timedOut: true, error: `Stopped after ${timeoutMs / 1000} seconds. Check for an infinite loop.` }), timeoutMs);
    iframe.srcdoc = BOOTSTRAP;
    document.body.appendChild(iframe);
  });
