// The Main Quad's west row: Altgeld Hall and the Alma Mater, Henry Administration, the English Building, Lincoln Hall and Gregory Hall.
//
// All six have their Quad side to the east, and that is the side the opening
// view sees first, with their south sides: those are built with the most care.
// Their backs, on Wright Street, are plainer. Each hall carries its name once,
// over its Quad door, as plain lettering on a plain board.

import { placed } from '../../engine/build';
import { interior, rng, type GeoBuilder, type QuadOpts, type V3, type WinSpec } from '../../engine/geo';
import { archway, roundel, tri } from '../../engine/parts';
import { gable, hip } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import {
  BASE, BRICK, DARK, FELT, GLASS, HALL, HALL_NARROW, IRON, LIMESTONE, SLATE, STOREY, TRIM, VERDIGRIS,
  chimney, column, dormer, steps,
} from './look';
import { AREAS, type LotDef, type Model } from './plan';

// ---------------------------------------------------------------------------
// Colours this file needs that look.ts has not
// ---------------------------------------------------------------------------

/** Altgeld's sandstone, pink-buff now it has been cleaned, a darker stone for its base and bands, and its roofs of terra cotta tile. */
const SANDSTONE = 0xc9a28c, SANDSTONE_DARK = 0xa9846f, TILE = 0x8e4433;
/** The Alma Mater's bronze, a warm brown since its restoration, and the lighter brown where the light catches it. */
const ALMA = 0x87573a, ALMA_LIGHT = 0xa36e48;
/** The granite of her base, the paving round it, and the wood of a bench. */
const GRANITE = 0x9b928b, GRANITE_DARK = 0x847b75, PAVING = 0xcfc6b4, WOOD = 0x8a6446;
/** Henry's ground storey of buff Bedford stone, and Lincoln Hall's terra cotta. */
const BEDFORD = 0xd8c9a4, TERRA_COTTA = 0xe4d8bd, TERRA_COTTA_PANEL = 0xcdb894;

/** Henry's storeys are lower than the campus's own, so that three of them and a parapet stand at its height. */
const HENRY_STOREY = 2.6;
const HENRY_WIN: WinSpec = { cell: 1.6, storey: HENRY_STOREY, lit: 0.4, kind: 0 };
/** Altgeld's windows: narrow, in rough stone. */
const ALTGELD_WIN: WinSpec = { cell: 1.6, storey: STOREY, lit: 0.42, kind: 0 };

// ---------------------------------------------------------------------------
// Signs: each hall's name, white with navy lettering
// ---------------------------------------------------------------------------

const board = (id: string, lines: string[]): SignDef => {
  const longest = Math.max(...lines.map((s) => s.length));
  const aspect = Math.max(2.4, (longest * 0.6) / (lines.length > 1 ? 1.7 : 1));
  const high = 52 * lines.length;
  return { id, lines, color: '#f3f0e7', ink: '#13294b', aspect, kind: 'board', real: true, size: [Math.round(high * aspect), high] };
};

export const SIGNS: SignDef[] = [
  board('quad-west-altgeld', ['ALTGELD HALL']),
  board('quad-west-henry', ['HENRY ADMINISTRATION', 'BUILDING']),
  board('quad-west-english', ['ENGLISH BUILDING']),
  board('quad-west-lincoln', ['LINCOLN HALL']),
  board('quad-west-gregory', ['GREGORY HALL']),
];

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

type Face = 'N' | 'E' | 'S' | 'W';
const NORMAL: Record<Face, V3> = { N: [0, 0, -1], E: [1, 0, 0], S: [0, 0, 1], W: [-1, 0, 0] };
/** A point on a wall that faces `f` and lies in the plane `plane`: `u` runs along the wall, and `d` is how far out from it. */
const onFace = (f: Face, plane: number) => (u: number, y: number, d: number): V3 =>
  f === 'N' ? [u, y, plane - d] : f === 'S' ? [u, y, plane + d] : f === 'E' ? [plane + d, y, u] : [plane - d, y, u];

/** A flat round-headed shape on a wall: straight sides from `y0` up to `spring`, half a circle over that. */
function archShape(b: GeoBuilder, f: Face, plane: number, u: number, y0: number, w: number, spring: number, d: number, color: number, o: QuadOpts = {}): void {
  const P = onFace(f, plane), n = NORMAL[f], r = w / 2, seg = 6;
  b.quad(P(u - r, y0, d), P(u + r, y0, d), P(u + r, spring, d), P(u - r, spring, d), n, color, o);
  for (let i = 0; i < seg; i++) {
    const a0 = (Math.PI * i) / seg, a1 = (Math.PI * (i + 1)) / seg;
    tri(b, P(u, spring, d), P(u + Math.cos(a0) * r, spring + Math.sin(a0) * r, d), P(u + Math.cos(a1) * r, spring + Math.sin(a1) * r, d), n, color, o);
  }
}

/** A round-arched window or door: a ring of stone round it, and the opening, dark by day and lit from within at night. */
function arched(b: GeoBuilder, f: Face, plane: number, u: number, y0: number, w: number, h: number, stone: number, lit: number, glass = DARK): void {
  const spring = y0 + h - w / 2;
  archShape(b, f, plane, u, y0 - 0.08, w + 0.3, spring, 0.03, stone);
  archShape(b, f, plane, u, y0, w, spring, 0.06, glass, { win: interior(lit) });
}

/** A row of `n` round-arched windows from `u0` to `u1` along a wall. */
function arcade(b: GeoBuilder, f: Face, plane: number, u0: number, u1: number, n: number, y0: number, h: number, stone: number, lit = 0.55): void {
  const step = (u1 - u0) / n, w = Math.min(step * 0.62, 1.0);
  for (let i = 0; i < n; i++) arched(b, f, plane, u0 + (i + 0.5) * step, y0, w, h, stone, lit, GLASS);
}

/**
 * A dormer of stone under a little gable of its own, on a roof that slopes
 * down towards `out`: (x, z) is the middle of its front, `y` its sill. It
 * reaches `deep` back into the roof.
 */
function stoneDormer(b: GeoBuilder, x: number, z: number, y: number, out: Face, stone: number, roof: number, w = 1.1, h = 1.15, deep = 1.5): void {
  const ns = out === 'N' || out === 'S', s = out === 'S' || out === 'E' ? 1 : -1;
  const x0 = ns ? x - w / 2 : Math.min(x, x - s * deep), x1 = ns ? x + w / 2 : Math.max(x, x - s * deep);
  const z0 = ns ? Math.min(z, z - s * deep) : z - w / 2, z1 = ns ? Math.max(z, z - s * deep) : z + w / 2;
  b.box(x0, y, z0, x1, y + h, z1, stone, { faces: 'NESW' });
  gable(b, x0, z0, x1, z1, y + h, w * 0.55, roof, stone, ns ? 'z' : 'x', 0.1);
  arched(b, out, ns ? z : x, ns ? x : z, y + 0.15, w * 0.5, h * 0.75, stone, 0.8, GLASS);
}

/**
 * A head of stone over each window of a wall glazed with `win`, in the storeys
 * listed (0 is the ground storey): the windows are where the engine draws
 * them, so the heads are worked out the same way.
 */
function lintels(b: GeoBuilder, f: Face, plane: number, u0: number, u1: number, win: WinSpec, rows: number[], color: number, sill = false): void {
  const n = Math.max(1, Math.floor((u1 - u0) / win.cell + 0.5)), cw = (u1 - u0) / n, P = onFace(f, plane), nn = NORMAL[f];
  for (const r of rows) {
    for (let i = 0; i < n; i++) {
      const a = u0 + (i + 0.14) * cw, c = u0 + (i + 0.86) * cw;
      for (const [y0, y1] of sill ? [[r + 0.8, r + 0.92], [r + 0.13, r + 0.2]] : [[r + 0.8, r + 0.92]]) {
        const ya = (r + (y0 - r)) * win.storey, yb = (r + (y1 - r)) * win.storey;
        b.quad(P(a, ya, 0.07), P(c, ya, 0.07), P(c, yb, 0.07), P(a, yb, 0.07), nn, color);
        b.quad(P(a, yb, 0), P(c, yb, 0), P(c, yb, 0.07), P(a, yb, 0.07), [0, 1, 0], color);
      }
    }
  }
}

