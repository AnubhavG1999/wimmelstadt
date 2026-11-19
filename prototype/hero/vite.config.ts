import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

// The captures (pictures, ledgers and generated models) live outside this
// folder and outside git. The development server hands them to the page.
const CAPTURES = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../captures');
const TYPES: Record<string, string> = {
  '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.glb': 'model/gltf-binary',
};

function serveCaptures(): Plugin {
  return {
    name: 'serve-captures',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/captures', (req, res) => {
        const rel = decodeURIComponent((req.url ?? '/').split('?')[0]);
        res.setHeader('Cache-Control', 'no-store');
        if (rel === '/' || rel === '') {
          // the list of captures: every folder that holds a capture.json
          const names = existsSync(CAPTURES)
            ? readdirSync(CAPTURES).filter((n) => existsSync(join(CAPTURES, n, 'capture.json')))
            : [];
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(names));
          return;
        }
        const file = normalize(join(CAPTURES, rel));
        const inside = file.startsWith(CAPTURES + sep);
        if (!inside || !existsSync(file) || !statSync(file).isFile()) {
          res.statusCode = 404;
          res.end('not found');
          return;
        }
        res.setHeader('Content-Type', TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream');
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [serveCaptures()],
});
