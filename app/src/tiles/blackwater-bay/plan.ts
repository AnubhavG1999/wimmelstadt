// Blackwater Bay in 129 AC, as data. Nothing in this file draws anything.
//
// One bay and its shores, the last year all of it stood: King's Landing on the
// west shore with the Dragonpit whole on the Hill of Rhaenys; the Rosby road
// along the north shore to Rook's Rest; Crackclaw Point and Claw Isle in the
// north-east; Dragonstone and the lairs of the Dragonmont at the mouth of the
// bay; Driftmark, with Hull, High Tide and Spicetown, across the Gullet from
// Massey's Hook; and the kingswood and the Wendwater on the south shore.
//
// North is the board's north. What is tall stands in the north and the west of
// what it belongs to, because the view the tile opens with looks from the
// south-south-east and a thing hides what is north-north-west of it.
//
// Units: 1 unit is 1 cm of toy. A car is about 7 long, and a lane of these
// roads is 4 wide. x points east, z points south, y points up. Traffic keeps
// to the left, as on the Westeros tile, which is the same world.
//
// This file imports nothing, so that a script can read it as it is.

export type P2 = [number, number];
export type P3 = [number, number, number];

/** The board, as every tile has it. */
export const BOARD = { x0: -104, x1: 104, z0: -113, z1: 113 };
/** A shape that reaches the edge of the board stops a hair short of it. */
export const EDGE = 0.2;
const XW = BOARD.x0 + EDGE, XE = BOARD.x1 - EDGE, ZN = BOARD.z0 + EDGE, ZS = BOARD.z1 - EDGE;

/** How far below the ground the water lies. */
export const WATER_LEVEL = -0.9;

// ---------------------------------------------------------------------------
// The water and the land
// ---------------------------------------------------------------------------
//
// The water is one body: the Blackwater Rush from the west edge, its mouth,
// the bay, the channels round Dragonstone and Driftmark, the Gullet, and the
// Narrow Sea down the east edge. It cuts the mainland in two, north of the
// Rush and south of it. The islands are laid over it.

/** The Rush: its north bank, under King's Landing's quays, and its south bank, under the kingswood. */
export const RUSH = { north: 74, south: 86 };
/** Where the bay's shores are: the city's east shore, the north shore, Crackclaw Point's south shore, and Massey's Hook's north shore. */
export const SHORE = { city: -12, north: -78, claw: -90, hook: 95, wood: -4 };

/** The mainland north of the Rush: King's Landing, the north shore and Crackclaw Point. */
export const LAND_NORTH: P2[] = [
  [XW, ZN], [90, ZN], [90, SHORE.claw], [36, SHORE.claw], [32, -84], [26, SHORE.north], [SHORE.city, SHORE.north], [SHORE.city, 70], [-16, RUSH.north], [XW, RUSH.north],
];
/** The mainland south of the Rush: the kingswood, and Massey's Hook along the south edge. */
export const LAND_SOUTH: P2[] = [
  [XW, RUSH.south], [-16, RUSH.south], [SHORE.wood, 88], [SHORE.wood, SHORE.hook], [XE, SHORE.hook], [XE, ZS], [XW, ZS],
];
/** All the water, as one shape. The islands stand in it. */
export const WATER: P2[] = [
  [XW, RUSH.north], [-16, RUSH.north], [SHORE.city, 70], [SHORE.city, SHORE.north], [26, SHORE.north], [32, -84], [36, SHORE.claw], [90, SHORE.claw], [90, ZN], [XE, ZN],
  [XE, SHORE.hook], [SHORE.wood, SHORE.hook], [SHORE.wood, 88], [-16, RUSH.south], [XW, RUSH.south],
];

