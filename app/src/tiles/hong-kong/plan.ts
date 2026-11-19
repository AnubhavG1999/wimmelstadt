// The Hong Kong tile, as data. Nothing in this file draws anything.
//
// The tile is Victoria Harbour and both its shores, turned a quarter turn so
// that it is seen as from Kowloon: the harbour runs down the middle of the
// board from its north edge to its south edge, Hong Kong Island is the west
// half and Kowloon is the east half. Real north points to the board's east.
// Nothing is mirrored.
//
// On the Island the Peak stands in the middle of the west side. Its road
// climbs the south face, which the view first looks at, and Central's towers
// stand north of it, where they hide none of that. Mid-Levels steps down the
// north face behind them.
//
// Units: 1 unit is 1 cm of toy. A lane is 5 wide, a storey is 5 high and a car
// is about 7 long. x points east, z points south, y points up. Traffic keeps
// to the left.

import type { Seg } from '../../engine/paths';
import { TILE, type HeroSpot, type ParkedSpot, type Route, type TrafficType } from '../../engine/tile';
import { eased, fine, flat, joined, lane, lengths, raised, rounded, segsOf, through, turned, type P2 } from './geom';
import { carved, field, heightOn, smooth, type Bench, type Field } from './terrain';

export const BOARD = TILE;
/** A shape that reaches the edge of the board stops a hair short of it. */
const EDGE = 0.2;
const N = BOARD.z0 + EDGE, S = BOARD.z1 - EDGE;

/** A line through corners, rounded and with a point every unit or two. */
const line = (corners: P2[], r: number | number[], closed = false): P2[] => {
  const pts = rounded(corners, r, closed);
  if (!closed) return fine(pts);
  const all = fine([...pts, pts[0]]);
  all.pop();
  return all;
};

/** How far along a line `f` first changes sign, looking no earlier than `after`. */
function where(pts: P2[], f: (p: P2) => number, after = 0): number {
  const s = lengths(pts);
  for (let i = 1; i < pts.length; i++) {
    if (s[i] < after) continue;
    const a = f(pts[i - 1]), b = f(pts[i]);
    if (a < 0 !== b < 0) return s[i - 1] + ((s[i] - s[i - 1]) * a) / (a - b);
  }
  throw new Error('Hong Kong: a road never reaches the place its plan speaks of.');
}
/** For `where`: how far a point is past `x` or `z`, but only while it is on the given street. */
const pastX = (z: number, x: number, dir: 1 | -1) => (p: P2): number => (Math.abs(p[1] - z) < 0.01 ? (p[0] - x) * dir : -1);
const pastZ = (x: number, z: number, dir: 1 | -1) => (p: P2): number => (Math.abs(p[0] - x) < 0.01 ? (p[1] - z) * dir : -1);

// ---------------------------------------------------------------------------
// The harbour
// ---------------------------------------------------------------------------

/** The typhoon shelter: a bay in the Island's shore, which the viaduct crosses. Its south shore steps back at `step` to leave room for the car ferry's forecourt. */
export const SHELTER = { x0: -42, x1: -20, z0: 73, z1: 102, step: { x: -26, z: 98 } };
/** The reclaimed point the Convention Centre stands on, with the tunnel's mouth at its south end. */
export const POINT = { x0: -20, x1: -6, z0: 2, z1: 52 };

/** The Island's shore, from the north edge to the south: Central's reclaimed front, the Convention Centre's point, the typhoon shelter. */
const WEST_BANK: P2[] = [
  [-10, N], [-10, -58], [-20, -58], [-20, POINT.z0], [POINT.x1, POINT.z0], [POINT.x1, POINT.z1], [-20, POINT.z1],
  [-20, SHELTER.z0], [SHELTER.x0, SHELTER.z0], [SHELTER.x0, SHELTER.z1], [SHELTER.step.x, SHELTER.z1], [SHELTER.step.x, SHELTER.step.z], [-4, SHELTER.step.z], [-4, S],
];
/** Kowloon's shore, from the south edge to the north: Hung Hom's bay, and the tip of Tsim Sha Tsui. */
const EAST_BANK: P2[] = [
  [34, S], [34, 62], [22, 62], [22, -2], [10, -2], [10, -42], [22, -42], [22, N],
];
export const HARBOUR: P2[] = [...WEST_BANK, ...EAST_BANK];

