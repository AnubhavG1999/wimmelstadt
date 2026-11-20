// The Reach: Highgarden on its hill above the Mander, and Oldtown on the
// Sunset Sea, with the Hightower on Battle Isle, the Citadel and the Starry
// Sept on the south shore, and the two bridges the roads cross by.
//
// Everything is drawn from the books' plain descriptions and is this tile's
// own drawing.
//
// Highgarden is three rings of white walls, one inside another, each standing
// on a terrace of the hill a step higher than the one outside it: the briar
// maze lies between the outer wall and the middle one, groves and fountains
// between the middle and the inner, and in the inner court the cluster of
// towers, old square ones and newer slender round ones with green cones. The
// Hightower is a black windowless base with three pale tiers stepped in
// above it and the great beacon on its top.

import * as THREE from 'three';
import { Flames } from '../../engine/effects';
import { interior, rng, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { area, rect, terrace } from '../../engine/ground';
import { archway, lathe, roundel, figure } from '../../engine/parts';
import { beacon, chamfered, face3, gable, hip, prism, railing, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import {
  DARK, DOOR, HOUSE_WIN, IRONWORK, LOOPS_CLOSE, ROOF, STONE, TIMBER, TIMBER_DARK,
  banner, brazier, fire, nameBoard, nameSign, roundTower, squareTower,
} from './look';
import type { Model } from './models';
import { COAST_WEST, ISLANDS, ROADS, TURNS, lotOf, type Lot, type P2 } from './plan';

// ---------------------------------------------------------------------------
// Colours of this file's own (worth moving to look.ts if another region wants them)
// ---------------------------------------------------------------------------

/** The green of the Tyrells' cone roofs. */
const GREEN_ROOF = 0x4e8a46;
/** Briar hedges, ivy, and the roses on them. */
const HEDGE = 0x2e5a2c, HEDGE_TOP = 0x3b6b36, IVY = 0x4f8040, ROSE_RED = 0xc4283c, ROSE_GOLD = 0xf0c63c;
const LAWN = 0x79ad5c, LAWN_HIGH = 0x84b866, GRAVEL = 0xd9cfb2, BANK = 0x7aac5a, PAVE = 0xe0d9c6;
/** The pale stone of the Hightower's tiers, and of the Citadel. */
const PALE = 0xe6e0d2, PALE_SHADE = 0xc9c2b2;
/** The green stone of the Citadel's sphinxes. */
const SPHINX = 0x4f8f68;
const WATER_TOP = 0x86bcd6, HULL = 0x6b4a30, HULL_DARK = 0x4a3322, DECK = 0xa88a62, SAIL = 0xefe6d0;
const HOUSE_STONE = [0xd6ccb4, 0xc8bca2, 0xe0d6c0, 0xbcae94, 0xd2c3a6];

/** Small windows, for a wall whose walk is not a whole number of LOOPS above the ground: as many rows as fit. */
const loopsTo = (walk: number, rows: number, lit = 0.3): WinSpec => ({ cell: 2.4, storey: walk / rows, lit, kind: 4 });

const SE: V3 = [0.669, 0, 0.743];

// ---------------------------------------------------------------------------
// Highgarden
// ---------------------------------------------------------------------------

/** How high the floor inside each ring stands: the terraces of the hill. */
const FLOOR = { 'hg-outer': 4, 'hg-mid': 7.5, 'hg-inner': 11 } as Record<string, number>;
/** How high the hill's foot stands against the outer wall, and how far out it reaches on each side. */
const BANK_H = 1.5, BANK_W = { N: 1.4, S: 3, W: 1.4, E: 0.9 };
/** The apron in front of the great stair, where the bank is cut away. */
const APRON = { x0: -43, x1: -25 };

interface RingOpts {
  base: number; thick: number; gateW: number; gateR: number;
  corner: { round: boolean; r: number; cone?: number };
  win: WinSpec;
}

/** Merlons along a stretch of wall's outer edge that runs along x, between two heights. */
function merlonsX(b: GeoBuilder, xa: number, xb: number, z0: number, z1: number, y0: number, y1: number): void {
  if (xb - xa < 0.6) return;
  const n = Math.max(1, Math.round((xb - xa) / 2)), w = (xb - xa) / n;
  for (let i = 0; i < n; i++) b.box(xa + i * w + w * 0.25, y0, z0, xa + i * w + w * 0.75, y1, z1, STONE.white, { top: STONE.whiteShade });
}
function merlonsZ(b: GeoBuilder, za: number, zb: number, x0: number, x1: number, y0: number, y1: number): void {
  if (zb - za < 0.6) return;
  const n = Math.max(1, Math.round((zb - za) / 2)), w = (zb - za) / n;
  for (let i = 0; i < n; i++) b.box(x0, y0, za + i * w + w * 0.25, x1, y1, za + i * w + w * 0.75, STONE.white, { top: STONE.whiteShade });
}

/**
 * One ring of Highgarden's walls round its lot: four curtains with a walk and
 * merlons on the outer edge, a tower at each corner, and a gate in the south
 * curtain between two square towers, its sill level with the floor inside.
 */
function ring(k: Build, l: Lot, o: RingOpts, floor: number): void {
  const b = k.b, W = STONE.white, S = STONE.whiteShade;
  const { x0, z0, x1, z1 } = l, t = o.thick, walk = l.top - 0.8, gx = (x0 + x1) / 2, gw = o.gateW, gr = o.gateR;
  const seed = x0 * 0.13 + z0 * 0.07, win = o.win;
  b.box(x0, o.base, z0, x1, walk, z0 + t, W, { win, top: S, seed });
  b.box(x0, o.base, z0 + t, x0 + t, walk, z1 - t, W, { win, top: S, faces: 'EWT', seed });
  b.box(x1 - t, o.base, z0 + t, x1, walk, z1 - t, W, { win, top: S, faces: 'EWT', seed });
  // the south curtain, in two pieces that run into the gate towers
  b.box(x0, o.base, z1 - t, gx - gw / 2 - 0.3, walk, z1, W, { win, top: S, faces: 'NSWT', seed });
  b.box(gx + gw / 2 + 0.3, o.base, z1 - t, x1, walk, z1, W, { win, top: S, faces: 'NSET', seed });
  // the gate: an arch through the curtain, its sill level with the floor behind it
  const sill = floor + 0.02, spring = sill + Math.max(1.5, (walk - sill) * 0.45);
  b.box(gx - gw / 2, o.base, z1 - t, gx + gw / 2, sill, z1, S, { faces: 'ST' });
  archway(b, gx, z1 - t, z1, gw, spring, walk, W, S);
  b.quad([gx - gw / 2, walk, z1], [gx + gw / 2, walk, z1], [gx + gw / 2, walk, z1 - t], [gx - gw / 2, walk, z1 - t], [0, 1, 0], S);
  // the gate towers stand a little proud of the curtain, as a gatehouse does
  for (const s of [-1, 1]) {
    squareTower(b, gx + s * (gw / 2 + gr), z1 - gr + 0.15, gr, l.top, W, { y0: o.base, shade: S, win: LOOPS_CLOSE, cone: { color: GREEN_ROOF, h: 2.2 } });
  }
  // the corner towers
  const c = o.corner, R = c.round ? c.r + 0.22 + (c.cone ? 0.25 : 0) : c.r + 0.2;
  for (const [cx, cz] of [[x0 + R, z0 + R], [x1 - R, z0 + R], [x0 + R, z1 - R], [x1 - R, z1 - R]]) {
    if (c.round) roundTower(b, cx, cz, c.r, l.top, W, { y0: o.base, shade: S, win: LOOPS_CLOSE, cone: c.cone ? { color: GREEN_ROOF, h: c.cone } : undefined });
    else squareTower(b, cx, cz, c.r, walk, W, { y0: o.base, shade: S, win: LOOPS_CLOSE });
  }
  // merlons on the outer edge of the walk
  const m = 0.36, g0 = gx - gw / 2 - 2 * gr - 0.2, g1 = gx + gw / 2 + 2 * gr + 0.2;
  merlonsX(b, x0 + 2 * R, x1 - 2 * R, z0, z0 + m, walk, l.top);
  merlonsX(b, x0 + 2 * R, g0, z1 - m, z1, walk, l.top);
  merlonsX(b, g1, x1 - 2 * R, z1 - m, z1, walk, l.top);
  merlonsX(b, gx - gw / 2 + 0.2, gx + gw / 2 - 0.2, z1 - m, z1, walk, l.top);
  merlonsZ(b, z0 + 2 * R, z1 - 2 * R, x0, x0 + m, walk, l.top);
  merlonsZ(b, z0 + 2 * R, z1 - 2 * R, x1 - m, x1, walk, l.top);
  // torches either side of the gate
  for (const s of [-1, 1]) fire(k, gx + s * (gw / 2 + 0.25), spring + 0.4, z1 + 0.25, 0.22, 0);
}

/** A flight of steps up a corridor that runs along z, from `ya` at `za` to `yb` at `zb`. */
function stairZ(b: GeoBuilder, xa: number, xb: number, za: number, zb: number, ya: number, yb: number, n: number, color: number): void {
  const run = (zb - za) / n, rise = (yb - ya) / n;
  for (let i = 0; i < n; i++) {
    const zs = za + i * run, ze = zs + run;
    b.box(xa, ya, Math.min(zs, ze), xb, ya + rise * (i + 1), Math.max(zs, ze), color, { faces: run < 0 ? 'EWST' : 'EWNT' });
  }
}

/** Climbing roses and ivy on a face of a wall: patches of dark green with dots of red and gold on them. */
function ivy(b: GeoBuilder, r: () => number, face: 'S' | 'E' | 'N' | 'W', at: number, from: number, to: number, y0: number, y1: number, n: number): void {
  const n3: V3 = face === 'S' ? [0, 0, 1] : face === 'N' ? [0, 0, -1] : face === 'E' ? [1, 0, 0] : [-1, 0, 0];
  const out = (face === 'S' || face === 'E' ? 1 : -1);
  const P = (u: number, y: number, off: number): V3 => (face === 'S' || face === 'N' ? [u, y, at + out * off] : [at + out * off, y, u]);
  for (let i = 0; i < n; i++) {
    const w = 0.7 + r() * 1.1, u = from + r() * Math.max(0.1, to - from - w), h = (y1 - y0) * (0.3 + r() * 0.45), ya = y0 + r() * 0.3;
    b.quad(P(u, ya, 0.03), P(u + w, ya, 0.03), P(u + w, ya + h, 0.03), P(u, ya + h, 0.03), n3, IVY);
    const dots = 3 + Math.floor(r() * 4);
    for (let d = 0; d < dots; d++) {
      const du = u + 0.1 + r() * (w - 0.3), dy = ya + 0.1 + r() * (h - 0.3), s = 0.17;
      b.quad(P(du, dy, 0.06), P(du + s, dy, 0.06), P(du + s, dy + s, 0.06), P(du, dy + s, 0.06), n3, r() < 0.55 ? ROSE_RED : ROSE_GOLD);
    }
  }
}

/** A rose bush in flower: a dot of red or gold, standing at `y`. */
function rose(b: GeoBuilder, x: number, z: number, y: number, gold: boolean, s = 0.16): void {
  b.box(x - s, y, z - s, x + s, y + s * 1.6, z + s, gold ? ROSE_GOLD : ROSE_RED);
}

/** A fountain: a round basin of water, a column and a bowl, and a jet that catches the light. */
function fountain(k: Build, x: number, z: number, y: number, r: number): void {
  const b = k.b;
  b.cyl(x, z, y, y + 0.45, r, r * 1.04, 10, STONE.white, { cap: WATER_TOP });
  b.cyl(x, z, y + 0.45, y + 1.25, 0.13, 0.11, 6, STONE.white, { cap: false });
  b.cyl(x, z, y + 1.25, y + 1.45, 0.42 * r, 0.5 * r, 8, STONE.white, { cap: WATER_TOP });
  k.glows.push({ x, y: y + 1.65, z, sx: 0.12, sy: 0.4, sz: 0.12, color: '#d8f0ff' });
}

/** The sloping foot of the hill, round the outside of the outer wall, but for the apron before the great stair. */
function hillFoot(b: GeoBuilder, l: Lot): void {
  const { x0, z0, x1, z1 } = l, h = BANK_H, w = BANK_W;
  const nrm = (nx: number, nz: number, run: number): V3 => { const s = Math.hypot(run, h); return [(nx * h) / s, run / s, (nz * h) / s]; };
  // north, west and east: each a slope with its corners mitred into the next
  b.quad([x1, h, z0], [x0, h, z0], [x0 - w.W, 0, z0 - w.N], [x1 + w.E, 0, z0 - w.N], nrm(0, -1, w.N), BANK);
  b.quad([x0, h, z0], [x0, h, z1], [x0 - w.W, 0, z1 + w.S], [x0 - w.W, 0, z0 - w.N], nrm(-1, 0, w.W), BANK);
  b.quad([x1, h, z1], [x1, h, z0], [x1 + w.E, 0, z0 - w.N], [x1 + w.E, 0, z1 + w.S], nrm(1, 0, w.E), BANK);
  // south, in two pieces either side of the apron, each with an end where it is cut
  b.quad([x0, h, z1], [APRON.x0, h, z1], [APRON.x0, 0, z1 + w.S], [x0 - w.W, 0, z1 + w.S], nrm(0, 1, w.S), BANK);
  b.quad([APRON.x1, h, z1], [x1, h, z1], [x1 + w.E, 0, z1 + w.S], [APRON.x1, 0, z1 + w.S], nrm(0, 1, w.S), BANK);
  face3(b, [APRON.x0, h, z1], [APRON.x0, 0, z1 + w.S], [APRON.x0, 0, z1], [1, 0, 0], 0x9a8f7c);
  face3(b, [APRON.x1, h, z1], [APRON.x1, 0, z1 + w.S], [APRON.x1, 0, z1], [-1, 0, 0], 0x9a8f7c);
}

/** How high the hill's foot is at a place outside the outer wall. */
function footAt(l: Lot, x: number, z: number): number {
  const w = BANK_W;
  const hx = x < l.x0 ? 1 - (l.x0 - x) / w.W : x > l.x1 ? 1 - (x - l.x1) / w.E : 1;
  let hz = z < l.z0 ? 1 - (l.z0 - z) / w.N : z > l.z1 ? 1 - (z - l.z1) / w.S : 1;
  if (z > l.z1 && x > APRON.x0 && x < APRON.x1) hz = 0;
  return Math.max(0, Math.min(hx, hz)) * BANK_H;
}

/**
 * The briar maze between the outer wall and the middle one: a ring of cells
 * three across, carved into a labyrinth, with a hedge wherever two cells are
 * not joined. A straight way runs through it from the outer gate to the
 * middle one, up a flight of steps.
 */
function maze(k: Build, outer: Lot, mid: Lot, t: number, y: number): void {
  const b = k.b, r = rng(0x4e5a11);
  const X0 = outer.x0 + t, X1 = outer.x1 - t, Z0 = outer.z0 + t, Z1 = outer.z1 - t;
  const across = 3, nx = Math.round((X1 - X0) / ((mid.x0 - X0) / across)), nz = Math.round((Z1 - Z0) / ((mid.z0 - Z0) / across));
  const cx = (X1 - X0) / nx, cz = (Z1 - Z0) / nz;
  const inRing = (i: number, j: number): boolean => i >= 0 && j >= 0 && i < nx && j < nz && (i < across || i >= nx - across || j < across || j >= nz - across);
  const key = (i: number, j: number, i2: number, j2: number): string => (i < i2 || (i === i2 && j < j2) ? `${i},${j},${i2},${j2}` : `${i2},${j2},${i},${j}`);
  const open = new Set<string>(), seen = new Set<string>();
  const stack: [number, number][] = [[0, nz - 1]];
  seen.add(`0,${nz - 1}`);
  while (stack.length) {
    const [i, j] = stack[stack.length - 1];
    const next = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).map(([di, dj]): [number, number] => [i + di, j + dj]).filter(([a, c]) => inRing(a, c) && !seen.has(`${a},${c}`));
    if (!next.length) { stack.pop(); continue; }
    const [a, c] = next[Math.floor(r() * next.length)];
    open.add(key(i, j, a, c));
    seen.add(`${a},${c}`);
    stack.push([a, c]);
  }
  // the straight way from gate to gate: two columns of cells in the south band
  const gx = (outer.x0 + outer.x1) / 2;
  const ci0 = Math.floor((gx - 1.2 - X0) / cx), ci1 = ci0 + 1, way = (i: number, j: number): boolean => (i === ci0 || i === ci1) && j >= nz - across;
  // hedges: runs of wall along each line of the grid, merged where they meet end to end
  const runs: [number, number, number, number][] = [];
  const hedgeAt = (i: number, j: number, i2: number, j2: number): boolean => {
    if (!inRing(i, j) || !inRing(i2, j2)) return false;
    if (way(i, j) && way(i2, j2)) return false;
    // the stair's own sides, and the way into the maze at its foot, are open
    if (way(i, j) !== way(i2, j2)) return false;
    return !open.has(key(i, j, i2, j2));
  };
  for (let i = 0; i < nx - 1; i++) {
    let start = -1;
    for (let j = 0; j <= nz; j++) {
      const on = j < nz && hedgeAt(i, j, i + 1, j);
      if (on && start < 0) start = j;
      if (!on && start >= 0) { runs.push([X0 + (i + 1) * cx, Z0 + start * cz, X0 + (i + 1) * cx, Z0 + j * cz]); start = -1; }
    }
  }
  for (let j = 0; j < nz - 1; j++) {
    let start = -1;
    for (let i = 0; i <= nx; i++) {
      const on = i < nx && hedgeAt(i, j, i, j + 1);
      if (on && start < 0) start = i;
      if (!on && start >= 0) { runs.push([X0 + start * cx, Z0 + (j + 1) * cz, X0 + i * cx, Z0 + (j + 1) * cz]); start = -1; }
    }
  }
  const ht = 0.14;
  for (const [ax, az, bx, bz] of runs) b.box(Math.min(ax, bx) - ht, y, Math.min(az, bz) - ht, Math.max(ax, bx) + ht, y + 0.8, Math.max(az, bz) + ht, HEDGE, { top: HEDGE_TOP });
  // roses in the briars
  for (let n = 0; n < 20; n++) {
    const [ax, az, bx, bz] = runs[Math.floor(r() * runs.length)], f = r();
    rose(b, ax + (bx - ax) * f, az + (bz - az) * f, y + 0.8, r() < 0.5, 0.11);
  }
  // the steps up the straight way, from the landing inside the outer gate to the middle gate
  const xa = X0 + ci0 * cx, xb = X0 + (ci1 + 1) * cx;
  stairZ(b, xa, xb, Z0 + (nz - 1) * cz, mid.z1, y, FLOOR['hg-mid'], 7, STONE.white);
  // a few who are lost in it, in cells away from the corners and the way
  const lost = [[5, nz - 2], [nx - 2, 9], [1, 12], [17, nz - 1], [nx - 3, nz - 6], [9, 1]];
  for (const [i, j] of lost) if (inRing(i, j) && !way(i, j)) k.person(X0 + (i + 0.5) * cx, Z0 + (j + 0.5) * cz, y);
}

/** The outer ring, the hill under it, the maze, the great stair, and the water stair down to the Mander. */
const hgOuter: Model = (k, l) => {
  const b = k.b, y = FLOOR['hg-outer'], mid = lotOf('hg-mid'), t = 1.4, gx = (l.x0 + l.x1) / 2, r = rng(0x9a61);
  terrace(k, rect(l.x0 + 0.5, l.z0 + 0.5, l.x1 - 0.5, l.z1 - 0.5), 0, y, { top: GRAVEL, side: 0x9a8f7c });
  ring(k, l, { base: 0, thick: t, gateW: 2.4, gateR: 0.95, corner: { round: true, r: 1.5, cone: 2.8 }, win: loopsTo(l.top - 0.8, 2) }, y);
  hillFoot(b, l);
  maze(k, l, mid, t, y);

  // the great stair: a landing before the gate, and a flight up to it along the wall from each side
  const z1 = l.z1, land = 1.5, sill = y + 0.02, n = 10, rise = 0.38, run = 0.55;
  b.box(gx - land, 0, z1, gx + land, sill, z1 + 1.4, STONE.white, { faces: 'SEWT', top: PAVE });
  b.box(gx - land, sill, z1 + 1.22, gx + land, sill + 0.55, z1 + 1.4, STONE.white, { faces: 'NSEWT', top: STONE.whiteShade });
  for (const s of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const xa = gx + s * (land + i * run), xb = gx + s * (land + (i + 1) * run);
      b.box(Math.min(xa, xb), 0, z1, Math.max(xa, xb), sill - (i + 1) * rise, z1 + 1.4, STONE.white, { faces: s < 0 ? 'SWT' : 'SET', top: PAVE });
    }
    const far = gx + s * (land + n * run);
    slab(b, [gx + s * land, sill + 0.55, z1 + 1.31], [far, sill - n * rise + 0.55, z1 + 1.31], 0.09, 0.55, STONE.whiteShade);
    k.person(gx + s * 0.8, z1 + 0.6, sill);
  }
  // the apron before it, with its beds of golden roses, down to the roseroad
  const az1 = z1 + 6.4;
  area(k, [[APRON.x0, z1], [APRON.x1, z1], [APRON.x1, z1 + 5.0], [APRON.x1 - 5, az1], [APRON.x0, az1]], PAVE, 0.035);
  const bed = (x0: number, z0: number, x1: number, z1b: number, gold: number): void => {
    b.box(x0, 0, z0, x1, 0.18, z1b, 0x3f7a38, { top: 0x4b8a3f });
    for (let x = x0 + 0.35; x < x1 - 0.1; x += 0.75) for (let z = z0 + 0.35; z < z1b - 0.1; z += 0.6) rose(b, x, z, 0.18, r() < gold);
  };
  bed(gx - 6.8, z1 + 2.6, gx - 3.2, z1 + 4.4, 0.8);
  bed(gx + 3.2, z1 + 2.6, gx + 6.8, z1 + 4.4, 0.8);
  bed(gx - 1.6, z1 + 3.2, gx + 1.6, z1 + 4.2, 1);
  for (const [px, pz] of [[gx - 4.5, z1 + 5.4], [gx + 1.8, z1 + 5.6], [gx + 5.6, z1 + 2.0]]) k.person(px, pz);
  k.lights.push({ x: gx, z: z1 + 3, r: 11, color: '#ffcf8a', k: 0.55 });

  // ivy and climbing roses on the outer faces that the view sees first, and a little on the others
  ivy(b, r, 'S', z1, l.x0 + 4, APRON.x0, 1.2, 6.8, 4);
  ivy(b, r, 'S', z1, APRON.x1, l.x1 - 4, 1.2, 6.8, 4);
  ivy(b, r, 'E', l.x1, l.z0 + 4, l.z1 - 4, 1.0, 6.8, 9);
  ivy(b, r, 'W', l.x0, l.z0 + 4, l.z1 - 4, 1.0, 6.8, 5);
  ivy(b, r, 'N', l.z0, l.x0 + 4, l.x1 - 4, 1.2, 6.8, 5);
  // roses in the grass of the hill's foot, south and east
  for (let i = 0; i < 30; i++) {
    const east = i % 3 === 0;
    if (east) {
      const d = 0.15 + r() * (BANK_W.E - 0.3), z = l.z0 + 2 + r() * (l.z1 - l.z0 - 4);
      rose(b, l.x1 + d, z, BANK_H * (1 - d / BANK_W.E) - 0.12, r() < 0.6, 0.13);
    } else {
      const d = 0.3 + r() * (BANK_W.S - 0.7);
      let x = l.x0 + 2 + r() * (l.x1 - l.x0 - 4);
      if (x > APRON.x0 - 0.3 && x < APRON.x1 + 0.3) x = x < gx ? APRON.x0 - 0.6 - r() * 4 : APRON.x1 + 0.6 + r() * 4;
      rose(b, x, l.z1 + d, BANK_H * (1 - d / BANK_W.S) - 0.12, r() < 0.6, 0.13);
    }
  }
  // guards and braziers on the walk
  const walk = l.top - 0.8;
  for (const [px, pz] of [[l.x0 + 6, l.z1 - 0.8], [l.x1 - 6, l.z1 - 0.8], [l.x1 - 0.8, (l.z0 + l.z1) / 2], [l.x0 + 0.8, l.z0 + 9]]) k.person(px, pz, walk);
  brazier(k, gx - 5.5, l.z1 - 0.8, walk);
  brazier(k, l.x1 - 0.8, l.z1 - 7, walk);

  // the water stair: a postern in the north wall, a flight down along the wall, and a landing stage on the Mander
  const px = gx - 5, nz = l.z0;
  b.box(px - 0.5, y + 0.02, nz - 0.06, px + 0.5, y + 1.8, nz, DOOR, { faces: 'NEWT' });
  roundel(b, [px, y + 1.8, nz - 0.07], 0.5, 'N', DOOR);
  b.box(px - 1, 0, nz - 1.3, px + 1, y + 0.02, nz, STONE.white, { faces: 'NEWT', top: PAVE });
  for (let i = 0; i < 10; i++) {
    const xa = px - 1 - i * 0.6, xb = xa - 0.6;
    b.box(xb, 0, nz - 1.3, xa, y + 0.02 - (i + 1) * 0.38, nz, STONE.white, { faces: 'NWT', top: PAVE });
  }
  const foot = px - 7;
  b.box(foot - 1.4, -1.3, nz - 2.3, foot + 0.2, 0.06, nz - 1.2, TIMBER, { faces: 'NESWT' });
  barge(k, foot + 3.0, nz - 2.7);
  k.person(foot - 0.6, nz - 1.8, 0.06);
};

