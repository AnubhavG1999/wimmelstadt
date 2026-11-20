// The sample tile. It is not a district and it is not on the board: it is here
// to try out every piece the engine offers, and as something to read before
// starting a tile. Open it with ?tiles=sample.
//
// On it: a river with two bridges, a ring road with a street across it and a
// street off that, a hill in three levels with a ramp up to a car park on the
// first, a little railway round a park, a row of ordinary buildings, three
// more that stand at an angle round a square, and a clock tower.

import { placed } from '../../engine/build';
import { ordinaryBuildings, type BuildingRules, type Lot } from '../../engine/buildings';
import { interior } from '../../engine/geo';
import { LAWN, PLAZA, area, band, ground, oval, rect, terrace, water } from '../../engine/ground';
import { buildPath } from '../../engine/paths';
import { station, track, train } from '../../engine/rail';
import { CONCRETE, lampsAlong, roadDeck, street } from '../../engine/roads';
import type { SignDef } from '../../engine/signs';
import type { Build, TileDef, TileParts, TrafficKind } from '../../engine/tile';
import { PART, boxAt, shapeFrom, shapePart, wheelsFor } from '../../engine/vehicles';

const SIGNS: SignDef[] = [
  { id: 'cafe', lines: ['CAFE'], color: '#ffd9a0', aspect: 3.0 },
  { id: 'books', lines: ['BOOKS'], color: '#7dff9b', aspect: 3.4 },
  { id: 'bakery', lines: ['BAKERY'], color: '#ff9ccb', aspect: 3.8 },
  { id: 'halt', lines: ['PARK HALT'], color: '#1c2f5e', ink: '#ffffff', aspect: 5.2, kind: 'board' },
];

const RULES: BuildingRules = {
  styles: {
    brick: { palette: [0xc98f6b, 0xb9785a, 0xd9a583], win: { cell: 3.2, storey: 5, lit: 0.3, kind: 0 } },
    glass: { palette: [0x8fb4cf, 0x7aa3c2], win: { cell: 2.4, storey: 5, lit: 0.44, kind: 1 } },
    shop: { palette: [0xe8dcc6, 0xe6c9a4, 0xd8e0d6], win: { cell: 4.6, storey: 5, lit: 0.4, kind: 2 }, shops: true },
  },
  roofs: [0x8d8a83, 0x7b7a7e, 0x9d988f],
  hip: () => ({ colors: [0xb5654a, 0x6b6f76] }),
  pool: () => ({ fascia: ['cafe', 'books', 'bakery'], blade: [], billboard: [] }),
  neon: ['#ff3d9a'],
};

const lot = (x: number, z: number, w: number, d: number, y1: number, style: string, more: Partial<Lot> = {}): Lot =>
  ({ x, z, w, d, y0: 0, y1, style, tint: Math.round(x + z), roof: 'bare', signs: '', ...more });

