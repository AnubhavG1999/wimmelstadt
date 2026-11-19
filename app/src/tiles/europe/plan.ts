// The Europe tile, as numbers. Nothing in this file draws anything.
//
// One river runs through the tile in an S and has three names. It comes in at
// the north edge as the Thames and runs south through London, turns east as
// the Seine through Paris, and turns south again as the Arno through Italy,
// to leave at the south edge.
//
//   London  the north-west: the City on the Thames's west bank, the South Bank on its east
//   Paris   the north-east and the middle: the right bank north of the Seine, the Eiffel Tower south of it
//   Italy   the south: Motor Valley in the west, Pisa in the middle, Rome and Florence by the Arno, Venice beyond it
//
// London is turned a quarter from the map: its north bank is the west bank
// here, so that Parliament faces the middle of the tile across the water.
//
// Units: 1 unit is 1 cm of toy. A lane is 5 wide, a storey is 5 high and a car
// is about 7 long. x points east, z points south, y points up.

import type { P2 } from './lanes';

// ---------------------------------------------------------------------------
// The river
// ---------------------------------------------------------------------------

/** The Thames runs south along this line, the Seine east along this one, the Arno south along this one. */
export const THAMES_X = -36, SEINE_Z = 14, ARNO_X = 78;
/** How tightly the river turns from the Thames into the Seine, and from the Seine into the Arno. */
export const BEND_1 = 24, BEND_2 = 18;
/** How far below the streets the water lies. */
export const WATER_DROP = 1.6;

/**
 * Half the river's width, at places measured along its middle from the north
 * edge. It is widest between the two bridges of Paris, where the island is.
 */
export const RIVER_WIDTH: [number, number][] = [[0, 10], [102.8, 10], [146.5, 13.5], [198.5, 13.5], [212.5, 9.5], [240.8, 8.5], [330, 8.5]];

/** The Île de la Cité: from one tip to the other along the Seine, and half its width. */
export const ISLAND = { x0: 13, x1: 47, half: 4.5 };

/** Venice's side canal runs from the Arno to the east edge between these two lines. */
export const CANAL = { z0: 85, z1: 91 };

// ---------------------------------------------------------------------------
// London: the Thames's two bridges, and the streets of the City
// ---------------------------------------------------------------------------

export const TOWER_Z = -92, WESTMINSTER_Z = -30;
/** The Embankment on the west bank, the South Bank's road on the east, and the Strand behind the riverside block. */
export const EMBANKMENT_X = -53.5, SOUTH_BANK_X = -11.5, STRAND_X = -86.5;
/** The two circuses of the Strand: Piccadilly Circus at its south end, Tower Hill at its north. */
export const PICCADILLY: P2 = [STRAND_X, WESTMINSTER_Z], TOWER_HILL: P2 = [STRAND_X, TOWER_Z];
/** The middle of a circus's one lane, measured from the middle of its island. */
export const CIRCUS_R = 8.5;

// ---------------------------------------------------------------------------
// Paris: the Seine's two bridges, the quays, the star and the Champs-Élysées
// ---------------------------------------------------------------------------

export const NORTH_QUAI_Z = -6.5, SOUTH_QUAI_Z = 34.5;
export const IENA_X = -2, NEUF_X = 42, ROYALE_X = 85;
/** The Arc de Triomphe in the middle of its star, and the obelisk in the middle of the Place de la Concorde. */
export const ARC: P2 = [24, -86], CONCORDE: P2 = [85, -42];
/** The middles of the star's three lanes, from the island outwards, and of the Concorde's two. */
export const STAR_LANES = [11.5, 16.5, 21.5], CONCORDE_LANES = [8.5, 13.5];

// ---------------------------------------------------------------------------
// Italy: the road round the Colosseum, the Via Emilia and Motor Valley
// ---------------------------------------------------------------------------

/** The road round the Colosseum: the middle of it, and half its size each way. */
export const COLOSSEUM = { x: 39.5, z: 87, hx: 21.5, hz: 19, r: 12 };
/** The Via Emilia runs west from the Colosseum to Motor Valley along this line. */
export const EMILIA_Z = 87;
/** The streets round the block of the piazza, in Motor Valley. */
export const VALLEY = { x0: -76, x1: -34, z0: 40 };
/** The lungarno runs north from the Colosseum's road beside the Arno, as far as this. */
export const LUNGARNO_TOP = 50;

