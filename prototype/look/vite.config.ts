import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Development server only: lets the page hand over a picture of itself, which is
 * saved in screenshots/. The page does this through `wimmel.shot(...)`.
 */
function saveShots(): Plugin {
  return {
    name: 'wimmelstadt-save-shots',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__shot', (req, res) => {
        const name = new URL(req.url ?? '', 'http://localhost').searchParams.get('name') ?? '';
        // a plain file name and nothing else, so nothing can be written outside the folder
        if (req.method !== 'POST' || !/^[a-z0-9-]+\.jpg$/.test(name)) {
          res.statusCode = 400;
          res.end('bad request');
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          const dir = resolve(server.config.root, 'screenshots');
          mkdir(dir, { recursive: true })
            .then(() => writeFile(resolve(dir, name), Buffer.concat(chunks)))
            .then(() => res.end('saved'))
            .catch(() => {
              res.statusCode = 500;
              res.end('could not save');
            });
        });
      });
    },
  };
}

// A relative base keeps every asset URL relative to index.html, so the static
// build works from any sub-path (GitHub Pages serves it from /<repo>/...).
export default defineConfig({
  base: './',
  plugins: [saveShots()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
});
