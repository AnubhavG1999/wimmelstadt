// Hong Kong: both sides of Victoria Harbour, seen as from Kowloon.

import type { TileDef } from '../../engine/tile';
import { buildCity } from './city';
import { SIGNS } from './signs';

export const hongKong: TileDef = {
  id: 'hong-kong',
  name: 'Hong Kong',
  seed: 852,
  signs: SIGNS,
  build: buildCity,
};

export default hongKong;
