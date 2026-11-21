// The upper city east of the Crown: Gotham University and its quad, the Public Library, City Hall, the Courthouse, police headquarters with the Bat-Signal's lamp, the rim road's balustrade and the upper city's walls.
//
// Police headquarters is Pinkney's Gothic of 1899, as the comics give it: a
// thick block of dark stone with a round turret at each corner, gargoyles on
// its cornice and a flat roof that is a stage, with the Bat-Signal's lamp in
// its south-east corner. The other three civic buildings are in the paler
// stone of the city's public buildings: City Hall with its copper dome gone
// green, the library with its broad steps and two stone owls, the courthouse
// with its portico and Justice on the pediment. Gotham University is a
// collegiate Gothic hall on the Crown, its tower at the west end and its front
// over the quad below, where a scarecrow stands in a patch of maize. The comics
// give none of their looks but the police building's style: the rest is this
// tile's own drawing.

import { interior, rng, type GeoBuilder, type QuadOpts, type V3 } from '../../engine/geo';
import { flat } from '../../engine/ground';
import { hipped, lathe, pinnacle, roundel, tri } from '../../engine/parts';
import { standingCar } from '../../engine/props';
import { face3, hip, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import {
  AMBER, BRASS, COPPER, COPPER_DARK, DARK, GOTHIC_WIN, IRON, IRON_DARK, LEAD, LIMESTONE, LIMESTONE_DARK, SLATE, SODIUM, STEEL,
  STONE, STONE_DARK, STONE_LIGHT, STONE_TRIM, TIMBER, balustrade, fireEscape, gargoyle, gasLamp,
} from './look';
import type { Model, Place } from './models';
import { CROWN, SIGNAL, UPPER, Y, lotOf, type Lot } from './plan';

// ---------------------------------------------------------------------------
// Numbers this file takes from the plan
// ---------------------------------------------------------------------------

/** The upper city's east rim, where its wall drops to the quays, and its south rim over the ramp. */
const RIM_E = UPPER[3][0], RIM_N = UPPER[3][1], RIM_S = UPPER[4][1], RIM_W = UPPER[5][0];
/** The Crown's east wall, which the university's stair goes down. */
const CROWN_E = CROWN[1][0];
const [LAMP_X, LAMP_Y, LAMP_Z] = SIGNAL.lamp;

/** The civic buildings' own colours, beside Gotham's. */
const ROOF = 0x4a4e57, DOORWAY = 0x2a2018, GLASS_LIT = 0x3a3122, MARBLE = 0xb7b3a8, GRAVEL = 0x8b8478, QUAD_LAWN = 0x557a49, EARTH = 0x5a4a3a;
const SKYLIGHT = 0x6f8796;
/** Police headquarters' windows: fewer and narrower than an office's, in thick walls. */
const GCPD_WIN = { cell: 3, storey: 4, lit: 0.85, kind: 6 };
const CIVIC_WIN = { cell: 2.4, storey: 4, lit: 0.82, kind: 6 };

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

type Face = 'N' | 'E' | 'S' | 'W';
const NORMAL: Record<Face, V3> = { N: [0, 0, -1], E: [1, 0, 0], S: [0, 0, 1], W: [-1, 0, 0] };
/** A point on a wall that faces `face` and lies in `plane`: `u` runs along the wall, `y` up it. */
const onWall = (face: Face, plane: number, u: number, y: number): V3 => (face === 'N' || face === 'S' ? [u, y, plane] : [plane, y, u]);

/**
 * A doorway or a window laid flat on a wall: a rectangle `w` wide from `y0` up
 * `h`, with a pointed arch on it (or a round one). It is drawn in `plane`,
 * which should lie a hair in front of the wall.
 */
function opening(b: GeoBuilder, face: Face, plane: number, cu: number, y0: number, w: number, h: number, color: number, o: QuadOpts = {}, pointed = true): void {
  const n = NORMAL[face], r = w / 2, top = y0 + h;
  const P = (u: number, y: number): V3 => onWall(face, plane, cu + u, y);
  b.quad(P(-r, y0), P(r, y0), P(r, top), P(-r, top), n, color, o);
  const pts: [number, number][] = [];
  const steps = 5;
  if (pointed) {
    for (let i = 0; i <= steps; i++) { const a = Math.PI - (Math.PI / 3) * (i / steps); pts.push([r + 2 * r * Math.cos(a), top + 2 * r * Math.sin(a)]); }
    for (let i = steps - 1; i >= 0; i--) { const a = Math.PI - (Math.PI / 3) * (i / steps); pts.push([-(r + 2 * r * Math.cos(a)), top + 2 * r * Math.sin(a)]); }
  } else {
    for (let i = 0; i <= 2 * steps; i++) { const a = Math.PI * (1 - i / (2 * steps)); pts.push([r * Math.cos(a), top + r * Math.sin(a)]); }
  }
  for (let i = 0; i + 1 < pts.length; i++) tri(b, P(0, top), P(pts[i][0], pts[i][1]), P(pts[i + 1][0], pts[i + 1][1]), n, color, o);
}

/** A band round a block: a plinth, a string course, a cornice. It stands `out` proud of the block's faces. */
function band(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, out: number, color: number): void {
  b.box(x0 - out, y0, z0 - out, x1 + out, y1, z1 + out, color, { faces: 'NESWTB' });
}

/** A parapet round a flat roof, its outer faces `proud` beyond the block's, `t` thick. */
function parapetRing(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, t: number, proud: number, color: number, sides = 'NESW'): void {
  const a = x0 - proud, c = x1 + proud, d = z0 - proud, e = z1 + proud;
  if (sides.includes('N')) b.box(a, y0, d, c, y1, d + t, color, { faces: 'NESWT' });
  if (sides.includes('S')) b.box(a, y0, e - t, c, y1, e, color, { faces: 'NESWT' });
  if (sides.includes('W')) b.box(a, y0, d + t, a + t, y1, e - t, color, { faces: 'NESWT' });
  if (sides.includes('E')) b.box(c - t, y0, d + t, c, y1, e - t, color, { faces: 'NESWT' });
}

/** A column with a base and a capital, from `y0` to `y1`. */
function column(b: GeoBuilder, x: number, z: number, y0: number, y1: number, r: number, color: number, trim: number): void {
  b.box(x - r * 1.3, y0, z - r * 1.3, x + r * 1.3, y0 + 0.3, z + r * 1.3, trim);
  b.cyl(x, z, y0 + 0.3, y1 - 0.35, r, r * 0.88, 8, color, { cap: false });
  b.box(x - r * 1.4, y1 - 0.35, z - r * 1.4, x + r * 1.4, y1, z + r * 1.4, trim, { faces: 'NESWTB' });
}

/** A sign on a thin dark board on a wall: `x, y, z` is the middle of the wall's face behind it and (nx, nz) the way it faces. */
function plaque(k: Build, id: string, x: number, y: number, z: number, nx: number, nz: number, h: number, maxW: number, color = DARK): number {
  const w = k.sign(id, x + nx * 0.13, y, z + nz * 0.13, nx, nz, h, maxW);
  k.b.obox(x + nx * 0.06, y, z + nz * 0.06, 0.04, h / 2 + 0.08, w / 2 + 0.1, Math.atan2(nz, nx), color);
  return w;
}

/**
 * A pitched roof with its ridge along x, whose gables close right up under
 * it: two slopes with undersides, reaching `over` beyond the walls, and the
 * two triangles of wall at its ends.
 */
function pitchedX(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, rise: number, over: number, roof: number, wall: number): void {
  const zc = (z0 + z1) / 2, run = (z1 - z0) / 2, drop = (over * rise) / run, xm = (x0 + x1) / 2, half = (x1 - x0) / 2 + 0.2;
  slab(b, [xm, y - drop, z0 - over], [xm, y + rise, zc], half, 0.16, roof, { under: STONE_DARK });
  slab(b, [xm, y - drop, z1 + over], [xm, y + rise, zc], half, 0.16, roof, { under: STONE_DARK });
  face3(b, [x0, y, z0], [x0, y, z1], [x0, y + rise, zc], [-1, 0, 0], wall);
  face3(b, [x1, y, z0], [x1, y, z1], [x1, y + rise, zc], [1, 0, 0], wall);
}

/** A flight of steps down to the south from a landing at `yTop` that ends at `zTop`: `n` treads of `tread`, from x0 to x1, standing on `y0`. */
function stepsSouth(b: GeoBuilder, x0: number, x1: number, zTop: number, yTop: number, y0: number, n: number, tread: number, color: number): void {
  const rise = (yTop - y0) / (n + 1);
  for (let i = 0; i < n; i++) b.box(x0, y0, zTop + i * tread, x1, yTop - (i + 1) * rise, zTop + (i + 1) * tread, color, { faces: 'NESWT' });
}

/** A globe lamp on a post, lettered POLICE, lit at night. */
function globeLamp(k: Build, x: number, z: number, y: number, facing: V3): void {
  const b = k.b, top = y + 2.0;
  b.beam([x, y, z], [x, top, z], 0.1, 0.08, IRON_DARK);
  b.box(x - 0.16, top, z - 0.16, x + 0.16, top + 0.1, z + 0.16, IRON_DARK, { faces: 'NESWTB' });
  lathe(b, x, z, [[0.16, top + 0.1], [0.36, top + 0.25], [0.42, top + 0.5], [0.36, top + 0.78], [0.12, top + 0.9]], 8, 0xc4ecc8, { win: interior(2.6) });
  b.cyl(x, z, top + 0.9, top + 1.0, 0.14, 0.1, 6, IRON_DARK);
  k.sign('civic-police', x + facing[0] * 0.45, top + 0.5, z + facing[2] * 0.45, facing[0], facing[2], 0.2, 0.8);
  k.glows.push({ x, y: top + 0.5, z, sx: 0.5, sy: 0.5, sz: 0.5, color: '#d6ffd8' });
  k.lights.push({ x, z, r: 7, color: '#d6ffd8', k: 0.4 });
}

/** A gas lamp on a post that stands on `y`. */
const postLamp = (k: Build, x: number, z: number, y: number, h = 3.2): void => gasLamp(k, x, y + h, z, h);

/** A bench, its seat along x or along z, facing the way `yaw` says. */
function bench(b: GeoBuilder, x: number, z: number, y: number, alongX: boolean): void {
  const hx = alongX ? 0.9 : 0.25, hz = alongX ? 0.25 : 0.9;
  b.box(x - hx, y + 0.42, z - hz, x + hx, y + 0.52, z + hz, TIMBER, { faces: 'NESWTB' });
  for (const s of [-1, 1]) {
    const lx = alongX ? x + s * 0.75 : x, lz = alongX ? z : z + s * 0.75;
    b.box(lx - 0.06, y, lz - 0.06, lx + 0.06, y + 0.42, lz + 0.06, IRON_DARK, { faces: 'NESW' });
  }
}

// ---------------------------------------------------------------------------
// Police headquarters
// ---------------------------------------------------------------------------

/** The police building's numbers, for its model and its places. */
function gcpdShape(l: Lot) {
  const i = 0.3, X0 = l.x0 + i, X1 = l.x1 - i, Z0 = l.z0 + i, Z1 = l.z1 - i;
  const zc = (l.z0 + l.z1) / 2, porch = X1 + 0.9;
  /** The stair head on the roof, beside the north-west turret. */
  const hut = { x0: l.x0 + 2.8, x1: l.x0 + 6.2, z0: Z0 + 0.4, z1: Z0 + 2.95 };
  return { X0, X1, Z0, Z1, zc, porch, hut, doorX: (hut.x0 + hut.x1) / 2 };
}

const gcpd: Model = (k, l) => {
  const b = k.b, B = l.base, T = l.top;
  const { X0, X1, Z0, Z1, zc, porch, hut, doorX } = gcpdShape(l);

  // the block, with its flat roof, which is the stage
  b.box(X0, B, Z0, X1, T, Z1, STONE, { win: GCPD_WIN, seed: 3.1, top: ROOF });
  // piers between the bays, as buttresses that rise to the cornice
  for (let u = 3; u < X1 - X0 - 1; u += 3) {
    for (const z of [Z0, Z1]) b.box(X0 + u - 0.28, B + 1.2, z - 0.25, X0 + u + 0.28, T - 1.0, z + 0.25, STONE_LIGHT, { faces: 'NESW' });
  }
  for (let u = 3; u < Z1 - Z0 - 1; u += 3) {
    if (Math.abs(Z0 + u - zc) < 2.4) continue;
    for (const x of [X0, X1]) b.box(x - 0.25, B + 1.2, Z0 + u - 0.28, x + 0.25, T - 1.0, Z0 + u + 0.28, STONE_LIGHT, { faces: 'NESW' });
  }
  band(b, X0, Z0, X1, Z1, B, B + 1.2, 0.25, STONE_DARK);
  band(b, X0, Z0, X1, Z1, B + 4, B + 4.35, 0.18, STONE_TRIM);
  band(b, X0, Z0, X1, Z1, B + 16, B + 16.3, 0.15, STONE_TRIM);
  band(b, X0, Z0, X1, Z1, T - 1.0, T - 0.1, 0.4, STONE_TRIM);
  parapetRing(b, X0, Z0, X1, Z1, T - 0.1, T + 0.9, 0.45, 0.12, STONE_LIGHT);

  // a round turret at each corner, as Pinkney's rounded edges, crowned with battlements
  for (const [cx, cz] of [[l.x0, l.z0], [l.x1, l.z0], [l.x1, l.z1], [l.x0, l.z1]]) {
    b.cyl(cx, cz, B, T, 1.25, 1.25, 10, STONE_LIGHT, { win: GOTHIC_WIN, seed: cx * 0.31 + cz, cap: false });
    b.cyl(cx, cz, T, T + 0.45, 1.25, 1.45, 10, STONE_TRIM, { cap: false });
    b.cyl(cx, cz, T + 0.45, T + 0.65, 1.45, 1.45, 10, STONE_TRIM, { cap: LEAD });
    for (let m = 0; m < 6; m++) {
      const a = (m / 6) * Math.PI * 2 + 0.3;
      b.obox(cx + Math.cos(a) * 1.28, T + 0.92, cz + Math.sin(a) * 1.28, 0.15, 0.27, 0.22, a, STONE_TRIM);
    }
  }

  // gargoyles on the cornice, over the south and the east
  for (const x of [l.x0 + 3, l.x1 - 3]) gargoyle(b, x, T - 0.1, Z1 + 0.25, Math.PI / 2, 1);
  for (const z of [l.z0 + 3.5, l.z1 - 3.5]) gargoyle(b, X1 + 0.25, T - 0.1, z, 0, 1);

  // its name, high on the south front over the library, where the opening view reads it
  plaque(k, 'civic-gcpd', (l.x0 + l.x1) / 2, T - 2.1, Z1 + 0.25, 0, 1, 0.95, 6);

  // the door, in a gabled porch on the east front, with a lit globe lamp each side
  b.box(X1 - 0.2, B, zc - 1.8, porch, B + 5, zc + 1.8, STONE_LIGHT, { faces: 'NEST' });
  face3(b, [porch, B + 5, zc - 1.8], [porch, B + 5, zc + 1.8], [porch, B + 6.5, zc], [1, 0, 0], STONE_LIGHT);
  for (const s of [-1, 1]) slab(b, [(X1 - 0.2 + porch + 0.12) / 2, B + 4.92, zc + s * 1.95], [(X1 - 0.2 + porch + 0.12) / 2, B + 6.55, zc], (porch + 0.12 - X1 + 0.2) / 2, 0.14, SLATE, { under: STONE_DARK });
  opening(b, 'E', porch + 0.03, zc, B + 0.25, 1.7, 2.4, DOORWAY, { win: interior(1.8) });
  b.box(porch, B, zc - 1.3, porch + 0.55, B + 0.25, zc + 1.3, STONE_TRIM);
  for (const s of [-1, 1]) globeLamp(k, porch + 0.7, zc + s * 2.25, B, [1, 0, 0]);
  k.glows.push({ x: porch + 0.08, y: B + 4.6, z: zc, sx: 0.2, sy: 0.3, sz: 0.5, color: AMBER });

  // the stair head on the roof, with its door to the south and the radio's mast
  b.box(hut.x0, T, hut.z0, hut.x1, T + 2.3, hut.z1, STONE_LIGHT);
  b.box(hut.x0 - 0.15, T + 2.3, hut.z0 - 0.15, hut.x1 + 0.15, T + 2.48, hut.z1 + 0.15, LEAD, { faces: 'NESWTB' });
  opening(b, 'S', hut.z1 + 0.03, doorX, T, 1.0, 1.45, DOORWAY, { win: interior(1.5) }, false);
  k.glows.push({ x: doorX, y: T + 2.1, z: hut.z1 + 0.12, sx: 0.3, sy: 0.2, sz: 0.2, color: AMBER });
  b.beam([hut.x1 - 0.5, T + 2.48, hut.z0 + 0.5], [hut.x1 - 0.5, T + 3.9, hut.z0 + 0.5], 0.06, 0.03, STEEL);
  k.glows.push({ x: hut.x1 - 0.5, y: T + 3.95, z: hut.z0 + 0.5, sx: 0.18, sy: 0.18, sz: 0.18, color: '#ff3b3b' });

  // the Bat-Signal's lamp: a low plinth, a turning ring, a yoke, and the drum aimed straight up, its glass at the lamp's height
  b.cyl(LAMP_X, LAMP_Z, T, T + 0.14, 1.3, 1.3, 10, STONE_TRIM);
  b.cyl(LAMP_X, LAMP_Z, T + 0.14, T + 0.2, 1.08, 1.08, 10, IRON_DARK);
  for (const s of [-1, 1]) {
    b.box(LAMP_X + s * 1.0, T + 0.2, LAMP_Z - 0.14, LAMP_X + s * 1.16, LAMP_Y - 0.06, LAMP_Z + 0.14, IRON, { faces: 'NESWT' });
    b.box(LAMP_X + s * 0.9, LAMP_Y - 0.3, LAMP_Z - 0.09, LAMP_X + s * 1.0, LAMP_Y - 0.18, LAMP_Z + 0.09, IRON, { faces: 'NSTB' });
  }
  b.cyl(LAMP_X, LAMP_Z, T + 0.18, LAMP_Y - 0.1, 0.93, 0.93, 12, STEEL, { cap: false });
  b.cyl(LAMP_X, LAMP_Z, LAMP_Y - 0.12, LAMP_Y - 0.02, 0.98, 0.98, 12, IRON_DARK, { cap: false });
  b.cyl(LAMP_X, LAMP_Z, LAMP_Y - 0.1, LAMP_Y, 0.86, 0.86, 12, 0xfff1c4, { cap: 0xfff1c4, win: interior(3) });
  // a plain bat's outline fixed over the lens
  const bat: [number, number][] = [[0, -0.3], [0.1, -0.42], [0.16, -0.2], [0.42, -0.3], [0.72, -0.26], [0.98, -0.42], [0.92, 0.02], [0.72, 0.2], [0.52, 0.1], [0.34, 0.3], [0.14, 0.14], [0, 0.38]];
  const outline = [...bat, ...bat.slice(1, -1).reverse().map(([u, v]): [number, number] => [-u, v])];
  const s = 0.62, by = LAMP_Y + 0.015;
  for (let j = 0; j < outline.length; j++) {
    const p = outline[j], q = outline[(j + 1) % outline.length];
    b.up([LAMP_X, by, LAMP_Z], [LAMP_X + p[0] * s, by, LAMP_Z + p[1] * s], [LAMP_X + q[0] * s, by, LAMP_Z + q[1] * s], 0x15161a);
  }
  k.lights.push({ x: porch + 1.5, z: zc, r: 10, color: SODIUM, k: 0.5 });
};

// ---------------------------------------------------------------------------
// City Hall
// ---------------------------------------------------------------------------

function hallShape(l: Lot) {
  const X0 = l.x0 + 0.3, X1 = l.x1 - 2.6, Z0 = l.z0 + 0.3, Z1 = l.z1 - 0.3, zc = (l.z0 + l.z1) / 2;
  return { X0, X1, Z0, Z1, zc, front: X1 + 2.25, floor: l.base + 0.9 };
}

const cityHall: Model = (k, l) => {
  const b = k.b, B = l.base;
  const { X0, X1, Z0, Z1, zc, front, floor } = hallShape(l);
  const eave = B + 12;
  b.box(X0, B, Z0, X1, eave, Z1, LIMESTONE, { win: CIVIC_WIN, seed: 7.7, top: LEAD });
  band(b, X0, Z0, X1, Z1, B, B + 1, 0.2, LIMESTONE_DARK);
  band(b, X0, Z0, X1, Z1, B + 4, B + 4.3, 0.15, STONE_TRIM);
  band(b, X0, Z0, X1, Z1, eave - 0.7, eave - 0.06, 0.35, STONE_TRIM);
  parapetRing(b, X0, Z0, X1, Z1, eave, eave + 0.6, 0.35, 0.12, LIMESTONE_DARK);
  // a pavilion at each corner, a little higher than the rest, but under 21 so that the quad behind stays in sight
  for (const [ax, az] of [[X0, Z0], [X1 - 3, Z0], [X1 - 3, Z1 - 3], [X0, Z1 - 3]]) {
    b.box(ax - 0.25, B, az - 0.25, ax + 3.25, B + 12.85, az + 3.25, LIMESTONE, { win: CIVIC_WIN, seed: ax + az, top: COPPER_DARK });
  }
  for (const [gx, gz, yaw] of [[X0 + 0.5, Z1 - 0.5, (3 * Math.PI) / 4], [X1 - 0.5, Z1 - 0.5, Math.PI / 4]] as const) gargoyle(b, gx, B + 12.85, gz, yaw, 0.9);

  // the portico on the east front, over the quays: six columns on a podium, the name on its frieze, a pediment over it
  const pz0 = zc - 4.4, pz1 = zc + 4.4;
  b.box(X1, B, pz0, front, floor, pz1, LIMESTONE_DARK);
  b.box(front, B, pz0 + 0.6, front + 0.6, B + 0.45, pz1 - 0.6, STONE_TRIM);
  for (let c = 0; c < 6; c++) column(b, front - 0.55, pz0 + 0.6 + (c * (pz1 - pz0 - 1.2)) / 5, floor, B + 8.6, 0.4, LIMESTONE, STONE_TRIM);
  const ent0 = B + 8.6, ent1 = B + 9.8;
  b.box(X1, ent0, pz0, front, ent1, pz1, LIMESTONE, { faces: 'NESWTB' });
  b.box(front - 0.04, ent0 + 0.2, zc - 3.2, front + 0.04, ent1 - 0.2, zc + 3.2, LIMESTONE_DARK, { faces: 'E' });
  k.sign('civic-city-hall', front + 0.08, (ent0 + ent1) / 2, zc, 1, 0, 0.75, 6);
  const apex = B + 12.4;
  face3(b, [front - 0.05, ent1, pz0], [front - 0.05, ent1, pz1], [front - 0.05, apex, zc], [1, 0, 0], LIMESTONE);
  face3(b, [X1 + 0.05, ent1, pz0], [X1 + 0.05, ent1, pz1], [X1 + 0.05, apex, zc], [-1, 0, 0], LIMESTONE);
  for (const s of [-1, 1]) slab(b, [(X1 + front + 0.2) / 2, ent1 - 0.05, zc + s * 4.6], [(X1 + front + 0.2) / 2, apex + 0.1, zc], (front + 0.2 - X1) / 2, 0.18, COPPER_DARK, { under: LIMESTONE_DARK });
  opening(b, 'E', X1 + 0.03, zc, floor, 2, 2.8, DOORWAY, { win: interior(1.8) }, false);
  for (const s of [-1, 1]) opening(b, 'E', X1 + 0.03, zc + s * 2.6, floor + 0.6, 1.1, 3.0, GLASS_LIT, { win: interior(2) }, false);

  // the dome, at the lot's middle: a drum with its windows, a cornice, the copper dome gone green with its ribs, and the lantern
  const dx = (l.x0 + l.x1) / 2, dz = zc, d0 = eave, d1 = eave + 2.6, R = 4.1;
  b.cyl(dx, dz, d0, d1, R, R, 16, LIMESTONE, { cap: false });
  for (let w = 0; w < 8; w++) {
    const a = (w / 8) * Math.PI * 2 + Math.PI / 16;
    b.obox(dx + Math.cos(a) * (R - 0.08), d0 + 1.35, dz + Math.sin(a) * (R - 0.08), 0.1, 0.75, 0.32, a, GLASS_LIT, { win: interior(2.2) });
  }
  b.cyl(dx, dz, d1, d1 + 0.35, R + 0.25, R + 0.25, 16, STONE_TRIM, { cap: COPPER_DARK });
  const rings: [number, number][] = [[4.0, d1 + 0.35], [3.85, d1 + 1.1], [3.45, d1 + 1.8], [2.75, d1 + 2.4], [1.8, d1 + 2.85], [0.8, d1 + 3.05]];
  lathe(b, dx, dz, rings, 16, COPPER);
  for (let r = 0; r < 8; r++) {
    const a = (r / 8) * Math.PI * 2;
    b.sweep(rings.map(([rr, y]): V3 => [dx + Math.cos(a) * (rr + 0.06), y + 0.03, dz + Math.sin(a) * (rr + 0.06)]), rings.map(() => 0.07), COPPER_DARK);
  }
  b.cyl(dx, dz, d1 + 2.95, l.top - 0.05, 0.85, 0.75, 8, LIMESTONE, { cap: COPPER_DARK, win: interior(1.4) });
  b.cyl(dx, dz, l.top - 0.05, l.top + 0.9, 0.22, 0.02, 6, BRASS, { cap: false });
  k.lights.push({ x: front + 2, z: zc, r: 10, color: AMBER, k: 0.5 });
};

// ---------------------------------------------------------------------------
// The library and the courthouse, on the rim road
// ---------------------------------------------------------------------------

/** The library's numbers: its body, the landing before its door, and its steps. */
function libraryShape(l: Lot) {
  const X0 = l.x0 + 0.3, X1 = l.x1 - 0.3, Z0 = l.z0 + 0.3, face = l.z1 - 5.2, cx = (l.x0 + l.x1) / 2;
  const landing = l.base + 1.6, tread = 1.2, stepsFrom = face + 1.6;
  return { X0, X1, Z0, face, cx, landing, tread, stepsFrom, rise: 0.4 };
}

/** A stone owl, sitting on `y` and looking south. */
function owl(b: GeoBuilder, x: number, z: number, y: number): void {
  const c = 0x8f8c84;
  b.box(x - 0.38, y, z - 0.38, x + 0.38, y + 0.5, z + 0.38, LIMESTONE_DARK);
  b.cyl(x, z, y + 0.5, y + 1.35, 0.42, 0.32, 6, c, { cap: c });
  b.box(x - 0.34, y + 1.3, z - 0.3, x + 0.34, y + 1.78, z + 0.3, c);
  for (const s of [-1, 1]) {
    face3(b, [x + s * 0.34, y + 1.78, z - 0.12], [x + s * 0.34, y + 1.78, z + 0.12], [x + s * 0.3, y + 2.05, z], [s, 0.2, 0], c);
    b.box(x + s * 0.15 - 0.09, y + 1.48, z + 0.3, x + s * 0.15 + 0.09, y + 1.64, z + 0.34, 0xd9cfa8, { faces: 'S' });
  }
  face3(b, [x - 0.06, y + 1.46, z + 0.31], [x + 0.06, y + 1.46, z + 0.31], [x, y + 1.36, z + 0.42], [0, -0.2, 1], 0x6b6760);
}

const library: Model = (k, l) => {
  const b = k.b, B = l.base;
  const { X0, X1, Z0, face, cx, landing, tread, stepsFrom } = libraryShape(l);
  const eave = B + 12;
  b.box(X0, B, Z0, X1, eave, face, LIMESTONE_DARK, { win: CIVIC_WIN, seed: 11.3, top: LEAD });
  band(b, X0, Z0, X1, face, B, B + 1.5, 0.2, STONE_DARK);
  band(b, X0, Z0, X1, face, B + 8, B + 8.3, 0.15, STONE_TRIM);
  band(b, X0, Z0, X1, face, eave - 0.6, eave - 0.06, 0.35, STONE_TRIM);
  parapetRing(b, X0, Z0, X1, face, eave, eave + 0.7, 0.35, 0.12, LIMESTONE);
  // the reading room's glass roof
  hipped(b, cx - 3, Z0 + 1.7, cx + 3, face - 1.7, eave, l.top - 0.1, 1.4, 1.4, SKYLIGHT, SKYLIGHT, { win: interior(1.6) });

  // the front: a landing before the door under four columns, and broad steps down to the sidewalk
  b.box(X0 + 1.2, B, face - 0.1, X1 - 1.2, landing, stepsFrom, STONE_TRIM);
  stepsSouth(b, X0 + 1.2, X1 - 1.2, stepsFrom, landing, B, 3, tread, STONE_TRIM);
  for (let c = 0; c < 4; c++) column(b, cx - 2.5 + c * (5 / 3), face + 0.8, landing, B + 9, 0.38, LIMESTONE, STONE_TRIM);
  b.box(cx - 3.6, B + 9, face, cx + 3.6, B + 10.2, face + 1.4, LIMESTONE, { faces: 'NESWTB' });
  b.box(cx - 3.0, B + 9.2, face + 1.4, cx + 3.0, B + 10.0, face + 1.44, STONE_DARK, { faces: 'S' });
  k.sign('civic-library', cx, B + 9.6, face + 1.47, 0, 1, 0.62, 5.8);
  b.box(cx - 3.6, B + 10.2, face, cx + 3.6, eave + 0.9, face + 0.4, LIMESTONE, { faces: 'NESWT' });
  opening(b, 'S', face + 0.03, cx, landing, 2.2, 2.8, DOORWAY, { win: interior(1.8) }, false);
  for (const s of [-1, 1]) opening(b, 'S', face + 0.03, cx + s * 4.6, B + 2.2, 1.5, 4.0, GLASS_LIT, { win: interior(2.1) }, false);
  // cheek walls beside the steps, with a stone owl on each and a lamp behind it
  for (const s of [-1, 1]) {
    const wx = s < 0 ? X0 + 0.4 : X1 - 1.2;
    b.box(wx, B, face - 0.1, wx + 0.8, B + 2.0, l.z1, LIMESTONE, { top: STONE_TRIM });
    owl(b, wx + 0.4, l.z1 - 0.6, B + 2.0);
    postLamp(k, wx + 0.4, face + 0.6, B + 2.0, 1.4);
  }
  fireEscape(b, cx + 3, Z0, 'N', B, eave, 3);
  k.lights.push({ x: cx, z: l.z1 + 2, r: 11, color: SODIUM, k: 0.5 });
};

function courtShape(l: Lot) {
  const X0 = l.x0 + 0.3, X1 = l.x1 - 0.3, Z0 = l.z0 + 0.3, face = l.z1 - 6.5, cx = (l.x0 + l.x1) / 2;
  const floor = l.base + 1.6, stepsFrom = l.z1 - 3.4, tread = 1.1, colZ = l.z1 - 4.1;
  return { X0, X1, Z0, face, cx, floor, stepsFrom, tread, colZ };
}

/** Justice: a robed figure, blindfolded, holding up her scales. She stands on `y`. */
function justice(b: GeoBuilder, x: number, z: number, y: number): void {
  b.box(x - 0.5, y, z - 0.4, x + 0.5, y + 0.25, z + 0.4, LIMESTONE);
  const gilt = BRASS;
  b.cyl(x, z, y + 0.25, y + 1.2, 0.34, 0.2, 6, gilt);
  b.box(x - 0.2, y + 1.15, z - 0.14, x + 0.2, y + 1.45, z + 0.14, gilt);
  b.box(x - 0.13, y + 1.45, z - 0.13, x + 0.13, y + 1.72, z + 0.13, gilt);
  b.box(x - 0.15, y + 1.55, z - 0.15, x + 0.15, y + 1.62, z + 0.15, 0x3a3226);
  b.beam([x - 0.18, y + 1.38, z], [x - 0.55, y + 1.7, z + 0.05], 0.05, 0.05, gilt);
  b.beam([x - 0.9, y + 1.72, z + 0.05], [x - 0.2, y + 1.72, z + 0.05], 0.025, 0.025, gilt);
  for (const px of [-0.85, -0.25]) b.box(x + px - 0.12, y + 1.45, z - 0.07, x + px + 0.12, y + 1.5, z + 0.17, gilt, { faces: 'NESWTB' });
  b.beam([x + 0.18, y + 1.38, z], [x + 0.3, y + 0.9, z + 0.05], 0.05, 0.05, gilt);
}

const courthouse: Model = (k, l) => {
  const b = k.b, B = l.base;
  const { X0, X1, Z0, face, cx, floor, stepsFrom, tread, colZ } = courtShape(l);
  const eave = B + 12;
  b.box(X0, B, Z0, X1, eave, face, LIMESTONE, { win: CIVIC_WIN, seed: 5.9, top: LEAD });
  band(b, X0, Z0, X1, face, B, B + 1.5, 0.2, LIMESTONE_DARK);
  band(b, X0, Z0, X1, face, B + 8, B + 8.3, 0.15, STONE_TRIM);
  band(b, X0, Z0, X1, face, eave - 0.6, eave - 0.06, 0.35, STONE_TRIM);
  parapetRing(b, X0, Z0, X1, face, eave, eave + 0.6, 0.35, 0.12, LIMESTONE_DARK, 'NEW');
  hip(b, X0 + 0.4, Z0 + 0.4, X1 - 0.4, face - 0.2, eave, 2.1, SLATE, 0);
  for (const [gx, yaw] of [[X0 + 0.4, (3 * Math.PI) / 4], [X1 - 0.4, Math.PI / 4]] as const) gargoyle(b, gx, eave, face - 0.4, yaw, 0.9);

  // the portico: a podium, broad steps down to the sidewalk, six columns, the name on the frieze, and the pediment with Justice on it
  const p0 = X0 + 1.1, p1 = X1 - 1.1;
  b.box(p0, B, face - 0.1, p1, floor, stepsFrom, STONE_TRIM);
  stepsSouth(b, p0, p1, stepsFrom, floor, B, 3, tread, STONE_TRIM);
  const top = B + 10, ent = top + 1.3;
  for (let c = 0; c < 6; c++) column(b, p0 + 1 + (c * (p1 - p0 - 2)) / 5, colZ, floor, top, 0.46, LIMESTONE, STONE_TRIM);
  b.box(p0, top, face, p1, ent, colZ + 0.75, LIMESTONE, { faces: 'NESWTB' });
  const fz = colZ + 0.75;
  b.box(cx - 3.6, top + 0.22, fz, cx + 3.6, ent - 0.22, fz + 0.04, LIMESTONE_DARK, { faces: 'S' });
  k.sign('civic-courthouse', cx, (top + ent) / 2, fz + 0.07, 0, 1, 0.72, 6.6);
  const apex = ent + 2.7;
  face3(b, [p0 - 0.15, ent, fz - 0.05], [p1 + 0.15, ent, fz - 0.05], [cx, apex, fz - 0.05], [0, 0, 1], LIMESTONE);
  face3(b, [p0 - 0.15, ent, face + 0.05], [p1 + 0.15, ent, face + 0.05], [cx, apex, face + 0.05], [0, 0, -1], LIMESTONE);
  const zm = (face + fz + 0.2) / 2, hz = (fz + 0.2 - face) / 2;
  for (const s of [-1, 1]) {
    const ex = s < 0 ? p0 - 0.35 : p1 + 0.35;
    const a: V3 = [ex, ent - 0.1, zm], c: V3 = [cx, apex + 0.12, zm];
    slab(b, a, c, hz, 0.2, SLATE, { under: LIMESTONE_DARK });
  }
  justice(b, cx, fz - 0.45, apex - 0.05);
  opening(b, 'S', face + 0.03, cx, floor, 2.4, 3.0, DOORWAY, { win: interior(1.8) }, false);
  for (const s of [-1, 1]) opening(b, 'S', face + 0.03, cx + s * 3.4, floor + 0.7, 1.2, 3.2, GLASS_LIT, { win: interior(2) }, false);
  fireEscape(b, X0, Z0 + 3, 'W', B, eave, 3);
  for (const s of [-1, 1]) postLamp(k, s < 0 ? p0 + 0.3 : p1 - 0.3, stepsFrom + 0.3, floor, 2.4);
  k.lights.push({ x: cx, z: l.z1 + 2, r: 12, color: SODIUM, k: 0.5 });
};

// ---------------------------------------------------------------------------
// Gotham University, on the Crown, and its quad below
// ---------------------------------------------------------------------------

function uniShape(l: Lot) {
  const X0 = l.x0 + 3.8, X1 = l.x1 - 0.3, Z0 = l.z0 + 0.8, Z1 = l.z1 - 0.8, zc = (l.z0 + l.z1) / 2;
  return { X0, X1, Z0, Z1, zc };
}

const university: Model = (k, l) => {
  const b = k.b, B = l.base, plinth = 16, eave = 20, ridge = 4.2;
  const { X0, X1, Z0, Z1, zc } = uniShape(l);
  // the hall: a plinth, a storey of tall Gothic windows, buttresses between them, and a steep slate roof
  b.box(X0 - 0.15, B, Z0 - 0.15, X1 + 0.15, plinth, Z1 + 0.15, STONE_DARK);
  b.box(X0, plinth, Z0, X1, eave, Z1, STONE, { win: GOTHIC_WIN, seed: 13.7, top: LEAD });
  band(b, X0, Z0, X1, Z1, eave - 0.35, eave - 0.05, 0.2, STONE_TRIM);
  pitchedX(b, X0, Z0, X1, Z1, eave, ridge, 0.35, SLATE, STONE);
  for (let i = 1; i <= 3; i++) {
    const x = X0 + ((X1 - X0) * i) / 4;
    for (const [z, out] of [[Z1, 1], [Z0, -1]] as const) {
      b.box(x - 0.3, B, Math.min(z, z + out * 0.6), x + 0.3, eave - 0.6, Math.max(z, z + out * 0.6), STONE_LIGHT);
      b.box(x - 0.24, eave - 0.6, Math.min(z, z + out * 0.35), x + 0.24, eave - 0.2, Math.max(z, z + out * 0.35), STONE_TRIM);
    }
  }
  for (const x of [X0 + (X1 - X0) * 0.25, X0 + (X1 - X0) * 0.75]) gargoyle(b, x, eave - 0.6, Z1 + 0.3, Math.PI / 2, 0.8);
  // a small flèche on the ridge
  b.cyl((X0 + X1) / 2, zc, eave + ridge - 0.2, l.top + 1.2, 0.5, 0.03, 4, LEAD, { cap: false, phase: Math.PI / 4 });

  // the front, its gable to the east over the quad: buttresses with pinnacles, the door, the name, a great window
  for (const z of [Z0 - 0.25, Z1 + 0.25]) {
    b.box(X1 - 0.3, B, z - 0.35, X1 + 0.55, eave - 0.2, z + 0.35, STONE_LIGHT);
    pinnacle(b, X1 + 0.12, z, eave - 0.2, 2.6, 0.3, STONE_TRIM);
  }
  b.box(X1, B, zc - 1.2, X1 + 0.3, B + 0.2, zc + 1.2, STONE_TRIM);
  opening(b, 'E', X1 + 0.03, zc, B + 0.2, 1.5, 1.4, DOORWAY, { win: interior(1.8) });
  plaque(k, 'civic-university', X1, plinth + 0.3, zc, 1, 0, 0.5, 6.2);
  opening(b, 'E', X1 + 0.03, zc, plinth + 0.85, 2.6, 2.4, GLASS_LIT, { win: interior(2.2) });
  for (const s of [-1, 1]) b.box(X1 + 0.03, plinth + 0.85, zc + s * 0.43 - 0.06, X1 + 0.1, plinth + 4.9, zc + s * 0.43 + 0.06, STONE_TRIM, { faces: 'ENS' });
  b.box(X1 + 0.03, plinth + 2.4, zc - 1.3, X1 + 0.1, plinth + 2.5, zc + 1.3, STONE_TRIM, { faces: 'ETB' });

  // the tower at the west end: a plinth, two storeys of windows, a belfry with lancets, battlements and pinnacles
  const t0 = l.x0 + 0.1, t1 = t0 + 4, u0 = zc - 2, u1 = zc + 2;
  b.box(t0 - 0.15, B, u0 - 0.15, t1 + 0.15, plinth, u1 + 0.15, STONE_DARK);
  b.box(t0, plinth, u0, t1, 24, u1, STONE, { win: GOTHIC_WIN, seed: 17.3 });
  band(b, t0, u0, t1, u1, 24, 24.3, 0.15, STONE_TRIM);
  b.box(t0 + 0.1, 24.3, u0 + 0.1, t1 - 0.1, 25.4, u1 - 0.1, STONE_LIGHT);
  for (const [f, plane, c] of [['S', u1 - 0.07, (t0 + t1) / 2], ['N', u0 + 0.07, (t0 + t1) / 2], ['E', t1 - 0.07, zc], ['W', t0 + 0.07, zc]] as const) {
    for (const s of [-0.7, 0.7]) opening(b, f, plane, c + s, 24.4, 0.55, 0.38, DARK, { win: interior(0.9) });
  }
  band(b, t0, u0, t1, u1, 25.4, 25.6, 0.15, STONE_TRIM);
  for (const [ax, az] of [[t0, u0], [t1, u0], [t1, u1], [t0, u1]]) pinnacle(b, ax, az, 25.6, 2.2, 0.24, STONE_TRIM);
  for (const s of [-0.9, 0.9]) {
    b.box((t0 + t1) / 2 + s - 0.3, 25.6, u0 - 0.15, (t0 + t1) / 2 + s + 0.3, l.top - 0.05, u0 + 0.2, STONE_TRIM);
    b.box((t0 + t1) / 2 + s - 0.3, 25.6, u1 - 0.2, (t0 + t1) / 2 + s + 0.3, l.top - 0.05, u1 + 0.15, STONE_TRIM);
    b.box(t0 - 0.15, 25.6, zc + s - 0.3, t0 + 0.2, l.top - 0.05, zc + s + 0.3, STONE_TRIM);
    b.box(t1 - 0.2, 25.6, zc + s - 0.3, t1 + 0.15, l.top - 0.05, zc + s + 0.3, STONE_TRIM);
  }
  // a clock on the tower's south face
  const clock: V3 = [(t0 + t1) / 2, 22, u1 + 0.04];
  roundel(b, clock, 0.9, 'S', 0xe8e0c8, { win: interior(1.6) });
  b.beam([clock[0], 22, u1 + 0.08], [clock[0] + 0.45, 22.2, u1 + 0.08], 0.04, 0.04, DARK);
  b.beam([clock[0], 22, u1 + 0.08], [clock[0] - 0.1, 22.65, u1 + 0.08], 0.04, 0.04, DARK);

  // the stair down the Crown's wall to the quad: a landing level with the Crown, and steps down to the south along the wall
  const sx0 = CROWN_E + 0.02, sx1 = CROWN_E + 1.8, top = B, foot = Y.upper, n = 11, land0 = l.z0 + 0.2, land1 = l.z0 + 2;
  const rise = (top - foot) / (n + 1), tread = 0.8;
  b.box(sx0, foot, land0, sx1, top, land1, STONE_LIGHT, { top: STONE_TRIM });
  for (let i = 0; i < n; i++) b.box(sx0, foot, land1 + i * tread, sx1, top - (i + 1) * rise, land1 + (i + 1) * tread, STONE_LIGHT, { top: STONE_TRIM });
  b.box(sx1 - 0.24, top, land0, sx1, top + 0.9, land1, STONE_TRIM, { faces: 'NESWT' });
  b.box(sx0, top, land0, sx1 - 0.24, top + 0.9, land0 + 0.24, STONE_TRIM, { faces: 'NESWT' });
  slab(b, [sx1 - 0.12, top + 0.9, land1], [sx1 - 0.12, foot + 0.9 + rise, land1 + n * tread], 0.12, 0.9, STONE_TRIM);
  postLamp(k, sx1 - 0.12, land1 + n * tread + 0.4, foot, 3.0);

  k.lights.push({ x: X1 + 3, z: zc, r: 9, color: AMBER, k: 0.45 });
};

/** The quad's numbers: the maize patch at its east end, and the scarecrow's post in it. */
function quadShape(l: Lot) {
  const y = l.base + 0.04, path = l.base + 0.075, cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2;
  const maize = { x0: l.x1 - 4.1, x1: l.x1 - 0.6, z0: cz - 5.2, z1: cz - 0.8 };
  const post: [number, number] = [(maize.x0 + maize.x1) / 2 + 0.2, (maize.z0 + maize.z1) / 2];
  return { y, path, cx, cz, maize, post };
}

/** A scarecrow on its post, looking the way `yaw` says. */
function scarecrow(b: GeoBuilder, x: number, z: number, y: number, yaw: number): void {
  const COAT = 0x6a5a3a, SACK = 0xb09a6a, HAT = 0x3b3227, STRAW = 0xd8c06a;
  b.beam([x, y, z], [x, y + 2.7, z], 0.08, 0.07, TIMBER);
  b.moved(x, y, z, yaw, () => {
    b.beam([0, 2.05, -0.95], [0, 2.05, 0.95], 0.06, 0.06, TIMBER);
    b.box(-0.2, 1.15, -0.36, 0.2, 2.15, 0.36, COAT);
    for (const s of [-1, 1]) {
      b.box(-0.15, 1.9, s * 0.36, 0.15, 2.18, s * 0.95, COAT, { faces: 'NESWTB' });
      face3(b, [0, 1.9, s * 0.95], [0, 2.18, s * 0.95], [0, 1.75, s * 1.12], [0, 0, s], STRAW);
      b.box(-0.12, 0.6, s * 0.16 - 0.12, 0.12, 1.15, s * 0.16 + 0.12, 0x3f4a5a, { faces: 'NESWB' });
      face3(b, [0.05, 0.6, s * 0.16 - 0.1], [0.05, 0.6, s * 0.16 + 0.1], [0.05, 0.42, s * 0.16], [1, 0, 0], STRAW);
    }
    b.box(-0.24, 2.15, -0.24, 0.24, 2.62, 0.24, SACK);
    b.box(0.24, 2.36, -0.14, 0.25, 2.44, -0.04, DARK, { faces: 'E' });
    b.box(0.24, 2.36, 0.04, 0.25, 2.44, 0.14, DARK, { faces: 'E' });
    b.cyl(0, 0, 2.58, 2.68, 0.6, 0.48, 8, HAT, { cap: HAT });
    b.cyl(0, 0, 2.68, 3.0, 0.27, 0.2, 6, HAT, { cap: HAT });
    // a crow on the crossbar
    b.box(-0.12, 2.11, 0.62, 0.12, 2.3, 0.78, 0x18181c, { faces: 'NESWTB' });
    b.box(0.08, 2.24, 0.65, 0.22, 2.36, 0.75, 0x18181c, { faces: 'NESWT' });
  });
}

const quad: Model = (k, l) => {
  const b = k.b, { y, path, cx, cz, maize, post } = quadShape(l);
  const x0 = l.x0 + 0.3, x1 = l.x1 - 0.3, z0 = l.z0 + 0.3, z1 = l.z1 - 0.3;
  flat(k.street, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], y, QUAD_LAWN, { win: { cell: 0, storey: 1, lit: 0, kind: 1 } });
  // the paths: one from north to south, and one from the stair in the west to the middle
  const w = 0.7, ez = cz - 3, east = maize.x0 - 1;
  flat(k.street, [[cx - w, z0], [cx + w, z0], [cx + w, ez - w], [east, ez - w], [east, ez + w], [cx + w, ez + w], [cx + w, z1], [cx - w, z1], [cx - w, ez + w], [x0, ez + w], [x0, ez - w], [cx - w, ez - w]], path, GRAVEL, { win: { cell: 0, storey: 1, lit: 0, kind: 1 } });
  // the patch of maize, and the scarecrow on his post in it
  flat(k.street, [[maize.x0, maize.z0], [maize.x1, maize.z0], [maize.x1, maize.z1], [maize.x0, maize.z1]], path, EARTH, { win: { cell: 0, storey: 1, lit: 0, kind: 1 } });
  const r = rng(0x5ca7e);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const sx = maize.x0 + 0.5 + i * 0.85 + (r() - 0.5) * 0.25, sz = maize.z0 + 0.5 + j * 1.08 + (r() - 0.5) * 0.25;
    if (Math.hypot(sx - post[0], sz - post[1]) < 0.9) continue;
    const h = 1.5 + r() * 0.5, a = r() * Math.PI;
    b.cyl(sx, sz, path, path + h, 0.07, 0.03, 3, 0x8a9a4a, { cap: false });
    const lx = Math.cos(a) * 0.55, lz = Math.sin(a) * 0.55;
    for (const s of [-1, 1]) {
      face3(b, [sx, path + h * 0.5, sz], [sx, path + h * 0.62, sz], [sx + s * lx, path + h * 0.45, sz + s * lz], [-s * lz, 0, s * lx], 0x7f9445);
      face3(b, [sx, path + h * 0.5, sz], [sx, path + h * 0.62, sz], [sx + s * lx, path + h * 0.45, sz + s * lz], [s * lz, 0, -s * lx], 0x7f9445);
    }
    b.cyl(sx, sz, path + h, path + h + 0.25, 0.08, 0.01, 3, 0xc9b25a, { cap: false });
  }
  scarecrow(b, post[0], post[1], path, Math.PI / 4);
};

