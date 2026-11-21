// The Sprang's west quay and the Battery: the Diamond District, Gotham National Bank with the screen, the Iceberg Lounge, the pier, and the two bascule bridges.
//
// What is the comics' and what is this tile's own drawing:
// - The Iceberg Lounge is the Penguin's club (Detective Comics #683, 1995), but the comics give it no look and no
//   place. Its look here is the tile's own: a deco club of pale stone and black glass on the wedge where the Sprang
//   meets the bay, a faceted neon iceberg in ice blue over a door cut across its south-east corner, the name in plain
//   lettering, a canopy, a doorman and a queue under umbrellas, and a roof terrace for the Penguin to land on.
// - Gotham National Bank: a plain classical bank of the tile's own, its door to the south onto Bank Square, where
//   Two-Face's first story (a bank robbed, the loot given to charity at the coin's word) can play. The tile's screen
//   stands on its roof on a steel frame.
// - The Diamond District is on Eliot R. Brown's map, with no look given: two rows of jewellers with lit windows, an
//   alarm bell, and an umbrella shop with a giant umbrella over its door, after Penguin Umbrellas Inc. (Batman #70).
// - The pier: the Riddler built a glass maze on a pier in his first story (Detective Comics #140) and had worked a
//   carnival booth; here a green puzzle booth under a question mark at its landward end, and a ferry landing.
// - The two bascule bridges are of Chicago's kind, after Brown's map, which gives the Sprang bascule bridges: no one
//   design is copied.

import type { V3 } from '../../engine/geo';
import { interior } from '../../engine/geo';
import { flat } from '../../engine/ground';
import { hipped, lathe, roundel } from '../../engine/parts';
import { face3, hip, prism, type XZ } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { inWater, landAt } from './land';
import {
  AMBER, BRASS, BRICK_DARK, DARK, GLASS, ICE, IRON, IRON_DARK, LEAD, LIMESTONE, LIMESTONE_DARK, NEON_GREEN, SLATE, SODIUM,
  STEEL, STONE, STONE_DARK, STONE_LIGHT, STONE_TRIM, TIMBER, TIMBER_DARK, TIMBER_PALE, COPPER, BRICK,
  fireEscape, gargoyle, gasLamp, neon, parapet,
} from './look';
import type { Model, Place } from './models';
import { BAY_ALONG, BAY_SHORE, HERO_SPOTS, SPRANG, STAGES, bay, lotOf, sprang, type Lot } from './plan';
import { SPANS } from './roads';
import { ROAD_HALF, onStage, open, toRoad } from './space';

// ---------------------------------------------------------------------------
// Colours of the waterfront's own
// ---------------------------------------------------------------------------

/** The Lounge's pale stone, its trim, and its black glass. */
const PALE = 0xc4bfb3, PALE_TRIM = 0xdcd7ca, BLACK_GLASS = 0x16191f;
/** The iceberg's two shades, so that its facets read. */
const ICE_A = 0xcdf3ff, ICE_B = 0x7fcdea;
/** The bridges' steel: lighter than it should look, as thin bars come out dark. */
const BRIDGE = 0x5f6b72, BRIDGE_PALE = 0x8a969d, CONCRETE = 0x55585c;
const RIDDLER = 0x2f9a4a, RIDDLER_DARK = 0x1f6b33, PURPLE = 0x5b2a86;
const UMBRELLA_RED = 0xa3242c, DECK_WOOD = 0x8c6f50;

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------

const box = (id: string, text: string, color: string, ink: string, px = 220): SignDef => ({ id, lines: [text], color, ink, aspect: px / 52, kind: 'box', size: [px, 52] });
const board = (id: string, text: string, color: string, ink: string, px: number, h = 52): SignDef => ({ id, lines: [text], color, ink, aspect: px / h, kind: 'board', size: [px, h] });

export const SIGNS: SignDef[] = [
  { id: 'waterfront-iceberg-lounge', lines: ['ICEBERG LOUNGE'], color: ICE, aspect: 7.2, size: [576, 80] },
  board('waterfront-bank', 'GOTHAM NATIONAL BANK', '#a29f95', '#26272c', 640),
  { id: 'waterfront-diamond-district', lines: ['DIAMOND DISTRICT'], color: '#7fe8ff', aspect: 7.6, size: [608, 80] },
  box('waterfront-jewels', 'JEWELS', '#f3d98a', '#3a2a0c'),
  box('waterfront-diamonds', 'DIAMONDS', '#dff4ff', '#12304a', 260),
  box('waterfront-watches', 'WATCHES', '#f2ead8', '#2b2620', 240),
  box('waterfront-gems', 'GEMS', '#c9f0e0', '#0e3b2c', 180),
  box('waterfront-pawn', 'PAWN', '#f0c98a', '#3d230c', 180),
  box('waterfront-umbrellas', 'UMBRELLAS', '#f1e4e4', '#6e141b', 280),
  board('waterfront-ferry', 'BLACKGATE FERRY', '#1d1f24', '#e9e2cf', 440, 60),
  board('waterfront-charity', 'CHARITY', '#b3262d', '#fbefe0', 180, 56),
  board('waterfront-puzzles', 'PUZZLES', '#1f6b33', '#e6ffd6', 200, 56),
];
const ASPECT = new Map(SIGNS.map((s) => [s.id, s.aspect]));

/**
 * Hangs a sign on a wall whose face is at (x, z) and faces (nx, nz): a thin dark board just off the wall, and the
 * sign 0.03 in front of it.
 */
function hang(k: Build, id: string, x: number, y: number, z: number, nx: number, nz: number, h: number, maxW = Infinity, backing = DARK): void {
  const w = k.sign(id, x + nx * 0.14, y, z + nz * 0.14, nx, nz, h, maxW);
  const hh = Math.min(h, w / (ASPECT.get(id) ?? 1));
  k.b.obox(x + nx * 0.06, y, z + nz * 0.06, w / 2 + 0.1, hh / 2 + 0.08, 0.05, Math.atan2(-nx, nz), backing, { faces: 'NESWTB' });
}

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

/** A convex outline grown outwards by `d` (or shrunk, if `d` is negative). */
function grow(P: XZ[], d: number): XZ[] {
  const cx = P.reduce((s, p) => s + p[0], 0) / P.length, cz = P.reduce((s, p) => s + p[1], 0) / P.length;
  const nOf = (a: XZ, b: XZ): XZ => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    let nx = (b[1] - a[1]) / l, nz = -(b[0] - a[0]) / l;
    if (nx * ((a[0] + b[0]) / 2 - cx) + nz * ((a[1] + b[1]) / 2 - cz) < 0) { nx = -nx; nz = -nz; }
    return [nx, nz];
  };
  return P.map((p, i) => {
    const a = nOf(P[(i + P.length - 1) % P.length], p), b = nOf(p, P[(i + 1) % P.length]);
    const s = d / (1 + a[0] * b[0] + a[1] * b[1]);
    return [p[0] + (a[0] + b[0]) * s, p[1] + (a[1] + b[1]) * s];
  });
}

/** An umbrella held up over a person's head, `r` across its canopy, on ground `y`. */
function brolly(k: Build, x: number, z: number, y: number, r: number, color: number): void {
  const b = k.b, rim = y + 2.7, top = y + 3.1;
  b.beam([x + 0.18, y + 1.25, z + 0.05], [x, top, z], 0.035, 0.035, DARK);
  b.cyl(x, z, rim, top, r, 0.05, 6, color, { cap: false });
  const p = (i: number): V3 => [x + Math.cos(Math.PI / 6 + (i * Math.PI) / 3) * r, rim, z + Math.sin(Math.PI / 6 + (i * Math.PI) / 3) * r];
  for (let i = 1; i < 5; i++) face3(b, p(0), p(i), p(i + 1), [0, -1, 0], 0x202024);
}

/** A cast-iron bollard on the quay's edge. */
function bollard(k: Build, x: number, z: number, y = 0): void {
  k.b.cyl(x, z, y, y + 0.5, 0.22, 0.18, 5, IRON, { cap: false });
  k.b.cyl(x, z, y + 0.5, y + 0.62, 0.28, 0.24, 5, IRON);
}

/** A rail along a line of corners, on posts: a top rail and a middle one. */
function rail(k: Build, pts: XZ[], y: number, color = STEEL, h = 1.0, every = 2.4): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az);
    if (len < 0.05) continue;
    const yaw = Math.atan2(bz - az, bx - ax);
    k.b.obox((ax + bx) / 2, y + h - 0.05, (az + bz) / 2, len / 2, 0.05, 0.05, yaw, color, { faces: 'NESWTB' });
    k.b.obox((ax + bx) / 2, y + h * 0.5, (az + bz) / 2, len / 2, 0.03, 0.03, yaw, color, { faces: 'NESWTB' });
    const n = Math.max(1, Math.round(len / every));
    for (let j = i === 0 ? 0 : 1; j <= n; j++) {
      const t = j / n, px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
      k.b.box(px - 0.06, y, pz - 0.06, px + 0.06, y + h - 0.1, pz + 0.06, color, { faces: 'NESW' });
    }
  }
}

/** A bench that faces the way `yaw` points. */
function bench(k: Build, x: number, z: number, yaw: number): void {
  k.b.moved(x, 0, z, yaw, () => {
    k.b.box(-0.35, 0.5, -1.0, 0.25, 0.62, 1.0, TIMBER, { faces: 'NESWTB' });
    k.b.box(-0.45, 0.62, -1.0, -0.33, 1.25, 1.0, TIMBER, { faces: 'NESWTB' });
    for (const s of [-0.85, 0.85]) k.b.box(-0.4, 0, s - 0.07, 0.2, 0.5, s + 0.07, IRON_DARK, { faces: 'NESW' });
  });
}

/** Is a place open quay where a small thing of ours may stand: off the roads, off the stages, on land, off the hero's strip. */
function free(x: number, z: number, room = 0.6): boolean {
  return open(x, z, room, ['iceberg-lounge', 'bank', 'diamond-1', 'diamond-2', 'pier']) && !onStage(x, z, room);
}

