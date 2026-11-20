// Toy versions of famous buildings and monuments. Each is a few dozen boxes,
// cylinders and bars: enough for the silhouette. Carried over from the look
// prototype, where they stood on one small board. Here each is built around its
// own middle, and monuments.ts stands it where the plan says.

import { interior, type GeoBuilder, type V3, type WinSpec } from '../look/geo.ts';

/** The plot a building stands on: its north-west corner, its size, and how high it reaches. */
export interface Lot { x: number; z: number; w: number; d: number; y1: number }
/** A pool of light on the ground at night. */
export interface Light { x: number; z: number; r: number; color: string; k: number }
/** A small lamp that glows by itself. */
export interface Glow { x: number; y: number; z: number; sx: number; sy: number; sz: number; color: string }
export interface LandmarkCtx { b: GeoBuilder; glows: Glow[]; lights: Light[] }

/** A plot of this size around the middle, or around a point beside it. */
export const lot = (w: number, d: number, y1: number, dx = 0, dz = 0): Lot => ({ x: dx - w / 2, z: dz - d / 2, w, d, y1 });

// Monuments that are not on a plot are built around the middle too.
const ARCH = { x: 0, z: 0, span: 52, height: 52 };
const TORII = { x: 0, z: 0, half: 6.6, height: 12 };
/** The Taj Mahal's block: the tomb at its north end, the garden and the gate to the south. */
const TAJ = { x0: -24, z0: -24, x1: 24, z1: 24 };

const RED_LAMP = '#ff3b3b';
const lamp = (ctx: LandmarkCtx, x: number, y: number, z: number, s = 0.7, color = RED_LAMP): void => {
  ctx.glows.push({ x, y, z, sx: s, sy: s, sz: s, color });
};

/** A dome or an onion, turned from a profile of [height, radius] pairs. */
function turned(b: GeoBuilder, cx: number, cz: number, profile: [number, number][], sides: number, color: number, win?: WinSpec): void {
  for (let i = 0; i < profile.length - 1; i++) {
    const [y0, r0] = profile[i], [y1, r1] = profile[i + 1];
    b.cyl(cx, cz, y0, y1, r0, r1, sides, color, { win, cap: i === profile.length - 2 ? color : false });
  }
}

// ---------------------------------------------------------------------------
// Towers that stand on a lot
// ---------------------------------------------------------------------------

/** Sears Tower: nine square tubes bundled together, stopping at different heights. */
export function sears(l: Lot, { b, glows }: LandmarkCtx): void {
  const t = l.w / 3;
  const FLOORS = [[50, 90, 66], [108, 108, 90], [66, 90, 50]]; // rows north to south, columns west to east
  const k = l.y1 / 108;
  const win: WinSpec = { cell: t / 4, storey: 2.6, lit: 0.42, kind: 0 };
  const BODY = 0x2b2e35, BAND = 0x17191d, ROOF = 0x3b3e44;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const top = FLOORS[r][c] * k;
      const x0 = l.x + c * t, z0 = l.z + r * t;
      b.box(x0, 0, z0, x0 + t, top, z0 + t, BODY, { win, seed: 0.11 + r * 0.17 + c * 0.07, top: ROOF });
      // the dark bands of the machine floors
      for (const f of [30, 65, 89]) {
        if (f < FLOORS[r][c] - 4) b.box(x0 - 0.06, f * k, z0 - 0.06, x0 + t + 0.06, f * k + 2.2, z0 + t + 0.06, BAND, { faces: 'NESW' });
      }
      b.box(x0 - 0.06, top - 2.4, z0 - 0.06, x0 + t + 0.06, top + 0.5, z0 + t + 0.06, BAND);
    }
  }
  const az = l.z + t * 1.5;
  for (const [ox, h] of [[0.5, 30], [1.5, 34]]) {
    const ax = l.x + t * ox;
    b.cyl(ax, az, l.y1 + 0.5, l.y1 + 0.5 + h, 0.55, 0.14, 6, 0xe9e9ec, { cap: false });
    lamp({ b, glows, lights: [] }, ax, l.y1 + h + 0.9, az);
  }
}

