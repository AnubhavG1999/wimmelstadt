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
/**
 * The river row: buildings that stand over the west quay's road on piers, between the two bascule bridges, so that
 * the road runs on under them beside the water, as Chicago's lower river drive does. Each is given by where it
 * begins and ends along the Sprang and how high its top is; they lie the way the river runs, from `d0` to `d1`
 * to the south-west of its middle, and their undersides are `soffit` over the quay.
 */
export const RIVER_ROW = { d0: 21.2, d1: 7.9, soffit: 8, blocks: [{ from: 47, to: 60, top: 32 }, { from: 62, to: 76, top: 48 }, { from: 78, to: 91, top: 28 }] };

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

/**
 * The harbour: the reach below the Battery, which runs on along the Sprang's
 * own line to the board's south-east corner. Its west quay, Tricorner's, lies
 * `west` to the south-west of that line, from `from` along it to the south
 * edge. Its other side is the docks' quay.
 */
export const HARBOUR = { west: 20, from: 121 };
/** How far along the Sprang's line the harbour's west quay meets the board's south edge. */
const T_SOUTH = (BOARD.z1 - SPRANG.a[1] + SPRANG_ACROSS[1] * HARBOUR.west) / SPRANG_ALONG[1];
/** Where the harbour's west quay is at a place this far south: land lies west of it. */
export const harbourQuay = (z: number): number => { const t = (z - SPRANG.a[1] + SPRANG_ACROSS[1] * HARBOUR.west) / SPRANG_ALONG[1]; return sprang(t, -HARBOUR.west)[0]; };

/**
 * The Iceberg Casino, a ship at her moorings along Tricorner's quay, north of
 * the bridge: her middle, and her length along the quay and her beam across
 * it. She lies the way the Sprang runs, not square to the board.
 */
export const CASINO = { c: sprang(150, -HARBOUR.west + 6.5), length: 20, beam: 11 };

/**
 * The lands. Gotham is a city of little water: one river through its middle,
 * the harbour it runs out into, the reach before Arkham's island, and a short
 * canal under Crest Hill. What was the bay is Lower Gotham and Tricorner.
 */
export const LANDS: Record<string, P2[]> = {
  /** Old Gotham and Robinson Park on the Sprang's west bank, and Lower Gotham with Tricorner south of them, as far as the harbour's quay. */
  west: [[-104, -56], sprang(-6.26, -7), sprang(SL, -7), [27, 38], BAY_SHORE.from, sprang(HARBOUR.from, -HARBOUR.west), sprang(T_SOUTH, -HARBOUR.west), [-104, 113]],
  /**
   * The east bank: the wharf and the yard along what was the Gotham River, River Street's terrace, the East End and
   * the docks. The canal lies along the wharf's north side as far as its head at x 40, and the dock cut is let into
   * the docks.
   */
  east: [sprang(14.31, 7), [-2, -50], [-2, -58], [40, -58], [40, -67], [104, -67], [104, 50], [98, 50], [98, 40], [88, 40], [88, 50], [52, 50], [52, 38], [46, 38], sprang(SL, 7)],
  /** Bristol, on the mainland north of the canal: Crest Hill, and the shelf the river road runs on. */
  bristol: [[-22, -113], [104, -113], [104, -67], [-18, -67], [-22, -71]],
  /** Mercey Island, in the board's north-west corner, with a moat between it and the park and the reach on its east. */
  mercey: [[-103.6, -112.6], [-31, -112.6], [-31, -88], [-46, -78], [-52, -71], [-58, -64], [-103.6, -64]],
  /** Blackgate Isle, in the harbour's mouth. */
  blackgate: [[80, 88], [98, 84], [103, 93], [100, 104], [84, 105], [78, 97]],
  /** The islet of the Statue of Justice, in the harbour, on the line the view looks up. */
  justice: circle(71, 85, 6, 8),
};

/** The upper city of Old Gotham: a terrace behind retaining walls, with a bastion at its south-west corner where Grand Avenue arrives. */
export const UPPER: P2[] = [[-104, -14], [-44, -14], [-44, 10], [-24, 10], [-24, 58], [-84, 58], [-84, 74], [-104, 74]];

/** The Crown: the terrace on the upper city that Old Gotham's towers stand on, Wayne Tower at its south-east corner. */
export const CROWN: P2[] = [[-104, -14], [-62, -14], [-62, 41.5], [-104, 41.5]];

/**
 * The bluff on the east bank: the terrace that River Street runs along, a
 * storey and a half over the East End's streets, and at its east end the
 * higher ground of Amusement Mile. The East End's back row stands against the
 * terrace's wall, so those buildings have a door on each level.
 */
export const BLUFF: P2[] = [[-11, -50], [104, -50], [104, -14], [88, -14], [88, -34], [3.2, -34], [-4, -42]];

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
  if (inside(LANDS.east, x, z)) return Math.abs(x - KANE_ST.x) < KANE_ST.half && z < KANE_ST.rampFoot && z > KANE_ST.rampTop - 0.01 ? kaneRamp(z) : Y.quay;
  if (inside(LANDS.bristol, x, z)) return crestAt(x, z);
  if (inside(LANDS.mercey, x, z)) return merceyAt(x, z);
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

/**
 * Kane Street: straight south from the Kane Bridge. It leaves River Street's
 * terrace down a ramp between the East End's blocks, meets Harbour Road, and
 * goes on over the docks on a viaduct to the Cobblepot Bridge. `half` is half
 * its width, sidewalks and all.
 */
