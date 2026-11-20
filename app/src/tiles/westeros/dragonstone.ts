// Dragonstone and the Dragonmont.
//
// The island in the mouth of Blackwater Bay: the smoking mountain on its north
// end, with a level shelf of bare rock on its south-east rim where Drogon comes
// down and stands, and the castle at its foot on the south end, of black stone
// that looks poured and not laid, every tower of it a dragon. A small harbour
// lies below the castle's gate on the west shore.
//
// The mountain is a field of heights (terrain.ts's `Field`), drawn here in flat
// facets clipped to the island's shore and to the lot's edges, so that it
// falls into the sea, and stands in sheer cliffs where the lot leaves it no
// room to slope. Everything here is this tile's own drawing from the books'
// plain descriptions.

import * as THREE from 'three';
import { Smoke } from '../../engine/effects';
import { interior, rng, type GeoBuilder, type QuadOpts, type V3, type WinSpec } from '../../engine/geo';
import { oval } from '../../engine/ground';
import { face3, gable, prism, slab, type XZ } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import { heightOn, type Field } from '../../engine/terrain';
import type { Build } from '../../engine/tile';
import { banner, brazier, DARK, fire, nameBoard, nameSign, STONE, TIMBER, TIMBER_DARK } from './look';
import type { Model } from './models';
import { BOARD, EDGE, ISLANDS, lotOf, type Lot, type P2 } from './plan';

// ---------------------------------------------------------------------------
// Colours of the island's own
// ---------------------------------------------------------------------------

const BLACK = STONE.black, SHADE = STONE.blackShade;
/** The castle's carving: a little lighter than its walls, so that a dragon's head reads against them. */
const CARVED = 0x4d4853, GARG = 0x2b292f, MEMBRANE = 0x2a262c, PAVING = 0x4d4950;
/** The mountain: black rock, rust, ash, old flows of black glass, the bare shelf, and the glow in the crater. */
const ROCK = {
  black: STONE.black, shade: STONE.blackShade, rust: 0x5b3427, brown: 0x47302a, ash: 0x6d6661, ashDark: 0x58514f,
  glass: 0x16131b, glassHi: 0x2d2937, shelf: 0x524c4d, shelf2: 0x4a4547, ember: 0x6a1a0a, emberWall: 0x401611,
};
/** Beds of rock in the mountain's cliffs and in its cut face at the board's edge. */
const BEDS = [0x2c292e, 0x46302a, 0x232126, 0x524540, 0x1d1b20, 0x3b2a26];
/** The castle's loops: rows 2.8 high, so that every wall of it ends on a whole row. */
const CASTLE_WIN: WinSpec = { cell: 2.4, storey: 2.8, lit: 0.4, kind: 4 };
const TOWER_WIN: WinSpec = { cell: 1.8, storey: 2.8, lit: 0.5, kind: 4 };
const HALL_WIN: WinSpec = { cell: 1.2, storey: 5.2, lit: 0.55, kind: 6 };
const RED = '#ff3a1c', EMBER = '#ff5a22', EYE = '#ff9a2a';

// ---------------------------------------------------------------------------
// Small solid shapes: a block of eight corners, and a block that tapers along a line
// ---------------------------------------------------------------------------

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** A closed block from eight corners: four round one end, and four round the other in the same order. */
function hexa(b: GeoBuilder, p: V3[], color: number, o: QuadOpts = {}): void {
  const c = mul(p.reduce((s, v) => add(s, v), [0, 0, 0] as V3), 1 / 8);
  const faces = [[0, 1, 2, 3], [7, 6, 5, 4], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]];
  for (const [i, j, m, n] of faces) {
    let nn = unit(cross(sub(p[j], p[i]), sub(p[n], p[i])));
    const mid = mul(add(add(p[i], p[j]), add(p[m], p[n])), 0.25);
    if (dot(nn, sub(mid, c)) < 0) nn = mul(nn, -1);
    b.quad(p[i], p[j], p[m], p[n], nn, color, o);
  }
}

/** A block from `a` to `c`, `w` wide and `h` deep at each end, its depth along `up` as far as it can be. */
function taper(b: GeoBuilder, a: V3, c: V3, up: V3, w0: number, h0: number, w1: number, h1: number, color: number, o: QuadOpts = {}): void {
  const f = unit(sub(c, a));
  let s = cross(f, up);
  if (Math.hypot(...s) < 1e-4) s = cross(f, [1, 0, 0]);
  s = unit(s);
  const u = unit(cross(s, f));
  const ring = (p: V3, w: number, h: number): V3[] => [
    add(add(p, mul(s, -w)), mul(u, -h)), add(add(p, mul(s, w)), mul(u, -h)), add(add(p, mul(s, w)), mul(u, h)), add(add(p, mul(s, -w)), mul(u, h)),
  ];
  hexa(b, [...ring(a, w0, h0), ...ring(c, w1, h1)], color, o);
}

/** A chain of tapering blocks through a row of points: a neck, a tail, a wing's bone. */
function chain(b: GeoBuilder, pts: V3[], sizes: number[], up: V3, color: number): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    // each link reaches a little into the next, so that no seam opens at a bend
    const a = pts[i], c = pts[i + 1], over = mul(sub(c, a), 0.12);
    taper(b, i === 0 ? a : sub(a, over), c, up, sizes[i], sizes[i], sizes[i + 1], sizes[i + 1], color);
  }
}

/** A flat triangle seen from both sides: the skin of a wing. */
function web(b: GeoBuilder, p: V3, q: V3, r: V3, color: number): void {
  const n = unit(cross(sub(q, p), sub(r, p)));
  face3(b, p, q, r, n, color);
  face3(b, p, q, r, mul(n, -1), color);
}

/**
 * A dragon's head carved in stone: a skull, a snout, a jaw that may hang open,
 * horns swept back, and eyes that glow. `f` is the way it looks, `up` the way
 * the top of its head faces, as near as it can, and `S` how big it is.
 */
