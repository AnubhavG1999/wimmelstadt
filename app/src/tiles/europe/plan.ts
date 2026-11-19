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
export const ISLAND = { x0: 12, x1: 49, half: 5.5 };

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
/** The road south from Piccadilly Circus ends in a turning circle at Ace Cafe: its middle, and the middle of its one lane. */
export const ACE_TURN: P2 = [STRAND_X, -2], TURN_R = 5.5;

// ---------------------------------------------------------------------------
// Paris: the Seine's two bridges, the quays, the star and the Champs-Élysées
// ---------------------------------------------------------------------------

export const NORTH_QUAI_Z = -6.5, SOUTH_QUAI_Z = 34.5;
export const IENA_X = -2, NEUF_X = 42, ROYALE_X = 85;
/** The Arc de Triomphe in the middle of its star, and the obelisk in the middle of the Place de la Concorde. */
export const ARC: P2 = [25, -83], CONCORDE: P2 = [85, -42];
/** The middles of the star's three lanes, from the island outwards, and of the Concorde's two. */
export const STAR_LANES = [11.5, 16.5, 21.5], CONCORDE_LANES = [8.5, 13.5];

/** The way the Champs-Élysées runs, from the Arc to the Concorde. */
const AVENUE: P2 = (() => {
  const dx = CONCORDE[0] - ARC[0], dz = CONCORDE[1] - ARC[1], l = Math.hypot(dx, dz);
  return [dx / l, dz / l];
})();

/**
 * Montmartre. Its levels step up from a line through `at` that runs along `u`,
 * the same way as the Champs-Élysées beside it: `up` points up the hill. A
 * place on the hill is given as how far along that line it is and how far up
 * from it.
 */
export const HILL = {
  at: [58, -86] as P2, u: AVENUE, up: [AVENUE[1], -AVENUE[0]] as P2,
  /** How far up from the line each level begins, and how high it is. */
  rims: [0, 14, 24], heights: [4, 8, 12],
  /** The second level, and the two hairpins of the hill's own loop, lie between these places along the line. */
  t0: 10, t1: 30,
  /** The hill's loop keeps this far up from the line: on the first level going west, on the second coming back. */
  lanes: [10, 19],
  /** The road from the Champs-Élysées has a lane of its own on the first level, below the loop's, this far up from the line. */
  way: 3.6,
  /** The road up from the Champs-Élysées runs along the foot of the hill, this far below the line, and leaves the avenue here. */
  foot: -3.2, turn: 8,
  /** Where the road down from the hill is level with the street again, on its way in to the star. */
  down: -9.5,
  /**
   * The steps down from Sacré-Cœur: between these two places along the line they are cut this far into the
   * third level, and their foot is this far up from the line, on the second level beside its road.
   */
  stairs: { t0: 18, t1: 23, in: 1.7, foot: 22.3 },
};
export const onHill = (t: number, o: number): P2 => [HILL.at[0] + HILL.u[0] * t + HILL.up[0] * o, HILL.at[1] + HILL.u[1] * t + HILL.up[1] * o];
/** Where a place on the map is in the hill's own measure: how far along its line, and how far up from it. */
export const offHill = (p: P2): P2 => {
  const dx = p[0] - HILL.at[0], dz = p[1] - HILL.at[1];
  return [dx * HILL.u[0] + dz * HILL.u[1], dx * HILL.up[0] + dz * HILL.up[1]];
};

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

/** Lingotto's roof, where the test track runs: its height, and the middle lines of the track's two straights. */
export const LINGOTTO_ROOF = { y: 25, x0: -98.5, x1: -88, z0: 30, z1: 84 };

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
  /** Stood by the tile in a shape of its own, so no box is stood for it. */
  shaped?: boolean;
}

const T = (n: number, id: string, name: string, quarter: Quarter, x: number, z: number, w: number, d: number, h: number, more: Partial<Thing> = {}): Thing =>
  ({ n, id, name, quarter, x, z, w, d, h, ...more });

