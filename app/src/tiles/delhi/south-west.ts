// The south-west: Delhi Public School R. K. Puram, R. K. Puram's flats and its
// colony park, Hauz Khas with Deer Park, and the dhaba on Aurobindo Marg.
//
// Every place and size is taken from the plan: a thing's own lot, the ground it
// is given, the tank that is cut for it, and the line of Kaifi Azmi Marg with
// the school's gate on it.
//
// The school's gate and the block behind it follow a picture of them: a broad,
// shallow canopy in teal over the whole driveway, with white capitals along its
// curved front, on pillars of wooden slats; a gate of four leaves under it; and
// a block of grey concrete with a teal band at every floor and pale lattice
// before its upper windows. The school's emblem and its motto are not drawn.
//
// Firoz Shah's tomb at Hauz Khas is a tomb: nothing stands on it, nobody climbs
// it, and nothing is parked by it.

import * as THREE from 'three';
import { placed } from '../../engine/build';
import { Smoke } from '../../engine/effects';
import { GeoBuilder, interior, rng, type V3, type WinSpec } from '../../engine/geo';
import { area, rect, type P2 } from '../../engine/ground';
import { figure, lathe, tri, twoWheeler, wheel } from '../../engine/parts';
import { mast, standingCar } from '../../engine/props';
import { clearOfStreets } from '../../engine/roads';
import { slab } from '../../engine/shapes';
import { DEVANAGARI, EN, fit, type SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { RECESS, RED, RUBBLE, RUBBLE_LIGHT, arcade, chhatri, dome, merlons, niche, slot, steps, tiranga, type Facing } from './mughal';
import { GROUNDS, SHANTI, STOREY, TURN_R, WATERS, heroPlace, thing, type Thing } from './plan';

export type Model = (k: Build, t: Thing) => void;

// ---------------------------------------------------------------------------
// Colours and heights
// ---------------------------------------------------------------------------

const TEAL = 0x1f8a80, TEAL_DARK = 0x176e66, CONCRETE = 0xbdb7a8, PIER = 0xcbc6b8, ROOF = 0xb3ad9f, JAALI = 0xeceae2;
const SLAT = 0xb08a5a, SLAT_CORE = 0x59452f, GRANITE = 0x8b8f93, GRANITE_TOP = 0x74787c, WALL = 0xcfc8b6, WALL_TOP = 0xa9a393;
const IRON = 0xb9c1c8, STEEL = 0xaeb6bd, PALE = 0xe6eaea, WHITE = 0xf7f7f2, WOOD = 0x9a7048;
const ASPHALT = 0x6f7074, PAVING = 0xe2dbcb, EARTH = 0xcbbfa6, TURF = 0x5f9d50, LINE = 0xf4f4ec, HEDGE = 0x3f7d3c, POT = 0xb5653f, PALM = 0x4f9a48;
const BUS_YELLOW = 0xf2c81e, BUS_WHITE = 0xf4f1e8, DARK = 0x2a2c31, TYRE = 0x17171a, HAIR = 0x2a211c, SHIRT = 0xf4f1e8, BOTTLE = 0x1f5a3c;

/**
 * How high this file lays things on the ground. The lawns and the paving that
 * index.ts lays for a ground are at 0.02, a sidewalk at 0.015 and a carriageway
 * at 0.03. The school's ground, which index.ts leaves bare, is laid at the
 * height of a lawn; a surface of this file's lies over a lawn or over that
 * ground, and paint on such a surface a hair higher again.
 */
const BASE = 0.02, LAID = 0.03, PAINT = 0.045;

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------

const board = (id: string, lines: string[], color: string, ink: string, aspect: number, h: number, more: Partial<SignDef> = {}): SignDef =>
  ({ id: `south-west-${id}`, lines, color, ink, aspect, kind: 'board', size: [Math.round(h * aspect), h], ...more });

/** Lettering as a sign-painter's brush leaves it, for the village's boards. */
const HAND = '"Segoe Print", "Bradley Hand", "Comic Sans MS", "Chalkboard SE", "Marker Felt", cursive';

/** The signs this file hangs. */
export const SIGNS: SignDef[] = [
  // the plaque on the wall beside the school's gate: the school's own name, in plain lettering, with no emblem
  board('dps-plaque', ['DELHI PUBLIC SCHOOL', 'R. K. PURAM'], '#2b2f33', '#e9e6dc', 3.3, 150, { real: true }),
  board('school-bus', ['SCHOOL BUS'], '#f2c81e', '#1b1c20', 5.2, 56),
  board('ice-lolly', ['ICE LOLLY'], '#f4f1e8', '#1f5fa8', 3.6, 64),
  // the colony's own board, as stands at the corner of every sector: the school's address is in Sector 12
  board('rk-puram', ['आर.के. पुरम', 'R. K. PURAM', 'SECTOR 12'], '#1f4fa8', '#ffffff', 2.6, 168, { real: true, font: DEVANAGARI }),
  // Hauz Khas Village: boards that say what is there, and nobody's name
  board('cafe', ['CAFE'], '#f2c14e', '#5e1a1a', 2.4, 96, { font: HAND }),
  board('boutique', ['BOUTIQUE'], '#f4efe2', '#a8327a', 4.2, 88, { font: HAND }),
  board('gallery', ['GALLERY'], '#1f5d6b', '#f6f1e4', 3.8, 88, { font: HAND }),
  // the park's own name, as on a road board: white on green
  board('deer-park', ['डियर पार्क', 'DEER PARK'], '#12784a', '#ffffff', 3.5, 120, { real: true, font: DEVANAGARI }),
  board('dhaba', ['ढाबा', 'DHABA'], '#c8202c', '#ffe9a8', 3.0, 128, { font: DEVANAGARI }),
  // (used only if the tile's own board for a puncture stand, in Hindi and English, is not on the sheet)
  board('puncture', ['PUNCTURE'], '#1b1b20', '#f4f1e8', 2.4, 64),
  { id: 'south-west-horn-ok-please', lines: ['HORN', 'OK', 'PLEASE'], color: '#ffd23f', aspect: 1.7, size: [290, 170], paint: paintTailboard },
];

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

/** A child: smaller than the tile's own people, in a shirt and in trousers or shorts of given colours. `s` is how tall, against a grown figure. */
function child(b: GeoBuilder, x: number, z: number, shirt: number, legs: number, s = 0.9): void {
  b.box(x - 0.3 * s, 0, z - 0.2 * s, x + 0.3 * s, 0.82 * s, z + 0.2 * s, legs, { faces: 'NESW' });
  b.box(x - 0.36 * s, 0.82 * s, z - 0.23 * s, x + 0.36 * s, 1.78 * s, z + 0.23 * s, shirt);
  b.box(x - 0.25 * s, 1.78 * s, z - 0.25 * s, x + 0.25 * s, 2.25 * s, z + 0.25 * s, 0xd9ae88, { top: HAIR });
}

/** A pupil in the school's white and bottle green, with a bag at their side if a colour is given for it. */
function pupil(b: GeoBuilder, x: number, z: number, bag?: number): void {
  child(b, x, z, SHIRT, BOTTLE);
  if (bag !== undefined) b.box(x + 0.33, 0.85, z - 0.18, x + 0.55, 1.5, z + 0.18, bag, { faces: 'NESWT' });
}

/**
 * A school's bus, standing: the shape and the colours of the ones that drive
 * past the gate (`school-bus` in traffic.ts), with its nose along (cos yaw,
 * sin yaw). `round` says which of its two sides get round wheels: its right,
 * its left, both or neither. The other wheels are plain blocks, for a side
 * that stands against another bus.
 */
function schoolBus(k: Build, x: number, z: number, yaw: number, paint: number, round: 'right' | 'left' | 'both' | 'none'): void {
  const b = k.b, WINDOWS: WinSpec = { cell: 2.1, storey: 0.875, lit: 0, kind: 1 };
  b.moved(x, 0, z, yaw, () => {
    b.box(-4.3, 0.6, -1.6, 4.3, 1.75, 1.6, paint, { faces: 'NESWB' });
    // the band of windows is two rows of the window grid up, so that its panes are whole
    b.box(-4.25, 1.75, -1.55, 4.05, 2.625, 1.55, paint, { win: WINDOWS, faces: 'NESW' });
    b.box(-4.3, 2.625, -1.6, 4.2, 3.25, 1.6, paint, { faces: 'NESWTB' });
    b.box(-4.33, 1.39, -1.63, 4.33, 1.61, 1.63, DARK, { faces: 'NESW' });
    b.box(-3.1, 3.25, -1.1, 1.5, 3.38, 1.1, STEEL);
    for (const wx of [2.7, -2.6]) {
      for (const s of [-1, 1]) {
        const shown = round === 'both' || (round === 'right' && s === 1) || (round === 'left' && s === -1);
        if (shown) wheel(b, wx, 1.0, s * 1.28, 1.0, 0.425, s);
        else b.box(wx - 0.85, 0.02, s * 1.28 - 0.4, wx + 0.85, 1.7, s * 1.28 + 0.4, TYRE, { faces: 'NESW' });
      }
    }
    for (const s of [-1, 1]) {
      b.box(4.3, 0.82, s * 0.9 - 0.4, 4.34, 1.18, s * 0.9 + 0.4, 0xfff4d6, { win: interior(2.4), faces: 'E' });
      b.box(-4.34, 1.05, s * 0.9 - 0.42, -4.3, 1.35, s * 0.9 + 0.42, 0xc81e1e, { win: interior(1.8), faces: 'W' });
    }
  });
  // what it is, over its windscreen and across its back
  const c = Math.cos(yaw), s = Math.sin(yaw);
  k.sign('south-west-school-bus', x + c * 4.23, 2.94, z + s * 4.23, c, s, 0.42, 2.6);
  k.sign('south-west-school-bus', x - c * 4.33, 2.94, z - s * 4.33, -c, -s, 0.42, 2.6);
}

/** A palm in a pot of terracotta. */
function pottedPalm(b: GeoBuilder, x: number, z: number): void {
  b.cyl(x, z, 0, 0.55, 0.3, 0.4, 6, POT, { cap: 0x4a3a2a });
  b.cyl(x, z, 0.55, 1.5, 0.09, 0.07, 4, 0x7a5a3c, { cap: false });
  const top: V3 = [x, 1.5, z];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3, c = Math.cos(a), s = Math.sin(a);
    const l: V3 = [x + c * 0.55 - s * 0.17, 1.9, z + s * 0.55 + c * 0.17], r: V3 = [x + c * 0.55 + s * 0.17, 1.9, z + s * 0.55 - c * 0.17];
    const tip: V3 = [x + c * 1.2, 1.35, z + s * 1.2];
    // a frond rises from the crown and droops to its tip: seen from above and from below
    for (const n of [1, -1]) {
      tri(b, top, l, r, [0, n, 0], PALM);
      tri(b, l, tip, r, [0, n, 0], PALM);
    }
  }
}

// ---------------------------------------------------------------------------
// Lettering built of strokes, for a line of capitals that has to follow a curve
// ---------------------------------------------------------------------------

/** Capitals as strokes: each letter is one or more runs of points, across (0 to 1) and up (0 to 1). */
const GLYPHS: Record<string, [number, number][][]> = {
  D: [[[0, 0], [0, 1], [0.55, 1], [1, 0.7], [1, 0.3], [0.55, 0], [0, 0]]],
  P: [[[0, 0], [0, 1], [0.7, 1], [1, 0.84], [1, 0.62], [0.7, 0.46], [0, 0.46]]],
  S: [[[1, 0.82], [0.78, 1], [0.22, 1], [0, 0.82], [0, 0.64], [0.22, 0.5], [0.78, 0.5], [1, 0.36], [1, 0.18], [0.78, 0], [0.22, 0], [0, 0.18]]],
  R: [[[0, 0], [0, 1], [0.7, 1], [1, 0.84], [1, 0.62], [0.7, 0.46], [0, 0.46]], [[0.5, 0.46], [1, 0]]],
  K: [[[0, 0], [0, 1]], [[1, 1], [0, 0.4]], [[0.32, 0.6], [1, 0]]],
  U: [[[0, 1], [0, 0.26], [0.26, 0], [0.74, 0], [1, 0.26], [1, 1]]],
  A: [[[0, 0], [0.5, 1], [1, 0]], [[0.2, 0.36], [0.8, 0.36]]],
  M: [[[0, 0], [0, 1], [0.5, 0.36], [1, 1], [1, 0]]],
};
/** Letters that are wider than the rest. */
const WIDE: Record<string, number> = { M: 1.3, A: 1.08 };

/** How a line of lettering is set: the height and width of a letter, the thickness of a stroke, and the gaps between letters and between words. */
interface Type { h: number; w: number; t: number; gap: number; space: number }

const advance = (ch: string, m: Type): number => (ch === ' ' ? m.space : ch === '.' ? m.t * 1.1 + m.gap : m.w * (WIDE[ch] ?? 1) + m.gap);
const widthOf = (text: string, m: Type): number => [...text].reduce((s, ch) => s + advance(ch, m), 0) - m.gap;

/**
 * A line of capitals, each stroke a flat quad. `at` says where a place `s`
 * along the line and `v` above its middle is in the world, which is what lets
 * the line follow an arc. It starts at `s0` and faces the way `n` points.
 */
function lettering(b: GeoBuilder, text: string, s0: number, m: Type, at: (s: number, v: number) => V3, n: V3, color: number, win?: WinSpec): void {
  let s = s0;
  const q = win ? { win } : {}, low = -m.h / 2, half = m.t / 2;
  for (const ch of text) {
    const w = m.w * (WIDE[ch] ?? 1);
    if (ch === '.') {
      const d = m.t * 1.1;
      b.quad(at(s, low), at(s + d, low), at(s + d, low + d), at(s, low + d), n, color, q);
    } else {
      for (const run of GLYPHS[ch] ?? []) {
        for (let i = 0; i + 1 < run.length; i++) {
          // a stroke from one point to the next, with square ends that fill the corner where two strokes meet
          const ax = half + run[i][0] * (w - m.t), ay = half + run[i][1] * (m.h - m.t), bx = half + run[i + 1][0] * (w - m.t), by = half + run[i + 1][1] * (m.h - m.t);
          const l = Math.hypot(bx - ax, by - ay) || 1, ux = ((bx - ax) / l) * half, uy = ((by - ay) / l) * half;
          b.quad(
            at(s + ax - ux + uy, low + ay - uy - ux), at(s + bx + ux + uy, low + by + uy - ux),
            at(s + bx + ux - uy, low + by + uy + ux), at(s + ax - ux - uy, low + ay - uy + ux), n, color, q,
          );
        }
      }
    }
    s += advance(ch, m);
  }
}