/** A person, if the place is open. */
function stand(k: Build, x: number, z: number, y = 0, umbrella = -1, room = 0.6): boolean {
  if (y === 0 && !free(x, z, room)) return false;
  k.person(x, z, y);
  if (umbrella >= 0) brolly(k, x, z, y, 0.95, umbrella);
  return true;
}

const BROLLIES = [0x1c1d22, 0x1c1d22, 0x2b2f3a, 0x6e1d24, 0x1c1d22, 0x2d3d32, 0xc9a23a, 0x1c1d22];

/**
 * Lays paving in strips over a rectangle wherever `ok` says, so that it keeps off a road: rows `cell` deep, each a
 * run of cells merged into one quad.
 */
function pave(k: Build, x0: number, z0: number, x1: number, z1: number, cell: number, y: number, color: number, ok: (x: number, z: number) => boolean): void {
  for (let z = z0; z < z1 - 1e-6; z += cell) {
    const zb = Math.min(z1, z + cell);
    let run: number | null = null;
    for (let x = x0; x <= x1 + 1e-6; x += cell) {
      const xb = Math.min(x1, x + cell);
      const good = x < x1 - 1e-6 && ok((x + xb) / 2, (z + zb) / 2) && ok(x, z) && ok(xb, z) && ok(x, zb) && ok(xb, zb);
      if (good && run === null) run = x;
      if (!good && run !== null) {
        flat(k.street, [[run, z], [x, z], [x, zb], [run, zb]], y, color, { win: { cell: 1.2, storey: 1, lit: 0.5, kind: 1 } });
        run = null;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// The Iceberg Lounge
// ---------------------------------------------------------------------------

/** How much of the Lounge's south-east corner is cut away for its door. */
const CHAMFER = 5.5;

/** The Lounge's outline, inset from its lot, with its corner cut, and the cut's two ends and middle. */
function loungePlan(l: Lot): { P: XZ[]; A: XZ; B: XZ; M: XZ; U: XZ; N: XZ } {
  const x0 = l.x0 + 0.3, z0 = l.z0 + 0.3, x1 = l.x1 - 0.3, z1 = l.z1 - 0.3;
  const A: XZ = [x1, z1 - CHAMFER], B: XZ = [x1 - CHAMFER, z1];
  return { P: [[x0, z0], [x1, z0], A, B, [x0, z1]], A, B, M: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], U: [-Math.SQRT1_2, Math.SQRT1_2], N: [Math.SQRT1_2, Math.SQRT1_2] };
}
const LOUNGE = loungePlan(lotOf('iceberg-lounge'));
/** The searchlights' bases, one at each end of the forecourt. */
const LIGHTS: XZ[] = [
  [LOUNGE.A[0] + LOUNGE.U[0] * 1.1 + LOUNGE.N[0] * 0.9, LOUNGE.A[1] + LOUNGE.U[1] * 1.1 + LOUNGE.N[1] * 0.9],
  [LOUNGE.B[0] - LOUNGE.U[0] * 1.1 + LOUNGE.N[0] * 0.9, LOUNGE.B[1] - LOUNGE.U[1] * 1.1 + LOUNGE.N[1] * 0.9],
];
const SEARCHLIGHT_TOP = 1.45;
/** The terrace's floor. */
const TERRACE = STAGES.loungeRoof.y;

function iceberg(k: Build, l: Lot): void {
  const b = k.b, { P, A, B, M, U, N } = LOUNGE;
  const x0 = l.x0 + 0.3, z0 = l.z0 + 0.3, x1 = l.x1 - 0.3, z1 = l.z1 - 0.3;
  const at = (u: number, y: number, o: number): V3 => [M[0] + U[0] * u + N[0] * o, y, M[1] + U[1] * u + N[1] * o];

  // the ground storey: pale stone, its windows lit like a club's, and a band of trim over it
  prism(b, P, 0, 4, PALE, { win: { cell: 2.2, storey: 4, lit: 1.0, kind: 2 }, top: false });
  prism(b, grow(P, 0.15), 3.9, 4.3, PALE_TRIM);
  // three storeys of black glass, and the cornice that is the terrace's floor
  prism(b, grow(P, -0.1), 4.3, 11.6, BLACK_GLASS, { win: { cell: 1.4, storey: 4, lit: 0.95, kind: 1 }, top: false });
  prism(b, grow(P, 0.22), 11.6, TERRACE, PALE_TRIM, { top: PALE });
  // an ice-blue band at each floor across the glass
  for (const y of [7.85]) prism(b, grow(P, -0.03), y, y + 0.32, 0x6fb6d2, { top: false });

  // pale fins up the glass, the deco ribs, on every side but the cut corner where the iceberg hangs
  P.forEach((p, i) => {
    const q = P[(i + 1) % P.length];
    if (p === A) return;
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]), dx = (q[0] - p[0]) / len, dz = (q[1] - p[1]) / len;
    const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2;
    let nx = dz, nz = -dx;
    if (nx * (mx - (x0 + x1) / 2) + nz * (mz - (z0 + z1) / 2) < 0) { nx = -nx; nz = -nz; }
    const n = Math.max(2, Math.round(len / 2.1));
    for (let j = 0; j <= n; j++) {
      const s = 0.2 + ((len - 0.4) * j) / n, px = p[0] + dx * s + nx * 0.1, pz = p[1] + dz * s + nz * 0.1;
      const tall = j === 0 || j === n;
      b.obox(px, (4.3 + (tall ? 12.9 : 12.3)) / 2, pz, 0.16, ((tall ? 12.9 : 12.3) - 4.3) / 2, 0.24, Math.atan2(dz, dx), PALE_TRIM, { faces: 'B' });
      // the corner fins carry neon up their faces
      if (tall) k.glows.push({ x: px + nx * 0.27, y: 8.6, z: pz + nz * 0.27, sx: Math.abs(nx) > 0.5 ? 0.06 : 0.14, sy: 8.4, sz: Math.abs(nz) > 0.5 ? 0.06 : 0.14, color: ICE });
    }
  });
  // neon along the cornice of the two faces the view sees
  neon(k, [x0 - 0.25, 11.55, z1 + 0.25], [B[0], 11.55, z1 + 0.25], ICE);
  neon(k, [x1 + 0.25, 11.55, z0 - 0.25], [x1 + 0.25, 11.55, A[1]], ICE);
  neon(k, [x0 - 0.25, 4.38, z1 + 0.2], [B[0], 4.38, z1 + 0.2], ICE, 0.1);
  neon(k, [x1 + 0.2, 4.38, z0 - 0.25], [x1 + 0.2, 4.38, A[1]], ICE, 0.1);

  // the terrace: a low parapet round its open sides, planters at its back, and the stair head in the north-west
  const ins = grow(P, -0.15);
  const head = 5.2;
  parapet(b, [[x0 + head, ins[0][1]], ins[1], ins[2], ins[3], ins[4], [ins[4][0], z0 + head]], TERRACE, 0.7, 0.24, PALE_TRIM);
  for (const [px, pz] of [[x1 - 1.0, z0 + 1.0], [x0 + 1.0, z1 - 1.0]] as XZ[]) {
    b.box(px - 0.5, TERRACE, pz - 0.5, px + 0.5, TERRACE + 0.6, pz + 0.5, STONE_TRIM);
    b.box(px - 0.4, TERRACE + 0.6, pz - 0.4, px + 0.4, TERRACE + 1.0, pz + 0.4, 0x3f5a3a);
  }
  b.box(x0, TERRACE, z0, x0 + head, 13.4, z0 + head, PALE, { win: { cell: 1.7, storey: 4, lit: 0.9, kind: 4 } });
  b.box(x0 + 0.5, 13.4, z0 + 0.5, x0 + head - 0.5, 14.0, z0 + head - 0.5, PALE_TRIM, { top: LEAD });
  // its door onto the terrace, lit from within
  b.box(x0 + head - 0.05, TERRACE, z0 + 2.0, x0 + head + 0.06, TERRACE + 2.3, z0 + 3.4, DARK, { win: interior(1.4), faces: 'ESWT' });
  b.box(x0 + 1.6, TERRACE, z0 + head - 0.05, x0 + 3.4, TERRACE + 2.3, z0 + head + 0.06, DARK, { win: interior(1.4), faces: 'NESWT' });
  // the neon spire
  const sx = x0 + head / 2, sz = z0 + head / 2;
  lathe(b, sx, sz, [[1.0, 14.0], [0.62, 15.3], [0.34, 16.6], [0.05, 18.0]], 8, PALE_TRIM);
  for (const [y, r] of [[14.6, 0.95], [15.6, 0.62], [16.6, 0.4]]) k.glows.push({ x: sx, y, z: sz, sx: r * 1.6, sy: 0.12, sz: r * 1.6, color: ICE });
  k.glows.push({ x: sx, y: 17.75, z: sz, sx: 0.26, sy: 0.4, sz: 0.26, color: '#e9fbff' });

  // the door across the cut corner, lit, under a canopy out over the forecourt
  b.obox(M[0] + N[0] * 0.02, 1.45, M[1] + N[1] * 0.02, 1.15, 1.45, 0.06, -Math.PI / 4, DARK, { win: interior(1.6) });
  for (const s of [-1, 1]) b.obox(M[0] + U[0] * s * 1.3 + N[0] * 0.08, 1.55, M[1] + U[1] * s * 1.3 + N[1] * 0.08, 0.14, 1.55, 0.12, -Math.PI / 4, BRASS);
  const can = (o: number): XZ => [M[0] + N[0] * o, M[1] + N[1] * o];
  const [cx, cz] = can(1.55);
  b.obox(cx, 3.15, cz, 1.35, 0.1, 1.55, -Math.PI / 4, BLACK_GLASS, { faces: 'B' });
  b.obox(cx, 3.03, cz, 1.3, 0.02, 1.5, -Math.PI / 4, 0x2a3c46, { win: interior(1.2), faces: 'B' });
  for (const s of [-1, 1]) {
    const [px, pz] = can(2.95);
    b.beam([px + U[0] * s * 1.2, 0, pz + U[1] * s * 1.2], [px + U[0] * s * 1.2, 3.05, pz + U[1] * s * 1.2], 0.06, 0.06, BRASS);
  }
  for (let i = 0; i <= 6; i++) {
    const [px, pz] = can(3.12);
    const u = -1.3 + (2.6 * i) / 6;
    k.glows.push({ x: px + U[0] * u, y: 3.16, z: pz + U[1] * u, sx: 0.18, sy: 0.08, sz: 0.18, color: ICE });
  }
  // the name, in plain lettering over the canopy
  const [nx, nz] = [M[0] - N[0] * 0.1, M[1] - N[1] * 0.1];
  hang(k, 'waterfront-iceberg-lounge', nx, 4.9, nz, N[0], N[1], 1.05, 7.2);

  // the iceberg: a crystal of ice-blue facets over the name, its peak over the terrace's corner, lit from within
  const outline: [number, number][] = [[-2.8, 5.6], [-2.55, 7.7], [-1.95, 8.4], [-1.65, 10.0], [-0.75, 10.7], [-0.25, 12.3], [0.3, 13.75], [0.95, 12.05], [1.5, 11.4], [1.95, 9.3], [2.55, 8.5], [2.8, 5.6]];
  const C = at(0.05, 8.5, 1.45), inner = at(0.05, 8.5, 0.3);
  const glass = -0.1;
  for (let i = 0; i < outline.length; i++) {
    const p = outline[i], q = outline[(i + 1) % outline.length];
    const P0 = at(p[0], p[1], glass), Q0 = at(q[0], q[1], glass);
    const ex = (C[0] + P0[0] + Q0[0]) / 3 - inner[0], ey = (C[1] + P0[1] + Q0[1]) / 3 - inner[1], ez = (C[2] + P0[2] + Q0[2]) / 3 - inner[2];
    const ux = P0[0] - C[0], uy = P0[1] - C[1], uz = P0[2] - C[2], vx = Q0[0] - C[0], vy = Q0[1] - C[1], vz = Q0[2] - C[2];
    let n: V3 = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const ln = Math.hypot(...n) || 1;
    n = [n[0] / ln, n[1] / ln, n[2] / ln];
    if (n[0] * ex + n[1] * ey + n[2] * ez < 0) n = [-n[0], -n[1], -n[2]];
    face3(b, C, P0, Q0, n, i % 2 ? ICE_A : ICE_B, { win: interior(1.7) });
    // neon along its outline, and down a few of its facets' edges
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]), steps = Math.max(1, Math.round(len / 0.45));
    if (i < outline.length - 1) for (let j = 0; j < steps; j++) {
      const t = j / steps, g = at(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, 0.08);
      k.glows.push({ x: g[0], y: g[1], z: g[2], sx: 0.15, sy: 0.15, sz: 0.15, color: ICE });
    }
    if (i % 3 === 0) for (let j = 1; j < 6; j++) {
      const t = j / 6, g: V3 = [C[0] + (P0[0] - C[0]) * t, C[1] + (P0[1] - C[1]) * t, C[2] + (P0[2] - C[2]) * t];
      k.glows.push({ x: g[0], y: g[1], z: g[2], sx: 0.11, sy: 0.11, sz: 0.11, color: '#e8fbff' });
    }
  }

  // the searchlights' bases, one each side of the forecourt: the lamps and their beams are the show's
  for (const [px, pz] of LIGHTS) {
    b.cyl(px, pz, 0, 0.25, 0.85, 0.85, 8, PALE_TRIM);
    b.cyl(px, pz, 0.25, 1.15, 0.62, 0.5, 8, PALE);
    b.cyl(px, pz, 1.15, 1.3, 0.62, 0.62, 8, BRASS);
    b.cyl(px, pz, 1.3, SEARCHLIGHT_TOP, 0.5, 0.5, 8, IRON);
  }

  // the doorman, in a dark coat and a top hat, under a big umbrella at the canopy's edge
  const [dx, dz] = can(3.95);
  const ddx = dx, ddz = dz;
  b.box(ddx - 0.34, 0, ddz - 0.22, ddx + 0.34, 0.85, ddz + 0.22, 0x1b1c20, { faces: 'NESW' });
  b.box(ddx - 0.4, 0.85, ddz - 0.25, ddx + 0.4, 1.9, ddz + 0.25, 0x2a2440);
  b.box(ddx - 0.25, 1.9, ddz - 0.25, ddx + 0.25, 2.3, ddz + 0.25, 0xe8c4a0, { faces: 'NESW' });
  b.box(ddx - 0.3, 2.25, ddz - 0.3, ddx + 0.3, 2.3, ddz + 0.3, 0x141418);
  b.box(ddx - 0.2, 2.3, ddz - 0.2, ddx + 0.2, 2.72, ddz + 0.2, 0x141418);
  b.beam([ddx + 0.3, 1.3, ddz], [ddx, 3.25, ddz], 0.04, 0.04, DARK);
  b.cyl(ddx, ddz, 2.92, 3.25, 1.15, 0.06, 8, 0x1c1d22, { cap: false });
  b.cyl(ddx, ddz, 2.91, 2.92, 1.15, 1.15, 8, 0x26262b);

  // the queue along the south front, under umbrellas, behind a rope
  const r = 9;
  for (let i = 0; i < 4; i++) {
    const qx = B[0] - 1.4 - i * 1.3, qz = l.z1 + 0.85;
    k.person(qx, qz, 0);
    brolly(k, qx, qz, 0, 0.9, BROLLIES[(i * 3 + r) % BROLLIES.length]);
  }
  for (let i = 0; i < 4; i++) {
    const px = B[0] - 0.8 - i * 1.7, pz = l.z1 + 1.75;
    if (toRoad(px, pz) < ROAD_HALF + 0.2) continue;
    b.cyl(px, pz, 0, 1.0, 0.07, 0.07, 5, BRASS, { cap: false });
    b.cyl(px, pz, 1.0, 1.12, 0.12, 0.12, 5, BRASS);
    if (i > 0) b.beam([px, 0.85, pz], [px + 1.7, 0.85, pz], 0.04, 0.04, 0x9b1b2a);
  }

  // light: an ice-blue pool on the forecourt, and amber along the south front
  k.lights.push({ x: M[0] + N[0] * 2.5, z: M[1] + N[1] * 2.5, r: 11, color: ICE, k: 0.75 });
  k.lights.push({ x: (x0 + B[0]) / 2, z: l.z1 + 2, r: 8, color: AMBER, k: 0.45 });
  k.lights.push({ x: l.x1 + 2, z: (z0 + A[1]) / 2, r: 8, color: ICE, k: 0.45 });
}

