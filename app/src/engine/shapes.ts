// Shapes that a tile's models share, beyond the boxes, cylinders and bars of
// the builder in geo.ts: a triangle that always faces the way it is told to, a
// wall round a plan of any number of corners, pitched and hipped roofs, a slab
// between two heights, a roof that follows a line, a drum, a rail and a lamp
// for the top of a tower. Hong Kong's builder wrote these.

import type { GeoBuilder, QuadOpts, V3, WinSpec } from './geo';
import type { Build } from './tile';

/** A point on the ground: [x, z]. */
export type XZ = [number, number];

/** A flat triangle that faces the way `n` points, whichever way round its corners are given. */
export function face3(b: GeoBuilder, p0: V3, p1: V3, p2: V3, n: V3, color: number, o: QuadOpts = {}): void {
  const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2], bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
  const dot = (ay * bz - az * by) * n[0] + (az * bx - ax * bz) * n[1] + (ax * by - ay * bx) * n[2];
  if (dot >= 0) b.tri(p0, p1, p2, n, color, o);
  else b.tri(p0, p2, p1, n, color, o);
}

/** A flat triangle that faces whichever way is upwards, with the light falling on it as it slopes. */
export function slope3(b: GeoBuilder, p0: V3, p1: V3, p2: V3, color: number, o: QuadOpts = {}): void {
  const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2], bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
  let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
  const l = Math.hypot(nx, ny, nz) || 1;
  if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
  face3(b, p0, p1, p2, [nx / l, ny / l, nz / l], color, o);
}

/**
 * Upright walls round a plan of any number of corners, and a flat top on it
 * unless `top` is false. The plan must bulge outwards everywhere.
 */
export function prism(b: GeoBuilder, plan: XZ[], y0: number, y1: number, color: number, o: { win?: WinSpec; seed?: number; top?: number | false } = {}): void {
  const cx = plan.reduce((s, p) => s + p[0], 0) / plan.length, cz = plan.reduce((s, p) => s + p[1], 0) / plan.length;
  plan.forEach((p, i) => {
    const q = plan[(i + 1) % plan.length];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    let nx = (q[1] - p[1]) / len, nz = -(q[0] - p[0]) / len;
    if (nx * ((p[0] + q[0]) / 2 - cx) + nz * ((p[1] + q[1]) / 2 - cz) < 0) { nx = -nx; nz = -nz; }
    b.quad([p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], [nx, 0, nz], color, { win: o.win, seed: (o.seed ?? 0) + i * 0.13, L: len });
    if (o.top !== false) b.up([cx, y1, cz], [p[0], y1, p[1]], [q[0], y1, q[1]], o.top ?? color);
  });
}

/** A square with its corners cut off, as a plan: `half` is half its width, and `cut` how much each corner loses. */
export const chamfered = (cx: number, cz: number, half: number, cut: number): XZ[] => [
  [cx - half + cut, cz - half], [cx + half - cut, cz - half], [cx + half, cz - half + cut], [cx + half, cz + half - cut],
  [cx + half - cut, cz + half], [cx - half + cut, cz + half], [cx - half, cz + half - cut], [cx - half, cz - half + cut],
];

/**
 * A pitched roof over a rectangle: two slopes that meet in a ridge, and the
 * two triangles of wall under its ends. The ridge runs `along` x or z, `rise`
 * above the eaves at `y`, and the slopes reach `over` beyond the walls.
 */
