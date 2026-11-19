// Paris: the Arc de Triomphe in its star, the Place de la Concorde, the
// Louvre, Notre-Dame on its island, Sacré-Cœur on Montmartre, the Moulin
// Rouge at the foot of the hill, a corner café with its Métro entrance, the
// Trocadéro, and what stands round the foot of the Eiffel Tower.

import * as THREE from 'three';
import { placed } from '../../engine/build';
import { GeoBuilder, interior, type V3, type WinSpec } from '../../engine/geo';
import { LAWN, PLAZA, area, rect } from '../../engine/ground';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { D, GOLD, archway, figure, hipped, lantern, lathe, parasol, pinnacle, rad, roundel, tri } from './parts';
import { ARC, CONCORDE, HILL, SEINE_Z, onHill } from './plan';

const WATER = 0x7fc4e0, IRON_GREEN = 0x2f5d48;

export const PARIS_SIGNS: SignDef[] = [
  // The Moulin Rouge is a real cabaret, open on the boulevard de Clichy: its name, in plain lettering on a plain board
  { id: 'moulin-rouge', lines: ['MOULIN ROUGE'], color: '#b3202a', ink: '#ffffff', aspect: 7.6, kind: 'board', real: true },
  { id: 'metro', lines: ['MÉTRO'], color: '#f0e6b8', ink: '#2f5d48', aspect: 3.2, kind: 'board' },
];

/** Where these things stand, as boxes on the ground, for the check that nothing stands in a street. */
export const PARIS_GROUND: [string, number, number, number, number][] = [
  ['The Louvre', 39.6, -22.4, 71.4, -14.6],
  ["The Louvre's west wing", 39.6, -36.4, 47.4, -22],
  ["The Louvre's east wing", 63.6, -28.8, 71.4, -22],
  ['The Arc du Carrousel', 53.3, -39.2, 57.7, -37.2],
  ['The Moulin Rouge', 51, -111.5, 62, -101.9],
  ['The carousel', 43.2, -107.8, 47.8, -103.2],
  ['The café', 22, 46, 34, 59.2],
  ['The bandstand', 95.9, -9.1, 100.5, -4.5],
  ['The Trocadéro, west', -25.6, -22.2, -22, -7.6],
  ['The Trocadéro, east', -13.4, -22.2, -9.8, -7.6],
];

/** A small fountain: a round basin of water, and bronze bowls one above the other in the middle of it. */
function fountain(b: GeoBuilder, x: number, z: number, y: number, r: number, stone: number): void {
  b.cyl(x, z, y, y + 0.45, r, r, 10, stone, { cap: stone });
  b.cyl(x, z, y + 0.45, y + 0.47, r - 0.22, r - 0.22, 10, WATER, { cap: WATER, win: interior(0.4) });
  const s = r / 1.35;
  lathe(b, x, z, [[0.35 * s, y + 0.45], [0.25 * s, y + 1.3], [0.85 * s, y + 1.55], [0.85 * s, y + 1.65], [0.2 * s, y + 1.75], [0.15 * s, y + 2.4], [0.5 * s, y + 2.6], [0.5 * s, y + 2.68], [0.08 * s, y + 2.8]], 8, 0x3f5a4e);
  b.cyl(x, z, y + 2.8, y + 3.1, 0.1 * s, 0.02, 4, GOLD, { cap: false });
}

// ---------------------------------------------------------------------------
// The Arc de Triomphe
// ---------------------------------------------------------------------------

/**
 * The Arc de Triomphe: two great piers and the vault between them, a lesser
 * arch through each pier, the carved groups at its feet, and the attic above
 * the cornice, with people on the roof. The flag hangs under the vault, and
 * under the flag is the tomb of the unknown soldier.
 */
export function arcDeTriomphe(k: Build): void {
  const STONE = 0xe6dcc3, SHADE = 0xd4c8aa, PALE = 0xf1e9d4, DARK = 0x4a4038, BRONZE = 0x5a4a3a;
  // it looks down the Champs-Élysées
  const turn = THREE.MathUtils.radToDeg(Math.atan2(-(CONCORDE[0] - ARC[0]), CONCORDE[1] - ARC[1]));
  placed(k, ARC[0], ARC[1], turn, (q) => {
    const b = q.b;
    /** Half its width and half its depth, half the width of the great arch, and the heights of its parts. */
    const W = 6.6, Dp = 3.4, open = 2.7, spring = 11.6, yA = 15.4, yF = 17.2, yC = 17.8, yT = 21.4;
    b.cyl(0, 0, 0, 0.2, 9, 9, 28, PLAZA);
    for (const s of [-1, 1]) {
      const xa = s > 0 ? open : -W, xb = s > 0 ? W : -open, xm = (xa + xb) / 2;
      b.box(xa, 0.2, -Dp, xb, yA, Dp, STONE, { faces: 'NESW' });
      b.box(xa - 0.15, 0.2, -Dp - 0.15, xb + 0.15, 1.5, Dp + 0.15, SHADE);
      for (const f of [-1, 1]) {
        // on each face of each pier: a great group of figures on its plinth, and a panel carved in relief above it
        b.box(xm - 1.25, 1.5, f > 0 ? Dp : -Dp - 0.5, xm + 1.25, 2.3, f > 0 ? Dp + 0.5 : -Dp, SHADE);
        b.box(xm - 0.95, 2.3, f > 0 ? Dp : -Dp - 0.4, xm + 0.95, 6.8, f > 0 ? Dp + 0.4 : -Dp, PALE);
        b.box(xm - 1.3, 8.4, f > 0 ? Dp : -Dp - 0.12, xm + 1.3, 10.8, f > 0 ? Dp + 0.12 : -Dp, PALE);
      }
      // the lesser arch that runs through the pier from side to side
      b.box(s > 0 ? W : -W - 0.05, 0.2, -1.1, s > 0 ? W + 0.05 : -W, 6.2, 1.1, DARK, { faces: s > 0 ? 'E' : 'W' });
      roundel(b, [s * (W + 0.05), 6.2, 0], 1.1, s > 0 ? 'E' : 'W', DARK);
    }
    archway(b, 0, -Dp, Dp, open * 2, spring, yA, STONE, SHADE);
    b.box(-W - 0.12, yA, -Dp - 0.12, W + 0.12, yF, Dp + 0.12, SHADE, { faces: 'NESWB' });
    b.box(-W - 0.5, yF, -Dp - 0.5, W + 0.5, yC, Dp + 0.5, STONE, { faces: 'NESWTB' });
    b.box(-W + 0.25, yC, -Dp + 0.25, W - 0.25, yT, Dp - 0.25, STONE, { faces: 'NESW' });
    b.box(-W + 0.05, yT, -Dp + 0.05, W - 0.05, yT + 0.45, Dp - 0.05, SHADE, { top: PALE, faces: 'NESWTB' });

    // the flag that hangs under the vault
    for (const [color, x0] of [[0x1f3f93, -1.5], [0xf4f1e8, -0.5], [0xc8202c, 0.5]]) {
      for (const f of [-1, 1]) b.quad([x0, 6.8, f * 0.02], [x0 + 1, 6.8, f * 0.02], [x0 + 1, 13.4, f * 0.02], [x0, 13.4, f * 0.02], [0, 0, f], color);
    }
    // under it, the tomb of the unknown soldier: a slab in the paving, and the flame that is never put out
    b.box(-1.0, 0.2, -0.55, 1.0, 0.3, 0.55, BRONZE);
    q.glows.push({ x: 0, y: 0.52, z: 0, sx: 0.2, sy: 0.36, sz: 0.2, color: '#ffb050' });

    // people on the roof, and before and behind it
    for (let i = 0; i < 6; i++) q.person(-5.4 + q.rand() * 10.8, -2.2 + q.rand() * 4.4, yT + 0.45);
    for (let i = 0; i < 14; i++) q.person(-4.5 + q.rand() * 9, (i % 2 ? -1 : 1) * (4.7 + q.rand() * 2.9), 0.2);
    q.lights.push({ x: 0, z: 7.5, r: 13, color: '#ffe2ae', k: 0.7 }, { x: 0, z: -7.5, r: 13, color: '#ffe2ae', k: 0.7 }, { x: 0, z: 0, r: 6, color: '#ffb050', k: 0.5 });
  });
}

