// High Tide, Corlys Velaryon's new castle, on its tidal islet in the Gullet
// south of Driftmark, and the causeway to it over the sands that the sea
// leaves at low tide.
//
// From the books, as the research note and the wikis give them (Fire & Blood,
// "Heirs of the Dragon"; The World of Ice and Fire, "Jaehaerys I"): Lord
// Corlys, the Sea Snake, built High Tide on the other side of Driftmark from
// the old castle, which was damp and cramped, to house the treasures he
// brought back from Essos and the Driftwood Throne, the Velaryons' ancient
// high seat, said to have been given them by the merling king. It is of pale
// stone, as the Eyrie is, with many slender towers crowned with roofs of
// beaten silver that shine in the sun, and at high tide the sea surrounds it
// and a causeway joins it to the island. It burned in 130 AC; in 129 it
// stands whole and splendid.
//
// Here: a court round the ring where the causeway's road turns, entered by a
// pointed gate on the north with the castle's name over it; a tall keep in
// the north-west corner beside the gate; the great hall along the west side,
// its tall windows and its open door facing the court and the view the tile
// opens with, and inside, in the warm dark, a glimpse of the Driftwood Throne
// on its dais; turrets and a slender tower with cones of beaten silver; a low
// sea wall to the south over the Gullet, with a loggia under a striped silk
// awning; a stair turret with a brass dome; a fountain with a silver seahorse
// among orange trees in the middle of the ring; on the east, a dragon terrace
// open to the sky, where Meleys rests (her home is the plan's); and the stone
// causeway over the sands, with its edging, its weed, its marker posts and
// its lanterns. The books give no plan, no colours but the stone's and the
// roofs', and no shape for the throne: those are this tile's own.

import * as THREE from 'three';
import { Smoke } from '../../engine/effects';
import { interior, rng, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { area, flat, walls } from '../../engine/ground';
import { figure, lathe, roundel } from '../../engine/parts';
import { face3, prism, type XZ } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { DARK, DOOR, HOUSE, IRONWORK, LANCETS, ROOF, STONE, TIMBER, TIMBER_DARK, banner, brazier, doorway, fire, nameBoard, nameSign } from './look';
import type { Model } from './models';
import { DYKE, HERO_SPOTS, HOMES, ISLANDS, LANE, ROADS, SANDBAR, SANDS, TURNS, groundAt, inside, sandbarOut, type Lot, type P2 } from './plan';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// What the castle is laid out round
// ---------------------------------------------------------------------------

/** The ring the causeway's road turns in, in the court. */
const RING = TURNS.highTide, CX = RING.c[0], CZ = RING.c[1];
/** How far round the ring's middle the court is kept open: the ring's paving and a little more. */
const COURT = RING.r + (LANE + 1.2) / 2 + 0.7;
/** The causeway's road, which comes in through the gate on the north side, and its middle. */
const ROAD = ROADS.causeway, ROAD_X = ROAD[ROAD.length - 1][0];
/** Half the gate's width: the road, and a little more on each side. */
const GATE_HALF = LANE + 0.6;

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const PALE = STONE.pale, PALE_SHADE = STONE.paleShade;
/** Beaten silver: the roofs' own colour, and plates of it that catch the sun more and less. */
const SILVER = ROOF.silver, SILVER_HI = 0xe4e9ef, SILVER_LO = 0xb1bac5;
/** Brass, for the small dome from the east. */
const BRASS = 0xc39232, BRASS_HI = 0xe2b95a;
const SEA_GREEN = HOUSE.velaryon[0], SEA_DARK = 0x1f5c4f, SEAHORSE = 0xe0e4e9;
/** Glass that is dark by day and glows by night. */
const GLASS = 0x3d3129;
/** The hall inside: warm and dark, and lit at night. */
const HALL_IN = 0x3e2b20, HALL_FLOOR = 0x2c1e17, CARPET = 0x7c2622;
/** Driftwood, pale and grey. */
const DRIFT = [0xdcd3c2, 0xc4b9a4, 0xaa9e87];
/** The causeway's stone, darker where the sea wets it, and the weed on it. */
const CAUSE = 0xd2cbbb, CAUSE_WET = 0xa9a294, WEED = 0x4d5b36, WEED_DARK = 0x3b4730;
/** The court's paving, and the water of its fountain. */
const COURT_PAVE = 0xcdc4b2, WATER = 0x6aa6c6;
/** A guard of the house, in its sea green, with a steel cap. */
const GUARD = { coat: SEA_GREEN, legs: 0x283632, hat: 0xb9c0c8, hatH: 0.26 };

// ---------------------------------------------------------------------------
// The castle's parts, from its lot
// ---------------------------------------------------------------------------

interface Layout {
  /** The keep, in the north-west corner beside the gate. */
  keep: { x0: number; z0: number; x1: number; z1: number };
  /** Where the keep's corner towards the court is cut off: the line x + z = cut. */
  cut: number;
  /** The great hall along the west side: from its back wall to its front on the court. */
  hall: { x0: number; z0: number; x1: number; z1: number };
  /** The gate's wall: from the keep east, and from the lot's north edge in. */
  gate: { x0: number; z0: number; x1: number; z1: number; top: number };
  /** The tower at the south-west corner. */
  sw: { x: number; z: number; r: number };
}

function layout(l: Lot): Layout {
  const jamb = ROAD_X - GATE_HALF;
  const keep = { x0: l.x0, z0: l.z0, x1: jamb - 0.8, z1: l.z0 + 4.1 };
  const sw = { x: l.x0 + 2.1, z: l.z1 - 2.0, r: 1.6 };
  return {
    keep,
    cut: CX + CZ - (COURT + 0.05) * Math.SQRT2,
    hall: { x0: l.x0, z0: keep.z1, x1: CX - COURT - 0.1, z1: sw.z - 1.4 },
    gate: { x0: keep.x1, z0: l.z0, x1: ROAD_X + GATE_HALF + 1.8, z1: l.z0 + 1.2, top: 11.8 },
    sw,
  };
}

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

/** Rows of windows on a wall `h` high, `n` of them, so that the top row is whole. */
const rows = (h: number, n: number, cell: number, lit: number, kind = 4): WinSpec => ({ cell, storey: h / n, lit, kind });

/** A flat ring at `y`, from r0 out to r1, facing up (1) or down (-1), its corners where `cyl`'s are. */
function annulus(b: GeoBuilder, x: number, z: number, r0: number, r1: number, y: number, dir: number, color: number, n: number): void {
  const ph = Math.PI / n;
  for (let i = 0; i < n; i++) {
    const a0 = ph + (i / n) * TAU, a1 = ph + ((i + 1) / n) * TAU;
    b.quad([x + Math.cos(a0) * r0, y, z + Math.sin(a0) * r0], [x + Math.cos(a1) * r0, y, z + Math.sin(a1) * r0], [x + Math.cos(a1) * r1, y, z + Math.sin(a1) * r1], [x + Math.cos(a0) * r1, y, z + Math.sin(a0) * r1], [0, dir, 0], color);
  }
}

/**
 * A roof turned round an upright axis, of metal plates that catch the sun by
 * turns: `rings` are its radius and height where its outline bends, from the
 * eaves up, and `cols` the colours of its plates, the first for the lowest
 * band and the other two by turns above it.
 */
function plated(b: GeoBuilder, x: number, z: number, rings: [number, number][], n: number, cols: [number, number, number]): void {
  const ph = Math.PI / n;
  const at = (rr: number, a: number, yy: number): V3 => [x + Math.cos(a) * rr, yy, z + Math.sin(a) * rr];
  for (let i = 0; i < n; i++) {
    const a0 = ph + (i / n) * TAU, a1 = ph + ((i + 1) / n) * TAU, am = (a0 + a1) / 2;
    for (let j = 0; j + 1 < rings.length; j++) {
      const [ra, ya] = rings[j], [rb, yb] = rings[j + 1];
      const s = (ra - rb) / (yb - ya), nl = Math.hypot(1, s);
      const nrm: V3 = [Math.cos(am) / nl, s / nl, Math.sin(am) / nl];
      const col = j === 0 ? (i % 2 ? cols[1] : cols[0]) : i % 2 ? cols[2] : cols[1];
      if (rb < 1e-3) face3(b, at(ra, a0, ya), at(ra, a1, ya), [x, yb, z], nrm, col);
      else b.quad(at(ra, a0, ya), at(ra, a1, ya), at(rb, a1, yb), at(rb, a0, yb), nrm, col);
    }
  }
}

/**
 * A cone of beaten silver: steep at the top and flaring at its eaves, its
 * plates catching the sun by turns. `under` is the radius of what it stands
 * on, so that the overhang of its eaves has an underside.
 */
function silverCone(b: GeoBuilder, x: number, z: number, r: number, y: number, h: number, n: number, under = 0): void {
  plated(b, x, z, [[r, y], [r * 0.66, y + h * 0.24], [r * 0.32, y + h * 0.62], [0, y + h]], n, [SILVER_LO, SILVER, SILVER_HI]);
  if (under > 0 && under < r) annulus(b, x, z, under, r, y, -1, SILVER_LO, n);
  // a silver ball on the point
  b.cyl(x, z, y + h - 0.05, y + h + 0.22, 0.13, 0.13, 6, SILVER_HI);
}

/** A small flag of the house on a thin staff, flying east: on a cone's point, `staff` high. */
function pennant(b: GeoBuilder, x: number, z: number, y: number, staff = 1.4): void {
  b.cyl(x, z, y, y + staff, 0.05, 0.035, 4, 0xd9dee4, { cap: false });
  const top = y + staff - 0.06, bot = top - 0.5, tip: [number, number] = [x + 1.25, top - 0.17];
  for (const s of [-1, 1]) {
    face3(b, [x + 0.04, top, z + s * 0.02], [x + 0.04, bot, z + s * 0.02], [tip[0], tip[1], z + s * 0.02], [0, 0, s], SEA_GREEN);
    // a silver stripe along it, as the house's colours are
    face3(b, [x + 0.04, top - 0.18, z + s * 0.03], [x + 0.04, top - 0.31, z + s * 0.03], [tip[0] - 0.25, tip[1], z + s * 0.03], [0, 0, s], SEAHORSE);
  }
}

interface Spire {
  x: number; z: number; r: number;
  /** The top of its stone, and how high its cone rises over that. */
  top: number; cone: number;
  y0?: number; sides?: number; win?: WinSpec;
  /** A pennant on its point. */
  flag?: boolean;
}

/** A slender round tower of pale stone: a shaft with its windows, a band of corbels, a top that stands out on them, and a cone of beaten silver. */
function spire(b: GeoBuilder, s: Spire): void {
  const n = s.sides ?? 12, y0 = s.y0 ?? 0, lip = s.top - 1.1, R = s.r + 0.22;
  b.cyl(s.x, s.z, y0, lip - 0.35, s.r, s.r, n, PALE, { win: s.win ?? rows(lip - 0.35, Math.max(1, Math.round((lip - 0.35) / 3.4)), 1.5, 0.45), seed: s.x * 0.13 + s.z * 0.07, cap: false });
  b.cyl(s.x, s.z, lip - 0.35, lip, s.r + 0.1, s.r + 0.1, n, PALE_SHADE, { cap: false });
  annulus(b, s.x, s.z, s.r, s.r + 0.1, lip - 0.35, -1, PALE_SHADE, n);
  b.cyl(s.x, s.z, lip, s.top, R, R, n, PALE, { cap: PALE_SHADE });
  annulus(b, s.x, s.z, s.r + 0.1, R, lip, -1, PALE_SHADE, n);
  silverCone(b, s.x, s.z, R + 0.3, s.top, s.cone, n, R);
  if (s.flag) pennant(b, s.x, s.z, s.top + s.cone + 0.17, 1.3);
}

/** A turret corbelled out from a wall's top: a cone of stone under it, a shaft, and a silver cone. */
function bartizan(b: GeoBuilder, x: number, z: number, from: number, top: number, r = 0.55): void {
  b.cyl(x, z, from - 0.7, from, 0.1, r, 8, PALE_SHADE, { cap: false });
  b.cyl(x, z, from, top - 0.3, r, r, 8, PALE, { win: rows(top - 0.3 - from, 1, 1.4, 0.4), seed: x * 0.31, cap: false });
  b.cyl(x, z, top - 0.3, top, r + 0.08, r + 0.08, 8, PALE_SHADE, { cap: false });
  plated(b, x, z, [[r + 0.24, top], [(r + 0.24) * 0.45, top + 0.9], [0, top + 2.0]], 8, [SILVER_LO, SILVER, SILVER_HI]);
}

/** A rock: a squat block of five faces from y0, bulging at `mid` and closed by a smaller top at `top`. */
function rock(b: GeoBuilder, x: number, z: number, y0: number, mid: number, top: number, r: number, color: number, turn = 0): void {
  b.cyl(x, z, y0, mid, r, r * 0.96, 5, color, { cap: false, phase: turn });
  b.cyl(x, z, mid, top, r * 0.96, r * 0.5, 5, color, { phase: turn });
}

/** Merlons along a wall's top from a to c, standing on `y`, `t` thick, with a gap between each two. */
function merlons(b: GeoBuilder, a: P2, c: P2, y: number, t: number, color = PALE, h = 0.72, every = 1.2): void {
  const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz), n = Math.max(1, Math.round(len / every)), yaw = Math.atan2(dz, dx);
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n;
    b.obox(a[0] + dx * f, y + h / 2, a[1] + dz * f, (len / n) * 0.29, h / 2, t / 2, yaw, color, { top: PALE_SHADE });
  }
}

