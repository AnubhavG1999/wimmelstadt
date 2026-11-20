// The south's monuments and markets: Humayun's Tomb, Safdarjung's Tomb, Lodhi
// Garden, Khan Market, Dilli Haat, Sarojini Nagar, the Lotus Temple and the
// Qutub Minar.
//
// Three of these are tombs in their gardens and one is a house of worship.
// They are drawn plainly and from outside: nothing drives into a garden,
// nothing floats in a channel or a pool, and nobody stands on a tomb.
//
// Every model takes its place and its size from its lot in plan.ts, and from
// the ground the plan gives it.

import { interior, rng, type BoxOpts, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { area, flat, oval, rect, walls, type P2 } from '../../engine/ground';
import { lathe, parasol, tri, twoWheeler } from '../../engine/parts';
import { inStreet } from '../../engine/roads';
import { chamfered, gable, hip, prism, slab, type XZ } from '../../engine/shapes';
import { DEVANAGARI, type SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import {
  BUFF, BUFF_SHADE, MARBLE, MARBLE_SHADE, RECESS, RED, RED_DARK, RUBBLE, RUBBLE_LIGHT,
  archThrough, chhatri, dome, steps, type Facing,
} from './mughal';
import { GROUNDS, type Thing } from './plan';

export type Model = (k: Build, t: Thing) => void;

// ---------------------------------------------------------------------------
// What the models share
// ---------------------------------------------------------------------------

/** A lot or a ground, with its middle. */
interface Lot { x0: number; z0: number; x1: number; z1: number; cx: number; cz: number }

const groundOf = (id: string): Lot => {
  const [x0, z0, x1, z1] = GROUNDS[id];
  return { x0, z0, x1, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
};

/** What the street material is told about a patch of plain paving. */
const PAVING: WinSpec = { cell: 0, storey: 1, lit: 0, kind: 1 };

// Paint on the ground lies in layers, each at a height of its own: the lawn or the paving the tile lays is at 0.02.
const PATH_Y = 0.045, EDGE_Y = 0.06, WATER_Y = 0.075, TANK_EDGE_Y = 0.09, TANK_Y = 0.105;
const PATH = 0xcbab8b, STONE = 0xe2d9c6, CHANNEL = 0x6db4cb;

const paint = (k: Build, x0: number, z0: number, x1: number, z1: number, color: number, y: number): void => area(k, rect(x0, z0, x1, z1), color, y);

const FACES: Facing[] = ['N', 'E', 'S', 'W'];
/** The way each side looks, as [x, z]. */
const OUT: Record<Facing, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

/** A box against one side of something that stands about (cx, cz): from `a0` to `a1` along that side, and from `d0` to `d1` out from the middle. */
function sideBox(b: GeoBuilder, f: Facing, cx: number, cz: number, a0: number, a1: number, d0: number, d1: number, y0: number, y1: number, color: number, o: BoxOpts = {}): void {
  if (f === 'S') b.box(cx + a0, y0, cz + d0, cx + a1, y1, cz + d1, color, o);
  else if (f === 'N') b.box(cx + a0, y0, cz - d1, cx + a1, y1, cz - d0, color, o);
  else if (f === 'E') b.box(cx + d0, y0, cz + a0, cx + d1, y1, cz + a1, color, o);
  else b.box(cx - d1, y0, cz + a0, cx - d0, y1, cz + a1, color, o);
}

/** A flat panel on that side, `d` out from the middle: a band of marble, a frame, a board. */
const panel = (b: GeoBuilder, f: Facing, cx: number, cz: number, a0: number, a1: number, d: number, y0: number, y1: number, color: number, o: BoxOpts = {}): void =>
  sideBox(b, f, cx, cz, a0, a1, d - 0.02, d, y0, y1, color, { ...o, faces: f });

interface ArchLook {
  /** How brightly it glows at night. */
  lit?: number;
  /** Two more corners to its head: for an arch that is looked at closely. */
  fine?: boolean;
  /** How far it stands proud of the wall. */
  proud?: number;
}

/** The outline of a pointed arch `w` wide and `h` high, as [across, up] from the middle of its foot. */
function archPts(w: number, h: number, fine: boolean): [number, number][] {
  const r = w / 2, rise = Math.min(h * 0.6, w * 0.66), s = h - rise;
  if (!fine) return [[-r, 0], [r, 0], [r, s], [0, h], [-r, s]];
  return [[-r, 0], [r, 0], [r, s], [r * 0.9, s + rise * 0.48], [r * 0.56, s + rise * 0.82], [0, h], [-r * 0.56, s + rise * 0.82], [-r * 0.9, s + rise * 0.48], [-r, s]];
}

/**
 * An arch on a wall that faces any way: a dark opening, a hair proud of the
 * wall. (x, z) is the middle of its foot on the wall, and (nx, nz) the way
 * the wall faces. The arches in mughal.ts keep to the four sides of a square;
 * this one is for the cut corner of a tomb, a round tower, a ring of doors.
 */
function archOn(b: GeoBuilder, x: number, y: number, z: number, nx: number, nz: number, w: number, h: number, color: number, o: ArchLook = {}): void {
  const proud = o.proud ?? 0.06, px = x + nx * proud, pz = z + nz * proud;
  const pts = archPts(w, h, o.fine === true).map(([u, v]): V3 => [px - nz * u, y + v, pz + nx * u]);
  // (an opening is dark, so it takes a good deal of light to make it glow)
  const q = o.lit ? { win: interior(o.lit * 2.4) } : {};
  for (let i = 1; i + 1 < pts.length; i++) tri(b, pts[0], pts[i], pts[i + 1], [nx, 0, nz], color, q);
}

/** An arch on one side of something that stands about (cx, cz): `a` along that side from its middle, on the plane `d` out. */
function sideArch(b: GeoBuilder, f: Facing, cx: number, cz: number, a: number, d: number, y: number, w: number, h: number, color: number, o: ArchLook = {}): void {
  const [nx, nz] = OUT[f];
  archOn(b, cx + nx * d + (nz !== 0 ? a : 0), y, cz + nz * d + (nx !== 0 ? a : 0), nx, nz, w, h, color, o);
}

/** A ring of wall that widens or narrows as it rises, its facets in two colours by turns: the corbels under a balcony, the stripes of a tower. */
function striped(b: GeoBuilder, cx: number, cz: number, y0: number, y1: number, r0: number, r1: number, sides: number, c0: number, c1: number): void {
  const slope = (r0 - r1) / Math.max(1e-6, y1 - y0), nl = Math.hypot(1, slope);
  const p = (a: number, r: number, y: number): V3 => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
  for (let i = 0; i < sides; i++) {
    // (its corners are where a `cyl` of as many sides has them)
    const a0 = ((i + 0.5) / sides) * Math.PI * 2, a1 = ((i + 1.5) / sides) * Math.PI * 2, am = (a0 + a1) / 2;
    b.quad(p(a0, r0, y0), p(a1, r0, y0), p(a1, r1, y1), p(a0, r1, y1), [Math.cos(am) / nl, slope / nl, Math.sin(am) / nl], i % 2 ? c1 : c0);
  }
}

/**
 * A small kiosk for a roof or the head of a tower: arches under an eave, and
 * a little dome. It is a chhatri in a third of the triangles, for where a
 * dozen stand on one building.
 */
function kiosk(b: GeoBuilder, x: number, y: number, z: number, half: number, post: number, stone: number, cap: number, sides: 4 | 8 = 4): void {
  const r = half / Math.cos(Math.PI / sides), top = y + post + 0.13;
  b.cyl(x, z, y, y + post, r, r, sides, stone, { cap: false });
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    archOn(b, x + Math.cos(a) * half, y + 0.04, z + Math.sin(a) * half, Math.cos(a), Math.sin(a), 2 * half * Math.tan(Math.PI / sides) * 0.64, post * 0.86, RECESS, { proud: 0.03 });
  }
  b.cyl(x, z, y + post, top, r + 0.2, r + 0.2, sides, stone);
  lathe(b, x, z, [[half * 0.92, top], [half * 0.74, top + half * 0.62], [0.03, top + half * 1.08]], 6, cap);
}

/** The wall round a garden, with a way left open in the middle of one side, `half` to either hand. */
function gardenWall(b: GeoBuilder, g: Lot, h: number, color: number, top: number, open: { side: Facing; half: number }): void {
  const a = 0.15, c = 0.65;
  const run = (f: Facing, x0: number, z0: number, x1: number, z1: number): void => {
    if (f !== open.side) { b.box(x0, 0, z0, x1, h, z1, color, { top }); return; }
    if (f === 'N' || f === 'S') {
      b.box(x0, 0, z0, g.cx - open.half, h, z1, color, { top });
      b.box(g.cx + open.half, 0, z0, x1, h, z1, color, { top });
    } else {
      b.box(x0, 0, z0, x1, h, g.cz - open.half, color, { top });
      b.box(x0, 0, g.cz + open.half, x1, h, z1, color, { top });
    }
  };
  run('N', g.x0 + a, g.z0 + a, g.x1 - a, g.z0 + c);
  run('S', g.x0 + a, g.z1 - c, g.x1 - a, g.z1 - a);
  run('W', g.x0 + a, g.z0 + c, g.x0 + c, g.z1 - c);
  run('E', g.x1 - c, g.z0 + c, g.x1 - a, g.z1 - c);
}

/**
 * A walk with a narrow channel of water down its middle, as the gardens of the
 * Mughal tombs have: paving, a stone edge a hair above it and the water a
 * hair above that, and a square tank half-way along. It runs from (x0, z0) to
 * (x1, z1), east and west or north and south, and is `wide` across.
 */
function channelWalk(k: Build, x0: number, z0: number, x1: number, z1: number, wide: number): void {
  const along = Math.abs(x1 - x0) > Math.abs(z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
  const strip = (half: number, color: number, y: number): void =>
    along ? paint(k, Math.min(x0, x1), mz - half, Math.max(x0, x1), mz + half, color, y) : paint(k, mx - half, Math.min(z0, z1), mx + half, Math.max(z0, z1), color, y);
  strip(wide / 2, PATH, PATH_Y);
  strip(wide * 0.3, STONE, EDGE_Y);
  strip(wide * 0.17, CHANNEL, WATER_Y);
  const t = Math.min(wide * 0.5, Math.hypot(x1 - x0, z1 - z0) * 0.32);
  paint(k, mx - t, mz - t, mx + t, mz + t, STONE, TANK_EDGE_Y);
  paint(k, mx - t * 0.72, mz - t * 0.72, mx + t * 0.72, mz + t * 0.72, CHANNEL, TANK_Y);
}

/** Whether a figure or a tree may stand here: not in a street, and not on its sidewalk. */
const offStreet = (k: Build, x: number, z: number): boolean => !inStreet(k, x - 0.65, z - 0.65, x + 0.65, z + 0.65);

// ---------------------------------------------------------------------------
// Humayun's Tomb
// ---------------------------------------------------------------------------

/**
 * Humayun's Tomb in its charbagh: red sandstone banded with white marble, on a
 * broad low plinth with arches all round it, with a great portal in the middle
 * of each side, cut-off corners, and a white marble dome on a high drum. The
 * garden is cut into plots by walks, and the four on its axes carry channels
 * of water. Its gatehouse is in the west wall, as the one in use is.
 */
function humayunsTomb(k: Build, t: Thing): void {
  const b = k.b, g = groundOf('humayuns-tomb'), cx = t.x + t.w / 2, cz = t.z + t.d / 2, half = t.w / 2, H = t.h;
  const P = H * 0.135, W = H * 0.45, PT = H * 0.54; // the top of the plinth, of the walls and of the four portals
  const ph = half * 1.5, cut = half * 0.35, TERRACE = 0xcfa58c, ROOF = 0xcdbb9f;

  // --- the plinth: an arcade all round it, the middle arch of each side a stair, and a coping of marble ---
  b.box(cx - ph, 0, cz - ph, cx + ph, P - 0.2, cz + ph, RED, { faces: 'NESW' });
  b.box(cx - ph - 0.1, P - 0.2, cz - ph - 0.1, cx + ph + 0.1, P, cz + ph + 0.1, MARBLE, { top: TERRACE });
  for (const f of FACES) {
    const n = 9, bay = (2 * ph - 0.6) / n;
    for (let i = 0; i < n; i++) {
      const mid = i === (n - 1) / 2;
      sideArch(b, f, cx, cz, -ph + 0.3 + (i + 0.5) * bay, ph, 0.18, bay * (mid ? 0.86 : 0.66), (P - 0.2) * (mid ? 0.9 : 0.76), RECESS, { lit: mid ? 0.9 : 0.45 });
    }
  }

  // --- the body: a square with its corners cut off, banded with marble ---
  const plan = (grow: number): XZ[] => chamfered(cx, cz, half + grow, cut + grow * 0.586);
  const mid = P + (W - P) * 0.5;
  prism(b, plan(0), P, W, RED, { top: false });
  prism(b, plan(0.06), mid, mid + 0.2, MARBLE, { top: false });
  prism(b, plan(0.12), W - 0.3, W + 0.18, MARBLE, { top: ROOF });
  const roof = W + 0.18;

  for (const f of FACES) {
    // the portal: a tall block that stands proud of the wall and above it, framed in marble, with a deep pointed arch
    const pw = half * 0.35, deep = half + 0.32, foot = P + 0.02, [nx, nz] = OUT[f];
    sideBox(b, f, cx, cz, -pw, pw, half - 1.3, deep, P, PT, RED);
    panel(b, f, cx, cz, -pw + 0.1, pw - 0.1, deep + 0.05, foot, PT - 0.12, MARBLE);
    panel(b, f, cx, cz, -pw + 0.28, pw - 0.28, deep + 0.1, foot, PT - 0.3, RED);
    sideArch(b, f, cx, cz, 0, deep + 0.1, foot, pw * 1.28, (PT - P) * 0.8, RECESS, { lit: 0.9, fine: true, proud: 0.05 });
    // the wall at the back of the arch, and the door in it
    sideArch(b, f, cx, cz, 0, deep + 0.1, foot, pw * 0.72, (PT - P) * 0.44, BUFF_SHADE, { proud: 0.1 });
    sideArch(b, f, cx, cz, 0, deep + 0.1, foot, pw * 0.36, (PT - P) * 0.24, RECESS, { lit: 1.3, proud: 0.15 });
    // the wings: two storeys of small arches either side of it
    for (const s of [-1, 1]) {
      const a = s * (pw + (half - cut - pw) / 2);
      sideArch(b, f, cx, cz, a, half, P + 0.3, 0.74, (W - P) * 0.37, RECESS, { lit: 0.45 });
      sideArch(b, f, cx, cz, a, half, mid + 0.34, 0.74, (W - P) * 0.33, RECESS, { lit: 0.45 });
      // and a small kiosk on each end of the portal's head
      kiosk(b, cx + nx * (half - 0.5) + (nz !== 0 ? s * (pw - 0.42) : 0), PT, cz + nz * (half - 0.5) + (nx !== 0 ? s * (pw - 0.42) : 0), 0.34, 0.52, RED, 0x4f8fb0);
    }
  }
  // the cut corners: two storeys of arches, and a chhatri over each
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const c = half - cut / 2, n = Math.SQRT1_2, cc = c - 0.86;
    archOn(b, cx + sx * c, P + 0.3, cz + sz * c, sx * n, sz * n, cut * 0.78, (W - P) * 0.37, RECESS, { lit: 0.45 });
    archOn(b, cx + sx * c, mid + 0.34, cz + sz * c, sx * n, sz * n, cut * 0.78, (W - P) * 0.33, RECESS, { lit: 0.45 });
    chhatri(b, cx + sx * cc, roof, cz + sz * cc, 0.75, 1.0, BUFF, MARBLE, { kind: 'round' });
  }

  // --- the dome: white marble, on a high drum, with its finial of brass ---
  const R = t.w * 0.32, fin = H * 0.11, D = H - fin - 1.58 * R;
  b.cyl(cx, cz, roof, roof + 0.42, R * 1.2, R * 1.2, 16, BUFF, { cap: ROOF });
  b.cyl(cx, cz, roof + 0.42, D, R * 0.86, R * 0.86, 16, MARBLE_SHADE, { cap: false });
  b.cyl(cx, cz, D - 0.55, D - 0.33, R * 0.86 + 0.04, R * 0.86 + 0.04, 16, RED, { cap: false });
  dome(b, cx, D, cz, R, MARBLE, { sides: 16, finial: fin });

  // --- the garden's wall, and the gatehouse in its west side ---
  const gx0 = g.x0 + 0.2, gx1 = g.x0 + 2.4, gh = 2.0, GH = H * 0.3, way = 1.5;
  gardenWall(b, g, 1.5, RUBBLE_LIGHT, RUBBLE, { side: 'W', half: gh });
  for (const [a, c] of [[cz - gh, cz - way / 2], [cz + way / 2, cz + gh]]) b.box(gx0, 0, a, gx1, GH, c, RED);
  archThrough(b, 'x', (gx0 + gx1) / 2, cz, gx1 - gx0, way, 0, GH * 0.66, GH, RED, RECESS);
  b.box(gx0 - 0.06, GH * 0.74, cz - gh - 0.06, gx1 + 0.06, GH * 0.74 + 0.18, cz + gh + 0.06, MARBLE, { faces: 'NESW' });
  b.box(gx0 - 0.12, GH, cz - gh - 0.12, gx1 + 0.12, GH + 0.3, cz + gh + 0.12, MARBLE, { top: ROOF });
  for (const s of [-1, 1]) {
    const a = cz + s * (way / 2 + gh) / 2;
    for (const [x, nx] of [[gx1, 1], [gx0, -1]]) {
      archOn(b, x, 0.3, a, nx, 0, 0.7, GH * 0.34, RECESS, { lit: 0.5 });
      archOn(b, x, GH * 0.42, a, nx, 0, 0.7, GH * 0.26, RECESS, { lit: 0.5 });
    }
    kiosk(b, (gx0 + gx1) / 2, GH + 0.3, cz + s * (gh - 0.6), 0.42, 0.6, RED, MARBLE);
    k.glows.push({ x: gx1 + 0.12, y: 2.4, z: cz + s * (way / 2 + 0.25), sx: 0.2, sy: 0.3, sz: 0.2, color: '#ffe2ae' });
  }

  // --- the charbagh: walks along the plinth's four sides from wall to wall, and a walk with its channel on each axis ---
  const wx0 = g.x0 + 0.65, wx1 = g.x1 - 0.65, wz0 = g.z0 + 0.65, wz1 = g.z1 - 0.65, ap = 0.9;
  const px0 = cx - ph - 0.1, px1 = cx + ph + 0.1, pz0 = cz - ph - 0.1, pz1 = cz + ph + 0.1;
  paint(k, wx0, pz0 - ap, wx1, pz0, PATH, PATH_Y);
  paint(k, wx0, pz1, wx1, pz1 + ap, PATH, PATH_Y);
  for (const [a, c] of [[wz0, pz0 - ap], [pz0, pz1], [pz1 + ap, wz1]]) {
    paint(k, px0 - ap, a, px0, c, PATH, PATH_Y);
    paint(k, px1, a, px1 + ap, c, PATH, PATH_Y);
  }
  paint(k, gx0, cz - way / 2, gx1, cz + way / 2, PATH, PATH_Y);
  channelWalk(k, gx1, cz, px0 - ap, cz, 1.6);
  channelWalk(k, px1 + ap, cz, wx1, cz, 1.6);
  channelWalk(k, cx, wz0, cx, pz0 - ap, 1.6);
  channelWalk(k, cx, pz1 + ap, cx, wz1, 1.6);

  // trees in the plots: the largest in the corners at the back, small ones in front, and cypresses beside the walks
  const ex = (px1 + ap + wx1) / 2, wx = (wx0 + px0 - ap) / 2, nz = (wz0 + pz0 - ap) / 2, sz = (pz1 + ap + wz1) / 2;
  for (const [x, z, s] of [[wx, nz, 0.72], [ex, nz, 0.62], [wx, sz + 0.6, 0.5], [ex + 0.3, sz + 0.8, 0.4], [cx - 3.5, nz, 0.56], [cx + 3.5, nz, 0.56], [cx - 4, sz + 1.2, 0.34], [cx + 4, sz + 1.2, 0.34], [ex + 0.4, cz - 3.9, 0.4], [ex + 0.6, cz + 4, 0.34], [wx, cz - 4.2, 0.5], [wx, cz + 4.4, 0.44]]) k.tree(x, z, s);
  for (const s of [-1, 1]) {
    k.tree(cx + s * 1.5, nz, 0.55, true);
    k.tree(cx + s * 1.5, sz + 1.3, 0.4, true);
    k.tree(ex + 0.5, cz + s * 1.5, 0.4, true);
  }
  // a few visitors, on the walks round the plinth and on the lawn: none on a channel
  for (const [x, z] of [[cx + 2.6, pz1 + 0.45], [px1 + 0.45, cz + 3.2], [cx + 1.35, sz - 1.2], [px0 - 0.45, cz - 2.6], [cx - 4.2, pz1 + 0.4]]) k.person(x, z);

  k.lights.push({ x: cx + 3, z: pz1 + 1.5, r: 18, color: '#ffe2ae', k: 0.8 }, { x: cx, z: cz, r: 12, color: '#fff0d6', k: 0.7 }, { x: px1 + 2.5, z: cz - 2, r: 14, color: '#ffe2ae', k: 0.6 }, { x: gx1 + 2, z: cz, r: 10, color: '#ffd9a0', k: 0.6 });
}

// ---------------------------------------------------------------------------
// The Qutub Minar
// ---------------------------------------------------------------------------

/**
 * One storey of a fluted shaft. Its outline is the `pattern` once for every
 * flute: each corner of the pattern is how far round its flute it lies, and
 * how far out, where 1 is the tip of a flute.
 */
function fluted(b: GeoBuilder, cx: number, cz: number, y0: number, y1: number, r0: number, r1: number, pattern: [number, number][], flutes: number, color: number): void {
  const ring: [number, number][] = [];
  for (let i = 0; i < flutes; i++) for (const [u, f] of pattern) ring.push([((i + u) / flutes) * Math.PI * 2, f]);
  const p = (a: number, r: number, y: number): V3 => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
  ring.forEach(([a0, f0], i) => {
    const [a1, f1] = ring[(i + 1) % ring.length];
    const A = p(a0, r0 * f0, y0), B = p(a1, r0 * f1, y0), C = p(a1, r1 * f1, y1), D = p(a0, r1 * f0, y1);
    // each facet faces away from the middle, square to its own foot
    let nx = B[2] - A[2], nz = A[0] - B[0];
    if (nx * ((A[0] + B[0]) / 2 - cx) + nz * ((A[2] + B[2]) / 2 - cz) < 0) { nx = -nx; nz = -nz; }
    const l = Math.hypot(nx, nz) || 1;
    b.quad(A, B, C, D, [nx / l, 0, nz / l], color);
  });
}

// The three ways the Minar's storeys are fluted: angular and round by turns, all round, and all angular.
const VALLEY = 0.86;
const BY_TURNS: [number, number][] = [[0, VALLEY], [0.25, 1], [0.5, VALLEY], [0.62, 0.97], [0.88, 0.97]];
const ROUND: [number, number][] = [[0, VALLEY], [0.24, 0.98], [0.76, 0.98]];
const ANGULAR: [number, number][] = [[0, VALLEY], [0.5, 1]];

/**
 * The Qutub Minar: five storeys that taper strongly, each ending in a balcony
 * carried on corbels. The lower three are of red and buff sandstone and
 * fluted, with bands of carving round them, and the upper two are partly of
 * white marble. Beside it stand the Alai Darwaza, the Iron Pillar and a few
 * low lengths of old wall. The mosque at its foot is not built.
 */
function qutubMinar(k: Build, t: Thing): void {
  const b = k.b, g = groundOf('qutub-minar'), cx = t.x + t.w / 2, cz = t.z + t.d / 2, H = t.h;
  const R0 = t.w * 0.4, RT = R0 * 0.2, FOOT = 0.4;
  const rad = (y: number): number => R0 + (RT - R0) * (y / H);

  b.cyl(cx, cz, 0, FOOT, Math.min(t.w / 2, R0 + 0.65), Math.min(t.w / 2, R0 + 0.65), 16, BUFF_SHADE, { cap: 0xd8cfbb });

  // --- the tower ---
  const floors = [0.4, 0.61, 0.775, 0.885, 0.972].map((f) => f * H), sides = [20, 16, 12, 10, 8];
  const bands = [[0.2, 0.47, 0.74], [0.5], [0.5], [0.3, 0.68], []], door = 0.83;
  let y0 = FOOT;
  floors.forEach((y1, i) => {
    const ch = Math.min(0.9, 0.3 + (y1 - y0) * 0.1), ys = y1 - ch, ra = rad(y0), rb = rad(ys), n = sides[i], bh = i === 0 ? 0.5 : 0.36;
    if (i === 0) fluted(b, cx, cz, y0, ys, ra, rb, BY_TURNS, 12, RED);
    else if (i === 1) fluted(b, cx, cz, y0, ys, ra, rb, ROUND, 12, RED);
    else if (i === 2) fluted(b, cx, cz, y0, ys, ra, rb, ANGULAR, 12, RED);
    else if (i === 3) b.cyl(cx, cz, y0, ys, ra, rb, 16, MARBLE, { cap: false });
    else {
      const ym = y0 + (ys - y0) * 0.45;
      b.cyl(cx, cz, y0, ym, ra, rad(ym), 12, RED, { cap: false });
      b.cyl(cx, cz, ym, ys, rad(ym), rb, 12, MARBLE, { cap: false });
    }
    // bands of carving round it: buff on the red stone, red on the marble
    for (const f of bands[i]) {
      const y = y0 + (ys - y0) * f;
      if (i < 3) b.cyl(cx, cz, y, y + bh, rad(y) + 0.03, rad(y + bh) + 0.03, n, BUFF, { cap: BUFF });
      else b.cyl(cx, cz, y, y + bh * 0.8, rad(y) + 0.03, rad(y + bh * 0.8) + 0.03, 16, RED, { cap: false });
    }
    // the balcony: two rows of corbels, and its floor with a rail of stone round it
    const out = R0 * [0.19, 0.16, 0.14, 0.125, 0.11][i], yc = ys + ch * 0.55;
    striped(b, cx, cz, ys, yc, rb, rb + out * 0.5, n, RED_DARK, BUFF_SHADE);
    striped(b, cx, cz, yc, y1, rb + out * 0.5, rb + out, n, BUFF, RED);
    b.cyl(cx, cz, y1, y1 + 0.42, rb + out + 0.04, rb + out + 0.04, n, i < 3 ? BUFF_SHADE : MARBLE_SHADE, { cap: RED_DARK });
    y0 = y1 + 0.42;
    // the door onto the balcony, towards the view
    const rd = rad(y0) + 0.03;
    if (i < 4) archOn(b, cx + Math.cos(door) * rd, y0, cz + Math.sin(door) * rd, Math.cos(door), Math.sin(door), rd * 0.36, Math.min(0.8, (floors[i + 1] - y0) * 0.3), RECESS, { lit: 1.2, proud: 0.02 });
  });
  b.cyl(cx, cz, y0, H, rad(y0) * 0.82, rad(y0) * 0.7, 8, RED, { cap: RED_DARK });
  // its door, at the foot, on the north side
  archOn(b, cx, FOOT, cz - R0, 0, -1, R0 * 0.34, 1.9, RECESS, { lit: 1, fine: true, proud: 0.05 });

  // --- the Alai Darwaza: a square gateway of red stone banded with white marble, under a low dome.
  // It stands on the walk from the road, east of the tower, where the view sees both side by side. ---
  const aw = 2.4, ax = g.x1 - aw - 1.1, az = cz, AH = H * 0.16, base = 0.3;
  b.box(ax - aw - 0.35, 0, az - aw - 0.35, ax + aw + 0.35, base, az + aw + 0.35, BUFF_SHADE);
  b.box(ax - aw, base, az - aw, ax + aw, AH, az + aw, RED, { top: 0xbfb09a });
  b.box(ax - aw - 0.06, AH - 0.34, az - aw - 0.06, ax + aw + 0.06, AH + 0.14, az + aw + 0.06, MARBLE, { top: 0xbfb09a });
  b.box(ax - aw - 0.05, base + (AH - base) * 0.5, az - aw - 0.05, ax + aw + 0.05, base + (AH - base) * 0.5 + 0.16, az + aw + 0.05, MARBLE, { faces: 'NESW' });
  for (const f of FACES) {
    const top = AH - 0.5, d = aw + 0.05;
    panel(b, f, ax, az, -aw * 0.5, aw * 0.5, d + 0.03, base, top, MARBLE);
    panel(b, f, ax, az, -aw * 0.5 + 0.2, aw * 0.5 - 0.2, d + 0.08, base, top - 0.2, RED);
    sideArch(b, f, ax, az, 0, d + 0.08, base, aw * 0.56, (top - base) * 0.86, RECESS, { lit: 0.9, fine: true, proud: 0.05 });
    for (const s of [-1, 1]) {
      const a = s * aw * 0.76;
      // a window of pierced stone below, and a panel of marble above
      panel(b, f, ax, az, a - 0.36, a + 0.36, d + 0.03, base + 0.5, base + (AH - base) * 0.44, MARBLE);
      sideArch(b, f, ax, az, a, d + 0.03, base + 0.62, 0.44, (AH - base) * 0.3, RECESS, { proud: 0.05 });
      panel(b, f, ax, az, a - 0.36, a + 0.36, d + 0.03, base + (AH - base) * 0.6, top - 0.1, MARBLE);
      panel(b, f, ax, az, a - 0.22, a + 0.22, d + 0.08, base + (AH - base) * 0.6 + 0.14, top - 0.24, RED);
    }
  }
  b.cyl(ax, az, AH + 0.14, AH + 0.6, aw * 0.9, aw * 0.86, 8, RED_DARK, { cap: 0xbfb09a });
  dome(b, ax, AH + 0.6, az, aw * 0.8, 0xd6cfc0, { kind: 'low', sides: 10, finial: 0.5 });

  // --- the Iron Pillar, on its low platform ---
  const ix = cx + t.w * 0.85, iz = g.z0 + 3.4, IRON = 0x77726a;
  b.box(ix - 0.8, 0, iz - 0.8, ix + 0.8, 0.25, iz + 0.8, BUFF_SHADE);
  b.cyl(ix, iz, 0.25, 2.7, 0.15, 0.11, 6, IRON, { cap: false });
  lathe(b, ix, iz, [[0.11, 2.7], [0.21, 2.86], [0.13, 3.0], [0.2, 3.08]], 6, IRON);
  b.cyl(ix, iz, 3.08, 3.14, 0.2, 0.2, 6, IRON);

  // --- a few low lengths of old wall, of rough grey stone ---
  const old = (x0: number, z0: number, x1: number, z1: number, h: number): void => {
    b.box(x0, 0, z0, x1, h, z1, RUBBLE, { top: RUBBLE_LIGHT });
    // one end of it has fallen
    if (x1 - x0 > z1 - z0) b.box(x1, 0, z0 + 0.05, x1 + 1.1, h * 0.5, z1 - 0.05, RUBBLE, { top: RUBBLE_LIGHT });
    else b.box(x0 + 0.05, 0, z1, x1 - 0.05, h * 0.5, z1 + 1.1, RUBBLE, { top: RUBBLE_LIGHT });
  };
  old(g.x0 + 2.5, g.z0 + 1.2, g.x0 + 9.5, g.z0 + 1.9, 1.5);
  old(g.x0 + 1.4, cz - 2.5, g.x0 + 2.1, cz + 3.2, 1.2);
  old(ix + 2.6, iz - 1.8, ix + 3.3, iz + 0.8, 1.3);
  old(g.x0 + 5, g.z1 - 2.2, g.x0 + 11, g.z1 - 1.5, 1.0);
  old(cx + 6.5, g.z1 - 3.4, cx + 11.5, g.z1 - 2.7, 1.1);

  // --- walks: from the road's turning circle through the gateway to the tower's foot, round it, and to the pillar ---
  const WALK = 0xd2bd9e;
  area(k, oval(cx, cz, R0 + 2.1, R0 + 2.1, 20), WALK, PATH_Y);
  paint(k, cx + R0 + 1.6, cz - 0.9, g.x1, cz + 0.9, WALK, EDGE_Y);
  paint(k, ix - 0.6, iz + 0.8, ix + 0.6, cz - 0.9, WALK, PATH_Y);

  for (const [x, z, s] of [[g.x0 + 2.6, g.z0 + 4, 0.8], [g.x0 + 6.5, g.z0 + 4.6, 0.62], [g.x0 + 4.4, cz + 1, 0.7], [g.x0 + 3, g.z1 - 4.2, 0.66], [g.x0 + 9, cz + 5, 0.52], [cx - 5.5, g.z0 + 2.2, 0.6], [g.x1 - 2, g.z0 + 2.4, 0.56], [g.x1 - 2.2, g.z1 - 2.2, 0.44], [cx + 3.4, g.z1 - 1.5, 0.4]]) k.tree(x, z, s);
  for (const [x, z] of [[cx + R0 + 3.2, cz + 0.3], [cx + R0 + 4.6, cz - 0.4], [ax + 0.4, cz + aw + 1.6], [ix + 0.2, iz + 1.9], [cx - 0.6, cz + R0 + 1.5], [cx + 2.3, cz + R0 + 1.2]]) if (offStreet(k, x, z)) k.person(x, z);

  k.lights.push({ x: cx + 3.5, z: cz + 4.5, r: 16, color: '#ffc38a', k: 0.8 }, { x: cx, z: cz, r: 8, color: '#ffd2a0', k: 0.8 }, { x: ax, z: az + aw + 2, r: 10, color: '#ffd9a0', k: 0.65 });
  for (const a of [0.2, 2.2, 4.3]) k.glows.push({ x: cx + Math.cos(a) * (R0 + 1.1), y: 0.3, z: cz + Math.sin(a) * (R0 + 1.1), sx: 0.36, sy: 0.24, sz: 0.36, color: '#ffd9a0' });
}

// ---------------------------------------------------------------------------
// The Lotus Temple
// ---------------------------------------------------------------------------

/**
 * A shell with thickness: a skin over rows of points, three to a row (one
 * edge, the ridge, the other edge), which may come to a point at its last
 * row. Its outer face looks the way `out` says near any point, its inner face
 * lies `thick` behind that, and its edges are closed. `innerFrom` and
 * `edgesFrom` leave out, below that row, what no one can see.
 */
function shell(b: GeoBuilder, rows: V3[][], thick: number, out: (p: V3) => V3, outer: number, inner: number, o: { win?: WinSpec; innerFrom?: number; edgesFrom?: number; foot?: boolean } = {}): void {
  const same = (p: V3, q: V3): boolean => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 1e-6;
  const sub = (p: V3, q: V3): V3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
  const cross = (u: V3, v: V3): V3 => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const dot = (u: V3, v: V3): number => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const unit = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const flip = (v: V3): V3 => [-v[0], -v[1], -v[2]];
  const cols = rows[0].length;

  // the triangles of the skin, each with the way it faces
  const tris: { at: [number, number][]; n: V3 }[] = [];
  for (let i = 0; i + 1 < rows.length; i++) {
    for (let j = 0; j + 1 < cols; j++) {
      const pair: [number, number][][] = [[[i, j], [i, j + 1], [i + 1, j + 1]], [[i, j], [i + 1, j + 1], [i + 1, j]]];
      for (const at of pair) {
        const [p0, p1, p2] = at.map(([r, c]) => rows[r][c]);
        if (same(p0, p1) || same(p1, p2) || same(p0, p2)) continue;
        const n = unit(cross(sub(p1, p0), sub(p2, p0)));
        const middle: V3 = [(p0[0] + p1[0] + p2[0]) / 3, (p0[1] + p1[1] + p2[1]) / 3, (p0[2] + p1[2] + p2[2]) / 3];
        tris.push({ at, n: dot(n, out(middle)) < 0 ? flip(n) : n });
      }
    }
  }
  // the inner face is the outer one moved back, each point along the mean of the triangles that meet at it
  const back = rows.map((row) => row.map((p): V3 => {
    const sum: V3 = [0, 0, 0];
    for (const t of tris) {
      if (!t.at.some(([r, c]) => same(rows[r][c], p))) continue;
      sum[0] += t.n[0]; sum[1] += t.n[1]; sum[2] += t.n[2];
    }
    const n = unit(sum);
    return [p[0] - n[0] * thick, p[1] - n[1] * thick, p[2] - n[2] * thick];
  }));
  const q = { win: o.win };
  for (const t of tris) {
    const [a, c, d] = t.at;
    tri(b, rows[a[0]][a[1]], rows[c[0]][c[1]], rows[d[0]][d[1]], t.n, outer, q);
    if (a[0] >= (o.innerFrom ?? 0)) tri(b, back[a[0]][a[1]], back[c[0]][c[1]], back[d[0]][d[1]], flip(t.n), inner, q);
  }
  // its edges, which show how thick it is
  const edge = (p0: V3, p1: V3, q1: V3, q0: V3, away: V3): void => {
    if (same(p0, p1)) return;
    const n = unit(cross(sub(p1, p0), sub(q0, p0)));
    b.quad(p0, p1, q1, q0, dot(n, away) < 0 ? flip(n) : n, outer, q);
  };
  const m = Math.floor(cols / 2);
  for (let i = o.edgesFrom ?? 0; i + 1 < rows.length; i++) {
    for (const j of [0, cols - 1]) edge(rows[i][j], rows[i + 1][j], back[i + 1][j], back[i][j], sub(rows[i][j], rows[i][m]));
  }
  if (o.foot) {
    // the edge along its foot faces away from the middle of the whole shell
    const all = rows.flat(), mid: V3 = [0, 0, 0];
    for (const p of all) { mid[0] += p[0] / all.length; mid[1] += p[1] / all.length; mid[2] += p[2] / all.length; }
    for (let j = 0; j + 1 < cols; j++) {
      const p0 = rows[0][j], p1 = rows[0][j + 1];
      edge(p0, p1, back[0][j + 1], back[0][j], [(p0[0] + p1[0]) / 2 - mid[0], (p0[1] + p1[1]) / 2 - mid[1], (p0[2] + p1[2]) / 2 - mid[2]]);
    }
  }
}

/**
 * The Lotus Temple: twenty-seven petals of white marble in three rings of
 * nine, which rise in threes on its nine sides. The inner leaves close over
 * the hall like a bud, an outer leaf leans in against each of them, and an
 * entrance leaf opens outwards in front of that, a hood over the doorway. It
 * stands on a round podium with nine flights of steps, among nine pools. A
 * house of worship and a place of silence: a few people walk here, and
 * nothing is in the pools.
 */
function lotusTemple(k: Build, t: Thing): void {
  const b = k.b, g = groundOf('lotus-temple'), cx = t.x + t.w / 2, cz = t.z + t.d / 2, H = t.h;
  const R = Math.min(t.w, t.d) / 2, u = R / 8.5, POD = H * 0.085, rise = H - POD;
  const step = (Math.PI * 2) / 9, deg = Math.PI / 180, south = Math.PI / 2;
  const at = (a: number, r: number, y: number): V3 => [cx + Math.cos(a) * r * u, y, cz + Math.sin(a) * r * u];
  const SHELL = 0xf8f5ee, WITHIN = 0xe4dfd3, GLASS = 0x2b3944, SANDSTONE = 0xc98b6d, RIM = 0xe8e0cf, POOL = 0x56a9dc;
  const glow = interior(0.34), away = (p: V3): V3 => [p[0] - cx, 0.25, p[2] - cz];

  // --- the ground: a round precinct paved in red sandstone, and the podium with its nine flights of steps ---
  const RP = R + 0.9 * u, reach = Math.min(g.x1 - g.x0, g.z1 - g.z0) / 2 - 0.4;
  flat(k.street, oval(cx, cz, reach, reach, 36), 0.04, SANDSTONE, { win: PAVING });
  b.cyl(cx, cz, 0, POD, RP, RP, 18, 0xb97a5e, { cap: SANDSTONE });
  b.cyl(cx, cz, POD - 0.2, POD + 0.05, RP + 0.07, RP + 0.07, 18, MARBLE, { cap: false });

  for (let i = 0; i < 9; i++) {
    const a = south - i * step, c = a + step / 2;

    // The petals rise in threes, one behind another, on each of the nine sides.
    const leaf = (s: number[], r: number[], spread: number[], edge: number[], top: number): V3[][] =>
      s.map((f, n): V3[] => {
        const y = POD + top * f;
        return [at(a - spread[n] * deg, r[n] * edge[n], y), at(a, r[n], y), at(a + spread[n] * deg, r[n] * edge[n], y)];
      });
    // the inner leaf: joined to its neighbours in a valley as far as half-way up, and free above that
    shell(b, leaf([0, 0.22, 0.45, 0.66, 0.85, 1], [4.9, 5.35, 5.2, 4.35, 2.95, 1.1], [20, 20, 20, 17, 10, 0], [0.92, 0.92, 0.92, 0.94, 0.96, 1], rise), 0.24, away, SHELL, WITHIN, { win: glow, innerFrom: 2, edgesFrom: 2 });
    // the outer leaf, which leans in against it. It stands on two feet, and the arch between them is the doorway.
    const outer = leaf([0, 0.25, 0.5, 0.72, 0.9, 1], [6.55, 6.85, 6.6, 5.95, 5.25, 4.9], [19.5, 19, 16.5, 12, 6, 0], [0.95, 0.95, 0.95, 0.96, 0.98, 1], rise * 0.656);
    const head = outer[1][1];
    outer[0][1] = head;
    shell(b, outer, 0.22, away, SHELL, WITHIN, { win: glow, foot: true });
    // the entrance leaf: a hood that springs from the head of that arch and opens outwards, its ridge rising to its tip
    shell(b, [
      [at(a - 17.5 * deg, 7.25, POD), [head[0] + Math.cos(a) * 0.06, head[1], head[2] + Math.sin(a) * 0.06], at(a + 17.5 * deg, 7.25, POD)],
      [at(a - 10.5 * deg, 8.2, POD + rise * 0.153), at(a, 7.65, POD + rise * 0.2), at(a + 10.5 * deg, 8.2, POD + rise * 0.153)],
      [at(a, 8.5, POD + rise * 0.227), at(a, 8.5, POD + rise * 0.227), at(a, 8.5, POD + rise * 0.227)],
    ], 0.18, () => [0, 1, 0], SHELL, WITHIN, { win: glow, foot: true });
    // the doorway itself, dark by day and lit by night, a little way in
    tri(b, at(a - 17 * deg, 5.95, POD + 0.02), at(a + 17 * deg, 5.95, POD + 0.02), at(a, 6.5, head[1] - 0.05), [Math.cos(a), 0.2, Math.sin(a)], RECESS, { win: interior(3.2) });

    // the steps up to it
    b.moved(cx, 0, cz, a, () => {
      for (let n = 0; n < 2; n++) b.box(RP - 0.05 + n * 0.85, 0, -0.9, RP + (n + 1) * 0.85, POD * (1 - (n + 0.5) / 2.5), 0.9, RIM, { faces: 'ENST' });
    });

    // a pool between two flights of steps: a raised rim of stone, and the water in it
    const pool: P2[] = ([[-13.5, 10.25], [0, 10.15], [13.5, 10.25], [15.5, 12.1], [10, 13.4], [0, 13.9], [-10, 13.4], [-15.5, 12.1]] as P2[]).map(([d, r]): P2 => {
      const p = at(c + d * deg, r, 0);
      return [p[0], p[2]];
    });
    const mx = pool.reduce((sum, p) => sum + p[0], 0) / pool.length, mz = pool.reduce((sum, p) => sum + p[1], 0) / pool.length;
    walls(b, pool, 0, 0.42, RIM);
    flat(b, pool, 0.42, RIM);
    flat(b, pool.map(([x, z]): P2 => [mx + (x - mx) * 0.84, mz + (z - mz) * 0.84]), 0.44, POOL);
  }
  // the roof between the outer leaves and the bud, in their shade, and the glass over the opening at the bud's top
  b.cyl(cx, cz, POD + rise * 0.2, POD + rise * 0.33, 6.2 * u, 4.8 * u, 18, WITHIN, { win: glow, cap: false });
  b.cyl(cx, cz, POD + rise * 0.77, POD + rise * 0.8, 3.1 * u, 3.1 * u, 9, GLASS, { win: interior(0.9), phase: south });

  // --- lawns in the corners, with trees, and a few people on the walks ---
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const x = cx + sx * (reach - 1.6), z = cz + sz * (reach - 1.6);
    k.tree(x, z, sz < 0 ? 0.62 : 0.46);
    k.tree(x - sx * 3.2, z + sz * 0.5, 0.36);
    k.tree(x + sx * 0.5, z - sz * 3.2, 0.36);
  }
  for (const [i, r] of [[0, 11.6], [0, 12.8], [1, 11.2], [2, 12.4], [8, 12], [4, 11.8], [6, 12.6]]) {
    const p = at(south - i * step + 0.04, r, 0);
    k.person(p[0], p[2]);
  }
  for (const [d, r] of [[0.28, 14.2], [2.72, 14.2], [4.3, 14.2]]) {
    const p = at(south - d * step, r, 0);
    k.person(p[0], p[2]);
  }

  k.lights.push({ x: cx + 5, z: cz + 8, r: 20, color: '#f6f1e6', k: 0.8 }, { x: cx - 7, z: cz - 5, r: 18, color: '#f6f1e6', k: 0.6 });
}

// ---------------------------------------------------------------------------
// Safdarjung's Tomb
// ---------------------------------------------------------------------------

/**
 * Safdarjung's Tomb: the last of the great garden tombs, smaller and steeper
 * than Humayun's. Fawn and red stone on a high plinth of arches, a tower of
 * eight sides at each corner, and a bulbous dome striped in white and buff.
 * Its garden has a gatehouse towards the east, a pavilion in the middle of
 * each other wall, and a channel of water on each axis.
 */
function safdarjungsTomb(k: Build, t: Thing): void {
  const b = k.b, g = groundOf('safdarjungs-tomb'), cx = t.x + t.w / 2, cz = t.z + t.d / 2, half = t.w / 2, H = t.h;
  const P = H * 0.13, W = H * 0.57, PT = W + H * 0.06, ph = half + 0.3, bh = half * 0.69, mid = P + (W - P) * 0.5;
  const FAWN = 0xdbb48d, PALE = 0xead8bd, STRIPE = 0xd6b58e, ROOF = 0xcdbb9f, WALL = 0xd4c2a3;

  // --- the plinth ---
  b.box(cx - ph, 0, cz - ph, cx + ph, P - 0.18, cz + ph, RED, { faces: 'NESW' });
  b.box(cx - ph - 0.08, P - 0.18, cz - ph - 0.08, cx + ph + 0.08, P, cz + ph + 0.08, BUFF, { top: 0xd3bfa0 });
  for (const f of FACES) {
    const n = 7, bay = (2 * ph - 0.5) / n;
    for (let i = 0; i < n; i++) sideArch(b, f, cx, cz, -ph + 0.25 + (i + 0.5) * bay, ph, 0.14, bay * 0.64, (P - 0.18) * 0.78, RECESS, { lit: 0.45 });
  }

  // --- the body: two storeys, with a tall portal in the middle of each side ---
  b.box(cx - bh, P, cz - bh, cx + bh, W, cz + bh, FAWN, { faces: 'NESW' });
  b.box(cx - bh - 0.05, mid, cz - bh - 0.05, cx + bh + 0.05, mid + 0.16, cz + bh + 0.05, RED, { faces: 'NESW' });
  b.box(cx - bh - 0.1, W - 0.26, cz - bh - 0.1, cx + bh + 0.1, W + 0.14, cz + bh + 0.1, RED, { top: ROOF });
  const roof = W + 0.14, tr = half * 0.2;
  for (const f of FACES) {
    const pw = bh * 0.44, deep = bh + 0.24, foot = P + 0.02;
    sideBox(b, f, cx, cz, -pw, pw, bh - 0.9, deep, P, PT, RED);
    panel(b, f, cx, cz, -pw + 0.12, pw - 0.12, deep + 0.05, foot, PT - 0.14, 0xf1e7d3);
    sideArch(b, f, cx, cz, 0, deep + 0.05, foot, pw * 1.36, (PT - P) * 0.84, RECESS, { lit: 0.9, fine: true, proud: 0.05 });
    sideArch(b, f, cx, cz, 0, deep + 0.05, foot, pw * 0.7, (PT - P) * 0.42, PALE, { proud: 0.1 });
    sideArch(b, f, cx, cz, 0, deep + 0.05, foot, pw * 0.34, (PT - P) * 0.22, RECESS, { lit: 1.3, proud: 0.15 });
    for (const s of [-1, 1]) {
      const a = s * (pw + (bh - tr - pw) / 2);
      sideArch(b, f, cx, cz, a, bh, P + 0.25, (bh - tr - pw) * 0.74, (W - P) * 0.36, RECESS, { lit: 0.45 });
      sideArch(b, f, cx, cz, a, bh, mid + 0.3, (bh - tr - pw) * 0.74, (W - P) * 0.32, RECESS, { lit: 0.45 });
    }
  }
  // a tower of eight sides at each corner, with a kiosk on its head
  const TT = W + H * 0.045;
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const tx = cx + sx * bh, tz = cz + sz * bh;
    striped(b, tx, tz, P, TT, tr, tr * 0.94, 8, FAWN, PALE);
    b.cyl(tx, tz, mid, mid + 0.16, tr + 0.04, tr + 0.04, 8, RED, { cap: false });
    b.cyl(tx, tz, TT, TT + 0.14, tr + 0.1, tr + 0.1, 8, RED, { cap: ROOF });
    kiosk(b, tx, TT + 0.14, tz, tr * 0.76, H * 0.07, FAWN, MARBLE, 8);
  }

  // --- the dome: bulbous, striped in white marble and buff stone ---
  const DR = t.w * 0.25, fin = H * 0.072, DY = H - fin - 1.58 * DR;
  b.cyl(cx, cz, roof, roof + 0.3, DR * 1.12, DR * 1.12, 16, RED, { cap: ROOF });
  b.cyl(cx, cz, roof + 0.3, DY, DR * 0.87, DR * 0.87, 16, FAWN, { cap: false });
  dome(b, cx, DY, cz, DR, MARBLE, { stripe: STRIPE, sides: 16, finial: fin });

  // --- the garden's wall, and the gatehouse towards the east: two storeys, with a room over the way ---
  const GH = H * 0.33, gd = 2.2, gx1 = g.x1 - 0.2, gx0 = gx1 - gd, gh = 2.2, way = 1.4;
  gardenWall(b, g, 1.4, WALL, 0xb9a98c, { side: 'E', half: gh });
  for (const [a, c] of [[cz - gh, cz - way / 2], [cz + way / 2, cz + gh]]) b.box(gx0, 0, a, gx1, GH, c, FAWN);
  archThrough(b, 'x', (gx0 + gx1) / 2, cz, gd, way, 0, GH * 0.64, GH, FAWN, RECESS);
  b.box(gx0 - 0.06, GH * 0.7, cz - gh - 0.06, gx1 + 0.06, GH * 0.7 + 0.16, cz + gh + 0.06, RED, { faces: 'NESW' });
  b.box(gx0 - 0.1, GH, cz - gh - 0.1, gx1 + 0.1, GH + 0.26, cz + gh + 0.1, RED, { top: ROOF });
  b.box(gx0 + 0.25, GH + 0.26, cz - 1.2, gx1 - 0.25, GH + 1.25, cz + 1.2, FAWN, { top: ROOF });
  for (const [x, nx] of [[gx1, 1], [gx0, -1]]) {
    archOn(b, x - nx * 0.25, GH + 0.36, cz, nx, 0, 0.8, 0.7, RECESS, { lit: 0.8 });
    for (const s of [-1, 1]) {
      archOn(b, x, 0.3, cz + s * (way / 2 + gh) / 2, nx, 0, 0.7, GH * 0.36, RECESS, { lit: 0.5 });
      archOn(b, x, GH * 0.7 + 0.3, cz + s * (way / 2 + gh) / 2, nx, 0, 0.6, GH * 0.2, RECESS, { lit: 0.5 });
    }
  }
  // a pavilion in the middle of the north wall and of the west, with three arches towards the tomb.
  // (The one in the south wall is left out: it would stand between the view and the channel.)
  const pd = 1.9, pl = 2.3, PH = H * 0.16;
  const pavilion = (f: Facing): void => {
    const far = (f === 'N' || f === 'S' ? (g.z1 - g.z0) / 2 : (g.x1 - g.x0) / 2) - 0.2, inner: Facing = f === 'N' ? 'S' : f === 'S' ? 'N' : 'E';
    sideBox(b, f, g.cx, g.cz, -pl, pl, far - pd, far, 0, PH, FAWN, { top: ROOF });
    sideBox(b, f, g.cx, g.cz, -pl - 0.06, pl + 0.06, far - pd - 0.06, far + 0.06, PH - 0.3, PH - 0.12, RED, { faces: 'NESW' });
    const [nx, nz] = OUT[inner], x = g.cx - nx * (far - pd), z = g.cz - nz * (far - pd);
    for (const s of [-1, 0, 1]) archOn(b, x + (nz !== 0 ? s * pl * 0.62 : 0), 0.1, z + (nx !== 0 ? s * pl * 0.62 : 0), nx, nz, pl * 0.42, PH * 0.66, RECESS, { lit: 0.6 });
  };
  pavilion('N'); pavilion('W');

  // --- a walk round the plinth, and a walk with its channel on each axis ---
  const px0 = cx - ph - 0.08, px1 = cx + ph + 0.08, pz0 = cz - ph - 0.08, pz1 = cz + ph + 0.08, ap = 0.7, inset = 0.2 + pd;
  paint(k, px0 - ap, pz0 - ap, px1 + ap, pz0, PATH, PATH_Y);
  paint(k, px0 - ap, pz1, px1 + ap, pz1 + ap, PATH, PATH_Y);
  paint(k, px0 - ap, pz0, px0, pz1, PATH, PATH_Y);
  paint(k, px1, pz0, px1 + ap, pz1, PATH, PATH_Y);
  paint(k, gx0, cz - way / 2, gx1, cz + way / 2, PATH, PATH_Y);
  channelWalk(k, px1 + ap, cz, gx0, cz, 1.5);
  channelWalk(k, g.x0 + inset, cz, px0 - ap, cz, 1.5);
  channelWalk(k, cx, g.z0 + inset, cx, pz0 - ap, 1.5);
  channelWalk(k, cx, pz1 + ap, cx, g.z1 - 0.65, 1.5);

  // old trees in the four lawns, and palms beside the walk from the gate
  const lx = (g.x0 + 0.65 + px0 - ap) / 2, rx = (px1 + ap + g.x1 - 0.65) / 2, nz = (g.z0 + 0.65 + pz0 - ap) / 2, sz = (pz1 + ap + g.z1 - 0.65) / 2;
  for (const [x, z, s] of [[lx, nz, 0.74], [rx, nz, 0.6], [lx, sz, 0.56], [rx + 0.3, sz + 0.3, 0.44], [lx - 0.4, cz - 3.4, 0.4], [cx - 3.2, nz - 0.3, 0.42], [cx + 3.3, sz + 0.5, 0.34]]) k.tree(x, z, s);
  for (const s of [-1, 1]) {
    k.tree(rx - 0.4, cz + s * 1.5, 0.42, true);
    k.tree(cx + s * 1.5, sz + 0.2, 0.4, true);
  }
  // a few visitors on the walk round the plinth and on the lawn: none on a channel
  for (const [x, z] of [[px1 + 0.35, cz + 2.2], [cx - 1.6, pz1 + 0.35], [px1 + 0.35, cz - 2.4], [cx - 1.35, pz1 + 1.5]]) k.person(x, z);

  k.lights.push({ x: cx + 3, z: pz1 + 2, r: 15, color: '#ffe2ae', k: 0.8 }, { x: px1 + 2, z: cz - 2, r: 12, color: '#ffe2ae', k: 0.65 });
  for (const s of [-1, 1]) k.glows.push({ x: gx0 - 0.12, y: 2.2, z: cz + s * (way / 2 + 0.25), sx: 0.2, sy: 0.3, sz: 0.2, color: '#ffe2ae' });
}