// ---------------------------------------------------------------------------
// The Island's shore road, and the tram beside it
// ---------------------------------------------------------------------------

/** The road along the Island's shore: two lanes, with the tram's two tracks on its landward side, and lots behind those. */
export const SHORE = { nb: -32.5, sb: -27.5, tramN: -40, tramS: -37, lots0: -58.5, lots1: -44.5 };

// ---------------------------------------------------------------------------
// The Peak
// ---------------------------------------------------------------------------

/**
 * The Peak: the ground it covers, how high its top is, where its north face
 * begins to rise, and where the level ground of its summit lies.
 */
export const HILL = { x0: BOARD.x0, x1: -59.5, z0: BOARD.z0, z1: 56.6, top: 39, north: -102, summit: { z0: -40, z1: -15 }, tram: -70 };

/**
 * The Peak road. It starts at the car ferry's pier, climbs northwards on
 * stilts along the breakwater of the typhoon shelter, swings west as a flyover
 * over the shore road and the tram, and then climbs the south face of the hill
 * in five legs with a hairpin between each, to a turning place on the summit.
 */
export const PEAK = (() => {
  const half = 4.4, laneOff = 2.1, fly = 7.5;
  const corners: P2[] = [
    [-20, 100], [-20, 52], // north beside the water, then west
    [-99, 52], [-99, 37], // a hairpin
    [-64.5, 37], [-64.5, 22],
    [-99, 22], [-99, 7],
    [-64.5, 7], [-64.5, -8],
    [-93, -8], [-93, -21], // north onto the summit
  ];
  const mid = line(corners, [0, 7, 7.5, 7.5, 7.5, 7.5, 7.5, 7.5, 7.5, 7.5, 6, 0]);
  const total = lengths(mid)[mid.length - 1];
  const sFly = where(mid, (p) => 52.001 - p[1]);
  const sHill = where(mid, pastX(52, HILL.x1, -1), sFly);
  const sTop = where(mid, pastZ(-93, -14, -1), total - 30);
  const road = eased(raised(mid, through([[0, 0], [sFly, fly], [sHill, fly], [sTop, HILL.top], [total, HILL.top]])), 5);
  const up = lane(road, -laneOff), down = turned(lane(road, laneOff));
  // the turning place at the foot, on the car ferry's forecourt, and the one on the summit
  const foot = line([[-17.9, 100], [-8.5, 103], [-8.5, 110.5], [-22.1, 110.5], [-22.1, 100]], [0, 4.5, 4.5, 4.5, 0]);
  const summit = line([[-95.1, -21], [-98.5, -24.5], [-98.5, -33], [-87.5, -33], [-87.5, -24.5], [-90.9, -21]], [0, 3, 4.5, 4.5, 3, 0]);
  const loop = joined(flat(foot), up, flat(summit, HILL.top), down);
  return { half, laneOff, fly, z: 52, road, sFly, sHill, sTop, total, foot, summit, loop };
})();

/**
 * The Peak Tram: a straight incline up the north face, from Sheung Wan at the
 * foot to the Peak Tower on the summit, between the flats of Mid-Levels.
 */
export const FUNICULAR = (() => {
  const z0 = -110, z1 = -38, y0 = 0.5, y1 = HILL.top + 0.3;
  const y = (z: number): number => y0 + ((y1 - y0) * (z - z0)) / (z1 - z0);
  return { x: HILL.tram, z0, z1, y };
})();

/** The Peak as it would be with nothing cut into it: two faces and a level summit, a wall's height at its east edge, and a little unevenness. */
function peakNatural(x: number, z: number): number {
  const H = HILL.top, S = HILL.summit;
  let h = 0, rough = 1;
  if (z <= HILL.north) return 0;
  if (z < S.z0) h = (H * (z - HILL.north)) / (S.z0 - HILL.north); // the north face: Mid-Levels
  else if (z <= S.z1) { h = H; rough = 0; } // the summit
  else h = Math.min(H, 9.9 + ((52 - z) * (H - 9.9)) / (52 - S.z1)); // the south face, which the road climbs
  const east = 0.6 + 0.4 * smooth(HILL.x1, -64, x);
  const bumps = 1.4 * Math.sin(x * 0.23 + 1.7) * Math.cos(z * 0.19 - 0.6) + 0.7 * Math.sin((x - z) * 0.37);
  return h * east + bumps * rough * smooth(0, 8, h) * (1 - smooth(H - 6, H, h));
}

