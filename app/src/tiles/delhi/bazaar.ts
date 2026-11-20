// Old Delhi's street life: Chandni Chowk with its cycle rickshaws, Paranthe Wali Gali and the jalebi corner, Khari Baoli, the kebab lane, and the kites and pigeons over the roofs.
//
// Every place and size is taken from the plan: the thing's own lot, the line of
// Chandni Chowk, and the roofs of the havelis the kites fly from. Shops are
// open-fronted rows built with `shopRow`, which works in a frame of its own:
// along x from 0, its front at z = 0 and its back towards -z. `placed` stands
// such a row along whichever side of a lot it belongs to.

import * as THREE from 'three';
import { placed } from '../../engine/build';
import { Smoke } from '../../engine/effects';
import { GeoBuilder, interior, rng, type V3 } from '../../engine/geo';
import { area, rect } from '../../engine/ground';
import { lantern, tri } from '../../engine/parts';
import { DEVANAGARI, type SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { BUFF, RECESS, RED, RED_LIGHT } from './mughal';
import { CHANDNI, PLOTS, STOREY, type Thing } from './plan';

export type Model = (k: Build, t: Thing) => void;

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const WOOD = 0x9a7048, WOOD_DARK = 0x6b4a30, JUTE = 0xb39566, IRON = 0x2b2b2e, STEEL = 0xcfd3d8, BRASS = 0xc9a24a, TIN = 0x9aa0a6;
const BAMBOO = 0xd8bf86, STRING = 0xf6f1e4, WIRE = 0xd5d6d2, POLE = 0xbab6ac, ROOF = 0xb8ad9a, BOARD_BACK = 0x2a2420;
const SKIN = 0x8d5a3b, VEST = 0xeeeae0, LUNGI = 0x4f5d73;
const CHILLI = 0xb52a1c, TURMERIC = 0xe0a91c, CUMIN = 0x8a6236, CORIANDER = 0x9c8a4a, PAPRIKA = 0x9c3a20, ALMOND = 0xc89a64, CASHEW = 0xe9d7a8, RAISIN = 0x6b3a2a;
const JALEBI = 0xf08a1c, OIL = 0xc98d2a;
/** The colours old houses in the walled city are washed in. */
const WASH = [0xe6d3b1, 0xd9b99a, 0xe2c27a, 0xd99a8a, 0xa9c1c9, 0xe9dcc4];
/** Oilcloth for the hoods of cycle rickshaws. */
const HOODS = [0xb8322a, 0x2f5fa8, 0x2f7d4f];

const KITE_COLOURS: [number, number][] = [
  [0xe0207a, 0xf2c41c], [0x22a04f, 0xf4f1e8], [0xd42a2a, 0x26262a], [0x2a63c8, 0xf28cb8], [0xf06a1c, 0x7b2fa8], [0xf2c41c, 0xd42a2a],
  [0x7b2fa8, 0xf4f1e8], [0x22aac0, 0xf06a1c], [0xf4f1e8, 0xe0207a], [0x26262a, 0xf2c41c], [0xe0207a, 0x22a04f], [0xf28cb8, 0x2a63c8],
];

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------

const ASPECT: Record<string, number> = {};
/** A board that says what is sold, in Hindi above and in English below. */
const sd = (id: string, hindi: string, text: string, color: string, ink: string): SignDef => {
  const aspect = Math.max(2.2, text.length * 0.62);
  ASPECT[`bazaar-${id}`] = aspect;
  return { id: `bazaar-${id}`, lines: [hindi, text], color, ink, aspect, kind: 'board', size: [Math.round(104 * aspect), 104], font: DEVANAGARI };
};

/** The signs this file hangs. Each says what is sold, and none says whose shop it is. */
export const SIGNS: SignDef[] = [
  sd('kites', 'पतंग', 'KITES', '#c8202c', '#fff6e0'),
  sd('parathas', 'परांठे', 'PARATHAS', '#f2c14e', '#5e1a1a'),
  sd('jalebi', 'जलेबी', 'JALEBI', '#e0601c', '#fff6e0'),
  sd('lassi', 'लस्सी', 'LASSI', '#f4f1e8', '#1f4fa8'),
  sd('spices', 'मसाले', 'SPICES', '#8e2a1c', '#f7d774'),
  sd('dry-fruit', 'सूखे मेवे', 'DRY FRUIT', '#2f5d3a', '#f4e7c4'),
  sd('kebabs', 'कबाब', 'KEBABS', '#1f5d48', '#f4f1e8'),
  sd('tea', 'चाय', 'TEA', '#f4f1e8', '#7a1f1f'),
];

type Face = 'N' | 'E' | 'S' | 'W';
/** How far `placed` turns a frame so that its front, which faces +z, faces this way. */
const TURN: Record<Face, number> = { S: 0, E: -90, W: 90, N: 180 };

/** A painted board on a dark backing that stands 0.1 proud of the wall at (x, y, z), facing `face` in k's own frame. */
function plate(k: Build, id: string, x: number, y: number, z: number, face: Face, h: number, maxW = 99): void {
  placed(k, x, z, TURN[face], (q) => {
    let w = h * (ASPECT[id] ?? 3), hh = h;
    if (w > maxW) { hh = (h * maxW) / w; w = maxW; }
    q.b.box(-w / 2 - 0.08, y - hh / 2 - 0.07, 0, w / 2 + 0.08, y + hh / 2 + 0.07, 0.1, BOARD_BACK, { faces: 'ESWTB' });
    q.sign(id, 0, y, 0.13, 0, 1, hh, w);
  });
}

// ---------------------------------------------------------------------------
// Small shared parts
// ---------------------------------------------------------------------------

/** A spoked wheel on an axle along z: a dark tyre and a lighter disc of spokes, drawn on both sides. */
function wheel(b: GeoBuilder, x: number, y: number, z: number, r: number, half: number): void {
  const n = 8;
  const p = (rr: number, i: number, zq: number): V3 => {
    const a = ((i + 0.5) / n) * Math.PI * 2;
    return [x + Math.cos(a) * rr, y + Math.sin(a) * rr, zq];
  };
  for (const s of [-1, 1]) {
    const zt = z + s * half, zh = z + s * (half + 0.02);
    for (let i = 1; i + 1 < n; i++) {
      tri(b, p(r, 0, zt), p(r, i, zt), p(r, i + 1, zt), [0, 0, s], 0x1c1c1f);
      tri(b, p(r * 0.72, 0, zh), p(r * 0.72, i, zh), p(r * 0.72, i + 1, zh), [0, 0, s], 0xb9bcc2);
    }
  }
}

/** A jute sack standing on `y`, open at the top to show what is in it, or tied shut if `top` is left out. */
function sack(b: GeoBuilder, x: number, z: number, y: number, top: number = JUTE, w = 0.7, d = 0.55, h = 0.6): void {
  b.box(x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2, JUTE, { top });
}

/** A handcart: a flat wooden bed on two big wheels, with its shafts out in front, along (cos yaw, sin yaw). `load` is the colours of the sacks on it. */
function handcart(k: Build, x: number, z: number, yaw: number, load: number[]): void {
  const b = k.b;
  b.moved(x, 0, z, yaw, () => {
    b.box(-1.3, 0.7, -0.52, 1.1, 0.84, 0.52, WOOD, { faces: 'NESWTB' });
    for (const s of [-1, 1]) {
      wheel(b, 0, 0.5, s * 0.58, 0.5, 0.03);
      b.beam([1.1, 0.78, s * 0.4], [2.1, 0.5, s * 0.36], 0.05, 0.04, WOOD_DARK);
      b.beam([-1.2, 0.72, s * 0.42], [-1.25, 0, s * 0.42], 0.05, 0.05, WOOD_DARK);
    }
    b.beam([0, 0.5, -0.58], [0, 0.5, 0.58], 0.04, 0.04, IRON);
    load.forEach((c, i) => {
      const col = i % 3, tier = Math.floor(i / 3);
      sack(b, -0.85 + col * 0.8, (tier % 2 ? 0.06 : -0.06), 0.84 + tier * 0.55, c, 0.72, 0.9, 0.55);
    });
  });
}

/** A porter carrying a load on his head. */
function porter(k: Build, x: number, z: number, load: number): void {
  k.person(x, z);
  k.b.box(x - 0.38, 2.34, z - 0.3, x + 0.38, 2.8, z + 0.3, load, { faces: 'NESWTB', top: load === JUTE ? JUTE : load });
}

// ---------------------------------------------------------------------------
// The cycle rickshaw
// ---------------------------------------------------------------------------

/** Who sits on a rickshaw besides its puller: nobody, a passenger, or the puller himself, resting on the seat while it stands. */
type Rider = 'none' | 'passenger' | 'resting';

/**
 * A cycle rickshaw at its stand, nose along +x, standing on y = 0: a bicycle's
 * front half pulling a seat for two on a pair of wheels, under a folding hood
 * of oilcloth. About 3.3 long and 1.3 wide.
 */
function rickshaw(b: GeoBuilder, hood: number, rider: Rider): void {
  const FRAME = 0x2f3a35, W = 0.62;
  // the wheels, and the frame of the bicycle in front
  wheel(b, 1.45, 0.42, 0, 0.42, 0.04);
  for (const s of [-1, 1]) wheel(b, -0.85, 0.48, s * 0.6, 0.48, 0.04);
  b.beam([-0.85, 0.48, -0.6], [-0.85, 0.48, 0.6], 0.04, 0.04, FRAME);
  b.beam([1.45, 0.42, 0], [1.3, 1.5, 0], 0.05, 0.05, FRAME);
  b.beam([1.3, 1.28, 0], [0.75, 1.3, 0], 0.045, 0.045, FRAME);
  b.beam([0.75, 1.36, 0], [0.55, 0.52, 0], 0.045, 0.045, FRAME);
  b.beam([1.32, 1.18, 0], [0.55, 0.52, 0], 0.045, 0.045, FRAME);
  b.beam([0.55, 0.52, 0], [-0.45, 0.58, 0], 0.05, 0.05, FRAME);
  b.box(0.6, 1.36, -0.12, 0.95, 1.46, 0.12, 0x1c1c1f, { faces: 'NESWTB' });
  b.beam([1.27, 1.56, -0.34], [1.27, 1.56, 0.34], 0.035, 0.035, 0x9a9ea4);
  // the footboard, the seat and its back
  b.box(-0.45, 0.52, -0.5, 0.1, 0.6, 0.5, WOOD_DARK, { faces: 'NESWTB' });
  b.box(-1.2, 0.52, -0.5, -0.5, 0.98, 0.5, 0x3b4a44, { faces: 'NESWB' });
  b.box(-1.25, 0.98, -0.57, -0.45, 1.2, 0.57, 0x8b2b2b, { faces: 'NESWTB' });
  b.box(-1.36, 1.2, -0.57, -1.22, 1.92, 0.57, 0x8b2b2b, { faces: 'NESWT' });
  // the hood: an arch of oilcloth over the seat, lighter outside than in
  const prof: [number, number][] = [[-1.4, 1.25], [-1.42, 2.25], [-1.05, 2.62], [-0.45, 2.58], [-0.15, 2.35]];
  const inside = new THREE.Color(hood).multiplyScalar(0.62).getHex();
  for (let i = 0; i + 1 < prof.length; i++) {
    const [x0, y0] = prof[i], [x1, y1] = prof[i + 1];
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1;
    let nx = dy / l, ny = -dx / l;
    if (nx * ((x0 + x1) / 2 + 0.8) + ny * ((y0 + y1) / 2 - 1.6) < 0) { nx = -nx; ny = -ny; }
    b.quad([x0, y0, -W], [x1, y1, -W], [x1, y1, W], [x0, y0, W], [nx, ny, 0], hood);
    b.quad([x0, y0, -W], [x1, y1, -W], [x1, y1, W], [x0, y0, W], [-nx, -ny, 0], inside);
  }
  const side: [number, number][] = [[-1.4, 1.25], [-1.42, 2.25], [-1.05, 2.62], [-0.45, 2.58], [-0.6, 2.12], [-1.15, 1.25]];
  for (const s of [-1, 1]) {
    for (let i = 1; i + 1 < side.length; i++) {
      const p = (j: number, zz: number): V3 => [side[j][0], side[j][1], zz];
      tri(b, p(0, s * W), p(i, s * W), p(i + 1, s * W), [0, 0, s], hood);
      tri(b, p(0, s * (W - 0.01)), p(i, s * (W - 0.01)), p(i + 1, s * (W - 0.01)), [0, 0, -s], inside);
    }
  }
  // a passenger on the seat, or the puller resting there with his feet on the board
  if (rider !== 'none') {
    const coat = rider === 'passenger' ? 0xc8487a : VEST, legs = rider === 'passenger' ? 0xc8487a : LUNGI;
    b.box(-1.16, 1.2, -0.24, -0.78, 2.02, 0.24, coat, { faces: 'NESWT' });
    b.box(-1.08, 2.02, -0.15, -0.8, 2.38, 0.15, SKIN, { faces: 'NESWT' });
    b.box(-0.95, 1.2, -0.22, -0.42, 1.4, 0.22, legs, { faces: 'NESWT' });
    b.box(-0.52, 0.6, -0.2, -0.3, 1.32, 0.2, rider === 'passenger' ? legs : SKIN, { faces: 'NESW' });
  }
}

// ---------------------------------------------------------------------------
// A row of open-fronted shops
// ---------------------------------------------------------------------------

interface RowOpts {
  /** Its length along x and its depth towards -z. */
  L: number; D: number;
  /** How many shops, and how many storeys stand over them. */
  n: number; upper: number;
  color: number; seed: number;
  /** Which end walls are left out on the ground floor, so that a corner shop opens to the side as well. */
  open?: 'start' | 'end';
  /** How far below the first floor the sunshade over the shopfronts is: it differs from one row to the next where two rows meet. */
  eave?: number;
}

/**
 * A row of open-fronted shops in a frame of its own: along x from 0 to L, the
 * fronts at z = 0, the back at z = -D. Each shop is a dark room lit from within
 * at night, between walls, with a sunshade over its front; `upper` storeys of
 * small windows stand over them, and a parapet round the roof. Returns the
 * height of the roof and the shops, as [u0, u1] along x.
 */
function shopRow(k: Build, o: RowOpts): { top: number; bays: [number, number][] } {
  const b = k.b, H = STOREY, bay = o.L / o.n, t = 0.22, back = -o.D + 0.35;
  b.box(0, 0, -o.D, o.L, H, back, o.color, { faces: 'NEW' });
  b.box(0.02, 0, back, o.L - 0.02, H - 0.02, back + 0.02, RECESS, { win: interior(0.8), faces: 'S' });
  for (let i = 0; i <= o.n; i++) {
    if ((i === 0 && o.open === 'start') || (i === o.n && o.open === 'end')) continue;
    const u0 = i === 0 ? 0 : i === o.n ? o.L - t : i * bay - t / 2;
    b.box(u0, 0, back, u0 + t, H, 0, o.color, { faces: 'NESW' });
  }
  const top = H * (1 + o.upper) + (o.upper ? 0 : 0.3);
  if (o.upper > 0) b.box(0, H, -o.D, o.L, top, 0, o.color, { win: { cell: 2.2, storey: H, lit: 0.35, kind: 4 }, seed: o.seed, faces: 'NESWTB', top: ROOF });
  else b.box(0, H, -o.D, o.L, top, 0, o.color, { faces: 'NESWTB', top: ROOF });
  // the sunshade over the shopfronts
  const ey = H - (o.eave ?? 0);
  b.box(-0.1, ey - 0.14, 0, o.L + 0.1, ey + 0.02, 0.65, 0xcfc4ae, { faces: 'ESWTB' });
  // the parapet round the roof
  const ph = o.upper ? 0.5 : 0.4, pt = 0.25;
  b.box(0, top, -pt, o.L, top + ph, 0, o.color, { top: 0xd8cfbb });
  b.box(0, top, -o.D, o.L, top + ph, -o.D + pt, o.color, { top: 0xd8cfbb });
  b.box(0, top, -o.D + pt, pt, top + ph, -pt, o.color, { faces: 'EWT', top: 0xd8cfbb });
  b.box(o.L - pt, top, -o.D + pt, o.L, top + ph, -pt, o.color, { faces: 'EWT', top: 0xd8cfbb });
  // a bulb in each shop
  const bays: [number, number][] = [];
  for (let i = 0; i < o.n; i++) {
    bays.push([i * bay, (i + 1) * bay]);
    k.glows.push({ x: (i + 0.5) * bay, y: H - 0.35, z: -0.7, sx: 0.16, sy: 0.2, sz: 0.16, color: '#fff1c4' });
  }
  k.lights.push({ x: o.L / 2, z: 1.2, r: Math.max(6, o.L * 0.6), color: '#ffd9a0', k: 0.5 });
  return { top: top + ph, bays };
}

// ---------------------------------------------------------------------------
// 1. Kites and pigeons over the roofs
// ---------------------------------------------------------------------------

/**
 * A fighter kite, a patang: a paper diamond in two colours with a little tail,
 * at `c`, facing whoever flies it, who is along `toward` (level, of length 1).
 * It leans back by `tilt` and is rolled by `roll`. Returns where its string is tied.
 */
function patang(g: GeoBuilder, c: V3, toward: [number, number], s: number, cols: [number, number], split: boolean, tilt = 0.45, roll = 0): V3 {
  const [fx, fz] = toward;
  const ax = -fz, az = fx; // across the kite
  const ux = -fx * Math.sin(tilt), uy = Math.cos(tilt), uz = -fz * Math.sin(tilt); // up it, leaning away from the flyer
  const cr = Math.cos(roll), sr = Math.sin(roll);
  const A: V3 = [ax * cr + ux * sr, uy * sr, az * cr + uz * sr];
  const U: V3 = [ux * cr - ax * sr, uy * cr, uz * cr - az * sr];
  const P = (a: number, v: number): V3 => [c[0] + (A[0] * a + U[0] * v) * s, c[1] + (A[1] * a + U[1] * v) * s, c[2] + (A[2] * a + U[2] * v) * s];
  let n: V3 = [A[1] * U[2] - A[2] * U[1], A[2] * U[0] - A[0] * U[2], A[0] * U[1] - A[1] * U[0]];
  if (n[0] * fx + n[2] * fz < 0) n = [-n[0], -n[1], -n[2]];
  const back: V3 = [-n[0], -n[1], -n[2]];
  const T = P(0, 0.55), B = P(0, -0.5), L = P(-0.52, 0.06), R = P(0.52, 0.06);
  const faces: [V3, V3, V3, number][] = split
    ? [[T, L, B, cols[0]], [T, B, R, cols[1]]]
    : [[L, R, T, cols[0]], [L, B, R, cols[1]]];
  faces.push([B, P(-0.15, -0.8), P(0.15, -0.8), cols[1]]);
  for (const [p0, p1, p2, col] of faces) {
    tri(g, p0, p1, p2, n, col);
    tri(g, p0, p1, p2, back, col);
  }
  const q = P(0, -0.05);
  return [q[0] + n[0] * 0.05, q[1] + n[1] * 0.05, q[2] + n[2] * 0.05];
}

/** A string or a wire that sags between two points. */
function sagging(b: GeoBuilder, a: V3, c: V3, sag: number, r: number, color: number, n = 4): void {
  const pts: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n, dip = 4 * f * (1 - f) * sag;
    pts.push([a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f - dip, a[2] + (c[2] - a[2]) * f]);
  }
  b.sweep(pts, pts.map(() => r), color);
}

