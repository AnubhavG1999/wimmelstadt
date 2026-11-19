// The Japan tile, as data. Nothing in this file draws anything.
//
// Fuji stands in the north-west corner with the pass on its south-east flank,
// Kyoto lies in the west and Tokyo in the middle and the east, with a river
// between them, and the bay takes the south-east, with Daikoku on its pier.
// The Shinkansen crosses the whole tile in front of the mountain.
//
// Traffic keeps left. A loop round a block therefore runs anticlockwise in the
// lanes next to the block, and turns left only, so no loop ever crosses
// another. The lanes that are left over, on the far side of the streets round
// a group of blocks, make one long clockwise loop.
//
// Units: 1 unit is 1 cm of toy. A lane is 5 wide, a storey is 5 high and a car
// is about 7 long. x points east, z points south, y points up.

import { TILE, type HeroSpot, type ParkedSpot, type Rect, type Route, type TrafficType } from '../../engine/tile';
import { Trace, back, endOf, from, lane, lengthOf, paced, toSegs, totalLength, type P2, type Piece } from '../../engine/lines';

export const BOARD = TILE;
/** How far a shape that runs to the edge of the board stops short of it. */
const EDGE = 0.2;

// ---------------------------------------------------------------------------
// Ground
// ---------------------------------------------------------------------------

/** Kyoto's shore, the river between the two cities, and Tokyo's waterfront. */
export const SHORE = {
  kyoto: 78,
  river: { west: -29, east: -21, head: -10 },
  pier: { x0: -21, x1: 0, z1: 86 },
  tokyo: 50,
  arm: { x: 62, z: 22 },
};

/** Daikoku: a pier that reaches the tile's east edge, with water to its north, west and south. */
export const DAIKOKU: Rect = { x0: 50, z0: 58, x1: BOARD.x1, z1: 106 };

/** All the water there is, as one outline: the cove, the river and the bay. */
export const WATER: P2[] = [
  [BOARD.x0 + EDGE, SHORE.kyoto],
  [SHORE.river.west, SHORE.kyoto],
  [SHORE.river.west, SHORE.river.head],
  [SHORE.river.east, SHORE.river.head],
  [SHORE.pier.x0, SHORE.pier.z1],
  [SHORE.pier.x1, SHORE.pier.z1],
  [SHORE.pier.x1, SHORE.tokyo],
  [SHORE.arm.x, SHORE.tokyo],
  [SHORE.arm.x, SHORE.arm.z],
  [BOARD.x1 - EDGE, SHORE.arm.z],
  [BOARD.x1 - EDGE, DAIKOKU.z0],
  [DAIKOKU.x0, DAIKOKU.z0],
  [DAIKOKU.x0, DAIKOKU.z1],
  [BOARD.x1 - EDGE, DAIKOKU.z1],
  [BOARD.x1 - EDGE, BOARD.z1 - EDGE],
  [BOARD.x0 + EDGE, BOARD.z1 - EDGE],
];

// ---------------------------------------------------------------------------
// The mountain
// ---------------------------------------------------------------------------

/** Fuji: where its summit is, how wide its foot is and how high it stands. The tile's edge cuts it. */
export const FUJI = { x: -78, z: -88, r: 46, h: 60, crater: 3.5, power: 1.7 };

/** How high Fuji's own slope is, this far from the summit. */
export function fujiHeight(d: number): number {
  const f = FUJI;
  if (d >= f.r) return 0;
  return f.h * (1 - Math.max(d, f.crater) / f.r) ** f.power;
}

const S2 = Math.SQRT1_2;

/**
 * The pass: six stretches of road stacked up a slope that faces the south-east,
 * joined by five hairpins. `top` is the middle of the highest stretch.
 */
export const PASS = (() => {
  const gap = 11.6, half = 11, lanes = 2.3, width = 4.6, y1 = 22, summit = 10;
  // down the slope is south-east, and the stretches run north-east to south-west
  const top: P2 = [FUJI.x + S2 * 20 + S2 * 10, FUJI.z + S2 * 20 - S2 * 10];
  return { gap, half, lanes, width, y1, top, r: gap / 2, stretches: 6, summit };
})();

// ---------------------------------------------------------------------------
// Streets on the ground, as middle lines
// ---------------------------------------------------------------------------

/** A closed line through corners, each rounded with radius r. */
export function loopOf(pts: P2[], r: number): Piece[] {
  const n = pts.length;
  const dir = (a: P2, b: P2): [number, number, number] => {
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    return [dx / l, dz / l, l];
  };
  // how far each corner turns, and how much of each side its bend takes up
  const corners = pts.map((p, i) => {
    const a = dir(pts[(i + n - 1) % n], p), b = dir(p, pts[(i + 1) % n]);
    const deg = (Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]) * 180) / Math.PI;
    return { deg, cut: r * Math.tan((Math.abs(deg) * Math.PI) / 360) };
  });
  const d0 = dir(pts[0], pts[1]);
  const t = new Trace(pts[0][0] + d0[0] * corners[0].cut, pts[0][1] + d0[1] * corners[0].cut, (Math.atan2(d0[1], d0[0]) * 180) / Math.PI);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    t.go(dir(pts[i], pts[j])[2] - corners[i].cut - corners[j].cut);
    t.turn(corners[j].deg, r);
  }
  return t.pieces;
}

/**
 * Kyoto's streets: a ring of four, and one across the middle. Its corners are
 * in the order traffic keeps left round the outside. `walk` is how wide its
 * sidewalks are: narrower than Tokyo's.
 */
