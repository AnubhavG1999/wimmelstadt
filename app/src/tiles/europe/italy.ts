// Italy: the Colosseum, Pisa's Field of Miracles, Florence's cathedral, the
// Ponte Vecchio, Venice, a piazza with a fountain, Lingotto with the test
// track on its roof, Maranello's factory gate and Sant'Agata's museum.

import * as THREE from 'three';
import { placed } from '../../engine/build';
import { GeoBuilder, interior, type V3, type WinSpec } from '../../engine/geo';
import { LAWN, PLAZA, area, flat, oval, rect, type P2 } from '../../engine/ground';
import { buildPath } from '../../engine/paths';
import { roadDeck } from '../../engine/roads';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { pisa } from './landmarks';
import { D, GOLD, ITALY, archway, bandedFlag, figure, hipped, lantern, lathe, rad, roundel, tri, twoWheeler } from './parts';
import { ARNO_X, CANAL, COLOSSEUM, LINGOTTO_ROOF, WATER_DROP } from './plan';

const TILE = 0xb5654a, WATER = 0x7fc4e0, BLACK = 0x16171c, DARK = 0x4a4038;

/** A road sign at the edge of a town: black lettering on white. The two factory towns are named this way and no other. */
const town = (id: string, lines: string[], aspect: number): SignDef => ({ id, lines, color: '#ffffff', ink: '#16171c', aspect, kind: 'board', real: true });

export const ITALY_SIGNS: SignDef[] = [town('maranello', ['MARANELLO'], 5.2), town('sant-agata', ["SANT'AGATA", 'BOLOGNESE'], 3.4)];

/** Where these things stand, as boxes on the ground, for the check that nothing stands in a street. */
export const ITALY_GROUND: [string, number, number, number, number][] = [
  ['The Colosseum', COLOSSEUM.x - 9.5, COLOSSEUM.z - 11.5, COLOSSEUM.x + 9.5, COLOSSEUM.z + 11.5],
  ["Pisa's cathedral", -22.8, 96.9, -1.6, 110.3],
  ['The Duomo', 90.3, 2.0, 100.5, 29.6],
  ["The Duomo's bell tower", 100.2, 26.2, 103, 29],
  ['Venice, north of the canal', 87.3, 76.5, 103.7, 85],
  ["The Doge's Palace", 87.6, 95.6, 95.2, 108],
  ['The town hall', -68, 48.5, -42, 57],
  ['Lingotto', -103, 22, -83.5, 92],
  ["Maranello's gate", -71, 95.5, -55.5, 108],
  ["Sant'Agata's museum", -64, 22.6, -40, 32.4],
  ['The farmhouse', -81.9, 99.9, -75.1, 105.9],
];

// ---------------------------------------------------------------------------
// The Colosseum
// ---------------------------------------------------------------------------

/**
 * The Colosseum: an oval of arches, three tiers of them, each arch between
 * two flat columns and under a cornice. Its outer wall stands four storeys
 * high round the north side only, as the real one's does, and ends in a slope
 * of brick at either end. Round the south side the lower ring behind it
 * shows, with stumps of the lost wall in front of it, and over that one sees
 * the seats going down to the arena, with the walls of the cellars laid bare
 * in its floor.
 */
export function colosseum(k: Build): void {
  const b = k.b;
  const { x: cx, z: cz } = COLOSSEUM;
  const SHADE = 0xc9b58f, BAND = 0xe8d9b8, BRICK = 0xc29a74, SAND = 0xe2cfa0, EARTH = 0x7a6a55, HOLLOW = 0x4a3d30, STAIR = 0xa8956f;
  /** Travertine, a little lighter here and a little darker there, as the real wall is; and the seats, in rings of two shades. */
  const STONES = [0xdcc9a6, 0xd5c19c, 0xe1cfae, 0xd9c5a1], SEATS = [0xd6c39c, 0xc7b38b];
  const RX = 14, RZ = 11.5, N = 44, st = 4.4, H = st * 4, LOW = st * 3;
  /** The heights of the walk between the two banks of seats, and of the wall round the arena. */
  const yM = 7.7, yA = 2.4;
  const angle = (i: number): number => (i / N) * Math.PI * 2;
  const mid = (i: number): number => angle(i + 0.5);
  /** A corner of the oval, `inset` in from its outer wall. */
  const pt = (i: number, inset: number): P2 => [cx + Math.cos(angle(i)) * (RX - inset), cz + Math.sin(angle(i)) * (RZ - inset)];
  /** A stretch of upright wall between two corners, from y0 up to ya at one end and yb at the other. `out` is 1 if it faces outwards. */
  const wall = (i: number, inset: number, y0: number, ya: number, yb: number, color: number, out: number): void => {
    const p = pt(i, inset), q = pt(i + 1, inset);
    b.quad([p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], yb, q[1]], [p[0], ya, p[1]], [Math.cos(mid(i)) * out, 0, Math.sin(mid(i)) * out], color);
  };
  /**
   * An arch in a stretch of wall: a dark opening with a round head, which glows from within at night. The engine's
   * windows are panes of glass, and a ring of those is an office block. With `square` it is a small window instead.
   */
  const arch = (i: number, inset: number, y0: number, out = 1, square = false): void => {
    const p = pt(i, inset), q = pt(i + 1, inset), len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const ux = (q[0] - p[0]) / len, uz = (q[1] - p[1]) / len, nx = Math.cos(mid(i)) * out, nz = Math.sin(mid(i)) * out;
    const mx = (p[0] + q[0]) / 2 + nx * 0.05, mz = (p[1] + q[1]) / 2 + nz * 0.05, hw = len * (square ? 0.17 : 0.3);
    const at = (u: number, y: number): V3 => [mx + ux * u, y, mz + uz * u];
    const o = { win: interior(6) };
    if (square) {
      b.quad(at(-hw, y0 + 1.6), at(hw, y0 + 1.6), at(hw, y0 + 2.7), at(-hw, y0 + 2.7), [nx, 0, nz], HOLLOW, o);
      return;
    }
    const ys = y0 + st * 0.5;
    b.quad(at(-hw, y0 + 0.45), at(hw, y0 + 0.45), at(hw, ys), at(-hw, ys), [nx, 0, nz], HOLLOW, o);
    for (let j = 0; j < 3; j++) {
      const a0 = (j / 3) * Math.PI, a1 = ((j + 1) / 3) * Math.PI;
      tri(b, at(0, ys), at(Math.cos(a0) * hw, ys + Math.sin(a0) * hw), at(Math.cos(a1) * hw, ys + Math.sin(a1) * hw), [nx, 0, nz], HOLLOW, o);
    }
  };
  /** A flat column up the wall at a corner of the oval, from the ground to `top`. */
  const column = (i: number, inset: number, top: number): void => {
    const a = angle(i), [x, z] = pt(i, inset - 0.1), tx = -Math.sin(a) * 0.17, tz = Math.cos(a) * 0.17;
    b.quad([x - tx, 0, z - tz], [x + tx, 0, z + tz], [x + tx, top, z + tz], [x - tx, top, z - tz], [Math.cos(a), 0, Math.sin(a)], BAND);
  };
  /** A cornice along a stretch of wall at height `y`: a band that stands proud of it, and the ledge on top of the band. */
  const cornice = (i: number, inset: number, y: number): void => {
    const p = pt(i, inset - 0.16), q = pt(i + 1, inset - 0.16), p0 = pt(i, inset), q0 = pt(i + 1, inset);
    b.quad([p[0], y - 0.3, p[1]], [q[0], y - 0.3, q[1]], [q[0], y + 0.06, q[1]], [p[0], y + 0.06, p[1]], [Math.cos(mid(i)), 0, Math.sin(mid(i))], BAND);
    b.quad([p[0], y + 0.06, p[1]], [q[0], y + 0.06, q[1]], [q0[0], y + 0.06, q0[1]], [p0[0], y + 0.06, p0[1]], [0, 1, 0], BAND);
  };
  /** A stretch of floor between two rings of the oval, which may slope down from the outer to the inner. */
  const floor = (i: number, in0: number, y0: number, in1: number, y1: number, color: number): void => {
    const a = pt(i, in0), c = pt(i + 1, in0), d = pt(i + 1, in1), e = pt(i, in1);
    const slope = (y0 - y1) / (in1 - in0), nl = Math.hypot(1, slope);
    b.quad([a[0], y0, a[1]], [c[0], y0, c[1]], [d[0], y1, d[1]], [e[0], y1, e[1]], [(-Math.cos(mid(i)) * slope) / nl, 1 / nl, (-Math.sin(mid(i)) * slope) / nl], color);
  };
  /** A stair down through a bank of seats, along the line in from a corner of the oval. */
  const stair = (i: number, in0: number, y0: number, in1: number, y1: number): void => {
    const a = angle(i), tx = -Math.sin(a) * 0.16, tz = Math.cos(a) * 0.16, p = pt(i, in0), q = pt(i, in1);
    b.quad([p[0] - tx, y0 + 0.06, p[1] - tz], [p[0] + tx, y0 + 0.06, p[1] + tz], [q[0] + tx, y1 + 0.06, q[1] + tz], [q[0] - tx, y1 + 0.06, q[1] - tz], [-Math.cos(a) * 0.6, 0.8, -Math.sin(a) * 0.6], STAIR);
  };

  for (let i = 0; i < N; i++) {
    const north = i >= N / 2, inset = north ? 0 : 2.0;
    // how high the outer wall stands at the two ends of this stretch: it slopes down over the last stretch at either end
    const ya = north && i !== N / 2 ? H : LOW, yb = north && i !== N - 1 ? H : LOW, brick = ya !== yb;
    // --- three tiers of arches, each under its cornice ---
    for (let s = 0; s < 3; s++) {
      wall(i, inset, s * st, (s + 1) * st, (s + 1) * st, brick ? BRICK : STONES[(i * 5 + s * 3) % 4], 1);
      arch(i, inset, s * st);
      cornice(i, inset, (s + 1) * st);
    }
    column(i, i === 0 ? 0 : inset, i > N / 2 ? H : LOW);
    if (north) {
      // --- the fourth storey of the outer wall: plain, with a small window, and at either end the slope of brick ---
      wall(i, 0, LOW, ya, yb, brick ? BRICK : STONES[(i * 5 + 1) % 4], 1);
      if (!brick) {
        arch(i, 0, LOW, 1, true);
        cornice(i, 0, H);
      }
      // its inner side, which is seen across the arena, with an arch in every stretch, and its top
      wall(i, 1.6, LOW, ya, yb, SHADE, -1);
      if (!brick) arch(i, 1.6, LOW, -1);
      const p = pt(i, 0), q = pt(i + 1, 0), r = pt(i + 1, 1.6), t = pt(i, 1.6);
      b.quad([p[0], ya, p[1]], [q[0], yb, q[1]], [r[0], yb, r[1]], [t[0], ya, t[1]], [0, 1, 0], SHADE);
    }
    // --- inside: the walk along the top of the lower ring, the seats in two banks with a walk between, and the wall round the arena ---
    floor(i, north ? 1.6 : 2.0, LOW, 3.4, LOW, SHADE);
    floor(i, 3.4, LOW, 4.35, (LOW + yM) / 2, SEATS[0]);
    floor(i, 4.35, (LOW + yM) / 2, 5.3, yM, SEATS[1]);
    floor(i, 5.3, yM, 5.9, yM, SHADE);
    floor(i, 5.9, yM, 6.7, (yM + yA) / 2, SEATS[0]);
    floor(i, 6.7, (yM + yA) / 2, 7.5, yA, SEATS[1]);
    wall(i, 7.5, 0.5, yA, yA, SHADE, -1);
    if (i % 4 === 0) {
      stair(i, 3.4, LOW, 5.3, yM);
      stair(i, 5.9, yM, 7.5, yA);
    }
  }
  // where the outer wall ends, its thickness shows, in brick
  for (const i of [0, N / 2]) {
    const p = pt(i, 0), q = pt(i, 2.0);
    b.quad([p[0], 0, p[1]], [q[0], 0, q[1]], [q[0], LOW, q[1]], [p[0], LOW, p[1]], [0, 0, 1], BRICK);
  }
  // stumps of the lost outer wall, round the south side
  for (let i = 2; i < N / 2; i += 2) {
    const [x, z] = pt(i, 0.45), high = 0.5 + ((i * 7) % 5) * 0.28;
    b.obox(x, high / 2, z, 0.42, high / 2, 0.42, angle(i), STONES[i % 4]);
  }

  // --- the arena: bare earth, the walls of the cellars under it, and a piece of the floor laid over them again ---
  flat(b, oval(cx, cz, RX - 7.5, RZ - 7.5, N), 0.5, EARTH);
  for (const [dz, half] of [[-2.4, 4.4], [-0.8, 5.8], [0.8, 5.8], [2.4, 4.4]]) b.box(cx - half, 0.5, cz + dz - 0.13, cx + 2.6, 1.4, cz + dz + 0.13, SHADE);
  for (const dx of [-3.4, -1.2, 1.0]) b.box(cx + dx - 0.13, 0.5, cz - 2.4, cx + dx + 0.13, 1.4, cz + 2.4, SHADE);
  b.box(cx + 2.6, 1.3, cz - 2.9, cx + 5.7, 1.5, cz + 2.9, SAND);

  for (let i = 0; i < 16; i++) {
    const a = k.rand() * Math.PI * 2, south = Math.sin(a) > 0;
    const inset = south ? 0.9 + k.rand() * 0.8 : -0.5 - k.rand() * 0.8;
    k.person(cx + Math.cos(a) * (RX - inset), cz + Math.sin(a) * (RZ - inset));
  }
  for (let i = 0; i < 7; i++) {
    const a = rad(15 + k.rand() * 150);
    k.person(cx + Math.cos(a) * (RX - 2.7), cz + Math.sin(a) * (RZ - 2.7), LOW);
  }
  for (let i = 0; i < 6; i++) {
    const a = k.rand() * Math.PI * 2;
    k.person(cx + Math.cos(a) * (RX - 5.6), cz + Math.sin(a) * (RZ - 5.6), yM);
  }
  for (const a of [45, 135, 225, 315]) k.lights.push({ x: cx + Math.cos(rad(a)) * 15, z: cz + Math.sin(rad(a)) * 12.5, r: 13, color: '#ffcf8a', k: 0.65 });
  k.lights.push({ x: cx, z: cz, r: 9, color: '#ffe2ae', k: 0.5 });
}

