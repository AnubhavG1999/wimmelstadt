// The planet's south flank, outside the walls: the Augustan camp, the mine with its clawDrill, the snowy peaks in the south-east, and the planet's forests and fields.
//
// From the books, as the research note gives them (docs/districts/research/red-rising.md, section 2,
// "The planet" and item 23, and story 7 of section 4):
//
// - seen from orbit the terraformed Mars is green and white (GS 36), and the southern highlands carry
//   a great conifer forest, the Martian taiga (GS 47): the pines on the flank;
// - each of Mars's cities is tied to a hundred helium-3 mines underground (RR 8, 9); the mine is a
//   tiered round pit like Lykos's Common, with homes in its walls (RR 2, 3), and a gravLift shaft;
// - the clawDrill, about 90 m long and shaped like a hand, with the cockpit at the elbow and
//   tentacle-like drills for fingers (RR 1; MS 46);
// - the Reaper's squadron came down on a snow-covered mountain (GS 38): the peaks;
// - Lorn's force marches on the south wall from the camp (story 7, after GS 39 and 41).
//
// The books give the camp nothing at all: its tents in the red and gold of House Augustus, the lion
// standard, the kitchen, the mast, the hospital and the motor pool are this tile's own drawing. So are
// the colours of the clawDrill, the look of the gravLift's headgear, the doors and windows of the
// homes in the pit's walls, the fields and their hedges, and the cairn and the beacon on the peaks.
//
// Every place and size comes from plan.ts, or from the ground as built (landAt).

import * as THREE from 'three';
import { Smoke } from '../../engine/effects';
import { interior, rng, type GeoBuilder, type V3 } from '../../engine/geo';
import { figure, hipped, type Dress } from '../../engine/parts';
import { drum, gable, slab, slope3 } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { landAt } from './land';
import { AMBER, AUGUSTUS_GOLD, AUGUSTUS_RED, COLD, TO_VIEW, WARM, banner, lion, nameBoard, nameSign } from './look';
import type { Model } from './models';
import { CAMP, HERO_SPOTS, LANDINGS, MINE, PEAKS, ROADS, SPIDER_PATROL, STAGES, TURNS, lotOf, outOfTrench, type Lot, type P2 } from './plan';
import { open, underBoards } from './space';

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/** The camp's canvas: cream walls, red roofs, gold trim; the hospital's white. */
const CANVAS = 0xe4d8bb, CANVAS_SHADE = 0xcdbf9f, ROOF_RED = 0x9c2a22, HOSPITAL = 0xf1eee6, HOSPITAL_BAND = 0xb3332b;
/** The camp's ground: trodden earth, the gravel of its pads and their retaining edges, the motor pool's concrete. */
const EARTH = [0x8d7557, 0x957d5d, 0x86704f], GRAVEL = 0xa49a86, EDGE = 0x8a7f6c, CONCRETE = [0xa6a297, 0x9d998e], PAINT = 0xece6d4;
/** Iron and steel: painted lighter than they are, as thin parts come out dark. */
const POLE = 0xc4cad1, IRON_L = 0x6c7077, IRON_D = 0x3e4146, CANOPY = 0x6b3a2c;
/** Crates, fuel cells and sandbags. */
const CRATE = [0x76704d, 0x8e7a52, 0x6a6747], FUEL = 0xd8a838, FUEL_CAP = 0x3a3c40, SANDBAG = 0xb9a67d;
/** A doorway lit from within: dark by day, warm at night. */
const DOORWAY = 0x3b2a1d;
/** The mine: its rock, its tiers' floors, the coping along their edges, its doors and windows. */
const ROCK = [0x9a5a3a, 0xa8673f, 0x8f5034], FLOOR = [0x9c6c48, 0xa77852, 0x9a6a46, 0xa47450], COPING = 0xc29a72, HOME_DOOR = 0x3a2416, HOME_WIN = 0x4a3420;
/** The clawDrill: an old working machine, yellow over dark steel, its drills bright. */
const DRILL = 0xd99f2b, DRILL_DARK = 0xa8741c, DRILL_STEEL = 0x45484e, TRACK = 0x2f3034, BIT = 0xd7dbe0, GLASS_LIT = 0x2b3e4a;
/** The peaks: rock and snow. */
const STONE_GREY = [0x77726c, 0x6a6560, 0x847c72], STONE_RUST = 0x7d5b47, DRIFT = 0xf3f6f9, DRIFT_SHADE = 0xdfe6ee;
/** Fields and hedges. */
const WHEAT = [0xd9b85c, 0xc9a74e], GREENS = [0x9fb85c, 0x86a24c], HEDGE = 0x4f7a3c;

/** The Grays of the Augustan camp, in grey with red helms; a Yellow, the camp's doctor; and Reds of the mine, their hair red. */
const GRAY: Dress = { coat: 0x8b9097, legs: 0x4c5056, hat: AUGUSTUS_RED, hatH: 0.28, hatR: 0.31 };
const YELLOW: Dress = { coat: 0xe2c03e, legs: 0xd8d2c4, hat: 0xf1eee6, hatH: 0.14, hatR: 0.28 };
const RED: Dress = { coat: 0x7a4b32, legs: 0x4e3626, hat: 0xc8462a, hatH: 0.13, hatR: 0.28 };

// ---------------------------------------------------------------------------
// The ground as built, and what may stand where
// ---------------------------------------------------------------------------

/** The ground's own grid (land.ts lays it in squares of 2 from the board's north-west corner, each cut from its north-west to its south-east corner). */
const GX0 = -104, GZ0 = -113, CELL = 2;

/** The lowest and highest the ground is over a rectangle, sampled finely enough to find its corners. */
function span(x0: number, z0: number, x1: number, z1: number): [number, number] {
  let lo = Infinity, hi = -Infinity;
  const nx = Math.max(2, Math.ceil((x1 - x0) / 0.5)), nz = Math.max(2, Math.ceil((z1 - z0) / 0.5));
  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j <= nz; j++) {
      const g = landAt(x0 + ((x1 - x0) * i) / nx, z0 + ((z1 - z0) * j) / nz);
      lo = Math.min(lo, g);
      hi = Math.max(hi, g);
    }
  }
  return [lo, hi];
}

/**
 * A level pad over the slope: a block whose top is a little above the highest
 * ground under it and whose sides are its retaining edge where the slope falls
 * away. Returns the height of its top.
 */
function pad(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, top = GRAVEL, side = EDGE, lift = 0.14): number {
  const [lo, hi] = span(x0, z0, x1, z1), y = hi + lift;
  b.box(x0, lo - 0.4, z0, x1, y, z1, side, { top });
  return y;
}

/**
 * A skin laid over the ground a little above it, square by square on the
 * ground's own grid, so that it follows every facet without meeting one:
 * trodden earth, concrete, a field's rows. `color` may leave a square out.
 */
function drape(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, lift: number, color: (cx: number, cz: number, i: number, j: number) => number | null): void {
  const i0 = Math.ceil((x0 - GX0) / CELL), i1 = Math.floor((x1 - GX0) / CELL);
  const j0 = Math.ceil((z0 - GZ0) / CELL), j1 = Math.floor((z1 - GZ0) / CELL);
  const at = (i: number, j: number): V3 => {
    const x = GX0 + i * CELL, z = GZ0 + j * CELL;
    return [x, landAt(x, z) + lift, z];
  };
  for (let i = i0; i < i1; i++) {
    for (let j = j0; j < j1; j++) {
      const c = color(GX0 + (i + 0.5) * CELL, GZ0 + (j + 0.5) * CELL, i, j);
      if (c === null) continue;
      slope3(b, at(i, j), at(i + 1, j), at(i + 1, j + 1), c);
      slope3(b, at(i, j), at(i + 1, j + 1), at(i, j + 1), c);
    }
  }
}

/** A low wall that follows the ground along a line: a hedge, a row of sandbags. */
function alongGround(b: GeoBuilder, pts: P2[], h: number, half: number, color: number): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [cx, cz] = pts[i + 1], len = Math.hypot(cx - ax, cz - az), n = Math.max(1, Math.ceil(len / 2));
    for (let s = 0; s < n; s++) {
      const x0 = ax + ((cx - ax) * s) / n, z0 = az + ((cz - az) * s) / n, x1 = ax + ((cx - ax) * (s + 1)) / n, z1 = az + ((cz - az) * (s + 1)) / n;
      // a hair longer than its share, so that the pieces overlap and show no seam
      const ex = ((x1 - x0) / (len / n)) * 0.12, ez = ((z1 - z0) / (len / n)) * 0.12;
      slab(b, [x0 - ex, landAt(x0, z0) + h, z0 - ez], [x1 + ex, landAt(x1, z1) + h, z1 + ez], half, h + 0.35, color);
    }
  }
}

const glow = (k: Build, x: number, y: number, z: number, s: number, color: string, sy = s): void => void k.glows.push({ x, y, z, sx: s, sy, sz: s, color });

/** The way the view the tile opens with looks back from, on the ground, and how steeply it looks down. */
const VX = TO_VIEW[0], VZ = TO_VIEW[2], TAN = 0.78;

/** Places on the flank that the opening view must see over whatever this file plants: the stage, the road and its ring, the camp, the mine. */
let TARGETS: { x: number; y: number; z: number }[] = [];

