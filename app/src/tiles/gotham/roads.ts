// The roads of Gotham: their surfaces, the lanes that traffic follows, and the
// elevated railway.
//
// The pattern is one long street, as a dense city has, and it runs on three
// levels. From the Trigate, a ring over the reach with an arm out to Arkham's
// gate, River Street runs along its terrace over the East End. Kane Street
// leaves it down a ramp between the blocks, meets Harbour Road, and goes on
// over the docks on a viaduct to the Cobblepot Bridge and Lower Gotham, where
// South Street is the front street and Bank Street climbs to Grand Avenue's
// ramp and the rim of the upper city. Harbour Road runs into the Sprang's two
// quays, which are joined over two bascule bridges. North of River Street the
// same street goes on over the Kane Bridge and back along the shelf under
// Crest Hill to the Trigate.
//
// Traffic keeps right, so a lane lies half a lane to the right of the way it
// goes. One route, the long one, drives every street's outer lanes, there and
// back, and never crosses itself: at every junction it turns right, or goes
// straight on past a street that joins from its left. Two short routes drive
// the inner lanes round what the long one goes round: the Sprang's water
// between its bridges, and the canal. So no route shares a lane with another
// and none crosses another on the level.
//
// The elevated railway stands over the middle of the east quay's road, which
// runs the way the view looks: so it hides nothing but its own shadow.

import * as THREE from 'three';
import { beside, eased, fine, pathOf, rounded, segsOf, stretch, type P3 } from '../../engine/corners';
import { flat, rect } from '../../engine/ground';
import { Path, joined } from '../../engine/paths';
import { track, train, trestle, type Bent } from '../../engine/rail';
import { lampsAlong, roadDeck, street } from '../../engine/roads';
import type { Build, Route } from '../../engine/tile';
import { MIX } from './traffic';
import { BRIDGE, BRIDGE_ROAD, CIRCUIT, EL, EL_LOOP, HARBOUR_RD, KANE, KANE_ST, LANE, LOTS, RING, RIVER_ROW, ROADS, SHOW_LANES, SOUTH_ST, SPRANG, STAGES, TRIGATE, TURNS, Y, avenueY, bySprang, groundAt, riverY, sprang, streetY, type P2 } from './plan';

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

// ---------------------------------------------------------------------------
// The streets' corners
// ---------------------------------------------------------------------------

const T = TRIGATE, K = KANE_ST;
const A_UPTOWN = angleOf(T.c, T.uptown), A_BRISTOL = angleOf(T.c, T.bristol), A_ARKHAM = angleOf(T.c, T.arkham.c);
const GAP = gapOf(T.r);

/** The four corners of the Sprang's ring: its bridges' heads, west and east. */
const QW_N = RING[0], QW_S = RING[1], QE_S = RING[2], QE_N = RING[3];
/** Where Kane Street meets River Street, the river road, and Harbour Road, and the bridge's east end. */
const AT_RIVER_ST: P2 = [K.x, CIRCUIT.riverStreet], AT_RIVER_RD: P2 = [K.x, CIRCUIT.riverRoad], AT_HARBOUR: P2 = [K.x, HARBOUR_RD.z];
/** Bank Street's two ends, and the bastion's two corners. */
const BANK_S = ROADS.avenue[0], BANK_N = ROADS.avenue[1], BASTION_S = ROADS.avenue[2], BASTION_N = ROADS.avenue[3];

/**
 * How high the long street is at a place: the circuit of the river north of
 * the terrace, the Sprang's ring on its quays, Grand Avenue's ramp and the
 * rim in the west, and Kane Street's ramp, the viaduct and the bridge in the
 * east.
 */
function longY(x: number, z: number): number {
  if (z < -49) return riverY(x, z);
  const s = bySprang(x, z);
  if (Math.abs(s.d) < SPRANG.road + 4 && s.t > SPRANG.north - 9 && s.t < SPRANG.south + 14) return Y.quay;
  if (x < -20) return z > 40 && z < 76 ? avenueY(x, z) : Y.quay;
  return streetY(x, z);
}

