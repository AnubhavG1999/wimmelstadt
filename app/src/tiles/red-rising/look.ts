// What the Iron Rain is made of, so that what each builder builds looks like
// one city: Agea's materials, its lights, and the boards that name its places.
//
// Agea is a Gold city of the Society: kilometre-high towers of steel and glass
// that by night are a garden of jewelled blades, the Citadel's white and red
// spires, and low dense blocks of the lowColors to the south. The canyon's walls
// are banded rust and ochre; the planet is terraformed, green and white.

import type { V3 } from '../../engine/geo';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/** The city's stone, paving and walls. */
export const STONE = 0xd9d2c4, STONE_DARK = 0xa79f90, MARBLE = 0xf1ece2, WALL = 0xb7ab98, WALL_DARK = 0x8f8475;
/** The Citadel: white stone and red. */
export const CITADEL_WHITE = 0xf3efe6, CITADEL_RED = 0xb4322a, GOLD = 0xd4a63a, BRONZE = 0x9a6b35;
/** The towers: steel, glass and the dark of their frames. */
export const STEEL = 0x9aa6b2, GLASS = 0x5f7f99, GLASS_DARK = 0x3d5266, FRAME = 0x2c3239;
/** The lowColor quarter: plaster and tile in the colours of the Colors. */
export const PLASTER = [0xd8c7a8, 0xc9b08e, 0xb99a7c, 0xd2b8a0, 0xbfb3a0];
/** Iron, dark metal, timber. */
export const IRON = 0x4a4d52, DARK = 0x2b2a2c, TIMBER = 0x6a4a30, TIMBER_DARK = 0x3c2a1c;
/** House Augustus: the gold lion on red. House Bellona: blue and silver. The Praetorians: purple and black. */
export const AUGUSTUS_RED = 0xa3241f, AUGUSTUS_GOLD = 0xe0b23c, BELLONA_BLUE = 0x2f5aa8, BELLONA_SILVER = 0xc9d2dc, PRAETORIAN = 0x5a2a6e;

/** The pools of light at night: warm in the old city and the Citadel, cold and blue among the towers. */
export const WARM = '#ffcf8a', COLD = '#9ad0ff', AMBER = '#ffb45a';

// ---------------------------------------------------------------------------
// Name boards
// ---------------------------------------------------------------------------

/** Every name board stood so far, for whoever puts something down to keep clear of. */
export const BOARDS: { x: number; z: number; w: number }[] = [];

/** The way the view the tile opens with looks back from: a board that faces it is read square on. */
export const TO_VIEW: V3 = [0.669, 0, 0.743];

/** A name on a dark board on two steel posts, facing the view, standing on ground `y` high. */
export function nameBoard(k: Build, id: string, x: number, z: number, y = 0, facing: V3 = TO_VIEW, h = 1.5): void {
  const w = k.sign(id, x, y + 2.3 + h / 2, z, facing[0], facing[2], h, 9);
  BOARDS.push({ x, z, w });
  const ax = -facing[2], az = facing[0];
  for (const s of [-1, 1]) {
    const px = x + ax * s * (w / 2 + 0.12) - facing[0] * 0.1, pz = z + az * s * (w / 2 + 0.12) - facing[2] * 0.1;
    k.b.beam([px, y, pz], [px, y + 2.5 + h, pz], 0.12, 0.1, STEEL);
  }
  // the board behind the lettering, a hair behind it
  k.b.obox(x - facing[0] * 0.06, y + 2.3 + h / 2, z - facing[2] * 0.06, w / 2 + 0.12, h / 2 + 0.1, 0.05, Math.atan2(az, ax), FRAME, { faces: 'B' });
}

/** A name for `nameBoard`: pale lettering on a dark board, as the Society letters its places. */
export function nameSign(id: string, text: string): SignDef {
  const aspect = Math.max(2.4, text.length * 0.62);
  return { id, lines: [text.toUpperCase()], color: '#2a2e35', ink: '#efe6cf', aspect, kind: 'board', size: [Math.round(aspect * 52), 52] };
}

/** The sign of a name board, by the name it carries. */
export const boardOf = (name: string): string => `name-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`;