/** A row of small stone brackets under a cornice at `y`, along a wall from `u0` to `u1`: a Romanesque corbel table. */
function corbels(b: GeoBuilder, f: Face, plane: number, u0: number, u1: number, y: number, color: number): void {
  const n = Math.max(1, Math.round((u1 - u0) / 0.6)), step = (u1 - u0) / n, P = onFace(f, plane);
  const faces = f === 'N' || f === 'S' ? `EW${f}B` : `NS${f}B`;
  for (let i = 0; i < n; i++) {
    const u = u0 + (i + 0.5) * step, a = P(u - 0.09, y - 0.32, 0), c = P(u + 0.09, y, 0.18);
    b.box(Math.min(a[0], c[0]), a[1], Math.min(a[2], c[2]), Math.max(a[0], c[0]), c[1], Math.max(a[2], c[2]), color, { faces });
  }
}

/** A name board on a wall: a thin white board, and the sign a hair in front of it. */
function nameBoard(k: Build, id: string, f: Face, plane: number, u: number, y: number, h: number, w: number): void {
  const P = onFace(f, plane), n = NORMAL[f];
  const a = P(u - w / 2, y - h / 2, 0), c = P(u + w / 2, y + h / 2, 0.06);
  k.b.box(Math.min(a[0], c[0]), a[1], Math.min(a[2], c[2]), Math.max(a[0], c[0]), c[1], Math.max(a[2], c[2]), TRIM, { faces: 'NESWTB' });
  const s = P(u, y, 0.09);
  k.sign(id, s[0], s[1], s[2], n[0], n[2], h * 0.8, w - 0.15);
}

/** A park bench, its seat along `along`, its back on the side away from where it looks. */
function bench(b: GeoBuilder, x: number, z: number, along: 'x' | 'z', back: 1 | -1): void {
  const L = 0.8, D = 0.22;
  if (along === 'z') {
    b.box(x - D, 0.4, z - L, x + D, 0.5, z + L, WOOD, { faces: 'NESWTB' });
    b.box(x + back * D - 0.04, 0.5, z - L, x + back * D + 0.04, 0.95, z + L, WOOD, { faces: 'NESWT' });
    for (const s of [-1, 1]) b.box(x - D + 0.03, 0, z + s * (L - 0.15) - 0.05, x + D - 0.03, 0.4, z + s * (L - 0.15) + 0.05, IRON, { faces: 'NESW' });
  } else {
    b.box(x - L, 0.4, z - D, x + L, 0.5, z + D, WOOD, { faces: 'NESWTB' });
    b.box(x - L, 0.5, z + back * D - 0.04, x + L, 0.95, z + back * D + 0.04, WOOD, { faces: 'NESWT' });
    for (const s of [-1, 1]) b.box(x + s * (L - 0.15) - 0.05, 0, z - D + 0.03, x + s * (L - 0.15) + 0.05, 0.4, z + D - 0.03, IRON, { faces: 'NESW' });
  }
}

/** A lamp on the wall beside a door. */
const wallLamp = (k: Build, x: number, y: number, z: number): void => {
  k.glows.push({ x, y, z, sx: 0.22, sy: 0.32, sz: 0.22, color: '#ffe2ae' });
};

// ---------------------------------------------------------------------------
// The Alma Mater
// ---------------------------------------------------------------------------

/**
 * Lorado Taft's bronze of 1929 on its granite base, at Green and Wright. It is
 * written facing north, along -z, and turned to face north-west, towards the
 * crossing, as it stands. The opening view sees its back: the back of the
 * throne with a plain disc where the state's seal is, and Learning and Labor
 * clasping hands over it.
 */
function almaStatue(q: Build): void {
  const b = q.b;
  // the base: a low step, the block, and its cap. No lettering.
  b.box(-1.25, 0, -1.15, 1.25, 0.22, 1.15, GRANITE_DARK);
  b.box(-1.05, 0.22, -0.95, 1.05, 1.3, 0.95, GRANITE);
  b.box(-1.14, 1.3, -1.04, 1.14, 1.45, 1.04, GRANITE_DARK, { faces: 'NESWTB' });
  const y = 1.45, S = 1.18; // (the bronze is drawn a little taller than it is wide, so that it reads from above)

  // the throne: its seat, its back, a crest along the top, and the disc on the back
  b.box(-0.82, y, -0.05, 0.82, y + S * 1.0, 0.45, ALMA, { faces: 'NESWT' });
  b.box(-0.9, y + S * 1.0, 0.3, 0.9, y + S * 2.5, 0.52, ALMA, { faces: 'NESW' });
  b.box(-1.0, y + S * 2.5, 0.24, 1.0, y + S * 2.72, 0.58, ALMA_LIGHT, { faces: 'NESWTB' });
  for (const s of [-1, 1]) b.box(s * 0.82 - 0.09, y + S * 1.0, -0.05, s * 0.82 + 0.09, y + S * 1.45, 0.3, ALMA_LIGHT, { faces: 'NESWT' });
  roundel(b, [0, y + S * 1.7, 0.55], 0.4, 'S', ALMA_LIGHT, {}, 10);

  // Alma Mater herself, robed, before the throne, her arms held out in welcome
  const az = -0.5;
  b.cyl(0, az, y, y + S * 1.9, 0.52, 0.36, 8, ALMA, { cap: false });
  b.cyl(0, az, y + S * 1.9, y + S * 2.55, 0.36, 0.29, 8, ALMA_LIGHT, { cap: false });
  b.box(-0.42, y + S * 2.42, az - 0.22, 0.42, y + S * 2.62, az + 0.22, ALMA, { faces: 'NESWTB' });
  b.cyl(0, az, y + S * 2.6, y + S * 3.08, 0.17, 0.16, 6, ALMA_LIGHT);
  b.box(-0.13, y + S * 2.75, az + 0.08, 0.13, y + S * 3.0, az + 0.24, ALMA, { faces: 'NESWT' });
  for (const s of [-1, 1]) {
    b.beam([s * 0.38, y + S * 2.48, az], [s * 1.05, y + S * 2.22, az - 0.55], 0.1, 0.07, ALMA_LIGHT);
    // the sleeves of her robe, hanging from her arms
    b.beam([s * 0.36, y + S * 2.42, az], [s * 0.82, y + S * 1.8, az - 0.32], 0.16, 0.05, ALMA);
  }

  // behind the throne: Labor, in a smith's apron, on her right, and Learning, in a gown, on her left
  const fz = 0.82, clasp: V3 = [0, y + S * 2.98, 0.42];
  {
    const x = 0.62;
    for (const s of [-1, 1]) b.box(x + s * 0.12 - 0.08, y, fz - 0.1, x + s * 0.12 + 0.08, y + S * 1.45, fz + 0.1, ALMA, { faces: 'NESW' });
    b.box(x - 0.25, y + S * 1.45, fz - 0.15, x + 0.25, y + S * 2.5, fz + 0.15, ALMA_LIGHT, { faces: 'NESWT' });
    b.box(x - 0.2, y + S * 0.95, fz - 0.19, x + 0.2, y + S * 2.25, fz - 0.15, ALMA, { faces: 'NESW' });
    b.cyl(x, fz, y + S * 2.5, y + S * 2.95, 0.16, 0.15, 6, ALMA);
    b.beam([x - 0.2, y + S * 2.38, fz], clasp, 0.09, 0.08, ALMA_LIGHT);
    b.beam([x + 0.24, y + S * 2.38, fz], [x + 0.36, y + S * 1.55, fz - 0.05], 0.09, 0.07, ALMA_LIGHT);
  }
  {
    const x = -0.62;
    b.cyl(x, fz, y, y + S * 1.6, 0.3, 0.22, 8, ALMA, { cap: false });
    b.cyl(x, fz, y + S * 1.6, y + S * 2.45, 0.22, 0.2, 8, ALMA_LIGHT, { cap: false });
    b.cyl(x, fz, y + S * 2.45, y + S * 2.88, 0.15, 0.14, 6, ALMA);
    b.beam([x + 0.18, y + S * 2.35, fz], clasp, 0.08, 0.08, ALMA_LIGHT);
    // her other hand holds a book
    b.beam([x - 0.2, y + S * 2.35, fz], [x - 0.3, y + S * 1.7, fz - 0.15], 0.08, 0.07, ALMA_LIGHT);
    b.box(x - 0.45, y + S * 1.55, fz - 0.3, x - 0.2, y + S * 1.85, fz - 0.15, ALMA, { faces: 'NESWTB' });
  }

  // two lamps in the paving, lighting her front
  q.glows.push({ x: -1.0, y: 0.12, z: -1.7, sx: 0.3, sy: 0.12, sz: 0.3, color: '#ffe2ae' });
  q.glows.push({ x: 1.0, y: 0.12, z: -1.7, sx: 0.3, sy: 0.12, sz: 0.3, color: '#ffe2ae' });
}

