// The Six Pack: the halls of Ikenberry Commons, laid out round Wassaja Hall
// and the lawn before it.
//
// Four of the six halls of 1958 to 1961 still stand, and they are built alike:
// Hopkins, Weston, Scott and Snyder, each four storeys of brick round a
// courtyard of its own. Round them stand the new halls, each different:
// Nugent, Bousfield with its corner of glass, and Wassaja, with its row of
// weathered-steel baskets that are lit from inside at night and grow larger
// towards the door. Ikenberry Dining serves them all.
//
// It is move-in day: a car's place is kept before Wassaja's door for a hero,
// and what was in the car stands on the walk beside it.

import { interior, type BoxOpts, type GeoBuilder, type WinSpec } from '../../engine/geo';
import { area, rect } from '../../engine/ground';
import { lathe } from '../../engine/parts';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { BRICK, FELT, GLASS, LIMESTONE, ORANGE, TRIM } from './look';
import { AREAS, HERO_SPOTS, lot, type LotDef, type Model } from './plan';

/** A storey of a hall of residence. It is lower than the campus's 2.9, so that four storeys make a hall 9 high. */
const RES = 2.2;
/** Rows of bedroom windows, in the old halls and in the new, and a wall of glass for a lounge. */
const ROOMS: WinSpec = { cell: 1.35, storey: RES, lit: 0.42, kind: 0 };
const ROOMS_NEW: WinSpec = { cell: 1.75, storey: RES, lit: 0.5, kind: 0 };
const LOUNGE: WinSpec = { cell: 1.0, storey: RES, lit: 0.8, kind: 1 };
/** The cut pattern of Wassaja's baskets: small openings that light up at night. */
const PIERCED: WinSpec = { cell: 0.3, storey: 0.3, lit: 0.95, kind: 4 };

/** The brick of the old halls, and of each new one, with the dark metal and the weathered steel that go with them. */
const OLD = 0xa55a44, NUGENT = 0xb0624a, WASSAJA = 0x8e4a3a, BOUSFIELD = 0xb87550;
const METAL = 0x4b5058, PANEL = 0xcfc8b8, CORTEN = 0x9a5a34, CARDBOARD = 0xc9a36b;
const LAWN = 0x6fa85a, WALK = 0xd8d2c4;

type Side = 'N' | 'S' | 'E' | 'W';

/** A box against a wall that looks `out`: from `a0` to `a1` along the wall, and from `o0` to `o1` out from it. */
function against(b: GeoBuilder, out: Side, a0: number, a1: number, wall: number, o0: number, o1: number, y0: number, y1: number, color: number, o: BoxOpts = {}): void {
  const s = out === 'S' || out === 'E' ? 1 : -1;
  const lo = Math.min(wall + s * o0, wall + s * o1), hi = Math.max(wall + s * o0, wall + s * o1);
  if (out === 'N' || out === 'S') b.box(a0, y0, lo, a1, y1, hi, color, o);
  else b.box(lo, y0, a0, hi, y1, a1, color, o);
}

/** A place out from a wall that looks `out`: `a` along the wall and `o` out from it. */
const outFrom = (out: Side, a: number, wall: number, o: number): [number, number] =>
  out === 'N' ? [a, wall - o] : out === 'S' ? [a, wall + o] : out === 'E' ? [wall + o, a] : [wall - o, a];
const normal = (out: Side): [number, number] => (out === 'N' ? [0, -1] : out === 'S' ? [0, 1] : out === 'E' ? [1, 0] : [-1, 0]);

/** A thin band right round a rectangle of walls at height `y`, `out` proud of them. */
function belt(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, half: number, out: number, color: number): void {
  const o: BoxOpts = { faces: 'NESWTB' };
  b.box(x0 - out, y - half, z0 - out, x1 + out, y + half, z0, color, o);
  b.box(x0 - out, y - half, z1, x1 + out, y + half, z1 + out, color, o);
  b.box(x0 - out, y - half, z0, x0, y + half, z1, color, o);
  b.box(x1, y - half, z0, x1 + out, y + half, z1, color, o);
}

