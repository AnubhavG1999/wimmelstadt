// The Red Keep on Aegon's High Hill as it stood in 129 AC, new and whole, with
// Maegor's Holdfast inside it; the works of the hill under it; and Aegon's
// strand at the river's mouth, with three ships of the Conquest drawn up on it
// as they were in 2 BC, the one scene on the tile from that year.
//
// From the books, as the research notes give them (AGOT ch. 18 above all): a
// castle of pale red stone on the high hill over the mouth of the Blackwater
// Rush, smaller than Winterfell; seven huge drum towers crowned with iron
// ramparts, set in massive battlemented curtain walls with nests for archers;
// bronze gates, and an immense grim barbican with a square of cobbles before
// it; behind the walls small yards, vaulted halls, stables; Maegor's Holdfast,
// a massive square castle within the castle behind a dry moat (its iron spikes
// are left out), reached by a drawbridge; and the throne room, which runs north
// and south, with tall narrow windows in its east and west walls and great
// doors of oak and bronze. It was begun in 35 AC where Aegon's timber fort had
// stood, and finished under Maegor. Balerion came down into its yard in 56 AC.
//
// Here: the curtains, with six of the seven drums at their corners and along
// them, and the seventh, the tallest, at the south-east corner, flat on top
// inside a low parapet, where Caraxes perches; the gate on the south between two
// drums, behind its barbican, with its square on a terrace of the hill; the
// throne room along the west wall, its great doors on the gate's yard; the
// outer yard on the north, with stables and a well; the Holdfast in the
// south-east with its four turrets, its flat roof under Caraxes's tail, its
// moat and its drawbridge. The hill is
// squared off on the south and the west into a terrace held up by buttressed
// walls, with a bastion at the south-east; its north-east and east are a sheer
// face of rock down to the bay, with a parapet along its edge and a stair down
// the cliff top to a postern onto Aegon's strand. From the city a stair winds
// up its north side, and a way runs on round the castle's west side on the
// terrace to the gate's square.
//
// Everything takes its place from plan.ts. The look is the books' words and
// this tile's own drawing: nothing is taken from the television series.

import { interior, rng, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { area, flat, rect } from '../../engine/ground';
import { archway, figure, roundel, tri, wheel, type Dress } from '../../engine/parts';
import { face3, gable, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import { field, heightOn } from '../../engine/terrain';
import type { Build } from '../../engine/tile';
import { PAVING as CROWN_PAVING, SAND, STONE_DARK } from './land';
import { BRONZE, DARK, LANCETS, LOOPS, LOOPS_CLOSE, ROCK, ROCK_DARK, ROOF, STONE, TIMBER, TIMBER_DARK, TO_VIEW, banner, brazier, fire, nameBoard, nameSign } from './look';
import type { Model } from './models';
import { AEGON, LAND_NORTH, SHORE, WATER_LEVEL, inside, lotOf, type Lot, type P2 } from './plan';

// ---------------------------------------------------------------------------
// Where things are, all from the plan
// ---------------------------------------------------------------------------

const RK = lotOf('red-keep'), HF = lotOf('rk-holdfast'), TW = lotOf('rk-tower'), ST = lotOf('strand');
const WALL_S = lotOf('kl-wall-s'), WALL_E = lotOf('kl-wall-e');
const A = AEGON, [CX, CZ] = A.c, Y = A.y;

const RED = STONE.red, SHADE = STONE.redShade, CITY = STONE.city, CITY_SHADE = STONE.cityShade;
/** The iron of the drums' crowns: painted lighter than iron, since thin parts come out dark. */
const IRON = 0x80858b, IRON_DARK = 0x5f6368;
/** The hill's retaining walls: the castle's stone, weathered, with a paler coping. */
const MASONRY = 0xb38672, MASONRY_DARK = 0x9b725f, COPING = 0xd2ac95;
/** The rock of the hill's east face, bed above bed: a warm sandstone, the castle's own. */
const BEDS = [0xc4a28a, 0xab8a74, 0xd1b098, 0xb7957e];
const BOULDER = 0x8a7a6e, BOULDER_DARK = 0x74675d;
const CLIFF_TOP = 0x93a46a, SLOPE_LEVEL = 0xb8ae96, YARD_FLOOR = 0xc7b3a0, COBBLES = 0xa39684, MOAT_FLOOR = 0x4a3c34;
const SOFFIT = 0x5a4038, OAK = 0x5e4127, FRAME = 0xd6a08a, GLASS = 0x2b2420, LEAD = 0x59636d, STEP = 0xc9b09f, STEP_TOP = 0xd6c3b2;

/** The curtains stand this far in from the edges of the castle's lot, so that the drums can stand out from them. */
const INSET = 1, THICK = 1.6, THICK_S = 1.4;
/** The curtains' walks, below the lot's top, which is where the drums' iron crowns end. */
const WALK = RK.top - 3, MERLON = 0.84;
/** The yard has a floor of its own over the crown, so that the Holdfast's moat can be sunk below it. */
const YARD = Y + 1.3, MOAT_Y = Y + 0.05;
/** The great tower: the tallest drum, at the south-east corner. */
const GT = { x: (TW.x0 + TW.x1) / 2, z: (TW.z0 + TW.z1) / 2, r: Math.min(TW.x1 - TW.x0, TW.z1 - TW.z0) / 2 - 0.1 };
/** The curtains' outer faces: the south one flush with the great tower's south side. */
const FACE = { w: RK.x0 + INSET, n: RK.z0 + INSET, e: RK.x1 - INSET, s: GT.z + GT.r };
/** The ground inside them. */
const IN = { x0: FACE.w + THICK, z0: FACE.n + THICK, x1: FACE.e - THICK, z1: FACE.s - THICK_S };
/** The middle lines of the curtains. */
const LINE = { w: FACE.w + THICK / 2, n: FACE.n + THICK / 2, e: FACE.e - THICK / 2, s: FACE.s - THICK_S / 2 };

/** The drums' radii; each stands in from the lot's edge by its radius and its crown's overhang. */
const CORNER_R = 1.7, MID_R = 1.4, CROWN_OUT = 0.25, CR = CORNER_R + CROWN_OUT, MR = MID_R + CROWN_OUT;
/** The gate: the middle of its way, between the south-west drum and a drum of its own; how far its barbican stands out; how wide the way is. */
const GATE = { x: RK.x0 + CR + CORNER_R + 0.9, front: RK.z1 + 1.4, w: 1.5 };

/** The six drums of the seven that stand in the curtains: the seventh is the great tower. */
const DRUMS: { x: number; z: number; r: number; flag?: boolean }[] = [
  { x: RK.x0 + CR, z: RK.z0 + CR, r: CORNER_R, flag: true }, // north-west
  { x: RK.x1 - CR, z: RK.z0 + CR, r: CORNER_R, flag: true }, // north-east
  { x: RK.x0 + CR, z: RK.z1 - CR, r: CORNER_R, flag: true }, // south-west, the gate's west drum
  { x: GATE.x + 2.3, z: RK.z1 - MR, r: MID_R }, // the gate's east drum
  { x: (RK.x0 + RK.x1) / 2, z: RK.z0 + MR, r: MID_R, flag: true }, // the middle of the north wall
  { x: RK.x1 - MR, z: (RK.z0 + CR + CORNER_R + GT.z - GT.r) / 2, r: MID_R }, // the middle of the east wall
];

/** The throne room, along the west wall: from the north yard to the gate's yard, where its great doors are. */
const HALL = { x0: IN.x0 + 0.15, z0: IN.z0 + 0.8, x1: HF.x0 - 1.3, z1: HF.z0 + 2.6, eaves: 15.2, ridge: RK.top };

/** Maegor's Holdfast: its keep inside the moat, which fills the rest of its lot up to the south curtain. */
const KEEP = { x0: HF.x0 + 0.7, z0: HF.z0 + 1.1, x1: GT.x - GT.r - 0.9, z1: HF.z0 + 1.1 + (GT.x - GT.r - 0.9 - (HF.x0 + 0.7)) };
const MOAT = { x0: HF.x0, z0: HF.z0, x1: HF.x1, z1: IN.z1 };

/** The posterns: one in the north wall, to the stair down to the city, and one in the east wall, to the cliff top. */
const POSTERN_N = { x: HF.x0, z: FACE.n };
const POSTERN_E = { x: FACE.e, z: GT.z - GT.r - 1.5 };

/** The stair down the cliff top: from a landing at the crown's east edge south to the court inside the postern onto the strand. */
const EAST_STAIR = { top: [CX + 14.9, CZ + 3.6] as P2, foot: [SHORE.city - 2.5, WALL_S.z0 - 2.1] as P2, w: 1.2, steps: 22 };
/** The stair down the north side: round the hill from the crown's north edge to its foot in the north-west, along the foot of the terrace's wall, in degrees round its middle. */
const NORTH_STAIR = { from: -95, to: -127, r0: A.crown + 0.6, r1: A.foot - 0.66, w: 1.3, steps: 18 };
/** The postern onto the strand, in the wall that closes the city between the south wall's end and the bay. */
const POSTERN_SE = { x: EAST_STAIR.foot[0] - 0.4, w: 1.0, spring: 1.75 };

const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));
const smooth01 = (t: number): number => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};

/** How high the stair down the cliff top is at a place along it. */
function stairY(z: number): number {
  const t = clamp01((z - EAST_STAIR.top[1]) / (EAST_STAIR.foot[1] - EAST_STAIR.top[1]));
  return Y + (0.05 - Y) * t;
}