/** The Tyrells' pleasure barge, green and gold, under a canopy. */
function barge(k: Build, x: number, z: number): void {
  const b = k.b, L = 2.6, B = 0.55;
  b.box(x - L, -1.05, z - B, x + L, -0.45, z + B, 0x3f7a3a, { faces: 'NESWT', top: DECK });
  b.box(x - L - 0.05, -0.6, z - B - 0.05, x + L + 0.05, -0.5, z + B + 0.05, ROSE_GOLD, { faces: 'NESW' });
  b.beam([x + L, -0.5, z], [x + L + 0.6, 0.2, z], 0.12, 0.06, ROSE_GOLD);
  b.beam([x - L, -0.5, z], [x - L - 0.4, 0.0, z], 0.12, 0.06, ROSE_GOLD);
  for (const [dx, dz] of [[-1.4, -0.42], [1.4, -0.42], [-1.4, 0.42], [1.4, 0.42]]) b.box(x + dx - 0.05, -0.45, z + dz - 0.05, x + dx + 0.05, 0.75, z + dz + 0.05, ROSE_GOLD, { faces: 'NESW' });
  b.box(x - 1.6, 0.75, z - 0.62, x + 1.6, 0.85, z + 0.62, GREEN_ROOF, { faces: 'NESWTB', top: 0x5c9a52 });
  k.person(x - 0.6, z, -0.45);
  k.person(x + 0.7, z + 0.1, -0.45);
  k.glows.push({ x: x + L + 0.6, y: 0.4, z, sx: 0.2, sy: 0.25, sz: 0.2, color: '#ffd38a' });
}

