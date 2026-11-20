// The open country between the castles: woods, fields, farms and the small
// scenes along the roads, built region by region from the Wall to Dorne.
//
// Every thing here asks space.ts first whether its ground is open: no lot, no
// yard, no road, no river, no shore and no place for a hero is ever touched.
// It also keeps to two heights: nothing rises above 9, and nothing above 5
// where it would stand in front of a lot as the view the tile opens with sees
// it. And it keeps the roads in sight: a thing to the south-east of a road is
// no taller than the ground it would hide behind it allows.
//
// Everything is this tile's own drawing, from the books' plain descriptions.

import * as THREE from 'three';
import { Smoke } from '../../engine/effects';
import { rng, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { area } from '../../engine/ground';
import { bandedFlag, lathe, tri, wheel } from '../../engine/parts';
import { gable } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { DARK, DAUB, DOOR, HOUSE, HOUSE_WIN, ROCK, ROCK_DARK, ROOF, STONE, TIMBER, TIMBER_DARK, brazier, fire, squareTower, weirwood } from './look';
import { COAST_EAST, COAST_WEST, LOTS, RIVERS, isWater, type P2 } from './plan';
import { groundKind, open, toLine, toRiver, toRoad } from './space';

export const SIGNS: SignDef[] = [];

// ---------------------------------------------------------------------------
// Where a thing may stand, and how tall
// ---------------------------------------------------------------------------

/** The way the view the tile opens with looks from: 0.67 east and 0.74 south. */
const VIEW: P2 = [0.669, 0.743];
/** The turn that makes a thing built with its front to +z face the opening view. */
const FACE = Math.atan2(-VIEW[0], VIEW[1]);
/** The most trees the country plants: they are drawn as one batch. */
const MAX_TREES = 900;

interface Rect { x0: number; z0: number; x1: number; z1: number }

/** What this file has put down already, so that a wood does not grow through a farm. */
let taken: Rect[] = [];
/** The trees planted so far, in cells of 3 units, to keep them apart. */
let grove = new Map<string, [number, number, number][]>();
let trees = 0;
/** Chimneys and the charcoal burners' mound: where smoke rises. */
let smokes: { x: number; y: number; z: number; shade: number; size: number; every: number }[] = [];
/** What found no room, to be said in the console. */
let missed: string[] = [];

const claim = (x0: number, z0: number, x1: number, z1: number): void => void taken.push({ x0, z0, x1, z1 });

/** Whether a place is clear of what this file has built, and of the ground other builders keep that space.ts leaves open. */
function free(x: number, z: number, room = 0.5): boolean {
  // north of the Wall is another builder's, and so is the ground inside Harrenhal's walls
  if (z < -88) return false;
  if (x > -39 && x < 3 && z > 3 && z < 31) return false;
  for (const t of taken) if (x > t.x0 - room && x < t.x1 + room && z > t.z0 - room && z < t.z1 + room) return false;
  return true;
}

/** Whether a place lies within 20 to the south-east of a lot, where nothing may rise above 5. The Wall is left out: at 42 it is seen over anything here. */
function beforeLot(x: number, z: number): boolean {
  for (const l of LOTS) {
    if (l.id === 'wall') continue;
    const lo = Math.max(0, (x - l.x1 - 0.5) / VIEW[0], (z - l.z1 - 0.5) / VIEW[1]);
    const hi = Math.min(20, (x - l.x0 + 0.5) / VIEW[0], (z - l.z0 + 0.5) / VIEW[1]);
    if (lo <= hi) return true;
  }
  return false;
}

/** How tall a thing at a place may be: 9 at most, 5 before a lot, and low enough that what it hides behind it is not a road. */
function cap(x: number, z: number): number {
  let h = beforeLot(x, z) ? 5 : 9;
  for (let t = 0.5; t <= 12; t += 0.75) {
    if (toRoad(x - VIEW[0] * t, z - VIEW[1] * t) < 4.3) { h = Math.min(h, t / 1.3); break; }
  }
  return h;
}

/** Whether a rectangle of ground is open, clear of this file's own things, and may carry something `h` high. */
function fits(x0: number, z0: number, x1: number, z1: number, h = 0, room = 1.5, mine = 0.4): boolean {
  const nx = Math.max(1, Math.ceil((x1 - x0) / 2.5)), nz = Math.max(1, Math.ceil((z1 - z0) / 2.5));
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
    const x = x0 + ((x1 - x0) * i) / nx, z = z0 + ((z1 - z0) * j) / nz;
    if (!open(x, z, room) || !free(x, z, mine)) return false;
    if (h > 0 && h > cap(x, z)) return false;
  }
  return true;
}

/** The nearest place to (x, z), within `reach`, where a thing `w` by `d` and `h` high fits: its middle, or null. */
function spot(x: number, z: number, w: number, d: number, h = 0, reach = 8, room = 1.5): P2 | null {
  for (let r = 0; r <= reach; r += 0.5) {
    const n = r === 0 ? 1 : Math.ceil(r * 5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r, cx = x + Math.cos(a) * r, cz = z + Math.sin(a) * r;
      if (fits(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, h, room)) return [cx, cz];
    }
  }
  return null;
}

/** As `spot`, for a thing that is low but for a tall core in its middle, `core` across and `h` high: a tower in its pale, a windmill on its mound. */
function spotTall(x: number, z: number, w: number, d: number, core: number, h: number, reach = 8): P2 | null {
  for (let r = 0; r <= reach; r += 0.5) {
    const n = r === 0 ? 1 : Math.ceil(r * 5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r, cx = x + Math.cos(a) * r, cz = z + Math.sin(a) * r;
      if (fits(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, 2.2) && fits(cx - core / 2, cz - core / 2, cx + core / 2, cz + core / 2, h, 0)) return [cx, cz];
    }
  }
  return null;
}

/** The first of several places that has room, by ind. */
function first(places: P2[], find: (x: number, z: number) => P2 | null): P2 | null {
  for (const [x, z] of places) { const c = find(x, z); if (c) return c; }
  return null;
}

/** A point given in a thing's own frame, turned by `yaw` and moved to (x, z). */
const at = (x: number, z: number, yaw: number, lx: number, lz: number): P2 =>
  [x + lx * Math.cos(yaw) - lz * Math.sin(yaw), z + lx * Math.sin(yaw) + lz * Math.cos(yaw)];

/** Stands a person where the ground is open. */
function folk(k: Build, x: number, z: number, y = 0, room = 1.5): void {
  if (open(x, z, room)) k.person(x, z, y);
}

// ---------------------------------------------------------------------------
// Trees
// ---------------------------------------------------------------------------

/**
 * Plants one tree if the place is open, clear of what is built and of other
 * trees by `gap`, and the tree can be made low enough for its place. A pine
 * of size 1 is 9 high, a broad tree at most 8.4. `mine` lets a tree stand on
 * this file's own ground: an orchard, a farm's yard.
 */
/** Whether no tree already stands nearer than the mean of the two trees' gaps. */
function roomFor(x: number, z: number, gap: number): boolean {
  const cx = Math.floor(x / 3), cz = Math.floor(z / 3);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    for (const [tx, tz, tg] of grove.get(`${cx + i},${cz + j}`) ?? []) if (Math.hypot(tx - x, tz - z) < (gap + tg) * 0.5) return false;
  }
  return true;
}

function plant(k: Build, x: number, z: number, size: number, tall: boolean, gap = 1.8, mine = false): boolean {
  if (trees >= MAX_TREES || !roomFor(x, z, gap)) return false;
  if (!open(x, z, 2) || (!mine && !free(x, z, 1))) return false;
  const s = Math.min(size, cap(x, z) / (tall ? 9.0 : 8.4));
  if (s < 0.45) return false;
  const cx = Math.floor(x / 3), cz = Math.floor(z / 3);
  const key = `${cx},${cz}`;
  if (!grove.has(key)) grove.set(key, []);
  grove.get(key)!.push([x, z, gap]);
  k.tree(x, z, s, tall);
  trees++;
  return true;
}

interface WoodOpts {
  x0: number; z0: number; x1: number; z1: number;
  /** How many trees it should have. */
  n: number;
  seed: number;
  tall: boolean;
  size: [number, number];
  gap: number;
  /** A place the wood may not grow: a clearing, a road it keeps back from. */
  not?: (x: number, z: number) => boolean;
}

/** A wood: trees scattered at random inside its bounds, thick in the middle and thin at the edges, and never in rows. */
function wood(k: Build, o: WoodOpts): number {
  const r = rng(o.seed);
  const inWood = (x: number, z: number): boolean => x > o.x0 && x < o.x1 && z > o.z0 && z < o.z1 && open(x, z, 2) && free(x, z, 1) && !o.not?.(x, z);
  let n = 0;
  // it stops when the wood is full: when a long run of tries finds no room
  for (let tries = 0, misses = 0; n < o.n && tries < o.n * 40 && misses < 2500; tries++, misses++) {
    const x = o.x0 + r() * (o.x1 - o.x0), z = o.z0 + r() * (o.z1 - o.z0);
    if (!inWood(x, z) || !roomFor(x, z, o.gap)) continue;
    // how far in from the wood's edge, up to 6: the wood thins towards its edge
    let inner = 6;
    for (let a = 0; a < 6 && inner > 0; a++) for (let d = 2; d <= inner; d += 2) if (!inWood(x + Math.cos(a * 1.047) * d, z + Math.sin(a * 1.047) * d)) { inner = d - 2; break; }
    const e = 1 - inner / 6;
    if (r() > 1 - 0.75 * e * e) continue;
    const s = o.size[0] + (o.size[1] - o.size[0]) * r() * (1 - 0.35 * e);
    if (plant(k, x, z, s, o.tall, o.gap * (0.85 + r() * 0.4))) { n++; misses = 0; }
  }
  return n;
}

/** Clumps of trees with open ground between: `count` clumps, each of `per` trees within `radius` of its middle. */
function clumps(k: Build, o: { x0: number; z0: number; x1: number; z1: number; count: number; per: [number, number]; radius: [number, number]; seed: number; tall: boolean; size: [number, number]; gap: number; not?: (x: number, z: number) => boolean }): number {
  const r = rng(o.seed);
  let n = 0;
  for (let c = 0, tries = 0; c < o.count && tries < o.count * 30; tries++) {
    const cx = o.x0 + r() * (o.x1 - o.x0), cz = o.z0 + r() * (o.z1 - o.z0);
    if (!open(cx, cz, 2) || !free(cx, cz, 1) || o.not?.(cx, cz)) continue;
    c++;
    const want = Math.round(o.per[0] + r() * (o.per[1] - o.per[0])), rad = o.radius[0] + r() * (o.radius[1] - o.radius[0]);
    for (let i = 0, got = 0; got < want && i < want * 8; i++) {
      const a = r() * Math.PI * 2, d = rad * Math.sqrt(r()), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d * (0.7 + r() * 0.6);
      if (o.not?.(x, z)) continue;
      if (plant(k, x, z, o.size[0] + (o.size[1] - o.size[0]) * r() * (1 - (0.4 * d) / rad), o.tall, o.gap)) { got++; n++; }
    }
  }
  return n;
}

// ---------------------------------------------------------------------------
// Fields, hedges and what stands in them
// ---------------------------------------------------------------------------

type Crop = 'wheat' | 'pasture' | 'plough' | 'stubble';
const CROP: Record<Crop, number> = { wheat: 0xd6b14c, pasture: 0x74a44c, plough: 0x8d6c47, stubble: 0xd9cd97 };
const FURROW = 0x6f5236, HEDGE = 0x4b7a3a, DRYSTONE = 0xa29b8e, STRAW = 0xd8bc62, IRON_DARK = 0x55585c;

