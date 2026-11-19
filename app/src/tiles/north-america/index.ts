// North America: the first tile, and the look prototype's board.

import type { TileDef } from '../../engine/tile';
import { buildCity } from './city';
import { SIGNS } from './plan';

export const northAmerica: TileDef = {
  id: 'north-america',
  name: 'North America',
  seed: 20261118,
  signs: SIGNS,
  build: buildCity,
};

export default northAmerica;
