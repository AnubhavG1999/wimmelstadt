// Gotham City, as data. Nothing in this file draws anything.
//
// The comics' Gotham squeezed onto one board, bearings kept and distances not:
// the mainland with Wayne Manor on Crest Hill across the Gotham River in the
// north, Arkham on Mercey Island in the north-west, the Sprang River cut
// diagonally through the middle, Old Gotham on its west bank and Uptown and
// the East End on its east bank, and Gotham Harbor and the bay in the
// south-east, with Blackgate and the Statue of Justice on their islets.
//
// The view the tile opens with looks from the south-south-east, and a thing
// hides what is north-west of it. The Sprang runs almost exactly along that
// line, so the river is a corridor that the view looks straight up, between
// its two quays and under its bridges, to Arkham's gate at the far end. What
// is tall stands in the west: Old Gotham's towers on the upper city, Wayne
// Tower over them. Everything else is low.
//
// The city stands on several levels. The quays are at 0. Old Gotham's upper
// city is a terrace at 8 behind retaining walls, which Grand Avenue climbs on
// a ramp along its south face, and its towers stand on a second terrace at 13,
// the Crown. Uptown is a bluff at 6 over the Gotham River, whose north bank is
// a shelf at 4 under Crest Hill's cliff, so that the Kane Bridge and the
// Trigate cross the river well above the water. Crest Hill is 10, and Arkham
// stands on a crag at 9.
//
// Units: 1 unit is 1 cm of toy. A lane is 5 wide and a car about 7 long.
// x points east, z points south, y points up. Traffic keeps right.
//
// This file imports nothing, so that a script can read it as it is.

export type P2 = [number, number];
export type P3 = [number, number, number];

/** The board, as every tile has it. */
export const BOARD = { x0: -104, x1: 104, z0: -113, z1: 113 };

/** How wide a lane is. */
export const LANE = 5;

/** The levels the city stands on. */
export const Y = {
  water: -0.9,
  /** The quays, the East End, the docks, the park. */
  quay: 0,
  /** The shelf under Crest Hill that the river road runs on, the Trigate, and Mercey Island's low ground. */
  shelf: 4,
  /** Uptown's bluff over the Gotham River. */
  bluff: 6,
  /** Old Gotham's upper city, and the Crown its towers stand on. */
  upper: 8,
  crown: 13,
  /** Crest Hill's top, under Wayne Manor. */
  crest: 10,
  /** The floor of the Batcave and of the waterfall's cove. */
  cave: 4.2,
  /** Mercey Island: its low ground, level with the Trigate, and the crag Arkham stands on. */
  isle: 4,
  crag: 9,
};

// ---------------------------------------------------------------------------
// Small sums
// ---------------------------------------------------------------------------

export const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Whether a place lies inside an outline. */
export function inside(shape: P2[], x: number, z: number): boolean {
  let hit = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const a = shape[i], b = shape[j];
    if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

/** How far a place is from the edge of an outline. */
export function toEdge(shape: P2[], x: number, z: number): number {
  let d = Infinity;
  for (let i = 0; i < shape.length; i++) {
    const a = shape[i], b = shape[(i + 1) % shape.length], vx = b[0] - a[0], vz = b[1] - a[1], l = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l));
    d = Math.min(d, Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t));
  }
  return d;
}

/** A circle as an outline. */
export const circle = (cx: number, cz: number, r: number, n = 20): P2[] => Array.from({ length: n }, (_, i): P2 => [cx + Math.cos((i / n) * Math.PI * 2) * r, cz + Math.sin((i / n) * Math.PI * 2) * r]);

// ---------------------------------------------------------------------------
// The Sprang River
// ---------------------------------------------------------------------------
//
// It leaves the reach by Mercey Island at `a` and runs south-east to the
// harbour at `b`, along the line the opening view looks up. A place on it is
// given by how far along it is from `a`, and how far to the north-east of its
// middle (to the south-west if negative).

export const SPRANG = {
  a: [-46, -56] as P2,
  b: [30, 29] as P2,
  /** Half its width, from its middle to either quay's edge. */
  half: 7,
  /** How far from its middle the quay roads' middles run. */
  road: 14,
  /** How far from its middle the built fronts stand: beyond the quay road and its sidewalk. */
  front: 22,
  /** How far along it its two bascule bridges cross. */
  north: 40,
  south: 100,
};
const SL = Math.hypot(SPRANG.b[0] - SPRANG.a[0], SPRANG.b[1] - SPRANG.a[1]);
/** The way the Sprang runs, and the way across it to the north-east. */
export const SPRANG_ALONG: P2 = [(SPRANG.b[0] - SPRANG.a[0]) / SL, (SPRANG.b[1] - SPRANG.a[1]) / SL];
export const SPRANG_ACROSS: P2 = [SPRANG_ALONG[1], -SPRANG_ALONG[0]];
export const SPRANG_LENGTH = SL;