// ---------------------------------------------------------------------------
// Delhi Public School, R. K. Puram
// ---------------------------------------------------------------------------

/** Half the width of the canopy over the school's gate. */
const HW = 5.2;
/** From the gate's middle to the middle of the grey pier that stands beside either pillar. */
const PIER_AT = HW + 0.85;
/** The buses' turning circle on Kaifi Azmi Marg, and how far its sidewalk reaches from its middle: its lane is 6 wide, with a sidewalk of 1.5 (TURNING in roads.ts). */
const TURN = { x: SHANTI.turnX, z: SHANTI.south, r: TURN_R + 3 + 1.5 };

/** The school's windows, and the lattice before its upper ones: a fine grid of small openings, eight rows to a storey. */
const PANES: WinSpec = { cell: 1.5, storey: STOREY, lit: 0.42, kind: 0 };
const LATTICE: WinSpec = { cell: 0.36, storey: STOREY / 8, lit: 0.5, kind: 4 };

/** The campus as measures, all taken from the plan. */
interface Campus {
  /** The school's ground. */
  x0: number; z0: number; x1: number; z1: number;
  /** The gate's middle along the road, and the line the gate and the wall either side of it stand on: back from the road, behind a forecourt. */
  gate: number; zf: number;
  /** The middle of the wall on the other sides, a little inside the ground's edge. */
  wx0: number; wx1: number; wz0: number; wz1: number;
  /** Where the plaque's wall ends, west of the gate, and the boundary steps back out to the road. */
  xa: number;
  /** The middle of the buses' rank along x, and the west edge of the bay they stand in. */
  busX: number; bayX: number;
  /** The east end of the main block, where the lower wing begins, and the main block's front. */
  bx: number; bz: number;
}

function campusOf(t: Thing): Campus {
  const [x0, z0, x1, z1] = GROUNDS.dps;
  const gate = SHANTI.gateX, busX = x1 - 0.55 - 4.3;
  return {
    x0, z0, x1, z1, gate, zf: z1 - 3.6, wx0: x0 + 0.3, wx1: x1 - 0.3, wz0: z0 + 0.3, wz1: z1 - 0.3,
    xa: gate - PIER_AT - 0.45 - 4.1, busX, bayX: busX - 4.45, bx: gate + HW - 1.4, bz: t.z + t.d,
  };
}

/** The forecourt between the gate and the road, as a shape: the ground in front of the gate's line, less the turning circle's sidewalk. */
function forecourt(c: Campus): P2[] {
  const r = TURN.r + 0.06, dz = TURN.z - c.z1, reach = Math.sqrt(Math.max(0, r * r - dz * dz));
  const shape: P2[] = [[c.xa, c.zf], [c.x1, c.zf], [c.x1, c.z1]];
  if (reach > 0) {
    // from where the circle crosses the ground's edge in the east, round by the north, to where it crosses it in the west
    const a0 = Math.atan2(-dz, reach), a1 = Math.atan2(-dz, -reach);
    for (let i = 0; i <= 8; i++) {
      const a = a0 + ((a1 - a0) * i) / 8;
      shape.push([TURN.x + Math.cos(a) * r, TURN.z + Math.sin(a) * r]);
    }
  }
  shape.push([c.xa, c.z1]);
  return shape;
}

/** The gate: a shallow arched canopy on two slatted pillars, its lettering, the four leaves under it, the piers, the plaque's wall and what grows before it. */
function schoolGate(k: Build, c: Campus): void {
  const b = k.b, g = c.gate, zf = c.zf;
  // The canopy is the end of a low barrel roof: a part of a circle, a fifth as high as it is wide.
  const spring = 3.6, rise = (2 * HW) / 5, R = (HW * HW + rise * rise) / (2 * rise), yc = spring - Math.sqrt(R * R - HW * HW), deep = 1.3;
  const under = (x: number): number => yc + Math.sqrt(R * R - x * x), over = (x: number): number => yc + Math.sqrt((R + deep) ** 2 - x * x);
  const zFront = zf + 0.5, zBack = zf - 2.7, thick = 0.22, sheet = 0.12, N = 10, glow = interior(0.5);
  const P = (x: number, y: number, z: number): V3 => [g + x, y, z];
  for (let i = 0; i < N; i++) {
    const xa = -HW + (i * 2 * HW) / N, xb = -HW + ((i + 1) * 2 * HW) / N, ua = under(xa), ub = under(xb), oa = over(xa), ob = over(xb);
    const l = Math.hypot(xb - xa, ub - ua), down: V3 = [(ub - ua) / l, -(xb - xa) / l, 0], lo = Math.hypot(xb - xa, ob - oa), up: V3 = [-(ob - oa) / lo, (xb - xa) / lo, 0];
    // the fascia: its face to the road, its back, and its lower and upper edges
    b.quad(P(xa, ua, zFront), P(xb, ub, zFront), P(xb, ob, zFront), P(xa, oa, zFront), [0, 0, 1], TEAL, { win: glow });
    b.quad(P(xa, ua, zFront + 0.015), P(xb, ub, zFront + 0.015), P(xb, ub + 0.1, zFront + 0.015), P(xa, ua + 0.1, zFront + 0.015), [0, 0, 1], PALE);
    b.quad(P(xa, ua, zFront - thick), P(xb, ub, zFront - thick), P(xb, ob, zFront - thick), P(xa, oa, zFront - thick), [0, 0, -1], TEAL_DARK);
    b.quad(P(xa, ua, zFront - thick), P(xb, ub, zFront - thick), P(xb, ub, zFront), P(xa, ua, zFront), down, TEAL_DARK);
    b.quad(P(xa, oa, zFront - thick), P(xb, ob, zFront - thick), P(xb, ob, zFront), P(xa, oa, zFront), up, TEAL);
    // the roof behind it: a curved sheet, teal above and pale below
    b.quad(P(xa, oa - 0.1, zBack), P(xb, ob - 0.1, zBack), P(xb, ob - 0.1, zFront - thick), P(xa, oa - 0.1, zFront - thick), up, TEAL);
    b.quad(P(xa, oa - 0.1 - sheet, zBack), P(xb, ob - 0.1 - sheet, zBack), P(xb, ob - 0.1 - sheet, zFront - thick), P(xa, oa - 0.1 - sheet, zFront - thick), down, PALE);
    // and a shallower board along its back edge, seen from both sides
    b.quad(P(xa, oa - 0.62, zBack), P(xb, ob - 0.62, zBack), P(xb, ob - 0.1, zBack), P(xa, oa - 0.1, zBack), [0, 0, -1], TEAL);
    b.quad(P(xa, oa - 0.62, zBack), P(xb, ob - 0.62, zBack), P(xb, ob - 0.1 - sheet, zBack), P(xa, oa - 0.1 - sheet, zBack), [0, 0, 1], TEAL_DARK);
  }
  // a beam under each end of the roof, from front to back, which the pillar carries
  for (const s of [-1, 1]) {
    const x0 = g + s * HW - 0.3, x1 = g + s * HW + 0.3;
    b.box(x0, spring - 0.2, zBack - 0.05, x1, over(HW) + 0.02, zFront + 0.05, TEAL, { faces: 'NESWTB', win: glow });
  }
  // the light steel under the roof: two arched ribs, three purlins from front to back, and a strut at each crossing
  const ribs = [(zFront + zBack) / 2, zBack + 0.36];
  for (const z of ribs) {
    const pts: V3[] = [];
    for (let i = 0; i <= 6; i++) {
      const x = -HW + 0.3 + (i * 2 * (HW - 0.3)) / 6;
      pts.push(P(x, under(x) + 0.07, z));
    }
    b.sweep(pts, pts.map(() => 0.065), PALE);
  }
  for (const x of [-HW * 0.5, 0, HW * 0.5]) {
    b.beam(P(x, over(x) - 0.1 - sheet - 0.07, zBack + 0.2), P(x, over(x) - 0.1 - sheet - 0.07, zFront - thick - 0.03), 0.06, 0.06, PALE);
    b.beam(P(x, under(x) + 0.1, ribs[0]), P(x, over(x) - 0.1 - sheet - 0.1, ribs[0]), 0.05, 0.05, PALE);
  }

  // the lettering, along the fascia's own arc: D. P. S. to the left, a gap in the middle where the emblem is, and R. K. PURAM to the right
  const Rc = R + deep / 2, type: Type = { h: 0.72, w: 0.39, t: 0.125, gap: 0.1, space: 0.18 }, wide: Type = { ...type, space: 0.5 };
  const on = (s: number, v: number): V3 => [g + Math.sin(s / Rc) * (Rc + v), yc + Math.cos(s / Rc) * (Rc + v), zFront + 0.02];
  const middle = 0.82, right = 'R. K. PURAM', left = 'D. P. S.', end = middle + widthOf(right, type);
  lettering(b, right, middle, type, on, [0, 0, 1], WHITE, interior(1.2));
  lettering(b, left, -(middle + end) / 2 - widthOf(left, wide) / 2, wide, on, [0, 0, 1], WHITE, interior(1.2));

  // the pillars: upright slats of wood round a dark core, on a low foot
  for (const s of [-1, 1]) {
    const px = g + s * (HW - 0.5);
    b.box(px - 0.5, 0, zf - 0.5, px + 0.5, 0.22, zf + 0.5, PIER);
    b.box(px - 0.36, 0.22, zf - 0.33, px + 0.36, spring + 0.5, zf + 0.33, SLAT_CORE, { faces: 'NESW' });
    for (let i = -2; i <= 2; i++) b.box(px + i * 0.19 - 0.065, 0.22, zf - 0.45, px + i * 0.19 + 0.065, spring + 0.9, zf + 0.45, SLAT);
    // and the square grey pier beside it
    const qx = g + s * PIER_AT;
    b.box(qx - 0.45, 0, zf - 0.45, qx + 0.45, 3.3, zf + 0.45, 0xa3a6a4);
    b.box(qx - 0.53, 3.3, zf - 0.53, qx + 0.53, 3.5, zf + 0.53, 0x8e9291, { faces: 'NESWTB' });
  }

  // the gate, shut: four leaves of steel, each filled with slanting bars, so that two leaves together make chevrons
  const GATE = 0xaab2b9, gx0 = g - (HW - 0.95), leaf = (2 * (HW - 0.95)) / 4, y0 = 0.2, y1 = 2.85, bar = 0.05;
  const rod = (ax: number, ay: number, cx: number, cy: number): void => b.beam([ax, ay, zf], [cx, cy, zf], 0.07, 0.07, GATE);
  rod(gx0, y0, gx0 + 4 * leaf, y0);
  rod(gx0, y1, gx0 + 4 * leaf, y1);
  for (let j = 0; j <= 4; j++) rod(gx0 + j * leaf, y0, gx0 + j * leaf, y1);
  for (let j = 0; j < 4; j++) {
    for (const off of [-1.6, -0.8, 0, 0.8, 1.6]) {
      // a flat bar at 45 degrees, cut off at the leaf's frame, seen from the road and from the court
      const u0 = Math.max(0, off), u1 = Math.min(leaf, off + (y1 - y0));
      if (u1 - u0 < 0.3) continue;
      const side = j % 2 ? -1 : 1, base = j % 2 ? gx0 + (j + 1) * leaf : gx0 + j * leaf;
      const p = (u: number, d: number): V3 => [base + side * (u + d), y0 + u - off - d, zf];
      for (const nz of [1, -1]) b.quad(p(u0, -bar), p(u1, -bar), p(u1, bar), p(u0, bar), [0, 0, nz], GATE);
    }
  }

  // left of the gate, as seen from the road: a wall faced in grey granite, with the plaque on it and railings above
  const wx1 = g - PIER_AT - 0.45, top = 1.9;
  b.box(c.xa + 0.25, 0, zf - 0.25, wx1, top, zf + 0.25, GRANITE, { top: GRANITE_TOP });
  b.box(c.xa - 0.25, 0, zf - 0.25, c.xa + 0.25, top, c.wz1 + 0.15, GRANITE, { top: GRANITE_TOP });
  const px = (c.xa + 0.25 + wx1) / 2;
  b.box(px - 1.72, 0.78, zf + 0.25, px + 1.72, 1.82, zf + 0.35, 0x1d2023, { faces: 'ESWTB' });
  k.sign('south-west-dps-plaque', px, 1.3, zf + 0.38, 0, 1, 0.94, 3.3);
  for (let x = c.xa; x <= wx1 - 0.2; x += 0.84) b.box(x - 0.045, top, zf - 0.045, x + 0.045, 3.0, zf + 0.045, IRON, { faces: 'NESW' });
  b.box(c.xa - 0.05, 2.92, zf - 0.06, wx1, 3.04, zf + 0.06, IRON, { faces: 'NSTB' });
  for (let z = zf + 0.84; z <= c.wz1; z += 0.84) b.box(c.xa - 0.045, top, z - 0.045, c.xa + 0.045, 3.0, z + 0.045, IRON, { faces: 'NESW' });
  b.box(c.xa - 0.06, 2.92, zf + 0.06, c.xa + 0.06, 3.04, c.wz1 + 0.1, IRON, { faces: 'EWTB' });
  // trimmed box hedges before the wall, in planters that step down towards the road, low enough to leave the plaque in sight
  b.box(c.xa + 0.5, 0, zf + 0.25, wx1 - 0.15, 0.55, zf + 0.72, GRANITE_TOP);
  b.box(c.xa + 0.58, 0.55, zf + 0.3, wx1 - 0.23, 0.86, zf + 0.64, HEDGE);
  b.box(c.xa + 0.5, 0, zf + 0.72, wx1 - 0.15, 0.3, zf + 1.2, GRANITE_TOP);
  b.box(c.xa + 0.58, 0.3, zf + 0.8, wx1 - 0.23, 0.62, zf + 1.12, HEDGE);
  // and a potted palm either side of the gate
  for (const s of [-1, 1]) pottedPalm(b, g + s * PIER_AT, zf + 1.05);

  // by night: lamps under the canopy, and a pool of light before the gate
  for (const x of [-2.7, 2.7]) k.glows.push({ x: g + x, y: under(x) - 0.12, z: zf - 1.1, sx: 0.55, sy: 0.14, sz: 0.55, color: '#fff3d6' });
  k.lights.push({ x: g, z: zf + 0.8, r: 14, color: '#ffe9c4', k: 0.75 }, { x: px, z: zf + 1.5, r: 6, color: '#ffe9c4', k: 0.5 });
}