/** A low wall round the edge of a flat roof at height `y`, with a cap of stone. */
function parapet(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, h: number, color: number, cap = LIMESTONE): void {
  const t = 0.28;
  b.box(x0, y, z0, x1, y + h, z0 + t, color, { top: cap });
  b.box(x0, y, z1 - t, x1, y + h, z1, color, { top: cap });
  b.box(x0, y, z0 + t, x0 + t, y + h, z1 - t, color, { faces: 'EWT', top: cap });
  b.box(x1 - t, y, z0 + t, x1, y + h, z1 - t, color, { faces: 'EWT', top: cap });
}

/**
 * A door into a hall, in a wall that looks `out`: a lobby of glass that is lit
 * at night, a flat canopy over it that reaches `reach` out, and the hall's
 * name on a board above.
 */
function entrance(k: Build, out: Side, c: number, wall: number, w: number, sign: string | null, reach = 1.2): void {
  const b = k.b;
  against(b, out, c - w / 2, c + w / 2, wall, 0, 0.28, 0, RES - 0.25, GLASS, { win: interior(1.25) });
  against(b, out, c - w / 2 - 0.45, c + w / 2 + 0.45, wall, 0, reach, RES - 0.2, RES - 0.02, METAL, { faces: 'NESWTB' });
  const [lx, lz] = outFrom(out, c, wall, reach + 0.8);
  k.lights.push({ x: lx, z: lz, r: 7, color: '#ffe2ae', k: 0.5 });
  if (sign) {
    const [sx, sz] = outFrom(out, c, wall, 0.08), [nx, nz] = normal(out);
    k.sign(sign, sx, RES + 0.62, sz, nx, nz, 0.6, w + 2.4);
  }
}

const board = (id: string, text: string): SignDef => ({ id: `six-pack-${id}`, lines: [text], color: '#f3f0e7', ink: '#13294b', aspect: Math.max(2.4, text.length * 0.6), kind: 'board', real: true, size: [Math.round(52 * Math.max(2.4, text.length * 0.6)), 52] });

export const SIGNS: SignDef[] = [
  board('wassaja', 'WASSAJA HALL'), board('nugent', 'NUGENT HALL'), board('bousfield', 'BOUSFIELD HALL'),
  board('hopkins', 'HOPKINS HALL'), board('weston', 'WESTON HALL'), board('scott', 'SCOTT HALL'), board('snyder', 'SNYDER HALL'),
  board('dining', 'IKENBERRY DINING CENTER'),
  // the board on the walk on move-in day
  { id: 'six-pack-move-in', lines: ['MOVE-IN', 'DAY'], color: '#f26a21', ink: '#ffffff', aspect: 1.5, kind: 'board', size: [120, 80] },
];

// ---------------------------------------------------------------------------
// The four old halls
// ---------------------------------------------------------------------------

/**
 * One of the four halls that are left of the six: four ranges of brick round a
 * courtyard, with a band of stone at every floor, a flat roof, and a tower of
 * stairs at two of its corners. `door` is the side its lobby is on.
 */