/** The middle ring, the terrace of groves and fountains inside it, and the steps up to the inner gate. */
const hgMid: Model = (k, l) => {
  const b = k.b, base = FLOOR['hg-outer'], y = FLOOR['hg-mid'], inner = lotOf('hg-inner'), t = 1.3, gx = (l.x0 + l.x1) / 2, r = rng(0x77d1);
  terrace(k, rect(l.x0 + 0.5, l.z0 + 0.5, l.x1 - 0.5, l.z1 - 0.5), base, y, { top: LAWN, side: 0x8a9a6a });
  ring(k, l, { base, thick: t, gateW: 2.2, gateR: 0.85, corner: { round: true, r: 1.25, cone: 2.6 }, win: loopsTo(l.top - 0.8, 3) }, y);
  // the steps from the middle gate up to the inner one
  stairZ(b, gx - 1.0, gx + 1.0, l.z1 - t, inner.z1, y, FLOOR['hg-inner'], 7, STONE.white);
  // groves and fountains in the band between the middle wall and the inner
  const mx0 = (l.x0 + t + inner.x0) / 2, mx1 = (l.x1 - t + inner.x1) / 2, mz0 = (l.z0 + t + inner.z0) / 2, mz1 = (l.z1 - t + inner.z1) / 2;
  fountain(k, mx0, (l.z0 + l.z1) / 2, y, 0.85);
  fountain(k, mx1, (l.z0 + l.z1) / 2, y, 0.85);
  fountain(k, gx, mz0, y, 0.85);
  for (let i = 0; i < 6; i++) {
    const z = inner.z0 + 1 + (i / 5) * (inner.z1 - inner.z0 - 2);
    if (Math.abs(z - (l.z0 + l.z1) / 2) < 1.4) continue;
    k.tree(mx0, z, 0.42 + r() * 0.1, i % 2 === 0, y);
    k.tree(mx1, z, 0.42 + r() * 0.1, i % 2 === 1, y);
  }
  for (let i = 0; i < 7; i++) {
    const x = inner.x0 + 0.6 + (i / 6) * (inner.x1 - inner.x0 - 1.2);
    if (Math.abs(x - gx) < 1.6) continue;
    k.tree(x, mz0, 0.4 + r() * 0.1, i % 3 === 0, y);
    // along the south of the band, golden roses in place of trees, either side of the steps
    rose(b, x, mz1, y, r() < 0.75);
  }
  ivy(b, r, 'S', l.z1, l.x0 + 3.5, gx - 3, base + 3.5, l.top - 1.2, 2);
  ivy(b, r, 'S', l.z1, gx + 3, l.x1 - 3.5, base + 3.5, l.top - 1.2, 2);
  ivy(b, r, 'E', l.x1, l.z0 + 3.5, l.z1 - 3.5, base + 3.5, l.top - 1.2, 4);
  k.person(mx1, (l.z0 + l.z1) / 2 + 1.3, y);
  k.person(gx + 3, mz0, y);
  k.person(l.x1 - 0.7, l.z1 - 5, l.top - 0.8);
  brazier(k, gx + 4, l.z1 - 0.7, l.top - 0.8);
};

