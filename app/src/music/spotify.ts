// The link to Spotify: what the listener's own account is playing, read in the
// browser alone.
//
// It uses the Authorization Code flow with PKCE, which Spotify offers to apps
// that cannot keep a secret, as a page on GitHub Pages cannot. The client id
// is public; there is no secret anywhere. The tokens are kept on the device,
// and the page talks to nobody but Spotify's two hosts: accounts.spotify.com
// for the tokens, api.spotify.com for what is playing.
//
// Spotify takes a redirect address only if it is registered for the app
// exactly as it is sent, and it must be https, except on a loopback address
// written as an IP: http://127.0.0.1 or http://[::1], never localhost. So the
// development server is opened at http://127.0.0.1:<port>/ to try the real link.

import { SPOTIFY_CLIENT_ID } from './config';
import type { Music, Track } from './index';

const ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined;
/** The app's id at Spotify: the one the build was given, or else the one in config.ts. Without one the link is off, and nothing is offered or fetched. */
const CLIENT_ID = (typeof ID === 'string' ? ID.trim() : '') || SPOTIFY_CLIENT_ID.trim();
const AUTHORIZE = 'https://accounts.spotify.com/authorize';
const TOKEN = 'https://accounts.spotify.com/api/token';
/** What is playing. Episodes of podcasts are asked for as well as tracks; without that, an episode comes back with no item. */
const PLAYING = 'https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode';
/** Only what reading needs: this one scope is enough for the endpoint above. */
const SCOPE = 'user-read-currently-playing';
/** The name the tokens are kept under on the device, and the name of the lock that guards their renewal. */
const STORE = 'wimmelstadt.music';
/** Where the verifier and the state wait while the browser is away at Spotify. They last as long as the tab. */
const PENDING = 'wimmelstadt.music.pending';
/** How often Spotify is asked what is playing. */
const EVERY = 5000;
/** The longest wait after things have gone wrong. */
const LONGEST = 60_000;
/** How long Spotify is given to answer. */
const PATIENCE = 8000;
/** A token is renewed when it has less than this left, so that it never runs out in the middle of a question. */
const EARLY = 60_000;

interface Tokens {
  access: string;
  refresh: string;
  /** When the access token runs out, in milliseconds since 1970. */
  until: number;
}

type Miss = 'gone' | 'unreachable';

function stored(): Tokens | null {
  try {
    const t = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Partial<Tokens> | null;
    return t && typeof t.access === 'string' && typeof t.refresh === 'string' && typeof t.until === 'number' ? (t as Tokens) : null;
  } catch {
    return null;
  }
}

// kept here as well, for a browser that will not keep anything: there the link lasts as long as the page
let tokens: Tokens | null = stored();

function keep(t: Tokens | null): void {
  tokens = t;
  try {
    if (t) localStorage.setItem(STORE, JSON.stringify(t));
    else localStorage.removeItem(STORE);
  } catch {
    // nothing is kept, and the link is asked for again next time
  }
}

/**
 * Tokens from what the token endpoint answered. When a renewal brings no new
 * refresh token the old one still stands; when it brings one, the old one is
 * spent, so the new one must be kept.
 */
function toTokens(body: unknown, refresh: string | null): Tokens | null {
  const b = (body ?? {}) as { access_token?: unknown; refresh_token?: unknown; expires_in?: unknown };
  if (typeof b.access_token !== 'string') return null;
  const next = typeof b.refresh_token === 'string' && b.refresh_token ? b.refresh_token : refresh;
  if (!next) return null;
  const seconds = typeof b.expires_in === 'number' && b.expires_in > 0 ? b.expires_in : 3600;
  return { access: b.access_token, refresh: next, until: Date.now() + seconds * 1000 };
}

/** The code of an error the token endpoint sent, if it sent one. */
async function errorCode(res: Response): Promise<string> {
  try {
    const b = (await res.json()) as { error?: unknown };
    return typeof b.error === 'string' ? b.error : '';
  } catch {
    return '';
  }
}