// ---------------------------------------------------------------------------
// The Place de la Concorde
// ---------------------------------------------------------------------------

/** The obelisk of the Concorde on its pedestal, with a fountain to either side of it and a lantern at each end. */
export function placeDeLaConcorde(k: Build): void {
  const b = k.b, [cx, cz] = CONCORDE;
  const STONE = 0xcfc6b2, GRANITE = 0xd9a98a;
  b.cyl(cx, cz, 0, 0.25, 6, 6, 24, PLAZA);
  b.box(cx - 1.9, 0.25, cz - 1.9, cx + 1.9, 0.9, cz + 1.9, STONE);
  b.box(cx - 1.4, 0.9, cz - 1.4, cx + 1.4, 3.4, cz + 1.4, 0xe2d9c4);
  // the obelisk: rose granite, cut with signs from top to bottom, and tipped with gold
  b.cyl(cx, cz, 3.4, 19.4, 1.05 * D, 0.6 * D, 4, GRANITE, { win: { cell: 0.92, storey: 0.9, lit: 0, kind: 4 }, seed: 0.5, cap: false });
  b.cyl(cx, cz, 19.4, 21, 0.6 * D, 0.04, 4, 0xe9c94a, { win: interior(1.2), cap: false });
  for (const s of [-1, 1]) {
    fountain(b, cx, cz + s * 4.1, 0.25, 1.35, STONE);
    lantern(k, cx + s * 4.4, cz, 0.25, 2.8, 0x2f3a33);
  }
  for (let i = 0; i < 7; i++) {
    const a = rad((i % 2 ? 180 : 0) - 38 + k.rand() * 76), r = 2.8 + k.rand() * 2.6;
    k.person(cx + Math.cos(a) * r, cz + Math.sin(a) * r, 0.25);
  }
  k.lights.push({ x: cx, z: cz, r: 12, color: '#ffe2ae', k: 0.6 });
}

// ---------------------------------------------------------------------------
// The Louvre
// ---------------------------------------------------------------------------

/**
 * The Louvre: three wings round a court that opens towards the
 * Champs-Élysées, slate roofs, a pavilion with a tall roof at every corner and
 * one with a clock in the middle, the glass pyramid in the court, and the
 * little arch of the Carrousel where the court opens.
 */
export function louvre(k: Build): void {
  const b = k.b;
  const WALL = 0xe6dcc3, SHADE = 0xd3c7aa, SLATE = 0x66707c, LEAD = 0x565f6a, GLASS = 0xa9d3e6, PINK = 0xd9a9a0;
  // (the east wing is the shorter one: the Place de la Concorde comes close to it)
  const x0 = 40, x1 = 71, z0 = -36, z1 = -15, wing = 7, h = 12;
  const win: WinSpec = { cell: 2.2, storey: 4, lit: 0.4, kind: 0 };

  const range = (xa: number, za: number, xb: number, zb: number, faces: string, seed: number, roofTo = zb): void => {
    b.box(xa, 0, za, xb, h, zb, WALL, { win, seed, faces });
    b.box(xa - 0.12, h - 0.4, za - 0.12, xb + 0.12, h + 0.05, zb + 0.12, SHADE);
    hipped(b, xa + 0.3, za + 0.3, xb - 0.3, roofTo - 0.3, h + 0.05, h + 2.6, 2.0, 2.0, SLATE, LEAD);
  };
  range(x0, z1 - wing, x1, z1, 'NESW', 0.3);
  range(x0, z0, x0 + wing, z1 - wing, 'NEW', 0.5, z1 - wing + 2.6);
  range(x1 - wing, z0 + 7.6, x1, z1 - wing, 'NEW', 0.7, z1 - wing + 2.6);

  /** A pavilion: a block that stands a little proud of its wing and higher, under a tall roof that swells and is cut off flat. */
  const pavilion = (xc: number, zc: number, hw: number, hd: number, top: number): void => {
    b.box(xc - hw, 0, zc - hd, xc + hw, top, zc + hd, WALL, { win, seed: xc * 0.07 + zc * 0.03, faces: 'NESW' });
    b.box(xc - hw - 0.15, top - 0.4, zc - hd - 0.15, xc + hw + 0.15, top + 0.05, zc + hd + 0.15, SHADE);
    hipped(b, xc - hw, zc - hd, xc + hw, zc + hd, top + 0.05, top + 2.2, 0.8, 0.8, SLATE);
    hipped(b, xc - hw + 0.8, zc - hd + 0.8, xc + hw - 0.8, zc + hd - 0.8, top + 2.2, top + 3.3, 1.0, 1.0, SLATE, LEAD);
  };
  pavilion(x0 + 3.5, z0 + 2, 3.9, 2.4, 15);
  pavilion(x1 - 3.5, z0 + 9.6, 3.9, 2.4, 15);
  pavilion(x0 + 3.5, z1 - 3.5, 3.9, 3.9, 15);
  pavilion(x1 - 3.5, z1 - 3.5, 3.9, 3.9, 15);
  // the one in the middle, which looks down the court: higher, with a clock
  const mx = (x0 + x1) / 2;
  pavilion(mx, z1 - 3.5, 3.6, 3.9, 16.4);
  roundel(b, [mx, 14.2, z1 - 7.45], 0.9, 'N', 0xf6efd9, { win: interior(1.4) });

  // --- the court, and the pyramid in it ---
  area(k, rect(x0 + wing, z0 + 2, x1 - wing, z1 - wing), PLAZA);
  const pz = z0 + 7.5;
  b.cyl(mx, pz, 0.04, 6.2, 6.6, 0.05, 4, GLASS, { win: interior(1.3), cap: false });
  for (const [x, z] of [[mx, pz - 5.9], [mx - 6.2, pz - 5.2], [mx + 6.2, pz - 5.2]]) b.cyl(x, z, 0.04, 1.7, 1.3, 0.03, 4, GLASS, { win: interior(1.3), cap: false });
  // pools to either side of it, and one behind
  for (const s of [-1, 1]) area(k, [[mx + s * 4.9, pz - 2.4], [mx + s * 8.4, pz], [mx + s * 4.9, pz + 2.4]], WATER, 0.04);
  area(k, [[mx - 2.4, pz + 4.9], [mx, pz + 6.3], [mx + 2.4, pz + 4.9]], WATER, 0.04);
  // the queue for the way in, and people about the court
  for (let i = 0; i < 8; i++) k.person(mx - 8.2 + i * 0.75, pz - 3.3 + i * 0.12);
  for (let i = 0; i < 9; i++) k.person(x0 + wing + 1 + k.rand() * (x1 - x0 - 2 * wing - 2), i < 5 ? z1 - wing - 1 - k.rand() * 2.4 : z0 + 2.4 + k.rand() * 1.2);
  k.lights.push({ x: mx, z: pz, r: 13, color: '#fff3dc', k: 0.6 }, { x: mx - 9, z: pz + 3, r: 10, color: '#ffe2ae', k: 0.4 }, { x: mx + 9, z: pz + 3, r: 10, color: '#ffe2ae', k: 0.4 });

  // --- the Arc du Carrousel, where the court opens: three arches in pink and white, and the gilded chariot on top ---
  const ax = mx, az = z0 - 2.2;
  b.box(ax - 2.2, 0, az - 1.0, ax + 2.2, 4.2, az + 1.0, 0xeae2cc, { top: SHADE });
  b.box(ax - 2.35, 4.2, az - 1.15, ax + 2.35, 4.6, az + 1.15, SHADE);
  for (const f of [-1, 1]) {
    const face = f > 0 ? 'S' : 'N', zf = az + f * 1.04;
    for (const [dx, w, hh] of [[-1.45, 0.42, 2.0], [0, 0.6, 2.7], [1.45, 0.42, 2.0]]) {
      b.box(ax + dx - w, 0, f > 0 ? az + 1.0 : zf, ax + dx + w, hh, f > 0 ? zf : az - 1.0, 0x4a4038, { faces: face });
      roundel(b, [ax + dx, hh, zf], w, face, 0x4a4038, {}, 8);
    }
    // the pink columns between the arches
    for (const dx of [-2.05, -0.82, 0.82, 2.05]) b.box(ax + dx - 0.1, 0.3, f > 0 ? az + 1.0 : az - 1.18, ax + dx + 0.1, 3.6, f > 0 ? az + 1.18 : az - 1.0, PINK, { faces: 'NESW' });
  }
  b.box(ax - 0.8, 4.6, az - 0.3, ax + 0.8, 5.3, az + 0.3, GOLD, { win: interior(0.5) });
  b.box(ax - 0.2, 5.3, az - 0.2, ax + 0.2, 6.0, az + 0.2, GOLD, { win: interior(0.5) });

  // --- the Tuileries, between the court and the Concorde: lawns, and a round basin ---
  area(k, [[47, -49.5], [52.8, -45.6], [52.8, -36.6], [47, -36.6]], LAWN);
  area(k, [[58.2, -42.6], [66, -37.4], [66, -36.6], [58.2, -36.6]], LAWN);
  fountain(b, 63.6, -38.0, 0, 1.25, 0xcfc6b2);
  for (const [x, z] of [[74.2, -25.5], [74.4, -19.5], [60.2, -39.2]]) k.tree(x, z, 0.6);
}

