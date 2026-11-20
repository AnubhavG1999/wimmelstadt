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
/** How high the sands lie: above the bay's water, and under the tide's at high water. */
export const SANDS_Y = -0.35;

/** The causeway's body over the sands: a low dyke of stone under the road to High Tide, half a unit wider than the road on each side, which the tide covers at high water. Its sides, its ends (under the islands' ground), and its top's height. High Tide's builder builds it. */
export const DYKE = { x0: 29.5, x1: 38.5, z0: 63, z1: 72, top: 0 };

/**
 * A bar of sand east of the causeway that the tide leaves dry, where a hero may
 * stand: its middle, its half-lengths, how far out its top is level (as a share
 * of them), and how high it is. It is a rounded oblong, so that its top holds a
 * car eight long with room round it.
 */
export const SANDBAR = { x: 45.5, z: 68.35, rx: 6, rz: 3.3, level: 0.78, top: 0.16 };

/** How far out a place is on the sandbar: 0 in its middle, 1 at its foot. */
export function sandbarOut(x: number, z: number): number {
  return Math.pow(Math.pow((x - SANDBAR.x) / SANDBAR.rx, 4) + Math.pow((z - SANDBAR.z) / SANDBAR.rz, 4), 0.25);
}

/** How high the sandbar is at a place, or null off it. */
export function sandbarAt(x: number, z: number): number | null {
  const b = SANDBAR, d = sandbarOut(x, z);
  if (d >= 1) return null;
  return d <= b.level ? b.top : b.top + ((SANDS_Y - b.top) * (d - b.level)) / (1 - b.level);
}

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
 * The Hill of Rhaenys, with the Dragonpit on its crown. The drum stands at
 * the north of a great stone terrace, `y` high and walled round, that fills
 * the hill's south half. The bronze doors face south, onto the forecourt,
 * where the Street of the Sisters comes up. Balerion lies on the dome's
 * crown, Dreamfyre in the doors themselves, and the Dragonkeepers' hall and
 * the larder stand on the aprons either side of the drum. The forty vaults'
 * iron doors are in the terrace's walls.
 */
