// South of the Quad: the Main Library and its plaza, the Morrow Plots, the
// South Quad with the McFarland bell tower, the Stock Pavilion, the ACES
// Library, Mumford Hall, David Kinley Hall and the Business Instructional
// Facility.
//
// The opening view sees the south and east sides first: the library's east
// front with its three arches, the bell tower from all round, the Stock
// Pavilion's long south side. Those are built with the most care, and every
// other side is built too. Each university building carries its name once, as
// plain lettering on a plain board.

import { interior, rng, type GeoBuilder, type QuadOpts, type V3, type WinSpec } from '../../engine/geo';
import { area, rect } from '../../engine/ground';
import { archway, figure, roundel, tri, type Dress } from '../../engine/parts';
import { gable, hip, railing, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import {
  BASE, BRICK, BRONZE, DARK, FELT, GLASS, GREEN_SLATE, HALL, IRON, LIMESTONE, SLATE, STOREY, TRIM, VERDIGRIS,
  chimney, column, dormer, steps,
} from './look';
import { AREAS, type LotDef, type Model } from './plan';

// ---------------------------------------------------------------------------
// Colours and glazing this file needs that look.ts has not
// ---------------------------------------------------------------------------

/** The paving of walks and plazas, the wood of a bench, and the green of a planter. */
const PAVING = 0xcfc6b4, WOOD = 0x8a6446, PLANTING = 0x5a7f3e;
/** The Business Instructional Facility's zinc roof, the blue-black of solar panels, and its roof garden. */
const ZINC = 0x9aa3a8, SOLAR = 0x2c3e66, ROOF_GARDEN = 0x6f9a55;
/** The corn of the Morrow Plots: two greens and the gold of ripe corn, each with its tassels. */
const CORN = [
  { stalk: 0x6d8f3a, top: 0xc9b04a, h: 2.0 },
  { stalk: 0x587f34, top: 0x8fa846, h: 1.85 },
  { stalk: 0xc4a14a, top: 0xe0c565, h: 2.1 },
];
/** Cattle: a black Angus, a Hereford and a Holstein, and the white of a face or a patch. */
const ANGUS = 0x1f1d20, HEREFORD = 0x7a3b22, HOLSTEIN = 0xece8de, HIDE_WHITE = 0xeeeadf;

/** The library's bookstack wing: rows of narrow slits. */
const STACK_WIN: WinSpec = { cell: 1.0, storey: STOREY, lit: 0.3, kind: 6 };
/** The ACES Library's large windows. */
const ACES_WIN: WinSpec = { cell: 1.35, storey: STOREY, lit: 0.45, kind: 0 };
/** The Business Instructional Facility's windows: tall, close-set panes between brick piers. */
const BIF_WIN: WinSpec = { cell: 1.4, storey: STOREY, lit: 0.5, kind: 0 };
/** A wall of glass from floor to roof. */
const CURTAIN: WinSpec = { cell: 1.0, storey: STOREY, lit: 0.75, kind: 1 };

// ---------------------------------------------------------------------------
// Signs: each building's name, white with navy lettering
// ---------------------------------------------------------------------------

const board = (id: string, lines: string[]): SignDef => {
  const longest = Math.max(...lines.map((s) => s.length));
  const aspect = Math.max(2.4, (longest * 0.6) / (lines.length > 1 ? 1.7 : 1));
  const high = 52 * lines.length;
  return { id, lines, color: '#f3f0e7', ink: '#13294b', aspect, kind: 'board', real: true, size: [Math.round(high * aspect), high] };
};

export const SIGNS: SignDef[] = [
  board('south-campus-library', ['MAIN LIBRARY']),
  board('south-campus-stock-pavilion', ['STOCK PAVILION']),
  board('south-campus-aces', ['ACES LIBRARY', 'INFORMATION & ALUMNI CENTER']),
  board('south-campus-mumford', ['MUMFORD HALL']),
  board('south-campus-kinley', ['DAVID KINLEY HALL']),
  board('south-campus-business', ['BUSINESS INSTRUCTIONAL', 'FACILITY']),
  board('south-campus-morrow', ['MORROW PLOTS', '1876']),
];

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

type Face = 'N' | 'E' | 'S' | 'W';
const NORMAL: Record<Face, V3> = { N: [0, 0, -1], E: [1, 0, 0], S: [0, 0, 1], W: [-1, 0, 0] };
/** A point on a wall that faces `f` and lies in the plane `plane`: `u` runs along the wall, and `d` is how far out from it. */
const onFace = (f: Face, plane: number) => (u: number, y: number, d: number): V3 =>
  f === 'N' ? [u, y, plane - d] : f === 'S' ? [u, y, plane + d] : f === 'E' ? [plane + d, y, u] : [plane - d, y, u];

/** A box on a wall, from `u0` to `u1` along it, `y0` to `y1` up it, and `d0` to `d1` out from it. */
function onWall(b: GeoBuilder, f: Face, plane: number, u0: number, u1: number, y0: number, y1: number, d0: number, d1: number, color: number, o: { faces?: string; win?: WinSpec } = {}): void {
  const P = onFace(f, plane), a = P(u0, y0, d0), c = P(u1, y1, d1);
  b.box(Math.min(a[0], c[0]), y0, Math.min(a[2], c[2]), Math.max(a[0], c[0]), y1, Math.max(a[2], c[2]), color, o);
}

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
  archShape(b, f, plane, u, y0 - 0.1, w + 0.3, spring, 0.03, stone);
  archShape(b, f, plane, u, y0, w, spring, 0.06, glass, { win: interior(lit) });
}

/** A row of `n` round-arched windows `w` wide, from `u0` to `u1` along a wall. */
function arcade(b: GeoBuilder, f: Face, plane: number, u0: number, u1: number, n: number, y0: number, h: number, w: number, stone: number, lit = 0.55): void {
  const step = (u1 - u0) / n;
  for (let i = 0; i < n; i++) arched(b, f, plane, u0 + (i + 0.5) * step, y0, Math.min(w, step * 0.7), h, stone, lit, GLASS);
}

/**
 * A head of stone over each window of a wall glazed with `win`, in the storeys
 * listed (0 is the ground storey), and a sill under it: the windows are where
 * the engine draws them, so the heads are worked out the same way.
 */
function lintels(b: GeoBuilder, f: Face, plane: number, u0: number, u1: number, win: WinSpec, rows: number[], color: number): void {
  const n = Math.max(1, Math.floor((u1 - u0) / win.cell + 0.5)), cw = (u1 - u0) / n, P = onFace(f, plane), nn = NORMAL[f];
  for (const r of rows) {
    for (let i = 0; i < n; i++) {
      const a = u0 + (i + 0.14) * cw, c = u0 + (i + 0.86) * cw;
      for (const [y0, y1] of [[r + 0.8, r + 0.92], [r + 0.13, r + 0.2]]) {
        const ya = y0 * win.storey, yb = y1 * win.storey;
        b.quad(P(a, ya, 0.07), P(c, ya, 0.07), P(c, yb, 0.07), P(a, yb, 0.07), nn, color);
        b.quad(P(a, yb, 0), P(c, yb, 0), P(c, yb, 0.07), P(a, yb, 0.07), [0, 1, 0], color);
      }
    }
  }
}