/** What is cut into the Peak: its road, as far as the summit, and the Peak Tram's line. */
const PEAK_CUTS: Bench[] = [
  ...PEAK.road.filter((q) => q[0] < HILL.x1 + 6 && q[1] < HILL.top - 0.1).map((q): Bench => ({ x: q[0], z: q[2], y: q[1], half: PEAK.half + 0.25 })),
  ...Array.from({ length: 49 }, (_, i): Bench => {
    const z = FUNICULAR.z0 + ((FUNICULAR.z1 - FUNICULAR.z0) * i) / 48;
    return { x: FUNICULAR.x, z, y: FUNICULAR.y(z) - 0.1, half: 1.9 };
  }),
];

/** The Peak's ground: sloping, with the road and the tram's line cut into it. */
export const PEAK_GROUND: Field = field(HILL.x0, HILL.z0, HILL.x1, HILL.z1, 2, (x, z) => carved(x, z, peakNatural(x, z), PEAK_CUTS));

/** Lion Rock: the ground it covers in Kowloon's north-east corner, and the mouths of the tunnel through it. */
export const LION = { x0: 76, z0: BOARD.z0, x1: BOARD.x1, z1: -84, gate: 5.4, half: 3.2, lane: 99.5, street: -103.5, ridge: -99 };
const LION_TUNNEL: P2[] = line([[LION.lane, LION.z1], [LION.lane, LION.street], [LION.x0, LION.street]], [0, 4, 0]);

/**
 * Lion Rock's ground: a dome, and along its top a ridge that runs east and
 * west, on which the lion lies. It is at least a tunnel's height wherever the
 * road runs under it.
 */
export const LION_GROUND: Field = field(LION.x0, LION.z0, LION.x1, LION.z1, 2, (x, z) => {
  const u = x - LION.x0, v = LION.z1 - z;
  let h = 15 * smooth(0, 11, u) * smooth(0, 10, v) + 9 * Math.exp(-((z - LION.ridge) ** 2) / 40) * smooth(1.5, 9, u);
  h += 1.0 * Math.sin(x * 0.5 + 0.4) * Math.cos(z * 0.43) * smooth(0, 6, h);
  if (LION_TUNNEL.some((q) => Math.hypot(q[0] - x, q[1] - z) < LION.half + 0.8)) h = Math.max(h, LION.gate + 1.3);
  return h;
});

/** How high the ground is at a place: on one of the two hills, or level everywhere else. */
export function groundAt(x: number, z: number): number {
  if (x <= HILL.x1 && z <= HILL.z1) return heightOn(PEAK_GROUND, x, z);
  if (x >= LION.x0 && z <= LION.z1) return heightOn(LION_GROUND, x, z);
  return 0;
}

// ---------------------------------------------------------------------------
// The harbour run
// ---------------------------------------------------------------------------

/**
 * The tunnel under the harbour. On the Island its mouth is at the water's
 * edge, on the Convention Centre's point, and faces north; on Kowloon it is
 * inland beside the Coliseum, and faces east. `ground` is where each ramp
 * reaches the ground, `mouth` where its roof begins, and `hoodEnd` where the
 * road is deep enough to be out of sight.
 */
export const TUNNEL = {
  east: 49.5, west: 54.5, deep: -6.5, grade: 0.27,
  island: { exit: -16.5, entry: -11.5, ground: 34.3, mouth: 38, hoodEnd: 46.9 },
  kowloon: { level: 33, ground: 57.07, mouth: 53.4, hoodEnd: 44.5 },
};

/**
 * The harbour run: one long road that ties the two shores together. On the
 * Island it runs the length of the shore: north to Central's ferry piers and
 * back by the water, into the tunnel on the Convention Centre's point, and
 * south from there on a viaduct on stilts across the typhoon shelter. On
 * Kowloon it comes up beside the Coliseum, goes along Nathan Road and round
 * the Peninsula.
 */
