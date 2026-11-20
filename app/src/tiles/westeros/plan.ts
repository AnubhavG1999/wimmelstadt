// The Westeros tile, as data. Nothing in this file draws anything.
//
// The tile is the whole continent squeezed onto one board: the Wall across the
// north edge, the kingsroad down the middle from the Wall to Storm's End, the
// sea down both sides and open water in the south-east corner. North is the
// board's north. What is tall stands in the north and the west of what it
// belongs to, because the view the tile opens with looks from the
// south-south-east and a thing hides what is north-north-west of it.
//
// Units: 1 unit is 1 cm of toy. A storey is 5 high and a car is about 7 long.
// A lane of these roads is 4 wide. x points east, z points south, y points up.
// Traffic keeps to the left.

import { TILE } from '../../engine/tile';

export type P2 = [number, number];
export type P3 = [number, number, number];

export const BOARD = TILE;
/** A shape that reaches the edge of the board stops a hair short of it. */
export const EDGE = 0.2;
const XW = BOARD.x0 + EDGE, XE = BOARD.x1 - EDGE, ZN = BOARD.z0 + EDGE, ZS = BOARD.z1 - EDGE;

// ---------------------------------------------------------------------------
// The coast
// ---------------------------------------------------------------------------

/**
 * Where the land ends to the west, from the north edge to the south, as
 * [x, z] corners. North of the Wall's west end the land runs off the board.
 */
export const COAST_WEST: P2[] = [
  // the shore steps north at x -21.5: the western castle of the Twins stands on that ground
  [XW, ZN], [XW, -84], [-82, -80], [-78, -62], [-66, -48], [-44, -42.5], [-14, -42.5], [-14, -37.4], [-21.5, -37.4], [-40, -33], [-64, -28], [-78, -22], [-78, 0],
  [-72, 8], [-72, 34], [-86, 36], [-86, 46], [-80, 50], [-78, 66], [-70, 80], [-64, 86], [-64, ZS],
];
/** Where the land ends to the east, from the north edge to the south. At the Vale it runs off the board. */
export const COAST_EAST: P2[] = [
  [90, ZN], [90, -70], [88, -58], [80, -56], [60, -49], [42, -44], [42, -37.5], [XE, -37.5], [XE, 0.5],
  // the Trident's mouth: the bay's corner is cut back to a funnel, and the river ends square on its far side
  [79.5, 1.8], [76.87, 0.42], [74.81, 3.24], [76, 5.2],
  [76, 56], [62, 56], [62, 59], [44, 59], [44, 56], [16, 56], [16, 63], [76, 63], [76, 98], [56, 100], [56, ZS],
];

/** The Neck: the narrow land between two seas, which is bog. */
export const NECK = { x0: -14, x1: 42, z0: -44, z1: -37.5 };

/** The land north of the Neck, which lies under snow: down the east coast and back up the west. */
export const LAND_NORTH: P2[] = [...COAST_EAST.slice(0, 6), [NECK.x0, NECK.z0], ...COAST_WEST.slice(0, 7).reverse()];
/** The Neck's own ground. */
export const LAND_NECK: P2[] = [[NECK.x1, NECK.z0], [NECK.x1, NECK.z1], [NECK.x0, NECK.z1], [NECK.x0, NECK.z0]];
/** The land south of the Neck, which is green. */
export const LAND_SOUTH: P2[] = [[NECK.x0, NECK.z1], [NECK.x1, NECK.z1], ...COAST_EAST.slice(7), ...COAST_WEST.slice(7).reverse()];

/** Dorne's sand, in the middle of the south edge. */
export const DORNE: P2[] = [[2, 88], [76, 86], [76, 98], [56, 100], [56, ZS], [-16, ZS], [-8, 98]];

/** The Sunset Sea, down the whole west side. */
export const SEA_WEST: P2[] = [...COAST_WEST.slice(1), [XW, ZS]];
/** The Shivering Sea and the Bite, in the north-east. */
export const SEA_NORTH_EAST: P2[] = [...COAST_EAST.slice(0, 8), [XE, ZN]];
/** Blackwater Bay, the river's mouth under King's Landing, and the open sea of the south-east corner. */
export const SEA_SOUTH_EAST: P2[] = [...COAST_EAST.slice(8), [XE, ZS]];

