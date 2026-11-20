// Agea's walls: the north wall with the North Gate, the postern and the river's grates, the mud banks and the forest belt inside it; the south wall on the trench's low south rim, and the South Gate.
//
// From the books, as the research note gives them (docs/districts/research/red-rising.md, section 2,
// items 7 to 10, and the stories 2, 3, 4 and 7 of section 4):
//
// - perimeter walls 200 m high close the city's north and south borders, with lakes and rivers
//   running under them through thick durosteel grates (GS 39);
// - Ragnar's Obsidians open the north gates from inside for the Augustan infantry (GS 41);
// - the Sons of Ares spent the night before the Rain drilling through the grates (GS 37, 39), and
//   inside the wall the river runs between mud banks (GS 39, 40);
// - a forest inside the north wall separates it from the commercial district (GS 41);
// - the defenders wear the Bellona blue and silver (GS 38).
//
// The books give the walls nothing but their height, their metal and their grates. The dark
// panelled durosteel, the towers along the walls and their beacons, the shape of every gate, the
// North Gate's blast shutter drawn up and the Society's pyramid over it, the postern's two doors,
// the hole cut through the bars at the water, the Bellona banners and the guards' dress are this
// tile's own drawing.
//
// Every place and size comes from plan.ts.

import * as THREE from 'three';
import { GeoBuilder, interior, rng, type V3, type WinSpec } from '../../engine/geo';
import { figure, type Dress } from '../../engine/parts';
import { face3, slope3 } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { MUD, landAt, riverShape } from './land';
import { AMBER, BELLONA_BLUE, BELLONA_SILVER, BOARDS, COLD, GOLD, WARM, nameSign, pyramid } from './look';
import type { Model } from './models';
import { F, LANE, ROADS, STAGES, lotOf, type Lot, type P2 } from './plan';
import { open, underBoards } from './space';

// ---------------------------------------------------------------------------
// The lots, and the two walls as the plan has them
// ---------------------------------------------------------------------------

const NWL = lotOf('wall-n-w'), NEL = lotOf('wall-n-e'), SWL = lotOf('wall-s-w');
const NG = lotOf('north-gate'), PG = lotOf('ragnar-gate'), GR = lotOf('grates'), SG = lotOf('south-gate');

/**
 * One of the two walls: its outer and inner faces across it, which way is
 * out (-1 north, 1 south), the height of its walk, and how tall a row of its
 * loops is (rows are counted from y = 0, so its walk is a whole number of them up).
 */
interface Side { zo: number; zi: number; out: number; walk: number; storey: number }

const NORTH: Side = { zo: NWL.z0, zi: NWL.z1, out: -1, walk: NWL.top, storey: 5 };
const SOUTH: Side = { zo: SWL.z1, zi: SWL.z0, out: 1, walk: SWL.top, storey: 4 };

/** How high a wall's parapet stands over its walk: under 1, and a whole share of the walk's height, so that its gun ports come in a row. */
const parapetOf = (s: Side): number => s.walk / Math.round(s.walk / 0.94);

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/** Durosteel: its plates, the shadowed metal of its footings and soffits, and the lighter metal of its ribs and cornices. */
const DURO = 0x545b65, DURO_DARK = 0x3a4048, DURO_LIGHT = 0x737d89;
/** The walks on the walls' tops and the gates' decks, paler so that whoever stands there reads against them. */
const WALK = 0x868b93;
/** Bars, rungs and rods: painted a good deal lighter than they are, since thin parts come out dark. */
const BARS = 0x939ca7, RUNG = 0xb4bcc5, CUT = 0xe6e9ec;
/** The board behind a name, and its frame. */
const BOARD = 0x23272e, FRAME_STEEL = 0xa9b2bc;
/** The postern's doors, and the straps across them. */
const DOOR = 0x3d434b, STRAP = 0x8d97a2;
/** A doorway lit from within, dark by day. */
const DOORWAY = 0x3a2b20;
/** The mud of the banks: drier on top, wet towards the water. */
const MUD_DRY = 0x7f6249, MUD_WET = 0x56412f;
const REEDS = [0xb2c983, 0xcdbf82, 0x9cb86a, 0xbfc77a];
const BEACON = '#ff4a3a';

/** The Bellona guard on the walls: blue coats, dark legs, silver helms (GS 38). */
const GUARD: Dress = { coat: BELLONA_BLUE, legs: 0x2b303d, hat: BELLONA_SILVER, hatH: 0.34, hatR: 0.33 };

/** Loops in a face: narrow, dark by day, lit warm at night (the engine's kind 7). */
const loops = (storey: number, cell = 4, lit = 0.5): WinSpec => ({ cell, storey, lit, kind: 7 });

/** How wide a cell of a wall's loops is, and so how far apart its ribs stand. */
const CELL = 4;

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------

const SIGN = { agea: 'walls-agea', postern: 'walls-postern', gate: 'walls-north-gate', grates: 'walls-grates', south: 'walls-south-gate' };

/** Every sign this file hangs: the names as the plan writes them, on the dark boards the Society letters its places with. */
export const SIGNS: SignDef[] = [
  nameSign(SIGN.agea, NWL.name),
  nameSign(SIGN.postern, PG.name),
  nameSign(SIGN.gate, NG.name),
  nameSign(SIGN.grates, GR.name),
  nameSign(SIGN.south, SG.name),
];

/**
 * Where along the north wall the city's name hangs, on its face towards the
 * city: on the one stretch of the wall-n-e that the view the tile opens with
 * sees whole, between centre-2 and the north-west pylon of the shield park.
 */
const AGEA_X = 41.5;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** The lowest the ground is under a rectangle, less a little, so that what stands there goes down into it. Never above the floor. */
function footOf(x0: number, z0: number, x1: number, z1: number): number {
  let y = F;
  const nx = Math.max(1, Math.ceil((x1 - x0) / 1.5)), nz = Math.max(1, Math.ceil((z1 - z0) / 1.5));
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) y = Math.min(y, landAt(x0 + ((x1 - x0) * i) / nx, z0 + ((z1 - z0) * j) / nz));
  return Math.min(F, y) - 0.6;
}

/** Where the river's banks are at a place along it, by the shape land.ts lays: its west edge and its east edge. */
function riverAt(shape: P2[], z: number): [number, number] {
  let w = Infinity, e = -Infinity;
  for (let i = 0; i < shape.length; i++) {
    const a = shape[i], c = shape[(i + 1) % shape.length];
    if ((a[1] - z) * (c[1] - z) > 0 || a[1] === c[1]) continue;
    const x = a[0] + ((c[0] - a[0]) * (z - a[1])) / (c[1] - a[1]);
    w = Math.min(w, x);
    e = Math.max(e, x);
  }
  return [w, e];
}

const glow = (k: Build, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string): void => void k.glows.push({ x, y, z, sx, sy, sz, color });

/**
 * A crown round the edge of a level top: four thin walls `h` high and `t`
 * thick, closed on every side, with its rim in a colour of its own, and a
 * merlon `m` higher at each corner if `m` is given.
 */
function crown(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, h: number, t: number, color: number, rim: number, m = 0): void {
  const X0 = x0 + t, X1 = x1 - t, Z0 = z0 + t, Z1 = z1 - t, y1 = y + h;
  if (m > 0) {
    const c = t + 0.22;
    for (const [cx0, cz0] of [[x0, z0], [x1 - c, z0], [x0, z1 - c], [x1 - c, z1 - c]]) b.box(cx0, y1, cz0, cx0 + c, y1 + m, cz0 + c, color, { faces: 'NESWT', top: rim });
  }
  b.quad([x0, y, z1], [x1, y, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], color);
  b.quad([x1, y, z0], [x0, y, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], color);
  b.quad([x1, y, z1], [x1, y, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], color);
  b.quad([x0, y, z0], [x0, y, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], color);
  b.quad([X0, y, Z1], [X1, y, Z1], [X1, y1, Z1], [X0, y1, Z1], [0, 0, -1], color);
  b.quad([X1, y, Z0], [X0, y, Z0], [X0, y1, Z0], [X1, y1, Z0], [0, 0, 1], color);
  b.quad([X1, y, Z1], [X1, y, Z0], [X1, y1, Z0], [X1, y1, Z1], [-1, 0, 0], color);
  b.quad([X0, y, Z0], [X0, y, Z1], [X0, y1, Z1], [X0, y1, Z0], [1, 0, 0], color);
  b.quad([x0, y1, z1], [x1, y1, z1], [X1, y1, Z1], [X0, y1, Z1], [0, 1, 0], rim);
  b.quad([x1, y1, z0], [x0, y1, z0], [X0, y1, Z0], [X1, y1, Z0], [0, 1, 0], rim);
  b.quad([x1, y1, z1], [x1, y1, z0], [X1, y1, Z0], [X1, y1, Z1], [0, 1, 0], rim);
  b.quad([x0, y1, z0], [x0, y1, z1], [X0, y1, Z1], [X0, y1, Z0], [0, 1, 0], rim);
}

/**
 * A name on a dark board fixed flat to a wall that faces south or north
 * (`nz`), in a frame: the lettering `h` tall, its middle at (x, y) on the face
 * at z. The board stands 0.3 proud of the face, before its ribs, and the
 * lettering 0.03 before the board. Returns how wide the lettering is.
 */
