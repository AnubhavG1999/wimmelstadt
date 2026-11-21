// What Gotham is made of, so that what each builder builds looks like one
// city: its stone, its roofs, its lights, the parts every block wants, and the
// boards that name its places.
//
// Gotham is Pinkney's city, as the comics give his rules: gargoyles to
// frighten people onto the right path, rounded edges, thick walls, and raised
// walkways from building to building. It is soot-dark stone with a blue cast,
// umber brick in the East End, slate and lead on the roofs, verdigris copper
// on its domes and crowns, and windows that glow amber. By night it has neon
// on the Bowery and the waterfront, sodium lamps, and the green of Ace
// Chemicals' vats.

import type { GeoBuilder, V3, WinSpec } from '../../engine/geo';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/** Pinkney's stone: dark, with a blue cast. `STONE_TRIM` for cornices, quoins and sills, so that a dark wall keeps its shape by day. */
export const STONE = 0x3f434d, STONE_DARK = 0x2f323a, STONE_LIGHT = 0x565b67, STONE_TRIM = 0x767c89;
/** Paler stone, for the civic buildings and for Wayne Manor. */
export const LIMESTONE = 0x8a8a84, LIMESTONE_DARK = 0x6b6b66;
/** Brick, in the East End and on the docks. */
export const BRICK = 0x6a4034, BRICK_DARK = 0x4e3029, BRICK_RED = 0x7c4636;
/** Roofs: slate, lead, and copper gone green. */
export const SLATE = 0x3a3f47, LEAD = 0x545a63, COPPER = 0x5f8f7f, COPPER_DARK = 0x4a7265;
/** Iron and steel. Thin bars come out dark under the outline, so ironwork is painted lighter than it should look. */
export const IRON = 0x6b7078, IRON_DARK = 0x3c4047, STEEL = 0x8f97a3, RUST = 0x7a4a34;
/** Timber, for the fairground and the piers. */
export const TIMBER = 0x6b4c34, TIMBER_DARK = 0x45301f, TIMBER_PALE = 0xa98a66;
/** Gargoyles: a shade lighter than the walls, so that their outline reads. */
export const GARGOYLE = 0x6c707a;
/** Rock: Crest Hill's cliff, Arkham's crag. */
export const ROCK = 0x4a4c52, ROCK_DARK = 0x35373c, ROCK_LIGHT = 0x63666d;
/** Glass, and the dark of a doorway. */
export const GLASS = 0x4d6a7c, DARK = 0x17181c;
/** Gold and brass, for a clock's hands, a dome's lantern, a door. */
export const BRASS = 0xc9a548;

/** The pools of light at night. */
export const SODIUM = '#ffb347', AMBER = '#ffcf7a', COLD = '#9ad0ff', GREEN = '#7dff4f', ICE = '#bfefff';
/** Neon. */
export const NEON_RED = '#ff3b4a', NEON_MAGENTA = '#ff4fd8', NEON_CYAN = '#4fe3ff', NEON_GREEN = '#6dff6a', NEON_YELLOW = '#ffd84a', NEON_PURPLE = '#b06bff';

// ---------------------------------------------------------------------------
// Windows
// ---------------------------------------------------------------------------
//
// A wall given `win` gets rows of windows that light up at night. Rows are
// counted from y = 0, and the levels are 0, 4 and 8, so storeys of 4 line up
// on every level.

/** Old Gotham's tall narrow windows, floor to floor: Gothic slits that glow amber. */
export const GOTHIC_WIN: WinSpec = { cell: 2.0, storey: 4, lit: 0.85, kind: 6 };
/** An office tower's rows of windows. */
export const OFFICE_WIN: WinSpec = { cell: 2.0, storey: 4, lit: 0.8, kind: 0 };
/** A tenement's windows above its shopfronts. */
export const TENEMENT_WIN: WinSpec = { cell: 2.4, storey: 4, lit: 0.75, kind: 2 };
/** A house's or a works' small windows. */
export const SMALL_WIN: WinSpec = { cell: 2.6, storey: 4, lit: 0.7, kind: 4 };
/** A wall of glass: Wayne Tower's dome, a conservatory. */
export const GLASS_WIN: WinSpec = { cell: 1.6, storey: 4, lit: 1.0, kind: 1 };
/** Arrow loops, for Blackgate and Arkham's walls. */
export const LOOP_WIN: WinSpec = { cell: 3.2, storey: 4, lit: 0.7, kind: 7 };

// ---------------------------------------------------------------------------
// Parts every builder wants
// ---------------------------------------------------------------------------

/**
 * A gargoyle crouched on a corner or a cornice, looking out the way `yaw`
 * points (radians: 0 east, a quarter turn south): haunches, a hunched back,
 * a head thrust forward with two horns, and two folded wings. `s` is its
 * size: 1 is about 1.6 long and 1.3 tall. It stands on `y`.
 */