// ---------------------------------------------------------------------------
// Notre-Dame
// ---------------------------------------------------------------------------

/**
 * Notre-Dame, on its island: the west front with its three doors, the rose
 * window and the two square towers; the long roof of the nave; the transept
 * with a rose at each end; the spire over the crossing; the round east end;
 * and the flying buttresses along both sides. The island is the other way
 * round here, so the towers look east, to the Pont Neuf.
 */
export function notreDame(k: Build): void {
  const b = k.b;
  const STONE = 0xe2d6b8, SHADE = 0xcbbf9f, LEAD = 0x7b858c, DARK = 0x3a3340, ROSE = 0x5a6fe0;
  const zc = SEINE_Z;
  /** The west front, the back of the towers, and the middle of the round east end. */
  const xf = 32.2, xt = xf - 3.4, xa = 18.6;
  /** Half the width of the nave, and of the nave with its aisles; how high the walls of each are, and the ridge. */
  const nave = 2.1, aisle = 4.1, hN = 9.5, hA = 4.8, ridge = 13;
  const win: WinSpec = { cell: 1.5, storey: hN / 2, lit: 0.45, kind: 0 };

  // --- the nave and its aisles, and the round east end ---
  b.box(xa, 0, zc - nave, xt, hN, zc + nave, STONE, { win, seed: 0.2, faces: 'NS' });
  b.quad([xa, hN, zc + nave], [xt, hN, zc + nave], [xt, ridge, zc], [xa, ridge, zc], [0, 0.52, 0.86], LEAD);
  b.quad([xt, hN, zc - nave], [xa, hN, zc - nave], [xa, ridge, zc], [xt, ridge, zc], [0, 0.52, -0.86], LEAD);
  tri(b, [xt, hN, zc - nave], [xt, hN, zc + nave], [xt, ridge, zc], [1, 0, 0], STONE);
  for (const s of [-1, 1]) {
    const zo = zc + s * aisle, zn = zc + s * nave;
    b.box(xa, 0, Math.min(zo, zn), xt, hA, Math.max(zo, zn), STONE, { win: { cell: 1.5, storey: hA, lit: 0.45, kind: 0 }, seed: 0.3 + s * 0.1, faces: s > 0 ? 'S' : 'N' });
    b.quad([xa, hA, zo], [xt, hA, zo], [xt, hA + 1.4, zn], [xa, hA + 1.4, zn], [0, 0.82, s * 0.57], LEAD);
  }
  b.cyl(xa, zc, 0, hN, nave, nave, 10, STONE, { win: { cell: 1.32, storey: hN / 2, lit: 0.45, kind: 0 }, seed: 0.6, cap: false });
  b.cyl(xa, zc, hN, ridge, nave, 0.02, 10, LEAD, { cap: false });
  b.cyl(xa, zc, 0, hA, aisle, aisle, 12, STONE, { win: { cell: 2.15, storey: hA, lit: 0.45, kind: 0 }, seed: 0.7, cap: false });
  b.cyl(xa, zc, hA, hA + 1.4, aisle, nave, 12, LEAD, { cap: false });

  // --- the transept: a roof of its own across the nave's, and a rose window in each gable ---
  const tx0 = 22.4, tx1 = 25.0, txm = (tx0 + tx1) / 2, tz = aisle + 0.2, tr = ridge - 0.5;
  b.box(tx0, 0, zc - tz, tx1, hN, zc + tz, STONE, { faces: 'NESW' });
  b.quad([tx1, hN, zc + tz], [tx1, hN, zc - tz], [txm, tr, zc - tz], [txm, tr, zc + tz], [0.8, 0.6, 0], LEAD);
  b.quad([tx0, hN, zc - tz], [tx0, hN, zc + tz], [txm, tr, zc + tz], [txm, tr, zc - tz], [-0.8, 0.6, 0], LEAD);
  for (const s of [-1, 1]) {
    const face = s > 0 ? 'S' : 'N', zw = zc + s * tz;
    tri(b, [tx0, hN, zw], [tx1, hN, zw], [txm, tr, zw], [0, 0, s], STONE);
    roundel(b, [txm, 6.5, zw + s * 0.04], 1.05, face, ROSE, { win: interior(0.9) });
    b.box(txm - 0.45, 0, s > 0 ? zw : zw - 0.05, txm + 0.45, 2.6, s > 0 ? zw + 0.05 : zw, DARK, { faces: face });
  }
  // the spire over the crossing
  b.cyl(txm, zc, ridge - 0.9, ridge + 1.6, 0.75, 0.6, 8, LEAD, { cap: false });
  b.cyl(txm, zc, ridge + 1.6, 27.2, 0.6, 0.03, 8, LEAD, { cap: false });
  b.cyl(txm, zc, 27.2, 27.9, 0.07, 0.07, 4, GOLD, { win: interior(0.8) });

  // --- flying buttresses: a pier with a pinnacle on it, and an arm across to the wall of the nave ---
  for (const x of [19.8, 21.4, 26.0, 27.6]) {
    for (const s of [-1, 1]) {
      const zo = zc + s * aisle, zp = zc + s * (aisle + 0.7);
      b.box(x - 0.2, 0, Math.min(zo, zp), x + 0.2, 7.0, Math.max(zo, zp), SHADE);
      pinnacle(b, x, zc + s * (aisle + 0.35), 7.0, 1.7, 0.2, STONE);
      b.beam([x, 6.5, zc + s * (aisle + 0.3)], [x, 8.6, zc + s * nave], 0.13, 0.13, STONE);
    }
  }

  // --- the west front ---
  const hw = 4.4, yG = 10.25, yT = 20.5;
  b.box(xt, 0, zc - hw, xf, yG, zc + hw, STONE, { faces: 'NESWT' });
  /** A doorway, or a window, with a pointed head. */
  const pointed = (z: number, w: number, y0: number, y1: number, tip: number, color: number, lit = 0): void => {
    b.box(xf, y0, z - w, xf + 0.05, y1, z + w, color, { faces: 'E', win: lit ? interior(lit) : undefined });
    tri(b, [xf + 0.05, y1, z - w], [xf + 0.05, y1, z + w], [xf + 0.05, y1 + tip, z], [1, 0, 0], color, { win: lit ? interior(lit) : undefined });
  };
  pointed(zc, 0.8, 0, 3.5, 1.3, DARK);
  for (const s of [-1, 1]) {
    pointed(zc + s * 2.75, 0.65, 0, 3.0, 1.1, DARK);
    pointed(zc + s * 2.75, 0.5, 6.5, 8.0, 0.8, ROSE, 0.7);
  }
  // the gallery of kings, the rose, and the open gallery under the towers
  b.box(xf, 5.0, zc - hw, xf + 0.12, 5.8, zc + hw, SHADE, { faces: 'NESTB' });
  roundel(b, [xf + 0.06, 7.6, zc], 1.25, 'E', ROSE, { win: interior(0.9) }, 12);
  b.box(xt - 0.1, yG - 1.2, zc - hw - 0.1, xf + 0.12, yG, zc + hw + 0.1, SHADE, { faces: 'NESWTB' });
  // the two towers: square and flat-topped, with two tall openings on every side
  for (const s of [-1, 1]) {
    const za = s > 0 ? zc + 1.0 : zc - hw, zb = s > 0 ? zc + hw : zc - 1.0;
    b.box(xt, yG, za, xf, yT, zb, STONE, { win: { cell: 1.7, storey: yG, lit: 0.3, kind: 6 }, seed: 0.4 + s * 0.1, faces: 'NESW' });
    b.box(xt - 0.1, yT - 0.4, za - 0.1, xf + 0.1, yT + 0.3, zb + 0.1, SHADE, { top: LEAD });
  }

  // --- the square in front of it ---
  for (const s of [-1, 1]) lantern(k, xf + 2.4, zc + s * 3.6, 0, 2.4, 0x2f3a33);
  for (let i = 0; i < 11; i++) k.person(xf + 0.6 + k.rand() * 2.4, zc - 4.4 + k.rand() * 8.8);
  k.lights.push({ x: xf + 2, z: zc, r: 11, color: '#ffe9c4', k: 0.7 }, { x: 23, z: zc + 5, r: 10, color: '#ffe9c4', k: 0.5 }, { x: 23, z: zc - 5, r: 10, color: '#ffe9c4', k: 0.5 });
}

