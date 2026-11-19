// Builds everything that stands still on the Japan tile: the ground and the
// water, Fuji and the hills, the streets and the pass, and then, each from a
// file of its own, the Wangan, the Shinkansen, the dragon and whatever stands
// on the tile. The shapes come from plan.ts.

import { ordinaryBuildings, type BuildingRules, type Lot as EngineLot } from '../../engine/buildings';
import type { WinSpec } from '../../engine/geo';
import { LAWN, PLAZA, area, flat, ground, oval, rect, water } from '../../engine/ground';
import { buildPath, type Path } from '../../engine/paths';
import { lampsAlong, roadDeck, street } from '../../engine/roads';
import type { SignDef } from '../../engine/signs';
import type { Build, TileParts } from '../../engine/tile';
import { dragon } from './dragon';
import { buildLandmarks } from './landmarks';
import { sample, toSegs, type Piece } from './lines';
import {
  AVENUE, BOARD, DRAGON_ROUND, FUJI, HERO_SPOTS, KEEP_CLEAR, KYOTO, KYOTO_RING, LOOKOUT, LOOKOUT_LOOP, LOOKOUT_YARD, LOTS, MOAT, NAMES, ORDINARY, PARKED,
  PASS, PASS_LINE, POND, ROTARY, ROUTES, SHORE, TOKYO, TOKYO_RING, UENO_PARK, WATER,
  type Lot, type Ordinary, type Style,
} from './plan';
import { buildShinkansen } from './shinkansen';
import { KYOTO_SIGNS, NEON, TOKYO_SIGNS } from './signs';
import { buildFuji, buildHills, groundHeight } from './terrain';
import { buildWangan, inside } from './wangan';

const S2 = Math.SQRT1_2;
/** What the street material is told about a patch of plain ground. */
const PLAIN: WinSpec = { cell: 0, storey: 1, lit: 0, kind: 1 };