// ---------------------------------------------------------------------------
// The models, the signs and the places
// ---------------------------------------------------------------------------

export const MODELS: Record<string, Model> = { gcpd, 'city-hall': cityHall, library, courthouse, university, quad };

/** Lots that are built as part of another lot's model or by `extras`, and so get no box either. */
export const COVERS: string[] = [];

/** Plain lettering on a board, or cut in a band of stone. */
const lettering = (id: string, text: string, color: string, ink: string, px = 48): SignDef => {
  const aspect = Math.max(2.2, text.length * 0.64);
  return { id, lines: [text], color, ink, aspect, kind: 'board', size: [Math.round(aspect * px), px] };
};

/** Every sign this file hangs. Each id begins with `civic-`. */
export const SIGNS: SignDef[] = [
  lettering('civic-gcpd', 'G.C.P.D.', '#1d1f24', '#e9e2cf', 52),
  lettering('civic-police', 'POLICE', '#c4ecc8', '#18301c', 32),
  lettering('civic-city-hall', 'CITY HALL', '#6b6b66', '#f1ebda', 44),
  lettering('civic-library', 'PUBLIC LIBRARY', '#2f323a', '#e9e2cf', 44),
  lettering('civic-courthouse', 'COURTHOUSE', '#6b6b66', '#f1ebda', 44),
  lettering('civic-university', 'GOTHAM UNIVERSITY', '#1d1f24', '#e9e2cf', 40),
  lettering('civic-pinkney', 'PINKNEY STEPS', '#1d1f24', '#d9cfae', 36),
  lettering('civic-news', 'LATE EDITION', '#1e3a2c', '#f2e7c0', 32),
];

