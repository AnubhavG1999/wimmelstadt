// The East End: its tenements, the Thomas Wayne Clinic, the old cinema on Park Row and the alley, and the Sprang's east quay.
//
// What is the comics' and what is this tile's own drawing:
// - Park Row, called Crime Alley, is the comics' (Detective Comics #457, 1976): once an elegant East End street, with
//   the Thomas Wayne Memorial Clinic, Leslie Thompkins's, and an old cinema. Nothing of what the comics set there is
//   shown: the cinema has no name and no film on its canopy (it says only PICTURES, what is sold there), its poster
//   frames are blank, and the court beside it has a lamp, a stack of tyres, crates and children's chalk. The tyres are
//   for the story of Jason Todd and the Batmobile's wheels, the lamp for Nightwing mending one on Park Row.
// - The clinic's look is the tile's own: a modest brick house of two storeys with its door on Kane Street, a lamp over
//   it and a bench, and a brass plate by the door with the doctor's name.
// - The Gotham Museum: the comics give a museum the Penguin robs of paintings (Detective Comics #58, 1941), and no look.
//   Here it is a temple front of pale stone with a copper roof: a colonnade of six columns over its steps, banners
//   between them, a flat terrace on the colonnade for the Penguin to take off from, and an alarm bell on its side.
// - The tenements, the fire house, the quay, the raised railway bridge and the storm drain are the tile's own,
//   in Pinkney's manner: brick, stone trim at every band and cornice, gargoyles on the corners, fire escapes, water
//   tanks, washing strung over the lanes, and an iron footbridge from a tenement to the cinema.