function almaMater(k: Build, l: LotDef): void {
  const b = k.b;
  const cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2;
  const plaza = AREAS.find((a) => a.id === 'alma-plaza') ?? { x0: l.x0 - 2, z0: l.z0 - 0.5, x1: l.x1 + 3, z1: l.z1 + 1.5 };
  // a ring of paving round the base, which keeps inside the plaza
  const ring = Math.min(2.4, (cz - plaza.z0) / Math.cos(Math.PI / 8) - 0.05, (cx - plaza.x0) / Math.cos(Math.PI / 8) - 0.05);
  b.cyl(cx, cz, 0, 0.05, ring, ring, 8, PAVING, { phase: Math.PI / 8 });
  placed(k, cx, cz, -45, almaStatue);

  // a bed of autumn flowers along the plaza's west edge, by Wright Street
  {
    const x0 = plaza.x0 + 0.2, x1 = plaza.x0 + 1.0, z0 = cz - 0.4, z1 = plaza.z1 - 0.3;
    b.box(x0, 0, z0, x1, 0.22, z1, GRANITE_DARK, { top: 0x5a7f3e });
    const r = rng(0x41a);
    for (let z = z0 + 0.35; z < z1 - 0.2; z += 0.55) {
      const c = [0xe08a2a, 0xd9b23a, 0x9b4a8f, 0xc8452f][Math.floor(r() * 4)];
      const x = x0 + 0.2 + r() * 0.4;
      b.box(x - 0.16, 0.22, z - 0.16, x + 0.16, 0.42, z + 0.16, c);
    }
  }
  // two benches on the plaza's east side, looking at her
  bench(b, plaza.x1 - 0.7, cz - 1.0, 'z', 1);
  bench(b, plaza.x1 - 0.7, cz + 1.6, 'z', 1);

  // people: two looking up at her, one sitting, and one having a picture taken in front of her while a friend takes it
  const fx = -Math.SQRT1_2, fz = -Math.SQRT1_2;
  k.person(cx + fx * 1.95, cz + fz * 1.95);
  k.person(cx + fx * 2.0 - 1.45, cz + fz * 2.0 + 0.25);
  k.person(cx + 2.3, cz - 1.0);
  k.person(cx + 1.4, cz + 1.9);
  k.person(plaza.x1 - 1.3, cz + 1.6);

  k.lights.push({ x: cx - 1.2, z: cz - 1.2, r: 9, color: '#ffe2ae', k: 0.55 });
}

// ---------------------------------------------------------------------------
// Altgeld Hall
// ---------------------------------------------------------------------------

/**
 * Richardsonian Romanesque of 1897, in rough pink-buff sandstone under steep
 * roofs of red tile. The bell tower of the Altgeld Chimes stands at the
 * north-east corner: a square shaft, a belfry with two arches on each side,
 * a round turret at each corner, and a steep pyramid roof. The original front,
 * with its great arched entrance and a round turret at its west corner, faces
 * north, to Green Street and the Alma Mater. The Quad side has a gabled
 * pavilion with an arched door, and the name over it.
 */