function plate(k: Build, id: string, x: number, y: number, z: number, nz: 1 | -1, h: number, maxW: number, frame: number): number {
  const fz = z + nz * 0.3, front = nz > 0 ? 'S' : 'N', aspect = SIGNS.find((s) => s.id === id)?.aspect ?? 3;
  // a name too long for `maxW` is lettered smaller, as the sign itself is
  const hl = Math.min(h, maxW / aspect);
  const w = k.sign(id, x, y, fz + nz * 0.03, 0, nz, hl, maxW), hh = hl / 2 + 0.14, hw = w / 2 + 0.16;
  const [z0, z1] = nz > 0 ? [z, fz] : [fz, z];
  k.b.box(x - hw, y - hh, z0, x + hw, y + hh, z1, BOARD, { faces: front + 'EWTB' });
  const [f0, f1] = nz > 0 ? [fz, fz + 0.06] : [fz - 0.06, fz], t = 0.09, o = { faces: front + 'EWTB' };
  k.b.box(x - hw, y + hh - t, f0, x + hw, y + hh, f1, frame, o);
  k.b.box(x - hw, y - hh, f0, x + hw, y - hh + t, f1, frame, o);
  k.b.box(x - hw, y - hh + t, f0, x - hw + t, y + hh - t, f1, frame, o);
  k.b.box(x + hw - t, y - hh + t, f0, x + hw, y + hh - t, f1, frame, o);
  BOARDS.push({ x, z, w });
  return w;
}

/** A banner hung flat on a wall that faces south or north: the cloth, a stripe down its middle, and the rod it hangs from. */
function hungBanner(b: GeoBuilder, x: number, yTop: number, z: number, nz: 1 | -1, w: number, h: number, cloth: number, stripe: number): void {
  const at = (d0: number, d1: number): [number, number] => (nz > 0 ? [z + d0, z + d1] : [z - d1, z - d0]);
  const front = nz > 0 ? 'S' : 'N';
  const [c0, c1] = at(0.02, 0.07), [s0, s1] = at(0.07, 0.1), [r0, r1] = at(0.02, 0.14);
  b.box(x - w / 2, yTop - h, c0, x + w / 2, yTop - 0.1, c1, cloth, { faces: front + 'EWB' });
  b.box(x - w * 0.13, yTop - h + 0.3, s0, x + w * 0.13, yTop - 0.3, s1, stripe, { faces: front + 'EWTB' });
  b.box(x - w / 2 - 0.15, yTop - 0.12, r0, x + w / 2 + 0.15, yTop, r1, RUNG, { faces: front + 'EWTB' });
}

// ---------------------------------------------------------------------------
// The walls: stretches of curtain wall, and towers along them
// ---------------------------------------------------------------------------

interface Dressing {
  /** Every how many cells of loops a rib stands. */
  ribs: number;
  /** Spans along it where no rib stands and no plinth runs: the river's opening. */
  gaps?: [number, number][];
  /** A lamp under the cornice every so far, and a pool of light at its foot every twice that. */
  lamps: number;
  /** A line of light along the face under the cornice: for the faces the view the tile opens with sees. */
  strip?: boolean;
  /** Bellona banners hung from the cornice between the ribs, about this far apart. */
  banners?: number;
}

/**
 * What one face of a stretch of wall carries: a plinth at its foot, a band
 * under its row of loops, a cornice under the walk, ribs between the loops,
 * and lamps under the cornice that light the ground at its foot by night.
 */
function dress(k: Build, s: Side, z: number, d: 1 | -1, ea: number, eb: number, y0: number, o: Dressing): void {
  const b = k.b, front = d > 0 ? 'S' : 'N', up = s.walk - s.storey;
  const proud = (p: number): [number, number] => (d > 0 ? [z, z + p] : [z - p, z]);
  const gaps = o.gaps ?? [];
  // the plinth, broken where the river runs through
  const spans: [number, number][] = [];
  let from = ea;
  for (const [g0, g1] of [...gaps].sort((p, q) => p[0] - q[0])) {
    if (g0 > from) spans.push([from, g0]);
    from = Math.max(from, g1);
  }
  if (eb > from) spans.push([from, eb]);
  const [p0, p1] = proud(0.32);
  for (const [a, c] of spans) b.box(a, y0, p0, c, F + 0.9, p1, DURO_DARK, { faces: front + 'TEW', top: DURO_LIGHT });
  const [m0, m1] = proud(0.12);
  b.box(ea, up - 0.24, m0, eb, up, m1, DURO_LIGHT, { faces: front + 'TBEW' });
  const [c0, c1] = proud(0.28);
  b.box(ea, s.walk - 0.75, c0, eb, s.walk - 0.3, c1, DURO_LIGHT, { faces: front + 'TBEW' });
  // the ribs stand where the cells of loops meet, so that a loop is between every two
  const n = Math.max(1, Math.round((eb - ea) / CELL)), step = (eb - ea) / n, [r0, r1] = proud(0.22);
  for (let i = o.ribs; i < n; i += o.ribs) {
    const x = ea + i * step;
    if (x < ea + 0.7 || x > eb - 0.7 || gaps.some(([g0, g1]) => x > g0 - 0.5 && x < g1 + 0.5)) continue;
    b.box(x - 0.25, F + 0.9, r0, x + 0.25, s.walk - 0.75, r1, DURO_LIGHT, { faces: front + 'EW' });
  }
  // Bellona banners hung from under the cornice, each in the middle of a cell, where a loop would be
  const bannersAt: number[] = [];
  if (o.banners && eb - ea > o.banners * 0.8) {
    const nb = Math.max(1, Math.round((eb - ea) / o.banners));
    for (let j = 0; j < nb; j++) {
      const cell = Math.min(n - 1, Math.floor(((j + 0.5) * n) / nb)), x = ea + (cell + 0.5) * step;
      if (x < ea + 1.5 || x > eb - 1.5 || gaps.some(([g0, g1]) => x > g0 - 1 && x < g1 + 1)) continue;
      // under the line of light, and clear of the band below the upper loops
      hungBanner(b, x, s.walk - 0.95, z, d, 1.2, s.storey - 1.1, BELLONA_BLUE, BELLONA_SILVER);
      bannersAt.push(x);
    }
  }
  // lamps under the cornice, and the light they throw at the foot
  const lamps = Math.max(1, Math.round((eb - ea) / o.lamps));
  for (let i = 0; i < lamps; i++) {
    const x = ea + ((i + 0.5) * (eb - ea)) / lamps;
    if (gaps.some(([g0, g1]) => x > g0 && x < g1) || bannersAt.some((h) => Math.abs(h - x) < 1.1)) continue;
    glow(k, x, s.walk - 1.0, z + d * 0.1, 0.34, 0.2, 0.12, AMBER);
    if (i % 2 === 0) k.lights.push({ x, z: z + d * 3.2, r: 9, color: AMBER, k: 0.42 });
  }
  // a line of light along under the cornice, broken where the river runs through
  if (o.strip) for (const [a, c] of spans) if (c - a > 1) glow(k, (a + c) / 2, s.walk - 0.8, z + d * 0.06, c - a - 0.6, 0.05, 0.06, '#ffcf8a');
}

interface StretchOpts {
  /** How far its faces run on past each end, into whatever stands there, so that no seam shows. */
  into?: [number, number];
  /** How its outer face and its inner face are dressed. */
  outer: Dressing;
  inner: Dressing;
}

/**
 * A stretch of curtain wall along x from `xa` to `xb`: both its faces from
 * below the ground up to the walk, a row of loops high in each, the walk on
 * top, its parapet on the outer edge with gun ports in it, and a kerb on the
 * inner edge. The walk, its parapet and its kerb stop at xa and xb; the faces
 * run `into` further, into the tower or the gate that stands there.
 */
function stretch(k: Build, s: Side, xa: number, xb: number, o: StretchOpts): void {
  if (xb - xa < 0.05) return;
  const b = k.b, [ia, ib] = o.into ?? [0.2, 0.2], ea = xa - ia, eb = xb + ib, L = eb - ea;
  const za = Math.min(s.zo, s.zi), zb = Math.max(s.zo, s.zi), y0 = footOf(ea, za - 0.4, eb, zb + 0.4), up = s.walk - s.storey;
  const seed = xa * 0.13 + s.zo * 0.07;
  for (const [z, d] of [[s.zo, s.out], [s.zi, -s.out]] as [number, 1 | -1][]) {
    // a lower row of loops, fewer of them lit, under the upper row
    b.quad([ea, y0, z], [eb, y0, z], [eb, up, z], [ea, up, z], [0, 0, d], DURO, { win: loops(s.storey, CELL, 0.3), L, seed: seed + 2 * d });
    b.quad([ea, up, z], [eb, up, z], [eb, s.walk, z], [ea, s.walk, z], [0, 0, d], DURO, { win: loops(s.storey), L, seed: seed + d });
    dress(k, s, z, d, ea, eb, y0, z === s.zo ? o.outer : o.inner);
  }
  b.quad([xa, s.walk, za], [xb, s.walk, za], [xb, s.walk, zb], [xa, s.walk, zb], [0, 1, 0], WALK);
  walkEdges(k, s, xa, xb);
}