export const KANE_ST = { x: 80, half: 8, rampTop: -34, rampFoot: -6, harbour: 18, viaduct: 26, quay: 50 };

/** How high Kane Street's ramp is at a place this far south. */
export function kaneRamp(z: number): number {
  return Y.bluff * Math.min(1, Math.max(0, (KANE_ST.rampFoot - z) / (KANE_ST.rampFoot - KANE_ST.rampTop)));
}

/** Harbour Road: from Kane Street west to the Sprang's east quay, whose road it runs on into at the south bascule bridge's head. */
export const HARBOUR_RD = { z: 18, bend: sprang((18 - SPRANG.a[1] + SPRANG_ACROSS[1] * -SPRANG.road) / SPRANG_ALONG[1], SPRANG.road) };

/**
 * The Cobblepot Bridge, one of the three bridges of 1881 that the comics name
 * for the city's founding families: over the harbour from the docks to
 * Tricorner, square to the line the view looks up. Its deck is `y` high at
 * its east end and `yWest` at its west, and `crown` more at its middle. Beyond its west end Bridge
 * Street comes down a ramp `ramp` long and bends west into South Street at
 * `foot`.
 */
export const BRIDGE = { t: 163, east: [KANE_ST.x, KANE_ST.quay] as P2, west: sprang(163, -HARBOUR.west), foot: sprang(163, -HARBOUR.west - 24), y: 5.3, yWest: 4, crown: 2.7, ramp: 17, half: 6.2 };

/**
 * South Street: Lower Gotham's front street, west from the foot of Bridge
 * Street to a ring by the Gazette. Bank Street leaves it northwards at
 * `bank` and turns into Grand Avenue at the foot of its ramp.
 */
export const SOUTH_ST = { z: BRIDGE.foot[1], east: BRIDGE.foot[0], west: -54, bank: -26 };

/** Rings that a road turns back in: its middle and the middle of its one lane. */
export const TURNS = {
  rim: { c: [-33, 49.5] as P2, r: 5.5 },
  /** Where South Street turns back, by the Gazette. */
  south: { c: [SOUTH_ST.west, SOUTH_ST.z] as P2, r: 5.5 },
};

/** The roads that go there and back, as the corners of their middles between their two rings. */
export const ROADS = {
  /** Bank Street and Grand Avenue: north from South Street, west up the ramp to the bastion, round on it, and east along the rim. */
  avenue: [[SOUTH_ST.bank, SOUTH_ST.z], [SOUTH_ST.bank, 66.5], [-95, 66.5], [-95, 49.5], TURNS.rim.c] as P2[],
};

/** How high Grand Avenue is at a place along its ramp. */
export const avenueY = (x: number, z: number): number => (z > RAMP.z0 ? Y.upper * Math.min(1, Math.max(0, (RAMP.x1 - x) / (RAMP.x1 - RAMP.x0))) : Y.upper);

/** Where the Trigate's Uptown arm comes ashore on the bluff, as a distance from the ring's middle. */
const ASHORE = Math.hypot(-10.9 - TRIGATE.c[0], -50 - TRIGATE.c[1]);

/**
 * How high the circuit of the river is at a place: on the bluff along River
 * Street, on the shelf along the river road and round the Trigate, and
 * sloping between the two over the Kane Bridge and along the Trigate's
 * Uptown arm.
 */
export function riverY(x: number, z: number): number {
  const T = TRIGATE;
  if (inside(BLUFF, x, z) || (z > -50.5 && x > -12)) return Y.bluff;
  if (Math.abs(x - KANE.x) < 12 && z > KANE.z0 && z < KANE.z1) return KANE.north + ((KANE.south - KANE.north) * (z - KANE.z0)) / (KANE.z1 - KANE.z0);
  // the Uptown arm: it leaves the ring towards the south-east, and climbs by how far along it a place is, so that
  // the lane on either side of its middle lies at the middle's own height
  const al = Math.hypot(T.uptown[0] - T.c[0], T.uptown[1] - T.c[1]), d = ((x - T.c[0]) * (T.uptown[0] - T.c[0]) + (z - T.c[1]) * (T.uptown[1] - T.c[1])) / al;
  if (x > T.c[0] && z > T.c[1] - 2 && d > T.r + 1 && d < ASHORE + 2) return Y.shelf + (Y.bluff - Y.shelf) * Math.min(1, Math.max(0, (d - T.r - 1) / (ASHORE - T.r - 1)));
  return Y.shelf;
}

/** The middle of the road from Harbour Road over the viaduct and the Cobblepot Bridge to South Street, as its corners. */
export const BRIDGE_ROAD: P2[] = [[KANE_ST.x, KANE_ST.viaduct], BRIDGE.east, BRIDGE.west, BRIDGE.foot];

/**
 * How high that road is at a place on it: up the viaduct from Harbour Road to
 * the bridge's east end, over the bridge's crown, and down Bridge Street's
 * ramp to the ground. Null at a place that is not on it.
 */
