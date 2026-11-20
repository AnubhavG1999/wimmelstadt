// The Urbana-Champaign tile, as data. Nothing in this file draws anything.
//
// The campus of the University of Illinois, with Campustown to its west and a
// strip of Urbana to its east. North is at the top of the board and nothing is
// turned. NOTES.md says what stands where and why, and what was done
// differently from the real place.
//
// Units: 1 unit is 1 cm of toy. A lane is 5 wide and a car is about 7 long.
// x points east, z points south, y points up.

import type { Tall } from '../../engine/checks';
import type { Seg } from '../../engine/paths';
import type { StreetOpts } from '../../engine/roads';
import type { SignDef } from '../../engine/signs';
import { TILE, type Build, type HeroSpot, type ParkedSpot, type Rect, type Route, type TrafficType } from '../../engine/tile';

export const BOARD = TILE;

// ---------------------------------------------------------------------------
// Streets
// ---------------------------------------------------------------------------

/** The middle lines of the streets that run east and west: Green Street, Gregory Drive, Peabody Drive (Pennsylvania Avenue east of Fourth) and Kirby Avenue (Florida Avenue in Urbana). */
export const GREEN = -82, GREGORY_DR = 7.5, PEABODY = 48.5, KIRBY = 87.5;
/** And of those that run north and south: First Street, Fourth Street, Wright Street (Sixth Street south of Gregory Drive) and Gregory Street. */
export const FIRST = -90, FOURTH = -33, WRIGHT = 2, GREGORY_ST = 97;

/** Half a carriageway of two lanes, and from the middle of a street to the middle of one of its lanes. */
export const CARR = 5, LANE = 2.5;
/** How wide the sidewalks are: on Green Street, and on every other street. */
export const WALK_GREEN = 2, WALK = 1.5;

/** The railway's embankment along the west edge: where it stands, how high its track is, and how far in under it the road turns round. */
export const RAIL = { x0: -104, x1: -96, y: 6, track: -100, turn: -102 };
/** The top of the embankment, and the height of the line a train follows along it. */
export const EMBANKMENT = { top: RAIL.y - 0.5, rail: RAIL.y - 0.34 };
/** The two viaducts, where a street passes under the railway: the street's middle line, and half the width of the opening. */
export const VIADUCTS = [{ id: 'green', z: GREEN, half: 6.2 }, { id: 'kirby', z: KIRBY, half: 6.2 }];

export interface StreetDef { id: string; name: string; pts: [number, number][]; opts: StreetOpts; lamps: boolean }

const two = (sidewalk: number): StreetOpts => ({ lanes: 2, width: CARR * 2, sidewalk });

/**
 * Every street as its middle line. Where one ends at another it runs on to the
 * far kerb of that one, so that the engine finds the junction.
 */
export const STREETS: StreetDef[] = [
  { id: 'green', name: 'Green Street', pts: [[RAIL.x0 + 0.5, GREEN], [GREGORY_ST + CARR, GREEN]], opts: two(WALK_GREEN), lamps: true },
  { id: 'gregory-drive', name: 'Gregory Drive', pts: [[FIRST - CARR, GREGORY_DR], [GREGORY_ST + CARR, GREGORY_DR]], opts: two(WALK), lamps: true },
  { id: 'peabody', name: 'Peabody Drive and Pennsylvania Avenue', pts: [[FIRST - CARR, PEABODY], [GREGORY_ST + CARR, PEABODY]], opts: two(WALK), lamps: true },
  { id: 'kirby', name: 'Kirby Avenue and Florida Avenue', pts: [[RAIL.x0 + 0.5, KIRBY], [GREGORY_ST + CARR, KIRBY]], opts: two(WALK), lamps: true },
  { id: 'first', name: 'First Street', pts: [[FIRST, GREEN - CARR], [FIRST, KIRBY + CARR]], opts: two(WALK), lamps: true },
  { id: 'fourth', name: 'Fourth Street', pts: [[FOURTH, GREEN - CARR], [FOURTH, KIRBY + CARR]], opts: two(WALK), lamps: true },
  { id: 'wright', name: 'Wright Street and Sixth Street', pts: [[WRIGHT, GREEN - CARR], [WRIGHT, PEABODY + CARR]], opts: two(WALK), lamps: true },
  { id: 'gregory-street', name: 'Gregory Street', pts: [[GREGORY_ST, GREEN - CARR], [GREGORY_ST, KIRBY + CARR]], opts: two(WALK), lamps: true },
];