function targets(): { x: number; y: number; z: number }[] {
  const t: { x: number; y: number; z: number }[] = [];
  const add = (x: number, z: number): void => void t.push({ x, y: landAt(x, z), z });
  const s = STAGES.outside;
  for (let x = s.x0; x <= s.x1; x += 4) for (let z = s.z0; z <= s.z1; z += 3.25) add(x, z);
  // the road from the South Gate down the flank, and its ring
  const road = ROADS.south;
  for (let i = 0; i + 1 < road.length; i++) {
    const [ax, az] = road[i], [bx, bz] = road[i + 1];
    if (Math.max(az, bz) < 62) continue;
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 2.5);
    for (let k = 0; k <= n; k++) add(ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n);
  }
  const ring = TURNS.camp;
  for (let i = 0; i < 12; i++) add(ring.c[0] + Math.cos((i / 12) * Math.PI * 2) * ring.r, ring.c[1] + Math.sin((i / 12) * Math.PI * 2) * ring.r);
  for (const [x, z] of CAMP.posts) add(x, z);
  const camp = lotOf('camp');
  for (let x = camp.x0; x <= camp.x1; x += 6) for (let z = camp.z0 + 2; z <= camp.z1; z += 5) add(x, z);
  for (const a of [0, 1, 2, 3, 4, 5]) add(MINE.c[0] + Math.cos(a) * 4, MINE.c[1] + Math.sin(a) * 4);
  return t;
}

/** Whether a thing `top` high at a place, `rad` across its middle, would stand between the opening view and one of the places it must see. */
function hides(x: number, z: number, top: number, rad: number): boolean {
  for (const p of TARGETS) {
    const ex = x - p.x, ez = z - p.z, along = ex * VX + ez * VZ;
    if (along <= 0 || along > 30) continue;
    if (Math.abs(-ex * VZ + ez * VX) > rad + 0.8) continue;
    if (top > p.y + 1.2 + TAN * along) return true;
  }
  return false;
}

/** How far a place is from the round the spider tanks walk. */
function toPatrol(x: number, z: number): number {
  let d = Infinity;
  const p = SPIDER_PATROL;
  for (let i = 0; i < p.length; i++) {
    const [ax, az] = p[i], [bx, bz] = p[(i + 1) % p.length], vx = bx - ax, vz = bz - az, l = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l));
    d = Math.min(d, Math.hypot(x - ax - vx * t, z - az - vz * t));
  }
  return d;
}

/** Whether a place is in one of the zones where the Rain lands, or within `room` of one. */
function inLanding(x: number, z: number, room: number): boolean {
  return [LANDINGS.west, LANDINGS.east, LANDINGS.flank, LANDINGS.peaks].some((s) => x > s.x0 - room && x < s.x1 + room && z > s.z0 - room && z < s.z1 + room);
}

/** Smoke: where it rises from, gathered by the models and set going once everything is built. */
const PUFFERS: { x: number; y: number; z: number; every: number; size: number; shade: number }[] = [];

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

const SIGN = { camp: 'flank-camp', mine: 'flank-mine' };

/** Every sign this file hangs. Each id begins with this file's name and a hyphen. */
export const SIGNS: SignDef[] = [nameSign(SIGN.camp, lotOf('camp').name), nameSign(SIGN.mine, lotOf('mine').name)];

// ---------------------------------------------------------------------------
// The Augustan camp
// ---------------------------------------------------------------------------

/** A ridge tent on a level pad: low walls, a pitched roof, a gold ridge, a lit doorway in its south end (or its south side, if its ridge runs east and west). */
function tent(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, o: { wall?: number; roof?: number; trim?: number; wallH?: number; rise?: number; along?: 'x' | 'z'; top?: number }): number {
  const y = pad(b, x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3);
  const wall = o.wall ?? CANVAS, roof = o.roof ?? ROOF_RED, along = o.along ?? 'z';
  let wallH = o.wallH ?? 0.9, rise = o.rise ?? 1.35;
  // a tent never rises above what its lot allows
  if (o.top !== undefined) {
    const room = o.top - y - 0.1;
    if (wallH + rise > room) {
      const f = Math.max(0.5, room / (wallH + rise));
      wallH *= f;
      rise *= f;
    }
  }
  b.box(x0, y, z0, x1, y + wallH, z1, wall, { faces: 'NESW' });
  gable(b, x0, z0, x1, z1, y + wallH, rise, roof, wall, along, 0.2);
  const xc = (x0 + x1) / 2, zc = (z0 + z1) / 2, ridge = y + wallH + rise;
  if (o.trim !== undefined) {
    if (along === 'z') b.box(xc - 0.08, ridge - 0.06, z0 - 0.26, xc + 0.08, ridge + 0.08, z1 + 0.26, o.trim);
    else b.box(x0 - 0.26, ridge - 0.06, zc - 0.08, x1 + 0.26, ridge + 0.08, zc + 0.08, o.trim);
  }
  // the doorway, lit from within
  const dh = Math.min(along === 'z' ? wallH + rise * 0.55 : wallH * 0.92, 1.7);
  b.quad([xc - 0.42, y, z1 + 0.03], [xc + 0.42, y, z1 + 0.03], [xc + 0.42, y + dh, z1 + 0.03], [xc - 0.42, y + dh, z1 + 0.03], [0, 0, 1], DOORWAY, { win: interior(2.4) });
  return y;
}

/** The lion standard of House Augustus: a red banner with a gold lion on both faces, on a tall pole, facing the view. */
function standard(b: GeoBuilder, x: number, z: number, y: number, h: number): void {
  const yaw = Math.atan2(VZ, VX);
  b.cyl(x, z, y - 0.2, y + h, 0.12, 0.09, 6, POLE);
  b.cyl(x, z, y - 0.2, y + 0.35, 0.42, 0.34, 8, IRON_D);
  b.cyl(x, z, y + h, y + h + 0.5, 0.16, 0.02, 6, AUGUSTUS_GOLD);
  b.moved(x, y, z, yaw, () => {
    const top = h - 0.25, bot = h - 2.7;
    b.box(-0.09, top, -0.95, 0.09, top + 0.16, 0.95, AUGUSTUS_GOLD, { faces: 'NESWTB' });
    b.box(0.1, bot, -0.8, 0.18, top, 0.8, AUGUSTUS_RED, { faces: 'NESWTB' });
    b.box(0.09, bot - 0.16, -0.8, 0.19, bot + 0.02, 0.8, AUGUSTUS_GOLD, { faces: 'NESWTB' });
    // the lion passant, walking towards the pole: its body, mane, head, legs and tail, on both faces
    const parts: [number, number, number, number][] = [
      [-0.3, 0.75, 0.42, 1.12], [-0.56, 0.9, -0.2, 1.58], [-0.72, 1.08, -0.48, 1.4], [-0.26, 0.4, -0.12, 0.8], [-0.04, 0.4, 0.1, 0.8],
      [0.16, 0.4, 0.3, 0.8], [0.32, 0.4, 0.42, 0.8], [0.4, 1.02, 0.5, 1.5], [0.36, 1.42, 0.56, 1.56], [-0.62, 1.58, -0.3, 1.76],
    ];
    for (const [za, ya, zb, yb] of parts) {
      b.box(0.17, bot + ya, za, 0.22, bot + yb, zb, AUGUSTUS_GOLD, { faces: 'NESWTB' });
      b.box(0.06, bot + ya, za, 0.11, bot + yb, zb, AUGUSTUS_GOLD, { faces: 'NESWTB' });
    }
  });
}

/** A brazier on a short stand, its fire lit, with a little smoke. */
function brazier(k: Build, x: number, z: number, smoke = false): void {
  const y = landAt(x, z);
  k.b.cyl(x, z, y - 0.2, y + 0.7, 0.14, 0.1, 6, IRON_L);
  k.b.cyl(x, z, y + 0.7, y + 1.05, 0.26, 0.46, 8, IRON_D);
  glow(k, x, y + 1.12, z, 0.5, '#ff8f3a', 0.28);
  if (smoke) PUFFERS.push({ x, y: y + 1.3, z, every: 1.2, size: 0.3, shade: 0.7 });
}

/** A lamp on a post. */
function lampPost(k: Build, x: number, z: number, h = 2.6, color = '#ffe2ae'): void {
  const y = landAt(x, z);
  k.b.cyl(x, z, y - 0.2, y + h, 0.1, 0.08, 6, POLE);
  k.b.box(x - 0.22, y + h, z - 0.22, x + 0.22, y + h + 0.12, z + 0.22, IRON_D, { faces: 'NESWTB' });
  glow(k, x, y + h - 0.18, z, 0.34, color, 0.3);
}

