// The engineering campus, north of Green Street: Engineering Hall, Grainger
// Library, the Siebel Center, the car teams' workshop, Everitt and Talbot
// laboratories, the laboratories across Green Street, and Boneyard Creek with
// the Bardeen Quad.
//
// What was looked up (November 2026):
// - Engineering Hall, 1894, faces the Union across Green Street; orange brick
//   under a dark blue roof (the university's tour), though the National
//   Register's survey of the campus calls the brick buff. In plan a T: a long
//   block on Green Street and a wing behind it towards the creek, with the
//   veranda over the Boneyard (OpenStreetMap; the engineering campus's pages).
// - Grainger Library, 1994, by Evans Woollen: in the "abstract Georgian
//   Revival" of the 1980s and 1990s master plan, its entrance on the south.
//   In plan two end wings with a recessed middle (OpenStreetMap).
// - The Siebel Center, 2004, by Bohlin Cywinski Jackson: brick, slate, copper
//   and glass, with a traditional face to the south and the west, towards the
//   older halls, and a modern one of glass on the inside of its L, to the north
//   (the department's own pages). In plan an L whose inner side is a long
//   slanted wall of glass (OpenStreetMap). Four storeys (Wikipedia; OSM says 5).
// - Everitt Laboratory, 1949 (the Electrical Engineering Building): post-war
//   stripped Georgian, red brick, flat or very shallow roof (the National
//   Register's survey). Talbot Laboratory, red brick, with its high bay.

import { interior, rng, type V3, type WinSpec } from '../../engine/geo';
import { area, rect } from '../../engine/ground';
import { lantern, roundel, tri } from '../../engine/parts';
import { gable, hip, prism, slab, type XZ } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { BASE, BRICK, DARK, FELT, GLASS, HALL, HALL_NARROW, IRON, LIMESTONE, SLATE, STOREY, TRIM, VERDIGRIS, chimney, column, dormer, steps } from './look';
import { AREAS, lot, type LotDef, type Model } from './plan';

// ---------------------------------------------------------------------------
// Colours and glazing of this file's own
// ---------------------------------------------------------------------------

/** Engineering Hall's dark blue-grey roof, its brick (a softer orange than BRICK.orange, which comes out yellow), and the stone of its ground storey. */
const BLUE_ROOF = 0x3d4a64, ENG_BRICK = 0xd08a5e, ENG_STONE = 0xc9bea6;
/** Grainger's roofs: a dark grey standing seam. */
const SEAM = 0x56606a;
/** The Siebel Center's brick, a warm red-brown, and its copper, gone brown. */
const SIEBEL_BRICK = 0xa5503c, SIEBEL_ROOF = 0x737c85, BUFF = 0xd6c6a3, PANEL = 0xaab1b8, MULLION = 0xe4e6e8;
/** The workshop's metal sheet, its doors and the inside of it. */
const SHEET = 0xa3afb8, SHEET_DARK = 0x7f8b94, INSIDE = 0xe2ddd0, CONCRETE = 0xc9c5bb;
/** The creek's stone edges and the footbridges' rails, painted light because thin bars come out dark. */
const STONE = 0xb8b1a1, RAIL = 0xeeebe3;
/** Bronze, for the man on his bench. */
const STATUE = 0x8a6a3e;

/** The Siebel Center's storeys are a little lower than the halls', so that four fit under its roof. */
const S_STY = 2.6;
const S_WIN: WinSpec = { cell: 1.55, storey: S_STY, lit: 0.45, kind: 0 };
const S_GLASS: WinSpec = { cell: 1.2, storey: S_STY, lit: 0.75, kind: 1 };

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------

const BOARD = { color: '#f3f0e7', ink: '#13294b', kind: 'board' as const };
/** A name on one line, on a small board: 52 pixels high. */
const one = (id: string, text: string, real = true): SignDef => {
  const aspect = Math.max(2.4, text.length * 0.45 + 0.8);
  return { id, lines: [text], ...BOARD, real, aspect, size: [Math.round(52 * aspect), 52] };
};
/** A name on two lines. */
const two = (id: string, a: string, b: string): SignDef => {
  const aspect = Math.max(a.length, b.length) * 0.23 + 0.5;
  return { id, lines: [a, b], ...BOARD, real: true, aspect, size: [Math.round(96 * aspect), 96] };
};

export const SIGNS: SignDef[] = [
  one('engineering-hall', 'ENGINEERING HALL'),
  one('engineering-grainger', 'GRAINGER ENGINEERING LIBRARY'),
  two('engineering-siebel', 'THOMAS M. SIEBEL CENTER', 'FOR COMPUTER SCIENCE'),
  one('engineering-everitt', 'EVERITT LABORATORY'),
  one('engineering-talbot', 'TALBOT LABORATORY'),
  { ...one('engineering-solar', 'SOLAR CAR', false), ink: '#1d2a44' },
  { ...one('engineering-formula', 'FORMULA', false), ink: '#1d2a44' },
];

const aspectOf = (id: string): number => SIGNS.find((s) => s.id === id)?.aspect ?? 4;

/**
 * Hangs a sign on a wall that faces south (`face` 'S') or east ('E'), on a
 * thin board of its own colour a hair proud of the wall. (x, y, z) is the
 * middle of the board's back, on the wall.
 */
function board(k: Build, id: string, x: number, y: number, z: number, face: 'S' | 'E', h: number, maxW = 99): void {
  const a = aspectOf(id);
  if (h * a > maxW) h = maxW / a;
  const w = h * a, hh = h / 2 + 0.06, hw = w / 2 + 0.06;
  if (face === 'S') {
    k.b.box(x - hw, y - hh, z, x + hw, y + hh, z + 0.08, 0xe9e5da, { faces: 'SEWTB' });
    k.sign(id, x, y, z + 0.11, 0, 1, h, w);
  } else {
    k.b.box(x, y - hh, z - hw, x + 0.08, y + hh, z + hw, 0xe9e5da, { faces: 'ENSTB' });
    k.sign(id, x + 0.11, y, z, 1, 0, h, w);
  }
}

/** A plinth, belt courses and a cornice round a block, each a hair proud of it. */
function trims(k: Build, x0: number, z0: number, x1: number, z1: number, o: { plinth?: number; belts?: number[]; cornice?: [number, number]; color?: number; faces?: string }): void {
  const b = k.b, f = o.faces ?? 'NESW', c = o.color ?? LIMESTONE;
  if (o.plinth) b.box(x0 - 0.08, 0, z0 - 0.08, x1 + 0.08, o.plinth, z1 + 0.08, BASE, { faces: f + 'T' });
  for (const y of o.belts ?? []) b.box(x0 - 0.06, y - 0.09, z0 - 0.06, x1 + 0.06, y + 0.09, z1 + 0.06, c, { faces: f + 'TB' });
  if (o.cornice) b.box(x0 - 0.22, o.cornice[0], z0 - 0.22, x1 + 0.22, o.cornice[1], z1 + 0.22, c, { faces: f + 'B' });
}

// ---------------------------------------------------------------------------
// Engineering Hall
// ---------------------------------------------------------------------------

/**
 * Orange brick on a ground storey of stone, under a low dark blue roof,
 * symmetrical, facing the Union across Green Street: a pavilion at each end and
 * one in the middle under a gable, round-headed windows on the main floor, and
 * the arched doorway up its steps. A wing runs back towards the creek, with a
 * veranda over the water.
 */
