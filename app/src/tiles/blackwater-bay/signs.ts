// Every sign the tile hangs. Signs are in the Common Tongue, which is English,
// in plain lettering on plain boards, as on the Westeros tile. A place keeps
// the books' name. An inn or a shop says what is sold there and not whose it
// is.

import type { SignDef } from '../../engine/signs';
import { paintGiveWay } from './give-way';
import { nameSign } from './look';
import { LOTS } from './plan';
import { REGIONS } from './regions';

/**
 * The one board that shows what is playing: at the top of the climb to the
 * Dragonpit's forecourt. When nothing plays it is a road sign, GIVE WAY TO
 * DRAGONS, by order of the Dragonkeepers.
 */
export const GIVE_WAY: SignDef = { id: 'give-way', lines: ['GIVE WAY TO DRAGONS', 'by order of the Dragonkeepers'], color: '#efe4c6', aspect: 640 / 360, kind: 'screen', paint: paintGiveWay };

/** The sign of a name board, by the name it carries. */
export const boardOf = (name: string): string => `name-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`;

/** Names that have a board on a lot that stands as a box: every lot that has a name, so that a lot whose model fails still says what it is. */
const NAMES = [...new Set(LOTS.filter((l) => l.name).map((l) => l.name))];

export const SIGNS: SignDef[] = [GIVE_WAY, ...NAMES.map((n) => nameSign(boardOf(n), n)), ...Object.values(REGIONS).flatMap((r) => r.SIGNS)];
