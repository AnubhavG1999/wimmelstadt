// Urbana-Champaign: the campus of the University of Illinois, with Campustown
// to its west and a strip of Urbana to its east.

import type { TileDef } from '../../engine/tile';
import { buildCity } from './city';
import { SIGNS } from './plan';

export const uiuc: TileDef = {
  id: 'uiuc',
  name: 'Urbana-Champaign',
  // the dialling code, not a date
  seed: 217,
  signs: SIGNS,
  build: buildCity,
};

export default uiuc;
