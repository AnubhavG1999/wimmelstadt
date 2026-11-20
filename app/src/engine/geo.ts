// A small builder that collects flat-shaded quads into one geometry, so that the
// whole static city is a handful of draw calls.

import * as THREE from 'three';

/**
 * How a wall is glazed. `cell` is the width of a window bay; 0 means no windows.
 * `kind` is how its windows are drawn: 0 plain windows, 1 a curtain wall, 2 and 3
 * shopfronts along the ground storey, 4 small square windows, 5 a lit interior,
 * 6 tall slits from floor to floor, and 7 a castle's arrow loops, narrow and dark
 * by day.
 */
export interface WinSpec { cell: number; storey: number; lit: number; kind: number }

export const NO_WIN: WinSpec = { cell: 0, storey: 5, lit: 0, kind: 0 };
/** A surface inside a lit interior: it glows softly at night. */
export const interior = (lit: number): WinSpec => ({ cell: 0, storey: 5, lit, kind: 5 });

export type V3 = [number, number, number];
type Col = THREE.ColorRepresentation;

export interface QuadOpts {
  /** Wall coordinates: u runs along the wall from u0 to u1, over a wall of length L. */
  u0?: number; u1?: number; L?: number;
  seed?: number;
  win?: WinSpec;
  /** Texture coordinates for the four corners, as [u, v] pairs in corner order. */
  uvs?: [number, number][];
}

export interface BoxOpts {
  win?: WinSpec;
  seed?: number;
  top?: Col;
  /** Which faces to build, as letters from N E S W T B. Defaults to all but the bottom. */
  faces?: string;
}

export class GeoBuilder {
  private pos: number[] = [];
  private nor: number[] = [];
  private col: number[] = [];
  private wall: number[] = [];
  private win: number[] = [];
  private uv: number[] = [];
  private c = new THREE.Color();
  /** Where everything that is added now is turned and moved to: see `moved`. */
  private tf: { yaw: number; x: number; y: number; z: number } | null = null;

  get triangles(): number {
    return this.pos.length / 9;
  }

  /**
   * What has been added so far, for a check that reads what is built: three
   * numbers a corner for where it is and for its colour, and four for its
   * window spec (cell, storey, lit, kind).
   */
  get added(): { readonly pos: readonly number[]; readonly col: readonly number[]; readonly win: readonly number[] } {
    return { pos: this.pos, col: this.col, win: this.win };
  }

  /**
   * Everything added inside `fn` is turned by `yaw` about the vertical and then
   * moved by (x, y, z). Rows of windows stay where the shape itself has them.
   */
  moved(x: number, y: number, z: number, yaw: number, fn: () => void): void {
    const outer = this.tf;
    if (outer) {
      // inside another move: this one first, then that one
      const c = Math.cos(outer.yaw), s = Math.sin(outer.yaw);
      this.tf = { yaw: outer.yaw + yaw, x: outer.x + x * c - z * s, y: outer.y + y, z: outer.z + x * s + z * c };
    } else {
      this.tf = { yaw, x, y, z };
    }
    try {
      fn();
    } finally {
      this.tf = outer;
    }
  }

  private vert(p: V3, n: V3, wu: number, wv: number, L: number, seed: number, w: WinSpec, uv: [number, number]): void {
    const t = this.tf;
    if (t) {
      const c = Math.cos(t.yaw), s = Math.sin(t.yaw);
      this.pos.push(t.x + p[0] * c - p[2] * s, t.y + p[1], t.z + p[0] * s + p[2] * c);
      this.nor.push(n[0] * c - n[2] * s, n[1], n[0] * s + n[2] * c);
    } else {
      this.pos.push(p[0], p[1], p[2]);
      this.nor.push(n[0], n[1], n[2]);
    }
    this.col.push(this.c.r, this.c.g, this.c.b);
    this.wall.push(wu, wv, L, seed);
    this.win.push(w.cell, w.storey, w.lit, w.kind);
    this.uv.push(uv[0], uv[1]);
  }

