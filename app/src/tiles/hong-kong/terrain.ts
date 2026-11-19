// Ground that slopes. The engine builds a hill in level steps; Hong Kong's
// hills are too steep and too much looked at for that, so here a hill is a
// sheet of flat facets over a grid, like a model carved from foam: its height
// is worked out at every corner of the grid, each square is two triangles, and
// each triangle is green or rock by how steep it is.

import type { GeoBuilder, V3 } from '../../engine/geo';

/** A hill: the rectangle it covers, how many squares it is divided into each way, and its height at every corner. */
export interface Field { x0: number; z0: number; x1: number; z1: number; nx: number; nz: number; y: Float32Array }

/** Works out a hill's height at every corner of a grid of squares about `cell` wide. */
export function field(x0: number, z0: number, x1: number, z1: number, cell: number, height: (x: number, z: number) => number): Field {
  const nx = Math.max(1, Math.round((x1 - x0) / cell)), nz = Math.max(1, Math.round((z1 - z0) / cell));
  const y = new Float32Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) y[j * (nx + 1) + i] = Math.max(0, height(x0 + ((x1 - x0) * i) / nx, z0 + ((z1 - z0) * j) / nz));
  }
  return { x0, z0, x1, z1, nx, nz, y };
}

/** How high the hill is at a place: on the very triangle that is drawn there, so that what stands on it neither floats nor sinks. */
export function heightOn(f: Field, x: number, z: number): number {
  if (x < f.x0 || x > f.x1 || z < f.z0 || z > f.z1) return 0;
  const u = Math.min(f.nx - 1e-6, ((x - f.x0) / (f.x1 - f.x0)) * f.nx), v = Math.min(f.nz - 1e-6, ((z - f.z0) / (f.z1 - f.z0)) * f.nz);
  const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
  const at = (a: number, c: number): number => f.y[c * (f.nx + 1) + a];
  const y00 = at(i, j), y10 = at(i + 1, j), y01 = at(i, j + 1), y11 = at(i + 1, j + 1);
  // each square is cut from its north-west corner to its south-east
  return fu >= fv ? y00 + (y10 - y00) * fu + (y11 - y10) * fv : y00 + (y11 - y01) * fu + (y01 - y00) * fv;
}

export interface DrawOpts {
  /** The colour of a facet: asked with its height, how nearly level it is (1 is level, 0 upright), and where its middle is. */
  color(y: number, level: number, x: number, z: number): number;
  /** The colour of the upright faces at its edges, where the hill is cut off: at the edge of the board, or by a wall. */
  cut: number;
  /** Which edges get such a face: any of N, E, S, W. */
  edges: string;
  /** For a gap in an edge's face, such as the mouth of a tunnel: how high the face begins at a place along that edge. 0 if there is none. */
  gap?(edge: string, at: number): number;
}

/** Draws a hill: its facets, and an upright face along each edge that asks for one. */
export function drawField(b: GeoBuilder, f: Field, o: DrawOpts): void {
  const X = (i: number): number => f.x0 + ((f.x1 - f.x0) * i) / f.nx, Z = (j: number): number => f.z0 + ((f.z1 - f.z0) * j) / f.nz;
  const at = (i: number, j: number): V3 => [X(i), f.y[j * (f.nx + 1) + i], Z(j)];
  const facet = (p: V3, q: V3, r: V3): void => {
    if (p[1] < 0.03 && q[1] < 0.03 && r[1] < 0.03) return; // level with the ground: the ground is drawn already
    // corners in the order that faces the sky, and the way the facet tilts
    const ax = q[0] - p[0], ay = q[1] - p[1], az = q[2] - p[2], bx = r[0] - p[0], by = r[1] - p[1], bz = r[2] - p[2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const l = Math.hypot(nx, ny, nz) || 1;
    const flip = ny < 0;
    nx /= l; ny /= l; nz /= l;
    if (flip) { nx = -nx; ny = -ny; nz = -nz; }
    const color = o.color((p[1] + q[1] + r[1]) / 3, ny, (p[0] + q[0] + r[0]) / 3, (p[2] + q[2] + r[2]) / 3);
    if (flip) b.tri(p, r, q, [nx, ny, nz], color);
    else b.tri(p, q, r, [nx, ny, nz], color);
  };
  for (let j = 0; j < f.nz; j++) {
    for (let i = 0; i < f.nx; i++) {
      facet(at(i, j), at(i + 1, j), at(i + 1, j + 1));
      facet(at(i, j), at(i + 1, j + 1), at(i, j + 1));
    }
  }
  const wall = (p: V3, q: V3, n: V3, edge: string, along: number): void => {
    const base = o.gap?.(edge, along) ?? 0;
    if (p[1] <= base + 0.03 && q[1] <= base + 0.03) return;
    b.quad([p[0], base, p[2]], [q[0], base, q[2]], [q[0], Math.max(base, q[1]), q[2]], [p[0], Math.max(base, p[1]), p[2]], n, o.cut);
  };
  for (let i = 0; i < f.nx; i++) {
    if (o.edges.includes('N')) wall(at(i, 0), at(i + 1, 0), [0, 0, -1], 'N', (X(i) + X(i + 1)) / 2);
    if (o.edges.includes('S')) wall(at(i, f.nz), at(i + 1, f.nz), [0, 0, 1], 'S', (X(i) + X(i + 1)) / 2);
  }
  for (let j = 0; j < f.nz; j++) {
    if (o.edges.includes('W')) wall(at(0, j), at(0, j + 1), [-1, 0, 0], 'W', (Z(j) + Z(j + 1)) / 2);
    if (o.edges.includes('E')) wall(at(f.nx, j), at(f.nx, j + 1), [1, 0, 0], 'E', (Z(j) + Z(j + 1)) / 2);
  }
}

/** How far from the edge of a road the hill is still shaped by it. */
const REACH = 7;

/** A place on something that is cut into a hill, such as a road: where it is, how high, and how far to either side the hill is level with it. */
export interface Bench { x: number; z: number; y: number; half: number }

/**
 * A hill's height at a place, given its natural shape and what is cut into
 * it. On a road it is the road's height, a little under its surface. Between
 * two roads it slopes from one to the other. Far from any, it is the hill's
 * natural shape.
 */
export function carved(x: number, z: number, natural: number, benches: Bench[], under = 0.25): number {
  let inside = Infinity, insideY = 0, sum = 0, weight = 0.012, total = natural * 0.012;
  for (const s of benches) {
    const d = Math.hypot(s.x - x, s.z - z);
    if (d > 17) continue;
    if (d <= s.half) {
      if (d < inside) { inside = d; insideY = s.y; }
      continue;
    }
    const out = d - s.half;
    if (out >= REACH) continue;
    const w = (1 - out / REACH) ** 2 / (out + 0.35) ** 3;
    sum += w * (s.y - under);
    weight += w;
  }
  if (inside < Infinity) return insideY - under;
  total += sum;
  return total / weight;
}

export const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
