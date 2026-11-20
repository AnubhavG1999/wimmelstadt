// The Neck with Moat Cailin and the crannogs, and the Twins with their bridge.
//
// The Neck is a great bog between two seas: dark wet ground, pools of black
// water, reeds, drowned trees, and the kingsroad across it on the one dry way.
// Moat Cailin guards the causeway's north end: of its twenty towers three
// stand, of black basalt green with moss, and the blocks of its curtain wall
// lie tumbled in the mud. The crannogmen live on the water east of the road,
// in reed huts on floating islands and on stilts.
//
// South of the Neck the Twins face each other across the Green Fork, two
// identical castles of grey stone with the bridge between them and the Water
// Tower astride its middle. Everything here is this tile's own drawing, from
// the books' descriptions.

import * as THREE from 'three';
import { Smoke } from '../../engine/effects';
import { interior, rng, type GeoBuilder, type QuadOpts, type V3, type WinSpec } from '../../engine/geo';
import { flat, water } from '../../engine/ground';
import { figure, tri, type Dress } from '../../engine/parts';
import { inStreet } from '../../engine/roads';
import { gable, hip, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { DARK, DOOR, LOOPS, ROOF, STONE, TIMBER, TIMBER_DARK, banner, brazier, fire, nameBoard, nameSign, rampart } from './look';
import type { Model } from './models';
import { BRIDGES, LAND_NECK, LANE, NECK, ROADS, lotOf, type Lot, type P2 } from './plan';
import { MIDDLES } from './roads';

// ---------------------------------------------------------------------------
// Colours and lights of this file's own
// ---------------------------------------------------------------------------

const BASALT = STONE.black, BASALT_SHADE = STONE.blackShade;
const MOSS = 0x4f6538, MOSS_DARK = 0x3d4f2d, LICHEN = 0x98a487;
const GREY = STONE.river, GREY_SHADE = STONE.riverShade, SOFFIT = 0x7c7567;
/** The bog: dark wet green-brown ground, its mud and moss, and its black water. */
const BOG = 0x545e3c, MUD = 0x4b4231, MOSSBED = 0x5f6d3e, BANKMUD = 0x625841, SEDGE = 0x6d7848, SEDGE_TOP = 0x8b9459;
const POOL = 0x1b2622, POOL_QUAY = 0x4a4232;
const REEDS = [0xa9ba76, 0x94a963, 0xb8b47c, 0x879b5c];
const DEADWOOD = 0x8f8c85, LOG = 0x5a4836;
const SCALES = 0x2c3a2b, SCALES_DARK = 0x1d271c;
const REEDWALL = 0xb9a975, ISLAND = 0x6a693f, ISLAND_TOP = 0x7d7548, WICKER = 0x9c8a5a;
/** A portcullis drawn up into its slot: lighter than iron looks, since thin bars come out dark. */
const GRILLE = 0xaeb1b6;

const GROUND: WinSpec = { cell: 0, storey: 1, lit: 0, kind: 1 };
/** The few lit loops of a ruin that a small garrison keeps. */
const RUIN_LOOPS: WinSpec = { cell: 2.6, storey: 4.1, lit: 0.16, kind: 4 };
/** Turret loops, four rows to the turret's top. */
const TURRET: WinSpec = { cell: 1.2, storey: 4.65, lit: 0.34, kind: 4 };
/** The Water Tower's arrow slits. */
const SLITS: WinSpec = { cell: 1.4, storey: 3.4, lit: 0.34, kind: 6 };

const NORTHMAN: Dress = { coat: 0x6b6258, legs: 0x3e3a35, hat: 0x4a4038, hatH: 0.12 };
const FREY_MAN: Dress = { coat: 0x7d8590, legs: 0x3b3b40, hat: 0x2f5fa8, hatH: 0.18 };

/** The Twins' crossing: the middle of the bridge, and the road it carries, east to west. */
const CROSSING = BRIDGES.find((c) => c.road === 'twins') ?? { x: -7, z: -26 };
const RIVER_BRIDGE = BRIDGES.find((c) => c.road === 'river' && Math.abs(c.x - CROSSING.x) < 1) ?? { x: -7, z: -14 };
/** The causeway: where the kingsroad crosses the Neck. */
const CAUSEWAY_X = ROADS.kingsroad[4][0];

// ---------------------------------------------------------------------------
// Building in a frame that is turned and leant: for the tower that leans and the blocks that lie tumbled
// ---------------------------------------------------------------------------

interface Frame { m: number[]; o: V3 }

/** A frame at `o`, turned by `yaw` about the vertical and then leant over by `lean` towards the bearing `leanTo`. */
function frame(o: V3, yaw = 0, leanTo = 0, lean = 0): Frame {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const Y = [c, 0, -s, 0, 1, 0, s, 0, c];
  // about a level axis at right angles to the way it leans
  const kx = Math.sin(leanTo), kz = -Math.cos(leanTo), ct = Math.cos(lean), st = Math.sin(lean), v = 1 - ct;
  const L = [ct + v * kx * kx, -st * kz, v * kx * kz, st * kz, ct, -st * kx, v * kz * kx, st * kx, ct + v * kz * kz];
  const m = new Array<number>(9).fill(0);
  for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) m[r * 3 + q] = L[r * 3] * Y[q] + L[r * 3 + 1] * Y[3 + q] + L[r * 3 + 2] * Y[6 + q];
  return { m, o };
}
const turn = (f: Frame, v: V3): V3 => [f.m[0] * v[0] + f.m[1] * v[1] + f.m[2] * v[2], f.m[3] * v[0] + f.m[4] * v[1] + f.m[5] * v[2], f.m[6] * v[0] + f.m[7] * v[1] + f.m[8] * v[2]];
const at = (f: Frame, v: V3): V3 => {
  const r = turn(f, v);
  return [f.o[0] + r[0], f.o[1] + r[1], f.o[2] + r[2]];
};

function fquad(b: GeoBuilder, f: Frame, p0: V3, p1: V3, p2: V3, p3: V3, n: V3, color: number, o: QuadOpts = {}): void {
  b.quad(at(f, p0), at(f, p1), at(f, p2), at(f, p3), turn(f, n), color, o);
}

/** A box in a frame, turned by `yaw` about its own middle. */
function fbox(b: GeoBuilder, f: Frame, cx: number, cy: number, cz: number, hx: number, hy: number, hz: number, yaw: number, color: number, o: { top?: number; bottom?: boolean; win?: WinSpec } = {}): void {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const P = (lx: number, ly: number, lz: number): V3 => [cx + lx * c - lz * s, cy + ly, cz + lx * s + lz * c];
  const N = (lx: number, ly: number, lz: number): V3 => [lx * c - lz * s, ly, lx * s + lz * c];
  const q = { win: o.win };
  fquad(b, f, P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz), N(0, 0, 1), color, { ...q, L: 2 * hx });
  fquad(b, f, P(hx, -hy, -hz), P(-hx, -hy, -hz), P(-hx, hy, -hz), P(hx, hy, -hz), N(0, 0, -1), color, { ...q, L: 2 * hx });
  fquad(b, f, P(hx, -hy, hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(hx, hy, hz), N(1, 0, 0), color, { ...q, L: 2 * hz });
  fquad(b, f, P(-hx, -hy, -hz), P(-hx, -hy, hz), P(-hx, hy, hz), P(-hx, hy, -hz), N(-1, 0, 0), color, { ...q, L: 2 * hz });
  fquad(b, f, P(-hx, hy, hz), P(hx, hy, hz), P(hx, hy, -hz), P(-hx, hy, -hz), N(0, 1, 0), o.top ?? color);
  if (o.bottom) fquad(b, f, P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, -hy, hz), P(-hx, -hy, hz), N(0, -1, 0), color);
}