function engineeringHall(k: Build, l: LotDef): void {
  const b = k.b, { x0, z0, x1, z1 } = l, cx = (x0 + x1) / 2;
  const WALL = 4 * STOREY, EAVE = Math.max(WALL + 0.4, l.h), RISE = 2.3;
  const front = z1 - 0.5, back = front - 5, endW = 2.8, midH = 2.7;

  /**
   * A block of the hall: its ground storey in stone and the rest in brick, with
   * windows on the sides named in `faces`. Its south face, if it has one, is
   * built apart: stone with windows, then a row of round-headed windows on the
   * main floor, then two rows of plain ones above.
   */
  const block = (xa: number, za: number, xc: number, zc: number, faces: string, south: 'arched' | 'door' | null, seed: number): void => {
    if (faces) {
      b.box(xa, 0, za, xc, STOREY, zc, ENG_STONE, { win: HALL, seed, faces });
      b.box(xa, STOREY, za, xc, WALL, zc, ENG_BRICK, { win: HALL, seed, faces });
    }
    if (!south) return;
    b.box(xa, 0, za, xc, STOREY, zc, ENG_STONE, { win: HALL, seed, faces: 'S' });
    b.box(xa, STOREY, za, xc, 2 * STOREY, zc, ENG_BRICK, { faces: 'S' });
    b.box(xa, 2 * STOREY, za, xc, WALL, zc, ENG_BRICK, { win: south === 'door' ? HALL_NARROW : HALL, seed, faces: 'S' });
    if (south === 'arched') {
      const n = Math.max(1, Math.round((xc - xa) / 1.9)), w = (xc - xa) / n;
      for (let i = 0; i < n; i++) {
        const x = xa + (i + 0.5) * w;
        b.box(x - 0.36, STOREY + 0.45, zc, x + 0.36, STOREY + 2.0, zc + 0.04, GLASS, { faces: 'SEW', win: interior(0.7) });
        roundel(b, [x, STOREY + 2.0, zc + 0.02], 0.5, 'S', LIMESTONE, {}, 8);
        roundel(b, [x, STOREY + 2.0, zc + 0.05], 0.36, 'S', GLASS, { win: interior(0.7) }, 8);
      }
    }
  };
  // the body, its two end pavilions, and the middle one, which stands furthest forward
  block(x0 + 0.3, back, x1 - 0.3, front, 'N', null, 0.41);
  block(x0 + endW, back, cx - midH, front, '', 'arched', 0.41);
  block(cx + midH, back, x1 - endW, front, '', 'arched', 0.41);
  for (const [a, c] of [[x0, x0 + endW], [x1 - endW, x1]]) block(a, back - 0.2, c, z1 - 0.2, 'NEW', 'arched', 0.42);
  block(cx - midH, front - 0.1, cx + midH, z1, 'EW', 'door', 0.43);
  // a band of stone at the foot of the main floor, all round
  for (const [a, c, za, zc, f] of [[x0 + 0.3, x1 - 0.3, back, front, 'NS'], [x0, x0 + endW, back - 0.2, z1 - 0.2, 'NESW'], [x1 - endW, x1, back - 0.2, z1 - 0.2, 'NESW'], [cx - midH, cx + midH, front - 0.1, z1, 'SEW']] as const) {
    b.box(a - 0.07, STOREY - 0.08, za - 0.07, c + 0.07, STOREY + 0.14, zc + 0.07, LIMESTONE, { faces: f + 'TB' });
  }
  // the cornice round the whole, and the low hipped roof
  b.box(x0 - 0.3, WALL, back - 0.5, x1 + 0.3, EAVE, z1 + 0.1, LIMESTONE, { faces: 'NESWB' });
  hip(b, x0 - 0.3, back - 0.5, x1 + 0.3, z1 + 0.1, EAVE, RISE, BLUE_ROOF, 0.25);
  const ridgeZ = (back - 0.5 + z1 + 0.1) / 2;
  // the middle pavilion's gable, running back into the hip, with a round window in it
  gable(b, cx - midH, ridgeZ, cx + midH, z1, EAVE, RISE + 0.3, BLUE_ROOF, ENG_BRICK, 'z', 0.35);
  b.box(cx - midH - 0.2, EAVE - 0.05, z1 - 0.1, cx + midH + 0.2, EAVE + 0.2, z1 + 0.25, LIMESTONE, { faces: 'SEWTB' });
  roundel(b, [cx, EAVE + 0.95, z1 + 0.04], 0.5, 'S', LIMESTONE);
  roundel(b, [cx, EAVE + 0.95, z1 + 0.07], 0.38, 'S', GLASS, { win: interior(0.9) });
  // dormers on both slopes, between the pavilions, and two chimneys
  const run = (5.5 + 0.6 + 0.5) / 2, up = 0.9, sill = EAVE + ((up + 0.25) * RISE) / run - 0.12;
  for (const x of [(x0 + endW + cx - midH) / 2, (x1 - endW + cx + midH) / 2]) {
    dormer(b, x, z1 + 0.1 - up, sill, 'S', BLUE_ROOF, 0.85, 0.85);
    dormer(b, x, back - 0.5 + up, sill, 'N', BLUE_ROOF, 0.85, 0.85);
  }
  for (const x of [x0 + 1.4, x1 - 1.4]) chimney(b, x, ridgeZ, EAVE + 1.2, EAVE + RISE + 0.8, ENG_BRICK);

  // the doorway: steps up to a landing, an arch of stone, and doors lit from within
  const floor = 0.9;
  b.box(cx - 1.5, 0, z1, cx + 1.5, floor, z1 + 0.4, LIMESTONE, { faces: 'SEWT' });
  steps(b, cx - 1.5, cx + 1.5, z1 + 0.4, floor, 'S', LIMESTONE, 0.42);
  b.box(cx - 1.2, floor, z1, cx + 1.2, 3.95, z1 + 0.14, LIMESTONE, { faces: 'SEWT' });
  roundel(b, [cx, 3.0, z1 + 0.16], 0.82, 'S', GLASS, { win: interior(1.1) }, 12);
  b.box(cx - 0.82, floor, z1 + 0.14, cx + 0.82, 3.0, z1 + 0.2, DARK, { faces: 'SEWT', win: interior(1.4) });
  // its name, on a board over the arch
  board(k, 'engineering-hall', cx, 4.6, z1, 'S', 0.62, 2 * midH - 0.5);
  k.glows.push({ x: cx, y: 3.2, z: z1 + 0.5, sx: 1.2, sy: 0.12, sz: 0.2, color: '#ffe2ae' });
  k.lights.push({ x: cx, z: z1 + 2.6, r: 11, color: '#ffe2ae', k: 0.55 });
  k.person(cx + 1.0, z1 + 1.3);
  for (const s2 of [-1, 1]) {
    b.box(cx + s2 * 1.5 - 0.22, 0, z1 + 0.4, cx + s2 * 1.5 + 0.22, floor + 0.35, z1 + 1.75, LIMESTONE, { faces: 'NESWT' });
    lantern(k, cx + s2 * 1.5, z1 + 1.55, floor + 0.35, 1.1, IRON);
  }
  // stone quoins up the corners of the pavilions
  for (const [x, z] of [[x0, z1 - 0.2], [x0 + endW, z1 - 0.2], [x1 - endW, z1 - 0.2], [x1, z1 - 0.2], [cx - midH, z1], [cx + midH, z1]] as const) {
    b.box(x - 0.18, STOREY, z - 0.18, x + 0.18, WALL, z + 0.06, LIMESTONE, { faces: 'NESW' });
  }

  // the wing at the back, towards the creek, under its own low hip, and the veranda along its end
  const wing = 3.2, wTop = 3 * STOREY;
  b.box(cx - wing, 0, z0 + 0.1, cx + wing, STOREY, back, ENG_STONE, { win: HALL, seed: 0.44, faces: 'NEW' });
  b.box(cx - wing, STOREY, z0 + 0.1, cx + wing, wTop, back, ENG_BRICK, { win: HALL, seed: 0.44, faces: 'NEW' });
  b.box(cx - wing - 0.25, wTop, z0 - 0.15, cx + wing + 0.25, wTop + 0.35, back, LIMESTONE, { faces: 'NEWB' });
  hip(b, cx - wing - 0.25, z0 - 0.15, cx + wing + 0.25, back + 0.6, wTop + 0.35, 1.6, BLUE_ROOF, 0.15);
  {
    const zv = z0 - 1.3, roofY = 3.5;
    b.box(cx - wing - 0.2, 0, zv, cx + wing + 0.2, floor, z0 + 0.1, LIMESTONE, { faces: 'NEWT' });
    steps(b, cx - 1.3, cx + 1.3, zv, floor, 'N', LIMESTONE, 0.3);
    for (const x of [cx - wing, cx - wing / 3, cx + wing / 3, cx + wing]) column(b, x, zv + 0.25, floor, roofY, 0.16);
    b.box(cx - wing - 0.35, roofY, zv - 0.1, cx + wing + 0.35, roofY + 0.3, z0 + 0.1, TRIM, { faces: 'NEWTB', top: BLUE_ROOF });
    for (const [a, c] of [[cx - wing, cx - 1.3], [cx + 1.3, cx + wing]]) b.box(a, floor + 0.75, zv + 0.15, c, floor + 0.88, zv + 0.25, RAIL, { faces: 'NSTB' });
    b.box(cx - 2.2, floor, z0 + 0.04, cx - 0.8, floor + 2.2, z0 + 0.1, DARK, { faces: 'N', win: interior(1.2) });
    k.lights.push({ x: cx, z: zv - 1.5, r: 9, color: '#ffe2ae', k: 0.45 });
    k.glows.push({ x: cx, y: roofY - 0.12, z: zv + 0.6, sx: 2.5, sy: 0.1, sz: 0.2, color: '#ffe2ae' });
    k.person(cx + 2.1, zv + 0.6, floor);
  }
}

// ---------------------------------------------------------------------------
// Grainger Engineering Library
// ---------------------------------------------------------------------------

/**
 * Red brick, long and symmetrical, in the simplified Georgian of the 1990s: a
 * pavilion at each end, a white cornice, and a great grey roof of standing
 * seam with a band of skylights along it and a half-round dormer over each
 * pavilion. A small white porch of columns in the middle of its south front
 * looks over the Bardeen Quad towards Engineering Hall.
 */
