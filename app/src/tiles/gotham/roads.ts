// The roads of Gotham: their surfaces, and the lanes that traffic follows.
//
// The pattern, which no other tile has. The Trigate: three arms meeting in a
// ring over the water. The circuit of the river: River Street on Uptown's
// bluff, the Kane Bridge, the river road on the shelf under Crest Hill, and
// the Trigate, where the outer round goes out to Arkham's gate and back. The
// Sprang's ring: its two quays joined over two bascule bridges, straight up
// the middle of the view. Grand Avenue, which climbs the ramp along the upper
// city's wall, turns back on the bastion and runs along the rim above its own
// ramp. The bay shore road and Harbour Road, each there and back between two
// rings.
//
// Traffic keeps right, so a lane lies half a lane to the right of the way it
// goes, and a ring is driven the way the clock does not turn. No route shares
// a lane with another and none crosses another: every route is a loop of its
// own, and where one must pass another it is in the lane beside it.

import { beside, eased, fine, pathOf, rounded, segsOf, type P3 } from '../../engine/corners';
import { flat, rect } from '../../engine/ground';
import type { Path } from '../../engine/paths';
import { lampsAlong, street } from '../../engine/roads';
import type { Build, Route } from '../../engine/tile';
import { BLUFF, CIRCUIT, KANE, LANE, RING, ROADS, SHOW_LANES, SPRANG, TRIGATE, TURNS, Y, avenueY, inside, sprang, type P2 } from './plan';

const H2 = LANE / 2, TAU = Math.PI * 2;

/** A ring that a road turns back in. */
interface Turn { c: P2; r: number }

// ---------------------------------------------------------------------------
// Lines
// ---------------------------------------------------------------------------

const unit = (a: P2, b: P2): P2 => {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
};
/** The angle of a place seen from a middle. Angles grow the way the clock turns, seen from above. */
const angleOf = (c: P2, p: P2): number => Math.atan2(p[1] - c[1], p[0] - c[0]);
const onCircle = (c: P2, r: number, a: number): P2 => [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];

/** Points round a middle from one angle to another, about a unit apart. */
function arc(c: P2, r: number, a0: number, a1: number): P2[] {
  const n = Math.max(4, Math.ceil(Math.abs(a1 - a0) * r));
  return Array.from({ length: n + 1 }, (_, i): P2 => onCircle(c, r, a0 + ((a1 - a0) * i) / n));
}

/** The line `d` to the right of an open line of corners, its corners mitred. */
function offset(pts: P2[], d: number): P2[] {
  const n = pts.length;
  return pts.map((p, i): P2 => {
    const din = i > 0 ? unit(pts[i - 1], p) : unit(p, pts[i + 1]), dout = i < n - 1 ? unit(p, pts[i + 1]) : din;
    // right of a way (dx, dz) is (-dz, dx): south, for someone going east
    const k = 1 + din[0] * dout[0] + din[1] * dout[1];
    return [p[0] + ((-din[1] - dout[1]) * d) / k, p[1] + ((din[0] + dout[0]) * d) / k];
  });
}

/**
 * The lane to the right of a road's middle, between its two ends: its corners
 * rounded as the middle's are, about `r`, tighter on the inside of a bend and
 * wider on the outside, so that the two lanes of a road stay side by side.
 */
function laneBeside(mid: P2[], r: number | number[]): P2[] {
  const out = offset(mid, H2);
  const radii = mid.map((p, i) => {
    if (i === 0 || i === mid.length - 1) return 0;
    const a = unit(mid[i - 1], p), b = unit(p, mid[i + 1]), rm = typeof r === 'number' ? r : r[i];
    // a positive cross is a turn to the right, where the right-hand lane is the inner one
    return Math.max(3, rm + (a[0] * b[1] - a[1] * b[0] > 0 ? -H2 : H2));
  });
  return rounded(out, radii);
}

/**
 * Smooths a closed line where its pieces meet at an angle, as a lane does
 * where it turns from an arm onto a ring: each point is moved to the middle
 * of its neighbours within `reach` along the line.
 */
function relaxed(pts: P2[], reach = 2.2): P2[] {
  const dense = fine([...pts, pts[0]], 0.7).slice(0, -1), n = dense.length;
  const steps = Math.max(1, Math.round(reach / 0.7));
  return dense.map((_, i): P2 => {
    let x = 0, z = 0, w = 0;
    for (let k = -steps; k <= steps; k++) {
      const q = dense[(((i + k) % n) + n) % n], wt = steps + 1 - Math.abs(k);
      x += q[0] * wt; z += q[1] * wt; w += wt;
    }
    return [x / w, z / w];
  });
}