import * as THREE from 'three';
import { Smoke } from '../../engine/effects';
import { interior, rng, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { area, oval, rect } from '../../engine/ground';
import { pinnacle, roundel } from '../../engine/parts';
import { hungSign, standingCar } from '../../engine/props';
import { drum, face3, gable, hip, railing } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import {
  AMBER, BRASS, BRICK, BRICK_RED, COPPER, DARK, IRON, IRON_DARK, LEAD, LIMESTONE, LIMESTONE_DARK, SLATE, SODIUM, STEEL,
  STONE, STONE_DARK, STONE_LIGHT, STONE_TRIM, TENEMENT_WIN, TIMBER, TIMBER_DARK, TIMBER_PALE, TO_VIEW,
  fireEscape, gargoyle, gasLamp, waterTank,
} from './look';
import type { Model, Place } from './models';
import { SPRANG, SPRANG_ACROSS, SPRANG_ALONG, lotOf, sprang, type Lot } from './plan';
import { open } from './space';

// ---------------------------------------------------------------------------
// Colours and windows of the East End's own
// ---------------------------------------------------------------------------

const TAR = 0x34353a, CONCRETE = 0x6d6f73, CREAM = 0xf1e6c8;
const MUSEUM = LIMESTONE, MUSEUM_DARK = LIMESTONE_DARK, MUSEUM_TRIM = 0xa6a49b;
const TERRA = 0x86705a, TERRA_LIGHT = 0x9a8268, CANOPY = 0x5e1c20;
const CLINIC_BRICK = 0x77513f, FIRE_RED = 0xa8221e, LEAF = 0x3c4046, LEAF_PALE = 0x5a6068;
const WASH = [0xe8e4da, 0xd9d3c4, 0x6f8fb5, 0xb84a3e, 0xd8b84a, 0x8aa36a, 0xc9a0b0, 0xf2f0ea, 0x4a5a7a];

const MUSEUM_WIN: WinSpec = { cell: 2.4, storey: 4, lit: 0.8, kind: 6 };
const CLINIC_WIN: WinSpec = { cell: 2.2, storey: 4, lit: 0.85, kind: 0 };
const FIRE_WIN: WinSpec = { cell: 2.4, storey: 4, lit: 0.8, kind: 0 };
const SLIT_WIN: WinSpec = { cell: 1.4, storey: 4, lit: 0.7, kind: 6 };

/** The way the Sprang runs, as a yaw for `moved`: in that frame x runs downstream and z out over the river from the east quay. */
const ALONG_YAW = Math.atan2(SPRANG_ALONG[1], SPRANG_ALONG[0]);

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------

const board = (id: string, text: string, color: string, ink: string, px: number, h = 52): SignDef => ({ id, lines: [text], color, ink, aspect: px / h, kind: 'board', size: [px, h] });
const lit = (id: string, text: string, color: string, ink: string, px: number, h = 52): SignDef => ({ id, lines: [text], color, ink, aspect: px / h, kind: 'box', size: [px, h] });

export const SIGNS: SignDef[] = [
  board('eastend-museum', 'GOTHAM MUSEUM', '#a6a49b', '#26272c', 560),
  board('eastend-clinic', 'THOMAS WAYNE CLINIC', '#24262b', '#e9e2cf', 700),
  board('eastend-park-row', 'PARK ROW', '#2f5d3a', '#f2f2ea', 260),
  board('eastend-firehouse', 'FIRE HOUSE', '#5e1a18', '#f3e6c8', 380),
  board('eastend-thompkins', 'DR. THOMPKINS', '#c9a548', '#2a2010', 360),
  board('eastend-soda', 'ICE COLD SODA', '#7a3a2e', '#e8dcc0', 420),
  board('eastend-coffee', 'COFFEE', '#3b2418', '#f1d9a8', 200),
  board('eastend-subway', 'SUBWAY', '#1f3a2a', '#eaf3ea', 220),
  lit('eastend-pictures', 'PICTURES', '#fff1c9', '#5a1f22', 320),
  lit('eastend-laundry', 'LAUNDRY', '#e6f1f6', '#1d3b52', 240),
  lit('eastend-deli', 'DELI', '#f6e7b8', '#5a2a12', 160),
  lit('eastend-rooms', 'ROOMS', '#ffd9a0', '#3a1a0a', 140),
  lit('eastend-news', 'NEWS', '#f3efe2', '#1a1a1a', 160),
];
const ASPECT = new Map(SIGNS.map((s) => [s.id, s.aspect]));

/** A sign on a wall whose face is at (x, z) and faces (nx, nz): a thin dark board just off the wall, the sign in front. */
function hang(k: Build, id: string, x: number, y: number, z: number, nx: number, nz: number, h: number, maxW = Infinity, backing = DARK): void {
  const w = k.sign(id, x + nx * 0.14, y, z + nz * 0.14, nx, nz, h, maxW);
  const hh = Math.min(h, w / (ASPECT.get(id) ?? 1));
  k.b.obox(x + nx * 0.06, y, z + nz * 0.06, w / 2 + 0.1, hh / 2 + 0.08, 0.05, Math.atan2(-nx, nz), backing, { faces: 'NESWTB' });
}

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

/** A box along any three axes at right angles: for what leans, as a raised bridge's leaf does. */
function tbox(b: GeoBuilder, c: V3, u: V3, v: V3, w: V3, hu: number, hv: number, hw: number, color: number): void {
  const P = (a: number, p: number, q: number): V3 => [
    c[0] + u[0] * a * hu + v[0] * p * hv + w[0] * q * hw,
    c[1] + u[1] * a * hu + v[1] * p * hv + w[1] * q * hw,
    c[2] + u[2] * a * hu + v[2] * p * hv + w[2] * q * hw,
  ];
  const neg = (n: V3): V3 => [-n[0], -n[1], -n[2]];
  for (const s of [1, -1]) {
    b.quad(P(s, -1, -1), P(s, 1, -1), P(s, 1, 1), P(s, -1, 1), s > 0 ? u : neg(u), color);
    b.quad(P(-1, s, -1), P(1, s, -1), P(1, s, 1), P(-1, s, 1), s > 0 ? v : neg(v), color);
    b.quad(P(-1, -1, s), P(1, -1, s), P(1, 1, s), P(-1, 1, s), s > 0 ? w : neg(w), color);
  }
}

/** A low wall round the edge of a flat roof, `t` thick, standing on `y`, with its outer faces on the rectangle. */
function parapetRing(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, h: number, t: number, color: number): void {
  b.box(x0, y, z0, x1, y + h, z0 + t, color, { faces: 'NESWT' });
  b.box(x0, y, z1 - t, x1, y + h, z1, color, { faces: 'NESWT' });
  b.box(x0, y, z0 + t, x0 + t, y + h, z1 - t, color, { faces: 'EWT' });
  b.box(x1 - t, y, z0 + t, x1, y + h, z1 - t, color, { faces: 'EWT' });
}

/** A band of stone round a block, `o` proud of its walls, from `y0` to `y1`: a cornice or a string course. */
function band(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, o: number, color: number): void {
  b.box(x0 - o, y0, z0 - o, x1 + o, y1, z1 + o, color, { faces: 'NESWTB' });
}

/** Stone quoins up the four corners of a block. */
function quoins(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y1: number, color = STONE_TRIM): void {
  const q = 0.5, o = 0.1;
  b.box(x0 - o, 0, z0 - o, x0 + q, y1, z0 + q, color, { faces: 'NESW' });
  b.box(x1 - q, 0, z0 - o, x1 + o, y1, z0 + q, color, { faces: 'NESW' });
  b.box(x0 - o, 0, z1 - q, x0 + q, y1, z1 + o, color, { faces: 'NESW' });
  b.box(x1 - q, 0, z1 - q, x1 + o, y1, z1 + o, color, { faces: 'NESW' });
}

/** A piece of washing hung from a line that runs along (dx, dz), `w` wide and dropping `h`: seen from both sides. */
function cloth(b: GeoBuilder, x: number, y: number, z: number, dx: number, dz: number, w: number, h: number, color: number): void {
  const ax = (dx * w) / 2, az = (dz * w) / 2;
  const p0: V3 = [x - ax, y - h, z - az], p1: V3 = [x + ax, y - h, z + az], p2: V3 = [x + ax, y, z + az], p3: V3 = [x - ax, y, z - az];
  b.quad(p0, p1, p2, p3, [-dz, 0, dx], color);
  b.quad(p0, p1, p2, p3, [dz, 0, -dx], color);
}

/** A washing line from one wall to another at height `y`, with washing pegged along it. */
function washing(k: Build, ax: number, az: number, bx: number, bz: number, y: number, r: () => number): void {
  const len = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / len, dz = (bz - az) / len;
  k.b.beam([ax, y, az], [bx, y, bz], 0.025, 0.025, 0xb8b4a8);
  for (let s = 0.25 + r() * 0.2; s < len - 0.35;) {
    const w = 0.35 + r() * 0.35, h = 0.4 + r() * 0.55;
    if (s + w > len - 0.2) break;
    cloth(k.b, ax + dx * (s + w / 2), y - 0.02, az + dz * (s + w / 2), dx, dz, w, h, WASH[Math.floor(r() * WASH.length)]);
    s += w + 0.08 + r() * 0.3;
  }
}

/** A dustbin with its lid. */
function bin(b: GeoBuilder, x: number, z: number): void {
  b.cyl(x, z, 0, 0.8, 0.3, 0.34, 6, 0x5a6068, { cap: false });
  b.cyl(x, z, 0.8, 0.9, 0.38, 0.3, 6, 0x464b52);
}

/** A bench that faces the way `yaw` points. */
function bench(k: Build, x: number, z: number, yaw: number): void {
  k.b.moved(x, 0, z, yaw, () => {
    k.b.box(-0.35, 0.5, -1.0, 0.25, 0.62, 1.0, TIMBER, { faces: 'NESWTB' });
    k.b.box(-0.45, 0.62, -1.0, -0.33, 1.25, 1.0, TIMBER, { faces: 'NESWTB' });
    for (const s of [-0.85, 0.85]) k.b.box(-0.4, 0, s - 0.07, 0.2, 0.5, s + 0.07, IRON_DARK, { faces: 'NESW' });
  });
}

/** A lamp on a bracket from a wall at (x, z), reaching `out` along (nx, nz). */
function bracketLamp(k: Build, x: number, y: number, z: number, nx: number, nz: number, out = 0.7): void {
  k.b.beam([x, y + 0.45, z], [x + nx * out, y + 0.45, z + nz * out], 0.05, 0.05, IRON);
  k.b.beam([x, y - 0.2, z], [x + nx * out * 0.7, y + 0.42, z + nz * out * 0.7], 0.035, 0.035, IRON);
  gasLamp(k, x + nx * out, y, z + nz * out, 0, SODIUM);
}

// ---------------------------------------------------------------------------
// The tenements
// ---------------------------------------------------------------------------

interface Tenement { wall: number; attic: number; color: number; seed: number; tank: number; chimneyW: number }
const TENEMENTS: Record<string, Tenement> = {
  'tenement-1': { wall: 16, attic: 0, color: BRICK, seed: 1.3, tank: 1, chimneyW: 1.2 },
  'tenement-2': { wall: 12, attic: 0, color: BRICK_RED, seed: 2.7, tank: 1, chimneyW: 1.2 },
  'tenement-3': { wall: 16, attic: 1.6, color: 0x5a382e, seed: 4.1, tank: 1.2, chimneyW: 0.9 },
};

/** Where a tenement's roof is, and what stands on its northern half. */
function roofOf(l: Lot): { y: number; tank: [number, number]; chimney: [number, number, number, number]; loft: [number, number] } {
  const t = TENEMENTS[l.id], y = t.wall + t.attic;
  const tank: [number, number] = [l.x0 + 0.7 + 0.95 * t.tank, l.z0 + 1.6];
  const chimney: [number, number, number, number] = [l.x1 - 0.5 - t.chimneyW, l.z0 + 0.55, l.x1 - 0.5, l.z0 + 1.45];
  const loft: [number, number] = [tank[0] + 0.95 * t.tank + 0.25, chimney[0] - 0.3];
  return { y, tank, chimney, loft };
}
const CHIMNEY_H = 2.6;

function tenement(k: Build, l: Lot): void {
  const b = k.b, t = TENEMENTS[l.id], R = roofOf(l), { x0, z0, x1, z1 } = l;
  const cx = (x0 + x1) / 2;
  // the walls, with shopfronts in the ground storey and windows above
  b.box(x0, 0, z0, x1, t.wall, z1, t.color, { win: TENEMENT_WIN, seed: t.seed, top: TAR, faces: t.attic ? 'NESW' : 'NESWT' });
  if (t.attic) {
    // a plain attic storey over the last row of windows, with a stone band at its foot
    b.box(x0, t.wall, z0, x1, R.y, z1, t.color, { top: TAR });
    band(b, x0, z0, x1, z1, t.wall - 0.05, t.wall + 0.25, 0.12, STONE_TRIM);
  }
  // a string course over the shops, quoins, a cornice and a parapet with a coping
  band(b, x0, z0, x1, z1, 3.85, 4.1, 0.12, STONE_TRIM);
  quoins(b, x0, z0, x1, z1, R.y - 0.6);
  band(b, x0, z0, x1, z1, R.y - 0.6, R.y - 0.08, 0.32, STONE_TRIM);
  parapetRing(b, x0, z0, x1, z1, R.y, 0.65, 0.3, t.color);
  parapetRing(b, x0 - 0.04, z0 - 0.04, x1 + 0.04, z1 + 0.04, R.y + 0.65, 0.1, 0.38, STONE_TRIM);
  // the northern half of the roof: a water tank, a pigeon loft and a chimney stack; the southern half is left open
  waterTank(b, R.tank[0], R.y, R.tank[1], t.tank);
  const [c0, cz0, c1, cz1] = R.chimney, top = R.y + CHIMNEY_H;
  b.box(c0, R.y, cz0, c1, top - 0.2, cz1, t.color);
  b.box(c0 - 0.1, top - 0.2, cz0 - 0.1, c1 + 0.1, top, cz1 + 0.1, STONE_TRIM, { faces: 'NESWTB' });
  for (let i = 0; i < 2; i++) b.cyl(c0 + ((c1 - c0) * (i + 0.5)) / 2, (cz0 + cz1) / 2, top, top + 0.45, 0.16, 0.13, 6, 0x8a5a44);
  const [lx0, lx1] = R.loft, lz0 = z0 + 0.6, lz1 = z0 + 2.1;
  if (lx1 - lx0 > 0.9) {
    b.box(lx0, R.y, lz0, lx1, R.y + 1.2, lz1, TIMBER_PALE);
    gable(b, lx0, lz0, lx1, lz1, R.y + 1.2, 0.5, SLATE, TIMBER_PALE, 'x', 0.15);
    // its wire front and a board to land on
    b.quad([lx0 + 0.15, R.y + 0.3, lz1 + 0.02], [lx1 - 0.15, R.y + 0.3, lz1 + 0.02], [lx1 - 0.15, R.y + 1.05, lz1 + 0.02], [lx0 + 0.15, R.y + 1.05, lz1 + 0.02], [0, 0, 1], 0x2a2b2e);
    b.box(lx0, R.y + 0.25, lz1, lx1, R.y + 0.32, lz1 + 0.45, TIMBER, { faces: 'NESWTB' });
  }
  // an aerial on the chimney, and a skylight behind the open half
  const sk = (z0 + z1) / 2 - 0.8;
  b.beam([c1 - 0.2, top, cz0 + 0.3], [c1 - 0.2, top + 1.6, cz0 + 0.3], 0.04, 0.03, STEEL);
  b.beam([c1 - 0.9, top + 1.3, cz0 + 0.3], [c1 + 0.5, top + 1.3, cz0 + 0.3], 0.03, 0.03, STEEL);
  b.box(cx - 0.9, R.y, sk - 0.2, cx + 0.9, R.y + 0.45, sk + 0.6, STONE_LIGHT, { faces: 'NESW' });
  b.quad([cx - 0.9, R.y + 0.45, sk + 0.6], [cx + 0.9, R.y + 0.45, sk + 0.6], [cx + 0.9, R.y + 0.75, sk - 0.2], [cx - 0.9, R.y + 0.75, sk - 0.2], [0, 0.94, 0.35], 0x5a7486, { win: interior(0.8) });
  for (const s of [-1, 1]) face3(b, [cx + s * 0.9, R.y + 0.45, sk + 0.6], [cx + s * 0.9, R.y + 0.75, sk - 0.2], [cx + s * 0.9, R.y + 0.45, sk - 0.2], [s, 0, 0], STONE_LIGHT);
  b.box(cx - 0.9, R.y + 0.45, sk - 0.2, cx + 0.9, R.y + 0.75, sk - 0.12, STONE_LIGHT, { faces: 'NT' });
  // a back door and its stoop on the lane behind, and a dustbin beside it
  const sx = l.id === 'tenement-3' ? x1 - 1.6 : cx + 1.2;
  b.quad([sx - 0.55, 0.5, z0 - 0.02], [sx + 0.55, 0.5, z0 - 0.02], [sx + 0.55, 3.0, z0 - 0.02], [sx - 0.55, 3.0, z0 - 0.02], [0, 0, -1], 0x3a2a1e, { win: interior(1.1) });
  b.box(sx - 0.85, 0, z0 - 0.85, sx + 0.85, 0.25, z0, STONE_LIGHT, { faces: 'NEWT' });
  b.box(sx - 0.85, 0.25, z0 - 0.45, sx + 0.85, 0.5, z0, STONE_LIGHT, { faces: 'NEWT' });
  bin(b, sx + 1.35, z0 - 0.45);
}

const T1 = lotOf('tenement-1'), T2 = lotOf('tenement-2'), T3 = lotOf('tenement-3');

/** Fire escapes, a gargoyle or two, and the shops' signs: what each tenement wears on its faces. */
function tenementDress(k: Build): void {
  const b = k.b, r1 = roofOf(T1), r2 = roofOf(T2), r3 = roofOf(T3);
  fireEscape(b, (T1.x0 + T1.x1) / 2 + 1.4, T1.z1, 'S', 0, r1.y);
  fireEscape(b, T1.x1, (T1.z0 + T1.z1) / 2, 'E', 0, r1.y, 2.8);
  fireEscape(b, T2.x1, (T2.z0 + T2.z1) / 2, 'E', 0, r2.y, 2.8);
  fireEscape(b, T2.x0 + 2.4, T2.z0, 'N', 0, r2.y, 2.8);
  fireEscape(b, T3.x0 + 1.7, T3.z0, 'N', 0, TENEMENTS[T3.id].wall, 2.8);
  gargoyle(b, T1.x1 - 0.25, r1.y + 0.75, T1.z1 - 0.25, Math.PI / 4, 0.85);
  gargoyle(b, T1.x0 + 0.25, r1.y + 0.75, T1.z1 - 0.25, (3 * Math.PI) / 4, 0.85);
  gargoyle(b, T3.x1 - 0.25, r3.y + 0.75, T3.z1 - 0.25, Math.PI / 4, 0.85);
  // the laundry on the quay side, the deli on the lane's mouth, and rooms to let over the lane
  hang(k, 'eastend-laundry', T1.x0, 3.35, (T1.z0 + T1.z1) / 2 + 1.2, -1, 0, 0.6, 3.2);
  hang(k, 'eastend-deli', T1.x0 + 2.2, 3.35, T1.z1, 0, 1, 0.65, 2.2);
  hungSign(k, 'eastend-rooms', T2.x1 - 1.3, T2.z1, 1, 6.6, 0.5);
  // a cat on the laundry's sill
  const cx = T1.x0 - 0.22, cz = T1.z0 + 2.6, cy = 4.1;
  b.box(cx - 0.12, cy, cz - 0.3, cx + 0.12, cy + 0.26, cz + 0.2, 0x26262a, { faces: 'NESWT' });
  b.box(cx - 0.11, cy + 0.2, cz + 0.12, cx + 0.11, cy + 0.44, cz + 0.36, 0x26262a, { faces: 'NESWT' });
  b.beam([cx, cy + 0.1, cz - 0.3], [cx - 0.05, cy - 0.35, cz - 0.42], 0.03, 0.02, 0x26262a);
  void r2;
}

// ---------------------------------------------------------------------------
// The Gotham Museum
// ---------------------------------------------------------------------------

const MU = lotOf('museum');
/** The museum's front: its floor over the street, the line of its front wall, of its columns and of its steps' foot. */
const MF = { floor: 1.6, wall: MU.z1 - 3.0, cols: MU.z1 - 1.05, deck: MU.z1 - 0.5, foot: MU.z1 + 1.6, terrace: 13.9 };

function museum(k: Build, l: Lot): void {
  const b = k.b, cx = (l.x0 + l.x1) / 2, X0 = l.x0 + 0.4, X1 = l.x1 - 0.4, Z0 = l.z0 + 0.4, Z1 = MF.wall, FL = MF.floor;
  // the podium and the hall: pale stone with tall windows on its sides and back, and a blind front behind the columns
  b.box(X0 - 0.22, 0, Z0 - 0.22, X1 + 0.22, FL, Z1 - 0.1, MUSEUM_DARK, { faces: 'NEWT' });
  b.box(X0, 0, Z0, X1, 16, Z1, MUSEUM, { faces: 'NEW', win: MUSEUM_WIN, seed: 3.1 });
  b.box(X0, 0, Z0, X1, 16, Z1, MUSEUM, { faces: 'S' });
  band(b, X0, Z0, X1, Z1, 7.85, 8.1, 0.12, MUSEUM_TRIM);
  band(b, X0, Z0, X1, Z1, 15.4, 16.6, 0.35, MUSEUM_TRIM);
  // the roof, pitched, in copper gone green, with a pediment at each end
  gable(b, X0, Z0, X1, Z1, 16.6, 2.6, COPPER, MUSEUM, 'z', 0.45);
  const apex = 16.6 + (2.6 * (X1 - X0)) / 2 / ((X1 - X0) / 2 + 0.45);
  face3(b, [X0 + 0.9, 16.75, Z1 + 0.03], [X1 - 0.9, 16.75, Z1 + 0.03], [cx, apex - 0.45, Z1 + 0.03], [0, 0, 1], MUSEUM_DARK);
  roundel(b, [cx, 17.4, Z1 + 0.06], 0.5, 'S', 0x4a3420, { win: interior(1.6) }, 8);
  for (const s of [-1, 1]) b.beam([s < 0 ? X0 - 0.35 : X1 + 0.35, 16.66, Z1 + 0.22], [cx, apex + 0.02, Z1 + 0.22], 0.15, 0.15, MUSEUM_TRIM);
  pinnacle(b, X0 - 0.05, Z1 + 0.05, 16.6, 1.3, 0.24, MUSEUM_TRIM);
  pinnacle(b, X1 + 0.05, Z1 + 0.05, 16.6, 1.3, 0.24, MUSEUM_TRIM);
  pinnacle(b, cx, Z1 + 0.15, apex, 0.85, 0.2, MUSEUM_TRIM);
  // the colonnade's floor, and the steps down onto Harbour Road's sidewalk
  b.box(X0 + 0.2, 0, Z1, X1 - 0.2, FL, MF.deck, MUSEUM_DARK, { faces: 'ESWT', top: MUSEUM });
  const rise = FL / 4, tread = (MF.foot - MF.deck) / 3;
  for (let i = 0; i < 3; i++) b.box(X0 + 0.6, 0, MF.deck + tread * i, X1 - 0.6, FL - rise * (i + 1), MF.deck + tread * (i + 1), MUSEUM_DARK, { faces: 'SEWT', top: MUSEUM });
  // six columns, their entablature with the name on its frieze, and the flat terrace on top
  const xs = Array.from({ length: 6 }, (_, i) => X0 + 0.9 + (i * (X1 - X0 - 1.8)) / 5);
  for (const x of xs) {
    b.box(x - 0.55, FL, MF.cols - 0.55, x + 0.55, FL + 0.3, MF.cols + 0.55, MUSEUM_TRIM);
    b.cyl(x, MF.cols, FL + 0.3, 11.9, 0.44, 0.37, 8, MUSEUM, { cap: false });
    b.box(x - 0.58, 11.9, MF.cols - 0.58, x + 0.58, 12.4, MF.cols + 0.58, MUSEUM_TRIM, { faces: 'NESW' });
  }
  const ent = MF.cols + 0.7;
  b.box(X0 + 0.2, 12.4, Z1, X1 - 0.2, MF.terrace, ent, MUSEUM_TRIM, { faces: 'ESWT', top: MUSEUM });
  // the colonnade's ceiling, floodlit from below at night
  b.quad([X0 + 0.2, 12.4, Z1], [X1 - 0.2, 12.4, Z1], [X1 - 0.2, 12.4, ent], [X0 + 0.2, 12.4, ent], [0, -1, 0], 0xb9b2a0, { win: interior(1.1) });
  k.sign('eastend-museum', cx, 13.15, ent + 0.03, 0, 1, 0.78, 8.6);
  for (const x of [X0 + 0.2, X1 - 0.5]) b.box(x, MF.terrace, Z1, x + 0.3, MF.terrace + 0.45, ent, MUSEUM_TRIM, { faces: 'NESWT' });
  gargoyle(b, X0 + 0.35, MF.terrace + 0.45, ent - 0.35, (3 * Math.PI) / 4, 0.85);
  gargoyle(b, X1 - 0.35, MF.terrace + 0.45, ent - 0.35, Math.PI / 4, 0.85);
  // long banners in four of the bays, red and blue with a gold band
  [0, 1, 3, 4].forEach((i, n) => {
    const x = (xs[i] + xs[i + 1]) / 2, col = n === 0 || n === 3 ? 0x8a1f24 : 0x23406b;
    cloth(b, x, 12.3, MF.cols, 1, 0, 0.95, 6.0, col);
    b.quad([x - 0.4, 7.2, MF.cols + 0.03], [x + 0.4, 7.2, MF.cols + 0.03], [x + 0.4, 7.6, MF.cols + 0.03], [x - 0.4, 7.6, MF.cols + 0.03], [0, 0, 1], BRASS);
    b.quad([x - 0.4, 7.2, MF.cols - 0.03], [x + 0.4, 7.2, MF.cols - 0.03], [x + 0.4, 7.6, MF.cols - 0.03], [x - 0.4, 7.6, MF.cols - 0.03], [0, 0, -1], BRASS);
  });
  // the bronze door, lit from within, with a lamp to each side
  b.box(cx - 0.95, FL, Z1, cx + 0.95, 6.9, Z1 + 0.14, 0x5a4a32, { faces: 'ESWT' });
  b.quad([cx - 0.7, FL, Z1 + 0.16], [cx + 0.7, FL, Z1 + 0.16], [cx + 0.7, 6.2, Z1 + 0.16], [cx - 0.7, 6.2, Z1 + 0.16], [0, 0, 1], 0x3b2b1a, { win: interior(1.3) });
  for (const s of [-1, 1]) k.glows.push({ x: cx + s * 1.45, y: 4.6, z: Z1 + 0.22, sx: 0.25, sy: 0.35, sz: 0.2, color: AMBER });
  // the alarm bell, high on the east wall by the front
  b.box(X1, 10.2, Z1 - 1.15, X1 + 0.15, 11.0, Z1 - 0.45, IRON_DARK, { faces: 'NESWT' });
  drum(b, [X1 + 0.33, 10.6, Z1 - 0.8], 0.42, 0.17, 0xb0261e, { cap: BRASS });
  k.lights.push({ x: cx, z: MF.foot, r: 11, color: AMBER, k: 0.6 });
  // the doorman, by the door
  k.person(cx + 1.7, Z1 + 0.85, FL);
}

// ---------------------------------------------------------------------------
// The old cinema on Park Row
// ---------------------------------------------------------------------------

const CI = lotOf('cinema');
/** The cinema's front wall, and the plinth on the sidewalk before its west end. */
const CF = { front: CI.z1 - 2.5, plinth: [CI.x0 + 1.0, CI.z1 + 1.1] as [number, number] };

function cinema(k: Build, l: Lot): void {
  const b = k.b, X0 = l.x0 + 0.3, X1 = l.x1 - 0.3, Z0 = l.z0 + 0.3, F = CF.front, cx = (l.x0 + l.x1) / 2;
  // the auditorium: a brick box with a blind side to the court, a painted sign on it and poster frames at its foot
  b.box(X0, 0, Z0, X1, 10, F - 0.3, BRICK, { faces: 'NEWT', top: TAR });
  band(b, X0, Z0, X1, F - 0.3, 9.4, 9.92, 0.2, STONE_TRIM);
  k.sign('eastend-soda', X1 + 0.03, 6.8, (Z0 + F) / 2 - 0.4, 1, 0, 1.4, 4.6);
  b.quad([X1 + 0.02, 0, Z0 + 0.6], [X1 + 0.02, 0, Z0 + 1.8], [X1 + 0.02, 2.8, Z0 + 1.8], [X1 + 0.02, 2.8, Z0 + 0.6], [1, 0, 0], 0x5a2422);
  k.glows.push({ x: X1 + 0.15, y: 3.2, z: Z0 + 1.2, sx: 0.2, sy: 0.2, sz: 0.2, color: '#ff5a4a' });
  for (const z of [Z0 + 2.6, Z0 + 3.8]) {
    b.box(X1, 0.6, z, X1 + 0.1, 3.0, z + 0.9, BRASS, { faces: 'NESWTB' });
    b.quad([X1 + 0.12, 0.7, z + 0.1], [X1 + 0.12, 0.7, z + 0.8], [X1 + 0.12, 2.9, z + 0.8], [X1 + 0.12, 2.9, z + 0.1], [1, 0, 0], CREAM, { win: interior(1.4) });
  }
  // the front: buff terracotta, a stepped middle with ribs of the 1920s, and a coping on each part
  b.box(X0 - 0.2, 0, F - 0.6, X1 + 0.2, 10.7, F + 0.3, TERRA, { faces: 'NESW' });
  b.box(X0 - 0.3, 10.7, F - 0.7, X1 + 0.3, 11.0, F + 0.4, STONE_TRIM, { faces: 'NESWTB' });
  b.box(cx - 2, 0, F - 0.8, cx + 2, 11.7, F + 0.45, TERRA_LIGHT, { faces: 'NESW' });
  b.box(cx - 2.12, 11.7, F - 0.92, cx + 2.12, 12.0, F + 0.57, STONE_TRIM, { faces: 'NESWTB' });
  for (const x of [cx - 1.2, cx, cx + 1.2]) b.box(x - 0.15, 5.6, F + 0.45, x + 0.15, 11.6, F + 0.6, STONE_TRIM, { faces: 'ESWT' });
  for (const [a, c] of [[X0 + 0.6, cx - 2.6], [cx + 2.6, X1 - 0.6]]) {
    b.quad([a, 6.2, F + 0.32], [c, 6.2, F + 0.32], [c, 10.0, F + 0.32], [a, 10.0, F + 0.32], [0, 0, 1], 0x3a2a1c, { win: interior(1.2) });
  }
  // the doors, lit, the ticket booth before the middle, and blank poster frames at the ends
  for (const [a, c] of [[X0 + 1.1, cx - 2.05], [cx + 2.05, X1 - 1.1]]) {
    b.quad([a, 0, F + 0.32], [c, 0, F + 0.32], [c, 3.4, F + 0.32], [a, 3.4, F + 0.32], [0, 0, 1], 0x5a3a20, { win: interior(1.8) });
  }
  b.box(cx - 0.8, 0, F + 0.45, cx + 0.8, 2.5, F + 1.4, 0xd9b27a, { faces: 'ESWT', win: interior(1.6) });
  b.box(cx - 1.0, 2.5, F + 0.45, cx + 1.0, 2.75, F + 1.6, BRASS, { faces: 'ESWTB' });
  for (const x of [X0 - 0.05, X1 - 0.85]) {
    b.box(x, 0.6, F + 0.3, x + 0.9, 3.0, F + 0.4, BRASS, { faces: 'ESWTB' });
    b.quad([x + 0.1, 0.7, F + 0.42], [x + 0.8, 0.7, F + 0.42], [x + 0.8, 2.9, F + 0.42], [x + 0.1, 2.9, F + 0.42], [0, 0, 1], CREAM, { win: interior(1.4) });
  }
  // the canopy, with a lit board, a lit underside, and bulbs all round it
  const c0 = X0 + 0.2, c1 = X1 - 0.2, cz = l.z1 - 0.15;
  b.box(c0, 4.3, F + 0.3, c1, 5.3, cz, CANOPY, { faces: 'ESWT', top: TAR });
  b.quad([c0, 4.28, F + 0.3], [c1, 4.28, F + 0.3], [c1, 4.28, cz], [c0, 4.28, cz], [0, -1, 0], 0xe0b878, { win: interior(1.8) });
  k.sign('eastend-pictures', cx, 4.8, cz + 0.03, 0, 1, 0.72, 9);
  for (let x = c0 + 0.2; x < c1 - 0.1; x += 0.48) {
    k.glows.push({ x, y: 4.24, z: cz + 0.05, sx: 0.11, sy: 0.11, sz: 0.11, color: '#ffe7a8' });
    k.glows.push({ x, y: 5.34, z: cz + 0.05, sx: 0.11, sy: 0.11, sz: 0.11, color: '#ffe7a8' });
  }
  for (let z = F + 0.55; z < cz; z += 0.45) for (const x of [c0 - 0.04, c1 + 0.04]) k.glows.push({ x, y: 4.24, z, sx: 0.11, sy: 0.11, sz: 0.11, color: '#ffe7a8' });
  k.lights.push({ x: cx, z: l.z1 + 0.8, r: 11, color: AMBER, k: 0.7 });
  // a ventilator on the roof
  b.box(cx + 1.0, 10, Z0 + 1.2, cx + 3.0, 11.0, Z0 + 3.2, LEAD);
  b.cyl(cx + 2.0, Z0 + 2.2, 11.0, 11.6, 0.6, 0.5, 8, IRON);
  // the stone plinth on the sidewalk at the west end, empty, for a statue
  const [px, pz] = CF.plinth;
  b.box(px - 0.7, 0, pz - 0.7, px + 0.7, 0.5, pz + 0.7, STONE_TRIM);
  b.box(px - 0.76, 0.5, pz - 0.76, px + 0.76, 0.6, pz + 0.76, MUSEUM_TRIM, { faces: 'NESWTB' });
  // a queue at the booth, out of the rain under the canopy
  for (const x of [cx + 1.6, cx + 2.4, cx + 3.2, cx + 4.1]) k.person(x, l.z1 - 0.9);
}

// ---------------------------------------------------------------------------
// The court beside the cinema
// ---------------------------------------------------------------------------

const AL = lotOf('alley');
const COURT = { lamp: [AL.x1 - 0.7, AL.z0 + 0.8] as [number, number], tyres: [AL.x0 + 0.6, AL.z0 + 5.4] as [number, number], sign: [AL.x1 - 0.45, AL.z1 - 0.45] as [number, number] };
const TYRE = 0.3;

function court(k: Build, l: Lot): void {
  const b = k.b;
  // the court's flags, and chalk on them: a hopscotch, a sun, a house and a few scribbles
  area(k, rect(l.x0 - 0.25, l.z0 + 0.05, l.x1 - 0.05, l.z1 - 0.05), 0x70737a, 0.04, { size: 1.0, bond: 0.5 });
  const chalk = (x0: number, z0: number, x1: number, z1: number, c: number): void => area(k, rect(x0, z0, x1, z1), c, 0.06);
  for (let i = 0; i < 6; i++) {
    const z = l.z0 + 2.2 + i * 0.62, x = l.x0 + 2.4 + (i % 3 === 1 ? 0 : 0);
    if (i === 2 || i === 4) { chalk(x - 0.62, z, x - 0.04, z + 0.56, 0xe8e8e0); chalk(x + 0.04, z, x + 0.62, z + 0.56, 0xe8e8e0); } else chalk(x - 0.29, z, x + 0.29, z + 0.56, i % 2 ? 0xe39ab8 : 0xe8e8e0);
  }
  area(k, oval(l.x0 + 4.0, l.z0 + 6.2, 0.6, 0.6, 10), 0xe6d36a, 0.06);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; chalk(l.x0 + 4.0 + Math.cos(a) * 0.95 - 0.08, l.z0 + 6.2 + Math.sin(a) * 0.95 - 0.08, l.x0 + 4.0 + Math.cos(a) * 0.95 + 0.08, l.z0 + 6.2 + Math.sin(a) * 0.95 + 0.08, 0xe6d36a); }
  chalk(l.x0 + 3.4, l.z0 + 3.0, l.x0 + 4.4, l.z0 + 3.8, 0x8fc3e6);
  chalk(l.x0 + 3.55, l.z0 + 3.9, l.x0 + 4.25, l.z0 + 4.15, 0xe39ab8);
  // one iron street lamp
  const [lx, lz] = COURT.lamp;
  b.cyl(lx, lz, 0.04, 0.5, 0.28, 0.2, 6, IRON_DARK);
  gasLamp(k, lx, 4.4, lz, 3.9, SODIUM);
  b.box(lx - 0.3, 4.5, lz - 0.3, lx + 0.3, 4.62, lz + 0.3, IRON_DARK, { faces: 'NESWTB' });
  // the tyres against the cinema's wall: a low stack to sit on and a tall one, and a few crates
  const [tx, tz] = COURT.tyres, tr = rng(0x7e5);
  for (let i = 0; i < 3; i++) b.cyl(tx + (tr() - 0.5) * 0.08, tz + (tr() - 0.5) * 0.08, 0.04 + i * TYRE, 0.04 + (i + 1) * TYRE - 0.02, 0.5, 0.5, 7, 0x1c1c1f, { cap: 0x0e0e10, phase: tr() });
  for (let i = 0; i < 5; i++) b.cyl(tx + (tr() - 0.5) * 0.1, tz - 1.15 + (tr() - 0.5) * 0.1, 0.04 + i * TYRE, 0.04 + (i + 1) * TYRE - 0.02, 0.5, 0.5, 7, 0x1c1c1f, { cap: 0x0e0e10, phase: tr() });
  b.box(l.x0 + 0.15, 0.04, l.z0 + 0.4, l.x0 + 1.1, 0.9, l.z0 + 1.35, TIMBER_PALE);
  b.box(l.x0 + 1.2, 0.04, l.z0 + 0.5, l.x0 + 2.0, 0.75, l.z0 + 1.3, TIMBER);
  b.obox(l.x0 + 0.6, 1.25, l.z0 + 0.9, 0.38, 0.35, 0.38, 0.4, TIMBER_PALE);
  // the street sign at the court's corner, read from both ways
  const [sx, sz] = COURT.sign, y = 3.1, yaw = Math.atan2(TO_VIEW[0], -TO_VIEW[2]);
  b.beam([sx, 0, sz], [sx, y + 0.55, sz], 0.07, 0.06, IRON);
  const w = k.sign('eastend-park-row', sx + TO_VIEW[0] * 0.07, y, sz + TO_VIEW[2] * 0.07, TO_VIEW[0], TO_VIEW[2], 0.42, 2.2);
  k.sign('eastend-park-row', sx - TO_VIEW[0] * 0.07, y, sz - TO_VIEW[2] * 0.07, -TO_VIEW[0], -TO_VIEW[2], 0.42, 2.2);
  b.obox(sx, y, sz, w / 2 + 0.06, 0.27, 0.04, yaw, DARK, { faces: 'B' });
  // children by their chalk
  k.person(l.x0 + 3.5, l.z0 + 2.4);
  k.person(l.x0 + 4.4, l.z0 + 5.0);
}

