// The Illini Union: the tile's centrepiece, at the head of the Quad.
//
// Red brick with white trim under slate, in the manner of colonial
// Williamsburg. In plan it is a capital I: a long block on Green Street, a
// long block on the Quad, and a link between them. Each block carries a clock
// tower with a bronze weathervane: the one over Green Street is open, with a
// bell in it, and the one over the Quad is glazed. The Green Street front has a
// porch with columns. The Quad front has none: it has a terrace, with small
// tables under blue umbrellas.

import { interior } from '../../engine/geo';
import { lantern, lathe, parasol, roundel } from '../../engine/parts';
import { gable, hip } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { BASE, BRICK, BRONZE, DARK, GLASS, HALL, IRON, LIMESTONE, SLATE, STOREY, TRIM, VERDIGRIS, chimney, column, dormer, steps, weathervane } from './look';
import type { LotDef, Model } from './plan';

/** How deep each of the two long blocks is, and half the width of the link between them. */
const BLOCK = 6, LINK = 4.5;
/** Its walls are three storeys, with a white cornice on them, and the roof rises from there. */
const WALL = 3 * STOREY, EAVE = WALL + 0.4, RISE = 3.3;
/** The blue of the umbrellas on the terrace. */
const UMBRELLA = 0x2f66b3;
/** How high the terrace stands, and how far it reaches out from the Quad front. */
export const TERRACE = { y: 0.6, deep: 4 };

/** Its name, as plain lettering on a plain board: on the band over the porch, and over the bays on the Quad. */
export const SIGNS: SignDef[] = [
  { id: 'union', lines: ['ILLINI UNION'], color: '#f3f0e7', ink: '#13294b', aspect: 7.2, kind: 'board', real: true },
];