export function bridgeY(x: number, z: number): number | null {
  let best = Infinity, at = 0, run = 0;
  for (let i = 0; i + 1 < BRIDGE_ROAD.length; i++) {
    const a = BRIDGE_ROAD[i], b = BRIDGE_ROAD[i + 1], vx = b[0] - a[0], vz = b[1] - a[1], l = Math.hypot(vx, vz);
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (l * l)));
    const d = Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t);
    if (d < best) { best = d; at = run + t * l; }
    run += l;
  }
  if (best > 10) return null;
  const up = KANE_ST.quay - KANE_ST.viaduct, span = Math.hypot(BRIDGE.west[0] - BRIDGE.east[0], BRIDGE.west[1] - BRIDGE.east[1]);
  if (at <= up) return (BRIDGE.y * at) / up;
  if (at <= up + span) return BRIDGE.y + ((BRIDGE.yWest - BRIDGE.y) * (at - up)) / span + BRIDGE.crown * Math.sin((Math.PI * (at - up)) / span);
  return BRIDGE.yWest * Math.max(0, 1 - (at - up - span) / BRIDGE.ramp);
}

/**
 * How high the streets of the city's one long road are at a place: River
 * Street's terrace and the circuit of the river, Kane Street's ramp, Harbour
 * Road and the quays on the ground, the viaduct and the bridge.
 */
export function streetY(x: number, z: number): number {
  if (z <= KANE_ST.rampTop) return riverY(x, z);
  if (Math.abs(x - KANE_ST.x) < 12 && z < KANE_ST.rampFoot) return kaneRamp(z);
  if (z > KANE_ST.viaduct - 2) return bridgeY(x, z) ?? Y.quay;
  return Y.quay;
}

/**
 * The elevated railway: a loop on steel that goes over, under and through the
 * city. From the west end of River Street it runs east over the middle of
 * that street, on the terrace; turns south through the tower over Kane Street
 * and down that street over its west kerb; turns west over Harbour Road's
 * south sidewalk and crosses the mouth of the Sprang on a bridge of its own,
 * over the south bascule bridge; runs up the west bank straight through the
 * three buildings of the river row, in at one end of each and out at the
 * other; and crosses the Sprang again, over the north bascule bridge, to
 * where it began. `y` is the height of its rails.
 */
export const EL = { y: 11.5, kane: 75.6, harbour: 24.5, row: (RIVER_ROW.d0 + RIVER_ROW.d1) / 2, north: 44 };

/** A place on the line across the Sprang at `t` along it, at a given z. */
const acrossAt = (t: number, z: number): P2 => sprang(t, (z - SPRANG.a[1] - SPRANG_ALONG[1] * t) / SPRANG_ACROSS[1]);
/** A place on the line beside the Sprang, `d` to the north-east of its middle, at a given z. */
const besideAt = (d: number, z: number): P2 => sprang((z - SPRANG.a[1] - SPRANG_ACROSS[1] * d) / SPRANG_ALONG[1], d);

/** The railway's corners, in the order a train runs them, each with how wide it is rounded. */
export const EL_LOOP: { p: P2; r: number }[] = [
  { p: acrossAt(EL.north, CIRCUIT.riverStreet), r: 10 },
  { p: [EL.kane, CIRCUIT.riverStreet], r: 8 },
  { p: [EL.kane, EL.harbour], r: 7.6 },
  { p: besideAt(-EL.row, EL.harbour), r: 10 },
  { p: sprang(EL.north, -EL.row), r: 7 },
];

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
  /** For an ordinary building that the plan lays out by rule: which of the tile's styles it is built in. */
  style?: string;
}

const LOT_LIST: Lot[] = [];
const lot = (file: string, id: string, name: string, x0: number, z0: number, x1: number, z1: number, base: number, h: number, part = false): void => {
  LOT_LIST.push({ id, name, x0, z0, x1, z1, base, top: base + h, part, file });
};

