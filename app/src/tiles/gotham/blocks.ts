// Gotham's ordinary buildings, which stand between the things to find and give
// the city its mass: two more towers on the Crown beside Wayne Tower, rows of
// brick houses between Robinson Park and the Sprang, a warehouse in the
// south-west, and the docks' first row of sheds with their stacks of
// containers. Each stands on a lot of the plan, placed by hand with a height
// of its own, and is drawn here by its kind.
//
// Written by the tile's main session.

import { ordinaryBuildings, type BuildingRules, type Lot as Plot } from '../../engine/buildings';
import { rng, type GeoBuilder } from '../../engine/geo';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { BRICK, BRICK_DARK, BRICK_RED, COPPER, COPPER_DARK, DARK, GOTHIC_WIN, IRON, LEAD, RUST, SLATE, SMALL_WIN, SODIUM, STEEL, STONE, STONE_DARK, STONE_LIGHT, STONE_TRIM, TENEMENT_WIN, gargoyle, gasLamp, waterTank } from './look';
import type { Model, Place } from './models';
import { LOTS, type Lot } from './plan';

/** A band of pale stone round a box, a little proud of it: a cornice, a string course. */
function band(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, h: number, out = 0.25, color = STONE_TRIM): void {
  b.box(x0 - out, y, z0 - out, x1 + out, y + h, z1 + out, color, { faces: 'NESWTB' });
}

/**
 * A tower of Pinkney's kind: a plinth, a shaft that steps back twice with a
 * pale cornice and four gargoyles at each step, tall Gothic windows, and a
 * copper pyramid for a cap with a lamp on it.
 */
const tower: Model = (k, l) => {
  const b = k.b, r = rng(Math.round(l.x0 * 31 + l.z0 * 17 + 7));
  const h = l.top - l.base, cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2;
  // the plinth ends on a whole storey, so that the windows above it line up with every other wall's
  const plinth = Math.ceil((l.base + 2) / 4) * 4;
  b.box(l.x0, l.base, l.z0, l.x1, plinth, l.z1, STONE_DARK, { seed: r() });
  band(b, l.x0, l.z0, l.x1, l.z1, plinth - 0.4, 0.4);
  // three stages, each set back from the one below
  const cap = Math.min(5, h * 0.14), stages = [0.56, 0.3, 0.14], tones = [STONE, STONE_LIGHT, STONE];
  let y = plinth, inset = 0.5;
  const body = l.top - cap - plinth;
  stages.forEach((share, i) => {
    const top = i === stages.length - 1 ? l.top - cap : Math.round((y + body * share) / 4) * 4;
    const x0 = l.x0 + inset, x1 = l.x1 - inset, z0 = l.z0 + inset, z1 = l.z1 - inset;
    b.box(x0, y, z0, x1, top, z1, tones[i], { win: GOTHIC_WIN, seed: r() });
    // ribs at the corners, a hair proud
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) b.box(px - 0.3, y, pz - 0.3, px + 0.3, top + 0.5, pz + 0.3, STONE_DARK, { faces: 'NESWTB' });
    band(b, x0, z0, x1, z1, top - 0.35, 0.35);
    // a gargoyle looking out from each corner of the step
    const g = 0.75 + 0.2 * r();
    gargoyle(b, x1 + 0.1, top, z1 + 0.1, Math.PI / 4, g);
    gargoyle(b, x0 - 0.1, top, z0 - 0.1, (-3 * Math.PI) / 4, g);
    if (i === stages.length - 1) {
      gargoyle(b, x0 - 0.1, top, z1 + 0.1, (3 * Math.PI) / 4, g);
      gargoyle(b, x1 + 0.1, top, z0 - 0.1, -Math.PI / 4, g);
    }
    y = top;
    inset += Math.min(1.0, (l.x1 - l.x0) * 0.12);
  });
  // the cap: a copper pyramid, and a lamp at its point
  const half = Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2 - inset + 0.6;
  b.cyl(cx, cz, y + 0.02, l.top, half * Math.SQRT2, 0.12, 4, r() > 0.5 ? COPPER : COPPER_DARK, { phase: Math.PI / 4 });
  b.cyl(cx, cz, l.top, l.top + 2.2, 0.08, 0.05, 5, STEEL);
  k.glows.push({ x: cx, y: l.top + 2.3, z: cz, sx: 0.3, sy: 0.3, sz: 0.3, color: '#ff4a3a' });
  k.lights.push({ x: l.x1 + 2, z: l.z1 + 2, r: 9, color: SODIUM, k: 0.4 });
};

/**
 * A row of brick houses along the lot's longer side, each a little different:
 * a stoop and a lit door on the side that faces east, a pale cornice, a
 * chimney, a flat roof behind a parapet.
 */