export const RHAENYS = {
  c: [-60, -40] as P2,
  /** The drum, how high its wall stands, and how high its dome rises: to a level crown `cap` across, at `capY`, where Balerion lies. */
  drum: 20, wall: 25, dome: 40, cap: 4.5, capY: 39.4,
  /** The terrace's height, and how far round the drum it reaches on its north side. */
  y: 6, crown: 24,
  /** Which way the bronze doors face, in degrees from east towards south: south. */
  doors: 90,
  /** The aprons west and east of the drum, each reaching back as far as the drum's north side: the larder's and the Dragonkeepers' hall's. */
  apronW: { x0: -99.5, z0: -62, x1: -78, z1: -4 },
  apronE: { x0: -42, z0: -62, x1: -15.5, z1: -4 },
  /** Before the drum, between the aprons, and the forecourt, which reaches further south where the climb comes up. */
  front: { x0: -78, z0: -22, x1: -42, z1: -4 },
  forecourt: { x0: -72, z0: -4, x1: -48, z1: 6 },
  /** The terrace's outline. */
  terrace: [] as P2[],
};
{
  const R = RHAENYS, [cx, cz] = R.c, out: P2[] = [];
  const w = R.apronW, e = R.apronE, f = R.forecourt;
  // where the crown's circle meets the inner edges of the two aprons, on its north side
  const meet = (x: number): number => cz - Math.sqrt(R.crown * R.crown - (x - cx) * (x - cx));
  out.push([w.x0, w.z1], [w.x0, w.z0], [w.x1, w.z0], [w.x1, meet(w.x1)]);
  // round the north of the drum, from the west apron to the east one
  const a0 = Math.atan2(meet(w.x1) - cz, w.x1 - cx), a1 = Math.atan2(meet(e.x0) - cz, e.x0 - cx);
  for (let i = 1; i < 12; i++) {
    const a = a0 + ((a1 - a0) * i) / 12;
    out.push([cx + R.crown * Math.cos(a), cz + R.crown * Math.sin(a)]);
  }
  out.push([e.x0, meet(e.x0)], [e.x0, e.z0], [e.x1, e.z0], [e.x1, e.z1], [f.x1, e.z1], [f.x1, f.z1], [f.x0, f.z1], [f.x0, w.z1]);
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
  lot('dp-apron-w', '', R.apronW.x0, R.apronW.z0, R.apronW.x1, R.apronW.z1, R.y, true),
  lot('dp-apron-e', '', R.apronE.x0, R.apronE.z0, R.apronE.x1, R.apronE.z1, R.y, true),
  lot('dp-front', '', R.front.x0, R.front.z0, R.front.x1, R.front.z1, R.y, true),
  lot('dp-forecourt', '', R.forecourt.x0, R.forecourt.z0, R.forecourt.x1, R.forecourt.z1, R.y, true),
  lot('dp-doors', '', R.c[0] - 6, R.c[1] + R.drum - 4, R.c[0] + 6, R.c[1] + R.drum + 2, 22, true),
  // on the aprons: the Dragonkeepers' hall on the east, against the city's wall, and the dragons' larder on the west
  lot('dp-hall', "Dragonkeepers' hall", -35, -57, -18, -36, 14, true),
  lot('dp-larder', '', -97, -57, -83, -40, 12, true),
  lot('drovers-pen', "Drovers' pen", -36, -100, -20, -86, 2.5),
  // --- Visenya's Hill ---
  lot('visenya', "Visenya's Hill", VISENYA.c[0] - VISENYA.crown, VISENYA.c[1] - VISENYA.crown, VISENYA.c[0] + VISENYA.crown, VISENYA.c[1] + VISENYA.crown, VISENYA.y + 1, true),
  lot('sept', 'Sept', -88, 26, -80, 34, 18),
  // --- Aegon's High Hill and the Red Keep ---
  lot('aegon', "Aegon's High Hill", AEGON.c[0] - AEGON.crown, AEGON.c[1] - AEGON.crown, AEGON.c[0] + AEGON.crown, AEGON.c[1] + AEGON.crown, AEGON.y, true),
  lot('red-keep', 'The Red Keep', -40, 32, -20, 52, 17),
  lot('rk-holdfast', "Maegor's Holdfast", -32, 42, -24, 50, 27, true),
  lot('rk-tower', '', -25, 46, -20, 51, 30, true),
  // --- houses: every block with its height. They are the ordinary buildings of the city ---
  lot('h-nw', 'Houses', -98, -102, -82, -66, 8),
  lot('h-n1', 'Houses', -80, -102, -66, -68, 8),
  lot('h-n2', 'Houses', -64, -102, -50, -68, 8),
  lot('h-n3', 'Houses', -48, -102, -40, -68, 7),
  lot('h-ne', 'Houses', -36, -84, -18, -66, 7),
  lot('h-w2', 'Houses', -98, 4, -76, 12, 6),
  lot('h-sisters-w', 'Houses', -72, 14, -66, 52, 6),
  lot('h-sisters-e', 'Houses', -53, 18, -49, 52, 5),
  lot('h-river-w', 'Houses', -98, 48, -70, 56, 6),
  lot('h-east', 'Houses', -30, 7, -17, 21, 5),
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
  /** The Street of the Sisters: in at the River Gate, north between Visenya's Hill and the High Hill, and up the climb to the forecourt. */
  sisters: [[-60, 67], [-60, R.forecourt.z1]] as P2[],
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
  forecourt: { c: [-58, -1] as P2, r: 4.2 },
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
  { id: 'vault', x: -52, z: 7.2, y: 0.04, heading: Math.PI / 2, where: 'an open vault of the Dragonpit, its iron door swung back in the forecourt wall, beside the top of the climb' },
  { id: 'forecourt', x: -46.5, z: -10, y: R.y + 0.04, heading: Math.PI / 4, where: "the Dragonpit's forecourt, before the bronze doors where Dreamfyre rests, under Balerion on the dome" },
  { id: 'causeway', x: SANDBAR.x, z: SANDBAR.z, y: SANDBAR.top + 0.04, heading: 0, where: 'on a bar of sand beside the causeway to High Tide, as on a beach at low water, and an island of its own at high water' },
  { id: 'slip', x: 79.5, z: 45, y: 0.04, heading: 0, where: 'a slipway at the shipyards, facing east like a ship about to be launched' },
  { id: 'pier', x: 70.5, z: 13, y: 0.04, heading: Math.PI / 2, where: "Dragonstone's stone pier, by the old inn" },
  { id: 'quay', x: 56, z: 62.8, y: 0.04, heading: 0, where: "Spicetown's quay, among the bales from the east" },
];