/** The Pinkney Steps: two flights against the east wall, from the quay up to the rim, with a landing between. */
const STAIR = (() => {
  const x0 = RIM_E, x1 = RIM_E + 4.5, xm = RIM_E + 2.3, z0 = 41, z1 = 57, land = 43.2, head = 54.8, mid = Y.upper / 2;
  return { x0, x1, xm, z0, z1, land, head, mid };
})();

function places(): Record<string, Place> {
  const g = lotOf('gcpd'), gs = gcpdShape(g), h = lotOf('city-hall'), hs = hallShape(h);
  const lib = lotOf('library'), ls = libraryShape(lib), c = lotOf('courthouse'), cs = courtShape(c);
  const u = lotOf('university'), us = uniShape(u), q = lotOf('quad'), qs = quadShape(q);
  const S = Math.PI / 2, SE = Math.PI / 4;
  const out: Record<string, Place> = {
    roofDoor: { x: gs.doorX, y: g.top, z: gs.hut.z1 + 0.8, h: S },
    gordon: { x: LAMP_X - 1.4, y: g.top, z: LAMP_Z - 1.4, h: SE },
    gcpdDoor: { x: gs.porch + 1.1, y: g.base, z: gs.zc, h: 0 },
    courtSteps: { x: cs.cx, y: cs.floor - 0.8, z: cs.stepsFrom + cs.tread * 1.5, h: S },
    courtDoor: { x: cs.cx, y: cs.floor, z: cs.face + 0.6, h: S },
    librarySteps: { x: ls.cx + 2, y: ls.landing - ls.rise, z: ls.stepsFrom + ls.tread * 0.55, h: S },
    libraryDoor: { x: ls.cx, y: ls.landing, z: ls.face + 0.45, h: S },
    cityHallDoor: { x: hs.X1 + 0.9, y: hs.floor, z: hs.zc, h: 0 },
    scarecrowPost: { x: qs.maize.x0 - 0.5, y: qs.y, z: qs.maize.z1 + 0.5, h: SE },
    quadMiddle: { x: qs.cx, y: qs.path, z: qs.cz - 3, h: S },
    uniDoor: { x: us.X1 + 0.8, y: u.base, z: us.zc, h: 0 },
  };
  // the roll-call along the police roof's south parapet, 1.8 apart, facing south
  for (let i = 0; i < 7; i++) out[`roll${i}`] = { x: (g.x0 + g.x1) / 2 - 5.4 + i * 1.8, y: g.top, z: g.z1 - 1.1, h: S };
  return out;
}