function dragonHead(k: Build, at: V3, f: V3, up: V3, S: number, o: { open?: number; throat?: boolean; color?: number } = {}): void {
  const b = k.b, color = o.color ?? CARVED, open = o.open ?? 0.1;
  f = unit(f);
  const s = unit(cross(f, up)), u = unit(cross(s, f));
  const P = (a: number, h: number, c: number): V3 => add(add(add(at, mul(f, a * S)), mul(u, h * S)), mul(s, c * S));
  taper(b, P(-0.55, 0, 0), P(0.25, 0.02, 0), u, 0.34 * S, 0.34 * S, 0.3 * S, 0.28 * S, color);
  taper(b, P(0.15, 0.08, 0), P(1.25, -0.02, 0), u, 0.25 * S, 0.19 * S, 0.1 * S, 0.08 * S, color);
  taper(b, P(0.0, -0.22, 0), P(1.05, -0.24 - open * 0.55, 0), u, 0.21 * S, 0.08 * S, 0.07 * S, 0.05 * S, color);
  for (const side of [-1, 1]) taper(b, P(-0.3, 0.22, side * 0.2), P(-1.2, 0.72, side * 0.48), u, 0.09 * S, 0.09 * S, 0.02 * S, 0.02 * S, color);
  // a crest of spines down the back of the skull
  taper(b, P(-0.45, 0.3, 0), P(-0.95, 0.42, 0), u, 0.04 * S, 0.12 * S, 0.02 * S, 0.03 * S, color);
  for (const side of [-1, 1]) {
    const e = P(0.12, 0.2, side * 0.32);
    k.glows.push({ x: e[0], y: e[1], z: e[2], sx: 0.09 * S, sy: 0.07 * S, sz: 0.09 * S, color: EYE });
  }
  if (o.throat) {
    // the inside of the mouth, which glows: a hall's doors, a gate's way in
    taper(b, P(0.2, -0.12, 0), P(0.95, -0.12 - open * 0.3, 0), u, 0.17 * S, 0.12 * S, 0.12 * S, 0.1 * S, DARK, { win: interior(1) });
    const t = P(0.7, -0.2, 0);
    k.glows.push({ x: t[0], y: t[1], z: t[2], sx: 0.12 * S, sy: 0.08 * S, sz: 0.12 * S, color: EMBER });
  }
}

/**
 * A wing folded down a tower's flank as a buttress: the arm from the shoulder
 * up to the wrist, the long fingers down to the ground, and the skin between
 * them and the tower.
 */
function foldedWing(b: GeoBuilder, shoulder: V3, wrist: V3, foot: V3, root: V3, out: V3): void {
  chain(b, [shoulder, wrist], [0.2, 0.15], out, CARVED);
  chain(b, [wrist, foot], [0.15, 0.09], out, CARVED);
  web(b, shoulder, wrist, foot, MEMBRANE);
  web(b, shoulder, foot, root, MEMBRANE);
  // the claw at the wrist, hooked forward
  taper(b, wrist, add(wrist, [0, 0.55, 0]), out, 0.08, 0.08, 0.01, 0.01, CARVED);
}

// ---------------------------------------------------------------------------
// The castle's parts: walls and towers with gargoyles in place of merlons
// ---------------------------------------------------------------------------

/**
 * A row of gargoyles on a wall's outer edge: a beast that juts out over the
 * drop and looks up, and a spike, by turns.
 */
function gargoyles(b: GeoBuilder, a: P2, c: P2, y: number, n: XZ, edge: number): void {
  const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz), out = Math.atan2(n[1], n[0]);
  const count = Math.max(2, Math.round(len / 0.95));
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count, x = a[0] + dx * t + n[0] * edge, z = a[1] + dz * t + n[1] * edge;
    if (i % 2 === 0) {
      b.obox(x + n[0] * 0.18, y + 0.25, z + n[1] * 0.18, 0.32, 0.25, 0.15, out, GARG, { top: SHADE });
      b.obox(x + n[0] * 0.46, y + 0.56, z + n[1] * 0.46, 0.1, 0.12, 0.09, out, GARG);
    } else {
      b.cyl(x - n[0] * 0.05, z - n[1] * 0.05, y, y + 0.72, 0.14, 0, 4, GARG, { cap: false, phase: out });
    }
  }
}

/** The same round a tower's top. */
function ringGargoyles(b: GeoBuilder, cx: number, cz: number, r: number, y: number, count: number, phase = 0): void {
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * Math.PI * 2, nx = Math.cos(a), nz = Math.sin(a), x = cx + nx * (r - 0.12), z = cz + nz * (r - 0.12);
    if (i % 2 === 0) {
      b.obox(x + nx * 0.18, y + 0.25, z + nz * 0.18, 0.32, 0.25, 0.15, a, GARG, { top: SHADE });
      b.obox(x + nx * 0.46, y + 0.56, z + nz * 0.46, 0.1, 0.12, 0.09, a, GARG);
    } else {
      b.cyl(x - nx * 0.05, z - nz * 0.05, y, y + 0.72, 0.14, 0, 4, GARG, { cap: false, phase: a });
    }
  }
}

/**
 * A curtain wall from `a` to `c`, its walk at `top` with a band of parapet on
 * it, and gargoyles along the side away from `inside`.
 */
function curtain(b: GeoBuilder, a: P2, c: P2, y0: number, top: number, thick: number, inside: P2, garg = true): void {
  const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dz, dx);
  const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
  b.obox(mx, (y0 + top) / 2, mz, len / 2, (top - y0) / 2, thick / 2, yaw, BLACK, { top: SHADE, win: CASTLE_WIN, seed: a[0] * 0.13 + a[1] * 0.07 });
  b.obox(mx, top + 0.18, mz, len / 2, 0.18, thick / 2 + 0.06, yaw, BLACK, { top: SHADE });
  if (!garg) return;
  let n: XZ = [-Math.sin(yaw), Math.cos(yaw)];
  if (n[0] * (inside[0] - mx) + n[1] * (inside[1] - mz) > 0) n = [-n[0], -n[1]];
  gargoyles(b, a, c, top + 0.36, n, thick / 2 + 0.06);
}

