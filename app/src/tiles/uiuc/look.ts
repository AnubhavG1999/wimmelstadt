// What the campus is made of: its colours, how its walls are glazed, and the
// small parts its buildings share. Every model on the tile takes these from
// here, so that the halls round the Quad look like one university.
//
// A storey here is 2.9 high, not the engine's 5: the campus is low, and at 5 a
// hall of four storeys would stand as high as its towers. Rows of windows are
// counted from the ground, so a wall's height is a whole number of storeys
// wherever that can be had.

import type { GeoBuilder, V3, WinSpec } from '../../engine/geo';
import { interior } from '../../engine/geo';
import { face3 } from '../../engine/shapes';

// --- colours ---

/** The red brick of the Quad, a deeper red for its older halls, the orange brick of Engineering Hall, and a buff. */
export const BRICK = { red: 0xa9523f, deep: 0x8f4436, orange: 0xc9783f, buff: 0xd9c4a0, brown: 0x8b5a45 };
/** White trim, limestone, and the darker stone of a base. */
export const TRIM = 0xf3f0e7, LIMESTONE = 0xdcd5c4, BASE = 0xc4bcaa;
/** Roofs: slate, the green of old copper, new copper, and a flat roof's felt. */
export const SLATE = 0x5d646e, GREEN_SLATE = 0x5f7468, VERDIGRIS = 0x6fa08c, COPPER = 0xb5683f, FELT = 0x8d8a83;
export const GLASS = 0x9fc0d4, DARK = 0x14161c, BRONZE = 0xc7a468, IRON = 0x6f747c;
/** The university's two colours, as colours and nothing more. */
export const ORANGE = 0xf26a21, NAVY = 0x13294b;

// --- how walls are glazed ---

export const STOREY = 2.9;
/** Brick halls: plain windows, one to a bay. */
export const HALL: WinSpec = { cell: 1.9, storey: STOREY, lit: 0.4, kind: 0 };
/** The same with narrower bays, for a small or an old building. */
export const HALL_NARROW: WinSpec = { cell: 1.5, storey: STOREY, lit: 0.36, kind: 0 };
/** A wall of glass: a lobby, a bay window, a lantern. */
export const GLAZED: WinSpec = { cell: 1.1, storey: STOREY, lit: 0.7, kind: 1 };
/** Tall slits, for a tower or a gable. */
export const SLITS: WinSpec = { cell: 1.2, storey: 3.6, lit: 0.3, kind: 6 };

// --- small parts ---

/**
 * A dormer on a roof that slopes down towards `out` ('N', 'S', 'E' or 'W'): a
 * small white box with a window, under a little roof of its own. (x, z) is the
 * middle of its front, and `y` the height of its sill.
 */
export function dormer(b: GeoBuilder, x: number, z: number, y: number, out: 'N' | 'S' | 'E' | 'W', roof: number, w = 0.95, h = 1.0, deep = 1.5): void {
  const along = out === 'N' || out === 'S';
  const s = out === 'S' || out === 'E' ? 1 : -1;
  // it reaches back into the roof from its front
  const x0 = along ? x - w / 2 : s > 0 ? x - deep : x, x1 = along ? x + w / 2 : s > 0 ? x : x + deep;
  const z0 = along ? (s > 0 ? z - deep : z) : z - w / 2, z1 = along ? (s > 0 ? z : z + deep) : z + w / 2;
  b.box(x0, y, z0, x1, y + h, z1, TRIM, { faces: 'NESW' });
  // its window, a hair proud of its front, lit at night
  const g = 0.04, wx = w * 0.32, wy0 = y + h * 0.18, wy1 = y + h * 0.86;
  if (along) b.box(x - wx, wy0, s > 0 ? z1 : z0 - g, x + wx, wy1, s > 0 ? z1 + g : z0, GLASS, { faces: s > 0 ? 'S' : 'N', win: interior(0.9) });
  else b.box(s > 0 ? x1 : x0 - g, wy0, z - wx, s > 0 ? x1 + g : x0, wy1, z + wx, GLASS, { faces: s > 0 ? 'E' : 'W', win: interior(0.9) });
  // and its roof: two slopes, with the ridge running back into the roof it sits on
  const o = 0.12, rise = w * 0.42, top = y + h;
  if (along) {
    const A: V3 = [x0 - o, top, z0 - (s > 0 ? 0 : o)], B: V3 = [x1 + o, top, z0 - (s > 0 ? 0 : o)], C: V3 = [x1 + o, top, z1 + (s > 0 ? o : 0)], D: V3 = [x0 - o, top, z1 + (s > 0 ? o : 0)];
    const R0: V3 = [x, top + rise, A[2]], R1: V3 = [x, top + rise, D[2]];
    b.quad(A, D, R1, R0, [-0.7, 0.7, 0], roof);
    b.quad(C, B, R0, R1, [0.7, 0.7, 0], roof);
    const front = s > 0 ? [D, C, R1] : [B, A, R0];
    face3(b, front[0], front[1], front[2], [0, 0, s], TRIM);
  } else {
    const A: V3 = [x0 - (s > 0 ? 0 : o), top, z0 - o], B: V3 = [x1 + (s > 0 ? o : 0), top, z0 - o], C: V3 = [x1 + (s > 0 ? o : 0), top, z1 + o], D: V3 = [x0 - (s > 0 ? 0 : o), top, z1 + o];
    const R0: V3 = [A[0], top + rise, z], R1: V3 = [B[0], top + rise, z];
    b.quad(B, A, R0, R1, [0, 0.7, -0.7], roof);
    b.quad(D, C, R1, R0, [0, 0.7, 0.7], roof);
    const front = s > 0 ? [B, C, R1] : [D, A, R0];
    face3(b, front[0], front[1], front[2], [s, 0, 0], TRIM);
  }
}