// ---------------------------------------------------------------------------
// Khan Market, and the place kept for a hero in its car park
// ---------------------------------------------------------------------------

/** Where a hero stands in Khan Market's car park, facing east: index.ts declares the place, and nothing of this file's may hide it. */
const KHAN_BAY: P2 = [21.5, 38.5];
/** The way from anything on the tile towards the camera of the opening view, on the ground. */
const VIEW: P2 = [0.672, 0.742];

/** Whether something that stood here would be on the hero's place, or within ten units to its south-east, where the opening view looks at it from. */
function inHeroView(x: number, z: number, pad = 0.3): boolean {
  for (let d = 0; d <= 10; d += 0.2) {
    if (Math.abs(x - VIEW[0] * d - KHAN_BAY[0]) < 3.5 + pad && Math.abs(z - VIEW[1] * d - KHAN_BAY[1]) < 1.3 + pad) return true;
  }
  return false;
}

/** A board on a wall with a sign on it: a dark box a hair proud of the wall, and the lettering in front of that. */
function shopBoard(k: Build, id: string, x: number, y: number, z: number, nx: number, nz: number, h: number, maxW: number): void {
  const w = k.sign(id, x + nx * 0.13, y, z + nz * 0.13, nx, nz, h, maxW) / 2 + 0.08;
  if (nz !== 0) k.b.box(x - w, y - h / 2 - 0.07, Math.min(z, z + nz * 0.1), x + w, y + h / 2 + 0.07, Math.max(z, z + nz * 0.1), 0x2c2622, { faces: 'NESWTB' });
  else k.b.box(Math.min(x, x + nx * 0.1), y - h / 2 - 0.07, z - w, Math.max(x, x + nx * 0.1), y + h / 2 + 0.07, z + w, 0x2c2622, { faces: 'NESWTB' });
}