/** Places on what this file builds that the show needs as built: its task names them. */
export const PLACES: Record<string, Place> = places();

// ---------------------------------------------------------------------------
// What is not one of the lots: the rims and the east wall, the Pinkney Steps, the rim road's furniture
// ---------------------------------------------------------------------------

/** The upper city's east wall, which faces the quays: a blind arcade with lamps, buttresses, two gargoyles, and a coping. */
function eastWall(k: Build): void {
  const b = k.b, x = RIM_E, top = Y.upper, z0 = RIM_N + 0.5, z1 = STAIR.z0 - 0.3, bays = 7, bay = (z1 - z0) / bays;
  b.box(x, top - 0.5, RIM_N, x + 0.25, top, STAIR.z0, STONE_TRIM, { faces: 'NESWTB' });
  b.box(x, 0, RIM_N, x + 0.2, 1.2, STAIR.z0, STONE_DARK, { faces: 'NEST' });
  for (let i = 0; i <= bays; i++) {
    const z = z0 + i * bay;
    if (i % 3 === 0) {
      // a buttress, with a set-off
      b.box(x, 0, z - 0.45, x + 0.9, 5.6, z + 0.45, STONE_LIGHT);
      slab(b, [x + 0.9, 5.6, z], [x + 0.1, 7.3, z], 0.45, 0.6, STONE_TRIM);
    } else b.box(x, 0, z - 0.3, x + 0.3, top - 0.5, z + 0.3, STONE_LIGHT, { faces: 'NEST' });
    if (i === bays) break;
    // the arch over the bay, and the darker panel under it
    const zc = z + bay / 2, r = bay / 2 - 0.3, spring = 4.6;
    const ring: V3[] = Array.from({ length: 7 }, (_, j): V3 => { const a = Math.PI * (j / 6); return [x + 0.16, spring + Math.sin(a) * r, zc - Math.cos(a) * r]; });
    b.sweep(ring, ring.map(() => 0.15), STONE_TRIM);
    opening(b, 'E', x + 0.03, zc, 1.2, r * 2 - 0.1, spring - 1.2, STONE_DARK, {}, false);
    if (i % 2 === 1) {
      b.beam([x, 3.9, zc], [x + 0.7, 3.9, zc], 0.06, 0.06, IRON_DARK);
      gasLamp(k, x + 0.75, 3.9, zc, 0);
    }
  }
  // two gargoyles on corbels under the rim, looking out over the quays
  for (const i of [1.5, 4.5]) {
    const z = z0 + i * bay;
    b.box(x, top - 1.3, z - 0.35, x + 0.7, top - 0.5, z + 0.35, STONE_TRIM, { faces: 'NESWB' });
    gargoyle(b, x + 0.35, top - 0.5, z, 0, 0.85);
  }
}

