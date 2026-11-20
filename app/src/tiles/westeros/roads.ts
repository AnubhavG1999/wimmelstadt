// The roads of Westeros: their surfaces, and the lanes that traffic follows.
//
// The pattern is one no other tile has. The roads are a tree with a few
// loops in it: the kingsroad is the trunk, and every other road leaves it or a
// branch of it. A road is two lanes, one each way, and traffic keeps left. At
// every place where roads meet, each lane turns left round its own corner, as
// on a roundabout where everybody takes the first exit. So a lane never
// crosses another and never joins one, and nobody ever waits.
//
// Seen the other way: the roads cut the land into pieces, and each route is
// the one lane that runs all the way round one piece, keeping it on its left.
// There are three pieces inside the loops, and everything outside them is the
// fourth, whose route is the long way round the outside of the whole tree,
// out to the end of every branch and back.
//
// The middle of each road is in plan.ts. This file walks round each piece
// along those middles, and lays the lane half a lane to the left of the walk.

import { eased, fine, pathOf, raised, rounded, segsOf, type P3 } from '../../engine/corners';
import type { Path } from '../../engine/paths';
import { street } from '../../engine/roads';
import type { Build, Route } from '../../engine/tile';
import { LANE, ROADS, TURNS, roadY, type P2 } from './plan';

/** A ring that a road turns back in. */
interface Turn { c: P2; r: number }
/** One step of a walk round a piece of land: a corner of a road's middle, or a ring to turn in at the end of a branch. */
type Step = P2 | Turn;

const R = ROADS, K = R.kingsroad;
/** The places where roads meet. */
const T = K[6], X = K[7], Q = K[11], G = K[12], RS = K[13], FORK = K[14], W = R.gold[0], T2 = R.twins[3], O = R.rose[5];

/**
 * The four walks. Each goes round its piece with the piece on its left, so
 * that at every meeting of roads it takes the first way to the left.
 */
const WALKS: Record<string, Step[]> = {
  // The long way round the outside: down the east side of the kingsroad from beyond the Wall, up the high
  // road and back, along King's Landing's quays, over the Blackwater, round Storm's End's drum, through
  // Sunspear's gates and back, down the roseroad, round the Hightower, up the west coast, over the Twins'
  // bridge, and north again to the Wall.
  kingsroad: [
    TURNS.wall, K[0], K[1], K[2], K[3], K[4], K[5], T, X, R.high[1], R.high[2], TURNS.moon, R.high[2], R.high[1], X,
    K[8], K[9], K[10], Q, G, RS, FORK, TURNS.drum, FORK, R.sunspear[1], R.sunspear[2], TURNS.sun, R.sunspear[2], R.sunspear[1], FORK, RS,
    R.rose[1], R.rose[2], R.rose[3], R.rose[4], O, R.isle[1], R.isle[2], TURNS.tower, R.isle[2], R.isle[1], O,
    R.ocean[3], R.ocean[2], R.ocean[1], W, R.river[6], R.river[5], R.river[4], T2, R.twins[2], R.twins[1], T,
    K[5], K[4], K[3], K[2], K[1], K[0],
  ],
  // North up the kingsroad from the crossroads, west over the Twins' bridge, and back east along the river road.
  riverlands: [X, T, R.twins[1], R.twins[2], T2, R.river[2], R.river[1]],
  // West along the river road, south between the lake and the Rock, east along the goldroad and the river front, and north along the quays.
  westerlands: [X, R.river[1], R.river[2], T2, R.river[4], R.river[5], R.river[6], W, G, Q, K[10], K[9], K[8]],
  // West along the goldroad, down the ocean road, back along the roseroad, and north over the Blackwater bridge.
  reach: [G, W, R.ocean[1], R.ocean[2], R.ocean[3], O, R.rose[4], R.rose[3], R.rose[2], R.rose[1], RS],
};

const isTurn = (s: Step): s is Turn => !Array.isArray(s);

/**
 * The corners of the lane that runs `off` to the left of a walk. At a corner
 * of a road it is where the lane beside the way in meets the lane beside the
 * way out. At a ring it goes in on the left of the road, round with the clock,
 * and comes out on the left of the way back.
 */
function laneCorners(walk: Step[], off: number): P2[] {
  const n = walk.length, out: P2[] = [];
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
      }
      return;
    }
    let ax = s[0] - prev[0], az = s[1] - prev[1], bx = next[0] - s[0], bz = next[1] - s[1];
    const al = Math.hypot(ax, az), bl = Math.hypot(bx, bz);
    ax /= al; az /= al; bx /= bl; bz /= bl;
    // left of a way (dx, dz) is (dz, -dx): east, for someone going south
    const k = 1 + az * bz + ax * bx;
    out.push([s[0] + ((az + bz) * off) / k, s[1] + ((-ax - bx) * off) / k]);
  });
  return out;
}

/** A line of corners as a road in space: rounded, a point every unit and a half, at the height the plan gives each place. */
function inSpace(corners: P2[], r: number, closed: boolean): P3[] {
  return eased(raised(fine(rounded(corners, r, closed), 1.5), (_s, p) => roadY(p[0], p[1])), 2.5, closed);
}