/**
 * Khan Market: white blocks of two storeys round a small car park, shops below
 * and flats above, with a gallery along the upper floor. The north arm and
 * the west arm are built and the south-east is left open, so that the bay in
 * the car park which is kept for a hero is seen. The bay fills the car park:
 * there is no room beside it for a parked car, only for a scooter.
 */
function khanMarket(k: Build, t: Thing): void {
  const b = k.b, g = groundOf('khan-market'), x1 = t.x + t.w, z1 = t.z + t.d, [hx, hz] = KHAN_BAY;
  const WHITE = 0xf4f1ea, TRIM = 0xdcd7cb, ROOF = 0xbdb5a6, storey = (t.h - 0.2) / 2, top = storey * 2;
  const SHOPS: WinSpec = { cell: 2.45, storey, lit: 0.5, kind: 2 };
  const wx1 = hx - 4.3, wz1 = g.z1 - 0.15; // the west arm's front stands clear of the bay's tail

  b.box(t.x, 0, t.z, x1, top, z1, WHITE, { win: SHOPS, seed: 0.31 });
  b.box(t.x + 0.1, top, t.z + 0.1, x1 - 0.1, t.h, z1 - 0.1, TRIM, { top: ROOF });
  b.box(t.x, 0, z1, wx1, top, wz1, WHITE, { win: SHOPS, seed: 0.62, faces: 'ESWT' });
  b.box(t.x + 0.1, top, z1 - 0.1, wx1 - 0.1, t.h, wz1 - 0.1, TRIM, { top: ROOF, faces: 'ESWT' });

  // the gallery along the upper floor of both arms, with its rail, and the boards that hang on the rail
  const gy = storey, gw = 0.55, rail = gy + 0.14, railTop = rail + 0.7, RAIL = 0xcfc9bc;
  b.box(wx1, gy, z1, x1, rail, z1 + gw, TRIM, { faces: 'ESTB' });
  b.box(wx1 + gw - 0.07, rail, z1 + gw - 0.07, x1, railTop, z1 + gw, RAIL, { faces: 'NEST' });
  b.box(wx1, gy, z1 + gw, wx1 + gw, rail, wz1, TRIM, { faces: 'ESTB' });
  b.box(wx1 + gw - 0.07, rail, z1 + gw, wx1 + gw, railTop, wz1, RAIL, { faces: 'ESWT' });
  const front = x1 - wx1, sy = (rail + railTop) / 2;
  ['south-books', 'south-cafe', 'south-kebabs'].forEach((id, i) => shopBoard(k, id, wx1 + front * ((i * 2 + 1) / 6) + 0.2, sy, z1 + gw, 0, 1, 0.52, front / 3 - 0.5));
  shopBoard(k, 'south-flowers', wx1 + gw, sy, (z1 + gw + wz1) / 2, 1, 0, 0.52, wz1 - z1 - gw - 0.5);

  // on the roofs: water tanks, and a cafe's terrace at the east end
  for (const x of [t.x + 1.6, t.x + t.w * 0.45]) b.cyl(x, t.z + 1.1, t.h, t.h + 0.95, 0.52, 0.52, 8, 0x30333a, { cap: 0x3b3f47 });
  parasol(b, x1 - 1.7, t.z + t.d / 2, 0xd8432b, t.h);
  for (const [x, z] of [[x1 - 2.6, t.z + t.d / 2 + 0.3], [x1 - 0.9, t.z + t.d / 2 - 0.5]]) k.person(x, z, t.h);
  // and two people on the gallery
  for (const x of [hx - 1.4, hx + 2.3]) k.person(x, z1 + gw / 2 - 0.05, rail);

  // --- the car park, and the bay in it that is kept for a hero: marked out, and empty ---
  paint(k, wx1, z1, g.x1, g.z1, 0x908d87, 0.035);
  const bx0 = hx - 3.8, bx1 = hx + 3.9, bz0 = hz - 1.6, bz1 = hz + 1.6, LINE = 0xf4f1e8;
  paint(k, bx0, bz0, bx1, bz1, 0xa9a59d, 0.05);
  paint(k, bx0, bz0, bx1, bz0 + 0.14, LINE, 0.065);
  paint(k, bx0, bz1 - 0.14, bx1, bz1, LINE, 0.065);
  paint(k, bx0, bz0 + 0.14, bx0 + 0.14, bz1 - 0.14, LINE, 0.065);

  // what the shops put out, all of it low: buckets of flowers by the west arm, and a rack of books
  const FLOWERS = [0xe0527a, 0xf2c14e, 0xf4f1e8, 0xd8432b, 0x9c5fc4];
  FLOWERS.forEach((color, i) => {
    const z = z1 + 1.0 + i * 0.52, x = wx1 + 0.2;
    b.cyl(x, z, 0, 0.42, 0.15, 0.18, 6, 0x4a5560, { cap: false });
    b.cyl(x, z, 0.42, 0.72, 0.22, 0.15, 6, color);
  });
  b.box(x1 - 3.3, 0, z1 + 0.06, x1 - 2.1, 0.8, z1 + 0.36, 0x7a5a3c, { top: 0xd9c9a8 });
  // a scooter in the corner the bay leaves, and someone beside it: neither on the bay nor between it and the view
  if (!inHeroView(x1 - 0.5, z1 + 2.1, 0)) twoWheeler(b, x1 - 0.5, z1 + 1.1, -Math.PI / 2, 0xc8202c, true);
  for (const [x, z] of [[x1 - 1.25, z1 + 0.42], [wx1 + 0.3, wz1 - 0.3]]) if (!inHeroView(x, z)) k.person(x, z);

  k.lights.push({ x: hx + 0.5, z: hz, r: 11, color: '#ffe2ae', k: 0.75 });
  for (let i = 0; i < 4; i++) k.glows.push({ x: wx1 + front * ((i + 0.5) / 4), y: gy - 0.14, z: z1 + gw - 0.2, sx: 0.3, sy: 0.12, sz: 0.2, color: '#ffe9bd' });
}