/** The blocks: the main one behind the gate, a lower wing east of it and a lower block along the west wall. */
function schoolBlocks(k: Build, t: Thing, c: Campus): void {
  const b = k.b, S = STOREY;

  /** A teal band round a block at the sill and at the fascia of each of its floors but the top fascia, which the caller builds as the roof's edge. */
  const bands = (x0: number, z0: number, x1: number, z1: number, floors: number): void => {
    for (let i = 0; i < floors; i++) {
      b.box(x0 - 0.1, i * S + 0.55, z0 - 0.1, x1 + 0.1, i * S + 0.85, z1 + 0.1, TEAL, { faces: 'NESWTB' });
      if (i < floors - 1) b.box(x0 - 0.1, (i + 1) * S - 0.4, z0 - 0.1, x1 + 0.1, (i + 1) * S, z1 + 0.1, TEAL, { faces: 'NESWTB' });
    }
  };
  /** A panel of lattice on a wall that faces `f`, before one floor's windows: from `a0` to `a1` along the wall, on the upper floor `floor`. */
  const lattice = (f: 'N' | 'E' | 'S' | 'W', plane: number, a0: number, a1: number, floor: number): void => {
    const y0 = floor * S + 0.85, y1 = floor * S + 2.975, out = f === 'S' || f === 'E' ? 0.06 : -0.06;
    if (f === 'S' || f === 'N') b.box(a0, y0, Math.min(plane, plane + out), a1, y1, Math.max(plane, plane + out), JAALI, { win: LATTICE, faces: f });
    else b.box(Math.min(plane, plane + out), y0, a0, Math.max(plane, plane + out), y1, a1, JAALI, { win: LATTICE, faces: f });
  };
  /** A plain pier that stands a little proud of a wall facing `f`, from the ground to `top`. */
  const pier = (f: 'N' | 'E' | 'S' | 'W', plane: number, a: number, top: number): void => {
    const out = f === 'S' || f === 'E' ? 0.16 : -0.16, p0 = Math.min(plane, plane + out), p1 = Math.max(plane, plane + out);
    if (f === 'S' || f === 'N') b.box(a - 0.25, 0, p0, a + 0.25, top, p1, PIER, { faces: `${f}EWT` });
    else b.box(p0, 0, a - 0.25, p1, top, a + 0.25, PIER, { faces: `${f}NST` });
  };

  // --- the main block: three storeys, a lattice before the windows of the upper two, and the roof's edge in teal ---
  const x0 = t.x, x1 = c.bx, z0 = t.z, z1 = c.bz, top = t.h, edge = top + 0.45;
  b.box(x0, 0, z0, x1, top, z1, CONCRETE, { win: PANES, seed: 0.37, top: ROOF });
  bands(x0, z0, x1, z1, 3);
  b.box(x0 - 0.1, top - 0.4, z0 - 0.1, x1 + 0.1, edge, z0 + 0.22, TEAL);
  b.box(x0 - 0.1, top - 0.4, z1 - 0.22, x1 + 0.1, edge, z1 + 0.1, TEAL);
  b.box(x0 - 0.1, top - 0.4, z0 + 0.22, x0 + 0.22, edge, z1 - 0.22, TEAL);
  b.box(x1 - 0.22, top - 0.4, z0 + 0.22, x1 + 0.1, edge, z1 - 0.22, TEAL);
  const bays = Math.max(1, Math.round((x1 - x0) / 3)), bay = (x1 - x0) / bays;
  for (let i = 0; i <= bays; i++) {
    const a = i === 0 ? x0 + 0.09 : i === bays ? x1 - 0.09 : x0 + i * bay;
    pier('S', z1, a, edge + 0.06);
    pier('N', z0, a, edge + 0.06);
    if (i < bays) for (const floor of [1, 2]) for (const f of ['S', 'N'] as const) lattice(f, f === 'S' ? z1 : z0, x0 + i * bay + 0.34, x0 + (i + 1) * bay - 0.34, floor);
  }
  for (const [f, plane] of [['W', x0], ['E', x1]] as const) {
    pier(f, plane, (z0 + z1) / 2, edge + 0.06);
    for (const floor of [1, 2]) {
      if (f === 'E' && floor === 1) continue; // the wing stands against this wall, two storeys high
      lattice(f, plane, z0 + 0.5, (z0 + z1) / 2 - 0.34, floor);
      lattice(f, plane, (z0 + z1) / 2 + 0.34, z1 - 0.5, floor);
    }
  }
  // on its roof: the heads of two stairs, each with a black water tank on it
  for (const hx of [x0 + 0.6, x1 - 3.4]) {
    b.box(hx, top, z0 + 0.6, hx + 2.8, top + 1.75, z0 + 3.2, CONCRETE);
    b.box(hx - 0.08, top + 1.45, z0 + 0.52, hx + 2.88, top + 1.77, z0 + 3.28, TEAL, { faces: 'NESWTB' });
    b.box(hx + 0.9, top, z0 + 3.2, hx + 1.9, top + 1.3, z0 + 3.24, DARK, { faces: 'S' });
    b.cyl(hx + 1.4, z0 + 1.9, top + 1.77, top + 2.65, 0.66, 0.66, 8, 0x1e2023, { cap: 0x2b2e33 });
  }

  // --- the wing east of it: two storeys, standing back so that the buses have their bay before it ---
  const wx1 = t.x + t.w, wz1 = c.bz - 2.5, wtop = 2 * S;
  b.box(x1, 0, z0, wx1, wtop, wz1, CONCRETE, { win: PANES, seed: 0.61, faces: 'NES' });
  bands(x1, z0, wx1, wz1, 2);
  b.box(x1 - 0.1, wtop - 0.4, z0 - 0.1, wx1 + 0.1, wtop + 0.4, wz1 + 0.1, TEAL, { top: ROOF });
  for (const a of [x1 + 0.4, (x1 + wx1) / 2, wx1 - 0.09]) pier('S', wz1, a, wtop + 0.46);
  lattice('S', wz1, x1 + 0.74, (x1 + wx1) / 2 - 0.34, 1);
  lattice('S', wz1, (x1 + wx1) / 2 + 0.34, wx1 - 0.43, 1);
  lattice('E', wx1, z0 + 0.5, wz1 - 0.5, 1);
  lattice('N', z0, x1 + 0.5, wx1 - 0.5, 1);

  // --- a lower block along the west wall ---
  const ox0 = c.x0 + 0.95, ox1 = t.x - 0.7, oz0 = c.z0 + 0.95;
  b.box(ox0, 0, oz0, ox1, wtop, z1, CONCRETE, { win: PANES, seed: 0.83 });
  bands(ox0, oz0, ox1, z1, 2);
  b.box(ox0 - 0.1, wtop - 0.4, oz0 - 0.1, ox1 + 0.1, wtop + 0.4, z1 + 0.1, TEAL, { top: ROOF });
  lattice('S', z1, ox0 + 0.3, ox1 - 0.3, 1);

  k.lights.push({ x: (x0 + x1) / 2, z: z1 + 2.5, r: 15, color: '#ffe9c4', k: 0.55 }, { x: (x0 + x1) / 2, z: z0 - 0.9, r: 13, color: '#ffe9c4', k: 0.45 }, { x: wx1 + 1.5, z: (z0 + wz1) / 2, r: 8, color: '#ffe9c4', k: 0.4 });
}

/** What lies inside the wall: the assembly ground with its stage and the flag, the football ground, the pool, the bus bay, and the wall itself. */
function schoolGrounds(k: Build, c: Campus): void {
  const b = k.b, g = c.gate;
  // the ground inside the wall, and the paving of the forecourt and of the court behind the gate
  area(k, [[c.x0, c.z0], [c.x1, c.z0], [c.x1, c.zf], [c.xa, c.zf], [c.xa, c.z1], [c.x0, c.z1]], EARTH, BASE);
  area(k, forecourt(c), PAVING, LAID);
  const cx0 = g - HW;
  area(k, rect(cx0, c.bz, c.bayX, c.zf), PAVING, LAID);

  // --- the wall ---
  const wall = (ax: number, az: number, bx: number, bz: number): void =>
    b.box(Math.min(ax, bx) - 0.15, 0, Math.min(az, bz) - 0.15, Math.max(ax, bx) + 0.15, 1.6, Math.max(az, bz) + 0.15, WALL, { top: WALL_TOP });
  wall(c.wx0, c.wz0, c.wx1, c.wz0);
  wall(c.wx0, c.wz0 + 0.3, c.wx0, c.wz1);
  wall(c.wx0 + 0.3, c.wz1, c.xa - 0.4, c.wz1);
  wall(g + PIER_AT + 0.6, c.zf, c.wx1, c.zf);
  wall(c.wx1, c.wz0 + 0.3, c.wx1, c.zf - 0.3);

  // --- the assembly ground: the court behind the gate, with a stage against the main block and the flag in the middle ---
  b.box(g - 3.3, 0, c.bz + 0.02, g + 3.3, 0.6, c.bz + 1.7, 0xb7ae9c, { top: 0x9a3f36, faces: 'ESWT' });
  for (const s of [-1, 1]) b.box(g + s * 3.3 - (s < 0 ? 0.6 : 0), 0, c.bz + 0.5, g + s * 3.3 + (s > 0 ? 0.6 : 0), 0.3, c.bz + 1.4, 0xb7ae9c);
  b.box(g - 0.28, 0.6, c.bz + 0.95, g + 0.28, 1.62, c.bz + 1.3, WOOD);
  const fz = c.bz + 4.1;
  b.cyl(g, fz, 0, 0.3, 0.9, 0.9, 8, PIER);
  tiranga(b, g, fz, 0.3, 9.0, 3.0, 2.0);
  // the lines its classes stand along
  for (const dx of [-4.2, -2.9, -1.6, 1.6, 2.9, 4.2]) area(k, rect(g + dx - 0.05, c.bz + 2.3, g + dx + 0.05, c.bz + 5.9), 0xc7bfad, PAINT);

  // --- the football ground, west of the court ---
  const fx0 = c.wx0 + 0.5, fx1 = cx0 - 1.0, fz0 = c.bz + 0.7, fz1 = c.zf - 1.2, fxm = (fx0 + fx1) / 2, fzm = (fz0 + fz1) / 2, lw = 0.07;
  area(k, rect(fx0 - 0.3, fz0 - 0.3, fx1 + 0.3, fz1 + 0.3), TURF, LAID);
  const mark = (x0: number, z0: number, x1: number, z1: number): void => area(k, rect(Math.min(x0, x1) - lw, Math.min(z0, z1) - lw, Math.max(x0, x1) + lw, Math.max(z0, z1) + lw), LINE, PAINT);
  mark(fx0, fz0, fx1, fz0); mark(fx0, fz1, fx1, fz1); mark(fx0, fz0, fx0, fz1); mark(fx1, fz0, fx1, fz1); mark(fxm, fz0, fxm, fz1);
  for (let i = 0; i < 10; i++) {
    // the circle in the middle, as ten short lines
    const a0 = (i / 10) * Math.PI * 2, a1 = ((i + 1) / 10) * Math.PI * 2, r0 = 1.25 - lw, r1 = 1.25 + lw;
    area(k, [[fxm + Math.cos(a0) * r0, fzm + Math.sin(a0) * r0], [fxm + Math.cos(a0) * r1, fzm + Math.sin(a0) * r1], [fxm + Math.cos(a1) * r1, fzm + Math.sin(a1) * r1], [fxm + Math.cos(a1) * r0, fzm + Math.sin(a1) * r0]], LINE, PAINT);
  }
  for (const s of [-1, 1]) {
    const gx = s < 0 ? fx0 : fx1, inx = gx - s * 1.7;
    // the box before each goal, and the goal: two posts, a bar, and two stays behind
    mark(inx, fzm - 2.2, inx, fzm + 2.2); mark(gx, fzm - 2.2, inx, fzm - 2.2); mark(gx, fzm + 2.2, inx, fzm + 2.2);
    for (const dz of [-1.1, 1.1]) {
      b.box(gx - 0.06, 0, fzm + dz - 0.06, gx + 0.06, 1.3, fzm + dz + 0.06, WHITE, { faces: 'NESW' });
      b.beam([gx, 1.3, fzm + dz], [gx + s * 0.7, 0.05, fzm + dz], 0.045, 0.045, WHITE);
    }
    b.box(gx - 0.06, 1.24, fzm - 1.16, gx + 0.06, 1.36, fzm + 1.16, WHITE, { faces: 'NESWTB' });
  }
  b.cyl(fxm + 1.6, fzm - 0.9, 0.03, 0.4, 0.2, 0.2, 6, WHITE);
  for (const [dx, dz] of [[1.0, -0.5], [2.6, 0.9], [-1.8, 0.4], [-3.6, -1.5]]) pupil(b, fxm + dx, fzm + dz);
  mast(k, fx0 + 0.3, fz0 - 0.35, 7.5, '#f2f6ff', 16);

  // --- the pool, in the corner by the road: blue inside a raised rim, with two ropes down its length ---
  const px0 = c.wx0 + 0.5, px1 = c.xa - 1.7, pz0 = fz1 + 0.75, pz1 = c.wz1 - 0.5, rim = 0.36, TILE = 0xdde6ea;
  b.box(px0, 0, pz0, px1, 0.5, pz0 + rim, TILE);
  b.box(px0, 0, pz1 - rim, px1, 0.5, pz1, TILE);
  b.box(px0, 0, pz0 + rim, px0 + rim, 0.5, pz1 - rim, TILE);
  b.box(px1 - rim, 0, pz0 + rim, px1, 0.5, pz1 - rim, TILE);
  b.box(px0 + rim, 0, pz0 + rim, px1 - rim, 0.38, pz1 - rim, 0x3aa7dc, { faces: 'T' });
  for (const f of [1 / 3, 2 / 3]) {
    const z = pz0 + rim + (pz1 - pz0 - 2 * rim) * f;
    b.box(px0 + rim, 0.38, z - 0.035, px1 - rim, 0.43, z + 0.035, 0xf2efe6, { faces: 'NST' });
  }
  for (const [fx, fzz, cap] of [[0.3, 0.17, 0xd8432b], [0.62, 0.5, 0xf2c14e]]) {
    // two swimmers: a head in a cap
    const x = px0 + (px1 - px0) * fx, z = pz0 + rim + (pz1 - pz0 - 2 * rim) * fzz;
    b.box(x - 0.17, 0.38, z - 0.17, x + 0.17, 0.66, z + 0.17, 0xe8c4a0, { top: cap });
  }

  // --- the bus bay: three stands side by side before the wing, and the school's buses nose to the east wall, yellow and white ---
  area(k, rect(c.bayX, c.bz - 2.5 + 0.02, c.wx1 - 0.15, c.zf - 0.15), ASPHALT, LAID);
  const rows = [c.zf - 2.3, c.zf - 5.8, c.zf - 9.3];
  rows.forEach((z, i) => {
    schoolBus(k, c.busX, z, 0, [BUS_YELLOW, BUS_WHITE, BUS_YELLOW][i], i === 0 ? 'right' : i === rows.length - 1 ? 'left' : 'none');
    area(k, rect(c.bayX + 0.2, z - 1.82, c.wx1 - 0.6, z - 1.68), LINE, PAINT);
  });
  k.lights.push({ x: c.busX, z: rows[1], r: 13, color: '#ffe2ae', k: 0.55 }, { x: g, z: fz, r: 12, color: '#ffe9c4', k: 0.5 });
}