/** A name board on a wall: a thin white board, and the sign a hair in front of it. */
function nameBoard(k: Build, id: string, f: Face, plane: number, u: number, y: number, h: number, w: number): void {
  onWall(k.b, f, plane, u - w / 2, u + w / 2, y - h / 2, y + h / 2, 0, 0.06, TRIM, { faces: 'NESWTB' });
  const s = onFace(f, plane)(u, y, 0.09), n = NORMAL[f];
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

/** A square planter of stone with something growing in it. */
function planter(b: GeoBuilder, x: number, z: number, s: number, seed: number): void {
  b.box(x - s, 0, z - s, x + s, 0.6, z + s, LIMESTONE, { top: PLANTING });
  const r = rng(seed);
  for (let i = 0; i < 3; i++) {
    const px = x + (r() - 0.5) * s, pz = z + (r() - 0.5) * s, c = [0xe08a2a, 0xd9b23a, 0x9b4a8f, 0x6f9a4a][Math.floor(r() * 4)];
    b.box(px - 0.17, 0.6, pz - 0.17, px + 0.17, 0.85, pz + 0.17, c);
  }
}

/** A lamp on the wall beside a door. */
const wallLamp = (k: Build, x: number, y: number, z: number): void => {
  k.glows.push({ x, y, z, sx: 0.22, sy: 0.32, sz: 0.22, color: '#ffe2ae' });
};

/** A patch of paving on the ground, above the lawns. */
const walk = (k: Build, x0: number, z0: number, x1: number, z1: number, y = 0.035): void => area(k, rect(x0, z0, x1, z1), PAVING, y);

// ---------------------------------------------------------------------------
// The Main Library
// ---------------------------------------------------------------------------

/**
 * Charles Platt's Georgian Revival library of 1924 to 1929: red brick with
 * limestone, a slate roof with dormers and four tall chimneys. Here it lies
 * long from west to east. Its main front looks east, to the plaza: a range
 * across the whole lot with a pavilion of limestone in its middle, three
 * arched doorways in that, the name over them, and two limestone figures
 * beside the steps. West of the front range runs the reading-room range,
 * whose high arched windows light the reading rooms on both its long sides,
 * and west of that the bookstack wing, plain brick with narrow slits.
 */
function library(k: Build, l: LotDef): void {
  const b = k.b;
  const W = 3 * STOREY, ATTIC = l.h - 0.8, EAVE = l.h - 0.4, RISE = Math.min(2.8, l.h + 3.2 - EAVE);
  // the front range (E), the reading-room range (C) and the bookstack wing (S)
  const ex0 = l.x1 - 6, ex1 = l.x1 - 0.2, ez0 = l.z0 + 0.2, ez1 = l.z1 - 0.2, zc = (ez0 + ez1) / 2;
  const cx0 = l.x0 + 3.5, cz0 = l.z0 + 1.1, cz1 = l.z1 - 0.7;
  const sx0 = l.x0 + 0.15, sz0 = l.z0 + 0.5, sz1 = l.z1 - 1.3;

  /** A range of brick: a glazed ground storey, plain brick above it to the attic, a stone base, a band and a cornice. */
  const range = (x0: number, z0: number, x1: number, z1: number, faces: string, seed: number, lift = 0): void => {
    b.box(x0, 0, z0, x1, STOREY, z1, BRICK.red, { win: HALL, seed, faces });
    b.box(x0, STOREY, z0, x1, ATTIC, z1, BRICK.red, { faces });
    // (`lift` keeps a range's bands and cornice out of the plane of its neighbour's where the two overlap)
    const g = (f: string, d: number): [number, number, number, number] => [
      x0 - (f.includes('W') ? d : 0), z0 - (f.includes('N') ? d : 0), x1 + (f.includes('E') ? d : 0), z1 + (f.includes('S') ? d : 0),
    ];
    const [a0, b0, a1, b1] = g(faces, 0.07);
    b.box(a0, 0, b0, a1, 0.75 + lift, b1, BASE, { faces: faces + 'T' });
    const [c0, d0, c1, d1] = g(faces, 0.06);
    b.box(c0, STOREY - 0.1 + lift, d0, c1, STOREY + 0.12 + lift, d1, LIMESTONE, { faces: faces + 'TB' });
    // a string course at the heads of the arches, and the cornice
    b.box(c0, W - 0.12 + lift, d0, c1, W + 0.05 + lift, d1, LIMESTONE, { faces: faces + 'TB' });
    const [e0, f0, e1, f1] = g(faces, 0.3);
    b.box(e0, ATTIC + lift, f0, e1, EAVE, f1, LIMESTONE, { faces: faces + 'B' });
  };

  // the front range, its ridge from north to south
  range(ex0, ez0, ex1, ez1, 'NESW', 0.21);
  hip(b, ex0, ez0, ex1, ez1, EAVE, RISE, GREEN_SLATE, 0.5);
  // the reading-room range, its ridge from west to east, running into the front range's roof
  range(cx0, cz0, ex0, cz1, 'NSW', 0.27, 0.025);
  hip(b, cx0, cz0, ex0 + 3, cz1, EAVE, RISE - 0.4, GREEN_SLATE, 0.5);
  // white stone at the front range's corners
  for (const [x, z] of [[ex1, ez0], [ex1, ez1], [ex0, ez1], [ex0, ez0]]) {
    b.box(x - 0.3, 0.75, z - 0.3, x + 0.3, ATTIC, z + 0.3, LIMESTONE, { faces: 'NESW' });
  }

  // the bookstack wing: narrow slits, a parapet and a flat roof
  b.box(sx0, 0, sz0, cx0, W, sz1, BRICK.red, { win: STACK_WIN, seed: 0.33, faces: 'NSW' });
  b.box(sx0 - 0.06, 0, sz0 - 0.06, cx0, 0.7, sz1 + 0.06, BASE, { faces: 'NSWT' });
  b.box(sx0 - 0.08, W, sz0 - 0.08, cx0, W + 0.7, sz1 + 0.08, LIMESTONE, { faces: 'NSWT', top: FELT });

  // the high arched windows of the reading rooms: five on each long side, two on each end of the front range
  const ay = STOREY + 0.4, ah = W - 0.3 - ay;
  arcade(b, 'S', cz1, cx0 + 0.3, ex0 - 0.3, 5, ay, ah, 1.15, LIMESTONE, 0.6);
  arcade(b, 'N', cz0, cx0 + 0.3, ex0 - 0.3, 5, ay, ah, 1.15, LIMESTONE, 0.6);
  arcade(b, 'S', ez1, ex0 + 0.4, ex1 - 0.4, 2, ay, ah, 1.15, LIMESTONE, 0.6);
  arcade(b, 'N', ez0, ex0 + 0.4, ex1 - 0.4, 2, ay, ah, 1.15, LIMESTONE, 0.6);
  // a keystone over each arch of the reading rooms, and a pilaster of stone between each two
  for (const [f, plane] of [['S', cz1], ['N', cz0]] as [Face, number][]) {
    const n = 5, step = (ex0 - 0.3 - (cx0 + 0.3)) / n, top = ay + ah + 0.08;
    for (let i = 0; i < n; i++) onWall(b, f, plane, cx0 + 0.3 + (i + 0.5) * step - 0.14, cx0 + 0.3 + (i + 0.5) * step + 0.14, top - 0.3, top + 0.12, 0, 0.1, LIMESTONE, { faces: f + 'EWTB' });
    for (let i = 0; i <= n; i++) onWall(b, f, plane, cx0 + 0.3 + i * step - 0.17, cx0 + 0.3 + i * step + 0.17, STOREY + 0.12, W - 0.12, 0, 0.09, LIMESTONE, { faces: f + 'EW' });
  }
  // stone heads and sills at the ground storey's windows
  lintels(b, 'S', cz1, cx0, ex0, HALL, [0], LIMESTONE);
  lintels(b, 'N', cz0, cx0, ex0, HALL, [0], LIMESTONE);
  lintels(b, 'S', ez1, ex0, ex1, HALL, [0], LIMESTONE);
  lintels(b, 'N', ez0, ex0, ex1, HALL, [0], LIMESTONE);
  lintels(b, 'E', ex1, ez0, pz0Of(zc), HALL, [0], LIMESTONE);
  lintels(b, 'E', ex1, pz1Of(zc), ez1, HALL, [0], LIMESTONE);

  // -------------------------------------------------------------------------
  // The east front: a pavilion of limestone with three arched doorways
  // -------------------------------------------------------------------------
  const half = LIB_PAVILION, pz0 = pz0Of(zc), pz1 = pz1Of(zc), px1 = l.x1 + 0.9, top = W + 0.9;
  {
    // the arched windows of the front either side of the pavilion
    arcade(b, 'E', ex1, ez0 + 0.4, pz0 - 0.15, 1, ay, ah, 1.1, LIMESTONE, 0.6);
    arcade(b, 'E', ex1, pz1 + 0.15, ez1 - 0.4, 1, ay, ah, 1.1, LIMESTONE, 0.6);
    // the pavilion, with a balustrade on it
    b.box(ex1, 0, pz0, px1, top - 0.35, pz1, LIMESTONE, { faces: 'NES' });
    b.box(ex1, 0, pz0 - 0.08, px1 + 0.08, 0.75, pz1 + 0.08, BASE, { faces: 'NEST' });
    b.box(ex1, top - 0.35, pz0 - 0.1, px1 + 0.1, top, pz1 + 0.1, LIMESTONE, { faces: 'NESTB' });
    b.box(px1 - 0.3, top, pz0, px1 + 0.02, top + 0.5, pz1, TRIM, { faces: 'NESWT' });
    for (const s of [-1, 1]) b.box(ex1, top, zc + s * half - (s > 0 ? 0.3 : 0), px1 - 0.3, top + 0.5, zc + s * half + (s < 0 ? 0.3 : 0), TRIM, { faces: 'NSWT' });
    // three arched doorways, lit from within, and three tall arched windows over them
    for (const s of [-1, 0, 1]) {
      arched(b, 'E', px1, zc + s * 1.25, 0.45, 0.95, 3.0, BASE, 1.3);
      arched(b, 'E', px1, zc + s * 1.25, 4.75, 0.8, 3.45, BASE, 0.75, GLASS);
    }
    nameBoard(k, 'south-campus-library', 'E', px1, zc, 4.05, 0.55, 3.5);
    steps(b, pz0 + 0.1, pz1 - 0.1, px1, 0.45, 'E', LIMESTONE, 0.3);
    // the two limestone figures, on plinths either side of the steps
    for (const s of [-1, 1]) {
      const x = px1 + 0.3, z = zc + s * (half + 0.45);
      b.box(x - 0.3, 0, z - 0.3, x + 0.3, 0.95, z + 0.3, LIMESTONE);
      b.cyl(x, z, 0.95, 2.05, 0.24, 0.17, 6, BASE, { cap: false });
      b.box(x - 0.13, 2.05, z - 0.13, x + 0.13, 2.38, z + 0.13, BASE);
    }
    wallLamp(k, px1 + 0.12, 2.6, pz0 + 0.25);
    wallLamp(k, px1 + 0.12, 2.6, pz1 - 0.25);
    k.lights.push({ x: px1 + 2.5, z: zc, r: 11, color: '#ffe2ae', k: 0.6 });
    k.lights.push({ x: (cx0 + ex0) / 2, z: l.z1 + 1.5, r: 9, color: '#ffe2ae', k: 0.4 });
    k.person(px1 + 0.6, zc - 0.7, 0);
    k.person(px1 + 0.3, zc + 0.9, 0.15);
  }

  // dormers on the front range's east slope, and on the reading-room range's south and north slopes
  {
    const run = (ex1 - ex0) / 2 + 0.5, up = 1.3, sill = EAVE + ((up + 0.5) * RISE) / run - 0.15;
    for (const z of [zc - 1.95, zc - 0.65, zc + 0.65, zc + 1.95]) dormer(b, ex1 - up, z, sill, 'E', GREEN_SLATE);
    const runC = (cz1 - cz0) / 2 + 0.5, upC = 1.25, sillC = EAVE + ((upC + 0.5) * (RISE - 0.4)) / runC - 0.15;
    for (const x of [cx0 + 2.4, cx0 + 4.0, cx0 + 5.6]) {
      dormer(b, x, cz1 - upC, sillC, 'S', GREEN_SLATE);
      dormer(b, x, cz0 + upC, sillC, 'N', GREEN_SLATE);
    }
  }
  // four tall chimneys, near the front range's corners
  for (const x of [ex0 + 1.0, ex1 - 1.0]) for (const z of [ez0 + 1.0, ez1 - 1.0]) chimney(b, x, z, EAVE, l.h + 3.2, BRICK.deep, 0.5, 0.36);
}

/** Where the library's east pavilion begins and ends, either side of the middle of its front. */
const LIB_PAVILION = 1.95;
const pz0Of = (zc: number): number => zc - LIB_PAVILION, pz1Of = (zc: number): number => zc + LIB_PAVILION;

/** The plaza east of the library: benches, planters and people. Foellinger stands to its north. */
function libraryPlaza(k: Build): void {
  const p = AREAS.find((a) => a.id === 'library-plaza');
  if (!p) return;
  const b = k.b;
  const cx = (p.x0 + p.x1) / 2;
  for (const [x, z] of [[p.x0 + 1.4, p.z0 + 1.0], [p.x1 - 1.0, p.z0 + 1.0], [p.x1 - 1.0, p.z1 - 0.9]]) planter(b, x, z, 0.6, Math.round(x * 13 + z));
  bench(b, cx - 2.3, p.z0 + 0.9, 'x', -1);
  bench(b, cx + 1.7, p.z0 + 0.9, 'x', -1);
  bench(b, p.x1 - 0.7, (p.z0 + p.z1) / 2, 'z', 1);
  k.person(cx - 2.6, p.z0 + 1.9);
  k.person(cx - 1.4, p.z0 + 2.4);
  k.person(cx + 1.0, p.z0 + 3.4);
  k.person(cx + 2.4, p.z1 - 1.6);
  k.person(p.x0 + 2.2, p.z1 - 2.2);
  k.lights.push({ x: cx, z: (p.z0 + p.z1) / 2, r: 9, color: '#ffe2ae', k: 0.4 });
}

// ---------------------------------------------------------------------------
// The McFarland Memorial Bell Tower
// ---------------------------------------------------------------------------

/**
 * A memorial, and a bell tower and nothing more: a square shaft of brick on a
 * base of limestone, with piers at its corners, a narrow slot of window up
 * each face and bands of stone; an open belfry with two tall arches on each
 * side, where the bells hang; a stone cornice and a low pyramid roof with a
 * finial. No lettering, nothing staged at its foot.
 */
function bellTower(k: Build, l: LotDef): void {
  const b = k.b;
  const cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, half = Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2 - 0.1;
  const x0 = cx - half, x1 = cx + half, z0 = cz - half, z1 = cz + half;
  const BASE_TOP = 2.4, BEL = l.h - 4.6, TOP = l.h - 0.7, CORNICE = l.h - 0.25, CAP = l.h + 2.7;
  // the plinth, and the base of limestone
  b.box(x0 - 0.45, 0, z0 - 0.45, x1 + 0.45, 0.4, z1 + 0.45, LIMESTONE);
  b.box(x0 - 0.12, 0.4, z0 - 0.12, x1 + 0.12, BASE_TOP, z1 + 0.12, LIMESTONE, { faces: 'NESWT' });
  // the shaft, and a pier of brick at each corner that stands out from it
  b.box(x0, BASE_TOP, z0, x1, BEL, z1, BRICK.red, { faces: 'NESW' });
  const p = 0.62;
  for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) {
    b.box(x - (x < cx ? 0.06 : p - 0.06) , BASE_TOP, z - (z < cz ? 0.06 : p - 0.06), x + (x < cx ? p - 0.06 : 0.06), BEL, z + (z < cz ? p - 0.06 : 0.06), BRICK.deep, { faces: 'NESW' });
  }
  // a slot of window up the middle of each face, and two bands of stone
  for (const [f, plane, u] of [['N', z0, cx], ['S', z1, cx], ['E', x1, cz], ['W', x0, cz]] as [Face, number, number][]) {
    onWall(b, f, plane, u - 0.26, u + 0.26, BASE_TOP + 1.6, BEL - 1.3, 0, 0.04, DARK, { faces: f, win: interior(0.35) });
  }
  for (const y of [BASE_TOP + 5.2, BASE_TOP + 10.4]) b.box(x0 - 0.1, y, z0 - 0.1, x1 + 0.1, y + 0.3, z1 + 0.1, LIMESTONE, { faces: 'NESWTB' });
  // the floor of the belfry, which is the band of stone under it
  b.box(x0 - 0.12, BEL - 0.4, z0 - 0.12, x1 + 0.12, BEL + 0.05, z1 + 0.12, LIMESTONE, { faces: 'NESWTB', top: BASE });

  // the belfry: four corner piers, and on each side two open arches with a pier between them
  const fl = BEL + 0.05, cp = 0.55, mull = 0.4, w = (2 * half - 2 * cp - mull) / 2, spring = TOP - 0.85 - w / 2, deep = 0.35;
  for (const [x, z] of [[x0, z0], [x1 - cp, z0], [x1 - cp, z1 - cp], [x0, z1 - cp]]) b.box(x, fl, z, x + cp, TOP, z + cp, BRICK.red, { faces: 'NESW' });
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    b.moved(cx, 0, cz, yaw, () => {
      // (written for the south side: local x runs along it, and +z is out)
      for (const s of [-1, 1]) archway(b, s * (mull / 2 + w / 2), half - deep, half, w, spring, TOP, BRICK.red, LIMESTONE, 5);
      b.box(-mull / 2, fl, half - deep, mull / 2, TOP, half, BRICK.red, { faces: 'NESW' });
      // a sill of stone under the two arches
      b.box(-half + cp, fl, half - 0.02, half - cp, fl + 0.18, half + 0.1, LIMESTONE, { faces: 'ESWT' });
    });
  }
  // the bells: a great one in the middle, and four smaller round it, on a dark frame
  b.box(cx - 1.0, spring + 0.05, cz - 0.07, cx + 1.0, spring + 0.2, cz + 0.07, IRON, { faces: 'NESWTB' });
  b.box(cx - 0.07, spring + 0.05, cz - 1.0, cx + 0.07, spring + 0.2, cz + 1.0, IRON, { faces: 'NESWTB' });
  b.cyl(cx, cz, spring - 1.1, spring + 0.05, 0.62, 0.3, 8, BRONZE, { cap: BRONZE });
  for (const [dx, dz] of [[-0.62, -0.62], [0.62, -0.62], [0.62, 0.62], [-0.62, 0.62]]) {
    b.cyl(cx + dx, cz + dz, spring - 0.55, spring + 0.05, 0.3, 0.15, 6, BRONZE, { cap: BRONZE });
  }
  // the cornice, with its underside the belfry's ceiling, a low pyramid of slate, and a finial
  b.box(x0 - 0.22, TOP, z0 - 0.22, x1 + 0.22, CORNICE, z1 + 0.22, LIMESTONE, { faces: 'NESWTB' });
  b.cyl(cx, cz, CORNICE, CAP, (half + 0.1) * Math.SQRT2, 0.05, 4, SLATE, { phase: Math.PI / 4, cap: false });
  b.cyl(cx, cz, CAP - 0.15, CAP + 1.0, 0.09, 0.02, 4, BRONZE, { phase: Math.PI / 4, cap: false });
  b.cyl(cx, cz, CAP + 0.1, CAP + 0.35, 0.14, 0.14, 6, BRONZE);

  // by night: the bells lit from below, and the tower washed in light from its foot
  k.glows.push({ x: cx, y: fl + 0.3, z: cz, sx: 1.6, sy: 0.12, sz: 1.6, color: '#ffe2ae' });
  for (const [dx, dz] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    k.glows.push({ x: cx + dx * (half + 0.3), y: 0.5, z: cz + dz * (half + 0.3), sx: 0.25, sy: 0.12, sz: 0.25, color: '#fff1d0' });
  }
  k.lights.push({ x: cx + 2, z: cz + 2, r: 11, color: '#ffe2ae', k: 0.55 });
  k.lights.push({ x: cx - 2, z: cz - 2, r: 9, color: '#ffe2ae', k: 0.4 });
}