// ---------------------------------------------------------------------------
// The dragons' homes
// ---------------------------------------------------------------------------

/**
 * How long each of the ten is, nose to tail tip, as the dragons' kit has them
 * (`engine/dragons/kinds.ts`), after the research note on the great dragons
 * (section 14). Westeros's Drogon is 14.
 */
export const LENGTH: Record<string, number> = {
  balerion: 57, vhagar: 44, meraxes: 37, vermithor: 26, cannibal: 24, silverwing: 24, caraxes: 25, dreamfyre: 22, meleys: 22, sheepstealer: 20,
};

/**
 * Where each of the ten rests when it is not in the air: where its chest is,
 * how high the ground under it is, and which way it faces, in degrees (0
 * east, 90 south). Landed, a dragon's head hangs about 0.3 of its length
 * ahead of its chest, and its body and tail lie out about 0.7 behind it.
 *
 * Balerion, the greatest, lies on the crown of the Dragonpit's dome, his
 * tail draped down it. Vhagar lies on a low dark rock in the bay
 * (`VHAGAR_ROCK`), her tail over its edge into the water. Dreamfyre lies in
 * the bronze doors, with her tail in the dark of the pit. On the Dragonmont
 * each lies at the mouth of a lair: a level shelf at its height, and behind
 * it a cave, dark inside, that its body and tail go into (`LAIR`). The
 * dragons' show, which flies them, is the main session's (`dragons.ts`).
 */
export const HOMES: Record<string, Home> = {
  balerion: { x: R.c[0], z: R.c[1], y: R.dome - 0.6, facing: 45, where: "the crown of the Dragonpit's dome" },
  vhagar: { x: 12, z: -30, y: 3, facing: 45, where: 'a low dark rock in the bay' },
  dreamfyre: { x: R.c[0], z: R.c[1] + R.drum + 1.5, y: R.y, facing: 90, where: 'in the bronze doors, her tail in the dark of the pit' },
  // the lower lairs, on the south-west and south faces and at the back
  sheepstealer: lair(150, 8, 120, 'his cave on the south-west flank, a sheep penned on the slope below it'),
  vermithor: lair(125, 11, 110, 'his smoking cavern on the south-west flank'),
  silverwing: lair(100, 9, 95, 'her cavern beside his'),
  cannibal: lair(-30, 10, -10, 'his lair at the back of the mountain, facing the Narrow Sea'),
  // the higher lairs, on the south and east faces
  meraxes: lair(80, 18, 80, 'a high lair on the south face'),
  caraxes: lair(40, 21, 45, 'a high lair on the south-east face'),
  meleys: lair(5, 18, 15, 'a high lair on the east face'),
};

/**
 * The low dark rock in the bay that Vhagar lies on: its middle, its half
 * sizes, and how high its level top stands. Its sides fall steeply to the
 * water. Ships and anything tall keep 16 from it.
 */
export const VHAGAR_ROCK = { x: 12, z: -30, hx: 9, hz: 6.5, top: 3 };

/** How high Vhagar's rock is at a place: its top over most of it, falling to the water at its edge; below the water where it is not. */
export function rockAt(x: number, z: number): number {
  const V = VHAGAR_ROCK, d = Math.hypot((x - V.x) / V.hx, (z - V.z) / V.hz);
  if (d >= 1) return -Infinity;
  if (d <= 0.78) return V.top;
  const t = (1 - d) / 0.22;
  return WATER_LEVEL + (V.top - WATER_LEVEL) * Math.sqrt(t);
}

/**
 * A lair, as shares of its dragon's length, in the dragon's own frame (ahead
 * is the way it faces): the level shelf it lies on, from `back` behind its
 * chest to `front` ahead of it and `half` to each side; and the cave behind
 * it, from the shelf's back to `cave` behind the chest, `caveHalf` to each
 * side and `roof` high over the shelf, dark inside. The cave's floor is at the
 * shelf's height all the way in, and the mountain is raised over it, so that
 * a dragon's body and tail lie in the rock.
 */
