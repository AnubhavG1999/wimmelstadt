// Small parts that landmarks are made of: a triangle that always faces the way
// it is told to, a pinnacle, a dome or a basin turned from an outline, a roof
// with four slopes, an arch cut through a wall, a rose window or a clock, a
// wheel on a level axle, flags, a parasol, a scooter and a person in uniform.
// Europe's builder wrote these, and by its third quarter a landmark took a
// quarter of the time the first ones had.

import type { GeoBuilder, QuadOpts, V3, WinSpec } from './geo';
import type { Build } from './tile';

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
 * A steep roof on a block: four slopes up from its eaves to a flat top, each
 * leaning in by `inX` or `inZ`. A mansard, or the roof of a pavilion. If it
 * leans in by half the block's width, the top is a ridge.
 */
export function hipped(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, inX: number, inZ: number, color: number, top: number = color, o: QuadOpts = {}): void {
  const a: V3[] = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]];
  const c: V3[] = [[x0 + inX, y1, z0 + inZ], [x1 - inX, y1, z0 + inZ], [x1 - inX, y1, z1 - inZ], [x0 + inX, y1, z1 - inZ]];
  const rise = y1 - y0, lx = Math.hypot(rise, inX), lz = Math.hypot(rise, inZ);
  const ns: V3[] = [[0, inZ / lz, -rise / lz], [rise / lx, inX / lx, 0], [0, inZ / lz, rise / lz], [-rise / lx, inX / lx, 0]];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    b.quad(a[i], a[j], c[j], c[i], ns[i], color, o);
  }
  b.quad(c[3], c[2], c[1], c[0], [0, 1, 0], top);
}

/**
 * An arched way through a wall that runs along x: the wall above the arch on
 * both faces of it, and the vault between them. The way is `w` wide, its
 * sides are straight up to `spring`, and the arch on top is half a circle.
 * The wall's faces are at z0 and z1, and it is built up as far as `top`.
 */
export function archway(b: GeoBuilder, cx: number, z0: number, z1: number, w: number, spring: number, top: number, color: number, soffit: number, n = 8): void {
  const r = w / 2;
  const at = (i: number): [number, number] => {
    const a = Math.PI * (1 - i / n);
    return [cx + Math.cos(a) * r, spring + Math.sin(a) * r];
  };
  for (let i = 0; i < n; i++) {
    const [xa, ya] = at(i), [xb, yb] = at(i + 1);
    for (const [z, nz] of [[z0, -1], [z1, 1]]) b.quad([xa, ya, z], [xb, yb, z], [xb, top, z], [xa, top, z], [0, 0, nz], color);
    const am = Math.PI * (1 - (i + 0.5) / n);
    b.quad([xa, ya, z0], [xb, yb, z0], [xb, yb, z1], [xa, ya, z1], [-Math.cos(am), -Math.sin(am), 0], soffit);
  }
}

/**
 * A flat round shape that stands upright on a wall and looks north, east,
 * south or west: a rose window, a clock, the head of an arched doorway.
 */
export function roundel(b: GeoBuilder, c: V3, r: number, facing: 'N' | 'E' | 'S' | 'W', color: number, o: QuadOpts = {}, sides = 10): void {
  const n: V3 = facing === 'E' ? [1, 0, 0] : facing === 'W' ? [-1, 0, 0] : facing === 'S' ? [0, 0, 1] : [0, 0, -1];
  const ax = n[0] !== 0 ? 0 : 1, az = n[0] !== 0 ? 1 : 0;
  const p = (i: number): V3 => {
    const a = (i / sides) * Math.PI * 2;
    return [c[0] + ax * Math.cos(a) * r, c[1] + Math.sin(a) * r, c[2] + az * Math.cos(a) * r];
  };
  for (let i = 1; i + 1 < sides; i++) tri(b, p(0), p(i), p(i + 1), n, color, o);
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

/**
 * A flag of upright bands on a staff `staff` high that stands at height `y`:
 * Italy's green, white and red, or France's. It flies towards the east.
 */
export function bandedFlag(b: GeoBuilder, x: number, z: number, y: number, staff: number, bands: number[], fl = 2.7, fh = 1.7): void {
  b.cyl(x, z, y, y + staff, 0.12, 0.06, 6, 0xdadada, { cap: false });
  const fy = y + staff - fh - 0.15, w = fl / bands.length;
  bands.forEach((color, i) => {
    for (const side of [-1, 1]) b.quad([x + 0.1 + i * w, fy, z + side * 0.02], [x + 0.1 + (i + 1) * w, fy, z + side * 0.02], [x + 0.1 + (i + 1) * w, fy + fh, z + side * 0.02], [x + 0.1 + i * w, fy + fh, z + side * 0.02], [0, 0, side], color);
  });
}
export const ITALY = [0x2f8f4f, 0xf4f1e8, 0xc8202c];

/**
 * A motorbike or a scooter on its stand: two wheels, the body between them,
 * and the handlebars. A scooter has a shield in front of the rider's legs.
 */
export function twoWheeler(b: GeoBuilder, x: number, z: number, yaw: number, color: number, shield = false): void {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (const l of [-0.68, 0.68]) b.obox(x + c * l, 0.33, z + s * l, 0.33, 0.33, 0.09, yaw, 0x16171c);
  b.obox(x - (shield ? c * 0.15 : 0), 0.6, z - (shield ? s * 0.15 : 0), shield ? 0.55 : 0.62, 0.2, shield ? 0.2 : 0.15, yaw, color);
  if (shield) b.obox(x + c * 0.5, 0.75, z + s * 0.5, 0.07, 0.42, 0.24, yaw, color);
  b.obox(x + c * 0.5, shield ? 1.22 : 0.92, z + s * 0.5, 0.05, 0.1, 0.36, yaw, 0xc9ced3);
}

/** A parasol on its pole, with a small round table under it. */
export function parasol(b: GeoBuilder, x: number, z: number, shade: number, y = 0): void {
  b.cyl(x, z, y, y + 2.3, 0.06, 0.06, 4, 0x8d8a83, { cap: false });
  b.cyl(x, z, y + 0.72, y + 0.8, 0.5, 0.5, 6, 0xf2efe6);
  b.cyl(x, z, y + 2.1, y + 2.75, 1.35, 0.06, 8, shade, { cap: false });
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
