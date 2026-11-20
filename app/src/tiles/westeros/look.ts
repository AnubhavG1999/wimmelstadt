// What the castles of Westeros share: their stone, their roofs, the slits
// their light shows through, and the parts that every one of them is built
// from. They are why Winterfell and Storm's End look like one world.
//
// Everything here is drawn from the books' plain descriptions and is this
// tile's own drawing.

import type { GeoBuilder, V3, WinSpec } from '../../engine/geo';
import { bandedFlag, lathe } from '../../engine/parts';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import type { P2 } from './plan';

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/** Stone, by where it was quarried. Each has a darker shade for the tops of walls and for what is in shadow. */
export const STONE = {
  /** The grey granite of the North: Winterfell, Castle Black, Moat Cailin. */
  north: 0x8f9296, northShade: 0x74777c,
  /** The weathered grey-brown of the riverlands: the Twins, Riverrun, the inn. */
  river: 0xa69d8d, riverShade: 0x8b8374,
  /** The pale red stone of the Red Keep and of King's Landing's walls. */
  red: 0xc68f7b, redShade: 0xa9745f,
  /** White: Highgarden, the Eyrie, the Great Sept's marble. */
  white: 0xece7da, whiteShade: 0xcfc9ba,
  /** Black: Dragonstone, and Harrenhal where dragonfire melted it. */
  black: 0x37343a, blackShade: 0x242226,
  /** The grey of Storm's End, fitted so close that the wind finds no hold. */
  storm: 0x8d8b84, stormShade: 0x716f69,
  /** The sand-coloured stone and mud brick of Sunspear. */
  sand: 0xdcc591, sandShade: 0xbfa772,
  /** The golden stone of the west: Casterly Rock and Lannisport. */
  gold: 0xbfa878, goldShade: 0x9f8a5e,
  /** The dark wet stone of Pyke, green with lichen. */
  iron: 0x5c6260, ironShade: 0x474c4a,
};

export const ICE = 0xcfe4ee, ICE_SHADE = 0xb1cfde, ICE_TOP = 0xe9f2f6, SNOW = 0xf1f5f8;
export const ROCK = 0x8d877c, ROCK_DARK = 0x6c675f, CLIFF = 0x7a756c;
/** Roofs: slate, baked tile, thatch, lead, gilt, and copper gone green. */
export const ROOF = { slate: 0x4c5661, tile: 0xa8583e, thatch: 0xb59c5e, lead: 0x7d8993, gilt: 0xd9b24a, copper: 0x5fa08a, shingle: 0x6b5136 };
export const TIMBER = 0x5b4634, TIMBER_DARK = 0x3f3024, PLASTER = 0xe4dccb, DAUB = 0xcdbf9f, IRONWORK = 0x6a6d72, DARK = 0x1c1a1c, DOOR = 0x4a3826;
/** The white bark and the red leaves of a weirwood. */
export const WEIRWOOD = { bark: 0xece8de, leaf: 0xa3221d };

/** The colours a house flies, as bands on a banner: its field and its charge's colour, from the books' plain descriptions. */
export const HOUSE: Record<string, number[]> = {
  stark: [0xe8e6df, 0x8a9099, 0xe8e6df],
  lannister: [0x9b1b1f, 0xd9b23c, 0x9b1b1f],
  baratheon: [0xe0b830, 0x1d1d20, 0xe0b830],
  tyrell: [0x3f7a3a, 0xd9b23c, 0x3f7a3a],
  martell: [0xe07a22, 0xb3141c, 0xe07a22],
  tully: [0x2f5fa8, 0xb03028, 0x2f5fa8],
  arryn: [0x6ea6d9, 0xf1efe6, 0x6ea6d9],
  greyjoy: [0x1d1d20, 0xd9b23c, 0x1d1d20],
  targaryen: [0x1d1d20, 0xb3141c, 0x1d1d20],
  frey: [0x8a9099, 0x2f5fa8, 0x8a9099],
  hightower: [0x8a9099, 0xf1efe6, 0xe07a22],
  watch: [0x1b1b1f, 0x1b1b1f, 0x1b1b1f],
};

// ---------------------------------------------------------------------------
// Light behind stone
// ---------------------------------------------------------------------------

