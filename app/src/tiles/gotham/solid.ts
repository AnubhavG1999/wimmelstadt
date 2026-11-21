// What is built, as the show asks about it: how high the roof, the deck or the
// ground under a place stands, and whether a place lies inside something. It
// goes by the very triangles that are drawn, not by the plan's boxes, so that
// a figure stands on a roof as it was built and a flight clears a spire where
// the spire really is.
//
// The triangles are sorted once into a grid of cells on the ground, so that a
// question looks at a few dozen of them and not at all hundred thousand.

import type { GeoBuilder } from '../../engine/geo';
import { groundAt } from './plan';

const CELL = 4, X0 = -108, Z0 = -117, NX = 54, NZ = 59;

export class Solid {
  private readonly cells: number[][] = Array.from({ length: NX * NZ }, () => []);
  private readonly pos: Float32Array;
  /** For each triangle, how far its face leans to the sky: 1 faces straight up, -1 straight down, 0 is a wall. */
  private readonly up: Float32Array;

  constructor(built: GeoBuilder) {
    const p = built.added.pos, n = Math.floor(p.length / 9);
    this.pos = Float32Array.from(p);
    this.up = new Float32Array(n);
    for (let t = 0; t < n; t++) {
      const i = t * 9;
      const ax = p[i + 3] - p[i], ay = p[i + 4] - p[i + 1], az = p[i + 5] - p[i + 2], bx = p[i + 6] - p[i], by = p[i + 7] - p[i + 1], bz = p[i + 8] - p[i + 2];
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, l = Math.hypot(nx, ny, nz);
      this.up[t] = l > 1e-9 ? ny / l : 0;
      // a wall has no ground under it to stand on or be under
      if (Math.abs(this.up[t]) < 0.05) continue;
      const x0 = Math.min(p[i], p[i + 3], p[i + 6]), x1 = Math.max(p[i], p[i + 3], p[i + 6]), z0 = Math.min(p[i + 2], p[i + 5], p[i + 8]), z1 = Math.max(p[i + 2], p[i + 5], p[i + 8]);
      const i0 = Math.max(0, Math.floor((x0 - X0) / CELL)), i1 = Math.min(NX - 1, Math.floor((x1 - X0) / CELL)), j0 = Math.max(0, Math.floor((z0 - Z0) / CELL)), j1 = Math.min(NZ - 1, Math.floor((z1 - Z0) / CELL));
      for (let j = j0; j <= j1; j++) for (let c = i0; c <= i1; c++) this.cells[j * NX + c].push(t);
    }
  }

  /** Every built face over or under a place: how high it is there, and how it leans. */
  private faces(x: number, z: number, each: (y: number, up: number) => void): void {
    const c = Math.floor((x - X0) / CELL), j = Math.floor((z - Z0) / CELL);
    if (c < 0 || j < 0 || c >= NX || j >= NZ) return;
    const p = this.pos;
    for (const t of this.cells[j * NX + c]) {
      const i = t * 9, ax = p[i], az = p[i + 2], bx = p[i + 3], bz = p[i + 5], cx = p[i + 6], cz = p[i + 8];
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(d) < 1e-9) continue;
      const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d, w = 1 - u - v;
      if (u < -1e-4 || v < -1e-4 || w < -1e-4) continue;
      each(u * p[i + 1] + v * p[i + 4] + w * p[i + 7], this.up[t]);
    }
  }

  /**
   * How high the highest thing that can be stood on is at a place, no higher
   * than `from`: a roof, a deck, a step, a terrace, the ground. The water's
   * level where there is nothing else.
   */
  under(x: number, z: number, from = Infinity): number {
    const g = groundAt(x, z);
    let y = g <= from + 0.05 ? g : -Infinity;
    this.faces(x, z, (fy, up) => { if (up > 0.3 && fy <= from + 0.05 && fy > y) y = fy; });
    return y;
  }

  /** How high the top of everything built is at a place: what a flight over it must clear. */
  top(x: number, z: number): number {
    let y = groundAt(x, z);
    this.faces(x, z, (fy) => { if (fy > y) y = fy; });
    return y;
  }

  /**
   * Whether a place lies inside something built: the first face over it is one
   * that faces the sky, as a roof's does seen from within. Under a ceiling, a
   * deck or a canopy, which have undersides, it does not.
   */
  inside(x: number, y: number, z: number): boolean {
    if (y < groundAt(x, z) - 0.05) return true;
    let near = Infinity, lean = 0;
    this.faces(x, z, (fy, up) => { if (fy > y + 0.02 && fy < near) { near = fy; lean = up; } });
    return near < Infinity && lean > 0.1;
  }

  /** How far it is from a place down to what is under it: negative if the place is inside or under the ground. */
  over(x: number, y: number, z: number): number {
    return y - this.under(x, z, y + 0.3);
  }
}