// ---------------------------------------------------------------------------
// Pisa: the Field of Miracles
// ---------------------------------------------------------------------------

/**
 * Pisa's Field of Miracles: on one lawn, the round baptistery, the cathedral,
 * and behind the cathedral the bell tower, which leans.
 */
export function fieldOfMiracles(k: Build): void {
  const b = k.b;
  const MARBLE = 0xf0ebe0, BAND = 0xcfcabd, LEAD = 0x9aa3a8;
  area(k, rect(-36, 95, 10.8, 112.5), LAWN);

  // --- the baptistery: two round storeys, a dome of red tiles, and a little dome of lead on top of that ---
  const bx = -30.5, bz = 103.6, bs = 4.4;
  b.cyl(bx, bz, 0, bs, 4.3, 4.3, 16, MARBLE, { win: { cell: 1.69, storey: bs, lit: 0.15, kind: 6 }, seed: 0.2, cap: false });
  b.cyl(bx, bz, bs - 0.2, bs + 0.2, 4.5, 4.5, 16, BAND, { cap: BAND });
  b.cyl(bx, bz, bs + 0.2, bs * 2, 3.9, 3.9, 16, MARBLE, { win: { cell: 0.77, storey: bs, lit: 0.15, kind: 6 }, seed: 0.5, cap: false });
  b.cyl(bx, bz, bs * 2 - 0.15, bs * 2 + 0.15, 4.1, 4.1, 16, BAND, { cap: BAND });
  lathe(b, bx, bz, [[3.9, bs * 2 + 0.15], [3.5, 10.3], [2.6, 11.7], [1.5, 12.7]], 16, TILE);
  lathe(b, bx, bz, [[1.5, 12.7], [1.3, 13.4], [0.7, 14.0], [0.15, 14.4]], 16, LEAD);
  b.cyl(bx, bz, 14.4, 15.1, 0.1, 0.02, 4, GOLD, { cap: false });

  // --- the cathedral: nave and aisles, a transept, a small dome where they cross, and a front of arcades one above another ---
  const az = 103.6, xf = -22.5, xe = -4.2;
  const nave = 2.5, aisle = 4.3, hN = 8.6, hA = 5.2, ridge = 10.4;
  b.box(xf, 0, az - nave, xe, hN, az + nave, MARBLE, { win: { cell: 1.6, storey: hN / 2, lit: 0.35, kind: 0 }, seed: 0.3, faces: 'NS' });
  b.quad([xf, hN, az + nave], [xe, hN, az + nave], [xe, ridge, az], [xf, ridge, az], [0, 0.8, 0.6], LEAD);
  b.quad([xe, hN, az - nave], [xf, hN, az - nave], [xf, ridge, az], [xe, ridge, az], [0, 0.8, -0.6], LEAD);
  for (const s of [-1, 1]) {
    const zo = az + s * aisle, zn = az + s * nave;
    b.box(xf, 0, Math.min(zo, zn), xe, hA, Math.max(zo, zn), MARBLE, { win: { cell: 1.6, storey: hA, lit: 0.35, kind: 6 }, seed: 0.4 + s * 0.1, faces: s > 0 ? 'S' : 'N' });
    b.quad([xf, hA, zo], [xe, hA, zo], [xe, hA + 1.1, zn], [xf, hA + 1.1, zn], [0, 0.85, s * 0.5], LEAD);
    b.box(xf, hA * 0.5 - 0.12, s > 0 ? zo : zo - 0.06, xe, hA * 0.5 + 0.12, s > 0 ? zo + 0.06 : zo, BAND, { faces: s > 0 ? 'STB' : 'NTB' });
  }
  const tx0 = -11.4, tx1 = -8.0, txm = (tx0 + tx1) / 2, tz = 6.7;
  b.box(tx0, 0, az - tz, tx1, hN, az + tz, MARBLE, { win: { cell: 1.7, storey: hN / 2, lit: 0.35, kind: 0 }, seed: 0.6, faces: 'NESW' });
  b.quad([tx1, hN, az + tz], [tx1, hN, az - tz], [txm, ridge - 0.3, az - tz], [txm, ridge - 0.3, az + tz], [0.7, 0.7, 0], LEAD);
  b.quad([tx0, hN, az - tz], [tx0, hN, az + tz], [txm, ridge - 0.3, az + tz], [txm, ridge - 0.3, az - tz], [-0.7, 0.7, 0], LEAD);
  for (const s of [-1, 1]) tri(b, [tx0, hN, az + s * tz], [tx1, hN, az + s * tz], [txm, ridge - 0.3, az + s * tz], [0, 0, s], MARBLE);
  b.cyl(txm, az, hN, hN + 2.2, 2.3, 2.3, 8, MARBLE, { win: interior(0.3), cap: false });
  lathe(b, txm, az, [[2.45, hN + 2.2], [2.2, hN + 3.3], [1.5, hN + 4.4], [0.6, hN + 5.2], [0.1, hN + 5.6]], 8, LEAD);
  b.cyl(txm, az, hN + 5.6, hN + 6.3, 0.09, 0.02, 4, GOLD, { cap: false });
  // the round east end
  b.cyl(xe, az, 0, 6.6, 2.5, 2.5, 10, MARBLE, { win: { cell: 1.57, storey: 3.3, lit: 0.3, kind: 6 }, seed: 0.7, cap: false });
  b.cyl(xe, az, 6.6, 8.2, 2.5, 0.2, 10, LEAD, { cap: false });
  // the west front
  const tier: WinSpec = { cell: 0.8, storey: hN / 5, lit: 0.2, kind: 6 };
  b.box(xf - 0.3, 0, az - aisle - 0.1, xf, hA + 0.5, az + aisle + 0.1, MARBLE, { win: tier, seed: 0.1 });
  b.box(xf - 0.3, hA + 0.5, az - nave - 0.3, xf, hN + 0.3, az + nave + 0.3, MARBLE, { win: tier, seed: 0.15 });
  tri(b, [xf - 0.3, hN + 0.3, az - nave - 0.3], [xf - 0.3, hN + 0.3, az + nave + 0.3], [xf - 0.3, ridge + 0.6, az], [-1, 0, 0], MARBLE);
  for (const [dz, w, h] of [[0, 0.7, 2.3], [-2.9, 0.5, 1.8], [2.9, 0.5, 1.8]]) {
    b.box(xf - 0.36, 0, az + dz - w, xf - 0.3, h, az + dz + w, DARK, { faces: 'W' });
    roundel(b, [xf - 0.36, h, az + dz], w, 'W', DARK, {}, 8);
  }

  // --- the bell tower, which leans ---
  placed(k, 5.2, 105.2, 0, (q) => pisa(q, 24));

  for (let i = 0; i < 9; i++) k.person(-1 + k.rand() * 11, 109 + k.rand() * 2.8);
  for (let i = 0; i < 5; i++) k.person(-26 + k.rand() * 2.6, 100.5 + k.rand() * 6);
  for (let i = 0; i < 5; i++) k.person(-21 + k.rand() * 18, 96.2 + k.rand() * 0.6);
  k.lights.push({ x: -30.5, z: 108.5, r: 11, color: '#fff3dd', k: 0.6 }, { x: -13, z: 110, r: 13, color: '#fff3dd', k: 0.6 }, { x: -13, z: 97.5, r: 11, color: '#fff3dd', k: 0.4 });
}