function oldHall(id: string, door: Side, seed: number): Model {
  return (k, l) => {
    const b = k.b;
    const { x0, z0, x1, z1 } = l, floors = Math.round(l.h / RES), H = floors * RES, d = 2.3;
    // the four ranges, each with its own piece of the roof
    b.box(x0, 0, z0, x1, H, z0 + d, OLD, { win: ROOMS, seed, faces: 'NESWT', top: FELT });
    b.box(x0, 0, z1 - d, x1, H, z1, OLD, { win: ROOMS, seed: seed + 0.21, faces: 'NESWT', top: FELT });
    b.box(x0, 0, z0 + d, x0 + d, H, z1 - d, OLD, { win: ROOMS, seed: seed + 0.43, faces: 'EWT', top: FELT });
    b.box(x1 - d, 0, z0 + d, x1, H, z1 - d, OLD, { win: ROOMS, seed: seed + 0.67, faces: 'EWT', top: FELT });
    // a band of stone at each floor, and a low wall round the roof
    for (let f = 1; f < floors; f++) belt(b, x0, z0, x1, z1, f * RES, 0.07, 0.06, LIMESTONE);
    b.box(x0 - 0.05, 0, z0 - 0.05, x1 + 0.05, 0.4, z1 + 0.05, LIMESTONE, { faces: 'NESW' });
    parapet(b, x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05, H, 0.3, OLD);
    // the stairs: a plain tower at the north-west corner and one at the south-east, each with a strip of glass
    b.box(x0 - 0.12, 0, z0 - 0.12, x0 + 1.5, H + 0.75, z0 + 1.7, BRICK.deep, { top: FELT });
    b.box(x0 + 0.5, 1.0, z0 - 0.17, x0 + 0.95, H - 0.5, z0 - 0.12, GLASS, { faces: 'N', win: interior(0.8) });
    b.box(x1 - 1.5, 0, z1 - 1.7, x1 + 0.12, H + 0.75, z1 + 0.12, BRICK.deep, { top: FELT });
    b.box(x1 - 0.95, 1.0, z1 + 0.12, x1 - 0.5, H - 0.5, z1 + 0.17, GLASS, { faces: 'S', win: interior(0.8) });
    b.box(x1 + 0.12, 1.0, z1 - 1.1, x1 + 0.17, H - 0.5, z1 - 0.65, GLASS, { faces: 'E', win: interior(0.8) });
    // on the roof: vents, and the lift's head
    b.box(x0 + d + 0.6, H, z0 + 0.5, x0 + d + 2.2, H + 1.1, z0 + 1.8, 0xa39f97);
    for (const f of [0.3, 0.6]) b.box(x0 + 0.6, H, z0 + d + f * (z1 - z0 - 2 * d), x0 + 1.5, H + 0.5, z0 + d + f * (z1 - z0 - 2 * d) + 0.7, 0xb9bcc0);
    // the courtyard: a lawn, a walk across it, and two who have found it quiet
    const cx0 = x0 + d, cz0 = z0 + d, cx1 = x1 - d, cz1 = z1 - d;
    area(k, rect(cx0 + 0.25, cz0 + 0.25, cx1 - 0.25, cz1 - 0.25), LAWN, 0.035);
    area(k, rect((cx0 + cx1) / 2 - 0.3, cz0, (cx0 + cx1) / 2 + 0.3, cz1), WALK, 0.045);
    k.person(cx0 + 1.1, (cz0 + cz1) / 2);
    k.person(cx1 - 1.0, cz1 - 0.8);
    // its door, with its name over it
    const along = door === 'N' || door === 'S';
    const c = along ? (x0 + x1) / 2 + (door === 'S' ? 1.2 : -1.2) : (z0 + z1) / 2;
    const wall = door === 'N' ? z0 : door === 'S' ? z1 : door === 'E' ? x1 : x0;
    // (a canopy over Fourth Street's sidewalk is a short one)
    entrance(k, door, c, wall, 2.6, `six-pack-${id}`, door === 'E' ? 0.42 : 1.1);
    // a hall whose door the opening view cannot see has its name on its south side as well
    if (door === 'W' || door === 'N') k.sign(`six-pack-${id}`, (x0 + x1) / 2 - 1.2, RES + 0.62, z1 + 0.08, 0, 1, 0.6, 5);
    const [px, pz] = outFrom(door, c + 0.6, wall, 0.9);
    k.person(px, pz);
  };
}

// ---------------------------------------------------------------------------
// The new halls
// ---------------------------------------------------------------------------

