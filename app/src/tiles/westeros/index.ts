// Westeros: the whole continent on one board. The Wall across the north, the
// kingsroad from the Wall to Storm's End, and three dragons in the air.
// Traffic keeps left.

import type { TileDef } from '../../engine/tile';
import { buildWesteros } from './city';
import { SIGNS } from './signs';

/**
 * The coast of Westeros for the map on the desk, as corners so many degrees
 * east and north of the tile's place. It is this tile's own drawing, from how
 * the books describe the land: long and narrow, the North broad, the Neck
 * narrow between the Bite and Blazewater Bay, the Fingers and the Vale
 * reaching east, the bays of Crabs and of the Blackwater, Cape Wrath, the
 * arm of Dorne stretched out to the east, and the west coast back up past the
 * Reach, the Rock, Ironman's Bay and Sea Dragon Point. Beyond the Wall the
 * land runs off the top.
 */
const COAST: [number, number][] = [
  [-4.5, 13.5], [-1.5, 13.2], [1.5, 13.6], [4.2, 13.2],
  // the east coast, southwards
  [4.8, 11.5], [3.6, 10.2], [4.6, 8.6], [5.2, 7.0], [4.4, 5.4], [2.6, 4.6], [3.4, 3.4], [5.6, 3.8], [6.2, 2.6], [5.0, 1.8], [6.0, 0.6],
  [4.8, -0.4], [3.2, 0.2], [4.6, -1.4], [3.4, -2.4], [4.4, -3.6], [3.8, -5.0], [5.0, -6.2], [3.6, -7.2], [5.2, -8.2], [7.6, -8.6],
  // Dorne's south coast, westwards
  [6.4, -9.8], [3.6, -10.6], [0.6, -11.8], [-2.2, -11.2], [-3.4, -12.6], [-4.6, -11.0],
  // the west coast, northwards
  [-4.0, -8.6], [-5.2, -6.6], [-4.4, -4.6], [-5.6, -3.0], [-4.6, -1.2], [-5.8, 0.2], [-3.6, 1.0], [-4.8, 2.4], [-2.8, 3.2],
  [-4.4, 4.6], [-6.0, 5.4], [-5.0, 6.8], [-6.6, 8.0], [-5.2, 9.4], [-6.2, 11.0], [-4.8, 12.2],
];

export const westeros: TileDef = {
  id: 'westeros',
  name: 'Westeros',
  // the number of kingdoms, seven times over
  seed: 7777777,
  signs: SIGNS,
  // It is in no atlas, so it brings its own land: in the empty south of the Pacific, where an old map has room for it.
  // West and north of the sea serpent that the map has at 118 west and 47 south.
  place: { lon: -139, lat: -30, land: COAST, words: 'Hic sunt dracones' },
  build: buildWesteros,
};

// the default export is what puts a tile on the board: see ../index.ts
export default westeros;