export const KYOTO = { west: -64, east: -36, north: -14, mid: 14, south: 70, r: 7, walk: 2 };
export const KYOTO_RING = loopOf(
  [[KYOTO.west, KYOTO.north], [KYOTO.east, KYOTO.north], [KYOTO.east, KYOTO.south], [KYOTO.west, KYOTO.south]],
  KYOTO.r,
);

/** Tokyo's streets: an L of six round the whole of it, and the streets inside. */
export const TOKYO = { west: 14, mid: 58, east: 97, north: -105, cross: -50, avenue: -1, south: 36, r: 6, walk: 3 };
export const TOKYO_RING = loopOf(
  [[TOKYO.west, TOKYO.north], [TOKYO.east, TOKYO.north], [TOKYO.east, TOKYO.cross], [TOKYO.mid, TOKYO.cross], [TOKYO.mid, TOKYO.south], [TOKYO.west, TOKYO.south]],
  TOKYO.r,
);

/** The avenue: four lanes. The two in the middle are the Wangan's, down from its ramp to the station's rotary. */
export const AVENUE = { z: TOKYO.avenue, x0: TOKYO.west, x1: TOKYO.mid + 6, width: 24, kerbLane: 9.5 };

// ---------------------------------------------------------------------------
// The pass, and the way round Kyoto that it is part of
// ---------------------------------------------------------------------------

const LANE_OFF = 2.5;

/** Sets the heights of a line of pieces: `y(s)` is asked at each joint, with how far along the line it is. */
function grade(pieces: Piece[], y: (s: number, total: number) => number): Piece[] {
  const total = totalLength(pieces);
  let s = 0;
  return pieces.map((p) => {
    const y0 = y(s, total);
    s += lengthOf(p);
    return { ...p, y0, y1: y(s, total) };
  });
}

/** The middle line of the pass, from the top down to where it meets Kyoto's streets. */
export const PASS_LINE: Piece[] = (() => {
  const p = PASS;
  // The highest stretch runs north-east. It begins with a level length along the
  // mountain's side, so that the loop at the lookout stands clear of Fuji's own slope.
  const t = new Trace(p.top[0] - S2 * (p.half + p.summit), p.top[1] + S2 * (p.half + p.summit), -45);
  t.go(p.summit);
  for (let i = 0; i < p.stretches; i++) {
    t.go(2 * p.half);
    // down the slope is to the right of a stretch that runs north-east, and to the left of the next
    if (i < p.stretches - 1) t.turn(i % 2 === 0 ? 180 : -180, p.r);
  }
  const climb = totalLength(t.pieces);
  // The last stretch runs on south-west, under the Shinkansen, until the lane that
  // comes down it can swing left into the lane by the river.
  const lower = from(endOf(lane(t.pieces, p.lanes))).turn(-45, 6);
  const run = (lower.x - (KYOTO.east + LANE_OFF)) / S2;
  t.go(run);
  // it climbs evenly from the foot of the slope to the top
  return grade(t.pieces, (s) => p.y1 * Math.min(1, Math.max(0, (climb - s) / (climb - p.summit))) + 0.02);
})();

/** The loop at the top of the pass, where the road turns round at the lookout. */
export const LOOKOUT_LOOP: Piece[] = from(endOf(lane(back(PASS_LINE), PASS.lanes))).loopBack(2 * PASS.lanes, 6).pieces;

/**
 * The touge: down the pass, round Kyoto in the outer lanes (south beside the
 * river, west along the shore, north past the castle, east past the station),
 * and up the pass again to the lookout.
 */
export const TOUGE: Piece[] = (() => {
  const k = KYOTO, out = k.r + LANE_OFF;
  const down = lane(PASS_LINE, PASS.lanes);
  const up = lane(back(PASS_LINE), PASS.lanes);
  const t = from(endOf(down)).turn(-45, 6);
  t.goToZ(k.south - k.r).turn(90, out).goToX(k.west + k.r).turn(90, out).goToZ(k.north + k.r).turn(90, out);
  // east along the street by the station, then left onto the pass where the lane that climbs it begins
  const start = endOf(up, true);
  const bend = 6, dz = bend * (1 - S2);
  // the lane that climbs runs north-east: x + z is the same all along it
  const sum = start.x + start.z;
  const zEnd = t.z - dz, xEnd = sum - zEnd;
  t.goToX(xEnd - bend * S2).turn(-45, bend);
  t.go(Math.hypot(start.x - t.x, start.z - t.z));
  return [...down, ...t.pieces, ...up, ...LOOKOUT_LOOP];
})();

/**
 * The ground between the foot of the pass and Kyoto's streets. Both of the
 * pass's lanes cross it, so it is asphalt, like the road on either side.
 */
export const PASS_FOOT: P2[] = (() => {
  const end = endOf(PASS_LINE), w = PASS.width + 0.3;
  // the two corners of the road's end, a little way back up it
  const bx = end.x + S2 * 0.5, bz = end.z - S2 * 0.5;
  return [
    [bx - S2 * w, bz - S2 * w], [bx + S2 * w, bz + S2 * w],
    [KYOTO.east + 5, KYOTO.north + KYOTO.r], [KYOTO.east, KYOTO.north + 1.5], [KYOTO.east - 9, KYOTO.north - 4.4],
  ];
})();