/** A faceted shaft in a frame, standing on its own axis: as `cyl`, but leant with the frame. */
function fcyl(b: GeoBuilder, f: Frame, y0: number, y1: number, r0: number, r1: number, sides: number, color: number, o: { cap?: number | false; win?: WinSpec } = {}): void {
  const ph = Math.PI / sides, circ = Math.PI * (r0 + r1), slope = (r0 - r1) / Math.max(1e-6, y1 - y0), nl = Math.hypot(1, slope);
  for (let i = 0; i < sides; i++) {
    const a0 = ph + (i / sides) * Math.PI * 2, a1 = ph + ((i + 1) / sides) * Math.PI * 2, am = (a0 + a1) / 2;
    const b0: V3 = [Math.cos(a0) * r0, y0, Math.sin(a0) * r0], b1: V3 = [Math.cos(a1) * r0, y0, Math.sin(a1) * r0];
    const t0: V3 = [Math.cos(a0) * r1, y1, Math.sin(a0) * r1], t1: V3 = [Math.cos(a1) * r1, y1, Math.sin(a1) * r1];
    fquad(b, f, b0, b1, t1, t0, [Math.cos(am) / nl, slope / nl, Math.sin(am) / nl], color, { win: o.win, L: circ, u0: (i / sides) * circ, u1: ((i + 1) / sides) * circ });
    if (o.cap !== false) tri(b, at(f, [0, y1, 0]), at(f, t1), at(f, t0), turn(f, [0, 1, 0]), o.cap ?? color);
  }
}

/** The crown of a round tower as panels of wall, one on each side of the shaft: `hs` says how high each stands above `y`, 0 where it has fallen. */
function crown(b: GeoBuilder, f: Frame, r: number, sides: number, y: number, hs: number[], thick: number, color: number, top: number): void {
  const half = r * Math.sin(Math.PI / sides) + 0.03, ap = r * Math.cos(Math.PI / sides);
  hs.forEach((h, i) => {
    if (h <= 0) return;
    const am = Math.PI / sides + ((i + 0.5) / sides) * Math.PI * 2;
    fbox(b, f, Math.cos(am) * (ap - thick / 2), y + h / 2, Math.sin(am) * (ap - thick / 2), half, h / 2, thick / 2, am + Math.PI / 2, color, { top });
  });
}

// ---------------------------------------------------------------------------
// Gates, battlements, portcullises and arches
// ---------------------------------------------------------------------------

type Axis = 'x' | 'z';
/** A point given as along a road, up, and across it, for a road that runs along x or along z. */
const along = (axis: Axis) => (a: number, y: number, c: number): V3 => (axis === 'x' ? [a, y, c] : [c, y, a]);

/**
 * A gate block that a road runs through along `axis`, from a0 to a1: the way
 * is clear between c0 and c1 up to `spring`, and the vault over it rises
 * `rise` more in the middle. Its piers reach `leg` beyond the way on each
 * side, from `y0` up to `top`, and its top is a walk.
 */
function gateway(b: GeoBuilder, axis: Axis, a0: number, a1: number, c0: number, c1: number, leg: number, y0: number, spring: number, rise: number, top: number, color: number, shade: number, soffit = SOFFIT, n = 6): void {
  const W = along(axis), lo = Math.min(a0, a1), hi = Math.max(a0, a1);
  if (leg > 0) {
    for (const [p0, p1] of [[c0 - leg, c0], [c1, c1 + leg]]) {
      const A = W(lo, y0, p0), B = W(hi, top, p1);
      b.box(Math.min(A[0], B[0]), y0, Math.min(A[2], B[2]), Math.max(A[0], B[0]), top, Math.max(A[2], B[2]), color, { faces: 'NESW', win: top - y0 > 7.5 ? RUIN_LOOPS : undefined });
    }
  }
  const yAt = (t: number): number => spring + rise * Math.sin(Math.PI * t);
  for (let i = 0; i < n; i++) {
    const ca = c0 + ((c1 - c0) * i) / n, cb = c0 + ((c1 - c0) * (i + 1)) / n, ya = yAt(i / n), yb = yAt((i + 1) / n);
    for (const [a, s] of [[lo, -1], [hi, 1]]) b.quad(W(a, ya, ca), W(a, yb, cb), W(a, top, cb), W(a, top, ca), W(s, 0, 0), color);
    const dc = cb - ca, dy = yb - ya, l = Math.hypot(dc, dy);
    b.quad(W(lo, ya, ca), W(hi, ya, ca), W(hi, yb, cb), W(lo, yb, cb), W(0, -dc / l, dy / l), soffit);
  }
  b.quad(W(lo, top, c0 - leg), W(hi, top, c0 - leg), W(hi, top, c1 + leg), W(lo, top, c1 + leg), [0, 1, 0], shade);
}

/** Merlons along a line, standing on `y`. */
function crenels(b: GeoBuilder, a: P2, c: P2, y: number, color: number, top: number, h = 0.8, thick = 0.4, step = 2): void {
  const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz), n = Math.max(1, Math.round(len / step)), yaw = Math.atan2(dz, dx);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    b.obox(a[0] + dx * t, y + h / 2, a[1] + dz * t, (len / n) * 0.27, h / 2, thick / 2, yaw, color, { top });
  }
}

/** Merlons round the edge of a rectangle. */
function crenelRect(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, color: number, top: number, h = 0.8, step = 2): void {
  const i = 0.2;
  crenels(b, [x0 + i, z1 - i], [x1 - i, z1 - i], y, color, top, h, 0.4, step);
  crenels(b, [x0 + i, z0 + i], [x1 - i, z0 + i], y, color, top, h, 0.4, step);
  crenels(b, [x0 + i, z0 + 0.9], [x0 + i, z1 - 0.9], y, color, top, h, 0.4, step);
  crenels(b, [x1 - i, z0 + 0.9], [x1 - i, z1 - 0.9], y, color, top, h, 0.4, step);
}

/** A portcullis drawn up into its slot over a gate's arch: a dark slot in the face with the grille in front of it. `s` is the way the face looks along `axis`. */
function portcullis(b: GeoBuilder, axis: Axis, a: number, s: number, c0: number, c1: number, y0: number, y1: number): void {
  const W = along(axis), n = W(s, 0, 0);
  b.quad(W(a + s * 0.02, y0, c0), W(a + s * 0.02, y0, c1), W(a + s * 0.02, y1, c1), W(a + s * 0.02, y1, c0), n, DARK, { win: interior(0.15) });
  const bars = Math.max(3, Math.round((c1 - c0) / 0.75));
  for (let i = 0; i <= bars; i++) {
    const c = c0 + 0.1 + ((c1 - c0 - 0.2) * i) / bars;
    b.quad(W(a + s * 0.05, y0 - 0.12, c - 0.06), W(a + s * 0.05, y0 - 0.12, c + 0.06), W(a + s * 0.05, y1, c + 0.06), W(a + s * 0.05, y1, c - 0.06), n, GRILLE);
  }
  for (const y of [y0 + (y1 - y0) * 0.3, y0 + (y1 - y0) * 0.75]) b.quad(W(a + s * 0.06, y - 0.06, c0), W(a + s * 0.06, y - 0.06, c1), W(a + s * 0.06, y + 0.06, c1), W(a + s * 0.06, y + 0.06, c0), n, GRILLE);
}

/** Where water runs under a bridge: a dark half-oval on a face that looks along `axis`, and a ring of lighter stone round it. */
function archMark(b: GeoBuilder, axis: Axis, a: number, s: number, c0: number, c1: number, y0: number, rise: number, ring: number, n = 6): void {
  const W = along(axis), mid = (c0 + c1) / 2, hw = (c1 - c0) / 2, nn = W(s, 0, 0);
  const P = (i: number, w: number, r: number, off: number): V3 => {
    const t = Math.PI * (1 - i / n);
    return W(a + s * off, y0 + Math.sin(t) * r, mid + Math.cos(t) * w);
  };
  for (let i = 0; i < n; i++) {
    tri(b, W(a + s * 0.02, y0, mid), P(i, hw, rise, 0.02), P(i + 1, hw, rise, 0.02), nn, DARK);
    b.quad(P(i, hw, rise, 0.035), P(i + 1, hw, rise, 0.035), P(i + 1, hw + 0.24, rise + 0.24, 0.035), P(i, hw + 0.24, rise + 0.24, 0.035), nn, ring);
  }
}

// ---------------------------------------------------------------------------
// The bog
// ---------------------------------------------------------------------------