/** The Pinkney Steps, from the quay up to the rim beside the turning ring: two flights along the wall and a landing between. */
function pinkneySteps(k: Build): void {
  const b = k.b, S = STAIR, n = 9, top = Y.upper, mid = S.mid, rail = 0.95, t = 0.24;
  // the landing at the north end, half-way up, on solid stone
  b.box(S.x0 + 0.02, 0, S.z0, S.x1, mid, S.land, STONE_LIGHT, { top: STONE_TRIM });
  // the first flight, on the quay side, up to the north
  const runA = (S.z1 - S.land) / n;
  for (let i = 0; i < n; i++) b.box(S.xm + 0.02, 0, S.z1 - (i + 1) * runA, S.x1, (mid * (i + 1)) / (n + 1), S.z1 - i * runA, STONE_LIGHT, { top: STONE_TRIM });
  // the second flight, against the wall, up to the south, and the head of the stair level with the rim
  const runB = (S.head - S.land) / n;
  for (let i = 0; i < n; i++) b.box(S.x0 + 0.02, 0, S.land + i * runB, S.xm, mid + ((top - mid) * (i + 1)) / (n + 1), S.land + (i + 1) * runB, STONE_LIGHT, { top: STONE_TRIM });
  b.box(S.x0 + 0.02, 0, S.head, S.xm, top, S.z1, STONE_LIGHT, { top: STONE_TRIM });
  // the parapets: along each flight's open side, round the landing and round the head
  slab(b, [S.x1 - t / 2, rail, S.z1], [S.x1 - t / 2, mid + rail, S.land], t / 2, rail, STONE_TRIM);
  slab(b, [S.xm - t / 2, mid + rail, S.land], [S.xm - t / 2, top + rail, S.head], t / 2, rail, STONE_TRIM);
  b.box(S.x0 + 0.02, mid, S.z0, S.x1, mid + rail, S.z0 + t, STONE_TRIM, { faces: 'NESWT' });
  b.box(S.x1 - t, mid, S.z0 + t, S.x1, mid + rail, S.land, STONE_TRIM, { faces: 'NESWT' });
  b.box(S.xm - t, top, S.head, S.xm, top + rail, S.z1, STONE_TRIM, { faces: 'NESWT' });
  b.box(S.x0 + 0.02, top, S.z1 - t, S.xm - t, top + rail, S.z1, STONE_TRIM, { faces: 'NESWT' });
  // its name on the landing's face, and its lamps
  plaque(k, 'civic-pinkney', S.x1, mid - 1.6, (S.z0 + S.land) / 2, 1, 0, 0.42, 3.4);
  postLamp(k, S.x1 - t / 2, S.z0 + t / 2, mid + rail, 1.3);
  postLamp(k, S.x1 - t / 2, S.z1 - 0.15, rail, 1.6);
  postLamp(k, S.xm - t / 2, S.z1 - 0.15, top + rail, 1.3);
  k.person(S.x1 - 1.2, S.z0 + 1.4, mid);
  k.person((S.xm + S.x1) / 2, S.z1 - 4.5 * runA, (mid * 5) / (n + 1));
}