/** Where the lookout's loop is, for the ground under it. */
export const LOOKOUT = (() => {
  // the middle of the loop is the middle of its widest bend
  const bend = LOOKOUT_LOOP[1];
  const c: P2 = bend.t === 'arc' ? bend.c : [0, 0];
  return { x: c[0], z: c[1], y: PASS.y1, r: 17 };
})();

// ---------------------------------------------------------------------------
// The Wangan: the Bayshore Route
// ---------------------------------------------------------------------------

/**
 * How high its deck is: where it leaves the land, in the middle of each bridge
 * and where it reaches Daikoku and Tatsumi.
 */
export const WANGAN = { land: 10, span: 12, island: 8, tatsumi: 10, half: 6, rampHalf: 5, slip: 2.9 };

/** The station's rotary, where the Wangan's ramp comes down in the middle of the avenue. */
export const ROTARY = { x: 34, r: 5.5, rampFrom: 37 };

/** First stretch: from the rotary up the ramp, round to the south and over the first bridge to Daikoku. */
export const WANGAN_NORTH: Piece[] = new Trace(ROTARY.x, AVENUE.z, 0, 0.02)
  .goToX(ROTARY.rampFrom)
  .goToX(82, WANGAN.land)
  .turn(90, 14)
  .goToZ(SHORE.arm.z)
  .goToZ((SHORE.arm.z + DAIKOKU.z0) / 2 - 1, WANGAN.span)
  .goToZ(DAIKOKU.z0 - 2, WANGAN.island)
  .pieces;

/** Second stretch: the Bay Bridge, from Daikoku west to Tatsumi on its pier. */
export const WANGAN_WEST: Piece[] = new Trace(DAIKOKU.x0 - 2, 72, 180, WANGAN.island)
  .goToX(25, WANGAN.span)
  .goToX(12, WANGAN.span - (WANGAN.span - WANGAN.tatsumi) * 0.52)
  .goToX(SHORE.pier.x1, WANGAN.tatsumi)
  .goToX(SHORE.pier.x1 - 2)
  .pieces;

/**
 * On Daikoku the two directions part. Coming from the north the road drops
 * down the east side of the pier, runs through the parking area on the ground
 * and climbs the west side to the Bay Bridge.
 */
export const DAIKOKU_RING: Piece[] = (() => {
  const t = from(endOf(lane(WANGAN_NORTH, LANE_OFF)));
  const south = 101, west = 56;
  t.goToZ(south - 12).turn(90, 12);
  const flat = t.pieces.length;
  t.goToX(west + 10);
  const rise = t.pieces.length;
  t.turn(90, 10).goToZ(72 + LANE_OFF + 8).turn(-90, 8);
  const down = grade(t.pieces.slice(0, flat), (s, total) => WANGAN.island * (1 - s / total) + 0.02);
  const level = grade(t.pieces.slice(flat, rise), () => 0.02);
  const up = grade(t.pieces.slice(rise), (s, total) => (WANGAN.island * s) / total + 0.02);
  return [...down, ...level, ...up];
})();

/** Coming from the west it stays up, and swings north over the pier's far corner. */
export const DAIKOKU_BYPASS: Piece[] = (() => {
  const t = from(endOf(lane(back(WANGAN_WEST), LANE_OFF)));
  const to = endOf(lane(back(WANGAN_NORTH), LANE_OFF), true);
  const r = t.z - to.z;
  return t.goToX(to.x - r).turn(-90, r).pieces;
})();

/**
 * The whole of it, as one road that keeps left: out by the parking area, back
 * by the bypass. It is quick over the bridges, slower on the ramps, and slow
 * past the meet and round the loops at its ends.
 */
export const WANGAN_ROUTE: Piece[] = (() => {
  const out1 = lane(WANGAN_NORTH, LANE_OFF), out2 = lane(WANGAN_WEST, LANE_OFF);
  const home2 = lane(back(WANGAN_WEST), LANE_OFF), home1 = lane(back(WANGAN_NORTH), LANE_OFF);
  const tatsumi = from(endOf(out2)).loopBack(2 * LANE_OFF, 6).pieces;
  const rotary = from(endOf(home1)).loopBack(2 * LANE_OFF, ROTARY.r).pieces;
  const ring = DAIKOKU_RING, flat = ring.findIndex((p) => p.y0 < 0.1 && p.y1 < 0.1);
  return [
    ...paced(out1.slice(0, 2), 20), ...out1.slice(2),
    // down to Daikoku, past the meet at a walk, and up again
    ...paced(ring.slice(0, flat), 19), ...paced(ring.slice(flat, flat + 1), 11), ...paced(ring.slice(flat + 1), 19),
    ...out2.slice(0, -2), ...paced(out2.slice(-2), 18), ...paced(tatsumi, 12),
    ...home2, ...paced(DAIKOKU_BYPASS, 26),
    ...home1.slice(0, -2), ...paced(home1.slice(-2), 20), ...paced(rotary, 11),
  ];
})();

/** The loop at Tatsumi, for the deck under it. */
export const TATSUMI_LOOP: Piece[] = from(endOf(lane(WANGAN_WEST, LANE_OFF))).loopBack(2 * LANE_OFF, 6).pieces;
export const ROTARY_LOOP: Piece[] = from(endOf(lane(back(WANGAN_NORTH), LANE_OFF))).loopBack(2 * LANE_OFF, ROTARY.r).pieces;

// ---------------------------------------------------------------------------
// The Shinkansen
// ---------------------------------------------------------------------------

