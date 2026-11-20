// The Iron Rain: the Lion's Rain over Agea, from Pierce Brown's Golden Son. A
// slice of terraformed Mars as a dome, the city of Agea in a trench of the
// Valles Marineris across its crown, the Augustan and Bellona fleets in the
// sky, and the Rain falling from them. Traffic keeps right.

import type { TileDef } from '../../engine/tile';
import { buildIronRain } from './city';
import { buildShow } from './show';
import { SIGNS } from './signs';

/**
 * Mars for the map on the desk, which is of Earth: a round planet that has
 * rolled onto the map, in the open North Pacific, clear of Hawaii and of what
 * the map draws elsewhere. Its corners are so many degrees east and north of
 * the tile's place, which is Agea's: in the Valles Marineris, a little south of
 * the planet's equator, so a little south of the disc's middle.
 */
const MARS: [number, number][] = Array.from({ length: 28 }, (_, i): [number, number] => {
  const a = (i / 28) * Math.PI * 2;
  return [Math.cos(a) * 3.6, 0.8 + Math.sin(a) * 3.4];
});

export const ironRain: TileDef = {
  id: 'red-rising',
  name: 'The Iron Rain',
  // the year of the Lion's Rain, after the Conquering
  seed: 742,
  signs: SIGNS,
  place: { lon: -166, lat: 34.2, land: MARS, words: 'Mars' },
  build: (k) => {
    const parts = buildIronRain(k);
    // what moves over the tile and on it, once everything that stands still is built
    buildShow(k);
    return parts;
  },
};

// the default export is what puts a tile on the board: see ../index.ts
export default ironRain;