/** The South Quad's walks: a square of paving round the tower, a walk from it south to the Stock Pavilion, and one from west to east. People, none near the tower. */
function southQuad(k: Build): void {
  const q = AREAS.find((a) => a.id === 'south-quad');
  if (!q) return;
  const t = { x0: 34, z0: 16, x1: 38, z1: 20 };
  const cx = (t.x0 + t.x1) / 2, cz = (t.z0 + t.z1) / 2;
  walk(k, cx - 3.2, q.z0 + 0.1, cx + 3.2, cz + 3.1);
  walk(k, cx - 0.75, cz + 3.1, cx + 0.75, q.z1);
  walk(k, q.x0, cz + 6.2, q.x1, cz + 7.6, 0.036);
  const people: [number, number][] = [[q.x0 + 2.2, q.z0 + 3.1], [q.x0 + 4.0, cz + 7.0], [q.x0 + 4.9, cz + 6.6], [q.x1 - 2.5, q.z0 + 2.0], [q.x1 - 4.2, cz + 7.1], [cx + 0.3, q.z1 - 1.5]];
  for (const [x, z] of people) {
    // (none within three units of the tower's foot)
    if (x > t.x0 - 3.5 && x < t.x1 + 3.5 && z > t.z0 - 3.5 && z < t.z1 + 3.5) continue;
    k.person(x, z);
  }
}