// ---------------------------------------------------------------------------
// The hill as built: terraces, the bluff, the cliff and the ramp
// ---------------------------------------------------------------------------

/** The cliff top east of the crown: where it begins, how high it stands, from where on its north it rises, and how far west the bluff over the city's east wall reaches. */
const SHELF = { x: CX + 11, y: Y - 0.8, z0: WALL_E.z1 + 0.4, bluffX: CX + 4, bluffZ: CZ - 8 };
/**
 * The terrace round the crown on the south and the west, level with it and
 * held up by battered walls: the gate's square and the walk before the
 * castle's south front, out to a little short of the city's south wall, and
 * on the east to where the cliff top begins. Its edges run along the sheet's
 * rows, or along the diagonal each of its squares is cut on, so that its
 * walls are clean.
 */
const TERRACE_EDGE = { s: WALL_S.z0 - 1.3, e: EAST_STAIR.top[0] - 1.4, w: CX - A.foot + 2.8, n: RK.z0 - 2.4, sw: CZ + 7.2, ne: CX - 3.5 };
const TERRACE: P2[] = (() => {
  const { s, e, w, n, sw, ne } = TERRACE_EDGE;
  return [[e, CZ + 5.5], [e, s], [w + (s - sw), s], [w, sw], [w, n], [ne, n], [CX, CZ]];
})();
/**
 * The terrace's walls: each stands on the first line of the sheet outside the
 * terrace's edge and reaches back to the last line inside it, so that it hides
 * the sheet's steep facets between the two. Where it is, and which way it faces.
 */
const RETAINING: { a: P2; c: P2; out: P2 }[] = (() => {
  const E = TERRACE_EDGE, xe = Math.ceil(E.e), zs = Math.ceil(E.s), xw = Math.floor(E.w), zn = Math.floor(E.n), diag = Math.ceil(E.sw - E.w);
  return [
    { a: [xe, Math.floor(CZ + 5.5)], c: [xe, zs], out: [1, 0] },
    { a: [zs - diag, zs], c: [xe, zs], out: [0, 1] },
    { a: [xw, xw + diag], c: [zs - diag, zs], out: [-Math.SQRT1_2, Math.SQRT1_2] },
    { a: [xw, zn], c: [xw, xw + diag], out: [-1, 0] },
    { a: [xw, zn], c: [RK.x0 + 3, zn], out: [0, -1] },
  ];
})();

/** The cliff top's height: rising steeply out of the ground at the city's east wall, level, then falling with the stair to the court. */
function shelf(z: number): number {
  if (z < SHELF.z0) return 0;
  return Math.max(0, Math.min(SHELF.y * smooth01((z - SHELF.z0) / 2.2), stairY(z) - 0.25));
}

/** How high the hill is built up at a place, over its natural shape: 0 where it is not. */
function raise(x: number, z: number): number {
  const terrace = inside(TERRACE, x, z) ? Y : 0;
  return x >= SHELF.x || (x >= SHELF.bluffX && z <= SHELF.bluffZ) ? Math.max(terrace, shelf(z)) : terrace;
}

/** The hill's natural shape, as land.ts lays it. */
function natural(x: number, z: number): number {
  const d = Math.hypot(x - CX, z - CZ);
  if (d <= A.crown) return A.y;
  if (d >= A.foot) return 0;
  const t = (A.foot - d) / (A.foot - A.crown);
  return A.y * t * t * (3 - 2 * t);
}

/** The hill as land.ts draws it: the same sheet of facets, so that heights here are the heights that are seen. */
const LAND_HILL = field(CX - A.foot, CZ - A.foot, CX + A.foot, CZ + A.foot, 2, natural);
/**
 * The hill as it is built here: a sheet twice as fine over the same ground,
 * whose every facet lies inside one of land.ts's, raised where the terraces,
 * the bluff and the cliff are. Only the raised facets are drawn.
 */
const HILL = field(CX - A.foot, CZ - A.foot, CX + A.foot, CZ + A.foot, 1, (x, z) => Math.max(heightOn(LAND_HILL, x, z), raise(x, z)));
const RAISED: boolean[] = [];
for (let j = 0; j <= HILL.nz; j++) {
  for (let i = 0; i <= HILL.nx; i++) RAISED.push(HILL.y[j * (HILL.nx + 1) + i] > heightOn(LAND_HILL, HILL.x0 + i, HILL.z0 + j) + 0.02);
}

/** How high the ground is at a place on the hill, as built. */
const hill = (x: number, z: number): number => heightOn(HILL, x, z);

/** The lowest ground under a round thing. */
function under(x: number, z: number, r: number): number {
  let y = hill(x, z);
  for (let i = 0; i < 8; i++) y = Math.min(y, hill(x + Math.cos((i * Math.PI) / 4) * r, z + Math.sin((i * Math.PI) / 4) * r));
  return y;
}

/** The colour of a raised facet of the hill: paving or grass where it is level, masonry where a terrace's wall falls from the crown, rock in the east. */
function hillColor(y: number, top: number, level: number, x: number, z: number): number {
  const rock = x > SHELF.x - 0.5 || (x > SHELF.bluffX - 0.5 && z < SHELF.bluffZ + 0.5);
  if (level > (rock ? 0.75 : 0.93)) return y > Y - 0.05 ? CROWN_PAVING : rock ? CLIFF_TOP : SLOPE_LEVEL;
  if (top > Y - 0.05) return MASONRY;
  if (rock) return BEDS[Math.max(0, Math.floor(y / 1.7)) % BEDS.length];
  return level < 0.6 ? MASONRY : STONE_DARK;
}

/** The height of the bottom of the k-th bed in the cliff's face: a course of dressed stone at the foot, and rock above it. */
const bedAt = (k: number, z: number): number => (k <= 0 ? 0 : k === 1 ? 1.3 : 1.3 + (k - 1) * 1.7 + 0.3 * Math.sin(z * 0.9 + k * 1.9));

function drawHill(b: GeoBuilder): void {
  const f = HILL, n = f.nx + 1;
  const at = (i: number, j: number): V3 => [f.x0 + i, f.y[j * n + i], f.z0 + j];
  const up = (i: number, j: number): boolean => RAISED[j * n + i];
  const facet = (p: V3, q: V3, r: V3): void => {
    const ax = q[0] - p[0], ay = q[1] - p[1], az = q[2] - p[2], bx = r[0] - p[0], by = r[1] - p[1], bz = r[2] - p[2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const l = Math.hypot(nx, ny, nz) || 1;
    if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
    face3(b, p, q, r, [nx / l, ny / l, nz / l], hillColor((p[1] + q[1] + r[1]) / 3, Math.max(p[1], q[1], r[1]), ny / l, (p[0] + q[0] + r[0]) / 3, (p[2] + q[2] + r[2]) / 3));
  };
  // each square cut from its north-west corner to its south-east, as land.ts's are, so that each facet lies over one of its
  for (let j = 0; j < f.nz; j++) {
    for (let i = 0; i < f.nx; i++) {
      if (up(i, j) || up(i + 1, j) || up(i + 1, j + 1)) facet(at(i, j), at(i + 1, j), at(i + 1, j + 1));
      if (up(i, j) || up(i + 1, j + 1) || up(i, j + 1)) facet(at(i, j), at(i + 1, j + 1), at(i, j + 1));
    }
  }
  // the cliff over the bay: the sheet's east edge, upright from the water's edge, bed above bed
  const N: V3 = [1, 0, 0];
  for (let j = 0; j < f.nz; j++) {
    const p = at(f.nx, j), q = at(f.nx, j + 1), x = p[0];
    if (p[1] < 0.03 && q[1] < 0.03) continue;
    const top = Math.max(p[1], q[1]);
    for (let k = 0; k < 12 && (bedAt(k, p[2]) < top || bedAt(k, q[2]) < top); k++) {
      const a0 = Math.min(p[1], bedAt(k, p[2])), a1 = Math.min(p[1], bedAt(k + 1, p[2]));
      const c0 = Math.min(q[1], bedAt(k, q[2])), c1 = Math.min(q[1], bedAt(k + 1, q[2]));
      if (a1 - a0 < 0.01 && c1 - c0 < 0.01) continue;
      const col = k === 0 ? MASONRY_DARK : BEDS[k % BEDS.length];
      face3(b, [x, a0, p[2]], [x, c0, q[2]], [x, c1, q[2]], N, col);
      face3(b, [x, a0, p[2]], [x, c1, q[2]], [x, a1, p[2]], N, col);
    }
  }
}

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

/** A flat round-headed shape a hair proud of a wall that faces (nx, nz): a door, a window, a frame. Lit at night if `lit` is given. */
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

/** Merlons round the edge of a level rectangle at `y`, on the sides named (N E S W). */
function crenels(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, color: number, shade: number, sides = 'NESW', h = 0.8, t = 0.36, step = 1.5): void {
  const along = (a0: number, a1: number, put: (p: number, q: number) => void): void => {
    const n = Math.max(1, Math.round((a1 - a0) / step)), seg = (a1 - a0) / n;
    for (let i = 0; i < n; i++) put(a0 + seg * (i + 0.2), a0 + seg * (i + 0.8));
  };
  const o = { top: shade };
  if (sides.includes('N')) along(x0, x1, (p, q) => b.box(p, y, z0, q, y + h, z0 + t, color, o));
  if (sides.includes('S')) along(x0, x1, (p, q) => b.box(p, y, z1 - t, q, y + h, z1, color, o));
  if (sides.includes('W')) along(z0 + t, z1 - t, (p, q) => b.box(x0, y, p, x0 + t, y + h, q, color, o));
  if (sides.includes('E')) along(z0 + t, z1 - t, (p, q) => b.box(x1 - t, y, p, x1, y + h, q, color, o));
}

/**
 * A stretch of curtain wall from a to c, `thick` thick, its walk at WALK: a
 * battered plinth and a row of loops on its outer face, a corbel table under
 * its merlons, merlons on its outer edge and a low parapet on its inner. `out`
 * is +1 if its outer face looks to its own +z (south, for a wall that runs
 * east), and -1 if to its -z.
 */
function curtain(b: GeoBuilder, a: P2, c: P2, thick: number, y0: number, out: 1 | -1, seed: number): void {
  const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dz, dx), h = thick / 2, L = len / 2;
  const outer = out > 0 ? 'S' : 'N', inner = out > 0 ? 'N' : 'S';
  const win: WinSpec = { ...LOOPS, storey: WALK / 3 };
  // the outer face's edge, and a band that stands `d` proud of it from y0 to y1
  const proud = (y1: number, y2: number, d: number, color: number, faces: string): void =>
    b.box(-L, y1, out > 0 ? h - 0.01 : -h - d, L, y2, out > 0 ? h + d : -h + 0.01, color, { faces, top: color });
  b.moved((a[0] + c[0]) / 2, 0, (a[1] + c[1]) / 2, yaw, () => {
    b.box(-L, y0, -h, L, WALK, h, RED, { win, seed, faces: outer });
    b.box(-L, y0, -h, L, WALK, h, RED, { faces: `${inner}EWT`, top: SHADE });
    proud(y0, Y + 0.7, 0.24, SHADE, `${outer}T`);
    proud(WALK - 0.36, WALK, 0.14, SHADE, `${outer}TB`);
    const n = Math.max(1, Math.round(len / 1.9)), seg = len / n;
    for (let i = 0; i < n; i++) {
      const p = -L + seg * (i + 0.2), q = -L + seg * (i + 0.8);
      if (out > 0) b.box(p, WALK, h - 0.4, q, WALK + MERLON, h + 0.14, RED, { top: SHADE });
      else b.box(p, WALK, -h - 0.14, q, WALK + MERLON, -h + 0.4, RED, { top: SHADE });
    }
    if (out > 0) b.box(-L, WALK, -h, L, WALK + 0.35, -h + 0.28, RED, { top: SHADE });
    else b.box(-L, WALK, h - 0.28, L, WALK + 0.35, h, RED, { top: SHADE });
  });
}

