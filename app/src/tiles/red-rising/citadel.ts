// The Citadel of Agea: its white and red spires, the lions of House Augustus, its outer wall and tea gardens, the bunker's door, the terrace where Lorn taught the Willow Way, the landing pads with the Sovereign's shuttle and three decoys, and the Field of Mars.
//
// From the books, as the research note gives them: the Citadel is the
// government's seat, "a cluster of white and red spires" behind an outer wall,
// with lion statues for House Augustus (GS 41); inside the wall a decorative
// wall and parks where Golds and Silvers take afternoon tea (GS 41); landing
// pads large enough for a hundred craft, where the Sovereign's shuttle and
// three decoys exactly like it stand (GS 41); a bunker under it, where the
// Sovereign waits out the battle (IG 40); and before its grounds the Field of
// Mars, a plaza of white stone where Triumph parades end (GS 51).
//
// The books give no shapes for any of it. What is drawn here is this tile's
// own, after the Society's dress, which is Roman, and its means, which are not:
// seven tall shafts of white marble, each tapering a little and ending in a
// long, sharp crimson spire with a gold finial, two of them tipped with a
// faceted crystal, one split at its crown, one a blade; a vein of crimson
// glass up every shaft, lit at night; a podium of white stone under them, its
// halls and wings flat-roofed behind balustrades, with colonnades; bridges and
// flying buttresses between the spires; on its east front, on the gate's
// axis, a great portico of eight columns under a pediment, broad steps, and
// large gold lions of House Augustus on plinths either side; a few long
// crimson banners with the gold lion; an outer wall, high on the north, the
// east and the west and a low garden wall on the south, where the city's own
// south wall stands close behind it; a gate court let into the east wall,
// with its lions; tea gardens with a round temple; an armoured door; a stone
// terrace with a balustrade and broad steps; a raised deck of pads over lit
// hangars; and on the Field a gold lion on a plinth. The shuttle is drawn
// here too, in white and gold.
//
// Everything takes its place from plan.ts.