/** Whether a place is on a carriageway, give or take `pad`: for whatever is scattered and must keep off the roads. */
export function onRoad(x: number, z: number, pad = 0): boolean {
  for (const s of STREETS) {
    const [[x0, z0], [x1, z1]] = s.pts;
    const reach = CARR + pad;
    if (z0 === z1) {
      if (Math.abs(z - z0) < reach && x > Math.min(x0, x1) - pad && x < Math.max(x0, x1) + pad) return true;
    } else if (Math.abs(x - x0) < reach && z > Math.min(z0, z1) - pad && z < Math.max(z0, z1) + pad) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// The ground between the streets, inside the sidewalks
// ---------------------------------------------------------------------------

const GF = CARR + WALK_GREEN, F = CARR + WALK; // from a street's middle to the fronts of its buildings

export const BLOCKS: Record<string, Rect> = {
  north: { x0: RAIL.x1, z0: BOARD.z0, x1: BOARD.x1, z1: GREEN - GF },
  campustownWest: { x0: FIRST + F, z0: GREEN + GF, x1: FOURTH - F, z1: GREGORY_DR - F },
  campustownEast: { x0: FOURTH + F, z0: GREEN + GF, x1: WRIGHT - F, z1: GREGORY_DR - F },
  quad: { x0: WRIGHT + F, z0: GREEN + GF, x1: GREGORY_ST - F, z1: GREGORY_DR - F },
  sixPack: { x0: FIRST + F, z0: GREGORY_DR + F, x1: FOURTH - F, z1: PEABODY - F },
  huff: { x0: FOURTH + F, z0: GREGORY_DR + F, x1: WRIGHT - F, z1: PEABODY - F },
  southQuad: { x0: WRIGHT + F, z0: GREGORY_DR + F, x1: GREGORY_ST - F, z1: PEABODY - F },
  stadium: { x0: FIRST + F, z0: PEABODY + F, x1: FOURTH - F, z1: KIRBY - F },
  grove: { x0: FOURTH + F, z0: PEABODY + F, x1: GREGORY_ST - F, z1: KIRBY - F },
  south: { x0: RAIL.x1, z0: KIRBY + F, x1: BOARD.x1, z1: BOARD.z1 },
};

// ---------------------------------------------------------------------------
// Lawns, fields, car parks and the creek: patches of ground in a colour of their own
// ---------------------------------------------------------------------------

export type Surface = 'lawn' | 'field' | 'carpark' | 'plaza' | 'corn' | 'creek' | 'sand' | 'cemetery';

export interface AreaDef { id: string; name: string; x0: number; z0: number; x1: number; z1: number; surface: Surface }

const A = (id: string, name: string, x0: number, z0: number, x1: number, z1: number, surface: Surface): AreaDef => ({ id, name, x0, z0, x1, z1, surface });

export const AREAS: AreaDef[] = [
  A('boneyard', 'Boneyard Creek', RAIL.x1, -103.5, 48, -100.5, 'creek'),
  A('bardeen-quad', 'The Bardeen Quad', 22, -104.5, 48, -99, 'lawn'),
  A('main-quad', 'The Main Quad', 26, -51.5, 45, -19.5, 'lawn'),
  A('union-terrace', "The Union's terrace", 26, -53, 45, -51.5, 'plaza'),
  A('alma-plaza', "Alma Mater's plaza", 9, -75, 17, -70, 'plaza'),
  A('library-plaza', 'The library plaza', 29, -6, 41, 0.5, 'plaza'),
  A('morrow-plots', 'The Morrow Plots', 47.5, -5.5, 58, 0.5, 'corn'),
  A('south-quad', 'The South Quad', 26, 15, 46, 30, 'lawn'),
  A('washington-park', 'Washington Park', -68, -46, -60, -18, 'lawn'),
  A('volleyball', 'The sand court', -67, -34, -61, -26, 'sand'),
  A('wassaja-lawn', 'The lawn before Wassaja Hall', -83, 24.5, -65, 33.5, 'lawn'),
  A('football-field', 'The football field', -65, 58, -51, 78, 'field'),
  A('grange-grove', 'Grange Grove', -83, 56, -75, 80, 'lawn'),
  A('grove', 'The grove', -6, 56, 58, 80, 'lawn'),
  A('cemetery', 'The cemetery in the grove', 12, 62, 30, 75, 'cemetery'),
  A('illini-grove', 'Illini Grove', 64, 30, 90, 41, 'lawn'),
  A('gregory-place-parking', 'The car park behind Gregory Place', 71.5, -20, 78, -10, 'carpark'),
  A('lot-e14', 'Lot E-14', -95, 96, -68.5, 112.5, 'carpark'),
  A('saucer-east-lot', "The saucer's east car park", -47, 96, -30, 112.5, 'carpark'),
  A('practice-fields', 'The practice fields', -24, 96, 8, 112.5, 'field'),
  A('illinois-field', 'Illinois Field', 12, 96, 34, 112.5, 'field'),
  A('corn', 'The corn', 38, 96, 60, 112.5, 'corn'),
];

// ---------------------------------------------------------------------------
// Lots: everything that stands on the tile, as a rectangle with a height
// ---------------------------------------------------------------------------

/** What an ordinary building looks like: see RULES in city.ts. */
export type Style = 'shop' | 'bar' | 'tower' | 'flats' | 'hall' | 'lab' | 'house' | 'deck';

/**
 * A taller piece of a lot, for the sums of what hides what and for its box in
 * the blockout: a tower, a dome, a cupola. It stands on the ground unless `y0`
 * says where its underside is, as a board on a frame has one.
 */
export interface PartDef { id: string; x0: number; z0: number; x1: number; z1: number; h: number; y0?: number }

export interface LotDef {
  id: string;
  /** What it is called: on its board while it is a box, and in the notes. */
  name: string;
  x0: number; z0: number; x1: number; z1: number;
  /** How high its body stands. */
  h: number;
  /** A thing to find, which gets a model of its own, or an ordinary building in one of the tile's styles. */
  style: Style | 'thing';
  parts?: PartDef[];
}

const lots: LotDef[] = [];
const L = (id: string, name: string, x0: number, z0: number, x1: number, z1: number, h: number, style: Style | 'thing' = 'thing', parts?: PartDef[]): void => {
  lots.push({ id, name, x0, z0, x1, z1, h, style, parts });
};
const part = (id: string, x0: number, z0: number, x1: number, z1: number, h: number, y0?: number): PartDef => ({ id, x0, z0, x1, z1, h, y0 });

// --- north of Green Street: Campustown's north side, the engineering campus, the Siebel Center ---
L('terminal', 'Illinois Terminal', -95, -113, -80, -105, 12);
L('kams', 'KAMS', -83, -99, -72, -90, 7);
L('burnham', 'Burnham 310', -70, -113, -60, -105, 25);
L('shops-n1', 'shops', -70, -98, -59, -90, 7, 'shop');
L('here', 'HERE Champaign', -56, -99, -46, -90, 28.5);
L('shops-n2', 'shops', -44, -98, -28, -90, 7, 'shop');
L('tower-n', 'a tower of flats', -40, -113, -31, -105, 19, 'tower');
L('legends', 'Legends', -25, -98, -14, -90, 7);
L('murphys', "Murphy's Pub", -12, -98, -3, -90, 7);
L('everitt', 'Everitt Laboratory', 9, -99, 20, -90, 9, 'lab');
L('talbot', 'Talbot Laboratory', 9, -113, 20, -105, 9, 'lab');
L('engineering-hall', 'Engineering Hall', 27, -98, 44, -91, 12);
L('grainger', 'Grainger Library', 26, -113, 45, -105, 12);
L('siebel', 'Siebel Center', 50, -108, 71, -95, 11);
L('car-teams', 'The car teams', 75, -106, 92, -96, 8.5);

// --- Campustown south of Green: First to Fourth ---
L('red-lion', 'The Red Lion', -83, -75, -75, -67, 6);
L('shops-s1', 'shops', -66, -75, -55, -68, 7, 'shop');
L('green-309', '309 Green', -52, -75, -42, -65, 29);
L('tower-at-third', 'The Tower at Third', -52, -62, -42, -52, 23.5);
L('greek-1', 'a fraternity house', -83, -54, -73, -46, 8, 'house');
L('greek-2', 'a sorority house', -83, -42, -73, -34, 8, 'house');
L('greek-3', 'a fraternity house', -83, -30, -73, -22, 8, 'house');
L('bromley', 'Bromley Hall', -56, -44, -47, -34, 19, 'tower');
L('flats-1', 'flats', -83, -15, -68, -3, 9, 'flats');
L('flats-2', 'flats', -64, -13, -50, -3, 10, 'flats');
L('flats-3', 'flats', -47, -26, -40, -6, 9, 'flats');

// --- Fourth to Wright ---
L('brothers', 'Brothers', -26, -75, -16, -68, 6.5, 'bar');
L('shops-s2', 'shops', -14, -75, -5, -68, 6.5, 'shop');
L('joes', "Joe's Brewery", -26, -66, -17, -58, 7);
// (two floors of steel are up: the crane over them is too slender to hide anything)
L('illini-hall-site', 'The Illini Hall site', -14, -66, -5, -57, 5.5);
L('deck-c7', 'The deck at Sixth and John', -26, -52, -16, -42, 11, 'deck');
L('bookstore', 'Illini Union Bookstore', -14, -52, -5, -42, 12.5);
L('illini-tower', 'Illini Tower', -26, -40, -17, -31, 20.5, 'tower');
L('sherman', 'Sherman Hall', -14, -40, -6, -31, 17.5, 'tower');
L('ice-arena', 'The Ice Arena', -26, -29, -12, -21, 8);
L('armory', 'The Armory', -26, -18, -5, -3, 12);

// --- the Quad ---
L('alma-mater', 'Alma Mater', 11, -74.5, 14, -71.5, 6);
L('altgeld', 'Altgeld Hall', 9.5, -69, 20.5, -57, 10, 'thing', [part('altgeld-tower', 16, -69, 20.5, -64.5, 18.5)]);
L('union', 'The Illini Union', 26, -72, 45, -53, 10, 'thing', [
  part('union-ridge-n', 27, -70, 44, -68, 13), part('union-ridge-s', 27, -57, 44, -55, 13),
  part('union-cupola-n', 34, -70.5, 37, -67.5, 18), part('union-cupola-s', 34, -57.5, 37, -54.5, 18),
]);
L('harker', 'Harker Hall', 48, -72, 57, -64, 8);
L('henry', 'Henry Administration', 9.5, -55, 21.5, -47, 8);
L('english', 'The English Building', 9.5, -45, 21.5, -36, 9.5);
L('lincoln-hall', 'Lincoln Hall', 9.5, -34, 21.5, -23, 10);
L('gregory-hall', 'Gregory Hall', 9.5, -20, 22, -10, 9);
L('natural-history', 'Natural History', 48, -43, 57, -35, 10);
L('noyes', 'Noyes Laboratory', 48, -33, 57, -25, 9.5);
L('davenport', 'Davenport Hall', 48, -23, 57, -15, 9);
L('smith', 'Smith Hall', 47, -13, 57, -7, 8);
// (a unit deeper than it was at first, so that its round hall can be nearly as wide as its lot)
L('foellinger', 'Foellinger Auditorium', 29.5, -19.5, 41.5, -7.5, 9, 'thing', [part('foellinger-dome', 30.5, -18, 40.5, -8, 13)]);
L('library', 'The Main Library', 9.5, -8, 27, 0.5, 11);
L('observatory', 'The Observatory', 42, -7, 46.5, -3.5, 7);

// --- chemistry, behind Noyes, and Urbana ---
L('labs-ne', 'laboratories', 60.5, -74, 89, -63, 7, 'lab');
L('adams', 'Roger Adams Laboratory', 60.5, -47, 68.5, -34, 10);
L('clsl', 'Chemical & Life Sciences', 60.5, -32, 68.5, -17, 9.5);
L('krannert', 'Krannert Center', 71.5, -58, 89, -33, 2.5, 'thing', [
  part('krannert-great-hall', 72.5, -57, 81, -46, 12), part('krannert-festival', 82.5, -57, 88, -47, 11), part('krannert-playhouse', 82.5, -44, 88, -35, 10),
]);
L('manolos', "Manolo's", 71.5, -28, 78, -21.5, 5.5);
L('gregory-place', 'Gregory Place: Basil Thai', 79, -28, 88, -10, 8.5);
L('busey-evans', 'Busey and Evans halls', 61, -7, 88, 0.5, 7);

// --- the Six Pack, laid out round Wassaja Hall and the lawn before it ---
L('wassaja', 'Wassaja Hall', -83, 15, -70, 23.5, 11);
L('nugent', 'Nugent Hall', -68, 15, -53, 23, 9.5);
L('ikenberry-dining', 'Ikenberry Dining', -51, 15, -40, 23, 6);
L('hopkins', 'Hopkins Hall', -63, 25, -53, 33, 9);
L('weston', 'Weston Hall', -51, 25, -40, 33, 9);
L('bousfield', 'Bousfield Hall', -83, 35, -72, 42, 13.5);
// (Scott stands well east of Bousfield, as in life: the gap between them is what lets the opening view see the lawn)
L('scott', 'Scott Hall', -63, 35, -52.5, 42, 9);
L('snyder', 'Snyder Hall', -51, 35, -40, 42, 9);

// --- south of Gregory Drive: Fourth to Sixth, and the South Quad ---
L('huff', 'Huff Hall', -26, 15, -8, 25, 10, 'hall');
L('art-museum', 'Krannert Art Museum', -26, 30, -10, 41, 6, 'hall');
L('business', 'the business school', 9.5, 15, 22, 25, 9, 'hall');
L('kinley', 'David Kinley Hall', 9.5, 28, 22, 40, 9, 'hall');
L('bell-tower', 'McFarland bell tower', 34, 16, 38, 20, 22);
L('stock-pavilion', 'The Stock Pavilion', 26, 32, 46, 41, 8);
L('mumford', 'Mumford Hall', 49, 15, 59, 25, 9, 'hall');
L('aces-library', 'ACES Library', 49, 28, 59, 38, 10);
L('greenhouses', 'The greenhouses', 64, 16, 80, 26, 4.5);

// --- the stadium ---
// (its body is the apron it stands on: the stands, the ends and the board over the south end are its parts)
L('stadium', 'Gies Memorial Stadium', -74, 55.5, -42, 81, 0.4, 'thing', [
  part('stadium-west', -74, 57.5, -65, 79, 14), part('stadium-press', -74, 62, -70, 75, 17), part('stadium-east', -51, 57.5, -42, 79, 14),
  part('stadium-north', -65, 55.5, -51, 58, 6), part('stadium-south', -72, 78, -44, 81, 9), part('stadium-board', -66, 79.6, -50, 80.4, 18.5, 9.5),
]);

// --- Pennsylvania to Florida, east of Fourth ---
L('deck-e15', 'The deck at Fourth and Pennsylvania', -26, 56, -10, 70, 11);
L('par', 'Pennsylvania Avenue halls', 64, 56, 90, 66, 9.5, 'hall');
L('oglesby', 'Oglesby Hall', 66, 70, 73, 80, 18, 'tower');
L('trelease', 'Trelease Hall', 80, 70, 87, 80, 18, 'tower');

// --- south of Kirby ---
L('saucer', 'State Farm Center', -67, 95, -49, 113, 4, 'thing', [part('saucer-dome', -64, 98, -52, 110, 6.5)]);
L('illinois-field-stand', 'Illinois Field', 12, 96, 20, 101, 4);
L('round-barn-1', 'The Round Barns', 64, 97, 71, 104, 8);
L('round-barn-2', 'a round barn', 74, 102, 81, 109, 8);
L('round-barn-3', 'a round barn', 84, 97, 91, 104, 8);

export const LOTS: LotDef[] = lots;

export const lot = (id: string): LotDef => {
  const l = LOTS.find((q) => q.id === id);
  if (!l) throw new Error(`There is no lot called ${id}.`);
  return l;
};

/** Everything that can hide what is behind it, for `hiddenBy`: each lot's body, each of its taller parts, and the embankment. */
export const TALL: Tall[] = [
  { id: 'embankment', x0: RAIL.x0, z0: BOARD.z0, x1: RAIL.x1, z1: BOARD.z1, top: RAIL.y },
  ...LOTS.flatMap((l): Tall[] => [
    { id: l.id, x0: l.x0, z0: l.z0, x1: l.x1, z1: l.z1, top: l.h },
    ...(l.parts ?? []).map((p): Tall => ({ id: `${l.id}/${p.id}`, x0: p.x0, z0: p.z0, x1: p.x1, z1: p.z1, top: p.h })),
  ]),
];

// ---------------------------------------------------------------------------
// Roads that vehicles follow
// ---------------------------------------------------------------------------

/**
 * Every lane lies next to one piece of ground and is driven clockwise round
 * it: east along its north side, south down its east side, west along its
 * south side and north up its west side, which is keeping to the right. A
 * route round several pieces together uses the same lanes where its edge is
 * theirs, shares them, and goes straight on where they turn off. Of any two
 * routes here, one lies inside the other or they lie apart, and that is why
 * none crosses another.
 */
const round = (xw: number, zn: number, xe: number, zs: number, r = 4): Seg => ({
  t: 'ring', pts: [[xw + LANE, zn + LANE], [xe - LANE, zn + LANE], [xe - LANE, zs - LANE], [xw + LANE, zs - LANE]], y: 0, r,
});

const CARS: TrafficType[] = ['sedan', 'sedan', 'hatch', 'hatch', 'van', 'pickup'];
const GAME_DAY: TrafficType[] = ['sedan', 'hatch', 'pickup', 'pickup', 'van', 'pickup'];
/** The white of the district's buses. */
const BUS_WHITE = 0xf4f4ef;

/** Where the buses slow to a walk on Wright Street: the Transit Plaza. */
export const PLAZA_STOP = { z0: -58, z1: -52, speed: 1.3 };

/** The outer lanes of the square of four streets, anticlockwise, with a turn under the railway at Green Street and at Kirby Avenue. */
const OUTER: [number, number][] = [
  [GREGORY_ST + LANE, GREEN - LANE], [RAIL.turn, GREEN - LANE], [RAIL.turn, GREEN + LANE], [FIRST - LANE, GREEN + LANE],
  [FIRST - LANE, KIRBY - LANE], [RAIL.turn, KIRBY - LANE], [RAIL.turn, KIRBY + LANE],
  [GREGORY_ST + LANE, KIRBY + LANE],
];
/**
 * Lot E-14, beside the saucer: the aisle that goes round it, which vehicles
 * drive clockwise looking for a space, and the row of bays inside the aisle,
 * where cars stand nose to the south.
 */
export const LOT = { west: -93, east: -70.5, north: 98, south: 110.5, row: 104.2, bays: [-89.5, -85.5, -81.5, -77.5, -73.5] };

export const ROUTES: Route[] = [
  { id: 'outer', types: GAME_DAY, segs: [{ t: 'ring', pts: OUTER, y: 0, r: 4 }], speed: 17, count: 11 },
  // round the tailgate, on the lot's own aisle: it touches no street
  { id: 'tailgate-lot', types: ['pickup', 'pickup', 'sedan', 'van'], segs: [{ t: 'ring', pts: [[LOT.west, LOT.north], [LOT.east, LOT.north], [LOT.east, LOT.south], [LOT.west, LOT.south]], y: 0, r: 3 }], speed: 6, count: 2 },
  { id: 'campus', types: CARS, segs: [round(FIRST, GREEN, GREGORY_ST, KIRBY)], speed: 16, count: 7 },
  { id: 'campustown', types: CARS, segs: [round(FIRST, GREEN, FOURTH, GREGORY_DR)], speed: 15, count: 3 },
  { id: 'quad', types: CARS, segs: [round(FOURTH, GREEN, GREGORY_ST, GREGORY_DR)], speed: 15, count: 4 },
  { id: 'six-pack', types: CARS, segs: [round(FIRST, GREGORY_DR, FOURTH, PEABODY)], speed: 14, count: 2 },
  { id: 'huff', types: CARS, segs: [round(FOURTH, GREGORY_DR, WRIGHT, PEABODY)], speed: 14, count: 2 },
  { id: 'south-quad', types: CARS, segs: [round(WRIGHT, GREGORY_DR, GREGORY_ST, PEABODY)], speed: 15, count: 3 },
  { id: 'stadium', types: GAME_DAY, segs: [round(FIRST, PEABODY, FOURTH, KIRBY)], speed: 14, count: 2 },
  { id: 'grove', types: CARS, segs: [round(FOURTH, PEABODY, GREGORY_ST, KIRBY)], speed: 15, count: 4 },
  // The two bus loops have Wright Street to themselves: one comes down its west lane, the other goes up its east lane.
  {
    id: 'bus-west',
    types: ['bus'], paint: [BUS_WHITE], heroes: false,
    segs: [
      { t: 'poly', pts: [[WRIGHT - LANE, PLAZA_STOP.z1], [WRIGHT - LANE, GREGORY_DR - LANE], [FOURTH + LANE, GREGORY_DR - LANE], [FOURTH + LANE, GREEN + LANE], [WRIGHT - LANE, GREEN + LANE], [WRIGHT - LANE, PLAZA_STOP.z0]], y: 0, r: 4 },
      { t: 'poly', pts: [[WRIGHT - LANE, PLAZA_STOP.z0], [WRIGHT - LANE, PLAZA_STOP.z1]], y: 0, r: 0, speed: PLAZA_STOP.speed },
    ],
    speed: 13, count: 1,
  },
  {
    id: 'bus-east',
    types: ['bus'], paint: [BUS_WHITE], heroes: false,
    segs: [
      { t: 'poly', pts: [[WRIGHT + LANE, PLAZA_STOP.z0], [WRIGHT + LANE, GREEN + LANE], [GREGORY_ST - LANE, GREEN + LANE], [GREGORY_ST - LANE, GREGORY_DR - LANE], [WRIGHT + LANE, GREGORY_DR - LANE], [WRIGHT + LANE, PLAZA_STOP.z1]], y: 0, r: 4 },
      { t: 'poly', pts: [[WRIGHT + LANE, PLAZA_STOP.z1], [WRIGHT + LANE, PLAZA_STOP.z0]], y: 0, r: 0, speed: PLAZA_STOP.speed },
    ],
    speed: 13, count: 2,
  },
  // and one bus goes all the way round the campus
  { id: 'bus-illini', types: ['bus'], paint: [BUS_WHITE], heroes: false, segs: [round(FIRST, GREEN, GREGORY_ST, KIRBY)], speed: 14, count: 2 },
];

// ---------------------------------------------------------------------------
// Parked vehicles, and the places where a hero may stand on show
// ---------------------------------------------------------------------------

const EAST = 0, SOUTH = Math.PI / 2, WEST = Math.PI, NORTH = -Math.PI / 2;

/** Each is empty until a hero is given it. Each is open to the south-east, and its hero faces east or south. */
export const HERO_SPOTS: HeroSpot[] = [
  { id: 'quad-day', x: 29, y: 0.03, z: -45.5, heading: EAST },
  { id: 'basil-thai', x: 90.7, y: 0.03, z: -17, heading: SOUTH },
  { id: 'move-in', x: -73, y: 0.03, z: 26.2, heading: EAST },
  { id: 'tailgate-1', x: LOT.bays[1], y: 0.03, z: LOT.row, heading: SOUTH },
  { id: 'tailgate-2', x: LOT.bays[3], y: 0.03, z: LOT.row, heading: SOUTH },
  { id: 'car-teams', x: 83.5, y: 0.03, z: -93, heading: EAST },
  { id: 'deck-roof', x: -18, y: 11.05, z: 64, heading: SOUTH },
];

export const PARKED: ParkedSpot[] = [];
{
  // lot E-14: the first and the last bay of its row. Two are kept for heroes, and the middle one for a tent.
  for (const x of [LOT.bays[0], LOT.bays[4]]) PARKED.push({ x, y: 0.03, z: LOT.row, heading: SOUTH });
  // the saucer's east car park
  for (const z of [99, 103, 107]) PARKED.push({ x: -43.5, y: 0.03, z, heading: EAST }, { x: -34, y: 0.03, z: z + 1, heading: WEST });
  // the roofs of the two parking decks
  const c7 = lot('deck-c7'), e15 = lot('deck-e15');
  for (const z of [c7.z0 + 2.6, c7.z0 + 7.4]) PARKED.push({ x: c7.x0 + 5, y: c7.h + 0.05, z, heading: EAST });
  for (const x of [e15.x0 + 3, e15.x1 - 3]) PARKED.push({ x, y: e15.h + 0.05, z: e15.z0 + 4, heading: SOUTH });
  // beside Basil Thai, at the kerb, in the bay south of the hero's
  PARKED.push({ x: 90.7, y: 0.03, z: -9, heading: SOUTH });
  // behind Gregory Place, side by side
  for (const x of [73.2, 76.3]) PARKED.push({ x, y: 0.03, z: -14, heading: NORTH });
}

// ---------------------------------------------------------------------------
// What the opening view must see: asked of `hiddenBy` on every load of the development server
// ---------------------------------------------------------------------------

export interface SightPoint { name: string; x: number; y: number; z: number; skip: string[] }

const see = (name: string, x: number, y: number, z: number, ...skip: string[]): SightPoint => ({ name, x, y, z, skip });

export const MUST_SEE: SightPoint[] = [
  // (its Quad front is seen from the floor of its terrace up)
  see("the Union's Quad front, west end", 28.5, 0.7, -52.8, 'union'),
  see("the Union's Quad front, middle", 35.5, 0.7, -52.8, 'union'),
  see("the Union's Quad front, east end", 42.5, 0.7, -52.8, 'union'),
  see("the Union's glass cupola", 35.5, 15, -56, 'union'),
  see("Basil Thai's shopfront", 88.2, 0.5, -17.2, 'gregory-place'),
  see("Basil Thai's awning", 88.2, 3.5, -17.2, 'gregory-place'),
  see("Wassaja Hall's south side, west end", -81, 0.5, 23.7, 'wassaja'),
  see("Wassaja Hall's south side, middle", -76.5, 0.5, 23.7, 'wassaja'),
  see("Wassaja Hall's south side, east end", -72, 0.5, 23.7, 'wassaja'),
  see("the Siebel Center's south side", 60.5, 0.5, -94.8, 'siebel'),
  see("the stadium's screen", -58, 14, 80.7, 'stadium'),
  // three points on each place for a hero: the middle of the car and its two ends, at the height of its bonnet
  ...HERO_SPOTS.flatMap((s): SightPoint[] => [-3.4, 0, 3.4].map((d) => {
    const own = s.id === 'deck-roof' ? ['deck-e15'] : s.id === 'car-teams' ? ['car-teams'] : [];
    return see(`a hero at ${s.id}`, s.x + Math.cos(s.heading) * d, s.y + 1.4, s.z + Math.sin(s.heading) * d, ...own);
  })),
];

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------

/** While a lot is a plain box, it carries its name on a board that faces the opening view. */
const board = (l: LotDef): SignDef => {
  const text = l.name.toUpperCase();
  const aspect = Math.max(2.4, text.length * 0.6);
  return { id: `box-${l.id}`, lines: [text], color: l.style === 'thing' ? '#f4f1e8' : '#d9d5c9', ink: l.style === 'thing' ? '#13294b' : '#5a5f66', aspect, kind: 'board', size: [Math.round(52 * aspect), 52] };
};

export const BOX_SIGNS: SignDef[] = LOTS.map(board);

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

/** What builds a lot once it is more than a box: a function of the lot, so that it moves and grows with the plan. */
export type Model = (k: Build, l: LotDef) => void;

/**
 * What each file of models hands over: its models by the id of their lot, every
 * sign it hangs, and `extras` for whatever it builds that is not a lot. The
 * files are gathered in models.ts.
 */
export interface ModelFile { MODELS: Record<string, Model>; SIGNS: SignDef[]; extras(k: Build): void }