/** A pool: where it is, how far it reaches each way, and a seed for the wobble of its edge. */
interface Pool { x: number; z: number; rx: number; rz: number; seed: number }

/** The dozen pools of black water, west of the causeway and east of it. */
const POOLS: Pool[] = [
  { x: -11.0, z: -40.8, rx: 2.1, rz: 1.5, seed: 11 },
  // the Green Fork rises out of this one
  { x: -7.0, z: -39.7, rx: 1.7, rz: 1.75, seed: 12 },
  { x: -3.4, z: -42.3, rx: 2.3, rz: 1.1, seed: 13 },
  { x: 0.6, z: -39.8, rx: 1.5, rz: 1.3, seed: 14 },
  { x: 3.9, z: -42.6, rx: 1.6, rz: 1.0, seed: 15 },
  { x: 5.5, z: -39.4, rx: 1.15, rz: 0.85, seed: 16 },
  // the lizard-lion's, by the causeway
  { x: 13.35, z: -42.85, rx: 1.5, rz: 0.85, seed: 17 },
  { x: -7.6, z: -43.0, rx: 1.4, rz: 0.7, seed: 18 },
  { x: 32.5, z: -43.1, rx: 1.8, rz: 0.72, seed: 19 },
  { x: 39.3, z: -41.6, rx: 1.8, rz: 1.4, seed: 20 },
  { x: 38.8, z: -38.6, rx: 1.3, rz: 0.75, seed: 21 },
  { x: -10.6, z: -38.4, rx: 1.0, rz: 0.6, seed: 22 },
];

/** The crannogmen's water, on the crannogs' lot. */
function crannogPool(l: Lot): P2[] {
  const X = (t: number) => l.x0 + (l.x1 - l.x0) * t, z1 = Math.min(l.z1, NECK.z1) - 0.2;
  return [[X(0.06), -39.0], [X(0.15), -41.2], [X(0.37), l.z0 + 0.2], [X(0.7), l.z0 + 0.4], [X(0.95), -40.8], [X(0.975), -39.2], [X(0.89), z1 + 0.05], [X(0.57), z1], [X(0.3), z1 - 0.1], [X(0.11), -38.1]];
}

function poolShape(p: Pool): P2[] {
  const r = rng(p.seed * 7919), n = 11, ph = r() * Math.PI;
  return Array.from({ length: n }, (_, i): P2 => {
    const a = ph + (i / n) * Math.PI * 2, f = 0.84 + r() * 0.26;
    return [p.x + Math.cos(a) * p.rx * f, p.z + Math.sin(a) * p.rz * f];
  });
}

const POOL_DROP = 0.55, POOL_Y = -POOL_DROP;

/** Places in the Neck where nothing small is scattered: the causeway, the towers, the castles, the crannogs, the board. */
const KEEP_CLEAR: [number, number, number, number][] = [
  [CAUSEWAY_X - 5.7, -44, CAUSEWAY_X + 5.7, -37.5],
  [8.5, -47, 12.6, -43.2], [7.6, -38.6, 12.2, -34], [3.8, -38.4, 12.2, -30], [27.6, -42.3, 36.3, -36], [26.8, -45, 31.2, -41.3],
  [8.2, -43.0, 11.0, -40.4], [12.1, -41.6, 14.4, -38.9], [6.2, -43.8, 8.2, -42.0],
];

function inPool(x: number, z: number, grow = 0): boolean {
  return POOLS.some((p) => ((x - p.x) / (p.rx * 1.12 + grow)) ** 2 + ((z - p.z) / (p.rz * 1.12 + grow)) ** 2 < 1);
}

function free(x: number, z: number, r: number): boolean {
  if (x < NECK.x0 + r + 0.2 || x > NECK.x1 - r - 0.2 || z < NECK.z0 + r + 0.2 || z > NECK.z1 - r - 0.1) return false;
  if (KEEP_CLEAR.some(([x0, z0, x1, z1]) => x > x0 - r && x < x1 + r && z > z0 - r && z < z1 + r)) return false;
  return !inPool(x, z, r);
}

/** A clump of reeds and rushes: thin pale blades, each a flat triangle seen from both sides. */
function reeds(b: GeoBuilder, x: number, z: number, y: number, r: () => number, n = 5, tall = 1): void {
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = r() * 0.35, bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d;
    const h = (0.9 + r() * 0.9) * tall, lean = 0.15 + r() * 0.35, la = r() * Math.PI * 2;
    const px = -Math.sin(la) * 0.07, pz = Math.cos(la) * 0.07;
    const L: V3 = [bx - px, y, bz - pz], R: V3 = [bx + px, y, bz + pz], T: V3 = [bx + Math.cos(la) * lean, y + h, bz + Math.sin(la) * lean];
    const ux = R[0] - L[0], uz = R[2] - L[2], vx = T[0] - L[0], vy = T[1] - L[1], vz = T[2] - L[2];
    const nx = -uz * vy, ny = uz * vx - ux * vz, nz = ux * vy, nl = Math.hypot(nx, ny, nz) || 1;
    const color = REEDS[Math.floor(r() * REEDS.length)];
    tri(b, L, R, T, [nx / nl, ny / nl, nz / nl], color);
    tri(b, L, R, T, [-nx / nl, -ny / nl, -nz / nl], color);
    // now and then a brown head, as a bulrush has
    if (r() < 0.18) b.box(T[0] - 0.06, T[1] - 0.42, T[2] - 0.06, T[0] + 0.06, T[1] - 0.1, T[2] + 0.06, 0x5b4030);
  }
}

/** A drowned tree: a bare grey trunk and two or three dead limbs. */
function drownedTree(b: GeoBuilder, x: number, z: number, y: number, h: number, seed: number): void {
  const r = rng(seed);
  const lean = (r() - 0.5) * 0.5, la = r() * Math.PI * 2, tx = x + Math.cos(la) * lean, tz = z + Math.sin(la) * lean;
  b.beam([x, y, z], [tx, y + h, tz], 0.2, 0.07, DEADWOOD);
  const limbs = 2 + Math.floor(r() * 2);
  for (let i = 0; i < limbs; i++) {
    const t = 0.45 + r() * 0.4, a = r() * Math.PI * 2, len = 0.7 + r() * 0.9;
    const p: V3 = [x + (tx - x) * t, y + h * t, z + (tz - z) * t];
    b.beam(p, [p[0] + Math.cos(a) * len, p[1] + 0.4 + r() * 0.6, p[2] + Math.sin(a) * len], 0.07, 0.03, DEADWOOD);
  }
}

/** A lizard-lion lying in a pool: a long low dark back, a snout, a tail, and eyes, most of it under the water at `y`. */
function lizardLion(b: GeoBuilder, x: number, z: number, y: number, yaw: number, s: number): void {
  const f = frame([x, y, z], yaw);
  fbox(b, f, 0, -0.06 * s, 0, 0.62 * s, 0.17 * s, 0.24 * s, 0, SCALES, { top: SCALES_DARK });
  // the snout ahead, long and flat
  fbox(b, f, 0.95 * s, -0.04 * s, 0, 0.38 * s, 0.09 * s, 0.13 * s, 0, SCALES, { top: SCALES_DARK });
  // the eyes, a little raised
  for (const e of [-1, 1]) fbox(b, f, 0.63 * s, 0.08 * s, e * 0.1 * s, 0.06 * s, 0.05 * s, 0.05 * s, 0, 0x3d4a2f, { top: 0xb7a640 });
  // the ridges down its back
  for (let i = 0; i < 4; i++) fbox(b, f, (0.45 - i * 0.32) * s, 0.13 * s, 0, 0.07 * s, 0.05 * s, 0.05 * s, 0, SCALES_DARK);
  // the tail, sweeping off to one side and sinking
  const tail: V3[] = [[-0.6 * s, -0.02 * s, 0], [-1.05 * s, -0.04 * s, 0.12 * s], [-1.5 * s, -0.08 * s, 0.32 * s], [-1.9 * s, -0.14 * s, 0.38 * s]];
  b.sweep(tail.map((p) => at(f, p)), [0.16 * s, 0.11 * s, 0.07 * s, 0.03 * s], SCALES);
}