// ---------------------------------------------------------------------------
// Lodhi Garden
// ---------------------------------------------------------------------------

/**
 * Lodhi Garden: the Bara Gumbad, a big square tomb of grey stone under one
 * dome, with its small mosque joined to it on a platform they share, and the
 * Sheesh Gumbad, a second square tomb with a band of blue tiles. Lawns, old
 * trees, beds of flowers, and a walk with people out for the morning.
 *
 * The garden's east end lies south-east of the hero's place in Khan Market,
 * so nothing taller than a flower bed stands there.
 */
function lodhiGarden(k: Build, t: Thing): void {
  const b = k.b, g = groundOf('lodhi-garden'), x1 = t.x + t.w, z1 = t.z + t.d, cx = t.x + t.w / 2, cz = t.z + t.d / 2, half = t.w / 2, H = t.h;
  const GREY = 0xaaa193, SHADE = 0x8b8276, LIME = 0xd2cab9, TOP = 0xc1b8a8, TILE = 0x1f9bd1, WALK = 0xdccba9;
  const PL = H * 0.11, WT = H * 0.59, midY = PL + (WT - PL) * 0.52;

  // --- the platform that the Bara Gumbad and its mosque share, with steps down to the lawn ---
  const mw = t.w * 0.43, px0 = t.x - 0.4, px1 = x1 + mw + 0.6, pz0 = Math.max(g.z0 + 0.5, t.z - 0.45), pz1 = Math.min(g.z1 - 0.5, z1 + 0.45);
  b.box(px0, 0, pz0, px1, PL, pz1, SHADE, { top: TOP });
  steps(b, 'E', px1, cz - 2.3, cz - 0.7, 0, PL, 3, 0.3, GREY);
  const foot = px1 + 0.9;

  // --- the Bara Gumbad: one storey that looks like two, a doorway in a tall frame on three sides, and the big dome ---
  b.box(t.x, PL, t.z, x1, WT, z1, GREY, { faces: 'NESW' });
  b.box(t.x - 0.05, midY, t.z - 0.05, x1 + 0.05, midY + 0.14, z1 + 0.05, SHADE, { faces: 'NESW' });
  b.box(t.x - 0.08, WT - 0.28, t.z - 0.08, x1 + 0.08, WT + 0.1, z1 + 0.08, SHADE, { top: TOP });
  for (const f of FACES) {
    const fw = half * 0.46, d = half + 0.2;
    if (f !== 'E') {
      sideBox(b, f, cx, cz, -fw, fw, half - 0.4, d, PL, WT + 0.36, GREY);
      sideArch(b, f, cx, cz, 0, d, PL + 0.02, fw * 1.5, (WT - PL) * 0.84, RED, { fine: true, proud: 0.04 });
      sideArch(b, f, cx, cz, 0, d, PL + 0.02, fw * 1.2, (WT - PL) * 0.77, RECESS, { lit: 0.8, fine: true, proud: 0.09 });
    }
    for (const s of [-1, 1]) {
      const a = s * (fw + (half - fw) / 2), w = (half - fw) * 0.56;
      if (f !== 'E') sideArch(b, f, cx, cz, a, half, PL + 0.25, w, (midY - PL) * 0.8, SHADE);
      sideArch(b, f, cx, cz, a, half, midY + 0.3, w, (WT - midY) * 0.6, SHADE);
    }
  }
  const BR = (H - WT - 0.6) / 1.04;
  b.cyl(cx, cz, WT + 0.1, WT + 0.6, BR * 1.06, BR * 1.06, 16, GREY, { cap: TOP });
  dome(b, cx, WT + 0.6, cz, BR, LIME, { kind: 'round', sides: 12, finial: false });

  // --- its mosque, against its east side: five arches that look east, and three low domes ---
  const mz0 = t.z + 0.35, mz1 = z1 - 1.25, mx1 = x1 + mw, MH = PL + H * 0.27, bay = (mz1 - mz0) / 5;
  b.box(x1, PL, mz0, mx1, MH, mz1, GREY, { faces: 'NEST', top: TOP });
  b.box(x1, MH - 0.32, mz0 - 0.05, mx1 + 0.05, MH - 0.04, mz1 + 0.05, SHADE, { faces: 'NES' });
  for (let i = 0; i < 5; i++) archOn(b, mx1, PL + 0.03, mz0 + (i + 0.5) * bay, 1, 0, bay * (i === 2 ? 0.76 : 0.64), (MH - PL) * (i === 2 ? 0.74 : 0.64), RECESS, { lit: 0.7 });
  for (const i of [1, 2, 3]) lathe(b, x1 + mw / 2, mz0 + (i + 0.5) * bay, [[bay * 0.5, MH], [bay * 0.42, MH + bay * 0.34], [0.03, MH + bay * 0.56]], 8, LIME);

  // --- the Sheesh Gumbad, as far east as it may stand without coming between the hero's place and the view ---
  const S = t.w * 0.58, sh = S / 2, sz1 = g.z1 - 0.7, sz0 = sz1 - S;
  const sx1 = KHAN_BAY[0] - 3.5 + (VIEW[0] / VIEW[1]) * (sz0 - KHAN_BAY[1] - 1.3) - 0.3, sx0 = sx1 - S, scx = (sx0 + sx1) / 2, scz = (sz0 + sz1) / 2;
  const SB = 0.25, SWT = H * 0.47, yb = SB + (SWT - SB) * 0.62;
  b.box(sx0 - 0.3, 0, sz0 - 0.3, sx1 + 0.3, SB, sz1 + 0.3, SHADE, { top: TOP });
  b.box(sx0, SB, sz0, sx1, SWT, sz1, GREY, { faces: 'NESW' });
  b.box(sx0 - 0.06, SWT - 0.24, sz0 - 0.06, sx1 + 0.06, SWT + 0.1, sz1 + 0.06, SHADE, { top: TOP });
  for (const f of FACES) {
    const fw = sh * 0.46, d = sh + 0.15;
    sideBox(b, f, scx, scz, -fw, fw, sh - 0.3, d, SB, SWT + 0.3, GREY);
    sideArch(b, f, scx, scz, 0, d, SB + 0.02, fw * 1.5, (yb - SB) * 0.94, RED, { proud: 0.04 });
    sideArch(b, f, scx, scz, 0, d, SB + 0.02, fw * 1.18, (yb - SB) * 0.86, RECESS, { lit: 0.8, proud: 0.09 });
    // the band of blue tiles: across the head of the doorway's frame, and along the wall either side of it
    panel(b, f, scx, scz, -fw + 0.06, fw - 0.06, d + 0.04, yb, yb + 0.46, TILE);
    for (const s of [-1, 1]) {
      const a = s * (fw + (sh - fw) / 2), w = (sh - fw) / 2 - 0.06;
      panel(b, f, scx, scz, a - w, a + w, sh + 0.04, yb, yb + 0.46, TILE);
      sideArch(b, f, scx, scz, a, sh, SB + 0.2, w * 1.2, (yb - SB) * 0.6, SHADE);
    }
  }
  const SR = S * 0.4;
  b.cyl(scx, scz, SWT + 0.1, SWT + 0.5, SR * 1.06, SR * 1.06, 12, GREY, { cap: TOP });
  dome(b, scx, SWT + 0.5, scz, SR, LIME, { kind: 'round', sides: 10, finial: 0.4 });

  // --- the walk: from the steps east across the lawn, down its far end and back along the south ---
  const pa = cz - 1.5, ex = g.x1 - 1.45, sy = g.z1 - 1.05;
  paint(k, foot, pa - 0.55, g.x1 - 0.3, pa + 0.55, WALK, PATH_Y);
  paint(k, ex - 0.55, pa + 0.55, ex + 0.55, g.z1 - 0.5, WALK, PATH_Y);
  paint(k, sx1 + 0.3, sy - 0.55, ex - 0.55, sy + 0.55, WALK, PATH_Y);
  paint(k, foot + 0.2, g.z0 + 0.2, foot + 1.3, pa - 0.55, WALK, PATH_Y);
  // beds of flowers in the open lawn
  for (const [x, z, color] of [[g.x1 - 4.4, pa - 1.5, 0xe0527a], [g.x1 - 3.4, pa + 2.1, 0xf2c14e]]) {
    b.cyl(x, z, 0, 0.2, 0.85, 0.85, 8, 0x6a4f36, { cap: false });
    b.cyl(x, z, 0.2, 0.4, 0.78, 0.6, 8, color);
  }

  // people out for the morning: walkers and joggers on the walk, and one with a dog on a lead
  const stand = (x: number, z: number): void => { if (!inHeroView(x, z) && offStreet(k, x, z)) k.person(x, z); };
  for (const [x, z] of [[foot + 0.5, pa + 0.15], [foot + 1.7, pa - 0.2], [foot + 0.75, g.z0 + 1.1], [ex + 0.1, g.z1 - 2.1], [ex - 0.15, g.z1 - 1.0], [sx1 + 1.4, sy + 0.1], [t.x - 1.2, cz + 0.8], [t.x - 1.3, cz - 1.4]]) stand(x, z);
  {
    const dx = sx1 + 2.2, dz = sy - 0.15, TAN = 0xb98a54;
    b.box(dx - 0.45, 0.34, dz - 0.15, dx + 0.45, 0.7, dz + 0.15, TAN, { faces: 'NESWTB' });
    b.box(dx + 0.38, 0.6, dz - 0.13, dx + 0.76, 0.93, dz + 0.13, TAN, { faces: 'NESWTB' });
    for (const s of [-1, 1]) b.box(dx + s * 0.33 - 0.09, 0, dz - 0.13, dx + s * 0.33 + 0.09, 0.34, dz + 0.13, 0xa67a48, { faces: 'NESW' });
    b.box(dx - 0.6, 0.62, dz - 0.05, dx - 0.45, 0.92, dz + 0.05, TAN);
    b.beam([dx + 0.42, 0.74, dz], [dx - 0.95, 1.2, dz + 0.32], 0.035, 0.035, 0xe26a4a);
    stand(dx - 1.15, dz + 0.4);
  }
  // old trees, where they hide neither a tomb nor the hero's place
  for (const [x, z, s] of [[t.x - 1.0, cz - 0.4, 0.72], [t.x - 1.2, z1 - 0.2, 0.82], [g.x1 - 0.5, g.z1 - 2.5, 0.58], [g.x1 - 0.5, g.z1 - 0.5, 0.5]]) if (!inHeroView(x, z, 0) && offStreet(k, x, z)) k.tree(x, z, s);

  k.lights.push({ x: foot + 1, z: pa, r: 12, color: '#ffe2ae', k: 0.65 }, { x: sx1 + 1.5, z: scz, r: 9, color: '#ffe2ae', k: 0.55 }, { x: cx, z: z1 + 1.5, r: 10, color: '#ffe2ae', k: 0.5 });
}

