// The Main Quad's east row and its south end: Harker Hall, Natural History, Noyes Laboratory, Davenport Hall, Smith Hall, Foellinger Auditorium and the Observatory.
//
// Each is a function of its lot in plan.ts. What each looks like, as checked
// against photographs in November 2026:
//
// - Foellinger Auditorium (1907): a round hall of red brick under a low dome of
//   dark weathered metal with green copper ribs, a crown ring and a pineapple
//   finial, a cresting of green copper round its cornice, and lights set in the
//   dome. On its north side, towards the Quad, an entrance block: six Ionic
//   columns of limestone in pairs (one, two, two, one) between brick masses,
//   three arched doorways behind them, a brick attic with stone panels, and
//   broad steps down to the lawn.
// - Harker Hall (1878): Second Empire. Red brick on a base of rough stone, a
//   cream bracketed cornice, a mansard of slate patterned with red and teal
//   diamonds, with round-headed dormers. Its front, with a tall flight of steps
//   to the door, faces south.
// - The Natural History Building (1892): High Victorian Gothic. Red brick on a
//   stone base, steep slate roofs with gables, and stone-faced entrance bays
//   whose gables carry its name.
// - Noyes Laboratory (1902): Romanesque. Red brick, round-headed windows in
//   threes, a deep arched porch of rough stone with round shafts at its corners,
//   and a roof crowded with stacks.
// - Davenport Hall (1901): red-brown brick with orange-buff terra cotta, a
//   recessed entrance with two Ionic columns in a pavilion on its Quad front,
//   and wings that run back to the east.
// - Smith Memorial Hall (1920): red brick and limestone. Its main front, four
//   Ionic columns under a pediment, faces east, to Mathews Avenue; its north and
//   south doors each have two columns.
// - The Astronomical Observatory (1896): one storey of buff brick under a white
//   cornice, an eight-sided tower with a white gallery round it, and a silver
//   dome.