function grainger(k: Build, l: LotDef): void {
  const b = k.b, { x0, z0, x1, z1 } = l, cx = (x0 + x1) / 2;
  const WALL = 3 * STOREY, EAVE = WALL + 0.5, RISE = Math.min(3.4, l.h + 0.6 - EAVE), pav = 4.2, front = z1 - 0.5;
  const win: WinSpec = { cell: 1.7, storey: STOREY, lit: 0.45, kind: 0 };

  // the long body between the pavilions
  b.box(x0 + pav, 0, z0, x1 - pav, WALL, front, BRICK.red, { win, seed: 0.52, faces: 'N' });
  b.box(x0 + pav, 0, z0, x1 - pav, STOREY, front, BRICK.red, { faces: 'S' });
  b.box(x0 + pav, STOREY, z0, x1 - pav, WALL, front, BRICK.red, { win, seed: 0.52, faces: 'S' });
  // on the ground floor, tall windows in white frames, two either side of the porch
  for (const f of [0.14, 0.33, 0.67, 0.86]) {
    const x = x0 + pav + (x1 - x0 - 2 * pav) * f;
    b.box(x - 0.7, 0.75, front, x + 0.7, STOREY - 0.25, front + 0.04, GLASS, { faces: 'SEWT', win: interior(0.8) });
    b.box(x - 0.05, 0.75, front + 0.04, x + 0.05, STOREY - 0.25, front + 0.08, TRIM, { faces: 'SEW' });
    b.box(x - 0.7, 1.7, front + 0.04, x + 0.7, 1.8, front + 0.08, TRIM, { faces: 'STB' });
    b.box(x - 0.8, STOREY - 0.25, front, x + 0.8, STOREY - 0.12, front + 0.1, LIMESTONE, { faces: 'SEWTB' });
  }
  trims(k, x0 + pav, z0, x1 - pav, front, { plinth: 0.7, belts: [STOREY], faces: 'NS' });
  b.box(x0 + pav, WALL, z0 - 0.25, x1 - pav, EAVE, front + 0.25, TRIM, { faces: 'NSB' });
  hip(b, x0 + pav - 1.2, z0 - 0.25, x1 - pav + 1.2, front + 0.25, EAVE, RISE * 0.82, SEAM, 0.15);
  // its band of skylights, low on the south slope
  {
    const run = (front + 0.4 - (z0 - 0.4)) / 2, rise = RISE * 0.82, len = Math.hypot(run, rise), n: V3 = [0, run / len, rise / len];
    const at = (t: number): [number, number] => [front + 0.4 - t * run, EAVE + t * rise];
    const [za, ya] = at(0.18), [zc, yc] = at(0.42), o = 0.04;
    b.quad([x0 + pav + 0.6, ya + n[1] * o, za + n[2] * o], [x1 - pav - 0.6, ya + n[1] * o, za + n[2] * o], [x1 - pav - 0.6, yc + n[1] * o, zc + n[2] * o], [x0 + pav + 0.6, yc + n[1] * o, zc + n[2] * o], n, GLASS, { win: interior(0.7) });
    for (let x = x0 + pav + 0.9; x < x1 - pav - 0.6; x += 0.9) {
      const [zb, yb] = at(0.45), [zt, yt] = at(0.98);
      b.quad([x - 0.035, yb + n[1] * 0.03, zb + n[2] * 0.03], [x + 0.035, yb + n[1] * 0.03, zb + n[2] * 0.03], [x + 0.035, yt + n[1] * 0.03, zt + n[2] * 0.03], [x - 0.035, yt + n[1] * 0.03, zt + n[2] * 0.03], n, 0x6b747d);
    }
    for (let x = x0 + pav + 1.6; x < x1 - pav - 0.8; x += 1.4) b.quad([x - 0.05, ya + n[1] * 0.07, za + n[2] * 0.07], [x + 0.05, ya + n[1] * 0.07, za + n[2] * 0.07], [x + 0.05, yc + n[1] * 0.07, zc + n[2] * 0.07], [x - 0.05, yc + n[1] * 0.07, zc + n[2] * 0.07], n, TRIM);
  }

  // the pavilions: windows on three sides, and on the south a tall group of windows under a smaller one
  for (const [a, c] of [[x0, x0 + pav], [x1 - pav, x1]]) {
    b.box(a, 0, z0, c, WALL, z1, BRICK.red, { win, seed: 0.53, faces: 'NEW' });
    b.box(a, 0, z0, c, WALL, z1, BRICK.red, { faces: 'S' });
    trims(k, a, z0, c, z1, { plinth: 0.7, belts: [STOREY] });
    b.box(a - 0.25, WALL, z0 - 0.25, c + 0.25, EAVE, z1 + 0.25, TRIM, { faces: 'NESWB' });
    hip(b, a - 0.25, z0 - 0.25, c + 0.25, z1 + 0.25, EAVE, RISE, SEAM, 0.15);
    const m = (a + c) / 2;
    b.box(m - 1.25, 0.8, z1, m + 1.25, 5.5, z1 + 0.05, GLASS, { faces: 'SEWT', win: interior(0.8) });
    b.box(m - 0.9, 6.2, z1, m + 0.9, 8.1, z1 + 0.05, GLASS, { faces: 'SEWT', win: interior(0.8) });
    for (const x of [m - 0.42, m + 0.42]) b.box(x - 0.06, 0.8, z1 + 0.05, x + 0.06, 5.5, z1 + 0.1, TRIM, { faces: 'SEW' });
    for (const y of [2.4, 4.0]) b.box(m - 1.25, y - 0.06, z1 + 0.05, m + 1.25, y + 0.06, z1 + 0.1, TRIM, { faces: 'STB' });
    b.box(m - 1.4, 5.5, z1, m + 1.4, 5.75, z1 + 0.14, LIMESTONE, { faces: 'SEWTB' });
    // the half-round dormer on its roof
    const run = (pav + 0.8) / 2, up = 0.95, sill = EAVE + ((up + 0.4) * RISE) / run - 0.2;
    dormer(b, m, z1 + 0.25 - up, sill, 'S', SEAM, 1.3, 0.95, 1.6);
    roundel(b, [m, sill + 0.48, z1 + 0.25 - up + 0.06], 0.36, 'S', GLASS, { win: interior(0.9) }, 10);
  }
  chimney(b, x1 - 1.3, z0 + 1.6, EAVE + 1.5, EAVE + RISE + 1.0, BRICK.red);

  // the white porch in the middle, its doors behind it, and its name on the cornice above
  {
    const fl = 0.35, top = 3.0, out = z1 + 0.6;
    b.box(cx - 1.9, 0, front, cx + 1.9, fl, out, LIMESTONE, { faces: 'SEWT' });
    for (const x of [cx - 1.5, cx - 0.55, cx + 0.55, cx + 1.5]) column(b, x, out - 0.3, fl, top, 0.15);
    b.box(cx - 1.95, top, front, cx + 1.95, top + 0.5, out + 0.05, TRIM, { faces: 'SEWTB' });
    b.box(cx - 1.0, fl, front, cx + 1.0, 2.5, front + 0.06, DARK, { faces: 'S', win: interior(1.4) });
    k.glows.push({ x: cx, y: top - 0.08, z: (front + out) / 2, sx: 2.4, sy: 0.08, sz: 0.4, color: '#ffe2ae' });
  }
  board(k, 'engineering-grainger', cx, (WALL + EAVE) / 2, front + 0.25, 'S', 0.42, x1 - x0 - 2 * pav - 0.6);
  k.lights.push({ x: cx, z: z1 + 2, r: 12, color: '#ffe2ae', k: 0.6 });
  k.person(cx - 2.1, z1 + 0.4);
  k.person(cx + 0.7, z1 + 0.9);
}

// ---------------------------------------------------------------------------
// The Thomas M. Siebel Center for Computer Science
// ---------------------------------------------------------------------------

/**
 * An L of four storeys: a long range on the south and a wing up the west
 * side, with a shorter wing on the east. On its outer sides it is red brick for
 * two storeys and glass for two, under grey pitched roofs of standing seam
 * that overhang. On the inside of the L, facing north, it is glass from the
 * ground up, along a slanted wall with the atrium behind it, and a drum clad in
 * green copper stands out of it. At the south-west corner the entrance is set
 * in under the building, behind a white canopy on slender columns, beside a
 * tower of buff stone.
 */
