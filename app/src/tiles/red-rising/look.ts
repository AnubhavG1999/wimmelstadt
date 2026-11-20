// What the Iron Rain is made of, so that what each builder builds looks like
// one city: Agea's materials, its lights, and the boards that name its places.
//
// Agea is a Gold city of the Society: kilometre-high towers of steel and glass
// that by night are a garden of jewelled blades, the Citadel's white and red
// spires, and low dense blocks of the lowColors to the south. The canyon's walls
// are banded rust and ochre; the planet is terraformed, green and white.

import type { GeoBuilder, V3, WinSpec } from '../../engine/geo';
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
// Windows
// ---------------------------------------------------------------------------
//
// A wall given `win` gets rows of windows that light up at night. Rows are
// counted from y = 0, so a wall with windows ends a whole number of storeys
// above y = 0: the city's floor is at 20, which is four storeys of 5 and five of 4.

/** A tower's wall of glass, in storeys of 4: the jewelled blades by night. */
export const GLASS_WIN: WinSpec = { cell: 1.6, storey: 4, lit: 1.0, kind: 1 };
/** An office's rows of windows, in storeys of 4. */
export const OFFICE_WIN: WinSpec = { cell: 2.2, storey: 4, lit: 0.85, kind: 0 };
/** The lowColor blocks' small windows above their shopfronts, in storeys of 4. */
export const LOW_WIN: WinSpec = { cell: 2.4, storey: 4, lit: 0.9, kind: 2 };
/** The Citadel's tall slits, in storeys of 5. */
export const CITADEL_WIN: WinSpec = { cell: 2.6, storey: 5, lit: 0.8, kind: 6 };

// ---------------------------------------------------------------------------
// Parts every builder wants
// ---------------------------------------------------------------------------

/**
 * The lion of House Augustus as a statue, sitting upright on a plinth, facing
 * `yaw` (radians: 0 east, a quarter turn south): its haunches, chest, mane,
 * head and forelegs as blocks, `s` its size (1 is a lion about 3 tall on a
 * plinth of 1.2). Gold by default.
 */
export function lion(b: GeoBuilder, x: number, z: number, y: number, s = 1, yaw = Math.PI / 2, color = GOLD, plinth = STONE_DARK): void {
  b.moved(x, y, z, yaw, () => {
    b.box(-1.1 * s, 0, -0.7 * s, 1.1 * s, 1.2 * s, 0.7 * s, plinth);
    const y0 = 1.2 * s;
    // haunches and body, sitting
    b.box(-0.9 * s, y0, -0.45 * s, 0.1 * s, y0 + 0.8 * s, 0.45 * s, color);
    // the chest, upright
    b.box(-0.2 * s, y0, -0.4 * s, 0.45 * s, y0 + 1.45 * s, 0.4 * s, color);
    // the mane, broader than the head, and the head with its muzzle forward
    b.box(-0.05 * s, y0 + 1.15 * s, -0.55 * s, 0.6 * s, y0 + 1.95 * s, 0.55 * s, color);
    b.box(0.35 * s, y0 + 1.3 * s, -0.3 * s, 0.95 * s, y0 + 1.8 * s, 0.3 * s, color);
    // the forelegs, straight down to the paws
    for (const side of [-1, 1]) b.box(0.2 * s, y0, side * 0.3 * s - 0.12 * s, 0.5 * s, y0 + 1.1 * s, side * 0.3 * s + 0.12 * s, color);
    // the tail curled round the haunch
    b.box(-0.95 * s, y0, 0.35 * s, -0.2 * s, y0 + 0.18 * s, 0.6 * s, color);
  });
}

/** The Society's pyramid, as an emblem standing on its base: `s` across. */
export function pyramid(b: GeoBuilder, x: number, y: number, z: number, s: number, color = GOLD): void {
  b.cyl(x, z, y, y + s * 0.8, s * 0.707, 0.01, 4, color, { phase: Math.PI / 4 });
}

/** A long banner hung from a crossbar on a pole: the colour of a house, with a stripe of a second colour down its middle. Faces `yaw`. */
export function banner(b: GeoBuilder, x: number, z: number, y: number, h: number, color: number, stripe: number, yaw = Math.PI / 4): void {
  b.cyl(x, z, y, y + h, 0.09, 0.09, 6, IRON);
  b.moved(x, y, z, yaw, () => {
    b.box(-0.08, h - 0.2, -0.75, 0.08, h - 0.08, 0.75, IRON);
    b.box(0.1, h * 0.35, -0.65, 0.16, h - 0.2, 0.65, color, { faces: 'NESWTB' });
    b.box(0.16, h * 0.4, -0.18, 0.2, h - 0.3, 0.18, stripe, { faces: 'NESWTB' });
  });
}

/** A low parapet along a line of corners, `h` tall and `t` thick, standing on height `y`. */
export function parapet(b: GeoBuilder, pts: [number, number][], y: number, h: number, t: number, color: number): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az);
    if (len < 1e-3) continue;
    b.obox((ax + bx) / 2, y + h / 2, (az + bz) / 2, len / 2 + t / 2, h / 2, t / 2, Math.atan2(bz - az, bx - ax), color, { faces: 'NESWTB' });
  }
}

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