import { interior, rng, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { lantern, lathe, pinnacle, roundel, tri } from '../../engine/parts';
import { gable, hip, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import {
  BASE, BRICK, BRONZE, DARK, GLASS, HALL, HALL_NARROW, IRON, LIMESTONE, SLATE, STOREY, TRIM, VERDIGRIS,
  chimney, column, dormer, steps,
} from './look';
import type { LotDef, Model } from './plan';

// ---------------------------------------------------------------------------
// Colours of this file's own
// ---------------------------------------------------------------------------

/** Foellinger's dome: weathered metal, dark and a little blue. */
const DOME = 0x5d6670;
/** The cream of Harker's cornice and window heads, and its rough stone base. */
const CREAM = 0xdcc9a0, RUBBLE = 0xc2b291;
/** Davenport's orange-buff terra cotta. */
const TERRA = 0xcfa47e;
/** The Observatory's buff brick and its silver dome. */
const BUFF = 0xcfae78, SILVER = 0xc9cdd2;
/** Harker's slates: red and teal among the grey. */
const SLATE_RED = 0xa84a3c, SLATE_TEAL = 0x4e8a84;
/** Wooden doors. */
const WOOD = 0x8a4b2a;

// ---------------------------------------------------------------------------
// Walls, windows and boards
// ---------------------------------------------------------------------------

type Dir = 'N' | 'E' | 'S' | 'W';
const YAW: Record<Dir, number> = { S: 0, E: -Math.PI / 2, N: Math.PI, W: Math.PI / 2 };
const NORMAL: Record<Dir, [number, number]> = { S: [0, 1], E: [1, 0], N: [0, -1], W: [-1, 0] };

/**
 * Builds `fn` in the frame of a wall: (ox, oz) is a point on its face, local x
 * runs along it to the right as seen from outside, and local z points out of it.
 */
function onWall(b: GeoBuilder, ox: number, oz: number, d: Dir, fn: () => void): void {
  b.moved(ox, 0, oz, YAW[d], fn);
}

/** Where a point given in a wall's frame is, on the ground. */
function wallPt(ox: number, oz: number, d: Dir, lx: number, lz: number): [number, number] {
  const a = YAW[d], c = Math.cos(a), s = Math.sin(a);
  return [ox + lx * c - lz * s, oz + lx * s + lz * c];
}

/** The top half of a disc, standing on a wall at height `y`, `z` out from it. */
function halfDisc(b: GeoBuilder, x: number, y: number, r: number, z: number, color: number, win?: WinSpec, n = 4): void {
  for (let i = 0; i < n; i++) {
    const a0 = (Math.PI * i) / n, a1 = (Math.PI * (i + 1)) / n;
    tri(b, [x, y, z], [x + Math.cos(a0) * r, y + Math.sin(a0) * r, z], [x + Math.cos(a1) * r, y + Math.sin(a1) * r, z], [0, 0, 1], color, { win });
  }
}

/** A plain window in a wall's frame: a pane, lit at night, and a sill. */
function pane(b: GeoBuilder, x: number, y0: number, w: number, h: number, sill = LIMESTONE, glass = GLASS): void {
  b.box(x - w / 2, y0, 0, x + w / 2, y0 + h, 0.05, glass, { faces: 'S', win: interior(0.85) });
  b.box(x - w / 2 - 0.08, y0 - 0.12, 0, x + w / 2 + 0.08, y0, 0.1, sill, { faces: 'STB' });
}

interface ArchOpts { hood?: number; glass?: number; lit?: number; pointed?: boolean; sill?: boolean; bare?: boolean }

/** A round-headed window in a wall's frame, `w` wide and `h` high from its sill to its crown, under a hood of stone. */
function archWin(b: GeoBuilder, x: number, y0: number, w: number, h: number, o: ArchOpts = {}): void {
  const r = w / 2, spring = y0 + h - r, glass = o.glass ?? GLASS, lit = interior(o.lit ?? 0.85), hood = o.hood ?? LIMESTONE;
  b.box(x - r, y0, 0, x + r, spring, 0.05, glass, { faces: 'S', win: lit });
  if (o.pointed) {
    tri(b, [x - r, spring, 0.05], [x + r, spring, 0.05], [x, spring + r * 1.3, 0.05], [0, 0, 1], glass, { win: lit });
    tri(b, [x - r - 0.13, spring, 0.025], [x + r + 0.13, spring, 0.025], [x, spring + r * 1.3 + 0.2, 0.025], [0, 0, 1], hood);
  } else {
    halfDisc(b, x, spring, r, 0.05, glass, lit);
    if (!o.bare) halfDisc(b, x, spring, r + 0.13, 0.025, hood);
  }
  if (o.sill !== false) b.box(x - r - 0.08, y0 - 0.12, 0, x + r + 0.08, y0, 0.1, hood, { faces: 'STB' });
}

/** A doorway with a round head in a wall's frame: dark, and lit from within at night. */
function archDoor(b: GeoBuilder, x: number, y0: number, w: number, h: number, surround: number, z = 0.05): void {
  const r = w / 2, spring = y0 + h - r;
  b.box(x - r, y0, 0, x + r, spring, z, DARK, { faces: 'S', win: interior(1.3) });
  halfDisc(b, x, spring, r, z, DARK, interior(1.3));
  halfDisc(b, x, spring, r + 0.2, z - 0.025, surround);
  b.box(x - r - 0.2, y0, 0, x - r, spring, z - 0.025, surround, { faces: 'SEW' });
  b.box(x + r, y0, 0, x + r + 0.2, spring, z - 0.025, surround, { faces: 'SEW' });
}

/** A university building's name on a plain white board, `w` wide and `h` high, on a wall that faces `d`. */
function nameBoard(k: Build, id: string, x: number, y: number, z: number, d: Dir, w: number, h: number): void {
  const [nx, nz] = NORMAL[d];
  onWall(k.b, x, z, d, () => k.b.box(-w / 2 - 0.1, y - h / 2 - 0.07, 0, w / 2 + 0.1, y + h / 2 + 0.07, 0.06, TRIM, { faces: 'SEWTB' }));
  k.sign(id, x + nx * 0.09, y, z + nz * 0.09, nx, nz, h, w);
}

const board = (id: string, lines: string[], aspect: number): SignDef => ({
  id: `quad-east-${id}`, lines, color: '#f3f0e7', ink: '#13294b', aspect, kind: 'board', real: true,
  size: [Math.round(52 * lines.length * aspect), 52 * lines.length],
});

/** Every building's name, once, where the opening view reads it. */
export const SIGNS: SignDef[] = [
  board('foellinger', ['FOELLINGER', 'AUDITORIUM'], 3.3),
  board('harker', ['HARKER HALL'], 6.6),
  board('natural-history', ['NATURAL HISTORY', 'BUILDING'], 4.3),
  board('noyes', ['NOYES LABORATORY'], 9.4),
  board('davenport', ['DAVENPORT HALL'], 8.4),
  board('smith', ['SMITH MEMORIAL HALL'], 11),
  board('observatory', ['ASTRONOMICAL', 'OBSERVATORY'], 3.7),
];

// ---------------------------------------------------------------------------
// Foellinger Auditorium
// ---------------------------------------------------------------------------

function foellinger(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, cx = (x0 + x1) / 2, TOP = l.h;
  const part = l.parts?.find((p) => p.id === 'foellinger-dome');
  const H = part?.h ?? TOP + 4;

  // The round hall: as wide as the lot allows, against its south edge and behind the portico.
  const SIDES = 16, FLAT = Math.cos(Math.PI / SIDES), RECESS = 0.95;
  const R = Math.min((x1 - x0) / 2 - 0.3, (z1 - z0 - RECESS - 0.3) / (2 * FLAT));
  const zc = z1 - R * FLAT - 0.05;
  const BAND0 = 2 * STOREY + 0.5, BAND1 = BAND0 + 1.0, ATTIC = TOP - 0.45;
  const ring = (y0: number, y1: number, r: number, color: number, o: { win?: WinSpec; cap?: number } = {}): void =>
    b.cyl(cx, zc, y0, y1, r, r, SIDES, color, { win: o.win, seed: 0.41, cap: o.cap ?? false });
  ring(0, 0.8, R + 0.1, LIMESTONE);
  ring(0, 2 * STOREY, R, BRICK.red, { win: HALL });
  ring(2 * STOREY, BAND0, R, BRICK.red);
  ring(BAND0, BAND1, R + 0.12, LIMESTONE);
  ring(BAND1, ATTIC, R, BRICK.red);
  ring(ATTIC, TOP - 0.26, R + 0.3, LIMESTONE, { cap: LIMESTONE });
  ring(TOP - 0.26, TOP - 0.06, R + 0.15, VERDIGRIS, { cap: 0x8a9298 });
  // the copper cresting: a leaf at each corner of the ring
  for (let i = 0; i < SIDES; i++) {
    const a = Math.PI / SIDES + (i * 2 * Math.PI) / SIDES;
    b.cyl(cx + Math.cos(a) * (R + 0.14), zc + Math.sin(a) * (R + 0.14), TOP - 0.06, TOP + 0.3, 0.13, 0.02, 4, VERDIGRIS, { cap: false });
  }

  // The dome: a skirt, a low curve, a crown ring and the pineapple on it.
  const DB = TOP, RD = Math.min(R - 0.35, (part ? (part.x1 - part.x0) / 2 : 4) + 1);
  const prof: [number, number][] = [
    [RD + 0.05, DB - 0.06], [RD, DB + 0.45], [RD - 0.45, DB + 0.55], [RD - 0.6, DB + 1.3], [RD - 1.3, DB + 2.4], [RD - 2.4, H - 0.9], [1.35, H - 0.4],
  ];
  lathe(b, cx, zc, prof, SIDES, DOME);
  b.cyl(cx, zc, H - 0.4, H - 0.05, 1.45, 1.45, SIDES, VERDIGRIS, { cap: VERDIGRIS });
  lathe(b, cx, zc, [[0.3, H - 0.05], [0.34, H + 0.35], [0.14, H + 0.75], [0.03, H + 1.15]], 6, BRONZE);
  // eight ribs of green copper down the dome
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / SIDES + (i * Math.PI) / 4;
    const pts = prof.slice(3).map(([r, y]): V3 => [cx + Math.cos(a) * (r + 0.05), y + 0.04, zc + Math.sin(a) * (r + 0.05)]);
    b.sweep(pts, pts.map(() => 0.09), VERDIGRIS);
  }
  // the lights set in the dome, in two rings
  const rAt = (y: number): number => {
    for (let i = 0; i + 1 < prof.length; i++) {
      const [ra, ya] = prof[i], [rb, yb] = prof[i + 1];
      if (y >= ya && y <= yb) return ra + ((rb - ra) * (y - ya)) / (yb - ya);
    }
    return 1;
  };
  for (const [y, n] of [[DB + 1.8, 16], [DB + 2.95, 12]] as const) {
    const r = rAt(y) + 0.06;
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) * 2 * Math.PI) / n;
      k.glows.push({ x: cx + Math.cos(a) * r, y, z: zc + Math.sin(a) * r, sx: 0.16, sy: 0.16, sz: 0.16, color: '#ffe7b8' });
    }
  }

  // The entrance block, on the north side, towards the Quad.
  const zb = z0 + 4.2, xa = cx - 3.4, xc = cx + 3.4, FLOOR = 0.9;
  b.box(x0, 0, z0, x1, 2 * STOREY, zb, BRICK.red, { win: HALL_NARROW, seed: 0.13, faces: 'EW' });
  b.box(x0, 0, z0 + RECESS, x1, 2 * STOREY, zb, BRICK.red, { faces: 'S' });
  b.box(x0, 2 * STOREY, z0, x1, BAND0, zb, BRICK.red, { faces: 'EWS' });
  // the brick masses either side of the portico, and the wall behind its columns
  b.box(x0, 0, z0, xa, BAND0, z0 + RECESS, BRICK.red, { faces: 'NE' });
  b.box(xc, 0, z0, x1, BAND0, z0 + RECESS, BRICK.red, { faces: 'NW' });
  b.box(xa, FLOOR, z0 + RECESS, xc, BAND0, zb, BRICK.red, { faces: 'N' });
  b.box(x0 - 0.08, 0, z0 - 0.08, x1 + 0.08, 0.9, zb, LIMESTONE, { faces: 'EW' });
  // the entablature over the columns, the attic with its panels, the cornice and the cresting
  b.box(x0 - 0.1, BAND0, z0 - 0.15, x1 + 0.1, BAND1, zb, LIMESTONE, { faces: 'NEWSB' });
  b.box(x0 - 0.1, BAND1 - 0.3, z0 - 0.25, x1 + 0.1, BAND1 - 0.18, zb, LIMESTONE, { faces: 'NEWB' });
  b.box(x0, BAND1, z0, x1, ATTIC, zb, BRICK.red, { faces: 'NEWS' });
  b.box(x0 - 0.25, ATTIC, z0 - 0.3, x1 + 0.25, TOP - 0.2, zb + 0.3, LIMESTONE, { faces: 'NEWSTB' });
  b.box(x0 - 0.12, TOP - 0.2, z0 - 0.17, x1 + 0.12, TOP, zb + 0.17, VERDIGRIS, { faces: 'NEWST', top: 0x8a9298 });
  for (const f of [-1, -0.66, -0.33, 0, 0.33, 0.66, 1]) {
    const big = Math.abs(f) === 1;
    b.cyl(cx + f * ((x1 - x0) / 2 + 0.05), z0 - 0.1, TOP, TOP + (big ? 0.55 : 0.35), big ? 0.2 : 0.14, 0.02, 4, VERDIGRIS, { cap: false });
  }
  onWall(b, cx, z0, 'N', () => {
    // five stone panels on the attic, with a roundel between each two
    for (const u of [-4.7, -2.35, 0, 2.35, 4.7]) b.box(u - 0.75, BAND1 + 0.3, 0, u + 0.75, ATTIC - 0.3, 0.05, LIMESTONE, { faces: 'STEW' });
    for (const u of [-3.52, -1.17, 1.17, 3.52]) roundel(b, [u, (BAND1 + ATTIC) / 2, 0.05], 0.2, 'S', LIMESTONE, {}, 8);
    // the brick masses: a window above and below a band of stone, and a panel between
    for (const s of [-1, 1]) {
      const u = s * ((x1 - x0) / 2 - (xa - x0) / 2);
      pane(b, u, FLOOR + 1.4, 0.75, 1.3);
      b.box(u - 0.5, FLOOR + 3.0, 0, u + 0.5, FLOOR + 3.35, 0.05, LIMESTONE, { faces: 'STEW' });
      pane(b, u, FLOOR + 3.75, 0.75, 1.25);
      b.box(-s * ((x1 - x0) / 2) - 0.08 * s, 0, 0, -s * ((x1 - x0) / 2) + s * 0.4, BAND0, 0.06, LIMESTONE, { faces: 'STEW' });
    }
  });
  // the three arched doorways behind the columns, each with a stone panel above
  onWall(b, cx, z0 + RECESS, 'N', () => {
    for (const u of [-2.3, 0, 2.3]) {
      b.box(u - 0.45, FLOOR, 0, u + 0.45, FLOOR + 2.3, 0.05, WOOD, { faces: 'S' });
      b.box(u - 0.36, FLOOR + 0.1, 0, u + 0.36, FLOOR + 2.15, 0.07, DARK, { faces: 'S', win: interior(1.3) });
      halfDisc(b, u, FLOOR + 2.3, 0.45, 0.05, GLASS, interior(1.4));
      halfDisc(b, u, FLOOR + 2.3, 0.62, 0.025, LIMESTONE);
      b.box(u - 0.55, BAND0 - 1.25, 0, u + 0.55, BAND0 - 0.35, 0.04, LIMESTONE, { faces: 'STEW' });
      roundel(b, [u, BAND0 - 0.8, 0.05], 0.25, 'S', LIMESTONE, {}, 8);
    }
  });
  // the six columns, in pairs: one, two, two, one
  for (const u of [-3.0, -1.62, -1.0, 1.0, 1.62, 3.0]) column(b, cx + u, z0 + 0.45, FLOOR, BAND0, 0.26, LIMESTONE);
  // the podium, its low walls, and the broad steps down to the lawn
  b.box(x0 + 0.2, 0, z0 - 0.6, x1 - 0.2, FLOOR, z0 + RECESS, LIMESTONE, { faces: 'NEWT' });
  for (const [a, c] of [[x0 + 0.2, xa + 0.1], [xc - 0.1, x1 - 0.2]]) b.box(a, FLOOR, z0 - 0.6, c, FLOOR + 0.55, z0 - 0.4, TRIM);
  steps(b, xa + 0.2, xc - 0.2, z0 - 0.6, FLOOR, 'N', LIMESTONE, 0.44);
  lantern(k, xa - 0.25, z0 - 0.25, FLOOR, 1.7, IRON);
  lantern(k, xc + 0.25, z0 - 0.25, FLOOR, 1.7, IRON);
  k.glows.push({ x: cx, y: BAND0 - 0.15, z: z0 + 0.7, sx: 6, sy: 0.12, sz: 0.3, color: '#ffe2ae' });
  k.lights.push({ x: cx, z: z0 - 3.5, r: 12, color: '#ffe2ae', k: 0.6 });
  k.lights.push({ x: cx + 3, z: z1 + 2, r: 10, color: '#ffe2ae', k: 0.45 });
  for (const [x, z, y] of [[cx - 1.3, z0 - 1.2, 0.3], [cx + 2.1, z0 - 0.3, FLOOR], [cx + 0.4, z0 - 1.65, 0], [cx - 3.9, z0 + 0.4, FLOOR]]) k.person(x, z, y);

  // its name, on the attic over the east side of the entrance block
  nameBoard(k, 'quad-east-foellinger', x1, (BAND1 + ATTIC) / 2, (z0 + zb) / 2, 'E', 3.3, 0.95);
}