// ---------------------------------------------------------------------------
// Gotham National Bank
// ---------------------------------------------------------------------------

/** Where the screen hangs: its middle, facing the view the tile opens with. */
const SCREEN_N: XZ = [0.669, 0.743];
const SCREEN_R: XZ = [0.743, -0.669];

function bankRoofY(): number { return 11.85; }

function screenAt(l: Lot): V3 {
  return [l.x0 + 5.2, 14.9, l.z0 + 5.0];
}

function bankModel(k: Build, l: Lot): void {
  const b = k.b, { x0, z0, x1, z1 } = l, cx = (x0 + x1) / 2, roof = bankRoofY();
  const front = z1 - 3.0;
  // the podium, and the steps down to the square
  b.box(x0 + 0.1, 0, z0 + 0.1, x1 - 0.1, 1.2, z1 - 0.1, LIMESTONE_DARK);
  for (let i = 0; i < 3; i++) b.box(x0 + 1.2 + i * 0.1, 0, z1 - 0.1, x1 - 1.2 - i * 0.1, 0.4 * (i + 1), z1 + 1.4 - 0.47 * i, LIMESTONE);
  // the body: dark stone, with tall windows
  b.box(x0 + 0.4, 1.2, z0 + 0.4, x1 - 0.4, 11.2, front, STONE, { win: { cell: 2.3, storey: 4, lit: 0.8, kind: 6 }, seed: 3.1 });
  // pilasters on the sides and the back, pale
  for (const [zA, zB] of [[z0 + 0.4, front]]) {
    const n = 4;
    for (let i = 0; i <= n; i++) {
      const z = zA + ((zB - zA) * i) / n;
      b.box(x1 - 0.42, 1.2, z - 0.3, x1 - 0.2, 10.2, z + 0.3, LIMESTONE, { faces: 'NESW' });
      b.box(x0 + 0.2, 1.2, z - 0.3, x0 + 0.42, 10.2, z + 0.3, LIMESTONE, { faces: 'NESW' });
    }
  }
  // the portico: six columns before the door, on the podium
  const n = 6;
  for (let i = 0; i < n; i++) {
    const x = x0 + 1.1 + ((x1 - x0 - 2.2) * i) / (n - 1), z = z1 - 1.0;
    b.box(x - 0.55, 1.2, z - 0.55, x + 0.55, 1.5, z + 0.55, LIMESTONE);
    b.cyl(x, z, 1.5, 9.6, 0.44, 0.38, 8, LIMESTONE, { cap: false });
    b.box(x - 0.55, 9.6, z - 0.55, x + 0.55, 10.0, z + 0.55, LIMESTONE, { faces: 'NESWB' });
  }
  // the portico's ceiling, the entablature with the name on its frieze, and the heavy cornice
  b.box(x0 + 0.3, 10.0, front, x1 - 0.3, 11.2, z1 - 0.3, LIMESTONE, { faces: 'NESWB' });
  hang(k, 'waterfront-bank', cx, 10.6, z1 - 0.3, 0, 1, 0.78, 10.0, LIMESTONE_DARK);
  b.box(x0, 11.2, z0, x1, roof, z1, LIMESTONE, { faces: 'NESWTB', top: LEAD });
  b.box(x0 + 0.15, 11.05, z0 + 0.15, x1 - 0.15, 11.2, z1 - 0.15, STONE_TRIM, { faces: 'NESW' });
  // the door: bronze, lit round its edge at night, in the wall behind the columns
  b.box(cx - 1.3, 1.2, front, cx + 1.3, 5.2, front + 0.08, 0x7a5a2a, { faces: 'NESWT' });
  b.box(cx - 1.0, 1.2, front + 0.08, cx + 1.0, 4.6, front + 0.14, 0x3a2c18, { win: interior(1.2), faces: 'NESWT' });
  // a lamp each side of the steps
  for (const s of [-1, 1]) gasLamp(k, cx + s * (x1 - x0 - 2.6) / 2, 4.2, z1 - 0.35, 3.0, AMBER);
  // gargoyles on the cornice's two front corners, looking out over the square
  gargoyle(b, x0 + 0.5, roof, z1 - 0.5, (3 * Math.PI) / 4, 0.85);
  gargoyle(b, x1 - 0.5, roof, z1 - 0.5, Math.PI / 4, 0.85);
  // a low parapet along the roof's front
  parapet(b, [[x0 + 0.2, z1 - 0.2], [x1 - 0.2, z1 - 0.2]], roof, 0.45, 0.25, LIMESTONE);

  // the screen, on a steel frame on the roof, facing the view
  const [sx, sy, sz] = screenAt(l), [Nx, Nz] = SCREEN_N, [Rx, Rz] = SCREEN_R, yaw = Math.atan2(Rz, Rx);
  b.obox(sx - Nx * 0.06, sy, sz - Nz * 0.06, 5.38, 3.05, 0.03, yaw, DARK, { faces: 'NESWTB' });
  k.sign('screen', sx, sy, sz, Nx, Nz, 6, 10.6);
  const top = sy + 3.0;
  for (const s of [-1, 1]) {
    const lx = sx + Rx * s * 4.9, lz = sz + Rz * s * 4.9;
    for (const back of [0.2, 1.4]) b.beam([lx - Nx * back, roof, lz - Nz * back], [lx - Nx * back, top, lz - Nz * back], 0.12, 0.1, IRON);
    b.beam([lx - Nx * 0.2, top - 0.3, lz - Nz * 0.2], [lx - Nx * 1.4, roof + 0.4, lz - Nz * 1.4], 0.07, 0.07, IRON);
  }
  b.beam([sx + Rx * 4.9 - Nx * 0.2, top - 0.1, sz + Rz * 4.9 - Nz * 0.2], [sx - Rx * 4.9 - Nx * 0.2, top - 0.1, sz - Rz * 4.9 - Nz * 0.2], 0.08, 0.08, IRON);
  b.beam([sx + Rx * 4.9 - Nx * 0.2, roof + 0.3, sz + Rz * 4.9 - Nz * 0.2], [sx - Rx * 4.9 - Nx * 0.2, roof + 0.3, sz - Rz * 4.9 - Nz * 0.2], 0.08, 0.08, IRON);
  // a roof hatch, behind the screen
  b.box(x1 - 2.4, roof, z0 + 0.8, x1 - 1.2, roof + 0.7, z0 + 2.0, LEAD);

  k.lights.push({ x: cx, z: z1 + 2.5, r: 10, color: SODIUM, k: 0.5 });
}