/** The lane of each walk, as the engine takes it. */
export const LANES: Record<string, P3[]> = Object.fromEntries(
  Object.entries(WALKS).map(([id, walk]) => {
    const pts = inSpace(laneCorners(walk, LANE / 2), 3.6, true);
    // closed: its last point is not its first again
    return [id, pts];
  }),
);

// ---------------------------------------------------------------------------
// The surfaces
// ---------------------------------------------------------------------------

/**
 * Packed earth: what every road is made of where it meets another. Two roads
 * of two colours would lie in one plane where they meet, and flicker.
 */
const EARTH = 0xb6a587;
/** What three roads are made of between their ends: the goldroad's yellow stone, the roseroad's rose-coloured setts, the ocean road's shell sand. */
const OWN: Partial<Record<keyof typeof ROADS, number>> = { gold: 0xc9b06f, rose: 0xc7a999, ocean: 0xc2b594 };
/** The kingsroad north of the Neck is frozen mud. */
const NORTH = 0x9c968c;

const dist = (a: P2, b: P2): number => Math.hypot(b[0] - a[0], b[1] - a[1]);
const lengthOf = (c: P2[]): number => c.slice(1).reduce((s, p, i) => s + dist(c[i], p), 0);

/** The stretch of a line of corners between two distances along it. */
function between(c: P2[], s0: number, s1: number): P2[] {
  const out: P2[] = [];
  let s = 0;
  for (let i = 0; i + 1 < c.length; i++) {
    const d = dist(c[i], c[i + 1]), at = (v: number): P2 => [c[i][0] + ((c[i + 1][0] - c[i][0]) * (v - s)) / d, c[i][1] + ((c[i + 1][1] - c[i][1]) * (v - s)) / d];
    if (s0 >= s && s0 < s + d) out.push(at(s0));
    if (s + d > s0 && s + d < s1) out.push(c[i + 1]);
    if (s1 > s && s1 <= s + d) out.push(at(s1));
    s += d;
  }
  return out;
}

/** The middle of every road as a path, for whoever builds along one: a bridge, a gate, a row of trees. */
export const MIDDLES: Record<string, Path> = {};

export function buildRoads(k: Build): Route[] {
  const lay = (corners: P2[], color: number, width = LANE * 2): void => street(k, pathOf(inSpace(corners, 6, false)), { lanes: 0, width, sidewalk: 0, color, zebras: false });
  for (const id of Object.keys(R) as (keyof typeof ROADS)[]) MIDDLES[id] = pathOf(inSpace(R[id], 6, false));
  // the kingsroad in two colours: the North, and south of the Neck
  lay(K.slice(0, 5), NORTH);
  lay(K.slice(4), EARTH);
  for (const id of ['high', 'river', 'twins', 'isle', 'sunspear'] as const) lay(R[id], EARTH);
  // three roads have a colour of their own, but for nine units at each end, where they meet the others
  for (const [id, color] of Object.entries(OWN) as [keyof typeof ROADS, number][]) {
    const L = lengthOf(R[id]);
    lay(between(R[id], 0, 9), EARTH);
    lay(between(R[id], 9, L - 9), color);
    lay(between(R[id], L - 9, L), EARTH);
  }
  // each branch runs on to the ring it turns in, and the ring is one lane wide
  const ends: [P2, Turn, number][] = [
    [K[0], TURNS.wall, NORTH], [R.high[2], TURNS.moon, EARTH], [FORK, TURNS.drum, EARTH], [R.sunspear[2], TURNS.sun, EARTH], [R.isle[2], TURNS.tower, EARTH],
  ];
  ends.forEach(([from, turn, color], i) => {
    const d = Math.hypot(turn.c[0] - from[0], turn.c[1] - from[1]), t = (d - turn.r) / d;
    lay([from, [from[0] + (turn.c[0] - from[0]) * t, from[1] + (turn.c[1] - from[1]) * t]], color);
    const ring: P2[] = Array.from({ length: 16 }, (_, j): P2 => [turn.c[0] + Math.cos((j / 16) * Math.PI * 2) * turn.r, turn.c[1] + Math.sin((j / 16) * Math.PI * 2) * turn.r]);
    const path = pathOf(inSpace(ring, 3, true), true);
    MIDDLES[`ring-${i}`] = path;
    street(k, path, { lanes: 0, width: LANE + 1.2, sidewalk: 0, color, zebras: false });
  });

  // Who travels: no plain cars. Riders, carts and wains, sparse, and the heroes among them.
  const route = (id: string, speed: number, count: number, types: string[]): Route => ({ id, segs: segsOf(LANES[id], true), speed, count, types });
  return [
    route('kingsroad', 11, 9, ['rider', 'rider', 'banner', 'cart', 'wain', 'haywain', 'watch', 'wheelhouse']),
    route('riverlands', 9.5, 2, ['rider', 'cart']),
    route('westerlands', 10, 3, ['rider', 'banner', 'wain']),
    route('reach', 9.5, 3, ['haywain', 'cart', 'rider']),
  ];
}
