// Blackwater Bay in 129 AC: King's Landing with the Dragonpit whole, the
// north shore, Dragonstone and the lairs of the Dragonmont, Driftmark and High
// Tide across the Gullet from Massey's Hook, and ten of the great Targaryen
// dragons. Traffic keeps left.

import type { TileDef } from '../../engine/tile';
import { buildBlackwaterBay } from './city';
import { buildDragons } from './dragons';
import { SIGNS } from './signs';

export const blackwaterBay: TileDef = {
  id: 'blackwater-bay',
  name: 'Blackwater Bay',
  // the year of the tile, 129 AC
  seed: 129,
  signs: SIGNS,
  // On the Westeros tile's own coast, which the map already draws: the inner corner of the bay on its east
  // coast, between Crackclaw Point and Massey's Hook, at [3.4, -2.4] from that tile's place at 139 west, 30 south.
  place: { lon: -135.6, lat: -32.4 },
  build: (k) => {
    const parts = buildBlackwaterBay(k);
    // the dragons last, once the ground and everything built stand: the dragons' show is the main session's (dragons.ts)
    buildDragons(k);
    return parts;
  },
};

// the default export is what puts a tile on the board: see ../index.ts
export default blackwaterBay;
