// The stories of the east bank, Lower Gotham and the harbour: the East End's
// roofs, Park Row, the docks and Ace Chemicals, Amusement Mile, the Cobblepot
// Bridge, Tricorner, the Clock Tower, the Underground Highway's court, and
// Arkham's gate.
//
// Each story is a known scene of the comics, or a classic set-up of theirs, in
// moves that small figures can make, as the research notes give them
// (docs/districts/research/gotham-batman-and-rogues.md, section 4 and the notes
// on each figure, and gotham-the-wider-cast.md); each says its source in a
// comment. Nobody is hurt: a fight stops at the clash, nobody points a weapon at
// anyone, and whoever runs gets away. Arkham shows no inmates but the named
// rogues who come and go by its gate.
//
// The chapter gives the east's figures their posts, each with a way of resting
// that is its own, and adds its stories. The one export below is what
// stories.ts calls, and it stays.

import * as THREE from 'three';
import type { V3 } from '../../engine/geo';
import type { Build } from '../../engine/tile';
import type { Beast, BeastKind, Flock, FlockKind } from './beasts';
import { buildDrawbridge, rollerDoor } from './docks';
import { EXTRAS, blend, bow, carry, climb, drive, fly, glide, hang, idle, kneel, laugh, leap, lunge, parry, perch, point, push, row, run, salute, shrug, sit, star, strike, swim, toss, walk, waddle, type ExtraKind, type Pose } from './figures';
import type { Machine, MachineKind } from './machines';
import { BOAT_LINES } from './traffic';
import { SHOW_LANES, STAGES, Y } from './plan';
import {
  E, N, S, TAU, TO_VIEW, W as WEST, airLeg, at, beside, clamp, ease, hidden, lerp, lineLeg, span, still, toward, turnTo, walkLeg, RUN,
  type Leg, type Rest, type Spot, type State, type World,
} from './stage';
import type { Book } from './stories';

// ---------------------------------------------------------------------------
// Small helpers (as the west chapter has them)
// ---------------------------------------------------------------------------

interface Track { dur: number; at(t: number): State }
function seq(steps: Track[]): Track & { t: number[] } {
  const t: number[] = [];
  let d = 0;
  for (const s of steps) { t.push(d); d += s.dur; }
  return {
    dur: d, t,
    at(x) {
      for (let i = steps.length - 1; i > 0; i--) if (x >= t[i]) return steps[i].at(Math.min(steps[i].dur, x - t[i]));
      return steps[0].at(clamp(x, 0, steps[0].dur));
    },
  };
}
const wait = (s: Spot, dur: number, pose: (u: number) => Partial<Pose> = () => ({}), more: Partial<State> = {}): Track => ({ dur, at: (t) => still(s, pose(dur > 0 ? t / dur : 1), more) });
const dim = (c: number, f: number): number => {
  const k = clamp(f);
  return (Math.round(((c >> 16) & 255) * k) << 16) | (Math.round(((c >> 8) & 255) * k) << 8) | Math.round((c & 255) * k);
};
const facing = (s: Spot, x: number, z: number): Spot => at(s.x, s.y, s.z, toward(s.x, s.z, x, z));
const handOf = (s: State, up: number, fwd = 0.3, side = 0.3): V3 => [s.x + Math.cos(s.h) * fwd - Math.sin(s.h) * side, s.y + up, s.z + Math.sin(s.h) * fwd + Math.cos(s.h) * side];
/** A smooth way through points in the air: a Catmull-Rom curve, measured by distance. */
function curveOf(pts: V3[]): { len: number; at(s: number): { p: V3; h: number } } {
  const fine: V3[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < 12; j++) {
      const t = j / 12, t2 = t * t, t3 = t2 * t;
      fine.push([0, 1, 2].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)) as V3);
    }
  }
  fine.push(pts[pts.length - 1]);
  const cum = [0];
  for (let i = 1; i < fine.length; i++) cum.push(cum[i - 1] + Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1], fine[i][2] - fine[i - 1][2]));
  const len = cum[cum.length - 1];
  return {
    len,
    at(s) {
      const d = clamp(s, 0, len);
      let i = 1;
      while (i < fine.length - 1 && cum[i] < d) i++;
      const a = fine[i - 1], b = fine[i], f = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
      return { p: [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)], h: Math.atan2(b[2] - a[2], b[0] - a[0]) };
    },
  };
}