/**
 * A tall window with a pointed head, on a wall that faces (nx, nz): a frame of
 * paler stone and the glass in it, dark by day and lit at night. (x, z) is the
 * wall's face under its middle.
 */
function lancet(b: GeoBuilder, x: number, z: number, nx: number, nz: number, w: number, y0: number, y1: number, lit = 0.9): void {
  const ax = -nz, az = nx;
  const pane = (out: number, half: number, lo: number, hi: number, color: number, o = {}): void => {
    const p = (s: number, y: number): V3 => [x + nx * out + ax * s, y, z + nz * out + az * s];
    const spring = hi - half * 1.25, n: V3 = [nx, 0, nz];
    b.quad(p(-half, lo), p(half, lo), p(half, spring), p(-half, spring), n, color, o);
    // the pointed head: two arcs that meet, as three triangles
    face3(b, p(-half, spring), p(half, spring), p(0, hi), n, color, o);
    face3(b, p(-half, spring), p(0, hi), p(-half * 0.72, spring + half * 0.7), n, color, o);
    face3(b, p(half, spring), p(half * 0.72, spring + half * 0.7), p(0, hi), n, color, o);
  };
  pane(0.03, w / 2 + 0.13, y0 - 0.13, y1 + 0.16, PALE_SHADE);
  pane(0.06, w / 2, y0, y1, GLASS, { win: interior(lit) });
  // a mullion down its middle, and a transom across it
  const m = (s0: number, s1: number, lo: number, hi: number): void => b.quad([x + nx * 0.08 + ax * s0, lo, z + nz * 0.08 + az * s0], [x + nx * 0.08 + ax * s1, lo, z + nz * 0.08 + az * s1], [x + nx * 0.08 + ax * s1, hi, z + nz * 0.08 + az * s1], [x + nx * 0.08 + ax * s0, hi, z + nz * 0.08 + az * s0], [nx, 0, nz], PALE_SHADE);
  m(-0.035, 0.035, y0, y1 - w * 0.2);
  m(-w / 2, w / 2, (y0 + y1) / 2 - 0.03, (y0 + y1) / 2 + 0.03);
}

/** A Velaryon banner hung down a wall that faces (nx, nz): sea green, with a silver band down its middle and a point at its foot. */
function hanging(b: GeoBuilder, x: number, z: number, nx: number, nz: number, w: number, y0: number, y1: number): void {
  const ax = -nz, az = nx, n: V3 = [nx, 0, nz];
  const p = (s: number, y: number, out: number): V3 => [x + nx * out + ax * s, y, z + nz * out + az * s];
  b.quad(p(-w / 2, y0 + w * 0.4, 0.04), p(w / 2, y0 + w * 0.4, 0.04), p(w / 2, y1, 0.04), p(-w / 2, y1, 0.04), n, SEA_GREEN);
  face3(b, p(-w / 2, y0 + w * 0.4, 0.04), p(w / 2, y0 + w * 0.4, 0.04), p(0, y0, 0.04), n, SEA_GREEN);
  b.quad(p(-w * 0.14, y0 + w * 0.5, 0.055), p(w * 0.14, y0 + w * 0.5, 0.055), p(w * 0.14, y1 - 0.15, 0.055), p(-w * 0.14, y1 - 0.15, 0.055), n, SEAHORSE);
  // the rod it hangs from
  b.beam(p(-w / 2 - 0.12, y1 + 0.03, 0.09), p(w / 2 + 0.12, y1 + 0.03, 0.09), 0.05, 0.05, TIMBER_DARK);
}

// ---------------------------------------------------------------------------
// The keep
// ---------------------------------------------------------------------------

/**
 * The keep, in the north-west corner beside the gate: the castle's tallest
 * block, four storeys of windows, battlements, a turret with a silver cone at
 * each corner, and a steep roof of beaten silver over the middle. Its corner
 * towards the court is cut off where the court begins, and a door is in it.
 */
