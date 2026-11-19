// Europe's roads: where its streets are laid, and the loops its traffic drives.
//
// The pattern is circles on a river. Each quarter has a ring of road round its
// own stretch of the river, over two bridges. The inside lane of a ring keeps
// to the water. The outside lane wanders off to tour the quarter and comes
// back: round Piccadilly Circus and up the Strand in London, up to the
// Concorde, the Champs-Élysées and the Arc de Triomphe in Paris, and along the
// Via Emilia to Motor Valley in Italy.
//
// No two loops ever cross on the level. A loop either keeps to the kerb of the
// block it goes round, or goes round the outside of everything, and at a
// roundabout the two take different parts of the circle. London's loops turn
// the other way from Paris's and Italy's, which is all it takes to keep left.
// The two never meet: London's roads end at the wall behind the South Bank.

import type { StreetOpts } from '../../engine/roads';
import type { Seg } from '../../engine/paths';
import type { Route, TrafficType } from '../../engine/tile';
import { beside, circle, line, loop, run, shift, type P2, type Step } from './lanes';
import {
  ACE_TURN, ARC, CIRCUS_R, COLOSSEUM, CONCORDE, CONCORDE_LANES, EMBANKMENT_X, EMILIA_Z, HILL, IENA_X, LINGOTTO_ROOF, LUNGARNO_TOP, NEUF_X,
  NORTH_QUAI_Z, PICCADILLY, ROYALE_X, SOUTH_BANK_X, SOUTH_QUAI_Z, STAR_LANES, STRAND_X, TOWER_HILL, TOWER_Z, TURN_R, VALLEY, WESTMINSTER_Z, onHill,
} from './plan';

/** From the middle of a two-lane street to the middle of either lane. */
const HALF = 2.5;

const straight = (a: P2, b: P2): Seg[] => [{ t: 'poly', pts: [a, b], y: 0, r: 0 }];
const ringOf = (c: P2, r: number): Seg[] => loop([{ g: circle(c, r, true) }]);
/** The point `d` from a towards b. */
const towards = (a: P2, b: P2, d: number): P2 => {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [a[0] + ((b[0] - a[0]) * d) / l, a[1] + ((b[1] - a[1]) * d) / l];
};

// ---------------------------------------------------------------------------
// Streets, as they are laid on the ground
// ---------------------------------------------------------------------------

export interface Laid { id: string; segs: Seg[]; closed?: boolean; opts?: StreetOpts; lamps?: number }

const K = COLOSSEUM;
const kx0 = K.x - K.hx, kx1 = K.x + K.hx, kz0 = K.z - K.hz, kz1 = K.z + K.hz;
const ROUNDABOUT: StreetOpts = { zebras: false, sidewalk: 2.5 };