/** Going-home time: pupils at the gate, an ice-lolly cart, a parent's car on the verge, and trees. */
function schoolLife(k: Build, c: Campus): void {
  const b = k.b, g = c.gate, zf = c.zf, BAGS = [0xd8432b, 0x2a6fb0, 0xf2c14e, 0x7a3fa0, 0xe8862a];
  // pupils on the forecourt: before the gate, in a queue at the ice-lolly cart, and by the pier
  const stand: [number, number][] = [
    [-3.2, 1.2], [-2.1, 1.6], [-1.0, 1.15], [0.1, 1.7], [1.1, 1.2], [2.3, 1.0], [2.05, 2.55], [1.2, 2.75], [0.3, 2.95], [4.5, 1.1], [5.9, 2.4], [6.3, 3.1],
  ];
  stand.forEach(([dx, dz], i) => {
    clearOfStreets(k, 'a pupil at the school\'s gate', g + dx - 0.5, zf + dz - 0.5, g + dx + 0.5, zf + dz + 0.5);
    pupil(b, g + dx, zf + dz, i % 3 === 2 ? undefined : BAGS[i % BAGS.length]);
  });
  // pupils walking to the buses, others crossing the court from the main block, and a teacher who sees them off
  for (const [dx, dz] of [[0.6, -3.4], [0.9, -5.2], [1.6, -6.9], [0.5, -8.3]]) pupil(b, c.bayX + dx - 1.6, zf + dz, BAGS[Math.round(dx * 10) % BAGS.length]);
  for (const [dx, dz] of [[-3.6, -3.1], [-2.5, -4.4], [-1.2, -3.3], [-4.3, -5.6], [1.6, -3.3], [2.6, -4.6]]) pupil(b, g + dx, zf + dz, BAGS[Math.round(dx * 10 + 50) % BAGS.length]);
  figure(b, c.bayX - 2.2, zf - 6.1, 0, { coat: 0xb8327a, legs: 0xb8327a, hat: HAIR, hatH: 0.16 });
  // and the man who keeps the gate, in a cap, at its east end
  figure(b, g + HW - 1.6, zf - 0.9, 0, { coat: 0x5d6f8a, legs: 0x2f3742, hat: 0x2f3742, hatH: 0.22 });

  // the ice-lolly cart, before the gate: an insulated box on wheels under a parasol, and the man who sells from it
  const lx = g + 3.4, lz = zf + 2.35;
  b.box(lx - 0.85, 0.5, lz - 0.5, lx + 0.85, 1.35, lz + 0.5, 0xf4f1e8, { faces: 'NESWTB', top: 0x2a6fb0 });
  b.box(lx - 0.87, 0.5, lz - 0.52, lx + 0.87, 0.72, lz + 0.52, 0x2a6fb0, { faces: 'NESW' });
  for (const dx of [-0.5, 0.5]) wheel(b, lx + dx, 0.3, lz + 0.56, 0.3, 0.05, 1);
  b.box(lx + 0.85, 0.95, lz - 0.04, lx + 1.3, 1.03, lz + 0.04, STEEL, { faces: 'NESWTB' });
  b.cyl(lx - 0.35, lz - 0.2, 1.35, 3.0, 0.05, 0.05, 4, 0x8d8a83, { cap: false });
  b.cyl(lx - 0.35, lz - 0.2, 2.75, 3.3, 1.35, 0.06, 8, 0xd8432b, { cap: false });
  for (let i = 0; i < 8; i++) {
    // the parasol's inside, which a low view looks up into
    const a0 = ((i + 0.5) / 8) * Math.PI * 2, a1 = ((i + 1.5) / 8) * Math.PI * 2, am = (a0 + a1) / 2;
    tri(b, [lx - 0.35, 3.28, lz - 0.2], [lx - 0.35 + Math.cos(a0) * 1.33, 2.75, lz - 0.2 + Math.sin(a0) * 1.33], [lx - 0.35 + Math.cos(a1) * 1.33, 2.75, lz - 0.2 + Math.sin(a1) * 1.33], [-Math.cos(am) * 0.38, -0.92, -Math.sin(am) * 0.38], 0xb8382a);
  }
  k.sign('south-west-ice-lolly', lx, 1.04, lz + 0.53, 0, 1, 0.42, 1.6);
  figure(b, lx + 1.55, lz, 0, { coat: 0x7fa8c9, legs: 0x4a4f58, hat: 0xf4f1e8, hatH: 0.16 });
  clearOfStreets(k, 'the ice-lolly cart', lx - 1, lz - 0.7, lx + 2, lz + 0.7);

  // a parent's car on the verge, east of the gate
  const carX = c.x1 - 3.5, carZ = zf + 1.95;
  standingCar(k, carX, carZ, Math.PI, { body: 0xf2f0ea });
  clearOfStreets(k, 'a parent\'s car on the school\'s verge', carX - 3.5, carZ - 1.5, carX + 3.5, carZ + 1.5);

  // big leafy trees: one beside the gate, behind the railings where the boundary steps out to the road, and one before the main block
  k.tree(c.xa - 0.85, zf + 1.7, 0.8);
  k.tree(g - HW + 0.7, c.bz + 1.5, 0.82);
  // and a row of young ones behind the blocks, along the north wall
  for (let x = c.x0 + 6; x < c.x1 - 2; x += 5.2) k.tree(x, c.wz0 + 0.75, 0.36);
}

function dps(k: Build, t: Thing): void {
  const c = campusOf(t);
  schoolGrounds(k, c);
  schoolBlocks(k, t, c);
  schoolGate(k, c);
  schoolLife(k, c);
}

// ---------------------------------------------------------------------------
// Hauz Khas: the royal tank, Firoz Shah's tomb at its corner, the two arms of
// his madrasa along the water, and the village behind them
// ---------------------------------------------------------------------------
//
// On this tile Hauz Khas is turned half round from life, so that the tank lies
// towards the south-east and the monuments are seen across the water. The
// tomb stands at the tank's north-west corner, one arm of the madrasa runs
// east from it and the other south. Turned with everything else, the tomb's
// own entrance, with its court of stone railings, looks north, away from the
// tank, as in life it looks south, away from it.

/** Weathered lime plaster, on the domes. */
const LIME = 0xcbc3b1;

/** The round a duck and her ducklings swim: an oval in the open water of the tank, clear of the steps on every side. */
function duckRound(): { x: number; z: number; rx: number; rz: number } {
  const [x0, z0, x1, z1] = WATERS['hauz-khas'].at;
  return { x: (x0 + x1) / 2 + 1.2, z: (z0 + z1) / 2 + 1.1, rx: (x1 - x0) * 0.24, rz: (z1 - z0) * 0.19 };
}

/**
 * One arm of the madrasa, built along x from 0 to `len` and stood in its
 * place with `placed`. Its face to the tank is at z = 0, and `side` says which
 * way that face looks: 1 towards +z, -1 towards -z. It is `deep` from that
 * face to its garden side. Two storeys of arches, a string course between
 * them, an eave, small domes along the roof at `domes`, balconies over the
 * water at `balconies`, and a pavilion with a domed kiosk at its far end.
 */
function madrasaArm(k: Build, len: number, deep: number, side: 1 | -1, domes: number[], balconies: number[]): void {
  const b = k.b, H = 5.4, roof = H + 0.5, zg = -side * deep, z0 = Math.min(0, zg), z1 = Math.max(0, zg), zm = (z0 + z1) / 2;
  const tank: Facing = side > 0 ? 'S' : 'N', garden: Facing = side > 0 ? 'N' : 'S', pav = 3.3, run = len - pav;
  // the range, from below the water to its parapet, with a string course between its storeys and an eave under the parapet
  b.box(0, -1.5, z0, len, roof, z1, RUBBLE, { top: RUBBLE_LIGHT });
  b.box(0, 2.55, z0 - 0.1, run, 2.8, z1 + 0.1, RUBBLE_LIGHT, { faces: 'NSTB' });
  b.box(0, H - 0.16, z0 - 0.32, run, H, z1 + 0.32, RUBBLE_LIGHT, { faces: 'NSTB' });
  const n = Math.max(1, Math.round(run / 2.5));
  // (the arches are dark by day, and at night glow as if lamps stood in them)
  arcade(b, tank, 0, 0.3, run - 0.2, 0.25, n, 2.05, RECESS, { lit: 3.2 });
  arcade(b, tank, 0, 0.3, run - 0.2, 3.1, n * 2, 1.55, RECESS, { lit: 2.0 });
  arcade(b, garden, zg, 0.3, run - 0.2, 0.25, n, 2.05, RECESS, { lit: 1.4 });
  // (plain openings above, on the side away from the water)
  for (let i = 0; i < n; i++) slot(b, garden, zg, 0.3 + ((i + 0.5) * (run - 0.5)) / n, 3.35, 0.8, 1.15, RECESS);
  // balconies over the water: a floor on its bracket, a low front, and a small roof
  for (const x of balconies) {
    const a = Math.min(0, side * 0.62), c = Math.max(0, side * 0.62);
    b.box(x - 0.8, 2.82, a, x + 0.8, 3.0, c, RUBBLE_LIGHT, { faces: 'NESWTB' });
    b.box(x - 0.72, 3.0, a + 0.06, x + 0.72, 3.55, c - 0.06, RUBBLE, { faces: 'NESW' });
    b.box(x - 0.9, 4.72, Math.min(0, side * 0.75), x + 0.9, 4.86, Math.max(0, side * 0.75), RUBBLE_LIGHT, { faces: 'NESWTB' });
  }
  // small shallow domes along the roof, each on a low drum
  for (const x of domes) {
    b.cyl(x, zm, roof, roof + 0.26, 1.22, 1.22, 8, RUBBLE_LIGHT, { cap: false });
    lathe(b, x, zm, [[1.14, roof + 0.26], [1.02, roof + 0.62], [0.66, roof + 0.98], [0.04, roof + 1.2]], 8, LIME);
  }
  // the pavilion at the end: a tower a little proud of the range, an arch and a balcony towards the water, and a domed kiosk on its roof
  const px0 = run, px1 = len + 0.25, pz0 = z0 - 0.25, pz1 = z1 + 0.25, ptop = roof + 0.25, pm = (px0 + px1) / 2, face = side > 0 ? pz1 : pz0;
  b.box(px0, -1.5, pz0, px1, ptop, pz1, RUBBLE, { top: RUBBLE_LIGHT });
  b.box(px0 - 0.1, ptop - 0.3, pz0 - 0.1, px1 + 0.1, ptop - 0.12, pz1 + 0.1, RUBBLE_LIGHT, { faces: 'NESWTB' });
  niche(b, tank, face, pm, 0.25, 1.7, 2.4, RECESS, { lit: 3.4 });
  niche(b, tank, face, pm, 3.15, 1.2, 1.7, RECESS, { lit: 2.2 });
  niche(b, 'E', px1, zm, 0.25, 1.6, 2.3, RECESS, { lit: 2.2 });
  niche(b, garden, side > 0 ? pz0 : pz1, pm, 0.25, 1.6, 2.3, RECESS, { lit: 1.4 });
  chhatri(b, pm, ptop, zm, 0.98, 1.0, RUBBLE_LIGHT, LIME, { kind: 'round' });
}

/** Firoz Shah's tomb: square, with thick walls of rubble that lean in, a band of red stone and battlements at their head, and a shallow dome on an eight-sided drum. */
function firozShahsTomb(k: Build, t: Thing, tankZ: number): void {
  const b = k.b, cx = t.x + t.w / 2, cz = t.z + t.d / 2, half = t.w / 2 - 0.05, lean = 0.35, yw = t.h * 0.6, hw = half - lean;
  // the walls go down past the ground on the side of the tank, where the ground falls away to the water
  b.cyl(cx, cz, -1.2, yw, (half + (lean * 1.2) / yw) * Math.SQRT2, hw * Math.SQRT2, 4, RUBBLE, { phase: Math.PI / 4, cap: false });
  b.box(cx - hw - 0.1, yw, cz - hw - 0.1, cx + hw + 0.1, yw + 0.35, cz + hw + 0.1, RED, { faces: 'NESWTB', top: RUBBLE_LIGHT });
  const m = hw + 0.1, row = { step: 1.55, h: 0.5 };
  merlons(b, cx - m, cz - m, cx + m, cz - m + 0.28, yw + 0.35, RUBBLE_LIGHT, row);
  merlons(b, cx - m, cz + m - 0.28, cx + m, cz + m, yw + 0.35, RUBBLE_LIGHT, row);
  merlons(b, cx - m, cz - m + 0.28, cx - m + 0.28, cz + m - 0.28, yw + 0.35, RUBBLE_LIGHT, row);
  merlons(b, cx + m - 0.28, cz - m + 0.28, cx + m, cz + m - 0.28, yw + 0.35, RUBBLE_LIGHT, row);
  b.cyl(cx, cz, yw + 0.35, yw + 1.15, 2.95, 2.95, 8, RUBBLE_LIGHT, { cap: false });
  b.cyl(cx, cz, yw + 1.15, yw + 1.3, 3.06, 3.06, 8, RED, { cap: RUBBLE_LIGHT });
  const r = 2.85, tall = (t.h - 0.55 - (yw + 1.3)) / (0.67 * r);
  const crown = dome(b, cx, yw + 1.3, cz, r, LIME, { kind: 'low', sides: 12, tall, finial: false });
  // a finial of plain stone
  b.cyl(cx, cz, crown - 0.06, crown + 0.26, 0.24, 0.16, 6, RUBBLE_LIGHT);
  b.cyl(cx, cz, crown + 0.26, t.h, 0.09, 0.02, 5, RUBBLE_LIGHT, { cap: false });

  /** A doorway: a frame of red stone that stands upright before the leaning wall, an arch in it, and the dark of the door. `a` is its middle along the wall. */
  const door = (f: Facing, a: number, w: number, h: number, lit: number): void => {
    const s = f === 'S' || f === 'E' ? 1 : -1, base = (f === 'N' || f === 'S' ? cz : cx) + s * half, out = base + s * 0.14, back = base - s * 0.5;
    if (f === 'N' || f === 'S') b.box(a - w / 2, 0, Math.min(out, back), a + w / 2, h, Math.max(out, back), RED, { faces: 'NESWT' });
    else b.box(Math.min(out, back), 0, a - w / 2, Math.max(out, back), h, a + w / 2, RED, { faces: 'NESWT' });
    niche(b, f, out, a, 0.2, w - 0.6, h - 0.55, RUBBLE_LIGHT);
    slot(b, f, out, a, 0.2, w - 1.3, h - 1.75, RECESS, { lit, proud: 0.09 });
  };
  // its entrance, to the north, and a second door to the west: both look away from the tank
  door('N', cx, 2.6, 4.1, 2.6);
  door('W', cz, 2.4, 3.9, 2.0);
  // towards the water, in the corner between the two arms, a door onto the steps that go down to the tank
  door('E', (tankZ + 0.3 + cz + half + 0.05) / 2, 2.0, 3.8, 3.0);
  // the court before the entrance, inside its low railing of stone
  const z0 = cz - half - 1.9, z1 = cz - half - 0.05, x0 = cx - 2.9, x1 = cx + 2.9;
  area(k, rect(x0, z0, x1, z1), 0xc9bfa9, LAID);
  b.box(x0, 0, z0, x0 + 0.16, 0.62, z1, RUBBLE_LIGHT);
  b.box(x1 - 0.16, 0, z0, x1, 0.62, z1, RUBBLE_LIGHT);
  b.box(x0 + 0.16, 0, z0, cx - 0.8, 0.62, z0 + 0.16, RUBBLE_LIGHT);
  b.box(cx + 0.8, 0, z0, x1 - 0.16, 0.62, z0 + 0.16, RUBBLE_LIGHT);
  k.lights.push({ x: cx, z: z0 - 0.5, r: 8, color: '#ffd9a0', k: 0.5 });
}