import * as THREE from 'three';
import { GeoBuilder, interior, rng, type V3, type WinSpec } from '../../engine/geo';
import { area, oval, rect, type P2 } from '../../engine/ground';
import { archway, figure, hipped, lathe, parasol, roundel, tri, type Dress } from '../../engine/parts';
import { drum, face3, hip, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import {
  AMBER, AUGUSTUS_GOLD, AUGUSTUS_RED, BRONZE, CITADEL_RED, CITADEL_WHITE, CITADEL_WIN, GOLD, MARBLE, PRAETORIAN, STONE, STONE_DARK, TO_VIEW, WARM,
  banner, lion, nameBoard, nameSign,
} from './look';
import type { Model } from './models';
import { F, HERO_SPOTS, TURNS, lotOf } from './plan';
import { underBoards } from './space';

// ---------------------------------------------------------------------------
// Where things are, all from the plan
// ---------------------------------------------------------------------------

const C = lotOf('citadel'), WL = lotOf('citadel-wall'), BK = lotOf('bunker'), TR = lotOf('terrace'), PD = lotOf('pads'), FD = lotOf('field');
const HERO_PAD = HERO_SPOTS.find((h) => h.id === 'pad')!, HERO_FIELD = HERO_SPOTS.find((h) => h.id === 'field')!;
const RING = TURNS.field;

const WHITE = CITADEL_WHITE, RED = CITADEL_RED, RED_TOP = 0x96281f;
/** The spires' crimson, the glass of their veins (dark by day, red light at night), a crystal tip's glass, and the bright gold of the finials. */
const CRIMSON = 0xa8182c, CRIMSON_GLASS = 0x6e0c1a, CRYSTAL = 0xcdeeff, BRIGHT_GOLD = 0xe9c24c;
/** The flat tops of ledges and roofs: the white stone, a shade down. */
const LEDGE = 0xe3dccd, ROOF = 0xd9d1c1, SOFFIT = 0xd2cabb;
/** A doorway that is open into a lit room. */
const DOORWAY = 0x4c3622;
const PLINTH = STONE_DARK;
const LAWN = 0x7ea45a, HEDGE = 0x4d7a3b, GRAVEL = 0xe2d8bf, BASIN = 0x8fc2d6, RED_STONE = 0xa8392d, GREY_STONE = 0xb8b1a4;
const DECK = 0x8e8a84, HANGAR = 0x4d3e2c, STEEL_DOOR = 0xa3a8ae, ARMOUR = 0x656a71;
/** The windows of the podium and its halls: tall slits, few of them lit at night, so that the Citadel stays white stone with veins of red light. */
const SLITS: WinSpec = { ...CITADEL_WIN, cell: 2.4, lit: 0.3 };
/** A balustrade's openings: small dark squares in a band of white, never lit. The band lies on a whole storey of it over y = 0. */
const BALUSTERS: WinSpec = { cell: 0.5, storey: 0.8, lit: 0, kind: 4 };
/** Which way the view the tile opens with looks back from, as a turn; and the way across it. */
const FACING_VIEW = Math.atan2(TO_VIEW[2], TO_VIEW[0]);
const ACROSS: [number, number] = [TO_VIEW[2], -TO_VIEW[0]];

/** The podium's roof, from which the spires and halls rise. */
const PODIUM = { x0: C.x0 + 2, z0: C.z0 + 3, x1: C.x1 - 2, z1: C.z1 - 1, y: F + 10 };
/** The Citadel's front: the great portico on the podium's east face, on the axis of the gate. */
const AXIS_Z = C.z0 + 18;
const PORTICO = { z0: AXIS_Z - 8.6, z1: AXIS_Z + 8.6, front: C.x1, sty: F + 1.6, top: F + 11.2 };
/** The outer wall: how thick, how high its walk is, and the garden wall on the south. */
const WALL_T = 2, WALK = WL.top, LOW = { y: F + 1.4, t: 1.5 };
/** The gate court let into the east wall: where the recessed wall stands, how far it runs, and the gate's opening in it. */
const COURT = { x0: WL.x1 - 2 * WALL_T, z0: AXIS_Z - 9, z1: AXIS_Z + 9, gate: 4 };
/** The decorative wall inside the outer one, between the Citadel's walk and the gardens. */
const DECO = { z: PODIUM.z1 + 1.6, t: 0.45, x0: WL.x0 + WALL_T, x1: PODIUM.x1 - 6.5 };
/** The tea gardens in the south-west of the grounds, and the middle of their cross of paths. */
const GARDEN = { x0: WL.x0 + WALL_T, x1: BK.x0 - 1, z0: DECO.z + DECO.t, z1: WL.z1 - LOW.t };
const GX = (GARDEN.x0 + GARDEN.x1) / 2 + 0.5, GZ = (GARDEN.z0 + GARDEN.z1) / 2;

/** The landing pads' deck, its height, and the rank of four pads across its north half. */
const DECK_Y = PD.top;
const SHUTTLE_W = 3.6;
const PAD_Z = PD.z0 + 5.2;

/** The terrace: its floor, where its flat ends, and its broad steps down on the south. */
const TER = { y: TR.top, flatZ1: TR.z1 - 5.2, steps: 7, rise: (TR.top - F) / 8, tread: 0.65, sx0: TR.x0 + 2, sx1: TR.x1 - 2 };

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

/** A flat round-headed shape a hair proud of a wall that faces (nx, nz): a door, a niche. Lit at night if `lit` is given. */
function arched(b: GeoBuilder, x: number, z: number, nx: number, nz: number, w: number, y0: number, spring: number, color: number, lit = 0, out = 0.04): void {
  const ax = -nz, az = nx, n: V3 = [nx, 0, nz], o = lit > 0 ? { win: interior(lit) } : {};
  const p = (s: number, y: number): V3 => [x + nx * out + ax * s, y, z + nz * out + az * s];
  b.quad(p(-w / 2, y0), p(w / 2, y0), p(w / 2, spring), p(-w / 2, spring), n, color, o);
  const seg = 5;
  for (let i = 0; i < seg; i++) {
    const a0 = (Math.PI * i) / seg, a1 = (Math.PI * (i + 1)) / seg;
    tri(b, p(0, spring), p((Math.cos(a0) * w) / 2, spring + (Math.sin(a0) * w) / 2), p((Math.cos(a1) * w) / 2, spring + (Math.sin(a1) * w) / 2), n, color, o);
  }
}

/**
 * The lion of House Augustus as a flat sign in gold, sitting, in profile:
 * haunch, body, mane, head and jaw, foreleg and tail, each a quad in the
 * plane that `p` maps (s across, y up) to the world, `size` across, facing
 * along +s if `facing` is 1.
 */
function lionSign(b: GeoBuilder, p: (s: number, y: number) => V3, n: V3, cs: number, cy: number, size: number, facing = 1, color = BRIGHT_GOLD): void {
  const r = (s0: number, y0: number, s1: number, y1: number): void =>
    b.quad(p(cs + s0 * size * facing, cy + y0 * size), p(cs + s1 * size * facing, cy + y0 * size), p(cs + s1 * size * facing, cy + y1 * size), p(cs + s0 * size * facing, cy + y1 * size), n, color);
  r(-0.5, -0.5, 0.0, 0.05); // haunch
  r(-0.12, -0.5, 0.3, 0.22); // body
  r(0.0, 0.02, 0.5, 0.62); // mane
  r(0.34, 0.14, 0.68, 0.46); // head
  r(0.5, 0.04, 0.72, 0.17); // jaw
  r(0.17, -0.5, 0.31, 0.0); // foreleg
  r(-0.66, -0.32, -0.54, 0.22); // tail
  r(-0.74, 0.2, -0.5, 0.36); // its tuft
}

/**
 * A long banner hung flat on a wall that faces north, east, south or west:
 * crimson cloth from y1 down to y0 with a swallowtail, the gold lion of House
 * Augustus on it, and a gold rod at its head. (x, z) is the middle of its top
 * on the wall's face.
 */
function wallBanner(b: GeoBuilder, x: number, z: number, face: 'N' | 'E' | 'S' | 'W', w: number, y0: number, y1: number): void {
  const nx = face === 'E' ? 1 : face === 'W' ? -1 : 0, nz = face === 'S' ? 1 : face === 'N' ? -1 : 0;
  const ax = -nz, az = nx, n: V3 = [nx, 0, nz];
  const at = (out: number) => (s: number, y: number): V3 => [x + nx * out + ax * s, y, z + nz * out + az * s];
  const p = at(0.05), h = w / 2, tail = Math.min(1.1, w * 0.4);
  b.quad(p(-h, y0), p(h, y0), p(h, y1), p(-h, y1), n, CRIMSON);
  face3(b, p(-h, y0), p(0, y0 - tail * 0.3), p(-h, y0 - tail), n, CRIMSON);
  face3(b, p(-h, y0), p(h, y0), p(0, y0 - tail * 0.3), n, CRIMSON);
  face3(b, p(h, y0), p(h, y0 - tail), p(0, y0 - tail * 0.3), n, CRIMSON);
  lionSign(b, at(0.08), n, 0, y1 - Math.min(2.2, (y1 - y0) * 0.32), w * 0.72);
  b.beam(at(0.14)(-h - 0.2, y1 + 0.08), at(0.14)(h + 0.2, y1 + 0.08), 0.08, 0.08, BRIGHT_GOLD);
}

/** A triangular fin against a shaft: a buttress that leans from `rout` at y0 in to `rin` at y1, along the angle `a`, `t` thick. */
function fin(b: GeoBuilder, x: number, z: number, a: number, rin: number, rout: number, y0: number, y1: number, t: number, color: number): void {
  const ux = Math.cos(a), uz = Math.sin(a), px = -uz, pz = ux;
  const P = (r: number, y: number, s: number): V3 => [x + ux * r + (px * s * t) / 2, y, z + uz * r + (pz * s * t) / 2];
  for (const s of [-1, 1]) face3(b, P(rin, y0, s), P(rout, y0, s), P(rin, y1, s), [px * s, 0, pz * s], color);
  const l = Math.hypot(y1 - y0, rout - rin);
  b.quad(P(rout, y0, -1), P(rout, y0, 1), P(rin, y1, 1), P(rin, y1, -1), [(ux * (y1 - y0)) / l, (rout - rin) / l, (uz * (y1 - y0)) / l], color);
}

/** A column: a base, a shaft that tapers a little, a capital. */
function column(b: GeoBuilder, x: number, z: number, y0: number, y1: number, r: number): void {
  b.box(x - r - 0.1, y0, z - r - 0.1, x + r + 0.1, y0 + 0.25, z + r + 0.1, WHITE, { top: LEDGE });
  b.cyl(x, z, y0 + 0.25, y1 - 0.35, r, r * 0.86, 10, WHITE, { cap: false });
  b.box(x - r - 0.14, y1 - 0.35, z - r - 0.14, x + r + 0.14, y1, z + r + 0.14, WHITE, { faces: 'NESWB' });
}

/**
 * A pierced balustrade round the edge of a flat roof: a solid course from y0
 * up to `yb`, which must lie on a whole number of 0.8 over y = 0, the
 * balustrade's band of openings from there, and a coping on it.
 */
function balustrade(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y0: number, yb: number, t = 0.28): void {
  const y1 = yb + 0.8;
  if (yb - y0 > 0.01) {
    b.box(x0, y0, z0, x1, yb, z0 + t, WHITE, { faces: 'NSEW' });
    b.box(x0, y0, z1 - t, x1, yb, z1, WHITE, { faces: 'NSEW' });
    b.box(x0, y0, z0 + t, x0 + t, yb, z1 - t, WHITE, { faces: 'EW' });
    b.box(x1 - t, y0, z0 + t, x1, yb, z1 - t, WHITE, { faces: 'EW' });
  }
  b.box(x0, yb, z0, x1, y1, z0 + t, WHITE, { win: BALUSTERS, faces: 'NS' });
  b.box(x0, yb, z1 - t, x1, y1, z1, WHITE, { win: BALUSTERS, faces: 'NS' });
  b.box(x0, yb, z0 + t, x0 + t, y1, z1 - t, WHITE, { win: BALUSTERS, faces: 'EW' });
  b.box(x1 - t, yb, z0 + t, x1, y1, z1 - t, WHITE, { win: BALUSTERS, faces: 'EW' });
  for (const [ax, az] of [[x0, z0], [x1 - t, z0], [x1 - t, z1 - t], [x0, z1 - t]]) b.box(ax, yb, az, ax + t, y1, az + t, WHITE, { faces: 'NESW' });
  const c = 0.05, h = 0.14;
  b.box(x0 - c, y1, z0 - c, x1 + c, y1 + h, z0 + t + c, LEDGE);
  b.box(x0 - c, y1, z1 - t - c, x1 + c, y1 + h, z1 + c, LEDGE);
  b.box(x0 - c, y1, z0 + t + c, x0 + t + c, y1 + h, z1 - t - c, LEDGE);
  b.box(x1 - t - c, y1, z0 + t + c, x1 + c, y1 + h, z1 - t - c, LEDGE);
}

/** A guard of the Citadel's own: a Gray in uniform and helm. */
const GRAY: Dress = { coat: 0x7f848c, legs: 0x4d525a, hat: 0x9da3aa, hatH: 0.32 };
/** One of the Sovereign's Praetorians, in purple and black. */
const PRAETORIAN_GUARD: Dress = { coat: PRAETORIAN, legs: 0x221f28, hat: 0x2d2734, hatH: 0.4 };
/** Golds and Silvers at their tea. */
const GOLD_DRESS: Dress = { coat: 0xd9b24f, legs: 0xefe5cb, hat: 0xe8c55a, hatH: 0.14 };
const SILVER_DRESS: Dress = { coat: 0xc8ced5, legs: 0x5e646c, hat: 0xbcc2c9, hatH: 0.12 };
/** The deck's crew, in the Oranges' overalls. */
const CREW: Dress = { coat: 0xe07d32, legs: 0x3b3b42, hat: 0x2d2d33, hatH: 0.16 };

// ---------------------------------------------------------------------------
// The spires
// ---------------------------------------------------------------------------

/** How a spire ends: a needle; a needle whose tip is a faceted crystal; split at its crown into two blades; or one flat blade. */
type Crown = 'needle' | 'crystal' | 'split' | 'blade';

interface SpireDef {
  /** Where it stands, from the lot's north-west corner. */
  u: number; v: number;
  /** Its shaft's radius at the foot, to the corners, and how many sides it has. */
  r: number; sides: number;
  /** Where its shaft ends and its spire begins, and the spire's tip. */
  top: number; tip: number;
  crown: Crown;
  /** A gold finial over the tip, and how tall. */
  finial: number;
  /** Fins at the foot, at these angles in degrees (0 east, 90 south). */
  fins?: number[];
  /** Flying buttresses down to piers on the podium's roof: at these angles, the height they leave the shaft at, and how far out their piers stand. */
  flyers?: { at: number[]; y: number; out: number };
}

/**
 * Seven spires in a cluster, the tallest in the north-west, stepping down to
 * the south-east. Each spire is three to five times as tall as its shaft is
 * wide. The second is east of where the north-west's sight lines run, so that
 * the screen on the tower behind the Citadel is seen from the view the tile
 * opens with.
 */
const SPIRES: SpireDef[] = [
  { u: 14, v: 13, r: 3.7, sides: 12, top: F + 46, tip: C.top, crown: 'needle', finial: 4, fins: [135, 225], flyers: { at: [270, 225], y: F + 27, out: 9.0 } },
  { u: 29.4, v: 7, r: 2.4, sides: 8, top: F + 39, tip: F + 60, crown: 'split', finial: 0 },
  { u: 7.5, v: 26, r: 2.4, sides: 8, top: F + 34, tip: F + 54, crown: 'crystal', finial: 0, fins: [180], flyers: { at: [135, 90], y: F + 24, out: 6.0 } },
  { u: 5, v: 16, r: 1.9, sides: 8, top: F + 34, tip: F + 50, crown: 'needle', finial: 1.4, fins: [270] },
  { u: 26.5, v: AXIS_Z - C.z0, r: 2.0, sides: 8, top: F + 24, tip: F + 40, crown: 'crystal', finial: 0, fins: [0] },
  { u: 19, v: 27, r: 1.9, sides: 8, top: F + 21, tip: F + 34, crown: 'blade', finial: 1.0, fins: [90] },
  { u: 27, v: 28.5, r: 1.5, sides: 8, top: F + 14, tip: F + 24, crown: 'needle', finial: 0.8 },
];

/** Where each spire stands, its shaft's radius at its top, and the turn of its faces, so that one face looks at the view the tile opens with. */
interface SpireAt { x: number; z: number; def: SpireDef; rTop: number; phase: number }

const SP: SpireAt[] = SPIRES.map((s) => ({ x: C.x0 + s.u, z: C.z0 + s.v, def: s, rTop: s.r * 0.82, phase: FACING_VIEW - Math.PI / s.sides }));

/** A spire's shaft's radius, to its corners, at a height. */
const shaftR = (s: SpireAt, y: number): number => s.def.r + ((s.rTop - s.def.r) * (y - PODIUM.y)) / (s.def.top - PODIUM.y);

/** How far a spire's surface is from its middle at a height, to the middle of its faces. */
function faceAt(s: SpireAt, y: number): number {
  const c = Math.cos(Math.PI / s.def.sides);
  if (y <= s.def.top) return shaftR(s, y) * c;
  return s.rTop * Math.max(0, (s.def.tip - y) / (s.def.tip - s.def.top)) * c;
}

/** The normal of a face between three corners that looks away from a point. */
function away(a: V3, c: V3, d: V3, from: V3): V3 {
  const u = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
  let n: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const m = [(a[0] + c[0] + d[0]) / 3 - from[0], (a[1] + c[1] + d[1]) / 3 - from[1], (a[2] + c[2] + d[2]) / 3 - from[2]];
  if (n[0] * m[0] + n[1] * m[1] + n[2] * m[2] < 0) n = [-n[0], -n[1], -n[2]];
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  return [n[0] / l, n[1] / l, n[2] / l];
}

function spire(k: Build, s: SpireAt): void {
  const b = k.b, n = s.def.sides, { x, z, phase, rTop } = s, { top, tip, crown } = s.def, H = tip - top;
  // the foot, where the shaft rises from the podium's roof, and the shaft of white marble, tapering a little
  b.cyl(x, z, PODIUM.y, PODIUM.y + 1.2, s.def.r * 1.14, s.def.r * 1.1, n, WHITE, { phase, cap: LEDGE });
  b.cyl(x, z, PODIUM.y, top, s.def.r, rTop, n, WHITE, { phase, cap: crown === 'blade' || crown === 'split' ? LEDGE : false });
  // a vein of crimson glass up the face that looks at the view, and up the face behind it, lit at night; on the great spire up all four sides
  const veins = s.def.sides === 12 ? [0, 1, 2, 3].map((i) => FACING_VIEW + (i * Math.PI) / 2) : [FACING_VIEW, FACING_VIEW + Math.PI];
  for (const a of veins) {
    const ux = Math.cos(a), uz = Math.sin(a), px = -uz, pz = ux, c = Math.cos(Math.PI / n), sn = Math.sin(Math.PI / n);
    const y0 = PODIUM.y + 1.6, y1 = top - 0.7;
    const d0 = shaftR(s, y0) * c + 0.03, d1 = shaftR(s, y1) * c + 0.03, w0 = shaftR(s, y0) * sn * 0.34, w1 = shaftR(s, y1) * sn * 0.34;
    const P = (d: number, w: number, y: number): V3 => [x + ux * d + px * w, y, z + uz * d + pz * w];
    const slope = (d0 - d1) / (y1 - y0), nl = Math.hypot(1, slope);
    b.quad(P(d0, -w0, y0), P(d0, w0, y0), P(d1, w1, y1), P(d1, -w1, y1), [ux / nl, slope / nl, uz / nl], CRIMSON_GLASS, { win: interior(3.4) });
  }
  // the spire
  const ring = (y: number, r: number): void => b.cyl(x, z, y - 0.14, y + 0.16, r + 0.07, r + 0.05, n, BRIGHT_GOLD, { phase, cap: false });
  if (crown === 'needle') {
    const gy = tip - 0.11 * H, rg = rTop * 0.11;
    b.cyl(x, z, top, gy, rTop, rg, n, CRIMSON, { phase, cap: false });
    b.cyl(x, z, gy, tip, rg, 0.02, n, BRIGHT_GOLD, { phase, cap: false });
    ring(top, rTop);
  } else if (crown === 'crystal') {
    // a crimson needle as far as halfway, a gold ring, and a faceted crystal that glows at night
    const yk = top + 0.5 * H, rk = rTop * 0.5, yw = yk + 0.14 * (tip - yk), o = { win: interior(1.8), cap: false as const, phase: phase + 0.3 };
    b.cyl(x, z, top, yk, rTop, rk, n, CRIMSON, { phase, cap: false });
    ring(top, rTop);
    ring(yk, rk);
    b.cyl(x, z, yk, yw, rk, rk * 1.35, 6, CRYSTAL, o);
    b.cyl(x, z, yw, tip, rk * 1.35, 0.02, 6, CRYSTAL, o);
  } else if (crown === 'split') {
    // a low crimson saddle, and two blades rising from it, leaning apart across the view, the one taller than the other, their tips gold
    b.cyl(x, z, top, top + 1.0, rTop, rTop * 0.55, n, CRIMSON, { phase, cap: CRIMSON });
    ring(top, rTop);
    const off = rTop * 0.45, spread = 1.2, rb = rTop * 0.42;
    for (const [sgn, t] of [[-1, tip - 2.2], [1, tip]]) {
      const B: V3 = [x + ACROSS[0] * off * sgn, top + 0.5, z + ACROSS[1] * off * sgn];
      const T: V3 = [x + ACROSS[0] * (off + spread) * sgn, t, z + ACROSS[1] * (off + spread) * sgn];
      const G: V3 = [B[0] + (T[0] - B[0]) * 0.87, B[1] + (T[1] - B[1]) * 0.87, B[2] + (T[2] - B[2]) * 0.87];
      b.beam(B, G, rb, rb * 0.13 + 0.03, CRIMSON);
      b.beam(G, T, rb * 0.13 + 0.03, 0.02, BRIGHT_GOLD);
    }
  } else {
    // a blade: broad across the view, thin along it, its top gold
    const wA = rTop * 0.98, wV = rTop * 0.34, gy = tip - 0.11 * H, f = 0.11;
    const base: V3[] = [[x + ACROSS[0] * wA, top, z + ACROSS[1] * wA], [x + TO_VIEW[0] * wV, top, z + TO_VIEW[2] * wV], [x - ACROSS[0] * wA, top, z - ACROSS[1] * wA], [x - TO_VIEW[0] * wV, top, z - TO_VIEW[2] * wV]];
    const mid = base.map((p): V3 => [x + (p[0] - x) * f, gy, z + (p[2] - z) * f]);
    const apex: V3 = [x, tip, z], core: V3 = [x, (top + tip) / 2, z];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4, nn = away(base[i], base[j], apex, core);
      b.quad(base[i], base[j], mid[j], mid[i], nn, CRIMSON);
      face3(b, mid[i], mid[j], apex, nn, BRIGHT_GOLD);
    }
    ring(top, rTop);
  }
  if (s.def.finial > 0) {
    b.cyl(x, z, tip - 0.3, tip + s.def.finial, 0.12, 0.02, 6, BRIGHT_GOLD, { cap: false });
    if (s.def.finial >= 3) {
      b.cyl(x, z, tip + 0.7, tip + 1.0, 0.16, 0.34, 6, BRIGHT_GOLD, { cap: false });
      b.cyl(x, z, tip + 1.0, tip + 1.3, 0.34, 0.16, 6, BRIGHT_GOLD, { cap: false });
      k.glows.push({ x, y: tip + s.def.finial - 0.25, z, sx: 0.28, sy: 0.28, sz: 0.28, color: '#fff3cf' });
    }
  }
  // fins at the foot
  for (const deg of s.def.fins ?? []) {
    const a = (deg * Math.PI) / 180, r0 = faceAt(s, PODIUM.y) - 0.1;
    fin(b, x, z, a, r0, r0 + 1.7, PODIUM.y, PODIUM.y + 8, 0.7, WHITE);
  }
  // flying buttresses down to piers on the podium's roof
  if (s.def.flyers) {
    const { at, y, out } = s.def.flyers;
    for (const deg of at) {
      const a = (deg * Math.PI) / 180, ux = Math.cos(a), uz = Math.sin(a);
      const px = x + ux * out, pz = z + uz * out, pt = PODIUM.y + 4.4;
      b.box(px - 0.55, PODIUM.y, pz - 0.55, px + 0.55, pt - 0.3, pz + 0.55, WHITE, { faces: 'NESW' });
      b.box(px - 0.66, pt - 0.3, pz - 0.66, px + 0.66, pt, pz + 0.66, WHITE, { top: LEDGE, faces: 'NESWTB' });
      const ri = faceAt(s, y) - 0.25;
      b.beam([px - ux * 0.3, pt - 0.5, pz - uz * 0.3], [x + ux * ri, y, z + uz * ri], 0.34, 0.24, WHITE);
    }
  }
}

// ---------------------------------------------------------------------------
// The Citadel
// ---------------------------------------------------------------------------

/**
 * A hall or wing on the podium's roof: walls of white marble with tall slits,
 * a cornice, a flat roof behind a balustrade at `yb` (a whole number of 0.8),
 * and on one side, where there is room, a colonnade under the cornice.
 */