/** One of the Twin Towers: a plain silver shaft with pinstripe windows. */
export function twinTower(l: Lot, ctx: LandmarkCtx, antenna: boolean): void {
  const { b } = ctx;
  const x0 = l.x, z0 = l.z, x1 = l.x + l.w, z1 = l.z + l.d, H = l.y1;
  const win: WinSpec = { cell: l.w / 18, storey: 6, lit: 0.5, kind: 6 };
  b.box(x0, 0, z0, x1, H, z1, 0xbcc4cb, { win, seed: antenna ? 0.23 : 0.61, top: 0x8d9299 });
  b.box(x0 - 0.05, 0, z0 - 0.05, x1 + 0.05, 5.5, z1 + 0.05, 0x3d4650, { faces: 'NESW' }); // the lobby
  for (const y of [H * 0.385, H * 0.7]) b.box(x0 - 0.05, y, z0 - 0.05, x1 + 0.05, y + 2.2, z1 + 0.05, 0x59616b, { faces: 'NESW' });
  b.box(x0 - 0.05, H - 5.5, z0 - 0.05, x1 + 0.05, H + 0.4, z1 + 0.05, 0x59616b);
  b.box(x0 + 2.5, H + 0.4, z0 + 2.5, x1 - 2.5, H + 1.8, z1 - 2.5, 0x7a8088);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  if (antenna) {
    b.cyl(cx, cz, H + 1.8, H + 32, 0.7, 0.12, 6, 0xeeeeee, { cap: false });
    lamp(ctx, cx, H + 32.4, cz);
  } else {
    lamp(ctx, x0 + 0.6, H + 1, z0 + 0.6, 0.6);
    lamp(ctx, x1 - 0.6, H + 1, z1 - 0.6, 0.6);
  }
  ctx.lights.push({ x: cx, z: z1 + 3, r: 10, color: '#dfe9f5', k: 0.4 });
}

/** The Empire State Building: a stone shaft that steps back to a mast. */
export function empire(l: Lot, ctx: LandmarkCtx): void {
  const { b } = ctx;
  const STONE = 0xd9d0bf, TRIM = 0xb9b0a0;
  const win: WinSpec = { cell: 1.45, storey: 2.6, lit: 0.42, kind: 6 };
  const cx = l.x + l.w / 2, cz = l.z + l.d / 2, H = l.y1;
  const tier = (hx: number, hz: number, y0: number, y1: number, seed: number) =>
    b.box(cx - hx, y0, cz - hz, cx + hx, y1, cz + hz, STONE, { win, seed, top: TRIM });
  tier(l.w / 2, l.d / 2, 0, 8, 0.31);
  tier(l.w / 2 - 1.2, l.d / 2 - 1.5, 8, 26, 0.32);
  tier(l.w / 2 - 2.4, l.d / 2 - 3.2, 26, 34, 0.33);
  tier(4.2, 7.0, 34, H * 0.8, 0.34);
  tier(3.5, 5.6, H * 0.8, H * 0.87, 0.35);
  tier(2.8, 4.2, H * 0.87, H * 0.93, 0.36);
  tier(2.0, 2.9, H * 0.93, H, 0.37);
  // the mast, lit at night, and the spire
  b.cyl(cx, cz, H, H + 7, 1.7, 1.3, 8, 0xc9c2b4, { win: interior(1.4), cap: TRIM });
  b.cyl(cx, cz, H + 7, H + 9, 1.3, 0.6, 8, TRIM, { win: interior(1.4), cap: false });
  b.cyl(cx, cz, H + 9, H + 24, 0.5, 0.08, 6, 0xdadada, { cap: false });
  lamp(ctx, cx, H + 24.4, cz);
  for (const [hx, hz, y] of [[2.0, 2.9, H * 0.93], [2.8, 4.2, H * 0.87]]) {
    ctx.glows.push({ x: cx, y: y + 0.5, z: cz - hz - 0.1, sx: hx * 2, sy: 0.25, sz: 0.2, color: '#fff1c9' });
    ctx.glows.push({ x: cx, y: y + 0.5, z: cz + hz + 0.1, sx: hx * 2, sy: 0.25, sz: 0.2, color: '#fff1c9' });
    ctx.glows.push({ x: cx - hx - 0.1, y: y + 0.5, z: cz, sx: 0.2, sy: 0.25, sz: hz * 2, color: '#fff1c9' });
    ctx.glows.push({ x: cx + hx + 0.1, y: y + 0.5, z: cz, sx: 0.2, sy: 0.25, sz: hz * 2, color: '#fff1c9' });
  }
  ctx.lights.push({ x: cx, z: cz + l.d / 2 + 3, r: 11, color: '#ffe9c4', k: 0.45 });
}

