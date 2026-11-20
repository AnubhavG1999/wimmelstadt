// The south shore of the Rush and of the bay: the kingswood, old oaks and
// pines along the bay's southern shore; the meadow by the Wendwater with its
// flock and its stone fold; the ford where the south road crosses the
// Wendwater; the ferry's landing on the Rush; and Massey's Hook, the bay's
// southern arm, low grassland with rocks and gorse, fishing folk's huts and
// boats along its shore and a beacon, with two modest castles of grey stone:
// Stonedance, House Massey's seat, facing the bay, and Sharp Point, House Bar
// Emmon's, at the Hook's eastern tip.
//
// Drawn from the books' plain words as the research note gives them (section
// 2, items 51 to 56, and section 5, item 2): the kingswood along the bay's
// southern shore; the Wendwater running north into the bay, as far as which
// Sheepstealer hunted sheep; Massey's Hook, which shelters the bay from the
// Narrow Sea, with Stonedance and, at its eastern tip, Sharp Point. Neither
// castle's look was found, nor either house's colours: each castle is this
// tile's own drawing, and each flies plain colours. The fold, the ferry, the
// ford and the scenes in the wood are the tile's own. Nothing is taken from
// the television series.

import * as THREE from 'three';
import { beside, fine } from '../../engine/corners';
import { Smoke } from '../../engine/effects';
import { rng, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { area, flat, oval, rect } from '../../engine/ground';
import { archway, figure, lantern, type Dress } from '../../engine/parts';
import { face3, gable, hip, prism, slab, type XZ } from '../../engine/shapes';
import { fit, type SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { wendwater } from './land';
import {
  BOARDS, BRONZE, DARK, DOOR, IRONWORK, LOOPS, ROOF, STONE, TIMBER, TIMBER_DARK, TO_VIEW,
  banner, brazier, doorway, fire, nameBoard, nameSign, rampart, roundTower,
} from './look';
import type { Model } from './models';
import { FLOCK, LANE, LOTS, MEADOW, ROADS, RUSH, SHORE, TURNS, WENDWATER, lotOf, type Lot, type P2 } from './plan';
import { inMeadow, isLand, toLine, toRoad, underBoards } from './space';

// ---------------------------------------------------------------------------
// Colours, windows and what the parts share
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2;
/** The way the view the tile opens with looks back from, on the ground; and the way to the right of a board that faces it. */
const VX = TO_VIEW[0], VZ = TO_VIEW[2], RX = VZ, RZ = -VX;
/** How steeply the view looks down: what stands before a place hides it above a line that rises this much for each unit nearer the view. */
const DIP = Math.tan((38 * Math.PI) / 180);
/** The board's edges, as the plan keeps shapes a hair inside them. */
const XE = 103.8, ZS = 112.8, XW = -103.8;

/** The grey stone of the bay's older castles, as the shared look has it. */
const WALL = STONE.shore, WALL_TOP = STONE.shoreShade, SLATE_UNDER = 0x3e464f;
/** Grass: the meadow's, and the Hook's, paler and drier than the wood's; and a glade's. */
const MEADOW_GRASS = 0x97c46e, HOOK_GRASS = 0x9ab86c, GLADE = 0x86b062;
/** Shingle on the Hook's shore; beaten earth; straw; a charcoal hearth's ashes; cobbles; chips about a woodcutter's block. */
const SHINGLE = 0xc4b9a0, EARTH = 0x9c845f, STRAW = 0xc8b37c, ASHES = 0x55504a, COBBLE = 0x8d867a, CHIPS = 0xb79f74;
/** Sheep: their fleece, its top in the sun, and the black of their faces and legs. */
const FLEECE = 0xefeadf, FLEECE_TOP = 0xf8f5ee, FACE = 0x2b2626;
/** Red deer: the coat, its back, the legs, the pale rump, and a stag's antlers. */
const DEER = 0x93633b, DEER_TOP = 0x84582f, DEER_LEG = 0x6b4a2c, RUMP = 0xeee3cf, ANTLER = 0xdccca6;
/** Gorse, dark green under its yellow; reeds and their brown heads. */
const GORSE = 0x46612f, GORSE_MID = 0x6f7f34, GORSE_BLOOM = 0xe3c23c, REED = 0xa9a85c, REED_HEAD = 0x5b3f28;
/** A willow's leaves, from its hanging skirt up to its crown, and under it; bark, and wood fresh cut. */
const WILLOW = [0x86ab58, 0x92b862, 0x9dc16b, 0xa7c874, 0xb0ce7c], WILLOW_UNDER = 0x6d8c46, BARK = 0x6a5440, CUT = 0xcfb385;
/** Rocks: grey on the grass, darker where the water wets them; and the top of each, a little lighter. */
const ROCK_GREY = 0x8b867d, ROCK_GREY_TOP = 0x9d988e, ROCK_WET = 0x6b665f, ROCK_WET_TOP = 0x7a756d;
/** Weathered planks and their lighter boards, the underside of a roof, a hurdle's pale wood, a crook's. */
const PLANK = 0x8a7258, PLANK_LIGHT = 0x9d856a, EAVES = 0x4a3b2c, HURDLE = 0xb09470, CROOK = 0x8a6a46;
/** Dry stone, in three greys, and the top of a wall of it. */
const DRY = [0x9d968a, 0x8d8679, 0xaaa395], DRY_TOP = 0x7f786c;
/** The ford's big flat stones, in three shades. */
const SLABS = [0xb3aa98, 0xa39a88, 0x8f877a];
/** The walls of fishing folk's huts: daub, whitewash, weathered planks, stone. */
const HUT_WALLS = [0xd9ccae, 0xe6dfcf, PLANK, 0xa69d8d];
const NIGHT = '#ffcf8a';

/** Small windows in the castles' walls, each with a storey that fits the wall it is on, so that no row is cut. */
const KEEP_WIN: WinSpec = { cell: 1.45, storey: 2.9, lit: 0.42, kind: 4 };
const GATE_WIN: WinSpec = { cell: 1.3, storey: 3.0, lit: 0.4, kind: 4 };
const TOWER_WIN: WinSpec = { cell: 1.7, storey: 2.2, lit: 0.32, kind: 4 };
const PROW_WIN: WinSpec = { cell: 1.6, storey: 3.0, lit: 0.42, kind: 4 };
const HALL_WIN: WinSpec = { cell: 1.3, storey: 2.5, lit: 0.45, kind: 4 };

/** How the folk of the shore are dressed, where it matters what they wear. */
const SHEPHERD: Dress = { coat: 0x6b5a3e, legs: 0x4a3c2c, hat: 0x5d4b33, hatH: 0.32, hatR: 0.34 };
const FORESTER: Dress = { coat: 0x4f6b3a, legs: 0x3e3226, hat: 0x3f5a2e, hatH: 0.28, hatR: 0.34 };
const WOODCUTTER: Dress = { coat: 0x8a4a2e, legs: 0x4a3c2c, hat: 0x5b4a32, hatH: 0.16 };
const COLLIER: Dress = { coat: 0x3a3632, legs: 0x2e2a26, hat: 0x2b2724, hatH: 0.2 };
/** A man-at-arms of the castles, in plain colours with a steel cap: neither house's colours were checked. */
const ARMS: Dress = { coat: 0x6b6458, legs: 0x3a3530, hat: 0xa8afb6, hatH: 0.3, hatR: 0.3 };

/** Smoke from chimneys and from the charcoal burner's mound, gathered as they are built and set going once. */
const SMOKE: { x: number; y: number; z: number; size: number; shade: number; every: number }[] = [];
/** What stands in the open, so that what is placed after it keeps clear: where, and how much room it takes. */
const TAKEN: { x: number; z: number; r: number }[] = [];
const free = (x: number, z: number, r: number): boolean => TAKEN.every((t) => Math.hypot(x - t.x, z - t.z) >= t.r + r);

/** The signs this file hangs. */
const SIGN = { ferry: 'south-shore-ferry', stonedance: 'south-shore-stonedance', sharp: 'south-shore-sharp-point', notice: 'south-shore-notice' };

// ---------------------------------------------------------------------------
// Sums
// ---------------------------------------------------------------------------

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number): number => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const pick = <T>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length) % list.length];
const sub = (a: V3, c: V3): V3 => [a[0] - c[0], a[1] - c[1], a[2] - c[2]];
const add = (a: V3, c: V3): V3 => [a[0] + c[0], a[1] + c[1], a[2] + c[2]];
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a: V3, c: V3): V3 => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
const unit = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** The part of an outline where `f`, which is straight across the ground, is not above 0. */
function clipHalf(shape: P2[], f: (p: P2) => number): P2[] {
  const out: P2[] = [];
  for (let i = 0; i < shape.length; i++) {
    const p = shape[i], q = shape[(i + 1) % shape.length], fp = f(p), fq = f(q);
    if (fp <= 0) out.push(p);
    if (fp <= 0 !== fq <= 0) {
      const t = fp / (fp - fq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

/** Where a line of corners that runs from west to east is at `x`. */
function zOn(line: P2[], x: number): number {
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i], c = line[i + 1];
    if ((a[0] - x) * (c[0] - x) <= 0 && a[0] !== c[0]) return a[1] + ((c[1] - a[1]) * (x - a[0])) / (c[0] - a[0]);
  }
  return line[line.length - 1][1];
}

// ---------------------------------------------------------------------------
// The south road over the ford, and the Wendwater
// ---------------------------------------------------------------------------

/** The south road's stretch over the ford, from (-50, 101) to (-16, 104): along it, and across it, south of its middle. */
const FA = ROADS.south[1], FB = ROADS.south[2];
const FU: P2 = (() => {
  const l = Math.hypot(FB[0] - FA[0], FB[1] - FA[1]);
  return [(FB[0] - FA[0]) / l, (FB[1] - FA[1]) / l];
})();
const FN: P2 = [-FU[1], FU[0]];
const alongFord = (p: P2): number => (p[0] - FA[0]) * FU[0] + (p[1] - FA[1]) * FU[1];
const acrossFord = (p: P2): number => (p[0] - FA[0]) * FN[0] + (p[1] - FA[1]) * FN[1];

/** The Wendwater's middle, from its head to its mouth, and how far along it each corner is. */
const WL = WENDWATER.line;
const WS: number[] = WL.map((_, i) => WL.slice(1, i + 1).reduce((s, p, j) => s + Math.hypot(p[0] - WL[j][0], p[1] - WL[j][1]), 0));
const W_LEN = WS[WS.length - 1];
/** Half the Wendwater's width, a share `t` of the way from its head to its mouth. */
const halfAt = (t: number): number => WENDWATER.half[0] + (WENDWATER.half[1] - WENDWATER.half[0]) * t;

/** A place on the Wendwater's middle, `s` along it from its head: where, the share of the way, and which way it runs there. */
function riverAt(s: number): { p: P2; t: number; dir: P2 } {
  const c = Math.min(W_LEN - 1e-6, Math.max(0, s));
  let i = 0;
  while (i + 2 < WL.length && WS[i + 1] < c) i++;
  const a = WL[i], b = WL[i + 1], l = WS[i + 1] - WS[i], f = (c - WS[i]) / l;
  return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], t: c / W_LEN, dir: [(b[0] - a[0]) / l, (b[1] - a[1]) / l] };
}

/** Where the river's middle reaches a distance across the ford's stretch of road (south of it is positive): the ford itself, and the stepping stones. */
function onRiver(across: number): { p: P2; t: number; dir: P2 } {
  for (let i = 0; i + 1 < WL.length; i++) {
    const a = acrossFord(WL[i]) - across, c = acrossFord(WL[i + 1]) - across;
    if (a === 0 || a > 0 !== c > 0) return riverAt(WS[i] + (WS[i + 1] - WS[i]) * (a / (a - c)));
  }
  return riverAt(0);
}

/** The meadow's outline as the plan has it, closed, and how far a place is from it. */
const MEADOW_RING: P2[] = [...MEADOW, MEADOW[0]];
const toMeadow = (x: number, z: number): number => (inMeadow(x, z) ? 0 : toLine(x, z, MEADOW_RING));

/** The meadow as it is laid: the plan's, kept off the road, with a little grass between, and back from the Wendwater's bank. */
function meadowShape(): P2[] {
  let shape = clipHalf(MEADOW, (p) => acrossFord(p) + LANE + 0.3);
  // west of each stretch of the Wendwater's west bank that runs by the meadow: those downstream of its first bend, which turn the meadow's way
  for (let i = 1; i + 1 < WL.length; i++) {
    const a = WL[i], c = WL[i + 1], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz), nx = dz / l, nz = -dx / l;
    const oa = halfAt(WS[i] / W_LEN) + 0.45, oc = halfAt(WS[i + 1] / W_LEN) + 0.45;
    const A: P2 = [a[0] + nx * oa, a[1] + nz * oa], C: P2 = [c[0] + nx * oc, c[1] + nz * oc], ex = C[0] - A[0], ez = C[1] - A[1];
    shape = clipHalf(shape, (p) => -((p[0] - A[0]) * ez - (p[1] - A[1]) * ex));
  }
  return shape;
}

/** An outline that bulges outwards everywhere, with a point every unit and a half, each moved inwards by a little more or less: a meadow's ragged edge. */
function ragged(shape: P2[], seed: number): P2[] {
  const cx = shape.reduce((s, p) => s + p[0], 0) / shape.length, cz = shape.reduce((s, p) => s + p[1], 0) / shape.length, out: P2[] = [];
  shape.forEach((p, i) => {
    const q = shape[(i + 1) % shape.length], dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz);
    if (l < 1e-6) return;
    let nx = -dz / l, nz = dx / l;
    if ((cx - (p[0] + q[0]) / 2) * nx + (cz - (p[1] + q[1]) / 2) * nz < 0) { nx = -nx; nz = -nz; }
    const n = Math.max(1, Math.round(l / 1.5));
    for (let j = 0; j < n; j++) {
      const x = p[0] + (dx * j) / n, z = p[1] + (dz * j) / n, inset = 0.18 + 0.32 * (0.5 + 0.5 * Math.sin(x * 0.93 + z * 0.61 + seed));
      out.push([x + nx * inset, z + nz * inset]);
    }
  });
  return out;
}