/** A newsstand: a green kiosk with a lit sign and the late edition stacked before it. */
function newsstand(k: Build, x: number, z: number, y: number): void {
  const b = k.b, G = 0x2c5a40;
  b.box(x - 1.1, y, z - 0.6, x + 1.1, y + 2.0, z + 0.6, G);
  b.box(x - 1.3, y + 2.0, z - 0.8, x + 1.3, y + 2.15, z + 0.9, 0x1e3a2c, { faces: 'NESWTB' });
  b.box(x - 0.9, y + 0.9, z + 0.6, x + 0.9, y + 1.7, z + 0.62, 0xd9cfae, { faces: 'S', win: interior(1.6) });
  b.box(x - 1.0, y + 1.75, z + 0.62, x + 1.0, y + 1.98, z + 0.66, 0x1e3a2c, { faces: 'S' });
  k.sign('civic-news', x, y + 1.865, z + 0.69, 0, 1, 0.2, 1.9);
  for (const dx of [-0.6, 0.1]) b.box(x + dx, y, z + 0.66, x + dx + 0.45, y + 0.35, z + 0.98, 0xe9e2cf);
  k.lights.push({ x, z: z + 1.5, r: 5, color: AMBER, k: 0.4 });
}

/** Whether a street lamp of the engine's stands near a place. */
const lampNear = (k: Build, x: number, z: number, r: number): boolean => (k.lamps ?? []).some((p) => Math.hypot(p.x - x, p.z - z) < r);