/** Big Ben: the clock tower, with a hall beside it. */
export function bigBen(l: Lot, ctx: LandmarkCtx): void {
  const { b } = ctx;
  const STONE = 0xcbb78a, SLATE = 0x4a4f55, GOLD = 0xd9b24a, FACE = 0xf6efd9, HAND = 0x25272b;
  const tx = l.x + 4.2, tz = l.z + l.d - 4.2; // at the corner nearest the street
  b.box(tx - 2.5, 0, tz - 2.5, tx + 2.5, 30, tz + 2.5, STONE, { win: { cell: 1.2, storey: 3.2, lit: 0.3, kind: 6 }, seed: 0.5 });
  b.box(tx - 3.0, 30, tz - 3.0, tx + 3.0, 37.2, tz + 3.0, STONE);
  // a clock face on every side, lit from within at night
  const cy = 33.6, f = 2.2, glow = interior(1.6);
  b.box(tx - f, cy - f, tz + 3.0, tx + f, cy + f, tz + 3.07, FACE, { faces: 'S', win: glow });
  b.box(tx - f, cy - f, tz - 3.07, tx + f, cy + f, tz - 3.0, FACE, { faces: 'N', win: glow });
  b.box(tx + 3.0, cy - f, tz - f, tx + 3.07, cy + f, tz + f, FACE, { faces: 'E', win: glow });
  b.box(tx - 3.07, cy - f, tz - f, tx - 3.0, cy + f, tz + f, FACE, { faces: 'W', win: glow });
  // the hands, at three o'clock
  b.box(tx - 0.12, cy, tz + 3.07, tx + 0.12, cy + 1.9, tz + 3.13, HAND, { faces: 'S' });
  b.box(tx, cy - 0.12, tz + 3.07, tx + 1.3, cy + 0.12, tz + 3.13, HAND, { faces: 'S' });
  b.box(tx - 0.12, cy, tz - 3.13, tx + 0.12, cy + 1.9, tz - 3.07, HAND, { faces: 'N' });
  b.box(tx - 1.3, cy - 0.12, tz - 3.13, tx, cy + 0.12, tz - 3.07, HAND, { faces: 'N' });
  b.box(tx + 3.07, cy, tz - 0.12, tx + 3.13, cy + 1.9, tz + 0.12, HAND, { faces: 'E' });
  b.box(tx + 3.07, cy - 0.12, tz - 1.3, tx + 3.13, cy + 0.12, tz, HAND, { faces: 'E' });
  b.box(tx - 3.13, cy, tz - 0.12, tx - 3.07, cy + 1.9, tz + 0.12, HAND, { faces: 'W' });
  b.box(tx - 3.13, cy - 0.12, tz, tx - 3.07, cy + 0.12, tz + 1.3, HAND, { faces: 'W' });
  // belfry, roof, lantern and spire
  b.box(tx - 2.7, 37.2, tz - 2.7, tx + 2.7, 40.4, tz + 2.7, 0xb9a678, { win: { cell: 0.9, storey: 3.2, lit: 0.2, kind: 6 }, seed: 0.2 });
  b.cyl(tx, tz, 40.4, 44.2, 3.9, 2.0, 4, SLATE, { phase: Math.PI / 4, cap: false });
  b.box(tx - 1.2, 44.2, tz - 1.2, tx + 1.2, 46, tz + 1.2, GOLD, { win: interior(0.9) });
  b.cyl(tx, tz, 46, 51.5, 1.6, 0.08, 4, SLATE, { phase: Math.PI / 4, cap: false });
  lamp(ctx, tx, 51.9, tz, 0.5, '#fff1c9');
  // the hall
  const hx0 = l.x + 1, hz0 = l.z + 1, hx1 = l.x + l.w - 1, hz1 = l.z + 5.8;
  b.box(hx0, 0, hz0, hx1, 8.5, hz1, STONE, { win: { cell: 1.3, storey: 4.2, lit: 0.5, kind: 6 }, seed: 0.7, top: 0x6b6f76 });
  for (const [px, pz] of [[hx0, hz0], [hx1, hz0], [hx0, hz1], [hx1, hz1]]) {
    b.cyl(px, pz, 8.5, 11.6, 0.55, 0.08, 4, STONE, { phase: Math.PI / 4, cap: false });
  }
  ctx.lights.push({ x: tx, z: tz, r: 12, color: '#ffe2ae', k: 0.5 });
}

