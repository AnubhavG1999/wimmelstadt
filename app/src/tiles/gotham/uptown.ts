// Uptown, where the east bank's levels meet: River Street's terrace and its two
// walls, Amusement Mile on the terrace's east end, the Bowery's taverns
// climbing Kane Street's ramp, Otisburg's brick rows, and under the terrace's
// north wall the wharf and the goods yard beneath the Kane Bridge.
//
// What joins the levels is what this file is for: public stairs down the
// terrace's south wall between the towers, a balustrade on each rim, arches in
// the walls, a stair and a gate from Kane Street's sidewalk up to the
// fairground, a plank across the roofs and a covered bridge to the Bowery.
//
// Everything on Amusement Mile is the tile's own drawing: no real fairground's
// rides and no film's. The comics give the place (a promontory of nickelodeons
// and an amusement park gone to ruin, Haly's Circus there since the New 52),
// the Bowery (taverns that criminals use) and Otisburg (a residential district
// by the Trigate). Noonan's (Hitman) and Finnigan's (Gotham Central) are the
// comics' own Gotham bars.

import * as THREE from 'three';
import { GeoBuilder, interior, rng, type V3, type WinSpec } from '../../engine/geo';
import { roundel } from '../../engine/parts';
import { drum, face3, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import {
  AMBER, BRASS, BRICK, BRICK_DARK, BRICK_RED, DARK, GLASS, IRON, IRON_DARK, LEAD, NEON_CYAN, NEON_GREEN, NEON_MAGENTA, NEON_RED, NEON_YELLOW,
  RUST, SLATE, SODIUM, STEEL, STONE, STONE_DARK, STONE_LIGHT, STONE_TRIM, TENEMENT_WIN, SMALL_WIN, TIMBER, TIMBER_DARK, TIMBER_PALE,
  balustrade, fireEscape, gargoyle, gasLamp, nameBoard, nameSign, neon, waterTank,
} from './look';
import type { Model, Place } from './models';
import { CIRCUIT, EL, KANE_ST, Y, kaneRamp, lotOf, type Lot } from './plan';
import { open } from './space';

const TAU = Math.PI * 2;
/** Houses' windows: plain sashes, a storey apart. */
const HOUSE_WIN: WinSpec = { cell: 2.3, storey: 4, lit: 0.72, kind: 0 };
/** A gymnasium's big windows. */
const GYM_WIN: WinSpec = { cell: 1.8, storey: 4, lit: 0.95, kind: 1 };
/** Faded fairground paint. */
const FADED = [0x9a5a4c, 0x5f8486, 0xb59a5a, 0x6c6a94, 0x8c4f62];
/** Bulbs, warm and coloured. */
const BULBS = ['#ffd27a', '#ff6a5a', '#ffd27a', '#7fe0ff', '#ffd27a', '#ff8ad8'];

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------

const neonDef = (id: string, text: string, color: string, px = 40): SignDef => {
  const aspect = Math.max(1.6, text.length * 0.62);
  return { id, lines: [text], color, aspect, size: [Math.round(aspect * px), px] };
};
const boardDef = (id: string, lines: string[], color: string, ink: string, px = 44): SignDef => {
  const aspect = Math.max(1.6, Math.max(...lines.map((s) => s.length)) * 0.6 / lines.length);
  return { id, lines, color, ink, aspect, kind: 'board', size: [Math.round(aspect * px), px] };
};

/** Every sign this file hangs. Each id begins with `uptown-`. */
export const SIGNS: SignDef[] = [
  { id: 'uptown-mile', lines: ['AMUSEMENT', 'MILE'], color: NEON_YELLOW, aspect: 2.9, size: [174, 60] },
  nameSign('uptown-bowery', 'The Bowery'),
  nameSign('uptown-otisburg', 'Otisburg'),
  boardDef('uptown-halys', ["HALY'S CIRCUS"], '#7a1f22', '#f1dca2'),
  boardDef('uptown-nickel', ['NICKELODEON'], '#5c6f6a', '#e9d9a8'),
  boardDef('uptown-funhouse', ['FUN HOUSE'], '#6a3f52', '#f0d27a', 36),
  boardDef('uptown-arcade', ['PENNY ARCADE'], '#4f5b74', '#ecdcae', 36),
  boardDef('uptown-strength', ['TEST YOUR', 'STRENGTH'], '#1c1c20', '#ff4a5a', 48),
  boardDef('uptown-coaster', ['ROLLER COASTER'], '#3f5a50', '#f2e2b2', 36),
  boardDef('uptown-hoopla', ['HOOPLA'], '#7a5a2a', '#f6e7b8', 32),
  boardDef('uptown-poster', ['CIRCUS', 'TONIGHT'], '#a8343a', '#ffe08a', 48),
  neonDef('uptown-noonans', "NOONAN'S", NEON_RED),
  neonDef('uptown-finnigans', "FINNIGAN'S", NEON_GREEN),
  neonDef('uptown-bar', 'BAR', NEON_MAGENTA, 32),
  neonDef('uptown-pool', 'POOL', NEON_CYAN, 32),
  { id: 'uptown-tavern', lines: ['TAVERN'], color: NEON_RED, vertical: true, aspect: 0.24, size: [26, 108] },
  boardDef('uptown-pawn', ['PAWN', 'LOANS'], '#2a2622', '#e2c25a', 44),
  boardDef('uptown-gym', ['BOXING GYM'], '#26292f', '#e8e2d0', 32),
  boardDef('uptown-grocery', ['GROCERY'], '#3d5a3a', '#f1e6c6', 32),
  boardDef('uptown-coffee', ['COFFEE'], '#5a3a2a', '#f1e6c6', 32),
  boardDef('uptown-coal', ['COAL & COKE'], '#222326', '#e6dcc4', 32),
  boardDef('uptown-locksmith', ['LOCKSMITH'], '#2c3038', '#e6dcc4', 30),
  boardDef('uptown-forge', ['FORGE'], '#3a2a22', '#f0c07a', 30),
];
const ASPECT = new Map(SIGNS.map((s) => [s.id, s.aspect]));

/** A sign on a wall or a board, `nx, nz` the way it faces, on a thin dark board a hair behind it. */
function hang(k: Build, id: string, x: number, y: number, z: number, nx: number, nz: number, h: number, maxW = Infinity): number {
  const w = k.sign(id, x + nx * 0.04, y, z + nz * 0.04, nx, nz, h, maxW);
  const hh = Math.min(h, w / (ASPECT.get(id) ?? 1));
  k.b.obox(x - nx * 0.02, y, z - nz * 0.02, 0.03, hh / 2 + 0.08, w / 2 + 0.1, Math.atan2(nz, nx), DARK, { faces: 'B' });
  return w;
}

/** A sign that hangs in the air: one each way, back to back on a dark board. */
function hangBoth(k: Build, id: string, x: number, y: number, z: number, nx: number, nz: number, h: number, maxW = Infinity): number {
  const w = k.sign(id, x + nx * 0.08, y, z + nz * 0.08, nx, nz, h, maxW);
  k.sign(id, x - nx * 0.08, y, z - nz * 0.08, -nx, -nz, h, maxW);
  const hh = Math.min(h, w / (ASPECT.get(id) ?? 1));
  k.b.obox(x, y, z, 0.05, hh / 2 + 0.08, w / 2 + 0.1, Math.atan2(nz, nx), DARK, { faces: 'B' });
  return w;
}

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

/** A box with every face, for whatever is seen from below as well. */
const solid = (k: Build, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number, faces = 'NESWTB', win?: WinSpec): void =>
  k.b.box(x0, y0, z0, x1, y1, z1, c, { faces, ...(win ? { win } : {}) });

/** Bulbs along a line that sags in the middle: glows, dim by day and bright by night. */
function bulbs(k: Build, a: V3, c: V3, n: number, sag = 0, size = 0.16, colors = BULBS): void {
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    k.glows.push({ x: a[0] + (c[0] - a[0]) * t, y: a[1] + (c[1] - a[1]) * t - sag * 4 * t * (1 - t), z: a[2] + (c[2] - a[2]) * t, sx: size, sy: size, sz: size, color: colors[i % colors.length] });
  }
}

/** A wire that the bulbs hang from, as a thin dark bar. */
const wire = (k: Build, a: V3, c: V3): void => k.b.beam(a, c, 0.03, 0.03, IRON_DARK);

/**
 * An arch built against a wall that faces `dir` along z (1 south, -1 north): two pilasters, a lintel, and an
 * arched panel between them that is lit (a workshop), dark (an open way) or bricked up.
 */
function wallArch(k: Build, cx: number, zw: number, dir: 1 | -1, kind: 'lit' | 'dark' | 'brick', w = 2.1, sign?: string): void {
  const b = k.b, out = (d: number): [number, number] => (dir > 0 ? [zw, zw + d] : [zw - d, zw]);
  const face = dir > 0 ? 'S' : 'N';
  for (const s of [-1, 1]) {
    const [z0, z1] = out(0.3);
    b.box(cx + s * (w / 2 + 0.25) - 0.25, 0, z0, cx + s * (w / 2 + 0.25) + 0.25, 4.6, z1, STONE_LIGHT, { faces: face + 'EWT' });
  }
  const [h0, h1] = out(0.38);
  b.box(cx - w / 2 - 0.55, 4.6, h0, cx + w / 2 + 0.55, 5.2, h1, STONE_TRIM, { faces: face + 'EWTB' });
  const colour = kind === 'lit' ? 0x4a3420 : kind === 'brick' ? BRICK_DARK : DARK;
  const win = kind === 'lit' ? interior(2.6) : kind === 'dark' ? interior(0.6) : undefined;
  const [p0, p1] = out(0.06);
  b.box(cx - w / 2, 0, p0, cx + w / 2, 3.5, p1, colour, { faces: face, ...(win ? { win } : {}) });
  roundel(b, [cx, 3.5, zw + dir * 0.065], w / 2, face, colour, win ? { win } : {}, 8);
  if (kind === 'lit') {
    k.glows.push({ x: cx, y: 4.25, z: zw + dir * 0.45, sx: 0.3, sy: 0.22, sz: 0.25, color: SODIUM });
    k.lights.push({ x: cx, z: zw + dir * 2.5, r: 6, color: AMBER, k: 0.45 });
  }
  if (sign) hang(k, sign, cx, 4.9, zw + dir * 0.4, 0, dir, 0.42, w + 0.9);
}

/** A rail on posts that climbs from one place to another: an iron handrail. */
function rail(k: Build, pts: V3[], h = 0.95, posts = true): void {
  const top = pts.map((p): V3 => [p[0], p[1] + h, p[2]]);
  k.b.sweep(top, top.map(() => 0.06), IRON);
  if (posts) for (const p of pts) k.b.beam(p, [p[0], p[1] + h, p[2]], 0.06, 0.06, IRON);
}

/** A person, where there is room. */
function folk(k: Build, x: number, z: number, y: number, own: string[] = [], room = 0.3): void {
  if (open(x, z, room, own)) k.person(x, z, y);
}

/** A small timber barrel standing on `y`. */
const barrel = (k: Build, x: number, z: number, y = 0): void => k.b.cyl(x, z, y, y + 0.95, 0.38, 0.38, 6, TIMBER, { cap: TIMBER_DARK });

// ---------------------------------------------------------------------------
// Amusement Mile
// ---------------------------------------------------------------------------

/** The big wheel: its middle, how high its hub is over the terrace, its radius, and how fast it turns. */
const WHEEL = { x: 97, z: -36, up: 12.6, r: 10, spin: 0.07 };
/** The roller coaster's two lines along the lot's east edge: the lift hill going north, the return coming south. */
const COASTER = { a: 100.7, b: 103.2 };

/**
 * The big wheel: a mesh of its own that turns, its rims and spokes lit with
 * bulbs, and a second mesh of eight gondolas that hang level as it goes round.
 * Its frame, a pair of A-frames, stands still.
 */