function bog(k: Build): void {
  const b = k.b, r = rng(4242);
  const pools = POOLS.map(poolShape), cran = crannogPool(lotOf('crannogs'));
  flat(k.street, LAND_NECK, 0, BOG, { win: GROUND, holes: [...pools, cran] });
  for (const p of [...pools, cran]) water(k, p, { color: POOL, quay: POOL_QUAY, drop: POOL_DROP });

  // patches of moss and of mud, a hair above the bog, nowhere near the water or the road
  for (let tries = 0, laid = 0; tries < 200 && laid < 16; tries++) {
    const x = NECK.x0 + r() * (NECK.x1 - NECK.x0), z = NECK.z0 + r() * (NECK.z1 - NECK.z0), rx = 0.9 + r() * 1.6, rz = 0.5 + r() * 0.8;
    if (!free(x, z, Math.max(rx, rz) + 0.2)) continue;
    const n = 8, ph = r() * 6;
    const shape = Array.from({ length: n }, (_, i): P2 => {
      const a = ph + (i / n) * Math.PI * 2, f = 0.8 + r() * 0.3;
      return [x + Math.cos(a) * rx * f, z + Math.sin(a) * rz * f];
    });
    flat(k.street, shape, 0.035, laid % 3 === 0 ? MUD : MOSSBED, { win: GROUND });
    laid++;
  }

  // reeds round the pools, half in the water and half out
  POOLS.forEach((p, i) => {
    const n = 3 + (i % 3);
    for (let j = 0; j < n; j++) {
      const a = r() * Math.PI * 2, wet = r() < 0.5, f = wet ? 0.72 : 1.12;
      const x = p.x + Math.cos(a) * p.rx * f, z = p.z + Math.sin(a) * p.rz * f;
      if (!wet && KEEP_CLEAR.some(([x0, z0, x1, z1]) => x > x0 - 0.3 && x < x1 + 0.3 && z > z0 - 0.3 && z < z1 + 0.3)) continue;
      reeds(b, x, z, wet ? POOL_Y - 0.05 : 0, r, 4 + Math.floor(r() * 3));
    }
  });
  // and in clumps out on the bog
  for (let tries = 0, laid = 0; tries < 160 && laid < 14; tries++) {
    const x = NECK.x0 + r() * (NECK.x1 - NECK.x0), z = NECK.z0 + r() * (NECK.z1 - NECK.z0);
    if (!free(x, z, 0.5)) continue;
    reeds(b, x, z, 0, r, 4 + Math.floor(r() * 3), 0.85);
    laid++;
  }
  // tussocks of sedge
  for (let tries = 0, laid = 0; tries < 160 && laid < 15; tries++) {
    const x = NECK.x0 + r() * (NECK.x1 - NECK.x0), z = NECK.z0 + r() * (NECK.z1 - NECK.z0), s = 0.35 + r() * 0.3;
    if (!free(x, z, s + 0.2)) continue;
    b.cyl(x, z, -0.05, 0.22 + s * 0.4, s, s * 0.45, 5, SEDGE, { cap: SEDGE_TOP, phase: r() * 3 });
    laid++;
  }
  // drowned trees, standing in the pools and at their edges
  const trees: [number, number, number, number][] = [
    [-11.6, -41.2, POOL_Y, 4.2], [-2.6, -42.5, POOL_Y, 3.4], [1.0, -39.5, POOL_Y, 3.9], [4.3, -42.9, POOL_Y, 2.9],
    [39.8, -41.9, POOL_Y, 4.4], [38.3, -38.4, POOL_Y, 3.1], [-5.0, -40.9, 0, 3.6], [34.6, -42.9, 0, 3.3], [-13.0, -43.2, 0, 2.8],
  ];
  trees.forEach(([x, z, y, h], i) => drownedTree(b, x, z, y, h, 700 + i));

  // a lizard-lion in the pool beside the causeway, and a smaller one further off
  lizardLion(b, 13.5, -42.85, POOL_Y, 0.25, 0.85);
  lizardLion(b, 32.9, -43.15, POOL_Y, 2.9, 0.75);

  causeway(k);
}

/** How far a place is from the middle of the kingsroad, as the road is laid with its bends rounded. */
function fromKingsroad(x: number, z: number): number {
  const path = MIDDLES.kingsroad, p = new THREE.Vector3();
  let best = 1e9;
  for (let s = 0; s <= path.length; s += 0.4) {
    path.at(s, p);
    if (Math.abs(p.z - z) < 8) best = Math.min(best, Math.hypot(p.x - x, p.z - z));
  }
  return best;
}

/** The one dry way: firm ground beside the kingsroad, edged with half-sunk logs and a few blocks of basalt. */
function causeway(k: Build): void {
  const b = k.b, gate = lotOf('mc-gate'), z0 = NECK.z0 + 0.15, z1 = gate.z0 - 0.2, r = rng(515);
  for (const side of [-1, 1]) {
    // how far out the road's edge lies here: the bend at the Neck's north edge pulls it west
    const out = (z: number, w: number): number => {
      let d = LANE + 0.2 + w;
      while (d < LANE + 2.4 && fromKingsroad(CAUSEWAY_X + side * d, z) < LANE + 0.15 + w) d += 0.1;
      return CAUSEWAY_X + side * d;
    };
    // the firm ground, a little paler than the bog
    const xa = out(z0, 0.05), xb = out(z1, 0.05), w = 1.1;
    flat(k.street, [[xa, z0], [xa + side * w, z0], [xb + side * w, z1], [xb, z1]], 0.035, BANKMUD, { win: GROUND });
    // the logs, end to end along the edge
    const cuts = [z0, z0 + (z1 - z0) * 0.48 + (r() - 0.5) * 0.3, z1];
    for (let i = 0; i + 1 < cuts.length; i++) {
      const za = cuts[i] + 0.08, zb = cuts[i + 1] - 0.08, xl = out(za, 0.22), xm = out(zb, 0.22);
      b.beam([xl, 0.04, za], [xm + side * 0.05, 0.06, zb], 0.22, 0.2, LOG);
      // its cut ends, paler
      b.box(xl - 0.15, -0.16, za - 0.03, xl + 0.15, 0.22, za + 0.02, 0x8a7356, { faces: 'NSEW' });
    }
    // basalt blocks, half sunk, outside the logs
    for (const t of [0.22, 0.78]) {
      const z = z0 + (z1 - z0) * t, x = out(z, 0.2) + side * 0.75, f = frame([x, 0.12, z], r() * 2, r() * 6, 0.18 + r() * 0.2);
      fbox(b, f, 0, 0, 0, 0.42, 0.34, 0.36, 0, BASALT, { top: MOSS });
    }
  }
}

// ---------------------------------------------------------------------------
// Moat Cailin
// ---------------------------------------------------------------------------

/** A tumbled block of the old curtain wall: as big as a cottage, half sunk in the mud and leaning, green on top. */
function tumbled(b: GeoBuilder, x: number, z: number, w: number, h: number, d: number, yaw: number, lean: number, leanTo: number): void {
  const f = frame([x, h * 0.12, z], yaw, leanTo, lean);
  fbox(b, f, 0, 0, 0, w / 2, h / 2, d / 2, 0, BASALT, { top: MOSS });
  // a seam of moss down one face, and lichen on another
  fquad(b, f, [-w / 2 + 0.1, -h / 2, d / 2 + 0.02], [-w / 2 + 0.55, -h / 2, d / 2 + 0.02], [-w / 2 + 0.4, h / 2, d / 2 + 0.02], [-w / 2 + 0.1, h / 2, d / 2 + 0.02], [0, 0, 1], MOSS_DARK);
  fquad(b, f, [w / 2 + 0.02, h * 0.05, -d / 4], [w / 2 + 0.02, h * 0.05, d / 5], [w / 2 + 0.02, h * 0.38, d / 5], [w / 2 + 0.02, h * 0.38, -d / 4], [1, 0, 0], LICHEN);
}