export const RUN = (() => {
  const T = TUNNEL, I = T.island, V = { z0: 60, z1: 84, z2: 94, y: 4.8, x1: -43.5 };
  const drop = -T.deep / T.grade; // how long a ramp is
  const island = line([
    [0, T.west], [I.exit, T.west], [I.exit, 27], [SHORE.sb, 27], // out of the tunnel, and round on to the shore road
    [SHORE.sb, 108], [-47.5, 108], [-47.5, 68], [SHORE.nb, 68], // south over the viaduct, and round the typhoon shelter
    [SHORE.nb, -101], [-13, -101], [-13, -87], [SHORE.sb, -87], // north the length of the shore, and round the piers
    [SHORE.sb, 22], [I.entry, 22], [I.entry, T.east], [0, T.east], // south by the water, and into the tunnel
  ], [0, 9, 4, 4, 8, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0]);
  const sI = lengths(island), endI = sI[sI.length - 1];
  const out = where(island, pastZ(I.exit, I.ground, -1));
  const v0 = where(island, pastZ(SHORE.sb, V.z0, 1), out), v1 = where(island, pastZ(SHORE.sb, V.z1, 1), out), v2 = where(island, pastZ(SHORE.sb, V.z2, 1), out);
  const v3 = where(island, pastX(108, V.x1, -1));
  const inn = where(island, pastZ(I.entry, I.ground, 1), v3);
  const islandRoad = eased(raised(island, through([
    [0, T.deep], [Math.max(0.1, out - drop), T.deep], [out, 0], [v0, 0], [v1, V.y], [v2, V.y], [v3, 0], [inn, 0], [inn + drop, T.deep], [endI, T.deep],
  ])), 3);

  const K = T.kowloon;
  const kowloon = line([
    [K.level, T.east], [61.5, T.east], [61.5, 4.5], // out of the tunnel and up Chatham Road
    [32.5, 4.5], [32.5, -44.5], [70.5, -44.5], [70.5, -10.5], // west along Nathan Road, and round the Peninsula
    [95.5, -10.5], [95.5, 4.5], // east along Nathan Road, and back
    [66.5, 4.5], [66.5, T.west], [K.level, T.west], // down Chatham Road and into the tunnel
  ], [0, 4, 4, 4, 4, 4, 4, 7.5, 7.5, 4, 4, 0]);
  const sK = lengths(kowloon), endK = sK[sK.length - 1];
  const upK = where(kowloon, pastX(T.east, K.ground, 1));
  const downK = where(kowloon, pastX(T.west, K.ground, -1), endK - 40);
  const kowloonRoad = eased(raised(kowloon, through([[0, T.deep], [upK, 0], [downK, 0], [endK, T.deep]])), 3);

  const tubeEast = flat(fine([[0, T.east], [K.level, T.east]]), T.deep);
  const tubeWest = flat(fine([[K.level, T.west], [0, T.west]]), T.deep);
  const loop = joined(islandRoad, tubeEast, kowloonRoad, tubeWest);
  // the viaduct, as a road of its own to build a deck along
  const viaduct = islandRoad.filter((_, i) => sI[i] >= v0 - 1 && sI[i] <= v3 + 1);
  return { loop, viaduct, V, islandRoad };
})();

// ---------------------------------------------------------------------------
// The other roads
// ---------------------------------------------------------------------------

const ring = (pts: P2[], r = 4): Seg[] => [{ t: 'ring', pts, y: 0, r }];

/** Kowloon's streets, each by the line down its middle. */
export const KOWLOON = {
  salisbury: 35, nathan: -3, chatham: 64, east: 99.5,
  /** The four lanes of Nathan Road: cars outside, buses inside. */
  lanes: { carEast: -10.5, busEast: -5.5, busWest: -0.5, carWest: 4.5 },
};

const TAXI = [0xc8322b, 0xc8322b, 0xc8322b, 0xb92a25];
const TOWN: TrafficType[] = ['sedan', 'sedan', 'hatch', 'hatch', 'van', 'pickup'];