function camp(k: Build, l: Lot): void {
  const b = k.b, r = rng(64017);
  PUFFERS.length = 0;
  TARGETS = targets();
  const [lornP, kavaxP, daxoP] = CAMP.posts, ranks = CAMP.posts.slice(5);
  const hero = HERO_SPOTS.find((s) => s.id === 'camp')!;
  // the motor pool is the east end of the camp, east of Lorn's post
  const poolX = lornP[0] + 0.5;

  // what the camp must keep open: every post with 1.5 round it, Kavax's fox's ring, the two parked spider tanks, the hero's bay
  const keep: ((x0: number, z0: number, x1: number, z1: number) => boolean)[] = [
    ...CAMP.posts.map(([px, pz], i) => (x0: number, z0: number, x1: number, z1: number): boolean => {
      const room = i === 1 ? CAMP.fox + 1.5 : 1.5;
      return Math.hypot(Math.max(x0 - px, 0, px - x1), Math.max(z0 - pz, 0, pz - z1)) < room;
    }),
    ...CAMP.parked.map(([px, pz]) => (x0: number, z0: number, x1: number, z1: number): boolean => x1 > px - 4 && x0 < px + 4 && z1 > pz - 3 && z0 < pz + 3),
    (x0, z0, x1, z1) => x1 > hero.x - 4.4 && x0 < hero.x + 4.4 && z1 > hero.z - 2 && z0 < hero.z + 2,
  ];
  const free = (x0: number, z0: number, x1: number, z1: number): boolean => !keep.some((f) => f(x0, z0, x1, z1));
  const built: [string, number, number, number, number][] = [];
  const mark = (what: string, x0: number, z0: number, x1: number, z1: number): void => void built.push([what, x0, z0, x1, z1]);

  // the camp's ground: trodden earth, and the motor pool's concrete
  drape(b, l.x0, l.z0 - 1, l.x1, l.z1 + 1, 0.04, (cx, _cz, i, j) => (cx > poolX ? CONCRETE[(i + j) % 2] : EARTH[(i * 7 + j * 3) % 3]));

  // ---- the troops' tents, in three rows of two on the west, stepped down the slope
  const colW = 3.3, alley = 1.9, rowD = 3.2, gap = 1.6;
  const cols = [l.x0 + 0.5, l.x0 + 0.5 + colW + alley];
  for (let row = 0; row < 3; row++) {
    for (const x0 of cols) {
      const z0 = l.z0 + 0.4 + row * (rowD + gap);
      // A-frames: low walls, the canvas roof nearly to the ground
      tent(b, x0, z0, x0 + colW, z0 + rowD, { trim: AUGUSTUS_GOLD, top: l.top, wallH: 0.35, rise: 1.9 });
      mark('a troop tent', x0, z0, x0 + colW, z0 + rowD);
    }
  }
  // braziers in the alley between the rows, and Grays about them
  const alleyX = cols[0] + colW + alley / 2;
  for (let row = 0; row < 2; row++) {
    const z = l.z0 + 0.4 + rowD + gap / 2 + row * (rowD + gap);
    brazier(k, alleyX, z, row === 0);
    figure(b, alleyX + 0.1, z + 1.25, landAt(alleyX, z + 1.25), GRAY);
  }
  figure(b, alleyX, l.z0 + 1.6, landAt(alleyX, l.z0 + 1.6), GRAY);
  k.lights.push({ x: alleyX, z: (l.z0 + l.z1) / 2, r: 11, color: WARM, k: 0.5 });

  // ---- the field hospital: a long white tent with a red band, south of Kavax and Daxo
  {
    const x0 = daxoP[0] - 1.2, x1 = kavaxP[0] + 3.2, z0 = l.z1 - 4.6, z1 = l.z1 - 0.6;
    const y = tent(b, x0, z0, x1, z1, { wall: HOSPITAL, roof: HOSPITAL, along: 'x', wallH: 1.45, rise: 1.3, top: l.top });
    b.box(x0 - 0.05, y + 1.05, z0 - 0.05, x1 + 0.05, y + 1.35, z1 + 0.05, HOSPITAL_BAND, { faces: 'NESW' });
    lampPost(k, x1 + 0.5, z1 + 0.6, 2.2);
    figure(b, (x0 + x1) / 2 + 1.4, z1 + 0.6, landAt((x0 + x1) / 2 + 1.4, z1 + 0.6), YELLOW);
    mark('the hospital', x0, z0, x1, z1);
  }

  // ---- the command tent: a red pavilion with a gold band and finial, two gold lions at its door, the lion standard before it
  const cmd = { x0: kavaxP[0] + CAMP.fox + 1.5 + 0.8, z0: l.z0 + 0.4, x1: kavaxP[0] + CAMP.fox + 1.5 + 8.2, z1: l.z0 + 5.2 };
  {
    const { x0, z0, x1, z1 } = cmd, xc = (x0 + x1) / 2;
    const y = pad(b, x0 - 0.4, z0 - 0.3, x1 + 0.4, z1 + 1.8);
    const room = l.top - y, wallH = Math.min(1.35, room * 0.42), roofY = y + wallH, rise = Math.min(1.7, room - wallH - 0.15);
    b.box(x0, y, z0, x1, roofY, z1, CANVAS, { faces: 'NESW' });
    // the gold band under the eaves
    b.box(x0 - 0.06, roofY - 0.24, z0 - 0.06, x1 + 0.06, roofY, z1 + 0.06, AUGUSTUS_GOLD, { faces: 'NESW' });
    hipped(b, x0 - 0.25, z0 - 0.25, x1 + 0.25, z1 + 0.25, roofY, roofY + rise, (x1 - x0) / 2 - 0.5, (z1 - z0) / 2 - 0.5, ROOF_RED, AUGUSTUS_GOLD);
    b.cyl(xc, (z0 + z1) / 2, roofY + rise, roofY + rise + 0.55, 0.18, 0.02, 6, AUGUSTUS_GOLD);
    // the doorway, a wide one, and a red and gold awning over it on two poles
    b.quad([xc - 0.8, y, z1 + 0.03], [xc + 0.8, y, z1 + 0.03], [xc + 0.8, y + wallH - 0.32, z1 + 0.03], [xc - 0.8, y + wallH - 0.32, z1 + 0.03], [0, 0, 1], DOORWAY, { win: interior(2.6) });
    slab(b, [xc, roofY - 0.28, z1], [xc, roofY - 0.55, z1 + 1.5], 1.25, 0.08, AUGUSTUS_RED, { under: CANVAS_SHADE });
    for (const s of [-1, 1]) b.cyl(xc + s * 1.15, z1 + 1.42, y, roofY - 0.55, 0.06, 0.06, 6, POLE);
    // small lit windows down its sides
    for (const zw of [z0 + 1.2, z1 - 1.2]) {
      for (const [xw, nx] of [[x0 - 0.03, -1], [x1 + 0.03, 1]] as const) {
        b.quad([xw, y + 0.55, zw + 0.35 * nx], [xw, y + 0.55, zw - 0.35 * nx], [xw, y + 1.0, zw - 0.35 * nx], [xw, y + 1.0, zw + 0.35 * nx], [nx, 0, 0], DOORWAY, { win: interior(2.2) });
      }
    }
    // the gold lions of House Augustus at the door, looking south
    for (const s of [-1, 1]) lion(b, xc + s * 1.75, z1 + 0.85, y, 0.42, Math.PI / 2);
    // a pennant at each front corner
    for (const s of [-1, 1]) banner(b, s < 0 ? x0 - 0.35 : x1 + 0.35, z1 + 0.15, y, 2.6, AUGUSTUS_RED, AUGUSTUS_GOLD, Math.atan2(VZ, VX));
    // the standard before it
    const sx = xc, sz = z1 + 2.55;
    standard(b, sx, sz, landAt(sx, sz), 5.4);
    figure(b, x0 + 0.1, z1 + 1.2, y, GRAY);
    k.lights.push({ x: xc, z: z1 + 2, r: 12, color: WARM, k: 0.6 });
    brazier(k, x0 - 0.9, z1 + 2.2);
    mark('the command tent', x0, z0, x1, z1 + 1.5);
    mark('the standard', sx - 0.5, sz - 0.5, sx + 0.5, sz + 0.5);
  }

  // ---- crates and fuel cells, between the hospital and the ranks
  {
    const x0 = cmd.x0 - 0.2, x1 = Math.min(...ranks.map((p) => p[0])) - 1.5 - 0.5, z0 = l.z1 - 5.2, z1 = l.z1 - 0.4;
    const y = pad(b, x0, z0, x1, z1);
    // crates in stacks
    const stacks: [number, number, number][] = [[x0 + 0.65, z0 + 0.65, 3], [x0 + 1.75, z0 + 0.65, 2], [x0 + 0.65, z0 + 1.75, 2], [x0 + 1.75, z0 + 1.75, 1], [x0 + 0.65, z0 + 2.85, 1]];
    stacks.forEach(([cx, cz, n], s) => {
      for (let i = 0; i < n; i++) {
        const h = 0.9, w = 0.48 - i * 0.03, c = CRATE[(s + i) % CRATE.length];
        b.box(cx - w, y + i * h, cz - w, cx + w, y + (i + 1) * h - 0.02, cz + w, c, { top: 0xb4a57a });
      }
    });
    // fuel cells in a rack on a pallet, gold with dark caps, and their lamps
    const fx0 = x0 + 2.45, fz0 = z0 + 0.4;
    b.box(fx0, y, fz0, x1 - 0.2, y + 0.22, z1 - 0.3, 0x7b6a4c);
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 5; j++) {
        const cx = fx0 + 0.45 + i * 0.85, cz = fz0 + 0.45 + j * 0.85;
        if (cx > x1 - 0.5 || cz > z1 - 0.6) continue;
        b.cyl(cx, cz, y + 0.22, y + 1.25, 0.34, 0.34, 8, FUEL, { cap: FUEL_CAP });
        if ((i + j) % 3 === 0) glow(k, cx, y + 1.0, cz + 0.34, 0.12, '#7fffb0');
      }
    }
    figure(b, x1 + 0.1, z0 - 0.6, landAt(x1 + 0.1, z0 - 0.6), GRAY);
    mark('the crates', x0, z0, x1, z1);
  }

  // ---- the field kitchen: an open canopy on posts over a stove, its chimney smoking
  const kitchen = { x0: cmd.x1 + 0.8, z0: l.z0 + 0.4, x1: cmd.x1 + 6.8, z1: l.z0 + 3.6 };
  {
    const { x0, z0, x1, z1 } = kitchen, zc = (z0 + z1) / 2;
    const y = pad(b, x0, z0, x1, z1);
    const ch = Math.min(2.1, l.top - y - 0.25);
    for (const [px, pz] of [[x0 + 0.15, z0 + 0.15], [x1 - 0.15, z0 + 0.15], [x0 + 0.15, z1 - 0.15], [x1 - 0.15, z1 - 0.15]]) b.box(px - 0.08, y, pz - 0.08, px + 0.08, y + ch, pz + 0.08, POLE, { faces: 'NESW' });
    slab(b, [x0 - 0.25, y + ch + 0.12, zc], [x1 + 0.25, y + ch + 0.12, zc], (z1 - z0) / 2 + 0.3, 0.12, CANOPY);
    // the stove, its hob glowing, pots on it, and the serving table
    b.box(x0 + 0.5, y, z0 + 0.4, x0 + 3.2, y + 0.85, z0 + 1.3, IRON_D, { top: 0x2a2b2e });
    glow(k, x0 + 1.85, y + 0.88, z0 + 0.85, 0.5, '#ff7a30', 0.06);
    for (const [px, pr] of [[x0 + 1.1, 0.3], [x0 + 2.4, 0.38]] as const) b.cyl(px, z0 + 0.85, y + 0.85, y + 1.35, pr, pr, 8, 0x9aa0a6, { cap: 0x56514a });
    b.box(x0 + 3.6, y, z1 - 1.1, x1 - 0.4, y + 0.8, z1 - 0.4, 0x7a5c3e, { top: 0xa58660 });
    const cx = x0 + 0.85, cz = z0 + 0.6;
    b.cyl(cx, cz, y + 0.85, y + ch + 0.75, 0.13, 0.13, 6, IRON_L);
    b.cyl(cx, cz, y + ch + 0.75, y + ch + 0.95, 0.24, 0.24, 6, IRON_D);
    PUFFERS.push({ x: cx, y: y + ch + 1.0, z: cz, every: 0.5, size: 0.48, shade: 0.82 });
    figure(b, x0 + 2.0, z0 + 1.9, y, GRAY);
    k.lights.push({ x: (x0 + x1) / 2, z: zc + 1, r: 9, color: WARM, k: 0.5 });
    glow(k, (x0 + x1) / 2, y + ch - 0.12, zc, 0.3, '#ffe2ae', 0.1);
    mark('the kitchen', x0, z0, x1, z1);
  }

  // ---- the map table, between the kitchen and the ranks: a table with a glowing map of Agea on it
  {
    const tx = (kitchen.x0 + kitchen.x1) / 2 - 0.4, tz = kitchen.z1 + 2.1;
    const y = pad(b, tx - 1.4, tz - 1.0, tx + 1.4, tz + 1.0);
    for (const [px, pz] of [[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]]) b.box(tx + px - 0.06, y, tz + pz - 0.06, tx + px + 0.06, y + 0.95, tz + pz + 0.06, IRON_L, { faces: 'NESW' });
    b.box(tx - 1.0, y + 0.95, tz - 0.55, tx + 1.0, y + 1.07, tz + 0.55, 0x5a4632, { faces: 'NESWTB' });
    k.glows.push({ x: tx, y: y + 1.11, z: tz, sx: 1.7, sy: 0.04, sz: 0.85, color: '#7fe0ff' });
    // the city on it in little: a few lit towers
    for (const [px, pz, h] of [[-0.5, -0.2, 0.35], [-0.3, 0.1, 0.25], [0.2, -0.15, 0.2], [0.5, 0.15, 0.15]]) glow(k, tx + px, y + 1.15 + h / 2, tz + pz, 0.08, '#b8f0ff', h);
    figure(b, tx - 1.3, tz + 0.9, y, GRAY);
    mark('the map table', tx - 1.4, tz - 1.0, tx + 1.4, tz + 1.0);
  }

  // ---- the comms mast and its hut, at the motor pool's north-west corner
  {
    const hx0 = kitchen.x1 + 0.5, hx1 = hx0 + 1.7, hz0 = l.z0 + 0.4, hz1 = hz0 + 1.7;
    const y = pad(b, hx0, hz0, hx1, hz1);
    const hh = Math.min(1.7, l.top - y - 0.3);
    b.box(hx0 + 0.1, y, hz0 + 0.1, hx1 - 0.1, y + hh, hz1 - 0.1, 0x6f7368);
    b.box(hx0, y + hh, hz0, hx1, y + hh + 0.14, hz1, IRON_D, { faces: 'NESWTB' });
    b.quad([hx1 - 0.07, y + 0.7, hz1 - 0.4], [hx1 - 0.07, y + 0.7, hz0 + 0.4], [hx1 - 0.07, y + 1.25, hz0 + 0.4], [hx1 - 0.07, y + 1.25, hz1 - 0.4], [1, 0, 0], DOORWAY, { win: interior(2.4) });
    // the mast: a tapering lattice drawn as a slim tower, cross arms, two dishes and a red light on top
    const mx = (hx0 + hx1) / 2, mz = hz1 + 0.9, my = landAt(mx, mz), mh = Math.min(6.2, l.top + 3.8 - my);
    b.cyl(mx, mz, my - 0.3, my + 0.3, 0.55, 0.5, 4, IRON_D, { phase: Math.PI / 4 });
    b.cyl(mx, mz, my + 0.3, my + mh, 0.3, 0.1, 4, POLE, { phase: Math.PI / 4 });
    for (const f of [0.55, 0.8]) b.box(mx - 0.75, my + mh * f, mz - 0.05, mx + 0.75, my + mh * f + 0.1, mz + 0.05, POLE, { faces: 'NESWTB' });
    for (const [f, yaw] of [[0.62, 0.5], [0.42, -2.3]] as const) {
      b.moved(mx, 0, mz, yaw, () => drum(b, [0.42, my + mh * f, 0], 0.45, 0.07, 0xdfe3e7, { cap: 0xc9ced3 }));
    }
    glow(k, mx, my + mh + 0.12, mz, 0.22, '#ff3b3b');
    figure(b, hx1 + 0.55, (hz0 + hz1) / 2, landAt(hx1 + 0.55, (hz0 + hz1) / 2), GRAY);
    mark('the hut', hx0, hz0, hx1, hz1);
    mark('the mast', mx - 0.55, mz - 0.55, mx + 0.55, mz + 0.55);
  }

  // ---- the motor pool: the hero's bay, levelled at its height and marked out, and low amber lamps along its west side
  {
    const x0 = hero.x - 4.4, x1 = hero.x + 4.4, z0 = hero.z - 2.0, z1 = hero.z + 2.0;
    const [lo] = span(x0, z0, x1, z1), y = hero.y - 0.04;
    b.box(x0, lo - 0.4, z0, x1, y, z1, 0x8f8b80, { top: 0xb3afa3 });
    for (const [a, c, d, e] of [[x0 + 0.15, z0 + 0.15, x1 - 0.15, z0 + 0.3], [x0 + 0.15, z1 - 0.3, x1 - 0.15, z1 - 0.15], [x0 + 0.15, z0 + 0.15, x0 + 0.3, z1 - 0.15]]) b.box(a, y, c, d, y + 0.025, e, PAINT, { faces: 'NESWT' });
    // the arrow that says which way out, at the east end
    b.box(x1 - 1.4, y, hero.z - 0.08, x1 - 0.5, y + 0.025, hero.z + 0.08, PAINT, { faces: 'NESWT' });
    for (const zz of [z0 - 0.2, z1 + 0.2]) {
      const bx = x0 - 0.2, by = landAt(bx, zz);
      b.cyl(bx, zz, by - 0.2, by + 0.45, 0.15, 0.15, 6, 0xd8a838, { cap: IRON_D });
      glow(k, bx, by + 0.55, zz, 0.16, '#ffb45a');
    }
    k.lights.push({ x: hero.x, z: hero.z - 2, r: 12, color: AMBER, k: 0.45 });
  }

  // ---- lamps, braziers and sandbags round the camp
  lampPost(k, cols[1] + colW + 0.6, l.z0 + 0.5);
  brazier(k, kavaxP[0] + 2.2, l.z0 + 0.6, true);
  lampPost(k, cmd.x1 + 0.4, cmd.z1 + 1.0, 2.4);
  alongGround(b, [[l.x0 - 0.7, l.z0 - 0.4], [l.x0 - 0.7, l.z1 + 0.95], [kavaxP[0] + 1.5, l.z1 + 0.95]], 0.65, 0.4, SANDBAG);
  for (const [px, pz] of [[l.x0 - 0.7, l.z0 - 0.4], [l.x0 - 0.7, l.z1 + 0.95]]) banner(b, px, pz, landAt(px, pz) + 0.4, 3.4, AUGUSTUS_RED, AUGUSTUS_GOLD, Math.atan2(VZ, VX));

  // sentries at the west corners, and a few Grays about their work
  for (const [x, z] of [[l.x0 - 1.6, l.z0 + 2.5], [l.x0 - 1.6, l.z1 - 1.0], [l.x0 + 5.0, l.z1 + 1.9], [poolX + 2.2, l.z1 + 0.2]] as P2[]) {
    if (free(x - 0.4, z - 0.3, x + 0.4, z + 0.3)) figure(b, x, z, landAt(x, z), GRAY);
  }
  // a few more Grays at random where the camp is open
  for (let n = 0, tries = 0; n < 4 && tries < 60; tries++) {
    const x = l.x0 + 1 + r() * (poolX - l.x0 - 2), z = l.z0 + 1 + r() * (l.z1 - l.z0 - 2);
    // never on a pad, nor in the way of Lorn's men as they march east to the wall
    if (!free(x - 0.6, z - 0.6, x + 0.6, z + 0.6) || built.some(([, a, c, d, e]) => x > a - 1.0 && x < d + 1.0 && z > c - 1.0 && z < e + 1.0)) continue;
    if (x > Math.min(...ranks.map((q) => q[0])) - 2 && z > lornP[1] - 1.5) continue;
    figure(b, x, z, landAt(x, z), GRAY);
    n++;
  }

  // the name, at the camp's south-west, where the opening view reads it over the slope
  nameBoard(k, SIGN.camp, l.x0 + 4.5, l.z1 + 5.2, landAt(l.x0 + 4.5, l.z1 + 5.2));

  // in development, say if anything stands where the camp must keep open
  if (import.meta.env.DEV) {
    const bad = built.filter(([, x0, z0, x1, z1]) => !free(x0, z0, x1, z1)).map(([w]) => w);
    if (bad.length > 0) console.warn(`The Iron Rain: the camp stands where it must keep open: ${bad.join(', ')}.`);
  }
}