/** The inner ring, its court of lawns and roses, and a marble colonnade along the inside of its south wall. */
const hgInner: Model = (k, l) => {
  const b = k.b, base = FLOOR['hg-mid'], y = FLOOR['hg-inner'], t = 1.2, gx = (l.x0 + l.x1) / 2, r = rng(0x31c7);
  terrace(k, rect(l.x0 + 0.5, l.z0 + 0.5, l.x1 - 0.5, l.z1 - 0.5), base, y, { top: LAWN_HIGH, side: 0x8a9a6a });
  ring(k, l, { base, thick: t, gateW: 2.0, gateR: 0.8, corner: { round: false, r: 1.0 }, win: loopsTo(l.top - 0.8, 4) }, y);
  // the colonnade: white columns under a flat roof, either side of the gate
  const zc = l.z1 - t - 0.75, h = 2.3;
  for (const [xa, xb] of [[l.x0 + 2.6, gx - 1.4], [gx + 1.4, l.x1 - 2.6]]) {
    const n = Math.max(2, Math.round((xb - xa) / 1.1));
    for (let i = 0; i <= n; i++) b.cyl(xa + ((xb - xa) * i) / n, zc, y, y + h, 0.13, 0.11, 6, 0xf4f1ea, { cap: false });
    b.box(xa - 0.25, y + h, zc - 0.3, xb + 0.25, y + h + 0.3, l.z1 - t, 0xf4f1ea, { faces: 'NESWTB', top: STONE.whiteShade });
  }
  // beds of golden roses in the court
  for (const [x, z] of [[l.x0 + 2.2, l.z0 + 2.2], [l.x1 - 2.2, l.z0 + 2.2]]) {
    b.cyl(x, z, y, y + 0.15, 0.7, 0.7, 8, 0x3f7a38, { cap: 0x4b8a3f });
    for (let i = 0; i < 6; i++) rose(b, x + Math.cos(i) * 0.4, z + Math.sin(i) * 0.4, y + 0.15, r() < 0.85);
  }
  ivy(b, r, 'S', l.z1, l.x0 + 2.5, gx - 2.5, base + 4.5, l.top - 1.2, 2);
  ivy(b, r, 'E', l.x1, l.z0 + 2.5, l.z1 - 2.5, base + 4.5, l.top - 1.2, 3);
  for (const [px, pz] of [[l.x0 + 3.5, zc], [l.x1 - 2.2, l.z1 - 3]]) k.person(px, pz, y);
  k.person(l.x0 + 0.6, l.z1 - 4, l.top - 0.8);
  k.lights.push({ x: gx, z: (l.z0 + l.z1) / 2, r: 11, color: '#ffcf8a', k: 0.5 });
};

/**
 * The heart of Highgarden: a hall with a green roof, two old squat square
 * towers with battlements on its west, and slender round towers with green
 * cones, the tallest in the middle.
 */
const hgTowers: Model = (k, l) => {
  const b = k.b, y = FLOOR['hg-inner'], W = STONE.white, S = STONE.whiteShade;
  const cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, hx = (l.x1 - l.x0) / 2, hz = (l.z1 - l.z0) / 2;
  // the hall, two storeys with its windows, and a hipped roof of green tiles
  const hallTop = y + 4.6;
  b.box(cx - hx * 0.55, y, cz - hz * 0.45, cx + hx * 0.55, hallTop, cz + hz * 0.55, W, { win: { cell: 1.4, storey: hallTop / 4, lit: 0.45, kind: 4 } });
  hip(b, cx - hx * 0.55, cz - hz * 0.45, cx + hx * 0.55, cz + hz * 0.55, hallTop, 1.9, GREEN_ROOF, 0.3);
  // its great door, to the south, lit
  b.box(cx - 0.6, y, cz + hz * 0.55, cx + 0.6, y + 1.9, cz + hz * 0.55 + 0.08, DARK, { win: interior(0.7), faces: 'SEWT' });
  roundel(b, [cx, y + 1.9, cz + hz * 0.55 + 0.09], 0.6, 'S', DARK, { win: interior(0.7) });
  // the old square towers, on the west, with battlements
  const sq = 1.0;
  squareTower(b, l.x0 + sq + 0.2, l.z1 - sq - 0.2, sq, l.top - 6, W, { y0: y, shade: S, win: LOOPS_CLOSE });
  squareTower(b, l.x0 + sq + 0.2, l.z0 + sq + 0.2, sq, l.top - 5, W, { y0: y, shade: S, win: LOOPS_CLOSE });
  // the newer slender round ones, with green cones; the tallest at the heart
  const rt = (x: number, z: number, r: number, top: number, cone: number): void => roundTower(b, x, z, r, top, W, { y0: y, shade: S, win: LOOPS_CLOSE, sides: 9, cone: { color: GREEN_ROOF, h: cone } });
  rt(cx, cz - hz * 0.2, 1.05, l.top, 3);
  rt(l.x1 - 0.85 - 0.47, l.z1 - 0.85 - 0.47, 0.85, l.top - 3, 2.8);
  rt(l.x1 - 0.8 - 0.47, l.z0 + 0.8 + 0.47, 0.8, l.top - 1.5, 2.8);
  rt(l.x0 + 0.7 + 0.47, cz + 0.2, 0.7, l.top - 4.5, 2.4);
  // banners on the square towers
  banner(b, l.x0 + sq + 0.2, l.z1 - sq - 0.2, l.top - 6, 'tyrell', 3.6, 0.8);
  banner(b, l.x0 + sq + 0.2, l.z0 + sq + 0.2, l.top - 5, 'tyrell', 3.6, 0.8);
  // and on the gate towers of the outer wall, for the road
  const outer = lotOf('hg-outer'), ogx = (outer.x0 + outer.x1) / 2;
  for (const s of [-1, 1]) banner(b, ogx + s * (1.2 + 0.95), outer.z1 - 0.8, outer.top + 1.9, 'tyrell', 1.8, 0.7);
  // trees in the court
  k.tree(l.x1 - 0.8, cz + 1.2, 0.45, false, y);
  k.tree(l.x0 + 0.9, l.z1 + 1.3, 0.4, true, y);
  k.person(cx + 1.3, l.z1 - 0.5, y);
  k.person(cx - 1.6, l.z1 + 0.4, y);
};

/** The court of roses outside the south-east corner, where a hero stands on show. */
function courtOfRoses(k: Build): void {
  const b = k.b, outer = lotOf('hg-outer'), x0 = outer.x1 + 1, z0 = outer.z1 - 7.2, r = rng(0x5e7);
  const shape: P2[] = [[x0, z0], [x0 + 10.2, z0], [x0 + 10.2, z0 + 6.6], [x0 + 7.5, z0 + 7.4], [x0, z0 + 7.8]];
  area(k, shape, PAVE, 0.035);
  // low rose hedges along the north and the west, with a gap for the path along the wall
  b.box(x0, 0, z0 - 0.45, x0 + 10.2, 0.85, z0, HEDGE, { top: HEDGE_TOP });
  b.box(x0 - 0.45, 0, z0 - 0.45, x0, 0.85, z0 + 7.8, HEDGE, { top: HEDGE_TOP });
  for (let i = 0; i < 26; i++) {
    const north = i < 15, f = r();
    if (north) rose(b, x0 + 0.2 + f * 9.8, z0 - 0.22 + (r() - 0.5) * 0.2, 0.85, r() < 0.5, 0.12);
    else rose(b, x0 - 0.22 + (r() - 0.5) * 0.2, z0 + 0.2 + f * 7.4, 0.85, r() < 0.5, 0.12);
  }
  // the fountain in its north-west corner
  fountain(k, x0 + 0.95, z0 + 0.85, 0.035, 0.75);
  k.person(x0 + 0.7, z0 + 6.8);
  k.person(x0 + 8.8, z0 + 0.5);
  k.lights.push({ x: x0 + 5, z: z0 + 3.5, r: 9, color: '#ffd7a0', k: 0.45 });
}

