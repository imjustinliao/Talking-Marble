import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { docsData } from './scripts/docs-data.ts';

const coreDir = fileURLToPath(new URL('../../packages/core', import.meta.url));
const genScript = fileURLToPath(new URL('../../packages/react/scripts/gen-core.mjs', import.meta.url));

/** Regenerates the package's copy of packages/core/ (shader, presets) whenever a core file changes in dev. */
function watchCore(): Plugin {
  return {
    name: 'talking-marble-core',
    configureServer(server) {
      server.watcher.add(coreDir);
      server.watcher.on('change', file => {
        if (file.startsWith(coreDir)) execFileSync(process.execPath, [genScript], { stdio: 'inherit' });
      });
    },
  };
}

export default defineConfig({
  // Served from the host's root (Vercel, F-81).
  base: '/',
  plugins: [react(), watchCore(), docsData()],
  // In the workspace, import the package's TypeScript source for instant reloads; releases use dist.
  resolve: { conditions: ['talking-marble-source'] },
  server: { port: 5173, strictPort: true, host: '127.0.0.1' },
  // Two real HTML pages, so search engines and AI crawlers read each without JavaScript.
  build: {
    rollupOptions: {
      input: {
        home: fileURLToPath(new URL('index.html', import.meta.url)),
        docs: fileURLToPath(new URL('docs/index.html', import.meta.url)),
      },
    },
  },
});
