// Small parts that more than one of Europe's landmarks is made of.

import type { GeoBuilder, QuadOpts, V3, WinSpec } from '../../engine/geo';
import type { Build } from '../../engine/tile';

export const Q = Math.PI / 4;
/** A four-sided "cylinder" is measured to its corners: this turns half a width into that radius. */
export const D = Math.SQRT2;
export const rad = (deg: number): number => (deg * Math.PI) / 180;

export const GOLD = 0xd9b24a, SKIN = 0xe8c4a0;

/**
 * A triangle that faces the way `n` points, whichever way round its corners
 * are given. The engine's own `tri` trusts their order, and one given the
 * wrong way round is not drawn at all from the side it is meant to be seen from.
 */
export function tri(b: GeoBuilder, p0: V3, p1: V3, p2: V3, n: V3, color: number, o: QuadOpts = {}): void {
  const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
  const bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
  const facing = (ay * bz - az * by) * n[0] + (az * bx - ax * bz) * n[1] + (ax * by - ay * bx) * n[2];
  if (facing >= 0) b.tri(p0, p1, p2, n, color, o);
  else b.tri(p0, p2, p1, n, color, o);
}

/** A pinnacle: a small block with a spike on it. */
export function pinnacle(b: GeoBuilder, x: number, z: number, y: number, h: number, r: number, color: number): void {
  b.box(x - r, y, z - r, x + r, y + h * 0.38, z + r, color);
  b.cyl(x, z, y + h * 0.38, y + h, r * D, 0.03, 4, color, { phase: Q, cap: false });
}

/** A street lamp of the old kind: a post with a lantern on it, lit at night. */
export function lantern(k: Build, x: number, z: number, y: number, h: number, post: number): void {
  k.b.box(x - 0.11, y, z - 0.11, x + 0.11, y + h, z + 0.11, post);
  k.b.box(x - 0.3, y + h, z - 0.3, x + 0.3, y + h + 0.14, z + 0.3, post);
  k.glows.push({ x, y: y + h + 0.42, z, sx: 0.44, sy: 0.5, sz: 0.44, color: '#ffe2ae' });
  k.lights.push({ x, z, r: 8, color: '#ffd9a0', k: 0.4 });
}

/**
 * A shape turned on a lathe: a dome, a cap, a bowl. `rings` are its radius and
 * height at each place where its outline bends, from the bottom up.
 */
export function lathe(b: GeoBuilder, x: number, z: number, rings: [number, number][], sides: number, color: number, o: { win?: WinSpec; seed?: number } = {}): void {
  for (let i = 0; i + 1 < rings.length; i++) {
    const [r0, y0] = rings[i], [r1, y1] = rings[i + 1];
    b.cyl(x, z, y0, y1, r0, r1, sides, color, { ...o, cap: false });
  }
}

/**
 * The Union Flag on a staff `staff` high that stands at height `y`: red and
 * white crosses on blue. It flies towards the east, so it is seen from the
 * north and from the south.
 */
export function unionFlag(b: GeoBuilder, x: number, z: number, y: number, staff: number, fl = 3.4, fh = 2.0): void {
  b.cyl(x, z, y, y + staff, 0.14, 0.07, 6, 0xdadada, { cap: false });
  const fy = y + staff - fh - 0.2;
  for (const side of [-1, 1]) {
    const face = (u0: number, v0: number, u1: number, v1: number, out: number, color: number): void =>
      b.quad([x + 0.1 + u0, fy + v0, z + side * out], [x + 0.1 + u1, fy + v0, z + side * out], [x + 0.1 + u1, fy + v1, z + side * out], [x + 0.1 + u0, fy + v1, z + side * out], [0, 0, side], color);
    face(0, 0, fl, fh, 0.02, 0x23408f);
    face(0, fh * 0.34, fl, fh * 0.66, 0.035, 0xf4f1e8);
    face(fl * 0.4, 0, fl * 0.6, fh, 0.035, 0xf4f1e8);
    face(0, fh * 0.42, fl, fh * 0.58, 0.05, 0xc8202c);
    face(fl * 0.45, 0, fl * 0.55, fh, 0.05, 0xc8202c);
  }
  b.cyl(x, z, y + staff, y + staff + 0.4, 0.2, 0.2, 6, GOLD);
}

/**
 * A wheel on a level axle that runs from north to south: eight sides, with
 * the tyre and the hub drawn on the side that shows. `out` is 1 if that is
 * the south side and -1 if it is the north. Turn it with the builder's `moved`.
 */
export function wheel(b: GeoBuilder, x: number, y: number, z: number, r: number, half: number, out: number, tyre = 0x17171a, hub = 0xb9bcc2): void {
  const n = 8;
  const ring = (rr: number, zz: number): V3[] => Array.from({ length: n }, (_, i): V3 => {
    const a = ((i + 0.5) / n) * Math.PI * 2;
    return [x + Math.cos(a) * rr, y + Math.sin(a) * rr, zz];
  });
  const a = ring(r, z - half), c = ring(r, z + half);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, am = ((i + 1) / n) * Math.PI * 2;
    b.quad(a[i], a[j], c[j], c[i], [Math.cos(am), Math.sin(am), 0], tyre);
  }
  const zf = z + out * half, f = ring(r, zf), h = ring(r * 0.5, zf + out * 0.03);
  for (let i = 1; i + 1 < n; i++) {
    tri(b, f[0], f[i], f[i + 1], [0, 0, out], tyre);
    tri(b, h[0], h[i], h[i + 1], [0, 0, out], hub);
  }
}

/** What a figure wears: `hatH` is how tall its hat is, and `hatR` half how wide. */
export interface Dress { coat: number; legs: number; hat: number; hatH: number; hatR?: number; skin?: number }

/**
 * A figure in uniform, the size of the tile's own people. Those are dressed at
 * random, so whoever must wear something is built with this: a guardsman, a
 * Yeoman Warder, a statue.
 */
export function figure(b: GeoBuilder, x: number, z: number, y: number, d: Dress): void {
  const r = d.hatR ?? 0.31;
  b.box(x - 0.34, y, z - 0.22, x + 0.34, y + 0.85, z + 0.22, d.legs, { faces: 'NESW' });
  b.box(x - 0.4, y + 0.85, z - 0.25, x + 0.4, y + 1.9, z + 0.25, d.coat);
  b.box(x - 0.25, y + 1.9, z - 0.25, x + 0.25, y + 2.3, z + 0.25, d.skin ?? SKIN, { faces: 'NESW' });
  b.box(x - r, y + 2.25, z - r, x + r, y + 2.25 + d.hatH, z + r, d.hat);
}