/** A round tower of the castle: a shaft with loops, a band, and gargoyles round its top. */
function blackTower(b: GeoBuilder, x: number, z: number, r: number, y0: number, top: number, o: { sides?: number; garg?: number; win?: WinSpec } = {}): void {
  const sides = o.sides ?? 10;
  b.cyl(x, z, y0, top, r, r, sides, BLACK, { win: o.win ?? TOWER_WIN, seed: x * 0.11 + z * 0.05, cap: false });
  b.cyl(x, z, top, top + 0.36, r + 0.1, r + 0.1, sides, BLACK, { cap: SHADE });
  if (o.garg !== 0) ringGargoyles(b, x, z, r + 0.1, top + 0.36, o.garg ?? Math.max(6, Math.round(r * 6)), 0.3);
}

// ---------------------------------------------------------------------------
// The Dragonmont: its shape as numbers
// ---------------------------------------------------------------------------

const MONT = lotOf('dragonmont');
const ISLE = ISLANDS.dragonstone;
/** The board's east edge, where the mountain is cut off. */
const CUT = BOARD.x1 - EDGE;
/** The shelf where Drogon stands: level at the lot's top, on the south-east rim and on north along the east edge, where his tail lies. */
const SHELF: [number, number, number, number][] = [
  [95.5, 20.5, MONT.x1, MONT.z1],
  [98, 14.5, MONT.x1, 20.5],
];
/** The crater, north-west of the shelf: its middle, the height of its rim, and how deep it is. */
const CRATER = { x: 93.5, z: 16.5, rim: 27.6, deep: 4 };

/** The grid the heights are worked out on: lines on every edge of the shelf, so that it is level in fact. */
const GRID = { x0: SHELF[0][0] - 10 * 0.625, nx: 24, cx: 0.625, z1: MONT.z1, nz: 25, cz: 0.75 };

const smooth01 = (t: number): number => {
  const v = Math.min(1, Math.max(0, t));
  return v * v * (3 - 2 * v);
};
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));

function distRect(x: number, z: number, r: [number, number, number, number]): number {
  return Math.hypot(Math.max(r[0] - x, 0, x - r[2]), Math.max(r[1] - z, 0, z - r[3]));
}
const toShelf = (x: number, z: number): number => Math.min(...SHELF.map((r) => distRect(x, z, r)));

/** How high the mountain is at a place, before it is cut off at the shore and the lot's edges. */
function mountain(x: number, z: number): number {
  const top = MONT.top;
  const dL = toShelf(x, z);
  if (dL === 0) return top;
  const cx = x - CRATER.x, cz = z - CRATER.z, dC = Math.hypot(cx, cz), th = Math.atan2(cz, cx);
  const floor = CRATER.rim - CRATER.deep;
  let hK: number;
  if (dC < 0.9) hK = floor;
  else if (dC < 1.75) hK = floor + (CRATER.deep - 0.4) * smooth01((dC - 0.9) / 0.85);
  else if (dC < 2.1) hK = CRATER.rim - 0.4 + 0.4 * smooth01((dC - 1.75) / 0.35);
  else {
    // the cone: gentler towards the shelf, steeper to the north, fissured by gullies that run down from the rim
    const slope = 3.0 - 1.5 * Math.max(0, Math.cos(th)) + 0.6 * Math.max(0, -Math.sin(th));
    hK = CRATER.rim - slope * (dC - 2.1);
    hK -= 1.5 * Math.max(0, Math.sin(5 * th + 0.6)) ** 6 * clamp01((dC - 2.4) / 2);
  }
  // the shelf stands on a cliff, and its flanks fall away below that
  const g = Math.min(dL * 24, 6) + 3.2 * Math.max(0, dL - 0.25);
  let h = Math.max(hK, top - g);
  // the flanks are broken and ribbed, but not at the rims
  const far = clamp01(dL / 1.5) * clamp01((dC - 2.4) / 1.2);
  if (far > 0) h += far * Math.min(1, h / 4) * (0.55 * Math.sin(1.9 * x + 0.7 * z) + 0.45 * Math.sin(2.6 * z - 1.3 * x + 1) + 0.3 * Math.sin(4.1 * x + 3.3 * z));
  // the south-west corner stays low: it stands between the Dragon Gate and the opening view
  if (x < 95.25) {
    const west = 0.9 * Math.max(0, 94 - x);
    h = Math.min(h, z >= 20 ? 18 - 2.1 * (z - 20) - west : 18 + 7 * (20 - z) - west);
  }
  return Math.min(top, Math.max(0, h));
}

/** The heights over the grid, as terrain.ts keeps them. */
const FIELD: Field = (() => {
  const { x0, nx, cx, z1, nz, cz } = GRID;
  const z0 = z1 - nz * cz, x1 = x0 + nx * cx;
  const y = new Float32Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) y[j * (nx + 1) + i] = mountain(x0 + i * cx, z0 + j * cz);
  return { x0, z0, x1, z1, nx, nz, y };
})();

/** Where the mountain is cut off: a line, the side it stands on, and how far down its face goes there. */
interface Edge { nx: number; nz: number; c: number; base: number; bed: number }
const EDGES: Edge[] = (() => {
  const e: Edge[] = [
    { nx: -1, nz: 0, c: -89.9, base: -0.3, bed: 4.2 }, // the west cliff, at the lot's edge
    { nx: 0, nz: -1, c: -(MONT.z0 - 0.1), base: -0.3, bed: 4.2 }, // the north cliff, over the beach
    { nx: 0, nz: 1, c: MONT.z1, base: -0.3, bed: 4.2 }, // the south cliff, under the shelf
    { nx: 1, nz: 0, c: CUT, base: 0.01, bed: 3.6 }, // the cut face at the board's edge: the shore's own face is below it
  ];
  // the shore, a hair outside the island's own, down into the sea
  const shore = oval(ISLE.x, ISLE.z, ISLE.rx, ISLE.rz, 22);
  shore.forEach((p, i) => {
    const q = shore[(i + 1) % shore.length];
    let nx = q[1] - p[1], nz = -(q[0] - p[0]);
    const l = Math.hypot(nx, nz);
    nx /= l; nz /= l;
    if (nx * ((p[0] + q[0]) / 2 - ISLE.x) + nz * ((p[1] + q[1]) / 2 - ISLE.z) < 0) { nx = -nx; nz = -nz; }
    e.push({ nx, nz, c: nx * p[0] + nz * p[1] + 0.05, base: -1.6, bed: 4.2 });
  });
  return e;
})();