function altgeld(k: Build, l: LotDef): void {
  const b = k.b;
  const tp = l.parts?.find((p) => p.id === 'altgeld-tower');
  const t = tp ?? { x0: l.x1 - 4.5, z0: l.z0, x1: l.x1, z1: l.z0 + 4.5, h: l.h + 8.5 };
  const W = 3 * STOREY, EAVE = W + 0.45, RISE = Math.min(3.4, l.h + 3.4 - EAVE);
  const top = { win: ALTGELD_WIN, seed: 0.47 };
  // the walls: the Green Street range (A) west of the tower, and the main block (B) south of both
  const xw = l.x0 + 0.45, xe = l.x1 - 0.6, zn = l.z0 + 0.55, zs = l.z1 - 0.3;

  // A: its two lower storeys glazed, its top storey plain stone with arched windows built on its front
  b.box(xw, 0, zn, t.x0, 2 * STOREY, t.z1, SANDSTONE, { ...top, faces: 'NW' });
  b.box(xw, 2 * STOREY, zn, t.x0, W, t.z1, SANDSTONE, { faces: 'NW' });
  // B
  b.box(xw, 0, t.z1, xe, 2 * STOREY, zs, SANDSTONE, { ...top, faces: 'ESW' });
  b.box(xw, 2 * STOREY, t.z1, xe, W, zs, SANDSTONE, { faces: 'ESW' });
  // the top storey on Wright Street: arched windows, as on the other sides
  arcade(b, 'W', xw, l.z0 + 2.75, t.z1 - 0.05, 1, 2 * STOREY + 0.45, 2.15, SANDSTONE_DARK);
  arcade(b, 'W', xw, t.z1 + 0.1, zs - 0.1, 4, 2 * STOREY + 0.45, 2.15, SANDSTONE_DARK);
  // a base of darker stone, bands at the floors, and a heavy cornice
  for (const [x0, z0, x1, z1, f] of [[xw, zn, t.x0, t.z1, 'NW'], [xw, t.z1, xe, zs, 'ESW']] as [number, number, number, number, string][]) {
    b.box(x0 - 0.08, 0, z0 - (f.includes('N') ? 0.08 : 0), x1 + (f.includes('E') ? 0.08 : 0), 0.85, z1 + (f.includes('S') ? 0.08 : 0), SANDSTONE_DARK, { faces: f + 'T' });
    for (const y of [STOREY, 2 * STOREY]) {
      b.box(x0 - 0.06, y - 0.1, z0 - (f.includes('N') ? 0.06 : 0), x1 + (f.includes('E') ? 0.06 : 0), y + 0.08, z1 + (f.includes('S') ? 0.06 : 0), SANDSTONE_DARK, { faces: f + 'TB' });
    }
    b.box(x0 - 0.25, W, z0 - 0.25, x1 + 0.25, EAVE, z1 + 0.25, SANDSTONE_DARK, { faces: 'NESWB' });
  }
  // a corbel table under the cornice, all round
  corbels(b, 'N', zn, l.x0 + 2.75, t.x0, W, SANDSTONE_DARK);
  corbels(b, 'W', xw, l.z0 + 2.75, zs, W, SANDSTONE_DARK);
  corbels(b, 'E', xe, t.z1, zs, W, SANDSTONE_DARK);
  corbels(b, 'S', zs, xw, xe, W, SANDSTONE_DARK);
  // and two bands of darker stone round the tower's shaft
  for (const y of [STOREY * 1.6, STOREY * 2.75]) b.box(t.x0 - 0.06, y, t.z0 - 0.06, t.x1 + 0.06, y + 0.16, t.z1 + 0.06, SANDSTONE_DARK, { faces: 'NESWTB' });
  // the steep roofs of red tile, and two stone chimneys
  hip(b, xw, zn, t.x0, t.z1 + 0.6, EAVE, RISE, TILE, 0.4);
  hip(b, xw, t.z1, xe, zs, EAVE, RISE, TILE, 0.4);
  chimney(b, xw + 1.6, (t.z1 + zs) / 2 + 1.2, EAVE + 1.5, EAVE + RISE + 0.9, SANDSTONE_DARK, 0.45, 0.4);
  chimney(b, (xw + xe) / 2 + 1.3, zs - 1.4, EAVE + 0.8, EAVE + RISE - 0.2, SANDSTONE_DARK, 0.4, 0.35);
  // dormers of stone: one on each slope that has room, each set where the slope under its front is at its sill
  {
    const runB = (zs - t.z1) / 2 + 0.4, runA = (t.z1 + 0.6 - zn) / 2 + 0.4;
    const onB = (d: number): number => EAVE + (d + 0.4) * (RISE / runB) - 0.12;
    const onA = (d: number): number => EAVE + (d + 0.4) * (RISE / runA) - 0.12;
    stoneDormer(b, xe - 1.9, zs - 1.0, onB(1.0), 'S', SANDSTONE, TILE);
    stoneDormer(b, xw + 0.9, (t.z1 + zs) / 2 - 1.3, onB(0.9), 'W', SANDSTONE, TILE);
    stoneDormer(b, (l.x0 + 2.7 + t.x0) / 2, zn + 0.75, onA(0.75), 'N', SANDSTONE, TILE, 1.0, 1.0, 1.1);
  }

  // -------------------------------------------------------------------------
  // The round turret at the corner of Green and Wright
  // -------------------------------------------------------------------------
  {
    const r = 1.35, x = l.x0 + r, z = l.z0 + r, sides = 10;
    b.cyl(x, z, 0, 2 * STOREY, r, r, sides, SANDSTONE, { win: ALTGELD_WIN, seed: 0.83, cap: false });
    b.cyl(x, z, 0, 0.85, r + 0.08, r + 0.08, sides, SANDSTONE_DARK, { cap: false });
    b.cyl(x, z, 2 * STOREY, W + 1.2, r, r, sides, SANDSTONE, { cap: false });
    b.cyl(x, z, W + 1.2, W + 1.55, r + 0.12, r + 0.12, sides, SANDSTONE_DARK, { cap: SANDSTONE_DARK });
    b.cyl(x, z, W + 1.55, l.h + 3.5, r + 0.2, 0.03, sides, TILE, { cap: false });
    b.cyl(x, z, l.h + 3.4, l.h + 4.3, 0.06, 0.03, 4, IRON, { cap: false });
    // a ring of small arched windows in its top storey, towards the corner
    for (const a of [-Math.PI * 0.75, -Math.PI * 0.5, -Math.PI]) {
      const nx = Math.cos(a), nz = Math.sin(a);
      b.obox(x + nx * (r - 0.02), 2 * STOREY + 1.6, z + nz * (r - 0.02), 0.06, 0.75, 0.28, a, DARK, { win: interior(0.55) });
    }
  }

  // -------------------------------------------------------------------------
  // The great arched entrance on Green Street, and the arcade over it
  // -------------------------------------------------------------------------
  {
    const turretE = l.x0 + 2.7;
    const cx = (turretE + t.x0) / 2, half = 1.55, front = l.z0 - 0.75, ph = 4.3, w = 1.9, spring = 2.35;
    archway(b, cx, front, zn, w, spring, ph, SANDSTONE_DARK, 0x4a3a32, 8);
    b.box(cx - half, 0, front, cx - w / 2, ph, zn, SANDSTONE_DARK, { faces: 'NEW' });
    b.box(cx + w / 2, 0, front, cx + half, ph, zn, SANDSTONE_DARK, { faces: 'NEW' });
    gable(b, cx - half, front, cx + half, zn + 0.2, ph, 1.3, TILE, SANDSTONE, 'z', 0.2);
    // its floor, a step, and the door at the back, lit
    b.box(cx - half, 0, front, cx + half, 0.3, zn, SANDSTONE_DARK, { faces: 'NT' });
    steps(b, cx - half, cx + half, front, 0.3, 'N', SANDSTONE_DARK, 0.4);
    arched(b, 'N', zn, cx, 0.3, 1.4, 2.7, SANDSTONE_DARK, 1.3);
    // the lantern of the class of 1905, hanging in the arch
    k.glows.push({ x: cx, y: spring + 0.35, z: (front + zn) / 2, sx: 0.3, sy: 0.42, sz: 0.3, color: '#ffe2ae' });
    // three arched windows in the top storey over it
    arcade(b, 'N', zn, turretE + 0.1, t.x0 - 0.1, 3, 2 * STOREY + 0.45, 2.15, SANDSTONE_DARK);
    k.lights.push({ x: cx, z: l.z0 - 2.4, r: 9, color: '#ffe2ae', k: 0.5 });
    k.person(cx - 0.6, front - 0.9);
    // the class of '76 boulder, in front of the building
    b.obox(t.x1 - 0.4, 0.22, l.z0 - 1.6, 0.42, 0.26, 0.32, 0.4, 0x8e8a84, { faces: 'NESWT' });
  }

  // -------------------------------------------------------------------------
  // The bell tower
  // -------------------------------------------------------------------------
  {
    const tcx = (t.x0 + t.x1) / 2, tcz = (t.z0 + t.z1) / 2, half = (t.x1 - t.x0) / 2;
    const shaft = 10.8, band = shaft + 0.5, belfry = band + 3.0, cornice = belfry + 0.38;
    b.box(t.x0, 0, t.z0, t.x1, shaft, t.z1, SANDSTONE, { faces: 'NESW' });
    // few windows in the shaft: a pair of narrow arches low down, and one tall one high up, on each side that shows
    for (const [f, plane, mid] of [['N', t.z0, tcx], ['E', t.x1, tcz], ['S', t.z1, tcx], ['W', t.x0, tcz]] as [Face, number, number][]) {
      if (f !== 'S' && f !== 'W') for (const s of [-1, 1]) arched(b, f, plane, mid + s * 0.55, 2.2, 0.6, 1.7, SANDSTONE_DARK, 0.5, GLASS);
      if (f !== 'S' && f !== 'W') arched(b, f, plane, mid, 5.3, 0.75, 2.0, SANDSTONE_DARK, 0.5, GLASS);
      arched(b, f, plane, mid, shaft - 2.6, 0.8, 2.1, SANDSTONE_DARK, 0.5, GLASS);
    }
    b.box(t.x0 - 0.08, 0, t.z0 - 0.08, t.x1 + 0.08, 0.95, t.z1, SANDSTONE_DARK, { faces: 'NEWT' });
    b.box(t.x0, shaft, t.z0, t.x1, band, t.z1, SANDSTONE_DARK, { faces: 'NESWT' });
    // the belfry: set back, with two tall arches on each side for the bells
    const inset = 0.25, bx0 = t.x0 + inset, bx1 = t.x1 - inset, bz0 = t.z0 + inset, bz1 = t.z1 - inset;
    b.box(bx0, band, bz0, bx1, belfry, bz1, SANDSTONE, { faces: 'NESW' });
    const planes: [Face, number, number][] = [['N', bz0, tcx], ['S', bz1, tcx], ['E', bx1, tcz], ['W', bx0, tcz]];
    for (const [f, plane, mid] of planes) {
      for (const s of [-1, 1]) arched(b, f, plane, mid + s * 0.62, band + 0.35, 0.86, 2.4, SANDSTONE_DARK, 0.9);
      // a little column between the two
      const P = onFace(f, plane);
      const a = P(mid - 0.07, band + 0.3, 0), c = P(mid + 0.07, band + 1.95, 0.1);
      b.box(Math.min(a[0], c[0]), a[1], Math.min(a[2], c[2]), Math.max(a[0], c[0]), c[1], Math.max(a[2], c[2]), SANDSTONE_DARK, { faces: 'NESWT' });
    }
    b.box(t.x0 - 0.15, belfry, t.z0 - 0.15, t.x1 + 0.15, cornice, t.z1 + 0.15, SANDSTONE_DARK, { faces: 'NESWTB' });
    // the steep pyramid of red tile, and its finial
    b.cyl(tcx, tcz, cornice, t.h, (half + 0.2) * Math.SQRT2, 0.03, 4, TILE, { phase: Math.PI / 4, cap: false });
    b.cyl(tcx, tcz, t.h - 0.3, t.h + 1.9, 0.09, 0.03, 4, VERDIGRIS, { phase: Math.PI / 4, cap: false });
    b.cyl(tcx, tcz, t.h + 0.35, t.h + 0.7, 0.17, 0.17, 6, VERDIGRIS);
    // a round turret at each corner, standing out on a corbel, with a cone of its own
    const r = 0.5;
    for (const [x, z] of [[t.x0 + r, t.z0 + r], [t.x1 - r, t.z0 + r], [t.x1 - r, t.z1 - r], [t.x0 + r, t.z1 - r]]) {
      b.cyl(x, z, band - 0.6, band, 0.12, r, 8, SANDSTONE_DARK, { cap: false });
      b.cyl(x, z, band, cornice, r, r, 8, SANDSTONE, { cap: false });
      b.cyl(x, z, cornice, cornice + 0.12, r + 0.08, r + 0.08, 8, SANDSTONE_DARK, { cap: false });
      b.cyl(x, z, cornice + 0.12, cornice + 1.9, r + 0.1, 0.02, 8, TILE, { cap: false });
    }
  }

  // -------------------------------------------------------------------------
  // The Quad front: a gabled pavilion with an arched door, and the name over it
  // -------------------------------------------------------------------------
  {
    const zc = (t.z1 + zs) / 2 + 0.6, half = 1.85, z0 = zc - half, z1 = zc + half, x1 = l.x1;
    b.box(xe - 0.01, 0, z0, x1, W, z1, SANDSTONE, { faces: 'NES' });
    b.box(xe, 0, z0 - 0.08, x1 + 0.08, 0.85, z1 + 0.08, SANDSTONE_DARK, { faces: 'NEST' });
    b.box(xe, W, z0 - 0.25, x1 + 0.25, EAVE, z1 + 0.25, SANDSTONE_DARK, { faces: 'NESB' });
    gable(b, xe - 2.4, z0, x1, z1, EAVE, 2.0, TILE, SANDSTONE, 'x', 0.3);
    roundel(b, [x1 + 0.03, EAVE + 0.75, zc], 0.45, 'E', GLASS, { win: interior(0.8) }, 10);
    // the door, deep under its arch, with steps down to the Quad's walk
    arched(b, 'E', x1, zc, 0.45, 1.5, 2.55, SANDSTONE_DARK, 1.3);
    steps(b, zc - 1.0, zc + 1.0, x1, 0.45, 'E', SANDSTONE_DARK, 0.45);
    nameBoard(k, 'quad-west-altgeld', 'E', x1, zc, 3.38, 0.5, 2.9);
    // two arched windows in the second storey, and three in the third
    arcade(b, 'E', x1, z0 + 0.3, z1 - 0.3, 2, STOREY + 0.75, 1.75, SANDSTONE_DARK);
    arcade(b, 'E', x1, z0 + 0.2, z1 - 0.2, 3, 2 * STOREY + 0.45, 2.15, SANDSTONE_DARK);
    // and an arched window in the top storey either side of it
    arcade(b, 'E', xe, t.z1 + 0.1, z0 - 0.05, 1, 2 * STOREY + 0.45, 2.15, SANDSTONE_DARK);
    arcade(b, 'E', xe, z1 + 0.05, zs - 0.1, 1, 2 * STOREY + 0.45, 2.15, SANDSTONE_DARK);
    wallLamp(k, x1 + 0.15, 2.3, zc - 1.25);
    wallLamp(k, x1 + 0.15, 2.3, zc + 1.25);
    k.lights.push({ x: x1 + 2.5, z: zc, r: 10, color: '#ffe2ae', k: 0.55 });
    k.person(x1 + 0.7, zc - 0.5, 0);
    k.person(x1 + 1.2, zc + 1.4, 0);
  }

  // -------------------------------------------------------------------------
  // The south side, on the walk to Henry: a gabled pavilion, and an arcade along the top storey
  // -------------------------------------------------------------------------
  {
    const half = 1.7, cx = xw + 3.2, x0 = cx - half, x1 = cx + half, z1 = l.z1;
    b.box(x0, 0, zs - 0.01, x1, 2 * STOREY, z1, SANDSTONE, { win: ALTGELD_WIN, seed: 0.61, faces: 'ESW' });
    b.box(x0, 2 * STOREY, zs - 0.01, x1, W, z1, SANDSTONE, { faces: 'ESW' });
    b.box(x0 - 0.08, 0, zs, x1 + 0.08, 0.85, z1 + 0.08, SANDSTONE_DARK, { faces: 'ESWT' });
    b.box(x0 - 0.25, W, zs, x1 + 0.25, EAVE, z1 + 0.25, SANDSTONE_DARK, { faces: 'ESWB' });
    gable(b, x0, zs - 2.4, x1, z1, EAVE, 2.0, TILE, SANDSTONE, 'z', 0.3);
    roundel(b, [cx, EAVE + 0.75, z1 + 0.03], 0.42, 'S', GLASS, { win: interior(0.8) }, 10);
    arcade(b, 'S', z1, x0 + 0.2, x1 - 0.2, 2, 2 * STOREY + 0.45, 2.15, SANDSTONE_DARK);
    arcade(b, 'S', zs, x1 + 0.2, xe - 0.1, 4, 2 * STOREY + 0.45, 2.15, SANDSTONE_DARK);
    arcade(b, 'S', zs, xw + 0.05, x0 - 0.05, 1, 2 * STOREY + 0.45, 2.15, SANDSTONE_DARK);
  }
}