// ---------------------------------------------------------------------------
// Sacré-Cœur
// ---------------------------------------------------------------------------

/**
 * Sacré-Cœur, on top of Montmartre: white, with a great tall dome and four
 * small ones about it, three arches in front, the bell tower behind, and the
 * steps that lead down the hill from its door. It looks down the hill.
 */
export function sacreCoeur(k: Build): void {
  const WHITE = 0xf3f0e7, SHADE = 0xddd8c9, DARK = 0x3d3a44, GREEN = 0x4d7a68;
  const S = HILL.stairs, tc = (S.t0 + S.t1) / 2, oc = 34.5;
  const [x, z] = onHill(tc, oc);
  const turn = THREE.MathUtils.radToDeg(Math.atan2(HILL.u[1], HILL.u[0]));
  placed(k, x, z, turn, (q) => {
    const b = q.b;
    const hb = 9;
    const slit: WinSpec = { cell: 1.5, storey: hb / 2, lit: 0.4, kind: 6 };
    /** A dome taller than it is wide, as all of this church's are: `r` wide at its foot, and `h` high. */
    const dome = (dx: number, dz: number, y: number, r: number, h: number, sides: number): number => {
      const rings = [0, 18, 36, 54, 68, 78].map((t): [number, number] => [r * Math.cos(rad(t)), y + h * Math.sin(rad(t))]);
      lathe(b, dx, dz, rings, sides, WHITE, { win: interior(0.5) });
      return rings[rings.length - 1][1];
    };

    // --- the body of the church, and the round end behind ---
    b.box(-4.5, 0, -4.5, 4.5, hb, 4.5, WHITE, { win: slit, seed: 0.4, top: SHADE });
    b.box(-4.65, hb - 0.4, -4.65, 4.65, hb + 0.05, 4.65, SHADE, { faces: 'NESW' });
    b.cyl(0, -4.5, 0, 7.4, 3.0, 3.0, 12, WHITE, { win: { cell: 1.57, storey: 3.7, lit: 0.4, kind: 6 }, seed: 0.2, cap: false });
    b.cyl(0, -4.5, 7.4, 9.0, 3.0, 0.3, 12, WHITE, { win: interior(0.4), cap: false });

    // --- the great dome: a drum with a window in every side, a ring of columns at its foot, the dome, and the lantern ---
    b.cyl(0, 0, hb, hb + 0.6, 2.9, 2.9, 12, SHADE, { cap: SHADE });
    b.cyl(0, 0, hb, hb * 1.5, 2.4, 2.4, 12, WHITE, { win: { cell: 1.257, storey: hb / 2, lit: 0.6, kind: 6 }, seed: 0.6, cap: false });
    b.cyl(0, 0, hb * 1.5, hb * 1.5 + 0.4, 2.65, 2.65, 12, SHADE, { cap: SHADE });
    const top = dome(0, 0, hb * 1.5 + 0.4, 2.5, 6.9, 12);
    b.cyl(0, 0, top, top + 2.2, 0.6, 0.6, 8, WHITE, { win: interior(0.9), cap: false });
    lathe(b, 0, 0, [[0.7, top + 2.2], [0.55, top + 2.9], [0.2, top + 3.5]], 8, WHITE, { win: interior(0.5) });
    b.box(-0.06, top + 3.5, -0.06, 0.06, top + 5.0, 0.06, GOLD, { win: interior(0.9) });
    b.box(-0.4, top + 4.3, -0.06, 0.4, top + 4.5, 0.06, GOLD, { win: interior(0.9), faces: 'NESWTB' });
    // --- the four small domes about it ---
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const dx = sx * 3.3, dz = sz * 3.3;
      b.cyl(dx, dz, hb, hb + 2.2, 1.1, 1.1, 8, WHITE, { win: interior(0.3), cap: false });
      const t = dome(dx, dz, hb + 2.2, 1.15, 3.3, 8);
      b.cyl(dx, dz, t, t + 1.3, 0.24, 0.03, 6, WHITE, { cap: false });
    }

    // --- the porch: three arches, and two riders in bronze above them ---
    b.box(-3.6, 0, 4.5, 3.6, 6.4, 6.6, WHITE, { top: SHADE, faces: 'ESWT' });
    for (const dx of [-2.2, 0, 2.2]) {
      b.box(dx - 0.75, 0, 6.6, dx + 0.75, 3.4, 6.65, DARK, { faces: 'S' });
      roundel(b, [dx, 3.4, 6.65], 0.75, 'S', DARK, {}, 8);
    }
    b.box(-1.3, 6.4, 4.5, 1.3, 8.4, 5.4, WHITE, { top: SHADE });
    for (const s of [-1, 1]) {
      b.box(s * 2.7 - 0.25, 6.4, 5.3, s * 2.7 + 0.25, 7.2, 6.4, GREEN);
      b.box(s * 2.7 - 0.18, 7.2, 5.6, s * 2.7 + 0.18, 7.9, 6.0, GREEN);
    }

    // --- the bell tower, behind ---
    const bx = 3.6, bz = -6.6, st = 4.6;
    b.box(bx - 1.25, 0, bz - 1.25, bx + 1.25, st * 5, bz + 1.25, WHITE, { win: { cell: 1.25, storey: st, lit: 0.35, kind: 6 }, seed: 0.8, faces: 'NESW' });
    b.box(bx - 1.4, st * 5, bz - 1.4, bx + 1.4, st * 5 + 0.35, bz + 1.4, SHADE);
    const bt = dome(bx, bz, st * 5 + 0.35, 1.3, 4.6, 8);
    b.cyl(bx, bz, bt, bt + 1.5, 0.28, 0.03, 6, WHITE, { cap: false });

    // --- the steps down the hill, from the terrace in front of the door to the road below it ---
    const zTop = oc - (HILL.rims[2] + S.in), zFoot = oc - S.foot, drop = HILL.heights[2] - HILL.heights[1], n = 6;
    for (let i = 0; i < n; i++) {
      const za = zTop + ((zFoot - zTop) * i) / n, zb = zTop + ((zFoot - zTop) * (i + 1)) / n;
      b.box(-(S.t1 - S.t0) / 2, -drop, za, (S.t1 - S.t0) / 2, -(drop * (i + 1)) / (n + 1), zb, SHADE, { faces: 'ESWT' });
    }
    for (const s of [-1, 1]) lantern(q, s * 3.1, zTop - 0.4, 0, 2.4, 0x2f3a33);
    for (let i = 0; i < 6; i++) {
      const step = Math.floor(q.rand() * n);
      q.person(-2 + q.rand() * 4, zTop + ((zFoot - zTop) * (step + 0.5)) / n, -(drop * (step + 1)) / (n + 1));
    }

    q.lights.push({ x: 0, z: 8, r: 13, color: '#fff3dc', k: 0.75 }, { x: 6.5, z: 0, r: 11, color: '#fff3dc', k: 0.6 }, { x: -6.5, z: 0, r: 11, color: '#fff3dc', k: 0.6 });
  }, HILL.heights[2]);
  // people on the terrace in front of it
  for (let i = 0; i < 9; i++) {
    const [px, pz] = onHill(S.t0 - 5 + k.rand() * (S.t1 - S.t0 + 10), HILL.rims[2] + 2.1 + k.rand() * 1.2);
    k.person(px, pz, HILL.heights[2]);
  }
}