/** The Children's Tower: tall and slender, its crown of merlons half fallen. */
const childrensTower: Model = (k, l) => {
  const b = k.b, r = 1.4, cx = l.x0 + 1.55, cz = (l.z0 + l.z1) / 2;
  if (inStreet(k, cx - r, cz - r, cx + r, cz + r)) console.warn('Westeros: the Children\'s Tower stands in the road.');
  const f = frame([cx, 0, cz]);
  // moss at its foot, then the shaft, tapering a little, three storeys of it whole
  fcyl(b, f, -0.4, 1.1, r + 0.05, r + 0.03, 8, MOSS_DARK, { cap: false });
  fcyl(b, f, -0.4, 12.3, r, 1.22, 8, BASALT, { cap: BASALT_SHADE, win: RUIN_LOOPS });
  // the top storey: whole to the north-west, broken to the south-east, where the view sees the break
  const hs: number[] = [], rr = rng(31);
  for (let i = 0; i < 8; i++) {
    const am = Math.PI / 8 + ((i + 0.5) / 8) * Math.PI * 2, broken = Math.cos(am - 0.65) > 0.15;
    hs.push(broken ? 0.4 + rr() * 2.4 : 4.5);
  }
  crown(b, f, 1.22, 8, 12.3, hs, 0.5, BASALT, MOSS);
  // its band and merlons, only where the wall still stands
  const band = hs.map((h) => (h > 4 ? 0.55 : 0));
  crown(b, f, 1.42, 8, 16.8, band, 0.7, BASALT, BASALT_SHADE);
  crown(b, f, 1.42, 8, 17.35, band.map((h, i) => (h > 0 && i % 2 === 0 ? 0.62 : 0)), 0.45, BASALT, MOSS);
  // its door, low on the side to the causeway
  const da = 0.25;
  fbox(b, f, Math.cos(da) * 1.3, 0.85, Math.sin(da) * 1.3, 0.12, 0.85, 0.36, da, DARK, { win: interior(0.45) });
  fire(k, cx + Math.cos(da) * 1.55, 2.05, cz + Math.sin(da) * 1.55 - 0.45, 0.2, 7);
  // fallen stones of its crown, at its foot
  tumbled(b, cx + 1.7, cz + 1.6, 0.9, 0.6, 0.75, 0.6, 0.35, 0.8);
  tumbled(b, cx - 0.4, cz + 2.0, 0.7, 0.5, 0.6, 1.4, 0.4, 2.2);
  k.lights.push({ x: cx + 1.5, z: cz + 1.6, r: 9, color: '#ffcf8a', k: 0.45 });
};

/** The Gatehouse Tower: squat and wide, the only one still whole, with the kingsroad through it and a tree growing out of its north face. */
const gatehouseTower: Model = (k, l) => {
  const b = k.b, x = CAUSEWAY_X, c0 = x - LANE - 0.5, c1 = x + LANE + 0.5, leg = 1.9, top = 8.2;
  gateway(b, 'z', l.z0, l.z1, c0, c1, leg, -0.5, 6, 0.9, top, BASALT, MOSS, 0x2d2a2f);
  crenelRect(b, c0 - leg, l.z0, c1 + leg, l.z1, top, BASALT, MOSS, 0.8, 2.1);
  // a ring of dressed stone round each arch, a little proud
  for (const [zf, s] of [[l.z0, -1], [l.z1, 1]] as const) {
    for (let i = 0; i < 6; i++) {
      const yA = 6 + 0.9 * Math.sin((Math.PI * i) / 6), yB = 6 + 0.9 * Math.sin((Math.PI * (i + 1)) / 6);
      const xa = c0 + ((c1 - c0) * i) / 6, xb = c0 + ((c1 - c0) * (i + 1)) / 6;
      b.quad([xa, yA, zf + s * 0.03], [xb, yB, zf + s * 0.03], [xb, yB + 0.45, zf + s * 0.03], [xa, yA + 0.45, zf + s * 0.03], [0, 0, s], BASALT_SHADE);
    }
    // patches of pale lichen on the piers
    for (const px of [c0 - 1.3, c1 + 0.6]) b.quad([px, 1.2, zf + s * 0.03], [px + 0.7, 1.2, zf + s * 0.03], [px + 0.7, 2.3, zf + s * 0.03], [px, 2.3, zf + s * 0.03], [0, 0, s], LICHEN);
    for (const px of [c0 - 1.6, c1 + 1.0]) b.quad([px, 0, zf + s * 0.035], [px + 0.9, 0, zf + s * 0.035], [px + 0.9, 0.9, zf + s * 0.035], [px, 0.9, zf + s * 0.035], [0, 0, s], MOSS_DARK);
    // torches either side of the way
    fire(k, c0 - 0.15, 4.6, zf + s * 0.25, 0.24, 7);
  }
  // the tree that grows out of its north face
  const tx = x + 2.6;
  b.beam([tx, 5.0, l.z0 + 0.1], [tx + 0.5, 6.3, l.z0 - 0.9], 0.16, 0.1, TIMBER);
  k.tree(tx + 0.6, l.z0 - 1.0, 0.45, false, 6.1);
  // two northmen keep the gate, out of the way
  figure(b, c1 + leg + 0.5, (l.z0 + l.z1) / 2 - 0.5, 0, NORTHMAN);
  figure(b, c0 - leg - 0.5, l.z1 - 0.4, 0, NORTHMAN);
};

/** The Drunkard's Tower: it leans, as if about to fall into the bog. */
const drunkardsTower: Model = (k, l) => {
  const b = k.b, r = 1.25, bx = (l.x0 + l.x1) / 2 + 0.45, bz = l.z1 - 1.3;
  // it leans north-north-east, towards the bog, and its foot is sunk in the mud
  const f = frame([bx, -0.6, bz], 0.4, Math.atan2(-1, 0.15), 0.096);
  fcyl(b, f, 0, 1.4, r + 0.06, r + 0.04, 8, MOSS_DARK, { cap: false });
  fcyl(b, f, 0, 12.6, r, 1.15, 8, BASALT, { cap: BASALT_SHADE, win: RUIN_LOOPS });
  crown(b, f, 1.3, 8, 12.6, [0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6], 0.55, BASALT, BASALT_SHADE);
  // two of its merlons are gone
  crown(b, f, 1.3, 8, 13.2, [0.65, 0, 0.65, 0, 0, 0, 0.65, 0], 0.42, BASALT, MOSS);
  // a crack down the side that faces the view
  const ap0 = r * Math.cos(Math.PI / 8) + 0.025, ap1 = 1.15 * Math.cos(Math.PI / 8) + 0.025, am = Math.PI / 8 + (1.5 / 8) * Math.PI * 2;
  const P = (y: number, u: number): V3 => {
    const ap = ap0 + ((ap1 - ap0) * y) / 12.6;
    return [Math.cos(am) * ap - Math.sin(am) * u, y, Math.sin(am) * ap + Math.cos(am) * u];
  };
  const crack: [number, number][] = [[2.2, 0.05], [4.4, -0.12], [6.6, 0.08], [9.2, -0.05], [11.4, 0.1]];
  for (let i = 0; i + 1 < crack.length; i++) {
    const [ya, ua] = crack[i], [yb, ub] = crack[i + 1];
    fquad(b, f, P(ya, ua - 0.06), P(ya, ua + 0.06), P(yb, ub + 0.06), P(yb, ub - 0.06), [Math.cos(am), 0, Math.sin(am)], DARK);
  }
  // what has fallen from it lies to the north, in the mud
  tumbled(b, bx - 1.5, l.z0 + 0.4, 1.0, 0.6, 0.8, 0.3, 0.4, 3.6);
  tumbled(b, bx + 1.1, l.z0 - 0.5, 0.8, 0.5, 0.7, 1.1, 0.3, 4.4);
};

/** The blocks of the old curtain wall between the three towers. */
function rubble(b: GeoBuilder): void {
  const blocks: [number, number, number, number, number, number, number, number][] = [
    [9.6, -41.7, 2.4, 1.5, 1.7, 0.3, 0.25, 1.0],
    [13.2, -40.3, 1.8, 1.1, 2.4, 0.1, 0.2, 5.6],
    [7.2, -42.9, 1.6, 1.1, 1.2, 0.9, 0.22, 2.4],
    [27.4, -43.3, 1.4, 0.9, 1.1, -0.3, 0.3, 4.0],
    [-1.3, -43.3, 1.3, 0.8, 1.0, 0.5, 0.26, 2.0],
  ];
  for (const [x, z, w, h, d, yaw, lean, to] of blocks) tumbled(b, x, z, w, h, d, yaw, lean, to);
}

