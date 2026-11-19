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
import { Trace, back, endOf, from, lane, lengthOf, toSegs, totalLength, type P2, type Piece } from './lines';

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

/** Kyoto's streets: a ring of four, and one across the middle. Its corners are in the order traffic keeps left round the outside. */
export const KYOTO = { west: -64, east: -36, north: -17, mid: 14, south: 70, r: 7 };
export const KYOTO_RING = loopOf(
  [[KYOTO.west, KYOTO.north], [KYOTO.east, KYOTO.north], [KYOTO.east, KYOTO.south], [KYOTO.west, KYOTO.south]],
  KYOTO.r,
);

/** Tokyo's streets: an L of six round the whole of it, and the streets inside. */
export const TOKYO = { west: 14, mid: 58, east: 97, north: -105, cross: -50, avenue: -1, south: 36, r: 6 };
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
  t.goToX(74);
  const rise = t.pieces.length;
  t.goToX(west + 12).turn(90, 12).goToZ(72 + LANE_OFF + 8).turn(-90, 8);
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

/** The whole of it, as one road that keeps left: out by the parking area, back by the bypass. */
export const WANGAN_ROUTE: Piece[] = (() => {
  const out1 = lane(WANGAN_NORTH, LANE_OFF), out2 = lane(WANGAN_WEST, LANE_OFF);
  const home2 = lane(back(WANGAN_WEST), LANE_OFF), home1 = lane(back(WANGAN_NORTH), LANE_OFF);
  const tatsumi = from(endOf(out2)).loopBack(2 * LANE_OFF, 6).pieces;
  const rotary = from(endOf(home1)).loopBack(2 * LANE_OFF, ROTARY.r).pieces;
  return [...out1, ...DAIKOKU_RING, ...out2, ...tatsumi, ...home2, ...DAIKOKU_BYPASS, ...home1, ...rotary];
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
export const RAIL = { z: -30, y: 13, off: 2.2, west: -72, hidden: -102, east: 54, half: 5, train: 26, kyoto: -58 };

/** Kyoto's hill, which the line runs into. It is high enough to hide a train. */
export const KYOTO_HILL = { x0: BOARD.x0, x1: RAIL.west, z0: -44, z1: -12, y: 19 };

/** Ueno Park: flat ground at Tokyo's east edge, kept low so that the scramble can be seen over it. */
export const UENO_PARK: Rect = { x0: 79, z0: -43, x1: BOARD.x1 - 0.4, z1: -17 };

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
  block('gion', KYOTO.west + LANE_OFF, KYOTO.mid + LANE_OFF, KYOTO.east - LANE_OFF, KYOTO.south - LANE_OFF, 4, MIX.kyoto),
  // Tokyo: the four blocks inside its L of streets
  block('tokyo-tower', TOKYO.west + LANE_OFF, TOKYO.north + LANE_OFF, TOKYO.mid - LANE_OFF, TOKYO.cross - LANE_OFF, 6, MIX.street, TAXI_PAINT),
  block('shibuya', TOKYO.mid + LANE_OFF, TOKYO.north + LANE_OFF, TOKYO.east - LANE_OFF, TOKYO.cross - LANE_OFF, 5, MIX.street, TAXI_PAINT),
  block('station', TOKYO.west + LANE_OFF, TOKYO.cross + LANE_OFF, TOKYO.mid - LANE_OFF, AVENUE.z - AVENUE.kerbLane, 5, MIX.street, TAXI_PAINT),
  block('ginza', TOKYO.west + LANE_OFF, AVENUE.z + AVENUE.kerbLane, TOKYO.mid - LANE_OFF, TOKYO.south - LANE_OFF, 4, MIX.street),
  // the lanes left over round Tokyo: one long clockwise loop
  { id: 'tokyo-outer', types: MIX.street, segs: toSegs(lane(TOKYO_RING, LANE_OFF)), speed: 16, count: 13 },
  // the pass and the way round Kyoto
  { id: 'touge', types: MIX.touge, segs: toSegs(TOUGE), speed: 17, count: 13 },
  // the Wangan
  { id: 'wangan', types: MIX.wangan, segs: toSegs(WANGAN_ROUTE), speed: 31, count: 15 },
];

// ---------------------------------------------------------------------------
// What stands where. Until its model is built, each thing is a plain box with
// its name on a board, so that the tile can be judged for where things are and
// how full it is.
// ---------------------------------------------------------------------------

/** The great torii, standing in the water of Kyoto's cove. */
export const TORII = { x: -66, z: 97 };

/** The Ferris wheel on Tokyo's waterfront. */
export const FERRIS = { x: 36, y: 16.6, z: 47.3, r: 13.4 };

/** The yard at the lookout, on the side of the loop that looks out over the tile. */
export const LOOKOUT_YARD = { x: LOOKOUT.x + S2 * 13, z: LOOKOUT.z + S2 * 13, half: 7.5, deep: 3.6 };

/** A thing that is still to be built: a box on the ground, or on whatever is at `y`. */
export interface Lot { id: string; name: string; x: number; z: number; w: number; d: number; h: number; color: number; y?: number; label?: boolean }

const lot = (id: string, name: string, x: number, z: number, w: number, d: number, h: number, color: number, y = 0, label = true): Lot =>
  ({ id, name, x, z, w, d, h, color, y, label });

const PLASTER = 0xe9e3d6, VERMILION = 0xd8432b, BRICK = 0xa8553f, GLASS = 0x8fb4cf, DARK = 0x3d3856, THATCH = 0x9a8356;

export const LOTS: Lot[] = [
  // the mountain
  lot('pagoda', 'PAGODA', -87, -42, 9, 9, 30, VERMILION, KYOTO_HILL.y),
  lot('monkeys', 'SNOW MONKEYS', -34, -109, 9, 7, 1.6, 0x9fd3e8, SHELF.y),
  lot('farm-1', 'THATCHED FARMS', -28, -98, 7, 9, 8, THATCH, SHELF.y),
  lot('farm-2', '', -19, -106, 6, 8, 7, THATCH, SHELF.y, false),
  lot('farm-3', '', -19, -93, 6, 7, 7, THATCH, SHELF.y, false),
  lot('tofu', 'TOFU SHOP', -27.5, -23, 6, 9, 6, PLASTER),

  // Kyoto
  lot('kyoto-station-n', '', -70, -40, 24, 4.4, 18, GLASS, 0, false),
  lot('kyoto-station-s', 'KYOTO STATION', -70, -24.6, 24, 3.4, 18, GLASS),
  lot('kyoto-tower', 'KYOTO TOWER', -58.5, -11, 16, 16, 16, PLASTER),
  lot('castle', 'CASTLE', -94, 3, 12, 12, 30, 0x2f3238, 7),
  lot('kinkakuji', 'GOLDEN PAVILION', -93, 41, 9, 9, 14, 0xd9b24a),
  lot('rock-garden', 'ROCK GARDEN', -58, 42, 16, 10, 0.5, 0xf0ede4),

  // Tokyo
  lot('tokyo-station', 'TOKYO STATION', 19, -24.6, 34, 8.6, 13, BRICK),
  lot('screens', 'SHIBUYA', 44, -64, 9, 9, 42, GLASS),
  lot('tower-109', '', 63.5, -64, 10, 10, 38, 0xd9dde4, 0, false),
  lot('hachiko', 'HACHIKO', 63.5, -44.5, 11, 27, 0.5, 0xd8d2c4),
  lot('kaminarimon', 'KAMINARIMON', -7, -67, 10, 4, 9, VERMILION),
  lot('nakamise-w', '', -7, -86, 3.4, 17, 4, VERMILION, 0, false),
  lot('nakamise-e', '', -0.4, -86, 3.4, 17, 4, VERMILION, 0, false),
  lot('sensoji', 'SENSO-JI', -9.5, -107, 15, 14, 14, VERMILION),
  lot('arcade', 'ARCADE', 19.5, -64, 11, 9, 24, DARK),
  lot('arches', 'UNDER THE ARCHES', -13, -34, 22, 8, 6.5, BRICK),

  // the bay
  lot('rest-house', 'DAIKOKU PA', 61, 59.4, 20, 6, 6, PLASTER),
  lot('garage', "TUNER'S GARAGE", 21, 15, 30, 12, 9, 0xe9e6df),
  lot('konbini', 'KONBINI', -17, 16, 13, 9, 5, 0xf2f0ea),
  lot('petrol', 'PETROL STATION', -18, 36, 15, 10, 6, 0xf2f0ea),
  lot('carrier', 'CAR CARRIER', -20, 88, 24, 8, 11, 0x2f5fa8, -1),
  lot('parts', 'PARTS SHOP', 64.5, -15.6, 12, 7.4, 6, 0xf2c14e),
  lot('tatsumi', 'TATSUMI PA', -15, 55, 14, 9.5, 0.6, 0x55575d, WANGAN.tatsumi - 0.6),
];

/** Things that are named on a board but are not a box: the mountain, the roads, the bridges. */
export const NAMES: { id: string; name: string; x: number; y: number; z: number }[] = [
  { id: 'fuji', name: 'MOUNT FUJI', x: FUJI.x + 6, y: 56, z: FUJI.z + 6 },
  { id: 'pass', name: 'THE PASS', x: -22, y: 12, z: -64 },
  { id: 'lookout', name: 'LOOKOUT', x: LOOKOUT.x, y: PASS.y1 + 4, z: LOOKOUT.z },
  { id: 'inari', name: 'FUSHIMI INARI', x: -90, y: KYOTO_HILL.y + 5, z: -18 },
  { id: 'tokyo-tower', name: 'TOKYO TOWER', x: 36, y: 118, z: -80 },
  { id: 'crossing', name: 'SHIBUYA CROSSING', x: TOKYO.mid, y: 7, z: TOKYO.cross },
  { id: 'ueno', name: 'UENO PARK', x: 91, y: 9, z: -30 },
  { id: 'shinkansen', name: 'SHINKANSEN', x: 0, y: RAIL.y + 9, z: RAIL.z },
  { id: 'bay-bridge', name: 'BAY BRIDGE', x: 25, y: 52, z: 72 },
  { id: 'wangan', name: 'WANGAN', x: 96, y: 22, z: 40 },
  { id: 'torii', name: 'GREAT TORII', x: TORII.x, y: 16, z: TORII.z },
  { id: 'river', name: 'RED BRIDGE', x: -25, y: 7, z: 30 },
  { id: 'gion', name: 'GION', x: -50, y: 13, z: 30 },
  { id: 'toll', name: 'TOLL GATE', x: 47, y: 9, z: AVENUE.z },
  { id: 'used', name: 'USED CARS', x: 84, y: 5, z: 16 },
  { id: 'ferris', name: 'FERRIS WHEEL', x: FERRIS.x, y: FERRIS.y + FERRIS.r + 4, z: FERRIS.z },
  { id: 'neon', name: 'NEON ALLEYS', x: 84, y: 60, z: -78 },
  { id: 'yokocho', name: 'YOKOCHO', x: -10, y: 9, z: -8 },
];

// ---------------------------------------------------------------------------
// Parked vehicles, and the places where a hero may stand on show
// ---------------------------------------------------------------------------

export const PARKED: ParkedSpot[] = [];
export const HERO_SPOTS: HeroSpot[] = [];
{
  const south = Math.PI / 2;
  // Daikoku's parking area: two rows, nose out towards the bay. Three bays of the front row are kept for heroes.
  for (let i = 0; i < 9; i++) {
    const x = 62 + i * 3.6;
    if (i !== 2 && i !== 6) PARKED.push({ x, y: 0.02, z: 80, heading: south });
    if (i >= 3 && i <= 5) HERO_SPOTS.push({ id: `daikoku-${i - 2}`, x, y: 0.02, z: 92.5, heading: south });
    else if (i !== 7) PARKED.push({ x, y: 0.02, z: 92.5, heading: south });
  }
  // Tatsumi: a lay-by up on the expressway, with the city behind it
  const t = LOTS.find((l) => l.id === 'tatsumi')!;
  PARKED.push({ x: t.x + 3, y: WANGAN.tatsumi + 0.02, z: t.z + 4.6, heading: -south });
  HERO_SPOTS.push({ id: 'tatsumi', x: t.x + 7, y: WANGAN.tatsumi + 0.02, z: t.z + 4.6, heading: -south });
  PARKED.push({ x: t.x + 11, y: WANGAN.tatsumi + 0.02, z: t.z + 4.6, heading: -south });
  // the lookout at the top of the pass
  // (its bays face south-east, out over the pass)
  const yard = LOOKOUT_YARD, bay = 3.9 * S2;
  HERO_SPOTS.push({ id: 'lookout', x: yard.x, y: PASS.y1 + 0.02, z: yard.z, heading: Math.PI / 4 });
  PARKED.push({ x: yard.x - bay, y: PASS.y1 + 0.02, z: yard.z + bay, heading: Math.PI / 4 });
  PARKED.push({ x: yard.x + bay, y: PASS.y1 + 0.02, z: yard.z - bay, heading: Math.PI / 4 });
  // the tuner's garage, and the konbini's car park
  const g = LOTS.find((l) => l.id === 'garage')!;
  HERO_SPOTS.push({ id: 'garage', x: g.x + g.w / 2, y: 0.02, z: g.z + g.d + 5, heading: 0.5 });
  const c = LOTS.find((l) => l.id === 'konbini')!;
  HERO_SPOTS.push({ id: 'konbini', x: c.x + 6.5, y: 0.02, z: c.z + c.d + 4.5, heading: 0 });
  PARKED.push({ x: c.x + 2, y: 0.02, z: c.z + c.d + 4, heading: -south });
  // the used-car lot under the Wangan: two rows, nose out to the street
  for (let i = 0; i < 6; i++) {
    PARKED.push({ x: 67 + i * 3.8, y: 0.02, z: 17.5, heading: south });
    if (i > 0) PARKED.push({ x: 67 + i * 3.8, y: 0.02, z: 7.5, heading: south });
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

export const ORDINARY: Ordinary[] = [
  // Tokyo, round the scramble: the dark towers of the neon alleys
  o(74, -99, 18, 13, 40, 'neon'),
  o(63.5, -99, 9, 13, 28, 'pencil', 'SW'),
  o(76, -84, 16, 12, 54, 'neon', 'E'),
  o(63.5, -84, 11, 12, 34, 'pencil', 'W'),
  o(76, -70, 16, 15, 30, 'neon'),
  o(31.5, -64, 11.5, 9, 32, 'pencil', 'S'),
  // behind the station
  o(19.5, -45.5, 8, 9.5, 26, 'pencil', 'N'),
  o(28.5, -45.5, 8, 9.5, 34, 'neon', 'N'),
  o(37.5, -45.5, 7.5, 9.5, 22, 'pencil', 'N'),
  o(46, -45.5, 7, 9.5, 30, 'office', 'N'),
  // the yokocho by the river: two rows of tiny bars with a lane between them
  o(-19, -21, 7, 5, 6, 'shop', 'S'),
  o(-11.5, -21, 7, 5, 7, 'shop', 'S'),
  o(-4, -21, 7, 5, 6, 'shop', 'S'),
  o(-19, -12.5, 7, 5, 7, 'shop', 'N'),
  o(-11.5, -12.5, 7, 5, 6, 'shop', 'N'),
  o(-4, -12.5, 7, 5, 8, 'shop', 'NE'),
  o(-19, -4, 9, 9, 14, 'pencil', 'E'),
  o(-8, -4, 12, 9, 11, 'pencil', 'SE'),
  // Kyoto: Gion's townhouses, and inns along the river
  machiya(-58.5, 20, 7.5, 9, 7, 'W'),
  machiya(-58.5, 30.5, 7.5, 9, 6, 'W'),
  machiya(-49, 20, 7.5, 9, 6, 'E'),
  machiya(-49, 30.5, 7.5, 9, 7, 'E'),
  machiya(-48, 42, 6.5, 10, 6, 'E'),
  machiya(-58.5, 55, 7.5, 9.5, 7, 'W'),
  machiya(-49, 55, 7.5, 9.5, 6, 'ES'),
];