// ---------------------------------------------------------------------------
// The Stock Pavilion
// ---------------------------------------------------------------------------

/**
 * A long hall of red brick for showing and judging livestock, of 1913: two
 * storeys of wall with tall arched windows between piers, a great gable roof
 * over the arena with a long glazed monitor on its ridge to light it, and
 * ventilators on that. Five limestone medallions of animals' heads are set in
 * the south wall. The door the cattle go in by is at the east end, under a
 * gable of its own, with the name over it.
 */
function stockPavilion(k: Build, l: LotDef): void {
  const b = k.b;
  const x0 = l.x0 + 0.3, x1 = l.x1 - 0.6, z0 = l.z0 + 0.3, z1 = l.z1 - 0.3, zc = (z0 + z1) / 2;
  const W = 2 * STOREY, EAVE = W + 0.35, RISE = Math.min(2.6, l.h + 0.8 - EAVE);
  b.box(x0, 0, z0, x1, W, z1, BRICK.red, { faces: 'NESW' });
  b.box(x0 - 0.07, 0, z0 - 0.07, x1 + 0.07, 0.7, z1 + 0.07, BASE, { faces: 'NESWT' });
  b.box(x0 - 0.3, W, z0 - 0.3, x1 + 0.3, EAVE, z1 + 0.3, LIMESTONE, { faces: 'NESWB' });
  gable(b, x0, z0, x1, z1, EAVE, RISE, SLATE, BRICK.red, 'x', 0.4);
  // the long sides: tall arched windows, and piers between them on the south
  const n = 8, step = (x1 - x0 - 1.6) / n;
  arcade(b, 'S', z1, x0 + 0.8, x1 - 0.8, n, 1.1, 3.9, 1.25, LIMESTONE, 0.55);
  arcade(b, 'N', z0, x0 + 0.8, x1 - 0.8, n, 1.1, 3.9, 1.25, LIMESTONE, 0.55);
  for (let i = 0; i <= n; i++) {
    const x = x0 + 0.8 + i * step;
    onWall(b, 'S', z1, x - 0.2, x + 0.2, 0.7, W, 0, 0.12, BRICK.deep, { faces: 'ESWT' });
  }
  // five medallions of stone between the windows, under the cornice
  for (const i of [2, 3, 4, 5, 6]) {
    const x = x0 + 0.8 + i * step;
    roundel(b, [x, W - 0.55, z1 + 0.14], 0.28, 'S', LIMESTONE, {}, 8);
  }
  // the west end: a plain door and two windows
  arched(b, 'W', x0, zc, 0.1, 1.6, 2.8, LIMESTONE, 1.0);
  for (const s of [-1, 1]) arched(b, 'W', x0, zc + s * 2.6, 1.1, 1.0, 3.6, LIMESTONE, 0.5, GLASS);

  // the monitor along the ridge, glazed down both its sides, and three ventilators on it
  {
    const rx0 = x0 + 2.4, rx1 = x1 - 2.4, h = 0.8, y0 = EAVE + RISE - 0.6, y1 = EAVE + RISE + 0.7;
    b.box(rx0, y0, zc - h, rx1, y1, zc + h, BRICK.red, { faces: 'NESW' });
    for (const s of [-1, 1]) b.box(rx0 + 0.3, y1 - 0.75, zc + s * h - (s < 0 ? 0.04 : 0), rx1 - 0.3, y1 - 0.12, zc + s * h + (s > 0 ? 0.04 : 0), GLASS, { faces: s > 0 ? 'S' : 'N', win: interior(0.7) });
    gable(b, rx0, zc - h, rx1, zc + h, y1, 0.55, SLATE, BRICK.red, 'x', 0.25);
    for (const t of [0.2, 0.5, 0.8]) {
      const x = rx0 + (rx1 - rx0) * t, y = y1 + 0.35;
      b.box(x - 0.3, y - 0.2, zc - 0.3, x + 0.3, y + 0.45, zc + 0.3, TRIM, { faces: 'NESW' });
      b.cyl(x, zc, y + 0.45, y + 0.9, 0.6, 0.05, 4, SLATE, { phase: Math.PI / 4, cap: false });
    }
  }

  // the east door: a front of brick under a gable of its own, the arched door, and the name over it
  {
    const half = 2.1, fx0 = x1 - 1.2, fx1 = l.x1 - 0.05, top = W + 0.6;
    b.box(fx0, 0, zc - half, fx1, top, zc + half, BRICK.red, { faces: 'NES' });
    b.box(fx0, 0, zc - half - 0.07, fx1 + 0.07, 0.7, zc + half + 0.07, BASE, { faces: 'NEST' });
    b.box(fx0, top - 0.3, zc - half - 0.12, fx1 + 0.12, top, zc + half + 0.12, LIMESTONE, { faces: 'NESB' });
    gable(b, fx0, zc - half, fx1, zc + half, top, 1.5, SLATE, LIMESTONE, 'x', 0.15);
    roundel(b, [fx1 + 0.03, top + 0.55, zc], 0.32, 'E', DARK, { win: interior(0.6) }, 8);
    arched(b, 'E', fx1, zc, 0.05, 2.0, 3.3, LIMESTONE, 1.2);
    nameBoard(k, 'south-campus-stock-pavilion', 'E', fx1, zc, 4.3, 0.6, 3.6);
    wallLamp(k, fx1 + 0.12, 2.6, zc - 1.4);
    wallLamp(k, fx1 + 0.12, 2.6, zc + 1.4);
    k.lights.push({ x: fx1 + 2, z: zc, r: 10, color: '#ffe2ae', k: 0.55 });
    k.lights.push({ x: (x0 + x1) / 2, z: z1 + 1.5, r: 12, color: '#ffe2ae', k: 0.45 });
  }

  // two cattle being led in at the east door, and a third waiting, by people in boots
  {
    const ex = l.x1;
    cow(b, ex + 1.45, zc - 0.25, Math.PI, HEREFORD, HIDE_WHITE);
    cow(b, ex + 1.65, zc + 3.4, -Math.PI / 2, ANGUS, ANGUS);
    cow(b, ex + 1.75, l.z0 + 0.6, Math.PI / 2, HOLSTEIN, ANGUS);
    const boots: Dress = { coat: 0x3d5a80, legs: 0x4a3a2c, hat: 0x6b5236, hatH: 0.22, hatR: 0.36 };
    const plaid: Dress = { coat: 0x9b3a2e, legs: 0x3e4a62, hat: 0xd9cfb4, hatH: 0.2, hatR: 0.34 };
    figure(b, ex + 0.45, zc - 1.05, 0, boots);
    figure(b, ex + 2.55, zc + 2.4, 0, plaid);
    k.person(ex + 2.6, l.z0 + 2.4);
  }
}