export const ROUTES: Route[] = [
  { id: 'harbour-run', segs: segsOf(RUN.loop, true), speed: 20, count: 30, types: TOWN },
  { id: 'peak-road', segs: segsOf(PEAK.loop, true), speed: 13, count: 10, types: ['sedan', 'sedan', 'hatch'], paint: [...TAXI, 0xd9d4cc, 0x2e3440, 0x3f6fa3] },
  // round the Peninsula: red taxis, keeping to the kerb
  { id: 'peninsula', segs: ring([[37.5, -39.5], [37.5, -10.5], [65.5, -10.5], [65.5, -39.5]]), speed: 12, count: 4, types: ['sedan'], paint: TAXI },
  // the north of Kowloon, through the tunnel under Lion Rock
  { id: 'lion-rock', segs: ring([[37.5, -103.5], [37.5, -49.5], [KOWLOON.east, -49.5], [KOWLOON.east, -103.5]]), speed: 16, count: 7, types: TOWN },
  // the south-east of Kowloon: round Choi Hung and past the night market
  { id: 'choi-hung', segs: ring([[71.5, 27.5], [71.5, 96.5], [KOWLOON.east, 96.5], [KOWLOON.east, 27.5]]), speed: 14, count: 6, types: TOWN },
  // Salisbury Road, along the Avenue of Stars
  { id: 'salisbury', segs: ring([[32.5, 56], [32.5, 13], [37.5, 13], [37.5, 56]], 2.5), speed: 13, count: 3, types: ['sedan', 'sedan', 'hatch'], paint: [...TAXI, 0xd9d4cc, 0x5b6b7a] },
];

// ---------------------------------------------------------------------------
// Rails
// ---------------------------------------------------------------------------

export const RACECOURSE = { x0: -85.5, x1: -57.5, z0: 65.5, z1: 108 };

/**
 * The tram: two tracks the length of the Island beside the shore road, a
 * turning loop at Central's north end, and a loop round the racecourse at the
 * other, as the real line has at Happy Valley.
 */
export const TRAM: P2[] = line([
  [SHORE.tramN, 59], [SHORE.tramN, -104.5], [-47, -104.5], // north on the landward track
  [-50, -101.5], [-57.5, -101.5], [-57.5, -110.5], [-50, -110.5], [-47, -107.5], // the turning loop
  [SHORE.tramS, -107.5], [SHORE.tramS, 62], // south on the seaward track
  [-54, 62], [-54, 111.5], [-89, 111.5], [-89, 59], // and round the racecourse
], [5.5, 5.5, 2, 3, 4, 4, 3, 2, 8.5, 8.5, 4, 4, 4, 4], true);

/** The buses' two lanes down the middle of Nathan Road. */
/** Where the trams stop: a point on the rails for each. */
export const TRAM_STOPS: P2[] = [[SHORE.tramN, -68], [SHORE.tramS, -24], [SHORE.tramN, 26], [-54, 96]];

export const BUSES: P2[] = line([[46, KOWLOON.lanes.busEast], [86, KOWLOON.lanes.busEast], [86, KOWLOON.lanes.busWest], [46, KOWLOON.lanes.busWest]], 2.5, true);

// ---------------------------------------------------------------------------
// What stands where: the things that have names, each on a lot of its own
// ---------------------------------------------------------------------------

/** `y0` of -1 means: on the hill, wherever it stands, with its foot in the slope. */
export interface Lot { id: string; name: string; x0: number; z0: number; x1: number; z1: number; h: number; y0?: number; color: number; round?: boolean }

const lot = (id: string, name: string, x0: number, z0: number, x1: number, z1: number, h: number, color: number, more: Partial<Lot> = {}): Lot =>
  ({ id, name, x0, z0, x1, z1, h, color, ...more });

const GLASS = 0x8fb4cf, STEEL = 0xaab4bd, PINK = 0xe0b9b0;

