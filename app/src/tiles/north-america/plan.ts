// The North America tile, as data. Nothing in this file draws anything.
//
// The tile is the look prototype's board: its size, its streets, its ring of
// raised expressway, its flyover and its car park are unchanged. What stands
// on it is North American throughout.
//
// Units: 1 unit is 1 cm of toy. A lane is 5 wide, a storey is 5 high and a car
// is about 7 long. x points east, z points south, y points up.

import type { Roof } from '../../engine/buildings';
import type { Hump, Seg } from '../../engine/paths';
import type { SignDef } from '../../engine/signs';
import { LANE, STOREY, TILE, type HeroSpot, type ParkedSpot, type Rect, type Route, type TrafficType } from '../../engine/tile';
import { paintBillboard, paintScore, paintShield } from './signs';

export { LANE, STOREY };
export { humpHeight } from '../../engine/paths';
export type { Hump, Rect, Roof, Seg };

export const STREET_CARR = 5; // half-width of a two-lane carriageway
export const STREET_CORR = 8; // half-width including both sidewalks
export const BLVD_MEDIAN = 3; // half-width of the boulevard's median
export const BLVD_CARR = 13;
export const BLVD_CORR = 17;

export const BOARD = TILE;

export interface StreetV { x: number; carr: number; corr: number }
export interface StreetH { z: number; carr: number; corr: number; median: number }

export const V_STREETS: StreetV[] = [-96, -32, 32, 96].map((x) => ({
  x,
  carr: STREET_CARR,
  corr: STREET_CORR,
}));

export const H_STREETS: StreetH[] = [
  { z: -105, carr: STREET_CARR, corr: STREET_CORR, median: 0 },
  { z: -32, carr: BLVD_CARR, corr: BLVD_CORR, median: BLVD_MEDIAN },
  { z: 41, carr: STREET_CARR, corr: STREET_CORR, median: 0 },
  { z: 105, carr: STREET_CARR, corr: STREET_CORR, median: 0 },
];

/** The boulevard's median runs for |x| < MEDIAN_X and leaves room for U-turns beyond. */
export const MEDIAN_X = 80;

export type BlockId = 'A1' | 'B1' | 'C1' | 'A2' | 'B2' | 'C2' | 'A3' | 'B3' | 'C3';
const COL_X: Record<string, [number, number]> = { A: [-88, -40], B: [-24, 24], C: [40, 88] };
const ROW_Z: Record<string, [number, number]> = { '1': [-97, -49], '2': [-15, 33], '3': [49, 97] };


export function blockRect(id: BlockId): Rect {
  const [x0, x1] = COL_X[id[0]];
  const [z0, z1] = ROW_Z[id[1]];
  return { x0, z0, x1, z1 };
}
export const BLOCK_IDS: BlockId[] = ['A1', 'B1', 'C1', 'A2', 'B2', 'C2', 'A3', 'B3', 'C3'];

/**
 * Which quarter of the district each block belongs to. A quarter decides the
 * look of the block's ordinary buildings and what its signs say.
 *
 *   downtown  the invented middle: arcades, cola and doughnuts
 *   roadside  diners, motels and bowling alleys
 *   coast     the West Coast: coffee, sourdough and tacos
 *   loop      Chicago: deep dish, blues and hot dogs
 */
export type Quarter = 'downtown' | 'roadside' | 'coast' | 'loop';
export const BLOCK_QUARTER: Record<BlockId, Quarter> = {
  A1: 'roadside', A2: 'roadside',
  C1: 'coast',
  C2: 'loop', C3: 'loop',
  B1: 'downtown', B2: 'downtown', B3: 'downtown', A3: 'downtown',
};

/** The park is the whole of block B2. */
export const PARK: Rect = blockRect('B2');

