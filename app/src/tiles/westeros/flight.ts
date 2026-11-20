// Where the three dragons are at any moment: the line the leader flies, the
// places the other two hold beside it, and what each does on its own when the
// three split up.
//
// Everything here is a place as a function of time. Which way a dragon points,
// how hard it banks and how its wings are set all follow from that, and are
// worked out in dragons.ts.

import * as THREE from 'three';
import type { Waypoint } from './plan';

const UP = new THREE.Vector3(0, 1, 0);
const smooth = (t: number): number => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c); };

// ---------------------------------------------------------------------------
// A line in the air
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Formations
// ---------------------------------------------------------------------------

/** Where one dragon holds beside the leader's line: how far to its right, how far back along it, and how far above. */
export type Slot = [right: number, back: number, up: number];
/** A formation: a slot for Drogon, who leads, for Rhaegal and for Viserion. */
export type Formation = [Slot, Slot, Slot];

/** The arrowhead: the leader at the point, Rhaegal on his left and Viserion on his right, noses at his tail. */
export const VIC: Formation = [[0, 0, 0], [-7.5, 13, 0], [7.5, 13, 0]];
/** A diagonal line to the leader's left, each the same step back and out. */
export const ECHELON_LEFT: Formation = [[0, 0, 0], [-6.5, 10, 0], [-13, 20, 0]];
export const ECHELON_RIGHT: Formation = [[0, 0, 0], [6.5, 10, 0], [13, 20, 0]];
/** One behind another, nose to tail. */
export const ASTERN: Formation = [[0, 0, 0], [0, 17.5, 0], [0, 33.5, 0]];
/** The same, a little looser: for a tight turn round a tower. */
export const TRAIL: Formation = [[0, 0, 0], [0, 19, 0], [0, 37, 0]];
/** Side by side, the leader half a length ahead: for the climb. */
export const ABREAST: Formation = [[0, 0, 0], [-10, 3, 0], [10, 3, 0]];

/** From some way along the leader's line on, the three are in a formation: they slide into it over `over` units. */
export interface FormationKey { s: number; form: Formation; over: number }

const slot: Slot = [0, 0, 0];
/** The slot a dragon holds at a distance along the line, given the formations called along it. */
function slotAt(keys: FormationKey[], who: number, s: number, lap: number): Slot {
  // the formation flown before the first one that is called on this lap is the last lap's last
  let from = keys[keys.length - 1].form[who];
  let d = ((s % lap) + lap) % lap;
  slot[0] = from[0]; slot[1] = from[1]; slot[2] = from[2];
  for (const key of keys) {
    if (key.s > d) break;
    const to = key.form[who], w = smooth((d - key.s) / key.over);
    slot[0] = from[0] + (to[0] - from[0]) * w;
    slot[1] = from[1] + (to[1] - from[1]) * w;
    slot[2] = from[2] + (to[2] - from[2]) * w;
    from = [slot[0], slot[1], slot[2]];
  }
  return slot;
}

// ---------------------------------------------------------------------------
// The show
// ---------------------------------------------------------------------------

/** What a dragon is told to do at a moment, besides being where it is. */
export interface Cue {
  /** How strongly it breathes fire, from 0 to 1, and how far its throat glows before it does. */
  fire: number;
  charge: number;
  /** A roll about its line of flight, in radians, on top of its bank. */
  roll: number;
  /** Where it is in a wingbeat that it has been told to make: 0 if none. */
  beat: number;
  /** How much it sits: 0 flying, towards 1 as it flares, lands and folds its wings. */
  sit: number;
}

/** What one dragon does alone on a split. */
export interface Solo {
  way: Waypoint[];
  /** The place it lands and sits at, by its number in `way`, and for how long. */
  perch?: { at: number; seconds: number };
  /** Where it breathes fire: from a place, by its number, for so many seconds. */
  fire?: { at: number; seconds: number }[];
  /** Where it beats its wings: from a place, so many beats. */
  beats?: { at: number; n: number }[];
}

/** Something that happens for a while, to one dragon: fire, a roll, or wingbeats. */
interface Event { who: number; kind: 'fire' | 'roll' | 'beats'; t0: number; t1: number; n?: number }