/**
 * A cow, as simple shapes: a body, a head with a white face or not, ears,
 * four legs and a tail. It faces along (cos yaw, sin yaw), and is about 2.4
 * long and 1.5 high.
 */
function cow(b: GeoBuilder, x: number, z: number, yaw: number, hide: number, face: number): void {
  b.moved(x, 0, z, yaw, () => {
    b.box(-0.85, 0.62, -0.38, 0.85, 1.38, 0.38, hide, { faces: 'NESWTB' });
    // the head, low and forward, with a muzzle and ears
    b.box(0.8, 0.95, -0.22, 1.3, 1.42, 0.22, face, { faces: 'NESWTB' });
    b.box(1.3, 0.95, -0.17, 1.42, 1.2, 0.17, hide === HOLSTEIN ? 0xd8b7a6 : face, { faces: 'NESWT' });
    b.box(0.95, 1.3, -0.36, 1.08, 1.4, 0.36, hide, { faces: 'NESWTB' });
    for (const [lx, lz] of [[-0.65, -0.24], [-0.65, 0.24], [0.62, -0.24], [0.62, 0.24]]) {
      b.box(lx - 0.09, 0, lz - 0.09, lx + 0.09, 0.62, lz + 0.09, hide === HOLSTEIN ? 0xd6d1c6 : hide, { faces: 'NESW' });
    }
    b.box(-0.98, 0.65, -0.04, -0.85, 1.3, 0.04, hide, { faces: 'NESW' });
    // a black Holstein's patch on each flank
    if (hide === HOLSTEIN) for (const s of [-1, 1]) b.box(-0.45, 0.85, s * 0.38 - 0.01, 0.2, 1.25, s * 0.38 + 0.01, ANGUS, { faces: s > 0 ? 'S' : 'N' });
  });
}

// ---------------------------------------------------------------------------
// The ACES Library, Information and Alumni Center
// ---------------------------------------------------------------------------

/**
 * The Funk ACES Library of 2001: an eight-sided building of brick. Two
 * storeys of brick with large windows and stone at every corner; over them a
 * storey set back and glazed all round; a low roof of eight slopes; and a
 * glazed lantern on top, lit at night. Its door is on the south side, under a
 * glass porch, with the name over it.
 */