export const STREETS: Laid[] = [
  // --- London ---
  { id: 'embankment', segs: straight([EMBANKMENT_X, TOWER_Z - 5], [EMBANKMENT_X, WESTMINSTER_Z + 5]), opts: { sidewalk: 2.5 } },
  { id: 'south-bank', segs: straight([SOUTH_BANK_X, TOWER_Z - 5], [SOUTH_BANK_X, WESTMINSTER_Z + 5]), opts: { sidewalk: 2.5 } },
  { id: 'tower-hill', segs: straight([STRAND_X + 6, TOWER_Z], [SOUTH_BANK_X + 5, TOWER_Z]), opts: { sidewalk: 2.5 } },
  { id: 'bridge-street', segs: straight([STRAND_X + 6, WESTMINSTER_Z], [SOUTH_BANK_X + 5, WESTMINSTER_Z]), opts: { sidewalk: 2.5 } },
  { id: 'strand', segs: straight([STRAND_X, TOWER_Z + 6], [STRAND_X, WESTMINSTER_Z - 6]), opts: { sidewalk: 2.5 } },
  { id: 'piccadilly-circus', segs: ringOf(PICCADILLY, CIRCUS_R), closed: true, opts: { ...ROUNDABOUT, lanes: 1, width: 6 }, lamps: 0 },
  { id: 'tower-hill-circus', segs: ringOf(TOWER_HILL, CIRCUS_R), closed: true, opts: { ...ROUNDABOUT, lanes: 1, width: 6 }, lamps: 0 },
  // the road south from Piccadilly Circus, which ends in a turning circle at Ace Cafe
  { id: 'ace-road', segs: straight([STRAND_X, WESTMINSTER_Z + 6], [STRAND_X, ACE_TURN[1] - 2]), opts: { sidewalk: 2.5 } },
  { id: 'ace-turn', segs: ringOf(ACE_TURN, TURN_R), closed: true, opts: { lanes: 1, width: 6, sidewalk: 1.5, zebras: false }, lamps: 0 },

  // --- Paris ---
  { id: 'quai-nord', segs: straight([IENA_X - 5, NORTH_QUAI_Z], [ROYALE_X + 5, NORTH_QUAI_Z]), opts: { sidewalk: 2 } },
  { id: 'quai-sud', segs: straight([IENA_X - 5, SOUTH_QUAI_Z], [NEUF_X + 5, SOUTH_QUAI_Z]), opts: { sidewalk: 2 } },
  { id: 'pont-neuf', segs: straight([NEUF_X, NORTH_QUAI_Z - 5], [NEUF_X, SOUTH_QUAI_Z + 5]), opts: { sidewalk: 1.5 } },
  {
    // the Pont d'Iéna, and avenue Kléber on from it to the star
    id: 'kleber',
    segs: run([IENA_X, SOUTH_QUAI_Z + 5], [{ g: line([IENA_X, SOUTH_QUAI_Z], [IENA_X, NORTH_QUAI_Z]), r: 30 }, { g: line([IENA_X, NORTH_QUAI_Z], ARC) }], towards(ARC, [IENA_X, NORTH_QUAI_Z], 10)),
    opts: { sidewalk: 2.5 },
  },
  { id: 'rue-royale', segs: straight([ROYALE_X, NORTH_QUAI_Z + 5], [ROYALE_X, CONCORDE[1] + 7]), opts: { sidewalk: 2.5 } },
  { id: 'champs-elysees', segs: straight(towards(ARC, CONCORDE, 10), towards(CONCORDE, ARC, 7)), opts: { lanes: 4, sidewalk: 4 }, lamps: 12.3 },
  { id: 'etoile', segs: ringOf(ARC, STAR_LANES[1]), closed: true, opts: { ...ROUNDABOUT, lanes: 3 }, lamps: 0 },
  { id: 'concorde', segs: ringOf(CONCORDE, (CONCORDE_LANES[0] + CONCORDE_LANES[1]) / 2), closed: true, opts: { ...ROUNDABOUT, lanes: 2 }, lamps: 0 },

  // --- Italy ---
  {
    id: 'colosseo',
    segs: [{ t: 'ring', pts: [[kx0, kz0], [kx1, kz0], [kx1, kz1], [kx0, kz1]], y: 0, r: K.r }],
    closed: true, opts: { sidewalk: 2, zebras: false },
  },
  { id: 'lungarno', segs: straight([kx1, LUNGARNO_TOP + 2], [kx1, K.z - 3]), opts: { sidewalk: 2 } },
  { id: 'lungarno-turn', segs: ringOf([kx1, LUNGARNO_TOP + 2], 5.5), closed: true, opts: { lanes: 1, width: 6, sidewalk: 1.5, zebras: false }, lamps: 0 },
  { id: 'via-emilia', segs: straight([kx0 + 5, EMILIA_Z], [VALLEY.x0 - 5, EMILIA_Z]), opts: { sidewalk: 2.5 } },
  { id: 'valley-east', segs: straight([VALLEY.x1, VALLEY.z0 - 5], [VALLEY.x1, EMILIA_Z + 5]), opts: { sidewalk: 2.5 } },
  { id: 'valley-north', segs: straight([VALLEY.x0 - 5, VALLEY.z0], [VALLEY.x1 + 5, VALLEY.z0]), opts: { sidewalk: 2.5 } },
  { id: 'valley-west', segs: straight([VALLEY.x0, VALLEY.z0 - 5], [VALLEY.x0, EMILIA_Z + 5]), opts: { sidewalk: 2.5 } },
];