// ---------------------------------------------------------------------------
// The Thomas Wayne Clinic
// ---------------------------------------------------------------------------

const CL = lotOf('clinic');
/** The clinic's front on Kane Street, set back so that its steps and bench are on its own ground. */
const CLF = { front: CL.x1 - 1.4, door: (CL.z0 + CL.z1) / 2 };

function clinic(k: Build, l: Lot): void {
  const b = k.b, X0 = l.x0 + 0.2, X1 = CLF.front, Z0 = l.z0 + 0.2, Z1 = l.z1 - 0.2, dz = CLF.door;
  b.box(X0, 0, Z0, X1, 8, Z1, CLINIC_BRICK, { win: CLINIC_WIN, seed: 5.5, top: TAR });
  band(b, X0, Z0, X1, Z1, 0, 0.9, 0.1, STONE_TRIM);
  band(b, X0, Z0, X1, Z1, 3.88, 4.1, 0.1, STONE_TRIM);
  quoins(b, X0, Z0, X1, Z1, 7.4);
  band(b, X0, Z0, X1, Z1, 7.4, 7.92, 0.3, STONE_TRIM);
  parapetRing(b, X0, Z0, X1, Z1, 8, 0.6, 0.28, CLINIC_BRICK);
  // a stair head and a vent on the roof
  b.box(X0 + 1.2, 8, Z0 + 1.0, X0 + 3.8, 9.6, Z0 + 3.2, CLINIC_BRICK, { top: TAR });
  b.cyl(X0 + 5.5, Z0 + 1.5, 8, 9.4, 0.2, 0.2, 6, IRON);
  // the door on Kane Street: a stone surround, a lit glass door, two steps, a lamp over it on a bracket
  b.box(X1, 0, dz - 1.4, X1 + 0.35, 4.4, dz + 1.4, STONE_TRIM, { faces: 'NEST' });
  b.box(X1 - 0.05, 4.4, dz - 1.6, X1 + 0.5, 4.8, dz + 1.6, STONE_LIGHT, { faces: 'NESWTB' });
  b.quad([X1 + 0.37, 0.3, dz + 0.6], [X1 + 0.37, 0.3, dz - 0.6], [X1 + 0.37, 3.4, dz - 0.6], [X1 + 0.37, 3.4, dz + 0.6], [1, 0, 0], 0x5a3a24, { win: interior(1.5) });
  b.box(X1 + 0.35, 0, dz - 0.9, X1 + 1.0, 0.3, dz + 0.9, STONE_LIGHT, { faces: 'NEST' });
  b.beam([X1 + 0.5, 5.05, dz], [X1 + 1.05, 5.05, dz], 0.05, 0.05, IRON);
  b.beam([X1 + 1.05, 5.05, dz], [X1 + 1.05, 4.55, dz], 0.03, 0.03, IRON);
  gasLamp(k, X1 + 1.05, 4.42, dz, 0, AMBER);
  hang(k, 'eastend-clinic', X1, 6.1, dz, 1, 0, 0.62, Z1 - Z0 - 0.4);
  hang(k, 'eastend-thompkins', X1, 2.2, dz + 2.3, 1, 0, 0.3, 1.7, 0x2a2010);
  bench(k, X1 + 0.75, dz - 2.6, 0);
  gargoyle(b, X1 - 0.25, 8.65, Z1 - 0.25, Math.PI / 4, 0.8);
  k.person(X1 + 1.0, dz + 2.9);
}