/**
 * Its line: straight across the tile on a viaduct. It ends at Tokyo Station
 * (`east`), and at its other end it runs into a tunnel (`west`) under Kyoto's
 * hill and ends there out of sight (`hidden`). A train is `train` long, and
 * stops at Kyoto Station with its middle at `kyoto`.
 */
export const RAIL = { z: -30, y: 13, off: 2.2, west: -72, hidden: -102, east: 51, half: 5, train: 26, kyoto: -58 };

/** Kyoto's hill, which the line runs into. It is high enough to hide a train. */
export const KYOTO_HILL = { x0: BOARD.x0, x1: RAIL.west, z0: -44, z1: -12, y: 19 };

/** Ueno Park: flat ground at Tokyo's east edge, kept low so that the scramble can be seen over it. */
export const UENO_PARK: Rect = { x0: 79, z0: TOKYO.cross + 5 + TOKYO.walk, x1: BOARD.x1 - 0.4, z1: -17 };

/**
 * The round the dragon flies: about Fuji's summit, out over Kyoto and the river,
 * and back over the pass. It keeps clear of the pagoda, Kyoto Tower and the wires.
 */
export const DRAGON_ROUND: [number, number, number][] = [
  [-61, 49, -80], [-70, 54, -104], [-92, 57, -98], [-97, 53, -80], [-88, 47, -64],
  [-65, 46, -30], [-77, 50, 12], [-70, 46, 48], [-38, 44, 62], [-14, 48, 30],
  [-6, 56, -14], [-22, 58, -52], [-44, 54, -72],
];

/** A shelf on Fuji's north-east side, for the farmhouses and the hot spring. */
export const SHELF = { x0: -36, x1: -11, z0: BOARD.z0, z1: -84, y: 5 };

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// How many vehicles a route can carry is set by its slowest stretch: a bend of
// radius 3.5 is driven at about 7.7, and at that speed a lane passes one
// vehicle every two seconds. A route is given no more than about three
// quarters of that. With more, a queue forms that never clears, it backs up
// into a fast stretch, and vehicles arriving there cannot stop in time.

const MIX: Record<string, TrafficType[]> = {
  street: ['sedan', 'sedan', 'hatch', 'hatch', 'van', 'pickup'],
  // kei cars and kei trucks, and a bus now and then
  kyoto: ['hatch', 'hatch', 'hatch', 'sedan', 'pickup', 'bus'],
  touge: ['hatch', 'hatch', 'sedan', 'sedan', 'pickup'],
  wangan: ['sedan', 'sedan', 'hatch', 'van', 'van', 'pickup', 'bus'],
};

/** Tokyo's taxis: black, yellow and green. */
export const TAXI_PAINT = [0x1c1d22, 0x1c1d22, 0xe8c24a, 0x3f8a5a, 0xf2f0ea];

/** A loop round one block, anticlockwise in the lanes next to it. */
function block(id: string, x0: number, z0: number, x1: number, z1: number, count: number, types: TrafficType[], paint?: number[]): Route {
  return {
    id,
    types,
    paint,
    segs: [{ t: 'ring', pts: [[x0, z0], [x0, z1], [x1, z1], [x1, z0]], y: 0, r: 3.5 }],
    speed: 13,
    count,
  };
}

export const ROUTES: Route[] = [
  // Kyoto: the two blocks inside its ring of streets
  block('kyoto-tower', KYOTO.west + LANE_OFF, KYOTO.north + LANE_OFF, KYOTO.east - LANE_OFF, KYOTO.mid - LANE_OFF, 3, MIX.kyoto),
  block('gion', KYOTO.west + LANE_OFF, KYOTO.mid + LANE_OFF, KYOTO.east - LANE_OFF, KYOTO.south - LANE_OFF, 5, MIX.kyoto),
  // Tokyo: the four blocks inside its L of streets
  block('tokyo-tower', TOKYO.west + LANE_OFF, TOKYO.north + LANE_OFF, TOKYO.mid - LANE_OFF, TOKYO.cross - LANE_OFF, 6, MIX.street, TAXI_PAINT),
  block('shibuya', TOKYO.mid + LANE_OFF, TOKYO.north + LANE_OFF, TOKYO.east - LANE_OFF, TOKYO.cross - LANE_OFF, 6, MIX.street, TAXI_PAINT),
  block('station', TOKYO.west + LANE_OFF, TOKYO.cross + LANE_OFF, TOKYO.mid - LANE_OFF, AVENUE.z - AVENUE.kerbLane, 5, MIX.street, TAXI_PAINT),
  block('ginza', TOKYO.west + LANE_OFF, AVENUE.z + AVENUE.kerbLane, TOKYO.mid - LANE_OFF, TOKYO.south - LANE_OFF, 4, MIX.street),
  // the lanes left over round Tokyo: one long clockwise loop
  { id: 'tokyo-outer', types: MIX.street, segs: toSegs(lane(TOKYO_RING, LANE_OFF)), speed: 16, count: 13 },
  // the pass and the way round Kyoto
  { id: 'touge', types: MIX.touge, segs: toSegs(TOUGE), speed: 17, count: 15 },
  // the Wangan
  { id: 'wangan', types: MIX.wangan, segs: toSegs(WANGAN_ROUTE), speed: 38, count: 15 },
];

// ---------------------------------------------------------------------------
// What stands where
// ---------------------------------------------------------------------------