// ---------------------------------------------------------------------------
// Loops, as they are driven
// ---------------------------------------------------------------------------

const MIX: Record<string, TrafficType[]> = {
  town: ['sedan', 'sedan', 'hatch', 'hatch', 'van'],
  avenue: ['sedan', 'sedan', 'hatch', 'van', 'bus'],
  italy: ['hatch', 'hatch', 'hatch', 'sedan', 'van', 'pickup'],
};
const CAB_BLACK = [0x1b1b1f, 0x1b1b1f, 0x25262b], BUS_RED = [0xc8202c];
/** The colours of the little cars of Italy. */
const PASTEL = [0xf2ead8, 0xa9cfe0, 0xc8523f, 0xe9d28f, 0x8fc0a9, 0xf2f0ea];

const lane = (id: string, steps: Step[], more: Omit<Route, 'id' | 'segs'>): Route => ({ id, segs: loop(steps, { name: id }), ...more });

// --- London: everything keeps left, so every loop here turns the other way from the rest of the tile ---

const S = STRAND_X, E = EMBANKMENT_X, B = SOUTH_BANK_X, TZ = TOWER_Z, WZ = WESTMINSTER_Z;

/** Round the Thames between its two bridges, as it is driven on the inside: north up the South Bank and south down the Embankment. */
const LONDON_RING: Step[] = [line([B, WZ], [B, TZ]), line([B, TZ], [E, TZ]), line([E, TZ], [E, WZ]), line([E, WZ], [B, WZ])].map((g) => ({ g, r: 6 }));

const LONDON: Route[] = [
  // black cabs, round the water: up the South Bank past the Eye, over Tower Bridge, down the Embankment, over Westminster Bridge
  lane('london-river', beside(LONDON_RING, -HALF), { speed: 14, count: 6, types: ['sedan'], paint: CAB_BLACK }),
  // red buses, round the outside of it all: over Westminster Bridge, down to Ace Cafe and back, up the Strand, round Tower Hill, over Tower Bridge
  lane('london-circuit', [
    { g: shift(line([B, TZ], [B, WZ]), -HALF), r: 8.5 },
    { g: shift(line([B, WZ], [S, WZ]), -HALF), r: 4 },
    { g: circle(PICCADILLY, CIRCUS_R, true), r: 4 },
    { g: shift(line(PICCADILLY, ACE_TURN), -HALF), r: 4 },
    { g: circle(ACE_TURN, TURN_R, true), r: 4 },
    { g: shift(line(ACE_TURN, PICCADILLY), -HALF), r: 4 },
    { g: circle(PICCADILLY, CIRCUS_R, true), r: 4 },
    { g: shift(line([S, WZ], [S, TZ]), -HALF), r: 4 },
    { g: circle(TOWER_HILL, CIRCUS_R, true), r: 4 },
    { g: shift(line([S, TZ], [B, TZ]), -HALF), r: 8.5 },
  ], { speed: 15, count: 9, types: ['bus', 'bus', 'sedan'], paint: BUS_RED }),
  // and round the block between the Strand and the river
  lane('london-city', [
    { g: shift(line([S, TZ], [S, WZ]), -HALF), r: 4 },
    { g: circle(PICCADILLY, CIRCUS_R, true), r: 4 },
    { g: shift(line([S, WZ], [E, WZ]), -HALF), r: 3.5 },
    { g: shift(line([E, WZ], [E, TZ]), -HALF), r: 3.5 },
    { g: shift(line([E, TZ], [S, TZ]), -HALF), r: 4 },
    { g: circle(TOWER_HILL, CIRCUS_R, true), r: 4 },
  ], { speed: 13, count: 6, types: MIX.town }),
];