// ---------------------------------------------------------------------------
// The fire house
// ---------------------------------------------------------------------------

const FH = lotOf('firehouse');
/** The fire house's front, its two doors along it, and its hose tower at its back. */
const FHF = {
  front: FH.x0 + 1.6, back: FH.x1 - 0.2, z0: FH.z0 + 0.2, z1: FH.z1 - 0.2,
  doors: [[FH.z0 + 1.4, FH.z0 + 5.0], [FH.z0 + 6.2, FH.z0 + 9.8]] as [number, number][],
  tower: { x0: FH.x1 - 3.0, z0: FH.z0 + 4.4, x1: FH.x1 - 0.05, z1: FH.z0 + 7.2, top: 13.2 },
};

function firehouse(k: Build, l: Lot): void {
  const b = k.b, X0 = FHF.front, X1 = FHF.back, Z0 = FHF.z0, Z1 = FHF.z1, R = 3.4;
  b.box(X0, 0, Z0, X1, 8, Z1, BRICK_RED, { faces: 'NEST', win: FIRE_WIN, seed: 6.6, top: TAR });
  // the front: the upper storey with its windows, a stone lintel, piers between the two doors, and inside each a lit bay
  b.quad([X0, 4, Z1], [X0, 4, Z0], [X0, 8, Z0], [X0, 8, Z1], [-1, 0, 0], BRICK_RED, { win: FIRE_WIN, L: Z1 - Z0, seed: 6.6 });
  b.box(X0 - 0.2, R, Z0 - 0.05, X0 + 0.3, 4.2, Z1 + 0.05, STONE_TRIM, { faces: 'NSWTB' });
  const [d1, d2] = FHF.doors;
  for (const [a, c] of [[Z0, d1[0]], [d1[1], d2[0]], [d2[1], Z1]]) b.box(X0 - 0.15, 0, a, X0 + 0.3, R, c, STONE_LIGHT, { faces: 'NSWT' });
  for (const [a, c] of FHF.doors) {
    const back = X0 + 3.6, inside = 0x3a2e24;
    b.quad([back, 0, c], [back, 0, a], [back, R, a], [back, R, c], [-1, 0, 0], inside, { win: interior(1.5) });
    b.quad([X0, 0, a], [back, 0, a], [back, R, a], [X0, R, a], [0, 0, 1], inside, { win: interior(1.2) });
    b.quad([back, 0, c], [X0, 0, c], [X0, R, c], [back, R, c], [0, 0, -1], inside, { win: interior(1.2) });
    b.quad([X0, R, a], [back, R, a], [back, R, c], [X0, R, c], [0, -1, 0], inside, { win: interior(1.0) });
    // the two red leaves of the door, swung wide open
    for (const z of [a - 0.1, c]) {
      b.box(X0 - 1.75, 0.05, z, X0, R - 0.1, z + 0.1, FIRE_RED, { faces: 'NESWT' });
      for (const y of [1.9, 2.6]) b.quad([X0 - 1.6, y, z + (z < a ? -0.01 : 0.11)], [X0 - 0.15, y, z + (z < a ? -0.01 : 0.11)], [X0 - 0.15, y + 0.5, z + (z < a ? -0.01 : 0.11)], [X0 - 1.6, y + 0.5, z + (z < a ? -0.01 : 0.11)], [0, 0, z < a ? -1 : 1], 0xd9c79a, { win: interior(1.2) });
    }
  }
  area(k, rect(l.x0 - 1.7, Z0, X0 + 3.6, Z1), CONCRETE, 0.04);
  band(b, X0, Z0, X1, Z1, 7.4, 7.92, 0.3, STONE_TRIM);
  parapetRing(b, X0, Z0, X1, Z1, 8, 0.6, 0.28, BRICK_RED);
  // the brass bell in a little iron frame over the doors
  const bz = (d1[1] + d2[0]) / 2;
  for (const s of [-1, 1]) b.beam([X0 + 0.15, 8.6, bz + s * 0.55], [X0 + 0.15, 9.9, bz + s * 0.55], 0.06, 0.06, IRON);
  b.beam([X0 + 0.15, 9.9, bz - 0.62], [X0 + 0.15, 9.9, bz + 0.62], 0.06, 0.06, IRON);
  b.cyl(X0 + 0.15, bz, 8.95, 9.75, 0.42, 0.2, 8, BRASS);
  // the hose tower at the back, up to 13 and a half, with a parapet round its top
  const T = FHF.tower;
  b.box(T.x0, 0, T.z0, T.x1, 12, T.z1, BRICK_RED, { faces: 'NESW', win: SLIT_WIN, seed: 7.2 });
  b.box(T.x0, 12, T.z0, T.x1, T.top, T.z1, BRICK_RED, { top: TAR });
  band(b, T.x0, T.z0, T.x1, T.z1, 11.6, 12.05, 0.18, STONE_TRIM);
  parapetRing(b, T.x0 - 0.05, T.z0 - 0.05, T.x1 + 0.05, T.z1 + 0.05, T.top, 0.5, 0.25, STONE_TRIM);
  hang(k, 'eastend-firehouse', (X0 + X1) / 2 - 1.2, 5.9, Z1, 0, 1, 0.9, 6.5);
  gargoyle(b, X0 + 0.25, 8.6, Z1 - 0.25, (3 * Math.PI) / 4, 0.8);
  gargoyle(b, X0 + 0.25, 8.6, Z0 + 0.25, (5 * Math.PI) / 4, 0.8);
  // a hose hung to dry down the tower's south face, and a vent on the roof
  b.beam([T.x0 + 1.4, 11.4, T.z1 + 0.08], [T.x0 + 1.4, 8.1, T.z1 + 0.08], 0.09, 0.09, 0xc9b98a);
  b.cyl(X0 + 4.5, Z0 + 1.6, 8, 9.3, 0.3, 0.26, 6, IRON);
  // the engine, half out of its door, with its ladder on top
  const ez = (d1[0] + d1[1]) / 2, ex = X0;
  standingCar(k, ex, ez, Math.PI, { body: FIRE_RED, top: 0xe8e4da, beacon: '#ff3b30' });
  for (const s of [-1, 1]) b.beam([ex - 2.6, 2.5, ez + s * 0.55], [ex + 2.4, 2.5, ez + s * 0.55], 0.06, 0.06, STEEL);
  for (let i = 0; i < 6; i++) { const x = ex - 2.4 + i * 0.95; b.beam([x, 2.5, ez - 0.55], [x, 2.5, ez + 0.55], 0.04, 0.04, STEEL); }
  b.box(ex - 3.6, 0.55, ez - 1.4, ex - 3.4, 0.85, ez + 1.4, 0xc9ced3, { faces: 'NESWTB' });
  // a red lamp over the doors, and the light of the bays on the apron
  k.glows.push({ x: X0 - 0.25, y: 4.6, z: bz, sx: 0.25, sy: 0.25, sz: 0.25, color: '#ff4a3a' });
  k.lights.push({ x: X0 - 1.2, z: (Z0 + Z1) / 2, r: 10, color: SODIUM, k: 0.55 });
  k.b.cyl(l.x0 - 1.2, Z0 + 0.4, 0.04, 0.7, 0.2, 0.18, 6, 0xb3201f);
  k.b.cyl(l.x0 - 1.2, Z0 + 0.4, 0.7, 0.86, 0.24, 0.1, 6, 0xb3201f);
  k.person(X0 - 2.0, d2[0] - 0.3);
}