/**
 * How far the front of a building is from the middle of the street it faces:
 * it stands behind the sidewalk, and never on it.
 */
const FRONT = { tokyo: 5 + TOKYO.walk, kyoto: 5 + KYOTO.walk, avenue: AVENUE.width / 2 + TOKYO.walk };

/** The ground inside the sidewalks of each block: four in Tokyo and two in Kyoto. */
export const BLOCKS = {
  tower: { x0: TOKYO.west + FRONT.tokyo, z0: TOKYO.north + FRONT.tokyo, x1: TOKYO.mid - FRONT.tokyo, z1: TOKYO.cross - FRONT.tokyo },
  shibuya: { x0: TOKYO.mid + FRONT.tokyo, z0: TOKYO.north + FRONT.tokyo, x1: TOKYO.east - FRONT.tokyo, z1: TOKYO.cross - FRONT.tokyo },
  station: { x0: TOKYO.west + FRONT.tokyo, z0: TOKYO.cross + FRONT.tokyo, x1: TOKYO.mid - FRONT.tokyo, z1: AVENUE.z - FRONT.avenue },
  ginza: { x0: TOKYO.west + FRONT.tokyo, z0: AVENUE.z + FRONT.avenue, x1: TOKYO.mid - FRONT.tokyo, z1: TOKYO.south - FRONT.tokyo },
  kyotoTower: { x0: KYOTO.west + FRONT.kyoto, z0: KYOTO.north + FRONT.kyoto, x1: KYOTO.east - FRONT.kyoto, z1: KYOTO.mid - FRONT.kyoto },
  gion: { x0: KYOTO.west + FRONT.kyoto, z0: KYOTO.mid + FRONT.kyoto, x1: KYOTO.east - FRONT.kyoto, z1: KYOTO.south - FRONT.kyoto },
} satisfies Record<string, Rect>;

/** Tokyo Tower: where it stands, how high it is, and how far each foot is from its middle. */
export const TOKYO_TOWER = { x: 36, z: -80, h: 112, foot: 13.6 };
/** Kyoto Tower's block, and how high the tower on it reaches. The hotel under it fills its block. */
export const KYOTO_TOWER = {
  x: BLOCKS.kyotoTower.x0 - 0.5, z: BLOCKS.kyotoTower.z0 - 0.5,
  w: BLOCKS.kyotoTower.x1 - BLOCKS.kyotoTower.x0 + 1, d: BLOCKS.kyotoTower.z1 - BLOCKS.kyotoTower.z0 + 1, h: 58,
};
/** The pagoda, on the top of Kyoto's hill. */
export const PAGODA = { x: -82, z: -30, h: 30 };
/** The castle, in the middle of its moat. */
export const CASTLE = { x: -88, z: 10 };
export const MOAT: Rect = { x0: -102, z0: -5.5, x1: -73.5, z1: 26 };
/** The Golden Pavilion, on a spit of land in its pond. */
export const KINKAKU = { x: -88, z: 46 };
export const POND: Rect = { x0: -102, z0: 32, x1: -75, z1: 66 };
/** Fushimi Inari: the way its gates climb, from the street to the top of the hill. */
export const INARI = { way: [[-74.5, -10.6], [-81, -13.5], [-87, -17], [-92, -21.5], [-96.5, -26]] as P2[] };
/** Sensō-ji: the line it stands along, its gate, the two ends of its lane of stalls, and the back and front of its hall. */
export const SENSOJI = { x: -2, gate: -66, lane: [-84, -70] as P2, hall: [-106, -94] as P2 };
/** Tokyo Station: the length of its front, and where that front stands, on the avenue. */
export const TOKYO_STATION = { x0: BLOCKS.station.x0, x1: BLOCKS.station.x1, z1: BLOCKS.station.z1 };