// ---------------------------------------------------------------------------
// The Moulin Rouge
// ---------------------------------------------------------------------------

/** A merry-go-round, which turns: a striped roof, a platform, and horses on their poles. */
function carousel(k: Build, x: number, z: number): void {
  const CREAM = 0xf2ead8, RED = 0xc8202c;
  k.b.cyl(x, z, 0, 0.15, 3.2, 3.2, 12, 0x6d5a48);
  const g = new GeoBuilder();
  g.cyl(0, 0, 0.15, 0.4, 2.9, 2.9, 12, 0x8d6b4a, { cap: 0xb9916a });
  g.cyl(0, 0, 0.4, 3.2, 0.55, 0.55, 8, CREAM, { win: interior(0.9), cap: false });
  g.cyl(0, 0, 3.0, 3.35, 3.0, 3.0, 12, CREAM, { win: interior(1.1), cap: false });
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * Math.PI * 2, a1 = ((i + 1) / 12) * Math.PI * 2, am = (a0 + a1) / 2;
    tri(g, [0, 4.7, 0], [Math.cos(a0) * 3.05, 3.35, Math.sin(a0) * 3.05], [Math.cos(a1) * 3.05, 3.35, Math.sin(a1) * 3.05], [Math.cos(am) * 0.4, 0.9, Math.sin(am) * 0.4], i % 2 ? CREAM : RED);
  }
  g.cyl(0, 0, 4.7, 5.3, 0.12, 0.02, 4, GOLD, { cap: false });
  const coats = [0xf2efe6, 0x8d6b4a, 0x2f2f38, 0xd9b24a, 0xf2efe6, 0xb5654a];
  coats.forEach((coat, i) => {
    const a = (i / coats.length) * Math.PI * 2, hx = Math.cos(a) * 2.1, hz = Math.sin(a) * 2.1, y = 1.25 + (i % 2) * 0.35;
    g.box(hx - 0.05, 0.4, hz - 0.05, hx + 0.05, 3.05, hz + 0.05, GOLD, { faces: 'NESW' });
    g.obox(hx, y, hz, 0.5, 0.24, 0.15, a + Math.PI / 2, coat);
    g.obox(hx - Math.sin(a) * 0.45, y + 0.34, hz + Math.cos(a) * 0.45, 0.14, 0.2, 0.12, a + Math.PI / 2, coat);
  });
  const wheel = new THREE.Mesh(g.build(), k.mat.city());
  wheel.name = 'carousel';
  wheel.position.set(x, 0, z);
  wheel.castShadow = true;
  k.group.add(wheel);
  k.each((dt) => { wheel.rotation.y -= dt * 0.55; });
  k.lights.push({ x, z, r: 9, color: '#ffd9a0', k: 0.7 });
  for (let i = 0; i < 6; i++) {
    const a = k.rand() * Math.PI * 2;
    k.person(x + Math.cos(a) * 3.9, z + Math.sin(a) * 3.9);
  }
}

/**
 * The Moulin Rouge, at the foot of Montmartre: a red hall with its name over
 * the door, and the red windmill on its roof, whose sails turn and are lined
 * with light at night. A merry-go-round turns in the square beside it.
 */
