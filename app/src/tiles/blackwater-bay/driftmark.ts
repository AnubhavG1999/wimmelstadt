// Driftmark: the Velaryons' island in Blackwater Bay, low and fertile, named for
// the driftwood the tides bring. Castle Driftmark, the old seat, damp and
// cramped, on its rock over the water on the north shore; the port of Hull
// beneath it; the shipyards at the island's east end, launching east into the
// Narrow Sea; Spicetown on the Gullet, with its quay of bales from the east;
// the strand by High Tide, where so many dragons once came; and the fields.
//
// Drawn from the books' plain words as the research note gives them (section
// 2, items 38 to 40, 44 and 45), and from a wiki's: the old castle grim, its
// walls dark and salt-stained, often damp and flooded; Hull grown from three
// fishing villages under it; Spicetown's wharves crowded with ships from the
// Free Cities. The rest is this tile's own drawing, and nothing is taken from
// the television series.

import * as THREE from 'three';
import { beside, fine, rounded } from '../../engine/corners';
import { Smoke } from '../../engine/effects';
import { rng, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { area, flat, oval, rect } from '../../engine/ground';
import { archway, figure, lantern, lathe, wheel } from '../../engine/parts';
import { face3, gable, prism, slab, type XZ } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import {
  DOOR, HOUSE, HOUSE_WIN, IRONWORK, LOOPS, LOOPS_CLOSE, PLASTER, DAUB, ROCK, ROCK_DARK, ROOF, STONE, TIMBER, TIMBER_DARK,
  banner, brazier, doorway, fire, nameBoard, nameSign, rampart, roundTower,
} from './look';
import type { Model } from './models';
import { HERO_SPOTS, ISLANDS, LANE, ROADS, inside, lotOf, type Lot, type P2 } from './plan';
import { open, toRoad, underBoards } from './space';

// ---------------------------------------------------------------------------
// Colours of the island's own
// ---------------------------------------------------------------------------

/** Castle Driftmark's stone: the bay's old grey, darkened by the sea and stained with salt. */
const WALL = 0x7f796d, WALL_TOP = 0x655f57;
/** Salt dried white on the stone, the damp at its foot, and the weed where the sea reaches. */
const SALT = 0xd6d2c5, DAMP = 0x5a574f, WEED = 0x3e4b38, PUDDLE = 0x5b6b76;
/** The Velaryons' sea green and silver, as their banners fly them. */
const SEA = HOUSE.velaryon[0], SILVER = HOUSE.velaryon[1];
/** The ground of the island's places: cobbles, the quays' setts, shingle, the strand, a shipyard's sawdust, a farm's yard. */
const COBBLE = 0x8d867a, SETTS = 0xbcb09a, SHINGLE = 0x9d978b, STRAND = 0xe1d19f, SAWDUST = 0xc6b089, YARD = 0xa8916c;
/** Rope, fresh oak, the ribs of a hull, wood the sea has bleached, and the underside of a roof. */
const ROPE = 0xd1bb8e, ROPE_TOP = 0xa8915f, OAK = 0xae8a5b, RIB = 0x8e6c48, BLEACHED = 0xbcb5a8, EAVES = 0x4a3b2c;
/** Cloth from the east on the bales, spices in the open sacks, and the sacks themselves. */
const CLOTH = [0xa8242c, 0x2e3f7c, 0xd6a12e, 0x3d7a4c, 0x6d3b7c, 0xc4562a];
const SPICE = [0xe0a91c, 0xb3402a, 0xd18b1e, 0x86492a, 0x3b3330, 0xa3793f];
const BURLAP = 0xbaa37b;
/** Hull's houses: the shore's stone, daub and plaster, under slate, thatch and shingle. */
const HULL_WALLS = [STONE.shore, DAUB, PLASTER, 0xc2b8a3, 0xb8ad97];
const HULL_ROOFS = [ROOF.slate, ROOF.thatch, ROOF.shingle, 0x5d6670, ROOF.slate];
/** Spicetown's: newer, warmer, plastered in the colours of the east, under baked tile. */
const SPICE_WALLS = [0xe6d6b4, 0xdcbc82, 0xd9a68c, 0xe3c675, 0xe9dcc2];
const SPICE_ROOFS = [ROOF.tile, ROOF.tileDark, 0xb5683f, ROOF.tile];
/** The fields: ripe wheat, young barley, the plough, pale green, stubble and grass. */
const CROPS = [0xd6c06c, 0xa6c05c, 0x8f7350, 0xc5d27c, 0xb99c5c, 0x96ba60];

/** The windows of a warehouse: few, and fewer of them lit. */
const STORE_WIN: WinSpec = { ...HOUSE_WIN, cell: 1.9, lit: 0.18 };

/** Where the heroes stand on show, by their places in the plan. */
const SLIP = HERO_SPOTS.find((s) => s.id === 'slip')!, QUAY = HERO_SPOTS.find((s) => s.id === 'quay')!;

/** Smoke from chimneys and the shipwrights' pitch, gathered as the places are built and set going once. */
const SMOKE: { x: number; y: number; z: number; size: number; shade: number; every: number }[] = [];

// ---------------------------------------------------------------------------
// The island's shores, and the road round it as it is laid
// ---------------------------------------------------------------------------

const ISLE = ISLANDS.driftmark;

/** Where a line north and south through `x` crosses the island's shore: its north shore and its south. */
function shoreAt(x: number): [number, number] {
  const zs: number[] = [];
  for (let i = 0; i < ISLE.length; i++) {
    const a = ISLE[i], c = ISLE[(i + 1) % ISLE.length];
    if (a[0] === c[0] || (a[0] - x) * (c[0] - x) > 0) continue;
    zs.push(a[1] + ((c[1] - a[1]) * (x - a[0])) / (c[0] - a[0]));
  }
  return [Math.min(...zs), Math.max(...zs)];
}

/** Where a line east and west through `z` crosses the island's east shore. */
function eastShoreAt(z: number): number {
  let x = -Infinity;
  for (let i = 0; i < ISLE.length; i++) {
    const a = ISLE[i], c = ISLE[(i + 1) % ISLE.length];
    if (a[1] === c[1] || (a[1] - z) * (c[1] - z) > 0) continue;
    x = Math.max(x, a[0] + ((c[0] - a[0]) * (z - a[1])) / (c[1] - a[1]));
  }
  return x;
}

/** The north or the south shore from `xa` to `xb`, corners and all, `inset` inside the land. */
function shoreLine(xa: number, xb: number, side: 'n' | 's', inset = 0.03): P2[] {
  const at = (x: number): number => shoreAt(x)[side === 'n' ? 0 : 1];
  const between = ISLE.filter(([x, z]) => x > Math.min(xa, xb) && x < Math.max(xa, xb) && Math.abs(z - at(x)) < 1e-6);
  between.sort((p, q) => (xb > xa ? p[0] - q[0] : q[0] - p[0]));
  const pts: P2[] = [[xa, at(xa)], ...between.map(([x, z]): P2 => [x, z]), [xb, at(xb)]];
  return pts.map(([x, z]): P2 => [x, z + (side === 'n' ? inset : -inset)]);
}

/** The middle of the road round the island as roads.ts lays it, a point every unit. */
const RING = fine(rounded(ROADS.driftmark, 6, true), 1);

/** How far a place is from the middle of the road as it is laid, rounded corners and all: the ring and the causeway. */
function fromRoad(x: number, z: number): number {
  let d = toRoad(x, z);
  for (let i = 0; i < RING.length; i++) {
    const a = RING[i], c = RING[(i + 1) % RING.length], vx = c[0] - a[0], vz = c[1] - a[1], l = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l));
    d = Math.min(d, Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t));
  }
  return d;
}