function hauzKhas(k: Build, t: Thing): void {
  const b = k.b, [gx0, , , gz1] = GROUNDS['hauz-khas'], [wx0, wz0, wx1, wz1] = WATERS['hauz-khas'].at;
  const cx = t.x + t.w / 2, cz = t.z + t.d / 2, half = t.w / 2;
  firozShahsTomb(k, t, wz0);

  // The two arms stand a little way into the tank, so that their walls rise from the water.
  // The one that runs east ends at the tank's east edge.
  const ex = cx + half - 0.4, ez = wz0 + 0.3, elen = wx1 - 0.3 - ex;
  placed(k, ex, ez, 0, (q) => madrasaArm(q, elen, 3.8, 1, [0.21, 0.44, 0.67].map((f) => f * elen), [0.325, 0.555].map((f) => f * elen)));
  // The one that runs south stops short of the tank's south edge, so that its pavilion is not hidden behind the Qutub Minar.
  const sx = wx0 + 0.3, sz = cz + half - 0.4, slen = wz1 - 1.6 - sz;
  placed(k, sx, sz, 90, (q) => madrasaArm(q, slen, 3.9, -1, [0.3 * slen], []));

  // --- the tank: stone edges, and steps down into the water ---
  const STEP = RUBBLE_LIGHT, deepY = -1.5;
  // broad steps from the east arm's arches down to the water, and the tomb's own steps in the corner
  steps(b, 'S', ez, ex + elen * 0.27, ex + elen * 0.61, -1.0, -0.1, 3, 0.55, STEP);
  steps(b, 'E', wx0, ez + 0.12, sz - 0.12, -1.0, -0.1, 3, 0.5, STEP);
  // two steps all along the south and the east sides, and round the corner south of the west arm
  const sEnd = sz + slen + 0.25;
  b.box(wx0, deepY, wz1 - 0.5, wx1, -0.3, wz1, STEP);
  b.box(wx0 + 0.5, deepY, wz1 - 1.0, wx1 - 0.5, -0.6, wz1 - 0.5, STEP);
  b.box(wx1 - 0.5, deepY, ez + 0.02, wx1, -0.3, wz1 - 0.5, STEP);
  b.box(wx1 - 1.0, deepY, ez + 0.02, wx1 - 0.5, -0.6, wz1 - 1.0, STEP);
  b.box(wx0, deepY, sEnd, wx0 + 0.5, -0.3, wz1 - 0.5, STEP);
  b.box(wx0 + 0.5, deepY, sEnd, wx0 + 1.0, -0.6, wz1 - 1.0, STEP);
  // the kerb of stone round the rim
  b.box(wx0 - 0.55, 0, wz1, wx1 + 0.55, 0.26, wz1 + 0.5, STEP);
  b.box(wx1, 0, ez + 0.3, wx1 + 0.55, 0.26, wz1, STEP);
  b.box(wx0 - 0.55, 0, sEnd + 0.05, wx0, 0.26, wz1, STEP);

  // --- ducks on the water: three by the steps, and one that swims round the tank with her ducklings in a line behind her ---
  const y = -0.93;
  const duck = (g: GeoBuilder, x: number, z: number, yaw: number, body: number, head: number): void => g.moved(x, 0, z, yaw, () => {
    g.box(-0.32, 0, -0.18, 0.3, 0.3, 0.18, body, { faces: 'NESWT' });
    g.box(0.14, 0.3, -0.1, 0.34, 0.58, 0.1, head, { faces: 'NESWT' });
    g.box(0.34, 0.38, -0.06, 0.5, 0.46, 0.06, 0xe8962a, { faces: 'NESWTB' });
  });
  const dx = ex + elen * 0.44, dz = ez + 3.4;
  b.moved(0, y, 0, 0, () => {
    duck(b, dx - 3.2, dz + 0.4, 0.5, 0x8a6a48, 0x2f6a4a);
    duck(b, dx - 4.3, dz + 1.5, 0.9, 0xf2efe6, 0xf2efe6);
    duck(b, dx + 3.6, dz + 0.2, 2.6, 0x8a6a48, 0x2f6a4a);
  });
  // (the family is a mesh of its own, built with its nose along x, and moved along the line in RAILS)
  const family = new GeoBuilder();
  duck(family, 0, 0, 0, 0x9a7650, 0x8a6a48);
  for (let i = 1; i <= 4; i++) {
    const qx = -0.3 - i * 0.6, qz = (i % 2 ? 0.07 : -0.07);
    family.box(qx - 0.15, 0, qz - 0.1, qx + 0.15, 0.2, qz + 0.1, 0xe9cf6a, { faces: 'NESWT' });
    family.box(qx + 0.08, 0.2, qz - 0.06, qx + 0.2, 0.34, qz + 0.06, 0xe9cf6a, { faces: 'NESWT' });
  }
  const swimmers = new THREE.Mesh(family.build(), k.mat.city());
  swimmers.castShadow = true;
  k.group.add(swimmers);
  const round = duckRound();
  let turn = 0.9;
  k.each((dt) => {
    turn += dt * 0.1;
    const c = Math.cos(turn), s = Math.sin(turn);
    swimmers.position.set(round.x + c * round.rx, y, round.z + s * round.rz);
    // she faces the way she swims: turning by -yaw points her nose along (cos yaw, sin yaw)
    swimmers.rotation.y = -Math.atan2(c * round.rz, -s * round.rx);
  });
  // people by the water, on the grass east and south of the tank, where they look across it at the monuments
  k.person(wx1 + 1.0, (ez + wz1) / 2 - 1.5);
  k.person(wx1 + 0.95, (ez + wz1) / 2 + 2.2);
  k.person((wx0 + wx1) / 2 + 2.4, wz1 + 0.76);
  k.person((wx0 + wx1) / 2 - 4.6, wz1 + 0.76);
  // trees in the garden's south-west corner, south of the village and west of the arm
  const rowEnd = sz + slen * 0.62;
  for (const [fx, fz, s] of [[0.2, 0.25, 0.62], [0.75, 0.5, 0.5], [0.3, 0.85, 0.55]]) k.tree(gx0 + 0.9 + (wx0 - 5.2 - gx0) * fx, rowEnd + 0.9 + (gz1 - 1.6 - rowEnd) * fz, s);

  // by night: lamps along the water, so that the walls stand lit and the arches are seen in the tank
  for (const f of [0.14, 0.42, 0.7, 0.94]) k.lights.push({ x: ex + elen * f, z: ez + 1.6, r: 9, color: '#ffcf8a', k: 0.8 });
  k.lights.push({ x: sx + 1.6, z: sz + slen * 0.55, r: 9, color: '#ffcf8a', k: 0.8 }, { x: wx0 + 1.2, z: ez + 1.2, r: 9, color: '#ffd9a0', k: 0.75 }, { x: t.x - 0.6, z: cz, r: 8, color: '#ffd9a0', k: 0.6 });

  // the village stands behind the monuments: north of the tomb's court, and in a row down the west edge as far as the west arm reaches
  village(k, t, cz - half - 1.95, rowEnd);
}

/** Houses of Hauz Khas Village: shops below, windows above. */
const VILLAGE: WinSpec = { cell: 1.3, storey: STOREY, lit: 0.5, kind: 2 };
const WHITEWASH = 0xf2efe6, BRICK = 0xb9654a, BRICK_LIGHT = 0xc98a6b, OCHRE = 0xe2c27a, FLAT_ROOF = 0xb8ad9a, BOARD_BACK = 0x2a2420;

/** A painted board on a wall that faces `f`, on a dark back that stands a little proud of the wall. `a` is its middle along the wall, and it is `w` wide and `h` high. */
function plate(k: Build, id: string, f: Facing, plane: number, a: number, y: number, h: number, w: number): void {
  const b = k.b, s = f === 'S' || f === 'E' ? 1 : -1, p0 = Math.min(plane, plane + s * 0.1), p1 = Math.max(plane, plane + s * 0.1);
  if (f === 'S' || f === 'N') {
    b.box(a - w / 2 - 0.08, y - h / 2 - 0.08, p0, a + w / 2 + 0.08, y + h / 2 + 0.08, p1, BOARD_BACK, { faces: 'NESWTB' });
    k.sign(id, a, y, plane + s * 0.13, 0, s, h, w);
  } else {
    b.box(p0, y - h / 2 - 0.08, a - w / 2 - 0.08, p1, y + h / 2 + 0.08, a + w / 2 + 0.08, BOARD_BACK, { faces: 'NESWTB' });
    k.sign(id, plane + s * 0.13, y, a, s, 0, h, w);
  }
}

/**
 * Hauz Khas Village: three and four storeys of white and brick houses pressed
 * together, with cafés on their roofs, strings of small lights, balconies and
 * hand-painted boards. `courtZ` is the north edge of the tomb's court, and
 * `rowEnd` how far south the row along the west edge runs.
 */