function bigWheel(k: Build, G: number): void {
  const W = WHEEL, hub: V3 = [W.x, G + W.up, W.z], R = W.r;
  const wb = new GeoBuilder();
  const RIM = 0xe6d6ae, SPOKE = 0xd2cab8;
  for (const s of [-1.1, 1.1]) {
    // the rim, a bar from each corner to the next: a swept ring would twist where it turns upright
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU, c = ((i + 1) / 16) * TAU;
      wb.beam([s, R * Math.cos(a), R * Math.sin(a)], [s, R * Math.cos(c), R * Math.sin(c)], 0.15, 0.15, RIM, { win: interior(1.8) });
    }
    for (let i = 0; i < 8; i++) {
      const a = ((i + 0.5) / 8) * TAU;
      wb.beam([s * 0.7, 0, 0], [s, R * Math.cos(a), R * Math.sin(a)], 0.09, 0.07, SPOKE, { win: interior(1.3) });
    }
  }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; wb.beam([-1.15, R * Math.cos(a), R * Math.sin(a)], [1.15, R * Math.cos(a), R * Math.sin(a)], 0.09, 0.09, STEEL); }
  drum(wb, [0, 0, 0], 0.8, 1.25, 0x8f8a7e, { cap: 0xc9a548 });
  const wheel = new THREE.Mesh(wb.build(), k.mat.city());
  wheel.position.set(hub[0], hub[1], hub[2]);
  wheel.name = 'uptown-wheel';
  k.group.add(wheel);

  // the gondolas, each built hanging from its pin at the origin; they are moved to their pins on every frame
  const gb = new GeoBuilder(), ranges: [number, number][] = [];
  const paint = [0xb24a3e, 0x3e7d86, 0xc9a548, 0x5a6aa8];
  for (let i = 0; i < 8; i++) {
    const v0 = gb.triangles * 3;
    gb.beam([0, 0, 0], [0, -0.48, 0], 0.06, 0.06, IRON);
    gb.box(-0.7, -1.7, -0.58, 0.7, -0.62, 0.58, paint[i % paint.length], { faces: 'NESWTB', win: interior(0.7) });
    gb.box(-0.82, -0.62, -0.7, 0.82, -0.46, 0.7, 0xe9dcc0, { faces: 'NESWTB' });
    ranges.push([v0, gb.triangles * 3]);
  }
  const geo = gb.build(), pos = geo.getAttribute('position') as THREE.BufferAttribute, base = Float32Array.from(pos.array as Float32Array);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), R + 3);
  const cars = new THREE.Mesh(geo, k.mat.city());
  cars.position.set(hub[0], hub[1], hub[2]);
  cars.name = 'uptown-gondolas';
  k.group.add(cars);
  let turn = 0;
  const place = (): void => {
    const arr = pos.array as Float32Array;
    ranges.forEach(([v0, v1], i) => {
      const a = (i / 8) * TAU + turn, py = R * Math.cos(a), pz = R * Math.sin(a);
      for (let v = v0; v < v1; v++) { arr[v * 3] = base[v * 3]; arr[v * 3 + 1] = base[v * 3 + 1] + py; arr[v * 3 + 2] = base[v * 3 + 2] + pz; }
    });
    pos.needsUpdate = true;
  };
  place();
  k.each((dt) => {
    turn = (turn + Math.min(0.2, Math.max(0, dt)) * W.spin) % TAU;
    wheel.rotation.x = turn;
    place();
  });

  // the frame: an A of steel each side, an axle between them, and a platform under the bottom car
  for (const s of [-1.75, 1.75]) {
    for (const dz of [-5.6, 5.6]) k.b.beam([W.x + s, G, W.z + dz], [W.x + s, hub[1] - 0.2, W.z], 0.22, 0.16, STEEL);
    k.b.beam([W.x + s, G + 4.5, W.z - 3.6], [W.x + s, G + 4.5, W.z + 3.6], 0.12, 0.12, STEEL);
  }
  k.b.beam([W.x - 1.9, hub[1], W.z], [W.x + 1.9, hub[1], W.z], 0.18, 0.18, IRON);
  solid(k, W.x - 1.3, G, W.z - 1.6, W.x + 1.3, G + 0.42, W.z + 1.6, TIMBER, 'NESWT');
  k.b.box(W.x - 0.6, G, W.z + 1.6, W.x + 0.6, G + 0.21, W.z + 2.1, TIMBER_PALE, { faces: 'NESWT' });
  // the hub's lamp, each side
  for (const s of [-1.35, 1.35]) k.glows.push({ x: W.x + s, y: hub[1], z: W.z, sx: 0.25, sy: 0.6, sz: 0.6, color: '#ffe6a8' });
  k.lights.push({ x: W.x, z: W.z, r: 12, color: AMBER, k: 0.55 });
}

/** The line the coaster runs, closed: up the lift hill, round at the north end, back over its humps and round at the station. */
function coasterLine(G: number): V3[] {
  const C = COASTER, m = (C.a + C.b) / 2, r = (C.b - C.a) / 2;
  const north = -47.6, south = -28.4;
  const lift: [number, number][] = [[south, 1.6], [-31, 1.6], [-32.4, 2.6], [-43.6, 15.2], [-44.6, 16], [north, 16]];
  const back: [number, number][] = [[-46.6, 15.3], [-41.8, 3.0], [-40.4, 2.6], [-38.2, 8.0], [-36.6, 8.6], [-34.6, 4.0], [-33.2, 2.4], [-31.4, 1.6], [south, 1.6]];
  const pts: V3[] = lift.map(([z, h]): V3 => [C.a, G + h, z]);
  for (let i = 1; i < 6; i++) { const a = Math.PI + (i * Math.PI) / 6; pts.push([m + r * Math.cos(a), G + 16, north + r * Math.sin(a)]); }
  pts.push([C.b, G + 16, north]);
  for (const [z, h] of back) pts.push([C.b, G + h, z]);
  for (let i = 1; i < 6; i++) { const a = (i * Math.PI) / 6; pts.push([m + r * Math.cos(a), G + 1.6, south + r * Math.sin(a)]); }
  pts.push(pts[0]);
  return pts;
}

/** How high a line of the coaster is at a place along z: the lift hill's line or the return's. */
function lineHeight(line: V3[], x: number, z: number): number {
  const on = line.filter((p) => Math.abs(p[0] - x) < 0.01);
  for (let i = 0; i + 1 < on.length; i++) {
    const a = on[i], c = on[i + 1];
    if ((z - a[2]) * (z - c[2]) <= 0 && a[2] !== c[2]) return a[1] + ((c[1] - a[1]) * (z - a[2])) / (c[2] - a[2]);
  }
  return on.length ? on.reduce((best, p) => (Math.abs(p[2] - z) < Math.abs(best[2] - z) ? p : best))[1] : 0;
}

/** The wooden roller coaster along the lot's east edge, on a timber trestle, with its station and a car at the top of the lift hill. */
function coaster(k: Build, G: number): void {
  const b = k.b, C = COASTER, line = coasterLine(G);
  // the track: a bed of planks and a pale rail along it
  b.sweep(line.map((p): V3 => [p[0], p[1] - 0.16, p[2]]), line.map(() => 0.3), TIMBER_PALE);
  b.sweep(line.map((p): V3 => [p[0], p[1] + 0.18, p[2]]), line.map(() => 0.09), 0xc2c6cc);
  // the trestle: a bent every 2.2, a post under each line, a cap beam and a brace
  for (let z = -48.2; z <= -28.3; z += 2.2) {
    const ha = lineHeight(line, C.a, z) - G, hb = lineHeight(line, C.b, z) - G;
    const lo = Math.min(ha, hb);
    for (const [x, h] of [[C.a, ha], [C.b, hb]]) if (h > 0.7) b.box(x - 0.17, G, z - 0.17, x + 0.17, G + h - 0.42, z + 0.17, 0x8a6a4a, { faces: 'NESW' });
    if (lo > 2.2) {
      b.box(C.a - 0.25, G + lo - 0.9, z - 0.12, C.b + 0.25, G + lo - 0.6, z + 0.12, TIMBER, { faces: 'NSTB' });
      b.beam([C.a, G + 0.3, z], [C.b, G + lo - 0.9, z], 0.09, 0.09, TIMBER);
    }
    const hi = Math.max(ha, hb);
    if (hi - lo > 4) b.box(C.a - 0.25, G + (lo + hi) / 2, z - 0.12, C.b + 0.25, G + (lo + hi) / 2 + 0.25, z + 0.12, TIMBER, { faces: 'NSTB' });
  }
  // a long brace up the side of the lift hill
  b.beam([C.a - 0.2, G + 0.4, -32], [C.a - 0.2, G + 13, -43], 0.1, 0.1, TIMBER);
  // bulbs along the whole line
  for (let i = 0; i + 1 < line.length; i += 2) k.glows.push({ x: line[i][0], y: line[i][1] + 0.42, z: line[i][2], sx: 0.15, sy: 0.15, sz: 0.15, color: BULBS[i % BULBS.length] });
  bulbs(k, [C.a, G + 2.9, -32.3], [C.a, G + 15.7, -43.7], 12, 0);
  // the car, at the top of the lift hill, about to go over
  for (const [z0, c] of [[-47.25, 0xc0392b], [-46.15, 0xb03428]] as const) {
    solid(k, C.a - 0.72, G + 16.18, z0, C.a + 0.72, G + 16.85, z0 + 1.05, c);
    b.box(C.a - 0.55, G + 16.85, z0 + 0.15, C.a + 0.55, G + 16.9, z0 + 0.9, DARK, { faces: 'T' });
  }
  b.box(C.a - 0.72, G + 16.2, -47.55, C.a + 0.72, G + 17.1, -47.25, 0xc9a548, { faces: 'NESWT' });
  // the station: a platform between the two lines and a roof over both
  solid(k, C.a + 0.45, G, -31.2, C.b - 0.45, G + 1.25, -28.6, TIMBER_PALE, 'NESWT');
  for (const [x, z] of [[C.a - 0.6, -31.1], [C.b + 0.55, -31.1], [C.a - 0.6, -27.4], [C.b + 0.55, -27.4]]) b.box(x - 0.12, G, z - 0.12, x + 0.12, G + 4.3, z + 0.12, TIMBER_DARK, { faces: 'NESW' });
  solid(k, C.a - 0.9, G + 4.3, -31.5, C.b + 0.75, G + 4.55, -27.0, 0x3f5a50, 'NESWTB');
  hang(k, 'uptown-coaster', (C.a + C.b) / 2, G + 5.0, -27.0, 0, 1, 0.55, 3.2);
  bulbs(k, [C.a - 0.9, G + 4.25, -27.0], [C.b + 0.75, G + 4.25, -27.0], 8);
  k.glows.push({ x: (C.a + C.b) / 2, y: G + 4.0, z: -29.3, sx: 0.8, sy: 0.12, sz: 0.5, color: '#fff0c8' });
  k.lights.push({ x: (C.a + C.b) / 2, z: -36, r: 10, color: AMBER, k: 0.5 });
}