/** The Eiffel Tower: four legs, two platforms and a long taper. */
export function eiffel(l: Lot, ctx: LandmarkCtx): void {
  const { b } = ctx;
  const IRON = 0x80614a;
  const o = { win: interior(1.5) }; // floodlit gold at night
  const cx = l.x + l.w / 2, cz = l.z + l.d / 2, s = Math.min(l.w, l.d) / 2 - 0.4, H = l.y1;
  const y1 = H * 0.17, y2 = H * 0.35, y3 = H * 0.84;
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    b.beam([cx + sx * s, 0, cz + sz * s], [cx + sx * s * 0.62, y1, cz + sz * s * 0.62], 1.0, 0.8, IRON, o);
    b.beam([cx + sx * s * 0.6, y1 + 0.7, cz + sz * s * 0.6], [cx + sx * s * 0.34, y2, cz + sz * s * 0.34], 0.75, 0.6, IRON, o);
  }
  // the arches between the feet
  for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const pts: V3[] = [];
    for (let i = 0; i <= 8; i++) {
      const u = (i / 8) * 2 - 1;
      const y = 1.2 + (y1 - 1.9) * (1 - u * u);
      const lean = s * (1 - 0.38 * (y / y1));
      // along the side, and in from it as the legs lean
      pts.push([cx + ax * lean + az * u * s * 0.8, y, cz + az * lean + ax * u * s * 0.8]);
    }
    b.sweep(pts, pts.map(() => 0.24), IRON, o);
  }
  b.box(cx - s * 0.7, y1, cz - s * 0.7, cx + s * 0.7, y1 + 0.7, cz + s * 0.7, IRON, { ...o, faces: 'NESWTB' });
  b.box(cx - s * 0.42, y2, cz - s * 0.42, cx + s * 0.42, y2 + 0.6, cz + s * 0.42, IRON, { ...o, faces: 'NESWTB' });
  b.beam([cx, y2 + 0.6, cz], [cx, y3, cz], s * 0.34, 0.62, IRON, o);
  b.box(cx - 0.95, y3, cz - 0.95, cx + 0.95, y3 + 0.9, cz + 0.95, IRON, o);
  b.cyl(cx, cz, y3 + 0.9, y3 + 2.2, 0.6, 0.3, 6, IRON, { ...o, cap: false });
  b.cyl(cx, cz, y3 + 2.2, H, 0.16, 0.04, 5, 0xbdbdbd, { cap: false });
  lamp(ctx, cx, H + 0.3, cz, 0.5, '#fff1c9');
  ctx.lights.push({ x: cx, z: cz, r: 14, color: '#ffc866', k: 0.7 });
}

/** The Leaning Tower of Pisa, leaning a little more than the real one. */
export function pisa(l: Lot, ctx: LandmarkCtx): void {
  const { b } = ctx;
  const MARBLE = 0xf0ebe0, LEAN = 0.1;
  const cx = l.x + l.w / 2, cz = l.z + l.d / 2 - 0.6;
  b.box(l.x + 0.3, 0, l.z + 0.3, l.x + l.w - 0.3, 0.1, l.z + l.d - 0.3, 0x79b35f, { faces: 'T' });
  const win: WinSpec = { cell: 0.9, storey: 1.9, lit: 0, kind: 6 };
  const tier = (y0: number, y1: number, r: number): void => {
    const off = ((y0 + y1) / 2) * LEAN;
    b.cyl(cx, cz + off, y0, y1, r, r, 12, MARBLE, { win, seed: y0 * 0.07, cap: 0xd9d2c3 });
    b.cyl(cx, cz + off, y1 - 0.24, y1, r + 0.26, r + 0.26, 12, 0xe2dccd, { cap: 0xd9d2c3 });
  };
  tier(0.1, 3.2, 2.6);
  for (let i = 0; i < 6; i++) tier(3.2 + i * 1.9, 5.1 + i * 1.9, 2.5);
  tier(14.6, 17.2, 1.95);
  ctx.lights.push({ x: cx, z: cz + 3, r: 9, color: '#fff3dd', k: 0.6 });
}