// ---------------------------------------------------------------------------
// The Henry Administration Building
// ---------------------------------------------------------------------------

/**
 * Three storeys: a ground storey of buff Bedford stone, red brick above, a
 * stone cornice and a parapet round a flat roof. On the Quad side tall stone
 * pilasters run through the two upper storeys, one between each bay, and the
 * door is in the middle under the name.
 */
function henry(k: Build, l: LotDef): void {
  const b = k.b;
  const S = HENRY_STOREY, W = 3 * S, top = W + 0.25, par = l.h + 0.35;
  const x0 = l.x0 + 0.25, x1 = l.x1 - 0.35, z0 = l.z0 + 0.25, z1 = l.z1 - 0.25, zc = (z0 + z1) / 2;
  const wall = { win: HENRY_WIN, seed: 0.17, faces: 'NESW' };
  b.box(x0, 0, z0, x1, S, z1, BEDFORD, wall);
  b.box(x0, S, z0, x1, W, z1, BRICK.red, wall);
  b.box(x0 - 0.06, 0, z0 - 0.06, x1 + 0.06, 0.5, z1 + 0.06, BASE, { faces: 'NESWT' });
  b.box(x0 - 0.07, S - 0.08, z0 - 0.07, x1 + 0.07, S + 0.12, z1 + 0.07, LIMESTONE, { faces: 'NESWTB' });
  b.box(x0 - 0.25, W, z0 - 0.25, x1 + 0.25, top, z1 + 0.25, LIMESTONE, { faces: 'NESWB' });
  // the parapet, its four walls, and the flat roof inside it
  const t = 0.22, px0 = x0 - 0.1, px1 = x1 + 0.1, pz0 = z0 - 0.1, pz1 = z1 + 0.1;
  b.box(px0, top, pz0, px1, par, pz0 + t, BRICK.red, { faces: 'NESWT', top: LIMESTONE });
  b.box(px0, top, pz1 - t, px1, par, pz1, BRICK.red, { faces: 'NESWT', top: LIMESTONE });
  b.box(px0, top, pz0 + t, px0 + t, par, pz1 - t, BRICK.red, { faces: 'EWT', top: LIMESTONE });
  b.box(px1 - t, top, pz0 + t, px1, par, pz1 - t, BRICK.red, { faces: 'EWT', top: LIMESTONE });
  b.box(px0 + t, top - 0.05, pz0 + t, px1 - t, top + 0.04, pz1 - t, FELT, { faces: 'T' });
  // on the Quad side, a block of stone in the parapet over each pilaster
  {
    const cols = Math.max(1, Math.round((z1 - z0) / HENRY_WIN.cell)), bay = (z1 - z0) / cols;
    for (let i = 0; i <= cols; i++) b.box(px1 - 0.3, top, z0 + i * bay - 0.26, px1 + 0.05, par + 0.12, z0 + i * bay + 0.26, LIMESTONE, { faces: 'NESWT' });
  }
  // stone heads over the windows of the brick storeys, all round
  lintels(b, 'E', x1, z0, z1, HENRY_WIN, [1, 2], LIMESTONE);
  lintels(b, 'S', z1, x0, x1, HENRY_WIN, [1, 2], LIMESTONE, true);
  lintels(b, 'N', z0, x0, x1, HENRY_WIN, [1, 2], LIMESTONE);
  lintels(b, 'W', x0, z0, z1, HENRY_WIN, [1, 2], LIMESTONE);
  // on the roof: a skylight and a small housing for the stair
  b.box(x0 + 3, top + 0.04, zc - 1.2, x0 + 6, top + 0.5, zc + 1.2, GLASS, { faces: 'NESWT', win: interior(0.6) });
  b.box(x1 - 2.6, top + 0.04, z0 + 0.8, x1 - 1.0, par + 0.45, z0 + 2.2, BRICK.deep, { faces: 'NESWT' });

  // the Quad side: a pilaster of stone at every bay's edge, through the two upper storeys, with a capital
  const cols = Math.max(1, Math.round((z1 - z0) / HENRY_WIN.cell)), bay = (z1 - z0) / cols;
  for (let i = 0; i <= cols; i++) {
    const z = z0 + i * bay;
    b.box(x1, S + 0.12, z - 0.17, x1 + 0.16, W - 0.35, z + 0.17, LIMESTONE, { faces: 'NES' });
    b.box(x1, W - 0.35, z - 0.25, x1 + 0.24, W, z + 0.25, TRIM, { faces: 'NESB' });
    b.box(x1, S + 0.12, z - 0.24, x1 + 0.22, S + 0.4, z + 0.24, LIMESTONE, { faces: 'NEST' });
  }
  // the door, in a frame of stone, the name over it, and steps down to the walk
  const fw = Math.min(0.95, bay * 0.65);
  b.box(x1, 0, zc - fw, x1 + 0.3, S - 0.05, zc + fw, LIMESTONE, { faces: 'NEST' });
  b.box(x1 + 0.3, 0.3, zc - 0.5, x1 + 0.34, 1.8, zc + 0.5, DARK, { faces: 'E', win: interior(1.3) });
  nameBoard(k, 'quad-west-henry', 'E', x1 + 0.3, zc, 2.15, 0.62, 2 * fw - 0.05);
  steps(b, zc - fw, zc + fw, x1 + 0.3, 0.3, 'E', LIMESTONE, 0.45);
  // a cornice of stone over the frame, and an urn either side of the steps
  b.box(x1, S - 0.05, zc - fw - 0.12, x1 + 0.45, S + 0.12, zc + fw + 0.12, LIMESTONE, { faces: 'NESTB' });
  for (const s of [-1, 1]) {
    const z = zc + s * (fw + 0.45);
    b.box(x1 + 0.6, 0, z - 0.22, x1 + 1.04, 0.35, z + 0.22, LIMESTONE);
    b.cyl(x1 + 0.82, z, 0.35, 0.85, 0.16, 0.3, 6, LIMESTONE);
  }
  wallLamp(k, x1 + 0.4, 1.6, zc - fw - 0.25);
  wallLamp(k, x1 + 0.4, 1.6, zc + fw + 0.25);
  k.lights.push({ x: x1 + 2.3, z: zc, r: 9, color: '#ffe2ae', k: 0.5 });
  k.person(x1 + 1.1, zc + 0.9);

  // the back, on Wright Street: a plain door
  b.box(x0 - 0.04, 0.2, zc - 0.5, x0, 1.8, zc + 0.5, DARK, { faces: 'W', win: interior(1.0) });
}

