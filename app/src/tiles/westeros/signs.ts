// Every sign the tile hangs. Signs are in the Common Tongue, which is English,
// in plain lettering on plain boards. A place keeps the books' name. An inn or
// a shop says what is sold there and not whose it is.

import type { SignDef } from '../../engine/signs';
import { LOTS } from './plan';

const PARCHMENT = '#e9dcc0', INK = '#2b2118';

/** A painted board with a name on it. */
const board = (id: string, text: string, more: Partial<SignDef> = {}): SignDef =>
  ({ id, lines: [text.toUpperCase()], color: PARCHMENT, ink: INK, aspect: Math.max(2.2, text.length * 0.62), kind: 'board', size: [Math.round(Math.max(2.2, text.length * 0.62) * 64), 64], ...more });

/** While a lot is only a box, its name stands on it. */
export const BLOCKOUT_SIGNS: SignDef[] = LOTS.filter((l) => !l.part && l.name).map((l) => board(`box-${l.id}`, l.name));

export const SIGNS: SignDef[] = [...BLOCKOUT_SIGNS];