/** Where the ferry's stage stands on its lot: its two sides, its end out over the Rush, and how far it reaches onto the bank. */
function stageOf(l: Lot): { cx: number; x0: number; x1: number; end: number; inland: number } {
  const cx = (l.x0 + l.x1) / 2;
  return { cx, x0: cx - 2, x1: cx + 2, end: RUSH.south - 3, inland: RUSH.south + 1 };
}

/** The fold on its lot: its middle and its radius, and where the shepherd's notice stands by its gate, facing the view. */
function foldOf(l: Lot): { C: P2; R: number; T: number; notice: P2 } {
  const C: P2 = [l.x1 - 4.0, l.z0 + 3.4], R = 3.0, T = 0.55, out = R + T / 2 + 0.38;
  return { C, R, T, notice: [C[0] + out * VX, C[1] + out * VZ] };
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** A flat disc that faces down: under a tower's flared top, a cone's eaves, a willow's skirt, a bell's mouth. */
function downDisc(b: GeoBuilder, x: number, z: number, y: number, r: number, sides: number, color: number): void {
  const p = (i: number): V3 => {
    const a = Math.PI / sides + (i / sides) * TAU;
    return [x + Math.cos(a) * r, y, z + Math.sin(a) * r];
  };
  for (let i = 1; i + 1 < sides; i++) face3(b, p(0), p(i), p(i + 1), [0, -1, 0], color);
}

/** A pitched roof as `gable` builds it, and under each of its slopes a face that looks down, closing the eaves that are seen from low. */
function pitched(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, rise: number, roof: number, wall: number, along: 'x' | 'z', over = 0.25): void {
  gable(b, x0, z0, x1, z1, y, rise, roof, wall, along, over);
  const d = 0.05;
  if (along === 'x') {
    const zc = (z0 + z1) / 2, a = x0 - over, c = x1 + over, run = (z1 - z0) / 2 + over, len = Math.hypot(run, rise);
    b.quad([a, y - d, z0 - over], [c, y - d, z0 - over], [c, y + rise - d, zc], [a, y + rise - d, zc], [0, -run / len, rise / len], EAVES);
    b.quad([c, y - d, z1 + over], [a, y - d, z1 + over], [a, y + rise - d, zc], [c, y + rise - d, zc], [0, -run / len, -rise / len], EAVES);
  } else {
    const xc = (x0 + x1) / 2, a = z0 - over, c = z1 + over, run = (x1 - x0) / 2 + over, len = Math.hypot(run, rise);
    b.quad([x0 - over, y - d, a], [x0 - over, y - d, c], [xc, y + rise - d, c], [xc, y + rise - d, a], [rise / len, -run / len, 0], EAVES);
    b.quad([x1 + over, y - d, c], [x1 + over, y - d, a], [xc, y + rise - d, a], [xc, y + rise - d, c], [-rise / len, -run / len, 0], EAVES);
  }
}

/** A log between two points, `r` thick: six-sided, its bark round it and its cut ends pale. */
function log(b: GeoBuilder, a: V3, c: V3, r: number, bark: number, end: number): void {
  const t = unit(sub(c, a));
  let u = cross(t, [0, 1, 0]);
  if (Math.hypot(u[0], u[1], u[2]) < 1e-4) u = [1, 0, 0];
  u = unit(u);
  const v = cross(u, t);
  const ring = (p: V3): V3[] => Array.from({ length: 6 }, (_, i): V3 => add(p, add(mul(u, Math.cos((i / 6) * TAU) * r), mul(v, Math.sin((i / 6) * TAU) * r))));
  const A = ring(a), C = ring(c);
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6, m = ((i + 0.5) / 6) * TAU;
    b.quad(A[i], A[j], C[j], C[i], add(mul(u, Math.cos(m)), mul(v, Math.sin(m))), bark);
  }
  for (let i = 1; i < 5; i++) {
    face3(b, A[0], A[i], A[i + 1], mul(t, -1), end);
    face3(b, C[0], C[i], C[i + 1], t, end);
  }
}

/** Merlons round the edge of a level rectangle that stands at `y`, `h` high: none within `skip` of its corners, where turrets stand. */
function merlons(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, h: number, color: number, top: number, skip = 0): void {
  const d = 0.3;
  const run = (a0: number, a1: number, alongX: boolean, at: number): void => {
    const n = Math.max(2, Math.round((a1 - a0) / 1.2)), w = ((a1 - a0) / n) * 0.28;
    for (let i = 0; i < n; i++) {
      const m = a0 + ((i + 0.5) / n) * (a1 - a0);
      if (m - a0 < skip || a1 - m < skip) continue;
      if (alongX) b.box(m - w, y, at - d / 2, m + w, y + h, at + d / 2, color, { top });
      else b.box(at - d / 2, y, m - w, at + d / 2, y + h, m + w, color, { top });
    }
  };
  run(x0, x1, true, z0 + d / 2);
  run(x0, x1, true, z1 - d / 2);
  run(z0 + d, z1 - d, false, x0 + d / 2);
  run(z0 + d, z1 - d, false, x1 - d / 2);
}

/** A place on one side of a rectangle, a share `t` along it, and the way that side faces. */
function onSide(x0: number, z0: number, x1: number, z1: number, side: 'N' | 'E' | 'S' | 'W', t: number): [number, number, number, number] {
  if (side === 'N') return [x0 + (x1 - x0) * t, z0, 0, -1];
  if (side === 'S') return [x0 + (x1 - x0) * t, z1, 0, 1];
  if (side === 'E') return [x1, z0 + (z1 - z0) * t, 1, 0];
  return [x0, z0 + (z1 - z0) * t, -1, 0];
}

interface HutOpts {
  walls: number; rise: number; wall: number; roof: number; along: 'x' | 'z';
  door: 'N' | 'E' | 'S' | 'W'; at?: number;
  window?: 'N' | 'E' | 'S' | 'W'; winAt?: number;
  /** A chimney at one end of the ridge, and whether it smokes. */
  chimney?: boolean; smoke?: boolean;
}

/** A hut of one storey: walls, a pitched roof with its eaves closed, a door that glows by night, a small lit window, and a chimney. */
function hut(k: Build, x0: number, z0: number, x1: number, z1: number, o: HutOpts): void {
  const b = k.b;
  b.box(x0, 0, z0, x1, o.walls, z1, o.wall, { faces: 'NESW' });
  pitched(b, x0, z0, x1, z1, o.walls, o.rise, o.roof, o.wall, o.along);
  const [dx, dz, nx, nz] = onSide(x0, z0, x1, z1, o.door, o.at ?? 0.5);
  doorway(b, dx, 0, dz, nx, nz, 0.7, Math.min(1.45, o.walls - 0.2), 0.9, 0x2b231b);
  if (o.window) {
    const [wx, wz, wnx, wnz] = onSide(x0, z0, x1, z1, o.window, o.winAt ?? (o.window === o.door ? 0.2 : 0.5));
    doorway(b, wx, o.walls * 0.42, wz, wnx, wnz, 0.5, 0.45, 1.5, 0x3a2d20);
  }
  if (o.chimney) {
    const ridge = o.walls + o.rise, cx = o.along === 'x' ? x1 - 0.5 : (x0 + x1) / 2, cz = o.along === 'x' ? (z0 + z1) / 2 : z0 + 0.5;
    b.box(cx - 0.19, o.walls, cz - 0.19, cx + 0.19, ridge + 0.45, cz + 0.19, 0x857464, { top: 0x46403b });
    if (o.smoke) SMOKE.push({ x: cx, y: ridge + 0.7, z: cz, size: 0.5, shade: 0.84, every: 0.55 });
  }
}

/** A rowing boat, its bow along `yaw`: drawn up on land, dark inside with its thwarts, or upturned; or afloat, its keel at `y`. */
function boat(b: GeoBuilder, x: number, z: number, yaw: number, len: number, hull: number, upturned = false, y = 0, h = len * 0.12): void {
  const L = len / 2, W = len * 0.2, c = Math.cos(yaw), s = Math.sin(yaw);
  const plan: P2[] = [[L, 0], [L * 0.42, W], [-L * 0.55, W * 0.92], [-L, W * 0.5], [-L, -W * 0.5], [-L * 0.55, -W * 0.92], [L * 0.42, -W]];
  const at = ([u, v]: P2): XZ => [x + u * c - v * s, z + u * s + v * c];
  prism(b, plan.map(at), y + 0.02, y + h, hull, { top: upturned ? hull : 0x3b2e22 });
  if (upturned) {
    b.obox(x, y + h + 0.04, z, L * 0.92, 0.04, 0.06, yaw, TIMBER_DARK);
    return;
  }
  for (const f of [-0.2, 0.25]) b.obox(x + c * f * L, y + h + 0.03, z + s * f * L, 0.08, 0.03, W * 0.82, yaw, TIMBER);
}

/** A net hung to dry between two poles, sagging between them: seen from both sides. */
function net(b: GeoBuilder, a: P2, c: P2, h: number): void {
  for (const p of [a, c]) b.cyl(p[0], p[1], 0, h, 0.07, 0.06, 4, TIMBER_DARK, { cap: false });
  const dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = dz / l, nz = -dx / l, mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
  for (const s of [-1, 1]) {
    const o = s * 0.015, P = (x: number, y: number, z: number): V3 => [x + nx * o, y, z + nz * o], n: V3 = [nx * s, 0, nz * s];
    b.quad(P(a[0], h - 0.15, a[1]), P(mx, h - 0.4, mz), P(mx, 0.55, mz), P(a[0], 0.75, a[1]), n, 0x6c6a4c);
    b.quad(P(mx, h - 0.4, mz), P(c[0], h - 0.15, c[1]), P(c[0], 0.75, c[1]), P(mx, 0.55, mz), n, 0x6c6a4c);
  }
}

function barrel(b: GeoBuilder, x: number, z: number, y = 0): void {
  b.cyl(x, z, y, y + 0.78, 0.3, 0.3, 6, 0x7a5a3a, { cap: 0x5a4128 });
}
function sack(b: GeoBuilder, x: number, z: number, y = 0): void {
  b.cyl(x, z, y, y + 0.55, 0.27, 0.2, 6, 0xbaa37b, { cap: 0xa8915f });
}
function basket(b: GeoBuilder, x: number, z: number, y: number, goods: number): void {
  b.cyl(x, z, y, y + 0.4, 0.28, 0.34, 6, 0x9a7a4a, { cap: goods });
}
/** A bundle tied up in cloth. */
function bundle(b: GeoBuilder, x: number, z: number, y: number, yaw: number, cloth: number): void {
  b.obox(x, y + 0.2, z, 0.3, 0.2, 0.22, yaw, cloth, { top: cloth });
}

// ---------------------------------------------------------------------------
// Beasts, folk and plants
// ---------------------------------------------------------------------------

/** A sheep about (x, z), its head along `yaw`: grazing with its head down, standing with it up, or lying down. A lamb is 0.6 the size. */
function sheep(b: GeoBuilder, x: number, z: number, yaw: number, pose: 'graze' | 'stand' | 'lie', s = 1, y = 0): void {
  b.moved(x, y, z, yaw, () => {
    if (pose === 'lie') {
      b.box(-0.52 * s, 0, -0.34 * s, 0.4 * s, 0.5 * s, 0.34 * s, FLEECE, { top: FLEECE_TOP });
      b.box(0.34 * s, 0.3 * s, -0.12 * s, 0.64 * s, 0.6 * s, 0.12 * s, FACE);
      return;
    }
    b.box(-0.5 * s, 0.34 * s, -0.31 * s, 0.44 * s, 0.9 * s, 0.31 * s, FLEECE, { top: FLEECE_TOP, faces: 'NESWTB' });
    const hy = pose === 'graze' ? 0.1 : 0.68;
    b.box(0.4 * s, hy * s, -0.12 * s, 0.7 * s, (hy + 0.3) * s, 0.12 * s, FACE);
    // the legs, a pair to a box: from the side two legs show, and from the front a pair close together
    for (const lx of [-0.36, 0.3]) b.box((lx - 0.055) * s, 0, -0.22 * s, (lx + 0.055) * s, 0.36 * s, 0.22 * s, FACE, { faces: 'NESW' });
  });
}

/** A sheepdog sitting, black with a white chest and muzzle, looking along `yaw`. */
function dog(b: GeoBuilder, x: number, z: number, yaw: number, y = 0): void {
  const black = 0x1f1c1a, white = 0xebe5d6;
  b.moved(x, y, z, yaw, () => {
    b.box(-0.36, 0, -0.17, 0.02, 0.34, 0.17, black);
    b.box(-0.06, 0, -0.13, 0.2, 0.66, 0.13, black);
    b.box(0.2, 0.18, -0.09, 0.225, 0.6, 0.09, white, { faces: 'E' });
    b.box(-0.02, 0.62, -0.12, 0.28, 0.88, 0.12, black);
    b.box(0.28, 0.64, -0.07, 0.42, 0.77, 0.07, white);
    for (const s of [-1, 1]) b.box(0.0, 0.88, s * 0.1 - 0.035, 0.1, 0.98, s * 0.1 + 0.035, black, { faces: 'NESW' });
    b.beam([-0.36, 0.05, 0], [-0.62, 0.03, 0.12], 0.05, 0.04, black);
  });
}