/** How high Highgarden's hill is at a place. */
function hillAt(x: number, z: number): number {
  const outer = lotOf('hg-outer');
  for (const id of ['hg-inner', 'hg-mid', 'hg-outer']) {
    const l = lotOf(id);
    if (x > l.x0 + 0.5 && x < l.x1 - 0.5 && z > l.z0 + 0.5 && z < l.z1 - 0.5) return FLOOR[id];
  }
  if (x >= outer.x0 && x <= outer.x1 && z >= outer.z0 && z <= outer.z1) return outer.top - 0.8;
  return footAt(outer, x, z);
}

// ---------------------------------------------------------------------------
// The Hightower
// ---------------------------------------------------------------------------

const centre = (l: Lot): { cx: number; cz: number; half: number } => ({ cx: (l.x0 + l.x1) / 2, cz: (l.z0 + l.z1) / 2, half: (l.x1 - l.x0) / 2 });

/** Merlons round the edge of a square with its corners cut, `half` from its middle. */
function crown(b: GeoBuilder, cx: number, cz: number, half: number, cut: number, y0: number, y1: number, color: number, shade: number, step = 1.0): void {
  const m = 0.34, run = 2 * (half - cut), n = Math.max(2, Math.round(run / step)), w = run / n;
  for (let i = 0; i < n; i++) {
    const a = -half + cut + i * w + w * 0.22, c = a + w * 0.56;
    b.box(cx + a, y0, cz - half, cx + c, y1, cz - half + m, color, { top: shade });
    b.box(cx + a, y0, cz + half - m, cx + c, y1, cz + half, color, { top: shade });
    b.box(cx - half, y0, cz + a, cx - half + m, y1, cz + c, color, { top: shade });
    b.box(cx + half - m, y0, cz + a, cx + half, y1, cz + c, color, { top: shade });
  }
}

/** One of the pale tiers: a shaft with its windows, a cornice, and merlons round the walk on top. */
function tierOf(k: Build, l: Lot, y0: number, inset: number, win: WinSpec): void {
  const b = k.b, { cx, cz, half } = centre(l), body = half - inset, cut = body * 0.18;
  prism(b, chamfered(cx, cz, body, cut), y0, l.top - 1.6, PALE, { win, seed: l.top * 0.1, top: false });
  prism(b, chamfered(cx, cz, half, cut + 0.05), l.top - 1.6, l.top - 1.0, PALE, { top: PALE_SHADE });
  crown(b, cx, cz, half, cut + 0.05, l.top - 1.0, l.top, PALE, PALE_SHADE, half > 2.4 ? 1.1 : 0.9);
}

/** The base: a square fortress of black stone fused smooth, windowless, older than anything. */
const htBase: Model = (k, l) => {
  const b = k.b, { cx, cz, half } = centre(l), B = STONE.black, BS = STONE.blackShade;
  prism(b, chamfered(cx, cz, half, 0.75), 0, 1.0, B, { top: BS });
  prism(b, chamfered(cx, cz, half - 0.15, 0.7), 1.0, l.top - 0.6, B, { top: false });
  prism(b, chamfered(cx, cz, half, 0.75), l.top - 0.6, l.top, B, { top: BS });
  // two great doors, to the east and the south, where the ring road passes them, lit within and torches beside
  const f = half - 0.15;
  b.box(cx + f, 0, cz - 0.8, cx + f + 0.08, 2.4, cz + 0.8, DARK, { win: interior(0.7), faces: 'EWNST' });
  roundel(b, [cx + f + 0.09, 2.4, cz], 0.8, 'E', DARK, { win: interior(0.7) });
  b.box(cx - 0.8, 0, cz + f, cx + 0.8, 2.4, cz + f + 0.08, DARK, { win: interior(0.7), faces: 'EWNST' });
  roundel(b, [cx, 2.4, cz + f + 0.09], 0.8, 'S', DARK, { win: interior(0.7) });
  for (const s of [-1, 1]) {
    fire(k, cx + f + 0.25, 3.1, cz + s * 1.25, 0.22, 0);
    fire(k, cx + s * 1.25, 3.1, cz + f + 0.25, 0.22, 0);
  }
  k.lights.push({ x: cx + half, z: cz + half, r: 9, color: '#ffbf75', k: 0.5 });
  // the Hightower's banners, on the base's east corners
  banner(b, cx + half - 0.6, cz - half + 0.6, l.top, 'hightower', 3.6, 0.8);
  banner(b, cx + half - 0.6, cz + half - 0.6, l.top, 'hightower', 3.6, 0.8);
};

const htTier1: Model = (k, l) => tierOf(k, l, lotOf('hightower-base').top, 0.15, LOOPS_CLOSE);
const htTier2: Model = (k, l) => tierOf(k, l, lotOf('hightower-1').top - 1.0, 0.2, LOOPS_CLOSE);

/** The top tier, its balcony, and the great beacon that guides ships into the Whispering Sound. */
const htTop: Model = (k, l) => {
  const b = k.b, { cx, cz, half } = centre(l), y0 = lotOf('hightower-2').top - 1.0;
  const body = half - 0.4, cut = body * 0.2, bodyTop = l.top - 2.4;
  prism(b, chamfered(cx, cz, body, cut), y0, bodyTop, PALE, { win: { cell: 1.2, storey: 3.4, lit: 0.5, kind: 4 }, top: false });
  // the balcony high up, all the way round
  const by = y0 + 5.8;
  b.box(cx - half + 0.05, by - 0.22, cz - half + 0.05, cx + half - 0.05, by, cz + half - 0.05, PALE_SHADE, { faces: 'NESWTB' });
  railing(b, cx - half + 0.05, cz - half + 0.05, cx + half - 0.05, cz + half - 0.05, by, 0xd8d2c4, 'NESW', 0.65);
  prism(b, chamfered(cx, cz, half - 0.05, cut + 0.1), bodyTop, bodyTop + 0.6, PALE, { top: PALE_SHADE });
  crown(b, cx, cz, half - 0.05, cut + 0.1, bodyTop + 0.6, bodyTop + 1.4, PALE, PALE_SHADE, 0.85);
  // the beacon: an iron bowl on a short drum, full of fire
  const fy = bodyTop + 0.6;
  b.cyl(cx, cz, fy, fy + 0.6, 0.55, 0.55, 8, IRONWORK, { cap: false });
  lathe(b, cx, cz, [[0.55, fy + 0.6], [1.15, fy + 1.4], [1.3, l.top - 0.1]], 8, IRONWORK);
  b.cyl(cx, cz, l.top - 0.45, l.top - 0.35, 1.18, 1.18, 8, 0xff8a2a, { cap: 0xffa040 });
  k.glows.push({ x: cx, y: l.top - 0.25, z: cz, sx: 1.9, sy: 0.3, sz: 1.9, color: '#ff9a3a' });
  beacon(k, cx, l.top + 0.8, cz, 1.3, '#ffb347');
  k.lights.push({ x: cx, z: cz, r: 14, color: '#ffcf8a', k: 0.7 });
  // the flames themselves, which leap and fall
  const flames = new Flames(110);
  k.group.add(flames.mesh);
  const r = rng(0x8e4c0), at = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(1, 0, 0), still = new THREE.Vector3();
  let due = 0;
  k.each((dt, _t, night) => {
    due += Math.min(dt, 0.1) * 190;
    while (due >= 1) {
      due -= 1;
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.95;
      flames.tongue(at.set(cx + Math.cos(a) * d, l.top - 0.3, cz + Math.sin(a) * d), up, side, still, 0.35 + r() * 0.3);
    }
    flames.update(dt, night);
  });
};

/** What stands on Battle Isle's rim, outside the ring road: bollards, and a stair down to a boat. */
function isleRim(k: Build): void {
  const b = k.b, I = ISLANDS.battle, rim = I.rx - 0.07;
  for (const deg of [-8, 80, 104, 128, 152, 208, 236, 262, 290, 318]) {
    const a = (deg * Math.PI) / 180;
    b.cyl(I.x + Math.cos(a) * rim, I.z + Math.sin(a) * rim, 0.01, 0.72, 0.17, 0.15, 6, STONE.blackShade, { cap: 0x4a474e });
  }
  // the stair, on the seaward side, down to the water
  const x = I.x - I.rx - 0.12;
  for (let i = 0; i < 3; i++) b.box(x - (i + 1) * 0.5, -1.6, I.z - 0.75, x - i * 0.5, -0.18 - i * 0.25, I.z + 0.75, STONE.black, { faces: 'NESWT', top: STONE.blackShade });
  rowboat(b, x - 2.4, I.z + 0.4, Math.PI / 2, 0x7a5a3a);
  k.person(x - 0.25, I.z - 0.3, -0.18);
}

// ---------------------------------------------------------------------------
// Boats and ships
// ---------------------------------------------------------------------------

/** A rowing boat on the water, its length along (cos yaw, sin yaw). */
function rowboat(b: GeoBuilder, x: number, z: number, yaw: number, color: number): void {
  b.obox(x, -0.85, z, 1.2, 0.22, 0.42, yaw, color, { top: DECK });
  b.obox(x + Math.cos(yaw) * 1.25, -0.8, z + Math.sin(yaw) * 1.25, 0.3, 0.2, 0.3, yaw + Math.PI / 4, color, { top: DECK });
}

