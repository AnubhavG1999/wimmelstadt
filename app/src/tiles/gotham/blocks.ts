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
import { hipped } from '../../engine/parts';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { BRICK, BRICK_DARK, BRICK_RED, COPPER, COPPER_DARK, DARK, GOTHIC_WIN, IRON, LEAD, OFFICE_WIN, RUST, SLATE, SMALL_WIN, SODIUM, STEEL, STONE, STONE_DARK, STONE_LIGHT, STONE_TRIM, TENEMENT_WIN, gargoyle, gasLamp, waterTank } from './look';
import type { Model, Place } from './models';
import { EL, LOTS, RIVER_ROW, SPRANG_ALONG, Y, avenueY, kaneRamp, lotOf, sprang, type Lot } from './plan';
import { EL_LINE } from './roads';

/** A band of pale stone round a box, a little proud of it: a cornice, a string course. */
function band(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, h: number, out = 0.25, color = STONE_TRIM): void {
  // a hair higher than it is asked to be, so that its top never lies in the plane of the wall's own top
  b.box(x0 - out, y, z0 - out, x1 + out, y + h + 0.06, z1 + out, color, { faces: 'NESWTB' });
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

// ---------------------------------------------------------------------------
// Built over the roads
// ---------------------------------------------------------------------------
//
// The west bank keeps its roads and builds over them, as Chicago does beside
// its river and New York where an avenue runs through a building: the road
// goes on underneath, behind piers, and the city stands on top of it.

/** Where Grand Avenue's middle runs up its ramp. */
const AVENUE_Z = 66.5;

/**
 * One length of the building over Grand Avenue's ramp. The avenue climbs
 * through it behind a row of piers that is open to the south, so that the
 * traffic is seen going up inside; its floors begin at the lot's `base`, which
 * is the street's ceiling, and each length stands a storey higher than the one
 * below it, as the ramp does.
 */
const arcade: Model = (k, l) => {
  const b = k.b, r = rng(Math.round(-l.x0 * 11 + 3));
  // a hair short of the next length, so that their end walls never lie in one plane
  const x0 = l.x0 + 0.06, x1 = l.x1, z0 = l.z0 + 0.6, z1 = l.z1, soffit = l.base, top = l.top;
  const road = (x: number): number => avenueY(x, AVENUE_Z);
  // the floors over the street, on a slab that is the street's ceiling
  b.box(x0, soffit, z0, x1, top, z1, [STONE, STONE_LIGHT, STONE][Math.floor(r() * 3)], { win: GOTHIC_WIN, seed: r(), faces: 'NESWT', top: LEAD });
  b.box(x0 - 0.2, soffit - 0.6, z0 - 0.2, x1 + 0.2, soffit + 0.05, z1 + 0.25, STONE_TRIM, { faces: 'NESWB' });
  band(b, x0, z0, x1, z1, top - 0.4, 0.4, 0.22);
  // piers along the south side, standing on the ramp's sidewalk, each with a head that spreads under the slab
  const bays = Math.max(2, Math.round((x1 - x0) / 5.3)), bay = (x1 - x0) / bays;
  for (let i = 0; i < bays; i++) {
    const px = x0 + i * bay + 0.7;
    b.box(px - 0.65, road(px) - 0.2, z1 - 1.85, px + 0.65, soffit - 0.6, z1 - 0.65, STONE_DARK, { faces: 'NESW' });
    b.box(px - 1.25, soffit - 1.5, z1 - 2.0, px + 1.25, soffit - 0.6, z1 - 0.5, STONE, { faces: 'NESWB' });
    // and on the upper city's side, where the street's ceiling stands clear of the terrace
    if (soffit > Y.upper + 1.5) {
      b.box(px - 0.6, Y.upper, z0 + 0.1, px + 0.6, soffit - 0.6, z0 + 1.2, STONE_DARK, { faces: 'NESW' });
    }
    // a lamp under the ceiling in every bay
    k.glows.push({ x: px + bay / 2, y: soffit - 0.95, z: AVENUE_Z, sx: 0.5, sy: 0.22, sz: 0.5, color: SODIUM });
  }
  k.lights.push({ x: (x0 + x1) / 2, z: AVENUE_Z + 4, r: 11, color: SODIUM, k: 0.5 });
  // the roof: a tank, a stair head, a skylight and chimneys, and a gargoyle at each south corner
  waterTank(b, x0 + 2.2 + r() * 3, top, z0 + 2.4, 0.85);
  b.box(x1 - 4.4, top, z0 + 1.2, x1 - 1.6, top + 2.4, z0 + 3.6, STONE_DARK, { top: LEAD });
  b.box((x0 + x1) / 2 - 2, top, (z0 + z1) / 2 + 1, (x0 + x1) / 2 + 2, top + 0.9, (z0 + z1) / 2 + 4, IRON, { win: { cell: 1, storey: 0.9, lit: 0.9, kind: 1 }, top: 0x7f8c97 });
  for (const cx of [x0 + 5.5, x1 - 6.5]) b.box(cx, top, z1 - 3.2, cx + 1, top + 1.8 + r(), z1 - 2.2, BRICK_DARK, { top: DARK });
  gargoyle(b, x1 - 0.2, top, z1 + 0.1, Math.PI / 4, 0.9);
  gargoyle(b, x0 + 0.2, top, z1 + 0.1, (3 * Math.PI) / 4, 0.9);
};

/**
 * The gatehouse on the bastion, which Grand Avenue turns through: walls on
 * its west, south and north, two portals in its east face with a pier between
 * them that the avenue turns round, and over the road four floors under a
 * steep slate roof with a turret at each corner.
 */
const gateHouse: Model = (k, l) => {
  const b = k.b, r = rng(8401), G = Y.upper, soffit = l.base, eaves = l.top - 8;
  // the base: walls where no road is, and the pier between the two portals
  b.box(l.x0, G, l.z0 + 1, l.x0 + 1, soffit, l.z1 - 1, STONE_DARK, { faces: 'EW' });
  b.box(l.x0, G, l.z1 - 1, l.x1 - 0.06, soffit, l.z1, STONE_DARK, { faces: 'NSEW' });
  b.box(l.x0, G, l.z0, l.x1, soffit, l.z0 + 1, STONE_DARK, { faces: 'NSEW' });
  b.box(l.x1 - 5.4, G, 55.4, l.x1, soffit, 60.6, STONE_DARK, { faces: 'NSEW' });
  // blind arches along the south wall, as pale strips, and lamps in them
  for (let x = l.x0 + 2.6; x < l.x1 - 2; x += 4.2) {
    b.box(x - 1.1, G + 0.8, l.z1, x + 1.1, soffit - 1.6, l.z1 + 0.12, STONE, { faces: 'SEWT' });
    k.glows.push({ x, y: soffit - 2.4, z: l.z1 + 0.3, sx: 0.3, sy: 0.3, sz: 0.2, color: SODIUM });
  }
  // the floors over the road, and the slab that is the road's ceiling
  b.box(l.x0, soffit, l.z0, l.x1, eaves, l.z1, STONE, { win: GOTHIC_WIN, seed: r(), faces: 'NESW' });
  b.box(l.x0 - 0.25, soffit - 0.7, l.z0 - 0.1, l.x1 + 0.25, soffit + 0.05, l.z1 + 0.25, STONE_TRIM, { faces: 'NESWB' });
  band(b, l.x0, l.z0, l.x1, l.z1, eaves - 0.4, 0.4, 0.3);
  // a keystone over each portal, and lamps inside
  for (const z of [49.5, AVENUE_Z]) {
    b.box(l.x1, soffit - 2.2, z - 0.9, l.x1 + 0.3, soffit - 0.7, z + 0.9, STONE_TRIM, { faces: 'NESWB' });
    k.glows.push({ x: l.x1 - 6, y: soffit - 1.1, z, sx: 0.6, sy: 0.25, sz: 0.6, color: SODIUM });
    k.glows.push({ x: l.x0 + 6, y: soffit - 1.1, z, sx: 0.6, sy: 0.25, sz: 0.6, color: SODIUM });
  }
  k.lights.push({ x: l.x0 + 9, z: (l.z0 + l.z1) / 2, r: 14, color: SODIUM, k: 0.55 });
  // the roof, steep and of slate, with a lead flat along its ridge and two chimneys
  hipped(b, l.x0 - 0.3, l.z0 - 0.3, l.x1 + 0.3, l.z1 + 0.3, eaves, l.top - 1.4, 6.6, 7.5, SLATE, LEAD);
  for (const z of [l.z0 + 10, l.z1 - 11]) b.box((l.x0 + l.x1) / 2 - 0.8, l.top - 1.4, z, (l.x0 + l.x1) / 2 + 0.8, l.top + 1.6, z + 1.6, BRICK_DARK, { top: DARK });
  // a turret at each corner, from the terrace to a copper cone, and a gargoyle on the cornice between them
  for (const [cx, cz] of [[l.x0 + 0.9, l.z0 + 0.9], [l.x1 - 0.9, l.z0 + 0.9], [l.x0 + 0.9, l.z1 - 0.9], [l.x1 - 0.9, l.z1 - 0.9]]) {
    b.cyl(cx, cz, G, eaves + 2.6, 1.7, 1.7, 8, STONE_LIGHT, { cap: false });
    b.cyl(cx, cz, eaves + 2.6, eaves + 3, 2.0, 2.0, 8, STONE_TRIM);
    b.cyl(cx, cz, eaves + 3, l.top + 1.2, 1.9, 0.05, 8, COPPER_DARK, { cap: false });
  }
  gargoyle(b, (l.x0 + l.x1) / 2, eaves, l.z1 + 0.2, Math.PI / 2, 1.1);
  gargoyle(b, l.x1 + 0.2, eaves, (l.z0 + l.z1) / 2, 0, 1.1);
};

/**
 * The tower over Kane Street: one of Pinkney's towers on four piers, with the
 * street's ramp running through under it. Its `base` is the street's ceiling.
 */
const gateTower: Model = (k, l) => {
  const b = k.b;
  // the piers stand on the ramp's sidewalks, at the tower's corners, and a slab spans them
  for (const [x0, x1] of [[l.x0, l.x0 + 1.4], [l.x1 - 1.4, l.x1]]) {
    for (const [z0, z1] of [[l.z0, l.z0 + 1.6], [l.z1 - 1.6, l.z1]]) {
      b.box(x0, kaneRamp(z1) - 0.3, z0, x1, l.base - 0.7, z1, STONE_DARK, { faces: 'NESW' });
      b.box(x0 - 0.3, l.base - 1.7, z0 - 0.3, x1 + 0.3, l.base - 0.7, z1 + 0.3, STONE, { faces: 'NESWB' });
    }
  }
  b.box(l.x0 - 0.2, l.base - 0.7, l.z0 - 0.2, l.x1 + 0.2, l.base + 0.05, l.z1 + 0.2, STONE_TRIM, { faces: 'NESWB' });
  for (const z of [l.z0 + 2.6, l.z1 - 2.6]) k.glows.push({ x: (l.x0 + l.x1) / 2, y: l.base - 1.1, z, sx: 0.6, sy: 0.25, sz: 0.6, color: SODIUM });
  k.lights.push({ x: (l.x0 + l.x1) / 2, z: l.z1 + 3, r: 10, color: SODIUM, k: 0.5 });
  tower(k, l);
};

/**
 * The river row: three buildings that stand over the west quay's road, each
 * turned the way the Sprang runs, on piers along the water's edge and along
 * the sidewalk behind, so that the road and its traffic pass underneath in
 * sight of the river. A covered bridge joins each to the next.
 */
function riverRow(k: Build): void {
  const b = k.b, R = RIVER_ROW, yaw = Math.atan2(SPRANG_ALONG[1], SPRANG_ALONG[0]), c = Math.cos(yaw), s = Math.sin(yaw);
  const mid = -(R.d0 + R.d1) / 2, hz = (R.d0 - R.d1) / 2, r = rng(6113);
  const tones = [STONE, STONE_LIGHT, 0x4a4650];
  R.blocks.forEach((blk, i) => {
    const [cx, cz] = sprang((blk.from + blk.to) / 2, mid), hx = (blk.to - blk.from) / 2;
    /** A place in the building's own frame: `lx` along the river, `lz` away from it. */
    const P = (lx: number, lz: number): [number, number] => [cx + lx * c - lz * s, cz + lx * s + lz * c];
    const crowned = blk.top - R.soffit > 30, body = crowned ? blk.top - 12 : blk.top;
    // the floors over the road, the slab under them, and a cornice
    b.obox(cx, (R.soffit + body) / 2, cz, hx, (body - R.soffit) / 2, hz, yaw, tones[i % tones.length], { win: i === 1 ? OFFICE_WIN : GOTHIC_WIN, seed: r(), top: LEAD });
    b.obox(cx, R.soffit - 0.3, cz, hx + 0.2, 0.36, hz + 0.2, yaw, STONE_TRIM, { faces: 'B' });
    b.obox(cx, body - 0.15, cz, hx + 0.22, 0.22, hz + 0.22, yaw, STONE_TRIM);
    if (crowned) {
      // the tall one: a narrower shaft above, a copper cap, and a mast
      b.obox(cx, (body + blk.top - 3) / 2, cz, hx - 2.2, (blk.top - 3 - body) / 2, hz - 2.2, yaw, STONE, { win: GOTHIC_WIN, seed: r(), top: LEAD });
      b.obox(cx, blk.top - 3.1, cz, hx - 2, 0.2, hz - 2, yaw, STONE_TRIM);
      b.cyl(cx, cz, blk.top - 3, blk.top + 1.5, (hz - 2.2) * 1.3, 0.1, 4, COPPER, { phase: yaw + Math.PI / 4, cap: false });
      b.cyl(cx, cz, blk.top + 1.5, blk.top + 4.5, 0.09, 0.05, 5, STEEL);
      k.glows.push({ x: cx, y: blk.top + 4.6, z: cz, sx: 0.3, sy: 0.3, sz: 0.3, color: '#ff4a3a' });
      for (const [lx, lz] of [[hx, hz], [-hx, hz], [hx, -hz], [-hx, -hz]]) { const [gx, gz] = P(lx, lz); gargoyle(b, gx, body, gz, Math.atan2(gz - cz, gx - cx), 1); }
    } else {
      const [tx, tz] = P(hx - 3.2, 1.5), [ux, uz] = P(-hx + 3, -2);
      waterTank(b, tx, body, tz, 0.9);
      b.obox(ux, body + 1.1, uz, 1.6, 1.1, 1.3, yaw, STONE_DARK, { top: LEAD });
    }
    // the piers: a row at the water's edge and a row at the back of the sidewalk, with heads that spread under the slab
    const n = 3;
    for (let j = 0; j <= n; j++) {
      const lx = -hx + 0.8 + ((2 * hx - 1.6) * j) / n;
      for (const lz of [-hz + 0.7, hz - 0.7]) {
        const [px, pz] = P(lx, lz);
        b.obox(px, R.soffit / 2 - 0.9, pz, 0.7, R.soffit / 2 + 0.2, 0.7, yaw, STONE_DARK);
        b.obox(px, R.soffit - 1.3, pz, 1.2, 0.5, 0.9, yaw, STONE, { faces: 'B' });
      }
      // a lamp under the slab between each two piers
      if (j < n) { const [gx, gz] = P(lx + (2 * hx - 1.6) / n / 2, 0); k.glows.push({ x: gx, y: R.soffit - 0.95, z: gz, sx: 0.5, sy: 0.22, sz: 0.5, color: SODIUM }); }
    }
    k.lights.push({ x: cx, z: cz, r: 12, color: SODIUM, k: 0.5 });
    // the elevated railway runs straight through it: a dark way in at each end, framed in pale stone, where the line is
    for (const end of [-1, 1]) {
      const [ex, ez] = P(end * hx, 0);
      let near = EL_LINE[0], best = Infinity;
      for (const q of EL_LINE) { const dq = Math.hypot(q[0] - ex, q[1] - ez); if (dq < best) { best = dq; near = q; } }
      if (best > 4) continue;
      // where the line meets the end wall, a hair outside it
      const lz = -(near[0] - cx) * s + (near[1] - cz) * c, [px, pz] = P(end * (hx + 0.05), lz);
      b.obox(px, EL.y + 1.5, pz, 0.05, 2.5, 1.9, yaw, DARK);
      const [fx, fz] = P(end * (hx + 0.12), lz);
      b.obox(fx, EL.y + 4.2, fz, 0.12, 0.25, 2.3, yaw, STONE_TRIM);
      for (const sd of [-1, 1]) { const [jx, jz] = P(end * (hx + 0.12), lz + sd * 2.1); b.obox(jx, EL.y + 1.5, jz, 0.12, 2.5, 0.22, yaw, STONE_TRIM); }
    }
    // a covered bridge to the next building
    const next = R.blocks[i + 1];
    if (next) {
      const [bx, bz] = sprang((blk.to + next.from) / 2, mid + 2), y = 20;
      b.obox(bx, y + 1.7, bz, (next.from - blk.to) / 2 + 0.6, 1.7, 1.2, yaw, STONE_DARK, { win: GOTHIC_WIN, seed: r(), faces: 'B', top: LEAD });
      k.glows.push({ x: bx, y: y - 0.15, z: bz, sx: 1.2, sy: 0.12, sz: 1.2, color: SODIUM });
    }
  });
}

export const MODELS: Record<string, Model> = {
  'pinkney-1': tower, 'pinkney-2': tower, 'uptown-1': tower, 'uptown-2': tower, 'uptown-3': tower, 'uptown-4': tower,
  'row-0': rowHouses, 'row-1': rowHouses, 'row-2': rowHouses,
  'warehouse-1': warehouse,
  'shed-2': shed,
  'arcade-1': arcade, 'arcade-2': arcade, 'arcade-3': arcade,
  'gate-house': gateHouse,
  'kane-gate': gateTower,
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

/**
 * A covered bridge between two towers that stand side by side, a storey of
 * lit windows over the lane between them: Pinkney's raised walkways, as the
 * Crown has them. It reaches a little way into each tower's wall.
 */
function skybridge(k: Build, west: string, east: string, y: number, z: number): void {
  const a = lotOf(west), b = lotOf(east), x0 = a.x1 - 2, x1 = b.x0 + 2;
  k.b.box(x0, y, z - 1.2, x1, y + 3.4, z + 1.2, STONE_DARK, { win: GOTHIC_WIN, faces: 'NSB', seed: x0 * 0.31 });
  band(k.b, x0, z - 1.2, x1, z + 1.2, y + 3.4, 0.3, 0.14, LEAD);
  band(k.b, x0, z - 1.2, x1, z + 1.2, y - 0.3, 0.3, 0.14, STONE_TRIM);
  k.glows.push({ x: (x0 + x1) / 2, y: y - 0.45, z, sx: x1 - x0 - 3.6, sy: 0.12, sz: 1.4, color: SODIUM });
}

/** A footbridge from River Street's terrace to a tower's door on that level. */
function terraceDoor(k: Build, id: string): void {
  const l = lotOf(id), cx = (l.x0 + l.x1) / 2, wall = -34;
  k.b.box(cx - 1.3, Y.bluff - 0.35, wall - 0.2, cx + 1.3, Y.bluff, l.z0 + 0.7, STONE_LIGHT, { faces: 'EWTB' });
  for (const s of [-1, 1]) k.b.box(cx + s * 1.3 - 0.1, Y.bluff, wall, cx + s * 1.3 + 0.1, Y.bluff + 0.9, l.z0 + 0.5, IRON, { faces: 'NESWT' });
  k.b.box(cx - 0.8, Y.bluff, l.z0 + 0.48, cx + 0.8, Y.bluff + 2.6, l.z0 + 0.62, DARK, { faces: 'NEWT' });
  k.glows.push({ x: cx, y: Y.bluff + 3, z: l.z0 + 0.3, sx: 1.2, sy: 0.2, sz: 0.2, color: SODIUM });
}

export function extras(k: Build): void {
  // the East End's towers: bridges between them, and a door from each onto River Street's terrace
  skybridge(k, 'uptown-1', 'uptown-2', 28, -28.5);
  skybridge(k, 'uptown-2', 'uptown-3', 32, -29.5);
  skybridge(k, 'uptown-2', 'uptown-3', 20, -27);
  skybridge(k, 'uptown-3', 'uptown-4', 24, -28.5);
  skybridge(k, 'uptown-4', 'kane-gate', 32, -29);
  for (const id of ['uptown-1', 'uptown-2', 'uptown-3', 'uptown-4']) terraceDoor(k, id);
  riverRow(k);
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