function hall(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, yb: number, seed: number, colonnade?: { side: 'S' | 'E'; a0: number; a1: number }): void {
  const y = PODIUM.y, eaves = yb - 0.6, out = 0.25;
  b.box(x0, y, z0, x1, eaves, z1, WHITE, { win: SLITS, seed, faces: 'NESW' });
  const cx0 = x0 - out, cz0 = z0 - out, cx1 = x1 + (colonnade?.side === 'E' ? 1.6 : out), cz1 = z1 + (colonnade?.side === 'S' ? 1.6 : out);
  b.box(cx0, eaves, cz0, cx1, yb, cz1, WHITE, { top: ROOF, faces: 'NESWTB' });
  balustrade(b, cx0 + 0.04, cz0 + 0.04, cx1 - 0.04, cz1 - 0.04, yb, yb);
  if (!colonnade) return;
  const { side, a0, a1 } = colonnade, nCols = Math.max(2, Math.round((a1 - a0) / 1.7) + 1);
  if (side === 'S') b.box(a0 - 0.6, y, z1, a1 + 0.6, y + 0.22, z1 + 1.6, LEDGE, { faces: 'ESWT' });
  else b.box(x1, y, a0 - 0.6, x1 + 1.6, y + 0.22, a1 + 0.6, LEDGE, { faces: 'NEST' });
  for (let i = 0; i < nCols; i++) {
    const u = a0 + ((a1 - a0) * i) / (nCols - 1);
    if (side === 'S') column(b, u, z1 + 0.95, y + 0.22, eaves, 0.3);
    else column(b, x1 + 0.95, u, y + 0.22, eaves, 0.3);
  }
}

/** A bridge between two spires high in the air: white, with a band of crimson glass lit at night, closed underneath by a pointed keel like an arch. */
function skyBridge(b: GeoBuilder, a: SpireAt, c: SpireAt, y: number): void {
  const dx = c.x - a.x, dz = c.z - a.z, d = Math.hypot(dx, dz), ux = dx / d, uz = dz / d;
  const ra = faceAt(a, y + 1.5) - 0.3, rc = faceAt(c, y + 1.5) - 0.3, len = d - ra - rc;
  const mx = a.x + ux * (ra + len / 2), mz = a.z + uz * (ra + len / 2), yaw = Math.atan2(dz, dx), L = len / 2;
  b.obox(mx, y + 1.5, mz, L, 1.5, 1.0, yaw, WHITE, { faces: 'B', top: LEDGE });
  b.obox(mx, y + 1.65, mz, L - 0.05, 0.4, 1.03, yaw, CRIMSON_GLASS, { win: interior(3.0) });
  b.obox(mx, y + 3.08, mz, L - 0.05, 0.14, 1.1, yaw, WHITE, { top: LEDGE, faces: 'B' });
  // the keel: two planes that meet under the middle of the bridge, an arch seen from the side
  b.moved(mx, 0, mz, yaw, () => {
    const k = 2.0, l = L - 0.25;
    for (const s of [-1, 1]) {
      const A: V3 = [-l, y, s * 1.0], B: V3 = [l, y, s * 1.0], K: V3 = [0, y - k, 0];
      face3(b, A, B, K, away(A, B, K, [0, y, 0]), WHITE);
    }
    for (const e of [-1, 1]) {
      const A: V3 = [e * l, y, -1.0], B: V3 = [e * l, y, 1.0], K: V3 = [0, y - k, 0];
      face3(b, A, B, K, away(A, B, K, [0, y - 0.3, 0]), WHITE);
    }
  });
}

const buildCitadel: Model = (k) => {
  const b = k.b, P = PODIUM;
  // ---- the podium: a rusticated foot, two storeys of slits between pilasters, a bold cornice, and a balustrade round its roof
  b.box(P.x0 - 0.22, F, P.z0 - 0.22, P.x1 + 0.22, F + 1.2, P.z1 + 0.22, PLINTH, { top: LEDGE });
  b.box(P.x0, F + 1.2, P.z0, P.x1, P.y - 0.5, P.z1, WHITE, { win: SLITS, seed: 3.1, faces: 'NESW' });
  b.box(P.x0 - 0.3, P.y - 0.5, P.z0 - 0.3, P.x1 + 0.3, P.y, P.z1 + 0.3, WHITE, { top: ROOF, faces: 'NESWTB' });
  balustrade(b, P.x0 - 0.26, P.z0 - 0.26, P.x1 + 0.26, P.z1 + 0.26, P.y, P.y + 0.4, 0.32);
  // on the south, the north and the west, half-columns between the bays and piers at the corners, and an arched window lit within in each bay that is free;
  // on the east, either side of the portico, flat pilasters
  const engaged = (x: number, z: number, nx: number, nz: number): void => {
    const ox = x + nx * 0.05, oz = z + nz * 0.05;
    b.box(ox - 0.58, F + 1.2, oz - 0.58, ox + 0.58, F + 1.6, oz + 0.58, WHITE, { top: LEDGE });
    b.cyl(ox, oz, F + 1.6, P.y - 1.1, 0.46, 0.41, 8, WHITE, { cap: false });
    b.box(ox - 0.6, P.y - 1.1, oz - 0.6, ox + 0.6, P.y - 0.55, oz + 0.6, WHITE, { top: LEDGE });
  };
  const pier = (x0: number, z0: number, x1: number, z1: number, faces: string): void => b.box(x0, F + 1.2, z0, x1, P.y - 0.5, z1, WHITE, { faces });
  for (let u = P.x0; u <= P.x1 + 0.01; u += 5) {
    const end = u - P.x0 < 0.1 || P.x1 - u < 0.1;
    if (end) {
      pier(u - 0.35, P.z1, u + 0.35, P.z1 + 0.2, 'SEW');
      pier(u - 0.35, P.z0 - 0.2, u + 0.35, P.z0, 'NEW');
    } else {
      engaged(u, P.z1, 0, 1);
      engaged(u, P.z0, 0, -1);
    }
    // the south front's bays that hold no banner, no door and no bridge
    const bay = u + 2.5, hung = [P.x0 + 7.5, P.x1 - 7.5].some((x) => Math.abs(x - bay) < 1), door = Math.abs(bay - (P.x0 + 17.5)) < 1;
    if (!hung && !door && bay < TR.x0 - 1.0) arched(b, bay, P.z1, 0, 1, 1.4, F + 1.6, F + 3.6, DOORWAY, 2.4, 0.04);
    if (bay < P.x1) arched(b, bay, P.z0, 0, -1, 1.4, F + 1.6, F + 3.6, DOORWAY, 2.4, 0.04);
  }
  for (let u = P.z0; u <= P.z1 + 0.01; u += 5) {
    const end = u - P.z0 < 0.1 || P.z1 - u < 0.1;
    if (end) pier(P.x0 - 0.2, u - 0.35, P.x0, u + 0.35, 'WNS');
    else engaged(P.x0, u, -1, 0);
    if (u + 2.5 < P.z1) arched(b, P.x0, u + 2.5, -1, 0, 1.4, F + 1.6, F + 3.6, DOORWAY, 2.4, 0.04);
    if (u < PORTICO.z0 - 0.5 || u > PORTICO.z1 + 0.5) pier(P.x1, u - 0.35, P.x1 + 0.2, u + 0.35, 'ENS');
  }
  // statues of white marble on the balustrade, over the south front's half-columns and either side of the portico
  const STATUE: Dress = { coat: 0xf2eee6, legs: 0xe6e1d6, hat: 0xf2eee6, hatH: 0.2, skin: 0xf4f1ea };
  const by = P.y + 0.4 + 0.8 + 0.14;
  for (const [sx, sz] of [[P.x0 + 5, P.z1 + 0.1], [P.x0 + 15, P.z1 + 0.1], [P.x0 + 25, P.z1 + 0.1], [P.x1 + 0.1, P.z0 + 2], [P.x1 + 0.1, P.z1 - 2]]) {
    b.box(sx - 0.36, by, sz - 0.36, sx + 0.36, by + 0.5, sz + 0.36, WHITE, { top: LEDGE });
    figure(b, sx, sz, by + 0.5, STATUE);
  }
  // long crimson banners with the gold lion, the height of the wall: either side of the portico, and on the south front
  for (const zc of [(P.z0 + PORTICO.z0) / 2, (PORTICO.z1 + P.z1) / 2]) wallBanner(b, P.x1 + 0.2, zc, 'E', 2.8, F + 2.6, P.y - 0.9);
  for (const xc of [P.x0 + 7.5, P.x1 - 7.5]) wallBanner(b, xc, P.z1 + 0.2, 'S', 3.4, F + 2.6, P.y - 0.9);
  // doors: the south door to the gardens, and the door onto the terrace's bridge
  const sdx = P.x0 + 17.5;
  arched(b, sdx, P.z1, 0, 1, 2.4, F + 1.2, F + 3.6, DOORWAY, 2.6);
  for (const s of [-1, 1]) b.box(sdx + s * 1.45 - 0.22, F + 1.2, P.z1, sdx + s * 1.45 + 0.22, F + 5.0, P.z1 + 0.25, WHITE, { faces: 'SEWT' });
  arched(b, TR.x0 + 1.0, P.z1, 0, 1, 1.5, TER.y + 0.3, TER.y + 2.0, DOORWAY, 2.6);

  // ---- the great portico on the east front, on the gate's axis: broad steps, eight tall columns, a pediment, a great door
  const PX = P.x1, { z0: pz0, z1: pz1, front, sty, top: ctop } = PORTICO;
  b.box(PX, F, pz0, front + 0.1, sty, pz1, WHITE, { top: LEDGE });
  for (let i = 0; i < 3; i++) {
    const sx = front + 0.1 + 0.38 * i;
    b.box(sx, F, pz0 + 1.0, sx + 0.38, sty - 0.4 * (i + 1), pz1 - 1.0, WHITE, { faces: 'NEST', top: LEDGE });
  }
  const cols = 8, cx = front - 0.55;
  for (let i = 0; i < cols; i++) column(b, cx, pz0 + 0.7 + (i * (pz1 - pz0 - 1.4)) / (cols - 1), sty, ctop, 0.5);
  const ent = ctop + 1.4;
  b.box(PX, ctop, pz0 - 0.1, front, ent, pz1 + 0.1, WHITE, { faces: 'NESWB', top: LEDGE });
  b.box(front, ctop + 0.45, pz0 - 0.1, front + 0.04, ctop + 1.05, pz1 + 0.1, CRIMSON, { faces: 'E' });
  b.box(PX - 0.1, ent, pz0 - 0.3, front + 0.02, ent + 0.22, pz1 + 0.3, WHITE, { top: LEDGE, faces: 'NESWTB' });
  // the pediment: low and broad, its tympanum crimson with the gold lion
  const py0 = ent + 0.22, rise = 3.3, ptx = front - 0.02, half = (pz1 - pz0) / 2 + 0.3;
  face3(b, [ptx, py0, pz0 - 0.3], [ptx, py0, pz1 + 0.3], [ptx, py0 + rise, AXIS_Z], [1, 0, 0], WHITE);
  face3(b, [PX - 0.1, py0, pz0 - 0.3], [PX - 0.1, py0, pz1 + 0.3], [PX - 0.1, py0 + rise, AXIS_Z], [-1, 0, 0], WHITE);
  const sl = Math.hypot(half, rise);
  for (const s of [-1, 1]) {
    const ze = AXIS_Z + s * (half + 0.12), yb0 = py0 - (0.12 * rise) / half;
    b.quad([PX - 0.2, yb0, ze], [front + 0.02, yb0, ze], [front + 0.02, py0 + rise, AXIS_Z], [PX - 0.2, py0 + rise, AXIS_Z], [0, half / sl, (s * rise) / sl], LEDGE);
  }
  face3(b, [ptx + 0.03, py0 + 0.25, pz0 + 0.7], [ptx + 0.03, py0 + 0.25, pz1 - 0.7], [ptx + 0.03, py0 + rise - 0.45, AXIS_Z], [1, 0, 0], CRIMSON);
  lionSign(b, (s, y) => [ptx + 0.06, y, AXIS_Z + s], [1, 0, 0], 0, py0 + 1.2, 1.9, -1);
  b.cyl(front - 0.3, AXIS_Z, py0 + rise - 0.1, py0 + rise + 1.1, 0.2, 0.02, 6, BRIGHT_GOLD, { cap: false });
  // the great door, open on a lit hall, its bronze leaves folded back, lanterns between the columns
  arched(b, PX, AXIS_Z, 1, 0, 2.8, sty, sty + 4.8, DOORWAY, 2.8, 0.05);
  for (const s of [-1, 1]) b.box(PX + 0.05, sty, AXIS_Z + s * 1.4 - 0.08, PX + 0.85, sty + 5.4, AXIS_Z + s * 1.4 + 0.08, BRONZE, { faces: 'NESWT' });
  for (const s of [-1, 1]) k.glows.push({ x: cx - 0.9, y: ctop - 1.2, z: AXIS_Z + s * 2.3, sx: 0.36, sy: 0.5, sz: 0.36, color: '#ffd9a0' });
  // the gold lions of House Augustus, large on their plinths either side of the steps, and two Praetorians at the foot of the steps
  for (const z of [pz0 - 0.6, pz1 + 0.6]) lion(b, front + 2.25, z, F, 1.7, 0, BRIGHT_GOLD, WHITE);
  for (const s of [-1, 1]) figure(b, front + 1.7, AXIS_Z + s * 3.2, F + 0.02, PRAETORIAN_GUARD);

  // ---- the halls and wings on the podium's roof, between the spires: flat-roofed, behind balustrades, colonnaded where there is room
  const [s1, s2, s3, s4, s5, s6, s7] = SP;
  // each hall runs half a unit into the faces of the spires it joins
  const f = (s: SpireAt): number => faceAt(s, PODIUM.y) - 0.5;
  hall(b, s1.x + f(s1), s5.z - 5.5, s5.x - f(s5), s5.z + 1.0, F + 20.0, 5.1, { side: 'S', a0: s1.x + 6.8, a1: s5.x - 2.4 });
  hall(b, s1.x + 1.4, s1.z + Math.sqrt(s1.def.r ** 2 - 1.4 ** 2) - 0.6, s6.x + 1.0, s6.z - f(s6), F + 18.4, 5.3, { side: 'E', a0: s5.z + 2.8, a1: s6.z - 2.2 });
  hall(b, s4.x - 0.6, s4.z + f(s4), s3.x + 0.9, s3.z - f(s3), F + 17.6, 5.5, { side: 'E', a0: s4.z + 2.3, a1: s3.z - 2.9 });
  hall(b, s1.x + 2.0, s2.z - 1.0, s2.x - f(s2), s2.z + 3.4, F + 19.2, 5.7);
  hall(b, s6.x + f(s6), s7.z - 2.1, s7.x - f(s7), s7.z + 0.7, F + 15.2, 5.9, { side: 'S', a0: s6.x + 2.3, a1: s7.x - 1.9 });
  hall(b, s3.x + f(s3), s6.z - 2.2, s6.x - f(s6), s6.z + 2.2, F + 16.0, 6.1, { side: 'S', a0: s3.x + 3.0, a1: s6.x - 2.3 });
  // the spires, joined high up by bridges
  SP.forEach((s) => spire(k, s));
  skyBridge(b, s1, s2, F + 36);
  skyBridge(b, s3, s1, F + 26);
  skyBridge(b, s2, s5, F + 20);
  // trees in the roof's gardens
  for (const [x, z] of [[P.x0 + 1.2, P.z0 + 6], [P.x1 - 2, P.z1 - 8.5], [P.x1 - 2.6, P.z0 + 8.5]]) k.tree(x, z, 0.62, false, P.y);

  // ---- light: the podium floodlit, the cluster lit from below, the portico
  for (const [x, z] of [[P.x0 + 2, P.z0 + 2], [P.x1 - 2, P.z0 + 2], [P.x0 + 2, P.z1 - 2], [P.x1 - 2, P.z1 - 2]]) k.lights.push({ x, z, r: 14, color: WARM, k: 0.55 });
  k.lights.push({ x: s1.x + 3, z: s1.z + 5, r: 15, color: WARM, k: 0.5 }, { x: front + 2, z: AXIS_Z, r: 11, color: WARM, k: 0.6 });

  // ---- its name, in the forecourt south of the portico's lions
  nameBoard(k, 'citadel-name', front + 1.9, P.z1 - 2.4, F);
};