export function moulinRouge(k: Build): void {
  const b = k.b;
  const RED = 0xb3202a, DEEP = 0x8f1a22, CREAM = 0xf2ead8;
  const x0 = 51, x1 = 62, z0 = -111.5, z1 = -103.6, h = 6.4, xc = (x0 + x1) / 2;
  b.box(x0, 0, z0, x1, h, z1, RED, { win: { cell: 2.75, storey: h / 2, lit: 0.6, kind: 0 }, seed: 0.5, top: 0x6d2a2e });
  b.box(x0 - 0.1, h - 0.3, z0 - 0.1, x1 + 0.1, h + 0.25, z1 + 0.1, DEEP, { faces: 'NESW' });
  // the canopy over the door, with a row of lamps under its edge, and the name above it
  b.box(xc - 3.8, 3.0, z1, xc + 3.8, 3.35, z1 + 1.7, DEEP, { faces: 'NESWTB' });
  b.box(xc - 1.1, 0, z1, xc + 1.1, 2.8, z1 + 0.05, 0x2a2622, { faces: 'S' });
  k.glows.push({ x: xc, y: 2.95, z: z1 + 1.72, sx: 7.4, sy: 0.12, sz: 0.1, color: '#ffe2ae' });
  k.sign('moulin-rouge', xc, 4.75, z1 + 0.12, 0, 1, 1.25, 9.6);

  // --- the mill: a red tower on the roof, under a pointed cap ---
  const mx = x0 + 3.2, mz = z1 - 2.0;
  b.cyl(mx, mz, h, h + 5.2, 1.9, 1.5, 8, RED, { win: { cell: 1.33, storey: 2.6, lit: 0.5, kind: 4 }, seed: 0.3, cap: false });
  b.cyl(mx, mz, h + 5.2, h + 7.6, 1.85, 0.06, 8, DEEP, { cap: false });
  // --- its sails: four arms on a hub, each with a frame of laths, and a line of light along every arm ---
  // (they turn in front of the wall, so that their tips clear the roof)
  const hub: V3 = [mx, h + 4.4, z1 + 0.3];
  const g = new GeoBuilder();
  const pos: number[] = [];
  const bar = (x0b: number, y0b: number, x1b: number, y1b: number): void => {
    for (const [px, py] of [[x0b, y0b], [x1b, y0b], [x1b, y1b], [x0b, y0b], [x1b, y1b], [x0b, y1b]]) pos.push(px, py, 0.14);
  };
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const at = (u: number, v: number): V3 => [c * u - s * v, s * u + c * v, 0];
    g.beam(at(0, 0), at(5.0, 0), 0.12, 0.08, DEEP);
    // the frame: two long laths beside the arm, and rungs across them
    g.beam(at(1.2, 0.95), at(4.9, 0.95), 0.05, 0.05, CREAM);
    for (const u of [1.2, 2.1, 3.0, 3.9, 4.85]) g.beam(at(u, 0), at(u, 0.95), 0.045, 0.045, CREAM);
  }
  g.box(-0.3, -0.3, -1.0, 0.3, 0.3, 0.15, DEEP, { faces: 'NESWTB' });
  bar(-5.0, -0.07, 5.0, 0.07);
  bar(-0.07, -5.0, 0.07, 5.0);
  const sails = new THREE.Group();
  sails.name = 'moulin-rouge';
  sails.position.set(hub[0], hub[1], hub[2]);
  const frame = new THREE.Mesh(g.build(), k.mat.city());
  frame.castShadow = true;
  const neonGeo = new THREE.BufferGeometry();
  neonGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const neon = new THREE.MeshBasicMaterial({ color: 0xff3040, toneMapped: false, side: THREE.DoubleSide });
  sails.add(frame, new THREE.Mesh(neonGeo, neon));
  k.group.add(sails);
  k.each((dt, _time, night) => {
    sails.rotation.z -= dt * 0.45;
    neon.color.setRGB(1, 0.2, 0.26).multiplyScalar(0.55 + 2.8 * night);
  });

  for (let i = 0; i < 10; i++) k.person(xc - 5 + k.rand() * 10, z1 + 1.9 + k.rand() * 1.4);
  k.lights.push({ x: xc, z: z1 + 3, r: 11, color: '#ff5a6a', k: 0.75 }, { x: mx, z: mz + 4, r: 8, color: '#ff5a6a', k: 0.5 });

  carousel(k, 45.5, -105.5);
}

// ---------------------------------------------------------------------------
// The café at the corner, and the Métro
// ---------------------------------------------------------------------------

/**
 * A corner of Paris: a tall house with iron balconies and a zinc roof, a café
 * under red awnings with its tables on the pavement, the way down to the
 * Métro, a column for posters and a newspaper kiosk.
 */
