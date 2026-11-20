// Quad Day on the Main Quad, and the tile's trees and garden lamps.
//
// This file is built last, when everything else stands. Whatever it puts down
// goes through `clear`, which refuses a place on a road, in a lot, on a parked
// vehicle or a hero's place, and any place from which the thing would stand
// between the opening view and something that view is meant to see.

import { rng } from '../../engine/geo';
import { lantern } from '../../engine/parts';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { IRON, ORANGE } from './look';
import { AREAS, HERO_SPOTS, LOT, LOTS, MUST_SEE, PARKED, lot, onRoad, type AreaDef, type Model } from './plan';

const areaOf = (id: string): AreaDef | undefined => AREAS.find((a) => a.id === id);

// ---------------------------------------------------------------------------
// What the opening view must go on seeing
// ---------------------------------------------------------------------------

/** Towards the camera of the opening view, on the ground, and how fast its line of sight rises. */
const VIEW = { x: Math.sin((42 * Math.PI) / 180), z: Math.cos((42 * Math.PI) / 180), up: Math.tan((38 * Math.PI) / 180) };

interface Point { x: number; y: number; z: number }

/**
 * The places nothing planted may hide: those the plan lists, and the small
 * things built since that are worth as much: the baskets and the door at
 * Wassaja Hall, Manolo's board, the Union's umbrellas, the band, the tent in
 * the car park, the car teams' cars, the Red Lion's garden.
 */
function guarded(): Point[] {
  const w = lot('wassaja'), m = lot('manolos'), u = lot('union'), a = lot('armory'), c = lot('car-teams'), r = lot('red-lion');
  const pts: Point[] = MUST_SEE.map((p) => ({ x: p.x, y: p.y, z: p.z }));
  for (let i = 0; i < 5; i++) pts.push({ x: w.x0 + 1.2 + i * 1.1, y: 0.4, z: w.z1 + 1.05 });
  pts.push({ x: w.x1 - 4.7, y: 1, z: w.z1 + 0.6 });
  pts.push({ x: m.x0 + 0.6, y: 5.3, z: (m.z0 + m.z1) / 2 + 1.7 }, { x: m.x0 + 3.6, y: 5.3, z: (m.z0 + m.z1) / 2 - 0.6 });
  for (const x of [u.x0 + 1.55, u.x0 + 4.3, u.x1 - 4.3, u.x1 - 1.55]) pts.push({ x, y: 2.6, z: u.z1 + 2 });
  pts.push({ x: a.x0 + 3, y: 1.2, z: a.z1 + 1.8 }, { x: a.x0 + 8, y: 1.2, z: a.z1 + 1.8 });
  pts.push({ x: LOT.bays[2], y: 1.5, z: LOT.row - 1.8 });
  pts.push({ x: c.x0 - 0.5, y: 0.6, z: c.z1 + 3 }, { x: c.x0 + 6, y: 1.5, z: c.z1 + 0.3 });
  pts.push({ x: r.x1 + 4, y: 1, z: (r.z0 + r.z1) / 2 });
  return pts;
}

/** Whether a thing `r` across and `top` high at (x, z) would stand between the opening view and one of these places. */
function hides(pts: Point[], x: number, z: number, r: number, top: number): boolean {
  for (const p of pts) {
    const dx = x - p.x, dz = z - p.z;
    const along = dx * VIEW.x + dz * VIEW.z;
    if (along <= 0) continue;
    const off = Math.abs(dx * VIEW.z - dz * VIEW.x);
    if (off < r + 0.35 && p.y + Math.max(0, along - r) * VIEW.up < top) return true;
  }
  return false;
}

/** Ground that is kept open: fields, courts, car parks, paved squares, water, the corn, and the ground between Harker and Natural History. */
const OPEN = ['football-field', 'practice-fields', 'illinois-field', 'corn', 'volleyball', 'lot-e14', 'saucer-east-lot', 'gregory-place-parking', 'boneyard', 'union-terrace', 'alma-plaza', 'library-plaza', 'morrow-plots', 'grange-grove'];

/** Whether a thing `r` across and `top` high may stand at (x, z). */
function clear(pts: Point[], x: number, z: number, r: number, top: number): boolean {
  if (onRoad(x, z, 1.6 + r * 0.3)) return false;
  for (const l of LOTS) if (x > l.x0 - r * 0.6 && x < l.x1 + r * 0.6 && z > l.z0 - r * 0.6 && z < l.z1 + r * 0.6) return false;
  for (const id of OPEN) {
    const a = areaOf(id);
    if (a && x > a.x0 - 0.3 && x < a.x1 + 0.3 && z > a.z0 - 0.3 && z < a.z1 + 0.3) return false;
  }
  for (const s of [...HERO_SPOTS, ...PARKED]) if (Math.hypot(x - s.x, z - s.z) < r + 4.5) return false;
  return !hides(pts, x, z, r, top);
}