/** One of the seven: a great drum of pale red stone on a battered foot, a string course, corbels, and a crown of iron with its merlons. */
function drum(k: Build, x: number, z: number, r: number, top: number, seed: number, flag = false): void {
  const b = k.b, sides = 10, crown = top - 1.6, storey = crown / Math.round(crown / 3.9), foot = Y + 0.8;
  const y0 = under(x, z, r + 0.3) - 0.4;
  b.cyl(x, z, y0, foot, r + 0.3, r, sides, RED, { cap: false, seed });
  b.cyl(x, z, foot, crown - 0.3, r, r, sides, RED, { win: { ...LOOPS, storey }, seed, cap: false });
  const band = crown - storey;
  b.cyl(x, z, band - 0.1, band + 0.1, r + 0.07, r + 0.07, sides, SHADE, { cap: false });
  b.cyl(x, z, crown - 0.3, crown, r, r + 0.25, sides, SHADE, { cap: false });
  b.cyl(x, z, crown, crown + 0.7, r + 0.25, r + 0.25, sides, IRON, { cap: IRON_DARK });
  for (let i = 0; i < sides; i += 2) {
    const a = ((i + 0.5) / sides) * Math.PI * 2, w = (r + 0.25) * Math.sin(Math.PI / sides) * 0.9;
    b.obox(x + Math.cos(a) * (r + 0.05), crown + 1.15, z + Math.sin(a) * (r + 0.05), 0.2, 0.45, w, a, IRON, { top: IRON_DARK });
  }
  if (flag) banner(b, x, z, crown + 0.7, 'targaryen', 3.6);
}

/** A round turret of the Holdfast, at one of its corners: loops, corbels and stone merlons. */
function turret(b: GeoBuilder, x: number, z: number, r: number, y0: number, top: number, seed: number): void {
  const sides = 8, crown = top - 0.75, shaft = crown - 0.2;
  b.cyl(x, z, y0, shaft, r, r, sides, RED, { win: { ...LOOPS_CLOSE, storey: shaft / Math.round(shaft / 3.3) }, seed, cap: false });
  b.cyl(x, z, shaft, crown, r, r + 0.13, sides, SHADE, { cap: SHADE });
  for (let i = 0; i < sides; i += 2) {
    const a = ((i + 0.5) / sides) * Math.PI * 2, w = (r + 0.13) * Math.sin(Math.PI / sides) * 0.85;
    b.obox(x + Math.cos(a) * (r - 0.05), crown + 0.375, z + Math.sin(a) * (r - 0.05), 0.17, 0.375, w, a, RED, { top: SHADE });
  }
}

/** A flight of steps along a line of places, each `w` wide, standing on whatever is under it: [x, z, height of its tread]. */
function steps(b: GeoBuilder, pts: [number, number, number][], w: number, color: number, top: number, ground: (x: number, z: number) => number): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, z0, y] = pts[i], [x1, z1] = pts[i + 1];
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, len = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(z1 - z0, x1 - x0);
    const ux = (x1 - x0) / len, uz = (z1 - z0) / len, px = -uz * (w / 2), pz = ux * (w / 2);
    let low = Infinity;
    for (const [sx, sz] of [[x0 + px, z0 + pz], [x0 - px, z0 - pz], [x1 + px, z1 + pz], [x1 - px, z1 - pz], [mx, mz]]) low = Math.min(low, ground(sx, sz));
    const yb = low - 0.25;
    if (y - yb < 0.05) continue;
    b.obox(mx, (y + yb) / 2, mz, len / 2 + 0.02, (y - yb) / 2, w / 2, yaw, color, { top });
  }
}

/** A guard of the castle: dark mail and a steel cap. */
const GUARD: Dress = { coat: 0x4a4e57, legs: 0x2f3136, hat: 0xa3a9ae, hatH: 0.3 };
/** A knight of the Kingsguard: all in white. */
const KINGSGUARD: Dress = { coat: 0xf2efe8, legs: 0xd8d8d8, hat: 0xd5d8dc, hatH: 0.34 };
/** One of the men who came ashore with the Conquest: dark leather and a steel cap. */
const CONQUEST: Dress = { coat: 0x3a3230, legs: 0x2a2426, hat: 0x8a8f96, hatH: 0.3 };

// ---------------------------------------------------------------------------
// Aegon's High Hill
// ---------------------------------------------------------------------------

function aegonsHill(k: Build): void {
  const b = k.b;
  drawHill(b);
  RETAINING.forEach((w, i) => retaining(b, w.a, w.c, w.out, i === 0 ? 0 : 3.6));
  cliffParapet(b);
  eastStair(k);
  northStair(k);
  terraceWay(k);
  seWalls(k);

  // rock showing through the slopes, and at the cliff's foot in the bay: low lumps, broad at the foot, two to a place
  const r = rng(3517);
  const lump = (x: number, z: number, s: number, y: number, h: number): void => {
    b.cyl(x, z, y - 0.4, y + h, s, s * (0.35 + r() * 0.15), 6, r() < 0.5 ? BOULDER : BOULDER_DARK, { phase: r() * 6, cap: r() < 0.5 ? BOULDER : ROCK });
    const a = r() * 6, d = s * 0.75;
    b.cyl(x + Math.cos(a) * d, z + Math.sin(a) * d, y - 0.4, y + h * 0.55, s * 0.6, s * 0.25, 5, BOULDER_DARK, { phase: r() * 6, cap: ROCK_DARK });
  };
  for (const [t, d, s] of [[-58, 16.3, 0.9], [-66, 15.6, 0.7], [-72, 16.9, 1.0], [-84, 16.6, 0.6], [150, 16.9, 0.8], [176, 16.3, 0.7], [198, 16.6, 0.9], [-150, 16.4, 0.7]]) {
    const a = (t * Math.PI) / 180, x = CX + Math.cos(a) * d, z = CZ + Math.sin(a) * d;
    lump(x, z, s, under(x, z, s), s * 0.5);
  }
  for (let z = SHELF.z0 + 3; z < EAST_STAIR.foot[1] - 3; z += 3.4 + r() * 1.6) lump(SHORE.city + 0.3 + r() * 0.4, z, 0.55 + r() * 0.3, WATER_LEVEL, 0.35 + r() * 0.3);

  // a few trees on the cliff top over the bay
  for (const [x, z, s] of [[SHORE.city - 2.2, SHELF.z0 + 5.6, 0.72], [SHORE.city - 3.6, SHELF.z0 + 8.6, 0.62]] as [number, number, number][]) k.tree(x, z, s, false, hill(x, z));
}

/**
 * A retaining wall of the terrace, its face on the line from a to c and its
 * body reaching back a unit into the terrace, up to the terrace's level: a
 * string course, a coping a little proud of it, and buttresses `step` apart
 * (none if 0). `out` is the way its face looks.
 */