function keep(k: Build, L: Layout): void {
  const b = k.b, { x0, z0, x1, z1 } = L.keep, cut = L.cut, H = 15.2;
  const plan: XZ[] = [[x0, z0], [x1, z0], [x1, cut - x1], [cut - z1, z1], [x0, z1]];
  // a battered plinth on its two outer faces, the walls with their windows, and the walk on top
  b.box(x0 - 0.22, 0, z0 - 0.22, x1, 0.9, z0 + 0.3, PALE_SHADE, { faces: 'NWT' });
  b.box(x0 - 0.22, 0, z0 - 0.22, x0 + 0.3, 0.9, z1, PALE_SHADE, { faces: 'WST' });
  prism(b, plan, 0, H - 0.55, PALE, { win: rows(H, 4, 1.45, 0.45), seed: 0.37, top: false });
  // a string course round it under the top storey, and a band of corbels under the battlements
  const grown = (d: number): XZ[] => plan.map(([x, z]): XZ => [x + (x < (x0 + x1) / 2 ? -d : d), z + (z < (z0 + z1) / 2 ? -d : d)]);
  prism(b, grown(0.1), H - 3.9, H - 3.65, PALE_SHADE, { top: PALE_SHADE });
  const band = grown(0.14);
  prism(b, band, H - 0.55, H, PALE_SHADE, { top: PALE_SHADE });
  band.forEach((q, i) => {
    const p = plan[i], p2 = plan[(i + 1) % plan.length], q2 = band[(i + 1) % band.length];
    b.quad([p[0], H - 0.55, p[1]], [p2[0], H - 0.55, p2[1]], [q2[0], H - 0.55, q2[1]], [q[0], H - 0.55, q[1]], [0, -1, 0], PALE_SHADE);
  });
  // battlements round the walk
  for (let i = 0; i < plan.length; i++) {
    const a = plan[i], c = plan[(i + 1) % plan.length], dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz);
    if (len < 0.8) continue;
    // inwards from this edge
    const mx = (x0 + x1) / 2 - (a[0] + c[0]) / 2, mz = (z0 + z1) / 2 - (a[1] + c[1]) / 2;
    let nx = -dz / len, nz = dx / len;
    if (nx * mx + nz * mz < 0) { nx = -nx; nz = -nz; }
    merlons(b, [a[0] + nx * 0.15, a[1] + nz * 0.15], [c[0] + nx * 0.15, c[1] + nz * 0.15], H, 0.3, PALE, 0.8, 1.05);
  }
  // the roof of beaten silver over the middle: four steep faces to a point, the two the sun finds brighter
  const rx0 = x0 + 0.45, rx1 = x1 - 0.45, rz0 = z0 + 0.45, rz1 = z1 - 0.45, apex: V3 = [(rx0 + rx1) / 2, 18.85, (rz0 + rz1) / 2];
  const corners: V3[] = [[rx0, H, rz0], [rx1, H, rz0], [rx1, H, rz1], [rx0, H, rz1]];
  const face = (a: V3, c: V3, col: number): void => {
    // the face leans out the way from the point to its edge's middle
    const mx = (a[0] + c[0]) / 2 - apex[0], mz = (a[2] + c[2]) / 2 - apex[2], ml = Math.hypot(mx, mz), rise = apex[1] - H, nl = Math.hypot(ml, rise);
    face3(b, a, c, apex, [((mx / ml) * rise) / nl, ml / nl, ((mz / ml) * rise) / nl], col);
  };
  face(corners[0], corners[1], SILVER);
  face(corners[1], corners[2], SILVER_HI);
  face(corners[2], corners[3], SILVER_HI);
  face(corners[3], corners[0], SILVER);
  b.cyl(apex[0], apex[2], apex[1] - 0.1, apex[1] + 0.85, 0.06, 0.03, 4, SILVER_HI, { cap: false });
  b.cyl(apex[0], apex[2], apex[1] + 0.12, apex[1] + 0.36, 0.14, 0.14, 6, SILVER_HI);
  // turrets at its corners, and one on the cut corner over the door
  const turrets: P2[] = [[x0 + 0.55, z0 + 0.55], [x1 - 0.55, z0 + 0.55], [x0 + 0.55, z1 - 0.55], [(x1 + cut - z1) / 2 - 0.4, (cut - x1 + z1) / 2 - 0.4]];
  turrets.forEach(([x, z]) => bartizan(b, x, z, 12.6, 16.8));
  banner(b, x0 + 0.55, z1 - 0.55, 18.7, 'velaryon', 1.15, 0.5);
  // the door, in the cut corner, facing the court, with a lamp beside it
  const dx = (x1 + cut - z1) / 2, dz = (cut - x1 + z1) / 2, f = Math.SQRT1_2;
  doorway(b, dx, 0.04, dz, f, f, 0.95, 2.0, 0.65, DOOR);
  b.box(dx - 0.6 * f - 0.08 + 0.06, 2.35, dz + 0.6 * f - 0.08 + 0.06, dx - 0.6 * f + 0.08 + 0.06, 2.55, dz + 0.6 * f + 0.08 + 0.06, IRONWORK);
  fire(k, dx - 0.6 * f + 0.14, 2.75, dz + 0.6 * f + 0.14, 0.18, 0);
  // a brazier on the walk, and a guard looking out over the Gullet
  brazier(k, x0 + 1.1, z1 - 1.2, H);
  figure(b, x1 - 1.3, z1 - 1.1, H, GUARD);
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

/**
 * The gate, on the north side where the causeway arrives: a pointed arch
 * through the wall, high over the whole road, its two arcs springing from the
 * jambs and meeting over the road's middle; battlements on the walk above,
 * torches either side, and two of the house's banners.
 */
function gate(k: Build, L: Layout): void {
  const b = k.b, { x0, z0, x1, z1, top } = L.gate;
  const wJ = ROAD_X - GATE_HALF, eJ = ROAD_X + GATE_HALF, spring = 4, rad = 6;
  // the arch, from the west jamb to the east one: two arcs about points on the springing line
  const cw = wJ + rad, ce = eJ - rad, phi = Math.acos((ROAD_X - ce) / rad), N = 6;
  const arch: [number, number][] = [];
  for (let i = 0; i <= N; i++) { const a = Math.PI - phi * (i / N); arch.push([cw + Math.cos(a) * rad, spring + Math.sin(a) * rad]); }
  for (let i = 1; i <= N; i++) { const a = phi * (1 - i / N); arch.push([ce + Math.cos(a) * rad, spring + Math.sin(a) * rad]); }
  for (let i = 0; i + 1 < arch.length; i++) {
    const [px, py] = arch[i], [qx, qy] = arch[i + 1], len = Math.hypot(qx - px, qy - py);
    b.quad([px, py, z0], [qx, qy, z0], [qx, top, z0], [px, top, z0], [0, 0, -1], PALE);
    b.quad([px, py, z1], [qx, qy, z1], [qx, top, z1], [px, top, z1], [0, 0, 1], PALE);
    b.quad([px, py, z0], [qx, qy, z0], [qx, qy, z1], [px, py, z1], [(qy - py) / len, -(qx - px) / len, 0], PALE_SHADE);
  }
  // the jambs, the piers either side, and the walk over all of it
  b.quad([wJ, 0, z0], [wJ, 0, z1], [wJ, spring, z1], [wJ, spring, z0], [1, 0, 0], PALE_SHADE);
  b.quad([eJ, 0, z0], [eJ, 0, z1], [eJ, spring, z1], [eJ, spring, z0], [-1, 0, 0], PALE_SHADE);
  b.box(x0, 0, z0, wJ, top, z1, PALE, { faces: 'NS' });
  b.box(eJ, 0, z0, x1, top, z1, PALE, { faces: 'NSE', win: { cell: 1.8, storey: top / 2, lit: 0.35, kind: 4 }, seed: 0.71 });
  b.box(x0, top - 0.01, z0, x1, top, z1, PALE_SHADE, { faces: 'T' });
  merlons(b, [x0, z0 + 0.15], [x1, z0 + 0.15], top, 0.3);
  merlons(b, [x0, z1 - 0.15], [x1, z1 - 0.15], top, 0.3);
  // a hood of darker stone round the arch on both faces, and the house's arms over it on the outer
  for (let i = 0; i + 1 < arch.length; i++) {
    const [px, py] = arch[i], [qx, qy] = arch[i + 1];
    for (const [z, s] of [[z0, -1], [z1, 1]] as const) b.quad([px, py + 0.02, z + s * 0.03], [qx, qy + 0.02, z + s * 0.03], [qx, qy + 0.36, z + s * 0.03], [px, py + 0.36, z + s * 0.03], [0, 0, s], PALE_SHADE);
  }
  shield(b, ROAD_X, top - 0.8, z0 - 0.05, -1);
  // torches either side, outside and in
  for (const x of [wJ - 0.5, eJ + 0.5]) {
    for (const [z, s] of [[z0, -1], [z1, 1]]) {
      b.box(x - 0.09, 3.7, z + s * 0.02 - 0.09, x + 0.09, 4.0, z + s * 0.2 + 0.09, IRONWORK);
      fire(k, x, 4.3, z + s * 0.22, 0.2, 0);
    }
  }
  k.lights.push({ x: ROAD_X, z: z0 - 1.5, r: 9, color: '#ffcf8a', k: 0.55 });
  // the castle's name on the walk over the arch, facing the court, low between the battlements, and the
  // house's banners either side of it; guards, two at the gate and one on the walk
  nameBoard(k, 'high-tide-name', ROAD_X, z0 + 0.5, top - 1.35, [0, 0, 1], 0.95);
  for (const s of [-1, 1]) banner(b, ROAD_X + s * 2.95, (z0 + z1) / 2 + 0.1, top, 'velaryon', 4.4, 0.75);
  figure(b, wJ - 1.2, z0 - 0.9, 0.01, GUARD);
  figure(b, eJ + 1.2, z0 - 0.9, 0.01, GUARD);
  figure(b, ROAD_X + 3.9, (z0 + z1) / 2, top, GUARD);
}

/** The house's arms carved and painted on a shield over the gate, facing north (-1) or south (1): a silver seahorse on sea green. */
function shield(b: GeoBuilder, x: number, y: number, z: number, s: number): void {
  const n: V3 = [0, 0, s], w = 0.7, h = 1.0;
  const p = (u: number, v: number, out: number): V3 => [x + u, y + v, z + s * out];
  b.quad(p(-w, 0, 0.02), p(w, 0, 0.02), p(w, h * 0.55, 0.02), p(-w, h * 0.55, 0.02), n, SEA_GREEN);
  face3(b, p(-w, 0, 0.02), p(w, 0, 0.02), p(0, -h * 0.65, 0.02), n, SEA_GREEN);
  seahorseFlat(b, (u, v) => [x + u * 0.52, y - 0.2 + v * 0.52, z + s * 0.045], n);
}

/**
 * A seahorse in profile, flat on a surface that faces the way `n` points:
 * for a shield, or a pavement. `p` places a point of its outline, given along
 * it (u, its snout towards +u) and up it (v), each about a unit at most.
 */
function seahorseFlat(b: GeoBuilder, p: (u: number, v: number) => V3, n: V3): void {
  const q = (a: [number, number], c: [number, number], d: [number, number], e: [number, number]): void => b.quad(p(...a), p(...c), p(...d), p(...e), n, SEAHORSE);
  // the head and snout, the neck, the belly, the tail curling under
  q([-0.1, 0.62], [0.2, 0.62], [0.2, 0.78], [-0.1, 0.8]);
  q([0.2, 0.66], [0.48, 0.64], [0.48, 0.71], [0.2, 0.74]);
  q([-0.12, 0.3], [0.12, 0.34], [0.14, 0.64], [-0.1, 0.64]);
  q([-0.08, -0.05], [0.18, 0.02], [0.14, 0.34], [-0.12, 0.3]);
  q([-0.2, -0.3], [0.02, -0.28], [0.18, 0.02], [-0.08, -0.05]);
  q([-0.34, -0.2], [-0.2, -0.3], [-0.12, -0.16], [-0.26, -0.1]);
  // its fin
  face3(b, p(-0.12, 0.36), p(-0.12, 0.56), p(-0.3, 0.46), n, SEAHORSE);
}

// ---------------------------------------------------------------------------
// The great hall, and the Driftwood Throne
// ---------------------------------------------------------------------------

/**
 * The great hall along the west side of the court: tall pointed windows and
 * its door on the court, a gable over the door, a steep roof of silver, and
 * on its back, over the sea, buttresses and battlements. The door stands open
 * and inside, dark and warm, the Driftwood Throne is glimpsed on its dais.
 */