/** Haly's Circus: a big top in red and cream stripes on two king poles, pennants on its lines, and a lit door. */
function bigTop(k: Build, G: number, cx: number, cz: number, rx: number, rz: number): void {
  const b = k.b, n = 12, eave = G + 2.3, peak = G + 6.6, pole = 1.6;
  const ring: [number, number][] = Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU; return [cx + rx * Math.cos(a), cz + rz * Math.sin(a)]; });
  const apexN: V3 = [cx, peak, cz - pole], apexS: V3 = [cx, peak, cz + pole];
  const RED = 0xa8343a, CREAM = 0xdcd0b4;
  for (let i = 0; i < n; i++) {
    const p = ring[i], q = ring[(i + 1) % n], mx = (p[0] + q[0]) / 2 - cx, mz = (p[1] + q[1]) / 2 - cz, l = Math.hypot(mx, mz) || 1;
    const c = i % 2 ? RED : CREAM;
    b.quad([p[0], G, p[1]], [q[0], G, q[1]], [q[0], eave, q[1]], [p[0], eave, p[1]], [mx / l, 0, mz / l], c);
    // the roof: each panel up to the nearer pole's top
    const apex = (p[1] + q[1]) / 2 < cz ? apexN : apexS;
    const P: V3 = [p[0], eave, p[1]], Q: V3 = [q[0], eave, q[1]];
    face3(b, P, Q, apex, [mx / l * 0.6, 0.8, mz / l * 0.6], c);
  }
  // where the roof runs between the two poles, east and west
  for (const i of [0, n / 2]) {
    const p = ring[i], s = i === 0 ? 1 : -1;
    face3(b, [p[0], eave, p[1]], apexN, apexS, [s * 0.7, 0.7, 0], i === 0 ? CREAM : RED);
  }
  // a scalloped valance, as a band a hair outside the wall
  for (let i = 0; i < n; i++) {
    const p = ring[i], q = ring[(i + 1) % n], mx = (p[0] + q[0]) / 2 - cx, mz = (p[1] + q[1]) / 2 - cz, l = Math.hypot(mx, mz) || 1, o = 0.06;
    b.quad([p[0] + (mx / l) * o, eave - 0.45, p[1] + (mz / l) * o], [q[0] + (mx / l) * o, eave - 0.45, q[1] + (mz / l) * o], [q[0] + (mx / l) * o, eave + 0.02, q[1] + (mz / l) * o], [p[0] + (mx / l) * o, eave + 0.02, p[1] + (mz / l) * o], [mx / l, 0, mz / l], i % 2 ? 0xd9b23a : 0x2f4f8a);
    k.glows.push({ x: p[0] + (mx / l) * 0.2, y: eave + 0.05, z: p[1] + (mz / l) * 0.2, sx: 0.15, sy: 0.15, sz: 0.15, color: BULBS[i % BULBS.length] });
  }
  // the king poles, a flag on each, and pennant lines from their tops down to the eaves
  for (const ap of [apexN, apexS]) {
    b.cyl(ap[0], ap[2], peak - 0.4, peak + 1.4, 0.11, 0.08, 6, 0xe9e2d0, { cap: false });
    face3(b, [ap[0], peak + 1.4, ap[2]], [ap[0], peak + 0.85, ap[2]], [ap[0] + 0.9, peak + 1.15, ap[2]], [0, 0, 1], 0xd02a35);
    face3(b, [ap[0], peak + 1.4, ap[2]], [ap[0], peak + 0.85, ap[2]], [ap[0] + 0.9, peak + 1.15, ap[2]], [0, 0, -1], 0xd02a35);
  }
  const flagColours = [0xd02a35, 0xe8c547, 0x2f6fb0, 0xf2efe6];
  for (const [ap, i] of [[apexN, 9], [apexS, 3], [apexN, 6], [apexS, 0]] as const) {
    const p = ring[i], top: V3 = [ap[0], peak + 1.3, ap[2]], low: V3 = [p[0] + (p[0] - cx) * 0.25, eave + 0.3, p[1] + (p[1] - cz) * 0.25];
    wire(k, top, low);
    const dx = low[0] - top[0], dz = low[2] - top[2], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
    for (let j = 1; j <= 4; j++) {
      const t = j / 5, P: V3 = [top[0] + (low[0] - top[0]) * t, top[1] + (low[1] - top[1]) * t, top[2] + (low[2] - top[2]) * t];
      const Q: V3 = [P[0] + dx / l * 0.45, P[1] + (low[1] - top[1]) / l * 0.45, P[2] + dz / l * 0.45];
      const D: V3 = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2 - 0.5, (P[2] + Q[2]) / 2];
      face3(b, P, Q, D, [nx, 0, nz], flagColours[j % 4]);
      face3(b, P, Q, D, [-nx, 0, -nz], flagColours[j % 4]);
    }
  }
  // the door on its south, under a striped canopy, and the circus's name over it
  const dz = cz + rz;
  b.box(cx - 0.55, G, dz - 0.3, cx + 0.55, G + 1.9, dz + 0.02, 0x2a1c16, { faces: 'S', win: interior(2.2) });
  for (const s of [-1, 1]) b.box(cx + s * 0.75 - 0.08, G, dz - 0.1, cx + s * 0.75 + 0.08, G + 2.2, dz + 0.9, 0xd9b23a, { faces: 'NESW' });
  solid(k, cx - 0.95, G + 2.2, dz - 0.25, cx + 0.95, G + 2.42, dz + 1.0, RED);
  hang(k, 'uptown-halys', cx, G + 2.95, dz + 1.02, 0, 1, 0.6, 3.6);
  k.b.box(cx - 0.06, G + 2.42, dz + 0.9, cx + 0.06, G + 3.35, dz + 1.0, IRON_DARK, { faces: 'NESW' });
  k.glows.push({ x: cx, y: G + 2.05, z: dz + 0.5, sx: 0.4, sy: 0.12, sz: 0.3, color: '#ffe2a8' });
  k.lights.push({ x: cx, z: dz + 2.2, r: 8, color: AMBER, k: 0.5 });
}

/**
 * A fairground front: a low hall, a false front above it in faded paint, a
 * canopy over its doors with bulbs along it. Its front faces south.
 */
function fairFront(k: Build, x0: number, z0: number, x1: number, z1: number, G: number, h: number, front: number, colour: number, sign: string, signH: number, plinth = 0): void {
  const b = k.b;
  if (plinth > 0) {
    b.box(x0, G, z0, x1, G + plinth, z1, colour, { top: LEAD });
    b.box(x0 + 0.05, G + plinth, z0 + 0.05, x1 - 0.05, G + h, z1 - 0.05, colour, { win: SMALL_WIN, top: SLATE });
  } else {
    b.box(x0, G, z0, x1, G + h, z1, colour, { top: SLATE });
  }
  // the false front, standing a little proud of the hall's south wall, with a pediment in the middle
  const mx = (x0 + x1) / 2;
  solid(k, x0 - 0.1, G + h - 0.6, z1, x1 + 0.1, G + front, z1 + 0.22, 0xcfc2a2, 'NESWT');
  b.box(mx - 1.2, G + front, z1, mx + 1.2, G + front + 0.6, z1 + 0.22, 0xcfc2a2, { faces: 'NESWT' });
  roundel(b, [mx, G + front + 0.58, z1 + 0.11], 1.2, 'S', 0xcfc2a2, {}, 8);
  roundel(b, [mx, G + front + 0.58, z1 + 0.11], 1.2, 'N', 0xcfc2a2, {}, 8);
  hang(k, sign, mx, G + (h + front) / 2 - 0.05, z1 + 0.24, 0, 1, signH, x1 - x0 - 0.6);
  // doors with light inside, and a canopy over them
  for (const dx of [-0.28, 0.28]) {
    const x = mx + (x1 - x0) * dx;
    b.box(x - 0.55, G, z1 - 0.02, x + 0.55, G + 2.1, z1 + 0.04, 0x2a1c16, { faces: 'S', win: interior(2.2) });
  }
  solid(k, x0 + 0.1, G + 2.45, z1, x1 - 0.1, G + 2.62, z1 + 1.1, colour);
  bulbs(k, [x0 + 0.2, G + 2.4, z1 + 1.12], [x1 - 0.2, G + 2.4, z1 + 1.12], Math.round((x1 - x0) / 0.6));
  bulbs(k, [x0, G + front + 0.08, z1 + 0.26], [x1, G + front + 0.08, z1 + 0.26], Math.round((x1 - x0) / 0.6));
  // a poster on the hall's side
  b.box(x1 + 0.01, G + 1.0, (z0 + z1) / 2 - 0.6, x1 + 0.05, G + 2.4, (z0 + z1) / 2 + 0.6, FADED[Math.round(x0) % FADED.length], { faces: 'E' });
}

/** The high striker: a pad, a tall painted board with a bell on top, the big mallet resting against it. */
function highStriker(k: Build, x: number, z: number, G: number): void {
  const b = k.b;
  solid(k, x - 0.55, G, z - 0.45, x + 0.55, G + 0.3, z + 0.45, TIMBER_DARK, 'NESWT');
  b.box(x - 0.16, G + 0.3, z - 0.3, x + 0.16, G + 6.4, z - 0.02, 0xe8e0cc, { faces: 'NESWT' });
  for (const [y, c] of [[1.6, 0x3e7d86], [2.8, 0xd9b23a], [4.0, 0xd07a2a], [5.2, 0xc0392b]] as const) b.box(x - 0.18, G + y, z - 0.32, x + 0.18, G + y + 0.7, z, c, { faces: 'NESW' });
  b.cyl(x, z - 0.16, G + 6.4, G + 6.9, 0.42, 0.3, 8, BRASS);
  k.glows.push({ x, y: G + 7.05, z: z - 0.16, sx: 0.22, sy: 0.22, sz: 0.22, color: '#ff4a3a' });
  // the lever where the mallet strikes
  solid(k, x - 0.3, G + 0.3, z + 0.02, x + 0.3, G + 0.5, z + 0.4, 0xc0392b, 'NESWT');
  // the mallet, head down on the pad, its handle leaning on the board
  solid(k, x + 0.25, G + 0.3, z - 0.05, x + 0.95, G + 0.85, z + 0.4, 0xc0392b);
  b.beam([x + 0.6, G + 0.85, z + 0.17], [x + 0.18, G + 2.9, z - 0.05], 0.07, 0.06, TIMBER_PALE);
}

/** Harley's booth: a counter in red and black, a striped roof on four posts, and the striker's sign over it. */
function booth(k: Build, x0: number, z0: number, x1: number, z1: number, G: number): void {
  const b = k.b, RED = 0xc0262f, BLACK = 0x1c1c20;
  b.box(x0, G, z0, x1, G + 1.1, z1 - 0.5, BLACK, { faces: 'NESWT', top: TIMBER_PALE });
  const n = 4, w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) b.box(x0 + i * w, G + 0.12, z1 - 0.5, x0 + (i + 1) * w, G + 1.0, z1 - 0.47, i % 2 ? RED : BLACK, { faces: 'S' });
  b.box(x0 + 0.1, G, z0, x1 - 0.1, G + 2.6, z0 + 0.25, BLACK, { faces: 'NESWT' });
  for (const x of [x0 + 0.08, x1 - 0.08]) b.box(x - 0.07, G + 1.1, z1 - 0.62, x + 0.07, G + 2.6, z1 - 0.48, RED, { faces: 'NESW' });
  for (let i = 0; i < n; i++) solid(k, x0 - 0.15 + i * ((x1 - x0 + 0.3) / n), G + 2.6, z0 - 0.15, x0 - 0.15 + (i + 1) * ((x1 - x0 + 0.3) / n), G + 2.78, z1 - 0.2, i % 2 ? RED : BLACK);
  hang(k, 'uptown-strength', (x0 + x1) / 2, G + 3.15, z1 - 0.18, 0, 1, 0.7, x1 - x0 + 0.3);
  // prizes on the back shelf
  for (let i = 0; i < 4; i++) b.box(x0 + 0.3 + i * 0.35, G + 1.1, z0 + 0.3, x0 + 0.55 + i * 0.35, G + 1.45 + (i % 2) * 0.15, z0 + 0.55, FADED[i], { faces: 'NESWT' });
  k.glows.push({ x: (x0 + x1) / 2, y: G + 2.45, z: z1 - 0.7, sx: 0.6, sy: 0.1, sz: 0.3, color: '#ffe0b0' });
}

/**
 * Amusement Mile: the big wheel, the roller coaster along the east edge, Haly's
 * big top, the nickelodeon and the penny arcade, the high striker and Harley's
 * booth at the boardwalk's head, the planked boardwalk itself, and the rails
 * round the terrace's rim.
 */