// ---------------------------------------------------------------------------
// Dilli Haat
// ---------------------------------------------------------------------------

/**
 * Dilli Haat: an open-air bazaar of crafts. Small stalls of brick with open
 * fronts, under roofs of tile and of thatch, stand along the north and the
 * west of a brick-paved court, with rugs laid out and hung up, pots, lanterns
 * on strings and places to eat. Its gate is towards the east. Everything
 * stands three units back from the south edge, where the flyover's ramp begins.
 */
function dilliHaat(k: Build, t: Thing): void {
  const b = k.b, x0 = t.x, x1 = t.x + t.w, z0 = t.z, front = t.z + t.d - 3;
  const BRICK = 0xb5694c, BRICK_DARK = 0x9a5640, TILE = 0xc4603c, THATCH = 0xd8b765, WOOD = 0x8a6a48;
  const COLOURS = [0xc8202c, 0x2a6fb0, 0xf2c14e, 0x2f8f6a, 0xe0527a, 0xf08a24, 0x7a4fa3, 0xf4f1e8];
  paint(k, x0, z0, x1, t.z + t.d, 0xd6c3a4, 0.02);
  paint(k, x0 + 3.0, z0 + 2.9, x1 - 2.6, front, 0xc79a7a, 0.035);

  /** A stall with an open front that looks the way `f` does. `n` picks its roof and the colours of what it sells. */
  const stall = (sx0: number, sz0: number, sx1: number, sz1: number, f: Facing, n: number): void => {
    const wall = 2.1, over = 0.35, thatch = n % 2 === 1, mx = (sx0 + sx1) / 2, mz = (sz0 + sz1) / 2;
    const wide = f === 'N' || f === 'S', hw = (wide ? sx1 - sx0 : sz1 - sz0) / 2, hd = (wide ? sz1 - sz0 : sx1 - sx0) / 2;
    b.box(sx0, 0, sz0, sx1, wall, sz1, n % 3 ? BRICK : BRICK_DARK, { faces: 'NESW' });
    b.box(sx0 - over, wall - 0.14, sz0 - over, sx1 + over, wall, sz1 + over, thatch ? 0xb99a52 : BRICK_DARK, { faces: 'NESWB' });
    if (thatch) hip(b, sx0, sz0, sx1, sz1, wall, 1.3, THATCH, over);
    else gable(b, sx0, sz0, sx1, sz1, wall, 1.05, TILE, BRICK, wide ? 'x' : 'z', over);
    // the open front, its counter, and what hangs either side of it
    panel(b, f, mx, mz, -hw + 0.22, hw - 0.22, hd + 0.04, 0.08, wall - 0.32, RECESS, { win: interior(1.1) });
    sideBox(b, f, mx, mz, -hw + 0.3, hw - 0.3, hd + 0.04, hd + 0.46, 0, 0.72, WOOD, { top: COLOURS[n % 8] });
    for (const s of [-1, 1]) panel(b, f, mx, mz, s * (hw - 0.62) - 0.26, s * (hw - 0.62) + 0.26, hd + 0.1, 0.85, wall - 0.4, COLOURS[(n * 3 + (s > 0 ? 2 : 5)) % 8]);
  };
  // the row along the north, which looks south onto the court, and two places to eat along the west
  const n0 = x0 + 3.2, n1 = x1 - 3.3, each = (n1 - n0) / 5;
  for (let i = 0; i < 5; i++) stall(n0 + i * each + 0.15, z0 + 0.45, n0 + (i + 1) * each - 0.15, z0 + 2.7, 'S', i);
  const w1 = (front - z0 - 0.45) / 2;
  for (let i = 0; i < 2; i++) stall(x0 + 0.45, z0 + 0.45 + i * w1 + (i ? 0.15 : 0), x0 + 2.7, z0 + 0.45 + (i + 1) * w1 - (i ? 0 : 0.15), 'E', i + 5);
  shopBoard(k, 'south-pottery', n0 + each * 0.5, 2.42, z0 + 2.7 + 0.35, 0, 1, 0.42, each - 0.7);
  shopBoard(k, 'south-rugs', n0 + each * 2.5, 2.42, z0 + 2.7 + 0.35, 0, 1, 0.42, each - 0.7);
  shopBoard(k, 'south-momos', x0 + 2.7 + 0.35, 2.42, z0 + 0.45 + w1 * 0.5, 1, 0, 0.42, w1 - 0.7);

  // --- the gate, towards the road: two piers of brick with tiled caps, an arch between them, and the bazaar's name across it ---
  const gw = 1.9, pier = 0.4, gz = front - gw / 2 - 2 * pier - 0.2, gx = x1 - 1.3, GH = t.h * 0.7;
  for (const s of [-1, 1]) {
    const z = gz + s * (gw / 2 + pier);
    b.box(gx - pier, 0, z - pier, gx + pier, GH + 0.25, z + pier, BRICK);
    b.box(gx - pier - 0.14, GH + 0.25, z - pier - 0.14, gx + pier + 0.14, GH + 0.37, z + pier + 0.14, BRICK_DARK, { faces: 'NESWB' });
    hip(b, gx - pier - 0.14, z - pier - 0.14, gx + pier + 0.14, z + pier + 0.14, GH + 0.37, t.h - GH - 0.37, TILE, 0);
    k.glows.push({ x: gx + pier + 0.08, y: 1.9, z, sx: 0.18, sy: 0.3, sz: 0.18, color: '#ffe2ae' });
  }
  archThrough(b, 'x', gx, gz, 0.6, gw, 0, GH * 0.66, GH, BRICK, BRICK_DARK, true);
  b.box(gx - 0.3, GH, gz - gw / 2, gx + 0.3, GH + 0.12, gz + gw / 2, BRICK_DARK, { faces: 'EWT' });
  for (const s of [-1, 1]) shopBoard(k, 'south-haat', gx + s * pier, GH * 0.86, gz, s, 0, 0.54, gw + 4 * pier - 0.2);
  // a low wall of brick either side of the gate, along the road
  for (const [a, c] of [[z0 + 0.3, gz - gw / 2 - 2 * pier], [gz + gw / 2 + 2 * pier, front]]) if (c - a > 0.2) b.box(gx - 0.18, 0, a, gx + 0.18, 1.0, c, BRICK, { top: BRICK_DARK });

  // --- the court: rugs laid out on the paving, a line of them hung up, pots, and shade to eat under ---
  const cz0 = z0 + 3.2, court = (x: number, z: number, w: number, d: number, n: number): void => {
    paint(k, x, z, x + w, z + d, COLOURS[n % 8], 0.05);
    paint(k, x + 0.2, z + 0.2, x + w - 0.2, z + d - 0.2, COLOURS[(n + 3) % 8], 0.065);
  };
  court(n0 + each * 2.1, cz0 + 0.3, 1.5, 1.0, 0); court(n0 + each * 2.1 + 1.7, cz0 + 0.3, 1.5, 1.0, 1); court(n0 + each * 2.1 + 0.8, cz0 + 1.5, 1.6, 1.0, 6);
  {
    const lx0 = n0 + each * 3.5, lx1 = n0 + each * 4.9, lz = cz0 + 1.3;
    for (const x of [lx0, lx1]) b.box(x - 0.06, 0, lz - 0.06, x + 0.06, 2.3, lz + 0.06, WOOD, { faces: 'NESW' });
    b.beam([lx0, 2.25, lz], [lx1, 2.25, lz], 0.03, 0.03, 0xd9c9a8);
    for (let i = 0; i < 4; i++) {
      const xa = lx0 + 0.15 + i * ((lx1 - lx0 - 0.3) / 4);
      b.box(xa, 0.75, lz - 0.03, xa + (lx1 - lx0 - 0.3) / 4 - 0.08, 2.2, lz + 0.03, COLOURS[(i * 3 + 1) % 8], { faces: 'NS' });
    }
  }
  [[n0 + each * 0.35, cz0 + 0.25, 0.42, 0xb5694c], [n0 + each * 0.35 + 0.8, cz0 + 0.4, 0.3, 0x2a6fb0], [n0 + each * 0.35 + 0.3, cz0 + 0.95, 0.26, 0xf4f1e8], [n0 + each * 0.35 + 1.4, cz0 + 0.2, 0.34, 0xb5694c]].forEach(([x, z, r, color]) => {
    b.cyl(x, z, 0, r * 1.1, r * 0.6, r, 5, color, { cap: false });
    b.cyl(x, z, r * 1.1, r * 2.1, r, r * 0.5, 5, color, { cap: 0x3a2a22 });
  });
  // shade to eat under, by the places to eat: thatch on a post, and a table under it
  for (const [x, z] of [[x0 + 4.4, cz0 + 0.9], [x0 + 5.2, front - 0.9]]) {
    b.cyl(x, z, 0, 2.0, 0.08, 0.08, 5, WOOD, { cap: false });
    b.cyl(x, z, 1.9, 2.85, 1.15, 0.08, 8, THATCH, { cap: false });
    b.cyl(x, z, 0.62, 0.7, 0.55, 0.55, 6, 0xe9dcc4);
  }
  // lanterns in many colours, on two strings across the court
  for (const [xa, xb, z] of [[x0 + 3.4, n0 + each * 2, front - 0.5], [n0 + each * 2.2, x1 - 3.2, front - 0.25]]) {
    for (const x of [xa, xb]) b.box(x - 0.05, 0, z - 0.05, x + 0.05, 2.9, z + 0.05, WOOD, { faces: 'NESW' });
    b.beam([xa, 2.85, z], [xb, 2.85, z], 0.025, 0.025, 0xd9c9a8);
    for (let i = 0; i < 4; i++) {
      const x = xa + ((i + 0.5) / 4) * (xb - xa);
      b.box(x - 0.17, 2.3, z - 0.17, x + 0.17, 2.76, z + 0.17, COLOURS[(i * 3 + (xa > x0 + 4 ? 1 : 0)) % 7], { win: interior(1.6), faces: 'NESWTB' });
      k.glows.push({ x, y: 2.24, z, sx: 0.14, sy: 0.1, sz: 0.14, color: '#ffe9bd' });
    }
  }

  const rand = rng(34117);
  for (let i = 0, tries = 0; i < 22 && tries < 200; tries++) {
    const x = x0 + 3.2 + rand() * (x1 - x0 - 5.4), z = cz0 + rand() * (front - cz0 - 0.2);
    if ((x > n0 + each * 2 && x < n0 + each * 2 + 3.4 && z < cz0 + 2.7) || (x > n0 + each * 3.4 && z > cz0 + 0.9 && z < cz0 + 1.7) || (x < n0 + each * 0.35 + 1.9 && x > n0 + each * 0.35 - 0.5 && z < cz0 + 1.5)) continue;
    k.person(x, z);
    i++;
  }
  k.lights.push({ x: (x0 + x1) / 2 - 2, z: front - 1, r: 12, color: '#ffd9a0', k: 0.8 }, { x: x1 - 4, z: gz, r: 10, color: '#ffd9a0', k: 0.7 });
}