/** A place by the Sprang: `t` along it from its north end, `d` to the north-east of its middle. */
export const sprang = (t: number, d = 0): P2 => [SPRANG.a[0] + SPRANG_ALONG[0] * t + SPRANG_ACROSS[0] * d, SPRANG.a[1] + SPRANG_ALONG[1] * t + SPRANG_ACROSS[1] * d];

/** Where a place is by the Sprang: how far along it, and how far to the north-east of its middle. */
export function bySprang(x: number, z: number): { t: number; d: number } {
  const ex = x - SPRANG.a[0], ez = z - SPRANG.a[1];
  return { t: ex * SPRANG_ALONG[0] + ez * SPRANG_ALONG[1], d: ex * SPRANG_ACROSS[0] + ez * SPRANG_ACROSS[1] };
}

// ---------------------------------------------------------------------------
// The lands
// ---------------------------------------------------------------------------
//
// The whole board is water, and the lands are laid over it, each with a wall
// round it down into the water.

/** Where the bay's shore of Old Gotham runs: from the Battery at the Sprang's mouth south-west to the south edge. */
export const BAY_SHORE = { from: [24, 43] as P2, to: [-44, 113] as P2 };
const BL = Math.hypot(BAY_SHORE.to[0] - BAY_SHORE.from[0], BAY_SHORE.to[1] - BAY_SHORE.from[1]);
export const BAY_ALONG: P2 = [(BAY_SHORE.to[0] - BAY_SHORE.from[0]) / BL, (BAY_SHORE.to[1] - BAY_SHORE.from[1]) / BL];
/** The way inland from the bay's shore: north-west. */
export const BAY_INLAND: P2 = [-BAY_ALONG[1], BAY_ALONG[0]];
/** A place by the bay's shore: `s` along it from the Battery, `d` inland. */
export const bay = (s: number, d = 0): P2 => [BAY_SHORE.from[0] + BAY_ALONG[0] * s + BAY_INLAND[0] * d, BAY_SHORE.from[1] + BAY_ALONG[1] * s + BAY_INLAND[1] * d];

/** Tricorner: how wide the channel between it and the bay's shore is, and how far out from the shore its seaward side lies. */
export const TRICORNER = { channel: 11, reach: 34 };

/**
 * How high anything on Tricorner may stand at a place, so that the bay's shore and its road stay in sight behind
 * it from the view the tile opens with: low along the channel, and rising towards the island's seaward side. A
 * crane's jib, a mast or a lighthouse's lantern may rise 8 over it.
 */
export function tricornerCeiling(x: number, z: number): number {
  const out = -((x - BAY_SHORE.from[0]) * BAY_INLAND[0] + (z - BAY_SHORE.from[1]) * BAY_INLAND[1]);
  return Math.min(14, 4 + 0.7 * Math.max(0, out - TRICORNER.channel));
}

export const LANDS: Record<string, P2[]> = {
  /** Old Gotham, Midtown and Robinson Park, on the Sprang's west bank. */
  west: [[-104, -56], sprang(-6.26, -7), sprang(SL, -7), [27, 38], BAY_SHORE.from, BAY_SHORE.to, [-104, 113]],
  /** Uptown, the East End and the docks, on its east bank. The dock cut is let into the docks. */
  east: [sprang(14.31, 7), [104, -50], [104, 50], [98, 50], [98, 40], [88, 40], [88, 50], [58, 50], [58, 38], [46, 38], sprang(SL, 7)],
  /** Bristol, on the mainland north of the Gotham River: Crest Hill, and the shelf the river road runs on. */
  bristol: [[-22, -113], [104, -113], [104, -67], [-18, -67], [-22, -71]],
  /** Mercey Island, in the reach north-west of the city. */
  mercey: [[-100, -102], [-94, -109], [-72, -110], [-60, -104], [-52, -92], [-52, -70], [-58, -64], [-82, -64], [-96, -70], [-102, -84]],
  /** Blackgate Isle, in the bay. */
  blackgate: [[68, 78], [88, 75], [94, 84], [90, 94], [72, 95], [66, 87]],
  /** The islet of the Statue of Justice. */
  justice: circle(44, 97, 6.5, 8),
  /**
   * Tricorner, the city's southern point in the comics, an island joined to the rest by three bridges: here it lies
   * off the bay's shore across a channel 11 wide, and runs to the board's south edge.
   */
  tricorner: [bay(14, -TRICORNER.channel), bay(22, -TRICORNER.reach), bay(64.6, -TRICORNER.reach), bay(86.9, -TRICORNER.channel)],
};

/** The upper city of Old Gotham: a terrace behind retaining walls, with a bastion at its south-west corner where Grand Avenue arrives. */
export const UPPER: P2[] = [[-104, -14], [-44, -14], [-44, 10], [-24, 10], [-24, 58], [-84, 58], [-84, 74], [-104, 74]];

/** The Crown: the terrace on the upper city that Old Gotham's towers stand on, Wayne Tower at its south-east corner. */
export const CROWN: P2[] = [[-104, -14], [-62, -14], [-62, 41.5], [-104, 41.5]];