// ---------------------------------------------------------------------------
// Harker Hall
// ---------------------------------------------------------------------------

function harker(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  // three rows of windows: the basement's in the stone, and two floors above
  const WALL = l.h - 0.6, ROW = WALL / 3, SOCLE = 1.5;
  const STY: WinSpec = { ...HALL_NARROW, storey: ROW };
  const PAV = 2.8, OUT = 0.35;
  // the middle, set back between the two end pavilions, and the pavilions
  b.box(x0 + PAV, 0, z0 + OUT, x1 - PAV, WALL, z1 - OUT, BRICK.red, { win: STY, seed: 0.7, faces: 'N' });
  b.box(x0 + PAV, 0, z0 + OUT, x1 - PAV, WALL, z1 - OUT, BRICK.red, { faces: 'S' });
  b.box(x0, 0, z0, x0 + PAV, WALL, z1, BRICK.red, { win: STY, seed: 0.2, faces: 'NWE' });
  b.box(x1 - PAV, 0, z0, x1, WALL, z1, BRICK.red, { win: STY, seed: 0.5, faces: 'NEW' });
  b.box(x0, 0, z0, x1, WALL, z1, BRICK.red, { faces: 'S' });
  b.box(x0 + PAV, 0, z1 - OUT, x1 - PAV, WALL, z1 - 0.01, BRICK.red, { faces: 'T' });
  // the base of rough stone
  for (const [a, c, za, zb] of [[x0, x0 + PAV, z0, z1], [x1 - PAV, x1, z0, z1], [x0 + PAV, x1 - PAV, z0 + OUT, z1 - OUT]]) {
    b.box(a - 0.07, 0, za - 0.07, c + 0.07, SOCLE, zb + 0.07, RUBBLE, { faces: 'NESWT' });
  }
  // the cornice on its brackets
  b.box(x0 - 0.4, WALL, z0 - 0.4, x1 + 0.4, WALL + 0.45, z1 + 0.4, CREAM, { faces: 'NESWB' });
  for (let x = x0 + 0.3; x < x1; x += 1.4) {
    const back = x > x0 + PAV && x < x1 - PAV ? z1 - OUT : z1;
    b.box(x - 0.07, WALL - 0.35, back, x + 0.07, WALL, z1 + 0.35, CREAM, { faces: 'SEWB' });
  }
  for (let z = z0 + 0.3; z < z1; z += 1.5) b.box(x1, WALL - 0.35, z - 0.07, x1 + 0.35, WALL, z + 0.07, CREAM, { faces: 'ENSB' });
  // the mansard, of slate, a low hip on top, and its patterned diamonds
  const Y0 = WALL + 0.45, Y1 = Y0 + 2.2, IN = 0.75, ax0 = x0 - 0.15, ax1 = x1 + 0.15, az0 = z0 - 0.15, az1 = z1 + 0.15;
  const n = Math.hypot(IN, Y1 - Y0);
  b.quad([ax0, Y0, az1], [ax1, Y0, az1], [ax1 - IN, Y1, az1 - IN], [ax0 + IN, Y1, az1 - IN], [0, IN / n, (Y1 - Y0) / n], SLATE);
  b.quad([ax1, Y0, az0], [ax0, Y0, az0], [ax0 + IN, Y1, az0 + IN], [ax1 - IN, Y1, az0 + IN], [0, IN / n, -(Y1 - Y0) / n], SLATE);
  b.quad([ax1, Y0, az1], [ax1, Y0, az0], [ax1 - IN, Y1, az0 + IN], [ax1 - IN, Y1, az1 - IN], [(Y1 - Y0) / n, IN / n, 0], SLATE);
  b.quad([ax0, Y0, az0], [ax0, Y0, az1], [ax0 + IN, Y1, az1 - IN], [ax0 + IN, Y1, az0 + IN], [-(Y1 - Y0) / n, IN / n, 0], SLATE);
  hip(b, ax0 + IN, az0 + IN, ax1 - IN, az1 - IN, Y1, 0.5, SLATE, 0.05);
  const slope = (t: number, x: number, out: number): V3 => [x, Y0 + t * (Y1 - Y0) + out * (IN / n), az1 - t * IN + out * ((Y1 - Y0) / n)];
  [cx - 2.9, cx - 1.05, cx + 1.05, cx + 2.9].forEach((x, i) => {
    const t = 0.55, dt = 0.16, dx = 0.32, c = i % 2 ? SLATE_TEAL : SLATE_RED;
    b.quad(slope(t - dt, x, 0.03), slope(t, x + dx, 0.03), slope(t + dt, x, 0.03), slope(t, x - dx, 0.03), [0, IN / n, (Y1 - Y0) / n], c);
  });
  // dormers: three to the south, three to the north, two at each end
  const sill = Y0 + 0.35, rim = 0.11;
  for (const x of [x0 + PAV / 2, cx, x1 - PAV / 2]) {
    dormer(b, x, az1 - rim, sill, 'S', SLATE, x === cx ? 1.05 : 0.9, 1.15, 1.1);
    dormer(b, x, az0 + rim, sill, 'N', SLATE, 0.9, 1.15, 1.1);
  }
  for (const z of [cz - 1.8, cz + 1.8]) {
    dormer(b, ax1 - rim, z, sill, 'E', SLATE, 0.9, 1.15, 1.1);
    dormer(b, ax0 + rim, z, sill, 'W', SLATE, 0.9, 1.15, 1.1);
  }
  for (const [x, z] of [[ax0 + IN + 0.5, cz - 1.4], [ax1 - IN - 0.5, cz + 1.4], [cx + 1.6, az0 + IN + 0.4]]) chimney(b, x, z, Y1 - 0.2, Y1 + 1.1, BRICK.red, 0.28, 0.24);

  // The south front: pairs of round-headed windows under cream hoods, and the door up its steps.
  const front = (u0: number, zf: number, us: number[]): void => onWall(b, u0, zf, 'S', () => {
    for (const u of us) {
      b.box(u - 0.3, 0.35, 0, u + 0.3, 1.15, 0.09, GLASS, { faces: 'S', win: interior(0.6) });
      archWin(b, u, SOCLE + 0.4, 0.7, 2.0, { hood: CREAM });
      archWin(b, u, SOCLE + 0.4 + ROW, 0.7, 2.0, { hood: CREAM });
    }
  });
  front(x0 + PAV / 2, z1, [-0.45, 0.45]);
  front(x1 - PAV / 2, z1, [-0.45, 0.45]);
  front(cx, z1 - OUT, [-0.5 - 0.9, 1.4]);
  onWall(b, cx, z1 - OUT, 'S', () => {
    archWin(b, -0.45, SOCLE + 0.4 + ROW, 0.62, 2.0, { hood: CREAM });
    archWin(b, 0.45, SOCLE + 0.4 + ROW, 0.62, 2.0, { hood: CREAM });
    // the door, with a fanlight over it and a little roof on brackets
    b.box(-0.5, SOCLE, 0, 0.5, SOCLE + 2.0, 0.05, WOOD, { faces: 'S' });
    halfDisc(b, 0, SOCLE + 2.0, 0.5, 0.05, GLASS, interior(1.2));
    b.box(-0.68, SOCLE, 0, -0.5, SOCLE + 2.3, 0.08, CREAM, { faces: 'SEW' });
    b.box(0.5, SOCLE, 0, 0.68, SOCLE + 2.3, 0.08, CREAM, { faces: 'SEW' });
    b.box(-0.8, SOCLE + 2.6, 0, 0.8, SOCLE + 2.72, 0.5, CREAM, { faces: 'ESWB' });
    slab(b, [0, SOCLE + 2.72, 0.02], [0, SOCLE + 2.95, 0.52], 0.85, 0.06, SLATE);
    // a landing and the long flight down to the plaza, with stone cheeks and two posts with balls
    b.box(-0.75, 0, 0, 0.75, SOCLE, 0.35, LIMESTONE, { faces: 'EWT' });
    steps(b, -0.72, 0.72, 0.35, SOCLE, 'S', LIMESTONE, 0.29);
    for (const s of [-1, 1]) {
      slab(b, [s * 0.82, SOCLE + 0.35, 0.05], [s * 0.82, 0.55, 1.35], 0.1, 0.5, LIMESTONE);
      b.box(s * 0.82 - 0.14, 0, 1.2, s * 0.82 + 0.14, 0.75, 1.48, LIMESTONE);
      b.cyl(s * 0.82, 1.34, 0.75, 0.98, 0.16, 0.16, 6, LIMESTONE);
    }
  });
  nameBoard(k, 'quad-east-harker', cx, WALL + 0.225, z1 + 0.4, 'S', 2.6, 0.36);
  k.lights.push({ x: cx, z: z1 + 3, r: 9, color: '#ffe2ae', k: 0.5 });
  k.glows.push({ x: cx, y: SOCLE + 2.5, z: z1 - OUT + 0.3, sx: 0.4, sy: 0.12, sz: 0.2, color: '#ffe2ae' });
  k.person(cx - 0.3, z1 + 0.6, 0.6);
  k.person(cx + 1.6, z1 + 1.1);
}