function siebel(k: Build, l: LotDef): void {
  const b = k.b, { x0, z0, x1, z1 } = l;
  const W = x1 - x0, Dp = z1 - z0;
  /** Across from the west end, and up from the south front, in proportion to the lot. */
  const U = (u: number): number => x0 + (u * W) / 21, V = (v: number): number => z1 - (v * Dp) / 13;
  const TOP = 4 * S_STY, MID = 2 * S_STY, EAVE = TOP + 0.3, RISE = 2.0;
  // the corners of the plan, as (u, v): the entrance is set in from u 0 to 5.6 and v 0 to 2.2
  const ua = 5.6, va = 2.2, uw = 6.5, ue = 16.5, vd = 6.5, ve = 9.5, ut = 7.1;

  /** A wall on the ground from (xa, za) to (xc, zc), facing (nx, nz). */
  const wall = (xa: number, za: number, xc: number, zc: number, n: [number, number], color: number, win: WinSpec | undefined, y0: number, y1: number, seed = 0.6): void => {
    b.quad([xa, y0, za], [xc, y0, zc], [xc, y1, zc], [xa, y1, za], [n[0], 0, n[1]], color, { win, seed, L: Math.hypot(xc - xa, zc - za) });
  };
  /** Glass from y0 to y1, with the edge of each floor in light metal a hair proud of it. */
  const glass = (xa: number, za: number, xc: number, zc: number, n: [number, number], y0: number, y1: number, seed: number): void => {
    wall(xa, za, xc, zc, n, GLASS, S_GLASS, y0, y1, seed);
    const ox = n[0] * 0.05, oz = n[1] * 0.05;
    for (let i = 1; i <= 4; i++) {
      const y = i * S_STY - 0.18;
      if (y < y0 || y + 0.22 > y1 + 0.3) continue;
      b.quad([xa + ox, y, za + oz], [xc + ox, y, zc + oz], [xc + ox, y + 0.22, zc + oz], [xa + ox, y + 0.22, za + oz], [n[0], 0, n[1]], PANEL);
    }
  };

  // --- the outer sides: two storeys of brick, two of glass ---
  wall(U(ut), V(0), U(11.5), V(0), [0, 1], SIEBEL_BRICK, undefined, 0, MID);
  wall(U(11.5), V(0), U(21), V(0), [0, 1], SIEBEL_BRICK, S_WIN, 0, MID, 0.61);
  wall(U(21), V(0), U(21), V(ve), [1, 0], SIEBEL_BRICK, S_WIN, 0, MID, 0.62);
  wall(U(0), V(va), U(0), V(13), [-1, 0], SIEBEL_BRICK, S_WIN, 0, MID, 0.63);
  glass(U(0), V(0), U(21), V(0), [0, 1], MID, TOP, 0.64);
  glass(U(21), V(0), U(21), V(ve), [1, 0], MID, TOP, 0.65);
  glass(U(0), V(0), U(0), V(13), [-1, 0], MID, TOP, 0.66);
  // a stone base, and a band of stone where the brick ends
  b.box(U(ut), 0, V(0), U(21) + 0.08, 0.7, V(0) + 0.08, BASE, { faces: 'SET' });
  b.box(U(21), 0, V(ve), U(21) + 0.08, 0.7, V(0), BASE, { faces: 'ENT' });
  b.box(U(0) - 0.08, 0, V(13), U(0), 0.7, V(va), BASE, { faces: 'WNST' });
  b.box(U(0) - 0.1, MID - 0.12, V(0), U(21) + 0.1, MID + 0.08, V(0) + 0.1, LIMESTONE, { faces: 'SEWTB' });
  b.box(U(21), MID - 0.12, V(ve), U(21) + 0.1, MID + 0.08, V(0), LIMESTONE, { faces: 'ENTB' });
  b.box(U(0) - 0.1, MID - 0.12, V(13), U(0), MID + 0.08, V(0), LIMESTONE, { faces: 'WNTB' });
  // white sunshades along the glass of the south front
  b.box(U(ut) + 0.4, MID + S_STY - 0.1, V(0), U(21) - 0.3, MID + S_STY, V(0) + 0.6, MULLION, { faces: 'SEWTB' });
  for (let x = U(ut) + 1.2; x < U(21) - 0.5; x += 1.6) b.box(x - 0.04, MID + S_STY - 0.1, V(0) + 0.05, x + 0.04, MID + S_STY + 0.5, V(0) + 0.6, MULLION, { faces: 'SEW' });
  // glazed bays up the east side, over the workshop's forecourt
  for (const v of [2.5, 6.8]) {
    const z = V(v);
    b.box(U(21), 0.7, z - 0.85, U(21) + 0.42, TOP - 0.2, z + 0.85, PANEL, { faces: 'NSETB' });
    b.box(U(21) + 0.42, 1.0, z - 0.62, U(21) + 0.46, TOP - 0.5, z + 0.62, GLASS, { faces: 'E', win: S_GLASS });
  }
  // the name, on the plain brick beside the entrance, and a window under it
  board(k, 'engineering-siebel', (U(ut) + U(11.5)) / 2, 3.45, V(0), 'S', 1.0, U(11.5) - U(ut) - 0.5);
  b.box(U(ut) + 0.5, 0.7, V(0), U(11.5) - 0.4, 2.3, V(0) + 0.06, GLASS, { faces: 'SEWT', win: interior(0.9) });

  // --- the tower of buff stone at the entrance ---
  {
    const xa = U(ua), xc = U(ut), za = V(0) - 0.6, zc = V(0) + 0.35, ht = Math.min(l.h + 0.4, TOP + 1.0);
    b.box(xa, 0, za, xc, ht, zc, BUFF, { faces: 'NESW', win: { cell: 0.75, storey: S_STY, lit: 0.5, kind: 6 }, seed: 0.67 });
    b.box(xa - 0.1, ht, za - 0.1, xc + 0.1, ht + 0.2, zc + 0.1, PANEL, { faces: 'NESWTB' });
  }

  // --- the inside of the L: glass from the ground up ---
  glass(U(21), V(ve), U(ue), V(ve), [0, -1], 0, TOP, 0.68);
  const dx = U(uw) - U(ue), dz = V(vd) - V(ve), dl = Math.hypot(dx, dz), dn: [number, number] = [-dz / dl, dx / dl];
  glass(U(ue), V(ve), U(uw), V(vd), dn, 0, TOP, 0.69);
  glass(U(uw), V(vd), U(uw), V(13), [1, 0], 0, TOP, 0.7);
  glass(U(uw), V(13), U(0), V(13), [0, -1], 0, TOP, 0.71);
  // a strip of brick at the foot of the glass, as on the outer sides
  b.box(U(0), 0, V(13) - 0.1, U(uw), 0.7, V(13), BASE, { faces: 'NEWT' });
  // the drum of green copper standing out of the slanted wall, with slits of window
  {
    const t = 0.72, cxd = U(ue) + t * dx + dn[0] * 0.3, czd = V(ve) + t * dz + dn[1] * 0.3;
    b.cyl(cxd, czd, 0, TOP + 0.8, 1.55, 1.55, 12, VERDIGRIS, { cap: VERDIGRIS, win: { cell: 0.7, storey: S_STY, lit: 0.6, kind: 6 }, seed: 0.72 });
  }

  // --- the entrance, set in under the building, and the canopy before it ---
  wall(U(0), V(va), U(ua), V(va), [0, 1], GLASS, S_GLASS, 0, MID, 0.73);
  wall(U(ua), V(0) - 0.6, U(ua), V(va), [-1, 0], GLASS, S_GLASS, 0, MID, 0.74);
  b.box(U(0) - 0.06, MID - 0.25, V(va), U(ua), MID - 0.12, V(0) + 0.04, SIEBEL_BRICK, { faces: 'SWB' });
  b.box(U(1.4), 0, V(va), U(4.2), 2.4, V(va) + 0.08, DARK, { faces: 'SEWT', win: interior(1.5) });
  for (const x of [U(1.4), U(2.8), U(4.2)]) b.box(x - 0.05, 0, V(va), x + 0.05, MID - 0.25, V(va) + 0.1, MULLION, { faces: 'SEW' });
  {
    const y = 3.4, xa = x0 - 1.2, xc = U(ua), za = V(va) + 0.2, zc = z1 + 1.4;
    b.box(xa, y, za, xc, y + 0.16, zc, MULLION, { faces: 'NESWTB' });
    for (let x = xa + 0.6; x < xc - 0.3; x += 0.9) b.box(x - 0.05, y - 0.22, za, x + 0.05, y, zc, MULLION, { faces: 'EWSB' });
    for (const x of [xa + 0.3, (xa + xc) / 2, xc - 0.3]) b.cyl(x, zc - 0.3, 0, y, 0.09, 0.09, 6, MULLION, { cap: false });
    area(k, rect(xa + 0.1, V(va), xc + 2.5, zc + 0.5), 0xb46f5a, 0.04);
    k.glows.push({ x: (xa + xc) / 2, y: y - 0.3, z: (za + zc) / 2, sx: 3.2, sy: 0.06, sz: 1.6, color: '#fff1d8' });
    k.lights.push({ x: (xa + xc) / 2 + 0.5, z: zc + 1.0, r: 12, color: '#ffe9c4', k: 0.65 });
    k.person(U(1.2), zc - 0.8);
    k.person(U(3.4), V(va) + 1.0);
    k.person(U(6.4), zc + 0.9);
  }

  // --- the roofs: grey standing seam, pitched, over each range, and the atrium's flat roof between them ---
  const roof = (ua0: number, va0: number, ua1: number, va1: number, faces: string): void => {
    const xa = U(ua0) - 0.45, xc = U(ua1) + 0.45, zn = V(va1) - 0.45, zs = V(va0) + 0.45;
    b.box(xa, TOP, zn, xc, EAVE, zs, PANEL, { faces: faces + 'B' });
    hip(b, xa, zn, xc, zs, EAVE, RISE, SIEBEL_ROOF, 0.12);
  };
  roof(0, 0, 21, 5, 'NESW');
  // (the wings' eaves begin where the south range's end, so that no two undersides lie in one plane)
  {
    const xa = U(0) - 0.45, xc = U(uw) + 0.45, zn = V(13) - 0.45, zs = V(5) - 0.45;
    b.box(xa, TOP, zn, xc, EAVE, zs, PANEL, { faces: 'NEWB' });
    hip(b, xa, zn, xc, V(5) + 0.45, EAVE, RISE * 0.9, SIEBEL_ROOF, 0.12);
    const ea = U(ue) - 0.45, ec = U(21) + 0.45, en = V(ve) - 0.45;
    b.box(ea, TOP, en, ec, EAVE, zs, PANEL, { faces: 'NEWB' });
    hip(b, ea, en, ec, V(5) + 0.45, EAVE, RISE * 0.9, SIEBEL_ROOF, 0.12);
  }
  {
    // the flat roof over the atrium, a parapet along its glass, and a ridge of glass that lights it
    const p = (u: number, v: number): V3 => [U(u), TOP, V(v)];
    const s = vd + (0.4 * (ve - vd)) / (ue - uw), sE = ve - (0.4 * (ve - vd)) / (ue - uw);
    b.up(p(uw + 0.4, 5), p(ue - 0.4, 5), p(ue - 0.4, sE), FELT);
    b.up(p(uw + 0.4, 5), p(ue - 0.4, sE), p(uw + 0.4, s), FELT);
    const mx = (U(ue) + U(uw)) / 2, mz = (V(ve) + V(vd)) / 2, yaw = Math.atan2(dz, dx);
    b.obox(mx, TOP + 0.25, mz, dl / 2 - 0.5, 0.25, 0.1, yaw, PANEL);
    const ix = mx - dn[0] * 1.3, iz = mz - dn[1] * 1.3;
    b.obox(ix, TOP + 0.3, iz, dl / 2 - 1.8, 0.3, 0.55, yaw, GLASS, { win: interior(1.2) });
    k.glows.push({ x: ix, y: TOP - 0.4, z: iz, sx: 2, sy: 0.2, sz: 1, color: '#fff1d8' });
  }
  k.lights.push({ x: U(13), z: V(ve) - 3, r: 10, color: '#e9f2ff', k: 0.45 });
  k.lights.push({ x: U(15), z: z1 + 2.5, r: 10, color: '#ffe9c4', k: 0.4 });

  // --- the finer things: mullions on the glass, seams on the roof, sunshades on the east, bicycles at the door ---
  /** Upright mullions along a wall of glass from (xa, za) to (xc, zc), facing n, from y0 to y1. */
  const mullions = (xa: number, za: number, xc: number, zc: number, n: [number, number], y0: number, y1: number, step = 1.6): void => {
    const len = Math.hypot(xc - xa, zc - za), cnt = Math.floor(len / step), yaw = Math.atan2(zc - za, xc - xa);
    for (let i = 1; i < cnt; i++) {
      const t = i / cnt, x = xa + (xc - xa) * t + n[0] * 0.08, z = za + (zc - za) * t + n[1] * 0.08;
      b.obox(x, (y0 + y1) / 2, z, 0.05, (y1 - y0) / 2, 0.06, yaw, MULLION);
    }
  };
  mullions(U(0), V(0), U(ua), V(0), [0, 1], MID, TOP);
  mullions(U(ut), V(0), U(21), V(0), [0, 1], MID, MID + S_STY - 0.1);
  mullions(U(ut), V(0), U(21), V(0), [0, 1], MID + S_STY, TOP);
  mullions(U(21), V(0), U(21), V(ve), [1, 0], MID, TOP);
  mullions(U(0), V(0), U(0), V(13), [-1, 0], MID, TOP);
  mullions(U(ue), V(ve), U(uw), V(vd), dn, 0, TOP, 1.4);
  mullions(U(21), V(ve), U(ue), V(ve), [0, -1], 0, TOP, 1.4);
  mullions(U(uw), V(vd), U(uw), V(13), [1, 0], 0, TOP, 1.4);
  {
    // seams on the south slope of the long roof
    const xa = U(0) - 0.45, xc = U(21) + 0.45, zs = V(0) + 0.45, run = (V(0) + 0.45 - (V(5) - 0.45)) / 2, len = Math.hypot(run, RISE);
    const nS: V3 = [0, run / len, RISE / len];
    for (let x = xa + run + 0.9; x < xc - run - 0.5; x += 1.2) {
      b.quad([x - 0.04, EAVE + 0.03, zs + 0.03], [x + 0.04, EAVE + 0.03, zs + 0.03], [x + 0.04, EAVE + RISE + 0.03, zs - run + 0.03], [x - 0.04, EAVE + RISE + 0.03, zs - run + 0.03], nS, 0x8b939b);
    }
  }
  b.box(U(21), MID + S_STY - 0.1, V(ve) + 0.3, U(21) + 0.6, MID + S_STY, V(0) - 0.3, MULLION, { faces: 'NSETB' });
  for (const v of [0.8, 4.6, 8.8]) b.box(U(21), MID + S_STY - 0.1, V(v) - 0.04, U(21) + 0.6, MID + S_STY + 0.5, V(v) + 0.04, MULLION, { faces: 'ENS' });
  // a ring round the top of the copper drum
  {
    const t = 0.72, cxd = U(ue) + t * dx + dn[0] * 0.3, czd = V(ve) + t * dz + dn[1] * 0.3;
    b.cyl(cxd, czd, TOP + 0.8, TOP + 1.0, 1.7, 1.7, 12, 0x5e8f80, { cap: VERDIGRIS });
  }
  // bicycles in a rack beside the entrance walk, and two planters
  for (let i = 0; i < 4; i++) {
    const x = x0 - 0.9, z = z1 + 2.2 + i * 0.75;
    for (const dz2 of [-0.55, 0.55]) b.box(x - 0.04, 0, z + dz2 - 0.32, x + 0.04, 0.64, z + dz2 + 0.32, 0x2b2d33, { faces: 'NESWT' });
    b.box(x - 0.03, 0.45, z - 0.5, x + 0.03, 0.6, z + 0.5, [0xc23a2e, 0x2f66b3, 0x3f8f5a, 0xe0b23a][i], { faces: 'NESWT' });
  }
  for (const x of [U(ut) + 0.6, U(9.2)]) {
    b.box(x - 0.5, 0, z1 + 0.4, x + 0.5, 0.55, z1 + 1.1, BUFF);
    b.box(x - 0.42, 0.55, z1 + 0.48, x + 0.42, 0.75, z1 + 1.02, 0x5c8f4a, { faces: 'NESWT' });
  }
}