const amusement: Model = (k, l) => {
  const b = k.b, G = l.base, r = rng(4411);
  // the boardwalk: planks in two shades, a hair over the terrace
  for (let i = 0; i < 10; i++) {
    const x0 = l.x0 + 0.4 + i * 0.96;
    b.box(x0, G, -30, x0 + 0.96, G + 0.036, -16, i % 2 ? TIMBER_PALE : 0xb39672, { faces: 'T' });
  }
  bigWheel(k, G);
  coaster(k, G);
  bigTop(k, G, 91.3, -44, 2.95, 4.7);
  // the nickelodeon and the fun house, in one hall at the north end under the wheel
  fairFront(k, 94.7, -49.9, 99.9, -46.8, G, 6, 7.4, 0x6f6458, 'uptown-nickel', 0.85, 2);
  hang(k, 'uptown-funhouse', 97.3, G + 3.25, -46.8 + 1.12, 0, 1, 0.4, 3.0);
  // the penny arcade, the high striker and Harley's booth, at the north edge of the boardwalk
  fairFront(k, 88.45, -36.2, 91.35, -32.2, G, 3.6, 5.0, 0x7a6a5a, 'uptown-arcade', 0.55);
  highStriker(k, 92.1, -32.2, G);
  booth(k, 93.0, -34.0, 94.65, -31.6, G);
  // a hoopla stall and a popcorn cart on the low ground by the south rim: nothing here is taller than a person
  b.box(99.8, G, -18.6, 103.4, G + 1.0, -17.8, 0x7a5a2a, { faces: 'NESWT', top: TIMBER_PALE });
  for (let i = 0; i < 6; i++) b.box(100.0 + i * 0.55, G, -17.4, 100.4 + i * 0.55, G + 1.3 + (i % 3) * 0.3, -16.9, FADED[i % FADED.length], { faces: 'NESWT' });
  for (let i = 0; i < 5; i++) b.cyl(100.2 + i * 0.7, -18.2, G + 1.0, G + 1.35, 0.12, 0.12, 6, 0xe9dcc0);
  hang(k, 'uptown-hoopla', 101.6, G + 1.55, -18.62, 0, 1, 0.34, 2.0);
  solid(k, 100.3, G + 0.3, -23.0, 101.3, G + 1.3, -22.3, 0xb2342c, 'NESWT');
  b.box(100.35, G + 1.3, -22.95, 101.25, G + 1.9, -22.35, 0xf2e6b0, { faces: 'NESWT', win: interior(1.4) });
  for (const x of [100.45, 101.15]) b.cyl(x, -22.65, G, G + 0.3, 0.3, 0.3, 6, IRON_DARK, { cap: false });
  // benches along the south rim
  for (const x of [90.5, 95.5]) solid(k, x - 1.0, G + 0.38, -15.4, x + 1.0, G + 0.5, -14.9, TIMBER, 'NESWT');
  // the terrace's south face over the East End: arches in it, and circus posters between them
  wallArch(k, 92, l.z1, 1, 'dark', 2.2);
  wallArch(k, 96.4, l.z1, 1, 'lit', 2.2);
  wallArch(k, 100.8, l.z1, 1, 'brick', 2.2);
  for (const x of [89.6, 103.0]) hang(k, 'uptown-poster', x, 2.6, l.z1 + 0.02, 0, 1, 1.4, 1.7);

  // the rims: a stone balustrade along the drop to Kane Street and along the south front, an iron rail on the north and east
  balustrade(b, [[l.x0 + 0.2, -33.8], [l.x0 + 0.2, -22.5]], G, STONE_TRIM, 4);
  balustrade(b, [[l.x0 + 0.2, -21.1], [l.x0 + 0.2, l.z1 - 0.3]], G, STONE_TRIM, 4);
  balustrade(b, [[l.x0 + 0.5, l.z1 - 0.25], [l.x1 - 0.25, l.z1 - 0.25]], G, STONE_TRIM, 5);
  b.box(l.x0 + 0.3, G + 0.85, l.z0 + 0.1, l.x1 - 0.1, G + 1.0, l.z0 + 0.22, IRON, { faces: 'NSTB' });
  b.box(l.x1 - 0.22, G + 0.85, l.z0 + 0.1, l.x1 - 0.1, G + 1.0, l.z1 - 0.4, IRON, { faces: 'EWTB' });
  for (let z = l.z0 + 0.2; z < l.z1 - 0.3; z += 4) b.box(l.x1 - 0.22, G, z, l.x1 - 0.1, G + 0.95, z + 0.12, IRON, { faces: 'NESW' });
  for (let x = l.x0 + 0.3; x < l.x1; x += 4) b.box(x, G, l.z0 + 0.1, x + 0.12, G + 0.95, l.z0 + 0.22, IRON, { faces: 'NESW' });
  // bulbs along the west balustrade and the south rim
  bulbs(k, [l.x0 + 0.2, G + 1.25, -33.5], [l.x0 + 0.2, G + 1.25, -22.6], 14, 0, 0.13);
  bulbs(k, [l.x0 + 0.2, G + 1.25, -21.0], [l.x0 + 0.2, G + 1.25, l.z1 - 0.4], 10, 0, 0.13);
  bulbs(k, [l.x0 + 0.6, G + 1.25, l.z1 - 0.25], [l.x1 - 0.3, G + 1.25, l.z1 - 0.25], 18, 0, 0.13);
  // strings of bulbs over the boardwalk, from the arcade's front to the wheel's legs and to the gate
  const arcade: V3 = [91.2, G + 5.0, -31.98], gatePost: V3 = [88.4, G + 3.3, l.z1 - 0.6];
  wire(k, arcade, [WHEEL.x + 1.75, G + 6.2, WHEEL.z + 5.0]);
  bulbs(k, arcade, [WHEEL.x + 1.75, G + 6.2, WHEEL.z + 5.0], 12, 0.5);
  wire(k, [88.6, G + 4.8, -31.98], gatePost);
  bulbs(k, [88.6, G + 4.8, -31.98], gatePost, 22, 0.7);
  // lamps, and the light that makes it the brightest thing on the east bank after dark
  k.lights.push({ x: 93, z: -24, r: 13, color: AMBER, k: 0.6 });
  k.lights.push({ x: 92, z: -18, r: 9, color: '#ff9ad8', k: 0.35 });
  k.lights.push({ x: 101.5, z: -20, r: 8, color: AMBER, k: 0.45 });
  // the people: a queue at the big top's door, a barker on his box, a crowd at the wheel's platform and the coaster's station
  const own = ['amusement'];
  for (let i = 0; i < 4; i++) folk(k, 88.8 + i * 0.6, -37.2 + (r() - 0.5) * 0.3, G, own);
  solid(k, 93.4, G, -38.4, 94.1, G + 0.45, -37.7, TIMBER_DARK, 'NESWT');
  k.person(93.75, -38.05, G + 0.45);
  // waiting beside the wheel's platform, clear of the cars as they come round
  for (const z of [-34.9, -34.1, -33.3]) folk(k, 98.6, z, G, own, 0.1);
  for (const z of [-30.6, -29.6]) k.person((COASTER.a + COASTER.b) / 2, z, G + 1.25);
  folk(k, 98.2, -45.0, G, own);
};

// ---------------------------------------------------------------------------
// The Bowery
// ---------------------------------------------------------------------------

/**
 * The Bowery: three old taverns climbing Kane Street's ramp, each a storey
 * higher than the one below it. Their fronts are on the ramp's sidewalk:
 * Noonan's at the top with a boxing gym over it, Finnigan's with its pool
 * room, and a pawnbroker's with a tavern beside it at the foot.
 */
const bowery: Model = (k, l) => {
  const b = k.b, r = rng(7207), X = l.x1;
  const z0 = l.z0, d = (l.z1 - l.z0) / 3;
  const rows = [
    { z0, z1: z0 + d, top: 16, brick: BRICK_DARK, paint: 0x2f3b34 },
    { z0: z0 + d, z1: z0 + 2 * d, top: 12, brick: BRICK, paint: 0x3a2f2a },
    { z0: z0 + 2 * d, z1: l.z1, top: 8, brick: BRICK_RED, paint: 0x2b2d36 },
  ];
  rows.forEach((t, i) => {
    const zm = (t.z0 + t.z1) / 2, ramp = kaneRamp(zm), inset = i % 2 ? 0.05 : 0;
    // the house, its walls of brick with windows; its front is built on its own
    b.box(l.x0 + inset, 0, t.z0, X - 0.06, t.top, t.z1, t.brick, { win: TENEMENT_WIN, seed: r(), faces: 'NSWT', top: LEAD });
    // the front: a painted bar front at the sidewalk, and above it windows
    b.box(X - 0.1, 0, t.z0 + 0.02, X, Math.min(8, t.top), t.z1 - 0.02, t.paint, { faces: 'E' });
    if (t.top > 8 && i !== 0) b.box(X - 0.1, 8, t.z0 + 0.02, X, t.top, t.z1 - 0.02, t.brick, { faces: 'E', win: TENEMENT_WIN, seed: r() });
    if (i === 0) {
      // the gym's floor, with its big windows, over the tavern's rooms
      b.box(X - 0.12, 8, t.z0 + 0.04, X + 0.01, 12, t.z1 - 0.04, t.brick, { faces: 'E', win: TENEMENT_WIN, seed: r() });
      b.box(X - 0.12, 12, t.z0 + 0.04, X + 0.01, 16, t.z1 - 0.04, t.brick, { faces: 'E', win: GYM_WIN, seed: r() });
      hang(k, 'uptown-gym', X + 0.02, 12.0, zm, 1, 0, 0.5, 3.2);
    }
    // a cornice, and a string course over the bar front
    b.box(l.x0 - 0.15, t.top - 0.45, t.z0, X + 0.2, t.top - 0.1, t.z1, STONE_TRIM, { faces: 'NESWB' });
    if (t.top > 8) b.box(X - 0.1, 7.75, t.z0, X + 0.22, 8.1, t.z1, STONE_TRIM, { faces: 'NESWTB' });
    // the bar's door and its lit window, at the height of the sidewalk outside
    b.box(X, ramp, zm - 1.25, X + 0.06, ramp + 2.4, zm - 0.3, 0x2a1c16, { faces: 'E', win: interior(2.4) });
    b.box(X, ramp + 0.8, zm + 0.2, X + 0.05, ramp + 2.6, zm + 1.6, 0x3a2a1c, { faces: 'E', win: interior(2.8) });
    b.box(X - 0.02, ramp - 0.05, zm - 1.4, X + 0.18, ramp + 0.02, zm - 0.15, STONE_LIGHT, { faces: 'ET' });
    k.glows.push({ x: X + 0.35, y: ramp + 2.75, z: zm - 0.78, sx: 0.25, sy: 0.18, sz: 0.25, color: SODIUM });
    k.lights.push({ x: X + 3, z: zm, r: 7, color: i === 1 ? '#7dff9a' : SODIUM, k: 0.4 });
    // a strip of neon along the top of each bar front, and down its corner
    const glow = [NEON_RED, NEON_GREEN, NEON_MAGENTA][i];
    neon(k, [X + 0.1, ramp + 4.05, t.z0 + 0.25], [X + 0.1, ramp + 4.05, t.z1 - 0.25], glow, 0.1);
    neon(k, [X + 0.1, ramp + 0.3, t.z1 - 0.25], [X + 0.1, ramp + 4.05, t.z1 - 0.25], glow, 0.1);
  });
  const [t1, t2, t3] = rows, m1 = (t1.z0 + t1.z1) / 2, m2 = (t2.z0 + t2.z1) / 2, m3 = (t3.z0 + t3.z1) / 2;
  // Noonan's: its name in red over the door, and BAR in its window
  hang(k, 'uptown-noonans', X + 0.02, kaneRamp(m1) + 3.35, m1, 1, 0, 0.62, 3.2);
  k.sign('uptown-bar', X + 0.1, kaneRamp(m1) + 1.7, m1 + 0.9, 1, 0, 0.5, 1.2);
  // Finnigan's: its name in green, POOL in its window, and a fire escape up its front
  hang(k, 'uptown-finnigans', X + 0.02, kaneRamp(m2) + 3.35, m2, 1, 0, 0.6, 3.3);
  k.sign('uptown-pool', X + 0.1, kaneRamp(m2) + 1.7, m2 + 0.9, 1, 0, 0.48, 1.2);
  fireEscape(b, X, m2 + 0.2, 'E', 4, 12, 2.4);
  // the pawnbroker's: its board, and the three balls on a bracket over the sidewalk
  hang(k, 'uptown-pawn', X + 0.02, kaneRamp(m3) + 3.4, m3 + 0.4, 1, 0, 0.75, 1.6);
  b.beam([X, 6.0, m3 + 0.4], [X + 1.05, 6.0, m3 + 0.4], 0.05, 0.05, IRON_DARK);
  for (const [dy, dz] of [[-0.45, -0.3], [-0.45, 0.3], [-0.95, 0]]) b.cyl(X + 1.0, m3 + 0.4 + dz, 6.0 + dy - 0.22, 6.0 + dy + 0.22, 0.24, 0.24, 6, BRASS, { cap: 0xe0c060 });
  // the tavern beside it: a sign hung out over the sidewalk, read up and down the street
  b.beam([X, 7.3, t3.z0 + 0.45], [X + 0.95, 7.3, t3.z0 + 0.45], 0.05, 0.05, IRON_DARK);
  hangBoth(k, 'uptown-tavern', X + 0.62, 5.75, t3.z0 + 0.45, 0, 1, 2.7, 1.0);
  // the roofs: a tank on the top one, a stair head and chimneys, and the Bowery's name on the lowest
  waterTank(b, l.x0 + 2.6, t1.top, t1.z0 + 1.9, 0.9);
  solid(k, X - 2.4, t1.top, t1.z0 + 0.4, X - 1.5, t1.top + 2.2, t1.z0 + 1.2, BRICK_DARK, 'NESWT');
  b.box(l.x0 + 6, t1.top, m1 - 0.6, l.x0 + 7.6, t1.top + 0.45, m1 + 0.7, GLASS, { faces: 'NESWT', win: interior(1.2) });
  solid(k, l.x0 + 0.6, t2.top, t2.z0 + 0.4, l.x0 + 2.2, t2.top + 2.3, t2.z0 + 1.8, STONE_DARK, 'NESWT');
  b.box(l.x0 + 1.0, t2.top, t2.z0 + 1.8, l.x0 + 1.8, t2.top + 1.9, t2.z0 + 1.84, DARK, { faces: 'S' });
  solid(k, X - 1.6, t2.top, t2.z1 - 1.1, X - 0.9, t2.top + 1.8, t2.z1 - 0.4, BRICK_DARK, 'NESWT');
  b.beam([l.x0 + 5, t2.top, m2], [l.x0 + 5, t2.top + 3.2, m2], 0.05, 0.04, IRON);
  b.beam([l.x0 + 4.2, t2.top + 2.8, m2], [l.x0 + 5.8, t2.top + 2.8, m2], 0.04, 0.04, IRON);
  solid(k, l.x0 + 0.3, t3.top, t3.z0 + 0.3, l.x0 + 1.1, t3.top + 1.6, t3.z0 + 1.1, BRICK_DARK, 'NESWT');
  nameBoard(k, 'uptown-bowery', X - 3.4, m3 + 0.3, t3.top);
  // two gargoyles on the top house's cornice, at its north corners, looking down the lane
  gargoyle(b, X - 0.6, t1.top - 0.1, t1.z0 - 0.15, -Math.PI / 2, 0.8);
  gargoyle(b, l.x0 + 0.4, t1.top - 0.1, t1.z0 - 0.15, (-3 * Math.PI) / 4, 0.8);
  // at the back, in the lane: Noonan's back door with a lamp over it, a fire escape, crates and its drinkers
  b.box(l.x0 - 0.06, 0, m1 - 0.5, l.x0, 2.3, m1 + 0.5, 0x2a1c16, { faces: 'W', win: interior(2.0) });
  gasLamp(k, l.x0 - 0.35, 2.75, m1);
  fireEscape(b, l.x0, m1 - 0.9, 'W', 0, 16, 2.0);
  solid(k, l.x0 - 1.2, 0, m1 + 0.8, l.x0 - 0.3, 0.7, m1 + 1.6, TIMBER, 'NESWT');
  solid(k, l.x0 - 1.1, 0.7, m1 + 0.9, l.x0 - 0.4, 1.3, m1 + 1.5, TIMBER_PALE, 'NESWT');
  folk(k, l.x0 - 1.6, m1 - 0.6, 0, [], 0.2);
  folk(k, l.x0 - 2.3, m1 + 0.2, 0, [], 0.2);
};