/** Whether a place is on a hero's car, with `m` to spare; or, for a thing taller than a person, in the eight units between the car and the view. */
function inHeroWay(x: number, z: number, h = 0, m = 0.35): boolean {
  for (const s of [SLIP, QUAY]) {
    const c = Math.cos(s.heading), sn = Math.sin(s.heading);
    const onCar = (px: number, pz: number, mm: number): boolean => {
      const ex = px - s.x, ez = pz - s.z;
      return Math.abs(ex * c + ez * sn) < 3.9 + mm && Math.abs(-ex * sn + ez * c) < 1.55 + mm;
    };
    if (onCar(x, z, m)) return true;
    if (h > 2.7) for (let t = 0; t <= 8; t += 0.5) if (onCar(x - 0.669 * t, z - 0.743 * t, 0)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

const sub = (a: V3, c: V3): V3 => [a[0] - c[0], a[1] - c[1], a[2] - c[2]];
const add = (a: V3, c: V3): V3 => [a[0] + c[0], a[1] + c[1], a[2] + c[2]];
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a: V3, c: V3): V3 => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
const unit = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** A face of four corners that need not lie in one plane: its normal is worked out from its corners and turned towards `out`. */
function face4(b: GeoBuilder, p0: V3, p1: V3, p2: V3, p3: V3, out: V3, color: number): void {
  let n = unit(cross(sub(p2, p0), sub(p3, p1)));
  if (n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0) n = mul(n, -1);
  b.quad(p0, p1, p2, p3, n, color);
}

/** A flat disc that faces down, under a tower's flared top or a cone's eaves, which are seen from low. */
function downDisc(b: GeoBuilder, x: number, z: number, y: number, r: number, sides: number, color: number): void {
  const p = (i: number): V3 => {
    const a = Math.PI / sides + (i / sides) * Math.PI * 2;
    return [x + Math.cos(a) * r, y, z + Math.sin(a) * r];
  };
  for (let i = 1; i + 1 < sides; i++) face3(b, p(0), p(i), p(i + 1), [0, -1, 0], color);
}

/**
 * A pitched roof over a rectangle, as `gable` builds it, and under each of its
 * slopes a face that looks down: it closes the eaves and the gable ends, which
 * are seen from low.
 */
function pitched(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, rise: number, roof: number, wall: number, along: 'x' | 'z', over = 0.22): void {
  gable(b, x0, z0, x1, z1, y, rise, roof, wall, along, over);
  const d = 0.05;
  if (along === 'x') {
    const zc = (z0 + z1) / 2, a = x0 - over, c = x1 + over, run = (z1 - z0) / 2 + over, len = Math.hypot(run, rise);
    b.quad([a, y - d, z0 - over], [c, y - d, z0 - over], [c, y + rise - d, zc], [a, y + rise - d, zc], [0, -run / len, rise / len], EAVES);
    b.quad([c, y - d, z1 + over], [a, y - d, z1 + over], [a, y + rise - d, zc], [c, y + rise - d, zc], [0, -run / len, -rise / len], EAVES);
  } else {
    const xc = (x0 + x1) / 2, a = z0 - over, c = z1 + over, run = (x1 - x0) / 2 + over, len = Math.hypot(run, rise);
    b.quad([x0 - over, y - d, a], [x0 - over, y - d, c], [xc, y + rise - d, c], [xc, y + rise - d, a], [rise / len, -run / len, 0], EAVES);
    b.quad([x1 + over, y - d, c], [x1 + over, y - d, a], [xc, y + rise - d, a], [xc, y + rise - d, c], [-rise / len, -run / len, 0], EAVES);
  }
}

/** A log between two points, `r` thick: six-sided, with its ends. */
function log(b: GeoBuilder, a: V3, c: V3, r: number, bark: number, end: number): void {
  const t = unit(sub(c, a));
  let u = cross(t, [0, 1, 0]);
  if (Math.hypot(u[0], u[1], u[2]) < 1e-4) u = [1, 0, 0];
  u = unit(u);
  const v = cross(u, t);
  const ring = (p: V3): V3[] => Array.from({ length: 6 }, (_, i): V3 => add(p, add(mul(u, Math.cos((i / 6) * Math.PI * 2) * r), mul(v, Math.sin((i / 6) * Math.PI * 2) * r))));
  const A = ring(a), C = ring(c);
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6, m = ((i + 0.5) / 6) * Math.PI * 2;
    b.quad(A[i], A[j], C[j], C[i], add(mul(u, Math.cos(m)), mul(v, Math.sin(m))), bark);
  }
  for (let i = 1; i < 5; i++) {
    face3(b, A[0], A[i], A[i + 1], mul(t, -1), end);
    face3(b, C[0], C[i], C[i + 1], t, end);
  }
}

function barrel(b: GeoBuilder, x: number, z: number, y = 0): void {
  b.cyl(x, z, y, y + 0.8, 0.32, 0.32, 6, 0x7a5a3a, { cap: 0x5a4128 });
}
function crate(b: GeoBuilder, x: number, z: number, s = 0.75, y = 0): void {
  b.box(x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2, 0x9a7a52, { top: 0xa98a60 });
}
/** A bale of cloth from the east, wrapped and corded, lying along `yaw`. */
function bale(b: GeoBuilder, x: number, z: number, y: number, yaw: number, color: number): void {
  b.obox(x, y + 0.29, z, 0.44, 0.29, 0.29, yaw, color, { top: color });
}
/** A sack of spice, open at its mouth. */
function sack(b: GeoBuilder, x: number, z: number, spice: number, y = 0): void {
  b.cyl(x, z, y, y + 0.55, 0.27, 0.21, 6, BURLAP, { cap: spice });
}
function bollard(b: GeoBuilder, x: number, z: number, y = 0): void {
  b.cyl(x, z, y, y + 0.55, 0.17, 0.15, 6, 0x4f4c47, { cap: 0x3b3936 });
}
/** A coil of rope. */
function coil(b: GeoBuilder, x: number, z: number, y = 0, r = 0.42): void {
  b.cyl(x, z, y, y + 0.3, r, r, 8, ROPE, { cap: ROPE_TOP });
}

/** A rowing boat drawn up on land, its bow along (cos yaw, sin yaw): dark inside, with its thwarts; or upturned, showing its keel. */
function boat(b: GeoBuilder, x: number, z: number, yaw: number, len: number, hull: number, upturned = false): void {
  const L = len / 2, W = len * 0.2, c = Math.cos(yaw), s = Math.sin(yaw), h = len * 0.12;
  const plan: P2[] = [[L, 0], [L * 0.42, W], [-L * 0.55, W * 0.92], [-L, W * 0.5], [-L, -W * 0.5], [-L * 0.55, -W * 0.92], [L * 0.42, -W]];
  const at = ([u, v]: P2): XZ => [x + u * c - v * s, z + u * s + v * c];
  prism(b, plan.map(at), 0.02, h, hull, { top: upturned ? hull : 0x3b2e22 });
  if (upturned) {
    b.obox(x, h + 0.04, z, L * 0.92, 0.04, 0.06, yaw, TIMBER_DARK);
    return;
  }
  for (const f of [-0.2, 0.25]) b.obox(x + c * f * L, h + 0.03, z + s * f * L, 0.08, 0.03, W * 0.82, yaw, TIMBER);
}

/** A sheep, grazing with its head along (cos yaw, sin yaw). */
function sheep(b: GeoBuilder, x: number, z: number, yaw: number): void {
  b.obox(x, 0.42, z, 0.5, 0.37, 0.3, yaw, 0xf0ece2, { top: 0xf7f4ec });
  b.obox(x + Math.cos(yaw) * 0.6, 0.62, z + Math.sin(yaw) * 0.6, 0.18, 0.17, 0.15, yaw, 0x2b2626);
}

/** A net hung to dry between two poles, sagging between them: seen from both sides. */
function net(b: GeoBuilder, a: P2, c: P2, h: number): void {
  for (const p of [a, c]) b.cyl(p[0], p[1], 0, h, 0.07, 0.06, 4, TIMBER_DARK, { cap: false });
  const dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = dz / l, nz = -dx / l, mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
  for (const s of [-1, 1]) {
    const o = s * 0.015, P = (x: number, y: number, z: number): V3 => [x + nx * o, y, z + nz * o], n: V3 = [nx * s, 0, nz * s];
    b.quad(P(a[0], h - 0.15, a[1]), P(mx, h - 0.4, mz), P(mx, 0.55, mz), P(a[0], 0.75, a[1]), n, 0x6c6a4c);
    b.quad(P(mx, h - 0.4, mz), P(c[0], h - 0.15, c[1]), P(c[0], 0.75, c[1]), P(mx, 0.55, mz), n, 0x6c6a4c);
  }
}

/** A man-at-arms of the Velaryons, in their sea green, with a steel cap. */
function guard(b: GeoBuilder, x: number, z: number, y: number): void {
  figure(b, x, z, y, { coat: SEA, legs: 0x2c3134, hat: 0xa8afb6, hatH: 0.3, hatR: 0.3 });
  b.beam([x + 0.5, y, z + 0.05], [x + 0.5, y + 3.2, z + 0.05], 0.05, 0.05, 0x9a8a72);
  b.cyl(x + 0.5, z + 0.05, y + 3.2, y + 3.6, 0.09, 0.01, 4, 0xc2c6cc);
}

/** A two-wheeled cart, its shafts pointing `dir` along x, with a load on it if `load` is a colour. */
function cart(b: GeoBuilder, x: number, z: number, dir: 1 | -1, load?: number): void {
  b.box(x - 0.8, 0.55, z - 0.5, x + 0.8, 0.72, z + 0.5, TIMBER, { faces: 'NESWTB' });
  for (const s of [-1, 1]) b.box(x - 0.8, 0.72, s < 0 ? z - 0.5 : z + 0.42, x + 0.8, 1.02, s < 0 ? z - 0.42 : z + 0.5, TIMBER_DARK, { faces: 'NESWT' });
  for (const s of [-1, 1] as const) wheel(b, x, 0.44, z + s * 0.6, 0.44, 0.06, s, 0x4e3c2b, 0x8a7a62);
  for (const s of [-1, 1]) b.beam([x + dir * 0.8, 0.64, z + s * 0.3], [x + dir * 2.1, 0.5, z + s * 0.3], 0.04, 0.04, TIMBER);
  if (load !== undefined) {
    bale(b, x - 0.38, z, 0.72, 0, load);
    bale(b, x + 0.42, z, 0.72, 0, CLOTH[(CLOTH.indexOf(load) + 2) % CLOTH.length]);
  }
}

/** A mule, standing with its head along +x or -x. */
function mule(b: GeoBuilder, x: number, z: number, dir: 1 | -1): void {
  b.box(x - 0.55, 0.62, z - 0.22, x + 0.55, 1.2, z + 0.22, 0x6a5848, { faces: 'NESWTB' });
  for (const s of [-1, 1]) b.box(x + s * 0.42 - 0.1, 0, z - 0.17, x + s * 0.42 + 0.1, 0.62, z + 0.17, 0x4f4238, { faces: 'NESW' });
  b.obox(x + dir * 0.72, 1.35, z, 0.26, 0.15, 0.13, dir > 0 ? -0.5 : Math.PI + 0.5, 0x5e4e40);
  for (const s of [-1, 1]) b.box(x + dir * 0.62 - 0.04, 1.45, z + s * 0.08 - 0.03, x + dir * 0.62 + 0.04, 1.75, z + s * 0.08 + 0.03, 0x4f4238);
}

/** A seahorse as the Velaryons bear it, in shares of its box: crown, snout, neck, belly, fin and curled tail, as triangles. */
const SEAHORSE: [P2, P2, P2][] = (() => {
  const H1: P2 = [0.42, 0.95], H2: P2 = [0.6, 0.93], S1: P2 = [0.88, 0.85], S2: P2 = [0.88, 0.79], C: P2 = [0.6, 0.78], B: P2 = [0.37, 0.82];
  const N1: P2 = [0.4, 0.7], N2: P2 = [0.55, 0.7], E1: P2 = [0.67, 0.55], E2: P2 = [0.58, 0.38], K1: P2 = [0.34, 0.58], K2: P2 = [0.4, 0.4], F: P2 = [0.2, 0.52];
  const T1: P2 = [0.5, 0.27], T2: P2 = [0.41, 0.28], T3: P2 = [0.45, 0.14], T4: P2 = [0.34, 0.08], T5: P2 = [0.25, 0.15], T6: P2 = [0.29, 0.23], T7: P2 = [0.37, 0.18];
  return [
    [H1, H2, C], [H1, C, B], [H2, S1, S2], [H2, S2, C], [B, C, N2], [B, N2, N1], [N1, N2, E1], [N1, E1, K1], [K1, E1, E2], [K1, E2, K2], [K1, K2, F],
    [K2, E2, T1], [K2, T1, T2], [T2, T1, T3], [T2, T3, T7], [T7, T3, T4], [T7, T4, T5], [T7, T5, T6],
  ];
})();

/** A long banner of the Velaryons hung down a wall that faces (nx, nz), from its rod at `top`: sea green, with the silver seahorse. */
function hanging(b: GeoBuilder, x: number, z: number, nx: number, nz: number, top: number, w: number, h: number): void {
  const ax = nz, az = -nx, n: V3 = [nx, 0, nz];
  const at = (u: number, v: number, out: number): V3 => [x + ax * (u - 0.5) * w + nx * out, top - h + v * h, z + az * (u - 0.5) * w + nz * out];
  b.quad(at(0, 0.14, 0.05), at(1, 0.14, 0.05), at(1, 1, 0.05), at(0, 1, 0.05), n, SEA);
  face3(b, at(0, 0.14, 0.05), at(1, 0.14, 0.05), at(0.5, 0, 0.05), n, SEA);
  const fit = ([u, v]: P2, out: number): V3 => at(0.1 + u * 0.8, 0.22 + v * 0.72, out);
  for (const [p, q, r] of SEAHORSE) face3(b, fit(p, 0.07), fit(q, 0.07), fit(r, 0.07), n, SILVER);
  b.beam(at(-0.1, 1, 0.1), at(1.1, 1, 0.1), 0.05, 0.05, 0x9a9da2);
}

/** Merlons round the edge of a level rectangle that stands at `y`, `h` high: none within `skip` of the place given. */
function merlonRing(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, h: number, color: number, top: number, skip?: { x: number; z: number; r: number }): void {
  const d = 0.32;
  const run = (a0: number, a1: number, put: (m: number, w: number) => [number, number]): void => {
    const n = Math.max(2, Math.round((a1 - a0) / 1.25)), w = ((a1 - a0) / n) * 0.27;
    for (let i = 0; i < n; i++) {
      const m = a0 + ((i + 0.5) / n) * (a1 - a0), [cx, cz] = put(m, w);
      if (skip && Math.hypot(cx - skip.x, cz - skip.z) < skip.r) continue;
      if (Math.abs(cz - z0 - d / 2) < 1e-6 || Math.abs(cz - z1 + d / 2) < 1e-6) b.box(m - w, y, cz - d / 2, m + w, y + h, cz + d / 2, color, { top });
      else b.box(cx - d / 2, y, m - w, cx + d / 2, y + h, m + w, color, { top });
    }
  };
  run(x0, x1, (m) => [m, z0 + d / 2]);
  run(x0, x1, (m) => [m, z1 - d / 2]);
  run(z0 + d, z1 - d, (m) => [x0 + d / 2, m]);
  run(z0 + d, z1 - d, (m) => [x1 - d / 2, m]);
}

/** A building's footprint, what it is made of, and which way its front faces. */
interface Bldg { x0: number; z0: number; x1: number; z1: number; walls: number; rise: number; wall: number; roof: number; along: 'x' | 'z'; front: 'N' | 'S' | 'E' | 'W'; win?: WinSpec; seed: number }

/** A place on a building's front, `at` of the way along it, and the way the front faces. */
function onFront(o: Bldg, at: number, side = o.front): [number, number, number, number] {
  if (side === 'N') return [o.x0 + (o.x1 - o.x0) * at, o.z0, 0, -1];
  if (side === 'S') return [o.x0 + (o.x1 - o.x0) * at, o.z1, 0, 1];
  if (side === 'E') return [o.x1, o.z0 + (o.z1 - o.z0) * at, 1, 0];
  return [o.x0, o.z0 + (o.z1 - o.z0) * at, -1, 0];
}

/** Walls with their windows and a pitched roof over them. */
function walled(b: GeoBuilder, o: Bldg): void {
  b.box(o.x0, 0, o.z0, o.x1, o.walls, o.z1, o.wall, { win: o.win ?? HOUSE_WIN, seed: o.seed, faces: 'NESW' });
  pitched(b, o.x0, o.z0, o.x1, o.z1, o.walls, o.rise, o.roof, o.wall, o.along);
}

/** How high a roof's gable rises over the middle of its end wall. */
const gableTop = (o: Bldg, across: number): number => o.walls + (o.rise * across) / 2 / (across / 2 + 0.22);

/** A town house: walls, a roof, a door in its front that may stand open and lit, and a chimney that may smoke. */
function townHouse(k: Build, o: Bldg, r: () => number, cap: number): void {
  const b = k.b;
  walled(b, o);
  const [dx, dz, nx, nz] = onFront(o, 0.3 + r() * 0.4);
  doorway(b, dx, 0, dz, nx, nz, 0.72, 1.55, r() < 0.45 ? 0.9 : 0, r() < 0.45 ? 0x2b231b : DOOR);
  if (r() < 0.6) {
    const ridge = o.walls + o.rise, cx = o.along === 'x' ? o.x1 - 0.5 : (o.x0 + o.x1) / 2, cz = o.along === 'x' ? (o.z0 + o.z1) / 2 : o.z1 - 0.5;
    const top = Math.min(ridge + 0.45, cap - 0.05);
    b.box(cx - 0.21, o.walls, cz - 0.21, cx + 0.21, top, cz + 0.21, 0x857464, { top: 0x46403b });
    if (r() < 0.4) SMOKE.push({ x: cx, y: top + 0.25, z: cz, size: 0.55, shade: 0.82, every: 0.45 });
  }
}

/** A warehouse: its gable to the front, with a great door, a loft door over it and a beam to hoist from. */
function warehouse(k: Build, o: Bldg, hung?: number): void {
  const b = k.b;
  walled(b, { ...o, win: o.win ?? STORE_WIN });
  const [dx, dz, nx, nz] = onFront(o, 0.5);
  doorway(b, dx, 0, dz, nx, nz, 1.3, 2.05, 0.35, 0x2b231b);
  const across = o.front === 'N' || o.front === 'S' ? o.x1 - o.x0 : o.z1 - o.z0, apex = gableTop(o, across);
  doorway(b, dx, o.walls + 0.18, dz, nx, nz, 0.7, 0.78, 0.5, 0x2b231b);
  const beamY = apex - 0.3;
  b.beam([dx, beamY, dz], [dx + nx * 0.95, beamY, dz + nz * 0.95], 0.07, 0.07, TIMBER_DARK);
  if (hung !== undefined) {
    b.beam([dx + nx * 0.85, beamY - 0.05, dz + nz * 0.85], [dx + nx * 0.85, beamY - 1.1, dz + nz * 0.85], 0.025, 0.025, ROPE);
    bale(b, dx + nx * 0.85, dz + nz * 0.85, beamY - 1.68, nx === 0 ? 0 : Math.PI / 2, hung);
  }
}

// ---------------------------------------------------------------------------
// Castle Driftmark
// ---------------------------------------------------------------------------

/** How high the castle's rock stands over the shore. */
const CRAG = 1.2;

/** The castle's plan, from its lot: the curtain's middle line and its thickness, the keep in its north-west corner, and the gate east of the keep. */
function castlePlan(l: Lot): { X0: number; X1: number; Z0: number; Z1: number; T: number; K: { x0: number; z0: number; x1: number; z1: number }; GX: number } {
  const X0 = l.x0 + 1.0, X1 = l.x1 - 1.0, Z0 = l.z0 + 0.9, Z1 = l.z1 - 1.2, T = 0.9;
  const K = { x0: X0 - T / 2, z0: Z0 - T / 2, x1: X0 + 4.6, z1: Z0 + 4.4 };
  return { X0, X1, Z0, Z1, T, K, GX: K.x1 + 1.0 };
}

/** The rock: its top, just outside the walls that stand on its edge, and its foot, out round it and down to just above the water on the north. */
function cragRings(l: Lot): { top: P2[]; foot: P2[] } {
  const { X0, X1, Z0, Z1, T, GX } = castlePlan(l), ox0 = X0 - T / 2, ox1 = X1 + T / 2, oz0 = Z0 - T / 2, oz1 = Z1 + T / 2;
  const top: P2[] = [
    [ox0 - 0.15, oz0 - 0.15], [ox0 + 1.9, oz0 - 0.18], [ox0 + 5.4, oz0 - 0.15], [ox1 + 0.15, oz0 - 0.15],
    [ox1 + 0.17, oz0 + 2.1], [ox1 + 0.15, oz1 - 1.8], [ox1 + 0.15, oz1 + 0.15], [GX + 0.9, oz1 + 0.17],
    [ox0 + 2.4, oz1 + 0.15], [ox0 - 0.15, oz1 + 0.15], [ox0 - 0.18, oz1 - 2.5], [ox0 - 0.15, oz0 + 1.6],
  ];
  const out = [0.75, 0.9, 0.95, 0.8, 0.85, 0.75, 0.62, 0.75, 0.7, 0.6, 0.62, 0.65], cx = (ox0 + ox1) / 2, cz = (oz0 + oz1) / 2;
  const foot = top.map(([x, z], i): P2 => {
    const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz), fx = x + (dx / d) * out[i];
    return [fx, Math.max(z + (dz / d) * out[i], shoreAt(fx)[0] + 0.35)];
  });
  return { top, foot };
}
const CASTLE = lotOf('castle-driftmark');
const CRAG_RINGS = cragRings(CASTLE);

