// The collection: where the heroes of the city come from.
//
// On the collector's own desk the development server hands the page every hero
// it finds among the captures. Everywhere else the heroes are in the backend,
// behind a PIN. A device that has been unlocked keeps what it was given, and
// from then on the city is put together from the device's own copy: the
// backend is only asked whether anything has changed.

import { heroFromModel, type HeroInfo, type LoadedHero } from '../engine/hero';
import * as backend from './backend';
import type { HeroRecord, Unlock } from './backend';
import { forgetAll, keepList, keepModel, keptList, keptModel } from './kept';

export type { Unlock } from './backend';

/** Where the heroes are looked for: among the captures on the desk, in the collection behind its PIN, or nowhere. */
export type Source = 'desk' | 'collection' | 'none';
/** How things stand with the lock. `open` is a place with no lock at all, such as the desk. */
export type CollectionState = 'open' | 'locked' | 'loading' | 'unlocked';

export interface Collection {
  readonly state: CollectionState;
  /** Tries the PIN. If it is right, the heroes are fetched and join the city as they come. */
  unlock(pin: string): Promise<Unlock>;
  /** Forgets the PIN and the heroes on this device. The heroes already in the city stay until the page is loaded again. */
  lock(): Promise<void>;
}

/** How often an unlocked device asks the backend whether anything has changed, and how soon it asks again when it got no answer. */
const ASK_EVERY = 30 * 60_000, ASK_AGAIN = 60_000;

/** The desk on the development server and the collection everywhere else, unless the address says otherwise: ?heroes=collection */
export function sourceFor(query: URLSearchParams): Source {
  const asked = query.get('heroes');
  if (asked === 'desk' || asked === 'collection' || asked === 'none') return asked;
  return import.meta.env.DEV ? 'desk' : 'collection';
}

/** Every hero the development server has, as the collection would list them. */
async function deskHeroes(): Promise<{ info: HeroInfo; model: ArrayBuffer }[]> {
  try {
    const res = await fetch('captures/heroes.json');
    if (!res.ok || !(res.headers.get('Content-Type') ?? '').includes('json')) return [];
    const found: { info: HeroInfo; model: ArrayBuffer }[] = [];
    for (const info of (await res.json()) as HeroInfo[]) {
      const model = await fetch(`captures/${info.capture}/hero/${info.model}`);
      if (model.ok) found.push({ info, model: await model.arrayBuffer() });
    }
    return found;
  } catch {
    return [];
  }
}

/**
 * Opens the collection. `arrive` is called with each hero as it is ready, at
 * the start and whenever a new one turns up later. Without heroes the city has
 * traffic alone, and that is not an error.
 */
export function openCollection(source: Source, arrive: (heroes: LoadedHero[]) => void): Collection {
  let state: CollectionState = source === 'collection' ? (backend.unlocked() ? 'loading' : 'locked') : 'open';
  /** The heroes handed to the city so far, by capture. */
  const inCity = new Set<string>();

  const hand = async (info: HeroInfo, model: ArrayBuffer): Promise<void> => {
    if (inCity.has(info.capture)) return;
    inCity.add(info.capture);
    try {
      arrive([await heroFromModel(model, info)]);
    } catch (e) {
      inCity.delete(info.capture);
      console.warn(`Could not make a hero of ${info.name}`, e);
    }
  };
  const infoOf = (r: HeroRecord): HeroInfo => ({ capture: r.capture, name: r.name, model: r.model_path, triangles: r.triangles, length: r.length, turn: r.turn });

  /** What the device has kept, straight away. */
  const fromDevice = async (): Promise<void> => {
    for (const r of await keptList()) {
      const model = await keptModel(r);
      if (model) await hand(infoOf(r), model);
    }
  };

  /**
   * What the backend has now. Anything the device lacks is fetched, kept and
   * handed to the city. Returns whether the backend gave all of it.
   */
  const fromBackend = async (): Promise<boolean> => {
    const list = await backend.listHeroes();
    if (list === 'unreachable') return false;
    if (list === 'locked') {
      // the session was ended: the PIN has been changed, and this device no longer has it
      await forgetAll();
      state = 'locked';
      return true;
    }
    let all = true;
    for (const r of list) {
      let model = await keptModel(r);
      if (!model) {
        const fetched = await backend.fetchModel(r);
        if (typeof fetched === 'string') {
          all = false; // not this time: it is asked for again soon
          continue;
        }
        model = fetched;
        await keepModel(r, model);
      }
      await hand(infoOf(r), model);
    }
    await keepList(list);
    return all;
  };

  // one look at the backend at a time, and the next one when it is due
  let looking: Promise<void> | null = null;
  let due = 0;
  const look = (): Promise<void> => {
    looking ??= (async () => {
      let all = false;
      try {
        all = await fromBackend();
      } finally {
        due = Date.now() + (all ? ASK_EVERY : ASK_AGAIN);
        if (state === 'loading') state = 'unlocked';
        looking = null;
      }
    })();
    return looking;
  };

  const start = async (): Promise<void> => {
    if (state !== 'loading') return;
    // a device that has been cut off shows nothing, so the session is settled first. This
    // asks the backend only when the session is due to be renewed, and never waits long.
    const session = await backend.check();
    if (session === 'locked') {
      await forgetAll();
      state = 'locked';
      return;
    }
    await fromDevice();
    if (session === 'good') await look();
    else {
      // out of reach: the device's own copy is the city's, and the backend is asked again soon
      due = Date.now() + ASK_AGAIN;
      state = 'unlocked';
    }
  };

  if (source === 'desk') {
    void deskHeroes().then(async (found) => {
      for (const h of found) await hand(h.info, h.model);
    });
  } else if (source === 'collection') {
    void start();
    const again = (): void => {
      if (state === 'unlocked' && document.visibilityState === 'visible' && Date.now() >= due) void look();
    };
    setInterval(again, ASK_AGAIN);
    document.addEventListener('visibilitychange', again);
  }

  return {
    get state() { return state; },

    async unlock(pin) {
      if (source !== 'collection') return 'unreachable';
      const result = await backend.unlock(pin);
      if (result === 'ok') {
        state = 'loading';
        // asks the browser not to clear the device's copy when it is short of room
        void navigator.storage?.persist?.().catch(() => false);
        void look();
      }
      return result;
    },

    async lock() {
      await backend.lock();
      await forgetAll();
      if (source === 'collection') state = 'locked';
    },
  };
}