/** A field: a patch of four corners a little out of square. A ploughed one has furrows. Returns whether it was laid. */
function field(k: Build, r: () => number, x0: number, z0: number, x1: number, z1: number, crop: Crop): boolean {
  if (!fits(x0, z0, x1, z1, 0, 1.5, 0.2)) return false;
  const j = (): number => r() * 0.8;
  const q: P2[] = [[x0 + j(), z0 + j()], [x1 - j(), z0 + j()], [x1 - j(), z1 - j()], [x0 + j(), z1 - j()]];
  area(k, q, CROP[crop], 0.035);
  if (crop === 'plough') {
    // furrows along the longer side
    const along = x1 - x0 > z1 - z0, n = Math.floor((along ? z1 - z0 : x1 - x0) / 1.1);
    const lerp = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    for (let i = 0; i < n; i++) {
      const t0 = (i + 0.3) / n, t1 = (i + 0.65) / n;
      const [a, b, c, d] = along ? [q[0], q[1], q[2], q[3]] : [q[1], q[2], q[3], q[0]];
      const inA = (p: P2, o: P2): P2 => lerp(p, o, 0.04);
      const p0 = lerp(a, d, t0), p1 = lerp(b, c, t0), p2 = lerp(b, c, t1), p3 = lerp(a, d, t1);
      area(k, [inA(p0, p1), inA(p1, p0), inA(p2, p3), inA(p3, p2)], FURROW, 0.05);
    }
  }
  if (crop === 'stubble') {
    // sheaves stood in stooks
    for (let i = 0; i < 6; i++) {
      const x = x0 + 1.5 + r() * (x1 - x0 - 3), z = z0 + 1.5 + r() * (z1 - z0 - 3);
      k.b.cyl(x, z, 0.035, 0.9, 0.3, 0.1, 4, STRAW, { phase: r() });
    }
  }
  claim(x0, z0, x1, z1);
  return true;
}

/** A low hedge or a drystone wall between two points, 0.5 high, with a gate in it if asked. Each length is laid only where the ground is open. */
function hedge(k: Build, a: P2, c: P2, kind: 'hedge' | 'wall', gate = false): void {
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  if (len < 1) return;
  const ux = (c[0] - a[0]) / len, uz = (c[1] - a[1]) / len, yaw = Math.atan2(uz, ux);
  const runs: [number, number][] = gate ? [[0, len / 2 - 0.85], [len / 2 + 0.85, len]] : [[0, len]];
  for (const [s0, s1] of runs) {
    if (s1 - s0 < 0.6) continue;
    const ok = [0, 0.25, 0.5, 0.75, 1].every((t) => open(a[0] + ux * (s0 + (s1 - s0) * t), a[1] + uz * (s0 + (s1 - s0) * t), 1.5));
    if (!ok) continue;
    const m = (s0 + s1) / 2;
    k.b.obox(a[0] + ux * m, 0.25, a[1] + uz * m, (s1 - s0) / 2, 0.25, kind === 'hedge' ? 0.22 : 0.17, yaw, kind === 'hedge' ? HEDGE : DRYSTONE, { top: kind === 'hedge' ? 0x5a8a45 : 0xb1ab9e });
  }
  if (gate && open(a[0] + ux * len * 0.5, a[1] + uz * len * 0.5, 1.5)) {
    // two posts and a gate of three rails, hung open a little
    for (const s of [-0.75, 0.75]) k.b.box(a[0] + ux * (len / 2 + s) - 0.09, 0, a[1] + uz * (len / 2 + s) - 0.09, a[0] + ux * (len / 2 + s) + 0.09, 0.85, a[1] + uz * (len / 2 + s) + 0.09, TIMBER);
    const g0: P2 = [a[0] + ux * (len / 2 - 0.66), a[1] + uz * (len / 2 - 0.66)];
    for (const y of [0.25, 0.48, 0.71]) k.b.beam([g0[0], y, g0[1]], [g0[0] + Math.cos(yaw + 0.5) * 1.3, y, g0[1] + Math.sin(yaw + 0.5) * 1.3], 0.04, 0.04, 0xb59b74);
  }
}

/**
 * A patchwork of fields over a rectangle, in `cols` by `rows`, each crop
 * drawn at random from `crops`, with hedges or walls on some of the lines
 * between them and a gate in one. A field whose ground is not open is left out.
 */
function patchwork(k: Build, o: { x0: number; z0: number; x1: number; z1: number; cols: number; rows: number; seed: number; crops: Crop[]; bound: 'hedge' | 'wall'; share?: number }): (Rect & { crop: Crop })[] {
  const r = rng(o.seed), w = (o.x1 - o.x0) / o.cols, d = (o.z1 - o.z0) / o.rows, laid: (Crop | null)[][] = [];
  // the crops go round in turn from a place drawn at random, so that neighbours differ
  const first = Math.floor(r() * o.crops.length);
  for (let i = 0; i < o.cols; i++) {
    laid.push([]);
    for (let j = 0; j < o.rows; j++) {
      const crop = o.crops[(first + i * o.rows + j) % o.crops.length];
      const ok = field(k, r, o.x0 + i * w + 0.45, o.z0 + j * d + 0.45, o.x0 + (i + 1) * w - 0.45, o.z0 + (j + 1) * d - 0.45, crop);
      laid[i].push(ok ? crop : null);
    }
  }
  const share = o.share ?? 0.6;
  let gated = false;
  for (let i = 0; i <= o.cols; i++) for (let j = 0; j < o.rows; j++) {
    const a = laid[i - 1]?.[j], b = laid[i]?.[j];
    if (!(a || b) || r() >= share) continue;
    // the first hedge between two fields has a gate in it
    const gate = !gated && !!a && !!b;
    if (gate) gated = true;
    const x = o.x0 + i * w;
    hedge(k, [x, o.z0 + j * d + 0.2], [x, o.z0 + (j + 1) * d - 0.2], o.bound, gate);
  }
  for (let j = 0; j <= o.rows; j++) for (let i = 0; i < o.cols; i++) {
    const a = laid[i]?.[j - 1], b = laid[i]?.[j];
    if ((a || b) && r() < share) { const z = o.z0 + j * d; hedge(k, [o.x0 + i * w + 0.2, z], [o.x0 + (i + 1) * w - 0.2, z], o.bound); }
  }
  const out: (Rect & { crop: Crop })[] = [];
  laid.forEach((col, i) => col.forEach((crop, j) => { if (crop) out.push({ crop, x0: o.x0 + i * w + 0.45, z0: o.z0 + j * d + 0.45, x1: o.x0 + (i + 1) * w - 0.45, z1: o.z0 + (j + 1) * d - 0.45 }); }));
  return out;
}

/** A plough team at work at the near end of a ploughed field: two oxen under a yoke, the plough, and the ploughman. */
function ploughTeam(k: Build, f: Rect): void {
  const tx = (f.x0 + f.x1) / 2 - 0.5, tz = f.z1 - 1.6;
  if (![[tx - 2, tz], [tx + 2.6, tz]].every(([x, z]) => open(x, z, 1.5))) return;
  cow(k, tx + 1.4, tz - 0.5, 0, 0x7b4a2e);
  cow(k, tx + 1.4, tz + 0.5, 0, 0x9a7a5a);
  k.b.beam([tx + 2.0, 1.4, tz - 0.8], [tx + 2.0, 1.4, tz + 0.8], 0.07, 0.07, TIMBER);
  k.b.beam([tx + 1.3, 1.0, tz], [tx - 1.2, 0.2, tz], 0.07, 0.06, TIMBER_DARK);
  k.b.box(tx - 1.4, 0, tz - 0.1, tx - 1.0, 0.5, tz + 0.1, IRON_DARK);
  k.person(tx - 1.9, tz);
}

/** A haystack: a cone of hay with a rounded top. */
function haystack(k: Build, x: number, z: number, s = 1): void {
  if (!open(x, z, 1.5)) return;
  lathe(k.b, x, z, [[1.05 * s, 0], [1.15 * s, 1.0 * s], [0.62 * s, 1.9 * s], [0.03, 2.35 * s]], 7, 0xcfae52);
}

/** A scarecrow: a post, a crossbar with a coat on it, a sacking head and a hat. */
function scarecrow(k: Build, x: number, z: number): void {
  const b = k.b;
  b.box(x - 0.07, 0, z - 0.07, x + 0.07, 2.3, z + 0.07, TIMBER);
  b.box(x - 0.9, 1.75, z - 0.06, x + 0.9, 1.87, z + 0.06, TIMBER, { faces: 'NESWTB' });
  b.box(x - 0.36, 1.05, z - 0.2, x + 0.36, 1.95, z + 0.2, 0x6a5a8a, { faces: 'NESWTB' });
  b.box(x - 0.22, 1.95, z - 0.2, x + 0.22, 2.4, z + 0.2, 0xd9c79a);
  b.cyl(x, z, 2.4, 2.75, 0.42, 0.2, 6, 0x5b4634, { cap: 0x4c3a2b });
}

/** A sheep: a white fleece with a dark face. */
function sheep(k: Build, x: number, z: number, yaw: number): void {
  k.b.obox(x, 0.42, z, 0.5, 0.37, 0.3, yaw, 0xf0ece2, { top: 0xf7f4ec });
  k.b.obox(x + Math.cos(yaw) * 0.6, 0.66, z + Math.sin(yaw) * 0.6, 0.18, 0.17, 0.15, yaw, 0x2b2626);
}

/** A flock grazing round a place, and its shepherd with a crook. `inside` keeps them in their pasture. */
function flock(k: Build, cx: number, cz: number, n: number, rad: number, seed: number, shepherd = true, inside?: Rect): void {
  const r = rng(seed);
  for (let i = 0, got = 0; got < n && i < n * 6; i++) {
    const a = r() * Math.PI * 2, d = rad * Math.sqrt(r()), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (inside && (x < inside.x0 + 0.6 || x > inside.x1 - 0.6 || z < inside.z0 + 0.6 || z > inside.z1 - 0.6)) continue;
    if (!open(x, z, 1.5)) continue;
    sheep(k, x, z, r() * Math.PI * 2);
    got++;
  }
  if (shepherd && open(cx + rad + 0.6, cz, 1.5)) {
    k.person(cx + rad + 0.6, cz);
    k.b.beam([cx + rad + 1.05, 0, cz + 0.2], [cx + rad + 1.1, 2.6, cz + 0.25], 0.05, 0.05, 0xb59b74);
  }
}

/** A cow, or an ox: a body on its legs, and its head. */
function cow(k: Build, x: number, z: number, yaw: number, color: number): void {
  const b = k.b;
  b.moved(x, 0, z, yaw, () => {
    b.box(-0.85, 0.55, -0.38, 0.85, 1.35, 0.38, color, { faces: 'NESWTB' });
    for (const lx of [-0.65, 0.5]) b.box(lx, 0, -0.32, lx + 0.18, 0.56, 0.32, 0x3a2a22, { faces: 'NESW' });
    b.box(0.85, 0.85, -0.22, 1.35, 1.35, 0.22, color);
    b.box(1.35, 0.85, -0.16, 1.45, 1.15, 0.16, 0xd9a89a);
    for (const s of [-1, 1]) b.box(0.95, 1.35, s * 0.18 - 0.05, 1.05, 1.55, s * 0.18 + 0.05, 0xe7dcc4);
  });
}

/** A horse or a mule: body, legs, neck, head and tail. A mule may carry packs. */
function horse(k: Build, x: number, z: number, yaw: number, color: number, s = 1, packs = false): void {
  const b = k.b;
  b.moved(x, 0, z, yaw, () => {
    b.box(-0.8 * s, 0.9 * s, -0.3 * s, 0.8 * s, 1.55 * s, 0.3 * s, color, { faces: 'NESWTB' });
    for (const lx of [-0.72, 0.48]) b.box(lx * s, 0, -0.25 * s, (lx + 0.22) * s, 0.92 * s, 0.25 * s, color, { faces: 'NESW' });
    b.beam([0.62 * s, 1.35 * s, 0], [1.05 * s, 2.05 * s, 0], 0.2 * s, 0.15 * s, color);
    b.box(0.95 * s, 1.78 * s, -0.15 * s, 1.6 * s, 2.12 * s, 0.15 * s, color);
    b.beam([-0.8 * s, 1.45 * s, 0], [-1.1 * s, 0.75 * s, 0], 0.09 * s, 0.05 * s, 0x2a2220);
    if (packs) for (const sz of [-1, 1]) b.box(-0.45 * s, 1.0 * s, sz > 0 ? 0.3 * s : -0.58 * s, 0.4 * s, 1.5 * s, sz > 0 ? 0.58 * s : -0.3 * s, 0x8a6f4a);
  });
}