const rowHouses: Model = (k, l) => {
  const b = k.b, r = rng(Math.round(l.x0 * 13 + l.z0 * 29 + 3));
  const alongZ = l.z1 - l.z0 >= l.x1 - l.x0, len = alongZ ? l.z1 - l.z0 : l.x1 - l.x0, n = Math.max(2, Math.round(len / 4.6)), w = len / n;
  const bricks = [BRICK, BRICK_DARK, BRICK_RED, 0x5a4a44, 0x4c4a52];
  for (let i = 0; i < n; i++) {
    // each house: its own height, a storey more or less, and its own brick
    const top = Math.min(l.top, Math.max(l.base + 8, Math.round((l.top - (r() > 0.6 ? 4 : 0)) / 4) * 4)), brick = bricks[Math.floor(r() * bricks.length)];
    const x0 = alongZ ? l.x0 : l.x0 + i * w, x1 = alongZ ? l.x1 : l.x0 + (i + 1) * w, z0 = alongZ ? l.z0 + i * w : l.z0, z1 = alongZ ? l.z0 + (i + 1) * w : l.z1;
    b.box(x0 + 0.04 * (i % 2), l.base, z0 + 0.04 * (i % 2), x1, top, z1, brick, { win: i % 3 === 0 ? TENEMENT_WIN : SMALL_WIN, seed: r(), top: SLATE });
    band(b, x0, z0, x1, z1, top - 0.3, 0.3, 0.15);
    // the parapet's party wall, and a chimney on it
    b.box(x0 + 0.3, top, z0 + 0.3, x0 + 0.9, top + 1.5 + r(), z0 + 1.2, BRICK_DARK, { faces: 'NESWTB' });
    // the stoop and the door, on the east side, or the south where the row runs east and west
    if (alongZ) {
      const mz = (z0 + z1) / 2;
      b.box(x1, l.base, mz - 0.7, x1 + 0.9, l.base + 0.9, mz + 0.7, STONE_LIGHT, { faces: 'NESWTB' });
      b.box(x1 + 0.02, l.base + 0.9, mz - 0.45, x1 + 0.1, l.base + 2.9, mz + 0.45, DARK, { faces: 'ESNT' });
    } else {
      const mx = (x0 + x1) / 2;
      b.box(mx - 0.7, l.base, z1, mx + 0.7, l.base + 0.9, z1 + 0.9, STONE_LIGHT, { faces: 'NESWTB' });
      b.box(mx - 0.45, l.base + 0.9, z1 + 0.02, mx + 0.45, l.base + 2.9, z1 + 0.1, DARK, { faces: 'SEWT' });
    }
  }
  gasLamp(k, alongZ ? l.x1 + 1.3 : (l.x0 + l.x1) / 2, l.base + 3.4, alongZ ? (l.z0 + l.z1) / 2 : l.z1 + 1.3, 3.4);
};

/** A brick warehouse: tall doors, a hoist's beam over them, a monitor along its roof and a water tank on it. */
const warehouse: Model = (k, l) => {
  const b = k.b, r = rng(Math.round(l.x0 * 7 + l.z0 * 11 + 5));
  const cx = (l.x0 + l.x1) / 2, top = l.top - 1.2;
  b.box(l.x0, l.base, l.z0, l.x1, top, l.z1, BRICK_DARK, { win: SMALL_WIN, seed: r(), top: LEAD });
  band(b, l.x0, l.z0, l.x1, l.z1, top - 0.35, 0.35, 0.2);
  // the monitor along the roof, glazed, and lit at night
  b.box(cx - 1.4, top, l.z0 + 1.5, cx + 1.4, l.top, l.z1 - 1.5, STONE_DARK, { win: { cell: 1.6, storey: 1.2, lit: 0.9, kind: 1 }, top: LEAD });
  // two loading doors on the south side, and the hoist over them
  for (const dx of [-0.26, 0.26]) {
    const x = cx + (l.x1 - l.x0) * dx;
    b.box(x - 1.3, l.base, l.z1 + 0.02, x + 1.3, l.base + 3.2, l.z1 + 0.1, DARK, { faces: 'SEWT' });
  }
  b.beam([cx, top - 0.6, l.z1], [cx, top - 0.6, l.z1 + 1.6], 0.14, 0.14, IRON);
  waterTank(b, l.x0 + 1.8, top, l.z0 + 1.8, 0.8);
  gasLamp(k, cx, l.base + 4, l.z1 + 0.3);
};