/** The rock under the castle, dark and wet, with weed at its foot where the sea comes, and boulders on the shore below it. */
function crag(k: Build): void {
  const b = k.b, { top, foot } = CRAG_RINGS, n = top.length;
  const cx = top.reduce((s, p) => s + p[0], 0) / n, cz = top.reduce((s, p) => s + p[1], 0) / n;
  const lerp = (f: P2, t: P2, s: number): V3 => [f[0] + (t[0] - f[0]) * s, CRAG * s, f[1] + (t[1] - f[1]) * s];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, out: V3 = [(foot[i][0] + foot[j][0]) / 2 - cx, 0, (foot[i][1] + foot[j][1]) / 2 - cz];
    face4(b, [foot[i][0], 0, foot[i][1]], [foot[j][0], 0, foot[j][1]], [top[j][0], CRAG, top[j][1]], [top[i][0], CRAG, top[i][1]], out, i % 3 === 1 ? ROCK_DARK : ROCK);
    // on the faces the sea reaches, the weed, a hair out from the rock
    if (foot[i][1] < cz - 2 || foot[i][0] < cx - 4.5) {
      const o = mul(unit(out), 0.025);
      face4(b, add(lerp(foot[i], top[i], 0), o), add(lerp(foot[j], top[j], 0), o), add(lerp(foot[j], top[j], 0.32), o), add(lerp(foot[i], top[i], 0.32), o), out, WEED);
    }
  }
  flat(b, top, CRAG, 0x6c675f);
  // boulders on the shore under it, and pools left by the tide
  const r = rng(5101);
  for (let x = CASTLE.x0 + 0.2; x < CASTLE.x1 + 0.6; x += 1.9 + r() * 1.2) {
    const z = shoreAt(x)[0] + 0.4 + r() * 0.25, s = 0.32 + r() * 0.24;
    lathe(b, x, z, [[0.03, 0.12 - 0.7 * s], [s, 0.12], [s * 0.6, 0.12 + 0.45 * s], [0.03, 0.12 + 0.7 * s]], 5, r() < 0.5 ? ROCK_DARK : ROCK);
  }
  for (const [x, z, rx] of [[CASTLE.x0 + 3.4, 0.35, 0.55], [CASTLE.x1 - 2.6, 0.3, 0.45]] as [number, number, number][]) {
    area(k, oval(x, shoreAt(x)[0] + 0.55 + z, rx, 0.22, 8), PUDDLE, 0.05);
  }
}

/** Salt dried white down a wall that faces (nx, nz), in streaks from its foot, at places between `a` and `c`. */
function saltStreaks(b: GeoBuilder, a: P2, c: P2, nx: number, nz: number, n: number, seed: number, hMax: number): void {
  const r = rng(seed), ax = nz, az = -nx;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.2 + r() * 0.6) / n, x = a[0] + (c[0] - a[0]) * t + nx * 0.025, z = a[1] + (c[1] - a[1]) * t + nz * 0.025;
    const w = 0.07 + r() * 0.08, h1 = 0.9 + r() * (hMax - 0.9);
    b.quad([x - ax * w, 0, z - az * w], [x + ax * w, 0, z + az * w], [x + ax * w * 0.5, h1, z + az * w * 0.5], [x - ax * w * 0.5, h1, z - az * w * 0.5], [nx, 0, nz], SALT);
  }
  // the dark of the damp along its foot
  b.quad([a[0] + nx * 0.02, 0, a[1] + nz * 0.02], [c[0] + nx * 0.02, 0, c[1] + nz * 0.02], [c[0] + nx * 0.02, 0.42, c[1] + nz * 0.02], [a[0] + nx * 0.02, 0.42, a[1] + nz * 0.02], [nx, 0, nz], DAMP);
}

/**
 * Castle Driftmark: the old seat of House Velaryon, damp and cramped, on a
 * low rock over the water on the island's north shore. A square keep of dark,
 * salt-stained stone fills the corner over the sea, with a stair turret and
 * the house's sea-green banners; a low curtain with round towers closes a ward
 * hardly bigger than the keep, wet underfoot; the sea tower stands at the
 * north-east corner under a slate cone; and the gate, between two small
 * towers with torches, looks south to the road.
 */
function castleDriftmark(k: Build, l: Lot): void {
  const b = k.b, { X0, X1, Z0, Z1, T, K, GX } = castlePlan(l), H = l.top - CRAG;
  crag(k);

  // the ward's wet cobbles, and the floor of the gate's passage
  flat(b, rect(X0 + T / 2, Z0 + T / 2, X1 - T / 2, Z1 - T / 2), CRAG + 0.03, COBBLE);
  flat(b, rect(GX - 0.6, Z1 - T / 2, GX + 0.6, Z1 + T / 2), CRAG + 0.03, COBBLE);
  for (const [x, z, rx, rz] of [[X1 - 2.9, Z0 + 3.3, 0.55, 0.34], [GX - 0.6, Z1 - 1.0, 0.4, 0.27], [X1 - 1.4, Z0 + 1.0, 0.35, 0.22]]) flat(b, oval(x, z, rx, rz, 10), CRAG + 0.045, PUDDLE);

  // the towers stand on the rock's flanks, from the shore up
  const tower = { shade: WALL_TOP, y0: 0 };
  roundTower(b, X0, Z1, 0.95, CRAG + 5.0, WALL, { ...tower, win: LOOPS, sides: 10 });
  roundTower(b, X1, Z1, 0.95, CRAG + 5.0, WALL, { ...tower, win: LOOPS, sides: 10 });
  roundTower(b, X1, Z0, 1.2, CRAG + 6.6, WALL, { ...tower, win: LOOPS_CLOSE, sides: 10, cone: { color: ROOF.slate, h: 2.6 } });
  for (const s of [-1, 1]) roundTower(b, GX + s * 1.3, Z1, 0.7, CRAG + 5.2, WALL, { ...tower, win: LOOPS, sides: 8 });
  // under their flared tops, and under the sea tower's cone
  for (const [x, z, r, top, sides] of [[X0, Z1, 0.95, CRAG + 5.0, 10], [X1, Z1, 0.95, CRAG + 5.0, 10], [X1, Z0, 1.2, CRAG + 6.6, 10], [GX - 1.3, Z1, 0.7, CRAG + 5.2, 8], [GX + 1.3, Z1, 0.7, CRAG + 5.2, 8]]) {
    downDisc(b, x, z, top - 1, r + 0.22, sides, WALL_TOP);
  }
  downDisc(b, X1, Z0, CRAG + 6.6, 1.2 + 0.22 + 0.25, 10, ROOF.slate);
  banner(b, X1, Z0, CRAG + 6.6 + 2.5, 'velaryon', 1.3, 0.55);

  // everything that stands on the rock's top is built from its height up, so that its loops come in rows above the rock
  b.moved(0, CRAG, 0, 0, () => {
    // the keep: two rows of loops, a corbelled band, battlements to the lot's top
    b.box(K.x0, 0, K.z0, K.x1, 7.4, K.z1, WALL, { win: LOOPS_CLOSE, seed: 0.37, faces: 'NESW' });
    b.box(K.x0 - 0.22, 7.4, K.z0 - 0.22, K.x1 + 0.22, 7.9, K.z1 + 0.22, WALL_TOP, { top: 0x5d5952, faces: 'NESWTB' });
    merlonRing(b, K.x0 - 0.22, K.z0 - 0.22, K.x1 + 0.22, K.z1 + 0.22, 7.9, H - 7.9, WALL, WALL_TOP, { x: K.x1, z: K.z1, r: 1.25 });
    // its stair turret, in the corner towards the ward, under a slate cone
    const tr = 0.85;
    b.cyl(K.x1, K.z1, 0, 6.8, tr, tr, 8, WALL, { win: LOOPS_CLOSE, seed: 0.81, cap: false });
    b.cyl(K.x1, K.z1, 6.8, H, tr, tr, 8, WALL, { cap: false });
    downDisc(b, K.x1, K.z1, H, tr + 0.22, 8, WALL_TOP);
    lathe(b, K.x1, K.z1, [[tr + 0.22, H], [tr * 0.55, H + 1.4], [0.05, H + 2.5]], 8, ROOF.slate);
    // its door on the ward, and the house's banners: on the roof, and hung down the faces the view sees
    doorway(b, K.x1, 0, K.z0 + 2.0, 1, 0, 0.9, 1.7, 0, DOOR);
    banner(b, K.x0 + 1.0, K.z0 + 1.0, 7.9, 'velaryon', 3.4, 0.85);
    hanging(b, (K.x0 + K.x1) / 2 - 0.7, K.z1, 0, 1, 7.35, 1.25, 2.7);
    hanging(b, K.x1, (K.z0 + K.z1) / 2 - 0.6, 1, 0, 7.35, 1.2, 2.9);

    // the curtain: low, with a walk and battlements, from tower to tower and to the keep
    const cw = { thick: T, shade: WALL_TOP, win: LOOPS };
    rampart(b, [X0, Z1], [GX - 1.3, Z1], 3.8, WALL, cw);
    rampart(b, [GX + 1.3, Z1], [X1, Z1], 3.8, WALL, cw);
    rampart(b, [X1, Z0], [X1, Z1], 3.8, WALL, cw);
    rampart(b, [K.x1, Z0], [X1, Z0], 3.8, WALL, cw);
    rampart(b, [X0, K.z1], [X0, Z1], 3.8, WALL, cw);

    // the gate: an arch between the gate towers, closed at its sides, a walk and two merlons over it, and its leaves standing open
    const gz0 = Z1 - T / 2, gz1 = Z1 + T / 2, gw = 1.2, gtop = 3.8;
    archway(b, GX, gz0, gz1, gw, 1.5, gtop, WALL, 0x3a352f);
    b.box(GX - gw / 2 - 0.4, 0, gz0, GX - gw / 2, gtop, gz1, WALL, { faces: 'NSE' });
    b.box(GX + gw / 2, 0, gz0, GX + gw / 2 + 0.4, gtop, gz1, WALL, { faces: 'NSW' });
    b.box(GX - gw / 2 - 0.4, gtop, gz0, GX + gw / 2 + 0.4, gtop + 0.2, gz1, WALL_TOP, { top: WALL_TOP });
    for (const s of [-1, 1]) b.box(GX + s * 0.42 - 0.2, gtop + 0.2, gz1 - 0.32, GX + s * 0.42 + 0.2, gtop + 0.95, gz1, WALL, { top: WALL_TOP });
    for (const s of [-1, 1]) b.box(GX + s * (gw / 2 - 0.08) - 0.05, 0, gz0 + 0.05, GX + s * (gw / 2 - 0.08) + 0.05, 1.55, gz0 + 0.62, TIMBER_DARK, { faces: 'NESWT' });

    // salt down the faces the sea and the weather reach, and the damp along their feet
    saltStreaks(b, [K.x0, K.z0], [K.x1, K.z0], 0, -1, 6, 11, 4.5);
    saltStreaks(b, [K.x0, K.z1], [K.x0, K.z0], -1, 0, 5, 12, 4.0);
    saltStreaks(b, [X0, Z1 + T / 2], [GX - 2.0, Z1 + T / 2], 0, 1, 3, 13, 2.6);
    saltStreaks(b, [GX + 2.0, Z1 + T / 2], [X1, Z1 + T / 2], 0, 1, 1, 14, 2.4);
    saltStreaks(b, [X1 + T / 2, Z1], [X1 + T / 2, Z0], 1, 0, 4, 15, 3.0);
    saltStreaks(b, [K.x1, Z0 - T / 2], [X1, Z0 - T / 2], 0, -1, 3, 16, 3.2);
  });

  // the ward: a well, a lean-to against the east wall with casks and sacks under it, a brazier, and folk at their work
  const wy = CRAG + 0.03;
  b.cyl(X1 - 1.9, Z0 + 1.55, CRAG, wy + 0.72, 0.46, 0.46, 8, WALL, { cap: 0x2d3d47 });
  for (const s of [-1, 1]) b.beam([X1 - 1.9 + s * 0.46, wy + 0.72, Z0 + 1.55], [X1 - 1.9 + s * 0.46, wy + 1.8, Z0 + 1.55], 0.05, 0.05, TIMBER_DARK);
  b.beam([X1 - 2.42, wy + 1.75, Z0 + 1.55], [X1 - 1.38, wy + 1.75, Z0 + 1.55], 0.05, 0.05, TIMBER_DARK);
  const lx0 = X1 - T / 2 - 1.3, lx1 = X1 - T / 2, lz0 = Z0 + 2.4, lz1 = Z1 - 1.0;
  slab(b, [lx1 - 0.02, wy + 2.85, (lz0 + lz1) / 2], [lx0 - 0.1, wy + 2.0, (lz0 + lz1) / 2], (lz1 - lz0) / 2, 0.1, ROOF.shingle, { under: EAVES });
  for (const z of [lz0 + 0.12, lz1 - 0.12]) b.beam([lx0 + 0.05, wy, z], [lx0 + 0.05, wy + 1.95, z], 0.06, 0.06, TIMBER_DARK);
  barrel(b, lx1 - 0.45, lz0 + 0.6, wy);
  barrel(b, lx1 - 0.45, lz0 + 1.32, wy);
  for (const [dz, c] of [[2.1, SPICE[5]], [2.6, SPICE[3]]] as [number, number][]) sack(b, lx1 - 0.5, lz0 + dz, c, wy);
  brazier(k, GX + 0.85, Z1 - 1.25, wy);
  for (const [x, z] of [[GX + 0.5, Z0 + 2.4], [GX - 0.3, Z0 + 3.9], [X1 - 2.6, Z0 + 0.9]]) k.person(x, z, wy);
  // on the walls and the keep's roof
  for (const [x, z] of [[X1, Z0 + 2.5], [X0 + 2.0, Z1], [X1 - 1.7, Z0]]) k.person(x, z, CRAG + 3.8);
  k.person(K.x0 + 3.1, K.z0 + 2.4, CRAG + 7.9);

  // the way up from the road to the gate, the gate's torches, and two of the house's men at its foot
  const rampFoot = Z1 + T / 2 + 2.2;
  slab(b, [GX, wy, Z1 + T / 2], [GX, 0.05, rampFoot], 0.72, 0.3, COBBLE, { under: ROCK_DARK });
  for (const s of [-1, 1]) {
    const x = GX + s * 1.3, z = Z1 + 0.7;
    b.box(x - 0.06, CRAG + 2.0, z - 0.05, x + 0.06, CRAG + 2.22, z + 0.2, IRONWORK, { faces: 'NESWTB' });
    fire(k, x, CRAG + 2.45, z + 0.15, 0.22, 0);
    guard(b, GX + s * 1.1, rampFoot - 0.45, 0);
  }
  k.person(GX + 2.4, rampFoot - 0.2);
  k.lights.push({ x: GX, z: rampFoot - 0.6, r: 9, color: '#ffcf8a', k: 0.55 }, { x: (X0 + X1) / 2 + 1.5, z: (Z0 + Z1) / 2, r: 8, color: '#ffcf8a', k: 0.38 });

  // its name, before its south-east corner, beside the road
  nameBoard(k, 'driftmark-name', l.x1 + 1.0, l.z1 - 0.5, 0, undefined, 1.1);
}

