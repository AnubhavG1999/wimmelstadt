// The backend: the Supabase project that holds the collection.
//
// The app only reads from it, and only once the device has been unlocked with
// the PIN. The PIN is the password of one account that everybody who has the
// PIN shares, the viewer. Signing in gives a session, which is kept on the
// device, so the PIN is asked for once there. Changing the PIN ends every
// session, and every device then asks for the new one.
//
// Nothing in this file is secret. The address and the key are the ones that a
// Supabase project hands to every browser, and what they open is decided by
// the project's own rules: see supabase/migrations.

/** One hero as the backend records it. */
export interface HeroRecord {
  capture: string;
  name: string;
  length: number;
  turn: number;
  triangles: number;
  /** Where its model is in the file store. */
  model_path: string;
  /** When the record or the model last changed. */
  updated_at: string;
}

/** How an attempt to unlock went: the PIN was taken, it was wrong, there were too many tries, or the backend could not be asked. */
export type Unlock = 'ok' | 'wrong' | 'slow-down' | 'unreachable';
/** Why a request brought nothing back: the device is locked, or the backend could not be reached. */
export type Miss = 'locked' | 'unreachable';

// On the development server a stand-in can take the backend's place, for trying
// the lock without the real one: ?backend=stand-in. See vite.config.ts.
const standIn = import.meta.env.DEV && new URLSearchParams(location.search).get('backend') === 'stand-in';
const API = standIn ? `${location.origin}/__backend` : 'https://lwsvlajxapcmlcbgccjb.supabase.co';
const KEY = 'sb_publishable_8RergEJpcPGfjZ5uyWFBlw_HJCkZrz4';
/** The account the PIN belongs to. It is not a real address, and no mail can reach it. */
const VIEWER = 'viewer@wimmelstadt.invalid';
/** The name the session is kept under on the device. The stand-in's is kept apart from the real one. */
const STORE = standIn ? 'wimmelstadt.viewer.stand-in' : 'wimmelstadt.viewer';
/** How long the backend is given to answer before the app goes on without it. */
const PATIENCE = 8000;
/** What the backend says when a session is over, or cannot be renewed with what the device holds: the PIN was changed, or the account is gone. */
const ENDED = ['session_not_found', 'session_expired', 'refresh_token_not_found', 'refresh_token_already_used', 'user_not_found', 'user_banned', 'validation_failed', 'invalid_grant'];

interface Session {
  access: string;
  refresh: string;
  /** When the access token runs out, in milliseconds since 1970. */
  until: number;
}

function stored(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Partial<Session> | null;
    return s && typeof s.access === 'string' && typeof s.refresh === 'string' && typeof s.until === 'number' ? (s as Session) : null;
  } catch {
    return null;
  }
}

// kept here as well, for a browser that will not keep anything: there the PIN lasts as long as the page
let session: Session | null = stored();

function keep(s: Session | null): void {
  session = s;
  try {
    if (s) localStorage.setItem(STORE, JSON.stringify(s));
    else localStorage.removeItem(STORE);
  } catch {
    // nothing is kept, and the PIN is asked for again next time
  }
}

function toSession(body: unknown): Session | null {
  const b = (body ?? {}) as { access_token?: unknown; refresh_token?: unknown; expires_in?: unknown };
  if (typeof b.access_token !== 'string' || typeof b.refresh_token !== 'string') return null;
  const seconds = typeof b.expires_in === 'number' && b.expires_in > 0 ? b.expires_in : 3600;
  return { access: b.access_token, refresh: b.refresh_token, until: Date.now() + seconds * 1000 };
}

/** The code of an error the backend sent, if it sent one. */
async function errorCode(res: Response): Promise<string> {
  try {
    const b = (await res.json()) as { error_code?: unknown; error?: unknown };
    return typeof b.error_code === 'string' ? b.error_code : typeof b.error === 'string' ? b.error : '';
  } catch {
    return '';
  }
}

interface Ask { method?: string; body?: string; token?: string }