// ---------------------------------------------------------------------------
// Farms
// ---------------------------------------------------------------------------

/** One row of small panes, most of them lit at night: a farmhouse's. */
const FARM_WIN: WinSpec = HOUSE_WIN;

interface HouseOpts { w: number; d: number; wall: number; roof: number; timber?: boolean; chimney?: boolean; win?: boolean; door?: number }

/**
 * A small house of one storey with a pitched roof, its door to the south: a
 * farmhouse of daub and timber, a croft of stone with snow on its roof, a
 * fisher's hut, a barn. Its chimney smokes.
 */
function house(k: Build, x: number, z: number, o: HouseOpts): void {
  const b = k.b, hw = o.w / 2, hd = o.d / 2, H = 2.6, rise = Math.min(1.8, o.d * 0.55);
  b.box(x - hw, 0, z - hd, x + hw, H, z + hd, o.wall, { win: o.win === false ? undefined : FARM_WIN, seed: x * 0.31 + z * 0.17 });
  if (o.timber) {
    // the frame shows at the corners and as a band under the eaves
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(x + sx * hw - 0.12, 0, z + sz * hd - 0.12, x + sx * hw + 0.12, H - 0.03, z + sz * hd + 0.12, TIMBER, { faces: 'NESW' });
    b.box(x - hw - 0.06, H - 0.32, z + hd, x + hw + 0.06, H - 0.12, z + hd + 0.06, TIMBER, { faces: 'NESWB' });
  }
  b.box(x - 0.45, 0, z + hd, x + 0.45, 1.75, z + hd + 0.07, o.door ?? DOOR, { faces: 'NESWT' });
  gable(b, x - hw, z - hd, x + hw, z + hd, H, rise, o.roof, o.wall, 'x', 0.32);
  if (o.chimney !== false) {
    const cx = x + hw - 0.75, top = H + rise + 0.55;
    b.box(cx - 0.32, H - 0.4, z - 0.32, cx + 0.32, top, z + 0.32, STONE.north, { top: DARK });
    smokes.push({ x: cx, y: top + 0.3, z, shade: 0.86, size: 0.42, every: 0.45 });
  }
}

/** A well: a ring of stone, two posts, a little roof and a bucket. */
function well(k: Build, x: number, z: number): void {
  const b = k.b;
  b.cyl(x, z, 0, 0.8, 0.62, 0.62, 6, STONE.river, { cap: DARK });
  for (const s of [-1, 1]) b.box(x + s * 0.55 - 0.07, 0.8, z - 0.07, x + s * 0.55 + 0.07, 1.9, z + 0.07, TIMBER);
  gable(b, x - 0.75, z - 0.5, x + 0.75, z + 0.5, 1.9, 0.5, ROOF.shingle, TIMBER, 'x', 0.1);
  b.box(x - 0.15, 1.1, z - 0.15, x + 0.15, 1.4, z + 0.15, 0x8a6f4a);
}

/** A cart with two wheels and its shafts down, standing in a yard. */
function cart(k: Build, x: number, z: number, yaw: number): void {
  const b = k.b;
  b.moved(x, 0, z, yaw, () => {
    b.box(-1.2, 0.75, -0.62, 1.2, 0.95, 0.62, TIMBER, { faces: 'NESWTB' });
    for (const s of [-1, 1]) b.box(-1.2, 0.95, s > 0 ? 0.5 : -0.62, 1.2, 1.3, s > 0 ? 0.62 : -0.5, TIMBER_DARK, { faces: 'NESWT' });
    b.box(-1.2, 0.95, -0.5, -1.08, 1.3, 0.5, TIMBER_DARK, { faces: 'EWT' });
    for (const s of [-1, 1]) wheel(b, 0, 0.55, s * 0.74, 0.55, 0.07, s, TIMBER_DARK, 0x9b7a55);
    for (const s of [-1, 1]) b.beam([1.15, 0.85, s * 0.42], [2.7, 0.1, s * 0.42], 0.05, 0.05, 0x9b7a55);
    b.box(-0.8, 0.95, -0.35, 0.1, 1.35, 0.35, 0xc9b48a);
  });
}

/** A line of washing between two posts. */
function washing(k: Build, x: number, z: number, yaw: number): void {
  const b = k.b, c = Math.cos(yaw), s = Math.sin(yaw);
  for (const u of [-1.8, 1.8]) b.box(x + c * u - 0.06, 0, z + s * u - 0.06, x + c * u + 0.06, 2.0, z + s * u + 0.06, TIMBER);
  b.beam([x - c * 1.8, 1.92, z - s * 1.8], [x + c * 1.8, 1.92, z + s * 1.8], 0.025, 0.025, 0xe8e4da);
  const cloth = [0xf3f0e6, 0x7d9cc0, 0xc9a7a0, 0xe9dcb8];
  cloth.forEach((col, i) => {
    const u0 = -1.45 + i * 0.78, u1 = u0 + 0.55, y0 = 1.15 + (i % 2) * 0.2;
    const p = (u: number, y: number, o: number): V3 => [x + c * u - s * o, y, z + s * u + c * o];
    b.quad(p(u0, y0, 0.02), p(u1, y0, 0.02), p(u1, 1.9, 0.02), p(u0, 1.9, 0.02), [-s, 0, c], col);
    b.quad(p(u1, y0, -0.02), p(u0, y0, -0.02), p(u0, 1.9, -0.02), p(u1, 1.9, -0.02), [s, 0, -c], col);
  });
}

/** Hens about a yard. */
function hens(k: Build, x: number, z: number, n: number, seed: number): void {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const hx = x + (r() - 0.5) * 3, hz = z + (r() - 0.5) * 1.6, yaw = r() * 6.3, col = r() < 0.5 ? 0xf2eee4 : 0xa8653a;
    k.b.obox(hx, 0.2, hz, 0.22, 0.2, 0.14, yaw, col);
    k.b.obox(hx + Math.cos(yaw) * 0.2, 0.45, hz + Math.sin(yaw) * 0.2, 0.08, 0.08, 0.07, yaw, 0xc0392b);
  }
}

interface FarmOpts {
  seed: number;
  /** Stone and snow, for the North. */
  north?: boolean;
  barn?: boolean;
  well?: boolean;
  byre?: boolean;
  cart?: boolean;
  washing?: boolean;
  people?: number;
}

/**
 * A farm: a house, and beside it a barn, a byre or a well, all in a row with
 * their doors to the south, and a yard before them with hens, a cart and a
 * line of washing. It looks for room near (x, z). Returns where it stands.
 */
function farm(k: Build, x: number, z: number, o: FarmOpts): Rect | null {
  const parts: { w: number; kind: 'house' | 'barn' | 'byre' | 'well' }[] = [{ w: 4.4, kind: 'house' }];
  if (o.barn) parts.push({ w: 3.8, kind: 'barn' });
  if (o.byre) parts.push({ w: 3.2, kind: 'byre' });
  if (o.well) parts.push({ w: 1.6, kind: 'well' });
  const W = parts.reduce((s, p) => s + p.w + 0.8, -0.8), D = 3 + 2.6;
  let c = spot(x, z, W, D, 5);
  // a farm that does not find room for all its buildings makes do with fewer
  while (!c && parts.length > 1) {
    parts.pop();
    const w2 = parts.reduce((s, p) => s + p.w + 0.8, -0.8);
    c = spot(x, z, w2, D, 5);
    if (c) return farmAt(k, c, parts, w2, D, o);
  }
  if (!c) missed.push(`farm near ${x}, ${z}`);
  return c ? farmAt(k, c, parts, W, D, o) : null;
}

function farmAt(k: Build, c: P2, parts: { w: number; kind: 'house' | 'barn' | 'byre' | 'well' }[], W: number, D: number, o: FarmOpts): Rect {
  const r = rng(o.seed), x0 = c[0] - W / 2, z0 = c[1] - D / 2, zb = z0 + 1.5;
  const wall = o.north ? STONE.north : DAUB, roof = o.north ? 0xeef2f5 : ROOF.thatch;
  // the yard: trodden earth, or trodden snow
  area(k, [[x0 - 0.3, z0 + 2.6], [x0 + W + 0.3, z0 + 2.7], [x0 + W + 0.1, z0 + D + 0.2], [x0 - 0.1, z0 + D + 0.1]], o.north ? 0xd5dadc : 0xa8966f, 0.035);
  let u = x0;
  for (const p of parts) {
    const mx = u + p.w / 2;
    if (p.kind === 'house') house(k, mx, zb, { w: p.w, d: 3, wall, roof, timber: !o.north });
    if (p.kind === 'barn') house(k, mx, zb - 0.1, { w: p.w, d: 3.2, wall: o.north ? STONE.northShade : TIMBER, roof: o.north ? 0xeef2f5 : ROOF.shingle, chimney: false, win: false, door: DARK });
    if (p.kind === 'byre') house(k, mx, zb, { w: p.w, d: 2.6, wall: o.north ? STONE.northShade : STONE.river, roof, chimney: false, win: false, door: DARK });
    if (p.kind === 'well') well(k, mx, zb + 1.8);
    u += p.w + 0.8;
  }
  const yz = z0 + D - 0.9;
  if (!o.north) hens(k, x0 + W * 0.3, yz, 5, o.seed + 1);
  if (o.cart !== false) cart(k, x0 + W - 1.6, yz - 0.1, 0.2 + r() * 0.3);
  if (o.washing) washing(k, x0 + W * 0.45, z0 + D - 0.35, 0);
  for (let i = 0; i < (o.people ?? 2); i++) k.person(x0 + 1 + r() * (W - 2), yz + (r() - 0.5) * 0.6);
  k.lights.push({ x: c[0], z: c[1], r: 9, color: '#ffcf8a', k: 0.45 });
  claim(x0 - 0.3, z0, x0 + W + 0.3, z0 + D + 0.2);
  return { x0, z0, x1: x0 + W, z1: z0 + D };
}

/** A windmill on a low mound: a tapering tower, a thatched cap, and four sails that stand still, turned to the opening view. */
function windmill(k: Build, x: number, z: number): void {
  const b = k.b, y = 0.8;
  lathe(b, x, z, [[3.0, 0], [2.4, 0.5], [1.7, y], [0.02, y + 0.04]], 8, 0x7fae5a);
  b.cyl(x, z, y, y + 5.0, 1.45, 1.05, 8, 0xe6dfcc, { cap: false });
  lathe(b, x, z, [[1.3, y + 5.0], [0.95, y + 5.7], [0.03, y + 6.1]], 8, ROOF.thatch);
  b.moved(x, 0, z, FACE, () => {
    b.box(-0.4, y, 1.25, 0.4, y + 1.6, 1.42, DOOR, { faces: 'NESWT' });
    b.box(-0.3, y + 3.2, 1.05, 0.3, y + 3.9, 1.2, DARK, { win: { cell: 0, storey: 5, lit: 0.6, kind: 5 } });
    // the hub stands out of the cap, and the sails stand in front of it
    const hub: V3 = [0, y + 4.6, 1.55];
    b.beam([0, y + 4.6, 0.6], hub, 0.16, 0.16, TIMBER_DARK);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2, ca = Math.cos(a), sa = Math.sin(a);
      const pt = (s: number, w: number, zz: number): V3 => [ca * s - sa * w, hub[1] + sa * s + ca * w, zz];
      b.beam(pt(-0.1, 0, hub[2] + 0.05), pt(3.3, 0, hub[2] + 0.05), 0.07, 0.06, 0x9b7a55);
      const f = hub[2] + 0.14;
      b.quad(pt(0.7, 0.12, f), pt(3.2, 0.12, f), pt(3.2, 0.72, f), pt(0.7, 0.72, f), [0, 0, 1], 0xebe3cf);
      b.quad(pt(3.2, 0.12, f - 0.03), pt(0.7, 0.12, f - 0.03), pt(0.7, 0.72, f - 0.03), pt(3.2, 0.72, f - 0.03), [0, 0, -1], 0xd8cfb8);
    }
  });
  claim(x - 3, z - 3, x + 3, z + 3);
}