/** Arrow loops and small windows, far apart: for curtain walls and keeps. They glow at night. */
export const LOOPS: WinSpec = { cell: 2.4, storey: 4.2, lit: 0.3, kind: 4 };
/** The same, closer together: for a hall or a tower that is lived in. */
export const LOOPS_CLOSE: WinSpec = { cell: 1.6, storey: 3.4, lit: 0.42, kind: 4 };
/** Tall narrow lights: for a sept, a great hall, a tower's stair. */
export const LANCETS: WinSpec = { cell: 1.5, storey: 5.2, lit: 0.4, kind: 6 };
/** The windows of a town house: small panes, most of them lit. */
export const HOUSE_WIN: WinSpec = { cell: 1.5, storey: 2.6, lit: 0.5, kind: 0 };

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

export interface WallOpts {
  /** How thick it is. 1.6 unless this says otherwise. */
  thick?: number;
  /** How high its foot is. The ground, unless it stands on something. */
  y0?: number;
  /** The colour of its top and of the tops of its merlons. */
  shade?: number;
  /** Whether it has battlements. It has, unless this says no. */
  merlons?: boolean;
  win?: WinSpec;
}

/**
 * A stretch of curtain wall between two points, `top` high, with a walk along
 * its top and battlements on both edges of the walk. It is closed from every
 * side, and has no gap at its ends: let a tower stand on each.
 */
export function rampart(b: GeoBuilder, a: P2, c: P2, top: number, color: number, o: WallOpts = {}): void {
  const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dz, dx);
  const half = (o.thick ?? 1.6) / 2, y0 = o.y0 ?? 0, shade = o.shade ?? color;
  b.obox((a[0] + c[0]) / 2, (y0 + top) / 2, (a[1] + c[1]) / 2, len / 2, (top - y0) / 2, half, yaw, color, { top: shade, win: o.win, seed: a[0] * 0.13 + a[1] * 0.07 });
  if (o.merlons === false) return;
  // merlons: on the outer edge and the inner, a solid one for every gap
  const n = Math.max(1, Math.round(len / 1.9)), nx = -Math.sin(yaw), nz = Math.cos(yaw);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = a[0] + dx * t, z = a[1] + dz * t;
    for (const s of [-1, 1]) b.obox(x + nx * s * (half - 0.2), top + 0.42, z + nz * s * (half - 0.2), (len / n) * 0.3, 0.42, 0.2, yaw, color, { top: shade });
  }
}

export interface TowerOpts {
  y0?: number;
  sides?: number;
  shade?: number;
  win?: WinSpec;
  /** What is on top: battlements round a flat roof, or a cone of this colour, this high. Battlements unless this says otherwise. */
  cone?: { color: number; h: number };
  /** How far the top flares out past the shaft, as a tower's fighting top does. */
  flare?: number;
  seed?: number;
}

/** A round tower from `y0` to `top`: a shaft with loops, a top that flares a little, and battlements or a cone. */
export function roundTower(b: GeoBuilder, x: number, z: number, r: number, top: number, color: number, o: TowerOpts = {}): void {
  const y0 = o.y0 ?? 0, sides = o.sides ?? 10, shade = o.shade ?? color, flare = o.flare ?? 0.22;
  b.cyl(x, z, y0, top - 1, r, r, sides, color, { win: o.win ?? LOOPS, seed: o.seed ?? x * 0.13 + z * 0.07, cap: false });
  b.cyl(x, z, top - 1, top, r + flare, r + flare, sides, color, { cap: shade });
  if (o.cone) {
    lathe(b, x, z, [[r + flare + 0.25, top], [(r + flare) * 0.55, top + o.cone.h * 0.55], [0.05, top + o.cone.h]], sides, o.cone.color);
    return;
  }
  // merlons round the edge, on every other side
  for (let i = 0; i < sides; i += 2) {
    const a = ((i + 0.5) / sides) * Math.PI * 2, w = (r + flare) * Math.sin(Math.PI / sides) * 0.9;
    b.obox(x + Math.cos(a) * (r + flare - 0.2), top + 0.4, z + Math.sin(a) * (r + flare - 0.2), 0.2, 0.4, w, a, color, { top: shade });
  }
}