// ---------------------------------------------------------------------------
// The lanes of the block's south half
// ---------------------------------------------------------------------------

function lanes(k: Build): void {
  const b = k.b, r = rng(0xea57), r1 = roofOf(T1), r2 = roofOf(T2), r3 = roofOf(T3);
  const LN = { z0: T1.z1, z1: MU.z0 };
  // washing across the gaps between the tenements, well under their roofs
  for (const [xa, xb, top] of [[T1.x1, T2.x0, r2.y], [T2.x1, T3.x0, r2.y], [T3.x1, CL.x0 + 0.2, 10]] as [number, number, number][]) {
    washing(k, xa, T1.z0 + 1.2, xb, T1.z0 + 1.2, top - 5.6, r);
    washing(k, xa, T1.z1 - 1.3, xb, T1.z1 - 1.3, top - 2.6, r);
  }
  // across the lane between the two rows: washing, a pipe and a cable, rooms to let, and an iron footbridge
  const cinemaBack = CI.z0 + 0.3, clinicFront = CL.z1 - 0.2;
  washing(k, T3.x0 + 2.1, LN.z0, T3.x0 + 2.1, cinemaBack, 6.6, r);
  washing(k, T3.x1 - 0.6, LN.z0, T3.x1 - 0.6, cinemaBack, 9.4, r);
  washing(k, CL.x0 + 1.6, clinicFront, CL.x0 + 1.6, cinemaBack, 5.8, r);
  washing(k, CL.x0 + 3.6, clinicFront, CL.x0 + 3.6, cinemaBack, 6.4, r);
  b.beam([T2.x0 + 1.2, 8.6, LN.z0], [T2.x0 + 1.2, 8.6, LN.z1 + 0.4], 0.12, 0.12, 0x6a6e74);
  b.beam([T2.x0 + 4.5, 10.2, LN.z0], [T2.x0 + 4.2, 9.9, LN.z1 + 0.4], 0.03, 0.03, 0x2a2a2e);
  const fx0 = T3.x0 + 2.6, fx1 = T3.x0 + 4.4;
  b.box(fx0, 8.0, LN.z0, fx1, 10.2, cinemaBack, 0x6f7680, { faces: 'EWTB', win: { cell: 0.9, storey: 4, lit: 0.9, kind: 4 } });
  b.box(fx0 - 0.1, 10.2, LN.z0, fx1 + 0.1, 10.42, cinemaBack, IRON, { faces: 'EWTB' });
  // lamps on brackets, dustbins, a stoop or two
  bracketLamp(k, T2.x0 + 3.0, 4.6, LN.z0, 0, 1, 0.6);
  bracketLamp(k, CL.x0 + 2.6, 4.4, clinicFront, 0, 1, 0.6);
  bracketLamp(k, T1.x0 + 4.5, 4.6, T1.z0, 0, -1, 0.6);
  bracketLamp(k, T3.x0 + 3.2, 4.6, T3.z0, 0, -1, 0.6);
  bin(b, T2.x0 + 0.5, LN.z0 + 0.4);
  bin(b, T2.x1 - 3.2, LN.z0 + 0.4);
  bin(b, CI.x0 + 2.2, cinemaBack - 0.4);
  bin(b, CL.x0 + 0.6, CL.z0 - 0.45);
  // neighbours on their stoops
  k.person(T1.x0 + 5.1, T1.z0 - 0.62, 0.5);
  k.person(T2.x0 + 5.3, T2.z0 - 1.1);
  k.person(T3.x1 - 1.4, T3.z0 - 0.62, 0.5);
  void r1; void r3;
}