export function cafeMetro(k: Build): void {
  const b = k.b;
  const WALL = 0xe9dfc8, SHADE = 0xd6cbb0, ZINC = 0x7d8691, IRON = 0x2b2d33, AWNING = 0xb3202a, POT = 0xc66f4a;
  const x0 = 22, x1 = 34, z0 = 46, z1 = 56.5, st = 4.5, h = st * 4;
  b.box(x0, 0, z0, x1, h, z1, WALL, { win: { cell: 2.4, storey: st, lit: 0.42, kind: 2 }, seed: 0.33, faces: 'NESW' });
  // iron balconies along the second floor and the top one, the cornice, and the roof with its windows and chimneys
  for (const y of [st, st * 3]) b.box(x0 - 0.18, y - 0.08, z0 - 0.18, x1 + 0.18, y + 0.6, z1 + 0.18, IRON, { faces: 'NESWTB' });
  b.box(x0 - 0.25, h - 0.3, z0 - 0.25, x1 + 0.25, h + 0.1, z1 + 0.25, SHADE);
  hipped(b, x0, z0, x1, z1, h + 0.1, h + 3.2, 1.3, 1.3, ZINC, 0x6f7883);
  for (let i = 0; i < 4; i++) b.box(x0 + 1.6 + i * 2.6, h + 0.5, z1 - 0.75, x0 + 2.6 + i * 2.6, h + 1.9, z1 - 0.2, WALL, { win: { cell: 1, storey: 1.4, lit: 0.6, kind: 1 }, seed: i * 0.3, top: ZINC });
  for (let i = 0; i < 3; i++) b.box(x1 - 0.75, h + 0.5, z0 + 1.6 + i * 2.9, x1 - 0.2, h + 1.9, z0 + 2.6 + i * 2.9, WALL, { win: { cell: 1, storey: 1.4, lit: 0.6, kind: 1 }, seed: i * 0.4, top: ZINC });
  for (const x of [x0 + 2.4, x1 - 3.0]) {
    b.box(x, h + 3.2, z0 + 2.6, x + 0.6, h + 4.5, z1 - 2.6, SHADE);
    b.box(x + 0.1, h + 4.5, z0 + 2.9, x + 0.5, h + 5.0, z1 - 2.9, POT);
  }

  // --- the café: awnings along the south and west sides, and its tables under them ---
  const awning = (ax0: number, az0: number, ax1: number, az1: number, nx: number, nz: number): void => {
    // from the wall, at (ax0, az0)..(ax1, az1), down and out by 2.6 the way (nx, nz) points
    const p0: V3 = [ax0, 4.1, az0], p1: V3 = [ax1, 4.1, az1], p2: V3 = [ax1 + nx * 2.6, 3.2, az1 + nz * 2.6], p3: V3 = [ax0 + nx * 2.6, 3.2, az0 + nz * 2.6];
    b.quad(p0, p1, p2, p3, [nx * 0.33, 0.94, nz * 0.33], AWNING);
    b.quad(p0, p1, p2, p3, [-nx * 0.33, -0.94, -nz * 0.33], 0x8f1a22);
    b.quad(p3, p2, [p2[0], 2.75, p2[2]], [p3[0], 2.75, p3[2]], [nx, 0, nz], AWNING);
  };
  awning(x0 + 0.4, z1, x1 - 0.4, z1, 0, 1);
  awning(x0, z0 + 0.4, x0, z1 - 0.4, -1, 0);
  k.sign('cafe', (x0 + x1) / 2, 5.3, z1 + 0.12, 0, 1, 1.0, 5);
  k.sign('brasserie', x0 - 0.12, 5.3, (z0 + z1) / 2, -1, 0, 1.0, 7);
  const table = (x: number, z: number): void => {
    b.cyl(x, z, 0, 0.72, 0.07, 0.07, 4, IRON, { cap: false });
    b.cyl(x, z, 0.72, 0.8, 0.42, 0.42, 6, 0xf2efe6);
  };
  for (let i = 0; i < 5; i++) {
    table(x0 + 1.5 + i * 2.25, z1 + 1.5);
    k.person(x0 + 1.5 + i * 2.25 + (i % 2 ? 0.75 : -0.75), z1 + 1.3 + (i % 3) * 0.3);
  }
  for (let i = 0; i < 4; i++) {
    table(x0 - 1.5, z0 + 1.6 + i * 2.4);
    k.person(x0 - 1.6 + (i % 2 ? 0.5 : -0.2), z0 + 2.4 + i * 2.4);
  }
  for (let i = 0; i < 6; i++) k.person(x0 + 0.5 + k.rand() * 11, z1 + 2.9 + k.rand() * 1.3);
  k.lights.push({ x: (x0 + x1) / 2, z: z1 + 2.2, r: 9, color: '#ffd9a0', k: 0.7 }, { x: x0 - 2, z: (z0 + z1) / 2, r: 9, color: '#ffd9a0', k: 0.6 });

  // --- the Métro: steps down under the pavement inside an iron railing, and its sign between two lamps on stalks ---
  const mx = 17.2, mz = 54;
  area(k, rect(mx - 0.9, mz - 1.9, mx + 0.9, mz + 1.9), 0x23252b, 0.03);
  for (let i = 0; i < 4; i++) b.box(mx - 0.9, -0.02, mz - 1.9 + i * 0.75, mx + 0.9, 0.05, mz - 1.5 + i * 0.75, 0x55575d, { faces: 'T' });
  b.box(mx - 1.0, 0, mz - 2.0, mx - 0.88, 1.15, mz + 1.9, IRON_GREEN);
  b.box(mx + 0.88, 0, mz - 2.0, mx + 1.0, 1.15, mz + 1.9, IRON_GREEN);
  b.box(mx - 1.0, 0, mz - 2.0, mx + 1.0, 1.15, mz - 1.88, IRON_GREEN);
  for (const s of [-1, 1]) {
    b.beam([mx + s * 0.95, 0, mz + 1.9], [mx + s * 1.25, 3.3, mz + 1.9], 0.09, 0.06, IRON_GREEN);
    k.glows.push({ x: mx + s * 1.25, y: 3.5, z: mz + 1.9, sx: 0.3, sy: 0.38, sz: 0.3, color: '#ff8a3a' });
  }
  k.sign('metro', mx, 2.75, mz + 1.96, 0, 1, 0.62, 2.0);
  k.sign('metro', mx, 2.75, mz + 1.84, 0, -1, 0.62, 2.0);
  k.lights.push({ x: mx, z: mz + 2.4, r: 6, color: '#ff9a4a', k: 0.5 });

  // --- a column for posters, with its green cap, and a newspaper kiosk ---
  const cx = 18.6, cz = 47.6;
  b.cyl(cx, cz, 0, 0.5, 0.62, 0.62, 8, IRON_GREEN, { cap: false });
  b.cyl(cx, cz, 0.5, 3.0, 0.55, 0.55, 8, 0xf0e6cf, { win: { cell: 0.86, storey: 2.5, lit: 0, kind: 1 }, seed: 0.9, cap: false });
  lathe(b, cx, cz, [[0.7, 3.0], [0.7, 3.2], [0.45, 3.7], [0.12, 4.0], [0.03, 4.5]], 8, IRON_GREEN);
  const kx = 36, kz = 58.6;
  b.box(kx - 0.9, 0, kz - 0.9, kx + 0.9, 2.3, kz + 0.9, IRON_GREEN, { win: { cell: 1.8, storey: 2.3, lit: 0.9, kind: 2 }, seed: 0.2, faces: 'NESW' });
  lathe(b, kx, kz, [[1.15 * D, 2.3], [1.0 * D, 2.5], [0.4 * D, 3.1], [0.05, 3.6]], 4, IRON_GREEN);
}

// ---------------------------------------------------------------------------
// The Trocadéro
// ---------------------------------------------------------------------------

/**
 * The Trocadéro: two pavilions with a terrace between them that looks across
 * the river to the Eiffel Tower, a wing running down from each towards the
 * water, and between the wings the long fountain with its jets.
 */
export function trocadero(k: Build): void {
  const b = k.b;
  const STONE = 0xe9e1cc, SHADE = 0xd6cdb4, JET = 0xeaf6ff;
  const xc = -17.7;
  area(k, rect(-25.8, -22.4, -9.7, -16.4), PLAZA);
  for (const s of [-1, 1]) {
    const px0 = s < 0 ? xc - 7.9 : xc + 4.3, px1 = px0 + 3.6;
    b.box(px0, 0, -22.2, px1, 7.5, -16.6, STONE, { win: { cell: 1.2, storey: 7.5, lit: 0.5, kind: 6 }, seed: 0.3 + s * 0.1, top: SHADE });
    b.box(px0 - 0.15, 7.5, -22.35, px1 + 0.15, 8.0, -16.45, SHADE);
    // the wing that runs down from it towards the river
    const wx0 = s < 0 ? px0 : px1 - 2.4, wx1 = wx0 + 2.4;
    b.box(wx0, 0, -16.6, wx1, 5.2, -7.6, STONE, { win: { cell: 0.9, storey: 5.2, lit: 0.5, kind: 6 }, seed: 0.5 + s * 0.1, top: SHADE, faces: 'ESWT' });
    b.box(wx0 - 0.1, 5.2, -16.6, wx1 + 0.1, 5.55, -7.5, SHADE);
    for (const z of [-12.4, -8]) k.tree(xc + s * 4.1, z, 0.5);
  }
  // the terrace: a low wall along its edge, and gilded figures on plinths
  b.box(xc - 4.3, 0, -16.55, xc + 4.3, 0.8, -16.4, SHADE);
  for (const dx of [-3.3, -1.1, 1.1, 3.3]) {
    b.box(xc + dx - 0.35, 0, -17.25, xc + dx + 0.35, 0.9, -16.55, SHADE);
    figure(b, xc + dx, -16.9, 0.9, { coat: GOLD, legs: GOLD, skin: GOLD, hat: GOLD, hatH: 0.1, hatR: 0.26 });
  }

  // --- the fountain: an upper basin whose jets shoot towards the river, and a long lower one ---
  const fx0 = xc - 2.5, fx1 = xc + 2.5;
  b.box(fx0 - 0.3, 0, -15.6, fx1 + 0.3, 0.7, -10.4, SHADE);
  b.box(fx0, 0.7, -15.3, fx1, 0.72, -10.7, WATER, { faces: 'T', win: interior(0.4) });
  b.box(fx0 - 0.3, 0, -10.4, fx1 + 0.3, 0.35, -5.6, SHADE);
  b.box(fx0, 0.35, -10.1, fx1, 0.37, -5.9, WATER, { faces: 'T', win: interior(0.4) });
  for (let i = 0; i < 6; i++) {
    const x = fx0 + 0.5 + i * 0.8;
    b.beam([x, 0.75, -15.0], [x, 2.7, -12.4], 0.07, 0.1, JET, { win: interior(0.8) });
    b.beam([x, 2.7, -12.4], [x, 0.75, -10.9], 0.1, 0.14, JET, { win: interior(0.8) });
  }
  for (let i = 0; i < 3; i++) b.box(xc - 0.09, 0.37, -9.2 + i * 1.3 - 0.09, xc + 0.09, 1.9 + (i % 2) * 0.5, -9.2 + i * 1.3 + 0.09, JET, { win: interior(0.8), faces: 'NESW' });
  area(k, [[-23.2, -15.6], [-20.6, -15.6], [-20.6, -5.8], [-23.2, -6.6]], LAWN);
  area(k, rect(-14.8, -15.6, -12.2, -5.8), LAWN);
  // the terrace at the water's edge below the fountain, where a hero stands with the tower across the river
  area(k, [[-21.2, -5.5], [-11.4, -5.5], [-11.4, 0.2], [-14, 0.6], [-18.5, -0.3], [-21.2, -1.7]], PLAZA);

  for (let i = 0; i < 7; i++) k.person(xc - 4 + k.rand() * 8, -17.75 + k.rand() * 0.35);
  for (let i = 0; i < 5; i++) k.person(xc + (i % 2 ? 3.3 : -3.3) + k.rand() * 0.5, -14 + k.rand() * 7.6);
  k.lights.push({ x: xc, z: -13, r: 10, color: '#cfe8ff', k: 0.6 }, { x: xc, z: -6, r: 10, color: '#cfe8ff', k: 0.5 }, { x: xc, z: -19.5, r: 11, color: '#ffe2ae', k: 0.6 });
}