const outside = (e: Edge, x: number, z: number): number => e.nx * x + e.nz * z - e.c;
const onMountain = (x: number, z: number): boolean => EDGES.every((e) => outside(e, x, z) <= 1e-9);

function clipTo(poly: V3[], e: Edge): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], c = poly[(i + 1) % poly.length], da = outside(e, a[0], a[2]), dc = outside(e, c[0], c[2]);
    if (da <= 0) out.push(a);
    if ((da < 0 && dc > 0) || (da > 0 && dc < 0)) {
      const t = da / (da - dc);
      out.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t]);
    }
  }
  return out;
}

/** Old flows of black glass, down from the rims. */
const FLOWS: P2[][] = [
  [[92.6, 18.3], [92.0, 20.5], [91.3, 23.5], [90.6, 26.6]],
  [[93.0, 14.6], [92.6, 13.0], [92.3, 11.9]],
  [[91.7, 16.1], [89.9, 15.4]],
  [[101.2, 14.3], [101.7, 11.9]],
  [[96.2, 15.0], [97.0, 12.4]],
];
function onFlow(x: number, z: number): boolean {
  for (const f of FLOWS) {
    for (let i = 0; i + 1 < f.length; i++) {
      const [ax, az] = f[i], [bx, bz] = f[i + 1], dx = bx - ax, dz = bz - az;
      const t = clamp01(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz));
      if (Math.hypot(x - ax - dx * t, z - az - dz * t) < 0.55) return true;
    }
  }
  return false;
}

/** The colour of a facet of the mountain, by where it is, how high and how steep. */
function rockColor(y: number, level: number, x: number, z: number): { c: number; win?: WinSpec } {
  if (y > MONT.top - 0.001 && toShelf(x, z) === 0) return { c: Math.sin(x * 0.9 + z * 0.4) + Math.sin(z * 1.3 - x * 0.5) > 0.4 ? ROCK.shelf : ROCK.shelf2 };
  const dC = Math.hypot(x - CRATER.x, z - CRATER.z);
  if (dC < 1.8 && y < CRATER.rim - 0.25) return dC < 1.05 ? { c: ROCK.ember, win: interior(1) } : { c: ROCK.emberWall, win: interior(0.6) };
  if (onFlow(x, z) && y > 0.5) return { c: level > 0.55 ? ROCK.glassHi : ROCK.glass };
  const n = Math.sin(x * 2.1 + z * 0.7) + 0.6 * Math.sin(z * 3.1 - x * 1.7);
  if (level < 0.4) return { c: n > 0 ? ROCK.black : ROCK.shade };
  if (dC < 3.1) return { c: ROCK.rust };
  if (level > 0.72 && y < 8) return { c: n > 0.3 ? ROCK.ash : ROCK.ashDark };
  if (y > 18 && n > 0.6) return { c: ROCK.rust };
  return { c: n > 0.1 ? ROCK.brown : ROCK.black };
}

/** An upright face of the mountain where it is cut off, from `e.base` up to its edge, in beds of rock. */
function cliffFace(b: GeoBuilder, p: V3, q: V3, e: Edge): void {
  const top = Math.max(p[1], q[1]);
  if (top <= Math.max(0.03, e.base + 0.03)) return;
  const n: V3 = [e.nx, 0, e.nz];
  const along = (v: V3): number => (Math.abs(e.nx) > Math.abs(e.nz) ? v[2] : v[0]) + (Math.abs(e.nx) > 0.01 && Math.abs(e.nz) > 0.01 ? v[0] + v[2] : 0);
  const bedTop = (k: number, c: number): number => e.base + (k + 1) * e.bed + 0.8 * Math.sin(c * 0.37 + k * 1.9);
  for (let k = 0; e.base + k * e.bed - 0.8 < top; k++) {
    const a0 = k === 0 ? e.base : Math.max(e.base, bedTop(k - 1, along(p))), a1 = Math.max(a0, Math.min(p[1], bedTop(k, along(p))));
    const c0 = k === 0 ? e.base : Math.max(e.base, bedTop(k - 1, along(q))), c1 = Math.max(c0, Math.min(q[1], bedTop(k, along(q))));
    if (a1 - a0 < 0.01 && c1 - c0 < 0.01) continue;
    const color = BEDS[(k + (e.bed < 4 ? 0 : 1)) % BEDS.length];
    face3(b, [p[0], a0, p[2]], [q[0], c0, q[2]], [q[0], c1, q[2]], n, color);
    face3(b, [p[0], a0, p[2]], [q[0], c1, q[2]], [p[0], a1, p[2]], n, color);
  }
}

/** Draws one facet of the grid, cut off where the mountain is, with a cliff wherever it was cut. */
function facet(b: GeoBuilder, p: V3, q: V3, r: V3): void {
  let poly: V3[] = [p, q, r];
  const inside = poly.every((v) => onMountain(v[0], v[2]));
  if (!inside) {
    for (const e of EDGES) {
      poly = clipTo(poly, e);
      if (poly.length < 3) return;
    }
  }
  // the colour and the tilt are the whole facet's
  const ax = q[0] - p[0], ay = q[1] - p[1], az = q[2] - p[2], bx = r[0] - p[0], by = r[1] - p[1], bz = r[2] - p[2];
  let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
  const l = Math.hypot(nx, ny, nz) || 1;
  if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
  const n: V3 = [nx / l, ny / l, nz / l];
  const low = poly.every((v) => v[1] < 0.03);
  if (!low) {
    const { c, win } = rockColor((p[1] + q[1] + r[1]) / 3, n[1], (p[0] + q[0] + r[0]) / 3, (p[2] + q[2] + r[2]) / 3);
    for (let i = 1; i + 1 < poly.length; i++) face3(b, poly[0], poly[i], poly[i + 1], n, c, { win });
  }
  if (inside) return;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], c = poly[(i + 1) % poly.length];
    for (const e of EDGES) {
      if (Math.abs(outside(e, a[0], a[2])) < 1e-6 && Math.abs(outside(e, c[0], c[2])) < 1e-6) {
        cliffFace(b, a, c, e);
        break;
      }
    }
  }
}