// ---------------------------------------------------------------------------
// The saw's edge along the quay
// ---------------------------------------------------------------------------

/** Where the stakeout car stands, and the subway's stair, by the Sprang: `t` along it, `d` out from its middle. */
const SAW = { car: { t: 100.5, d: 23.7 }, subway: { t0: 85.5, t1: 89.1, d0: 23.9, d1: 25.8 } };

function sawEdge(k: Build): void {
  const b = k.b, A = SPRANG_ALONG, C = SPRANG_ACROSS;
  // the subway: a stair down behind an iron rail, with a green globe lamp on a post at each side of its mouth
  const S = SAW.subway, len = S.t1 - S.t0, wid = S.d1 - S.d0, [sx, sz] = sprang((S.t0 + S.t1) / 2, (S.d0 + S.d1) / 2);
  b.moved(sx, 0, sz, ALONG_YAW, () => {
    // local x runs downstream, local z out towards the river
    b.quad([-len / 2, 0.035, -wid / 2], [len / 2, 0.035, -wid / 2], [len / 2, 0.035, wid / 2], [-len / 2, 0.035, wid / 2], [0, 1, 0], 0x101114);
    for (let i = 0; i < 4; i++) {
      const x = -len / 2 + 0.25 + i * 0.5;
      b.quad([x, 0.05, -wid / 2 + 0.1], [x + 0.22, 0.05, -wid / 2 + 0.1], [x + 0.22, 0.05, wid / 2 - 0.1], [x, 0.05, wid / 2 - 0.1], [0, 1, 0], 0x5a5c62 - i * 0x0a0a0a);
    }
    railing(b, -len / 2, -wid / 2 - 0.12, len / 2 + 0.12, wid / 2 + 0.12, 0, 0x4f7a5a, 'NSE', 1.0);
  });
  for (const s of [-1, 1]) {
    const [px, pz] = sprang(S.t0 + 0.1, (S.d0 + S.d1) / 2 + s * (wid / 2 + 0.25));
    b.beam([px, 0, pz], [px, 2.5, pz], 0.08, 0.06, 0x4f7a5a);
    k.glows.push({ x: px, y: 2.75, z: pz, sx: 0.42, sy: 0.42, sz: 0.42, color: '#59ff86' });
  }
  k.lights.push({ x: sx, z: sz, r: 7, color: '#7dff9a', k: 0.45 });
  const [bx, bz] = sprang(S.t1 + 0.13, (S.d0 + S.d1) / 2);
  k.sign('eastend-subway', bx + A[0] * 0.05, 1.45, bz + A[1] * 0.05, A[0], A[1], 0.45, 1.8);
  k.b.obox(bx, 1.45, bz, 0.95, 0.27, 0.04, Math.atan2(A[1], A[0]) + Math.PI / 2, DARK, { faces: 'B' });
  for (const s of [-1, 1]) { const [qx, qz] = sprang(S.t1 + 0.1, (S.d0 + S.d1) / 2 + s * 0.85); b.beam([qx, 1.0, qz], [qx, 1.75, qz], 0.04, 0.04, 0x4f7a5a); }

  // the newsstand against the laundry's wall, and its vendor
  const nx0 = T1.x0 - 1.5, nx1 = T1.x0 - 0.1, nz0 = T1.z0 + 2.0, nz1 = T1.z0 + 3.2;
  b.box(nx0, 0, nz0, nx1, 2.0, nz1, 0x2f4a3a);
  b.box(nx0 - 0.3, 2.0, nz0 - 0.3, nx1 + 0.05, 2.2, nz1 + 0.3, 0x24392c, { faces: 'NESWTB' });
  b.quad([nx0 - 0.01, 0.9, nz1 - 0.15], [nx0 - 0.01, 0.9, nz0 + 0.15], [nx0 - 0.01, 1.8, nz0 + 0.15], [nx0 - 0.01, 1.8, nz1 - 0.15], [-1, 0, 0], 0xe8dcb8, { win: interior(1.6) });
  b.box(nx0 - 0.5, 0, nz0 + 0.2, nx0, 0.8, nz1 - 0.2, 0xd8d2c4, { faces: 'NSWT' });
  hang(k, 'eastend-news', (nx0 + nx1) / 2, 1.7, nz1, 0, 1, 0.42, 1.2);
  if (open(nx0 - 1.0, (nz0 + nz1) / 2, 0.3)) k.person(nx0 - 1.0, (nz0 + nz1) / 2);

  // the coffee cart, steaming under a lamp, with two at it
  const cx = T1.x0 - 1.6, cz = T1.z1 - 2.2;
  b.box(cx - 0.65, 0.45, cz - 0.4, cx + 0.65, 1.35, cz + 0.4, 0xb8b2a2, { faces: 'NESWTB' });
  b.box(cx - 0.7, 1.35, cz - 0.45, cx + 0.7, 1.42, cz + 0.45, STEEL, { faces: 'NESWTB' });
  for (const s of [-1, 1]) b.box(cx - 0.3, 0, cz + s * 0.42 - 0.04, cx + 0.3, 0.6, cz + s * 0.42 + 0.04, 0x1c1c1f, { faces: 'NESW' });
  b.cyl(cx + 0.35, cz, 1.42, 1.85, 0.2, 0.18, 6, 0xc9ced3);
  b.cyl(cx, cz, 1.42, 2.6, 0.05, 0.05, 4, IRON, { cap: false });
  b.cyl(cx, cz, 2.5, 3.0, 1.2, 0.06, 8, 0x8a2f2a, { cap: false });
  hang(k, 'eastend-coffee', cx, 1.0, cz + 0.4, 0, 1, 0.34, 1.0, 0x3b2418);
  const lpx = T1.x0 - 0.45, lpz = T1.z1 - 0.6;
  b.cyl(lpx, lpz, 0, 0.4, 0.22, 0.16, 6, IRON_DARK);
  gasLamp(k, lpx, 3.9, lpz, 3.5, SODIUM);
  for (const [px, pz] of [[cx - 1.3, cz + 0.2], [cx - 0.2, cz - 1.1]] as [number, number][]) if (open(px, pz, 0.25)) k.person(px, pz);
  STEAM.push([cx + 0.35, 1.9, cz]);

  // the stakeout: an unmarked car by the kerb, and two in coats beside it
  const [ccx, ccz] = sprang(SAW.car.t, SAW.car.d);
  standingCar(k, ccx, ccz, ALONG_YAW, { body: 0x3a3f36, top: 0x2f332c });
  for (const t of [SAW.car.t - 1.2, SAW.car.t + 1.0]) { const [px, pz] = sprang(t, SAW.car.d + 2.5); k.person(px, pz); }
  // a hydrant at the corner by the museum
  const [hx, hz] = [MU.x0 - 0.7, MU.z1 - 1.3];
  b.cyl(hx, hz, 0, 0.7, 0.2, 0.18, 6, 0xb3201f);
  b.cyl(hx, hz, 0.7, 0.86, 0.24, 0.1, 6, 0xb3201f);
  b.beam([hx - 0.3, 0.45, hz], [hx + 0.3, 0.45, hz], 0.07, 0.07, 0xb3201f);
  void C;
}

