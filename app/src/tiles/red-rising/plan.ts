// The Iron Rain, as data. Nothing in this file draws anything.
//
// The Lion's Rain over Agea, from Golden Son: a slice of terraformed Mars as a
// dome that runs to the four edges of the board, with the city of Agea sunk
// in a trench of the Valles Marineris across its crown, the canyon's north
// wall rising behind it, the Augustan and Bellona fleets in the sky over the
// south and the east, and the Iron Rain falling from them.
//
// North is the board's north. What is tall stands in the north and the west
// of what it belongs to, because the view the tile opens with looks from the
// south-south-east and a thing hides what is north-west of it. Things in the
// air are seen further north-west than they are, by about 0.9 of their height
// each way, so the fleet flies over the south and the east.
//
// Units: 1 unit is 1 cm of toy. A lane is 5 wide and a car about 7 long.
// x points east, z points south, y points up. Traffic keeps right: the books
// do not say, and the collector left it to the tile.
//
// This file imports nothing, so that a script can read it as it is.

export type P2 = [number, number];
export type P3 = [number, number, number];

/** The board, as every tile has it. */
export const BOARD = { x0: -104, x1: 104, z0: -113, z1: 113 };

/** How wide a lane is. */
export const LANE = 5;

// ---------------------------------------------------------------------------
// The dome of Mars
// ---------------------------------------------------------------------------
//
// The planet's ground is a dome that is 0 at every edge of the board and rises
// to a broad crown in the north, where the canyon's rim is: a slice off the top
// of a globe, its curve a toy's, much stronger than any real horizon. Across
// the board it is the product of two curves, one from west to east and one
// from north to south, so that it is round near the crown and follows the
// edges near them. The north side falls fast, over the last thirty units; the
// south side falls slowly, over the whole south half, so that it faces the
// view the tile opens with.

export const DOME = {
  /** How high the crown is. */
  H: 40,
  /** Where the crown is, from north to south. */
  zc: -78,
  /** How sharply the curve falls at the edges: 0.5 is a globe's edge, 1 a gentle bowl turned over. */
  across: 0.6,
  along: 0.6,
};

/** How high the dome itself stands at a place, before anything is cut into it. */
export function domeAt(x: number, z: number): number {
  const u = x / 104, X = Math.pow(Math.max(0, 1 - u * u), DOME.across);
  const v = z < DOME.zc ? (z - DOME.zc) / (DOME.zc + 113) : (z - DOME.zc) / (113 - DOME.zc);
  const Z = Math.pow(Math.max(0, 1 - v * v), DOME.along);
  return DOME.H * X * Z;
}

// ---------------------------------------------------------------------------
// The trench: Agea's floor in the Valles Marineris
// ---------------------------------------------------------------------------
//
// Agea lies on the level floor of a trench cut into the crown. On the north
// the trench is the canyon's wall, a cliff as high as the crown is over the
// floor, 20 in the middle and less towards the ends as the dome falls away.
// On the south it is a low rim, on which the city's south wall stands. At its
// west and east ends the floor meets the dome, which falls on beyond it, so
// that the canyon runs on over the curve of the planet.

/** How high the floor of the trench is: the ground of the city. */
export const F = 20;

/** The trench's floor as a rounded oblong: where it is level, and how far its corners are rounded. */
export const TRENCH = { x0: -88, x1: 88, z0: -64, z1: 62, r: 18 };
/** How far the ground takes to rise from the floor to the dome: the canyon's wall on the north side, a slope elsewhere. */
export const CLIFF = { north: 14, other: 4 };

/** How far a place is outside the trench's floor: negative inside it. */
export function outOfTrench(x: number, z: number): number {
  const t = TRENCH, cx = (t.x0 + t.x1) / 2, cz = (t.z0 + t.z1) / 2;
  const hx = (t.x1 - t.x0) / 2 - t.r, hz = (t.z1 - t.z0) / 2 - t.r;
  const qx = Math.abs(x - cx) - hx, qz = Math.abs(z - cz) - hz;
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - t.r;
}