/** The Statue of Liberty on her lawn, facing south-east. */
export function liberty(l: Lot, ctx: LandmarkCtx): void {
  const { b } = ctx;
  const L = { x: l.x + l.w / 2, z: l.z + l.d / 2, pondR: Math.min(l.w, l.d) / 2 - 0.7, top: l.y1 * 0.45 };
  const COPPER = 0x7dbfa6, STONE = 0xcdbfa6, CORNICE = 0xb9ad96;
  const g = interior(0.5);
  const D = Math.SQRT1_2;
  const F = { x: D, z: D }; // the way she faces
  const R = { x: -D, z: D }; // towards her right hand
  b.cyl(L.x, L.z, 0, 0.1, L.pondR + 0.6, L.pondR + 0.6, 20, 0xcfc8b8);
  b.cyl(L.x, L.z, 0.1, 0.16, L.pondR, L.pondR, 20, 0x8cb873);
  b.cyl(L.x, L.z, 0.16, 0.5, 4.2, 4.2, 12, 0x8cb873);
  // the star-shaped fort: two squares, one turned an eighth of a turn
  b.obox(L.x, 1.3, L.z, 3.0, 0.8, 3.0, 0, STONE);
  b.obox(L.x, 1.3, L.z, 3.0, 0.8, 3.0, Math.PI / 4, STONE);
  // the pedestal: half the height of the whole, as on the real one
  b.cyl(L.x, L.z, 2.1, 3.4, 3.1, 2.8, 4, STONE, { phase: 0, cap: CORNICE });
  b.cyl(L.x, L.z, 3.4, L.top, 2.7, 2.1, 4, STONE, { phase: 0, cap: CORNICE, win: interior(0.25) });
  b.cyl(L.x, L.z, L.top, L.top + 0.45, 2.45, 2.45, 4, CORNICE, { phase: 0 });
  const y0 = L.top + 0.45;
  // the figure
  b.cyl(L.x, L.z, y0, y0 + 7.4, 1.6, 1.05, 8, COPPER, { win: g, cap: false });
  b.cyl(L.x, L.z, y0 + 7.4, y0 + 9.6, 1.05, 0.85, 8, COPPER, { win: g, cap: COPPER });
  b.box(L.x - 0.48, y0 + 9.6, L.z - 0.48, L.x + 0.48, y0 + 10.7, L.z + 0.48, COPPER, { win: g });
  b.cyl(L.x, L.z, y0 + 10.6, y0 + 10.85, 0.78, 0.78, 8, COPPER, { win: g });
  for (let i = -2; i <= 2; i++) {
    // the rays of the crown, fanned towards the front
    const a = Math.PI / 4 + i * 0.5;
    const dx = Math.cos(a), dz = Math.sin(a);
    b.beam([L.x + dx * 0.55, y0 + 10.8, L.z + dz * 0.55], [L.x + dx * 1.25, y0 + 11.7, L.z + dz * 1.25], 0.1, 0.03, COPPER, { win: g });
  }
  // the raised arm and the torch
  const shoulder: V3 = [L.x + R.x * 0.8, y0 + 9.0, L.z + R.z * 0.8];
  const hand: V3 = [L.x + R.x * 1.45, y0 + 13.4, L.z + R.z * 1.45];
  b.beam(shoulder, hand, 0.38, 0.28, COPPER, { win: g });
  b.beam(hand, [hand[0], hand[1] + 1.0, hand[2]], 0.2, 0.42, COPPER, { win: g });
  b.box(hand[0] - 0.26, hand[1] + 1.0, hand[2] - 0.26, hand[0] + 0.26, hand[1] + 1.65, hand[2] + 0.26, 0xf0c755, { win: interior(4) });
  lamp(ctx, hand[0], hand[1] + 1.9, hand[2], 0.5, '#ffd27a');
  // the tablet, held in the other arm
  b.obox(L.x - R.x * 1.05 + F.x * 0.35, y0 + 7.4, L.z - R.z * 1.05 + F.z * 0.35, 0.5, 0.85, 0.17, Math.PI / 4 + Math.PI / 2, COPPER, { win: g });
  ctx.lights.push({ x: L.x, z: L.z, r: 12, color: '#bfe8d8', k: 0.55 });
}

/** Kyoto Tower: a white candle with a red-ringed lantern, standing on a hotel block. */
export function kyoto(l: Lot, ctx: LandmarkCtx): void {
  const { b } = ctx;
  const WHITE = 0xf1eee6, RED = 0xe2532f, ROOF = 0x8d8a83;
  const cx = l.x + l.w / 2, cz = l.z + l.d / 2, H = l.y1;
  // the block it stands on: shops below, hotel rooms above
  b.box(l.x + 0.5, 0, l.z + 0.5, l.x + l.w - 0.5, 12.5, l.z + l.d - 0.5, 0xe6e1d6, { win: { cell: 2.6, storey: 5, lit: 0.5, kind: 2 }, seed: 0.37, top: ROOF });
  b.box(l.x + 2.4, 12.5, l.z + 2.4, l.x + l.w - 2.4, 16, l.z + l.d - 2.4, 0xdcd6c9, { win: { cell: 2.3, storey: 3.5, lit: 0.45, kind: 0 }, seed: 0.52, top: ROOF });
  // the shaft: slender at the waist, flaring towards the lantern
  const y0 = 16, yPod = H * 0.72;
  turned(b, cx, cz, [[y0, 3.0], [y0 + 3, 2.1], [y0 + (yPod - y0) * 0.55, 1.45], [yPod - 2.5, 1.9], [yPod, 3.3]], 12, WHITE, interior(0.55));
  // the lantern: a red ring, a band of windows and a white cap
  b.cyl(cx, cz, yPod, yPod + 1.3, 4.3, 4.3, 14, RED, { win: interior(0.9), cap: RED });
  b.cyl(cx, cz, yPod + 1.3, yPod + 3.6, 3.7, 3.7, 14, 0x9cc3d3, { win: { cell: 1.1, storey: 2.3, lit: 1, kind: 1 }, seed: 0.2, cap: WHITE });
  b.cyl(cx, cz, yPod + 3.6, yPod + 4.4, 4.0, 3.5, 14, WHITE, { win: interior(0.5), cap: WHITE });
  b.cyl(cx, cz, yPod + 4.4, yPod + 6.6, 2.4, 1.2, 12, WHITE, { win: interior(0.5), cap: WHITE });
  b.cyl(cx, cz, yPod + 6.6, H - 4, 0.7, 0.4, 8, RED, { win: interior(0.6), cap: false });
  b.cyl(cx, cz, H - 4, H, 0.28, 0.06, 6, 0xe9e9ec, { cap: false });
  lamp(ctx, cx, H + 0.4, cz, 0.55);
  ctx.lights.push({ x: cx, z: cz + l.d / 2 + 3, r: 12, color: '#ffe9c4', k: 0.5 });
  ctx.lights.push({ x: cx + l.w / 2 + 3, z: cz, r: 12, color: '#ffe9c4', k: 0.5 });
}

