// The roads of the Iron Rain: their surfaces, the benches they cut into the
// dome, and the lanes that traffic follows.
//
// The pattern, which no other tile has: one road that climbs out of the canyon
// on a ramp across its north wall, turns in a hairpin at the rim, runs over
// the crown of the planet along the canyon's edge, turns in a second hairpin
// and comes back down the other ramp, the two ramps a V across the wall that
// meets on the apron before the North Gate. The Gate Avenue tees into the V's
// foot and runs south through the gate to the Field of Mars, where it turns
// round a ring. From the shield park a road runs down the river's east bank,
// through the lowColor quarter and out of the South Gate, and down the
// planet's south flank to the Augustan camp. Traffic keeps right.

import { eased, fine, lane, pathOf, rounded, segsOf, type P3 } from '../../engine/corners';
import { lampsAlong, street } from '../../engine/roads';
import type { Bench } from '../../engine/terrain';
import type { Build, Route } from '../../engine/tile';
import { setBenches } from './land';
import { F, HAIRPIN_Y, LANE, LOOP, ROADS, TURNS, naturalAt, outOfTrench, type P2 } from './plan';

/** Half a road's width: two lanes. */
const HALF = LANE;

// ---------------------------------------------------------------------------
// The loop: the V of ramps and the rim road
// ---------------------------------------------------------------------------

/** Half a circle round a middle, from one angle to another, a point every unit or so. */
function arc(c: P2, r: number, a0: number, a1: number): P2[] {
  const n = Math.max(6, Math.ceil((Math.abs(a1 - a0) * r) / 1.2));
  return Array.from({ length: n + 1 }, (_, i): P2 => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
  });
}

/**
 * The loop's middle, walked from the middle of the apron westwards: up the
 * west ramp, round the west hairpin, east along the rim over the crown, round
 * the east hairpin, and down the east ramp back to the apron.
 */
function loopMiddle(): P2[] {
  const L = LOOP;
  // the ramps and the rim rounded at their bends; the hairpins are half circles of their own
  const west = rounded([[-4, L.apron.z], ...L.rampW], 10);
  const rim = rounded(L.rim, 30);
  const east = rounded([...L.rampE].reverse().concat([[-4, L.apron.z]]), 10);
  // round the west side of the west hairpin, from its south point to its north point
  const hw = arc(L.hairpinW, L.r, Math.PI / 2, (3 * Math.PI) / 2);
  // round the east side of the east hairpin, from its north point to its south point
  const he = arc(L.hairpinE, L.r, -Math.PI / 2, Math.PI / 2);
  const all = [...fine(west, 1.5), ...hw, ...fine(rim, 1.5), ...he, ...fine(east, 1.5)];
  // no point twice
  return all.filter((p, i) => i === 0 || Math.hypot(p[0] - all[i - 1][0], p[1] - all[i - 1][1]) > 0.05);
}

/** How high the loop is at a place along it: the apron on the floor, the ramps rising evenly to the hairpins, the rim on the dome. */
function loopY(x: number, z: number): number {
  const L = LOOP;
  if (z <= L.rim[0][1] + 0.5) return Math.max(HAIRPIN_Y, naturalAt(x, z));
  if (Math.hypot(x - L.hairpinW[0], z - L.hairpinW[1]) <= L.r + 0.5 || Math.hypot(x - L.hairpinE[0], z - L.hairpinE[1]) <= L.r + 0.5) return HAIRPIN_Y;
  if (x < L.apron.x0) return F + (HAIRPIN_Y - F) * Math.min(1, (L.apron.x0 - x) / (L.apron.x0 - L.hairpinW[0]));
  if (x > L.apron.x1) return F + (HAIRPIN_Y - F) * Math.min(1, (x - L.apron.x1) / (L.hairpinE[0] - L.apron.x1));
  return F;
}

/** The loop's middle in space, with its changes of slope eased. */
export const LOOP_MIDDLE: P3[] = eased(loopMiddle().map((p): P3 => [p[0], loopY(p[0], p[1]), p[1]]), 6, true);

// ---------------------------------------------------------------------------
// The other roads
// ---------------------------------------------------------------------------

/** How high a road off the loop is: on the floor in the trench, and on the ground beyond it. */
function groundRoadY(x: number, z: number): number {
  return outOfTrench(x, z) < 0 ? F : naturalAt(x, z);
}