// ---------------------------------------------------------------------------
// The Diamond District
// ---------------------------------------------------------------------------

/** A jeweller's window, lit warm, on an east wall at x, with a sign over it and a few sparks of stones in it. */
function shopfront(k: Build, x: number, za: number, zb: number, sign: string, seed: number): void {
  const b = k.b, zm = (za + zb) / 2;
  b.box(x - 0.05, 0.2, za, x + 0.18, 3.0, zb, STONE_TRIM, { faces: 'NESWT' });
  b.box(x + 0.18, 0.5, za + 0.25, x + 0.24, 2.7, zb - 0.25, 0x8a7650, { win: interior(1.8), faces: 'NESWT' });
  // the door, in the middle
  b.box(x + 0.18, 0.2, zm - 0.45, x + 0.27, 2.6, zm + 0.45, 0x22262c, { faces: 'NESWT' });
  hang(k, sign, x, 3.62, zm, 1, 0, 0.7, zb - za - 0.4);
  // a striped awning over it
  b.obox(x + 0.75, 3.14, zm, 0.58, 0.06, (zb - za) / 2 - 0.15, 0, seed % 2 ? 0x2c3f5a : 0x5a2430, { faces: 'NESWTB' });
  for (let i = 0; i < 3; i++) k.glows.push({ x: x + 0.3, y: 1.0 + i * 0.5, z: za + 0.6 + ((zb - za - 1.2) * ((i * 7 + seed) % 5)) / 4, sx: 0.08, sy: 0.08, sz: 0.08, color: '#f4fbff' });
  k.lights.push({ x: x + 2.0, z: zm, r: 7, color: AMBER, k: 0.5 });
}

function chimney(k: Build, x: number, z: number, y: number, h: number): void {
  k.b.box(x - 0.6, y, z - 0.45, x + 0.6, y + h, z + 0.45, BRICK);
  k.b.box(x - 0.7, y + h - 0.25, z - 0.55, x + 0.7, y + h, z + 0.55, STONE_TRIM, { faces: 'NESWB', top: STONE_DARK });
  for (const dx of [-0.3, 0.3]) k.b.cyl(x + dx, z, y + h, y + h + 0.35, 0.16, 0.14, 6, 0x8a5440);
}

/** The northern row: three jewellers behind one front, with the district's name over them, and its roof a stage. */
function diamondNorth(k: Build, l: Lot): void {
  const b = k.b, { x0, z0, x1, z1 } = l, roof = STAGES.diamondRoofNorth.y;
  b.box(x0 + 0.3, 0, z0 + 0.3, x1 - 0.3, 12, z1 - 0.3, STONE, { win: { cell: 2.2, storey: 4, lit: 0.75, kind: 2 }, seed: 7.7 });
  // the attic storey over a ledge, and the cornice that is the roof's rim
  b.box(x0 + 0.1, 11.7, z0 + 0.1, x1 - 0.1, 12.05, z1 - 0.1, STONE_TRIM, { faces: 'NESWB' });
  b.box(x0 + 0.45, 12.05, z0 + 0.45, x1 - 0.45, 13.4, z1 - 0.45, STONE_DARK, { faces: 'NESW' });
  b.box(x0 + 0.15, 13.4, z0 + 0.15, x1 - 0.15, roof, z1 - 0.15, STONE_TRIM, { faces: 'NESWTB', top: LEAD });
  // pilasters between the three shops, and quoins at the corners
  for (const z of [z0 + 0.3, z0 + (z1 - z0) / 3, z0 + (2 * (z1 - z0)) / 3, z1 - 0.3]) b.box(x1 - 0.4, 0, z - 0.3, x1 - 0.12, 11.7, z + 0.3, STONE_TRIM, { faces: 'NESW' });
  const third = (z1 - z0) / 3;
  const signs = ['waterfront-watches', 'waterfront-diamonds', 'waterfront-jewels'];
  for (let i = 0; i < 3; i++) shopfront(k, x1 - 0.3, z0 + third * i + 0.45, z0 + third * (i + 1) - 0.45, signs[i], i + 2);
  // the district's name, in neon along the attic, and a cut stone in neon beside it
  hang(k, 'waterfront-diamond-district', x1 - 0.45, 12.75, (z0 + z1) / 2 - 0.9, 1, 0, 1.0, 12.0);
  const gx = x1 - 0.2, gz = z1 - 1.6, gy = 12.7;
  for (const [a, c] of [[[0, 0.5], [0.6, 0]], [[0.6, 0], [0, -0.6]], [[0, -0.6], [-0.6, 0]], [[-0.6, 0], [0, 0.5]]] as [number, number][][]) {
    for (let j = 0; j <= 4; j++) k.glows.push({ x: gx, y: gy + a[1] + (c[1] - a[1]) * (j / 4), z: gz + a[0] + (c[0] - a[0]) * (j / 4), sx: 0.08, sy: 0.12, sz: 0.12, color: '#7fe8ff' });
  }
  // the alarm bell on the wall over the jeweller's, ringing red
  b.box(x1 - 0.3, 8.0, z0 + third * 2 - 0.45, x1 - 0.1, 8.9, z0 + third * 2 + 0.45, IRON_DARK);
  roundel(b, [x1 - 0.05, 8.45, z0 + third * 2], 0.5, 'E', 0xc22a2a);
  b.cyl(x1 + 0.08, z0 + third * 2, 8.4, 8.5, 0.12, 0.12, 6, BRASS);
  k.glows.push({ x: x1, y: 9.1, z: z0 + third * 2, sx: 0.22, sy: 0.22, sz: 0.22, color: '#ff3b3b' });
  // gargoyles on the ledge at the two front corners
  gargoyle(b, x1 - 0.25, 12.05, z1 - 0.25, Math.PI / 4, 0.8);
  gargoyle(b, x1 - 0.25, 12.05, z0 + 0.25, -Math.PI / 4, 0.8);
  // the roof: a chimney stack, and a glazed skylight about 2 by 2
  const c = chimneyNorthAt(l);
  chimney(k, c[0], c[2], roof, c[1] - roof - 0.35);
  const s = skylightAt(l);
  b.box(s[0] - 1.1, roof, s[2] - 1.1, s[0] + 1.1, roof + 0.3, s[2] + 1.1, IRON_DARK);
  hipped(b, s[0] - 1.0, s[2] - 1.0, s[0] + 1.0, s[2] + 1.0, roof + 0.3, roof + 0.85, 0.75, 0.75, GLASS, GLASS, { win: interior(1.3) });
  // the back wall's fire escape, down the north side
  fireEscape(b, x0 + (x1 - x0) / 2, z0 + 0.3, 'N', 0, 12, 3);
}