// ---------------------------------------------------------------------------
// The Natural History Building
// ---------------------------------------------------------------------------

function naturalHistory(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const WALL = 3 * STOREY, EAVE = l.h, FRIEZE = EAVE - 0.4, RISE = 3.5;
  // walls: windows from the engine on the north and west, built ones on the south and east, which the opening view sees
  b.box(x0, 0, z0, x1, WALL, z1, BRICK.red, { win: HALL_NARROW, seed: 0.33, faces: 'NW' });
  b.box(x0, 0, z0, x1, WALL, z1, BRICK.red, { faces: 'SE' });
  b.box(x0 + 0.02, WALL, z0 + 0.02, x1 - 0.02, FRIEZE, z1 - 0.02, BRICK.orange, { faces: 'NESW' });
  b.box(x0 - 0.1, 0, z0 - 0.1, x1 + 0.1, 1.1, z1 + 0.1, BASE, { faces: 'NESWT' });
  for (const y of [STOREY, 2 * STOREY]) b.box(x0 - 0.06, y - 0.1, z0 - 0.06, x1 + 0.06, y + 0.08, z1 + 0.06, LIMESTONE, { faces: 'NESWTB' });
  b.box(x0 - 0.06, WALL - 0.08, z0 - 0.06, x1 + 0.06, WALL + 0.1, z1 + 0.06, LIMESTONE, { faces: 'NESWTB' });
  b.box(x0 - 0.3, FRIEZE, z0 - 0.3, x1 + 0.3, EAVE, z1 + 0.3, LIMESTONE, { faces: 'NESWB' });
  // the patterned brick of the frieze: diamonds of deep red on the orange
  for (const [d, ox, oz, len] of [['S', cx, z1, x1 - x0], ['E', x1, cz, z1 - z0]] as const) {
    onWall(b, ox, oz, d, () => {
      for (let u = -len / 2 + 0.7; u < len / 2 - 0.4; u += 1.1) {
        const y = (WALL + FRIEZE) / 2;
        b.quad([u, y - 0.25, 0.04], [u + 0.25, y, 0.04], [u, y + 0.25, 0.04], [u - 0.25, y, 0.04], [0, 0, 1], BRICK.deep);
      }
    });
  }
  hip(b, x0, z0, x1, z1, EAVE, RISE, SLATE, 0.45);

  // The four gables: of stone over the entrance bays east and west, of brick to the south and north.
  const GW = 3.0, GR = 3.3, OV = 0.3, BAY = 0.5;
  const coping = (d: Dir, ox: number, oz: number): void => onWall(b, ox, oz, d, () => {
    const top = EAVE + (GR * (GW / 2)) / (GW / 2 + OV);
    for (const s of [-1, 1]) slab(b, [s * (GW / 2 + 0.15), EAVE + 0.12, 0.02], [0, top + 0.2, 0.02], 0.18, 0.28, LIMESTONE);
    pinnacle(b, 0, 0, top + 0.1, 1.1, 0.15, LIMESTONE);
  });
  gable(b, cx - 0.3, cz - GW / 2, x1 + BAY, cz + GW / 2, EAVE, GR, SLATE, LIMESTONE, 'x', OV);
  gable(b, x0 - BAY, cz - GW / 2, cx + 0.3, cz + GW / 2, EAVE, GR, SLATE, LIMESTONE, 'x', OV);
  gable(b, cx - GW / 2, cz - 0.3, cx + GW / 2, z1, EAVE, GR, SLATE, BRICK.red, 'z', OV);
  gable(b, cx - GW / 2, z0, cx + GW / 2, cz + 0.3, EAVE, GR, SLATE, BRICK.red, 'z', OV);
  coping('E', x1 + BAY, cz);
  coping('W', x0 - BAY, cz);
  coping('S', cx, z1);
  coping('N', cx, z0);
  // a tall pointed window in each brick gable, and under the south one the name, where the opening view sees it over Noyes
  onWall(b, cx, z0, 'N', () => archWin(b, 0, EAVE + 0.25, 1.0, 1.8, { pointed: true, sill: false }));
  onWall(b, cx, z1, 'S', () => archWin(b, 0, EAVE + 0.9, 0.8, 1.4, { pointed: true, sill: false }));
  nameBoard(k, 'quad-east-natural-history', cx, EAVE + 0.44, z1, 'S', 1.9, 0.44);

  // The entrance bays, faced in stone: an arched doorway and windows over it.
  for (const [d, ox] of [['E', x1], ['W', x0]] as const) {
    const [nx] = NORMAL[d];
    b.box(Math.min(ox, ox + nx * BAY), 0, cz - 1.3, Math.max(ox, ox + nx * BAY), EAVE, cz + 1.3, LIMESTONE, { faces: d === 'E' ? 'NES' : 'NWS' });
    onWall(b, ox + nx * BAY, cz, d, () => {
      archDoor(b, 0, 0.6, 1.4, 2.6, BASE);
      b.box(-0.9, 0, 0, 0.9, 0.6, 0.2, LIMESTONE, { faces: 'SEWT' });
      steps(b, -0.9, 0.9, 0.2, 0.6, 'S', LIMESTONE, 0.35);
      for (const y of [STOREY + 0.6, 2 * STOREY + 0.5]) for (const u of [-0.45, 0.45]) pane(b, u, y, 0.6, 1.7, BASE);
    });
    k.lights.push({ x: ox + nx * (BAY + 2.5), z: cz, r: 9, color: '#ffe2ae', k: 0.45 });
  }

  // Built windows on the east and south walls: round-headed below, pointed at the top.
  const rows = (d: Dir, ox: number, oz: number, us: number[]): void => onWall(b, ox, oz, d, () => {
    for (const u of us) {
      archWin(b, u, 1.35, 0.68, 1.4);
      archWin(b, u, STOREY + 0.45, 0.68, 2.0);
      archWin(b, u, 2 * STOREY + 0.45, 0.68, 2.0, { pointed: true });
    }
  });
  rows('E', x1, cz, [-3.1, -2.2, 2.2, 3.1]);
  rows('S', cx, z1, [-3.4, -2.5, 2.5, 3.4]);
  onWall(b, cx, z1, 'S', () => {
    for (const u of [-0.5, 0.5]) for (const y of [1.35, STOREY + 0.45, 2 * STOREY + 0.45]) pane(b, u, y, 0.55, 1.5);
  });
  // dormers on the long slopes, and two chimneys
  const sill = EAVE + 0.9;
  for (const x of [x0 + 1.6, x1 - 1.6]) {
    dormer(b, x, z1 + 0.45 - 1.3, sill, 'S', SLATE, 0.8, 0.95, 1.2);
    dormer(b, x, z0 - 0.45 + 1.3, sill, 'N', SLATE, 0.8, 0.95, 1.2);
  }
  chimney(b, cx - 2.6, cz, EAVE + RISE - 2.2, EAVE + RISE - 0.25, BRICK.red, 0.35, 0.3);
  chimney(b, cx + 2.6, cz, EAVE + RISE - 2.2, EAVE + RISE - 0.25, BRICK.red, 0.35, 0.3);
  k.person(x1 + 1.5, cz + 0.6);
}