const dragonmont: Model = (k) => {
  const b = k.b, f = FIELD, W = f.nx + 1;
  const at = (i: number, j: number): V3 => [f.x0 + i * GRID.cx, f.y[j * W + i], f.z0 + j * GRID.cz];
  for (let j = 0; j < f.nz; j++) {
    for (let i = 0; i < f.nx; i++) {
      // each square is cut from its north-west corner to its south-east, as heightOn reads it
      facet(b, at(i, j), at(i + 1, j), at(i + 1, j + 1));
      facet(b, at(i, j), at(i + 1, j + 1), at(i, j + 1));
    }
  }

  // the crater glows: a dull red by day, a fire by night, and a red pool on the rock round it
  const floor = CRATER.rim - CRATER.deep;
  k.glows.push({ x: CRATER.x, y: floor + 0.15, z: CRATER.z, sx: 1.1, sy: 0.25, sz: 1.1, color: EMBER });
  k.glows.push({ x: CRATER.x + 0.2, y: floor + 0.6, z: CRATER.z - 0.1, sx: 0.6, sy: 0.35, sz: 0.6, color: RED });
  k.lights.push({ x: CRATER.x, z: CRATER.z, r: 9, color: '#ff4a26', k: 0.6 });

  // a thin plume, always, drifting east on the wind off the bay
  const smoke = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 70);
  k.group.add(smoke.mesh);
  const from = new THREE.Vector3(), drift = new THREE.Vector3(0.7, 1.4, 0.2);
  let due = 0, n = 0;
  k.each((dt) => {
    due -= dt;
    if (due <= 0) {
      due = 0.2;
      n++;
      smoke.puff(from.set(CRATER.x + 0.35 * Math.sin(n * 1.7), floor + 1.2, CRATER.z + 0.35 * Math.cos(n * 2.3)), drift, 0.9 + 0.25 * Math.sin(n * 0.7), 0.3);
    }
    smoke.update(dt);
  });

  // columns of black rock against the sheer faces under the shelf, none of them higher than 22 within the dragon's air
  const cols = rng(9113);
  const column = (x: number, z: number, h: number, w: number, d: number, out: V3): void => {
    const foot: V3 = [x + out[0] * d * 0.5, -0.2, z + out[2] * d * 0.5], head: V3 = [x + out[0] * 0.1, h, z + out[2] * 0.1];
    taper(b, foot, head, out, w, d * 0.5, w * 0.6, 0.12, cols() > 0.5 ? ROCK.black : ROCK.shade);
  };
  for (let x = SHELF[0][0] + 0.35; x < CUT - 0.3; x += 0.55 + cols() * 0.35) column(x, MONT.z1, 7 + cols() * 14, 0.22 + cols() * 0.18, 0.7 + cols() * 1.2, [0, 0, 1]);
  for (let z = SHELF[0][1] + 0.4; z < MONT.z1 - 0.3; z += 0.6 + cols() * 0.4) column(SHELF[0][0] - 0.5, z, 9 + cols() * 8, 0.2 + cols() * 0.15, 0.5 + cols() * 0.8, [-1, 0, 0]);

  // fallen rock at the cliffs' feet, low, and only where the island is
  const rand = rng(4407);
  const rocks: [number, number, number, number][] = [
    [96.6, 28.3, 103.2, 29.3], [88.5, 15.5, 89.7, 27.5], [91.6, 10.6, 101, 11.7],
  ];
  for (const [x0, z0, x1, z1] of rocks) {
    for (let i = 0; i < 6; i++) {
      const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0), r = 0.35 + rand() * 0.45;
      if (((x - ISLE.x) / ISLE.rx) ** 2 + ((z - ISLE.z) / ISLE.rz) ** 2 > 0.93) continue;
      b.cyl(x, z, -0.1, 0.5 + rand() * 1.1, r, r * 0.45, 5, rand() > 0.5 ? ROCK.black : ROCK.brown, { cap: ROCK.shade, phase: rand() * 3 });
    }
  }
};

// ---------------------------------------------------------------------------
// Dragonstone: the castle
// ---------------------------------------------------------------------------

