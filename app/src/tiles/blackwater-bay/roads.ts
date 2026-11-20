// The roads of Blackwater Bay: their surfaces, and the lanes that traffic
// follows.
//
// The pattern, which no other tile has: five pieces of land, and on each one
// road of its own that closes on itself. Nothing on the ground joins one land
// to another. A road is two lanes, one each way, and traffic keeps left. A
// road that ends turns back in a ring, which traffic goes round with the
// clock, as round a roundabout where it keeps left.
//
// Each route is a walk round a piece of land with the land on its left, along
// the middles of the roads in plan.ts, and its lane is laid half a lane to the
// left of the walk. A road that is a tree, with rings at its ends, is one route
// that goes out along one side and back along the other. Driftmark's road is a
// ring round the island, so it is two: one round the inside, and one round the
// outside that takes in the causeway to High Tide.
//
// The way of walking is the Westeros tile's, in its roads.ts.

import { eased, fine, pathOf, raised, rounded, segsOf, type P3 } from '../../engine/corners';
import type { Path } from '../../engine/paths';
import { street } from '../../engine/roads';
import type { Build, Route } from '../../engine/tile';
import { LANE, RHAENYS, ROADS, TURNS, inside, type P2 } from './plan';

/** A ring that a road turns back in. */
interface Turn { c: P2; r: number }
/** One step of a walk round a piece of land: a corner of a road's middle, or a ring to turn in at the end of a road. */
type Step = P2 | Turn;

const R = ROADS;
const isTurn = (s: Step): s is Turn => !Array.isArray(s);

/** How tightly a lane turns at a corner. */
const TURN = 3.6;

/**
 * The climb up to the Dragonpit's forecourt: the last stretch of the Street
 * of the Sisters, straight up the middle to the bronze doors, from its foot to
 * where it reaches the forecourt's south edge.
 */
export const CLIMB = { foot: [R.sisters[1][0], RHAENYS.forecourt.z1 + 24] as P2, top: R.sisters[1] as P2 };

/**
 * How high a road is at a place. Every road lies on the ground but the climb
 * up to the Dragonpit's forecourt and the ring on it.
 */
export function roadY(x: number, z: number): number {
  if (inside(RHAENYS.terrace, x, z)) return RHAENYS.y;
  const [ax, az] = CLIMB.foot, [bx, bz] = CLIMB.top, dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = ((x - ax) * dx + (z - az) * dz) / l2, off = Math.abs((x - ax) * dz - (z - az) * dx) / Math.sqrt(l2);
  // it is level for its last two units, so that the road has eased onto the level before it reaches the terrace
  if (t > 0 && t < 1 && off < 7) return RHAENYS.y * Math.min(1, t * 1.14);
  return 0;
}

/** Driftmark's ring, with the corner where the causeway leaves it on its south side. */
const DRIFT = R.driftmark, CJ: P2 = R.causeway[0];

/** The walks, one for each route. Each goes round its piece of land with the land on its left. */
const WALKS: Record<string, Step[]> = {
  // East along the quays' north side, up the Street of the Sisters to the forecourt and down again, on to
  // Aegon's strand, and back along the quays' south side to the west end.
  city: [TURNS.quaysWest, R.sisters[0], R.sisters[1], TURNS.forecourt, R.sisters[1], R.sisters[0], TURNS.strand, R.sisters[0]],
  // Out of the drovers' pen through the Iron Gate, along the north shore to Rook's Rest, and back.
  rosby: [TURNS.pen, R.rosby[1], R.rosby[2], R.rosby[3], TURNS.rooksRest, R.rosby[3], R.rosby[2], R.rosby[1]],
  // From the harbour through the town and the castle, under the lairs to the camp of the Sowing, and back.
  dragonstone: [TURNS.harbour, R.dragonstone[1], R.dragonstone[2], R.dragonstone[3], R.dragonstone[4], TURNS.sowing, R.dragonstone[4], R.dragonstone[3], R.dragonstone[2], R.dragonstone[1]],
  // Round the inside of Driftmark's ring: west along its north side, by the strand, and east along the Gullet.
  driftmarkIn: [...DRIFT.slice(0, 7), CJ, ...DRIFT.slice(7)].reverse(),
  // Round the outside: east by Hull, round the shipyards, west along the Gullet, out over the causeway to High Tide and back.
  driftmarkOut: [...DRIFT.slice(0, 7), CJ, TURNS.highTide, CJ, ...DRIFT.slice(7)],
  // From the ferry's landing through the kingswood, over the Wendwater, along Massey's Hook to Sharp Point, and back.
  south: [TURNS.ferry, R.south[1], R.south[2], R.south[3], R.south[4], TURNS.sharpPoint, R.south[4], R.south[3], R.south[2], R.south[1]],
};

/**
 * The corners of the lane that runs `off` to the left of a walk. At a corner
 * of a road it is where the lane beside the way in meets the lane beside the
 * way out. At a ring it goes in on the left of the road, round with the clock,
 * and comes out on the left of the way back.
 */