// ============================ the upper city: Old Gotham's towers ============================
// What is tall stands along the west edge, where what it hides falls off the board, and Wayne Tower stands
// before it with nothing south of it but the rim road and the drop.
// Wayne Tower is as tall as the America tile's great towers, at the collector's wish: nothing on the tile comes near it.
lot('towers', 'wayne-tower', 'Wayne Tower', -82, 18, -64, 36, Y.crown, 135);
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
// ============================ Lower Gotham: under the upper city's south wall ============================
// The Underground Highway's boarded mouth is in the bastion's south face, and its forecourt is kept open before it.
lot('bayside', 'highway', 'Underground Highway', -102, 74.5, -86, 90, Y.quay, 0.2, true);
lot('bayside', 'clock-tower', 'Clock Tower', -102, 94, -90, 106, Y.quay, 56);
lot('bayside', 'gazette', 'Gotham Gazette', -78, 94, -64, 108, Y.quay, 20);
// ============================ Midtown: Robinson Park ============================
lot('park', 'park', 'Robinson Park', -104, -56, -62, -16, Y.quay, 0.2, true);
lot('park', 'finger-castle', 'Finger Castle', -93, -49, -83, -39, KNOLL.h, 12);
lot('park', 'botanical', 'Botanical Garden', -78, -30, -64, -18, Y.quay, 8);
// ============================ the East End: one deep block between River Street's terrace and Harbour Road ============================
// Towers stand along the terrace's wall, with a door on each level; rows step down from them to Harbour Road, whose
// fronts are in sight over the docks. Lanes two to four wide cut the block, and its west side is a saw's edge along
// the quay.
lot('uptown', 'amusement', 'Amusement Mile', 88, -50, 104, -14, Y.bluff, 26, true);
lot('uptown', 'otisburg', 'Otisburg', 23, -22, 37, -12, Y.quay, 18);
lot('uptown', 'otisburg-2', '', 39, -22, 56, -12, Y.quay, 20);
// The Bowery's taverns climb Kane Street's ramp, where their fronts face east and are seen.
lot('uptown', 'bowery', 'The Bowery', 60, -22, 72, -11, Y.quay, 20);
// The tenements stand behind Harbour Road's row, their roofs in sight over it.
lot('eastend', 'tenement-1', '', 34, -9, 42, -1, Y.quay, 20);
lot('eastend', 'tenement-2', '', 44, -9, 52, -1, Y.quay, 16);
lot('eastend', 'tenement-3', '', 54, -9, 60, -1, Y.quay, 22);
lot('eastend', 'clinic', 'Thomas Wayne Clinic', 62, -9, 72, -1, Y.quay, 10);
// Harbour Road's north side: the museum at the bridge's head, the old cinema, and the court at Kane Street's corner.
lot('eastend', 'museum', 'Gotham Museum', 43, 1, 54, 10, Y.quay, 20);
lot('eastend', 'cinema', 'Park Row', 55.5, 1, 66.5, 10, Y.quay, 12);
lot('eastend', 'alley', '', 66.5, 1, 72, 10, Y.quay, 0.2, true);
// East of Kane Street, low, so that the street and its ramp stay in sight.
lot('eastend', 'firehouse', 'Fire House', 90, -2, 102, 9, Y.quay, 10);
// ============================ the docks ============================
// Ace Chemicals stands over the dock cut, its vats along its south front, and its stack at its north-east corner,
// where what it hides of Kane Street is least.
lot('docks', 'ace', 'Ace Chemicals', 88, 18, 104, 40, Y.quay, 12);
lot('docks', 'ace-stack', '', 98, 19, 104, 25, Y.quay, 30);
lot('docks', 'cold-store', 'Cold Store', 53, 35, 62, 43, Y.quay, 9);
lot('docks', 'card-company', 'Monarch Playing Card Co.', 64, 35, 73, 43, Y.quay, 9);
// ============================ ordinary buildings that are drawn by hand ============================
// Two more towers on the Crown, beside Wayne Tower.
lot('blocks', 'pinkney-1', '', -69, -12, -63, 0, Y.crown, 33);
lot('blocks', 'pinkney-2', '', -69, 4, -63, 14, Y.crown, 27);
// Rows of houses between Robinson Park and the Sprang, low, so that the park's lawn stays in sight over them.
lot('blocks', 'row-0', '', -61, -53, -56, -44, Y.quay, 9);
lot('blocks', 'row-1', '', -61, -42, -49, -32, Y.quay, 10);
lot('blocks', 'row-2', '', -61, -30, -45, -20, Y.quay, 12);
// The East End's towers, against the terrace's wall: what they hide is River Street and the yard, and nothing of Bristol.
lot('blocks', 'uptown-1', '', 13, -33, 25, -24, Y.quay, 46);
lot('blocks', 'uptown-2', '', 27, -33, 39, -24, Y.quay, 54);
lot('blocks', 'uptown-3', '', 41, -33, 53, -24, Y.quay, 42);
lot('blocks', 'uptown-4', '', 57, -33, 71, -24, Y.quay, 50);
// A warehouse in the south-west, between the Clock Tower and the Gazette, and a shed behind the docks' named works.
lot('blocks', 'warehouse-1', '', -88, 95, -80, 108, Y.quay, 12);
lot('blocks', 'shed-2', '', 62, 27, 73, 33, Y.quay, 6);
// Built over Grand Avenue, so that the avenue runs through them: a long building over the ramp in three lengths that
// step up with it, and a gatehouse on the bastion that the avenue turns through. Each one's `base` is the height of
// its underside over the road, not of its ground.
lot('blocks', 'arcade-1', '', -52, 58, -36, 74.6, 8, 16);
lot('blocks', 'arcade-2', '', -68, 58, -52, 74.6, 12, 16);
lot('blocks', 'arcade-3', '', -84, 58, -68, 74.6, 16, 16);
lot('blocks', 'gate-house', '', -103, 41.6, -84, 74.6, 16, 24);
// And over Kane Street, where its ramp leaves River Street's terrace: a tower that the street runs through, and the
// elevated railway beside it.
lot('blocks', 'kane-gate', '', 72, -34, 88, -24, 16, 32);
// ============================ Bristol: Wayne Manor and the Batcave ============================
lot('bristol', 'manor', 'Wayne Manor', 8, -108, 48, -97, Y.crest, 14);
lot('bristol', 'batcave', 'The Batcave', 6, -97, 50, -85, Y.cave, 6, true);
lot('bristol', 'cove', '', -14, -93, -2, -85, Y.cave, 6, true);
lot('bristol', 'forecourt', '', 52, -106, 64, -96, Y.crest, 0.2, true);
lot('bristol', 'kane-bridge', 'Kane Memorial Bridge', 72, -70, 88, -48, Y.shelf, 24, true);
// ============================ Mercey Island: Arkham ============================
lot('arkham', 'arkham', 'Arkham Asylum', -96, -104, -66, -88, Y.crag, 21);
lot('arkham', 'arkham-gate', '', -77, -85, -64, -80, Y.isle, 9, true);
lot('arkham', 'trigate', 'Trigate Bridge', -48, -76, -24, -52, Y.shelf, 8, true);
// ============================ the harbour ============================
lot('bay', 'blackgate', 'Blackgate', 84, 89, 99, 101, 2, 14);
lot('bay', 'justice', 'Statue of Justice', 67, 81, 75, 89, 1.5, 28);
// The Iceberg Casino lies along Tricorner's quay, north of the bridge: this is the water she takes up.
lot('bay', 'casino', 'Iceberg Casino', CASINO.c[0] - 11.5, CASINO.c[1] - 11.5, CASINO.c[0] + 11.5, CASINO.c[1] + 11.5, Y.water, 13.9, true);
// The Cobblepot Bridge: its two towers, its cables, and the viaduct that carries Kane Street to it over the docks.
lot('bay', 'cobblepot-bridge', 'Cobblepot Bridge', 74, 26, 86, 50, Y.quay, 34, true);
// ============================ Tricorner ============================
lot('tricorner', 'fish-market', 'Fish Market', 12, 57, 24, 65, Y.quay, 6);
// The yards lie along the harbour's quay south of the bridge: slips, a dry dock, cranes, and a light at the point.
lot('tricorner', 'yards', 'Tricorner Yards', 46, 88, 79, 113, Y.quay, 14, true);
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
  { id: 'battery', x: 16.5, z: 37, y: 0.04, heading: 0, where: 'the Battery, where the Sprang meets the harbour, before the Iceberg Lounge' },
  { id: 'casino', x: CASINO.c[0], z: CASINO.c[1], y: 3.3, heading: Math.atan2(SPRANG_ALONG[1], SPRANG_ALONG[0]), turn: 0.25, where: "the prize turntable on the Iceberg Casino's deck" },
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