/** The tuner's garage: a showroom and a workshop with one side open to the street, and a turntable in the showroom. */
export const GARAGE = {
  x0: BLOCKS.ginza.x0, z0: BLOCKS.ginza.z0 + 1, x1: BLOCKS.ginza.x1, z1: BLOCKS.ginza.z1 - 1, h: 9,
  table: { x: BLOCKS.ginza.x0 + 9.5, z: BLOCKS.ginza.z0 + 7.2, r: 4.3 }, turn: 0.22,
  /** Where the wall between the showroom and the workshop is, and the lift in the workshop. */
  wall: BLOCKS.ginza.x0 + 19, lift: { x: BLOCKS.ginza.x1 - 5, z: BLOCKS.ginza.z0 + 7.4 },
};
/** The konbini, with its car park in front of it, on the side away from the river. */
export const KONBINI = { x0: -17, z0: 15.5, x1: -4, z1: 24, park: 34.5 };
/** The petrol station: a roof on posts, with the hoses hanging from it. */
export const PETROL = { x0: -18, z0: 37.5, x1: -3.5, z1: 47.5 };
/** The tofu shop at the foot of the pass. */
export const TOFU = { x0: -27.6, z0: -23, x1: -21.4, z1: -14 };
/** The parts shop and the used-car lot, under the Wangan. */
export const PARTS = { x0: TOKYO.mid + FRONT.tokyo + 0.5, z0: -15.6, x1: TOKYO.mid + FRONT.tokyo + 10.5, z1: -8.2 };
/** The parts shop's car park, beside it: bay i is at `first` + i * `pitch`. */
export const PARTS_PARK = { x0: TOKYO.mid + FRONT.tokyo + 11.5, z0: -15.6, x1: TOKYO.mid + FRONT.tokyo + 23.5, z1: -7.6, bays: 3, first: TOKYO.mid + FRONT.tokyo + 13.9, pitch: 3.6 };
export const USED_CARS = { x0: TOKYO.mid + FRONT.tokyo + 0.5, z0: 3.6, x1: 90, z1: 21.4, rows: [7.5, 17.5], first: 69.4, pitch: 3.6 };
/** The scramble: where its two streets cross. */
export const SCRAMBLE = { x: TOKYO.mid, z: TOKYO.cross };
/** The tower of screens and the round-fronted tower, on two corners of the scramble, and Hachikō's square on a third. */
export const SCREENS = { x0: BLOCKS.tower.x1 - 8.5, z0: BLOCKS.tower.z1 - 7, x1: BLOCKS.tower.x1, z1: BLOCKS.tower.z1, h: 42 };
export const ROUND_TOWER = { x0: BLOCKS.shibuya.x0, z0: BLOCKS.shibuya.z1 - 13, x1: BLOCKS.shibuya.x0 + 8.5, z1: BLOCKS.shibuya.z1, h: 38 };
export const HACHIKO = { x: TOKYO.mid + FRONT.tokyo + 2.2, z: TOKYO.cross + FRONT.tokyo + 2.6, x0: TOKYO.mid + FRONT.tokyo, z0: TOKYO.cross + FRONT.tokyo, x1: 75, z1: -18.5 };
/** The car carrier at Tatsumi's pier, and where the cars that wait to go aboard stand. */
export const CARRIER = { x0: -19.5, z0: 88.6, x1: 5.5, z1: 96.2, ramp: [-15.5, -10.5] as P2, waiting: { xs: [-18.4, -8.4, -4.8], z: 82.3 } };
/** The rock garden, behind its wall, in the middle of Gion. */
export const ROCK_GARDEN: Rect = { x0: BLOCKS.gion.x0 + 0.5, z0: 41.5, x1: BLOCKS.gion.x0 + 7.8, z1: 53.5 };
/** The snow monkeys' pool and the thatched farmhouses, on the shelf below Fuji. Each farmhouse is [x, z, how far it is turned]. */
export const MONKEYS = { x: -22, z: -109, r: 3 };
export const FARMS: [number, number, number][] = [[-22.4, -98.6, 6], [-30.8, -104.2, -8]];
export const PADDIES: Rect[] = [{ x0: -35, z0: -112.6, x1: -27.5, z1: -110.2 }, { x0: -30.4, z0: -98.2, x1: -27, z1: -95.6 }];
/**
 * The ways the lantern boats go. In the cove they pass between the shrine's
 * stage and the great torii, and then out through the torii. In the bay they
 * go round under the Bay Bridge.
 */
export const BOATS = {
  cove: { pts: [[-97, 96.5], [-66, 96.5], [-66, 110.3], [-97, 110.3]] as P2[], r: 6 },
  bay: { pts: [[18, 58], [44, 58], [44, 106], [18, 106]] as P2[], r: 8 },
};

/**
 * The cherry trees along the river, each as [x, z]: a line on Kyoto's bank,
 * four between each street lamp and the next and none where the red bridge
 * lands, and a shorter line on Tokyo's bank, where there is room for one.
 */
export const RIVER_CHERRIES: P2[] = [
  ...[-1.75, 3.75, 9.25, 14.75, 20.25, 25.75, 36.75, 42.25, 47.75, 53.25, 58.75].map((z): P2 => [KYOTO.east + 5 + KYOTO.walk / 2, z]),
  ...[8, 13.5, 19, 24.5, 35.6].map((z): P2 => [SHORE.river.east + 1.1, z]),
];

/** The great torii, standing in the water of Kyoto's cove. */
export const TORII = { x: -66, z: 103 };

/** The Ferris wheel on Tokyo's waterfront. */
export const FERRIS = { x: 36, y: 16.6, z: 47.3, r: 13.4 };

/** The yard at the lookout, on the side of the loop that looks out over the tile. */
export const LOOKOUT_YARD = { x: LOOKOUT.x + S2 * 13, z: LOOKOUT.z + S2 * 13, half: 7.5, deep: 3.6 };

/**
 * Daikoku's parking area: two rows of bays, nose out towards the bay, and the
 * rest house at the west end of the back row. Bay i of a row is at x0 + i * pitch.
 */
export const DAIKOKU_BAYS = {
  x0: 62, pitch: 3.6,
  rows: [{ z: 80, from: 4, to: 8 }, { z: 92.5, from: 0, to: 8 }],
  house: { x0: 60.5, z0: 74, x1: 73.6, z1: 82 },
};

/** Tatsumi's parking area: a deck beside the loop at the Wangan's west end. */
export const TATSUMI: Rect = { x0: -15, z0: 54.5, x1: -1, z1: 64 };