// --- Paris ---

const NQ = NORTH_QUAI_Z, SQ = SOUTH_QUAI_Z, I = IENA_X, N = NEUF_X, R = ROYALE_X;
const [STAR_IN, STAR_MID, STAR_OUT] = STAR_LANES;

/**
 * The road on Montmartre: one lane east along the hill's first level, a hairpin
 * that climbs to the second, back west below Sacré-Cœur, and a hairpin down.
 */
export const HILL_ROAD: Seg[] = (() => {
  const [low, high] = HILL.lanes, mid = (low + high) / 2, hair = (high - low) / 2;
  const [y1, y2] = HILL.heights;
  return loop([
    { g: line(onHill(HILL.t0, low), onHill(HILL.t1, low)), y: [y1, y1] },
    { g: circle(onHill(HILL.t1, mid), hair, false), y: [y1, y2] },
    { g: line(onHill(HILL.t1, high), onHill(HILL.t0, high)), y: [y2, y2] },
    { g: circle(onHill(HILL.t0, mid), hair, false), y: [y2, y1] },
  ], { name: 'montmartre' });
})();

/** Round the Seine between its two bridges, as it is driven on the inside: east along the north quay and west along the south. */
const PARIS_RING: Step[] = [line([I, NQ], [N, NQ]), line([N, NQ], [N, SQ]), line([N, SQ], [I, SQ]), line([I, SQ], [I, NQ])].map((g) => ({ g, r: 6 }));

const PARIS: Route[] = [
  lane('paris-river', beside(PARIS_RING, HALF), { speed: 14, count: 6, types: MIX.town }),
  // the grand tour: over the Pont d'Iéna past the Eiffel Tower, back over the Pont Neuf, along the quay past the Louvre,
  // round the obelisk, up the Champs-Élysées, round the Arc de Triomphe and down avenue Kléber
  lane('paris-circuit', [
    { g: shift(line([I, NQ], [I, SQ]), HALF), r: 8.5 },
    { g: shift(line([I, SQ], [N, SQ]), HALF), r: 8.5 },
    { g: shift(line([N, SQ], [N, NQ]), HALF), r: 3.5 },
    { g: shift(line([N, NQ], [R, NQ]), HALF), r: 8.5 },
    { g: shift(line([R, NQ], CONCORDE), HALF), r: 4 },
    { g: circle(CONCORDE, CONCORDE_LANES[1], false), r: 4 },
    { g: shift(line(CONCORDE, ARC), 7.5), r: 5 },
    { g: circle(ARC, STAR_OUT, false), r: 5 },
    { g: shift(line(ARC, [I, NQ]), HALF), r: 30 },
  ], { speed: 16, count: 12, types: MIX.avenue }),
  // round the block between the Champs-Élysées and the river, by the kerb
  lane('paris-right-bank', [
    { g: shift(line([R, NQ], [I, NQ]), HALF), r: 4 },
    { g: shift(line([I, NQ], ARC), HALF), r: 5 },
    { g: circle(ARC, STAR_OUT, false), r: 5 },
    { g: shift(line(ARC, CONCORDE), 7.5), r: 4 },
    { g: circle(CONCORDE, CONCORDE_LANES[1], false), r: 4 },
    { g: shift(line(CONCORDE, [R, NQ]), HALF), r: 3.5 },
  ], { speed: 15, count: 8, types: MIX.town }),
  // the two middle lanes of the Champs-Élysées: round the Arc at one end and the obelisk at the other
  lane('champs-elysees', [
    { g: shift(line(CONCORDE, ARC), HALF), r: 4 },
    { g: circle(ARC, STAR_MID, false), r: 4 },
    { g: shift(line(ARC, CONCORDE), HALF), r: 3 },
    { g: circle(CONCORDE, CONCORDE_LANES[0], false), r: 3 },
  ], { speed: 19, count: 7, types: MIX.avenue }),
  // and those who never leave the star
  lane('etoile', [{ g: circle(ARC, STAR_IN, false) }], { speed: 13, count: 4, types: MIX.town }),
  { id: 'montmartre', segs: HILL_ROAD, speed: 9, count: 4, types: MIX.town },
];