// ---------------------------------------------------------------------------
// The mine: a tiered pit with homes in its walls, the gravLift, the clawDrill
// ---------------------------------------------------------------------------

/**
 * The pit as built into the bowl the ground already has: its lowest point,
 * the height of each tier's floor, and for each ray out from the lowest point
 * how far out the ground reaches each tier's height (null where it never does
 * inside the pit). A tier's floor lies level between the line where the ground
 * reaches the tier below and the line where it reaches its own, so that it
 * covers the ground everywhere, and a wall of rock rises from each tier to the
 * next. Where the ground falls away on the pit's south side, the tiers end, and
 * the pit opens onto the slope.
 */
interface Pit { M: P2; H: number[]; n: number; c: (number | null)[][]; rim: number[] }

const LIFT = 0.1;

function pitPlan(l: Lot): Pit {
  let M: P2 = [MINE.c[0], MINE.c[1]], g0 = Infinity;
  for (let x = -MINE.r; x <= MINE.r; x += 0.25) {
    for (let z = -MINE.r; z <= MINE.r; z += 0.25) {
      if (Math.hypot(x, z) > MINE.r - 1) continue;
      const g = landAt(MINE.c[0] + x, MINE.c[1] + z);
      if (g < g0) { g0 = g; M = [MINE.c[0] + x, MINE.c[1] + z]; }
    }
  }
  const rise = 2.9, H = Array.from({ length: MINE.tiers + 1 }, (_, j) => g0 + 1.1 + j * rise);
  const n = 72, c: (number | null)[][] = H.map(() => new Array<number | null>(n).fill(null)), rim: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
    let prev = landAt(M[0], M[1]), top = prev, r = 0;
    for (r = 0.08; r < MINE.r + 3; r += 0.08) {
      const x = M[0] + dx * r, z = M[1] + dz * r;
      if (x < l.x0 + 0.4 || x > l.x1 - 0.4 || z < l.z0 + 0.4 || z > l.z1 - 0.4) break;
      const g = landAt(x, z);
      if (g < top - 0.3 && r > 3) break;
      top = Math.max(top, g);
      H.forEach((h, j) => {
        if (c[j][i] === null && g >= h && prev < h) c[j][i] = r - 0.08 * ((g - h) / Math.max(1e-6, g - prev));
      });
      prev = g;
    }
    rim.push(r - 0.08);
  }
  return { M, H, n, c, rim };
}