function retaining(b: GeoBuilder, a: P2, c: P2, out: P2, step: number): void {
  const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dz, dx), L = len / 2;
  const s = -Math.sin(yaw) * out[0] + Math.cos(yaw) * out[1] > 0 ? 1 : -1;
  const back = Math.abs(out[0]) > 0.9 || Math.abs(out[1]) > 0.9 ? 1 : Math.SQRT1_2;
  let low = Y;
  for (let i = 0; i <= 10; i++) low = Math.min(low, hill(a[0] + (dx * i) / 10 + out[0] * 0.3, a[1] + (dz * i) / 10 + out[1] * 0.3));
  const y0 = low - 0.3, face = s > 0 ? 'S' : 'N';
  // in its own frame its face is at z = 0, and it reaches back towards -s
  const span = (z0: number, z1: number): [number, number] => (s > 0 ? [-z1, -z0] : [z0, z1]);
  b.moved((a[0] + c[0]) / 2, 0, (a[1] + c[1]) / 2, yaw, () => {
    const [b0, b1] = span(0, back);
    b.box(-L, y0, b0, L, Y, b1, MASONRY, { faces: `${face}EWT`, top: CROWN_PAVING });
    const band = (y1: number, y2: number, d: number, color: number): void => {
      const [p0, p1] = span(-d, 0);
      b.box(-L, y1, p0, L, y2, p1, color, { faces: `${face}EWTB` });
    };
    band(Y - 0.3, Y, 0.12, COPING);
    if (low < Y - 4) band(Y - 3.7, Y - 3.5, 0.07, MASONRY_DARK);
    if (step > 0) {
      const n = Math.floor(len / step);
      for (let i = 1; i <= n; i++) {
        const u = -L + (len * i) / (n + 1), [p0, p1] = span(-0.38, 0.02);
        b.box(u - 0.26, y0, p0, u + 0.26, Y - 0.75, p1, MASONRY, { faces: `${face}EWT`, top: MASONRY_DARK });
      }
    }
  });
}

/** The parapet along the cliff's edge: battlements on the level stretch, and a breastwork that falls with the ramp. */
function cliffParapet(b: GeoBuilder): void {
  const x0 = SHORE.city - 0.95, x1 = SHORE.city - 0.35, xm = (x0 + x1) / 2;
  const z0 = SHELF.z0 + 2.2, zr = EAST_STAIR.top[1] + 0.2, zEnd = WALL_S.z0 - 3.1, y = SHELF.y;
  b.box(x0, y - 0.3, z0, x1, y + 0.35, zr, MASONRY, { top: MASONRY_DARK, faces: 'NESWT' });
  const n = Math.round((zr - z0) / 1.9), seg = (zr - z0) / n;
  for (let i = 0; i < n; i++) b.box(x0, y + 0.35, z0 + seg * (i + 0.25), x1, Y, z0 + seg * (i + 0.75), MASONRY, { top: MASONRY_DARK });
  slab(b, [xm, shelf(zr) + 0.35, zr], [xm, shelf(zEnd) + 0.35, zEnd], (x1 - x0) / 2, 0.75, MASONRY, { under: MASONRY_DARK });
}

/** The stair down the cliff top, from the crown's east edge to the court inside the postern onto the strand. */
function eastStair(k: Build): void {
  const b = k.b, S = EAST_STAIR, [tx, tz] = S.top, [fx, fz] = S.foot;
  // the landing at its head, built out from the crown's edge, and the way to it from the castle's east postern
  const lx = tx - 1.05;
  b.box(lx, hill(tx, tz) - 2.2, tz - 1.4, tx + 0.7, Y - 0.02, tz + 0.1, MASONRY, { top: STEP_TOP });
  area(k, rect(POSTERN_E.x, POSTERN_E.z - 0.6, lx, POSTERN_E.z + 0.6), COBBLES, Y + 0.04);
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= S.steps; i++) {
    const t = i / S.steps, z = tz + (fz - tz) * t;
    pts.push([tx + (fx - tx) * t, z, Y + (0.05 - Y) * (i / (S.steps - 1))]);
  }
  steps(b, pts, S.w, STEP, STEP_TOP, hill);
  b.box(lx + 0.1, Y - 0.02, tz - 1.3, lx + 0.26, Y + 1.9, tz - 1.14, TIMBER, { faces: 'NESW' });
  fire(k, lx + 0.18, Y + 2.15, tz - 1.22, 0.16, 7);
  // the court at its foot, inside the postern, under the terrace's wall
  area(k, rect(TERRACE[0][0] + 0.55, fz - 0.3, SHORE.city - 1.65, WALL_S.z0 - 0.02), COBBLES, 0.04);
  k.person(fx + 0.2, fz + 1.0, 0.04);
  k.person(tx - 2.6, tz - 0.5, Y + 0.04);
}

/** The stair round the hill's north side, from the crown's north edge outside the north postern to the foot of the hill in the north-west. */
function northStair(k: Build): void {
  const b = k.b, S = NORTH_STAIR;
  const pos = (t: number): [number, number] => {
    const a = ((S.from + (S.to - S.from) * t) * Math.PI) / 180, r = S.r0 + (S.r1 - S.r0) * t;
    return [CX + Math.cos(a) * r, CZ + Math.sin(a) * r];
  };
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= S.steps; i++) pts.push([...pos(i / S.steps), Y + (0.05 - Y) * (i / (S.steps - 1))]);
  steps(b, pts, S.w, STEP, STEP_TOP, hill);
  // the way from the postern across the crown to its head
  const [hx, hz] = pos(0);
  area(k, rect(Math.min(hx, POSTERN_N.x) - 0.8, hz + 0.3, Math.max(hx, POSTERN_N.x) + 0.8, POSTERN_N.z), COBBLES, Y + 0.04);
  const [mx, mz] = pos(0.55);
  k.person(mx, mz, hill(mx, mz) + 0.1);
}

/** A band `half` wide to either side of a line of corners, as a shape, mitred at each corner. */
function bandOf(pts: P2[], half: number): P2[] {
  const left: P2[] = [], right: P2[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)];
    let ix = p[0] - a[0], iz = p[1] - a[1], ox = c[0] - p[0], oz = c[1] - p[1];
    if (i === 0) { ix = ox; iz = oz; }
    if (i === pts.length - 1) { ox = ix; oz = iz; }
    const il = Math.hypot(ix, iz), ol = Math.hypot(ox, oz);
    ix /= il; iz /= il; ox /= ol; oz /= ol;
    const k = 1 + ix * ox + iz * oz, nx = ((iz + oz) * half) / k, nz = ((-ix - ox) * half) / k;
    left.push([p[0] + nx, p[1] + nz]);
    right.push([p[0] - nx, p[1] - nz]);
  });
  return [...left, ...right.reverse()];
}

/**
 * The way up from the city to the gate: from the head of the north stair
 * across the crown, and round the castle's west side on the terrace to the
 * square before the barbican; with trees along its outer side, torches on
 * posts, and people on it.
 */
function terraceWay(k: Build): void {
  const b = k.b, W = TERRACE_EDGE, a = (NORTH_STAIR.from * Math.PI) / 180;
  const hx = CX + Math.cos(a) * NORTH_STAIR.r0, hz = CZ + Math.sin(a) * NORTH_STAIR.r0, x = W.w + 1.9;
  const pts: P2[] = [[hx - 0.3, hz + 1.2], [CX - 4.4, W.n + 1.3], [x, W.n + 1.3], [x, W.sw + 0.1], [GATE.x - 2.7, GATE.front + 1.0]];
  area(k, bandOf(pts, 0.75), COBBLES, Y + 0.04);
  for (const z of [W.n + 5.6, W.n + 11.0, W.n + 16.4]) k.tree(W.w + 0.8, z, 0.72, false, Y);
  for (const z of [W.n + 8.3, W.n + 13.7]) {
    b.box(x - 1.0, Y, z - 0.08, x - 0.84, Y + 2.0, z + 0.08, TIMBER, { faces: 'NESW' });
    fire(k, x - 0.92, Y + 2.25, z, 0.17, 7);
  }
  const r = rng(4512);
  for (let i = 0; i < 5; i++) {
    const s = 0.08 + i * 0.19 + r() * 0.06, seg = Math.min(pts.length - 2, Math.floor(s * (pts.length - 1))), t = s * (pts.length - 1) - seg;
    const [p, q] = [pts[seg], pts[seg + 1]];
    k.person(p[0] + (q[0] - p[0]) * t + (r() - 0.5) * 0.6, p[1] + (q[1] - p[1]) * t + (r() - 0.5) * 0.6, Y + 0.04);
  }
}

