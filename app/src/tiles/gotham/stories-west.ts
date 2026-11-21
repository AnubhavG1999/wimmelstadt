// The stories of the west bank and Bristol: Old Gotham's towers and its police
// roof, the civic quarter, Robinson Park, the waterfront, and Wayne Manor with
// the Batcave.
//
// Each story is a known scene of the comics, or a classic set-up of theirs, in
// moves that small figures can make, as the research notes give them
// (docs/districts/research/gotham-batman-and-rogues.md, section 4, and
// gotham-the-wider-cast.md); each says its source in a comment. Nobody is hurt:
// a fight stops at the clash, and whoever runs gets away.
//
// The chapter gives the west's figures their posts, each with a way of resting
// that is its own, keeps the Manor's animals and the flocks going, and adds its
// stories. The one export below is what stories.ts calls, and it stays.

import * as THREE from 'three';
import type { V3 } from '../../engine/geo';
import type { Build } from '../../engine/tile';
import type { Beast, BeastKind, Flock, FlockKind } from './beasts';
import { EXTRAS, blend, bow, caught, drive, fly, glide, swing, hang, idle, kneel, laugh, leap, lunge, parry, perch, point, run, salute, shrug, sit, star, strike, toss, walk, waddle, type Pose } from './figures';
import type { Machine, MachineKind } from './machines';
import { HERO_SPOTS, SHOW_LANES, SIGNAL, STAGES, Y, groundAt, lotOf } from './plan';
import {
  E, N, S, TAU, TO_VIEW, W as WEST, at, beside, clamp, ease, hidden, lerp, lineLeg, span, still, toward, turnTo, walkLeg, RUN,
  type Leg, type Rest, type Spot, type State, type World,
} from './stage';
import type { Book } from './stories';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** A stretch of a figure's doing: how long, and how it is at each moment of it. */
interface Track { dur: number; at(t: number): State }

/** Several stretches one after another; `t` says when each begins. */
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
/** Standing still at a place for a while, posed by how far through it is. */
const wait = (s: Spot, dur: number, pose: (u: number) => Partial<Pose> = () => ({}), more: Partial<State> = {}): Track => ({ dur, at: (t) => still(s, pose(dur > 0 ? t / dur : 1), more) });
/** A colour darkened toward black by f (1 is itself): how a lit speck fades. */
const dim = (c: number, f: number): number => {
  const k = clamp(f);
  return (Math.round(((c >> 16) & 255) * k) << 16) | (Math.round(((c >> 8) & 255) * k) << 8) | Math.round((c & 255) * k);
};
const facing = (s: Spot, x: number, z: number): Spot => at(s.x, s.y, s.z, toward(s.x, s.z, x, z));
/** A walk by way of corners: each corner faces the way on from it, and the last place its own way. */
const route = (pts: Spot[], speed = 2.2): Track => {
  const ps = pts.map((p, i) => (i > 0 && i < pts.length - 1 ? facing(p, pts[i + 1].x, pts[i + 1].z) : p));
  const legs: Track[] = [];
  for (let i = 1; i < ps.length; i++) legs.push(walkLeg(ps[i - 1], ps[i], speed));
  return seq(legs);
};
/** A figure's hand, roughly: `up` over its feet, `fwd` ahead and `side` to its right. */
const handOf = (s: State, up: number, fwd = 0.3, side = 0.3): V3 => [s.x + Math.cos(s.h) * fwd - Math.sin(s.h) * side, s.y + up, s.z + Math.sin(s.h) * fwd + Math.cos(s.h) * side];

/** A machine as it stands at one moment, for the check of what it touches. */
interface Pose3 { x: number; y: number; z: number; h: number; pitch?: number }
/** A machine's plan as layers of points in its own frame (x ahead, z to its right), each with the heights over its `y` that its body fills there. */
type Shape = { pts: [number, number][]; ys: number[] }[];

/** A way along a line of corners on the ground, measured by distance: where on it, and heading which way. */
interface Path { len: number; at(s: number): [number, number, number] }
function pathOf(pts: [number, number][]): Path {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1];
  return {
    len,
    at(s) {
      const d = clamp(s, 0, len);
      let i = 1;
      while (i < pts.length - 1 && cum[i] < d) i++;
      const a = pts[i - 1], b = pts[i], f = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
      return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), Math.atan2(b[1] - a[1], b[0] - a[0])];
    },
  };
}