/** Uptown's bluff over the Gotham River, stepped back from the Sprang's east quay. */
export const BLUFF: P2[] = [[-11, -50], [104, -50], [104, -14], [21, -14], [21, -24], [12.1, -24], [12.1, -34], [3.2, -34], [-4, -42]];

/**
 * The ramp Grand Avenue climbs, along the south face of the upper city: from
 * the quay at its east end up to the bastion at its west end.
 */
export const RAMP = { x0: -84, x1: -34, z0: 58, z1: 74 };

/** Crest Hill: where its cliff stands over the river road, how far it reaches, and what is cut into it. */
export const CREST = {
  /** The cliff's face. */
  cliff: -85,
  west: [-22, -15] as P2,
  east: [86, 101] as P2,
  /** North of this the top falls towards the board's edge, so that it hides nothing of whichever tile stands behind. */
  north: [-108, -113] as P2,
  /** A spur of rock that the service lane ends at, with the old tunnel's mouth in its west face. */
  spur: { x0: 64, x1: 70, z1: -81 },
  /** The Batcave, cut open to the sky and to the view. Its back, under the Manor's terrace, is roofed. */
  cave: { x0: 6, x1: 50, z0: -97, z1: -85, roofed: -94 },
  /** The cove the waterfall falls into, and the Batmobile comes out through. */
  cove: { x0: -14, x1: -2, z0: -93, z1: -85 },
};

/** The crag Arkham stands on, on Mercey Island. */
export const CRAG: P2[] = [[-98, -100], [-92, -106], [-72, -107], [-63, -100], [-62, -90], [-68, -86], [-92, -86], [-99, -91]];
/** How far the crag's sides take to fall to the island's low ground. */
export const CRAG_SLOPE = 3.5;

/** The knoll in Robinson Park that Finger Castle stands on. */
export const KNOLL = { c: [-88, -44] as P2, r: 11, h: 5 };

/** How high Crest Hill is at a place on the mainland. */
function crestAt(x: number, z: number): number {
  const C = CREST;
  if (z > C.cliff) return x > C.spur.x0 && x < C.spur.x1 && z < C.spur.z1 ? Y.crest : Y.shelf;
  if (x > C.cave.x0 && x < C.cave.x1 && z > C.cave.z0) return Y.cave;
  if (x > C.cove.x0 && x < C.cove.x1 && z > C.cove.z0) return Y.cave;
  const ends = Math.min(smooth(C.west[0], C.west[1], x), 1 - smooth(C.east[0], C.east[1], x));
  const back = 1 - 0.5 * smooth(C.north[0], C.north[1], z);
  return Y.shelf + (Y.crest - Y.shelf) * ends * back;
}

/** How high Mercey Island is at a place on it. */
export function merceyAt(x: number, z: number): number {
  if (inside(CRAG, x, z)) return Y.crag;
  return Y.isle + (Y.crag - Y.isle) * (1 - smooth(0, CRAG_SLOPE, toEdge(CRAG, x, z)));
}

/**
 * How high the ground is at a place, by the plan: the water, a land's level,
 * the upper city, the bluff, the ramp, Crest Hill with what is cut into it,
 * Mercey Island's crag, the park's knoll.
 */
export function groundAt(x: number, z: number): number {
  if (inside(CROWN, x, z)) return Y.crown;
  if (inside(UPPER, x, z)) return Y.upper;
  if (x >= RAMP.x0 && x <= RAMP.x1 && z >= RAMP.z0 && z <= RAMP.z1) return Y.upper * Math.min(1, Math.max(0, (RAMP.x1 - x) / (RAMP.x1 - RAMP.x0)));
  if (inside(BLUFF, x, z)) return Y.bluff;
  if (inside(LANDS.west, x, z)) {
    const d = Math.hypot(x - KNOLL.c[0], z - KNOLL.c[1]);
    return d < KNOLL.r ? KNOLL.h * (1 - smooth(4, KNOLL.r, d)) : Y.quay;
  }
  if (inside(LANDS.east, x, z)) return Y.quay;
  if (inside(LANDS.bristol, x, z)) return crestAt(x, z);
  if (inside(LANDS.mercey, x, z)) return merceyAt(x, z);
  if (inside(LANDS.tricorner, x, z)) return Y.quay;
  if (inside(LANDS.blackgate, x, z)) return 2;
  if (inside(LANDS.justice, x, z)) return 1.5;
  return Y.water;
}

/** Whether a place is water. */
export const inWater = (x: number, z: number): boolean => !Object.values(LANDS).some((l) => inside(l, x, z));

// ---------------------------------------------------------------------------
// The roads
// ---------------------------------------------------------------------------
//
// The pattern, which no other tile has. A junction over water: the Trigate,
// three arms meeting in a ring over the reach. The circuit of the river: over
// the Kane Bridge, along the shelf under Crest Hill past the Batcave and the
// waterfall, round the Trigate and out to Arkham's gate, and back along
// Uptown's river street. The Sprang's two quays as one ring over two bascule
// bridges, straight up the middle of the view. Grand Avenue, which climbs a
// ramp along the wall of the upper city, turns back on its bastion and runs
// along the terrace's rim above its own ramp. And lanes that are the show's
// own, which no traffic enters: the service lane under the cliff, from the
// waterfall to the old tunnel, and the apron of the docks.
//
// No route shares a lane with another, and none crosses another on the level.