// ---------------------------------------------------------------------------
// Florence's cathedral
// ---------------------------------------------------------------------------

/**
 * Florence's cathedral: the great dome of red tiles with its eight white
 * ribs and the lantern on top, the round chapels about its foot, the nave,
 * the front of white, green and pink marble, the bell tower beside the front,
 * and the eight-sided baptistery before it. The front looks south here.
 */
export function duomo(k: Build): void {
  const b = k.b;
  const MARBLE = 0xf1ece0, GREEN = 0x58735f, PINK = 0xd9a79a, RED = 0xb8553a;
  const ax = 95.4, dz = 9.5, zf = 29.5, zn = 14.2, hw = 4.3, h = 9.5;
  const win: WinSpec = { cell: 2.1, storey: h, lit: 0.35, kind: 6 };
  /** A line of green marble round a block, at each of the heights given. */
  const lines = (x0: number, z0: number, x1: number, z1: number, ys: number[], color = GREEN): void => {
    for (const y of ys) b.box(x0 - 0.05, y, z0 - 0.05, x1 + 0.05, y + 0.22, z1 + 0.05, color, { faces: 'NESWTB' });
  };

  // --- the nave ---
  b.box(ax - hw, 0, zn, ax + hw, h, zf, MARBLE, { win, seed: 0.3, faces: 'ESW' });
  lines(ax - hw, zn, ax + hw, zf, [3.0, 6.2, h - 0.25]);
  hipped(b, ax - hw, zn - 1, ax + hw, zf, h, h + 1.7, hw, 0.6, RED);

  // --- the dome: an eight-sided drum with a round window in every side, then the dome itself, pointed, with a white rib up every corner ---
  const yd = 14.2, R = 5.4, rise = 7.6;
  b.cyl(ax, dz, 0, h + 1.2, R, R, 8, MARBLE, { win: { cell: 1.41, storey: h + 1.2, lit: 0.3, kind: 6 }, seed: 0.5, cap: false });
  b.cyl(ax, dz, h + 1.2, yd, R - 0.15, R - 0.15, 8, MARBLE, { win: { cell: 4.0, storey: 3.5, lit: 0.6, kind: 4 }, seed: 0.6, cap: false });
  b.cyl(ax, dz, h + 0.95, h + 1.3, R + 0.2, R + 0.2, 8, GREEN, { cap: GREEN });
  b.cyl(ax, dz, yd - 0.1, yd + 0.3, R + 0.15, R + 0.15, 8, MARBLE, { cap: MARBLE });
  const levels = [0, 16, 32, 48, 62, 74], w = rad(3.4);
  const edges: number[] = [];
  for (let c = 0; c < 8; c++) edges.push(rad(22.5 + c * 45) - w, rad(22.5 + c * 45) + w);
  for (let j = 0; j + 1 < levels.length; j++) {
    const t0 = rad(levels[j]), t1 = rad(levels[j + 1]), tm = (t0 + t1) / 2;
    const r0 = R * Math.cos(t0), r1 = R * Math.cos(t1), y0 = yd + 0.3 + rise * Math.sin(t0), y1 = yd + 0.3 + rise * Math.sin(t1);
    for (let i = 0; i < 16; i++) {
      const a0 = edges[i], a1 = i === 15 ? edges[0] + Math.PI * 2 : edges[i + 1], am = (a0 + a1) / 2;
      const at = (a: number, r: number, y: number): V3 => [ax + Math.cos(a) * r, y, dz + Math.sin(a) * r];
      // (a rib stands a little proud of the tiles to either side of it)
      const lift = i % 2 === 0 ? 0.12 : 0;
      b.quad(at(a0, r0 + lift, y0), at(a1, r0 + lift, y0), at(a1, r1 + lift, y1), at(a0, r1 + lift, y1), [Math.cos(am) * Math.cos(tm), Math.sin(tm), Math.sin(am) * Math.cos(tm)], i % 2 === 0 ? MARBLE : RED, { win: interior(i % 2 === 0 ? 0.5 : 0.25) });
    }
  }
  // the lantern, the ball and the cross
  const yl = yd + 0.3 + rise * Math.sin(rad(74));
  b.cyl(ax, dz, yl - 0.2, yl + 0.3, 1.75, 1.75, 8, MARBLE, { cap: MARBLE });
  b.cyl(ax, dz, yl + 0.3, yl + 3.0, 0.95, 0.95, 8, MARBLE, { win: interior(1.0), cap: false });
  b.cyl(ax, dz, yl + 3.0, yl + 4.4, 1.15, 0.1, 8, MARBLE, { cap: false });
  b.cyl(ax, dz, yl + 4.4, yl + 5.0, 0.3, 0.3, 6, GOLD, { win: interior(0.9) });
  b.box(ax - 0.05, yl + 5.0, dz - 0.05, ax + 0.05, yl + 6.1, dz + 0.05, GOLD, { win: interior(0.9) });
  b.box(ax - 0.32, yl + 5.5, dz - 0.05, ax + 0.32, yl + 5.7, dz + 0.05, GOLD, { win: interior(0.9), faces: 'NESWTB' });
  // the round chapels about the dome's foot, each under half a dome of tiles
  for (const [cx, cz] of [[ax, dz - 5.0], [ax + 5.0, dz], [ax - 5.0, dz]]) {
    b.cyl(cx, cz, 0, 6.6, 2.8, 2.8, 8, MARBLE, { win: { cell: 2.14, storey: 6.6, lit: 0.3, kind: 6 }, seed: 0.8, cap: false });
    b.cyl(cx, cz, 6.4, 6.7, 2.95, 2.95, 8, GREEN, { cap: false });
    b.cyl(cx, cz, 6.7, 8.6, 2.8, 0.2, 8, RED, { cap: false });
  }

  // --- the front: three doors, a round window, and a gable in the middle ---
  b.box(ax - hw - 0.1, 0, zf, ax + hw + 0.1, h + 0.6, zf + 0.3, MARBLE, { faces: 'ESWT' });
  b.box(ax - 2.1, h + 0.6, zf, ax + 2.1, h + 1.6, zf + 0.3, MARBLE, { faces: 'ESW' });
  tri(b, [ax - 2.1, h + 1.6, zf + 0.3], [ax + 2.1, h + 1.6, zf + 0.3], [ax, h + 3.2, zf + 0.3], [0, 0, 1], MARBLE);
  tri(b, [ax - 2.1, h + 1.6, zf], [ax + 2.1, h + 1.6, zf], [ax, h + 3.2, zf], [0, 0, -1], MARBLE);
  for (const y of [3.0, 6.2]) b.box(ax - hw - 0.1, y, zf + 0.3, ax + hw + 0.1, y + 0.22, zf + 0.36, y < 4 ? GREEN : PINK, { faces: 'S' });
  for (const [dx, w2, hh] of [[0, 0.75, 2.2], [-2.8, 0.55, 1.8], [2.8, 0.55, 1.8]]) {
    b.box(ax + dx - w2, 0, zf + 0.3, ax + dx + w2, hh, zf + 0.36, DARK, { faces: 'S' });
    roundel(b, [ax + dx, hh, zf + 0.36], w2, 'S', GOLD, { win: interior(0.4) }, 8);
  }
  roundel(b, [ax, 7.9, zf + 0.34], 1.0, 'S', 0x5a6fe0, { win: interior(0.9) }, 12);

  // --- the bell tower: square, in bands of white, green and pink, with taller windows the higher it goes ---
  const tx = 101.6, tzz = 27.6, th = 1.4, stage = 5.6;
  b.box(tx - th, 0, tzz - th, tx + th, stage * 4, tzz + th, MARBLE, { win: { cell: 1.4, storey: stage, lit: 0.35, kind: 6 }, seed: 0.9, faces: 'NESW' });
  lines(tx - th, tzz - th, tx + th, tzz + th, [stage - 0.11, stage * 2 - 0.11, stage * 3 - 0.11], PINK);
  lines(tx - th, tzz - th, tx + th, tzz + th, [stage * 0.5, stage * 1.5]);
  b.box(tx - th - 0.25, stage * 4, tzz - th - 0.25, tx + th + 0.25, stage * 4 + 0.5, tzz + th + 0.25, MARBLE);

  // --- the baptistery: eight sides, white lined with green, under a low white roof ---
  area(k, rect(88, 30, 103.6, 48), PLAZA);
  const px = ax, pz = 38.4;
  b.cyl(px, pz, 0, 5.6, 3.4, 3.4, 8, MARBLE, { win: { cell: 2.6, storey: 2.8, lit: 0.3, kind: 4 }, seed: 0.4, cap: false });
  for (const y of [2.7, 5.4]) b.cyl(px, pz, y, y + 0.22, 3.46, 3.46, 8, GREEN, { cap: false });
  b.cyl(px, pz, 5.6, 8.0, 3.5, 0.3, 8, MARBLE, { cap: false });
  b.cyl(px, pz, 8.0, 8.7, 0.3, 0.05, 8, GOLD, { cap: false });
  for (const s of [-1, 1]) lantern(k, ax + s * 6.4, 46.2, 0, 2.4, 0x2f3a33);

  for (let i = 0; i < 16; i++) {
    const x = 88.6 + k.rand() * 14.4, z = 30.6 + k.rand() * 16.6;
    if (Math.hypot(x - px, z - pz) > 4.2) k.person(x, z);
  }
  for (let i = 0; i < 4; i++) k.person(88 + k.rand() * 1.6, 12 + k.rand() * 16);
  k.lights.push({ x: ax, z: zf + 3, r: 12, color: '#fff0d0', k: 0.65 }, { x: ax - 7, z: dz + 2, r: 12, color: '#fff0d0', k: 0.55 }, { x: ax + 3, z: dz + 8, r: 10, color: '#fff0d0', k: 0.4 });
}