function acesLibrary(k: Build, l: LotDef): void {
  const b = k.b;
  const cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, half = Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2 - 0.2;
  const c8 = Math.cos(Math.PI / 8), R = half / c8, ph = Math.PI / 8;
  const LOW = 2 * STOREY, W = 3 * STOREY, setback = 0.9, R2 = (half - setback) / c8;
  const EAVE = W + 0.35, LANTERN = l.h + 0.8, CAP = l.h + 2.6, r = 2.0;
  // the plinth, the two storeys of brick, a band of stone at the foot of the second
  b.cyl(cx, cz, 0, 0.7, R + 0.08, R + 0.08, 8, BASE, { phase: ph, cap: false });
  b.cyl(cx, cz, 0, LOW, R, R, 8, BRICK.red, { phase: ph, win: ACES_WIN, seed: 0.41, cap: false });
  b.cyl(cx, cz, STOREY - 0.1, STOREY + 0.12, R + 0.07, R + 0.07, 8, LIMESTONE, { phase: ph, cap: false });
  // the cornice over the brick, a ring of stone that is the roof of the setback, and the glazed storey over it
  b.cyl(cx, cz, LOW, LOW + 0.3, R + 0.06, R + 0.3, 8, LIMESTONE, { phase: ph, cap: false });
  b.cyl(cx, cz, LOW + 0.3, LOW + 0.4, R + 0.3, R + 0.3, 8, LIMESTONE, { phase: ph, cap: TRIM });
  b.cyl(cx, cz, LOW + 0.4, W, R2, R2, 8, GLASS, { phase: ph, win: CURTAIN, seed: 0.19, cap: false });
  // white mullions down the glazed storey, two to a side
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4, ca = Math.cos(a), sa = Math.sin(a), d = R2 * c8 + 0.04;
    for (const t of [-0.55, 0.55]) b.obox(cx + ca * d - sa * t, (LOW + 0.4 + W) / 2, cz + sa * d + ca * t, 0.06, (W - LOW - 0.4) / 2, 0.08, a, TRIM);
  }
  // stone at the eight corners of the brick
  for (let i = 0; i < 8; i++) {
    const a = ph + (i * Math.PI) / 4;
    b.obox(cx + Math.cos(a) * (R - 0.12), (0.7 + LOW) / 2, cz + Math.sin(a) * (R - 0.12), 0.22, (LOW - 0.7) / 2, 0.22, a + Math.PI / 4, LIMESTONE);
  }
  // the roof: an overhang, eight low slopes with a rib on each hip, and the lantern
  b.cyl(cx, cz, W - 0.05, EAVE, R2 + 0.05, R2 + 0.45, 8, TRIM, { phase: ph, cap: false });
  b.cyl(cx, cz, EAVE, LANTERN - 0.3, R2 + 0.45, r + 0.2, 8, GREEN_SLATE, { phase: ph, cap: false });
  for (let i = 0; i < 8; i++) {
    const a = ph + (i * Math.PI) / 4;
    b.beam([cx + Math.cos(a) * (R2 + 0.45), EAVE + 0.05, cz + Math.sin(a) * (R2 + 0.45)], [cx + Math.cos(a) * (r + 0.2), LANTERN - 0.25, cz + Math.sin(a) * (r + 0.2)], 0.06, 0.06, VERDIGRIS);
  }
  b.cyl(cx, cz, LANTERN - 0.4, LANTERN, r + 0.3, r + 0.3, 8, TRIM, { phase: ph, cap: TRIM });
  b.cyl(cx, cz, LANTERN, CAP - 0.6, r, r, 8, GLASS, { phase: ph, win: interior(1.2), cap: false });
  for (let i = 0; i < 8; i++) {
    const a = ph + (i * Math.PI) / 4;
    b.obox(cx + Math.cos(a) * r, (LANTERN + CAP - 0.6) / 2, cz + Math.sin(a) * r, 0.1, (CAP - 0.6 - LANTERN) / 2, 0.1, a, TRIM);
  }
  b.cyl(cx, cz, CAP - 0.6, CAP - 0.35, r + 0.25, r + 0.25, 8, TRIM, { phase: ph, cap: false });
  b.cyl(cx, cz, CAP - 0.35, CAP + 0.4, r + 0.25, 0.3, 8, GREEN_SLATE, { phase: ph, cap: false });
  b.cyl(cx, cz, CAP + 0.3, CAP + 1.4, 0.08, 0.02, 4, BRONZE, { phase: Math.PI / 4, cap: false });

  // the south door: a porch of glass under a flat roof, and the name over it
  {
    const f = cz + half, pw = 1.7, out = Math.min(1.3, l.z1 + 1.3 - f);
    b.box(cx - pw, 0, f - 0.1, cx + pw, 3.2, f + out - 0.15, GLASS, { faces: 'ESW', win: GLAZED_PORCH });
    b.box(cx - pw - 0.3, 3.2, f - 0.1, cx + pw + 0.3, 3.55, f + out, TRIM, { faces: 'NESWTB' });
    b.box(cx - 0.55, 0, f + out - 0.18, cx + 0.55, 2.4, f + out - 0.14, DARK, { faces: 'S', win: interior(1.3) });
    nameBoard(k, 'south-campus-aces', 'S', f, cx, 4.55, 0.95, 3.5);
    k.lights.push({ x: cx, z: f + out + 2, r: 10, color: '#ffe2ae', k: 0.55 });
    k.glows.push({ x: cx, y: 3.1, z: f + out - 0.5, sx: 2.6, sy: 0.08, sz: 0.4, color: '#ffe2ae' });
    for (const s of [-1, 1]) planter(b, cx + s * (pw + 1.0), f + 0.6, 0.45, 0x2ace + s);
    k.person(cx - 1.2, f + out + 0.8);
    k.person(cx + 1.6, f + out + 0.4);
  }
  k.lights.push({ x: cx - 5, z: cz - 5, r: 9, color: '#ffe2ae', k: 0.4 });
}
const GLAZED_PORCH: WinSpec = { cell: 0.85, storey: STOREY, lit: 0.8, kind: 1 };

// ---------------------------------------------------------------------------
// Mumford Hall and David Kinley Hall
// ---------------------------------------------------------------------------

/** The walls, base, bands, cornice and hipped slate roof of a Georgian hall of red brick with white trim. Hands back the height of its eaves and its roof's rise. */
function georgianBlock(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, faces: string, rise: number, seed: number, roofTo: [number, number, number, number] = [x0, z0, x1, z1], lift = 0): { eave: number } {
  const W = 3 * STOREY, EAVE = W + 0.4;
  const g = (d: number): [number, number, number, number] => [
    x0 - (faces.includes('W') ? d : 0), z0 - (faces.includes('N') ? d : 0), x1 + (faces.includes('E') ? d : 0), z1 + (faces.includes('S') ? d : 0),
  ];
  b.box(x0, 0, z0, x1, W, z1, BRICK.red, { win: HALL, seed, faces });
  let [a0, c0, a1, c1] = g(0.07);
  b.box(a0, 0, c0, a1, 0.6 + lift, c1, BASE, { faces: faces + 'T' });
  [a0, c0, a1, c1] = g(0.05);
  b.box(a0, STOREY - 0.08 + lift, c0, a1, STOREY + 0.1 + lift, c1, TRIM, { faces: faces + 'TB' });
  [a0, c0, a1, c1] = g(0.28);
  b.box(a0, W + lift, c0, a1, EAVE, c1, TRIM, { faces: faces + 'B' });
  hip(b, roofTo[0], roofTo[1], roofTo[2], roofTo[3], EAVE, rise, SLATE, 0.45);
  return { eave: EAVE };
}

/** White stone quoins up a hall's corners. */
function quoins(b: GeoBuilder, corners: [number, number][], y1: number): void {
  for (const [x, z] of corners) b.box(x - 0.22, 0.6, z - 0.22, x + 0.22, y1, z + 0.22, TRIM, { faces: 'NESW' });
}

/**
 * Mumford Hall, 1924, Platt's severely symmetrical Georgian: three storeys of
 * red brick with white trim and stone heads over the windows, under a hipped
 * slate roof with dormers and two chimneys. Its door faces west, towards the
 * South Quad, in a pavilion under a white pediment, with the name over it.
 */
function mumford(k: Build, l: LotDef): void {
  const b = k.b;
  const x0 = l.x0 + 1.1, x1 = l.x1 - 0.3, z0 = l.z0 + 0.3, z1 = l.z1 - 0.3, xc = (x0 + x1) / 2, zc = (z0 + z1) / 2;
  const RISE = Math.min(2.5, l.h + 3.2 - (3 * STOREY + 0.4));
  const { eave } = georgianBlock(b, x0, z0, x1, z1, 'NESW', RISE, 0.58);
  const W = 3 * STOREY;
  quoins(b, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], W);
  lintels(b, 'S', z1, x0 + 0.25, x1 - 0.25, HALL, [0, 1, 2], LIMESTONE);
  lintels(b, 'E', x1, z0 + 0.25, z1 - 0.25, HALL, [0, 1, 2], LIMESTONE);

  // the west pavilion: brick, quoined, under a white pediment
  {
    const half = 2.2, px0 = x0 - 0.75;
    b.box(px0, 0, zc - half, x0, W, zc + half, BRICK.red, { faces: 'NSW' });
    b.box(px0 - 0.07, 0, zc - half - 0.07, x0, 0.6, zc + half + 0.07, BASE, { faces: 'NSWT' });
    b.box(px0 - 0.05, STOREY - 0.08, zc - half - 0.05, x0, STOREY + 0.1, zc + half + 0.05, TRIM, { faces: 'NSWTB' });
    b.box(px0 - 0.32, W, zc - half - 0.32, x0, eave, zc + half + 0.32, TRIM, { faces: 'NSWB' });
    quoins(b, [[px0, zc - half], [px0, zc + half]], W);
    gable(b, px0 - 0.1, zc - half, x0 + 2.6, zc + half, eave, 1.35, SLATE, TRIM, 'x', 0.3);
    roundel(b, [px0 - 0.13, eave + 0.55, zc], 0.32, 'W', GLASS, { win: interior(0.8) }, 8);
    // the door, arched, in a white surround, and windows over it in the two upper storeys
    arched(b, 'W', px0, zc, 0.45, 1.15, 2.4, TRIM, 1.3);
    nameBoard(k, 'south-campus-mumford', 'W', px0, zc, STOREY + 0.45, 0.5, 2.6);
    for (const s of [-1, 0, 1]) for (const y of [STOREY + 1.05, 2 * STOREY + 0.55]) {
      if (s === 0 && y < 2 * STOREY) continue;
      onWall(b, 'W', px0, zc + s * 1.25 - 0.38, zc + s * 1.25 + 0.38, y, y + 1.55, 0, 0.04, GLASS, { faces: 'W', win: interior(0.6) });
    }
    for (const s of [-1, 1]) onWall(b, 'W', px0, zc + s * 1.25 - 0.38, zc + s * 1.25 + 0.38, 0.85, 2.5, 0, 0.04, GLASS, { faces: 'W', win: interior(0.6) });
    steps(b, zc - 1.1, zc + 1.1, px0, 0.45, 'W', LIMESTONE, 0.35);
    wallLamp(k, px0 - 0.12, 2.3, zc - 0.95);
    wallLamp(k, px0 - 0.12, 2.3, zc + 0.95);
    k.lights.push({ x: px0 - 2.5, z: zc, r: 10, color: '#ffe2ae', k: 0.5 });
    k.person(px0 - 1.5, zc + 0.6);
  }
  // dormers on the long slopes, and the two chimneys
  {
    const run = (x1 - x0) / 2 + 0.45, up = 1.2, sill = eave + ((up + 0.45) * RISE) / run - 0.15;
    for (const z of [zc - 2.2, zc, zc + 2.2]) dormer(b, x1 - up, z, sill, 'E', SLATE);
    for (const z of [zc - 3.0, zc + 3.0]) dormer(b, x0 + up, z, sill, 'W', SLATE);
    dormer(b, xc, z1 - up, sill, 'S', SLATE);
    for (const z of [z0 + 1.6, z1 - 1.6]) chimney(b, xc, z, eave, l.h + 3.3, BRICK.deep, 0.6, 0.4);
  }
  k.lights.push({ x: xc, z: z1 + 2, r: 9, color: '#ffe2ae', k: 0.35 });
}

