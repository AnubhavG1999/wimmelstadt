// Every sign the tile hangs. Signs are in the Common Tongue, which is English,
// in plain lettering on plain boards. A place keeps the books' name. An inn or
// a shop says what is sold there and not whose it is.

import type { SignDef } from '../../engine/signs';
import { paintHerald } from './herald';
import { nameSign } from './look';
import { LOTS } from './plan';
import { REGIONS } from './regions';

/** While a lot is only a box, its name stands on it. */
export const BLOCKOUT_SIGNS: SignDef[] = LOTS.filter((l) => !l.part && l.name).map((l) => nameSign(`box-${l.id}`, l.name));

/**
 * The one board that shows what is playing: the herald's board at the tourney
 * ground. When nothing plays it is the bill a herald painted on it.
 */
export const HERALD: SignDef = { id: 'herald', lines: ['WINTER IS COMING', 'fit your winter wheels', 'The wheelwright, Winter Town'], color: '#e9dcc0', aspect: 640 / 360, kind: 'screen', paint: paintHerald };

export const SIGNS: SignDef[] = [...BLOCKOUT_SIGNS, HERALD, ...Object.values(REGIONS).flatMap((r) => r.SIGNS)];