// ---------------------------------------------------------------------------
// Otisburg
// ---------------------------------------------------------------------------

interface House { w: number; h: number }

/**
 * A row of brick houses and walk-ups side by side across a lot, each the lot's
 * full depth: a bay window and a stoop on its south front, a cornice, a
 * chimney on its party wall, and a roof crowded with tanks, stair heads,
 * skylights and lofts, flat enough to run across. Returns where each house is.
 */
function houseRow(k: Build, l: Lot, houses: House[], seed: number, escapes: number[], shop = false): { x0: number; x1: number; h: number }[] {
  const b = k.b, r = rng(seed), bricks = [BRICK, BRICK_DARK, BRICK_RED, 0x5a4a44, 0x4c4a52];
  const out: { x0: number; x1: number; h: number }[] = [];
  let x = l.x0;
  houses.forEach((hs, i) => {
    const x0 = x, x1 = i === houses.length - 1 ? l.x1 : x + hs.w, h = hs.h, brick = bricks[Math.floor(r() * bricks.length)];
    x = x1;
    out.push({ x0, x1, h });
    const z1 = l.z1 + (i % 2 ? 0.05 : 0), cx = (x0 + x1) / 2;
    b.box(x0, 0, l.z0, x1, h, z1, brick, { win: HOUSE_WIN, seed: r(), top: LEAD });
    // the cornice and a string course over the ground storey
    b.box(x0, h - 0.45, l.z0 - 0.2, x1, h - 0.12, z1 + 0.22, STONE_TRIM, { faces: 'NSTB' + (i === 0 ? 'W' : '') + (i === houses.length - 1 ? 'E' : '') });
    b.box(x0, 3.9, z1, x1, 4.15, z1 + 0.12, STONE_TRIM, { faces: 'STB' });
    // a bay window over two storeys, and the stoop and door beside it
    const bx = cx + (i % 2 ? -0.7 : 0.7), dx = cx + (i % 2 ? 1.2 : -1.2);
    b.box(bx - 0.95, 4.3, z1, bx + 0.95, Math.min(h - 0.7, 11.7), z1 + 0.6, brick, { faces: 'ESWTB', win: { cell: 0.95, storey: 4, lit: 0.8, kind: 0 }, seed: r(), top: LEAD });
    if (!(shop && i === 0)) {
      b.box(dx - 0.45, 0.9, z1, dx + 0.45, 3.1, z1 + 0.04, 0x2a1c16, { faces: 'S', win: interior(1.6) });
      b.box(dx - 0.7, 0, z1, dx + 0.7, 0.9, z1 + 0.85, STONE_LIGHT, { faces: 'ESWT' });
      b.box(dx - 0.7, 0, z1 + 0.85, dx + 0.7, 0.45, z1 + 1.25, STONE_LIGHT, { faces: 'ESWT' });
      k.glows.push({ x: dx, y: 3.35, z: z1 + 0.18, sx: 0.22, sy: 0.16, sz: 0.2, color: SODIUM });
    }
    // a chimney on the party wall
    b.box(x0 + 0.15, h, l.z0 + 1.0, x0 + 0.85, Math.min(h + 1.9, l.top - 0.1), l.z0 + 1.9, BRICK_DARK, { faces: 'NESWT', top: DARK });
    if (escapes.includes(i)) fireEscape(b, cx, l.z0, 'N', 0, h, 2.6);
  });
  return out;
}

/** Things on a flat roof at height `h` between x0 and x1, no higher than `top`, keeping its south part open to run across. */
function roofThings(k: Build, l: Lot, x0: number, x1: number, h: number, top: number, kind: number): void {
  const b = k.b, cx = (x0 + x1) / 2;
  if (kind === 0 && h + 3.05 <= top) waterTank(b, x0 + 1.7, h, l.z0 + 2.4, 0.85);
  if (kind === 1 && h + 2.3 <= top) {
    solid(k, x1 - 2.1, h, l.z0 + 2.6, x1 - 0.6, h + 2.2, l.z0 + 4.0, STONE_DARK, 'NESWT');
    b.box(x1 - 1.7, h, l.z0 + 4.0, x1 - 1.0, h + 1.8, l.z0 + 4.04, DARK, { faces: 'S' });
  }
  if (kind === 2) {
    // a pigeon loft of boards, with a slatted front
    solid(k, x0 + 0.6, h, l.z0 + 2.4, x0 + 2.6, h + 1.2, l.z0 + 3.8, TIMBER, 'NESWT');
    slab(b, [x0 + 1.6, h + 1.6, l.z0 + 2.3], [x0 + 1.6, h + 1.2, l.z0 + 3.95], 1.15, 0.06, RUST);
    for (let i = 0; i < 3; i++) b.box(x0 + 0.8 + i * 0.6, h + 0.5, l.z0 + 3.8, x0 + 1.15 + i * 0.6, h + 0.9, l.z0 + 3.83, DARK, { faces: 'S' });
  }
  // a skylight, lit from below at night
  b.box(cx - 0.8, h, l.z0 + 5.0, cx + 0.8, h + 0.5, l.z0 + 6.0, GLASS, { faces: 'NESWT', win: interior(1.1) });
  // an aerial
  b.beam([x1 - 0.8, h, l.z0 + 0.8], [x1 - 0.8, Math.min(top, h + 3.4), l.z0 + 0.8], 0.04, 0.03, IRON);
  b.beam([x1 - 1.5, Math.min(top, h + 3.4) - 0.5, l.z0 + 0.8], [x1 - 0.1, Math.min(top, h + 3.4) - 0.5, l.z0 + 0.8], 0.03, 0.03, IRON);
}

/** Washing on a line between two places: the line and a few things pegged on it. */
function washing(k: Build, a: V3, c: V3, n = 3, seed = 1): void {
  const r = rng(seed), colours = [0xf2efe6, 0x8fb4d8, 0xd8a24a, 0xc95a5a, 0xe9e2d0];
  wire(k, a, c);
  const dx = c[0] - a[0], dz = c[2] - a[2], l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1), x = a[0] + dx * t, y = a[1] + (c[1] - a[1]) * t - 0.08, z = a[2] + dz * t, w = 0.3 + r() * 0.15, h = 0.5 + r() * 0.35;
    k.b.obox(x, y - h / 2, z, w, h / 2, 0.02, Math.atan2(uz, ux), colours[Math.floor(r() * colours.length)], { faces: 'B' });
  }
}

const OTIS: House[] = [{ w: 4.8, h: 12 }, { w: 4.6, h: 16 }, { w: 4.6, h: 12 }];
const OTIS_2: House[] = [{ w: 4.4, h: 16 }, { w: 4.2, h: 12 }, { w: 4.2, h: 16 }, { w: 4.2, h: 12 }];

/** Otisburg's west block: three houses, the corner one a grocery that faces the quay, with Otisburg's name on its roof. */
const otisburg: Model = (k, l) => {
  const b = k.b, row = houseRow(k, l, OTIS, 9311, [1], true);
  row.forEach((h, i) => roofThings(k, l, h.x0, h.x1, h.h, l.top, [1, 2, 0][i]));
  // the corner shop: shop windows on its quay side and its south side, striped awnings, its signs
  const c = row[0];
  b.box(l.x0 - 0.06, 0.4, l.z1 - 5.6, l.x0, 3.0, l.z1 - 0.6, 0x3a2a1c, { faces: 'W', win: interior(2.2) });
  b.box(c.x0 + 0.5, 0.4, l.z1, c.x0 + 2.4, 3.0, l.z1 + 0.06, 0x3a2a1c, { faces: 'S', win: interior(2.2) });
  for (let i = 0; i < 4; i++) slab(b, [l.x0, 3.6, l.z1 - 5.8 + i * 1.3 + 0.65], [l.x0 - 1.1, 3.05, l.z1 - 5.8 + i * 1.3 + 0.65], 0.65, 0.05, i % 2 ? 0xf2efe6 : 0x2f6a4a);
  for (let i = 0; i < 2; i++) slab(b, [c.x0 + 0.5 + i * 0.95 + 0.475, 3.6, l.z1 + 0.06], [c.x0 + 0.5 + i * 0.95 + 0.475, 3.05, l.z1 + 1.1], 0.475, 0.05, i % 2 ? 0xf2efe6 : 0x2f6a4a);
  hang(k, 'uptown-grocery', l.x0 - 0.02, 4.4, l.z1 - 3.1, -1, 0, 0.55, 4.2);
  hang(k, 'uptown-coffee', c.x0 + 1.2, 4.45, l.z1 + 0.08, 0, 1, 0.45, 1.5);
  b.box(c.x0 + 2.7, 0.0, l.z1, c.x0 + 3.5, 2.4, l.z1 + 0.05, 0x2a1c16, { faces: 'S', win: interior(1.8) });
  for (let i = 0; i < 3; i++) solid(k, l.x0 - 0.9, 0, l.z1 - 5.4 + i * 0.8, l.x0 - 0.2, 0.6, l.z1 - 4.8 + i * 0.8, [0x8a6a3a, 0x6a8a3a, 0xa8743a][i], 'NESWT');
  k.lights.push({ x: l.x0 - 1.5, z: l.z1 - 1.5, r: 8, color: SODIUM, k: 0.45 });
  nameBoard(k, 'uptown-otisburg', (c.x0 + c.x1) / 2, l.z1 - 2.2, c.h);
  gargoyle(b, l.x0 + 0.2, c.h - 0.1, l.z1 + 0.15, (3 * Math.PI) / 4, 0.8);
  // a plank across the lane from the end house's roof to a door in the next block's wall
  const e = row[2], y = e.h + 0.05;
  solid(k, e.x1 - 0.4, y, -17.6, e.x1 + 2.05, y + 0.16, -16.6, TIMBER_PALE);
  rail(k, [[e.x1 - 0.3, y + 0.16, -17.55], [e.x1 + 2.0, y + 0.16, -17.55]], 0.8);
  b.box(e.x1 + 1.98, y + 0.16, -17.5, e.x1 + 2.0, y + 2.4, -16.7, DARK, { faces: 'W', win: interior(1.4) });
  // people on the stoops and on a roof
  folk(k, (row[1].x0 + row[1].x1) / 2 - 1.2, l.z1 + 1.6, 0, [], 0.2);
  k.person((row[2].x0 + row[2].x1) / 2 - 1.5, l.z1 - 4.0, row[2].h);
  washing(k, [row[2].x0 + 0.4, row[2].h + 1.5, l.z1 - 2.8], [row[2].x1 - 0.4, row[2].h + 1.5, l.z1 - 2.8], 3, 31);
  for (const x of [row[2].x0 + 0.4, row[2].x1 - 0.4]) b.beam([x, row[2].h, l.z1 - 2.8], [x, row[2].h + 1.6, l.z1 - 2.8], 0.04, 0.04, IRON);
};