/** A closed lane on the ground, given heights and eased where its slope changes. */
function inSpace(pts: P2[], y: (x: number, z: number) => number, ease = 0): P3[] {
  const line = pts.map((p): P3 => [p[0], y(p[0], p[1]), p[1]]);
  return ease > 0 ? eased(line, ease, true) : line;
}

/** How far to either side of a ring's arm its two lanes meet the ring, as an angle. */
const gapOf = (r: number): number => Math.asin(H2 / r);

/**
 * The lane of a road that goes there and back between two rings: out along
 * the right of its middle, round the far ring the way the clock does not
 * turn, back along the other side, and round the near ring.
 */
function thereAndBack(mid: P2[], near: Turn, far: Turn, r: number): P2[] {
  const n = mid.length;
  const a1 = angleOf(near.c, mid[1]), g1 = gapOf(near.r), a2 = angleOf(far.c, mid[n - 2]), g2 = gapOf(far.r);
  const out = laneBeside(mid, r), back = laneBeside([...mid].reverse(), r);
  // each lane meets its ring at the ring, not at its middle
  out[0] = onCircle(near.c, near.r, a1 + g1);
  out[out.length - 1] = onCircle(far.c, far.r, a2 - g2);
  back[0] = onCircle(far.c, far.r, a2 + g2);
  back[back.length - 1] = onCircle(near.c, near.r, a1 - g1);
  return relaxed([
    ...out,
    ...arc(far.c, far.r, a2 - g2, a2 + g2 - TAU).slice(1, -1),
    ...back,
    ...arc(near.c, near.r, a1 - g1, a1 + g1 - TAU).slice(1, -1),
  ]);
}

// ---------------------------------------------------------------------------
// The circuit of the river, and the Trigate
// ---------------------------------------------------------------------------

const T = TRIGATE;
const A_UPTOWN = angleOf(T.c, T.uptown), A_BRISTOL = angleOf(T.c, T.bristol), A_ARKHAM = angleOf(T.c, T.arkham.c);
const GAP = gapOf(T.r);

/** The circuit's middle, from the Trigate's ring out along its Uptown arm, round by the Kane Bridge, and back to the ring along its Bristol arm. */
const CIRCUIT_CORNERS: P2[] = [
  onCircle(T.c, T.r, A_UPTOWN), T.uptown, [CIRCUIT.bridge, CIRCUIT.riverStreet], [CIRCUIT.bridge, CIRCUIT.riverRoad], T.bristol, onCircle(T.c, T.r, A_BRISTOL),
];
const CIRCUIT_RADII = [0, 12, 8, 8, 12, 0];

function circuitLanes(): { outer: P2[]; inner: P2[] } {
  // The outer round: out of the ring by the Uptown arm, east along River Street, north over the bridge, west along
  // the river road, into the ring by the Bristol arm, round it to the island's arm, out to the ring before Arkham's
  // gate and back, and on round the ring to the Uptown arm again.
  const east = laneBeside(CIRCUIT_CORNERS, CIRCUIT_RADII);
  east[0] = onCircle(T.c, T.r, A_UPTOWN + GAP);
  east[east.length - 1] = onCircle(T.c, T.r, A_BRISTOL - GAP);
  const G = T.arkham, back = angleOf(G.c, T.c), g = gapOf(G.r);
  // the angles of the three arms, each brought below the one before it, the way the ring is driven
  const arkham = A_ARKHAM > A_BRISTOL ? A_ARKHAM - TAU : A_ARKHAM, uptown = A_UPTOWN + GAP - TAU;
  const outer = relaxed([
    ...east,
    ...arc(T.c, T.r, A_BRISTOL - GAP, arkham + GAP).slice(1),
    ...arc(G.c, G.r, back - g, back + g - TAU),
    ...arc(T.c, T.r, arkham - GAP, uptown).slice(0, -1),
  ]);
  // The inner round: into the ring by the Uptown arm, a few units round it, out by the Bristol arm, east along the
  // river road, south over the bridge, and west along River Street.
  const west = laneBeside([...CIRCUIT_CORNERS].reverse(), [...CIRCUIT_RADII].reverse());
  west[0] = onCircle(T.c, T.r, A_BRISTOL + GAP);
  west[west.length - 1] = onCircle(T.c, T.r, A_UPTOWN - GAP);
  const inner = relaxed([...west, ...arc(T.c, T.r, A_UPTOWN - GAP, A_BRISTOL + GAP).slice(1, -1)]);
  return { outer, inner };
}