/** A pigeon in flight, heading along `fwd` (level, of length 1). */
function pigeon(g: GeoBuilder, p: V3, fwd: [number, number], body: number, wing: number): void {
  const [fx, fz] = fwd, rx = -fz, rz = fx;
  g.obox(p[0], p[1], p[2], 0.22, 0.07, 0.08, Math.atan2(fz, fx), body, { faces: 'B' });
  for (const s of [-1, 1]) {
    const f: V3 = [p[0] + fx * 0.08, p[1] + 0.02, p[2] + fz * 0.08], bk: V3 = [p[0] - fx * 0.12, p[1] + 0.02, p[2] - fz * 0.12];
    const tip: V3 = [p[0] + rx * s * 0.55 - fx * 0.1, p[1] + 0.14, p[2] + rz * s * 0.55 - fz * 0.1];
    tri(g, f, bk, tip, [0, 1, 0], wing);
    tri(g, f, bk, tip, [0, -1, 0], wing);
  }
}

function kites(k: Build, t: Thing): void {
  const b = k.b, r = rng(80801);
  // the roofs of the havelis in this stretch, from west to east
  const roofs = PLOTS.filter((p) => p.style === 'haveli' && p.x < t.x + t.w && p.x + p.w > t.x && p.z < t.z + t.d && p.z + p.d > t.z).sort((a, c) => a.x - c.x);
  if (roofs.length < 4) throw new Error('kites: the plan has fewer than four roofs in this stretch');
  const at = (i: number, fx: number, fz: number): [number, number, number] => {
    const p = roofs[i];
    return [p.x + 1 + (p.w - 2) * fx, p.z + 1 + (p.d - 2) * fz, p.h];
  };
  const shop = roofs[1], loft = roofs[roofs.length - 1], high = roofs[2];

  // --- the pigeon loft: a bamboo cage on legs, a man with a long pole, and the flock ---
  const lx = loft.x + 2.6, lz = loft.z + 4, ly = loft.h;
  {
    const hx = 1.2, hz = 1.0, floor = ly + 1.2, roofY = floor + 1.9;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.beam([lx + sx * (hx - 0.1), ly, lz + sz * (hz - 0.1)], [lx + sx * (hx - 0.1), floor, lz + sz * (hz - 0.1)], 0.07, 0.07, BAMBOO);
    b.box(lx - hx, floor, lz - hz, lx + hx, floor + 0.12, lz + hz, 0xb89a68, { faces: 'NESWTB' });
    b.box(lx - hx + 0.12, floor + 0.12, lz - hz + 0.12, lx + hx - 0.12, roofY, lz + hz - 0.12, 0x4a3d30, { faces: 'NESW' });
    for (const u of [-1, -0.33, 0.33, 1]) {
      for (const s of [-1, 1]) {
        b.beam([lx + u * (hx - 0.05), floor + 0.12, lz + s * (hz - 0.05)], [lx + u * (hx - 0.05), roofY, lz + s * (hz - 0.05)], 0.035, 0.035, BAMBOO);
        if (Math.abs(u) < 1) b.beam([lx + s * (hx - 0.05), floor + 0.12, lz + u * (hz - 0.05)], [lx + s * (hx - 0.05), roofY, lz + u * (hz - 0.05)], 0.035, 0.035, BAMBOO);
      }
    }
    for (const y of [floor + 1.0, roofY - 0.05]) {
      for (const s of [-1, 1]) {
        b.beam([lx - hx, y, lz + s * (hz - 0.05)], [lx + hx, y, lz + s * (hz - 0.05)], 0.035, 0.035, BAMBOO);
        b.beam([lx + s * (hx - 0.05), y, lz - hz], [lx + s * (hx - 0.05), y, lz + hz], 0.035, 0.035, BAMBOO);
      }
    }
    b.box(lx - hx - 0.25, roofY, lz - hz - 0.25, lx + hx + 0.25, roofY + 0.12, lz + hz + 0.25, TIN, { faces: 'NESWTB' });
    // a landing board at the front, and a few birds at rest on the roof
    b.box(lx - 0.7, floor + 0.9, lz + hz, lx + 0.7, floor + 0.98, lz + hz + 0.55, 0xb89a68, { faces: 'NESWTB' });
    for (const [dx, dz, c] of [[-0.6, 0.2, 0x8e9299], [0.1, -0.3, 0xf2f0ea], [0.7, 0.4, 0x8e9299]]) b.box(lx + dx - 0.16, roofY + 0.12, lz + dz - 0.08, lx + dx + 0.16, roofY + 0.3, lz + dz + 0.08, c);
    // the man who flies them, waving his pole with a rag at its tip
    const mx = lx + 2.2, mz = lz + 2.4;
    k.person(mx, mz, ly);
    const tip: V3 = [mx + 1.5, ly + 6.2, mz - 1.3];
    b.beam([mx + 0.3, ly + 1.5, mz], tip, 0.06, 0.04, BAMBOO);
    for (const s of [-1, 1]) b.quad(tip, [tip[0] + 0.05, tip[1] - 0.7, tip[2] + 0.02], [tip[0] + 0.75, tip[1] - 0.55, tip[2] + 0.1], [tip[0] + 0.7, tip[1] + 0.1, tip[2] + 0.08], [0.1 * s, 0, s], 0x2a2a2e);
    k.lights.push({ x: lx, z: lz + 2, r: 6, color: '#ffe2ae', k: 0.45 });

    // the flock: one mesh that wheels round over the loft
    const fg = new GeoBuilder(), fr = rng(80802);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + (fr() - 0.5) * 0.35, R = 4 + fr() * 1.6;
      const white = fr() < 0.3;
      pigeon(fg, [Math.cos(a) * R, fr() * 1.4, Math.sin(a) * R], [Math.sin(a), -Math.cos(a)], white ? 0xf2f0ea : 0x7f858d, white ? 0xf8f6f0 : 0x9aa3ad);
    }
    const flock = new THREE.Mesh(fg.build(), k.mat.city());
    flock.name = 'pigeons';
    flock.frustumCulled = false;
    k.group.add(flock);
    const fy = ly + 8.3;
    flock.position.set(lx, fy, lz);
    k.each((_dt, time) => {
      flock.rotation.set(0.1 * Math.sin(time * 0.3), time * 0.55, 0.08 * Math.sin(time * 0.23));
      flock.position.y = fy + 0.7 * Math.sin(time * 0.4);
    });
  }

  // --- the kite shop on a roof terrace: a kiosk, and rows of kites hung like bunting ---
  {
    const y = shop.h, x1 = shop.x + shop.w - 0.6, x0 = x1 - 3.4, z1 = shop.z + shop.d - 0.7, z0 = z1 - 2.3, WALL = 0xe9dcc4;
    b.box(x0, y, z0, x1, y + 2.3, z0 + 0.12, WALL, { faces: 'NESW' });
    for (const x of [x0, x1 - 0.12]) b.box(x, y, z0 + 0.12, x + 0.12, y + 2.3, z1, WALL, { faces: 'NESW' });
    b.box(x0 + 0.12, y, z0 + 0.12, x1 - 0.12, y + 2.28, z0 + 0.14, RECESS, { win: interior(0.9), faces: 'S' });
    b.box(x0 - 0.15, y + 2.3, z0 - 0.15, x1 + 0.15, y + 2.42, z1 + 0.45, TIN, { faces: 'NESWTB' });
    b.box(x0 + 0.2, y, z1 - 0.6, x1 - 0.2, y + 0.9, z1 - 0.05, WOOD, { top: 0xd9c9a8 });
    // kites in piles on the counter, and spools of string
    [0xe0207a, 0xf2c41c, 0x22a04f, 0x2a63c8].forEach((c, i) => b.box(x0 + 0.35 + i * 0.6, y + 0.9, z1 - 0.52, x0 + 0.85 + i * 0.6, y + 0.96 + (i % 2) * 0.05, z1 - 0.12, c));
    for (const x of [x1 - 0.8, x1 - 0.45]) b.cyl(x, z1 - 0.32, y + 0.9, y + 1.22, 0.12, 0.12, 6, BAMBOO);
    // and kites on the back wall
    for (let i = 0; i < 4; i++) patang(b, [x0 + 0.55 + i * 0.78, y + 1.6 + (i % 2) * 0.25, z0 + 0.2], [0, 1], 0.55, KITE_COLOURS[i * 2], i % 2 === 0, 0);
    k.glows.push({ x: (x0 + x1) / 2, y: y + 2.1, z: z1 - 0.9, sx: 0.16, sy: 0.2, sz: 0.16, color: '#fff1c4' });
    k.lights.push({ x: (x0 + x1) / 2, z: z1 + 1, r: 6, color: '#ffd9a0', k: 0.55 });
    plate(k, 'bazaar-kites', (x0 + x1) / 2, y + 2.78, z1 + 0.45, 'S', 0.6, 3);
    // the bunting: three strings between bamboo poles, each hung with a row of kites facing the street
    const px0 = shop.x + 0.8, px1 = shop.x + shop.w - 0.8;
    for (let row = 0; row < 3; row++) {
      const z = shop.z + 2.2 + row * 2, top = y + 2.6;
      for (const x of [px0, px1]) b.beam([x, y, z], [x, top + 0.1, z], 0.06, 0.05, BAMBOO);
      sagging(b, [px0, top, z], [px1, top, z], 0.3, 0.025, STRING);
      const n = 7;
      for (let i = 0; i < n; i++) {
        const f = (i + 0.5) / n, x = px0 + (px1 - px0) * f, sy = top - 4 * f * (1 - f) * 0.3;
        patang(b, [x, sy - 0.32, z + 0.03], [0, 1], 0.55, KITE_COLOURS[(row * 5 + i) % KITE_COLOURS.length], (i + row) % 2 === 0, 0);
      }
    }
  }

  // --- a wire between two roofs, with a kite caught on it ---
  const poleA: V3 = [high.x + high.w - 0.6, high.h + 2.6, high.z + 7], poleB: V3 = [loft.x + 0.6, loft.h + 4.2, high.z + 7.5];
  {
    for (const p of [poleA, poleB]) b.cyl(p[0], p[2], p[1] - (p === poleA ? 2.6 : 4.2), p[1] + 0.1, 0.09, 0.07, 6, POLE, { cap: false });
    sagging(b, poleA, poleB, 0.3, 0.03, WIRE);
    sagging(b, [poleA[0], poleA[1] - 0.5, poleA[2]], [poleB[0], poleB[1] - 0.5, poleB[2]], 0.3, 0.03, WIRE);
    const mx = (poleA[0] + poleB[0]) / 2 + 0.3, my = (poleA[1] + poleB[1]) / 2 - 0.3, mz = (poleA[2] + poleB[2]) / 2 + 0.05;
    const tie = patang(b, [mx, my - 0.4, mz + 0.06], [0, 1], 1.3, [0xf2c41c, 0xe0207a], true, 0.1, 0.75);
    sagging(b, tie, [mx + 0.6, loft.h + 1.6, mz + 0.4], -0.25, 0.022, STRING, 3);
  }

  // --- the flyers on the roofs, and the kites themselves: one mesh that sways on the wind ---
  const flyers: [number, number, number][] = [
    at(0, 0.15, 0.25), at(0, 0.7, 0.15), at(0, 0.35, 0.8), at(0, 0.85, 0.7),
    [shop.x + 1.4, shop.z + shop.d - 1.8, shop.h], [shop.x + shop.w - 2.2, shop.z + 0.9, shop.h],
    at(2, 0.15, 0.2), at(2, 0.6, 0.15), at(2, 0.3, 0.75), at(2, 0.6, 0.85),
    [loft.x + 1.1, loft.z + 1.1, loft.h], [loft.x + loft.w - 1.4, loft.z + loft.d - 1.2, loft.h],
  ];
  // and some who have come up to watch
  for (const [i, fx, fz] of [[0, 0.5, 0.5], [2, 0.85, 0.4], [3, 0.8, 0.15]] as [number, number, number][]) k.person(...at(i, fx, fz));

  const g = new GeoBuilder();
  const spans: { v0: number; v1: number; y0: number; y1: number; A: number; w: number; p: number; q: number }[] = [];
  const order = [3, 8, 0, 10, 5, 1, 11, 6, 2, 9, 4, 7];
  flyers.forEach(([px, pz, py], i) => {
    k.person(px, pz, py);
    const hand: V3 = [px + 0.3, py + 1.75, pz + 0.1];
    let ky = 14 + (14 * order[i]) / 11;
    const th = (r() - 0.5) * 2.6, d = (ky - hand[1]) * (0.35 + r() * 0.35);
    let kx = Math.min(t.x + t.w - 1, Math.max(t.x - 4, px + Math.sin(th) * d)), kz = pz + Math.cos(th) * d;
    // keep clear of the pigeons
    if (Math.hypot(kx - lx, kz - lz) < 7 && ky < 20) { ky = 20 + (ky - 14) * 0.5; kx -= 2; }
    const hx = hand[0] - kx, hz = hand[2] - kz, hl = Math.hypot(hx, hz) || 1;
    const v0 = g.triangles * 3;
    const tie = patang(g, [kx, ky, kz], [hx / hl, hz / hl], 3.1, KITE_COLOURS[i], i % 3 !== 1, 0.25 + r() * 0.25, (r() - 0.5) * 0.7);
    sagging(g, hand, tie, Math.hypot(tie[0] - hand[0], tie[1] - hand[1], tie[2] - hand[2]) * 0.05, 0.02, STRING, 3);
    spans.push({ v0, v1: g.triangles * 3, y0: hand[1], y1: ky - 0.9, A: 0.4 + r() * 0.5, w: 0.7 + r() * 0.6, p: r() * 6.3, q: r() * 6.3 });
  });
  const geo = g.build();
  const mesh = new THREE.Mesh(geo, k.mat.city());
  mesh.name = 'kites';
  mesh.frustumCulled = false;
  k.group.add(mesh);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const arr = pos.array as Float32Array, base = Float32Array.from(arr), wt = new Float32Array(pos.count);
  for (const s of spans) for (let v = s.v0; v < s.v1; v++) wt[v] = Math.min(1, Math.max(0, (base[v * 3 + 1] - s.y0) / (s.y1 - s.y0)));
  k.each((_dt, time) => {
    for (const s of spans) {
      // a fighter kite darts and dips: a slow swing, with a quicker one on top of it
      const ox = s.A * (Math.sin(time * s.w + s.p) + 0.35 * Math.sin(time * s.w * 2.7 + s.q));
      const oy = 0.45 * s.A * Math.sin(time * s.w * 1.3 + s.q);
      const oz = 0.6 * s.A * Math.cos(time * s.w * 0.8 + s.p);
      for (let v = s.v0; v < s.v1; v++) {
        const w = wt[v];
        arr[v * 3] = base[v * 3] + ox * w;
        arr[v * 3 + 1] = base[v * 3 + 1] + oy * w;
        arr[v * 3 + 2] = base[v * 3 + 2] + oz * w;
      }
    }
    pos.needsUpdate = true;
  });
}