/** A red deer, its head along `yaw`: grazing, or with its head up and watching; a stag carries antlers. */
function deer(b: GeoBuilder, x: number, z: number, yaw: number, o: { stag?: boolean; graze?: boolean; s?: number } = {}): void {
  const s = o.s ?? 1, S = (v: number): number => v * s;
  b.moved(x, 0, z, yaw, () => {
    b.box(S(-0.6), S(0.76), S(-0.2), S(0.58), S(1.2), S(0.2), DEER, { top: DEER_TOP, faces: 'NESWTB' });
    b.box(S(-0.64), S(0.88), S(-0.14), S(-0.6), S(1.16), S(0.14), RUMP, { faces: 'W' });
    for (const lx of [-0.46, 0.42]) b.box(S(lx - 0.05), 0, S(-0.17), S(lx + 0.05), S(0.78), S(0.17), DEER_LEG, { faces: 'NESW' });
    if (o.graze) {
      b.beam([S(0.45), S(1.05), 0], [S(0.86), S(0.42), 0], S(0.14), S(0.1), DEER);
      b.box(S(0.74), S(0.14), S(-0.1), S(1.08), S(0.42), S(0.1), DEER_TOP);
      return;
    }
    b.beam([S(0.42), S(1.05), 0], [S(0.7), S(1.66), 0], S(0.15), S(0.1), DEER);
    b.box(S(0.6), S(1.58), S(-0.11), S(1.0), S(1.86), S(0.11), DEER_TOP);
    for (const e of [-1, 1]) b.box(S(0.58), S(1.86), S(e * 0.13 - 0.04), S(0.66), S(2.02), S(e * 0.13 + 0.04), DEER, { faces: 'NESW' });
    if (!o.stag) return;
    for (const e of [-1, 1]) {
      b.beam([S(0.66), S(1.86), S(e * 0.07)], [S(0.42), S(2.75), S(e * 0.42)], S(0.04), S(0.025), ANTLER);
      b.beam([S(0.6), S(2.1), S(e * 0.17)], [S(0.86), S(2.42), S(e * 0.24)], S(0.03), S(0.02), ANTLER);
      b.beam([S(0.5), S(2.45), S(e * 0.3)], [S(0.66), S(2.8), S(e * 0.36)], S(0.03), S(0.02), ANTLER);
    }
  });
}

/** The shepherd, in his hood, his crook upright in his right hand, looking along `yaw`. */
function shepherd(b: GeoBuilder, x: number, z: number, yaw: number, y = 0): void {
  figure(b, x, z, y, SHEPHERD);
  const cx = x + Math.cos(yaw + 1.2) * 0.55, cz = z + Math.sin(yaw + 1.2) * 0.55, hx = Math.cos(yaw) * 0.2, hz = Math.sin(yaw) * 0.2;
  b.beam([cx, y, cz], [cx, y + 2.65, cz], 0.045, 0.04, CROOK);
  b.beam([cx, y + 2.65, cz], [cx + hx, y + 2.86, cz + hz], 0.04, 0.035, CROOK);
  b.beam([cx + hx, y + 2.86, cz + hz], [cx + hx * 1.9, y + 2.66, cz + hz * 1.9], 0.035, 0.03, CROOK);
}

/** A child: smaller than the tile's people, in a coat of some colour. */
function child(b: GeoBuilder, x: number, z: number, y: number, coat: number, hair: number): void {
  b.box(x - 0.2, y, z - 0.13, x + 0.2, y + 0.55, z + 0.13, 0x4a4038, { faces: 'NESW' });
  b.box(x - 0.25, y + 0.55, z - 0.16, x + 0.25, y + 1.22, z + 0.16, coat);
  b.box(x - 0.17, y + 1.24, z - 0.17, x + 0.17, y + 1.58, z + 0.17, 0xe8c4a0, { top: hair });
}

/** A man-at-arms with his spear. */
function guard(b: GeoBuilder, x: number, z: number, y = 0): void {
  figure(b, x, z, y, ARMS);
  b.beam([x + 0.5, y, z + 0.05], [x + 0.5, y + 3.2, z + 0.05], 0.05, 0.05, 0x9a8a72);
  b.cyl(x + 0.5, z + 0.05, y + 3.2, y + 3.6, 0.09, 0.01, 4, 0xc2c6cc);
}

/** A rock, `s` across at its foot, sunk a little: two bands of five faces, the top a shade lighter. */
function boulder(b: GeoBuilder, x: number, z: number, s: number, ph: number, wet = false, y = 0): void {
  b.cyl(x, z, y - 0.12, y + 0.42 * s, s, s * 0.66, 5, wet ? ROCK_WET : ROCK_GREY, { cap: false, phase: ph });
  b.cyl(x, z, y + 0.42 * s, y + 0.64 * s, s * 0.66, 0.05, 5, wet ? ROCK_WET_TOP : ROCK_GREY_TOP, { cap: false, phase: ph });
}

/** A clump of gorse in flower: a dark and thorny mound, its top a blaze of yellow. */
function gorse(b: GeoBuilder, x: number, z: number, s: number, ph: number): void {
  b.cyl(x, z, -0.02, 0.36 * s, 0.6 * s, 0.68 * s, 5, GORSE, { cap: false, phase: ph });
  b.cyl(x, z, 0.36 * s, 0.68 * s, 0.68 * s, 0.44 * s, 5, GORSE_MID, { cap: false, phase: ph });
  b.cyl(x, z, 0.68 * s, 0.86 * s, 0.44 * s, 0.06 * s, 5, GORSE_BLOOM, { cap: false, phase: ph });
}

/** A clump of reeds on a bank: blades seen from both sides, and a brown head on one of them. */
function reeds(b: GeoBuilder, x: number, z: number, r: () => number, y = 0): void {
  for (let i = 0; i < 4; i++) {
    const a = r() * TAU, d = 0.08 + r() * 0.22, bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d;
    const h = 0.75 + r() * 0.55, lx = (r() - 0.5) * 0.35, lz = (r() - 0.5) * 0.35, w = 0.07;
    const p0: V3 = [bx - RX * w, y, bz - RZ * w], p1: V3 = [bx + RX * w, y, bz + RZ * w], t: V3 = [bx + lx, y + h, bz + lz];
    const n = unit([VX, 0.2, VZ]);
    face3(b, p0, p1, t, n, REED);
    face3(b, p0, p1, t, [-n[0], n[1], -n[2]], REED);
    if (i === 0) b.beam([bx + lx * 0.74, y + h * 0.74, bz + lz * 0.74], [bx + lx * 0.96, y + h * 0.96, bz + lz * 0.96], 0.05, 0.045, REED_HEAD);
  }
}

/** A willow by the water, its crown a bell of leaves hanging nearly to the ground, closed underneath. */
function willow(b: GeoBuilder, x: number, z: number, s: number, ph: number): void {
  b.cyl(x, z, 0, 1.7 * s, 0.26 * s, 0.18 * s, 6, BARK, { cap: false });
  const rings: [number, number][] = [[1.05, 0.55], [1.58, 1.25], [1.76, 2.3], [1.5, 3.25], [0.95, 3.85], [0.05, 4.1]];
  for (let i = 0; i + 1 < rings.length; i++) {
    const [r0, y0] = rings[i], [r1, y1] = rings[i + 1];
    b.cyl(x, z, y0 * s, y1 * s, r0 * s, r1 * s, 8, WILLOW[i], { cap: false, phase: ph });
  }
  downDisc(b, x, z, 0.55 * s, 1.05 * s, 8, WILLOW_UNDER);
}

/** A lantern hung from a short arm on a post, lit at night: its light falls on the road. */
function lampPost(k: Build, x: number, z: number, dx: number, dz: number, h = 2.5): void {
  const b = k.b, lx = x + dx * 0.5, lz = z + dz * 0.5;
  b.box(x - 0.09, 0, z - 0.09, x + 0.09, h, z + 0.09, TIMBER_DARK);
  b.beam([x, h - 0.12, z], [x + dx * 0.58, h - 0.12, z + dz * 0.58], 0.045, 0.045, TIMBER_DARK);
  b.box(lx - 0.15, h - 0.82, lz - 0.15, lx + 0.15, h - 0.74, lz + 0.15, IRONWORK, { faces: 'NESWTB' });
  b.box(lx - 0.12, h - 0.3, lz - 0.12, lx + 0.12, h - 0.22, lz + 0.12, IRONWORK, { faces: 'NESWTB' });
  k.glows.push({ x: lx, y: h - 0.52, z: lz, sx: 0.22, sy: 0.4, sz: 0.22, color: '#ffe2ae' });
  k.lights.push({ x: lx, z: lz, r: 10, color: NIGHT, k: 0.5 });
}

// ---------------------------------------------------------------------------
// The shepherd's notice
// ---------------------------------------------------------------------------

const SERIF = "Georgia, 'Times New Roman', serif";