// ---------------------------------------------------------------------------
// Quad Day
// ---------------------------------------------------------------------------

/** What each stall is for, the colour of its cloth, and the colour of its board. */
const STALLS: [string, number, string][] = [
  ['CHESS', 0x2f4f8f, '#2f4f8f'], ['ROBOTS', 0xc8322b, '#c8322b'], ['BAND', 0xf2c230, '#b8860b'], ['SAILING', 0x3f8fb5, '#2f6f95'],
  ['COOKING', 0xf26a21, '#c8521a'], ['FILM', 0x3a3d45, '#3a3d45'], ['HIKING', 0x4f8f4a, '#3f7a3a'], ['RADIO', 0x7a4f9a, '#6a3f8a'],
  ['DANCE', 0xd8528f, '#b83f75'], ['DEBATE', 0x13294b, '#13294b'], ['GARDEN', 0x6fa85a, '#4f8a3f'], ['CYCLING', 0xe8a23d, '#b8761a'],
];

const slug = (word: string): string => word.toLowerCase().replace(/ /g, '-');
const stallSign = (word: string, color: string): SignDef => ({ id: `planting-${slug(word)}`, lines: [word], color: '#f6f2e6', ink: color, aspect: Math.max(2.4, word.length * 0.62), kind: 'board', size: [Math.round(52 * Math.max(2.4, word.length * 0.62)), 52] });

export const SIGNS: SignDef[] = [
  ...STALLS.map(([word, , color]) => stallSign(word, color)),
  stallSign('CAR TEAMS', '#13294b'),
  { id: 'planting-quad-day', lines: ['QUAD DAY'], color: '#f26a21', ink: '#ffffff', aspect: 6, kind: 'board', size: [312, 52] },
];

/**
 * Quad Day: the afternoon at the start of term when every club sets out a
 * table on the Quad. Two rows of stalls face each other across an aisle down
 * the middle of the lawn, each with its table, its board, and some with a
 * canopy. A banner hangs over the north end of the aisle. The car teams' table
 * stands by itself at the north-west, beside the place that is kept for a
 * hero. No club's real name is on any board: each says what the club does.
 */
