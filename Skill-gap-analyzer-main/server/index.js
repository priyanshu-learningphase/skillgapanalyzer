/**
 * Standalone production server: serves the built SPA from dist/ and the API
 * under /api. Run `npm run build && npm start`.
 */

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from './env.js';
import { createApiMiddleware } from './api.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
loadEnvFile(join(root, '.env'));
loadEnvFile(join(root, '.env.local'));

const distDir = join(root, 'dist');
const port = Number(process.env.PORT) || 8080;
const api = createApiMiddleware(process.env);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

const serveFile = (res, filePath) => {
  const type = MIME[extname(filePath)] || 'application/octet-stream';
  res.setHeader('content-type', type);
  if (filePath.includes(`${sep}assets${sep}`)) res.setHeader('cache-control', 'public, max-age=31536000, immutable');
  createReadStream(filePath).pipe(res);
};

const server = createServer((req, res) => {
  api(req, res, () => {
    if (!existsSync(distDir)) {
      res.statusCode = 500;
      res.end('Build not found. Run `npm run build` first.');
      return;
    }
    const { pathname } = new URL(req.url, 'http://localhost');
    const requested = normalize(join(distDir, decodeURIComponent(pathname)));
    const insideDist = requested.startsWith(distDir + sep);
    if (insideDist && existsSync(requested) && statSync(requested).isFile()) {
      serveFile(res, requested);
    } else {
      serveFile(res, join(distDir, 'index.html')); // SPA fallback
    }
  });
});

server.listen(port, () => {
  console.log(`SkillGap running at http://localhost:${port}`);
});