export const LAIR = { back: 0.2, front: 0.12, half: 0.17, cave: 0.82, caveHalf: 0.09, roof: 0.2 };

/**
 * The Dragonpit as a dragon lies on it: over the drum, the dome's surface,
 * level across its crown; and through the bronze doors, which face south, the
 * pit's floor at the terrace's height. Null off the drum.
 */
export function pitAt(x: number, z: number): number | null {
  const R = RHAENYS, dx = x - R.c[0], dz = z - R.c[1], d = Math.hypot(dx, dz);
  if (d > R.drum) return null;
  if (Math.abs(dx) < 4.5 && dz > 0) return R.y;
  return domeAt(d);
}

/** How high the dome's surface is at a distance from its middle: level across its crown, and falling to the top of the drum's wall at its edge. */
export function domeAt(d: number): number {
  const R = RHAENYS;
  if (d <= R.cap) return R.capY;
  const t = Math.min(1, (d - R.cap) / (R.drum - R.cap));
  return R.wall + (R.capY - R.wall) * Math.sqrt(1 - t * t);
}

/** The lair a place is in, if any: whose, the home, and whether on its shelf or in its cave. */
export function lairAt(x: number, z: number): { id: string; home: Home; part: 'shelf' | 'cave' } | null {
  for (const [id, h] of Object.entries(HOMES)) {
    if (!LAIR_IDS[id]) continue;
    const L = LENGTH[id], a = (h.facing * Math.PI) / 180, dx = x - h.x, dz = z - h.z;
    const along = dx * Math.cos(a) + dz * Math.sin(a), side = Math.abs(-dx * Math.sin(a) + dz * Math.cos(a));
    if (along <= LAIR.front * L && along >= -LAIR.back * L && side <= LAIR.half * L) return { id, home: h, part: 'shelf' };
    if (along < -LAIR.back * L && along >= -LAIR.cave * L && side <= LAIR.caveHalf * L) return { id, home: h, part: 'cave' };
  }
  return null;
}
/** The dragons whose homes are lairs on the Dragonmont. */
export const LAIR_IDS: Record<string, true> = { sheepstealer: true, vermithor: true, silverwing: true, cannibal: true, meraxes: true, caraxes: true, meleys: true };

/** How far a place is from the middle of the road at the Dragonmont's foot, and from its ring at the camp of the Sowing. */
function fromFootRoad(x: number, z: number): number {
  const road = ROADS.dragonstone.slice(2);
  let d = Math.abs(Math.hypot(x - TURNS.sowing.c[0], z - TURNS.sowing.c[1]) - TURNS.sowing.r) - 0.6;
  for (let i = 0; i + 1 < road.length; i++) {
    const [ax, az] = road[i], [bx, bz] = road[i + 1], ux = bx - ax, uz = bz - az, l2 = ux * ux + uz * uz;
    const t = Math.min(1, Math.max(0, ((x - ax) * ux + (z - az) * uz) / l2));
    d = Math.min(d, Math.hypot(x - ax - ux * t, z - az - uz * t));
  }
  return d;
}

/**
 * The Dragonmont's height as built: its natural slope; a level shelf before
 * each lair, cut into the slope behind it and built out over the slope before
 * it; and the road at its foot and the ring at the camp of the Sowing cut in,
 * level with the ground. Each lair's cave runs on into the rock behind its
 * shelf, under a mouth of rock that its builder raises at the shelf's back.
 */
export function mountBuilt(x: number, z: number): number {
  let y = mountAt(x, z);
  if (y <= 0) return 0;
  // the road and its ring: cut down to the ground, and the slope eased in beside them
  const d = fromFootRoad(x, z), cut = LANE + 2.5, ease = 4;
  if (d < cut) return 0;
  if (d < cut + ease) { const t = (d - cut) / ease; y *= t * t * (3 - 2 * t); }
  const at = lairAt(x, z);
  return at && at.part === 'shelf' ? at.home.y : y;
}

/**
 * How high what a dragon lands or lies on is, at a place: a lair's shelf, and
 * the floor of its cave, all the way in; the Dragonpit's terrace, and the
 * floor of the pit inside the bronze doors; the hills of King's Landing; the
 * Dragonmont as built; the water's surface; and the ground everywhere else.
 * For whoever lays a dragon down or flies it low.
 */
