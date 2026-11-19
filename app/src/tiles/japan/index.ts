// Japan: Fuji and a mountain pass, Kyoto and Tokyo, and the Wangan out over the
// bay to Daikoku. Traffic keeps left.

import type { TileDef } from '../../engine/tile';
import { NAME_BOARDS, buildJapan } from './city';
import { ROAD_SIGNS, SIGNS } from './signs';

export const japan: TileDef = {
  id: 'japan',
  name: 'Japan',
  seed: 20261119,
  signs: [...SIGNS, ...ROAD_SIGNS, ...NAME_BOARDS],
  build: buildJapan,
};

export default japan;