const dsCastle: Model = (k, l: Lot) => {
  const b = k.b;
  // the lot as eight by eight: everything is placed in those units, so that it stretches with the lot
  const sx = (l.x1 - l.x0) / 8, sz = (l.z1 - l.z0) / 8, sr = Math.min(sx, sz);
  const U = (u: number): number => l.x0 + u * sx, V = (v: number): number => l.z0 + v * sz;
  const P = (u: number, v: number): P2 => [U(u), V(v)];
  const Y0 = 0.35; // the rock it stands on
  const mid: P2 = P(4, 4);

  // the rock under it all, out of the sea at its south-west corner
  b.box(U(0.1), -1.6, V(0.1), U(7.9), Y0, V(7.9), 0x2c2a2f, { top: PAVING });

  // --- the three curtain walls, one inside another, stepping up towards the mountain ---
  const T1 = 5.6, T2 = 8.4, T3 = 11.2;
  // the outer: low to the south and the east; to the west and the north it is the middle wall's height
  curtain(b, P(0.625, 7.375), P(7.375, 7.375), Y0, T1, 0.65 * sr, mid);
  curtain(b, P(7.375, 0.625), P(7.375, 7.375), Y0, T1, 0.65 * sr, mid);
  curtain(b, P(0.625, 5.4), P(0.625, 7.375), Y0, T1, 0.65 * sr, mid);
  curtain(b, P(5.0, 0.625), P(7.375, 0.625), Y0, T1, 0.65 * sr, mid);
  curtain(b, P(0.625, 0.625), P(0.625, 5.4), Y0, T2, 0.65 * sr, mid);
  curtain(b, P(0.625, 0.625), P(5.0, 0.625), Y0, T2, 0.65 * sr, mid);
  // the middle, round the ward of the keep
  const inner: P2 = P(2.84, 3.04);
  curtain(b, P(0.625, 5.4), P(5.0, 5.4), Y0, T2, 0.55 * sr, inner);
  curtain(b, P(5.0, 0.625), P(5.0, 5.4), Y0, T2, 0.55 * sr, inner);
  // the ward inside it is raised
  b.quad([U(0.95), 2.8, V(5.125)], [U(4.725), 2.8, V(5.125)], [U(4.725), 2.8, V(0.95)], [U(0.95), 2.8, V(0.95)], [0, 1, 0], PAVING);
  // towers where the walls meet
  blackTower(b, U(0.625), V(0.625), 0.85 * sr, Y0, T2);
  blackTower(b, U(0.625), V(7.375), 0.8 * sr, -1.6 + 1.95, T1);
  blackTower(b, U(0.625), V(5.4), 0.6 * sr, Y0, T2, { garg: 6 });
  blackTower(b, U(5.0), V(0.625), 0.6 * sr, Y0, T2, { garg: 6 });
  blackTower(b, U(5.0), V(5.4), 0.7 * sr, Y0, T3);

  // --- the Stone Drum: the third wall a ring round its foot, and the great drum tower on it ---
  const [dx, dz] = inner, ring = 1.8 * sr, drum = 1.3 * sr;
  b.cyl(dx, dz, 2.8, T3, ring, ring, 14, BLACK, { win: CASTLE_WIN, seed: 3.1, cap: false });
  b.cyl(dx, dz, T3, T3 + 0.35, ring + 0.1, ring + 0.1, 14, BLACK, { cap: SHADE });
  ringGargoyles(b, dx, dz, ring + 0.1, T3 + 0.35, 14, 0.2);
  b.cyl(dx, dz, T3 + 0.35, 16.8, drum, drum, 12, BLACK, { win: TOWER_WIN, seed: 1.7, cap: false });
  // bands round it, as round a drum
  for (const y of [13.86, 16.66]) b.cyl(dx, dz, y, y + 0.2, drum + 0.07, drum + 0.07, 12, SHADE, { cap: false });
  b.cyl(dx, dz, 16.8, 18.6, drum + 0.2, drum + 0.2, 12, BLACK, { cap: SHADE });
  b.cyl(dx, dz, 16.6, 16.8, drum + 0.2, drum, 12, SHADE, { cap: false });
  ringGargoyles(b, dx, dz, drum + 0.2, 18.6, 12, 0.1);
  // red light in its windows, on the side the view opens on
  for (const [a, y] of [[0.75, 12.6], [1.05, 15.4], [0.45, 15.4]]) {
    k.glows.push({ x: dx + Math.cos(a) * (drum + 0.04), y, z: dz + Math.sin(a) * (drum + 0.04), sx: 0.14, sy: 0.55, sz: 0.14, color: RED });
  }
  banner(b, dx + 0.45 * sr, dz - 0.2, 18.6, 'targaryen', 3.5, 0.8);
  brazier(k, dx - 0.55 * sr, dz + 0.3, 18.6);
  k.person(dx + 0.3, dz + 0.75, 18.6);

  // --- Windwyrm: a dragon that screams at the sky, on the north-east corner ---
  const wx = U(7.0), wz = V(1.0), wr = 1.0 * sr, wTop = 14.0;
  blackTower(b, wx, wz, wr, Y0, wTop, { garg: 0 });
  b.cyl(wx, wz, wTop, wTop + 0.4, wr + 0.12, wr * 0.8, 10, BLACK, { cap: SHADE });
  // the neck up out of its shoulders, and the head flung back, jaws wide
  chain(b, [[wx, wTop + 0.1, wz + 0.05], [wx, wTop + 1.5, wz + 0.3], [wx, wTop + 2.7, wz + 0.42]], [0.62, 0.5, 0.4], [0, 0, -1], CARVED);
  dragonHead(k, [wx, wTop + 3.75, wz + 0.5], [0, 1, 0.38], [0, 0.2, -1], 1.3, { open: 1, throat: true });
  for (const s of [-1, 1]) {
    foldedWing(b, [wx + s * 0.85 * wr, 12.6, wz + 0.1], [wx + s * 1.75 * wr, wTop + 0.7, wz + 0.25], [wx + s * 1.55 * wr, Y0, wz + 0.45], [wx + s * 0.95 * wr, Y0, wz + 0.2], [s, 0, 0]);
  }
  k.glows.push({ x: wx + 0.5, y: 9.8, z: wz + 0.86, sx: 0.12, sy: 0.5, sz: 0.12, color: RED });

  // --- the Sea Dragon Tower: a dragon that sits and looks calmly out to sea, on the south-east corner ---
  const tx = U(6.95), tz = V(6.95), tr = 1.05 * sr, tTop = T3;
  const look = unit([1, 0, 0.6]), side: V3 = [-look[2], 0, look[0]];
  const T = (a: number, y: number, c: number): V3 => [tx + look[0] * a + side[0] * c, y, tz + look[2] * a + side[2] * c];
  blackTower(b, tx, tz, tr, Y0, tTop, { garg: 0 });
  b.cyl(tx, tz, tTop, tTop + 0.4, tr + 0.12, tr * 0.85, 10, BLACK, { cap: SHADE });
  chain(b, [T(0.25, tTop + 0.1, 0), T(0.75, tTop + 1.5, 0), T(1.05, tTop + 2.6, 0)], [0.6, 0.48, 0.4], [0, 1, 0], CARVED);
  dragonHead(k, T(1.3, tTop + 3.1, 0), [look[0], -0.12, look[2]], [0, 1, 0], 1.2, { open: 0.05 });
  for (const s of [-1, 1]) {
    // folded wings down its flanks, and its forelegs before it
    foldedWing(b, T(-0.1, 9.8, s * 0.85 * tr), T(-0.3, tTop + 1.1, s * 1.65 * tr), T(-0.4, Y0, s * 1.45 * tr), T(-0.2, Y0, s * 0.95 * tr), [side[0] * s, 0, side[2] * s]);
    chain(b, [T(0.85 * tr, 3.4, s * 0.45), T(1.15 * tr, 1.2, s * 0.5), T(1.25 * tr, Y0 + 0.15, s * 0.5)], [0.24, 0.2, 0.16], look, CARVED);
    taper(b, T(1.2 * tr, Y0 + 0.12, s * 0.5), T(1.55 * tr, Y0 + 0.05, s * 0.5), [0, 1, 0], 0.2, 0.1, 0.08, 0.04, CARVED);
  }
  k.glows.push({ x: tx + look[0] * (tr + 0.04), y: 7.0, z: tz + look[2] * (tr + 0.04), sx: 0.14, sy: 0.5, sz: 0.14, color: RED });

  // --- the Great Hall: a dragon lying on its belly in the east ward, its open mouth its doors ---
  const hx0 = U(5.4), hx1 = U(6.95), hz0 = V(2.1), hz1 = V(5.55), hcx = (hx0 + hx1) / 2;
  b.box(hx0, Y0, hz0, hx1, 5.2, hz1, BLACK, { win: HALL_WIN, seed: 2.3 });
  b.box(hx0 - 0.08, 5.2, hz0 - 0.08, hx1 + 0.08, 5.45, hz1 + 0.08, BLACK, { top: SHADE, faces: 'NESWB' });
  gable(b, hx0, hz0, hx1, hz1, 5.45, 1.3, SHADE, BLACK, 'z', 0.12);
  // the spines down its back, tallest over its shoulders
  for (let z = hz0 + 0.25; z < hz1 - 0.1; z += 0.42) {
    const t = (z - hz0) / (hz1 - hz0), h = 0.4 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 1.25));
    b.cyl(hcx, z, 6.6, 6.65 + h, 0.2, 0, 4, CARVED, { cap: false, phase: Math.PI / 4 });
  }
  // its forefeet on the ward, by the neck
  for (const z of [hz1 - 0.7, hz0 + 0.6]) taper(b, [hx0 - 0.02, 1.6, z], [hx0 - 0.45, Y0 + 0.05, z - 0.1], [-1, 0, 0], 0.22, 0.2, 0.16, 0.14, CARVED);
  // the neck turns west at the south end, and the head lies on the ward with its jaws open
  chain(b, [[hcx, 4.0, hz1 - 0.3], [U(5.9), 3.3, V(6.15)], [U(5.25), 2.85, V(6.42)]], [0.62, 0.52, 0.44], [0, 1, 0], CARVED);
  dragonHead(k, [U(4.55), 2.6, V(6.42)], [-1, -0.05, 0], [0, 1, 0], 1.2, { open: 0.9, throat: true });
  // the tail curls round in the north of the ward, a wall that bends
  chain(b, [[hcx + 0.2, 1.8, hz0 + 0.1], [U(5.85), 1.35, V(1.65)], [U(5.55), 0.95, V(1.3)], [U(5.85), 0.7, V(1.05)]], [0.42, 0.32, 0.22, 0.1], [0, 1, 0], CARVED);

  // --- the gate: a dragon's jaws in the south wall, opening onto the quay ---
  const g0 = U(1.3), g1 = U(3.3), gc = (g0 + g1) / 2, gz = V(8.3), gTop = 7.2;
  b.box(g0, Y0, V(6.95), g1, gTop, gz, BLACK, { top: SHADE });
  // the throat
  b.box(U(1.75), Y0 + 0.1, gz, U(2.85), 3.0, gz + 0.04, DARK, { faces: 'S', win: interior(1) });
  // the lower jaw, a step out onto the quay, with its teeth up
  b.box(U(1.45), Y0, gz, U(3.15), 0.8, V(9.2), CARVED, { top: SHADE });
  // the upper jaw overhangs, its teeth down
  b.box(U(1.35), 3.0, gz, U(3.25), 3.75, V(9.0), CARVED, { faces: 'NESWTB', top: SHADE });
  for (let i = 0; i < 4; i++) {
    const x = U(1.6 + i * 0.47);
    b.cyl(x, V(9.05), 0.8, 1.3, 0.13, 0, 4, 0x8e8780, { cap: false });
    b.cyl(x + 0.2, V(8.88), 2.45, 3.0, 0, 0.13, 4, 0x8e8780, { cap: false });
  }
  // the snout, the brows, the eyes and the horns
  taper(b, [gc, 4.0, gz - 0.05], [gc, 3.85, V(9.05)], [0, 1, 0], 0.55, 0.18, 0.4, 0.12, CARVED);
  b.box(g0, 4.6, gz, g1, 5.0, gz + 0.3, CARVED, { top: SHADE });
  for (const s of [-1, 1]) {
    k.glows.push({ x: gc + s * 0.55 * sx, y: 4.35, z: gz + 0.05, sx: 0.22, sy: 0.13, sz: 0.05, color: EYE });
    taper(b, [gc + s * 0.9 * sx, gTop - 0.6, V(7.9)], [gc + s * 1.6 * sx, gTop + 1.4, V(7.0)], [0, 0, -1], 0.16, 0.16, 0.03, 0.03, CARVED);
    fire(k, gc + s * 1.15 * sx, 2.5, gz + 0.12, 0.25, 7);
  }
  gargoyles(b, [g0, V(6.95)], [g1, V(6.95)], gTop, [0, -1], 0.1);
  banner(b, gc, V(7.3), gTop, 'targaryen', 3, 0.7);

  // fire and light on the walls and in the wards
  brazier(k, U(4.6), V(7.375), T1 + 0.36);
  brazier(k, U(7.375), V(3.4), T1 + 0.36);
  brazier(k, U(3.0), V(5.4), T2 + 0.36);
  k.lights.push({ x: U(3.2), z: V(6.4), r: 9, color: '#ffb070', k: 0.5 });
  k.lights.push({ x: U(3.6), z: V(6.4), r: 6, color: '#ff6a3a', k: 0.45 });
  k.lights.push({ x: U(6.0), z: V(3.5), r: 8, color: '#ffcf8a', k: 0.4 });
  banner(b, U(0.625), V(0.625), T2 + 0.36, 'targaryen', 3.2, 0.7);
  banner(b, U(5.0), V(5.4), T3 + 0.36, 'targaryen', 3.2, 0.7);

  // guards on the walks, and folk in the south ward before the hall's mouth
  for (const [u, v, y] of [[4.0, 7.375, T1 + 0.36], [5.3, 7.375, T1 + 0.36], [7.375, 2.4, T1 + 0.36], [7.375, 4.6, T1 + 0.36], [1.8, 5.4, T2 + 0.36], [0.625, 3.0, T2 + 0.36], [3.2, 6.3, Y0], [3.8, 6.85, Y0], [1.9, 6.4, Y0]]) {
    k.person(U(u), V(v), y);
  }
};