/**
 * David Kinley Hall, 1925: a larger hall of the same red brick and white
 * trim, in plan a U open to the west, with a hipped slate roof on each range.
 * Its door faces east, towards the South Quad, under a porch of four white
 * columns with a balustrade, and the name is over the porch.
 */
function kinley(k: Build, l: LotDef): void {
  const b = k.b;
  const fx1 = l.x1 - 1.0, fx0 = fx1 - 5.6, z0 = l.z0 + 0.3, z1 = l.z1 - 0.3, zc = (z0 + z1) / 2, wx0 = l.x0 + 0.3;
  const W = 3 * STOREY, RISE = 2.4, run = (fx1 - fx0) / 2 + 0.45;
  // the front range, its ridge from north to south, and the two wings behind it, their ridges from west to east
  const { eave } = georgianBlock(b, fx0, z0, fx1, z1, 'NESW', RISE, 0.62);
  const wd = 3.8, wingRise = ((wd / 2 + 0.45) * RISE) / run;
  for (const [a, c] of [[z0 + 0.3, z0 + 0.3 + wd], [z1 - 0.3 - wd, z1 - 0.3]]) {
    georgianBlock(b, wx0, a, fx0, c, 'NSW', wingRise, 0.66 + a * 0.01, [wx0, a, fx0 + 2.4, c], 0.025);
    // a chimney on each wing's west end
    chimney(b, wx0 + 1.2, (a + c) / 2, eave, l.h + 2.9, BRICK.deep, 0.5, 0.4);
  }
  quoins(b, [[fx1, z0], [fx1, z1], [fx0, z1], [fx0, z0]], W);
  lintels(b, 'E', fx1, z0 + 0.25, z1 - 0.25, HALL, [1, 2], LIMESTONE);

  // the porch: a floor of stone, four columns, a flat white roof with a balustrade, and the door behind
  {
    const half = 2.0, out = 1.3, floor = 0.45, top = STOREY + 0.6, px1 = fx1 + out;
    b.box(fx1, 0, zc - half, px1, floor, zc + half, LIMESTONE, { faces: 'NEST' });
    steps(b, zc - half + 0.2, zc + half - 0.2, px1, floor, 'E', LIMESTONE, 0.4);
    for (const s of [-1.5, -0.5, 0.5, 1.5]) column(b, px1 - 0.3, zc + s * 1.2, floor, top, 0.2);
    b.box(fx1, top, zc - half, px1 + 0.05, top + 0.45, zc + half, TRIM, { faces: 'NESTB' });
    railing(b, fx1, zc - half, px1 + 0.05, zc + half, top + 0.45, TRIM, 'NES', 0.6);
    arched(b, 'E', fx1, zc, floor, 1.25, 2.5, TRIM, 1.3);
    nameBoard(k, 'south-campus-kinley', 'E', fx1, zc, top + 1.35, 0.55, 3.5);
    k.glows.push({ x: fx1 + out / 2, y: top - 0.15, z: zc, sx: 0.3, sy: 0.1, sz: 2.6, color: '#ffe2ae' });
    k.lights.push({ x: px1 + 2.2, z: zc, r: 10, color: '#ffe2ae', k: 0.55 });
    k.person(px1 + 0.9, zc - 1.0);
    k.person(px1 + 1.3, zc + 1.6);
  }
  // dormers on the front range's east slope, and one on the south wing's south slope
  {
    const up = 1.2, sill = eave + ((up + 0.45) * RISE) / run - 0.15;
    for (const z of [zc - 3.5, zc - 1.8, zc + 1.8, zc + 3.5]) dormer(b, fx1 - up, z, sill, 'E', SLATE);
    const wsill = eave + ((up + 0.45) * wingRise) / (wd / 2 + 0.45) - 0.15;
    dormer(b, wx0 + 3.5, z1 - 0.3 - up, wsill, 'S', SLATE);
  }
  k.lights.push({ x: (fx0 + fx1) / 2, z: z1 + 1.8, r: 9, color: '#ffe2ae', k: 0.35 });
}

// ---------------------------------------------------------------------------
// The Business Instructional Facility
// ---------------------------------------------------------------------------

/**
 * Pelli Clarke Pelli's building of 2008: three bars of brick and stone round
 * a garden court that opens east, to the South Quad. Their outer walls are
 * brick with tall windows between piers over a ground storey of stone; their
 * ends and their faces on the court are walls of glass. Each bar has a thin
 * flat roof of zinc that reaches out beyond its walls, and across the mouth of
 * the court a broad roof sails out on two slender columns over the entrance.
 * On the south bar's roof, rows of solar panels; on the north bar's, a garden.
 */