/** One turn of the show: a display circuit, or one on which the three split at the top of their climb. */
interface Cycle { start: number; split: boolean; duration: number }

export interface ShowPlan {
  circuit: Waypoint[];
  /** Which places of the circuit are the top of the climb, and where the three are together again after a split. */
  top: number;
  rejoin: number;
  keys: { at: number; form: Formation; over: number }[];
  /** What each does alone on a split: places between the top and the rejoin. */
  solos: [Solo, Solo, Solo];
  /** Where the low pass and the climb are on the circuit, for the fire, and where the roll along the Wall begins. */
  pass: number; pull: number; lance: number; roll: number;
}

export class Show {
  readonly main: Track;
  private readonly keys: FormationKey[];
  private readonly solos: Track[] = [];
  private readonly cycles: Cycle[] = [];
  private readonly tTop: number;
  private readonly tRejoin: number;
  private readonly display: Event[] = [];
  private readonly splitEvents: Event[] = [];
  private readonly soloEvents: Event[] = [];
  /** How long each would take alone, before they are made to take the same time. */
  natural: number[] = [];
  /** Who lands on a split, and from when to when it sits, counted from the top of the climb. */
  private perch: { who: number; t0: number; t1: number } | null = null;
  private seed = 20261119;
  private readonly plan: ShowPlan;

  constructor(plan: ShowPlan) {
    this.plan = plan;
    this.main = new Track(plan.circuit, true);
    const m = this.main;
    this.keys = plan.keys.map((k) => ({ s: m.wayS[k.at], form: k.form, over: k.over })).sort((a, b) => a.s - b.s);
    this.tTop = m.tAt(m.wayS[plan.top]);
    this.tRejoin = m.tAt(m.wayS[plan.rejoin]);

    // --- what each does alone: from where it is at the top, to its slot where they meet again ---
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    const speedAt = (t: number): number => (m.sAt(t + 0.1) - m.sAt(t - 0.1)) / 0.2;
    for (let who = 0; who < 3; who++) {
      const way: Waypoint[] = [];
      this.inFormation(who, this.tTop - 0.5, a);
      this.inFormation(who, this.tTop, b);
      way.push([a.x, a.y, a.z, speedAt(this.tTop - 0.5)], [b.x, b.y, b.z, speedAt(this.tTop)]);
      way.push(...plan.solos[who].way);
      this.inFormation(who, this.tRejoin, a);
      this.inFormation(who, this.tRejoin + 0.5, b);
      way.push([a.x, a.y, a.z, speedAt(this.tRejoin)], [b.x, b.y, b.z, speedAt(this.tRejoin + 0.5)]);
      const perch = plan.solos[who].perch;
      this.solos.push(new Track(way, false, 1, 1, perch ? { at: perch.at + 2, seconds: perch.seconds } : undefined));
    }
    // the three are apart for as long as the longest of them takes
    this.natural = this.solos.map((s) => s.duration);
    const apart = Math.max(...this.natural);
    for (const s of this.solos) s.retime(apart);
    // what each does on its own way: times are counted from the top of the climb
    this.solos.forEach((track, who) => {
      const solo = plan.solos[who], at = (i: number): number => track.tAt(track.wayS[i + 2]) - track.tAt(track.wayS[1]);
      for (const f of solo.fire ?? []) this.soloEvents.push({ who, kind: 'fire', t0: at(f.at), t1: at(f.at) + f.seconds });
      for (const b of solo.beats ?? []) this.soloEvents.push({ who, kind: 'beats', t0: at(b.at), t1: at(b.at) + 0.78 * b.n, n: b.n });
      if (solo.perch) {
        const f = track.duration / this.natural[who];
        this.perch = { who, t0: at(solo.perch.at), t1: at(solo.perch.at) + solo.perch.seconds * f };
        // it leaves with three strong beats, from the moment its wings are off the ground
        this.soloEvents.push({ who, kind: 'beats', t0: this.perch.t1 - 0.3, t1: this.perch.t1 - 0.3 + 0.78 * 3, n: 3 });
      }
    });

    // --- what happens on every circuit ---
    const tPass = m.tAt(m.wayS[plan.pass]), tPull = m.tAt(m.wayS[plan.pull]), tLance = m.tAt(m.wayS[plan.lance]), tRoll = m.tAt(m.wayS[plan.roll]);
    for (let who = 0; who < 3; who++) {
      // the low pass: one short burst each, a third of a second apart, the leader first
      this.display.push({ who, kind: 'fire', t0: tPass + 0.34 * who, t1: tPass + 0.34 * who + 0.42 });
      // the pull-up: all three beat together, three times
      this.display.push({ who, kind: 'beats', t0: tPull, t1: tPull + 2.4, n: 3 });
      // the climb: one long lance of flame straight up
      this.display.push({ who, kind: 'fire', t0: tLance + 0.06 * who, t1: tLance + 2.0 });
    }
    this.splitEvents.push(...this.display);
    for (let who = 0; who < 3; who++) {
      // along the Wall: one full roll each, one after another
      this.display.push({ who, kind: 'roll', t0: tRoll + 0.5 * who, t1: tRoll + 0.5 * who + 0.85 });
    }
    this.cycles.push({ start: 0, split: false, duration: m.duration });
  }

