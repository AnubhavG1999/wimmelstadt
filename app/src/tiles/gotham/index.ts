// Gotham City, from DC's comics: Old Gotham's towers on its upper city, Wayne
// Tower over them and the Bat-Signal on its cloud; the Sprang River between
// its two quays, up the middle of the view to Arkham on its island; Uptown,
// the East End, Ace Chemicals and Amusement Mile on the east bank; and across
// the Gotham River, Wayne Manor on Crest Hill with the Batcave cut open under
// it. Batman, his allies and his rogues have haunts on it and play small
// stories. Traffic keeps right.

import type { TileDef } from '../../engine/tile';
import { buildGotham } from './city';
import { SIGNS } from './signs';

export const gotham: TileDef = {
  id: 'gotham',
  name: 'Gotham City',
  // the year of Detective Comics #27
  seed: 1939,
  signs: SIGNS,
  // the comics put Gotham in New Jersey, and the Atlas of the DC Universe (1990) at about Atlantic City
  place: { lon: -74.42, lat: 39.36 },
  build: (k) => buildGotham(k),
};

// the default export is what puts a tile on the board: see ../index.ts
export default gotham;