// ---------------------------------------------------------------------------
// The Ponte Vecchio
// ---------------------------------------------------------------------------

/**
 * The Ponte Vecchio: a bridge for people only, with little shops along both
 * its sides that hang out over the water on props, an open stretch of three
 * arches in the middle, and the long corridor that runs over the shops of one
 * side from end to end. Its slab and its piers are laid with the tile's other bridges.
 */
export function ponteVecchio(k: Build): void {
  const b = k.b;
  const x0 = ARNO_X - 8.3, x1 = ARNO_X + 8.3, zn = 53, zs = 59, gap0 = ARNO_X - 1.7, gap1 = ARNO_X + 1.7;
  const STONE = 0xcdbf9f, WOOD = 0x6a5444;
  const paints = [0xe8c27a, 0xd9a25f, 0xf0d9a0, 0xe2b56b, 0xe9b38a, 0xf2e2b8, 0xd98f6a, 0xe8c27a];
  /** The corridor's floor: the shops under it stop here. */
  const yc = 5.55;
  // the shops: on each side two to the west of the middle and two to the east, each of its own size
  const rows: [number, number, number, number][] = [[x0, 3.4, 4.3, 1.5], [x0 + 3.4, gap0 - x0 - 3.4, 5.0, 2.1], [gap1, 3.1, 4.6, 1.8], [gap1 + 3.1, x1 - gap1 - 3.1, 5.3, 2.3]];
  let n = 0;
  for (const side of [-1, 1]) {
    for (const [xa, len, height, hang] of rows) {
      const h = side > 0 ? yc : height, out = side > 0 ? hang - 0.3 : hang;
      const za = side < 0 ? zn - out : zs - 0.9, zb = side < 0 ? zn + 0.9 : zs + out;
      b.box(xa + 0.05, -0.5, za, xa + len - 0.05, h, zb, paints[n % paints.length], { win: { cell: 1.1, storey: h / 2, lit: 0.6, kind: 2 }, seed: n * 0.17, top: TILE, faces: 'NESWTB' });
      if (side < 0) hipped(b, xa, za - 0.1, xa + len, zb + 0.1, h, h + 0.9, 0.3, (zb - za) / 2 + 0.1, TILE);
      // a prop under the part that hangs over the water
      const xm = xa + len / 2, zo = side < 0 ? za + 0.15 : zb - 0.15, zi = side < 0 ? zn : zs;
      b.beam([xm, -1.0, zi], [xm, -0.5, zo], 0.1, 0.1, WOOD);
      n++;
    }
    // the open stretch in the middle: three arches to look at the river through
    const zw = side < 0 ? zn + 0.45 : zs - 0.45, top = side > 0 ? yc - 0.55 : 2.7;
    for (let i = 0; i < 4; i++) {
      const x = gap0 + 0.15 + (i * (gap1 - gap0 - 0.3)) / 3;
      b.box(x - 0.15, 0, zw - 0.15, x + 0.15, top, zw + 0.15, STONE, { faces: 'NESW' });
    }
    b.box(gap0, top, zw - 0.3, gap1, top + 0.55, zw + 0.3, STONE, { faces: 'NESWTB' });
    if (side < 0) hipped(b, gap0, zw - 0.4, gap1, zw + 0.4, top + 0.55, top + 1.0, 0.2, 0.4, TILE);
  }
  // the corridor over the shops of the south side
  b.box(x0 + 0.3, yc, zs - 0.8, x1 - 0.3, yc + 1.85, zs + 0.9, 0xf0d9a0, { win: { cell: 1.3, storey: 1.85, lit: 0.5, kind: 4 }, seed: 0.6, faces: 'NESWB' });
  hipped(b, x0 + 0.2, zs - 0.9, x1 - 0.2, zs + 1.0, yc + 1.85, yc + 2.6, 0.3, 0.95, TILE);

  for (let i = 0; i < 9; i++) k.person(x0 + 0.8 + k.rand() * (x1 - x0 - 1.6), 54.6 + k.rand() * 2.8);
  for (const x of [x0 + 3, ARNO_X, x1 - 3]) k.lights.push({ x, z: 56, r: 8, color: '#ffd9a0', k: 0.6 });
}

// ---------------------------------------------------------------------------
// Venice
// ---------------------------------------------------------------------------

/** A gondola: black and slender, turned up at both ends, with the iron comb at its bow. One with a crew has its gondolier standing at the stern. */
function gondola(g: GeoBuilder, x: number, y: number, z: number, yaw: number, crew: boolean): void {
  g.moved(x, y, z, yaw, () => {
    g.box(-1.9, -0.12, -0.28, 1.9, 0.3, 0.28, BLACK, { faces: 'NESWT' });
    g.beam([1.9, 0.1, 0], [2.7, 0.75, 0], 0.2, 0.07, BLACK);
    g.beam([-1.9, 0.1, 0], [-2.6, 0.6, 0], 0.2, 0.07, BLACK);
    g.box(2.62, 0.55, -0.04, 2.8, 1.05, 0.04, 0xc9ced3);
    g.box(-0.5, 0.3, -0.2, 0.5, 0.42, 0.2, 0xb3202a);
    if (crew) {
      figure(g, -1.45, 0, 0.3, { coat: 0xf2f2f2, legs: BLACK, hat: 0xe9d9a0, hatH: 0.14, hatR: 0.4 });
      g.beam([-1.3, 1.5, 0.3], [-2.7, -0.1, 0.9], 0.04, 0.05, 0x8d6b4a);
      for (const dx of [-0.2, 0.25]) g.box(dx - 0.2, 0.42, -0.2, dx + 0.2, 1.25, 0.2, dx < 0 ? 0x3f6fb5 : 0xf2c14e);
    }
  });
}

