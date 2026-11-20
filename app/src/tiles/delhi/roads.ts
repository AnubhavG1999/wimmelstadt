// Delhi's roads: where its streets are laid, and the loops its traffic drives.
//
// Traffic keeps left. Three long roads each go there and back, with a place to
// turn round at either end, and two circles sort them where they meet:
//
//   the Ring Road   from Dhaula Kuan's loop east over the flyovers at Moti Bagh
//                   and AIIMS, north beside the river, over the Signature
//                   Bridge and down the east bank to Akshardham's gate
//   the long drive  from the Qutub Minar up Aurobindo Marg, under the AIIMS
//                   flyover, round part of India Gate's hexagon, along Kartavya
//                   Path and up Raisina Hill, and back the long way round the
//                   hexagon
//   Shanti Path     from below South Block, under the Moti Bagh flyover, to
//                   R. K. Puram and along Kaifi Azmi Marg to the school's gate
//
// A fourth runs from Karol Bagh to Connaught Place, half round its Outer
// Circle, up Netaji Subhash Marg to Kashmere Gate, and back round the other
// half. Each of the two circles is driven exactly once round by the road that
// uses it, so no lane is shared and nothing ever crosses on the level: the
// Ring Road goes over the two streets it meets.

import type { StreetOpts } from '../../engine/roads';
import type { Hump, Seg } from '../../engine/paths';
import type { Route } from '../../engine/tile';
import { circle, line, loop, run, shift, type P2, type Step } from '../../engine/lanes';
import { Trace, back, endOf, from, lane, toSegs, type Piece } from '../../engine/lines';
import {
  AKBAR_FOOT, AUROBINDO_X, AXIS_Z, BUDDH, CHANDNI, CP, CP_R, CP_ROAD_Z, HEX, HEX_LANES, KAROL_BAGH_TURN, KASHMERE_TURN, METRO, NS_MARG_X, QUTUB_TURN,
  RAISINA, RAISINA_TURN, RING, SHANTI, SHANTI_X, TURN_R, hexCorner,
} from './plan';

/** From the middle of a two-lane street to the middle of either lane. */
const HALF = 2.5;

const straight = (a: P2, b: P2, y = 0): Seg[] => [{ t: 'poly', pts: [a, b], y, r: 0 }];
const ringOf = (c: P2, r: number, y = 0): Seg[] => loop([{ g: circle(c, r, true) }], { y });
/** The point `d` from a towards b. */
const towards = (a: P2, b: P2, d: number): P2 => {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [a[0] + ((b[0] - a[0]) * d) / l, a[1] + ((b[1] - a[1]) * d) / l];
};

// ---------------------------------------------------------------------------
// The Ring Road
// ---------------------------------------------------------------------------

/**
 * The middle of the Ring Road's verge, drawn as with a pen, in six parts:
 * the south leg with its two flyovers, the stretch on the ground round the
 * corner and up beside the river, the way up onto the bridge, its span, the
 * way down again, and the east bank.
 *
 * The road climbs to the bridge while it runs straight, and turns on the
 * level: a deck that climbs round a bend is twisted, and every stretch of it
 * is drawn with a line across the road.
 */
function ringParts(): { fly: Piece[]; river: Piece[]; rise: Piece[]; span: Piece[]; fall: Piece[]; bank: Piece[] } {
  const R = RING;
  const t = new Trace(R.x0, R.z, 0, 0);
  const cut = (): Piece[] => t.pieces.splice(0, t.pieces.length);
  // a ramp is eased at its foot and at its head: two units at half its slope
  const g = R.fly / (R.ramp - 2);
  const up = (): void => { t.go(2, g).go(R.ramp - 4, R.fly - g).go(2, R.fly); };
  const down = (): void => { t.go(2, R.fly - g).go(R.ramp - 4, g).go(2, 0); };
  t.go(2);
  up(); t.go(R.span); down(); // Moti Bagh, over Shanti Path
  up(); t.go(R.span); down(); // AIIMS, over Aurobindo Marg
  const fly = cut();
  // the swing south, the corner, and north beside the river
  t.turn(45, 12).go(11.3).turn(-45, 12).goToX(R.x1 - 10).turn(-90, 10).goToZ(R.bridgeZ + 10 + R.climb);
  const river = cut();
  const h = R.deck / (R.climb - 2);
  // (each approach ends in a unit of straight road, so that its deck ends square to the span's)
  t.go(2, h).go(R.climb - 4, R.deck - h).go(2, R.deck).turn(90, 10).go(1);
  const rise = cut();
  t.goToX(R.x2 - 11);
  const span = cut();
  t.go(1).turn(90, 10).go(2, R.deck - h).go(R.climb - 4, h).go(2, 0);
  const fall = cut();
  t.goToZ(R.endZ);
  return { fly, river, rise, span, fall, bank: cut() };
}

