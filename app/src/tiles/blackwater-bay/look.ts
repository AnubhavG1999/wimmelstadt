// What the places of Blackwater Bay share: their stone, their roofs, the
// slits their light shows through, and the parts every one of them is built
// from. They are why King's Landing, Dragonstone and Driftmark look like one
// world, and the Westeros tile's world at that: its parts are this file's
// pattern, and its colours are kept where the places are the same.
//
// Everything here is drawn from the books' plain descriptions and is this
// tile's own drawing. Nothing is taken from the television series.

import type { GeoBuilder, V3, WinSpec } from '../../engine/geo';
import { bandedFlag, figure, lathe } from '../../engine/parts';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import type { P2 } from './plan';

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/** Stone, by where it stands. Each has a darker shade for the tops of walls and for what is in shadow. */
export const STONE = {
  /** The pale red stone of the Red Keep, as on the Westeros tile. */
  red: 0xc68f7b, redShade: 0xa9745f,
  /** The warm sandstone of King's Landing's walls, its gates and its quays. */
  city: 0xc9b393, cityShade: 0xab9576,
  /** The Dragonpit's stone: a pale grey that the sun warms. */
  pit: 0xbdb2a2, pitShade: 0x9c9182,
  /** Dragonstone's black stone, fused and smooth, as on the Westeros tile. */
  black: 0x37343a, blackShade: 0x242226,
  /** High Tide's pale stone, as pale as the Eyrie's. */
  pale: 0xece7da, paleShade: 0xcfc9ba,
  /** The weathered grey-brown of the older castles: Driftmark, Rosby, Stokeworth, Rook's Rest, Duskendale. */
  shore: 0xa69d8d, shoreShade: 0x8b8374,
  /** The dark wet stone of Claw Isle and the Narrow Sea's rocks. */
  sea: 0x5c6260, seaShade: 0x474c4a,
};

export const ROCK = 0x5d5853, ROCK_DARK = 0x45413d, ASH = 0x77716a;
/** Roofs: baked tile, slate, thatch, lead, shingle, High Tide's silver, and copper gone green. */
export const ROOF = { tile: 0xa8583e, tileDark: 0x8e4733, slate: 0x4c5661, thatch: 0xb59c5e, lead: 0x7d8993, shingle: 0x6b5136, silver: 0xc9d1da, copper: 0x5fa08a };
export const TIMBER = 0x5b4634, TIMBER_DARK = 0x3f3024, PLASTER = 0xe4dccb, DAUB = 0xcdbf9f, IRONWORK = 0x6a6d72, DARK = 0x1c1a1c, DOOR = 0x4a3826;
/** The Dragonpit's great doors: bronze, with some iron. */
export const BRONZE = 0xa8763a, BRONZE_DARK = 0x7d5426;

/**
 * The colours a house flies, as bands on a banner: its field and its charge's
 * colour, from the books' plain descriptions. Only the two the research note
 * checked are here: the Targaryens' red dragon on black, and the Velaryons'
 * silver seahorse on sea green. Every other house flies plain colours, or
 * none.
 */
export const HOUSE: Record<string, number[]> = {
  targaryen: [0x1d1d20, 0xb3141c, 0x1d1d20],
  velaryon: [0x2e8b74, 0xd9dde2, 0x2e8b74],
};

// ---------------------------------------------------------------------------
// Light behind stone
// ---------------------------------------------------------------------------