  /** How long the three are apart on a split. */
  get apart(): number { return this.solos[0].duration; }

  private rand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  /** The circuit a time falls in. More are added as the show goes on: a split never follows a split, and at least one circuit in four is one. */
  private cycleAt(time: number): Cycle {
    let last = this.cycles[this.cycles.length - 1];
    while (last.start + last.duration <= time) {
      const n = this.cycles.length;
      const sinceSplit = n - 1 - this.cycles.map((c) => c.split).lastIndexOf(true);
      const split = !last.split && n >= 2 && (sinceSplit >= 4 || this.rand() < 0.34);
      const duration = split ? this.tTop + this.apart + (this.main.duration - this.tRejoin) : this.main.duration;
      last = { start: last.start + last.duration, split, duration };
      this.cycles.push(last);
    }
    for (let i = this.cycles.length - 1; i >= 0; i--) if (this.cycles[i].start <= time) return this.cycles[i];
    return this.cycles[0];
  }

  /** Makes the next circuit, or the one a time falls in if it has not begun, a split or not: for looking at one. */
  force(time: number, split: boolean): number {
    const c = this.cycleAt(time);
    const i = this.cycles.indexOf(c);
    this.cycles.length = i + 1;
    const start = c.start + c.duration;
    this.cycles.push({ start, split, duration: split ? this.tTop + this.apart + (this.main.duration - this.tRejoin) : this.main.duration });
    return start;
  }

  private readonly q = new THREE.Vector3();
  private readonly rt = new THREE.Vector3();

  /** Where a dragon is at a time on the leader's circuit, holding its slot beside it. */
  private inFormation(who: number, t: number, out: THREE.Vector3): THREE.Vector3 {
    const m = this.main, s = m.sAt(t);
    const [right, back, up] = slotAt(this.keys, who, s, m.length);
    m.point(s - back, out);
    if (right !== 0) out.addScaledVector(m.rightAt(s - back, this.rt), right);
    out.y += up;
    return out;
  }

  /** Where a dragon is at a time. */
  pos(who: number, time: number, out: THREE.Vector3): THREE.Vector3 {
    const c = this.cycleAt(Math.max(0, time)), t = Math.max(0, time) - c.start;
    if (!c.split || t <= this.tTop) return this.inFormation(who, t, out);
    const solo = this.solos[who], after = t - this.tTop;
    if (after >= solo.duration) return this.inFormation(who, this.tRejoin + (after - solo.duration), out);
    return solo.point(solo.sAt(after), out);
  }

