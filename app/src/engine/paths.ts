// Turns the description of a road into a line that vehicles, trains and road
// decks can follow, sampled evenly along its length.

import * as THREE from 'three';

/**
 * A stretch of road. A road is one stretch or several, end to end. Any stretch
 * may say how fast it is driven, in place of the road's own speed: a spiral
 * ramp is slower than the expressway it leads to.
 */
export type Seg = (
  | { t: 'ring'; pts: [number, number][]; y: number; r: number } // closed, every corner rounded with radius r
  | { t: 'poly'; pts: [number, number][]; y: number; r: number } // open, its inner corners rounded
  | { t: 'ramp'; pts: [number, number][]; y0: number; y1: number; r: number } // open, and rising evenly from y0 to y1
  | { t: 'helix'; cx: number; cz: number; R: number; phi0: number; phi1: number; y0: number; y1: number }
) & { speed?: number };

/** A rise in a road that runs east to west: up between x0 and x1, level to x2, down to x3. */
export interface Hump { x0: number; x1: number; x2: number; x3: number; y: number }

export function humpHeight(h: Hump, x: number): number {
  const ease = (t: number) => t * t * (3 - 2 * t);
  if (x <= h.x0 || x >= h.x3) return 0;
  if (x < h.x1) return h.y * ease((x - h.x0) / (h.x1 - h.x0));
  if (x <= h.x2) return h.y;
  return h.y * ease((h.x3 - x) / (h.x3 - h.x2));
}

const STEP = 0.5;

export class Path {
  readonly pts: THREE.Vector3[] = [];
  readonly length: number;
  /** Turning radius at each sample; very large on straights. */
  readonly radius: Float32Array;
  private readonly ds: number;
  readonly closed: boolean;
  /** How fast each sample is driven, where a stretch says so. Null if none does. */
  private readonly limit: Float32Array | null;

  /** `speeds` gives each point the speed of the stretch it belongs to, or 0 for the road's own. */
  constructor(raw: THREE.Vector3[], closed: boolean, speeds?: number[]) {
    this.closed = closed;
    const src = closed ? [...raw, raw[0]] : raw;
    const cum: number[] = [0];
    for (let i = 1; i < src.length; i++) cum.push(cum[i - 1] + src[i].distanceTo(src[i - 1]));
    const total = cum[cum.length - 1];
    const n = Math.max(2, Math.ceil(total / STEP));
    this.length = total;
    this.ds = closed ? total / n : total / (n - 1);

    this.limit = speeds && speeds.some((v) => v > 0) ? new Float32Array(n) : null;
    let j = 0;
    for (let i = 0; i < n; i++) {
      const s = Math.min(i * this.ds, total);
      while (j < cum.length - 2 && cum[j + 1] < s) j++;
      const span = cum[j + 1] - cum[j];
      const t = span > 1e-9 ? (s - cum[j]) / span : 0;
      this.pts.push(new THREE.Vector3().lerpVectors(src[j], src[j + 1], t));
      // the line between two points belongs to the stretch of the later one
      if (this.limit && speeds) this.limit[i] = speeds[(j + 1) % speeds.length] ?? 0;
    }

    // Turning radius from the change of heading over a couple of units of travel.
    this.radius = new Float32Array(n);
    const k = 3;
    for (let i = 0; i < n; i++) {
      const a = this.pts[this.index(i - k)], m = this.pts[i], c = this.pts[this.index(i + k)];
      const h1 = Math.atan2(m.z - a.z, m.x - a.x);
      const h2 = Math.atan2(c.z - m.z, c.x - m.x);
      let d = Math.abs(h2 - h1);
      if (d > Math.PI) d = 2 * Math.PI - d;
      const chord = k * this.ds;
      this.radius[i] = d < 1e-3 ? 1e4 : chord / d;
    }
  }

  private index(i: number): number {
    const n = this.pts.length;
    return this.closed ? ((i % n) + n) % n : Math.min(n - 1, Math.max(0, i));
  }

  private wrap(s: number): number {
    if (this.closed) return ((s % this.length) + this.length) % this.length;
    return Math.min(this.length, Math.max(0, s));
  }

  at(s: number, out: THREE.Vector3): THREE.Vector3 {
    const f = this.wrap(s) / this.ds;
    const i = Math.floor(f);
    return out.lerpVectors(this.pts[this.index(i)], this.pts[this.index(i + 1)], f - i);
  }

  radiusAt(s: number): number {
    return this.radius[this.index(Math.round(this.wrap(s) / this.ds))];
  }

  /** How fast this place is driven, if its stretch says so, and 0 if it does not. */
  limitAt(s: number): number {
    return this.limit ? this.limit[this.index(Math.round(this.wrap(s) / this.ds))] : 0;
  }

  /** The speed of every sample, for making another path from this one's points. */
  limits(): number[] | undefined {
    return this.limit ? Array.from(this.limit) : undefined;
  }

  /** How far along the path the point nearest to (x, z) is. */
  closest(x: number, z: number): number {
    let best = 0, least = Infinity;
    this.pts.forEach((p, i) => {
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < least) { least = d; best = i; }
    });
    return best * this.ds;
  }
}

function v(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z);
}