// ---------------------------------------------------------------------------
// The outer wall, the gate court, the forecourt and the gardens
// ---------------------------------------------------------------------------

/** A stretch of the high outer wall over a rectangle: a plinth, its body, pilasters on its outer face with lamps, and a crimson coping whose top is the walk, with nothing on it. */
function highWall(k: Build, x0: number, z0: number, x1: number, z1: number, out: 'N' | 'E' | 'S' | 'W', pilasters = true): void {
  const b = k.b, cop = WALK - 0.4;
  b.box(x0, F, z0, x1, cop, z1, WHITE, { faces: 'NESW', seed: x0 + z0 });
  b.box(x0 - 0.12, F, z0 - 0.12, x1 + 0.12, F + 0.8, z1 + 0.12, PLINTH, { top: LEDGE });
  b.box(x0 - 0.14, cop, z0 - 0.14, x1 + 0.14, WALK, z1 + 0.14, RED, { top: RED_TOP, faces: 'NESWTB' });
  if (!pilasters) return;
  const alongX = out === 'N' || out === 'S', a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1, n = Math.max(1, Math.round((a1 - a0) / 6));
  for (let i = 0; i <= n; i++) {
    const u = a0 + ((a1 - a0) * i) / n;
    if (u - a0 < 0.4 || a1 - u < 0.4) continue;
    if (out === 'N') b.box(u - 0.35, F + 0.8, z0 - 0.2, u + 0.35, cop - 0.05, z0, WHITE, { faces: 'NEWT' });
    if (out === 'S') b.box(u - 0.35, F + 0.8, z1, u + 0.35, cop - 0.05, z1 + 0.2, WHITE, { faces: 'SEWT' });
    if (out === 'W') b.box(x0 - 0.2, F + 0.8, u - 0.35, x0, cop - 0.05, u + 0.35, WHITE, { faces: 'WNST' });
    if (out === 'E') b.box(x1, F + 0.8, u - 0.35, x1 + 0.2, cop - 0.05, u + 0.35, WHITE, { faces: 'ENST' });
    // a lamp on every second pilaster
    if (i % 2 === 1) {
      const gx = out === 'E' ? x1 + 0.35 : out === 'W' ? x0 - 0.35 : u, gz = out === 'S' ? z1 + 0.35 : out === 'N' ? z0 - 0.35 : u;
      k.glows.push({ x: gx, y: cop - 1.7, z: gz, sx: 0.3, sy: 0.4, sz: 0.3, color: '#ffd9a0' });
    }
  }
}

/** The low garden wall on the south: white with a crimson coping, piers with white knobs every few units. */
function lowWall(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number): void {
  const y = LOW.y;
  b.box(x0, F, z0, x1, y - 0.25, z1, WHITE, { faces: 'NS' });
  b.box(x0 - 0.06, y - 0.25, z0 - 0.08, x1 + 0.06, y, z1 + 0.08, RED, { top: RED_TOP, faces: 'NSTEW' });
  const n = Math.round((x1 - x0) / 3.2);
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    b.box(x - 0.32, F, z0 - 0.12, x + 0.32, y + 0.6, z1 + 0.12, WHITE, { top: LEDGE });
    b.cyl(x, (z0 + z1) / 2, y + 0.6, y + 1.0, 0.2, 0.08, 6, LEDGE);
  }
}

/** A tea pavilion: a round temple of eight columns under a white dome with a gold finial, a table in it. */
function tholos(k: Build, x: number, z: number): void {
  const b = k.b, r = 2.6;
  b.cyl(x, z, F, F + 0.25, r + 0.55, r + 0.55, 10, PLINTH, { cap: LEDGE });
  b.cyl(x, z, F + 0.25, F + 0.5, r + 0.25, r + 0.25, 10, WHITE, { cap: MARBLE });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.cyl(x + Math.cos(a) * r, z + Math.sin(a) * r, F + 0.5, F + 3.9, 0.2, 0.17, 6, WHITE, { cap: false });
  }
  b.cyl(x, z, F + 3.9, F + 4.5, r + 0.3, r + 0.3, 10, WHITE, { cap: false });
  // its ceiling, seen from below
  for (let i = 0; i < 10; i++) {
    const a0 = Math.PI / 10 + (i / 10) * Math.PI * 2, a1 = Math.PI / 10 + ((i + 1) / 10) * Math.PI * 2, rr = r + 0.3;
    face3(b, [x, F + 3.9, z], [x + Math.cos(a0) * rr, F + 3.9, z + Math.sin(a0) * rr], [x + Math.cos(a1) * rr, F + 3.9, z + Math.sin(a1) * rr], [0, -1, 0], SOFFIT);
  }
  lathe(b, x, z, [[r + 0.3, F + 4.5], [r + 0.15, F + 5.1], [r - 0.45, F + 5.8], [r - 1.4, F + 6.3], [0.3, F + 6.55], [0.02, F + 6.57]], 10, LEDGE);
  b.cyl(x, z, F + 6.45, F + 7.3, 0.14, 0.02, 6, BRIGHT_GOLD, { cap: false });
  b.cyl(x, z, F + 0.5, F + 1.25, 0.18, 0.18, 6, WHITE);
  b.cyl(x, z, F + 1.25, F + 1.35, 0.9, 0.9, 8, MARBLE);
  k.glows.push({ x, y: F + 3.5, z, sx: 0.5, sy: 0.5, sz: 0.5, color: '#ffd9a0' });
  k.lights.push({ x, z, r: 9, color: WARM, k: 0.45 });
}

/** A small open pavilion on four columns under a low white roof, closed underneath. */
function kiosk(b: GeoBuilder, x: number, z: number, w: number): void {
  const h = w / 2, y = F + 3.3;
  b.box(x - h - 0.3, F, z - h - 0.3, x + h + 0.3, F + 0.3, z + h + 0.3, PLINTH, { top: MARBLE });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.cyl(x + sx * (h - 0.2), z + sz * (h - 0.2), F + 0.3, y, 0.17, 0.15, 6, WHITE, { cap: false });
  b.box(x - h, y, z - h, x + h, y + 0.45, z + h, WHITE, { faces: 'NESWB' });
  hip(b, x - h, z - h, x + h, z + h, y + 0.45, 0.7, LEDGE, 0.3);
  b.box(x - h - 0.3, y + 0.4, z - h - 0.3, x + h + 0.3, y + 0.45, z + h + 0.3, SOFFIT, { faces: 'B' });
}

/** A fountain: a round basin, its water, and a jet in a small bowl. */
function fountain(b: GeoBuilder, x: number, z: number, r: number): void {
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * Math.PI * 2, len = 2 * r * Math.sin(Math.PI / n);
    b.obox(x + Math.cos(a) * r, F + 0.32, z + Math.sin(a) * r, 0.18, 0.32, len / 2 + 0.08, a, WHITE, { top: LEDGE });
  }
  const ring: V3[] = Array.from({ length: n }, (_, i): V3 => [x + Math.cos(((i + 0.5) / n) * Math.PI * 2) * (r - 0.05), F + 0.42, z + Math.sin(((i + 0.5) / n) * Math.PI * 2) * (r - 0.05)]);
  for (let i = 0; i < n; i++) face3(b, [x, F + 0.42, z], ring[i], ring[(i + 1) % n], [0, 1, 0], BASIN, { win: interior(0.25) });
  b.cyl(x, z, F + 0.42, F + 1.5, 0.16, 0.12, 6, WHITE, { cap: false });
  b.cyl(x, z, F + 1.5, F + 1.75, 0.2, 0.62, 8, WHITE, { cap: BASIN });
  b.cyl(x, z, F + 1.75, F + 2.35, 0.07, 0.03, 6, 0xd8ecf4, { cap: false });
}

/** Hedges round a rectangular bed, low and dark green, open at the middle of each side for a path. */
function bed(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, gap: number): void {
  const t = 0.35, h = F + 0.6, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
  for (const [a, c] of [[x0, mx - gap / 2], [mx + gap / 2, x1]]) {
    b.box(a, F, z0, c, h, z0 + t, HEDGE);
    b.box(a, F, z1 - t, c, h, z1, HEDGE);
  }
  for (const [a, c] of [[z0 + t, mz - gap / 2], [mz + gap / 2, z1 - t]]) {
    b.box(x0, F, a, x0 + t, h, c, HEDGE);
    b.box(x1 - t, F, a, x1, h, c, HEDGE);
  }
}

