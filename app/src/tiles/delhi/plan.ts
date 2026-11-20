// The Delhi tile, as numbers. Nothing in this file draws anything.
//
// North is at the top, as on a map. The Yamuna runs down the east side. Old
// Delhi is the north, Connaught Place is west of the middle, and the axis from
// Rashtrapati Bhavan to India Gate runs east and west across the middle. The
// Ring Road runs along the south and up beside the river, and south of it lie
// R. K. Puram, Hauz Khas, the Qutub Minar and the Lotus Temple.
//
// Units: 1 unit is 1 cm of toy. A lane is 5 wide and a car is about 7 long.
// A storey is 3.4 high here, as it is on Hong Kong's tile: Delhi is a low
// city, and its two and three storeys should read as that beside its domes.
// x points east, z points south, y points up.

import type { P2 } from '../../engine/lanes';

export const STOREY = 3.4;

// ---------------------------------------------------------------------------
// The river and its two banks
// ---------------------------------------------------------------------------

/** The Yamuna: its middle line, and half its width. The ghats lie between the Ring Road's sidewalk and the water. */
export const RIVER = { x: 79, half: 9 };
/** The west bank's edge and the east bank's. */
export const WEST_BANK = RIVER.x - RIVER.half, EAST_BANK = RIVER.x + RIVER.half;

// ---------------------------------------------------------------------------
// The Ring Road: one road there and back, from Dhaula Kuan's loop to Akshardham's gate
// ---------------------------------------------------------------------------

export const RING = {
  /** From the middle of the verge to the middle of either lane, and half the width of one carriageway. */
  off: 4.25, half: 2.75,
  /** Half the width of the verge between the two carriageways. */
  verge: 1.5,
  /** The south leg runs east along this line, from Dhaula Kuan. */
  z: 59, x0: -82,
  /** How high the road is on a flyover, and how long each ramp is. */
  fly: 4.4, ramp: 18, span: 16,
  /** After the second flyover it swings south to this line, and turns north beside the river along this one. */
  z1: 74, x1: 60.5,
  /** Where it turns onto the Signature Bridge, how high the bridge's deck is, and the line it runs south along on the east bank. */
  bridgeZ: -100, deck: 2.4, x2: 96,
  /** Where the east bank's road ends, at Akshardham's gate. */
  endZ: -14,
  /** How wide the two turning loops are. */
  loop: 5,
};

/** The two streets that pass under the Ring Road's flyovers: Shanti Path under Moti Bagh's, Aurobindo Marg under AIIMS's. */
export const SHANTI_X = -54, AUROBINDO_X = -2;

// ---------------------------------------------------------------------------
// The axis: Raisina Hill, Kartavya Path and India Gate's hexagon
// ---------------------------------------------------------------------------

/** Kartavya Path runs east and west along this line. */
export const AXIS_Z = 6;
/** Raisina Hill: a terrace this high, west of this line, between these two. */
export const RAISINA = { y: 3, x1: -58, z0: -18, z1: 30, /** the road climbs between these two */ foot: -46, top: -58 };
/** Where the long drive turns round in front of Rashtrapati Bhavan's gates: the middle of the circle, and the middle of its one lane. */
export const RAISINA_TURN: P2 = [-76, AXIS_Z], TURN_R = 4.5;
/** India Gate's hexagon: its middle, and how far its two lanes are from it, measured square to its sides. */
export const HEX: P2 = [21, AXIS_Z], HEX_LANES = [16.5, 21.5];
/** A corner of the hexagon: 0 is the east one, and they go round by the south, as the traffic does. */
export const hexCorner = (i: number, apothem: number): P2 => {
  const r = apothem / Math.cos(Math.PI / 6), a = (i * Math.PI) / 3;
  return [HEX[0] + Math.cos(a) * r, HEX[1] + Math.sin(a) * r];
};
/** Where Aurobindo Marg ends and the road to the hexagon's south-west corner begins. */
export const AKBAR_FOOT: P2 = [AUROBINDO_X, 45.85];
/** Where the long drive turns round at the Qutub Minar. */
export const QUTUB_TURN: P2 = [AUROBINDO_X, 104];

// ---------------------------------------------------------------------------
// Shanti Path, and Kaifi Azmi Marg to the school's gate
// ---------------------------------------------------------------------------

export const SHANTI = { north: 44, south: 100, /** the school's gate, and where the buses turn */ gateX: -84, turnX: -88 };

// ---------------------------------------------------------------------------
// Connaught Place, and the road from Karol Bagh through it to Kashmere Gate
// ---------------------------------------------------------------------------