export function gargoyle(b: GeoBuilder, x: number, y: number, z: number, yaw: number, s = 1, color = GARGOYLE): void {
  b.moved(x, y, z, yaw, () => {
    // the haunches, and the back rising to the shoulders
    b.box(-0.55 * s, 0, -0.32 * s, 0.1 * s, 0.55 * s, 0.32 * s, color, { faces: 'NESWTB' });
    b.box(-0.2 * s, 0.3 * s, -0.28 * s, 0.5 * s, 0.85 * s, 0.28 * s, color, { faces: 'NESWTB' });
    // the neck and the head, thrust out over the edge
    b.box(0.4 * s, 0.6 * s, -0.16 * s, 0.85 * s, 0.9 * s, 0.16 * s, color, { faces: 'NESWTB' });
    b.box(0.75 * s, 0.62 * s, -0.2 * s, 1.15 * s, 1.0 * s, 0.2 * s, color, { faces: 'NESWTB' });
    // the horns
    for (const side of [-1, 1]) b.beam([0.85 * s, 0.98 * s, side * 0.14 * s], [0.7 * s, 1.3 * s, side * 0.22 * s], 0.07 * s, 0.02 * s, color);
    // the wings, folded up behind the shoulders
    for (const side of [-1, 1]) {
      b.box(-0.45 * s, 0.6 * s, side * 0.3 * s - 0.05 * s, 0.25 * s, 1.25 * s, side * 0.3 * s + 0.05 * s, color, { faces: 'NESWTB' });
    }
    // the forelegs, gripping the edge
    for (const side of [-1, 1]) b.box(0.25 * s, 0, side * 0.22 * s - 0.08 * s, 0.5 * s, 0.4 * s, side * 0.22 * s + 0.08 * s, color, { faces: 'NESWTB' });
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

/**
 * A stone balustrade along a line of corners, standing on height `y`: a rail
 * on short posts, with a pier every `every` units. For the rim of the upper
 * city, a terrace, a bridge's walk.
 */
export function balustrade(b: GeoBuilder, pts: [number, number][], y: number, color = STONE_TRIM, every = 4): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az);
    if (len < 1e-3) continue;
    const yaw = Math.atan2(bz - az, bx - ax), dx = (bx - ax) / len, dz = (bz - az) / len;
    // the rail and the plinth
    b.obox((ax + bx) / 2, y + 1.0, (az + bz) / 2, len / 2, 0.1, 0.16, yaw, color, { faces: 'NESWTB' });
    b.obox((ax + bx) / 2, y + 0.1, (az + bz) / 2, len / 2, 0.1, 0.14, yaw, color, { faces: 'NESWTB' });
    const n = Math.max(1, Math.round(len / every));
    for (let j = 0; j <= n; j++) {
      const s = (j / n) * len;
      b.obox(ax + dx * s, y + 0.6, az + dz * s, 0.22, 0.6, 0.22, yaw, color, { faces: 'NESWTB' });
    }
    // the balusters between the piers, as a thin dark infill
    b.obox((ax + bx) / 2, y + 0.55, (az + bz) / 2, len / 2, 0.36, 0.05, yaw, STONE_LIGHT, { faces: 'NESWTB' });
  }
}

/** A water tank on legs, as every tenement's roof has: a timber drum with a cone for a lid. It stands on `y`. */
export function waterTank(b: GeoBuilder, x: number, y: number, z: number, s = 1): void {
  for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) b.beam([x + dx * s, y, z + dz * s], [x + dx * s, y + 1.2 * s, z + dz * s], 0.08 * s, 0.08 * s, IRON);
  b.cyl(x, z, y + 1.2 * s, y + 2.9 * s, 0.95 * s, 0.95 * s, 8, TIMBER);
  b.cyl(x, z, y + 2.9 * s, y + 3.5 * s, 1.0 * s, 0.05 * s, 8, SLATE);
}

/**
 * A fire escape down a wall that faces `face`: landings with rails at each
 * storey from `y0` to `y1`, and ladders between them. `x`, `z` is the middle of
 * its foot on the wall, `w` how wide it is.
 */
export function fireEscape(b: GeoBuilder, x: number, z: number, face: 'N' | 'E' | 'S' | 'W', y0: number, y1: number, w = 3, storey = 4): void {
  const yaw = { E: 0, S: Math.PI / 2, W: Math.PI, N: -Math.PI / 2 }[face];
  b.moved(x, 0, z, yaw, () => {
    // built as if the wall faces east: out is +x, along is z
    for (let y = y0 + storey; y <= y1 - 1; y += storey) {
      b.box(0, y - 0.12, -w / 2, 1.1, y, w / 2, IRON, { faces: 'NESWTB' });
      b.box(1.02, y, -w / 2, 1.1, y + 0.9, w / 2, IRON, { faces: 'NESWTB' });
      for (const s of [-1, 1]) b.box(0, y, s * w / 2 - 0.04, 1.1, y + 0.9, s * w / 2 + 0.04, IRON, { faces: 'NESWTB' });
      // the ladder down to the landing below, slanting along the wall
      if (y - storey >= y0 + storey - 0.01) b.beam([0.55, y - 0.1, w / 2 - 0.5], [0.55, y - storey + 0.05, -w / 2 + 0.5], 0.09, 0.09, IRON);
    }
    // the drop ladder to the street, drawn up
    b.beam([0.55, y0 + storey - 0.1, -w / 2 + 0.4], [0.55, y0 + 1.6, -w / 2 + 0.4], 0.08, 0.08, IRON);
  });
}