/**
 * Where Wayne Enterprises' helicopter sets down, which the collector asked for with Bruce Wayne's flight home: a deck
 * that stands out from Wayne Tower's east face at its first setback (how high is the tower's own business, in
 * towers.ts), and a ring on Wayne Manor's lawn south of its forecourt, beside the strip the forecourt's hero is seen
 * through and not in it.
 */
export const HELIPADS = { tower: { x: -60.2, z: 27.5, r: 4.6 }, manor: { x: 56.5, z: -91.6, r: 4.0 } };

/** Where steam rises from the street: grates and manholes on sidewalks and in lanes, each [x, z] on the ground as built. */
export const VENTS: P2[] = [
  [-27, 2], [-12, 22], [2, 26], [-16, 44], [-10, 60], [-40, 72], [-70, 92],
  [-38, 48], [-56, 44], [-88, 46],
  [26, -28], [55, -28], [40, -23], [48, 0], [58, 11.5], [70, 11.5], [50, 24.5], [86.5, 2],
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
  { id: 'the Kane Bridge', x: 80, y: Y.shelf + 2.6, z: -62 },
  { id: "Wayne Tower's door", x: -73, y: Y.crown + 3, z: 36 },
  { id: 'the courthouse steps', x: -34, y: Y.upper + 2, z: 41 },
  { id: 'the library steps', x: -53, y: Y.upper + 2, z: 41 },
  { id: 'the police roof', x: -50, y: Y.upper + 25, z: 20 },
  { id: 'the quad', x: -53, y: Y.upper + 1.5, z: -3 },
  { id: 'the park', x: -72, y: 1.5, z: -47 },
  { id: 'the Iceberg Lounge', x: -3, y: 4, z: 42 },
  { id: 'the Battery', x: 16, y: 1.5, z: 38 },
  { id: 'the east quay', x: 11, y: 1.6, z: -13 },
  { id: 'Park Row', x: 61, y: 2, z: 11.5 },
  { id: "the museum's steps", x: 48.5, y: 2, z: 11.5 },
  { id: 'Harbour Road', x: 60, y: 1.6, z: 18 },
  { id: 'Kane Street', x: 80, y: 1.6, z: 6 },
  { id: "Kane Street's ramp", x: 80, y: 4.6, z: -22 },
  { id: "Ace Chemicals' vats", x: 96, y: 3, z: 39 },
  { id: 'the docks', x: 70, y: 1.5, z: 47 },
  { id: 'the Cobblepot Bridge', x: (BRIDGE.east[0] + BRIDGE.west[0]) / 2, y: BRIDGE.y + BRIDGE.crown + 1.6, z: (BRIDGE.east[1] + BRIDGE.west[1]) / 2 },
  { id: 'South Street', x: 0, y: 1.6, z: SOUTH_ST.z },
  { id: 'Bank Street', x: SOUTH_ST.bank, y: 1.6, z: 80 },
  { id: 'the fairground', x: 94, y: Y.bluff + 2, z: -24 },
  { id: "the Underground Highway's mouth", x: -94, y: 3, z: 75 },
  { id: 'the fish jetty', x: 31, y: 2, z: 56.5 },
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
  quad: { x0: -60, z0: -12, x1: -46, z1: 6, y: Y.upper, what: "the university's quad: a lawn, with a scarecrow on a post in a patch of maize at its east end. The Scarecrow's post" },
  crownSteps: { x0: -82, z0: 36, x1: -64, z1: 41.5, y: Y.crown, what: "Wayne Tower's forecourt on the Crown: the place for a hero at its middle, the tower's door behind" },
  // ---- the quays
  bankSquare: { x0: -19, z0: 40, x1: -10, z1: 54, y: 0, what: "the square before the bank's south door: the bank's stories, a charity collector's box" },
  loungeRoof: { x0: -9, z0: 31, x1: 2, z1: 42, y: 12, what: "the Iceberg Lounge's roof terrace, its south-east half flat and open: the Penguin's post, where he lands" },
  pier: { x0: 26, z0: 38, x1: 44, z1: 46, y: 1.2, what: "the pier's deck: the Riddler's booth at its landward end, and room for his glass maze, 8 by 5, on its seaward half" },
  diamondRoofNorth: { x0: -42, z0: -8, x1: -34, z1: 8, y: 14, what: "the northern jeweller's roof in the Diamond District, flat, with a skylight and a chimney: Catwoman's story begins here" },
  diamondRoofSouth: { x0: -22, z0: 12, x1: -15, z1: 24, y: 12, what: "the southern jeweller's roof, flat, with a chimney: Catwoman's post, with her cat" },
  // ---- Lower Gotham and Tricorner
  highway: { x0: -102, z0: 74.5, x1: -86, z1: 90, y: 0, what: "the court before the Underground Highway's boarded mouth, open and paved: Ra's al Ghul's post, and the duel" },
  belfry: { x0: -102, z0: 94, x1: -90, z1: 106, y: 44, what: "the Clock Tower's belfry: a ledge all round it at this height, eaves over it to hang from. Man-Bat's post" },
  fishJetty: { x0: 27.5, z0: 55, x1: 34, z1: 58, y: 0.8, what: "a timber jetty from Tricorner's quay by the fish market, 6 out into the harbour: the Laughing Fish" },
  // ---- Robinson Park
  parkLawn: { x0: -80, z0: -54, x1: -64, z1: -40, y: 0, what: "the lawn east of Finger Castle's knoll, open: Ivy's and Harley's stories. Finger Castle itself is what Ivy's vines climb" },
  // ---- the east bank
  museumSteps: { x0: 43, z0: 10, x1: 54, z1: 13, y: 0, what: "the museum's steps, on Harbour Road's sidewalk at the bridge's head, facing south: where the Penguin comes out" },
  eastRoofs: { x0: 34, z0: -9, x1: 60, z1: -1, y: 16, what: "the three tenements' roofs, each flat over its southern half, with water tanks and chimneys on the northern: Nightwing's post, the Robins' race" },
  cinemaSteps: { x0: 55.5, z0: 10, x1: 66.5, z1: 13, y: 0, what: "the sidewalk before the old cinema, with a plinth at its west end for a statue: Clayface" },
  alley: { x0: 66.5, z0: 1, x1: 72, z1: 10, y: 0, what: "the court beside the cinema, open to Harbour Road and to Kane Street: one street lamp, a stack of tyres. The Red Hood's post" },
  catwalk: { x0: 89, z0: 36, x1: 103, z1: 40, y: 8, what: "a catwalk along Ace Chemicals' south front, over its open vats and the dock cut: the Joker's post" },
  apron: { x0: 58, z0: 44.4, x1: 104, z1: 49.8, y: 0, what: "the docks' apron along the quay's edge, kept clear from end to end, under the viaduct and over the dock cut's drawbridge: the Jokermobile's chase, Freeze, Bane" },
  boardwalk: { x0: 88, z0: -30, x1: 98, z1: -16, y: Y.bluff, what: "Amusement Mile's boardwalk under the wheel: the place for a hero, and Harley's booth beside it" },
  // ---- Bristol and the island
  cave: { x0: 6, z0: -97, x1: 50, z1: -85, y: Y.cave, what: "the Batcave's floor: the Batmobile's turntable at (14, -90.5), the guest's at (30, -89.5), the Batplane's pad at (43.5, -90.5), the trophies and the computer along its back" },
  terrace: { x0: 8, z0: -97, x1: 48, z1: -94, y: Y.crest, what: "the Manor's terrace, over the cave's back: Alfred's post" },
  lawn: { x0: -8, z0: -107, x1: 6, z1: -96, y: Y.crest, what: "the lawn west of the Manor: Damian's post, with Titus, Alfred the cat and Bat-Cow" },
  manorPad: { x0: HELIPADS.manor.x - HELIPADS.manor.r - 0.2, z0: HELIPADS.manor.z - HELIPADS.manor.r - 0.2, x1: HELIPADS.manor.x + HELIPADS.manor.r + 0.2, z1: HELIPADS.manor.z + HELIPADS.manor.r + 0.2, y: Y.crest, what: "the ring on the Manor's lawn south of its forecourt where Wayne Enterprises' helicopter sets down: Bruce Wayne's flight home" },
  gate: { x0: -72, z0: -85, x1: -62, z1: -78, y: Y.isle, what: "the ground before Arkham's gate, between it and the ring: the breakout. The gate's own leaf is the show's, and its frame stands empty" },
  // ---- the harbour
  casinoDeck: { x0: CASINO.c[0] - 5, z0: CASINO.c[1] - 5, x1: CASINO.c[0] + 5, z1: CASINO.c[1] + 5, y: 3, what: "the Iceberg Casino's deck: the prize turntable at its middle" },
};