/** Arrow loops, far apart: narrow slits, dark by day and glowing at night (the engine's kind 7). For curtain walls and keeps. */
export const LOOPS: WinSpec = { cell: 2.4, storey: 4.2, lit: 0.3, kind: 7 };
/** The same, closer together: for a hall or a tower that is lived in. */
export const LOOPS_CLOSE: WinSpec = { cell: 1.6, storey: 3.4, lit: 0.42, kind: 7 };
/** Tall narrow lights: for a sept, a great hall, a tower's stair. */
export const LANCETS: WinSpec = { cell: 1.5, storey: 5.2, lit: 0.4, kind: 6 };
/** The windows of a town house: small panes, most of them lit. A storey of a house is 3. */
export const HOUSE_WIN: WinSpec = { cell: 1.5, storey: 3, lit: 0.5, kind: 0 };

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
  // as a box that is turned and moved: so its long faces know how long they are, and their loops come in a row
  b.moved((a[0] + c[0]) / 2, 0, (a[1] + c[1]) / 2, yaw, () => {
    b.box(-len / 2, y0, -half, len / 2, top, half, color, { top: shade, win: o.win, seed: a[0] * 0.13 + a[1] * 0.07, faces: 'NST' });
    b.box(-len / 2, y0, -half, len / 2, top, half, color, { faces: 'EW' });
  });
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

/**
 * A ring that faces down, from radius `r0` out to `r1` at height `y`, with its
 * corners where `cyl` and `lathe` put theirs: the underside of a tower's flared
 * top or of a cone's eave, which is seen from low across the table.
 */
export function underRing(b: GeoBuilder, x: number, z: number, y: number, r0: number, r1: number, sides: number, color: number): void {
  const p = (r: number, a: number): V3 => [x + Math.cos(a) * r, y, z + Math.sin(a) * r];
  for (let i = 0; i < sides; i++) {
    const a0 = Math.PI / sides + (i / sides) * Math.PI * 2, a1 = a0 + (Math.PI * 2) / sides;
    // wound so that it faces down
    b.tri(p(r0, a0), p(r1, a0), p(r1, a1), [0, -1, 0], color);
    if (r0 > 1e-3) b.tri(p(r0, a0), p(r1, a1), p(r0, a1), [0, -1, 0], color);
  }
}