const buildGrounds: Model = (k, l) => {
  const b = k.b, T = WALL_T, P = PODIUM;
  // ---- the outer wall: high on the north, the west and the east, the gate court let into the east side; the north-east stretch's walk is plain
  highWall(k, l.x0, l.z0, l.x1, l.z0 + T, 'N');
  highWall(k, l.x0, l.z0 + T, l.x0 + T, l.z1 - LOW.t, 'W');
  highWall(k, l.x1 - T, l.z0 + T, l.x1, COURT.z0, 'E');
  highWall(k, l.x1 - T, COURT.z1, l.x1, l.z1 - LOW.t, 'E');
  // the recessed wall of the gate court, either side of the gate, and the arch over the gate
  const gz0 = AXIS_Z - COURT.gate / 2, gz1 = AXIS_Z + COURT.gate / 2, rx0 = COURT.x0, rx1 = COURT.x0 + T;
  highWall(k, rx0, COURT.z0 - 2, rx1, gz0, 'E', false);
  highWall(k, rx0, gz1, rx1, COURT.z1 + 2, 'E', false);
  b.moved((rx0 + rx1) / 2, 0, AXIS_Z, Math.PI / 2, () => archway(b, 0, -T / 2, T / 2, COURT.gate, F + 3.6, WALK - 0.4, WHITE, SOFFIT, 10));
  b.box(rx0 - 0.14, WALK - 0.4, gz0, rx1 + 0.14, WALK, gz1, RED, { top: RED_TOP, faces: 'EWT' });
  // the gate's piers and their lamps, its open bronze leaves, and the lions that keep it
  for (const z of [gz0 - 0.65, gz1 + 0.65]) {
    b.box(rx1, F, z - 0.6, rx1 + 0.45, WALK - 0.8, z + 0.6, WHITE, { faces: 'ENST', top: LEDGE });
    b.box(rx1 - 0.02, WALK - 0.8, z - 0.68, rx1 + 0.53, WALK - 0.45, z + 0.68, WHITE, { faces: 'ENSTB', top: LEDGE });
    k.glows.push({ x: rx1 + 0.75, y: F + 4.6, z: z + (z < AXIS_Z ? 0.75 : -0.75), sx: 0.3, sy: 0.42, sz: 0.3, color: '#ffd9a0' });
  }
  for (const s of [-1, 1]) {
    const z = s < 0 ? gz0 + 0.12 : gz1 - 0.12;
    b.box(rx0 - 2.0, F + 0.05, z - 0.08, rx0 - 0.02, F + 3.4, z + 0.08, BRONZE);
    for (const y of [F + 1.0, F + 2.4]) b.box(rx0 - 1.9, y, z - 0.11, rx0 - 0.12, y + 0.16, z + 0.11, GOLD);
  }
  for (const s of [-1, 1]) lion(b, (rx1 + PD.x0) / 2, AXIS_Z + s * 4.4, F, 1.3, 0, BRIGHT_GOLD, WHITE);
  // the low garden wall on the south, between tall end piers
  lowWall(b, l.x0 + T, l.z1 - LOW.t, l.x1 - T, l.z1);
  for (const x of [l.x0, l.x1 - T]) {
    b.box(x, F, l.z1 - LOW.t, x + T, WALK - 0.4, l.z1, WHITE, { faces: 'NESW' });
    b.box(x - 0.14, WALK - 0.4, l.z1 - LOW.t - 0.14, x + T + 0.14, WALK, l.z1 + 0.14, RED, { top: RED_TOP });
    b.box(x - 0.12, F, l.z1 - LOW.t - 0.12, x + T + 0.12, F + 0.8, l.z1 + 0.12, PLINTH, { top: LEDGE });
  }
  // guards on the walk, none on the north-east's plain stretch
  for (const x of [l.x0 + 8, l.x0 + 20, l.x0 + 32]) figure(b, x, l.z0 + T / 2, WALK + 0.02, GRAY);
  for (const z of [l.z0 + 14, l.z0 + 32, l.z0 + 46]) figure(b, l.x0 + T / 2, z, WALK + 0.02, GRAY);
  for (const z of [COURT.z1 + 6, COURT.z1 + 16]) figure(b, l.x1 - T / 2, z, WALK + 0.02, GRAY);
  // light along the wall's foot, and in the gate court
  for (const [x, z] of [[l.x1 + 1, l.z0 + 4], [l.x1 + 1, COURT.z1 + 9], [(l.x0 + l.x1) / 2, l.z0 - 1]]) k.lights.push({ x, z, r: 8, color: WARM, k: 0.35 });
  k.lights.push({ x: (rx1 + PD.x0) / 2, z: AXIS_Z, r: 7, color: WARM, k: 0.55 });

  // ---- the ground inside: the forecourt paved, the walks in gravel, the rest laid to lawn
  const dz1 = DECO.z + DECO.t;
  area(k, rect(P.x1, l.z0 + T, l.x1 - T, dz1), MARBLE, F + 0.035, { size: 1.6 });
  area(k, rect(l.x0 + T, l.z0 + T, P.x1, P.z0), LAWN, F + 0.035);
  area(k, rect(l.x0 + T, P.z0, P.x0, dz1), LAWN, F + 0.035);
  area(k, rect(P.x0, P.z1, P.x1, dz1), GRAVEL, F + 0.035);
  area(k, rect(l.x0 + T, dz1, l.x1 - T, l.z1 - LOW.t), LAWN, F + 0.035);
  // the processional way from the portico's steps to the gate, in red stone
  area(k, rect(PORTICO.front + 1.3, AXIS_Z - 1.0, rx0, AXIS_Z + 1.0), RED_STONE, F + 0.045);
  // the gate court, and the way out of it to the Field of Mars
  area(k, [[rx1, COURT.z0], [PD.x0, COURT.z0], [PD.x0, PD.z1 + 1.5], [FD.x0, PD.z1 + 1.5], [FD.x0, FD.z0], [l.x1, FD.z0], [l.x1, COURT.z1], [rx1, COURT.z1]], MARBLE, F + 0.035, { size: 1.6 });

  // ---- the decorative wall between the Citadel's walk and the gardens, with two gateways through it
  const D = DECO, gaps: [number, number][] = [[GX - 1.5, GX + 1.5], [P.x0 + 16.3, P.x0 + 18.7]];
  let x = D.x0;
  for (const [g0, g1] of [...gaps, [D.x1, D.x1]]) {
    if (g0 - x > 0.5) {
      b.box(x, F, D.z, g0, F + 1.25, D.z + D.t, WHITE, { faces: 'NSEW' });
      b.box(x - 0.05, F + 1.25, D.z - 0.06, g0 + 0.05, F + 1.45, D.z + D.t + 0.06, LEDGE);
      const n = Math.max(1, Math.round((g0 - x) / 3.2));
      for (let i = 1; i < n; i++) {
        const px = x + ((g0 - x) * i) / n;
        b.box(px - 0.26, F, D.z - 0.1, px + 0.26, F + 1.95, D.z + D.t + 0.1, WHITE, { top: LEDGE });
        b.cyl(px, D.z + D.t / 2, F + 1.95, F + 2.35, 0.24, 0.1, 6, LEDGE);
      }
    }
    // a gateway: tall piers either side, with urns
    if (g1 > g0) {
      for (const gx of [g0 - 0.3, g1 + 0.3]) {
        b.box(gx - 0.35, F, D.z - 0.15, gx + 0.35, F + 2.6, D.z + D.t + 0.15, WHITE, { top: LEDGE });
        b.box(gx - 0.42, F + 2.6, D.z - 0.22, gx + 0.42, F + 2.8, D.z + D.t + 0.22, LEDGE);
        b.cyl(gx, D.z + D.t / 2, F + 2.8, F + 3.45, 0.26, 0.12, 6, WHITE);
      }
    }
    x = g1;
  }

  // ---- the tea gardens in the south-west: a round temple among four hedged beds, a pavilion, a fountain, tables under parasols
  const G = GARDEN, gx = GX, gz = GZ;
  area(k, rect(gx - 0.9, G.z0, gx + 0.9, G.z1 - 1.5), GRAVEL, F + 0.045);
  area(k, rect(G.x0, gz - 0.9, gx - 0.9, gz + 0.9), GRAVEL, F + 0.045);
  area(k, rect(gx + 0.9, gz - 0.9, G.x1, gz + 0.9), GRAVEL, F + 0.045);
  area(k, rect(G.x0, G.z1 - 1.5, l.x1 - T, G.z1), GRAVEL, F + 0.055);
  area(k, oval(gx, gz, 3.9, 3.9, 16), GRAVEL, F + 0.055);
  const near = 2.9;
  bed(b, G.x0 + 1.4, G.z0 + 1.2, gx - near, gz - near, 1.4);
  bed(b, gx + near, G.z0 + 1.2, G.x1 - 1.2, gz - near, 1.4);
  bed(b, G.x0 + 1.4, gz + near, gx - near, G.z1 - 2.2, 1.4);
  bed(b, gx + near, gz + near, G.x1 - 1.2, G.z1 - 2.2, 1.4);
  tholos(k, gx, gz);
  kiosk(b, G.x0 + 3.5, G.z0 + 3.4, 2.8);
  fountain(b, (gx + near + G.x1 - 1.2) / 2, (G.z0 + 1.2 + gz - near) / 2, 1.3);
  const rnd = rng(4207);
  for (const [tx, tz, c] of [[(gx + near + G.x1 - 1.2) / 2, (gz + near + G.z1 - 2.2) / 2, AUGUSTUS_RED], [(G.x0 + 1.4 + gx - near) / 2, (gz + near + G.z1 - 2.2) / 2, 0xf3efe6]] as [number, number, number][]) {
    parasol(b, tx, tz, c, F + 0.035);
    figure(b, tx + 1.1, tz + 0.2, F + 0.04, rnd() < 0.5 ? GOLD_DRESS : SILVER_DRESS);
    figure(b, tx - 1.0, tz - 0.4, F + 0.04, rnd() < 0.5 ? SILVER_DRESS : GOLD_DRESS);
    k.lights.push({ x: tx, z: tz, r: 7, color: WARM, k: 0.38 });
  }
  figure(b, gx + 0.8, gz + 0.9, F + 0.54, GOLD_DRESS);
  figure(b, gx - 0.9, gz - 0.6, F + 0.54, SILVER_DRESS);
  for (const [lx, lz] of [[gx - 1.5, G.z0 + 0.7], [gx + 1.5, G.z0 + 0.7], [gx - 1.5, G.z1 - 2.1], [gx + 1.5, G.z1 - 2.1]]) {
    b.box(lx - 0.09, F, lz - 0.09, lx + 0.09, F + 1.5, lz + 0.09, 0x9a9488);
    k.glows.push({ x: lx, y: F + 1.65, z: lz, sx: 0.28, sy: 0.32, sz: 0.28, color: '#ffe2ae' });
  }

  // ---- the paths east of the bunker, to its door, to the Citadel's south door, and east of the terrace
  const ex = (BK.x1 + TR.x0) / 2;
  area(k, rect(ex - 1.0, dz1, ex + 1.0, G.z1 - 1.5), GRAVEL, F + 0.045);
  area(k, rect(P.x0 + 16.3, dz1, P.x0 + 18.7, BK.z0 - 0.4), GRAVEL, F + 0.045);
  area(k, rect(P.x0 + 18.7, BK.z0 - 2.2, ex - 1.0, BK.z0 - 0.4), GRAVEL, F + 0.045);
  area(k, rect(TR.x1, dz1, l.x1 - T, G.z1 - 1.5), GRAVEL, F + 0.045);
};

/** Trees and people in the grounds, put down once every lot stands, so that they keep below every name board. */
function grounds(k: Build): void {
  const l = WL, T = WALL_T;
  const plant = (x: number, z: number, s: number, tall: boolean): void => {
    const h = tall ? s * 1.3 * 7 : s * 7.2;
    if (h <= underBoards(x, z)) k.tree(x, z, s, tall, F);
  };
  // cypresses along the west wall, behind the Citadel, a row along the north wall, and pairs at the gardens' corners
  for (let z = l.z0 + T + 2.5; z < DECO.z - 1; z += 4.6) plant(l.x0 + T + 1.6, z, 0.95, true);
  for (let x = l.x0 + T + 4; x < PODIUM.x1 - 2; x += 5.5) plant(x, l.z0 + T + 1.5, 0.7, false);
  const G = GARDEN;
  for (const [x, z] of [[G.x0 + 1.0, G.z0 + 9.2], [G.x0 + 1.0, G.z1 - 3.4], [G.x1 - 0.6, G.z0 + 9.2], [G.x1 - 0.6, G.z1 - 3.4]]) plant(x, z, 0.9, true);
  for (const [x, z] of [[BK.x0 + 1.0, BK.z1 + 1.6], [BK.x0 - 0.3, BK.z0 + 2.0]]) plant(x, z, 0.75, false);
  // outside the east wall, on the way from the Field of Mars to the gate court
  for (let z = COURT.z1 + 4; z < l.z1 - 3; z += 6) plant(l.x1 + 1.4, z, 0.9, true);
  // people about the forecourt and the gate court
  k.person(PODIUM.x1 + 6.0, AXIS_Z - 10.5, F + 0.04);
  k.person(PODIUM.x1 + 6.6, AXIS_Z + 7.0, F + 0.04);
  k.person(COURT.x0 + 3.2, COURT.z1 - 2, F + 0.04);
  k.person(FD.x0 - 3.5, PD.z1 + 3.0, F + 0.04);
}

// ---------------------------------------------------------------------------
// The bunker's door
// ---------------------------------------------------------------------------

const buildBunker: Model = (k, l) => {
  const b = k.b, top = l.top;
  // the mound over the stair down: battered walls of white stone, grass on its top, a crimson band round its brow
  const mx0 = l.x0 + 0.5, mx1 = l.x1 - 2.6, mz0 = l.z0 + 0.6, mz1 = l.z1 - 0.6, my = F + 2.4, ins = 1.1;
  hipped(b, mx0, mz0, mx1, mz1, F, my, ins, ins, STONE, LAWN);
  const bx0 = mx0 + ins, bx1 = mx1 - ins, bz0 = mz0 + ins, bz1 = mz1 - ins, bt = 0.3;
  b.box(bx0, my, bz0, bx1, my + 0.14, bz0 + bt, RED, { top: RED_TOP });
  b.box(bx0, my, bz1 - bt, bx1, my + 0.14, bz1, RED, { top: RED_TOP });
  b.box(bx0, my, bz0 + bt, bx0 + bt, my + 0.14, bz1 - bt, RED, { top: RED_TOP, faces: 'EWT' });
  b.box(bx1 - bt, my, bz0 + bt, bx1, my + 0.14, bz1 - bt, RED, { top: RED_TOP, faces: 'EWT' });
  // the armoured portal, out to the east towards the gate, its heavy door shut
  const px0 = mx1 - 1.2, px1 = l.x1, zc = (l.z0 + l.z1) / 2, pz0 = zc - 2.6, pz1 = zc + 2.6, py = top - 0.4;
  b.box(px0, F, pz0, px1, py, pz1, ARMOUR, { top: 0x575c63 });
  b.box(px0 - 0.1, py, pz0 - 0.1, px1 + 0.1, top, pz1 + 0.1, 0x575c63, { top: 0x4f545a });
  b.box(px1 + 0.1, py - 0.05, pz0 - 0.1, px1 + 0.14, top - 0.08, pz1 + 0.1, RED, { faces: 'ENS' });
  b.box(px1, F, pz0 - 0.2, px1 + 0.35, py, pz0 + 0.55, WHITE, { faces: 'ENST' });
  b.box(px1, F, pz1 - 0.55, px1 + 0.35, py, pz1 + 0.2, WHITE, { faces: 'ENST' });
  b.box(px1, F + 2.75, pz0 + 0.55, px1 + 0.35, py, pz1 - 0.55, WHITE, { faces: 'ENSB' });
  // the door: two leaves of steel, a seam, a gold band, bolts and hinges
  const dz0 = pz0 + 0.55, dz1 = pz1 - 0.55;
  b.box(px1, F, dz0, px1 + 0.08, F + 2.75, dz1, STEEL_DOOR, { faces: 'E' });
  b.box(px1, F, zc - 0.05, px1 + 0.12, F + 2.75, zc + 0.05, 0x3a3d42, { faces: 'ENS' });
  b.box(px1, F + 1.3, dz0, px1 + 0.11, F + 1.55, dz1, AUGUSTUS_GOLD, { faces: 'ETB' });
  for (const y of [F + 0.5, F + 2.2]) {
    for (const s of [-1, 1]) {
      b.box(px1, y - 0.15, zc + s * 0.25 - 0.13, px1 + 0.2, y + 0.15, zc + s * 0.25 + 0.13, 0x50545a, { faces: 'ENSTB' });
      b.box(px1, y - 0.12, (s < 0 ? dz0 : dz1) - 0.25, px1 + 0.16, y + 0.12, (s < 0 ? dz0 : dz1) + 0.25, 0x50545a, { faces: 'ENSTB' });
    }
  }
  face3(b, [px1 + 0.37, F + 2.95, zc - 0.5], [px1 + 0.37, F + 2.95, zc + 0.5], [px1 + 0.37, py - 0.1, zc], [1, 0, 0], GOLD);
  // its warning lamps, and vents and a mast on the mound
  for (const s of [-1, 1]) k.glows.push({ x: px1 + 0.45, y: F + 2.95, z: zc + s * 2.2, sx: 0.22, sy: 0.3, sz: 0.3, color: '#ffb45a' });
  for (const z of [mz0 + 2.2, mz1 - 2.2]) {
    b.cyl(mx0 + 2.4, z, my, my + 0.9, 0.3, 0.3, 6, ARMOUR, { cap: 0x484c52 });
    b.box(mx0 + 2.0, my + 0.9, z - 0.4, mx0 + 2.8, my + 1.05, z + 0.4, ARMOUR);
  }
  b.cyl(px0 + 0.8, pz1 - 0.7, top, top + 3.2, 0.07, 0.05, 6, 0xc9ced3, { cap: false });
  k.glows.push({ x: px0 + 0.8, y: top + 3.25, z: pz1 - 0.7, sx: 0.18, sy: 0.18, sz: 0.18, color: '#ff4a3a' });
  // its apron, and two Praetorians on guard
  area(k, rect(px1 + 0.35, pz0 - 0.6, px1 + 3.0, pz1 + 0.6), STONE, F + 0.065, { size: 1.0 });
  for (const s of [-1, 1]) figure(b, px1 + 1.3, zc + s * 2.0, F + 0.07, PRAETORIAN_GUARD);
  k.lights.push({ x: px1 + 1.5, z: zc, r: 7, color: AMBER, k: 0.45 });
  nameBoard(k, 'citadel-bunker', l.x0 + 4.6, l.z1 + 2.3, F);
};