// ---------------------------------------------------------------------------
// How high a thing may stand, so that what must be seen is
// ---------------------------------------------------------------------------

/** The way back to the camera of the view the tile opens with, on the ground, and how fast a line of sight climbs along it. */
export const VIEW = { e: Math.sin((42 * Math.PI) / 180), s: Math.cos((42 * Math.PI) / 180), up: Math.tan((38 * Math.PI) / 180) };

interface Watched { x: number; y: number; z: number; room: number }

/** Everything the view must see, as points: the list above, a hero's car on every place, a figure on every stage, and a car's roof every five units along the roads worth watching. */
function watched(): Watched[] {
  const out: Watched[] = [];
  for (const p of SIGHT) out.push({ x: p.x, y: p.y, z: p.z, room: 0.5 });
  for (const s of HERO_SPOTS) out.push({ x: s.x, y: s.y + 0.5, z: s.z, room: 3.6 });
  for (const s of Object.values(STAGES)) {
    const mx = (s.x0 + s.x1) / 2, mz = (s.z0 + s.z1) / 2;
    for (const [x, z] of [[mx, mz], [s.x0 + 1, s.z0 + 1], [s.x1 - 1, s.z0 + 1], [s.x1 - 1, s.z1 - 1], [s.x0 + 1, s.z1 - 1]]) out.push({ x, y: s.y + 1, z, room: 0.3 });
  }
  const along = (pts: P2[], y: (x: number, z: number) => number, closed = false): void => {
    for (let i = 0; i + (closed ? 0 : 1) < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 5));
      for (let j = 0; j < n; j++) {
        const x = a[0] + ((b[0] - a[0]) * j) / n, z = a[1] + ((b[1] - a[1]) * j) / n;
        out.push({ x, y: y(x, z) + 1.6, z, room: 0.3 });
      }
    }
  };
  along(RING, () => Y.quay, true);
  along([[KANE_ST.x, KANE_ST.rampTop], [KANE_ST.x, KANE_ST.viaduct]], streetY);
  along(BRIDGE_ROAD, (x, z) => bridgeY(x, z) ?? 0);
  along([[KANE_ST.x, HARBOUR_RD.z], HARBOUR_RD.bend, RING[2]], () => Y.quay);
  return out;
}