/** The walls that close the city between the south wall's end and the bay, with a corner turret and the postern onto the strand. */
function seWalls(k: Build): void {
  const b = k.b, z0 = WALL_S.z0, z1 = WALL_S.z1, x0 = WALL_S.x1, x1 = SHORE.city - 0.2, walk = WALL_S.top - 0.8, P = POSTERN_SE;
  const a = P.x - P.w / 2, c = P.x + P.w / 2;
  // the closing wall: in two pieces either side of the postern's arch, which is lit inside at night
  b.box(x0, -0.3, z0, a, walk, z1, CITY, { faces: 'NSET', top: CITY_SHADE, win: { ...LOOPS, storey: walk / 1.5 } });
  b.box(c, -0.3, z0, x1, walk, z1, CITY, { faces: 'NSWT', top: CITY_SHADE });
  archway(b, P.x, z0, z1, P.w, P.spring, walk, CITY, SOFFIT);
  b.quad([a, walk, z1], [c, walk, z1], [c, walk, z0], [a, walk, z0], [0, 1, 0], CITY_SHADE);
  crenels(b, x0, z0, x1, z1, walk, CITY, CITY_SHADE, 'S', 0.8, 0.4, 1.9);
  b.box(x0, walk, z0, x1, walk + 0.35, z0 + 0.28, CITY, { top: CITY_SHADE });
  // the postern's door, open, and its torches
  arched(b, P.x, z1, 0, 1, P.w + 0.3, 0, P.spring, CITY_SHADE, 0, 0.03);
  for (const [z, nz] of [[z0, -1], [z1, 1]] as [number, number][]) fire(k, P.x + 0.95, 2.3, z + nz * 0.25, 0.17, 6);
  b.quad([a + 0.02, 0, z1 - 0.1], [a + 0.02, 0, z1 - 0.9], [a + 0.02, P.spring, z1 - 0.9], [a + 0.02, P.spring, z1 - 0.1], [1, 0, 0], OAK);
  // the shore wall, from the cliff's foot to the corner
  const sx0 = SHORE.city - 1.6, sz0 = z0 - 3.1;
  b.box(sx0, -0.3, sz0, x1, walk, z0 + 0.02, CITY, { faces: 'NEWT', top: CITY_SHADE, win: { ...LOOPS, storey: walk / 1.5 } });
  crenels(b, sx0, sz0, x1, z0, walk, CITY, CITY_SHADE, 'E', 0.8, 0.4, 1.9);
  // the turret at the corner, its foot in the water
  const tx = x1 - 0.55, tz = (z0 + z1) / 2, tr = 1.05, crown = Y - 0.7;
  b.cyl(tx, tz, WATER_LEVEL - 0.4, crown - 0.2, tr, tr, 10, CITY, { win: { ...LOOPS, storey: (crown - 0.2) / 2 }, seed: 0.9, cap: false });
  b.cyl(tx, tz, crown - 0.2, crown, tr, tr + 0.15, 10, CITY_SHADE, { cap: CITY_SHADE });
  for (let i = 0; i < 10; i += 2) {
    const ang = ((i + 0.5) / 10) * Math.PI * 2, w = (tr + 0.15) * Math.sin(Math.PI / 10) * 0.9;
    b.obox(tx + Math.cos(ang) * (tr - 0.05), crown + 0.35, tz + Math.sin(ang) * (tr - 0.05), 0.18, 0.35, w, ang, CITY, { top: CITY_SHADE });
  }
  // a guard inside the postern, and a light in the court
  figure(b, P.x - 0.75, z0 - 0.75, 0.04, GUARD);
  k.lights.push({ x: P.x - 0.8, z: z0 - 1.8, r: 7, color: '#ffcf8a', k: 0.45 });
}

// ---------------------------------------------------------------------------
// The Red Keep
// ---------------------------------------------------------------------------

function redKeep(k: Build, l: Lot): void {
  const b = k.b, [nw, ne, sw, ge] = DRUMS;
  // --- the curtains, from drum to drum; the south one goes down to the moat's floor ---
  curtain(b, [nw.x, LINE.n], [ne.x, LINE.n], THICK, Y - 0.6, -1, 0.11);
  curtain(b, [LINE.e, ne.z], [LINE.e, GT.z], THICK, Y - 0.6, -1, 0.23);
  curtain(b, [LINE.w, nw.z], [LINE.w, sw.z], THICK, Y - 0.6, 1, 0.37);
  curtain(b, [ge.x, LINE.s], [GT.x, LINE.s], THICK_S, MOAT_Y - 0.3, 1, 0.41);
  DRUMS.forEach((d, i) => drum(k, d.x, d.z, d.r, l.top, 0.13 + i * 0.17, d.flag));
  gatehouse(k, l);
  throneRoom(k);
  yard(k);

  // --- the posterns: dark doors in the walls, lit a little by night, and a torch outside each ---
  arched(b, POSTERN_N.x, FACE.n, 0, -1, 0.9, Y + 0.02, Y + 1.55, DARK, 0.45);
  arched(b, POSTERN_N.x, IN.z0, 0, 1, 0.9, YARD, YARD + 1.4, DARK, 0.45);
  fire(k, POSTERN_N.x + 0.75, Y + 2.3, FACE.n - 0.25, 0.17, 6);
  arched(b, POSTERN_E.x, POSTERN_E.z, 1, 0, 0.9, Y + 0.02, Y + 1.55, DARK, 0.45);
  arched(b, IN.x1, POSTERN_E.z, -1, 0, 0.9, YARD, YARD + 1.4, DARK, 0.45);
  fire(k, POSTERN_E.x + 0.25, Y + 2.3, POSTERN_E.z - 0.75, 0.17, 6);

  // --- the square before the barbican, on its terrace ---
  const sq = { x0: RK.x0 + 2.5, z0: GATE.front, x1: HF.x0 - 0.4, z1: GATE.front + 2.8 };
  area(k, rect(sq.x0, sq.z0, sq.x1, sq.z1), COBBLES, Y + 0.04);
  brazier(k, sq.x1 - 0.6, sq.z1 - 0.7, Y + 0.04);
  const r = rng(129);
  for (let i = 0; i < 4; i++) k.person(sq.x0 + 0.6 + r() * (sq.x1 - sq.x0 - 1.2), sq.z0 + 1.1 + r() * (sq.z1 - sq.z0 - 1.5), Y + 0.04);
  k.lights.push({ x: GATE.x, z: sq.z1 - 0.8, r: 10, color: '#ffcf8a', k: 0.5 });

  // --- guards on the walks ---
  for (const [x, z] of [[-30.5, LINE.s], [-26.8, LINE.s], [LINE.e, 37.6], [LINE.e, 43.6], [-34.6, LINE.n], [-25.2, LINE.n], [LINE.w, 40.5], [LINE.w, 45.6]] as [number, number][]) k.person(x, z, WALK);

  // --- its name, on the terrace before its south-east side ---
  nameBoard(k, 'red-keep-name', GT.x - 2.9, GT.z + 5.8, Y, TO_VIEW, 1.0);
}

/** The gate: a tall gate tower between two drums, the barbican before it, a vault through both up to the yard, its bronze gates standing open. */
function gatehouse(k: Build, l: Lot): void {
  const b = k.b, g = GATE, a = g.x - g.w / 2, c = g.x + g.w / 2;
  const back = IN.z1, mid = FACE.s + 0.7, front = g.front, y0 = Y - 0.5, spring = YARD + 2.0;
  const tower = { x0: g.x - 1.2, x1: g.x + 1.2, top: l.top - 0.95 }, barb = { x0: g.x - 2.1, x1: g.x + 2.1, top: l.top - 2.8 };
  // the gate tower's sides, and its storey over the vault
  b.box(tower.x0, y0, back, a, barb.top, mid, RED, { faces: 'NW' });
  b.box(c, y0, back, tower.x1, barb.top, mid, RED, { faces: 'NE' });
  b.box(tower.x0, barb.top, back, tower.x1, tower.top, mid, RED, { win: { ...LOOPS_CLOSE, storey: tower.top / 5 }, seed: 0.52, faces: 'NESW' });
  b.box(tower.x0 - 0.12, tower.top - 0.35, back - 0.12, tower.x1 + 0.12, tower.top, mid + 0.12, SHADE, { faces: 'NESWTB' });
  crenels(b, tower.x0 - 0.12, back - 0.12, tower.x1 + 0.12, mid + 0.12, tower.top, RED, SHADE, 'NESW', 0.8, 0.36, 1.2);
  // the barbican before it: lower, broader, with nests for archers in its face
  b.box(barb.x0, y0, mid, a, barb.top, front, RED, { faces: 'NSW', win: { ...LOOPS, storey: barb.top / 3 }, seed: 0.66 });
  b.box(c, y0, mid, barb.x1, barb.top, front, RED, { faces: 'NSE', win: { ...LOOPS, storey: barb.top / 3 }, seed: 0.67 });
  b.box(barb.x0 - 0.12, barb.top - 0.35, mid, barb.x1 + 0.12, barb.top, front + 0.12, SHADE, { faces: 'ESWB' });
  b.quad([barb.x0 - 0.12, barb.top, front + 0.12], [barb.x1 + 0.12, barb.top, front + 0.12], [barb.x1 + 0.12, barb.top, mid], [barb.x0 - 0.12, barb.top, mid], [0, 1, 0], SHADE);
  crenels(b, barb.x0 - 0.12, mid, barb.x1 + 0.12, front + 0.12, barb.top, RED, SHADE, 'ESW', 0.8, 0.36, 1.1);
  // a gallery standing out over the arch, for dropping things on whoever is at the gate
  b.box(g.x - 1.15, barb.top - 1.15, front, g.x + 1.15, barb.top - 0.35, front + 0.42, SHADE, { faces: 'ESWB' });
  b.quad([g.x - 1.15, barb.top - 0.35, front + 0.42], [g.x + 1.15, barb.top - 0.35, front + 0.42], [g.x + 1.15, barb.top - 0.35, front + 0.12], [g.x - 1.15, barb.top - 0.35, front + 0.12], [0, 1, 0], SHADE);
  // a turret corbelled out at each of its front corners
  for (const x of [barb.x0 + 0.1, barb.x1 - 0.1]) {
    const tz = front - 0.1, r = 0.55, foot = barb.top - 3.0, crown = barb.top + 0.7;
    b.cyl(x, tz, foot - 0.7, foot, 0.06, r, 8, SHADE, { cap: false });
    b.cyl(x, tz, foot, crown, r, r, 8, RED, { win: { ...LOOPS_CLOSE, storey: crown / Math.round(crown / 3.4) }, seed: x * 0.3, cap: SHADE });
    for (let i = 0; i < 8; i += 2) {
      const a = ((i + 0.5) / 8) * Math.PI * 2;
      b.obox(x + Math.cos(a) * (r - 0.12), crown + 0.35, tz + Math.sin(a) * (r - 0.12), 0.12, 0.35, r * 0.34, a, RED, { top: SHADE });
    }
  }
  // the vault through both, its walls warm by night, and the way up through it from the square to the yard
  archway(b, g.x, back, front, g.w, spring, barb.top, RED, SOFFIT);
  for (const [x, nx] of [[a, 1], [c, -1]] as [number, number][]) b.quad([x, y0, back], [x, y0, front], [x, spring, front], [x, spring, back], [nx, 0, 0], SOFFIT, { win: interior(0.7) });
  const rise = YARD - Y, run = front - back, ln = Math.hypot(rise, run);
  b.quad([a, Y + 0.06, front], [c, Y + 0.06, front], [c, YARD + 0.01, back], [a, YARD + 0.01, back], [0, run / ln, rise / ln], COBBLES);
  // the bronze gates, swung back against the vault's walls just inside the arch
  for (const [x, nx] of [[a + 0.05, 1], [c - 0.05, -1]] as [number, number][]) b.quad([x, Y + 0.1, front - 0.12], [x, Y + 0.1, front - 0.95], [x, spring + 0.15, front - 0.95], [x, spring + 0.15, front - 0.12], [nx, 0, 0], BRONZE);
  // the portcullis, drawn up: its iron teeth under the arch's crown
  for (let i = 0; i < 5; i++) {
    const x = a + 0.2 + (i * (g.w - 0.4)) / 4;
    b.box(x - 0.04, spring + 0.25, front - 0.35, x + 0.04, spring + g.w / 2 - 0.05, front - 0.27, IRON, { faces: 'NESW' });
  }
  // torches either side of the arch, and two guards before it
  for (const s of [-1, 1]) {
    b.box(g.x + s * 1.15 - 0.06, Y + 2.3, front, g.x + s * 1.15 + 0.06, Y + 2.7, front + 0.22, IRON, { faces: 'NESWTB' });
    fire(k, g.x + s * 1.15, Y + 2.95, front + 0.18, 0.22, s < 0 ? 8 : 0);
    figure(b, g.x + s * 1.45, front + 0.95, Y + 0.04, GUARD);
  }
  fire(k, g.x + 1.0, YARD + 2.4, back - 0.25, 0.2, 6);
  banner(b, (tower.x0 + tower.x1) / 2, (back + mid) / 2, tower.top, 'targaryen', 3.0);
  k.person(g.x - 0.5, (back + mid) / 2, tower.top);
  k.person(g.x + 0.6, (mid + front) / 2 + 0.2, barb.top);
}