/** A cog at its moorings: a hull with castles fore and aft, one mast at most 9 high, and a sail. */
function ship(k: Build, x: number, z: number, yaw: number, len: number, beam: number, mast: number, sail: number, stripe?: number): void {
  const b = k.b, L = len / 2, B = beam / 2;
  b.moved(x, 0, z, yaw, () => {
    b.box(-L + 0.5, -1.25, -B + 0.2, L - 0.6, -0.5, B - 0.2, HULL_DARK, { faces: 'NESW' });
    b.box(-L, -0.5, -B, L - 0.4, 0.3, B, HULL, { faces: 'NESWT', top: DECK });
    b.obox(L - 0.4, -0.25, 0, B * 0.71, 0.58, B * 0.71, Math.PI / 4, HULL, { top: DECK });
    b.box(-L - 0.05, 0.3, -B, -L + 1.3, 1.1, B, HULL, { faces: 'NESWT', top: DECK });
    b.box(L - 1.3, 0.3, -B * 0.8, L - 0.3, 0.85, B * 0.8, HULL, { faces: 'NESWT', top: DECK });
    b.cyl(0, 0, 0.3, mast, 0.1, 0.07, 6, TIMBER, { cap: false });
    const ya = mast - 1.1, yb = ya - 2.9;
    b.beam([0.08, ya + 0.1, -B * 1.4], [0.08, ya + 0.1, B * 1.4], 0.06, 0.06, TIMBER);
    for (const s of [-1, 1]) b.quad([0.12 * s, yb, -B * 1.3], [0.12 * s, yb, B * 1.3], [0.12 * s, ya, B * 1.3], [0.12 * s, ya, -B * 1.3], [s, 0, 0], sail);
    if (stripe !== undefined) for (const s of [-1, 1]) b.quad([0.14 * s, yb, -0.2], [0.14 * s, yb, 0.2], [0.14 * s, ya, 0.2], [0.14 * s, ya, -0.2], [s, 0, 0], stripe);
    b.beam([0, mast - 0.1, 0], [0.9, mast - 0.25, 0], 0.08, 0.02, ROSE_RED);
  });
  k.glows.push({ x: x - Math.cos(yaw) * (L - 0.2), y: 1.6, z: z - Math.sin(yaw) * (L - 0.2), sx: 0.25, sy: 0.3, sz: 0.25, color: '#ffd38a' });
}

/** A barrel standing on `y`. */
function barrel(b: GeoBuilder, x: number, z: number, y: number): void {
  b.cyl(x, z, y, y + 0.7, 0.28, 0.3, 6, 0x8a6540, { cap: 0x6f5034 });
}

// ---------------------------------------------------------------------------
// Oldtown
// ---------------------------------------------------------------------------

/**
 * Tall narrow houses of stone along the harbour, between the shore and the
 * ocean road, close together: steep gables to the road and to the water, many
 * chimneys, lit windows, and a wynd between two of them.
 */
const oldtown: Model = (k, l) => {
  const b = k.b, r = rng(0x01d70);
  const xw = l.x0 + 0.2, xe = l.x1 - 0.2, widths = [1.05, 1.05, 1.0, 0, 1.05, 1.1];
  let z = l.z0 + 0.1;
  widths.forEach((w, i) => {
    if (w === 0) {
      // the wynd: a lantern hung across it, and somebody passing through
      const wz = z + 0.35;
      k.glows.push({ x: xe - 0.6, y: 3.4, z: wz, sx: 0.22, sy: 0.3, sz: 0.22, color: '#ffd38a' });
      k.person((xw + xe) / 2, wz);
      z += 0.7;
      return;
    }
    const tall = i % 2 === 0, body = tall ? 6.0 : 5.2, rise = l.top - 0.1 - body, stone = HOUSE_STONE[i % HOUSE_STONE.length];
    const win: WinSpec = tall ? { cell: 1.0, storey: 2.0, lit: 0.55, kind: 0 } : { ...HOUSE_WIN, cell: 1.0 };
    b.box(xw, 0, z, xe, body, z + w, stone, { win, seed: z * 0.31 });
    gable(b, xw, z, xe, z + w, body, rise, i % 3 === 1 ? ROOF.tile : ROOF.slate, stone, 'x', 0.18);
    // chimneys on the ridge and at the gable ends
    for (const cx of i % 2 ? [xw + 0.6, xe - 0.6] : [xe - 0.7]) b.box(cx - 0.18, body + rise * 0.6, z + w / 2 - 0.18, cx + 0.18, l.top, z + w / 2 + 0.18, 0x8f857a, { top: DARK });
    // a door to the road, lit
    b.box(xe, 0, z + w / 2 - 0.3, xe + 0.06, 1.4, z + w / 2 + 0.3, DOOR, { win: interior(0.5), faces: 'NESWT' });
    z += w + 0.04;
  });
  k.lights.push({ x: l.x1 + 0.5, z: (l.z0 + l.z1) / 2, r: 9, color: '#ffcf8a', k: 0.5 });

  // the quay along the shore, behind the houses: stone in the water, with barrels and folk on it
  const shore = COAST_WEST[COAST_WEST.length - 1][0];
  b.box(shore - 1.4, -1.6, l.z0 - 1.4, shore, 0.05, l.z1 + 1.5, STONE.white, { faces: 'NSWT', top: 0xcfc6b0 });
  for (let i = 0; i < 5; i++) barrel(b, shore - 0.4 - (i % 2) * 0.55, l.z0 + 0.4 + i * 1.5 + r() * 0.4, 0.05);
  for (const zz of [l.z0 + 2.2, l.z0 + 6.4]) k.person(shore - 0.8, zz, 0.05);
  for (const zz of [l.z0 + 1.2, l.z0 + 5.2]) b.cyl(shore - 1.25, zz, 0.05, 0.45, 0.1, 0.1, 6, TIMBER_DARK);
  rowboat(b, shore - 2.4, l.z0 + 3, Math.PI / 2, 0x6f8fa0);
  rowboat(b, shore - 2.3, l.z0 + 7.4, Math.PI / 2 + 0.2, 0x9a5a3a);
};

/**
 * The Citadel, where the maesters are made. Kept low along the road, so that
 * the roseroad shows over it: a low range on each side of a gate passage.
 * Along the shore stand what is tall, apart from each other: the rookery's
 * round tower and a domed hall, joined by a stone bridge high over the gate,
 * and before the gate the two green sphinxes.
 */
const citadel: Model = (k, l) => {
  const b = k.b, P = PALE, PS = PALE_SHADE, mid = l.z0 + 3.0;
  const gx = l.x0 + 4.3, gw = 1.2;
  // the low ranges along the north, either side of the gate passage
  for (const [xa, xb] of [[l.x0 + 0.3, gx - gw / 2 - 0.15], [gx + gw / 2 + 0.15, l.x1 - 0.3]]) {
    b.box(xa, 0, l.z0 + 0.3, xb, 3.4, mid - 0.1, P, { win: { cell: 1.3, storey: 3.4, lit: 0.45, kind: 4 } });
    gable(b, xa, l.z0 + 0.3, xb, mid - 0.1, 3.4, 0.85, ROOF.slate, P, 'x', 0.2);
  }
  // the gate: an arch through a low block, in line with the passage, its way lit within
  b.box(gx - gw / 2 - 0.15, 0, mid - 0.1, gx + gw / 2 + 0.15, 3.9, mid + 0.7, P, { faces: 'EWSNT', top: PS });
  b.box(gx - gw / 2, 0, mid + 0.7, gx + gw / 2, 2.0, mid + 0.76, DARK, { win: interior(0.7), faces: 'SEWT' });
  roundel(b, [gx, 2.0, mid + 0.77], gw / 2, 'S', DARK, { win: interior(0.7) });
  // the sphinxes, one each side, on plinths, looking south
  for (const s of [-1, 1]) {
    const sx = gx + s * 1.35;
    b.box(sx - 0.45, 0, mid + 0.75, sx + 0.45, 0.45, mid + 1.95, PS, { top: P });
    sphinx(b, sx, mid + 1.35, 0.45);
  }
  // the rookery: a slender round tower at the west end, its cone dotted with ravens
  const tr = 0.7, tx = l.x0 + tr + 0.47, tz = l.z1 - tr - 0.47;
  roundTower(b, tx, tz, tr, l.top - 1, P, { shade: PS, win: { cell: 1.2, storey: 3.0, lit: 0.45, kind: 4 }, sides: 9, cone: { color: ROOF.slate, h: 2.6 } });
  // the domed hall at the east end, and its lantern
  const hx = l.x1 - 1.7, hz = l.z1 - 1.05, hr = 1.0;
  b.box(hx - hr - 0.2, 0, mid, hx + hr + 0.2, 6.0, l.z1 - 0.05, P, { win: { cell: 1.2, storey: 3.0, lit: 0.45, kind: 4 }, top: PS });
  b.cyl(hx, hz, 6.0, 7.0, hr, hr, 10, P, { cap: false, win: { cell: 0.9, storey: 7.0, lit: 0.5, kind: 6 } });
  lathe(b, hx, hz, [[hr + 0.1, 7.0], [hr * 0.95, 8.1], [hr * 0.7, 9.0], [hr * 0.3, 9.6], [0.05, 9.75]], 10, 0xd6cfbf);
  b.cyl(hx, hz, 9.6, 10.4, 0.3, 0.3, 6, P, { cap: PS });
  b.cyl(hx, hz, 10.4, 11.2, 0.36, 0.02, 6, ROOF.slate, { cap: false });
  // the stone bridge between them, high over the gate, with an underside and low parapets
  const by = 7.3, bz0 = l.z1 - 1.35, bz1 = l.z1 - 0.7, bxa = tx + tr, bxb = hx - hr - 0.2;
  b.box(bxa, by, bz0, bxb, by + 0.45, bz1, P, { faces: 'NESWTB', top: PS });
  b.box(bxa, by + 0.45, bz0, bxb, by + 0.8, bz0 + 0.12, P, { faces: 'NSTB' });
  b.box(bxa, by + 0.45, bz1 - 0.12, bxb, by + 0.8, bz1, P, { faces: 'NSTB' });
  // ravens from the rookery, sitting on the parapet
  for (const f of [0.2, 0.55, 0.8]) b.box(bxa + (bxb - bxa) * f - 0.12, by + 0.8, bz1 - 0.12, bxa + (bxb - bxa) * f + 0.12, by + 1.02, bz1, 0x1b1b20);
  // maesters in their grey, one on the bridge
  const maester = { coat: 0x8a8d90, legs: 0x6f7275, hat: 0x8a8d90, hatH: 0.05 };
  figure(b, gx - 0.3, mid + 2.0, 0, maester);
  figure(b, l.x1 - 3.4, mid + 0.3, 0, maester);
  figure(b, (bxa + bxb) / 2, (bz0 + bz1) / 2, by + 0.45, maester);
  fire(k, gx - gw / 2 - 0.3, 2.6, mid + 0.85, 0.2, 0);
  fire(k, gx + gw / 2 + 0.3, 2.6, mid + 0.85, 0.2, 0);
  k.lights.push({ x: gx + 1, z: l.z1 - 1.5, r: 9, color: '#ffcf8a', k: 0.5 });
};