/** A waterwheel on a level axle that runs north and south: rim, both faces, and paddles. */
function waterwheel(b: GeoBuilder, x: number, y: number, z: number, r: number, half: number): void {
  const n = 8, ring = (rr: number): P2[] => Array.from({ length: n }, (_, i): P2 => [x + Math.cos(((i + 0.5) / n) * Math.PI * 2) * rr, y + Math.sin(((i + 0.5) / n) * Math.PI * 2) * rr]);
  const p = ring(r);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, am = ((i + 1) / n) * Math.PI * 2;
    b.quad([p[i][0], p[i][1], z - half], [p[j][0], p[j][1], z - half], [p[j][0], p[j][1], z + half], [p[i][0], p[i][1], z + half], [Math.cos(am), Math.sin(am), 0], TIMBER_DARK);
  }
  for (const s of [-1, 1]) for (let i = 1; i + 1 < n; i++) tri(b, [p[0][0], p[0][1], z + s * half], [p[i][0], p[i][1], z + s * half], [p[i + 1][0], p[i + 1][1], z + s * half], [0, 0, s], 0x8a6a48);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    b.beam([x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, z], [x + Math.cos(a) * (r + 0.3), y + Math.sin(a) * (r + 0.3), z], 0.24, 0.24, 0x9b7a55);
  }
}

/** The watermill on the Trident's south bank: a mill house, its wheel standing in the river's edge, a barn, and the miller. */
function watermill(k: Build, wantX: number): void {
  const line = RIVERS.trident.line;
  // where the river's middle is, below the place asked for
  let rz = -6, best = Infinity;
  for (let z = -10; z < 0; z += 0.05) { const d = toLine(wantX, z, line); if (d < best) { best = d; rz = z; } }
  const half = 1.5 + 0.4 * 0.25;
  const c = spot(wantX, rz + 5.2, 4.4, 3.6, 4.6, 4);
  if (!c) return void missed.push('watermill');
  const [x, z] = c, x1 = x + 2.2;
  house(k, x, z, { w: 4.4, d: 3.6, wall: DAUB, roof: ROOF.thatch, timber: true });
  claim(x - 2.5, z - 2, x + 2.5, z + 2);
  // the wheel stands just east of the mill, in the water by the bank
  let wz = rz + half - 0.75;
  for (let zz = z - 1.8; zz > rz; zz -= 0.05) if (toLine(x1 + 0.9, zz, line) < half - 0.4) { wz = zz; break; }
  waterwheel(k.b, x1 + 0.9, -0.15, wz, 1.35, 0.3);
  // the axle runs to a post at the mill's corner
  millAxle(k, x1 + 0.9, z - 1.8, wz);
  const barn = spot(x - 6.5, z, 3.6, 3, 4.4, 3);
  if (barn) { house(k, barn[0], barn[1], { w: 3.6, d: 3, wall: TIMBER, roof: ROOF.shingle, chimney: false, win: false, door: DARK }); claim(barn[0] - 2, barn[1] - 1.7, barn[0] + 2, barn[1] + 1.7); }
  folk(k, x - 1.2, z + 2.6);
  folk(k, x + 1.5, z + 2.4);
  // sacks of flour at the door
  for (const dx of [0.8, 1.3]) k.b.box(x + dx, 0, z + 1.85, x + dx + 0.42, 0.55, z + 2.2, 0xe9e1cc);
  k.lights.push({ x, z, r: 8, color: '#ffcf8a', k: 0.45 });
}

/** The axle of the waterwheel, and the post and frame that carry its inner end. */
function millAxle(k: Build, x: number, zPost: number, zWheel: number): void {
  const b = k.b;
  b.box(x - 0.18, 0, zPost - 0.18, x + 0.18, 1.6, zPost + 0.18, TIMBER);
  b.beam([x, -0.15, zWheel], [x, 0.2, zPost], 0.12, 0.12, TIMBER_DARK);
  // a launder that brings the water to the wheel's top from upstream
  b.box(x - 2.6, 1.15, zWheel - 0.22, x - 0.3, 1.4, zWheel + 0.22, 0x8a6a48, { faces: 'NESWTB' });
  b.box(x - 2.6, 0, zWheel + 0.7 - 0.1, x - 2.4, 1.2, zWheel + 0.7 + 0.1, TIMBER);
}

/** A holdfast of the riverlands: one stone tower house seven high, and a pale of stakes round it with a gate to the south. */
function holdfast(k: Build, x: number, z: number): void {
  const b = k.b, R = 3.0, Z = 2.45;
  squareTower(b, x, z, 1.8, 7, STONE.river, { win: { cell: 1.5, storey: 3, lit: 0.4, kind: 4 }, shade: STONE.riverShade });
  b.box(x - 0.5, 0, z + 1.8, x + 0.5, 1.9, z + 1.88, DOOR, { faces: 'NESWT' });
  const sides: [P2, P2][] = [[[x - R, z - Z], [x + R, z - Z]], [[x + R, z - Z], [x + R, z + Z]], [[x + R, z + Z], [x + 0.8, z + Z]], [[x - 0.8, z + Z], [x - R, z + Z]], [[x - R, z + Z], [x - R, z - Z]]];
  for (const [a, c] of sides) pale(b, a, c);
  for (const s of [-1, 1]) b.box(x + s * 0.8 - 0.15, 0, z + Z - 0.15, x + s * 0.8 + 0.15, 2.3, z + Z + 0.15, TIMBER_DARK);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(x + sx * R - 0.17, 0, z + sz * Z - 0.17, x + sx * R + 0.17, 2.15, z + sz * Z + 0.17, TIMBER_DARK);
  fire(k, x + 1.0, 1.9, z + Z + 0.3, 0.2, 7);
  folk(k, x - 1.6, z + Z + 0.9, 0, 1);
  claim(x - R - 0.3, z - Z - 0.3, x + R + 0.3, z + Z + 0.3);
}

/** A pale: a fence of stakes with pointed tops, between two points. */
function pale(b: GeoBuilder, a: P2, c: P2): void {
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]), ux = (c[0] - a[0]) / len, uz = (c[1] - a[1]) / len, nx = -uz, nz = ux;
  b.obox((a[0] + c[0]) / 2, 0.8, (a[1] + c[1]) / 2, len / 2 - 0.14, 0.8, 0.12, Math.atan2(uz, ux), TIMBER, { top: TIMBER_DARK });
  const n = Math.max(1, Math.round(len / 0.5));
  for (let i = 0; i < n; i++) {
    const s0 = (i / n) * len, s1 = ((i + 1) / n) * len, sm = (s0 + s1) / 2;
    for (const side of [-1, 1]) {
      const o = side * 0.12;
      tri(b, [a[0] + ux * s0 + nx * o, 1.6, a[1] + uz * s0 + nz * o], [a[0] + ux * s1 + nx * o, 1.6, a[1] + uz * s1 + nz * o], [a[0] + ux * sm, 2.0, a[1] + uz * sm], [nx * side, 0.3, nz * side], TIMBER);
    }
  }
}

// ---------------------------------------------------------------------------
// Things of the North
// ---------------------------------------------------------------------------

/** A drystone sheepfold: a ring of wall with a gap to the south, and sheep in it. */
function sheepfold(k: Build, x: number, z: number, seed: number): void {
  const c = spot(x, z, 6.4, 6.4, 0, 10);
  if (!c) return void missed.push('sheepfold');
  const [cx, cz] = c, R = 2.7, n = 8;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    // the gap: the segment that faces south-east
    if (i === 1) continue;
    const p0: P2 = [cx + Math.cos(a0) * R, cz + Math.sin(a0) * R], p1: P2 = [cx + Math.cos(a1) * R, cz + Math.sin(a1) * R];
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    k.b.obox((p0[0] + p1[0]) / 2, 0.35, (p0[1] + p1[1]) / 2, len / 2 + 0.12, 0.35, 0.22, Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), DRYSTONE, { top: 0xf2f5f7 });
  }
  const r = rng(seed);
  for (let i = 0; i < 4; i++) sheep(k, cx + (r() - 0.5) * 2.4, cz + (r() - 0.5) * 2.4, r() * 6.3);
  claim(cx - R - 0.3, cz - R - 0.3, cx + R + 0.3, cz + R + 0.3);
}

/** A stack of cut peat drying by a croft. */
function peat(k: Build, x: number, z: number): void {
  if (!fits(x - 1, z - 0.6, x + 1, z + 0.6, 2)) return;
  k.b.box(x - 0.95, 0, z - 0.5, x + 0.95, 0.75, z + 0.5, 0x4a3a2e, { top: 0x5a4838 });
  k.b.box(x - 0.7, 0.75, z - 0.35, x + 0.7, 1.25, z + 0.35, 0x4a3a2e, { top: 0xeef2f5 });
  claim(x - 1, z - 0.6, x + 1, z + 0.6);
}

/** A cairn of piled stones. */
function cairn(k: Build, x: number, z: number): void {
  const c = spot(x, z, 2.2, 2.2, 2, 6);
  if (!c) return void missed.push('cairn');
  const [cx, cz] = c;
  ([[1.0, 0, 0.6], [0.75, 0.6, 1.1], [0.48, 1.1, 1.5], [0.22, 1.5, 1.78]] as const).forEach(([r, y0, y1], i) =>
    k.b.cyl(cx, cz, y0, y1, r, r * 0.85, 6, i % 2 ? ROCK : ROCK_DARK, { phase: i * 0.7, cap: i === 3 ? 0xf2f5f7 : ROCK }));
  claim(cx - 1.1, cz - 1.1, cx + 1.1, cz + 1.1);
}

/** A line of old standing stones, leaning a little out of true. */
function standingStones(k: Build, x: number, z: number, n: number, seed: number): void {
  const r = rng(seed), yaw = 0.35;
  for (let i = 0; i < n; i++) {
    const sx = x + Math.cos(yaw) * i * 2.1, sz = z + Math.sin(yaw) * i * 2.1, h = 1.4 + r() * 1.3;
    if (!open(sx, sz, 2) || !free(sx, sz, 0.5) || h > cap(sx, sz)) continue;
    k.b.obox(sx, h / 2, sz, 0.32 + r() * 0.12, h / 2, 0.2, yaw + (r() - 0.5) * 0.4, i % 2 ? 0x8a867e : 0x7c786f, { top: 0xf2f5f7 });
    claim(sx - 0.5, sz - 0.5, sx + 0.5, sz + 0.5);
  }
}

/** A ring of barrows on a low rise: round mounds, green-brown where the snow has slid from them. */
function barrows(k: Build, x: number, z: number): void {
  const c = spot(x, z, 14, 14, 2, 10);
  if (!c) return void missed.push('barrows');
  const [cx, cz] = c;
  lathe(k.b, cx, cz, [[6.8, 0], [5.4, 0.35], [0.02, 0.5]], 10, 0xeef2f5);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3, bx = cx + Math.cos(a) * 4.0, bz = cz + Math.sin(a) * 4.0, s = i === 2 ? 1.25 : 0.9 + (i % 3) * 0.1;
    lathe(k.b, bx, bz, [[1.5 * s, 0.32], [1.25 * s, 0.85 * s], [0.65 * s, 1.25 * s], [0.03, 1.38 * s]], 7, i % 2 ? 0x7b7652 : 0x6f7a4e);
  }
  // the old stone at its middle
  k.b.obox(cx, 0.45 + 0.9, cz, 0.35, 0.9, 0.22, 0.4, 0x8a867e, { top: 0xf2f5f7 });
  claim(cx - 7, cz - 7, cx + 7, cz + 7);
}

/** A croft of the North: a stone house with snow on its roof, a byre, a stack of peat and a sheepfold. */
function croft(k: Build, x: number, z: number, seed: number): void {
  const f = farm(k, x, z, { seed, north: true, byre: true, cart: false, people: 1 });
  if (!f) return;
  peat(k, f.x1 + 1.6, (f.z0 + f.z1) / 2);
  sheepfold(k, f.x0 - 4, f.z1 + 2, seed + 7);
}