/** The parapet on a walk's outer edge, with a row of gun ports in it and lamps on its inner face that light the walk, and the low kerb on its inner edge. */
function walkEdges(k: Build, s: Side, xa: number, xb: number): void {
  const b = k.b, ph = parapetOf(s), pt = 0.55, [q0, q1] = s.out > 0 ? [s.zo - pt, s.zo] : [s.zo, s.zo + pt];
  b.box(xa, s.walk, q0, xb, s.walk + ph, q1, DURO, { win: { cell: 1.7, storey: ph, lit: 0.25, kind: 7 }, top: DURO_LIGHT, seed: xa * 0.21 });
  const [k0, k1] = s.out > 0 ? [s.zi, s.zi + 0.3] : [s.zi - 0.3, s.zi];
  b.box(xa, s.walk, k0, xb, s.walk + 0.22, k1, DURO_LIGHT);
  const n = Math.max(1, Math.round((xb - xa) / 8)), zl = s.out > 0 ? q0 - 0.05 : q1 + 0.05;
  for (let i = 0; i < n; i++) glow(k, xa + ((i + 0.5) * (xb - xa)) / n, s.walk + 0.55, zl, 0.26, 0.14, 0.1, '#ffe2ae');
}

interface TowerSpec { x: number; hw: number; proj: number; rise: number; n: number }

/** A tower along a wall: 4 wide, standing 0.75 proud of both its faces, its deck 1.2 over the walk and its corners 2 over it. */
const TOWER = { hw: 2, proj: 0.75, rise: 1.2 };
/** The tower that closes a wall's end: a little larger. */
const END = { hw: 2.4, proj: 1.0, rise: 1.6 };

/**
 * A searchlight on a deck: a turntable, a yoke, and its barrel tilted up
 * towards the sky the way `yaw` points (radians: 0 east, a quarter turn
 * south), its lens lit. The defenders watch the sky for the Rain.
 */
function searchlight(k: Build, x: number, y: number, z: number, yaw: number, pitch: number): void {
  const b = k.b, c = Math.cos(yaw), s = Math.sin(yaw), up = Math.sin(pitch), out = Math.cos(pitch);
  b.box(x - 0.34, y, z - 0.34, x + 0.34, y + 0.16, z + 0.34, DURO_LIGHT);
  for (const side of [-1, 1]) b.obox(x - s * side * 0.36, y + 0.5, z + c * side * 0.36, 0.13, 0.34, 0.05, yaw, RUNG);
  const p: V3 = [x, y + 0.72, z], d: V3 = [c * out, up, s * out];
  const back: V3 = [p[0] - d[0] * 0.35, p[1] - d[1] * 0.35, p[2] - d[2] * 0.35], front: V3 = [p[0] + d[0] * 0.55, p[1] + d[1] * 0.55, p[2] + d[2] * 0.55];
  b.beam(back, front, 0.24, 0.3, DURO_DARK);
  glow(k, front[0] + d[0] * 0.05, front[1] + d[1] * 0.05, front[2] + d[2] * 0.05, 0.36, 0.36, 0.36, '#fff3d2');
}

/**
 * A tower astride a wall, `hw` either side of `x` along it and `proj` proud
 * of both faces: loops in all its faces, a footing, a cornice under its deck,
 * a crown round the deck with a merlon at each corner, a beacon on a mast at
 * the corner that looks out, a searchlight and a guard on its deck, and on
 * the face the view the tile opens with sees, a Bellona banner between two
 * lamps.
 */
function tower(k: Build, s: Side, t: TowerSpec): void {
  const b = k.b, za = Math.min(s.zo, s.zi) - t.proj, zb = Math.max(s.zo, s.zi) + t.proj;
  const x0 = t.x - t.hw, x1 = t.x + t.hw, y0 = footOf(x0 - 0.2, za - 0.2, x1 + 0.2, zb + 0.2), td = s.walk + t.rise;
  b.box(x0, y0, za, x1, td - 0.35, zb, DURO, { win: loops(s.storey, 1.4, 0.6), seed: t.x * 0.31, faces: 'NESW' });
  // its footing stands a little taller than the wall's plinth, so that their tops never lie in one plane
  b.box(x0 - 0.15, y0, za - 0.15, x1 + 0.15, F + 1.0, zb + 0.15, DURO_DARK, { faces: 'NESWT', top: DURO_LIGHT });
  b.box(x0 - 0.15, td - 0.35, za - 0.15, x1 + 0.15, td, zb + 0.15, DURO_LIGHT, { faces: 'NESWTB', top: WALK });
  crown(b, x0 - 0.15, za - 0.15, x1 + 0.15, zb + 0.15, td, 0.45, 0.3, DURO, DURO_LIGHT, 0.35);
  // the beacon, on the corner over the outer face
  const mx = x1 - 0.45, mz = s.out > 0 ? zb - 0.45 : za + 0.45;
  b.cyl(mx, mz, td, td + 2.1, 0.08, 0.05, 4, RUNG, { cap: false });
  glow(k, mx, td + 2.2, mz, 0.32, 0.32, 0.32, BEACON);
  // a searchlight turned up towards the sky beyond the wall, and a guard beside it
  const zc = (za + zb) / 2;
  searchlight(k, t.x - 0.75, td, zc + s.out * 0.5, (s.out > 0 ? Math.PI / 2 : -Math.PI / 2) + (t.n % 3 - 1) * 0.6, 0.75 + (t.n % 2) * 0.2);
  figure(b, t.x + 0.8, zc - s.out * 0.8, td, GUARD);
  // the face the view the tile opens with sees is the south face of both walls' towers: the north wall's towards the city, the south wall's outside
  hungBanner(b, t.x, s.walk - 0.3, zb, 1, 1.3, 3.8, BELLONA_BLUE, BELLONA_SILVER);
  for (const sx of [-1, 1]) glow(k, t.x + sx * 1.35, s.walk - 4.2, zb + 0.1, 0.36, 0.28, 0.14, WARM);
}

/** Bellona guards on a walk, one at the middle of each span between towers that is not a stage. */
function guards(k: Build, s: Side, spans: [number, number][], stage: { x0: number; x1: number }): void {
  const z = (s.zo + s.zi) / 2 - s.out * 0.2;
  for (const [a, c] of spans) {
    const x = (a + c) / 2;
    if (c - a < 4 || (x > stage.x0 - 1.5 && x < stage.x1 + 1.5)) continue;
    figure(k.b, x, z, s.walk, GUARD);
  }
}

/**
 * A run of wall along one lot: its towers, and stretches of wall between
 * them and the lot's ends. `into` says how far the stretches at the lot's
 * two ends run on into what stands beyond: a gate's pier, or nothing, where
 * the next lot's wall goes on.
 */
function run(k: Build, s: Side, l: Lot, towers: TowerSpec[], into: [number, number], outer: Dressing, inner: Dressing, stage: { x0: number; x1: number }): void {
  const ts = [...towers].sort((p, q) => p.x - q.x), spans: [number, number][] = [];
  let a = l.x0, ia = into[0];
  for (const t of ts) {
    spans.push([a, t.x - t.hw]);
    stretch(k, s, a, t.x - t.hw, { into: [ia, 0.2], outer, inner });
    a = t.x + t.hw;
    ia = 0.2;
  }
  spans.push([a, l.x1]);
  stretch(k, s, a, l.x1, { into: [ia, into[1]], outer, inner });
  for (const t of ts) tower(k, s, t);
  guards(k, s, spans, stage);
}

/** Towers evenly spaced from `a` to `b`, about `apart` apart, both ends among them. */
function spaced(a: number, b: number, apart: number): number[] {
  const n = Math.max(1, Math.round(Math.abs(b - a) / apart));
  return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
}

// --- the north wall ---

const N_OUTER: Dressing = { ribs: 2, lamps: 12 };
const N_INNER: Dressing = { ribs: 1, lamps: 8, strip: true };

function northWallWest(k: Build, l: Lot): void {
  // its end closed by a tower, and towers along it as far as short of the stage on the walk
  const end = l.x0 + END.hw, xs = spaced(end, STAGES.wallWalk.x0 - 10, 14.5);
  const towers = xs.map((x, i): TowerSpec => (i === 0 ? { x, ...END, n: i } : { x, ...TOWER, n: i }));
  run(k, NORTH, l, towers, [0, 0.2], N_OUTER, N_INNER, STAGES.wallWalk);
}

function northWallMiddle(k: Build, l: Lot): void {
  // all of it is the stage, where the cast walk from the postern to the gate
  run(k, NORTH, l, [], [0.2, 0.2], N_OUTER, N_INNER, STAGES.wallWalk);
}

function northWallEast(k: Build, l: Lot): void {
  const end = l.x1 - END.hw, xs = spaced(STAGES.wallWalk.x1 + 8, end, 17);
  const towers = xs.map((x, i): TowerSpec => (i === xs.length - 1 ? { x, ...END, n: i + 4 } : { x, ...TOWER, n: i + 4 }));
  // it runs on from the grates' stretch with no seam: no face runs into it
  run(k, NORTH, l, towers, [0, 0], N_OUTER, N_INNER, STAGES.wallWalk);
  // the city's name, on the face towards the city, in gold, with two lamps that light it from below
  const s = NORTH, y = s.walk - 3.0;
  const w = plate(k, SIGN.agea, AGEA_X, y, s.zi, 1, 2.6, 9, GOLD);
  for (const sx of [-1, 1]) {
    glow(k, AGEA_X + sx * (w / 2 - 0.4), y - 1.75, s.zi + 0.45, 0.4, 0.14, 0.2, WARM);
    // a Bellona banner either side of the name
    hungBanner(k.b, AGEA_X + sx * (w / 2 + 1.5), s.walk - 0.5, s.zi, 1, 1.1, 3.6, BELLONA_BLUE, BELLONA_SILVER);
  }
  k.lights.push({ x: AGEA_X, z: s.zi + 4, r: 9, color: WARM, k: 0.5 });
}