// ---------------------------------------------------------------------------
// The harbour, the names, and the island round them
// ---------------------------------------------------------------------------

/** A ship of the island's: a hull, a deck, a stern castle, a mast no higher than 9, and a black sail with a red band. */
function ship(k: Build, x: number, z0: number, z1: number): void {
  const b = k.b, h = 1.2, mid = (z0 + z1) / 2;
  const lower: XZ[] = [[x, z0 + 0.4], [x + 0.9, z0 + 1.8], [x + 0.9, z1 - 1.0], [x + 0.4, z1 - 0.1], [x - 0.4, z1 - 0.1], [x - 0.9, z1 - 1.0], [x - 0.9, z0 + 1.8]];
  const upper: XZ[] = [[x, z0], [x + h, z0 + 1.6], [x + h, z1 - 0.8], [x + 0.6, z1], [x - 0.6, z1], [x - h, z1 - 0.8], [x - h, z0 + 1.6]];
  prism(b, lower, -1.2, -0.1, TIMBER_DARK);
  prism(b, upper, -0.1, 0.8, TIMBER_DARK, { top: TIMBER });
  // a red strake along its side
  prism(b, upper.map(([px, pz]): XZ => [x + (px - x) * 1.02, mid + (pz - mid) * 1.004]), 0.45, 0.62, 0xa0171c, { top: false });
  b.box(x - 0.9, 0.8, z1 - 1.5, x + 0.9, 2.0, z1 - 0.15, TIMBER, { top: TIMBER_DARK });
  b.box(x - 0.6, 0.8, z0 + 0.6, x + 0.6, 1.4, z0 + 1.6, TIMBER, { top: TIMBER_DARK });
  const mz = mid - 0.5;
  b.cyl(x, mz, 0.8, 8.8, 0.15, 0.09, 6, TIMBER_DARK, { cap: false });
  b.beam([x - 1.7, 7.9, mz], [x + 1.7, 7.9, mz], 0.07, 0.07, TIMBER);
  b.box(x - 1.55, 4.3, mz - 0.05, x + 1.55, 7.8, mz + 0.05, 0x1d1d20, { faces: 'NSTB' });
  b.box(x - 1.55, 5.5, mz - 0.08, x + 1.55, 6.4, mz + 0.08, 0xb3141c, { faces: 'NSTB' });
  for (const [ez, ey] of [[z0 + 0.1, 1.0], [z1 - 0.3, 2.0]]) b.beam([x, 8.6, mz], [x, ey, ez], 0.03, 0.03, 0xc9c2b2);
  banner(b, x, z1 - 0.6, 2.0, 'targaryen', 2.4, 0.55);
  k.glows.push({ x, y: 2.5, z: z1 - 0.2, sx: 0.18, sy: 0.25, sz: 0.18, color: '#ffcf8a' });
  k.person(x + 0.3, mid + 1.5, 0.8);
  k.person(x - 0.4, z1 - 0.8, 2.0);
}