// ---------------------------------------------------------------------------
// Hull
// ---------------------------------------------------------------------------

/**
 * Hull, the port beneath Castle Driftmark, grown from fishing villages and
 * named for the hulls of the ships that anchor below it: a quay along the
 * north shore with its bollards, casks, a crane and a fishwives' stall; a hard
 * at its east end where boats are drawn up and nets hung to dry; a row of
 * warehouses and fishing folk's houses on the quay, and behind them a lane and
 * a row that looks onto the road, with the chandler's at its middle.
 */
function hull(k: Build, l: Lot): void {
  const b = k.b, r = rng(3911);
  const front = l.z0 + 0.7, back = l.z1 - 0.4, qx0 = l.x0 - 1.3, hardX = l.x1 - 4.4, qx1 = l.x1 + 0.6;

  // the quay, paved from the shore to the warehouses' fronts, with a stone kerb along its edge; and the hard
  area(k, [...shoreLine(qx0, hardX, 'n'), [hardX, front], [qx0, front]], SETTS, 0.045);
  area(k, [...shoreLine(hardX, qx1, 'n'), [qx1, front - 0.3], [hardX, front - 0.3]], SHINGLE, 0.05);
  const kerb = shoreLine(qx0, hardX, 'n', 0.18);
  for (let i = 0; i + 1 < kerb.length; i++) {
    const a = kerb[i], c = kerb[i + 1], len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    b.obox((a[0] + c[0]) / 2, 0.1, (a[1] + c[1]) / 2, len / 2, 0.1, 0.15, Math.atan2(c[1] - a[1], c[0] - a[0]), 0xa49b8b);
  }
  const shoreN = (x: number): number => shoreAt(x)[0];
  for (let x = qx0 + 1.3; x < hardX - 0.5; x += 3.4) bollard(b, x, shoreN(x) + 0.52, 0.045);

  // the row on the quay: warehouses and the houses of fishing folk, their doors on the quay
  const row: [number, 'store' | 'house'][] = [[4.0, 'store'], [2.2, 'house'], [2.4, 'house'], [3.6, 'store'], [2.6, 'house']];
  let x = l.x0 + 0.35, i = 0;
  for (const [w, kind] of row) {
    if (x + w > l.x1 - 0.3) break;
    const wall = HULL_WALLS[i % HULL_WALLS.length], roof = HULL_ROOFS[(i * 3 + 1) % HULL_ROOFS.length];
    if (kind === 'store') warehouse(k, { x0: x, z0: front, x1: x + w, z1: front + 2.6, walls: 3.3, rise: 2.1, wall: STONE.shore, roof: ROOF.slate, along: 'z', front: 'N', seed: x * 0.3 }, i === 0 ? CLOTH[4] : undefined);
    else townHouse(k, { x0: x, z0: front + 0.05, x1: x + w, z1: front + 2.5, walls: 3.0, rise: 1.7 + r() * 0.5, wall, roof, along: r() < 0.6 ? 'x' : 'z', front: 'N', seed: x * 0.3 }, r, l.top);
    x += w + 0.32;
    i++;
  }

  // the row on the road: houses, and the chandler's, where ships are fitted with rope, oars, sail and anchor
  const row2: [number, 'house' | 'chandler'][] = [[2.2, 'house'], [3.6, 'chandler'], [2.2, 'house'], [2.3, 'house']];
  x = l.x0 + 1.7;
  for (const [w, kind] of row2) {
    if (x + w > l.x1 - 3.6) break;
    const o: Bldg = { x0: x, z0: back - 2.6, x1: x + w, z1: back, walls: 3.0, rise: 1.8 + r() * 0.4, wall: HULL_WALLS[(i + 2) % HULL_WALLS.length], roof: HULL_ROOFS[i % HULL_ROOFS.length], along: 'x', front: 'S', seed: x * 0.29 + 3 };
    if (kind === 'chandler') chandler(k, { ...o, walls: 3.2, rise: 2.1, wall: STONE.shore, roof: ROOF.slate });
    else townHouse(k, o, r, l.top);
    x += w + 0.35;
    i++;
  }

  // on the quay: casks and crates before the warehouses, a crane with a net of fish, the fishwives' stall, lanterns
  for (const [dx, dz] of [[0.6, -0.55], [1.25, -0.5], [0.9, -1.05], [8.2, -0.6], [8.85, -0.55]]) barrel(b, l.x0 + dx, front + dz, 0.045);
  crate(b, l.x0 + 2.4, front - 0.6, 0.75, 0.045);
  crate(b, l.x0 + 3.1, front - 0.65, 0.6, 0.045);
  crate(b, l.x0 + 2.55, front - 0.62, 0.5, 0.795);
  // the crane by the quay's edge, its jib along the quay, lifting a net full of fish
  const cx = l.x0 + 7.6, cz = shoreN(l.x0 + 7.6) + 0.75, tip: V3 = [cx + 1.9, 4.4, shoreN(cx + 1.9) + 0.55];
  b.box(cx - 0.17, 0.045, cz - 0.17, cx + 0.17, 2.4, cz + 0.17, TIMBER_DARK, { top: TIMBER });
  b.beam([cx, 0.8, cz], tip, 0.08, 0.07, TIMBER);
  b.beam([cx, 2.3, cz], tip, 0.025, 0.025, ROPE);
  b.beam([tip[0], 4.35, tip[2]], [tip[0], 2.72, tip[2]], 0.025, 0.025, ROPE);
  b.box(tip[0] - 0.32, 2.15, tip[2] - 0.3, tip[0] + 0.32, 2.72, tip[2] + 0.3, 0x6e6f58, { top: 0xb9c3c8, faces: 'NESWTB' });
  // the fishwives' stall: a trestle board of baskets of herring, and their barrow
  const fx = l.x0 + 5.3, fz = front - 0.75;
  b.box(fx - 0.9, 0.75, fz - 0.32, fx + 0.9, 0.85, fz + 0.32, TIMBER, { faces: 'NESWTB' });
  for (const s of [-1, 1]) b.box(fx + s * 0.75 - 0.06, 0.045, fz - 0.28, fx + s * 0.75 + 0.06, 0.75, fz + 0.28, TIMBER_DARK, { faces: 'NESW' });
  for (const dx of [-0.55, 0, 0.55]) b.cyl(fx + dx, fz, 0.85, 1.12, 0.24, 0.27, 6, 0x9a7b4c, { cap: 0xc5d0d6 });
  for (const [px, pz] of [[fx - 0.4, fz + 0.75], [fx + 0.6, fz + 0.7], [fx + 1.8, fz - 0.2]]) k.person(px, pz, 0.045);
  lantern(k, l.x0 + 1.9, shoreN(l.x0 + 1.9) + 0.6, 0.045, 2.1, TIMBER_DARK);
  lantern(k, hardX - 1.0, shoreN(hardX - 1.0) + 0.6, 0.045, 2.1, TIMBER_DARK);
  for (const [px, dz] of [[l.x0 - 0.6, 0.9], [l.x0 + 3.6, 1.2], [cx - 0.7, 0.85], [l.x0 + 11.0, 1.3], [l.x0 + 12.3, 0.85]]) k.person(px, shoreN(px) + dz, 0.045);

  // the hard: boats drawn up, their bows inland, a net drying, and men at the boats
  boat(b, hardX + 1.4, shoreN(hardX + 1.4) + 1.3, Math.PI / 2 + 0.12, 2.2, 0x5a6f7a);
  boat(b, hardX + 3.2, shoreN(hardX + 3.2) + 1.3, Math.PI / 2 - 0.18, 2.1, 0x8a5a3a, true);
  net(b, [hardX + 0.35, shoreN(hardX + 0.35) + 0.5], [hardX + 0.35, front - 0.55], 1.9);
  k.person(hardX + 2.3, shoreN(hardX + 2.3) + 1.6, 0.05);
  k.person(qx1 - 0.4, shoreN(qx1 - 0.4) + 1.3, 0.05);

  // the lane between the rows, and folk in it; a handcart in the yard behind the board
  const lane = (front + 2.6 + back - 2.6) / 2;
  for (const dx of [3.2, 6.6, 9.8, 12.4]) k.person(l.x0 + dx, lane + (r() - 0.5) * 0.3);
  cart(b, l.x1 - 2.4, back - 2.45, 1);
  // before the road's row
  for (const dx of [2.8, 9.4, 11.9]) k.person(l.x0 + dx, back + 0.75);

  // the lights of the quay, the lane and the row on the road
  k.lights.push(
    { x: (l.x0 + l.x1) / 2, z: front - 0.9, r: 11, color: '#ffcf8a', k: 0.42 },
    { x: (l.x0 + l.x1) / 2, z: lane, r: 9, color: '#ffc98a', k: 0.38 },
    { x: (l.x0 + l.x1) / 2, z: back + 1.2, r: 10, color: '#ffcf8a', k: 0.42 },
  );

  // its name, before its south-east corner, beside the road
  nameBoard(k, 'driftmark-hull', l.x1 - 1.8, l.z1 - 0.7, 0, undefined, 1.1);
}