  /** Corners are bottom-left, bottom-right, top-right, top-left as seen from outside. */
  quad(p0: V3, p1: V3, p2: V3, p3: V3, n: V3, color: Col, o: QuadOpts = {}): void {
    this.c.set(color);
    const w = o.win ?? NO_WIN;
    const seed = o.seed ?? 0;
    const L = o.L ?? 1;
    const u0 = o.u0 ?? 0, u1 = o.u1 ?? L;
    let uvs = o.uvs ?? [[0, 0], [1, 0], [1, 1], [0, 1]];
    let wu = [u0, u1, u1, u0];
    let ps = [p0, p1, p2, p3];

    // Make sure the triangles face the way the normal points.
    const ex = p1[0] - p0[0], ey = p1[1] - p0[1], ez = p1[2] - p0[2];
    const fx = p3[0] - p0[0], fy = p3[1] - p0[1], fz = p3[2] - p0[2];
    const cx = ey * fz - ez * fy, cy = ez * fx - ex * fz, cz = ex * fy - ey * fx;
    if (cx * n[0] + cy * n[1] + cz * n[2] < 0) {
      ps = [p0, p3, p2, p1];
      wu = [wu[0], wu[3], wu[2], wu[1]];
      uvs = [uvs[0], uvs[3], uvs[2], uvs[1]];
    }
    for (const i of [0, 1, 2, 0, 2, 3]) this.vert(ps[i], n, wu[i], ps[i][1], L, seed, w, uvs[i]);
  }

  tri(p0: V3, p1: V3, p2: V3, n: V3, color: Col, o: QuadOpts = {}): void {
    this.c.set(color);
    const w = o.win ?? NO_WIN;
    for (const p of [p0, p1, p2]) this.vert(p, n, 0, p[1], 1, o.seed ?? 0, w, [0, 0]);
  }

  /** A triangle that faces the sky, whichever way round its corners are given. */
  up(p0: V3, p1: V3, p2: V3, color: Col, o: QuadOpts = {}): void {
    const over = (p1[2] - p0[2]) * (p2[0] - p0[0]) - (p1[0] - p0[0]) * (p2[2] - p0[2]);
    if (over >= 0) this.tri(p0, p1, p2, [0, 1, 0], color, o);
    else this.tri(p0, p2, p1, [0, 1, 0], color, o);
  }