/** The Trigate: the middle of its ring, the ring's radius (the middle of its one lane), and where each arm leads. */
export const TRIGATE = {
  c: [-36, -64] as P2,
  r: 8,
  /** The corner where the arm from Uptown meets River Street. */
  uptown: [3.5, -42] as P2,
  /** The corner where the arm from Bristol meets the river road. */
  bristol: [-14, -75] as P2,
  /** The ring before Arkham's gate, where the island's arm ends. */
  arkham: { c: [-62, -73.5] as P2, r: 5.5 },
};

/** The circuit of the river, from the Trigate's Uptown arm round to its Bristol arm: River Street, the Kane Bridge, the river road. */
export const CIRCUIT = {
  riverStreet: -42,
  bridge: 80,
  riverRoad: -75,
};

/** The Kane Memorial Bridge: its two towers stand on the banks. */
export const KANE = { x: 80, z0: -67, z1: -50, north: Y.shelf, south: Y.bluff };

/** The Sprang's ring: its four corners, the two quays' roads joined over the two bascule bridges. Walked this way round, the river is on the left. */
export const RING: P2[] = [sprang(SPRANG.north, -SPRANG.road), sprang(SPRANG.south, -SPRANG.road), sprang(SPRANG.south, SPRANG.road), sprang(SPRANG.north, SPRANG.road)];

/** Rings that a road turns back in: its middle and the middle of its one lane. */
export const TURNS = {
  battery: { c: bay(14, 8), r: 5.5 },
  market: { c: [-52, 102] as P2, r: 5.5 },
  avenueFoot: { c: [-28, 66.5] as P2, r: 5.5 },
  rim: { c: [-33, 49.5] as P2, r: 5.5 },
  harbourWest: { c: [46, 18] as P2, r: 5.5 },
  harbourEast: { c: [95, 18] as P2, r: 5.5 },
};

/** The roads that go there and back, as the corners of their middles between their two rings. */
export const ROADS = {
  /** Along the bay's shore from the Battery to the fish market. */
  bayshore: [TURNS.battery.c, bay(80, 8), TURNS.market.c] as P2[],
  /** Grand Avenue: from the quay up the ramp to the bastion, round on it, and east along the rim. */
  avenue: [TURNS.avenueFoot.c, [-95, 66.5], [-95, 49.5], TURNS.rim.c] as P2[],
  /** Harbour Road, behind the docks. */
  harbour: [TURNS.harbourWest.c, TURNS.harbourEast.c] as P2[],
};

/** How high Grand Avenue is at a place along its ramp. */
export const avenueY = (x: number, z: number): number => (z > RAMP.z0 ? Y.upper * Math.min(1, Math.max(0, (RAMP.x1 - x) / (RAMP.x1 - RAMP.x0))) : Y.upper);

/**
 * The lanes of the show, which no traffic enters. The service lane runs under
 * Crest Hill's cliff from the waterfall's cove to the old tunnel's mouth, on
 * the cliff's side of the river road. The apron is the docks' quay, from the
 * Sprang's mouth to the dock cut and over its drawbridge.
 */
export const SHOW_LANES = {
  service: { z: -82.5, x0: -2, x1: 63, y: Y.shelf },
  apron: { z: 47, x0: 60, x1: 103, y: Y.quay },
};

// ---------------------------------------------------------------------------
// The lots
// ---------------------------------------------------------------------------

export interface Lot {
  id: string;
  /** What it is called, for the board on its box while it is only a box. Empty for an ordinary building. */
  name: string;
  x0: number; z0: number; x1: number; z1: number;
  /** The level of the ground it stands on. */
  base: number;
  /** How high its top stands above y = 0, ground and all. A ceiling for its builder, not a roof to lie on. */
  top: number;
  /** A part of something else, or open ground with low things on it: it is not blocked out as a box. */
  part?: boolean;
  /** Which file builds it. */
  file: string;
}

const LOT_LIST: Lot[] = [];
const lot = (file: string, id: string, name: string, x0: number, z0: number, x1: number, z1: number, base: number, h: number, part = false): void => {
  LOT_LIST.push({ id, name, x0, z0, x1, z1, base, top: base + h, part, file });
};