export const LOTS: Lot[] = [
  // the Peak
  lot('peak-tower', 'PEAK TOWER', -78, -38, -64, -24, 15, 0xe9e6df, { y0: HILL.top }),
  lot('man-mo', 'MAN MO TEMPLE', -96, -111, -85, -103.5, 6, 0x6f9c7a),
  // Central
  lot('ifc', 'IFC', -58.5, -98, -44.5, -84, 125, GLASS),
  lot('hsbc', 'HSBC', -58.5, -80, -44.5, -66, 55, STEEL),
  lot('bank-of-china', 'BANK OF CHINA', -58.5, -62, -45.5, -49, 110, 0x7aa3c2),
  lot('central-plaza', 'CENTRAL PLAZA', -58.5, -46, -45, -33, 112, 0xd8c98a),
  lot('jardine', 'JARDINE HOUSE', -26.8, -98, -18.8, -90, 60, STEEL),
  lot('wheel', 'OBSERVATION WHEEL', -17.4, -83.6, -13, -60.4, 24, 0xf1ede2),
  lot('piers', 'FERRY PIERS', -9.5, -108, 0, -91, 5, 0xe9e6df),
  // Wan Chai and Causeway Bay
  lot('hkcec-old', 'CONVENTION CENTRE', -58.5, 4, -45, 16, 10, 0xe9e6df),
  lot('hkcec', 'CONVENTION CENTRE', -19, 3.5, -7.5, 18.5, 11, 0xe9e6df),
  lot('blue-house', 'BLUE HOUSE', -58.5, 20, -46, 30, 20, 0x5f8fc4),
  lot('monster', 'MONSTER BUILDING', -103, 66, -92, 111, 36, PINK),
  lot('noonday-gun', 'NOONDAY GUN', -44.8, 84, -42.4, 87, 2.5, 0x4a4f55),
  lot('car-ferry', 'CAR FERRY', -3.6, 101, 9.5, 110, 3, 0xe9e6df),
  // Tsim Sha Tsui
  lot('star-ferry', 'STAR FERRY', 2, -38, 10, -32, 4, 0x3f7f5a),
  lot('clock-tower', 'CLOCK TOWER', 17, -30, 21, -26, 30, 0xb5654a),
  lot('cultural-centre', 'CULTURAL CENTRE', 12, -23, 27, -12, 13, PINK),
  lot('space-museum', 'SPACE MUSEUM', 16.5, -10, 25.5, -3, 7, 0xf5f1e8, { round: true }),
  lot('peninsula', 'THE PENINSULA', 43, -35, 61, -16.3, 44, 0xf0e3c4),
  // Kowloon
  lot('icc', 'ICC', 43, -99, 57, -85, 145, 0x6f95b5),
  lot('m-plus', 'M+', 23, -79, 32.4, -62, 30, 0x2f3a36),
  lot('xiqu', 'XIQU CENTRE', 23, -57, 32.4, -47, 15, 0xb9c0c4),
  lot('whampoa', 'THE WHAMPOA', 43.5, 99.5, 58.5, 107, 10, 0xf2efe6),
  lot('wong-tai-sin', 'TEMPLE', 78, -80, 90, -67, 8, 0xc8523f),
  lot('bamboo', 'BAMBOO SCAFFOLDING', 86, 11, 94, 23, 27.2, 0x8aa07a),
  lot('coliseum', 'COLISEUM', 44, 66, 62, 84, 24, 0xcfc8b8),
  lot('choi-hung-a', 'CHOI HUNG ESTATE', 77, 34, 94, 42, 26, 0xf2c14e),
  lot('choi-hung-b', 'CHOI HUNG ESTATE', 77, 50, 84, 86, 22, 0xe9836b),
  lot('choi-hung-park', 'CAR PARK AND COURTS', 85.5, 56, 94, 90, 9, 0x8fb4cf),
  lot('night-market', 'TEMPLE STREET NIGHT MARKET', 60, 100.5, 102, 110.5, 4, 0xc8402a),
];

// ---------------------------------------------------------------------------
// Ordinary buildings: what stands between the things that have names
// ---------------------------------------------------------------------------

/**
 * What an ordinary building is like. A tong lau is an old tenement over
 * shops; a neon block is dark, trimmed with light and hung with signs; a
 * pencil is one of the slim towers of flats that Hong Kong is full of; an
 * estate is a slab of public housing.
 */
export type Style = 'tonglau' | 'neon' | 'pencil' | 'estate' | 'glass' | 'office' | 'house';
export type RoofKind = 'bare' | 'units' | 'tank' | 'helipad' | 'garden' | 'hip' | 'none';

/** An ordinary building. `y0` of -1 means: on the hill, with its foot in the slope. `faces` are the sides that have shops. */
export interface Ordinary {
  id: string; x0: number; z0: number; x1: number; z1: number; h: number; style: Style;
  roof?: RoofKind; faces?: string; y0?: number; crown?: { inset: number; h: number };
  /** A name near its top, on all four sides: the id of a sign. */
  sign?: string;
}

const ord = (id: string, x0: number, z0: number, x1: number, z1: number, h: number, style: Style, more: Partial<Ordinary> = {}): Ordinary =>
  ({ id, x0, z0, x1, z1, h, style, ...more });

/** Slim towers of flats on the north face of the Peak: `xs` are their west sides, `z` their north side. */
const flats = (id: string, xs: number[], z: number, h: number): Ordinary[] =>
  xs.map((x, i) => ord(`${id}-${i}`, x, z, x + 5, z + 4.6, h + ((i * 7 + Math.round(-z)) % 4) * 5, 'pencil', { y0: -1, roof: (i + Math.round(-z)) % 2 ? 'tank' : 'units' }));

