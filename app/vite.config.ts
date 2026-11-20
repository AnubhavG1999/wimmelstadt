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

/**
 * Development server only: a stand-in for the backend, for trying the lock on
 * the heroes without the real one. The page uses it when its address says
 * ?heroes=collection&backend=stand-in. It answers the few questions the app
 * asks of Supabase, in Supabase's own words, and its heroes are the ones made
 * from the captures. Its PIN is 1234, which opens nothing but this.
 *
 * It can be put out of sorts to see what the app makes of that, with a POST to
 * /__backend/__set and one or more of:
 *
 *   {"asleep": true}     nothing is answered, as when the project is paused
 *   {"ended": true}      every session is over, as after the PIN was changed
 *   {"busy": true}       too many tries
 *   {"lasts": 5}         how many seconds a session's token is good for
 *   {"only": 1}          how many heroes it admits to having
 */
function standInBackend(): Plugin {
  const PIN = '1234';
  const state = { asleep: false, ended: false, busy: false, lasts: 3600, only: Infinity };
  /** The sessions that stand, each under its refresh token. */
  const sessions = new Set<string>();
  let serial = 0;
  return {
    name: 'wimmelstadt-stand-in-backend',
    apply: 'serve',
    configureServer(server) {
      const root = capturesDir(server.config.root);
      const heroes = (): Record<string, unknown>[] => (existsSync(root) ? readdirSync(root) : []).flatMap((capture) => {
        const file = resolve(root, capture, 'hero', 'hero.json');
        if (!existsSync(file)) return [];
        const h = JSON.parse(readFileSync(file, 'utf8')) as { name: string; length: number; turn: number; triangles: number; model: string; made: string };
        return [{ capture, name: h.name, length: h.length, turn: h.turn, triangles: h.triangles, model_path: `${capture}/${h.model}`, updated_at: h.made }];
      }).slice(0, state.only);

      server.middlewares.use('/__backend', (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost');
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          const json = (status: number, body: unknown): void => {
            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(body));
          };
          let sent: Record<string, unknown> = {};
          try { sent = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as Record<string, unknown>; } catch { /* not JSON: nothing was sent */ }
          const grant = (): void => {
            const refresh = `stand-in-refresh-${++serial}`;
            sessions.add(refresh);
            // the access token says when it runs out, which is all the stand-in checks of it
            json(200, { access_token: `stand-in-access-${Date.now() + state.lasts * 1000}`, refresh_token: refresh, expires_in: state.lasts, token_type: 'bearer' });
          };
          /** Whether a request carries a token that has not run out. */
          const signedIn = (): boolean => {
            const until = Number(/^Bearer stand-in-access-(\d+)$/.exec(req.headers.authorization ?? '')?.[1] ?? 0);
            return until > Date.now();
          };

          if (url.pathname === '/__set' && req.method === 'POST') {
            Object.assign(state, sent);
            if (state.ended) sessions.clear();
            json(200, state);
          } else if (state.asleep) {
            json(540, { message: 'Project paused' });
          } else if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
            if (state.busy) json(429, { code: 429, error_code: 'over_request_rate_limit', msg: 'Request rate limit reached' });
            else if (sent.password !== PIN) json(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
            else {
              state.ended = false;
              grant();
            }
          } else if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token') {
            // a session is renewed with its token once, and the token is spent
            if (typeof sent.refresh_token === 'string' && sessions.delete(sent.refresh_token)) grant();
            else json(400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' });
          } else if (url.pathname === '/auth/v1/logout') {
            res.statusCode = 204;
            res.end();
          } else if (url.pathname === '/rest/v1/heroes') {
            if (signedIn()) json(200, heroes());
            else json(401, { code: 'PGRST303', message: 'JWT expired' });
          } else if (url.pathname.startsWith('/storage/v1/object/authenticated/heroes/')) {
            const m = /^\/storage\/v1\/object\/authenticated\/heroes\/([a-z0-9-]+)\/([a-z0-9-]+\.glb)$/.exec(decodeURIComponent(url.pathname));
            const file = m ? resolve(root, m[1], 'hero', m[2]) : '';
            if (!signedIn()) json(400, { statusCode: '403', error: 'Unauthorized', message: 'jwt expired' });
            else if (!m || !existsSync(file)) json(400, { statusCode: '404', error: 'not_found', message: 'Object not found' });
            else {
              res.setHeader('Content-Type', 'model/gltf-binary');
              res.end(readFileSync(file));
            }
          } else {
            json(404, { message: 'not found' });
          }
        });
      });
    },
  };
}

// A relative base keeps every asset URL relative to index.html, so the static
// build works from any sub-path.
export default defineConfig({
  base: './',
  plugins: [saveShots(), serveHeroes(), standInBackend()],
  // One port, and no other if it is taken, so that a preview always knows where
  // the app is. A second copy of the app, such as one in a worktree, is given
  // its own: npm run dev -- --port 5191
  //
  // It listens on 127.0.0.1 and nowhere else. Left to itself it listens on
  // whatever "localhost" comes to first on the machine, which on some is the
  // IPv6 loopback alone. Spotify takes a loopback address as a redirect
  // address only if it is written as a number, so the link to Spotify is made
  // at http://127.0.0.1:<port>/, and the server has to be there. A browser
  // that is asked for localhost finds it there as well.
  server: { host: '127.0.0.1', port: 5187, strictPort: true },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
});