// ============================ the upper city: Old Gotham's towers ============================
// What is tall stands along the west edge, where what it hides falls off the board, and Wayne Tower stands
// before it with nothing south of it but the rim road and the drop.
lot('towers', 'wayne-tower', 'Wayne Tower', -82, 18, -64, 36, Y.crown, 87);
lot('towers', 'wayne-forecourt', '', -82, 36, -64, 41.5, Y.crown, 0.2, true);
lot('towers', 'kane-building', 'Kane Building', -102, 8, -88, 22, Y.crown, 67);
lot('towers', 'elliot-tower', 'Elliot Tower', -102, 26, -88, 40, Y.crown, 55);
lot('towers', 'cathedral', 'Gotham Cathedral', -102, -12, -88, 4, Y.crown, 45);
lot('towers', 'foundation', 'Wayne Foundation', -84, 2, -70, 14, Y.crown, 19);
// ============================ the upper city: the civic quarter ============================
lot('civic', 'university', 'Gotham University', -84, -12, -70, -2, Y.crown, 13);
lot('civic', 'quad', '', -60, -12, -46, 6, Y.upper, 0.2, true);
// The library and the courthouse front the rim road, where their steps are in sight; police headquarters and
// City Hall stand behind them, and the police roof, with the Bat-Signal's lamp, is higher than either.
lot('civic', 'gcpd', 'G.C.P.D.', -60, 10, -46, 24, Y.upper, 24);
lot('civic', 'city-hall', 'City Hall', -42, 10, -26, 24, Y.upper, 18);
lot('civic', 'library', 'Public Library', -60, 26, -46, 41, Y.upper, 14);
lot('civic', 'courthouse', 'Courthouse', -42, 26, -26, 41, Y.upper, 16);
// ============================ the waterfront: the quays, the Battery and the bay shore ============================
lot('waterfront', 'diamond-1', 'Diamond District', -42, -8, -34, 8, Y.quay, 14);
lot('waterfront', 'diamond-2', '', -22, 12, -15, 24, Y.quay, 12);
lot('waterfront', 'bank', 'Gotham National Bank', -22, 28, -11, 40, Y.quay, 18);
lot('waterfront', 'iceberg-lounge', 'Iceberg Lounge', -9, 31, 2, 42, Y.quay, 14);
lot('bayside', 'fish-market', 'Fish Market', -56, 77, -40, 86, Y.quay, 6);
// The Underground Highway's boarded mouth is in the bastion's south face, and its forecourt is kept open before it.
lot('bayside', 'highway', 'Underground Highway', -102, 74.5, -86, 90, Y.quay, 0.2, true);
lot('bayside', 'clock-tower', 'Clock Tower', -102, 94, -90, 106, Y.quay, 56);
lot('bayside', 'gazette', 'Gotham Gazette', -78, 94, -64, 108, Y.quay, 20);
lot('bayside', 'boat-yard', '', -80, 79, -62, 89, Y.quay, 6);
// ============================ Midtown: Robinson Park ============================
lot('park', 'park', 'Robinson Park', -104, -56, -62, -16, Y.quay, 0.2, true);
lot('park', 'finger-castle', 'Finger Castle', -93, -49, -83, -39, KNOLL.h, 12);
lot('park', 'botanical', 'Botanical Garden', -78, -30, -64, -18, Y.quay, 8);
// ============================ Uptown, on the bluff ============================
// Its named rows stand along the bluff's rim, and towers stand behind them on River Street: what they hide from
// the view the tile opens with is River Street and the river, and nothing on the far bank.
lot('uptown', 'otisburg', 'Otisburg', 23, -27, 38, -18, Y.bluff, 12);
lot('uptown', 'otisburg-2', '', 13, -33, 20, -25, Y.bluff, 14);
lot('uptown', 'bowery', 'The Bowery', 42, -27, 56, -18, Y.bluff, 12);
lot('uptown', 'museum', 'Gotham Museum', 60, -28, 74, -18, Y.bluff, 14);
lot('uptown', 'amusement', 'Amusement Mile', 88, -50, 104, -14, Y.bluff, 26, true);
// ============================ the East End and the docks ============================
// The tenements stand behind, their roofs in sight; the clinic and the old cinema front Harbour Road, with an alley between them.
lot('eastend', 'tenement-1', '', 32, -12, 40, -2, Y.quay, 20);
lot('eastend', 'tenement-2', '', 43, -12, 52, -2, Y.quay, 16);
lot('eastend', 'tenement-3', '', 55, -12, 63, -2, Y.quay, 22);
lot('eastend', 'clinic', 'Thomas Wayne Clinic', 42, 2, 50, 9, Y.quay, 10);
lot('eastend', 'cinema', 'Park Row', 53, 1, 65, 9, Y.quay, 12);
lot('eastend', 'alley', '', 66, 1, 72, 9, Y.quay, 0.2, true);
// Ace Chemicals: the works low, so that the fairground behind stays in sight, and its stack at the west end.
lot('docks', 'ace', 'Ace Chemicals', 76, -12, 102, 9, Y.quay, 12);
lot('docks', 'ace-stack', '', 78, -10, 84, -4, Y.quay, 30);
// The docks' sheds stay low, so that Harbour Road behind them is seen over their roofs.
lot('docks', 'cold-store', 'Cold Store', 60, 36, 72, 43, Y.quay, 9);
lot('docks', 'card-company', 'Monarch Playing Card Co.', 76, 36, 86, 43, Y.quay, 9);
// ============================ ordinary buildings, which stand between the things to find ============================
// Two more towers on the Crown, beside Wayne Tower.
lot('blocks', 'pinkney-1', '', -69, -12, -63, 0, Y.crown, 33);
lot('blocks', 'pinkney-2', '', -69, 4, -63, 14, Y.crown, 27);
// Rows of houses between Robinson Park and the Sprang, low, so that the park's lawn stays in sight over them.
lot('blocks', 'row-0', '', -61, -53, -56, -44, Y.quay, 9);
lot('blocks', 'row-1', '', -61, -42, -49, -32, Y.quay, 10);
lot('blocks', 'row-2', '', -61, -30, -45, -20, Y.quay, 12);
// Uptown's towers, behind its rows.
lot('blocks', 'uptown-1', '', 23, -34, 38, -28.5, Y.bluff, 28);
lot('blocks', 'uptown-2', '', 42, -34, 56, -28.5, Y.bluff, 32);
lot('blocks', 'uptown-3', '', 60, -34, 74, -29.5, Y.bluff, 24);
// A warehouse in the south-west, between the Clock Tower and the Gazette.
lot('blocks', 'warehouse-1', '', -88, 95, -80, 108, Y.quay, 12);
// The docks' first row of sheds, low, so that Harbour Road behind them is seen over their roofs, and its stacks.
lot('blocks', 'shed-1', '', 46, 26.5, 56, 33, Y.quay, 6);
lot('blocks', 'shed-2', '', 60, 26.5, 72, 33, Y.quay, 6);
lot('blocks', 'shed-3', '', 76, 26.5, 86, 33, Y.quay, 6);
lot('blocks', 'stacks-1', '', 90, 26.5, 102, 37, Y.quay, 5);
// ============================ Bristol: Wayne Manor and the Batcave ============================
lot('bristol', 'manor', 'Wayne Manor', 8, -108, 48, -97, Y.crest, 14);
lot('bristol', 'batcave', 'The Batcave', 6, -97, 50, -85, Y.cave, 6, true);
lot('bristol', 'cove', '', -14, -93, -2, -85, Y.cave, 6, true);
lot('bristol', 'forecourt', '', 52, -106, 64, -96, Y.crest, 0.2, true);
lot('bristol', 'kane-bridge', 'Kane Memorial Bridge', 74, -70, 86, -48, Y.shelf, 24, true);
// ============================ Mercey Island: Arkham ============================
lot('arkham', 'arkham', 'Arkham Asylum', -96, -104, -66, -88, Y.crag, 21);
lot('arkham', 'arkham-gate', '', -72, -85, -64, -80, Y.isle, 9, true);
lot('arkham', 'trigate', 'Trigate Bridge', -48, -76, -24, -52, Y.shelf, 8, true);
// ============================ the bay ============================
lot('bay', 'blackgate', 'Blackgate', 72, 79, 88, 92, 2, 14);
lot('bay', 'justice', 'Statue of Justice', 40, 93, 48, 101, 1.5, 28);
lot('bay', 'casino', 'Iceberg Casino', 42, 62, 62, 74, Y.water, 13, true);
lot('tricorner', 'tricorner', 'Tricorner Yards', -29, 60, 34, 113, Y.quay, 14, true);
lot('waterfront', 'pier', '', 26, 38, 44, 46, Y.water, 2.5, true);