function village(k: Build, t: Thing, courtZ: number, rowEnd: number): void {
  const b = k.b, [gx0, gz0] = GROUNDS['hauz-khas'], S = STOREY, x0 = gx0 + 0.3, z0 = gz0 + 0.3;
  interface House { x0: number; z0: number; x1: number; z1: number; top: number }
  const WASH = [WHITEWASH, BRICK, OCHRE, WHITEWASH, BRICK_LIGHT, WHITEWASH, BRICK, WHITEWASH];
  const house = (hx0: number, hz0: number, hx1: number, hz1: number, floors: number, i: number): House => {
    b.box(hx0, 0, hz0, hx1, floors * S, hz1, WASH[i % WASH.length], { win: VILLAGE, seed: 0.11 + i * 0.17, top: FLAT_ROOF });
    return { x0: hx0, z0: hz0, x1: hx1, z1: hz1, top: floors * S };
  };
  // the block in the corner, north of the tomb's court: four houses side by side, as far east as Deer Park
  const nx1 = thing('deer-park').x - 0.4, nz1 = courtZ - 0.3, nw = nx1 - x0;
  const north = [0, 1, 2, 3].map((i) => house(x0 + [0, 0.24, 0.5, 0.74, 1][i] * nw, z0 + [0, 0.25, 0, 0.3][i], x0 + [0, 0.24, 0.5, 0.74, 1][i + 1] * nw, nz1 - [0.3, 0, 0.5, 0.1][i], [4, 3, 4, 3][i], i));
  // the row down the west edge, with a lane between it and the tomb
  const wx1 = t.x - 1.2, wz0 = courtZ + 0.2, wl = rowEnd - wz0;
  const west = [0, 1, 2, 3].map((i) => house(x0, wz0 + [0, 0.23, 0.5, 0.75, 1][i] * wl, wx1 - [0.2, 0, 0.35, 0.1][i], wz0 + [0, 0.23, 0.5, 0.75, 1][i + 1] * wl, [3, 4, 3, 3][i], i + 4));

  /** A café on a roof: a low wall towards the view, an awning on two posts, tables, people, and a string of small lights from pole to pole. */
  const cafe = (h: House, shade: number, bulbs: string[]): void => {
    const y = h.top, w = h.x1 - h.x0, d = h.z1 - h.z0;
    b.box(h.x0, y, h.z1 - 0.14, h.x1, y + 0.55, h.z1, WHITEWASH);
    b.box(h.x1 - 0.14, y, h.z0, h.x1, y + 0.55, h.z1 - 0.14, WHITEWASH);
    // the awning over the back of the roof
    for (const px of [h.x0 + 0.2, h.x1 - 0.3]) b.box(px - 0.05, y, h.z0 + d * 0.5 - 0.05, px + 0.05, y + 2.05, h.z0 + d * 0.5 + 0.05, PALE, { faces: 'NESW' });
    b.box(h.x0 + 0.05, y + 2.05, h.z0 + 0.1, h.x1 - 0.15, y + 2.17, h.z0 + d * 0.5 + 0.2, shade, { faces: 'NESWTB' });
    for (const [fx, fz] of [[0.3, 0.72], [0.7, 0.62]]) {
      b.box(h.x0 + w * fx - 0.36, y + 0.62, h.z0 + d * fz - 0.36, h.x0 + w * fx + 0.36, y + 0.74, h.z0 + d * fz + 0.36, WHITEWASH, { faces: 'NESWTB' });
      b.box(h.x0 + w * fx - 0.06, y, h.z0 + d * fz - 0.06, h.x0 + w * fx + 0.06, y + 0.62, h.z0 + d * fz + 0.06, PALE, { faces: 'NESW' });
    }
    k.person(h.x0 + w * 0.48, h.z0 + d * 0.8, y);
    k.person(h.x0 + w * 0.82, h.z0 + d * 0.45, y);
    k.person(h.x0 + w * 0.3, h.z0 + d * 0.3, y);
    // the lights: along the front, and back across the roof
    for (const [px, pz] of [[h.x0 + 0.1, h.z1 - 0.1], [h.x1 - 0.1, h.z1 - 0.1]]) b.box(px - 0.04, y, pz - 0.04, px + 0.04, y + 2.2, pz + 0.04, PALE, { faces: 'NESW' });
    const n = Math.max(3, Math.round(w / 0.5));
    for (let i = 0; i <= n; i++) k.glows.push({ x: h.x0 + 0.1 + ((w - 0.2) * i) / n, y: y + 2.2 - Math.sin((i / n) * Math.PI) * 0.35, z: h.z1 - 0.1, sx: 0.14, sy: 0.14, sz: 0.14, color: bulbs[i % bulbs.length] });
    const m = Math.max(3, Math.round(d / 0.55));
    for (let i = 1; i <= m; i++) k.glows.push({ x: h.x1 - 0.1, y: y + 2.2 - Math.sin((i / m) * Math.PI) * 0.35, z: h.z1 - 0.1 - ((d - 0.4) * i) / m, sx: 0.14, sy: 0.14, sz: 0.14, color: bulbs[(i + 1) % bulbs.length] });
  };
  /** A balcony on a wall that faces south or east: a floor with its underside, and a rail. `a` is its middle along the wall. */
  const balcony = (f: 'S' | 'E', plane: number, a: number, y: number, w: number): void => {
    if (f === 'S') {
      b.box(a - w / 2, y - 0.14, plane, a + w / 2, y, plane + 0.7, 0xd9d2c2, { faces: 'ESWTB' });
      b.box(a - w / 2, y + 0.75, plane + 0.62, a + w / 2, y + 0.87, plane + 0.7, 0x3a3d42, { faces: 'NSTB' });
    } else {
      b.box(plane, y - 0.14, a - w / 2, plane + 0.7, y, a + w / 2, 0xd9d2c2, { faces: 'NESTB' });
      b.box(plane + 0.62, y + 0.75, a - w / 2, plane + 0.7, y + 0.87, a + w / 2, 0x3a3d42, { faces: 'EWTB' });
    }
  };
  /** A black water tank on a roof. */
  const tank = (x: number, z: number, y: number): void => b.cyl(x, z, y, y + 1.05, 0.55, 0.55, 6, 0x1e2023, { cap: 0x2b2e33 });

  const WARM = ['#ffd98a', '#ffe9b8', '#ffc46a'], PARTY = ['#ffd98a', '#ff9ccb', '#9be7ff', '#ffe9b8'];
  cafe(north[1], 0xc8402f, WARM);
  cafe(north[3], 0x2a6fb0, PARTY);
  cafe(west[2], 0xf2c14e, PARTY);
  cafe(west[3], 0x2f8f6f, WARM);
  for (const h of [north[0], north[2], west[1]]) {
    tank(h.x0 + 0.9, h.z0 + 0.9, h.top);
    tank(h.x0 + 0.9, h.z0 + 2.2, h.top);
  }
  balcony('S', north[0].z1, (north[0].x0 + north[0].x1) / 2, 3 * S, 1.8);
  balcony('S', north[2].z1, (north[2].x0 + north[2].x1) / 2, 3 * S, 1.7);
  balcony('S', north[2].z1, (north[2].x0 + north[2].x1) / 2, 2 * S, 1.7);
  balcony('E', west[1].x1, (west[1].z0 + west[1].z1) / 2, 3 * S, 2.0);
  balcony('E', west[1].x1, (west[1].z0 + west[1].z1) / 2, 2 * S, 2.0);
  balcony('E', west[0].x1, (west[0].z0 + west[0].z1) / 2, 2 * S, 1.8);

  // hand-painted boards that say what is there, high enough to be read over the monuments
  plate(k, 'south-west-cafe', 'S', west[3].z1, (west[3].x0 + west[3].x1) / 2, 2 * S + 1.6, 0.95, 2.3);
  plate(k, 'south-west-boutique', 'S', north[1].z1, (north[1].x0 + north[1].x1) / 2, 2 * S + 1.75, 0.62, 2.6);
  plate(k, 'south-west-gallery', 'S', north[3].z1, (north[3].x0 + north[3].x1) / 2, 2 * S + 1.7, 0.68, 2.6);
  k.lights.push({ x: t.x - 0.6, z: (wz0 + rowEnd) / 2, r: 9, color: '#ffd9a0', k: 0.6 }, { x: (x0 + nx1) / 2, z: nz1 + 0.8, r: 10, color: '#ffd9a0', k: 0.6 });
}

// ---------------------------------------------------------------------------
// R. K. Puram: a block of government flats, and gully cricket in the colony park
// ---------------------------------------------------------------------------

const FLAT_CREAM = 0xeadcb6, PLINTH = 0x9c5a44, GALLERY = 0xd9cfae;
const FLAT_WIN: WinSpec = { cell: 1.9, storey: STOREY, lit: 0.5, kind: 0 };

/** A boy at play, in a shirt of some colour and shorts. */
const boy = (b: GeoBuilder, x: number, z: number, shirt: number, shorts = 0x3a4a6a): void => child(b, x, z, shirt, shorts, 0.76);

function rkPuram(k: Build, t: Thing): void {
  const b = k.b, [gx0, , gx1, gz1] = GROUNDS['rk-puram'], S = STOREY;
  // --- the flats: two storeys in cream, a gallery along the upper floor, and the stair up to it outside ---
  const x0 = t.x + 0.5, x1 = t.x + t.w - 0.5, z0 = t.z + 0.5, z1 = t.z + t.d - 2.4, top = t.h, gz = z1 + 1.15;
  b.box(x0, 0, z0, x1, top, z1, FLAT_CREAM, { win: FLAT_WIN, seed: 0.23 });
  b.box(x0 - 0.07, 0, z0 - 0.07, x1 + 0.07, 0.55, z1 + 0.07, PLINTH, { faces: 'NESW' });
  b.box(x0 - 0.08, top - 0.3, z0 - 0.08, x1 + 0.08, top + 0.42, z1 + 0.08, 0xdccda2, { top: FLAT_ROOF });
  b.box(x0, S - 0.18, z1, x1, S, gz, GALLERY, { faces: 'ESWTB' });
  for (const dx of [1.3, 4.9]) for (const y of [0.02, S]) b.box(x0 + dx, y, z1, x0 + dx + 0.95, y + 2.35, z1 + 0.09, 0x5a4636, { faces: 'ESW' });
  // the stair: one flight along the front, from the ground in the east up to a landing at the gallery's west end
  const sx0 = x0 + 0.95, sx1 = x0 + 4.7, sz = gz + 0.5;
  b.box(x0, S - 0.18, gz, sx0, S, gz + 1.0, GALLERY, { faces: 'NESWTB' });
  slab(b, [sx1, 0.04, sz], [sx0, S, sz], 0.46, 0.26, GALLERY, { under: 0xb9ae8c });
  b.beam([sx1, 0.95, gz + 0.98], [sx0, S + 0.9, gz + 0.98], 0.045, 0.045, 0xcfc6b0);
  b.box(x0 + 0.1, 0, gz + 0.85, x0 + 0.24, S - 0.18, gz + 0.99, GALLERY, { faces: 'NESW' });
  // the gallery's rail, with the day's washing hung over it
  b.box(sx0, S + 0.84, gz - 0.08, x1, S + 0.96, gz, 0xcfc6b0, { faces: 'NSTB' });
  for (let x = sx0; x <= x1 + 0.01; x += (x1 - sx0) / 4) b.box(x - 0.05, S, gz - 0.09, x + 0.05, S + 0.84, gz + 0.01, 0xcfc6b0, { faces: 'NESW' });
  [0xc8202c, 0xf2c14e, 0x2a6fb0, 0xf4f1e8, 0x7a3fa0].forEach((color, i) => {
    const x = sx0 + 0.5 + i * 0.86;
    b.box(x, S + 0.1 + (i % 2) * 0.22, gz + 0.01, x + 0.6, S + 0.95, gz + 0.05, color, { faces: 'ESW' });
  });
  // a desert cooler in one window
  b.box(x1, S + 1.0, z0 + 2.0, x1 + 0.55, S + 2.1, z0 + 3.1, 0x9aa3a8, { faces: 'NESTB' });
  // on the roof: water tanks, and a line of washing between two poles
  const ry = top + 0.42;
  for (const dx of [1.0, 5.6]) {
    b.box(x0 + dx - 0.5, ry, z0 + 0.7, x0 + dx + 0.5, ry + 0.3, z0 + 1.7, 0x8a8478);
    b.cyl(x0 + dx, z0 + 1.2, ry + 0.3, ry + 1.4, 0.55, 0.55, 8, 0x1e2023, { cap: 0x2b2e33 });
  }
  const lz = z1 - 1.1, la = x0 + 1.0, lb = x1 - 1.0;
  for (const x of [la, lb]) b.box(x - 0.05, ry, lz - 0.05, x + 0.05, ry + 1.75, lz + 0.05, 0xcfc6b0, { faces: 'NESW' });
  b.beam([la, ry + 1.7, lz], [lb, ry + 1.7, lz], 0.025, 0.025, 0xe6e2d6);
  [0xf4f1e8, 0xd8432b, 0x2f8f6f, 0xf2c14e, 0x2a6fb0, 0xf4f1e8, 0xe8862a].forEach((color, i) => {
    const x = la + 0.4 + i * ((lb - la - 1.2) / 6);
    b.box(x, ry + 0.75 + (i % 3) * 0.12, lz - 0.02, x + 0.52, ry + 1.68, lz + 0.02, color, { faces: 'NS' });
  });
  // scooters by the stair's foot
  twoWheeler(b, sx1 + 1.0, gz + 0.7, 0.3, 0x2a6fb0, true);
  twoWheeler(b, sx1 + 1.9, gz + 1.0, -0.4, 0xc8402f, true);
  k.person(x0 + 3.2, gz - 0.55, S);
  k.lights.push({ x: (x0 + x1) / 2, z: gz + 1.5, r: 10, color: '#ffe2ae', k: 0.55 });

  // --- the colony park, south of the flats: a low rail round it, and a verge along the road ---
  const px0 = gx0 + 0.45, px1 = gx1 - 0.45, pz0 = t.z + t.d + 0.4, pz1 = gz1 - 3.9, RAIL = 0xc9cfc6;
  area(k, rect(gx0, pz1 + 0.3, gx1, gz1), PAVING, LAID);
  for (const [ax, az, cx, cz] of [[px0, pz0, px0, pz1], [px0, pz1, px1, pz1], [px1, pz0, px1, pz1]]) {
    b.box(Math.min(ax, cx) - 0.05, 0.55, Math.min(az, cz) - 0.05, Math.max(ax, cx) + 0.05, 0.68, Math.max(az, cz) + 0.05, RAIL, { faces: 'NESWTB' });
  }
  for (let z = pz0; z <= pz1 + 0.01; z += (pz1 - pz0) / 4) for (const x of [px0, px1]) b.box(x - 0.07, 0, z - 0.07, x + 0.07, 0.72, z + 0.07, RAIL, { faces: 'NESWT' });
  for (const f of [0.33, 0.67]) b.box(px0 + (px1 - px0) * f - 0.07, 0, pz1 - 0.07, px0 + (px1 - px0) * f + 0.07, 0.72, pz1 + 0.07, RAIL, { faces: 'NESWT' });
  standingCar(k, (gx0 + gx1) / 2 + 0.5, gz1 - 1.65, 0, { body: 0xb5483a });
  clearOfStreets(k, 'a parent\'s car on the verge by the colony park', (gx0 + gx1) / 2 - 3, gz1 - 3.2, (gx0 + gx1) / 2 + 4, gz1 - 0.1);
  // the colony's board at the park's corner, on two posts, facing the road
  const nbx = px1 - 1.45, nbz = pz1 + 0.2;
  for (const dx of [-0.95, 0.95]) b.box(nbx + dx - 0.06, 0, nbz - 0.06, nbx + dx + 0.06, 2.75, nbz + 0.06, 0x8d9498, { faces: 'NESW' });
  plate(k, 'south-west-rk-puram', 'S', nbz + 0.06, nbx, 2.25, 0.84, 2.18);

  // --- gully cricket: a worn pitch across the grass, bricks for stumps, eight boys, and the ball in the air ---
  const cz = pz0 + (pz1 - pz0) * 0.56, cx0 = px0 + 1.0, cx1 = px1 - 1.3, WILLOW = 0xd9b77a;
  area(k, rect(cx0, cz - 0.7, cx1, cz + 0.7), 0xbd9f6c, LAID);
  area(k, rect(cx1 - 1.5, cz - 0.55, cx1 - 0.3, cz + 0.55), 0xa98958, PAINT);
  area(k, rect(cx0 + 0.3, cz - 0.5, cx0 + 1.3, cz + 0.5), 0xa98958, PAINT);
  // the stumps: three bricks on end at the batsman's end, and one at the bowler's
  for (const dz of [-0.2, 0, 0.2]) b.box(cx1 - 0.2, 0, cz + dz - 0.085, cx1 - 0.02, 0.62, cz + dz + 0.085, 0xa8452f);
  b.box(cx0 + 0.3, 0, cz - 0.2, cx0 + 0.52, 0.2, cz + 0.2, 0xa8452f);
  boy(b, cx1 - 0.95, cz + 0.42, 0xd8432b);
  b.beam([cx1 - 1.2, 1.15, cz + 0.2], [cx1 - 1.85, 0.3, cz - 0.15], 0.07, 0.09, WILLOW);
  boy(b, cx1 + 0.75, cz + 0.1, 0x2a6fb0);
  boy(b, cx0 + 1.5, cz - 0.3, 0xf2c14e);
  boy(b, cx0 + 2.2, cz - 2.5, 0x4fa36b);
  boy(b, cx0 + 0.3, cz + 2.6, 0xf4f1e8);
  boy(b, cx1 - 2.0, cz + 2.9, 0xe8862a);
  boy(b, cx0 - 0.3, cz - 1.6, 0x7a3fa0);
  // the ball, hit high towards the bushes by the flats, and the eighth boy in among them, looking for the last one
  b.cyl(cx1 - 3.3, cz - 3.0, 3.3, 3.58, 0.15, 0.15, 6, 0xd9e04a, { cap: 0xd9e04a });
  const bx = px0 + (px1 - px0) * 0.55, bz = pz0 + 0.75;
  boy(b, bx, bz, 0x2f8f8f);
  for (const [dx, dz, s] of [[-0.75, 0.1, 0.3], [0.7, -0.05, 0.27], [0.05, 0.6, 0.22], [-1.6, -0.1, 0.26], [1.5, 0.2, 0.24]]) k.tree(bx + dx, bz + dz, s);
  k.tree(px1 - 1.0, pz0 + 0.9, 0.62);
  k.tree(px0 + 0.9, pz0 + 1.0, 0.5);
  // a bench by the rail
  b.box(px0 + 1.2, 0.42, pz1 - 0.95, px0 + 3.0, 0.52, pz1 - 0.45, WOOD, { faces: 'NESWTB' });
  for (const dx of [1.3, 2.8]) b.box(px0 + dx, 0, pz1 - 0.9, px0 + dx + 0.1, 0.42, pz1 - 0.5, 0x5d6168, { faces: 'NESW' });
}