// ---------------------------------------------------------------------------
// Noyes Laboratory
// ---------------------------------------------------------------------------

function noyes(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const WALL = 3 * STOREY, TOP = l.h, ROUGH = 0xc9c0ad;
  b.box(x0, 0, z0, x1, WALL, z1, BRICK.red, { win: HALL_NARROW, seed: 0.58, faces: 'NS' });
  b.box(x0, 0, z0, x1, WALL, z1, BRICK.red, { faces: 'EW' });
  b.box(x0 - 0.1, 0, z0 - 0.1, x1 + 0.1, 1.05, z1 + 0.1, ROUGH, { faces: 'NESWT' });
  b.box(x0 - 0.12, WALL, z0 - 0.12, x1 + 0.12, TOP - 0.4, z1 + 0.12, BRICK.deep, { faces: 'NESWB' });
  b.box(x0 - 0.3, TOP - 0.4, z0 - 0.3, x1 + 0.3, TOP, z1 + 0.3, LIMESTONE, { faces: 'NESWB' });
  b.box(x0 - 0.06, STOREY - 0.08, z0 - 0.06, x1 + 0.06, STOREY + 0.1, z1 + 0.06, LIMESTONE, { faces: 'NESWTB' });
  hip(b, x0, z0, x1, z1, TOP, 1.8, SLATE, 0.35);
  // the roof of a laboratory: chimneys, and the stacks of its fume hoods
  const rr = rng(1902);
  for (const [x, z] of [[x0 + 1.5, z0 + 1.6], [x0 + 3.5, z0 + 1.4], [x0 + 1.3, cz + 0.4], [x0 + 1.5, z1 - 1.6], [x1 - 3.4, z1 - 1.4], [x1 - 1.5, z1 - 1.6]]) {
    chimney(b, x, z, TOP + 0.4, TOP + 2.6 + rr() * 0.6, BRICK.deep, 0.32, 0.28);
  }
  for (const [x, z] of [[cx - 1.4, cz - 0.9], [cx + 0.2, cz + 1.1], [cx + 1.5, cz - 0.8], [cx - 2.8, cz + 0.9], [cx + 3, cz + 0.2], [cx - 0.4, cz - 1.6]]) {
    const top = TOP + 2.1 + rr() * 0.8;
    b.cyl(x, z, TOP + 0.6, top, 0.2, 0.2, 6, 0xb9bdc2, { cap: false });
    b.cyl(x, z, top, top + 0.3, 0.36, 0.04, 4, 0x9aa0a6, { cap: false, phase: Math.PI / 4 });
  }
  b.box(cx - 1.2, TOP + 1.2, cz - 0.4, cx + 1.2, TOP + 2.0, cz + 0.4, 0xa9adb2);

  // The two fronts: the deep porch of rough stone on the Quad, a smaller arched door on Mathews.
  const windows = (porch: boolean): void => {
    for (const s of [-1, 1]) {
      // three small round-headed windows in an arcade of rough stone, each side of the door
      b.box(s * 1.85, 1.1, 0, s * 3.85, 3.0, 0.035, ROUGH, { faces: 'STEW' });
      for (const u of [2.3, 2.85, 3.4]) archWin(b, s * u, 1.35, 0.42, 1.45, { hood: ROUGH, sill: false });
      for (const u of [2.3, 3.4]) archWin(b, s * u, STOREY + 0.6, 0.62, 1.85);
      for (const u of [2.3, 2.85, 3.4]) archWin(b, s * u, 2 * STOREY + 0.45, 0.48, 1.8, { sill: false, bare: true });
    }
    for (const u of [-0.6, 0, 0.6]) archWin(b, u, 2 * STOREY + 0.45, 0.5, 1.85, { sill: false, bare: true });
    if (!porch) for (const u of [-0.65, 0.65]) archWin(b, u, STOREY + 0.6, 0.62, 1.85);
  };
  onWall(b, x0, cz, 'W', () => {
    windows(true);
    const D = 0.75, W2 = 1.7, SPRING = 2.2, PT = 4.6;
    for (const s of [-1, 1]) b.box(s > 0 ? W2 / 2 : -W2 / 2 - 0.85, 0, 0, s > 0 ? W2 / 2 + 0.85 : -W2 / 2, PT, D, ROUGH, { faces: s > 0 ? 'SEW' : 'SWE' });
    // the arch: its face over the opening and the vault under it
    const r = W2 / 2, n = 8;
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI * (1 - i / n), a1 = Math.PI * (1 - (i + 1) / n);
      const pa: [number, number] = [Math.cos(a0) * r, SPRING + Math.sin(a0) * r], pb: [number, number] = [Math.cos(a1) * r, SPRING + Math.sin(a1) * r];
      b.quad([pa[0], pa[1], D], [pb[0], pb[1], D], [pb[0], PT, D], [pa[0], PT, D], [0, 0, 1], ROUGH);
      const am = Math.PI * (1 - (i + 0.5) / n);
      b.quad([pa[0], pa[1], 0], [pb[0], pb[1], 0], [pb[0], pb[1], D], [pa[0], pa[1], D], [-Math.cos(am), -Math.sin(am), 0], 0xb3aa98);
    }
    halfDisc(b, 0, SPRING, r + 0.18, D + 0.03, LIMESTONE, undefined, 6);
    b.box(-r, 0, 0, r, SPRING, 0.001 + 0.0, 0xb3aa98, { faces: 'EW' });
    b.box(-r - 0.85, PT, -0.05, r + 0.85, PT + 0.25, D + 0.1, LIMESTONE, { faces: 'SEWTB' });
    b.box(-1.2, PT - 1.15, D, 1.2, PT - 0.25, D + 0.05, LIMESTONE, { faces: 'STEW' });
    // round shafts at its corners, with caps
    for (const s of [-1, 1]) {
      b.cyl(s * (r + 0.85), D - 0.05, 0, PT + 0.6, 0.27, 0.27, 8, ROUGH, { cap: false });
      b.cyl(s * (r + 0.85), D - 0.05, PT + 0.6, PT + 0.95, 0.32, 0.05, 8, LIMESTONE, { cap: false });
    }
    // the doors inside, the floor, and steps down
    b.box(-0.75, 0.5, 0, 0.75, SPRING + 0.6, 0.04, WOOD, { faces: 'S' });
    b.box(-0.6, 0.6, 0, 0.6, SPRING + 0.3, 0.06, DARK, { faces: 'S', win: interior(1.3) });
    b.box(-r, 0, 0, r, 0.5, D, LIMESTONE, { faces: 'T' });
    steps(b, -r, r, D, 0.5, 'S', LIMESTONE, 0.35);
  });
  k.glows.push({ x: x0 - 0.4, y: 2.9, z: cz, sx: 0.3, sy: 0.15, sz: 0.3, color: '#ffe2ae' });
  k.lights.push({ x: x0 - 3, z: cz, r: 9, color: '#ffe2ae', k: 0.45 });
  onWall(b, x1, cz, 'E', () => {
    windows(false);
    archDoor(b, 0, 0.5, 1.2, 2.6, ROUGH);
    b.box(-0.8, 0, 0, 0.8, 0.5, 0.35, LIMESTONE, { faces: 'SEWT' });
    steps(b, -0.8, 0.8, 0.35, 0.5, 'S', LIMESTONE, 0.35);
  });
  // its name, in the frieze under the cornice on Mathews, high enough to be seen over the laboratories east of it
  nameBoard(k, 'quad-east-noyes', x1 + 0.12, (WALL + TOP - 0.4) / 2, cz, 'E', 3.2, 0.3);
  k.lights.push({ x: x1 + 2.5, z: cz, r: 8, color: '#ffe2ae', k: 0.4 });
  k.person(x0 - 1.2, cz + 0.4);
  k.person(x1 + 1.1, cz - 1.6);
}