function greatHall(k: Build, L: Layout): void {
  const b = k.b, { x0, z0, x1, z1 } = L.hall, H = 10.4, rise = 1.8, xm = (x0 + x1) / 2, ridge = H + rise;
  const wall = 0.35, dz0 = (z0 + z1) / 2 - 0.9, dz1 = (z0 + z1) / 2 + 0.9, dh = 3.0, zc = (dz0 + dz1) / 2;
  // the front on the court: either side of the door, and over it
  b.quad([x1, 0, z0], [x1, 0, dz0], [x1, H, dz0], [x1, H, z0], [1, 0, 0], PALE);
  b.quad([x1, 0, dz1], [x1, 0, z1], [x1, H, z1], [x1, H, dz1], [1, 0, 0], PALE);
  b.quad([x1, dh, dz0], [x1, dh, dz1], [x1, H, dz1], [x1, H, dz0], [1, 0, 0], PALE);
  // the door's reveal and its lintel
  b.quad([x1 - wall, 0, dz0], [x1, 0, dz0], [x1, dh, dz0], [x1 - wall, dh, dz0], [0, 0, 1], PALE_SHADE);
  b.quad([x1, 0, dz1], [x1 - wall, 0, dz1], [x1 - wall, dh, dz1], [x1, dh, dz1], [0, 0, -1], PALE_SHADE);
  b.quad([x1 - wall, dh, dz0], [x1, dh, dz0], [x1, dh, dz1], [x1 - wall, dh, dz1], [0, -1, 0], PALE_SHADE);
  // a pointed hood over the door, and a tympanum of the house's green under it
  const hp = (s: number, y: number, out: number): V3 => [x1 + out, y, zc + s];
  face3(b, hp(-0.9, dh, 0.03), hp(0.9, dh, 0.03), hp(0, dh + 1.05, 0.03), [1, 0, 0], SEA_DARK);
  b.beam(hp(-1.05, dh - 0.02, 0.1), hp(0, dh + 1.25, 0.1), 0.1, 0.1, PALE_SHADE);
  b.beam(hp(1.05, dh - 0.02, 0.1), hp(0, dh + 1.25, 0.1), 0.1, 0.1, PALE_SHADE);
  for (const s of [-1, 1]) b.box(x1, 0, zc + s * 0.98 - 0.08, x1 + 0.1, dh, zc + s * 0.98 + 0.08, PALE_SHADE, { faces: 'NESWT' });
  // a string course and a cornice along the front
  b.box(x1, 3.95, z0, x1 + 0.08, 4.1, dz0 - 0.1, PALE_SHADE, { faces: 'ETB' });
  b.box(x1, 3.95, dz1 + 0.1, x1 + 0.08, 4.1, z1, PALE_SHADE, { faces: 'ETB' });
  b.box(x1, H - 0.22, z0, x1 + 0.1, H, z1, PALE_SHADE, { faces: 'ETB' });
  // the tall windows, two each side of the door and one over it, and the house's banners between them and the door
  for (const s of [-1, 1]) {
    for (const d of [2.15, 3.75]) lancet(b, x1, zc + s * d, 1, 0, 0.72, 4.5, 9.5, 2.2);
    hanging(b, x1, zc + s * 1.36, 1, 0, 0.42, 4.4, 8.8);
  }
  lancet(b, x1, zc, 1, 0, 0.8, 4.7, 9.6, 2.4);
  // the gable over the door, with a round window in it, and its roof meeting the hall's
  const gz0 = zc - 1.15, gz1 = zc + 1.15, gy = H + 1.75, back = x1 - ((gy - H) * (x1 - xm)) / rise;
  face3(b, [x1, H, gz0], [x1, H, gz1], [x1, gy, zc], [1, 0, 0], PALE);
  roundel(b, [x1 + 0.04, H + 0.62, zc], 0.38, 'E', GLASS, { win: interior(1.0) }, 10);
  const slopeN = (a: V3, c: V3, d: V3): void => {
    const ux = c[0] - a[0], uy = c[1] - a[1], uz = c[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const nl = Math.hypot(nx, ny, nz);
    if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
    face3(b, a, c, d, [nx / nl, ny / nl, nz / nl], SILVER_HI);
  };
  slopeN([x1, H, gz0], [x1, gy, zc], [back, gy, zc]);
  slopeN([x1, H, gz1], [x1, gy, zc], [back, gy, zc]);
  // the roof: two steep slopes of silver; on the back the curtain's parapet rises in front of it
  const run = x1 - xm, len = Math.hypot(run, rise);
  b.quad([x1, H, z0], [x1, H, z1], [xm, ridge, z1], [xm, ridge, z0], [rise / len, run / len, 0], SILVER);
  const pw = x0 + 0.25, py = ridge - ((xm - pw) * rise) / run;
  b.quad([pw, py, z1], [pw, py, z0], [xm, ridge, z0], [xm, ridge, z1], [-rise / len, run / len, 0], SILVER_LO);
  // the gable at the south end, and the end wall under it
  b.quad([x0, 0, z1], [x1, 0, z1], [x1, H, z1], [x0, H, z1], [0, 0, 1], PALE, { win: rows(H, 2, 1.6, 0.4) });
  face3(b, [x0, H, z1], [x1, H, z1], [xm, ridge, z1], [0, 0, 1], PALE);
  // the back, over the sea: two rows of tall lights, a parapet with battlements, and buttresses
  b.box(x0, 0, z0, x0 + 0.01, H, z1, PALE, { faces: 'W', win: { ...LANCETS, storey: H / 2, lit: 0.5 }, seed: 0.83 });
  b.box(x0, H, z0, pw, H + 0.6, z1, PALE, { faces: 'WEST', top: PALE_SHADE });
  merlons(b, [x0 + 0.125, z0], [x0 + 0.125, z1], H + 0.6, 0.25, PALE, 0.62, 1.15);
  for (let z = z0 + 1.5; z < z1 - 0.6; z += 1.5) buttress(b, x0, z);
  // a chimney stack on the ridge, from the hall's hearth, and its smoke
  b.box(xm - 0.32, ridge - 0.6, z1 - 2.2, xm + 0.32, ridge + 1.3, z1 - 1.5, PALE_SHADE, { top: DARK });
  b.box(xm - 0.4, ridge + 1.1, z1 - 2.28, xm + 0.4, ridge + 1.3, z1 - 1.42, PALE_SHADE, { faces: 'NESWB' });
  const smoke = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 30);
  k.group.add(smoke.mesh);
  const from = new THREE.Vector3(xm, ridge + 1.45, z1 - 1.85), drift = new THREE.Vector3(0.5, 0.3, 0.25);
  let due = 0;
  k.each((dt) => {
    due -= dt;
    if (due <= 0) { due = 0.55; smoke.puff(from, drift, 0.42, 0.86); }
    smoke.update(dt);
  });

  // --- inside: the warm dark seen through the door, and the throne on its dais ---
  const ix0 = x0 + 0.2, ix1 = x1 - wall, iz0 = dz0 - 2.4, iz1 = dz1 + 0.7, ih = 4.6, glow = interior(1.4);
  b.quad([ix0, 0.06, iz1], [ix0, 0.06, iz0], [ix0, ih, iz0], [ix0, ih, iz1], [1, 0, 0], HALL_IN, { win: glow });
  b.quad([ix0, 0.06, iz0], [ix1, 0.06, iz0], [ix1, ih, iz0], [ix0, ih, iz0], [0, 0, 1], HALL_IN, { win: glow });
  b.quad([ix1, 0.06, iz1], [ix0, 0.06, iz1], [ix0, ih, iz1], [ix1, ih, iz1], [0, 0, -1], HALL_IN, { win: glow });
  b.quad([ix0, ih, iz0], [ix1, ih, iz0], [ix1, ih, iz1], [ix0, ih, iz1], [0, -1, 0], 0x23170f);
  b.quad([ix0, 0.07, iz1], [ix1, 0.07, iz1], [ix1, 0.07, iz0], [ix0, 0.07, iz0], [0, 1, 0], HALL_FLOOR);
  // the carpet from the door to the dais
  b.quad([ix0 + 0.6, 0.085, dz1 - 0.15], [ix1, 0.085, dz1 - 0.15], [ix1, 0.085, iz0 + 1.0], [ix0 + 0.6, 0.085, iz0 + 1.0], [0, 1, 0], CARPET);
  // the dais against the back wall, north of the door, and the throne on it facing the door
  const tz = dz0 - 0.65;
  b.box(ix0, 0.07, tz - 0.95, ix0 + 1.0, 0.36, tz + 0.95, 0xcfc6b3, { faces: 'NESWT' });
  b.quad([ix0 + 0.01, 1.2, tz - 0.6], [ix0 + 0.01, 1.2, tz + 0.6], [ix0 + 0.01, 3.9, tz + 0.6], [ix0 + 0.01, 3.9, tz - 0.6], [1, 0, 0], SEA_GREEN);
  driftwoodThrone(b, ix0 + 0.42, 0.36, tz);
  fire(k, ix1 - 0.15, 2.3, iz0 + 0.2, 0.16, 0);
  // the door's two leaves, swung back inside: the north one flat against the wall, out of the view's way, the south one half open
  b.box(ix1 - 0.09, 0.06, dz0 - 0.88, ix1 - 0.01, dh - 0.05, dz0 - 0.02, DOOR, { faces: 'NESWT' });
  b.box(ix1 - 0.8, 0.06, dz1 - 0.1, ix1 - 0.02, dh - 0.05, dz1 - 0.02, DOOR, { faces: 'NESWT' });
  // the warm light that spills from the door onto the court, torches either side, and the guards, out of the door's way
  k.lights.push({ x: x1 + 1.6, z: zc, r: 6.5, color: '#ffc27a', k: 0.55 });
  for (const s of [-1, 1]) {
    b.box(x1, 2.9, zc + s * 1.25 - 0.08, x1 + 0.2, 3.1, zc + s * 1.25 + 0.08, IRONWORK);
    fire(k, x1 + 0.22, 3.4, zc + s * 1.25, 0.18, 0);
  }
  figure(b, x1 + 0.4, zc - 1.75, 0.04, GUARD);
  figure(b, x1 + 0.4, zc + 2.95, 0.04, GUARD);
}