/** A lamp on a bracket or a post that glows amber: a small box of light at a place, and its pool on the ground. */
export function gasLamp(k: Build, x: number, y: number, z: number, post = 0, color = SODIUM): void {
  if (post > 0) k.b.beam([x, y - post, z], [x, y, z], 0.1, 0.07, IRON_DARK);
  k.b.box(x - 0.2, y, z - 0.2, x + 0.2, y + 0.1, z + 0.2, IRON_DARK, { faces: 'NESWTB' });
  k.glows.push({ x, y: y + 0.32, z, sx: 0.32, sy: 0.42, sz: 0.32, color });
  k.lights.push({ x, z, r: 8, color, k: 0.45 });
}

/** A strip of neon: a thin glowing bar from one place to another. */
export function neon(k: Build, a: V3, b: V3, color: string, t = 0.14): void {
  const dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1]), dz = Math.abs(b[2] - a[2]);
  k.glows.push({ x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, z: (a[2] + b[2]) / 2, sx: Math.max(t, dx), sy: Math.max(t, dy), sz: Math.max(t, dz), color });
}

/**
 * A helipad's markings, flat on a deck or a lawn at height `y`: a ring just
 * inside its edge and an H at its middle that reads from the view the tile
 * opens with, in pale paint, and a lamp every eighth of the way round, red and
 * white in turn. `r` is the pad's own radius.
 */
export function padMark(k: Build, x: number, y: number, z: number, r: number, paint = 0xd9dde4): void {
  const b = k.b, n = 16, r0 = r - 0.8, r1 = r - 0.5;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    b.quad([x + Math.cos(a0) * r0, y, z + Math.sin(a0) * r0], [x + Math.cos(a0) * r1, y, z + Math.sin(a0) * r1], [x + Math.cos(a1) * r1, y, z + Math.sin(a1) * r1], [x + Math.cos(a1) * r0, y, z + Math.sin(a1) * r0], [0, 1, 0], paint);
  }
  // the H: its uprights lie along the view
  b.moved(x, y, z, Math.atan2(TO_VIEW[2], TO_VIEW[0]), () => {
    for (const s of [-1, 1]) b.quad([-1.25, 0, s * 0.85 - 0.2], [1.25, 0, s * 0.85 - 0.2], [1.25, 0, s * 0.85 + 0.2], [-1.25, 0, s * 0.85 + 0.2], [0, 1, 0], paint);
    b.quad([-0.2, 0, -0.65], [0.2, 0, -0.65], [0.2, 0, 0.65], [-0.2, 0, 0.65], [0, 1, 0], paint);
  });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    k.glows.push({ x: x + Math.cos(a) * (r - 0.22), y: y + 0.08, z: z + Math.sin(a) * (r - 0.22), sx: 0.2, sy: 0.14, sz: 0.2, color: i % 2 ? '#ff5a4a' : '#e6eeff' });
  }
}

// ---------------------------------------------------------------------------
// Name boards
// ---------------------------------------------------------------------------

/** Every name board stood so far, for whoever puts something down to keep clear of. */
export const BOARDS: { x: number; z: number; w: number }[] = [];

/** The way the view the tile opens with looks back from: a board that faces it is read square on. */
export const TO_VIEW: V3 = [0.669, 0, 0.743];

/** A name on a dark board on two iron posts, facing the view, standing on ground `y` high. */
export function nameBoard(k: Build, id: string, x: number, z: number, y = 0, facing: V3 = TO_VIEW, h = 1.5): void {
  const w = k.sign(id, x, y + 2.3 + h / 2, z, facing[0], facing[2], h, 9);
  BOARDS.push({ x, z, w });
  const ax = -facing[2], az = facing[0];
  for (const s of [-1, 1]) {
    const px = x + ax * s * (w / 2 + 0.12) - facing[0] * 0.1, pz = z + az * s * (w / 2 + 0.12) - facing[2] * 0.1;
    k.b.beam([px, y, pz], [px, y + 2.5 + h, pz], 0.12, 0.1, IRON);
  }
  // the board behind the lettering, a hair behind it
  k.b.obox(x - facing[0] * 0.06, y + 2.3 + h / 2, z - facing[2] * 0.06, w / 2 + 0.12, h / 2 + 0.1, 0.05, Math.atan2(az, ax), DARK, { faces: 'B' });
}

/** A name for `nameBoard`: pale lettering on a dark board, in plain capitals. */
export function nameSign(id: string, text: string): SignDef {
  const aspect = Math.max(2.4, text.length * 0.62);
  return { id, lines: [text.toUpperCase()], color: '#1d1f24', ink: '#e9e2cf', aspect, kind: 'board', size: [Math.round(aspect * 52), 52] };
}

/** The sign of a name board, by the name it carries. */
export const boardOf = (name: string): string => `name-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`;
