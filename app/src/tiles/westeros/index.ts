// Westeros: the whole continent on one board. The Wall across the north, the
// kingsroad from the Wall to Storm's End, and three dragons in the air.
// Traffic keeps left.

import type { TileDef } from '../../engine/tile';
import { buildWesteros } from './city';
import { SIGNS } from './signs';

export const westeros: TileDef = {
  id: 'westeros',
  name: 'Westeros',
  // the number of kingdoms, seven times over
  seed: 7777777,
  signs: SIGNS,
  build: buildWesteros,
};

// the default export is what puts a tile on the board: see ../index.ts
export default westeros;