/** A square tower, the same: `r` is half its width. */
export function squareTower(b: GeoBuilder, x: number, z: number, r: number, top: number, color: number, o: TowerOpts = {}): void {
  const y0 = o.y0 ?? 0, shade = o.shade ?? color, flare = o.flare ?? 0.2;
  b.box(x - r, y0, z - r, x + r, top - 1, z + r, color, { win: o.win ?? LOOPS, seed: o.seed ?? x * 0.13 + z * 0.07, faces: 'NESW' });
  b.box(x - r - flare, top - 1, z - r - flare, x + r + flare, top, z + r + flare, color, { top: shade, faces: 'NESWTB' });
  if (o.cone) {
    lathe(b, x, z, [[(r + flare + 0.2) * Math.SQRT2, top], [(r + flare) * 0.75, top + o.cone.h * 0.55], [0.05, top + o.cone.h]], 4, o.cone.color);
    return;
  }
  const R = r + flare, n = Math.max(2, Math.round((2 * R) / 1.7));
  for (let i = 0; i < n; i += 1) {
    const t = -R + ((i + 0.5) / n) * 2 * R, w = (R / n) * 0.55;
    for (const s of [-1, 1]) {
      b.box(x + t - w, top, z + s * R - (s > 0 ? 0.4 : 0), x + t + w, top + 0.8, z + s * R + (s < 0 ? 0.4 : 0), color, { top: shade });
      b.box(x + s * R - (s > 0 ? 0.4 : 0), top, z + t - w, x + s * R + (s < 0 ? 0.4 : 0), top + 0.8, z + t + w, color, { top: shade });
    }
  }
}

/** A banner in a house's colours on a staff: `y` is the foot of the staff. */
export function banner(b: GeoBuilder, x: number, z: number, y: number, house: keyof typeof HOUSE | string, staff = 4, size = 1): void {
  bandedFlag(b, x, z, y, staff, HOUSE[house] ?? HOUSE.stark, 2.6 * size, 1.7 * size);
}

/** A flame that burns in the dark: a torch on a wall, a brazier, a beacon. It glows, and by night it lights the ground under it. */
export function fire(k: Build, x: number, y: number, z: number, size = 0.3, reach = 7): void {
  k.glows.push({ x, y, z, sx: size, sy: size * 1.5, sz: size, color: '#ffb347' });
  if (reach > 0) k.lights.push({ x, z, r: reach, color: '#ffbf75', k: 0.5 });
}

/** A brazier on three legs with a fire in it, standing on `y`. */
export function brazier(k: Build, x: number, z: number, y = 0): void {
  k.b.cyl(x, z, y + 0.9, y + 1.25, 0.32, 0.46, 6, IRONWORK, { cap: DARK });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    k.b.beam([x + Math.cos(a) * 0.36, y, z + Math.sin(a) * 0.36], [x + Math.cos(a) * 0.2, y + 0.95, z + Math.sin(a) * 0.2], 0.06, 0.06, 0x8a8d92);
  }
  fire(k, x, y + 1.5, z, 0.3, 8);
}

/**
 * The board that says what a place is called: a painted board between two
 * posts, facing the view the tile opens with unless told otherwise. `id` is a
 * sign in the file's own `SIGNS`, made with `nameSign`.
 */
export function nameBoard(k: Build, id: string, x: number, z: number, y = 0, facing: V3 = [0.669, 0, 0.743], h = 1.5): void {
  const w = k.sign(id, x, y + 2.3 + h / 2, z, facing[0], facing[2], h, 9);
  // across the board, level
  const ax = -facing[2], az = facing[0];
  for (const s of [-1, 1]) k.b.beam([x + ax * s * (w / 2 + 0.12) - facing[0] * 0.1, y, z + az * s * (w / 2 + 0.12) - facing[2] * 0.1], [x + ax * s * (w / 2 + 0.12) - facing[0] * 0.1, y + 2.5 + h, z + az * s * (w / 2 + 0.12) - facing[2] * 0.1], 0.13, 0.11, TIMBER);
  // the board behind the lettering, a hair behind it
  k.b.obox(x - facing[0] * 0.06, y + 2.3 + h / 2, z - facing[2] * 0.06, w / 2 + 0.12, h / 2 + 0.1, 0.05, Math.atan2(az, ax), TIMBER_DARK, { faces: 'B' });
}

/** A name for `nameBoard`: plain lettering on a painted board, as a herald would letter it. */
export function nameSign(id: string, text: string): SignDef {
  const aspect = Math.max(2.4, text.length * 0.62);
  return { id, lines: [text.toUpperCase()], color: '#e9dcc0', ink: '#2b2118', aspect, kind: 'board', size: [Math.round(aspect * 52), 52] };
}