/** How high the pit's floor is at a place: the tier it lies on, or the ground where no tier is. */
function pitFloor(p: Pit, x: number, z: number): number {
  const dx = x - p.M[0], dz = z - p.M[1], r = Math.hypot(dx, dz);
  let a = Math.atan2(dz, dx) / (Math.PI * 2);
  if (a < 0) a += 1;
  const u = a * p.n, i = Math.floor(u) % p.n, i2 = (i + 1) % p.n, f = u - Math.floor(u);
  const at = (j: number): number | null => {
    const ci = p.c[j][i], cj = p.c[j][i2];
    return ci === null || cj === null ? null : ci + (cj - ci) * f;
  };
  const c0 = at(0) ?? p.rim[i] + (p.rim[i2] - p.rim[i]) * f;
  if (r <= c0) return p.H[0] + LIFT;
  for (let j = 1; j < p.H.length; j++) {
    const cj = at(j);
    if (cj === null) break;
    if (r <= cj) return p.H[j] + LIFT;
  }
  return landAt(x, z);
}

function mine(k: Build, l: Lot): void {
  const b = k.b, p = pitPlan(l), r = rng(90107), { M, H, n, c } = p, T = H.length;
  const Y = H.map((h) => h + LIFT);
  const P = (i: number, rr: number): [number, number] => {
    const a = ((i % n) / n) * Math.PI * 2;
    return [M[0] + Math.cos(a) * rr, M[1] + Math.sin(a) * rr];
  };
  const has = (j: number, i: number): boolean => c[j][i % n] !== null && c[j][(i + 1) % n] !== null;
  /** The inward normal and the tangent of the stretch between two points on a ring round the lowest point. */
  const frame = (a: [number, number], d: [number, number]): { nx: number; nz: number; tx: number; tz: number; len: number } => {
    const tx0 = d[0] - a[0], tz0 = d[1] - a[1], len = Math.hypot(tx0, tz0) || 1, tx = tx0 / len, tz = tz0 / len;
    let nx = -tz, nz = tx;
    if (nx * (M[0] - (a[0] + d[0]) / 2) + nz * (M[1] - (a[1] + d[1]) / 2) < 0) { nx = -nx; nz = -nz; }
    return { nx, nz, tx, tz, len };
  };

  // ---- the floors of the tiers
  for (let i = 0; i < n; i++) {
    const i2 = (i + 1) % n;
    // the pit's floor, out to where the ground reaches its height
    const ra = c[0][i] ?? p.rim[i], rb = c[0][i2] ?? p.rim[i2], A = P(i, ra), B = P(i2, rb);
    b.up([M[0], Y[0], M[1]], [A[0], Y[0], A[1]], [B[0], Y[0], B[1]], FLOOR[0]);
    if (c[0][i] === null || c[0][i2] === null) {
      // where the floor reaches the edge of the lot before the ground reaches its height, a face down to the ground
      const f = frame(A, B);
      b.quad([A[0], landAt(A[0], A[1]) - 0.3, A[1]], [B[0], landAt(B[0], B[1]) - 0.3, B[1]], [B[0], Y[0], B[1]], [A[0], Y[0], A[1]], [-f.nx, 0, -f.nz], ROCK[0]);
    }
    for (let j = 1; j < T; j++) {
      if (!has(j, i)) continue;
      const a0 = P(i, c[j - 1][i]!), a1 = P(i, c[j][i]!), b0 = P(i2, c[j - 1][i2]!), b1 = P(i2, c[j][i2]!);
      b.up([a0[0], Y[j], a0[1]], [a1[0], Y[j], a1[1]], [b1[0], Y[j], b1[1]], FLOOR[j % FLOOR.length]);
      b.up([a0[0], Y[j], a0[1]], [b1[0], Y[j], b1[1]], [b0[0], Y[j], b0[1]], FLOOR[j % FLOOR.length]);
      // the walls of rock up from the tier below, facing into the pit
      const f = frame(a0, b0);
      b.quad([a0[0], Y[j - 1] - 0.45, a0[1]], [b0[0], Y[j - 1] - 0.45, b0[1]], [b0[0], Y[j], b0[1]], [a0[0], Y[j], a0[1]], [f.nx, 0, f.nz], ROCK[(j + i) % ROCK.length]);
      // where the tier ends round the pit, a face down to the ground
      for (const [end, other, s] of [[i, (i - 1 + n) % n, -1], [i2, (i + 1) % n, 1]] as const) {
        if (has(j, other)) continue;
        const ea = P(end, c[j - 1][end]!), eb = P(end, c[j][end]!), steps = 4;
        const ang = ((end % n) / n) * Math.PI * 2, tnx = -Math.sin(ang) * s, tnz = Math.cos(ang) * s;
        for (let q = 0; q < steps; q++) {
          const u0 = q / steps, u1 = (q + 1) / steps;
          const pa: [number, number] = [ea[0] + (eb[0] - ea[0]) * u0, ea[1] + (eb[1] - ea[1]) * u0], pb: [number, number] = [ea[0] + (eb[0] - ea[0]) * u1, ea[1] + (eb[1] - ea[1]) * u1];
          b.quad([pa[0], landAt(pa[0], pa[1]) - 0.3, pa[1]], [pb[0], landAt(pb[0], pb[1]) - 0.3, pb[1]], [pb[0], Y[j], pb[1]], [pa[0], Y[j], pa[1]], [tnx, 0, tnz], ROCK[j % ROCK.length]);
        }
      }
    }
  }

  // ---- stairs between the tiers, a coping along each tier's edge, and homes in the walls
  const stairs: { j: number; x: number; z: number }[] = [];
  for (let j = 0; j + 1 < T; j++) {
    // the stretches of the wall up from tier j, in order round the pit, starting after a gap
    const runs: number[] = [];
    let start = 0;
    for (let i = 0; i < n; i++) if (!has(j + 1, i) && has(j + 1, i + 1)) start = i + 1;
    for (let q = 0; q < n; q++) if (has(j + 1, start + q)) runs.push((start + q) % n);
    if (runs.length < 4) continue;
    const seg = (i: number): { a: [number, number]; d: [number, number] } => ({ a: P(i, c[j][i]!), d: P(i + 1, c[j][(i + 1) % n]!) });
    // two flights of steps on each tier, against its wall
    const picks = [Math.floor(runs.length * 0.28), Math.floor(runs.length * 0.7)];
    for (const q of picks) {
      const { a, d } = seg(runs[q]), f = frame(a, d), mx = (a[0] + d[0]) / 2, mz = (a[1] + d[1]) / 2, yaw = Math.atan2(f.tz, f.tx), steps = 7;
      for (let s = 0; s < steps; s++) {
        // the top step a hair under the tier above, so that the two never lie in one plane
        const top = Y[j] + ((s + 1) * (Y[j + 1] - Y[j] - 0.05)) / steps, along = -1.55 + (s + 0.5) * 0.44;
        b.obox(mx + f.nx * 0.5 + f.tx * along, (Y[j] - 0.1 + top) / 2, mz + f.nz * 0.5 + f.tz * along, 0.23, (top - Y[j] + 0.1) / 2, 0.5, yaw, COPING);
      }
      stairs.push({ j, x: mx, z: mz });
    }
    // the coping along the top of the wall, on the tier above, but where the stairs come up
    for (const i of runs) {
      const { a, d } = seg(i), f = frame(a, d), mx = (a[0] + d[0]) / 2, mz = (a[1] + d[1]) / 2;
      if (stairs.some((s) => s.j === j && Math.hypot(s.x - mx, s.z - mz) < 2)) continue;
      b.obox(mx - f.nx * 0.18, Y[j + 1] + 0.12, mz - f.nz * 0.18, f.len / 2 + 0.03, 0.14, 0.18, Math.atan2(f.tz, f.tx), COPING);
    }
    // the homes: a lit doorway and a window, every few steps along the wall
    let walked = 1.3;
    for (const i of runs) {
      const { a, d } = seg(i), f = frame(a, d);
      while (walked < f.len) {
        const x = a[0] + f.tx * walked, z = a[1] + f.tz * walked;
        walked += 2.75;
        if (stairs.some((s) => s.j === j && Math.hypot(s.x - x, s.z - z) < 2.3)) continue;
        const o = 0.03, y = Y[j], q = (u: number, v: number): V3 => [x + f.nx * o + f.tx * u, y + v, z + f.nz * o + f.tz * u];
        b.quad(q(-0.45, 0), q(0.45, 0), q(0.45, 2.25), q(-0.45, 2.25), [f.nx, 0, f.nz], HOME_DOOR, { win: interior(2.8) });
        b.quad(q(0.75, 1.15), q(1.3, 1.15), q(1.3, 1.75), q(0.75, 1.75), [f.nx, 0, f.nz], HOME_WIN, { win: interior(2.2) });
        b.obox(x + f.nx * 0.1, y + 2.36, z + f.nz * 0.1, 0.62, 0.08, 0.1, Math.atan2(f.tz, f.tx), COPING);
        if (r() < 0.5) glow(k, x + f.nx * 0.16 - f.tx * 0.75, y + 2.05, z + f.nz * 0.16 - f.tz * 0.75, 0.16, '#ffcf8a');
      }
      walked -= f.len;
    }
  }

  // ---- the lamp mast on the pit's floor, lighting the Common
  {
    const mx = M[0] - 2.6, mz = M[1] - 1.2, y = pitFloor(p, mx, mz), top = Math.min(l.top + 3.5, y + 10);
    b.cyl(mx, mz, y - 0.2, y + 0.6, 0.5, 0.42, 6, IRON_D);
    b.cyl(mx, mz, y + 0.6, top, 0.2, 0.12, 6, POLE);
    b.box(mx - 1.1, top - 0.1, mz - 0.1, mx + 1.1, top + 0.08, mz + 0.1, IRON_L, { faces: 'NESWTB' });
    b.box(mx - 0.1, top - 0.1, mz - 1.1, mx + 0.1, top + 0.08, mz + 1.1, IRON_L, { faces: 'NESWTB' });
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) glow(k, mx + dx, top - 0.22, mz + dz, 0.34, '#fff0c8', 0.22);
    k.lights.push({ x: M[0], z: M[1] - 1, r: 13, color: WARM, k: 0.65 });
  }

  // ---- the gravLift: a shaft at the rim on the south-west, its headgear over it, a platform in its field
  {
    const gx = MINE.c[0] - MINE.r + 0.5, gz = MINE.c[1] + 6, y = landAt(gx, gz), top = Math.min(l.top - 0.3, y + 4.6);
    b.cyl(gx, gz, y - 0.4, y + 0.45, 1.45, 1.35, 8, IRON_D, { cap: 0x22262b });
    glow(k, gx, y + 0.5, gz, 1.5, '#9ad0ff', 0.05);
    // its four legs, leaning in to the crown
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.b.beam([gx + sx * 1.25, y + 0.3, gz + sz * 1.25], [gx + sx * 0.55, top - 0.6, gz + sz * 0.55], 0.12, 0.09, 0xb5bdc6);
    for (const f of [0.38, 0.68]) {
      const hy = y + 0.3 + (top - 0.6 - y - 0.3) * f, w = 1.25 - 0.7 * f;
      b.box(gx - w, hy - 0.06, gz - w, gx + w, hy + 0.06, gz + w, 0xb5bdc6, { faces: 'NESWTB' });
    }
    b.box(gx - 0.8, top - 0.6, gz - 0.8, gx + 0.8, top - 0.1, gz + 0.8, DRILL_STEEL, { faces: 'NESWTB' });
    b.moved(gx, 0, gz, Math.atan2(VZ, VX), () => drum(b, [0, top + 0.25, 0], 0.5, 0.12, 0xc9ced3, { cap: IRON_L }));
    glow(k, gx, top + 0.82, gz, 0.2, '#ff3b3b');
    // the platform, carried up the shaft by the field, with two Reds on it
    const py = y + 1.5;
    b.cyl(gx, gz, py - 0.12, py, 1.0, 1.0, 8, 0x8e949b, { cap: 0xa8aeb5 });
    glow(k, gx, py - 0.2, gz, 1.2, '#bfe6ff', 0.06);
    figure(b, gx - 0.35, gz - 0.2, py, RED);
    figure(b, gx + 0.4, gz + 0.25, py, RED);
    k.lights.push({ x: gx, z: gz, r: 8, color: COLD, k: 0.45 });
  }

  // ---- Reds about the tiers, spread out
  const reds: P2[] = [];
  for (let n2 = 0, tries = 0; n2 < 10 && tries < 120; tries++) {
    const i = Math.floor(r() * n), j = Math.floor(r() * T);
    if (j > 0 && !has(j, i)) continue;
    const r0 = j === 0 ? 0.6 : c[j - 1][i]!, r1 = j === 0 ? (c[0][i] ?? p.rim[i]) : c[j][i]!;
    if (r1 - r0 < 1.4) continue;
    const [x, z] = P(i + 0.5, r0 + 0.45 + (r1 - r0 - 0.9) * r());
    if (stairs.some((s) => Math.hypot(s.x - x, s.z - z) < 2.2) || Math.hypot(x - (M[0] - 2.6), z - (M[1] - 1.2)) < 1) continue;
    if (reds.some(([qx, qz]) => Math.hypot(qx - x, qz - z) < 2.4)) continue;
    reds.push([x, z]);
    figure(b, x, z, Y[j], RED);
    n2++;
  }

  clawDrill(k, l, p);

  // the name, on the slope south-west of the pit
  const bx = l.x0 + 2.2, bz = MINE.c[1] + 8;
  nameBoard(k, SIGN.mine, bx, bz, landAt(bx, bz));
}

