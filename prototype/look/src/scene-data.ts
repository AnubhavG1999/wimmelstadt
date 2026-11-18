// The hand-built scene, as data. Nothing in this file draws anything.
//
// Units: 1 unit is 1 cm of toy. A lane is 5 wide, a storey is 5 high and a car
// is about 7 long. x points east, z points south, y points up.

export const LANE = 5;
export const STOREY = 5;
export const STREET_CARR = 5; // half-width of a two-lane carriageway
export const STREET_CORR = 8; // half-width including both sidewalks
export const BLVD_MEDIAN = 3; // half-width of the boulevard's median
export const BLVD_CARR = 13;
export const BLVD_CORR = 17;

export const BOARD = { x0: -104, x1: 104, z0: -113, z1: 113 };

export interface StreetV { x: number; carr: number; corr: number }
export interface StreetH { z: number; carr: number; corr: number; median: number }

export const V_STREETS: StreetV[] = [-96, -32, 32, 96].map((x) => ({
  x,
  carr: STREET_CARR,
  corr: STREET_CORR,
}));

export const H_STREETS: StreetH[] = [
  { z: -105, carr: STREET_CARR, corr: STREET_CORR, median: 0 },
  { z: -32, carr: BLVD_CARR, corr: BLVD_CORR, median: BLVD_MEDIAN },
  { z: 41, carr: STREET_CARR, corr: STREET_CORR, median: 0 },
  { z: 105, carr: STREET_CARR, corr: STREET_CORR, median: 0 },
];

/** The boulevard's median runs for |x| < MEDIAN_X and leaves room for U-turns beyond. */
export const MEDIAN_X = 80;

export type BlockId = 'A1' | 'B1' | 'C1' | 'A2' | 'B2' | 'C2' | 'A3' | 'B3' | 'C3';
const COL_X: Record<string, [number, number]> = { A: [-88, -40], B: [-24, 24], C: [40, 88] };
const ROW_Z: Record<string, [number, number]> = { '1': [-97, -49], '2': [-15, 33], '3': [49, 97] };

export interface Rect { x0: number; z0: number; x1: number; z1: number }

export function blockRect(id: BlockId): Rect {
  const [x0, x1] = COL_X[id[0]];
  const [z0, z1] = ROW_Z[id[1]];
  return { x0, z0, x1, z1 };
}
export const BLOCK_IDS: BlockId[] = ['A1', 'B1', 'C1', 'A2', 'B2', 'C2', 'A3', 'B3', 'C3'];

/** The park is the whole of block B2. */
export const PARK: Rect = blockRect('B2');