export const RING_PARTS = ringParts();
const RING_LINE: Piece[] = [...RING_PARTS.fly, ...RING_PARTS.river, ...RING_PARTS.rise, ...RING_PARTS.span, ...RING_PARTS.fall, ...RING_PARTS.bank];

/** The lane out, the loop at Akshardham's gate, the lane home, and Dhaula Kuan's loop. */
export const RING_LANES = (() => {
  const out = lane(RING_LINE, RING.off);
  const far = from(endOf(out)).loopBack(2 * RING.off, RING.loop).pieces;
  const home = lane(back(RING_LINE), RING.off);
  const near = from(endOf(home)).loopBack(2 * RING.off, RING.loop).pieces;
  return { out, far, home, near };
})();

/** Where the two flyovers' spans are, along x: the road is open underneath between these. */
export const FLYOVERS = (() => {
  const a = RING.x0 + 2 + RING.ramp, b = a + RING.span + 2 * RING.ramp;
  return [{ id: 'moti-bagh', x0: a, x1: a + RING.span, over: SHANTI_X }, { id: 'aiims', x0: b, x1: b + RING.span, over: AUROBINDO_X }];
})();

// ---------------------------------------------------------------------------
// The Metro's line: the middle of its viaduct
// ---------------------------------------------------------------------------

export const METRO_LINE: Piece[] = new Trace(METRO.x0, RING.z, 0, METRO.y)
  .goToX(RING.x0 + 2 + 2 * (RING.span + 2 * RING.ramp))
  .turn(45, 12).go(11.3).turn(-45, 12)
  .goToX(METRO.x1 - 8).turn(-90, 8).goToZ(METRO.stationZ0).pieces;

// ---------------------------------------------------------------------------
// The long drive, and India Gate's hexagon
// ---------------------------------------------------------------------------

const [HEX_IN, HEX_OUT] = HEX_LANES;
const HEX_MID = (HEX_IN + HEX_OUT) / 2;
/** The corners of the hexagon's outer lane: 0 east, 1 south-east, 2 south-west, 3 west, 4 north-west, 5 north-east. */
const V = (i: number): P2 => hexCorner(i % 6, HEX_OUT);
const hexagon = (apothem: number, r: number): Seg[] => loop([0, 1, 2, 3, 4, 5].map((i) => ({ g: line(hexCorner(i, apothem), hexCorner((i + 1) % 6, apothem)), r })), { name: 'hexagon' });

/** The rise of Raisina Hill, for a road that runs east and west: level at the top west of `top`, down to the ground by `foot`. */
export const RAISINA_HUMP: Hump = { x0: -300, x1: -299, x2: RAISINA.top, x3: RAISINA.foot, y: RAISINA.y };

const Q = QUTUB_TURN, A = AKBAR_FOOT;

const LONG_DRIVE: Step[] = [
  { g: shift(line(Q, A), -HALF), r: 10 }, // Aurobindo Marg, northbound, under the AIIMS flyover
  { g: shift(line(A, HEX), -HALF), r: 5 }, // the road to the hexagon's south-west corner
  { g: line(V(2), V(3)), r: 5 }, // the hexagon's south-west side
  { g: shift(line(HEX, RAISINA_TURN), -HALF), r: 4 }, // Kartavya Path, westbound, and up Raisina Hill
  { g: circle(RAISINA_TURN, TURN_R, true), r: 4 },
  { g: shift(line(RAISINA_TURN, HEX), -HALF), r: 5 }, // and back down it
  { g: line(V(3), V(4)), r: 5 }, { g: line(V(4), V(5)), r: 5 }, { g: line(V(5), V(0)), r: 5 }, { g: line(V(0), V(1)), r: 5 }, { g: line(V(1), V(2)), r: 5 },
  { g: shift(line(HEX, A), -HALF), r: 10 }, // off the hexagon again
  { g: shift(line(A, Q), -HALF), r: 4 }, // Aurobindo Marg, southbound
  { g: circle(Q, TURN_R, true), r: 4 }, // round at the Qutub Minar
];

// ---------------------------------------------------------------------------
// Shanti Path, and Kaifi Azmi Marg to the school's gate
// ---------------------------------------------------------------------------

const SN: P2 = [SHANTI_X, SHANTI.north], SC: P2 = [SHANTI_X, SHANTI.south], SG: P2 = [SHANTI.turnX, SHANTI.south];
/** How tightly the road turns from Shanti Path into Kaifi Azmi Marg, along its middle. */
const SCHOOL_BEND = 8;