/** The chandler's: a stone shop with its front open on the road, rope coiled before it, an anchor and oars against the wall, and its board. */
function chandler(k: Build, o: Bldg): void {
  const b = k.b, xc = (o.x0 + o.x1) / 2, z = o.z1;
  walled(b, o);
  doorway(b, xc - 0.35, 0, z, 0, 1, 1.9, 1.85, 1.5, 0x2b231b);
  // the board over the shop, on a dark backing proud of the wall
  const w = k.sign('driftmark-rope', xc, 2.48, z + 0.15, 0, 1, 0.5, o.x1 - o.x0 - 0.6);
  b.box(xc - w / 2 - 0.12, 2.17, z + 0.02, xc + w / 2 + 0.12, 2.79, z + 0.12, TIMBER_DARK, { faces: 'NESWTB' });
  // rope coiled before it, an anchor and a pair of oars against the wall, and a lamp by the door
  coil(b, o.x0 + 0.45, z + 0.62);
  coil(b, o.x0 + 0.45, z + 0.62, 0.3, 0.36);
  const ax = o.x1 - 1.0;
  b.beam([ax, 0.15, z + 0.55], [ax, 1.75, z + 0.1], 0.07, 0.06, IRONWORK);
  b.beam([ax - 0.45, 1.5, z + 0.18], [ax + 0.45, 1.5, z + 0.18], 0.05, 0.05, TIMBER_DARK);
  for (const s of [-1, 1]) b.beam([ax, 0.2, z + 0.53], [ax + s * 0.5, 0.55, z + 0.62], 0.06, 0.04, IRONWORK);
  for (const dx of [0.3, 0.48]) b.beam([o.x1 - dx, 0.02, z + 0.45], [o.x1 - dx - 0.12, 2.4, z + 0.07], 0.04, 0.04, OAK);
  k.glows.push({ x: xc + 0.85, y: 2.0, z: z + 0.25, sx: 0.18, sy: 0.24, sz: 0.18, color: '#ffd28a' });
  k.person(xc + 0.4, z + 1.0);
}

// ---------------------------------------------------------------------------
// The shipyards
// ---------------------------------------------------------------------------

/**
 * A ship on the stocks, half built, on a slipway that runs down east into the
 * water: her keel on the cradle's blocks, stem and sternpost up, ribs standing
 * over the stern two thirds and the first strakes along her bottom, shores
 * holding her up, and a scaffold along her south side with shipwrights on it.
 * She is built along +x from her stern at `xs`, over the slip's middle at
 * `zc`; `keel` is how high her keel is at a place along her, and `way` how high
 * the ways under her are.
 */
function shipOnStocks(k: Build, xs: number, len: number, zc: number, keel: (u: number) => number, way: (x: number) => number): void {
  const b = k.b, beam = 3.2, depth = 2.4;
  const P = (u: number, v: number, h: number): V3 => [xs + u, keel(u) + h, zc + v];
  const half = (u: number): number => (beam / 2) * Math.sin(Math.PI * Math.min(1, Math.max(0, (u + 0.9) / (len + 1.3)))) ** 0.6;
  const sheer = (u: number): number => depth + 0.6 * ((u / len - 0.5) * 2) ** 2;
  // the keel, the cradle's blocks across the ways, and the posts at either end
  b.beam(P(-0.1, 0, -0.12), P(len, 0, -0.12), 0.16, 0.16, TIMBER_DARK);
  for (let u = 0.5; u < len; u += 2.0) b.box(xs + u - 0.25, way(xs + u) - 0.02, zc - 1.12, xs + u + 0.25, keel(u) - 0.27, zc + 1.12, 0x6e5a44, { faces: 'NESWTB' });
  b.beam(P(0, 0, -0.1), P(-0.4, 0, sheer(0) + 0.45), 0.12, 0.12, TIMBER_DARK);
  b.sweep([P(len - 0.15, 0, -0.1), P(len + 0.35, 0, sheer(len) * 0.55), P(len + 0.55, 0, sheer(len) + 0.7)], [0.12, 0.12, 0.1], TIMBER_DARK);
  // the ribs over the stern two thirds, and the first strakes along her bottom, seen inside and out
  const ribs: number[] = [];
  for (let u = 0.9; u < len * 0.72; u += 0.95) ribs.push(u);
  const pts = (u: number, s: number): V3[] => [P(u, s * half(u) * 0.12, 0.1), P(u, s * half(u) * 0.86, sheer(u) * 0.34), P(u, s * half(u), sheer(u))];
  for (const u of ribs) for (const s of [-1, 1]) b.sweep(pts(u, s), [0.09, 0.09, 0.08], RIB);
  for (let i = 0; i + 1 < ribs.length; i++) {
    for (const s of [-1, 1]) {
      const a = pts(ribs[i], s), c = pts(ribs[i + 1], s), out: V3 = [0, -0.3, s];
      face4(b, a[0], c[0], c[1], a[1], out, OAK);
      face4(b, a[0], c[0], c[1], a[1], mul(out, -1), 0x9a7650);
      if (i < ribs.length / 2) {
        const am = add(mul(a[1], 0.5), mul(a[2], 0.5)), cm = add(mul(c[1], 0.5), mul(c[2], 0.5)), up: V3 = [0, 0.1, s];
        face4(b, a[1], c[1], cm, am, up, OAK);
        face4(b, a[1], c[1], cm, am, mul(up, -1), 0x9a7650);
      }
    }
  }
  // shores from the ground to her bilge, where there is ground under them
  for (const u of [1.5, 3.4, 5.3]) {
    for (const s of [-1, 1]) {
      const fz = zc + s * (half(u) + 0.75);
      if (xs + u > eastShoreAt(fz) - 0.3) continue;
      b.beam([xs + u, 0.02, fz], P(u, s * half(u) * 0.92, sheer(u) * 0.42), 0.07, 0.07, TIMBER);
    }
  }
  // the scaffold along her south side, its plank, a ladder up to it from the west, and the shipwrights
  const sz = zc + half(3) + 0.55;
  for (const u of [1.0, 4.6]) b.beam([xs + u, 0, sz], [xs + u, 2.55, sz], 0.07, 0.07, TIMBER_DARK);
  b.box(xs + 0.8, 1.88, sz - 0.25, xs + 4.8, 1.98, sz + 0.25, OAK, { faces: 'NESWTB' });
  for (const s of [-0.2, 0.2]) b.beam([xs + 0.1, 0, sz + s], [xs + 0.75, 1.98, sz + s], 0.035, 0.035, TIMBER);
  for (const h of [0.55, 1.05, 1.55]) b.beam([xs + 0.1 + (0.65 * h) / 1.98, h, sz - 0.2], [xs + 0.1 + (0.65 * h) / 1.98, h, sz + 0.2], 0.03, 0.03, TIMBER);
  k.person(xs + 1.9, sz, 1.98);
  k.person(xs + 3.6, sz + 0.05, 1.98);
  k.person(xs + 2.6, zc, keel(2.6) + 0.15);
}

/** A treadwheel crane: a great wheel a man walks in, winding the rope up its mast and over a jib that reaches out over the slip. */
function treadwheelCrane(k: Build, wx: number, wz: number, mast: V3, tip: V3, hang: number): void {
  const b = k.b, R = 1.6, yc = 1.95, half = 0.38, n = 6;
  for (const s of [-1, 1]) b.box(wx - 1.6, 0, wz + s * half - 0.12, wx + 1.6, 0.25, wz + s * half + 0.12, TIMBER_DARK);
  const pt = (i: number, z: number, rr = R): V3 => [wx + Math.cos((i / n) * Math.PI * 2 + Math.PI / 6) * rr, yc + Math.sin((i / n) * Math.PI * 2 + Math.PI / 6) * rr, z];
  for (const z of [wz - half, wz + half]) {
    for (let i = 0; i < n; i++) b.beam(pt(i, z), pt(i + 1, z), 0.06, 0.06, RIB);
    for (let i = 0; i < n / 2; i++) b.beam(pt(i, z, R * 0.95), pt(i + n / 2, z, R * 0.95), 0.045, 0.045, RIB);
  }
  for (let i = 0; i < n; i++) b.beam(pt(i + 0.5, wz - half, R * 0.96), pt(i + 0.5, wz + half, R * 0.96), 0.05, 0.05, OAK);
  b.beam([wx, yc, wz - half - 0.32], [wx, yc, wz + half + 0.32], 0.08, 0.08, TIMBER_DARK);
  for (const s of [-1, 1]) for (const d of [-1, 1]) b.beam([wx + d * 1.1, 0.25, wz + s * (half + 0.25)], [wx, yc, wz + s * (half + 0.25)], 0.07, 0.07, TIMBER_DARK);
  // the mast; its boom, rising from part way up it to the tip over the slip, held by a rope from the masthead;
  // and the rope with a curved timber for a rib on it
  b.box(mast[0] - 0.18, 0, mast[2] - 0.18, mast[0] + 0.18, mast[1], mast[2] + 0.18, TIMBER_DARK, { top: TIMBER });
  b.beam([mast[0], 1.5, mast[2]], tip, 0.1, 0.08, TIMBER);
  b.beam([mast[0], mast[1] - 0.1, mast[2]], tip, 0.025, 0.025, ROPE);
  b.beam([wx, yc + R, wz], [mast[0], mast[1] - 0.15, mast[2]], 0.025, 0.025, ROPE);
  b.beam(tip, [tip[0], hang, tip[2]], 0.025, 0.025, ROPE);
  b.sweep([[tip[0] - 0.9, hang - 0.55, tip[2] - 0.2], [tip[0], hang - 0.1, tip[2]], [tip[0] + 0.9, hang - 0.55, tip[2] + 0.2]], [0.08, 0.09, 0.08], OAK);
  k.person(wx, wz, yc - R * 0.96 * Math.sin(Math.PI / 3) + 0.03);
}

/**
 * The shipyards at the island's east end, launching east into the Narrow Sea:
 * a ship half built on the stocks, a treadwheel crane over her, the
 * shipwrights' shed with the yard's board, and the slipway kept empty and
 * planked for whoever is to be launched next; at the south end a capstan, rope,
 * and the pitch kettle smoking. The logs and the sawpit are in the timber yard
 * just west of it.
 */