/** Low houses on the south face, where anything taller would hide the road behind it. */
const houses = (id: string, xs: number[], z: number): Ordinary[] =>
  xs.map((x, i) => ord(`${id}-${i}`, x, z, x + 5, z + 4.6, 7 + ((i * 5 + Math.round(Math.abs(z))) % 3) * 2, 'house', { y0: -1, roof: 'hip' }));

/**
 * Every ordinary building. Their heights are chosen for the view the tile
 * opens with, from the south-south-east: what stands on the south side of a
 * street or in front of a landmark is low, so that the street or the landmark
 * shows over it.
 */
export const BUILDINGS: Ordinary[] = [
  // the south face of the Peak: on each step, backed by the wall of the next leg of the road, and clear of the hairpins
  ...houses('south-a', [-76, -70, -64.5], 42.6), ...houses('south-b', [-101.5, -95.5, -89.5], 27.6),
  ...houses('south-c', [-76, -70, -64.5], 12.6), ...houses('south-d', [-101.5, -95.5, -89.5], -2.4),
  // Mid-Levels, on the north face: row above row, west of the tram's cut. East of it the escalator climbs.
  ...flats('mid-1', [-102, -95, -88, -81], -97, 34), ...flats('mid-2', [-100, -93, -86, -79], -85, 38),
  ...flats('mid-3', [-102, -95, -88, -81], -73, 34), ...flats('mid-4', [-100, -93, -86, -79], -61, 30),
  ...flats('mid-5', [-102, -95, -88, -81], -49, 24),
  // on the summit, and in Sheung Wan at the foot of the north face
  ord('galleria', -84.6, -39.4, -79.6, -31.4, 6.5, 'office', { y0: HILL.top, roof: 'garden', faces: '' }),
  ord('sheung-wan-1', -103.5, -112, -97.6, -104.2, 13, 'tonglau', { faces: 'ES', roof: 'tank' }),
  ord('sheung-wan-2', -78.2, -112.4, -74, -106.4, 10, 'tonglau', { faces: 'E' }),
  // Admiralty and Wan Chai, behind the tram: low in front of the Peak
  ord('admiralty', -58.5, -31.5, -45, -25, 26, 'glass', { roof: 'units', sign: 'tarmac' }),
  ord('wan-chai-0', -58.5, -24.4, -45.5, -18.6, 17, 'tonglau', { faces: 'E', roof: 'tank' }),
  ord('wan-chai-1', -58.5, -17, -46, -11.9, 22, 'neon', { faces: 'E' }),
  ord('wan-chai-1b', -58.5, -11.3, -46, -6, 17, 'tonglau', { faces: 'E', roof: 'units' }),
  ord('wan-chai-2', -58.5, -3, -46, 2, 16, 'tonglau', { faces: 'E', roof: 'tank' }),
  ord('wan-chai-3', -58.5, 33, -52.4, 45, 20, 'estate', { roof: 'tank' }),
  ord('wan-chai-3b', -51.8, 33, -46, 38.8, 13, 'tonglau', { faces: 'E' }),
  ord('wan-chai-3c', -51.8, 39.3, -46, 45, 15, 'neon', { faces: 'E' }),
  // West Kowloon: a mall, with towers of flats standing on it round the foot of ICC
  ord('elements', 43, -84, 60, -67.5, 6, 'glass', { roof: 'garden', faces: 'SE' }),
  ord('union-1', 44, -83, 51, -76.5, 58, 'pencil', { y0: 6, roof: 'units', crown: { inset: 1, h: 4 } }),
  ord('union-2', 52.5, -83, 59.5, -76.5, 50, 'pencil', { y0: 6, roof: 'tank' }),
  ord('union-3', 44, -75, 51, -68.5, 44, 'glass', { y0: 6, roof: 'helipad' }),
  ord('west-kowloon', 61, -99, 73, -88, 48, 'pencil', { roof: 'units', crown: { inset: 1.2, h: 5 } }),
  ord('yau-ma-tei', 61, -82, 74, -70, 30, 'office', { faces: 'SE', roof: 'tank', sign: 'tiny' }),
  // Mong Kok: a row of shops under signs, which faces south on to the street
  ord('mk-1', 43, -66, 48.4, -55, 18, 'neon', { faces: 'SW' }),
  ord('mk-2', 48.8, -66, 54, -55, 13, 'tonglau', { faces: 'S', roof: 'tank' }),
  ord('mk-3', 54.4, -66, 59.6, -55, 22, 'neon', { faces: 'S' }),
  ord('mk-4', 60, -66, 64.6, -55, 12, 'tonglau', { faces: 'S' }),
  ord('mk-5', 65, -66, 69.4, -55, 20, 'neon', { faces: 'S' }),
  ord('mk-6', 69.8, -66, 74, -55, 15, 'tonglau', { faces: 'SE', roof: 'tank' }),
  ord('wts-arcade', 76.5, -63.5, 94, -58, 5.5, 'tonglau', { faces: 'S', roof: 'bare' }),
  // Nathan Road: the north side is tall and bright, and the south side is low, so that the road can be seen
  ord('nathan-n1', 76, -34, 80.7, -17, 24, 'neon', { faces: 'SW' }),
  ord('nathan-n2', 81.1, -34, 85.6, -17, 18, 'neon', { faces: 'S' }),
  ord('nathan-n3', 86, -34, 91, -17, 26, 'neon', { faces: 'SE' }),
  ord('jordan-1', 76, -44.6, 84, -36.4, 14, 'tonglau', { faces: 'N', roof: 'tank' }),
  ord('jordan-2', 85.6, -44.6, 94, -36.4, 16, 'estate', { roof: 'units' }),
  ord('nathan-s1', 77, 11, 80.8, 23, 11, 'neon', { faces: 'N' }),
  ord('nathan-s2', 81.2, 11, 85.4, 23, 9, 'tonglau', { faces: 'N', roof: 'tank' }),
  ord('tst-1', 43, 11, 47.6, 24, 12, 'neon', { faces: 'NW' }),
  ord('tst-2', 48, 11, 52, 24, 9, 'tonglau', { faces: 'N', roof: 'tank' }),
  ord('tst-3', 52.4, 11, 56, 24, 12, 'neon', { faces: 'NE' }),
  // Tsim Sha Tsui East is low, as it had to be under the old flight path, and here so that the waterfront shows past it
  ord('tst-east-1', 43, 28, 49.2, 42, 16, 'office', { roof: 'garden', faces: 'W' }),
  ord('tst-east-2', 49.8, 28, 56, 42, 18, 'glass', { roof: 'units', sign: 'minigt' }),
  ord('harbour-mall', 21.6, -41.4, 27.6, -32, 8, 'office', { faces: 'SE', roof: 'units' }),
];