// ---------------------------------------------------------------------------
// The things that stand on the tile
// ---------------------------------------------------------------------------

export type Quarter = 'london' | 'paris' | 'italy';

/** One of the tile's recognisable things, as a box until it is built: where it stands, how large and how high. */
export interface Thing {
  n: number;
  id: string;
  name: string;
  quarter: Quarter;
  /** Its north-west corner and its size. */
  x: number; z: number; w: number; d: number;
  h: number;
  /** The ground it stands on, if not the street. */
  y?: number;
  /** Built by a model of its own, so no box is stood for it. */
  built?: boolean;
}

const T = (n: number, id: string, name: string, quarter: Quarter, x: number, z: number, w: number, d: number, h: number, more: Partial<Thing> = {}): Thing =>
  ({ n, id, name, quarter, x, z, w, d, h, ...more });

export const THINGS: Thing[] = [
  // London
  T(1, 'parliament', 'PARLIAMENT & BIG BEN', 'london', -60, -21, 13.5, 27, 15),
  T(2, 'tower-bridge', 'TOWER BRIDGE', 'london', -46, -98, 20, 12, 34, { built: true }),
  T(3, 'tower', 'TOWER OF LONDON', 'london', -78, -84, 16, 20, 13),
  T(4, 'eye', 'LONDON EYE', 'london', -26, -82, 6, 42, 46, { built: true }),
  T(5, 'st-pauls', "ST PAUL'S", 'london', -78, -61, 16, 21, 26),
  T(6, 'palace', 'BUCKINGHAM PALACE', 'london', -104, -79, 8, 34, 14),
  T(7, 'piccadilly', 'PICCADILLY CIRCUS', 'london', -80, -21.5, 15, 13, 18),
  T(8, 'gherkin', 'THE GHERKIN', 'london', -76, -112, 12, 12, 60),
  T(9, 'ace-cafe', 'ACE CAFE', 'london', -104, -16, 17, 11, 7),
  // Paris
  T(10, 'eiffel', 'EIFFEL TOWER', 'paris', -17, 45, 30, 30, 110, { built: true }),
  T(11, 'arc', 'ARC DE TRIOMPHE', 'paris', 17, -89.5, 14, 7, 22, { built: true }),
  T(12, 'concorde', 'CHAMPS-ELYSEES & OBELISK', 'paris', 83.5, -43.5, 3, 3, 20, { built: true }),
  T(13, 'louvre', 'THE LOUVRE', 'paris', 48, -38, 29, 23, 12),
  T(14, 'notre-dame', 'NOTRE-DAME', 'paris', 22, 10, 17, 8, 15),
  T(15, 'sacre-coeur', 'SACRE-COEUR', 'paris', 80, -110, 14, 15, 20, { y: 12 }),
  T(16, 'moulin-rouge', 'MOULIN ROUGE', 'paris', 51, -111.5, 11, 10, 10),
  T(17, 'cafe', 'CAFE & METRO', 'paris', 6, -32, 15, 15, 22),
  T(18, 'trocadero', 'TROCADERO', 'paris', -23, -19, 13, 8, 5),
  // Italy
  T(19, 'pisa', 'LEANING TOWER OF PISA', 'italy', -27, 96, 26, 13, 9),
  T(20, 'colosseum', 'COLOSSEUM', 'italy', 26.5, 76.5, 26, 21, 17, { built: true }),
  T(21, 'duomo', 'DUOMO OF FLORENCE', 'italy', 22, 46, 32, 13.5, 20),
  T(22, 'ponte-vecchio', 'PONTE VECCHIO', 'italy', 69.5, 53, 17, 6, 6, { built: true }),
  T(23, 'venice', 'VENICE & RIALTO', 'italy', 89, 93, 13, 18, 12),
  T(24, 'piazza', 'PIAZZA & FOUNTAIN', 'italy', -68, 48, 26, 9, 14),
  T(25, 'lingotto', 'LINGOTTO', 'italy', -103, 22, 19.5, 70, 25, { built: true }),
  T(26, 'maranello', 'MARANELLO', 'italy', -70, 95, 30, 10, 9),
  T(27, 'sant-agata', "SANT'AGATA", 'italy', -70, 18, 30, 14, 8),
];

/** Lingotto's roof, where the test track runs: its height, and the middle lines of the track's two straights. */
export const LINGOTTO_ROOF = { y: 25, x0: -98.5, x1: -88, z0: 30, z1: 84 };
