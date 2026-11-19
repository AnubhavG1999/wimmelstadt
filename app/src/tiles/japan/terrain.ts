// The high ground: Fuji, the slope the pass climbs, and the hills the
// Shinkansen runs into. The engine builds a hill in level steps, like a model
// made from a map's contour lines. That suits a mound, but not a cone with a
// snow cap or a slope with a road cut into it, so this tile shapes its own.
//
// Fuji is turned like a pot: rings of facets round its summit, cut off where
// they pass the tile's edge. Everything else is one sheet of facets over a
// grid, whose height at any place is whichever of the hills is highest there,
// with a level bench wherever the pass runs.

import type { GeoBuilder, V3 } from '../../engine/geo';
import type { Build, Rect } from '../../engine/tile';
import { sample } from '../../engine/lines';
import { BOARD, FUJI, KYOTO_HILL, LOOKOUT, LOOKOUT_LOOP, PASS, PASS_LINE, SHELF, fujiHeight } from './plan';

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Adds a flat triangle that faces the sky, whichever way round its corners are given. */
function facet(b: GeoBuilder, p0: V3, p1: V3, p2: V3, color: number): void {
  const ex = p1[0] - p0[0], ey = p1[1] - p0[1], ez = p1[2] - p0[2];
  const fx = p2[0] - p0[0], fy = p2[1] - p0[1], fz = p2[2] - p0[2];
  let nx = ey * fz - ez * fy, ny = ez * fx - ex * fz, nz = ex * fy - ey * fx;
  const l = Math.hypot(nx, ny, nz);
  if (l < 1e-9) return;
  nx /= l; ny /= l; nz /= l;
  if (ny >= 0) b.tri(p0, p1, p2, [nx, ny, nz], color);
  else b.tri(p0, p2, p1, [-nx, -ny, -nz], color);
}

// ---------------------------------------------------------------------------
// How high the ground is
// ---------------------------------------------------------------------------

/** A hill with a level top over a rectangle. Each side slopes over the width given for it, or stands upright if that is 0. */
function mesa(h: Rect & { y: number }, x: number, z: number, soft: { w: number; e: number; n: number; s: number }): number {
  if (x < h.x0 || x > h.x1 || z < h.z0 || z > h.z1) return 0;
  const side = (d: number, w: number): number => (w <= 0 ? 1 : smooth(0, w, d));
  return h.y * side(x - h.x0, soft.w) * side(h.x1 - x, soft.e) * side(z - h.z0, soft.n) * side(h.z1 - z, soft.s);
}

const S2 = Math.SQRT1_2;

/** The slope the pass climbs, before the road is cut into it: a tilted plane that falls away at its sides. */
function slope(x: number, z: number): number {
  const p = PASS, dx = x - p.top[0], dz = z - p.top[1];
  const v = (dx + dz) * S2; // how far down the slope
  const u = Math.abs(dx - dz) * S2; // how far from its middle
  const foot = p.gap * (p.stretches - 1);
  if (v > foot || v < -22) return 0;
  // above the highest stretch it runs on up into Fuji's side, and ends inside the mountain
  const y = v < 0 ? (p.y1 + Math.min(8, -v * 0.45)) * (1 - smooth(10, 22, -v)) : p.y1 * (1 - v / foot);
  const edge = p.half + p.r + p.width;
  return y * (1 - smooth(edge + 1, edge + 9, u));
}

/** The pass and the loop at its top, as points a unit apart, for finding the road from anywhere on the slope. */
const ROAD = [...sample(PASS_LINE, 1), ...sample(LOOKOUT_LOOP, 1)];
/** How far from the middle of the road the ground is kept down to the road's own level. */
const BENCH = PASS.width + 4.4;

/** The height of the road's bench at a place, or null if no road is near. Where two stretches are near, the lower one wins. */
export function bench(x: number, z: number): number | null {
  let low: number | null = null;
  for (const p of ROAD) {
    const d = Math.hypot(p[0] - x, p[2] - z);
    if (d < BENCH && (low === null || p[1] < low)) low = p[1];
  }
  return low === null ? null : low - 0.45;
}