/** Whatever is not one of the plan's lots. */
export function extras(k: Build): void {
  const b = k.b, U = Y.upper;
  // the balustrades along the south rim and the east rim, with a gap where the Pinkney Steps arrive
  balustrade(b, [[RIM_W, RIM_S - 0.25], [RIM_E - 0.25, RIM_S - 0.25]], U);
  balustrade(b, [[RIM_E - 0.25, RIM_N + 0.25], [RIM_E - 0.25, STAIR.head - 0.3]], U);
  b.box(RIM_E - 0.47, U, RIM_S - 0.47, RIM_E - 0.03, U + 1.2, RIM_S - 0.03, STONE_TRIM);
  for (let x = RIM_W + 6; x < RIM_E - 6; x += 12) gasLamp(k, x, U + 3.4, RIM_S - 0.25, 2.2);
  for (const z of [RIM_N + 4, 21, 30, 38]) postLamp(k, RIM_E - 0.9, z, U, 3.2);
  eastWall(k);
  pinkneySteps(k);

  // the lanes between the buildings: police cars, a newsstand, benches, lamps, and people
  const g = lotOf('gcpd'), lib = lotOf('library'), ct = lotOf('courthouse'), h = lotOf('city-hall'), q = lotOf('quad');
  const laneX = (g.x1 + h.x0) / 2;
  standingCar(k, laneX, lib.z1 - 3.6, Math.PI / 2, { body: 0x1d2633, top: 0xdfe3e8, beacon: '#2a6bff', y: U });
  standingCar(k, laneX, g.z0 + 1.4, -Math.PI / 2, { body: 0x1d2633, top: 0xdfe3e8, beacon: '#ff2a2a', y: U });
  const nz = lib.z1 + 1.9;
  if (!lampNear(k, laneX, nz, 1.8)) newsstand(k, laneX, nz, U);
  postLamp(k, laneX, (g.z1 + lib.z0) / 2, U, 3.2);
  postLamp(k, laneX - 1.3, q.z1 + 2, U, 3.2);
  for (const z of [ct.z0 + 3, ct.z0 + 9]) bench(b, RIM_E - 1.4, z, U, false);
  bench(b, (q.x0 + q.x1) / 2 - 3, q.z1 + 2.2, U, true);
  const people: [number, number, number][] = [
    [laneX + 1.0, g.z0 + 5.2, U], [laneX + 1.3, g.z0 + 8.8, U], [laneX - 0.9, lib.z0 + 2, U],
    [RIM_E - 1.4, ct.z0 + 6, U], [RIM_E - 1.2, h.z0 + 2.5, U], [(q.x0 + q.x1) / 2 - 2.2, q.z1 + 2.8, U],
    [laneX + 0.6, nz - 1.0, U], [STAIR.x1 + 1.0, STAIR.z1 + 1.2, 0],
  ];
  for (const [px, pz, py] of people) k.person(px, pz, py);

}