/** A sheep as a shepherd would draw one: a cloud of fleece with a black face and legs, facing left. */
function drawSheep(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  const ink = '#2a2420';
  ctx.fillStyle = ink;
  for (const lx of [-34, -16, 18, 36]) ctx.fillRect(cx + (lx - 5) * s, cy + 14 * s, 10 * s, 34 * s);
  const puffs: [number, number, number][] = [[-46, -2, 21], [-30, -19, 22], [-6, -25, 24], [19, -21, 23], [42, -8, 21], [46, 13, 19], [24, 22, 21], [-2, 25, 22], [-27, 21, 21], [-48, 13, 17]];
  for (const [x, y, r] of puffs) {
    ctx.beginPath();
    ctx.arc(cx + x * s, cy + y * s, (r + 3.5) * s, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  for (const [x, y, r] of puffs) {
    ctx.beginPath();
    ctx.arc(cx + x * s, cy + y * s, r * s, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(cx, cy, 50 * s, 30 * s, 0, 0, TAU);
  ctx.fill();
  // its head, an ear, and an eye
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(cx - 66 * s, cy - 8 * s, 14 * s, 21 * s, 0.55, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx - 53 * s, cy - 27 * s, 11 * s, 5 * s, -0.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx - 69 * s, cy - 14 * s, 3 * s, 0, TAU);
  ctx.fill();
}

/** The notice: a sheet nailed to a board, LOST: ONE SHEEP over a big white sheep, last seen leaving with a dragon, and a reward. */
function paintNotice(ctx: CanvasRenderingContext2D, _s: SignDef, w: number, h: number): void {
  // the board it is nailed to: weathered planks
  ctx.fillStyle = '#7a5434';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#4e3520';
  ctx.lineWidth = 3;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(0, (h * i) / 4);
    ctx.lineTo(w, (h * i) / 4);
    ctx.stroke();
  }
  // the sheet, a little crooked, its shadow, and its nails
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.014);
  const pw = w - 24, ph = h - 18;
  ctx.fillStyle = 'rgba(30, 18, 8, 0.45)';
  ctx.fillRect(-pw / 2 + 4, -ph / 2 + 5, pw, ph);
  ctx.fillStyle = '#f3ead2';
  ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
  ctx.fillStyle = '#4a4440';
  for (const nx of [-pw / 2 + 10, pw / 2 - 10]) {
    ctx.beginPath();
    ctx.arc(nx, -ph / 2 + 10, 4, 0, TAU);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // the heading, in red
  const head = 'LOST: ONE SHEEP';
  ctx.fillStyle = '#a3201a';
  const size = fit(ctx, head, SERIF, 52, pw - 36, 'bold');
  ctx.font = `bold ${size}px ${SERIF}`;
  ctx.fillText(head, 0, -ph / 2 + 36);
  // the sheep, big and white, and the words beside it
  drawSheep(ctx, -pw / 2 + 112, 8, 1.05);
  ctx.fillStyle = '#2a2420';
  ctx.font = `italic bold 27px ${SERIF}`;
  ['Last seen', 'leaving with', 'a dragon'].forEach((line, i) => ctx.fillText(line, pw / 2 - 98, -24 + i * 31));
  // the reward, along its foot
  ctx.font = `bold 26px ${SERIF}`;
  ctx.fillText('Reward. Ask at the fold.', 0, ph / 2 - 26);
  ctx.restore();
}

const NOTICE: SignDef = {
  id: SIGN.notice,
  lines: ['LOST: ONE SHEEP', 'Last seen leaving with a dragon', 'Reward. Ask at the fold.'],
  color: '#f3ead2', ink: '#2a2420', aspect: 1.6, kind: 'board', size: [416, 260], paint: paintNotice,
};

// ---------------------------------------------------------------------------
// The ferry's landing
// ---------------------------------------------------------------------------

/**
 * The south landing of the ferry over the Rush: a timber stage on posts from
 * the bank out over the water, its deck level with the bank, a mooring post
 * at each corner of its end and a lantern on a pole; the ferryman's hut on the
 * bank with a bench; a bell on a post to call the ferry over from the city's
 * side; a path of beaten earth to the ring where the road ends; and folk
 * waiting with their bundles and baskets. The ferry itself, and its crossing,
 * are the ships' builder's: the water off the stage's end and to its
 * north-east is left clear for it.
 */
function ferryLanding(k: Build, l: Lot): void {
  const b = k.b, { cx, x0, x1, end, inland } = stageOf(l), bank = RUSH.south, DY = 0.1;
  // the deck: its frame, open below, and its planks across it in two shades
  b.box(x0, -0.2, end, x1, DY, inland, TIMBER_DARK, { faces: 'NESWB' });
  const n = Math.round((inland - end) / 0.42);
  for (let i = 0; i < n; i++) {
    const za = end + ((inland - end) * i) / n, zb = end + ((inland - end) * (i + 1)) / n;
    b.quad([x0, DY, zb], [x1, DY, zb], [x1, DY, za], [x0, DY, za], [0, 1, 0], i % 2 ? PLANK : PLANK_LIGHT);
  }
  // timbers along its sides; the posts it stands on; and at the corners of its end, posts to moor to
  for (const [xa, xb] of [[x0, x0 + 0.18], [x1 - 0.18, x1]]) b.box(xa, DY, end + 0.32, xb, DY + 0.16, inland, TIMBER_DARK, { faces: 'NESWT' });
  for (const px of [x0 + 0.14, cx, x1 - 0.14]) {
    for (const pz of [end + 0.14, (end + bank) / 2]) {
      const corner = pz === end + 0.14 && px !== cx;
      b.box(px - 0.13, -1.6, pz - 0.13, px + 0.13, corner ? DY + 0.72 : -0.2, pz + 0.13, TIMBER_DARK, { faces: corner ? 'NESWT' : 'NESW', top: 0x2e241b });
    }
  }
  lantern(k, x0 + 0.36, end + 0.75, DY, 2.6, TIMBER_DARK);

  // the ferryman's hut on the bank, west of the stage, its door on the path; a lamp by the door, and a bench along its south wall
  const hx0 = l.x0 + 0.25, hx1 = Math.min(x0 - 0.55, hx0 + 2.4), hz0 = l.z0 + 0.2, hz1 = hz0 + 2.5;
  hut(k, hx0, hz0, hx1, hz1, { walls: 1.9, rise: 1.0, wall: PLANK, roof: ROOF.shingle, along: 'z', door: 'E', at: 0.62, window: 'S' });
  for (const [px, pz] of [[hx0, hz0], [hx1, hz0], [hx1, hz1], [hx0, hz1]]) b.box(px - 0.08, 0, pz - 0.08, px + 0.08, 1.9, pz + 0.08, TIMBER_DARK, { faces: 'NESW' });
  b.box(hx1 + 0.02, 1.62, hz0 + 0.95, hx1 + 0.3, 1.68, hz0 + 1.05, IRONWORK, { faces: 'NESWTB' });
  k.glows.push({ x: hx1 + 0.24, y: 1.48, z: hz0 + 1.0, sx: 0.18, sy: 0.24, sz: 0.18, color: '#ffd28a' });
  b.box(hx0 + 0.2, 0.42, hz1 + 0.08, hx1 - 0.2, 0.5, hz1 + 0.44, PLANK_LIGHT, { faces: 'NESWTB' });
  for (const sx of [hx0 + 0.35, hx1 - 0.35]) b.box(sx - 0.05, 0, hz1 + 0.16, sx + 0.05, 0.42, hz1 + 0.36, TIMBER_DARK, { faces: 'NESW' });
  basket(b, hx1 - 0.6, hz1 + 0.26, 0.5, 0x9fbf5a);

  // the bell, on a post at the head of the stage, hung from an arm, with its rope
  const bx = x1 + 0.6, bz = inland + 0.5, hx = bx - 0.55;
  b.box(bx - 0.1, 0, bz - 0.1, bx + 0.1, 2.75, bz + 0.1, TIMBER_DARK);
  b.beam([bx, 2.6, bz], [bx - 0.64, 2.6, bz], 0.05, 0.05, TIMBER_DARK);
  b.beam([hx, 2.58, bz], [hx, 2.38, bz], 0.025, 0.025, IRONWORK);
  b.cyl(hx, bz, 1.98, 2.12, 0.25, 0.21, 7, BRONZE, { cap: false });
  b.cyl(hx, bz, 2.12, 2.32, 0.21, 0.13, 7, BRONZE, { cap: false });
  b.cyl(hx, bz, 2.32, 2.4, 0.13, 0.03, 7, BRONZE, { cap: false });
  downDisc(b, hx, bz, 1.98, 0.25, 7, DARK);
  b.beam([hx, 1.98, bz], [hx + 0.05, 1.05, bz + 0.05], 0.02, 0.02, 0xc9b98f);

  // the path of beaten earth from the stage to the ring, which keeps its distance from the ring's paving
  const ring = TURNS.ferry, R = 6.6, xa = x1 + 0.6, xb = x0 - 0.6, arc: P2[] = [];
  for (let i = 0; i <= 6; i++) {
    const x = xa + ((xb - xa) * i) / 6;
    arc.push([x, ring.c[1] - Math.sqrt(Math.max(0, R * R - (x - ring.c[0]) ** 2))]);
  }
  area(k, [[x0 + 0.2, bank + 0.8], [x1 - 0.2, bank + 0.8], [xa, l.z1 - 0.6], ...arc, [xb, l.z1 - 0.6]], EARTH, 0.04);

  // folk waiting for the ferry: on the stage with a bundle and a basket, by the bell, at the bench
  k.person(cx + 0.9, end + 1.0, DY);
  k.person(cx - 0.7, end + 1.75, DY);
  bundle(b, cx - 1.3, end + 1.3, DY, 0.4, 0x8a3a2a);
  basket(b, cx + 1.45, end + 0.85, DY, 0xd9b84a);
  k.person(x1 + 1.35, inland + 1.55);
  sack(b, x1 + 1.95, inland + 0.95);
  sack(b, x1 + 2.3, inland + 1.35);
  k.person(hx0 + 1.1, hz1 + 1.15);

  // its name, and the light that falls on the ring where the road ends
  nameBoard(k, SIGN.ferry, l.x1 - 1.0, l.z1 - 0.8, 0, TO_VIEW, 1.0);
  k.lights.push({ x: cx + 0.6, z: l.z1 + 1.2, r: 9, color: NIGHT, k: 0.45 }, { x: hx1 + 0.6, z: hz0 + 1.0, r: 6, color: NIGHT, k: 0.35 });
}

// ---------------------------------------------------------------------------
// The sheepfold, the meadow and the flock
// ---------------------------------------------------------------------------

/**
 * The sheepfold by the meadow: a round fold of dry stone, its wall lower than
 * a man and open to the sky, so that a dragon can come down over it; a gate of
 * hurdles standing open in its south side; a trough and hay inside with ewes
 * and lambs; the shepherd's stone hut beside it, thatched, its fire smoking;
 * the shepherd with his crook and his dog at the gate; and on the fold's wall
 * beside the gate, facing the view, the shepherd's notice: LOST: ONE SHEEP.
 */
function sheepfold(k: Build, l: Lot): void {
  const b = k.b, { C, R, T, notice } = foldOf(l), H = 1.0, ro = R + T / 2, ri = R - T / 2;
  const gate = (95 * Math.PI) / 180, gap = (15 * Math.PI) / 180, a0 = gate + gap, a1 = gate - gap + TAU, N = 16;
  const pt = (a: number, rr: number, y: number): V3 => [C[0] + Math.cos(a) * rr, y, C[1] + Math.sin(a) * rr];
  for (let i = 0; i < N; i++) {
    const ta = a0 + ((a1 - a0) * i) / N, tb = a0 + ((a1 - a0) * (i + 1)) / N, tm = (ta + tb) / 2;
    const out: V3 = [Math.cos(tm), 0, Math.sin(tm)], inn: V3 = [-Math.cos(tm), 0, -Math.sin(tm)];
    // its outer face in two courses of stones, its inner face, and its top
    b.quad(pt(ta, ro, 0), pt(tb, ro, 0), pt(tb, ro, 0.5), pt(ta, ro, 0.5), out, DRY[i % 3]);
    b.quad(pt(ta, ro, 0.5), pt(tb, ro, 0.5), pt(tb, ro, H), pt(ta, ro, H), out, DRY[(i + 2) % 3]);
    b.quad(pt(tb, ri, 0), pt(ta, ri, 0), pt(ta, ri, H), pt(tb, ri, H), inn, DRY[(i + 1) % 3]);
    b.quad(pt(ta, ri, H), pt(tb, ri, H), pt(tb, ro, H), pt(ta, ro, H), [0, 1, 0], DRY_TOP);
    // the coping, stones on edge along its top, high and low by turns
    const c0 = pt(ta, R, 0), c1 = pt(tb, R, 0), len = Math.hypot(c1[0] - c0[0], c1[2] - c0[2]), ch = i % 2 ? 0.16 : 0.21;
    b.obox((c0[0] + c1[0]) / 2, H + ch / 2, (c0[2] + c1[2]) / 2, len / 2 + 0.03, ch / 2, T / 2 - 0.05, Math.atan2(c1[2] - c0[2], c1[0] - c0[0]), DRY[(i + 1) % 3], { top: DRY_TOP });
  }
  // a stone pillar at each side of the gate
  for (const a of [a0, a1]) {
    const p = pt(a, R, 0);
    b.obox(p[0], 0.68, p[2], 0.32, 0.68, 0.36, a + Math.PI / 2, DRY[1], { top: DRY_TOP });
  }
  // the gate, a hurdle hung from the west pillar, swung open outwards
  {
    const ux = Math.cos(a0), uz = Math.sin(a0), hx = C[0] + ux * (R + 0.36) + uz * 0.3, hz = C[1] + uz * (R + 0.36) - ux * 0.3;
    const G = (u: number, y: number): V3 => [hx + ux * u, y, hz + uz * u];
    for (const u of [0.04, 1.0]) b.beam(G(u, 0.05), G(u, 1.05), 0.045, 0.045, HURDLE);
    for (const y of [0.25, 0.55, 0.85]) b.beam(G(0.04, y), G(1.0, y), 0.035, 0.035, HURDLE);
    b.beam(G(0.04, 0.2), G(1.0, 0.9), 0.03, 0.03, HURDLE);
  }
  // inside: straw underfoot, a stone trough by the north wall, a heap of hay, and two lambs (a ewe lies there too: see the flock)
  flat(b, oval(C[0], C[1], ri - 0.02, ri - 0.02, 16), 0.05, STRAW);
  const tz = C[1] - ri + 0.48;
  b.box(C[0] - 0.8, 0.05, tz - 0.22, C[0] + 0.8, 0.42, tz + 0.22, DRY[0], { top: 0x46606a });
  b.cyl(C[0] - 1.5, C[1] + 0.2, 0.05, 0.55, 0.55, 0.15, 7, 0xd8c070, { cap: 0xc9b060 });
  sheep(b, C[0] + 0.9, C[1] + 1.2, 2.2, 'stand', 0.6, 0.05);
  sheep(b, C[0] - 0.9, C[1] + 1.6, 0.4, 'graze', 0.6, 0.05);

  // the shepherd's hut: dry stone, thatched, its door to the view, its fire smoking
  const hx0 = l.x0 + 0.2, hx1 = hx0 + 2.1, hz0 = l.z0 + 0.3, hz1 = hz0 + 2.6;
  hut(k, hx0, hz0, hx1, hz1, { walls: 1.7, rise: 1.2, wall: DRY[0], roof: ROOF.thatch, along: 'z', door: 'S', window: 'E', chimney: true, smoke: true });

  // the notice, on two posts against the fold's wall beside the gate, read from the view
  const w = k.sign(SIGN.notice, notice[0], 1.7, notice[1], VX, VZ, 1.5, 2.4);
  for (const s of [-1, 1]) {
    const px = notice[0] + RX * s * (w / 2 + 0.1) - VX * 0.13, pz = notice[1] + RZ * s * (w / 2 + 0.1) - VZ * 0.13;
    b.box(px - 0.08, 0, pz - 0.08, px + 0.08, 2.5, pz + 0.08, TIMBER_DARK);
  }
  b.obox(notice[0] - VX * 0.07, 1.7, notice[1] - VZ * 0.07, w / 2 + 0.1, 0.84, 0.04, Math.atan2(RZ, RX), TIMBER_DARK, { faces: 'B' });

  // the shepherd and his dog, outside the gate
  const sa = gate + 0.52, sx = C[0] + Math.cos(sa) * 3.95, sz = C[1] + Math.sin(sa) * 3.95;
  shepherd(b, sx, sz, Math.atan2(VZ, VX));
  dog(b, sx + 0.75, sz + 0.42, 0.9);
  k.lights.push({ x: C[0] - 1.2, z: C[1] + 3.6, r: 7, color: NIGHT, k: 0.35 });
}

/** The meadow by the Wendwater, open grass between the wood, the Rush and the road, and the flock grazing it: none where the dragon takes his sheep. */
function meadow(k: Build): void {
  const b = k.b, r = rng(5507);
  area(k, ragged(meadowShape(), 1.3), MEADOW_GRASS, 0.035);
  const lying = new Set([2, 5, 8, 11]);
  const yaws: number[] = [];
  for (let i = 1; i < FLOCK.length; i++) {
    const [x, z] = FLOCK[i];
    // the one that strays to the road's edge grazes along it
    const edge = toRoad(x, z) < LANE + 1;
    const yaw = edge ? (r() < 0.5 ? 0 : Math.PI) + (r() - 0.5) * 0.3 : r() * TAU;
    yaws[i] = yaw;
    sheep(b, x, z, yaw, lying.has(i) && !edge ? 'lie' : i % 3 === 0 ? 'stand' : 'graze');
    TAKEN.push({ x, z, r: 0.8 });
  }
  // lambs at their mothers' sides
  for (const i of [4, 6, 9]) {
    const [x, z] = FLOCK[i], a = yaws[i] + Math.PI / 2, lx = x + Math.cos(a) * 0.72, lz = z + Math.sin(a) * 0.72;
    if (toRoad(lx, lz) > LANE + 1.3 && Math.hypot(lx - FLOCK[0][0], lz - FLOCK[0][1]) > 3.2) sheep(b, lx, lz, yaws[i] + 0.3, 'stand', 0.6);
  }
}

// ---------------------------------------------------------------------------
// The ford, and the Wendwater's banks
// ---------------------------------------------------------------------------

/**
 * The ford: where the south road crosses the Wendwater, a low causeway of big
 * flat stones under the road, level with the banks and as wide as the road and
 * a little more, with the river running through three low dark culverts under
 * it; and a line of stepping stones a little upstream, with a child hopping
 * across. roads.ts lays the road's surface over it.
 */
function ford(k: Build): void {
  const b = k.b, HALF = LANE + 0.5;
  const top = clipHalf(clipHalf(wendwater(), (p) => acrossFord(p) - HALF), (p) => -acrossFord(p) - HALF);
  if (top.length < 3) return;
  // its top: the middle, under the road, and the slabs that show either side of the road
  const middle = clipHalf(clipHalf(top, (p) => acrossFord(p) - LANE), (p) => -acrossFord(p) - LANE);
  if (middle.length >= 3) flat(b, middle, 0, SLABS[0]);
  for (const s of [1, -1]) {
    const strip = clipHalf(top, (p) => LANE - s * acrossFord(p));
    if (strip.length < 3) continue;
    const al = strip.map(alongFord), lo = Math.min(...al), hi = Math.max(...al);
    for (let a = lo, i = 0; a < hi - 1e-3; a += 0.85, i++) {
      const piece = clipHalf(clipHalf(strip, (p) => a - alongFord(p)), (p) => alongFord(p) - a - 0.85);
      if (piece.length >= 3) flat(b, piece, 0, SLABS[(i + (s > 0 ? 1 : 0)) % 2]);
    }
  }
  // its faces where the river runs in and out: big stones, and three culverts in each
  for (let i = 0; i < top.length; i++) {
    const p = top[i], q = top[(i + 1) % top.length];
    for (const s of [1, -1]) {
      if (Math.abs(acrossFord(p) - s * HALF) > 1e-3 || Math.abs(acrossFord(q) - s * HALF) > 1e-3) continue;
      const n: V3 = [FN[0] * s, 0, FN[1] * s], L = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (L < 0.5) continue;
      const at = (t: number, y: number): V3 => [p[0] + (q[0] - p[0]) * t, y, p[1] + (q[1] - p[1]) * t];
      const cw = Math.min(0.42, L * 0.14) / L;
      let t0 = 0;
      [0.27, 0.5, 0.73].forEach((c, j) => {
        b.quad(at(t0, -1.3), at(c - cw / 2, -1.3), at(c - cw / 2, 0), at(t0, 0), n, SLABS[(j + 1) % 3]);
        b.quad(at(c - cw / 2, -1.3), at(c + cw / 2, -1.3), at(c + cw / 2, -0.66), at(c - cw / 2, -0.66), n, SLABS[2]);
        b.quad(at(c - cw / 2, -0.66), at(c + cw / 2, -0.66), at(c + cw / 2, -0.2), at(c - cw / 2, -0.2), n, DARK);
        b.quad(at(c - cw / 2, -0.2), at(c + cw / 2, -0.2), at(c + cw / 2, 0), at(c - cw / 2, 0), n, SLABS[1]);
        t0 = c + cw / 2;
      });
      b.quad(at(t0, -1.3), at(1, -1.3), at(1, 0), at(t0, 0), n, SLABS[0]);
    }
  }

  // the stepping stones, a little upstream, beyond the road's verge: one on each bank and two in the stream, and a child on one of them
  const st = onRiver(LANE + 2.2), half = halfAt(st.t), ax = st.dir[1], az = -st.dir[0];
  [-(half + 0.4), -0.42, 0.42, half + 0.4].forEach((o, i) => {
    const x = st.p[0] + ax * o, z = st.p[1] + az * o;
    if (Math.abs(o) > half) b.cyl(x, z, -0.1, 0.07, 0.34, 0.3, 6, SLABS[1], { cap: SLABS[0], phase: i * 0.7 });
    else b.cyl(x, z, -1.0, -0.32, 0.26, 0.22, 6, ROCK_WET, { cap: ROCK_WET_TOP, phase: i * 0.7 });
  });
  child(b, st.p[0] + ax * 0.42, st.p[1] + az * 0.42, -0.32, 0xd94f4f, 0x6b4a2a);

  // a lantern on the east bank north of the road, whose light falls on the ford
  const F = onRiver(0).p;
  const lp: P2 = [F[0] + FU[0] * 8.6 - FN[0] * (LANE + 1.4), F[1] + FU[1] * 8.6 - FN[1] * (LANE + 1.4)];
  if (toRoad(lp[0], lp[1]) >= LANE + 1 && !inMeadow(lp[0], lp[1]) && toLine(lp[0], lp[1], WL) > 1.9) {
    lampPost(k, lp[0], lp[1], FN[0], FN[1]);
    TAKEN.push({ x: lp[0], z: lp[1], r: 0.8 });
  }
}

/** Reeds along the Wendwater's banks, at its mouth and along the Rush by the meadow, and two willows by its water. None in the meadow, by the road, or near the sheep the dragon takes. */
function riverside(k: Build): void {
  const b = k.b, r = rng(6211);
  const ok = (x: number, z: number): boolean =>
    toRoad(x, z) > LANE + 1.3 && !inMeadow(x, z) && Math.hypot(x - FLOCK[0][0], z - FLOCK[0][1]) > 3.6 && z > RUSH.south + 0.4 && x < SHORE.wood - 0.3 && free(x, z, 0.45);
  // the two willows first, so that the reeds keep clear of them
  const willows: [number, number, number][] = [[-6.6, 94.3, 0.95], [-29.2, 109.7, 0.9]];
  willows.forEach(([x, z, s], i) => {
    if (toRoad(x, z) < LANE + 1 + 1.76 * s || toLine(x, z, WL) < 1.7) return;
    willow(b, x, z, s, i * 0.6);
    TAKEN.push({ x, z, r: 1.8 * s });
  });
  for (let s = 0.8; s < W_LEN - 0.2; s += 1.55) {
    const { p, t, dir } = riverAt(s), half = halfAt(t);
    for (const side of [1, -1]) {
      if (r() > 0.6) continue;
      const o = (half + 0.42 + r() * 0.25) * side, x = p[0] + dir[1] * o, z = p[1] - dir[0] * o;
      if (!ok(x, z)) continue;
      reeds(b, x, z, r);
      TAKEN.push({ x, z, r: 0.5 });
    }
  }
  // at its mouth, between its end and the bay
  {
    const { p, dir } = riverAt(W_LEN);
    for (const [f, o] of [[0.7, 0.9], [1.2, -0.6], [0.4, -1.9], [0.9, 1.9]]) {
      const x = p[0] + dir[0] * f + dir[1] * o, z = p[1] + dir[1] * f - dir[0] * o;
      if (ok(x, z) && toLine(x, z, WL) > halfAt(1) + 0.2) reeds(b, x, z, r);
    }
  }
  // along the Rush's bank by the meadow
  for (let x = -47; x < -14; x += 3.6 + r() * 2.2) {
    const z = RUSH.south + 0.55 + r() * 0.35;
    if (ok(x, z)) reeds(b, x, z, r);
  }
}

// ---------------------------------------------------------------------------
// The kingswood
// ---------------------------------------------------------------------------

interface Glade { x: number; z: number; r: number }

/** The scenes in the wood, each in a glade of its own: where, and how far round it no tree stands. */
const GLADES: Record<string, Glade> = {
  forester: { x: -58.9, z: 92.0, r: 3.6 },
  charcoal: { x: -87.0, z: 103.6, r: 3.5 },
  deerA: { x: -93.6, z: 94.2, r: 3.4 },
  deerB: { x: -79.6, z: 108.8, r: 3.0 },
  woodcutter: { x: -40.4, z: 109.4, r: 3.4 },
};

/** The forester's hut on the road through the wood: walls of logs, a shingled roof, a stone chimney smoking, antlers over the door, a woodpile, the forester at his door and his hound. */
function forester(k: Build, g: Glade): void {
  const b = k.b, x0 = g.x - 1.7, x1 = g.x + 1.5, z0 = g.z - 2.2, z1 = g.z + 0.4, at = 0.38;
  area(k, rect(x0 - 0.6, z1 - 0.2, x1 + 1.4, z1 + 1.9), EARTH, 0.04);
  hut(k, x0, z0, x1, z1, { walls: 2.0, rise: 1.3, wall: 0x6e5640, roof: ROOF.shingle, along: 'x', door: 'S', at, window: 'E', winAt: 0.78 });
  // the courses of its logs, on the sides the view sees
  for (let y = 0.3; y < 1.95; y += 0.36) {
    b.quad([x0, y, z1 + 0.015], [x1, y, z1 + 0.015], [x1, y + 0.05, z1 + 0.015], [x0, y + 0.05, z1 + 0.015], [0, 0, 1], 0x4c3a2a);
    b.quad([x1 + 0.015, y, z1], [x1 + 0.015, y, z0], [x1 + 0.015, y + 0.05, z0], [x1 + 0.015, y + 0.05, z1], [1, 0, 0], 0x4c3a2a);
  }
  // its stone chimney at the west end, smoking
  const cz = (z0 + z1) / 2, ridge = 2.0 + 1.3;
  b.box(x0 - 0.42, 0, cz - 0.34, x0 + 0.05, ridge + 0.5, cz + 0.34, 0x8b8579, { top: 0x46403b });
  SMOKE.push({ x: x0 - 0.18, y: ridge + 0.75, z: cz, size: 0.55, shade: 0.84, every: 0.5 });
  // antlers over the door
  const dx = x0 + (x1 - x0) * at, ay = 1.72, az = z1 + 0.06;
  for (const s of [-1, 1]) {
    b.beam([dx + s * 0.06, ay, az], [dx + s * 0.42, ay + 0.48, az + 0.05], 0.035, 0.022, ANTLER);
    b.beam([dx + s * 0.22, ay + 0.24, az + 0.02], [dx + s * 0.2, ay + 0.52, az + 0.06], 0.025, 0.018, ANTLER);
  }
  // a woodpile against the east wall, and the chopping block in the yard with its axe in it
  b.box(x1 + 0.08, 0, z0 + 0.15, x1 + 0.72, 1.05, z0 + 1.1, BARK, { faces: 'NSWT', top: 0x7d5f43 });
  b.quad([x1 + 0.72, 0, z0 + 1.1], [x1 + 0.72, 0, z0 + 0.15], [x1 + 0.72, 1.05, z0 + 0.15], [x1 + 0.72, 1.05, z0 + 1.1], [1, 0, 0], CUT);
  b.cyl(x1 + 0.6, z1 + 1.0, 0, 0.5, 0.3, 0.28, 7, BARK, { cap: CUT });
  b.beam([x1 + 0.6, 0.5, z1 + 1.0], [x1 + 0.85, 1.05, z1 + 1.12], 0.03, 0.03, CROOK);
  // the forester at his door, and his hound
  figure(b, dx + 0.9, z1 + 0.85, 0, FORESTER);
  dog(b, dx + 1.7, z1 + 1.2, 1.4);
  k.lights.push({ x: g.x, z: z1 + 1.3, r: 8, color: NIGHT, k: 0.45 });
}

/** A charcoal burner's hearth: the mound of turf over its stacked wood, sooty, smoking and glowing at its foot by night; the burner with his rake, his shelter of poles and bark, and billets for the next burn. */
function charcoal(k: Build, g: Glade): void {
  const b = k.b, x = g.x - 0.4, z = g.z - 0.2, R = 1.75;
  area(k, oval(g.x, g.z, g.r * 0.9, g.r * 0.75, 14), ASHES, 0.04);
  const rings: [number, number][] = [[R, 0], [R * 0.93, 0.48], [R * 0.72, 0.98], [R * 0.4, 1.34], [0.06, 1.46]];
  const tones = [0x5e4a36, 0x4f3f30, 0x3a332e, 0x2e2a28];
  for (let i = 0; i + 1 < rings.length; i++) b.cyl(x, z, rings[i][1], rings[i + 1][1], rings[i][0], rings[i + 1][0], 9, tones[i], { cap: false });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.3;
    k.glows.push({ x: x + Math.cos(a) * R * 0.97, y: 0.2, z: z + Math.sin(a) * R * 0.97, sx: 0.2, sy: 0.12, sz: 0.2, color: '#ff7a3a' });
  }
  k.lights.push({ x, z, r: 7, color: '#ff9a5a', k: 0.5 });
  SMOKE.push({ x, y: 1.5, z, size: 0.9, shade: 0.7, every: 0.3 }, { x: x + 0.8, y: 1.05, z: z + 0.5, size: 0.55, shade: 0.76, every: 0.6 });
  // the burner, with his long rake
  const px = x + 2.3, pz = z + 1.1;
  figure(b, px, pz, 0, COLLIER);
  b.beam([px - 0.7, 0.04, pz - 0.55], [px + 0.25, 2.2, pz + 0.12], 0.035, 0.035, CROOK);
  b.beam([px - 0.8, 0.04, pz - 0.38], [px - 0.6, 0.04, pz - 0.72], 0.04, 0.03, CROOK);
  // his shelter of poles and bark, and billets stacked for the next burn
  const sx = x - 2.7, sz = z + 1.3;
  for (const dz of [-0.75, 0.75]) b.beam([sx + 0.5, 0, sz + dz], [sx + 0.5, 1.55, sz + dz], 0.05, 0.05, BARK);
  slab(b, [sx + 0.58, 1.6, sz], [sx - 0.62, 0.05, sz], 0.9, 0.08, 0x6d5642, { under: EAVES });
  b.box(x + 1.4, 0, z - 2.3, x + 2.7, 0.7, z - 1.6, BARK, { top: CUT });
  TAKEN.push({ x: sx, z: sz, r: 1.3 }, { x: x + 2.05, z: z - 1.95, r: 0.9 });
}

/** A woodcutter at work in a clearing by the road: the oak he felled and its stump, his block with a log on it, his axe up, split wood about him and his stack of cordwood. */
function woodcutter(k: Build, g: Glade): void {
  const b = k.b;
  area(k, oval(g.x, g.z + 0.3, g.r, g.r * 0.62, 14), CHIPS, 0.04);
  log(b, [g.x - 3.0, 0.36, g.z + 1.2], [g.x + 1.3, 0.32, g.z + 1.6], 0.34, BARK, CUT);
  b.cyl(g.x - 3.3, g.z + 0.7, 0, 0.5, 0.46, 0.4, 7, BARK, { cap: CUT });
  const bx = g.x + 0.9, bz = g.z - 0.5;
  b.cyl(bx, bz, 0, 0.55, 0.32, 0.3, 7, BARK, { cap: CUT });
  b.cyl(bx, bz, 0.55, 0.95, 0.15, 0.15, 6, BARK, { cap: CUT });
  const wx = bx - 0.85, wz = bz;
  figure(b, wx, wz, 0, WOODCUTTER);
  b.beam([wx + 0.15, 1.9, wz], [wx + 0.32, 3.05, wz], 0.04, 0.035, CROOK);
  b.box(wx + 0.28, 2.85, wz - 0.03, wx + 0.58, 3.12, wz + 0.03, 0xb8bcc2, { faces: 'NESWTB' });
  for (const [dx, dz, a] of [[0.55, 0.45, 0.4], [1.3, -0.1, 1.9], [0.9, 0.55, 2.8]]) b.obox(bx + dx, 0.1, bz + dz, 0.22, 0.09, 0.09, a, CUT);
  const sx0 = g.x + 1.8, sz0 = g.z - 0.9;
  b.box(sx0, 0, sz0, sx0 + 2.2, 1.0, sz0 + 0.8, BARK, { faces: 'NST', top: 0x7d5f43 });
  for (const s of [0, 1]) {
    const x = sx0 + s * 2.2;
    b.quad([x, 0, sz0], [x, 0, sz0 + 0.8], [x, 1.0, sz0 + 0.8], [x, 1.0, sz0], [s ? 1 : -1, 0, 0], CUT);
  }
  TAKEN.push({ x: sx0 + 1.4, z: sz0 + 0.4, r: 1.4 }, { x: g.x - 3.3, z: g.z + 0.7, r: 0.7 });
}

/** Deer in a glade of their own. */
function deerGlade(k: Build, g: Glade, herd: { dx: number; dz: number; yaw: number; stag?: boolean; graze?: boolean; s?: number }[]): void {
  area(k, oval(g.x, g.z, g.r * 0.95, g.r * 0.8, 14), GLADE, 0.04);
  for (const d of herd) deer(k.b, g.x + d.dx, g.z + d.dz, d.yaw, d);
}

/** How thick the wood stands: thick in the west and towards the south edge, thinning towards the meadow and the shore. */
function thickness(x: number, z: number): number {
  const west = smooth(-35, -75, x), south = smooth(99, 108, z);
  let p = 0.62 + 0.36 * Math.max(west, south);
  p *= 0.4 + 0.6 * smooth(0.5, 8, toMeadow(x, z));
  p *= 0.45 + 0.55 * smooth(1, 6, z - RUSH.south);
  return p;
}
/** How many of its trees are pines: more in the west and towards the south edge. */
const pineShare = (x: number, z: number): number => 0.36 + 0.24 * smooth(-50, -95, x) + 0.22 * smooth(105, 111, z);

/** How far a place is from the middle of the south road, counting each ring at its ends as road out to its paving's edge and four beyond. */
function fromRoad(x: number, z: number): number {
  let d = toLine(x, z, ROADS.south);
  for (const t of [TURNS.ferry, TURNS.sharpPoint]) d = Math.min(d, Math.hypot(x - t.c[0], z - t.c[1]) - t.r - (LANE + 1.2) / 2 + LANE);
  return d;
}

/**
 * How tall a tree may stand here without hiding the road from the view: a
 * tree between the road and the view hides it unless it is lower than the
 * line from a traveller's middle on the road to the view, which rises with
 * every unit further from the road.
 */
function roadCap(x: number, z: number, c: number): number {
  const d = fromRoad(x, z);
  if (fromRoad(x - VX * 1.5, z - VZ * 1.5) >= d) return Infinity;
  return 1.6 + (DIP / VZ) * Math.max(0, d - 1 - c * 0.5);
}

/** Whether a tree may stand here, `room` clear: on the land, off the river, the lots and the name boards. */
function treeGround(x: number, z: number, room: number): boolean {
  if (![[0, 0], [room, 0], [-room, 0], [0, room], [0, -room]].every(([dx, dz]) => isLand(x + dx, z + dz))) return false;
  if (LOTS.some((l) => x > l.x0 - room && x < l.x1 + room && z > l.z0 - room && z < l.z1 + room)) return false;
  return BOARDS.every((b) => {
    const ex = x - b.x, ez = z - b.z;
    return Math.abs(ex * VX + ez * VZ) >= 0.6 + room || Math.abs(ex * RX + ez * RZ) >= b.w / 2 + 0.4 + room;
  });
}

/** How tall a tree may stand here without hiding any of the places the view must see in the wood. */
function sightCap(see: { x: number; y: number; z: number; w: number }[], x: number, z: number, c: number): number {
  let h = Infinity;
  for (const p of see) {
    const dx = x - p.x, dz = z - p.z, along = dx * VX + dz * VZ, across = Math.abs(dx * RX + dz * RZ);
    if (along > 0 && across < c + p.w) h = Math.min(h, p.y + DIP * Math.max(0, along - c));
  }
  return h;
}

/**
 * The kingswood: old oaks and pines over the land west of the Hook, thick in
 * the west and towards the south edge, thinning towards the meadow and the
 * Rush, with glades; and in it the forester's hut on the road, a charcoal
 * burner's smoking mound, a woodcutter at work, and deer. No tree stands in the
 * road or within a unit of it, on a lot, in the meadow, by the Rush's bank or
 * in the river, or where it would hide the road, a board or a scene.
 */
function kingswood(k: Build): void {
  forester(k, GLADES.forester);
  charcoal(k, GLADES.charcoal);
  woodcutter(k, GLADES.woodcutter);
  deerGlade(k, GLADES.deerA, [
    { dx: 0.7, dz: -0.3, yaw: Math.atan2(VZ, VX) + 0.35, stag: true },
    { dx: -1.4, dz: 0.8, yaw: 2.6, graze: true },
    { dx: -0.2, dz: 1.6, yaw: 0.2, s: 0.62 },
  ]);
  deerGlade(k, GLADES.deerB, [
    { dx: -0.8, dz: -0.3, yaw: 1.2, graze: true },
    { dx: 0.9, dz: 0.5, yaw: 2.4 },
  ]);

  // what the view must see in the wood: the stage and the ferry's way, the notice, the scenes, the stepping stones
  const st = stageOf(lotOf('ferry-landing')), fold = foldOf(lotOf('sheepfold')), stones = onRiver(LANE + 2.2).p, culverts = onRiver(LANE + 0.5).p;
  const see = [
    { x: st.cx, y: 0.4, z: st.end + 0.3, w: 2.3 },
    { x: st.cx, y: 0.4, z: RUSH.south, w: 2.3 },
    { x: st.cx + 5, y: 0, z: st.end - 2.7, w: 2.0 },
    { x: st.cx + 10, y: 0, z: st.end - 5.4, w: 2.0 },
    { x: fold.notice[0], y: 1.0, z: fold.notice[1], w: 1.5 },
    { x: stones[0], y: 0, z: stones[1], w: 1.4 },
    { x: culverts[0], y: -0.4, z: culverts[1], w: 2.4 },
    ...Object.values(GLADES).map((g) => ({ x: g.x, y: 1.0, z: g.z, w: g.r * 0.7 })),
  ];
  const glades = Object.values(GLADES);
  const r = rng(7313), STEP = 2.15;
  let planted = 0;
  for (let gx = XW + STEP / 2; gx < SHORE.wood; gx += STEP) {
    for (let gz = RUSH.south + STEP / 2; gz < ZS; gz += STEP) {
      // the same count of numbers for every place, so that a change at one moves no other tree
      const x = gx + (r() - 0.5) * STEP * 0.85, z = gz + (r() - 0.5) * STEP * 0.85, roll = r(), kind = r(), grow = r();
      if (roll > thickness(x, z) || x > SHORE.wood - 0.6) continue;
      if (!treeGround(x, z, 0.8) || toMeadow(x, z) < 1.2 || fromRoad(x, z) < LANE + 1) continue;
      const pine = kind < pineShare(x, z);
      const reach = (s: number): number => (pine ? 1.13 : 2.7) * s, tall = (s: number): number => (pine ? 9.0 : 8.32) * s;
      // its trunk stands a unit clear of the road and its rings, and its crown keeps off the road, the meadow, the Rush's bank, the river and the board's edge
      const fits = (s: number): boolean => {
        const c = reach(s);
        return fromRoad(x, z) >= LANE + 0.2 + c && toMeadow(x, z) >= c * 0.8 + 0.6 && z >= RUSH.south + 1 + c * 0.6 &&
          x >= XW + c * 0.45 && z <= ZS - c * 0.45 && toLine(x, z, WL) >= 1.9 + c * 0.35 && free(x, z, c * 0.6);
      };
      let s = pine ? 0.58 + grow * 0.3 : 0.6 + grow * 0.35;
      while (s > 0.36 && !fits(s)) s *= 0.88;
      // and it stands under 8, and low enough to hide no road, board or scene
      const cap = (sz: number): number => Math.min(7.9, roadCap(x, z, reach(sz)), underBoards(x, z) - 0.1, sightCap(see, x, z, reach(sz)));
      while (s > 0.36 && tall(s) > cap(s)) s *= 0.9;
      if (s <= 0.36) continue;
      if (glades.some((g) => Math.hypot(x - g.x, z - g.z) < g.r + reach(s) * 0.5)) continue;
      k.tree(x, z, s, pine);
      planted++;
    }
  }
  if (import.meta.env.DEV) console.info(`South shore: ${planted} trees in the kingswood.`);
}

// ---------------------------------------------------------------------------
// Massey's Hook
// ---------------------------------------------------------------------------

/** Massey's Hook's grass: from its shore to the board's south edge, but for the road and the ring at its end, with a ragged west edge where the kingswood begins. */
function hookShape(): P2[] {
  const ring = TURNS.sharpPoint.c, RR = TURNS.sharpPoint.r + (LANE + 1.2) / 2 + 0.2, off = LANE + 0.2;
  const meet = ring[0] - Math.sqrt(RR * RR - off * off), xw = SHORE.wood - 1.4;
  const edge = (d: number): P2[] => {
    const line = beside(fine(ROADS.south, 1.5), d);
    return [[xw, zOn(line, xw)], ...line.filter((p) => p[0] > xw + 0.05 && p[0] < meet - 0.05), [meet, zOn(line, meet)]];
  };
  const north = edge(-off), south = edge(off);
  const sEnd = south[south.length - 1], nEnd = north[north.length - 1];
  const a0 = Math.atan2(sEnd[1] - ring[1], sEnd[0] - ring[0]), a1 = Math.atan2(nEnd[1] - ring[1], nEnd[0] - ring[0]), arc: P2[] = [];
  // round the ring from the road's south edge, by its east side, to the road's north edge
  for (let i = 1; i < 24; i++) {
    const a = a0 + ((a1 - a0) * i) / 24;
    arc.push([ring[0] + Math.cos(a) * RR, ring[1] + Math.sin(a) * RR]);
  }
  const Z = SHORE.hook + 0.04, S = ZS - 0.2, E = XE - 0.2;
  return [
    [SHORE.wood - 0.3, Z], [E, Z], [E, S], [xw + 0.6, S], [xw - 0.2, S - 1.2], [xw + 0.7, S - 2.3],
    ...south, ...arc, ...[...north].reverse(),
    [xw + 0.5, Z + 3.55], [xw - 0.3, Z + 2.15], [xw + 0.9, Z + 0.95],
  ];
}

/** A strip of shingle along the Hook's shore from `xa` to `xb`, its inner edge ragged. */
function beachShape(xa: number, xb: number): P2[] {
  const z = SHORE.hook + 0.04, back: P2[] = [];
  for (let x = xb; x > xa + 0.7; x -= 1.4) back.push([x, SHORE.hook + 1.05 + 0.32 * Math.sin(x * 0.55) + 0.22 * Math.sin(x * 1.37 + 1.1)]);
  back.push([xa, SHORE.hook + 1.0]);
  return [[xa, z], [xb, z], ...back];
}

/** Fishing folk on the Hook's shore: two huts, their boats drawn up on the shingle with their bows inland, nets drying, a lantern on a pole, and the folk at their work. */
function hamlet(k: Build, x: number, r: () => number, smoky: boolean): void {
  const b = k.b, z = SHORE.hook;
  hut(k, x, z + 1.2, x + 2.6, z + 3.2, { walls: 1.8, rise: 1.1, wall: pick(r, HUT_WALLS), roof: ROOF.thatch, along: 'x', door: 'E', window: 'S', chimney: true, smoke: smoky });
  hut(k, x + 5.4, z + 1.5, x + 7.8, z + 3.5, { walls: 1.7, rise: 1.0, wall: pick(r, HUT_WALLS), roof: ROOF.shingle, along: 'z', door: 'S', window: 'E', chimney: true, smoke: !smoky });
  boat(b, x - 1.8, z + 1.45, Math.PI / 2 + 0.15, 2.3, 0x5a6f7a);
  boat(b, x + 4.0, z + 1.35, Math.PI / 2 - 0.1, 2.1, 0x8a5a3a, true);
  boat(b, x + 9.6, z + 1.5, Math.PI / 2 + 0.25, 2.4, 0x6f7c52);
  net(b, [x - 2.8, z + 3.6], [x - 0.6, z + 3.9], 1.9);
  net(b, [x + 8.6, z + 4.0], [x + 10.9, z + 3.7], 1.8);
  lantern(k, x + 4.0, z + 3.75, 0, 2.2, TIMBER_DARK);
  barrel(b, x + 2.9, z + 3.0);
  basket(b, x + 3.3, z + 3.55, 0, 0xb9c4ca);
  k.person(x + 10.2, z + 2.6);
  k.person(x - 1.6, z + 4.4);
  k.person(x + 3.4, z + 1.8);
  child(b, x + 8.6, z + 2.3, 0, 0x3f6fb5, 0xc9a25a);
  for (const [dx, rr] of [[-1.8, 1.4], [4.0, 1.3], [9.6, 1.4], [1.3, 1.6], [6.6, 1.5], [-1.7, 1.6], [9.75, 1.6]]) TAKEN.push({ x: x + dx, z: z + 2.4, r: rr });
  k.lights.push({ x: x + 3.9, z: z + 3.2, r: 9, color: NIGHT, k: 0.4 });
}

/** A beacon on the Hook's shore over the Gullet: an iron fire basket on a tall braced post on a cairn of stones, wood stacked at its foot, and its watchman. */
function beacon(k: Build, x: number, z: number): void {
  const b = k.b;
  b.cyl(x, z, -0.05, 0.6, 1.05, 0.8, 8, ROCK_GREY, { cap: ROCK_GREY_TOP });
  b.box(x - 0.15, 0.6, z - 0.15, x + 0.15, 6.0, z + 0.15, TIMBER_DARK, { faces: 'NESW' });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.5;
    b.beam([x + Math.cos(a) * 0.75, 0.6, z + Math.sin(a) * 0.75], [x + Math.cos(a) * 0.12, 2.6, z + Math.sin(a) * 0.12], 0.05, 0.05, TIMBER);
  }
  b.cyl(x, z, 6.0, 6.55, 0.3, 0.56, 6, IRONWORK, { cap: DARK });
  fire(k, x, 6.85, z, 0.45, 13);
  for (const dz of [0.4, 0.85]) log(b, [x + 0.75, 0.16, z + dz], [x + 1.85, 0.16, z + dz], 0.15, BARK, CUT);
  k.person(x - 1.2, z + 1.3);
  TAKEN.push({ x, z, r: 1.6 }, { x: x + 1.3, z: z + 0.6, r: 0.9 }, { x: x - 1.2, z: z + 1.3, r: 0.6 });
}

/**
 * Massey's Hook, the bay's southern arm: low grassland with rocks and gorse,
 * a strip of shingle along its shore with the boats of fishing folk drawn up
 * on it, sheep with a boy to mind them, and a beacon over the Gullet. The
 * castles are lots of their own. Along the shore before High Tide nothing
 * stands taller than about 4, so that the view sees High Tide's south side.
 */
function hook(k: Build): void {
  const b = k.b, r = rng(8123), sd = lotOf('stonedance'), sp = lotOf('sharp-point');
  area(k, hookShape(), HOOK_GRASS, 0.035);
  area(k, beachShape(SHORE.wood + 0.2, sd.x0 - 0.6), SHINGLE, 0.045);
  area(k, beachShape(sd.x1 + 0.6, sp.x0 - 0.4), SHINGLE, 0.045);
  TAKEN.push({ x: (sd.x0 + sd.x1) / 2, z: (sd.z0 + sd.z1) / 2, r: 7.2 }, { x: (sp.x0 + sp.x1) / 2, z: (sp.z0 + sp.z1) / 2, r: 6.6 });
  hamlet(k, 1.8, r, true);
  hamlet(k, 61.0, r, false);
  beacon(k, 51.5, SHORE.hook + 2.2);
  // fish drying in the wind by the eastern huts, and crab pots stacked by the western ones
  fishRack(b, 75.4, SHORE.hook + 2.5);
  TAKEN.push({ x: 75.4, z: SHORE.hook + 2.5, r: 1.5 });
  for (const [dx, dz, y] of [[0, 0, 0], [0.62, 0.1, 0], [0.3, 0.05, 0.36]]) b.cyl(-2.6 + dx, SHORE.hook + 1.6 + dz, y, y + 0.36, 0.3, 0.2, 6, 0x8a6f4c, { cap: 0x6b5638 });
  TAKEN.push({ x: -2.3, z: SHORE.hook + 1.65, r: 0.8 });

  // sheep on the Hook's grass: by the beacon with a boy to mind them, towards Sharp Point, and out on its tip
  const flock: [number, number, 'graze' | 'stand' | 'lie'][] = [
    [37.5, 98.6, 'graze'], [39.8, 99.7, 'lie'], [41.2, 97.9, 'graze'], [43.6, 99.3, 'stand'], [45.6, 98.1, 'graze'],
    [79.5, 98.6, 'graze'], [81.6, 97.6, 'lie'], [83.3, 98.4, 'graze'],
    [95.6, 104.6, 'graze'], [98.4, 106.6, 'lie'], [95.0, 108.6, 'graze'], [100.4, 109.8, 'stand'], [97.6, 111.2, 'graze'],
  ];
  for (const [x, z, pose] of flock) {
    if (fromRoad(x, z) < LANE + 1.4 || Math.hypot(x - TURNS.sharpPoint.c[0], z - TURNS.sharpPoint.c[1]) < 7.6 || !free(x, z, 0.7)) continue;
    sheep(b, x, z, r() * TAU, pose);
    TAKEN.push({ x, z, r: 0.8 });
  }
  child(b, 42.4, 100.6, 0, 0xf2c14e, 0x6b4a2a);
  TAKEN.push({ x: 42.4, z: 100.6, r: 0.5 });

  // a few thorn trees, kept low by the wind off the Narrow Sea: none on the shore before High Tide, or before a board
  const onHook = (x: number, z: number, room: number): boolean =>
    x > SHORE.wood + 0.6 && x < XE - room && z > SHORE.hook + room * 0.5 && z < ZS - room * 0.6 && fromRoad(x, z) > LANE + 1 + room &&
    Math.hypot(x - TURNS.sharpPoint.c[0], z - TURNS.sharpPoint.c[1]) > 7 + room && treeGround(x, z, room * 0.5) && free(x, z, room);
  for (const [x, z] of [[-2.4, 98.6], [37.0, 96.9], [48.2, 99.3], [56.8, 97.6], [72.4, 99.4], [102.4, 103.6], [102.2, 111.0], [-1.0, 111.4], [89.0, 97.0]]) {
    const s = 0.44 + ((x * 7.3) % 1 + 1) % 1 * 0.1;
    if (x > sd.x1 - 1 && x < 36 && z < 102) continue;
    if (!onHook(x, z, 1.3) || underBoards(x, z) < 8.32 * s) continue;
    k.tree(x, z, s);
    TAKEN.push({ x, z, r: 1.3 });
  }

  // rocks along the shore, wet where the bay reaches them, and over the grass; and gorse. None reaches much higher than a sheep's back.
  for (let i = 0; i < 11; i++) {
    const x = SHORE.wood + 3 + r() * (XE - SHORE.wood - 6), z = SHORE.hook + 0.35 + r() * 0.5, s = 0.4 + r() * 0.45;
    if (!onHook(x, z, s)) continue;
    boulder(b, x, z, s, r() * TAU, true);
    TAKEN.push({ x, z, r: s });
  }
  for (let i = 0; i < 15; i++) {
    const x = SHORE.wood + 2 + r() * (XE - SHORE.wood - 4), z = SHORE.hook + 1.5 + r() * (ZS - SHORE.hook - 2), s = 0.4 + r() * 0.5;
    if (!onHook(x, z, s + 0.2)) continue;
    boulder(b, x, z, s, r() * TAU);
    TAKEN.push({ x, z, r: s });
  }
  let gorses = 0;
  for (let i = 0; i < 140 && gorses < 15; i++) {
    const x = SHORE.wood + 2 + r() * (XE - SHORE.wood - 4), z = SHORE.hook + 1.6 + r() * (ZS - SHORE.hook - 1.9), s = 0.65 + r() * 0.55;
    if (!onHook(x, z, s * 0.65)) continue;
    gorse(b, x, z, s, r() * TAU);
    TAKEN.push({ x, z, r: s * 0.7 });
    gorses++;
  }
}

/** A rack of fish drying in the wind: two trestles of poles with a rail between them, and the fish hung from it in a row, seen from both sides. */
function fishRack(b: GeoBuilder, x: number, z: number): void {
  for (const dx of [-1.0, 1.0]) for (const s of [-1, 1]) b.beam([x + dx, 0, z + s * 0.4], [x + dx, 1.7, z], 0.05, 0.05, TIMBER);
  b.beam([x - 1.2, 1.65, z], [x + 1.2, 1.65, z], 0.045, 0.045, TIMBER_DARK);
  for (let i = 0; i < 6; i++) {
    const fx = x - 0.85 + i * 0.34;
    for (const s of [-1, 1]) b.quad([fx - 0.08, 1.05, z + s * 0.02], [fx + 0.08, 1.05, z + s * 0.02], [fx + 0.06, 1.6, z + s * 0.02], [fx - 0.06, 1.6, z + s * 0.02], [0, 0, s], 0xb9c4ca);
  }
}

// ---------------------------------------------------------------------------
// Stonedance
// ---------------------------------------------------------------------------

/**
 * Stonedance, House Massey's seat, on the Hook's north shore facing the bay: a
 * tall square keep in the west, with a corbelled parapet and a turret under a
 * cone of slate at each of its corners; a curtain wall round a small ward, with
 * round towers capped in slate at its seaward corners and a water gate with
 * steps down to a boat; and the gatehouse in the south curtain, facing the
 * road, with a torch either side of its arch. Its look was not found: this is
 * the tile's own, in the bay's old grey stone. Its banner is plain.
 */
function stonedance(k: Build, l: Lot): void {
  const b = k.b, X0 = l.x0, X1 = l.x1, Z0 = l.z0, Z1 = l.z1, TOP = l.top;
  // the keep
  const K = { x0: X0 + 0.25, z0: Z0 + 0.25, x1: X0 + 4.55, z1: Z1 - 0.25 }, BAND = KEEP_WIN.storey * 3, BT = BAND + 0.5, O = 0.25;
  b.box(K.x0, 0, K.z0, K.x1, BAND, K.z1, WALL, { win: KEEP_WIN, seed: 0.41, faces: 'NESW' });
  b.box(K.x0 - O, BAND, K.z0 - O, K.x1 + O, BT, K.z1 + O, WALL_TOP, { top: 0x7d766a, faces: 'NESWTB' });
  merlons(b, K.x0 - O, K.z0 - O, K.x1 + O, K.z1 + O, BT, TOP - BT, WALL, WALL_TOP, 0.75);
  for (const [cx, cz] of [[K.x0 - O, K.z0 - O], [K.x1 + O, K.z0 - O], [K.x1 + O, K.z1 + O], [K.x0 - O, K.z1 + O]]) {
    b.cyl(cx, cz, BAND - 1.0, BAND, 0.1, 0.6, 8, WALL_TOP, { cap: false });
    b.cyl(cx, cz, BAND, TOP, 0.6, 0.6, 8, WALL, { cap: false });
    b.cyl(cx, cz, TOP, TOP + 1.9, 0.78, 0.04, 8, ROOF.slate, { cap: false });
    downDisc(b, cx, cz, TOP, 0.78, 8, SLATE_UNDER);
  }
  doorway(b, K.x1, 0, (K.z0 + K.z1) / 2 + 0.3, 1, 0, 0.9, 1.8, 0.6, DOOR);
  banner(b, (K.x0 + K.x1) / 2 - 0.4, (K.z0 + K.z1) / 2, BT, 'massey', 3.0, 0.75);
  k.person(K.x0 + 1.0, K.z0 + 1.1, BT);

  // the curtain, with round towers at its seaward and landward corners in the east
  // (the towers' cones keep inside the lot, so that nothing taller than about 4 stands on the shore east of it, before High Tide)
  const T = 0.8, CT = LOOPS.storey, NZ = Z0 + 0.6, SZ = Z1 - 0.6, EX = X1 - 1.45;
  const GW = 1.3, GX = K.x1 + 3.45, GZ0 = SZ - 1.0, GZ1 = Z1 + 0.35, GH = GATE_WIN.storey * 2;
  const cw = { thick: T, shade: WALL_TOP, win: LOOPS };
  rampart(b, [K.x1, NZ], [EX, NZ], CT, WALL, cw);
  rampart(b, [EX, NZ], [EX, SZ], CT, WALL, cw);
  rampart(b, [K.x1, SZ], [GX - GW, SZ], CT, WALL, cw);
  rampart(b, [GX + GW, SZ], [EX, SZ], CT, WALL, cw);
  for (const z of [NZ, SZ]) {
    roundTower(b, EX, z, 0.95, CT + 1, WALL, { shade: WALL_TOP, win: LOOPS, sides: 10, cone: { color: ROOF.slate, h: 2.3 } });
    downDisc(b, EX, z, CT, 0.95 + 0.22, 10, WALL_TOP);
    downDisc(b, EX, z, CT + 1, 0.95 + 0.22 + 0.25, 10, SLATE_UNDER);
  }

  // the gatehouse in the south curtain: an arch through it between two solid sides, its upper storey over the arch, battlements on top
  for (const s of [-1, 1]) b.box(s < 0 ? GX - GW : GX + GW / 2, 0, GZ0, s < 0 ? GX - GW / 2 : GX + GW, GH, GZ1, WALL, { faces: 'NESW' });
  archway(b, GX, GZ0, GZ1, GW, 1.5, GH / 2, WALL, 0x3a352f);
  b.box(GX - GW / 2, GH / 2, GZ0, GX + GW / 2, GH, GZ1, WALL, { win: GATE_WIN, seed: 0.7, faces: 'NS' });
  b.box(GX - GW - 0.15, GH, GZ0 - 0.15, GX + GW + 0.15, GH + 0.3, GZ1 + 0.15, WALL_TOP, { top: WALL_TOP, faces: 'NESWTB' });
  merlons(b, GX - GW - 0.15, GZ0 - 0.15, GX + GW + 0.15, GZ1 + 0.15, GH + 0.3, 0.75, WALL, WALL_TOP);
  // its leaves standing open in the passage, its floor, its torches, and its guards
  for (const s of [-1, 1]) b.box(GX + s * (GW / 2 - 0.08) - 0.04, 0.06, GZ0 + 0.1, GX + s * (GW / 2 - 0.08) + 0.04, 1.6, GZ0 + 0.72, DOOR, { faces: 'NESWT' });
  flat(b, rect(GX - GW / 2, SZ + T / 2, GX + GW / 2, GZ1), 0.06, COBBLE);
  for (const s of [-1, 1]) {
    const tx = GX + s * (GW / 2 + 0.3);
    b.box(tx - 0.05, 2.2, GZ1, tx + 0.05, 2.4, GZ1 + 0.22, IRONWORK, { faces: 'NESWTB' });
    fire(k, tx, 2.62, GZ1 + 0.16, 0.22, 0);
  }
  for (const s of [-1, 1]) guard(b, GX + s * 1.05 - 0.25, GZ1 + 0.42);
  // the way from the gate to the road
  const north = beside(fine(ROADS.south, 1.5), -LANE);
  area(k, rect(GX - 0.85, GZ1 - 0.05, GX + 0.85, zOn(north, GX) - 0.1), EARTH, 0.05);

  // the ward: cobbles, a well, a brazier, folk, and watchmen on the walls
  flat(b, rect(K.x1, NZ + T / 2, EX - T / 2, SZ - T / 2), 0.06, COBBLE);
  const wx = K.x1 + 1.0, wz = NZ + 1.15;
  b.cyl(wx, wz, 0.06, 0.72, 0.42, 0.42, 8, WALL, { cap: 0x2a3540 });
  for (const s of [-1, 1]) b.beam([wx + s * 0.42, 0.7, wz], [wx + s * 0.42, 1.65, wz], 0.04, 0.04, TIMBER_DARK);
  b.beam([wx - 0.5, 1.6, wz], [wx + 0.5, 1.6, wz], 0.04, 0.04, TIMBER_DARK);
  brazier(k, EX - 1.3, NZ + 1.0, 0.06);
  k.person(GX - 1.4, NZ + 1.3, 0.06);
  k.person(EX - 1.9, SZ - 1.0, 0.06);
  k.person(K.x1 + (EX - K.x1) / 3, NZ, CT);
  k.person(EX, (NZ + SZ) / 2, CT);

  // the water gate in the north curtain, steps down to the bay, and a boat at them
  const qx = (K.x1 + EX) / 2 - 0.4, shore = SHORE.hook;
  doorway(b, qx, 0, NZ - T / 2, 0, -1, 0.8, 1.5, 0.35, DARK);
  area(k, rect(qx - 0.7, shore + 0.04, qx + 0.7, NZ - T / 2 - 0.02), COBBLE, 0.05);
  b.box(qx - 0.7, -1.3, shore - 0.4, qx + 0.7, -0.32, shore, WALL_TOP, { faces: 'NEWT' });
  b.box(qx - 0.7, -1.3, shore - 0.85, qx + 0.7, -0.62, shore - 0.4, WALL_TOP, { faces: 'NEWT' });
  boat(b, qx + 2.2, shore - 0.5, 0.08, 1.9, 0x5a6f7a, false, -1.05, 0.42);
  for (let x = X0 + 0.6, i = 0; x < X1; x += 1.9, i++) if (Math.abs(x - qx) > 1.2) boulder(b, x, shore + 0.3, 0.3 + (i % 3) * 0.06, i * 1.3, true);

  // its name beside the gate, and the light that falls on the road
  nameBoard(k, SIGN.stonedance, (K.x0 + GX - GW) / 2, Z1 + 0.65, 0, [0, 0, 1], 0.85);
  k.lights.push({ x: GX, z: GZ1 + 2.2, r: 11, color: NIGHT, k: 0.55 }, { x: (K.x1 + EX) / 2, z: (NZ + SZ) / 2, r: 7, color: NIGHT, k: 0.35 });
}

// ---------------------------------------------------------------------------
// Sharp Point
// ---------------------------------------------------------------------------

/**
 * Sharp Point, House Bar Emmon's seat at the Hook's eastern tip: a castle
 * whose walls close to a point towards the sea, like a prow, with a round
 * tower at the point under a tall spire of slate, which ships see from far
 * out; round towers at its landward corners, and small turrets under slate
 * cones where the walls turn;
 * a hall with a hipped roof of slate inside; and its gatehouse in the west
 * wall, facing the ring where the road ends. Its look was not found: this is
 * the tile's own, in the bay's old grey stone. Its banner is plain.
 */
function sharpPoint(k: Build, l: Lot): void {
  const b = k.b, WX = l.x0 + 0.6, NZ = l.z0 + 0.9, SZ = l.z1 - 0.7, SHX = l.x1 - 4.0, T = 0.8, CT = LOOPS.storey;
  const P: P2 = [l.x1 - 1.15, (NZ + SZ) / 2];
  const GW = 1.2, GD = 0.95, GZ = (NZ + SZ) / 2 + 0.35, GH = GATE_WIN.storey * 2, GC = WX - 0.45;
  const cw = { thick: T, shade: WALL_TOP, win: LOOPS };
  // the walls: north and south to their shoulders and on to the point; the west wall either side of the gate
  rampart(b, [WX, NZ], [SHX, NZ], CT, WALL, cw);
  rampart(b, [SHX, NZ], P, CT, WALL, cw);
  rampart(b, [WX, SZ], [SHX, SZ], CT, WALL, cw);
  rampart(b, [SHX, SZ], P, CT, WALL, cw);
  rampart(b, [WX, NZ], [WX, GZ - GW], CT, WALL, cw);
  rampart(b, [WX, GZ + GW], [WX, SZ], CT, WALL, cw);
  // a dark foot of stone along the shore under the north wall
  b.box(WX - 0.5, -1.2, NZ - 0.55, SHX + 0.3, 0.05, NZ - 0.38, WALL_TOP, { faces: 'NEWT' });

  // the prow tower at the point, under a tall spire of slate that ships see from far out: the sharp point
  const PT = PROW_WIN.storey * 2 + 1, SPIRE = Math.min(3.7, l.top + 2.9 - PT);
  roundTower(b, P[0], P[1], 1.35, PT, WALL, { shade: WALL_TOP, win: PROW_WIN, sides: 12, flare: 0.25, cone: { color: ROOF.slate, h: SPIRE } });
  downDisc(b, P[0], P[1], PT - 1, 1.6, 12, WALL_TOP);
  downDisc(b, P[0], P[1], PT, 1.85, 12, SLATE_UNDER);
  b.cyl(P[0], P[1], PT + SPIRE - 0.12, PT + SPIRE + 0.22, 0.12, 0.02, 4, 0xd9b24a, { cap: false });
  // round towers at the landward corners, one flying the house's plain colours, and turrets under slate cones where the walls turn for the point
  const TT = TOWER_WIN.storey * 2 + 1;
  banner(b, WX + 0.2, NZ + 0.2, TT, 'bar-emmon', 2.8, 0.6);
  for (const z of [NZ, SZ]) {
    roundTower(b, WX, z, 0.85, TT, WALL, { shade: WALL_TOP, win: TOWER_WIN, sides: 10 });
    if (z === NZ) b.cyl(WX, z, -1.2, 0.05, 0.98, 0.98, 10, WALL_TOP, { cap: false });
    downDisc(b, WX, z, TT - 1, 0.85 + 0.22, 10, WALL_TOP);
    b.cyl(SHX, z, 0, CT + 0.9, 0.55, 0.55, 8, WALL, { cap: false });
    b.cyl(SHX, z, CT + 0.9, CT + 2.3, 0.72, 0.04, 8, ROOF.slate, { cap: false });
    downDisc(b, SHX, z, CT + 0.9, 0.72, 8, SLATE_UNDER);
  }

  // the hall inside, along the north wall, under a hipped roof of slate, its chimney smoking
  const H = { x0: WX + 0.9, z0: NZ + 0.45, x1: SHX - 0.6, z1: NZ + 2.3 }, HW = HALL_WIN.storey * 2;
  b.box(H.x0, 0, H.z0, H.x1, HW, H.z1, WALL, { win: HALL_WIN, seed: 0.9, faces: 'NESW' });
  hip(b, H.x0, H.z0, H.x1, H.z1, HW, 1.7, ROOF.slate, 0.25);
  b.box(H.x1 - 0.9, HW, H.z0 + 0.35, H.x1 - 0.5, HW + 2.1, H.z0 + 0.75, 0x857464, { top: 0x46403b });
  SMOKE.push({ x: H.x1 - 0.7, y: HW + 2.35, z: H.z0 + 0.55, size: 0.55, shade: 0.84, every: 0.55 });
  doorway(b, (H.x0 + H.x1) / 2, 0.06, H.z1, 0, 1, 0.9, 1.7, 0.7, DOOR);

  // the ward
  flat(b, [[WX + 0.4, NZ + 0.4], [SHX, NZ + 0.4], [P[0] - 1.3, P[1]], [SHX, SZ - 0.4], [WX + 0.4, SZ - 0.4]], 0.06, COBBLE);
  k.person(SHX - 1.0, SZ - 1.1, 0.06);
  k.person(H.x0 + 1.2, H.z1 + 0.9, 0.06);
  k.person(WX + (SHX - WX) / 3, SZ, CT);
  barrel(b, SHX - 0.4, SZ - 0.75, 0.06);
  barrel(b, SHX - 0.95, SZ - 0.7, 0.06);

  // the gatehouse in the west wall, built along it in its own frame: its passage runs west to the ring
  b.moved(GC, 0, GZ, Math.PI / 2, () => {
    for (const s of [-1, 1]) b.box(s < 0 ? -GW : GW / 2, 0, -GD, s < 0 ? -GW / 2 : GW, GH, GD, WALL, { faces: 'NESW' });
    archway(b, 0, -GD, GD, GW, 1.5, GH / 2, WALL, 0x3a352f);
    b.box(-GW / 2, GH / 2, -GD, GW / 2, GH, GD, WALL, { win: GATE_WIN, seed: 0.3, faces: 'NS' });
    b.box(-GW - 0.15, GH, -GD - 0.15, GW + 0.15, GH + 0.3, GD + 0.15, WALL_TOP, { top: WALL_TOP, faces: 'NESWTB' });
    merlons(b, -GW - 0.15, -GD - 0.15, GW + 0.15, GD + 0.15, GH + 0.3, 0.75, WALL, WALL_TOP);
    flat(b, rect(-GW / 2, -GD + 0.1, GW / 2, GD), 0.06, COBBLE);
    for (const s of [-1, 1]) b.box(s * (GW / 2 - 0.08) - 0.04, 0.06, -GD + 0.1, s * (GW / 2 - 0.08) + 0.04, 1.6, -GD + 0.7, DOOR, { faces: 'NESWT' });
  });
  const gx = GC - GD;
  for (const s of [-1, 1]) {
    const tz = GZ + s * (GW / 2 + 0.3);
    b.box(gx - 0.22, 2.2, tz - 0.05, gx, 2.4, tz + 0.05, IRONWORK, { faces: 'NESWTB' });
    fire(k, gx - 0.16, 2.62, tz, 0.22, 0);
    guard(b, gx - 0.75, GZ + s * 1.05);
  }
  // the way from the ring to the gate, kept off the ring's paving
  const ring = TURNS.sharpPoint.c, dx = gx - ring[0], dz = GZ - ring[1], dl = Math.hypot(dx, dz), ux = dx / dl, uz = dz / dl, pw = 1.0;
  const S0: P2 = [ring[0] + ux * 7.1, ring[1] + uz * 7.1], E0: P2 = [gx + ux * 0.25, GZ + uz * 0.25];
  area(k, [[S0[0] - uz * pw, S0[1] + ux * pw], [S0[0] + uz * pw, S0[1] - ux * pw], [E0[0] + uz * pw, E0[1] - ux * pw], [E0[0] - uz * pw, E0[1] + ux * pw]], EARTH, 0.05);

  // rocks at its feet, where the sea and the weather reach
  const r = rng(9341);
  for (let i = 0; i < 7; i++) {
    const a = -1.1 + (i / 6) * 2.2, x = P[0] + Math.cos(a) * 2.1, z = P[1] + Math.sin(a) * 2.1;
    if (x < XE - 0.4) boulder(b, x, z, 0.35 + r() * 0.25, r() * TAU, true);
  }
  for (let x = WX + 0.8; x < SHX; x += 1.7) boulder(b, x, SHORE.hook - 0.35, 0.3 + r() * 0.15, r() * TAU, true, -0.4);

  // its name, before its south-west side by the ring, and the light that falls on the road
  nameBoard(k, SIGN.sharp, l.x0 + 3.0, l.z1 + 2.4, 0, TO_VIEW, 0.8);
  k.lights.push({ x: gx - 1.6, z: GZ + 1.2, r: 10, color: NIGHT, k: 0.55 }, { x: ring[0] + 2.0, z: ring[1] - 2.5, r: 9, color: NIGHT, k: 0.45 }, { x: (WX + SHX) / 2, z: (NZ + SZ) / 2 + 0.8, r: 7, color: NIGHT, k: 0.35 });
}

// ---------------------------------------------------------------------------
// Smoke
// ---------------------------------------------------------------------------

/** The smoke of the shore's chimneys and of the charcoal burner's mound, set going: one cloud of puffs for them all. */
function smoke(k: Build): void {
  if (SMOKE.length === 0) return;
  const s = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 90);
  k.group.add(s.mesh);
  const from = SMOKE.splice(0), r = rng(8807), at = new THREE.Vector3(), drift = new THREE.Vector3(0.35, 0.35, 0.18);
  const due = from.map(() => r() * 0.6);
  k.each((dt) => {
    from.forEach((f, i) => {
      due[i] -= dt;
      if (due[i] > 0) return;
      due[i] = f.every * (0.7 + r() * 0.6);
      s.puff(at.set(f.x, f.y, f.z), drift, f.size, f.shade);
    });
    s.update(dt);
  });
}

// ---------------------------------------------------------------------------
// What this file hands over
// ---------------------------------------------------------------------------

export const MODELS: Record<string, Model> = {
  'ferry-landing': ferryLanding,
  sheepfold,
  stonedance,
  'sharp-point': sharpPoint,
};

export const COVERS: string[] = [];

export const SIGNS: SignDef[] = [
  nameSign(SIGN.ferry, 'Ferry'),
  nameSign(SIGN.stonedance, 'Stonedance'),
  nameSign(SIGN.sharp, 'Sharp Point'),
  NOTICE,
];

export function extras(k: Build): void {
  TAKEN.length = 0;
  const cost: string[] = [];
  const part = (what: string, fn: (k: Build) => void): void => {
    const before = k.b.triangles + k.street.triangles;
    fn(k);
    cost.push(`${what} ${k.b.triangles + k.street.triangles - before}`);
  };
  part('meadow', meadow);
  part('ford', ford);
  part('riverside', riverside);
  part('hook', hook);
  part('kingswood', kingswood);
  smoke(k);
  if (import.meta.env.DEV) console.info(`South shore: ${cost.join(', ')}.`);
}

/** The south shore shapes no ground of its own. */
export function heightAt(_x: number, _z: number): number {
  return 0;
}