function quadDay(k: Build, pts: Point[]): void {
  const b = k.b, q = areaOf('main-quad'), hero = HERO_SPOTS.find((s) => s.id === 'quad-day');
  if (!q || !hero) return;
  const mid = (q.x0 + q.x1) / 2, rand = rng(1867);
  const people: [number, number][] = [];

  STALLS.forEach(([word, cloth], i) => {
    const row = i % 2, n = Math.floor(i / 2);
    // the west row looks east and the east row west, across the aisle
    const s = row === 0 ? 1 : -1, x = mid - s * 4.4, z = q.z1 - 3.3 - n * 3.35;
    // the table, under a cloth that hangs to the grass
    b.box(x - 0.4, 0.04, z - 0.9, x + 0.4, 0.85, z + 0.9, cloth, { top: 0xf6f2e6 });
    for (const [dz, c] of [[-0.5, 0xf2c230], [0.1, 0xc8322b], [0.55, 0x3f8fb5]] as const) b.box(x - 0.15, 0.85, z + dz - 0.12, x + 0.15, 0.98, z + dz + 0.12, c, { faces: 'NESWT' });
    // its board, on two legs behind the table, with the word on both its faces
    const bx = x - s * 1.0;
    for (const dz of [-0.75, 0.75]) b.box(bx - 0.05, 0, z + dz - 0.05, bx + 0.05, 1.3, z + dz + 0.05, 0xd9dde2, { faces: 'NESW' });
    b.box(bx - 0.05, 1.3, z - 0.95, bx + 0.05, 2.15, z + 0.95, 0x8d9198, { faces: 'NESWTB' });
    const id = `planting-${slug(word)}`;
    k.sign(id, bx + 0.08, 1.72, z, 1, 0, 0.7, 1.8);
    k.sign(id, bx - 0.08, 1.72, z, -1, 0, 0.7, 1.8);
    // every other stall has a canopy, unless a canopy there would stand before something the opening view is to see
    if ((n + row) % 2 === 0 && !hides(pts, x - s * 0.3, z, 1.7, 2.75)) {
      const cx = x - s * 0.3, h = 1.25;
      for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.box(cx + dx * h - 0.05, 0, z + dz * h - 0.05, cx + dx * h + 0.05, 2.5, z + dz * h + 0.05, 0xd9dde2, { faces: 'NESW' });
      b.box(cx - h - 0.12, 2.5, z - h - 0.12, cx + h + 0.12, 2.66, z + h + 0.12, i % 3 === 0 ? ORANGE : i % 3 === 1 ? 0x13294b : 0xf6f2e6, { faces: 'NESWTB' });
    }
    // two who keep the stall, and whoever has stopped at it
    people.push([x - s * 0.75, z - 0.4], [x - s * 0.7, z + 0.5]);
    const stopped = 1 + Math.floor(rand() * 3);
    for (let j = 0; j < stopped; j++) people.push([x + s * (0.9 + rand() * 0.8), z - 0.8 + rand() * 1.6]);
  });

  // the banner over the north end of the aisle, on two posts, read from both ways
  const bz = q.z1 - 3.3 - 5 * 3.35 - 2.4, half = 3.3;
  for (const dx of [-half, half]) b.box(mid + dx - 0.07, 0, bz - 0.07, mid + dx + 0.07, 3.6, bz + 0.07, 0xd9dde2, { faces: 'NESWT' });
  b.box(mid - half, 2.65, bz - 0.04, mid + half, 3.5, bz + 0.04, ORANGE, { faces: 'NESWTB' });
  k.sign('planting-quad-day', mid, 3.07, bz + 0.07, 0, 1, 0.75, 2 * half - 0.6);
  k.sign('planting-quad-day', mid, 3.07, bz - 0.07, 0, -1, 0.75, 2 * half - 0.6);

  // the car teams' table, east of the hero's place: a small model of a car on it, and the board behind it
  const tx = hero.x + 6.2, tz = hero.z - 0.2;
  b.box(tx - 0.9, 0.04, tz - 0.4, tx + 0.9, 0.85, tz + 0.4, 0x13294b, { top: 0xf6f2e6 });
  b.box(tx - 0.45, 0.85, tz - 0.14, tx + 0.35, 0.98, tz + 0.14, ORANGE, { faces: 'NESWT' });
  b.box(tx - 0.3, 0.98, tz - 0.11, tx + 0.1, 1.08, tz + 0.11, 0x9fc0d4, { faces: 'NESWT' });
  for (const dx of [-0.85, 0.85]) b.box(tx + dx - 0.05, 0, tz - 1.0, tx + dx + 0.05, 1.3, tz - 0.9, 0xd9dde2, { faces: 'NESW' });
  b.box(tx - 1.0, 1.3, tz - 1.0, tx + 1.0, 2.15, tz - 0.9, 0x8d9198, { faces: 'NESWTB' });
  k.sign('planting-car-teams', tx, 1.72, tz - 0.87, 0, 1, 0.7, 1.9);
  people.push([tx - 0.5, tz - 0.7], [tx + 0.6, tz - 0.65], [tx + 1.7, tz + 0.5], [tx + 0.9, tz + 1.3]);

  // the crowd: up and down the aisle, and on the grass at the lawn's edges
  for (let i = 0; i < 26; i++) people.push([mid - 2.4 + rand() * 4.8, q.z1 - 1.5 - rand() * (5 * 3.35 + 6)]);
  for (let i = 0; i < 12; i++) people.push([q.x0 + 0.8 + rand() * 2.2 + (i % 2) * (q.x1 - q.x0 - 3.8), q.z1 - 2 - rand() * 18]);
  for (const [x, z] of people) {
    // nobody stands on the hero's place, or just south or east of it
    if (x > hero.x - 5 && x < hero.x + 5 && z > hero.z - 2.2 && z < hero.z + 4.5) continue;
    k.person(x, z);
  }
}

// ---------------------------------------------------------------------------
// Trees, and the lamps along the walks
// ---------------------------------------------------------------------------