/** Ground that is kept clear of trees, and of the people who are scattered along the sidewalks, because something stands there. */
export const KEEP_CLEAR: Rect[] = [
  { x0: PAGODA.x - 7, z0: PAGODA.z - 7, x1: PAGODA.x + 7, z1: PAGODA.z + 7 },
  { x0: -101, z0: -30, x1: -70, z1: -6 },
  { x0: SENSOJI.x - 9, z0: -108, x1: SENSOJI.x + 9, z1: -62 },
  { x0: KYOTO_TOWER.x, z0: KYOTO_TOWER.z, x1: KYOTO_TOWER.x + KYOTO_TOWER.w, z1: KYOTO_TOWER.z + KYOTO_TOWER.d },
  { x0: TOKYO_STATION.x0, z0: BLOCKS.station.z0, x1: TOKYO_STATION.x1, z1: TOKYO_STATION.z1 + 1.2 },
  { x0: -71, z0: -41, x1: -45, z1: -20 },
  { x0: TOKYO_TOWER.x - TOKYO_TOWER.foot, z0: TOKYO_TOWER.z - TOKYO_TOWER.foot, x1: TOKYO_TOWER.x + TOKYO_TOWER.foot, z1: TOKYO_TOWER.z + TOKYO_TOWER.foot },
  { x0: SHELF.x0, z0: SHELF.z0, x1: SHELF.x1, z1: SHELF.z1 - 2 },
  { x0: TOFU.x0 - 1, z0: TOFU.z0 - 1, x1: TOFU.x1 + 1, z1: TOFU.z1 + 4 },
  { x0: GARAGE.x0, z0: GARAGE.z0, x1: GARAGE.x1, z1: GARAGE.z1 + 1 },
  { x0: KONBINI.x0 - 1, z0: KONBINI.z0, x1: KONBINI.x1 + 3, z1: PETROL.z1 + 1 },
  { x0: HACHIKO.x0, z0: HACHIKO.z0, x1: PARTS.x1, z1: PARTS.z1 + 3 },
  { x0: PARTS_PARK.x0, z0: PARTS_PARK.z0, x1: PARTS_PARK.x1, z1: PARTS_PARK.z1 },
  { x0: ROUND_TOWER.x0, z0: ROUND_TOWER.z0, x1: ROUND_TOWER.x1 + 0.4, z1: ROUND_TOWER.z1 },
  { x0: SCREENS.x0, z0: SCREENS.z0, x1: SCREENS.x1, z1: SCREENS.z1 },
  { x0: USED_CARS.x0, z0: USED_CARS.z0, x1: USED_CARS.x1, z1: USED_CARS.z1 },
  { x0: ROCK_GARDEN.x0 - 0.5, z0: ROCK_GARDEN.z0, x1: ROCK_GARDEN.x1 + 2, z1: ROCK_GARDEN.z1 + 0.5 },
  // the foot of the pass, where its lanes leave Kyoto's streets
  { x0: KYOTO.east - 10, z0: KYOTO.north - 13, x1: KYOTO.east + 6.5, z1: KYOTO.north + 7 },
];

// ---------------------------------------------------------------------------
// Parked vehicles, and the places where a hero may stand on show
// ---------------------------------------------------------------------------

export const PARKED: ParkedSpot[] = [];
export const HERO_SPOTS: HeroSpot[] = [];
{
  const south = Math.PI / 2;
  // Daikoku's parking area: two rows, nose out towards the bay. Three bays of the front row are kept for heroes.
  const bays = DAIKOKU_BAYS, [backRow, frontRow] = bays.rows;
  // (the last bay of the back row is the dekotora's)
  for (let i = backRow.from; i < backRow.to; i++) PARKED.push({ x: bays.x0 + i * bays.pitch, y: 0.02, z: backRow.z, heading: south });
  for (let i = frontRow.from; i <= frontRow.to; i++) {
    const x = bays.x0 + i * bays.pitch;
    if (i >= 3 && i <= 5) HERO_SPOTS.push({ id: `daikoku-${i - 2}`, x, y: 0.02, z: frontRow.z, heading: south });
    else if (i !== 7) PARKED.push({ x, y: 0.02, z: frontRow.z, heading: south });
  }
  // Tatsumi: three bays up on the expressway, with the city behind them. The middle one is kept for a hero.
  for (let i = 0; i < 3; i++) {
    const spot = { x: TATSUMI.x0 + 3.14 + i * 3.9, y: WANGAN.tatsumi + 0.03, z: TATSUMI.z0 + 4.7, heading: -south };
    if (i === 1) HERO_SPOTS.push({ id: 'tatsumi', ...spot });
    else PARKED.push(spot);
  }
  // the lookout at the top of the pass
  // (its bays face south-east, out over the pass)
  const yard = LOOKOUT_YARD, bay = 3.9 * S2;
  HERO_SPOTS.push({ id: 'lookout', x: yard.x, y: PASS.y1 + 0.02, z: yard.z, heading: Math.PI / 4 });
  PARKED.push({ x: yard.x - bay, y: PASS.y1 + 0.02, z: yard.z + bay, heading: Math.PI / 4 });
  PARKED.push({ x: yard.x + bay, y: PASS.y1 + 0.02, z: yard.z - bay, heading: Math.PI / 4 });
  // the tuner's garage: its turntable waits for a hero, and a car is up on the lift in the workshop
  HERO_SPOTS.push({ id: 'garage', x: GARAGE.table.x, y: 0.45, z: GARAGE.table.z, heading: 0.6, lit: true, turn: GARAGE.turn });
  PARKED.push({ x: GARAGE.lift.x, y: 1.62, z: GARAGE.lift.z, heading: south });
  // the konbini's three bays: cars are backed into them, as in Japan. The middle one is kept for a hero.
  for (let i = 0; i < 3; i++) {
    const spot = { x: KONBINI.x0 + 2.4 + i * 4.1, y: 0.02, z: KONBINI.z1 + 5.4, heading: south };
    if (i === 1) HERO_SPOTS.push({ id: 'konbini', ...spot });
    else if (i === 0) PARKED.push(spot);
  }
  // a car at the petrol station's hoses, one by the tofu shop, and the cars that wait for the carrier
  PARKED.push({ x: (PETROL.x0 + PETROL.x1) / 2 - 1, y: 0.02, z: (PETROL.z0 + PETROL.z1) / 2 - 0.4, heading: 0 });
  PARKED.push({ x: TOFU.x0 + 3.1, y: 0.02, z: TOFU.z1 + 2.2, heading: 0 });
  for (const x of CARRIER.waiting.xs) PARKED.push({ x, y: 0.02, z: CARRIER.waiting.z, heading: south });
  // the parts shop's car park
  for (let i = 0; i < PARTS_PARK.bays; i++) PARKED.push({ x: PARTS_PARK.first + i * PARTS_PARK.pitch, y: 0.02, z: (PARTS_PARK.z0 + PARTS_PARK.z1) / 2, heading: south });
  // the used-car lot under the Wangan: two rows, nose out
  for (let i = 0; i < 6; i++) {
    for (const [n, z] of USED_CARS.rows.entries()) if (n > 0 || i > 0) PARKED.push({ x: USED_CARS.first + i * USED_CARS.pitch, y: 0.02, z, heading: south });
  }
}