// ---------------------------------------------------------------------------
// The English Building
// ---------------------------------------------------------------------------

/**
 * Red brick Georgian Revival by McKim, Mead & White, 1905, under slate with
 * dormers, massive chimneys and a small white cupola. On the Quad side the
 * colonnade of 1913, white and tall, stands between two short brick towers.
 */
function english(k: Build, l: LotDef): void {
  const b = k.b;
  const W = 3 * STOREY, EAVE = W + 0.4, RISE = Math.min(2.4, l.h + 2.0 - EAVE);
  const tw = 1.9; // how far the towers and the colonnade stand out from the main block
  const mx0 = l.x0 + 0.25, mx1 = l.x1 - tw, mz0 = l.z0 + 0.2, mz1 = l.z1 - 0.2;
  const tx1 = l.x1 - 0.1, td = 1.75; // the towers: their east face, and how deep each is from north to south
  const wall = { win: HALL, seed: 0.53 };

  // the main block
  b.box(mx0, 0, mz0, mx1, W, mz1, BRICK.red, { ...wall, faces: 'NESW' });
  b.box(mx0 - 0.06, 0, mz0 - 0.06, mx1, 0.6, mz1 + 0.06, BASE, { faces: 'NSWT' });
  b.box(mx0 - 0.06, STOREY - 0.08, mz0 - 0.06, mx1, STOREY + 0.1, mz1 + 0.06, TRIM, { faces: 'NSWTB' });
  b.box(mx0 - 0.28, W, mz0 - 0.28, mx1 + 0.28, EAVE, mz1 + 0.28, TRIM, { faces: 'NESWB' });
  hip(b, mx0, mz0, mx1, mz1, EAVE, RISE, SLATE, 0.4);

  // dormers on the long slopes, and one over the colonnade
  {
    const run = (mz1 - mz0) / 2 + 0.4, up = 1.35, sill = EAVE + ((up + 0.4) * RISE) / run - 0.12;
    for (const x of [mx0 + 2.1, (mx0 + mx1) / 2, mx1 - 2.3]) {
      dormer(b, x, mz0 + up, sill, 'N', SLATE);
      dormer(b, x, mz1 - up, sill, 'S', SLATE);
    }
    dormer(b, mx1 - up, (mz0 + mz1) / 2, sill, 'E', SLATE);
    dormer(b, mx0 + up, (mz0 + mz1) / 2, sill, 'W', SLATE);
  }
  // four massive chimneys
  for (const x of [mx0 + 1.4, mx1 - 1.6]) for (const z of [mz0 + 1.0, mz1 - 1.0]) chimney(b, x, z, EAVE, l.h + 2.9, BRICK.deep, 0.62, 0.42);
  // the cupola on the ridge: a white base, an eight-sided lantern lit from within, a green cap
  {
    const cx = (mx0 + mx1) / 2, cz = (mz0 + mz1) / 2, ridge = EAVE + RISE;
    b.box(cx - 0.65, ridge - 0.6, cz - 0.65, cx + 0.65, ridge + 0.35, cz + 0.65, TRIM, { faces: 'NESW' });
    b.box(cx - 0.75, ridge + 0.35, cz - 0.75, cx + 0.75, ridge + 0.47, cz + 0.75, TRIM, { faces: 'NESWTB' });
    b.cyl(cx, cz, ridge + 0.47, ridge + 1.05, 0.5, 0.5, 8, GLASS, { cap: false, win: interior(1.0) });
    for (let i = 0; i < 8; i++) {
      const a = ((i + 0.5) / 8) * Math.PI * 2;
      b.obox(cx + Math.cos(a) * 0.5, ridge + 0.76, cz + Math.sin(a) * 0.5, 0.06, 0.29, 0.06, a, TRIM);
    }
    b.cyl(cx, cz, ridge + 1.05, ridge + 1.15, 0.62, 0.62, 8, TRIM);
    b.cyl(cx, cz, ridge + 1.15, Math.min(l.h + 3.5, ridge + 1.7), 0.58, 0.04, 8, VERDIGRIS, { cap: false });
  }

  // the two short towers, at the ends of the Quad front
  for (const [z0, z1] of [[mz0 - 0.12, mz0 + td], [mz1 - td, mz1 + 0.12]]) {
    b.box(mx1, 0, z0, tx1, W, z1, BRICK.red, { win: HALL_NARROW, seed: 0.71 + z0 * 0.01, faces: 'NES' });
    b.box(mx1, 0, z0 - 0.06, tx1 + 0.06, 0.6, z1 + 0.06, BASE, { faces: 'NEST' });
    b.box(mx1, STOREY - 0.08, z0 - 0.06, tx1 + 0.06, STOREY + 0.1, z1 + 0.06, TRIM, { faces: 'NESTB' });
    b.box(mx1, W, z0 - 0.2, tx1 + 0.2, EAVE, z1 + 0.2, TRIM, { faces: 'NESB' });
    // their attic stage, and a low hipped cap of slate
    const ay = l.h + 0.3;
    b.box(mx1 + 0.1, EAVE, z0 + 0.1, tx1 - 0.1, ay, z1 - 0.1, BRICK.red, { faces: 'NESW' });
    b.box(mx1, ay, z0, tx1, ay + 0.15, z1, TRIM, { faces: 'NESWB' });
    hip(b, mx1 + 0.05, z0 + 0.05, tx1 - 0.05, z1 - 0.05, ay + 0.15, 1.0, SLATE, 0.12);
    // white stone at their outer corners
    for (const z of [z0, z1]) b.box(tx1 - 0.3, 0.6, z - 0.04, tx1 + 0.04, W, z + 0.04, TRIM, { faces: 'NEST' });
  }

  // the colonnade: a podium with steps, six tall white columns, the entablature with the name on it, and a balustrade
  {
    const cz0 = mz0 + td, cz1 = mz1 - td, n = 6;
    b.box(mx1, 0, cz0, tx1, 0.5, cz1, LIMESTONE, { faces: 'ET' });
    steps(b, cz0 + 0.3, cz1 - 0.3, tx1, 0.5, 'E', LIMESTONE, 0.45);
    for (let i = 0; i < n; i++) column(b, tx1 - 0.45, cz0 + 0.45 + (i * (cz1 - cz0 - 0.9)) / (n - 1), 0.5, W - 0.95, 0.24);
    b.box(mx1, W - 0.95, cz0, tx1, W, cz1, TRIM, { faces: 'ETB' });
    b.box(mx1, W, cz0, tx1 + 0.2, EAVE, cz1, TRIM, { faces: 'ETB' });
    b.box(tx1 - 0.35, EAVE, cz0, tx1, EAVE + 0.45, cz1, TRIM, { faces: 'EWT' });
    b.box(mx1 + 0.05, EAVE - 0.02, cz0, tx1 - 0.35, EAVE + 0.02, cz1, FELT, { faces: 'T' });
    k.sign('quad-west-english', tx1 + 0.03, W - 0.47, (cz0 + cz1) / 2, 1, 0, 0.62, cz1 - cz0 - 0.4);
    // three doors behind the columns, lit from within
    const bay = (mz1 - mz0) / Math.max(1, Math.round((mz1 - mz0) / HALL.cell));
    for (let i = 1; i <= 3; i++) {
      const z = mz0 + (i + 0.5) * bay;
      if (z < cz0 + 0.3 || z > cz1 - 0.3) continue;
      b.box(mx1, 0.5, z - 0.45, mx1 + 0.05, 2.45, z + 0.45, DARK, { faces: 'E', win: interior(1.2) });
    }
    k.glows.push({ x: (mx1 + tx1) / 2, y: W - 1.15, z: (cz0 + cz1) / 2, sx: 0.4, sy: 0.12, sz: cz1 - cz0 - 0.8, color: '#ffe2ae' });
    k.lights.push({ x: tx1 + 2.4, z: (cz0 + cz1) / 2, r: 11, color: '#ffe2ae', k: 0.6 });
    k.person(tx1 + 0.4, cz0 + 1.1, 0.17);
    k.person(tx1 - 0.9, cz1 - 0.6, 0.5);
    k.person(tx1 + 0.9, (cz0 + cz1) / 2 + 0.4, 0);
  }

  // the back, on Wright Street: a door under a small white hood
  {
    const zc = (mz0 + mz1) / 2;
    b.box(mx0 - 0.04, 0.2, zc - 0.55, mx0, 2.2, zc + 0.55, DARK, { faces: 'W', win: interior(1.0) });
    b.box(mx0 - 0.5, 2.3, zc - 0.8, mx0, 2.45, zc + 0.8, TRIM, { faces: 'NSWTB' });
  }
}