// ---------------------------------------------------------------------------
// The car teams' workshop, and its forecourt
// ---------------------------------------------------------------------------

/** A tyre lying flat, or standing on its edge if `edge` is set. */
function tyre(k: Build, x: number, y: number, z: number, r = 0.42): void {
  k.b.cyl(x, z, y, y + 0.3, r, r, 6, 0x1c1c20, { cap: 0x2b2b30 });
}

/** A cone, for marking out a course. */
function cone(k: Build, x: number, z: number): void {
  k.b.box(x - 0.24, 0, z - 0.24, x + 0.24, 0.05, z + 0.24, 0xe8641e);
  k.b.cyl(x, z, 0.05, 0.62, 0.2, 0.03, 4, 0xf07a26, { cap: false });
  k.b.cyl(x, z, 0.3, 0.38, 0.13, 0.11, 4, 0xf4f2ec, { cap: false });
}

/**
 * The solar car: a low flat teardrop covered in dark blue cells, on a white
 * skirt, with a small bubble for the driver near its nose. It lies along x,
 * its nose to the east, on low stands. (x, z) is its middle.
 */
function solarCar(k: Build, x: number, z: number, len: number, wid: number): void {
  const b = k.b, h = len / 2, w = wid / 2, CELL = 0x1f3566, SKIRT = 0xf1f0ec;
  const plan: XZ[] = [];
  // a teardrop: round at the nose, tapering to the tail
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI;
    plan.push([x + h * 0.45 + Math.cos(a) * h * 0.55, z + Math.sin(a) * w]);
  }
  plan.push([x - h * 0.55, z + w * 0.62], [x - h, z + w * 0.18], [x - h, z - w * 0.18], [x - h * 0.55, z - w * 0.62]);
  const y0 = 0.55, y1 = 0.9;
  prism(b, plan, y0, y1, SKIRT, { top: CELL });
  // the underside
  const under = plan.map(([px, pz]): [number, number, number] => [px, y0, pz]);
  for (let i = 1; i + 1 < under.length; i++) tri(b, under[0], under[i], under[i + 1], [0, -1, 0], SKIRT);
  // lines between the cells, a hair over the top
  for (const f of [-0.5, 0, 0.5]) b.box(x - h * 0.85, y1, z + f * w - 0.03, x + h * 0.9, y1 + 0.015, z + f * w + 0.03, 0x5f7bb3, { faces: 'T' });
  for (const f of [-0.6, -0.2, 0.2, 0.6]) b.box(x + f * h - 0.03, y1, z - w * 0.8, x + f * h + 0.03, y1 + 0.015, z + w * 0.8, 0x5f7bb3, { faces: 'T' });
  // the bubble, on the north side of the nose
  const bx = x + h * 0.45, bz = z - w * 0.35;
  b.cyl(bx, bz, y1, y1 + 0.35, 0.5, 0.36, 8, 0x2a3644, { cap: false });
  b.cyl(bx, bz, y1 + 0.35, y1 + 0.55, 0.36, 0.05, 8, 0x3c5266);
  // three wheels in fairings, and the stands it rests on
  for (const [ax, az] of [[x + h * 0.6, z - w * 0.55], [x + h * 0.6, z + w * 0.55], [x - h * 0.75, z]] as const) {
    b.box(ax - 0.42, 0.1, az - 0.14, ax + 0.42, y0, az + 0.14, SKIRT);
    b.box(ax - 0.35, 0, az - 0.09, ax + 0.35, 0.1, az + 0.09, 0x1c1c20, { faces: 'NESWT' });
  }
}

/**
 * The formula car: a narrow nose and tub, sidepods, a wing at each end, four
 * big wheels out in the open and a hoop over the driver's head. It points
 * south, out of the workshop's door. (x, z) is its middle.
 */