// ---------------------------------------------------------------------------
// 2. Chandni Chowk
// ---------------------------------------------------------------------------

/**
 * The cycle rickshaws that move on Chandni Chowk are the main session's, as traffic. They run in two strips, 3 wide,
 * centred this far either side of the street's middle, from 3 in from its west end to 3 in from its east end, and turn
 * at the ends: nothing of this file stands there. What stands on the street keeps to its middle and its two edges.
 */
const STRIP = { end: 3 };

/** Lines that something moves along, as [x, y, z] points, for the check that nothing crosses a road on the level. */
export const RAILS: Record<string, [number, number, number][]> = {};

function chandniChowk(k: Build, t: Thing): void {
  const b = k.b, r = rng(30303), zc = t.z + t.d / 2, zN = t.z, zS = t.z + t.d, GRANITE = 0xb9b2a6;
  /** How far in from the lots the edges are that people, carts and the stand keep to. */
  const EDGE = 1.4;

  // --- the verge down the middle: a low kerb of stone, bollards, planters, benches and lamps. It stops short of the ends, where the rickshaws turn. ---
  const vx0 = t.x + STRIP.end + 4, vx1 = t.x + t.w - STRIP.end - 4, vh = 0.32, vw = 0.6;
  b.box(vx0, 0, zc - vw, vx1, vh, zc + vw, GRANITE, { top: 0xb06a52 });
  const planters: number[] = [];
  for (let x = vx0 + 2; x < vx1 - 1; x += 9) planters.push(x);
  for (const x of planters) {
    b.box(x - 0.9, vh, zc - 0.5, x + 0.9, vh + 0.6, zc + 0.5, RED, { top: 0x5a4632 });
    k.tree(x, zc, 0.32, false, vh + 0.6);
  }
  for (let x = vx0 + 0.4; x < vx1; x += 3) {
    if (planters.some((p) => Math.abs(p - x) < 1.3)) continue;
    for (const s of [-1, 1]) b.box(x - 0.12, vh, zc + s * 0.42 - 0.12, x + 0.12, vh + 0.62, zc + s * 0.42 + 0.12, RED_LIGHT, { top: BUFF });
  }
  for (let i = 0; i + 1 < planters.length; i++) {
    const x = (planters[i] + planters[i + 1]) / 2;
    if (i % 2 === 0) {
      b.box(x - 1.1, vh, zc - 0.28, x + 1.1, vh + 0.4, zc + 0.28, GRANITE, { top: 0xd8d0c2 });
      k.person(x + 1.6, zc + 0.1, vh);
    } else lantern(k, x, zc, vh, 3.6, 0x3a3d42);
  }

  // --- poles, and a tangle of wires between them, painted light ---
  const PH = 6.8;
  const N = (x: number): V3 => [x, PH, zN + 0.35], S = (x: number): V3 => [x, PH, zS - 0.35];
  const poles = [N(-44), N(-28), N(-12), N(4), S(-47), S(-36.8), S(11)].map((p): V3 => [p[0] - CHANDNI.x0 + t.x, p[1], p[2]]);
  for (const [x, y, z] of poles) {
    b.cyl(x, z, 0, y + 0.1, 0.12, 0.09, 6, POLE, { cap: false });
    b.box(x - 0.5, y - 0.3, z - 0.06, x + 0.5, y - 0.18, z + 0.06, POLE, { faces: 'NESWTB' });
  }
  const [n0, n1, n2, n3, s0, s1, s2] = poles;
  const lift = (p: V3, dy: number, dx = 0): V3 => [p[0] + dx, p[1] + dy, p[2]];
  const spans: [V3, V3][] = [
    [lift(n0, -0.3), lift(n1, -0.3)], [lift(n0, -0.7, 0.4), lift(n1, -0.7, -0.4)], [lift(n1, -0.3), lift(n2, -0.3)], [lift(n1, -0.7, 0.4), lift(n2, -0.7, -0.4)], [lift(n2, -0.3), lift(n3, -0.3)],
    [lift(s0, -0.3), lift(s1, -0.3)], [lift(n0, -0.5), lift(s0, -0.5)], [lift(n1, -0.5, -0.4), lift(s1, -0.5)], [lift(n3, -0.5), lift(s2, -0.5)],
    // and down to the fronts of the houses
    [lift(n1, -0.3, -0.4), [n1[0] - 4, 5.2, zN]], [lift(n2, -0.3, 0.4), [n2[0] + 4.5, 5.4, zN]], [lift(n3, -0.7, -0.4), [n3[0] - 8, 4.8, zN]], [lift(s1, -0.3, -0.4), [s1[0] - 1.6, 5.4, zS]],
  ];
  for (const [a, c] of spans) sagging(b, a, c, 0.35 + Math.hypot(c[0] - a[0], c[2] - a[2]) * 0.025, 0.035, WIRE);

  // --- the rickshaw stand: a parked row along the north edge at the east end, nose to tail, two pullers resting on their seats ---
  const standX = t.x + t.w - 1.6, standZ = zN + EDGE / 2;
  for (let i = 0; i < 4; i++) {
    b.moved(standX - 1.9 - i * 3.6, 0, standZ, Math.PI, () => rickshaw(b, HOODS[(i + 1) % 3], i === 1 || i === 2 ? 'resting' : 'none'));
  }
  const standW = standX - 4 * 3.6 - 0.4;

  // --- handcarts, along the edges ---
  handcart(k, t.x + 4, zS - EDGE / 2, 0.02, [0xd9cdb4, JUTE, 0xe9e2d0, JUTE]);
  handcart(k, t.x + 32, zN + EDGE / 2, 0, [JUTE, JUTE, 0x7a8a4a, JUTE, JUTE]);
  handcart(k, t.x + 50, zS - EDGE / 2, Math.PI, [0x9a7048, 0xc98d2a, 0x9a7048]);

  // --- people along the whole of it, on both edges ---
  const busy = [...poles.map((p) => p[0]), t.x + 4, t.x + 32, t.x + 50];
  for (const [z0, z1, xEnd] of [[zN + 0.4, zN + EDGE - 0.35, standW], [zS - EDGE + 0.35, zS - 0.4, t.x + t.w - 0.8]]) {
    for (let x = t.x + 0.8; x < xEnd; x += 1.7 + r() * 1.4) {
      if (busy.some((bx) => Math.abs(bx - x) < (bx === t.x + 4 || bx === t.x + 32 || bx === t.x + 50 ? 2.4 : 0.6))) continue;
      k.person(x, z0 + r() * (z1 - z0));
    }
  }
  for (const [x, z] of [[standX - 3.7, zN + 0.5], [standX - 7.3, zN + 0.45]]) k.person(x, z);

  // light on the street at night, from the shops on either side
  for (let x = t.x + 4; x < t.x + t.w; x += 11) k.lights.push({ x, z: zc + (x % 2 ? 2 : -2), r: 9, color: '#ffd9a0', k: 0.5 });
}