/** A five-storey pagoda in a gravel garden, lit from within like a lantern. */
export function pagoda(l: Lot, ctx: LandmarkCtx): void {
  const { b } = ctx;
  const RED = 0xc8402a, WHITE = 0xf4e6c8, TILE = 0x3d4a4f, WOOD = 0x6b3b2a, GOLD = 0xd9b24a, STONE = 0x9a968c;
  const cx = l.x + l.w / 2, cz = l.z + l.d / 2;
  const D = Math.SQRT2; // a four-sided "cylinder" is measured to its corners
  const Q = Math.PI / 4;
  b.box(l.x + 0.4, 0, l.z + 0.4, l.x + l.w - 0.4, 0.08, l.z + l.d - 0.4, 0xd8d2c4, { faces: 'T' });
  b.box(cx - 5, 0.08, cz - 5, cx + 5, 0.9, cz + 5, 0xb9b2a2);
  const tiers = 5;
  let y = 0.9;
  const tierH = (l.y1 * 0.78 - y) / tiers;
  for (let i = 0; i < tiers; i++) {
    const hw = 3.5 - i * 0.42; // half the width of this storey
    const bodyH = tierH * 0.56;
    // paper walls that glow at night, storey above storey
    b.box(cx - hw, y, cz - hw, cx + hw, y + bodyH, cz + hw, WHITE, { win: interior(1.15) });
    // a red rail around the storey, and red posts at its corners
    b.box(cx - hw - 0.3, y, cz - hw - 0.3, cx + hw + 0.3, y + 0.5, cz + hw + 0.3, RED);
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      b.box(cx + sx * hw - 0.22, y + 0.5, cz + sz * hw - 0.22, cx + sx * hw + 0.22, y + bodyH, cz + sz * hw + 0.22, RED, { faces: 'NESW' });
    }
    // the roof: a wide eave that sweeps in to the storey above
    const eave = hw + 2.3 - i * 0.12, next = hw - 0.17;
    b.cyl(cx, cz, y + bodyH, y + bodyH + 0.35, eave * D, eave * D, 4, WOOD, { phase: Q, cap: false });
    b.cyl(cx, cz, y + bodyH + 0.35, y + tierH, eave * D, next * D, 4, TILE, { phase: Q, cap: TILE });
    y += tierH;
  }
  // the finial: a mast with rings
  b.cyl(cx, cz, y, y + 1.0, 0.9, 0.5, 8, TILE, { cap: false });
  b.cyl(cx, cz, y + 1.0, l.y1, 0.2, 0.05, 6, GOLD, { win: interior(0.6), cap: false });
  for (let k = 0; k < 5; k++) {
    const r = 0.62 - k * 0.07;
    b.cyl(cx, cz, y + 1.6 + k * 0.75, y + 1.85 + k * 0.75, r, r, 8, GOLD, { win: interior(0.6) });
  }
  // stone lanterns on either side of the way in
  for (const side of [-1, 1]) {
    const lx = cx + side * 2.4, lz = l.z + l.d - 1.5;
    b.box(lx - 0.25, 0.08, lz - 0.25, lx + 0.25, 1.3, lz + 0.25, STONE);
    b.box(lx - 0.45, 1.3, lz - 0.45, lx + 0.45, 1.9, lz + 0.45, 0xfff1c9, { win: interior(3) });
    b.cyl(lx, lz, 1.9, 2.5, 0.85, 0.1, 4, STONE, { phase: Q, cap: false });
    ctx.lights.push({ x: lx, z: lz, r: 6, color: '#ffd9a0', k: 0.5 });
  }
  ctx.lights.push({ x: cx, z: cz, r: 14, color: '#ffb48a', k: 0.55 });
}

// ---------------------------------------------------------------------------
// Monuments that stand on their own
// ---------------------------------------------------------------------------