const SHANTI_PATH: Step[] = [
  { g: shift(line(SN, SC), -HALF), r: SCHOOL_BEND + HALF },
  { g: shift(line(SC, SG), -HALF), r: 4 },
  { g: circle(SG, TURN_R, true), r: 4 },
  { g: shift(line(SG, SC), -HALF), r: SCHOOL_BEND - HALF },
  { g: shift(line(SC, SN), -HALF), r: 4 },
  { g: circle(SN, TURN_R, true), r: 4 },
];

// ---------------------------------------------------------------------------
// Connaught Place, Karol Bagh and Netaji Subhash Marg
// ---------------------------------------------------------------------------

const KB = KAROL_BAGH_TURN, KG = KASHMERE_TURN, E1: P2 = [NS_MARG_X, CP_ROAD_Z];
/** How tightly the road turns from Connaught Place's road into Netaji Subhash Marg, along its middle. */
const NS_BEND = 6;

const CP_ROAD: Step[] = [
  { g: shift(line(KB, CP), -HALF), r: 3 }, // from Karol Bagh
  { g: circle(CP, CP_R.outer, true), r: 3 }, // the Outer Circle's north half
  { g: shift(line(CP, E1), -HALF), r: NS_BEND - HALF },
  { g: shift(line(E1, KG), -HALF), r: 4 }, // Netaji Subhash Marg, northbound
  { g: circle(KG, TURN_R, true), r: 4 }, // round at Kashmere Gate
  { g: shift(line(KG, E1), -HALF), r: NS_BEND + HALF },
  { g: shift(line(E1, CP), -HALF), r: 3 },
  { g: circle(CP, CP_R.outer, true), r: 3 }, // the Outer Circle's south half
  { g: shift(line(CP, KB), -HALF), r: 4 },
  { g: circle(KB, TURN_R, true), r: 4 }, // round at Karol Bagh
];

// ---------------------------------------------------------------------------
// Streets, as they are laid on the ground
// ---------------------------------------------------------------------------

export interface Laid { id: string; segs: Seg[]; closed?: boolean; opts?: StreetOpts; lamps?: number; hump?: Hump }

const TURNING: StreetOpts = { lanes: 1, width: 6, sidewalk: 1.5, zebras: false };
/** How far from the hexagon's middle a street that meets it at a corner runs: just across the middle of the hexagon's own road, so that the junction is found, and no further. */
const HEX_KERB = (HEX_MID - 1.5) / Math.cos(Math.PI / 6);

export const STREETS: Laid[] = [
  // --- the axis ---
  { id: 'hexagon', segs: hexagon(HEX_MID, 5), closed: true, opts: { sidewalk: 2, zebras: false }, lamps: 0 },
  // (Kartavya Path as far as the foot of the hill: the ramp is a deck, and the road on the hill is laid at its height)
  { id: 'kartavya-path', segs: straight(towards(HEX, RAISINA_TURN, HEX_KERB), [RAISINA.foot, AXIS_Z]), opts: { sidewalk: 2 }, lamps: 0 },
  { id: 'raisina-hill', segs: straight([RAISINA.top, AXIS_Z], [RAISINA_TURN[0] + 1, AXIS_Z], RAISINA.y), opts: { sidewalk: 2 }, lamps: 0 },
  { id: 'raisina-turn', segs: ringOf(RAISINA_TURN, TURN_R, RAISINA.y), closed: true, opts: TURNING, lamps: 0 },
  // --- Aurobindo Marg, and the road from it to the hexagon ---
  { id: 'aurobindo-marg', segs: run(Q, [{ g: line(Q, A), r: 10 }, { g: line(A, HEX) }], towards(HEX, A, HEX_KERB)), opts: { sidewalk: 2.5 } },
  { id: 'qutub-turn', segs: ringOf(Q, TURN_R), closed: true, opts: TURNING, lamps: 0 },
  // --- Shanti Path and Kaifi Azmi Marg ---
  { id: 'shanti-path', segs: run(SN, [{ g: line(SN, SC), r: SCHOOL_BEND }, { g: line(SC, SG) }], SG), opts: { sidewalk: 2.5 } },
  { id: 'shanti-turn', segs: ringOf(SN, TURN_R), closed: true, opts: TURNING, lamps: 0 },
  { id: 'school-turn', segs: ringOf(SG, TURN_R), closed: true, opts: TURNING, lamps: 0 },
  // --- Connaught Place ---
  { id: 'outer-circle', segs: ringOf(CP, CP_R.outer), closed: true, opts: { lanes: 1, width: 6, sidewalk: 1.5, zebras: false }, lamps: 0 },
  { id: 'inner-circle', segs: ringOf(CP, CP_R.inner), closed: true, opts: { lanes: 1, width: 5.5, sidewalk: 1.5, zebras: false }, lamps: 0 },
  { id: 'karol-bagh-road', segs: straight(KB, [CP[0] - CP_R.outer + 3, CP_ROAD_Z]), opts: { sidewalk: 2.5 } },
  { id: 'karol-bagh-turn', segs: ringOf(KB, TURN_R), closed: true, opts: TURNING, lamps: 0 },
  { id: 'netaji-subhash-marg', segs: run([CP[0] + CP_R.outer - 3, CP_ROAD_Z], [{ g: line(CP, E1), r: NS_BEND }, { g: line(E1, KG) }], KG), opts: { sidewalk: 2.5 } },
  { id: 'kashmere-turn', segs: ringOf(KG, TURN_R), closed: true, opts: TURNING, lamps: 0 },
  // --- the Buddh circuit's corner ---
  {
    id: 'buddh', segs: [{ t: 'ring', pts: [[BUDDH.x0, BUDDH.z0], [BUDDH.x1, BUDDH.z0], [BUDDH.x1, BUDDH.z1], [BUDDH.x0, BUDDH.z1]], y: 0, r: BUDDH.r }],
    closed: true, opts: { lanes: 1, width: 5.5, sidewalk: 0, zebras: false }, lamps: 0,
  },
];

