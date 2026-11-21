// Every sign the tile hangs. Signs are in English, in plain capitals on plain
// boards, never a logo: a place keeps the comics' name, and a shop says what
// is sold there.

import type { SignDef } from '../../engine/signs';
import { boardOf, nameSign } from './look';
import { LOTS } from './plan';
import { REGIONS } from './regions';
import { SCREEN } from './screen';

/** Names that have a board on a lot that stands as a box: every lot that has a name, so that a lot whose model fails still says what it is. */
const NAMES = [...new Set(LOTS.filter((l) => l.name).map((l) => l.name))];

export const SIGNS: SignDef[] = [SCREEN, ...NAMES.map((n) => nameSign(boardOf(n), n)), ...Object.values(REGIONS).flatMap((r) => r.SIGNS)];