// ---------------------------------------------------------------------------
// Ordinary buildings: what stands between the things to find. Tokyo's are
// narrow and tall with signs up their sides, Kyoto's are low and wooden under
// tiled roofs.
// ---------------------------------------------------------------------------

export type Style = 'pencil' | 'neon' | 'office' | 'shop' | 'machiya';
export interface Ordinary { x: number; z: number; w: number; d: number; top: number; style: Style; signs: string; roof?: 'bare' | 'units' | 'tank' | 'hip' | 'garden'; kyoto?: boolean }

const o = (x: number, z: number, w: number, d: number, top: number, style: Style, signs = 'SE', more: Partial<Ordinary> = {}): Ordinary =>
  ({ x, z, w, d, top, style, signs, ...more });
const machiya = (x: number, z: number, w: number, d: number, top: number, signs: string): Ordinary =>
  o(x, z, w, d, top, 'machiya', signs, { roof: 'hip', kyoto: true });

export const ORDINARY: Ordinary[] = (() => {
  const s = BLOCKS.shibuya, t = BLOCKS.tower, st = BLOCKS.station, g = BLOCKS.gion;
  return [
    // Tokyo, north-east of the scramble: the dark towers of the neon alleys
    o(s.x1 - 16, s.z0, 16, 12, 40, 'neon'),
    o(s.x0, s.z0, 6, 12, 28, 'pencil', 'SW'),
    o(s.x1 - 14, s.z0 + 13, 14, 11.5, 54, 'neon', 'E'),
    o(s.x0, s.z0 + 13, 8, 11.5, 34, 'pencil', 'W'),
    o(s.x1 - 13.5, s.z1 - 13.5, 13.5, 13.5, 30, 'neon'),
    // north-west of it, beside the tower of screens: an arcade and a pencil building
    o(t.x0 + 9.5, t.z1 - 7, 9, 7, 32, 'pencil', 'S'),
    o(t.x0, t.z1 - 7, 8.5, 7, 24, 'neon', 'S'),
    // under the Shinkansen's arches: a bar by the river, and a row of eating places behind the station
    o(-7.4, -34.4, 9, 8.6, 6.4, 'shop', 'S'),
    o(st.x0, st.z0, 6.5, 6.3, 7, 'shop', 'N'),
    o(st.x0 + 7.5, st.z0, 6.5, 6.3, 8.5, 'shop', 'N'),
    o(st.x0 + 15, st.z0, 6.5, 6.3, 6.5, 'shop', 'N'),
    o(st.x0 + 22.5, st.z0, 5.5, 6.3, 9, 'shop', 'N'),
    // the yokocho by the river: two rows of tiny bars with a lane between them
    o(-19, -21, 7, 5, 6, 'shop', 'S'),
    o(-11.5, -21, 7, 5, 7, 'shop', 'S'),
    o(-4, -21, 7, 5, 6, 'shop', 'S'),
    o(-19, -12.5, 7, 5, 7, 'shop', 'N'),
    o(-11.5, -12.5, 7, 5, 6, 'shop', 'N'),
    o(-4, -12.5, 7, 5, 8, 'shop', 'NE'),
    o(-19, -4, 9, 9, 14, 'pencil', 'E'),
    o(-8, -4, 12, 9, 11, 'pencil', 'SE'),
    // Kyoto: Gion's townhouses, in two rows with a lane between them, and the hall beside the rock garden
    machiya(g.x0, g.z0, 6, 9, 7, 'W'),
    machiya(g.x0, g.z0 + 10.5, 6, 9, 6, 'W'),
    machiya(g.x1 - 6, g.z0, 6, 9, 6, 'E'),
    machiya(g.x1 - 6, g.z0 + 10.5, 6, 9, 7, 'E'),
    machiya(g.x1 - 4.2, g.z0 + 21, 4.2, 10.5, 6, 'E'),
    machiya(g.x0, g.z1 - 8.5, 6, 8.5, 7, 'W'),
    machiya(g.x1 - 6, g.z1 - 8.5, 6, 8.5, 6, 'ES'),
  ];
})();