/** A buttress on the hall's back, standing out over the islet's edge: two stages, each with a sloping top. */
function buttress(b: GeoBuilder, x: number, z: number): void {
  // each stage with a sloping top that throws the rain off, and its two sides closed under the slope
  const stage = (out: number, half: number, y0: number, y1: number, rise: number): void => {
    b.box(x - out, y0, z - half, x, y1, z + half, PALE, { faces: 'NSW' });
    const len = Math.hypot(out, rise);
    b.quad([x - out, y1, z + half], [x - out, y1, z - half], [x, y1 + rise, z - half], [x, y1 + rise, z + half], [-rise / len, out / len, 0], PALE_SHADE);
    for (const s of [-1, 1]) face3(b, [x - out, y1, z + s * half], [x, y1, z + s * half], [x, y1 + rise, z + s * half], [0, 0, s], PALE);
  };
  stage(0.75, 0.24, 0, 4.6, 0.7);
  stage(0.42, 0.2, 4.6 + 0.7 * (0.33 / 0.75), 8.2, 0.8);
}

/**
 * The Driftwood Throne: a great seat of driftwood, pale and twisted, the
 * Velaryons' ancient high seat. It stands at (x, z) on `y`, facing east. The
 * books say only that it is of driftwood: its shape is this tile's.
 */
function driftwoodThrone(b: GeoBuilder, x: number, y: number, z: number): void {
  // the seat: a great block of grey driftwood, with a cushion of the house's green on it
  b.box(x - 0.36, y, z - 0.55, x + 0.4, y + 0.48, z + 0.55, DRIFT[1], { faces: 'NESWT' });
  b.box(x - 0.3, y + 0.48, z - 0.45, x + 0.36, y + 0.6, z + 0.45, SEA_GREEN, { faces: 'NESWT' });
  // its back: limbs that rise from behind the seat, twisting and splaying, the middle ones tallest
  const limbs: [number, number, number, number][] = [[-0.5, -0.95, 2.1, 0.12], [-0.22, -0.4, 2.7, -0.08], [0.06, 0.12, 3.0, 0.1], [0.3, 0.55, 2.6, -0.1], [0.52, 1.0, 2.0, 0.08]];
  limbs.forEach(([za, zb, h, lean], i) => {
    b.sweep([[x - 0.3, y + 0.2, z + za], [x - 0.36 + lean, y + h * 0.45, z + za * 0.7 + zb * 0.3 - lean], [x - 0.3 - lean, y + h * 0.78, z + zb * 0.85 + lean], [x - 0.22, y + h, z + zb]], [0.14, 0.12, 0.09, 0.05], DRIFT[i % 2 === 0 ? 0 : 2]);
  });
  // a twisted bough across the top of the back
  b.sweep([[x - 0.3, y + 2.0, z - 0.9], [x - 0.42, y + 2.45, z - 0.3], [x - 0.36, y + 2.35, z + 0.35], [x - 0.3, y + 1.95, z + 0.95]], [0.07, 0.09, 0.09, 0.07], DRIFT[0]);
  // the arms: curved limbs from the back to the front, ending low
  for (const s of [-1, 1]) b.sweep([[x - 0.32, y + 1.05, z + s * 0.56], [x + 0.02, y + 0.95, z + s * 0.66], [x + 0.35, y + 0.72, z + s * 0.6], [x + 0.42, y + 0.05, z + s * 0.64]], [0.09, 0.1, 0.09, 0.08], DRIFT[1]);
}

// ---------------------------------------------------------------------------
// The south-west tower and the sea wall
// ---------------------------------------------------------------------------

/** The tower at the south-west corner, and the curtain that closes the corner behind it. */
function southWest(k: Build, l: Lot, L: Layout): void {
  const b = k.b, { x, z, r } = L.sw;
  spire(b, { x, z, r, top: 12, cone: 4, flag: true, y0: -1.0 });
  // the curtain from the hall's back round to the tower, with battlements on its outer edge
  const fx1 = x - r * 0.7, fz0 = L.hall.z1, fz1 = z - 0.2;
  b.box(l.x0, 0, fz0, fx1, 10.4, fz1, PALE, { faces: 'WSET', top: PALE_SHADE });
  merlons(b, [l.x0 + 0.15, fz0], [l.x0 + 0.15, fz1], 10.4, 0.3);
  figure(b, l.x0 + 0.8, (fz0 + fz1) / 2, 10.4, GUARD);
}

/**
 * The sea wall along the south side, low, so that the view the tile opens
 * with looks over it into the court: battlements on it, and a postern in it
 * with steps down to the water and a post to tie a boat to.
 */
function seaWall(k: Build, l: Lot, xa: number, xb: number, h: number): void {
  const b = k.b, z0 = l.z1 - 0.5, z1 = l.z1;
  b.box(xa, -1.0, z0, xb, h, z1, PALE, { faces: 'NSET', top: PALE_SHADE, win: { cell: 2.6, storey: h, lit: 0.28, kind: 4 }, seed: 0.29 });
  merlons(b, [xa, (z0 + z1) / 2], [xb, (z0 + z1) / 2], h, 0.5, PALE, 0.7, 1.1);
  // the postern: an arched door of timber in the wall, and steps outside down to the sea
  const px = ROAD_X - 2.4;
  doorway(b, px, 0.01, z1, 0, 1, 1.1, 1.9, 0, DOOR);
  for (let i = 0; i < 3; i++) b.box(px - 0.75, -0.9, z1 + i * 0.42, px + 0.75, 0.07 - i * 0.3, z1 + (i + 1) * 0.42, PALE_SHADE, { faces: 'NESWT' });
  b.cyl(px + 1.15, z1 + 0.6, -0.9, 0.55, 0.11, 0.11, 6, TIMBER_DARK);
}

/**
 * The stair turret where the hall meets the keep, crowned with a dome of
 * brass from the east: a round shaft rising past the hall's roof, a gallery
 * ring, and an onion dome with a finial.
 */
function brassTurret(b: GeoBuilder, L: Layout): void {
  const r = 0.72, x = L.hall.x1 + 0.36, z = L.keep.z1 + 0.36, top = 13.0;
  b.cyl(x, z, 0, top - 0.3, r, r, 10, PALE, { win: rows(top - 0.3, 3, 1.3, 0.45), seed: 0.61, cap: false });
  b.cyl(x, z, top - 0.3, top, r + 0.16, r + 0.16, 10, PALE_SHADE, { cap: PALE_SHADE });
  annulus(b, x, z, r, r + 0.16, top - 0.3, -1, PALE_SHADE, 10);
  const R = r + 0.08;
  plated(b, x, z, [[R, top], [R * 1.22, top + 0.6], [R * 1.12, top + 1.15], [R * 0.6, top + 1.75], [R * 0.2, top + 2.2], [0, top + 2.6]], 10, [BRASS, BRASS_HI, BRASS]);
  b.cyl(x, z, top + 2.5, top + 3.1, 0.05, 0.03, 4, BRASS_HI, { cap: false });
  b.cyl(x, z, top + 2.75, top + 2.95, 0.12, 0.12, 6, BRASS_HI);
}

/**
 * A loggia on the sea wall, where the house watches its fleet in the Gullet:
 * a platform behind the wall as high as its walk, and on it, on slender
 * posts, an awning of striped silk from the east, its edge cut in scallops.
 */
function seaLoggia(k: Build, l: Lot, x0: number, x1: number, zp: number, h: number): void {
  const b = k.b, z1 = l.z1, SILK = [0xe2a13a, 0xb7322f], POST = 0xd8c9a2;
  b.box(x0, 0, zp, x1, h, z1 - 0.5, PALE, { faces: 'NEWT', top: PALE_SHADE });
  b.quad([x0 + 0.3, h + 0.02, z1 - 0.15], [x1 - 0.3, h + 0.02, z1 - 0.15], [x1 - 0.3, h + 0.02, zp + 0.2], [x0 + 0.3, h + 0.02, zp + 0.2], [0, 1, 0], 0x5b2f6e);
  const py = h + 2.1, ridge = h + 2.75, zm = (zp + z1) / 2;
  for (const [x, z] of [[x0 + 0.12, zp + 0.12], [x1 - 0.12, zp + 0.12], [x0 + 0.12, z1 - 0.12], [x1 - 0.12, z1 - 0.12]]) b.box(x - 0.06, h, z - 0.06, x + 0.06, py, z + 0.06, POST, { faces: 'NESW' });
  // the awning's two slopes, in stripes, its underside, and its scalloped edges hanging from the eaves
  const n = Math.max(4, Math.round((x1 - x0 + 0.3) / 0.36)), w = (x1 - x0 + 0.3) / n, ex0 = x0 - 0.15;
  for (let i = 0; i < n; i++) {
    const a = ex0 + i * w, c = a + w, col = SILK[i % 2];
    for (const [ze, s] of [[zp - 0.2, -1], [z1 + 0.2, 1]] as const) {
      const run = Math.abs(ze - zm), len = Math.hypot(run, ridge - py), nrm: V3 = [0, run / len, (s * (ridge - py)) / len];
      b.quad([a, py, ze], [c, py, ze], [c, ridge, zm], [a, ridge, zm], nrm, col);
      b.quad([a, py - 0.01, ze], [c, py - 0.01, ze], [c, ridge - 0.01, zm], [a, ridge - 0.01, zm], [0, -run / len, (-s * (ridge - py)) / len], 0xc9a77c);
      for (const t of [-1, 1]) face3(b, [a, py, ze], [c, py, ze], [(a + c) / 2, py - 0.22, ze + s * 0.01], [0, 0, s * t], col);
    }
  }
  // its two ends, closed with the silk under the ridge
  for (const x of [ex0, ex0 + n * w]) for (const t of [-1, 1]) face3(b, [x, py, zp - 0.2], [x, py, z1 + 0.2], [x, ridge, zm], [t, 0, 0], SILK[0]);
  // the house at its ease under it, and a lamp
  k.person((x0 + x1) / 2 - 0.5, zm, h + 0.02);
  k.person((x0 + x1) / 2 + 0.6, zm - 0.1, h + 0.02);
  k.glows.push({ x: (x0 + x1) / 2, y: py - 0.25, z: zm, sx: 0.22, sy: 0.3, sz: 0.22, color: '#ffd28f' });
  k.lights.push({ x: (x0 + x1) / 2, z: zm, r: 6, color: '#ffc98a', k: 0.45 });
}