// ---------------------------------------------------------------------------
// Deer Park: the wood beside the monuments
// ---------------------------------------------------------------------------

/** A spotted deer, its nose along (cos yaw, sin yaw): chestnut, with white spots along its back and flanks and a white tail. A stag carries antlers; a doe may graze. */
function deer(b: GeoBuilder, x: number, z: number, yaw: number, o: { stag?: boolean; graze?: boolean; s?: number } = {}): void {
  const s = o.s ?? 1, COAT = 0xb9773f, PALE_COAT = 0xf1e9d8, HORN = 0xd9cdb4;
  b.moved(x, 0, z, yaw, () => {
    const B = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: number, faces: string): void =>
      b.box(x0 * s, y0 * s, z0 * s, x1 * s, y1 * s, z1 * s, color, { faces });
    B(-0.62, 0.74, -0.21, 0.55, 1.22, 0.21, COAT, 'NESWTB');
    for (const lx of [-0.5, 0.42]) for (const lz of [-0.14, 0.14]) B(lx - 0.055, 0, lz - 0.055, lx + 0.055, 0.74, lz + 0.055, COAT, 'NESW');
    if (o.graze) {
      B(0.5, 0.42, -0.1, 0.74, 1.0, 0.1, COAT, 'NESWT');
      B(0.62, 0.18, -0.11, 1.04, 0.46, 0.11, COAT, 'NESWTB');
    } else {
      B(0.4, 1.1, -0.1, 0.64, 1.76, 0.1, COAT, 'NESW');
      B(0.46, 1.62, -0.12, 0.98, 1.92, 0.12, COAT, 'NESWTB');
    }
    B(-0.72, 0.9, -0.07, -0.62, 1.2, 0.07, PALE_COAT, 'NSWTB');
    // its spots: a row along the back, and a few on each flank
    for (const [sx, sz] of [[-0.42, -0.09], [-0.18, 0.08], [0.06, -0.07], [0.3, 0.09]]) B(sx - 0.055, 1.22, sz - 0.055, sx + 0.055, 1.232, sz + 0.055, PALE_COAT, 'T');
    for (const [sx, sy] of [[-0.35, 1.05], [-0.05, 0.95], [0.25, 1.08]]) {
      B(sx - 0.05, sy - 0.05, 0.21, sx + 0.05, sy + 0.05, 0.222, PALE_COAT, 'S');
      B(sx - 0.05, sy - 0.05, -0.222, sx + 0.05, sy + 0.05, -0.21, PALE_COAT, 'N');
    }
    if (o.stag) {
      for (const side of [-1, 1]) {
        b.beam([0.6 * s, 1.9 * s, side * 0.08 * s], [0.42 * s, 2.55 * s, side * 0.3 * s], 0.035, 0.03, HORN);
        b.beam([0.5 * s, 2.25 * s, side * 0.2 * s], [0.78 * s, 2.5 * s, side * 0.26 * s], 0.03, 0.02, HORN);
      }
    }
  });
}

/** A peacock with his train spread: he faces the way (cos yaw, sin yaw). */
function peacock(b: GeoBuilder, x: number, z: number, yaw: number): void {
  const BLUE = 0x1f4fb0, TRAIN = 0x2f9a6a, EYE = 0x1b3f9a, RING = 0xd9b24a, c = Math.cos(yaw), s = Math.sin(yaw);
  b.moved(x, 0, z, yaw, () => {
    b.box(-0.22, 0.42, -0.14, 0.2, 0.78, 0.14, BLUE, { faces: 'NESWTB' });
    b.box(0.1, 0.78, -0.06, 0.22, 1.3, 0.06, BLUE, { faces: 'NESW' });
    b.box(0.08, 1.3, -0.08, 0.34, 1.5, 0.08, BLUE, { faces: 'NESWTB' });
    b.box(0.34, 1.36, -0.03, 0.46, 1.42, 0.03, 0xd9cdb4, { faces: 'NESWTB' });
    for (const lz of [-0.07, 0.07]) b.box(-0.03, 0, lz - 0.025, 0.03, 0.42, lz + 0.025, 0x8a7a66, { faces: 'NESW' });
  });
  // the train: a fan of seven feathers behind him, with an eye near the tip of each
  const at = (u: number, v: number, d: number): V3 => [x - c * (0.2 + d) - s * u, 0.6 + v, z - s * (0.2 + d) + c * u];
  const n: V3 = [c, 0, s], hub = at(0, 0, 0), R = 1.25;
  for (let i = 0; i < 7; i++) {
    const a0 = (-0.5 + i / 7) * Math.PI * 1.06 + Math.PI / 2 - Math.PI * 0.03, a1 = a0 + (Math.PI * 1.06) / 7, am = (a0 + a1) / 2;
    const p0 = at(Math.cos(a0) * R, Math.sin(a0) * R, 0), p1 = at(Math.cos(a1) * R, Math.sin(a1) * R, 0);
    tri(b, hub, p0, p1, n, i % 2 ? TRAIN : 0x278a5c);
    tri(b, hub, p0, p1, [-c, 0, -s], 0x5d7a4a);
    const e = (r: number, w: number, d: number): V3[] => [at(Math.cos(am) * (R * 0.8 - r) - Math.sin(am) * w, Math.sin(am) * (R * 0.8 - r) + Math.cos(am) * w, d), at(Math.cos(am) * (R * 0.8 + r) - Math.sin(am) * w, Math.sin(am) * (R * 0.8 + r) + Math.cos(am) * w, d), at(Math.cos(am) * (R * 0.8 + r) + Math.sin(am) * w, Math.sin(am) * (R * 0.8 + r) - Math.cos(am) * w, d), at(Math.cos(am) * (R * 0.8 - r) + Math.sin(am) * w, Math.sin(am) * (R * 0.8 - r) - Math.cos(am) * w, d)];
    const ring = e(0.13, 0.11, -0.012), eye = e(0.075, 0.06, -0.024);
    b.quad(ring[0], ring[1], ring[2], ring[3], n, RING);
    b.quad(eye[0], eye[1], eye[2], eye[3], n, EYE);
  }
}

function deerPark(k: Build, t: Thing): void {
  const b = k.b, x0 = t.x, x1 = t.x + t.w, z0 = t.z, z1 = t.z + t.d, FENCE = 0xcfc8b2, PATH = 0xd9c9a2;
  // a path along its south side and up its east end, where people walk and run
  area(k, [[x0, z1 - 1.5], [x1 - 2.6, z1 - 1.5], [x1 - 2.6, z0 + 0.5], [x1 - 1.3, z0 + 0.5], [x1 - 1.3, z1 - 0.2], [x0, z1 - 0.2]], PATH, LAID);
  for (const [fx, fz] of [[0.12, 0.92], [0.2, 0.9], [0.46, 0.93], [0.61, 0.9], [0.9, 0.55], [0.905, 0.2]]) k.person(x0 + t.w * fx, z0 + t.d * fz);
  // the enclosure, behind a fence of posts and two rails
  const ex0 = x0 + 2.4, ex1 = x1 - 4.6, ez0 = z0 + 0.7, ez1 = z1 - 2.3;
  for (const y of [0.55, 1.1]) {
    b.box(ex0, y, ez0 - 0.035, ex1, y + 0.09, ez0 + 0.035, FENCE, { faces: 'NSTB' });
    b.box(ex0, y, ez1 - 0.035, ex1, y + 0.09, ez1 + 0.035, FENCE, { faces: 'NSTB' });
    b.box(ex0 - 0.035, y, ez0, ex0 + 0.035, y + 0.09, ez1, FENCE, { faces: 'EWTB' });
    b.box(ex1 - 0.035, y, ez0, ex1 + 0.035, y + 0.09, ez1, FENCE, { faces: 'EWTB' });
  }
  const nx = Math.round((ex1 - ex0) / 2.7), nz = Math.round((ez1 - ez0) / 2.5);
  for (let i = 0; i <= nx; i++) for (const z of [ez0, ez1]) b.box(ex0 + ((ex1 - ex0) * i) / nx - 0.07, 0, z - 0.07, ex0 + ((ex1 - ex0) * i) / nx + 0.07, 1.3, z + 0.07, FENCE, { faces: 'NESW' });
  for (let i = 1; i < nz; i++) for (const x of [ex0, ex1]) b.box(x - 0.07, 0, ez0 + ((ez1 - ez0) * i) / nz - 0.07, x + 0.07, 1.3, ez0 + ((ez1 - ez0) * i) / nz + 0.07, FENCE, { faces: 'NESW' });
  // the herd: a stag, does, one of them grazing, and a fawn
  const ew = ex1 - ex0, ed = ez1 - ez0;
  deer(b, ex0 + ew * 0.62, ez0 + ed * 0.52, 0.5, { stag: true, s: 1.12 });
  deer(b, ex0 + ew * 0.42, ez0 + ed * 0.72, 2.6, { graze: true });
  deer(b, ex0 + ew * 0.8, ez0 + ed * 0.72, 0.9);
  deer(b, ex0 + ew * 0.22, ez0 + ed * 0.5, -0.4);
  deer(b, ex0 + ew * 0.54, ez0 + ed * 0.32, 3.4, { graze: true });
  deer(b, ex0 + ew * 0.33, ez0 + ed * 0.72, 2.3, { s: 0.62 });
  // the wood: trees behind the herd and at the two ends, none between the deer and the view
  for (const [fx, fz, s] of [[0.03, 0.2, 0.8], [0.04, 0.6, 0.7], [0.16, 0.14, 0.75], [0.3, 0.12, 0.85], [0.44, 0.15, 0.7], [0.58, 0.12, 0.8], [0.7, 0.16, 0.72], [0.86, 0.3, 0.78], [0.97, 0.12, 0.7], [0.965, 0.5, 0.62], [0.82, 0.1, 0.66]]) k.tree(x0 + t.w * fx, z0 + t.d * fz, s);
  // a peacock on the grass by the path, his train spread towards the view
  peacock(b, x1 - 3.7, z1 - 2.6, 0.84);
  // its name, on a board at the corner of the path, turned to the view
  const sx = x1 - 0.75, sz = z1 + 0.25, nxv = 0.67, nzv = 0.742;
  for (const d of [-0.75, 0.75]) b.box(sx - nzv * d - 0.06, 0, sz + nxv * d - 0.06, sx - nzv * d + 0.06, 2.0, sz + nxv * d + 0.06, 0x6a5f52, { faces: 'NESW' });
  b.obox(sx, 1.85, sz, 0.05, 0.36, 1.05, Math.atan2(nzv, nxv), 0x1d4f38, { faces: 'B' });
  k.sign('south-west-deer-park', sx + nxv * 0.08, 1.85, sz + nzv * 0.08, nxv, nzv, 0.56, 1.95);
  k.lights.push({ x: (ex0 + ex1) / 2, z: z1 - 0.9, r: 12, color: '#ffe2ae', k: 0.5 }, { x: x0 + t.w * 0.2, z: z1 - 0.6, r: 9, color: '#ffe2ae', k: 0.45 });
}

// ---------------------------------------------------------------------------
// The dhaba on Aurobindo Marg
// ---------------------------------------------------------------------------

/** The place for a hero on the dhaba's ground, as index.ts has it in `heroSpots`. */
const DHABA_BAY = { x: heroPlace('dhaba').x, z: heroPlace('dhaba').z, heading: heroPlace('dhaba').heading };