/** A rally stage's arch over the kingsroad: two timber posts hung with shields and a beam with a cloth hung from it. A finish arch has a chequered cloth. */
function arch(k: Build, z: number, finish: boolean): void {
  const b = k.b, mid = 16, top = 6.5, posts = [mid - 5.5, mid + 5.5];
  const shields = ['stark', 'umber', 'karstark', 'manderly', 'bolton', 'mormont'];
  const arms: Record<string, [number, number]> = { stark: [0x8a9099, 0xe8e6df], umber: [0x8a5a2e, 0x1d1d20], karstark: [0x1d1d20, 0xe8e6df], manderly: [0x3f7a6a, 0xe8e6df], bolton: [0xc9a7a0, 0x9b1b1f], mormont: [0x3f7a3a, 0x1d1d20] };
  posts.forEach((x, pi) => {
    b.box(x - 0.28, 0, z - 0.28, x + 0.28, top + 0.3, z + 0.28, TIMBER);
    // two shields on the south face of each post and one on the north
    [[2.3, 1], [3.7, 1], [3.0, -1]].forEach(([y, s], i) => {
      const [field, charge] = arms[shields[(pi * 3 + i) % shields.length]];
      b.box(x - 0.42, y - 0.5, s > 0 ? z + 0.28 : z - 0.36, x + 0.42, y + 0.45, s > 0 ? z + 0.36 : z - 0.28, field, { faces: 'NESWTB' });
      b.box(x - 0.42, y - 0.12, s > 0 ? z + 0.36 : z - 0.39, x + 0.42, y + 0.1, s > 0 ? z + 0.39 : z - 0.36, charge, { faces: s > 0 ? 'SEWTB' : 'NEWTB' });
    });
    fire(k, x + (pi ? 0.45 : -0.45), 4.8, z + 0.45, 0.2, 6);
  });
  b.box(posts[0] - 0.4, top, z - 0.32, posts[1] + 0.4, top + 0.45, z + 0.32, TIMBER, { faces: 'NESWTB', top: TIMBER_DARK });
  const x0 = mid - 3.6, x1 = mid + 3.6, y0 = top - 1.45, y1 = top;
  const cloth = (zz: number, n: number, color: number, u0 = x0, u1 = x1, v0 = y0, v1 = y1): void =>
    b.quad([u0, v0, zz], [u1, v0, zz], [u1, v1, zz], [u0, v1, zz], [0, 0, n], color);
  if (!finish) {
    // a plain red cloth, hung on both faces of the beam
    cloth(z + 0.34, 1, 0xa8262c);
    cloth(z - 0.34, -1, 0x8f2025);
  } else {
    cloth(z + 0.34, 1, 0xf3f1ea);
    cloth(z - 0.34, -1, 0xf3f1ea);
    const cols = 10, rows = 2, cw = (x1 - x0) / cols, rh = (y1 - y0) / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      if ((i + j) % 2) continue;
      cloth(z + 0.37, 1, 0x18181b, x0 + i * cw, x0 + (i + 1) * cw, y0 + j * rh, y0 + (j + 1) * rh);
      cloth(z - 0.37, -1, 0x18181b, x0 + i * cw, x0 + (i + 1) * cw, y0 + j * rh, y0 + (j + 1) * rh);
    }
  }
}

/**
 * A rally stage on the kingsroad north of Winterfell's gate: the start arch,
 * the finish arch, and by the start, on the open ground east of the road
 * between Mole's Town and Winter Town, a snowbank with a crowd on it, hay
 * bales, a marshal with his flag, a brazier and a pie seller's stall.
 */
function rallyStage(k: Build): void {
  arch(k, -71, false);
  arch(k, -50.5, true);
  const b = k.b, r = rng(7101);
  // the snowbank, and the crowd on it
  const bank: Rect = { x0: 27.4, z0: -70.2, x1: 37.4, z1: -67.8 };
  if (fits(bank.x0, bank.z0, bank.x1, bank.z1, 4, 1.5)) {
    const y = 0.75;
    b.box(bank.x0, 0, bank.z0, bank.x1, y, bank.z1, 0xf3f6f8, { top: 0xf7f9fa });
    b.box(bank.x0 + 0.5, y, bank.z0 + 0.3, bank.x1 - 0.5, y + 0.25, bank.z1 - 0.3, 0xf3f6f8, { top: 0xfafbfc, faces: 'NESWT' });
    claim(bank.x0, bank.z0, bank.x1, bank.z1);
    const flags = [HOUSE.stark, HOUSE.tully, HOUSE.baratheon, HOUSE.arryn, HOUSE.stark, HOUSE.lannister];
    for (let i = 0; i < 18; i++) {
      const px = bank.x0 + 0.7 + (i / 17) * (bank.x1 - bank.x0 - 1.4) + (r() - 0.5) * 0.25, pz = -69 + (r() - 0.5) * 0.9;
      if (!open(px, pz, 2)) continue;
      const py = Math.abs(px - (bank.x0 + bank.x1) / 2) < 4.5 && Math.abs(pz + 69) < 0.9 ? y + 0.25 : y;
      k.person(px, pz, py);
      if (i % 3 === 1) bandedFlag(b, px + 0.42, pz, py + 1.3, 2.0, flags[(i / 3) | 0], 1.25, 0.8);
    }
  }
  // hay bales at the start, where the road bends
  for (const [hx, hz, hy] of [[24.6, -69.4, 0], [25.75, -69.4, 0], [25.2, -68.65, 0], [25.15, -69.0, 0.55]] as const) {
    if (open(hx, hz, 2)) b.box(hx - 0.55, hy, hz - 0.33, hx + 0.55, hy + 0.55, hz + 0.33, STRAW, { top: 0xe3c977 });
  }
  // the marshal, with the flag that starts each rider
  if (open(26.8, -69.4, 2)) {
    k.person(26.8, -69.4);
    bandedFlag(b, 27.15, -69.4, 1.3, 1.7, [0xe0b830, 0xe0b830], 1.0, 0.7);
  }
  // a brazier to warm hands at, and the pie seller
  if (open(38.6, -70.6, 2)) brazier(k, 38.6, -70.6);
  const stall = spot(41.2, -71.2, 3, 2, 4, 3);
  if (stall) {
    const [sx, sz] = stall;
    b.box(sx - 1.3, 0, sz - 0.5, sx + 1.3, 1.0, sz + 0.5, TIMBER, { top: 0x9b7a55 });
    for (const dx of [-1.3, 1.15]) b.box(sx + dx, 1.0, sz - 0.5, sx + dx + 0.15, 2.4, sz - 0.35, TIMBER_DARK);
    b.box(sx - 1.5, 2.4, sz - 0.9, sx + 1.5, 2.55, sz + 0.75, 0xc8553f, { faces: 'NESWTB', top: 0xe8e2d4 });
    for (let i = 0; i < 4; i++) b.cyl(sx - 0.9 + i * 0.6, sz + 0.1, 1.0, 1.16, 0.22, 0.22, 6, 0xc98d4a, { cap: 0xd9a35d });
    k.person(sx, sz - 1.1);
    folk(k, sx - 0.6, sz + 1.5, 0, 1.5);
    folk(k, sx + 0.7, sz + 1.6, 0, 1.5);
    k.lights.push({ x: sx, z: sz, r: 7, color: '#ffcf8a', k: 0.45 });
    claim(sx - 1.6, sz - 1.2, sx + 1.6, sz + 0.9);
  }
}

/** A direwolf: a big grey wolf, standing on a snowy rise and looking at the road to the west. */
function direwolf(k: Build, x: number, z: number): void {
  const b = k.b, grey = 0x8b8f94, dark = 0x55585c, y = 0.5;
  lathe(b, x, z, [[1.7, 0], [1.1, 0.38], [0.02, y]], 7, 0xf4f7f9);
  b.moved(x, y, z, Math.PI + 0.25, () => {
    b.box(-0.62, 0.78, -0.24, 0.5, 1.3, 0.24, grey, { faces: 'NESWTB', top: 0x9a9ea3 });
    b.box(0.3, 0.7, -0.27, 0.78, 1.42, 0.27, grey, { faces: 'NESWTB' });
    for (const lx of [-0.55, 0.5]) for (const s of [-1, 1]) b.box(lx, 0, s * 0.14 - 0.08, lx + 0.16, 0.82, s * 0.14 + 0.08, dark, { faces: 'NESW' });
    b.box(0.72, 1.22, -0.18, 1.12, 1.62, 0.18, grey);
    b.box(1.12, 1.26, -0.1, 1.42, 1.46, 0.1, 0x9a9ea3);
    b.box(1.38, 1.36, -0.05, 1.45, 1.46, 0.05, 0x1c1a1c);
    for (const s of [-1, 1]) b.box(0.8, 1.62, s * 0.11 - 0.05, 0.92, 1.8, s * 0.11 + 0.05, dark);
    b.beam([-0.6, 1.2, 0], [-1.05, 0.72, 0], 0.11, 0.07, grey);
  });
  claim(x - 1.7, z - 1.7, x + 1.7, z + 1.7);
}

/** A giant twice a man's height in furs with a club, walking beside a mammoth, and their tracks behind them in the snow. */
function giantAndMammoth(k: Build, x: number, z: number): void {
  const b = k.b, yaw = Math.atan2(VIEW[1], VIEW[0]) - 0.35, fur = 0x6b4a2e, shag = 0x553a24;
  // the mammoth, its nose along its own +x
  b.moved(x, 0, z, yaw, () => {
    for (const lx of [-1.15, 0.75]) for (const s of [-1, 1]) b.box(lx, 0, s * 0.72 - 0.3, lx + 0.6, 1.9, s * 0.72 + 0.3, shag, { faces: 'NESW' });
    b.box(-1.7, 1.15, -1.3, 1.6, 1.6, 1.3, shag, { faces: 'NESWB' });
    b.box(-1.6, 1.6, -1.2, 1.45, 4.0, 1.2, fur, { faces: 'NESWTB', top: 0x7a5636 });
    b.box(-0.7, 4.0, -0.9, 0.8, 4.6, 0.9, fur, { top: 0x7a5636 });
    b.box(1.45, 2.6, -0.8, 2.5, 4.4, 0.8, fur, { faces: 'NESWTB' });
    b.box(1.6, 4.4, -0.55, 2.3, 4.95, 0.55, fur);
    for (const s of [-1, 1]) b.box(1.5, 3.0, s * 0.8, 1.9, 4.1, s * 0.8 + s * 0.15, shag, { faces: 'NESWTB' });
    b.sweep([[2.45, 3.3, 0], [2.85, 2.3, 0], [2.95, 1.2, 0], [3.25, 0.55, 0]], [0.34, 0.27, 0.2, 0.15], fur);
    for (const s of [-1, 1]) b.sweep([[2.35, 2.85, s * 0.55], [3.1, 1.7, s * 0.78], [3.95, 1.85, s * 0.66], [4.3, 2.65, s * 0.38]], [0.17, 0.15, 0.11, 0.06], 0xeee6cf);
    b.beam([-1.6, 3.4, 0], [-2.0, 2.4, 0], 0.12, 0.08, shag);
  });
  // the giant beside it, on the side that faces the view
  const [gx, gz] = at(x, z, yaw, 0.4, 2.7), skin = 0xc29a76, hide = 0x8a7258;
  b.moved(gx, 0, gz, yaw, () => {
    for (const s of [-1, 1]) b.box(-0.3, 0, s * 0.33 - 0.27, 0.3, 2.2, s * 0.33 + 0.27, hide, { faces: 'NESW' });
    b.box(-0.5, 2.1, -0.75, 0.5, 4.3, 0.75, 0x7d6a55, { faces: 'NESWTB', top: 0x8e7b64 });
    for (const s of [-1, 1]) b.box(-0.25, 2.4, s * 0.75 + (s > 0 ? 0 : -0.4), 0.25, 4.15, s * 0.75 + (s > 0 ? 0.4 : 0), hide, { faces: 'NESWTB' });
    b.box(-0.35, 4.3, -0.35, 0.35, 5.1, 0.35, skin);
    b.box(0.35, 4.3, -0.3, 0.45, 4.75, 0.3, 0x5b4432);
    b.box(-0.4, 4.95, -0.4, 0.38, 5.35, 0.4, 0x5b4432);
    // the club, over his near shoulder
    b.beam([0.15, 2.5, 1.0], [-0.9, 4.9, 1.0], 0.12, 0.3, 0x6b5136);
  });
  // their tracks, back the way they came
  for (let i = 1; i <= 9; i++) {
    const back = i * 1.35, s = i % 2 ? 1 : -1;
    const m = at(x, z, yaw, -2.0 - back, s * 0.7), g = at(gx, gz, yaw, -0.6 - back, s * 0.3);
    for (const [p, r] of [[m, 0.38], [g, 0.24]] as const) if (open(p[0], p[1], 2)) area(k, [[p[0] - r, p[1] - r], [p[0] + r, p[1] - r * 0.8], [p[0] + r * 0.9, p[1] + r], [p[0] - r * 0.8, p[1] + r * 0.9]], 0xc3ccd3, 0.035);
  }
}