// ---------------------------------------------------------------------------
// The dragon terrace
// ---------------------------------------------------------------------------

/** The part of an outline east of x = x0, as an outline. */
function eastOf(shape: P2[], x0: number): P2[] {
  const out: P2[] = [];
  shape.forEach((p, i) => {
    const q = shape[(i + 1) % shape.length];
    if (p[0] >= x0) out.push(p);
    if (p[0] >= x0 !== q[0] >= x0) out.push([x0, p[1] + ((q[1] - p[1]) * (x0 - p[0])) / (q[0] - p[0])]);
  });
  return out;
}

/** Where the dragon terrace begins, west to east: where the court's open circle ends. */
const TERRACE_X = CX + COURT + 0.25;

/** How high the dragon terrace's paving lies: Meleys's home's height where the plan puts her on the islet, and a hair over the ground until it does. */
function terraceY(): number {
  const h = HOMES.meleys;
  return h && inside(ISLANDS['high-tide'], h.x, h.z) ? Math.max(0.06, h.y) : 0.06;
}

/**
 * The dragon terrace on the islet's east side, where Meleys rests facing out
 * over the Gullet towards the fleet: one level of paving over the islet's
 * east part, open to the sky, with nothing on it but a low parapet along its
 * edge over the sea, with lanterns set low in it. The court opens onto it;
 * if it stands above the court, a wall holds it up and steps climb to it.
 */
function dragonTerrace(k: Build): void {
  const b = k.b, y = terraceY(), shape = eastOf(ISLANDS['high-tide'], TERRACE_X), n = shape.length;
  const FLAG = 0xbdb5a5, BORDER = PALE_SHADE, raised = y > 0.3;
  if (raised) {
    flat(b, shape, y, FLAG);
    walls(b, shape, -1.0, y, PALE);
  } else {
    area(k, shape, FLAG, y);
  }
  // a border of paler flags along its inner edge, where the court ends
  const inner = shape.filter((p) => Math.abs(p[0] - TERRACE_X) < 1e-6).map((p) => p[1]);
  const za = Math.min(...inner), zb = Math.max(...inner);
  b.quad([TERRACE_X, y + 0.012, zb], [TERRACE_X + 0.45, y + 0.012, zb], [TERRACE_X + 0.45, y + 0.012, za], [TERRACE_X, y + 0.012, za], [0, 1, 0], BORDER);
  // the house's arms laid in the paving in its middle, seen when the dragon is away: a silver seahorse on a roundel of sea green
  const ax = (TERRACE_X + Math.max(...shape.map((p) => p[0]))) / 2 - 0.2, az = (za + zb) / 2, ar = Math.min(2.0, (Math.max(...shape.map((p) => p[0])) - TERRACE_X) / 2 - 0.5);
  for (let i = 0; i < 14; i++) {
    const a0 = (i / 14) * TAU, a1 = ((i + 1) / 14) * TAU;
    b.up([ax, y + 0.018, az], [ax + Math.cos(a0) * ar, y + 0.018, az + Math.sin(a0) * ar], [ax + Math.cos(a1) * ar, y + 0.018, az + Math.sin(a1) * ar], SEA_GREEN);
  }
  seahorseFlat(b, (u, v) => [ax + u * ar * 1.3, y + 0.028, az - (v - 0.25) * ar * 1.3], [0, 1, 0]);
  // the parapet along its edge over the sea, with a lantern set in it every few units
  let turn = 0;
  for (let i = 0; i < n; i++) turn += shape[i][0] * shape[(i + 1) % n][1] - shape[(i + 1) % n][0] * shape[i][1];
  const inward = turn > 0 ? -1 : 1, PH = 0.65, PT = 0.26;
  for (let i = 0; i < n; i++) {
    const p = shape[i], q = shape[(i + 1) % n], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (len < 0.3 || (Math.abs(p[0] - TERRACE_X) < 1e-6 && Math.abs(q[0] - TERRACE_X) < 1e-6)) continue;
    const nx = ((q[1] - p[1]) / len) * inward, nz = (-(q[0] - p[0]) / len) * inward;
    const cx = (p[0] + q[0]) / 2 + nx * (PT / 2 + 0.1), cz = (p[1] + q[1]) / 2 + nz * (PT / 2 + 0.1);
    b.obox(cx, y + PH / 2, cz, len / 2 + PT / 2, PH / 2, PT / 2, Math.atan2(q[1] - p[1], q[0] - p[0]), PALE, { top: PALE_SHADE });
    for (let t = 1.2; t < len - 0.6; t += 3.2) {
      const lx = p[0] + ((q[0] - p[0]) * t) / len + nx * (PT / 2 + 0.1), lz = p[1] + ((q[1] - p[1]) * t) / len + nz * (PT / 2 + 0.1);
      k.glows.push({ x: lx, y: y + PH + 0.08, z: lz, sx: 0.22, sy: 0.14, sz: 0.22, color: '#ffd59a' });
    }
  }
  // if it stands above the court, a flight of steps up along its face, rising northwards where the court's open circle leaves room
  if (raised) {
    const steps = Math.ceil(y / 0.3), d = 0.36, south = CZ - Math.sqrt(Math.max(0, COURT * COURT - (TERRACE_X - 0.8 - CX) ** 2)) - 0.1;
    for (let i = 0; i < steps; i++) b.box(TERRACE_X - 0.75, 0, south - (i + 1) * d, TERRACE_X + 0.01, (y * (i + 1)) / steps, south - i * d, PALE_SHADE, { faces: 'NSWT' });
  }
  k.lights.push({ x: (TERRACE_X + 46) / 2, z: CZ - 4, r: 9, color: '#ffd2a0', k: 0.4 });
  k.lights.push({ x: (TERRACE_X + 46) / 2, z: CZ + 4, r: 9, color: '#ffd2a0', k: 0.4 });
}

// ---------------------------------------------------------------------------
// The court
// ---------------------------------------------------------------------------

/**
 * The court's paving, round the ring that the road turns in and either side
 * of the road where it comes in through the gate, as far east as `xe`, and
 * the ring's middle under the fountain. It overlaps the edges of the road's
 * own surface, which lies lower and is laid in chords two units long, so that
 * no ground shows between them.
 */
function courtPaving(k: Build, l: Lot, xe: number): void {
  const half = (LANE + 1.2) / 2, r = RING.r + half - 0.25, rx = LANE - 0.05, z0 = l.z0 + 0.05, z1 = l.z1 - 0.05, x0 = l.x0 + 0.05;
  area(k, Array.from({ length: 20 }, (_, i): P2 => [CX + Math.cos((i / 20) * TAU) * (RING.r - half + 0.2), CZ + Math.sin((i / 20) * TAU) * (RING.r - half + 0.2)]), COURT_PAVE, 0.045);
  const zc = CZ - Math.sqrt(r * r - rx * rx);
  const shape: P2[] = [[ROAD_X - rx, z0], [x0, z0], [x0, z1], [xe, z1], [xe, z0], [ROAD_X + rx, z0], [ROAD_X + rx, zc]];
  const a0 = Math.atan2(zc - CZ, rx), a1 = Math.atan2(zc - CZ, -rx) + TAU, n = 40;
  for (let i = 1; i < n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    shape.push([CX + Math.cos(a) * r, CZ + Math.sin(a) * r]);
  }
  shape.push([ROAD_X - rx, zc]);
  area(k, shape, COURT_PAVE, 0.045);
}

/**
 * The fountain in the middle of the ring, in a little garden: a round basin
 * of pale stone, water in it, and on a column in the middle a seahorse of
 * silver, the house's own beast, turned to the view the tile opens with; and
 * round the basin, flowers and orange trees in pots, brought from the east.
 */
function fountain(k: Build): void {
  const b = k.b, x = CX, z = CZ, island = RING.r - (LANE + 1.2) / 2, R = Math.min(1.0, island - 0.6);
  b.cyl(x, z, 0.04, 0.55, R, R, 14, PALE, { cap: false });
  annulus(b, x, z, R - 0.15, R, 0.55, 1, PALE_SHADE, 14);
  b.cyl(x, z, 0.4, 0.55, R - 0.15, R - 0.15, 14, PALE_SHADE, { cap: WATER });
  b.cyl(x, z, 0.4, 1.25, 0.13, 0.1, 8, PALE);
  lathe(b, x, z, [[0.08, 1.2], [0.36, 1.36], [0.42, 1.44]], 10, PALE_SHADE);
  b.cyl(x, z, 1.36, 1.42, 0.34, 0.34, 10, PALE_SHADE, { cap: WATER });
  seahorse(b, x, 1.42, z, 1.1);
  // orange trees in pots at the four corners round it, and flowers between them
  const rand = rng(4417);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2, px = x + Math.cos(a) * (island - 0.32), pz = z + Math.sin(a) * (island - 0.32);
    b.cyl(px, pz, 0.045, 0.4, 0.17, 0.22, 7, 0xb5643c, { cap: 0x4b3423 });
    k.tree(px, pz, 0.15, false, 0.38);
    // its oranges, on the side of the crown the view sees
    for (let j = 0; j < 2; j++) {
      const t = Math.atan2(0.743, 0.669) + (j - 0.5) * 1.1, fy = 0.95 + rand() * 0.3, fx = px + Math.cos(t) * 0.4, fz = pz + Math.sin(t) * 0.4;
      b.box(fx - 0.06, fy, fz - 0.06, fx + 0.06, fy + 0.12, fz + 0.06, 0xf08a24, { faces: 'NESWT' });
    }
    // a low bed of flowers between each two pots
    const f = a + Math.PI / 4, fx = x + Math.cos(f) * (R + 0.2), fz = z + Math.sin(f) * (R + 0.2);
    b.box(fx - 0.2, 0.045, fz - 0.2, fx + 0.2, 0.2, fz + 0.2, 0x4f7f3a, { faces: 'NESWT' });
    for (let j = 0; j < 3; j++) {
      const u = fx - 0.12 + j * 0.12, v = fz - 0.06 + (j % 2) * 0.12;
      b.up([u - 0.06, 0.21, v], [u + 0.06, 0.21, v - 0.04], [u, 0.21, v + 0.07], [0xd9483b, 0xf2d04a, 0xf4f0e8][j]);
    }
  }
  k.lights.push({ x, z, r: 11, color: '#ffcf8a', k: 0.5 });
}