const KYOTO_SOFT = { w: 0, e: 0, n: 8, s: 11 };
const SHELF_SOFT = { w: 0, e: 7, n: 0, s: 9 };

/** How high the ground is at a place, Fuji's own cone left out. */
export function foothills(x: number, z: number): number {
  const look = LOOKOUT.y * (1 - smooth(LOOKOUT.r - 3, LOOKOUT.r + 7, Math.hypot(x - LOOKOUT.x, z - LOOKOUT.z))) - 0.12;
  let y = Math.max(slope(x, z), look);
  const cut = bench(x, z);
  if (cut !== null) y = Math.min(y, cut);
  return Math.max(y, mesa(KYOTO_HILL, x, z, KYOTO_SOFT), mesa(SHELF, x, z, SHELF_SOFT));
}

/** How high the ground is at a place: whatever is highest there. */
export function groundHeight(x: number, z: number): number {
  return Math.max(0, foothills(x, z), fujiHeight(Math.hypot(x - FUJI.x, z - FUJI.z)));
}

// ---------------------------------------------------------------------------
// Fuji
// ---------------------------------------------------------------------------

/** Cuts a flat shape down to what lies inside the board. Heights follow the cut edges. */
function clipToBoard(poly: V3[]): V3[] {
  const cuts: [number, number, number][] = [[0, BOARD.x0, 1], [0, BOARD.x1, -1], [2, BOARD.z0, 1], [2, BOARD.z1, -1]];
  let out = poly;
  for (const [axis, at, way] of cuts) {
    const src = out;
    out = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[i], b = src[(i + 1) % src.length];
      const da = (a[axis] - at) * way, db = (b[axis] - at) * way;
      if (da >= 0) out.push(a);
      if (da >= 0 !== db >= 0) {
        const t = da / (da - db);
        const p: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
        p[axis] = at;
        out.push(p);
      }
    }
    if (out.length < 3) return [];
  }
  return out;
}

const SNOW = 0xf3f5fa, ROCK = 0x8a8277;

/** Fuji: rings of facets from the crater down to the plain, white above a ragged snow line. */
export function buildFuji(k: Build): void {
  const f = FUJI, b = k.b;
  const rings = [f.crater, 7, 11, 15, 19.5, 24.5, 30, 36, 41, f.r];
  const sides = 28;
  const BLUE = [0x7189ab, 0x6a82a4, 0x637b9c, 0x5d7594], WOOD = [0x5b8a63, 0x52805a];
  const at = (r: number, j: number, y: number): V3 => {
    const a = (j / sides) * Math.PI * 2 + 0.11;
    const x = f.x + Math.cos(a) * r, z = f.z + Math.sin(a) * r;
    // where the pass is cut into the mountain's side, the mountain gives way to the road's bench
    const cut = bench(x, z);
    return [x, cut === null ? y : Math.min(y, cut - 1), z];
  };
  // where a shape was cut by the edge of the board, the cut is closed with a wall of rock
  const emit = (poly: V3[], color: number): void => {
    const cut = clipToBoard(poly);
    for (let i = 1; i + 1 < cut.length; i++) facet(b, cut[0], cut[i], cut[i + 1], color);
    for (let i = 0; i < cut.length; i++) {
      const p = cut[i], q = cut[(i + 1) % cut.length];
      const west = Math.abs(p[0] - BOARD.x0) < 1e-6 && Math.abs(q[0] - BOARD.x0) < 1e-6;
      const north = Math.abs(p[2] - BOARD.z0) < 1e-6 && Math.abs(q[2] - BOARD.z0) < 1e-6;
      if (!west && !north) continue;
      const wall = Math.max(p[1], q[1]) > 27 ? 0xd9dde6 : ROCK;
      b.quad([p[0], 0, p[2]], [q[0], 0, q[2]], q, p, west ? [-1, 0, 0] : [0, 0, -1], wall);
    }
  };
  // the crater: a rim, and a floor a little below it
  const top = fujiHeight(0);
  for (let j = 0; j < sides; j++) emit([[f.x, top - 2.2, f.z], at(f.crater, j + 1, top), at(f.crater, j, top)], 0xdfe3ec);
  for (let i = 0; i + 1 < rings.length; i++) {
    const r0 = rings[i], r1 = rings[i + 1], y0 = fujiHeight(r0), y1 = fujiHeight(r1);
    for (let j = 0; j < sides; j++) {
      // the snow reaches further down every other facet, and further still on the north side
      const reach = 3 + (j % 2) + (j % 5 === 0 ? 1 : 0);
      const color = i < reach ? SNOW : i >= rings.length - 3 ? WOOD[(i + j) % 2] : BLUE[(i + j) % BLUE.length];
      emit([at(r0, j, y0), at(r0, j + 1, y0), at(r1, j + 1, y1), at(r1, j, y1)], color);
    }
  }
}

