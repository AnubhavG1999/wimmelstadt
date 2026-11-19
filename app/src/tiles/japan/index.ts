// Japan: Fuji and a mountain pass, Kyoto and Tokyo, and the Wangan out over the
// bay to Daikoku. Traffic keeps left.

import type { TileDef } from '../../engine/tile';
import { buildJapan } from './city';
import { PLACE_SIGNS, ROAD_SIGNS, SCENE_SIGNS, SIGNS } from './signs';

export const japan: TileDef = {
  id: 'japan',
  name: 'Japan',
  seed: 20261119,
  signs: [...SIGNS, ...ROAD_SIGNS, ...PLACE_SIGNS, ...SCENE_SIGNS],
  build: buildJapan,
};

export default japan;