/** Otisburg's east block: four houses, and a covered bridge from its end house over the lane to the Bowery. */
const otisburg2: Model = (k, l) => {
  const b = k.b, row = houseRow(k, l, OTIS_2, 5279, [3]);
  row.forEach((h, i) => roofThings(k, l, h.x0, h.x1, h.h, l.top, [0, 2, 0, 1][i]));
  // the covered bridge to the Bowery, a storey of lit windows over the lane
  const e = row[3], bw = lotOf('bowery');
  solid(k, e.x1 - 0.1, 5.0, -13.9, bw.x0 + 0.1, 5.3, -12.5, STONE_TRIM, 'NSTB');
  b.box(e.x1 - 0.1, 5.3, -13.8, bw.x0 + 0.1, 7.6, -12.6, BRICK_DARK, { faces: 'NS', win: { cell: 1.2, storey: 4, lit: 0.9, kind: 0 } });
  solid(k, e.x1 - 0.2, 7.6, -13.95, bw.x0 + 0.2, 7.9, -12.45, LEAD, 'NSTB');
  k.glows.push({ x: (e.x1 + bw.x0) / 2, y: 4.85, z: -13.2, sx: 1.2, sy: 0.1, sz: 0.4, color: SODIUM });
  // washing across the lane to the tenements, under the rows
  washing(k, [row[0].x0 + 1.4, 8.6, l.z1 + 0.06], [row[0].x0 + 1.4, 8.3, l.z1 + 2.9], 3, 11);
  washing(k, [row[2].x0 + 2.0, 9.4, l.z1 + 0.06], [row[2].x0 + 2.0, 9.1, l.z1 + 2.9], 2, 17);
  folk(k, (row[1].x0 + row[1].x1) / 2 + 1.6, l.z1 + 1.7, 0, [], 0.2);
  k.person((row[1].x0 + row[1].x1) / 2 - 1.3, l.z1 - 4.2, row[1].h);
  k.lights.push({ x: (l.x0 + l.x1) / 2, z: l.z1 + 1.5, r: 9, color: SODIUM, k: 0.4 });
};

/** Lots this file builds. */
export const MODELS: Record<string, Model> = { amusement, bowery, otisburg, 'otisburg-2': otisburg2 };

/** Lots that are built as part of another lot's model or by `extras`. */
export const COVERS: string[] = [];

// ---------------------------------------------------------------------------
// The terrace's walls, its stairs and its rims
// ---------------------------------------------------------------------------

/** Where the terrace's south wall stands, and its rim's ledge: where the stone of the rim runs, between the towers' doors and the stairs' heads. */
const SOUTH = { z: -34, ledge: [[3.4, 17.4], [20.6, 24.9], [27.1, 31.4], [34.6, 45.4], [48.6, 53.0], [55.0, 62.4], [65.6, 71.8]] as [number, number][] };
/** The two public stairs down the south wall, each in its lane between the towers. */
const STAIRS = { west: { x0: 25.1, x1: 26.9 }, east: { x0: 53.15, x1: 54.85 } };
/** The rim's ledge along the north wall, over the wharf and the yard. */
const NORTH = { z: -50, x0: 6, x1: 71.6 };

/** The south wall's dressing: a ledge and a balustrade along its rim, buttresses and arches where it shows, and lamps. */
function terraceSouth(k: Build): void {
  const b = k.b, Z = SOUTH.z, G = Y.bluff;
  for (const [x0, x1] of SOUTH.ledge) {
    b.box(x0, G - 0.55, Z, x1, G + 0.06, Z + 0.55, STONE_TRIM, { faces: 'ESWTB' });
    balustrade(b, [[x0 + 0.1, Z + 0.28], [x1 - 0.1, Z + 0.28]], G + 0.06, STONE_TRIM, 5);
  }
  // where the wall shows west of the first tower: buttresses, two arches (a locksmith's in one), lamps and two gargoyles
  for (const x of [4.0, 8.4, 12.6]) b.box(x - 0.45, 0, Z, x + 0.45, 4.6, Z + 1.2, STONE_DARK, { faces: 'ESWT' });
  wallArch(k, 6.2, Z, 1, 'lit', 2.4, 'uptown-locksmith');
  wallArch(k, 10.5, Z, 1, 'brick', 2.4);
  for (const x of [4.0, 12.6]) gargoyle(b, x, 4.6, Z + 1.0, Math.PI / 2, 0.75);
  // a narrow lit door in the gap at x 40, under the rim's walk
  wallArch(k, 40, Z, 1, 'lit', 1.1);
  for (const x of [8.4, 40.9]) gasLamp(k, x, G + 0.06 + 3.0, Z + 0.28, 3.0);
  // the west stair: one straight flight down the lane between the first two towers
  const W = STAIRS.west, run = 0.65, rise = 0.5;
  b.box(W.x0, 0, Z, W.x1, G, Z + 0.8, STONE_LIGHT, { faces: 'ST' });
  for (let i = 0; i < 11; i++) {
    const za = Z + 0.8 + i * run, top = G - (i + 1) * rise;
    b.box(W.x0, 0, za, W.x1, top, za + run, STONE_LIGHT, { faces: 'ST' });
  }
  for (const x of [W.x0 + 0.12, W.x1 - 0.12]) rail(k, [[x, G, Z + 0.4], [x, 0.5, Z + 0.8 + 11 * run - 0.3]], 0.95, false);
  b.beam([W.x0 - 0.1, 5.75, -29], [W.x0 + 0.5, 5.75, -29], 0.05, 0.05, IRON_DARK);
  gasLamp(k, W.x0 + 0.55, 5.5, -29);
  // the east stair: two flights with a landing between them, and a lamp on the landing
  const E = STAIRS.east;
  b.box(E.x0, 0, Z, E.x1, G, Z + 0.8, STONE_LIGHT, { faces: 'STE' });
  let z = Z + 0.8;
  for (let i = 0; i < 6; i++, z += run) b.box(E.x0, 0, z, E.x1, G - (i + 1) * rise, z + run, STONE_LIGHT, { faces: 'STE' });
  b.box(E.x0, 0, z, E.x1, 3, z + 1.0, STONE_LIGHT, { faces: 'STE' });
  const landing = z + 0.5;
  z += 1.0;
  for (let i = 0; i < 5; i++, z += run) b.box(E.x0, 0, z, E.x1, 3 - (i + 1) * rise, z + run, STONE_LIGHT, { faces: 'STE' });
  rail(k, [[E.x1 - 0.1, G, Z + 0.4], [E.x1 - 0.1, 3, landing - 0.5], [E.x1 - 0.1, 3, landing + 0.5], [E.x1 - 0.1, 0.5, z - 0.3]], 0.95);
  gasLamp(k, E.x1 - 0.1, 3 + 3.0, landing, 3.0);
  k.lights.push({ x: (W.x0 + W.x1) / 2, z: -26, r: 6, color: SODIUM, k: 0.45 });
}

/** The north wall's dressing: a ledge and a balustrade along River Street's north side, lamps on it, and arches in the wall below, with coal chutes. */
function terraceNorth(k: Build): void {
  const b = k.b, Z = NORTH.z, G = Y.bluff;
  b.box(NORTH.x0, G - 0.55, Z - 0.55, NORTH.x1, G + 0.06, Z, STONE_TRIM, { faces: 'NEWTB' });
  balustrade(b, [[NORTH.x0 + 0.1, Z - 0.28], [NORTH.x1 - 0.1, Z - 0.28]], G + 0.06, STONE_TRIM, 5);
  for (const x of [12, 28, 52, 68]) gasLamp(k, x, G + 0.06 + 3.0, Z - 0.28, 3.0);
  // arches in the wall: lit workshops, open ways and some bricked up
  const arches: [number, 'lit' | 'dark' | 'brick', string?][] = [
    [4.5, 'brick'], [10.5, 'lit', 'uptown-forge'], [19.5, 'dark'], [26, 'brick'], [33, 'lit'], [38, 'dark'],
    [47, 'lit'], [53, 'brick'], [69, 'dark'], [99.6, 'lit'],
  ];
  for (const [x, kind, sign] of arches) wallArch(k, x, Z, -1, kind, 2.1, sign);
  // coal chutes from the street above down to heaps at the wall's foot
  for (const x of [35.5, 101.6]) {
    slab(b, [x, 4.4, Z - 0.1], [x, 1.1, Z - 1.6], 0.5, 0.12, IRON);
    b.box(x - 0.55, 4.2, Z - 0.2, x + 0.55, 4.6, Z, IRON_DARK, { faces: 'NEWTB' });
    b.cyl(x, Z - 2.0, 0, 1.15, 1.3, 0.1, 5, 0x1c1c1f, { cap: false });
  }
}

/** Kane Street's ramp: the wall up to the fairground, the stair and the gate at its foot, rails where its sides drop, and a lamp on each of the tower's piers. */
function kaneRampDress(k: Build): void {
  const b = k.b, K = KANE_ST, xe = K.x + K.half, xw = K.x - K.half, G = Y.bluff;
  // the fairground's wall over the east sidewalk: a coping, pilasters, a lamp on the coping, a circus poster
  for (const [z0, z1] of [[-32.3, -25.7], [-23.9, -22.9]]) b.box(xe - 0.28, G - 0.4, z0, xe, G + 0.06, z1, STONE_TRIM, { faces: 'NWSTB' });
  for (const z of [-31.2, -27.0, -23.5]) b.box(xe - 0.32, kaneRamp(z) - 0.1, z - 0.3, xe, G - 0.4, z + 0.3, STONE_DARK, { faces: 'NSW' });
  gasLamp(k, xe - 0.14, G + 0.06 + 2.2, -29.1, 2.2);
  hang(k, 'uptown-poster', xe - 0.02, 5.35, -28.9, -1, 0, 0.5, 0.8);
  // the stair from the sidewalk up the wall to the boardwalk, nine steps along the wall
  const sx0 = xe - 1.1, foot = -15.0, top = -21.6, n = 9, run = (foot - top) / n, y0 = kaneRamp(foot), rise = (G - y0) / n;
  for (let i = 0; i < n; i++) {
    const za = foot - (i + 1) * run, zb = foot - i * run;
    b.box(sx0, kaneRamp(zb) - 0.06, za, xe, y0 + (i + 1) * rise, zb, STONE_LIGHT, { faces: 'SWT' });
  }
  b.box(sx0, kaneRamp(top - 1.2) - 0.06, top - 1.2, xe, G, top, STONE_LIGHT, { faces: 'NSWT' });
  rail(k, [[sx0 + 0.06, y0, foot - 0.1], [sx0 + 0.06, G, top - 0.1], [sx0 + 0.06, G, top - 1.1]], 0.95);
  // the gate over the stair's foot: a post on the sidewalk, a post on the terrace, a bar between, and the name in bulbs
  const gz = -14.45, gy = 7.6, pa: [number, number] = [sx0 - 0.15, gz], pb: [number, number] = [xe + 0.4, gz];
  b.box(pa[0] - 0.18, kaneRamp(gz) - 0.05, gz - 0.18, pa[0] + 0.18, gy + 0.3, gz + 0.18, IRON_DARK, { faces: 'NESWT' });
  b.box(pb[0] - 0.18, G, gz - 0.18, pb[0] + 0.18, gy + 0.3, gz + 0.18, IRON_DARK, { faces: 'NESWT' });
  const mx = (pa[0] + pb[0]) / 2;
  b.beam([mx - 2.7, gy, gz], [mx + 2.7, gy, gz], 0.12, 0.12, IRON_DARK);
  // the name stands on the bar, over the posts, in a frame of bulbs
  const sy = gy + 1.0, w = hangBoth(k, 'uptown-mile', mx, sy, gz, 0, 1, 1.6, 5.4);
  for (const s of [-1, 1]) b.beam([mx + s * (w / 2 - 0.4), gy, gz], [mx + s * (w / 2 - 0.4), sy - 0.7, gz], 0.05, 0.05, IRON_DARK);
  for (const s of [-1, 1]) for (const y of [sy - 0.95, sy + 0.95]) bulbs(k, [mx - w / 2 - 0.1, y, gz + s * 0.12], [mx + w / 2 + 0.1, y, gz + s * 0.12], 18, 0, 0.14, ['#ffd27a']);
  for (const p of [pa, pb]) bulbs(k, [p[0], gy + 0.45, p[1]], [p[0], p[0] < xe ? kaneRamp(gz) + 1.2 : G + 1.2, p[1]], 7, 0, 0.13, ['#ffd27a', '#ff6a5a']);
  k.lights.push({ x: mx, z: gz + 1, r: 8, color: AMBER, k: 0.55 });
  // rails along the sidewalks' outer edges where the ramp's sides drop to the blocks' ground
  const railAt = (x: number, z0: number, z1: number): void => {
    const pts: V3[] = [];
    for (let z = z0; z <= z1 + 1e-6; z += Math.max(0.5, (z1 - z0) / Math.ceil((z1 - z0) / 2.4))) pts.push([x, kaneRamp(z), z]);
    rail(k, pts, 0.95);
  };
  railAt(xw + 0.15, -23.9, -22.1);
  railAt(xw + 0.15, -10.9, -9.2);
  railAt(xe - 0.15, -13.6, -6.4);
  // a lamp on each pier of the tower over the street, and nothing else under it
  const gate = lotOf('kane-gate');
  for (const z of [gate.z0 + 0.8, gate.z1 - 0.8]) {
    for (const [x, s] of [[gate.x0 + 1.4, 1], [gate.x1 - 1.4, -1]] as const) {
      b.beam([x, kaneRamp(z) + 3.0, z], [x + s * 0.3, kaneRamp(z) + 3.0, z], 0.05, 0.05, IRON_DARK);
      gasLamp(k, x + s * 0.35, kaneRamp(z) + 2.8, z);
    }
  }
}

