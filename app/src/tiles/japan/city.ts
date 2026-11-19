// Builds everything that stands still on the Japan tile: the ground and the
// water, Fuji and the hills, the streets, the Wangan with its two bridges, the
// pass, the Shinkansen's line, and whatever stands on all of that. The shapes
// come from plan.ts.

import { ordinaryBuildings, type BuildingRules, type Lot as EngineLot } from '../../engine/buildings';
import type { WinSpec } from '../../engine/geo';
import { LAWN, PLAZA, area, flat, ground, oval, rect, water, type P2 } from '../../engine/ground';
import { buildPath, type Path } from '../../engine/paths';
import { train } from '../../engine/rail';
import { CONCRETE, lampsAlong, roadDeck, street, type DeckOpts } from '../../engine/roads';
import type { SignDef } from '../../engine/signs';
import type { Build, TileParts } from '../../engine/tile';
import { sample, toSegs, type Piece } from './lines';
import {
  AVENUE, BOARD, DAIKOKU, DAIKOKU_BYPASS, DAIKOKU_RING, FERRIS, FUJI, HERO_SPOTS, KYOTO, KYOTO_HILL, KYOTO_RING, LOOKOUT, LOOKOUT_LOOP, LOOKOUT_YARD,
  LOTS, NAMES, ORDINARY, PARKED, PASS, PASS_LINE, RAIL, RAIL_LOOP, ROTARY, ROUTES, SHORE, TATSUMI_LOOP, TOKYO, TOKYO_RING, TORII, UENO_HILL, WANGAN,
  WANGAN_NORTH, WANGAN_WEST, WATER,
  type Lot, type Ordinary, type Style,
} from './plan';
import { KYOTO_SIGNS, NEON, TOKYO_SIGNS } from './signs';
import { buildFuji, buildHills, groundHeight } from './terrain';

const S2 = Math.SQRT1_2;
/** What the street material is told about a patch of plain ground. */
const PLAIN: WinSpec = { cell: 0, storey: 1, lit: 0, kind: 1 };

/** The boards that name things which are still plain boxes. They go when the things are built. */
export const NAME_BOARDS: SignDef[] = [...LOTS.filter((l) => l.label !== false), ...NAMES].map((l) => {
  const aspect = 0.5 * l.name.length + 0.7;
  return { id: `name-${l.id}`, lines: [l.name], color: '#fffdf2', ink: '#1b1b20', aspect, kind: 'board', size: [Math.round(64 * aspect), 64] };
});

