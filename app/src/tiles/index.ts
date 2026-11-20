// The tiles of the city. Every folder beside this file is one tile: its
// index.ts hands the tile over as its default export, and that is all it takes
// for the tile to be found. Nothing in this file names a tile except to say
// where it stands.

import type { TileDef } from '../engine/tile';

const found = import.meta.glob<{ default: TileDef }>('./*/index.ts', { eager: true });

/** The order the tiles stand in on the board. A tile that is not named here comes after these, by name. */
const ORDER = ['north-america', 'japan', 'hong-kong', 'europe', 'delhi', 'uiuc'];
const rank = (t: TileDef): number => (ORDER.includes(t.id) ? ORDER.indexOf(t.id) : ORDER.length);

/** Every tile there is, the hidden ones included. */
export const TILES: TileDef[] = Object.values(found)
  .map((m) => m.default)
  .filter((t): t is TileDef => !!t && typeof t.build === 'function')
  .sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));

/**
 * The tiles to put on the board: all of them, or the ones the address asks for
 * by name, as in `?tiles=north-america`. A name may be given twice, which puts
 * two of that tile on the board. A hidden tile, such as the sample, stands on
 * the board only when it is asked for by name.
 */
export function tilesFor(query: URLSearchParams): TileDef[] {
  const asked = query.get('tiles');
  if (!asked) return TILES.filter((t) => !t.hidden);
  const named = asked.split(',').flatMap((id) => TILES.filter((t) => t.id === id.trim()));
  return named.length > 0 ? named : TILES.filter((t) => !t.hidden);
}