function shipyards(k: Build, l: Lot): void {
  const b = k.b;
  // the yard's ground: sawdust and trodden earth over the land in the lot
  const coastTo = (za: number, zb: number, steps: number, inset: number): P2[] => {
    const pts: P2[] = [];
    for (let i = 0; i <= steps; i++) {
      const z = za + ((zb - za) * i) / steps;
      pts.push([Math.min(l.x1 + 2, eastShoreAt(z)) - inset, z]);
    }
    // the shore's own corners between, so that nothing lies over the water
    for (const [x, z] of ISLE) if (z > za && z < zb && Math.abs(x - eastShoreAt(z)) < 1e-6) pts.push([x - inset, z]);
    return pts.sort((p, q) => p[1] - q[1]);
  };
  area(k, [[l.x0 + 0.1, l.z0 + 0.1], ...coastTo(l.z0 + 0.1, l.z1 - 0.1, 8, 0.05), [l.x0 + 0.1, l.z1 - 0.1]], SAWDUST, 0.04);

  // a slip's ways: two rails, gently down across the yard to the water's edge, and then steeply on into
  // the water as far as two past the lot, on piles where they are over it. Each rail meets the water where
  // the shore is beside it. What is handed back is how high the lower of them is at a place.
  const xEnd = l.x1 + 2.0, yShore = 0.08, yEnd = -1.05;
  const ways = (zc: number, x0: number, y0: number, gauge: number): ((x: number) => number) => {
    const rails = [-1, 1].map((s) => {
      const z = zc + s * gauge, shore = eastShoreAt(z) - 0.05;
      const y = (x: number): number => (x <= shore ? y0 + ((yShore - y0) * (x - x0)) / Math.max(1e-6, shore - x0) : yShore + ((yEnd - yShore) * (x - shore)) / (xEnd - shore));
      if (shore - x0 > 0.3) slab(b, [x0, y0, z], [shore, yShore, z], 0.18, 0.22, TIMBER_DARK);
      slab(b, [Math.max(x0, shore), y(Math.max(x0, shore)), z], [xEnd, yEnd, z], 0.18, 0.22, TIMBER_DARK);
      for (const x of [shore + 1.0, xEnd - 0.5]) if (x > shore + 0.3 && x < xEnd - 0.2) b.beam([x, -1.9, z], [x, y(x) - 0.2, z], 0.11, 0.11, 0x5d4a38);
      return y;
    });
    return (x) => Math.min(...rails.map((y) => y(x)));
  };

  // the hero's slip: planked from the yard to the water's edge, and its ways on into the water
  const hz = SLIP.z, h0 = hz - 2.1, h1 = hz + 2.1;
  area(k, [[l.x0 + 0.15, h0], ...coastTo(h0, h1, 4, 0.06), [l.x0 + 0.15, h1]], 0xa98b62, 0.055);
  for (let i = 0; i < 6; i++) {
    const z = h0 + 0.3 + 0.68 * i;
    area(k, rect(l.x0 + 0.15, z, Math.min(eastShoreAt(z), eastShoreAt(z + 0.06)) - 0.1, z + 0.06), 0x8a7050, 0.065);
  }
  ways(hz, eastShoreAt(hz) - 0.05, yShore, 1.15);

  // the building slip, north of it, and the ship on its stocks, her bow out over the water on the ways
  const zc = hz - 4.6, xs = l.x0 + 0.8, len = Math.min(8.6, xEnd - 1.4 - xs), x0 = l.x0 + 0.3, y0 = 0.4;
  const way = ways(zc, x0, y0, 0.95);
  const landSlope = (y0 - yShore) / (Math.min(eastShoreAt(zc - 0.95), eastShoreAt(zc + 0.95)) - 0.05 - x0);
  const keelAt = (u: number): number => way(xs) + 0.75 - landSlope * u;
  shipOnStocks(k, xs, len, zc, keelAt, way);

  // the treadwheel crane at the yard's north end, its long jib reaching out over her waist (north of the
  // shed, so that from the view the board is before it)
  const wx = l.x0 + 1.75, wz = l.z0 + 1.2;
  treadwheelCrane(k, wx, wz, [wx + 0.6, 4.5, wz + 0.95], [xs + 4.4, 7.5, zc - 0.5], 4.6);

  // the shipwrights' shed along the yard's west side, open to the east, with the yard's board under its eaves
  const s0 = wz + 1.0, s1 = Math.min(zc - 2.1, s0 + 3.2), sx0 = l.x0 + 0.2, sx1 = l.x0 + 1.75;
  b.box(sx0, 0, s0, sx0 + 0.22, 2.8, s1, TIMBER, { faces: 'NESW' });
  for (const z of [s0, s1 - 0.2]) b.box(sx0, 0, z, sx1, 2.8, z + 0.2, TIMBER, { faces: 'NESW' });
  for (const z of [s0 + 1.2, s1 - 1.25]) b.beam([sx1 - 0.1, 0, z], [sx1 - 0.1, 2.6, z], 0.07, 0.07, TIMBER_DARK);
  b.box(sx1 - 0.18, 2.6, s0, sx1, 2.8, s1, TIMBER_DARK, { faces: 'NESWB' });
  pitched(b, sx0, s0, sx1, s1, 2.8, 1.0, ROOF.shingle, TIMBER, 'z', 0.25);
  b.box(sx0 + 0.22, 0, s0 + 0.2, sx0 + 0.24, 2.8, s1 - 0.2, 0x2a231d, { faces: 'E' });
  const bw = k.sign('driftmark-shipyards', sx1 + 0.13, 2.28, (s0 + s1) / 2, 1, 0, 0.56, s1 - s0 - 0.4);
  b.box(sx1, 1.95, (s0 + s1) / 2 - bw / 2 - 0.12, sx1 + 0.1, 2.6, (s0 + s1) / 2 + bw / 2 + 0.12, TIMBER_DARK, { faces: 'NESWTB' });
  // before it: a bench, a stack of planks, and the master shipwright with his plans
  b.box(sx1 + 0.4, 0.75, s0 + 0.4, sx1 + 1.6, 0.85, s0 + 0.95, OAK, { faces: 'NESWTB' });
  for (const z of [s0 + 0.5, s0 + 0.85]) b.box(sx1 + 0.5, 0.04, z - 0.04, sx1 + 1.5, 0.75, z + 0.04, TIMBER_DARK, { faces: 'NESW' });
  for (let i = 0; i < 4; i++) b.box(sx1 + 0.45, 0.04 + i * 0.16, s1 - 1.25, Math.min(eastShoreAt(s1 - 0.55) - 0.4, sx1 + 2.6), 0.2 + i * 0.16, s1 - 0.55, OAK, { top: 0xc09a6a });
  k.person(sx1 + 1.0, s0 + 0.15);

  // the south end: a capstan to haul boats up, rope, and the pitch kettle on its fire
  const cz = l.z1 - 1.0;
  b.cyl(l.x0 + 2.1, cz, 0.04, 0.95, 0.32, 0.26, 8, TIMBER_DARK, { cap: TIMBER });
  for (const a of [0, Math.PI / 2]) b.beam([l.x0 + 2.1 - Math.cos(a) * 0.95, 0.8, cz - Math.sin(a) * 0.95], [l.x0 + 2.1 + Math.cos(a) * 0.95, 0.8, cz + Math.sin(a) * 0.95], 0.04, 0.04, TIMBER);
  coil(b, l.x0 + 3.4, cz + 0.3, 0.04);
  const px = l.x0 + 0.8, pz = l.z1 - 0.8;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    b.beam([px + Math.cos(a) * 0.45, 0.04, pz + Math.sin(a) * 0.45], [px + Math.cos(a) * 0.25, 0.75, pz + Math.sin(a) * 0.25], 0.04, 0.04, IRONWORK);
  }
  b.cyl(px, pz, 0.55, 1.05, 0.3, 0.36, 7, 0x2e2b29, { cap: 0x151314 });
  fire(k, px, 0.35, pz, 0.22, 6);
  SMOKE.push({ x: px, y: 1.2, z: pz, size: 0.6, shade: 0.55, every: 0.35 });
  k.person(px + 0.9, pz - 0.35);
  k.person(l.x0 + 2.9, cz - 0.35);
  // shipwrights about the yard
  k.person(l.x0 + 0.7, zc + 2.0);
  k.person(wx - 2.2, wz + 1.25);

  k.lights.push({ x: (l.x0 + l.x1) / 2 + 1, z: zc, r: 11, color: '#ffcf8a', k: 0.45 });
}

// ---------------------------------------------------------------------------
// Spicetown
// ---------------------------------------------------------------------------

/**
 * Spicetown, the port that grew from a fishing village near High Tide and
 * filled with ships from the Free Cities: warehouses for spice and cloth from
 * the east with their loft doors and hoists, a counting house of pale stone
 * with a tower under a green copper cap, plastered houses, and a little square
 * open to the road and the quay, with a spice merchant's stall and a well.
 */
function spicetown(k: Build, l: Lot): void {
  const b = k.b, r = rng(4471);
  // the square, paved, and the yard of bales by the board
  const sq = { x0: l.x0 + 4.9, z0: l.z1 - 3.2, x1: l.x0 + 9.2, z1: l.z1 - 0.1 };
  area(k, rect(sq.x0, sq.z0, sq.x1 + 2.4, sq.z1), SETTS, 0.045);

  // the great warehouse on the west, its gable to the road, and a bale hanging from its hoist
  warehouse(k, { x0: l.x0 + 0.3, z0: l.z1 - 4.1, x1: l.x0 + 4.4, z1: l.z1 - 0.3, walls: 3.3, rise: 2.3, wall: SPICE_WALLS[1], roof: ROOF.tile, along: 'z', front: 'S', seed: 5.1 }, CLOTH[0]);
  // the houses along the north, kept low
  townHouse(k, { x0: l.x0 + 0.3, z0: l.z0 + 0.3, x1: l.x0 + 2.3, z1: l.z0 + 2.0, walls: 2.6, rise: 1.4, wall: SPICE_WALLS[4], roof: SPICE_ROOFS[0], along: 'x', front: 'N', seed: 5.3 }, r, l.top);
  townHouse(k, { x0: l.x0 + 2.6, z0: l.z0 + 0.3, x1: sq.x0 - 0.4, z1: l.z0 + 2.0, walls: 2.6, rise: 1.4, wall: SPICE_WALLS[2], roof: SPICE_ROOFS[1], along: 'x', front: 'N', seed: 5.5 }, r, l.top);

  // the counting house on the square's north side, and its tower
  const ch: Bldg = { x0: sq.x0 + 0.1, z0: l.z0 + 0.3, x1: sq.x0 + 2.9, z1: sq.z0 - 0.35, walls: 3.4, rise: 1.6, wall: 0xd8cfbc, roof: ROOF.tileDark, along: 'x', front: 'S', seed: 5.7 };
  walled(b, ch);
  doorway(b, (ch.x0 + ch.x1) / 2, 0, ch.z1, 0, 1, 0.95, 1.9, 1.1, 0x2b231b);
  b.box((ch.x0 + ch.x1) / 2 - 0.75, 0.045, ch.z1, (ch.x0 + ch.x1) / 2 + 0.75, 0.2, ch.z1 + 0.45, 0xcfc6b2, { faces: 'NESWT' });
  const tx0 = ch.x1, tx1 = ch.x1 + 1.6, tz0 = ch.z0 + 0.45, tz1 = tz0 + 1.6, tTop = 5.4;
  b.box(tx0, 0, tz0, tx1, tTop, tz1, 0xd8cfbc, { win: { cell: 1.3, storey: 2.7, lit: 0.55, kind: 0 }, seed: 5.9, faces: 'NESW' });
  b.box(tx0 - 0.15, tTop, tz0 - 0.15, tx1 + 0.15, tTop + 0.25, tz1 + 0.15, 0xc4bba7, { faces: 'NESWTB' });
  lathe(b, (tx0 + tx1) / 2, (tz0 + tz1) / 2, [[((tx1 - tx0) / 2 + 0.3) * Math.SQRT2, tTop + 0.25], [0.05, l.top + 2.6]], 4, ROOF.copper);
  b.cyl((tx0 + tx1) / 2, (tz0 + tz1) / 2, l.top + 2.55, l.top + 2.95, 0.04, 0.04, 4, 0xd9b24a, { cap: false });

  // the warehouse on the east, behind the board
  warehouse(k, { x0: l.x1 - 4.2, z0: l.z0 + 0.3, x1: l.x1 - 0.6, z1: l.z0 + 2.9, walls: 3.2, rise: 1.9, wall: SPICE_WALLS[3], roof: ROOF.tile, along: 'z', front: 'S', seed: 6.1 });

  // the spice merchant's stall: a counter under a striped awning, and open sacks before it
  const st = { x0: sq.x0 + 0.6, z0: sq.z0 + 0.5, x1: sq.x0 + 2.8, z1: sq.z0 + 1.3 };
  b.box(st.x0, 0.045, st.z0, st.x1, 0.9, st.z1, TIMBER, { top: OAK });
  for (const x of [st.x0 + 0.05, st.x1 - 0.05]) b.beam([x, 0.045, st.z0 + 0.05], [x, 2.95, st.z0 + 0.05], 0.05, 0.05, TIMBER_DARK);
  const stripes = 6;
  for (let i = 0; i < stripes; i++) {
    const xa = st.x0 - 0.15 + ((st.x1 - st.x0 + 0.3) * i) / stripes, xb = st.x0 - 0.15 + ((st.x1 - st.x0 + 0.3) * (i + 1)) / stripes;
    slab(b, [(xa + xb) / 2, 3.0, st.z0 - 0.1], [(xa + xb) / 2, 2.45, st.z1 + 0.55], (xb - xa) / 2, 0.04, i % 2 ? 0xf1e6cc : 0xb8323a, { under: i % 2 ? 0xd9ceb4 : 0x93262d });
  }
  SPICE.forEach((c, i) => sack(b, st.x0 + 0.2 + i * 0.4, st.z1 + 0.85 + (i % 2) * 0.15, c, 0.045));
  k.person(st.x1 + 0.45, st.z0 + 0.35, 0.045);
  // the well, and folk in the square
  b.cyl(sq.x1 - 0.5, sq.z1 - 0.9, 0.045, 0.75, 0.42, 0.42, 8, 0xcfc6b2, { cap: 0x2d3d47 });
  for (const [x, z] of [[sq.x0 + 0.5, sq.z1 - 0.4], [sq.x0 + 2.0, sq.z1 - 0.35], [sq.x1 - 1.3, sq.z1 - 0.3], [sq.x1 - 0.2, sq.z0 + 0.4], [st.x1 + 0.4, st.z1 + 0.9]]) k.person(x, z, 0.045);

  // the yard of bales and casks beside the square, behind the board
  const by = sq.x1 + 0.25;
  bale(b, by + 0.5, sq.z0 + 0.5, 0.045, 0, CLOTH[1]);
  bale(b, by + 1.45, sq.z0 + 0.5, 0.045, 0, CLOTH[2]);
  bale(b, by + 0.95, sq.z0 + 0.5, 0.625, 0, CLOTH[5]);
  bale(b, by + 0.5, sq.z0 + 1.2, 0.045, 0, CLOTH[3]);
  barrel(b, by + 1.5, sq.z0 + 1.3, 0.045);
  k.person(by + 1.2, sq.z0 + 2.1, 0.045);
  // bales before the great warehouse's door, and its porters
  bale(b, l.x0 + 1.0, l.z1 + 0.25, 0, Math.PI / 2, CLOTH[4]);
  bale(b, l.x0 + 3.6, l.z1 + 0.3, 0, 0.2, CLOTH[2]);
  k.person(l.x0 + 2.4, l.z1 + 0.5);

  k.lights.push({ x: (sq.x0 + sq.x1) / 2, z: (sq.z0 + sq.z1) / 2, r: 10, color: '#ffcf8a', k: 0.5 }, { x: l.x0 + 2.3, z: l.z1 + 0.6, r: 8, color: '#ffc98a', k: 0.4 });

  // its name, before its south-east corner, beside the road
  nameBoard(k, 'driftmark-spicetown', l.x1 - 2.4, l.z1 - 0.9, 0, undefined, 1.1);
}

// ---------------------------------------------------------------------------
// What stands between the lots: Spicetown's quay, the strand, the fields
// ---------------------------------------------------------------------------

/**
 * Spicetown's quay on the Gullet, between the road and the water: paved, with
 * bales from the east stacked either side of where a hero stands on show,
 * sacks and casks, a crane swinging a bale along it, a cart loaded for the
 * warehouses, bollards along the edge, and lanterns.
 */