  /** What a dragon is told to do at a time. */
  cue(who: number, time: number, out: Cue): Cue {
    const c = this.cycleAt(Math.max(0, time)), t = Math.max(0, time) - c.start;
    out.fire = 0; out.charge = 0; out.roll = 0; out.beat = 0; out.sit = 0;
    // on a split, what comes after the rejoin is the circuit's own, that much later
    let events = this.display, at = t;
    if (c.split) {
      events = this.splitEvents;
      if (t > this.tTop + this.apart) { events = this.display; at = t - this.apart - this.tTop + this.tRejoin; }
      else if (t > this.tTop + 0.4) {
        // on its own: what its own way says, and for whoever lands, the flare, the sitting and the leaving
        events = this.soloEvents;
        at = t - this.tTop;
        const p = this.perch;
        if (p && p.who === who) {
          if (at > p.t0 - 1.7 && at <= p.t0) out.sit = 0.5 * smooth((at - (p.t0 - 1.7)) / 1.7);
          else if (at > p.t0 && at <= p.t1 - 1.2) out.sit = 0.5 + 0.5 * smooth((at - p.t0) / 1.2);
          // it pushes up off its wings before it goes, and its feet leave the ground as it does
          else if (at > p.t1 - 1.2 && at <= p.t1) out.sit = 1 - 0.5 * smooth((at - (p.t1 - 1.2)) / 1.2);
          else if (at > p.t1 && at <= p.t1 + 1.0) out.sit = 0.5 - 0.5 * smooth((at - p.t1) / 1.0);
        }
      }
    }
    for (const e of events) {
      if (e.who !== who) continue;
      if (e.kind === 'fire') {
        if (at >= e.t0 && at < e.t1) out.fire = Math.max(out.fire, Math.min(1, (at - e.t0) / 0.08, (e.t1 - at) / 0.12));
        // its throat glows for a little while before, and brightest just as it breathes
        if (at >= e.t0 - 0.6 && at < e.t1) out.charge = Math.max(out.charge, Math.min(1, (at - (e.t0 - 0.6)) / 0.6));
      } else if (at >= e.t0 && at < e.t1) {
        const f = (at - e.t0) / (e.t1 - e.t0);
        if (e.kind === 'roll') out.roll = smooth(f) * Math.PI * 2;
        else out.beat = (f * (e.n ?? 1)) % 1 || 0.0001;
      }
    }
    return out;
  }

  /** How high the place is that a dragon lands on, if it is the one that lands. */
  perchFloor(who: number): number | null {
    const solo = this.plan.solos[who];
    return solo.perch ? solo.way[solo.perch.at][1] : null;
  }

  /** Whether a dragon is coming down to land, sitting or leaving, at a time counted from the start of a split. */
  landing(who: number, t: number): boolean {
    const p = this.perch, at = t - this.tTop;
    return p !== null && p.who === who && at > p.t0 - 3 && at < p.t1 + 2.5;
  }

  /** Whether the three are flying apart at a time. */
  apartAt(time: number): boolean {
    const c = this.cycleAt(Math.max(0, time)), t = Math.max(0, time) - c.start;
    return c.split && t > this.tTop && t < this.tTop + this.apart;
  }

  /** For checking: every place a dragon is at, a tenth of a second apart, through one circuit of each kind. */
  sampled(split: boolean, step = 0.1): { who: number; t: number; p: THREE.Vector3 }[] {
    const out: { who: number; t: number; p: THREE.Vector3 }[] = [];
    const duration = split ? this.tTop + this.apart + (this.main.duration - this.tRejoin) : this.main.duration;
    const local = (who: number, t: number, into: THREE.Vector3): THREE.Vector3 => {
      if (!split || t <= this.tTop) return this.inFormation(who, t, into);
      const solo = this.solos[who], after = t - this.tTop;
      if (after >= solo.duration) return this.inFormation(who, this.tRejoin + (after - solo.duration), into);
      return solo.point(solo.sAt(after), into);
    };
    for (let who = 0; who < 3; who++) for (let t = 0; t < duration; t += step) out.push({ who, t, p: local(who, t, new THREE.Vector3()) });
    return out;
  }

  /** How long a circuit of each kind takes. */
  get times(): { display: number; split: number; top: number; apart: number } {
    return { display: this.main.duration, split: this.tTop + this.apart + (this.main.duration - this.tRejoin), top: this.tTop, apart: this.apart };
  }
}