/** One request. It gives up after a while, and a network error comes back as null rather than thrown. */
async function send(url: string, init: RequestInit = {}): Promise<Response | null> {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), PATIENCE);
  try {
    return await fetch(url, { ...init, signal: stop.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** A request to the token endpoint, which takes a form rather than JSON. */
function postToken(fields: Record<string, string>): Promise<Response | null> {
  return send(TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields) });
}

/** The page's own address, which is where Spotify sends the browser back to. It must be registered for the app exactly so. */
const redirectAddress = (): string => location.origin + location.pathname;

/** Random letters and digits, from the browser's source of secure randomness. */
function randomText(length: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(length)), (b) => letters[b % letters.length]).join('');
}

/** The challenge that goes with a verifier: its SHA-256, in base64url without padding. */
async function challengeFor(verifier: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  return btoa(String.fromCharCode(...digest)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** Takes what Spotify put in the address on the way back out of it, and leaves every other option as it was. */
function cleanAddress(): void {
  const params = new URLSearchParams(location.search);
  for (const k of ['code', 'state', 'error', 'connect']) params.delete(k);
  const rest = params.toString();
  history.replaceState(history.state, '', location.pathname + (rest ? `?${rest}` : '') + location.hash);
}

/** The verifier and state that were made before the browser went to Spotify, used once and then thrown away. */
function takePending(): { verifier: string; state: string } | null {
  try {
    const p = JSON.parse(sessionStorage.getItem(PENDING) ?? 'null') as { verifier?: unknown; state?: unknown } | null;
    sessionStorage.removeItem(PENDING);
    return p && typeof p.verifier === 'string' && typeof p.state === 'string' ? { verifier: p.verifier, state: p.state } : null;
  } catch {
    return null;
  }
}

/**
 * A token that is good for at least another minute, renewed if it has to be.
 * `rejected` is an access token Spotify has just refused: it is renewed even
 * if it has time left, unless another tab has renewed it already.
 */
function fresh(rejected: string | null): Promise<Tokens | Miss> {
  const run = async (): Promise<Tokens | Miss> => {
    // another tab may have renewed the tokens since this one last looked
    const t = stored() ?? tokens;
    if (!t) return 'gone';
    tokens = t;
    const refused = rejected !== null && t.access === rejected;
    if (!refused && t.until - Date.now() > EARLY) return t;
    const res = await postToken({ grant_type: 'refresh_token', refresh_token: t.refresh, client_id: CLIENT_ID });
    if (res === null || res.status === 429 || res.status >= 500) return 'unreachable';
    if (!res.ok) {
      // only a plain statement that the refresh token is no good ends the link: anything else may be Spotify out of sorts
      if ((await errorCode(res)) !== 'invalid_grant') return 'unreachable';
      keep(null);
      return 'gone';
    }
    const next = toTokens(await res.json().catch(() => null), t.refresh);
    if (!next) return 'unreachable';
    keep(next);
    return next;
  };
  // one tab at a time: a refresh token can be spent only once
  return navigator.locks ? navigator.locks.request(STORE, run) : run();
}

/** The cover nearest 300 pixels across. Spotify lists them widest first. */
function pickCover(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  let best: string | null = null, bestOff = Infinity;
  for (const im of images as { url?: unknown; width?: unknown }[]) {
    if (!im || typeof im.url !== 'string' || !im.url) continue;
    const off = typeof im.width === 'number' ? Math.abs(im.width - 300) : 1e6;
    if (best === null || off < bestOff) {
      best = im.url;
      bestOff = off;
    }
  }
  return best;
}

const text = (v: unknown): string => (typeof v === 'string' ? v : '');

/** What is playing, from Spotify's answer: a track, an episode of a podcast, or nothing (an advert, or nothing at all). */
function readTrack(body: unknown): Track | null {
  const b = (body ?? {}) as { is_playing?: unknown; item?: unknown };
  const item = b.item as {
    type?: unknown; id?: unknown; uri?: unknown; name?: unknown; images?: unknown;
    artists?: unknown; album?: { name?: unknown; images?: unknown } | null; show?: { name?: unknown; images?: unknown } | null;
  } | null | undefined;
  if (!item || typeof item !== 'object' || typeof item.name !== 'string') return null;
  // a local file has no id, but has an address
  const id = text(item.id) || text(item.uri) || item.name;
  const playing = b.is_playing === true;
  if (item.type === 'episode') {
    const show = text(item.show?.name);
    return { id, title: item.name, artist: show, album: show, cover: pickCover(item.images) ?? pickCover(item.show?.images), playing };
  }
  const artists = Array.isArray(item.artists) ? (item.artists as { name?: unknown }[]).map((a) => text(a?.name)).filter(Boolean) : [];
  return { id, title: item.name, artist: artists.join(', '), album: text(item.album?.name), cover: pickCover(item.album?.images), playing };
}

const sameTrack = (a: Track | null, b: Track | null): boolean =>
  a === b || (a !== null && b !== null && a.id === b.id && a.title === b.title && a.artist === b.artist && a.album === b.album && a.cover === b.cover && a.playing === b.playing);

export function openSpotify(query: URLSearchParams, changed: (music: Music) => void): Music {
  let state: Music['state'] = CLIENT_ID ? 'disconnected' : 'off';
  let track: Track | null = null;
  /** Counts links made and ended, so that an answer to a question asked under an older one is thrown away. */
  let epoch = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let busy = false;
  /** How many questions in a row have gone wrong. */
  let failures = 0;
  /** After a refusal or a run of failures, Spotify is not asked again before this time, even when the page comes back into view. */
  let notBefore = 0;

  const music: Music = {
    get state() { return state; },
    get track() { return track; },
    connect,
    disconnect,
  };

  function set(nextState: Music['state'], nextTrack: Track | null): void {
    if (state === nextState && sameTrack(track, nextTrack)) return;
    state = nextState;
    track = nextTrack;
    changed(music);
  }

  function stop(): void {
    clearTimeout(timer);
    timer = undefined;
  }

  function later(ms: number): void {
    stop();
    timer = setTimeout(() => void tick(), ms);
  }

  /** Starts asking, as soon as the page is in view. */
  function begin(): void {
    failures = 0;
    notBefore = 0;
    later(0);
  }

  /** Ends the link on this device. */
  function forget(): void {
    keep(null);
    epoch++;
    stop();
    set('disconnected', null);
  }

  function backoff(): number {
    failures++;
    return Math.min(LONGEST, EVERY * 2 ** failures);
  }

  /** Asks Spotify once what is playing. Returns how long to wait before asking again. */
  async function ask(mine: number): Promise<number> {
    let rejected: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const t = await fresh(rejected);
      if (mine !== epoch) return EVERY;
      if (t === 'gone') {
        forget();
        return EVERY;
      }
      if (t === 'unreachable') return backoff();
      const res = await send(PLAYING, { headers: { Authorization: `Bearer ${t.access}` } });
      if (mine !== epoch) return EVERY;
      if (res === null) return backoff();
      // a token Spotify no longer takes is renewed, once, and the question asked again
      if (res.status === 401 && attempt === 0) {
        rejected = t.access;
        continue;
      }
      if (res.status === 429) {
        // Retry-After is in seconds. A browser can read it only if Spotify lets it, so without it the wait grows as for any failure.
        const header = res.headers.get('Retry-After');
        const seconds = header === null ? NaN : Number(header);
        return Math.max(EVERY, Number.isFinite(seconds) ? seconds * 1000 : backoff());
      }
      if (res.status === 204) {
        failures = 0;
        set('connected', null);
        return EVERY;
      }
      if (res.status === 200) {
        const body: unknown = await res.json().catch(() => undefined);
        if (mine !== epoch) return EVERY;
        if (body === undefined) return backoff();
        failures = 0;
        set('connected', readTrack(body));
        return EVERY;
      }
      return backoff();
    }
    return backoff();
  }

  async function tick(): Promise<void> {
    timer = undefined;
    if (state !== 'connected' || document.visibilityState !== 'visible' || busy) return;
    busy = true;
    const mine = epoch;
    let wait = EVERY;
    try {
      wait = await ask(mine);
    } catch {
      // nothing is thrown out of the timer: whatever went wrong is a failure like any other
      wait = backoff();
    } finally {
      busy = false;
    }
    if (mine !== epoch || state !== 'connected') return;
    notBefore = wait > EVERY ? Date.now() + wait : 0;
    if (document.visibilityState === 'visible') later(wait);
  }

  function connect(): void {
    if (state === 'off') return;
    // Spotify takes a loopback address only when it is written as a number. So
    // a page that was opened at localhost goes to 127.0.0.1 first, and makes
    // the link from there, which is also where the tokens are then kept.
    if (location.hostname === 'localhost') {
      const there = new URL(location.href);
      there.hostname = '127.0.0.1';
      there.searchParams.set('connect', '1');
      location.assign(there.href);
      return;
    }
    const before = state;
    set('connecting', track);
    void (async () => {
      try {
        const verifier = randomText(64), st = randomText(32);
        sessionStorage.setItem(PENDING, JSON.stringify({ verifier, state: st }));
        const url = new URL(AUTHORIZE);
        url.search = new URLSearchParams({
          response_type: 'code',
          client_id: CLIENT_ID,
          scope: SCOPE,
          redirect_uri: redirectAddress(),
          code_challenge_method: 'S256',
          code_challenge: await challengeFor(verifier),
          state: st,
        }).toString();
        location.assign(url.href);
      } catch {
        // a browser that keeps nothing for the tab, or has no secure randomness, cannot make the link
        set(before, track);
        if (before === 'connected') begin();
      }
    })();
  }

  function disconnect(): void {
    if (state === 'off') return;
    try {
      sessionStorage.removeItem(PENDING);
    } catch {
      // nothing was kept
    }
    forget();
  }

  /** Swaps the code Spotify sent back for tokens. */
  async function exchange(code: string, verifier: string): Promise<void> {
    const res = await postToken({ grant_type: 'authorization_code', code, redirect_uri: redirectAddress(), client_id: CLIENT_ID, code_verifier: verifier });
    const next = res !== null && res.ok ? toTokens(await res.json().catch(() => null), null) : null;
    if (next) keep(next);
    // if the exchange failed, a link this device already had still stands
    tokens = next ?? stored() ?? tokens;
    if (tokens) {
      set('connected', null);
      begin();
    } else {
      set('disconnected', null);
    }
  }

  if (state !== 'off') {
    const code = query.get('code'), returned = query.get('state'), error = query.get('error');
    let exchanging = false;
    if (code !== null || error !== null) {
      // the browser has come back from Spotify
      const pending = takePending();
      cleanAddress();
      if (error === null && code && pending && returned === pending.state) {
        exchanging = true;
        state = 'connecting';
        void exchange(code, pending.verifier);
      }
    }
    if (!exchanging && (stored() ?? tokens)) {
      state = 'connected';
      begin();
    }
    if (query.get('connect') === '1') {
      // the page was sent here from localhost to make the link: see `connect`
      cleanAddress();
      if (!exchanging && state === 'disconnected' && location.hostname === '127.0.0.1') connect();
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') stop();
      else if (state === 'connected' && !busy) later(Math.max(0, notBefore - Date.now()));
    });
    // another tab of the app made the link or ended it
    addEventListener('storage', (e) => {
      if (e.key !== STORE && e.key !== null) return;
      const t = stored();
      if (!t && state === 'connected') {
        tokens = null;
        epoch++;
        stop();
        set('disconnected', null);
      } else if (t && state === 'disconnected') {
        tokens = t;
        set('connected', null);
        begin();
      }
    });
  }

  return music;
}