// ---------------------------------------------------------------------------
// Along the roads
// ---------------------------------------------------------------------------

/** Finds a place beside a road, between 5.8 and 7.5 from its middle, near (x, z). */
function roadside(x: number, z: number, w: number, d: number, h: number, reach = 9): P2 | null {
  for (let r = 0; r <= reach; r += 0.4) {
    const n = r === 0 ? 1 : Math.ceil(r * 6);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, cx = x + Math.cos(a) * r, cz = z + Math.sin(a) * r, t = toRoad(cx, cz);
      if (t >= 5.8 + Math.max(w, d) / 2 && t <= 7.5 + Math.max(w, d) / 2 && fits(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, h, 1.5)) return [cx, cz];
    }
  }
  return null;
}

/** A milestone: a squat stone with a rounded top. */
function milestone(k: Build, x: number, z: number): void {
  const c = roadside(x, z, 0.6, 0.6, 1.2);
  if (!c) return void missed.push('milestone');
  k.b.box(c[0] - 0.25, 0, c[1] - 0.16, c[0] + 0.25, 0.72, c[1] + 0.16, 0xb8b2a4, { top: 0xc6c0b2 });
  k.b.cyl(c[0], c[1], 0.72, 0.9, 0.24, 0.12, 6, 0xb8b2a4);
  claim(c[0] - 0.3, c[1] - 0.3, c[0] + 0.3, c[1] + 0.3);
}

/** A wayside shrine to the Seven: a seven-sided stone with a carved post on it, and a candle at night. */
function shrine(k: Build, x: number, z: number): void {
  const c = roadside(x, z, 1.4, 1.4, 2.4);
  if (!c) return void missed.push('shrine');
  const [sx, sz] = c, b = k.b;
  b.cyl(sx, sz, 0, 0.75, 0.62, 0.55, 7, 0xc9c2b0, { cap: 0xd8d1c0 });
  b.box(sx - 0.12, 0.75, sz - 0.12, sx + 0.12, 2.05, sz + 0.12, 0x8a6f4a);
  for (const y of [1.25, 1.7]) b.box(sx - 0.16, y, sz - 0.16, sx + 0.16, y + 0.12, sz + 0.16, 0x6b5136);
  b.cyl(sx, sz, 2.05, 2.3, 0.22, 0.04, 7, 0x6b5136, { cap: false });
  fire(k, sx + 0.38, 0.95, sz + 0.3, 0.07, 4);
  claim(sx - 0.7, sz - 0.7, sx + 0.7, sz + 0.7);
}

/** The post at the crossroads, with four fingers that point four ways and no lettering on them. */
function fingerpost(k: Build, x: number, z: number): void {
  const c = spot(x, z, 1.6, 1.6, 3.4, 9, 2);
  if (!c) return void missed.push('fingerpost');
  const [px, pz] = c, b = k.b, finger = 0xe2d9c3;
  b.box(px - 0.13, 0, pz - 0.13, px + 0.13, 3.05, pz + 0.13, TIMBER);
  b.cyl(px, pz, 3.05, 3.35, 0.24, 0.03, 4, TIMBER_DARK, { phase: Math.PI / 4, cap: false });
  b.box(px - 0.06, 2.45, pz - 1.05, px + 0.06, 2.7, pz + 1.05, finger, { faces: 'NESWTB' });
  b.box(px - 1.05, 2.1, pz - 0.06, px + 1.05, 2.35, pz + 0.06, finger, { faces: 'NESWTB' });
  claim(px - 0.8, pz - 0.8, px + 0.8, pz + 0.8);
}

/** A pedlar's camp: his tent, a fire, his mule with its packs, and the pedlar. */
function pedlar(k: Build, x: number, z: number): void {
  const c = spot(x, z, 6, 3.4, 2.4, 8);
  if (!c) return void missed.push('pedlar');
  const [cx, cz] = c, b = k.b;
  gable(b, cx - 2.6, cz - 1.0, cx - 0.4, cz + 1.0, 0, 1.5, 0xc9b98f, 0xb8a77c, 'x', 0);
  b.box(cx - 0.7, 0, cz - 0.3, cx - 0.4, 0.9, cz + 0.3, DARK, { faces: 'E' });
  for (const a of [0.3, 1.9]) b.beam([cx + 0.6 + Math.cos(a) * 0.45, 0.06, cz + Math.sin(a) * 0.45], [cx + 0.6 - Math.cos(a) * 0.45, 0.06, cz - Math.sin(a) * 0.45], 0.07, 0.07, TIMBER_DARK);
  fire(k, cx + 0.6, 0.35, cz, 0.24, 7);
  horse(k, cx + 2.3, cz - 0.4, 1.2, 0x7d6e60, 0.78, true);
  k.person(cx + 0.2, cz + 0.9);
  b.box(cx - 0.3, 0, cz + 0.9, cx + 0.3, 0.45, cz + 1.3, 0x8a5a2e);
  claim(cx - 3, cz - 1.7, cx + 3, cz + 1.7);
}

/** A hedge knight asleep under a tree, his horse tied to it and his shield against its trunk. */
function hedgeKnight(k: Build, places: P2[]): void {
  const c = first(places, (x, z) => spot(x, z, 5, 4, 8, 8));
  if (!c) return void missed.push('hedgeKnight');
  const [tx, tz] = c, b = k.b;
  claim(tx - 2.5, tz - 2, tx + 2.5, tz + 2);
  plant(k, tx, tz, 0.95, false, 1.8, true);
  // the knight, on his back with his head against the roots
  b.box(tx + 0.55, 0, tz + 0.35, tx + 2.3, 0.42, tz + 0.95, 0x8f969c, { top: 0x9ea5ab });
  b.box(tx + 0.25, 0, tz + 0.42, tx + 0.6, 0.38, tz + 0.88, 0xe8c4a0);
  b.box(tx + 0.9, 0.42, tz + 0.4, tx + 1.8, 0.5, tz + 0.9, 0x4a6a3a);
  // the shield against the trunk: green, with a pale band
  b.obox(tx + 0.5, 0.65, tz - 0.55, 0.36, 0.5, 0.05, 0.5, 0x4f7f3a);
  b.obox(tx + 0.52, 0.65, tz - 0.51, 0.36, 0.1, 0.03, 0.5, 0xe2d9c3);
  horse(k, tx - 1.6, tz + 1.1, 2.4, 0x6b4a32);
  b.beam([tx - 2.25, 1.9, tz + 1.65], [tx - 0.3, 1.2, tz + 0.1], 0.025, 0.025, 0xd9cfb8);
}

/** Children flying a kite over open ground. */
function kite(k: Build, places: P2[]): void {
  const c = first(places, (x, z) => spot(x, z, 6, 6, 7.2, 8));
  if (!c) return void missed.push('kite');
  const [cx, cz] = c, b = k.b;
  const child = (px: number, pz: number, coat: number): void => {
    b.box(px - 0.2, 0, pz - 0.13, px + 0.2, 0.55, pz + 0.13, 0x4a4038, { faces: 'NESW' });
    b.box(px - 0.24, 0.55, pz - 0.15, px + 0.24, 1.2, pz + 0.15, coat);
    b.box(px - 0.15, 1.2, pz - 0.15, px + 0.15, 1.5, pz + 0.15, 0xe8c4a0);
  };
  child(cx - 1.8, cz + 1.8, 0xb03a2e);
  child(cx - 0.9, cz + 2.3, 0x3f6f9a);
  const k0: V3 = [cx + 1.4, 6.6, cz - 1.6];
  b.beam([cx - 1.6, 1.05, cz + 1.8], k0, 0.02, 0.02, 0xefece4);
  const d = 0.75;
  for (const n of [1, -1]) {
    b.quad([k0[0], k0[1] - d * 1.3, k0[2]], [k0[0] + d * 0.9, k0[1], k0[2]], [k0[0], k0[1] + d, k0[2]], [k0[0] - d * 0.9, k0[1], k0[2]], [0, 0, n], n > 0 ? 0xd94a3a : 0xc0392b);
  }
  b.beam([k0[0], k0[1] - d * 1.3, k0[2]], [k0[0] - 0.4, k0[1] - 2.6, k0[2] + 0.3], 0.03, 0.03, 0xe0b830);
  claim(cx - 3, cz - 3, cx + 3, cz + 3);
}

/** Anglers on a river's bank, their rods out over the water. `dir` is which way the water is. */
function anglers(k: Build, x: number, z: number, dir: P2): void {
  for (const dx of [0, 3.4]) {
    const px = x + dx, pz = z;
    if (!open(px, pz, 2) || !free(px, pz, 0.5)) continue;
    k.person(px, pz);
    k.b.beam([px + 0.3, 1.3, pz], [px + 0.3 + dir[0] * 3.4, 2.5, pz + dir[1] * 3.4], 0.035, 0.02, 0x9b7a55);
    k.b.beam([px + 0.3 + dir[0] * 3.4, 2.5, pz + dir[1] * 3.4], [px + 0.3 + dir[0] * 3.6, -0.7, pz + dir[1] * 3.6], 0.012, 0.012, 0xefece4);
    k.b.box(px - 0.75, 0, pz - 0.25, px - 0.3, 0.4, pz + 0.25, 0xa8875c);
    claim(px - 0.8, pz - 0.4, px + 0.5, pz + 0.4);
  }
}

/** A washerwoman at the river with her tub, and linen spread out to dry on the grass. */
function washerwoman(k: Build, x: number, z: number): void {
  const c = spot(x, z, 3.2, 2, 3, 6, 2);
  if (!c) return void missed.push('washerwoman');
  const [wx, wz] = c, b = k.b;
  k.person(wx, wz);
  b.cyl(wx + 0.9, wz - 0.2, 0, 0.5, 0.48, 0.55, 7, 0x8a6a48, { cap: 0x9fc2cf });
  for (const [dx, dz, w, d] of [[-1.5, 0.2, 0.9, 0.6], [-1.3, -0.7, 0.7, 0.5], [0.8, 0.7, 0.8, 0.55]]) area(k, [[wx + dx, wz + dz], [wx + dx + w, wz + dz + 0.05], [wx + dx + w, wz + dz + d], [wx + dx - 0.05, wz + dz + d]], 0xf3f0e6, 0.04);
  claim(wx - 1.6, wz - 1, wx + 1.6, wz + 1);
}

/** Charcoal burners in a clearing: a smoking mound, their hut of branches, a stack of cut wood and two burners. */
function charcoal(k: Build, x: number, z: number): void {
  const c = spot(x, z, 7, 6, 3, 8);
  if (!c) return void missed.push('charcoal');
  const [cx, cz] = c, b = k.b;
  area(k, [[cx - 3.2, cz - 2.8], [cx + 3.4, cz - 2.6], [cx + 3.2, cz + 2.9], [cx - 3.3, cz + 2.7]], 0x6e6450, 0.035);
  lathe(b, cx, cz, [[1.75, 0.035], [1.55, 0.65], [0.95, 1.15], [0.18, 1.38], [0.02, 1.42]], 7, 0x3b3530);
  smokes.push({ x: cx, y: 1.6, z: cz, shade: 0.6, size: 0.55, every: 0.3 });
  fire(k, cx + 0.9, 0.3, cz + 1.3, 0.12, 5);
  lathe(b, cx - 2.3, cz - 1.4, [[1.0, 0.035], [0.03, 2.1]], 6, 0x7a6448);
  b.box(cx + 1.9, 0, cz - 1.9, cx + 3.0, 0.7, cz - 0.6, 0x8a6a48, { top: 0xb08a5c });
  k.person(cx - 0.9, cz + 1.9);
  k.person(cx + 2.2, cz + 0.6);
  claim(cx - 3.5, cz - 3, cx + 3.5, cz + 3);
}