// --- the south wall ---

const S_OUTER: Dressing = { ribs: 1, lamps: 8, strip: true, banners: 11 };
const S_INNER: Dressing = { ribs: 2, lamps: 12 };

function southWallWest(k: Build, l: Lot): void {
  const end = l.x0 + END.hw, xs = spaced(end, STAGES.southWalk.x0 - 10, 15);
  const towers = xs.map((x, i): TowerSpec => (i === 0 ? { x, ...END, n: i + 1 } : { x, ...TOWER, n: i + 1 }));
  // and one tower between the stage and the South Gate
  towers.push({ x: STAGES.southWalk.x1 + 13, ...TOWER, n: 7 });
  run(k, SOUTH, l, towers, [0, 0.2], S_OUTER, S_INNER, STAGES.southWalk);
}

function southWallEast(k: Build, l: Lot): void {
  // the stub of wall beyond the South Gate is a tower of its own, on the slope where the trench's corner falls away
  const s = SOUTH, hw = (l.x1 - l.x0) / 2 - 0.05;
  tower(k, s, { x: (l.x0 + l.x1) / 2 + 0.05, hw, proj: 0.6, rise: TOWER.rise, n: 2 });
}

// ---------------------------------------------------------------------------
// The North Gate
// ---------------------------------------------------------------------------

/**
 * A turret on a gatehouse's roof: loops in its faces, a cornice and a crown,
 * its top at `top`.
 */
function turret(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, top: number): void {
  // its loops come in rows of 2.5, and its body ends just over the top of a row
  const body = top - 0.8;
  b.box(x0, y, z0, x1, body, z1, DURO, { win: { cell: 1.2, storey: 2.5, lit: 0.6, kind: 7 }, faces: 'NESW', seed: x0 * 0.7 + z0 });
  b.box(x0 - 0.12, body, z0 - 0.12, x1 + 0.12, body + 0.25, z1 + 0.12, DURO_LIGHT, { faces: 'NESWTB', top: WALK });
  crown(b, x0 - 0.12, z0 - 0.12, x1 + 0.12, z1 + 0.12, body + 0.25, 0.3, 0.25, DURO, DURO_LIGHT, top - body - 0.55);
}

/**
 * The North Gate, over the Gate Avenue, through which the Augustan column
 * pours: a gatehouse of two blocks, one outside the wall's line and one
 * inside it, over a way eleven wide with its upper corners cut off, and
 * between the blocks a gallery where the wall's walk runs on across it. Its
 * two blast shutters are drawn up into the blocks, and only their feet show,
 * with their lamps, across the head of the way, and lines of light frame the
 * way's mouth on both faces. Four turrets stand on the blocks' corners; the
 * Society's pyramid stands between the two over the city, and in gold on the
 * face outside; Bellona banners hang either side of the way, and the guard
 * keeps the roof. The way is clear across the avenue's two lanes and their
 * sidewalks' edges, x -9.5 to 1.5, to six over the road.
 */
function northGate(k: Build, l: Lot): void {
  const b = k.b, s = NORTH;
  const xm = ROADS.avenue[0][0], half = LANE + 0.5, px0 = xm - half, px1 = xm + half;
  const zN = l.z0, zS = l.z1, gN = Math.min(s.zo, s.zi), gS = Math.max(s.zo, s.zi);
  const ys = F + 5.6, ch = 1, yh = ys + ch, deck = s.walk, roof = s.walk + 2, y0 = F - 0.6, tw = 3, seed = 7.3;
  // the band of the attic that carries loops, a whole number of their rows above y = 0
  const lst = 4, split = Math.ceil(yh / lst) * lst;

  // its two faces, outside and towards the city: the piers, the attic over the way, and the corners its chamfers leave
  for (const [z, d] of [[zS, 1], [zN, -1]] as [number, 1 | -1][]) {
    b.quad([l.x0, y0, z], [px0, y0, z], [px0, roof, z], [l.x0, roof, z], [0, 0, d], DURO);
    b.quad([px1, y0, z], [l.x1, y0, z], [l.x1, roof, z], [px1, roof, z], [0, 0, d], DURO);
    b.quad([px0, yh, z], [px1, yh, z], [px1, split, z], [px0, split, z], [0, 0, d], DURO);
    b.quad([px0, split, z], [px1, split, z], [px1, roof, z], [px0, roof, z], [0, 0, d], DURO, d < 0 ? { win: loops(lst, 1.6, 0.5), L: px1 - px0, seed } : {});
    face3(b, [px0, ys, z], [px0, yh, z], [px0 + ch, yh, z], [0, 0, d], DURO);
    face3(b, [px1, ys, z], [px1, yh, z], [px1 - ch, yh, z], [0, 0, d], DURO);
    // a dark base along the piers' feet, a hair proud, and a lighter band under the roof
    for (const [a, c] of [[l.x0, px0], [px1, l.x1]]) b.quad([a, y0, z + d * 0.03], [c, y0, z + d * 0.03], [c, F + 0.9, z + d * 0.03], [a, F + 0.9, z + d * 0.03], [0, 0, d], DURO_DARK);
    const [c0, c1] = d > 0 ? [z, z + 0.22] : [z - 0.22, z];
    b.box(l.x0, roof - 0.7, c0, l.x1, roof - 0.35, c1, DURO_LIGHT, { faces: (d > 0 ? 'S' : 'N') + 'TBEW' });
  }
  // the way: its sides, its chamfers and its ceiling
  b.quad([px0, y0, zN], [px0, y0, zS], [px0, ys, zS], [px0, ys, zN], [1, 0, 0], DURO);
  b.quad([px1, y0, zS], [px1, y0, zN], [px1, ys, zN], [px1, ys, zS], [-1, 0, 0], DURO);
  const r2 = Math.SQRT1_2;
  b.quad([px0, ys, zN], [px0, ys, zS], [px0 + ch, yh, zS], [px0 + ch, yh, zN], [r2, -r2, 0], DURO_DARK);
  b.quad([px1, ys, zS], [px1, ys, zN], [px1 - ch, yh, zN], [px1 - ch, yh, zS], [-r2, -r2, 0], DURO_DARK);
  b.quad([px0 + ch, yh, zN], [px1 - ch, yh, zN], [px1 - ch, yh, zS], [px0 + ch, yh, zS], [0, -1, 0], DURO_DARK);
  // its outer sides, where the blocks stand clear of the wall
  for (const [x, d] of [[l.x0, -1], [l.x1, 1]] as [number, number][]) {
    for (const [z0, z1] of [[zN, gN], [gS, zS]]) b.quad([x, y0, z0], [x, y0, z1], [x, roof, z1], [x, roof, z0], [d, 0, 0], DURO, { win: loops(lst, 1.6, 0.5), L: z1 - z0, seed: seed + x + z0 });
  }
  // the gallery between the blocks, where the walk runs on, and the blocks' roofs
  b.quad([l.x0, deck, gN], [l.x1, deck, gN], [l.x1, deck, gS], [l.x0, deck, gS], [0, 1, 0], WALK);
  b.quad([l.x0, deck, gS], [l.x1, deck, gS], [l.x1, roof, gS], [l.x0, roof, gS], [0, 0, -1], DURO);
  b.quad([l.x0, deck, gN], [l.x1, deck, gN], [l.x1, roof, gN], [l.x0, roof, gN], [0, 0, 1], DURO);
  b.quad([l.x0, roof, gS], [l.x1, roof, gS], [l.x1, roof, zS], [l.x0, roof, zS], [0, 1, 0], WALK);
  b.quad([l.x0, roof, zN], [l.x1, roof, zN], [l.x1, roof, gN], [l.x0, roof, gN], [0, 1, 0], WALK);
  for (const x of [l.x0 + 3.5, l.x1 - 3.5]) {
    glow(k, x, deck + 1.3, gS - 0.08, 0.36, 0.22, 0.12, AMBER);
    glow(k, x, deck + 1.3, gN + 0.08, 0.36, 0.22, 0.12, AMBER);
  }
  // parapets on the roofs' outer edges, between the turrets
  b.box(l.x0 + tw, roof, zS - 0.4, l.x1 - tw, roof + 0.6, zS, DURO, { top: DURO_LIGHT });
  b.box(l.x0 + tw, roof, zN, l.x1 - tw, roof + 0.6, zN + 0.4, DURO, { top: DURO_LIGHT });
  // the turrets, a hair in from the gatehouse's edges, so that their cornices keep to the lot
  for (const [x0, x1] of [[l.x0 + 0.12, l.x0 + tw], [l.x1 - tw, l.x1 - 0.12]]) {
    for (const [z0, z1] of [[gS, zS - 0.12], [zN + 0.12, gN]]) turret(b, x0, z0, x1, z1, roof, l.top);
  }
  // beacons on masts on the two turrets over the city, and aerials on the two outside, standing on their decks inside the crowns
  const deckOf = l.top - 0.8 + 0.25;
  for (const x of [l.x0 + 0.65, l.x1 - 0.65]) {
    b.cyl(x, zS - 0.65, deckOf, l.top + 1.1, 0.07, 0.05, 4, RUNG, { cap: false });
    glow(k, x, l.top + 1.2, zS - 0.65, 0.3, 0.3, 0.3, BEACON);
    b.cyl(x, zN + 0.65, deckOf, l.top + 2.6, 0.06, 0.03, 4, RUNG, { cap: false });
    glow(k, x, l.top + 2.65, zN + 0.65, 0.18, 0.18, 0.18, BEACON);
  }
  // the blast shutters, drawn up: the foot of each across the head of the way, a little in from either face, with its lamps
  for (const [zsh, d] of [[zS - 1.6, 1], [zN + 1.6, -1]] as [number, number][]) {
    const [s0, s1] = d > 0 ? [zsh - 0.4, zsh] : [zsh, zsh + 0.4];
    b.box(px0, yh - 0.45, s0, px1, yh, s1, DURO_DARK, { faces: 'NSB' });
    for (let i = 0; i < 6; i++) glow(k, px0 + 1.6 + (i * (px1 - px0 - 3.2)) / 5, yh - 0.36, zsh + d * 0.04, 0.34, 0.1, 0.06, AMBER);
  }
  // lines of light round the way's mouth on both faces: up the piers' edges and along the attic's foot
  for (const [z, d] of [[zS, 1], [zN, -1]] as [number, number][]) {
    for (const x of [px0 - 0.12, px1 + 0.12]) glow(k, x, (F + 0.5 + ys) / 2, z + d * 0.05, 0.1, ys - F - 0.5, 0.06, '#ffd27a');
    glow(k, xm, yh + 0.14, z + d * 0.05, px1 - px0 - 2 * ch, 0.1, 0.06, '#ffd27a');
  }
  // the Society's pyramid in gold on the face outside, over the way, for whoever comes to the gate
  const ry = (split + roof) / 2 - 0.2;
  face3(b, [xm - 1.45, ry - 0.95, zN - 0.04], [xm + 1.45, ry - 0.95, zN - 0.04], [xm, ry + 1.05, zN - 0.04], [0, 0, -1], GOLD);
  b.box(xm - 1.75, ry - 1.2, zN - 0.08, xm + 1.75, ry - 1.02, zN, GOLD, { faces: 'NEWTB' });
  // lamps on the walls of the way, and along its ceiling
  for (const [x, d] of [[px0, 1], [px1, -1]] as [number, number][]) {
    for (const z of [zN + 1.2, zS - 0.7]) glow(k, x + d * 0.08, ys - 0.9, z, 0.12, 0.34, 0.5, WARM);
  }
  for (const z of [zN + 2.5, gS + 0.2]) glow(k, xm, yh - 0.06, z, 2.4, 0.08, 0.3, '#ffe9c4');
  // Bellona banners either side of the way, on both faces
  for (const [a, c] of [[l.x0, px0], [px1, l.x1]]) {
    hungBanner(b, (a + c) / 2, F + 8.0, zS, 1, 1.1, 4.0, BELLONA_BLUE, BELLONA_SILVER);
    hungBanner(b, (a + c) / 2, F + 8.0, zN, -1, 1.1, 4.0, BELLONA_BLUE, BELLONA_SILVER);
  }
  // the name over the way, towards the city, and the Society's pyramid over that, between the turrets
  plate(k, SIGN.gate, xm, (split + roof) / 2 - 0.3, zS, 1, 1.45, 9, GOLD);
  const pz = (gS + zS) / 2 - 0.1;
  b.box(xm - 1.1, roof, pz - 1.0, xm + 1.1, roof + 0.45, pz + 1.0, DURO_LIGHT, { top: WALK });
  pyramid(b, xm, roof + 0.45, pz, 1.9, GOLD);
  // the guard on the roof over the city
  for (const sx of [-1, 1]) figure(b, xm + sx * 2.75, pz, roof, GUARD);
  k.lights.push({ x: xm, z: zS + 4.5, r: 12, color: WARM, k: 0.62 }, { x: xm, z: zN - 4, r: 10, color: WARM, k: 0.5 });
}