/** The southern row: a gem shop, a pawnbroker's and the umbrella shop with its giant umbrella; its roof a stage. */
function diamondSouth(k: Build, l: Lot): void {
  const b = k.b, { x0, z0, x1, z1 } = l, roof = STAGES.diamondRoofSouth.y;
  b.box(x0 + 0.3, 0, z0 + 0.3, x1 - 0.3, roof, z1 - 0.3, STONE_LIGHT, { win: { cell: 2.2, storey: 4, lit: 0.75, kind: 2 }, seed: 5.3, top: LEAD });
  b.box(x0 + 0.1, 11.1, z0 + 0.1, x1 - 0.1, 11.6, z1 - 0.1, STONE_TRIM, { faces: 'NESWB' });
  b.box(x0 + 0.1, 7.7, z0 + 0.1, x1 - 0.1, 8.0, z1 - 0.1, STONE_TRIM, { faces: 'NESWB' });
  const third = (z1 - z0) / 3;
  shopfront(k, x1 - 0.3, z0 + 0.45, z0 + third - 0.45, 'waterfront-gems', 1);
  shopfront(k, x1 - 0.3, z0 + third + 0.45, z0 + 2 * third - 0.45, 'waterfront-umbrellas', 6);
  shopfront(k, x1 - 0.3, z0 + 2 * third + 0.45, z1 - 0.45, 'waterfront-pawn', 3);
  // the pawnbroker's three balls, hung out on a bracket
  const pz = z1 - third / 2;
  b.beam([x1 - 0.1, 4.6, pz], [x1 + 0.9, 4.6, pz], 0.05, 0.05, IRON);
  for (const [dx, dy] of [[0.65, -0.55], [1.05, -0.55], [0.85, -0.2]]) b.cyl(x1 + dx - 0.1, pz, 4.6 + dy - 0.18, 4.6 + dy + 0.18, 0.2, 0.2, 6, BRASS);

  // the giant umbrella over the umbrella shop's door: red and black gores, open, on a bracket from the wall
  const uz = z0 + 1.5 * third, ux = x1 + 1.7, rim = 5.7, apex = 6.85, R = 2.15;
  const gore = (i: number): V3 => [ux + Math.cos((i / 8) * Math.PI * 2) * R, rim, uz + Math.sin((i / 8) * Math.PI * 2) * R];
  const tip: V3 = [ux, apex, uz];
  for (let i = 0; i < 8; i++) {
    const p = gore(i), q = gore(i + 1);
    const mx = (p[0] + q[0]) / 2 - ux, mz = (p[2] + q[2]) / 2 - uz, ml = Math.hypot(mx, mz);
    const slope = (apex - rim) / R;
    face3(b, tip, p, q, [mx / ml, 1 / slope, mz / ml], i % 2 ? UMBRELLA_RED : 0x1c1d22);
    face3(b, [ux, rim + 0.05, uz], p, q, [0, -1, 0], i % 2 ? 0x6e1d24 : 0x141418);
  }
  b.beam([ux, apex, uz], [ux, apex + 0.45, uz], 0.06, 0.03, BRASS);
  b.beam([ux, apex, uz], [ux, 4.55, uz], 0.07, 0.07, 0x2a2a2e);
  b.beam([ux, 4.55, uz], [ux - 0.35, 4.3, uz], 0.08, 0.08, 0x7a4a2a);
  b.beam([ux - 0.35, 4.3, uz], [ux - 0.6, 4.6, uz], 0.08, 0.08, 0x7a4a2a);
  b.beam([x1 - 0.2, 7.5, uz], [ux, apex + 0.3, uz], 0.06, 0.06, IRON);
  // the roof: a chimney stack, and a water tank's worth of nothing: it is Catwoman's
  const c = chimneySouthAt(l);
  chimney(k, c[0], c[2], roof, c[1] - roof - 0.35);
  // a fire escape down the south side, to the alley before the bank
  fireEscape(b, x0 + (x1 - x0) / 2, z1 - 0.3, 'S', 0, 12, 3);
}

/** The chimneys' tops, and the skylight's middle, for the places and the models alike. */
function chimneyNorthAt(l: Lot): V3 { return [l.x0 + 1.4, STAGES.diamondRoofNorth.y + 2.1, l.z0 + 1.3]; }
function chimneySouthAt(l: Lot): V3 { return [l.x0 + 1.3, STAGES.diamondRoofSouth.y + 1.9, l.z0 + 1.2]; }
function skylightAt(l: Lot): V3 { return [(l.x0 + l.x1) / 2 - 0.6, STAGES.diamondRoofNorth.y, (l.z0 + l.z1) / 2 + 2.0]; }

// ---------------------------------------------------------------------------
// The pier
// ---------------------------------------------------------------------------

const DECK = STAGES.pier.y;
/** The half of the deck that is kept clear for the maze: 8 by 5, at the seaward end. */
const MAZE = (l: Lot): { x0: number; z0: number; x1: number; z1: number } => ({ x0: l.x1 - 8.6, z0: (l.z0 + l.z1) / 2 - 2.5, x1: l.x1 - 0.6, z1: (l.z0 + l.z1) / 2 + 2.5 });
const BOOTH = (l: Lot): { x0: number; z0: number; x1: number; z1: number } => ({ x0: l.x0 + 1.2, z0: l.z0 + 0.4, x1: l.x0 + 4.2, z1: l.z0 + 2.8 });

function pierModel(k: Build, l: Lot): void {
  const b = k.b, { x0, z0, x1, z1 } = l, zm = (z0 + z1) / 2;
  // the piles, the stringers, and the deck
  for (let x = x0 + 0.5; x <= x1 - 0.4; x += 2.9) for (const z of [z0 + 0.4, zm, z1 - 0.4]) b.cyl(x, z, -1.7, DECK - 0.3, 0.26, 0.24, 5, TIMBER_DARK, { cap: false });
  for (const z of [z0 + 0.4, zm, z1 - 0.4]) b.box(x0 + 0.1, DECK - 0.55, z - 0.2, x1 - 0.1, DECK - 0.3, z + 0.2, TIMBER_DARK, { faces: 'NSB' });
  b.box(x0, DECK - 0.3, z0, x1, DECK, z1, TIMBER, { faces: 'NESWTB', top: DECK_WOOD });
  // planks' seams, a few darker strips across the deck
  for (let x = x0 + 1.5; x < x1; x += 3) b.box(x, DECK, z0 + 0.1, x + 0.12, DECK + 0.02, z1 - 0.1, TIMBER_DARK, { faces: 'T' });
  // the rails along both sides, open at the landward end and at the ferry's
  rail(k, [[x0 + 0.1, z0 + 0.12], [x1 - 0.1, z0 + 0.12]], DECK, TIMBER_PALE, 1.0, 2.9);
  rail(k, [[x0 + 0.1, z1 - 0.12], [x1 - 3.6, z1 - 0.12]], DECK, TIMBER_PALE, 1.0, 2.9);
  // the ramp up from the Battery's quay
  const rz = zm - 0.6, ra: V3 = [x0 - 6.0, 0.02, rz], rb: V3 = [x0 + 0.05, DECK, rz];
  slabRamp(k, ra, rb, 1.5);
  for (const s of [-1.55, 1.55]) {
    b.beam([x0 - 5.8, 0.95, rz + s], [x0 + 0.1, DECK + 0.95, rz + s], 0.05, 0.05, TIMBER_PALE);
    for (const t of [0, 0.5, 1]) b.box(x0 - 5.8 + 5.9 * t - 0.06, 0.02 + DECK * t, rz + s - 0.06, x0 - 5.8 + 5.9 * t + 0.06, 0.95 + DECK * t, rz + s + 0.06, TIMBER_PALE, { faces: 'NESW' });
  }
  b.cyl(x0 - 1.2, rz, -1.7, 0.7, 0.24, 0.22, 5, TIMBER_DARK, { cap: false });

  // the Riddler's puzzle booth: a green kiosk with its counter to the south, under a big question mark
  const B = BOOTH(l), bx = (B.x0 + B.x1) / 2;
  b.box(B.x0, DECK, B.z0, B.x1, DECK + 2.6, B.z1, RIDDLER, { faces: 'NEWT' });
  b.box(B.x0, DECK, B.z1 - 0.1, B.x1, DECK + 1.0, B.z1, RIDDLER_DARK, { faces: 'NESWT' });
  b.box(B.x0, DECK + 2.2, B.z1 - 0.1, B.x1, DECK + 2.6, B.z1, RIDDLER, { faces: 'NESWB' });
  for (const x of [B.x0, B.x1 - 0.12]) b.box(x, DECK + 1.0, B.z1 - 0.12, x + 0.12, DECK + 2.2, B.z1, RIDDLER, { faces: 'NESW' });
  b.box(B.x0 + 0.12, DECK + 1.0, B.z0 + 0.1, B.x1 - 0.12, DECK + 2.2, B.z0 + 0.16, PURPLE, { win: interior(1.4), faces: 'S' });
  b.box(B.x0 - 0.15, DECK + 0.95, B.z1 - 0.1, B.x1 + 0.15, DECK + 1.08, B.z1 + 0.45, PURPLE, { faces: 'NESWTB' });
  // its roof: a striped awning, purple and green
  for (let i = 0; i < 6; i++) {
    const xa = B.x0 - 0.2 + ((B.x1 - B.x0 + 0.4) * i) / 6, xb = B.x0 - 0.2 + ((B.x1 - B.x0 + 0.4) * (i + 1)) / 6;
    b.quad([xa, DECK + 2.6, B.z1 + 0.6], [xb, DECK + 2.6, B.z1 + 0.6], [xb, DECK + 3.1, B.z0 + 0.4], [xa, DECK + 3.1, B.z0 + 0.4], [0, 0.95, 0.3], i % 2 ? PURPLE : RIDDLER);
  }
  b.quad([B.x0 - 0.2, DECK + 2.6, B.z1 + 0.6], [B.x1 + 0.2, DECK + 2.6, B.z1 + 0.6], [B.x1 + 0.2, DECK + 3.1, B.z0 + 0.4], [B.x0 - 0.2, DECK + 3.1, B.z0 + 0.4], [0, -0.95, -0.3], RIDDLER_DARK);
  b.box(B.x0 - 0.2, DECK + 2.6, B.z0 + 0.1, B.x1 + 0.2, DECK + 3.1, B.z0 + 0.4, RIDDLER, { faces: 'NEWT' });
  hang(k, 'waterfront-puzzles', bx, DECK + 1.6, B.z1 + 0.02, 0, 1, 0.55, 2.4, RIDDLER_DARK);
  // the question mark: a hook, a stem and a dot, in green, on a post from the booth's roof
  const qz = (B.z0 + B.z1) / 2, qy = DECK + 3.6;
  b.beam([bx, DECK + 3.0, qz], [bx, qy + 0.1, qz], 0.08, 0.08, IRON);
  const hook: [number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * (1.0 - (i / 8) * 1.45);
    hook.push([Math.cos(a) * 1.0, qy + 2.35 + Math.sin(a) * 1.0]);
  }
  const path: [number, number][] = [...hook, [0.0, qy + 1.15], [0.0, qy + 0.8]];
  for (let i = 0; i + 1 < path.length; i++) {
    b.beam([bx + path[i][0], path[i][1], qz], [bx + path[i + 1][0], path[i + 1][1], qz], 0.25, 0.25, RIDDLER);
    for (let j = 0; j < 2; j++) {
      const t = j / 2;
      k.glows.push({ x: bx + path[i][0] + (path[i + 1][0] - path[i][0]) * t, y: path[i][1] + (path[i + 1][1] - path[i][1]) * t, z: qz + 0.22, sx: 0.16, sy: 0.16, sz: 0.06, color: NEON_GREEN });
      k.glows.push({ x: bx + path[i][0] + (path[i + 1][0] - path[i][0]) * t, y: path[i][1] + (path[i + 1][1] - path[i][1]) * t, z: qz - 0.22, sx: 0.16, sy: 0.16, sz: 0.06, color: NEON_GREEN });
    }
  }
  b.box(bx - 0.24, qy + 0.05, qz - 0.24, bx + 0.24, qy + 0.5, qz + 0.24, RIDDLER, { faces: 'NESWTB' });
  k.glows.push({ x: bx, y: qy + 0.28, z: qz + 0.26, sx: 0.36, sy: 0.36, sz: 0.04, color: NEON_GREEN });
  k.lights.push({ x: bx, z: B.z1 + 1.5, r: 7, color: '#8dff7a', k: 0.45 });

  // the ferry landing at the end: steps down to a float, bollards, and the board
  const fz0 = z1 - 3.5, fz1 = z1 - 0.3;
  for (let i = 0; i < 4; i++) b.box(x1 + i * 0.35, -0.6, fz0, x1 + (i + 1) * 0.35, DECK - 0.3 - i * 0.42, fz1, TIMBER, { faces: 'NESWT' });
  for (const z of [z0 + 0.5, z1 - 3.9]) bollard(k, x1 - 0.5, z, DECK);
  const sx = x1 - 2.2, sz = z1 - 0.25;
  for (const s of [-1, 1]) b.beam([sx + s * 1.6, DECK, sz], [sx + s * 1.6, DECK + 3.6, sz], 0.09, 0.08, IRON);
  hang(k, 'waterfront-ferry', sx, DECK + 2.9, sz - 0.1, 0, 1, 1.0, 3.4);
  gasLamp(k, x1 - 0.25, DECK + 2.8, z0 + 1.4, 2.8, SODIUM);
  gasLamp(k, x0 + 0.4, DECK + 2.6, z1 - 0.4, 2.6, SODIUM);
}