export const LOTS: Lot[] = LOT_LIST;

export const lotOf = (id: string): Lot => {
  const l = LOTS.find((x) => x.id === id);
  if (!l) throw new Error(`no lot ${id}`);
  return l;
};

// ---------------------------------------------------------------------------
// Places for a hero
// ---------------------------------------------------------------------------

export const HERO_SPOTS: { id: string; x: number; z: number; y: number; heading: number; turn?: number; where: string }[] = [
  { id: 'batcave', x: 30, z: -89.5, y: Y.cave + 0.35, heading: 0, turn: 0.2, where: 'a guest bay on a turntable in the Batcave, beside the Batmobile' },
  { id: 'manor', x: 58, z: -101, y: Y.crest + 0.04, heading: Math.PI / 2, where: "Wayne Manor's forecourt, at the head of the drive" },
  { id: 'wayne-tower', x: -73, z: 39, y: Y.crown + 0.24, heading: 0, where: "Wayne Tower's forecourt, on the rim of the upper city" },
  { id: 'battery', x: 16.5, z: 37, y: 0.04, heading: 0, where: 'the Battery, where the Sprang meets the bay, before the Iceberg Lounge' },
  { id: 'casino', x: 52, z: 68, y: 3.3, heading: 0, turn: 0.25, where: "the prize turntable on the Iceberg Casino's deck" },
  { id: 'boardwalk', x: 93, z: -24, y: Y.bluff + 0.04, heading: Math.PI / 2, where: "Amusement Mile's boardwalk, under the wheel" },
];

// ---------------------------------------------------------------------------
// The sky, and what rises into it
// ---------------------------------------------------------------------------