export const CP: P2 = [-40, -38];
/** From the middle outwards: the park, the Inner Circle's lane, the blocks, and the Outer Circle's lane. */
export const CP_R = { park: 6, inner: 8.75, block0: 13, block1: 20, outer: 24.5, edge: 29 };
/** The road through Connaught Place runs east and west along this line, and north up Netaji Subhash Marg along this one. */
export const CP_ROAD_Z = CP[1], NS_MARG_X = 19.5;
export const KAROL_BAGH_TURN: P2 = [-92, CP_ROAD_Z], KASHMERE_TURN: P2 = [NS_MARG_X, -104];

/** Chandni Chowk: paved, and closed to motor traffic. */
export const CHANDNI = { z: -95, half: 5, x0: -52, x1: 12 };

// ---------------------------------------------------------------------------
// The Metro: the Pink Line's viaduct, on the Ring Road's verge and over the river
// ---------------------------------------------------------------------------

export const METRO = { y: 9.5, x0: -88, /** its station on the east bank lies along this line, between these two */ x1: 97.5, stationZ0: 42, stationZ1: 64 };

// ---------------------------------------------------------------------------
// The Buddh circuit's corner, at the east bank's south end
// ---------------------------------------------------------------------------

export const BUDDH = { x0: 92.5, x1: 100.5, z0: 86, z1: 106, r: 4 };

// ---------------------------------------------------------------------------
// The things that stand on the tile
// ---------------------------------------------------------------------------

export type Quarter = 'old-delhi' | 'centre' | 'south' | 'river';

/**
 * One of the tile's recognisable things: where it stands, how large and how
 * high. Each is built in its quarter's own file, which takes its measures
 * from here.
 */
export interface Thing {
  n: number;
  id: string;
  name: string;
  quarter: Quarter;
  /** Its north-west corner and its size. */
  x: number; z: number; w: number; d: number;
  /** How high it stands above its own ground. Nothing, for a thing that is ground: a street, a lawn, a tank. */
  h: number;
  /** The ground it stands on, if not the street. */
  y?: number;
}

const T = (n: number, id: string, name: string, quarter: Quarter, x: number, z: number, w: number, d: number, h: number, more: Partial<Thing> = {}): Thing =>
  ({ n, id, name, quarter, x, z, w, d, h, ...more });