// ---------------------------------------------------------------------------
// The postern
// ---------------------------------------------------------------------------

/**
 * The postern's way, its doors and its deck, for the show: the way's middle
 * and its sides, the height of its head, the line the doors hang on (the
 * wall's middle), each leaf's width and height, how far in from the way's
 * side a leaf's hinge stands, and the deck on the tower over it, where Ragnar
 * fights the Wind Knight (story 3). The deck stands at the lot's top; the
 * wall's walk is two below it, and rungs on the tower's east face climb from
 * one to the other.
 */
export const POSTERN = (() => {
  const xc = (PG.x0 + PG.x1) / 2, half = 2.2;
  // the hinge stands far enough in from the way's wall that a leaf swung wide, straps and all, clears it
  const hinge = 0.22;
  return {
    xc, x0: xc - half, x1: xc + half, head: F + 5.6, zd: (NWL.z0 + NWL.z1) / 2,
    leaf: half - hinge - 0.04, hinge, doorH: 5.4, foot: F + 0.06,
    deck: { x0: PG.x0, z0: PG.z0, x1: PG.x1, z1: PG.z1, y: PG.top },
  };
})();

/**
 * The postern: a square tower astride the wall over a way four and a half
 * wide, smaller than the North Gate, whose doors Ragnar's Obsidians open from
 * inside (GS 41). Its doors are meshes of their own (`buildPosternDoors`):
 * this builds the tower, the way, the jambs the doors shut against, and the
 * deck on top, open and walkable, with a parapet round it no higher than 0.8,
 * and lower towards the city, so that whoever fights there is seen.
 */