/** A lorry's tailboard in the colours of truck art: HORN OK PLEASE in three panels, with a flower round the OK and diamonds below. */
function paintTailboard(ctx: CanvasRenderingContext2D, _s: SignDef, w: number, h: number): void {
  const YELLOW = '#ffd23f', RED = '#c8202c', GREEN = '#1f8f4f', BLUE = '#1b3f8f', CREAMY = '#fff8e6', BLACK = '#15161c', PINK = '#ff7fb0';
  ctx.fillStyle = YELLOW;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = h * 0.06;
  ctx.strokeRect(h * 0.03, h * 0.03, w - h * 0.06, h - h * 0.06);
  const top = h * 0.14, ph = h * 0.52, x0 = w * 0.05, gap = w * 0.018, pw = (w - 2 * x0 - 2 * gap) / 3;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ['HORN', 'OK', 'PLEASE'].forEach((word, i) => {
    const x = x0 + i * (pw + gap);
    ctx.fillStyle = i === 1 ? GREEN : RED;
    ctx.fillRect(x, top, pw, ph);
    ctx.strokeStyle = CREAMY;
    ctx.lineWidth = h * 0.018;
    ctx.strokeRect(x + h * 0.025, top + h * 0.025, pw - h * 0.05, ph - h * 0.05);
    if (i === 1) {
      const cx = x + pw / 2, cy = top + ph / 2, r = ph * 0.37;
      for (let p = 0; p < 12; p++) {
        const a = (p / 12) * Math.PI * 2;
        ctx.fillStyle = p % 2 ? PINK : CREAMY;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.34, r * 0.17, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = YELLOW;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
      ctx.fill();
    }
    const size = fit(ctx, word, EN, ph * (i === 1 ? 0.36 : 0.44), pw * (i === 1 ? 0.44 : 0.84));
    ctx.font = `900 ${size}px ${EN}`;
    ctx.fillStyle = BLACK;
    ctx.fillText(word, x + pw / 2 + size * 0.05, top + ph / 2 + size * 0.09);
    ctx.fillStyle = i === 1 ? RED : YELLOW;
    ctx.fillText(word, x + pw / 2, top + ph / 2 + size * 0.04);
  });
  // a row of diamonds along the foot, as reflectors, red and green by turns
  const by = top + ph + h * 0.05, bh = h - by - h * 0.09;
  for (let i = 0; i < 9; i++) {
    const dx = w * 0.1 + (i * w * 0.8) / 8;
    ctx.fillStyle = i % 2 ? GREEN : RED;
    ctx.beginPath();
    ctx.moveTo(dx, by); ctx.lineTo(dx + bh * 0.42, by + bh / 2); ctx.lineTo(dx, by + bh); ctx.lineTo(dx - bh * 0.42, by + bh / 2);
    ctx.fill();
  }
}

/** A lorry with a painted body, standing: its nose along (cos yaw, sin yaw), its tailboard a sign. `round` is the side whose wheels are seen. */
function lorry(k: Build, x: number, z: number, yaw: number, round: 1 | -1): void {
  const b = k.b, CAB = 0x2a6fb0, BODY = 0xe8862a, CROWN = 0xf2c81e, PANELS = [0xc8202c, 0xf2c81e, 0x1f8f4f, 0xff7fb0];
  b.moved(x, 0, z, yaw, () => {
    b.box(-4.3, 0.95, -1.45, 4.3, 1.3, 1.45, DARK, { faces: 'NESWB' });
    // the load body, with its painted panels along both sides and a tarpaulin over the load
    b.box(-4.3, 1.3, -1.6, 1.9, 3.2, 1.6, BODY, { top: 0x7f8a5a });
    PANELS.forEach((color, i) => {
      const a = -4.0 + i * 1.45;
      b.box(a, 1.55, 1.6, a + 1.2, 2.95, 1.63, color, { faces: 'S' });
      b.box(a, 1.55, -1.63, a + 1.2, 2.95, -1.6, color, { faces: 'N' });
    });
    // the cab, its windscreen, and the painted crown over it
    b.box(2.05, 0.95, -1.55, 4.3, 3.05, 1.55, CAB, { faces: 'NESWTB' });
    b.box(4.3, 2.0, -1.3, 4.34, 2.85, 1.3, 0x1c2733, { faces: 'E' });
    for (const s of [-1, 1]) b.box(2.9, 2.05, s * 1.55 + (s < 0 ? -0.03 : 0), 3.9, 2.8, s * 1.55 + (s > 0 ? 0.03 : 0), 0x1c2733, { faces: s > 0 ? 'S' : 'N' });
    b.box(2.5, 3.05, -1.6, 4.45, 3.55, 1.6, CROWN, { faces: 'NESWTB' });
    b.box(4.45, 3.12, -1.3, 4.48, 3.48, 1.3, 0xc8202c, { faces: 'E' });
    b.box(4.3, 0.7, -1.6, 4.55, 1.08, 1.6, 0xc9ced3, { faces: 'NESWTB' });
    for (const s of [-1, 1]) {
      b.box(4.55, 1.2, s * 0.95 - 0.3, 4.58, 1.5, s * 0.95 + 0.3, 0xfff4d6, { win: interior(2.2), faces: 'E' });
      b.box(-4.34, 1.0, s * 1.15 - 0.25, -4.3, 1.24, s * 1.15 + 0.25, 0xc81e1e, { win: interior(1.6), faces: 'W' });
    }
    for (const wx of [3.2, -2.5]) {
      wheel(b, wx, 1.05, round * 1.22, 1.05, wx < 0 ? 0.5 : 0.4, round);
      b.box(wx - 0.9, 0.02, -round * 1.22 - 0.4, wx + 0.9, 1.8, -round * 1.22 + 0.4, TYRE, { faces: 'NESW' });
    }
  });
  const c = Math.cos(yaw), s = Math.sin(yaw);
  k.sign('south-west-horn-ok-please', x - c * 4.34, 2.25, z - s * 4.34, -c, -s, 1.82, 3.1);
}

/** A string bed: a frame strung with rope, on a pair of wooden legs at each end. It lies along x, or along z if `turned`. */
function charpoy(b: GeoBuilder, x: number, z: number, turned = false): void {
  const hl = turned ? 0.5 : 1.05, hw = turned ? 1.05 : 0.5;
  b.box(x - hl, 0.44, z - hw, x + hl, 0.56, z + hw, 0xd9c9a0, { faces: 'NESWTB', top: 0xe6d9b4 });
  // its legs, a pair at each end, standing a little above the frame
  for (const s of [-1, 1]) {
    if (turned) b.box(x - hl, 0, z + s * (hw - 0.08) - 0.06, x + hl, 0.64, z + s * (hw - 0.08) + 0.06, WOOD, { faces: 'NESWT' });
    else b.box(x + s * (hl - 0.08) - 0.06, 0, z - hw, x + s * (hl - 0.08) + 0.06, 0.64, z + hw, WOOD, { faces: 'NESWT' });
  }
}

/** A glass of tea. */
const teaGlass = (b: GeoBuilder, x: number, z: number, y: number): void => b.box(x - 0.06, y, z - 0.06, x + 0.06, y + 0.16, z + 0.06, 0xb5651d, { top: 0x8a4a14 });

function dhaba(k: Build): void {
  const b = k.b, [x0, z0, x1, z1] = GROUNDS.dhaba, bay = DHABA_BAY, STEEL_POT = 0xc9ced3;
  // --- the lorry, at the north end with its nose to the north, so that its tailboard faces the yard ---
  const lz = z0 + 5.2, lx = x1 - 1.9;
  lorry(k, lx, lz, -Math.PI / 2, 1);

  // --- the dhaba: three walls and a tin roof, open to the south, beside the lorry ---
  const hx0 = x0 + 0.25, hx1 = lx - 1.95, hz1 = lz + 4.1, hz0 = hz1 - 3.6, hm = (hx0 + hx1) / 2, WASH = 0x6fb2c9, TIN = 0xa9b0b4;
  b.box(hx0, 0, hz0, hx1, 2.5, hz0 + 0.18, WASH);
  b.box(hx0, 0, hz0 + 0.18, hx0 + 0.18, 2.5, hz1, WASH);
  b.box(hx1 - 0.18, 0, hz0 + 0.18, hx1, 2.5, hz1, WASH);
  // inside, the back wall in the light of a bulb, and a shelf of jars along it
  b.box(hx0 + 0.18, 0.02, hz0 + 0.18, hx1 - 0.18, 2.45, hz0 + 0.24, 0xf2e2b8, { win: interior(1.1), faces: 'S' });
  b.box(hx0 + 0.3, 1.5, hz0 + 0.24, hx1 - 0.3, 1.9, hz0 + 0.55, 0xc8742a, { win: interior(0.8), faces: 'ESWTB' });
  // the roof of tin rises to the front, so that the view looks in under it, and the dhaba's board stands on its edge
  slab(b, [hm, 2.62, hz0 - 0.15], [hm, 3.02, hz1 + 0.45], (hx1 - hx0) / 2 + 0.2, 0.1, TIN, { under: 0x8d9498 });
  plate(k, 'south-west-dhaba', 'S', hz1 + 0.4, hm, 3.42, 0.62, 1.86);
  // the counter across the front, with two big pots on it, and a third on the floor behind
  b.box(hx0 + 0.9, 0, hz1 - 0.55, hx1 - 0.18, 0.95, hz1 - 0.02, 0x8a6a48, { top: 0xb9a07a });
  for (const [dx, r] of [[1.25, 0.3], [1.9, 0.25]]) b.cyl(hx0 + dx, hz1 - 0.3, 0.95, 1.42, r, r, 6, STEEL_POT, { cap: 0x6a4a2c });
  b.cyl(hx0 + 1.5, hz0 + 1.2, 0, 0.5, 0.4, 0.4, 6, STEEL_POT, { cap: 0xd9a25f });
  // the clay oven, out in front where it is seen, and the man who works it
  const ox = hx0 + 0.75, oz = hz1 + 1.5;
  b.cyl(ox, oz, 0, 0.95, 0.62, 0.5, 8, 0xb5654a, { cap: 0x2a1a14 });
  b.cyl(ox, oz, 0.95, 1.02, 0.34, 0.34, 8, 0x2a1a14, { cap: 0xff8a2a });
  k.glows.push({ x: ox, y: 1.08, z: oz, sx: 0.4, sy: 0.08, sz: 0.4, color: '#ff8a2a' });
  figure(b, ox + 1.0, oz - 0.15, 0, { coat: 0xf2efe6, legs: 0x5d6168, hat: 0xc8402f, hatH: 0.2 });
  // a wisp of smoke rises from it
  const smoke = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 24), from = new THREE.Vector3(), drift = new THREE.Vector3(0.12, 0.3, 0.08), tick = rng(81085);
  k.group.add(smoke.mesh);
  let due = 0;
  k.each((dt) => {
    due -= dt;
    while (due <= 0) {
      due += 0.28 + tick() * 0.3;
      smoke.puff(from.set(ox + (tick() - 0.5) * 0.3, 1.2, oz + (tick() - 0.5) * 0.3), drift, 0.5, 0.88);
    }
    smoke.update(dt);
  });
  // string beds in the yard north of the bay, with a tray of tea on one of them, and the people who sit there
  const yz = (hz1 + 1.6 + bay.z - 2.6) / 2;
  charpoy(b, lx - 0.1, yz - 0.5);
  charpoy(b, lx - 2.9, yz + 0.75);
  b.box(lx - 0.5, 0.56, yz - 0.72, lx + 0.1, 0.6, yz - 0.3, STEEL_POT, { faces: 'NESWT' });
  for (const [dx, dz] of [[-0.35, -0.6], [-0.1, -0.42]]) teaGlass(b, lx + dx, yz + dz, 0.6);
  k.person(lx + 1.2, yz - 0.6);
  k.person(lx - 1.5, yz - 0.9);
  k.person(lx - 4.2, yz + 0.6);

  // --- the place for a hero: a bay marked on the paving, open to the south-east, and nothing tall beyond it ---
  const f: P2 = [Math.cos(bay.heading), Math.sin(bay.heading)], r: P2 = [-f[1], f[0]], BL = 4.1, BW = 1.9, lw = 0.07;
  const at = (a: number, c: number): P2 => [bay.x + f[0] * a + r[0] * c, bay.z + f[1] * a + r[1] * c];
  // its two long sides, each cut off where it would leave the dhaba's own ground for the sidewalk, and the line across its head
  for (const c of [-BW, BW]) {
    const a0 = Math.max(-BL, (x0 + 0.15 - bay.x - r[0] * c) / f[0]);
    area(k, [at(a0, c - lw), at(BL, c - lw), at(BL, c + lw), at(a0, c + lw)], 0xf2efe6, PAINT);
  }
  area(k, [at(BL - lw, -BW), at(BL + lw, -BW), at(BL + lw, BW), at(BL - lw, BW)], 0xf2efe6, PAINT);

  // --- south of the bay, where nothing may stand tall: a string bed with two glasses on it, and the puncture stand in the corner by the road ---
  charpoy(b, x1 - 1.7, z1 - 2.6);
  for (const dx of [-0.2, 0.15]) teaGlass(b, x1 - 1.7 + dx, z1 - 2.6, 0.56);
  const tx = x0 + 0.75, tz = z1 - 0.8;
  // a tyre on a post, as its sign; a stack of tyres; the compressor; and a tub of water to find the hole in
  b.box(tx - 0.07, 0, tz - 0.07, tx + 0.07, 1.75, tz + 0.07, 0x5d6168, { faces: 'NESW' });
  wheel(b, tx, 2.3, tz, 0.62, 0.17, 1, TYRE, 0x3a3d42);
  wheel(b, tx, 2.3, tz, 0.62, 0.17, -1, TYRE, 0x3a3d42);
  b.cyl(tx + 1.35, tz - 0.25, 0, 0.86, 0.6, 0.6, 8, TYRE, { cap: 0x2a2c31 });
  b.box(tx + 2.0, 0.12, tz - 1.35, tx + 2.95, 0.6, tz - 0.9, 0xc8402f, { faces: 'NESWTB' });
  b.cyl(tx + 0.65, tz - 1.45, 0, 0.3, 0.55, 0.5, 8, 0x8d9498, { cap: 0x5f9fc4 });
  figure(b, tx + 0.55, tz - 2.3, 0, { coat: 0x3f5f8a, legs: 0x3a3d46, hat: HAIR, hatH: 0.12 });
  const punct = k.signs.atlas.rects.has('shop-puncture') ? 'shop-puncture' : 'south-west-puncture';
  plate(k, punct, 'S', tz + 0.1, tx + 0.45, 1.1, 0.6, 2.0);

  // by night: a row of bulbs along the roof's edge, the oven's glow, and a warm pool of light over the yard
  for (const fx of [0.08, 0.36, 0.64, 0.92]) k.glows.push({ x: hx0 + (hx1 - hx0) * fx, y: 2.86, z: hz1 + 0.5, sx: 0.17, sy: 0.17, sz: 0.17, color: fx > 0.3 && fx < 0.7 ? '#ffe2ae' : '#ff9ccb' });
  k.lights.push({ x: (x0 + x1) / 2, z: hz1 + 2.2, r: 11, color: '#ffd9a0', k: 0.75 }, { x: bay.x, z: bay.z, r: 9, color: '#ffe9c4', k: 0.5 }, { x: tx + 1, z: tz - 0.8, r: 6, color: '#ffe2ae', k: 0.45 });
}

// ---------------------------------------------------------------------------
// What this file builds
// ---------------------------------------------------------------------------

/** Says in the console, on the development server, how many triangles a thing came to. */
const counted = (id: string, model: Model): Model => (k, t) => {
  const before = k.b.triangles + k.street.triangles + k.deck.triangles;
  model(k, t);
  if (import.meta.env.DEV) console.info(`south-west: ${id} is ${k.b.triangles + k.street.triangles + k.deck.triangles - before} triangles`);
};

/** What this file builds, by the id of the thing in the plan. */
export const MODELS: Record<string, Model> = {
  dps: counted('dps', dps),
  'rk-puram': counted('rk-puram', rkPuram),
  'hauz-khas': counted('hauz-khas', hauzKhas),
  'deer-park': counted('deer-park', deerPark),
};

/** Lines that something moves along, as [x, y, z] points, for the check that nothing crosses a road on the level: the ducks' round on Hauz Khas's tank. */
export const RAILS: Record<string, [number, number, number][]> = {
  'south-west-ducks': Array.from({ length: 17 }, (_, i): [number, number, number] => {
    const r = duckRound(), a = (i / 16) * Math.PI * 2;
    return [r.x + Math.cos(a) * r.rx, -0.9, r.z + Math.sin(a) * r.rz];
  }),
};

/** Whatever this file builds that is not one of the plan's things: the dhaba on Aurobindo Marg. */
export function extras(k: Build): void {
  const before = k.b.triangles + k.street.triangles + k.deck.triangles;
  dhaba(k);
  if (import.meta.env.DEV) console.info(`south-west: the dhaba is ${k.b.triangles + k.street.triangles + k.deck.triangles - before} triangles`);
}