export function onCarriageway(x: number, z: number): boolean {
  for (const s of V_STREETS) if (Math.abs(x - s.x) < s.carr) return true;
  for (const s of H_STREETS) if (Math.abs(z - s.z) < s.carr) return true;
  return false;
}
export function inCorridor(x: number, z: number, pad = 0): boolean {
  for (const s of V_STREETS) if (Math.abs(x - s.x) < s.corr + pad) return true;
  for (const s of H_STREETS) if (Math.abs(z - s.z) < s.corr + pad) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

export type Style = 'glass' | 'office' | 'resi' | 'shop' | 'neon' | 'concrete' | 'stucco';

/** A toy version of a famous building that stands on a lot instead of a plain one. */
export type LandmarkKind =
  | 'sears' | 'wtc-north' | 'wtc-south' | 'empire' | 'liberty'
  | 'chrysler' | 'needle' | 'coit' | 'ladies'
  | 'transamerica' | 'flatiron' | 'diner' | 'marina';

export interface Building {
  id: string;
  block: BlockId;
  x: number; z: number; w: number; d: number; // world min corner and size
  y0: number; y1: number;
  style: Style;
  tint: number;
  roof: Roof;
  crown?: { inset: number; h: number };
  spire?: number;
  /** Faces that carry signs, as compass letters. Defaults to the faces on the block's edge. */
  signs?: string;
  /** A lit name near the top, on all four sides: the id of a sign. */
  sign?: string;
  /** Part of a larger building: no ground floor shopfront, no roof details. */
  part?: boolean;
  landmark?: LandmarkKind;
  /** A handle for the few buildings that something else refers to. */
  name?: string;
}

interface BOpts {
  y0?: number; tint?: number; roof?: Roof; crown?: { inset: number; h: number };
  spire?: number; signs?: string; sign?: string; part?: boolean; landmark?: LandmarkKind; name?: string;
}

export const BUILDINGS: Building[] = [];
const counters: Record<string, number> = {};

/** Adds a building given in block-local coordinates (0..48 from the block's north-west corner). */
function b(block: BlockId, lx: number, lz: number, w: number, d: number, top: number, style: Style, o: BOpts = {}): void {
  const r = blockRect(block);
  const n = (counters[block] = (counters[block] ?? 0) + 1);
  BUILDINGS.push({
    id: `${block}.${n}`,
    block,
    x: r.x0 + lx, z: r.z0 + lz, w, d,
    y0: o.y0 ?? 0, y1: top,
    style,
    tint: o.tint ?? n,
    roof: o.roof ?? (top > 60 ? 'units' : top > 24 ? 'tank' : 'bare'),
    crown: o.crown, spire: o.spire, signs: o.signs, sign: o.sign, part: o.part, landmark: o.landmark, name: o.name,
  });
}

// --- The west: Chicago and New York ---------------------------------------------

// A1: Chicago and New York stand shoulder to shoulder at the back of the board.
b('A1', 1, 1, 21, 21, 140, 'glass', { landmark: 'sears' });
b('A1', 24, 1, 13, 13, 128, 'glass', { landmark: 'wtc-north' });
b('A1', 39, 1, 8, 13, 34, 'office');
b('A1', 34, 16, 13, 13, 128, 'glass', { landmark: 'wtc-south' });
b('A1', 1, 24, 14, 23, 58, 'resi');
b('A1', 17, 24, 14, 11, 36, 'resi');
// (the lot at 17, 37 is left open: the Gateway Arch's north foot stands there)
b('A1', 33, 31, 14, 16, 26, 'neon');

// A2: the Empire State Building, brownstones, a diner row, and Liberty in her pond.
b('A2', 1, 1, 14, 22, 112, 'office', { landmark: 'empire' });
// (the lot at 17, 1 is left open: the Gateway Arch's south foot stands there)
b('A2', 1, 25, 14, 22, 50, 'resi');
b('A2', 17, 17, 12, 14, 28, 'resi');
b('A2', 17, 33, 14, 14, 30, 'shop', { landmark: 'liberty' });
b('A2', 33, 1, 14, 12, 16, 'shop');
b('A2', 33, 15, 14, 16, 20, 'shop');
b('A2', 33, 33, 14, 14, 14, 'neon');

// --- Downtown, the invented middle ---------------------------------------------

// B1: the gate tower. The expressway runs through it at local z 18..30, and a
// street runs through its base on the ground, straight underneath.
b('B1', 10, 8, 28, 9.5, 18, 'office', { tint: 2, roof: 'none', signs: '' });
b('B1', 10, 30.5, 28, 9.5, 18, 'office', { tint: 2, roof: 'none', signs: '' });
b('B1', 10, 17.5, 28, 13, 18, 'office', { y0: 7.5, tint: 2, roof: 'none', part: true, signs: '', name: 'gate-lintel' });
b('B1', 10, 8, 28, 9.5, 36, 'office', { y0: 18, tint: 2, roof: 'none', part: true, signs: '' });
b('B1', 10, 30.5, 28, 9.5, 36, 'office', { y0: 18, tint: 2, roof: 'none', part: true, signs: '' });
b('B1', 10, 8, 28, 32, 104, 'office', { y0: 36, tint: 2, part: true, roof: 'units', crown: { inset: 6, h: 10 }, signs: '', name: 'gate-upper' });
b('B1', 1, 1, 8, 15, 46, 'resi');
b('B1', 39, 1, 8, 15, 58, 'glass');
b('B1', 10, 41, 28, 6, 9, 'shop', { signs: 'S' });
b('B1', 1, 39, 7, 8, 8, 'shop');
b('B1', 40, 39, 7, 8, 8, 'shop');

// B2 is the park. Only a small pavilion stands in it besides the tower.
b('B2', 3, 37, 10, 8, 6, 'shop', { roof: 'garden', signs: 'S' });

// A3 is the car park with its two spiral ramps, built separately.

// B3: a street runs under the expressway here too. The middle of the south row is
// left open as a small square, so that the street underneath can be seen.
b('B3', 8, 1, 14, 15, 34, 'resi');
b('B3', 24, 1, 16, 15, 44, 'office');
b('B3', 1, 33, 14, 14, 10, 'shop');
b('B3', 33, 33, 14, 14, 8, 'shop');

// --- The north-east: New York's other spire, and the West Coast --------------------

// C1: the Chrysler Building and the Space Needle stand at the back. The Painted
// Ladies line the street on the east side, and Coit Tower stands on its mound
// at the corner of the boulevard. Between them are stucco houses under clay
// tiles. The showroom takes the middle of the south edge and is built separately.
b('C1', 1, 1, 14, 14, 100, 'office', { landmark: 'chrysler' });
b('C1', 17, 1, 17, 17, 60, 'office', { landmark: 'needle' });
b('C1', 36, 1, 11, 31, 16, 'resi', { landmark: 'ladies' });
b('C1', 1, 17, 14, 15, 24, 'stucco', { roof: 'hip' });
b('C1', 17, 20, 17, 12, 18, 'stucco', { roof: 'hip' });
b('C1', 1, 37, 6, 10, 9, 'shop', { roof: 'hip' });
b('C1', 41, 36, 7, 10, 21, 'shop', { landmark: 'coit' });

// --- The east: Chicago's river front, with two visitors ---------------------------

// C2: Marina City on the corner, a diner beside it and the Flatiron Building at
// the far end of the row, its prow towards the expressway. The Transamerica
// Pyramid stands at the back, by the boulevard.
b('C2', 1, 1, 14, 14, 52, 'office', { roof: 'helipad', sign: 'cola' });
b('C2', 17, 1, 14, 12, 14, 'shop');
b('C2', 33, 1, 14, 20, 84, 'office', { landmark: 'transamerica' });
b('C2', 1, 17, 14, 14, 34, 'resi');
b('C2', 17, 15, 14, 16, 40, 'neon');
b('C2', 33, 23, 14, 8, 22, 'neon');
b('C2', 1, 33, 14, 14, 30, 'office', { landmark: 'flatiron' });
b('C2', 17, 33, 14, 14, 7, 'shop', { landmark: 'diner' });
b('C2', 33, 33, 14, 14, 57, 'office', { landmark: 'marina' });

// C3: Wrigley Field fills the whole block; see WRIGLEY below.

/** The invented tower in the middle of the park. */
export const LANDMARK = { x: 0, z: 9, podiumR: 11, podiumH: 9, shaftR0: 7.2, shaftR1: 4.4, shaftTop: 120, podTop: 131, podR: 8.5, spireTop: 166, haloY: 110, haloR: 14.5 };

// Famous monuments that stand on their own rather than on a building lot.

/** The Gateway Arch spans the boulevard, so traffic drives through it. */
export const ARCH = { x: -64, z: -32, span: 52, height: 52 };
/** The Golden Gate Bridge carries the expressway over the boulevard on its west side. */
export const GOLDEN_GATE = { x: -32, z0: -46.5, z1: -17.5, top: 56 };
/** A neon arch for Route 66 stands over the street on the east side, so traffic drives through it. */
export const ROUTE66 = { x: 96, z: 55.5, half: 6.6, height: 12 };
/**
 * The L: a loop of elevated railway round block C2. Its south side runs above
 * the middle of the street beside Wrigley Field, its east side above the
 * middle of the street on the east, its north side above the boulevard's
 * sidewalk, and its west side above one lane of the street under the expressway.
 *
 * Two branches leave it at its western corners and run west. The one from the
 * north corner follows the boulevard's sidewalk to the park and ends there,
 * at `parkEnd`. The one from the south corner runs on above the middle of the
 * same street as far as the car park, and ends at `midwayEnd`.
 */
export const L_LINE = (() => {
  const west = 34.5, east = 96, north = -17, south = 41, y = 9, r = 7;
  const ring: Seg = { t: 'ring', pts: [[west, north], [east, north], [east, south], [west, south]], y, r };
  return { west, east, north, south, y, r, ring, parkEnd: -19, midwayEnd: -72.5 };
})();
/** Where no lamp stands and no tree grows, because the L's track or one of its platforms is overhead. */
export const UNDER_L: Rect[] = [
  { x0: L_LINE.parkEnd - 2, x1: L_LINE.east, z0: L_LINE.north - 1.6, z1: L_LINE.north + 1.6 }, // the track along the boulevard
  { x0: L_LINE.parkEnd - 1, x1: 12, z0: L_LINE.north, z1: L_LINE.north + 9 }, // Forest Park, and its stairs
  { x0: -10, x1: 22, z0: L_LINE.south - 8, z1: L_LINE.south }, // Roosevelt
  { x0: L_LINE.midwayEnd - 1, x1: -42, z0: L_LINE.south, z1: L_LINE.south + 8 }, // Midway
  { x0: 43, x1: 74, z0: L_LINE.south, z1: L_LINE.south + 8 }, // Addison, and its stairs
];
/** A plain pond in the park. */
export const POND = { x: 15.5, z: -6.5, r: 6.8 };
/** A small square with a fountain, in the gap in block B3's south row. */
export const FOUNTAIN = { x: 0, z: 89, r: 3.2 };
/**
 * Wrigley Field fills the south-east block. Home plate is towards the block's
 * north-west corner, so the field opens to the south-east, and measurements
 * are from the block's north-west corner.
 */
export const WRIGLEY = (() => {
  const r = blockRect('C3');
  return {
    ...r,
    home: { x: r.x0 + 13, z: r.z0 + 13 },
    /** How far the outfield wall is from home plate: least down the lines, most in centre field. */
    wall: (a: number): number => 28.5 + 3.5 * Math.sin(2 * a),
    /** How deep the bleachers behind the wall are. */
    bleachers: (a: number): number => 1.8 + 3.6 * Math.sin(2 * a) ** 2,
    /** The front of the grandstand, and how deep it is. */
    front: 10.4, depth: 9.3,
  };
})();
/** Everything that is lawn rather than paving. */
export const PARKS: Rect[] = [PARK];

/** How fast the showroom's turntable turns, in radians per second. */
export const TURNTABLE_RATE = 0.22;

/** The showroom: a cutaway that opens south onto the boulevard. */
export const SHOWROOM = { x0: 48, z0: -63, x1: 80, z1: -50, h: 12, turntable: { x: 64, z: -56, r: 5 } };

/** The car park: five open floors, a roof deck and two spiral ramps on its south side. */
export const CARPARK = (() => {
  const o = blockRect('A3');
  return {
    x0: o.x0 + 2, x1: o.x0 + 46, z0: o.z0 + 2, z1: o.z0 + 22,
    floors: 5, roofY: 25,
    helixA: { cx: o.x0 + 11, cz: o.z0 + 34, R: 6.5 },
    helixB: { cx: o.x0 + 37, cz: o.z0 + 34, R: 6.5 },
    ox: o.x0, oz: o.z0,
    /** The two lanes across the roof: the northern one is driven west, the southern one east. */
    rowN: o.z0 + 8.5, rowS: o.z0 + 17,
    /** Where its two driveways cross the sidewalk to the street on the south side. */
    driveOut: o.x0 + 17.5, driveIn: o.x0 + 30.5,
  };
})();

// ---------------------------------------------------------------------------
// Roads that vehicles follow
// ---------------------------------------------------------------------------

export type LoopKind = 'street' | 'boulevard' | 'perimeter' | 'express' | 'carpark';

/** Which plain vehicles drive on each kind of road. A kind that is named twice is twice as common. */
const MIX: Record<LoopKind, TrafficType[]> = {
  street: ['sedan', 'sedan', 'hatch', 'hatch', 'van', 'pickup'],
  boulevard: ['sedan', 'sedan', 'hatch', 'van', 'pickup', 'bus'],
  perimeter: ['sedan', 'hatch', 'hatch', 'van', 'pickup', 'bus'],
  express: ['sedan', 'sedan', 'hatch', 'van', 'pickup'],
  carpark: ['sedan', 'hatch', 'hatch'],
};

export const EXPRESS_Y = 24;
export const EXPRESS_HALF = 6;
/** Where the expressway's outer lane runs south past the car park, and the corner it turns east at. */
const OUTER_LANE = { x: -34.75, corner: { cx: -18, cz: 59, R: 16.75 } };

/**
 * The car park's roof is a storey above the expressway and four units from it,
 * and two short bridges join them. Traffic leaves the expressway's outer lane
 * by the northern one, a quarter turn to the right onto the roof's northern
 * lane. It comes back by the southern one, which swings off the roof's
 * southern lane and meets the outer lane half way round the corner.
 *
 * Each is an arc: `from` and `to` are bearings round its middle, and `edge` is
 * the bearing at which it crosses the edge of the expressway's deck.
 */
export const GARAGE_BRIDGES = {
  off: { cx: OUTER_LANE.x - 7, cz: CARPARK.rowN - 7, R: 7, from: 0, edge: 1.005, to: Math.PI / 2 },
  on: { cx: CARPARK.x1 + 0.5, cz: CARPARK.rowS + 16.5, R: 16.5, from: -Math.PI / 2, edge: -Math.PI / 2 + 0.349, to: -Math.PI / 4 },
};
/** The centreline of the elevated expressway: a rounded rectangle around the park. */
export const EXPRESS_RING: Seg = { t: 'ring', pts: [[-32, -73], [32, -73], [32, 73], [-32, 73]], y: EXPRESS_Y, r: 14 };

/**
 * The flyover: each of the boulevard's two inner lanes climbs a ramp onto a slim
 * viaduct of its own, passes over both cross streets and under the expressway,
 * and comes back down. The median, its trees and the expressway's piers stand
 * in the gap between the two decks.
 */
export const FLYOVER: Hump & { z: number; offset: number; half: number } = {
  x0: -76, x1: -44, x2: 44, x3: 76, y: 6.5, z: -32, offset: 5.5, half: 2.9,
};

/**
 * Streets that cut through a block, east to west, underneath the expressway.
 * The one in B1 also runs through the base of the gate tower.
 */
export const CUT_THROUGH: Partial<Record<BlockId, number>> = { B1: -73, B3: 73 };

/** The same streets as stretches of road, each from one cross street's kerb to the other's. */
export const CUTS: { block: BlockId; z: number; x0: number; x1: number }[] = BLOCK_IDS.flatMap((block) => {
  const z = CUT_THROUGH[block];
  if (z === undefined) return [];
  const r = blockRect(block);
  const kerb = STREET_CORR - STREET_CARR;
  return [{ block, z, x0: r.x0 - kerb, x1: r.x1 + kerb }];
});

/** Whether a point lies on one of the cut-through streets, give or take `pad`. */
export function onCut(x: number, z: number, pad = 0): boolean {
  return CUTS.some((c) => x > c.x0 - pad && x < c.x1 + pad && Math.abs(z - c.z) < STREET_CARR + pad);
}

export const LOOPS: Route[] = [];

// One clockwise loop around every block, in the kerb lanes. Clockwise means right
// turns only, so these loops never cross each other or anything else. A block with
// a street cut through it gets two loops instead, one around each half.
for (const id of BLOCK_IDS) {
  const r = blockRect(id);
  const north = id[1] === '2' ? 6.5 : 5.5; // row 2 faces the boulevard on its north side
  const south = id[1] === '1' ? 6.5 : 5.5; // row 1 faces it on its south side
  const xw = r.x0 - 5.5, xe = r.x1 + 5.5, zn = r.z0 - north, zs = r.z1 + south;
  const cut = CUT_THROUGH[id];
  if (cut === undefined) {
    LOOPS.push({
      id: `block-${id}`,
      types: MIX.street,
      segs: [{ t: 'ring', pts: [[xw, zn], [xe, zn], [xe, zs], [xw, zs]], y: 0, r: 4 }],
      speed: 15,
      count: id === 'B2' ? 5 : 4,
    });
  } else {
    // westbound traffic keeps to the cut's north lane, eastbound to its south lane
    LOOPS.push({
      id: `block-${id}-north`,
      types: MIX.street,
      segs: [{ t: 'ring', pts: [[xw, zn], [xe, zn], [xe, cut - 2.5], [xw, cut - 2.5]], y: 0, r: 4 }],
      speed: 14,
      count: 3,
    });
    LOOPS.push({
      id: `block-${id}-south`,
      types: MIX.street,
      segs: [{ t: 'ring', pts: [[xw, cut + 2.5], [xe, cut + 2.5], [xe, zs], [xw, zs]], y: 0, r: 4 }],
      speed: 14,
      count: 3,
    });
  }
}

// The outer lane of the perimeter streets, counter-clockwise around the whole board.
LOOPS.push({
  id: 'perimeter',
  types: MIX.perimeter,
  segs: [{ t: 'ring', pts: [[-98.5, 107.5], [98.5, 107.5], [98.5, -107.5], [-98.5, -107.5]], y: 0, r: 6 }],
  speed: 18,
  count: 11,
});

// The boulevard's two inner lanes: over the flyover, with a U-turn through the
// median gap at each end.
LOOPS.push({
  id: 'boulevard',
  types: MIX.boulevard,
  segs: [{ t: 'ring', pts: [[-89.5, -26.5], [89.5, -26.5], [89.5, -37.5], [-89.5, -37.5]], y: 0, r: 5.5 }],
  speed: 21,
  count: 8,
  hump: FLYOVER,
});

// The expressway: the inner lane runs clockwise, the outer lane counter-clockwise.
LOOPS.push({
  id: 'express-inner',
  types: MIX.express,
  segs: [{ t: 'ring', pts: [[-29.25, -70.25], [29.25, -70.25], [29.25, 70.25], [-29.25, 70.25]], y: EXPRESS_Y, r: 11.25 }],
  speed: 30,
  count: 6,
});
// The outer lane is shared with the traffic that comes up from the car park, so it has fewer of its own.
LOOPS.push({
  id: 'express-outer',
  types: MIX.express,
  segs: [{ t: 'ring', pts: [[OUTER_LANE.x, -75.75], [OUTER_LANE.x, 75.75], [-OUTER_LANE.x, 75.75], [-OUTER_LANE.x, -75.75]], y: EXPRESS_Y, r: OUTER_LANE.corner.R }],
  speed: 28,
  count: 4,
});

/**
 * The car park's own roads: up the eastern spiral, round the roof, down the
 * western one, and back between the two along the ground.
 */
export const CARPARK_ROADS = (() => {
  const c = CARPARK;
  const L = (lx: number, lz: number): [number, number] => [c.ox + lx, c.oz + lz];
  const up: Seg = { t: 'helix', cx: c.helixB.cx, cz: c.helixB.cz, R: c.helixB.R, phi0: -3 * Math.PI, phi1: Math.PI, y0: 0, y1: c.roofY };
  const down: Seg = { t: 'helix', cx: c.helixA.cx, cz: c.helixA.cz, R: c.helixA.R, phi0: -4 * Math.PI, phi1: 0, y0: c.roofY, y1: 0 };
  const roof: Seg = { t: 'poly', pts: [L(30.5, 34), L(30.5, 17), L(41, 17), L(41, 8.5), L(7, 8.5), L(7, 17), L(17.5, 17), L(17.5, 34)], y: c.roofY, r: 3 };
  const ground: Seg = { t: 'poly', pts: [L(17.5, 34), L(17.5, 45), L(30.5, 45), L(30.5, 34)], y: 0, r: 3.5 };
  return { up, down, roof, ground, L };
})();

// The car park: round and round its spirals and its roof, without leaving it.
LOOPS.push({
  id: 'carpark',
  types: MIX.carpark,
  segs: [CARPARK_ROADS.up, CARPARK_ROADS.roof, CARPARK_ROADS.down, CARPARK_ROADS.ground],
  speed: 8.5,
  count: 7,
});

// The run that joins the expressway to the streets. Up the spiral from the
// street, across the roof and over a bridge onto the expressway's outer lane,
// once round the expressway, off again over the other bridge, down the other
// spiral, out of the driveway, round the block, and back in at the first
// driveway. It shares lanes with the car park's own traffic, with the
// expressway's and with the block's, and takes its turn on each.
{
  const c = CARPARK, b = GARAGE_BRIDGES, lane = OUTER_LANE, slow = 8.5;
  const { up, down, L } = CARPARK_ROADS;
  // the block's kerb lane, as the loop round block A3 drives it
  const r = blockRect('A3');
  const xw = r.x0 - 5.5, xe = r.x1 + 5.5, zn = r.z0 - 5.5, zs = r.z1 + 5.5;
  LOOPS.push({
    id: 'garage-run',
    types: MIX.carpark,
    segs: [
      { ...up, speed: slow },
      { t: 'poly', pts: [L(30.5, 34), [c.driveIn, c.rowS], [b.on.cx, c.rowS]], y: c.roofY, r: 3, speed: slow },
      // over the bridge, down a storey, and onto the outer lane half way round its corner
      { t: 'helix', cx: b.on.cx, cz: b.on.cz, R: b.on.R, phi0: b.on.from, phi1: b.on.edge, y0: c.roofY, y1: EXPRESS_Y, speed: slow },
      { t: 'helix', cx: b.on.cx, cz: b.on.cz, R: b.on.R, phi0: b.on.edge, phi1: b.on.to, y0: EXPRESS_Y, y1: EXPRESS_Y, speed: 16 },
      { t: 'helix', cx: lane.corner.cx, cz: lane.corner.cz, R: lane.corner.R, phi0: (3 * Math.PI) / 4, phi1: Math.PI / 2, y0: EXPRESS_Y, y1: EXPRESS_Y, speed: 28 },
      { t: 'poly', pts: [[lane.corner.cx, 75.75], [-lane.x, 75.75], [-lane.x, -75.75], [lane.x, -75.75], [lane.x, b.off.cz]], y: EXPRESS_Y, r: lane.corner.R, speed: 28 },
      // off the outer lane, over the other bridge and up a storey to the roof
      { t: 'helix', cx: b.off.cx, cz: b.off.cz, R: b.off.R, phi0: b.off.from, phi1: b.off.edge, y0: EXPRESS_Y, y1: EXPRESS_Y, speed: slow },
      { t: 'helix', cx: b.off.cx, cz: b.off.cz, R: b.off.R, phi0: b.off.edge, phi1: b.off.to, y0: EXPRESS_Y, y1: c.roofY, speed: slow },
      { t: 'poly', pts: [[b.off.cx, c.rowN], L(7, 8.5), L(7, 17), L(17.5, 17), L(17.5, 34)], y: c.roofY, r: 3, speed: slow },
      { ...down, speed: slow },
      // out of one driveway, round the block in its kerb lane, and in at the other
      { t: 'poly', pts: [L(17.5, 34), L(17.5, 47)], y: 0, r: 0, speed: slow },
      { t: 'poly', pts: [L(17.5, 47), [c.driveOut, zs], [xw, zs], [xw, zn], [xe, zn], [xe, zs], [c.driveIn, zs], L(30.5, 47)], y: 0, r: 4 },
      { t: 'poly', pts: [L(30.5, 47), L(30.5, 34)], y: 0, r: 0, speed: slow },
    ],
    speed: 15,
    count: 8,
  });
}

// ---------------------------------------------------------------------------
// Parked vehicles, and the places where a hero may stand on show
// ---------------------------------------------------------------------------

/** Each is empty until a hero is given it. */
export const HERO_SPOTS: HeroSpot[] = [];
export const PARKED: ParkedSpot[] = [];
{
  const c = CARPARK;
  // Five floors of the car park, nose out towards the open south side.
  for (let f = 0; f < c.floors; f++) {
    for (let k = 0; k < 10; k++) {
      const skip = (f * 7 + k * 3) % 5 === 0 || (f + k) % 7 === 3;
      if (skip) continue;
      PARKED.push({ x: c.ox + 6 + k * 4.05, y: f * STOREY + 0.02, z: c.oz + 17.6, heading: Math.PI / 2, lit: true });
    }
  }
  // The roof: parallel parking on the island and along the north edge.
  PARKED.push({ x: c.ox + 14, y: c.roofY, z: c.oz + 12.75, heading: 0 });
  HERO_SPOTS.push({ id: 'car-park-roof', x: c.ox + 23.5, y: c.roofY, z: c.oz + 12.75, heading: 0 });
  PARKED.push({ x: c.ox + 33, y: c.roofY, z: c.oz + 12.75, heading: 0 });
  for (const lx of [9, 18.5, 28, 37.5]) PARKED.push({ x: c.ox + lx, y: c.roofY, z: c.oz + 4.3, heading: Math.PI });

  // The showroom: the turntable, which waits for a hero, and two plain cars beside it.
  const s = SHOWROOM;
  HERO_SPOTS.push({ id: 'showroom', x: s.turntable.x, y: 0.45, z: s.turntable.z, heading: 0.6, lit: true, turn: TURNTABLE_RATE });
  PARKED.push({ x: s.x0 + 6.5, y: 0.06, z: s.z0 + 6.5, heading: Math.PI / 2 - 0.5, lit: true });
  PARKED.push({ x: s.x1 - 6.5, y: 0.06, z: s.z0 + 6.5, heading: Math.PI / 2 + 0.5, lit: true });

  // The diner's forecourt: two cars nose in, and the bay between them kept for a hero.
  const d = blockRect('C2');
  for (const lx of [19.6, 28.4]) PARKED.push({ x: d.x0 + lx, y: 0.02, z: d.z0 + 43.8, heading: -Math.PI / 2 });
  HERO_SPOTS.push({ id: 'diner', x: d.x0 + 24, y: 0.02, z: d.z0 + 43.8, heading: -Math.PI / 2 });
}

// ---------------------------------------------------------------------------
// Signs. Most brands are invented. A few names are real, as a nod to car
// culture, and a few are the names of the places themselves: they appear as
// plain lettering on a plain board, never as a copied logo.
// ---------------------------------------------------------------------------

const neon = (id: string, lines: string[], color: string, aspect: number): SignDef => ({ id, lines, color, aspect });
const blade = (id: string, text: string, color: string): SignDef => ({
  id, lines: [text], color, vertical: true, aspect: Math.min(0.42, 1.25 / [...text].length),
});
/** A real name, in plain dark lettering on a plain pale board. */
const real = (id: string, name: string): SignDef => ({
  id, lines: [name], color: '#d6d3c8', ink: '#16161a', aspect: 3.6, kind: 'box', real: true,
});

export const SIGNS: SignDef[] = [
  // downtown: the invented brands of the tile's own middle
  neon('karaoke', ['STARLITE', 'KARAOKE'], '#ff3d9a', 2.6),
  neon('cola', ['ROCKET COLA'], '#35e0ff', 4.2),
  neon('donut', ['DONUT', 'GALAXY'], '#ffd23f', 2.6),
  neon('hotel', ['HOTEL MINI'], '#9fd8ff', 4.2),
  neon('tacos', ['TURBO TACOS'], '#7dff9b', 4.2),
  neon('tires', ['BIG DOG', 'TIRES'], '#ff7a1a', 2.6),
  neon('bank', ['BIG BANANA', 'BANK'], '#ffe45c', 2.8),
  neon('club', ['CLUB 64'], '#c77dff', 3.4),
  neon('arcade', ['PIXEL', 'ARCADE'], '#35e0ff', 2.6),
  neon('open', ['24H'], '#7dff9b', 2.2),
  blade('arcade-v', 'ARCADE', '#35e0ff'),
  blade('karaoke-v', 'KARAOKE', '#ff3d9a'),
  blade('donuts-v', 'DONUTS', '#ffd23f'),
  blade('cola-v', 'COLA', '#ff5a4f'),
  blade('club-v', 'CLUB', '#c77dff'),
  blade('bar-v', 'BAR', '#7dff9b'),

  // roadside: diners and motels
  neon('diner', ['DINER'], '#ff5a4f', 3.2),
  neon('motel', ['MOTEL'], '#35e0ff', 3.2),
  neon('burgers', ['BURGERS', '& SHAKES'], '#ffd23f', 2.6),
  neon('deli', ['DELI'], '#7dff9b', 2.6),
  neon('bowl', ['BOWL-O-RAMA'], '#ff7a1a', 4.6),
  neon('route', ['ROUTE 64'], '#f4f1e8', 3.6),
  blade('hotel-v', 'HOTEL', '#ff5a4f'),
  blade('diner-v', 'DINER', '#35e0ff'),
  blade('jazz-v', 'JAZZ', '#c77dff'),
  blade('eat-v', 'EAT', '#ffd23f'),

  // coast: what a street in San Francisco or Seattle sells
  neon('coffee', ['COFFEE'], '#ffd9a0', 3.4),
  neon('sourdough', ['SOURDOUGH', 'BAKERY'], '#ffe45c', 2.8),
  neon('chowder', ['CLAM', 'CHOWDER'], '#ff9ccb', 2.6),
  neon('surf', ['SURF SHOP'], '#35e0ff', 4.0),
  neon('taqueria', ['TAQUERIA'], '#ff7a1a', 4.2),
  neon('records', ['RECORDS'], '#c77dff', 3.8),
  blade('coffee-v', 'COFFEE', '#ffd9a0'),
  blade('tacos-v', 'TACOS', '#7dff9b'),
  blade('surf-v', 'SURF', '#35e0ff'),

  // loop: what a street in Chicago sells
  neon('pizza', ['DEEP DISH', 'PIZZA'], '#ff5a4f', 2.6),
  neon('blues', ['BLUES BAR'], '#35e0ff', 4.0),
  neon('hotdogs', ['HOT DOGS'], '#ffd23f', 3.8),
  neon('ribs', ['RIBS & BBQ'], '#ff7a1a', 4.2),
  neon('jazz', ['JAZZ CLUB'], '#c77dff', 4.0),
  neon('theatre', ['THEATRE'], '#ffe45c', 3.8),
  blade('blues-v', 'BLUES', '#35e0ff'),
  blade('pizza-v', 'PIZZA', '#ff5a4f'),

  // boards
  { id: 'showroom', lines: ['BIG BLOCK MOTORS'], color: '#ffffff', ink: '#c2183a', aspect: 6.4, kind: 'board' },
  { id: 'carpark', lines: ['LOOP PARKING'], color: '#b9e2ff', ink: '#0f3b66', aspect: 5.6, kind: 'box' },
  { id: 'billboard', lines: ['DRINK', 'ROCKET COLA'], color: '#8fecff', ink: '#0b2a4a', aspect: 2.2, kind: 'box', paint: paintBillboard },
  { id: 'p', lines: ['P'], color: '#ffffff', aspect: 1, kind: 'p' },
  { id: 'screen', lines: ['NOW PLAYING', 'Midnight Freeway Loop', 'The Diecasts'], color: '#ff3d9a', aspect: 1.78, kind: 'screen' },

  // Route 66: the highway marker, and the word that goes with it on the road's signs today
  { id: 'shield66', lines: ['ROUTE', '66'], color: '#f4f1e8', aspect: 0.94, size: [241, 256], paint: paintShield },
  neon('historic', ['HISTORIC'], '#ffb02e', 4.6),

  // the L: the names of its stations, which are all names of stations on the real one
  { id: 'addison', lines: ['ADDISON'], color: '#1c2f5e', ink: '#ffffff', aspect: 4.6, kind: 'board' },
  { id: 'state-lake', lines: ['STATE / LAKE'], color: '#1c2f5e', ink: '#ffffff', aspect: 6.2, kind: 'board' },
  { id: 'forest-park', lines: ['FOREST PARK'], color: '#1c2f5e', ink: '#ffffff', aspect: 6.2, kind: 'board' },
  { id: 'roosevelt', lines: ['ROOSEVELT'], color: '#1c2f5e', ink: '#ffffff', aspect: 5.4, kind: 'board' },
  { id: 'midway', lines: ['MIDWAY'], color: '#1c2f5e', ink: '#ffffff', aspect: 4.2, kind: 'board' },

  // Wrigley Field: the red marquee, and the face of the scoreboard
  { id: 'marquee', lines: ['WRIGLEY FIELD', 'GAME TODAY 1:20'], color: '#c8202c', ink: '#ffffff', aspect: 3.3, kind: 'board' },
  { id: 'scoreboard', lines: ['VISITORS', 'HOME'], color: '#2f5d48', ink: '#f2efe6', aspect: 1.9, size: [456, 240], paint: paintScore },

  // real names
  real('hotwheels', 'HOT WHEELS'),
  real('minigt', 'MINI GT'),
  real('goodyear', 'GOODYEAR'),
];

/** Which signs each quarter draws from: over shopfronts, standing out from walls, and on rooftops. */
export const SIGN_POOLS: Record<Quarter, { fascia: string[]; blade: string[]; billboard: string[] }> = {
  downtown: {
    fascia: ['karaoke', 'cola', 'donut', 'hotel', 'tacos', 'tires', 'bank', 'club', 'arcade', 'open'],
    blade: ['arcade-v', 'karaoke-v', 'donuts-v', 'cola-v', 'club-v', 'bar-v'],
    billboard: ['billboard'],
  },
  roadside: {
    fascia: ['diner', 'motel', 'burgers', 'deli', 'bowl', 'route', 'bank'],
    blade: ['hotel-v', 'diner-v', 'jazz-v', 'eat-v'],
    billboard: ['hotwheels'],
  },
  coast: {
    fascia: ['coffee', 'sourdough', 'chowder', 'surf', 'taqueria', 'records'],
    blade: ['coffee-v', 'tacos-v', 'surf-v'],
    billboard: ['minigt'],
  },
  loop: {
    fascia: ['pizza', 'blues', 'hotdogs', 'ribs', 'jazz', 'theatre', 'deli'],
    blade: ['blues-v', 'pizza-v', 'jazz-v', 'hotel-v', 'bar-v'],
    billboard: ['goodyear', 'minigt'],
  },
};

/** Neon colours used for light strips and for the light that spills onto the street. */
export const NEON = ['#ff3d9a', '#35e0ff', '#ffb02e', '#7dff9b', '#c77dff', '#ff5a4f'];