// ---------------------------------------------------------------------------
// Sarojini Nagar
// ---------------------------------------------------------------------------

/**
 * Sarojini Nagar market: two blocks of two storeys with shops below, and in
 * front of them lanes of stalls under awnings, with tables piled with clothes
 * and racks of them in every colour, and a crowd between.
 */
function sarojiniNagar(k: Build, t: Thing): void {
  const b = k.b, x0 = t.x, x1 = t.x + t.w, z0 = t.z, z1 = t.z + t.d;
  const WHITE = 0xece7dc, TRIM = 0xd3ccbd, ROOF = 0xbdb5a6, POST = 0xa7adb5;
  const CLOTH = [0xd94f4f, 0x3f6fb5, 0xf2c14e, 0x4fa36b, 0xf4f1e8, 0xc77dba, 0xf08a4b, 0x35b6c8, 0x7a4fa3, 0xe8607a, 0x2f2f38, 0x9ccc65];
  const storey = (t.h - 0.2) / 2, SHOPS: WinSpec = { cell: 2.3, storey, lit: 0.55, kind: 3 };
  const rand = rng(51907), taken: [number, number, number, number][] = [];
  paint(k, x0, z0, x1, z1, 0xcfc6b6, 0.02);

  // --- two blocks along the west, shops below and rooms above, with awnings over the shops and boards above those ---
  const bx1 = x0 + 0.3 + t.w * 0.29, signs = ['south-shoes', 'south-bags', 'south-jeans', 'south-shoes'];
  [[z0 + 0.5, z0 + t.d * 0.37], [z0 + t.d * 0.46, z0 + t.d * 0.83]].forEach(([a, c], n) => {
    b.box(x0 + 0.3, 0, a, bx1, storey * 2, c, WHITE, { win: SHOPS, seed: 0.2 + n * 0.3 });
    b.box(x0 + 0.4, storey * 2, a + 0.1, bx1 - 0.1, t.h, c - 0.1, TRIM, { top: ROOF });
    taken.push([x0, a - 0.3, bx1 + 1.3, c + 0.3]);
    const len = (c - a) / 2;
    for (let i = 0; i < 2; i++) {
      const zm = a + (i + 0.5) * len;
      slab(b, [bx1, storey - 0.1, zm], [bx1 + 1.1, storey - 0.55, zm], len / 2 - 0.12, 0.06, CLOTH[(n * 2 + i * 5 + 1) % 12], { under: 0x8a8378 });
      shopBoard(k, signs[n * 2 + i], bx1, storey + 0.24, zm, 1, 0, 0.42, len - 1.0);
    }
  });

  // --- lanes of stalls: an awning on two posts, a table piled with clothes under it, and a rack beside it ---
  const rows = [x0 + t.w * 0.55, x0 + t.w * 0.82], pitch = t.d * 0.16;
  rows.forEach((xc, r) => {
    for (let i = 0; i < 5; i++) {
      const zc = z0 + 2.2 + i * pitch + r * 0.9, n = r * 5 + i, hi = 2.45, lo = 2.05;
      slab(b, [xc - 1.15, hi, zc], [xc + 1.15, lo, zc], 1.1, 0.07, CLOTH[(n * 5 + 2) % 12], { under: 0x8a8378 });
      for (const s of [-1, 1]) b.box(xc - 0.05, 0, zc + s * 1.0 - 0.05, xc + 0.05, (hi + lo) / 2 - 0.05, zc + s * 1.0 + 0.05, POST, { faces: 'NESW' });
      b.box(xc - 0.8, 0, zc - 0.75, xc + 0.8, 0.85, zc + 0.75, 0x8a6a48, { top: CLOTH[(n * 7 + 3) % 12] });
      taken.push([xc - 1.1, zc - 1.2, xc + 1.1, zc + 1.2]);
      if (i === 4 || (r === 0 && i === 1) || (r === 1 && i === 2)) continue;
      // a rack between this stall and the next: clothes hung close along a rail
      const rz = zc + pitch / 2, rx0 = xc - 0.8, each = 0.4;
      for (let c = 0; c < 4; c++) b.box(rx0 + c * each + 0.02, 0.5, rz - 0.3, rx0 + (c + 1) * each - 0.02, 1.7, rz + 0.3, CLOTH[(n * 2 + c * 5) % 12], { faces: c === 0 ? 'NSTW' : c === 3 ? 'NSTE' : 'NST' });
      taken.push([rx0 - 0.3, rz - 0.6, rx0 + 1.9, rz + 0.6]);
    }
  });

  // --- the crowd: everywhere in the lanes, and nowhere outside the lot ---
  for (let i = 0, tries = 0; i < 46 && tries < 600; tries++) {
    const x = x0 + 0.8 + rand() * (t.w - 1.5), z = z0 + 0.8 + rand() * (t.d - 4.2);
    if (taken.some(([a, c, d, e]) => x > a && x < d && z > c && z < e)) continue;
    k.person(x, z);
    i++;
  }
  k.lights.push({ x: x0 + t.w * 0.6, z: z0 + t.d * 0.25, r: 13, color: '#ffe2ae', k: 0.8 }, { x: x0 + t.w * 0.6, z: z0 + t.d * 0.62, r: 13, color: '#ffe2ae', k: 0.8 });
  for (const xc of rows) for (let i = 0; i < 5; i++) k.glows.push({ x: xc - 0.4, y: 1.95, z: z0 + 2.2 + i * pitch + (xc === rows[0] ? 0 : 0.9), sx: 0.16, sy: 0.16, sz: 0.16, color: '#fff0c8' });
}