/** A model written to stand at (0, 0), as the models from the island were. `placed` puts it where it belongs. */
function clockTower(k: Build): void {
  const STONE = 0xcbb78a, FACE = 0xf6efd9;
  k.b.box(-2.2, 0, -2.2, 2.2, 20, 2.2, STONE, { win: { cell: 1.4, storey: 4, lit: 0.3, kind: 6 }, seed: 0.4 });
  k.b.box(-2.7, 20, -2.7, 2.7, 25, 2.7, STONE);
  for (const [nx, nz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    // a clock face on every side, lit from within at night
    const x = nx * 2.74, z = nz * 2.74, h = nx === 0 ? 1.7 : 0.03, d = nz === 0 ? 1.7 : 0.03;
    k.b.box(x - h, 20.8, z - d, x + h, 24.2, z + d, FACE, { win: interior(1.6) });
  }
  k.b.cyl(0, 0, 25, 31, 3.9, 0.1, 4, 0x4a4f55, { phase: Math.PI / 4, cap: false });
  k.glows.push({ x: 0, y: 31.4, z: 0, sx: 0.5, sy: 0.5, sz: 0.5, color: '#fff1c9' });
  k.lights.push({ x: 0, z: 3, r: 11, color: '#ffe2ae', k: 0.5 });
  k.person(3.4, 1.2);
  k.person(-3.2, -0.8);
}

function build(k: Build): TileParts {
  const b = k.board;

  // --- the river, and the ground with a hole for it ---
  // It comes in at the north edge, turns, and leaves at the east edge. A shape that
  // reaches the edge of the board stops a hair short of it.
  const river = band(buildPath([{ t: 'poly', pts: [[-20, b.z0 + 0.2], [-20, -30], [b.x1 - 0.2, -30]], y: 0, r: 34 }], false), 9);
  ground(k, { holes: [river] });
  water(k, river);

  // --- lawns and a square ---
  area(k, rect(26, 36, 74, 84), LAWN);
  area(k, oval(-45, 62, 30, 21), PLAZA);

  // --- streets: a ring road, a street across it, and a street off that ---
  const ring = buildPath([{ t: 'ring', pts: [[-80, -90], [80, -90], [80, 90], [-80, 90]], y: 0, r: 20 }], true);
  const cross = buildPath([{ t: 'poly', pts: [[-80, 30], [80, 30]], y: 0, r: 0 }], false);
  const high = buildPath([{ t: 'poly', pts: [[20, 30], [20, 90]], y: 0, r: 0 }], false);
  street(k, ring);
  street(k, cross);
  street(k, high);
  for (const p of [ring, cross, high]) lampsAlong(k, p, 6.3);

  // --- two bridges, where the ring road crosses the river: a slab, a pier in the water and a low wall on each side ---
  const bridge = (x0: number, z0: number, x1: number, z1: number, alongX: boolean): void => {
    k.b.box(x0, -1.3, z0, x1, -0.02, z1, CONCRETE, { faces: 'NESW' });
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    k.b.box(cx - 1, -2, cz - 1, cx + 1, -1.3, cz + 1, CONCRETE);
    if (alongX) for (const z of [z0, z1 - 0.5]) k.b.box(x0, 0, z, x1, 0.9, z + 0.5, CONCRETE);
    else for (const x of [x0, x1 - 0.5]) k.b.box(x, 0, z0, x + 0.5, 0.9, z1, CONCRETE);
  };
  bridge(-31, -98.5, -9, -81.5, true);
  bridge(71.5, -41, 88.5, -19, false);

  // --- a hill in three levels, with a ramp up to a car park on the first ---
  terrace(k, oval(-50, -56, 20, 20, 20), 0, 3.5);
  terrace(k, oval(-52, -60, 12, 12, 16), 3.5, 7);
  terrace(k, oval(-53, -62, 6, 6, 12), 7, 10);
  k.b.cyl(-53, -62, 10, 12.6, 2.4, 2.4, 8, 0xf1ede2, { win: interior(0.6), cap: false });
  k.b.cyl(-53, -62, 12.6, 14.6, 3.3, 0.2, 8, 0xb5654a, { cap: false });
  for (const [x, z, y] of [[-63, -50, 3.5], [-38, -62, 3.5], [-44, -70, 3.5], [-60, -66, 7], [-46, -56, 7]]) k.tree(x, z, 0.8, false, y);
  // the ramp stops where it meets the edge of the first level, and the car park reaches out to it
  const ramp = buildPath([{ t: 'ramp', pts: [[-50, 22], [-50, -36.6]], y0: 0, y1: 3.5, r: 0 }], false);
  roadDeck(k, ramp, 2.8, { thick: 0.5, wall: 0.5, lanes: 1, lift: 0.04, skirt: 5, step: 1.5 });
  area(k, [[-58, -48], [-42, -48], [-42, -38], [-47.2, -38], [-47.2, -36.6], [-52.8, -36.6], [-52.8, -38], [-58, -38]], 0x55575d, 3.52);

  // --- a little railway round the park, with a halt ---
  const rails = buildPath([{ t: 'ring', pts: [[34, 44], [66, 44], [66, 76], [34, 76]], y: 0.05, r: 8 }], true);
  track(k, rails);
  const halt = station(k, rails, rails.closest(50, 44), { length: 9, side: -1, name: 'halt', width: 3 });
  train(k, rails, { cars: 1, speed: 9, stops: [halt], body: 0xd8432b, stripe: 0xf2efe6 });

  // --- ordinary buildings: a row along the street, and three at an angle round the square ---
  ordinaryBuildings(k, [
    lot(2, 6, 14, 16, 22, 'shop', { signs: 'S' }),
    lot(18, 6, 12, 16, 34, 'brick', { roof: 'tank' }),
    lot(32, 4, 16, 18, 48, 'glass', { roof: 'units' }),
    lot(50, 6, 12, 16, 18, 'shop', { signs: 'S' }),
    lot(64, 8, 9, 14, 26, 'brick', { roof: 'hip' }),
  ], RULES);
  placed(k, -45, 60, 18, (q) => {
    ordinaryBuildings(q, [
      lot(-21, -9, 12, 13, 14, 'shop', { signs: 'S' }),
      lot(-7, -9, 12, 13, 22, 'brick', { roof: 'hip' }),
      lot(7, -9, 12, 13, 12, 'shop', { signs: 'S' }),
    ], RULES);
  });

  // --- a model that was written to stand at the origin ---
  placed(k, 50, 60, 0, clockTower);

  // --- trees and people ---
  for (const [x, z] of [[30, 40], [70, 40], [70, 80], [30, 80], [42, 68], [58, 52], [-70, 50], [-20, 80], [0, 46]]) k.tree(x, z, 0.9);
  for (let i = 0; i < 24; i++) k.person(-66 + k.rand() * 42, 46 + k.rand() * 30);

  return {
    // traffic of the tile's own shape, which the outer ring asks for by name beside the plain kinds
    kinds: [TRIKE],
    // traffic keeps to the right: clockwise on the inside of the ring, the other way on the outside
    routes: [
      { id: 'ring-inner', segs: [{ t: 'ring', pts: [[-77.5, -87.5], [77.5, -87.5], [77.5, 87.5], [-77.5, 87.5]], y: 0, r: 17.5 }], speed: 16, count: 6 },
      { id: 'ring-outer', segs: [{ t: 'ring', pts: [[-82.5, -92.5], [-82.5, 92.5], [82.5, 92.5], [82.5, -92.5]], y: 0, r: 22.5 }], speed: 16, count: 6, types: ['sedan', 'hatch', 'trike', 'trike'] },
    ],
    parked: [{ x: -55, y: 3.52, z: -43, heading: -Math.PI / 2 }],
    heroSpots: [{ id: 'hill', x: -47, y: 3.52, z: -43, heading: -Math.PI / 2 }],
  };
}

/**
 * A kind of traffic of the tile's own: a delivery tricycle. Its nose is along
 * +x and it stands on y = 0. The box on its back is paint, given in white, and
 * takes one of `colors` for each tricycle; every other part keeps its colour.
 */
const TRIKE: TrafficKind = {
  name: 'trike', len: 5.2, wid: 2.6, colors: [0xd94f4f, 0x3f6fb5, 0xf2c14e, 0x4fa36b],
  geo: shapeFrom([
    shapePart(boxAt(2.6, 1.7, 2.3, -1.2, 1.75, 0), PART.paint, 0xffffff), // the box on its back
    shapePart(boxAt(2.4, 0.3, 0.7, 1.0, 1.0, 0), PART.trim, 0x2a2c31), // the frame, forward of it
    shapePart(boxAt(0.9, 0.25, 0.9, 0.5, 1.45, 0), PART.trim, 0x3a2a1a), // the saddle
    shapePart(boxAt(0.2, 1.3, 0.2, 2.0, 1.5, 0), PART.trim, 0x2a2c31), // the steering column, and the handlebar across it
    shapePart(boxAt(0.2, 0.2, 1.6, 2.0, 2.15, 0), PART.trim, 0x2a2c31),
    shapePart(boxAt(0.14, 0.3, 0.4, 2.2, 1.6, 0), PART.head, 0xfff4d6), // its one lamp
    ...wheelsFor(0.8, 2.6, [-1.3]), // two wheels at the back
    ...wheelsFor(0.8, 0.64, [2.0]), // and at the front two so close together that they are one
  ]),
};

export const sample: TileDef = { id: 'sample', name: 'The sample tile', seed: 7, signs: SIGNS, hidden: true, build };

// the default export is what puts a tile on the board: see ../index.ts
export default sample;