/** Whether a place lies inside an outline. */
export function inside(shape: P2[], x: number, z: number): boolean {
  let hit = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const a = shape[i], b = shape[j];
    if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

export const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * The snowy peaks on the dome's south-east, where the Reaper's squadron came
 * down on a snow-covered mountain (GS 38): three toy mountains standing on the
 * flank, their middles, how high each rises over the dome, and how far its
 * foot reaches.
 */
export const PEAKS: { c: P2; h: number; r: number }[] = [
  { c: [86, 92], h: 25, r: 14 },
  { c: [95, 80], h: 14, r: 8.5 },
  { c: [77, 104], h: 12, r: 8.5 },
];

/** On a peak, how far up it a place is: 0 at its foot and off the peaks, 1 at its summit. Snow lies from its shoulders up. */
export function peakShare(x: number, z: number): number {
  let s = 0;
  for (const p of PEAKS) {
    const d = Math.hypot(x - p.c[0], z - p.c[1]) / p.r;
    if (d < 1) s = Math.max(s, Math.pow(1 - d, 1.25));
  }
  return s;
}

/**
 * The mine on the south flank: a tiered round pit like Lykos's Common (RR 2,
 * 3), its middle, how far its rim reaches, how many tiers step down to its
 * floor, and how deep the floor is under the rim.
 */
export const MINE = { c: [22, 100] as P2, r: 9, tiers: 3, depth: 7.8 };

/** How far the peaks raise the ground at a place. */
function peaksAt(x: number, z: number): number {
  let y = 0;
  for (const p of PEAKS) {
    const d = Math.hypot(x - p.c[0], z - p.c[1]) / p.r;
    if (d >= 1) continue;
    // a ridge across each and crags down its sides, so that it is a mountain and not a cone
    const ridge = 0.85 + 0.15 * Math.cos(Math.atan2(z - p.c[1], x - p.c[0]) * 2 + p.c[0]);
    const crag = 1 + 0.2 * Math.sin(x * 1.1 + p.c[0]) * Math.sin(z * 1.3 + p.c[1]) * Math.min(1, d * 3);
    y = Math.max(y, p.h * ridge * crag * Math.pow(1 - d, 1.25));
  }
  return y;
}

/** How far the mine's pit takes the ground down at a place: a smooth bowl, which the flank's builder steps into tiers. */
export function pitAt(x: number, z: number): number {
  const d = Math.hypot(x - MINE.c[0], z - MINE.c[1]);
  if (d >= MINE.r) return 0;
  return MINE.depth * Math.min(1, Math.pow(1 - d / MINE.r, 0.7) * 1.15);
}

/**
 * How high the planet's ground is at a place, before the roads are cut into
 * it: the trench's floor in the trench, the dome beyond it, and between them
 * the canyon's wall or a slope. Where the dome is lower than the floor, at the
 * trench's south corners, the floor is carried out on a slope that falls to
 * the dome. The peaks stand on the dome, and the mine is dug into it. What is
 * cut for the roads is in land.ts.
 */
export function naturalAt(x: number, z: number): number {
  const d = outOfTrench(x, z), dome = domeAt(x, z) + peaksAt(x, z) * Math.min(1, Math.min(104 - Math.abs(x), 113 - Math.abs(z)) / 6) - pitAt(x, z);
  if (d <= 0) return F;
  // the wall is steep on the north, where the canyon's cliff is, and a slope elsewhere
  const north = smooth(-30, -50, z);
  const w = CLIFF.other + (CLIFF.north - CLIFF.other) * north;
  return F + (dome - F) * smooth(0, w, d);
}

// ---------------------------------------------------------------------------
// Water: the river under the north wall, and the lake it runs into
// ---------------------------------------------------------------------------
//
// The river comes over the canyon's rim in a fall beside the drone depot,
// crosses the apron under the ramps, runs under the north wall through its
// grates beside the North Gate and between mud banks, south along the Gate
// Avenue's east side, and ends in a lake by the Field of Mars. Running beside
// the avenue it keeps the avenue in sight of the view the tile opens with,
// which buildings on its east side would hide. It is the tile's own water, at
// the trench's floor, not the engine's, which mirrors the city about the
// board's ground.

/** How far below the floor the water lies. */
export const WATER_DROP = 0.8;
/** The river's middle, from the foot of the fall to the lake, and half its width. */
export const RIVER = { line: [[10, -64], [10, -50], [11, -40], [10, -20], [10, 0], [11, 18], [15, 29]] as P2[], half: 3 };
/** The lake the river runs into. */
export const LAKE: P2[] = [[11, 28], [32, 28], [36, 34], [35, 46], [28, 52], [15, 52], [10, 46], [9, 34]];
/** The fall where the river comes over the canyon's wall: where it leaves the plateau, and where it reaches the floor. */
export const FALL = { top: [10, -78] as P2, foot: [10, -64] as P2, half: 2.6 };

// ---------------------------------------------------------------------------
// The roads
// ---------------------------------------------------------------------------
//
// The pattern, which no other tile has: one road that climbs out of the canyon
// on a ramp across its north wall, runs over the crown of the planet along the
// rim, and comes back down a second ramp, the two ramps a V across the wall
// that meets on the apron before the North Gate. It turns at each end of the
// rim in a hairpin. The Gate Avenue tees into it there and runs south through
// the gate to the Field of Mars, where it turns round. Out of the South Gate a
// road runs down the planet's south flank to the Augustan camp. A few blocks
// of the lowColor quarter carry loops of their own. Traffic keeps right.
//
// Each road is its middle line, as corners on the ground. Heights are in
// roads.ts, from `RIM_Y`, `HAIRPIN_Y` and the ground.

/** The rim road over the crown, and the ramps, as one loop: its corners, and the hairpins' middles. */
export const LOOP = {
  /** The apron before the North Gate, where the ramps meet and the avenue tees in. */
  apron: { z: -58, x0: -14, x1: 6 },
  /** The west ramp, from the apron up across the canyon's wall to the west hairpin. */
  rampW: [[-14, -58], [-30, -62], [-50, -67], [-64, -71.5], [-70, -72]] as P2[],
  /** The east ramp, the same from the east, over the river on a bridge. */
  rampE: [[6, -58], [22, -62], [42, -67], [58, -71.5], [70, -72]] as P2[],
  /** The rim road over the crown, from the west hairpin to the east one. */
  rim: [[-70, -84], [-40, -84], [0, -84], [40, -84], [70, -84]] as P2[],
  /** The hairpins: their middles; each turns the road through half a circle of this radius. */
  hairpinW: [-70, -78] as P2,
  hairpinE: [70, -78] as P2,
  r: 6,
};
/** How high the hairpins are: the rim road's height at its ends. */
export const HAIRPIN_Y = 27.3;

/** The roads that are not the loop: their middles as corners on the ground. */
export const ROADS = {
  /** Through the North Gate and south down the Gate Avenue to the Field of Mars. */
  avenue: [[-4, -58], [-4, -40], [-4, -4], [-4, 32]] as P2[],
  /**
   * From the shield park down the river's east bank, east along Quarter Street, south through the lowColor
   * quarter and out of the South Gate, and down the planet's south flank to the camp.
   */
  south: [[46, -29], [46, 0], [70, 0], [70, 64], [56, 74], [20, 80], [-10, 86], [-31, 90]] as P2[],
};

/** Rings that a road turns back in: its middle and the middle of its one lane. */
export const TURNS = {
  field: { c: [-4, 40] as P2, r: 8 },
  shieldPark: { c: [46, -34] as P2, r: 5 },
  camp: { c: [-38, 90] as P2, r: 7 },
};

// ---------------------------------------------------------------------------
// The lots
// ---------------------------------------------------------------------------

export interface Lot {
  id: string;
  /** What it is called, for the board on its box while it is only a box. Empty for an ordinary building. */
  name: string;
  x0: number; z0: number; x1: number; z1: number;
  /** How high its top stands above y = 0, ground and all. */
  top: number;
  /** A part of something else: it is not blocked out as a box of its own. */
  part?: boolean;
}

const lot = (id: string, name: string, x0: number, z0: number, x1: number, z1: number, top: number, part = false): Lot => ({ id, name, x0, z0, x1, z1, top, part });
/** A lot on the city's floor, its height given above the floor. */
const onFloor = (id: string, name: string, x0: number, z0: number, x1: number, z1: number, h: number, part = false): Lot => lot(id, name, x0, z0, x1, z1, F + h, part);

export const LOTS: Lot[] = [
  // ============================ the walls ============================
  // The north wall closes the city from the canyon's apron. The river runs under it through grates beside the North Gate.
  onFloor('wall-n-w', 'Agea', -86, -51, -26, -48, 10),
  onFloor('ragnar-gate', 'The Postern', -26, -52, -18, -47, 12),
  onFloor('wall-n-m', '', -18, -51, -11, -48, 10),
  onFloor('north-gate', 'North Gate', -11, -53, 3, -45, 15),
  onFloor('grates', 'The Grates', 3, -52, 16, -47, 10),
  onFloor('wall-n-e', '', 16, -51, 86, -48, 10),
  // The south wall stands on the trench's low south rim, and the road to the camp leaves through its gate.
  onFloor('wall-s-w', '', -82, 59, 60, 62, 8),
  onFloor('south-gate', 'South Gate', 60, 56, 80, 64, 12),
  onFloor('wall-s-e', '', 80, 59, 84, 62, 8),

  // ============================ the canyon and the plateau ============================
  // The canyon's north wall, dressed: hangars along its foot, barracks windows, the drone depot in its face.
  lot('canyon-wall', 'Valles Marineris', -88, -78, 88, -64, 0, true),
  lot('depot', 'Drone Depot', -12, -76, 4, -66, 28, true),
  // The Institute's gate building on the plateau above the canyon, its marble square looking out over Agea.
  // Its square stands at 35.1 as built, so the gate building rises to 44: a front some twelve high over its forecourt.
  lot('institute', 'The Institute', -58, -105, -34, -93, 44),
  // The guns stand on the crest, which the road's bench has raised to 38 and more; the east battery stops short of the snow.
  lot('guns-w', '', -24, -98, -10, -90, 41),
  lot('guns-e', '', 22, -98, 34, -90, 41),
  // Olympus floats over the canyon's east end, a mountain the wrong way up with a marble citadel on it.
  lot('olympus', 'Olympus', 62, -76, 82, -56, 62, true),

  // ============================ the commercial district: the towers ============================
  // Kilometre-high blades of steel and glass on a podium, a garden of jewelled blades by night. The tallest
  // stand furthest west, and they step down towards the south-east, so that the west ramp stays in sight.
  onFloor('podium', '', -84, -42, -16, -8, 1.2),
  onFloor('tower-1', '', -80, -40, -68, -28, 66),
  onFloor('tower-2', '', -62, -40, -52, -30, 58),
  onFloor('tower-3', '', -46, -40, -37, -31, 30),
  onFloor('tower-4', '', -80, -24, -68, -12, 54),
  onFloor('tower-5', '', -62, -26, -52, -14, 46),
  onFloor('tryst', 'Tryst', -32, -40, -22, -30, 28),
  onFloor('tower-6', '', -46, -26, -37, -17, 40),
  onFloor('temptation', 'Temptation', -32, -24, -22, -14, 24),

  // ============================ the centre, east of the river ============================
  // Set back across the river from the avenue, so that they do not hide it.
  onFloor('centre-1', '', 18, -40, 28, -31, 8),
  onFloor('centre-2', '', 30, -40, 36, -31, 22),
  onFloor('centre-3', '', 18, -26, 28, -14, 16),
  onFloor('centre-4', '', 30, -26, 36, -14, 14),
  onFloor('centre-5', '', 18, -8, 28, 14, 12),
  onFloor('centre-6', '', 30, -8, 36, 14, 10),
  onFloor('centre-7', '', 18, 18, 36, 24, 8),

  // ============================ the shield park ============================
  // The generators of the shield over the city: four pylons in a park on its east side, and their station.
  onFloor('shield-park', 'Shield Park', 56, -44, 86, -8, 4),
  onFloor('pylon-nw', '', 58, -42, 62, -38, 22),
  onFloor('pylon-ne', '', 80, -42, 84, -38, 22),
  onFloor('pylon-sw', '', 58, -14, 62, -10, 22),
  onFloor('pylon-se', '', 80, -14, 84, -10, 22),

  // ============================ the lowColor quarter ============================
  // Low and dense, south of Quarter Street and on either side of the road to the South Gate.
  onFloor('low-1', '', 50, 6.65, 62, 20, 8),
  onFloor('low-2', '', 78, 6, 86, 20, 8),
  onFloor('low-3', '', 50, 26, 62, 44, 12),
  onFloor('low-4', '', 78, 26, 86, 42, 9),
  onFloor('low-6', '', 50, 48, 62, 56, 8),
  onFloor('market', 'Market', 38, 30, 46, 50, 5),

  // ============================ the Citadel ============================
  // The seat of the government, white and red spires in a cluster behind an outer wall, lions of House Augustus at its gate.
  onFloor('citadel', 'The Citadel', -76, 2, -42, 36, 76),
  onFloor('citadel-wall', '', -82, -2, -32, 56, 7, true),
  onFloor('bunker', 'Bunker', -62, 40, -52, 50, 4),
  // The terrace on the Citadel's south-east, above its lawns, where Lorn taught the Willow Way.
  onFloor('terrace', 'The Terrace', -46, 38, -36, 52, 5),
  // The landing pads, raised on the Citadel's east side: the Sovereign's shuttle and three decoys.
  onFloor('pads', 'Landing Pads', -30, 2, -12, 26, 6),
  // The Field of Mars: a plaza of white stone round the avenue's turning ring.
  onFloor('field', 'Field of Mars', -24, 30, 2, 54, 0.4, true),

  // ============================ the south flank, outside the walls ============================
  // The ground under the camp's east end is at 21 to 23, so its tents and pavilion have room up to 27.
  lot('camp', 'Augustan Camp', -76, 64, -24, 78, 27),
  // The mine's north rim is at 16: its top leaves room for a lamp or a mast there.
  lot('mine', 'The Mine', 4, 90, 40, 110, 18, true),
  lot('peaks', '', 70, 76, 102, 110, 22, true),
];

export const lotOf = (id: string): Lot => {
  const l = LOTS.find((x) => x.id === id);
  if (!l) throw new Error(`no lot ${id}`);
  return l;
};

// ---------------------------------------------------------------------------
// Places for a hero
// ---------------------------------------------------------------------------

export const HERO_SPOTS: { id: string; x: number; z: number; y: number; heading: number; where: string }[] = [
  // the square as built stands at 35.13: the rim road's bench has raised the ground beside the road above the natural ground
  { id: 'institute', x: -46, z: -91.2, y: 35.17, heading: 0, where: "the marble square before the Institute's gates, on the plateau, looking out over Agea" },
  // at the deck's south-east corner, at the head of the ramp up from the avenue: the deck before the shuttles' ramps is the stories'
  { id: 'pad', x: -17.4, z: 23.1, y: F + 6.04, heading: 0, where: "the landing pads' deck, at the head of its ramp, beside the Sovereign's shuttles" },
  { id: 'field', x: -18, z: 51, y: F + 0.44, heading: 0, where: 'the Field of Mars, on its white stone' },
  { id: 'tryst', x: -27, z: -34, y: F + 28.04, heading: 0, where: "the deck of Tryst, the club on a tower's roof" },
  // level with the ground under the bay's highest corner, the north-east, so that no corner of a car sinks into the slope
  { id: 'camp', x: -30, z: 72, y: naturalAt(-26.1, 70.45) + 0.15, heading: 0, where: "the Augustan camp's motor pool, among the spider tanks" },
  { id: 'shield-park', x: 64, z: -24, y: F + 0.04, heading: 0, where: "the drive through the shield park, among the generators' pylons" },
];

// ---------------------------------------------------------------------------
// The stages of the stories
// ---------------------------------------------------------------------------
//
// Where the cast act out their stories (show.ts). A stage's ground is kept
// clear for them: nothing that a figure would walk through stands on it, and
// nothing taller than a person stands between it and the view the tile opens
// with, but what the stage's own story needs and the builder is asked for.
// `y` is the height of the stage's ground.

export const STAGES: Record<string, { x0: number; z0: number; x1: number; z1: number; y: number; what: string }> = {
  banks: { x0: 4, z0: -47, x1: 18, z1: -37, y: F, what: 'the mud banks inside the grates, where the group comes up out of the river (story 2)' },
  postern: { x0: -30, z0: -46, x1: -14, z1: -36, y: F, what: 'inside the postern, where its doors swing open and the infantry march in (story 3)' },
  wallWalk: { x0: -30, z0: -51, x1: 25, z1: -48, y: F + 10, what: "the north wall's walk, from the postern to the grates: Cassius watches here, Ragnar fights the Wind Knight on the postern's tower (stories 2, 3)" },
  park: { x0: 58, z0: -42, x1: 84, z1: -10, y: F, what: 'the lawn among the four pylons, where Mustang sets her charges (story 5)' },
  pads: { x0: -30, z0: 2, x1: -12, z1: 26, y: F + 6, what: "the landing pads: the Sovereign's shuttle and its three decoys, her guard, the fights round Aja (stories 6, 9)" },
  outside: { x0: -24, z0: 63, x1: 34, z1: 76, y: 0, what: "the flank outside the south wall, where Lorn's force charges and falls back (story 7); its ground is the flank's" },
  southWalk: { x0: -24, z0: 59, x1: 34, z1: 62, y: F + 8, what: "the south wall's walk, where the defenders stand and Lorn comes over (story 7)" },
  terrace: { x0: -46, z0: 38, x1: -36, z1: 52, y: F + 5, what: "the Citadel's terrace, where Lorn and Darrow spar and a boy sits on the steps (story 8)" },
  snow: { x0: 34, z0: -100, x1: 70, z1: -88, y: 0, what: 'the snow on the plateau, where Ragnar and Aja duel and the griffins land (story 10); its ground is the plateau\'s' },
  howl: { x0: -46, z0: -26, x1: -37, z1: -17, y: F + 40, what: "tower 6's roof, flat and open, where the Howlers drop in and howl (story 12)" },
  perch: { x0: -80, z0: -40, x1: -68, z1: -28, y: F + 66, what: "tower 1's roof, where the Jackal watches" },
};

// ---------------------------------------------------------------------------
// The camp, and the spider tanks
// ---------------------------------------------------------------------------

/**
 * The Augustan camp on the south flank: where the cast who rest there stand (show.ts), which the camp's builder
 * keeps open, each with 1.5 clear round it; and its motor pool, where two spider tanks stand parked (traffic.ts),
 * facing east, north of the place for a hero.
 */
export const CAMP = {
  posts: [[-40, 70], [-62, 68.5], [-65, 70.5], [-36.6, 71], [-38, 73.2], [-52, 73.5], [-48.8, 73.5], [-45.6, 73.5], [-42.4, 73.5], [-52, 76.1], [-48.8, 76.1], [-45.6, 76.1], [-42.4, 76.1]] as P2[],
  /** Round Kavax, at the second post, his fox trots a ring this far out. */
  fox: 2.4,
  parked: [[-35, 66.3], [-27.5, 66.3]] as P2[],
};

/** The round two spider tanks walk on the south flank, east of the mine and west of the peaks: its corners, on the ground. */
export const SPIDER_PATROL: P2[] = [[46, 90], [58, 86], [66, 94], [58, 104], [46, 100]];

// ---------------------------------------------------------------------------
// The sky
// ---------------------------------------------------------------------------

/** The shield over the city: an ellipsoid, its middle on the floor, and how far it reaches each way. */
export const SHIELD = { c: [0, F, -2] as P3, rx: 86, ry: 84, rz: 64 };

/** Where the fleets fly: the Augustans over the east, the Bellona over the south. Boxes in the air, low corner and high corner. */
export const FLEET = {
  augustan: { x0: 74, x1: 100, z0: -70, z1: 100, y0: 54, y1: 82 },
  bellona: { x0: -40, x1: 66, z0: 74, z1: 108, y0: 50, y1: 72 },
};

/** Where the Iron Rain lands while the shield stands, and where it lands once it is down. */
export const LANDINGS = {
  west: { x0: -100, x1: -90, z0: -40, z1: 30 },
  east: { x0: 90, x1: 100, z0: -40, z1: 30 },
  plateau: { x0: -4, x1: 16, z0: -100, z1: -90 },
  flank: { x0: -10, x1: 40, z0: 68, z1: 80 },
  peaks: { x0: 72, x1: 98, z0: 76, z1: 104 },
  // the Field of Mars west of its ring: the one stretch of open floor inside the walls with room for a few husks to fall open
  city: { x0: -25, x1: -16.5, z0: 29, z1: 55 },
};

// ---------------------------------------------------------------------------
// What the view the tile opens with must see
// ---------------------------------------------------------------------------

export const SIGHT: { id: string; x: number; y: number; z: number }[] = [
  { id: 'the North Gate', x: -4, y: F + 8, z: -44.9 },
  { id: 'the postern', x: -22, y: F + 6, z: -47 },
  { id: 'the grates', x: 10, y: F + 3, z: -47 },
  { id: 'the west ramp, halfway', x: -40, y: F + 3.5, z: -65 },
  { id: 'the east ramp, halfway', x: 32, y: F + 3.5, z: -65 },
  { id: 'the rim road at the crown', x: 0, y: domeAt(0, -84) + 1.6, z: -84 },
  { id: 'the rim road, west', x: -40, y: domeAt(-40, -84) + 1.6, z: -84 },
  { id: 'the rim road, east', x: 40, y: domeAt(40, -84) + 1.6, z: -84 },
  { id: "the Institute's square", x: -46, y: 36.7, z: -91.2 },
  { id: 'the fall', x: 10, y: F + 10, z: -70 },
  { id: 'the landing pads', x: -21, y: F + 7, z: 14 },
  { id: 'the Field of Mars', x: -4, y: F + 1.6, z: 46 },
  { id: 'the shield park', x: 62, y: F + 3, z: -26 },
  { id: "the Citadel's gate", x: -34, y: F + 4, z: 20 },
  { id: 'the terrace', x: -41, y: F + 6.5, z: 45 },
  { id: 'the mud banks', x: 11, y: F + 1, z: -42 },
  { id: 'the avenue', x: -4, y: F + 1.6, z: -20 },
  { id: 'the avenue, south', x: -4, y: F + 1.6, z: 10 },
  { id: 'the south wall', x: 10, y: F + 6, z: 62.4 },
];
