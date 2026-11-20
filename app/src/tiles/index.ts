// The tiles of the city. Every folder beside this file is one tile: its
// index.ts hands the tile over as its default export, and that is all it takes
// for the tile to be found. Nothing in this file names a tile except to say
// where it stands.
//
// More tiles are built than the board holds. The board has nine places, and
// every load deals nine of the tiles onto them by chance, unless the device
// keeps a board of its own or one was just set in the picker (ui/picker.ts).
// The tiles that are left out are in the box until another load. See
// docs/adr/0012-the-board-holds-nine-tiles-at-a-time.md.

import type { TileDef } from '../engine/tile';

const found = import.meta.glob<{ default: TileDef }>('./*/index.ts', { eager: true });
/** The picture on each tile's postcard, which stands for the tile in the picker: `postcard.jpg` in the tile's folder. */
const pictures = import.meta.glob<string>('./*/postcard.jpg', { eager: true, query: '?url', import: 'default' });

/** The order the tiles were built in, which `?order=fixed` sets them out in. A tile that is not named here comes after these, by name. */
const ORDER = ['north-america', 'japan', 'hong-kong', 'europe', 'delhi', 'uiuc', 'westeros', 'blackwater-bay', 'red-rising'];
const rank = (t: TileDef): number => (ORDER.includes(t.id) ? ORDER.indexOf(t.id) : ORDER.length);

/** The folder each tile was found in, for the picture that lies beside it. */
const folder = new Map<TileDef, string>();
for (const [path, m] of Object.entries(found)) {
  if (m.default && typeof m.default.build === 'function') folder.set(m.default, path.slice(2, path.lastIndexOf('/')));
}

/** Every tile there is, the hidden ones included. */
export const TILES: TileDef[] = [...folder.keys()].sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));

/** How many tiles stand on the board at a time. */
export const BOARD_SIZE = 9;

/** A tile's postcard: its name, and the address of its picture if its folder has one. */
export interface Postcard { id: string; name: string; picture: string | null }

/** A postcard for every tile that can stand on the board, in the order they were built. */
export const POSTCARDS: Postcard[] = TILES.filter((t) => !t.hidden).map((t) => ({ id: t.id, name: t.name, picture: pictures[`./${folder.get(t)}/postcard.jpg`] ?? null }));

// --- the board a device keeps, and the board that was just set ----------------

const KEPT = 'wimmelstadt.board', SET = 'wimmelstadt.board.set';
/** A place to keep things, or nothing where the browser will not give one. */
const store = (kind: 'local' | 'session'): Storage | null => {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
};
const readBoard = (s: Storage | null, key: string): string[] | null => {
  try {
    const list: unknown = JSON.parse(s?.getItem(key) ?? 'null');
    return Array.isArray(list) && list.every((id) => typeof id === 'string') ? (list as string[]) : null;
  } catch {
    return null;
  }
};
const writeBoard = (s: Storage | null, key: string, ids: string[] | null): void => {
  try {
    if (ids) s?.setItem(key, JSON.stringify(ids));
    else s?.removeItem(key);
  } catch {
    // a browser that keeps nothing: the board is dealt by chance again
  }
};

/** The board this device keeps, place by place, if it keeps one. */
export const keptBoard = (): string[] | null => readBoard(store('local'), KEPT);
/** Keeps a board on this device, so that every load sets it out again, or lets it go. */
export const keepBoard = (ids: string[] | null): void => writeBoard(store('local'), KEPT, ids);
/** Sets the board for the load that follows, and for that load alone. */
export const setBoardOnce = (ids: string[]): void => writeBoard(store('session'), SET, ids);

/**
 * The tiles to put on the board, place by place.
 *
 * - The ones the address asks for by name, in that order, as in `?tiles=japan`.
 *   A name may be given twice, which puts two of that tile on the board, and a
 *   hidden tile, such as the sample, stands on the board only when it is asked
 *   for by name.
 * - With `?order=fixed`, the first nine in the order they were built, for
 *   pictures and checks.
 * - The board that was just set in the picker, or the board this device keeps.
 * - Otherwise nine of the tiles by chance, in an order of chance, new at every
 *   load, so that whoever opens the board finds something new.
 */
export function tilesFor(query: URLSearchParams): TileDef[] {
  const shown = TILES.filter((t) => !t.hidden);
  const asked = query.get('tiles');
  if (asked) {
    const named = asked.split(',').flatMap((id) => TILES.filter((t) => t.id === id.trim()));
    if (named.length > 0) return named;
  }
  if (query.get('order') === 'fixed') return shown.slice(0, BOARD_SIZE);

  const once = readBoard(store('session'), SET);
  writeBoard(store('session'), SET, null);
  const wanted = once ?? keptBoard();
  const board: TileDef[] = [];
  for (const id of wanted ?? []) {
    const t = shown.find((s) => s.id === id);
    if (t && !board.includes(t) && board.length < BOARD_SIZE) board.push(t);
  }
  // the places that are left go to the other tiles, by chance
  const rest = shuffled(shown.filter((t) => !board.includes(t)));
  while (board.length < BOARD_SIZE && rest.length > 0) board.push(rest.shift()!);
  return board;
}

/** A list in a new order of chance. */
function shuffled<T>(list: T[]): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