/** A ramp of timber from one point to another, `half` wide each side, with its underside. */
function slabRamp(k: Build, a: V3, c: V3, half: number): void {
  const dx = c[0] - a[0], dz = c[2] - a[2], l = Math.hypot(dx, dz), px = (-dz / l) * half, pz = (dx / l) * half, dy = c[1] - a[1];
  const run = Math.hypot(l, dy), n: V3 = [(-dy * dx) / (l * run), l / run, (-dy * dz) / (l * run)];
  const A: V3 = [a[0] - px, a[1], a[2] - pz], B: V3 = [a[0] + px, a[1], a[2] + pz], C: V3 = [c[0] + px, c[1], c[2] + pz], D: V3 = [c[0] - px, c[1], c[2] - pz];
  k.b.quad(A, B, C, D, n, DECK_WOOD);
  const low = (p: V3): V3 => [p[0], Math.min(p[1] - 0.25, p[1]), p[2]];
  k.b.quad(low(B), low(A), low(D), low(C), [-n[0], -n[1], -n[2]], TIMBER_DARK);
  k.b.quad(low(A), low(D), D, A, [-px / half, 0, -pz / half], TIMBER_DARK);
  k.b.quad(low(C), low(B), B, C, [px / half, 0, pz / half], TIMBER_DARK);
}

// ---------------------------------------------------------------------------
// The bascule bridges
// ---------------------------------------------------------------------------

/**
 * A bascule bridge of Chicago's kind under a road laid across the Sprang: a stone pier at each end with a tender's
 * house on it, two steel leaves that meet in the middle, deep at their heels and shallow at their tips, their
 * girders beside the road outside its sidewalks with a railing on top, the deck's underside and its floor beams, and
 * the counterweights under the heels. Nothing stands within 7.2 of the road's middle line.
 */