/** The throne room: long and high along the west wall, its tall narrow windows in its east and west walls, its great doors of oak and bronze on the gate's yard. */
function throneRoom(k: Build): void {
  const b = k.b, h = HALL, plinth = (h.eaves / 3) * 2, cx = (h.x0 + h.x1) / 2;
  b.box(h.x0 - 0.08, YARD - 0.2, h.z0 - 0.08, h.x1 + 0.08, plinth, h.z1 + 0.08, RED, { faces: 'NESWT', top: SHADE });
  b.box(h.x0, plinth, h.z0, h.x1, h.eaves, h.z1, RED, { win: { ...LANCETS, storey: h.eaves / 3, lit: 0.55 }, seed: 0.61, faces: 'EW' });
  b.box(h.x0, plinth, h.z0, h.x1, h.eaves, h.z1, RED, { faces: 'NS' });
  gable(b, h.x0, h.z0, h.x1, h.z1, h.eaves, h.ridge - h.eaves, ROOF.slate, RED, 'z', 0.2);
  // a louvre on its ridge, for the smoke of its fires
  const lz = h.z0 + (h.z1 - h.z0) * 0.3;
  b.box(cx - 0.35, h.ridge - 0.25, lz - 0.35, cx + 0.35, h.ridge + 0.45, lz + 0.35, LEAD, { win: interior(0.5) });
  b.cyl(cx, lz, h.ridge + 0.45, h.ridge + 0.95, 0.62, 0.04, 4, ROOF.slate, { phase: Math.PI / 4, cap: false });
  // the great doors, in a frame of paler stone, and a tall window over them; a round one in the gable
  const fz = h.z1 + 0.08;
  arched(b, cx, fz, 0, 1, 2.0, YARD, YARD + 2.1, FRAME);
  arched(b, cx, fz, 0, 1, 1.5, YARD, YARD + 1.95, OAK, 0, 0.07);
  for (const s of [-0.38, 0.38]) b.box(cx + s - 0.03, YARD + 0.2, fz + 0.07, cx + s + 0.03, YARD + 2.3, fz + 0.11, BRONZE, { faces: 'S' });
  b.box(cx - 0.75, YARD + 1.1, fz + 0.07, cx + 0.75, YARD + 1.22, fz + 0.11, BRONZE, { faces: 'S' });
  arched(b, cx, h.z1, 0, 1, 1.0, plinth + 1.8, h.eaves - 1.1, GLASS, 1.3);
  roundel(b, [cx, h.eaves + 0.72, h.z1 + 0.03], 0.42, 'S', GLASS, { win: interior(1.3) }, 10);
  fire(k, cx - 1.3, YARD + 2.2, fz + 0.2, 0.17, 0);
  fire(k, cx + 1.3, YARD + 2.2, fz + 0.2, 0.17, 6);
}

/** The yards: the outer yard on the north, where Balerion came down out of the east in 56 AC, and the gate's yard before the throne room. */
function yard(k: Build): void {
  const b = k.b;
  const shape: P2[] = [[IN.x0, IN.z0], [IN.x1, IN.z0], [IN.x1, GT.z - GT.r - 0.2], [HF.x1, GT.z - GT.r - 0.2], [HF.x1, HF.z0], [HF.x0, HF.z0], [HF.x0, IN.z1], [IN.x0, IN.z1]];
  flat(b, shape, YARD, YARD_FLOOR);

  // stables against the north wall, east of its middle drum: a roof on posts, and two horses
  const s0 = DRUMS[4].x + DRUMS[4].r + 0.4, s1 = IN.x1 - 0.6, sz = IN.z0 + 1.6;
  slab(b, [(s0 + s1) / 2, YARD + 2.6, IN.z0 + 0.02], [(s0 + s1) / 2, YARD + 2.0, sz], (s1 - s0) / 2, 0.12, ROOF.shingle, { under: TIMBER });
  for (const x of [s0 + 0.1, (s0 + s1) / 2, s1 - 0.1]) b.box(x - 0.08, YARD, sz - 0.2, x + 0.08, YARD + 1.96, sz - 0.04, TIMBER, { faces: 'NESW' });
  for (const [x, coat] of [[s0 + 1.2, 0x7b5134], [s0 + 2.8, 0x3d2f28]] as [number, number][]) {
    b.box(x - 0.3, YARD + 0.75, IN.z0 + 0.25, x + 0.3, YARD + 1.4, IN.z0 + 1.35, coat);
    b.box(x - 0.18, YARD + 1.2, IN.z0 + 1.2, x + 0.18, YARD + 1.95, IN.z0 + 1.65, coat);
    for (const [lx, lz] of [[-0.2, 0.4], [0.2, 0.4], [-0.2, 1.2], [0.2, 1.2]]) b.box(x + lx - 0.07, YARD, IN.z0 + lz - 0.07, x + lx + 0.07, YARD + 0.75, IN.z0 + lz + 0.07, coat, { faces: 'NESW' });
  }
  // a well, with its wheel on posts
  const wx = HALL.x1 + 2.6, wz = IN.z0 + 2.4;
  b.cyl(wx, wz, YARD - 0.1, YARD + 0.75, 0.55, 0.55, 8, SHADE, { cap: 0x31424c });
  for (const s of [-1, 1]) b.box(wx + s * 0.62 - 0.07, YARD, wz - 0.07, wx + s * 0.62 + 0.07, YARD + 1.6, wz + 0.07, TIMBER, { faces: 'NESW' });
  b.box(wx - 0.75, YARD + 1.6, wz - 0.06, wx + 0.75, YARD + 1.72, wz + 0.06, TIMBER, { faces: 'NESWTB' });
  gable(b, wx - 0.75, wz - 0.45, wx + 0.75, wz + 0.45, YARD + 1.72, 0.5, ROOF.shingle, TIMBER, 'x', 0.1);
  // a cart by the stables, its shafts down
  const cx = IN.x1 - 3.4, cz = IN.z0 + 3.6;
  b.box(cx - 0.9, YARD + 0.55, cz - 0.55, cx + 0.9, YARD + 1.05, cz + 0.55, TIMBER, { faces: 'NESWTB', top: 0x7a5e44 });
  for (const s of [-1, 1]) wheel(b, cx + 0.1, YARD + 0.48, cz + s * 0.62, 0.48, 0.07, s, TIMBER_DARK, 0x8a8f96);
  for (const s of [-0.35, 0.35]) b.beam([cx - 0.9, YARD + 0.7, cz + s], [cx - 2.3, YARD + 0.08, cz + s], 0.05, 0.05, TIMBER);
  for (const [x, z] of [[s1 - 0.4, sz + 0.5], [s1 - 1.1, sz + 0.4], [s1 - 0.7, sz + 1.1]]) b.cyl(x, z, YARD, YARD + 0.85, 0.33, 0.33, 6, 0x7a5a3c, { cap: 0x5e4630 });
  // a brazier in each yard, people, and the light of both
  brazier(k, IN.x1 - 1.4, HF.z0 - 1.2, YARD);
  brazier(k, HF.x0 - 0.8, IN.z1 - 0.9, YARD);
  const r = rng(5156);
  for (let i = 0; i < 6; i++) k.person(HALL.x1 + 1.2 + r() * (HF.x1 - HALL.x1 - 2.4), IN.z0 + 3.0 + r() * (HF.z0 - IN.z0 - 4.2), YARD);
  for (let i = 0; i < 3; i++) k.person(IN.x0 + 0.8 + r() * (HF.x0 - IN.x0 - 1.6), HALL.z1 + 1.4 + r() * (IN.z1 - HALL.z1 - 2.0), YARD);
  figure(b, (HALL.x0 + HALL.x1) / 2 - 1.5, HALL.z1 + 0.9, YARD, GUARD);
  k.lights.push({ x: (HALL.x1 + HF.x1) / 2, z: (IN.z0 + HF.z0) / 2, r: 11, color: '#ffcf8a', k: 0.5 });
  k.lights.push({ x: (IN.x0 + HF.x0) / 2, z: (HALL.z1 + IN.z1) / 2, r: 8, color: '#ffcf8a', k: 0.45 });
}