// ---------------------------------------------------------------------------
// The east quay: bollards, steps, barges, the storm drain and the raised railway bridge
// ---------------------------------------------------------------------------

/** Where along the Sprang the raised railway bridge, the storm drain and the quay steps are. */
const QUAY = { bascule: 66, drain: 75, steps: [27, 84] };
/** The raised leaf's trunnion, in the quay's frame, and how it leans. */
const LEAF_AT = { up: 6, out: 1.8, len: 20.5, heel: 1.5, lean: (78 * Math.PI) / 180 };

/** Builds inside a frame on the east quay's edge at `t`: x along the river downstream, z out over the water, y as it is. */
function atQuay(k: Build, t: number, fn: () => void): void {
  const [x, z] = sprang(t, SPRANG.half);
  k.b.moved(x, 0, z, ALONG_YAW, fn);
}

/** A place in the quay's frame at `t`, turned back into the tile's own. */
function fromQuay(t: number, x: number, y: number, z: number): V3 {
  const [px, pz] = sprang(t + x, SPRANG.half - z);
  return [px, y, pz];
}

const UNDER_BRIDGE = (t: number): boolean => Math.abs(t - SPRANG.north) < 12.5 || Math.abs(t - SPRANG.south) < 12.5;

function quay(k: Build): void {
  const b = k.b;
  // bollards along the edge, but on the bridges and the raised bridge's pier
  for (let t = 16; t <= 112; t += 7.5) {
    if (UNDER_BRIDGE(t) || Math.abs(t - QUAY.bascule) < 6 || Math.abs(t - QUAY.drain) < 2) continue;
    const [x, z] = sprang(t, SPRANG.half + 0.32);
    b.cyl(x, z, 0, 0.5, 0.22, 0.18, 5, IRON, { cap: false });
    b.cyl(x, z, 0.5, 0.62, 0.28, 0.24, 5, IRON);
  }
  // steps down the quay's wall to the water
  for (const t of QUAY.steps) atQuay(k, t, () => {
    const n = 5, w = 0.75;
    for (let i = 0; i < n; i++) b.box(-1.9 + i * w, -1.6, 0.02, -1.9 + (i + 1) * w, -0.16 - i * 0.16, 1.1, STONE_LIGHT, { faces: 'NESWT' });
    b.box(-2.2, -1.6, 1.1, 1.9, -0.01, 1.25, STONE_DARK, { faces: 'NESWT' });
    b.beam([1.9, -0.95, 0.02], [1.9, 0.0, 0.02], 0.05, 0.05, IRON);
  });
  // barges against the quay, never under a bridge
  for (const [t, len, cargo] of [[55, 8, 0x1e1f22], [86.5, 7.5, 0x6e5a40]] as [number, number, number][]) {
    if (UNDER_BRIDGE(t - len / 2) || UNDER_BRIDGE(t + len / 2)) continue;
    atQuay(k, t, () => {
      const h = len / 2, w = 1.15, z = 1.45;
      b.box(-h, -1.25, z - w, h, -0.4, z + w, 0x2b2b30, { faces: 'NESWT', top: 0x3a3a40 });
      b.box(-h - 0.05, -0.62, z - w - 0.05, h + 0.05, -0.52, z + w + 0.05, 0x2a4a6a, { faces: 'NESWB' });
      b.box(-h + 0.7, -0.4, z - w + 0.25, h - 2.1, 0.25, z + w - 0.25, cargo, { faces: 'NESWT' });
      b.box(h - 1.8, -0.4, z - 0.75, h - 0.4, 0.85, z + 0.75, 0xd8d2c4, { win: { cell: 0.7, storey: 4, lit: 0.9, kind: 4 } });
      b.box(h - 1.95, 0.85, z - 0.9, h - 0.25, 0.98, z + 0.9, 0x2a4a6a, { faces: 'NESWTB' });
      b.beam([-h + 0.4, -0.4, z - w * 0.3], [-h - 0.4, 0.3, -0.3], 0.03, 0.03, 0x9a8a6a);
      b.beam([h - 0.4, -0.4, z - w * 0.3], [h + 0.4, 0.3, -0.3], 0.03, 0.03, 0x9a8a6a);
    });
    const [gx, , gz] = fromQuay(t, len / 2 - 1.1, 0, 1.45);
    k.glows.push({ x: gx, y: 1.1, z: gz, sx: 0.15, sy: 0.15, sz: 0.15, color: AMBER });
  }
  drain(k);
  raisedBridge(k);
}

/** The storm drain's round mouth in the quay's wall, half in the water: a stone ring, a keystone, and the dark inside. */
function drain(k: Build): void {
  const b = k.b, n = 10, ro = 1.2, ri = 0.84, cy = -0.9, f = 0.28, back = -0.9;
  atQuay(k, QUAY.drain, () => {
    const P = (a: number, r: number, z: number): V3 => [Math.cos(a) * r, cy + Math.sin(a) * r, z];
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI, a1 = ((i + 1) / n) * Math.PI, am = (a0 + a1) / 2;
      b.quad(P(a0, ri, f), P(a1, ri, f), P(a1, ro, f), P(a0, ro, f), [0, 0, 1], STONE_TRIM);
      b.quad(P(a0, ro, 0), P(a1, ro, 0), P(a1, ro, f), P(a0, ro, f), [Math.cos(am), Math.sin(am), 0], STONE_LIGHT);
      b.quad(P(a0, ri, back), P(a1, ri, back), P(a1, ri, f), P(a0, ri, f), [-Math.cos(am), -Math.sin(am), 0], 0x1b1c1f);
      face3(b, [0, cy, back], P(a1, ri, back), P(a0, ri, back), [0, 0, 1], 0x0c0c0e);
    }
    b.box(-0.22, cy + ri - 0.05, f - 0.02, 0.22, cy + ro + 0.12, f + 0.12, MUSEUM_TRIM, { faces: 'NESWT' });
  });
}