function spicetownQuay(k: Build): void {
  const b = k.b, q = QUAY, x0 = q.x - 12.2, x1 = q.x + 10.6;
  // its north edge is the road's south edge as it is laid; its south edge the shore
  const north = (x: number): number => {
    let z = shoreAt(x)[1] - 0.2;
    while (z > shoreAt(x)[1] - 6 && fromRoad(x, z - 0.05) >= LANE + 0.02) z -= 0.05;
    return z;
  };
  const top: P2[] = [];
  for (let x = x0; x <= x1 + 1e-6; x += (x1 - x0) / 22) top.push([x, north(x)]);
  area(k, [...top, ...shoreLine(x1, x0, 's', 0.04)], SETTS, 0.045);
  const edge = (x: number): number => shoreAt(x)[1] - 0.45;

  // the crane at the quay's west end, swinging a bale along it
  const cx = x0 + 3.0, cz = edge(x0 + 3.0) - 0.6;
  b.box(cx - 0.18, 0.045, cz - 0.18, cx + 0.18, 3.0, cz + 0.18, TIMBER_DARK, { top: TIMBER });
  for (const a of [0, Math.PI / 2]) b.obox(cx, 0.17, cz, 0.85, 0.12, 0.12, a, TIMBER_DARK);
  const tip: V3 = [cx + 2.5, 5.5, cz - 0.3];
  b.beam([cx, 0.9, cz], tip, 0.09, 0.07, TIMBER);
  b.beam([cx, 2.9, cz], tip, 0.025, 0.025, ROPE);
  b.beam(tip, [tip[0], 2.5, tip[2]], 0.025, 0.025, ROPE);
  bale(b, tip[0], tip[2], 1.92, 0.4, CLOTH[0]);
  b.box(cx - 0.45, 0.6, cz + 0.25, cx + 0.45, 0.95, cz + 0.55, TIMBER, { faces: 'NESWTB' });
  for (const [px, pz] of [[cx - 0.9, cz - 0.5], [tip[0] - 0.7, tip[2] - 1.0]]) k.person(px, pz, 0.045);

  // bales from the east either side of the hero's place, sacks and casks
  const r = rng(6173);
  const stack = (xa: number, xb: number, za: number, zb: number): void => {
    let c = 0;
    for (let x = xa + 0.5; x <= xb - 0.45; x += 0.98) {
      for (let z = za + 0.35; z <= zb - 0.3; z += 0.66) {
        if (inHeroWay(x, z, 0, 0.6)) continue;
        bale(b, x, z, 0.045, 0, CLOTH[c++ % CLOTH.length]);
        if (r() < 0.6) bale(b, x + (r() - 0.5) * 0.1, z, 0.625, (r() - 0.5) * 0.15, CLOTH[(c + 2) % CLOTH.length]);
      }
    }
  };
  // (the east stack keeps back from the road, where long loads swing wide round its corner)
  stack(q.x - 6.6, q.x - 4.3, north(q.x - 5.5) + 0.25, north(q.x - 5.5) + 2.0);
  stack(q.x + 4.45, q.x + 6.6, north(q.x + 5.5) + 0.85, north(q.x + 5.5) + 2.5);
  for (let i = 0; i < 5; i++) sack(b, q.x - 6.6 + i * 0.45, edge(q.x - 5) - 0.1 - (i % 2) * 0.2, SPICE[i % SPICE.length], 0.045);
  for (const [dx, dz] of [[-10.6, 0.7], [-10.0, 0.9], [-10.3, 1.4], [6.0, 2.5], [6.6, 2.3]]) barrel(b, q.x + dx, north(q.x + dx) + dz, 0.045);
  // a cart loaded for the warehouses, its shafts down, at the quay's east end
  cart(b, x1 - 1.4, north(x1 - 1.4) + 1.6, 1, CLOTH[1]);
  // bollards along the edge, lanterns, and the quay's folk
  for (const dx of [-11.0, -5.2, 5.0, 9.4]) bollard(b, q.x + dx, edge(q.x + dx) + 0.1, 0.045);
  for (const dx of [-11.6, -4.6, 4.6, 9.8]) lantern(k, q.x + dx, north(q.x + dx) + (dx > 0 ? 0.85 : 0.45), 0.045, 2.2, TIMBER_DARK);
  for (const [dx, dz] of [[-5.4, 2.4], [-4.0, 1.6], [4.2, 2.5], [5.6, 2.6], [7.6, 0.9], [-8.4, 1.1], [-7.6, 2.4]]) {
    const px = q.x + dx, pz = north(px) + dz;
    if (!inHeroWay(px, pz, 0, 0.4)) k.person(px, pz, 0.045);
  }
  k.lights.push({ x: q.x, z: q.z - 0.6, r: 12, color: '#ffcf8a', k: 0.42 });
}

/**
 * The strand by High Tide: the island's south-west shore, a wide crescent of
 * sand between the road and the water where a great dragon could lie, as so
 * many came here once. Boats drawn up, driftwood the tides have brought, nets
 * drying, gulls, and a few fishing folk. Its middle, round the island's
 * corner, is left open; and no fire burns on it.
 */
function strand(k: Build): void {
  const b = k.b, r = rng(7207);
  // the road's outer edge, a little out from it, from where the causeway leaves round the corner to its west side
  const west = ROADS.driftmark.reduce((p, c) => (c[0] < p[0] ? c : p));
  const xEnd = ROADS.causeway[0][0] - LANE - 0.5, zStart = west[1] + 1.5;
  const edge = beside(RING, -(LANE + 0.45), true).filter((p) => p[0] <= xEnd && p[1] >= zStart);
  if (edge.length < 4) return;
  const first = edge[0], last = edge[edge.length - 1];
  // and the shore, from the west side round the corners of the island to the south
  const westAt = (z: number): number => {
    let x = Infinity;
    for (let i = 0; i < ISLE.length; i++) {
      const a = ISLE[i], c = ISLE[(i + 1) % ISLE.length];
      if (a[1] === c[1] || (a[1] - z) * (c[1] - z) > 0) continue;
      x = Math.min(x, a[0] + ((c[0] - a[0]) * (z - a[1])) / (c[1] - a[1]));
    }
    return x;
  };
  const corners = ISLE.filter(([x, z]) => x < xEnd && z > last[1]).sort((p, c) => p[0] - c[0]);
  const shore: P2[] = [[westAt(last[1]) + 0.04, last[1]], ...corners.map(([x, z]): P2 => [x + 0.04, z - 0.04]), [first[0], shoreAt(first[0])[1] - 0.04]];
  const sand: P2[] = [...edge, ...shore];
  area(k, sand, STRAND, 0.045);

  /** Whether a place is on the sand with `room` to spare. */
  const on = (x: number, z: number, room: number): boolean => [[0, 0], [room, 0], [-room, 0], [0, room], [0, -room]].every(([dx, dz]) => inside(sand, x + dx, z + dz));
  /** A place `t` of the way along the road's edge, from the causeway round to the west, `back` from it towards the water; and the way inland from there. */
  const along = (t: number, back: number): [number, number, number] => {
    const f = Math.min(edge.length - 1.001, Math.max(0, t * (edge.length - 1))), i = Math.floor(f), s = f - i, p = edge[i], c = edge[i + 1];
    const dx = c[0] - p[0], dz = c[1] - p[1], l = Math.hypot(dx, dz) || 1, x = p[0] + dx * s, z = p[1] + dz * s;
    return [x + (dz / l) * back, z - (dx / l) * back, Math.atan2(dx / l, -dz / l)];
  };

  // boats drawn up near the causeway, their bows inland
  for (const [t, back, len, hull, up] of [[0.12, 1.9, 2.3, 0x5a6f7a, false], [0.24, 1.95, 2.1, 0x8a5a3a, false], [0.36, 1.8, 2.0, 0x6f7c52, true]] as [number, number, number, number, boolean][]) {
    const [x, z, yaw] = along(t, back);
    if (on(x, z, 1.15)) boat(b, x, z, yaw + (r() - 0.5) * 0.3, len, hull, up);
  }
  // driftwood the tides have brought, along the strand but for its middle, and one great trunk with its roots
  for (let i = 0; i < 8; i++) {
    const t = i < 4 ? 0.04 + i * 0.1 + r() * 0.05 : 0.8 + (i - 4) * 0.05 + r() * 0.03, [x, z] = along(t, 0.9 + r() * 1.7);
    const a = r() * Math.PI, l = 0.7 + r() * 0.9, rr = 0.09 + r() * 0.07;
    const pa: P2 = [x - Math.cos(a) * l, z - Math.sin(a) * l], pc: P2 = [x + Math.cos(a) * l, z + Math.sin(a) * l];
    if (!on(pa[0], pa[1], 0.2) || !on(pc[0], pc[1], 0.2)) continue;
    log(b, [pa[0], 0.045 + rr * 0.8, pa[1]], [pc[0], 0.045 + rr * 0.8, pc[1]], rr, BLEACHED, 0xd8d1c2);
  }
  {
    // the great trunk lies along the strand, its roots turned to the water
    const [ax, az] = along(0.84, 2.0), [cx, cz] = along(0.94, 1.9), [wx, wz] = along(0.84, 2.6);
    const ox = wx - ax, oz = wz - az;
    if (on(ax, az, 0.5) && on(cx, cz, 0.4) && on(ax + ox, az + oz, 0.1)) {
      log(b, [ax, 0.3, az], [cx, 0.25, cz], 0.24, BLEACHED, 0xd8d1c2);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        b.beam([ax, 0.3, az], [ax + ox * 0.9 + Math.cos(a) * 0.3, 0.45 + Math.sin(a) * 0.4, az + oz * 0.9 + Math.sin(a) * 0.3], 0.06, 0.03, BLEACHED);
      }
    }
  }
  // nets drying on their poles, a lantern by the boats, gulls, and the fishing folk
  {
    const [ax, az] = along(0.04, 0.9), [cx, cz] = along(0.12, 0.9);
    if (on(ax, az, 0.3) && on(cx, cz, 0.3)) net(b, [ax, az], [cx, cz], 2.0);
    const [lx, lz] = along(0.3, 0.6);
    if (on(lx, lz, 0.3)) lantern(k, lx, lz, 0.045, 2.0, TIMBER_DARK);
  }
  for (let i = 0; i < 7; i++) {
    const [x, z] = along(0.1 + r() * 0.8, 0.6 + r() * 2.4);
    if (!on(x, z, 0.4)) continue;
    const a = r() * Math.PI * 2;
    b.obox(x, 0.2, z, 0.2, 0.1, 0.08, a, 0xf4f2ec, { top: 0xb9bec2 });
    b.obox(x + Math.cos(a) * 0.2, 0.33, z + Math.sin(a) * 0.2, 0.06, 0.06, 0.05, a, 0xf4f2ec);
  }
  for (const [t, back] of [[0.18, 1.0], [0.3, 2.6], [0.92, 1.0]]) {
    const [x, z] = along(t, back);
    if (on(x, z, 0.5)) k.person(x, z, 0.045);
  }
  k.lights.push({ x: along(0.2, 1.5)[0], z: along(0.2, 1.5)[1], r: 8, color: '#ffcf8a', k: 0.3 });
}

/** A farmstead: a thatched house, a barn, a haystack, a yard with a cart, a fence, and a light in the window. */
function farmstead(k: Build, x: number, z: number): void {
  const b = k.b;
  walled(b, { x0: x, z0: z, x1: x + 3.0, z1: z + 2.0, walls: 2.2, rise: 1.4, wall: DAUB, roof: ROOF.thatch, along: 'x', front: 'S', seed: x * 0.7 });
  doorway(b, x + 1.1, 0, z + 2.0, 0, 1, 0.7, 1.45, 0.9, 0x2b231b);
  b.box(x + 2.5, 2.2, z + 0.8, x + 2.85, 3.85, z + 1.15, 0x857464, { top: 0x46403b });
  SMOKE.push({ x: x + 2.67, y: 4.05, z: z + 0.97, size: 0.5, shade: 0.85, every: 0.6 });
  walled(b, { x0: x + 3.4, z0: z + 0.8, x1: x + 6.4, z1: z + 3.4, walls: 2.4, rise: 1.45, wall: 0x7d5f43, roof: ROOF.thatch, along: 'z', front: 'S', seed: x * 0.9, win: { ...HOUSE_WIN, lit: 0.05 } });
  doorway(b, x + 4.9, 0, z + 3.4, 0, 1, 1.4, 1.9, 0.2, 0x2b231b);
  area(k, rect(x - 0.2, z + 2.1, x + 3.3, z + 4.6), YARD, 0.05);
  lathe(b, x + 0.8, z + 3.6, [[0.85, 0.04], [0.8, 1.0], [0.45, 1.7], [0.05, 2.2]], 7, 0xd6bd6a);
  cart(b, x + 2.4, z + 3.9, 1);
  mule(b, x + 5.0, z + 4.25, 1);
  for (let i = 0; i <= 4; i++) b.beam([x - 0.3 + i * 0.95, 0.04, z + 4.75], [x - 0.3 + i * 0.95, 0.8, z + 4.75], 0.05, 0.05, TIMBER);
  b.beam([x - 0.3, 0.65, z + 4.75], [x + 3.5, 0.65, z + 4.75], 0.035, 0.035, TIMBER);
  // hens in the yard
  [[1.3, 2.7], [1.9, 3.3], [2.6, 2.75], [1.55, 3.7], [2.35, 3.55]].forEach(([dx, dz], i) => b.box(x + dx - 0.09, 0.05, z + dz - 0.06, x + dx + 0.09, 0.27, z + dz + 0.06, i % 2 ? 0xf0e6d0 : 0xb5532c));
  k.person(x + 1.8, z + 2.7, 0.05);
  k.lights.push({ x: x + 1.6, z: z + 3.0, r: 8, color: '#ffcf8a', k: 0.4 });
}