/** One request. It gives up after a while, so that a backend that is asleep never holds the city up. */
async function send(path: string, ask: Ask = {}): Promise<Response | null> {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), PATIENCE);
  const headers: Record<string, string> = { apikey: KEY };
  if (ask.token) headers.Authorization = `Bearer ${ask.token}`;
  if (ask.body !== undefined) headers['Content-Type'] = 'application/json';
  try {
    return await fetch(API + path, { method: ask.method ?? 'GET', body: ask.body, headers, signal: stop.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Whether the backend answered the question at all, rather than being busy, asleep or broken. */
const answered = (res: Response | null): res is Response => res !== null && res.status !== 429 && res.status < 500;

/** A session that is good for at least another minute, renewed if it has to be. */
function current(): Promise<Session | Miss> {
  const run = async (): Promise<Session | Miss> => {
    // another window of the app may have renewed it since this one last looked
    const s = stored() ?? session;
    if (!s) return 'locked';
    session = s;
    if (s.until - Date.now() > 60_000) return s;
    const res = await send('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: s.refresh }) });
    if (!answered(res)) return 'unreachable';
    if (!res.ok) {
      // only a plain statement that the session is over locks the device: anything else may be a backend out of sorts
      if (!ENDED.includes(await errorCode(res))) return 'unreachable';
      keep(null);
      return 'locked';
    }
    const next = toSession(await res.json().catch(() => null));
    if (!next) return 'unreachable';
    keep(next);
    return next;
  };
  // one window at a time: a session can be renewed with its old token only once
  return navigator.locks ? navigator.locks.request(STORE, run) : run();
}

/** Asks the backend for something as the viewer. */
async function get(path: string): Promise<Response | Miss> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const s = await current();
    if (typeof s === 'string') return s;
    const res = await send(path, { token: s.access });
    if (!answered(res)) return 'unreachable';
    if (res.ok) return res;
    // a token the backend no longer takes is renewed, once, and the question asked again
    if (res.status !== 401 || attempt > 0) return 'unreachable';
    keep({ ...s, until: 0 });
  }
  return 'unreachable';
}

/** Whether this device has been unlocked, as far as it knows. */
export function unlocked(): boolean {
  return (stored() ?? session) !== null;
}

/** Tries the PIN. If it is right, the device stays unlocked from now on. */
export async function unlock(pin: string): Promise<Unlock> {
  const res = await send('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: VIEWER, password: pin }) });
  if (res !== null && res.status === 429) return 'slow-down';
  if (!answered(res)) return 'unreachable';
  if (!res.ok) {
    const code = await errorCode(res);
    return code === 'invalid_credentials' || code === 'invalid_grant' ? 'wrong' : 'unreachable';
  }
  const s = toSession(await res.json().catch(() => null));
  if (!s) return 'unreachable';
  keep(s);
  return 'ok';
}

/** Locks this device again. Everybody else who has the PIN stays as they are. */
export async function lock(): Promise<void> {
  const s = stored() ?? session;
  keep(null);
  if (s) await send('/auth/v1/logout?scope=local', { method: 'POST', token: s.access });
}

/** Whether the session still stands. The backend is asked only if the session is due to be renewed. */
export async function check(): Promise<'good' | Miss> {
  const s = await current();
  return typeof s === 'string' ? s : 'good';
}

const isRecord = (r: unknown): r is HeroRecord => {
  const h = (r ?? {}) as Record<string, unknown>;
  return typeof h.capture === 'string' && typeof h.name === 'string' && typeof h.model_path === 'string' && typeof h.updated_at === 'string'
    && typeof h.length === 'number' && h.length > 0 && typeof h.turn === 'number' && typeof h.triangles === 'number';
};

/** Every hero that is in the city, which leaves out the rested ones, in the order they were added. */
export async function listHeroes(): Promise<HeroRecord[] | Miss> {
  const res = await get('/rest/v1/heroes?select=capture,name,length,turn,triangles,model_path,updated_at&rested=is.false&order=created_at.asc');
  if (typeof res === 'string') return res;
  const rows: unknown = await res.json().catch(() => null);
  return Array.isArray(rows) ? rows.filter(isRecord) : 'unreachable';
}

/** One hero's model, as the file it is. */
export async function fetchModel(hero: HeroRecord): Promise<ArrayBuffer | Miss> {
  const res = await get(`/storage/v1/object/authenticated/heroes/${hero.model_path.split('/').map(encodeURIComponent).join('/')}`);
  if (typeof res === 'string') return res;
  try {
    return await res.arrayBuffer();
  } catch {
    return 'unreachable';
  }
}
