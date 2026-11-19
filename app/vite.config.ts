import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Where the captures are. They are private and are never checked in, so a
 * worktree of this repository has none of its own: there they are looked for
 * in the main checkout, which is where the collector keeps them.
 */
function capturesDir(root: string): string {
  const own = resolve(root, '../captures');
  if (existsSync(own)) return own;
  try {
    const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const main = resolve(common, '../captures');
    if (existsSync(main)) return main;
  } catch {
    // not a checkout at all: then there are no captures, and the city has traffic alone
  }
  return own;
}

/**
 * Development server only: lets the page hand over a picture of itself, which is
 * saved in screenshots/. The page does this through `wimmel.shot(...)`. A
 * picture that shows a real hero names that hero's capture, and is saved in
 * the capture's own screenshots/ instead: captures are private, and nothing
 * that shows one belongs in this folder.
 */
function saveShots(): Plugin {
  return {
    name: 'wimmelstadt-save-shots',
    apply: 'serve',
    configureServer(server) {
      const captures = capturesDir(server.config.root);
      server.middlewares.use('/__shot', (req, res) => {
        const query = new URL(req.url ?? '', 'http://localhost').searchParams;
        const name = query.get('name') ?? '', capture = query.get('capture');
        // a plain file name, and at most the plain name of a capture that exists, so nothing can be written anywhere else
        const known = capture === null || (/^[a-z0-9-]+$/.test(capture) && existsSync(resolve(captures, capture)));
        if (req.method !== 'POST' || !/^[a-z0-9-]+\.jpg$/.test(name) || !known) {
          res.statusCode = 400;
          res.end('bad request');
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          const dir = capture === null ? resolve(server.config.root, 'screenshots') : resolve(captures, capture, 'screenshots');
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

/**
 * Development server only: serves the heroes made from the captures in the
 * folder beside this one. Captures are private and never leave this machine,
 * so a built copy of the app simply has no heroes until the backend holds them.
 *
 *   /captures/heroes.json                 every capture that has a hero
 *   /captures/<capture>/hero/<file>       its model
 */
function serveHeroes(): Plugin {
  return {
    name: 'wimmelstadt-serve-heroes',
    apply: 'serve',
    configureServer(server) {
      const root = capturesDir(server.config.root);
      server.middlewares.use('/captures', (req, res) => {
        const path = decodeURIComponent(new URL(req.url ?? '', 'http://localhost').pathname);
        if (path === '/heroes.json') {
          const heroes = (existsSync(root) ? readdirSync(root) : []).flatMap((capture) => {
            const file = resolve(root, capture, 'hero', 'hero.json');
            return existsSync(file) ? [{ capture, ...JSON.parse(readFileSync(file, 'utf8')) }] : [];
          });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(heroes));
          return;
        }
        // one capture's hero folder, a plain file name, and nothing else
        const m = /^\/([a-z0-9-]+)\/hero\/([a-z0-9-]+\.(glb|json))$/.exec(path);
        const file = m ? resolve(root, m[1], 'hero', m[2]) : '';
        if (!m || !existsSync(file)) {
          res.statusCode = 404;
          res.end('not found');
          return;
        }
        res.setHeader('Content-Type', m[3] === 'glb' ? 'model/gltf-binary' : 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(readFileSync(file));
      });
    },
  };
}

// A relative base keeps every asset URL relative to index.html, so the static
// build works from any sub-path.
export default defineConfig({
  base: './',
  plugins: [saveShots(), serveHeroes()],
  // One port, and no other if it is taken, so that a preview always knows where
  // the app is. A second copy of the app, such as one in a worktree, is given
  // its own: npm run dev -- --port 5191
  server: { port: 5187, strictPort: true },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
});