// ---------------------------------------------------------------------------
// The foothills
// ---------------------------------------------------------------------------

const GREENS = [0x6fa85a, 0x66a055, 0x78b062, 0x5f9a52];
const BANK = 0x8f8a78;

/**
 * Lays the sheet of facets over a part of the board: each square of the grid
 * is two triangles, left out where the ground is flat. Where the sheet reaches
 * the edge of the board it is closed with a wall.
 */
export function buildHills(k: Build, area: Rect, cell = 3): void {
  const b = k.b;
  const nx = Math.round((area.x1 - area.x0) / cell), nz = Math.round((area.z1 - area.z0) / cell);
  const xs = Array.from({ length: nx + 1 }, (_, i) => area.x0 + ((area.x1 - area.x0) * i) / nx);
  const zs = Array.from({ length: nz + 1 }, (_, j) => area.z0 + ((area.z1 - area.z0) * j) / nz);
  // a little below the ground where there is no hill, so that the sheet's edge is under the paving and not in it
  const h = xs.map((x) => zs.map((z) => foothills(x, z) - 0.25));
  const P = (i: number, j: number): V3 => [xs[i], h[i][j], zs[j]];
  const tint = (p: V3, q: V3, r: V3): number => {
    const ex = q[0] - p[0], ey = q[1] - p[1], ez = q[2] - p[2], fx = r[0] - p[0], fy = r[1] - p[1], fz = r[2] - p[2];
    const ny = Math.abs(ez * fx - ex * fz), l = Math.hypot(ey * fz - ez * fy, ny, ex * fy - ey * fx) || 1;
    // steep ground is bare, and the rest is grass in a few greens
    if (ny / l < 0.62) return BANK;
    return GREENS[Math.abs(Math.round(p[0] * 0.7 + p[2] * 1.3 + q[0])) % GREENS.length];
  };
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const a = P(i, j), c = P(i + 1, j), d = P(i + 1, j + 1), e = P(i, j + 1);
      if (Math.max(a[1], c[1], d[1], e[1]) <= 0.02) continue;
      // split along whichever diagonal is the flatter
      if (Math.abs(a[1] - d[1]) <= Math.abs(c[1] - e[1])) {
        facet(b, a, c, d, tint(a, c, d));
        facet(b, a, d, e, tint(a, d, e));
      } else {
        facet(b, a, c, e, tint(a, c, e));
        facet(b, c, d, e, tint(c, d, e));
      }
    }
  }
  // walls where the sheet meets the edge of the board
  const wall = (p: V3, q: V3, n: V3): void => {
    if (Math.max(p[1], q[1]) <= 0.02) return;
    b.quad([p[0], 0, p[2]], [q[0], 0, q[2]], [q[0], Math.max(0, q[1]), q[2]], [p[0], Math.max(0, p[1]), p[2]], n, ROCK);
  };
  for (let j = 0; j < nz; j++) {
    if (Math.abs(area.x0 - BOARD.x0) < 1e-6) wall(P(0, j), P(0, j + 1), [-1, 0, 0]);
    if (Math.abs(area.x1 - BOARD.x1) < 1e-6) wall(P(nx, j), P(nx, j + 1), [1, 0, 0]);
  }
  for (let i = 0; i < nx; i++) {
    if (Math.abs(area.z0 - BOARD.z0) < 1e-6) wall(P(i, 0), P(i + 1, 0), [0, 0, -1]);
    if (Math.abs(area.z1 - BOARD.z1) < 1e-6) wall(P(i, nz), P(i + 1, nz), [0, 0, 1]);
  }
}