function bascule(k: Build, s: { a: [number, number]; b: [number, number]; half: number }): void {
  const b = k.b, cx = (s.a[0] + s.b[0]) / 2, cz = (s.a[1] + s.b[1]) / 2;
  const L = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) / 2, yaw = Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]);
  const c = Math.cos(yaw), sn = Math.sin(yaw);
  const world = (x: number, z: number): [number, number] => [cx + x * c - z * sn, cz + x * sn + z * c];
  const W = s.half + 0.02, G = 0.36, HEEL = L - 2.0;
  b.moved(cx, 0, cz, yaw, () => {
    for (const e of [-1, 1]) {
      // the stone pier, out from the quay's wall, and the block that carries the tender's house
      const xa = e < 0 ? -L : HEEL, xb = e < 0 ? -HEEL : L;
      const back = e < 0 ? 'NEST' : 'NWST';
      b.box(xa, -1.7, -W - 0.9, xb, -0.03, W + 0.9, STONE_DARK, { faces: back });
      const hz0 = e < 0 ? -W - 4.2 : W + 0.9, hz1 = e < 0 ? -W - 0.9 : W + 4.2;
      const hx0 = e < 0 ? -L : HEEL - 0.9, hx1 = e < 0 ? -HEEL + 0.9 : L;
      b.box(hx0, -1.7, hz0, hx1, -0.03, hz1, STONE_DARK, { faces: e < 0 ? 'NESTW'.replace('W', '') : 'NWST' });
      // the far end of the other side's pier, so that it does not stop short
      const oz0 = e < 0 ? W + 0.9 : -W - 2.2, oz1 = e < 0 ? W + 2.2 : -W - 0.9;
      b.box(xa, -1.7, oz0, xb, -0.03, oz1, STONE_DARK, { faces: e < 0 ? (oz0 > 0 ? 'SET' : 'NET') : (oz0 > 0 ? 'SWT' : 'NWT') });
      // trim along the pier's river face
      b.box(e < 0 ? -HEEL - 0.06 : HEEL - 0.06, -0.35, -W - 2.2, e < 0 ? -HEEL + 0.06 : HEEL + 0.06, -0.05, W + 2.2, STONE_TRIM, { faces: e < 0 ? 'ET' : 'WT' });
      // the tender's house, on its block, with a lamp and a hipped roof of copper
      const tx0 = hx0 + 0.25, tx1 = hx1 - 0.25, tz0 = hz0 + 0.35, tz1 = hz1 - 0.3;
      b.box(tx0, -0.03, tz0, tx1, 2.4, tz1, STONE_LIGHT, { win: { cell: 1.2, storey: 4, lit: 0.9, kind: 4 }, seed: e * 1.7 });
      b.box(tx0 - 0.12, 2.2, tz0 - 0.12, tx1 + 0.12, 2.45, tz1 + 0.12, STONE_TRIM, { faces: 'NESWB' });
      hip(b, tx0, tz0, tx1, tz1, 2.45, 0.9, COPPER, 0.3);
      // the counterweight, under the leaf's heel
      const kx0 = e < 0 ? -HEEL : HEEL - 1.4, kx1 = e < 0 ? -HEEL + 1.4 : HEEL;
      b.box(kx0, -1.45, -W + 0.6, kx1, -0.8, W - 0.6, CONCRETE, { faces: 'NESWB' });
      // the leaf's two girders: deep at the heel, shallow at the tip, a railing on top
      for (const side of [-1, 1]) {
        const zi = side * W, zo = side * (W + G);
        const heel = e * L, tip = 0, yb0 = -1.55, yb1 = -0.95, yt = 0.95, yh = 2.3;
        const P = (x: number, y: number, z: number): V3 => [x, y, z];
        b.quad(P(heel, yb0, zo), P(tip, yb1, zo), P(tip, yt, zo), P(heel, yt, zo), [0, 0, side], BRIDGE);
        b.quad(P(heel, yb0, zi), P(tip, yb1, zi), P(tip, yt, zi), P(heel, yt, zi), [0, 0, -side], BRIDGE);
        b.quad(P(heel, yt, zi), P(tip, yt, zi), P(tip, yt, zo), P(heel, yt, zo), [0, 1, 0], BRIDGE_PALE);
        // the truss over the girder, deep at the heel and down to the rail at the tip: a top chord, posts and diagonals
        const zt = side * (W + G / 2), xm = heel - e * L * 0.62;
        b.beam([heel - e * 0.15, yt, zt], [heel - e * 0.15, yh, zt], 0.14, 0.14, BRIDGE);
        b.beam([heel - e * 0.15, yh, zt], [xm, 1.45, zt], 0.13, 0.12, BRIDGE);
        for (let i = 1; i <= 3; i++) {
          const x = heel - e * L * 0.62 * (i / 4), yTop = yh + ((1.45 - yh) * i) / 4;
          b.beam([x, yt, zt], [x, yTop, zt], 0.07, 0.07, BRIDGE_PALE);
          const xp = heel - e * L * 0.62 * ((i - 1) / 4), yp = yh + ((1.45 - yh) * (i - 1)) / 4;
          b.beam([xp - e * 0.1, yp - 0.1, zt], [x, yt + 0.05, zt], 0.05, 0.05, BRIDGE_PALE);
        }
        const dl = Math.hypot(L, yb1 - yb0);
        b.quad(P(heel, yb0, zi), P(tip, yb1, zi), P(tip, yb1, zo), P(heel, yb0, zo), [(e * (yb1 - yb0)) / dl * 0 + 0, -1, 0], BRIDGE);
        b.quad(P(heel, yb0, zi), P(heel, yb0, zo), P(heel, yt, zo), P(heel, yt, zi), [e, 0, 0], BRIDGE);
        // stiffeners on the outer face
        for (let i = 1; i < 5; i++) {
          const x = heel - (e * L * i) / 5, yb = yb0 + ((yb1 - yb0) * i) / 5;
          b.quad(P(x - 0.08, yb, zo + side * 0.05), P(x + 0.08, yb, zo + side * 0.05), P(x + 0.08, yt, zo + side * 0.05), P(x - 0.08, yt, zo + side * 0.05), [0, 0, side], BRIDGE_PALE);
        }
        // the railing on the girder
        const zr = side * (W + G / 2);
        b.box(Math.min(heel, tip), 1.32, zr - 0.06, Math.max(heel, tip), 1.42, zr + 0.06, BRIDGE_PALE, { faces: 'NESWTB' });
        for (let i = 0; i <= 4; i++) {
          const x = heel - (e * L * i) / 4 * 0.98;
          b.box(x - 0.05, yt, zr - 0.05, x + 0.05, 1.32, zr + 0.05, BRIDGE_PALE, { faces: 'NESW' });
        }
        b.box(Math.min(heel, tip), 1.12, zr - 0.025, Math.max(heel, tip), 1.17, zr + 0.025, BRIDGE_PALE, { faces: 'NSTB' });
      }
    }
    // the deck's underside over both leaves, the floor beams under it, and the joint where the leaves meet
    b.box(-HEEL, -0.75, -W, HEEL, -0.03, W, 0x3d4247, { faces: 'B' });
    for (let i = -3; i <= 3; i++) if (i !== 0) b.box(i * 1.3 - 0.15, -1.0, -W, i * 1.3 + 0.15, -0.75, W, BRIDGE, { faces: 'EWB' });
    b.box(-0.06, -0.85, -W, 0.06, -0.75, W, 0x1a1c20, { faces: 'EWB' });
  });
  // red lamps at the leaves' tips, for the boats, and a lamp at each tender's door
  for (const side of [-1, 1]) {
    const [x, z] = world(0, side * (W + G + 0.15));
    k.glows.push({ x, y: -0.55, z, sx: 0.2, sy: 0.2, sz: 0.2, color: '#ff3b3b' });
  }
  for (const e of [-1, 1]) {
    const [x, z] = world(e * (L - 0.9), e * (W + 2.5));
    k.glows.push({ x, y: 2.0, z, sx: 0.22, sy: 0.3, sz: 0.22, color: SODIUM });
    k.lights.push({ x, z, r: 6, color: SODIUM, k: 0.4 });
    // on the corner across the road from the tender's house, a stone post with a lamp on it
    const [px, pz] = world(e * (L - 1.0), -e * (W + 1.5));
    b.box(px - 0.4, -0.03, pz - 0.4, px + 0.4, 1.3, pz + 0.4, STONE_LIGHT);
    b.box(px - 0.5, 1.3, pz - 0.5, px + 0.5, 1.5, pz + 0.5, STONE_TRIM, { faces: 'NESWTB' });
    gasLamp(k, px, 3.6, pz, 2.1, SODIUM);
  }
}

// ---------------------------------------------------------------------------
// The quay, the Battery and Bank Square
// ---------------------------------------------------------------------------

/** The way the Sprang runs, as a yaw for `moved`. */
const ALONG_YAW = Math.atan2(sprang(1)[1] - sprang(0)[1], sprang(1)[0] - sprang(0)[0]);

/** Builds inside a frame on the west quay's edge at `t`: x along the river downstream, z inland, y as it is. */
function atQuay(k: Build, t: number, fn: () => void): void {
  const [x, z] = sprang(t, -SPRANG.half);
  k.b.moved(x, 0, z, ALONG_YAW, fn);
}

/** A flight of steps down the quay's wall to the water, `t` along the river. */
function steps(k: Build, t: number): void {
  atQuay(k, t, () => {
    const n = 5, w = 0.75;
    for (let i = 0; i < n; i++) k.b.box(-1.9 + i * w, -1.6, -1.1, -1.9 + (i + 1) * w, -0.16 - i * 0.16, -0.02, STONE_LIGHT, { faces: 'NESWT' });
    k.b.box(-1.9 - 0.3, -1.6, -1.25, 1.9, -0.0 - 0.01, -1.1, STONE_DARK, { faces: 'NESWT' });
    // a mooring ring and a ladder's rails at the foot
    k.b.beam([1.9, -0.95, -0.02], [1.9, 0.0, -0.02], 0.05, 0.05, IRON);
  });
}

/** A barge moored against the west quay at `t`, `len` long: a dark hull, a heap of coal, and a wheelhouse at its stern. */
function barge(k: Build, t: number, len: number, cargo: number): void {
  const [x, z] = sprang(t, -SPRANG.half + 1.45);
  k.b.moved(x, 0, z, ALONG_YAW, () => {
    const h = len / 2, w = 1.15;
    k.b.box(-h, -1.25, -w, h, -0.4, w, 0x2b2b30, { faces: 'NESWT', top: 0x3a3a40 });
    k.b.box(-h - 0.05, -0.62, -w - 0.05, h + 0.05, -0.52, w + 0.05, 0x7a2a26, { faces: 'NESWB' });
    // the bow and the stern raked
    hipped(k.b, -h + 0.6, -w + 0.2, h - 2.0, w - 0.2, -0.4, 0.35, 1.0, 0.5, cargo, cargo);
    k.b.box(h - 1.8, -0.4, -0.75, h - 0.4, 0.85, 0.75, 0xd8d2c4, { win: { cell: 0.7, storey: 4, lit: 0.9, kind: 4 } });
    k.b.box(h - 1.95, 0.85, -0.9, h - 0.25, 0.98, 0.9, 0x7a2a26, { faces: 'NESWTB' });
    k.b.cyl(h - 0.7, 0.3, 0.98, 1.6, 0.12, 0.12, 5, 0x222226, { cap: false });
    // mooring lines to the quay
    k.b.beam([-h + 0.4, -0.4, w * 0.3], [-h - 0.4, 0.3, w + 0.3], 0.03, 0.03, 0x9a8a6a);
    k.b.beam([h - 0.4, -0.4, w * 0.3], [h + 0.4, 0.3, w + 0.3], 0.03, 0.03, 0x9a8a6a);
  });
  k.glows.push({ x, y: 1.1, z, sx: 0.15, sy: 0.15, sz: 0.15, color: AMBER });
}

/** Where along the river the bridges and their tenders' piers are, so nothing on the water is put under them. */
const UNDER_BRIDGE = (t: number): boolean => Math.abs(t - SPRANG.north) < 12 || Math.abs(t - SPRANG.south) < 12;

