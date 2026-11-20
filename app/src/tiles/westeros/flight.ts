// Where the three dragons are at any moment: the line the leader flies, the
// places the other two hold beside it, and what each does on its own when the
// three split up.
//
// Everything here is a place as a function of time. Which way a dragon points,
// how hard it banks and how its wings are set all follow from that, and are
// worked out in dragons.ts.

import * as THREE from 'three';
import type { Cue } from '../../engine/dragons/pilot';
import { Track } from '../../engine/dragons/track';
import type { Waypoint } from './plan';

const smooth = (t: number): number => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c); };

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

/**
 * How far each strays from its slot at most, in units: [out from the leader's
 * line, back, up]. Three that fly together do not hold their places as one
 * body. Each drifts wider and in again, falls back and closes up again, and
 * rises and sinks, slowly and on a rhythm of its own. The collector asked for
 * this: three dragons flying with each other, not three sharing one mind.
 *
 * Each strays only to where the formation is more open, never to where it is
 * tighter: the leader a little ahead of his line, the other two a little wider
 * and further back than their slots, and Viserion, where he flies behind
 * Rhaegal, falls back with him as well as on his own. Up and down they stray
 * both ways, since all three hold the same height. Where the formation itself
 * brings two close, as it does in a tight turn, and where the line passes near
 * anything built, they hold their slots closely, as fliers do (see
 * `Show.freedom`). So being loose never brings two nearer each other, or
 * nearer to what stands on the tile, than the formation itself does.
 */
const STRAY: [number, number, number][] = [[0.5, 1.0, 0.5], [1.6, 2.6, 1.2], [1.5, 2.4, 1.3]];
/**
 * Where a dragon is in each of its three slow drifts at the show's time `time`, each from -1 to 1: out, back and up.
 * The same at the same time, so that a picture can be taken again.
 */
function waves(who: number, time: number): [number, number, number] {
  const wave = (period: number, phase: number): number => Math.sin((Math.PI * 2 * time) / period + phase);
  return [
    0.65 * wave(9.1 + 1.7 * who, 1.3 * who) + 0.35 * wave(3.7 + 0.6 * who, 2.1 + who),
    0.6 * wave(12.7 - 1.3 * who, 0.7 + who) + 0.4 * wave(5.3 + 0.9 * who, 1.9 * who),
    0.6 * wave(7.9 + 1.1 * who, 2.6 * who) + 0.4 * wave(4.1 - 0.4 * who, 0.4 + who),
  ];
}
/**
 * The furthest each can stray from its slot, as the drifts add up and with a
 * half again for how a turn spreads a place that is held to one side of the
 * line: Viserion's is the most, since he falls back with Rhaegal as well.
 */
const MOST = STRAY.map(([r, b, u], who) => 1.5 * Math.hypot(r, b + (who === 2 ? STRAY[1][1] : 0), u));
/** How finely the freedom to stray is worked out along the circuit, in seconds; and for how long before and after a tight place each holds its slot closely, and how long it takes to ease between. */
const FREE = { step: 0.1, hold: 1.0, ease: 1.0 };

/** How far a dragon has fallen back from its slot by its own drift at a time. The leader only goes ahead of his line, so his is 0 or below. */
function fallOf(who: number, time: number): number {
  const open = (1 + waves(who, time)[1]) / 2;
  return (who === 0 ? -open : open) * STRAY[who][1];
}