export const THINGS: Thing[] = [
  // Old Delhi and the river
  T(1, 'red-fort', 'RED FORT', 'old-delhi', 31, -100, 19, 38, 9),
  T(2, 'jama-masjid', 'JAMA MASJID', 'old-delhi', -10, -84, 22, 24, 18),
  T(3, 'chandni-chowk', 'CHANDNI CHOWK', 'old-delhi', CHANDNI.x0, CHANDNI.z - CHANDNI.half, CHANDNI.x1 - CHANDNI.x0, CHANDNI.half * 2, 0),
  T(4, 'faiths', 'ROW OF FAITHS', 'old-delhi', -26, -90, 36, 6, 10),
  T(5, 'fatehpuri', 'FATEHPURI MASJID', 'old-delhi', -62, -101, 10, 12, 12),
  T(6, 'paranthe-gali', 'PARANTHE WALI GALI', 'old-delhi', -40, -90, 12, 8, 7),
  T(7, 'khari-baoli', 'KHARI BAOLI', 'old-delhi', -84, -100, 20, 12, 8),
  T(8, 'kites', 'KITES AND PIGEONS', 'old-delhi', -48, -80, 34, 10, 0),
  T(9, 'kebab-lane', 'KEBAB LANE', 'old-delhi', -10, -59, 22, 6, 4),
  T(10, 'kashmere-gate', 'KASHMERE GATE', 'old-delhi', -2, -112.5, 12, 11, 9),
  T(11, 'signature-bridge', 'SIGNATURE BRIDGE', 'river', 83, -109, 4, 18, 46),
  T(12, 'ghats', 'GHATS', 'river', 67.5, -50, 2.5, 60, 0),
  // The centre
  T(13, 'connaught-place', 'CONNAUGHT PLACE', 'centre', CP[0] - CP_R.block1, CP[1] - CP_R.block1, CP_R.block1 * 2, CP_R.block1 * 2, 7.5),
  T(14, 'flag', 'THE FLAG', 'centre', CP[0] - 1, CP[1] - 1, 2, 2, 20),
  T(15, 'jantar-mantar', 'JANTAR MANTAR', 'centre', -11, -29, 12, 14, 7),
  T(16, 'agrasen-ki-baoli', 'AGRASEN KI BAOLI', 'centre', 4, -29, 12, 6, 0),
  T(17, 'bangla-sahib', 'BANGLA SAHIB', 'centre', -88, -30, 18, 11, 12),
  T(18, 'karol-bagh', 'KAROL BAGH', 'centre', -102, -60, 28, 11, 10),
  T(19, 'rashtrapati-bhavan', 'RASHTRAPATI BHAVAN', 'centre', -104, -16, 12, 44, 19, { y: RAISINA.y }),
  T(20, 'north-block', 'NORTH BLOCK', 'centre', -78, -14, 20, 10, 9, { y: RAISINA.y }),
  T(21, 'south-block', 'SOUTH BLOCK', 'centre', -78, 16, 20, 10, 9, { y: RAISINA.y }),
  T(22, 'kartavya-path', 'KARTAVYA PATH', 'centre', -44, -9, 34, 30, 0),
  T(23, 'india-gate', 'INDIA GATE', 'centre', 11.5, -1, 6, 14, 16),
  T(24, 'canopy', 'CANOPY', 'centre', 21, 4.5, 3, 3, 8),
  T(25, 'war-memorial', 'WAR MEMORIAL', 'centre', 26.5, 2.8, 6.4, 6.4, 5),
  T(26, 'vintage-rally', 'NATIONAL STADIUM', 'centre', 43, 21, 8, 5, 7),
  T(27, 'bharat-mandapam', 'BHARAT MANDAPAM', 'centre', 30, -48, 21, 12, 11),
  T(28, 'akshardham', 'AKSHARDHAM', 'river', 91, 6, 12, 16, 14),
  T(29, 'hanuman', 'HANUMAN', 'centre', -102, -74, 8, 8, 15),
  // The south
  T(30, 'humayuns-tomb', "HUMAYUN'S TOMB", 'south', 52.5, 95.5, 8, 8, 17),
  T(31, 'lodhi-garden', 'LODHI GARDEN', 'south', 9.5, 43, 6, 6, 8),
  T(32, 'khan-market', 'KHAN MARKET', 'south', 15, 33, 12, 3.5, 7),
  T(33, 'safdarjungs-tomb', "SAFDARJUNG'S TOMB", 'south', -25, 27.5, 8, 8, 13),
  T(34, 'dilli-haat', 'DILLI HAAT', 'south', -30, 41.5, 18, 8.5, 5),
  T(35, 'sarojini-nagar', 'SAROJINI NAGAR', 'south', -44, 23, 12, 27, 5),
  T(36, 'moti-bagh-station', 'MOTI BAGH', 'south', -84, 55, 20, 8, 6, { y: METRO.y }),
  T(37, 'dps', 'DPS R. K. PURAM', 'south', -98, 72, 24, 8, 10.2),
  T(38, 'rk-puram', 'R. K. PURAM', 'south', -70, 70, 8.5, 8, 6.8),
  T(39, 'hauz-khas', 'HAUZ KHAS', 'south', -40, 77, 7, 7, 10),
  T(40, 'deer-park', 'DEER PARK', 'south', -33, 68, 21.5, 8, 0),
  T(41, 'qutub-minar', 'QUTUB MINAR', 'south', -29.5, 100.5, 7, 7, 28),
  T(42, 'lotus-temple', 'LOTUS TEMPLE', 'south', 19.5, 88.5, 17, 17, 12.5),
  T(43, 'buddh', 'GREATER NOIDA', 'river', 89, 80, 15, 32, 0),
  T(44, 'mayur-vihar-station', 'MAYUR VIHAR', 'river', 95, METRO.stationZ0, 8, METRO.stationZ1 - METRO.stationZ0, 6, { y: METRO.y }),
];

export const thing = (id: string): Thing => {
  const t = THINGS.find((q) => q.id === id);
  if (!t) throw new Error(`There is no thing called ${id} in Delhi's plan.`);
  return t;
};