/** Land that stands in the water. Each is the ground of whoever builds on it. */
export const ISLANDS: Record<string, P2[]> = {
  /** At the mouth of the bay: the Dragonmont and its lairs, the castle on the south-west, the town on the south. */
  dragonstone: [
    [31, -36], [36, -60], [48, -76], [66, -80.5], [84, -76], [93, -60], [94, -30], [92, -6], [84, 8], [66, 10.5], [44, 9], [32, 2], [29, -14],
  ],
  /** The largest island in the bay, low and green: Hull and the old castle on its north side, Spicetown on the Gullet. */
  driftmark: [
    [8, 38], [12, 30], [22, 26.5], [44, 25.5], [64, 26.5], [78, 33], [84, 44], [80, 56], [68, 64.5], [40, 65], [18, 64], [9, 58],
  ],
  /** High Tide's islet in the Gullet, which the causeway reaches at low tide. */
  'high-tide': [[24, 72], [34, 70], [44, 72], [46.5, 80], [44, 88], [34, 90], [24, 88], [21.5, 80]],
  /** Claw Isle, the Celtigars' rock, off Crackclaw Point in the Narrow Sea. */
  'claw-isle': [[94, -104], [98, -106], [102.6, -104], [103.2, -98], [100, -94], [95, -95], [93.4, -99]],
};

/** The sands that the tide covers and uncovers, between Driftmark's south shore and High Tide's islet. */
export const SANDS: P2[] = [[12, 63.5], [50, 64.8], [56, 68], [50, 72.5], [34, 71], [22, 73], [12, 71]];

/** The Wendwater, from the south edge north through the kingswood into the Rush's mouth: its middle, and half its width at each end. */
export const WENDWATER = { line: [[-27, 110.5], [-22, 105], [-13, 98], [-8.4, 93], [-6.4, 90.4]] as P2[], half: [0.8, 1.6] };