function union(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, cx = (x0 + x1) / 2;
  const wall = { win: HALL, seed: 0.31 };

  /** One of the two long blocks: its walls, its base and cornice, its roof, its chimneys. */
  const block = (za: number, zb: number): void => {
    b.box(x0, 0, za, x1, WALL, zb, BRICK.red, { ...wall, faces: 'NESW' });
    b.box(x0 - 0.1, 0, za - 0.1, x1 + 0.1, 0.7, zb + 0.1, BASE, { faces: 'NESWT' });
    // a white band at the foot of the second storey, and the cornice
    b.box(x0 - 0.07, STOREY - 0.1, za - 0.07, x1 + 0.07, STOREY + 0.1, zb + 0.07, TRIM, { faces: 'NESWTB' });
    b.box(x0 - 0.28, WALL, za - 0.28, x1 + 0.28, EAVE, zb + 0.28, TRIM, { faces: 'NESWB' });
    hip(b, x0, za, x1, zb, EAVE, RISE, SLATE, 0.5);
    const zc = (za + zb) / 2;
    for (const x of [x0 + 3.9, x1 - 3.9]) chimney(b, x, zc, EAVE + RISE - 0.9, EAVE + RISE + 1.5, BRICK.deep);
  };
  block(z0, z0 + BLOCK);
  block(z1 - BLOCK, z1);

  // the link between them, a little lower, its roof running into theirs
  b.box(cx - LINK, 0, z0 + BLOCK, cx + LINK, WALL, z1 - BLOCK, BRICK.red, { ...wall, faces: 'EW' });
  b.box(cx - LINK - 0.1, 0, z0 + BLOCK, cx + LINK + 0.1, 0.7, z1 - BLOCK, BASE, { faces: 'EWT' });
  b.box(cx - LINK - 0.25, WALL, z0 + BLOCK, cx + LINK + 0.25, EAVE, z1 - BLOCK, TRIM, { faces: 'EWB' });
  gable(b, cx - LINK, z0 + BLOCK - 2, cx + LINK, z1 - BLOCK + 2, EAVE, RISE - 0.5, SLATE, BRICK.red, 'z', 0.4);

  // -------------------------------------------------------------------------
  // The Green Street front: a pavilion under a pediment, and a porch of four columns
  // -------------------------------------------------------------------------
  {
    const half = 3.6, out = z0 - 0.5;
    b.box(cx - half, 0, out, cx + half, EAVE + 0.2, z0 + 0.3, BRICK.red, { ...wall, faces: 'NEW' });
    gable(b, cx - half, out, cx + half, z0 + 3.2, EAVE + 0.2, 1.9, SLATE, TRIM, 'z', 0.35);
    roundel(b, [cx, EAVE + 0.95, out - 0.03], 0.42, 'N', GLASS, { win: interior(0.8) });
    // the porch: steps, a floor, four columns, and a flat white roof with a rail on it
    const floor = 0.55, deep = 1.7, top = 6.2;
    b.box(cx - half - 0.3, 0, out - deep, cx + half + 0.3, floor, out, LIMESTONE);
    steps(b, cx - half - 0.3, cx + half + 0.3, out - deep, floor, 'N', LIMESTONE, 0.42);
    for (const x of [cx - 3.1, cx - 1.05, cx + 1.05, cx + 3.1]) column(b, x, out - deep + 0.45, floor, top, 0.32);
    b.box(cx - half - 0.3, top, out - deep, cx + half + 0.3, top + 0.9, out, TRIM, { faces: 'NEWTB' });
    b.box(cx - half - 0.1, top + 0.9, out - deep + 0.15, cx + half + 0.1, top + 1.4, out - deep + 0.3, TRIM);
    // its name, on the white band over the columns
    k.sign('union', cx, top + 0.45, out - deep - 0.03, 0, -1, 0.62, 2 * half);
    // three doors behind the columns, lit from within
    for (const x of [cx - 2.05, cx, cx + 2.05]) b.box(x - 0.6, floor, out - 0.06, x + 0.6, floor + 2.5, out, DARK, { faces: 'N', win: interior(1.4) });
    k.glows.push({ x: cx, y: top - 0.3, z: out - deep / 2, sx: 4.6, sy: 0.14, sz: 0.3, color: '#ffe2ae' });
    k.lights.push({ x: cx, z: out - deep - 2, r: 11, color: '#ffe2ae', k: 0.6 });
  }

  // -------------------------------------------------------------------------
  // The Quad front: a pavilion with three tall bays of glass, and the terrace
  // -------------------------------------------------------------------------
  {
    const half = 4.3, out = z1 + 0.5;
    // (its wall is plain brick: the bays stand before two storeys of it, and the name is on the third)
    b.box(cx - half, 0, z1 - 0.3, cx + half, EAVE + 0.2, out, BRICK.red, { faces: 'SEW' });
    gable(b, cx - half, z1 - 3.2, cx + half, out, EAVE + 0.2, 2.1, SLATE, TRIM, 'z', 0.35);
    roundel(b, [cx, EAVE + 1.0, out + 0.03], 0.45, 'S', GLASS, { win: interior(0.8) });
    k.sign('union', cx, 2 * STOREY + 1.95, out + 0.03, 0, 1, 0.95, 2 * half - 1);
    // the bays: glass from the terrace to the top of the second storey, in white frames
    for (const x of [cx - 2.75, cx, cx + 2.75]) {
      b.box(x - 1.05, TERRACE.y, out, x + 1.05, 2 * STOREY + 1.1, out + 0.45, TRIM, { faces: 'SEWT' });
      b.box(x - 0.85, TERRACE.y + 0.25, out + 0.45, x + 0.85, 2 * STOREY + 0.8, out + 0.5, GLASS, { faces: 'S', win: interior(1.05) });
      // a bar across each, where the second storey's floor is
      b.box(x - 0.85, STOREY + 0.5, out + 0.5, x + 0.85, STOREY + 0.68, out + 0.54, TRIM, { faces: 'STB' });
      b.box(x - 0.06, TERRACE.y + 0.25, out + 0.5, x + 0.06, 2 * STOREY + 0.8, out + 0.54, TRIM, { faces: 'SEW' });
    }
    k.lights.push({ x: cx, z: out + 4, r: 13, color: '#ffe9c4', k: 0.7 });
    k.lights.push({ x: cx - 7, z: out + 2.5, r: 8, color: '#ffe2ae', k: 0.4 });
    k.lights.push({ x: cx + 7, z: out + 2.5, r: 8, color: '#ffe2ae', k: 0.4 });
  }
  {
    // the terrace: a floor of stone as wide as the building, a low wall round it, and steps down to the Quad in the middle
    const t = TERRACE, zs = z1 + t.deep, gap = 3.6;
    b.box(x0, 0, z1, x1, t.y, zs, LIMESTONE, { faces: 'ESWT' });
    for (const [a, c] of [[x0, cx - gap], [cx + gap, x1]]) b.box(a, t.y, zs - 0.22, c, t.y + 0.5, zs, TRIM);
    for (const x of [x0, x1 - 0.22]) b.box(x, t.y, z1 + 0.3, x + 0.22, t.y + 0.5, zs - 0.22, TRIM);
    steps(b, cx - gap, cx + gap, zs, t.y, 'S', LIMESTONE, 0.5);
    // a lamp at each corner, and one either side of the steps
    for (const x of [x0 + 0.5, cx - gap - 0.5, cx + gap + 0.5, x1 - 0.5]) lantern(k, x, zs - 0.6, t.y, 2.3, IRON);
    // small tables under blue umbrellas, two at each end of the terrace, and people at them
    const tables: [number, number, number][] = [
      [x0 + 1.55, z1 + 1.5, 1], [x0 + 4.3, z1 + 2.45, -1],
      [x1 - 1.55, z1 + 1.5, -1], [x1 - 4.3, z1 + 2.45, 1],
    ];
    for (const [x, z, s] of tables) {
      parasol(b, x, z, UMBRELLA, t.y);
      k.person(x + s * 0.95, z + 0.15, t.y);
      k.person(x - s * 0.35, z - 0.9, t.y);
    }
    // and two on their way down the steps
    k.person(cx - 1.6, zs + 0.25, t.y - 0.2);
    k.person(cx + 2.2, zs - 0.9, t.y);
  }

  // -------------------------------------------------------------------------
  // Dormers on the two fronts, and at the ends
  // -------------------------------------------------------------------------
  {
    // a dormer's sill sits on the slope, a little way up from the eaves
    const up = 1.45, sill = EAVE + ((up + 0.5) * RISE) / (BLOCK / 2 + 0.5) - 0.15;
    for (const x of [x0 + 1.9, x0 + 4.3, x0 + 6.7, x1 - 6.7, x1 - 4.3, x1 - 1.9]) {
      // (none where a pavilion's own roof comes through)
      if (Math.abs(x - cx) < 4.6) continue;
      dormer(b, x, z0 + up, sill, 'N', SLATE);
      dormer(b, x, z1 - up, sill, 'S', SLATE);
    }
    for (const zc of [z0 + BLOCK / 2, z1 - BLOCK / 2]) {
      dormer(b, x0 + up, zc, sill, 'W', SLATE);
      dormer(b, x1 - up, zc, sill, 'E', SLATE);
    }
  }

  // -------------------------------------------------------------------------
  // The two clock towers
  // -------------------------------------------------------------------------

  /** A tower on a block's ridge: a white base with a clock on each side, a lantern of eight sides, a cap and a weathervane. */
  const tower = (cz: number, open: boolean): void => {
    const ridge = EAVE + RISE, h = 1.3;
    // the base, which comes up through the roof
    b.box(cx - h, ridge - 1.3, cz - h, cx + h, ridge + 2.1, cz + h, TRIM);
    b.box(cx - h - 0.15, ridge + 2.1, cz - h - 0.15, cx + h + 0.15, ridge + 2.35, cz + h + 0.15, TRIM, { faces: 'NESWTB' });
    const cy = ridge + 1.15;
    for (const [f, dx, dz] of [['N', 0, -1], ['S', 0, 1], ['E', 1, 0], ['W', -1, 0]] as const) {
      roundel(b, [cx + dx * (h + 0.03), cy, cz + dz * (h + 0.03)], 0.78, f, 0x23262c);
      roundel(b, [cx + dx * (h + 0.06), cy, cz + dz * (h + 0.06)], 0.66, f, 0xf6efd9, { win: interior(1.5) });
      // its hands, at ten to two
      const along: [number, number] = dz !== 0 ? [1, 0] : [0, 1];
      const px = cx + dx * (h + 0.09), pz = cz + dz * (h + 0.09);
      b.box(px - along[0] * 0.05 - Math.abs(dx) * 0.01, cy - 0.04, pz - along[1] * 0.05 - Math.abs(dz) * 0.01, px + along[0] * 0.42 + Math.abs(dx) * 0.01, cy + 0.06, pz + along[1] * 0.42 + Math.abs(dz) * 0.01, 0x23262c, { faces: 'NESWTB' });
      b.box(px - along[0] * 0.05 - Math.abs(dx) * 0.01, cy - 0.04, pz - along[1] * 0.05 - Math.abs(dz) * 0.01, px + along[0] * 0.06 + Math.abs(dx) * 0.01, cy + 0.5, pz + along[1] * 0.06 + Math.abs(dz) * 0.01, 0x23262c, { faces: 'NESWTB' });
    }
    // the lantern
    const y0 = ridge + 2.35, y1 = y0 + 2.15, r = 1.18;
    if (open) {
      // open arches: eight posts, a ring on them, and the bell inside
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        b.obox(cx + Math.cos(a) * r, (y0 + y1) / 2, cz + Math.sin(a) * r, 0.14, (y1 - y0) / 2, 0.14, a, TRIM);
      }
      b.cyl(cx, cz, y0, y0 + 0.2, r + 0.1, r + 0.1, 8, TRIM);
      b.cyl(cx, cz, y1 - 0.45, y1, r + 0.16, r + 0.16, 8, TRIM);
      lathe(b, cx, cz, [[0.62, y0 + 0.45], [0.5, y0 + 0.75], [0.36, y0 + 1.35], [0.12, y0 + 1.6]], 8, BRONZE);
      k.glows.push({ x: cx, y: y0 + 1.9, z: cz, sx: 0.4, sy: 0.3, sz: 0.4, color: '#ffe2ae' });
    } else {
      // glazed: eight panes between white posts, lit from within
      b.cyl(cx, cz, y0, y1 - 0.45, r - 0.06, r - 0.06, 8, GLASS, { win: interior(1.3), cap: false });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        b.obox(cx + Math.cos(a) * r, (y0 + y1) / 2, cz + Math.sin(a) * r, 0.12, (y1 - y0) / 2, 0.12, a, TRIM);
      }
      b.cyl(cx, cz, y1 - 0.45, y1, r + 0.16, r + 0.16, 8, TRIM);
    }
    // the cap, turned like a bell, and the weathervane on it
    lathe(b, cx, cz, [[r + 0.2, y1], [r - 0.05, y1 + 0.4], [0.7, y1 + 0.9], [0.3, y1 + 1.3], [0.1, y1 + 1.6]], 8, VERDIGRIS);
    weathervane(b, cx, cz, y1 + 1.55, 1.9);
  };
  tower(z0 + BLOCK / 2, true);
  tower(z1 - BLOCK / 2, false);
}

export const MODELS: Record<string, Model> = { union };

export function extras(k: Build): void {
  void k;
}