// ---------------------------------------------------------------------------
// Davenport Hall
// ---------------------------------------------------------------------------

function davenport(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, cz = (z0 + z1) / 2;
  const WALL = 3 * STOREY, EAVE = WALL + 0.3, BR = BRICK.deep;
  // a main block on the Quad, and two wings running back to the east round a court
  const MAIN = 4.6, WING = 2.8, xm = x0 + MAIN;
  const parts: [number, number, number, number, string][] = [
    [x0, z0, xm, z1, 'NSW'],
    [xm, z0, x1, z0 + WING, 'NES'],
    [xm, z1 - WING, x1, z1, 'NES'],
  ];
  for (const [a, za, c, zb, f] of parts) {
    b.box(a, 0, za, c, WALL, zb, BR, { win: HALL, seed: a * 0.07, faces: f });
    b.box(a - 0.08, 0, za - 0.08, c + 0.08, 1.1, zb + 0.08, BASE, { faces: f + 'T' });
    for (const [y0, y1] of [[STOREY - 0.08, STOREY + 0.08], [2 * STOREY - 0.1, 2 * STOREY + 0.3]]) b.box(a - 0.06, y0, za - 0.06, c + 0.06, y1, zb + 0.06, TERRA, { faces: f + 'TB' });
    b.box(a - 0.35, WALL, za - 0.35, c + 0.35, EAVE, zb + 0.35, TERRA, { faces: f + 'B' });
  }
  // the court's walls, and its door
  b.box(xm, 0, z0 + WING, xm + 0.01, WALL, z1 - WING, BR, { win: HALL, seed: 0.9, faces: 'E' });
  b.box(xm, 0, z0 + WING, x1, WALL, z0 + WING + 0.01, BR, { win: HALL, seed: 0.4, faces: 'S' });
  b.box(xm, 0, z1 - WING - 0.01, x1, WALL, z1 - WING, BR, { win: HALL, seed: 0.6, faces: 'N' });
  b.box(xm - 0.35, WALL, z0 + WING - 0.35, xm + 0.35, EAVE, z1 - WING + 0.35, TERRA, { faces: 'EB' });
  onWall(b, xm, cz, 'E', () => {
    b.box(-0.6, 1.1, 0, 0.6, 3.6, 0.08, TERRA, { faces: 'SEW' });
    b.box(-0.45, 1.1, 0, 0.45, 3.3, 0.1, DARK, { faces: 'S', win: interior(1.2) });
    b.box(-0.8, 3.6, 0, 0.8, 3.8, 0.5, TERRA, { faces: 'SEWTB' });
    b.box(-0.7, 0, 0, 0.7, 1.1, 0.4, LIMESTONE, { faces: 'SEWT' });
    steps(b, -0.7, 0.7, 0.4, 1.1, 'S', LIMESTONE, 0.3);
  });
  // terra cotta quoins at the outer corners
  for (const [x, z] of [[x0, z0], [x0, z1], [x1, z0], [x1, z1], [x1, z0 + WING], [x1, z1 - WING]]) {
    const sx = x === x0 ? 1 : -1, sz = z === z0 || z === z1 - WING ? 1 : -1;
    b.box(Math.min(x, x + sx * 0.32) - 0.04, 1.1, Math.min(z, z + sz * 0.32) - 0.04, Math.max(x, x + sx * 0.32) + 0.04, WALL, Math.max(z, z + sz * 0.32) + 0.04, TERRA, { faces: 'NESW' });
  }
  // low roofs of slate
  hip(b, x0, z0, xm, z1, EAVE, 1.5, SLATE, 0.35);
  hip(b, xm - 1.2, z0, x1, z0 + WING, EAVE, 1.25, SLATE, 0.35);
  hip(b, xm - 1.2, z1 - WING, x1, z1, EAVE, 1.25, SLATE, 0.35);
  chimney(b, x0 + 1.2, z0 + 1.2, EAVE + 0.6, EAVE + 2.4, BR, 0.4, 0.32);
  chimney(b, x1 - 1.0, z1 - 1.4, EAVE + 0.4, EAVE + 2.2, BR, 0.4, 0.32);
  for (const z of [cz - 1.3, cz + 1.3]) dormer(b, x0 - 0.35 + 1.2, z, EAVE + 0.35, 'W', SLATE, 0.8, 0.8, 1.0);
  for (const x of [xm + 1.0, x1 - 1.4]) {
    dormer(b, x, z1 + 0.35 - 0.75, EAVE + 0.35, 'S', SLATE, 0.75, 0.75, 0.8);
    dormer(b, x, z0 - 0.35 + 0.75, EAVE + 0.35, 'N', SLATE, 0.75, 0.75, 0.8);
  }

  // The pavilion on the Quad front: two Ionic columns in a recessed entrance, an attic over them.
  const PO = 0.5, xf = x0 - PO, HALF = 1.8, OPEN = 1.05, FLOOR = 0.9, PT = l.h + 0.4;
  b.box(xf, 0, cz - HALF, x0, PT, cz + HALF, BR, { faces: 'NS' });
  b.box(xf - 0.08, 0, cz - HALF - 0.08, x0, 1.1, cz + HALF + 0.08, BASE, { faces: 'NSWT' });
  for (const s of [-1, 1]) {
    const za = s < 0 ? cz - HALF : cz + OPEN, zb = s < 0 ? cz - OPEN : cz + HALF;
    b.box(xf, 0, za, x0, 2 * STOREY, zb, BR, { faces: s < 0 ? 'WS' : 'WN' });
    // terra cotta quoins at its outer corners
    b.box(xf - 0.05, 1.1, s < 0 ? za - 0.05 : zb - 0.25, xf + 0.2, PT - 0.6, s < 0 ? za + 0.25 : zb + 0.05, TERRA, { faces: 'NSWT' });
  }
  b.box(xf, 2 * STOREY, cz - HALF, x0, PT, cz + HALF, BR, { faces: 'W' });
  b.box(xf - 0.12, 2 * STOREY - 0.2, cz - HALF - 0.12, x0, 2 * STOREY + 0.5, cz + HALF + 0.12, TERRA, { faces: 'NSWTB' });
  b.box(xf - 0.3, PT - 0.6, cz - HALF - 0.3, x0, PT - 0.25, cz + HALF + 0.3, TERRA, { faces: 'NSWB' });
  b.box(xf - 0.05, PT - 0.25, cz - HALF - 0.05, x0 + 0.5, PT, cz + HALF + 0.05, TERRA, { faces: 'NSWT' });
  b.box(xf, 0, cz - OPEN, x0, FLOOR, cz + OPEN, LIMESTONE, { faces: 'WT' });
  steps(b, cz - OPEN, cz + OPEN, xf, FLOOR, 'W', LIMESTONE, 0.33);
  for (const s of [-1, 1]) column(b, xf + 0.3, cz + s * 0.5, FLOOR, 2 * STOREY - 0.2, 0.2, TERRA);
  onWall(b, x0, cz, 'W', () => {
    b.box(-0.5, FLOOR, 0, 0.5, FLOOR + 2.4, 0.04, DARK, { faces: 'S', win: interior(1.3) });
    pane(b, 0, FLOOR + 2.9, 1.2, 1.5, TERRA);
  });
  onWall(b, xf, cz, 'W', () => {
    for (const u of [-1.0, 0, 1.0]) pane(b, u, 2 * STOREY + 0.75, 0.55, 1.05, TERRA);
    b.box(-1.4, PT - 1.45, 0, 1.4, PT - 0.85, 0.05, TERRA, { faces: 'STEW' });
    for (const s of [-1, 1]) roundel(b, [s * 1.5, PT - 0.3, 0.03], 0.15, 'S', TERRA, {}, 8);
  });
  k.glows.push({ x: xf + 0.25, y: 2 * STOREY - 0.4, z: cz, sx: 0.3, sy: 0.12, sz: 1.6, color: '#ffe2ae' });
  k.lights.push({ x: xf - 2.5, z: cz, r: 9, color: '#ffe2ae', k: 0.45 });
  nameBoard(k, 'quad-east-davenport', (x0 + x1) / 2, 2 * STOREY + 0.1, z1 + 0.06, 'S', 3.8, 0.42);
  k.person(xf - 0.6, cz + 0.6, 0);
  k.person(xf + 0.2, cz - 0.4, FLOOR);
}