function quay(k: Build): void {
  // bollards along the whole west quay's edge, from the Sprang's north end to the Battery, but on the bridges
  for (let t = -3; t <= 110; t += 5.5) {
    if (UNDER_BRIDGE(t) && Math.abs(t - SPRANG.north) < 8.4) continue;
    if (Math.abs(t - SPRANG.south) < 8.4) continue;
    const [x, z] = sprang(t, -SPRANG.half - 0.32);
    if (landAt(x, z) < -0.1) continue;
    bollard(k, x, z);
  }
  // north of the northern bridge the quay is wide and open: lamps along it, steps, benches, and trees by the park
  for (let t = 0; t <= 30; t += 10) {
    const [x, z] = sprang(t, -SPRANG.half - 1.4);
    if (free(x, z, 0.3)) gasLamp(k, x, 3.6, z, 3.6, SODIUM);
  }
  steps(k, 6);
  steps(k, 24);
  steps(k, 72);
  for (let t = 2; t <= 28; t += 6.5) {
    const [x, z] = sprang(t, -SPRANG.half - 4.2);
    if (free(x, z, 1.2)) bench(k, x, z, Math.atan2(-0.6666, 0.7456) + Math.PI);
  }
  // trees and benches along the park's edge
  const rnd = (() => { let s = 911; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  for (let t = -2; t <= 32; t += 5.5) {
    for (const d of [-15.5, -19.5]) {
      const [x, z] = sprang(t + (d < -16 ? 2.2 : 0) + rnd() * 0.8, d);
      if (free(x, z, 1.4)) k.tree(x, z, 0.62 + rnd() * 0.25, false, 0);
    }
  }
  // barges moored against the quay, never under a bridge
  for (const [t, len, cargo] of [[16, 8, 0x1e1f22], [61, 9, 0x6e5a40], [80, 8, 0x1e1f22]] as [number, number, number][]) {
    if (!UNDER_BRIDGE(t - len / 2) && !UNDER_BRIDGE(t + len / 2)) barge(k, t, len, cargo);
  }

  // the Battery: paved in flags, a rail along the water, bollards and lamps, the place for a hero left empty
  const hero = HERO_SPOTS.find((s) => s.id === 'battery')!;
  const nearHero = (x: number, z: number, room: number): boolean => {
    const ex = x - hero.x, ez = z - hero.z, along = ex * 0.669 + ez * 0.743, across = Math.abs(-ex * 0.743 + ez * 0.669);
    return Math.hypot(ex, ez) < 5 + room || (along > -1 && along < 9 && across < 4 + room);
  };
  pave(k, 2.4, 31.5, 27.5, 47.5, 0.9, 0.045, 0x7b7e86, (x, z) => toRoad(x, z) > 4.75 && landAt(x, z) >= 0 && !inWater(x, z) && !(x < lotOf('iceberg-lounge').x1 && z < lotOf('iceberg-lounge').z1 + 0.1 && x > lotOf('iceberg-lounge').x0));
  const edge: XZ[] = [sprang(SPRANG.south + 10, -SPRANG.half - 0.25), [24.78 - 0.25, 33.67 + 0.12], [27 - 0.3, 38], [26.4, 39.2]];
  rail(k, edge, 0, STEEL, 1.0, 2.2);
  rail(k, [[24.95, 42.7], [24 - 0.25, 43 - 0.05], bay(5.2, 0.3)], 0, STEEL, 1.0, 2.2);
  for (const [x, z] of [[22.6, 34.5], [25.4, 36.6], [22.2, 44.6]] as XZ[]) if (!nearHero(x, z, 0.3) && toRoad(x, z) > ROAD_HALF) bollard(k, x, z);
  for (const [x, z] of [[23.2, 33.3], [21.6, 45.2], [5.6, 33.4]] as XZ[]) if (!nearHero(x, z, 0.4) && toRoad(x, z) > ROAD_HALF) gasLamp(k, x, 3.8, z, 3.8, SODIUM);
  k.lights.push({ x: hero.x, z: hero.z, r: 12, color: AMBER, k: 0.45 });

  // Bank Square: paved and clear, with a charity collector's stand at its east edge
  const sq = STAGES.bankSquare;
  pave(k, sq.x0, sq.z0 + 1.45, sq.x1, sq.z1, 0.9, 0.05, 0x858790, (x, z) => toRoad(x, z) > 4.75);
  const [cx, cz] = charityAt();
  k.b.beam([cx - 0.35, 0, cz - 0.3], [cx, 1.3, cz], 0.04, 0.04, IRON);
  k.b.beam([cx + 0.35, 0, cz - 0.3], [cx, 1.3, cz], 0.04, 0.04, IRON);
  k.b.beam([cx, 0, cz + 0.4], [cx, 1.3, cz], 0.04, 0.04, IRON);
  k.b.cyl(cx, cz, 0.7, 1.25, 0.32, 0.36, 8, 0xb3262d);
  k.b.box(cx - 0.05, 1.3, cz - 0.05, cx + 0.05, 2.5, cz + 0.05, IRON, { faces: 'NESW' });
  hang(k, 'waterfront-charity', cx, 2.75, cz + 0.02, 0, 1, 0.5, 1.6);
  k.b.obox(cx, 2.75, cz - 0.08, 0.85, 0.35, 0.03, 0, DARK, { faces: 'NESWTB' });
  // the collector, in red, with a bell
  const fx = cx + 0.9, fz = cz + 0.1;
  k.b.box(fx - 0.34, 0, fz - 0.22, fx + 0.34, 0.85, fz + 0.22, 0x1b1c20, { faces: 'NESW' });
  k.b.box(fx - 0.4, 0.85, fz - 0.25, fx + 0.4, 1.9, fz + 0.25, 0xa3242c);
  k.b.box(fx - 0.25, 1.9, fz - 0.25, fx + 0.25, 2.3, fz + 0.25, 0xe8c4a0, { faces: 'NESW' });
  k.b.box(fx - 0.3, 2.25, fz - 0.3, fx + 0.3, 2.5, fz + 0.3, 0xa3242c);
  k.b.cyl(fx - 0.5, fz + 0.1, 1.15, 1.45, 0.16, 0.06, 6, BRASS);
  k.lights.push({ x: (sq.x0 + sq.x1) / 2, z: (sq.z0 + sq.z1) / 2, r: 10, color: SODIUM, k: 0.45 });
  for (const s of [-1, 1]) {
    const lx = s < 0 ? sq.x0 - 0.6 : sq.x1 + 0.6, lz = sq.z1 - 3;
    if (toRoad(lx, lz) > ROAD_HALF) gasLamp(k, lx, 3.8, lz, 3.8, SODIUM);
  }
}

/** The charity collector's stand, at the east edge of Bank Square. */
function charityAt(): XZ {
  const sq = STAGES.bankSquare;
  return [sq.x1 - 0.7, (sq.z0 + sq.z1) / 2 - 1.5];
}

/** A few people everywhere, under umbrellas: on the quay, at the Battery, by the jewellers, on the pier's ramp. */
function people(k: Build): void {
  let s = 4242;
  const rnd = (): number => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const hero = HERO_SPOTS.find((h) => h.id === 'battery')!;
  const spots: XZ[] = [];
  for (const t of [3, 9, 14, 20, 27]) spots.push(sprang(t, -SPRANG.half - 2.6 - rnd() * 4));
  spots.push([-58.5, -36], [-58.4, -27]);
  const d1 = lotOf('diamond-1'), d2 = lotOf('diamond-2');
  spots.push([d1.x1 + 1.5, d1.z0 + 3], [d1.x1 + 1.6, d1.z1 - 4.5], [d1.x1 + 2.2, (d1.z0 + d1.z1) / 2 + 1]);
  spots.push([d2.x1 + 1.4, d2.z1 - 2], [d2.x1 + 2.0, d2.z0 + 6.4]);
  spots.push([5.5, 36.5], [8.5, 33.6], [23.5, 46.8], [19.4, 46.4]);
  spots.push([-8.4, 47.6], [-20.6, 44], [-21.0, 50]);
  let i = 0;
  for (const [x, z] of spots) {
    const ex = x - hero.x, ez = z - hero.z, along = ex * 0.669 + ez * 0.743, across = Math.abs(-ex * 0.743 + ez * 0.669);
    if (Math.hypot(ex, ez) < 6 || (along > -1 && along < 9 && across < 5)) continue;
    if (stand(k, x, z, 0, rnd() < 0.7 ? BROLLIES[i % BROLLIES.length] : -1, 0.4)) i++;
  }
}

// ---------------------------------------------------------------------------
// The exports
// ---------------------------------------------------------------------------

/** A model for each lot this file builds, by the lot's id. */
export const MODELS: Record<string, Model> = {
  'iceberg-lounge': iceberg,
  bank: bankModel,
  'diamond-1': diamondNorth,
  'diamond-2': diamondSouth,
  pier: pierModel,
};

/** Lots that are built as part of another lot's model or by `extras`, and so get no box either. The bascule bridges are built in `extras`. */
export const COVERS: string[] = ['bascules'];

const bnk = lotOf('bank'), dn = lotOf('diamond-1'), ds = lotOf('diamond-2'), pr = lotOf('pier');
const CHIMNEY_N = chimneyNorthAt(dn), CHIMNEY_S = chimneySouthAt(ds), SKY = skylightAt(dn), CHARITY = charityAt();

/** Places on what this file builds that the show needs as built. */
export const PLACES: Record<string, Place> = {
  loungeTerrace: { x: LOUNGE.A[0] - 3.9, y: TERRACE, z: LOUNGE.A[1] + 1.2, h: Math.PI / 4 },
  loungeDoor: { x: LOUNGE.M[0] + LOUNGE.N[0] * 1.3, y: 0, z: LOUNGE.M[1] + LOUNGE.N[1] * 1.3, h: Math.PI / 4 },
  searchlight1: { x: LIGHTS[0][0], y: SEARCHLIGHT_TOP, z: LIGHTS[0][1], h: Math.PI / 4 },
  searchlight2: { x: LIGHTS[1][0], y: SEARCHLIGHT_TOP, z: LIGHTS[1][1], h: Math.PI / 4 },
  bankDoor: { x: (bnk.x0 + bnk.x1) / 2, y: 0, z: bnk.z1 + 2.2, h: Math.PI / 2 },
  bankRoof: { x: bnk.x0 + 1.5, y: bankRoofY(), z: bnk.z1 - 1.6, h: Math.PI / 4 },
  charityBox: { x: CHARITY[0] - 0.75, y: 0, z: CHARITY[1] + 0.2, h: 0 },
  skylight: { x: SKY[0] + 1.7, y: SKY[1], z: SKY[2], h: Math.PI },
  catwoman: { x: ds.x1 - 1.4, y: STAGES.diamondRoofSouth.y, z: ds.z1 - 1.4, h: Math.PI / 4 },
  chimneyNorth: { x: CHIMNEY_N[0], y: CHIMNEY_N[1], z: CHIMNEY_N[2], h: 0 },
  chimneySouth: { x: CHIMNEY_S[0], y: CHIMNEY_S[1], z: CHIMNEY_S[2], h: 0 },
  riddler: { x: (BOOTH(pr).x0 + BOOTH(pr).x1) / 2, y: DECK, z: BOOTH(pr).z1 + 1.4, h: Math.PI / 2 },
  mazeMiddle: { x: (MAZE(pr).x0 + MAZE(pr).x1) / 2, y: DECK, z: (MAZE(pr).z0 + MAZE(pr).z1) / 2, h: 0 },
  ferry: { x: pr.x1 - 1.0, y: DECK, z: pr.z1 - 1.9, h: 0 },
};

/** Whatever is not one of the plan's lots: the bascule bridges, the quay, the Battery, Bank Square, and people. */
export function extras(k: Build): void {
  bascule(k, SPANS['bascule-north']);
  bascule(k, SPANS['bascule-south']);
  quay(k);
  people(k);
}