// --- Italy ---

/** Round the Colosseum, as it is driven by the kerb. */
const COLOSSEUM_RING: Step[] = [line([kx0, kz0], [kx1, kz0]), line([kx1, kz0], [kx1, kz1]), line([kx1, kz1], [kx0, kz1]), line([kx0, kz1], [kx0, kz0])].map((g) => ({ g, r: K.r }));
const V = VALLEY, EZ = EMILIA_Z;
/** Round the block of the piazza, by the kerb. */
const VALLEY_RING: Step[] = [line([V.x0, V.z0], [V.x1, V.z0]), line([V.x1, V.z0], [V.x1, EZ]), line([V.x1, EZ], [V.x0, EZ]), line([V.x0, EZ], [V.x0, V.z0])].map((g) => ({ g, r: 6 }));

const ITALY: Route[] = [
  lane('colosseo', beside(COLOSSEUM_RING, HALF), { speed: 13, count: 5, types: MIX.italy, paint: PASTEL }),
  // the long way round Italy: up the lungarno to the Ponte Vecchio and back, round the Colosseum, out along the Via Emilia,
  // round the piazza past Lingotto, and back past the factory gate
  lane('italy-circuit', [
    { g: shift(line([kx1, kz1], [kx1, LUNGARNO_TOP]), HALF), r: 4 },
    { g: circle([kx1, LUNGARNO_TOP + 2], 5.5, false), r: 4 },
    { g: shift(line([kx1, LUNGARNO_TOP], [kx1, kz1]), HALF), r: 3.5 },
    { g: shift(line([kx1, kz0], [kx0, kz0]), HALF), r: K.r + HALF },
    { g: shift(line([kx0, kz0], [kx0, kz1]), HALF), r: 3.5 },
    { g: shift(line([kx0, EZ], [V.x1, EZ]), HALF), r: 3.5 },
    { g: shift(line([V.x1, EZ], [V.x1, V.z0]), HALF), r: 8.5 },
    { g: shift(line([V.x1, V.z0], [V.x0, V.z0]), HALF), r: 8.5 },
    { g: shift(line([V.x0, V.z0], [V.x0, EZ]), HALF), r: 8.5 },
    { g: shift(line([V.x0, EZ], [kx0, EZ]), HALF), r: 3.5 },
    { g: shift(line([kx0, kz0], [kx0, kz1]), HALF), r: K.r + HALF },
    { g: shift(line([kx0, kz1], [kx1, kz1]), HALF), r: K.r + HALF },
  ], { speed: 15, count: 13, types: MIX.italy, paint: PASTEL }),
  lane('motor-valley', beside(VALLEY_RING, HALF), { speed: 12, count: 5, types: MIX.italy, paint: PASTEL }),
  // the test track on Lingotto's roof
  {
    id: 'lingotto',
    segs: [{ t: 'ring', pts: [[LINGOTTO_ROOF.x0, LINGOTTO_ROOF.z0], [LINGOTTO_ROOF.x1, LINGOTTO_ROOF.z0], [LINGOTTO_ROOF.x1, LINGOTTO_ROOF.z1], [LINGOTTO_ROOF.x0, LINGOTTO_ROOF.z1]], y: LINGOTTO_ROOF.y + 0.05, r: 5.25 }],
    speed: 15, count: 2, types: ['sedan', 'hatch'], paint: [0xc8202c, 0xf2c14e, 0xf2f0ea],
  },
];

export const ROUTES: Route[] = [...LONDON, ...PARIS, ...ITALY];