/** Nugent Hall: a long block of four storeys, with stacks of glass where its lounges are and a taller tower of stairs at its west end. */
function nugent(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, floors = Math.round(l.h / RES), H = floors * RES;
  b.box(x0, 0, z0, x1, H, z1, NUGENT, { win: ROOMS_NEW, seed: 0.29, faces: 'NESW' });
  b.box(x0 - 0.05, 0, z0 - 0.05, x1 + 0.05, 0.45, z1 + 0.05, LIMESTONE, { faces: 'NESW' });
  b.box(x0 + 0.28, H, z0 + 0.28, x1 - 0.28, H + 0.1, z1 - 0.28, FELT, { faces: 'T' });
  parapet(b, x0, z0, x1, z1, H, 0.5, NUGENT);
  // the lounges: a stack of glass on each long side at a third and at two thirds, framed in pale panels
  for (const f of [0.36, 0.7]) {
    const c = x0 + f * (x1 - x0);
    for (const side of ['N', 'S'] as const) {
      against(b, side, c - 1.35, c + 1.35, side === 'N' ? z0 : z1, 0, 0.16, 0.45, H + 0.2, PANEL, { faces: 'NESWT' });
      against(b, side, c - 1.05, c + 1.05, side === 'N' ? z0 : z1, 0.16, 0.22, RES * 0.2, H - 0.25, GLASS, { faces: side, win: LOUNGE, seed: f });
    }
  }
  // the stairs at the west end, in buff brick, a little higher than the roof
  b.box(x0 - 0.15, 0, z0 + 1.6, x0 + 2.6, H + 1.3, z1 - 1.6, BRICK.buff, { top: FELT });
  b.box(x0 - 0.2, 1.0, (z0 + z1) / 2 - 0.4, x0 - 0.15, H + 0.6, (z0 + z1) / 2 + 0.4, GLASS, { faces: 'W', win: interior(0.8) });
  // plant on the roof, behind a screen
  b.box(x0 + 5, H + 0.1, z0 + 2, x1 - 3, H + 1.5, z1 - 2, 0xa9adb3, { top: 0x8d9198 });
  // its door, at the west of its south side, where it looks onto the lawn
  entrance(k, 'S', x0 + 1.6, z1, 2.4, 'six-pack-nugent', 1.1);
  k.person(x0 + 0.6, z1 + 0.9);
  k.person(x0 + 2.4, z1 + 1.3);
}

