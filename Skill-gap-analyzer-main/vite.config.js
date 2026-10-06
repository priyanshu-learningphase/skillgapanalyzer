import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createApiMiddleware } from './server/api.js';

/**
 * Mounts the /api routes inside Vite's dev and preview servers so `npm run dev`
 * is all you need locally. Server-only variables (no VITE_ prefix) are read
 * here and never bundled into client code.
 */
const apiPlugin = (env) => ({
  name: 'skillgap-api',
  configureServer(server) {
    server.middlewares.use(createApiMiddleware(env));
  },
  configurePreviewServer(server) {
    server.middlewares.use(createApiMiddleware(env));
  },
});

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  return {
    plugins: [react(), apiPlugin(env)],
    server: {
      port: 3000,
    },
    build: {
      rollupOptions: {
        output: {
          // Long-lived vendor chunks cache well across deploys.
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  };
});