/** The ground a thing is given beyond its own walls: a garden, a forecourt, a tank. Nothing built by anyone else stands on it. */
export const GROUNDS: Record<string, [number, number, number, number]> = {
  'red-fort': [27, -101, 51.5, -51],
  'karol-bagh': [-102, -60, -74, -45.5],
  'national-stadium': [29, 39, 51, 50],
  dhaba: [6, 68.5, 12.5, 93],
  buddh: [89, 80, 104, 112.5],
  'jama-masjid': [-10, -84, 12, -60],
  'bangla-sahib': [-88, -30, -70, -19],
  'bharat-mandapam': [30, -48, 51, -24],
  'vintage-rally': [43, 24, 51, 38],
  'humayuns-tomb': [45, 87, 68, 112],
  'lodhi-garden': [7.5, 42, 28, 50],
  'khan-market': [15, 33, 27, 41],
  'safdarjungs-tomb': [-30, 22.5, -12, 40.5],
  dps: [-102, 70, -70, 92.5],
  'rk-puram': [-70, 70, -61.5, 92.5],
  'hauz-khas': [-44.5, 68, -11.5, 94],
  'qutub-minar': [-44, 95, -12, 113],
  'lotus-temple': [13, 82, 43, 112],
  akshardham: [89, 0, 104, 36],
};

/**
 * Tanks and pools that are cut into the ground: [x0, z0, x1, z1]. The tile cuts the hole and, for a wet one, lays the
 * water, 0.9 below the ground. Whoever builds the thing builds its walls and steps. The baoli is dry, and its hole goes
 * down to the floor of the base, 2.4 below the ground.
 */
export const WATERS: Record<string, { at: [number, number, number, number]; wet: boolean }> = {
  'hauz-khas': { at: [-33, 81, -13, 93], wet: true },
  'bangla-sahib': { at: [-80, -28.5, -71.5, -20.5], wet: true },
  akshardham: { at: [90, 4, 103.6, 24], wet: true },
  'agrasen-ki-baoli': { at: [5, -28.2, 15, -23.8], wet: false },
};

// ---------------------------------------------------------------------------
// Ordinary buildings: the streets between the things
// ---------------------------------------------------------------------------

/** How a quarter's ordinary buildings look. */
export type Style = 'haveli' | 'bazaar' | 'colony' | 'lutyens' | 'village' | 'shed';

export interface Plot { quarter: Quarter; x: number; z: number; w: number; d: number; h: number; style: Style; signs?: string }

const lot = (quarter: Quarter, style: Style, x: number, z: number, w: number, d: number, storeys: number, signs = ''): Plot =>
  ({ quarter, style, x, z, w, d, h: storeys * STOREY, signs });

export const PLOTS: Plot[] = [
  // Chandni Chowk's north side: two and three storeys, their signs to the street
  lot('old-delhi', 'bazaar', -50, -112, 11, 12, 3, 'S'),
  lot('old-delhi', 'bazaar', -38, -112, 9, 12, 2, 'S'),
  lot('old-delhi', 'bazaar', -28, -112, 12, 12, 3, 'S'),
  lot('old-delhi', 'bazaar', -15, -112, 8, 12, 3, 'S'),
  lot('old-delhi', 'bazaar', -6, -112, 3.5, 12, 2, 'S'),
  // its south side, low, so that the street is seen
  lot('old-delhi', 'bazaar', -50, -90, 9, 6, 2, 'N'),
  // godowns behind Khari Baoli
  lot('old-delhi', 'haveli', -84, -112, 9, 10, 2),
  lot('old-delhi', 'haveli', -73, -112, 9, 10, 3),
  // the lanes between Chandni Chowk and Jama Masjid, where the kites fly
  lot('old-delhi', 'haveli', -62, -84, 10, 8, 2),
  lot('old-delhi', 'haveli', -50, -80, 9, 10, 3),
  lot('old-delhi', 'haveli', -39, -82, 8, 11, 2),
  lot('old-delhi', 'haveli', -29, -80, 8, 10, 3),
  lot('old-delhi', 'haveli', -19, -82, 7, 12, 2),
  lot('old-delhi', 'haveli', -66, -74, 9, 10, 2),
  lot('old-delhi', 'haveli', -24, -69, 10, 6, 2),
  // south of the mosque, towards the road
  lot('old-delhi', 'haveli', -10, -52, 9, 6, 2, 'S'),
  lot('old-delhi', 'haveli', 1, -52, 10, 6, 2, 'S'),
  // the bus terminal north of the fort
  lot('old-delhi', 'shed', 30, -112, 16, 9, 1.5, 'S'),
  // Karol Bagh, behind the accessory street
  lot('centre', 'bazaar', -72, -60, 4.5, 11, 3, 'S'),
  lot('centre', 'bazaar', -92, -72, 12, 10, 2, 'S'),
  lot('centre', 'bazaar', -78, -72, 10, 10, 3, 'S'),
  // between Connaught Place and the hexagon
  lot('centre', 'lutyens', 18, -30, 9, 8, 2),
];
