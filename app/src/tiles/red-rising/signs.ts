// Every sign the tile hangs. Signs are in the Society's tongue, which the
// books write as English, in plain capitals on dark boards. A place keeps the
// books' name. A shop says what is sold there and not whose it is.

import type { SignDef } from '../../engine/signs';
import { FORECAST } from './forecast';
import { boardOf, nameSign } from './look';
import { LOTS } from './plan';
import { REGIONS } from './regions';

/** Names that have a board on a lot that stands as a box: every lot that has a name, so that a lot whose model fails still says what it is. */
const NAMES = [...new Set(LOTS.filter((l) => l.name).map((l) => l.name))];

export const SIGNS: SignDef[] = [FORECAST, ...NAMES.map((n) => nameSign(boardOf(n), n)), ...Object.values(REGIONS).flatMap((r) => r.SIGNS)];