// ---------------------------------------------------------------------------
// The terrace
// ---------------------------------------------------------------------------

const buildTerrace: Model = (k, l) => {
  const b = k.b, y = TER.y, z1 = TER.flatZ1;
  // the platform of white stone, a cornice under its floor, a plinth, blind niches lit at night
  b.box(l.x0, F, l.z0, l.x1, y, z1, WHITE, { top: LEDGE });
  b.box(l.x1, y - 0.42, l.z0 - 0.12, l.x1 + 0.12, y, z1 + 0.12, WHITE, { faces: 'ENSTB', top: LEDGE });
  b.box(l.x0 - 0.12, y - 0.42, l.z0 - 0.12, l.x0, y, z1 + 0.12, WHITE, { faces: 'WNSTB', top: LEDGE });
  b.box(l.x0, y - 0.42, z1, l.x1, y, z1 + 0.12, WHITE, { faces: 'STB', top: LEDGE });
  b.box(l.x0 - 0.1, F, l.z0 - 0.1, l.x1 + 0.1, F + 0.5, z1 + 0.1, PLINTH, { top: LEDGE });
  for (let i = 0; i < 3; i++) arched(b, l.x1, l.z0 + 2.0 + i * 2.4, 1, 0, 1.2, F + 0.6, F + 2.5, DOORWAY, 2.6, 0.03);
  for (const x of [l.x0 + 1.0, l.x1 - 1.0]) arched(b, x, z1, 0, 1, 1.0, F + 0.6, F + 2.3, DOORWAY, 2.6, 0.03);
  // the floor, laid in flags
  area(k, rect(l.x0, l.z0, l.x1, z1), MARBLE, y + 0.035, { size: 1.2 });
  // the bridge from the Citadel's door onto it, at the north-west corner
  const bx0 = l.x0, bx1 = l.x0 + 2.0, bz0 = PODIUM.z1, bz1 = l.z0;
  b.box(bx0, y - 0.7, bz0, bx1, y, bz1, WHITE, { faces: 'EWTB', top: ROOF });
  for (const [x0, x1] of [[bx0, bx0 + 0.22], [bx1 - 0.22, bx1]]) b.box(x0, y, bz0, x1, y + 0.9, bz1, WHITE, { top: LEDGE });
  // the balustrade on the east and the south, a rail on short balusters, no higher than 1.2
  const rail = (ax: number, az: number, cx: number, cz: number): void => {
    const alongX = Math.abs(cx - ax) > Math.abs(cz - az), len = alongX ? Math.abs(cx - ax) : Math.abs(cz - az);
    const put = (u0: number, u1: number, w0: number, w1: number, y0: number, y1: number): void =>
      alongX ? b.box(u0, y0, w0, u1, y1, w1, WHITE, { faces: 'NESWT' }) : b.box(w0, y0, u0, w1, y1, u1, WHITE, { faces: 'NESWT' });
    const w = alongX ? az : ax, a0 = alongX ? Math.min(ax, cx) : Math.min(az, cz), a1 = a0 + len;
    put(a0, a1, w - 0.15, w + 0.15, y, y + 0.14);
    put(a0, a1, w - 0.17, w + 0.17, y + 0.84, y + 0.98);
    const n = Math.max(2, Math.round(len / 0.62));
    for (let i = 1; i < n; i++) {
      const u = a0 + (len * i) / n;
      put(u - 0.08, u + 0.08, w - 0.08, w + 0.08, y + 0.14, y + 0.84);
    }
  };
  const e = l.x1 - 0.17;
  rail(e, l.z0 + 0.4, e, z1 - 0.4);
  rail(l.x0 + 0.4, z1 - 0.17, TER.sx0 - 0.6, z1 - 0.17);
  rail(TER.sx1 + 0.6, z1 - 0.17, l.x1 - 0.4, z1 - 0.17);
  for (const [px, pz] of [[e, l.z0 + 0.2], [e, z1 - 0.2], [l.x0 + 0.2, z1 - 0.2], [TER.sx0 - 0.4, z1 - 0.2], [TER.sx1 + 0.4, z1 - 0.2]]) {
    b.box(px - 0.22, y, pz - 0.22, px + 0.22, y + 1.1, pz + 0.22, WHITE, { faces: 'NESW' });
    b.box(px - 0.26, y + 1.1, pz - 0.26, px + 0.26, y + 1.2, pz + 0.26, LEDGE);
  }
  // the broad steps down on the south, between low cheek walls
  for (let i = 0; i < TER.steps; i++) {
    const zf = z1 + TER.tread * i, top = y - TER.rise * (i + 1);
    b.box(TER.sx0, F, zf, TER.sx1, top, zf + TER.tread, LEDGE, { faces: 'ST', top: MARBLE });
  }
  const foot = z1 + TER.tread * TER.steps, c0 = y + 0.6, c1 = F + 0.6;
  for (const [x0, x1, s] of [[TER.sx0 - 0.5, TER.sx0, -1], [TER.sx1, TER.sx1 + 0.5, 1]] as [number, number, number][]) {
    const xo = s < 0 ? x0 : x1, run = foot - z1, l2 = Math.hypot(run, c0 - c1);
    b.quad([xo, F, z1], [xo, F, foot], [xo, c1, foot], [xo, c0, z1], [s, 0, 0], WHITE);
    b.quad([x0, c0, z1], [x1, c0, z1], [x1, c1, foot], [x0, c1, foot], [0, run / l2, (c0 - c1) / l2], LEDGE);
    b.quad([x0, F, foot], [x1, F, foot], [x1, c1, foot], [x0, c1, foot], [0, 0, 1], WHITE);
  }
  // lanterns at the steps' foot, outside the stage, and light on the floor
  for (const x of [TER.sx0 - 1.0, TER.sx1 + 1.0]) {
    b.box(x - 0.1, F, foot + 0.9, x + 0.1, F + 1.6, foot + 1.1, 0x9a9488);
    k.glows.push({ x, y: F + 1.8, z: foot + 1.0, sx: 0.3, sy: 0.36, sz: 0.3, color: '#ffe2ae' });
  }
  k.lights.push({ x: (l.x0 + l.x1) / 2, z: (l.z0 + z1) / 2, r: 9, color: WARM, k: 0.5 });
  // its name, a little smaller than most, in the way between the bunker and the terrace's steps
  nameBoard(k, 'citadel-terrace', (BK.x1 + l.x0) / 2 - 0.2, l.z1 - 1.2, F, TO_VIEW, 1.2);
};

// ---------------------------------------------------------------------------
// The landing pads
// ---------------------------------------------------------------------------

/**
 * Where the four shuttles stand on the landing pads, and which way each faces
 * (radians: 0 east). Four round pads in a rank across the deck's north half,
 * each shuttle nose to the north and its ramp down to the south, onto the
 * open deck. The first is the Sovereign's, at the west, with the deck open
 * before its ramp and to the south-west of it for the fights round Aja.
 */
export const SHUTTLE_PADS: { x: number; z: number; heading: number }[] = [0, 1, 2, 3].map((i) => {
  const gap = (PD.x1 - PD.x0 - 4 * SHUTTLE_W) / 4;
  return { x: PD.x0 + gap / 2 + SHUTTLE_W / 2 + i * (SHUTTLE_W + gap), z: PAD_Z, heading: -Math.PI / 2 };
});