/**
 * Venice: a canal with houses that stand in the water along one side of it,
 * the Rialto bridge across it, gondolas at their striped poles and one that
 * is rowed up and down, and on the other side a square with the tall bell
 * tower and the pink palace of the doges.
 */
export function venice(k: Build): void {
  const b = k.b;
  const z0 = CANAL.z0, z1 = CANAL.z1, zc = (z0 + z1) / 2, wl = -WATER_DROP;
  const ISTRIA = 0xece7d8, DECK = 0xd9d3c2, LEAD = 0x8f9aa2, BRICK = 0xc0714f;

  // --- houses along the north side, straight out of the water, with chimneys that open like funnels ---
  const houses: [number, number, number, number][] = [[87.3, 91.3, 9.6, 0xe7b2a0], [91.5, 96.4, 11.2, 0xe2b56b], [101.2, 103.7, 8.8, 0xc8644a]];
  houses.forEach(([xa, xb, h, color], i) => {
    b.box(xa, wl - 0.4, 76.5, xb, h, z0 - 0.05, color, { win: { cell: 1.05, storey: 3.1, lit: 0.5, kind: 6 }, seed: 0.2 + i * 0.3, faces: 'NESW' });
    b.box(xa - 0.06, 3.0, z0 - 0.14, xb + 0.06, 3.3, z0 - 0.05, ISTRIA, { faces: 'ESWTB' });
    hipped(b, xa - 0.15, 76.35, xb + 0.15, z0 + 0.1, h, h + 1.0, 0.9, 0.9, TILE);
    const cx = xa + 0.9, cz = 79 + i;
    b.cyl(cx, cz, h + 0.3, h + 1.7, 0.14, 0.14, 6, color, { cap: false });
    b.cyl(cx, cz, h + 1.7, h + 2.3, 0.14, 0.42, 6, ISTRIA, { cap: DARK });
  });
  // the little square where the bridge comes down on this side, with its well
  b.cyl(98.8, 80.2, 0, 0.9, 0.6, 0.6, 8, ISTRIA, { cap: DARK });
  for (let i = 0; i < 5; i++) k.person(97 + k.rand() * 3.6, 78 + k.rand() * 4);

  // --- the Rialto: one arch, a way up to the middle from either bank, a row of arches along each side of it, and a porch on the crown ---
  const xr = 99, R = 3, spring = wl + 0.2;
  const top = (s: number): number => (Math.abs(s) <= 1.2 ? 2.9 : (2.9 * (5 - Math.abs(s))) / 3.8);
  const under = (s: number): number => (Math.abs(s) >= R ? spring : spring + Math.sqrt(R * R - s * s));
  const cuts = [-5, -3, -2.6, -1.9, -1.2, 0, 1.2, 1.9, 2.6, 3, 5];
  b.moved(xr, 0, zc, Math.PI / 2, () => {
    // (in here the bridge runs along x, and is 4 wide)
    for (let i = 0; i + 1 < cuts.length; i++) {
      const sa = cuts[i], sb = cuts[i + 1], land = Math.abs(sa) >= R && Math.abs(sb) >= R;
      const ba = land ? 0 : under(sa), bb = land ? 0 : under(sb), ta = top(sa), tb = top(sb);
      for (const zs of [-2, 2]) b.quad([sa, ba, zs], [sb, bb, zs], [sb, tb, zs], [sa, ta, zs], [0, 0, zs], ISTRIA);
      const slope = (tb - ta) / (sb - sa), nl = Math.hypot(1, slope);
      b.quad([sa, ta, -2], [sb, tb, -2], [sb, tb, 2], [sa, ta, 2], [-slope / nl, 1 / nl, 0], DECK);
      if (!land) {
        const sm = (sa + sb) / 2;
        b.quad([sa, ba, -2], [sb, bb, -2], [sb, bb, 2], [sa, ba, 2], [-sm / R, -(under(sm) - spring) / R, 0], 0xcfc9b8);
      }
    }
    // the rows of arches that climb with it
    for (const r of [-1, 1]) {
      const sa = r * 4.4, sb = r * 1.3, ta = top(sa), tb = top(sb);
      for (const zs of [-1, 1]) {
        const zo = zs * 2, zi = zs * 1.55;
        const slits: WinSpec = { cell: 0.75, storey: 1.45, lit: 0.5, kind: 6 };
        b.quad([sa, ta, zo], [sb, tb, zo], [sb, tb + 1.5, zo], [sa, ta + 1.5, zo], [0, 0, zs], ISTRIA, { win: slits, L: 3.1 });
        b.quad([sa, ta, zi], [sb, tb, zi], [sb, tb + 1.5, zi], [sa, ta + 1.5, zi], [0, 0, -zs], ISTRIA, { win: slits, L: 3.1 });
        b.quad([sa, ta + 1.5, zo], [sb, tb + 1.5, zo], [sb, tb + 1.5, zi], [sa, ta + 1.5, zi], [0, 1, 0], LEAD);
        b.quad([sa, ta, zo], [sa, ta, zi], [sa, ta + 1.5, zi], [sa, ta + 1.5, zo], [r, 0, 0], ISTRIA);
      }
    }
    // the porch on the crown
    for (const zs of [-1, 1]) for (const sx of [-1, 1]) b.box(Math.min(sx * 0.8, sx * 1.25), 2.9, Math.min(zs * 1.55, zs * 2), Math.max(sx * 0.8, sx * 1.25), 5.2, Math.max(zs * 1.55, zs * 2), ISTRIA, { faces: 'NESW' });
    b.box(-1.35, 5.2, -2.05, 1.35, 5.7, 2.05, ISTRIA, { faces: 'NESWTB' });
    hipped(b, -1.35, -2.05, 1.35, 2.05, 5.7, 6.3, 1.35, 0.5, LEAD);
  });
  for (let i = 0; i < 7; i++) {
    const s = -4.2 + k.rand() * 8.4;
    k.person(xr - 1.2 + k.rand() * 2.4, zc + s, top(s));
  }

  // --- gondolas at their poles, and one on its way along the canal and out onto the river ---
  const pole = (x: number, z: number, color: number): void => {
    for (let i = 0; i < 4; i++) b.cyl(x, z, wl - 0.5 + i * 0.8, wl + 0.3 + i * 0.8, 0.11, 0.11, 4, i % 2 ? 0xf4f1e8 : color, { cap: i === 3 ? GOLD : false });
  };
  for (const [x, z, yaw, color] of [[90.2, z1 - 0.7, 0, 0xc8202c], [94.2, z1 - 0.7, 0, 0x1f55b5], [102.3, z0 + 0.7, Math.PI, 0xc8202c]]) {
    gondola(b, x, wl, z, yaw, false);
    pole(x - 2.9, z + (z > zc ? 0.35 : -0.35), color);
    pole(x + 3.0, z + (z > zc ? 0.35 : -0.35), color);
  }
  const g = new GeoBuilder();
  gondola(g, 0, 0, 0, 0, true);
  const boat = new THREE.Mesh(g.build(), k.mat.city());
  boat.name = 'gondola';
  boat.castShadow = true;
  k.group.add(boat);
  const xa = 80.5, xb = 102.6, pace = 2.2, rest = 3.2, leg = (xb - xa) / pace, lap = 2 * (leg + rest);
  let t = 0;
  k.each((dt) => {
    t = (t + dt) % lap;
    const back = t >= leg + rest, u = back ? t - leg - rest : t;
    const along = Math.min(u, leg) * pace, turning = Math.max(0, u - leg) / rest;
    boat.position.set(back ? xb - along : xa + along, wl + 0.03 * Math.sin(t * 1.7), zc);
    boat.rotation.y = (back ? Math.PI : 0) + turning * Math.PI;
    boat.rotation.x = 0.03 * Math.sin(t * 1.3);
  });

  // --- the square south of the canal: the palace of the doges, the bell tower, and the two columns at the water's edge ---
  area(k, rect(95.4, 95.6, 103.8, 112.6), PLAZA);
  const px0 = 87.6, px1 = 95.2, pz0 = 95.6, pz1 = 108;
  b.box(px0, 0, pz0, px1, 5.0, pz1, ISTRIA, { win: { cell: 0.8, storey: 2.5, lit: 0.45, kind: 6 }, seed: 0.3, faces: 'NESW' });
  b.box(px0, 5.0, pz0, px1, 9.4, pz1, 0xe9bfb0, { win: { cell: 2.5, storey: 5.0, lit: 0.45, kind: 4 }, seed: 0.5, top: TILE });
  b.box(px0 - 0.06, 9.4, pz0 - 0.06, px1 + 0.06, 9.75, pz1 + 0.06, ISTRIA, { faces: 'NESW' });
  const tx = 100.6, tz = 105.6, th = 1.5, row = 6.5;
  b.box(tx - th, 0, tz - th, tx + th, row * 3, tz + th, BRICK, { win: { cell: 1.0, storey: row, lit: 0.3, kind: 6 }, seed: 0.7, faces: 'NESW' });
  b.box(tx - th - 0.1, row * 3, tz - th - 0.1, tx + th + 0.1, row * 3.5, tz + th + 0.1, ISTRIA, { win: { cell: 0.8, storey: row, lit: 0.5, kind: 6 }, seed: 0.2, faces: 'NESW' });
  b.box(tx - th - 0.25, row * 3.5, tz - th - 0.25, tx + th + 0.25, row * 3.5 + 0.35, tz + th + 0.25, ISTRIA);
  b.box(tx - th, row * 3.5 + 0.35, tz - th, tx + th, row * 3.5 + 2.4, tz + th, BRICK);
  b.cyl(tx, tz, row * 3.5 + 2.4, row * 3.5 + 8.4, th * D, 0.05, 4, 0x6f9a8a, { cap: false });
  b.box(tx - 0.14, row * 3.5 + 8.4, tz - 0.14, tx + 0.14, row * 3.5 + 9.1, tz + 0.14, GOLD, { win: interior(0.9) });
  for (const x of [97.6, 101.8]) {
    b.cyl(x, 110.6, 0, 0.5, 0.5, 0.5, 8, ISTRIA, { cap: ISTRIA });
    b.cyl(x, 110.6, 0.5, 5.2, 0.24, 0.2, 8, 0xb9a9a0, { cap: false });
    b.box(x - 0.36, 5.2, 110.6 - 0.36, x + 0.36, 5.45, 110.6 + 0.36, ISTRIA);
    b.box(x - 0.3, 5.45, 110.6 - 0.16, x + 0.3, 5.95, 110.6 + 0.16, 0x5a6b5c);
  }
  for (let i = 0; i < 14; i++) k.person(95.8 + k.rand() * 7.6, i < 9 ? 96.2 + k.rand() * 7 : 108.6 + k.rand() * 3.4);
  for (let i = 0; i < 7; i++) k.person(87.2 + k.rand() * 15.6, z1 + 0.5 + k.rand() * 2.6);
  k.lights.push(
    { x: xr, z: zc, r: 10, color: '#ffe2ae', k: 0.6 }, { x: 91, z: zc + 4, r: 9, color: '#ffd9a0', k: 0.5 }, { x: 99.5, z: 100, r: 11, color: '#ffe2ae', k: 0.55 },
    { x: tx, z: tz + 3, r: 9, color: '#ffe2ae', k: 0.5 }, { x: 91.5, z: 109.5, r: 9, color: '#ffe2ae', k: 0.45 },
  );
}