// ---------------------------------------------------------------------------
// The elevated railway, as part of the street
// ---------------------------------------------------------------------------

/** Pigeons on the railway's girders, lamps hung under them, and a tavern's sign hung from its steel over Kane Street. */
function elDress(k: Build): void {
  const b = k.b, r = rng(2741), y = EL.y - 0.45 + 0.3, Z = CIRCUIT.riverStreet;
  const pigeon = (x: number, z: number, yaw: number): void => {
    b.obox(x, y + 0.11, z, 0.17, 0.1, 0.09, yaw, 0x8a8f99, { faces: 'B' });
    b.obox(x + Math.cos(yaw) * 0.16, y + 0.24, z + Math.sin(yaw) * 0.16, 0.06, 0.06, 0.06, yaw, 0x6f7886);
  };
  for (let x = 9; x < 66; x += 4 + r() * 5) pigeon(x, Z + (r() > 0.5 ? 1.2 : -1.2), r() > 0.5 ? 0 : Math.PI);
  for (let z = -18; z < -7; z += 3 + r() * 3) pigeon(EL.kane + (r() > 0.5 ? 1.2 : -1.2), z, Math.PI / 2);
  // lamps hung under the girders along River Street, clear of the station's own
  for (const x of [14, 56, 66]) {
    k.glows.push({ x, y: EL.y - 1.25, z: Z, sx: 0.3, sy: 0.18, sz: 0.3, color: SODIUM });
    k.lights.push({ x, z: Z, r: 9, color: SODIUM, k: 0.4 });
  }
  // the tavern's sign, hung on two rods from the steel over Kane Street's west kerb
  const sz = -19.5, top = EL.y - 1.2;
  for (const dx of [-0.45, 0.45]) b.beam([EL.kane + dx, top + 0.45, sz], [EL.kane + dx, top - 0.05, sz], 0.03, 0.03, IRON_DARK);
  hangBoth(k, 'uptown-bar', EL.kane, top - 0.38, sz, 0, 1, 0.62, 1.4);
}

// ---------------------------------------------------------------------------
// The wharf and the goods yard
// ---------------------------------------------------------------------------

/** A railway track laid flat: a bed of ballast, sleepers and two rails, from x0 to x1 along z. */
function flatTrack(k: Build, x0: number, x1: number, z: number): void {
  const b = k.b;
  b.box(x0, 0, z - 0.95, x1, 0.06, z + 0.95, 0x4f4a45, { faces: 'NESWT' });
  for (let x = x0 + 0.4; x < x1 - 0.2; x += 1.3) b.box(x - 0.18, 0.06, z - 0.85, x + 0.18, 0.1, z + 0.85, TIMBER_DARK, { faces: 'T' });
  for (const s of [-0.6, 0.6]) b.box(x0, 0.1, z + s - 0.06, x1, 0.22, z + s + 0.06, 0x9aa0a8, { faces: 'NSTEW' });
}

/** Buffers at the end of a track: a timber beam on two posts, with two buffers facing along the track. */
function buffers(k: Build, x: number, z: number, facing: 1 | -1): void {
  const b = k.b;
  solid(k, x - 0.25, 0.06, z - 0.95, x + 0.25, 1.2, z + 0.95, 0x7a2a22, 'NESWT');
  for (const s of [-0.6, 0.6]) b.box(Math.min(x, x + facing * 0.7), 0.55, z + s - 0.16, Math.max(x, x + facing * 0.7), 0.85, z + s + 0.16, IRON, { faces: 'NESWT' });
}

/** Two bogies under a wagon from x0 to x1. */
function bogies(k: Build, x0: number, x1: number, z: number): void {
  for (const x of [x0 + 1.1, x1 - 1.1]) k.b.box(x - 0.8, 0.22, z - 0.8, x + 0.8, 0.75, z + 0.8, IRON_DARK, { faces: 'NESW' });
}

/** A wagon standing on a track: a boxcar, a tank wagon, an open wagon of coal, a flat wagon of crates, or a brake van. */
function wagon(k: Build, kind: 'box' | 'tank' | 'coal' | 'flat' | 'van', x0: number, x1: number, z: number, colour: number): void {
  const b = k.b, hw = 0.95;
  bogies(k, x0, x1, z);
  solid(k, x0, 0.75, z - hw, x1, 1.0, z + hw, IRON_DARK, 'NESWTB');
  if (kind === 'box' || kind === 'van') {
    const top = kind === 'box' ? 3.0 : 2.7;
    b.box(x0 + 0.05, 1.0, z - hw + 0.05, x1 - 0.05, top, z + hw - 0.05, colour, { faces: 'NESW' });
    b.box(x0 - 0.05, top, z - hw - 0.05, x1 + 0.05, top + 0.2, z + hw + 0.05, LEAD, { faces: 'NESWTB' });
    const mx = (x0 + x1) / 2;
    for (const s of [-1, 1]) b.box(mx - 0.9, 1.1, z + s * (hw - 0.02) - 0.02, mx + 0.9, top - 0.15, z + s * (hw - 0.02) + 0.02, RUST, { faces: s > 0 ? 'S' : 'N' });
    if (kind === 'van') {
      b.box(x1 - 1.6, top + 0.2, z - 0.6, x1 - 0.4, top + 0.8, z + 0.6, colour, { faces: 'NESWT', win: interior(1.4) });
      b.cyl(x0 + 0.8, z, top + 0.2, top + 0.9, 0.12, 0.12, 5, DARK);
    }
  } else if (kind === 'tank') {
    drum(b, [(x0 + x1) / 2, 2.0, z], 1.0, (x1 - x0) / 2 - 0.3, colour);
    b.cyl((x0 + x1) / 2, z, 2.8, 3.25, 0.45, 0.45, 6, colour);
  } else if (kind === 'coal') {
    b.box(x0 + 0.05, 1.0, z - hw + 0.05, x1 - 0.05, 2.1, z + hw - 0.05, colour, { faces: 'NESW' });
    b.box(x0 + 0.1, 1.0, z - hw + 0.1, x1 - 0.1, 2.0, z + hw - 0.1, 0x1c1c1f, { faces: 'T' });
    b.cyl((x0 + x1) / 2, z, 2.0, 2.45, 1.0, 0.2, 5, 0x1c1c1f, { cap: false });
  } else {
    const r = rng(Math.round(x0 * 7));
    for (let x = x0 + 0.2; x + 1.3 < x1; x += 1.6) solid(k, x, 1.0, z - 0.8 + r() * 0.2, x + 1.3, 1.9 + r() * 0.5, z + 0.6, [TIMBER_PALE, 0x8a7a5a, TIMBER][Math.floor(r() * 3)], 'NESWT');
  }
}

/** The yard's tracks, from the plan's fill: one between the two rows of sheds, one in the alley along the terrace's wall, one along the shelf's wall. */
const YARD = { a: -58.25, b: -51.0, c: -65.95, d: -54.5, west: 40.5, east: 103.6, bridge: [71.5, 88.5] as [number, number] };

/** The steam crane: a wagon with a cab, a boiler's stack and a jib, its hook hanging over the next wagon. */
function steamCrane(k: Build, x0: number, x1: number, z: number): void {
  const b = k.b;
  bogies(k, x0, x1, z);
  solid(k, x0, 0.75, z - 0.95, x1, 1.05, z + 0.95, IRON_DARK);
  b.box(x0 + 0.4, 1.05, z - 0.85, x0 + 2.8, 3.0, z + 0.85, 0x2f3e4a, { faces: 'NESW', win: interior(0.9) });
  solid(k, x0 + 0.3, 3.0, z - 0.95, x0 + 2.9, 3.2, z + 0.95, LEAD, 'NESWTB');
  b.cyl(x0 + 0.9, z, 3.2, 4.4, 0.18, 0.16, 6, DARK, { cap: false });
  b.beam([x0 + 2.4, 1.6, z], [x1 + 1.4, 5.2, z], 0.16, 0.12, 0x6a3a2a);
  b.beam([x0 + 2.4, 3.1, z], [x1 + 1.4, 5.2, z], 0.05, 0.05, IRON);
  b.beam([x1 + 1.4, 5.2, z], [x1 + 1.4, 2.6, z], 0.03, 0.03, IRON_DARK);
  b.box(x1 + 1.2, 2.3, z - 0.2, x1 + 1.6, 2.6, z + 0.2, IRON_DARK, { faces: 'NESWTB' });
}