/**
 * The clawDrill: a machine shaped like a hand and its forearm, on tracks at
 * the pit's south-east rim. Its cab is at the elbow, its forearm reaches out
 * over the rim to the wrist, and its palm and fingers, each a jointed arm
 * that ends in a drill, reach down into the pit onto its tiers.
 */
function clawDrill(k: Build, l: Lot, p: Pit): void {
  const b = k.b;
  const ul = Math.hypot(0.9, 0.44), ux = 0.9 / ul, uz = 0.44 / ul;
  // local x runs from the elbow towards the pit's middle, local z across
  const dx = -ux, dz = -uz, px = -dz, pz = dx, yaw = Math.atan2(dz, dx), across = Math.atan2(pz, px);
  /** How far the elbow stands from the pit's middle, out to the south-east. */
  const reach = 16;
  const E: P2 = [MINE.c[0] + ux * reach, MINE.c[1] + uz * reach];
  const W = (lx: number, lz: number): P2 => [E[0] + lx * dx + lz * px, E[1] + lx * dz + lz * pz];
  const V = (lx: number, y: number, lz: number): V3 => {
    const w = W(lx, lz);
    return [w[0], y, w[1]];
  };
  const g = (lx: number, lz = 0): number => {
    const w = W(lx, lz);
    return landAt(w[0], w[1]);
  };
  const at = (lx: number, lz: number, fn: () => void, turn = yaw): void => {
    const w = W(lx, lz);
    b.moved(w[0], 0, w[1], turn, fn);
  };

  // the tracks, lying on the slope
  const t0 = -2.3, t1 = 2.4, tz = 1.4;
  for (const s of [-1, 1]) {
    slab(b, V(t0, g(t0, s * tz) + 0.95, s * tz), V(t1, g(t1, s * tz) + 0.95, s * tz), 0.5, 1.35, TRACK);
    for (const lx of [-1.6, -0.5, 0.6, 1.7]) {
      const yy = g(lx, s * tz) + 0.45;
      at(lx, s * (tz + 0.52), () => drum(b, [0, yy, 0], 0.4, 0.05, 0x8a8f96, { cap: 0x9aa0a6 }), across);
    }
  }
  const deck = (lx: number): number => (g(lx, -tz) + g(lx, tz)) / 2 + 1.45;
  slab(b, V(-2.6, deck(-2.6), 0), V(2.3, deck(2.3), 0), 1.95, 0.6, DRILL_DARK);

  // the cab at the elbow: a pitched block, its windscreen and side windows lit, lamps and beacons on its roof
  const c0 = -2.5, c1 = 0.1, ch = 2.15, ct = (lx: number): number => deck(lx) + ch;
  slab(b, V(c0, ct(c0), 0), V(c1, ct(c1), 0), 1.25, ch, DRILL);
  slab(b, V(c0 - 0.1, ct(c0) + 0.16, 0), V(c1 + 0.1, ct(c1) + 0.16, 0), 1.05, 0.2, DRILL_DARK);
  {
    const fy = ct(c1), f0 = V(c1 + 0.03, fy - 1.35, -0.95), f1 = V(c1 + 0.03, fy - 1.35, 0.95), f2 = V(c1 + 0.03, fy - 0.28, 0.95), f3 = V(c1 + 0.03, fy - 0.28, -0.95);
    b.quad(f0, f1, f2, f3, [dx, 0, dz], GLASS_LIT, { win: interior(2.4) });
    for (const s of [-1, 1]) {
      const a0 = -1.9, a1 = -0.3, q0 = V(a0, ct(a0) - 1.2, s * 1.28), q1 = V(a1, ct(a1) - 1.2, s * 1.28), q2 = V(a1, ct(a1) - 0.35, s * 1.28), q3 = V(a0, ct(a0) - 0.35, s * 1.28);
      b.quad(q0, q1, q2, q3, [px * s, 0, pz * s], GLASS_LIT, { win: interior(2.2) });
    }
    for (const s of [-1, 1]) {
      const [hx, hy, hz] = V(c1 + 0.12, fy - 1.65, s * 0.85);
      glow(k, hx, hy, hz, 0.28, '#fff4d6');
      const [bx2, by2, bz2] = V(c0 + 0.4, ct(c0 + 0.4) + 0.42, s * 0.8);
      glow(k, bx2, by2, bz2, 0.2, '#ffb45a');
    }
    // its two exhausts, smoking
    for (const s of [-1, 1]) {
      const [ex, , ez] = V(c0 + 0.45, 0, s * 0.85), ey = ct(c0 + 0.45);
      b.cyl(ex, ez, ey - 0.2, ey + 1.05, 0.17, 0.15, 6, DRILL_STEEL);
      PUFFERS.push({ x: ex, y: ey + 1.15, z: ez, every: 0.7, size: 0.32, shade: 0.62 });
    }
  }

  // the elbow joint, and the forearm out over the rim to the wrist
  const ex0 = 0.9, ey = deck(ex0) + 1.15;
  at(ex0, 0, () => drum(b, [0, ey, 0], 1.05, 1.2, DRILL_STEEL, { cap: 0x6a6e75 }), across);
  const wx = reach - MINE.r, wy = Math.min(l.top - 1.4, g(wx) + 2.7);
  const line = (lx: number): number => ey + ((wy - ey) * (lx - ex0)) / (wx - ex0);
  slab(b, V(ex0, ey + 0.75, 0), V(wx, wy + 0.6, 0), 0.92, 1.5, DRILL);
  slab(b, V(ex0 + 0.6, line(ex0 + 0.6) + 0.95, 0), V(wx - 0.4, line(wx - 0.4) + 0.8, 0), 0.45, 0.32, DRILL_DARK);
  // stripes down its sides, yellow and dark
  for (let q = 0; q < 6; q++) {
    const a = ex0 + 0.7 + q * ((wx - ex0 - 1.4) / 6), d = a + (wx - ex0 - 1.4) / 12;
    for (const s of [-1, 1]) slab(b, V(a, line(a) + 0.35, s * 0.97), V(d, line(d) + 0.35, s * 0.97), 0.06, 0.55, q % 2 ? DRILL_DARK : 0x2c2d31);
  }
  // the rams that lift it, from the deck to its underside
  for (const s of [-1, 1]) {
    const a = V(1.9, deck(1.9) + 0.1, s * 0.62), d = V(4.8, line(4.8) - 0.72, s * 0.62), m: V3 = [a[0] + (d[0] - a[0]) * 0.6, a[1] + (d[1] - a[1]) * 0.6, a[2] + (d[2] - a[2]) * 0.6];
    b.beam(a, m, 0.2, 0.2, 0x8a9098);
    b.beam(m, d, 0.11, 0.11, 0xd3d8de);
  }
  // the wrist: a ball
  const [wwx, , wwz] = V(wx, 0, 0);
  b.cyl(wwx, wwz, wy - 0.95, wy - 0.45, 0.02, 0.6, 8, DRILL_STEEL);
  b.cyl(wwx, wwz, wy - 0.45, wy + 0.45, 0.9, 0.9, 8, DRILL_STEEL, { cap: false });
  b.cyl(wwx, wwz, wy + 0.45, wy + 0.95, 0.6, 0.02, 8, DRILL_STEEL);

  // the palm, down from the wrist, and the knuckles
  const kx = wx + 3.0, ky = wy - 1.5;
  slab(b, V(wx + 0.3, wy + 0.35, 0), V(kx, ky + 0.32, 0), 1.75, 0.62, DRILL);
  slab(b, V(wx + 0.6, wy + 0.5, 0), V(kx - 0.3, ky + 0.47, 0), 1.1, 0.2, DRILL_DARK);
  at(kx, 0, () => drum(b, [0, ky, 0], 0.52, 1.9, DRILL_STEEL, { cap: 0x6a6e75 }), across);
  for (const s of [-1, 1]) {
    const [lx2, ly2, lz2] = V(kx - 0.2, ky + 0.6, s * 1.25);
    glow(k, lx2, ly2, lz2, 0.24, '#fff4d6');
  }

  // the fingers, four from the knuckles and a thumb from the side of the palm, each a jointed arm that bends down to a drill
  const fingers: { sx: number; sz: number; sy: number; a: number; len: number }[] = [
    { sx: kx + 0.2, sz: -1.4, sy: ky, a: -0.62, len: 5.0 },
    { sx: kx + 0.3, sz: -0.47, sy: ky, a: -0.2, len: 6.1 },
    { sx: kx + 0.3, sz: 0.47, sy: ky, a: 0.2, len: 5.9 },
    { sx: kx + 0.2, sz: 1.4, sy: ky, a: 0.6, len: 4.7 },
    { sx: wx + 1.4, sz: 1.85, sy: wy - 0.6, a: 0.9, len: 3.6 },
  ];
  for (const f of fingers) {
    const ca = Math.cos(f.a), sa = Math.sin(f.a), tlx = f.sx + ca * f.len, tlz = f.sz + sa * f.len;
    const [tx, , tz] = V(tlx, 0, tlz), fy = pitFloor(p, tx, tz);
    const P0 = V(f.sx, f.sy, f.sz), P1 = V(f.sx + ca * 1.5, f.sy + 1.3, f.sz + sa * 1.5), P2 = V(tlx - ca * 1.1, Math.min(fy + 3.3, l.top - 0.6), tlz - sa * 1.1), P3 = V(tlx, fy + 1.3, tlz);
    const pts: V3[] = [], radii: number[] = [], N = 13;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), u = 1 - t;
      pts.push([0, 1, 2].map((q) => u * u * u * P0[q] + 3 * u * u * t * P1[q] + 3 * u * t * t * P2[q] + t * t * t * P3[q]) as V3);
      radii.push((0.44 + (0.27 - 0.44) * t) * (i % 2 ? 0.8 : 1));
    }
    b.sweep(pts, radii, DRILL);
    // the drill: a collar, the bit, and a band round it, and the glow of its work
    b.cyl(tx, tz, fy + 1.05, fy + 1.5, 0.42, 0.38, 8, DRILL_STEEL);
    b.cyl(tx, tz, fy - 0.3, fy + 1.05, 0.03, 0.36, 8, BIT, { cap: false });
    b.cyl(tx, tz, fy + 0.5, fy + 0.66, 0.27, 0.29, 8, DRILL_STEEL);
    glow(k, tx, fy + 0.06, tz, 0.4, '#ffb45a', 0.1);
  }

  const [cx2, , cz2] = V(-1, 0, 0), [hx2, , hz2] = V(kx + 2, 0, 0);
  k.lights.push({ x: cx2, z: cz2, r: 9, color: AMBER, k: 0.45 }, { x: hx2, z: hz2, r: 9, color: WARM, k: 0.5 });
}