/** Ikenberry Dining: a hall of glass under a broad flat roof, with its kitchens in brick behind. */
function dining(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, H = l.h, cut = x0 + 4.2;
  // the kitchens, to the west: brick, one storey lower
  b.box(x0, 0, z0, cut, H - 1.4, z1, BRICK.red, { win: ROOMS_NEW, seed: 0.61, faces: 'NSWT', top: FELT });
  parapet(b, x0, z0, cut, z1, H - 1.4, 0.35, BRICK.red);
  b.box(x0 + 1, H - 1.4, z0 + 1.5, x0 + 2.6, H - 0.4, z0 + 3.4, 0xb9bcc0);
  b.cyl(x0 + 2, z1 - 1.6, H - 1.4, H + 0.2, 0.3, 0.3, 6, 0xb9bcc0);
  // the dining hall, to the east: glass from the floor to the roof on three sides, lit at night, between white posts
  b.box(cut, 0, z0 + 0.5, x1 - 0.5, H - 0.5, z1 - 0.5, GLASS, { win: interior(1.15), faces: 'NES' });
  b.box(cut, 0, z0 + 0.45, x1 - 0.45, 0.4, z1 - 0.45, LIMESTONE, { faces: 'NES' });
  for (let i = 0; i <= 4; i++) {
    const z = z0 + 0.5 + (i / 4) * (z1 - z0 - 1);
    b.box(x1 - 0.55, 0, z - 0.09, x1 - 0.37, H - 0.5, z + 0.09, TRIM, { faces: 'NES' });
  }
  for (let i = 0; i <= 3; i++) {
    const x = cut + (i / 3) * (x1 - 0.5 - cut);
    b.box(x - 0.09, 0, z1 - 0.55, x + 0.09, H - 0.5, z1 - 0.37, TRIM, { faces: 'ESW' });
    b.box(x - 0.09, 0, z0 + 0.37, x + 0.09, H - 0.5, z0 + 0.55, TRIM, { faces: 'NEW' });
  }
  b.box(cut, RES + 0.3, z0 + 0.42, x1 - 0.42, RES + 0.48, z1 - 0.42, TRIM, { faces: 'NES' });
  // its roof: a white slab that sails out over the glass, with its underside
  b.box(cut - 0.3, H - 0.5, z0, x1, H, z1, TRIM, { faces: 'NESWTB', top: FELT });
  // its doors on Fourth Street, and its name over them
  const zc = (z0 + z1) / 2;
  b.box(x1 - 0.5, 0, zc - 1.0, x1 - 0.42, RES, zc + 1.0, 0x2c3037, { faces: 'E', win: interior(1.6) });
  k.sign('six-pack-dining', x1 - 0.38, RES + 1.25, zc, 1, 0, 0.62, z1 - z0 - 2.2);
  k.lights.push({ x: x1 - 0.2, z: zc, r: 10, color: '#ffe9c4', k: 0.6 });
  k.lights.push({ x: (cut + x1) / 2, z: z1 + 0.6, r: 8, color: '#ffe9c4', k: 0.5 });
}

/** Bousfield Hall: six storeys in an L round a courtyard, with a corner of glass where First Street meets Peabody Drive. */
function bousfield(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, floors = Math.round(l.h / RES), H = floors * RES, d = 3.3;
  // the west range, and the south range that meets it
  b.box(x0, 0, z0, x0 + d, H, z1, BOUSFIELD, { win: ROOMS_NEW, seed: 0.37, faces: 'NESWT', top: FELT });
  b.box(x0 + d, 0, z1 - d, x1, H, z1, BOUSFIELD, { win: ROOMS_NEW, seed: 0.59, faces: 'NEST', top: FELT });
  b.box(x0 - 0.05, 0, z0 - 0.05, x0 + d + 0.05, 0.45, z1 + 0.05, LIMESTONE, { faces: 'NESW' });
  b.box(x0 + d, 0, z1 - d - 0.05, x1 + 0.05, 0.45, z1 + 0.05, LIMESTONE, { faces: 'NES' });
  // strips of dark metal from the ground to the roof, which part the windows into groups
  for (const f of [0.45, 0.72]) against(b, 'S', x0 + f * (x1 - x0) - 0.2, x0 + f * (x1 - x0) + 0.2, z1, 0, 0.1, 0.45, H, METAL, { faces: 'ESWT' });
  against(b, 'E', z1 - d + 1.4, z1 - d + 1.8, x1, 0, 0.1, 0.45, H, METAL, { faces: 'NEST' });
  // a low wall round each range's roof, and the plant on it
  parapet(b, x0, z0, x0 + d, z1, H, 0.4, BOUSFIELD);
  parapet(b, x0 + d, z1 - d, x1, z1, H, 0.4, BOUSFIELD);
  b.box(x0 + 0.7, H, z0 + 1, x0 + 2.4, H + 1.2, z0 + 3, 0xa9adb3, { top: 0x8d9198 });
  // the corner of glass, on the side the streets are: a lounge on every floor, lit at night, a little higher than the rest
  b.box(x0 - 0.2, 0, z1 - d, x0 + d + 0.6, H + 0.6, z1 + 0.2, GLASS, { win: LOUNGE, seed: 0.83, top: FELT });
  for (let f = 1; f <= floors; f++) belt(b, x0 - 0.2, z1 - d, x0 + d + 0.6, z1 + 0.2, f * RES, 0.06, 0.05, METAL);
  k.lights.push({ x: x0 + 1, z: z1 + 0.5, r: 9, color: '#ffe9c4', k: 0.55 });
  // the courtyard, open to the north and east: a lawn, the door, and three on the grass
  area(k, rect(x0 + d + 0.6, z0 + 0.4, x1 - 0.3, z1 - d - 1.5), LAWN, 0.035);
  entrance(k, 'N', x0 + d + 3.2, z1 - d, 2.6, null, 1.1);
  k.sign('six-pack-bousfield', (x0 + d + x1) / 2 + 0.6, RES + 0.62, z1 + 0.08, 0, 1, 0.6, x1 - x0 - d - 1.6);
  k.person(x0 + d + 1.6, z0 + 1.6);
  k.person(x0 + d + 2.8, z0 + 2.2);
  k.person(x1 - 1.4, z1 - d - 0.8);
}

