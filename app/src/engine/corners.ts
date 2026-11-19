// Lines on the board: the middle of a road, the lanes on either side of it, how
// high each point of it is. A road here is a list of corners, rounded and then
// given heights, so that it can climb, dive and turn as Hong Kong's roads do.
// Hong Kong's builder wrote this, for the road up the Peak, the viaduct on
// stilts, the ramps into the tunnel and the round a jumbo jet flies.
//
// A point on the ground is [x, z]. A point in space is [x, y, z]. x points
// east, z points south and y points up, as everywhere on a tile.

import { buildPath, type Path, type Seg } from './paths';

export type P2 = [number, number];
export type P3 = [number, number, number];

const dist = (a: P2, b: P2): number => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** How far along a line each of its points is. */
export function lengths(pts: P2[]): number[] {
  const out = [0];
  for (let i = 1; i < pts.length; i++) out.push(out[i - 1] + dist(pts[i - 1], pts[i]));
  return out;
}

/** The same, for a line in space, measured along the ground. */
export function lengths3(pts: P3[]): number[] {
  const out = [0];
  for (let i = 1; i < pts.length; i++) out.push(out[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]));
  return out;
}

/** A line with a point every `step` or so, its own corners kept. */
export function fine(pts: P2[], step = 1.5): P2[] {
  const out: P2[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(dist(a, b) / step));
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}

/**
 * A line through the given corners, each rounded with radius `r` (or with a
 * radius of its own, if `r` is a list as long as the corners). Its first and
 * last corners are its ends, unless it is closed.
 */
export function rounded(corners: P2[], r: number | number[], closed = false, step = 1.2): P2[] {
  const n = corners.length;
  const out: P2[] = [];
  const radius = (i: number): number => (typeof r === 'number' ? r : r[i] ?? 0);
  const push = (p: P2): void => {
    const last = out[out.length - 1];
    if (!last || dist(last, p) > 1e-4) out.push(p);
  };
  for (let i = 0; i < n; i++) {
    const cur = corners[i];
    if (!closed && (i === 0 || i === n - 1)) { push(cur); continue; }
    const prev = corners[(i + n - 1) % n], next = corners[(i + 1) % n];
    let ax = cur[0] - prev[0], az = cur[1] - prev[1], bx = next[0] - cur[0], bz = next[1] - cur[1];
    const al = Math.hypot(ax, az), bl = Math.hypot(bx, bz);
    ax /= al; az /= al; bx /= bl; bz /= bl;
    const turn = Math.acos(Math.min(1, Math.max(-1, ax * bx + az * bz)));
    const rr0 = radius(i);
    if (turn < 1e-3 || rr0 <= 0) { push(cur); continue; }
    const t = Math.min(rr0 * Math.tan(turn / 2), al / 2, bl / 2);
    const rr = t / Math.tan(turn / 2);
    const sign = ax * bz - az * bx >= 0 ? 1 : -1;
    const sx = cur[0] - ax * t, sz = cur[1] - az * t;
    const cx = sx + sign * -az * rr, cz = sz + sign * ax * rr;
    const a0 = Math.atan2(sz - cz, sx - cx);
    const steps = Math.max(2, Math.ceil((turn * rr) / step));
    for (let k = 0; k <= steps; k++) {
      const a = a0 + sign * turn * (k / steps);
      push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr]);
    }
  }
  if (closed && out.length > 1 && dist(out[0], out[out.length - 1]) < 1e-4) out.pop();
  return out;
}

/**
 * The line that runs `d` to the right of this one, for someone travelling
 * along it, or to the left if `d` is negative. For a line that has already
 * been rounded and made fine: each point is moved straight across.
 */
