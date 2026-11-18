// Turns the road descriptions in scene-data.ts into lines that vehicles and
// road decks can follow, sampled evenly along their length.

import * as THREE from 'three';
import { humpHeight, type Hump, type Seg } from './scene-data';

const STEP = 0.5;

export class Path {
  readonly pts: THREE.Vector3[] = [];
  readonly length: number;
  /** Turning radius at each sample; very large on straights. */
  readonly radius: Float32Array;
  private readonly ds: number;

  constructor(raw: THREE.Vector3[], readonly closed: boolean) {
    const src = closed ? [...raw, raw[0]] : raw;
    const cum: number[] = [0];
    for (let i = 1; i < src.length; i++) cum.push(cum[i - 1] + src[i].distanceTo(src[i - 1]));
    const total = cum[cum.length - 1];
    const n = Math.max(2, Math.ceil(total / STEP));
    this.length = total;
    this.ds = closed ? total / n : total / (n - 1);

    let j = 0;
    for (let i = 0; i < n; i++) {
      const s = Math.min(i * this.ds, total);
      while (j < cum.length - 2 && cum[j + 1] < s) j++;
      const span = cum[j + 1] - cum[j];
      const t = span > 1e-9 ? (s - cum[j]) / span : 0;
      this.pts.push(new THREE.Vector3().lerpVectors(src[j], src[j + 1], t));
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
  out.push(v(p[0][0], seg.y, p[0][1]));
  for (let i = 1; i < n - 1; i++) fillet(p[i - 1], p[i], p[i + 1], seg.r, seg.y, out);
  out.push(v(p[n - 1][0], seg.y, p[n - 1][1]));
  return out;
}

export function buildPath(segs: Seg[], closed: boolean, hump?: Hump): Path {
  const all: THREE.Vector3[] = [];
  for (const seg of segs) {
    for (const p of segPoints(seg)) {
      const last = all[all.length - 1];
      if (!last || last.distanceToSquared(p) > 1e-6) all.push(p);
    }
  }
  if (closed && all.length > 1 && all[0].distanceToSquared(all[all.length - 1]) < 1e-6) all.pop();
  const flat = new Path(all, closed);
  if (!hump) return flat;
  // lift the road over the hump, then space the samples evenly again along the slope
  return new Path(flat.pts.map((p) => new THREE.Vector3(p.x, p.y + humpHeight(hump, p.x), p.z)), closed);
}