function postern(k: Build, l: Lot): void {
  const b = k.b, P = POSTERN, s = NORTH, deck = l.top, y0 = F - 0.6, zN = l.z0, zS = l.z1, seed = 3.1;
  // over the way the face is plain as high as the first whole row of loops above it, and carries the name
  const win = loops(4, 1.6, 0.55), split = Math.ceil(P.head / 4) * 4;
  for (const [z, d] of [[zS, 1], [zN, -1]] as [number, 1 | -1][]) {
    b.quad([l.x0, y0, z], [P.x0, y0, z], [P.x0, deck, z], [l.x0, deck, z], [0, 0, d], DURO, { win, L: P.x0 - l.x0, seed: seed + d });
    b.quad([P.x1, y0, z], [l.x1, y0, z], [l.x1, deck, z], [P.x1, deck, z], [0, 0, d], DURO, { win, L: l.x1 - P.x1, seed: seed + 2 * d });
    b.quad([P.x0, P.head, z], [P.x1, P.head, z], [P.x1, split, z], [P.x0, split, z], [0, 0, d], DURO);
    b.quad([P.x0, split, z], [P.x1, split, z], [P.x1, deck, z], [P.x0, deck, z], [0, 0, d], DURO, { win, L: P.x1 - P.x0, seed: seed + 3 * d });
    for (const [a, c] of [[l.x0, P.x0], [P.x1, l.x1]]) b.quad([a, y0, z + d * 0.03], [c, y0, z + d * 0.03], [c, F + 0.9, z + d * 0.03], [a, F + 0.9, z + d * 0.03], [0, 0, d], DURO_DARK);
    // a frame round the way's mouth, a hair proud
    const [f0, f1] = d > 0 ? [z, z + 0.18] : [z - 0.18, z], front = d > 0 ? 'S' : 'N';
    b.box(P.x0 - 0.35, F, f0, P.x0, P.head + 0.35, f1, DURO_LIGHT, { faces: front + 'EWT' });
    b.box(P.x1, F, f0, P.x1 + 0.35, P.head + 0.35, f1, DURO_LIGHT, { faces: front + 'EWT' });
    b.box(P.x0, P.head, f0, P.x1, P.head + 0.35, f1, DURO_LIGHT, { faces: front + 'TB' });
    // lamps either side of the way
    for (const x of [P.x0 - 0.95, P.x1 + 0.95]) glow(k, x, F + 3.9, z + d * 0.1, 0.36, 0.3, 0.14, WARM);
  }
  for (const [x, d] of [[l.x0, -1], [l.x1, 1]] as [number, number][]) b.quad([x, y0, zN], [x, y0, zS], [x, deck, zS], [x, deck, zN], [d, 0, 0], DURO, { win, L: zS - zN, seed: seed + x });
  // the way: its sides and its ceiling
  b.quad([P.x0, y0, zN], [P.x0, y0, zS], [P.x0, P.head, zS], [P.x0, P.head, zN], [1, 0, 0], DURO);
  b.quad([P.x1, y0, zS], [P.x1, y0, zN], [P.x1, P.head, zN], [P.x1, P.head, zS], [-1, 0, 0], DURO);
  b.quad([P.x0, P.head, zN], [P.x1, P.head, zN], [P.x1, P.head, zS], [P.x0, P.head, zS], [0, -1, 0], DURO_DARK);
  glow(k, P.xc, P.head - 0.06, (P.zd + zS) / 2 + 0.2, 1.4, 0.08, 0.3, '#ffe9c4');
  // the jambs and the lintel the doors shut against, on the side away from the city, and the sill
  const j0 = P.zd - 0.42, j1 = P.zd - 0.12;
  b.box(P.x0, F, j0, P.x0 + 0.3, P.head, j1, DURO_LIGHT, { faces: 'NSE' });
  b.box(P.x1 - 0.3, F, j0, P.x1, P.head, j1, DURO_LIGHT, { faces: 'NSW' });
  b.box(P.x0 + 0.3, P.head - 0.3, j0, P.x1 - 0.3, P.head, j1, DURO_LIGHT, { faces: 'NSB' });
  b.box(P.x0 + 0.3, F, j0, P.x1 - 0.3, F + 0.06, j1, DURO_LIGHT, { faces: 'NST' });
  // the deck, and its parapet: 0.8 outside and at the sides, 0.5 towards the city
  b.quad([l.x0, deck, zN], [l.x1, deck, zN], [l.x1, deck, zS], [l.x0, deck, zS], [0, 1, 0], WALK);
  const pp = 0.35, hN = 0.8, hS = 0.5, ports: WinSpec = { cell: 1.4, storey: hN, lit: 0.3, kind: 7 };
  b.box(l.x0, deck, zN, l.x1, deck + hN, zN + pp, DURO, { win: ports, top: DURO_LIGHT, seed });
  b.box(l.x0, deck, zS - pp, l.x1, deck + hS, zS, DURO, { top: DURO_LIGHT });
  b.box(l.x0, deck, zN + pp, l.x0 + pp, deck + hN, zS - pp, DURO, { top: DURO_LIGHT });
  b.box(l.x1 - pp, deck, zN + pp, l.x1, deck + hN, zS - pp, DURO, { top: DURO_LIGHT });
  for (const [x, z, h] of [[l.x0, zN, hN], [l.x1, zN, hN], [l.x0, zS, hS], [l.x1, zS, hS]]) glow(k, x + (x < P.xc ? 0.18 : -0.18), deck + h + 0.1, z + (z < P.zd ? 0.18 : -0.18), 0.2, 0.16, 0.2, AMBER);
  // a door from the walk into the tower on either side, lit within, and rungs up its east face from the walk to the deck
  for (const [x, d] of [[l.x0, -1], [l.x1, 1]] as [number, number][]) {
    const xf = x + d * 0.04;
    b.quad([xf, s.walk, P.zd - 0.6], [xf, s.walk, P.zd + 0.6], [xf, s.walk + 1.9, P.zd + 0.6], [xf, s.walk + 1.9, P.zd - 0.6], [d, 0, 0], DOORWAY, { win: interior(2.4) });
  }
  for (let i = 0; i < 4; i++) {
    const y = s.walk + 0.45 + i * 0.45;
    b.box(l.x1, y, P.zd + 0.85, l.x1 + 0.14, y + 0.07, P.zd + 1.35, RUNG, { faces: 'NESTB' });
  }
  // its name, over the way towards the city
  plate(k, SIGN.postern, P.xc, (P.head + split) / 2 + 0.1, zS, 1, 1.05, 7.3, FRAME_STEEL);
  k.lights.push({ x: P.xc, z: zS + 3.5, r: 10, color: WARM, k: 0.55 }, { x: P.xc, z: zN - 3, r: 8, color: AMBER, k: 0.4 });
}

/** The doors once hung, by the build they were hung in, so that hanging them twice hangs them once. */
let hung: { k: Build; doors: { open(f: number): void } } | null = null;

/**
 * The postern's two doors, as meshes of their own that the show swings open
 * when Ragnar sets his shoulder to them (story 3): `open(0)` shut, `open(1)`
 * wide. Each leaf turns about its hinge at the side of the way and swings in,
 * towards the city, until it lies against the way's wall. Durosteel, with
 * three straps across each face and a band down the edge where they meet.
 * Asking twice in one build gives the same doors.
 */
export function buildPosternDoors(k: Build): { open(f: number): void } | null {
  if (hung && hung.k === k) return hung.doors;
  const P = POSTERN, w = P.leaf, h = P.doorH, t = 0.12, material = k.mat.city();
  const leaf = (dir: 1 | -1): THREE.Mesh => {
    const g = new GeoBuilder(), xa = dir > 0 ? 0 : -w, xb = dir > 0 ? w : 0;
    g.box(xa, 0, -t, xb, h, t, DOOR, { faces: 'NESWTB' });
    for (const y of [0.55, h / 2 - 0.15, h - 0.85]) {
      g.box(xa + 0.08, y, t, xb - 0.08, y + 0.3, t + 0.05, STRAP, { faces: 'SEWTB' });
      g.box(xa + 0.08, y, -t - 0.05, xb - 0.08, y + 0.3, -t, STRAP, { faces: 'NEWTB' });
    }
    // the band down the edge where the leaves meet, a hair prouder than the straps
    const xe = dir > 0 ? xb - 0.22 : xa, xf = xe + 0.22;
    g.box(xe, 0.05, t, xf, h - 0.05, t + 0.07, STRAP, { faces: 'SEWTB' });
    g.box(xe, 0.05, -t - 0.07, xf, h - 0.05, -t, STRAP, { faces: 'NEWTB' });
    const m = new THREE.Mesh(g.build(), material);
    m.name = dir > 0 ? 'postern-door-west' : 'postern-door-east';
    m.castShadow = true;
    m.receiveShadow = true;
    m.position.set(dir > 0 ? P.x0 + P.hinge : P.x1 - P.hinge, P.foot, P.zd);
    k.group.add(m);
    return m;
  };
  const west = leaf(1), east = leaf(-1);
  const doors = {
    open(f: number): void {
      const a = (Math.min(1, Math.max(0, f)) * Math.PI) / 2;
      // a turn about the upright by -a swings the west leaf from pointing east to pointing south; the east leaf the other way
      west.rotation.y = -a;
      east.rotation.y = a;
    },
  };
  doors.open(0);
  hung = { k, doors };
  return doors;
}

// ---------------------------------------------------------------------------
// The grates
// ---------------------------------------------------------------------------

/**
 * Where the river runs under the north wall: the wall over an opening that
 * follows the river's banks, with two grates of thick durosteel bars down into
 * the water, one near each face, and through both a hole cut at the water,
 * where the Sons of Ares drilled the night before the Rain (GS 37, 39): three
 * bars cut away above and below it, their cut ends bright, and the crossbar
 * cut with them. Piers frame the opening on both faces, with cold lamps on
 * them over the water. The stretch runs on west to the North Gate's pier.
 */