/**
 * Wassaja Hall: five storeys of deep red brick with a top storey of dark
 * metal, a stack of glass lounges at its south-east corner, and its door on
 * the south side, towards the lawn. Along the walk to the door stands its row
 * of baskets.
 */
function wassaja(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, floors = Math.round(l.h / RES), H = floors * RES;
  b.box(x0, 0, z0, x1, H - RES, z1, WASSAJA, { win: ROOMS_NEW, seed: 0.13, faces: 'NESW' });
  b.box(x0 - 0.06, H - RES, z0 - 0.06, x1 + 0.06, H, z1 + 0.06, METAL, { win: ROOMS_NEW, seed: 0.13, faces: 'NESWB' });
  b.box(x0 - 0.06, 0, z0 - 0.06, x1 + 0.06, 0.5, z1 + 0.06, LIMESTONE, { faces: 'NESW' });
  b.box(x0 + 0.28, H, z0 + 0.28, x1 - 0.28, H + 0.1, z1 - 0.28, FELT, { faces: 'T' });
  parapet(b, x0 - 0.06, z0 - 0.06, x1 + 0.06, z1 + 0.06, H, 0.45, METAL, 0x6a7078);
  // fins of pale stone up the south and north sides, between the groups of windows
  for (const f of [0.2, 0.4, 0.6]) {
    const x = x0 + f * (x1 - x0);
    against(b, 'S', x - 0.16, x + 0.16, z1, 0, 0.14, 0.5, H - RES, PANEL, { faces: 'ESWT' });
    against(b, 'N', x - 0.16, x + 0.16, z0, 0, 0.14, 0.5, H - RES, PANEL, { faces: 'NEWT' });
  }
  // the lounges at the south-east corner: glass on every floor, lit at night
  b.box(x1 - 2.7, 0, z1 - 2.6, x1 + 0.22, H + 0.55, z1 + 0.22, GLASS, { win: LOUNGE, seed: 0.71, top: FELT });
  for (let f = 1; f <= floors; f++) belt(b, x1 - 2.7, z1 - 2.6, x1 + 0.22, z1 + 0.22, f * RES, 0.06, 0.05, METAL);
  // plant on the roof
  b.box(x0 + 2, H + 0.1, z0 + 2, x0 + 6.5, H + 1.5, z1 - 2.5, 0xa9adb3, { top: 0x8d9198 });
  // the door, with the hall's name over it
  const door = x1 - 4.7;
  entrance(k, 'S', door, z1, 3.0, 'six-pack-wassaja', 1.3);

  // the walk along the south side, and the baskets on it: five of weathered steel, each larger than the last
  // as they near the door, cut through with a pattern and lit from inside at night
  const lawn = AREAS.find((a) => a.id === 'wassaja-lawn');
  area(k, rect(x0, z1, lawn ? lawn.x1 : x1 + 0.3, z1 + 2.0), WALK, 0.035);
  const first = x0 + 1.1, last = door - 2.9, n = 5;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), r = 0.36 + 0.5 * t, h = 0.7 + 1.0 * t, x = first + (last - first) * (0.08 + 0.92 * t * (0.55 + 0.45 * t)), z = z1 + 1.05;
    lathe(b, x, z, [[r * 0.5, 0.04], [r, h * 0.45], [r * 0.9, h * 0.8], [r * 0.58, h]], 8, CORTEN, { win: PIERCED, seed: 0.1 + i * 0.17 });
    b.cyl(x, z, 0.04, 0.08, r * 0.5, r * 0.5, 8, CORTEN);
    k.glows.push({ x, y: h * 0.5, z, sx: r * 0.75, sy: h * 0.7, sz: r * 0.75, color: '#ffb057' });
    if (i % 2 === 0) k.lights.push({ x, z: z + 0.6, r: 3.5 + 2 * t, color: '#ffb057', k: 0.45 });
  }
}