function formulaCar(k: Build, x: number, z: number): void {
  const b = k.b, BODY = 0xf2f1ed, TRIM2 = 0xd8502a, CARBON = 0x2a2c31, half = 2.3;
  // the nose and the tub
  b.box(x - 0.32, 0.3, z + 0.6, x + 0.32, 0.72, z + half - 0.05, BODY, { faces: 'NESWTB' });
  b.box(x - 0.5, 0.25, z - 1.4, x + 0.5, 0.95, z + 0.6, BODY, { faces: 'NESWTB' });
  b.box(x - 0.34, 0.95, z - 0.4, x + 0.34, 1.0, z + 0.35, CARBON, { faces: 'T' });
  // the sidepods, with a stripe
  for (const s of [-1, 1]) {
    b.box(x + s * 0.5, 0.25, z - 1.2, x + s * 0.95, 0.75, z + 0.3, BODY, { faces: 'NESWT' });
    b.box(x + s * 0.95, 0.4, z - 1.0, x + s * 0.97, 0.6, z + 0.2, TRIM2, { faces: s > 0 ? 'E' : 'W' });
  }
  // the engine cover, the hoop, the wings
  b.box(x - 0.3, 0.95, z - 1.9, x + 0.3, 1.25, z - 0.4, BODY, { faces: 'NESWT' });
  b.box(x - 0.36, 0.95, z - 0.45, x + 0.36, 1.45, z - 0.35, CARBON, { faces: 'NESWT' });
  b.box(x - 1.0, 0.12, z + half - 0.35, x + 1.0, 0.22, z + half, TRIM2, { faces: 'NESWTB' });
  b.box(x - 0.85, 1.35, z - half, x + 0.85, 1.5, z - half + 0.45, TRIM2, { faces: 'NESWTB' });
  for (const s of [-1, 1]) b.box(x + s * 0.85 - 0.04, 0.55, z - half, x + s * 0.85 + 0.04, 1.5, z - half + 0.5, CARBON, { faces: 'NESWT' });
  // the wheels
  for (const wz of [z + 1.3, z - 1.5]) for (const s of [-1, 1]) {
    const wx = x + s * 1.18;
    b.box(wx - 0.22, 0, wz - 0.42, wx + 0.22, 0.84, wz + 0.42, 0x1c1c20, { faces: 'NESWT' });
    b.box(wx + s * 0.22, 0.25, wz - 0.2, wx + s * 0.24, 0.59, wz + 0.2, 0xb9bcc2, { faces: s > 0 ? 'E' : 'W' });
  }
}

/** A plain workshop of brick and metal sheet, three roller doors open on the south, lit inside, and the forecourt the cars are rolled out on. */
function carTeams(k: Build, l: LotDef): void {
  const b = k.b, { x0, z0, x1, z1 } = l;
  const BRK = 2.6, EAVE = Math.min(l.h - 0.4, 8.1), RISE = 1.0, DOOR = 5.0, deep = 5;
  const inner = z1 - deep;
  // the doors, as [from, to] along x
  const W = x1 - x0;
  const doors: [number, number][] = [[x0 + 0.6, x0 + 0.6 + 3.4], [x0 + W / 2 - 1.8, x0 + W / 2 + 1.8], [x1 - 0.6 - 3.4, x1 - 0.6]];

  // the shell: brick below, sheet above, on the north, east and west
  b.box(x0, 0, z0, x1, BRK, z1, BRICK.red, { faces: 'NEW', win: { cell: 2.4, storey: BRK, lit: 0.35, kind: 4 } });
  b.box(x0, BRK, z0, x1, EAVE, z1, SHEET, { faces: 'NEW' });
  b.box(x0 - 0.05, BRK - 0.05, z0 - 0.05, x1 + 0.05, BRK + 0.12, z1 + 0.05, SHEET_DARK, { faces: 'NEW' });
  // a row of high windows on the east side
  b.box(x1, 5.6, z0 + 1, x1 + 0.05, 6.6, z1 - 1, GLASS, { faces: 'E', win: interior(0.9) });
  for (let z = z0 + 2.6; z < z1 - 1; z += 1.6) b.box(x1 + 0.05, 5.6, z - 0.06, x1 + 0.1, 6.6, z + 0.06, SHEET_DARK, { faces: 'ENS' });
  // the south wall, between and over the doors
  let at = x0;
  for (const [a, c] of [...doors, [x1, x1] as [number, number]]) {
    if (c > at && a > at) {
      b.box(at, 0, z1 - 0.3, a, BRK, z1, BRICK.red, { faces: 'SN' });
      b.box(at, BRK - 0.05, z1, a, BRK + 0.12, z1 + 0.05, SHEET_DARK, { faces: 'SEWTB' });
      b.box(at, BRK, z1 - 0.3, a, EAVE, z1, SHEET, { faces: 'SN' });
    }
    if (a < c) b.box(a, DOOR, z1 - 0.3, c, EAVE, z1, SHEET, { faces: 'SNB' });
    at = c;
  }
  // the doors rolled up, each a drum over its opening, and a jamb either side
  for (const [a, c] of doors) {
    b.box(a - 0.1, DOOR, z1, c + 0.1, DOOR + 0.55, z1 + 0.35, SHEET_DARK, { faces: 'SEWTB' });
    for (const x of [a, c]) b.box(x - 0.1, 0, z1 - 0.32, x + 0.1, DOOR, z1 + 0.08, 0xd2b13a, { faces: 'SEW' });
  }
  // the roof: a shallow gable along the building, and two fans on it
  gable(b, x0, z0, x1, z1, EAVE, RISE, 0x8f9aa3, SHEET, 'x', 0.3);
  for (const x of [x0 + 4, x1 - 4]) b.cyl(x, (z0 + z1) / 2 - 1.8, EAVE + 0.3, EAVE + 1.1, 0.55, 0.55, 8, SHEET_DARK);

  // --- inside: a lit hall behind the doors ---
  const lit = { win: interior(1.4) };
  const ix0 = x0 + 0.2, ix1 = x1 - 0.2, ceil = DOOR + 0.4;
  b.quad([ix0, 0.04, z1 - 0.3], [ix1, 0.04, z1 - 0.3], [ix1, 0.04, inner], [ix0, 0.04, inner], [0, 1, 0], 0x9c9a94);
  b.box(ix0, 0, inner - 0.2, ix1, ceil, inner, INSIDE, { faces: 'S', ...lit });
  b.box(ix0 - 0.2, 0, inner, ix0, ceil, z1 - 0.3, INSIDE, { faces: 'E', ...lit });
  b.box(ix1, 0, inner, ix1 + 0.2, ceil, z1 - 0.3, INSIDE, { faces: 'W', ...lit });
  b.box(ix0, ceil, inner, ix1, ceil + 0.2, z1 - 0.3, 0xcfcac0, { faces: 'B', ...lit });
  for (const [a, c] of doors) {
    k.glows.push({ x: (a + c) / 2, y: ceil - 0.1, z: z1 - deep / 2, sx: 2.4, sy: 0.08, sz: 0.25, color: '#f4f8ff' });
    k.lights.push({ x: (a + c) / 2, z: z1 + 0.8, r: 5, color: '#f4f8ff', k: 0.5 });
  }
  // benches along the back wall, with vices and tools on a board over them
  for (const [a, c] of doors) {
    b.box(a + 0.2, 0, inner, c - 0.2, 1.0, inner + 0.75, 0x8b6b4a);
    b.box(a + 0.3, 1.6, inner, c - 0.3, 2.8, inner + 0.06, 0x6f8db0, { faces: 'S' });
  }
  // behind the middle door, the formula car's sister on stands, its wheels off
  {
    const [a, c] = doors[1], mx = (a + c) / 2, mz = inner + 2.6;
    b.box(mx - 0.4, 0.75, mz - 1.9, mx + 0.4, 1.3, mz + 1.6, 0xd8502a, { faces: 'NESWT' });
    b.box(mx - 0.85, 0.75, mz - 1.0, mx + 0.85, 1.15, mz + 0.4, 0xd8502a, { faces: 'NESWT' });
    for (const [sx, sz] of [[-0.7, -1.5], [0.7, -1.5], [-0.7, 1.2], [0.7, 1.2]]) b.box(mx + sx - 0.12, 0, mz + sz - 0.12, mx + sx + 0.12, 0.75, mz + sz + 0.12, 0xd2b13a, { faces: 'NESW' });
    tyre(k, c - 0.6, 0, z1 - 0.9);
    tyre(k, c - 0.6, 0.3, z1 - 0.9);
  }
  // behind the east door, shelves of tyres
  {
    const [a, c] = doors[2];
    for (const y of [0.05, 1.05]) {
      b.box(a + 0.3, y, inner + 0.05, c - 0.3, y + 0.08, inner + 1.0, IRON, { faces: 'STB' });
      for (let x = a + 0.85; x < c - 0.5; x += 0.95) tyre(k, x, y + 0.08, inner + 0.55, 0.4);
    }
  }
  // behind the west door, the solar car's shell on trestles
  {
    const [a, c] = doors[0], mx = (a + c) / 2;
    b.box(mx - 1.4, 0, inner + 2.2, mx - 1.2, 0.8, inner + 2.6, 0xd2b13a, { faces: 'NESW' });
    b.box(mx + 1.2, 0, inner + 2.2, mx + 1.4, 0.8, inner + 2.6, 0xd2b13a, { faces: 'NESW' });
    b.box(mx - 1.6, 0.8, inner + 1.8, mx + 1.6, 0.95, inner + 3.0, 0x1f3566, { faces: 'NESWT' });
  }

  // --- its boards: what is done here, over the doors ---
  board(k, 'engineering-solar', (doors[0][0] + doors[0][1]) / 2, DOOR + 1.15, z1, 'S', 0.5, 3.2);
  board(k, 'engineering-formula', (doors[1][0] + doors[1][1]) / 2, DOOR + 1.15, z1, 'S', 0.5, 3.2);

  // --- the forecourt: concrete, from the doors to the lawn by Green Street, and round the Siebel Center's corner ---
  const siebelLot = lot('siebel');
  const fz1 = Math.min(z1 + 6.4, -89.6);
  area(k, [[siebelLot.x1 - 5, siebelLot.z1 + 0.6], [x0 - 0.2, siebelLot.z1 + 0.6], [x0 - 0.2, z1], [x1, z1], [x1, fz1], [siebelLot.x1 - 5, fz1]], CONCRETE, 0.035);
  // paint: a box marked out for rolling a car out to
  b.box(siebelLot.x1 - 4.5, 0.035, fz1 - 0.56, x1 - 0.3, 0.05, fz1 - 0.44, 0xf2efe6, { faces: 'T' });
  b.box(x0, 0.035, z1 + 0.44, x1 - 0.3, 0.05, z1 + 0.56, 0xf2efe6, { faces: 'T' });

  // the solar car, west of the hero's place, in front of the Siebel Center's corner, and the formula car rolled out of the west door
  const sx = siebelLot.x1 - 0.4, sz = (z1 + fz1) / 2 + 0.6;
  solarCar(k, sx, sz, 7.0, 2.6);
  const fx = x0 + 0.3, fz = z1 + 2.5;
  formulaCar(k, fx, fz);
  // a tool chest, a stack of tyres, cones
  b.box(siebelLot.x1 + 0.4, 0, z1 + 0.4, siebelLot.x1 + 1.4, 1.25, z1 + 0.95, 0xc23a2e);
  for (let i = 0; i < 4; i++) b.box(siebelLot.x1 + 0.48, 0.2 + i * 0.26, z1 + 0.95, siebelLot.x1 + 1.32, 0.24 + i * 0.26, z1 + 0.98, 0xd9d9d9, { faces: 'S' });
  for (let i = 0; i < 4; i++) tyre(k, siebelLot.x1 + 2.4, i * 0.3, z1 + 0.75, 0.42);
  for (const [cx, cz] of [[siebelLot.x1 - 4.3, fz1 - 0.6], [siebelLot.x1 - 1.5, fz1 - 0.5], [siebelLot.x1 + 1.5, fz1 - 0.6], [x0 + 1.4, fz1 - 0.5]]) cone(k, cx, cz);
  // the team at work
  k.person(sx + 1.2, sz + 2.0);
  k.person(sx - 2.2, sz + 1.9);
  k.person(fx + 1.6, fz - 0.4);
  k.person(fx - 0.3, fz + 3.1);
  k.person(siebelLot.x1 + 0.9, z1 + 1.5);
  // and light for them at night
  k.lights.push({ x: (x0 + x1) / 2, z: z1 + 3, r: 13, color: '#f4f4ff', k: 0.6 });
  k.lights.push({ x: sx, z: sz, r: 9, color: '#ffe2ae', k: 0.45 });
  for (const [a, c] of doors) k.glows.push({ x: (a + c) / 2, y: DOOR + 0.75, z: z1 + 0.45, sx: 0.5, sy: 0.18, sz: 0.2, color: '#ffe2ae' });
}