  /** An axis-aligned box. Walls carry wall coordinates so windows line up with its corners. */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: Col, o: BoxOpts = {}): void {
    const f = o.faces ?? 'NESWT';
    const q = { win: o.win, seed: o.seed };
    const w = x1 - x0, d = z1 - z0;
    if (f.includes('S')) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], color, { ...q, L: w });
    if (f.includes('N')) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], color, { ...q, L: w });
    if (f.includes('E')) this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], color, { ...q, L: d });
    if (f.includes('W')) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], color, { ...q, L: d });
    const flat = { seed: o.seed, win: o.win && o.win.kind === 5 ? o.win : NO_WIN };
    if (f.includes('T')) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], o.top ?? color, flat);
    if (f.includes('B')) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], color, flat);
  }

  /** A box turned by `yaw` around the vertical axis. Its local x axis points along (cos yaw, sin yaw). */
  obox(cx: number, cy: number, cz: number, hx: number, hy: number, hz: number, yaw: number, color: Col, o: BoxOpts = {}): void {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (lx: number, ly: number, lz: number): V3 => [cx + lx * c - lz * s, cy + ly, cz + lx * s + lz * c];
    const N = (lx: number, lz: number): V3 => [lx * c - lz * s, 0, lx * s + lz * c];
    const q = { win: o.win, seed: o.seed };
    this.quad(P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz), N(0, 1), color, q);
    this.quad(P(hx, -hy, -hz), P(-hx, -hy, -hz), P(-hx, hy, -hz), P(hx, hy, -hz), N(0, -1), color, q);
    this.quad(P(hx, -hy, hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(hx, hy, hz), N(1, 0), color, q);
    this.quad(P(-hx, -hy, -hz), P(-hx, -hy, hz), P(-hx, hy, hz), P(-hx, hy, -hz), N(-1, 0), color, q);
    this.quad(P(-hx, hy, hz), P(hx, hy, hz), P(hx, hy, -hz), P(-hx, hy, -hz), [0, 1, 0], o.top ?? color, q);
    if (o.faces?.includes('B')) this.quad(P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, -hy, hz), P(-hx, -hy, hz), [0, -1, 0], color, q);
  }

  /** A faceted cylinder or cone frustum standing on the vertical axis. */
  cyl(cx: number, cz: number, y0: number, y1: number, r0: number, r1: number, sides: number, color: Col, o: BoxOpts & { cap?: Col | false; phase?: number } = {}): void {
    const ph = o.phase ?? Math.PI / sides;
    const circ = Math.PI * (r0 + r1);
    const q = { win: o.win, seed: o.seed };
    for (let i = 0; i < sides; i++) {
      const a0 = ph + (i / sides) * Math.PI * 2, a1 = ph + ((i + 1) / sides) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      const slope = (r0 - r1) / Math.max(1e-6, y1 - y0);
      const nl = Math.hypot(1, slope);
      const n: V3 = [Math.cos(am) / nl, slope / nl, Math.sin(am) / nl];
      const b0: V3 = [cx + Math.cos(a0) * r0, y0, cz + Math.sin(a0) * r0];
      const b1: V3 = [cx + Math.cos(a1) * r0, y0, cz + Math.sin(a1) * r0];
      const t0: V3 = [cx + Math.cos(a0) * r1, y1, cz + Math.sin(a0) * r1];
      const t1: V3 = [cx + Math.cos(a1) * r1, y1, cz + Math.sin(a1) * r1];
      this.quad(b0, b1, t1, t0, n, color, { ...q, L: circ, u0: (i / sides) * circ, u1: ((i + 1) / sides) * circ });
      if (o.cap !== false && r1 > 1e-3) {
        this.tri([cx, y1, cz], t1, t0, [0, 1, 0], o.cap ?? color, { seed: o.seed });
      }
    }
  }

  /** A square bar that follows a line of points, with a thickness for each point. */
  sweep(pts: V3[], radii: number[], color: Col, o: BoxOpts = {}): void {
    const n = pts.length;
    const rings: V3[][] = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], c = pts[Math.min(n - 1, i + 1)];
      let dx = c[0] - a[0], dy = c[1] - a[1], dz = c[2] - a[2];
      const l = Math.hypot(dx, dy, dz) || 1;
      dx /= l; dy /= l; dz /= l;
      // two directions across the bar: one level, one at right angles to both
      let ux = -dz, uz = dx;
      let ul = Math.hypot(ux, uz);
      if (ul < 1e-4) { ux = 1; uz = 0; ul = 1; }
      ux /= ul; uz /= ul;
      const vx = dy * uz, vy = dz * ux - dx * uz, vz = -dy * ux;
      const r = radii[i], p = pts[i];
      rings.push([[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([su, sv]): V3 => [p[0] + (ux * su + vx * sv) * r, p[1] + vy * sv * r, p[2] + (uz * su + vz * sv) * r]));
    }
    const q = { win: o.win, seed: o.seed };
    for (let i = 0; i < n - 1; i++) {
      for (let k = 0; k < 4; k++) {
        const k2 = (k + 1) % 4;
        const A = rings[i][k], B = rings[i][k2], C = rings[i + 1][k2], D = rings[i + 1][k];
        // the side faces away from the middle of the bar
        const mx = (A[0] + B[0] + C[0] + D[0]) / 4 - (pts[i][0] + pts[i + 1][0]) / 2;
        const my = (A[1] + B[1] + C[1] + D[1]) / 4 - (pts[i][1] + pts[i + 1][1]) / 2;
        const mz = (A[2] + B[2] + C[2] + D[2]) / 4 - (pts[i][2] + pts[i + 1][2]) / 2;
        const ml = Math.hypot(mx, my, mz) || 1;
        this.quad(A, B, C, D, [mx / ml, my / ml, mz / ml], color, q);
      }
    }
  }

  /** A straight square bar between two points, as thick as `ra` at one end and `rb` at the other. */
  beam(a: V3, b: V3, ra: number, rb: number, color: Col, o: BoxOpts = {}): void {
    this.sweep([a, b], [ra, rb], color, o);
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aWall', new THREE.Float32BufferAttribute(this.wall, 4));
    g.setAttribute('aWin', new THREE.Float32BufferAttribute(this.win, 4));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    return g;
  }
}

/** A small repeatable random number generator, so the scene is the same on every load. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