/** The goods yard under the Kane Bridge, and the wharf along the canal. */
function yardAndWharf(k: Build): void {
  const b = k.b, Yd = YARD;
  // the tracks: through the yard between the sheds, and two sidings each side of the bridge's piers
  flatTrack(k, Yd.west, Yd.east, Yd.a);
  flatTrack(k, Yd.west, Yd.bridge[0], Yd.b);
  flatTrack(k, Yd.west, Yd.bridge[0], Yd.c);
  flatTrack(k, Yd.bridge[1] + 0.5, Yd.east, Yd.d);
  flatTrack(k, Yd.bridge[1], Yd.east, Yd.c);
  for (const z of [Yd.a, Yd.b, Yd.c]) buffers(k, Yd.west + 0.25, z, 1);
  for (const z of [Yd.b, Yd.c]) buffers(k, Yd.bridge[0] - 0.25, z, -1);
  for (const z of [Yd.a, Yd.d, Yd.c]) buffers(k, Yd.east - 0.25, z, -1);
  // what stands on them
  wagon(k, 'box', 43.2, 49.2, Yd.a, 0x6a3a2e);
  wagon(k, 'box', 49.6, 55.6, Yd.a, 0x4a5a6a);
  wagon(k, 'tank', 75.2, 80.8, Yd.a, 0x2f3136);
  wagon(k, 'box', 92.4, 98.4, Yd.a, 0x7a5a2c);
  wagon(k, 'tank', 56.6, 62.2, Yd.b, 0x5a5f4a);
  wagon(k, 'van', 63.0, 67.0, Yd.b, 0x7a2a22);
  wagon(k, 'coal', 65.6, 70.6, Yd.c, 0x4a4f58);
  wagon(k, 'coal', 89.4, 94.4, Yd.c, 0x5a4a3a);
  wagon(k, 'box', 94.8, 100.8, Yd.c, 0x3a4a3a);
  wagon(k, 'box', 41.4, 47.4, Yd.b, 0x5a3a3a);
  wagon(k, 'coal', 41.4, 46.4, Yd.c, 0x4a4f58);
  wagon(k, 'box', 46.8, 52.8, Yd.c, 0x6a5a3a);
  wagon(k, 'coal', 81.4, 86.4, Yd.a, 0x5a4a3a);
  steamCrane(k, 91.4, 95.4, Yd.d);
  wagon(k, 'flat', 97.6, 103.0, Yd.d, 0);
  // a water column between the tracks, coal heaps west of the bridge, and a coal merchant's board
  b.box(66.0 - 0.4, 0, -56.3 - 0.4, 66.0 + 0.4, 0.4, -56.3 + 0.4, STONE_DARK, { faces: 'NESWT' });
  b.cyl(66.0, -56.3, 0.4, 3.6, 0.22, 0.18, 6, IRON_DARK, { cap: false });
  b.beam([66.0, 3.5, -56.3], [66.0, 3.5, -57.9], 0.12, 0.1, IRON_DARK);
  b.beam([66.0, 3.5, -57.9], [66.0, 2.2, -58.1], 0.08, 0.08, DARK);
  for (const [x, z, s] of [[67.6, -63.0, 1.8], [70.2, -61.3, 1.3]]) b.cyl(x, z, 0, s * 0.9, s, 0.15, 5, 0x1c1c1f, { cap: false });
  for (const x of [66.4, 70.8]) b.beam([x, 0, -59.75], [x, 2.6, -59.75], 0.06, 0.06, IRON);
  hang(k, 'uptown-coal', 68.6, 2.25, -59.7, 0, 1, 0.5, 4.2);
  // the signal box on its legs, beside the bridge's south pier, its stair down to the alley
  const sb = { x0: 88.6, x1: 91.0, z0: -53.0, z1: -50.5, leg: 3.2 };
  for (const x of [sb.x0 + 0.2, sb.x1 - 0.2]) for (const z of [sb.z0 + 0.2, sb.z1 - 0.2]) b.box(x - 0.14, 0, z - 0.14, x + 0.14, sb.leg, z + 0.14, TIMBER_DARK, { faces: 'NESW' });
  b.box(sb.x0, sb.leg, sb.z0, sb.x1, sb.leg + 2.8, sb.z1, 0x5a4636, { faces: 'NESWB', win: { cell: 1.0, storey: 4, lit: 0.95, kind: 1 } });
  solid(k, sb.x0 - 0.3, sb.leg + 2.8, sb.z0 - 0.3, sb.x1 + 0.3, sb.leg + 3.05, sb.z1 + 0.3, SLATE);
  b.cyl((sb.x0 + sb.x1) / 2, (sb.z0 + sb.z1) / 2, sb.leg + 3.05, sb.leg + 3.9, 1.75, 0.1, 4, SLATE, { phase: Math.PI / 4, cap: false });
  slab(b, [sb.x1 + 0.4, sb.leg, -51.1], [sb.x1 + 3.2, 0.1, -51.1], 0.45, 0.12, TIMBER);
  k.lights.push({ x: 92, z: -52, r: 8, color: SODIUM, k: 0.4 });
  // lamps over the yard, and the yardmen
  gasLamp(k, 68.6, 4.6, -55.5, 4.6);
  gasLamp(k, 99.5, 4.6, -56.4, 4.6);
  folk(k, 67.4, -55.1, 0, [], 0.2);
  folk(k, 96.8, -52.6, 0, [], 0.2);

  // the wharf: bollards along the canal's edge, a barge alongside, a hand crane, barrels and crates
  for (const x of [1, 5, 10.5, 15, 20, 25, 31, 36, 39]) {
    b.cyl(x, -57.45, 0, 0.6, 0.26, 0.26, 6, IRON_DARK, { cap: false });
    b.cyl(x, -57.45, 0.6, 0.75, 0.36, 0.3, 6, IRON_DARK);
  }
  const bg = { x0: 7.5, x1: 20.5, z0: -62.2, z1: -58.45 };
  b.box(bg.x0, -1.3, bg.z0, bg.x1, 0.3, bg.z1, 0x2c2a28, { faces: 'NESWT' });
  face3(b, [bg.x1, -1.3, bg.z0], [bg.x1, -1.3, bg.z1], [bg.x1 + 1.6, 0.3, (bg.z0 + bg.z1) / 2], [0.7, -0.7, 0], 0x2c2a28);
  face3(b, [bg.x1, 0.3, bg.z0], [bg.x1 + 1.6, 0.3, (bg.z0 + bg.z1) / 2], [bg.x1, 0.3, bg.z1], [0, 1, 0], 0x3a3632);
  face3(b, [bg.x1, -1.3, bg.z0], [bg.x1 + 1.6, 0.3, (bg.z0 + bg.z1) / 2], [bg.x1, 0.3, bg.z0], [0.4, 0, -0.9], 0x2c2a28);
  face3(b, [bg.x1, -1.3, bg.z1], [bg.x1, 0.3, bg.z1], [bg.x1 + 1.6, 0.3, (bg.z0 + bg.z1) / 2], [0.4, 0, 0.9], 0x2c2a28);
  b.box(bg.x0 + 0.3, 0.3, bg.z0 + 0.4, bg.x1 - 2.6, 0.55, bg.z1 - 0.4, 0x7a2a22, { faces: 'NESWT' });
  for (let i = 0; i < 3; i++) b.cyl(bg.x0 + 2.0 + i * 3.3, (bg.z0 + bg.z1) / 2, 0.55, 1.6, 1.4, 0.2, 5, 0x1c1c1f, { cap: false });
  b.box(bg.x1 - 2.4, 0.3, bg.z0 + 0.5, bg.x1 - 0.4, 1.9, bg.z1 - 0.5, 0x4a5a5a, { faces: 'NESWT', win: interior(1.2), top: LEAD });
  b.cyl(bg.x1 - 0.9, bg.z0 + 1.0, 1.9, 2.8, 0.12, 0.12, 5, DARK);
  for (const x of [bg.x0 + 0.5, bg.x1 - 1.5]) b.beam([x, 0.3, bg.z1], [x + 0.4, 0.6, -57.6], 0.03, 0.03, 0xb8a888);
  // the hand crane at the wharf's edge
  const hc = { x: 34.0, z: -57.0 };
  b.box(hc.x - 0.5, 0, hc.z - 0.5, hc.x + 0.5, 0.4, hc.z + 0.5, STONE_DARK, { faces: 'NESWT' });
  b.cyl(hc.x, hc.z, 0.4, 3.4, 0.2, 0.16, 6, 0x6a3a2a, { cap: false });
  b.beam([hc.x, 3.3, hc.z], [hc.x, 3.9, hc.z - 3.2], 0.12, 0.09, 0x6a3a2a);
  b.beam([hc.x, 1.4, hc.z], [hc.x, 3.9, hc.z - 3.2], 0.06, 0.06, 0x6a3a2a);
  b.beam([hc.x, 3.85, hc.z - 3.2], [hc.x, 1.0, hc.z - 3.2], 0.025, 0.025, DARK);
  b.box(hc.x - 0.15, 0.75, hc.z - 3.35, hc.x + 0.15, 1.0, hc.z - 3.05, IRON_DARK, { faces: 'NESWTB' });
  drum(b, [hc.x, 1.2, hc.z + 0.3], 0.3, 0.35, IRON_DARK);
  for (const [x, z] of [[31.6, -53.0], [32.5, -52.6], [31.9, -51.8], [37.4, -54.6], [38.2, -55.3]]) barrel(k, x, z);
  for (const [x, z, h] of [[35.6, -52.2, 1.0], [36.8, -52.2, 0.8], [36.2, -52.3, 1.8]] as const) solid(k, x - 0.55, h - 0.8, z - 0.55, x + 0.55, h + 0.2, z + 0.55, TIMBER_PALE, 'NESWT');
  gasLamp(k, 12.0, 3.6, -57.3, 3.6);
  gasLamp(k, 37.6, 3.6, -57.3, 3.6);
  folk(k, 33.0, -55.6, 0, [], 0.2);
  folk(k, 17.6, -57.2, 0, [], 0.2);
}

// ---------------------------------------------------------------------------
// Places the show needs
// ---------------------------------------------------------------------------

const AM = lotOf('amusement'), BW = lotOf('bowery'), OT = lotOf('otisburg'), OT2 = lotOf('otisburg-2');
const boweryTop = (BW.z0 + (BW.z1 - BW.z0) / 6);
const houseMid = (l: Lot, hs: House[], i: number): number => l.x0 + hs.slice(0, i).reduce((s, h) => s + h.w, 0) + (i === hs.length - 1 ? (l.x1 - (l.x0 + hs.slice(0, i).reduce((s, h) => s + h.w, 0))) / 2 : hs[i].w / 2);

export const PLACES: Record<string, Place> = {
  /** Harley's post, before the high striker and her booth, facing south over the boardwalk. */
  booth: { x: 93.6, y: AM.base, z: -31.0, h: Math.PI / 2 },
  /** At the foot of the wheel, east of its frame and clear of its cars as they come round, facing it. */
  wheelFoot: { x: WHEEL.x + 2.6, y: AM.base, z: WHEEL.z, h: Math.PI },
  /** On the coaster's track at the top of its lift hill, just behind the car, facing along it to the north. */
  coasterTop: { x: COASTER.a, y: AM.base + 16.14, z: -44.55, h: -Math.PI / 2 },
  /** Before the big top's door, under its canopy. */
  bigTopDoor: { x: 91.3, y: AM.base, z: -44 + 4.7 + 1.3, h: Math.PI / 2 },
  /** Under the gate on Kane Street's sidewalk, at the foot of the stair to the fairground. */
  mileGate: { x: KANE_ST.x + KANE_ST.half - 0.55, y: kaneRamp(-14.45) + 0.015, z: -14.45, h: Math.PI / 2 },
  /** On the ramp's sidewalk before Noonan's door, facing east. */
  boweryDoor: { x: BW.x1 + 0.7, y: kaneRamp(boweryTop) + 0.015, z: boweryTop - 0.78, h: 0 },
  /** The flat roof of the Bowery's lowest tavern, behind its name board. */
  boweryRoof: { x: BW.x0 + 3.6, y: 8, z: BW.z1 - 1.8, h: Math.PI / 2 },
  /** The south part of Otisburg's end house, flat and open. */
  otisRoof1: { x: houseMid(OT, OTIS, 2), y: OTIS[2].h, z: OT.z1 - 1.4, h: Math.PI / 2 },
  /** The same on the second house of the east block. */
  otisRoof2: { x: houseMid(OT2, OTIS_2, 1), y: OTIS_2[1].h, z: OT2.z1 - 1.4, h: Math.PI / 2 },
  /** The foot of the west stair, in its lane, facing south. */
  stairWest: { x: (STAIRS.west.x0 + STAIRS.west.x1) / 2, y: 0, z: SOUTH.z + 0.8 + 11 * 0.65 + 0.4, h: Math.PI / 2 },
  /** The foot of the east stair, in its lane, facing south. */
  stairEast: { x: (STAIRS.east.x0 + STAIRS.east.x1) / 2, y: 0, z: SOUTH.z + 0.8 + 11 * 0.65 + 1.0 + 0.4, h: Math.PI / 2 },
  /** On the rim's walk over the gap between the second and third towers, facing south. */
  terraceRim: { x: 40, y: Y.bluff + 0.015, z: SOUTH.z - 1.0, h: Math.PI / 2 },
  /** Beside the steam crane in the goods yard. */
  yardCrane: { x: 93.4, y: 0, z: YARD.d + 2.1, h: Math.PI / 2 },
  /** At the canal's edge on the wharf, facing the barge. */
  wharfEdge: { x: 28, y: 0, z: -57.5, h: -Math.PI / 2 },
};

/** Whatever is not one of the plan's lots: the terrace's walls, rims and stairs, the ramp's sides, the railway's dressing, the wharf and the yard. */
export function extras(k: Build): void {
  terraceSouth(k);
  terraceNorth(k);
  kaneRampDress(k);
  elDress(k);
  yardAndWharf(k);
  // people at the stairs' feet and on the rim's ledge-side walk of the lanes
  folk(k, PLACES.stairEast.x + 1.6, -23.0, 0, [], 0.2);
  folk(k, 26.0, -23.0, 0, [], 0.2);
}