export function gable(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, rise: number, roof: number, wall: number, along: 'x' | 'z', over = 0.45, o: QuadOpts = {}): void {
  if (along === 'x') {
    const zc = (z0 + z1) / 2, run = (z1 - z0) / 2 + over, len = Math.hypot(run, rise), a = x0 - over, c = x1 + over;
    b.quad([a, y, z0 - over], [c, y, z0 - over], [c, y + rise, zc], [a, y + rise, zc], [0, run / len, -rise / len], roof, o);
    b.quad([c, y, z1 + over], [a, y, z1 + over], [a, y + rise, zc], [c, y + rise, zc], [0, run / len, rise / len], roof, o);
    const top = y + (rise * (z1 - z0)) / 2 / run;
    face3(b, [x0, y, z0], [x0, y, z1], [x0, top, zc], [-1, 0, 0], wall);
    face3(b, [x1, y, z0], [x1, y, z1], [x1, top, zc], [1, 0, 0], wall);
  } else {
    const xc = (x0 + x1) / 2, run = (x1 - x0) / 2 + over, len = Math.hypot(run, rise), a = z0 - over, c = z1 + over;
    b.quad([x0 - over, y, a], [x0 - over, y, c], [xc, y + rise, c], [xc, y + rise, a], [-rise / len, run / len, 0], roof, o);
    b.quad([x1 + over, y, c], [x1 + over, y, a], [xc, y + rise, a], [xc, y + rise, c], [rise / len, run / len, 0], roof, o);
    const top = y + (rise * (x1 - x0)) / 2 / run;
    face3(b, [x0, y, z0], [x1, y, z0], [xc, top, z0], [0, 0, -1], wall);
    face3(b, [x0, y, z1], [x1, y, z1], [xc, top, z1], [0, 0, 1], wall);
  }
}

/** A roof of four slopes over a rectangle, with its ridge along the longer side. It reaches `over` beyond the walls. */
export function hip(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, rise: number, color: number, over = 0.5): void {
  const ax0 = x0 - over, az0 = z0 - over, ax1 = x1 + over, az1 = z1 + over, w = ax1 - ax0, d = az1 - az0, run = Math.min(w, d) / 2, len = Math.hypot(run, rise);
  const n = (nx: number, nz: number): V3 => [(nx * rise) / len, run / len, (nz * rise) / len];
  const A: V3 = [ax0, y, az0], B: V3 = [ax1, y, az0], C: V3 = [ax1, y, az1], D: V3 = [ax0, y, az1];
  if (w >= d) {
    const R0: V3 = [ax0 + run, y + rise, (az0 + az1) / 2], R1: V3 = [ax1 - run, y + rise, (az0 + az1) / 2];
    b.quad(D, C, R1, R0, n(0, 1), color);
    b.quad(B, A, R0, R1, n(0, -1), color);
    face3(b, A, D, R0, n(-1, 0), color);
    face3(b, C, B, R1, n(1, 0), color);
  } else {
    const R0: V3 = [(ax0 + ax1) / 2, y + rise, az0 + run], R1: V3 = [(ax0 + ax1) / 2, y + rise, az1 - run];
    b.quad(A, D, R1, R0, n(-1, 0), color);
    b.quad(C, B, R0, R1, n(1, 0), color);
    face3(b, B, A, R0, n(0, -1), color);
    face3(b, D, C, R1, n(0, 1), color);
  }
}

/**
 * A flat slab between two points in space, which may be at different heights:
 * a ramp, a flight of stairs, a canopy that slopes, one plane of a roof. The
 * two points are the middle of its top at each end, `half` is half its width,
 * measured level, and `thick` is how far it reaches down.
 */
export function slab(b: GeoBuilder, a: V3, c: V3, half: number, thick: number, color: number, o: QuadOpts & { under?: number } = {}): void {
  const dx = c[0] - a[0], dy = c[1] - a[1], dz = c[2] - a[2], l = Math.hypot(dx, dz) || 1, run = Math.hypot(l, dy);
  const px = (-dz / l) * half, pz = (dx / l) * half;
  const A: V3 = [a[0] - px, a[1], a[2] - pz], B: V3 = [a[0] + px, a[1], a[2] + pz], C: V3 = [c[0] + px, c[1], c[2] + pz], D: V3 = [c[0] - px, c[1], c[2] - pz];
  const n: V3 = [(-dy * dx) / (l * run), l / run, (-dy * dz) / (l * run)];
  const low = (p: V3): V3 => [p[0], p[1] - thick, p[2]];
  const { under, ...q } = o;
  b.quad(A, B, C, D, n, color, q);
  b.quad(low(A), low(B), low(C), low(D), [-n[0], -n[1], -n[2]], under ?? color);
  b.quad(low(A), low(D), D, A, [-px / half, 0, -pz / half], under ?? color);
  b.quad(low(B), low(C), C, B, [px / half, 0, pz / half], under ?? color);
  b.quad(low(A), low(B), B, A, [-dx / l, 0, -dz / l], under ?? color);
  b.quad(low(D), low(C), C, D, [dx / l, 0, dz / l], under ?? color);
}