/** A sphinx as the books give the Citadel's: a seated lion with an eagle's wings and a serpent's tail, in green stone. Looks south. */
function sphinx(b: GeoBuilder, x: number, z: number, y: number): void {
  const s = 1.15, G = SPHINX, G2 = 0x437d5a;
  b.moved(x, y, z, Math.PI / 2, () => {
    b.obox(-0.25 * s, 0.32 * s, 0, 0.42 * s, 0.32 * s, 0.3 * s, 0, G);
    b.obox(0.2 * s, 0.78 * s, 0, 0.24 * s, 0.5 * s, 0.26 * s, 0, G);
    for (const side of [-1, 1]) b.obox(0.45 * s, 0.3 * s, side * 0.15 * s, 0.1 * s, 0.3 * s, 0.08 * s, 0, G2);
    b.obox(0.32 * s, 1.45 * s, 0, 0.2 * s, 0.2 * s, 0.17 * s, 0, G);
    for (const side of [-1, 1]) {
      b.beam([0.1 * s, 1.15 * s, side * 0.24 * s], [-0.45 * s, 2.05 * s, side * 0.5 * s], 0.16 * s, 0.05 * s, G2);
      b.beam([0.0, 1.0 * s, side * 0.26 * s], [-0.65 * s, 1.55 * s, side * 0.48 * s], 0.13 * s, 0.04 * s, G2);
    }
    b.sweep([[-0.62 * s, 0.2 * s, 0.1 * s], [-0.9 * s, 0.25 * s, 0.3 * s], [-0.95 * s, 0.55 * s, 0.38 * s], [-0.8 * s, 0.8 * s, 0.3 * s]], [0.08 * s, 0.07 * s, 0.06 * s, 0.03 * s], G2);
  });
}

/**
 * The Starry Sept: black marble. A low body along the road, with tall arched
 * windows that glow, and on its south side a drum of seven sides with slits
 * of light, and a dome with gilt stars on it.
 */
const starrySept: Model = (k, l) => {
  const b = k.b, B = STONE.black, BS = STONE.blackShade, H = 4.0;
  const x0 = l.x0 + 0.4, x1 = l.x1 - 0.4, z0 = l.z0 + 0.4, z1 = l.z1 - 0.3;
  b.box(x0, 0, z0, x1, H, z1, B, { top: BS });
  b.box(x0 - 0.1, H, z0 - 0.1, x1 + 0.1, H + 0.4, z1 + 0.1, BS, { faces: 'NESWTB', top: 0x2e2b31 });
  // the tall arched windows, on every side
  const lit = interior(0.85), wy0 = 0.9, wy1 = 3.0, ww = 0.26;
  const along = (a: number, c: number, n: number, put: (u: number) => void): void => { for (let i = 0; i < n; i++) put(a + ((i + 0.5) * (c - a)) / n); };
  along(x0, x1, 5, (u) => {
    b.box(u - ww, wy0, z1, u + ww, wy1, z1 + 0.05, DARK, { win: lit, faces: 'SEWT' });
    roundel(b, [u, wy1, z1 + 0.06], ww, 'S', DARK, { win: lit }, 8);
    b.box(u - ww, wy0, z0 - 0.05, u + ww, wy1, z0, DARK, { win: lit, faces: 'NEWT' });
    roundel(b, [u, wy1, z0 - 0.06], ww, 'N', DARK, { win: lit }, 8);
  });
  along(z0, z1, 3, (u) => {
    b.box(x1, wy0, u - ww, x1 + 0.05, wy1, u + ww, DARK, { win: lit, faces: 'ENST' });
    roundel(b, [x1 + 0.06, wy1, u], ww, 'E', DARK, { win: lit }, 8);
    b.box(x0 - 0.05, wy0, u - ww, x0, wy1, u + ww, DARK, { win: lit, faces: 'WNST' });
    roundel(b, [x0 - 0.06, wy1, u], ww, 'W', DARK, { win: lit }, 8);
  });
  // the drum and the dome, on the south side of the roof
  const cx = (l.x0 + l.x1) / 2, cz = l.z1 - 1.25, r = 1.0, top = H + 0.4;
  b.cyl(cx, cz, top, top + 2.2, r, r, 7, B, { cap: false, win: { cell: 0.8, storey: top + 2.2, lit: 0.6, kind: 6 }, phase: Math.PI / 2 });
  b.cyl(cx, cz, top + 2.2, top + 2.45, r + 0.12, r + 0.12, 7, ROOF.gilt, { cap: false, phase: Math.PI / 2 });
  const d0 = top + 2.45;
  lathe(b, cx, cz, [[r + 0.05, d0], [r * 0.95, d0 + 1.1], [r * 0.7, d0 + 2.0], [r * 0.3, d0 + 2.6], [0.05, d0 + 2.75]], 7, 0x2b282e);
  // gilt stars on the dome
  for (let i = 0; i < 7; i++) {
    const a = Math.PI / 2 + ((i + 0.5) / 7) * Math.PI * 2, h = i % 2 ? 0.7 : 1.6, rr = i % 2 ? r * 0.92 : r * 0.78;
    b.box(cx + Math.cos(a) * rr - 0.1, d0 + h, cz + Math.sin(a) * rr - 0.1, cx + Math.cos(a) * rr + 0.1, d0 + h + 0.2, cz + Math.sin(a) * rr + 0.1, ROOF.gilt);
  }
  b.cyl(cx, cz, d0 + 2.6, d0 + 3.3, 0.26, 0.26, 7, B, { cap: BS });
  b.cyl(cx, cz, d0 + 3.3, l.top + 0.8, 0.08, 0.04, 4, ROOF.gilt, { cap: false });
  b.box(cx - 0.3, l.top + 0.4, cz - 0.05, cx + 0.3, l.top + 0.6, cz + 0.05, ROOF.gilt, { faces: 'NESWTB' });
  // the door to the east, its steps, and a septon on them
  b.box(x1, 0, (z0 + z1) / 2 - 0.5, x1 + 0.06, 2.0, (z0 + z1) / 2 + 0.5, DARK, { win: interior(0.8), faces: 'ENST' });
  roundel(b, [x1 + 0.07, 2.0, (z0 + z1) / 2], 0.5, 'E', DARK, { win: interior(0.8) });
  for (let i = 0; i < 3; i++) b.box(x1 + 0.06 + i * 0.35, 0, (z0 + z1) / 2 - 0.9, x1 + 0.41 + i * 0.35, 0.36 - i * 0.12, (z0 + z1) / 2 + 0.9, BS, { faces: 'NESWT' });
  figure(b, x1 + 1.5, (z0 + z1) / 2 + 1.3, 0, { coat: 0xeeeae0, legs: 0xdedad0, hat: 0xeeeae0, hatH: 0.05 });
  k.person(x1 + 2.0, (z0 + z1) / 2 - 1.2);
  k.lights.push({ x: x1 + 0.5, z: (z0 + z1) / 2, r: 9, color: '#ffcf8a', k: 0.5 });
};

// ---------------------------------------------------------------------------
// Bridges
// ---------------------------------------------------------------------------

/**
 * What carries a road over water: a body of stone along a line of corners,
 * from below the water up to just under the road, cut by arches between its
 * piers; cutwaters at the piers, and a parapet along each edge.
 */