function planting(k: Build, pts: Point[]): void {
  const rand = rng(217);
  let planted = 0, refused = 0;
  /** A tree of size `s`: its crown is 2.7 s across the middle and it stands 7.2 s high. A tall one is slender. */
  const tree = (x: number, z: number, s: number, tall = false): void => {
    const r = tall ? 1.15 * s : 2.7 * s, top = tall ? 9.4 * s : 7.2 * s;
    if (!clear(pts, x, z, r, top)) {
      refused++;
      return;
    }
    k.tree(x, z, s, tall);
    planted++;
  };
  const size = (lo = 0.5, hi = 0.68): number => lo + rand() * (hi - lo);

  // the Main Quad: a row down each long side of the lawn
  const q = areaOf('main-quad');
  if (q) {
    for (let z = q.z0 + 3.2; z < q.z1 - 1; z += 4.4) {
      tree(q.x0 + 1.3, z, size(0.5, 0.6));
      tree(q.x1 - 1.3, z + 1.6, size(0.5, 0.6));
    }
    for (const z of [q.z0 + 5.5, q.z0 + 14.5, q.z0 + 23.5]) {
      lantern(k, q.x0 + 0.5, z, 0, 2.6, IRON);
      lantern(k, q.x1 - 0.5, z, 0, 2.6, IRON);
    }
  }
  // the South Quad: a row down each side, clear of the bell tower's foot
  const sq = areaOf('south-quad');
  if (sq) {
    // (the walk that crosses the quad from west to east, south of the tower, is kept clear)
    const tower = lot('bell-tower'), across = (tower.z0 + tower.z1) / 2 + 6.9;
    for (let z = sq.z0 + 2; z < sq.z1 - 0.5; z += 3.9) {
      if (Math.abs(z - across) >= 1.8) tree(sq.x0 + 1.2, z, size(0.5, 0.62));
      if (Math.abs(z + 1.2 - across) >= 1.8) tree(sq.x1 - 1.2, z + 1.2, size(0.5, 0.62));
    }
    for (const z of [sq.z0 + 4, sq.z1 - 3]) {
      lantern(k, sq.x0 + 3, z, 0, 2.6, IRON);
      lantern(k, sq.x1 - 3, z, 0, 2.6, IRON);
    }
  }
  // the grove: trees all over it, but for the cemetery and the walk, and tall dark ones at the cemetery's corners and gate
  const g = areaOf('grove'), c = areaOf('cemetery');
  if (g && c) {
    const walk = c.z1 + 2.2, mx = (c.x0 + c.x1) / 2;
    for (let i = 0; i < 70; i++) {
      const x = g.x0 + 1.5 + rand() * (g.x1 - g.x0 - 3), z = g.z0 + 1.5 + rand() * (g.z1 - g.z0 - 3);
      if (x > c.x0 - 2 && x < c.x1 + 2 && z > c.z0 - 2 && z < c.z1 + 2) continue;
      if (Math.abs(z - walk) < 1.9 || (Math.abs(x - mx) < 1.6 && z < c.z0)) continue;
      tree(x, z, size(0.52, 0.8));
    }
    for (const [x, z] of [[c.x0 + 1.1, c.z0 + 1.2], [c.x1 - 1.1, c.z0 + 1.2], [c.x0 + 1.1, c.z1 - 1.2], [c.x1 - 1.1, c.z1 - 1.2], [mx - 2.2, c.z0 - 1.2], [mx + 2.2, c.z0 - 1.2]]) tree(x, z, 0.62, true);
    for (const x of [g.x0 + 4, mx - 6, mx + 9, g.x1 - 6]) lantern(k, x, walk - 0.9, 0, 2.6, IRON);
  }
  // Illini Grove: along its north and east edges, where its tables are not
  const ig = areaOf('illini-grove');
  if (ig) {
    for (let x = ig.x0 + 1.5; x < ig.x1 - 1; x += 3.6) tree(x, ig.z0 + 1.1, size(0.55, 0.75));
    for (let z = ig.z0 + 4; z < ig.z1 - 1; z += 3.4) tree(ig.x1 - 1.1, z, size(0.55, 0.75));
  }
  // Washington Park: at its corners and along its long sides, clear of the sand court
  const wp = areaOf('washington-park'), sand = areaOf('volleyball');
  if (wp && sand) {
    for (const z of [wp.z0 + 1.4, wp.z0 + 5.2, wp.z0 + 9, wp.z1 - 5.4, wp.z1 - 1.6]) {
      if (z > sand.z0 - 2 && z < sand.z1 + 2) continue;
      tree(wp.x0 + 1.1, z, size(0.5, 0.62));
      tree(wp.x1 - 1.1, z + 0.8, size(0.5, 0.62));
    }
  }
  // the lawn before Wassaja Hall: three at its south-west, where they stand before nothing
  const wl = areaOf('wassaja-lawn');
  if (wl) for (const [dx, dz] of [[1.6, 1.6], [4.6, 1.2], [1.8, 4.4]]) tree(wl.x0 + dx, wl.z1 - dz, size(0.5, 0.6));
  // a small tree in the courtyard of each of the four old halls
  for (const id of ['hopkins', 'weston', 'scott', 'snyder']) {
    const h = lot(id);
    k.tree(h.x1 - 3.5, h.z0 + 3.4, 0.36);
    planted++;
  }
  if (import.meta.env.DEV) console.info(`Urbana-Champaign: ${planted} trees planted, and ${refused} places refused because they were on a road, in a lot, or in the way of something the opening view is to see.`);
}

export const MODELS: Record<string, Model> = {};

export function extras(k: Build): void {
  const pts = guarded();
  quadDay(k, pts);
  planting(k, pts);
}