// ---------------------------------------------------------------------------
// The crannogs
// ---------------------------------------------------------------------------

/** A round hut of reeds with a cone of thatch, its floor at `y`. */
function hut(b: GeoBuilder, x: number, z: number, y: number, r: number, door: number): void {
  b.cyl(x, z, y, y + 1.1, r, r * 0.96, 8, REEDWALL, { cap: false });
  b.cyl(x, z, y + 1.08, y + 1.4, r + 0.35, r * 0.8, 8, ROOF.thatch, { cap: false });
  b.cyl(x, z, y + 1.4, y + 2.75, r * 0.8, 0.05, 8, ROOF.thatch, { cap: false });
  // the low door, lit from inside
  b.obox(x + Math.cos(door) * (r - 0.02), y + 0.5, z + Math.sin(door) * (r - 0.02), 0.06, 0.48, 0.27, door, DOOR, { win: interior(0.6) });
}

/** A punt: a flat boat at the water's level. */
function punt(b: GeoBuilder, x: number, z: number, yaw: number): void {
  b.obox(x, POOL_Y + 0.08, z, 0.9, 0.12, 0.3, yaw, TIMBER, { top: TIMBER_DARK });
}

const crannogs: Model = (k, l) => {
  const b = k.b, r = rng(901);
  // two huts on floating islands of reed and earth, two on stilts
  const islands: [number, number, number, number][] = [[l.x0 + 2.0, -40.3, 1.3, 0.85], [l.x0 + 6.6, -39.2, 1.05, 0.72]];
  for (const [x, z, R, hr] of islands) {
    b.cyl(x, z, POOL_Y - 0.25, POOL_Y + 0.13, R, R * 0.94, 9, ISLAND, { cap: ISLAND_TOP });
    hut(b, x, z, POOL_Y + 0.13, hr, 0.9);
    reeds(b, x - R * 0.75, z + R * 0.3, POOL_Y + 0.1, r, 4);
  }
  const decks: [number, number, number, number][] = [[l.x0 + 4.5, -40.6, 0.95, 0.85], [l.x0 + 3.6, -38.4, 0.8, 0.7]];
  const deckY = 0.45;
  for (const [x, z, hw, hr] of decks) {
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.beam([x + sx * (hw - 0.12), POOL_Y - 0.4, z + sz * (hw - 0.12)], [x + sx * (hw - 0.12), deckY - 0.05, z + sz * (hw - 0.12)], 0.07, 0.07, TIMBER_DARK);
    b.box(x - hw, deckY - 0.1, z - hw, x + hw, deckY, z + hw, TIMBER, { faces: 'NESWTB' });
    hut(b, x, z, deckY, hr, 0.8);
  }
  // plank walks between them
  const isl = islands.map(([x, z]) => [x, z] as P2), dk = decks.map(([x, z]) => [x, z] as P2);
  const walk = (a: P2, ay: number, ar: number, c: P2, cy: number, cr: number): void => {
    const dx = c[0] - a[0], dz = c[1] - a[1], d = Math.hypot(dx, dz), ux = dx / d, uz = dz / d;
    slab(b, [a[0] + ux * ar, ay, a[1] + uz * ar], [c[0] - ux * cr, cy, c[1] - uz * cr], 0.28, 0.07, 0x7a6248, { under: TIMBER_DARK });
  };
  walk(isl[0], POOL_Y + 0.16, 1.2, dk[0], deckY, 0.9);
  walk(dk[0], deckY, 0.9, isl[1], POOL_Y + 0.16, 0.95);
  walk(dk[1], deckY, 0.75, isl[0], POOL_Y + 0.16, 1.2);
  // punts, one with its crannogman poling it
  const px = l.x0 + 1.6, pz = -38.5;
  punt(b, px, pz, 0.35);
  punt(b, l.x0 + 6.5, -41.15, -0.3);
  k.person(px, pz, POOL_Y + 0.2);
  b.beam([px + 0.25, POOL_Y - 0.4, pz + 0.3], [px - 0.3, 2.4, pz - 0.3], 0.035, 0.03, 0x9c8a66);
  // fish traps of wicker, on stakes in the water
  for (const [x, z] of [[l.x0 + 3.0, -41.5], [l.x0 + 5.6, -38.4], [l.x0 + 7.4, -40.6]]) {
    b.cyl(x, z, POOL_Y - 0.2, POOL_Y + 0.5, 0.22, 0.1, 6, WICKER, { cap: false });
    b.beam([x + 0.25, POOL_Y - 0.3, z], [x + 0.25, POOL_Y + 0.8, z], 0.03, 0.03, TIMBER_DARK);
  }
  // a rack of fish drying on the first island
  const [ix, iz] = isl[0];
  const rz = iz - 0.98;
  for (const s of [-1, 1]) b.beam([ix + 0.6 * s, POOL_Y + 0.13, rz], [ix + 0.6 * s, POOL_Y + 1.05, rz], 0.04, 0.04, TIMBER_DARK);
  b.beam([ix - 0.65, POOL_Y + 1.0, rz], [ix + 0.65, POOL_Y + 1.0, rz], 0.03, 0.03, TIMBER_DARK);
  for (const t of [-0.36, -0.12, 0.12, 0.36]) b.box(ix + t - 0.05, POOL_Y + 0.62, rz - 0.03, ix + t + 0.05, POOL_Y + 0.98, rz + 0.03, 0xa9b0b2);
  // the crannogmen at home
  k.person(dk[0][0] + 0.72, dk[0][1] + 0.72, deckY);
  k.person(isl[1][0] - 0.7, isl[1][1] + 0.55, POOL_Y + 0.13);
  k.person(dk[1][0] - 0.6, dk[1][1] + 0.6, deckY);
  k.lights.push({ x: (l.x0 + l.x1) / 2, z: -39.6, r: 9, color: '#ffcf8a', k: 0.5 });
  // smoke from the roof of the hut on the bigger deck
  const smoke = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 30);
  k.group.add(smoke.mesh);
  const from = new THREE.Vector3(), drift = new THREE.Vector3(0.35, 0.3, 0.12), sr = rng(77);
  let due = 0;
  k.each((dt) => {
    due -= dt;
    if (due <= 0) {
      due = 0.35 + sr() * 0.3;
      smoke.puff(from.set(dk[0][0] + (sr() - 0.5) * 0.2, deckY + 2.8, dk[0][1] + (sr() - 0.5) * 0.2), drift, 0.4, 0.78);
    }
    smoke.update(dt);
  });
};

// ---------------------------------------------------------------------------
// The Twins
// ---------------------------------------------------------------------------

/**
 * One of the two castles, the same on each bank. `s` is 1 for the eastern
 * and -1 for the western: everything is placed by `u`, how far it is from the
 * middle of the bridge. The keep stands north of the road, by the river, with
 * a turret at each corner; a hall stands beside it; the road comes in through
 * a barbican and a gatehouse with its portcullis, runs between two curtain
 * walls, and goes out onto the bridge through the castle's inner gate.
 */