// ---------------------------------------------------------------------------
// The lanes of every route
// ---------------------------------------------------------------------------

const level = (y: number) => (): number => y;

/** Where the Trigate's Uptown arm comes ashore on the bluff, as a distance from the ring's middle. */
const ASHORE = Math.hypot(-10.9 - T.c[0], -50 - T.c[1]);

/**
 * How high the circuit is at a place: on the bluff along River Street, on the
 * shelf along the river road and round the Trigate, and sloping between the
 * two over the Kane Bridge and along the Trigate's Uptown arm.
 */
function circuitY(x: number, z: number): number {
  if (inside(BLUFF, x, z) || (z > -50.5 && x > -12)) return Y.bluff;
  if (Math.abs(x - KANE.x) < 12 && z > KANE.z0 && z < KANE.z1) return KANE.north + ((KANE.south - KANE.north) * (z - KANE.z0)) / (KANE.z1 - KANE.z0);
  // the Uptown arm: it leaves the ring towards the south-east
  const d = Math.hypot(x - T.c[0], z - T.c[1]);
  if (x > T.c[0] && z > T.c[1] - 2 && d > T.r + 1 && d < ASHORE + 2) return Y.shelf + (Y.bluff - Y.shelf) * Math.min(1, Math.max(0, (d - T.r - 1) / (ASHORE - T.r - 1)));
  return Y.shelf;
}

/** The Sprang's ring, as its middle: rounded at its four corners. */
const RING_MIDDLE: P2[] = fine(rounded(RING, 7, true), 1.2);

function lanes(): Record<string, P3[]> {
  const { outer, inner } = circuitLanes();
  // walked the way `RING` is given, the river is on the left: so the lane on its right is the outer one, by the buildings
  const ringOut = beside(RING_MIDDLE, H2, true), ringIn = beside([...RING_MIDDLE].reverse(), H2, true);
  return {
    circuitOuter: inSpace(outer, circuitY, 3),
    circuitInner: inSpace(inner, circuitY, 3),
    ringOuter: inSpace(ringOut, level(Y.quay)),
    ringInner: inSpace(ringIn, level(Y.quay)),
    bayshore: inSpace(thereAndBack(ROADS.bayshore, TURNS.battery, TURNS.market, 9), level(Y.quay)),
    avenue: inSpace(thereAndBack(ROADS.avenue, TURNS.avenueFoot, TURNS.rim, 6), avenueY, 3),
    harbour: inSpace(thereAndBack(ROADS.harbour, TURNS.harbourWest, TURNS.harbourEast, 6), level(Y.quay)),
  };
}

/** The lanes, for the checks and for whoever asks where the roads are. */
export const LANES: Record<string, P3[]> = lanes();

// ---------------------------------------------------------------------------
// The surfaces
// ---------------------------------------------------------------------------

/** Wet asphalt, the sidewalks' stone, and the service lane's older setts. */
export const ASPHALT = 0x34363b, SIDEWALK = 0x8a8d94, SETTS = 0x4a4744;

/** The middle of every road as a path, for whoever builds along one: a bridge, a ramp's wall, a row of lamps. */
export const MIDDLES: Record<string, Path> = {};

/** A road's middle from its corners, rounded, a point every unit and a half, at the heights it is given. */
function middle(corners: P2[], r: number | number[], y: (x: number, z: number) => number, closed = false, ease = 0): P3[] {
  const line = fine(rounded(corners, r, closed), 1.5).map((p): P3 => [p[0], y(p[0], p[1]), p[1]]);
  return ease > 0 ? eased(line, ease, closed) : line;
}

/** A ring to turn in, as a closed line round its middle. */
function ringOf(t: Turn, y: number): P3[] {
  const n = Math.ceil((TAU * t.r) / 1.2);
  return Array.from({ length: n }, (_, i): P3 => { const p = onCircle(t.c, t.r, (i / n) * TAU); return [p[0], y, p[1]]; });
}