// ---------------------------------------------------------------------------
// The piazza
// ---------------------------------------------------------------------------

/**
 * A piazza in Motor Valley: a church with its bell tower and the town hall,
 * with its arcade, its battlements and its clock tower, along the north side;
 * a fountain; tables under parasols; and a row of scooters.
 */
export function piazza(k: Build): void {
  const b = k.b;
  const CREAM = 0xf0e2c0, OCHRE = 0xd9a25f, BRICK = 0xc27a52, STONE = 0xd9cfb8, SHADE = 0xc2b79e;
  // (the house on its south side takes up only the west half of that side, so the square is open to the south-east)
  area(k, [[-68.5, 57], [-41.5, 57], [-41.5, 79.5], [-56.5, 79.5], [-56.5, 72], [-68.5, 72]], PLAZA);

  // --- the church: a front with a gable and a round window, and a bell tower behind its shoulder ---
  const cx0 = -68, cx1 = -59.5, cz0 = 49, cz1 = 57, cxm = (cx0 + cx1) / 2, ch = 10.5;
  b.box(cx0, 0, cz0, cx1, ch, cz1, CREAM, { win: { cell: 2.1, storey: ch, lit: 0.3, kind: 6 }, seed: 0.2, faces: 'NEW' });
  b.box(cx0 - 0.1, 0, cz1, cx1 + 0.1, ch, cz1 + 0.3, CREAM, { faces: 'ESW' });
  tri(b, [cx0 - 0.1, ch, cz1 + 0.3], [cx1 + 0.1, ch, cz1 + 0.3], [cxm, ch + 2.6, cz1 + 0.3], [0, 0, 1], CREAM);
  b.quad([cx1 + 0.1, ch, cz1 + 0.3], [cx1 + 0.1, ch, cz0], [cxm, ch + 2.6, cz0], [cxm, ch + 2.6, cz1 + 0.3], [0.5, 0.86, 0], TILE);
  b.quad([cx0 - 0.1, ch, cz0], [cx0 - 0.1, ch, cz1 + 0.3], [cxm, ch + 2.6, cz1 + 0.3], [cxm, ch + 2.6, cz0], [-0.5, 0.86, 0], TILE);
  tri(b, [cx0 - 0.1, ch, cz0], [cx1 + 0.1, ch, cz0], [cxm, ch + 2.6, cz0], [0, 0, -1], CREAM);
  b.box(cx0 - 0.1, ch * 0.5, cz1 + 0.3, cx1 + 0.1, ch * 0.5 + 0.3, cz1 + 0.38, STONE, { faces: 'S' });
  b.box(cxm - 0.85, 0, cz1 + 0.3, cxm + 0.85, 3.2, cz1 + 0.36, DARK, { faces: 'S' });
  roundel(b, [cxm, 3.2, cz1 + 0.36], 0.85, 'S', DARK, {}, 8);
  roundel(b, [cxm, 8.2, cz1 + 0.34], 1.0, 'S', 0x5a6fe0, { win: interior(0.9) }, 12);
  const bt = 1.3, btx = cx0 + bt, btz = cz0 + bt, stage = 5.4;
  b.box(btx - bt, 0, btz - bt, btx + bt, stage * 4, btz + bt, BRICK, { win: { cell: 1.3, storey: stage, lit: 0.3, kind: 6 }, seed: 0.6, faces: 'NESW' });
  b.box(btx - bt - 0.2, stage * 4, btz - bt - 0.2, btx + bt + 0.2, stage * 4 + 0.35, btz + bt + 0.2, STONE);
  b.cyl(btx, btz, stage * 4 + 0.35, stage * 4 + 3.2, bt * D, 0.05, 4, TILE, { cap: false });

  // --- the town hall: an arcade below, two floors above, battlements, and the clock tower at its corner ---
  const hx0 = -58.5, hx1 = -42, hz0 = 50, hz1 = 57, hh = 11.4, st = hh / 3;
  b.box(hx0, 0, hz0, hx1, hh, hz1, OCHRE, { win: { cell: 2.06, storey: st, lit: 0.45, kind: 0 }, seed: 0.4, top: TILE });
  // the arcade: a dark arch in every bay, between pale piers
  const bays = 6, bay = (hx1 - hx0 - 3.2) / bays;
  for (let i = 0; i < bays; i++) {
    const x = hx0 + 3.2 + bay * (i + 0.5);
    b.box(x - bay * 0.36, 0, hz1, x + bay * 0.36, st * 0.62, hz1 + 0.05, DARK, { faces: 'S', win: interior(0.5) });
    roundel(b, [x, st * 0.62, hz1 + 0.05], bay * 0.36, 'S', DARK, { win: interior(0.5) }, 8);
  }
  b.box(hx0 + 3.2, st - 0.15, hz1, hx1, st + 0.15, hz1 + 0.12, STONE, { faces: 'ESWTB' });
  // battlements cut like swallows' tails
  for (let x = hx0 + 3.7; x < hx1 - 0.6; x += 2.25) {
    b.box(x, hh, hz1 - 0.4, x + 0.8, hh + 0.7, hz1, OCHRE);
    for (const dx of [0, 0.5]) b.box(x + dx, hh + 0.7, hz1 - 0.4, x + dx + 0.3, hh + 1.1, hz1, OCHRE);
  }
  const ctx = hx0 + 1.5, ctz = hz1 - 1.5, ct = 1.5;
  b.box(ctx - ct, 0, ctz - ct, ctx + ct, 18, ctz + ct, BRICK, { win: { cell: 1.5, storey: 6, lit: 0.3, kind: 6 }, seed: 0.8, faces: 'NESW' });
  b.box(ctx - ct - 0.25, 18, ctz - ct - 0.25, ctx + ct + 0.25, 18.5, ctz + ct + 0.25, STONE);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.box(ctx + sx * 1.35 - 0.3, 18.5, ctz + sz * 1.35 - 0.3, ctx + sx * 1.35 + 0.3, 19.4, ctz + sz * 1.35 + 0.3, BRICK);
  roundel(b, [ctx, 14.6, ctz + ct + 0.04], 1.0, 'S', 0xf6efd9, { win: interior(1.4) }, 12);
  b.box(ctx - 0.05, 14.6, ctz + ct + 0.06, ctx + 0.05, 15.4, ctz + ct + 0.08, BLACK, { faces: 'S' });
  b.box(ctx, 14.55, ctz + ct + 0.06, ctx + 0.55, 14.65, ctz + ct + 0.08, BLACK, { faces: 'S' });
  bandedFlag(b, ctx, ctz, 18.5, 5.5, ITALY);

  // --- the fountain: a round basin, two bowls, and a figure in bronze on top ---
  const fx = -57, fz = 64.6;
  b.cyl(fx, fz, 0, 0.3, 3.0, 3.0, 12, SHADE, { cap: SHADE });
  b.cyl(fx, fz, 0.3, 0.8, 2.5, 2.5, 12, STONE, { cap: STONE });
  b.cyl(fx, fz, 0.8, 0.82, 2.25, 2.25, 12, WATER, { cap: WATER, win: interior(0.4) });
  lathe(b, fx, fz, [[0.55, 0.8], [0.4, 1.8], [1.35, 2.1], [1.35, 2.25], [0.3, 2.4], [0.25, 3.2], [0.75, 3.4], [0.75, 3.5], [0.2, 3.6]], 8, STONE);
  figure(b, fx, fz, 3.6, { coat: 0x4d6b5c, legs: 0x4d6b5c, skin: 0x4d6b5c, hat: 0x4d6b5c, hatH: 0.1, hatR: 0.26 });

  // --- tables under parasols in the corner of the square, and scooters in a row ---
  const shades = [0xf2ead8, 0xe8943a, 0xf2ead8, 0xc8523f, 0xf2ead8];
  shades.forEach((shade, i) => {
    const x = -54 + (i % 3) * 3.3 + (i > 2 ? 1.6 : 0), z = i > 2 ? 77.6 : 74.6;
    b.cyl(x, z, 0, 2.3, 0.06, 0.06, 4, 0x8d8a83, { cap: false });
    b.cyl(x, z, 0.72, 0.8, 0.5, 0.5, 6, 0xf2efe6);
    b.cyl(x, z, 2.1, 2.75, 1.35, 0.06, 8, shade, { cap: false });
    k.person(x + 0.85, z + 0.2);
    k.person(x - 0.8, z - 0.3);
  });
  const paints = [0x8fc0a9, 0xf2ead8, 0xc8523f, 0xa9cfe0, 0xe9d28f];
  paints.forEach((paint, i) => twoWheeler(b, -43.2, 72.6 + i * 1.15, 0.25, paint, true));
  // an ice-cream cart
  b.box(-45.4, 0.35, 59.2, -43.8, 1.3, 60.1, 0xf2ead8);
  b.quad([-45.6, 2.3, 59.0], [-43.6, 2.3, 59.0], [-43.6, 2.3, 60.3], [-45.6, 2.3, 60.3], [0, 1, 0], 0xe8748a);
  b.quad([-45.6, 2.3, 59.0], [-43.6, 2.3, 59.0], [-43.6, 2.3, 60.3], [-45.6, 2.3, 60.3], [0, -1, 0], 0xf2ead8);
  for (const x of [-45.5, -43.7]) b.box(x - 0.04, 1.3, 59.6, x + 0.04, 2.3, 59.68, 0x8d8a83, { faces: 'NESW' });
  k.person(-44.6, 60.7);

  for (let i = 0; i < 12; i++) {
    const x = -67 + k.rand() * 24, z = 58 + k.rand() * 10.5;
    if (Math.hypot(x - fx, z - fz) > 3.6 && Math.hypot(x + 50, z - 66) > 4.6) k.person(x, z);
  }
  k.lights.push({ x: fx, z: fz, r: 11, color: '#ffe2ae', k: 0.6 }, { x: -50, z: 59.5, r: 12, color: '#ffd9a0', k: 0.6 }, { x: -49.5, z: 76, r: 10, color: '#ffd9a0', k: 0.65 }, { x: cxm, z: cz1 + 3, r: 9, color: '#ffe9c4', k: 0.5 });
}

