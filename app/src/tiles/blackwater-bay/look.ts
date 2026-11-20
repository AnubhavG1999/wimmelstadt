// What the things of Blackwater Bay share. For now, the name board: plain
// lettering on a painted board on two timber posts, which stands before
// everything with a name, as on the Westeros tile, and the registry of where
// each one stands, so that nothing tall is put up before one.

import type { V3 } from '../../engine/geo';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';

export const TIMBER = 0x6e4e30, TIMBER_DARK = 0x3b2a1c;

/** Every name board as it is put up: where, and how wide. */
export const BOARDS: { x: number; z: number; w: number }[] = [];

/** The way the view the tile opens with looks back from: a board that faces it is read square on. */
export const TO_VIEW: V3 = [0.669, 0, 0.743];

/** A name on a painted board on two posts, facing the view, standing on ground `y` high. */
export function nameBoard(k: Build, id: string, x: number, z: number, y = 0, facing: V3 = TO_VIEW, h = 1.5): void {
  const w = k.sign(id, x, y + 2.3 + h / 2, z, facing[0], facing[2], h, 9);
  BOARDS.push({ x, z, w });
  const ax = -facing[2], az = facing[0];
  for (const s of [-1, 1]) k.b.beam([x + ax * s * (w / 2 + 0.12) - facing[0] * 0.1, y, z + az * s * (w / 2 + 0.12) - facing[2] * 0.1], [x + ax * s * (w / 2 + 0.12) - facing[0] * 0.1, y + 2.5 + h, z + az * s * (w / 2 + 0.12) - facing[2] * 0.1], 0.13, 0.11, TIMBER);
  // the board behind the lettering, a hair behind it
  k.b.obox(x - facing[0] * 0.06, y + 2.3 + h / 2, z - facing[2] * 0.06, w / 2 + 0.12, h / 2 + 0.1, 0.05, Math.atan2(az, ax), TIMBER_DARK, { faces: 'B' });
}

/** A name for `nameBoard`: plain lettering on a painted board. */
export function nameSign(id: string, text: string): SignDef {
  const aspect = Math.max(2.4, text.length * 0.62);
  return { id, lines: [text.toUpperCase()], color: '#e9dcc0', ink: '#2b2118', aspect, kind: 'board', size: [Math.round(aspect * 52), 52] };
}