/**
 * A seahorse standing on its curled tail, in the round: `size` high, its
 * profile in the plane that faces the view the tile opens with.
 */
function seahorse(b: GeoBuilder, x: number, y: number, z: number, size: number): void {
  // along its profile (u) and up (v), turned so that it is seen side on from the south-east
  const ux = 0.743, uz = -0.669;
  const p = (u: number, v: number, w = 0): V3 => [x + ux * u * size + 0.669 * w, y + v * size, z + uz * u * size + 0.743 * w];
  const body: V3[] = [p(0.02, 0.0), p(0.12, -0.02), p(0.1, 0.1), p(-0.02, 0.12), p(-0.12, 0.26), p(-0.06, 0.46), p(0.08, 0.62), p(0.06, 0.8), p(-0.04, 0.92)];
  b.sweep(body, [0.04, 0.05, 0.06, 0.07, 0.09, 0.12, 0.12, 0.09, 0.08], SEAHORSE);
  // the head, with its long snout, and the crest behind it
  b.beam(p(-0.06, 0.92), p(0.2, 0.96), 0.085, 0.07, SEAHORSE);
  b.beam(p(0.2, 0.96), p(0.42, 0.92), 0.045, 0.035, SEAHORSE);
  b.beam(p(-0.1, 0.95), p(-0.16, 1.07), 0.04, 0.02, SILVER_LO);
  // the fin on its back
  for (const s of [-1, 1]) face3(b, p(-0.1, 0.42, s * 0.01), p(-0.12, 0.62, s * 0.01), p(-0.3, 0.5, s * 0.01), [0.669 * s, 0, 0.743 * s], SILVER_LO);
}

// ---------------------------------------------------------------------------
// The causeway and the sands
// ---------------------------------------------------------------------------

/** Where a line along the dyke at `x` leaves Driftmark's shore, and where it reaches the islet's. */
function shores(x: number): { from: number; to: number } {
  const D = ISLANDS.driftmark, I = ISLANDS['high-tide'];
  let from = DYKE.z0, to = DYKE.z1;
  for (let z = DYKE.z0; z < DYKE.z1; z += 0.05) if (inside(D, x, z)) from = z;
  for (let z = DYKE.z1; z > from; z -= 0.05) if (inside(I, x, z)) to = z;
  return { from, to };
}

/**
 * The causeway: a dyke of stone under the road, from below the sands up to
 * the road's bed, its ends running under the islands' ground; edging stones
 * either side of the road, flush with it, so that the tide covers them with
 * the road; weed and wet stone along its foot; lanterns on posts along it,
 * and tall marker posts beside it on the sands, which show the way across
 * when the sea is over it.
 */
function causeway(k: Build): void {
  const b = k.b, D = DYKE, { from, to } = shores(ROAD_X), xw = D.x0, xe = D.x1, rw = ROAD_X - LANE, re = ROAD_X + LANE;
  b.box(xw, D.top - 1.6, D.z0, xe, D.top, D.z1, CAUSE_WET, { faces: 'EW' });
  // the weed along its foot, where the sea leaves it
  for (const [x, s] of [[xw, -1], [xe, 1]]) {
    const y0 = groundAt(x + s * 0.6, (from + to) / 2);
    b.quad([x + s * 0.02, y0 - 0.02, D.z0], [x + s * 0.02, y0 - 0.02, D.z1], [x + s * 0.02, y0 + 0.13, D.z1], [x + s * 0.02, y0 + 0.13, D.z0], [s, 0, 0], WEED);
  }
  // the edging either side of the road: its bed, and worn blocks a hair above the road, some wet and some green with weed
  const rand = rng(12971);
  for (const [a, c] of [[xw, rw], [re, xe]]) {
    const e = shores((a + c) / 2), z0 = e.from - 0.4, z1 = e.to + 0.4;
    b.box(a, D.top - 0.02, z0, c, D.top, z1, CAUSE_WET, { faces: 'T' });
    for (let z = z0; z < z1; ) {
      const zb = Math.min(z1, z + 0.8 + rand() * 0.6), h = D.top + 0.045 + rand() * 0.02, pick = rand();
      b.box(a + 0.03, D.top, z + 0.03, c - 0.03, h, zb - 0.03, pick < 0.3 ? WEED : pick < 0.6 ? CAUSE_WET : CAUSE, { faces: 'NESWT' });
      z = zb;
    }
  }
  // lanterns on posts on the edging, three a side
  const lanternAt = (i: number): number => from + 0.7 + ((to - from - 1.4) * i) / 2;
  for (let i = 0; i < 3; i++) {
    const z = lanternAt(i);
    for (const x of [xw + 0.25, xe - 0.25]) {
      // a post, and on it a lantern: a base, the light, and a cap over it
      b.box(x - 0.1, D.top, z - 0.1, x + 0.1, 2.3, z + 0.1, TIMBER_DARK, { faces: 'NESW' });
      b.box(x - 0.18, 2.3, z - 0.18, x + 0.18, 2.36, z + 0.18, 0x3c3a36, { faces: 'NESWTB' });
      b.box(x - 0.21, 2.7, z - 0.21, x + 0.21, 2.8, z + 0.21, 0x3c3a36, { faces: 'NESWTB' });
      k.glows.push({ x, y: 2.53, z, sx: 0.28, sy: 0.34, sz: 0.28, color: '#ffd9a0' });
    }
    if (i !== 1) k.lights.push({ x: ROAD_X, z, r: 7, color: '#ffd9a0', k: 0.45 });
  }
  // the tall marker posts on the sands either side, banded white so that they read over the water at high tide
  for (const z of [(lanternAt(0) + lanternAt(1)) / 2, (lanternAt(1) + lanternAt(2)) / 2]) {
    for (const x of [xw - 0.5, xe + 0.5]) {
      const y = groundAt(x, z);
      b.box(x - 0.11, y - 0.05, z - 0.11, x + 0.11, 3.6, z + 0.11, TIMBER, { faces: 'NESWT' });
      for (const yb of [0.55, 1.5]) b.box(x - 0.135, yb, z - 0.135, x + 0.135, yb + 0.42, z + 0.135, 0xebe5d8, { faces: 'NESW' });
      // a topmark: a broom of withies, as on the posts that mark a way over sands
      lathe(b, x, z, [[0.06, 3.5], [0.3, 3.95], [0.06, 4.3]], 5, 0x8a7348);
    }
  }
  // two folk crossing on foot, on the edging out of the road's way
  k.person(xw + 0.2, (from + to) / 2 - 0.9, D.top + 0.05);
  k.person(xe - 0.2, (from + to) / 2 + 0.6, D.top + 0.05);
}

/** The place for a hero on the sands, from the plan: on the sandbar. */
const HERO = HERO_SPOTS.find((s) => s.id === 'causeway') ?? { x: SANDBAR.x, z: SANDBAR.z };

/**
 * Whether a place on the sands is free for the small things the sea leaves
 * there: on the sands, off the islands, the dyke and its posts, off the
 * sandbar, and out of the strip south-east of it that the view looks along to
 * the hero on it.
 */
function onFreeSand(x: number, z: number, room: number): boolean {
  if (!inside(SANDS, x, z) || inside(ISLANDS.driftmark, x, z) || inside(ISLANDS['high-tide'], x, z)) return false;
  if (x > DYKE.x0 - 1.2 - room && x < DYKE.x1 + 1.2 + room) return false;
  if (sandbarOut(x, z) < 1.08 + room / Math.min(SANDBAR.rx, SANDBAR.rz)) return false;
  // south-east of the bar: back along the view from here, is the bar within eight?
  for (let s = 0; s <= 8; s += 0.5) if (sandbarOut(x - 0.669 * s, z - 0.743 * s) < 1.05) return false;
  const hx = x - HERO.x, hz = z - HERO.z, along = hx * 0.669 + hz * 0.743, across = Math.abs(-hx * 0.743 + hz * 0.669);
  return !(Math.hypot(hx, hz) < 6 + room || (along > 0 && along < 14 && across < 6));
}

/**
 * Where the sea has left the sands: drifts of weed, shells, low stones, a
 * rowing boat stranded on its side, and folk gathering cockles with their
 * baskets near Driftmark's shore. All of it is low and solid, so that it reads
 * as well under the tide as out of it.
 */