/** A road off the loop in space, from its corners, rounded, on the floor or the ground. */
function inSpace(corners: P2[], r: number, closed = false): P3[] {
  return eased(fine(rounded(corners, r, closed), 1.5).map((p): P3 => [p[0], groundRoadY(p[0], p[1]), p[1]]), 4, closed);
}

/** A ring to turn in, as a closed line round its middle, a point every unit or so. */
function ringOf(c: P2, r: number, from = 0): P2[] {
  const n = Math.ceil((2 * Math.PI * r) / 1.2);
  return Array.from({ length: n }, (_, i): P2 => [c[0] + Math.cos(from + (i / n) * Math.PI * 2) * r, c[1] + Math.sin(from + (i / n) * Math.PI * 2) * r]);
}

export const AVENUE: P3[] = inSpace(ROADS.avenue, 4);
export const SOUTH: P3[] = inSpace(ROADS.south, 9);

// ---------------------------------------------------------------------------
// The lanes
// ---------------------------------------------------------------------------
//
// Traffic keeps right, so a lane lies half a lane to the right of the way it
// goes. The loop is two routes, one each way round. The avenue's route goes
// round the loop the way that comes down the west ramp: it leaves the apron by
// turning right into the avenue, goes round the Field of Mars's ring the way
// the clock does not, and comes back up the avenue to turn right onto the
// apron again. Turning right only, it never crosses a lane.

const H2 = LANE / 2;

/** A line of points on the ground, with heights from the loop where it runs on it. */
function onLoop(pts: P2[]): P3[] {
  return pts.map((p): P3 => [p[0], loopY(p[0], p[1]), p[1]]);
}