// ---------------------------------------------------------------------------
// A garden with a bandstand, and the painters' square
// ---------------------------------------------------------------------------

/**
 * Two small places that fill corners of Paris: a garden with a bandstand at
 * the east end of the quay, and at the foot of Montmartre a square where
 * painters sit at their easels under parasols.
 */
export function parisCorners(k: Build): void {
  const b = k.b;
  const STONE = 0xcfc6b2, ZINC = 0x6f8f86;

  // --- the garden: a lawn, a path across it, trees, and the bandstand in the middle ---
  area(k, rect(93, -14.2, 103.4, 0.8), LAWN);
  area(k, rect(93, -7.6, 103.4, -6.0), PLAZA, 0.03);
  const bx = 98.2, bz = -6.8;
  b.cyl(bx, bz, 0, 0.6, 2.3, 2.3, 8, STONE, { cap: 0xb9916a });
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2, x = bx + Math.cos(a) * 2.0, z = bz + Math.sin(a) * 2.0;
    b.box(x - 0.07, 0.6, z - 0.07, x + 0.07, 3.3, z + 0.07, IRON_GREEN, { faces: 'NESW' });
  }
  lathe(b, bx, bz, [[2.7, 3.3], [2.6, 3.5], [1.3, 4.3], [0.2, 4.9], [0.03, 5.6]], 8, ZINC);
  for (const [x, z] of [[94.6, -12.4], [101.8, -12.2], [94.8, -1.2], [101.6, -1]]) k.tree(x, z, 0.62);
  for (let i = 0; i < 4; i++) k.person(bx - 0.9 + k.rand() * 1.8, bz - 0.9 + k.rand() * 1.8, 0.6);
  for (let i = 0; i < 6; i++) k.person(93.6 + k.rand() * 9.2, i % 2 ? -9.6 - k.rand() * 2 : -4.8 + k.rand() * 2.6);
  k.lights.push({ x: bx, z: bz, r: 9, color: '#ffe2ae', k: 0.6 });

  // --- the painters' square: each at an easel under a parasol, with a canvas that faces the hill's foot ---
  const shades = [0xf2ead8, 0xc8523f, 0x3f6fb5, 0xf2c14e, 0xf2ead8];
  shades.forEach((shade, i) => {
    const x = 65.2 + (i % 3) * 3.3 + (i > 2 ? 2.2 : 0), z = i > 2 ? -100.6 : -105.8;
    parasol(b, x, z, shade);
    // the easel, and what is on it
    b.box(x + 0.85, 0, z + 0.55, x + 0.93, 1.7, z + 0.63, 0x8d6b4a, { faces: 'NESW' });
    b.quad([x + 0.5, 0.85, z + 0.68], [x + 1.28, 0.85, z + 0.68], [x + 1.28, 1.75, z + 0.68], [x + 0.5, 1.75, z + 0.68], [0, 0, 1], [0xf4f1e8, 0x8fc0d8, 0xf2c14e, 0xe8a0a0, 0xa9d3a0][i]);
    k.person(x + 0.35, z - 0.45);
  });
  for (const [x, z] of [[63.6, -110], [72.6, -109.6], [68.4, -97.4]]) k.tree(x, z, 0.6);
  for (let i = 0; i < 6; i++) k.person(64 + k.rand() * 8, -108.6 + k.rand() * 9.4);
  k.lights.push({ x: 68, z: -103.5, r: 10, color: '#ffd9a0', k: 0.55 });
}

// ---------------------------------------------------------------------------
// The foot of the Eiffel Tower
// ---------------------------------------------------------------------------

/**
 * What stands under the Eiffel Tower and round it: the paving, beds of grass
 * between its feet, the booths where tickets are sold, lanterns, and the
 * beam of the lamp at its top, which sweeps round at night. `x` and `z` are
 * the middle of the tower, `s` how far out its feet are, and `H` its height.
 */
export function champDeMars(k: Build, x: number, z: number, s: number, H: number): void {
  const b = k.b;
  area(k, rect(x - s - 0.6, z - s - 0.6, x + s + 0.6, z + s + 0.6), PLAZA);
  for (const d of [-1, 1]) {
    area(k, rect(x + d * (s - 1.2) - 1.5, z - 5.5, x + d * (s - 1.2) + 1.5, z + 5.5), LAWN, 0.03);
    area(k, rect(x - 5.5, z + d * (s - 1.2) - 1.5, x + 5.5, z + d * (s - 1.2) + 1.5), LAWN, 0.03);
  }
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    // a booth beside each foot, with a queue at two of them
    const bx = x + sx * (s - 4.2), bz = z + sz * (s - 0.2);
    b.box(bx - 0.9, 0, bz - 0.7, bx + 0.9, 2.2, bz + 0.7, 0x6a5444, { win: { cell: 1.8, storey: 2.2, lit: 0.9, kind: 2 }, seed: sx * 0.3 + sz * 0.1 });
    b.box(bx - 1.1, 2.2, bz - 0.9, bx + 1.1, 2.4, bz + 0.9, 0x4a3a30);
    if (sz > 0) for (let i = 0; i < 6; i++) k.person(bx - sx * (1.5 + i * 0.75), bz - 0.2 + (i % 2) * 0.3);
    lantern(k, x + sx * 5.6, z + sz * 5.6, 0, 2.6, 0x2f3a33);
  }

  // the lamp at the top: two beams that sweep round after dark
  const beam = new THREE.BufferGeometry();
  const reach = 62, wide = 5.5, dip = 9;
  beam.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, reach, -dip, -wide, reach, -dip, wide, 0, 0, 0, -reach, -dip, wide, -reach, -dip, -wide], 3));
  const light = new THREE.MeshBasicMaterial({ color: 0xfff1c9, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const lamp = new THREE.Mesh(beam, light);
  lamp.name = 'eiffel-beam';
  lamp.position.set(x, H - 1.5, z);
  lamp.frustumCulled = false;
  k.group.add(lamp);
  k.each((dt, _time, night) => {
    lamp.rotation.y += dt * 0.5;
    light.opacity = 0.2 * night;
    lamp.visible = night > 0.02;
  });
}