function sands(k: Build): void {
  const b = k.b, rand = rng(7713);
  for (let i = 0; i < 30; i++) {
    const x = 13 + rand() * 42, z = 63.8 + rand() * 9;
    if (!onFreeSand(x, z, 0.4)) continue;
    const y = groundAt(x, z), r = 0.25 + rand() * 0.45, a = rand() * TAU, pts: V3[] = [];
    for (let j = 0; j < 5; j++) {
      const t = a + (j / 5) * TAU, rr = r * (0.6 + rand() * 0.5);
      pts.push([x + Math.cos(t) * rr * 1.4, y + 0.012, z + Math.sin(t) * rr]);
    }
    const col = rand() < 0.5 ? WEED : WEED_DARK;
    for (let j = 1; j + 1 < pts.length; j++) b.up(pts[0], pts[j], pts[j + 1], col);
  }
  for (let i = 0; i < 46; i++) {
    const x = 13 + rand() * 42, z = 63.8 + rand() * 9;
    if (!onFreeSand(x, z, 0.2)) continue;
    const y = groundAt(x, z) + 0.02, s = 0.09 + rand() * 0.07, a = rand() * TAU, col = [0xf4efe6, 0xe9d7cf, 0xf2e2c4][Math.floor(rand() * 3)];
    b.up([x + Math.cos(a) * s, y, z + Math.sin(a) * s], [x + Math.cos(a + 2.3) * s, y, z + Math.sin(a + 2.3) * s], [x + Math.cos(a + 4.0) * s, y, z + Math.sin(a + 4.0) * s], col);
  }
  // stones, low and dark
  for (let i = 0; i < 9; i++) {
    const x = 13 + rand() * 42, z = 64 + rand() * 8.5;
    if (!onFreeSand(x, z, 0.6)) continue;
    const y = groundAt(x, z);
    rock(b, x, z, y - 0.05, y + 0.16, y + 0.28 + rand() * 0.12, 0.42 + rand() * 0.25, rand() < 0.5 ? 0x77746c : 0x5f6158, rand() * TAU);
  }
  // a rowing boat left on its side by the tide
  const [bx, bz] = [16.4, 69.3];
  if (onFreeSand(bx, bz, 1.2)) rowingBoat(b, bx, groundAt(bx, bz), bz, 0.55, 0.3);
  // folk gathering cockles near Driftmark's shore, each with a basket and a rake
  for (const [x, z] of [[14.8, 65.9], [20.6, 66.6], [26.2, 65.6]] as P2[]) {
    if (!onFreeSand(x, z, 0.4)) continue;
    const y = groundAt(x, z);
    k.person(x, z, y);
    b.cyl(x + 0.55, z + 0.25, y, y + 0.45, 0.24, 0.3, 7, 0x9c7a46);
    b.beam([x - 0.3, y + 0.02, z + 0.4], [x - 0.15, y + 1.3, z + 0.1], 0.03, 0.03, TIMBER);
  }
}

/** A small rowing boat lying on the sand, tipped onto its side by `tilt`, its bow turned `yaw` from east. */
function rowingBoat(b: GeoBuilder, x: number, y: number, z: number, yaw: number, tilt: number): void {
  const HULL = 0x6e5136, INSIDE = 0x8f7151, len = 1.6, beam = 0.62, h = 0.48;
  b.moved(x, y, z, yaw, () => {
    const lean = (py: number, pz: number): [number, number] => [py * Math.cos(tilt) + pz * Math.sin(tilt), pz * Math.cos(tilt) - py * Math.sin(tilt)];
    const P = (px: number, py: number, pz: number): V3 => { const [ly, lz] = lean(py, pz); return [px, ly + 0.05, lz]; };
    // the hull: a keel line and two sides that curve to a point at the bow and to a narrow stern
    const sec = [[-len, 0.4], [-len * 0.6, 0.9], [0, 1], [len * 0.6, 0.75], [len, 0]] as const;
    for (let i = 0; i + 1 < sec.length; i++) {
      const [xa, wa] = sec[i], [xb, wb] = sec[i + 1];
      for (const s of [-1, 1]) {
        b.quad(P(xa, 0, 0), P(xb, 0, 0), P(xb, h, s * beam * wb), P(xa, h, s * beam * wa), [0, -0.3, s], HULL);
        b.quad(P(xa, h - 0.05, s * beam * wa * 0.86), P(xb, h - 0.05, s * beam * wb * 0.86), P(xb, 0.08, 0), P(xa, 0.08, 0), [0, 0.6, -s * 0.8], INSIDE);
      }
    }
    // the transom, and a thwart across it
    b.quad(P(-len, 0, 0), P(-len, 0, 0), P(-len, h, beam * 0.4), P(-len, h, -beam * 0.4), [-1, 0, 0], HULL);
    face3(b, P(-len, 0, 0), P(-len, h, beam * 0.4), P(-len, h, -beam * 0.4), [-1, 0, 0], HULL);
    b.beam(P(0.1, h * 0.75, -beam * 0.85), P(0.1, h * 0.75, beam * 0.85), 0.05, 0.05, INSIDE);
    // an oar left beside it
    b.beam([-0.6, 0.03, 0.95], [1.5, 0.03, 0.7], 0.035, 0.035, TIMBER);
  });
}

// ---------------------------------------------------------------------------
// The islet round the castle
// ---------------------------------------------------------------------------

/** Rocks along the islet's edge outside the walls, wet and weedy at the waterline. */
function shore(k: Build, l: Lot): void {
  const b = k.b, I = ISLANDS['high-tide'], rand = rng(2297);
  // a dark band of weed round the islet where the sea meets it
  const n = I.length;
  let turn = 0;
  for (let i = 0; i < n; i++) turn += I[i][0] * I[(i + 1) % n][1] - I[(i + 1) % n][0] * I[i][1];
  const out = turn > 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const p = I[i], q = I[(i + 1) % n], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const nx = ((q[1] - p[1]) / len) * out, nz = (-(q[0] - p[0]) / len) * out, o = 0.03;
    b.quad([p[0] + nx * o, -1.0, p[1] + nz * o], [q[0] + nx * o, -1.0, q[1] + nz * o], [q[0] + nx * o, -0.62, q[1] + nz * o], [p[0] + nx * o, -0.62, p[1] + nz * o], [nx, 0, nz], WEED_DARK);
  }
  // rocks along the edge, half in the water, where nothing else stands
  for (let i = 0; i < 24; i++) {
    const e = Math.floor(rand() * n), p = I[e], q = I[(e + 1) % n], t = rand(), len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const nx = ((q[1] - p[1]) / len) * out, nz = (-(q[0] - p[0]) / len) * out, r = 0.45 + rand() * 0.5;
    const x = p[0] + (q[0] - p[0]) * t + nx * r * 0.5, z = p[1] + (q[1] - p[1]) * t + nz * r * 0.5;
    // not on the road, not where the gate's forecourt is, not by the postern's steps, and not on the east, which is kept
    if (Math.abs(x - ROAD_X) < LANE + 2.5 && z < l.z0) continue;
    if (Math.abs(x - (ROAD_X - 2.4)) < 1.5 && z > l.z1) continue;
    if (x > l.x1 - 3) continue;
    const col = rand() < 0.5 ? 0x8a867c : 0x6f6d66, mid = -0.25 + rand() * 0.2;
    rock(b, x, z, -1.0, mid, mid + 0.25 + rand() * 0.25, r, col, rand() * TAU);
  }
}

// ---------------------------------------------------------------------------
// The model and what is built besides
// ---------------------------------------------------------------------------

/** What each part costs in triangles, for the console while the file is built. */
const COST: [string, number][] = [];
function costed(k: Build, what: string, fn: () => void): void {
  const before = k.b.triangles + k.street.triangles;
  fn();
  COST.push([what, k.b.triangles + k.street.triangles - before]);
}

const highTide: Model = (k, l) => {
  const L = layout(l), wallH = 3.2;
  COST.length = 0;
  costed(k, 'keep', () => keep(k, L));
  costed(k, 'gate', () => gate(k, L));
  costed(k, 'hall', () => greatHall(k, L));
  costed(k, 'turret', () => brassTurret(k.b, L));
  costed(k, 'south-west', () => southWest(k, l, L));
  costed(k, 'sea wall', () => seaWall(k, l, L.sw.x, TERRACE_X, wallH));
  // the loggia, from the south-west tower to where the court's open circle comes near the wall
  const lx1 = ROAD_X - 3, lzp = CZ + Math.sqrt(COURT * COURT - (CX - lx1) ** 2) + 0.05;
  costed(k, 'loggia', () => seaLoggia(k, l, L.sw.x + L.sw.r, lx1, lzp, wallH));
  costed(k, 'court', () => courtPaving(k, l, TERRACE_X));
  costed(k, 'fountain', () => fountain(k));
  costed(k, 'folk', () => courtFolk(k, L));
  costed(k, 'terrace', () => dragonTerrace(k));
  costed(k, 'shore', () => shore(k, l));
};

/**
 * Folk in the court, where the ring's traffic leaves room: at the keep's
 * door and under the gate's west side; and by the hall's door, a chest of the
 * east's treasure, opened.
 */
function courtFolk(k: Build, L: Layout): void {
  const b = k.b, f = Math.SQRT1_2, dx = (L.keep.x1 + L.cut - L.keep.z1) / 2, dz = (L.cut - L.keep.x1 + L.keep.z1) / 2;
  k.person(dx + f * 0.45 + f * 1.0, dz + f * 0.45 - f * 1.0, 0.045);
  k.person(ROAD_X - LANE - 0.3, L.gate.z1 + 0.5, 0.045);
  // the chest, its lid thrown back, gold in it, beside the guard at the hall's door
  const cx = L.hall.x1 + 0.55, cz = L.keep.z1 + 1.75;
  b.box(cx - 0.25, 0.045, cz - 0.38, cx + 0.25, 0.5, cz + 0.38, 0x6a3f22, { faces: 'NESWT', top: 0xe0b44a });
  b.box(cx - 0.27, 0.3, cz - 0.4, cx + 0.27, 0.36, cz + 0.4, BRASS_HI, { faces: 'NESWB' });
  b.box(cx - 0.32, 0.5, cz - 0.38, cx - 0.25, 0.95, cz + 0.38, 0x6a3f22, { faces: 'NESWT' });
}

export const MODELS: Record<string, Model> = { 'high-tide': highTide };
export const COVERS: string[] = [];
export const SIGNS: SignDef[] = [nameSign('high-tide-name', 'High Tide')];

export function extras(k: Build): void {
  costed(k, 'causeway', () => causeway(k));
  costed(k, 'sands', () => sands(k));
  if (import.meta.env.DEV) console.info(`High Tide: ${COST.map(([w, n]) => `${w} ${n}`).join(', ')}.`);
}

export function heightAt(_x: number, _z: number): number {
  return 0;
}
