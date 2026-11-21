// The ground of Gotham and its water: the two banks of the Sprang with their
// quays, Old Gotham's upper city behind its retaining walls and the ramp that
// climbs it, Lower Gotham and Tricorner where the bay was, River Street's
// terrace and the ramp Kane Street comes down from it, the wharf and the yard
// along the canal, Bristol's shelf and Crest Hill with the Batcave and the
// waterfall's cove cut into its cliff, Mercey Island and its crag, the islets
// in the harbour, and Robinson Park's knoll.
//
// The shapes and the levels are in plan.ts. What stands on the ground is
// built elsewhere.

import type { V3, WinSpec } from '../../engine/geo';
import { flat, rect, walls, water, type P2 } from '../../engine/ground';
import { drawField, field, heightOn, type Field } from '../../engine/terrain';
import type { Build } from '../../engine/tile';
import { ROCK, ROCK_DARK, ROCK_LIGHT, STONE, STONE_DARK } from './look';
import { BLUFF, BOARD, CREST, CROWN, KANE_ST, KNOLL, LANDS, RAMP, UPPER, Y, groundAt, inside, kaneRamp, merceyAt, smooth } from './plan';

/** What the street material is told about a stretch of plain ground. */
const GROUND: WinSpec = { cell: 0, storey: 1, lit: 0, kind: 1 };
/** Paving in flags. */
const FLAGGED: WinSpec = { cell: 2.4, storey: 1, lit: 0.5, kind: 1 };

/** The quays' paving, the upper city's flags, the bluff's, lawns and woods, and the water. */
export const PAVING = 0x6a6d74, PAVING_UPPER = 0x7b7e86, PAVING_BLUFF = 0x74706c;
export const LAWN = 0x4f6f47, LAWN_DARK = 0x3f5a3a, WOOD = 0x34492f, EARTH = 0x5a5146;
export const HARBOUR = 0x3a5d70, QUAY = 0x4b4e56;
/** The retaining walls of the upper city and of the bluff. */
export const RETAINING = STONE, RETAINING_BLUFF = 0x4c4640;
/** Rock in beds, for the cliffs: bottom to top. */
const BEDS = [ROCK_DARK, ROCK, 0x42444a, ROCK_LIGHT, ROCK, 0x3c3e44];

// ---------------------------------------------------------------------------
// Ground in zones: level floors with upright walls between them
// ---------------------------------------------------------------------------
//
// Crest Hill's cliff, the Batcave's cut and the cove are upright, and a field
// of facets would draw each as a steep slope a cell wide. So the hill and the
// island are drawn in cells that each belong to one zone: a zone's heights
// are worked out for that zone alone, and wherever two cells that meet
// disagree about the height of the edge they share, an upright wall is built
// between them.

interface Zoned {
  x0: number; z0: number; cell: number; nx: number; nz: number;
  /** The zone of each cell, or null where there is no land. */
  zone: (string | null)[];
  height(zone: string, x: number, z: number): number;
}

function zoned(x0: number, z0: number, x1: number, z1: number, cell: number, zoneOf: (x: number, z: number) => string | null, height: Zoned['height']): Zoned {
  const nx = Math.round((x1 - x0) / cell), nz = Math.round((z1 - z0) / cell);
  const zone: (string | null)[] = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) zone.push(zoneOf(x0 + (i + 0.5) * cell, z0 + (j + 0.5) * cell));
  return { x0, z0, cell, nx, nz, zone, height };
}

/** How high zoned ground is at a place, on the facet drawn there, or null where it has none. */
function zonedAt(f: Zoned, x: number, z: number): number | null {
  const u = (x - f.x0) / f.cell, v = (z - f.z0) / f.cell;
  if (u < 0 || v < 0 || u >= f.nx || v >= f.nz) return null;
  const i = Math.floor(u), j = Math.floor(v), zone = f.zone[j * f.nx + i];
  if (!zone) return null;
  const X = f.x0 + i * f.cell, Z = f.z0 + j * f.cell, fu = u - i, fv = v - j;
  const y00 = f.height(zone, X, Z), y10 = f.height(zone, X + f.cell, Z), y01 = f.height(zone, X, Z + f.cell), y11 = f.height(zone, X + f.cell, Z + f.cell);
  // each cell is cut from its north-west corner to its south-east, as it is drawn
  return fu >= fv ? y00 + (y10 - y00) * fu + (y11 - y10) * fv : y00 + (y11 - y01) * fu + (y01 - y00) * fv;
}