// ---------------------------------------------------------------------------
// 3. Paranthe Wali Gali and the jalebi corner
// ---------------------------------------------------------------------------

/** Steel tiffin boxes, stacked in their carriers. */
function tiffins(b: GeoBuilder, x: number, z: number, y: number): void {
  b.cyl(x, z, y, y + 0.62, 0.17, 0.17, 6, STEEL, { cap: 0xe3e6ea });
  b.box(x - 0.03, y + 0.62, z - 0.12, x + 0.03, y + 0.78, z + 0.12, 0x9a9ea4, { faces: 'NESWT' });
}

function paranthe(k: Build, t: Thing): void {
  const lane = 2.8, LA = t.x + (t.w - lane) / 2, LB = LA + lane, D = LA - t.x, z0 = t.z, z1 = t.z + t.d;
  area(k, rect(LA, z0, LB, z1), 0x9c9284, 0.03);
  // the shop at the stove: a counter, an iron pan on its fire, parathas, and tiffins on the shelf behind
  const stall = (q: Build, u0: number, u1: number): void => {
    const b = q.b, uc = (u0 + u1) / 2;
    b.box(u0 + 0.25, 0, -0.95, u1 - 0.25, 0.8, -0.15, 0xd9cdb4, { top: 0xbfb6a6 });
    b.box(uc - 0.5, 0.8, -0.85, uc + 0.2, 0.95, -0.25, 0x3a3a3c);
    b.cyl(uc - 0.15, -0.55, 0.95, 1.0, 0.4, 0.42, 8, IRON, { cap: 0x3a3a3e });
    b.cyl(u1 - 0.55, -0.5, 0.8, 0.9, 0.24, 0.24, 6, 0xd9a44a);
    b.box(u0 + 0.3, 1.25, -D + 0.37, u1 - 0.3, 1.33, -D + 0.75, WOOD_DARK, { faces: 'NESWTB' });
    for (const f of [0.3, 0.7]) tiffins(b, u0 + (u1 - u0) * f, -D + 0.56, 1.33);
    q.person(uc + 0.3, -1.7);
  };
  // the west side: two storeys, its three shops looking east into the lane
  placed(k, LA, z1, TURN.E, (q) => {
    const row = shopRow(q, { L: t.d, D, n: 3, upper: 1, color: WASH[0], seed: 0.61 });
    for (const [u0, u1] of row.bays) stall(q, u0, u1);
    plate(q, 'bazaar-parathas', t.d * 0.42, STOREY + 0.75, 0, 'S', 0.62, 4.2);
    plate(q, 'bazaar-parathas', t.d, STOREY + 1.1, -D / 2, 'E', 0.62, D - 0.8);
  });
  // the east side: one storey, low so that the lane is seen over it. At the street end is the jalebi shop, open on its corner.
  placed(k, LB, z0, TURN.W, (q) => {
    const b = q.b;
    const row = shopRow(q, { L: t.d, D, n: 3, upper: 0, color: WASH[3], seed: 0.37, open: 'start' });
    const [[j0, j1], [l0, l1], [p0, p1]] = row.bays, jc = (j0 + j1) / 2;
    // the jalebi shop: a stove with the wide shallow pan of oil, coils frying in it, and a heap ready on a tray
    b.box(j0 + 0.2, 0, -2.2, j1 - 0.15, 0.75, -0.25, 0x8a7a68, { top: 0x5a5048 });
    b.cyl(jc, -1.2, 0.75, 0.9, 0.82, 0.95, 10, IRON, { cap: OIL });
    for (const [dx, dz] of [[-0.4, -0.2], [0.15, 0.35], [0.4, -0.3], [-0.1, -0.55], [-0.35, 0.4]]) b.cyl(jc + dx, -1.2 + dz, 0.9, 0.95, 0.16, 0.16, 6, JALEBI);
    b.box(j0 - 0.05, 0, -1.9, j0 + 0.65, 0.9, -0.5, WOOD, { top: JALEBI });
    b.box(j0 + 0.05, 0.9, -1.75, j0 + 0.55, 1.05, -0.65, 0xe07a14);
    q.person(jc + 0.1, -2.9);
    // the small crowd at the corner, on the street and in the mouth of the lane
    for (const [u, v] of [[-0.7, -0.8], [-1.1, -2.1], [-0.6, -3.3], [-1.3, -4.0], [0.5, 0.9], [1.6, 0.6], [1.0, 1.5]]) q.person(u, v);
    plate(q, 'bazaar-jalebi', 0, STOREY + 0.65, -D / 2, 'W', 0.6, D - 0.8);
    plate(q, 'bazaar-jalebi', jc, STOREY + 0.65, 0, 'S', 0.5, 2.4);
    // the lassi shop: a steel vat, clay cups stacked high, glasses on the counter
    const lc = (l0 + l1) / 2;
    b.box(l0 + 0.25, 0, -0.95, l1 - 0.25, 0.85, -0.15, 0xd9cdb4, { top: 0xe9e3d6 });
    b.cyl(lc - 0.4, -0.55, 0.85, 1.5, 0.32, 0.32, 8, STEEL, { cap: 0xf4f1e8 });
    for (let i = 0; i < 3; i++) b.cyl(lc + 0.2 + i * 0.25, -0.5, 0.85, 1.25 + i * 0.12, 0.09, 0.11, 5, 0xb5603a, { cap: 0x8a4a2a });
    q.person(lc, -1.7);
    plate(q, 'bazaar-lassi', lc, STOREY + 0.65, 0, 'S', 0.5, 2.4);
    stall(q, p0, p1);
    // a water tank on the roof
    b.cyl(t.d * 0.72, -D * 0.6, row.top - 0.4, row.top + 0.45, 0.5, 0.5, 8, 0x2a2a2c);
  });
  k.lights.push({ x: (LA + LB) / 2, z: z0 + t.d / 2, r: 7, color: '#ffd9a0', k: 0.6 }, { x: LB + 1, z: z0 - 0.8, r: 6, color: '#ffc880', k: 0.6 });
}