function grates(k: Build, l: Lot): void {
  const b = k.b, s = NORTH, shape = riverShape(), y0 = F - 0.6, seed = 11.7;
  const xa = NG.x1, xb = l.x1, zo = s.zo, zi = s.zi, gh = F + 3.4, up = s.walk - s.storey, ea = xa - 0.2, L = xb - ea;
  const edge = (z: number): [number, number] => {
    const [w, e] = riverAt(shape, z);
    return [w - 0.05, e + 0.05];
  };
  const [wo, eo] = edge(zo), [wi, ei] = edge(zi);
  // the two faces: either side of the opening, over it, and the band of loops along the top
  for (const [z, d, w, e] of [[zo, -1, wo, eo], [zi, 1, wi, ei]] as [number, 1 | -1, number, number][]) {
    b.quad([ea, y0, z], [w, y0, z], [w, up, z], [ea, up, z], [0, 0, d], DURO);
    b.quad([e, y0, z], [xb, y0, z], [xb, up, z], [e, up, z], [0, 0, d], DURO);
    b.quad([w, gh, z], [e, gh, z], [e, up, z], [w, up, z], [0, 0, d], DURO);
    b.quad([ea, up, z], [xb, up, z], [xb, s.walk, z], [ea, s.walk, z], [0, 0, d], DURO, { win: loops(s.storey), L, seed: seed + d });
    dress(k, s, z, d, ea, xb, y0, { ...(d > 0 ? N_INNER : N_OUTER), gaps: [[w - 0.1, e + 0.1]] });
    // a heavier frame round the opening, a hair proud
    const [f0, f1] = d > 0 ? [z, z + 0.2] : [z - 0.2, z], front = d > 0 ? 'S' : 'N';
    b.box(w - 0.4, F, f0, w, gh + 0.4, f1, DURO_LIGHT, { faces: front + 'EWT' });
    b.box(e, F, f0, e + 0.4, gh + 0.4, f1, DURO_LIGHT, { faces: front + 'EWT' });
    b.box(w, gh, f0, e, gh + 0.4, f1, DURO_LIGHT, { faces: front + 'TB' });
  }
  // the opening's sides, following the banks, and its ceiling
  const side = (x0: number, x1: number, sgn: number): void => {
    const dz = zi - zo, dx = x1 - x0, len = Math.hypot(dx, dz);
    b.quad([x0, F - 0.1, zo], [x1, F - 0.1, zi], [x1, gh, zi], [x0, gh, zo], [(sgn * dz) / len, 0, (-sgn * dx) / len], DURO_DARK);
  };
  side(wo, wi, 1);
  side(eo, ei, -1);
  b.quad([wo, gh, zo], [eo, gh, zo], [ei, gh, zi], [wi, gh, zi], [0, -1, 0], DURO_DARK);
  // the walk over it
  b.quad([xa, s.walk, zo], [xb, s.walk, zo], [xb, s.walk, zi], [xa, s.walk, zi], [0, 1, 0], WALK);
  walkEdges(k, s, xa, xb);

  // the grates, and the hole through both
  const mid = (wi + ei) / 2, hole: [number, number] = [mid - 1.05, mid + 1.05], low = F + 1.25, stub = F - 0.5;
  const grate = (z: number): void => {
    const [w, e] = edge(z), n = Math.floor((e - w - 0.9) / 0.62) + 1, step = (e - w - 0.9) / (n - 1);
    for (let i = 0; i < n; i++) {
      const x = w + 0.45 + i * step;
      if (x > hole[0] && x < hole[1]) {
        b.box(x - 0.13, low, z - 0.13, x + 0.13, gh, z + 0.13, BARS, { faces: 'NESW' });
        b.quad([x - 0.13, low, z - 0.13], [x + 0.13, low, z - 0.13], [x + 0.13, low, z + 0.13], [x - 0.13, low, z + 0.13], [0, -1, 0], CUT);
        b.box(x - 0.13, F - 1.6, z - 0.13, x + 0.13, stub, z + 0.13, BARS, { faces: 'NESW' });
        b.quad([x - 0.13, stub, z + 0.13], [x + 0.13, stub, z + 0.13], [x + 0.13, stub, z - 0.13], [x - 0.13, stub, z - 0.13], [0, 1, 0], CUT);
      } else {
        b.box(x - 0.13, F - 1.6, z - 0.13, x + 0.13, gh, z + 0.13, BARS, { faces: 'NESW' });
      }
    }
    // two crossbars: the lower cut through where the hole is, its cut ends bright
    for (const yc of [F + 0.75, F + 2.55]) {
      const cut = yc < low, pieces: [number, number][] = cut ? [[w - 0.1, hole[0] - 0.05], [hole[1] + 0.05, e + 0.1]] : [[w - 0.1, e + 0.1]];
      for (const [a, c] of pieces) b.box(a, yc - 0.1, z - 0.17, c, yc + 0.1, z + 0.17, BARS, { faces: 'NSTB' });
      if (cut) {
        for (const [x, nx] of [[hole[0] - 0.05, 1], [hole[1] + 0.05, -1]]) b.quad([x, yc - 0.1, z - 0.17], [x, yc - 0.1, z + 0.17], [x, yc + 0.1, z + 0.17], [x, yc + 0.1, z - 0.17], [nx, 0, 0], CUT);
      }
    }
  };
  grate(zi - 0.35);
  grate(zo + 0.35);

  // piers either side of the opening: full depth towards the city, shallower outside, where the apron's verge is
  for (const [z0, z1, top, w, e] of [[zi, l.z1, F + 6.2, wi, ei], [l.z0 + 0.5, zo, F + 5.2, wo, eo]] as [number, number, number, number, number][]) {
    const d = z1 > zi - 0.01 ? 1 : -1, front = d > 0 ? 'S' : 'N';
    for (const [x0, x1, nx] of [[l.x0, w - 0.4, 1], [e + 0.4, l.x1, -1]] as [number, number, number][]) {
      b.box(x0, y0, z0, x1, top, z1, DURO, { faces: front + 'EW' });
      b.box(x0 - 0.12, top, z0 - (d < 0 ? 0.12 : 0), x1 + 0.12, top + 0.35, z1 + (d > 0 ? 0.12 : 0), DURO_LIGHT, { faces: front + 'EWTB', top: WALK });
      // a cold lamp on its cap, over the water
      glow(k, nx > 0 ? x1 - 0.25 : x0 + 0.25, top + 0.6, (z0 + z1) / 2, 0.3, 0.3, 0.3, COLD);
    }
  }
  // the name over the opening, towards the city
  plate(k, SIGN.grates, mid, gh + 1.35, zi, 1, 1.3, 8.2, FRAME_STEEL);
  k.lights.push({ x: mid, z: l.z1 + 3, r: 10, color: COLD, k: 0.6 }, { x: mid, z: l.z0 - 3, r: 8, color: COLD, k: 0.45 });
}

// ---------------------------------------------------------------------------
// The South Gate
// ---------------------------------------------------------------------------

/**
 * The South Gate, where the road to the camp leaves the city: two towers
 * either side of the way, from the slope outside the trench up to their
 * decks, and between them a bridge that carries the wall's walk across over
 * the way, with the gate's name on its face outside. The towers stop short of
 * the lot's south edge, where the road bends west and falls away down the
 * flank. The way is clear from x 64 to 76, to five and more over the road.
 */
function southGate(k: Build, l: Lot): void {
  const b = k.b, s = SOUTH, seed = 21.3;
  const corner = ROADS.south.find(([, z]) => z >= l.z0 && z <= l.z1), xm = corner ? corner[0] : (l.x0 + l.x1) / 2;
  // the towers stand only 0.6 out from the wall's face: beyond that the road bends west under the west tower's corner
  const half = 6, wx1 = xm - half, ex0 = xm + half, tz0 = l.z0 + 0.2, tz1 = s.zo + 0.6, td = l.top - 0.6, head = F + 5.4;
  [[l.x0, wx1], [ex0, l.x1]].forEach(([x0, x1], i) => {
    const y0 = footOf(x0, tz0, x1, tz1), inner = i === 0 ? x1 : x0, outerX = i === 0 ? x0 : x1;
    b.box(x0, y0, tz0, x1, td - 0.35, tz1, DURO, { win: loops(4, 1.5, 0.6), faces: 'NESW', seed: seed + i });
    // its footing, stopping a hair short of its face on the way, so that nothing stands in the way; taller than the wall's plinth
    const [f0, f1] = i === 0 ? [x0 - 0.15, x1 - 0.02] : [x0 + 0.02, x1 + 0.15];
    b.box(f0, y0, tz0 - 0.15, f1, F + 1.1, tz1 + 0.15, DURO_DARK, { faces: 'NESWT', top: DURO_LIGHT });
    b.box(x0 - 0.15, td - 0.35, tz0 - 0.15, x1 + 0.15, td, tz1 + 0.15, DURO_LIGHT, { faces: 'NESWTB', top: WALK });
    crown(b, x0 - 0.15, tz0 - 0.15, x1 + 0.15, tz1 + 0.15, td, (l.top - td) / 2, 0.3, DURO, DURO_LIGHT, (l.top - td) / 2);
    // a line of light up its edge at the way's mouth, on the face outside and the face towards the city
    for (const [z, d] of [[tz1, 1], [tz0, -1]] as [number, number][]) glow(k, inner + (i === 0 ? -0.12 : 0.12), (F + 0.5 + head) / 2, z + d * 0.05, 0.1, head - F - 0.5, 0.06, '#ffd27a');
    // a beacon on a mast that stands on its deck, at the corner outside
    const mx = outerX + (i === 0 ? 0.45 : -0.45);
    b.cyl(mx, tz1 - 0.45, td, td + 2.0, 0.08, 0.05, 4, RUNG, { cap: false });
    glow(k, mx, td + 2.1, tz1 - 0.45, 0.32, 0.32, 0.32, BEACON);
    // Bellona banners on its faces outside and towards the city
    const bx = (x0 + x1) / 2;
    hungBanner(b, bx, td - 1.0, tz1, 1, 1.6, 4.2, BELLONA_BLUE, BELLONA_SILVER);
    hungBanner(b, bx, td - 1.0, tz0, -1, 1.4, 3.6, BELLONA_BLUE, BELLONA_SILVER);
    // lamps on its face on the way, at both mouths
    for (const z of [tz0 + 0.8, tz1 - 0.8]) glow(k, inner + (i === 0 ? 0.08 : -0.08), F + 4.9, z, 0.12, 0.34, 0.5, WARM);
  });
  // the bridge: the walk across over the way, its soffit, its parapet outside and its kerb inside
  const za = Math.min(s.zo, s.zi), zb = Math.max(s.zo, s.zi);
  b.box(wx1, head, za, ex0, s.walk, zb, DURO, { faces: 'NS' });
  b.quad([wx1, head, za], [ex0, head, za], [ex0, head, zb], [wx1, head, zb], [0, -1, 0], DURO_DARK);
  b.quad([wx1, s.walk, za], [ex0, s.walk, za], [ex0, s.walk, zb], [wx1, s.walk, zb], [0, 1, 0], WALK);
  walkEdges(k, s, wx1, ex0);
  for (const [z, d] of [[zb, 1], [za, -1]] as [number, 1 | -1][]) {
    const [c0, c1] = d > 0 ? [z, z + 0.22] : [z - 0.22, z];
    b.box(wx1, head, c0, ex0, head + 0.35, c1, DURO_LIGHT, { faces: (d > 0 ? 'S' : 'N') + 'TB' });
  }
  glow(k, xm, head - 0.06, (za + zb) / 2, 3.2, 0.08, 0.3, '#ffe9c4');
  // its name on the bridge's face outside, where the view the tile opens with reads it
  plate(k, SIGN.south, xm, head + 1.45, zb, 1, 1.45, 9, FRAME_STEEL);
  for (const sx of [-1, 1]) figure(b, xm + sx * 3.6, (za + zb) / 2 - 0.2, s.walk, GUARD);
  k.lights.push({ x: xm, z: tz1 + 4.5, r: 12, color: WARM, k: 0.6 }, { x: xm, z: tz0 - 4, r: 11, color: WARM, k: 0.55 });
}