/** Gives the west's figures their posts and adds its stories to the book. */
export function west(k: Build, W: World, book: Book): void {
  const tower = lotOf('wayne-tower'), gcpd = lotOf('gcpd');
  /** The height of what can be stood on at a place, no higher than `from`. */
  const gy = (x: number, z: number, from = 200): number => W.solid.under(x, z, from);
  const spot = (x: number, z: number, h: number, from = 200): Spot => at(x, gy(x, z, from), z, h);
  /** The show's clock, as the last frame had it. */
  let now = 0;
  const night = (): number => W.night();

  // the machines, the animals and the flocks this chapter moves; any of them may be missing
  const machine = (kind: string): Machine | null => {
    try { return (W.machines?.get(kind as MachineKind) as Machine | undefined) ?? null; } catch { return null; }
  };
  const beast = (kind: BeastKind): Beast | null => { try { return W.beasts?.beast(kind) ?? null; } catch { return null; } };
  const flocks: Flock[] = [];
  const flock = (kind: FlockKind, max: number): Flock | null => {
    try { const f = W.beasts?.flock(kind, max) ?? null; if (f) flocks.push(f); return f; } catch { return null; }
  };
  /** Puts a machine at a place and says where a rider's feet go: by the machine's own seat if it is there, else by a guess. */
  const seatOn = (m: Machine | null, x: number, y: number, z: number, h: number, pitch: number, i: number, local: V3): V3 => {
    if (m) { m.at(x, y, z, h, pitch, 0); return m.seat(i); }
    return [x + Math.cos(h) * local[0] - Math.sin(h) * local[2], y + local[1], z + Math.sin(h) * local[0] + Math.cos(h) * local[2]];
  };
  /**
   * For the console (`gothamWest.machines()`): whether a machine on its way touches anything built, at the level of
   * its drawn mesh. Its plan is sampled every 0.25 in its own frame, and at each of a few heights over its `y` the
   * point is asked whether it lies inside something built. `ignore` leaves out what cannot be seen (inside the hill).
   */
  const devChecks: Record<string, () => string> = {};
  const faces = (W.solid as unknown as { faces(x: number, z: number, each: (y: number, up: number) => void): void }).faces.bind(W.solid);
  /**
   * Whether a point lies inside something built: as the show's check asks it, but leaving out a roof's face high over
   * it that has no underside drawn (a keystone, a slab's lip): only what begins within `reach` over it counts, or
   * the ground itself.
   */
  const within = (x: number, y: number, z: number, reach: number): boolean => {
    if (y < groundAt(x, z) - 0.05) return true;
    let near = Infinity, lean = 0;
    faces(x, z, (fy, up) => { if (fy > y + 0.02 && fy < near) { near = fy; lean = up; } });
    return near < y + reach && lean > 0.1;
  };
  const touching = (poses: Pose3[], shape: Shape, ignore: (x: number, z: number) => boolean = () => false): string => {
    let n = 0, first = '';
    for (const q of poses) {
      const c = Math.cos(q.h), s = Math.sin(q.h), tp = Math.tan(q.pitch ?? 0);
      let hit = false;
      for (const layer of shape) {
        for (const [lx, lz] of layer.pts) {
          const x = q.x + c * lx - s * lz, z = q.z + s * lx + c * lz, y = q.y + lx * tp;
          if (ignore(x, z)) continue;
          for (const dy of layer.ys) if (within(x, y + dy, z, 2.2)) { hit = true; if (!first) first = `(${x.toFixed(2)}, ${(y + dy).toFixed(2)}, ${z.toFixed(2)}), its own (${lx.toFixed(2)}, ${dy}, ${lz.toFixed(2)}), it at (${q.x.toFixed(2)}, ${q.y.toFixed(2)}, ${q.z.toFixed(2)}) heading ${q.h.toFixed(3)}`; break; }
          if (hit) break;
        }
        if (hit) break;
      }
      if (hit) n++;
    }
    return n ? `touches at ${n} of ${poses.length} moments, first at ${first}` : `touches nothing at ${poses.length} moments`;
  };
  /** A plan in a machine's own frame, sampled: `parts` are boxes [x0, x1, half-width]. */
  const shapeOf = (parts: [number, number, number][], ys: number[], step = 0.25): Shape[number] => {
    const pts: [number, number][] = [];
    for (const [x0, x1, hw] of parts) for (let x = x0; x <= x1 + 1e-6; x += (x1 - x0) / Math.ceil((x1 - x0) / step)) for (let z = -hw; z <= hw + 1e-6; z += hw / Math.ceil(hw / step)) pts.push([x, z]);
    return { pts, ys };
  };
  // the Batwing: its wings to 4.65 either side, its head narrower; from its belly to its canopy and fins
  const WING_SHAPE: Shape = [shapeOf([[-4.8, 3.3, 4.7], [3.3, 4.15, 1.65], [4.15, 5.37, 1.05]], [0.08, 0.6, 1.2, 1.95], 0.45)];

  // ------------------------------------------------------------------ places
  const PERCH = W.place('towers', 'perch', at(tower.x1 - 0.6, tower.top, tower.z1 - 0.6, TO_VIEW));
  const THIRTEENTH = W.place('towers', 'thirteenth', at(tower.x1 - 3.5, Y.crown + 66.6, (tower.z0 + tower.z1) / 2 + 1, E));
  const TOWER_DOOR = W.place('towers', 'towerDoor', at((tower.x0 + tower.x1) / 2, Y.crown + 0.04, tower.z1 + 0.35, S));
  // Robin's post: the Elliot Tower's east ledge, which the opening view sees (its `watchElliot` corner is behind a
  // turret), level with that place.
  const elliotLot = lotOf('elliot-tower');
  const WATCH_ELLIOT0 = W.place('towers', 'watchElliot', at(elliotLot.x1 - 1.1, Y.crown + 19.3, elliotLot.z1 - 1.1, TO_VIEW));
  const WATCH_ELLIOT = spot(elliotLot.x1 - 1.0, elliotLot.z0 + 7, TO_VIEW, WATCH_ELLIOT0.y + 1);
  // Gordon's post: just east of the Signal's lamp, beside its beam and not behind it as the opening view looks.
  const GORDON_PLACE = W.place('civic', 'gordon', at(SIGNAL.lamp[0] - 1.4, gcpd.top, SIGNAL.lamp[2] - 1.4, TO_VIEW));
  const GORDON = spot(SIGNAL.lamp[0] + 1.9, SIGNAL.lamp[2] - 0.9, TO_VIEW, GORDON_PLACE.y + 1);
  // The lamp is a drum 0.98 in radius: whoever walks from Gordon's post to the south parapet goes round it by its
  // south-east, 2 clear of its middle.
  const ROUND_LAMP = at(SIGNAL.lamp[0] + 2.0, GORDON.y, SIGNAL.lamp[2] + 1.8, S);
  const lampWalk = (from: Spot, to: Spot): Track => route([from, ROUND_LAMP, to]);
  const ROOF_DOOR = W.place('civic', 'roofDoor', at(gcpd.x0 + 4.5, gcpd.top, gcpd.z0 + 4, S));
  const GCPD_DOOR = W.place('civic', 'gcpdDoor', at(gcpd.x1 + 1.7, Y.upper, (gcpd.z0 + gcpd.z1) / 2, E));
  const COURT_STEPS = W.place('civic', 'courtSteps', at(-34, Y.upper + 0.8, 39.25, S));
  const LIBRARY_STEPS = W.place('civic', 'librarySteps', at(-51, Y.upper + 1.2, 38.06, S));
  const SCARE_POST = W.place('civic', 'scarecrowPost', at(-50.6, Y.upper + 0.04, -3.3, TO_VIEW));
  const QUAD_MIDDLE = W.place('civic', 'quadMiddle', at(-53, Y.upper + 0.07, -6, S));
  const ROLL = [0, 1, 2, 3, 4, 5, 6].map((i) => W.place('civic', `roll${i}`, at(gcpd.x0 + 1.6 + i * 1.8, gcpd.top, gcpd.z1 - 1.1, S)));
  const IVY = W.place('park', 'ivy', at(-70.4, 0.07, -19.4, TO_VIEW));
  const GARDEN_DOOR = W.place('park', 'gardenDoor', at(-72, 0.06, -19.6, S));
  const CASTLE_TOP = W.place('park', 'castleTop', at(-86.4, 16, -42.4, TO_VIEW));
  const CASTLE_FOOT = W.place('park', 'castleFoot', at(-83.2, 2.95, -38.8, TO_VIEW));
  const PARK_GATE = W.place('park', 'parkGate', at(-62.8, 0.06, -35, E));
  const LOUNGE_TERRACE = W.place('waterfront', 'loungeTerrace', at(-2.2, 12, 37.4, TO_VIEW));
  const BANK_DOOR = W.place('waterfront', 'bankDoor', at(-16.5, 0, 42.2, S));
  const BANK_ROOF = W.place('waterfront', 'bankRoof', at(-20.5, 11.85, 38.4, TO_VIEW));
  const CHARITY = W.place('waterfront', 'charityBox', at(-11.45, 0, 45.7, E));
  const SKYLIGHT = W.place('waterfront', 'skylight', at(-36.9, 14, 2, WEST));
  const CAT_ROOF = W.place('waterfront', 'catwoman', at(-16.4, 12, 22.6, TO_VIEW));
  const RIDDLER = W.place('waterfront', 'riddler', at(28.7, 1.2, 42.2, S));
  // The new Bristol (bristol.ts): the grotto under the Manor's tower with the waterfall across its mouth, the terrace
  // walk along the cliff's edge before the house, the pool garden whose mirror pool is the lid of the cave's lift, and
  // the entrance court with the helicopter's ring east of it. Fallbacks are worked out from the plan's lots.
  const BATMOBILE = W.place('bristol', 'batmobile', at(40, Y.cave + 0.22, -89.1, S));
  const PAD = W.place('bristol', 'batplane', at(11, Y.cave + 0.6, -93, S));
  const HATCH = W.place('bristol', 'hatch', at(11, Y.crest, -93, E));
  const FALL_FOOT = W.place('bristol', 'fallFoot', at(40, Y.cave + 0.25, -85.4, S));
  const OLD_TUNNEL = W.place('bristol', 'oldTunnel', at(SHOW_LANES.service.x1 + 0.55, Y.shelf, -83, E));
  const ALFRED = W.place('bristol', 'alfred', at(40, Y.crest + 0.04, -85.8, S));
  const MANOR_DOOR = W.place('bristol', 'manorDoor', at(40, Y.crest + 0.5, -87.2, S));  const DAMIAN = W.place('bristol', 'damian', at(-1.5, Y.crest, -100.5, TO_VIEW));
  const TITUS = W.place('bristol', 'titus', at(0.8, Y.crest, -99.2, TO_VIEW));
  const BAT_COW = W.place('bristol', 'batCow', at(-4.8, Y.crest, -104, 1.05));
  const ALFRED_CAT = W.place('bristol', 'alfredCat', at(3.6, Y.crest, -103.6, TO_VIEW));
  const CREVICE = W.place('bristol', 'batsCrevice', at(-18, Y.cave + 1.8, -84.6, S));
  const glowB = (more: Partial<State> = {}): Partial<State> => ({ glow: night(), ...more });
  /** A figure on foot kept on the ground as built, over a knoll or a step. */
  const grounded = (s: State): State => { if (!s.shown) return s; const y = gy(s.x, s.z, s.y + 4); return Number.isFinite(y) ? { ...s, y } : s; };
  /**
   * Off a place with something built over it or close before it, as the library's steps: a few steps out, pulled
   * straight up on the line over what is near, and from there the swing.
   */
  const launch = (from: Spot, to: Spot, out = 3.5): Leg => {
    const b0 = beside(from, out), step = at(b0.x, gy(b0.x, b0.z, from.y + 1), b0.z, b0.h), h = toward(step.x, step.z, to.x, to.z);
    let top = step.y;
    for (let i = 0; i <= 6; i++) { const x = step.x + Math.cos(h) * i, z = step.z + Math.sin(h) * i; top = Math.max(top, W.solid.top(x, z), W.solid.top(x - Math.sin(h), z + Math.cos(h)), W.solid.top(x + Math.sin(h), z - Math.cos(h))); }
    const high = at(step.x, top + 2.5, step.z, h), walkOut = walkLeg(from, at(step.x, step.y, step.z, h), 2.6);
    const upT = Math.max(0.8, (high.y - step.y) / 14), swing = lineLeg(W.solid, high, to);
    const fast: V3 = [step.x, high.y + 6, step.z];
    return {
      dur: walkOut.dur + upT + swing.dur,
      at(t) {
        if (t < walkOut.dur) return grounded(walkOut.at(t));
        if (t < walkOut.dur + upT) { const u = ease((t - walkOut.dur) / upT); return still(at(step.x, lerp(step.y, high.y, u), step.z, h), { armR: 3.05, elbowR: 0.05, armL: 0.6, hipL: 0.2, kneeL: 0.5, kneeR: 0.3 }, { aloft: true, line: fast, cape: 0.6 }); }
        return swing.at(t - walkOut.dur - upT);
      },
    };
  };
  /** The same the other way: a swing to over the place before it, let down on the line, and the steps back to it. */
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

  // ------------------------------------------------------------------ the cast at rest
  // Batman crouches on his gargoyle, cape about him, and turns his head to the city; his eyes show at night.
  book.post('batman', PERCH, (t, post) => still(post, { ...perch((t * 0.05) % 1), head: Math.sin(t * 0.23) * 0.7 }, { glow: night(), cape: 0.1 }));
  book.post('gordon', GORDON);

  // Tim Drake crouched on the Elliot Tower's ledge with his staff out; now and then he stands and spins it.
  book.post('robin', WATCH_ELLIOT, (t, post) => {
    const p = t % 15;
    if (p > 11 && p < 13.5) {
      const u = span(p, 11, 13.5), up = Math.sin(Math.PI * u);
      return still(post, blend(perch(0), { armR: 1.2, elbowR: 0.4, armL: 1.0, elbowL: 0.5 }, up), { hold: 1, spin: u * TAU * 2, glow: night() });
    }
    return still(post, { ...perch((t * 0.04) % 1), head: Math.sin(t * 0.3) * 0.6 }, { hold: 1, glow: night() });
  });
  // Batgirl sitting on the library's steps with her nose in a book; every so often she turns a page.
  book.post('batgirl', LIBRARY_STEPS, (t, post) => {
    const page = span(t % 8, 6.6, 7.4), turn = Math.sin(Math.PI * page);
    return still(post, { ...sit(1), armL: 0.95, elbowL: 1.35, spreadL: 0.1, armR: 0.95 + 0.35 * turn, elbowR: 1.35 - 0.6 * turn, spreadR: 0.1 + 0.4 * turn, nod: 0.45, head: 0.1 * Math.sin(t * 0.2) }, { glow: night() * 0.6 });
  });
  // Lucius Fox by Wayne Tower's door, beside the forecourt's place for a hero; now and then he looks at his watch.
  const LUCIUS = beside(TOWER_DOOR, 0.3, 2.2, TO_VIEW);
  book.post('lucius', spot(LUCIUS.x, LUCIUS.z, TO_VIEW, LUCIUS.y + 1), (t, post) => {
    const w = Math.sin(Math.PI * span(t % 17, 13, 15.5));
    return still(post, blend(idle((t * 0.06) % 1), { armL: 1.3, spreadL: -0.2, elbowL: 1.9, nod: 0.45, head: 0.3 }, w));
  });
  // Bullock and Montoya by the police door, a pace apart: he with his hands in his pockets and now and then a doughnut,
  // she with her arms folded, watching the street.
  // up on the police roof's west side, clear of the lamp, its beam, the roof door and the row along the south parapet
  const BULLOCK = spot(gcpd.x0 + 2.0, gcpd.z0 + 5.5, TO_VIEW - 0.45, gcpd.top + 1), MONTOYA = spot(gcpd.x0 + 1.4, gcpd.z0 + 7.4, TO_VIEW + 0.35, gcpd.top + 1);
  void GCPD_DOOR;
  const bullockRest: Rest = (t, post) => {
    const bite = Math.sin(Math.PI * span(t % 14, 10, 12.5));
    const pockets: Partial<Pose> = { armL: -0.12, armR: -0.12, spreadL: 0.16, spreadR: 0.16, elbowL: 0.55, elbowR: 0.55, head: 0.35 * Math.sin(t * 0.17) };
    return still(post, blend(pockets, { armR: 1.0, elbowR: 2.0, spreadR: 0.05, nod: 0.15, armL: -0.12, spreadL: 0.16, elbowL: 0.55 }, bite), { hold: bite > 0.05 ? 1 : 0 });
  };
  const montoyaRest: Rest = (t, post) => still(post, { ...hang(0), nod: 0.05, head: 0.7 * Math.sin(t * 0.13) * (Math.sin(t * 0.05) > -0.2 ? 1 : 0.3) });
  book.post('bullock', BULLOCK, bullockRest);
  book.post('montoya', MONTOYA, montoyaRest);
  // Alfred on the Manor's terrace, his hands behind him; now and then he carries his tray a few steps and back.
  book.post('alfred', ALFRED, (t, post) => {
    const p = t % 30, behind: Partial<Pose> = { armL: -0.35, armR: -0.35, spreadL: -0.1, spreadR: -0.1, elbowL: 0.9, elbowR: 0.9, head: 0.4 * Math.sin(t * 0.11) };
    if (p < 20) return still(post, behind);
    const tray: Partial<Pose> = { armR: 1.1, elbowR: 1.5, spreadR: 0.15, armL: -0.1 };
    const out = beside(post, 0, -2.4, E), back = beside(post, 0, -2.4, WEST);
    if (p < 23) { const l = walkLeg(post, out); return { ...l.at(Math.min(l.dur, p - 20)), pose: { ...walk(((p - 20) * 0.7) % 1), ...tray }, hold: 1 }; }
    if (p < 24) return still(out, tray, { hold: 1 });
    if (p < 27) { const l = walkLeg(back, at(post.x, post.y, post.z, E)); return { ...l.at(Math.min(l.dur, p - 24)), pose: { ...walk(((p - 24) * 0.7) % 1), ...tray }, hold: 1 }; }
    return still(at(post.x, post.y, post.z, turnTo(E, post.h, span(p, 27, 28))), behind);
  });
  // Damian on the lawn at his sword: a lunge, a cut and a parry, over and over.
  book.post('damian', DAMIAN, (t, post) => {
    const p = t % 7;
    const pose = p < 1.3 ? lunge(p / 1.3) : p < 2.8 ? strike(span(p, 1.5, 2.7)) : p < 4.4 ? parry(span(p, 3.0, 4.2)) : idle((t * 0.1) % 1);
    return still(post, pose, { hold: p < 4.4 ? 1 : 0, glow: night() * 0.5 });
  });
  // The Penguin struts along his terrace's parapet, his umbrella furled as a cane, and back.
  const STRUT = at(LOUNGE_TERRACE.x - 3.6, LOUNGE_TERRACE.y, LOUNGE_TERRACE.z + 0.2, WEST);
  book.post('penguin', LOUNGE_TERRACE, (t, post) => {
    const p = t % 14, cane: Partial<Pose> = { armR: 0.35, elbowR: 0.35, spreadR: 0.2 };
    const go = walkLeg(post, STRUT, 1.1), back = walkLeg(STRUT, post, 1.1);
    if (p < go.dur) return { ...go.at(p), pose: { ...waddle((p * 1.6) % 1), ...cane } };
    if (p < go.dur + 2) return still(STRUT, { ...cane, head: 0.5 * Math.sin(p * 2), lean: -0.12 });
    if (p < go.dur + 2 + back.dur) { const q = p - go.dur - 2; return { ...back.at(q), pose: { ...waddle((q * 1.6) % 1), ...cane } }; }
    return still(post, { ...cane, lean: -0.15, nod: -0.1, head: 0.3 * Math.sin(t * 0.4) });
  });
  // Catwoman crouched on the southern jeweller's roof, her cat beside her; now and then she stretches.
  book.post('catwoman', CAT_ROOF, (t, post) => {
    const st = Math.sin(Math.PI * span(t % 19, 15, 17.5));
    return still(post, blend({ ...perch((t * 0.045) % 1), head: Math.sin(t * 0.27) * 0.8 }, { armL: 2.8, armR: 2.8, spreadL: 0.3, spreadR: 0.3, lean: -0.1, nod: -0.3 }, st), { glow: night() });
  });
  // The Riddler at his booth on the pier, twirling his cane.
  book.post('riddler', RIDDLER, (t, post) => {
    const p = t % 9, tw = p > 5 && p < 7.5;
    return still(post, tw ? { armR: 1.2, elbowR: 0.6, spreadR: 0.3, head: 0.3, nod: -0.1 } : { armR: 0.3, elbowR: 0.2, spreadR: 0.3, lean: 0.05, head: 0.5 * Math.sin(t * 0.3) }, { hold: 1, spin: tw ? (p - 5) * 9 : 0 });
  });
  // Two-Face on the courthouse steps, tossing his coin and catching it; the coin itself is a speck drawn below.
  let coinRest = { t: 0, at: -10, post: COURT_STEPS };
  book.post('twoFace', COURT_STEPS, (t, post) => {
    coinRest = { t, at: now, post };
    const p = t % 9;
    const pose = p < 0.6 ? idle((t * 0.1) % 1) : p < 1.3 ? toss(span(p, 0.6, 1.3)) : p < 2.7 ? { ...toss(1), nod: -0.2 - 0.6 * Math.sin(Math.PI * span(p, 1.3, 2.7)) } : p < 3.4 ? caught(span(p, 2.7, 3.4)) : p < 4.6 ? { ...caught(1), nod: 0.4 } : idle((t * 0.1) % 1);
    return still(post, pose);
  });
  // Ivy by the Botanical Garden's door; now and then she lifts her arms to its plants.
  book.post('ivy', IVY, (t, post) => {
    const up = Math.sin(Math.PI * span(t % 16, 11, 14.5));
    return still(post, blend(idle((t * 0.08) % 1), { armL: 2.5, armR: 2.5, spreadL: 0.6, spreadR: 0.6, elbowL: 0.3, elbowR: 0.3, nod: -0.35, lean: -0.1 }, up));
  });
  // The Scarecrow on the quad, arms out as stiff as the scarecrow beside him, only his head turning.
  const scarecrowStill = (t: number): Partial<Pose> => ({ armL: 0.05, armR: 0.05, spreadL: 1.5, spreadR: 1.5, elbowL: 0.25, elbowR: 0.25, nod: 0.25, tilt: 0.08, head: Math.sin(t * 0.9) > 0.85 ? 0.9 * Math.sin(t * 0.21) : 0.15 * Math.sin(t * 0.21) });
  book.post('scarecrow', SCARE_POST, (t, post) => still(post, scarecrowStill(t)));
  // The Mad Hatter and the Tweedles by their tea table on the park lawn's east side, where the opening view sees them
  // over the row houses (the gate and the Alice group are behind them). The table stands there always.
  const TEA_LAWN = STAGES.parkLawn;
  const TEA_T = spot(TEA_LAWN.x1 - 7, TEA_LAWN.z1 - 8, S, 2);
  const HATTER = at(TEA_T.x + 0.4, TEA_T.y, TEA_T.z - 2.3, S);
  const TWEEDLEDUM = spot(TEA_T.x + 2.4, TEA_T.z + 0.4, TO_VIEW + 0.3, 2), TWEEDLEDEE = spot(TEA_T.x - 2.4, TEA_T.z + 0.4, TO_VIEW - 0.4, 2);
  const teaTable = new THREE.Group();
  const teaTop = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 12), new THREE.MeshLambertMaterial({ color: 0xf2efe6 }));
  teaTop.position.y = 0.58;
  const teaLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 0.56, 6), new THREE.MeshLambertMaterial({ color: 0x6a4a2e }));
  teaLeg.position.y = 0.28;
  const teaPot = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), new THREE.MeshLambertMaterial({ color: 0x5a8ac0 }));
  teaPot.position.set(0.12, 0.76, 0.05);
  teaTable.add(teaTop, teaLeg, teaPot);
  teaTable.position.set(TEA_T.x, TEA_T.y + 0.02, TEA_T.z);
  k.group.add(teaTable);
  book.post('madHatter', HATTER, (t, post) => {
    const sip = Math.sin(Math.PI * span(t % 11, 7, 9.5));
    return still(post, blend(idle((t * 0.07) % 1), { armR: 1.4, elbowR: 2.2, spreadR: 0.1, nod: -0.1 }, sip), { hold: 1 });
  });
  void PARK_GATE;
  const tweedleRest = (phase: number): Rest => (t, post) => still(post, { ...idle(((t + phase) * 0.09) % 1), crouch: 0.06 + 0.06 * Math.max(0, Math.sin((t + phase) * 2.2)), head: 0.7 * Math.sin((t + phase) * 0.35) });
  book.post('tweedledum', TWEEDLEDUM, tweedleRest(0));
  book.post('tweedledee', TWEEDLEDEE, tweedleRest(2.3));
  // Azrael crouched on the ridge of the cathedral's north transept, his cloak in the wind: the one part of its roofs
  // the opening view sees past the towers before it.
  const cath = lotOf('cathedral');
  const AZRAEL = spot(cath.x0 + 10, cath.z0 + 1.5, TO_VIEW, 36);
  book.post('azrael', AZRAEL, (t, post) => still(post, { ...perch((t * 0.04) % 1), head: 0.6 * Math.sin(t * 0.15) }, { cape: 0.3 + 0.15 * Math.sin(t * 0.7), glow: night() }));
  // A Talon on Wayne Tower's thirteenth gargoyle, crouched, his head snapping from side to side like an owl's.
  const OWL = [-1.3, 0, 1.3, 0.4, -0.5, 0];
  book.post('talon', THIRTEENTH, (t, post) => {
    const q = t / 1.7, i = Math.floor(q), f = q - i;
    const head = lerp(OWL[(i + OWL.length - 1) % OWL.length], OWL[i % OWL.length], ease(clamp(f / 0.12)));
    return still(post, { ...perch(0), head, nod: 0.35 }, { glow: night() });
  });
  // Duke Thomas as Signal on the bank's roof, by day only.
  book.post('signal', BANK_ROOF, (t, post) => (night() > 0.5 ? hidden(post) : still(post, { ...idle((t * 0.06) % 1), head: 0.6 * Math.sin(t * 0.2) }, { glow: 0.2 })));
  // Hush before the Elliot Tower, his hands behind him: on the Crown's terrace off its east side, where the opening
  // view sees him. (At its south door he stood in an alley two wide behind a building 24 high, and no turn of the
  // view found him.)
  const elliot = lotOf('elliot-tower');
  book.post('hush', spot(elliot.x1 + 1.5, (elliot.z0 + elliot.z1) / 2 + 2, TO_VIEW, Y.crown + 3),(t, post) => still(post, { armL: -0.35, armR: -0.35, elbowL: 0.9, elbowR: 0.9, tilt: 0.1 * Math.sin(t * 0.1), head: 0.5 * Math.sin(t * 0.12), nod: 0.15 }));

  // ------------------------------------------------------------------ the animals, and what goes on by itself
  const titus = beast('titus'), batCow = beast('batCow'), alfredCat = beast('alfredCat'), blackCat = beast('blackCat');
  const hyenas = [beast('hyena'), beast('hyena')], seahorse = beast('seahorse');
  for (const b of [titus, batCow, alfredCat, blackCat]) b?.shown(true);
  for (const b of [...hyenas, seahorse]) b?.shown(false);
  const bats = flock('bats', 40), crows = flock('crows', 24);
  /** When a story last moved one of the animals itself, so that what goes on by itself leaves it alone. */
  const busy = { cat: -10, hyenas: -10, seahorse: -10 };
  const TITUS_C = { x: DAMIAN.x + 2.0, z: DAMIAN.z - 2.6, rx: 2.2, rz: 2.6 };
  const CAT_SPOT = beside(CAT_ROOF, 0.15, 1.0);

  book.always.push((dt, clock) => {
    now = clock;
    for (const f of flocks) f.step(dt);
    // Titus trots a round of the lawn; Bat-Cow grazes; Alfred the cat sits and watches
    const a = clock * 0.33;
    titus?.at(TITUS_C.x + Math.cos(a) * TITUS_C.rx, TITUS.y, TITUS_C.z + Math.sin(a) * TITUS_C.rz, Math.atan2(Math.cos(a) * TITUS_C.rz, -Math.sin(a) * TITUS_C.rx));
    titus?.gait((clock * 1.8) % 1, 1);
    batCow?.at(BAT_COW.x, BAT_COW.y, BAT_COW.z, BAT_COW.h + 0.3 * Math.sin(clock * 0.07));
    batCow?.gait((clock * 0.2) % 1, Math.sin(clock * 0.05) > 0.6 ? 1 : 0);
    alfredCat?.at(ALFRED_CAT.x, ALFRED_CAT.y, ALFRED_CAT.z, ALFRED_CAT.h);
    alfredCat?.gait(0, 3);
    if (now - busy.cat > 0.3) { blackCat?.at(CAT_SPOT.x, CAT_SPOT.y, CAT_SPOT.z, CAT_SPOT.h); blackCat?.gait(0, 3); }
    if (now - busy.hyenas > 0.3) for (const h of hyenas) h?.shown(false);
    if (now - busy.seahorse > 0.3) seahorse?.shown(false);
    // Two-Face's coin while he rests
    if (now - coinRest.at < 0.2) {
      const p = (coinRest.t + (now - coinRest.at)) % 9, post = coinRest.post;
      if (p > 1.2 && p < 2.75) {
        const u = span(p, 1.2, 2.75), y = post.y + 2.1 + 2.6 * 4 * u * (1 - u);
        const c = handOf(still(post), 0, 0.35, 0.3);
        W.glints.speck([c[0], y, c[2]], 0.17, Math.floor(p * 10) % 2 ? 0xfff6d8 : 0x9a9a90);
      }
    }
  });

  // ================================================================== 1. The Signal
  // Detective Comics 60 (1942): the lamp on the police roof. Gordon lights it, Batman comes down on his line, they
  // talk, Gordon looks where he pointed, and when he looks back the roof is empty: the running joke of Batman gone
  // before Gordon finishes his sentence [mem]. Mended: he leaves by the roof's east parapet, away from Gordon, and
  // leaps out past the wall before he drops; and Montoya comes out of the roof door to an empty roof.
  let lastSignal = -1000;
  {
    const roof = GORDON.y;
    // Gordon steps from the lamp to the south parapet, out of the beam, where the opening view sees the two of them
    const G2 = at(ROLL[3].x, roof, ROLL[3].z, S);
    const behind = at(G2.x - 0.6, roof, G2.z - 2.4, S);
    const edge = at(gcpd.x1 - 0.9, roof, behind.z - 4, E), out = at(gcpd.x1 + 1.7, roof, behind.z - 4, E);
    const gTo = lampWalk(GORDON, G2), gBack = lampWalk(at(G2.x, roof, G2.z, E), GORDON);
    const LIT = 1.5, UP = 5, LAND = UP + 0.6, GONE = 22, BACK = 25, OFF = BACK + gBack.dur;
    let down: Leg | null = null;
    const lit = (tb: number): number => (tb < OFF + 0.4 ? ease(span(tb, LIT, LIT + 2)) : 1 - ease(span(tb, OFF + 0.4, OFF + 2.2)));
    book.stories.push({
      id: 'signal', name: 'the Signal', cast: ['gordon', 'batman', 'montoya'], holds: ['policeRoof', 'signal'], weight: 1.3,
      marks: { gordon: 'post', batman: 'post', montoya: 'post' }, body: OFF + 2.4,
      may: (w) => w.night() > 0.3,
      play(tb, P) {
        const g = P.from('gordon'), home = P.from('batman');
        down ??= lineLeg(W.solid, home, behind);
        // Gordon: throws the switch, goes to the parapet looking up, turns when Batman lands, points across the city,
        // looks that way, looks back at an empty roof, shrugs, and goes back to put the light out
        const talk = toward(G2.x, G2.z, behind.x, behind.z);
        if (tb < 1.2) P.put('gordon', still(g, { armR: 1.4 * ease(span(tb, 0.3, 1.2)), elbowR: 0.3 }));
        else if (tb < 1.2 + gTo.dur) P.put('gordon', gTo.at(tb - 1.2));
        else if (tb < LAND + down.dur) P.put('gordon', still(G2, { nod: -0.4 }));
        else if (tb < BACK) {
          const h = tb < 12 ? turnTo(S, talk, span(tb, LAND + down.dur, LAND + down.dur + 0.5)) : tb < GONE + 0.8 ? turnTo(talk, TO_VIEW, span(tb, 12, 12.6)) : turnTo(TO_VIEW, talk, span(tb, GONE + 0.8, GONE + 1.3));
          const p = tb > 12 && tb < 19.5 ? point(span(tb, 12, 19.5)) : tb > GONE + 1.4 && tb < BACK ? shrug(span(tb, GONE + 1.4, BACK)) : idle((tb * 0.1) % 1);
          P.put('gordon', still(at(G2.x, roof, G2.z, h), p));
        } else if (tb < OFF) P.put('gordon', gBack.at(tb - BACK));
        else P.put('gordon', still(GORDON, tb < OFF + 1 ? { armR: 1.4, elbowR: 0.3 } : idle((tb * 0.1) % 1)));
        // Batman: rises on his gargoyle with his cape opening, comes down on his line behind Gordon, listens, and is gone
        if (tb < UP) {
          const s = ease(span(tb, 3.4, UP));
          P.put('batman', still(home, blend(perch(0), {}, s), { cape: 0.1 + 0.5 * s, spread: 0.5 * s, glow: night() }));
        } else if (tb < LAND + down.dur) {
          P.put('batman', tb < LAND ? still(home, leap(0.1), { cape: 0.6, spread: 0.5, glow: night() }) : { ...down.at(tb - LAND), glow: night() });
        } else if (tb < GONE - 2.4) {
          P.put('batman', still(at(behind.x, behind.y, behind.z, toward(behind.x, behind.z, G2.x, G2.z)), { head: 0.25 * Math.sin(tb * 0.6) }, { cape: 0.1, glow: night() }));
        } else if (tb < GONE - 0.8) {
          // to the east parapet while Gordon looks the other way
          const l = walkLeg(at(behind.x, behind.y, behind.z, toward(behind.x, behind.z, G2.x, G2.z)), edge, 6);
          P.put('batman', { ...l.at(Math.min(l.dur, tb - GONE + 2.4)), glow: night() });
        } else if (tb < GONE) {
          // over it with his cape spread, out past the wall, and down
          const o = span(tb, GONE - 0.8, GONE);
          P.put('batman', still(at(lerp(edge.x, out.x, o), roof + 2.2 * Math.sin(Math.PI * Math.min(1, o * 1.25)) - 7 * o * o, edge.z, E), leap(0.3 + 0.6 * o), { cape: 0.6 + 0.4 * o, spread: o, aloft: true, glow: night() }));
        } else P.put('batman', hidden(out));
        // Montoya comes up to see what the light is for, and finds Gordon alone
        // Montoya, at her post on the roof, looks round at the place where he stood, and shrugs at Gordon
        const mp = P.from('montoya');
        if (tb < GONE + 0.6) P.put('montoya', montoyaRest(tb, mp));
        else {
          const mh = turnTo(mp.h, toward(mp.x, mp.z, behind.x, behind.z), span(tb, GONE + 0.6, GONE + 1.2));
          P.put('montoya', still(at(mp.x, mp.y, mp.z, mh), tb > GONE + 2 && tb < GONE + 4.4 ? shrug(span(tb, GONE + 2, GONE + 4.4)) : { head: 0.6 * Math.sin(tb * 1.3), nod: -0.1 }));
        }
      },
      props(tb, live) { W.air?.signal(lit(tb), 'bat'); if (live) lastSignal = now; },
      end() { down = null; W.air?.signal(0); },
    });
  }
  book.opening.push('signal');

  // ================================================================== 2. Out of the Batcave
  // Det. 83 (1944) and the cave of 1946 to 1950 [wp Batcave]; the waterfall over the door and the hidden cave are the
  // collector's decisions. Laid again on the new Manor: the bats pour out of their cleft; Batman and Robin come to the
  // terrace walk, one to each side of the tower, vault the balustrade and swing down on their lines and in through the
  // waterfall, which parts a little for each; Alfred looks over the balustrade after them. A beat, and the fall parts
  // wide: the Batmobile comes out through it with its lamps on, over the ford's sill, round onto the service lane and
  // east under the cliff into the old tunnel's mouth. The fall closes, and Alfred raises his arm and lowers it.
  //
  // The car comes through the fall at a creep with its lamps on, its tail through the rolled-up door at the grotto's
  // back, sweeps round onto the service lane and stands still for a beat while it shows its party trick; then it
  // launches east with both jets burning, from standing to fast at a constant push, straight into the old tunnel, and
  // is gone when its nose would come out of the spur's far side. Batman and Robin are not seen in it: its canopy is
  // dark glass.
  {
    const car = machine('batmobile');
    const terraceY = ALFRED.y;
    // the two marks on the terrace walk, either side of the tower's porch, and where each comes in through the fall
    const BL = spot(BATMOBILE.x - 5.7, -86.0, S, terraceY + 1), RL = spot(BATMOBILE.x + 5.7, -86.0, S, terraceY + 1);
    const curtainZ = FALL_FOOT.z;
    const DIVE = 2.2;
    /** Over the balustrade and down on the line, in through the curtain at `xe`, and gone: `t0` when it begins. */
    const dive = (m: Spot, xe: number, t0: number, tb: number): State => {
      const g = glowB();
      if (tb < t0) return still(m, { head: 0.2 * Math.sin(tb * 0.7) }, g);
      const t = tb - t0, fast: V3 = [m.x, terraceY + 0.9, curtainZ + 0.1];
      if (t < 0.4) return still(m, leap(0.1 + 0.25 * (t / 0.4)), { ...g, cape: 0.3 });
      const V: V3 = [m.x, m.y + 1.6, curtainZ + 0.4];
      if (t < 0.9) {
        const u = ease((t - 0.4) / 0.5);
        return still(at(m.x, lerp(m.y, V[1], u), lerp(m.z, V[2], u), S), leap(0.35 + 0.3 * u), { ...g, aloft: true, cape: 0.6, line: fast });
      }
      if (t < DIVE) {
        const u = (t - 0.9) / (DIVE - 0.9), Q: V3 = [lerp(m.x, xe, 0.35), m.y - 2.5, -81.2], E3: V3 = [xe, BATMOBILE.y + 1.0, curtainZ - 0.4];
        const bz = (a: number, b: number, c: number): number => (1 - u) * (1 - u) * a + 2 * u * (1 - u) * b + u * u * c;
        const dx = 2 * (1 - u) * (Q[0] - V[0]) + 2 * u * (E3[0] - Q[0]), dz = 2 * (1 - u) * (Q[2] - V[2]) + 2 * u * (E3[2] - Q[2]);
        const rising = u < 0.5;
        return still(at(bz(V[0], Q[0], E3[0]), bz(V[1], Q[1], E3[1]), bz(V[2], Q[2], E3[2]), Math.atan2(dz, dx)), rising ? swing(u / 0.5) : glide((u - 0.5) / 0.5), {
          ...g, aloft: true, cape: 1, spread: rising ? 0.2 : ease((u - 0.5) / 0.3), line: rising ? fast : null, pitch: rising ? 0.3 : 0.45,
        });
      }
      return hidden(at(xe, BATMOBILE.y, BATMOBILE.z, S));
    };
    // Robin's line from the Elliot Tower would clip a spire of the Crown on its way to the walk by the porch, so he lands
    // further west on the walk, by the west pavilion, and runs along it to his place
    const RM = spot(BATMOBILE.x - 14, -86.2, E, terraceY + 1), robRun = walkLeg(RM, BL, RUN);
    const T_BAT = 1.0, T_ROB = 0.2 + robRun.dur + 0.1, XB = BATMOBILE.x - 0.6, XR = BATMOBILE.x + 0.6;

    // ---- the car's way, fitted to the car as built: 5.4 long and 3.84 across, its widest part the wing at its tail
    // (OUTLINE, x forward from its middle and the half-width there), with 0.1 to spare all round. Its length and width
    // come from the machine; the console says so if the machine is bigger than the car the way was fitted for.
    const OUTLINE: [number, number][] = [[2.45, 0.2], [2.05, 0.66], [1.6, 1.06], [1.12, 1.66], [0.78, 1.66], [-0.05, 0.78], [-1.25, 0.78], [-1.62, 1.92], [-2.685, 1.92]];
    /** Its half-width at x along it: the outline, or its front tyres' outer faces where they stand out further. */
    const halfAt = (x: number): number => {
      let w = x >= 1.565 && x <= 2.565 ? 1.755 : 0;
      for (let i = 0; i + 1 < OUTLINE.length; i++) { const [a, wa] = OUTLINE[i], [b, wb] = OUTLINE[i + 1]; if (x <= a && x >= b) w = Math.max(w, wb + ((wa - wb) * (x - b)) / (a - b)); }
      return w;
    };
    const FIT = { length: 5.4, width: 3.84 };
    const LEN = car?.length ?? FIT.length, WID = car?.width ?? FIT.width, NOSE = LEN / 2;
    if (import.meta.env.DEV && (LEN > FIT.length + 0.05 || WID > FIT.width + 0.05)) console.warn(`Gotham: the Batmobile is ${LEN} by ${WID}, and its way out of the grotto was fitted for ${FIT.length} by ${FIT.width}.`);
    // A point REF ahead of its middle follows the way: south down the ford 0.2 west of its middle, then one smooth left
    // sweep, its curvature easing up over 3 to 0.225 (a radius of 4.4), until it heads east on the lane with its middle
    // on the old tunnel's middle (z -82.4); and so straight east into the tunnel. (Found by a search of such sweeps
    // against the mouth's rock, the walls, the door and the cliff's piers: its wing then stands 0.18 off the piers and
    // its south side at -80.48, and no part goes further south than that while it turns.)
    const REF = 1.25, X0 = BATMOBILE.x - 0.2, K = 0.225, RAMP = 3, STEP = 0.1;
    const way: [number, number, number][] = [];
    /** Where along its way the sweep ends and the car heads east on the lane, where it stands for a beat. */
    let STOP_I = 0;
    {
      // the sweep from where it begins, as places and headings, to learn how far south it carries the car
      const sweep: [number, number, number][] = [];
      {
        let x = 0, z = 0, h = S, d = 0;
        while (h > 0) { sweep.push([x, z, h]); x += Math.cos(h) * STEP; z += Math.sin(h) * STEP; h = Math.max(0, h - K * Math.min(1, d / RAMP) * STEP); d += STEP; }
        sweep.push([x, z, E]);
      }
      const z0 = OLD_TUNNEL.z - sweep[sweep.length - 1][1];
      // it is shown when its nose is at the curtain, and comes down the ford to where the sweep begins
      const zIn = curtainZ - 0.1 - NOSE + REF;
      for (let z = zIn; z < z0 - 1e-6; z += STEP) way.push([X0, z, S]);
      for (const [x, z, h] of sweep) way.push([X0 + x, z0 + z, h]);
      STOP_I = way.length - 1;
      const xe = X0 + sweep[sweep.length - 1][0];
      for (let xx = xe + STEP; xx <= OLD_TUNNEL.x + 12; xx += STEP) way.push([xx, OLD_TUNNEL.z, E]);
    }
    // measured along the way, and turned into where the car's middle is
    const wayLen: number[] = [0];
    for (let i = 1; i < way.length; i++) wayLen.push(wayLen[i - 1] + Math.hypot(way[i][0] - way[i - 1][0], way[i][1] - way[i - 1][1]));
    const S_STOP = wayLen[STOP_I];
    const B: Path = {
      len: wayLen[wayLen.length - 1],
      at(s) {
        const d = clamp(s, 0, wayLen[wayLen.length - 1]);
        let i = 1;
        while (i < way.length - 1 && wayLen[i] < d) i++;
        const a = way[i - 1], b = way[i], f = (d - wayLen[i - 1]) / Math.max(1e-6, wayLen[i] - wayLen[i - 1]), h = turnTo(a[2], b[2], f);
        return [lerp(a[0], b[0], f) - Math.cos(h) * REF, lerp(a[1], b[1], f) - Math.sin(h) * REF, h];
      },
    };
    // ---- how it goes: out at a creep (up to CREEP over a second, and down to standing over the last 1.4 of the
    // sweep), still for a beat while it shows its party trick (PARTY), and then a launch at a constant push of PUSH:
    // its way goes with the square of the time
    const T_PART = 7, T_OUT = 8.5, CREEP = 2.2, PUSH = 24, PARTY = 1.2, BEAT = 1.6;
    const S_GONE = (() => { let s = S_STOP; while (s < B.len && B.at(s)[0] + NOSE < OLD_TUNNEL.x + 6.0) s += 0.05; return s; })();
    const UP = 1.0, DOWN = 1.4, sUp = (CREEP * UP) / 2, sDown = (CREEP * DOWN) / 2, cruise = Math.max(0, S_STOP - sUp - sDown) / CREEP;
    const T_STOP = T_OUT + UP + cruise + DOWN, T_LAUNCH = T_STOP + BEAT, T_GONE = T_LAUNCH + Math.sqrt((2 * (S_GONE - S_STOP)) / PUSH);
    /** How far along its way it is at body time tb, and how fast it truly goes then. */
    const motion = (tb: number): { s: number; v: number } => {
      if (tb <= T_OUT) return { s: 0, v: 0 };
      const t = tb - T_OUT;
      if (t < UP) return { s: (CREEP * t * t) / (2 * UP), v: (CREEP * t) / UP };
      if (t < UP + cruise) return { s: sUp + CREEP * (t - UP), v: CREEP };
      if (tb < T_STOP) { const r = T_STOP - tb; return { s: S_STOP - (CREEP * r * r) / (2 * DOWN), v: (CREEP * r) / DOWN }; }
      if (tb < T_LAUNCH) return { s: S_STOP, v: 0 };
      const u = tb - T_LAUNCH;
      return { s: Math.min(S_GONE, S_STOP + 0.5 * PUSH * u * u), v: tb < T_GONE ? PUSH * u : 0 };
    };
    const sOf = (tb: number): number => motion(tb).s;
    // (inside the hill, behind the grotto's door or in the old tunnel, the floor is the ford's or the lane's)
    const yAt = (x: number, z: number): number => { const y = gy(x, z, BATMOBILE.y + 0.3); return Number.isFinite(y) && y > Y.shelf - 0.3 ? y : x > OLD_TUNNEL.x - 1 ? SHOW_LANES.service.y : BATMOBILE.y; };
    /** Where the car is at body time tb: its wheels' height and its nose's pitch from its axles, which way, how fast, and whether it shows. */
    const carAt = (tb: number): { x: number; y: number; z: number; h: number; pitch: number; v: number; shown: boolean } => {
      const { s, v } = motion(tb), p = B.at(s), c = Math.cos(p[2]), sn = Math.sin(p[2]);
      // each axle rides on the higher of its two wheels' ground, so that no wheel sinks into the ford's sill
      // (and a little ahead and behind it, so that the car's belly rides over the sill's edge rather than through it)
      // (and across its whole width, so that its sides ride over it too)
      const AX = LEN * 0.384, TR = WID / 2;
      const wheel = (d: number): number => Math.max(...[-1, -0.5, 0, 0.5, 1].map((f) => yAt(p[0] + c * d - sn * TR * f, p[1] + sn * d + c * TR * f)));
      // (out to its nose, its splitter and its tail, so that they ride over the step from the ford down to the lane)
      const axle = (d: number): number => Math.max(...[-1, -0.5, 0, 0.5, 1].map((f) => wheel(d + f * 0.85)));
      const yF = axle(AX), yR = axle(-AX);
      return { x: p[0], y: (yF + yR) / 2, z: p[1], h: p[2], pitch: Math.atan2(yF - yR, 2 * AX), v, shown: tb >= T_OUT && s < S_GONE };
    };
    // when its tail has cleared the curtain, so that the fall may close
    let T_CLEAR = T_OUT + 6;
    for (let t = T_OUT; t < T_GONE; t += 0.05) {
      const q = carAt(t), c = Math.cos(q.h), sn = Math.sin(q.h);
      if (Math.min(...[-WID / 2, WID / 2].map((w) => q.z - sn * NOSE + c * w)) > curtainZ + 0.6) { T_CLEAR = t; break; }
    }
    // and when it is through the door at the grotto's back (z -91), so that the shutter may come down behind it
    let T_DOOR = T_OUT + 3;
    for (let t = T_OUT; t < T_GONE; t += 0.05) {
      const q = carAt(t), c = Math.cos(q.h), sn = Math.sin(q.h);
      if (Math.min(...[-WID / 2, WID / 2].map((w) => q.z - sn * NOSE + c * w)) > -90.6) { T_DOOR = t; break; }
    }
    const door = (tb: number): number => ease(span(tb, T_PART - 1.5, T_PART)) * (1 - ease(span(tb, T_DOOR + 0.3, T_DOOR + 2)));
    const BODY = Math.max(T_GONE + 1.5, T_CLEAR + 6.5);
    const part = (tb: number): number => {
      const each = (t: number): number => 0.42 * Math.sin(Math.PI * span(tb, t - 0.6, t + 0.5));
      return Math.max(each(T_BAT + DIVE - 0.15), each(T_ROB + DIVE - 0.15), ease(span(tb, T_PART, T_OUT)) * (1 - ease(span(tb, T_CLEAR, T_CLEAR + 2))));
    };
    let lastTb = 0;
    if (import.meta.env.DEV) {
      devChecks.batcave = () => {
        const poses: Pose3[] = [];
        for (let t = T_OUT; t < T_GONE; t += 0.1) { const q = carAt(t); if (q.shown) poses.push(q); }
        // its outline (and its front tyres) every 0.1 along it, as it is and with 0.1 to spare
        const rim = (spare: number): [number, number][] => {
          const pts: [number, number][] = [];
          for (let x = -2.685 - spare; x <= 2.565 + spare + 1e-9; x += 0.1) { const w = halfAt(clamp(x, -2.685, 2.565)) + spare; for (let f = -1; f <= 1.0001; f += 0.25) pts.push([x, w * f]); }
          return pts;
        };
        let south = -Infinity, north = Infinity, southT = 0, mx0 = Infinity, mx1 = -Infinity;
        for (let t = T_OUT; t < T_GONE; t += 0.05) {
          const q = carAt(t), c = Math.cos(q.h), sn = Math.sin(q.h);
          if (!q.shown) continue;
          for (const [lx, lz] of rim(0)) {
            const x = q.x + c * lx - sn * lz, z = q.z + sn * lx + c * lz;
            if (z > south) { south = z; southT = t; }
            north = Math.min(north, z);
            if (z > -85.35 && z < -84.55) { mx0 = Math.min(mx0, x); mx1 = Math.max(mx1, x); }
          }
        }
        // from its splitter to its top
        const body: Shape = [{ pts: rim(0.1), ys: [0.1, 0.6, 1.1, 1.45] }];
        // what is through the door at the grotto's back, in the hill's passage, and inside the old tunnel's portal, is
        // inside the hill and not seen (the car is shown from the moment its nose reaches the curtain, as the plan has it)
        const hill = (x: number, z: number): boolean => (z < -91 && Math.abs(x - BATMOBILE.x) < 2.8) || (x > OLD_TUNNEL.x + 0.4 && Math.abs(z - OLD_TUNNEL.z) < 2.15);
        return `${touching(poses, body, hill)} (${LEN} by ${WID}); its southmost at z ${south.toFixed(2)} at ${southT.toFixed(2)} s, its northmost at z ${north.toFixed(2)}; at the mouth's plate from x ${mx0.toFixed(2)} to ${mx1.toFixed(2)}; out at ${T_OUT} s, still at ${T_STOP.toFixed(1)} s, launched at ${T_LAUNCH.toFixed(1)} s, the door down from ${(T_DOOR + 0.3).toFixed(1)} s, the fall shut at ${(T_CLEAR + 2).toFixed(1)} s, gone at ${T_GONE.toFixed(1)} s at ${(PUSH * (T_GONE - T_LAUNCH)).toFixed(0)} a second`;
      };
    }
    book.stories.push({
      id: 'batcave', name: 'Out of the Batcave', cast: ['batman', 'robin', 'alfred'], holds: ['grotto', 'batmobile', 'terrace'], weight: 1,
      // Robin comes from the Elliot Tower in the west, Batman from Wayne Tower: each to the side his line reaches soonest
      marks: { batman: RL, robin: RM, alfred: 'post' }, body: BODY,
      play(tb, P) {
        // the two over the balustrade and in through the fall, and hidden from then on: the car's canopy is dark glass,
        // and nobody is seen in it
        const ride = (id: string, m: Spot, xe: number, t0: number): void => P.put(id, dive(m, xe, t0, tb));
        ride('batman', P.from('batman'), XR, T_BAT);
        if (tb < 0.2) P.put('robin', still(P.from('robin'), {}, glowB()));
        else if (tb < 0.2 + robRun.dur) P.put('robin', { ...robRun.at(tb - 0.2), ...glowB() });
        else ride('robin', BL, XB, T_ROB);
        // Alfred looks over the balustrade after each, watches the car away east, and raises his arm when the fall has closed
        const a = P.from('alfred');
        const over = Math.max(Math.sin(Math.PI * span(tb, T_BAT + 0.5, T_BAT + DIVE + 1.2)), Math.sin(Math.PI * span(tb, T_ROB + 0.5, T_ROB + DIVE + 1.2)));
        // (Batman to the east of the porch, his left; Robin to the west, his right)
        const look = tb < T_ROB + 0.9 ? -0.75 * ease(span(tb, T_BAT, T_BAT + 0.6)) : tb < T_OUT ? lerp(-0.75, 0.7, ease(span(tb, T_ROB + 0.9, T_ROB + 1.6))) * (1 - ease(span(tb, T_ROB + DIVE + 1.2, T_ROB + DIVE + 2.2))) : -0.75 * ease(span(tb, T_OUT + 1.5, T_OUT + 4));
        const arm = ease(span(tb, T_CLEAR + 2.2, T_CLEAR + 3.2)) * (1 - ease(span(tb, T_CLEAR + 4.6, T_CLEAR + 5.8)));
        P.put('alfred', still(a, { ...blend({ armL: -0.35, armR: -0.35, spreadL: -0.1, spreadR: -0.1, elbowL: 0.9, elbowR: 0.9 }, { armR: 2.7, spreadR: 0.3, elbowR: 0.25, armL: -0.35, spreadL: -0.1, elbowL: 0.9 }, arm), nod: 0.15 + 0.5 * over, head: look }));
      },
      props(tb, live) {
        const dt = clamp(tb - lastTb, 0, 0.1);
        lastTb = tb;
        const c = carAt(tb);
        if (car) {
          car.at(c.x, c.y, c.z, c.h, c.pitch, 0);
          car.shown(c.shown);
          car.lights(c.shown ? 1 : 0);
          car.trick('canopy', 0);
          // its party trick while it stands on the lane, kept while it goes; and both jets from the instant it launches
          car.trick('party', c.shown ? ease(span(tb, T_STOP, T_STOP + PARTY)) : 0);
          car.trick('jet', tb >= T_LAUNCH && c.shown ? 1 : 0);
          if (live && c.shown) car.run(c.v, dt);
        }
        W.air?.waterfall(part(tb));
        W.hatch?.door?.(door(tb));
        // the bats pour out of the cleft and away into the night
        if (bats) {
          const u = span(tb, 0, 11), n = Math.round(40 * ease(span(tb, 0, 2)) * (1 - span(tb, 9, 12)));
          bats.shown(n > 0);
          if (n > 0) bats.set({ x: CREVICE.x + 12 * u, y: CREVICE.y + 2 + 18 * u, z: CREVICE.z + 14 * u, spread: 2 + 9 * u, tall: 1.5 + 4 * u, n, swirl: 1.4, heading: Math.atan2(14, 12), stream: 0.6 });
        }
      },
      end() { car?.shown(false); car?.lights(0); car?.trick('canopy', 0); car?.trick('party', 0); car?.trick('jet', 0); W.air?.waterfall(0); W.hatch?.door?.(0); bats?.shown(false); lastTb = 0; },
    });
  }

  // ================================================================== 3. The Batwing's patrol
  // The Batplane of Det. 31 (1939) and its line of flyers [wp Batplane], here as the hovering Batwing the collector
  // asked for. The Manor's mirror pool opens, the lift brings it up into the pool garden, and it rises on its fans,
  // patrols slowly over the city at 60 to 75, hovers with its searchlight on the police roof, the harbour and the East
  // End, and comes home to the lift, which takes it down under the pool again. Its pilot is one of the Robins in
  // turn, or now and then Batman himself: four stories that share the craft and never play together.
  {
    let craft: Machine | null = null;
    let kind = 'none';
    try { craft = machine('batwing'); kind = craft ? 'batwing' : 'none'; } catch { craft = null; }
    if (!craft) { craft = machine('batplane'); kind = craft ? 'batplane' : 'none'; }
    if (import.meta.env.DEV) console.info(`Gotham: the west's patrol flies the ${kind}.`);
    // The pad is the lift under the Manor's mirror pool: down at `padY` in the shaft, up at `topY` level with the
    // garden. The craft stands on it nose east, to the garden's east walk, where a pilot who comes on a line lands.
    const pad = at(HATCH.x, PAD.y, HATCH.z, E), padY = PAD.y, topY = HATCH.y;
    /** How high a leg must fly: over 62 and 9 clear of everything within 8 of its line. */
    const cruise = (ax: number, az: number, bx: number, bz: number, least = 62): number => {
      let top = 0;
      for (let i = 0; i <= 40; i++) {
        const x = lerp(ax, bx, i / 40), z = lerp(az, bz, i / 40);
        for (const [dx, dz] of [[0, 0], [7, 0], [-7, 0], [0, 7], [0, -7], [5, 5], [-5, 5], [5, -5], [-5, -5]]) top = Math.max(top, W.solid.top(x + dx, z + dz));
      }
      if (import.meta.env.DEV && top + 9 > 75) console.warn(`Gotham: a leg of the Batwing's patrol passes within 9 of what is built (top ${top.toFixed(1)}).`);
      return Math.min(75, Math.max(least, top + 9));
    };
    // where it hovers, and the roof its light falls on
    const STOPS = [
      { x: gcpd.x1 + 4, z: gcpd.z1 + 4, tx: (gcpd.x0 + gcpd.x1) / 2, tz: (gcpd.z0 + gcpd.z1) / 2 },
      { x: 26, z: 66, tx: 18, tz: 61 },
      { x: 47, z: 6, tx: 47, tz: -5 },
    ];
    type Kind = 'open' | 'rise' | 'board' | 'pad' | 'spin' | 'lift' | 'turn' | 'move' | 'hover' | 'land' | 'sink' | 'settle' | 'rest' | 'alight' | 'lower' | 'shut';
    interface Phase { t0: number; t1: number; kind: Kind; a: [number, number, number]; b: [number, number, number]; h0: number; h1: number; light?: [number, number, number] }
    const phases: Phase[] = [];
    let t = 0;
    const add = (p: Omit<Phase, 't0' | 't1'>, dur: number): Phase => { const ph = { ...p, t0: t, t1: t + dur }; phases.push(ph); t += dur; return ph; };
    const legY = [cruise(pad.x, pad.z, STOPS[0].x, STOPS[0].z), cruise(STOPS[0].x, STOPS[0].z, STOPS[1].x, STOPS[1].z), cruise(STOPS[1].x, STOPS[1].z, STOPS[2].x, STOPS[2].z), cruise(STOPS[2].x, STOPS[2].z, pad.x, pad.z)];
    const P0: [number, number, number] = [pad.x, padY, pad.z], PU: [number, number, number] = [pad.x, topY, pad.z];
    let here: [number, number, number] = [pad.x, legY[0], pad.z], head = pad.h;
    // the pool opens, the lift brings it up into the garden, the pilot climbs in, the fans to full, a beat, and it lifts
    const OPEN = add({ kind: 'open', a: P0, b: P0, h0: head, h1: head }, 3.0);
    const RISE = add({ kind: 'rise', a: P0, b: PU, h0: head, h1: head }, 3.5);
    const BOARD = add({ kind: 'board', a: PU, b: PU, h0: head, h1: head }, 1.0);
    const SPIN = add({ kind: 'spin', a: PU, b: PU, h0: head, h1: head }, 2.0);
    add({ kind: 'pad', a: PU, b: PU, h0: head, h1: head }, 0.7);
    const LIFT = add({ kind: 'lift', a: PU, b: here, h0: head, h1: head }, 4.8);
    const route = [...STOPS.map((s, i) => ({ x: s.x, z: s.z, y: legY[i], light: [s.tx, W.solid.top(s.tx, s.tz), s.tz] as [number, number, number] })), { x: pad.x, z: pad.z, y: legY[3], light: undefined }];
    route.forEach((r, i) => {
      const to: [number, number, number] = [r.x, Math.max(legY[i], i > 0 ? legY[i - 1] : 0, r.y), r.z];
      const hh = Math.atan2(to[2] - here[2], to[0] - here[0]);
      add({ kind: 'turn', a: here, b: here, h0: head, h1: hh }, 0.9);
      const d = Math.hypot(to[0] - here[0], to[2] - here[2]);
      add({ kind: 'move', a: here, b: to, h0: hh, h1: hh }, Math.max(3, d / 21));
      here = to; head = hh;
      if (r.light) {
        const hl = Math.atan2(r.light[2] - to[2], r.light[0] - to[0]);
        add({ kind: 'hover', a: to, b: to, h0: hh, h1: hl, light: r.light }, 2.9);
        head = hl;
      }
    });
    // over the garden, the pool opens and the lift comes up under it
    const HOME = add({ kind: 'turn', a: here, b: here, h0: head, h1: pad.h }, 1.1);
    // down on its belly: to ten over the platform, slowly to two, more slowly still to rest, and the fans down once it
    // has settled; the pilot who lives here climbs out; the lift takes it down and the pool shuts over it
    add({ kind: 'land', a: here, b: [pad.x, topY + 10, pad.z], h0: pad.h, h1: pad.h }, 3.2);
    add({ kind: 'sink', a: [pad.x, topY + 10, pad.z], b: [pad.x, topY + 2, pad.z], h0: pad.h, h1: pad.h }, 3.6);
    add({ kind: 'settle', a: [pad.x, topY + 2, pad.z], b: PU, h0: pad.h, h1: pad.h }, 2.8);
    const REST = add({ kind: 'rest', a: PU, b: PU, h0: pad.h, h1: pad.h }, 2.2);
    const ALIGHT = add({ kind: 'alight', a: PU, b: PU, h0: pad.h, h1: pad.h }, 1.3);
    const LOWER = add({ kind: 'lower', a: PU, b: P0, h0: pad.h, h1: pad.h }, 3.5);
    const SHUT = add({ kind: 'shut', a: P0, b: P0, h0: pad.h, h1: pad.h }, 3.0);
    const BODY = t + 0.4;
    // once it is 12 clear of the garden on the way up, the lift goes down and the pool shuts under it
    let T_CLEAR = LIFT.t1;
    for (let q = LIFT.t0; q < LIFT.t1; q += 0.05) if (lerp(topY, LIFT.b[1], ease(span(q, LIFT.t0, LIFT.t1))) > topY + 12) { T_CLEAR = q; break; }
    /** The pool and the lift at body time tb: how far open, and how far up. */
    const hatchAt = (tb: number): { open: number; lift: number } => (tb < HOME.t0
      ? { open: ease(span(tb, OPEN.t0, OPEN.t1)) * (1 - ease(span(tb, T_CLEAR + 3.5, T_CLEAR + 6.5))), lift: ease(span(tb, RISE.t0, RISE.t1)) * (1 - ease(span(tb, T_CLEAR, T_CLEAR + 3.5))) }
      : { open: ease(span(tb, HOME.t0, HOME.t0 + 3)) * (1 - ease(span(tb, SHUT.t0, SHUT.t1))), lift: ease(span(tb, HOME.t0 + 3, HOME.t0 + 6.5)) * (1 - ease(span(tb, LOWER.t0, LOWER.t1))) });
    const craftAt = (tb: number): { x: number; y: number; z: number; h: number; pitch: number; v: number; rotors: number; light: [number, number, number] | null; lf: number } => {
      const ph = phases.find((p) => tb >= p.t0 && tb < p.t1) ?? (tb < 0 ? phases[0] : phases[phases.length - 1]);
      const u = span(tb, ph.t0, ph.t1);
      const rotors = tb < SPIN.t0 || tb >= ALIGHT.t0 ? 0 : ph === SPIN ? ease(u) : ph === REST ? (u < 0.5 ? lerp(1, 0.3, ease(u * 2)) : lerp(0.3, 0, ease(u * 2 - 1))) : 1;
      if (ph.kind === 'rise' || ph.kind === 'lower') {
        // on the lift, its belly on the platform: exactly as the lift goes
        const y = padY + (topY - padY) * hatchAt(tb).lift;
        return { x: pad.x, y, z: pad.z, h: pad.h, pitch: 0, v: 0, rotors, light: null, lf: 0 };
      }
      if (ph.kind === 'open' || ph.kind === 'board' || ph.kind === 'alight' || ph.kind === 'shut' || ph.kind === 'rest') return { x: ph.a[0], y: ph.a[1], z: ph.a[2], h: pad.h, pitch: 0, v: ph.kind === 'rest' ? rotors : 0, rotors, light: null, lf: 0 };
      if (ph.kind === 'sink' || ph.kind === 'settle') {
        const e = ph.kind === 'sink' ? u : 1 - (1 - u) * (1 - u);
        return { x: ph.a[0], y: lerp(ph.a[1], ph.b[1], e), z: ph.a[2], h: ph.h0, pitch: 0, v: 1, rotors, light: null, lf: 0 };
      }
      if (ph.kind === 'move') {
        const e = ease(u), x = lerp(ph.a[0], ph.b[0], e), z = lerp(ph.a[2], ph.b[2], e), y = lerp(ph.a[1], ph.b[1], e);
        const d = Math.hypot(ph.b[0] - ph.a[0], ph.b[2] - ph.a[2]);
        return { x, y, z, h: ph.h0, pitch: -0.16 * Math.sin(Math.PI * u), v: (6 * u * (1 - u) * d) / (ph.t1 - ph.t0), rotors, light: null, lf: 0 };
      }
      if (ph.kind === 'lift' || ph.kind === 'land') {
        const e = ease(u);
        return { x: ph.a[0], y: lerp(ph.a[1], ph.b[1], e), z: ph.a[2], h: ph.h0, pitch: 0, v: 2, rotors, light: null, lf: 0 };
      }
      const lf = ph.kind === 'hover' ? Math.sin(Math.PI * clamp(u * 1.4)) : 0;
      return { x: ph.a[0], y: ph.a[1] + (ph.kind === 'hover' ? 0.4 * Math.sin(tb * 2) : 0), z: ph.a[2], h: turnTo(ph.h0, ph.h1, ease(u)), pitch: 0, v: ph.kind === 'pad' && tb >= phases[phases.length - 1].t0 ? 0 : 1, rotors, light: ph.light ?? null, lf };
    };
    // on the garden's east walk, between the shaft and the house's west end, before the craft's nose
    const BOARD_AT = spot(pad.x + 8.2, pad.z, WEST, topY + 1);
    const seatAt = (s: V3, h: number): Spot => at(s[0], s[1], s[2], h);
    let lastTb = 0;
    if (import.meta.env.DEV) {
      devChecks.batwing = () => {
        const poses: Pose3[] = [];
        for (let q = 0; q < BODY; q += 0.1) { const c = craftAt(q); if (c.y < topY + 16) poses.push(c); }
        // and how near it comes to the hero's place on the lawn, which is kept 5 clear
        const hero = HERO_SPOTS.find((s) => s.id === 'garden') ?? { x: 2.5, z: -104.5 };
        let near = Infinity;
        for (const q of poses) for (const [lx, lz] of WING_SHAPE[0].pts) near = Math.min(near, Math.hypot(q.x + Math.cos(q.h) * lx - Math.sin(q.h) * lz - hero.x, q.z + Math.sin(q.h) * lx + Math.cos(q.h) * lz - hero.z));
        return `${touching(poses, WING_SHAPE)} below ${topY + 16}; ${near.toFixed(1)} from the hero's place; the pool shut at ${(T_CLEAR + 6.5).toFixed(1)} s and again at ${SHUT.t1.toFixed(1)} s of ${BODY.toFixed(1)}`;
      };
    }
    /**
     * A patrol with this pilot. One who lives at the Manor comes on his line to the garden's walk, climbs in when the
     * lift is up, and climbs out on the garden when it is home; one who rests far off is in the seat as it rises, and
     * goes down with it into the shaft.
     */
    const patrol = (id: string, pilot: 'robin' | 'damian' | 'nightwing' | 'batman', weight: number, boards: boolean, may?: (w: World) => boolean): void => {
      book.stories.push({
        id, name: `the Batwing's patrol (${pilot})`, cast: [pilot], holds: ['sky', 'batwingCraft', 'hatch'], weight, marks: { [pilot]: boards ? BOARD_AT : 'post' }, body: BODY,
        may: (w) => !!w.hatch && (may?.(w) ?? true),
        play(tb, P) {
          const c = craftAt(tb);
          const seat = seatOn(craft, c.x, c.y, c.z, c.h, c.pitch, 0, [3.3, 0.05, 0]);
          const g = glowB();
          const sat = (): State => still(at(seat[0], seat[1], seat[2], c.h), drive((tb * 0.25) % 1), { ...g, aloft: true, close: true, cape: 0.1 });
          if (!boards) {
            const post = W.posts[pilot];
            if (post && tb < 0.3) P.put(pilot, still(post, perch(0), g));
            else if (tb < SHUT.t1) P.put(pilot, sat());
            else P.put(pilot, hidden(seatAt(seat, c.h)));
            return;
          }
          const by = P.from(pilot);
          /** A hop between the walk and the seat, up over the craft's nose. */
          const hop = (u: number, a: Spot, b: V3, h0: number, h1: number): State => still(at(lerp(a.x, b[0], ease(u)), lerp(a.y, b[1], ease(u)) + 1.6 * Math.sin(Math.PI * u), lerp(a.z, b[2], ease(u)), turnTo(h0, h1, ease(u))), leap(0.3 + 0.6 * u), { ...g, aloft: true, close: true });
          if (tb < BOARD.t0) P.put(pilot, still(by, { head: tb > OPEN.t0 + 1 ? 0.3 * Math.sin(tb * 0.5) : 0, nod: tb > OPEN.t0 + 0.5 ? 0.35 : 0 }, g));
          else if (tb < BOARD.t1) P.put(pilot, hop(span(tb, BOARD.t0, BOARD.t1), by, seat, by.h, c.h));
          else if (tb < ALIGHT.t0) P.put(pilot, sat());
          else if (tb < ALIGHT.t0 + 1.0) {
            P.put(pilot, hop(span(tb, ALIGHT.t0, ALIGHT.t0 + 1.0), at(seat[0], seat[1], seat[2], c.h), [by.x, by.y, by.z], c.h, by.h));
          } else P.put(pilot, still(by, { nod: tb > LOWER.t0 ? 0.35 : 0, head: 0.2 * Math.sin(tb * 0.4) }, g));
        },
        props(tb, live) {
          const dt = clamp(tb - lastTb, 0, 0.1);
          lastTb = tb;
          const c = craftAt(tb), hq = hatchAt(tb);
          W.hatch?.open(hq.open);
          W.hatch?.lift(hq.lift);
          if (craft) {
            craft.shown(true);
            craft.lights(Math.max(0.35, night()) * (tb > SPIN.t0 ? 1 : 0.4));
            craft.trick('rotors', c.rotors);
            craft.trick('light', c.lf);
            if (live) craft.run(c.v * c.rotors, dt);
          }
          // the pool its searchlight throws on the roof below
          if (c.light && c.lf > 0.02) W.rings.set(6, [c.light[0], c.light[1] + 0.12, c.light[2]], 3.2, c.lf * (0.3 + 0.5 * night()), 0xfff1c8);
          else W.rings.set(6, [0, 0, 0], 1, 0);
        },
        end() { craft?.shown(false); craft?.lights(0); craft?.trick('rotors', 0); craft?.trick('light', 0); W.rings.set(6, [0, 0, 0], 1, 0); W.hatch?.open(0); W.hatch?.lift(0); lastTb = 0; },
      });
    };
    patrol('batwing', 'robin', 0.45, false);
    patrol('batwingDamian', 'damian', 0.3, true);
    patrol('batwingNightwing', 'nightwing', 0.3, false, (w) => !!w.posts.nightwing);
    patrol('batwingBatman', 'batman', 0.3, true);
  }

  // ================================================================== 4. The Cat and the Bat
  // Batman 1 to 3 (1940): Catwoman's escapes over the roofs, the jewel given back, her whip [wp Catwoman; rogues
  // note, story 5]. She crosses to the northern jeweller's on her whip, lifts a diamond from the skylight, comes back
  // roof to roof, finds Batman landed before her, tosses him the diamond, bows, and is gone over the bank's roof.
  {
    const d2 = lotOf('diamond-2'), bank = lotOf('bank');
    const roofY = CAT_ROOF.y;
    const back = at(d2.x0 + 5, roofY, d2.z0 + 4.2, S);
    const batSpot = facing(at(d2.x0 + 3.4, roofY, d2.z0 + 7.6, N), back.x, back.z);
    const bankLand = spot(bank.x1 - 3, bank.z0 + 5, E, BANK_ROOF.y + 1);
    const bankEdge = at(bank.x1 - 0.9, bankLand.y, bankLand.z, E), bankOut = at(bank.x1 + 1.1, bankLand.y, bankLand.z, E);
    const legA = lineLeg(W.solid, CAT_ROOF, SKYLIGHT), A1 = 0.5 + legA.dur;
    const legB = lineLeg(W.solid, SKYLIGHT, back), B0 = A1 + 3.4, B1 = B0 + legB.dur;
    const LAND = B1 + 1.5;
    const legC = lineLeg(W.solid, facing(back, bankLand.x, bankLand.z), bankLand), C0 = LAND + 6.8, C1 = C0 + legC.dur;
    const BODY = C1 + 5;
    let batLeg: Leg | null = null;
    const CAT_PATH = pathOf([[CAT_SPOT.x, CAT_SPOT.z], [d2.x0 + 1.2, d2.z1 - 0.5], [d2.x1 - 0.6, d2.z1 - 0.5]]);
    let her: State = still(CAT_ROOF), him: State = still(batSpot);
    book.stories.push({
      id: 'cat', name: 'the Cat and the Bat', cast: ['catwoman', 'batman'], holds: ['diamondRoofNorth', 'diamondRoofSouth', 'bankRoof'], weight: 1,
      marks: { catwoman: 'post', batman: 'post' }, body: BODY,
      play(tb, P) {
        const home = P.from('batman');
        batLeg ??= lineLeg(W.solid, home, batSpot);
        const g = glowB();
        // Catwoman
        if (tb < 0.5) her = still(CAT_ROOF, perch(0), g);
        else if (tb < A1) her = { ...legA.at(tb - 0.5), hold: 1, ...g };
        else if (tb < A1 + 0.8) her = still(SKYLIGHT, kneel(span(tb, A1, A1 + 0.8)), g);
        else if (tb < A1 + 2.6) her = still(SKYLIGHT, { ...kneel(1), armR: 0.9 + 0.8 * span(tb, A1 + 1.2, A1 + 2.4), elbowR: 0.4, nod: 0.5 }, g);
        else if (tb < B0) her = still(SKYLIGHT, blend(kneel(1), { armR: 1.4, elbowR: 1.2 }, span(tb, A1 + 2.6, A1 + 3.2)), g);
        else if (tb < B1) her = { ...legB.at(tb - B0), hold: 1, ...g };
        else if (tb < LAND + 2.5) her = still(facing(back, batSpot.x, batSpot.z), { head: 0.2 * Math.sin(tb), armR: 0.6, elbowR: 1.6 }, g);
        else if (tb < LAND + 3.7) her = still(facing(back, batSpot.x, batSpot.z), toss(span(tb, LAND + 2.5, LAND + 3.4)), g);
        else if (tb < LAND + 4.2) her = still(facing(back, batSpot.x, batSpot.z), {}, g);
        else if (tb < LAND + 6.4) her = still(facing(back, batSpot.x, batSpot.z), bow(span(tb, LAND + 4.2, LAND + 6.4)), g);
        else if (tb < C0) her = still(facing(back, bankLand.x, bankLand.z), {}, g);
        else if (tb < C1) her = { ...legC.at(tb - C0), hold: 1, ...g };
        else if (tb < C1 + 0.7) { const l = walkLeg(bankLand, bankEdge, RUN); her = { ...l.at(Math.min(l.dur, tb - C1)), ...g }; }
        else if (tb < C1 + 1.4) {
          const o = span(tb, C1 + 0.7, C1 + 1.4);
          her = still(at(lerp(bankEdge.x, bankOut.x, o), bankEdge.y + 1.6 * Math.sin(Math.PI * Math.min(1, o * 1.25)) - 6 * o * o, bankEdge.z, E), leap(0.3 + 0.6 * o), { aloft: true, ...g });
        } else her = hidden(bankOut);
        P.put('catwoman', her);
        // Batman: lands before her, catches the diamond, and watches her go
        const t0 = LAND - batLeg.dur;
        if (tb < t0) him = still(home, { ...perch((tb * 0.05) % 1), head: 0.5 * Math.sin(tb * 0.3) }, { cape: 0.1, ...g });
        else if (tb < LAND) him = { ...batLeg.at(tb - t0), ...g };
        else if (tb < LAND + 3.2) him = still(batSpot, { head: 0.1 * Math.sin(tb) }, { cape: 0.15, ...g });
        else if (tb < LAND + 4.4) him = still(batSpot, caught(span(tb, LAND + 3.2, LAND + 4.4)), g);
        else {
          const look = facing(batSpot, tb < C1 ? her.x : bankOut.x, tb < C1 ? her.z : bankOut.z);
          him = still(at(batSpot.x, batSpot.y, batSpot.z, turnTo(batSpot.h, look.h, span(tb, C0, C0 + 1))), { ...caught(1), head: 0.1 }, g);
        }
        P.put('batman', him);
      },
      props(tb) {
        busy.cat = now;
        // the diamond: lifted from the skylight, in her hand, thrown to him, in his
        const sky: V3 = [SKYLIGHT.x + Math.cos(SKYLIGHT.h) * 0.6, SKYLIGHT.y + 0.1, SKYLIGHT.z + Math.sin(SKYLIGHT.h) * 0.6];
        let p: V3 | null = null;
        if (tb > A1 + 1.2 && tb < A1 + 2.4) { const u = span(tb, A1 + 1.2, A1 + 2.4); const h = handOf(her, 1.2, 0.5, 0.25); p = [lerp(sky[0], h[0], u), lerp(sky[1], h[1], u), lerp(sky[2], h[2], u)]; }
        else if (tb >= A1 + 2.4 && tb < LAND + 3.2) p = handOf(her, her.aloft ? 2.4 : 1.6, 0.3, 0.3);
        else if (tb >= LAND + 3.2 && tb < LAND + 4.0) {
          const u = span(tb, LAND + 3.2, LAND + 4.0), a = handOf(her, 2.1, 0.3, 0.3), b = handOf(him, 2.2, 0.3, 0.3);
          p = [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + 1.6 * Math.sin(Math.PI * u), lerp(a[2], b[2], u)];
        } else if (tb >= LAND + 4.0) p = handOf(him, 1.5, 0.35, 0.2);
        if (p) W.glints.speck(p, 0.2, Math.floor(tb * 8) % 2 ? 0xe8f6ff : 0x9fd8ff);
        // her cat sits by her post, and when she goes it follows along the parapet
        const cu = span(tb, C0, C0 + 3), cp = CAT_PATH.at(CAT_PATH.len * cu);
        blackCat?.at(cp[0], CAT_SPOT.y, cp[1], cu > 0 && cu < 1 ? cp[2] : E);
        blackCat?.gait((tb * 2.4) % 1, cu > 0 && cu < 1 ? 2 : 3);
      },
    });
  }

  // ================================================================== 5. Riddle Me This
  // Det. 140 (1948): the Riddler's trail of question marks [wp Riddler; rogues note, story 6]. He stands a row of lit
  // question marks down the pier and puts his mark on the sky; Robin comes down and kicks each one out; the Riddler
  // throws up his hands, a burst of steam hides him, and he is back at his booth. No maze and no blast.
  {
    const pier = STAGES.pier, deck = RIDDLER.y;
    const MZ = pier.z0 + 5.2, RZ = pier.z0 + 4.0, KZ = pier.z0 + 4.1;
    const XS = [0, 1, 2, 3, 4].map((i) => RIDDLER.x + 2.6 + i * 2.4);
    const steps: Track[] = [wait(RIDDLER, 0.8, () => ({ nod: -0.1 }))];
    let from: Spot = RIDDLER;
    for (const x of XS) {
      const to = at(x, deck, RZ, S);
      steps.push(walkLeg(from, to, 2.4));
      steps.push(wait(to, 1.1, (u) => kneel(Math.sin(Math.PI * u)), { hold: 1 }));
      from = to;
    }
    const END = at(pier.x1 - 1.4, deck, pier.z0 + 3.0, WEST);
    steps.push(walkLeg(from, END, 2.4));
    const rid = seq(steps), GROW = XS.map((_, i) => rid.t[2 + i * 2]);
    const LANDING = at(XS[0] - 1.8, deck, KZ, E);
    const KICK0 = 18.5, KICK_STEP = 2.0;
    const kickAt = XS.map((_, i) => KICK0 + i * KICK_STEP + 1.0);
    let robLeg: Leg | null = null;
    const HANDS = kickAt[4] + 1.2, STEAM = HANDS + 0.8, BACK = STEAM + 1.4, BODY = BACK + 4;
    const qmark = (x: number, z: number, g: number, f: number, off: number): void => {
      if (g <= 0.01 || f <= 0.01) return;
      const lx = -Math.sin(TO_VIEW), lz = Math.cos(TO_VIEW), col = dim(0x3cff6a, f), base = deck + off * 2, zz = z + off * 3;
      const c: V3 = [x, base + 1.35 * g, zz], r = 0.42 * g;
      let prev: V3 | null = null;
      for (let i = 0; i <= 4; i++) {
        const a = Math.PI * 0.95 - (Math.PI * 1.35 * i) / 4;
        const p: V3 = [c[0] + Math.cos(a) * r * lx, c[1] + Math.sin(a) * r, c[2] + Math.cos(a) * r * lz];
        if (prev) W.glints.line(prev, p, 0.13 * g, col);
        prev = p;
      }
      if (prev) W.glints.line(prev, [x, base + 0.6 * g, zz], 0.13 * g, col);
      W.glints.speck([x, base + 0.25 * g, zz], 0.2 * g, col);
    };
    book.stories.push({
      id: 'riddle', name: 'Riddle Me This', cast: ['riddler', 'robin'], holds: ['pier', 'signal'], weight: 1,
      marks: { riddler: 'post', robin: 'post' }, body: BODY,
      may: (w) => w.night() > 0.2,
      play(tb, P) {
        const home = P.from('robin');
        robLeg ??= lineLeg(W.solid, home, LANDING);
        // the Riddler
        if (tb < rid.dur) P.put('riddler', { ...rid.at(tb), hold: 1 });
        else if (tb < HANDS) P.put('riddler', still(facing(END, LANDING.x, KZ), laugh(span(tb, rid.dur, HANDS) * 3 % 1), { hold: 1 }));
        else if (tb < STEAM + 0.6) P.put('riddler', still(facing(END, LANDING.x, KZ), { armL: 2.8, armR: 2.8, spreadL: 0.45, spreadR: 0.45, elbowL: 0.2, elbowR: 0.2, nod: -0.4, lean: -0.15 }));
        else if (tb < BACK) P.put('riddler', hidden(RIDDLER));
        else P.put('riddler', still(RIDDLER, { ...hang(0), nod: 0.2, head: -0.4 }));
        // Robin: down on his line, along the row with a kick for each, and a point at the Riddler
        const r0 = KICK0 - 0.6 - robLeg.dur;
        if (tb < r0) P.put('robin', still(home, perch((tb * 0.04) % 1), glowB({ hold: 1 })));
        else if (tb < KICK0 - 0.6) P.put('robin', { ...robLeg.at(tb - r0), ...glowB() });
        else {
          let s: State | null = null;
          let from2: Spot = LANDING;
          for (let i = 0; i < XS.length && !s; i++) {
            const k = at(XS[i], deck, KZ, S), t0 = KICK0 + i * KICK_STEP - 0.6, l = walkLeg(from2, k, 2.6);
            if (tb < t0 + l.dur) s = l.at(Math.max(0, tb - t0));
            else if (tb < t0 + 2.0 || i === XS.length - 1) {
              const u = span(tb, kickAt[i] - 0.3, kickAt[i] + 0.4), kick = Math.sin(Math.PI * u);
              s = still(k, { hipR: 1.5 * kick, kneeR: 0.3 * (1 - kick), armL: 0.7 * kick, armR: -0.4 * kick, lean: -0.25 * kick, spreadL: 0.5 * kick });
              if (i === XS.length - 1 && tb > kickAt[i] + 0.5) {
                const turned = facing(k, END.x, END.z);
                s = still(turned, tb > HANDS && tb < STEAM + 0.8 ? point(span(tb, HANDS, STEAM + 0.8)) : tb > BACK + 0.5 && tb < BACK + 3 ? shrug(span(tb, BACK + 0.5, BACK + 3)) : { head: 0.4 * Math.sin(tb) });
              }
            }
            from2 = k;
          }
          P.put('robin', { ...(s ?? still(LANDING)), ...glowB({ hold: 1 }) });
        }
      },
      props(tb) {
        W.air?.signal(ease(span(tb, 1, 4)) * (1 - ease(span(tb, HANDS, HANDS + 2.5))), 'question');
        XS.forEach((x, i) => {
          const g = ease(span(tb, GROW[i] + 0.2, GROW[i] + 0.9)), out = span(tb, kickAt[i], kickAt[i] + 0.9);
          qmark(x, MZ, g, 1 - out, out);
        });
        const st = ease(span(tb, STEAM, STEAM + 0.5)) * (1 - ease(span(tb, BACK, BACK + 2)));
        W.air?.burst(END.x, deck, END.z, st);
      },
      end() { W.air?.signal(0); W.air?.burst(END.x, deck, END.z, 0); },
    });
  }

  // ================================================================== 6. Two-Face's Coin
  // Det. 66 (1942): he robbed a bank and gave the loot to charity at the coin's word [wp Two-Face; rogues note, story 7].
  // He comes into Bank Square with a sack, tosses his coin high while every head follows it, and by how it lands
  // either drops the sack in the charity box and bows (he has no hat to tip), or runs for the bank's door, finds Batman
  // landed in front of it, and hands the sack over. The two endings take turns.
  {
    const sq = STAGES.bankSquare;
    const IN = spot(sq.x0 + 1, sq.z1 - 0.6, N, 1), MID = spot(sq.x0 + 4, sq.z0 + 8.6, N, 1);
    const BOX = at(CHARITY.x - 1.2, gy(CHARITY.x - 1.2, CHARITY.z, 1), CHARITY.z, E);
    const DOOR = at(BANK_DOOR.x, gy(BANK_DOOR.x, BANK_DOOR.z + 1.3, 1), BANK_DOOR.z + 1.3, S);
    const STOP = at(BANK_DOOR.x, gy(BANK_DOOR.x, BANK_DOOR.z + 3.8, 1), BANK_DOOR.z + 3.8, N), HAND = at(STOP.x, STOP.y, BANK_DOOR.z + 2.9, N);
    const OUT = spot(sq.x0 + 0.6, sq.z1 - 1.4, WEST, 1);
    let tails = false, batLeg: Leg | null = null;
    let tf: State = still(IN), bm: State = still(PERCH);
    const sack = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshLambertMaterial({ color: 0xb08a52 }));
    sack.scale.set(1, 1.15, 1);
    sack.visible = false;
    k.group.add(sack);
    const inLeg = walkLeg(IN, MID, 1.9);
    const TOSS = 6, TOSS_END = 8.8, RUN0 = 10.5, LAND = 12.4;
    book.stories.push({
      id: 'coin', name: "Two-Face's Coin", cast: ['twoFace', 'batman'], holds: ['bankSquare', 'courtSteps'], weight: 1,
      marks: { twoFace: IN, batman: 'post' }, body: 26,
      play(tb, P) {
        const home = P.from('batman');
        batLeg ??= lineLeg(W.solid, home, DOOR);
        const look = tb > TOSS && tb < TOSS_END ? -0.9 * Math.sin(Math.PI * span(tb, TOSS + 0.3, TOSS_END)) : 0;
        // Two-Face: in, a toss, and one ending or the other
        if (tb < inLeg.dur) tf = inLeg.at(tb);
        else if (tb < TOSS) tf = still(MID, { head: 0.9 * Math.sin((tb - inLeg.dur) * 1.2) });
        else if (tb < TOSS + 0.7) tf = still(MID, toss(span(tb, TOSS, TOSS + 0.7)));
        else if (tb < TOSS_END) tf = still(MID, { ...toss(1), nod: look });
        else if (tb < TOSS_END + 0.8) tf = still(MID, caught(span(tb, TOSS_END, TOSS_END + 0.8)));
        else if (tb < RUN0) tf = still(MID, { ...caught(1), nod: 0.45 });
        else if (!tails) {
          const go = walkLeg(MID, BOX, 1.9), t1 = RUN0 + go.dur;
          if (tb < t1) tf = go.at(tb - RUN0);
          else if (tb < t1 + 1.5) tf = still(BOX, { armR: 1.3 * Math.sin(Math.PI * span(tb, t1, t1 + 1.5)), elbowR: 0.3, nod: 0.3 });
          else if (tb < t1 + 3.5) tf = still(facing(BOX, BOX.x + 3, BOX.z + 3), bow(span(tb, t1 + 1.5, t1 + 3.5)));
          else { const off = walkLeg(facing(BOX, OUT.x, OUT.z), OUT, 2.0), t2 = t1 + 3.6; tf = tb < t2 + off.dur ? (tb < t2 ? still(facing(BOX, OUT.x, OUT.z)) : off.at(tb - t2)) : hidden(OUT); }
        } else {
          const go = walkLeg(MID, STOP, RUN);
          if (tb < RUN0 + go.dur) tf = go.at(tb - RUN0);
          else if (tb < 14) tf = still(STOP, { lean: -0.2, armL: 0.5, armR: 0.5, spreadL: 0.4, spreadR: 0.4 });
          else if (tb < 15) { const l = walkLeg(STOP, HAND, 1.2); tf = l.at(Math.min(l.dur, tb - 14)); }
          else if (tb < 16.6) tf = still(HAND, { armR: 1.3, elbowR: 0.3, nod: 0.25 });
          else if (tb < 17.6) { const l = walkLeg(HAND, STOP, 1.2); tf = l.at(Math.min(l.dur, tb - 16.6)); }
          else if (tb < 19.6) tf = still(STOP, shrug(span(tb, 17.6, 19.6)));
          else { const off = walkLeg(facing(STOP, OUT.x, OUT.z), OUT, 2.0); tf = tb < 19.8 + off.dur ? off.at(Math.max(0, tb - 19.8)) : hidden(OUT); }
        }
        P.put('twoFace', tf);
        // Batman, only when the coin says run
        const g = glowB();
        if (!tails || tb < LAND - batLeg.dur) bm = still(home, { ...perch((tb * 0.05) % 1), head: 0.5 * Math.sin(tb * 0.3) }, { cape: 0.1, ...g });
        else if (tb < LAND) bm = { ...batLeg.at(tb - LAND + batLeg.dur), ...g };
        else if (tb < 15.2) bm = still(DOOR, { head: 0.1 * Math.sin(tb) }, g);
        else if (tb < 16.6) bm = still(DOOR, caught(span(tb, 15.2, 16.6)), g);
        else if (tb < 19.8) bm = still(DOOR, { ...caught(1), head: -0.4 * span(tb, 18, 19.8) }, g);
        else if (tb < 21.2) { const l = walkLeg(DOOR, at(DOOR.x, DOOR.y, DOOR.z - 0.6, N), 1); bm = { ...l.at(Math.min(l.dur, tb - 19.8)), ...g }; }
        else if (tb < 22.2) bm = still(at(DOOR.x, DOOR.y, DOOR.z - 0.6, N), { armR: 1.2, elbowR: 0.4 }, g);
        else bm = still(at(DOOR.x, DOOR.y, DOOR.z - 0.6, turnTo(N, S, span(tb, 22.2, 23))), {}, g);
        P.put('batman', bm);
      },
      props(tb) {
        // the coin, high and glinting
        if (tb > TOSS + 0.3 && tb < TOSS_END) {
          const u = span(tb, TOSS + 0.3, TOSS_END), h = handOf(tf, 1.9, 0.35, 0.3);
          W.glints.speck([h[0], h[1] + 3.0 * 4 * u * (1 - u), h[2]], 0.19, Math.floor(tb * 10) % 2 ? 0xfff6d8 : 0x8a8a84);
        }
        // the sack: at his side, into the box or into Batman's hands, and into the bank
        let p: V3 | null = handOf(tf, 0.95, 0.1, 0.45);
        if (!tf.shown) p = null;
        if (!tails && tb > RUN0) {
          const t1 = RUN0 + walkLeg(MID, BOX, 1.9).dur;
          if (tb > t1 + 0.3) { const u = span(tb, t1 + 0.3, t1 + 1.1); p = u < 1 ? [lerp(p?.[0] ?? CHARITY.x, CHARITY.x, u), lerp(tf.y + 1.5, CHARITY.y + 1.2, u) + 0.5 * Math.sin(Math.PI * u), lerp(p?.[2] ?? CHARITY.z, CHARITY.z, u)] : null; }
        } else if (tails && tb > 15.6) {
          const a = handOf(tf, 1.2, 0.5, 0.2), b = handOf(bm, 1.0, 0.2, 0.45), u = span(tb, 15.6, 16.4);
          p = tb < 21.6 ? [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)] : null;
        }
        sack.visible = !!p;
        if (p) sack.position.set(p[0], p[1], p[2]);
      },
      end() { tails = !tails; batLeg = null; sack.visible = false; },
    });
  }

  // ================================================================== 7. Ivy and Harley in the Park
  // Robinson Park as Ivy's in No Man's Land (1999), and Harley and Ivy as friends (Gotham City Sirens, 2009 to 2011)
  // [wp Poison Ivy; wp Harley Quinn; rogues note, stories 8 and 15]. Ivy goes into her garden and comes up among vines
  // at Finger Castle's foot; they climb its south and east faces and lift her to the top. Harley cartwheels across
  // the lawn with her hyenas. Batgirl swings in; Ivy blows her a kiss, the vines sink, and Harley drags Ivy off laughing.
  {
    const C = lotOf('finger-castle'), lawn = STAGES.parkLawn;
    const RISE = spot(CASTLE_FOOT.x + 0.6, CASTLE_FOOT.z + 0.6, TO_VIEW, CASTLE_FOOT.y + 1);
    const HIGH = CASTLE_TOP.y + 1.2;
    // Harley wheels along the lawn's south side and Batgirl lands at its north-west, clear of the tea table's party
    const H0 = spot(lawn.x0 + 1.5, lawn.z1 - 2.0, N, 1), H1 = spot(lawn.x1 - 2.5, lawn.z1 - 2.2, N, 1);
    const BG = facing(spot(lawn.x0 + 3, lawn.z0 + 3, N, 1), CASTLE_TOP.x, CASTLE_TOP.z);
    const HDRAG = spot(RISE.x + 0.4, RISE.z + 1.1, WEST, RISE.y + 1.5);
    const RUNOFF = [-0.3, 1.1].map((dz) => spot(C.x0 - 2.5, RISE.z + 1 + dz, WEST, 6));
    // the vines: up the wall's south face, the tower's south face and the tower's east face
    const tc = { x: C.x1 - 3.4, z: C.z1 - 3.4, r: 2.6 };
    const strands: { pts: V3[]; len: number[] }[] = [];
    const strand = (bx: number, bz: number, top: number, ox: number, oz: number, ax: number, az: number): void => {
      const base = gy(bx + ox, bz + oz, 8);
      const pts: V3[] = [[CASTLE_FOOT.x, gy(CASTLE_FOOT.x, CASTLE_FOOT.z, 8) + 0.05, CASTLE_FOOT.z], [bx + ox, base + 0.05, bz + oz]];
      for (let i = 1; i <= 4; i++) { const s = i % 2 ? 0.4 : -0.4; pts.push([bx + ox + ax * s, lerp(base, top, i / 4), bz + oz + az * s]); }
      const len = [0];
      for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
      strands.push({ pts, len });
    };
    strand(C.x0 + 2, C.z1 - 1.6, Y.quay + 12.3, 0, 0.15, 1, 0);
    strand(C.x0 + 4, C.z1 - 1.6, Y.quay + 12.3, 0, 0.15, 1, 0);
    strand(tc.x - 0.8, tc.z + tc.r, CASTLE_TOP.y + 0.2, 0, 0.2, 1, 0);
    strand(tc.x + 0.8, tc.z + tc.r - 0.2, CASTLE_TOP.y + 0.2, 0, 0.2, 1, 0);
    strand(tc.x + tc.r, tc.z - 0.8, CASTLE_TOP.y + 0.2, 0.2, 0, 0, 1);
    strand(tc.x + tc.r - 0.2, tc.z + 0.8, CASTLE_TOP.y + 0.2, 0.2, 0, 0, 1);
    const grow = (tb: number): number => ease(span(tb, 2, 9)) * (1 - ease(span(tb, 23, 27)));
    const ivyAt = (tb: number): State => {
      const doorLeg = walkLeg(IVY, GARDEN_DOOR, 1.6);
      if (tb < doorLeg.dur) return doorLeg.at(tb);
      if (tb < 3) return hidden(RISE);
      const up: Partial<Pose> = { armL: 2.6, armR: 2.6, spreadL: 0.5, spreadR: 0.5, elbowL: 0.2, elbowR: 0.2, nod: -0.3 };
      if (tb < 5) return still(RISE, up, { size: lerp(0.25, 1, ease(span(tb, 3, 4.2))) });
      if (tb < 9) return still(at(RISE.x, lerp(RISE.y, HIGH, ease(span(tb, 5, 9))), RISE.z, TO_VIEW), up, { aloft: true });
      if (tb < 11) { const u = ease(span(tb, 9, 11)); return still(at(lerp(RISE.x, CASTLE_TOP.x, u), lerp(HIGH, CASTLE_TOP.y, ease(span(tb, 10.2, 11))), lerp(RISE.z, CASTLE_TOP.z, u), TO_VIEW), up, { aloft: tb < 10.9 }); }
      const toBG = facing(CASTLE_TOP, BG.x, BG.z);
      if (tb < 16) return still(CASTLE_TOP, up);
      if (tb < 21) return still(toBG, { ...idle((tb * 0.1) % 1), armR: 0.3, elbowR: 1.8, spreadR: 0.5 });
      if (tb < 23) { const u = span(tb, 21, 23), kiss = Math.sin(Math.PI * u); return still(toBG, { armR: 1.3 + 0.5 * u, elbowR: 2.4 * (1 - u), spreadR: 0.1, nod: -0.1 * kiss, lean: 0.1 * kiss }); }
      if (tb < 24) return still(toBG, {});
      if (tb < 26) { const u = ease(span(tb, 24, 26)); return still(at(lerp(CASTLE_TOP.x, RISE.x, u), lerp(CASTLE_TOP.y, HIGH, ease(span(tb, 24, 24.8))), lerp(CASTLE_TOP.z, RISE.z, u), TO_VIEW), {}, { aloft: true }); }
      if (tb < 29) return still(at(RISE.x, lerp(HIGH, RISE.y, ease(span(tb, 26, 29))), RISE.z, TO_VIEW), {}, { aloft: tb < 28.9 });
      if (tb < 30) return still(facing(RISE, HDRAG.x, HDRAG.z), laugh(span(tb, 29, 30)));
      const l = walkLeg(facing(RISE, RUNOFF[0].x, RUNOFF[0].z), RUNOFF[0], RUN);
      return tb < 30 + l.dur ? grounded({ ...l.at(tb - 30), pose: { ...run(((tb - 30) * 1.6) % 1), armR: 1.4, elbowR: 0.2 } }) : hidden(RUNOFF[0]);
    };
    const WHEELS = 4, WHEEL_T = 6.5;
    const harleyAt = (tb: number): State => {
      if (tb < 7) return hidden(H0);
      if (tb < 7 + WHEEL_T) {
        const u = span(tb, 7, 7 + WHEEL_T), d = toward(H0.x, H0.z, H1.x, H1.z), x = lerp(H0.x, H1.x, u), z = lerp(H0.z, H1.z, u);
        return still(at(x, gy(x, z, 2), z, d - Math.PI / 2), star(0), { roll: TAU * WHEELS * u });
      }
      const fH1 = facing(H1, BG.x, BG.z);
      if (tb < 21) return still(fH1, laugh(((tb - 13.5) / 2.5) % 1), { hold: tb > 16 ? 1 : 0, spin: 0 });
      const go = walkLeg(fH1, HDRAG, RUN);
      if (tb < 21 + go.dur) return grounded({ ...go.at(tb - 21), pose: { ...run(((tb - 21) * 1.6) % 1) } });
      if (tb < 30) return still(facing(HDRAG, RISE.x, RISE.z), laugh(((tb - 21) / 3) % 1));
      const l = walkLeg(facing(HDRAG, RUNOFF[1].x, RUNOFF[1].z), RUNOFF[1], RUN);
      return tb < 30 + l.dur ? grounded({ ...l.at(tb - 30), pose: { ...run(((tb - 30) * 1.6) % 1), armL: -0.8, elbowL: 0.2, head: 1.2, nod: -0.5 } }) : hidden(RUNOFF[1]);
    };
    let bgLeg: Leg | null = null;
    const BG_LAND = 19.5, BG_HOME = 34.6, bgHome = landing(BG, LIBRARY_STEPS);
    let ivyNow: State = still(IVY), harleyNow: State = still(H0), bgNow: State = still(BG);
    book.stories.push({
      id: 'vines', name: 'Ivy and Harley in the Park', cast: ['ivy', 'harley', 'batgirl'], holds: ['parkLawn'], weight: 1,
      marks: { ivy: 'post', harley: H0, batgirl: 'post' }, body: BG_HOME + bgHome.dur + 0.5,
      play(tb, P) {
        const home = P.from('batgirl');
        bgLeg ??= launch(home, BG);
        ivyNow = ivyAt(tb);
        harleyNow = harleyAt(tb);
        P.put('ivy', ivyNow);
        P.put('harley', harleyNow);
        const t0 = BG_LAND - bgLeg.dur, g = glowB();
        if (tb < t0) bgNow = still(home, sit(1), g);
        else if (tb < BG_LAND) bgNow = { ...bgLeg.at(tb - t0), ...g };
        else if (tb < 23.5) bgNow = still(BG, { head: 0.15 * Math.sin(tb) }, g);
        else if (tb < 25) bgNow = still(BG, { tilt: 0.15, head: 0.3, nod: -0.1 }, g);
        else if (tb < 30) bgNow = still(BG, { armL: 0.2, armR: 0.2, spreadL: 0.5, spreadR: 0.5, elbowL: 2.0, elbowR: 2.0 }, g);
        else if (tb < BG_HOME) bgNow = still(facing(BG, RUNOFF[0].x, RUNOFF[0].z), tb > 32 && tb < 34.5 ? shrug(span(tb, 32, 34.5)) : {}, g);
        else if (tb < BG_HOME + bgHome.dur) bgNow = { ...bgHome.at(tb - BG_HOME), ...g };
        else bgNow = still(LIBRARY_STEPS, sit(span(tb, BG_HOME + bgHome.dur, BG_HOME + bgHome.dur + 0.5)), g);
        P.put('batgirl', bgNow);
      },
      props(tb) {
        busy.hyenas = now;
        // the vines, and the green stalk under Ivy as she rides it
        const g = grow(tb);
        for (const s of strands) {
          const want = g * s.len[s.len.length - 1];
          for (let i = 1; i < s.pts.length; i++) {
            if (s.len[i - 1] >= want) break;
            const a = s.pts[i - 1], b = s.pts[i], f = clamp((want - s.len[i - 1]) / Math.max(1e-6, s.len[i] - s.len[i - 1]));
            W.lines.line(a, [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)], 0.2, 0x2f7a2a);
          }
        }
        if (ivyNow.shown && ivyNow.y > RISE.y + 0.3 && Math.hypot(ivyNow.x - RISE.x, ivyNow.z - RISE.z) < 0.2) W.lines.line([RISE.x, RISE.y, RISE.z], [ivyNow.x, ivyNow.y, ivyNow.z], 0.28, 0x3a8a2e);
        // her kiss, a pink speck across to Batgirl
        if (tb > 22 && tb < 23.6) { const u = span(tb, 22, 23.6), a = handOf(ivyNow, 2.2, 0.4, 0.2), b: V3 = [bgNow.x, bgNow.y + 2.3, bgNow.z]; W.glints.speck([lerp(a[0], b[0], u), lerp(a[1], b[1], u) + 1.2 * Math.sin(Math.PI * u), lerp(a[2], b[2], u)], 0.22, 0xff5aa8); }
        // the hyenas, after Harley
        hyenas.forEach((h, i) => {
          if (!h) return;
          h.shown(harleyNow.shown && tb > 7);
          if (!harleyNow.shown) return;
          const lag = 0.7 + i * 0.5, past = harleyAt(Math.max(7, tb - lag)), side = i ? 0.9 : -0.9;
          const moving = (tb > 7 && tb < 7 + WHEEL_T + lag) || (tb > 21 && tb < 25) || tb > 30;
          const hx = past.x - Math.sin(past.h) * side * (moving ? 0.6 : 1.6), hz = past.z + Math.cos(past.h) * side * (moving ? 0.6 : 1.6);
          h.at(hx, gy(hx, hz, past.y + 1.5), hz, moving ? toward(hx, hz, harleyNow.x, harleyNow.z) : toward(hx, hz, BG.x, BG.z));
          h.gait((tb * 2.2 + i * 0.4) % 1, moving ? 2 : 3);
        });
      },
    });
  }

  // ================================================================== 8. The Scarecrow's Lesson
  // World's Finest 3 (1941): Jonathan Crane, a professor of psychology, and his crows [wp Scarecrow; rogues note].
  // On the quad he steps off his post and two students run in a ring under his wheeling crows; Batman drops in, a
  // puff of pale green rises, the crows scatter to the university's roof, and when it clears the Scarecrow is a
  // scarecrow on his post again. No fear toxin's visions: the puff is only steam.
  {
    const stA = 'student-a', stB = 'student-b';
    for (const id of [stA, stB]) book.roster.push({ id, look: EXTRAS.citizen, way: 'foot', post: null });
    const q = STAGES.quad, qy = q.y, uni = lotOf('university');
    const RC = { x: q.x0 + 3.5, z: q.z0 + 5, r: 2.0 };
    const ringAt = (a: number): Spot => at(RC.x + Math.cos(a) * RC.r, qy, RC.z + Math.sin(a) * RC.r, a + Math.PI / 2);
    const A0 = Math.PI + 0.8;
    const SC = at(SCARE_POST.x - 2.6, qy, SCARE_POST.z - 1.3, WEST);
    const BAT = facing(at(SC.x + 0.8, qy, SC.z - 4.2, N), SC.x, SC.z), BAT2 = facing(at(SCARE_POST.x - 1.8, qy, SCARE_POST.z - 1.1, E), SCARE_POST.x, SCARE_POST.z);
    const EXITS = [at(RC.x - 1.5, qy, q.z1 + 1.2, S), at(RC.x + 0.6, qy, q.z1 + 1.4, S)];
    const RUN0 = 4.2, STOP = 16.5, OMEGA = 2.2, BAT_LAND = 12.5, PUFF = 16.2;
    let batLeg: Leg | null = null;
    const off = walkLeg(SCARE_POST, SC, 1.6);
    const student = (id: string, k0: number): ((tb: number) => State) => (tb) => {
      const a0 = A0 + k0 * Math.PI, seat = ringAt(a0);
      const sitAt = at(seat.x, seat.y, seat.z, toward(seat.x, seat.z, RC.x, RC.z) + 0.6);
      if (tb < 3.5) return still(sitAt, { ...sit(1), nod: 0.4 + 0.1 * Math.sin(tb + k0) });
      if (tb < RUN0) return still(sitAt, blend(sit(1), { armL: 1.4, armR: 1.4, spreadL: 0.6, spreadR: 0.6, lean: -0.2 }, span(tb, 3.5, RUN0)));
      const a = a0 + OMEGA * (Math.min(tb, STOP) - RUN0) * 0.5 * (1 + span(Math.min(tb, STOP), RUN0, RUN0 + 1));
      const r = ringAt(a);
      if (tb < STOP) return still(r, { ...run(((tb - RUN0) * 1.7 + k0 * 0.5) % 1), armL: 2.4, armR: 2.4, spreadL: 0.4, spreadR: 0.4 });
      if (tb < 19) return still(r, { lean: 0.3, crouch: 0.15, armL: 0.6, armR: 0.6, elbowL: 0.3, elbowR: 0.3, nod: 0.3, head: 0.6 * Math.sin(tb * 3 + k0) });
      const l = walkLeg(r, EXITS[k0], RUN);
      return tb < 19 + l.dur ? l.at(tb - 19) : hidden(EXITS[k0]);
    };
    const sA = student(stA, 0), sB = student(stB, 1);
    let scNow: State = still(SC);
    book.stories.push({
      id: 'crows', name: "the Scarecrow's Lesson", cast: ['scarecrow', 'batman', stA, stB], holds: ['quad'], weight: 1,
      marks: { scarecrow: 'post', batman: 'post', [stA]: ringAt(A0), [stB]: ringAt(A0 + Math.PI) }, body: 27,
      play(tb, P) {
        const home = P.from('batman');
        batLeg ??= lineLeg(W.solid, home, BAT);
        // the Scarecrow steps down, looms over the students, throws his pouch, and is gone into the steam
        if (tb < 1) scNow = still(SCARE_POST, scarecrowStill(tb));
        else if (tb < 1 + off.dur) scNow = off.at(tb - 1);
        else if (tb < 13) scNow = still(facing(SC, RC.x, RC.z), { armL: 1.6, armR: 1.6, spreadL: 1.0, spreadR: 1.0, elbowL: 0.7, elbowR: 0.7, lean: 0.35, crouch: 0.15, head: 0.4 * Math.sin(tb * 1.3) }, { hold: 0 });
        else if (tb < PUFF - 0.4) scNow = still(facing(SC, BAT.x, BAT.z), { lean: 0.1, armR: 0.4, elbowR: 1.2, head: 0.1 });
        else if (tb < PUFF + 0.6) scNow = still(facing(SC, BAT.x, BAT.z), toss(span(tb, PUFF - 0.4, PUFF + 0.6)), { hold: 1 });
        else if (tb < 17.4) scNow = still(facing(SC, BAT.x, BAT.z), toss(1), { hold: 1 });
        else if (tb < 19.5) scNow = hidden(SCARE_POST);
        else scNow = still(SCARE_POST, scarecrowStill(tb));
        P.put('scarecrow', scNow);
        P.put(stA, sA(tb));
        P.put(stB, sB(tb));
        // Batman drops in, faces him down, and after the steam looks hard at the scarecrow on the post
        const t0 = BAT_LAND - batLeg.dur, g = glowB();
        if (tb < t0) P.put('batman', still(home, { ...perch((tb * 0.05) % 1), head: 0.5 * Math.sin(tb * 0.3) }, { cape: 0.1, ...g }));
        else if (tb < BAT_LAND) P.put('batman', { ...batLeg.at(tb - t0), ...g });
        else if (tb < 17.4) P.put('batman', still(BAT, tb > PUFF + 0.2 ? { armL: 1.6, elbowL: 2.2, spreadL: 0.3, armR: 1.6, elbowR: 2.2, spreadR: 0.3, nod: 0.3 } : {}, { cape: tb > PUFF + 0.2 ? 0.7 : 0.15, spread: tb > PUFF + 0.2 ? 0.5 : 0, ...g }));
        else if (tb < 21) { const l = walkLeg(BAT, BAT2, 1.6); P.put('batman', { ...l.at(Math.min(l.dur, tb - 19.2 > 0 ? tb - 19.2 : 0)), ...g }); }
        else P.put('batman', still(BAT2, { nod: 0.1, tilt: 0.18 * span(tb, 22, 23), head: 0.2 * Math.sin(tb * 0.8) }, g));
      },
      props(tb) {
        const st = ease(span(tb, PUFF + 0.4, PUFF + 1.2)) * (1 - ease(span(tb, 19.5, 21.5)));
        W.air?.burst(SC.x, qy, SC.z, st);
        for (let i = 0; i < 2; i++) { const u = span(tb, PUFF + 0.4 + i * 0.5, PUFF + 2.6 + i * 0.5); W.rings.set(4 + i, [SC.x, qy + 0.08, SC.z], 0.5 + 3.5 * u, (u > 0 && u < 1 ? 1 - u : 0) * 0.7, 0xb8f0b0); }
        if (crows) {
          const n = Math.round(24 * ease(span(tb, 1.5, 4)));
          crows.shown(n > 0);
          const fly2 = ease(span(tb, PUFF + 0.4, PUFF + 4));
          crows.set({ x: lerp(RC.x + 1.5, (uni.x0 + uni.x1) / 2, fly2), y: lerp(qy + 6, uni.top + 1.5, fly2), z: lerp(RC.z + 1, (uni.z0 + uni.z1) / 2, fly2), spread: lerp(5, 3.5, fly2), tall: lerp(2, 0.6, fly2), n, swirl: lerp(1.2, 0.25, fly2), heading: toward(RC.x, RC.z, uni.x0, uni.z0), stream: fly2 > 0 && fly2 < 1 ? 0.5 : 0 });
        }
      },
      end() { crows?.shown(false); W.air?.burst(SC.x, qy, SC.z, 0); W.rings.set(4, [0, 0, 0], 1, 0); W.rings.set(5, [0, 0, 0], 1, 0); },
    });
  }

  // ================================================================== 9. The League Looks In
  // The founding seven of The Brave and the Bold 28 (1960) [wider cast, section 3]; that they answer the Signal is the
  // tile's own, since no such story was found. By night, when the Signal has not played for a while, Gordon lights
  // it, and the League come: Superman and Wonder Woman out of the sky, the Flash as a streak up the wall, Green Lantern
  // on a path of green light, the Martian Manhunter rising through the roof, Aquaman in the harbour on his seahorse,
  // and Batman last on his line. They stand the row with him at its middle, and go the ways they came.
  {
    const roof = gcpd.top;
    const leaguers = ['superman', 'wonderWoman', 'flash', 'greenLantern', 'martianManhunter', 'aquaman'] as const;
    const SLOT = { greenLantern: 0, wonderWoman: 1, superman: 2, batman: 3, flash: 4, martianManhunter: 5, gordon: 6 } as const;
    const SKY_S: V3 = [ROLL[2].x + 14, 78, ROLL[2].z + 18], SKY_W: V3 = [ROLL[1].x + 12, 80, ROLL[1].z + 20];
    const GL_FROM: V3 = [ROLL[0].x + 30, 50, ROLL[0].z - 6];
    const pier = lotOf('pier');
    const AQ = at(pier.x1 - 4, Y.water, pier.z1 + 4, TO_VIEW);
    const lamp = { x: SIGNAL.lamp[0], z: SIGNAL.lamp[2] };
    // Gordon's post is east of the lamp, so his way to the row's east end and back is clear of it
    const g0 = GORDON, g6 = ROLL[SLOT.gordon];
    void lamp;
    const gOut = seq([wait(g0, 1.4, (u) => ({ armR: 1.4 * Math.sin(Math.PI * u), elbowR: 0.3 })), walkLeg(g0, g6)]);
    const gBack = seq([walkLeg(at(g6.x, roof, g6.z, N), g0)]);
    let batLeg: Leg | null = null;
    const BAT_LAND = 15, ROLL0 = 16, ROLL1 = 23, BODY = 33;
    /** A flyer coming down out of the sky to a place, or going up into it. */
    const descend = (from: V3, to: Spot, t0: number, t1: number, tb: number, up = false): State => {
      const u = span(tb, t0, t1), e = up ? ease(u) : 1 - (1 - u) * (1 - u);
      const a: V3 = up ? [to.x, to.y, to.z] : from, b: V3 = up ? from : [to.x, to.y, to.z];
      const x = lerp(a[0], b[0], e), y = lerp(a[1], b[1], e), z = lerp(a[2], b[2], e);
      const near = up ? 1 - span(u, 0, 0.15) : span(u, 0.82, 1);
      const h = up ? toward(to.x, to.z, from[0], from[2]) : toward(from[0], from[2], to.x, to.z);
      return still(at(x, y, z, turnTo(h, to.h, near)), near > 0.5 ? leap(0.7 + 0.3 * near) : fly(u), { pitch: 0.95 * (1 - near), cape: 1, aloft: near < 0.98, glow: 1 });
    };
    let glNow: State = still(ROLL[0]);
    book.stories.push({
      id: 'league', name: 'the League Looks In', cast: ['gordon', 'batman', ...leaguers], holds: ['policeRoof', 'signal', 'sky'], weight: 0.5,
      marks: { gordon: 'post', batman: 'post', superman: ROLL[SLOT.superman], wonderWoman: ROLL[SLOT.wonderWoman], flash: ROLL[SLOT.flash], greenLantern: ROLL[SLOT.greenLantern], martianManhunter: ROLL[SLOT.martianManhunter], aquaman: AQ }, body: BODY,
      may: (w) => w.night() > 0.55 && now - lastSignal > 150,
      play(tb, P) {
        const home = P.from('batman');
        batLeg ??= lineLeg(W.solid, home, ROLL[SLOT.batman]);
        const rollPose = (id: string): Partial<Pose> => (tb > ROLL0 && tb < ROLL1 ? (id === 'superman' ? { armL: 0.25, armR: 0.25, spreadL: 0.75, spreadR: 0.75, elbowL: 1.9, elbowR: 1.9, nod: -0.1 } : id === 'wonderWoman' ? { armR: 0.5, elbowR: 0.8, spreadR: 0.3, nod: -0.05 } : { nod: -0.05 }) : idle((tb * 0.08) % 1));
        // Gordon: lights the lamp, steps round it to the row's east end, looks along the row, and goes back
        if (tb < gOut.dur) P.put('gordon', gOut.at(tb));
        else if (tb < 27) P.put('gordon', still(g6, { head: tb > ROLL0 ? 0.9 * Math.sin((tb - ROLL0) * 0.6) : 0.6, nod: tb > 1.5 && tb < 5 ? -0.6 : 0 }));
        else P.put('gordon', gBack.at(Math.min(gBack.dur, tb - 27)));
        // Superman and Wonder Woman, down out of the sky and back up into it
        P.put('superman', tb < 1.5 ? hidden(ROLL[2]) : tb < 5 ? descend(SKY_S, ROLL[2], 1.5, 5, tb) : tb < 23.5 ? still(ROLL[2], rollPose('superman'), { cape: 0.25 }) : tb < 27 ? descend(SKY_S, ROLL[2], 23.5, 27, tb, true) : hidden(ROLL[2]));
        P.put('wonderWoman', tb < 2 ? hidden(ROLL[1]) : tb < 5.5 ? descend(SKY_W, ROLL[1], 2, 5.5, tb) : tb < 24 ? still(ROLL[1], rollPose('wonderWoman'), { glow: 0.6 }) : tb < 27.5 ? descend(SKY_W, ROLL[1], 24, 27.5, tb, true) : hidden(ROLL[1]));
        // the Flash: a streak up the south wall, and down it again
        P.put('flash', tb < 6.7 || tb > 24 ? hidden(ROLL[4]) : still(ROLL[4], tb < 7.4 ? leap(0.85 + 0.15 * span(tb, 6.7, 7.4)) : rollPose('flash')));
        // Green Lantern, along his path of green light
        if (tb < 7.5) glNow = hidden(ROLL[0]);
        else if (tb < 11) {
          const u = ease(span(tb, 7.5, 10.4)), dn = span(tb, 10.4, 11), T: V3 = [ROLL[0].x, roof + 2.4, ROLL[0].z];
          glNow = still(at(lerp(GL_FROM[0], T[0], u), lerp(GL_FROM[1], T[1], u) - 2.4 * dn, lerp(GL_FROM[2], T[2], u), dn > 0.5 ? ROLL[0].h : toward(GL_FROM[0], GL_FROM[2], T[0], T[2])), dn > 0 ? leap(0.7 + 0.3 * dn) : fly(u), { pitch: 1.3 * (1 - dn), aloft: dn < 0.98, glow: 1 });
        } else if (tb < 24.5) glNow = still(ROLL[0], rollPose('greenLantern'), { glow: 1 });
        else if (tb < 27.5) {
          const u = ease(span(tb, 24.5, 27.5)), lift = span(tb, 24.5, 25.1);
          glNow = still(at(lerp(ROLL[0].x, GL_FROM[0], u), lerp(roof, GL_FROM[1], u) + 2.4 * lift * (1 - u), lerp(ROLL[0].z, GL_FROM[2], u), toward(ROLL[0].x, ROLL[0].z, GL_FROM[0], GL_FROM[2])), fly(u), { pitch: 1.3 * lift, aloft: true, glow: 1 });
        } else glNow = hidden(ROLL[0]);
        P.put('greenLantern', glNow);
        // the Martian Manhunter rises through the roof, and sinks back through it
        const mm = tb < 11.5 ? 0 : tb < 13.5 ? ease(span(tb, 11.5, 13.5)) : tb < 25 ? 1 : 1 - ease(span(tb, 25, 26.5));
        P.put('martianManhunter', mm < 0.04 ? hidden(ROLL[5]) : still(ROLL[5], { ...hang(0), nod: 0 }, { size: mm, glow: 1 - mm * 0.6, cape: 0.2 }));
        // Aquaman on his seahorse off the pier, his trident up
        const aq = tb < 8.5 ? -1 : tb < 9.5 ? span(tb, 8.5, 9.5) : tb < 25 ? 1 : 1 - span(tb, 25, 26);
        P.put('aquaman', aq <= 0.02 ? hidden(AQ) : still(at(AQ.x, AQ.y + 0.15 + 0.8 * aq, AQ.z, AQ.h), tb > 18 && tb < 21 ? salute(span(tb, 18, 21)) : drive(0), { hold: tb > ROLL0 ? 1 : 0, aloft: true, close: true }));
        // Batman, last, to the middle of the row
        const t0 = BAT_LAND - batLeg.dur, g = glowB();
        if (tb < t0) P.put('batman', still(home, perch((tb * 0.05) % 1), { cape: 0.1, ...g }));
        else if (tb < BAT_LAND) P.put('batman', { ...batLeg.at(tb - t0), ...g });
        else P.put('batman', still(ROLL[3], tb > ROLL0 && tb < ROLL1 ? { armL: 0.75, armR: 0.8, spreadL: -0.38, spreadR: -0.32, elbowL: 2.1, elbowR: 2.05 } : {}, { cape: 0.15, ...g }));
      },
      props(tb) {
        busy.seahorse = now;
        W.air?.signal(ease(span(tb, 1.2, 3.2)) * (1 - ease(span(tb, 29, 31.5))), 'bat');
        // the Flash's streak
        const streak = (t0: number, upward: boolean): void => {
          const u = span(tb, t0, t0 + 0.7);
          if (u <= 0 || u >= 1) return;
          const x = ROLL[4].x, foot: V3 = [x, Y.upper + 0.3, gcpd.z1 + 1.3], lip: V3 = [x, roof + 0.6, gcpd.z1 + 0.25], top: V3 = [x, roof + 0.4, ROLL[4].z];
          const pts = upward ? [foot, lip, top] : [top, lip, foot];
          const head = u * 2, tail = Math.max(0, head - 1.1);
          for (let i = 0; i < 2; i++) {
            const a0 = clamp(tail - i), a1 = clamp(head - i);
            if (a1 <= a0) continue;
            const A = pts[i], B = pts[i + 1];
            W.glints.line([lerp(A[0], B[0], a0), lerp(A[1], B[1], a0), lerp(A[2], B[2], a0)], [lerp(A[0], B[0], a1), lerp(A[1], B[1], a1), lerp(A[2], B[2], a1)], 0.35, i ? 0xffd040 : 0xff3a2a);
          }
        };
        streak(6.0, true);
        streak(24.0, false);
        // Green Lantern's path of green light
        const pathF = tb < 7.5 ? 0 : tb < 12 ? 1 : tb < 24.5 ? 1 - span(tb, 12, 14) : tb < 28 ? 1 : 1 - span(tb, 28, 30);
        if (pathF > 0.01 && glNow.shown) W.glints.line(GL_FROM, [glNow.x, glNow.y + 0.2, glNow.z], 0.32, dim(0x3cff70, pathF * 0.9));
        else if (pathF > 0.01 && tb < 24.5) W.glints.line(GL_FROM, [ROLL[0].x, roof + 0.2, ROLL[0].z], 0.32, dim(0x3cff70, pathF * 0.9));
        // the seahorse under Aquaman
        if (seahorse) {
          const aq = tb < 8.5 ? -1 : tb < 9.5 ? span(tb, 8.5, 9.5) : tb < 25 ? 1 : 1 - span(tb, 25, 26);
          seahorse.shown(aq > 0.02);
          seahorse.at(AQ.x, AQ.y - 0.8 + 0.8 * aq, AQ.z, AQ.h);
          seahorse.gait((tb * 0.8) % 1, 1);
        }
        W.rings.set(7, [AQ.x, Y.water + 0.05, AQ.z], 1 + 3 * span(tb, 8.5, 11) + 3 * span(tb, 25, 27.5), tb < 11 ? 0.6 * (1 - span(tb, 8.5, 11)) : tb > 25 ? 0.6 * (1 - span(tb, 25, 27.5)) : 0);
      },
      end() { batLeg = null; W.air?.signal(0); seahorse?.shown(false); W.rings.set(7, [0, 0, 0], 1, 0); },
    });
  }

  // ================================================================== 10. The Mad Hatter's Tea
  // Batman 49 (1948), the Hatter drawn from Carroll's [wp Mad Hatter]; the tea party is the tile's own, at the little
  // table that stands by their posts on the park lawn. The Tweedles sit down to it, Batgirl walks up, the Hatter doffs
  // his hat, the three bow, and they scatter three ways. He stands near no child.
  {
    // The party is laid at their posts on the lawn's east side, where the opening view sees it over the row houses;
    // the table stands there always, and the story fills it.
    const T = TEA_T;
    const HS = at(T.x, T.y, T.z - 1.2, S), DUM = at(T.x + 1.25, T.y, T.z, WEST), DEE = at(T.x - 1.25, T.y, T.z, E);
    const BGL = spot(T.x - 5.5, T.z + 1.5, E, 2), BGW = facing(spot(T.x - 3.3, T.z + 0.6, E, 2), T.x, T.z);
    const RUNS = { madHatter: spot(T.x + 6, T.z - 3, E, 2), tweedledee: spot(T.x - 3, T.z - 6, N, 2), tweedledum: spot(T.x + 2, T.z + 6, S, 2) };
    const hatterIn = walkLeg(HATTER, HS, 1.6), deeIn = walkLeg(TWEEDLEDEE, DEE, 1.6, waddle), dumIn = walkLeg(TWEEDLEDUM, DUM, 1.6, waddle);
    const A = hatterIn.dur, DEE0 = 0.6, DUM0 = 1.0, SIT = Math.max(DEE0 + deeIn.dur, DUM0 + dumIn.dur) + 0.3;
    const bgLeg = launch(LIBRARY_STEPS, BGL);
    const UP = Math.max(SIT + 9, bgLeg.dur + 4.5), BG_LAND = UP - 3, DOFF = UP + 1, BOW = DOFF + 1.5, SCATTER = BOW + 2;
    const BG_HOME = SCATTER + 5.2, bgHome = landing(BGW, LIBRARY_STEPS);
    const seated = (s: Spot, tb: number, phase: number): State => {
      const toast = Math.max(0, Math.sin((tb + phase) * 1.4)) * span(tb, SIT + 1, SIT + 2);
      return still(s, { ...sit(1), armR: 0.85 + 0.9 * toast, elbowR: 0.5 + 0.9 * toast, lean: 0.1 + 0.08 * Math.sin((tb + phase) * 3) });
    };
    const scatterOf = (id: keyof typeof RUNS, from: Spot, tb: number): State => {
      const l = walkLeg(facing(from, RUNS[id].x, RUNS[id].z), RUNS[id], RUN, id === 'madHatter' ? run : waddle);
      return tb < SCATTER + l.dur ? l.at(tb - SCATTER) : hidden(RUNS[id]);
    };
    book.stories.push({
      id: 'tea', name: "the Mad Hatter's Tea", cast: ['madHatter', 'tweedledum', 'tweedledee', 'batgirl'], holds: ['parkLawn', 'parkGate'], weight: 1,
      marks: { madHatter: 'post', tweedledum: 'post', tweedledee: 'post', batgirl: 'post' }, body: BG_HOME + bgHome.dur + 0.5,
      play(tb, P) {
        const home = P.from('batgirl');
        // the Hatter
        let h: State;
        if (tb < A) h = { ...hatterIn.at(tb), hold: 1 };
        else if (tb < SIT + 1) h = still(HS, { armR: 1.0, elbowR: 1.2, nod: 0.3 }, { hold: 1 });
        else if (tb < UP) h = still(HS, tb > SIT + 3 && tb < SIT + 5.5 ? laugh(span(tb, SIT + 3, SIT + 5.5)) : { armR: 1.0 + 0.5 * Math.sin(tb * 2), elbowR: 1.3, nod: 0.2 }, { hold: 1 });
        else if (tb < DOFF) h = still(facing(HS, BGW.x, BGW.z), {}, { hold: 0 });
        else if (tb < BOW) { const u = span(tb, DOFF, BOW); h = still(facing(HS, BGW.x, BGW.z), u < 0.5 ? { armR: 2.7, elbowR: 1.5, spreadR: 0.3 } : { armR: 1.3, elbowR: 0.2, spreadR: 0.9, lean: 0.3 }); }
        else if (tb < SCATTER) h = still(facing(HS, BGW.x, BGW.z), bow(span(tb, BOW, SCATTER)));
        else h = scatterOf('madHatter', HS, tb);
        P.put('madHatter', h);
        // the Tweedles: down to their tea, up to bow, and away
        const tw = (id: 'tweedledum' | 'tweedledee', inLeg: Leg, s: Spot, t0: number, phase: number): void => {
          let st: State;
          if (tb < t0) st = still(P.from(id), idle((tb * 0.1) % 1));
          else if (tb < t0 + inLeg.dur) st = inLeg.at(tb - t0);
          else if (tb < SIT) st = still(s, {});
          else if (tb < SIT + 0.8) st = still(s, sit(span(tb, SIT, SIT + 0.8) * 0.4));
          else if (tb < UP) st = seated(s, tb, phase);
          else if (tb < DOFF) st = still(s, blend(sit(1), {}, span(tb, UP, DOFF)));
          else if (tb < BOW) st = still(facing(s, BGW.x, BGW.z), {});
          else if (tb < SCATTER) st = still(facing(s, BGW.x, BGW.z), bow(span(tb, BOW, SCATTER)));
          else st = scatterOf(id, s, tb);
          P.put(id, st);
        };
        tw('tweedledee', deeIn, DEE, DEE0, 0);
        tw('tweedledum', dumIn, DUM, DUM0, 1.7);
        // Batgirl swings down on the lawn and walks up
        const t0 = BG_LAND - bgLeg.dur, g = glowB(), walkUp = walkLeg(BGL, BGW, 1.8);
        if (tb < t0) P.put('batgirl', still(home, sit(1), g));
        else if (tb < BG_LAND) P.put('batgirl', { ...bgLeg.at(tb - t0), ...g });
        else if (tb < BG_LAND + walkUp.dur) P.put('batgirl', { ...walkUp.at(tb - BG_LAND), ...g });
        else if (tb > BG_HOME + bgHome.dur) P.put('batgirl', still(LIBRARY_STEPS, sit(span(tb, BG_HOME + bgHome.dur, BG_HOME + bgHome.dur + 0.5)), g));
        else if (tb > BG_HOME) P.put('batgirl', { ...bgHome.at(tb - BG_HOME), ...g });
        else P.put('batgirl', still(BGW, tb > SCATTER + 2.5 && tb < SCATTER + 5 ? shrug(span(tb, SCATTER + 2.5, SCATTER + 5)) : { head: 0.3 * Math.sin(tb), armL: 0.2, armR: 0.2, spreadL: 0.5, spreadR: 0.5, elbowL: 2.0, elbowR: 2.0 }, g));
      },
    });
  }

  // ================================================================== 11. The Talon on the Tower
  // Batman vol. 2, 1 to 11 (2011), the Court of Owls: a Talon, and the thirteenth gargoyle on Wayne Tower that caught
  // Bruce Wayne in issue 2 [city note, Wayne Tower]. The Talon drops from the thirteenth gargoyle onto Batman's perch;
  // they circle and clash twice on the tower's ledge without touching, and the Talon dives off with his arms spread
  // and is gone before he lands. No knives.
  {
    const ledgeX = tower.x1 - 2.45, ledgeY = gy(ledgeX, tower.z1 - 4.6, PERCH.y + 3);
    const M = { x: ledgeX, z: tower.z1 - 4.6 }, R = 0.62;
    const B0 = at(M.x, ledgeY, M.z - R, S), T0 = at(M.x, ledgeY, M.z + R, N);
    // the ledge's way down from the gargoyle passes between the corner's pinnacles, by its outer edge
    const DOWN = at(tower.x1 - 1.9, ledgeY, tower.z1 - 2.7, N);
    const EDGE = at(tower.x1 - 1.9, ledgeY, M.z + R, E), OUT: V3 = [tower.x1 + 5, ledgeY - 12, M.z + R + 1];
    const BEDGE = at(tower.x1 - 1.95, ledgeY, M.z - R - 0.4, E);
    const OFF: V3 = [THIRTEENTH.x + 0.6, THIRTEENTH.y + 0.6, THIRTEENTH.z + 0.95], FALL: V3 = [tower.x1 + 0.4, PERCH.y + 3.2, PERCH.z - 1.4];
    const circleAt = (a: number, who: 0 | 1): Spot => {
      const ang = a + (who ? Math.PI : 0), x = M.x + Math.cos(ang) * R, z = M.z + Math.sin(ang) * R;
      return at(x, ledgeY, z, toward(x, z, M.x, M.z));
    };
    const A_START = -Math.PI / 2;
    const ready: Partial<Pose> = parry(0);
    let tl: State = still(THIRTEENTH), bm: State = still(PERCH);
    book.stories.push({
      id: 'talon', name: 'the Talon on the Tower', cast: ['talon', 'batman'], holds: ['towerCorner'], weight: 1,
      marks: { talon: 'post', batman: 'post' }, body: 33,
      may: (w) => w.night() > 0.2,
      play(tb, P) {
        const g = glowB();
        // the Talon
        if (tb < 5) tl = still(THIRTEENTH, { ...perch(0), head: Math.sin(tb * 2.6) > 0 ? 1.1 : -0.4, nod: 0.5 }, g);
        else if (tb < 5.5) { const u = span(tb, 5, 5.5); tl = still(at(lerp(THIRTEENTH.x, OFF[0], u), lerp(THIRTEENTH.y, OFF[1], u), lerp(THIRTEENTH.z, OFF[2], u), E), leap(0.2 + 0.3 * u), { aloft: true, cape: 0.5, ...g }); }
        else if (tb < 7.1) { const u = span(tb, 5.5, 7.1), e = u * u; tl = still(at(lerp(OFF[0], FALL[0], u), lerp(OFF[1], FALL[1], e), lerp(OFF[2], FALL[2], u), toward(OFF[0], OFF[2], FALL[0], FALL[2])), glide(u), { aloft: true, cape: 1, spread: 1, pitch: 0.4, ...g }); }
        else if (tb < 7.7) { const u = ease(span(tb, 7.1, 7.7)); tl = still(at(lerp(FALL[0], PERCH.x, u), lerp(FALL[1], PERCH.y, u), lerp(FALL[2], PERCH.z, u), WEST), leap(0.7 + 0.3 * u), { aloft: u < 0.95, cape: 1 - u, spread: 1 - u, ...g }); }
        else if (tb < 9) tl = still(at(PERCH.x, PERCH.y, PERCH.z, toward(PERCH.x, PERCH.z, B0.x, B0.z)), { ...perch(0), head: tb < 8.3 ? 0.8 : -0.6 }, g);
        else if (tb < 9.7) { const u = ease(span(tb, 9, 9.7)); tl = still(at(lerp(PERCH.x, DOWN.x, u), lerp(PERCH.y, DOWN.y, u) + 2.2 * Math.sin(Math.PI * u), lerp(PERCH.z, DOWN.z, u), N), leap(0.3 + 0.7 * u), { aloft: true, ...g }); }
        else if (tb < 11) { const l = walkLeg(DOWN, T0, 1.6); tl = { ...l.at(Math.min(l.dur, tb - 9.7)), ...g }; }
        else if (tb < 16) tl = still(circleAt(A_START + Math.PI * ease(span(tb, 11, 16)), 1), ready, g);
        else if (tb < 17.5) tl = still(circleAt(A_START + Math.PI, 1), strike(span(tb, 16, 17.5)), g);
        else if (tb < 21) tl = still(circleAt(A_START + Math.PI + Math.PI * ease(span(tb, 17.5, 21)), 1), ready, g);
        else if (tb < 22.5) tl = still(circleAt(A_START, 1), parry(span(tb, 21, 22.5)), g);
        else if (tb < 23.6) { const l = walkLeg(circleAt(A_START, 1), EDGE, 2.4); tl = { ...l.at(Math.min(l.dur, tb - 22.5)), ...g }; }
        else if (tb < 24.2) tl = still(EDGE, leap(span(tb, 23.6, 24.2) * 0.3), g);
        else if (tb < 26.6) {
          const u = span(tb, 24.2, 26.6);
          tl = still(at(lerp(EDGE.x, OUT[0], u), EDGE.y + 1.5 * Math.sin(Math.PI * Math.min(1, u * 2.2)) - (EDGE.y - OUT[1]) * u * u, lerp(EDGE.z, OUT[2], u), E), star(0), { aloft: true, cape: 1, spread: 1, pitch: 0.9 * u, ...g });
        } else tl = hidden(at(OUT[0], OUT[1], OUT[2], E));
        P.put('talon', tl);
        // Batman: off his gargoyle onto the ledge, the circling, the edge, and back up
        if (tb < 3) bm = still(PERCH, { ...perch((tb * 0.05) % 1), head: tb > 2 ? -0.8 : 0.3 }, { cape: 0.1, ...g });
        else if (tb < 3.8) { const u = ease(span(tb, 3, 3.8)); bm = still(at(lerp(PERCH.x, DOWN.x, u), lerp(PERCH.y, DOWN.y, u) + 2.2 * Math.sin(Math.PI * u), lerp(PERCH.z, DOWN.z, u), N), leap(0.3 + 0.7 * u), { aloft: true, cape: 0.6, ...g }); }
        else if (tb < 5.6) { const l = walkLeg(DOWN, at(B0.x, B0.y, B0.z, S), 1.6); bm = { ...l.at(Math.min(l.dur, tb - 3.8)), ...g }; }
        else if (tb < 11) bm = still(at(B0.x, B0.y, B0.z, S), { ...ready, head: tb < 7.7 ? 0.9 * Math.sin(tb) : 0, nod: tb < 7.7 ? -0.5 : 0 }, g);
        else if (tb < 16) bm = still(circleAt(A_START + Math.PI * ease(span(tb, 11, 16)), 0), ready, { cape: 0.3, ...g });
        else if (tb < 17.5) bm = still(circleAt(A_START + Math.PI, 0), parry(span(tb, 16, 17.5)), { cape: 0.3, ...g });
        else if (tb < 21) bm = still(circleAt(A_START + Math.PI + Math.PI * ease(span(tb, 17.5, 21)), 0), ready, { cape: 0.3, ...g });
        else if (tb < 22.5) bm = still(circleAt(A_START, 0), strike(span(tb, 21, 22.5)), { cape: 0.4, ...g });
        else if (tb < 24.4) bm = still(circleAt(A_START, 0), ready, g);
        else if (tb < 25.6) { const l = walkLeg(circleAt(A_START, 0), BEDGE, 2.4); bm = { ...l.at(Math.min(l.dur, tb - 24.4)), ...g }; }
        else if (tb < 29.5) bm = still(BEDGE, { nod: 0.6, lean: 0.15, head: -0.3 }, { cape: 0.4, ...g });
        else if (tb < 30.6) { const l = walkLeg(BEDGE, at(DOWN.x, DOWN.y, DOWN.z, S), 1.6); bm = { ...l.at(Math.min(l.dur, tb - 29.5)), ...g }; }
        else if (tb < 31.4) { const u = ease(span(tb, 30.6, 31.4)); bm = still(at(lerp(DOWN.x, PERCH.x, u), lerp(DOWN.y, PERCH.y, u) + 2.2 * Math.sin(Math.PI * u), lerp(DOWN.z, PERCH.z, u), turnTo(S, PERCH.h, u)), leap(0.3 + 0.7 * u), { aloft: true, ...g }); }
        else bm = still(PERCH, perch(0), { cape: 0.1, ...g });
        P.put('batman', bm);
      },
    });
  }

  // ================================================================== 12. The Night of the Pumpkin
  // Batman: Haunted Knight (1996): the Scarecrow made the Signal a jack-o'-lantern [wp Bat-Signal; rogues note, story
  // 10]. A night piece: the disc shows a pumpkin by itself, Gordon and Bullock on the police roof look up at it,
  // Batman lands, and the three look out over the city while Catwoman watches from her roof. It ends when the disc goes
  // dark.
  {
    const roof = gcpd.top;
    // out of the beam's way, along the roof's south parapet, where the opening view sees them
    const BUL = at(ROLL[1].x, roof, ROLL[1].z, S), G2 = at(ROLL[2].x, roof, ROLL[2].z, S);
    const BAT = at(ROLL[3].x + 0.2, roof, ROLL[3].z, S);
    // back behind Batman, who stays at the parapet, and round the lamp
    const gTo = lampWalk(GORDON, G2), gBack = route([at(G2.x, roof, G2.z, N), at(G2.x + 1.3, roof, G2.z - 1.3, E), at(SIGNAL.lamp[0] - 1.3, roof, G2.z - 0.6, E), ROUND_LAMP, GORDON]);
    const bulIn = walkLeg(BULLOCK, BUL, 2.0), bulOut = walkLeg(facing(BUL, BULLOCK.x, BULLOCK.z), BULLOCK, 2.0);
    let batLeg: Leg | null = null;
    // Batman lands once Gordon, who goes round the lamp and along the parapet, has passed the place
    const BAT_LAND = 6.6 + gTo.dur, DARK = 25, BODY = DARK + 3 + gBack.dur + 0.4;
    const disc = (tb: number): number => ease(span(tb, 0.5, 2.5)) * (1 - ease(span(tb, DARK, DARK + 2)));
    const up = (tb: number, k0: number): Partial<Pose> => ({ nod: -0.65 + 0.05 * Math.sin(tb + k0), head: 0.15 * Math.sin(tb * 0.3 + k0) });
    book.stories.push({
      id: 'pumpkin', name: 'the Night of the Pumpkin', cast: ['gordon', 'bullock', 'batman', 'catwoman'], holds: ['policeRoof', 'signal'], weight: 0.4,
      marks: { gordon: 'post', bullock: 'post', batman: 'post', catwoman: 'post' }, body: BODY,
      may: (w) => w.night() > 0.5,
      play(tb, P) {
        const g0 = P.from('gordon'), home = P.from('batman'), cat = P.from('catwoman');
        batLeg ??= lineLeg(W.solid, home, BAT);
        const out = (s: Spot): Spot => at(s.x, s.y, s.z, turnTo(s.h, TO_VIEW, span(tb, 13, 14.5)));
        // Gordon starts, looks up, scratches his head, and looks out with the others
        if (tb < 1) P.put('gordon', still(g0, idle(0)));
        else if (tb < 6.5) P.put('gordon', still(g0, tb > 4 ? { ...shrug(span(tb, 4, 6.5)), nod: -0.5 } : up(tb, 0)));
        else if (tb < 6.5 + gTo.dur) P.put('gordon', gTo.at(tb - 6.5));
        else if (tb < 13) P.put('gordon', still(G2, up(tb, 0)));
        else if (tb < DARK + 3) P.put('gordon', still(out(G2), tb < DARK + 0.5 ? up(tb, 0) : shrug(span(tb, DARK + 0.5, DARK + 3))));
        else P.put('gordon', gBack.at(Math.min(gBack.dur, tb - DARK - 3)));
        // Bullock comes out of the roof door, points at it, and goes back in when it is dark
        if (tb < 2.3) P.put('bullock', bullockRest(tb, P.from('bullock')));
        else if (tb < 2.5 + bulIn.dur) P.put('bullock', bulIn.at(tb - 2.5));
        else if (tb < 13) P.put('bullock', still(BUL, tb > 6.5 && tb < 9 ? { ...point(span(tb, 6.5, 9)), nod: -0.6 } : up(tb, 1)));
        else if (tb < DARK + 2) P.put('bullock', still(out(BUL), up(tb, 1)));
        else if (tb < DARK + 2 + bulOut.dur) P.put('bullock', bulOut.at(tb - DARK - 2));
        else P.put('bullock', bullockRest(tb, BULLOCK));
        // Batman lands, and looks out with them
        const t0 = BAT_LAND - batLeg.dur, g = glowB();
        if (tb < t0) P.put('batman', still(home, { ...perch(0), nod: -0.3, head: 0.6 }, { cape: 0.1, ...g }));
        else if (tb < BAT_LAND) P.put('batman', { ...batLeg.at(tb - t0), ...g });
        else P.put('batman', still(out(BAT), tb < DARK ? up(tb, 2) : { nod: 0.1 }, { cape: 0.2, ...g }));
        // Catwoman on her roof stands to watch the sky
        const rise = ease(span(tb, 3, 4.5));
        P.put('catwoman', still(facing(cat, SIGNAL.cloud.c[0], SIGNAL.cloud.c[2]), blend(perch(0), { nod: -0.5, head: 0.1 }, rise), g));
      },
      props(tb) { W.air?.signal(disc(tb), 'pumpkin'); },
      end() { W.air?.signal(0); },
    });
  }

  // ================================================================== 13. The League's flyers pass over
  // The League's flyers seen now and then in Gotham's sky (wider cast, section 3; the crossings are the tile's own).
  // Each time, the next in turn crosses high over the tile on a line of its own: Superman level with an arm ahead and
  // a slow roll as he passes Wayne Tower; Green Lantern trailing green light; the Martian Manhunter upright and slow;
  // Wonder Woman in her invisible plane (Sensation Comics, 1940s [wider cast]).
  {
    const plane = machine('invisiblePlane');
    const IN = (v: number, lim: number): number => clamp(v, -lim, lim);
    const route = (ax: number, az: number, bx: number, bz: number, least: number): { a: V3; b: V3 } => {
      let top = 0;
      for (let i = 0; i <= 60; i++) {
        const x = lerp(ax, bx, i / 60), z = lerp(az, bz, i / 60);
        for (const [dx, dz] of [[0, 0], [6, 0], [-6, 0], [0, 6], [0, -6]]) top = Math.max(top, W.solid.top(x + dx, z + dz));
      }
      const y = clamp(Math.max(least, top + 7), 55, 80);
      if (import.meta.env.DEV && top + 6 > y) console.warn(`Gotham: a flyby's line passes within 6 of what is built (top ${top.toFixed(1)}).`);
      return { a: [IN(ax, 100), y, IN(az, 108)], b: [IN(bx, 100), y + 3, IN(bz, 108)] };
    };
    const FLYERS = [
      { id: 'superman', ...route(-100, 64, 100, -40, 66), dur: 9.5 },
      { id: 'greenLantern', ...route(100, 92, -62, -108, 62), dur: 10.5 },
      { id: 'martianManhunter', ...route(-100, -70, 100, 20, 58), dur: 15 },
      { id: 'wonderWoman', ...route(60, -108, -20, 108, 60), dur: 11.5 },
    ] as const;
    const WT = { x: (tower.x0 + tower.x1) / 2, z: (tower.z0 + tower.z1) / 2 };
    let turn = 0;
    const T0 = 1.5, BODY = 16;
    const posOf = (f: (typeof FLYERS)[number], tb: number): { p: V3; u: number; h: number } => {
      const u = span(tb, T0, T0 + f.dur);
      return { p: [lerp(f.a[0], f.b[0], u), lerp(f.a[1], f.b[1], u), lerp(f.a[2], f.b[2], u)], u, h: toward(f.a[0], f.a[2], f.b[0], f.b[2]) };
    };
    // when Superman is nearest Wayne Tower, for his roll
    let nearT = T0 + FLYERS[0].dur / 2;
    { let best = Infinity; for (let t = T0; t < T0 + FLYERS[0].dur; t += 0.05) { const { p } = posOf(FLYERS[0], t); const d = Math.hypot(p[0] - WT.x, p[2] - WT.z); if (d < best) { best = d; nearT = t; } } }
    const trail: V3[] = [];
    book.stories.push({
      id: 'flyby', name: "the League's flyers pass over", cast: FLYERS.map((f) => f.id), holds: ['sky'], weight: 0.5,
      marks: Object.fromEntries(FLYERS.map((f) => [f.id, at(f.a[0], f.a[1], f.a[2], 0)])), body: BODY,
      play(tb, P) {
        FLYERS.forEach((f, i) => {
          const { p, u, h } = posOf(f, tb);
          if (i !== turn % FLYERS.length || u <= 0 || u >= 1) { P.put(f.id, hidden(at(f.a[0], f.a[1], f.a[2], h))); return; }
          if (f.id === 'superman') {
            const roll = TAU * ease(span(tb, nearT - 1.6, nearT + 1.6));
            P.put(f.id, still(at(p[0], p[1], p[2], h), fly(u * 3 % 1), { pitch: 1.45, roll, cape: 1, aloft: true }));
          } else if (f.id === 'greenLantern') P.put(f.id, still(at(p[0], p[1], p[2], h), fly(u * 3 % 1), { pitch: 1.45, aloft: true, glow: 1 }));
          else if (f.id === 'martianManhunter') P.put(f.id, still(at(p[0], p[1], p[2], h), { ...hang(0), nod: 0.1, kneeL: 0.15, kneeR: 0.1 }, { pitch: 0.12, cape: 0.8, aloft: true, glow: 0.5 }));
          else {
            const seat = seatOn(plane, p[0], p[1], p[2], h, 0, 0, [1.15, 0.6, -0.36]);
            P.put(f.id, still(at(seat[0], seat[1], seat[2], h), drive((tb * 0.3) % 1), { aloft: true, close: true, glow: 0.4 }));
          }
        });
      },
      props(tb, live) {
        const f = FLYERS[turn % FLYERS.length], { p, u, h } = posOf(f, tb);
        if (f.id === 'wonderWoman' && plane) {
          plane.shown(u > 0 && u < 1);
          if (u > 0 && u < 1) { plane.at(p[0], p[1], p[2], h, 0, 0.08 * Math.sin(tb * 0.7)); plane.lights(0.6); if (live) plane.run(30, 1 / 60); }
        }
        if (f.id === 'greenLantern') {
          if (live && u > 0 && u < 1) { trail.unshift([p[0], p[1] + 0.3, p[2]]); if (trail.length > 24) trail.pop(); }
          for (let i = 0; i < trail.length; i += 2) W.glints.speck(trail[i], 0.34 - i * 0.008, dim(0x3cff70, 1 - i / trail.length));
        }
      },
      end() { turn++; trail.length = 0; plane?.shown(false); plane?.lights(0); },
    });
  }

  // ================================================================== 14 and 15. Bruce Wayne's helicopter
  // The collector's own wish: a helicopter at Wayne Tower that Bruce Wayne gets into and flies home to Wayne Manor in,
  // and back. Two stories that take turns, since it stays where it lands: `heliHome` while it stands on the tower's
  // deck, `heliWork` while it stands on the Manor's ring. Batman and Bruce Wayne are never in sight at once: where
  // one goes in at the tower's door, the other comes out of it. The Manor's end is kept to its places by name while
  // the Manor and the cave are redrawn.
  {
    const copter = machine('wayneCopter');
    const DECK = W.place('towers', 'helipad', at(tower.x1 + 3.8, Y.crown + 51.3, (tower.z0 + tower.z1) / 2, TO_VIEW));
    const DOOR = W.place('towers', 'heliDoor', at(tower.x1 - 3.2, DECK.y, DECK.z, E));
    const MPAD = W.place('bristol', 'manorPad', at(81, Y.crest + 0.09, -91, TO_VIEW));
    const EDOOR = W.place('bristol', 'eastDoor', at(57.95, Y.crest + 0.04, -91.9, E));
    const EPATH = W.place('bristol', 'eastPath', at(60.95, Y.crest + 0.04, -91.9, E));
    const MDOOR = MANOR_DOOR;
    /** Where it rests: on the tower's deck facing the tower, its left side (seat 0) to the south and the view; on the Manor's ring facing north, its left side to the west and the house. */
    const ATTOWER = { x: DECK.x, y: DECK.y, z: DECK.z, h: WEST }, ATMANOR = { x: MPAD.x, y: MPAD.y, z: MPAD.z, h: N };
    let restsAt: 'tower' | 'manor' = 'tower';
    let busyT = -10;
    const LOCAL0: V3 = [0.6, 0.45, -0.55];
    const seatAt = (p: { x: number; y: number; z: number; h: number }): V3 => seatOn(copter, p.x, p.y, p.z, p.h, 0, 0, LOCAL0);
    /** The place beside a resting machine's left door, on what it stands on. */
    const doorSide = (p: { x: number; y: number; z: number; h: number }): Spot => {
      const s = copter ? (copter.at(p.x, p.y, p.z, p.h, 0, 0), copter.seat(0)) : seatAt(p);
      const x = s[0] + Math.sin(p.h) * 1.4, z = s[2] - Math.cos(p.h) * 1.4;
      return at(x, gy(x, z, p.y + 1), z, toward(x, z, s[0], s[2]));
    };
    const TOWER_SIDE = doorSide(ATTOWER), MANOR_SIDE = doorSide(ATMANOR);
    // the tower's end: the ledge by the door, the gap in the parapet, the gangway onto the deck, and round the nose
    const GAP = at(DOOR.x + 1.3, DECK.y, DOOR.z, E), G0 = at(DECK.x - 4.0, DECK.y, DECK.z + 0.4, E), G1 = at(DECK.x - 3.2, DECK.y, TOWER_SIDE.z, E);
    const LEDGE = at(DOOR.x + 0.3, DECK.y, DOOR.z + 2.1, N);
    // the Manor's end: on the court's gravel just outside the porte-cochère's east arch, a pace and a half from where
    // Alfred stands on its flags, and a pace aside for him. The arch is walked through off its middle (where its
    // soffit stands over the porch's roof, and the check finds a figure inside it), and the court's place for a hero is
    // walked round by its south side, 5 clear of it.
    const MEET = at(EPATH.x + 1.45, EPATH.y, EPATH.z + 0.9, WEST), ASIDE = at(EPATH.x - 0.2, EPATH.y, EPATH.z - 1.2, S);
    const IN_ARCH = at(EPATH.x + 0.05, EPATH.y, MEET.z, WEST);
    const COURT_HERO = HERO_SPOTS.find((s) => s.id === 'manor') ?? { x: 67, z: -94 };
    const COURT_W = at(MEET.x + 0.8, EPATH.y, COURT_HERO.z + 5.2, E), COURT_E = at(COURT_HERO.x + 5, EPATH.y, COURT_HERO.z + 5.2, E);
    // the way between, round the north side of the Signal's beam: up the tower's east face and away north-east
    const WP: [number, number] = [tower.x1 + 0.4, tower.z0 - 8];
    /** How high a leg must fly to be 9 clear of everything within `r` of its line. */
    const legY = (ax: number, az: number, bx: number, bz: number, r: number): number => {
      let top = 0;
      for (let i = 0; i <= 50; i++) {
        const x = lerp(ax, bx, i / 50), z = lerp(az, bz, i / 50);
        for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, -r * 0.7]]) top = Math.max(top, W.solid.top(x + dx, z + dz));
      }
      return top + 9;
    };
    const Y_TOWER = legY(DECK.x, DECK.z, WP[0], WP[1], 4), Y_AWAY = legY(WP[0], WP[1], MPAD.x, MPAD.z, 7);

    interface Seg { t0: number; t1: number; k: 'rest' | 'spin' | 'beat' | 'lift' | 'turn' | 'move' | 'down' | 'sink' | 'settle' | 'still'; a: V3; b: V3; h0: number; h1: number }
    /** The whole flight, from rest at `from` to rest at `to` by way of `via` at the heights given, starting at t0. */
    const flightOf = (from: typeof ATTOWER, via: { x: number; z: number; y: number }[], to: typeof ATTOWER, t0: number): { segs: Seg[]; settled: number; end: number } => {
      const segs: Seg[] = [];
      let t = t0, here: V3 = [from.x, from.y, from.z], head = from.h;
      const add = (k: Seg['k'], b: V3, h1: number, dur: number): void => { segs.push({ t0: t, t1: t + dur, k, a: here, b, h0: head, h1 }); t += dur; here = b; head = h1; };
      add('spin', here, head, 3);
      add('beat', here, head, 0.8);
      add('lift', [here[0], here[1] + 6, here[2]], head, 2.2);
      for (const p of via) {
        const h = Math.atan2(p.z - here[2], p.x - here[0]);
        add('turn', here, h, Math.max(0.6, Math.abs(turnTo(head, h, 1) - head) * 1.1));
        add('move', [p.x, p.y, p.z], h, Math.max(3, Math.hypot(p.x - here[0], p.z - here[2]) / 20));
      }
      add('turn', here, to.h, Math.max(0.6, Math.abs(turnTo(head, to.h, 1) - head) * 1.1));
      add('down', [to.x, to.y + 8, to.z], to.h, Math.max(2.5, (here[1] - to.y - 8) / 12));
      add('sink', [to.x, to.y + 1.5, to.z], to.h, 3.6);
      add('settle', [to.x, to.y, to.z], to.h, 2.6);
      const settled = t;
      add('still', here, to.h, 3);
      return { segs, settled, end: t };
    };
    const poseOf = (segs: Seg[], tb: number): { x: number; y: number; z: number; h: number; pitch: number; rotors: number; v: number } => {
      const s = segs.find((g) => tb >= g.t0 && tb < g.t1) ?? (tb < segs[0].t0 ? { ...segs[0], k: 'rest' as const } : segs[segs.length - 1]);
      const u = span(tb, s.t0, s.t1);
      const rotors = s.k === 'rest' ? 0 : s.k === 'spin' ? ease(u) : s.k === 'still' ? (tb >= s.t1 ? 0 : 1 - ease(u)) : 1;
      if (s.k === 'move') {
        const climb = s.b[1] > s.a[1] ? ease(Math.min(1, u * 2.5)) : u, e = ease(u);
        const d = Math.hypot(s.b[0] - s.a[0], s.b[2] - s.a[2]);
        return { x: lerp(s.a[0], s.b[0], e), y: lerp(s.a[1], s.b[1], climb), z: lerp(s.a[2], s.b[2], e), h: s.h0, pitch: -0.12 * Math.sin(Math.PI * u), rotors, v: (6 * u * (1 - u) * d) / (s.t1 - s.t0) };
      }
      const f = s.k === 'lift' || s.k === 'down' ? ease(u) : s.k === 'sink' ? u : s.k === 'settle' ? 1 - (1 - u) * (1 - u) : 0;
      return { x: s.a[0], y: lerp(s.a[1], s.b[1], f), z: s.a[2], h: s.k === 'turn' ? turnTo(s.h0, s.h1, ease(u)) : s.h1, pitch: 0, rotors, v: rotors };
    };
    /** For the console: how near the flight comes to what is built (rotor and all) while in the air, and to the Signal's column in plan. */
    const clearance = (segs: Seg[]): string => {
      let low = Infinity, sig = Infinity;
      for (const s of segs) {
        if (!['move', 'turn', 'lift', 'down'].includes(s.k)) continue;
        for (let t = s.t0; t < s.t1; t += 0.1) {
          const p = poseOf(segs, t);
          let top = -Infinity;
          for (const [dx, dz] of [[0, 0], [3.6, 0], [-3.6, 0], [0, 3.6], [0, -3.6], [2.5, 2.5], [-2.5, 2.5], [2.5, -2.5], [-2.5, -2.5]]) top = Math.max(top, W.solid.top(p.x + dx, p.z + dz));
          if (s.k !== 'lift' || t > s.t0 + 0.6) low = Math.min(low, p.y - top);
          if (s.k === 'move') sig = Math.min(sig, Math.hypot(p.x - SIGNAL.lamp[0], p.z - SIGNAL.lamp[2]));
        }
      }
      return `at least ${low.toFixed(1)} over what is built, ${sig.toFixed(1)} from the Signal's column`;
    };
    let lastTb = 0;
    const fly = (segs: Seg[], tb: number, live: boolean, lampsTo: number): void => {
      busyT = now;
      if (!copter) return;
      const p = poseOf(segs, tb), dt = clamp(tb - lastTb, 0, 0.1);
      lastTb = tb;
      copter.at(p.x, p.y, p.z, p.h, p.pitch, 0);
      copter.shown(true);
      copter.trick('rotors', p.rotors);
      copter.lights(tb < segs[0].t0 ? 0 : tb < lampsTo ? 1 : 1 - span(tb, lampsTo, lampsTo + 2));
      if (live) copter.run(p.v * 8 * p.rotors, dt);
    };
    /** Bruce in the seat, wherever the machine now is. */
    const seated = (segs: Seg[], tb: number): State => {
      const p = poseOf(segs, tb), s = seatOn(copter, p.x, p.y, p.z, p.h, p.pitch, 0, LOCAL0);
      return still(at(s[0], s[1], s[2], p.h), drive((tb * 0.3) % 1), { aloft: true, close: true });
    };
    const hop = (a: Spot, b: V3, h: number, u: number): State => still(at(lerp(a.x, b[0], ease(u)), lerp(a.y, b[1], ease(u)) + 0.9 * Math.sin(Math.PI * u), lerp(a.z, b[2], ease(u)), h), leap(0.3 + 0.6 * u), { aloft: true, close: true });

    // ------------------------------------------------------------ home: tower to Manor
    {
      const toDoor = walkLeg(at(LEDGE.x, LEDGE.y, LEDGE.z, toward(LEDGE.x, LEDGE.z, DOOR.x, DOOR.z)), at(DOOR.x, DOOR.y, DOOR.z, WEST), 1.8);
      const out = seq([walkLeg(DOOR, GAP, 1.6), wait(GAP, 1.8, (u) => ({ head: 0.9 * Math.sin(u * Math.PI * 2), nod: -0.1 })), walkLeg(GAP, G0, 2.0), walkLeg(G0, G1, 2.0), walkLeg(G1, TOWER_SIDE, 2.0)]);
      const B_OUT = 3.4, B_HOP = B_OUT + out.dur;
      const fl = flightOf(ATTOWER, [{ x: WP[0], z: WP[1], y: Y_TOWER }, { x: MPAD.x, z: MPAD.z, y: Y_AWAY }], ATMANOR, B_HOP + 1.0);
      const SEAT0 = seatAt(ATTOWER);
      const OUT_T = fl.settled + 0.6, toMeet = route([facing(MANOR_SIDE, COURT_E.x, COURT_E.z), COURT_E, COURT_W, MEET], 2.4);
      const MET = OUT_T + 0.8 + toMeet.dur, BOWED = MET + 1.8, IN = route([MEET, IN_ARCH, at(EDOOR.x, EDOOR.y, EDOOR.z, WEST)], 2.0);
      const aIn = walkLeg(ALFRED, at(MDOOR.x, MDOOR.y, MDOOR.z, N), 1.6), A_GO = fl.segs[4].t0, A_OUT = fl.settled - 3.6;
      const aOut = walkLeg(EDOOR, at(EPATH.x, EPATH.y, EPATH.z, toward(EPATH.x, EPATH.z, MANOR_SIDE.x, MANOR_SIDE.z)), 1.8);
      const aAside = walkLeg(at(EPATH.x, EPATH.y, EPATH.z, N), ASIDE, 1.2), aBack = walkLeg(ASIDE, at(EDOOR.x, EDOOR.y, EDOOR.z, WEST), 1.8);
      const B_IN = BOWED + 0.8 + IN.dur, A_IN = B_IN + 1.0 + aBack.dur;
      book.stories.push({
        id: 'heliHome', name: "Bruce Wayne's helicopter home", cast: ['bruce', 'batman', 'alfred'], holds: ['sky', 'wayneCopter', 'towerCorner', 'terrace', 'manorPad'], weight: 0.7,
        marks: { bruce: DOOR, batman: LEDGE, alfred: 'post' }, body: A_IN + 0.6,
        may: () => restsAt === 'tower',
        play(tb, P) {
          // Batman goes in at the tower's door, and once Bruce has gone in at the Manor's east door he is in the Manor:
          // the director brings him home from its front door
          P.put('batman', tb < 0.5 ? still(LEDGE, {}, glowB()) : tb < 0.5 + toDoor.dur ? { ...toDoor.at(tb - 0.5), ...glowB() } : tb < B_IN ? hidden(DOOR) : hidden(MDOOR));
          // Bruce Wayne: out of the same door, a look over the city, over the gangway, in, flown, out, to Alfred, a bow, in
          let b: State;
          if (tb < B_OUT) b = hidden(DOOR);
          else if (tb < B_HOP) b = out.at(tb - B_OUT);
          else if (tb < B_HOP + 0.8) b = hop(TOWER_SIDE, SEAT0, WEST, span(tb, B_HOP, B_HOP + 0.8));
          else if (tb < OUT_T) b = seated(fl.segs, tb);
          else if (tb < OUT_T + 0.8) { const s = seatAt(ATMANOR); const u = span(tb, OUT_T, OUT_T + 0.8); b = still(at(lerp(s[0], MANOR_SIDE.x, ease(u)), lerp(s[1], MANOR_SIDE.y, ease(u)) + 0.9 * Math.sin(Math.PI * u), lerp(s[2], MANOR_SIDE.z, ease(u)), WEST), leap(0.3 + 0.6 * u), { aloft: true, close: true }); }
          else if (tb < MET) b = toMeet.at(tb - OUT_T - 0.8);
          else if (tb < BOWED + 0.8) b = still(MEET, tb > MET + 0.3 && tb < BOWED ? { nod: 0.3, armR: 0.6, elbowR: 1.2 } : {});
          else if (tb < B_IN) b = IN.at(tb - BOWED - 0.8);
          else b = hidden(EDOOR);
          P.put('bruce', b);
          // Alfred: into the front door while it flies, out of the east door as it settles, a bow, aside, and in after him
          let a: State;
          const home = P.from('alfred');
          if (tb < A_GO) a = still(home, { armL: -0.35, armR: -0.35, elbowL: 0.9, elbowR: 0.9, head: 0.4 * Math.sin(tb * 0.3), nod: -0.2 });
          else if (tb < A_GO + aIn.dur) a = aIn.at(tb - A_GO);
          else if (tb < A_OUT) a = hidden(MDOOR);
          else if (tb < A_OUT + aOut.dur) a = aOut.at(tb - A_OUT);
          else if (tb < MET) a = still(at(EPATH.x, EPATH.y, EPATH.z, toward(EPATH.x, EPATH.z, tb > OUT_T ? b.x : MANOR_SIDE.x, tb > OUT_T ? b.z : MANOR_SIDE.z)), {});
          else if (tb < BOWED) a = still(at(EPATH.x, EPATH.y, EPATH.z, E), bow(span(tb, MET, BOWED)));
          else if (tb < BOWED + aAside.dur) a = aAside.at(tb - BOWED);
          else if (tb < B_IN + 1.0) a = still(at(ASIDE.x, ASIDE.y, ASIDE.z, toward(ASIDE.x, ASIDE.z, EDOOR.x, EDOOR.z)), {});
          else if (tb < A_IN) a = aBack.at(tb - B_IN - 1.0);
          else a = hidden(MDOOR);
          P.put('alfred', a);
        },
        props(tb, live) { fly(fl.segs, tb, live, fl.end); },
        end() { restsAt = 'manor'; lastTb = 0; },
      });
      if (import.meta.env.DEV) console.info(`Gotham: the helicopter flies home at ${Y_TOWER.toFixed(1)} by the tower and ${Y_AWAY.toFixed(1)} on the way, ${(A_IN + 0.6).toFixed(0)} s: ${clearance(fl.segs)}.`);
    }

    // ------------------------------------------------------------ to work: Manor to tower
    {
      // Batman's mark on the terrace walk west of the front door: he goes in there as the body begins, before Alfred
      const BT = spot(MDOOR.x - 2.4, ALFRED.z - 0.6, E, ALFRED.y + 1);
      const batIn = route([BT, at(MDOOR.x - 0.4, ALFRED.y, ALFRED.z - 0.9, E), at(MDOOR.x, MDOOR.y, MDOOR.z, N)], 1.8);
      const aIn = walkLeg(ALFRED, at(MDOOR.x, MDOOR.y, MDOOR.z, N), 1.6), A_IN0 = 0.3 + batIn.dur + 0.2;
      const B_OUT = 3.0, A_OUT = Math.max(3.9, A_IN0 + aIn.dur + 0.4);
      const bWalk = seq([route([at(EDOOR.x, EDOOR.y, EDOOR.z, E), IN_ARCH, MEET], 2.0), route([MEET, COURT_W, COURT_E, at(MANOR_SIDE.x, MANOR_SIDE.y, MANOR_SIDE.z, E)], 2.2)]);
      const aWalk = walkLeg(at(EDOOR.x, EDOOR.y, EDOOR.z, E), at(EPATH.x, EPATH.y, EPATH.z, E), 1.8);
      const B_HOP = B_OUT + bWalk.dur, SEATM = seatAt(ATMANOR);
      const fl = flightOf(ATMANOR, [{ x: WP[0], z: WP[1], y: Math.max(Y_TOWER, Y_AWAY) }, { x: DECK.x, z: DECK.z, y: Y_TOWER }], ATTOWER, B_HOP + 1.0);
      const LIFTED = fl.segs[3].t0, aBack = walkLeg(at(EPATH.x, EPATH.y, EPATH.z, WEST), at(EDOOR.x, EDOOR.y, EDOOR.z, WEST), 1.8);
      const OUT_T = fl.settled + 0.6;
      const toIn = seq([walkLeg(TOWER_SIDE, G1, 2.0), walkLeg(G1, G0, 2.0), walkLeg(G0, GAP, 2.0), walkLeg(GAP, at(DOOR.x, DOOR.y, DOOR.z, WEST), 1.6)]);
      const B_IN = OUT_T + 0.8 + toIn.dur, BAT_OUT = B_IN + 3;
      const batOut = walkLeg(at(DOOR.x, DOOR.y, DOOR.z, E), LEDGE, 1.8);
      book.stories.push({
        id: 'heliWork', name: "Bruce Wayne's helicopter to work", cast: ['bruce', 'batman', 'alfred'], holds: ['sky', 'wayneCopter', 'towerCorner', 'terrace', 'manorPad'], weight: 0.7,
        marks: { bruce: EDOOR, batman: BT, alfred: 'post' }, body: BAT_OUT + batOut.dur + 0.6,
        may: () => restsAt === 'manor',
        play(tb, P) {
          // Batman goes in at the Manor's front door as the body begins, and comes out of the tower's door at the end
          P.put('batman', tb < 0.3 ? still(BT, {}, glowB()) : tb < 0.3 + batIn.dur ? { ...batIn.at(tb - 0.3), ...glowB() } : tb < BAT_OUT ? hidden(DOOR) : { ...batOut.at(tb - BAT_OUT), ...glowB() });
          // Bruce Wayne: out of the east door, past Alfred to the ring, in, flown, out on the deck, over the gangway, in
          let b: State;
          if (tb < B_OUT) b = hidden(EDOOR);
          else if (tb < B_HOP) b = bWalk.at(tb - B_OUT);
          else if (tb < B_HOP + 0.8) b = hop(MANOR_SIDE, SEATM, ATMANOR.h, span(tb, B_HOP, B_HOP + 0.8));
          else if (tb < OUT_T) b = seated(fl.segs, tb);
          else if (tb < OUT_T + 0.8) { const s = seatAt(ATTOWER); const u = span(tb, OUT_T, OUT_T + 0.8); b = still(at(lerp(s[0], TOWER_SIDE.x, ease(u)), lerp(s[1], TOWER_SIDE.y, ease(u)) + 0.9 * Math.sin(Math.PI * u), lerp(s[2], TOWER_SIDE.z, ease(u)), S), leap(0.3 + 0.6 * u), { aloft: true, close: true }); }
          else if (tb < B_IN) b = toIn.at(tb - OUT_T - 0.8);
          else b = hidden(DOOR);
          P.put('bruce', b);
          // Alfred: in at the front door, out of the east door behind Bruce, an arm up as he goes, and back in
          let a: State;
          if (tb < A_IN0) a = still(P.from('alfred'), { head: tb > 0.3 ? -0.5 : 0 });
          else if (tb < A_IN0 + aIn.dur) a = aIn.at(tb - A_IN0);
          else if (tb < A_OUT) a = hidden(MDOOR);
          else if (tb < A_OUT + aWalk.dur) a = aWalk.at(tb - A_OUT);
          else if (tb < LIFTED + 2) {
            const wave = ease(span(tb, B_HOP - 0.5, B_HOP + 0.5)) * (1 - ease(span(tb, LIFTED + 1, LIFTED + 2)));
            a = still(at(EPATH.x, EPATH.y, EPATH.z, toward(EPATH.x, EPATH.z, MPAD.x, MPAD.z)), { armR: 2.7 * wave, spreadR: 0.3 * wave, elbowR: 0.25 });
          } else if (tb < LIFTED + 2 + aBack.dur) a = aBack.at(tb - LIFTED - 2);
          else a = hidden(MDOOR);
          P.put('alfred', a);
        },
        props(tb, live) { fly(fl.segs, tb, live, fl.end); },
        end() { restsAt = 'tower'; lastTb = 0; },
      });
      if (import.meta.env.DEV) console.info(`Gotham: the helicopter flies to work in ${(BAT_OUT + batOut.dur + 0.6).toFixed(0)} s: ${clearance(fl.segs)}.`);
    }

    // between the stories it stands where it landed, still, its lamps off by day and faint at night
    book.always.push(() => {
      if (!copter || now - busyT < 0.3) return;
      const p = restsAt === 'tower' ? ATTOWER : ATMANOR;
      copter.at(p.x, p.y, p.z, p.h, 0, 0);
      copter.shown(true);
      copter.trick('rotors', 0);
      copter.lights(0.25 * night());
    });
  }

  if (import.meta.env.DEV) {
    (window as unknown as { gothamWest: object }).gothamWest = {
      /** Whether each machine of the west touches anything built on its way, at the level of its drawn mesh. */
      machines: () => Object.entries(devChecks).map(([id, f]) => `${id}: ${f()}`).join('\n'),
    };
  }
}