export function onCarriageway(x: number, z: number): boolean {
  for (const s of V_STREETS) if (Math.abs(x - s.x) < s.carr) return true;
  for (const s of H_STREETS) if (Math.abs(z - s.z) < s.carr) return true;
  return false;
}
export function inCorridor(x: number, z: number, pad = 0): boolean {
  for (const s of V_STREETS) if (Math.abs(x - s.x) < s.corr + pad) return true;
  for (const s of H_STREETS) if (Math.abs(z - s.z) < s.corr + pad) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

export type Style = 'glass' | 'office' | 'resi' | 'shop' | 'neon' | 'concrete';
export type Roof = 'bare' | 'units' | 'tank' | 'helipad' | 'garden' | 'none';

export interface Building {
  id: string;
  block: BlockId;
  x: number; z: number; w: number; d: number; // world min corner and size
  y0: number; y1: number;
  style: Style;
  tint: number;
  roof: Roof;
  crown?: { inset: number; h: number };
  spire?: number;
  /** Faces that carry signs, as compass letters. Defaults to the faces on the block's edge. */
  signs?: string;
  /** Part of a larger building: no ground floor shopfront, no roof details. */
  part?: boolean;
  /** A toy version of a famous building stands on this lot instead of a plain one. */
  landmark?: LandmarkKind;
}

export type LandmarkKind = 'sears' | 'wtc-north' | 'wtc-south' | 'empire' | 'bigben' | 'eiffel' | 'pisa';

interface BOpts {
  y0?: number; tint?: number; roof?: Roof; crown?: { inset: number; h: number };
  spire?: number; signs?: string; part?: boolean; landmark?: LandmarkKind;
}

export const BUILDINGS: Building[] = [];
const counters: Record<string, number> = {};

/** Adds a building given in block-local coordinates (0..48 from the block's north-west corner). */
function b(block: BlockId, lx: number, lz: number, w: number, d: number, top: number, style: Style, o: BOpts = {}): void {
  const r = blockRect(block);
  const n = (counters[block] = (counters[block] ?? 0) + 1);
  BUILDINGS.push({
    id: `${block}.${n}`,
    block,
    x: r.x0 + lx, z: r.z0 + lz, w, d,
    y0: o.y0 ?? 0, y1: top,
    style,
    tint: o.tint ?? n,
    roof: o.roof ?? (top > 60 ? 'units' : top > 24 ? 'tank' : 'bare'),
    crown: o.crown, spire: o.spire, signs: o.signs, part: o.part, landmark: o.landmark,
  });
}

// A1, north-west. The far corner in the default view, so the tallest cluster.
b('A1', 1, 1, 21, 21, 140, 'glass', { landmark: 'sears' });
b('A1', 23, 1, 24, 14, 78, 'office', { roof: 'helipad' });
b('A1', 1, 23, 14, 24, 62, 'resi');
b('A1', 17, 23, 14, 12, 96, 'glass', { crown: { inset: 3, h: 8 }, roof: 'none' });
b('A1', 33, 17, 14, 14, 44, 'office');
// (the lot at 17, 37 is left open: the Gateway Arch's north foot stands there)
b('A1', 33, 33, 14, 14, 30, 'neon');

// B1, north-centre. The expressway runs through the gate tower at local z 18..30.
b('B1', 10, 8, 28, 32, 18, 'office', { tint: 2, roof: 'none', signs: '' });
b('B1', 10, 8, 28, 9.5, 36, 'office', { y0: 18, tint: 2, roof: 'none', part: true, signs: '' });
b('B1', 10, 30.5, 28, 9.5, 36, 'office', { y0: 18, tint: 2, roof: 'none', part: true, signs: '' });
b('B1', 10, 8, 28, 32, 104, 'office', { y0: 36, tint: 2, part: true, roof: 'units', crown: { inset: 6, h: 10 }, signs: '' });
b('B1', 1, 1, 8, 15, 46, 'resi');
b('B1', 39, 1, 8, 15, 58, 'glass');
b('B1', 10, 41, 28, 6, 9, 'shop', { signs: 'S' });
b('B1', 1, 39, 7, 8, 17.5, 'shop', { landmark: 'pisa' });
b('B1', 40, 39, 7, 8, 8, 'shop');

// C1, north-east. The showroom (a cutaway) takes the south edge and is built separately.
b('C1', 2, 2, 13, 13, 128, 'glass', { landmark: 'wtc-north' });
b('C1', 18, 3, 13, 13, 128, 'glass', { landmark: 'wtc-south' });
b('C1', 33, 1, 14, 20, 88, 'glass', { roof: 'helipad' });
b('C1', 1, 19, 12, 13, 52, 'resi');
b('C1', 15, 17, 16, 15, 36, 'office');
b('C1', 33, 23, 14, 9, 40, 'neon');

// A2, west-centre. Low along the expressway street on its east side.
b('A2', 1, 1, 14, 22, 112, 'office', { landmark: 'empire' });
b('A2', 1, 25, 14, 22, 54, 'resi');
// (the lot at 17, 1 is left open: the Gateway Arch's south foot stands there)
b('A2', 17, 17, 12, 14, 30, 'concrete');
b('A2', 17, 33, 14, 14, 44, 'neon');
b('A2', 33, 1, 14, 12, 16, 'shop');
b('A2', 33, 15, 14, 16, 20, 'shop');
b('A2', 33, 33, 14, 14, 14, 'shop');

// B2 is the park. Only a small pavilion stands in it besides the landmark.
b('B2', 3, 37, 10, 8, 6, 'shop', { roof: 'garden', signs: 'S' });

// C2, east-centre. Low on its west and north sides to keep the centre open.
b('C2', 1, 1, 14, 14, 20, 'neon');
b('C2', 1, 17, 14, 14, 18, 'shop');
b('C2', 1, 33, 14, 14, 52, 'office', { landmark: 'bigben' });
b('C2', 17, 1, 14, 12, 26, 'office');
b('C2', 17, 15, 14, 16, 48, 'resi');
b('C2', 17, 33, 14, 14, 36, 'office');
b('C2', 33, 1, 14, 20, 44, 'glass');
b('C2', 33, 23, 14, 24, 52, 'office');

// A3 is the car park with its two spiral ramps, built separately.

// B3, south-centre. The expressway crosses at local z 18..30, so the south row stays low.
b('B3', 8, 1, 14, 15, 34, 'resi');
b('B3', 24, 1, 16, 15, 44, 'office');
b('B3', 1, 32, 14, 15, 12, 'shop');
b('B3', 17, 32, 14, 15, 42, 'office', { landmark: 'eiffel' });
b('B3', 33, 32, 14, 15, 10, 'shop');

// C3, south-east. Nearest the default camera, so low and open.
// The Taj Mahal and its garden fill the whole block; see TAJ below.

/** The landmark in the middle of the park. */
export const LANDMARK = { x: 0, z: 9, podiumR: 11, podiumH: 9, shaftR0: 7.2, shaftR1: 4.4, shaftTop: 120, podTop: 131, podR: 8.5, spireTop: 166, haloY: 110, haloR: 14.5 };

// Famous monuments that stand on their own rather than on a building lot.

/** The Gateway Arch spans the boulevard, so traffic drives through it. */
export const ARCH = { x: -64, z: -32, span: 52, height: 52 };
/** The Statue of Liberty stands on an island in the park's pond. `top` is the top of her pedestal. */
export const LIBERTY = { x: 15.5, z: -6.5, pondR: 7.6, top: 13.5 };
/** The Golden Gate Bridge carries the expressway over the boulevard on its east side. */
export const GOLDEN_GATE = { x: 32, z0: -46.5, z1: -17.5, top: 56 };
/** The Taj Mahal and its garden fill the south-east block. */
export const TAJ: Rect = blockRect('C3');
/** Everything that is lawn rather than paving. */
export const PARKS: Rect[] = [PARK, TAJ];

/** How fast the showroom's turntable turns, in radians per second. */
export const TURNTABLE_RATE = 0.22;

/** The showroom: a cutaway that opens south onto the boulevard. */
export const SHOWROOM = { x0: 48, z0: -63, x1: 80, z1: -50, h: 12, turntable: { x: 64, z: -56, r: 5 } };

/** The car park: five open floors, a roof deck and two spiral ramps on its south side. */
export const CARPARK = (() => {
  const o = blockRect('A3');
  return {
    x0: o.x0 + 2, x1: o.x0 + 46, z0: o.z0 + 2, z1: o.z0 + 22,
    floors: 5, roofY: 25,
    helixA: { cx: o.x0 + 11, cz: o.z0 + 34, R: 6.5 },
    helixB: { cx: o.x0 + 37, cz: o.z0 + 34, R: 6.5 },
    ox: o.x0, oz: o.z0,
  };
})();

// ---------------------------------------------------------------------------
// Roads that vehicles follow
// ---------------------------------------------------------------------------

export type Seg =
  | { t: 'ring'; pts: [number, number][]; y: number; r: number } // closed, every corner filleted
  | { t: 'poly'; pts: [number, number][]; y: number; r: number } // open, interior corners filleted
  | { t: 'helix'; cx: number; cz: number; R: number; phi0: number; phi1: number; y0: number; y1: number };

export type LoopKind = 'street' | 'boulevard' | 'perimeter' | 'express' | 'carpark';

export interface LoopDef {
  id: string;
  kind: LoopKind;
  segs: Seg[];
  speed: number; // cruising speed in units per second
  count: number; // traffic vehicles on the loop
  /** Index into HEROES of a hero that drives this loop. */
  hero?: number;
}

export const EXPRESS_Y = 24;
export const EXPRESS_HALF = 6;
/** The centreline of the elevated expressway: a rounded rectangle around the park. */
export const EXPRESS_RING: Seg = { t: 'ring', pts: [[-32, -73], [32, -73], [32, 73], [-32, 73]], y: EXPRESS_Y, r: 14 };

export const LOOPS: LoopDef[] = [];

// One clockwise loop around every block, in the kerb lanes. Clockwise means right
// turns only, so these loops never cross each other or anything else.
for (const id of BLOCK_IDS) {
  const r = blockRect(id);
  const north = id[1] === '2' ? 6.5 : 5.5; // row 2 faces the boulevard on its north side
  const south = id[1] === '1' ? 6.5 : 5.5; // row 1 faces it on its south side
  const xw = r.x0 - 5.5, xe = r.x1 + 5.5, zn = r.z0 - north, zs = r.z1 + south;
  LOOPS.push({
    id: `block-${id}`,
    kind: 'street',
    segs: [{ t: 'ring', pts: [[xw, zn], [xe, zn], [xe, zs], [xw, zs]], y: 0, r: 4 }],
    speed: 15,
    count: id === 'B2' ? 5 : 4,
    hero: id === 'B2' ? 2 : undefined,
  });
}

// The outer lane of the perimeter streets, counter-clockwise around the whole board.
LOOPS.push({
  id: 'perimeter',
  kind: 'perimeter',
  segs: [{ t: 'ring', pts: [[-98.5, 107.5], [98.5, 107.5], [98.5, -107.5], [-98.5, -107.5]], y: 0, r: 6 }],
  speed: 18,
  count: 11,
});

// The boulevard's two inner lanes, with a U-turn through the median gap at each end.
LOOPS.push({
  id: 'boulevard',
  kind: 'boulevard',
  segs: [{ t: 'ring', pts: [[-89.5, -26.5], [89.5, -26.5], [89.5, -37.5], [-89.5, -37.5]], y: 0, r: 5.5 }],
  speed: 21,
  count: 8,
  hero: 1,
});

// The expressway: the inner lane runs clockwise, the outer lane counter-clockwise.
LOOPS.push({
  id: 'express-inner',
  kind: 'express',
  segs: [{ t: 'ring', pts: [[-29.25, -70.25], [29.25, -70.25], [29.25, 70.25], [-29.25, 70.25]], y: EXPRESS_Y, r: 11.25 }],
  speed: 30,
  count: 6,
  hero: 0,
});
LOOPS.push({
  id: 'express-outer',
  kind: 'express',
  segs: [{ t: 'ring', pts: [[-34.75, -75.75], [-34.75, 75.75], [34.75, 75.75], [34.75, -75.75]], y: EXPRESS_Y, r: 16.75 }],
  speed: 28,
  count: 6,
});

// The car park: up one spiral, around the roof, down the other, and back along the ground.
{
  const c = CARPARK;
  const L = (lx: number, lz: number): [number, number] => [c.ox + lx, c.oz + lz];
  LOOPS.push({
    id: 'carpark',
    kind: 'carpark',
    segs: [
      { t: 'poly', pts: [L(30.5, 34), L(30.5, 45), L(17.5, 45), L(17.5, 34)], y: 0, r: 3.5 },
      { t: 'helix', cx: c.helixA.cx, cz: c.helixA.cz, R: c.helixA.R, phi0: 0, phi1: -4 * Math.PI, y0: 0, y1: c.roofY },
      { t: 'poly', pts: [L(17.5, 34), L(17.5, 17), L(7, 17), L(7, 8.5), L(41, 8.5), L(41, 17), L(30.5, 17), L(30.5, 34)], y: c.roofY, r: 3 },
      { t: 'helix', cx: c.helixB.cx, cz: c.helixB.cz, R: c.helixB.R, phi0: Math.PI, phi1: -3 * Math.PI, y0: c.roofY, y1: 0 },
    ],
    speed: 8.5,
    count: 7,
  });
}

// ---------------------------------------------------------------------------
// Stand-in heroes and parked vehicles
// ---------------------------------------------------------------------------

export type HeroBody = 'racer' | 'coupe' | 'kei';

export interface HeroDef {
  name: string;
  body: HeroBody;
  paint: string; accent: string; accent2: string;
  number: string;
  sponsor: string;
}

/** Placeholders for real diecasts. Each carries more detail than any traffic vehicle. */
export const HEROES: HeroDef[] = [
  { name: 'Racer 27', body: 'racer', paint: '#f4f1e8', accent: '#d8232a', accent2: '#1b4fa0', number: '27', sponsor: 'NEKO COLA' },
  { name: 'Drift coupe', body: 'coupe', paint: '#12b5b0', accent: '#ff4fa3', accent2: '#ffd23f', number: '86', sponsor: 'TOFU TURBO' },
  { name: 'Kei van', body: 'kei', paint: '#ffd23f', accent: '#1d1d1f', accent2: '#ff6b2c', number: '5', sponsor: 'WANWAN' },
  // The same castings again in other colours and decals: different heroes, not twins.
  { name: 'Drift coupe, night purple', body: 'coupe', paint: '#5b2a86', accent: '#35e0ff', accent2: '#f4f1e8', number: '13', sponsor: 'KAIJU' },
  { name: 'Racer 64, gulf blue', body: 'racer', paint: '#8fd3e8', accent: '#ff7a1a', accent2: '#1d1d1f', number: '64', sponsor: 'MOCHI' },
];

export interface ParkedSpot {
  x: number; y: number; z: number;
  heading: number; // radians: 0 faces east, pi/2 faces south
  hero?: number; // index into HEROES
  lit?: boolean; // stands inside a lit interior
  turntable?: boolean;
}

export const PARKED: ParkedSpot[] = [];
{
  const c = CARPARK;
  // Five floors of the car park, nose out towards the open south side.
  for (let f = 0; f < c.floors; f++) {
    for (let k = 0; k < 10; k++) {
      const skip = (f * 7 + k * 3) % 5 === 0 || (f + k) % 7 === 3;
      if (skip) continue;
      PARKED.push({ x: c.ox + 6 + k * 4.05, y: f * STOREY + 0.02, z: c.oz + 17.6, heading: Math.PI / 2, lit: true });
    }
  }
  // The roof: parallel parking on the island and along the north edge.
  PARKED.push({ x: c.ox + 14, y: c.roofY, z: c.oz + 12.75, heading: 0 });
  PARKED.push({ x: c.ox + 23.5, y: c.roofY, z: c.oz + 12.75, heading: 0, hero: 3 });
  PARKED.push({ x: c.ox + 33, y: c.roofY, z: c.oz + 12.75, heading: 0 });
  for (const lx of [9, 18.5, 28, 37.5]) PARKED.push({ x: c.ox + lx, y: c.roofY, z: c.oz + 4.3, heading: Math.PI });

  // The showroom: a hero on the turntable and two plain cars beside it.
  const s = SHOWROOM;
  PARKED.push({ x: s.turntable.x, y: 0.45, z: s.turntable.z, heading: 0.6, hero: 4, lit: true, turntable: true });
  PARKED.push({ x: s.x0 + 6.5, y: 0.06, z: s.z0 + 6.5, heading: Math.PI / 2 - 0.5, lit: true });
  PARKED.push({ x: s.x1 - 6.5, y: 0.06, z: s.z0 + 6.5, heading: Math.PI / 2 + 0.5, lit: true });
}

// ---------------------------------------------------------------------------
// Signs. Every brand here is invented.
// ---------------------------------------------------------------------------

export interface SignDef {
  id: string;
  lines: string[];
  color: string;
  vertical?: boolean; // characters stacked top to bottom
  jp?: boolean;
  aspect: number; // width over height
  kind?: 'neon' | 'box' | 'screen' | 'p';
}

export const SIGNS: SignDef[] = [
  { id: 'kaiju', lines: ['KAIJU', 'KARAOKE'], color: '#ff3d9a', aspect: 2.6 },
  { id: 'neko', lines: ['NEKO COLA'], color: '#35e0ff', aspect: 4.2 },
  { id: 'donut', lines: ['DONUT', 'GALAXY'], color: '#ffd23f', aspect: 2.6 },
  { id: 'hotel', lines: ['HOTEL MINI'], color: '#9fd8ff', aspect: 4.2 },
  { id: 'tofu', lines: ['TOFU TURBO'], color: '#7dff9b', aspect: 4.2 },
  { id: 'wanwan', lines: ['WANWAN', 'TIRES'], color: '#ff7a1a', aspect: 2.6 },
  { id: 'bank', lines: ['BIG BANANA', 'BANK'], color: '#ffe45c', aspect: 2.8 },
  { id: 'club', lines: ['CLUB 64'], color: '#c77dff', aspect: 3.4 },
  { id: 'arcade', lines: ['PIXEL', 'ARCADE'], color: '#35e0ff', aspect: 2.6 },
  { id: 'mochi', lines: ['MOCHI MOTORS'], color: '#ffffff', aspect: 5.4, kind: 'box' },
  { id: 'ponpoko', lines: ['PONPOKO PARKING'], color: '#7fd0ff', aspect: 6.4, kind: 'box' },
  { id: 'open', lines: ['24H'], color: '#7dff9b', aspect: 2.2 },
  { id: 'kaiju-jp', lines: ['怪獣カラオケ'], color: '#ff3d9a', vertical: true, jp: true, aspect: 0.2 },
  { id: 'ramen-jp', lines: ['らーめん竜巻'], color: '#ffb02e', vertical: true, jp: true, aspect: 0.2 },
  { id: 'yume-jp', lines: ['ゆめ電気'], color: '#7dff9b', vertical: true, jp: true, aspect: 0.27 },
  { id: 'sushi-jp', lines: ['ネオン寿司'], color: '#ff5a4f', vertical: true, jp: true, aspect: 0.24 },
  { id: 'donut-jp', lines: ['ドーナツ銀河'], color: '#ffd23f', vertical: true, jp: true, aspect: 0.2 },
  { id: 'neko-jp', lines: ['ネココーラ'], color: '#35e0ff', vertical: true, jp: true, aspect: 0.24 },
  { id: 'game-jp', lines: ['ゲーム'], color: '#c77dff', vertical: true, jp: true, aspect: 0.36 },
  { id: 'yu-jp', lines: ['湯'], color: '#ff5a4f', jp: true, aspect: 1 },
  { id: 'kusuri-jp', lines: ['薬'], color: '#7dff9b', jp: true, aspect: 1 },
  { id: 'p', lines: ['P'], color: '#ffffff', aspect: 1, kind: 'p' },
  { id: 'billboard', lines: ['DRINK', 'NEKO COLA'], color: '#35e0ff', aspect: 2.2, kind: 'box' },
  { id: 'screen', lines: ['NOW PLAYING', 'Midnight Wangan Loop', 'The Diecasts'], color: '#ff3d9a', aspect: 1.78, kind: 'screen' },
];

export const FASCIA_SIGNS = ['kaiju', 'neko', 'donut', 'hotel', 'tofu', 'wanwan', 'bank', 'club', 'arcade', 'open'];
export const BLADE_SIGNS = ['kaiju-jp', 'ramen-jp', 'yume-jp', 'sushi-jp', 'donut-jp', 'neko-jp', 'game-jp'];
export const SQUARE_SIGNS = ['yu-jp', 'kusuri-jp'];

/** Neon colours used for light strips and for the light that spills onto the street. */
export const NEON = ['#ff3d9a', '#35e0ff', '#ffb02e', '#7dff9b', '#c77dff', '#ff5a4f'];