// ---------------------------------------------------------------------------
// Shores
// ---------------------------------------------------------------------------

/** Whether a place in the water is within 2 of a shore, and clear of every lot. */
function shallow(x: number, z: number): boolean {
  if (!isWater(x, z)) return false;
  let near = false;
  for (const [dx, dz] of [[1.8, 0], [-1.8, 0], [0, 1.8], [0, -1.8], [1.3, 1.3], [-1.3, 1.3], [1.3, -1.3], [-1.3, -1.3]]) if (groundKind(x + dx, z + dz)) near = true;
  if (!near) return false;
  for (const l of LOTS) if (x > l.x0 - 2.5 && x < l.x1 + 2.5 && z > l.z0 - 2.5 && z < l.z1 + 2.5) return false;
  return Math.abs(x) < 103 && Math.abs(z) < 112;
}

/** Rocks in the shallows along every coast where the land behind is open. */
function rocks(k: Build, n: number, seed: number): void {
  const r = rng(seed), coasts = [COAST_WEST, COAST_EAST];
  for (let i = 0, got = 0; got < n && i < n * 30; i++) {
    const line = coasts[Math.floor(r() * 2)], s = Math.floor(r() * (line.length - 1)), t = r();
    const a = line[s], c = line[s + 1], px = a[0] + (c[0] - a[0]) * t, pz = a[1] + (c[1] - a[1]) * t;
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, nx = -(c[1] - a[1]) / len, nz = (c[0] - a[0]) / len;
    for (const side of [1, -1]) {
      const off = 0.6 + r() * 1.0, x = px + nx * side * off, z = pz + nz * side * off;
      if (!shallow(x, z) || !open(px - nx * side * 3.5, pz - nz * side * 3.5, 1)) continue;
      const rad = 0.5 + r() * 0.7;
      k.b.cyl(x, z, -1.4, -0.9 + 0.3 + r() * 0.5, rad, rad * 0.55, 5, r() < 0.5 ? ROCK : ROCK_DARK, { phase: r() * 3 });
      got++;
      break;
    }
  }
}

/** A boat moored at the water's edge. */
function boat(k: Build, x: number, z: number, yaw: number, color: number): void {
  k.b.obox(x, -0.72, z, 1.05, 0.3, 0.4, yaw, color, { top: 0x5b4634 });
  k.b.obox(x + Math.cos(yaw) * 1.15, -0.65, z + Math.sin(yaw) * 1.15, 0.22, 0.3, 0.22, yaw + Math.PI / 4, color);
}

/** Nets hung to dry between two poles. */
function nets(k: Build, x: number, z: number): void {
  const b = k.b;
  for (const dx of [-1.3, 1.3]) b.box(x + dx - 0.07, 0, z - 0.07, x + dx + 0.07, 2.0, z + 0.07, TIMBER);
  b.quad([x - 1.25, 0.6, z + 0.02], [x + 1.25, 0.6, z + 0.02], [x + 1.25, 1.85, z + 0.02], [x - 1.25, 1.85, z + 0.02], [0, 0, 1], 0x9b927c);
  b.quad([x + 1.25, 0.6, z - 0.02], [x - 1.25, 0.6, z - 0.02], [x - 1.25, 1.85, z - 0.02], [x + 1.25, 1.85, z - 0.02], [0, 0, -1], 0x8a816c);
  for (let i = 0; i < 4; i++) b.box(x - 1.0 + i * 0.65, 1.78, z - 0.06, x - 0.85 + i * 0.65, 1.92, z + 0.06, 0xd9a35d, { faces: 'NESWTB' });
}

/** A fishing hamlet: two or three huts, nets drying, boats moored below, and fisherfolk. `sea` is which way the water is. */
function hamlet(k: Build, x: number, z: number, sea: P2, north: boolean, seed: number): void {
  const r = rng(seed), wall = north ? STONE.north : DAUB, roof = north ? 0xeef2f5 : ROOF.thatch;
  const huts: P2[] = [];
  for (const [dx, dz] of [[0, 0], [0, 4.2], [0, -4.2], [3, 2]]) {
    if (huts.length >= 3) break;
    const c = spot(x + dx, z + dz, 3.4, 2.8, 4.2, 2.5);
    if (!c) continue;
    house(k, c[0], c[1], { w: 3.2, d: 2.6, wall, roof });
    claim(c[0] - 1.9, c[1] - 1.6, c[0] + 1.9, c[1] + 1.6);
    huts.push(c);
  }
  if (huts.length === 0) return;
  const [hx, hz] = huts[0];
  const n = spot(hx - sea[0] * 3.5, hz + 3, 3, 1, 2.2, 5);
  if (n) { nets(k, n[0], n[1]); claim(n[0] - 1.5, n[1] - 0.4, n[0] + 1.5, n[1] + 0.4); }
  // boats, in the water by the shore
  let boats = 0;
  const moored: P2[] = [];
  for (let i = 0; i < 160 && boats < 3; i++) {
    const bx = hx + sea[0] * (2 + r() * 7) + (r() - 0.5) * 12, bz = hz + sea[1] * (2 + r() * 7) + (r() - 0.5) * 12;
    // a boat lies along the shore
    const yaw = Math.atan2(sea[0], -sea[1]) + (r() - 0.5) * 0.5, ux = Math.cos(yaw) * 1.3, uz = Math.sin(yaw) * 1.3;
    if (!shallow(bx, bz) || !shallow(bx + ux, bz + uz) || !shallow(bx - ux, bz - uz)) continue;
    if (boats > 0 && moored.some(([px, pz]) => Math.hypot(px - bx, pz - bz) < 3)) continue;
    boat(k, bx, bz, yaw, [0x7a4a32, 0x4f6a7a, 0x8a6a48][boats]);
    moored.push([bx, bz]);
    boats++;
  }
  for (const [dx, dz] of [[-1.2, 2.2], [1.6, 2.4]]) folk(k, hx + dx, hz + dz);
  k.lights.push({ x: hx, z: hz, r: 10, color: '#ffcf8a', k: 0.45 });
}

