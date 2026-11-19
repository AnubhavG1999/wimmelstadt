// Japan: Fuji and a mountain pass, Kyoto and Tokyo, and the Wangan out over the
// bay to Daikoku. Traffic keeps left.

import type { TileDef } from '../../engine/tile';
import { NAME_BOARDS, buildJapan } from './city';
import { SIGNS } from './signs';

export const japan: TileDef = {
  id: 'japan',
  name: 'Japan',
  seed: 20261119,
  signs: [...SIGNS, ...NAME_BOARDS],
  build: buildJapan,
};

export default japan;