const buildPads: Model = (k, l) => {
  const b = k.b, y = DECK_Y, under = y - 1.4;
  // the deck: white at its edge, a crimson band, the landing surface on top, closed underneath
  b.box(l.x0, under, l.z0, l.x1, y, l.z1, WHITE, { top: DECK, faces: 'NESWTB' });
  b.box(l.x0 - 0.06, y - 0.75, l.z0 - 0.06, l.x1 + 0.06, y - 0.45, l.z1 + 0.06, RED, { faces: 'NESWTB', top: RED_TOP });
  // under it, hangars: their fronts set back on the east and the south behind an arcade of piers, lit within
  const set = 1.8, hx1 = l.x1 - set, hz1 = l.z1 - set, arcadeX0 = l.x1 - 13.2;
  b.box(l.x0, F, l.z0, hx1, under, hz1, WHITE, { faces: 'NW' });
  b.box(l.x0, F, l.z0, hx1, under, hz1, HANGAR, { faces: 'ES', win: interior(2.2) });
  const doors = (along: 'x' | 'z', a0: number, a1: number, at: number, pitch: number): void => {
    for (let u = a0, i = 0; u + pitch <= a1 + 0.01; u += pitch, i++) {
      if (i % 3 === 1) continue; // an open bay, its lit inside showing
      if (along === 'z') b.box(at, F, u + 0.55, at + 0.04, under - 0.9, u + pitch - 0.55, STEEL_DOOR, { faces: 'E' });
      else b.box(u + 0.55, F, at, u + pitch - 0.55, under - 0.9, at + 0.04, STEEL_DOOR, { faces: 'S' });
    }
  };
  doors('z', l.z0, hz1, hx1, 3.0);
  doors('x', arcadeX0, hx1, hz1, 3.0);
  for (let z = l.z0; z <= l.z1 + 0.01; z += 3.0) {
    const zz = Math.min(z, l.z1 - 0.8);
    b.box(l.x1 - 0.95, F, zz, l.x1 - 0.15, under, zz + 0.8, WHITE, { faces: 'NESW' });
    if (z + 1.5 < l.z1) k.glows.push({ x: l.x1 - set / 2 - 0.2, y: under - 0.12, z: z + 1.5, sx: 0.4, sy: 0.12, sz: 0.4, color: '#ffe2ae' });
  }
  for (let x = l.x1 - 3.0; x > arcadeX0 - 0.3; x -= 3.0) {
    b.box(x, F, l.z1 - 0.95, x + 0.8, under, l.z1 - 0.15, WHITE, { faces: 'NESW' });
    k.glows.push({ x: x - 1.1, y: under - 0.12, z: l.z1 - set / 2 - 0.2, sx: 0.4, sy: 0.12, sz: 0.4, color: '#ffe2ae' });
  }
  // the south front behind the stair is the hangars' own wall
  b.box(l.x0, F, hz1, arcadeX0, under, l.z1 - 0.15, WHITE, { faces: 'SE' });
  // pilasters on the west and north fronts
  for (let z = l.z0 + 3; z < l.z1 - 1; z += 4) b.box(l.x0 - 0.18, F, z - 0.3, l.x0, under, z + 0.3, WHITE, { faces: 'WNS' });
  for (let x = l.x0 + 3; x < l.x1 - 1; x += 4) b.box(x - 0.3, F, l.z0 - 0.18, x + 0.3, under, l.z0, WHITE, { faces: 'NEW' });

  // ---- the stair up the south face from the gate court, rising to the west, an open landing at its head
  const sz0 = l.z1, sz1 = l.z1 + 1.4, rise = 0.5, treadW = 0.6, n = Math.round((y - F) / rise) - 1, sx0 = l.x0 + 1.95 + n * treadW;
  for (let i = 0; i < n; i++) {
    const x1 = sx0 - i * treadW, top = F + rise * (i + 1);
    b.box(x1 - treadW, F, sz0, x1, top, sz1, LEDGE, { faces: 'EST', top: MARBLE });
  }
  // the landing at its head is as open as the deck, so that the gate court's lions show over it
  b.box(l.x0 + 0.05, F, sz0, l.x0 + 1.95, y, sz1, WHITE, { faces: 'WEST', top: DECK });
  b.box(l.x0, y - 0.75, sz0, l.x0 + 2.0, y - 0.45, sz1 + 0.06, RED, { faces: 'WESTB', top: RED_TOP });
  slab(b, [sx0 + 0.1, F + rise + 0.9, sz1 - 0.08], [l.x0 + 1.95, y + 0.9, sz1 - 0.08], 0.08, 0.9, WHITE, { under: WHITE });

  // ---- the ramp up the east face, from the north to the south, on posts, closed underneath
  const rx0 = l.x1, rx1 = l.x1 + 1.4, rxm = (rx0 + rx1) / 2, rz0 = l.z0 + 1.0, rzt = l.z1 - 5.0, rz1 = l.z1 - 0.4;
  slab(b, [rxm, F + 0.06, rz0], [rxm, y, rzt], 0.7, 0.4, DECK, { under: SOFFIT });
  b.box(rx0, y - 0.4, rzt, rx1, y, rz1, WHITE, { top: DECK, faces: 'NESTB' });
  slab(b, [rx1 - 0.07, F + 0.9, rz0], [rx1 - 0.07, y + 0.9, rzt], 0.07, 1.25, WHITE, { under: WHITE });
  b.box(rx1 - 0.14, y, rzt, rx1, y + 0.9, rz1, WHITE, { top: LEDGE });
  for (let z = rz0 + 4; z < rzt; z += 4) {
    const ry = F + ((z - rz0) / (rzt - rz0)) * (y - F) - 0.4;
    b.box(rxm - 0.15, F, z - 0.15, rxm + 0.15, ry, z + 0.15, WHITE, { faces: 'NESW' });
  }
  b.box(rxm - 0.15, F, rz1 - 0.4, rxm + 0.15, y - 0.4, rz1 - 0.1, WHITE, { faces: 'NESW' });

  // ---- landing lights along the deck's edge, white, amber at the corners; none where the stair and the ramp's landing are
  for (let x = l.x0 + 1; x < l.x1; x += 2) {
    const amber = Math.abs(x - l.x0) < 2 || Math.abs(x - l.x1) < 2;
    k.glows.push({ x, y: y - 0.2, z: l.z0 - 0.12, sx: 0.3, sy: 0.14, sz: 0.1, color: amber ? '#ffb45a' : '#eaf4ff' });
    if (x > sx0 + 0.4) k.glows.push({ x, y: y - 0.2, z: l.z1 + 0.12, sx: 0.3, sy: 0.14, sz: 0.1, color: amber ? '#ffb45a' : '#eaf4ff' });
  }
  for (let z = l.z0 + 1; z < l.z1; z += 2) {
    k.glows.push({ x: l.x0 - 0.12, y: y - 0.2, z, sx: 0.1, sy: 0.14, sz: 0.3, color: '#eaf4ff' });
    if (z < rzt - 0.4) k.glows.push({ x: l.x1 + 0.12, y: y - 0.2, z, sx: 0.1, sy: 0.14, sz: 0.3, color: '#eaf4ff' });
  }

  // ---- the markings: a gold line round the deck, the four round pads with the Society's pyramid, the bay for a hero
  const line = (x0: number, z0: number, x1: number, z1: number, col: number): void => b.box(x0, y, z0, x1, y + 0.03, z1, col, { faces: 'T' });
  const inset = 0.5, w = 0.12;
  line(l.x0 + inset, l.z0 + inset, l.x1 - inset, l.z0 + inset + w, GOLD);
  line(l.x0 + inset, l.z1 - inset - w, l.x1 - inset, l.z1 - inset, GOLD);
  line(l.x0 + inset, l.z0 + inset + w, l.x0 + inset + w, l.z1 - inset - w, GOLD);
  line(l.x1 - inset - w, l.z0 + inset + w, l.x1 - inset, l.z1 - inset - w, GOLD);
  const pr = (SHUTTLE_PADS[1].x - SHUTTLE_PADS[0].x) / 2 - 0.12;
  for (const p of SHUTTLE_PADS) {
    const cz = p.z + 0.2;
    area(k, oval(p.x, cz, pr, pr, 12), 0xf2eee5, y + 0.035);
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * Math.PI * 2, a1 = ((i + 1) / 12) * Math.PI * 2, r0 = pr - 0.3, r1 = pr - 0.05, h = y + 0.045;
      b.quad([p.x + Math.cos(a0) * r0, h, cz + Math.sin(a0) * r0], [p.x + Math.cos(a1) * r0, h, cz + Math.sin(a1) * r0], [p.x + Math.cos(a1) * r1, h, cz + Math.sin(a1) * r1], [p.x + Math.cos(a0) * r1, h, cz + Math.sin(a0) * r1], [0, 1, 0], GOLD);
    }
    face3(b, [p.x - 0.9, y + 0.055, cz + 0.75], [p.x + 0.9, y + 0.055, cz + 0.75], [p.x, y + 0.055, cz - 0.85], [0, 1, 0], GOLD);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      k.glows.push({ x: p.x + Math.cos(a) * (pr - 0.18), y: y + 0.08, z: cz + Math.sin(a) * (pr - 0.18), sx: 0.14, sy: 0.06, sz: 0.14, color: '#ffe7b0' });
    }
  }
  const hx = HERO_PAD.x, hz = HERO_PAD.z, bw = 4.3, bd = 1.95, lw = 0.12;
  line(hx - bw, hz - bd, hx + bw, hz - bd + lw, 0xf2eee5);
  line(hx - bw, hz + bd - lw, hx + bw, hz + bd, 0xf2eee5);
  line(hx - bw, hz - bd + lw, hx - bw + lw, hz + bd - lw, 0xf2eee5);

  // ---- the deck's crew below, at the hangars, and light on the deck
  for (const [x, z] of [[l.x1 - 0.6, l.z0 + 6.5], [l.x1 - 0.5, l.z0 + 15.5], [l.x1 - 7.6, l.z1 - 0.6]]) figure(b, x, z, F + 0.02, CREW);
  k.lights.push({ x: (l.x0 + l.x1) / 2, z: PAD_Z + 2, r: 12, color: WARM, k: 0.5 }, { x: HERO_PAD.x, z: HERO_PAD.z + 1, r: 10, color: WARM, k: 0.4 });
  nameBoard(k, 'citadel-pads', l.x1 - 5.5, l.z1 + 3.5, F);
};

// ---------------------------------------------------------------------------
// The Field of Mars
// ---------------------------------------------------------------------------

/** An arc of a circle, as points: from angle a0 to a1 in degrees (0 east, 90 south), a point every `step` degrees or so. */
function arcPts(cx: number, cz: number, r: number, a0: number, a1: number, step = 7.5): P2[] {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step));
  return Array.from({ length: n + 1 }, (_, i): P2 => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + Math.cos(a) * r, cz + Math.sin(a) * r];
  });
}

const buildField: Model = (k, l) => {
  const b = k.b, [cx, cz] = RING.c;
  // the ring's road, as the roads lay it: one lane and a little more either side of its middle line
  const outer = RING.r + 3.1 + 0.1, inner = RING.r - 3.1 - 0.05;
  // the plaza: white stone in flags from the lot's edges to the ring's outer kerb, clear of the avenue's carriageway
  const xa = cx - 5.3, za = cz - Math.sqrt(outer * outer - (xa - cx) * (xa - cx)), ze = cz + Math.sqrt(outer * outer - (l.x1 - cx) * (l.x1 - cx));
  const aStart = (Math.atan2(za - cz, xa - cx) * 180) / Math.PI + 360, aEnd = (Math.atan2(ze - cz, l.x1 - cx) * 180) / Math.PI;
  area(k, [[l.x0, l.z0], [xa, l.z0], ...arcPts(cx, cz, outer, aStart, aEnd), [l.x1, l.z1], [l.x0, l.z1]], MARBLE, F + 0.035, { size: 1.8 });
  area(k, oval(cx, cz, inner, inner, 24), MARBLE, F + 0.035, { size: 1.2 });
  // a red border on the west and the south, and a red band round the ring from the south-east to the north-west
  area(k, rect(l.x0, l.z0, l.x0 + 0.8, l.z1), RED_STONE, F + 0.045);
  area(k, rect(l.x0 + 0.8, l.z1 - 0.8, l.x1, l.z1), RED_STONE, F + 0.045);
  const rb0 = outer + 0.5, rb1 = outer + 1.3;
  area(k, [...arcPts(cx, cz, rb1, 62, 218), ...arcPts(cx, cz, rb0, 218, 62)], RED_STONE, F + 0.045);
  // grey lines out from the band to the border, to the south, the south-west and the west
  for (const deg of [90, 135, 180]) {
    const a = (deg * Math.PI) / 180, ux = Math.cos(a), uz = Math.sin(a), px = -uz * 0.25, pz = ux * 0.25;
    let t1 = rb1 + 0.05;
    while (t1 < 60 && cx + ux * (t1 + 0.2) > l.x0 + 0.85 && cz + uz * (t1 + 0.2) < l.z1 - 0.85) t1 += 0.2;
    const t0 = rb1 + 0.05;
    area(k, [[cx + ux * t0 + px, cz + uz * t0 + pz], [cx + ux * t1 + px, cz + uz * t1 + pz], [cx + ux * t1 - px, cz + uz * t1 - pz], [cx + ux * t0 - px, cz + uz * t0 - pz]], GREY_STONE, F + 0.045);
  }
  // the lion of House Augustus on its plinth, on the ring's island: three round steps, a pedestal with red panels and a gold band
  b.cyl(cx, cz, F, F + 0.3, 3.3, 3.3, 12, STONE, { cap: LEDGE });
  b.cyl(cx, cz, F + 0.3, F + 0.6, 2.8, 2.8, 12, STONE, { cap: LEDGE });
  b.cyl(cx, cz, F + 0.6, F + 0.9, 2.3, 2.3, 12, STONE, { cap: LEDGE });
  const pw = 1.55, pd = 1.05, pt = F + 3.5;
  b.box(cx - pw - 0.12, F + 0.9, cz - pd - 0.12, cx + pw + 0.12, F + 1.3, cz + pd + 0.12, MARBLE, { top: LEDGE });
  b.box(cx - pw, F + 1.3, cz - pd, cx + pw, pt - 0.35, cz + pd, MARBLE, { faces: 'NESW' });
  b.box(cx - pw - 0.1, pt - 0.35, cz - pd - 0.1, cx + pw + 0.1, pt, cz + pd + 0.1, AUGUSTUS_GOLD, { top: LEDGE });
  b.box(cx - pw + 0.3, F + 1.6, cz + pd, cx + pw - 0.3, pt - 0.65, cz + pd + 0.04, AUGUSTUS_RED, { faces: 'S' });
  b.box(cx - pw + 0.3, F + 1.6, cz - pd - 0.04, cx + pw - 0.3, pt - 0.65, cz - pd, AUGUSTUS_RED, { faces: 'N' });
  b.box(cx + pw, F + 1.6, cz - pd + 0.25, cx + pw + 0.04, pt - 0.65, cz + pd - 0.25, AUGUSTUS_RED, { faces: 'E' });
  b.box(cx - pw - 0.04, F + 1.6, cz - pd + 0.25, cx - pw, pt - 0.65, cz + pd - 0.25, AUGUSTUS_RED, { faces: 'W' });
  lion(b, cx, cz, pt, 1.3, 0, GOLD, CITADEL_RED);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2, x = cx + Math.cos(a) * 2.55, z = cz + Math.sin(a) * 2.55;
    b.box(x - 0.16, F + 0.6, z - 0.16, x + 0.16, F + 1.5, z + 0.16, BRONZE);
    k.glows.push({ x, y: F + 1.65, z, sx: 0.3, sy: 0.3, sz: 0.3, color: '#ffe2ae' });
  }
  // low lamps round the plaza's west and south edges, and banners on poles on the west
  const lamp = (x: number, z: number): void => {
    b.box(x - 0.12, F, z - 0.12, x + 0.12, F + 1.1, z + 0.12, BRONZE);
    k.glows.push({ x, y: F + 1.25, z, sx: 0.3, sy: 0.3, sz: 0.3, color: '#ffe2ae' });
  };
  for (let z = l.z0 + 3; z < l.z1 - 4; z += 6) lamp(l.x0 + 1.4, z);
  for (let x = l.x0 + 7; x < l.x1 - 1; x += 7) if (Math.abs(x - HERO_FIELD.x) > 6) lamp(x, l.z1 - 1.4);
  for (const z of [l.z0 + 6.5, l.z1 - 3.5]) banner(b, l.x0 + 0.5, z, F, 6.8, AUGUSTUS_RED, AUGUSTUS_GOLD, FACING_VIEW);
  k.lights.push({ x: cx, z: cz, r: 13, color: WARM, k: 0.55 }, { x: l.x0 + 7, z: (l.z0 + l.z1) / 2 + 3, r: 11, color: WARM, k: 0.45 });
  nameBoard(k, 'citadel-field', l.x0 + 4.2, cz, F);
};

// ---------------------------------------------------------------------------
// What the rest of the tile calls
// ---------------------------------------------------------------------------

/** A model for each lot this file builds, by the id of the lot in plan.ts. */
export const MODELS: Record<string, Model> = {
  citadel: buildCitadel,
  'citadel-wall': buildGrounds,
  bunker: buildBunker,
  terrace: buildTerrace,
  pads: buildPads,
  field: buildField,
};
/** Lots built as part of another lot's model or by `extras`, which get no box either. */
export const COVERS: string[] = [];
/** Every sign this file hangs. Each id begins with this file's name and a hyphen. */
export const SIGNS: SignDef[] = [
  nameSign('citadel-name', 'The Citadel'),
  nameSign('citadel-pads', 'Landing Pads'),
  nameSign('citadel-terrace', 'The Terrace'),
  nameSign('citadel-bunker', 'Bunker'),
  nameSign('citadel-field', 'Field of Mars'),
];
/** Whatever this file builds that is not one of the plan's lots: the grounds' trees and people, once every name board stands. */
export function extras(k: Build): void {
  grounds(k);
}