/** Rounds the corner at `cur` between `prev` and `next` with radius r. */
function fillet(prev: [number, number], cur: [number, number], next: [number, number], r: number, y: number, out: THREE.Vector3[]): void {
  let ax = cur[0] - prev[0], az = cur[1] - prev[1];
  let bx = next[0] - cur[0], bz = next[1] - cur[1];
  const al = Math.hypot(ax, az), bl = Math.hypot(bx, bz);
  ax /= al; az /= al; bx /= bl; bz /= bl;
  const cross = ax * bz - az * bx;
  const dot = Math.min(1, Math.max(-1, ax * bx + az * bz));
  const turn = Math.acos(dot);
  if (turn < 1e-3 || r <= 0) {
    out.push(v(cur[0], y, cur[1]));
    return;
  }
  const t = Math.min(r * Math.tan(turn / 2), al / 2, bl / 2);
  const rr = t / Math.tan(turn / 2);
  const sign = cross >= 0 ? 1 : -1;
  const sx = cur[0] - ax * t, sz = cur[1] - az * t;
  const cx = sx + sign * -az * rr, cz = sz + sign * ax * rr;
  const a0 = Math.atan2(sz - cz, sx - cx);
  const steps = Math.max(2, Math.ceil((turn * rr) / STEP));
  for (let i = 0; i <= steps; i++) {
    const a = a0 + sign * turn * (i / steps);
    out.push(v(cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr));
  }
}

export function segPoints(seg: Seg): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  if (seg.t === 'helix') {
    const sweep = Math.abs(seg.phi1 - seg.phi0);
    const steps = Math.ceil((sweep * seg.R) / STEP);
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const phi = seg.phi0 + (seg.phi1 - seg.phi0) * u;
      out.push(v(seg.cx + Math.cos(phi) * seg.R, seg.y0 + (seg.y1 - seg.y0) * u, seg.cz + Math.sin(phi) * seg.R));
    }
    return out;
  }
  const p = seg.pts, n = p.length;
  if (seg.t === 'ring') {
    for (let i = 0; i < n; i++) fillet(p[(i + n - 1) % n], p[i], p[(i + 1) % n], seg.r, seg.y, out);
    return out;
  }
  const y = seg.t === 'ramp' ? seg.y0 : seg.y;
  out.push(v(p[0][0], y, p[0][1]));
  for (let i = 1; i < n - 1; i++) fillet(p[i - 1], p[i], p[i + 1], seg.r, y, out);
  out.push(v(p[n - 1][0], y, p[n - 1][1]));
  if (seg.t === 'ramp') {
    // it rises evenly along its length
    const cum = [0];
    for (let i = 1; i < out.length; i++) cum.push(cum[i - 1] + Math.hypot(out[i].x - out[i - 1].x, out[i].z - out[i - 1].z));
    const total = cum[cum.length - 1] || 1;
    out.forEach((q, i) => { q.y = seg.y0 + (seg.y1 - seg.y0) * (cum[i] / total); });
  }
  return out;
}

export function buildPath(segs: Seg[], closed: boolean, hump?: Hump): Path {
  const all: THREE.Vector3[] = [], speeds: number[] = [];
  for (const seg of segs) {
    for (const p of segPoints(seg)) {
      const last = all[all.length - 1];
      if (!last || last.distanceToSquared(p) > 1e-6) {
        all.push(p);
        speeds.push(seg.speed ?? 0);
      }
    }
  }
  if (closed && all.length > 1 && all[0].distanceToSquared(all[all.length - 1]) < 1e-6) {
    all.pop();
    speeds.pop();
  }
  const flat = new Path(all, closed, speeds);
  if (!hump) return flat;
  // lift the road over the hump, then space the samples evenly again along the slope
  return new Path(flat.pts.map((p) => new THREE.Vector3(p.x, p.y + humpHeight(hump, p.x), p.z)), closed, flat.limits());
}

/**
 * The points of a path from one place along it to another, half a unit apart,
 * going forwards: on a closed path, round past its start if `to` is behind
 * `from`.
 */
export function stretch(path: Path, from: number, to: number): THREE.Vector3[] {
  let span = to - from;
  if (path.closed) span = ((span % path.length) + path.length) % path.length;
  const n = Math.max(1, Math.ceil(span / STEP));
  return Array.from({ length: n + 1 }, (_, i) => path.at(from + (i / n) * span, new THREE.Vector3()));
}

/**
 * One path through several lines of points laid end to end, and how far along
 * it each of them begins. For a route that runs over more than one piece of
 * track or of road. A route may turn back on itself where a line ends, as a
 * train does at a terminus.
 */
export function joined(parts: THREE.Vector3[][], closed: boolean): { path: Path; starts: number[] } {
  const all: THREE.Vector3[] = [], starts: number[] = [];
  let run = 0;
  for (const part of parts) {
    part.forEach((p, i) => {
      const last = all[all.length - 1];
      const d = last ? last.distanceTo(p) : 1;
      if (i === 0) starts.push(run + (last && d >= 1e-3 ? d : 0));
      if (last && d < 1e-3) return;
      if (last) run += d;
      all.push(p.clone());
    });
  }
  return { path: new Path(all, closed), starts };
}