// ---------------------------------------------------------------------------
// Where a hero may stand on show, and where plain vehicles are parked
// ---------------------------------------------------------------------------

export const HERO_SPOTS: HeroSpot[] = [
  { id: 'peak-lookout', x: -68, y: HILL.top + 0.04, z: -21, heading: 0 },
  { id: 'peninsula', x: 46.6, y: 0.06, z: -19.4, heading: 0 },
  { id: 'car-ferry', x: 3.6, y: 0.94, z: 106.4, heading: 0 },
  { id: 'choi-hung', x: 89.75, y: 9.06, z: 84.4, heading: Math.PI / 2 },
];

/** Plain vehicles that stand parked: on the summit, in the queue for the car ferry, and here and there in Kowloon. */
export const PARKED: ParkedSpot[] = [
  { x: -83.3, y: HILL.top + 0.04, z: -26.4, heading: Math.PI / 2 }, { x: -80.2, y: HILL.top + 0.04, z: -26.4, heading: -Math.PI / 2 },
  { x: -15.4, y: 0.04, z: 105.3, heading: 0 },
  { x: -76.4, y: 0.04, z: -103.9, heading: 0 },
  { x: 13, y: 0.04, z: -36.2, heading: Math.PI / 2 },
  { x: 88.6, y: 0.04, z: 46.6, heading: 0 }, { x: 88.6, y: 0.04, z: 51.2, heading: Math.PI },
  { x: 48.4, y: 0.04, z: 93.2, heading: 0 }, { x: 56.6, y: 0.04, z: 93.2, heading: Math.PI },
  { x: 59, y: 0.04, z: -92, heading: Math.PI / 2 },
];