/** Gives the east's figures their posts and adds its stories to the book. */
export function east(k: Build, W: World, book: Book): void {
  const gy = (x: number, z: number, from = 200): number => W.solid.under(x, z, from);
  const spot = (x: number, z: number, h: number, from = 200): Spot => at(x, gy(x, z, from), z, h);
  let now = 0;
  const night = (): number => W.night();
  const glowB = (more: Partial<State> = {}): Partial<State> => ({ glow: night(), ...more });
  const grounded = (s: State): State => { if (!s.shown) return s; const y = gy(s.x, s.z, s.y + 1.2); return Number.isFinite(y) ? { ...s, y } : s; };
  const machine = (kind: string): Machine | null => {
    try { return (W.machines?.get(kind as MachineKind) as Machine | undefined) ?? null; } catch { return null; }
  };
  const beast = (kind: BeastKind): Beast | null => { try { return W.beasts?.beast(kind) ?? null; } catch { return null; } };
  const flocks: Flock[] = [];
  const flock = (kind: FlockKind, max: number): Flock | null => {
    try { const f = W.beasts?.flock(kind, max) ?? null; if (f) flocks.push(f); return f; } catch { return null; }
  };
  const seatOn = (m: Machine | null, x: number, y: number, z: number, h: number, pitch: number, i: number, local: V3): V3 => {
    if (m) { m.at(x, y, z, h, pitch, 0); return m.seat(i); }
    return [x + Math.cos(h) * local[0] - Math.sin(h) * local[2], y + local[1], z + Math.sin(h) * local[0] + Math.cos(h) * local[2]];
  };
  const P = (file: string, name: string, x: number, y: number, z: number, h: number): Spot => W.place(file, name, at(x, y, z, h));
  /** An extra of a kind, in the roster: posted, or away until a story brings it. */
  const extra = (id: string, kind: ExtraKind, post: Spot | null = null, rest?: Rest): string => {
    book.roster.push({ id, look: EXTRAS[kind], way: 'foot', post, rest });
    return id;
  };
  /** Off Batgirl's library steps, which have the library over them: a few steps out, pulled up on the line, and the swing. */
  const launch = (from: Spot, to: Spot, out = 3.5): Leg => {
    const b0 = beside(from, out), step = at(b0.x, gy(b0.x, b0.z, from.y + 1), b0.z, b0.h), h = toward(step.x, step.z, to.x, to.z);
    let top = step.y;
    for (let i = 0; i <= 6; i++) { const x = step.x + Math.cos(h) * i, z = step.z + Math.sin(h) * i; top = Math.max(top, W.solid.top(x, z), W.solid.top(x - Math.sin(h), z + Math.cos(h)), W.solid.top(x + Math.sin(h), z - Math.cos(h))); }
    const high = at(step.x, top + 2.5, step.z, h), walkOut = walkLeg(from, at(step.x, step.y, step.z, h), 2.6);
    const upT = Math.max(0.8, (high.y - step.y) / 14), swing = lineLeg(W.solid, high, to), fast: V3 = [step.x, high.y + 6, step.z];
    return {
      dur: walkOut.dur + upT + swing.dur,
      at(t) {
        if (t < walkOut.dur) return grounded(walkOut.at(t));
        if (t < walkOut.dur + upT) { const u = ease((t - walkOut.dur) / upT); return still(at(step.x, lerp(step.y, high.y, u), step.z, h), { armR: 3.05, elbowR: 0.05, armL: 0.6, kneeL: 0.5, kneeR: 0.3 }, { aloft: true, line: fast, cape: 0.6 }); }
        return swing.at(t - walkOut.dur - upT);
      },
    };
  };
  const landing = (from: Spot, to: Spot, out = 3.5): Leg => {
    const b0 = beside(to, out), step = at(b0.x, gy(b0.x, b0.z, to.y + 1), b0.z, b0.h), h = toward(from.x, from.z, step.x, step.z);
    let top = step.y;
    for (let i = 0; i <= 6; i++) { const x = step.x - Math.cos(h) * i, z = step.z - Math.sin(h) * i; top = Math.max(top, W.solid.top(x, z), W.solid.top(x - Math.sin(h), z + Math.cos(h)), W.solid.top(x + Math.sin(h), z - Math.cos(h))); }
    const high = at(step.x, top + 2.5, step.z, h), swing = lineLeg(W.solid, from, high);
    const downT = Math.max(0.8, (high.y - step.y) / 10), fast: V3 = [step.x, high.y + 6, step.z];
    const walkIn = walkLeg(at(step.x, step.y, step.z, toward(step.x, step.z, to.x, to.z)), to, 2.2);
    return {
      dur: swing.dur + downT + walkIn.dur,
      at(t) {
        if (t < swing.dur) return { ...swing.at(t), aloft: true };
        if (t < swing.dur + downT) { const u = ease((t - swing.dur) / downT); return still(at(step.x, lerp(high.y, step.y, u), step.z, h), u < 0.85 ? { armR: 3.05, elbowR: 0.05, armL: 0.6, kneeL: 0.3, kneeR: 0.3 } : leap(0.85 + u * 0.15), { aloft: u < 0.98, line: u < 0.9 ? fast : null, cape: 0.5 }); }
        return grounded(walkIn.at(t - swing.dur - downT));
      },
    };
  };
  /** A figure's way in by its line, timed to land at `t1`, from wherever it stood when the body began. */
  const comeIn = (id: string, P0: () => Spot, to: Spot, t1: number): ((tb: number) => State | null) => {
    let leg: Leg | null = null;
    return (tb) => {
      leg ??= lineLeg(W.solid, P0(), to);
      const t0 = t1 - leg.dur;
      if (tb < t0) return null;
      if (tb < t1) return { ...leg.at(tb - t0), ...glowB() };
      return null;
    };
  };
  void comeIn;
  /** Off into the night: a leap straight up with the cape opening, and gone before it comes down (the director then takes the figure home). */
  const away = (s: Spot, t0: number, tb: number): State => {
    const u = span(tb, t0, t0 + 0.8);
    return u >= 1 ? hidden(s) : still(at(s.x, s.y + 3 * Math.sin((Math.PI / 2) * u), s.z, s.h), leap(0.2 + 0.3 * u), { aloft: u > 0.05, cape: 0.5 + 0.5 * u, spread: u, glow: night() });
  };

  // ------------------------------------------------------------------ places
  const LIBRARY_STEPS = W.place('civic', 'librarySteps', at(-51, Y.upper + 1.2, 38.06, S));
  // the East End
  const MUSEUM_DOOR = P('eastend', 'museumDoor', 48.5, 1.6, 7.7, S), MUSEUM_STEPS = P('eastend', 'museumSteps', 48.5, 0.8, 10.55, S);
  const PLINTH = P('eastend', 'plinth', 56.5, 0.6, 11.1, S), TYRES = P('eastend', 'tyres', 67.1, 0.94, 6.4, S), ALLEY_LAMP = P('eastend', 'alleyLamp', 71.3, 0.04, 1.8, S);
  const ROOF1 = P('eastend', 'roof1', 38, 16, -3, S), ROOF2 = P('eastend', 'roof2', 48, 12, -3, S), ROOF3 = P('eastend', 'roof3', 57, 17.6, -3, S);
  const NIGHTWING = P('eastend', 'nightwing', 41.15, 16, -1.85, TO_VIEW), CHIMNEY3 = P('eastend', 'chimney3', 59.05, 20.2, -8, S);
  const CLINIC_DOOR = P('eastend', 'clinicDoor', 71.3, 0.3, -5, E), FIRE_DOOR = P('eastend', 'fireDoor', 90.8, 0.04, 6, WEST), HOSE_TOWER = P('eastend', 'hoseTower', 100.47, 13.2, 3.8, S);
  const DRAIN = P('eastend', 'drain', 8.09, -0.9, -3.76, -0.73), QUAY_STEPS = P('eastend', 'quaySteps', 15.79, -0.8, 3.45, 0.84);
  // the docks
  const CATWALK = P('docks', 'catwalk', 96, 8, 38.8, S), CATWALK_W = P('docks', 'catwalkWest', 89.6, 8, 38.8, S), CATWALK_E = P('docks', 'catwalkEast', 102.4, 8, 38.8, S);
  const FREEZE_DOOR = P('docks', 'freezeDoor', 60.55, 0, 43.45, S), VALVE = P('docks', 'valve', 53.45, 0, 44.35, N), GARAGE = P('docks', 'garage', 68.5, 0, 45.2, S);
  const BANE = P('docks', 'bane', 101.5, 2.44, 42.25, WEST), TUNNEL = P('docks', 'tunnelPortal', 60, 0, 47, E);
  // Amusement Mile and Uptown
  const BOOTH = P('uptown', 'booth', 93.6, 6, -31, S), WHEEL_FOOT = P('uptown', 'wheelFoot', 99.6, 6, -36, WEST);
  const BOWERY_DOOR = P('uptown', 'boweryDoor', 72.7, 3.05, -20.95, E), OTIS1 = P('uptown', 'otisRoof1', 34.7, 12, -13.4, S), OTIS2 = P('uptown', 'otisRoof2', 45.5, 12, -13.4, S);
  const YARD_CRANE = P('uptown', 'yardCrane', 93.4, 0, -52.4, S);
  // the harbour
  const TOWER_E = P('bay', 'bridgeTowerEast', 69.86, 23, 59.06, 2.41), TOWER_W = P('bay', 'bridgeTowerWest', 46.9, 23, 79.59, -0.73);
  // Lower Gotham
  const BELFRY = P('bayside', 'belfryLedge', -91.3, 44, 104.7, TO_VIEW), EAVES = P('bayside', 'manBat', -90.6, 50, 105.4, TO_VIEW), CLOCK_DOOR = P('bayside', 'clockDoor', -96, 0, 106.9, S);
  const TYPEWRITER = P('bayside', 'typewriter', -73.9, 14.86, 103.5, S), GAZETTE_DOOR = P('bayside', 'gazetteDoor', -73.9, 0, 108.9, S);
  const RAS = P('bayside', 'ras', -94, 0.04, 77, TO_VIEW), TALIA = P('bayside', 'talia', -92.2, 0.04, 77.4, TO_VIEW);
  const DUEL_A = P('bayside', 'duelA', -95.3, 0.04, 83.75, E), DUEL_B = P('bayside', 'duelB', -92.7, 0.04, 83.75, WEST);
  const ASSASSINS = [0, 1, 2, 3].map((i) => P('bayside', `assassin${i}`, -99.4 + i * 3.6, 6.5, 75.2, S));
  // Tricorner
  const JETTY_FOOT = P('tricorner', 'jettyFoot', 25.86, 0, 56.5, E), JETTY_END = P('tricorner', 'jettyEnd', 33.4, 0.8, 56.5, E);
  const HULL = P('tricorner', 'hullDeck', 55.22, 5, 91.71, -0.73), CRANE_TOP = P('tricorner', 'craneTop', 59.5, 19.4, 98.75, TO_VIEW);
  const GASHOLDER = P('tricorner', 'gasholderTop', 52.6, 10.7, 106.2, TO_VIEW), LIGHT = P('tricorner', 'light', 75.92, 11.6, 111.75, TO_VIEW);
  // Arkham
  const GATE_MID = P('arkham', 'gateMiddle', -73.1, 4, -81.7, 0.64), GATE_IN = P('arkham', 'gateInside', -74.39, 4.03, -82.65, 0.64), GATE_OUT = P('arkham', 'gateOutside', -70.69, 4, -79.92, 0.64);
  const GATE_LEAN = P('arkham', 'gateLean', -67.44, 8.94, -86.11, 1.06), GUARD = P('arkham', 'guard', -68.81, 7.82, -84.9, 0.64), STRANGE = P('arkham', 'strange', -74.86, 4, -75.95, 0.64);

  // ------------------------------------------------------------------ the cast at rest
  // Nightwing crouched on a tenement's roof corner; now and then a handstand on the parapet.
  book.post('nightwing', NIGHTWING, (t, post) => {
    const p = t % 16, hs = span(p, 12, 12.6) * (1 - span(p, 14.4, 15));
    if (hs > 0) return still(post, { armL: 2.9, armR: 2.9, spreadL: 0.25, spreadR: 0.25, hipL: 0.1, hipR: -0.1, straddle: 0.3 * hs }, { pitch: Math.PI * ease(hs), glow: night() });
    return still(post, { ...perch((t * 0.05) % 1), head: 0.6 * Math.sin(t * 0.25) }, { glow: night() });
  });
  // The Red Hood sitting on the tyres in the court, his motorcycle beside him.
  // in the court by its lamp, where the opening view sees him (the tyres are behind the railway), arms folded, his
  // motorcycle beside him
  const RED_SEAT = spot(ALLEY_LAMP.x - 1.7, ALLEY_LAMP.z + 3.0, TO_VIEW, 2);
  book.post('redHood', RED_SEAT, (t, post) => still(post, { ...hang(0), head: 0.5 * Math.sin(t * 0.2), tilt: 0.05 }));
  void TYRES;
  // (along the court's south side: further north it stood on the children's chalk sun, its lamp's pool in one plane
  // with the chalk, and against one of the children)
  const redCycle = machine('redCycle'), RED_CYCLE = at(ALLEY_LAMP.x - 2.7, gy(ALLEY_LAMP.x - 2.7, ALLEY_LAMP.z + 7.3, 2), ALLEY_LAMP.z + 7.3, E);
  // Leslie Thompkins at her clinic's door; Vicki Vale at the Gazette's, her camera flashing now and then.
  book.post('leslie', spot(CLINIC_DOOR.x + 0.9, CLINIC_DOOR.z, E, CLINIC_DOOR.y + 1), (t, post) => still(post, { ...idle((t * 0.07) % 1), armL: 0.5, elbowL: 1.6, armR: 0.5, elbowR: 1.6, spreadL: -0.2, spreadR: -0.2 }));
  let vickiRest = { t: 0, at: -10 };
  const VICKI = at(GAZETTE_DOOR.x + 0.4, GAZETTE_DOOR.y, GAZETTE_DOOR.z + 0.9, TO_VIEW);
  book.post('vicki', VICKI, (t, post) => {
    vickiRest = { t, at: now };
    const p = t % 7, up = Math.sin(Math.PI * span(p, 4.5, 6.2));
    return still(post, blend(idle((t * 0.08) % 1), { armL: 1.4, armR: 1.4, elbowL: 1.6, elbowR: 1.6, nod: -0.1, head: 0.3 }, up), { hold: 1 });
  });
  // Batwoman on the bridge's west tower, Deathstroke on its east one; Huntress on a tenement's chimney.
  // each on the landward corner of its tower's top that the opening view sees past the tower's own pinnacles
  const BW_POST = spot(TOWER_W.x - 1.2, TOWER_W.z - 1.0, TO_VIEW, TOWER_W.y + 1), DS_POST = spot(TOWER_E.x - 1.2, TOWER_E.z - 1.0, TO_VIEW, TOWER_E.y + 1);
  book.post('batwoman', BW_POST, (t, post) => still(at(post.x, post.y, post.z, TO_VIEW), { head: 0.5 * Math.sin(t * 0.17) }, { cape: 0.35 + 0.2 * Math.sin(t * 0.6), glow: night() }));
  book.post('deathstroke', DS_POST, (t, post) => still(at(post.x, post.y, post.z, TO_VIEW), { ...hang(0), head: 0.6 * Math.sin(t * 0.11) }, { glow: night() }));
  book.post('huntress', at(CHIMNEY3.x, CHIMNEY3.y, CHIMNEY3.z, TO_VIEW), (t, post) => still(post, { ...perch((t * 0.04) % 1), head: 0.5 * Math.sin(t * 0.3) }, { glow: night() }));
  // Spoiler and Orphan on Otisburg's roofs: Spoiler restless, Orphan as still as a cat.
  book.post('spoiler', OTIS1, (t, post) => still(at(post.x, post.y, post.z, TO_VIEW), { ...idle((t * 0.15) % 1), crouch: 0.1 * Math.max(0, Math.sin(t * 1.3)) }, { glow: night() }));
  book.post('orphan', OTIS2, (t, post) => still(at(post.x, post.y, post.z, TO_VIEW), { ...perch(0), head: Math.sin(t * 0.07) > 0.9 ? 0.8 : 0 }, { glow: night() }));
  // Bat-Mite sitting on the giant typewriter, kicking his heels; now and then he pops out and in again a pace away.
  const MITE2 = spot(TYPEWRITER.x + 0.9, TYPEWRITER.z, S, TYPEWRITER.y + 0.5);
  const miteOk = Math.abs(MITE2.y - TYPEWRITER.y) < 0.2;
  book.post('batMite', TYPEWRITER, (t, post) => {
    const p = t % 12, away = miteOk && p > 7 && p < 10;
    if ((p > 6.8 && p < 7.2) || (p > 9.8 && p < 10.2)) return hidden(post);
    const s = away ? MITE2 : post;
    return still(at(s.x, s.y - 0.35, s.z, TO_VIEW), { ...sit(1), kneeL: -0.52 + 0.5 * Math.max(0, Math.sin(t * 7)), kneeR: -0.52 + 0.5 * Math.max(0, Math.sin(t * 7 + 2)), head: 0.4 * Math.sin(t) }, { aloft: true, cape: 0.2 });
  });
  // The Joker paces his catwalk over the vats, and stops to laugh.
  book.post('joker', CATWALK, (t, post) => {
    const p = t % 18, a = at(CATWALK_W.x + 1, post.y, post.z, E), b = at(CATWALK_E.x - 1, post.y, post.z, WEST);
    const go = walkLeg(facing(post, a.x, a.z), a, 1.4), back = walkLeg(facing(a, b.x, b.z), b, 1.4), home = walkLeg(facing(b, post.x, post.z), at(post.x, post.y, post.z, S), 1.4);
    let s: State;
    if (p < go.dur) s = go.at(p);
    else if (p < go.dur + back.dur) s = back.at(p - go.dur);
    else if (p < go.dur + back.dur + home.dur) s = home.at(p - go.dur - back.dur);
    else s = still(post, laugh(span(p, go.dur + back.dur + home.dur, 18)));
    return s;
  });
  // Harley at her booth, her mallet over her shoulder.
  const HARLEY = at(BOOTH.x, BOOTH.y, BOOTH.z, TO_VIEW);
  book.post('harley', HARLEY, (t, post) => still(post, { armR: 2.4, elbowR: 2.0, spreadR: 0.3, head: 0.5 * Math.sin(t * 0.4), tilt: 0.06 * Math.sin(t * 1.7) }, { hold: 0.6 }));
  // Mr. Freeze in his cold store's door; Bane on his crates, arms folded; Killer Croc in the Sprang with only his head out.
  book.post('freeze', FREEZE_DOOR, (t, post) => still(post, { head: 0.35 * Math.sin(t * 0.13) }, { glow: 0.6 + 0.3 * night() }));
  const BANE_POST = at(BANE.x - 0.25, BANE.y, BANE.z + 0.1, BANE.h);
  book.post('bane', BANE_POST, (t, post) => still(at(post.x, post.y, post.z, TO_VIEW), { ...hang(0), head: 0.5 * Math.sin(t * 0.12) }, { glow: 0.2 }));
  // treading water, low, his body slanting down under the surface and only his head and shoulders out
  const CROC_HEAD = at(DRAIN.x, DRAIN.y - 0.6, DRAIN.z, DRAIN.h);
  const crocTread = (t: number, post: Spot): State => still(at(post.x, post.y + 0.1 * Math.sin(t * 0.8), post.z, post.h + 0.3 * Math.sin(t * 0.1)), { armL: 1.2, armR: 1.2, spreadL: 0.6, spreadR: 0.6, nod: -0.9, kneeL: 0.4, kneeR: 0.4 }, { pitch: 1.1, aloft: true });
  // his post is the quay steps' bottom step, where the stories find him; at rest he treads water off his drain
  book.post('croc', at(QUAY_STEPS.x, QUAY_STEPS.y, QUAY_STEPS.z, QUAY_STEPS.h), () => crocTread(now, CROC_HEAD));
  // Langstrom on the Clock Tower's ledge by day with his notes; Man-Bat hanging from its eaves by night.
  book.post('langstrom', BELFRY, (t, post) => (night() > 0.5 ? hidden(post) : still(post, { armL: 1.2, elbowL: 1.5, armR: 1.1, elbowR: 1.6, nod: 0.4, head: 0.2 * Math.sin(t * 0.3) })));
  const HANGING = at(EAVES.x, EAVES.y - 3.2, EAVES.z, EAVES.h);
  // his post is the ledge under the eaves, where the stories find him; at rest by night he hangs from the eaves over it
  book.post('manBat', BELFRY, () => (night() > 0.5 ? still(HANGING, hang(0), { pitch: Math.PI, cape: 0, spread: 0, aloft: true, glow: 1 }) : hidden(HANGING)));
  // Calendar Man under the clock; Clayface on his plinth, as still as a statue but that he sags and pulls himself up.
  book.post('calendarMan', spot(CLOCK_DOOR.x, CLOCK_DOOR.z + 0.6, TO_VIEW, CLOCK_DOOR.y + 1), (t, post) => still(post, { ...idle((t * 0.05) % 1), armR: 1.1, elbowR: 1.9, nod: 0.3 }));
  const statue = (t: number): Partial<Pose> => ({ armR: 1.2, elbowR: 0.2, spreadR: 0.3, armL: 0.2, crouch: 0.25 * Math.max(0, Math.sin(t * 0.4) - 0.7) * 3, lean: 0.05 });
  book.post('clayface', PLINTH, (t, post) => still(post, statue(t)));
  // Ra's al Ghul and Talia before the Highway's mouth, four of the League kneeling on the ledge over it.
  book.post('ras', RAS, (t, post) => still(post, { ...hang(0), head: 0.3 * Math.sin(t * 0.09) }, { cape: 0.2 }));
  book.post('talia', TALIA, (t, post) => still(post, idle((t * 0.06) % 1)));
  const ASSASSIN_IDS = ASSASSINS.map((a, i) => extra(`assassin${i}`, 'assassin', at(a.x, a.y, a.z, S), (t, post) => still(post, { ...kneel(1), head: 0.3 * Math.sin(t * 0.1 + i) })));
  // Killer Moth on the gasholder; Kite Man on the hammerhead crane's cab, his kite on his back.
  book.post('killerMoth', GASHOLDER, (t, post) => still(post, { ...idle((t * 0.07) % 1), head: 0.7 * Math.sin(t * 0.3) }, { spread: 0.1 + 0.1 * Math.max(0, Math.sin(t * 1.3)), glow: night() }));
  book.post('kiteMan', CRANE_TOP, (t, post) => still(post, { ...idle((t * 0.07) % 1), armL: 0.5, armR: 0.5, elbowL: 1.0, elbowR: 1.0 }, { cape: 0.1 }));
  // Firefly on the fire house's roof, his goggles lit.
  const FIREFLY = spot(FIRE_DOOR.x + 4.5, FIRE_DOOR.z - 3, TO_VIEW, 12);
  book.post('firefly', FIREFLY, (t, post) => still(post, { ...idle((t * 0.08) % 1) }, { glow: 0.5 + 0.5 * night() }));
  // Black Mask at the Bowery's door with two of his men a pace behind him.
  book.post('blackMask', BOWERY_DOOR, (t, post) => still(at(post.x, post.y, post.z, TO_VIEW), { ...idle((t * 0.05) % 1), armR: 0.4, elbowR: 1.8 }));
  for (const [i, s] of [[0, 0.9], [1, -0.9]] as const) {
    // beside him rather than behind, out from under the tavern's awning, where they are seen
    const b = { x: BOWERY_DOOR.x - 0.5 + (i ? 0.4 : 0), z: BOWERY_DOOR.z + (i ? -1.05 : 1.35) }; void s;
    extra(`thug${i}`, 'thug', spot(b.x, b.z, TO_VIEW, BOWERY_DOOR.y + 1), (t, post) => still(post, { ...hang(0), head: 0.5 * Math.sin(t * 0.2 + i * 2) }));
  }
  // The Ventriloquist outside Arkham's wall, his dummy doing the talking; Hugo Strange before his lodge; a guard by the sentry box.
  const VENT = spot(GATE_LEAN.x + Math.cos(GATE_LEAN.h) * 0.6, GATE_LEAN.z + Math.sin(GATE_LEAN.h) * 0.6, GATE_LEAN.h, GATE_LEAN.y + 1);
  book.post('ventriloquist', VENT, (t, post) => still(post, { armR: 1.0, elbowR: 1.3, spreadR: 0.2, head: 0.6 + 0.2 * Math.sin(t * 3) * (Math.sin(t * 0.5) > 0 ? 1 : 0) }, { hold: 1 }));
  book.post('hugoStrange', STRANGE, (t, post) => still(post, { ...idle((t * 0.05) % 1), armL: -0.3, armR: -0.3, elbowL: 0.9, elbowR: 0.9 }));
  const GUARD_ID = extra('arkhamGuard', 'guard', GUARD, (t, post) => still(post, { ...idle((t * 0.06) % 1) }));
  // Solomon Grundy by the yard crane; Polka-Dot Man by the wheel's foot, off the boardwalk.
  // Solomon Grundy by Robinson Park's lake, as he rose from Slaughter Swamp: at its north-west, the one stretch of its
  // shore the opening view sees (the rest is behind the civic quarter)
  void YARD_CRANE;
  book.post('grundy', spot(-97.5, -31.2, TO_VIEW, 3), (t, post) => still(post, { lean: 0.15, armL: 0.2, armR: 0.2, head: 0.3 * Math.sin(t * 0.07), nod: 0.25, tilt: 0.1 * Math.sin(t * 0.3) }));
  const POLKA = spot(WHEEL_FOOT.x - 4.4, WHEEL_FOOT.z + 1.2, TO_VIEW, WHEEL_FOOT.y + 1);
  book.post('polkaDotMan', POLKA, (t, post) => still(post, idle((t * 0.1) % 1)));
  // two fishermen on the fish jetty, rods out over the water
  // two fishermen on the quay's edge at the harbour's north-west corner, south of the Battery, rods out over the water
  const FISH = STAGES.fishCorner ?? { x0: 20.5, z0: 47.2, x1: 29, z1: 51.5, y: 0 };
  const FISHERS = [extra('fisher0', 'fisher', spot(FISH.x0 - 0.5, FISH.z0 - 0.2, E, 2), (t, post) => still(post, { armR: 1.1, elbowR: 0.4, armL: 0.9, elbowL: 0.6, head: 0.2 * Math.sin(t * 0.2) })),
    extra('fisher1', 'fisher', spot(FISH.x0 + 0.1, FISH.z0 - 1.0, E, 2), (t, post) => still(post, { armR: 1.1, elbowR: 0.4, armL: 0.9, elbowL: 0.6, head: 0.2 * Math.sin(t * 0.17 + 1) }))];

  // the extras the stories bring in
  const CIT = [extra('eastCitizen0', 'citizen'), extra('eastCitizen1', 'citizen')];
  const DOORMAN = extra('museumDoorman', 'doorman');
  const FIREMEN = [extra('fireman0', 'fisher'), extra('fireman1', 'fisher')];
  const STRIKER_MAN = extra('striker', 'citizen');

  // what goes on by itself: the Red Hood's motorcycle in the court, Vicki's flash
  const fishFlock = flock('fish', 24);
  book.always.push((dt, clock) => {
    now = clock;
    for (const f of flocks) f.step(dt);
    if (redCycle) { redCycle.at(RED_CYCLE.x, RED_CYCLE.y, RED_CYCLE.z, RED_CYCLE.h); redCycle.shown(true); redCycle.lights(0.2 * night()); }
    if (now - vickiRest.at < 0.2) {
      const p = (vickiRest.t + (now - vickiRest.at)) % 7;
      if (p > 5.4 && p < 5.6) W.glints.speck([VICKI.x + Math.cos(VICKI.h) * 0.4, VICKI.y + 2.0, VICKI.z + Math.sin(VICKI.h) * 0.4], 0.5, 0xffffff);
    }
  });

  // ================================================================== 1. The Jokermobile on the docks
  // Batman 37 (1946) gave the Joker his car, white "to resemble the Joker's skin"; B&B 191 (1982) its boxing glove;
  // the rogues note's story 2 its plank over an opening bridge. It comes out of the card company's roller door with
  // cards streaming, the Batmobile comes up out of the dock tunnel behind it, the drawbridge goes up, the Jokermobile
  // takes the rising leaf like a ramp with its plank out and is over; the Batmobile stops at the leaf. Over the cut the
  // glove springs at nobody, a puff of smoke, car and Joker are gone: he is laughing on his catwalk again.
  const leaf = (() => { try { return buildDrawbridge(k); } catch { return null; } })();
  const shutter = (() => { try { return rollerDoor(k); } catch { return null; } })();
  {
    const jm = machine('jokermobile'), bm = machine('batmobile');
    const lane = SHOW_LANES.apron, LZ = lane.z, HINGE = 88, LEAF = 10;
    const leafF = (tb: number): number => ease(span(tb, 3.0, 5.2)) * 0.22 + ease(span(tb, 6.6, 9)) * 0.63 - ease(span(tb, 15.5, 19.5)) * 0.85;
    const leafA = (tb: number): number => leafF(tb) * ((70 * Math.PI) / 180);
    // the Jokermobile: out of the door southward, round onto the lane, east, up the leaf and over
    // it waits inside with its nose in the doorway, 0.6 out: the door's shutter rolls up before it shows itself
    // (the building is 8 deep and the car 8.45 long, so that is as far in as it goes)
    const JX = GARAGE.x, TURN = 2.6, IN_Z = GARAGE.z - 5.85;
    const PATH: [number, number][] = [[JX, IN_Z]];
    for (let i = 0; i <= 8; i++) { const a = Math.PI - (Math.PI / 2) * (i / 8); PATH.push([JX + TURN + Math.cos(a) * TURN, LZ - TURN + Math.sin(a) * TURN]); }
    PATH.push([HINGE + 7.5, LZ]);
    const cum = [0];
    for (let i = 1; i < PATH.length; i++) cum.push(cum[i - 1] + Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]));
    const L = cum[cum.length - 1];
    const along = (s: number): [number, number, number] => {
      const d = clamp(s, 0, L);
      let i = 1;
      while (i < PATH.length - 1 && cum[i] < d) i++;
      const a = PATH[i - 1], b = PATH[i], f = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
      return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), Math.atan2(b[1] - a[1], b[0] - a[0])];
    };
    // quick from the door to the viaduct, which the Cobblepot Bridge hides from the opening view; the leap, the stop,
    // the glove and the smoke are east of it, where they are seen, and have the time
    const J0 = 0.3, J1 = 5.6, JUMP = 6.6, LANDX = 99.2, GONE = 12.6;
    /** Nothing of a machine beyond this: the board's edge, less a margin. */
    const EDGE = 103.6, NOSE = 4.23, AXLE_F = 2.75, AXLE_R = 2.7;
    const jokerCar = (tb: number): { x: number; y: number; z: number; h: number; pitch: number; v: number; shown: boolean } => {
      if (tb < J0) return { x: JX, y: 0, z: IN_Z, h: S, pitch: 0, v: 0, shown: false };
      if (tb < J1) {
        const u = span(tb, J0, J1), s = L * Math.pow(u, 1.4), p = along(s);
        // each axle rides what is under it, the quay or the leaf beyond its hinge, so that its tail does not sink
        // into the quay as its nose goes up (its axles are 2.75 ahead of its middle and 2.7 behind)
        const a = leafA(tb), up = (x: number): number => Math.max(0, x - HINGE) * Math.tan(a);
        const hf = up(p[0] + AXLE_F), hr = up(p[0] - AXLE_R);
        return { x: p[0], y: hr + ((hf - hr) * AXLE_R) / (AXLE_F + AXLE_R), z: p[1], h: p[2], pitch: Math.atan2(hf - hr, AXLE_F + AXLE_R), v: (1.4 * Math.pow(u, 0.4) * L) / (J1 - J0), shown: true };
      }
      if (tb < JUMP) {
        // nose up off the leaf, nose down over the cut, and level again as it comes down, so that it lands on its wheels
        const u = span(tb, J1, JUMP), x0 = HINGE + 7.5, y0 = 7.5 * Math.tan(leafA(J1));
        return { x: lerp(x0, LANDX, u), y: lerp(y0, 0, u) + 1.6 * Math.sin(Math.PI * u), z: LZ, h: E, pitch: leafA(J1) * (1 - 2 * u) * (1 - ease(span(u, 0.7, 1))), v: 12, shown: true };
      }
      return { x: LANDX, y: 0, z: LZ, h: E, pitch: 0, v: 0, shown: tb < GONE };
    };
    // the Batmobile: up out of the tunnel, after it, short of the leaf, and back in
    const B0 = 1.4, B1 = 6.4, STOPX = HINGE - 5.4, BACK0 = 17.5, BACK1 = 23.5, INX = TUNNEL.x - 6;
    const batCar = (tb: number): { x: number; v: number; shown: boolean } => {
      const x = tb < B1 ? lerp(INX, STOPX, 1 - (1 - span(tb, B0, B1)) ** 2) : lerp(STOPX, INX, ease(span(tb, BACK0, BACK1)));
      return { x, v: tb < B1 ? 9 : tb > BACK0 ? -4 : 0, shown: x + 4.8 > TUNNEL.x };
    };
    const BAT_IN = at(TUNNEL.x + 1.6, 0, LZ, WEST);
    let lastTb = 0;
    book.stories.push({
      id: 'chase', name: 'the Jokermobile on the docks', cast: ['joker', 'harley', 'batman', 'bane'], holds: ['apron', 'batmobile', 'jokermobile', 'drawbridge'], weight: 1,
      marks: { joker: at(GARAGE.x, GARAGE.y, GARAGE.z, S), harley: at(GARAGE.x + 1.2, GARAGE.y, GARAGE.z, S), batman: 'post', bane: 'post' }, body: 24.5,
      play(tb, P) {
        const c = jokerCar(tb), b = batCar(tb);
        const s0 = seatOn(jm, c.x, c.y, c.z, c.h, c.pitch, 0, [-0.85, 0.5, -0.55]), s1 = seatOn(jm, c.x, c.y, c.z, c.h, c.pitch, 1, [-0.85, 0.5, 0.55]);
        const seatShown = (s: V3): boolean => c.shown && s[2] > GARAGE.z - 1.6;
        P.put('joker', tb >= GONE + 1 ? still(CATWALK, laugh(((tb - GONE - 1) / 3) % 1)) : seatShown(s0) ? still(at(s0[0], s0[1], s0[2], c.h), tb > 10 && tb < 12 ? laugh(span(tb, 10, 12)) : drive((tb * 0.4) % 1), { aloft: true, close: true }) : hidden(GARAGE));
        P.put('harley', seatShown(s1) && tb < GONE ? still(at(s1[0], s1[1], s1[2], c.h), tb > 5.5 && tb < 7 ? { armL: 2.8, armR: 2.8, spreadL: 0.4, spreadR: 0.4, crouch: 1 } : drive((tb * 0.4 + 0.3) % 1), { aloft: true, close: true }) : hidden(GARAGE));
        const bs = seatOn(bm, b.x, 0, LZ, E, 0, 0, [-1.0, 0.5, 0]);
        // he is in the tunnel already when the body begins
        P.put('batman', b.shown && bs[0] > TUNNEL.x + 0.3 ? still(at(bs[0], bs[1], bs[2], E), drive((tb * 0.3) % 1), glowB({ aloft: true, close: true })) : hidden(TUNNEL));
        // Bane on his crates watches it go by
        const bn = P.from('bane'), look = toward(bn.x, bn.z, c.shown ? c.x : b.x, c.shown ? c.z : LZ);
        P.put('bane', still(at(bn.x, bn.y, bn.z, turnTo(bn.h, look, 0.8)), { ...hang(0), nod: 0.2 }, { glow: 0.2 }));
      },
      props(tb, live) {
        const dt = clamp(tb - lastTb, 0, 0.1);
        lastTb = tb;
        const c = jokerCar(tb), b = batCar(tb);
        if (jm) {
          jm.shown(c.shown);
          jm.lights(1);
          jm.trick('cards', span(tb, 0.8, 1.4) * (1 - span(tb, 6.5, 7.5)));
          // the plank reaches out over the cut, but never past the board's edge: it is drawn in as the car lands
          const room = Math.max(0, (EDGE - (c.x + NOSE * Math.cos(c.pitch))) / 10);
          jm.trick('plank', Math.min(room, ease(span(tb, 4.6, 5.4)) * (1 - ease(span(tb, 6.0, 6.6)))));
          jm.trick('glove', ease(span(tb, 8.6, 9.0)) * (1 - ease(span(tb, 10.4, 11.0))));
          if (live && c.shown) jm.run(c.v, dt);
        }
        if (bm) {
          bm.shown(b.shown);
          bm.lights(1);
          if (live && b.shown) bm.run(b.v, dt);
        }
        leaf?.lift(leafF(tb));
        // the card company's shutter rolls up before the car shows itself, and comes down when it is round the corner
        shutter?.open(ease(span(tb, 0, J0)) * (1 - ease(span(tb, 2.2, 3.2))));
        W.air?.burst(LANDX, 0.5, LZ, ease(span(tb, 11.6, 12.4)) * (1 - ease(span(tb, 14.5, 16.5))));
      },
      end() { jm?.shown(false); jm?.trick('cards', 0); jm?.trick('plank', 0); jm?.trick('glove', 0); jm?.lights(0); bm?.shown(false); bm?.lights(0); leaf?.lift(0); shutter?.open(0); lastTb = 0; },
    });
  }

  // ================================================================== 2. The Laughing Fish
  // Steve Englehart's story of 1978 (Det. 475 and 476 [mem]; rogues note, story 3): the Joker's grinning fish. They
  // leap off the fish jetty, the fishermen throw up their hands, the Joker rows round the jetty's end in his boat with
  // its jack-in-the-box flag up and bows to the crate on the jetty (the note's PATENT PENDING, unlettered here);
  // Batgirl lands on the jetty's end, and he rows off laughing as the fish go quiet. Nobody is harmed.
  {
    const rb = machine('rowboat');
    const WATER = Y.water;
    // north of the jetty, where the harbour is open: the casino lies close along its south side
    // off the quay's corner, 3 clear of the pier's piles (its south edge is z 46) with the oars out
    // (and 5.1 off the stage's west side: at 4.7 an oar's tip swung into the quay's corner as he came in)
    const STOP = { x: FISH.x0 + 5.1, z: FISH.z0 + 3.0 };
    const IN = curveOf([[STOP.x + 15, WATER, STOP.z + 1.2], [STOP.x + 7, WATER, STOP.z + 0.5], [STOP.x, WATER, STOP.z]]);
    // he keeps north on his way out until he is past the fish jetty's landing stage, whose north edge is z 53.2:
    // his south oar reaches 2.3 from his keel
    const OUT = curveOf([[STOP.x, WATER, STOP.z], [STOP.x + 6, WATER, STOP.z + 0.1], [STOP.x + 15, WATER, STOP.z + 1.8]]);
    const R0 = 1, R1 = 9, R2 = 24, R3 = 33;
    const boat = (tb: number): { x: number; z: number; h: number; v: number; shown: boolean } => {
      if (tb < R1) { const s = IN.len * ease(span(tb, R0, R1)), q = IN.at(s); return { x: q.p[0], z: q.p[2], h: q.h, v: 2, shown: tb >= R0 }; }
      if (tb < R2) return { x: STOP.x, z: STOP.z, h: WEST, v: 0, shown: true };
      const s = OUT.len * ease(span(tb, R2, R3)), q = OUT.at(s);
      return { x: q.p[0], z: q.p[2], h: q.h, v: 2, shown: tb < R3 };
    };
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.7), new THREE.MeshLambertMaterial({ color: 0x9a7448 }));
    crate.position.set(FISH.x0 - 1.1, gy(FISH.x0 - 1.1, FISH.z0 - 0.8, 2) + 0.35, FISH.z0 - 0.8);
    crate.visible = false;
    k.group.add(crate);
    // on the quay's edge where the opening view sees it, a little north of the fishermen
    const BGQ = spot(FISH.x0 + 1.5, FISH.z0 - 2.2, E, 2);
    const BG_LAND = 15.5, bgIn = launch(LIBRARY_STEPS, BGQ), BG_HOME = R3 + 1, bgHome = landing(BGQ, LIBRARY_STEPS);
    let lastTb = 0;
    if (import.meta.env.DEV) {
      let near = Infinity;
      for (const line of Object.values(BOAT_LINES)) for (let i = 0; i + 1 < line.length; i++) for (const cv of [IN, OUT]) for (let s = 0; s <= cv.len; s += 0.5) {
        const p = cv.at(s).p, a = line[i], b = line[i + 1], vx = b[0] - a[0], vz = b[1] - a[1], l = vx * vx + vz * vz || 1, f = clamp(((p[0] - a[0]) * vx + (p[2] - a[1]) * vz) / l);
        near = Math.min(near, Math.hypot(p[0] - a[0] - vx * f, p[2] - a[1] - vz * f));
      }
      if (near < 3) console.warn(`Gotham: the Joker's rowing boat comes within ${near.toFixed(1)} of a boat's line.`);
    }
    book.stories.push({
      id: 'fish', name: 'the Laughing Fish', cast: ['joker', 'batgirl', ...FISHERS], holds: ['fishCorner', 'rowboat'], weight: 1,
      marks: { joker: at(STOP.x, WATER, STOP.z, WEST), batgirl: 'post', [FISHERS[0]]: 'post', [FISHERS[1]]: 'post' }, body: BG_HOME + bgHome.dur + 0.6,
      play(tb, P) {
        const b = boat(tb), s0 = seatOn(rb, b.x, WATER, b.z, b.h, 0, 0, [0.3, 0.2, 0]), s: V3 = [s0[0], Math.max(s0[1], WATER + 0.12), s0[2]];
        let j: State;
        if (!b.shown) j = hidden(at(b.x, WATER, b.z, b.h));
        else if (tb > R1 + 0.5 && tb < R2) {
          const toCrate = toward(s[0], s[2], crate.position.x, crate.position.z);
          j = still(at(s[0], s[1], s[2], toCrate), tb < R1 + 1.5 ? blend(sit(1), {}, span(tb, R1 + 0.5, R1 + 1.5)) : tb < R1 + 5 ? bow(span(tb, R1 + 1.5, R1 + 5)) : laugh(((tb - R1 - 5) / 3) % 1), { aloft: true, close: true });
        } else j = still(at(s[0], s[1], s[2], b.h + Math.PI), row((tb * 0.8) % 1), { aloft: true, close: true });
        P.put('joker', j);
        // the fishermen throw up their hands as the fish leap
        FISHERS.forEach((id, i) => {
          const f = P.from(id), up = Math.sin(Math.PI * span(tb, 2.5 + i * 0.4, 7 + i * 0.4));
          P.put(id, still(facing(f, STOP.x + 3, STOP.z), blend({ armR: 1.1, elbowR: 0.4, armL: 0.9, elbowL: 0.6 }, { armL: 2.8, armR: 2.8, spreadL: 0.5, spreadR: 0.5, lean: -0.15 }, up)));
        });
        // Batgirl
        const g = glowB(), t0 = BG_LAND - bgIn.dur;
        if (tb < t0) P.put('batgirl', still(P.from('batgirl'), sit(1), g));
        else if (tb < BG_LAND) P.put('batgirl', { ...bgIn.at(tb - t0), ...g });
        else if (tb < BG_HOME) P.put('batgirl', still(facing(BGQ, b.x, b.z), tb > R2 + 2 && tb < R2 + 4.5 ? shrug(span(tb, R2 + 2, R2 + 4.5)) : { head: 0.2 * Math.sin(tb) }, g));
        else if (tb < BG_HOME + bgHome.dur) P.put('batgirl', { ...bgHome.at(tb - BG_HOME), ...g });
        else P.put('batgirl', still(LIBRARY_STEPS, sit(1), g));
      },
      props(tb, live) {
        const dt = clamp(tb - lastTb, 0, 0.1);
        lastTb = tb;
        const b = boat(tb);
        if (rb) {
          rb.shown(b.shown);
          rb.at(b.x, WATER, b.z, b.h);
          rb.trick('flag', ease(span(tb, R1, R1 + 1.2)) * (1 - ease(span(tb, R3 - 3, R3 - 1))));
          if (live && b.shown) rb.run(b.v, dt);
        }
        crate.visible = true;
        const quiet = 1 - span(tb, R2 + 3, R2 + 7);
        if (fishFlock) {
          fishFlock.shown(quiet > 0.02);
          fishFlock.set({ x: FISH.x0 + 7.1, y: WATER, z: FISH.z0 + 1.2, spread: 1.5, n: Math.round(20 * ease(span(tb, 1.5, 3)) * quiet), swirl: 0.6 });
        }
        // grins: white specks arcing out of the water
        for (let i = 0; i < 5 && quiet > 0.05; i++) {
          const ph = (tb * 0.7 + i * 0.37) % 1, x = FISH.x0 + 5.6 + i * 0.6, z = FISH.z0 + 0.8 + (i % 2) * 0.7;
          if (ph < 0.6) W.glints.speck([x + ph * 1.2, WATER + 1.6 * Math.sin(Math.PI * ph / 0.6), z], 0.16, dim(0xffffff, quiet));
        }
      },
      end() { rb?.shown(false); rb?.trick('flag', 0); crate.visible = false; fishFlock?.shown(false); lastTb = 0; },
    });
  }

  // ================================================================== 3. The Penguin's Umbrella
  // Det. 58 (1941): he stole two paintings by hiding them in his umbrella's handle [wp Penguin; rogues note, story 4].
  // The museum's bell rings, the Penguin waddles out of its door and down its steps with a painting under his arm, the
  // doorman runs out after him, Robin lands before him; he sets the painting down, opens his umbrella and drifts away
  // over the Sprang to his own roof terrace, and the doorman carries the painting back in.
  {
    const LOUNGE = W.place('waterfront', 'loungeTerrace', at(-2.2, 12, 37.4, TO_VIEW));
    const PEN_STOP = spot(MUSEUM_STEPS.x, MUSEUM_STEPS.z + 1.6, S, 2), PAINT = at(PEN_STOP.x + 0.9, PEN_STOP.y, PEN_STOP.z + 0.4, S);
    const ROBIN = facing(spot(PEN_STOP.x + 3.0, PEN_STOP.z + 0.6, WEST, 2), PEN_STOP.x, PEN_STOP.z);
    const DOOR_STOP = facing(spot(PEN_STOP.x - 1.9, PEN_STOP.z - 0.2, E, 2), PAINT.x, PAINT.z);
    const out = seq([walkLeg(at(MUSEUM_DOOR.x, MUSEUM_DOOR.y, MUSEUM_DOOR.z, S), PEN_STOP, 1.2, waddle)]);
    const flight = airLeg(W.solid, PEN_STOP, LOUNGE, 'umbrella');
    let high = 0;
    for (let t = 0; t <= flight.dur; t += 0.2) high = Math.max(high, flight.at(t).y);
    const IN = walkLeg(at(MUSEUM_STEPS.x, MUSEUM_STEPS.y, MUSEUM_STEPS.z, N), at(MUSEUM_DOOR.x, MUSEUM_DOOR.y, MUSEUM_DOOR.z, N), 1.6);
    const OUT0 = 4.2, SET = OUT0 + out.dur + 2.8, OPEN = SET + 1.4, FLY = OPEN + 1.0;
    const dOut = walkLeg(at(MUSEUM_DOOR.x, MUSEUM_DOOR.y, MUSEUM_DOOR.z, S), DOOR_STOP, 3.5, run), dTo = walkLeg(DOOR_STOP, facing(at(PAINT.x - 0.7, PAINT.y, PAINT.z, E), PAINT.x, PAINT.z), 1.6);
    const dBack = walkLeg(at(PAINT.x - 0.7, PAINT.y, PAINT.z, N), at(MUSEUM_DOOR.x, MUSEUM_DOOR.y, MUSEUM_DOOR.z, N), 1.6);
    const D_OUT = OUT0 + 1.4, D_TO = FLY + 1.2, D_BACK = D_TO + dTo.dur + 0.9, D_IN = D_BACK + dBack.dur;
    const painting = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 0.06), new THREE.MeshLambertMaterial({ color: 0xb8892e }));
    painting.visible = false;
    k.group.add(painting);
    let pen: State = still(PEN_STOP), door: State = still(DOOR_STOP);
    const BODY = Math.max(FLY + flight.dur, D_IN) + 2.5;
    book.stories.push({
      id: 'heist', name: "the Penguin's Umbrella", cast: ['penguin', 'robin', DOORMAN], holds: ['museumSteps', 'loungeRoof', ...(high > 40 ? ['sky'] : [])], weight: 1,
      marks: { penguin: MUSEUM_STEPS, robin: 'post', [DOORMAN]: at(MUSEUM_DOOR.x, MUSEUM_DOOR.y, MUSEUM_DOOR.z, S) }, body: BODY,
      play(tb, P) {
        // the Penguin: in at the door, out again with the painting, down the steps, the painting set down, and away
        if (tb < IN.dur) pen = grounded(IN.at(tb));
        else if (tb < OUT0) pen = hidden(MUSEUM_DOOR);
        else if (tb < OUT0 + out.dur) pen = { ...grounded(out.at(tb - OUT0)), pose: { ...waddle(((tb - OUT0) * 1.5) % 1), armL: 0.2, elbowL: 1.3, spreadL: -0.2 } };
        else if (tb < SET) pen = still(facing(PEN_STOP, ROBIN.x, ROBIN.z), { armL: 0.2, elbowL: 1.3, spreadL: -0.2, lean: -0.15, head: 0.3 * Math.sin(tb * 2) });
        else if (tb < OPEN) pen = still(facing(PEN_STOP, PAINT.x, PAINT.z), { lean: 0.45 * Math.sin(Math.PI * span(tb, SET, OPEN)), armL: 0.8, elbowL: 0.5 });
        else if (tb < FLY) pen = still(PEN_STOP, { armR: 2.6, elbowR: 0.4 }, { hold: ease(span(tb, OPEN, FLY)) });
        else if (tb < FLY + flight.dur) pen = flight.at(tb - FLY);
        else pen = still(LOUNGE, { lean: -0.15, nod: -0.1 });
        P.put('penguin', pen);
        // Robin lands before him, and watches him go
        const rFrom = P.from('robin'), g = glowB();
        let rleg: Leg | null = null;
        rleg = lineLeg(W.solid, rFrom, ROBIN);
        const r1 = OUT0 + out.dur + 0.8, r0 = r1 - rleg.dur;
        if (tb < r0) P.put('robin', still(rFrom, perch((tb * 0.05) % 1), g));
        else if (tb < r1) P.put('robin', { ...rleg.at(tb - r0), ...g });
        else P.put('robin', still(at(ROBIN.x, ROBIN.y, ROBIN.z, tb > FLY ? toward(ROBIN.x, ROBIN.z, pen.x, pen.z) : ROBIN.h), tb > FLY + 3 && tb < FLY + 5.5 ? shrug(span(tb, FLY + 3, FLY + 5.5)) : {}, { ...g, hold: 1 }));
        // the doorman: out after him, and in again with the painting
        if (tb < D_OUT) door = hidden(MUSEUM_DOOR);
        else if (tb < D_OUT + dOut.dur) door = grounded(dOut.at(tb - D_OUT));
        else if (tb < D_TO) door = still(DOOR_STOP, tb < FLY ? { armR: 1.6, elbowR: 0.2 } : { nod: -0.3, head: 0.3 });
        else if (tb < D_TO + dTo.dur) door = dTo.at(tb - D_TO);
        else if (tb < D_BACK) door = still(at(PAINT.x - 0.7, PAINT.y, PAINT.z, E), { lean: 0.5 * Math.sin(Math.PI * span(tb, D_TO + dTo.dur, D_BACK)), armL: 0.9, armR: 0.9 });
        else if (tb < D_IN) door = { ...grounded(dBack.at(tb - D_BACK)), pose: { ...walk(((tb - D_BACK) * 0.8) % 1), armL: 1.0, armR: 1.0, elbowL: 0.6, elbowR: 0.6 } };
        else door = hidden(MUSEUM_DOOR);
        P.put(DOORMAN, door);
      },
      props(tb) {
        // the alarm bell over the door, blinking, and its rings
        if (tb > 1 && tb < FLY + 4) {
          const on = Math.floor(tb * 4) % 2 === 0;
          W.glints.speck([MUSEUM_DOOR.x + 1.4, MUSEUM_DOOR.y + 4.2, MUSEUM_DOOR.z + 0.4], 0.35, on ? 0xff3020 : 0x401010);
          const u = (tb * 0.9) % 1;
          W.rings.set(0, [MUSEUM_DOOR.x, 0.06, MUSEUM_DOOR.z + 3], 1 + 6 * u, 0.5 * (1 - u), 0xff5040);
        } else W.rings.set(0, [0, 0, 0], 1, 0);
        // the painting: under his arm, set down leaning, in the doorman's arms, and gone in
        let p: V3 | null = null, h = 0;
        if (tb >= OUT0 && tb < SET + 0.6) { p = handOf(pen, 1.0, 0.0, -0.45); h = pen.h; }
        else if (tb < D_TO + dTo.dur + 0.4 && tb >= SET + 0.6) { p = [PAINT.x, PAINT.y + 0.33, PAINT.z]; h = S; }
        else if (tb < D_IN && tb >= D_TO + dTo.dur + 0.4) { p = handOf(door, 1.2, 0.45, 0); h = door.h + Math.PI / 2; }
        painting.visible = !!p;
        if (p) { painting.position.set(p[0], p[1], p[2]); painting.rotation.set(0, -h, 0); }
      },
      end() { painting.visible = false; W.rings.set(0, [0, 0, 0], 1, 0); },
    });
  }

  // ================================================================== 4. Mr. Freeze's Cold Snap
  // Batman 121 (1959): Mr. Zero's ice and the steam that melts it [wp Mr. Freeze; rogues note, story 9]. Played before
  // the cold store's door, the part of the docks the opening view sees: the hydrant on the paving east of the door
  // bursts, Freeze steps out and turns his gun on its jet, not on anyone, and the jet stands frozen in a column of ice
  // while frost spreads over the paving. Batman lands and shuts the hydrant at its cap; the ice goes in a burst of
  // steam; Freeze inclines his helmet and goes back in.
  {
    // the hydrant: a small prop of this chapter's that stands there always
    const HYD = { x: FREEZE_DOOR.x + 3.65, z: FREEZE_DOOR.z + 0.35 };
    const HY = gy(HYD.x, HYD.z, 2);
    const hydrant = new THREE.Group();
    const red = new THREE.MeshLambertMaterial({ color: 0xb8302a });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.62, 8), red);
    body.position.y = 0.31;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.14, 8), red);
    cap.position.y = 0.69;
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 6), red);
    nozzle.rotation.z = Math.PI / 2;
    nozzle.position.y = 0.42;
    hydrant.add(body, cap, nozzle);
    hydrant.position.set(HYD.x, HY, HYD.z);
    k.group.add(hydrant);
    const JET: V3 = [HYD.x, HY + 0.8, HYD.z];
    const F1 = facing(spot(FREEZE_DOOR.x + 0.85, FREEZE_DOOR.z + 1.15, E, 2), HYD.x, HYD.z);
    const fOut = walkLeg(FREEZE_DOOR, F1, 1.3), fIn = walkLeg(facing(F1, FREEZE_DOOR.x, FREEZE_DOOR.z), at(FREEZE_DOOR.x, FREEZE_DOOR.y, FREEZE_DOOR.z, N), 1.3);
    const LANDB = spot(HYD.x - 1.2, HYD.z + 1.1, N, 2), CAP = facing(spot(HYD.x + 0.7, HYD.z + 0.5, WEST, 2), HYD.x, HYD.z);
    const bTo = walkLeg(facing(LANDB, CAP.x, CAP.z), CAP, 1.4);
    const BURST = 1.0, OUT = 2.0, AIM = OUT + fOut.dur + 0.4, FROZEN = AIM + 1.6, BAT = FROZEN + 4.5, SHUT = BAT + 0.4 + bTo.dur, STEAM = SHUT + 1.4, IN = STEAM + 4;
    const jet = (tb: number): number => ease(span(tb, BURST, BURST + 0.6)) * (1 - ease(span(tb, SHUT, SHUT + 0.6)));
    const ice = (tb: number): number => ease(span(tb, AIM + 0.4, FROZEN)) * (1 - ease(span(tb, STEAM, STEAM + 2.2)));
    let fr: State = still(F1);
    book.stories.push({
      id: 'ice', name: "Mr. Freeze's Cold Snap", cast: ['freeze', 'batman'], holds: ['apron', 'coldStore'], weight: 1,
      marks: { freeze: 'post', batman: 'post' }, body: IN + fIn.dur + 2,
      play(tb, P) {
        const aiming = tb > AIM && tb < FROZEN + 1.5;
        if (tb < OUT) fr = still(FREEZE_DOOR, { head: tb > BURST ? 0.8 : 0 }, { glow: 0.8 });
        else if (tb < OUT + fOut.dur) fr = fOut.at(tb - OUT);
        else if (tb < IN) fr = still(F1, aiming ? { armR: 1.55, elbowR: 0.1, armL: 1.4, elbowL: 0.4, spreadL: -0.3 } : tb < IN - 1.5 ? { nod: 0.1 } : { nod: 0.4 * Math.sin(Math.PI * span(tb, IN - 1.5, IN)) }, { hold: aiming ? 1 : 0, glow: 0.8 });
        else if (tb < IN + fIn.dur) fr = fIn.at(tb - IN);
        else fr = still(FREEZE_DOOR, {}, { glow: 0.8 });
        P.put('freeze', fr);
        const home = P.from('batman'), g = glowB();
        const leg = lineLeg(W.solid, home, LANDB), t0 = BAT - leg.dur;
        if (tb < t0) P.put('batman', still(home, perch((tb * 0.05) % 1), { cape: 0.1, ...g }));
        else if (tb < BAT) P.put('batman', { ...leg.at(tb - t0), ...g });
        else if (tb < BAT + 0.4) P.put('batman', still(LANDB, {}, g));
        else if (tb < SHUT) P.put('batman', { ...bTo.at(tb - BAT - 0.4), ...g });
        else if (tb < STEAM) P.put('batman', still(CAP, { lean: 0.6, crouch: 0.35, armL: 1.2, armR: 1.2, elbowL: 0.6, elbowR: 0.6, twist: 0.3 * Math.sin((tb - SHUT) * 6) }, g));
        else P.put('batman', still(at(CAP.x, CAP.y, CAP.z, toward(CAP.x, CAP.z, F1.x, F1.z)), {}, { cape: 0.2, ...g }));
      },
      props(tb) {
        const j = jet(tb), f = ice(tb);
        // the jet: pale lines up out of the burst hydrant and specks falling round it, until it is frozen
        if (j > 0.01 && f < 0.95) for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU + tb * 0.5, h = 2.6 * j * (1 - f), r = 0.35 + 0.25 * Math.sin(tb * 7 + i);
          W.glints.line(JET, [JET[0] + Math.cos(a) * r, JET[1] + h, JET[2] + Math.sin(a) * r], 0.09, dim(0xc8e8ff, 1 - f));
          const u = (tb * 1.3 + i * 0.2) % 1;
          W.glints.speck([JET[0] + Math.cos(a) * (0.4 + u), JET[1] + h * (1 - u * u), JET[2] + Math.sin(a) * (0.4 + u)], 0.09, dim(0xe8f8ff, 1 - f));
        }
        // the cold beam, from the gun to the jet
        if (tb > AIM + 0.2 && tb < FROZEN + 1.2) { const h = handOf(fr, 1.8, 0.9, 0.2); W.glints.line(h, [JET[0], JET[1] + 1.0, JET[2]], 0.12, 0xbfe8ff); }
        // the jet stood in ice, and frost over the paving
        if (f > 0.01) {
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU, r = 0.22 + 0.14 * (i % 2), hgt = JET[1] + (1.6 + 0.8 * ((i * 37) % 5) / 5) * f;
            W.glints.line([JET[0] + Math.cos(a) * r, JET[1] - 0.2, JET[2] + Math.sin(a) * r], [JET[0] + Math.cos(a) * r * 0.4, hgt, JET[2] + Math.sin(a) * r * 0.4], 0.17 * f, 0x9fd8f8);
          }
          W.glints.speck([JET[0], JET[1] + 2.4 * f, JET[2]], 0.28 * f, 0xe8f8ff);
          for (let i = 0; i < 2; i++) { const u = (tb * 0.35 + i * 0.5) % 1; W.rings.set(1 + i, [HYD.x - 0.6, HY + 0.07, HYD.z + 0.4], 0.5 + 2.6 * u * f, 0.55 * f * (1 - u), 0xcfeeff); }
        } else { W.rings.set(1, [0, 0, 0], 1, 0); W.rings.set(2, [0, 0, 0], 1, 0); }
        W.air?.burst(HYD.x, HY + 0.6, HYD.z, ease(span(tb, STEAM, STEAM + 0.6)) * (1 - ease(span(tb, STEAM + 2.5, STEAM + 4))));
      },
      end() { W.rings.set(1, [0, 0, 0], 1, 0); W.rings.set(2, [0, 0, 0], 1, 0); W.air?.burst(HYD.x, HY + 0.6, HYD.z, 0); },
    });
    void VALVE;
  }

  // ================================================================== 5. Bane's Crate
  // Bane's Venom from Vengeance of Bane (1993) [wp Bane; rogues note on Bane]: his tubes glow, he swells, lifts a crate
  // over his head; Nightwing lands; they circle and he swings twice, Nightwing under and over; he hurls the crate into
  // the dock cut instead, the glow goes, he is his own size, and sits down on his crates with his chin on his fist.
  {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.9), new THREE.MeshLambertMaterial({ color: 0x8a643a }));
    crate.visible = false;
    k.group.add(crate);
    const M = { x: BANE_POST.x - 0.65, z: SHOW_LANES.apron.z - 0.1 }, R = 0.7;
    const B_DOWN = spot(M.x + 0.3, M.z - R, S, 2), N_LAND = spot(M.x - 0.2, M.z + R + 0.3, N, 2);
    const ring = (a: number, who: 0 | 1): Spot => { const ang = a + (who ? Math.PI : 0), x = M.x + Math.cos(ang) * R, z = M.z + Math.sin(ang) * R; return at(x, gy(x, z, 2), z, toward(x, z, M.x, M.z)); };
    const A0 = -Math.PI / 2;
    // (a hair over the water: rings that lie in its very plane flicker)
    const SPLASH: V3 = [93, Y.water + 0.03, 42.6];
    const DOCKERS = CIT.map((id, i) => ({ id, at: spot(84.2 + i * 1.5, 44.9 - i * 0.3, E, 2) }));
    const NL = 5.2, C1 = 6, SW1 = 9.5, C2 = 10.8, SW2 = 13.6, HURL = 15.2, SIT = 19.5, BODY = 25;
    let bn: State = still(BANE);
    book.stories.push({
      id: 'venom', name: "Bane's Crate", cast: ['bane', 'nightwing', ...CIT], holds: ['apron'], weight: 1,
      marks: { bane: 'post', nightwing: 'post', [CIT[0]]: DOCKERS[0].at, [CIT[1]]: DOCKERS[1].at }, body: BODY,
      play(tb, P) {
        const post = P.from('bane');
        const big = 1 + 0.15 * ease(span(tb, 2, 4)) * (1 - ease(span(tb, HURL + 1, HURL + 2.5)));
        const glowV = ease(span(tb, 1.5, 2.5)) * (1 - ease(span(tb, HURL + 1, HURL + 2)));
        const lifted = tb > 3.5 && tb < HURL + 0.4;
        const crateOver: Partial<Pose> = carry((tb * 0.3) % 1);
        if (tb < 0.5) bn = still(post, hang(0));
        else if (tb < 1.6) { const u = span(tb, 0.5, 1.6); bn = still(at(lerp(post.x, B_DOWN.x, u), lerp(post.y, B_DOWN.y, u) + 0.8 * Math.sin(Math.PI * u), lerp(post.z, B_DOWN.z, u), S), leap(0.3 + 0.6 * u), { aloft: true }); }
        else if (tb < C1) bn = still(B_DOWN, tb > 3.5 ? blend({}, crateOver, span(tb, 3.5, 5)) : { lean: 0.2, armL: 0.5, armR: 0.5, spreadL: 0.4, spreadR: 0.4 });
        else if (tb < SW1) bn = still(ring(A0 + Math.PI * ease(span(tb, C1, SW1)), 0), crateOver);
        else if (tb < C2) bn = still(ring(A0 + Math.PI, 0), blend(crateOver, { armL: 2.2, armR: 2.2, lean: 0.5, crouch: 0.3 }, Math.sin(Math.PI * span(tb, SW1, C2))));
        else if (tb < SW2) bn = still(ring(A0 + Math.PI + Math.PI * ease(span(tb, C2, SW2)), 0), crateOver);
        else if (tb < HURL) bn = still(ring(A0, 0), blend(crateOver, { armL: 2.2, armR: 2.2, lean: 0.5, crouch: 0.3 }, Math.sin(Math.PI * span(tb, SW2, HURL))));
        else if (tb < SIT - 1.2) bn = still(facing(ring(A0, 0), SPLASH[0], SPLASH[2]), tb < HURL + 0.8 ? toss(span(tb, HURL, HURL + 0.8)) : { nod: 0.2 });
        else if (tb < SIT) { const r0 = ring(A0, 0), u = span(tb, SIT - 1.2, SIT); bn = still(at(lerp(r0.x, post.x, u), lerp(r0.y, post.y, u) + 0.8 * Math.sin(Math.PI * u), lerp(r0.z, post.z, u), TO_VIEW), leap(0.3 + 0.6 * u), { aloft: true }); }
        else bn = still(at(post.x, post.y - 0.3, post.z, TO_VIEW), { ...sit(1), armR: 1.6, elbowR: 2.4, nod: 0.45, lean: 0.4 }, { aloft: true });
        P.put('bane', { ...bn, size: big, glow: glowV, hold: lifted ? 1 : 0 });
        // Nightwing: lands, circles, ducks the first swing and flips over the second
        const home = P.from('nightwing'), g = glowB();
        const leg = lineLeg(W.solid, home, N_LAND), t0 = NL - leg.dur;
        if (tb < t0) P.put('nightwing', still(home, perch(0), g));
        else if (tb < NL) P.put('nightwing', { ...leg.at(tb - t0), ...g });
        else if (tb < C1) P.put('nightwing', still(N_LAND, {}, g));
        else if (tb < SW1) { const r = ring(A0 + Math.PI * ease(span(tb, C1, SW1)), 1), u = span(tb, C1, C1 + 0.6); P.put('nightwing', still(at(lerp(N_LAND.x, r.x, u), r.y, lerp(N_LAND.z, r.z, u), r.h), { crouch: 0.2, armL: 0.6, armR: 0.6, elbowL: 1.2, elbowR: 1.2 }, g)); }
        else if (tb < C2) P.put('nightwing', still(ring(A0 + Math.PI, 1), { crouch: 0.85 * Math.sin(Math.PI * span(tb, SW1, C2)), lean: 0.4 }, g));
        else if (tb < SW2) P.put('nightwing', still(ring(A0 + Math.PI + Math.PI * ease(span(tb, C2, SW2)), 1), { crouch: 0.2, armL: 0.6, armR: 0.6, elbowL: 1.2, elbowR: 1.2 }, g));
        else if (tb < HURL) { const u = span(tb, SW2, HURL), r = ring(A0, 1); P.put('nightwing', still(at(r.x, r.y + 1.8 * Math.sin(Math.PI * u), r.z, r.h), leap(u), { pitch: -TAU * ease(u), aloft: u > 0.05 && u < 0.95, ...g })); }
        else P.put('nightwing', still(ring(A0, 1), tb > SIT + 1 && tb < SIT + 3 ? salute(span(tb, SIT + 1, SIT + 3)) : {}, g));
        // the dockers watch from well back, and go about their work again
        DOCKERS.forEach((d, i) => {
          const off = walkLeg(facing(d.at, d.at.x - 8, d.at.z), at(d.at.x - 8, d.at.y, d.at.z, WEST), 2.0);
          P.put(d.id, tb < SIT + 1 + i * 0.6 ? still(facing(d.at, M.x, M.z), tb > SW1 && tb < HURL + 1 ? { armL: 0.7, elbowL: 1.8, nod: 0.1, lean: -0.1 } : { head: 0.2 * Math.sin(tb + i) }) : tb < SIT + 1 + i * 0.6 + off.dur ? off.at(tb - SIT - 1 - i * 0.6) : hidden(d.at));
        });
      },
      props(tb) {
        // the crate, thrown: from his hands in an arc into the cut, and a splash
        if (tb >= HURL + 0.3 && tb < HURL + 1.6) {
          const u = span(tb, HURL + 0.3, HURL + 1.6), a = handOf(bn, 3.4, 0.2, 0);
          crate.visible = true;
          crate.position.set(lerp(a[0], SPLASH[0], u), lerp(a[1], SPLASH[1], u) + 4 * Math.sin(Math.PI * u), lerp(a[2], SPLASH[2], u));
          crate.rotation.set(u * 4, u * 2, 0);
        } else crate.visible = false;
        for (let i = 0; i < 2; i++) { const u = span(tb, HURL + 1.6 + i * 0.4, HURL + 4 + i * 0.4); W.rings.set(3 + i, SPLASH, 0.5 + 3 * u, u > 0 && u < 1 ? 0.7 * (1 - u) : 0); }
      },
      end() { crate.visible = false; W.rings.set(3, [0, 0, 0], 1, 0); W.rings.set(4, [0, 0, 0], 1, 0); },
    });
  }

  // ================================================================== 6. Killer Croc in the Sprang
  // Batman 357 (1983), the man of scales from the sewers and the river [wp Killer Croc; rogues note, story 13]. He swims
  // up from his drain to the quay's steps, comes up them and rears up with his arms wide; two people on the quay run
  // off; Orphan drops in front of him and does not move; he lunges twice and she is not there; she points at the river
  // and he goes back down the steps and under, and is at his drain again.
  {
    const WATER = Y.water;
    // the steps run up the quay's wall from the bottom step north-westward; the quay is past their head
    const TOP = spot(QUAY_STEPS.x - 0.8, QUAY_STEPS.z - 4.05, N, 2);
    const ORPH = facing(spot(TOP.x + 0.4, TOP.z - 2.4, S, 2), TOP.x, TOP.z);
    const SIDE = (s: number): Spot => { const x = ORPH.x - Math.sin(ORPH.h) * s, z = ORPH.z + Math.cos(ORPH.h) * s; return at(x, gy(x, z, ORPH.y + 1), z, ORPH.h); };
    // two people on the quay's sidewalk, north of the steps, clear of the road
    const PEOPLE = CIT.map((id, i) => ({ id, at: facing(spot(TOP.x - 0.3 + i * 0.5, TOP.z - 4.6 - i * 1.6, N, 2), TOP.x, TOP.z) }));
    const swimTo = (a: V3, b: V3, t0: number, t1: number, tb: number): State => {
      const u = ease(span(tb, t0, t1)), x = lerp(a[0], b[0], u), z = lerp(a[2], b[2], u);
      return still(at(x, WATER - 0.12, z, toward(a[0], a[2], b[0], b[2])), swim((tb * 0.6) % 1), { pitch: 1.4, aloft: true });
    };
    const D: V3 = [DRAIN.x, WATER, DRAIN.z], Q: V3 = [QUAY_STEPS.x, WATER, QUAY_STEPS.z], W1: V3 = [QUAY_STEPS.x - 3.8, WATER, QUAY_STEPS.z + 1.2];
    const swim3 = (a: V3, m: V3, b: V3, t0: number, t1: number, tb: number): State => { const tm = lerp(t0, t1, 0.6); return tb < tm ? swimTo(a, m, t0, tm, tb) : swimTo(m, b, tm, t1, tb); };
    const SW1 = 1, SW2 = 6, UP = 8, REAR = 9.5, ORPH_IN = 10.5, L1 = 12, L2 = 14.5, POINT = 17, DOWN = 19.5, BACK = 21.5, HOME = 27, BODY = 30;
    book.stories.push({
      id: 'croc', name: 'Killer Croc in the Sprang', cast: ['croc', 'orphan', ...CIT], holds: ['eastQuay'], weight: 1,
      marks: { croc: 'post', orphan: 'post', [CIT[0]]: PEOPLE[0].at, [CIT[1]]: PEOPLE[1].at }, body: BODY,
      play(tb, P) {
        const head = CROC_HEAD;
        let c: State;
        if (tb < SW1) c = crocTread(tb, head);
        else if (tb < SW2) c = swimTo(D, W1, SW1, SW2, tb);
        else if (tb < UP) { const u = span(tb, SW2, UP), a: V3 = u < 0.4 ? W1 : Q, b: V3 = u < 0.4 ? Q : [TOP.x, TOP.y, TOP.z], v = u < 0.4 ? u / 0.4 : (u - 0.4) / 0.6; c = grounded(still(at(lerp(a[0], b[0], v), lerp(u < 0.4 ? WATER - 0.2 : QUAY_STEPS.y, b[1], v), lerp(a[2], b[2], v), toward(a[0], a[2], b[0], b[2])), walk((u * 3) % 1), { aloft: u < 0.4 })); }
        else if (tb < L1 - 0.4) c = still(TOP, tb > REAR - 1 ? { armL: 2.7, armR: 2.7, spreadL: 1.0, spreadR: 1.0, lean: -0.2, nod: -0.4 } : { lean: 0.3 });
        else if (tb < POINT) c = still(facing(TOP, tb < L2 ? SIDE(0).x : SIDE(1.0).x, tb < L2 ? SIDE(0).z : SIDE(1.0).z), tb < L2 ? lunge(span(tb, L1 - 0.4, L1 + 1.4)) : tb < L2 + 2 ? lunge(span(tb, L2, L2 + 1.8)) : { nod: 0.2, armL: 0.4, armR: 0.4 });
        else if (tb < DOWN) c = still(facing(TOP, Q[0], Q[2]), { nod: 0.3 });
        else if (tb < BACK) { const u = span(tb, DOWN, BACK), a: V3 = u < 0.6 ? [TOP.x, TOP.y, TOP.z] : Q, b: V3 = u < 0.6 ? Q : W1, v = u < 0.6 ? u / 0.6 : (u - 0.6) / 0.4; c = grounded(still(at(lerp(a[0], b[0], v), lerp(a[1], u < 0.6 ? QUAY_STEPS.y : WATER - 0.2, v), lerp(a[2], b[2], v), toward(a[0], a[2], b[0], b[2])), walk((u * 3) % 1), { aloft: u > 0.6 })); }
        else if (tb < HOME) c = swimTo(W1, D, BACK, HOME, tb);
        else c = tb < HOME + 1.5 ? crocTread(tb, head) : hidden(head);
        P.put('croc', c);
        // Orphan: drops in front of him, a step aside each time he lunges, and points at the river
        const home = P.from('orphan'), g = glowB();
        const leg = lineLeg(W.solid, home, ORPH), t0 = ORPH_IN - leg.dur;
        if (tb < t0) P.put('orphan', still(home, perch(0), g));
        else if (tb < ORPH_IN) P.put('orphan', { ...leg.at(tb - t0), ...g });
        else {
          const off = tb < L1 + 0.4 ? 0 : tb < L2 + 0.4 ? ease(span(tb, L1 + 0.4, L1 + 0.8)) * 1.0 : 1.0 - ease(span(tb, L2 + 0.4, L2 + 0.8)) * 2.0;
          const s = SIDE(off);
          P.put('orphan', still(at(s.x, s.y, s.z, tb > POINT && tb < DOWN ? toward(s.x, s.z, Q[0], Q[2]) : ORPH.h), tb > POINT && tb < DOWN ? point(span(tb, POINT, DOWN)) : { crouch: 0.15 }, g));
        }
        // the two on the quay run off round the corner
        PEOPLE.forEach((p, i) => {
          const away = at(p.at.x - 0.2 + i * 0.4, p.at.y, p.at.z - 9, N), off = walkLeg(facing(p.at, away.x, away.z), away, RUN);
          const t1 = REAR - 0.3 + (1 - i) * 0.3;
          P.put(p.id, tb < t1 ? still(p.at, tb > SW2 ? { armL: 1.2, armR: 1.2, elbowL: 1.8, elbowR: 1.8, lean: -0.2 } : idle((tb * 0.1 + i) % 1)) : tb < t1 + off.dur ? grounded(off.at(tb - t1)) : hidden(away));
        });
      },
      props(tb) {
        // rings behind him as he swims
        const sw = (tb > SW1 && tb < SW2) || (tb > BACK && tb < HOME);
        for (let i = 0; i < 2; i++) {
          const u = (tb * 0.8 + i * 0.5) % 1, a = tb < SW2 ? span(tb, SW1, SW2) : span(tb, BACK, HOME), c = tb < SW2 ? swimTo(D, W1, SW1, SW2, tb) : swimTo(W1, D, BACK, HOME, tb), p: V3 = [c.x, WATER + 0.03, c.z]; void a;
          W.rings.set(5 + i, p, 0.6 + 2.2 * u, sw ? 0.5 * (1 - u) : 0, 0xbfd8e8);
        }
      },
      end() { W.rings.set(5, [0, 0, 0], 1, 0); W.rings.set(6, [0, 0, 0], 1, 0); },
    });
  }

  // ================================================================== 7. Arkham's Night Out
  // The breakout of Knightfall (1993) without its harm [wp Bane; rogues note, story 14], as a small comedy: Hugo
  // Strange opens the gate, the Ventriloquist and Calendar Man tiptoe out in a file past a guard who looks the other
  // way; Batwoman lands on the road before them with her arms folded; they stop, turn as one and file back in; Strange
  // spreads his hands and shuts the gate. The sheet's two inmates are left out: Arkham shows no patients.
  {
    const h = GATE_MID.h, perp: [number, number] = [-Math.sin(h), Math.cos(h)], HALF = 2.2;
    const leaves = [-1, 1].map((s) => {
      const g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.BoxGeometry(HALF - 0.05, 3.4, 0.1), new THREE.MeshLambertMaterial({ color: 0x3e4148 }));
      m.position.set(-s * (HALF / 2), 1.7, 0);
      g.add(m);
      for (let i = 1; i < 4; i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.5, 0.16), new THREE.MeshLambertMaterial({ color: 0x5a5e66 })); bar.position.set(-s * (i * HALF) / 4, 1.75, 0); g.add(bar); }
      g.position.set(GATE_MID.x + perp[0] * HALF * s, GATE_MID.y, GATE_MID.z + perp[1] * HALF * s);
      k.group.add(g);
      return { g, s };
    });
    /** Opens the leaves outward by f, from 0 shut to 1 swung back. */
    const swing = (f: number): void => { for (const { g, s } of leaves) g.rotation.y = -(h - Math.PI / 2) + s * f * 1.4; };
    swing(0);
    const ahead = (d: number, side = 0): Spot => { const x = GATE_MID.x + Math.cos(h) * d + perp[0] * side, z = GATE_MID.z + Math.sin(h) * d + perp[1] * side; return at(x, gy(x, z, GATE_MID.y + 2), z, h); };
    const S_OPEN = ahead(1.2, 3.4);
    const OUT_V = ahead(4.0), OUT_C = ahead(2.3), BACK_IN = ahead(-2.4);
    // just short of the road's ring, where the traffic turns
    const BW = facing(ahead(5.8, 0.4), GATE_MID.x, GATE_MID.z);
    const OPEN0 = 3, OPEN1 = 5, FILE0 = 5.5, STOP = 9.5, TURN = 12, FILE1 = 13, SHUT0 = 17, SHUT1 = 19, BW_LAND = 9;
    const gate = (tb: number): number => ease(span(tb, OPEN0, OPEN1)) * (1 - ease(span(tb, SHUT0, SHUT1)));
    const tiptoe = (u: number): Partial<Pose> => ({ ...walk(u), crouch: 0.25, lean: 0.25, armL: 0.9, armR: 0.9, elbowL: 1.6, elbowR: 1.6, spreadL: 0.4, spreadR: 0.4 });
    book.stories.push({
      id: 'breakout', name: "Arkham's Night Out", cast: ['hugoStrange', 'ventriloquist', 'calendarMan', 'batwoman', GUARD_ID], holds: ['gate'], weight: 1,
      marks: { hugoStrange: 'post', ventriloquist: 'post', calendarMan: BACK_IN, batwoman: 'post', [GUARD_ID]: 'post' }, body: 22,
      may: (w) => w.night() > 0.5,
      play(tb, P) {
        const st = P.from('hugoStrange'), toGate = walkLeg(st, S_OPEN, 1.6), back = walkLeg(facing(S_OPEN, st.x, st.z), at(st.x, st.y, st.z, st.h), 1.6);
        if (tb < toGate.dur) P.put('hugoStrange', toGate.at(tb));
        else if (tb < SHUT1) P.put('hugoStrange', still(facing(S_OPEN, GATE_MID.x, GATE_MID.z), (tb > OPEN0 && tb < OPEN1) || (tb > SHUT0) ? { armR: 1.4, elbowR: 0.4 } : tb > TURN && tb < SHUT0 ? shrug(span(tb, TURN, SHUT0)) : {}));
        else P.put('hugoStrange', back.at(Math.min(back.dur, tb - SHUT1)));
        // the two file out on tiptoe, stop, turn as one and file back in
        const file = (id: string, from: Spot, to: Spot, delay: number): void => {
          const out = walkLeg(from, to, 1.0, tiptoe), inn = walkLeg(at(to.x, to.y, to.z, h + Math.PI), at(from.x, from.y, from.z, h + Math.PI), 1.3, tiptoe);
          let s: State;
          if (tb < FILE0 + delay) s = hidden(from);
          else if (tb < FILE0 + delay + out.dur) s = grounded(out.at(tb - FILE0 - delay));
          else if (tb < TURN) s = still(to, tb > STOP ? { lean: -0.2, armL: 0.5, armR: 0.5, spreadL: 0.5, spreadR: 0.5 } : {}, { hold: id === 'ventriloquist' ? 1 : 0 });
          else if (tb < FILE1) s = still(at(to.x, to.y, to.z, turnTo(h, h + Math.PI, span(tb, TURN, FILE1))), {});
          else if (tb < FILE1 + inn.dur) s = grounded(inn.at(tb - FILE1));
          else s = hidden(from);
          P.put(id, s);
        };
        file('ventriloquist', GATE_IN, OUT_V, 0);
        file('calendarMan', BACK_IN, OUT_C, 0.9);
        // the guard looks the other way
        const gd = P.from(GUARD_ID);
        P.put(GUARD_ID, still(at(gd.x, gd.y, gd.z, gd.h + Math.PI * ease(span(tb, 4, 5)) * (1 - ease(span(tb, 18, 19)))), { head: 0.4 * Math.sin(tb * 0.7) }));
        // Batwoman: on the road before them, arms folded
        const home = P.from('batwoman'), g = glowB(), leg = lineLeg(W.solid, home, BW), t0 = BW_LAND - leg.dur;
        if (tb < t0) P.put('batwoman', still(home, {}, g));
        else if (tb < BW_LAND) P.put('batwoman', { ...leg.at(tb - t0), ...g });
        else P.put('batwoman', still(BW, { ...hang(0), head: 0.1 * Math.sin(tb) }, { cape: 0.3, ...g }));
      },
      props(tb) { swing(gate(tb)); },
      end() { swing(0); },
    });
  }

  // ================================================================== 8. The Demon's Heir
  // Ra's al Ghul's duel (wider cast, section 2: the comics' famous one is Batman's own, with Ra's in the desert of
  // Batman 244, 1972; here Batman carries no sword, so it is Damian, Ra's's grandson since Batman and Son, 2006, who
  // crosses swords with him). Three passes on the Highway's court, never nearer than two blades' reach, turned about
  // between them; the League on the ledge rise to their feet; Talia lifts her hand and both stop; Ra's salutes,
  // Damian bows; Batman, among the assassins on the ledge, has not moved.
  {
    const MID = { x: (DUEL_A.x + DUEL_B.x) / 2, z: (DUEL_A.z + DUEL_B.z) / 2 }, R = Math.hypot(DUEL_A.x - MID.x, DUEL_A.z - MID.z);
    const side = (a: number, who: 0 | 1): Spot => { const ang = a + (who ? Math.PI : 0), x = MID.x + Math.cos(ang) * R, z = MID.z + Math.sin(ang) * R; return at(x, gy(x, z, 2), z, toward(x, z, MID.x, MID.z)); };
    const A0 = Math.atan2(DUEL_A.z - MID.z, DUEL_A.x - MID.x);
    const LEDGE = at((ASSASSINS[1].x + ASSASSINS[2].x) / 2, ASSASSINS[1].y, ASSASSINS[1].z, S);
    const D_LAND = 3, P1 = 4, P2 = 7.5, TURN1 = 10, P3 = 11.5, RISE = 8, STOP = 14.5, SALUTE = 15.5, BODY = 21;
    const passAt = (tb: number): number => (tb < TURN1 ? 0 : Math.PI * ease(span(tb, TURN1, P3)));
    book.stories.push({
      id: 'duel', name: "the Demon's Heir", cast: ['ras', 'damian', 'talia', 'batman', ...ASSASSIN_IDS], holds: ['highway'], weight: 1,
      marks: { ras: 'post', damian: 'post', talia: 'post', batman: 'post', ...Object.fromEntries(ASSASSIN_IDS.map((id) => [id, 'post' as const])) }, body: BODY,
      play(tb, P) {
        const a = A0 + passAt(tb), ra = side(a, 0), da = side(a, 1);
        // Ra's: to his mark, three passes, a salute, and back to his place
        const rasHome = P.from('ras'), rTo = walkLeg(rasHome, side(A0, 0), 1.6), rBack = walkLeg(facing(side(A0 + Math.PI, 0), rasHome.x, rasHome.z), rasHome, 1.6);
        const pass = (t0: number, rasLeads: boolean, who: 0 | 1): Partial<Pose> => ((who === 0) === rasLeads ? lunge(span(tb, t0, t0 + 2.2)) : parry(span(tb, t0, t0 + 2.2)));
        const duelPose = (who: 0 | 1): Partial<Pose> => (tb < P2 ? pass(P1, true, who) : tb < TURN1 ? pass(P2, false, who) : tb < P3 ? parry(0) : tb < STOP ? pass(P3, true, who) : {});
        if (tb < rTo.dur) P.put('ras', { ...rTo.at(tb), hold: 0 });
        else if (tb < SALUTE) P.put('ras', still(ra, tb < P1 ? parry(0) : duelPose(0), { hold: 1, cape: 0.3 }));
        else if (tb < SALUTE + 2) P.put('ras', still(ra, salute(span(tb, SALUTE, SALUTE + 2)), { hold: 1 }));
        else P.put('ras', tb < SALUTE + 2 + rBack.dur ? rBack.at(tb - SALUTE - 2) : still(rasHome, hang(0)));
        // Damian: in on his line, three passes, a bow
        const dHome = P.from('damian'), g = glowB(), leg = lineLeg(W.solid, dHome, side(A0, 1)), t0 = D_LAND - leg.dur;
        if (tb < t0) P.put('damian', still(dHome, idle(0), g));
        else if (tb < D_LAND) P.put('damian', { ...leg.at(tb - t0), ...g });
        else if (tb < SALUTE) P.put('damian', still(da, tb < P1 ? parry(0) : duelPose(1), { hold: 1, ...g }));
        else if (tb < SALUTE + 3) P.put('damian', still(da, tb < SALUTE + 2.2 ? bow(span(tb, SALUTE, SALUTE + 2.2)) : {}, { hold: tb < SALUTE + 2.4 ? 1 : 0, ...g }));
        else P.put('damian', away(da, SALUTE + 3, tb));
        // Talia lifts her hand
        const ta = P.from('talia');
        P.put('talia', still(facing(ta, MID.x, MID.z), tb > STOP - 1 && tb < SALUTE + 2 ? { armR: 2.6, elbowR: 0.2, spreadR: 0.2 } : idle((tb * 0.06) % 1)));
        // the League rise to their feet on the ledge, and kneel again
        ASSASSIN_IDS.forEach((id, i) => {
          const p = P.from(id), up = ease(span(tb, RISE + i * 0.2, RISE + 0.8 + i * 0.2)) * (1 - ease(span(tb, SALUTE + 2, SALUTE + 3)));
          P.put(id, still(facing(p, MID.x, MID.z), blend(kneel(1), {}, up)));
        });
        // Batman, on the ledge among them: in while they fight, unmoving, and away when it is done
        const bHome = P.from('batman'), bleg = lineLeg(W.solid, bHome, LEDGE), b0 = 9 - bleg.dur;
        if (tb < b0) P.put('batman', still(bHome, perch((tb * 0.05) % 1), { cape: 0.1, ...g }));
        else if (tb < 9) P.put('batman', { ...bleg.at(tb - b0), ...g });
        else if (tb < SALUTE + 3.6) P.put('batman', still(facing(LEDGE, MID.x, MID.z), { nod: 0.3 }, { cape: 0.15, ...g }));
        else P.put('batman', away(facing(LEDGE, MID.x, MID.z), SALUTE + 3.6, tb));
      },
    });
  }

  // ================================================================== 9. Man-Bat over the Clock Tower
  // Det. 400 (1970), Kirk Langstrom's serum and its cure [wp Man-Bat; rogues note, story 12, where Batman holds up the
  // vial: so Batman here, not Batgirl]. By night Man-Bat drops from the belfry's eaves, opens his wings and flies a
  // round over Lower Gotham and the Gazette's roof, shrieking (rings spread from him); Vicki Vale's camera flashes at
  // him from the Gazette's door; Batman lands on the belfry's ledge holding up a vial; Man-Bat comes back to the
  // ledge, folds his wings, shrinks, and it is Langstrom who kneels there.
  {
    const C = { x: -74, z: 98 }, RAD = 10;
    let FLY_Y = 0;
    for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU; for (const dr of [-2, 0, 2]) FLY_Y = Math.max(FLY_Y, W.solid.top(C.x + Math.cos(a) * (RAD + dr), C.z + Math.sin(a) * (RAD + dr))); }
    FLY_Y = Math.min(38, Math.max(30, FLY_Y + 9));
    const LAND = spot(BELFRY.x + Math.cos(BELFRY.h + Math.PI / 2) * 1.5, BELFRY.z + Math.sin(BELFRY.h + Math.PI / 2) * 1.5, BELFRY.h, BELFRY.y + 1);
    const landOk = Math.abs(LAND.y - BELFRY.y) < 0.2;
    const M_LAND = landOk ? LAND : at(BELFRY.x - 0.6, BELFRY.y, BELFRY.z - 1.3, BELFRY.h);
    const startA = Math.atan2(EAVES.z - C.z, EAVES.x - C.x);
    const PATH = curveOf([
      [HANGING.x, HANGING.y, HANGING.z], [lerp(HANGING.x, C.x, 0.35), FLY_Y + 6, lerp(HANGING.z, C.z, 0.35)],
      ...[0.25, 0.5, 0.75, 1, 1.25].map((f): V3 => [C.x + Math.cos(startA + f * TAU) * RAD, FLY_Y, C.z + Math.sin(startA + f * TAU) * RAD]),
      [lerp(C.x, M_LAND.x, 0.6), FLY_Y + 6, lerp(C.z, M_LAND.z, 0.6)], [M_LAND.x, M_LAND.y + 1.5, M_LAND.z], [M_LAND.x, M_LAND.y, M_LAND.z],
    ]);
    const DROP = 2, BACK = 20, FOLD = BACK + 1.2, CHANGE = FOLD + 1.6, BAT_LAND = 15.5, BODY = CHANGE + 5;
    const flyAt = (tb: number): State => {
      const u = span(tb, DROP, BACK), q = PATH.at(PATH.len * (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u)));
      const landing = u > 0.92;
      return still(at(q.p[0], q.p[1], q.p[2], landing ? M_LAND.h : q.h), landing ? leap(0.8) : glide((tb * 0.8) % 1), { aloft: u < 0.995, cape: 1, spread: landing ? 0.6 : 1, pitch: landing ? 0 : 0.6, glow: 1 });
    };
    let mb: State = still(HANGING);
    book.stories.push({
      id: 'manbat', name: 'Man-Bat over the Clock Tower', cast: ['manBat', 'langstrom', 'batman', 'vicki'], holds: ['belfry', 'sky'], weight: 1,
      marks: { manBat: 'post', langstrom: M_LAND, batman: 'post', vicki: 'post' }, body: BODY,
      may: (w) => w.night() > 0.5,
      play(tb, P) {
        if (tb < DROP) mb = still(HANGING, hang(0), { pitch: Math.PI, aloft: true, glow: 1 });
        else if (tb < BACK) mb = flyAt(tb);
        else if (tb < CHANGE) mb = still(M_LAND, { crouch: 0.4 * span(tb, FOLD, CHANGE), nod: 0.3 }, { cape: 1 - span(tb, BACK, FOLD), spread: 1 - span(tb, BACK, FOLD), size: 1 - 0.3 * span(tb, FOLD, CHANGE), glow: 1 });
        else mb = hidden(M_LAND);
        P.put('manBat', mb);
        P.put('langstrom', tb < CHANGE ? hidden(M_LAND) : still(facing(M_LAND, BELFRY.x, BELFRY.z), kneel(1)));
        // Batman: lands on the ledge and holds up the vial
        const home = P.from('batman'), g = glowB(), leg = lineLeg(W.solid, home, BELFRY), t0 = BAT_LAND - leg.dur;
        if (tb < t0) P.put('batman', still(home, perch((tb * 0.05) % 1), { cape: 0.1, ...g }));
        else if (tb < BAT_LAND) P.put('batman', { ...leg.at(tb - t0), ...g });
        else if (tb < CHANGE + 3) P.put('batman', still(facing(BELFRY, tb < BACK ? mb.x : M_LAND.x, tb < BACK ? mb.z : M_LAND.z), tb < CHANGE + 1 ? { armR: 2.2, elbowR: 0.5, spreadR: 0.1 } : { armR: 0.6, elbowR: 0.3, nod: 0.3 }, g));
        else P.put('batman', away(facing(BELFRY, M_LAND.x, M_LAND.z), CHANGE + 3, tb));
        // Vicki Vale: her camera up at him
        const v = P.from('vicki');
        P.put('vicki', still(facing(v, mb.x, mb.z), tb > 5 && tb < 15 ? { armL: 1.4, armR: 1.4, elbowL: 1.6, elbowR: 1.6, nod: -0.4 } : idle(0), { hold: 1 }));
      },
      props(tb) {
        // shrieks: rings spread from him
        for (let i = 0; i < 2; i++) { const t0 = 6 + i * 6, u = span(tb, t0, t0 + 1.6); W.rings.set(i, [mb.x, mb.y + 1.5, mb.z], 0.5 + 5 * u, u > 0 && u < 1 ? 0.6 * (1 - u) : 0, 0xe0d0ff); }
        // Vicki's flashes, and the vial
        const v = VICKI;
        if ((tb > 8 && tb < 8.15) || (tb > 12.5 && tb < 12.65)) W.glints.speck([v.x, v.y + 2.0, v.z - 0.3], 0.6, 0xffffff);
        if (tb > BAT_LAND && tb < CHANGE + 1) W.glints.speck([BELFRY.x + Math.cos(BELFRY.h) * 0.3, BELFRY.y + 3.0, BELFRY.z + Math.sin(BELFRY.h) * 0.3], 0.22, 0x50ff70);
      },
      end() { W.rings.set(0, [0, 0, 0], 1, 0); W.rings.set(1, [0, 0, 0], 1, 0); },
    });
  }

  // ================================================================== 10. The Race across the Roofs
  // The Robins' rooftop races are the wider cast's (section 1, their stories) [tile]: Nightwing, the Red Hood, Spoiler
  // and Orphan, from Otisburg's roofs over the lane to the three tenements' roofs and along them, each by their own
  // way, to tenement-3's roof. Orphan first without seeming to hurry, Nightwing second with his arms up, the Red Hood
  // last, and he sits down on the parapet.
  {
    const racers = ['orphan', 'nightwing', 'spoiler', 'redHood'] as const;
    const LANE = [-1.9, -3.0, -4.1, -5.2];
    const ROOF = [ROOF1, ROOF2, ROOF3];
    const XS = [[36, 46, 55.2], [37.4, 47.4, 56.6], [38.8, 48.8, 58], [40.2, 50.2, 59.2]];
    const START: Spot[] = [spot(OTIS2.x, OTIS2.z, S, OTIS2.y + 1), spot(OTIS1.x - 3, OTIS1.z, S, OTIS1.y + 1), spot(OTIS1.x, OTIS1.z, S, OTIS1.y + 1), spot(OTIS2.x - 3, OTIS2.z, S, OTIS2.y + 1)];
    const DELAY = [[0.9, 0.2, 0.1], [0.2, 0.5, 0.4], [0, 0.9, 0.9], [0, 1.3, 1.4]];
    const plans = racers.map((_, i) => {
      const pts = [0, 1, 2].map((r) => spot(XS[i][r], LANE[i], E, ROOF[r].y + 2));
      const legs: Track[] = [];
      let from = START[i];
      pts.forEach((p, r) => { legs.push(wait(from, DELAY[i][r], () => ({ crouch: 0.3, lean: 0.4 }))); legs.push(lineLeg(W.solid, from, p)); from = p; });
      const fin = facing(pts[2], pts[2].x + 2, pts[2].z + 3);
      return { s: seq(legs), fin, pts };
    });
    const ENDS = plans.map((p) => 1 + p.s.dur);
    const BODY = Math.max(...ENDS) + 5;
    book.stories.push({
      id: 'race', name: 'the Race across the Roofs', cast: [...racers], holds: ['eastRoofs'], weight: 1,
      marks: Object.fromEntries(racers.map((id, i) => [id, START[i]])), body: BODY,
      play(tb, P) {
        racers.forEach((id, i) => {
          const { s, fin } = plans[i], t = tb - 1, g = glowB();
          let st: State;
          if (t < 0) st = still(START[i], { crouch: 0.3, lean: 0.4 }, g);
          else if (t < s.dur) {
            st = { ...s.at(t), ...g };
            // Nightwing flips over the second gap
            if (id === 'nightwing' && t > s.t[3] && t < s.t[4]) { const u = span(t, s.t[3], s.t[4]); st = { ...st, pitch: -TAU * ease(span(u, 0.2, 0.8)) }; }
          } else {
            const after = t - s.dur;
            const pose: Partial<Pose> = id === 'nightwing' ? (after < 3 ? { armL: 2.9, armR: 2.9, spreadL: 0.4, spreadR: 0.4 } : {}) : id === 'redHood' ? sit(span(after, 0, 0.6)) : id === 'orphan' ? { head: 0.3 } : { armR: 1.3, elbowR: 2.2 };
            st = still(fin, pose, { ...g, aloft: id === 'redHood' && after > 0.2 });
            if (id === 'redHood') st = { ...st, y: fin.y + 0.35 * span(after, 0, 0.6) - 0.35 };
          }
          P.put(id, st);
        });
      },
    });
  }

  // ================================================================== 11. The Lamp on Park Row
  // Crime Alley, where Leslie Thompkins keeps her clinic (Det. 457, 1976) [wp Leslie Thompkins; city note on Park Row],
  // shown without what happened there. By night the court's one lamp flickers (the built lamp cannot be put out, so it
  // flickers); Nightwing drops in, shins up it and mends it; Leslie comes out to the court and nods to him; the Red
  // Hood on his tyres claps twice, slowly.
  {
    const POLE = ALLEY_LAMP, NW = spot(POLE.x - 1.3, POLE.z + 0.9, N, 2), UPY = 2.3;
    const CL = { x: POLE.x - 0.45, z: POLE.z + 0.2 };
    const LES_OUT = spot(CLINIC_DOOR.x + 1.4, CLINIC_DOOR.z, E, 2), LES_ROUND = spot(CLINIC_DOOR.x + 1.4, POLE.z + 2.8, S, 2), LES_COURT = facing(spot(POLE.x + 0.3, POLE.z + 2.4, N, 2), NW.x, NW.z);
    const lTo = seq([walkLeg(at(CLINIC_DOOR.x, CLINIC_DOOR.y, CLINIC_DOOR.z, E), LES_OUT, 1.6), walkLeg(LES_OUT, at(LES_OUT.x, LES_OUT.y, POLE.z - 1.4, S), 1.6), walkLeg(at(LES_OUT.x, LES_OUT.y, POLE.z - 1.4, S), LES_ROUND, 1.6), walkLeg(LES_ROUND, LES_COURT, 1.6)]);
    const lBack = seq([walkLeg(facing(LES_COURT, LES_ROUND.x, LES_ROUND.z), LES_ROUND, 1.6), walkLeg(LES_ROUND, at(LES_OUT.x, LES_OUT.y, POLE.z - 1.4, N), 1.6), walkLeg(at(LES_OUT.x, LES_OUT.y, POLE.z - 1.4, N), at(LES_OUT.x, LES_OUT.y, LES_OUT.z, WEST), 1.6), walkLeg(at(LES_OUT.x, LES_OUT.y, LES_OUT.z, WEST), at(CLINIC_DOOR.x, CLINIC_DOOR.y, CLINIC_DOOR.z, WEST), 1.6)]);
    const NW_IN = 3, UP0 = 4.4, UP1 = 6.4, FIX = 9.4, DOWN = 10.6, LES0 = 9, CLAP = 15, LBACK = 19.5, BODY = LBACK + lBack.dur + 1;
    book.stories.push({
      id: 'lamp', name: 'the Lamp on Park Row', cast: ['nightwing', 'leslie', 'redHood'], holds: ['alley'], weight: 1,
      marks: { nightwing: 'post', leslie: 'post', redHood: 'post' }, body: BODY,
      may: (w) => w.night() > 0.5,
      play(tb, P) {
        const home = P.from('nightwing'), g = glowB(), leg = lineLeg(W.solid, home, NW), t0 = NW_IN - leg.dur;
        if (tb < t0) P.put('nightwing', still(home, perch(0), g));
        else if (tb < NW_IN) P.put('nightwing', { ...leg.at(tb - t0), ...g });
        else if (tb < UP0) { const u = span(tb, NW_IN, UP0); P.put('nightwing', still(at(lerp(NW.x, CL.x, u), NW.y, lerp(NW.z, CL.z, u), toward(NW.x, NW.z, POLE.x, POLE.z)), walk(u), g)); }
        else if (tb < UP1) P.put('nightwing', still(at(CL.x, POLE.y + UPY * ease(span(tb, UP0, UP1)), CL.z, toward(CL.x, CL.z, POLE.x, POLE.z)), climb((tb * 1.2) % 1), { aloft: true, ...g }));
        else if (tb < FIX) P.put('nightwing', still(at(CL.x, POLE.y + UPY, CL.z, toward(CL.x, CL.z, POLE.x, POLE.z)), { armL: 2.8, armR: 2.6 + 0.3 * Math.sin(tb * 6), elbowR: 0.6, hipL: 0.5, kneeL: 0.8 }, { aloft: true, ...g }));
        else if (tb < DOWN) P.put('nightwing', still(at(CL.x, POLE.y + UPY * (1 - ease(span(tb, FIX, DOWN))), CL.z, toward(CL.x, CL.z, POLE.x, POLE.z)), climb(0), { aloft: true, ...g }));
        else P.put('nightwing', still(facing(at(CL.x, POLE.y, CL.z, 0), LES_COURT.x, LES_COURT.z), tb > LES0 + lTo.dur + 0.5 && tb < LES0 + lTo.dur + 2 ? { nod: 0.4 } : {}, g));
        const lp = P.from('leslie');
        if (tb < LES0) P.put('leslie', still(lp, idle(0)));
        else if (tb < LES0 + lTo.dur) P.put('leslie', lTo.at(tb - LES0));
        else if (tb < LBACK) P.put('leslie', still(LES_COURT, tb < LES0 + lTo.dur + 1.6 ? { nod: 0.4 * Math.sin(Math.PI * span(tb, LES0 + lTo.dur, LES0 + lTo.dur + 1.6)) } : { armL: 0.5, elbowL: 1.6, armR: 0.5, elbowR: 1.6 }));
        else if (tb < LBACK + lBack.dur) P.put('leslie', lBack.at(tb - LBACK));
        else P.put('leslie', hidden(CLINIC_DOOR));
        const rh = P.from('redHood'), clap = tb > CLAP && tb < CLAP + 2.6 ? Math.abs(Math.sin(((tb - CLAP) / 2.6) * TAU)) : 0;
        P.put('redHood', still(facing(rh, POLE.x, POLE.z), clap > 0 || (tb > CLAP && tb < CLAP + 2.6) ? { armL: 1.2, armR: 1.2, spreadL: 0.6 - 0.6 * clap, spreadR: 0.6 - 0.6 * clap, elbowL: 0.4, elbowR: 0.4, head: 0.2 } : { ...hang(0), head: 0.3 }));
      },
      props(tb) {
        const head: V3 = [POLE.x, POLE.y + 4.4, POLE.z];
        const flick = tb < FIX ? (Math.sin(tb * 23) * Math.sin(tb * 7.3) > 0.2 ? 1 : 0.15) : 1;
        W.glints.speck(head, 0.45, dim(0xffd890, flick));
        W.rings.set(7, [POLE.x, 0.07, POLE.z], 3.5, tb < FIX ? 0.25 * flick : 0.3, 0xffd890);
      },
      end() { W.rings.set(7, [0, 0, 0], 1, 0); },
    });
  }

  // ================================================================== 12. Clayface at the Pictures
  // Det. 40 (1940): Basil Karlo, the actor, and Matt Hagen after him [wp Clayface; rogues note, story A]. The statue on
  // the cinema's plinth steps down, swells, and plays to the people before the cinema: a bow, an arm flung out, a hand
  // on his heart; one claps and one runs; Batwoman lands; he sinks into a puddle that runs to the grate and is gone in
  // a puff of steam; when it clears he is a statue on his plinth again.
  {
    const C1 = spot(PLINTH.x + 1.0, PLINTH.z + 1.2, S, 2), GRATE: V3 = [58, gy(58, 11.5, 2), 11.5];
    const AUD = CIT.map((id, i) => ({ id, at: facing(spot(C1.x + 3.6 + i * 1.6, C1.z + 0.2 - i * 1.2, WEST, 2), C1.x, C1.z), from: spot(66, 12.6 - i * 1.4, WEST, 2) }));
    const BW = facing(spot(C1.x - 3.4, C1.z + 0.6, E, 2), C1.x, C1.z);
    const DOWN0 = 1, DOWN1 = 2.2, SWELL = 3.4, ACT = 4.4, BW_LAND = 13, SINK0 = 14.5, SINK1 = 16, RUN1 = 17.2, BACK = 20.5, BODY = 25;
    const act = (t: number): Partial<Pose> => (t < 2 ? bow(t / 2) : t < 4.5 ? { armR: 1.6, spreadR: 1.3, elbowR: 0.1, armL: 0.3, lean: -0.15, head: 0.6 } : t < 7 ? { armR: 0.9, elbowR: 2.1, spreadR: -0.5, nod: 0.2, head: -0.3 } : bow(clamp((t - 7) / 2)));
    let cl: State = still(PLINTH);
    book.stories.push({
      id: 'clay', name: 'Clayface at the Pictures', cast: ['clayface', 'batwoman', ...CIT], holds: ['cinemaSteps'], weight: 1,
      marks: { clayface: 'post', batwoman: 'post', [CIT[0]]: AUD[0].from, [CIT[1]]: AUD[1].from }, body: BODY,
      play(tb, P) {
        const post = P.from('clayface');
        if (tb < DOWN0) cl = still(post, statue(tb));
        else if (tb < DOWN1) { const u = span(tb, DOWN0, DOWN1); cl = still(at(lerp(post.x, C1.x, u), lerp(post.y, C1.y, u) + 0.4 * Math.sin(Math.PI * u), lerp(post.z, C1.z, u), S), walk(u), { aloft: u > 0.05 && u < 0.95 }); }
        else if (tb < SINK0) cl = still(facing(C1, AUD[0].at.x, AUD[0].at.z), tb < ACT ? {} : act(tb - ACT), { size: 1 + 0.25 * ease(span(tb, DOWN1, SWELL)) });
        else if (tb < SINK1) cl = still(C1, { crouch: span(tb, SINK0, SINK1) }, { size: lerp(1.25, 0.15, ease(span(tb, SINK0, SINK1))) });
        else if (tb < RUN1) { const u = span(tb, SINK1, RUN1); cl = still(at(lerp(C1.x, GRATE[0], u), GRATE[1], lerp(C1.z, GRATE[2], u), toward(C1.x, C1.z, GRATE[0], GRATE[2])), { crouch: 1 }, { size: 0.15 }); }
        else if (tb < BACK) cl = hidden(post);
        else cl = still(post, statue(tb));
        P.put('clayface', cl);
        // the audience: walk up, one claps, one runs
        AUD.forEach((a, i) => {
          const up = walkLeg(a.from, a.at, 1.8), away = walkLeg(facing(a.at, 70, a.at.z), at(70, a.at.y, a.at.z, E), RUN);
          let s: State;
          if (tb < up.dur) s = up.at(tb);
          else if (i === 1 && tb > ACT + 4.5) s = tb < ACT + 4.5 + away.dur ? grounded(away.at(tb - ACT - 4.5)) : hidden(a.from);
          else if (i === 0 && tb > BACK + 2) { const off = walkLeg(facing(a.at, a.from.x, a.from.z), a.from, 1.8); s = tb < BACK + 2 + off.dur ? off.at(tb - BACK - 2) : hidden(a.from); }
          else s = still(a.at, i === 0 && tb > ACT + 2 && tb < ACT + 6 ? { armL: 1.3, armR: 1.3, spreadL: 0.3 - 0.3 * Math.abs(Math.sin(tb * 9)), spreadR: 0.3 - 0.3 * Math.abs(Math.sin(tb * 9)), elbowL: 0.8, elbowR: 0.8 } : i === 1 && tb > ACT + 3 ? { lean: -0.25, armL: 0.6, armR: 0.6, elbowL: 1.8, elbowR: 1.8 } : {});
          P.put(a.id, s);
        });
        // Batwoman
        const home = P.from('batwoman'), g = glowB(), leg = lineLeg(W.solid, home, BW), t0 = BW_LAND - leg.dur;
        if (tb < t0) P.put('batwoman', still(home, {}, g));
        else if (tb < BW_LAND) P.put('batwoman', { ...leg.at(tb - t0), ...g });
        else P.put('batwoman', still(facing(BW, tb < BACK ? cl.x : PLINTH.x, tb < BACK ? cl.z : PLINTH.z), tb > BACK + 1 && tb < BACK + 3.5 ? shrug(span(tb, BACK + 1, BACK + 3.5)) : { ...hang(0) }, { cape: 0.25, ...g }));
      },
      props(tb) { W.air?.burst(GRATE[0], GRATE[1] + 0.3, GRATE[2], ease(span(tb, RUN1 - 0.3, RUN1 + 0.3)) * (1 - ease(span(tb, BACK - 1.5, BACK + 0.5)))); },
      end() { W.air?.burst(GRATE[0], GRATE[1] + 0.3, GRATE[2], 0); },
    });
  }

  // ================================================================== 13. Firefly and the Fire House
  // Garfield Lynns (Det. 184, 1952; the winged suit after 1986) [wider cast, section 4], with nothing burning: he
  // hovers before the fire house on his jet, circling its hose tower; its bell rings; two firemen run a hose out of
  // the bay and a jet of water arcs up to him; his flame goes out, he comes down in a slow spiral onto the hose tower,
  // and sits there dripping while the firemen roll the hose up.
  {
    // he circles high over the hose tower, round a middle a little west of it, so that he stays 3 inside the board's edge
    const HT = HOSE_TOWER, HOVER_Y = HT.y + 9.5, RAD = 2.5, HC = { x: Math.min(HT.x, 101 - RAD), z: HT.z };
    const MEN = FIREMEN.map((id, i) => ({ id, at: facing(spot(FIRE_DOOR.x - 2.4, FIRE_DOOR.z + 0.9 - i * 1.8, WEST, 2), HT.x, HT.z) }));
    const LIFT = 2, CIRC1 = 12.5, OUT = 11, LAND = 16.5, ROLL0 = 18, IN = 21, BODY = 25;
    const phase0 = Math.atan2(FIREFLY.z - HC.z, FIREFLY.x - HC.x);
    const flyAt = (tb: number, post: Spot): State => {
      if (tb < LIFT) { const u = ease(span(tb, 0.6, LIFT)); const a = phase0, tx = HC.x + Math.cos(a) * RAD, tz = HC.z + Math.sin(a) * RAD; return still(at(lerp(post.x, tx, u), lerp(post.y, HOVER_Y, u), lerp(post.z, tz, u), a + Math.PI / 2), {}, { aloft: u > 0.02, glow: 1 }); }
      if (tb < CIRC1) { const a = phase0 + TAU * 1.25 * span(tb, LIFT, CIRC1); return still(at(HC.x + Math.cos(a) * RAD, HOVER_Y + 0.4 * Math.sin(tb * 2), HC.z + Math.sin(a) * RAD, a + Math.PI / 2), { lean: 0.2, armL: 0.3, armR: 0.3, spreadL: 0.5, spreadR: 0.5 }, { aloft: true, glow: tb < OUT ? 1 : 0.2 }); }
      if (tb < LAND) {
        const u = span(tb, CIRC1, LAND), a = phase0 + TAU * 1.25 + TAU * 0.75 * u, r = RAD * (1 - ease(u));
        return still(at(lerp(HC.x, HT.x, ease(u)) + Math.cos(a) * r, lerp(HOVER_Y, HT.y, ease(u)), lerp(HC.z, HT.z, ease(u)) + Math.sin(a) * r, a + Math.PI / 2), { armL: 0.6, armR: 0.6, spreadL: 0.8, spreadR: 0.8 }, { aloft: u < 0.99, glow: 0.1 });
      }
      return still(at(HT.x, HT.y, HT.z, TO_VIEW), sit(1), { glow: 0.1 });
    };
    let ff: State = still(FIREFLY);
    const HOSE_FROM: V3 = [FIRE_DOOR.x + 0.4, 0.1, FIRE_DOOR.z];
    book.stories.push({
      id: 'fire', name: 'Firefly and the Fire House', cast: ['firefly', ...FIREMEN], holds: ['fireHouse'], weight: 1,
      marks: { firefly: 'post', [FIREMEN[0]]: FIRE_DOOR, [FIREMEN[1]]: FIRE_DOOR }, body: BODY,
      play(tb, P) {
        ff = flyAt(tb, P.from('firefly'));
        P.put('firefly', ff);
        MEN.forEach((m, i) => {
          const outL = walkLeg(at(FIRE_DOOR.x, FIRE_DOOR.y, FIRE_DOOR.z + (i ? -0.9 : 0.9), WEST), m.at, RUN), inL = walkLeg(facing(m.at, FIRE_DOOR.x, FIRE_DOOR.z), at(FIRE_DOOR.x, FIRE_DOOR.y, FIRE_DOOR.z + (i ? -0.9 : 0.9), E), 1.8);
          const t0 = 4 + i * 0.5;
          let s: State;
          if (tb < t0) s = hidden(FIRE_DOOR);
          else if (tb < t0 + outL.dur) s = outL.at(tb - t0);
          else if (tb < IN + i * 0.5) s = still(facing(m.at, ff.x, ff.z), tb < ROLL0 ? { armL: 1.6, armR: 1.4, elbowL: 0.4, elbowR: 0.6, nod: -0.5 } : { lean: 0.5, armL: 1.0, armR: 1.0, elbowL: 0.8, elbowR: 0.8, crouch: 0.3 });
          else if (tb < IN + i * 0.5 + inL.dur) s = inL.at(tb - IN - i * 0.5);
          else s = hidden(FIRE_DOOR);
          P.put(m.id, s);
        });
      },
      props(tb) {
        // his jet's flame, while it burns
        if (tb > 0.4 && tb < OUT) for (let i = 0; i < 3; i++) W.glints.speck([ff.x, ff.y + 0.9 - i * 0.35 - ((tb * 3 + i * 0.3) % 1) * 0.3, ff.z], 0.28 - i * 0.06, [0xffe080, 0xffa040, 0xff6020][i]);
        // the bell on the fire house's front, swinging, and its rings
        if (tb > 3 && tb < 9.5) {
          const sw = Math.sin(tb * 12) * 0.25, bx = FIRE_DOOR.x - 0.1, by = 6.4, bz = FIRE_DOOR.z + 2.4;
          W.glints.speck([bx, by + sw * 0.2, bz + sw], 0.32, 0xffd040);
          const u = (tb * 1.2) % 1;
          W.rings.set(6, [bx - 1.2, 0.08, bz], 1 + 4 * u, 0.4 * (1 - u), 0xffd060);
        } else W.rings.set(6, [0, 0, 0], 1, 0);
        // the hose along the ground, and its jet arcing up to him
        const hoseOut = tb > 4.5 && tb < IN + 1.5, roll = 1 - span(tb, ROLL0, IN);
        if (hoseOut) MEN.forEach((m) => W.lines.line(HOSE_FROM, [lerp(HOSE_FROM[0], m.at.x, roll), 0.12, lerp(HOSE_FROM[2], m.at.z, roll)], 0.14, 0x9a2a22));
        if (tb > 7 && tb < LAND - 1) {
          const a = handOf(still(MEN[0].at), 1.4, 0.5, 0), b: V3 = [ff.x, ff.y + 1.0, ff.z];
          for (let i = 0; i < 8; i++) {
            const u0 = i / 8, u1 = (i + 1) / 8, y = (u: number): number => lerp(a[1], b[1], u) + 3.5 * Math.sin(Math.PI * u);
            W.glints.line([lerp(a[0], b[0], u0), y(u0), lerp(a[2], b[2], u0)], [lerp(a[0], b[0], u1), y(u1), lerp(a[2], b[2], u1)], 0.16, 0xa8d8ff);
          }
        }
        // dripping, once he sits
        if (tb > LAND) for (let i = 0; i < 3; i++) { const u = (tb * 0.9 + i * 0.33) % 1; W.glints.speck([HT.x + (i - 1) * 0.3, HT.y + 1.0 - u * 1.6, HT.z + 0.4], 0.08, 0xa8d8ff); }
      },
      end() { W.rings.set(6, [0, 0, 0], 1, 0); },
    });
  }

  // ================================================================== 14. Killer Moth at the Light
  // Batman 63 (1951): Drury Walker, the moth who comes to the light, and the moth-signal he answers [wider cast, section
  // 4]. By night he flies from the gasholder to the harbour light at Tricorner's point and round its lantern in
  // swoops, closer each time, on its landward side; Batgirl lands on its gallery; he settles on its rail across from
  // her, they talk, and he flies home.
  {
    const LAN: V3 = [LIGHT.x, LIGHT.y + 2.2, LIGHT.z];
    const swoopPts: V3[] = [[GASHOLDER.x, GASHOLDER.y + 2, GASHOLDER.z], [lerp(GASHOLDER.x, LAN[0], 0.5), LAN[1] + 6, lerp(GASHOLDER.z, LAN[2], 0.5) - 4]];
    for (let i = 0; i < 3; i++) {
      const r = 5 - i * 1.0;
      for (const a of [Math.PI, Math.PI * 1.25, Math.PI * 1.5, Math.PI * 1.75, TAU]) swoopPts.push([LAN[0] + Math.cos(a + (i % 2 ? Math.PI : 0) * 0) * r * (i % 2 ? -1 : 1), LAN[1] + 0.8 * Math.sin(a * 2), Math.min(110, LAN[2] - 1.0 + Math.sin(a) * r)]);
    }
    const PERCH_AT = spot(LIGHT.x + 1.9, LIGHT.z - 0.6, WEST, LIGHT.y + 2);
    const perchOk = Math.abs(PERCH_AT.y - LIGHT.y) < 0.6;
    const MOTH_REST: Spot = perchOk ? PERCH_AT : at(LIGHT.x + 1.9, LIGHT.y + 0.9, LIGHT.z - 0.6, WEST);
    swoopPts.push([MOTH_REST.x + 2, MOTH_REST.y + 2, MOTH_REST.z - 2], [MOTH_REST.x, MOTH_REST.y, MOTH_REST.z]);
    const PATH = curveOf(swoopPts);
    const BG = facing(at(LIGHT.x, LIGHT.y, LIGHT.z, WEST), MOTH_REST.x, MOTH_REST.z);
    const bgIn = launch(LIBRARY_STEPS, BG), bgHome = landing(BG, LIBRARY_STEPS);
    const F1 = 1 + PATH.len / 9, BG_LAND = Math.max(F1 + 0.6, bgIn.dur + 1), TALK = Math.max(F1, BG_LAND) + 1, HOME = TALK + 6, BODY0 = HOME;
    const homeLeg = airLeg(W.solid, MOTH_REST, GASHOLDER, 'wings');
    const BODY = Math.max(BODY0 + homeLeg.dur, BODY0 + 0.5 + bgHome.dur) + 1;
    book.stories.push({
      id: 'moth', name: 'Killer Moth at the Light', cast: ['killerMoth', 'batgirl'], holds: ['harbourLight'], weight: 1,
      marks: { killerMoth: 'post', batgirl: 'post' }, body: BODY,
      may: (w) => w.night() > 0.5,
      play(tb, P) {
        const post = P.from('killerMoth');
        let m: State;
        if (tb < 1) m = still(post, idle(0), { glow: 1 });
        else if (tb < F1) { const q = PATH.at(PATH.len * span(tb, 1, F1)); m = still(at(q.p[0], q.p[1], q.p[2], q.h), fly((tb * 2) % 1), { aloft: true, cape: 1, spread: 1, pitch: 0.9, glow: 1 }); }
        else if (tb < HOME) m = still(facing(MOTH_REST, BG.x, BG.z), tb > TALK && tb < TALK + 2.5 ? point(span(tb, TALK, TALK + 2.5)) : tb > TALK + 3 && tb < HOME ? shrug(span(tb, TALK + 3, HOME)) : perch(0), { aloft: !perchOk, glow: 1, spread: 0.2 });
        else if (tb < HOME + homeLeg.dur) m = { ...homeLeg.at(tb - HOME), glow: 1 };
        else m = still(GASHOLDER, idle(0), { glow: 1 });
        P.put('killerMoth', m);
        const g = glowB(), t0 = BG_LAND - bgIn.dur;
        if (tb < t0) P.put('batgirl', still(P.from('batgirl'), sit(1), g));
        else if (tb < BG_LAND) P.put('batgirl', { ...bgIn.at(tb - t0), ...g });
        else if (tb < HOME + 0.5) P.put('batgirl', still(at(BG.x, BG.y, BG.z, tb < F1 ? toward(BG.x, BG.z, m.x, m.z) : BG.h), tb > TALK + 1.5 && tb < TALK + 4 ? shrug(span(tb, TALK + 1.5, TALK + 4)) : {}, g));
        else if (tb < HOME + 0.5 + bgHome.dur) P.put('batgirl', { ...bgHome.at(tb - HOME - 0.5), ...g });
        else P.put('batgirl', still(LIBRARY_STEPS, sit(1), g));
      },
    });
  }

  // ================================================================== 15. Kite Man
  // Kite Man of Batman 133 (1960) and his "Hell yeah" of later years [wider cast, section 4]. By day he runs off the
  // hammerhead crane's cab and is away on his kite: a long curve out over the harbour, low, round the Statue of
  // Justice, a wobble in a gust, and back onto the crane's cab, where he folds his kite and throws up his arms (the
  // hull on the slip, where the sheet had him land, is out of the opening view behind the crane and the gasholder).
  {
    const J = { x: 71, z: 85 };
    const PATH = curveOf([
      [CRANE_TOP.x, CRANE_TOP.y, CRANE_TOP.z], [CRANE_TOP.x + 4, CRANE_TOP.y + 6, CRANE_TOP.z - 4], [J.x + 2, 26, J.z + 10],
      [J.x + 11, 28, J.z + 1], [J.x + 6, 27, J.z - 9], [J.x - 6, 25, J.z - 7], [CRANE_TOP.x + 2, CRANE_TOP.y + 6, CRANE_TOP.z - 8], [CRANE_TOP.x + 0.8, CRANE_TOP.y + 2.2, CRANE_TOP.z - 2], [CRANE_TOP.x, CRANE_TOP.y, CRANE_TOP.z],
    ]);
    const F0 = 1.5, F1 = F0 + PATH.len / 6, FOLD = F1 + 2.5, CLIMB = FOLD + 2, BODY = CLIMB + 3;
    if (import.meta.env.DEV) {
      let low = Infinity;
      for (let s = 7; s < PATH.len - 14; s += 0.5) { const p = PATH.at(s).p; low = Math.min(low, p[1] - W.solid.top(p[0], p[2])); }
      // within 6 of the crane he leaves and the hull he lands on he is nearer, as a kite must be; out in the open the
      // flight keeps 9 clear (looked at: 8.9 at its lowest, over the slip as he comes in)
      if (low < 5) console.warn(`Gotham: Kite Man's flight comes within ${low.toFixed(1)} of what is built.`);
    }
    book.stories.push({
      id: 'kite', name: 'Kite Man', cast: ['kiteMan'], holds: ['kiteFlight'], weight: 1,
      marks: { kiteMan: 'post' }, body: BODY,
      may: (w) => w.night() < 0.5,
      play(tb, P) {
        const post = P.from('kiteMan');
        let s: State;
        if (tb < F0) s = still(post, tb > 0.6 ? run(((tb - 0.6) * 1.6) % 1) : idle(0), { cape: 0.3 });
        else if (tb < F1) {
          const u = span(tb, F0, F1), q = PATH.at(PATH.len * u), gust = Math.sin(Math.PI * span(u, 0.55, 0.65));
          s = still(at(q.p[0], q.p[1], q.p[2], q.h), glide((tb * 0.5) % 1), { aloft: true, cape: 1, spread: 1, pitch: 0.5 * (1 - span(u, 0.9, 1)), roll: 0.5 * gust * Math.sin(tb * 9) });
        } else if (tb < FOLD) s = still(CRANE_TOP, { armL: 0.8 * span(tb, F1, FOLD), armR: 0.8 * span(tb, F1, FOLD), elbowL: 1.5, elbowR: 1.5 }, { cape: 1 - span(tb, F1, FOLD), spread: 1 - span(tb, F1, FOLD) });
        else s = still(CRANE_TOP, { ...idle((tb * 0.07) % 1), armL: 2.6, armR: 2.6, spreadL: 0.4, spreadR: 0.4 }, { cape: 0.1 });
        void HULL; void CLIMB;
        P.put('kiteMan', s);
      },
    });
  }

  // ================================================================== 16. Harley Rings the Bell
  // Harley at the fair, as Gotham City Sirens (2009 to 2011) has her [wp Harley Quinn; rogues note, story 15]: a man
  // swings at the high striker and the puck climbs half way; Harley waves him aside, swings her own mallet, the puck
  // flies to the top, the bell flashes red and rings spread; Polka-Dot Man claps, dots popping round him; she
  // cartwheels and bows. Off the boardwalk's place for a hero.
  {
    const ST = { x: 92.1, z: -32.2 }, G = BOOTH.y;
    const SWING = spot(ST.x, ST.z + 1.3, N, G + 1), ASIDE = facing(spot(ST.x - 1.6, ST.z + 2.0, E, G + 1), ST.x, ST.z);
    const MAN_FROM = spot(ST.x - 4, ST.z + 2.6, E, G + 1);
    const PD = facing(spot(ST.x + 3.2, ST.z + 2.3, WEST, G + 1), SWING.x, SWING.z), WHEEL_END = spot(SWING.x + 2.6, SWING.z + 0.6, E, G + 1);
    const M_IN = 0.5, M_SW = 3, M_OFF = 5.5, H_TO = 6, H_SW = 8.6, BELL = 9.5, WHEEL = 12, BOW = 14.6, BODY = 19;
    const puck = (tb: number): number => {
      if (tb > M_SW && tb < M_SW + 2) { const u = span(tb, M_SW + 0.3, M_SW + 1.9); return 3.0 * 4 * u * (1 - u) / 1; }
      if (tb > H_SW && tb < H_SW + 2.5) { const u = span(tb, H_SW + 0.3, BELL); return u < 1 ? 6.1 * ease(u) : 6.1 * (1 - span(tb, BELL + 0.2, H_SW + 2.5)); }
      return 0;
    };
    book.stories.push({
      id: 'strength', name: 'Harley Rings the Bell', cast: ['harley', 'polkaDotMan', STRIKER_MAN], holds: ['striker'], weight: 1,
      marks: { harley: 'post', polkaDotMan: 'post', [STRIKER_MAN]: MAN_FROM }, body: BODY,
      play(tb, P) {
        const man = P.from(STRIKER_MAN), mIn = walkLeg(man, SWING, 1.8), mOut = walkLeg(facing(SWING, ASIDE.x, ASIDE.z), ASIDE, 1.6);
        if (tb < M_IN + mIn.dur) P.put(STRIKER_MAN, tb < M_IN ? still(man) : mIn.at(tb - M_IN));
        else if (tb < M_OFF) P.put(STRIKER_MAN, still(SWING, tb > M_SW - 0.6 ? strike(span(tb, M_SW - 0.6, M_SW + 0.6)) : {}));
        else if (tb < M_OFF + mOut.dur) P.put(STRIKER_MAN, mOut.at(tb - M_OFF));
        else P.put(STRIKER_MAN, still(ASIDE, tb > BELL && tb < BELL + 2 ? { armL: 1.3, armR: 1.3, spreadL: 0.2, spreadR: 0.2, elbowL: 0.8, elbowR: 0.8 } : { head: 0.3 }));
        // Harley
        const hp = P.from('harley'), hTo = walkLeg(hp, SWING, 1.8), wheel = walkLeg(SWING, WHEEL_END, 2.2);
        let hs: State;
        if (tb < H_TO) hs = still(hp, tb > M_SW + 1 ? { armL: 1.6, spreadL: 0.8, elbowL: 0.6, head: 0.4 } : { armR: 2.4, elbowR: 2.0, spreadR: 0.3 }, { hold: 0.6 });
        else if (tb < H_TO + hTo.dur) hs = { ...hTo.at(tb - H_TO), hold: 0.6 };
        else if (tb < BELL + 0.3) hs = still(SWING, tb > H_SW - 0.8 ? strike(span(tb, H_SW - 0.8, H_SW + 0.6)) : { armR: 2.4, elbowR: 2.0 }, { hold: 1 });
        else if (tb < WHEEL) hs = still(SWING, laugh(span(tb, BELL + 0.3, WHEEL)), { hold: 0.6 });
        else if (tb < WHEEL + 1.6) { const u = span(tb, WHEEL, WHEEL + 1.6), x = lerp(SWING.x, WHEEL_END.x, u), z = lerp(SWING.z, WHEEL_END.z, u); hs = still(at(x, gy(x, z, G + 1), z, toward(SWING.x, SWING.z, WHEEL_END.x, WHEEL_END.z) - Math.PI / 2), star(0), { roll: TAU * u }); }
        else if (tb < BOW + 2.2) hs = still(facing(WHEEL_END, PD.x, PD.z + 3), tb > BOW ? bow(span(tb, BOW, BOW + 2.2)) : {});
        else { const back = walkLeg(WHEEL_END, at(hp.x, hp.y, hp.z, hp.h), 1.8); hs = back.at(Math.min(back.dur, tb - BOW - 2.2)); }
        P.put('harley', hs);
        void wheel;
        // Polka-Dot Man comes over and claps
        // round the east side of the booth's stall to the striker, and back
        const pp = P.from('polkaDotMan'), PW = spot(pp.x + 1.4, pp.z + 2.4, N, pp.y + 1);
        const pTo = seq([walkLeg(pp, PW, 1.8), walkLeg(PW, PD, 1.8)]), pBack = seq([walkLeg(PD, PW, 1.8), walkLeg(PW, at(pp.x, pp.y, pp.z, pp.h), 1.8)]);
        const clap = tb > BELL && tb < BELL + 3 ? Math.abs(Math.sin(tb * 8)) : 0;
        if (tb < 2) P.put('polkaDotMan', still(pp, idle(0)));
        else if (tb < 2 + pTo.dur) P.put('polkaDotMan', pTo.at(tb - 2));
        else if (tb < BOW + 2.5) P.put('polkaDotMan', still(PD, { armL: 1.3, armR: 1.3, spreadL: 0.3 - 0.3 * clap, spreadR: 0.3 - 0.3 * clap, elbowL: 0.7, elbowR: 0.7 }));
        else P.put('polkaDotMan', pBack.at(Math.min(pBack.dur, tb - BOW - 2.5)));
      },
      props(tb) {
        const y = puck(tb);
        if (y > 0.05) W.glints.speck([ST.x, G + 0.5 + y, ST.z - 0.25], 0.22, 0xfff0a0);
        if (tb > BELL && tb < BELL + 2.5) {
          const u = span(tb, BELL, BELL + 2.5);
          W.glints.speck([ST.x, G + 7.0, ST.z - 0.16], 0.7, dim(0xff3020, 1 - u * 0.6));
          W.rings.set(4, [ST.x, G + 6.9, ST.z - 0.16], 0.4 + 3 * u, 0.7 * (1 - u), 0xff5040);
        } else W.rings.set(4, [0, 0, 0], 1, 0);
        // dots popping round Polka-Dot Man as he claps
        if (tb > BELL && tb < BELL + 3.5) for (let i = 0; i < 6; i++) { const a = i * 1.05 + tb * 2, u = ((tb - BELL) * 1.3 + i * 0.17) % 1; W.glints.speck([PD.x + Math.cos(a) * (0.5 + u), G + 1.4 + u * 1.2, PD.z + Math.sin(a) * (0.5 + u)], 0.16 * (1 - u), [0xff4040, 0x40c0ff, 0xffd040, 0x60ff60, 0xff60ff, 0xff9030][i]); }
      },
      end() { W.rings.set(4, [0, 0, 0], 1, 0); },
    });
  }
  void drive; void N; void beast;
}