/** Whether a place lies inside an outline. */
export function inside(shape: P2[], x: number, z: number): boolean {
  let hit = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const a = shape[i], b = shape[j];
    if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

/** Whether a place is open water: the bay, the Rush, the Gullet or the sea. An island is not, and nor are the sands. */
export function isWater(x: number, z: number): boolean {
  if (!inside(WATER, x, z)) return false;
  for (const shape of Object.values(ISLANDS)) if (inside(shape, x, z)) return false;
  return !inside(SANDS, x, z);
}

// ---------------------------------------------------------------------------
// King's Landing's three hills
// ---------------------------------------------------------------------------

/**
 * The Hill of Rhaenys, with the Dragonpit on its crown. The drum stands in
 * the middle of a stone terrace, `y` high, walled round, and the terrace
 * reaches out to the south and the east: an apron to the south, where
 * Balerion lies, the forecourt before the bronze doors to the south-east, and
 * an apron to the east, where Vhagar lies looking out over the bay. The forty
 * vaults' iron doors are in the terrace's walls.
 */
export const RHAENYS = {
  c: [-60, -40] as P2,
  /** The drum, how high its wall stands, and how high its dome rises. */
  drum: 20, wall: 25, dome: 40,
  /** The terrace's height, and how far round the drum it reaches where it does not reach out. */
  y: 6, crown: 24,
  /** Which way the bronze doors face: south-east, in degrees from east towards south. */
  doors: 45,
  /** Balerion's apron, the forecourt and Vhagar's apron, as rectangles. */
  apronS: { x0: -73, z0: -22, x1: -50, z1: -2 },
  forecourt: { x0: -50, z0: -28, x1: -28, z1: -2 },
  apronE: { x0: -40, z0: -54, x1: -19, z1: -28 },
  /** The terrace's outline, round the crown's north-west half and back by the aprons and the forecourt. */
  terrace: [] as P2[],
};
{
  const R = RHAENYS, [cx, cz] = R.c, out: P2[] = [];
  // the crown, round its north-west half: bearings measured from east towards south
  for (let a = 120; a <= 336; a += 12) out.push([cx + R.crown * Math.cos((a * Math.PI) / 180), cz + R.crown * Math.sin((a * Math.PI) / 180)]);
  out.push([R.apronE.x0, R.apronE.z0], [R.apronE.x1, R.apronE.z0], [R.apronE.x1, R.apronE.z1], [R.forecourt.x1, R.forecourt.z0],
    [R.forecourt.x1, R.forecourt.z1], [R.apronS.x0, R.apronS.z1], [R.apronS.x0, cz + R.crown * Math.sin((120 * Math.PI) / 180)]);
  R.terrace = out;
}

/** Visenya's Hill, in the west: a crown of houses and one plain sept. */
export const VISENYA = { c: [-84, 30] as P2, y: 6, crown: 7, foot: 16 };

/** Aegon's High Hill, in the city's south-east corner over the river's mouth: the Red Keep on its crown. */
export const AEGON = { c: [-30, 42] as P2, y: 8, crown: 14, foot: 18 };

/** How high the ground is at a place, as far as the plan knows it: the hills and the terrace. The mountain is its island's builder's. */
export function hillAt(x: number, z: number): number {
  if (inside(RHAENYS.terrace, x, z)) return RHAENYS.y;
  let y = 0;
  for (const h of [VISENYA, AEGON]) {
    const d = Math.hypot(x - h.c[0], z - h.c[1]);
    if (d <= h.crown) y = Math.max(y, h.y);
    else if (d < h.foot) { const t = (h.foot - d) / (h.foot - h.crown); y = Math.max(y, h.y * t * t * (3 - 2 * t)); }
  }
  return y;
}

/**
 * The Dragonmont: a volcano 50 high in the north of the island, still smoking,
 * with broad flanks where the lairs are. Its natural shape is a cone whose
 * height at a place is `top × (1 − d) ^ fall`, where d runs from 0 at the
 * summit to 1 at its foot, which lies `reach` out from the summit each way.
 * Its builder carves a level shelf before each lair and a crater at the top.
 */
export const DRAGONMONT = {
  summit: [64, -44] as P2, top: 50, fall: 1.25,
  reach: { w: 30, e: 28, n: 34, s: 26 },
};

/** How far out from the summit the mountain stands `y` high, as a share of its reach. */
export const shareAt = (y: number): number => 1 - (Math.min(DRAGONMONT.top, Math.max(0, y)) / DRAGONMONT.top) ** (1 / DRAGONMONT.fall);

/** The Dragonmont's natural height at a place: 0 off it. */
export function mountAt(x: number, z: number): number {
  const M = DRAGONMONT, dx = x - M.summit[0], dz = z - M.summit[1];
  const d = Math.hypot(dx / (dx < 0 ? M.reach.w : M.reach.e), dz / (dz < 0 ? M.reach.n : M.reach.s));
  return d >= 1 ? 0 : M.top * (1 - d) ** M.fall;
}

/** The place on the mountain's natural slope that is `y` high, out from the summit on a bearing in degrees (0 east, 90 south). */
export function onMount(bearing: number, y: number): P2 {
  const M = DRAGONMONT, a = (bearing * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), share = shareAt(y);
  return [M.summit[0] + c * share * (c < 0 ? M.reach.w : M.reach.e), M.summit[1] + s * share * (s < 0 ? M.reach.n : M.reach.s)];
}

/** Where a dragon or a hero rests: where, how high the ground under it is, which way it faces in degrees (0 east, 90 south), and what the place is. */
export interface Home { x: number; z: number; y: number; facing: number; where: string }
/** A lair on the Dragonmont: on a bearing from the summit, at a height on its slope, facing a way. */
const lair = (bearing: number, y: number, facing: number, where: string): Home => {
  const [x, z] = onMount(bearing, y);
  return { x, z, y, facing, where };
};
/** The lair a hero stands in, low on the mountain's south face above the road, lit inside. */
export const HERO_LAIR = lair(112, 9, 100, 'a lair for a hero');

// ---------------------------------------------------------------------------
// What stands where: every lot as a rectangle with a height
// ---------------------------------------------------------------------------

/** One thing that stands on the tile: the ground it covers and how high its top is. */
export interface Lot {
  id: string;
  /** What it is called, for the board on its box while it is only a box. */
  name: string;
  x0: number; z0: number; x1: number; z1: number;
  /** How high its top stands above the board's ground, hill and all. */
  top: number;
  /** A part of something else: it is not blocked out as a box of its own. */
  part?: boolean;
}

const lot = (id: string, name: string, x0: number, z0: number, x1: number, z1: number, top: number, part = false): Lot => ({ id, name, x0, z0, x1, z1, top, part });
const R = RHAENYS;

export const LOTS: Lot[] = [
  // ======================= King's Landing =======================
  // --- the walls, built from 20 to 26 AC, and the two gates the roads use ---
  lot('kl-wall-n', "King's Landing", -101, -106, -14, -104.5, 9, true),
  lot('kl-wall-w', '', -101, -106, -99.5, 66, 9, true),
  lot('kl-wall-s', '', -101, 58.5, -18, 60, 7, true),
  lot('kl-wall-e', '', -15.5, -106, -14, 28, 9, true),
  lot('iron-gate', 'Iron Gate', -18, -100, -10, -86, 12),
  lot('river-gate', 'River Gate', -67, 55, -53, 61, 11),
  // --- the Hill of Rhaenys and the Dragonpit: the centrepiece ---
  lot('dragonpit', 'The Dragonpit', R.c[0] - R.drum, R.c[1] - R.drum, R.c[0] + R.drum, R.c[1] + R.drum, R.dome),
  lot('dp-crown', '', R.c[0] - R.crown, R.c[1] - R.crown, R.c[0] + R.crown, R.c[1] + R.crown, R.y, true),
  lot('dp-apron-s', '', R.apronS.x0, R.apronS.z0, R.apronS.x1, R.apronS.z1, R.y, true),
  lot('dp-forecourt', '', R.forecourt.x0, R.forecourt.z0, R.forecourt.x1, R.forecourt.z1, R.y, true),
  lot('dp-apron-e', '', R.apronE.x0, R.apronE.z0, R.apronE.x1, R.apronE.z1, R.y, true),
  lot('dp-doors', '', -51, -31, -41, -21, 22, true),
  lot('drovers-pen', "Drovers' pen", -36, -100, -20, -86, 2.5),
  // --- Visenya's Hill ---
  lot('visenya', "Visenya's Hill", VISENYA.c[0] - VISENYA.crown, VISENYA.c[1] - VISENYA.crown, VISENYA.c[0] + VISENYA.crown, VISENYA.c[1] + VISENYA.crown, VISENYA.y, true),
  lot('sept', 'Sept', -88, 26, -80, 34, 18),
  // --- Aegon's High Hill and the Red Keep ---
  lot('aegon', "Aegon's High Hill", AEGON.c[0] - AEGON.crown, AEGON.c[1] - AEGON.crown, AEGON.c[0] + AEGON.crown, AEGON.c[1] + AEGON.crown, AEGON.y, true),
  lot('red-keep', 'The Red Keep', -40, 32, -20, 52, 17),
  lot('rk-holdfast', "Maegor's Holdfast", -32, 42, -24, 50, 27, true),
  lot('rk-tower', '', -25, 46, -20, 51, 30, true),
  // --- houses: every block with its height. They are the ordinary buildings of the city ---
  lot('h-nw', 'Houses', -98, -102, -86, -76, 8),
  lot('h-n1', 'Houses', -84, -102, -68, -72, 8),
  lot('h-n2', 'Houses', -66, -102, -50, -70, 8),
  lot('h-n3', 'Houses', -48, -102, -40, -72, 7),
  lot('h-ne', 'Houses', -36, -82, -18, -60, 7),
  lot('h-w1', 'Houses', -98, -72, -88, -24, 7),
  lot('h-w2', 'Houses', -98, -18, -76, 8, 7),
  lot('h-sisters-w', 'Houses', -72, 12, -66, 52, 6),
  lot('h-sisters-e', 'Houses', -54, 27, -49, 52, 6),
  lot('h-river-w', 'Houses', -98, 48, -70, 56, 6),
  lot('h-east', 'Houses', -30, 4, -17, 21, 5),
  // --- on the shore ---
  lot('strand', "Aegon's strand", -18, 60, -12.5, 72, 3, true),

  // ======================= The north shore =======================
  lot('rosby', 'Rosby', -8, -108, 2, -100, 10),
  lot('stokeworth', 'Stokeworth', 5, -108, 14, -100, 10),
  lot('fishing', 'Fishing village', -6, -86, 12, -79.5, 3),
  lot('duskendale', 'Duskendale', 15, -98, 27, -79, 9),
  lot('rooks-rest', "Rook's Rest", 29, -109, 39, -101.5, 12),
  lot('crackclaw', 'Crackclaw Point', 42, -112, 89, -92, 7, true),
  lot('claw-isle', 'Claw Isle', 94, -105, 102, -96, 10),

  // ======================= Dragonstone =======================
  lot('ds-castle', 'Dragonstone', 32, -12, 50, 8, 14),
  lot('stone-drum', 'Stone Drum', 38, -5, 44, 1, 22, true),
  lot('windwyrm', 'Windwyrm', 33, -11, 37, -7, 24, true),
  lot('sea-dragon', 'Sea Dragon Tower', 33, 3, 37, 7, 18, true),
  lot('ds-town-n', 'Town', 52, -10, 70, -5, 6),
  lot('ds-town-e', 'Town', 82, -8, 90, -1.5, 6),
  lot('ds-quay', 'Harbour', 52, 6.5, 62, 9, 3, true),
  lot('ds-inn', 'Inn', 63.5, 11, 67.5, 16, 5),

  // ======================= Driftmark =======================
  lot('castle-driftmark', 'Driftmark', 20, 28, 31, 36.5, 10),
  lot('hull', 'Hull', 33, 27.5, 50, 35, 6),
  lot('shipyards', 'Shipyards', 75, 33, 84, 49, 8),
  lot('spicetown', 'Spicetown', 46, 45, 60, 51.5, 6),
  lot('high-tide', 'High Tide', 24.5, 72.5, 43.5, 89, 16),

  // ======================= The south shore =======================
  lot('ferry-landing', 'Ferry', -79, 86.5, -69, 91, 3),
  lot('sheepfold', 'Sheepfold', -40, 89, -30, 96, 2.5),
  lot('stonedance', 'Stonedance', 22, 95.5, 34, 100, 10),
  lot('sharp-point', 'Sharp Point', 91, 94.5, 101, 101, 8),
];

/**
 * The Dragonmont as steps, for the sums of what it hides: at each height, a
 * box over most of the ground where the mountain stands at least that high.
 * They are not built as boxes.
 */
export const MOUNT_STEPS: Lot[] = [4, 12, 20, 28, 36, 44, 50].map((top, i) => {
  const M = DRAGONMONT, s = shareAt(top) * 0.85, [x, z] = M.summit;
  return lot(`dragonmont-${i}`, i === 0 ? 'The Dragonmont' : '', x - s * M.reach.w, z - s * M.reach.n, x + s * M.reach.e, z + s * M.reach.s, top, true);
});

/** A lot, by its name in the plan. */
export const lotOf = (id: string): Lot => {
  const found = LOTS.find((l) => l.id === id);
  if (!found) throw new Error(`Blackwater Bay: the plan has no lot called ${id}.`);
  return found;
};

// ---------------------------------------------------------------------------
// Roads: five loops on five pieces of land that never join
// ---------------------------------------------------------------------------
//
// Every road keeps to its own land, and nothing on the ground joins one land
// to another: ships, a ferry and the dragons are all that cross the water.
// A road is two lanes, one each way, and traffic keeps left. A road that ends
// turns back in a ring, which traffic goes round with the clock.

/** How wide one lane is, and so half of how wide a road is. */
export const LANE = 4;

/** The middle of each road, corner by corner. */
export const ROADS = {
  /** King's Landing: along the quays under the south wall, from the west end to Aegon's strand. */
  quays: [[-93, 67], [-25, 67]] as P2[],
  /** The Street of the Sisters: in at the River Gate, north between Visenya's Hill and the High Hill, east under Balerion, and up to the forecourt. */
  sisters: [[-60, 67], [-60, 14], [-48, 14], [-37, -4]] as P2[],
  /** The Rosby road: out of the Iron Gate and along the north shore, through Duskendale, to Rook's Rest. */
  rosby: [[-28, -93], [-6, -94], [10, -93], [21, -89], [34, -94]] as P2[],
  /** Dragonstone: from the harbour west past the town, in at the castle's gate, out under the Dragon's Tail, and east under the lairs. */
  dragonstone: [[67, 3], [50, 2], [41, 2], [41, -16], [58, -15.5], [76, -16.5]] as P2[],
  /** Driftmark: the ring round the island, by Hull, the shipyards, Spicetown and the strand. */
  driftmark: [[16, 41], [26, 43], [44, 40], [62, 39], [70, 50], [62, 57], [40, 57], [20, 56], [14, 49]] as P2[],
  /** The causeway to High Tide, over the sands. */
  causeway: [[34, 57], [34, 76]] as P2[],
  /** The south shore: from the ferry's landing through the kingswood, over the Wendwater by a ford, and along Massey's Hook to Sharp Point. */
  south: [[-71, 98], [-50, 101], [-16, 104], [20, 106], [60, 106], [84, 106]] as P2[],
} satisfies Record<string, P2[]>;

/**
 * Where a road ends and turns back on itself: the middle of the ring, and how
 * far out the middle of its one lane is.
 */
export const TURNS = {
  /** At the west end of the quays, inside the corner of the walls. */
  quaysWest: { c: [-93, 67] as P2, r: 3.8 },
  /** Aegon's strand, at the east end of the quays. */
  strand: { c: [-25, 67] as P2, r: 3.8 },
  /** On the Dragonpit's forecourt, a little way out from the bronze doors. */
  forecourt: { c: [-37, -8.5] as P2, r: 4.2 },
  /** The drovers' pen, inside the Iron Gate. */
  pen: { c: [-28, -92] as P2, r: 4.2 },
  /** Before Rook's Rest's gate. */
  rooksRest: { c: [34, -94] as P2, r: 4.2 },
  /** Dragonstone's harbour. */
  harbour: { c: [67, 3] as P2, r: 4.2 },
  /** Under the lairs, where the camp of the Sowing is. */
  sowing: { c: [76, -16.5] as P2, r: 4.5 },
  /** High Tide's court. */
  highTide: { c: [34, 81] as P2, r: 4.2 },
  /** The ferry's landing on the south bank of the Rush. */
  ferry: { c: [-71, 98] as P2, r: 3.8 },
  /** Sharp Point, at the end of Massey's Hook. */
  sharpPoint: { c: [84, 106] as P2, r: 4.2 },
};

// ---------------------------------------------------------------------------
// Places for a hero
// ---------------------------------------------------------------------------

/**
 * Where a hero may stand on show: each is kept empty and open to the
 * south-east, so that the view the tile opens with sees the whole car.
 * `heading` is in radians: 0 faces east and a quarter turn faces south.
 */
export const HERO_SPOTS: { id: string; x: number; z: number; y: number; heading: number; where: string }[] = [
  { id: 'vault', x: -52.5, z: -1, y: 0.04, heading: Math.PI / 2, where: 'an open vault of the Dragonpit, its iron door swung back in the terrace wall, beside the climb' },
  { id: 'forecourt', x: -32, z: -21, y: R.y + 0.04, heading: Math.PI / 4, where: "the Dragonpit's forecourt, before the bronze doors" },
  { id: 'lair', x: HERO_LAIR.x, z: HERO_LAIR.z, y: HERO_LAIR.y + 0.04, heading: 1.75, where: 'a lair low on the Dragonmont, lit inside, as a car stands in a garage cut into rock' },
  { id: 'causeway', x: 47, z: 67.8, y: -0.31, heading: 0.3, where: 'on the wet sands beside the causeway to High Tide, as on a beach, at low tide' },
  { id: 'slip', x: 79.5, z: 45, y: 0.04, heading: 0, where: 'a slipway at the shipyards, facing east like a ship about to be launched' },
  { id: 'pier', x: 70.5, z: 13, y: 0.04, heading: Math.PI / 2, where: "Dragonstone's stone pier, by the old inn" },
  { id: 'quay', x: 56, z: 62.8, y: 0.04, heading: 0, where: "Spicetown's quay, among the bales from the east" },
];

// ---------------------------------------------------------------------------
// The dragons' homes
// ---------------------------------------------------------------------------

/**
 * Where each of the ten rests when it is not in the air: where it stands, how
 * high the ground under it is, and which way it faces, in degrees (0 east, 90
 * south). The Dragonpit's are on its terrace and in its bronze doors; the
 * rest are at the mouths of lairs on the Dragonmont, whose builder carves a
 * level shelf under each.
 */
/**
 * How long each of the ten is, nose to tail tip, as the research note on the
 * great dragons has them (section 14). Westeros's Drogon is 14.
 */
export const LENGTH: Record<string, number> = {
  balerion: 57, vhagar: 44, meraxes: 37, vermithor: 26, cannibal: 24, silverwing: 24, caraxes: 24, dreamfyre: 22, meleys: 22, sheepstealer: 20,
};

export const HOMES: Record<string, Home> = {
  balerion: { x: -61.5, z: -13, y: R.y, facing: 90, where: "the Dragonpit's south apron, before the greatest of the forty vaults" },
  vhagar: { x: -29, z: -42, y: R.y, facing: 0, where: "the Dragonpit's east apron, looking out over the bay" },
  dreamfyre: { x: -43.5, z: -23.5, y: R.y, facing: 45, where: 'in the bronze doors' },
  meraxes: lair(95, 32, 90, 'a high lair on the south face of the Dragonmont'),
  vermithor: lair(128, 15, 115, 'his smoking cavern on the south-west flank'),
  silverwing: lair(98, 13, 95, 'her cavern beside his'),
  sheepstealer: lair(150, 9, 125, 'his cave on the west flank, a sheep penned on the slope below it'),
  caraxes: lair(60, 22, 55, 'a lair on the south-east face'),
  meleys: lair(20, 18, 25, 'a lair on the east face'),
  cannibal: lair(-30, 12, -5, 'his lair at the back of the mountain, facing the Narrow Sea'),
};


// ---------------------------------------------------------------------------
// What the opening view must see
// ---------------------------------------------------------------------------

/** Places the view the tile opens with is to see, checked against the plan's lots on every load. */
export const SIGHT: { id: string; x: number; y: number; z: number }[] = [
  { id: 'the bronze doors', x: -42, y: 12, z: -22 },
  { id: 'the forecourt ring', x: -37, y: R.y + 1.6, z: -8.5 },
  { id: 'the climb', x: -42.5, y: 4.6, z: 5 },
  { id: 'the foot of the climb', x: -48, y: 1.6, z: 14 },
  { id: 'the Street of the Sisters', x: -54, y: 1.6, z: 14 },
  { id: 'the square under Balerion', x: -60, y: 1.6, z: 6 },
  { id: 'the Street of the Sisters by the River Gate', x: -60, y: 1.6, z: 50 },
  { id: "the Red Keep's gate", x: -30, y: AEGON.y + 2, z: 53.5 },
  { id: 'the quays', x: -60, y: 1.6, z: 67 },
  { id: "the drovers' pen", x: -28, y: 1.6, z: -92 },
  { id: "Rook's Rest's gate", x: 34, y: 1.6, z: -99 },
  { id: 'the Rosby road by Rosby', x: -2, y: 1.6, z: -92 },
  { id: 'Dragonstone harbour', x: 72, y: 1.6, z: 5 },
  { id: 'the Stone Drum', x: 49, y: 12, z: -2 },
  { id: 'Spicetown', x: 58, y: 2, z: 62 },
  { id: 'High Tide', x: 34, y: 8, z: 89.5 },
  { id: 'the road along the Gullet', x: 40, y: 1.6, z: 58 },
  { id: 'Stonedance', x: 28, y: 4, z: 100.5 },
  { id: 'the sheepfold', x: -35, y: 1, z: 96 },
];