// ---------------------------------------------------------------------------
// Maegor's Holdfast
// ---------------------------------------------------------------------------

/**
 * Caraxes's tail lies over it from his tower, at the lot's top: so its roof is
 * flat, of lead, a little below that, and its battlements and turrets end at
 * the lot's top, with nothing standing on them.
 */
function holdfast(k: Build, l: Lot): void {
  const b = k.b, K = KEEP, M = MOAT, walk = l.top - 0.7, storey = walk / 7;
  // the dry moat: its floor, and its walls up to the yard, but where the curtain and the great tower are
  flat(b, rect(M.x0, M.z0, M.x1, M.z1), MOAT_Y, MOAT_FLOOR);
  const ez = GT.z - GT.r - 0.3;
  b.quad([M.x0, MOAT_Y, M.z1], [M.x0, MOAT_Y, M.z0], [M.x0, YARD, M.z0], [M.x0, YARD, M.z1], [1, 0, 0], MASONRY_DARK);
  b.quad([M.x0, MOAT_Y, M.z0], [M.x1, MOAT_Y, M.z0], [M.x1, YARD, M.z0], [M.x0, YARD, M.z0], [0, 0, 1], MASONRY_DARK);
  b.quad([M.x1, MOAT_Y, M.z0], [M.x1, MOAT_Y, ez], [M.x1, YARD, ez], [M.x1, YARD, M.z0], [-1, 0, 0], MASONRY_DARK);
  // the keep: a plinth in the moat, its walls with their rows of windows, a corbel table and battlements, and a flat roof of lead inside them
  b.box(K.x0 - 0.15, MOAT_Y - 0.1, K.z0 - 0.15, K.x1 + 0.15, YARD + 0.4, K.z1 + 0.15, SHADE, { faces: 'NESWT' });
  b.box(K.x0, YARD + 0.4, K.z0, K.x1, walk, K.z1, RED, { win: { ...LOOPS_CLOSE, storey }, seed: 0.73, faces: 'NESW' });
  b.box(K.x0 - 0.04, storey * 5 - 0.12, K.z0 - 0.04, K.x1 + 0.04, storey * 5 + 0.08, K.z1 + 0.04, SHADE, { faces: 'NESWTB' });
  b.box(K.x0 - 0.15, walk - 0.4, K.z0 - 0.15, K.x1 + 0.15, walk, K.z1 + 0.15, SHADE, { faces: 'NESWTB', top: LEAD });
  crenels(b, K.x0 - 0.15, K.z0 - 0.15, K.x1 + 0.15, K.z1 + 0.15, walk, RED, SHADE, 'NESW', l.top - walk, 0.36, 1.3);
  // a drum at each corner of it
  const corners: P2[] = [[K.x0 + 0.3, K.z0 + 0.3], [K.x1 - 0.3, K.z0 + 0.3], [K.x0 + 0.3, K.z1 - 0.3], [K.x1 - 0.3, K.z1 - 0.3]];
  corners.forEach(([x, z], i) => turret(b, x, z, 0.95, MOAT_Y - 0.1, l.top, 0.2 + i * 0.11));
  // tall arched windows on its south side, high up, for its great chamber
  for (const dx of [-1, 0, 1]) arched(b, (K.x0 + K.x1) / 2 + dx, K.z1, 0, 1, 0.68, storey * 5 + 0.5, storey * 6 - 0.55, GLASS, 1.4);
  // the drawbridge, let down over the moat to its door on the north, and the Kingsguard who keep it
  const dx = (K.x0 + K.x1) / 2, dz = K.z0 - 0.15;
  arched(b, dx, dz, 0, -1, 1.6, YARD, YARD + 1.7, FRAME);
  arched(b, dx, dz, 0, -1, 1.15, YARD, YARD + 1.55, DARK, 0.6, 0.07);
  b.box(dx - 0.62, YARD - 0.16, M.z0 - 0.3, dx + 0.62, YARD + 0.04, dz, TIMBER, { faces: 'NESWTB', top: 0x7a5e44 });
  for (const s of [-0.55, 0.55]) b.beam([dx + s, YARD + 2.3, dz - 0.05], [dx + s, YARD + 0.1, M.z0 - 0.2], 0.035, 0.035, 0xb4b8bd);
  for (const s of [-1, 1]) {
    figure(b, dx + s * 1.05, M.z0 - 0.75, YARD, KINGSGUARD);
    fire(k, dx + s * 1.0, YARD + 2.1, dz - 0.2, 0.17, s > 0 ? 6 : 0);
  }
}

// ---------------------------------------------------------------------------
// The great tower at the south-east corner
// ---------------------------------------------------------------------------

/**
 * The tallest of the seven, at the south-east corner, the first thing the
 * opening view sees: a drum on a battered foot, rows of windows, two string
 * courses, corbels, and on top a flat roof of lead exactly at the lot's top,
 * five across, where Caraxes perches, with only a low parapet of iron round it.
 */
function greatTower(k: Build, l: Lot): void {
  const b = k.b, { x, z, r } = GT, sides = 12, roof = l.top;
  const sill = roof + 0.35, corbel = roof - 0.4, R = r + 0.1, Ri = R - 0.3;
  const storey = corbel / Math.round(corbel / 3.6), y0 = under(x, z, r + 0.3) - 0.4;
  b.cyl(x, z, y0, Y + 1.2, r + 0.3, r, sides, RED, { cap: false, seed: 0.83 });
  b.cyl(x, z, Y + 1.2, corbel, r, r, sides, RED, { win: { ...LOOPS_CLOSE, storey, lit: 0.5 }, seed: 0.83, cap: false });
  for (const y of [storey * 4, storey * 6]) b.cyl(x, z, y - 0.1, y + 0.1, r + 0.08, r + 0.08, sides, SHADE, { cap: false });
  b.cyl(x, z, corbel, roof, r, R, sides, SHADE, { cap: LEAD });
  // the parapet, low: its outer face, its inner face and its top
  b.cyl(x, z, roof, sill, R, R, sides, IRON, { cap: false });
  const ph = Math.PI / sides, at = (rr: number, i: number, y: number): V3 => [x + Math.cos(ph + (i / sides) * Math.PI * 2) * rr, y, z + Math.sin(ph + (i / sides) * Math.PI * 2) * rr];
  for (let i = 0; i < sides; i++) {
    const m = ph + ((i + 0.5) / sides) * Math.PI * 2;
    b.quad(at(Ri, i, roof), at(Ri, i + 1, roof), at(Ri, i + 1, sill), at(Ri, i, sill), [-Math.cos(m), 0, -Math.sin(m)], IRON_DARK);
    b.quad(at(Ri, i, sill), at(Ri, i + 1, sill), at(R, i + 1, sill), at(R, i, sill), [0, 1, 0], IRON);
  }
  k.lights.push({ x: x + 3, z: z + 3, r: 10, color: '#ffcf8a', k: 0.4 });
}

// ---------------------------------------------------------------------------
// Aegon's strand
// ---------------------------------------------------------------------------

/** The two corners of the land at the river's mouth: where the bay's shore turns, and where the river's bank begins. */
const MOUTH = (() => {
  const i = LAND_NORTH.findIndex((p) => p[0] === SHORE.city && p[1] > 0);
  return { a: LAND_NORTH[i], c: LAND_NORTH[i + 1] };
})();
/** The wet sand that goes down from the strand into the water: how far out, and how low it ends, just under the water's face. */
const BEACH = { out: 1.15, drop: WATER_LEVEL - 0.03 };

/** How far east the land reaches at a place along the strand. */
function shoreAt(z: number): number {
  const { a, c } = MOUTH;
  if (z <= a[1]) return a[0];
  return a[0] + ((c[0] - a[0]) * (z - a[1])) / (c[1] - a[1]);
}

/**
 * A ship of the Conquest drawn up on the strand: a small clinker-built hull,
 * its strakes laid one over the other, rising to a post at each end; one mast,
 * its sail furled on the yard; a steering oar on its right side aft. Built
 * along its own x with the bow ahead; `pitch` raises the bow.
 */
