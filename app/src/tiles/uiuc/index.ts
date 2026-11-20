// Urbana-Champaign: the campus of the University of Illinois, with Campustown
// to its west and a strip of Urbana to its east.

import type { TileDef } from '../../engine/tile';
import { buildCity } from './city';
import { SIGNS } from './models';

export const uiuc: TileDef = {
  id: 'uiuc',
  name: 'Urbana-Champaign',
  // the dialling code, not a date
  seed: 217,
  // the campus, in the middle of Illinois
  place: { lon: -88.2, lat: 40.1 },
  signs: SIGNS,
  build: buildCity,
};

export default uiuc;