function extras(k: Build): void {
  const b = k.b, c = lotOf('ds-castle');
  // the quay: along the castle's west foot, and round under its gate
  const qx0 = c.x0 - 2.4, qTop = 0.45;
  b.box(qx0, -1.6, c.z0 + 0.8, c.x0 + 0.05, qTop, c.z1, 0x38353b, { faces: 'NEWT', top: 0x4a464b });
  b.box(qx0, -1.6, c.z1, c.x0 + 5.9, qTop, c.z1 + 3, 0x38353b, { top: 0x4a464b });
  // bollards, barrels, a crate, a brazier at the end of the quay, and folk at work
  for (const z of [c.z0 + 2, c.z0 + 4.5, c.z0 + 7]) b.cyl(qx0 + 0.35, z, qTop, qTop + 0.45, 0.17, 0.14, 6, 0x232126, { cap: 0x3a373d });
  for (const [x, z] of [[c.x0 - 1.1, c.z0 + 5.2], [c.x0 - 0.5, c.z0 + 5.5], [c.x0 - 0.8, c.z0 + 5.9], [c.x0 - 0.4, c.z0 + 4.8]]) {
    b.cyl(x, z, qTop, qTop + 0.75, 0.28, 0.28, 7, 0x7a5638, { cap: 0x5b4634 });
  }
  b.box(c.x0 - 1.3, qTop, c.z0 + 3.0, c.x0 - 0.3, qTop + 0.7, c.z0 + 3.8, 0x8a6a46, { top: 0x9c7b52 });
  slab(b, [qx0 - 1.2, 0.82, c.z0 + 6.4], [qx0 + 0.3, qTop + 0.02, c.z0 + 6.4], 0.35, 0.08, TIMBER);
  brazier(k, qx0 + 0.5, c.z1 + 2.5, qTop);
  k.lights.push({ x: c.x0 + 1.5, z: c.z1 + 1.6, r: 9, color: '#ffcf8a', k: 0.45 });
  for (const [x, z] of [[c.x0 - 1.4, c.z0 + 6.6], [c.x0 - 0.6, c.z0 + 2.4], [c.x0 + 1.0, c.z1 + 2.2], [c.x0 + 3.4, c.z1 + 1.9], [c.x0 - 1.6, c.z1 + 1.2]]) k.person(x, z, qTop);
  ship(k, qx0 - 1.8, c.z0 + 1.0, c.z0 + 10.0);

  // the names: the castle's beside it to the south-east, the mountain's at the foot of its cliff
  nameBoard(k, 'dragonstone-name', c.x1 + 2.6, c.z1 - 1.0, 0, undefined, 1.1);
  nameBoard(k, 'dragonstone-mont', MONT.x1 - 3.0, MONT.z1 + 2.9, 0, undefined, 1.0);
  // two who have come to look up at the shelf
  k.person(MONT.x1 - 5.6, MONT.z1 + 4.6);
  k.person(MONT.x1 - 4.9, MONT.z1 + 5.2);
}

export const MODELS: Record<string, Model> = { dragonmont, 'ds-castle': dsCastle };
export const COVERS: string[] = [];
export const SIGNS: SignDef[] = [nameSign('dragonstone-name', 'Dragonstone'), nameSign('dragonstone-mont', 'Dragonmont')];
export const FLOORED: string[] = [];

export function heightAt(x: number, z: number): number {
  return onMountain(x, z) ? heightOn(FIELD, x, z) : 0;
}

export { extras };