// ---------------------------------------------------------------------------
// Everitt and Talbot laboratories
// ---------------------------------------------------------------------------

/** A few vents and a box of plant on a flat roof at `y`. */
function plant(k: Build, x0: number, z0: number, x1: number, z1: number, y: number, seed: number): void {
  const r = rng(seed), b = k.b;
  const px = x0 + (x1 - x0) * (0.25 + r() * 0.2), pz = z0 + (z1 - z0) * (0.3 + r() * 0.2);
  b.box(px - 1.4, y, pz - 0.9, px + 1.4, y + 0.75, pz + 0.9, 0x9ea4aa);
  b.box(px - 1.2, y + 0.75, pz - 0.7, px + 1.2, y + 0.8, pz + 0.7, 0x6d737a, { faces: 'T' });
  for (let i = 0; i < 3; i++) {
    const vx = x0 + 1 + r() * (x1 - x0 - 2), vz = z0 + 1 + r() * (z1 - z0 - 2);
    if (Math.abs(vx - px) < 2 && Math.abs(vz - pz) < 1.5) continue;
    b.cyl(vx, vz, y, y + 0.7 + r() * 0.3, 0.2, 0.2, 6, 0xb5b9bd);
  }
}

/** Everitt Laboratory: a plain box of red brick of 1949, three storeys, a stone frame round its door on Green Street, plant on its flat roof. */
function everitt(k: Build, l: LotDef): void {
  const b = k.b, { x0, z0, x1, z1 } = l, cx = (x0 + x1) / 2;
  const WALL = 3 * STOREY, front = z1 - 0.35, roof = Math.min(l.h, WALL + 0.45);
  b.box(x0, 0, z0, x1, WALL, front, BRICK.red, { win: HALL, seed: 0.71, faces: 'NESW' });
  trims(k, x0, z0, x1, front, { plinth: 0.7, belts: [STOREY] });
  b.box(x0 - 0.15, WALL, z0 - 0.15, x1 + 0.15, roof, front + 0.15, LIMESTONE, { faces: 'NESWB', top: FELT });
  // the entrance bay, a little forward, in a tall frame of stone
  b.box(cx - 2.2, 0, front - 0.05, cx + 2.2, WALL, z1, BRICK.red, { faces: 'SEW' });
  b.box(cx - 1.4, 0, z1, cx + 1.4, 2 * STOREY + 0.3, z1 + 0.15, LIMESTONE, { faces: 'SEWT' });
  b.box(cx - 1.0, 0, z1 + 0.15, cx + 1.0, 2 * STOREY, z1 + 0.2, GLASS, { faces: 'SEWT', win: interior(1.0) });
  b.box(cx - 1.0, 2.3, z1 + 0.2, cx + 1.0, 2.5, z1 + 0.26, LIMESTONE, { faces: 'STB' });
  b.box(cx - 0.8, 0, z1 + 0.2, cx + 0.8, 2.3, z1 + 0.24, DARK, { faces: 'S', win: interior(1.4) });
  board(k, 'engineering-everitt', cx, 2 * STOREY + 1.2, z1, 'S', 0.45, 4.2);
  plant(k, x0, z0, x1, front, roof, 4101);
  for (const s2 of [-1, 1]) b.box(cx + s2 * 2.2 - 0.2, 0.7, z1 - 0.05, cx + s2 * 2.2 + 0.2, WALL, z1 + 0.1, LIMESTONE, { faces: 'SEW' });
  b.box(x1 - 3.6, roof, z0 + 1.0, x1 - 1.0, roof + 1.1, z0 + 3.4, BRICK.red);
  b.box(x1 - 3.7, roof + 1.1, z0 + 0.9, x1 - 0.9, roof + 1.25, z0 + 3.5, LIMESTONE);
  k.lights.push({ x: cx, z: z1 + 1.8, r: 8, color: '#ffe2ae', k: 0.45 });
  k.person(cx - 1.8, z1 + 0.7);
}

/**
 * Talbot Laboratory: red brick and stone, three storeys in two wings, with the
 * high bay of its testing hall between them under a ridge of clerestory glass,
 * and tall windows down its front to the creek.
 */
function talbot(k: Build, l: LotDef): void {
  const b = k.b, { x0, z0, x1, z1 } = l, cx = (x0 + x1) / 2;
  const WALL = 3 * STOREY, roof = Math.min(l.h, WALL + 0.45), wingW = 3.6;
  for (const [a, c] of [[x0, x0 + wingW], [x1 - wingW, x1]]) {
    b.box(a, 0, z0, c, WALL, z1, BRICK.deep, { win: HALL_NARROW, seed: 0.81, faces: 'NESW' });
    trims(k, a, z0, c, z1, { plinth: 0.6 });
    b.box(a - 0.15, WALL, z0 - 0.15, c + 0.15, roof, z1 + 0.15, LIMESTONE, { faces: 'NESWB', top: FELT });
    plant(k, a, z0, c, z1, roof, 5100 + a);
  }
  // the high bay, set back a little, with tall windows and a door
  const ma = x0 + wingW, mc = x1 - wingW, mz = z1 - 0.5;
  b.box(ma, 0, z0, mc, WALL, mz, BRICK.deep, { faces: 'S' });
  b.box(ma, 0, z0, mc, WALL, mz, BRICK.deep, { faces: 'N', win: HALL_NARROW, seed: 0.82 });
  b.box(ma - 0.05, WALL - 0.4, z0 - 0.1, mc + 0.05, WALL, mz + 0.1, LIMESTONE, { faces: 'NSB' });
  for (const s of [-1, 1]) {
    const x = cx + s * 1.0;
    b.box(x - 0.6, 1.0, mz, x + 0.6, WALL - 1.0, mz + 0.08, GLASS, { faces: 'SEWT', win: interior(0.9) });
    for (const y of [3.2, 5.4]) b.box(x - 0.6, y, mz + 0.08, x + 0.6, y + 0.1, mz + 0.12, LIMESTONE, { faces: 'STB' });
  }
  b.box(cx - 0.4, 0, mz, cx + 0.4, 2.2, mz + 0.1, DARK, { faces: 'SEWT', win: interior(1.2) });
  // its roof: a clerestory of glass, and over that a low pitched roof
  b.box(ma + 0.3, WALL, z0 + 0.4, mc - 0.3, WALL + 0.6, mz - 0.4, GLASS, { faces: 'NESW', win: interior(1.0) });
  gable(b, ma + 0.1, z0 + 0.2, mc - 0.1, mz - 0.2, WALL + 0.6, 0.8, SLATE, LIMESTONE, 'z', 0.2);
  board(k, 'engineering-talbot', cx, WALL - 0.2, mz + 0.1, 'S', 0.42, mc - ma - 0.3);
  k.lights.push({ x: cx, z: z1 + 1.5, r: 8, color: '#ffe2ae', k: 0.4 });
}