export function groundAt(x: number, z: number): number {
  const at = lairAt(x, z);
  if (at) return at.home.y;
  const rock = rockAt(x, z);
  if (rock > WATER_LEVEL) return rock;
  const pit = pitAt(x, z);
  if (pit !== null) return pit;
  const m = mountBuilt(x, z);
  if (m > 0) return m;
  const h = hillAt(x, z);
  if (h > 0) return h;
  if (inside(SANDS, x, z) && !Object.values(ISLANDS).some((shape) => inside(shape, x, z))) {
    if (x > DYKE.x0 && x < DYKE.x1 && z > DYKE.z0 && z < DYKE.z1) return DYKE.top;
    return sandbarAt(x, z) ?? SANDS_Y;
  }
  return isWater(x, z) ? WATER_LEVEL : 0;
}

// ---------------------------------------------------------------------------
// What the dragons' moments use
// ---------------------------------------------------------------------------

/**
 * The Velaryon fleet closing the Gullet, as it did in 129 AC: a line of ships
 * at anchor across it, east of High Tide, and two more off Hull. Each is where
 * its middle is, which way its bow points in degrees, and how long it is. They
 * stand still.
 */
export const FLEET: { x: number; z: number; heading: number; len: number }[] = [
  { x: 56, z: 79, heading: 80, len: 12 }, { x: 68, z: 76.5, heading: 86, len: 13 }, { x: 80, z: 79.5, heading: 92, len: 12 },
  { x: 91, z: 77, heading: 84, len: 13 }, { x: 100, z: 81, heading: 96, len: 10 },
  { x: 37, z: 18.5, heading: 0, len: 12 }, { x: 52, z: 19, heading: 180, len: 11 },
];

/**
 * The sheepfold by the Wendwater, in the kingswood: the fold's lot is
 * `sheepfold`, and the flock grazes the meadow round it, between the Rush and
 * the south road. `FLOCK` is where each sheep stands; the first stands a
 * little apart, nearest the water, and is the one Sheepstealer takes. It is
 * left out of what stands still, so that whoever flies him can carry it off
 * and bring it back.
 */
export const MEADOW: P2[] = [[-50, 88], [-12, 88.5], [-9, 93], [-14, 99.5], [-50, 98]];
export const FLOCK: P2[] = [
  [-21, 90.5], [-44, 91], [-41, 93.5], [-37, 97], [-27, 97.5], [-24, 95.5], [-29, 91.5], [-46, 95.5], [-33, 92], [-19, 97], [-42, 97.5], [-16, 93],
];

/**
 * Where the Dragonkeepers stand: in black armour with crested helms, two at
 * the bronze doors, one at the open vault, and others along the terrace's
 * south face and at the drovers' pen. Each is where it stands, how high, and
 * which way it faces in degrees.
 */
export const KEEPERS: { x: number; z: number; y: number; facing: number }[] = [
  { x: -66, z: -18.6, y: R.y, facing: 90 }, { x: -54, z: -18.6, y: R.y, facing: 90 },
  { x: -48.6, z: 10.5, y: 0, facing: 90 }, { x: -76, z: -5, y: R.y, facing: 90 }, { x: -44, z: -5, y: R.y, facing: 90 },
  { x: -36, z: -5.5, y: R.y, facing: 135 }, { x: -82, z: -5.5, y: R.y, facing: 45 }, { x: -36, z: -97, y: 0, facing: 0 },
];

/** The camp of the Sowing, at the Dragonmont's south-east foot, below the lairs: its ground, between the town's two rows. */
export const SOWING = { x0: 70.5, z0: -9.5, x1: 81.5, z1: -3 };


// ---------------------------------------------------------------------------
// What the opening view must see
// ---------------------------------------------------------------------------

/** Places the view the tile opens with is to see, checked against the plan's lots on every load. */
export const SIGHT: { id: string; x: number; y: number; z: number }[] = [
  { id: 'the bronze doors', x: -60, y: 10, z: -19.5 },
  { id: 'the forecourt ring', x: -58, y: R.y + 1.6, z: -1 },
  { id: 'the climb', x: -60, y: 4.6, z: 14 },
  { id: 'the foot of the climb', x: -60, y: 1.6, z: 30 },
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