function bridge(k: Build, pts: P2[], arches: [number, number][], o: { spring: number; crown: number; ext0: number; ext1: number }): void {
  const b = k.b, W = STONE.white, S = STONE.whiteShade, half = 4.5, top = -0.015;
  const segs = pts.slice(1).map((p, i) => {
    const a = pts[i], dx = p[0] - a[0], dz = p[1] - a[1], len = Math.hypot(dx, dz);
    return { a, dx: dx / len, dz: dz / len, len };
  });
  const L = segs.reduce((s, g) => s + g.len, 0);
  const at = (s: number): { x: number; z: number; yaw: number; nx: number; nz: number } => {
    let rest = Math.max(0, Math.min(L, s));
    for (const g of segs) {
      if (rest <= g.len + 1e-6 || g === segs[segs.length - 1]) return { x: g.a[0] + g.dx * rest, z: g.a[1] + g.dz * rest, yaw: Math.atan2(g.dz, g.dx), nx: -g.dz, nz: g.dx };
      rest -= g.len;
    }
    throw new Error('unreachable');
  };
  const n = Math.ceil(L / 0.42);
  for (let i = 0; i < n; i++) {
    const s0 = (i / n) * L, s1 = ((i + 1) / n) * L, m = (s0 + s1) / 2, p = at(m);
    let bottom = -1.6;
    for (const [a, c] of arches) if (m > a && m < c) bottom = o.spring + (o.crown - o.spring) * Math.sin((Math.PI * (m - a)) / (c - a));
    b.obox(p.x, (bottom + top) / 2, p.z, (s1 - s0) / 2 + 0.02, (top - bottom) / 2, half, p.yaw, W, { top: S, faces: 'B' });
  }
  // cutwaters at each pier, pointed up and down the water
  for (let i = 0; i + 1 < arches.length; i++) {
    const p = at((arches[i][1] + arches[i + 1][0]) / 2);
    for (const side of [-1, 1]) b.obox(p.x + p.nx * side * half, -0.95, p.z + p.nz * side * half, 0.42, 0.65, 0.42, p.yaw + Math.PI / 4, W, { top: S });
  }
  // the parapets, a stretch for each straight of the line, running on a little over the land at each end
  segs.forEach((g, i) => {
    const s0 = i === 0 ? -o.ext0 : -0.2, s1 = g.len + (i === segs.length - 1 ? o.ext1 : 0.2);
    const mx = g.a[0] + g.dx * (s0 + s1) / 2, mz = g.a[1] + g.dz * (s0 + s1) / 2;
    for (const side of [-1, 1]) {
      b.obox(mx + -g.dz * side * 4.25, (top + 0.9) / 2, mz + g.dx * side * 4.25, (s1 - s0) / 2, (0.9 - top) / 2, 0.2, Math.atan2(g.dz, g.dx), W, { top: S });
    }
  });
  // a post at each end of each parapet
  for (const s of [-o.ext0, L + o.ext1]) {
    const p = at(s), e = s < 0 ? s : s - L, x = p.x + Math.cos(p.yaw) * e, z = p.z + Math.sin(p.yaw) * e;
    for (const side of [-1, 1]) b.cyl(x + p.nx * side * 4.25, z + p.nz * side * 4.25, -0.015, 1.25, 0.32, 0.3, 4, W, { phase: Math.PI / 4 + p.yaw, cap: S });
  }
}

/** The bridge where the ocean road crosses the Mander, of two arches. */
function manderBridge(k: Build): void {
  const x = ROADS.ocean[0][0], zc = 58.9;
  bridge(k, [[x, zc - 3.3], [x, zc + 3.3]], [[1.85, 3.1], [3.5, 4.75]], { spring: -0.8, crown: -0.26, ext0: 0.6, ext1: 0.6 });
}

/** The bridge to Battle Isle: from the mainland's shore along the isle road, and in towards the ring round the tower. */
function isleBridge(k: Build): void {
  const R = ROADS.isle, I = ISLANDS.battle, T = TURNS.tower;
  const shore = COAST_WEST[COAST_WEST.length - 1][0];
  const a = R[1], j = R[2], t = (shore - a[0]) / (j[0] - a[0]), start: P2 = [shore, a[1] + (j[1] - a[1]) * t];
  const dx = T.c[0] - j[0], dz = T.c[1] - j[1], d = Math.hypot(dx, dz), inland = d - (I.rx - 0.35);
  const end: P2 = [j[0] + (dx / d) * inland, j[1] + (dz / d) * inland];
  const L = Math.hypot(j[0] - start[0], j[1] - start[1]) + inland, wet = L - 0.35, pier = wet / 2;
  bridge(k, [start, j, end], [[0.45, pier - 0.3], [pier + 0.3, wet - 0.3]], { spring: -0.95, crown: -0.38, ext0: 0.5, ext1: 0.1 });
}

// ---------------------------------------------------------------------------
// The harbour south of the bridge: a pier with a pierhead, ships, and the quay by the Citadel
// ---------------------------------------------------------------------------

function harbour(k: Build): void {
  const b = k.b, shore = COAST_WEST[COAST_WEST.length - 1][0], cit = lotOf('citadel'), r = rng(0x4a7b);
  const pz0 = cit.z0 + 1.9, pz1 = pz0 + 1.4, hx0 = shore - 12.3, hx1 = shore - 6.2, hz0 = cit.z0 + 0.1, hz1 = cit.z1 + 0.2;
  b.box(hx1, -1.6, pz0, shore, 0.3, pz1, STONE.white, { faces: 'NST', top: 0xcfc6b0 });
  b.box(hx0, -1.6, hz0, hx1, 0.3, hz1, STONE.white, { faces: 'NESWT', top: 0xcfc6b0 });
  // the quay ashore, between the shore and the Citadel
  area(k, [[shore + 0.05, cit.z0 + 0.1], [cit.x0 - 0.1, cit.z0 + 0.1], [cit.x0 - 0.1, cit.z1 + 0.3], [shore + 0.05, cit.z1 + 0.3]], 0xcfc6b0, 0.035);
  for (let i = 0; i < 6; i++) barrel(b, shore + 0.5 + (i % 2) * 0.6, cit.z0 + 0.8 + Math.floor(i / 2) * 0.7 + r() * 0.2, 0.035);
  for (let i = 0; i < 4; i++) barrel(b, hx1 + 1 + i * 0.75, pz0 + 0.35, 0.3);
  b.box(hx1 - 1.4, 0.3, hz1 - 1.4, hx1 - 0.4, 0.9, hz1 - 0.4, TIMBER, { top: 0x8a6a48 });
  for (const [px, pz, py] of [[shore - 2.2, pz0 + 0.9, 0.3], [hx0 + 1.6, hz0 + 0.8, 0.3], [hx1 - 1, hz1 - 0.8, 0.3], [shore + 1.2, cit.z1 - 0.6, 0.035], [shore + 0.6, cit.z0 + 3.3, 0.035]]) k.person(px, pz, py);
  for (const x of [hx1 + 0.4, hx1 + 3.4, shore - 0.4]) b.cyl(x, pz0 + 0.12, 0.3, 0.75, 0.11, 0.11, 6, TIMBER_DARK);
  // ships at their moorings: one along the pier, one off the pierhead
  ship(k, (hx1 + shore) / 2 - 0.3, pz0 - 0.85, 0, 5.4, 1.3, 8.4, SAIL, ROSE_RED);
  ship(k, hx0 - 1.3, (hz0 + hz1) / 2 - 1.5, -Math.PI / 2, 5.8, 1.4, 8.8, SAIL);
  // a lamp on the pierhead, and the board that names the tower over the water
  b.cyl(hx0 + 0.4, hz0 + 0.4, 0.3, 2.6, 0.08, 0.08, 6, IRONWORK, { cap: false });
  k.glows.push({ x: hx0 + 0.4, y: 2.8, z: hz0 + 0.4, sx: 0.35, sy: 0.4, sz: 0.35, color: '#ffd38a' });
  k.lights.push({ x: (hx0 + hx1) / 2, z: (hz0 + hz1) / 2, r: 9, color: '#ffcf8a', k: 0.45 });
  nameBoard(k, 'reach-hightower', (hx0 + hx1) / 2 + 0.05, (hz0 + hz1) / 2, 0.3, SE, 0.9);
}

// ---------------------------------------------------------------------------
// The file's shape
// ---------------------------------------------------------------------------

export const MODELS: Record<string, Model> = {
  'hg-outer': hgOuter,
  'hg-mid': hgMid,
  'hg-inner': hgInner,
  'hg-towers': hgTowers,
  'hightower-base': htBase,
  'hightower-1': htTier1,
  'hightower-2': htTier2,
  hightower: htTop,
  oldtown,
  citadel,
  'starry-sept': starrySept,
};
export const COVERS: string[] = [];
export const SIGNS: SignDef[] = [
  nameSign('reach-highgarden', 'Highgarden'),
  nameSign('reach-hightower', 'The Hightower'),
  nameSign('reach-oldtown', 'Oldtown'),
  nameSign('reach-citadel', 'Citadel'),
  nameSign('reach-starry-sept', 'Starry Sept'),
];
export const FLOORED: string[] = [];

export function heightAt(x: number, z: number): number {
  return hillAt(x, z);
}

export function extras(k: Build): void {
  courtOfRoses(k);
  manderBridge(k);
  isleBridge(k);
  isleRim(k);
  harbour(k);
  // the names, where the view the tile opens with reads them
  const hg = lotOf('hg-outer'), ot = lotOf('oldtown'), cit = lotOf('citadel'), sept = lotOf('starry-sept');
  nameBoard(k, 'reach-highgarden', hg.x1 + 15.5, hg.z1 - 4.8, 0, SE, 1.4);
  nameBoard(k, 'reach-oldtown', (ot.x0 + ot.x1) / 2 - 0.25, ot.z1 - 0.4, 0, SE, 0.95);
  // the Citadel's board stands high on long posts in the gap beside it, so that it reads over the Sept's low body
  const cbx = cit.x1 + 0.7, cbz = cit.z1 - 1.4, lift = 2.6, cw = k.sign('reach-citadel', cbx, lift + 2.3 + 0.4, cbz, SE[0], SE[2], 0.8, 9);
  for (const s of [-1, 1]) {
    const px = cbx - SE[2] * s * (cw / 2 + 0.12) - SE[0] * 0.1, pz = cbz + SE[0] * s * (cw / 2 + 0.12) - SE[2] * 0.1;
    k.b.beam([px, 0, pz], [px, lift + 3.3, pz], 0.13, 0.11, TIMBER);
  }
  k.b.obox(cbx - SE[0] * 0.06, lift + 2.7, cbz - SE[2] * 0.06, cw / 2 + 0.12, 0.5, 0.05, Math.atan2(SE[0], -SE[2]), TIMBER_DARK, { faces: 'B' });
  nameBoard(k, 'reach-starry-sept', sept.x1 + 3.6, sept.z1 - 2.3, 0, SE, 1.0);
}
