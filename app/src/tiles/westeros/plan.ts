// The Westeros tile, as data. Nothing in this file draws anything.
//
// The tile is the whole continent squeezed onto one board: the Wall across the
// north edge, the kingsroad down the middle from the Wall to Storm's End, the
// sea down both sides and open water in the south-east corner. North is the
// board's north. What is tall stands in the north and the west of what it
// belongs to, because the view the tile opens with looks from the
// south-south-east and a thing hides what is north-north-west of it.
//
// Units: 1 unit is 1 cm of toy. A lane is 5 wide, a storey is 5 high and a car
// is about 7 long. x points east, z points south, y points up. Traffic keeps
// to the left.

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
  [XW, ZN], [XW, -84], [-82, -80], [-78, -62], [-66, -48], [-14, -46], [-14, -36], [-40, -33], [-64, -28], [-78, -22], [-78, 0],
  [-72, 8], [-72, 34], [-86, 36], [-86, 46], [-80, 50], [-78, 66], [-70, 80], [-66, 84], [-66, ZS],
];
/** Where the land ends to the east, from the north edge to the south. At the Vale it runs off the board. */
export const COAST_EAST: P2[] = [
  [90, ZN], [90, -70], [88, -58], [80, -56], [60, -49], [42, -46], [42, -37.5], [XE, -37.5], [XE, 0.5],
  [76, 2], [76, 56], [16, 56], [16, 63], [76, 63], [76, 98], [56, 100], [56, ZS],
];

/** The Neck: the narrow land between two seas, which is bog. */
export const NECK = { x0: -14, x1: 42, z0: -46, z1: -37.5 };

/** The land north of the Neck, which lies under snow: down the east coast and back up the west. */
export const LAND_NORTH: P2[] = [...COAST_EAST.slice(0, 6), ...COAST_WEST.slice(0, 6).reverse()];
/** The Neck's own ground. */
export const LAND_NECK: P2[] = [[NECK.x1, NECK.z0], [NECK.x1, NECK.z1], [NECK.x0, NECK.z1], [NECK.x0, NECK.z0]];
/** The land south of the Neck, which is green. */
export const LAND_SOUTH: P2[] = [[NECK.x0, NECK.z1], [NECK.x1, NECK.z1], ...COAST_EAST.slice(7), ...COAST_WEST.slice(6).reverse()];

/** Dorne's sand, in the middle of the south edge. */
export const DORNE: P2[] = [[2, 88], [76, 86], [76, 98], [56, 100], [56, ZS], [-16, ZS], [-8, 98]];

/** The Sunset Sea, down the whole west side. */
export const SEA_WEST: P2[] = [...COAST_WEST.slice(1), [XW, ZS]];
/** The Shivering Sea and the Bite, in the north-east. */
export const SEA_NORTH_EAST: P2[] = [...COAST_EAST.slice(0, 8), [XE, ZN]];
/** Blackwater Bay, the river's mouth under King's Landing, and the open sea of the south-east corner. */
export const SEA_SOUTH_EAST: P2[] = [...COAST_EAST.slice(8), [XE, ZS]];

/** The Gods Eye. */
export const GODS_EYE = { x: -55, z: 23, rx: 15, rz: 17 };

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

/** Whether a place is open water: one of the seas, or the lake. */
export function isWater(x: number, z: number): boolean {
  if (((x - GODS_EYE.x) / GODS_EYE.rx) ** 2 + ((z - GODS_EYE.z) / GODS_EYE.rz) ** 2 < 1) return true;
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
  lot('mc-gate', 'Gatehouse Tower', 16, -41.5, 26, -37.5, 9),
  lot('mc-drunkard', "Drunkard's Tower", 8, -38, 12, -34, 14),
  lot('crannogs', 'Crannogs', 28, -42, 36, -36, 4),
  // --- the Twins: the road at z -26 ---
  lot('tw-east-keep', 'The Twins', 4, -38, 12, -30, 20),
  lot('tw-east-gate', '', 4, -30, 14, -22, 9, true),
  lot('tw-water', 'Water Tower', -10, -30, -4, -22, 17),
  lot('tw-west-keep', 'The Twins', -26, -38, -18, -30, 20),
  lot('tw-west-gate', '', -28, -30, -18, -22, 9, true),
  // --- the crossroads at (40, -15), Riverrun, the Vale ---
  lot('inn', 'Inn at the Crossroads', 44, -27, 54, -20, 11),
  lot('inn-stable', 'Stable', 55, -26, 60, -21, 6),
  lot('riverrun', 'Riverrun', -70, -22, -54, -8, 16),
  lot('vale-north', '', 64, -38, 104, -32, 10, true),
  lot('vale-body', "Giant's Lance", 68, -32, 104, -18, 24, true),
  lot('vale-high', '', 76, -32, 98, -20, 38, true),
  lot('vale-summit', "Giant's Lance", 82, -30, 92, -22, 52),
  lot('vale-south', '', 82, -18, 104, -6, 14, true),
  lot('eyrie', 'The Eyrie', 76, -27, 82, -21, 47),
  lot('bloody-gate-n', 'Bloody Gate', 63, -21, 67, -18, 11),
  lot('bloody-gate-arch', '', 63, -18, 67, -10, 8, true),
  lot('gates-moon', 'Gates of the Moon', 72, -18.5, 80, -14, 12),
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
  lot('se-wall', "Storm's End", 52, 78, 72, 98, 16, true),
  lot('se-drum', "Storm's End", 58, 84, 66, 92, 24),
  lot('sun-wall-1', 'Sunspear', 20, 89.5, 52, 90.5, 6, true), lot('sun-wall-2', '', 20, 95.5, 52, 96.5, 5, true), lot('sun-wall-3', '', 20, 101.5, 52, 102.5, 5, true),
  lot('sun-tower', 'Tower of the Sun', 26, 97, 34, 105, 14),
  lot('sun-spear', 'Spear Tower', 24, 91.5, 26.5, 94, 20),
  lot('hg-outer', 'Highgarden', -52, 60, -20, 92, 8, true), lot('hg-mid', '', -47, 65, -25, 87, 12, true),
  lot('hg-inner', '', -43, 69, -29, 83, 17, true), lot('hg-towers', 'Highgarden', -40, 72, -32, 80, 24),
  // the Hightower is stepped: a black base, and three tiers that narrow
  lot('hightower-base', '', -82, 88, -74, 96, 10, true), lot('hightower-1', '', -81, 89, -75, 95, 24, true), lot('hightower-2', '', -80.5, 89.5, -75.5, 94.5, 38, true),
  lot('hightower', 'The Hightower', -80, 90, -76, 94, 48),
  lot('oldtown', 'Oldtown', -64, 84, -52, 98, 8),
  lot('citadel', 'Citadel', -60, 86, -56, 90, 13, true),
  // --- the west and the east ---
  lot('casterly-rock-n', '', -88, 8, -74, 18, 20, true),
  lot('casterly-rock', 'Casterly Rock', -90, 16, -72, 34, 34),
  lot('lannisport', 'Lannisport', -84, 36, -70, 46, 7),
  lot('pyke', 'Pyke', -98, -34, -84, -18, 18),
  lot('ds-castle', 'Dragonstone', 88, 30, 96, 38, 20),
  lot('dragonmont', 'Dragonmont', 90, 12, 104, 28, 30),
];

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