function ship(b: GeoBuilder, x: number, y: number, z: number, yaw: number, len: number, beam: number, pitch: number, flag: boolean): void {
  const H = len / 2, depth = 1.0;
  const keel = (u: number): number => pitch * u;
  // stations from stern to bow: where, how wide at the gunwale, how high the gunwale stands over the keel
  const st: [number, number, number][] = [[-H, 0.05, depth + 0.5], [-H * 0.72, beam * 0.3, depth + 0.15], [-H * 0.36, beam * 0.47, depth], [0, beam * 0.5, depth - 0.05], [H * 0.36, beam * 0.47, depth], [H * 0.72, beam * 0.3, depth + 0.18], [H, 0.05, depth + 0.55]];
  const STRAKE = [0x3b2e24, 0x4b3a2b, 0x5e4836];
  // a face of four corners, turned to face away from the ship's middle line on side s, or up
  const face = (p: V3, q: V3, r: V3, t: V3, color: number, s: number): void => {
    const ax = q[0] - p[0], ay = q[1] - p[1], az = q[2] - p[2], bx = t[0] - p[0], by = t[1] - p[1], bz = t[2] - p[2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const l = Math.hypot(nx, ny, nz) || 1;
    if ((s !== 0 && nz * s < 0) || (s === 0 && ny < 0)) { nx = -nx; ny = -ny; nz = -nz; }
    b.quad(p, q, r, t, [nx / l, ny / l, nz / l], color);
  };
  b.moved(x, y, z, yaw, () => {
    for (const s of [-1, 1]) {
      for (let i = 0; i + 1 < st.length; i++) {
        const [u0, w0, g0] = st[i], [u1, w1, g1] = st[i + 1];
        // the side, in three strakes from the keel to the gunwale, each standing out a little over the one below it
        const P = (u: number, w: number, g: number, f: number, lap: number): V3 => [u, keel(u) + g * f, s * (w * (0.25 + 0.75 * f) + lap)];
        const lev = [0, 0.38, 0.7, 1];
        for (let k = 0; k < 3; k++) {
          const lap = k * 0.025;
          face(P(u0, w0, g0, lev[k], lap), P(u1, w1, g1, lev[k], lap), P(u1, w1, g1, lev[k + 1], lap + 0.02), P(u0, w0, g0, lev[k + 1], lap + 0.02), STRAKE[k], s);
        }
        // inside: the bulwark down to the deck
        const D = (u: number, w: number, g: number, f: number): V3 => [u, keel(u) + g * f, s * w * (0.25 + 0.75 * f) * 0.9];
        face(D(u0, w0, g0, 0.55), D(u1, w1, g1, 0.55), D(u1, w1, g1, 1), D(u0, w0, g0, 1), 0x6b5136, -s);
      }
    }
    // the deck between the bulwarks
    for (let i = 0; i + 1 < st.length; i++) {
      const [u0, w0, g0] = st[i], [u1, w1, g1] = st[i + 1];
      const D = (u: number, w: number, g: number, s: number): V3 => [u, keel(u) + g * 0.55, s * w * (0.25 + 0.75 * 0.55) * 0.9];
      face(D(u0, w0, g0, -1), D(u1, w1, g1, -1), D(u1, w1, g1, 1), D(u0, w0, g0, 1), 0x7a5e44, 0);
    }
    // the stem and the stern post, curling up
    for (const e of [-1, 1]) {
      const u = e * H, g = keel(u) + depth + (e > 0 ? 0.55 : 0.5);
      b.sweep([[u - e * 0.15, g - 0.45, 0], [u + e * 0.12, g + 0.2, 0], [u + e * 0.22, g + 0.65, 0], [u + e * 0.05, g + 0.95, 0]], [0.1, 0.1, 0.09, 0.07], 0x3b2e24);
    }
    // the mast, the yard and the sail furled on it
    const mu = H * 0.08, my = keel(mu) + depth * 0.55, mtop = my + 4.2;
    b.cyl(mu, 0, my, mtop, 0.1, 0.07, 6, TIMBER_DARK, { cap: false });
    b.beam([mu, mtop - 0.6, -1.45], [mu, mtop - 0.6, 1.45], 0.05, 0.05, TIMBER_DARK);
    b.beam([mu + 0.02, mtop - 0.8, -1.3], [mu + 0.02, mtop - 0.8, 1.3], 0.17, 0.17, 0xe6dcc4);
    for (const s of [-1, 1]) b.beam([mu, mtop - 0.2, 0], [mu - 1.8, keel(mu - 1.8) + depth, s * beam * 0.42], 0.025, 0.025, 0xb9a98d);
    if (flag) banner(b, mu, 0, mtop, 'targaryen', 1.0, 0.5);
    // the steering oar, on the right side aft
    const ou = -H * 0.78;
    b.beam([ou, keel(ou) + depth + 0.35, beam * 0.28], [ou - 0.55, keel(ou) - 0.35, beam * 0.36], 0.06, 0.06, TIMBER);
    b.obox(ou - 0.5, keel(ou) - 0.2, beam * 0.36, 0.2, 0.38, 0.04, 0, TIMBER);
  });
}

function strand(k: Build, l: Lot): void {
  const b = k.b, sx = MOUTH.a[0], z1 = l.z1 - 0.05;
  // sand and shingle, and the beach going down into the water, where the ships' sterns lie
  area(k, [[l.x0, l.z0 + 0.05], [sx - 0.05, l.z0 + 0.05], [sx - 0.05, MOUTH.a[1]], [shoreAt(z1) - 0.05, z1], [l.x0, z1]], SAND, 0.04);
  area(k, [[sx - 1.2, l.z0 + 0.5], [sx - 0.06, l.z0 + 0.5], [sx - 0.06, MOUTH.a[1]], [shoreAt(z1) - 0.06, z1 - 0.1], [shoreAt(z1) - 1.1, z1 - 0.1], [sx - 1.2, MOUTH.a[1] - 0.6]], 0x9d9180, 0.06);
  const out = BEACH.out, drop = BEACH.drop, ln = Math.hypot(out, 0.04 - drop), nx = (0.04 - drop) / ln, ny = out / ln;
  const WET = 0xa8946e;
  b.quad([sx - 0.05, 0.04, l.z0 + 0.2], [sx - 0.05, 0.04, MOUTH.a[1]], [sx + out, drop, MOUTH.a[1] + out * 0.4], [sx + out, drop, l.z0 + 0.2], [nx, ny, 0], WET);
  const ex = shoreAt(z1), d = Math.SQRT1_2;
  b.quad([sx - 0.05, 0.04, MOUTH.a[1]], [ex - 0.05, 0.04, z1], [ex + out * d, drop, z1 + out * d], [sx + out, drop, MOUTH.a[1] + out * 0.4], [nx * d, ny, nx * d], WET);

  // three ships of the Conquest, their bows up the strand and their sterns in the shallows
  const SHIPS: [number, number, number, number, boolean][] = [
    [l.x0 + 3.55, l.z0 + 2.65, 148, 7.8, true], [l.x0 + 3.5, l.z0 + 5.7, 153, 7.8, false], [l.x0 + 3.4, l.z0 + 8.95, 146, 7.6, true],
  ];
  for (const [x, z, deg, len, flag] of SHIPS) ship(b, x, -0.2, z, (deg * Math.PI) / 180, len, 2.0, 0.06, flag);

  // the men who came ashore with them, and what they brought: casks, chests, a fire. The ships fill the
  // strand, so the men stand along its north edge, by the bows, and two aboard.
  const r = rng(2);
  for (const [x, z] of [[1.4, 0.45], [2.6, 0.4], [3.6, 0.35], [-0.35, 6.3], [-0.4, 9.5]]) k.person(l.x0 + x, l.z0 + z, 0.04);
  for (const [i, u] of [[1, 0], [2, -1.5]]) {
    const [x, z, deg] = SHIPS[i], a = (deg * Math.PI) / 180;
    k.person(x + Math.cos(a) * u, z + Math.sin(a) * u, -0.2 + 0.06 * u + 0.52);
  }
  figure(b, l.x0 + 1.6, l.z0 + 2.0, 0.04, CONQUEST);
  figure(b, l.x0 - 0.3, l.z0 + 3.0, 0.04, CONQUEST);
  for (const [x, z] of [[0.5, 2.9], [0.1, 2.4], [0.45, 6.0]]) b.cyl(l.x0 + x, l.z0 + z, 0.04, 0.84 + r() * 0.1, 0.32, 0.32, 6, 0x7a5a3c, { cap: 0x5e4630 });
  b.box(l.x0 + 0.1, 0.04, l.z0 + 8.3, l.x0 + 0.9, 0.62, l.z0 + 8.9, TIMBER, { top: 0x7a5e44 });
  const fx = l.x0 + 4.4, fz = l.z0 + 0.5;
  b.cyl(fx, fz, 0.04, 0.2, 0.42, 0.42, 7, ROCK, { cap: DARK });
  fire(k, fx, 0.45, fz, 0.24, 8);
}

// ---------------------------------------------------------------------------
// What the tile is handed
// ---------------------------------------------------------------------------

export const MODELS: Record<string, Model> = {
  aegon: (k) => aegonsHill(k),
  'red-keep': redKeep,
  'rk-holdfast': holdfast,
  'rk-tower': greatTower,
  strand,
};
export const COVERS: string[] = [];
export const SIGNS: SignDef[] = [nameSign('red-keep-name', 'The Red Keep')];

export function extras(_k: Build): void {}

/** The ground of this file's own: the hill where it is built up, and the strand with its beach. */
export function heightAt(x: number, z: number): number {
  if (x >= HILL.x0 && x <= HILL.x1 && z >= HILL.z0 && z <= HILL.z1) {
    const y = hill(x, z);
    if (y > heightOn(LAND_HILL, x, z) + 0.01) return y;
  }
  if (x >= ST.x0 && x <= ST.x1 + BEACH.out && z >= ST.z0 && z <= ST.z1) {
    const edge = shoreAt(z);
    if (x <= edge) return 0.04;
    const y = 0.04 - (x - edge) * ((0.04 - BEACH.drop) / BEACH.out);
    return y > WATER_LEVEL ? y : 0;
  }
  return 0;
}