// ---------------------------------------------------------------------------
// The laboratories south of Green Street
// ---------------------------------------------------------------------------

/** A long low range of laboratories, two storeys of red brick, with skylights and vent stacks on the roof and loading doors at the back. */
function labsNe(k: Build, l: LotDef): void {
  const b = k.b, { x0, z0, x1, z1 } = l, cx = (x0 + x1) / 2;
  const WALL = 2 * STOREY, roof = Math.min(l.h - 0.3, WALL + 0.9);
  b.box(x0, 0, z0, x1, WALL, z1, BRICK.red, { win: { ...HALL, cell: 2.2 }, seed: 0.91, faces: 'NESW' });
  trims(k, x0, z0, x1, z1, { plinth: 0.6, belts: [STOREY] });
  b.box(x0 - 0.1, WALL, z0 - 0.1, x1 + 0.1, roof, z1 + 0.1, BRICK.deep, { faces: 'NESW', top: FELT });
  b.box(x0 - 0.18, roof, z0 - 0.18, x1 + 0.18, roof + 0.18, z1 + 0.18, LIMESTONE, { faces: 'NESWB', top: FELT });
  // its door on Green Street, under a small canopy
  b.box(cx - 1.0, 0, z0 - 0.08, cx + 1.0, 2.4, z0, DARK, { faces: 'NEW', win: interior(1.3) });
  b.box(cx - 1.6, 2.5, z0 - 1.0, cx + 1.6, 2.75, z0, TRIM, { faces: 'NEWTB' });
  // the loading doors at the back, a dock, and a skip
  for (const f of [0.18, 0.5, 0.82]) {
    const x = x0 + (x1 - x0) * f;
    b.box(x - 1.4, 0, z1, x + 1.4, 3.2, z1 + 0.08, 0xa9afb4, { faces: 'SEWT' });
    for (let y = 0.4; y < 3.2; y += 0.4) b.box(x - 1.4, y, z1 + 0.08, x + 1.4, y + 0.05, z1 + 0.11, 0x8f969c, { faces: 'ST' });
    b.box(x - 1.7, 0, z1, x + 1.7, 0.9, z1 + 1.2, CONCRETE, { faces: 'SEWT' });
    k.glows.push({ x, y: 3.5, z: z1 + 0.2, sx: 0.35, sy: 0.15, sz: 0.2, color: '#ffe2ae' });
  }
  b.box(x1 - 2.1, 0, z1 + 0.3, x1 - 0.1, 1.2, z1 + 1.4, 0x3f6b4a);
  // skylights, ridges of glass along the roof, and vent stacks
  for (const f of [0.15, 0.38, 0.62, 0.85]) {
    const x = x0 + (x1 - x0) * f;
    gable(b, x - 1.4, z0 + 2.5, x + 1.4, z1 - 2.5, roof + 0.18, 0.7, GLASS, 0x9ea4aa, 'x', 0.05, { win: interior(0.8) });
  }
  for (const f of [0.27, 0.5, 0.73]) {
    const x = x0 + (x1 - x0) * f;
    for (const z of [z0 + 1.4, z1 - 1.4]) b.cyl(x, z, roof + 0.18, roof + 0.85, 0.22, 0.22, 6, 0xb5b9bd, { cap: 0x4a4f55 });
  }
  k.lights.push({ x: cx, z: z1 + 2, r: 10, color: '#ffe2ae', k: 0.4 });
}

// ---------------------------------------------------------------------------
// Boneyard Creek and the Bardeen Quad
// ---------------------------------------------------------------------------

/** A footbridge over the creek along z, its middle at x: a low arch of stone, rails, and its deck. */
function footbridge(k: Build, x: number, zn: number, zs: number): void {
  const b = k.b, zm = (zn + zs) / 2, ye = 0.45, ym = 0.8, half = 1.05;
  slab(b, [x, ye, zs], [x, ym, zm], half, 0.25, 0xd6cfbf, { under: STONE });
  slab(b, [x, ym, zm], [x, ye, zn], half, 0.25, 0xd6cfbf, { under: STONE });
  // a rail along each side, level, on a post at each end and one in the middle
  const ry = ym + 0.8;
  for (const s of [-1, 1]) {
    const rx = x + s * (half - 0.08);
    b.box(rx - 0.06, ry - 0.12, zn, rx + 0.06, ry, zs, RAIL, { faces: 'EWTB' });
    for (const [z, y] of [[zs, ye], [zm, ym], [zn, ye]]) b.box(rx - 0.06, y - 0.05, z - 0.06, rx + 0.06, ry - 0.12, z + 0.06, RAIL, { faces: s > 0 ? 'ENS' : 'WNS' });
  }
}

/** A park bench, facing south or north. */
function bench(k: Build, x: number, z: number, out: 1 | -1, color = 0x7a5a3a): void {
  const b = k.b;
  b.box(x - 0.8, 0.42, z - 0.22, x + 0.8, 0.5, z + 0.22, color, { faces: 'NESWTB' });
  b.box(x - 0.8, 0.5, z - out * 0.28, x + 0.8, 0.95, z - out * 0.2, color, { faces: 'NESWT' });
  for (const dx of [-0.65, 0.65]) b.box(x + dx - 0.06, 0, z - 0.2, x + dx + 0.06, 0.42, z + 0.2, IRON, { faces: 'NESW' });
}

export function extras(k: Build): void {
  const b = k.b;
  const creek = AREAS.find((a) => a.id === 'boneyard'), quad = AREAS.find((a) => a.id === 'bardeen-quad');
  if (!creek || !quad) return;
  const xa = 5, xb = creek.x1, zn = creek.z0, zs = creek.z1;

  // the deeper water down its middle, and its low stone edges
  area(k, rect(xa, zn + 1.0, xb, zs - 1.0), 0x4f93ba, 0.04);
  // (two courses of rough stone on each bank, the upper one set back from the water, as the banks are laid behind Engineering Hall)
  b.box(xa, 0, zn - 0.3, xb, 0.22, zn + 0.16, BASE, { faces: 'NESWT' });
  b.box(xa, 0.22, zn - 0.3, xb, 0.42, zn - 0.02, STONE, { faces: 'NESWT' });
  b.box(xa, 0, zs - 0.16, xb, 0.22, zs + 0.3, BASE, { faces: 'NESWT' });
  b.box(xa, 0.22, zs + 0.02, xb, 0.42, zs + 0.3, STONE, { faces: 'NESWT' });

  // three footbridges: between Everitt and Talbot, between Engineering Hall and Grainger, and by the Siebel Center
  const eh = lot('engineering-hall'), ev = lot('everitt'), gr = lot('grainger');
  const bridges = [(ev.x0 + ev.x1) / 2, (eh.x0 + eh.x1) / 2, Math.min(xb - 2, eh.x1 + 2)];
  for (const x of bridges) footbridge(k, x, zn - 0.5, zs + 0.5);
  // the walks to them across the lawn
  const ghx = (gr.x0 + gr.x1) / 2;
  area(k, rect(ghx - 1.1, gr.z1, ghx + 1.1, zn - 0.5), 0xd9d4c7, 0.035);
  area(k, rect(bridges[2] - 1.0, zs + 0.5, bridges[2] + 1.0, -89.3), 0xd9d4c7, 0.035);

  // benches on the south bank, facing the water, and people on the bridges and the banks
  for (const x of [quad.x0 + 2.5, eh.x1 - 1.2]) bench(k, x, zs + 0.95, -1);
  k.person(quad.x0 + 2.0, zs + 1.0);
  k.person(bridges[1] + 0.4, (zn + zs) / 2, 0.72);
  k.person(bridges[0] - 0.3, zs + 0.2, 0.4);
  k.person(bridges[2] + 1.6, zs + 1.4);

  // the bronze man on his bench in front of Grainger, with his laptop
  {
    const x = ghx - 4.2, z = gr.z1 + 0.6;
    bench(k, x, z, 1, STATUE);
    b.box(x - 0.15, 0.5, z - 0.2, x + 0.35, 1.45, z + 0.12, STATUE);
    b.box(x - 0.08, 1.45, z - 0.14, x + 0.28, 1.85, z + 0.18, STATUE);
    b.box(x - 0.15, 0.5, z + 0.12, x + 0.35, 0.72, z + 0.6, STATUE);
    b.box(x - 0.05, 0.72, z + 0.25, x + 0.45, 0.76, z + 0.6, 0x5b4628);
    b.box(x - 0.05, 0.76, z + 0.25, x + 0.45, 1.05, z + 0.29, 0x5b4628, { faces: 'NSEWT' });
  }

  // two lamps along the walk between the bridges, so the creek is not dark at night
  lantern(k, bridges[1] - 2.2, zs + 0.9, 0, 2.4, IRON);
  lantern(k, (bridges[0] + bridges[1]) / 2, zs + 0.9, 0, 2.4, IRON);
}

/** The models, by the id of their lot in plan.ts. */
export const MODELS: Record<string, Model> = {
  'engineering-hall': engineeringHall,
  grainger,
  siebel,
  'car-teams': carTeams,
  everitt,
  talbot,
  'labs-ne': labsNe,
};