/** The Gods Eye. */
export const GODS_EYE = { x: -52, z: 23, rx: 11, rz: 16 };

/** How far below the ground the water lies. */
export const WATER_LEVEL = -0.9;

/** Whether a place lies inside an outline. */
export function inside(shape: P2[], x: number, z: number): boolean {
  let hit = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const a = shape[i], b = shape[j];
    if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

/** Whether a place is open water: one of the seas, or the lake. An island in the sea is not. */
export function isWater(x: number, z: number): boolean {
  if (((x - GODS_EYE.x) / GODS_EYE.rx) ** 2 + ((z - GODS_EYE.z) / GODS_EYE.rz) ** 2 < 1) return true;
  for (const i of Object.values(ISLANDS)) if (((x - i.x) / i.rx) ** 2 + ((z - i.z) / i.rz) ** 2 < 1) return false;
  return inside(SEA_WEST, x, z) || inside(SEA_SOUTH_EAST, x, z) || inside(SEA_NORTH_EAST, x, z);
}

/** How high the ground is at a place: the water's level where there is water. Hills are added as they are built. */
export function groundAt(x: number, z: number): number {
  return isWater(x, z) ? WATER_LEVEL : 0;
}

// ---------------------------------------------------------------------------
// What stands where: every lot as a rectangle with a height
// ---------------------------------------------------------------------------

/** One thing that stands on the tile: the ground it covers and how high its top is. */
export interface Lot {
  id: string;
  /** What it is called, for the board on its box while it is only a box. */
  name: string;
  x0: number; z0: number; x1: number; z1: number;
  /** How high its top stands above the ground of the tile. */
  top: number;
  /** A part of something else: it is not blocked out as a box of its own. */
  part?: boolean;
}

const lot = (id: string, name: string, x0: number, z0: number, x1: number, z1: number, top: number, part = false): Lot => ({ id, name, x0, z0, x1, z1, top, part });

/** The Wall: its foot to the south, its top's two edges, and its foot to the north. */
export const WALL = { x0: BOARD.x0, x1: 80, south: -89, topSouth: -92, topNorth: -97, north: -99, top: 42, gateX: 10 };

/** Winterfell: the outer wall, the inner wall, and the ward, which is raised. */
export const WINTERFELL = {
  outer: { x0: -40, z0: -76, x1: 8, z1: -44, top: 8 },
  inner: { x0: -34, z0: -70, x1: 2, z1: -50, top: 11 },
  wall: 1.5,
  ward: 6,
};

/** King's Landing: its walls, and the three hills inside them. */
export const KINGS_LANDING = {
  walls: { x0: 16, z0: 8, x1: 64, z1: 46, top: 9, river: 7 },
  /** The quay road runs outside the east wall and the south wall. */
  quayX: 70, quayZ: 50.5,
  visenya: { x: 25, z: 30, r: 10, y: 6 },
  aegon: { x: 47, z: 38, r: 13, y: 8 },
  rhaenys: { x: 57, z: 17, r: 10, y: 4 },
};

export const LOTS: Lot[] = [
  // --- the north edge ---
  lot('frostfangs-1', 'Frostfangs', -104, -113, -86, -101, 54),
  lot('frostfangs-2', 'Frostfangs', -86, -113, -70, -103, 44, true),
  lot('wall', 'The Wall', WALL.x0, WALL.north, WALL.x1, WALL.south, WALL.top),
  lot('shadow-tower', 'Shadow Tower', -97, -88, -92, -83, 20),
  lot('eastwatch', 'Eastwatch', 78, -97, 84, -91, 12),
  // --- Castle Black ---
  lot('cb-lance', 'Tower of the Lance', -4, -88.5, -1, -85.5, 15),
  lot('cb-commander', "Lord Commander's Tower", 0, -85, 4, -81, 12),
  lot('cb-hardin', "Hardin's Tower", 1, -80, 5, -76.5, 10),
  lot('cb-shieldhall', 'Shieldhall', -14, -87, -5, -81, 7),
  lot('cb-king', "King's Tower", 21, -86, 25, -82, 13),
  lot('cb-hall', 'Common hall', 27, -88, 37, -83, 7),
  lot('cb-armoury', 'Armoury', 28, -81, 34, -77, 5),
  lot('cb-rookery', 'Rookery', 38, -87, 42, -83, 9),
  lot('queenscrown', 'Queenscrown', -58, -84, -54, -80, 9),
  lot('moles-town', "Mole's Town", 24, -78, 34, -72, 2.5),
  // --- Winterfell: outer wall 8, inner 11, the ward a platform at 6 ---
  lot('wf-outer-n', 'Winterfell', -40, -76, 8, -74.5, 8, true), lot('wf-outer-s', '', -40, -45.5, 8, -44, 8, true),
  lot('wf-outer-w', '', -40, -76, -38.5, -44, 8, true), lot('wf-outer-e', '', 6.5, -76, 8, -44, 8, true),
  lot('wf-inner-n', '', -34, -70, 2, -68.5, 11, true), lot('wf-inner-s', '', -34, -51.5, 2, -50, 11, true),
  lot('wf-inner-w', '', -34, -70, -32.5, -50, 11, true), lot('wf-inner-e', '', 0.5, -70, 2, -50, 11, true),
  lot('wf-ward', 'Winterfell', -32.5, -68.5, 0.5, -51.5, 6, true),
  lot('wf-keep', 'Great Keep', -19, -68, -10, -62, 26),
  lot('wf-hall', 'Great Hall', -9, -68, 0.5, -63, 15),
  lot('wf-broken', 'Broken tower', -33, -68.5, -28.5, -64, 27),
  lot('wf-first-keep', 'First Keep', -27, -68, -21, -62, 15),
  lot('wf-bell', 'Bell tower', -9, -62.5, -6, -59.5, 21),
  lot('wf-glass', 'Glass gardens', -18, -59.5, -8, -56, 9.5),
  lot('wf-gatehouse', "King's Gate", 5, -63, 9, -57, 13),
  lot('wt-houses', 'Winter Town', 24, -64, 40, -54, 7),
  lot('wt-inn', 'Inn', 24, -53, 31, -48, 8),
  lot('white-harbor', 'White Harbor', 72, -70, 88, -58, 12),
  lot('bear-island', 'Bear Island', -99, -71, -89, -61, 8),
  lot('deepwood', 'Deepwood Motte', -68, -60, -62, -54, 9),
  // --- the Neck: the causeway runs at x 21 ---
  lot('mc-children', "Children's Tower", 9, -47, 12.5, -43.5, 18),
  // the gatehouse: the road is 8 wide at x 21, its arch 9, and a tower 2 wide to each side of that
  lot('mc-gate', 'Gatehouse Tower', 14.5, -42, 27.5, -37.5, 9),
  lot('mc-drunkard', "Drunkard's Tower", 8, -38, 12, -34, 14),
  lot('crannogs', 'Crannogs', 28, -42, 36, -36, 4),
  // --- the Twins: the road at z -26. The two castles mirror each other about the Green Fork at x -7:
  // a gatehouse on the road, 6 to each side of its middle, and a keep behind it to the north. ---
  lot('tw-east-keep', 'The Twins', -2, -37.4, 6, -32, 20),
  lot('tw-east-gate', '', 4, -32, 14, -20, 9, true),
  lot('tw-water', 'Water Tower', -10, -32, -4, -20, 17),
  lot('tw-west-keep', 'The Twins', -20, -37.4, -12, -32, 20),
  lot('tw-west-gate', '', -28, -32, -18, -20, 9, true),
  // --- the crossroads at (40, -15), Riverrun, the Vale ---
  lot('inn', 'Inn at the Crossroads', 44, -28, 54, -21, 11),
  lot('inn-stable', 'Stable', 55, -27, 60, -22, 6),
  lot('riverrun', 'Riverrun', -70, -22, -54, -8, 16),
  lot('vale-north', '', 64, -38, 104, -32, 10, true),
  lot('vale-body', "Giant's Lance", 68, -32, 104, -18, 24, true),
  lot('vale-high', '', 76, -32, 98, -20, 38, true),
  lot('vale-summit', "Giant's Lance", 82, -30, 92, -22, 52),
  lot('vale-south', '', 82, -18, 104, -6, 14, true),
  lot('eyrie', 'The Eyrie', 76, -27, 82, -21, 47),
  // the Bloody Gate: the high road is 8 wide at z -13, its arch 9, and a pier to each side of that; the tower stands north of the north pier
  lot('bloody-gate-n', 'Bloody Gate', 63, -22, 67, -19, 11),
  lot('bloody-gate-arch', '', 63, -19, 67, -7.5, 8, true),
  lot('gates-moon', 'Gates of the Moon', 72, -19.5, 80, -15, 12),
  // --- Harrenhal, on the Gods Eye's east shore ---
  lot('hh-wall-n', 'Harrenhal', -38, 4, 2, 6, 11, true), lot('hh-wall-s', '', -38, 28, 2, 30, 11, true),
  lot('hh-wall-w', '', -38, 4, -36, 30, 11, true), lot('hh-wall-e', '', 0, 4, 2, 30, 11, true),
  lot('hh-kingspyre', 'Kingspyre', -22, 19, -13, 28, 32),
  lot('hh-t2', 'Harrenhal', -36, 20, -28, 28, 27),
  lot('hh-t3', 'Harrenhal', -10, 20, -2, 28, 28),
  lot('hh-t4', 'Harrenhal', -30, 10, -23, 17, 25),
  lot('hh-t5', 'Harrenhal', -9, 9, -2, 16, 24),
  // --- the tourney ground, between Harrenhal and the goldroad ---
  lot('tourney-stand', 'Royal stand', -10, 33, 10, 36, 6),
  lot('tourney-tents', 'Pavilions', -12, 43, 12, 45.5, 4),
  // --- King's Landing: the kingsroad runs along its quays, outside the wall ---
  lot('kl-wall-n', "King's Landing", 16, 8, 64, 9.5, 9, true), lot('kl-wall-w', '', 16, 8, 17.5, 46, 9, true),
  lot('kl-wall-s', '', 16, 44.5, 64, 46, 7, true), lot('kl-wall-e', '', 62.5, 8, 64, 46, 9, true),
  lot('sept', 'Great Sept of Baelor', 19, 24, 31, 36, 36),
  lot('rk-walls', 'Red Keep', 38, 30, 56, 46, 16),
  lot('rk-maegor', "Maegor's Holdfast", 44, 35, 51, 42, 29),
  lot('rk-tower-nw', '', 38, 30, 41, 33, 25, true), lot('rk-tower-ne', '', 53, 30, 56, 33, 25, true),
  lot('rk-tower-sw', '', 38, 43, 41, 46, 25, true), lot('rk-tower-se', '', 53, 43, 56, 46, 25, true),
  lot('rk-tall', '', 52, 39, 55, 42, 31, true),
  lot('dragonpit', 'Dragonpit', 50, 10, 64, 24, 22),
  lot('kl-houses-w', 'Houses', 18, 10, 30, 22, 8),
  lot('kl-houses-mid', 'Houses', 33, 12, 46, 27, 7),
  lot('kl-dragon-gate', 'Dragon Gate', 65, 6, 75, 10, 12),
  lot('kl-lion-gate', 'Lion Gate', 11, 45.5, 15, 55.5, 11),
  lot('kl-river-gate', 'River Gate', 35, 56, 45, 59, 11),
  // --- the south ---
  // Storm's End stands on a headland 3.2 high: its wall is low to the sea and tall to the land
  lot('se-wall', "Storm's End", 52, 78, 72, 98, 13.2, true),
  lot('se-drum', "Storm's End", 58, 84, 66, 92, 25.2),
  lot('sun-wall-1', 'Sunspear', 23, 86.5, 52, 87.5, 6, true), lot('sun-wall-2', '', 23, 92.5, 52, 93.5, 5, true), lot('sun-wall-3', '', 23, 98.5, 52, 99.5, 5, true),
  lot('sun-tower', 'Tower of the Sun', 22, 102, 30, 110, 14),
  lot('sun-spear', 'Spear Tower', 29, 99.8, 31.5, 102.3, 20),
  lot('hg-outer', 'Highgarden', -50, 60, -18, 92, 8, true), lot('hg-mid', '', -45, 65, -23, 87, 12, true),
  lot('hg-inner', '', -41, 69, -27, 83, 17, true), lot('hg-towers', 'Highgarden', -38, 72, -30, 80, 24),
  // the Hightower is stepped: a black base, and three tiers that narrow
  lot('hightower-base', '', -82, 88, -74, 96, 10, true), lot('hightower-1', '', -81, 89, -75, 95, 24, true), lot('hightower-2', '', -80.5, 89.5, -75.5, 94.5, 38, true),
  lot('hightower', 'The Hightower', -80, 90, -76, 94, 48),
  // Oldtown: a row of houses on the harbour, and the Citadel and the Starry Sept on the south shore
  lot('oldtown', 'Oldtown', -64, 88, -60.5, 96, 8),
  lot('citadel', 'Citadel', -62, 107.5, -52, 112.5, 13),
  lot('starry-sept', 'Starry Sept', -50, 107.5, -43, 112.5, 12),
  // --- the west and the east ---
  lot('casterly-rock-n', '', -88, 8, -74, 18, 20, true),
  lot('casterly-rock', 'Casterly Rock', -90, 16, -72, 34, 34),
  lot('lannisport', 'Lannisport', -86, 36, -72, 46, 7),
  lot('pyke', 'Pyke', -98, -34, -84, -18, 18),
  lot('ds-castle', 'Dragonstone', 88, 30, 96, 38, 20),
  lot('dragonmont', 'Dragonmont', 90, 12, 104, 28, 30),
];

/**
 * The Dragonmont's summit. It is a volcano: a cone with a crater, whose rim is
 * highest at the back, to the north-north-west, and lowest at the front, so
 * that the view the tile opens with looks into it. Drogon lands on the back
 * rim and stands there facing that view, the crater before him. His stance
 * is measured in his own frame: `facing` is forward, and across is to his left.
 */
export const DRAGONMONT = {
  /** Where he stands, at the height of the lot's top: the middle of his stance. */
  perch: [95.2, 20.3] as P2,
  /** Which way he faces: 30 degrees east of south. */
  facing: [0.5, 0.866] as P2,
  /** The level ground under him: from so far behind him to so far before, and so far to each side. */
  table: { back: 2.7, front: 0.9, half: 2.05 },
  /** The crater: its middle, how far out its bowl and its rim reach, how high its rim is at the front, and its floor. */
  crater: { x: 96.75, z: 22.98, bowl: 2.0, rim: 2.7, front: 25, floor: 23.5 },
};

/** A lot, by its name in the plan. */
export const lotOf = (id: string): Lot => {
  const found = LOTS.find((l) => l.id === id);
  if (!found) throw new Error(`Westeros: the plan has no lot called ${id}.`);
  return found;
};

// ---------------------------------------------------------------------------
// The dragons
// ---------------------------------------------------------------------------

/** A place the leader passes on its circuit: where, how high, and how fast it flies there. */
export type Waypoint = [x: number, y: number, z: number, speed: number];

/**
 * The display circuit, as the leader flies it: the run-in over the south-east
 * sea, the low pass up the east edge, the vertical over the mouth of the bay,
 * north up the kingsroad, once round Winterfell, west along the Wall, south
 * down the west coast, round the Hightower and east along the south shore.
 */
export const CIRCUIT: Waypoint[] = [
  // the run-in: east over Dorne's shore, down to the sea, and round to the north
  [30, 36, 108, 30], [56, 34, 110, 30], [82, 30, 111, 34], [95, 23, 103, 40],
  // the low fast pass, north along the east edge
  [98, 22, 88, 45], [98, 22, 72, 45], [97, 23, 59, 44],
  // the pull-up, the vertical, the top
  [94.5, 42, 51, 36], [92, 78, 48, 24], [90.5, 106, 47, 12], [87, 110, 45, 10],
  // off the top, west-north-west over the bay and the city's north end
  [79, 98, 39, 26], [70, 72, 27, 44], [58, 57, 11, 42], [42, 55, -3, 34],
  // north up the kingsroad
  [29, 55, -15, 30], [23, 55, -30, 30], [19, 56, -44, 30],
  // once round Winterfell, the other way to the clock
  [12, 57, -58, 30], [4, 57, -73, 30], [-16, 57, -79, 30], [-36, 57, -73, 30], [-46, 57, -58, 30], [-36, 57, -42, 30], [-16, 57, -36, 30], [4, 56, -42, 30],
  // north-east to the Wall's east end, and round to the west
  [30, 52, -55, 30], [56, 45, -62, 32], [74, 39, -64, 34], [84, 37, -69, 34], [79, 37, -75, 36],
  // along the Wall, below its top
  [50, 37, -76, 38], [10, 37, -76, 38], [-30, 37, -76, 38], [-64, 37, -76, 38],
  // left at the Shadow Tower, south down the west coast
  [-82, 42, -71, 32], [-90, 48, -57, 30], [-91, 50, -40, 30], [-92, 50, -20, 30], [-90, 50, 0, 30], [-88, 50, 20, 30], [-87, 48, 40, 30], [-92, 44, 62, 30],
  // round the Hightower, once and a quarter
  [-97, 41, 78, 30], [-98, 40, 92, 30], [-91, 40, 105, 30], [-78, 40, 110, 30], [-65, 40, 105, 30], [-58, 40, 92, 30], [-65, 40, 79, 30], [-78, 40, 73, 30], [-91, 40, 79, 30],
  [-98, 40, 92, 30], [-91, 40, 105, 30], [-78, 40, 110, 30],
  // east along the south shore
  [-50, 40, 109, 30], [-20, 40, 108, 30], [6, 38, 107, 30],
];

// ---------------------------------------------------------------------------
// Roads
// ---------------------------------------------------------------------------
//
// One spine with branches. The kingsroad runs from beyond the Wall to the fork
// before Storm's End, and every other road leaves it or one of its branches.
// A road is two lanes, one each way, and traffic keeps left. Where roads meet,
// each lane turns left round its own corner, so no lane crosses another: see
// roads.ts for how the lanes are drawn from these lines.

/** How wide one lane is, and so half of how wide a road is. */
export const LANE = 4;

/**
 * The fork before Storm's End, where four roads meet: the kingsroad from the
 * north, the road up to the castle's gate, the road to Sunspear and the
 * roseroad. It lies on the line of that climb, 28 from the middle of the
 * castle: far enough out that a lane coming down has left the ramp, which
 * begins 22.2 from the middle, before it turns.
 */
const FORK: P2 = [38.6, 72.6];

/** The middle of each road, corner by corner. */
export const ROADS = {
  /** From the Wall's north foot, through the gate in the ice at x 10, to the fork before Storm's End. */
  kingsroad: [[10, -99], [10, -82], [16, -74], [16, -47], [21, -44], [21, -32], [22, -26], [40, -15], [41.5, -8.5], [44, -0.5], [70, 3], [70, 50.5], [40, 50.5], [40, 66], FORK],
  /** East from the crossroads, through the Bloody Gate, to the yard before the Gates of the Moon. */
  high: [[40, -15], [52, -13], [67.5, -13]],
  /** West from the crossroads along the Trident, over the Red Fork below Riverrun, and south between the Gods Eye and Casterly Rock. */
  river: [[40, -15], [34, -13], [20, -14], [-46, -14], [-49, -5], [-62, 3], [-67.5, 9], [-67.5, 50.5]],
  /** West from the kingsroad over the Twins' bridge, and down to the river road. */
  twins: [[22, -26], [-28, -26], [-44, -22], [-46, -14]],
  /** From the west coast east past the tourney ground, through the Lion Gate, to the Blackwater bridge. */
  gold: [[-67.5, 50.5], [40, 50.5]],
  /** Down the west coast to Oldtown. */
  ocean: [[-67.5, 50.5], [-67.5, 64], [-60, 80], [-56, 88], [-56, 103]],
  /** From the fork before Storm's End south-west past Highgarden to Oldtown. */
  rose: [FORK, [24, 80], [0, 94], [-20, 100], [-30, 103], [-56, 103]],
  /** From Oldtown over the bridge to Battle Isle. */
  isle: [[-56, 103], [-63, 103], [-69, 100.2]],
  /** From the fork through Sunspear's three gates, one behind another on a straight road. */
  sunspear: [FORK, [38.5, 85], [38, 98]],
} satisfies Record<string, P2[]>;

/**
 * Where a road ends and turns back on itself: the middle of the ring it turns
 * in, and how far out the middle of that ring's one lane is. Traffic goes
 * round with the clock, as it does round a roundabout where it keeps left.
 */
export const TURNS = {
  /** Round the weirwood in the clearing beyond the Wall. */
  wall: { c: [10, -106.2] as P2, r: 4.2 },
  /** The yard before the Gates of the Moon: clear of the castle to its north, and of the Trident, which runs between it and the kingsroad's bend. */
  moon: { c: [76.2, -8.5] as P2, r: 3.8 },
  /** Round Storm's End's drum tower, inside its wall. */
  drum: { c: [62, 88] as P2, r: 6.75 },
  /** The court inside Sunspear's third gate. */
  sun: { c: [38, 106.5] as P2, r: 3.8 },
  /** Round the Hightower, on Battle Isle. */
  tower: { c: [-78, 92] as P2, r: 8.25 },
};

/** Storm's End stands on a headland: its bailey is this high, out to the outside of its wall, and the road climbs to it from the fork. */
export const STORMS_END = { x: 62, z: 88, wall: 11, y: 3.2, foot: 22.2 };

/** How high a road is at a place. Every road lies on the ground but the climb to Storm's End and the ring round its drum. */
export function roadY(x: number, z: number): number {
  const d = Math.hypot(x - STORMS_END.x, z - STORMS_END.z);
  if (d >= STORMS_END.foot) return 0;
  return d <= STORMS_END.wall ? STORMS_END.y : (STORMS_END.y * (STORMS_END.foot - d)) / (STORMS_END.foot - STORMS_END.wall);
}

/**
 * Where a road passes through something built, which has to leave it an arch
 * at least 9 wide and 6 high: the lot it is, and which road.
 */
export const GATES: { lot: string; road: keyof typeof ROADS; what: string }[] = [
  { lot: 'wall', road: 'kingsroad', what: 'the tunnel through the ice, at x 10' },
  { lot: 'mc-gate', road: 'kingsroad', what: "Moat Cailin's Gatehouse Tower, at x 21" },
  { lot: 'tw-east-gate', road: 'twins', what: 'the eastern castle of the Twins, at z -26' },
  { lot: 'tw-water', road: 'twins', what: 'the Water Tower, in the middle of the bridge' },
  { lot: 'tw-west-gate', road: 'twins', what: 'the western castle of the Twins' },
  { lot: 'bloody-gate-arch', road: 'high', what: 'the Bloody Gate, at z -13' },
  { lot: 'kl-dragon-gate', road: 'kingsroad', what: 'the Dragon Gate, at x 70' },
  { lot: 'kl-lion-gate', road: 'gold', what: 'the Lion Gate, at z 50.5' },
  { lot: 'kl-river-gate', road: 'kingsroad', what: 'the River Gate, on the north end of the Blackwater bridge, at x 40' },
  { lot: 'sun-wall-1', road: 'sunspear', what: 'the Threefold Gate: the first of three, at x 38' },
  { lot: 'sun-wall-2', road: 'sunspear', what: 'the second' },
  { lot: 'sun-wall-3', road: 'sunspear', what: 'the third' },
  { lot: 'se-wall', road: 'kingsroad', what: "Storm's End's gate, in the west-north-west of its wall, where the road from the fork comes up" },
];

// ---------------------------------------------------------------------------
// Islands, rivers and still water
// ---------------------------------------------------------------------------

/** Land that stands in the sea, as ovals. Each is the ground of whoever builds on it. */
export const ISLANDS = {
  bear: { x: -94, z: -66, rx: 7.5, rz: 7.5 },
  dragonstone: { x: 96.5, z: 25, rx: 9.5, rz: 15.5 },
  battle: { x: -78, z: 92, rx: 10.75, rz: 10.75 },
  rock: { x: -82, z: 21, rx: 9.6, rz: 14.5 },
};

/**
 * Rivers: the middle of each from its spring to its mouth, and half its width
 * at each end. A river stops a hair short of the water it runs into, so that
 * each stays a shape of its own.
 */
export const RIVERS = {
  /**
   * From Riverrun east past the crossroads to the bay. The kingsroad crosses it at x 42, by the inn. East of
   * that it keeps between the high road and the kingsroad, south of the Bloody Gate's pier, and through the
   * narrow place at (71, -1.6) between the yard of the Gates of the Moon and the kingsroad's bend.
   */
  trident: { line: [[-53.95, -8.6], [-30, -7], [-2, -6], [30, -6], [42, -5], [50, -6.5], [58, -5.6], [65, -4.6], [71.16, -1.58], [75.8, 1.8]] as P2[], half: [1.5, 1.65] },
  /** Out of the Neck, under the Twins' Water Tower at x -7, into the Trident. */
  greenFork: { line: [[-7, -37.1], [-7, -10], [-3.9, -8.1]] as P2[], half: [1.2, 1.5] },
  /** Along Highgarden's north wall to the Sunset Sea. The ocean road crosses it. */
  mander: { line: [[-17, 57.3], [-52, 57.3], [-62, 58], [-74, 60], [-77.9, 60.7]] as P2[], half: [0.5, 1.6] },
  /** Out of the kingswood into the river mouth under King's Landing. */
  blackwater: { line: [[-8, 61], [4, 60], [15.7, 59.5]] as P2[], half: [0.5, 1.7] },
};

/**
 * Ground that is left out of the tile's own, as a hole, because whoever builds
 * there floors it: with water, and with whatever stands in the water.
 */
export const WET: Record<string, P2[]> = {
  /** Inside Winterfell's outer wall: the moat, and the inner castle in it. */
  winterfell: [[-38.5, -74.5], [6.5, -74.5], [6.5, -45.5], [-38.5, -45.5]],
  /** Riverrun, where the Tumblestone and the Red Fork meet: the Trident runs on from its east side at z -8.6. */
  riverrun: [[-70, -22], [-54, -22], [-54, -8], [-70, -8]],
  /** Queenscrown's lake, with its tower on an islet. */
  queenscrown: [[-63, -86.5], [-50, -86.5], [-48, -80], [-51, -76], [-61, -76], [-64, -81]],
};

/** Where a road crosses water on a bridge: which road, where the middle of the bridge is, and what it crosses. */
export const BRIDGES: { road: keyof typeof ROADS; x: number; z: number; over: string }[] = [
  { road: 'twins', x: -7, z: -26, over: 'the Green Fork: the Crossing, with the Water Tower on it' },
  { road: 'river', x: -7, z: -14, over: 'the Green Fork' },
  { road: 'river', x: -47.7, z: -8.4, over: 'the Trident, below Riverrun' },
  { road: 'kingsroad', x: 42.3, z: -5, over: 'the Trident, by the inn' },
  { road: 'kingsroad', x: 40, z: 59.5, over: 'the Blackwater, with the River Gate at its north end' },
  { road: 'ocean', x: -67.5, z: 58.7, over: 'the Mander' },
  { road: 'isle', x: -66, z: 101.6, over: 'the water between Oldtown and Battle Isle' },
];

// ---------------------------------------------------------------------------
// Places for a hero
// ---------------------------------------------------------------------------

/**
 * Where a hero may stand on show: each is kept empty, and open to the
 * south-east, so that the view the tile opens with sees the whole car.
 * `heading` is in radians: 0 faces east and a quarter turn faces south.
 */
export const HERO_SPOTS: { id: string; x: number; z: number; heading: number; where: string }[] = [
  { id: 'tourney', x: 0, z: 39.3, heading: 0.35, where: 'before the royal stand at the tourney ground, on the lists' },
  { id: 'inn', x: 49, z: -19, heading: 0, where: 'the yard of the Inn at the Crossroads, between the inn and the high road' },
  { id: 'castle-black', x: 17.6, z: -80.5, heading: 1.2, where: "Castle Black's yard, at the foot of the stair, east of the kingsroad" },
  { id: 'winter-town', x: 35.5, z: -50, heading: 0.5, where: "Winter Town's market square, south of its houses and east of its inn" },
  { id: 'quay', x: 53, z: 57.4, heading: 0, where: "the fish market on the wharf under the Red Keep, south of the river-front road" },
  { id: 'highgarden', x: -12, z: 89.3, heading: 0.6, where: 'a court of roses between Highgarden and the roseroad' },
  { id: 'sunspear', x: 47, z: 106.5, heading: 1.1, where: 'the court inside the third of the Threefold Gate' },
];
