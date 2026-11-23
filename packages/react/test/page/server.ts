// Serves test/page for the package's Playwright specs on a free ephemeral port, apart from the site
// (and from the reserved ports 5173–5177, docs/parallel-plan.md).
import { createServer as createNetServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, type ViteDevServer } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '../../../..');

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createNetServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
}

export async function startTestPage(): Promise<{ url: string; server: ViteDevServer }> {
  const port = await freePort();
  const server = await createServer({
    configFile: false,
    root: here,
    logLevel: 'error',
    optimizeDeps: { include: ['react', 'react-dom/client'] },
    server: { host: '127.0.0.1', port, strictPort: true, fs: { allow: [repo] } },
  });
  await server.listen();
  return { url: `http://127.0.0.1:${port}/`, server };
}