function twin(k: Build, l: Lot, gate: Lot, s: 1 | -1): void {
  const b = k.b, bx = CROSSING.x, zr = CROSSING.z;
  const X = (u: number): number => bx + s * u;
  const xs = (u0: number, u1: number): [number, number] => (s > 0 ? [X(u0), X(u1)] : [X(u1), X(u0)]);
  const uIn = s > 0 ? l.x0 - bx : bx - l.x1, uKeep = s > 0 ? l.x1 - bx : bx - l.x0, uOut = s > 0 ? gate.x1 - bx : bx - gate.x0;
  const c0 = zr - LANE - 0.5, c1 = zr + LANE + 0.5, leg = 0.9, N0 = c0 - leg, S1 = c1 + leg, Y0 = -1.6;

  // the keep, square and plain, with a turret at each corner, a walk round its top and a roof of slate within it
  const [kx0, kx1] = xs(uIn + 0.7, uIn + 4.3), kz0 = l.z1 - 5.2, kz1 = l.z1 - 1.2;
  b.box(kx0, Y0, kz0, kx1, 16.8, kz1, GREY, { win: LOOPS, faces: 'NESW', seed: 3 + s });
  b.box(kx0 - 0.15, 16.8, kz0 - 0.15, kx1 + 0.15, 17.6, kz1 + 0.15, GREY, { top: GREY_SHADE, faces: 'NESWTB' });
  crenels(b, [kx0 + 0.9, kz1], [kx1 - 0.9, kz1], 17.6, GREY, GREY_SHADE, 0.8, 0.4, 1.7);
  crenels(b, [kx0 + 0.9, kz0], [kx1 - 0.9, kz0], 17.6, GREY, GREY_SHADE, 0.8, 0.4, 1.7);
  crenels(b, [kx0, kz0 + 0.9], [kx0, kz1 - 0.9], 17.6, GREY, GREY_SHADE, 0.8, 0.4, 1.7);
  crenels(b, [kx1, kz0 + 0.9], [kx1, kz1 - 0.9], 17.6, GREY, GREY_SHADE, 0.8, 0.4, 1.7);
  hip(b, kx0 + 0.5, kz0 + 0.5, kx1 - 0.5, kz1 - 0.5, 17.65, 1.3, ROOF.slate, 0);
  for (const tx of [kx0, kx1]) {
    for (const tz of [kz0, kz1]) {
      b.box(tx - 0.62, Y0, tz - 0.62, tx + 0.62, 18.6, tz + 0.62, GREY, { win: TURRET, faces: 'NESW', seed: tx + tz });
      b.box(tx - 0.78, 18.6, tz - 0.78, tx + 0.78, 19.2, tz + 0.78, GREY, { top: GREY_SHADE, faces: 'NESWTB' });
      for (const [mx, mz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const ex = tx + mx * 0.78, ez = tz + mz * 0.78;
        b.box(Math.min(ex, ex - mx * 0.36), 19.2, Math.min(ez, ez - mz * 0.36), Math.max(ex, ex - mx * 0.36), 20, Math.max(ez, ez - mz * 0.36), GREY, { top: GREY_SHADE });
      }
    }
  }
  banner(b, (kx0 + kx1) / 2, (kz0 + kz1) / 2, 18.85, 'frey', 3.2);
  // a fire on the walk, where the watch stands
  fire(k, s > 0 ? kx1 - 0.9 : kx0 + 0.9, 18.0, kz1 - 0.1, 0.2, 0);

  // the hall beside it, under a pitched roof
  const [hx0, hx1] = xs(uIn + 4.3, uKeep - 0.3), hz0 = l.z1 - 3.6, hz1 = l.z1 - 0.6;
  b.box(hx0, -0.3, hz0, hx1, 8.4, hz1, GREY, { win: LOOPS, faces: 'NESW', seed: 7 + s });
  gable(b, hx0, hz0, hx1, hz1, 8.4, 2.0, ROOF.slate, GREY, 'x', 0.3);

  // the inner gate, onto the bridge
  const [ia, ib] = xs(uIn, uIn + 1.2);
  gateway(b, 'x', ia, ib, c0, c1, leg, Y0, 6, 0.8, 8.2, GREY, GREY_SHADE);
  for (const xe of [X(uIn) + s * 0.2, X(uIn + 1.2) - s * 0.2]) crenels(b, [xe, N0 + 0.2], [xe, S1 - 0.2], 8.2, GREY, GREY_SHADE, 0.8, 0.4, 1.9);

  // the gatehouse, with its portcullis drawn up, and the barbican before it
  const [ga, gb] = xs(uOut - 4.6, uOut - 1.0);
  gateway(b, 'x', ga, gb, c0, c1, leg, -0.3, 6, 0.8, 8.2, GREY, GREY_SHADE);
  crenelRect(b, ga, N0, gb, S1, 8.2, GREY, GREY_SHADE, 0.8, 1.9);
  portcullis(b, 'x', X(uOut - 1.0), s, c0 + 0.6, c1 - 0.6, 6.95, 7.85);
  const [ba, bb] = xs(uOut - 1.0, uOut + 0.4), [la, lb] = xs(uOut, uOut + 0.4);
  for (const [z0, z1] of [[N0, c0], [c1, S1]]) {
    b.box(ba, -0.3, z0, bb, 7.0, z1, GREY, { top: GREY_SHADE, faces: 'NESWT' });
  }
  gateway(b, 'x', la, lb, c0, c1, 0, 0, 6, 0.35, 7.0, GREY, GREY_SHADE);
  crenels(b, [X(uOut + 0.2), N0 + 0.2], [X(uOut + 0.2), S1 - 0.2], 7.0, GREY, GREY_SHADE, 0.75, 0.4, 1.9);
  for (const z of [N0 + 0.2, S1 - 0.2]) crenels(b, [X(uOut - 0.8), z], [X(uOut - 0.1), z], 7.0, GREY, GREY_SHADE, 0.75, 0.4, 1.9);
  // torches at the outer gate
  for (const z of [c0 - 0.45, c1 + 0.45]) fire(k, X(uOut + 0.6), 5.0, z, 0.24, 7);

  // the curtain walls on each side of the road between the gates
  for (const z of [(N0 + c0) / 2, (c1 + S1) / 2]) rampart(b, [X(uIn + 1.2), z], [X(uOut - 4.6), z], 7.4, GREY, { thick: 0.9, shade: GREY_SHADE, win: undefined });
  k.lights.push({ x: X(uOut - 2.8), z: zr, r: 11, color: '#ffcf8a', k: 0.45 });
}

/** The toll bar at the eastern gate: the pole raised on its post, and the toll keeper beside it with his box. */
function tollBar(k: Build, gate: Lot): void {
  const b = k.b, zr = CROSSING.z, px = gate.x1 + 0.9, pz = zr + LANE + 0.5 + 0.7;
  b.box(px - 0.16, 0, pz - 0.16, px + 0.16, 1.35, pz + 0.16, TIMBER_DARK);
  // the pole raised up, and its counterweight hanging down the other way
  const pivot: V3 = [px, 1.35, pz], tip: V3 = [px + 0.2, 6.6, pz - 0.75];
  const stripes = [0x7d8590, 0x2f5fa8, 0x7d8590, 0x2f5fa8];
  stripes.forEach((c, i) => {
    const t0 = i / stripes.length, t1 = (i + 1) / stripes.length;
    const p = (t: number): V3 => [pivot[0] + (tip[0] - pivot[0]) * t, pivot[1] + (tip[1] - pivot[1]) * t, pivot[2] + (tip[2] - pivot[2]) * t];
    b.beam(p(t0), p(t1), 0.09, 0.08, c);
  });
  b.beam(pivot, [px - 0.05, 0.95, pz + 1.0], 0.09, 0.09, TIMBER);
  b.box(px - 0.22, 0.55, pz + 0.85, px + 0.22, 1.0, pz + 1.25, 0x8a8478);
  fire(k, px + 0.3, 1.75, pz + 0.1, 0.14, 6);
  // the toll keeper, and the box for the coin
  figure(b, px + 1.0, pz + 0.55, 0, FREY_MAN);
  b.box(px + 1.55, 0, pz + 0.35, px + 2.05, 0.38, pz + 0.75, TIMBER_DARK, { top: 0x6b5136 });
  b.box(px + 1.53, 0.24, pz + 0.33, px + 2.07, 0.3, pz + 0.77, 0xa9acb0);
  k.person(px + 2.4, pz + 1.3);
}

const eastTwin: Model = (k, l) => {
  const gate = lotOf('tw-east-gate');
  twin(k, l, gate, 1);
  tollBar(k, gate);
};
const westTwin: Model = (k, l) => twin(k, l, lotOf('tw-west-gate'), -1);

/** The Water Tower, astride the road in the middle of the bridge, over the river: murder holes, arrow slits, a portcullis each way. */
const waterTower: Model = (k, l) => {
  const b = k.b, zr = CROSSING.z, c0 = zr - LANE - 0.5, c1 = zr + LANE + 0.5, leg = 0.9, top = 8;
  // the deck that carries the road over the water, under the road and the vault
  b.box(CROSSING.x - 2.1, -1.6, c0, CROSSING.x + 2.1, -0.01, c1, GREY, { faces: 'T' });
  gateway(b, 'x', l.x0, l.x1, c0, c1, leg, -1.6, 6, 0.8, top, GREY, GREY_SHADE);
  // where the river runs under each of its legs
  for (const [z, s] of [[c0 - leg, -1], [c1 + leg, 1]] as const) archMark(b, 'z', z, s, CROSSING.x - 1.45, CROSSING.x + 1.45, -0.72, 0.62, 0xbdb5a5);
  // murder holes in the vault
  for (const x of [l.x0 + 1.4, (l.x0 + l.x1) / 2, l.x1 - 1.4]) b.quad([x - 0.3, 6.78, zr - 0.3], [x + 0.3, 6.78, zr - 0.3], [x + 0.3, 6.78, zr + 0.3], [x - 0.3, 6.78, zr + 0.3], [0, -1, 0], DARK);
  // the tower itself, with arrow slits, and its gallery of murder holes overhanging all round
  const ix0 = l.x0 + 0.4, ix1 = l.x1 - 0.4, iz0 = l.z0 + 0.4, iz1 = l.z1 - 0.4;
  b.box(ix0, top, iz0, ix1, 13.6, iz1, GREY, { win: SLITS, faces: 'NESW', seed: 5 });
  b.box(l.x0, 13.6, l.z0, l.x1, 15.6, l.z1, GREY, { top: GREY_SHADE, faces: 'NESWTB' });
  for (const t of [0.2, 0.5, 0.8]) {
    const x = l.x0 + (l.x1 - l.x0) * t, z = l.z0 + (l.z1 - l.z0) * t;
    for (const zz of [l.z0 + 0.2, l.z1 - 0.2]) b.quad([x - 0.22, 13.58, zz - 0.13], [x + 0.22, 13.58, zz - 0.13], [x + 0.22, 13.58, zz + 0.13], [x - 0.22, 13.58, zz + 0.13], [0, -1, 0], DARK);
    for (const xx of [l.x0 + 0.2, l.x1 - 0.2]) b.quad([xx - 0.13, 13.58, z - 0.22], [xx + 0.13, 13.58, z - 0.22], [xx + 0.13, 13.58, z + 0.22], [xx - 0.13, 13.58, z + 0.22], [0, -1, 0], DARK);
  }
  crenelRect(b, l.x0, l.z0, l.x1, l.z1, 15.6, GREY, GREY_SHADE, 0.8, 1.8);
  hip(b, l.x0 + 0.6, l.z0 + 0.6, l.x1 - 0.6, l.z1 - 0.6, 15.62, 1.3, ROOF.slate, 0);
  banner(b, (l.x0 + l.x1) / 2, (l.z0 + l.z1) / 2, 16.85, 'frey', 3);
  // a portcullis drawn up over each way through
  portcullis(b, 'x', l.x0, -1, c0 + 0.6, c1 - 0.6, 6.95, top - 0.3);
  portcullis(b, 'x', l.x1, 1, c0 + 0.6, c1 - 0.6, 6.95, top - 0.3);
  fire(k, l.x0 - 0.15, 4.8, c0 - 0.5, 0.22, 7);
  fire(k, l.x1 + 0.15, 4.8, c1 + 0.5, 0.22, 7);
  // guards on the terraces over its legs, and a brazier
  figure(b, l.x1 - 1.0, c0 - 0.5, top, FREY_MAN);
  figure(b, l.x0 + 1.2, c1 + 0.5, top, FREY_MAN);
  brazier(k, l.x0 + 0.9, c0 - 0.45, top);
};

/** The bridge between the two castles and the Water Tower: its parapets and the piers along its sides. */
function twinsBridge(k: Build): void {
  const b = k.b, zr = CROSSING.z, water = lotOf('tw-water'), east = lotOf('tw-east-keep'), west = lotOf('tw-west-keep');
  const spans: [number, number][] = [[water.x1, east.x0], [west.x1, water.x0]];
  for (const [x0, x1] of spans) {
    for (const s of [-1, 1]) {
      const zi = zr + s * (LANE + 0.1), zo = zr + s * (LANE + 0.55);
      b.box(x0, 0, Math.min(zi, zo), x1, 1.0, Math.max(zi, zo), GREY, { top: GREY_SHADE, faces: 'NESWT' });
      // piers standing out from its side, where the arches over the low banks would spring
      const n = 3;
      for (let i = 1; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / (n + 1), zf = zo + s * 0.5;
        b.box(x - 0.3, 0, Math.min(zo, zf), x + 0.3, 1.25, Math.max(zo, zf), GREY, { top: GREY_SHADE, faces: 'NESWT' });
      }
      // a footing along the bottom of its side
      b.box(x0, 0, Math.min(zo, zo + s * 0.25), x1, 0.12, Math.max(zo, zo + s * 0.25), GREY_SHADE, { faces: 'NESWT' });
    }
  }
  // reeds on the low banks of the river, by the bridge
  const r = rng(333);
  for (const [x, z] of [[-8.9, -33.5], [-5.0, -34.4], [-9.0, -19.4], [-4.8, -19.4], [-8.8, -36.0], [-5.1, -20.4]]) reeds(b, x, z, 0, r, 5);
}

/** The bridge on the river road: one plain arch of stone. */
function riverRoadBridge(k: Build): void {
  const b = k.b, x = RIVER_BRIDGE.x, z = RIVER_BRIDGE.z, c0 = z - LANE - 0.5, c1 = z + LANE + 0.5;
  b.box(x - 2.0, -1.6, c0, x + 2.0, -0.01, c1, GREY, { faces: 'T' });
  for (const s of [-1, 1]) {
    const zi = z + s * (LANE + 0.12), zo = z + s * (LANE + 0.62), za = Math.min(zi, zo), zb = Math.max(zi, zo);
    b.box(x - 2.6, -0.72, za, x + 2.6, 0.98, zb, GREY, { top: GREY_SHADE, faces: 'NESWT' });
    for (const e of [-1, 1]) b.box(x + e * 2.6 - 0.36, -0.1, za - 0.06, x + e * 2.6 + 0.36, 1.2, zb + 0.06, GREY, { top: GREY_SHADE, faces: 'NESWT' });
    archMark(b, 'z', s < 0 ? za : zb, s, x - 1.45, x + 1.45, -0.72, 0.62, 0xbdb5a5);
  }
}

// ---------------------------------------------------------------------------
// What the file hands over
// ---------------------------------------------------------------------------

export const MODELS: Record<string, Model> = {
  'mc-children': childrensTower,
  'mc-gate': gatehouseTower,
  'mc-drunkard': drunkardsTower,
  crannogs,
  'tw-east-keep': eastTwin,
  'tw-west-keep': westTwin,
  'tw-water': waterTower,
};
/** The two gate lots are built with their castles. */
export const COVERS: string[] = ['tw-east-gate', 'tw-west-gate'];
export const SIGNS: SignDef[] = [nameSign('neck-moat-cailin', 'MOAT CAILIN'), nameSign('neck-twins', 'THE TWINS')];
export const FLOORED: string[] = ['neck'];

export function heightAt(_x: number, _z: number): number {
  return 0;
}

export function extras(k: Build): void {
  bog(k);
  rubble(k.b);
  twinsBridge(k);
  riverRoadBridge(k);
  // the names: Moat Cailin's beside the causeway north of its gatehouse, the Twins' between the road over their bridge and the kingsroad
  nameBoard(k, 'neck-moat-cailin', 29.6, -43.6, 0, undefined, 0.9);
  const gate = lotOf('tw-east-gate');
  nameBoard(k, 'neck-twins', gate.x1 + 2.8, CROSSING.z + LANE + 3.4, 0, undefined, 1.1);
}