/**
 * A roof that follows a line of [across, height] points, the same all the way
 * along: a vault, a wing, a wave. `along` says which way it runs unchanged,
 * from `from` to `to`; the points give where it is across that, and how high.
 */
export function shell(b: GeoBuilder, along: 'x' | 'z', from: number, to: number, pts: [number, number][], thick: number, color: number, o: QuadOpts & { under?: number } = {}): void {
  const mid = (from + to) / 2, half = Math.abs(to - from) / 2;
  for (let i = 0; i < pts.length - 1; i++) {
    const [u0, y0] = pts[i], [u1, y1] = pts[i + 1];
    if (along === 'x') slab(b, [mid, y0, u0], [mid, y1, u1], half, thick, color, o);
    else slab(b, [u0, y0, mid], [u1, y1, mid], half, thick, color, o);
  }
}

/** A drum that lies on its side, its axle along x: eight-sided, `r` in radius and `half` to each side of its middle. */
export function drum(b: GeoBuilder, c: V3, r: number, half: number, color: number, o: QuadOpts & { cap?: number } = {}): void {
  const { cap, ...q } = o, sides = 8;
  const at = (i: number, x: number, rr = r): V3 => [c[0] + x, c[1] + Math.cos((i / sides) * Math.PI * 2) * rr, c[2] + Math.sin((i / sides) * Math.PI * 2) * rr];
  for (let i = 0; i < sides; i++) {
    const m = ((i + 0.5) / sides) * Math.PI * 2;
    b.quad(at(i, -half), at(i, half), at(i + 1, half), at(i + 1, -half), [0, Math.cos(m), Math.sin(m)], color, q);
    for (const s of [-1, 1]) face3(b, [c[0] + s * half, c[1], c[2]], at(i, s * half), at(i + 1, s * half), [s, 0, 0], cap ?? color, q);
  }
}

/** A rail round the edge of a level rectangle: a thin band, on a post at every corner. */
export function railing(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, color: number, sides = 'NESW', h = 0.9): void {
  const t = 0.12;
  if (sides.includes('N')) b.box(x0, y + h - 0.2, z0, x1, y + h, z0 + t, color, { faces: 'NSTB' });
  if (sides.includes('S')) b.box(x0, y + h - 0.2, z1 - t, x1, y + h, z1, color, { faces: 'NSTB' });
  if (sides.includes('W')) b.box(x0, y + h - 0.2, z0, x0 + t, y + h, z1, color, { faces: 'EWTB' });
  if (sides.includes('E')) b.box(x1 - t, y + h - 0.2, z0, x1, y + h, z1, color, { faces: 'EWTB' });
  for (const [x, z] of [[x0, z0], [x1 - t, z0], [x1 - t, z1 - t], [x0, z1 - t]]) b.box(x, y, z, x + t, y + h, z + t, color, { faces: 'NESW' });
}

/** A red lamp on top of something tall, or a lamp of another colour. */
export function beacon(k: Build, x: number, y: number, z: number, s = 0.6, color = '#ff3b3b'): void {
  k.glows.push({ x, y, z, sx: s, sy: s, sz: s, color });
}

/** The middle of a lot, and half its smaller side. */
export const centre = (l: { x0: number; z0: number; x1: number; z1: number }): { cx: number; cz: number; half: number } =>
  ({ cx: (l.x0 + l.x1) / 2, cz: (l.z0 + l.z1) / 2, half: Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2 });