/** The railway bascule bridge, raised for good: one black steel leaf standing up from a pier off the quay's edge, leaning out over the river. */
function raisedBridge(k: Build): void {
  const b = k.b, Lf = LEAF_AT, s = Math.sin(Lf.lean), c = Math.cos(Lf.lean);
  atQuay(k, QUAY.bascule, () => {
    // the pier, a step up from the quay, and the tender's cabin on it
    b.box(-3.4, -1.6, 0.02, 6.9, 0.3, 3.9, STONE_DARK, { faces: 'ESWT', top: STONE });
    b.box(3.5, 0.3, 0.5, 6.5, 3.0, 3.3, 0x6a4a3a, { win: { cell: 1.1, storey: 4, lit: 0.9, kind: 4 }, seed: 8.1 });
    b.box(3.38, 2.85, 0.38, 6.62, 3.05, 3.42, STONE_TRIM, { faces: 'NESWB' });
    hip(b, 3.5, 0.5, 6.5, 3.3, 3.05, 0.9, LEAD, 0.25);
    // the towers that carry the trunnion
    const O: V3 = [0, Lf.up, Lf.out];
    for (const x of [-2.55, 2.55]) {
      b.beam([x, 0.3, 0.45], [x, Lf.up, Lf.out], 0.22, 0.18, LEAF_PALE);
      b.beam([x, 0.3, 3.4], [x, Lf.up, Lf.out], 0.22, 0.18, LEAF_PALE);
      b.beam([x, 2.4, 0.95], [x, 2.4, 2.9], 0.12, 0.12, LEAF_PALE);
    }
    b.beam([-2.8, Lf.up, Lf.out], [2.8, Lf.up, Lf.out], 0.3, 0.3, IRON_DARK);
    // the leaf: two deep girders, the deck between them with its rails, and bracing on the girders' faces
    const L: V3 = [0, s, c], T: V3 = [1, 0, 0], N: V3 = [0, -c, s];
    const at = (u: number, n = 0, x = 0): V3 => [O[0] + x, O[1] + L[1] * u + N[1] * n, O[2] + L[2] * u + N[2] * n];
    const mid = (Lf.len - Lf.heel) / 2, half = (Lf.len + Lf.heel) / 2;
    for (const x of [-2.1, 2.1]) {
      tbox(b, at(mid, 0.1, x), L, N, T, half, 0.75, 0.18, LEAF);
      for (let i = 0; i < 6; i++) {
        const u0 = -Lf.heel + (i * (Lf.len + Lf.heel)) / 6, u1 = u0 + (Lf.len + Lf.heel) / 6, out = x > 0 ? 0.24 : -0.24;
        b.beam(at(u0, i % 2 ? 0.7 : -0.5, x + out), at(u1, i % 2 ? -0.5 : 0.7, x + out), 0.07, 0.07, LEAF_PALE);
      }
    }
    tbox(b, at(mid, -0.45, 0), L, N, T, half, 0.08, 1.95, 0x4a4436);
    for (const x of [-0.72, 0.72]) b.beam(at(-Lf.heel + 0.3, -0.6, x), at(Lf.len - 0.3, -0.6, x), 0.06, 0.06, STEEL);
    for (let i = 1; i < 7; i++) b.beam(at((i * Lf.len) / 7, -0.62, -1.9), at((i * Lf.len) / 7, -0.62, 1.9), 0.06, 0.06, LEAF_PALE);
    // the counterweight, a block of concrete at the heel, low over the pier
    tbox(b, at(-3.2, 0.9, 0), L, N, T, 1.8, 1.4, 2.3, CONCRETE);
  });
  // a red lamp at the tip, and the tender's lamp
  const tip = fromQuay(QUAY.bascule, 0, LEAF_AT.up + s * LEAF_AT.len + 0.4, LEAF_AT.out + c * LEAF_AT.len);
  k.glows.push({ x: tip[0], y: tip[1], z: tip[2], sx: 0.35, sy: 0.35, sz: 0.35, color: '#ff3b3b' });
  const door = fromQuay(QUAY.bascule, 3.3, 2.2, 1.9);
  k.glows.push({ x: door[0], y: door[1], z: door[2], sx: 0.22, sy: 0.3, sz: 0.22, color: SODIUM });
  k.lights.push({ x: door[0], z: door[2], r: 8, color: SODIUM, k: 0.45 });
}

// ---------------------------------------------------------------------------
// Steam and smoke
// ---------------------------------------------------------------------------

/** Where steam rises: the coffee cart's urn. Filled while building. */
const STEAM: V3[] = [];

function smoke(k: Build): void {
  const s = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 60);
  k.group.add(s.mesh);
  const chimneys: V3[] = [T1, T2, T3].map((l) => { const R = roofOf(l); return [(R.chimney[0] + R.chimney[2]) / 2, R.y + CHIMNEY_H + 0.5, (R.chimney[1] + R.chimney[3]) / 2]; });
  const from = [...STEAM.splice(0).map((p) => ({ p, every: 0.35, size: 0.32, shade: 0.98 })), ...chimneys.map((p) => ({ p, every: 0.6, size: 0.42, shade: 0.72 }))];
  const r = rng(0x5733), at = new THREE.Vector3(), drift = new THREE.Vector3(0.25, 0.3, 0.12), due = from.map(() => r());
  k.each((dt) => {
    from.forEach((f, i) => {
      due[i] -= dt;
      if (due[i] > 0) return;
      due[i] = f.every * (0.7 + r() * 0.6);
      s.puff(at.set(f.p[0] + (r() - 0.5) * 0.2, f.p[1], f.p[2] + (r() - 0.5) * 0.2), drift, f.size, f.shade);
    });
    s.update(dt);
  });
}

// ---------------------------------------------------------------------------
// The exports
// ---------------------------------------------------------------------------

/** A model for each lot this file builds, by the lot's id. */
export const MODELS: Record<string, Model> = {
  museum,
  cinema,
  alley: court,
  'tenement-1': tenement,
  'tenement-2': tenement,
  'tenement-3': tenement,
  clinic,
  firehouse,
};

/** Lots that are built as part of another lot's model or by `extras`, and so get no box either. */
export const COVERS: string[] = [];

const R1 = roofOf(T1), R2 = roofOf(T2), R3 = roofOf(T3);
const chimneyTop = (R: ReturnType<typeof roofOf>): Place => ({ x: (R.chimney[0] + R.chimney[2]) / 2, y: R.y + CHIMNEY_H, z: (R.chimney[1] + R.chimney[3]) / 2, h: Math.PI / 2 });
const openHalf = (l: Lot, R: ReturnType<typeof roofOf>): Place => ({ x: (l.x0 + l.x1) / 2, y: R.y, z: l.z1 - (l.z1 - l.z0) / 4, h: Math.PI / 2 });
const SOUTH = Math.PI / 2, EAST = 0, WEST = Math.PI;
const DRAIN_AT = fromQuay(QUAY.drain, 0, -0.9, 1.5), STEPS_AT = fromQuay(QUAY.steps[1], 1.5, -0.8, 0.56);

/** Places on what this file builds that the show needs as built. */
export const PLACES: Record<string, Place> = {
  museumDoor: { x: (MU.x0 + MU.x1) / 2, y: MF.floor, z: MF.wall + 0.7, h: SOUTH },
  museumSteps: { x: (MU.x0 + MU.x1) / 2, y: MF.floor - (MF.floor / 4) * 2, z: MF.deck + ((MF.foot - MF.deck) / 3) * 1.5, h: SOUTH },
  pediment: { x: (MU.x0 + MU.x1) / 2, y: MF.terrace, z: MF.cols + 0.2, h: SOUTH },
  cinemaDoor: { x: CI.x0 + 2.6, y: 0, z: CF.front + 0.9, h: SOUTH },
  plinth: { x: CF.plinth[0], y: 0.6, z: CF.plinth[1], h: SOUTH },
  tyres: { x: COURT.tyres[0], y: 0.04 + 3 * TYRE, z: COURT.tyres[1], h: SOUTH },
  alleyLamp: { x: COURT.lamp[0], y: 0.04, z: COURT.lamp[1], h: SOUTH },
  roof1: openHalf(T1, R1),
  roof2: openHalf(T2, R2),
  roof3: openHalf(T3, R3),
  nightwing: { x: T1.x1 - 0.85, y: R1.y, z: T1.z1 - 0.85, h: Math.PI / 4 },
  chimney1: chimneyTop(R1),
  chimney2: chimneyTop(R2),
  chimney3: chimneyTop(R3),
  clinicDoor: { x: CLF.front + 0.7, y: 0.3, z: CLF.door, h: EAST },
  fireDoor: { x: FHF.front - 0.8, y: 0.04, z: (FHF.doors[1][0] + FHF.doors[1][1]) / 2, h: WEST },
  hoseTower: { x: (FHF.tower.x0 + FHF.tower.x1) / 2, y: FHF.tower.top, z: (FHF.tower.z0 + FHF.tower.z1) / 2, h: SOUTH },
  drain: { x: DRAIN_AT[0], y: DRAIN_AT[1], z: DRAIN_AT[2], h: Math.atan2(SPRANG_ACROSS[1], SPRANG_ACROSS[0]) },
  quaySteps: { x: STEPS_AT[0], y: STEPS_AT[1], z: STEPS_AT[2], h: ALONG_YAW },
};

/** Whatever is not one of the plan's lots: the tenements' dress, the lanes, the saw's edge, the quay, steam. */
export function extras(k: Build): void {
  tenementDress(k);
  lanes(k);
  sawEdge(k);
  quay(k);
  smoke(k);
}