// ---------------------------------------------------------------------------
// Smith Memorial Hall
// ---------------------------------------------------------------------------

function smith(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const LOW = 2 * STOREY, ENT = LOW + 0.9, ATT = l.h - 0.2, RISE = 1.5;
  // the hall in the middle, and a lower wing along each side of it
  const HALF = 2.0, za = cz - HALF, zb = cz + HALF, REC = 1.2;
  for (const [a, c, f] of [[z0, za, 'NEW'], [zb, z1, 'SEW']] as const) {
    b.box(x0, 0, a, x1, LOW, c, BRICK.red, { win: HALL_NARROW, seed: a * 0.1, faces: f });
    b.box(x0 - 0.08, 0, a - 0.08, x1 + 0.08, 0.6, c + 0.08, LIMESTONE, { faces: f + 'T' });
    b.box(x0 - 0.1, LOW, a - 0.1, x1 + 0.1, ENT, c + 0.1, LIMESTONE, { faces: f + 'TB' });
    b.box(x0 - 0.2, ENT - 0.25, a - 0.2, x1 + 0.2, ENT - 0.1, c + 0.2, LIMESTONE, { faces: f + 'B' });
  }
  b.box(x0, 0, za, x1 - REC, LOW, zb, BRICK.red, { win: HALL_NARROW, seed: 0.81, faces: 'W' });
  b.box(x0, LOW, za, x1, ATT, zb, BRICK.red, { faces: 'WNS' });
  b.box(x0 - 0.08, 0, za, x0, 0.6, zb, LIMESTONE, { faces: 'WT' });
  b.box(x0 - 0.1, ENT - 0.1, za - 0.15, x1 + 0.1, ENT + 0.1, zb + 0.15, LIMESTONE, { faces: 'NSWTB' });
  b.box(x0 - 0.3, ATT, za - 0.3, x1 + 0.1, ATT + 0.2, zb + 0.3, LIMESTONE, { faces: 'NSWB' });
  gable(b, x0 - 0.2, za, x1, zb, ATT + 0.2, RISE, 0x6f7a72, LIMESTONE, 'x', 0.3);

  // The east front: four Ionic columns between brick piers, under an entablature, an attic and a pediment.
  const PIER = 0.55, FLOOR = 0.6;
  for (const s of [-1, 1]) {
    const a = s < 0 ? za : zb - PIER, c = s < 0 ? za + PIER : zb;
    b.box(x1 - REC, 0, a, x1, LOW, c, BRICK.red, { faces: s < 0 ? 'ES' : 'EN' });
  }
  b.box(x1 - REC, FLOOR, za + PIER, x1 - REC + 0.01, LOW, zb - PIER, BRICK.red, { faces: 'E' });
  b.box(x1 - 0.05, LOW, za - 0.1, x1 + 0.1, ENT, zb + 0.1, LIMESTONE, { faces: 'E' });
  b.box(x1 - REC, LOW - 0.02, za, x1 + 0.1, LOW, zb, LIMESTONE, { faces: 'B' });
  b.box(x1 - 0.05, ENT, za - 0.1, x1 + 0.08, ATT, zb + 0.1, LIMESTONE, { faces: 'ENS' });
  b.box(x1 - 0.1, ATT, za - 0.3, x1 + 0.2, ATT + 0.2, zb + 0.3, LIMESTONE, { faces: 'ENSTB' });
  onWall(b, x1 + 0.2, cz, 'E', () => roundel(b, [0, ATT + 0.75, 0.03], 0.32, 'S', LIMESTONE, {}, 10));
  for (const u of [-1.35, -0.45, 0.45, 1.35]) column(b, x1 - 0.35, cz + u, FLOOR, LOW, 0.22, LIMESTONE);
  onWall(b, x1 - REC + 0.01, cz, 'E', () => {
    for (const u of [-0.9, 0, 0.9]) {
      pane(b, u, 3.4, 0.7, LOW - 3.4 - 0.3);
      b.box(u - 0.35, FLOOR, 0, u + 0.35, FLOOR + 2.0, 0.05, 0x1f3550, { faces: 'S' });
      b.box(u - 0.28, FLOOR + 0.1, 0, u + 0.28, FLOOR + 1.9, 0.07, DARK, { faces: 'S', win: interior(1.2) });
    }
  });
  b.box(x1 - REC, 0, za + PIER, x1 + 0.15, FLOOR, zb - PIER, LIMESTONE, { faces: 'ET' });
  steps(b, za + PIER, zb - PIER, x1 + 0.15, FLOOR, 'E', LIMESTONE, 0.4);
  k.glows.push({ x: x1 - 0.6, y: LOW - 0.25, z: cz, sx: 0.3, sy: 0.12, sz: 2.6, color: '#ffe2ae' });
  k.lights.push({ x: x1 + 2.5, z: cz, r: 9, color: '#ffe2ae', k: 0.5 });

  // The doors at the north and south ends: two columns each between piers, a tall window over the door.
  for (const [d, oz] of [['S', z1], ['N', z0]] as const) {
    onWall(b, cx, oz, d, () => {
      const P = 0.6, O = 0.55;
      for (const s of [-1, 1]) b.box(s * 1.0, 0, 0, s * (1.0 + P), LOW, O, BRICK.red, { faces: 'SEW' });
      b.box(-1.0, 0, 0, 1.0, 0.3, O, LIMESTONE, { faces: 'ST' });
      for (const s of [-1, 1]) column(b, s * 0.5, O - 0.25, 0.3, LOW, 0.17, LIMESTONE);
      b.box(-1.0 - P - 0.1, LOW, 0, 1.0 + P + 0.1, ENT, O + 0.1, LIMESTONE, { faces: 'SEWTB' });
      b.box(-0.9, ENT, 0, 0.9, ENT + 0.6, O - 0.1, LIMESTONE, { faces: 'SEWT' });
      b.box(-0.45, 0.3, 0, 0.45, 2.4, 0.04, 0x1f3550, { faces: 'S' });
      b.box(-0.36, 0.4, 0, 0.36, 2.3, 0.06, DARK, { faces: 'S', win: interior(1.2) });
      pane(b, 0, 3.0, 0.8, LOW - 3.0 - 0.3);
    });
  }
  nameBoard(k, 'quad-east-smith', cx, (LOW + ENT) / 2, z1 + 0.65, 'S', 3.3, 0.3);
  k.lights.push({ x: cx, z: z1 + 2.5, r: 8, color: '#ffe2ae', k: 0.4 });
  k.person(x1 + 0.8, cz + 1.1);
  k.person(cx + 0.6, z1 + 0.9);
}