/** A smallholding: a thatched cottage, a byre, a kitchen garden in rows, a haystack, and the cottager at the garden. */
function cottage(k: Build, x: number, z: number): void {
  const b = k.b;
  walled(b, { x0: x, z0: z, x1: x + 2.6, z1: z + 1.8, walls: 2.0, rise: 1.3, wall: PLASTER, roof: ROOF.thatch, along: 'x', front: 'S', seed: x * 0.5 + 1 });
  doorway(b, x + 0.8, 0, z + 1.8, 0, 1, 0.65, 1.4, 0.9, 0x2b231b);
  b.box(x + 2.0, 2.0, z + 0.7, x + 2.3, 3.6, z + 1.0, 0x857464, { top: 0x46403b });
  walled(b, { x0: x + 0.2, z0: z + 2.5, x1: x + 2.4, z1: z + 3.9, walls: 1.7, rise: 1.0, wall: 0x7d5f43, roof: ROOF.thatch, along: 'x', front: 'E', seed: x * 0.5 + 2, win: { ...HOUSE_WIN, lit: 0.05 } });
  doorway(b, x + 2.4, 0, z + 3.2, 1, 0, 0.8, 1.3, 0, 0x2b231b);
  area(k, rect(x + 2.95, z + 0.05, x + 4.4, z + 2.2), 0x7a5d3e, 0.05);
  for (let i = 0; i < 4; i++) area(k, rect(x + 3.05, z + 0.2 + i * 0.5, x + 4.3, z + 0.42 + i * 0.5), 0x5f8f3e, 0.062);
  lathe(b, x + 3.6, z + 3.2, [[0.65, 0.04], [0.6, 0.8], [0.35, 1.3], [0.05, 1.7]], 7, 0xd6bd6a);
  k.person(x + 3.7, z + 2.55);
  k.lights.push({ x: x + 1.3, z: z + 2.4, r: 7, color: '#ffcf8a', k: 0.35 });
}

/** The timber yard by the shipyards: logs waiting, sawn baulks, and the sawpit with its two sawyers. */
function timberYard(k: Build, x0: number, z0: number, x1: number, z1: number): void {
  const b = k.b;
  area(k, rect(x0, z0, x1, z1), SAWDUST, 0.05);
  for (let row = 0; row < 3; row++) {
    const y = 0.25 + (row === 2 ? 0.42 : 0), z = z0 + 0.5 + row * 0.46 - (row === 2 ? 0.69 : 0);
    log(b, [x0 + 0.3, y, z], [x1 - 0.3, y, z], 0.22, 0x6f5640, 0xc9a874);
  }
  for (let i = 0; i < 3; i++) b.box(x0 + 0.4, 0.05 + i * 0.26, z0 + 2.0, x1 - 0.5, 0.31 + i * 0.26, z0 + 2.6, OAK, { top: 0xc09a6a });
  // the sawpit: a log on trestles, one sawyer standing on it and one below, the long saw between them
  const sz = z1 - 1.3;
  for (const x of [x0 + 0.9, x1 - 0.9]) {
    b.beam([x - 0.3, 0.05, sz - 0.4], [x, 1.0, sz], 0.05, 0.05, TIMBER_DARK);
    b.beam([x + 0.3, 0.05, sz + 0.4], [x, 1.0, sz], 0.05, 0.05, TIMBER_DARK);
  }
  log(b, [x0 + 0.3, 1.18, sz], [x1 - 0.3, 1.18, sz], 0.2, 0x6f5640, 0xc9a874);
  b.box((x0 + x1) / 2 - 0.04, 0.4, sz + 0.3, (x0 + x1) / 2 + 0.04, 2.6, sz + 0.36, 0x9a9da2, { faces: 'NESWTB' });
  k.person((x0 + x1) / 2, sz, 1.38);
  k.person((x0 + x1) / 2 + 0.2, sz + 0.75, 0.05);
}

/**
 * The fields: the rest of the island, inside the road and out, wherever there
 * is room. Strips of wheat and barley and the plough, hedges, an orchard in
 * blossom, a farmstead, sheep and their shepherd with a fold, a timber yard by
 * the shipyards, and a few trees. Nothing in them stands higher than 4.
 */
function fields(k: Build): void {
  const b = k.b, r = rng(4417);
  const ok = (x: number, z: number, room: number): boolean => open(x, z, room) && fromRoad(x, z) > LANE + room + 0.2;
  const taken: { x0: number; z0: number; x1: number; z1: number }[] = [];
  const free = (x0: number, z0: number, x1: number, z1: number): boolean => !taken.some((t) => x0 < t.x1 && t.x0 < x1 && z0 < t.z1 && t.z0 < z1);
  const fits = (x0: number, z0: number, x1: number, z1: number, room: number): boolean => {
    for (let x = x0; x <= x1 + 1e-6; x += (x1 - x0) / 4) for (let z = z0; z <= z1 + 1e-6; z += (z1 - z0) / 4) if (!ok(x, z, room)) return false;
    return free(x0, z0, x1, z1);
  };

  // the farmstead in the north-east, behind the road's corner, and the timber yard by the shipyards
  const yard = lotOf('shipyards');
  const farm = { x: yard.x0 - 10.6, z: yard.z0 - 2.8 };
  if (fits(farm.x - 0.3, farm.z - 0.2, farm.x + 6.6, farm.z + 4.9, 0.2)) {
    farmstead(k, farm.x, farm.z);
    taken.push({ x0: farm.x - 0.6, z0: farm.z - 0.6, x1: farm.x + 7.0, z1: farm.z + 5.4 });
  }
  const ty = { x0: yard.x0 - 4.4, z0: yard.z0 + 2.9, x1: yard.x0 - 0.6, z1: yard.z0 + 8.1 };
  if (fits(ty.x0, ty.z0, ty.x1, ty.z1, 0.1)) {
    timberYard(k, ty.x0, ty.z0, ty.x1, ty.z1);
    taken.push({ x0: ty.x0 - 0.4, z0: ty.z0 - 0.4, x1: ty.x1 + 0.4, z1: ty.z1 + 0.4 });
  }
  // a smallholding west of the castle, between it and the island's west shore
  const castle = lotOf('castle-driftmark'), sh = { x: castle.x0 - 7.0, z: castle.z0 + 3.2 };
  if (fits(sh.x - 0.3, sh.z - 0.3, sh.x + 4.6, sh.z + 4.2, 0.2)) {
    cottage(k, sh.x, sh.z);
    taken.push({ x0: sh.x - 0.6, z0: sh.z - 0.6, x1: sh.x + 4.9, z1: sh.z + 4.5 });
  }

  // strips running north and south, each as long as the open ground allows, in their crops, some with furrows and some hedged
  const strips = (x0: number, x1: number, z0: number, z1: number, w: number, seed: number): void => {
    const R = rng(seed);
    for (let x = x0; x + w <= x1; x += w + 0.22) {
      let best: [number, number] | null = null, start: number | null = null;
      for (let z = z0; z <= z1 + 1e-6; z += 0.25) {
        const good = [x + 0.1, x + w / 2, x + w - 0.1].every((xx) => ok(xx, z, 0.45)) && free(x, z - 0.12, x + w, z + 0.12);
        if (good && start === null) start = z;
        if ((!good || z + 0.25 > z1 + 1e-6) && start !== null) {
          const end = good ? z : z - 0.25;
          if (!best || end - start > best[1] - best[0]) best = [start, end];
          start = null;
        }
      }
      if (!best || best[1] - best[0] < 2.2) continue;
      const [za, zb] = best, crop = CROPS[Math.floor(R() * CROPS.length)], y = R() < 0.5 ? 0.045 : 0.05;
      area(k, rect(x, za, x + w, zb), crop, y);
      if (crop === CROPS[2] || R() < 0.3) for (let f = 0; f < 3; f++) area(k, rect(x + w * (0.22 + f * 0.28) - 0.05, za + 0.15, x + w * (0.22 + f * 0.28) + 0.05, zb - 0.15), crop === CROPS[2] ? 0x74593c : 0x8aa34e, y + 0.012);
      if (R() < 0.4) {
        b.box(x + w + 0.02, 0, za, x + w + 0.2, 0.55, zb, 0x557d3e, { top: 0x649047 });
        if (R() < 0.6) k.tree(x + w + 0.11, za + (zb - za) * (0.3 + R() * 0.4), 0.45 + R() * 0.08);
      }
    }
  };
  const ring = ROADS.driftmark, xs = ring.map((p) => p[0]), zs = ring.map((p) => p[1]);
  const W = Math.min(...xs), E = Math.max(...xs), N = Math.min(...zs), S = Math.max(...zs);
  // north of the road, between Hull and the farm
  strips(lotOf('hull').x1 + 0.7, farm.x - 0.5, N - 16, N + 2, 2.3, 11);
  // inside the ring, west of Spicetown: strips, and an orchard by the town
  const st = lotOf('spicetown');
  strips(W + 4.5, st.x0 - 9.5, N + 2, S - 2, 2.4, 12);
  for (let x = st.x0 - 8.6; x < st.x0 - 0.9; x += 1.85) {
    for (let z = st.z0 - 0.4; z < st.z1 + 0.6; z += 1.75) {
      const tx = x + (r() - 0.5) * 0.3, tz = z + (r() - 0.5) * 0.3;
      if (ok(tx, tz, 0.9) && free(tx - 0.8, tz - 0.8, tx + 0.8, tz + 0.8)) k.tree(tx, tz, 0.44 + r() * 0.08);
    }
  }

  // the flocks: in the meadow to the south-east with their shepherd and a fold, inside the ring, and west of the castle
  const flock = (cx: number, cz: number, n: number, rad: number, shepherd: boolean): void => {
    let got = 0;
    for (let i = 0; i < n * 8 && got < n; i++) {
      const a = r() * Math.PI * 2, d = rad * Math.sqrt(r()), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (!ok(x, z, 0.7) || !free(x - 0.6, z - 0.6, x + 0.6, z + 0.6)) continue;
      sheep(b, x, z, r() * Math.PI * 2);
      taken.push({ x0: x - 0.6, z0: z - 0.6, x1: x + 0.6, z1: z + 0.6 });
      got++;
    }
    if (shepherd && ok(cx + rad * 0.5, cz, 0.6)) k.person(cx + rad * 0.5, cz);
  };
  const se = { x: E + 1.5, z: S + 1.0 };
  if (fits(se.x - 1.6, se.z - 1.6, se.x + 1.6, se.z + 1.6, 0.2)) {
    // a fold of dry stone, open to the south-east
    for (let i = 0; i < 8; i++) {
      if (i === 1) continue;
      const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2, R = 1.5;
      const p0: P2 = [se.x + Math.cos(a0) * R, se.z + Math.sin(a0) * R], p1: P2 = [se.x + Math.cos(a1) * R, se.z + Math.sin(a1) * R];
      b.obox((p0[0] + p1[0]) / 2, 0.32, (p0[1] + p1[1]) / 2, Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 2 + 0.1, 0.32, 0.18, Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), 0x9e978a, { top: 0xb2ab9d });
    }
    taken.push({ x0: se.x - 1.8, z0: se.z - 1.8, x1: se.x + 1.8, z1: se.z + 1.8 });
    sheep(b, se.x - 0.3, se.z + 0.2, 0.6);
    sheep(b, se.x + 0.4, se.z - 0.4, 2.4);
  }
  flock(se.x - 1.0, se.z + 4.5, 9, 4.0, true);
  flock(W + 8.5, N + 6.5, 5, 2.6, false);
  flock(W - 3.0, N - 6.5, 3, 2.0, false);

  // a few trees: a copse west of the castle, and some along the north shore
  for (let i = 0; i < 26; i++) {
    const x = W - 6 + r() * 7, z = N - 12 + r() * 13;
    if (ok(x, z, 1.4) && free(x - 1, z - 1, x + 1, z + 1) && underBoards(x, z) > 3.8) {
      k.tree(x, z, 0.46 + r() * 0.08);
      taken.push({ x0: x - 1.1, z0: z - 1.1, x1: x + 1.1, z1: z + 1.1 });
    }
  }
}

/** The smoke of the island's chimneys and its pitch, set going: one cloud of puffs for them all. */
function smoke(k: Build): void {
  if (SMOKE.length === 0) return;
  const s = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 70);
  k.group.add(s.mesh);
  const from = SMOKE.splice(0), r = rng(8803), at = new THREE.Vector3(), drift = new THREE.Vector3(0.35, 0.35, 0.18);
  const due = from.map(() => r() * 0.6);
  k.each((dt) => {
    from.forEach((f, i) => {
      due[i] -= dt;
      if (due[i] > 0) return;
      due[i] = f.every * (0.7 + r() * 0.6);
      s.puff(at.set(f.x, f.y, f.z), drift, f.size, f.shade);
    });
    s.update(dt);
  });
}

// ---------------------------------------------------------------------------
// What this file hands over
// ---------------------------------------------------------------------------

export const MODELS: Record<string, Model> = {
  'castle-driftmark': castleDriftmark,
  hull,
  shipyards,
  spicetown,
};

export const COVERS: string[] = [];

export const SIGNS: SignDef[] = [
  nameSign('driftmark-name', 'Driftmark'),
  nameSign('driftmark-hull', 'Hull'),
  nameSign('driftmark-spicetown', 'Spicetown'),
  nameSign('driftmark-shipyards', 'Shipyards'),
  nameSign('driftmark-rope', 'Rope'),
];

export function extras(k: Build): void {
  spicetownQuay(k);
  strand(k);
  fields(k);
  smoke(k);
}

/** The castle's rock is the island's only ground of its own. */
export function heightAt(x: number, z: number): number {
  return inside(CRAG_RINGS.top, x, z) ? CRAG : 0;
}