// ---------------------------------------------------------------------------
// The snowy peaks
// ---------------------------------------------------------------------------

/** A boulder: a squat stone, sunk a little into the ground. */
function boulder(b: GeoBuilder, x: number, z: number, s: number, color: number, sides = 6): void {
  const y = landAt(x, z);
  b.cyl(x, z, y - 0.35, y + 0.75 * s, 0.95 * s, 0.45 * s, sides, color, { phase: x * 0.7 + z });
}

function peaks(k: Build, l: Lot): void {
  const b = k.b, r = rng(38038);
  // rocks on the slopes and round the feet, grey where the snow lies and rust below it
  for (let n = 0, tries = 0; n < 34 && tries < 300; tries++) {
    const pk = PEAKS[Math.floor(r() * PEAKS.length)], a = r() * Math.PI * 2, d = pk.r * (0.25 + 0.8 * r());
    const x = pk.c[0] + Math.cos(a) * d, z = pk.c[1] + Math.sin(a) * d;
    if (x < l.x0 + 1 || x > l.x1 - 1 || z < l.z0 + 1 || z > Math.min(l.z1, 111) - 1) continue;
    const y = landAt(x, z);
    boulder(b, x, z, 0.55 + r() * 0.6, y > 11 ? STONE_GREY[n % 3] : STONE_RUST, 5 + (n % 3));
    n++;
  }
  // drifts of snow, banked against the high slopes
  for (let n = 0, tries = 0; n < 12 && tries < 300; tries++) {
    const pk = PEAKS[Math.floor(r() * PEAKS.length)], a = r() * Math.PI * 2, d = pk.r * (0.1 + 0.6 * r());
    const x = pk.c[0] + Math.cos(a) * d, z = pk.c[1] + Math.sin(a) * d, y = landAt(x, z);
    if (y < 11.5 || x < l.x0 + 1 || x > l.x1 - 1 || z > 111) continue;
    // only where the slope is gentle, so that a drift lies on it and does not stand out of it
    const s = 0.6 + r() * 0.5, fall = Math.abs(landAt(x + 1.2 * s, z) - landAt(x - 1.2 * s, z)) + Math.abs(landAt(x, z + 1.2 * s) - landAt(x, z - 1.2 * s));
    if (fall > 1.4) continue;
    b.cyl(x, z, y - 0.5 - fall / 2, y + 0.22, 1.2 * s, 0.7 * s, 7, n % 3 ? DRIFT : DRIFT_SHADE, { phase: r() * 3 });
    n++;
  }
  // a cairn on the highest summit, where the Reaper's squadron came down
  {
    const [x, z] = PEAKS[0].c, y = landAt(x, z);
    const stones: [number, number][] = [[0.62, 0.32], [0.5, 0.26], [0.4, 0.22], [0.28, 0.2]];
    let yy = y - 0.15;
    stones.forEach(([w, h], i) => {
      b.box(x - w, yy, z - w * 0.85, x + w, yy + h, z + w * 0.85, STONE_GREY[i % 3], { faces: 'NESWT' });
      yy += h - 0.02;
    });
    b.box(x - 0.05, yy, z - 0.05, x + 0.05, y + 1.18, z + 0.05, AUGUSTUS_GOLD, { faces: 'NESWT' });
  }
  // a beacon on the second, lit
  {
    const [x, z] = PEAKS[1].c, y = landAt(x, z);
    b.cyl(x, z, y - 0.2, y + 0.25, 0.42, 0.36, 6, STONE_GREY[1]);
    b.cyl(x, z, y + 0.25, y + 0.85, 0.09, 0.09, 6, POLE);
    b.box(x - 0.18, y + 0.85, z - 0.18, x + 0.18, y + 0.92, z + 0.18, IRON_D, { faces: 'NESWTB' });
    glow(k, x, y + 1.04, z, 0.26, '#ff6a3a', 0.22);
    k.lights.push({ x, z, r: 7, color: '#ff8a5a', k: 0.35 });
  }
  // a marker on the third
  {
    const [x, z] = PEAKS[2].c;
    boulder(b, x + 0.6, z - 0.4, 0.9, STONE_GREY[2], 6);
    boulder(b, x - 0.5, z + 0.3, 0.7, STONE_GREY[0], 5);
  }
}