/** A round tower from `y0` to `top`: a shaft with loops, a top that flares a little, and battlements or a cone. */
export function roundTower(b: GeoBuilder, x: number, z: number, r: number, top: number, color: number, o: TowerOpts = {}): void {
  const y0 = o.y0 ?? 0, sides = o.sides ?? 10, shade = o.shade ?? color, flare = o.flare ?? 0.22;
  b.cyl(x, z, y0, top - 1, r, r, sides, color, { win: o.win ?? LOOPS, seed: o.seed ?? x * 0.13 + z * 0.07, cap: false });
  b.cyl(x, z, top - 1, top, r + flare, r + flare, sides, color, { cap: shade });
  underRing(b, x, z, top - 1, r, r + flare, sides, shade);
  if (o.cone) {
    lathe(b, x, z, [[r + flare + 0.25, top], [(r + flare) * 0.55, top + o.cone.h * 0.55], [0.05, top + o.cone.h]], sides, o.cone.color);
    underRing(b, x, z, top, r + flare, r + flare + 0.25, sides, o.cone.color);
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

/** A banner in a house's colours on a staff: `y` is the foot of the staff. A house with no colours here flies `plain`. */
export function banner(b: GeoBuilder, x: number, z: number, y: number, house: string, staff = 4, size = 1, plain: number[] = [0x8a6f4c, 0xd8c9a6, 0x8a6f4c]): void {
  bandedFlag(b, x, z, y, staff, HOUSE[house] ?? plain, 2.6 * size, 1.7 * size);
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
 * A dark doorway or arch in a wall that faces (nx, nz): an opening `w` wide
 * and `h` high whose foot is at `y`, set a hair proud of the wall's face at
 * (x, z), dark by day and glowing warm by night if `lit` is given. Square
 * headed, with a lintel; a round head is the builder's own.
 */
export function doorway(b: GeoBuilder, x: number, y: number, z: number, nx: number, nz: number, w: number, h: number, lit = 0, color = DARK): void {
  const ax = -nz, az = nx, out = 0.04;
  const at = (s: number, v: number): V3 => [x + nx * out + ax * s, y + v, z + nz * out + az * s];
  b.quad(at(-w / 2, 0), at(w / 2, 0), at(w / 2, h), at(-w / 2, h), [nx, 0, nz], color, lit > 0 ? { win: { cell: 0, storey: 5, lit, kind: 5 } } : {});
}

/**
 * A Dragonkeeper: one of the order of warriors who guard the dragons, in
 * black armour, his helm crested with a row of dragon scales that runs from
 * its brow over the top and on down his back, smaller as it goes. He stands
 * on `y` and faces `facing`, in degrees (0 east, 90 south).
 */
export function keeper(b: GeoBuilder, x: number, z: number, y: number, facing = 90): void {
  figure(b, x, z, y, { coat: 0x1e1d22, legs: 0x16151a, hat: 0x26252b, hatH: 0.42, hatR: 0.33, skin: 0xd2a07c });
  const a = (facing * Math.PI) / 180, fx = Math.cos(a), fz = Math.sin(a), yaw = Math.atan2(fz, fx);
  // the crest: scales in a row from the brow back over the helm, and on down the back, each smaller
  const scales: [number, number, number][] = [[0.22, 2.78, 0.16], [0.02, 2.86, 0.18], [-0.2, 2.8, 0.16], [-0.36, 2.55, 0.13], [-0.44, 2.25, 0.11], [-0.46, 1.95, 0.09], [-0.46, 1.65, 0.07]];
  for (const [along, h, s] of scales) b.obox(x + fx * along, y + h, z + fz * along, s * 0.9, s, 0.04, yaw, 0x4a1418);
  // a spear, upright beside him
  b.beam([x - fz * 0.55, y, z + fx * 0.55], [x - fz * 0.55, y + 3.4, z + fx * 0.55], 0.05, 0.05, 0x9a8a72);
  b.cyl(x - fz * 0.55, z + fx * 0.55, y + 3.4, y + 3.85, 0.1, 0.01, 4, 0xb8bcc2);
}

// ---------------------------------------------------------------------------
// Name boards
// ---------------------------------------------------------------------------

/** Every name board as it is put up: where, and how wide. Whoever plants or stands things afterwards keeps clear of them (see space.ts). */
export const BOARDS: { x: number; z: number; w: number }[] = [];

/** The way the view the tile opens with looks back from: a board that faces it is read square on. */
export const TO_VIEW: V3 = [0.669, 0, 0.743];

/** A name on a painted board on two timber posts, facing the view, standing on ground `y` high. */
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

// ---------------------------------------------------------------------------
// Ground laid in pieces: colours, mottling and clipping
// ---------------------------------------------------------------------------

/** A colour with each channel scaled, and two colours mixed. */
export function scaled(c: number, f: number): number {
  const ch = (v: number): number => Math.max(0, Math.min(255, Math.round(v * f)));
  return (ch((c >> 16) & 255) << 16) | (ch((c >> 8) & 255) << 8) | ch(c & 255);
}
export function mixed(a: number, b: number, t: number): number {
  const ch = (sh: number): number => Math.round(((a >> sh) & 255) + (((b >> sh) & 255) - ((a >> sh) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** A hash of a place, from 0 to 1, for mottling. */
export const mottle = (x: number, z: number): number => {
  const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return h - Math.floor(h);
};

/** The part of an outline inside a rectangle, by Sutherland and Hodgman's clipping: fewer than three corners if none. */
export function clipped(poly: P2[], x0: number, z0: number, x1: number, z1: number): P2[] {
  const clip = (pts: P2[], d: (p: P2) => number): P2[] => {
    const res: P2[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], c = pts[(i + 1) % pts.length], da = d(a), dc = d(c);
      if (da >= 0) res.push(a);
      if (da >= 0 !== dc >= 0) {
        const t = da / (da - dc);
        res.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]);
      }
    }
    return res;
  };
  let out = clip(poly, (p) => p[0] - x0);
  if (out.length > 2) out = clip(out, (p) => x1 - p[0]);
  if (out.length > 2) out = clip(out, (p) => p[1] - z0);
  if (out.length > 2) out = clip(out, (p) => z1 - p[1]);
  return out;
}