/** Whether a point lies inside a shape. */
function inside(shape: P2[], x: number, z: number): boolean {
  let hit = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const [xi, zi] = shape[i], [xj, zj] = shape[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

/** What Tokyo's and Kyoto's ordinary buildings look like. */
const STYLES: Record<Style, { palette: number[]; win: WinSpec; shops?: boolean; neon?: boolean }> = {
  pencil: { palette: [0xe6e1d6, 0xd9dde4, 0xcfd6dc, 0xe9d9c4, 0xdcd3c8, 0xd8e0d6], win: { cell: 2.6, storey: 5, lit: 0.36, kind: 2 }, shops: true },
  neon: { palette: [0x3d3856, 0x2f3b55, 0x4a3b58, 0x38324e], win: { cell: 3.4, storey: 5, lit: 0.24, kind: 3 }, neon: true },
  office: { palette: [0xdfe6ea, 0xcbd5dc, 0xe9e3d6, 0xd6dde6], win: { cell: 2.8, storey: 5, lit: 0.38, kind: 0 } },
  shop: { palette: [0xe8dcc6, 0xe6c9a4, 0xd8e0d6, 0xdcc8c0, 0xc9d7e0], win: { cell: 3.4, storey: 5, lit: 0.42, kind: 2 }, shops: true },
  machiya: { palette: [0x6b4a3a, 0x5d4033, 0x7a5644, 0x664536], win: { cell: 2.5, storey: 3.6, lit: 0.44, kind: 2 }, shops: true },
};

export function buildJapan(k: Build): TileParts {
  const b = k.b;
  const path = (pieces: Piece[], closed = false): Path => buildPath(toSegs(pieces), closed);
  const line = (x0: number, z0: number, x1: number, z1: number): Path => buildPath([{ t: 'poly', pts: [[x0, z0], [x1, z1]], y: 0, r: 0 }], false);

  // -------------------------------------------------------------------------
  // The ground, the water and the high ground
  // -------------------------------------------------------------------------

  const moat = rect(-102, -8, -73.5, 26), pond = rect(-102, 32, -75, 66);
  ground(k, { holes: [WATER, moat, pond] });
  water(k, WATER);
  water(k, moat, { color: 0x4f8f9f });
  water(k, pond, { color: 0x5f9f8f });

  buildFuji(k);
  buildHills(k, { x0: BOARD.x0, x1: 8, z0: BOARD.z0, z1: -8 });
  buildHills(k, { x0: 74, x1: BOARD.x1, z0: -46, z1: -13 });

  // gardens, squares and yards
  flat(k.street, rect(-103.6, -10, -72.2, SHORE.kyoto - 3), 0.02, LAWN, { win: PLAIN, holes: [moat, pond] });
  area(k, rect(-12, -110, 8, -62), PLAZA);
  area(k, rect(DAIKOKU.x0 + 1, DAIKOKU.z0 + 1, DAIKOKU.x1 - 0.4, DAIKOKU.z1 - 1), 0x5d5f66);
  area(k, rect(SHORE.pier.x0 + 1, SHORE.tokyo + 1, SHORE.pier.x1 - 1, SHORE.pier.z1 - 1), 0x8f8c86);
  area(k, rect(TOKYO.west + 6, TOKYO.south + 8.2, SHORE.arm.x - 1, SHORE.tokyo - 0.6), PLAZA);

  // -------------------------------------------------------------------------
  // Streets on the ground
  // -------------------------------------------------------------------------

  const kyotoRing = path(KYOTO_RING, true), tokyoRing = path(TOKYO_RING, true);
  const kyotoMid = line(KYOTO.west - 0.5, KYOTO.mid, KYOTO.east + 0.5, KYOTO.mid);
  const tokyoMid = line(TOKYO.mid, TOKYO.cross + 4, TOKYO.mid, TOKYO.north - 0.5);
  const tokyoCross = line(TOKYO.mid + 4, TOKYO.cross, TOKYO.west - 0.5, TOKYO.cross);
  const avenue = line(AVENUE.x0 - 0.5, AVENUE.z, AVENUE.x1, AVENUE.z);
  const streets = [kyotoRing, kyotoMid, tokyoRing, tokyoMid, tokyoCross];
  for (const p of streets) street(k, p);
  street(k, avenue, { lanes: 4, width: AVENUE.width });
  for (const p of streets) lampsAlong(k, p, 6.3);
  lampsAlong(k, avenue, AVENUE.width / 2 + 1.3);

  // the island in the rotary, where the Wangan's two lanes turn round
  {
    const x = ROTARY.x - 6.6, z = AVENUE.z;
    b.cyl(x, z, 0.03, 0.5, 3.1, 3.1, 14, 0xcfc8b8);
    b.cyl(x, z, 0.5, 0.62, 2.5, 2.5, 14, 0x6fa85a);
  }

  // -------------------------------------------------------------------------
  // Roads above the ground
  // -------------------------------------------------------------------------

  const deck = (pieces: Piece[], hw: number, o: Partial<DeckOpts> = {}): void =>
    roadDeck(k, path(pieces), hw, { thick: 0.9, wall: 0.9, lanes: 2, lift: 0.05, ...o });

  /** Columns under a road, one every so often, wherever `ok` says one may stand. */
  const piers = (pieces: Piece[], hw: number, every: number, ok: (x: number, z: number) => boolean = () => true, thick = 0.9): void => {
    const pts = sample(pieces, 1);
    let s = 0, next = every / 2;
    for (let i = 1; i + 1 < pts.length; i++) {
      s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]);
      if (s < next) continue;
      const [x, y, z] = pts[i];
      const base = inside(WATER, x, z) ? -1.7 : 0, top = y - thick + 0.05;
      // too low for a column, or something is in the way: try again a little further on
      if (top - base < 2.2 || !ok(x, z)) {
        next = s + 1.5;
        continue;
      }
      next = s + every;
      const across = Math.atan2(pts[i + 1][2] - pts[i - 1][2], pts[i + 1][0] - pts[i - 1][0]) + Math.PI / 2;
      b.obox(x, (top + base) / 2, z, 0.7, (top - base) / 2, 0.7, across, CONCRETE);
      b.obox(x, top - 0.5, z, Math.max(1, hw - 1), 0.5, 0.9, across, CONCRETE, { faces: 'B' });
    }
  };

  /** A string of sodium lamps along both edges of a road. */
  const lamps = (pieces: Piece[], hw: number, every = 9): void => {
    const pts = sample(pieces, 1);
    for (let i = Math.round(every / 2); i + 1 < pts.length; i += every) {
      const tx = pts[i + 1][0] - pts[i - 1][0], tz = pts[i + 1][2] - pts[i - 1][2], l = Math.hypot(tx, tz) || 1;
      for (const side of [-1, 1]) {
        k.glows.push({ x: pts[i][0] - (tz / l) * (hw - 0.22) * side, y: pts[i][1] + 1.35, z: pts[i][2] + (tx / l) * (hw - 0.22) * side, sx: 0.4, sy: 0.4, sz: 0.4, color: '#ffb866' });
      }
    }
  };

  // the pass: a road on a bench of its own, with a wall wherever the ground falls away below it
  roadDeck(k, path(PASS_LINE), PASS.width, { thick: 0.6, wall: 0.55, lanes: 2, lift: 0.06, skirt: 999, step: 1.5 });
  // the lookout at its top: the loop the road turns round in, and a yard that looks out over the tile
  roadDeck(k, path(LOOKOUT_LOOP), 3.3, { thick: 0.6, wall: 0.5, lanes: 1, lift: 0.06, skirt: 999, step: 1 });
  {
    const y = LOOKOUT_YARD, ux = S2 * y.half, uz = -S2 * y.half, ax = S2 * y.deep, az = S2 * y.deep;
    area(k, [[y.x - ux - ax, y.z - uz - az], [y.x + ux - ax, y.z + uz - az], [y.x + ux + ax, y.z + uz + az], [y.x - ux + ax, y.z - uz + az]], 0x5a5c62, PASS.y1);
    area(k, oval(LOOKOUT.x, LOOKOUT.z, 2.6), 0x6fa85a, PASS.y1);
    k.lights.push({ x: y.x, z: y.z, r: 14, color: '#ffe2ae', k: 0.5 });
  }

  // the Wangan: the ramp out of the avenue, round to the first bridge, and down that to Daikoku
  deck(WANGAN_NORTH.slice(1, 2), WANGAN.rampHalf, { skirt: 3.3, step: 1.5 });
  deck(WANGAN_NORTH.slice(2), WANGAN.half);
  lamps(WANGAN_NORTH.slice(1, 2), WANGAN.rampHalf);
  lamps(WANGAN_NORTH.slice(2), WANGAN.half);
  // the ramp's columns keep out of the street that crosses under it; the first bridge hangs from its tower
  piers(WANGAN_NORTH.slice(1, 4), 4, 13, (x, z) => Math.abs(x - TOKYO.mid) > 8 && z < SHORE.arm.z - 2);
  // on Daikoku: down the east side, through the parking area, up the west side
  deck(DAIKOKU_RING, WANGAN.slip, { lanes: 1, skirt: 2.4, step: 1.5, wall: 0.7, thick: 0.7 });
  piers(DAIKOKU_RING, WANGAN.slip, 11, undefined, 0.7);
  deck(DAIKOKU_BYPASS, WANGAN.slip, { lanes: 1, lift: 0.08, wall: 0.7, thick: 0.7 });
  piers(DAIKOKU_BYPASS, WANGAN.slip, 12, undefined, 0.7);
  lamps(DAIKOKU_RING, WANGAN.slip, 11);
  lamps(DAIKOKU_BYPASS, WANGAN.slip, 11);
  // the Bay Bridge, and the loop at Tatsumi
  deck(WANGAN_WEST, WANGAN.half);
  deck(TATSUMI_LOOP, WANGAN.slip, { lanes: 1, wall: 0.7, thick: 0.7 });
  piers(TATSUMI_LOOP, WANGAN.slip, 9, undefined, 0.7);
  piers(WANGAN_WEST.slice(1), 5, 8, (x) => x < SHORE.pier.x1 - 1);
  lamps(WANGAN_WEST, WANGAN.half);
  lamps(TATSUMI_LOOP, WANGAN.slip, 7);

  // The two bridges are cable-stayed: the deck hangs from towers by a fan of cables.
  const WHITE = 0xf1eee6;
  /** How high a line of pieces is where it passes nearest to a point. */
  const heightOn = (pieces: Piece[]): ((x: number, z: number) => number) => {
    const pts = sample(pieces, 1);
    return (x, z) => pts.reduce((best, p) => (Math.hypot(p[0] - x, p[2] - z) < Math.hypot(best[0] - x, best[2] - z) ? p : best))[1];
  };
  {
    // the Bay Bridge: two towers, each a pair of legs with the road between them
    const y = heightOn(WANGAN_WEST), z = 72, top = 46, out = WANGAN.half + 2.3;
    for (const x of [13, 37]) {
      for (const side of [-1, 1]) {
        const lz = z + side * out;
        b.box(x - 1.1, -1.7, lz - 1.1, x + 1.1, top, lz + 1.1, WHITE);
        // a fan of cables to the edge of the deck, to either side of the leg
        for (const way of [-1, 1]) {
          for (let n = 1; n <= 3; n++) {
            const dx = way * n * 3.7;
            b.beam([x, top - 1.5 - n * 2.6, lz - side * 0.9], [x + dx, y(x + dx, z) + 0.9, z + side * (WANGAN.half - 0.2)], 0.14, 0.14, WHITE);
          }
        }
        k.glows.push({ x, y: top + 0.6, z: lz, sx: 0.7, sy: 0.7, sz: 0.7, color: '#ff3b3b' });
      }
      b.box(x - 0.9, y(x, z) - 3, z - out, x + 0.9, y(x, z) - 1.2, z + out, WHITE, { faces: 'NESWTB' });
      b.box(x - 0.9, top - 5, z - out, x + 0.9, top - 3, z + out, WHITE, { faces: 'NESWTB' });
      k.lights.push({ x, z, r: 16, color: '#dfeaff', k: 0.5 });
    }
  }
  {
    // the first bridge: one tower astride the road, its legs meeting at the top
    const y = heightOn(WANGAN_NORTH), x = 96, z = (SHORE.arm.z + DAIKOKU.z0) / 2 - 1, top = 42, out = WANGAN.half + 2.6;
    for (const side of [-1, 1]) {
      b.beam([x + side * out, -1.7, z], [x + side * 0.7, top - 6, z], 1.1, 0.8, WHITE);
      for (const way of [-1, 1]) {
        for (let n = 1; n <= 3; n++) {
          const dz = way * n * 4.2;
          b.beam([x + side * 0.5, top - 3 - n * 2.4, z], [x + side * (WANGAN.half - 0.2), y(x, z + dz) + 0.9, z + dz], 0.14, 0.14, WHITE);
        }
      }
    }
    b.box(x - 1, top - 7, z - 1, x + 1, top, z + 1, WHITE);
    b.box(x - out, y(x, z) - 3, z - 0.9, x + out, y(x, z) - 1.2, z + 0.9, WHITE, { faces: 'NESWTB' });
    k.glows.push({ x, y: top + 0.6, z, sx: 0.7, sy: 0.7, sz: 0.7, color: '#ff3b3b' });
    k.lights.push({ x, z, r: 16, color: '#dfeaff', k: 0.5 });
  }

  // -------------------------------------------------------------------------
  // The Shinkansen
  // -------------------------------------------------------------------------

  {
    const r = RAIL, slab = r.y - 0.14;
    // the viaduct: a slab with a low wall along each edge, on columns that keep out of the roads below
    b.box(r.west, slab - 1.4, r.z - r.half, r.east, slab, r.z + r.half, CONCRETE, { faces: 'NSTB' });
    for (const side of [-1, 1]) {
      const z = r.z + side * (r.half - 0.25);
      b.box(r.west, slab, z - 0.25, r.east, slab + 1.3, z + 0.25, 0xd9d5cb);
      // two rails for each track
      for (const g of [-0.78, 0.78]) {
        const rz = r.z + side * r.off + g;
        b.box(r.west - 1, slab, rz - 0.09, r.east + 1, slab + 0.24, rz + 0.09, 0x9aa0a8, { faces: 'NST' });
      }
    }
    for (const x of [-66, -55, -45, -8, 3, 25, 36, 47, 68]) {
      b.box(x - 0.9, 0, r.z - 1.6, x + 0.9, slab - 1.4, r.z + 1.6, CONCRETE);
      b.box(x - 1.1, slab - 2.3, r.z - r.half + 0.6, x + 1.1, slab - 1.4, r.z + r.half - 0.6, CONCRETE, { faces: 'NESWB' });
    }
    // the mouth of the tunnel at each end: a wall against the hill, with a dark opening
    for (const [x, way, hill] of [[r.west, -1, KYOTO_HILL.y], [r.east, 1, UENO_HILL.y]]) {
      b.box(Math.min(x, x + way * 2.4), 0, r.z - r.half - 4, Math.max(x, x + way * 2.4), hill + 0.6, r.z + r.half + 4, 0xb9b4a8);
      const face = x - way * 0.06;
      b.box(Math.min(face, x), slab, r.z - r.half + 0.5, Math.max(face, x), slab + 5.6, r.z + r.half - 0.5, 0x15161a, { faces: way < 0 ? 'E' : 'W' });
    }
    const loop = path(RAIL_LOOP, true);
    const stops = [[-58, -r.off], [36, -r.off], [36, r.off], [-58, r.off]].map(([x, off]) => loop.closest(x, r.z + off));
    for (const from of [0, loop.length / 2]) {
      train(k, loop, { cars: 4, speed: 36, stops, from, dwell: 5, body: 0xf4f6f8, stripe: 0x2a56b8 });
    }
  }

  // -------------------------------------------------------------------------
  // Ordinary buildings
  // -------------------------------------------------------------------------

  {
    type Sited = EngineLot & { kyoto: boolean };
    const rules: BuildingRules<Sited> = {
      styles: STYLES,
      roofs: [0x8d8a83, 0x7b7a7e, 0x9d988f, 0x6f7378],
      // dark grey tiles, as on a townhouse
      hip: () => ({ colors: [0x3d4a4f, 0x454f54, 0x37424a] }),
      pool: (lot) => (lot.kyoto ? KYOTO_SIGNS : TOKYO_SIGNS),
      neon: NEON,
    };
    const lots = ORDINARY.map((o: Ordinary, i): Sited => ({
      x: o.x, z: o.z, w: o.w, d: o.d, y0: 0, y1: o.top, style: o.style, tint: i * 7 + 3,
      roof: o.roof ?? (o.top > 30 ? 'units' : o.top > 18 ? 'tank' : 'bare'), signs: o.signs, kyoto: o.kyoto === true,
    }));
    ordinaryBuildings(k, lots, rules);
  }

  // -------------------------------------------------------------------------
  // What stands on the tile. Each is a plain box for now, with its name on a board.
  // -------------------------------------------------------------------------

  const WINDOWS: Record<number, WinSpec> = {
    0x3d3856: { cell: 3.4, storey: 5, lit: 0.3, kind: 3 },
    0x8fb4cf: { cell: 2.4, storey: 5, lit: 0.44, kind: 1 },
    0xe9e3d6: { cell: 3, storey: 5, lit: 0.34, kind: 0 },
    0xa8553f: { cell: 2.6, storey: 4.3, lit: 0.4, kind: 0 },
  };
  const board = (id: string, x: number, y: number, z: number, h = 3.4): void => {
    // it faces the south-east, where the view first looks from
    k.sign(`name-${id}`, x, y, z, S2, S2, h);
  };
  const box = (l: Lot): void => {
    const y0 = l.y ?? 0;
    b.box(l.x, y0, l.z, l.x + l.w, y0 + l.h, l.z + l.d, l.color, { win: WINDOWS[l.color], seed: (Math.abs(l.x * 0.37 + l.z * 0.11)) % 1 });
    if (l.label !== false) board(l.id, l.x + l.w / 2, y0 + l.h + 3, l.z + l.d / 2);
  };
  LOTS.forEach(box);
  for (const n of NAMES) board(n.id, n.x, n.y, n.z, 3.8);

  // Kyoto Station's roof spans the tracks, and Tokyo Station's platforms stand on the viaduct
  b.box(-70, 18, -40, -46, 19.4, -21.2, 0xcfd6dc);
  b.box(19, RAIL.y + 4.2, RAIL.z - RAIL.half - 0.4, 53, RAIL.y + 4.7, RAIL.z + RAIL.half + 0.4, 0xe9e3d6);
  // Tokyo Tower: its shape alone, for how it stands against the rest
  b.cyl(36, -80, 0, 112, 15 * Math.SQRT2, 1, 4, 0xe2532f, { phase: Math.PI / 4, cap: false });
  // Kyoto Tower, on its block
  b.cyl(-50.5, -3, 16, 58, 2.3, 1.5, 10, 0xf1eee6, { cap: false });
  b.cyl(-50.5, -3, 43, 48, 4.2, 4.2, 12, 0xe2532f);
  // the castle's stone base, in its moat
  b.cyl(-88, 9, -1.5, 7, 9.6 * Math.SQRT2, 7.6 * Math.SQRT2, 4, 0x9a968c, { phase: Math.PI / 4 });
  // the great torii, standing in the water
  {
    const x = TORII.x, z = TORII.z, RED = 0xd8432b;
    for (const s of [-1, 1]) b.cyl(x + s * 6.6, z, -1.5, 13, 0.75, 0.6, 8, RED);
    b.box(x - 9.6, 12.6, z - 0.6, x + 9.6, 13.9, z + 0.6, RED, { faces: 'NESWTB' });
    b.box(x - 8, 9.6, z - 0.4, x + 8, 10.6, z + 0.4, RED, { faces: 'NESWTB' });
  }
  // the red bridge over the river
  b.box(SHORE.river.west - 1, 0.6, 28.4, SHORE.river.east + 1, 1.3, 31.6, 0xd8432b, { faces: 'NESWTB' });
  // Fushimi Inari: a line of gates up the side of the hill
  for (let i = 0; i < 13; i++) {
    const x = -75 - i * 1.7, z = -6 - i * 1.25, y = groundHeight(x, z), RED = 0xe0562d;
    for (const s of [-1, 1]) b.box(x - 0.2, y - 0.5, z + s * 1.5 - 0.2, x + 0.2, y + 3.4, z + s * 1.5 + 0.2, RED);
    b.box(x - 0.25, y + 3.4, z - 2.1, x + 0.25, y + 3.9, z + 2.1, RED, { faces: 'NESWTB' });
  }
  // the Ferris wheel: a rim, spokes and two legs
  {
    const f = FERRIS, n = 20, STEEL = 0xf2f0ea;
    const at = (i: number, r = f.r): [number, number, number] => [f.x + Math.cos((i / n) * Math.PI * 2) * r, f.y + Math.sin((i / n) * Math.PI * 2) * r, f.z];
    for (let i = 0; i < n; i++) {
      b.beam(at(i), at(i + 1), 0.3, 0.3, STEEL);
      if (i % 2 === 0) b.beam([f.x, f.y, f.z], at(i), 0.14, 0.14, STEEL);
      const [x, y, z] = at(i);
      b.box(x - 0.8, y - 1.5, z - 0.8, x + 0.8, y - 0.2, z + 0.8, [0xe8523f, 0xf2c14e, 0x4fa3d8, 0x6fbf73][i % 4]);
    }
    for (const s of [-1, 1]) for (const dz of [-1.6, 1.6]) b.beam([f.x + s * 7, 0, f.z + dz], [f.x, f.y, f.z + dz * 0.6], 0.45, 0.35, STEEL);
    b.cyl(f.x, f.z, f.y - 1, f.y + 1, 1.2, 1.2, 8, 0xd9dde4);
    k.lights.push({ x: f.x, z: f.z + 4, r: 18, color: '#ffd9f0', k: 0.5 });
  }

  // -------------------------------------------------------------------------
  // Trees
  // -------------------------------------------------------------------------

  const road = sample(PASS_LINE, 2);
  const nearPass = (x: number, z: number, pad: number): boolean => road.some((p) => Math.hypot(p[0] - x, p[2] - z) < PASS.width + pad);
  const taken = (x: number, z: number, pad = 2): boolean =>
    LOTS.some((l) => x > l.x - pad && x < l.x + l.w + pad && z > l.z - pad && z < l.z + l.d + pad) ||
    ORDINARY.some((l) => x > l.x - pad && x < l.x + l.w + pad && z > l.z - pad && z < l.z + l.d + pad);
  {
    let planted = 0;
    for (let i = 0; i < 2600 && planted < 150; i++) {
      const x = BOARD.x0 + 2 + k.rand() * 118, z = BOARD.z0 + 2 + k.rand() * 104;
      const y = groundHeight(x, z);
      if (y < 0.8 || y > 21) continue;
      // not on a bank, not on the road, not where something stands
      const lean = Math.max(Math.abs(groundHeight(x + 1.5, z) - y), Math.abs(groundHeight(x, z + 1.5) - y));
      if (lean > 0.9 || nearPass(x, z, 2.2) || taken(x, z)) continue;
      if (Math.hypot(x - LOOKOUT.x, z - LOOKOUT.z) < LOOKOUT.r + 1) continue;
      const onFuji = Math.hypot(x - FUJI.x, z - FUJI.z) < FUJI.r - 2 && y < 9;
      k.tree(x, z, 0.75 + k.rand() * 0.5, onFuji, y - 0.2);
      planted++;
    }
    // Ueno hill: a park on its top
    for (let i = 0; i < 16; i++) {
      // (none at its western end, which would stand between the scramble and the view)
      const x = UENO_HILL.x0 + 11 + k.rand() * (UENO_HILL.x1 - UENO_HILL.x0 - 13), z = UENO_HILL.z0 + 8 + k.rand() * (UENO_HILL.z1 - UENO_HILL.z0 - 16);
      k.tree(x, z, 0.8 + k.rand() * 0.4, false, groundHeight(x, z) - 0.2);
    }
    // cherry trees along the river, and trees in the castle's and the pavilion's grounds
    for (let z = SHORE.river.head + 6; z < SHORE.kyoto - 4; z += 9) {
      k.tree(SHORE.river.west - 1.4, z, 0.6);
      k.tree(SHORE.river.east + 1.6, z + 4.5, 0.6);
    }
    for (const [x, z] of [[-78, 29], [-99, 29], [-100, 70], [-88, 70.5], [-76, 70], [-73.3, 48]]) k.tree(x, z, 0.8);
  }

  // -------------------------------------------------------------------------
  // People: still figures, as on a model railway
  // -------------------------------------------------------------------------

  {
    // along the sidewalks of every street
    for (const p of [...streets, avenue]) {
      const half = p === avenue ? AVENUE.width / 2 : 5;
      const n = Math.round(p.length / 9);
      for (let i = 0; i < n; i++) {
        const s = k.rand() * p.length, side = k.rand() < 0.5 ? -1 : 1;
        const at = p.pts[Math.min(p.pts.length - 1, Math.floor((s / p.length) * p.pts.length))], on = p.pts[Math.min(p.pts.length - 1, Math.floor((s / p.length) * p.pts.length) + 1)];
        const tx = on.x - at.x, tz = on.z - at.z, l = Math.hypot(tx, tz) || 1;
        const off = side * (half + 0.9 + k.rand() * 1.5);
        const x = at.x - (tz / l) * off, z = at.z + (tx / l) * off;
        if (taken(x, z, 0.4) || groundHeight(x, z) > 0.3 || inside(WATER, x, z)) continue;
        // not in another street's carriageway
        if ([...streets, avenue].some((q) => {
          if (q === p) return false;
          const c = q.pts[Math.min(q.pts.length - 1, Math.round(q.closest(x, z) / q.length * q.pts.length))];
          return Math.hypot(c.x - x, c.z - z) < (q === avenue ? AVENUE.width / 2 : 5) + 0.6;
        })) continue;
        k.person(x, z);
      }
    }
    // at the lookout, in Daikoku's parking area, at the temple and round the scramble's corners
    const y = LOOKOUT_YARD;
    for (let i = 0; i < 6; i++) k.person(y.x + S2 * 5 + (k.rand() - 0.5) * 9 * S2 * 1.2, y.z + S2 * 5 - (k.rand() - 0.5) * 9 * S2 * 1.2, PASS.y1);
    for (let i = 0; i < 22; i++) k.person(61 + k.rand() * 32, 84.5 + k.rand() * 3.4);
    for (let i = 0; i < 22; i++) k.person(-4.6 + k.rand() * 4.4, -104 + k.rand() * 40);
    for (const [cx, cz] of [[51.5, -56.5], [64.5, -56.5], [51.5, -43.5], [64.5, -43.5]]) {
      for (let i = 0; i < 9; i++) k.person(cx + (k.rand() - 0.5) * 3.4, cz + (k.rand() - 0.5) * 3.4);
    }
  }

  return { routes: ROUTES, parked: PARKED, heroSpots: HERO_SPOTS };
}