// ---------------------------------------------------------------------------
// 4. Khari Baoli, the spice market
// ---------------------------------------------------------------------------

function khariBaoli(k: Build, t: Thing): void {
  const b = k.b, x0 = t.x, x1 = t.x + t.w, z0 = t.z, z1 = t.z + t.d, D = 5, front = z0 + D;
  // the corner house, three low storeys: the tallest thing here
  b.box(x0, 0, z0, x0 + D, t.h, front, WASH[2], { win: { cell: 2.2, storey: t.h / 3, lit: 0.35, kind: 4 }, seed: 0.83, top: ROOF });
  // the pavement in front of the shops
  area(k, rect(x0 + D, front, x1, z1), 0xa89c86, 0.03);

  /** A spice merchant's shop: a white platform with heaps in brass trays, sacks against the back wall, and more sacks out on the pavement. */
  const merchant = (q: Build, u0: number, u1: number, heaps: number[], out: number[]): void => {
    const qb = q.b, w = u1 - u0;
    qb.box(u0 + 0.2, 0, -1.7, u1 - 0.2, 0.55, -0.1, 0xe9e2d0, { top: 0xf2efe6 });
    heaps.forEach((c, i) => {
      const x = u0 + (w * (i + 0.5)) / heaps.length;
      qb.cyl(x, -0.75, 0.55, 0.66, 0.42, 0.48, 6, BRASS, { cap: false });
      qb.cyl(x, -0.75, 0.6, 1.02, 0.44, 0.05, 6, c, { cap: false });
    });
    for (let i = 0; i < Math.floor(w / 0.75); i++) for (let j = 0; j < 2; j++) sack(qb, u0 + 0.5 + i * 0.75, -D + 0.75, j * 0.6, JUTE);
    q.person(u0 + w * 0.7, -1.3, 0.55);
    out.forEach((c, i) => sack(qb, u0 + 0.5 + (i % 4) * 0.78, 0.55 + Math.floor(i / 4) * 0.62, 0, c));
  };
  // the north side, its shops looking south, the last of them open to the east as well
  placed(k, x0 + D, front, TURN.S, (q) => {
    const L = x1 - x0 - D;
    const row = shopRow(q, { L, D, n: 4, upper: 1, color: WASH[1], seed: 0.27, open: 'end' });
    const goods = [[CHILLI, PAPRIKA, CHILLI], [TURMERIC, TURMERIC, CORIANDER], [ALMOND, CASHEW, RAISIN], [CUMIN, CHILLI, TURMERIC]];
    const outside = [[CHILLI, CHILLI, PAPRIKA, CHILLI, JUTE, JUTE], [TURMERIC, CORIANDER, TURMERIC, JUTE], [ALMOND, RAISIN, CASHEW, ALMOND], [CUMIN, CHILLI, TURMERIC, CORIANDER, JUTE]];
    row.bays.forEach(([u0, u1], i) => merchant(q, u0, u1, goods[i], outside[i]));
    const mid = (i: number): number => (row.bays[i][0] + row.bays[i][1]) / 2;
    plate(q, 'bazaar-spices', mid(0), STOREY + 0.85, 0, 'S', 0.7, 3.4);
    plate(q, 'bazaar-dry-fruit', mid(2), STOREY + 0.85, 0, 'S', 0.7, 3.4);
    plate(q, 'bazaar-spices', mid(3), STOREY + 0.85, 0, 'S', 0.7, 3.4);
    plate(q, 'bazaar-spices', L, STOREY + 0.85, -D / 2, 'E', 0.7, D - 0.8);
    // sacks along the open east end too
    for (let i = 0; i < 3; i++) sack(q.b, L + 0.5, -0.9 - i * 0.8, 0, [CHILLI, TURMERIC, CUMIN][i]);
  });
  // the west side, looking east: dry fruit
  placed(k, x0 + D, z1, TURN.E, (q) => {
    const row = shopRow(q, { L: z1 - front, D, n: 2, upper: 1, color: WASH[4], seed: 0.49, eave: 0.25 });
    merchant(q, row.bays[0][0], row.bays[0][1], [ALMOND, RAISIN, CASHEW], [ALMOND, CASHEW, JUTE]);
    merchant(q, row.bays[1][0], row.bays[1][1], [CHILLI, CORIANDER, TURMERIC], [JUTE, CHILLI, JUTE]);
    plate(q, 'bazaar-dry-fruit', (row.bays[0][0] + row.bays[0][1]) / 2, STOREY + 0.85, 0, 'S', 0.62, 3);
  });

  // the yard: handcarts piled with sacks, porters with loads on their heads, and buyers
  handcart(k, x0 + 11, z1 - 2.6, 0.25, [JUTE, JUTE, JUTE, JUTE, CHILLI, JUTE]);
  handcart(k, x1 - 4.5, z1 - 2.2, Math.PI - 0.45, [TURMERIC, JUTE, JUTE, JUTE]);
  for (const [dx, dz, c] of [[8.2, 4.4, JUTE], [12.5, 3.6, JUTE], [15.6, 5.2, 0xd9cdb4], [9.6, 6.6, JUTE]] as [number, number, number][]) porter(k, x0 + dx, z0 + D + dz - 5 + 5, c);
  for (const [dx, dz] of [[7.0, 7.3], [10.4, 8.4], [13.2, 7.0], [17.2, 8.0], [18.6, 7.2], [14.6, 9.6]]) k.person(x0 + dx, z0 + dz);
  // a heap of red chillies on a sheet on the pavement, as they come off the carts
  b.box(x0 + 13.4, 0.03, z1 - 1.6, x0 + 15.8, 0.06, z1 - 0.4, 0xd8d0c2);
  b.cyl(x0 + 14.6, z1 - 1.0, 0.06, 0.55, 0.85, 0.08, 7, CHILLI, { cap: false });
  k.lights.push({ x: x0 + D + 7, z: front + 3, r: 11, color: '#ffd9a0', k: 0.6 });
}