// ---------------------------------------------------------------------------
// The lanes of every route
// ---------------------------------------------------------------------------

/**
 * The long route. Out of the Trigate's ring by its Uptown arm, east along
 * River Street, down Kane Street's ramp, west along Harbour Road, up the east
 * quay, over the north bascule bridge, down the west quay, over the south
 * one, east along Harbour Road again, over the viaduct and the Cobblepot
 * Bridge, west along South Street, up Bank Street and Grand Avenue to the rim
 * and back, on along South Street to its ring and back, over the bridge
 * again, straight up Kane Street and over the Kane Bridge, west along the
 * river road, round the Trigate and out to Arkham's gate and back.
 */
function longLane(): P2[] {
  const rim = TURNS.rim, south = TURNS.south;
  // out: to the rim's ring
  const outMid: P2[] = [onCircle(T.c, T.r, A_UPTOWN), T.uptown, AT_RIVER_ST, AT_HARBOUR, HARBOUR_RD.bend, QE_S, QE_N, QW_N, QW_S, QE_S, HARBOUR_RD.bend, AT_HARBOUR, BRIDGE.east, BRIDGE.west, BRIDGE.foot, BANK_S, BANK_N, BASTION_S, BASTION_N, rim.c];
  const outR = [0, 12, 6, 6, 12, 0, 7, 7, 7, 7, 12, 6, 10, 0, 12, 6, 6, 6, 6, 0];
  const out = laneBeside(outMid, outR);
  const aRim = angleOf(rim.c, BASTION_N), gRim = gapOf(rim.r);
  out[0] = onCircle(T.c, T.r, A_UPTOWN + GAP);
  out[out.length - 1] = onCircle(rim.c, rim.r, aRim - gRim);
  // back from the rim, down Bank Street, and west along South Street to its ring
  const midMid: P2[] = [rim.c, BASTION_N, BASTION_S, BANK_N, BANK_S, south.c];
  const mid = laneBeside(midMid, [0, 6, 6, 6, 6, 0]);
  const aSouth = angleOf(south.c, BANK_S), gSouth = gapOf(south.r);
  mid[0] = onCircle(rim.c, rim.r, aRim + gRim);
  mid[mid.length - 1] = onCircle(south.c, south.r, aSouth - gSouth);
  // home: east along South Street, over the bridge, straight up Kane Street, over the Kane Bridge, and west along the river road
  const homeMid: P2[] = [south.c, BRIDGE.foot, BRIDGE.west, BRIDGE.east, AT_RIVER_RD, T.bristol, onCircle(T.c, T.r, A_BRISTOL)];
  const home = laneBeside(homeMid, [0, 12, 0, 10, 8, 12, 0]);
  home[0] = onCircle(south.c, south.r, aSouth + gSouth);
  home[home.length - 1] = onCircle(T.c, T.r, A_BRISTOL - GAP);
  // round the Trigate to the island's arm, out to the ring before Arkham's gate and back, and on round to the Uptown arm
  const G = T.arkham, back = angleOf(G.c, T.c), g = gapOf(G.r);
  const arkham = A_ARKHAM > A_BRISTOL ? A_ARKHAM - TAU : A_ARKHAM, uptown = A_UPTOWN + GAP - TAU;
  return relaxed([
    ...out,
    ...arc(rim.c, rim.r, aRim - gRim, aRim + gRim - TAU).slice(1, -1),
    ...mid,
    ...arc(south.c, south.r, aSouth - gSouth, aSouth + gSouth - TAU).slice(1, -1),
    ...home,
    ...arc(T.c, T.r, A_BRISTOL - GAP, arkham + GAP).slice(1),
    ...arc(G.c, G.r, back - g, back + g - TAU),
    ...arc(T.c, T.r, arkham - GAP, uptown).slice(0, -1),
  ]);
}

/** The circuit of the river's middle between the Trigate's two arms, as the inner round drives it: the river road, the Kane Bridge, River Street. */
const CANAL_CORNERS: P2[] = [onCircle(T.c, T.r, A_BRISTOL), T.bristol, AT_RIVER_RD, AT_RIVER_ST, T.uptown, onCircle(T.c, T.r, A_UPTOWN)];