// ---------------------------------------------------------------------------
// The planet's forests and fields
// ---------------------------------------------------------------------------

/** Smooth noise over the ground, from 0 to 1, the same on every load: where the stands of pines are. */
function noise(x: number, z: number): number {
  const h = (i: number, j: number): number => {
    const s = Math.sin(i * 157.31 + j * 271.97) * 43758.5453;
    return s - Math.floor(s);
  };
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return h(i, j) * (1 - u) * (1 - v) + h(i + 1, j) * u * (1 - v) + h(i, j + 1) * (1 - u) * v + h(i + 1, j + 1) * u * v;
}

/** The fields on the south-west of the flank: their corners, and whether they carry wheat or greens. */
const FIELDS: { x0: number; z0: number; x1: number; z1: number; wheat: boolean }[] = [
  { x0: -72, z0: 97, x1: -54, z1: 109, wheat: true },
  { x0: -94, z0: 87, x1: -80, z1: 99, wheat: false },
];

function fields(k: Build): void {
  for (const f of FIELDS) {
    // rows that run across the slope, two colours turn about
    drape(k.b, f.x0, f.z0, f.x1, f.z1, 0.05, (_cx, _cz, _i, j) => (f.wheat ? WHEAT : GREENS)[j % 2]);
    // a hedge round it, with a gap for a gate on the north
    const xm = (f.x0 + f.x1) / 2;
    alongGround(k.b, [[xm - 1.5, f.z0 - 0.6], [f.x0 - 0.6, f.z0 - 0.6], [f.x0 - 0.6, f.z1 + 0.6], [f.x1 + 0.6, f.z1 + 0.6], [f.x1 + 0.6, f.z0 - 0.6], [xm + 1.5, f.z0 - 0.6]], 0.7, 0.35, HEDGE);
  }
}

/** Whether a place is on or by one of the fields. */
const inField = (x: number, z: number, room: number): boolean => FIELDS.some((f) => x > f.x0 - 0.6 - room && x < f.x1 + 0.6 + room && z > f.z0 - 0.6 - room && z < f.z1 + 0.6 + room);

/** Plants a tree if it may stand there: open ground, clear of where the Rain lands and the spider tanks walk, low before a board, hiding nothing the view must see, and never more than 8 over the ground. */
function plant(k: Build, x: number, z: number, size: number, tall: boolean): boolean {
  const rad = tall ? 1.15 * size : 2.7 * size, h = tall ? 9 * size : 8.1 * size;
  if (h > 7.8) return false;
  if (!open(x, z, rad * 0.7 + 0.4)) return false;
  if (inLanding(x, z, rad + 0.6) || toPatrol(x, z) < 5 + rad || inField(x, z, rad)) return false;
  if (h > underBoards(x, z, rad)) return false;
  const y = landAt(x, z);
  if (hides(x, z, y + h, rad)) return false;
  k.tree(x, z, size, tall, y);
  return true;
}

function forests(k: Build): void {
  const r = rng(47047);
  /** The stands: where pines grow thick, by the noise, and how thick. */
  const stands: { x0: number; z0: number; x1: number; z1: number; thick: number }[] = [
    // the flank west of the camp and of the city, down to the board's west edge
    { x0: -103, z0: 31, x1: -77, z1: 112, thick: 0.42 },
    // the south of the board, west of the mine
    { x0: -77, z0: 80, x1: 3, z1: 112, thick: 0.48 },
    // a few on the flank between the mine and the peaks, south of where the spider tanks walk
    { x0: 40, z0: 104, x1: 70, z1: 112, thick: 0.55 },
    // and on the east flank, north of the peaks
    { x0: 72, z0: 63, x1: 103, z1: 75, thick: 0.5 },
  ];
  for (const s of stands) {
    for (let x = s.x0; x < s.x1; x += 2.3) {
      for (let z = s.z0; z < s.z1; z += 2.3) {
        const tx = x + r() * 2.0, tz = z + r() * 2.0, d = noise(tx * 0.075, tz * 0.075), pick = r(), sz = r();
        if (Math.abs(tx) > 103 || Math.abs(tz) > 112) continue;
        // only where the outside of the trench is, never on the city's floor
        if (outOfTrench(tx, tz) < 1.5) continue;
        if (d < s.thick) {
          // a clearing: now and then a lone tree
          if (pick < 0.06) plant(k, tx, tz, 0.4 + sz * 0.2, sz > 0.5);
          continue;
        }
        // the taiga: pines, taller in the thick of a stand
        plant(k, tx, tz, 0.48 + 0.24 * Math.min(1, (d - s.thick) * 3) + sz * 0.08, true);
      }
    }
  }
  // broadleaves under the south wall, a few
  const wall = lotOf('wall-s-w');
  for (const [x0, x1] of [[wall.x0 - 4, lotOf('camp').x0 - 2], [STAGES.outside.x1 + 3, wall.x1 - 4]]) {
    for (let x = x0; x < x1; x += 3.4) {
      const tx = x + r() * 1.2, tz = wall.z1 + 1.8 + r() * 2.2;
      plant(k, tx, tz, 0.42 + r() * 0.16, false);
    }
  }
}

// ---------------------------------------------------------------------------
// Smoke
// ---------------------------------------------------------------------------

function smoke(k: Build): void {
  if (PUFFERS.length === 0) return;
  const s = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 110);
  k.group.add(s.mesh);
  const r = rng(77017), from = new THREE.Vector3(), drift = new THREE.Vector3(0.45, 0.3, 0.2), due = PUFFERS.map(() => r() * 0.8);
  const puffers = [...PUFFERS];
  k.each((dt) => {
    puffers.forEach((p, i) => {
      due[i] -= dt;
      if (due[i] > 0) return;
      due[i] = p.every * (0.75 + r() * 0.5);
      s.puff(from.set(p.x + (r() - 0.5) * 0.15, p.y, p.z + (r() - 0.5) * 0.15), drift, p.size * (0.85 + r() * 0.3), p.shade);
    });
    s.update(dt);
  });
}

// ---------------------------------------------------------------------------
// What the tile calls
// ---------------------------------------------------------------------------

/** A model for each lot this file builds, by the id of the lot in plan.ts. */
export const MODELS: Record<string, Model> = { camp, mine, peaks };
/** Lots built as part of another lot's model or by `extras`, which get no box either. */
export const COVERS: string[] = [];
/** Whatever this file builds that is not one of the plan's lots: the fields, the forests, and the smoke of the camp and the drill. */
export function extras(k: Build): void {
  if (TARGETS.length === 0) TARGETS = targets();
  fields(k);
  forests(k);
  smoke(k);
}