export function beside(pts: P2[], d: number, closed = false): P2[] {
  const n = pts.length;
  return pts.map((p, i): P2 => {
    const a = pts[closed ? (i + n - 1) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
    return [p[0] + (-tz / l) * d, p[1] + (tx / l) * d];
  });
}

/** Gives every point of a line a height: `y` is told how far along the line the point is. */
export function raised(pts: P2[], y: number | ((s: number, p: P2) => number)): P3[] {
  const s = lengths(pts);
  return pts.map((p, i): P3 => [p[0], typeof y === 'number' ? y : y(s[i], p), p[1]]);
}

/** A height that runs in straight stretches through the given stops, each [how far along, how high]. */
export function through(stops: [number, number][]): (s: number) => number {
  return (s) => {
    if (s <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      if (s <= stops[i][0]) {
        const [s0, y0] = stops[i - 1], [s1, y1] = stops[i];
        return y0 + ((y1 - y0) * (s - s0)) / Math.max(1e-6, s1 - s0);
      }
    }
    return stops[stops.length - 1][1];
  };
}

/** Eases the places where a road changes slope, by averaging each height with its neighbours over `reach` units. */
export function eased(pts: P3[], reach = 4, closed = false): P3[] {
  const s = lengths3(pts), n = pts.length, total = s[n - 1];
  return pts.map((p, i): P3 => {
    // an open road keeps the height of its ends
    const room = closed ? reach : Math.min(reach, s[i], total - s[i]);
    if (room < 0.2) return p;
    let sum = 0, w = 0;
    for (let k = 0; k < n; k++) {
      let d = Math.abs(s[k] - s[i]);
      if (closed) d = Math.min(d, total - d);
      if (d > room) continue;
      const wt = 1 - d / (room + 1e-6);
      sum += pts[k][1] * wt;
      w += wt;
    }
    return [p[0], sum / w, p[2]];
  });
}

/** A lane beside a road in space: the same heights, `d` to the right of it (to the left if negative). */
export function lane(road: P3[], d: number): P3[] {
  const side = beside(road.map((p): P2 => [p[0], p[2]]), d);
  return road.map((p, i): P3 => [side[i][0], p[1], side[i][1]]);
}

/** One line after another, as one. A point that two of them share is kept once. */
export function joined(...lines: P3[][]): P3[] {
  const out: P3[] = [];
  for (const line of lines) {
    for (const p of line) {
      const last = out[out.length - 1];
      if (!last || Math.hypot(last[0] - p[0], last[1] - p[1], last[2] - p[2]) > 1e-3) out.push(p);
    }
  }
  return out;
}

export const flat = (pts: P2[], y = 0): P3[] => pts.map((p): P3 => [p[0], y, p[1]]);
export const turned = <T>(pts: T[]): T[] => [...pts].reverse();

/** The stretch of a line between two distances along it. */
export function stretch(pts: P3[], s0: number, s1: number): P3[] {
  const s = lengths3(pts);
  const at = (d: number): P3 => {
    const c = Math.min(s[s.length - 1], Math.max(0, d));
    let i = 1;
    while (i < s.length - 1 && s[i] < c) i++;
    const span = s[i] - s[i - 1], t = span > 1e-9 ? (c - s[i - 1]) / span : 0;
    const a = pts[i - 1], b = pts[i];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  };
  const out: P3[] = [at(s0)];
  pts.forEach((p, i) => { if (s[i] > s0 + 1e-3 && s[i] < s1 - 1e-3) out.push(p); });
  out.push(at(s1));
  return out;
}

/**
 * A line in space as the engine takes roads: stretch after stretch, each
 * straight and rising evenly. This is how a tile gives the engine a road of
 * any shape.
 */
export function segsOf(pts: P3[], closed = false): Seg[] {
  const out: Seg[] = [];
  const n = pts.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    if (Math.hypot(b[0] - a[0], b[2] - a[2]) < 1e-4) continue;
    out.push({ t: 'ramp', pts: [[a[0], a[2]], [b[0], b[2]]], y0: a[1], y1: b[1], r: 0 });
  }
  return out;
}

export const pathOf = (pts: P3[], closed = false): Path => buildPath(segsOf(pts, closed), closed);