function laneCorners(walk: Step[], off: number): { corners: P2[]; radii: number[] } {
  const n = walk.length, out: P2[] = [], radii: number[] = [];
  const at = (i: number): P2 => {
    const s = walk[((i % n) + n) % n];
    return isTurn(s) ? s.c : s;
  };
  walk.forEach((s, i) => {
    const prev = at(i - 1), next = at(i + 1);
    if (isTurn(s)) {
      // the road comes to the ring from `prev`; angles here grow the way the clock turns, seen from above
      const from = Math.atan2(prev[1] - s.c[1], prev[0] - s.c[0]), gap = Math.asin(off / s.r), corners = 9;
      for (let k = 0; k <= corners; k++) {
        const a = from + gap + ((2 * Math.PI - 2 * gap) * k) / corners;
        out.push([s.c[0] + Math.cos(a) * s.r, s.c[1] + Math.sin(a) * s.r]);
        radii.push(TURN);
      }
      return;
    }
    let ax = s[0] - prev[0], az = s[1] - prev[1], bx = next[0] - s[0], bz = next[1] - s[1];
    const al = Math.hypot(ax, az), bl = Math.hypot(bx, bz);
    ax /= al; az /= al; bx /= bl; bz /= bl;
    // left of a way (dx, dz) is (dz, -dx): east, for someone going south
    const k = 1 + az * bz + ax * bx;
    out.push([s[0] + ((az + bz) * off) / k, s[1] + ((-ax - bx) * off) / k]);
    radii.push(TURN);
  });
  return { corners: out, radii };
}

/** A line of corners as a road in space: rounded, a point every unit and a half, at the height the plan gives each place. */
function inSpace(corners: P2[], r: number | number[], closed: boolean): P3[] {
  return eased(raised(fine(rounded(corners, r, closed), 1.5), (_s, p) => roadY(p[0], p[1])), 2.5, closed);
}

/** The lane of each walk, as the engine takes it. */
export const LANES: Record<string, P3[]> = Object.fromEntries(
  Object.entries(WALKS).map(([id, walk]) => {
    const { corners, radii } = laneCorners(walk, LANE / 2);
    return [id, inSpace(corners, radii, true)];
  }),
);

// ---------------------------------------------------------------------------
// The surfaces
// ---------------------------------------------------------------------------

/** What each road is made of: setts in the city, packed earth on the shores, black stone on Dragonstone, shell sand on the causeway. */
const SETTS = 0xb3a48c, EARTH = 0xb6a587, BLACK = 0x6d6a66, SHELL = 0xcfc3a3;
const SURFACE: Record<keyof typeof ROADS, number> = {
  quays: SETTS, sisters: SETTS, rosby: EARTH, dragonstone: BLACK, driftmark: EARTH, causeway: SHELL, south: EARTH,
};
/** Which ring belongs to which road, for its colour. */
const RING_OF: [keyof typeof TURNS, keyof typeof ROADS][] = [
  ['quaysWest', 'quays'], ['strand', 'quays'], ['forecourt', 'sisters'], ['pen', 'rosby'], ['rooksRest', 'rosby'],
  ['harbour', 'dragonstone'], ['sowing', 'dragonstone'], ['highTide', 'causeway'], ['ferry', 'south'], ['sharpPoint', 'south'],
];

/** The middle of every road as a path, for whoever builds along one: a gate, a ramp's walls, a row of trees. */
export const MIDDLES: Record<string, Path> = {};

export function buildRoads(k: Build): Route[] {
  const lay = (corners: P2[], color: number, closed = false): void => street(k, pathOf(inSpace(corners, 6, closed), closed), { lanes: 0, width: LANE * 2, sidewalk: 0, color, zebras: false });
  for (const id of Object.keys(R) as (keyof typeof ROADS)[]) {
    MIDDLES[id] = pathOf(inSpace(R[id], 6, id === 'driftmark'), id === 'driftmark');
    lay(R[id], SURFACE[id], id === 'driftmark');
  }
  // each ring is one lane wide
  for (const [t, road] of RING_OF) {
    const turn = TURNS[t];
    const ring: P2[] = Array.from({ length: 16 }, (_, j): P2 => [turn.c[0] + Math.cos((j / 16) * Math.PI * 2) * turn.r, turn.c[1] + Math.sin((j / 16) * Math.PI * 2) * turn.r]);
    const path = pathOf(inSpace(ring, 3, true), true);
    MIDDLES[`ring-${t}`] = path;
    street(k, path, { lanes: 0, width: LANE + 1.2, sidewalk: 0, color: SURFACE[road], zebras: false });
  }
  return routesOf();
}

/**
 * Who travels the roads: no plain cars. Drovers with their flocks and their
 * cattle, litters on the shoulders of their bearers, strings of pack mules
 * and fishwives' barrows, sparse, and the heroes among them.
 */
function routesOf(): Route[] {
  const route = (id: string, speed: number, count: number, types: string[]): Route => ({ id, segs: segsOf(LANES[id], true), speed, count, types });
  return [
    route('city', 8, 4, ['flock', 'litter', 'cattle', 'barrow']),
    route('rosby', 9, 3, ['flock', 'cattle', 'mules']),
    route('dragonstone', 8, 2, ['barrow', 'mules']),
    route('driftmarkIn', 9, 2, ['mules', 'barrow']),
    route('driftmarkOut', 9, 3, ['mules', 'litter', 'barrow']),
    route('south', 9.5, 4, ['flock', 'cattle', 'mules']),
  ];
}