// ---------------------------------------------------------------------------
// Lingotto
// ---------------------------------------------------------------------------

/**
 * Lingotto: the long factory with the test track on its roof. The track's
 * two bends are banked, and inside its loop stand the glass bubble on its
 * legs and the steel box of the picture gallery.
 */
export function lingotto(k: Build): void {
  const b = k.b, r = LINGOTTO_ROOF;
  const x0 = -103, x1 = -83.5, z0 = 22, z1 = 92, CONCRETE = 0xf1ede2, ROOF = 0xb9b6ae, BANK = 0xdad6ca;
  b.box(x0, 0, z0, x1, r.y, z1, CONCRETE, { win: { cell: 2.4, storey: 5, lit: 0.35, kind: 0 }, seed: 0.21, top: ROOF });
  const track = buildPath([{ t: 'ring', pts: [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]], y: r.y, r: 5.25 }], true);
  roadDeck(k, track, 2.9, { thick: 0, wall: 0, lanes: 1, lift: 0.05, structure: false });

  // the banking outside each bend: the track is level here, so the slope stands round it
  const xm = (r.x0 + r.x1) / 2, inner = 8.2, outer = 9.6, rise = 2.1, n = 12;
  for (const end of [-1, 1]) {
    const zm = end < 0 ? r.z0 + 5.25 : r.z1 - 5.25;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI, a1 = ((i + 1) / n) * Math.PI, am = (a0 + a1) / 2;
      const at = (a: number, rr: number, y: number): V3 => [xm + Math.cos(a) * rr, r.y + y, zm + end * Math.sin(a) * rr];
      const nl = Math.hypot(rise, outer - inner);
      b.quad(at(a0, inner, 0.05), at(a1, inner, 0.05), at(a1, outer, rise), at(a0, outer, rise), [(-Math.cos(am) * rise) / nl, (outer - inner) / nl, (-end * Math.sin(am) * rise) / nl], BANK);
      b.quad(at(a0, outer, 0), at(a1, outer, 0), at(a1, outer, rise), at(a0, outer, rise), [Math.cos(am), 0, end * Math.sin(am)], CONCRETE);
    }
  }

  // inside the loop: the bubble, a landing place beside it, and the gallery's steel box
  const bz = 40.5, by = r.y + 3.1, R = 2.2;
  for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.beam([xm + dx * 1.5, r.y, bz + dz * 1.5], [xm + dx * 0.8, by - 1.2, bz + dz * 0.8], 0.09, 0.09, 0xdadada);
  lathe(b, xm, bz, [-70, -42, -14, 14, 42, 70, 88].map((t): [number, number] => [R * Math.cos(rad(t)), by + R * Math.sin(rad(t))]), 10, 0x8fc7e8, { win: interior(0.9) });
  b.cyl(xm, 46.6, r.y, r.y + 1.2, 0.3, 0.3, 6, 0xdadada, { cap: false });
  b.cyl(xm, 46.6, r.y + 1.2, r.y + 1.4, 2.2, 2.2, 12, 0x5c6066, { cap: 0x6d7178 });
  b.cyl(xm, 46.6, r.y + 1.4, r.y + 1.42, 1.5, 1.5, 12, 0xf2efe6, { cap: 0xf2efe6 });
  b.cyl(xm, 46.6, r.y + 1.42, r.y + 1.44, 1.2, 1.2, 12, 0x6d7178, { cap: 0x6d7178 });
  const gz0 = 68.5, gz1 = 76.5;
  for (const [dx, z] of [[-1.3, gz0 + 1], [1.3, gz0 + 1], [-1.3, gz1 - 1], [1.3, gz1 - 1]]) b.box(xm + dx - 0.15, r.y, z - 0.15, xm + dx + 0.15, r.y + 2.2, z + 0.15, 0x8d9299, { faces: 'NESW' });
  b.box(xm - 1.9, r.y + 2.2, gz0, xm + 1.9, r.y + 4.6, gz1, 0xc9ced3, { faces: 'NESWTB' });
  b.box(xm - 2.2, r.y + 4.6, gz0 - 0.4, xm + 2.2, r.y + 4.85, gz1 + 0.4, 0xb0b5bb, { faces: 'NESWTB' });
  k.lights.push({ x: xm, z: bz, r: 8, color: '#bfe2ff', k: 0.5 });
}

// ---------------------------------------------------------------------------
// Maranello
// ---------------------------------------------------------------------------

/**
 * Maranello's factory gate: a long low house in warm red with an archway
 * through the middle of it, the works behind under a roof like the teeth of
 * a saw, and the town's name on the sign at the roadside. No maker's name,
 * and no badge.
 */