/** Where a line in space first comes within `d` of a point, by its index, after `from`. */
function nearestIndex(line: P3[], x: number, z: number): number {
  let best = 0, bd = Infinity;
  line.forEach((p, i) => {
    const d = Math.hypot(p[0] - x, p[2] - z);
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

/** The lanes of every route, as the engine takes them. */
export function lanes(): Record<string, P3[]> {
  // the loop, one way and the other
  const cw = lane(LOOP_MIDDLE, H2);
  const ccwMiddle = [...LOOP_MIDDLE].reverse();
  const ccw = lane(ccwMiddle, H2);

  // The avenue's route: the anticlockwise loop as far as the avenue, then down it, round the ring and back.
  // On the apron the anticlockwise loop runs east in the south lane, at z = apron + 2.5; the avenue's
  // southbound lane is at x = -4 - 2.5, its northbound at x = -4 + 2.5.
  const ax = ROADS.avenue[0][0], az = LOOP.apron.z;
  const field = TURNS.field;
  const down: P2[] = [[ax - H2 - 3.5, az + H2], [ax - H2, az + H2], ...ROADS.avenue.slice(1).map((p): P2 => [p[0] - H2, p[1]])];
  // into the ring from its north side, round it the way the clock does not, out again on its north side
  const ringR = field.r;
  const enter = Math.PI * 1.5 - Math.asin(H2 / ringR), leave = Math.PI * 1.5 + Math.asin(H2 / ringR) - Math.PI * 2;
  const round = arc(field.c, ringR, enter, leave);
  const up: P2[] = [...ROADS.avenue.slice(1).reverse().map((p): P2 => [p[0] + H2, p[1]]), [ax + H2, az + H2], [ax + H2 + 3.5, az + H2]];
  const detour = eased(onLoop(rounded([...down, ...round, ...up], 3.2)).map((p): P3 => [p[0], outOfTrench(p[0], p[2]) < 0 ? F : p[1], p[2]]), 3);
  // splice it into the anticlockwise loop where that passes the avenue: the detour, then the loop from where
  // the detour comes back onto it round to where it leaves it
  const i0 = nearestIndex(ccw, ax - H2 - 3.5, az + H2), i1 = nearestIndex(ccw, ax + H2 + 3.5, az + H2);
  const gate = i1 < i0 ? [...detour, ...ccw.slice(i1 + 1, i0)] : [...ccw.slice(0, i0), ...detour, ...ccw.slice(i1 + 1)];

  // The road to the camp: out along its north side, round the camp's ring, back along its south side, round the shield park's ring.
  const south = SOUTH;
  const outward = lane(south, H2);
  const homeward = lane([...south].reverse(), H2);
  const camp = TURNS.camp, park = TURNS.shieldPark;
  const southRoute = [...outward, ...ringPart(camp.c, camp.r, outward[outward.length - 1], homeward[0]), ...homeward, ...ringPart(park.c, park.r, homeward[homeward.length - 1], outward[0])];

  return { loopCw: cw, loopCcw: ccw, gate, south: southRoute };
}

/** The way round a ring the way the clock does not, from where a lane comes in to where the next goes out. */
function ringPart(c: P2, r: number, from: P3, to: P3): P3[] {
  let a0 = Math.atan2(from[2] - c[1], from[0] - c[0]);
  let a1 = Math.atan2(to[2] - c[1], to[0] - c[0]);
  // the way the clock does not turn, seen from above with north at the top, is towards smaller angles here
  while (a1 > a0) a1 -= Math.PI * 2;
  const y = (from[1] + to[1]) / 2;
  return arc(c, r, a0, a1).slice(1, -1).map((p): P3 => [p[0], y, p[1]]);
}

// ---------------------------------------------------------------------------
// The surfaces
// ---------------------------------------------------------------------------

/** What each road is made of. */
export const ROADWAY = 0x55565c, CANYON_ROAD = 0x6a5e57;

/** The benches the roads cut into the dome, for land.ts: every point of every road, as wide as the road and a little more. */
export function benches(): Bench[] {
  const out: Bench[] = [];
  const add = (line: P3[], half: number): void => {
    for (const p of line) if (outOfTrench(p[0], p[2]) > -2) out.push({ x: p[0], z: p[2], y: p[1], half });
  };
  add(LOOP_MIDDLE, HALF + 1.5);
  add(SOUTH, HALF + 1.5);
  for (const t of [TURNS.camp, TURNS.shieldPark]) {
    const y = groundRoadY(t.c[0], t.c[1]);
    for (const p of ringOf(t.c, t.r)) out.push({ x: p[0], z: p[1], y, half: 4.5 });
    out.push({ x: t.c[0], z: t.c[1], y, half: t.r });
  }
  return out;
}

/** Called before the ground is laid, so that the ground knows where the roads cut into it. */
export function cutRoads(): void {
  setBenches(benches());
}

export function buildRoads(k: Build): Route[] {
  // the loop: no sidewalks, a canyon road
  street(k, pathOf(LOOP_MIDDLE, true), { lanes: 2, width: HALF * 2, sidewalk: 0.8, color: CANYON_ROAD, walk: 0x9c8a7a, zebras: false });
  street(k, pathOf(AVENUE), { lanes: 2, width: HALF * 2, sidewalk: 4, color: ROADWAY });
  street(k, pathOf(SOUTH), { lanes: 2, width: HALF * 2, sidewalk: 1.2, color: CANYON_ROAD, walk: 0x9c8a7a });
  for (const t of Object.values(TURNS)) {
    const y = groundRoadY(t.c[0], t.c[1]);
    street(k, pathOf(ringOf(t.c, t.r).map((p): P3 => [p[0], y, p[1]]), true), { lanes: 1, width: LANE + 1.2, sidewalk: 0, color: t === TURNS.field ? ROADWAY : CANYON_ROAD, zebras: false });
  }
  lampsAlong(k, pathOf(AVENUE), HALF + 1.2, 18);
  lampsAlong(k, pathOf(LOOP_MIDDLE, true), HALF + 1.2, 26);
  lampsAlong(k, pathOf(SOUTH), HALF + 1.2, 24);
  return routesOf();
}

/**
 * Who drives the roads: the Augustan column, which the tile's own kinds take
 * the place of once they are built, and the heroes among them.
 */
function routesOf(): Route[] {
  const L = lanes();
  const types = ['van', 'pickup', 'bus'];
  const paint = [0x6b6f63, 0x7a7466, 0x8a2f24, 0x5d6158];
  const route = (id: string, speed: number, count: number): Route => ({ id, segs: segsOf(L[id], true), speed, count, types, paint });
  return [route('loopCw', 11, 8), route('loopCcw', 11, 5), route('gate', 10, 6), route('south', 10, 6)];
}

/** The lanes, for the checks. */
export const LANES: Record<string, P3[]> = lanes();