// ---------------------------------------------------------------------------
// Lincoln Hall
// ---------------------------------------------------------------------------

/**
 * A large brick hall of 1911. Under its eaves runs a band of terra cotta
 * panels, the scenes from Lincoln's life, and over that a strongly projecting
 * cornice; a gabled roof of slate. Its door is in a bay of stone in the middle
 * of the Quad side, three arched doorways under the name.
 */
function lincolnHall(k: Build, l: LotDef): void {
  const b = k.b;
  const W = 3 * STOREY, FRIEZE = W + 0.75, TOP = FRIEZE + 0.5, out = 0.55;
  const x0 = l.x0 + out, x1 = l.x1 - out, z0 = l.z0 + out, z1 = l.z1 - out, zc = (z0 + z1) / 2, xc = (x0 + x1) / 2;
  b.box(x0, 0, z0, x1, W, z1, BRICK.deep, { win: HALL, seed: 0.37, faces: 'NESW' });
  b.box(x0 - 0.07, 0, z0 - 0.07, x1 + 0.07, 0.7, z1 + 0.07, LIMESTONE, { faces: 'NESWT' });
  b.box(x0 - 0.05, STOREY - 0.06, z0 - 0.05, x1 + 0.05, STOREY + 0.08, z1 + 0.05, LIMESTONE, { faces: 'NESWTB' });
  // stone heads and sills at the windows, and a pier of brick between every two bays on the Quad side and the south
  lintels(b, 'E', x1, z0, z1, HALL, [0, 1, 2], LIMESTONE, true);
  lintels(b, 'S', z1, x0, x1, HALL, [0, 1, 2], LIMESTONE, true);
  lintels(b, 'N', z0, x0, x1, HALL, [1, 2], LIMESTONE);
  lintels(b, 'W', x0, z0, z1, HALL, [1, 2], LIMESTONE);
  for (const [f, plane, u0, u1] of [['E', x1, z0, z1], ['S', z1, x0, x1]] as [Face, number, number, number][]) {
    const n = Math.max(1, Math.round((u1 - u0) / HALL.cell)), cw = (u1 - u0) / n, P = onFace(f, plane);
    for (let i = 0; i <= n; i += 2) {
      const a = P(u0 + i * cw - 0.2, 0.7, 0), c = P(u0 + i * cw + 0.2, W, 0.12);
      b.box(Math.min(a[0], c[0]), a[1], Math.min(a[2], c[2]), Math.max(a[0], c[0]), c[1], Math.max(a[2], c[2]), BRICK.red, { faces: f === 'E' ? 'NES' : 'ESW' });
    }
  }
  // the band of terra cotta, its panels, and the cornice that stands out over it
  b.box(x0 - 0.04, W, z0 - 0.04, x1 + 0.04, FRIEZE, z1 + 0.04, TERRA_COTTA, { faces: 'NESW' });
  const panels = (f: Face, plane: number, u0: number, u1: number): void => {
    const n = Math.max(2, Math.round((u1 - u0) / 1.75)), step = (u1 - u0) / n, P = onFace(f, plane);
    for (let i = 0; i < n; i++) {
      const u = u0 + (i + 0.5) * step;
      b.quad(P(u - step * 0.36, W + 0.14, 0.08), P(u + step * 0.36, W + 0.14, 0.08), P(u + step * 0.36, FRIEZE - 0.12, 0.08), P(u - step * 0.36, FRIEZE - 0.12, 0.08), NORMAL[f], TERRA_COTTA_PANEL);
    }
  };
  panels('E', x1, z0, z1);
  panels('S', z1, x0, x1);
  panels('W', x0, z0, z1);
  panels('N', z0, x0, x1);
  b.box(x0 - out, FRIEZE, z0 - out, x1 + out, TOP, z1 + out, LIMESTONE, { faces: 'NESWTB' });
  b.box(x0 - 0.2, FRIEZE - 0.12, z0 - 0.2, x1 + 0.2, FRIEZE, z1 + 0.2, LIMESTONE, { faces: 'NESWB' });
  // the gabled roof, its ridge from north to south, with a round window in each gable
  gable(b, x0, z0, x1, z1, TOP, 2.5, SLATE, BRICK.deep, 'z', 0.35);
  roundel(b, [xc, TOP + 0.85, z1 + 0.03], 0.5, 'S', GLASS, { win: interior(0.8) }, 10);
  roundel(b, [xc, TOP + 0.85, z0 - 0.03], 0.5, 'N', GLASS, { win: interior(0.8) }, 10);
  // a skylight along the ridge, over the hall's atrium
  b.box(xc - 0.5, TOP + 2.15, zc - 2.4, xc + 0.5, TOP + 2.45, zc + 2.4, GLASS, { faces: 'NESWT', win: interior(0.7) });

  // the Quad door: a bay of stone with three arched doorways, the name over them, and brick above
  {
    const half = 1.8, bx1 = l.x1 - 0.05;
    b.box(x1 - 0.01, 0, zc - half, bx1, STOREY, zc + half, LIMESTONE, { faces: 'NEST' });
    b.box(x1 - 0.01, STOREY, zc - half, bx1, W, zc + half, BRICK.deep, { win: HALL_NARROW, seed: 0.44, faces: 'NES' });
    b.box(x1 - 0.01, W, zc - half, bx1 + 0.04, FRIEZE, zc + half, TERRA_COTTA, { faces: 'NES' });
    for (const s of [-1, 0, 1]) arched(b, 'E', bx1, zc + s * 1.12, 0.35, 0.78, 2.15, BASE, 1.25);
    nameBoard(k, 'quad-west-lincoln', 'E', bx1, zc, STOREY + 0.32, 0.5, 2.9);
    steps(b, zc - half, zc + half, bx1, 0.35, 'E', LIMESTONE, 0.45);
    k.lights.push({ x: bx1 + 2.5, z: zc, r: 10, color: '#ffe2ae', k: 0.55 });
    k.person(bx1 + 0.9, zc - 1.2);
    k.person(bx1 + 0.5, zc + 0.6, 0.12);
  }
  // the back, on Wright Street: a plain door in stone
  b.box(x0 - 0.3, 0, zc - 0.8, x0, 2.6, zc + 0.8, LIMESTONE, { faces: 'NSWT' });
  b.box(x0 - 0.34, 0.15, zc - 0.5, x0 - 0.3, 2.0, zc + 0.5, DARK, { faces: 'W', win: interior(1.0) });
}