export function buildRoads(k: Build): Route[] {
  const lay = (id: string, line: P3[], closed: boolean, o: Parameters<typeof street>[2]): Path => {
    const path = pathOf(line, closed);
    MIDDLES[id] = path;
    street(k, path, { color: ASPHALT, walk: SIDEWALK, ...o });
    return path;
  };
  const turn = (id: string, t: Turn, y: number): void => void lay(`ring-${id}`, ringOf(t, y), true, { lanes: 0, width: LANE + 1.2, sidewalk: 0, zebras: false });

  // the circuit of the river: one road from the Trigate's ring round to the ring again, the ring, and the island's arm
  const circuit = lay('circuit', middle(CIRCUIT_CORNERS, CIRCUIT_RADII, circuitY, false, 3), false, { lanes: 2, sidewalk: 0, zebras: false });
  turn('trigate', { c: T.c, r: T.r }, Y.shelf);
  const toGate = unit(T.c, T.arkham.c);
  lay('arkham-arm', middle([onCircle(T.c, T.r, A_ARKHAM), [T.arkham.c[0] - toGate[0] * T.arkham.r, T.arkham.c[1] - toGate[1] * T.arkham.r]], 0, level(Y.shelf)), false, { lanes: 2, sidewalk: 0, zebras: false });
  turn('arkham', T.arkham, Y.shelf);
  // River Street's sidewalks on the bluff, and the river walk on the shelf under Crest Hill
  const walk = (x0: number, z0: number, x1: number, z1: number, y: number): void => flat(k.street, rect(x0, z0, x1, z1), y + 0.015, SIDEWALK, { win: { cell: 1.5, storey: 3, lit: 0.5, kind: 1 } });
  walk(8, CIRCUIT.riverStreet - 8, CIRCUIT.bridge - 9, CIRCUIT.riverStreet - 5, Y.bluff);
  walk(8, CIRCUIT.riverStreet + 5, CIRCUIT.bridge - 9, CIRCUIT.riverStreet + 8, Y.bluff);
  walk(-10, CIRCUIT.riverRoad + 5, CIRCUIT.bridge - 9, CIRCUIT.riverRoad + 7.6, Y.shelf);
  // the service lane under the cliff, which is the show's own: old setts, and no markings
  const S = SHOW_LANES.service;
  lay('service', [[S.x0, S.y, S.z], [S.x1, S.y, S.z]], false, { lanes: 0, width: LANE, sidewalk: 0, color: SETTS, zebras: false });

  // the Sprang's ring
  const ring = lay('ring', RING_MIDDLE.map((p): P3 => [p[0], Y.quay, p[1]]), true, { lanes: 2, sidewalk: 2, zebras: false });

  // the roads that go there and back, and their rings
  const bayshore = lay('bayshore', middle(ROADS.bayshore, 9, level(Y.quay)), false, { lanes: 2, sidewalk: 2 });
  const avenue = lay('avenue', middle(ROADS.avenue, 6, avenueY, false, 3), false, { lanes: 2, sidewalk: 3 });
  const harbour = lay('harbour', middle(ROADS.harbour, 6, level(Y.quay)), false, { lanes: 2, sidewalk: 3 });
  for (const [id, t] of Object.entries(TURNS)) turn(id, t, id === 'rim' ? Y.upper : Y.quay);

  // lamps, once every street is laid
  lampsAlong(k, circuit, LANE + 1.2, 24);
  lampsAlong(k, ring, LANE + 1.2, 20);
  lampsAlong(k, bayshore, LANE + 1.2, 22);
  lampsAlong(k, avenue, LANE + 1.2, 20);
  lampsAlong(k, harbour, LANE + 1.2, 22);

  return routesOf();
}

/** Where the Sprang's two bascule bridges cross, each from quay to quay, and the Kane Bridge: for whoever builds them, and for the blockout. */
export const SPANS: Record<string, { a: P2; b: P2; y: number; half: number }> = {
  'bascule-north': { a: sprang(SPRANG.north, -SPRANG.half), b: sprang(SPRANG.north, SPRANG.half), y: Y.quay, half: 7.2 },
  'bascule-south': { a: sprang(SPRANG.south, -SPRANG.half), b: sprang(SPRANG.south, SPRANG.half), y: Y.quay, half: 7.2 },
  kane: { a: [KANE.x, KANE.z0], b: [KANE.x, KANE.z1], y: KANE.north, half: 6.2 },
};

/**
 * Who drives the roads. Plain traffic for now, in Gotham's dark paint; the
 * tile's own kinds take their place once they are built.
 */
function routesOf(): Route[] {
  const paint = [0x1f2126, 0x2c3340, 0x3d2a2a, 0x4a4d55, 0x70757f, 0x8c8473, 0x26352f, 0xd9b23a];
  const route = (id: string, speed: number, count: number): Route => ({ id, segs: segsOf(LANES[id], true), speed, count, paint });
  return [
    route('circuitOuter', 11, 6), route('circuitInner', 11, 5),
    route('ringOuter', 10, 5), route('ringInner', 10, 5),
    route('bayshore', 10, 5), route('avenue', 9, 6), route('harbour', 9, 3),
  ];
}