/** What this file builds, by the id of the thing in the plan. */
export const MODELS: Record<string, Model> = {
  'humayuns-tomb': humayunsTomb,
  'safdarjungs-tomb': safdarjungsTomb,
  'lodhi-garden': lodhiGarden,
  'khan-market': khanMarket,
  'dilli-haat': dilliHaat,
  'sarojini-nagar': sarojiniNagar,
  'lotus-temple': lotusTemple,
  'qutub-minar': qutubMinar,
};

/** A painted board that says what is sold. Small on the sheet, so that the tile's many signs fit on it. */
const board = (id: string, text: string, color: string, ink: string, real = false, hindi?: string): SignDef => {
  const aspect = Math.max(2.4, text.length * 0.62), h = hindi ? 112 : 72;
  return { id: `south-${id}`, lines: hindi ? [hindi, text] : [text], color, ink, aspect, size: [Math.round(h * aspect), h], kind: 'board', real, font: hindi ? DEVANAGARI : undefined };
};

/** The signs this file hangs. All but one say what is sold; DILLI HAAT is the bazaar's own name, and stands in Hindi over the English. */
export const SIGNS: SignDef[] = [
  board('books', 'BOOKS', '#1f5d48', '#f4f1e8'), board('cafe', 'CAFE', '#4a2f1d', '#f6e7c8'), board('kebabs', 'KEBABS', '#b3202a', '#fbe9b7'), board('flowers', 'FLOWERS', '#c2417a', '#fff6e0'),
  board('haat', 'DILLI HAAT', '#f6ecd2', '#7a2a1a', true, 'दिल्ली हाट'), board('pottery', 'POTTERY', '#8a4b2a', '#fbe9b7'), board('rugs', 'RUGS', '#2a3f6b', '#f2c14e'), board('momos', 'MOMOS', '#f2c14e', '#5e1a1a'),
  board('shoes', 'SHOES', '#1b1b20', '#f2c14e'), board('bags', 'BAGS', '#7a1f5e', '#fbe9b7'), board('jeans', 'JEANS', '#2a4f8f', '#f4f1e8'),
];

/** Lines that something moves along, as [x, y, z] points, for the check that nothing crosses a road on the level. */
export const RAILS: Record<string, [number, number, number][]> = {};

/** Whatever this file builds that is not one of the plan's things. */
export function extras(_k: Build): void {}