// ---------------------------------------------------------------------------
// Loops, as they are driven
// ---------------------------------------------------------------------------

/**
 * What drives on each kind of road, by the names of the kinds in traffic.ts. A name written twice is picked twice as
 * often. No route gives its vehicles a `paint`: that would repaint the autos and the buses too.
 */
const MIX: Record<string, string[]> = {
  ring: ['small-car', 'small-car', 'car', 'car', 'mini-van', 'city-bus', 'city-bus', 'lorry', 'auto', 'bike', 'bike'],
  avenue: ['white-saloon', 'white-saloon', 'car', 'small-car', 'auto', 'bike'],
  town: ['small-car', 'small-car', 'car', 'auto', 'auto', 'bike', 'bike', 'mini-van'],
  school: ['school-bus', 'school-bus', 'small-car', 'car', 'mini-van', 'auto', 'bike'],
  circuit: ['sedan', 'hatch'],
};

const lanes = (id: string, steps: Step[], more: Omit<Route, 'id' | 'segs'>): Route => ({ id, segs: loop(steps, { name: id }), ...more });

export const ROUTES: Route[] = [
  {
    id: 'ring-road',
    segs: toSegs([...RING_LANES.out, ...RING_LANES.far, ...RING_LANES.home, ...RING_LANES.near]),
    speed: 19, count: 20, types: MIX.ring,
  },
  { ...lanes('long-drive', LONG_DRIVE, { speed: 15, count: 12, types: MIX.avenue }), hump: RAISINA_HUMP },
  { id: 'hexagon', segs: hexagon(HEX_IN, 4), speed: 13, count: 5, types: MIX.town },
  lanes('shanti-path', SHANTI_PATH, { speed: 13, count: 7, types: MIX.school }),
  lanes('connaught-place', CP_ROAD, { speed: 14, count: 12, types: MIX.town }),
  { id: 'inner-circle', segs: ringOf(CP, CP_R.inner), speed: 11, count: 3, types: MIX.town },
  {
    // Chandni Chowk carries no motor traffic: cycle rickshaws go east along its north half and back west along its south
    id: 'chandni-chowk',
    segs: [{ t: 'ring', pts: [[CHANDNI.x0 + 4.5, CHANDNI.z - 2.5], [CHANDNI.x1 - 4.5, CHANDNI.z - 2.5], [CHANDNI.x1 - 4.5, CHANDNI.z + 2.5], [CHANDNI.x0 + 4.5, CHANDNI.z + 2.5]], y: 0.03, r: 2.5 }],
    speed: 6, count: 5, types: ['rickshaw'], heroes: false,
  },
  {
    id: 'buddh',
    // (driven clockwise, as the real circuit is)
    segs: [{ t: 'ring', pts: [[BUDDH.x0, BUDDH.z0], [BUDDH.x1, BUDDH.z0], [BUDDH.x1, BUDDH.z1], [BUDDH.x0, BUDDH.z1]], y: 0.05, r: BUDDH.r }],
    speed: 17, count: 2, types: MIX.circuit, paint: [0xc8202c, 0xf2c14e, 0xf2f0ea, 0x1f4fa8],
  },
];