/** The boards that name things which are still plain boxes. They go when the things are built. */
export const NAME_BOARDS: SignDef[] = [...LOTS.filter((l) => l.label !== false), ...NAMES].map((l) => {
  const aspect = 0.5 * l.name.length + 0.7;
  return { id: `name-${l.id}`, lines: [l.name], color: '#fffdf2', ink: '#1b1b20', aspect, kind: 'board', size: [Math.round(64 * aspect), 64] };
});

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

  const moat = rect(MOAT.x0, MOAT.z0, MOAT.x1, MOAT.z1), pond = rect(POND.x0, POND.z0, POND.x1, POND.z1);
  ground(k, { holes: [WATER, moat, pond] });
  water(k, WATER);
  water(k, moat, { color: 0x4f8f9f });
  water(k, pond, { color: 0x5f9f8f });

  buildFuji(k);
  buildHills(k, { x0: BOARD.x0, x1: 8, z0: BOARD.z0, z1: -8 });

  // gardens, squares and yards
  flat(k.street, rect(-103.6, -10, -72.2, SHORE.kyoto - 3), 0.02, LAWN, { win: PLAIN, holes: [moat, pond] });
  area(k, rect(-12, -110, 8, -62), PLAZA);
  area(k, rect(SHORE.pier.x0 + 1, SHORE.tokyo + 1, SHORE.pier.x1 - 1, SHORE.pier.z1 - 1), 0x8f8c86);
  area(k, rect(TOKYO.west + 6, TOKYO.south + 8.2, SHORE.arm.x - 1, SHORE.tokyo - 0.6), PLAZA);
  area(k, rect(UENO_PARK.x0, UENO_PARK.z0, UENO_PARK.x1, UENO_PARK.z1), LAWN);

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
  // The pass
  // -------------------------------------------------------------------------

  // a road on a bench of its own, with a wall wherever the ground falls away below it
  roadDeck(k, path(PASS_LINE), PASS.width, { thick: 0.6, wall: 0.55, lanes: 2, lift: 0.06, skirt: 999, step: 1.5 });
  // the lookout at its top: the loop the road turns round in, and a yard that looks out over the tile
  roadDeck(k, path(LOOKOUT_LOOP), 3.3, { thick: 0.6, wall: 0.5, lanes: 1, lift: 0.06, skirt: 999, step: 1 });
  {
    const y = LOOKOUT_YARD, ux = S2 * y.half, uz = -S2 * y.half, ax = S2 * y.deep, az = S2 * y.deep;
    area(k, [[y.x - ux - ax, y.z - uz - az], [y.x + ux - ax, y.z + uz - az], [y.x + ux + ax, y.z + uz + az], [y.x - ux + ax, y.z - uz + az]], 0x5a5c62, PASS.y1);
    area(k, oval(LOOKOUT.x, LOOKOUT.z, 2.6), 0x6fa85a, PASS.y1);
    k.lights.push({ x: y.x, z: y.z, r: 14, color: '#ffe2ae', k: 0.5 });
  }

  // -------------------------------------------------------------------------
  // The Wangan, the Shinkansen and the dragon
  // -------------------------------------------------------------------------

  buildWangan(k);
  buildShinkansen(k);
  // a dragon in the air, about Fuji's summit and out over Kyoto
  dragon(k, { round: DRAGON_ROUND, size: 1.3, speed: 15 });

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
  // What stands on the tile
  // -------------------------------------------------------------------------

  buildLandmarks(k);

  // whatever is still to be built is a plain box, with its name on a board
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

  // -------------------------------------------------------------------------
  // Trees
  // -------------------------------------------------------------------------

  const road = sample(PASS_LINE, 2);
  const nearPass = (x: number, z: number, pad: number): boolean => road.some((p) => Math.hypot(p[0] - x, p[2] - z) < PASS.width + pad);
  const taken = (x: number, z: number, pad = 2): boolean =>
    KEEP_CLEAR.some((r) => x > r.x0 - pad && x < r.x1 + pad && z > r.z0 - pad && z < r.z1 + pad) ||
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
    // Ueno Park: cherry trees along its far sides, so that they do not stand between the scramble and the view
    for (let i = 0; i < 9; i++) {
      k.tree(UENO_PARK.x1 - 2.5, UENO_PARK.z0 + 2.5 + i * 2.9, 0.7 + k.rand() * 0.3);
      if (i > 2) k.tree(UENO_PARK.x0 + 3 + i * 2.6, UENO_PARK.z0 + 2.2, 0.7 + k.rand() * 0.3);
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
    const all = [...streets, avenue];
    const half = (p: Path): number => (p === avenue ? AVENUE.width / 2 : 5);
    for (const p of all) {
      const n = Math.round(p.length / 9);
      for (let i = 0; i < n; i++) {
        const j = Math.min(p.pts.length - 2, Math.floor(k.rand() * p.pts.length)), side = k.rand() < 0.5 ? -1 : 1;
        const at = p.pts[j], on = p.pts[j + 1];
        const tx = on.x - at.x, tz = on.z - at.z, l = Math.hypot(tx, tz) || 1;
        const off = side * (half(p) + 0.9 + k.rand() * 1.5);
        const x = at.x - (tz / l) * off, z = at.z + (tx / l) * off;
        if (taken(x, z, 0.4) || groundHeight(x, z) > 0.3 || inside(WATER, x, z)) continue;
        // not in another street's carriageway
        if (all.some((q) => {
          if (q === p) return false;
          const c = q.pts[Math.min(q.pts.length - 1, Math.round((q.closest(x, z) / q.length) * q.pts.length))];
          return Math.hypot(c.x - x, c.z - z) < half(q) + 0.6;
        })) continue;
        k.person(x, z);
      }
    }
    // at the lookout, in Daikoku's parking area, at the temple and round the scramble's corners
    const y = LOOKOUT_YARD;
    for (let i = 0; i < 6; i++) k.person(y.x + S2 * 5 + (k.rand() - 0.5) * 9 * S2 * 1.2, y.z + S2 * 5 - (k.rand() - 0.5) * 9 * S2 * 1.2, PASS.y1);
    for (let i = 0; i < 22; i++) k.person(61 + k.rand() * 32, 84.5 + k.rand() * 3.4);
    for (let i = 0; i < 26; i++) k.person(-3.9 + k.rand() * 3.8, -91 + k.rand() * 26);
    for (const [cx, cz] of [[51.5, -56.5], [64.5, -56.5], [51.5, -43.5], [64.5, -43.5]]) {
      for (let i = 0; i < 9; i++) k.person(cx + (k.rand() - 0.5) * 3.4, cz + (k.rand() - 0.5) * 3.4);
    }
  }

  return { routes: ROUTES, parked: PARKED, heroSpots: HERO_SPOTS };
}