/** Draws zoned ground: each cell's two facets, and the upright walls where cells that meet stand at different heights. */
function drawZoned(k: Build, f: Zoned, colour: (zone: string, y: number, level: number, x: number, z: number) => number, wall: (y: number, x: number, z: number) => number): void {
  const b = k.b;
  const zoneAt = (i: number, j: number): string | null => (i < 0 || j < 0 || i >= f.nx || j >= f.nz ? null : f.zone[j * f.nx + i]);
  const facet = (zone: string, p: V3, q: V3, r: V3): void => {
    const ax = q[0] - p[0], ay = q[1] - p[1], az = q[2] - p[2], bx = r[0] - p[0], by = r[1] - p[1], bz = r[2] - p[2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const l = Math.hypot(nx, ny, nz) || 1, flip = ny < 0;
    nx /= l; ny /= l; nz /= l;
    if (flip) { nx = -nx; ny = -ny; nz = -nz; }
    const c = colour(zone, (p[1] + q[1] + r[1]) / 3, ny, (p[0] + q[0] + r[0]) / 3, (p[2] + q[2] + r[2]) / 3);
    if (flip) b.tri(p, r, q, [nx, ny, nz], c);
    else b.tri(p, q, r, [nx, ny, nz], c);
  };
  /** A wall along one edge of a cell, from what the cell beyond stands at up to this cell, facing the cell beyond. */
  const edge = (zone: string, other: string | null, ax: number, az: number, bx: number, bz: number, n: V3): void => {
    const a1 = f.height(zone, ax, az), b1 = f.height(zone, bx, bz);
    // beyond the land is the water's bed; beyond the board is the tile's base
    const a0 = other ? f.height(other, ax, az) : -1.5, b0 = other ? f.height(other, bx, bz) : -1.5;
    if (a1 - a0 < 0.05 && b1 - b0 < 0.05) return;
    // in beds, so that a cliff is rock and not one flat colour
    const top = Math.max(a1, b1), bottom = Math.min(a0, b0), BED = 2.2;
    for (let y = Math.floor(bottom / BED) * BED; y < top; y += BED) {
      const lo = (v0: number, v1: number): number => Math.min(v1, Math.max(v0, y)), hi = (v0: number, v1: number): number => Math.min(v1, Math.max(v0, y + BED));
      const pa0 = lo(a0, a1), pa1 = hi(a0, a1), pb0 = lo(b0, b1), pb1 = hi(b0, b1);
      if (pa1 - pa0 < 0.01 && pb1 - pb0 < 0.01) continue;
      b.quad([ax, pa0, az], [bx, pb0, bz], [bx, pb1, bz], [ax, pa1, az], n, wall(y + BED / 2, (ax + bx) / 2, (az + bz) / 2));
    }
  };
  for (let j = 0; j < f.nz; j++) {
    for (let i = 0; i < f.nx; i++) {
      const zone = zoneAt(i, j);
      if (!zone) continue;
      const X0 = f.x0 + i * f.cell, Z0 = f.z0 + j * f.cell, X1 = X0 + f.cell, Z1 = Z0 + f.cell;
      const at = (x: number, z: number): V3 => [x, f.height(zone, x, z), z];
      facet(zone, at(X0, Z0), at(X1, Z0), at(X1, Z1));
      facet(zone, at(X0, Z0), at(X1, Z1), at(X0, Z1));
      edge(zone, zoneAt(i, j - 1), X1, Z0, X0, Z0, [0, 0, -1]);
      edge(zone, zoneAt(i, j + 1), X0, Z1, X1, Z1, [0, 0, 1]);
      edge(zone, zoneAt(i - 1, j), X0, Z0, X0, Z1, [-1, 0, 0]);
      edge(zone, zoneAt(i + 1, j), X1, Z1, X1, Z0, [1, 0, 0]);
    }
  }
}

// ---------------------------------------------------------------------------
// Bristol: the shelf, Crest Hill, the shaft of the Batcave's lift and the grotto
// ---------------------------------------------------------------------------

/** How high Crest Hill would be at a place with nothing cut into it. */
function hillAt(x: number, z: number): number {
  const C = CREST;
  const ends = Math.min(smooth(C.west[0], C.west[1], x), 1 - smooth(C.east[0], C.east[1], x));
  const back = 1 - 0.5 * smooth(C.north[0], C.north[1], z);
  return Y.shelf + (Y.crest - Y.shelf) * ends * back;
}

function bristolZone(x: number, z: number): string | null {
  if (!inside(LANDS.bristol, x, z)) return null;
  const C = CREST;
  if (z > C.cliff) return x > C.spur.x0 && x < C.spur.x1 && z < C.spur.z1 ? 'hill' : 'shelf';
  if (x > C.cave.x0 && x < C.cave.x1 && z > C.cave.z0 && z < C.cave.z1) return 'cave';
  if (x > C.cove.x0 && x < C.cove.x1 && z > C.cove.z0) return 'cove';
  return 'hill';
}

const bristolHeight = (zone: string, x: number, z: number): number => (zone === 'shelf' ? Y.shelf : zone === 'hill' ? hillAt(x, z) : Y.cave);

/** A little noise over the ground, from 0 to 1, the same on every load. */
function noise(x: number, z: number): number {
  const h = (i: number, j: number): number => {
    const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return h(i, j) * (1 - u) * (1 - v) + h(i + 1, j) * u * (1 - v) + h(i, j + 1) * (1 - u) * v + h(i + 1, j + 1) * u * v;
}

const rockAt = (y: number, x: number, z: number): number => BEDS[(((Math.floor((y + 1.4 * Math.sin(x * 0.09) + 0.6 * Math.sin(z * 0.17)) / 2.2) % BEDS.length) + BEDS.length) % BEDS.length)];

function bristolColour(zone: string, _y: number, level: number, x: number, z: number): number {
  if (zone === 'shelf') return PAVING_BLUFF;
  if (zone === 'cave' || zone === 'cove') return ROCK_DARK;
  if (level < 0.82) return noise(x * 0.4, z * 0.4) > 0.5 ? ROCK : ROCK_LIGHT;
  // the Manor's lawns on the top, and woods at its ends and its back
  const wooded = x < -13 || x > 87 || z < -110;
  return wooded ? (noise(x * 0.2, z * 0.2) > 0.5 ? WOOD : LAWN_DARK) : noise(x * 0.15, z * 0.15) > 0.55 ? LAWN : LAWN_DARK;
}

// ---------------------------------------------------------------------------
// Mercey Island
// ---------------------------------------------------------------------------

const merceyHeight = (_zone: string, x: number, z: number): number => merceyAt(x, z);

function merceyColour(_zone: string, y: number, level: number, x: number, z: number): number {
  if (level < 0.8) return noise(x * 0.5, z * 0.5) > 0.5 ? ROCK : ROCK_DARK;
  if (y > Y.crag - 0.3) return noise(x * 0.3, z * 0.3) > 0.6 ? EARTH : LAWN_DARK;
  return noise(x * 0.22, z * 0.22) > 0.5 ? WOOD : LAWN_DARK;
}

// ---------------------------------------------------------------------------
// The ground as built
// ---------------------------------------------------------------------------

let BRISTOL: Zoned | null = null, MERCEY: Zoned | null = null, KNOLL_FIELD: Field | null = null;

/**
 * How high the ground is at a place, as built: on Crest Hill, the island and
 * the knoll, the very facet that is drawn there, so that what stands on a
 * slope neither floats nor sinks; elsewhere the level the plan gives.
 */
export function landAt(x: number, z: number): number {
  for (const f of [BRISTOL, MERCEY]) {
    if (!f) continue;
    const y = zonedAt(f, x, z);
    if (y !== null) return y;
  }
  if (KNOLL_FIELD && Math.hypot(x - KNOLL.c[0], z - KNOLL.c[1]) < KNOLL.r) return Math.max(0, heightOn(KNOLL_FIELD, x, z));
  return groundAt(x, z);
}

/** Whether a place is water, or within `room` of it. */
export function inWater(x: number, z: number, room = 0): boolean {
  if (groundAt(x, z) < 0) return true;
  if (room > 0) for (const [dx, dz] of [[room, 0], [-room, 0], [0, room], [0, -room]]) if (groundAt(x + dx, z + dz) < 0) return true;
  return false;
}

export function buildLand(k: Build): void {
  // the water, over the whole board: the lands are laid over it
  water(k, rect(BOARD.x0 + 0.2, BOARD.z0 + 0.2, BOARD.x1 - 0.2, BOARD.z1 - 0.2), { color: HARBOUR, quay: QUAY });

  // the two banks, the islets, and a quay wall round each down into the water
  const park = rect(BOARD.x0 + 0.4, -55.6, -62, -16);
  flat(k.street, LANDS.west, 0, PAVING, { win: GROUND });
  flat(k.street, park, 0.02, LAWN_DARK, { win: GROUND });
  flat(k.street, LANDS.east, 0, PAVING, { win: GROUND });
  for (const id of ['west', 'east'] as const) walls(k.b, LANDS[id], -1.5, 0, QUAY);
  for (const [id, y] of [['blackgate', 2], ['justice', 1.5]] as const) {
    flat(k.street, LANDS[id], y, id === 'blackgate' ? ROCK : STONE, { win: GROUND });
    walls(k.b, LANDS[id], -1.5, y, id === 'blackgate' ? ROCK_DARK : STONE_DARK);
  }

  // the upper city and the bluff: terraces behind retaining walls
  flat(k.street, UPPER, Y.upper, PAVING_UPPER, { win: FLAGGED });
  walls(k.b, UPPER, 0, Y.upper, RETAINING);
  flat(k.street, CROWN, Y.crown, PAVING_UPPER, { win: FLAGGED });
  walls(k.b, CROWN, Y.upper, Y.crown, RETAINING);
  flat(k.street, BLUFF, Y.bluff, PAVING_BLUFF, { win: FLAGGED });
  walls(k.b, BLUFF, 0, Y.bluff, RETAINING_BLUFF);
  ramp(k);
  kaneWedge(k);

  // Bristol: the shelf, Crest Hill, and what is cut into its cliff
  BRISTOL = zoned(-22, -113, 104, -67, 2, bristolZone, bristolHeight);
  drawZoned(k, BRISTOL, bristolColour, rockAt);

  // Mercey Island, and its crag
  MERCEY = zoned(-104, -114, -30, -64, 2, (x, z) => (inside(LANDS.mercey, x, z) ? 'isle' : null), merceyHeight);
  drawZoned(k, MERCEY, merceyColour, rockAt);

  // Robinson Park's knoll
  KNOLL_FIELD = field(KNOLL.c[0] - KNOLL.r, KNOLL.c[1] - KNOLL.r, KNOLL.c[0] + KNOLL.r, KNOLL.c[1] + KNOLL.r, 2, (x, z) => {
    const d = Math.hypot(x - KNOLL.c[0], z - KNOLL.c[1]);
    return d < KNOLL.r ? KNOLL.h * (1 - smooth(4, KNOLL.r, d)) + 0.02 : 0;
  });
  drawField(k.b, KNOLL_FIELD, { color: (_y, level) => (level > 0.9 ? LAWN : LAWN_DARK), cut: ROCK, edges: '' });
}

/**
 * The ramp Kane Street comes down from River Street's terrace to the East
 * End's ground: a wedge of stone between the blocks, as wide as the street
 * with its sidewalks. Its top lies a hair under the street.
 */
function kaneWedge(k: Build): void {
  const K = KANE_ST, x0 = K.x - K.half, x1 = K.x + K.half, n = 14;
  for (let i = 0; i < n; i++) {
    const za = K.rampFoot + ((K.rampTop - K.rampFoot) * i) / n, zb = K.rampFoot + ((K.rampTop - K.rampFoot) * (i + 1)) / n, ya = kaneRamp(za), yb = kaneRamp(zb);
    k.b.quad([x0, yb - 0.04, zb], [x1, yb - 0.04, zb], [x1, ya - 0.04, za], [x0, ya - 0.04, za], [0, 1, 0], PAVING_BLUFF);
    k.b.quad([x0, 0, zb], [x0, 0, za], [x0, ya - 0.04, za], [x0, yb - 0.04, zb], [-1, 0, 0], RETAINING_BLUFF);
    k.b.quad([x1, 0, za], [x1, 0, zb], [x1, yb - 0.04, zb], [x1, ya - 0.04, za], [1, 0, 0], RETAINING_BLUFF);
  }
}

/**
 * The ramp along the south face of the upper city: a wedge of stone from the
 * quay up to the bastion, which Grand Avenue is laid on. Its top lies a hair
 * under the street.
 */
function ramp(k: Build): void {
  const R = RAMP, n = 25, yAt = (x: number): number => Y.upper * Math.min(1, Math.max(0, (R.x1 - x) / (R.x1 - R.x0)));
  for (let i = 0; i < n; i++) {
    const xa = R.x1 + ((R.x0 - R.x1) * i) / n, xb = R.x1 + ((R.x0 - R.x1) * (i + 1)) / n, ya = yAt(xa), yb = yAt(xb);
    // its top, and its south face down to the quay
    const top: P2[] = [[xb, R.z0], [xa, R.z0], [xa, R.z1], [xb, R.z1]];
    k.b.quad([top[0][0], yb - 0.04, top[0][1]], [top[1][0], ya - 0.04, top[1][1]], [top[2][0], ya - 0.04, top[2][1]], [top[3][0], yb - 0.04, top[3][1]], [0, 1, 0], PAVING_UPPER);
    k.b.quad([xb, 0, R.z1], [xa, 0, R.z1], [xa, ya - 0.04, R.z1], [xb, yb - 0.04, R.z1], [0, 0, 1], RETAINING);
  }
}