export function maranello(k: Build): void {
  const b = k.b;
  const RED = 0xc4523c, CREAM = 0xf0e2c0, SHED = 0xd8d4c8, GLASS = 0xbfe0ee;
  /** The gate house runs north to south, and its front looks east onto the forecourt. */
  const gx = -58, gz0 = 95.5, gz1 = 108, gzc = (gz0 + gz1) / 2, half = (gz1 - gz0) / 2, deep = 2.5, h = 7.4, way = 1.6;
  const win: WinSpec = { cell: 2.25, storey: h / 2, lit: 0.4, kind: 0 };
  b.moved(gx, 0, gzc, Math.PI / 2, () => {
    // (in here the house runs along x, and its front is the side that faces north)
    for (const [xa, xb] of [[-half, -way], [way, half]]) {
      b.box(xa, 0, -deep, xb, h, deep, RED, { win, seed: 0.2 + xa * 0.01, faces: 'NESW' });
      b.box(xa, h / 2 - 0.15, -deep - 0.06, xb, h / 2 + 0.15, -deep, CREAM, { faces: 'NTB' });
    }
    archway(b, 0, -deep, deep, way * 2, 2.9, h, RED, CREAM);
    b.box(-half - 0.15, h - 0.3, -deep - 0.15, half + 0.15, h + 0.1, deep + 0.15, CREAM);
    hipped(b, -half - 0.1, -deep - 0.1, half + 0.1, deep + 0.1, h + 0.1, h + 1.8, 1.6, deep + 0.1, TILE);
    // a plain yellow panel over the arch, where a badge would be, and the flag
    b.box(-0.7, 5.0, -deep - 0.08, 0.7, 6.4, -deep, 0xf2c81e, { faces: 'N' });
    bandedFlag(b, 0, 0, h + 1.8, 5, ITALY);
  });

  // --- the works behind it: three bays, each with a slope of roof and an upright side of glass that faces east ---
  const sx0 = -70, sx1 = gx - deep - 0.6, sh = 4.6, bayW = (sx1 - sx0) / 3;
  b.box(sx0, 0, gz0, sx1, sh, gz1, SHED, { win: { cell: 3, storey: sh, lit: 0.3, kind: 4 }, seed: 0.5, faces: 'NESW' });
  for (let i = 0; i < 3; i++) {
    const xa = sx0 + i * bayW, xb = xa + bayW;
    b.quad([xa, sh, gz1], [xb, sh + 1.9, gz1], [xb, sh + 1.9, gz0], [xa, sh, gz0], [-0.5, 0.86, 0], 0xc2beb2);
    b.quad([xb, sh, gz1], [xb, sh, gz0], [xb, sh + 1.9, gz0], [xb, sh + 1.9, gz1], [1, 0, 0], GLASS, { win: interior(0.7) });
    for (const [z, nz] of [[gz0, -1], [gz1, 1]]) tri(b, [xa, sh, z], [xb, sh, z], [xb, sh + 1.9, z], [0, 0, nz], SHED);
  }
  b.cyl(sx0 - 1.6, 104.5, 0, 13, 0.75, 0.55, 8, 0xc27a52, { cap: DARK });

  // --- the forecourt in front of the gate, with a low hedge along its far side, and the town's name at the roadside ---
  area(k, rect(gx + deep, 94.6, -38.6, 108.4), 0xd3cab6);
  b.box(gx + deep, 0, 108.4, -38.6, 0.9, 109, 0x4f8f4a);
  for (const dz of [-1.6, 1.6]) b.box(-39.26, 0, 96.6 + dz - 0.06, -39.14, 2.9, 96.6 + dz + 0.06, 0x8d8a83, { faces: 'NESW' });
  k.sign('maranello', -39.1, 2.3, 96.6, 1, 0, 1.25, 4.4);
  k.sign('maranello', -39.3, 2.3, 96.6, -1, 0, 1.25, 4.4);

  for (let i = 0; i < 9; i++) {
    const x = gx + deep + 0.8 + k.rand() * 14, z = 95.4 + k.rand() * 12;
    if (Math.hypot(x + 47, z - 101.5) > 4.6) k.person(x, z);
  }
  k.lights.push({ x: -51, z: gzc, r: 12, color: '#ffd9a0', k: 0.7 }, { x: -45, z: gzc + 3, r: 11, color: '#fff3dc', k: 0.6 }, { x: -52, z: 96, r: 9, color: '#ffd9a0', k: 0.45 });
}

// ---------------------------------------------------------------------------
// Sant'Agata
// ---------------------------------------------------------------------------

/**
 * Sant'Agata's museum: a dark block and a hall of glass beside it, a yellow
 * canopy over the door, and a forecourt with a turntable for a hero to stand
 * on. The town's name is on the sign. No maker's name, and no badge.
 */
export function santAgata(k: Build): { x: number; y: number; z: number } {
  const b = k.b;
  const ANTHRACITE = 0x2f3238, YELLOW = 0xf2c81e, GLASS = 0x9fc6d6, STEEL = 0x8d9299;
  const x0 = -64, x1 = -40, z0 = 22.6, z1 = 32.4, xs = -54, h = 8.4;
  b.box(x0, 0, z0, xs, h - 1.2, z1, ANTHRACITE, { win: { cell: 2.5, storey: (h - 1.2) / 2, lit: 0.3, kind: 4 }, seed: 0.2, top: 0x4b4f57 });
  b.box(x0 - 0.05, 3.3, z1, xs, 3.7, z1 + 0.06, YELLOW, { faces: 'S' });
  // the hall of glass, lit from inside at night
  b.box(xs, 0, z0 + 0.4, x1, h, z1, GLASS, { win: { cell: 2.0, storey: h / 2, lit: 0.95, kind: 1 }, seed: 0.6, top: 0x5c6066 });
  b.box(xs - 0.1, h - 0.5, z0 + 0.3, x1 + 0.1, h + 0.15, z1 + 0.1, ANTHRACITE, { faces: 'NESW' });
  b.box(xs - 0.1, 0, z0 + 0.3, x1 + 0.1, 0.45, z1 + 0.1, ANTHRACITE, { faces: 'NESW' });
  // the canopy over the door
  b.box(xs + 4, 3.4, z1, xs + 10, 3.62, z1 + 2.1, YELLOW, { faces: 'NESWTB' });
  for (const x of [xs + 4.3, xs + 9.7]) b.box(x - 0.08, 0, z1 + 1.85, x + 0.08, 3.4, z1 + 2.0, STEEL, { faces: 'NESW' });

  // --- the forecourt: asphalt, and a turntable with a yellow rim ---
  area(k, rect(-83, 22, -64.6, 32.4), 0x55575d);
  const tx = -73.6, tz = 27.2;
  b.cyl(tx, tz, 0, 0.3, 4.5, 4.5, 20, YELLOW, { cap: false });
  b.cyl(tx, tz, 0, 0.32, 4.2, 4.2, 20, 0x3a3d44, { cap: 0x3a3d44 });
  bandedFlag(b, -82.4, 31.4, 0, 7, ITALY);
  bandedFlag(b, -82.4, 29.9, 0, 7, [YELLOW, YELLOW, BLACK]);
  for (const dx of [-1.9, 1.9]) b.box(-68.2 + dx - 0.06, 0, 31.74, -68.2 + dx + 0.06, 3.3, 31.86, 0x8d8a83, { faces: 'NESW' });
  k.sign('sant-agata', -68.2, 2.4, 31.9, 0, 1, 1.7, 5.6);
  k.sign('sant-agata', -68.2, 2.4, 31.7, 0, -1, 1.7, 5.6);

  for (let i = 0; i < 9; i++) {
    const a = k.rand() * Math.PI * 2, rr = 5.3 + k.rand() * 1.6;
    const x = tx + Math.cos(a) * rr, z = Math.min(31.2, Math.max(22.6, tz + Math.sin(a) * rr));
    k.person(x, z);
  }
  for (let i = 0; i < 4; i++) k.person(xs + 5 + k.rand() * 4, z1 + 0.6 + k.rand() * 1.2);
  k.lights.push({ x: tx, z: tz, r: 11, color: '#fff3dc', k: 0.75 }, { x: xs + 7, z: z1 + 2.5, r: 10, color: '#ffe9a0', k: 0.6 }, { x: x1 - 4, z: z1 + 2.5, r: 9, color: '#cfe8ff', k: 0.5 });
  return { x: tx, y: 0.34, z: tz };
}

/**
 * A corner of Tuscany, beyond the works: rows of vines, a farmhouse of stone
 * under a tiled roof with a dovecote on it, and cypresses along the lane.
 */
export function vineyard(k: Build): void {
  const b = k.b;
  const STONE = 0xd9c39a, VINE = 0x5d8a3a;
  area(k, rect(-103.6, 95.2, -73.4, 112.6), 0xcdb682);
  for (let i = 0; i < 10; i++) b.box(-102.6, 0, 96.4 + i * 1.6, -84.4, 1.1, 96.9 + i * 1.6, VINE);
  // the farmhouse
  const x0 = -81.6, x1 = -75.4, z0 = 100.2, z1 = 105.6, h = 5.4;
  b.box(x0, 0, z0, x1, h, z1, STONE, { win: { cell: 2.07, storey: h / 2, lit: 0.4, kind: 4 }, seed: 0.4, faces: 'NESW' });
  hipped(b, x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3, h, h + 1.5, 2.0, (z1 - z0) / 2 + 0.3, TILE);
  b.box(x0 + 0.6, h + 0.5, z0 + 1.7, x0 + 2.6, h + 2.9, z0 + 3.7, STONE, { win: { cell: 1, storey: 1.45, lit: 0.3, kind: 4 }, seed: 0.7, faces: 'NESW' });
  hipped(b, x0 + 0.4, z0 + 1.5, x0 + 2.8, z0 + 3.9, h + 2.9, h + 3.7, 1.2, 1.2, TILE);
  b.box(x1 - 2.2, 0, z1, x1 - 1.0, 2.4, z1 + 0.05, DARK, { faces: 'S' });
  for (const z of [97, 99.4, 107.6, 110]) k.tree(-83.2, z, 0.8, true);
  for (const [x, z] of [[-78.4, 108.6], [-93, 96.1], [-88.6, 104.6]]) k.person(x, z);
  k.lights.push({ x: -78.5, z: 107.6, r: 9, color: '#ffd9a0', k: 0.55 });
}

/** Lanterns along the Arno's west bank, for the walk between the Colosseum and the Ponte Vecchio. */
export function lungarnoLanterns(k: Build): void {
  for (const z of [64, 72, 80]) lantern(k, ARNO_X - 9.2, z, 0, 2.4, 0x2f3a33);
}