/** Places on this file's things that the show's stories use, worked out from the plan. */
export const CITADEL_PLACES = {
  /** The top of the outer wall's plain north-east stretch, where Sevro lifts Darrow (story 4): the middle of its walk, its height, and where the stretch runs from north to south. */
  wallTop: { x: WL.x1 - WALL_T / 2, y: WALK, z0: WL.z0 + WALL_T, z1: COURT.z0 },
  /** The terrace's floor, where it runs and where its flat ends; its steps, each tread's height and where it runs; and the way onto it from the Citadel, the bridge at its north-west corner. */
  terrace: {
    y: TER.y, x0: TR.x0, x1: TR.x1, z0: TR.z0, flatZ1: TER.flatZ1,
    steps: Array.from({ length: TER.steps }, (_, i) => ({ y: TER.y - TER.rise * (i + 1), z0: TER.flatZ1 + TER.tread * i, z1: TER.flatZ1 + TER.tread * (i + 1), x0: TER.sx0, x1: TER.sx1 })),
    door: { x: TR.x0 + 1.0, z: TR.z0 + 0.4 },
  },
  /** The deck's height; the head of the stair up from the gate court (its landing at the south-west corner); the ramp's foot (north-east) and head (south-east). */
  pads: { y: DECK_Y, stairHead: { x: PD.x0 + 1.0, z: PD.z1 + 0.7 }, rampFoot: { x: PD.x1 + 0.7, z: PD.z0 + 1.0 }, rampHead: { x: PD.x1 + 0.7, z: PD.z1 - 2.7 } },
  /** The gate in the outer wall, and the Citadel's great door on the same axis, at the head of the portico's steps. */
  gate: { x: COURT.x0 + WALL_T / 2, z: AXIS_Z },
  door: { x: PODIUM.x1, z: AXIS_Z, y: PORTICO.sty },
};

// ---------------------------------------------------------------------------
// The Sovereign's shuttle
// ---------------------------------------------------------------------------

/** Where things are on a shuttle, in its own frame (its nose along +x, standing on y = 0, its middle over (0, 0)): for the show. */
export const SHUTTLE = {
  /** The ramp at its stern: where it is hinged in the open hatch, and where its lip rests on the deck. */
  hinge: [-3.5, 0.6, 0] as V3,
  lip: [-4.9, 0.04, 0] as V3,
  /** The open hatch, at the head of the ramp. */
  hatch: [-3.2, 1.2, 0] as V3,
  /** The two engines' exhausts, where the show's glows belong. */
  engines: [[-3.85, 0.92, 1.38], [-3.85, 0.92, -1.38]] as V3[],
  length: 9.5, width: SHUTTLE_W, height: 3.0,
};

/**
 * The Sovereign's shuttle, which the three decoys look exactly like (GS 41):
 * its nose along +x, standing on y = 0, its middle over (0, 0), for the show
 * to build four of and fly (story 6). The books give it no look: here it is a
 * sleek lifting body in white and gold, the Society's colours, with a gold
 * nose and a gold belt along its flanks, a dark wraparound canopy, short swept
 * wings over two engines, a tail of two fins each with the Society's pyramid,
 * and at its stern an open hatch, lit within, with its ramp down.
 */
export function shuttleGeometry(): import('three').BufferGeometry | null {
  const b = new GeoBuilder();
  const HULL = 0xf6f3ec, BELLY = 0xb9b5ad, GOLDEN = 0xd9b24a, GLASS = 0x1f2a36, INSIDE = 0xe6e0d4, FLOOR = 0x8d9095, CABIN = 0x5e4426, EXHAUST = 0x6a3412, GREY = 0x9ea2a8;
  // sections from the nose to the stern: x, half width, keel, top
  const SEC: [number, number, number, number][] = [[3.9, 0.42, 0.84, 1.36], [2.9, 0.86, 0.66, 1.8], [1.6, 1.08, 0.58, 2.06], [0.0, 1.16, 0.56, 2.18], [-2.2, 1.16, 0.56, 2.18], [-3.5, 1.06, 0.6, 2.04]];
  const NOSE: V3 = [4.6, 1.06, 0];
  /** A section's outline: the keel, four corners up the starboard side, the top, and four down the port side. */
  const ringOf = ([x, w, yb, yt]: [number, number, number, number]): V3[] => {
    const h = yt - yb;
    const side: [number, number][] = [[0.74 * w, yb], [w, yb + 0.3 * h], [0.97 * w, yb + 0.6 * h], [0.62 * w, yt - 0.06 * h]];
    return [[x, yb, 0], ...side.map(([z, y]): V3 => [x, y, z]), [x, yt, 0], ...[...side].reverse().map(([z, y]): V3 => [x, y, -z])];
  };
  const rings = SEC.map(ringOf);
  const midY = (x: number): number => {
    for (let i = 0; i + 1 < SEC.length; i++) if (x <= SEC[i][0] && x >= SEC[i + 1][0]) return (SEC[i][2] + SEC[i][3]) / 2;
    return (SEC[0][2] + SEC[0][3]) / 2;
  };
  /** A face of the hull between three or four corners, facing away from the hull's axis. */
  const skin = (p: V3[], color: number): void => {
    const c = p.reduce((s, q): V3 => [s[0] + q[0] / p.length, s[1] + q[1] / p.length, s[2] + q[2] / p.length], [0, 0, 0]);
    const e1 = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]], e2 = [p[p.length - 1][0] - p[0][0], p[p.length - 1][1] - p[0][1], p[p.length - 1][2] - p[0][2]];
    let n: V3 = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const out: V3 = [c[0] > 3.9 ? c[0] - 3.9 : 0, c[1] - midY(c[0]), c[2]];
    if (n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0) n = [-n[0], -n[1], -n[2]];
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    n = [n[0] / l, n[1] / l, n[2] / l];
    if (p.length === 4) b.quad(p[0], p[1], p[2], p[3], n, color);
    else face3(b, p[0], p[1], p[2], n, color);
  };
  // which part of the skin each edge of a section's outline is: belly, gold belt, side, shoulder, top
  const part = (e: number): number => [0, 1, 2, 3, 4, 4, 3, 2, 1, 0][e];
  for (let s = 0; s + 1 < rings.length; s++) {
    const A = rings[s], B = rings[s + 1];
    for (let e = 0; e < 10; e++) {
      const f = (e + 1) % 10, kind = part(e);
      let color = [BELLY, GOLDEN, HULL, HULL, HULL][kind];
      if (s === 0 && kind >= 3) color = GLASS;
      if (s === 1 && kind === 3) color = GLASS;
      skin([A[e], A[f], B[f], B[e]], color);
    }
  }
  // the gold nose
  for (let e = 0; e < 10; e++) skin([NOSE, rings[0][e], rings[0][(e + 1) % 10]], GOLDEN);
  // the stern: a frame round the open hatch, the hatch lit within, and the ramp down from it
  const HZ = 0.62, HY0 = 0.6, HY1 = 1.78, XS = SEC[SEC.length - 1][0], XH = XS + 0.6;
  const stern = rings[rings.length - 1];
  const outline: THREE.Vector2[] = [];
  for (let i = 1; i <= 9; i++) outline.push(new THREE.Vector2(stern[i][2], stern[i][1]));
  outline.push(new THREE.Vector2(-HZ, HY0), new THREE.Vector2(-HZ, HY1), new THREE.Vector2(HZ, HY1), new THREE.Vector2(HZ, HY0));
  for (const [i, j, m] of THREE.ShapeUtils.triangulateShape(outline, [])) {
    const p = (q: THREE.Vector2): V3 => [XS, q.y, q.x];
    face3(b, p(outline[i]), p(outline[j]), p(outline[m]), [-1, 0, 0], HULL);
  }
  b.quad([XS, HY0, -HZ], [XS, HY0, HZ], [XH, HY0, HZ], [XH, HY0, -HZ], [0, 1, 0], FLOOR);
  b.quad([XS, HY1, -HZ], [XS, HY1, HZ], [XH, HY1, HZ], [XH, HY1, -HZ], [0, -1, 0], INSIDE);
  for (const s of [-1, 1]) b.quad([XS, HY0, s * HZ], [XH, HY0, s * HZ], [XH, HY1, s * HZ], [XS, HY1, s * HZ], [0, 0, -s], INSIDE);
  b.quad([XH, HY0, -HZ], [XH, HY0, HZ], [XH, HY1, HZ], [XH, HY1, -HZ], [-1, 0, 0], CABIN, { win: interior(2.6) });
  slab(b, [XS, HY0 + 0.02, 0], [SHUTTLE.lip[0], SHUTTLE.lip[1] + 0.02, 0], HZ - 0.02, 0.08, FLOOR, { under: BELLY });
  for (const s of [-1, 1]) b.beam([XS, HY0 + 0.1, s * (HZ - 0.04)], [SHUTTLE.lip[0] + 0.1, SHUTTLE.lip[1] + 0.1, s * (HZ - 0.04)], 0.05, 0.05, GOLDEN);
  // the wings, short and swept, over the engines: white above, the belly's grey below, their leading edges gold
  for (const s of [-1, 1]) {
    const T: V3[] = [[0.9, 1.26, 1.05 * s], [-2.9, 1.26, 1.05 * s], [-3.1, 1.36, 1.8 * s], [-1.9, 1.36, 1.8 * s]];
    const D: V3[] = T.map((p, i): V3 => [p[0], p[1] - (i < 2 ? 0.14 : 0.06), p[2]]);
    const u = [T[1][0] - T[0][0], T[1][1] - T[0][1], T[1][2] - T[0][2]], v = [T[3][0] - T[0][0], T[3][1] - T[0][1], T[3][2] - T[0][2]];
    let nt: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (nt[1] < 0) nt = [-nt[0], -nt[1], -nt[2]];
    const ntl = Math.hypot(nt[0], nt[1], nt[2]);
    nt = [nt[0] / ntl, nt[1] / ntl, nt[2] / ntl];
    b.quad(T[0], T[1], T[2], T[3], nt, HULL);
    b.quad(D[0], D[1], D[2], D[3], [-nt[0], -nt[1], -nt[2]], BELLY);
    const lx = T[3][0] - T[0][0], lz = T[3][2] - T[0][2], ll = Math.hypot(lx, lz);
    b.quad(T[0], T[3], D[3], D[0], [Math.abs(lz) / ll, 0, (s * Math.abs(lx)) / ll], GOLDEN);
    b.quad(T[1], T[2], D[2], D[1], [-1, 0, 0], BELLY);
    b.quad(T[2], T[3], D[3], D[2], [0, 0, s], HULL);
  }
  // the engines under the wings, gold at the front, their exhausts glowing at night
  for (const [ex, ey, ez] of SHUTTLE.engines) {
    drum(b, [-2.6, ey, ez], 0.36, 1.15, HULL, { cap: GOLDEN });
    roundel(b, [ex + 0.08, ey, ez], 0.27, 'W', EXHAUST, { win: interior(3.0) }, 8);
  }
  // the tail: two fins canted outwards, gold-tipped, each with the Society's pyramid in gold on its outer face
  for (const s of [-1, 1]) {
    const R0: V3 = [-1.5, 2.12, 0.42 * s], R1: V3 = [-3.45, 2.0, 0.42 * s], T1: V3 = [-3.65, 3.0, 0.9 * s], T0: V3 = [-2.75, 3.0, 0.9 * s];
    const nl = Math.hypot(0.88, 0.47), n: V3 = [0, -0.47 / nl, (0.88 / nl) * s], up: V3 = [0, 0.88 / nl, (0.47 / nl) * s];
    const off = (p: V3, d: number): V3 => [p[0], p[1] + n[1] * d, p[2] + n[2] * d];
    const O = [R0, R1, T1, T0].map((p) => off(p, 0.05)), I = [R0, R1, T1, T0].map((p) => off(p, -0.05));
    b.quad(O[0], O[1], O[2], O[3], n, HULL);
    b.quad(I[0], I[1], I[2], I[3], [-n[0], -n[1], -n[2]], HULL);
    b.quad(O[3], O[0], I[0], I[3], [0.8, 0.6, 0], HULL);
    b.quad(O[1], O[2], I[2], I[1], [-1, 0, 0], HULL);
    b.quad(O[2], O[3], I[3], I[2], [0, 1, 0], GOLDEN);
    const at = (du: number, dv: number): V3 => off([-2.75 + du, 2.5 + up[1] * dv, 0.66 * s + up[2] * dv], 0.07);
    face3(b, at(0, 0.34), at(-0.32, -0.2), at(0.32, -0.2), n, GOLDEN);
  }
  // a gold crest along the spine
  for (const s of [-1, 1]) face3(b, [1.2, 2.0, 0.04 * s], [-1.7, 2.16, 0.04 * s], [-1.4, 2.42, 0.04 * s], [0, 0, s], GOLDEN);
  b.quad([1.2, 2.0, -0.04], [1.2, 2.0, 0.04], [-1.4, 2.42, 0.04], [-1.4, 2.42, -0.04], [0.16, 0.99, 0], GOLDEN);
  // cabin windows along each side, lit within at night
  const sw = rings[3], p2 = sw[2], p3 = sw[3];
  const ny = p2[2] - p3[2], nz = p3[1] - p2[1], nn = Math.hypot(ny, nz);
  const zAt = (yy: number): number => p2[2] + ((p3[2] - p2[2]) * (yy - p2[1])) / (p3[1] - p2[1]);
  for (const s of [-1, 1]) {
    const N: V3 = [0, ny / nn, (nz / nn) * s];
    for (const xc of [-0.4, -1.1, -1.8]) {
      const q = (x: number, yy: number): V3 => [x, yy + N[1] * 0.02, (zAt(yy) + (nz / nn) * 0.02) * s];
      b.quad(q(xc - 0.22, 1.12), q(xc + 0.22, 1.12), q(xc + 0.22, 1.44), q(xc - 0.22, 1.44), N, CABIN, { win: interior(3.0) });
    }
  }
  // the landing gear: two skids on struts
  for (const s of [-1, 1]) {
    b.box(-2.5, 0, 0.68 * s - 0.09, 2.2, 0.1, 0.68 * s + 0.09, GREY, { faces: 'NESWT' });
    for (const x of [-1.9, 1.5]) b.box(x - 0.06, 0.1, 0.68 * s - 0.05, x + 0.06, 0.6, 0.68 * s + 0.05, GREY, { faces: 'NESW' });
  }
  return b.build();
}