/** The Gateway Arch, standing north to south as the real one does. */
export function gatewayArch({ b, lights }: LandmarkCtx): void {
  const k = 3.0, n = 34;
  const pts: V3[] = [], radii: number[] = [];
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * 2 - 1;
    const y = ARCH.height * (1 - (Math.cosh(k * u) - 1) / (Math.cosh(k) - 1));
    pts.push([ARCH.x, y, ARCH.z + (u * ARCH.span) / 2]);
    radii.push(2.3 - 1.5 * (y / ARCH.height)); // thick at the feet, slender at the crown
  }
  b.sweep(pts, radii, 0xc9d3db, { win: interior(0.34) });
  for (const side of [-1, 1]) {
    const z = ARCH.z + (side * ARCH.span) / 2;
    b.box(ARCH.x - 4.5, 0, z - 4.5, ARCH.x + 4.5, 0.14, z + 4.5, 0xd8d2c4, { faces: 'NESWT' });
    lights.push({ x: ARCH.x, z, r: 11, color: '#e6f0ff', k: 0.6 });
  }
}

/** A great torii for the way in to a shrine. */
export function torii(ctx: LandmarkCtx): void {
  const { b } = ctx;
  const T = TORII;
  const RED = 0xd8432b, BLACK = 0x23262b;
  const g = interior(0.5);
  const top = T.height;
  for (const side of [-1, 1]) {
    const z = T.z + side * T.half;
    b.cyl(T.x, z, 0, 1.0, 1.0, 0.85, 8, BLACK);
    b.cyl(T.x, z, 1.0, top - 1.0, 0.62, 0.52, 8, RED, { win: g, cap: false });
    ctx.lights.push({ x: T.x, z, r: 9, color: '#ffb48a', k: 0.5 });
  }
  const zA = T.z - T.half - 2.6, zB = T.z + T.half + 2.6;
  // the tie beam, the strut above it, and the two beams of the lintel
  b.box(T.x - 0.32, top - 3.6, T.z - T.half - 1.2, T.x + 0.32, top - 2.8, T.z + T.half + 1.2, RED, { win: g, faces: 'NESWTB' });
  b.box(T.x - 0.34, top - 2.8, T.z - 0.5, T.x + 0.34, top - 1.0, T.z + 0.5, BLACK);
  b.box(T.x - 0.45, top - 1.0, zA + 0.5, T.x + 0.45, top - 0.1, zB - 0.5, RED, { win: g, faces: 'NESWTB' });
  b.box(T.x - 0.6, top - 0.1, zA + 2.0, T.x + 0.6, top + 0.75, zB - 2.0, BLACK, { faces: 'NESWTB' });
  // its ends turn up
  b.beam([T.x, top + 0.33, zA + 2.0], [T.x, top + 0.95, zA - 0.2], 0.52, 0.46, BLACK);
  b.beam([T.x, top + 0.33, zB - 2.0], [T.x, top + 0.95, zB + 0.2], 0.52, 0.46, BLACK);
}