/** A dock shed: low, long, of rusted sheet, a shallow ridge along its roof, a wide door in its south side. */
const shed: Model = (k, l) => {
  const b = k.b, r = rng(Math.round(l.x0 * 5 + l.z0 * 3 + 1));
  const cz = (l.z0 + l.z1) / 2, eaves = l.top - 1.4, sheet = [0x55606a, 0x6a5a4c, 0x4f5b55][Math.floor(r() * 3)];
  b.box(l.x0, l.base, l.z0, l.x1, eaves, l.z1, sheet, { seed: r() });
  // the roof: two shallow slopes to a ridge that runs east and west
  b.quad([l.x0 - 0.3, eaves, l.z1 + 0.3], [l.x1 + 0.3, eaves, l.z1 + 0.3], [l.x1 + 0.3, l.top, cz], [l.x0 - 0.3, l.top, cz], [0, 0.94, 0.34], RUST);
  b.quad([l.x1 + 0.3, eaves, l.z0 - 0.3], [l.x0 - 0.3, eaves, l.z0 - 0.3], [l.x0 - 0.3, l.top, cz], [l.x1 + 0.3, l.top, cz], [0, 0.94, -0.34], RUST);
  for (const x of [l.x0 - 0.3, l.x1 + 0.3]) b.box(Math.min(x, x + 0.01), eaves, l.z0, Math.max(x, x + 0.01), l.top - 0.05, l.z1, sheet, { faces: x < l.x1 ? 'W' : 'E' });
  const mx = (l.x0 + l.x1) / 2;
  b.box(mx - 2, l.base, l.z1 + 0.02, mx + 2, l.base + 3.2, l.z1 + 0.1, DARK, { faces: 'SEWT' });
  gasLamp(k, mx, l.base + 3.9, l.z1 + 0.3);
};

/** Stacks of containers: steel boxes in a dock's colours, two high here and one there, with lanes between the rows. */
const stacks: Model = (k, l) => {
  const b = k.b, r = rng(Math.round(l.x0 * 3 + l.z0 * 19 + 9));
  const colours = [0x8a3b2e, 0x2f5b6a, 0x6a6a3a, 0x4a4f58, 0x7a5a2c, 0x35604a];
  for (let z = l.z0 + 0.4; z + 2.2 <= l.z1; z += 3.2) {
    for (let x = l.x0 + 0.3; x + 5 <= l.x1; x += 5.6) {
      const high = r() > 0.45 ? 2 : r() > 0.3 ? 1 : 0;
      for (let i = 0; i < high; i++) b.box(x, l.base + i * 2.3, z, x + 5, l.base + i * 2.3 + 2.25, z + 2.2, colours[Math.floor(r() * colours.length)], { faces: 'NESWTB' });
    }
  }
};

export const MODELS: Record<string, Model> = {
  'pinkney-1': tower, 'pinkney-2': tower, 'uptown-1': tower, 'uptown-2': tower, 'uptown-3': tower, 'uptown-4': tower,
  'row-0': rowHouses, 'row-1': rowHouses, 'row-2': rowHouses,
  'warehouse-1': warehouse,
  'shed-2': shed,
};

/** Kept for the docks' builder, who may stand stacks of containers where there is room. */
export { stacks };

/** The ordinary buildings that the plan lays out by rule: Lower Gotham's, Tricorner's and the wharf's. */
const FABRIC: Lot[] = LOTS.filter((l) => l.file === 'fabric');

/** Gotham's styles for them: brick tenements, dark stone with tall windows, brick works with small ones, and sheds of sheet. */
const RULES: BuildingRules = {
  styles: {
    tenement: { palette: [BRICK, BRICK_DARK, BRICK_RED, 0x5a4a44, 0x4c4a52], win: TENEMENT_WIN },
    stone: { palette: [STONE, STONE_DARK, STONE_LIGHT, 0x4a4650], win: GOTHIC_WIN },
    works: { palette: [BRICK_DARK, 0x4a4744, 0x3f4650, 0x54463c], win: SMALL_WIN },
    shed: { palette: [0x55606a, 0x6a5a4c, 0x4f5b55], win: { cell: 0, storey: 1, lit: 0, kind: 0 } },
  },
  roofs: [LEAD, SLATE, 0x3a3d44, 0x45413c],
  hip: () => ({ colors: [SLATE, LEAD], chimneys: true }),
  pool: () => ({ fascia: [], blade: [], billboard: [] }),
  neon: [],
};

export const COVERS: string[] = FABRIC.map((l) => l.id);
export const SIGNS: SignDef[] = [];
export const PLACES: Record<string, Place> = {};

export function extras(k: Build): void {
  ordinaryBuildings(k, FABRIC.map((l, i): Plot => {
    const h = l.top - l.base, tall = l.style === 'stone' && h >= 20;
    return {
      x: l.x0, z: l.z0, w: l.x1 - l.x0, d: l.z1 - l.z0, y0: l.base, y1: tall ? l.top - 4 : l.top,
      style: l.style ?? 'tenement', tint: i,
      roof: l.style === 'shed' ? 'bare' : h > 14 ? 'tank' : 'bare',
      ...(tall ? { crown: { inset: 1.4, h: 4 } } : {}),
      signs: '',
    };
  }), RULES);
}

/** For whoever asks which of the plan's lots are ordinary buildings. */
export const isBlock = (l: Lot): boolean => l.file === 'blocks';