// ---------------------------------------------------------------------------
// Gregory Hall
// ---------------------------------------------------------------------------

/**
 * Red brick Georgian of 1939 with limestone trim, at the Quad's south-west
 * corner: a base and bands of stone, white stone at the corners, a hipped
 * slate roof with dormers, and on the Quad side a pavilion under a pediment
 * with an arched stone doorway.
 */
function gregoryHall(k: Build, l: LotDef): void {
  const b = k.b;
  const W = 3 * STOREY, EAVE = W + 0.4, RISE = 2.4;
  const x0 = l.x0 + 0.3, x1 = l.x1 - 0.6, z0 = l.z0 + 0.3, z1 = l.z1 - 0.3, zc = (z0 + z1) / 2;
  b.box(x0, 0, z0, x1, W, z1, BRICK.red, { win: HALL, seed: 0.91, faces: 'NESW' });
  b.box(x0 - 0.07, 0, z0 - 0.07, x1 + 0.07, 0.8, z1 + 0.07, LIMESTONE, { faces: 'NESWT' });
  b.box(x0 - 0.05, STOREY - 0.08, z0 - 0.05, x1 + 0.05, STOREY + 0.1, z1 + 0.05, LIMESTONE, { faces: 'NESWTB' });
  b.box(x0 - 0.25, W, z0 - 0.25, x1 + 0.25, EAVE, z1 + 0.25, LIMESTONE, { faces: 'NESWB' });
  // white stone at the corners
  for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) {
    const sx = x === x0 ? 1 : -1, sz = z === z0 ? 1 : -1;
    b.box(Math.min(x, x + sx * 0.4) - 0.04, 0.8, Math.min(z, z + sz * 0.4) - 0.04, Math.max(x, x + sx * 0.4) + 0.04, W, Math.max(z, z + sz * 0.4) + 0.04, LIMESTONE, { faces: (sz > 0 ? 'N' : 'S') + (sx > 0 ? 'W' : 'E') });
  }
  // limestone heads and sills at every window
  lintels(b, 'E', x1, z0, z1, HALL, [0, 1, 2], LIMESTONE, true);
  lintels(b, 'S', z1, x0, x1, HALL, [0, 1, 2], LIMESTONE, true);
  lintels(b, 'N', z0, x0, x1, HALL, [0, 1, 2], LIMESTONE);
  lintels(b, 'W', x0, z0, z1, HALL, [0, 1, 2], LIMESTONE);
  hip(b, x0, z0, x1, z1, EAVE, RISE, SLATE, 0.4);
  {
    const run = (z1 - z0) / 2 + 0.4, up = 1.3, sill = EAVE + ((up + 0.4) * RISE) / run - 0.12;
    for (const x of [x0 + 2.6, x0 + 5.4, x1 - 2.4]) {
      dormer(b, x, z0 + up, sill, 'N', SLATE);
      dormer(b, x, z1 - up, sill, 'S', SLATE);
    }
  }
  for (const x of [x0 + 1.2, x1 - 1.6]) chimney(b, x, zc, EAVE + 1.4, EAVE + RISE + 0.9, BRICK.deep, 0.5, 0.4);

  // the Quad pavilion, under a pediment, with an arched doorway of stone and the name over it
  {
    const half = 1.7, px1 = l.x1;
    // (its ground storey is plain, behind the doorway; three windows to a storey above it)
    const pw: WinSpec = { ...HALL_NARROW, cell: (2 * half) / 3 };
    b.box(x1 - 0.01, 0, zc - half, px1, STOREY, zc + half, BRICK.red, { faces: 'NES' });
    b.box(x1 - 0.01, STOREY, zc - half, px1, W, zc + half, BRICK.red, { win: pw, seed: 0.27, faces: 'NES' });
    lintels(b, 'E', px1, zc - half, zc + half, pw, [1, 2], LIMESTONE, true);
    // a small balcony of stone under the middle window of the second storey
    b.box(px1, STOREY + 0.35, zc - 0.55, px1 + 0.35, STOREY + 0.5, zc + 0.55, LIMESTONE, { faces: 'NESTB' });
    b.box(x1, 0, zc - half - 0.07, px1 + 0.07, 0.8, zc + half + 0.07, LIMESTONE, { faces: 'NEST' });
    b.box(x1, W, zc - half - 0.25, px1 + 0.25, EAVE, zc + half + 0.25, LIMESTONE, { faces: 'NESB' });
    for (const s of [-1, 1]) b.box(px1 - 0.3, 0.8, zc + s * half - 0.04 - (s > 0 ? 0.36 : 0), px1 + 0.05, W, zc + s * half + 0.04 + (s < 0 ? 0.36 : 0), LIMESTONE, { faces: 'NES' });
    gable(b, x1 - 2.6, zc - half, px1, zc + half, EAVE, 1.3, SLATE, LIMESTONE, 'x', 0.28);
    roundel(b, [px1 + 0.03, EAVE + 0.5, zc], 0.3, 'E', GLASS, { win: interior(0.8) }, 8);
    // the doorway: a frame of stone, the door and its fanlight
    b.box(px1, 0, zc - 0.85, px1 + 0.12, 2.75, zc + 0.85, LIMESTONE, { faces: 'NEST' });
    arched(b, 'E', px1 + 0.12, zc, 0.3, 1.0, 2.25, TRIM, 1.25);
    nameBoard(k, 'quad-west-gregory', 'E', px1 + 0.06, zc, 3.0, 0.42, 2.6);
    steps(b, zc - 0.9, zc + 0.9, px1 + 0.12, 0.3, 'E', LIMESTONE, 0.45);
    wallLamp(k, px1 + 0.2, 1.7, zc - 1.15);
    wallLamp(k, px1 + 0.2, 1.7, zc + 1.15);
    k.lights.push({ x: px1 + 2.4, z: zc, r: 10, color: '#ffe2ae', k: 0.55 });
    k.person(px1 + 0.8, zc + 1.4);
    k.person(px1 + 1.2, zc - 0.7);
  }
  // the back, on Wright Street: a door under a stone hood
  b.box(x0 - 0.04, 0.2, zc - 0.5, x0, 2.0, zc + 0.5, DARK, { faces: 'W', win: interior(1.0) });
  b.box(x0 - 0.45, 2.1, zc - 0.75, x0, 2.25, zc + 0.75, LIMESTONE, { faces: 'NSWTB' });
}

/** The models, by the id of their lot in plan.ts. */
export const MODELS: Record<string, Model> = {
  'alma-mater': almaMater,
  altgeld,
  henry,
  english,
  'lincoln-hall': lincolnHall,
  'gregory-hall': gregoryHall,
};

/** Whatever this file builds that is not a lot. */
export function extras(k: Build): void {
  void k;
}