export const THINGS: Thing[] = [
  // London
  T(1, 'parliament', 'PARLIAMENT & BIG BEN', 'london', -58.6, -22, 12.4, 36, 56, { shaped: true }),
  T(2, 'tower-bridge', 'TOWER BRIDGE', 'london', -46, -98, 20, 12, 34, { shaped: true }),
  T(3, 'tower', 'TOWER OF LONDON', 'london', -77.4, -82.9, 14.8, 19.1, 18, { shaped: true }),
  T(4, 'eye', 'LONDON EYE', 'london', -26, -82, 6, 42, 46, { shaped: true }),
  T(5, 'st-pauls', "ST PAUL'S", 'london', -77, -61.4, 14, 22.4, 36.5, { shaped: true }),
  T(6, 'palace', 'BUCKINGHAM PALACE', 'london', -103.8, -79, 9.4, 34, 15.8, { shaped: true }),
  T(7, 'piccadilly', 'PICCADILLY CIRCUS', 'london', -103.8, -40.3, 7, 20.6, 18, { shaped: true }),
  T(8, 'gherkin', 'THE GHERKIN', 'london', -74.7, -112.2, 12.4, 12.4, 50, { shaped: true }),
  T(9, 'ace-cafe', 'ACE CAFE', 'london', -100, 9.2, 30, 4.4, 7.7, { shaped: true }),
  // Paris
  T(10, 'eiffel', 'EIFFEL TOWER', 'paris', -17, 45, 30, 30, 110, { shaped: true }),
  T(11, 'arc', 'ARC DE TRIOMPHE', 'paris', ARC[0] - 7, ARC[1] - 3.5, 14, 7, 22, { shaped: true }),
  T(12, 'concorde', 'CHAMPS-ELYSEES & OBELISK', 'paris', CONCORDE[0] - 1.5, CONCORDE[1] - 1.5, 3, 3, 20, { shaped: true }),
  T(13, 'louvre', 'THE LOUVRE', 'paris', 40, -36, 31, 21, 19.7, { shaped: true }),
  T(14, 'notre-dame', 'NOTRE-DAME', 'paris', 14.5, 9.2, 17.7, 9.6, 28, { shaped: true }),
  T(15, 'sacre-coeur', 'SACRE-COEUR', 'paris', 87.3, -109, 12.5, 13.6, 29, { y: 12, shaped: true }),
  T(16, 'moulin-rouge', 'MOULIN ROUGE', 'paris', 51, -111.5, 11, 9.6, 14, { shaped: true }),
  T(17, 'cafe', 'CAFE & METRO', 'paris', 22, 46, 12, 10.5, 23, { shaped: true }),
  T(18, 'trocadero', 'TROCADERO', 'paris', -25.6, -22.2, 15.8, 19.8, 8, { shaped: true }),
  // Italy
  T(19, 'pisa', 'LEANING TOWER OF PISA', 'italy', -27, 96, 26, 13, 9),
  T(20, 'colosseum', 'COLOSSEUM', 'italy', COLOSSEUM.x - 14, COLOSSEUM.z - 11.5, 28, 23, 17, { shaped: true }),
  T(21, 'duomo', 'DUOMO OF FLORENCE', 'italy', 89.5, 2, 13.5, 28, 20),
  T(22, 'ponte-vecchio', 'PONTE VECCHIO', 'italy', 69.5, 53, 17, 6, 6, { shaped: true }),
  T(23, 'venice', 'VENICE & RIALTO', 'italy', 89, 93, 13, 18, 12),
  T(24, 'piazza', 'PIAZZA & FOUNTAIN', 'italy', -68, 48, 26, 9, 14),
  T(25, 'lingotto', 'LINGOTTO', 'italy', -103, 22, 19.5, 70, 25, { shaped: true }),
  T(26, 'maranello', 'MARANELLO', 'italy', -70, 95, 30, 10, 9),
  T(27, 'sant-agata', "SANT'AGATA", 'italy', -64, 22, 24, 10.5, 8),
];

// ---------------------------------------------------------------------------
// Ordinary buildings: the streets between the things
// ---------------------------------------------------------------------------

/** How a quarter's ordinary buildings look. */
export type Style = 'brick' | 'stucco' | 'haussmann' | 'ochre' | 'shed';

export interface Plot { quarter: Quarter; x: number; z: number; w: number; d: number; h: number; style: Style; signs?: string }

const lot = (quarter: Quarter, style: Style, x: number, z: number, w: number, d: number, h: number, signs = ''): Plot => ({ quarter, style, x, z, w, d, h, signs });

export const PLOTS: Plot[] = [
  // London: terraces north of the two bridges' street, and along the north edge behind Tower Hill
  lot('london', 'brick', -61, -112, 13, 12, 16, 'S'),
  lot('london', 'stucco', -24, -112, 20, 12, 18, 'S'),
  lot('london', 'brick', -103, -112.6, 25, 6, 14, 'S'),
  // London: the corner behind Parliament, and the side of the road down to Ace Cafe
  lot('london', 'brick', -75, -21.5, 13, 13, 18, 'NW'),
  lot('london', 'stucco', -103.5, -19, 9.2, 6.5, 16, 'E'),
  // Paris: the wedges between avenue Kléber and the Champs-Élysées
  lot('paris', 'haussmann', 24, -54, 14, 14, 25, 'ES'),
  lot('paris', 'haussmann', 40, -49, 8, 11, 25, 'E'),
  lot('paris', 'haussmann', 29, -38, 9, 23, 25, 'S'),
  lot('paris', 'haussmann', 15, -30, 12, 15, 22, 'SW'),
  lot('paris', 'haussmann', 93, -23, 10, 8, 22, 'W'),
  // Paris: the left bank, beside the Eiffel Tower
  lot('paris', 'haussmann', -26, 44, 7, 28, 22, 'E'),
  lot('paris', 'haussmann', 38, 46, 12, 14, 25, 'NS'),
  // Italy: the south side of the piazza, the houses of Venice, a quayside house and the factory's sheds
  lot('italy', 'ochre', -68, 72, 26, 7, 14, 'N'),
  lot('italy', 'ochre', 89, 36, 13, 13, 13, 'W'),
  lot('italy', 'ochre', 89, 62, 13, 9, 15, 'W'),
  lot('italy', 'ochre', 89, 73, 13, 9, 11, 'W'),
  lot('italy', 'ochre', 50, 29, 8, 11, 15, 'N'),
  lot('italy', 'shed', -104, 96, 30, 16, 8),
];
