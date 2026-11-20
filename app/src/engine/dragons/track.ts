// A line in the air for a dragon to fly: smooth through its places, and
// flown at the speed each place gives. Westeros's dragons fly their circuit
// and their ways alone on these.

import * as THREE from 'three';

/** A place in the air and the speed to fly through it at: [x, y, z, speed]. */
export type Waypoint = [x: number, y: number, z: number, speed: number];

const UP = new THREE.Vector3(0, 1, 0);
const smooth = (t: number): number => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c); };

/** A smooth line through places in the air, flown at the speed each place gives. */
export class Track {
  readonly closed: boolean;
  /** How long it is, and how long it takes to fly. */
  readonly length: number;
  duration: number;
  /** How far along it each of its places is. */
  readonly wayS: number[] = [];

  private readonly n: number;
  private readonly p: Float32Array;
  private readonly r: Float32Array;
  private readonly s: Float32Array;
  private readonly t: Float32Array;
  /** Where the part that is flown begins, for a line whose first places only set its direction. */
  private readonly s0: number;
  private t0: number;

  /**
   * `lead` and `tail` are how many places at the start and at the end are
   * there only to set the direction the line leaves and arrives in: it is flown
   * from the place after the lead to the place before the tail.
   */
  constructor(way: Waypoint[], closed: boolean, lead = 0, tail = 0, hold?: { at: number; seconds: number }) {
    this.closed = closed;
    const curve = new THREE.CatmullRomCurve3(way.map((w) => new THREE.Vector3(w[0], w[1], w[2])), closed, 'centripetal');
    const N = way.length, segs = closed ? N : N - 1;
    const pts: THREE.Vector3[] = [], speed: number[] = [];
    const wayAt: number[] = [];
    for (let k = 0; k < segs; k++) {
      const a = way[k], b = way[(k + 1) % N];
      const steps = Math.max(6, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 0.6));
      wayAt.push(pts.length);
      for (let j = 0; j < steps; j++) {
        pts.push(curve.getPoint((k + j / steps) / segs));
        speed.push(a[3] + (b[3] - a[3]) * smooth(j / steps));
      }
    }
    if (!closed) {
      wayAt.push(pts.length);
      pts.push(curve.getPoint(1));
      speed.push(way[N - 1][3]);
    }
    const n = (this.n = pts.length);
    this.p = new Float32Array(n * 3);
    this.r = new Float32Array(n * 3);
    this.s = new Float32Array(n + 1);
    this.t = new Float32Array(n + 1);
    pts.forEach((q, i) => this.p.set([q.x, q.y, q.z], i * 3));
    // how far along each point is, and when the dragon is there
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const d = a.distanceTo(b);
      this.s[i + 1] = this.s[i] + d;
      this.t[i + 1] = this.t[i] + d / Math.max(2.5, (speed[i] + speed[(i + 1) % n]) / 2);
    }
    if (!closed) { this.s[n] = this.s[n - 1]; this.t[n] = this.t[n - 1]; }
    const total = this.s[last];
    for (const i of wayAt) this.wayS.push(this.s[i]);
    // where it sits a while, the clock runs on and it stays where it is (it creeps one step, which keeps it knowing which way it faces)
    if (hold) for (let i = wayAt[hold.at] + 1; i <= n; i++) this.t[i] += hold.seconds;

    // What is "to the right" at each point: level where the line is level, and
    // carried along unchanged where it climbs straight up, so that it never flips.
    const tan = new THREE.Vector3(), level = new THREE.Vector3(), right = new THREE.Vector3();
    const tangent = (i: number): THREE.Vector3 => {
      const a = pts[closed ? (i + n - 1) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      return tan.subVectors(b, a).normalize();
    };
    tangent(0);
    right.crossVectors(tan, UP).normalize();
    for (let pass = 0; pass < (closed ? 2 : 1); pass++) {
      for (let i = 0; i < n; i++) {
        tangent(i);
        right.addScaledVector(tan, -right.dot(tan)).normalize();
        const flat = 1 - Math.abs(tan.y);
        if (flat > 0.12) {
          level.crossVectors(tan, UP).normalize();
          // it is pulled level again over a few units, faster the more level the line is
          right.lerp(level, Math.min(1, 0.22 * flat * flat)).normalize();
        }
        this.r.set([right.x, right.y, right.z], i * 3);
      }
    }

    this.s0 = lead > 0 ? this.wayS[lead] : 0;
    const s1 = tail > 0 ? this.wayS[N - 1 - tail] : total;
    this.length = s1 - this.s0;
    this.t0 = this.timeAtRaw(this.s0);
    this.duration = this.timeAtRaw(s1) - this.t0;
    for (let i = 0; i < this.wayS.length; i++) this.wayS[i] -= this.s0;
  }

  /** Makes it take a given time, by flying all of it that much faster or slower. */
  retime(duration: number): void {
    const f = duration / this.duration;
    for (let i = 0; i < this.t.length; i++) this.t[i] *= f;
    this.t0 *= f;
    this.duration = duration;
  }

  private timeAtRaw(s: number): number {
    const i = this.find(this.s, s);
    const span = this.s[i + 1] - this.s[i];
    return this.t[i] + (span > 1e-9 ? ((s - this.s[i]) / span) * (this.t[i + 1] - this.t[i]) : 0);
  }

  /** The last index whose value is no more than `v`. */
  private find(a: Float32Array, v: number): number {
    let lo = 0, hi = (this.closed ? this.n : this.n - 1) - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (a[mid] <= v) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  /** How far along it the dragon is at a time. A closed line goes round and round. */
  sAt(time: number): number {
    const full = this.closed ? this.t[this.n] : 0;
    let t = time + this.t0;
    let turns = 0;
    if (this.closed) { turns = Math.floor(t / full); t -= turns * full; }
    else t = Math.min(this.t0 + this.duration, Math.max(this.t0, t));
    const i = this.find(this.t, t);
    const span = this.t[i + 1] - this.t[i];
    const s = this.s[i] + (span > 1e-9 ? ((t - this.t[i]) / span) * (this.s[i + 1] - this.s[i]) : 0);
    return s - this.s0 + turns * this.s[this.n];
  }

  /** When it is at a distance along the line. */
  tAt(s: number): number {
    return this.timeAtRaw(s + this.s0) - this.t0;
  }

  private where(s: number): [number, number] {
    const total = this.closed ? this.s[this.n] : this.s[this.n - 1];
    let d = s + this.s0;
    if (this.closed) d = ((d % total) + total) % total;
    else d = Math.min(total, Math.max(0, d));
    const i = this.find(this.s, d);
    const span = this.s[i + 1] - this.s[i];
    return [i, span > 1e-9 ? (d - this.s[i]) / span : 0];
  }

  /** The place at a distance along the line. */
  point(s: number, out: THREE.Vector3): THREE.Vector3 {
    const [i, f] = this.where(s);
    const j = this.closed ? (i + 1) % this.n : Math.min(this.n - 1, i + 1), p = this.p;
    return out.set(p[i * 3] + (p[j * 3] - p[i * 3]) * f, p[i * 3 + 1] + (p[j * 3 + 1] - p[i * 3 + 1]) * f, p[i * 3 + 2] + (p[j * 3 + 2] - p[i * 3 + 2]) * f);
  }

  /** What is to the right of the line at a distance along it. */
  rightAt(s: number, out: THREE.Vector3): THREE.Vector3 {
    const [i, f] = this.where(s);
    const j = this.closed ? (i + 1) % this.n : Math.min(this.n - 1, i + 1), r = this.r;
    return out.set(r[i * 3] + (r[j * 3] - r[i * 3]) * f, r[i * 3 + 1] + (r[j * 3 + 1] - r[i * 3 + 1]) * f, r[i * 3 + 2] + (r[j * 3 + 2] - r[i * 3 + 2]) * f).normalize();
  }
}