/** The Taj Mahal, with its garden, pool and gate, filling a whole block. */
export function taj(ctx: LandmarkCtx): void {
  const { b } = ctx;
  const r = TAJ;
  const MARBLE = 0xf3efe6, SHADE = 0xe6e0d2, RED = 0xb5553c, WATER = 0x6fb7d9, PATH = 0xdccfb8, GOLD = 0xd9b24a, RECESS = 0x9a8f7c;
  const g = interior(0.4);
  const cx = (r.x0 + r.x1) / 2;
  const pz = r.z0 + 17; // the middle of the plinth
  const P = 13.5; // half its width
  b.box(cx - P, 0, pz - P, cx + P, 2.4, pz + P, SHADE, { win: g, top: MARBLE });
  const y0 = 2.4;

  // the tomb: eight-sided, with a tall portal on each main face
  const R8 = 8.3, flat = R8 * Math.cos(Math.PI / 8);
  b.cyl(cx, pz, y0, y0 + 9, R8, R8, 8, MARBLE, { phase: -Math.PI / 8, win: g, cap: SHADE });
  const portal = (nx: number, nz: number): void => {
    const ax = Math.abs(nz) > 0.5; // a face that runs along x
    const mx = cx + nx * (flat + 0.2), mz = pz + nz * (flat + 0.2);
    const hx = ax ? 3.1 : 0.32, hz = ax ? 0.32 : 3.1;
    b.box(mx - hx, y0, mz - hz, mx + hx, y0 + 10.4, mz + hz, MARBLE, { win: g });
    const px = cx + nx * (flat + 0.55), pz2 = pz + nz * (flat + 0.55);
    const qx = ax ? 1.9 : 0.04, qz = ax ? 0.04 : 1.9;
    b.box(px - qx, y0 + 0.4, pz2 - qz, px + qx, y0 + 7.6, pz2 + qz, RECESS);
    b.box(px - qx * 0.62, y0 + 7.6, pz2 - qz * 0.62, px + qx * 0.62, y0 + 8.5, pz2 + qz * 0.62, RECESS);
  };
  portal(0, 1); portal(0, -1); portal(1, 0); portal(-1, 0);

  // the drum, the onion dome and its finial
  b.cyl(cx, pz, y0 + 9, y0 + 12, 3.9, 3.9, 12, MARBLE, { win: g, cap: false });
  turned(b, cx, pz, [[y0 + 12, 3.9], [y0 + 13.5, 5.0], [y0 + 15.6, 5.25], [y0 + 17.8, 4.3], [y0 + 19.7, 2.6], [y0 + 21.0, 0.8], [y0 + 21.5, 0.22]], 12, MARBLE, g);
  b.cyl(cx, pz, y0 + 21.5, y0 + 24.4, 0.22, 0.04, 6, GOLD, { cap: false });

  // four small domed kiosks on the roof
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const kx = cx + sx * 5.3, kz = pz + sz * 5.3;
    b.cyl(kx, kz, y0 + 9, y0 + 10.5, 1.15, 1.15, 8, MARBLE, { win: g, cap: false });
    turned(b, kx, kz, [[y0 + 10.5, 1.3], [y0 + 11.0, 1.35], [y0 + 11.8, 0.7], [y0 + 12.3, 0.1]], 8, MARBLE, g);
  }

  // four minarets at the corners of the plinth
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const mx = cx + sx * (P - 1.3), mz = pz + sz * (P - 1.3);
    b.cyl(mx, mz, y0, y0 + 13, 1.0, 0.72, 8, MARBLE, { win: g, cap: SHADE });
    for (const ry of [4.3, 8.6, 12.7]) b.cyl(mx, mz, y0 + ry, y0 + ry + 0.3, 1.25, 1.25, 8, SHADE);
    b.cyl(mx, mz, y0 + 13, y0 + 14.1, 0.8, 0.8, 8, MARBLE, { win: g, cap: false });
    turned(b, mx, mz, [[y0 + 14.1, 0.9], [y0 + 14.5, 0.92], [y0 + 15.1, 0.5], [y0 + 15.5, 0.08]], 8, MARBLE, g);
  }

  // the red sandstone buildings on either side
  for (const side of [-1, 1]) {
    const bx = cx + side * (P + 5.4);
    b.box(bx - 3.4, 0, pz - 6, bx + 3.4, 5.2, pz + 6, RED, { win: { cell: 1.7, storey: 5.2, lit: 0.6, kind: 6 }, seed: 0.3 + side * 0.1, top: 0x9c4a35 });
    for (const dz of [-3.6, 0, 3.6]) {
      turned(b, bx, pz + dz, [[5.2, dz === 0 ? 1.7 : 1.2], [5.9, dz === 0 ? 1.75 : 1.25], [7.0, dz === 0 ? 0.9 : 0.6], [7.5, 0.1]], 8, MARBLE, g);
    }
  }

  // the garden: paths, the long pool, and the gate at the far end
  const front = pz + P, back = r.z1 - 5.2;
  b.box(cx - 2.6, 0, front, cx + 2.6, 0.07, back, PATH, { faces: 'T' });
  b.box(cx - 1.4, 0, front + 1.6, cx + 1.4, 0.13, back - 1.6, WATER, { faces: 'NESWT' });
  const mid = (front + back) / 2;
  b.box(r.x0 + 1, 0, mid - 1.3, r.x1 - 1, 0.07, mid + 1.3, PATH, { faces: 'T' });
  b.box(cx - 2.6, 0.13, mid - 2.6, cx + 2.6, 0.5, mid + 2.6, MARBLE, { win: g });
  b.box(cx - 5.2, 0, back, cx + 5.2, 7.5, r.z1 - 1.4, RED, { win: { cell: 1.7, storey: 7.5, lit: 0.5, kind: 6 }, seed: 0.9, top: 0x9c4a35 });
  b.box(cx - 2.3, 0, back - 0.4, cx + 2.3, 9.2, r.z1 - 1.0, RED, { top: 0x9c4a35 });
  b.box(cx - 1.4, 0.3, r.z1 - 1.0, cx + 1.4, 6.6, r.z1 - 0.95, RECESS, { faces: 'S' });
  b.box(cx - 1.4, 0.3, back - 0.45, cx + 1.4, 6.6, back - 0.4, RECESS, { faces: 'N' });
  for (const dx of [-4.2, 4.2]) turned(b, cx + dx, (back + r.z1 - 1.4) / 2, [[7.5, 0.9], [7.9, 0.95], [8.6, 0.5], [9.0, 0.08]], 8, MARBLE, g);

  ctx.lights.push({ x: cx, z: pz, r: 26, color: '#f4f0e6', k: 0.5 });
  ctx.lights.push({ x: cx, z: mid, r: 16, color: '#f4f0e6', k: 0.35 });
  ctx.lights.push({ x: cx, z: r.z1 - 3, r: 10, color: '#ffd9a8', k: 0.45 });
}