// ---------------------------------------------------------------------------
// Inside the north wall: the mud banks and the forest belt
// ---------------------------------------------------------------------------

/**
 * The mud banks inside the grates, where the group comes up out of the river
 * (story 2): on either side of the river a low bank of dry mud that rises a
 * little from the paving and slopes away wet into the water, with tufts of
 * reeds along the water and clods of mud on the banks. Nothing stands taller
 * than 0.6, and the banks are open for the figures.
 */
function banks(k: Build): void {
  const b = k.b, st = STAGES.banks, shape = riverShape(), r = rng(5309);
  // clear of the avenue's sidewalk, which is 4 wide (roads.ts)
  const west0 = Math.max(st.x0, ROADS.avenue[0][0] + LANE + 4) + 0.2, east1 = st.x1 - 0.4;
  const zs: number[] = [NORTH.zi + 0.05];
  for (let z = Math.ceil(st.z0); z <= st.z1 + 1e-6; z += 1) if (z > zs[zs.length - 1] + 0.4) zs.push(z);
  if (zs[zs.length - 1] < st.z1 - 0.1) zs.push(st.z1);
  type Sec = { z: number; w: P2[]; e: P2[] };
  const secs: Sec[] = zs.map((z) => {
    const [we, ee] = riverAt(shape, z), cw = 0.2 + r() * 0.12, ce = 0.2 + r() * 0.12, dw = 1.05 + r() * 0.35, de = 1.05 + r() * 0.35;
    return {
      z,
      w: [[west0, F + 0.04], [we - 0.75, F + cw], [we + 0.05, F + 0.13], [we + dw, F - 1.05]],
      e: [[east1, F + 0.04], [ee + 0.75, F + ce], [ee - 0.05, F + 0.13], [ee - de, F - 1.05]],
    };
  });
  const colours = [MUD_DRY, MUD, MUD_WET];
  for (let i = 0; i + 1 < secs.length; i++) {
    const a = secs[i], c = secs[i + 1];
    for (const side of ['w', 'e'] as const) {
      for (let j = 0; j < 3; j++) {
        const p0: V3 = [a[side][j][0], a[side][j][1], a.z], p1: V3 = [a[side][j + 1][0], a[side][j + 1][1], a.z];
        const q0: V3 = [c[side][j][0], c[side][j][1], c.z], q1: V3 = [c[side][j + 1][0], c[side][j + 1][1], c.z];
        slope3(b, p0, p1, q1, colours[j]);
        slope3(b, p0, q1, q0, colours[j]);
      }
    }
  }
  // both ends of each bank closed, so that none is hollow seen from along the river
  for (const [sec, nz] of [[secs[0], -1], [secs[secs.length - 1], 1]] as [Sec, number][]) {
    for (const side of ['w', 'e'] as const) {
      const p = sec[side], ring: P2[] = [[p[0][0], F], ...p, [p[2][0] - (side === 'w' ? 0.05 : -0.05), F - 1.05]];
      for (let i = 1; i + 1 < ring.length; i++) face3(b, [ring[0][0], ring[0][1], sec.z], [ring[i][0], ring[i][1], sec.z], [ring[i + 1][0], ring[i + 1][1], sec.z], [0, 0, nz], colours[Math.min(2, i - 1)] ?? MUD);
    }
  }
  /** The height of a bank's surface at a place across it, between the sections either side of z. */
  const surface = (side: 'w' | 'e', t: number, z: number): [number, number] => {
    let i = 0;
    while (i + 2 < secs.length && secs[i + 1].z < z) i++;
    const a = secs[i], c = secs[i + 1], f = Math.min(1, Math.max(0, (z - a.z) / (c.z - a.z)));
    const at = (s: Sec): P2 => {
      const p = s[side], seg = Math.min(2, Math.floor(t)), u = t - seg;
      return [p[seg][0] + (p[seg + 1][0] - p[seg][0]) * u, p[seg][1] + (p[seg + 1][1] - p[seg][1]) * u];
    };
    const pa = at(a), pc = at(c);
    return [pa[0] + (pc[0] - pa[0]) * f, pa[1] + (pc[1] - pa[1]) * f];
  };
  // reeds along the water, in tufts of three blades, none taller than 0.6
  const reed = (x: number, y: number, z: number): void => {
    for (let i = 0; i < 3; i++) {
      const a = r() * Math.PI, ax = Math.cos(a), az = Math.sin(a), h = 0.3 + r() * 0.27, lean = (r() - 0.5) * 0.3, wd = 0.055;
      const tip: V3 = [x + ax * lean, y + h, z + az * lean], col = REEDS[Math.floor(r() * REEDS.length)];
      const p: V3 = [x - ax * wd, y, z - az * wd], q: V3 = [x + ax * wd, y, z + az * wd];
      face3(b, p, q, tip, [-az, 0, ax], col);
      face3(b, p, q, tip, [az, 0, -ax], col);
    }
  };
  for (const side of ['w', 'e'] as const) {
    for (let z = st.z0 + 0.4; z < st.z1 - 0.3; z += 0.8 + r() * 0.5) {
      // on the wet slope, a little above the water, and now and then on the crest
      const t = 2.15 + r() * 0.3, [x, y] = surface(side, t, z);
      reed(x, y - 0.02, z);
      if (r() < 0.35) {
        const [cx, cy] = surface(side, 1 + r() * 0.8, z + 0.3);
        reed(cx, cy - 0.02, z + 0.3);
      }
    }
    // clods of mud on the bank
    for (let i = 0; i < 4; i++) {
      const z = st.z0 + 1.5 + i * 2.3 + r() * 1.2, [x, y] = surface(side, 0.5 + r() * 0.9, z);
      b.obox(x, y + 0.03, z, 0.22 + r() * 0.15, 0.1, 0.16 + r() * 0.1, r() * Math.PI, MUD_WET);
    }
  }
}

/**
 * The forest inside the north wall, which separates it from the commercial
 * district (GS 41): two staggered rows of trees, round ones and slender
 * ones, along the wall's foot from its west end to its east end, but not on
 * a stage, not across the avenue's corridor or the river, and kept low
 * before the city's name. A few people shelter among them.
 */
function forest(k: Build): void {
  const r = rng(8821), foot = Math.max(NORTH.zo, NORTH.zi), rows = [foot + 2.4, foot + 4.7];
  const runs: [number, number][] = [[NWL.x0 + 1, STAGES.postern.x0 - 2.5], [STAGES.banks.x1 + 5, NEL.x1 - 1]];
  const clearing: [number, number] = [AGEA_X - 5.5, AGEA_X + 7.5];
  for (const [x0, x1] of runs) {
    for (let x = x0; x <= x1; x += 2.6) {
      rows.forEach((zr, row) => {
        const tx = x + row * 1.3 + (r() - 0.5) * 0.9, tz = zr + (r() - 0.5) * 0.6;
        const tall = r() < 0.3, size = tall ? 0.6 + r() * 0.2 : (row === 0 ? 0.52 : 0.58) + r() * 0.18;
        if (tx > clearing[0] && tx < clearing[1]) {
          // before the name: only low bushes, and not before its middle
          if (row === 0 && Math.abs(tx - AGEA_X) > 2.5 && open(tx, tz, 0.6)) k.tree(tx, tz, 0.24 + r() * 0.06, false, F);
          return;
        }
        if (!open(tx, tz, 0.8)) return;
        if ((tall ? 9.0 : 8.4) * size > underBoards(tx, tz)) return;
        k.tree(tx, tz, size, tall, F);
      });
    }
  }
  // a few people sheltering among the trees
  for (const f of [0.18, 0.37, 0.55, 0.74, 0.9]) {
    const [x0, x1] = f < 0.4 ? runs[0] : runs[1], g = f < 0.4 ? f / 0.4 : (f - 0.4) / 0.6;
    const x = x0 + (x1 - x0) * g, z = (rows[0] + rows[1]) / 2 + (r() - 0.5) * 0.6;
    if (open(x, z, 0.5)) k.person(x, z, F);
  }
}

// ---------------------------------------------------------------------------
// What the tile calls
// ---------------------------------------------------------------------------

/** A model for each lot this file builds, by the id of the lot in plan.ts. */
export const MODELS: Record<string, Model> = {
  'wall-n-w': northWallWest,
  'ragnar-gate': postern,
  'wall-n-m': northWallMiddle,
  'north-gate': northGate,
  grates,
  'wall-n-e': northWallEast,
  'wall-s-w': southWallWest,
  'south-gate': southGate,
  'wall-s-e': southWallEast,
};
/** Lots built as part of another lot's model or by `extras`, which get no box either. */
export const COVERS: string[] = [];

/** Whatever this file builds that is not one of the plan's lots: the mud banks, the forest belt, and the postern's doors. */
export function extras(k: Build): void {
  banks(k);
  forest(k);
  // the postern's doors, hung shut, so that they stand even if the show fails; the show asks for them again and is given these, and swings them
  buildPosternDoors(k);
}