// ---------------------------------------------------------------------------
// 5. The kebab lane south of Jama Masjid
// ---------------------------------------------------------------------------

function kebabLane(k: Build, t: Thing): void {
  const SD = 2.4, n = 6, L = t.w, bay = L / n, H = 2.9, ox = t.x, oz = t.z + SD;
  const grills: { x0: number; x1: number; z: number }[] = [];
  const AWN = [0x2f7d4f, 0x8b2b2b, 0x2f5fa8, 0x2f7d4f, 0x8b2b2b, 0x6b5a2a];
  placed(k, ox, oz, TURN.S, (q) => {
    const b = q.b;
    // the stalls along the north side: a back wall, walls between, a flat roof and an awning
    b.box(0, 0, -SD, L, H, -SD + 0.2, 0xe6dccb, { faces: 'NEW' });
    b.box(0.02, 0, -SD + 0.2, L - 0.02, H - 0.02, -SD + 0.22, RECESS, { win: interior(0.8), faces: 'S' });
    for (let i = 0; i <= n; i++) {
      const u = i === 0 ? 0 : i === n ? L - 0.15 : i * bay - 0.075;
      b.box(u, 0, -SD + 0.2, u + 0.15, H, 0, 0xd8cdb8, { faces: 'NESW' });
    }
    b.box(-0.05, H, -SD - 0.05, L + 0.05, H + 0.2, 0.05, 0xd8cdb8, { faces: 'NESWTB', top: ROOF });
    for (let i = 0; i < n; i++) {
      const u0 = i * bay + 0.08, u1 = (i + 1) * bay - 0.08, uc = (u0 + u1) / 2, col = AWN[i];
      for (const [n0, c] of [[1, col], [-1, new THREE.Color(col).multiplyScalar(0.7).getHex()]] as [number, number][]) {
        b.quad([u0, H - 0.05, 0.05], [u1, H - 0.05, 0.05], [u1, H - 0.6, 1.55], [u0, H - 0.6, 1.55], [0, n0 * 0.93, n0 * 0.36], c);
      }
      if (i === n - 1) {
        // the tea stall: a stove, a big kettle and glasses
        b.box(u0 + 0.3, 0, -0.8, u1 - 0.3, 0.9, -0.15, 0x6a6a6e, { top: 0x4a4a4e });
        b.cyl(uc - 0.3, -0.48, 0.9, 1.4, 0.26, 0.2, 8, BRASS);
        for (let j = 0; j < 4; j++) b.box(uc + 0.25 + j * 0.18, 0.9, -0.4, uc + 0.36 + j * 0.18, 1.06, -0.29, 0xe9e3c8);
        plate(q, 'bazaar-tea', uc, H + 0.5, 0.05, 'S', 0.55, bay - 0.6);
      } else {
        // a charcoal grill, its skewers over the coals
        b.box(u0 + 0.25, 0, -0.8, u1 - 0.25, 0.9, -0.15, 0x3a3a3c, { top: 0x2a1a14 });
        for (let j = 0; j < 5; j++) {
          const x = u0 + 0.5 + j * ((u1 - u0 - 1.0) / 4);
          b.box(x - 0.05, 0.93, -0.78, x + 0.05, 1.0, -0.17, 0x8b4a2a);
        }
        q.glows.push({ x: uc, y: 0.92, z: -0.47, sx: u1 - u0 - 0.7, sy: 0.03, sz: 0.5, color: '#ff7a30' });
        grills.push({ x0: ox + u0 + 0.4, x1: ox + u1 - 0.4, z: oz - 0.47 });
        if (i % 2 === 0) plate(q, 'bazaar-kebabs', uc, H + 0.5, 0.05, 'S', 0.55, bay - 0.6);
      }
      q.person(uc + 0.2, -1.4);
    }
    // bulbs strung along the lane on a wire between three posts
    const wz = SD + 1.0, wy = 3.4;
    for (const u of [0.25, L / 2, L - 0.25]) b.box(u - 0.07, 0, wz - 0.07, u + 0.07, wy + 0.15, wz + 0.07, 0x8a8e94);
    for (const [a, c] of [[0.25, L / 2], [L / 2, L - 0.25]]) {
      sagging(b, [a, wy, wz], [c, wy, wz], 0.35, 0.025, WIRE);
      for (let x = a + 0.8; x < c - 0.4; x += 1.45) {
        const f = (x - a) / (c - a), y = wy - 4 * f * (1 - f) * 0.35;
        q.glows.push({ x, y: y - 0.22, z: wz, sx: 0.16, sy: 0.2, sz: 0.16, color: '#fff1c4' });
      }
    }
    // low tables along the south side, and people eating at them
    for (let i = 0; i < 4; i++) {
      const u = L * (0.14 + i * 0.24);
      b.box(u - 0.75, 0, SD + 1.6, u + 0.75, 0.75, SD + 2.25, WOOD, { top: 0xd9c9a8 });
      for (const [du, dv] of [[-0.5, 1.25], [0.55, 1.3], [0.1, 2.85]]) if ((i + du > 0) || i > 0) q.person(u + du, SD + dv);
    }
    for (let i = 0; i < n; i += 2) q.lights.push({ x: (i + 1) * bay, z: 0.8, r: 7, color: '#ffd9a0', k: 0.6 });
  });

  // smoke rising from the grills
  const smoke = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 90);
  k.group.add(smoke.mesh);
  const sr = rng(50505), from = new THREE.Vector3(), drift = new THREE.Vector3(0.15, 0.35, 0.25);
  let due = 0;
  k.each((dt) => {
    due -= dt;
    while (due <= 0) {
      due += 0.08 + sr() * 0.08;
      const g = grills[Math.floor(sr() * grills.length)];
      smoke.puff(from.set(g.x0 + sr() * (g.x1 - g.x0), 1.15, g.z + (sr() - 0.5) * 0.3), drift, 0.5, 0.8);
    }
    smoke.update(dt);
  });
}

/** What this file builds, by the id of the thing in the plan. */
export const MODELS: Record<string, Model> = {
  kites,
  'chandni-chowk': chandniChowk,
  'paranthe-gali': paranthe,
  'khari-baoli': khariBaoli,
  'kebab-lane': kebabLane,
};

/** Whatever this file builds that is not one of the plan's things. */
export function extras(_k: Build): void {}