/**
 * The Bat-Signal: where its lamp stands on the police roof, and the cloud it
 * shines on. The cloud hangs over Gotham's own ground, thin enough to see
 * through, and the picture on it is drawn so that it shows from above.
 */
export const SIGNAL = { lamp: [-49.5, Y.upper + 24.6, 20.5] as P3, cloud: { c: [-49.5, 53, 20.5] as P3, rx: 10, rz: 6.5 } };

/** Where steam rises from the street: grates and manholes on sidewalks and in alleys, each [x, z] on the ground as built. */
export const VENTS: P2[] = [
  [-27, 2], [-12, 22], [2, 26], [-16, 44], [-10, 60], [-40, 72], [-70, 92],
  [-38, 48], [-56, 44], [-88, 46],
  [26, -8], [42, 0], [58, 10.5], [70, 11], [50, 24.5], [30, -30], [58, -36.5], [84, -34],
];

// ---------------------------------------------------------------------------
// What the view the tile opens with must see
// ---------------------------------------------------------------------------

export const SIGHT: { id: string; x: number; y: number; z: number }[] = [
  { id: "Arkham's gate", x: -68, y: Y.isle + 4, z: -80 },
  { id: 'the Trigate', x: -36, y: Y.shelf + 1.6, z: -64 },
  { id: 'the Batcave', x: 28, y: Y.cave + 1.5, z: -89 },
  { id: 'the waterfall', x: -8, y: Y.cave + 3, z: -92 },
  { id: 'the service lane', x: 30, y: Y.shelf + 1.6, z: -82.5 },
  { id: "the Manor's front", x: 28, y: Y.crest + 5, z: -97 },
  { id: 'the Kane Bridge', x: 80, y: Y.shelf + 2.6, z: -59 },
  { id: "Wayne Tower's door", x: -73, y: Y.crown + 3, z: 36 },
  { id: 'the courthouse steps', x: -34, y: Y.upper + 2, z: 41 },
  { id: 'the library steps', x: -53, y: Y.upper + 2, z: 41 },
  { id: 'the police roof', x: -50, y: Y.upper + 25, z: 20 },
  { id: 'the rim road', x: -60, y: Y.upper + 1.6, z: 49.5 },
  { id: 'the ramp, halfway', x: -59, y: 5.6, z: 66.5 },
  { id: 'the quad', x: -53, y: Y.upper + 1.5, z: -3 },
  { id: 'the park', x: -72, y: 1.5, z: -47 },
  { id: 'the Iceberg Lounge', x: -3, y: 4, z: 42 },
  { id: 'the Battery', x: 16, y: 1.5, z: 38 },
  { id: 'the west quay', x: -10, y: 1.6, z: 5.5 },
  { id: 'the east quay', x: 11, y: 1.6, z: -13 },
  { id: 'Park Row', x: 59, y: 2, z: 9.5 },
  { id: "Ace Chemicals' gate", x: 86, y: 3, z: 9 },
  { id: 'the docks', x: 74, y: 1.5, z: 47 },
  { id: 'Harbour Road', x: 70, y: 1.6, z: 18 },
  { id: "the channel before Tricorner", x: -8, y: 0.5, z: 78 },
  { id: 'the fairground', x: 94, y: Y.bluff + 2, z: -24 },
  { id: 'the fish market', x: -48, y: 2, z: 86 },
  { id: "the Underground Highway's mouth", x: -94, y: 3, z: 75 },
  { id: 'the bay shore road', x: -20, y: 1.6, z: 76 },
];

// ---------------------------------------------------------------------------
// The stages of the stories
// ---------------------------------------------------------------------------
//
// Where the cast act out their stories (show.ts). A stage's ground is kept
// clear for them: nothing that a figure would walk through stands on it, and
// nothing taller than a person stands between it and the view the tile opens
// with, but what the stage's own story needs and its builder is asked for.
// `y` is the height of the stage's ground.