/** The ribs of a wreck in the shallows: a keel, a stem, and curved ribs that stand out of the water. */
function wreck(k: Build, x: number, z: number, yaw: number): void {
  const b = k.b, wood = 0x6b5a48;
  b.moved(x, 0, z, yaw, () => {
    b.beam([-2.6, -0.95, 0], [2.4, -0.8, 0], 0.18, 0.18, wood);
    b.beam([2.4, -0.8, 0], [3.0, 0.6, 0], 0.15, 0.1, wood);
    for (let i = 0; i < 5; i++) {
      const u = -2.0 + i * 1.0, h = 0.5 + Math.sin((i / 4) * Math.PI) * 0.5;
      for (const s of [-1, 1]) {
        if (i === 4 && s > 0) continue;
        b.sweep([[u, -0.9, 0], [u, -0.2, s * 0.62], [u, h, s * 0.82]], [0.1, 0.09, 0.07], wood);
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Dorne
// ---------------------------------------------------------------------------

/** A palm: a thin curved trunk and six flat fronds that droop. */
function palm(k: Build, x: number, z: number, h: number, yaw: number): void {
  const b = k.b, lean = h * 0.22, c = Math.cos(yaw), s = Math.sin(yaw);
  const pts: V3[] = [0, 0.4, 0.75, 1].map((t): V3 => [x + c * lean * t * t, h * t, z + s * lean * t * t]);
  b.sweep(pts, [0.2, 0.16, 0.13, 0.11], 0x8a7356);
  const [tx, ty, tz] = pts[3];
  for (let i = 0; i < 6; i++) {
    const a = yaw + 0.4 + (i / 6) * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a), px = -dz * 0.38, pz = dx * 0.38;
    const top: V3 = [tx, ty + 0.1, tz], tip: V3 = [tx + dx * 2.0, ty - 0.9, tz + dz * 2.0];
    const l: V3 = [tx + dx * 1.0 + px, ty + 0.15, tz + dz * 1.0 + pz], r: V3 = [tx + dx * 1.0 - px, ty + 0.15, tz + dz * 1.0 - pz];
    const green = i % 2 ? 0x4f8a3a : 0x5f9a44;
    b.quad(top, l, tip, r, [0, 1, 0], green);
    b.quad(top, r, tip, l, [0, -1, 0], 0x3f7a30);
  }
  b.box(tx - 0.2, ty - 0.25, tz - 0.2, tx + 0.2, ty + 0.12, tz + 0.2, 0x6b5a3e);
}

/** Thorn scrub: a low dusty bush, or two. */
function scrub(k: Build, x: number, z: number, r: () => number): void {
  const n = r() < 0.5 ? 1 : 2;
  for (let i = 0; i < n; i++) {
    const sx = x + i * 0.9, sz = z + i * 0.4, rad = 0.45 + r() * 0.4;
    k.b.cyl(sx, sz, 0.02, 0.35 + rad * 0.6, rad, rad * 0.45, 5, 0x7a7447, { cap: 0x8a8452, phase: r() * 3 });
  }
}

/** Dorne: nothing grows but a few palms and the thorn scrub. */
function dorne(k: Build): void {
  const r = rng(4402);
  let palms = 0, bushes = 0;
  for (let i = 0; i < 400 && (palms < 8 || bushes < 26); i++) {
    const x = -12 + r() * 30, z = 93 + r() * 19;
    if (groundKind(x, z) !== 'sand' || !open(x, z, 2) || !free(x, z, 1)) continue;
    if (palms < 8 && r() < 0.35) {
      const h = Math.min(cap(x, z) - 0.6, 4.2 + r() * 1.6);
      if (h < 3.5) continue;
      palm(k, x, z, h, r() * 6.3);
      claim(x - 1, z - 1, x + 1, z + 1);
      palms++;
    } else if (bushes < 26) {
      scrub(k, x, z, r);
      claim(x - 0.6, z - 0.6, x + 1.6, z + 1.0);
      bushes++;
    }
  }
}

// ---------------------------------------------------------------------------
// Smoke
// ---------------------------------------------------------------------------

/** Lets every chimney and the charcoal burners' mound smoke, from one shared cloud of puffs. */
function smoke(k: Build): void {
  if (smokes.length === 0) return;
  const s = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 160);
  k.group.add(s.mesh);
  const r = rng(9157), from = new THREE.Vector3(), drift = new THREE.Vector3(0.3, 0, 0.12);
  const due = smokes.map(() => r());
  k.each((dt) => {
    smokes.forEach((c, i) => {
      due[i] -= dt;
      if (due[i] > 0) return;
      due[i] = c.every * (0.7 + r() * 0.6);
      s.puff(from.set(c.x, c.y, c.z), drift, c.size, c.shade);
    });
    s.update(dt);
  });
}

// ---------------------------------------------------------------------------
// The country, region by region, from north to south
// ---------------------------------------------------------------------------

/** The North: the wolfswood, pines in clumps over snowfields, crofts, folds, stones and barrows, a rally stage and a giant. */
function north(k: Build): void {
  rallyStage(k);
  direwolf(k, 22.3, -68.6);
  giantAndMammoth(k, -70, -72);
  claim(-80, -77, -64, -67);
  croft(k, -50, -50.5, 3101);
  croft(k, 62, -80, 3102);
  sheepfold(k, 72, -72, 3103);
  cairn(k, 52, -86);
  standingStones(k, 66, -86.5, 6, 3104);
  barrows(k, 60, -61);
  hamlet(k, 85.5, -75, [1, 0], true, 3105);
  const ww = spot(-76, -64, 3, 3, 4, 8);
  if (ww) { weirwood(k, ww[0], ww[1], 0, 0.5); claim(ww[0] - 2.5, ww[1] - 2.5, ww[0] + 2.5, ww[1] + 2.5); }
  // the wolfswood, the biggest wood on the tile, from the sea to Winterfell's west
  wood(k, { x0: -84, z0: -88, x1: -41, z1: -45, n: 420, seed: 1101, tall: true, size: [0.7, 1.0], gap: 1.5 });
  // pines along the Wall's foot, between Queenscrown and Castle Black
  clumps(k, { x0: -47, z0: -88, x1: -19, z1: -76, count: 8, per: [5, 10], radius: [2.5, 4], seed: 1102, tall: true, size: [0.6, 0.95], gap: 2.0 });
  // and in clumps east of the kingsroad as far as the coast, with wide snowfields between
  clumps(k, { x0: 45, z0: -88, x1: 90, z1: -46, count: 20, per: [6, 13], radius: [2.5, 5.5], seed: 1103, tall: true, size: [0.65, 1.0], gap: 1.7 });
}

/** The riverlands: the watermill on the Trident, a holdfast, a farm, fields on the river's south bank, woods in clumps, the crossroads post and anglers. */
function riverlands(k: Build): void {
  fingerpost(k, 36, -19);
  // the holdfast: the only open ground in the riverlands where a tower of 7 hides nothing is the Trident's south bank
  const hold = spotTall(-30, -0.5, 6.4, 5.2, 3.8, 7.8, 6);
  if (hold) holdfast(k, hold[0], hold[1]); else missed.push('holdfast');
  farm(k, 42, -33, { seed: 3201, barn: true, well: true, washing: true, people: 3 });
  watermill(k, -21);
  // long narrow fields along the Trident's south bank
  const r = rng(3202);
  ([[-44, -36, 'wheat'], [-13, -4, 'plough'], [-3, 5, 'stubble']] as [number, number, Crop][]).forEach(([x0, x1, crop]) => field(k, r, x0, -2.55, x1, 2.4, crop));
  hedge(k, [-3.5, -2.3], [-3.5, 2.2], 'hedge', true);
  anglers(k, 26, -2.3, [0, -1]);
  kite(k, [[14, -1], [-40, 4], [56, -84], [-46, -84]]);
  // a field of pasture north of the inn, under the Vale
  const pr = rng(3204);
  if (field(k, pr, 50, -35.4, 61.5, -30.6, 'pasture')) { flock(k, 55.5, -33, 6, 2.2, 3205, true, { x0: 50, z0: -35.4, x1: 61.5, z1: -30.6 }); haystack(k, 49, -33); }
  hedgeKnight(k, [[-46, 6], [-74, -10], [-44, 38]]);
  // woods in clumps along the river and between the roads
  clumps(k, { x0: -46, z0: -3, x1: 38, z1: 3, count: 11, per: [3, 6], radius: [1.5, 3], seed: 1201, tall: false, size: [0.65, 1.0], gap: 2.3 });
  clumps(k, { x0: -70, z0: -31, x1: -44, z1: -22, count: 6, per: [4, 7], radius: [2, 3.5], seed: 1202, tall: false, size: [0.7, 1.05], gap: 2.3 });
  clumps(k, { x0: 26, z0: -36, x1: 63, z1: -21, count: 6, per: [4, 7], radius: [2, 3.5], seed: 1203, tall: false, size: [0.7, 1.05], gap: 2.3 });
  clumps(k, { x0: -78, z0: -21, x1: -70, z1: 3, count: 6, per: [3, 6], radius: [1.5, 3], seed: 1204, tall: false, size: [0.7, 1.05], gap: 2.3 });
  clumps(k, { x0: -53, z0: 1, x1: -39, z1: 11, count: 4, per: [4, 7], radius: [2, 3], seed: 1205, tall: false, size: [0.7, 1.05], gap: 2.3 });
  for (const [x, z] of [[-74, -10], [37, -24], [62, -33]] as P2[]) milestone(k, x, z);
}

/** The crownlands round the tourney ground: fields with hedges, a farm, a pedlar's camp, a shrine by the goldroad. */
function crownlands(k: Build): void {
  farm(k, -40, 40, { seed: 3301, barn: true, byre: true, washing: true, people: 2 });
  pedlar(k, -55, 42.5);
  const crops = patchwork(k, { x0: -34, z0: 32, x1: -18.5, z1: 44.3, cols: 2, rows: 2, seed: 3302, crops: ['wheat', 'pasture', 'plough', 'stubble'], bound: 'hedge' });
  const pasture = crops.find((f) => f.crop === 'pasture');
  if (pasture) flock(k, (pasture.x0 + pasture.x1) / 2, (pasture.z0 + pasture.z1) / 2, 6, 2.6, 3303, true, pasture);
  if (crops.length) { haystack(k, -19.6, 44.9); scarecrow(k, -26, 35); }
  shrine(k, -47, 44.5);
  milestone(k, -30, 44.6);
  clumps(k, { x0: -61, z0: 31, x1: -18, z1: 45, count: 6, per: [3, 5], radius: [1.5, 2.5], seed: 1301, tall: false, size: [0.7, 1.0], gap: 2.6 });
}

/** The Reach: a patchwork of fields east of Highgarden, a windmill on its mound and a farm west of it, vineyards on its south side, orchards, a washerwoman at the Mander. */
function reach(k: Build): void {
  washerwoman(k, -56, 61);
  // vineyards: the south side of Highgarden's hill is its own forecourt, so they lie on the west side, between the castle and the ocean road
  const vc = spot(-55.4, 66, 4.6, 6.4, 1, 8);
  if (vc) {
    const vr: Rect = { x0: vc[0] - 2.3, z0: vc[1] - 3.2, x1: vc[0] + 2.3, z1: vc[1] + 3.2 };
    area(k, [[vr.x0, vr.z0], [vr.x1, vr.z0 + 0.1], [vr.x1 - 0.1, vr.z1], [vr.x0 + 0.1, vr.z1 - 0.1]], 0x9a7a52, 0.035);
    for (let i = 0; i < 4; i++) {
      const x = vr.x0 + 0.6 + i * 1.12;
      k.b.box(x - 0.17, 0.035, vr.z0 + 0.5, x + 0.17, 0.72, vr.z1 - 0.5, 0x4f7f3a, { top: 0x5f8f44 });
    }
    claim(vr.x0, vr.z0, vr.x1, vr.z1);
    folk(k, vr.x1 + 0.2, vr.z1 + 0.6, 0, 1.5);
  } else missed.push('vineyard');
  // the patchwork between Highgarden's east wall and the kingswood, and a pasture by the Mander's spring
  const crops = patchwork(k, { x0: -15.8, z0: 65.6, x1: -3.4, z1: 80.2, cols: 2, rows: 2, seed: 3402, crops: ['wheat', 'plough', 'pasture', 'stubble'], bound: 'hedge', share: 0.8 });
  // the windmill on its mound, between the fields and the kingswood, and its farm
  const mill = spotTall(2.5, 71, 6, 6, 3, 8.6, 6);
  if (mill) windmill(k, mill[0], mill[1]); else missed.push('windmill');
  farm(k, 2, 80.5, { seed: 3404, barn: true, cart: true, people: 2 });
  const pr = rng(3405);
  if (field(k, pr, -16.2, 57.8, -10.6, 64.4, 'pasture')) flock(k, -13.4, 61.2, 4, 1.8, 3403, false, { x0: -16.2, z0: 57.8, x1: -10.6, z1: 64.4 });
  const ploughed = crops.find((f) => f.crop === 'plough');
  if (ploughed) ploughTeam(k, ploughed);
  const grazed = crops.find((f) => f.crop === 'pasture');
  if (grazed) flock(k, (grazed.x0 + grazed.x1) / 2, (grazed.z0 + grazed.z1) / 2, 5, 2.4, 3406, true, grazed);
  const wheat = crops.find((f) => f.crop === 'wheat');
  if (wheat) scarecrow(k, (wheat.x0 + wheat.x1) / 2, (wheat.z0 + wheat.z1) / 2);
  if (crops.length) haystack(k, -10.5, 65.2, 0.85);
  // an orchard south of the roseroad, in neat rows: the only trees in rows on the tile
  const or: Rect = { x0: -25, z0: 106.4, x1: -13, z1: 110.8 };
  if (fits(or.x0, or.z0, or.x1, or.z1, 0, 1.5)) {
    area(k, [[or.x0, or.z0], [or.x1, or.z0], [or.x1, or.z1], [or.x0, or.z1]], 0x7aa452, 0.035);
    claim(or.x0, or.z0, or.x1, or.z1);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) plant(k, or.x0 + 1.4 + i * 2.3, or.z0 + 1.1 + j * 2.2, 0.6, false, 1.6, true);
  }
  // small woods round Highgarden's outside, kept 3 from its wall, and along the roseroad
  const hg = LOTS.find((l) => l.id === 'hg-outer')!;
  const offWall = (x: number, z: number): boolean => x > hg.x0 - 3 && x < hg.x1 + 3 && z > hg.z0 - 3 && z < hg.z1 + 3;
  clumps(k, { x0: -62, z0: 58, x1: -50, z1: 82, count: 4, per: [3, 5], radius: [1.5, 2.5], seed: 1401, tall: false, size: [0.7, 1.0], gap: 2.6, not: offWall });
  clumps(k, { x0: -17, z0: 58, x1: 0, z1: 88, count: 4, per: [3, 5], radius: [1.5, 2.5], seed: 1402, tall: false, size: [0.7, 1.0], gap: 2.6, not: offWall });
  clumps(k, { x0: -42, z0: 104, x1: -12, z1: 112, count: 3, per: [2, 4], radius: [1.5, 2], seed: 1403, tall: false, size: [0.6, 0.9], gap: 2.6 });
  milestone(k, -60, 72);
}

/** The kingswood south of the Blackwater, the rainwood by Storm's End, and the stormlands' shore with its wreck. */
function crownSouth(k: Build): void {
  charcoal(k, 12, 72);
  const ww = spot(20, 64, 3, 3, 4, 8);
  if (ww) { weirwood(k, ww[0], ww[1], 0, 0.5); claim(ww[0] - 2.5, ww[1] - 2.5, ww[0] + 2.5, ww[1] + 2.5); }
  const ww2 = spot(68, 69, 3, 3, 4, 6);
  if (ww2) { weirwood(k, ww2[0], ww2[1], 0, 0.5); claim(ww2[0] - 2.5, ww2[1] - 2.5, ww2[0] + 2.5, ww2[1] + 2.5); }
  // the wreck, on the shore south of the Blackwater's mouth
  let placedWreck = false;
  for (let z = 68; z < 80; z += 0.5) if ([-3, 0, 3].every((dz) => shallow(76.25, z + dz) && shallow(77.5, z + dz))) { wreck(k, 77.05, z, Math.PI / 2); placedWreck = true; break; }
  if (!placedWreck) missed.push('wreck');
  milestone(k, 48.5, 71);
  // the kingswood: thick, on the roseroad's north-west side, with the road in a clearing 16 wide
  wood(k, { x0: 4, z0: 57, x1: 33, z1: 87, n: 185, seed: 1501, tall: false, size: [0.75, 1.08], gap: 2.2, not: (x, z) => toRoad(x, z) < 8 || toRiver(x, z) < 2.5 });
  // the rainwood: tall dark trees east of the kingsroad's last stretch
  wood(k, { x0: 44, z0: 63, x1: 76, z1: 78, n: 80, seed: 1502, tall: true, size: [0.75, 1.0], gap: 1.7 });
}

/** The shores: fishing hamlets in the North and in the Reach, and rocks in the shallows. */
function shores(k: Build): void {
  hamlet(k, -77, 52, [-1, 0], false, 3601);
  rocks(k, 26, 3602);
}

export function buildCountry(k: Build): void {
  taken = [];
  grove = new Map();
  trees = 0;
  smokes = [];
  missed = [];
  const tris0 = k.b.triangles + k.street.triangles;
  for (const fn of [north, riverlands, crownlands, reach, crownSouth, dorne, shores]) fn(k);
  smoke(k);
  if (import.meta.env.DEV) console.info(`Westeros: the open country has ${trees} trees and ${k.b.triangles + k.street.triangles - tris0} triangles besides.${missed.length ? ` No room was found for: ${missed.join(', ')}.` : ''}`);
}