/** The inner round of the canal: out of the Trigate by its Bristol arm, east along the river road, south over the Kane Bridge, west along River Street, and a few units round the ring. */
function canalLane(): P2[] {
  const lane = laneBeside(CANAL_CORNERS, [0, 12, 8, 6, 12, 0]);
  lane[0] = onCircle(T.c, T.r, A_BRISTOL + GAP);
  lane[lane.length - 1] = onCircle(T.c, T.r, A_UPTOWN - GAP);
  return relaxed([...lane, ...arc(T.c, T.r, A_UPTOWN - GAP, A_BRISTOL + GAP).slice(1, -1)]);
}

/** The Sprang's ring, as its middle: rounded at its four corners. */
const RING_MIDDLE: P2[] = fine(rounded(RING, 7, true), 1.2);

function lanes(): Record<string, P3[]> {
  return {
    long: inSpace(longLane(), longY, 3),
    canal: inSpace(canalLane(), riverY, 3),
    // walked the way `RING` is given, the river is on the left: the other way round, the lane on the right is the one by the water
    pool: inSpace(beside([...RING_MIDDLE].reverse(), H2, true), () => Y.quay),
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

/** The road from Harbour Road over the viaduct and the Cobblepot Bridge down to South Street, as its middle in space. */
function bridgeRoad(): P3[] {
  return middle(BRIDGE_ROAD, [0, 10, 0, 0], streetY, false, 3);
}

/** How far along that road its ramp into Lower Gotham comes down to the ground. */
const BRIDGE_LANDS = (K.quay - K.viaduct) + Math.hypot(BRIDGE.west[0] - BRIDGE.east[0], BRIDGE.west[1] - BRIDGE.east[1]) + BRIDGE.ramp;

export function buildRoads(k: Build): Route[] {
  const lay = (id: string, line: P3[], closed: boolean, o: Parameters<typeof street>[2]): Path => {
    const path = pathOf(line, closed);
    MIDDLES[id] = path;
    street(k, path, { color: ASPHALT, walk: SIDEWALK, ...o });
    return path;
  };
  const turn = (id: string, t: Turn, y: number): void => void lay(`ring-${id}`, ringOf(t, y), true, { lanes: 0, width: LANE + 1.2, sidewalk: 0, zebras: false });
  const level = (y: number) => (): number => y;

  // River Street, from the Trigate's ring along its Uptown arm to Kane Street, which it meets a hair past the middle
  const river = lay('river', middle([onCircle(T.c, T.r, A_UPTOWN), T.uptown, [K.x + 0.4, CIRCUIT.riverStreet]], [0, 12, 0], riverY, false, 3), false, { lanes: 2, sidewalk: 0, zebras: false });
  // the Kane Bridge and the river road: from River Street's terrace north over the bridge, and west along the shelf to the ring
  const circuit = lay('circuit', middle([[K.x, K.rampTop], AT_RIVER_RD, T.bristol, onCircle(T.c, T.r, A_BRISTOL)], [0, 8, 12, 0], riverY, false, 3), false, { lanes: 2, sidewalk: 0, zebras: false });
  turn('trigate', { c: T.c, r: T.r }, Y.shelf);
  const toGate = unit(T.c, T.arkham.c);
  lay('arkham-arm', middle([onCircle(T.c, T.r, A_ARKHAM), [T.arkham.c[0] - toGate[0] * T.arkham.r, T.arkham.c[1] - toGate[1] * T.arkham.r]], 0, level(Y.shelf)), false, { lanes: 2, sidewalk: 0, zebras: false });
  turn('arkham', T.arkham, Y.shelf);
  // River Street's sidewalks on the terrace, and the river walk on the shelf under Crest Hill
  const walk = (x0: number, z0: number, x1: number, z1: number, y: number): void => flat(k.street, rect(x0, z0, x1, z1), y + 0.015, SIDEWALK, { win: { cell: 1.5, storey: 3, lit: 0.5, kind: 1 } });
  walk(8, CIRCUIT.riverStreet - 8, K.x - 9, CIRCUIT.riverStreet - 5, Y.bluff);
  walk(8, CIRCUIT.riverStreet + 5, K.x - 8, CIRCUIT.riverStreet + 8, Y.bluff);
  walk(-10, CIRCUIT.riverRoad + 5, K.x - 9, CIRCUIT.riverRoad + 7.6, Y.shelf);
  // the service lane under the cliff, which is the show's own: old setts, and no markings
  const S = SHOW_LANES.service;
  lay('service', [[S.x0, S.y, S.z], [S.x1, S.y, S.z]], false, { lanes: 0, width: LANE, sidewalk: 0, color: SETTS, zebras: false });

  // Kane Street, from the viaduct's foot north past Harbour Road and up its ramp to the terrace
  const kane = lay('kane', middle([[K.x, K.viaduct], [K.x, K.rampTop]], 0, streetY, false, 3), false, { lanes: 2, sidewalk: 3 });
  // Harbour Road, from Kane Street west to the quay's road, which it runs on into at the bridge's head
  const harbour = lay('harbour', middle([[K.x + 0.4, HARBOUR_RD.z], HARBOUR_RD.bend, QE_S], [0, 12, 0], level(Y.quay)), false, { lanes: 2, sidewalk: 3 });
  // the Sprang's ring
  const ring = lay('ring', RING_MIDDLE.map((p): P3 => [p[0], Y.quay, p[1]]), true, { lanes: 2, sidewalk: 2, zebras: false });

  // the viaduct, the Cobblepot Bridge and Bridge Street's ramp: a deck, with what carries it. Its towers and cables are the bridge's builder's.
  const over = stretch(bridgeRoad(), 0, BRIDGE_LANDS + 0.2), overPath = pathOf(over, false);
  MIDDLES.bridge = overPath;
  // 0.8 thick, so that the docks' apron has 3.2 under it from edge to edge
  roadDeck(k, overPath, LANE + 0.6, { thick: 0.8, wall: 0.8, lanes: 2, skirt: 2.4, step: 1.5 });

  // South Street, from where the ramp lands west to its ring; Bank Street and Grand Avenue, north from it and up the ramp to the rim
  const landed = over[over.length - 1];
  const south = lay('south', middle([[landed[0], landed[2]], BRIDGE.foot, [SOUTH_ST.west, SOUTH_ST.z]], [0, 12, 0], level(Y.quay)), false, { lanes: 2, sidewalk: 2.4 });
  const avenue = lay('avenue', middle(ROADS.avenue, 6, (x, z) => (z > 76 ? Y.quay : avenueY(x, z)), false, 3), false, { lanes: 2, sidewalk: 3 });
  turn('rim', TURNS.rim, Y.upper);
  turn('south', TURNS.south, Y.quay);

  buildEl(k);

  // lamps, once every street is laid
  lampsAlong(k, river, LANE + 1.2, 24);
  lampsAlong(k, circuit, LANE + 1.2, 24);
  lampsAlong(k, south, LANE + 1.2, 20);
  // the ring and the avenue run under buildings in places: no lamp post stands under one, and none on a story's stage
  lampsClear(k, harbour, LANE + 1.2, 20);
  lampsClear(k, ring, LANE + 1.2, 20);
  lampsClear(k, kane, LANE + 1.2, 20);
  lampsClear(k, avenue, LANE + 1.2, 20);

  return routesOf();
}

/** Whether a place is under something built over a road: the river row, or a lot whose `base` is its underside. */
export function underBuilt(x: number, z: number, room = 0): boolean {
  const s = bySprang(x, z), R = RIVER_ROW;
  if (-s.d > R.d1 - room && -s.d < R.d0 + room && R.blocks.some((b) => s.t > b.from - room && s.t < b.to + room)) return true;
  return LOTS.some((l) => l.file === 'blocks' && l.base > groundAt(l.x0 + 0.5, l.z0 + 0.5) + 4 && x > l.x0 - room && x < l.x1 + room && z > l.z0 - room && z < l.z1 + room);
}

/**
 * Street lamps along a street as `lampsAlong` stands them, on alternate sides, but none under what is built over
 * the street, none where anything drives, and none on a stage of the stories: the museum's steps, the cinema's.
 */
function lampsClear(k: Build, path: Path, off: number, every: number): void {
  const n = Math.floor(path.length / (every / 2)), p = new THREE.Vector3(), q = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const s = (i + 0.5) * (every / 2);
    path.at(s, p);
    path.at(s + 0.5, q);
    const tx = q.x - p.x, tz = q.z - p.z, l = Math.hypot(tx, tz) || 1, side = i % 2 ? 1 : -1;
    const x = p.x + (-tz / l) * off * side, z = p.z + (tx / l) * off * side;
    if (Math.abs(x) > 103 || Math.abs(z) > 112 || underBuilt(x, z, 1.5) || toLane(x, z) < 3.3) continue;
    if (Object.values(STAGES).some((g) => x > g.x0 - 0.5 && x < g.x1 + 0.5 && z > g.z0 - 0.5 && z < g.z1 + 0.5)) continue;
    k.lamp(x, z, Math.atan2(-(tx / l) * side, (tz / l) * side), p.y);
  }
}

/** Where the Sprang's two bascule bridges cross, each from quay to quay, the Kane Bridge, and the Cobblepot Bridge: for whoever builds them, and for the blockout. */
export const SPANS: Record<string, { a: P2; b: P2; y: number; half: number }> = {
  'bascule-north': { a: sprang(SPRANG.north, -SPRANG.half), b: sprang(SPRANG.north, SPRANG.half), y: Y.quay, half: 7.2 },
  'bascule-south': { a: sprang(SPRANG.south, -SPRANG.half), b: sprang(SPRANG.south, SPRANG.half), y: Y.quay, half: 7.2 },
  kane: { a: [KANE.x, KANE.z0], b: [KANE.x, KANE.z1], y: KANE.north, half: 6.2 },
  cobblepot: { a: BRIDGE.east, b: BRIDGE.west, y: BRIDGE.y, half: BRIDGE.half },
};

// ---------------------------------------------------------------------------
// The elevated railway
// ---------------------------------------------------------------------------

/** How far a place is from the middle of the nearest lane on the ground. */
function toLane(x: number, z: number): number {
  let d = Infinity;
  for (const line of Object.values(LANES)) for (const p of line) if (p[1] < 3) d = Math.min(d, Math.hypot(p[0] - x, p[2] - z));
  return d;
}

/** The line on the ground, a point every half unit, for whoever builds under it or beside it. */
export const EL_LINE: P2[] = fine(rounded(EL_LOOP.map((c) => c.p), EL_LOOP.map((c) => c.r), true), 0.5);

/** How far a place is from the railway's line, on the ground. */
export function toEl(x: number, z: number): number {
  let d = Infinity;
  for (const p of EL_LINE) d = Math.min(d, Math.hypot(p[0] - x, p[1] - z));
  return d;
}

function buildEl(k: Build): void {
  const pts = EL_LINE.map((p) => new THREE.Vector3(p[0], EL.y, p[1]));
  const loop = new Path(pts, true);
  MIDDLES.el = loop;
  // A column stands under the track where it may: not in the water, not inside what the line runs through, and
  // nowhere that anything drives. Down Kane Street the columns stand on the west sidewalk, an arm's length from
  // the track; along River Street they stand on the line between its two lanes.
  const bent = (x: number, z: number): Bent => {
    if (groundAt(x, z) < 0 || underBuilt(x, z, 0.6)) return null;
    // none at the four heads of the bascule bridges, nor where the line swings from River Street into Kane Street: there
    // the lanes below bend, and the longest of what drives needs the room
    if (RING.some((c) => Math.hypot(c[0] - x, c[1] - z) < 11)) return null;
    if (x > 68.2 && z < KANE_ST.rampTop && z > CIRCUIT.riverStreet + 0.6) return null;
    if (Math.abs(x - EL.kane) < 0.4 && z > KANE_ST.rampTop && z < EL.harbour - 8) return toLane(x - 1.8, z) > 2.1 ? { arm: 1.8 } : null;
    return toLane(x, z) < 2.1 ? null : 'T';
  };
  trestle(k, loop, { every: 8, bent, color: 0x3d4247 });
  track(k, loop);
  // where it crosses water it is a bridge: a truss each side of the track, from bank to bank
  const wet = EL_LINE.map((p) => groundAt(p[0], p[1]) < 0), n = EL_LINE.length, STEELWORK = 0x4a5058;
  for (let i = 0; i < n; i++) {
    if (!wet[i] || wet[(i + n - 1) % n]) continue;
    let j = i;
    while (wet[(j + 1) % n] && j - i < n) j++;
    // a little way onto each bank
    const from = i - 8, to = j + 8, bay = 8;
    for (const side of [-1, 1]) {
      const at = (m: number, up: number): [number, number, number] => {
        const p = EL_LINE[((m % n) + n) % n], q = EL_LINE[(((m + 1) % n) + n) % n], l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
        return [p[0] + (-(q[1] - p[1]) / l) * 1.75 * side, EL.y - 0.4 + up, p[1] + ((q[0] - p[0]) / l) * 1.75 * side];
      };
      for (let m = from; m < to; m += bay) {
        const e = Math.min(to, m + bay), mid = Math.round((m + e) / 2);
        k.b.beam(at(m, 4.2), at(e, 4.2), 0.2, 0.2, STEELWORK);
        k.b.beam(at(m, 0), at(m, 4.2), 0.16, 0.16, STEELWORK);
        k.b.beam(at(m, 4.2), at(mid, 0), 0.14, 0.14, STEELWORK);
        k.b.beam(at(mid, 0), at(e, 4.2), 0.14, 0.14, STEELWORK);
      }
      k.b.beam(at(to, 0), at(to, 4.2), 0.16, 0.16, STEELWORK);
    }
    // a tie over the track at each end, and a red lamp on it
    for (const m of [from, to]) {
      const p = EL_LINE[((m % n) + n) % n];
      k.glows.push({ x: p[0], y: EL.y + 4.3, z: p[1], sx: 0.3, sy: 0.3, sz: 0.3, color: '#ff4a3a' });
    }
  }
  // Two stations, each on the side away from the buildings, and a train of two cars that goes round and round. The
  // docks' stairs leave from the platform's east end and turn back, to land in the yard: straight on they would end
  // in the river or under the viaduct. River Street's go on east, down to the terrace's sidewalk.
  const park = elStation(k, loop, loop.closest(56, EL.harbour), { length: 17, side: -1, roof: 0x2f4a44, ground: Y.quay, stairs: { end: -1, back: true } });
  const river = elStation(k, loop, loop.closest(38, CIRCUIT.riverStreet), { length: 17, side: -1, roof: 0x2f4a44, ground: Y.bluff, stairs: { end: 1, back: false } });
  train(k, loop, { cars: 2, speed: 12, stops: [river, park].sort((p, q) => p - q), from: loop.closest(60, CIRCUIT.riverStreet), body: 0x566068, stripe: 0x8a2f2a, dwell: 6 });
}
// ---------------------------------------------------------------------------
// The elevated railway's stations
// ---------------------------------------------------------------------------

/** How far the floor of a car is above the line its track follows, and how far its side is from the track's middle: the engine's own, in rail.ts. */
const CAR_FLOOR = 0.67, HALF_CAR = 1.32;

interface ElStation {
  length: number;
  /** Which side of the track it is on, for someone riding along the line: 1 is the right, -1 the left. */
  side: 1 | -1;
  roof: number;
  /** How high the ground under it is. */
  ground: number;
  /** Its stairs: from which end they leave (1 the far one, as the train goes), and whether they turn back on a landing half way down. */
  stairs: { end: 1 | -1; back: boolean };
}

/**
 * A station of the elevated railway. It is the engine's own (`station` in rail.ts) in its platform, its canopy, its
 * lamps and the people who wait, but it stands on ground of any height, and its stairs are open flights that leave
 * from either end and can turn back on a landing: the engine's run straight on to height 0, which here was into the
 * river at the docks and into the terrace on River Street. Returns where a train stops for it.
 */
function elStation(k: Build, path: Path, at: number, o: ElStation): number {
  const b = k.b, width = 4.6, inner = HALF_CAR + 0.43, outer = inner + width;
  const IRONWORK = 0x5b4a42, WOOD = 0xb9a888, EDGE = 0xe9c94a, CREAM = 0xe9e3d6;
  const P = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3();
  interface Frame { x: number; y: number; z: number; tx: number; tz: number; rx: number; rz: number }
  const frame = (s: number): Frame => {
    path.at(s, P); path.at(s + 0.6, A); path.at(s - 0.6, B);
    const tx = A.x - B.x, tz = A.z - B.z, l = Math.hypot(tx, tz) || 1;
    return { x: P.x, y: P.y, z: P.z, tx: tx / l, tz: tz / l, rx: -tz / l, rz: tx / l };
  };
  const mid = frame(at), deck = mid.y + CAR_FLOOR, G = o.ground;
  const yawAlong = (f: Frame): number => Math.atan2(f.tz, f.tx);
  const put = (f: Frame, lat: number): [number, number] => [f.x + f.rx * lat * o.side, f.z + f.rz * lat * o.side];

  // the platform, in short lengths so that it follows the track round a bend
  const steps = Math.max(1, Math.round(o.length / 2)), piece = o.length / steps;
  for (let i = 0; i < steps; i++) {
    const f = frame(at - o.length / 2 + (i + 0.5) * piece);
    const [x, z] = put(f, (inner + outer) / 2);
    b.obox(x, deck - 0.18, z, piece / 2 + 0.02, 0.18, width / 2, yawAlong(f), WOOD, { faces: 'B' });
    const [ex, ez] = put(f, inner + 0.14);
    b.obox(ex, deck + 0.01, ez, piece / 2 + 0.02, 0.012, 0.14, yawAlong(f), EDGE);
    const [rx, rz] = put(f, outer - 0.07);
    b.obox(rx, deck + 0.42, rz, piece / 2 + 0.02, 0.42, 0.06, yawAlong(f), IRONWORK);
  }
  // columns under its outer edge, from the ground, each with a beam back to the track's girders
  const posts = Math.max(2, Math.round(o.length / 5.5));
  for (let i = 0; i <= posts; i++) {
    const f = frame(at - o.length / 2 + 0.6 + (i / posts) * (o.length - 1.2));
    const yaw = Math.atan2(f.rz, f.rx);
    const [x, z] = put(f, outer - 0.35);
    b.obox(x, (G + deck - 0.36) / 2, z, 0.26, (deck - 0.36 - G) / 2, 0.26, yaw, IRONWORK);
    const [bx, bz] = put(f, (outer + 1.0) / 2);
    b.obox(bx, deck - 0.6, bz, (outer - 1.0) / 2, 0.24, 0.26, yaw, IRONWORK, { faces: 'B' });
  }
  // the canopy over the middle of it, on posts along the outer edge, with lamps under it
  const cover = o.length * 0.62, top = deck + 3.5;
  const covers = Math.max(1, Math.round(cover / 2)), cp = cover / covers;
  for (let i = 0; i < covers; i++) {
    const f = frame(at - cover / 2 + (i + 0.5) * cp);
    const [x, z] = put(f, (inner + outer) / 2 + 0.2);
    b.obox(x, top, z, cp / 2 + 0.02, 0.13, width / 2 + 0.25, yawAlong(f), CREAM, { top: o.roof, faces: 'B' });
  }
  for (const u of [-0.5, -0.17, 0.17, 0.5]) {
    const f = frame(at + u * (cover - 0.8));
    const [x, z] = put(f, outer - 0.3);
    b.box(x - 0.1, deck, z - 0.1, x + 0.1, top - 0.13, z + 0.1, IRONWORK);
    const [gx, gz] = put(f, (inner + outer) / 2);
    k.glows.push({ x: gx, y: top - 0.22, z: gz, sx: 0.5, sy: 0.14, sz: 0.5, color: '#fff3dc' });
  }
  // people waiting
  for (let i = 0; i < Math.round(o.length / 3); i++) {
    const f = frame(at - o.length / 2 + 1 + k.rand() * (o.length - 2));
    const [x, z] = put(f, inner + 0.8 + k.rand() * (width - 1.6));
    k.person(x, z, deck);
  }

  // the stairs: open flights of treads on two strings, a landing on posts where they turn back, a rail each side
  const end = frame(at + (o.stairs.end * o.length) / 2), out = o.stairs.end, yaw = yawAlong(end);
  const flights = o.stairs.back ? 2 : 1, rise = (deck - G) / flights, n = Math.ceil(rise / 0.8), tread = 0.95, run = n * tread;
  /** A place by the stairs: `a` out from the platform's end along the line, `lat` out from the track, `y` up. */
  const S = (a: number, lat: number, y: number): [number, number, number] => { const [x, z] = put(end, lat); return [x + end.tx * out * a, y, z + end.tz * out * a]; };
  for (let fl = 0; fl < flights; fl++) {
    const lat = outer - 0.75 + fl * 1.5, y0 = deck - rise * fl, y1 = y0 - rise;
    // the first flight goes out from the end, the second comes back beside it
    const a0 = fl === 0 ? 0 : run, a1 = fl === 0 ? run : 0;
    for (let i = 0; i < n; i++) {
      // the last riser of a flight steps down onto the landing or the ground, so no tread lies in either's surface
      const u = (i + 0.5) / n, p = S(a0 + (a1 - a0) * u, lat, y0 + (y1 - y0) * ((i + 1) / (n + 1)));
      b.obox(p[0], p[1] - 0.07, p[2], tread / 2 + 0.02, 0.07, 0.7, yaw, WOOD, { faces: 'NESWTB' });
    }
    for (const s of [-0.72, 0.72]) {
      b.beam(S(a0, lat + s, y0 - 0.25), S(a1, lat + s, y1 - 0.25), 0.11, 0.11, IRONWORK);
      b.beam(S(a0, lat + s, y0 + 0.95), S(a1, lat + s, y1 + 0.95), 0.05, 0.05, IRONWORK);
      for (const u of [0, 0.5, 1]) b.beam(S(a0 + (a1 - a0) * u, lat + s, y0 + (y1 - y0) * u - 0.2), S(a0 + (a1 - a0) * u, lat + s, y0 + (y1 - y0) * u + 0.95), 0.04, 0.04, IRONWORK);
    }
  }
  if (o.stairs.back) {
    // the landing where they turn, on four posts
    const yL = deck - rise, c = S(run + 0.75, outer, yL - 0.09);
    b.obox(c[0], c[1], c[2], 0.78, 0.09, 1.5, yaw, WOOD, { faces: 'NESWTB' });
    for (const a of [run + 0.1, run + 1.4]) for (const lat of [outer - 1.4, outer + 1.4]) b.beam(S(a, lat, G), S(a, lat, yL - 0.15), 0.12, 0.12, IRONWORK);
    b.beam(S(run + 1.5, outer - 1.45, yL + 0.95), S(run + 1.5, outer + 1.45, yL + 0.95), 0.05, 0.05, IRONWORK);
  }
  const [lx, lz] = put(mid, (inner + outer) / 2);
  k.lights.push({ x: lx, z: lz, r: 11, color: '#fff0d6', k: 0.5 });
  return at;
}
// ---------------------------------------------------------------------------
// Who drives
// ---------------------------------------------------------------------------

/**
 * Who drives the roads. Plain traffic for now, in Gotham's dark paint; the
 * tile's own kinds take their place once they are built.
 */
function routesOf(): Route[] {
  const paint = [0x1f2126, 0x2c3340, 0x3d2a2a, 0x4a4d55, 0x70757f, 0x8c8473, 0x26352f, 0xd9b23a];
  // a route with kinds of its own is not repainted: a route's paint would repaint its cabs and cruisers too
  const route = (id: string, speed: number, count: number): Route => ({ id, segs: segsOf(LANES[id], true), speed, count, ...(MIX[id]?.length ? { types: MIX[id] } : { paint }) });
  return [route('long', 11, 46), route('canal', 11, 6), route('pool', 10, 5)];
}