let WATCHED: Watched[] | null = null;

/**
 * How high a thing that covers this ground may stand, ground and all, without
 * hiding anything the view must see. Infinity where nothing watched lies
 * behind it.
 */
export function ceilingOver(x0: number, z0: number, x1: number, z1: number): number {
  WATCHED ??= watched();
  let top = Infinity;
  for (const p of WATCHED) {
    const m = p.room;
    const ax = (x0 - m - p.x) / VIEW.e, bx = (x1 + m - p.x) / VIEW.e, az = (z0 - m - p.z) / VIEW.s, bz = (z1 + m - p.z) / VIEW.s;
    const t0 = Math.max(Math.min(ax, bx), Math.min(az, bz), 0), t1 = Math.min(Math.max(ax, bx), Math.max(az, bz));
    if (t1 > t0) top = Math.min(top, p.y + VIEW.up * t0);
  }
  return top;
}

// ---------------------------------------------------------------------------
// The ordinary buildings that the plan lays out by rule
// ---------------------------------------------------------------------------
//
// Lower Gotham, Tricorner and the wharf are filled with ordinary buildings
// shoulder to shoulder, with lanes two wide between them. Each stands where no
// named lot, road, lane, stage or water is, and no higher than the view allows:
// so the rule keeps every street worth watching, every stage and every place
// for a hero in sight, however dense the city is. Their ids begin with `f-`.

/** Every road's middle with half its width, sidewalks and all, and the lanes the view looks down. */
const CORRIDORS: { pts: P2[]; half: number; closed?: boolean }[] = [
  { pts: RING, half: 8.6, closed: true },
  { pts: [TRIGATE.uptown, [KANE_ST.x, CIRCUIT.riverStreet]], half: 8.6 },
  { pts: [[KANE_ST.x, CIRCUIT.riverRoad], [KANE_ST.x, KANE_ST.quay], BRIDGE.west, BRIDGE.foot, [SOUTH_ST.west, SOUTH_ST.z]], half: 7.3 },
  { pts: [TRIGATE.bristol, [KANE_ST.x, CIRCUIT.riverRoad]], half: 8 },
  { pts: [[KANE_ST.x, HARBOUR_RD.z], HARBOUR_RD.bend, RING[2]], half: 8.6 },
  { pts: [[SOUTH_ST.bank, SOUTH_ST.z - 7], ...ROADS.avenue.slice(1)], half: 8.6 },
  { pts: EL_LOOP.map((c) => c.p), half: 3, closed: true },
];
const ROUNDS: { c: P2; r: number }[] = [...Object.values(TURNS).map((t) => ({ c: t.c, r: t.r + 5.2 })), { c: TRIGATE.c, r: TRIGATE.r + 5 }, { c: TRIGATE.arkham.c, r: TRIGATE.arkham.r + 5 }];

const toSeg = (px: number, pz: number, a: P2, b: P2): number => {
  const vx = b[0] - a[0], vz = b[1] - a[1], l = vx * vx + vz * vz || 1, t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (pz - a[1]) * vz) / l));
  return Math.hypot(px - a[0] - vx * t, pz - a[1] - vz * t);
};

/** Whether a place is on a road, a ring or a lane, sidewalks and all. */
export function onRoad(x: number, z: number, room = 0): boolean {
  for (const c of CORRIDORS) for (let i = 0; i + (c.closed ? 0 : 1) < c.pts.length; i++) if (toSeg(x, z, c.pts[i], c.pts[(i + 1) % c.pts.length]) < c.half + room) return true;
  for (const r of ROUNDS) if (Math.hypot(x - r.c[0], z - r.c[1]) < r.r + room) return true;
  return false;
}

/** A number from 0 to 1 for a place, the same on every load. */
const chance = (x: number, z: number): number => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };

interface Fill {
  id: string;
  x0: number; x1: number;
  /** Its rows, each where it begins and how deep it is. */
  rows: [number, number][];
  base: number;
  /** How wide its buildings are, in turn along a row, and the lane between two. */
  widths: number[]; gap: number;
  /** How high a building at a place would like to be, above its ground. */
  want(x: number, z: number): number;
  /** The least height worth building. */
  least: number;
  style(x: number, z: number, h: number): string;
}

/** How far towards the camera a place is: what is low stands where this is large. */
const front = (x: number, z: number): number => x * VIEW.e + z * VIEW.s;
const within = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
/**
 * Lower Gotham's height: 8 along the board's front, south of South Street, so that the street is seen over its own
 * south side, and rising row by row behind it to 24 under the upper city's wall. Along the harbour it stays low.
 */
const lower = (x: number, z: number): number => {
  const rows = z > SOUTH_ST.z ? 8 : within(12 + (SOUTH_ST.z - 8 - z) * 0.55, 12, 24);
  return x > harbourQuay(z) - 20 ? Math.min(rows, 12) : rows;
};

const FILLS: Fill[] = [
  // Lower Gotham and Tricorner: tenements, lofts and works in rows that South Street sets, lowest along the harbour and at the board's edge
  { id: 'low', x0: -103, x1: 78, rows: [[SOUTH_ST.z + 7.4, 9.4], [SOUTH_ST.z - 16.6, 9.2], [SOUTH_ST.z - 27.6, 9], [SOUTH_ST.z - 37.2, 7.6]], base: Y.quay, widths: [11, 9, 12, 10], gap: 2, least: 7, want: lower, style: (x, z, h) => (x > harbourQuay(z) - 20 ? 'works' : h > 14 ? 'stone' : 'tenement') },
  // the Diamond District's back lane, between the upper city's wall and the west quay
  { id: 'gem', x0: -33, x1: -14, rows: [[0, 8]], base: Y.quay, widths: [8, 7], gap: 1.5, least: 7, want: () => 14, style: () => 'stone' },
  // east of Kane Street
  { id: 'east', x0: 89.5, x1: 103, rows: [[-12.6, 9]], base: Y.quay, widths: [13], gap: 2, least: 7, want: () => 14, style: () => 'works' },
  // the wharf along the canal, and the yard under the Kane Bridge: low sheds
  { id: 'wharf', x0: 0, x1: 38, rows: [[-56.6, 4.4]], base: Y.quay, widths: [9, 8], gap: 3, least: 4, want: () => 4, style: () => 'shed' },
  { id: 'yard', x0: 43, x1: 103, rows: [[-65, 5.5], [-57, 5]], base: Y.quay, widths: [10, 9], gap: 2.5, least: 4, want: () => 4.6, style: () => 'shed' },
];

/** Whether an ordinary building may stand on this ground: on its own level, clear of water, roads, lots and stages. */
function free(f: Fill, x0: number, z0: number, x1: number, z1: number): boolean {
  if (x0 < -103.4 || x1 > 103.4 || z0 < -112.4 || z1 > 112.4) return false;
  for (let a = 0; a <= 4; a++) for (let b = 0; b <= 4; b++) {
    const px = within(x0 - 1.2 + ((x1 - x0 + 2.4) * a) / 4, -103.6, 103.6), pz = within(z0 - 1.2 + ((z1 - z0 + 2.4) * b) / 4, -112.6, 112.6);
    if (groundAt(px, pz) !== f.base) return false;
    if (onRoad(x0 + ((x1 - x0) * a) / 4, z0 + ((z1 - z0) * b) / 4)) return false;
  }
  for (const l of LOT_LIST) if (x0 < l.x1 + f.gap && x1 > l.x0 - f.gap && z0 < l.z1 + f.gap && z1 > l.z0 - f.gap) return false;
  for (const s of Object.values(STAGES)) if (x0 < s.x1 + 1 && x1 > s.x0 - 1 && z0 < s.z1 + 1 && z1 > s.z0 - 1) return false;
  return true;
}

function fill(): void {
  for (const f of FILLS) {
    let n = 0;
    f.rows.forEach(([z0, depth], row) => {
      const z1 = z0 + depth;
      // Each building is tried at its own width, then narrower, and where none fits the row feels its way on a
      // little at a time: so the rows close up against every road and named lot.
      for (let x0 = f.x0, i = row; x0 + 6 <= f.x1;) {
        const wide = f.widths[i % f.widths.length];
        let put = false;
        for (const w of [wide, wide - 2, wide - 4, 7, 6]) {
          const x1 = x0 + w;
          if (w < 6 || x1 > f.x1 + 1e-6 || !free(f, x0, z0, x1, z1)) continue;
          const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
          const wish = f.want(cx, cz) * (0.78 + 0.44 * chance(cx, cz));
          // whole storeys, and no higher than the view allows
          const room = ceilingOver(x0, z0, x1, z1) - 0.6 - f.base;
          const h = f.least <= 5 ? Math.round(Math.min(wish, room) * 10) / 10 : Math.floor(Math.min(wish, room) / 4 + 0.35) * 4;
          if (h < f.least - 1e-6) continue;
          LOT_LIST.push({ id: `f-${f.id}-${n++}`, name: '', x0, z0, x1, z1, base: f.base, top: f.base + h, file: 'fabric', style: f.style(cx, cz, h) });
          x0 = x1 + f.gap;
          i++;
          put = true;
          break;
        }
        if (!put) x0 += 1.5;
      }
    });
  }
}
fill();