export const STAGES: Record<string, { x0: number; z0: number; x1: number; z1: number; y: number; what: string }> = {
  // ---- the upper city
  policeRoof: { x0: -60, z0: 10, x1: -46, z1: 24, y: Y.upper + 24, what: "the police roof, flat and open: the Bat-Signal's lamp at its south-east corner, a stair head at its north-west, a parapet no higher than 1. Gordon's post; the Signal's stories; the League's roll-call" },
  courtSteps: { x0: -42, z0: 37, x1: -26, z1: 44.5, y: Y.upper, what: "the courthouse's steps and the sidewalk before them: Two-Face's post" },
  librarySteps: { x0: -60, z0: 37, x1: -46, z1: 44.5, y: Y.upper, what: "the library's steps and the sidewalk before them: Batgirl's post" },
  rimWalk: { x0: -100, z0: 54.5, x1: -42, z1: 57.4, y: Y.upper, what: 'the promenade along the rim, over the ramp: kept clear to walk and run along' },
  quad: { x0: -60, z0: -12, x1: -46, z1: 6, y: Y.upper, what: "the university's quad: a lawn, with a scarecrow on a post in a patch of maize at its east end. The Scarecrow's post" },
  crownSteps: { x0: -82, z0: 36, x1: -64, z1: 41.5, y: Y.crown, what: "Wayne Tower's forecourt on the Crown: the place for a hero at its middle, the tower's door behind" },
  // ---- the quays and the bay shore
  bankSquare: { x0: -19, z0: 40, x1: -10, z1: 54, y: 0, what: "the square before the bank's south door: the bank's stories, a charity collector's box" },
  loungeRoof: { x0: -9, z0: 31, x1: 2, z1: 42, y: 12, what: "the Iceberg Lounge's roof terrace, its south-east half flat and open: the Penguin's post, where he lands" },
  pier: { x0: 26, z0: 38, x1: 44, z1: 46, y: 1.2, what: "the pier's deck: the Riddler's booth at its landward end, and room for his glass maze, 8 by 5, on its seaward half" },
  diamondRoofNorth: { x0: -42, z0: -8, x1: -34, z1: 8, y: 14, what: "the northern jeweller's roof in the Diamond District, flat, with a skylight and a chimney: Catwoman's story begins here" },
  diamondRoofSouth: { x0: -22, z0: 12, x1: -15, z1: 24, y: 12, what: "the southern jeweller's roof, flat, with a chimney: Catwoman's post, with her cat" },
  fishJetty: { x0: -25, z0: 90, x1: -17, z1: 98, y: 0.8, what: 'a timber jetty from the harbour wall by the fish market 6 out into the channel before Tricorner: the Laughing Fish' },
  marketYard: { x0: -56, z0: 86, x1: -40, z1: 92, y: 0, what: "the yard before the fish market, with a manhole in it, and a storm drain's mouth in the harbour wall across the road: Croc" },
  highway: { x0: -102, z0: 74.5, x1: -86, z1: 90, y: 0, what: "the court before the Underground Highway's boarded mouth, open and paved: Ra's al Ghul's post, and the duel" },
  belfry: { x0: -102, z0: 94, x1: -90, z1: 106, y: 44, what: "the Clock Tower's belfry: a ledge all round it at this height, eaves over it to hang from. Man-Bat's post" },
  // ---- Robinson Park
  parkLawn: { x0: -80, z0: -54, x1: -64, z1: -40, y: 0, what: "the lawn east of Finger Castle's knoll, open: Ivy's and Harley's stories. Finger Castle itself is what Ivy's vines climb" },
  // ---- the east bank
  museumSteps: { x0: 60, z0: -18, x1: 74, z1: -14.4, y: Y.bluff, what: "the museum's portico and the rim of the bluff before it, facing south: where the Penguin comes out" },
  eastRoofs: { x0: 32, z0: -12, x1: 63, z1: -2, y: 16, what: "the three tenements' roofs, each flat over its southern half, with water tanks and chimneys on the northern: Nightwing's post, the Robins' race" },
  cinemaSteps: { x0: 53, z0: 9, x1: 65, z1: 13, y: 0, what: "the sidewalk before the old cinema, with a plinth at its west end for a statue: Clayface" },
  alley: { x0: 66, z0: 1, x1: 72, z1: 9, y: 0, what: "the alley beside the cinema: one street lamp, a stack of tyres. The Red Hood's post" },
  catwalk: { x0: 78, z0: 5, x1: 100, z1: 9, y: 8, what: "a catwalk along Ace Chemicals' south front, over its open vats: the Joker's post" },
  apron: { x0: 58, z0: 44.4, x1: 104, z1: 49.8, y: 0, what: "the docks' apron along the quay's edge, kept clear from end to end, and the dock cut's drawbridge: the Jokermobile's chase, Freeze, Bane" },
  boardwalk: { x0: 88, z0: -30, x1: 98, z1: -16, y: Y.bluff, what: "Amusement Mile's boardwalk under the wheel: the place for a hero, and Harley's booth beside it" },
  // ---- Bristol and the island
  cave: { x0: 6, z0: -97, x1: 50, z1: -85, y: Y.cave, what: "the Batcave's floor: the Batmobile's turntable at (14, -90.5), the guest's at (30, -89.5), the Batplane's pad at (43.5, -90.5), the trophies and the computer along its back" },
  terrace: { x0: 8, z0: -97, x1: 48, z1: -94, y: Y.crest, what: "the Manor's terrace, over the cave's back: Alfred's post" },
  lawn: { x0: -8, z0: -107, x1: 6, z1: -96, y: Y.crest, what: "the lawn west of the Manor: Damian's post, with Titus, Alfred the cat and Bat-Cow" },
  gate: { x0: -72, z0: -85, x1: -62, z1: -78, y: Y.isle, what: "the ground before Arkham's gate, between it and the ring: the breakout. The gate's own leaf is the show's, and its frame stands empty" },
  casinoDeck: { x0: 42, z0: 62, x1: 62, z1: 74, y: 3, what: "the Iceberg Casino's deck: the prize turntable at its middle" },
};
