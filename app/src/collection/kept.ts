// What the device keeps of the collection: the list of heroes, and each one's
// model. The city is put together from these, so that it never waits for the
// backend, and runs when the backend is asleep or out of reach.

import type { HeroRecord } from './backend';

const SHELF = 'wimmelstadt-heroes-1';
const at = (name: string): string => new URL(`kept/${name}`, document.baseURI).href;
const LIST = at('heroes.json');
/** A model is kept under its place in the file store and the time it last changed, so that a changed one is fetched afresh. */
const modelAt = (hero: HeroRecord): string => at(`${hero.model_path}?v=${encodeURIComponent(hero.updated_at)}`);

/** The shelf, or nothing in a browser that will not keep things: there every start asks the backend. */
async function shelf(): Promise<Cache | null> {
  try {
    return 'caches' in globalThis ? await caches.open(SHELF) : null;
  } catch {
    return null;
  }
}

/** The heroes the device was last told of. */
export async function keptList(): Promise<HeroRecord[]> {
  try {
    const res = await (await shelf())?.match(LIST);
    const list: unknown = res ? await res.json() : null;
    return Array.isArray(list) ? (list as HeroRecord[]) : [];
  } catch {
    return [];
  }
}

/** Keeps the list, and throws out the models that no hero on it uses any more. */
export async function keepList(list: HeroRecord[]): Promise<void> {
  try {
    const c = await shelf();
    if (!c) return;
    await c.put(LIST, new Response(JSON.stringify(list), { headers: { 'Content-Type': 'application/json' } }));
    const wanted = new Set(list.map(modelAt));
    for (const req of await c.keys()) if (req.url !== LIST && !wanted.has(req.url)) await c.delete(req);
  } catch {
    // a full or forgetful device keeps what it can: the backend is asked again next time
  }
}

export async function keptModel(hero: HeroRecord): Promise<ArrayBuffer | null> {
  try {
    const res = await (await shelf())?.match(modelAt(hero));
    return res ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function keepModel(hero: HeroRecord, model: ArrayBuffer): Promise<void> {
  try {
    await (await shelf())?.put(modelAt(hero), new Response(model, { headers: { 'Content-Type': 'model/gltf-binary' } }));
  } catch {
    // as above
  }
}

/** Empties the shelf: the device has been locked. */
export async function forgetAll(): Promise<void> {
  try {
    if ('caches' in globalThis) await caches.delete(SHELF);
  } catch {
    // nothing was kept
  }
}