export const MODELS: Record<string, Model> = {
  wassaja,
  nugent,
  'ikenberry-dining': dining,
  bousfield,
  hopkins: oldHall('hopkins', 'W', 0.11),
  weston: oldHall('weston', 'E', 0.31),
  scott: oldHall('scott', 'W', 0.53),
  snyder: oldHall('snyder', 'E', 0.77),
};

export function extras(k: Build): void {
  const b = k.b;
  const hall = lot('wassaja'), lawn = AREAS.find((a) => a.id === 'wassaja-lawn');
  const hero = HERO_SPOTS.find((s) => s.id === 'move-in');
  if (!lawn || !hero) return;

  // ---------------------------------------------------------------------------
  // Move-in day, before Wassaja's door. The car's own place is kept empty for a
  // hero. What came out of the car stands on the walk north of it and east of
  // the door, where it hides neither the car nor the baskets, which stand west
  // of the door.
  // ---------------------------------------------------------------------------
  const wall = hall.z1, east = hall.x1;
  const stack = (x: number, z: number, sizes: number[]): void => {
    let y = 0.04;
    sizes.forEach((s, i) => {
      b.box(x - s / 2, y, z - s / 2 + i * 0.05, x + s / 2, y + s * 0.8, z + s / 2 + i * 0.05, CARDBOARD, { faces: 'NESWT' });
      y += s * 0.8;
    });
  };
  // boxes in stacks, a small fridge and a rolled rug, in front of the lounges' glass
  stack(east - 2.2, wall + 0.75, [0.7, 0.6, 0.5]);
  stack(east - 1.2, wall + 0.85, [0.75, 0.55]);
  stack(east - 3.0, wall + 0.6, [0.55]);
  b.box(east - 0.5, 0.04, wall + 0.45, east, 0.95, wall + 0.95, 0xf2f0ea, { faces: 'NESWT' });
  b.box(east + 0.2, 0.04, wall + 1.25, east + 1.5, 0.3, wall + 1.55, 0x7a5f8a, { faces: 'NESWT' });
  // two of the carts the halls lend out: a bin of blue cloth on four wheels, one of them loaded
  for (const [x, z, full] of [[east + 0.7, wall + 0.6, 1], [east + 2.6, wall + 1.3, 0]]) {
    b.box(x - 0.55, 0.28, z - 0.4, x + 0.55, 1.05, z + 0.4, 0x2f66b3, { faces: 'NESWB' });
    if (full) b.box(x - 0.45, 0.9, z - 0.3, x + 0.45, 1.3, z + 0.3, CARDBOARD, { faces: 'NESWT' });
    for (const [dx, dz] of [[-0.45, -0.3], [0.45, -0.3], [0.45, 0.3], [-0.45, 0.3]]) b.box(x + dx - 0.07, 0.04, z + dz - 0.07, x + dx + 0.07, 0.28, z + dz + 0.07, 0x2a2d33, { faces: 'NESW' });
  }
  // the board that says what day it is, with balloons tied to it, at the east end of the walk
  const bx = lawn.x1 - 1.3, bz = wall + 0.7;
  b.box(bx - 0.4, 0, bz - 0.05, bx + 0.4, 1.25, bz + 0.05, ORANGE, { faces: 'NESWT' });
  k.sign('six-pack-move-in', bx, 0.72, bz + 0.09, 0, 1, 0.8, 0.76);
  for (const [dx, dy, c] of [[-0.12, 2.3, ORANGE], [0.16, 2.65, 0x2f4f8f], [0.0, 3.0, 0xf2f0ea]] as const) {
    b.cyl(bx + dx, bz, 1.25, dy, 0.025, 0.025, 4, 0xc9ccd2, { cap: false });
    b.cyl(bx + dx, bz, dy, dy + 0.5, 0.22, 0.26, 6, c);
    b.cyl(bx + dx, bz, dy + 0.5, dy + 0.62, 0.26, 0.08, 6, c);
  }
  // who is moving in, and who is helping: at the door, at the stacks, at the carts,
  // and two at the west end of the row of baskets, looking along it
  for (const [x, dz] of [[east - 5.5, 0.8], [east - 3.9, 1.0], [east - 1.7, 1.45], [east - 0.4, 1.4], [east + 1.5, 0.7], [east + 3.3, 0.6], [hall.x0 + 0.35, 1.5], [hall.x0 + 0.5, 0.45]]) k.person(x, wall + dz);

  // ---------------------------------------------------------------------------
  // The lawn: a few who have brought a blanket, well south of the car
  // ---------------------------------------------------------------------------
  const blanket = (x: number, z: number, color: number): void => {
    area(k, rect(x - 0.9, z - 0.65, x + 0.9, z + 0.65), color, 0.04);
    k.person(x - 0.35, z + 0.1);
    k.person(x + 0.45, z - 0.2);
  };
  blanket(lawn.x0 + 7.5, lawn.z1 - 2.0, 0xc8523f);
  blanket(lawn.x0 + 12.5, lawn.z1 - 1.5, 0x3f6fb5);
  blanket(lawn.x1 - 2.4, lawn.z1 - 3.4, 0xf2c14e);
  k.person(lawn.x0 + 10.2, lawn.z1 - 3.6);
  k.person(lawn.x1 - 4.6, lawn.z1 - 1.4);

  // ---------------------------------------------------------------------------
  // Between Bousfield and Scott: the way up from Peabody Drive to the lawn
  // ---------------------------------------------------------------------------
  const west = lot('bousfield'), scott = lot('scott');
  const gx0 = west.x1, gx1 = scott.x0, gz0 = lawn.z1, gz1 = scott.z1, gm = (gx0 + gx1) / 2;
  area(k, rect(gx0 + 0.9, gz0 + 1.0, gm - 1.1, gz1 - 0.5), LAWN, 0.035);
  area(k, rect(gm + 1.1, gz0 + 1.0, gx1 - 1.7, gz1 - 0.5), LAWN, 0.035);
  for (const [x, z] of [[gm - 2.4, gz0 + 3.2], [gm + 2.6, gz1 - 2.6]]) {
    b.box(x - 0.2, 0.35, z - 0.8, x + 0.2, 0.5, z + 0.8, 0x8d6b4a, { faces: 'NESWTB' });
    for (const dz of [-0.65, 0.65]) b.box(x - 0.18, 0, z + dz - 0.06, x + 0.18, 0.35, z + dz + 0.06, METAL);
  }
  // three on their way up it, kept to its west side so that they stand before nothing
  k.person(gm - 0.5, gz1 - 1.4);
  k.person(gm - 0.2, gz0 + 4.4);
  k.person(gx0 + 1.6, gz0 + 2.2);
}