function business(k: Build, l: LotDef): void {
  const b = k.b;
  const W = 3 * STOREY, RT = l.h + 0.15, over = 0.6;
  const x0 = l.x0 + 0.8, x1 = l.x1 - 0.7, z0 = l.z0 + 0.8, z1 = l.z1 - 0.7;
  const nz1 = z0 + 2.7, sz0 = z1 - 2.9, wx1 = x0 + 3.0;

  /** A bar: a ground storey of stone, brick above, glass on the faces listed in `glass`, and its roof. */
  const bar = (a0: number, c0: number, a1: number, c1: number, faces: string, glass: string, roofTop: number | null, seed: number): void => {
    const outer = faces.split('').filter((f) => !glass.includes(f)).join('');
    if (outer) {
      b.box(a0, 0, c0, a1, STOREY, c1, LIMESTONE, { win: BIF_WIN, seed, faces: outer });
      b.box(a0, STOREY, c0, a1, W, c1, BRICK.brown, { win: BIF_WIN, seed, faces: outer });
    }
    if (glass) b.box(a0, 0, c0, a1, W, c1, GLASS, { win: CURTAIN, seed, faces: glass });
    const cope = roofTop === null ? 0.04 : 0.05;
    b.box(a0 - cope, W, c0 - cope, a1 + cope, W + 0.25, c1 + cope, TRIM, { faces: 'NESW' });
    if (roofTop !== null) b.box(a0 - over, W + 0.25, c0 - over, a1 + over, W + 0.45, c1 + over, ZINC, { faces: 'NESWTB', top: roofTop });
  };
  bar(x0, z0, x1, nz1, 'NESW', 'ES', ROOF_GARDEN, 0.11);
  bar(x0, nz1, wx1, sz0, 'EW', 'E', null, 0.13);
  bar(x0, sz0, x1, z1, 'NESW', 'EN', ZINC, 0.17);
  // (the west bar's roof runs between its neighbours', a hair lower and tucked under their edges)
  b.box(x0 - over, W + 0.27, nz1 + over - 0.05, wx1 + over, W + 0.43, sz0 - over + 0.05, ZINC, { faces: 'EWTB' });

  // piers of brick on the outer south and north faces, between the windows
  for (const [f, plane] of [['S', z1], ['N', z0]] as [Face, number][]) {
    const n = Math.max(1, Math.floor((x1 - x0) / BIF_WIN.cell + 0.5)), cw = (x1 - x0) / n;
    for (let i = 0; i <= n; i += 2) onWall(b, f, plane, x0 + i * cw - 0.12, x0 + i * cw + 0.12, STOREY, W, 0, 0.14, BRICK.brown, { faces: f === 'S' ? 'ESWT' : 'NEWT' });
  }
  // white mullions on the glass that faces the court and the South Quad
  for (const [f, plane, u0, u1] of [['S', nz1, wx1, x1], ['N', sz0, wx1, x1]] as [Face, number, number, number][]) {
    for (let i = 1; i < 6; i++) onWall(b, f, plane, u0 + (i * (u1 - u0)) / 6 - 0.05, u0 + (i * (u1 - u0)) / 6 + 0.05, 0, W, 0, 0.08, TRIM, { faces: f + 'EW' });
  }
  for (const [a, c] of [[z0, nz1], [sz0, z1]]) for (const t of [1 / 3, 2 / 3]) onWall(b, 'E', x1, a + (c - a) * t - 0.05, a + (c - a) * t + 0.05, 0, W, 0, 0.08, TRIM, { faces: 'NSE' });
  for (const t of [1 / 3, 2 / 3]) b.box(x0 - 0.04, 0, z0 + (z1 - z0) * t - 0.3, x0 + 0.1, W, z0 + (z1 - z0) * t + 0.3, BRICK.brown, { faces: 'NSW' });
  // a band of stone at the foot of the brick, all round the outside
  b.box(x0 - 0.06, STOREY - 0.1, z0 - 0.06, x1 + 0.06, STOREY + 0.1, z0 + 0.04, LIMESTONE, { faces: 'NEWTB' });
  b.box(x0 - 0.06, STOREY - 0.1, z1 - 0.04, x1 + 0.06, STOREY + 0.1, z1 + 0.06, LIMESTONE, { faces: 'SEWTB' });
  b.box(x0 - 0.06, STOREY - 0.1, z0 + 0.04, x0 + 0.04, STOREY + 0.1, z1 - 0.04, LIMESTONE, { faces: 'WTB' });

  // the broad roof over the mouth of the court, on two slender columns, and the entrance under it
  {
    const rx0 = x1 - 3.0, rx1 = l.x1 - 0.05, rz0 = nz1 - 0.2, rz1 = sz0 + 0.2;
    b.box(rx0, W + 0.5, rz0, rx1, W + 0.7, rz1, ZINC, { faces: 'NESWTB' });
    for (const z of [rz0 + 0.7, rz1 - 0.7]) b.cyl(rx1 - 0.6, z, 0, W + 0.5, 0.12, 0.12, 6, 0xd9dde0, { cap: false });
    // the court: a garden, a walk to the glass doors at its back, and benches
    area(k, rect(wx1 + 0.1, nz1 + 0.1, x1 - 0.1, sz0 - 0.1), ROOF_GARDEN, 0.04);
    area(k, rect(wx1 + 0.1, (nz1 + sz0) / 2 - 0.6, x1 + 0.6, (nz1 + sz0) / 2 + 0.6), PAVING, 0.045);
    bench(b, (wx1 + x1) / 2 - 1.5, nz1 + 0.5, 'x', -1);
    bench(b, (wx1 + x1) / 2 + 1.5, sz0 - 0.5, 'x', 1);
    planter(b, wx1 + 0.8, nz1 + 0.6, 0.4, 0xb1f);
    planter(b, wx1 + 0.8, sz0 - 0.6, 0.4, 0xb2f);
    b.box(wx1, 0, (nz1 + sz0) / 2 - 0.7, wx1 + 0.05, 2.4, (nz1 + sz0) / 2 + 0.7, DARK, { faces: 'E', win: interior(1.3) });
    k.person(x1 - 0.8, (nz1 + sz0) / 2 + 0.3);
    k.person((wx1 + x1) / 2 - 1.3, nz1 + 0.9);
    k.person(rx1 - 0.3, rz1 - 1.6);
    k.lights.push({ x: x1, z: (nz1 + sz0) / 2, r: 10, color: '#ffe2ae', k: 0.55 });
    k.glows.push({ x: (rx0 + rx1) / 2, y: W + 0.45, z: (rz0 + rz1) / 2, sx: 1.6, sy: 0.08, sz: 1.6, color: '#ffe2ae' });
  }
  // the name, on the south bar's south face, over the stone storey
  nameBoard(k, 'south-campus-business', 'S', z1 + 0.14, (x0 + x1) / 2 + 0.5, STOREY + 0.55, 0.95, 5.6);
  // the solar panels: three rows on the south bar, tilted to the south, on low frames
  {
    const y = W + 0.45, zn = sz0 + 0.1, zs = z1 - 0.2, rows = 3, d = (zs - zn) / rows;
    for (let i = 0; i < rows; i++) {
      const za = zn + i * d + 0.1, zb = za + d - 0.25;
      slab(b, [(x0 + x1) / 2, y + 0.55, za], [(x0 + x1) / 2, y + 0.2, zb], (x1 - x0) / 2 - 0.5, 0.05, SOLAR, { under: IRON });
    }
    // and a small housing for the plant on the north bar's roof
    b.box(x1 - 3.0, y, z0 + 0.6, x1 - 1.4, y + 0.5, z0 + 1.8, TRIM, { faces: 'NESWT' });
  }
}

// ---------------------------------------------------------------------------
// The Morrow Plots
// ---------------------------------------------------------------------------

/** Rows of standing corn in three plots, a low fence round them, and a plain board that two people are reading. */
function morrowPlots(k: Build): void {
  const m = AREAS.find((a) => a.id === 'morrow-plots');
  if (!m) return;
  const b = k.b;
  const fx0 = m.x0 + 0.3, fx1 = m.x1 - 0.3, fz0 = m.z0 + 0.3, fz1 = m.z1 - 2.1;
  railing(b, fx0, fz0, fx1, fz1, 0, 0xe2ddd0, 'NESW', 0.65);
  // three plots side by side, each of five rows from north to south
  const inner0 = fx0 + 0.45, inner1 = fx1 - 0.45, gap = 0.45, pw = (inner1 - inner0 - 2 * gap) / 3, rows = 5, rw = 0.22;
  for (let p = 0; p < 3; p++) {
    const px = inner0 + p * (pw + gap), c = CORN[p];
    for (let i = 0; i < rows; i++) {
      const x = px + ((i + 0.5) * pw) / rows;
      b.box(x - rw, 0, fz0 + 0.4, x + rw, c.h, fz1 - 0.4, c.stalk, { faces: 'NESWT', top: c.top });
    }
  }
  // the board, on two posts, facing the walk along Gregory Drive
  {
    const x = (m.x0 + m.x1) / 2, z = fz1 + 0.6, w = 2.6;
    for (const s of [-1, 1]) b.box(x + s * (w / 2 - 0.2) - 0.07, 0, z - 0.07, x + s * (w / 2 - 0.2) + 0.07, 1.0, z + 0.07, WOOD, { faces: 'NESW' });
    b.box(x - w / 2, 1.0, z - 0.04, x + w / 2, 2.15, z + 0.06, TRIM, { faces: 'NESWTB' });
    k.sign('south-campus-morrow', x, 1.575, z + 0.09, 0, 1, 0.9, w - 0.2);
    k.person(x - 0.5, z + 1.1);
    k.person(x + 0.6, z + 1.25);
  }
}

// ---------------------------------------------------------------------------

export const MODELS: Record<string, Model> = {
  library,
  'bell-tower': bellTower,
  'stock-pavilion': stockPavilion,
  'aces-library': acesLibrary,
  mumford,
  kinley,
  business,
};

/** The library's plaza, the South Quad's walks and the Morrow Plots. */
export function extras(k: Build): void {
  libraryPlaza(k);
  southQuad(k);
  morrowPlots(k);
}