// ---------------------------------------------------------------------------
// The Astronomical Observatory
// ---------------------------------------------------------------------------

function observatory(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, cx = (x0 + x1) / 2;
  const WALL = STOREY, CORN = WALL + 0.3;
  // the long low wing along the north, and an addition at the south-west
  const zw = z0 + 1.8;
  b.box(x0, 0, z0, x1, WALL, zw, BUFF, { win: HALL_NARROW, seed: 0.27, faces: 'NESW' });
  b.box(x0 - 0.25, WALL, z0 - 0.25, x1 + 0.25, CORN, zw + 0.25, TRIM, { faces: 'NESWTB', top: 0x9a9994 });
  b.box(x0, 0, zw, x0 + 1.25, WALL - 0.3, z1 - 0.3, BUFF, { win: HALL_NARROW, seed: 0.5, faces: 'SW' });
  b.box(x0 - 0.15, WALL - 0.3, zw, x0 + 1.4, WALL - 0.1, z1 - 0.15, TRIM, { faces: 'SWETB', top: 0x9a9994 });
  // the tower: eight-sided, with a gallery round it on brackets, a drum, a cornice and the dome
  const r = 1.45, tz = z1 - r * Math.cos(Math.PI / 8) - 0.05, tx = Math.min(cx + 0.35, x1 - r - 0.05);
  const G = 4.3, oct = { phase: Math.PI / 8 };
  b.cyl(tx, tz, 0, G, r, r, 8, BUFF, { ...oct, cap: false, win: { ...HALL_NARROW, cell: 1.2 }, seed: 0.9 });
  b.cyl(tx, tz, G, G + 0.2, 2.0, 2.0, 8, TRIM, { ...oct, cap: TRIM });
  for (let i = 0; i < 8; i++) {
    const a0 = Math.PI / 8 + (i * Math.PI) / 4, a1 = a0 + Math.PI / 4;
    tri(b, [tx, G, tz], [tx + Math.cos(a0) * 2, G, tz + Math.sin(a0) * 2], [tx + Math.cos(a1) * 2, G, tz + Math.sin(a1) * 2], [0, -1, 0], TRIM);
    // the rail and its posts
    const am = (a0 + a1) / 2, rm = 1.9 * Math.cos(Math.PI / 8), side = 2 * 1.9 * Math.sin(Math.PI / 8);
    b.obox(tx + Math.cos(am) * rm, G + 0.95, tz + Math.sin(am) * rm, 0.06, 0.07, side / 2, am, TRIM);
    b.box(tx + Math.cos(a0) * 1.9 - 0.06, G + 0.2, tz + Math.sin(a0) * 1.9 - 0.06, tx + Math.cos(a0) * 1.9 + 0.06, G + 1.05, tz + Math.sin(a0) * 1.9 + 0.06, TRIM, { faces: 'NESW' });
    if (i % 2 === 0) b.obox(tx + Math.cos(am) * (r + 0.2), G - 0.3, tz + Math.sin(am) * (r + 0.2), 0.25, 0.25, 0.04, am, IRON);
  }
  const DR = r * 0.88, TOPD = l.h;
  b.cyl(tx, tz, G + 0.2, G + 1.3, DR, DR, 8, BUFF, { ...oct, cap: false });
  b.cyl(tx, tz, G + 1.3, G + 1.55, DR + 0.28, DR + 0.28, 8, TRIM, { ...oct, cap: TRIM });
  const base = G + 1.55, hr = Math.min(DR + 0.05, TOPD - base);
  lathe(b, tx, tz, [[hr, base], [hr * 0.96, base + hr * 0.35], [hr * 0.8, base + hr * 0.65], [hr * 0.5, base + hr * 0.88], [0.12, TOPD]], 12, SILVER);
  // its shutter, a strip from the foot of the dome over the top, facing south
  slab(b, [tx, base + 0.1, tz + hr + 0.02], [tx, base + hr * 0.7, tz + hr * 0.75], 0.18, 0.05, 0xa4abb3);
  slab(b, [tx, base + hr * 0.7, tz + hr * 0.75], [tx, TOPD + 0.05, tz], 0.18, 0.05, 0xa4abb3);
  // a white door on the tower's south face, and a lamp over it
  onWall(b, tx, tz + r * Math.cos(Math.PI / 8), 'S', () => {
    b.box(-0.38, 0, 0, 0.38, 2.0, 0.05, TRIM, { faces: 'S' });
    b.box(-0.28, 1.4, 0, 0.28, 1.85, 0.07, GLASS, { faces: 'S', win: interior(1.1) });
    b.box(-0.6, 0, 0, 0.6, 0.25, 0.55, LIMESTONE, { faces: 'SEWT' });
  });
  k.glows.push({ x: tx, y: 2.35, z: z1 + 0.15, sx: 0.25, sy: 0.25, sz: 0.2, color: '#ffe2ae' });
  k.lights.push({ x: tx + 1, z: z1 + 2, r: 8, color: '#ffe2ae', k: 0.45 });
  k.person(tx + 1.2, tz + 0.6, G + 0.2);
  // its name, on a plain board on two posts by the walk, where the opening view reads it
  const bx = x1 - 0.55, bz = z1 - 0.3;
  for (const s of [-1, 1]) b.box(bx + s * 0.75 - 0.05, 0, bz - 0.05, bx + s * 0.75 + 0.05, 0.6, bz + 0.05, IRON, { faces: 'NESW' });
  b.box(bx - 0.95, 0.55, bz - 0.04, bx + 0.95, 1.55, bz + 0.04, TRIM, { faces: 'NESWTB' });
  k.sign('quad-east-observatory', bx, 1.05, bz + 0.07, 0, 1, 0.9, 1.8);
}

/** The models, by the id of their lot in plan.ts. */
export const MODELS: Record<string, Model> = {
  foellinger,
  harker,
  'natural-history': naturalHistory,
  noyes,
  davenport,
  smith,
  observatory,
};

/** Whatever this file builds that is not a lot. */
export function extras(k: Build): void {
  void k;
}