// ---------------------------------------------------------------------------
// The show
// ---------------------------------------------------------------------------

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
  /**
   * How far a dragon could move from a place, going at `v` and turning at `a`, and still keep clear of everything
   * built on the tile, which the tile gives: near what stands there the dragons hold their slots closely, and never
   * stray further than that.
   */
  private readonly room: (who: number, p: THREE.Vector3, v: THREE.Vector3, a: THREE.Vector3) => number;
  /** How freely each may stray from its slot along the leader's circuit, `FREE.step` apart: see `freedom`. */
  private readonly freeAlong: Float32Array[];

  constructor(plan: ShowPlan, room: (who: number, p: THREE.Vector3, v: THREE.Vector3, a: THREE.Vector3) => number = () => Infinity) {
    this.plan = plan;
    this.room = room;
    this.main = new Track(plan.circuit, true);
    const m = this.main;
    this.keys = plan.keys.map((k) => ({ s: m.wayS[k.at], form: k.form, over: k.over })).sort((a, b) => a.s - b.s);
    this.tTop = m.tAt(m.wayS[plan.top]);
    this.tRejoin = m.tAt(m.wayS[plan.rejoin]);
    this.freeAlong = this.workOutFreedom();

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
      // the pull-up: three beats each, one a moment after another, as three animals beat and not one
      this.display.push({ who, kind: 'beats', t0: tPull + 0.17 * who, t1: tPull + 0.17 * who + 2.4, n: 3 });
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
  private readonly free: [number, number, number] = [1, 1, 1];

  /**
   * How freely each may stray from its slot along the leader's circuit, from 0 to 1, worked out once. Where the
   * formation itself brings two within 10 of each other, as a tight turn does, they hold their slots more closely,
   * and within 7 exactly; and where its slot passes near anything built, a dragon strays no further than it could
   * and still keep clear of it. Each begins to hold its slot closely `FREE.hold` seconds before such a place and
   * keeps to it as long after, easing in and out over `FREE.ease`, so that it never changes in a snap. In open
   * air they are loose.
   */
  private workOutFreedom(): Float32Array[] {
    // the circuit in steps of a tenth of a second or a little less, so that it comes round exactly
    const D = this.main.duration, n = Math.ceil(D / FREE.step), step = D / n, at = (i: number): number => ((i % n) + n) % n;
    const P = [0, 1, 2].map((k) => Array.from({ length: n }, (_, i) => this.inFormation(k, i * step, new THREE.Vector3())));
    const raw = [0, 1, 2].map(() => new Float32Array(n));
    const clamp = (x: number): number => Math.min(1, Math.max(0, x));
    const v = new THREE.Vector3(), a = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const d01 = P[0][i].distanceTo(P[1][i]), d02 = P[0][i].distanceTo(P[2][i]), d12 = P[1][i].distanceTo(P[2][i]);
      const near = [Math.min(d01, d02), Math.min(d01, d12), Math.min(d02, d12)];
      for (let k = 0; k < 3; k++) {
        // how fast it goes and how it turns there, as the check of its clearance works them out
        const p = P[k];
        v.subVectors(p[at(i + 1)], p[at(i - 1)]).multiplyScalar(1 / (2 * step));
        a.copy(p[at(i + 2)]).add(p[at(i - 2)]).addScaledVector(p[i], -2).multiplyScalar(1 / (4 * step * step));
        raw[k][i] = Math.min(clamp((near[k] - 7) / 3), clamp(this.room(k, p[i], v, a) / MOST[k]));
      }
    }
    // the least within a while either side, then eased: never more than it was anywhere near
    const w = Math.round(FREE.hold / FREE.step), e = Math.round(FREE.ease / FREE.step);
    return raw.map((r) => {
      const low = new Float32Array(n), out = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        let v = 1;
        for (let j = -w; j <= w; j++) v = Math.min(v, r[(((i + j) % n) + n) % n]);
        low[i] = v;
      }
      for (let i = 0; i < n; i++) {
        let v = 0;
        for (let j = -e; j <= e; j++) v += low[(((i + j) % n) + n) % n];
        out[i] = v / (2 * e + 1);
      }
      return out;
    });
  }

  /** How freely each may stray from its slot `t` into the leader's circuit, from 0 to 1. */
  private freedom(t: number): [number, number, number] {
    const n = this.freeAlong[0].length, x = ((((t * n) / this.main.duration) % n) + n) % n, i = Math.floor(x), f = x - i, j = (i + 1) % n;
    for (let k = 0; k < 3; k++) this.free[k] = this.freeAlong[k][i] + (this.freeAlong[k][j] - this.freeAlong[k][i]) * f;
    return this.free;
  }

  /**
   * Where a dragon is at a time on the leader's circuit, holding its slot beside it. With `stray` above 0 it holds
   * the slot loosely, as `STRAY` says, at the show's time `time`: in full at 1.
   */
  private inFormation(who: number, t: number, out: THREE.Vector3, time = 0, stray = 0): THREE.Vector3 {
    const m = this.main, s = m.sAt(t);
    let [right, back, up] = slotAt(this.keys, who, s, m.length);
    if (stray > 0) {
      const free = this.freedom(t), own = stray * free[who];
      const [wide, , rise] = waves(who, time), [r, , u] = STRAY[who];
      // out from the line: the leader either way, the others only outwards, and less as they come near to crossing it
      const outward = who === 0 ? wide : ((1 + wide) / 2) * Math.max(-1, Math.min(1, right / 3));
      let fall = own * fallOf(who, time);
      // Viserion falls back with Rhaegal too, by as much as Rhaegal does and as he flies behind him
      if (who === 2) fall += stray * free[1] * fallOf(1, time) * smooth((back - slotAt(this.keys, 1, s, m.length)[1]) / 6);
      right += own * r * outward;
      back += fall;
      up += own * u * rise;
    }
    m.point(s - back, out);
    if (right !== 0) out.addScaledVector(m.rightAt(s - back, this.rt), right);
    out.y += up;
    return out;
  }

  /**
   * Where a dragon is `t` into a circuit, a split or not, at the show's time `time`. In formation it holds its
   * slot loosely. It holds it exactly where the three part at the top of a split and where they meet again, so
   * that its own way starts and ends where it is.
   */
  private place(who: number, t: number, split: boolean, time: number, out: THREE.Vector3): THREE.Vector3 {
    if (!split) return this.inFormation(who, t, out, time, 1);
    if (t <= this.tTop) return this.inFormation(who, t, out, time, smooth((this.tTop - t) / 2.5));
    const solo = this.solos[who], after = t - this.tTop;
    if (after >= solo.duration) return this.inFormation(who, this.tRejoin + (after - solo.duration), out, time, smooth((after - solo.duration) / 2.5));
    return solo.point(solo.sAt(after), out);
  }

  /** Where a dragon is at a time. */
  pos(who: number, time: number, out: THREE.Vector3): THREE.Vector3 {
    const T = Math.max(0, time), c = this.cycleAt(T);
    return this.place(who, T - c.start, c.split, T, out);
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
  sampled(split: boolean, step = 0.1, laps = 1): { who: number; t: number; p: THREE.Vector3 }[] {
    const out: { who: number; t: number; p: THREE.Vector3 }[] = [];
    const duration = split ? this.tTop + this.apart + (this.main.duration - this.tRejoin) : this.main.duration;
    // several circuits one after another, so that each dragon is seen strayed every way from its slot
    for (let who = 0; who < 3; who++) {
      for (let lap = 0; lap < laps; lap++) {
        for (let t = 0; t < duration; t += step) out.push({ who, t, p: this.place(who, t, split, lap * duration + t, new THREE.Vector3()) });
      }
    }
    return out;
  }

  /** How long a circuit of each kind takes. */
  get times(): { display: number; split: number; top: number; apart: number } {
    return { display: this.main.duration, split: this.tTop + this.apart + (this.main.duration - this.tRejoin), top: this.tTop, apart: this.apart };
  }
}