/** A chimney: a stack of brick from `y0` to `y1`, with a cap. */
export function chimney(b: GeoBuilder, x: number, z: number, y0: number, y1: number, brick: number, w = 0.55, d = 0.4): void {
  b.box(x - w, y0, z - d, x + w, y1, z + d, brick, { faces: 'NESW' });
  b.box(x - w - 0.1, y1, z - d - 0.1, x + w + 0.1, y1 + 0.22, z + d + 0.1, LIMESTONE);
}

/** A round column from `y0` to `y1`, with a plain base and capital. */
export function column(b: GeoBuilder, x: number, z: number, y0: number, y1: number, r: number, color = TRIM): void {
  b.box(x - r * 1.35, y0, z - r * 1.35, x + r * 1.35, y0 + r * 0.7, z + r * 1.35, color);
  b.cyl(x, z, y0 + r * 0.7, y1 - r * 0.7, r, r * 0.88, 8, color, { cap: false });
  b.box(x - r * 1.35, y1 - r * 0.7, z - r * 1.35, x + r * 1.35, y1, z + r * 1.35, color);
}

/**
 * Steps down from a level at `y` to the ground, as wide as from `a0` to `a1`
 * along the wall. They go down towards `out`, starting at `edge`.
 */
export function steps(b: GeoBuilder, a0: number, a1: number, edge: number, y: number, out: 'N' | 'S' | 'E' | 'W', color: number, tread = 0.5): void {
  const n = Math.max(1, Math.round(y / 0.3)), s = out === 'S' || out === 'E' ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const top = y - ((i + 1) * y) / (n + 1), near = edge + s * i * tread, far = edge + s * (i + 1) * tread;
    const lo = Math.min(near, far), hi = Math.max(near, far);
    if (out === 'N' || out === 'S') b.box(a0, 0, lo, a1, top, hi, color, { faces: out === 'S' ? 'ESWT' : 'NEWT' });
    else b.box(lo, 0, a0, hi, top, a1, color, { faces: out === 'E' ? 'NEST' : 'NSWT' });
  }
}

/**
 * A shop's awning on a wall that looks `out`: a slope of cloth from the wall
 * down to a front edge, and a valance that hangs from that edge. It runs from
 * `a0` to `a1` along the wall, which stands at `wall`, and meets the wall at
 * height `y`. Hands back the middle of the valance's face, a hair in front of
 * it, which is where its lettering hangs.
 */
export function awning(b: GeoBuilder, out: 'N' | 'S' | 'E' | 'W', a0: number, a1: number, wall: number, y: number, reach: number, fall: number, drop: number, color: number): { x: number; y: number; z: number; nx: number; nz: number } {
  const s = out === 'S' || out === 'E' ? 1 : -1, along = out === 'N' || out === 'S';
  const at = (a: number, o: number, h: number): V3 => (along ? [a, h, wall + s * o] : [wall + s * o, h, a]);
  const n: V3 = along ? [0, 0, s] : [s, 0, 0], end: V3 = along ? [1, 0, 0] : [0, 0, 1];
  const yf = y - fall, l = Math.hypot(fall, reach);
  // the cloth, the level underside that closes it, and its two ends
  b.quad(at(a0, 0, y), at(a0, reach, yf), at(a1, reach, yf), at(a1, 0, y), [(n[0] * fall) / l, reach / l, (n[2] * fall) / l], color);
  b.quad(at(a0, 0, yf), at(a0, reach, yf), at(a1, reach, yf), at(a1, 0, yf), [0, -1, 0], color);
  face3(b, at(a0, 0, y), at(a0, reach, yf), at(a0, 0, yf), [-end[0], 0, -end[2]], color);
  face3(b, at(a1, 0, y), at(a1, reach, yf), at(a1, 0, yf), end, color);
  // the valance
  const [p, q] = [at(a0, reach - 0.07, yf - drop), at(a1, reach, yf)];
  b.box(Math.min(p[0], q[0]), yf - drop, Math.min(p[2], q[2]), Math.max(p[0], q[0]), yf, Math.max(p[2], q[2]), color, { faces: 'NESWB' });
  const c = at((a0 + a1) / 2, reach + 0.03, yf - drop / 2);
  return { x: c[0], y: c[1], z: c[2], nx: n[0], nz: n[2] };
}

/** A weathervane: a rod, a ball, and an arrow that points east. */
export function weathervane(b: GeoBuilder, x: number, z: number, y: number, h: number): void {
  b.cyl(x, z, y, y + h, 0.07, 0.05, 4, BRONZE, { cap: false });
  b.cyl(x, z, y + h * 0.3, y + h * 0.3 + 0.24, 0.16, 0.16, 6, BRONZE);
  const ay = y + h * 0.78;
  b.box(x - 0.85, ay - 0.05, z - 0.05, x + 0.85, ay + 0.05, z + 0.05, BRONZE, { faces: 'NESWTB' });
  // its head, and its flight
  b.box(x + 0.7, ay - 0.17, z - 0.05, x + 1.05, ay + 0.17, z + 0.05, BRONZE, { faces: 'NESWTB' });
  b.box(x - 1.05, ay - 0.2, z - 0.05, x - 0.72, ay + 0.2, z + 0.05, BRONZE, { faces: 'NESWTB' });
}
