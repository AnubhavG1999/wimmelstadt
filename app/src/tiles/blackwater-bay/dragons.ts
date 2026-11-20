// The dragons of Blackwater Bay: ten of the great dragons of the Targaryens,
// at home and in the air.
//
// Each has a home, and the homes are spread over the whole tile, because
// dragons this size need room to come and go. Balerion keeps the crown of the
// Dragonpit's dome, his tail laid down its side, and Dreamfyre the bronze
// doors. Caraxes keeps the top of the Red Keep's tallest tower. Vhagar lies on
// a low rock in the middle of the bay, where there is room for her: she is 44
// long. Meleys keeps the roof of Castle Driftmark, the Velaryons' old seat. On
// the Dragonmont, Meraxes keeps a high ledge under the summit, Vermithor and
// Silverwing lie side by side on its south face, Sheepstealer keeps its west
// face and the Cannibal the back of it. The Dragonmont's dragons drop off their
// ledges with their wings drawn in and open them once they are clear, and come
// home the same way, as a falcon does on a cliff. At home a dragon looks about
// in its own way, yawns or roars now and then, and watches whoever flies near.
//
// Now and then one of them, or two or three together, flies a moment from the
// books (see `moments` below): Balerion's three slow laps over the city, and his
// black fire straight up; Dreamfyre out of the bronze doors and round the dome;
// Vermithor and Silverwing across the bay together and round the Dragonpit;
// Sheepstealer over the bay to the fold by the Wendwater for a sheep; Caraxes
// along the Blackwater Rush and round the Dragonpit, home to his tower to
// shriek; the race of Meleys and Caraxes, which Meleys wins; Meleys low over
// the Velaryon fleet; the Cannibal hunting the Narrow Sea; Vhagar round the bay;
// Meraxes far to the west; and, rarely, the three of the Conquest together. A
// director chooses what plays next, so that at most three are in the air and no
// two moments share a piece of sky.
//
// Fire goes only straight up or out over open water. Nothing of a death or a
// battle is shown, and no rider. On the development server the show is checked
// against the plan on every load: how near each dragon comes to what is built,
// and where each fire goes.
//
// Written by the main session, on the engine's dragons (engine/dragons/). Ask it
// for a change rather than editing here.

import * as THREE from 'three';
import { Fire } from '../../engine/dragons/fire';
import { BALERION, CANNIBAL, CARAXES, DREAMFYRE, MELEYS, MERAXES, SHEEPSTEALER, SILVERWING, VERMITHOR, VHAGAR } from '../../engine/dragons/kinds';
import { Dragon, TUCK, blendForm, formAt, measure, stance, type DragonKind } from '../../engine/dragons/model';
import { Pilot, type Cue, type Held } from '../../engine/dragons/pilot';
import { Track, type Waypoint } from '../../engine/dragons/track';
import { Trails } from '../../engine/dragons/trails';
import { GeoBuilder } from '../../engine/geo';
import type { Build } from '../../engine/tile';
import { FLOCK, HOMES, LOTS, RHAENYS, WATER_LEVEL, domeAt as domeOver, groundAt as planGround, isWater, mountBuilt, rockAt } from './plan';

const RAD = Math.PI / 180;
const smooth = (t: number): number => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c); };

/** How far to turn, in degrees, from one heading to another: the shorter way, unless `round` says which (1 clockwise seen from above, -1 the other). */
function turnBy(from: number, to: number, round?: 1 | -1): number {
  if (round === 1) return (((to - from) % 360) + 360) % 360;
  if (round === -1) return -((((from - to) % 360) + 360) % 360);
  return ((to - from + 540) % 360) - 180;
}

// ---------------------------------------------------------------------------
// The cast and their homes
// ---------------------------------------------------------------------------

type Key = 'balerion' | 'vhagar' | 'meraxes' | 'vermithor' | 'cannibal' | 'silverwing' | 'caraxes' | 'dreamfyre' | 'meleys' | 'sheepstealer';
const KIND: Record<Key, DragonKind> = {
  balerion: BALERION, vhagar: VHAGAR, meraxes: MERAXES, vermithor: VERMITHOR, cannibal: CANNIBAL,
  silverwing: SILVERWING, caraxes: CARAXES, dreamfyre: DREAMFYRE, meleys: MELEYS, sheepstealer: SHEEPSTEALER,
};
const KEYS = Object.keys(KIND) as Key[];
/** How fast each cruises, in units a second: the old giants slowly, the quick ones fast. */
const CRUISE: Record<Key, number> = { balerion: 24, vhagar: 24, meraxes: 28, vermithor: 27, cannibal: 32, silverwing: 28, caraxes: 34, dreamfyre: 30, meleys: 40, sheepstealer: 30 };

/**
 * Where a dragon rests: where it stands, how high what it stands on is, which way it faces, in degrees (0 east, 90
 * south), and which way it leaves by, which it turns to on its perch before it pushes off.
 */
interface Home { x: number; y: number; z: number; facing: number; leave: number }

/**
 * How each comes and goes, besides where the plan puts its home: which way it turns to leave by, if not the way it
 * faces; which way it comes in to land, in degrees, over open air and never low over a tower (it turns round to face
 * out once it is down); how far out its run in to land begins, if nearer than its size would give, so that it stays
 * on the board; whether its home is a ledge on the Dragonmont, which it drops off and drops onto with its wings
 * drawn in, because others lie near it; where a neighbour lies within a tail's length, which way it turns round once
 * it is down (1 clockwise seen from above, -1 the other), so that its tail sweeps over open slope; and whether its home
 * is the Dragonpit's dome, above whose roof it is held as it leaves and comes down.
 */
const WAYS: Record<Key, { leave?: number; arrive: number; approach?: number; steep?: number; climb?: number; cliff?: boolean; hold?: number; round?: 1 | -1; dome?: boolean }> = {
  balerion: { arrive: 135, approach: 18, dome: true },
  // she rests looking out over the bay towards Driftmark, and turns north to leave over the open water, climbing steeply
  // to be over the city's wall
  vhagar: { leave: 270, arrive: 90, approach: 13, climb: 2.2 },
  // she rests on the forecourt before the bronze doors, her tail laid back through them, and turns there to leave over
  // the terrace, clear of the houses below it; she comes home from the south, steeply up over the terrace's wall, and
  // turns round with her tail swinging west, away from the gatehouse and the place for a hero
  dreamfyre: { leave: 45, arrive: 270, approach: 16, steep: 4, round: 1, climb: 2 },
  // he comes down onto his tower from the north, and turns to face the river's mouth
  caraxes: { arrive: 90, approach: 14, climb: 1.5 },
  // she comes down onto High Tide from the north, over Driftmark, and turns to face the river's mouth
  meleys: { arrive: 90 },
  // on the summit, above every ledge, she springs up and opens her wings at once, and comes down onto it with them open
  meraxes: { arrive: 280, approach: 20, climb: 1.4 },
  // he comes down from due south and turns round on his ledge with his tail out over the east flank, away from
  // Silverwing's ledge beside him to the west
  vermithor: { arrive: 270, cliff: true, round: -1 },
  // she comes home after a last turn over Driftmark, past him on his ledge with her wings drawn in, and turns round on
  // hers with her tail down the south face, away from him
  silverwing: { arrive: 250, cliff: true, round: 1 },
  sheepstealer: { arrive: 10, cliff: true },
  cannibal: { arrive: 60, approach: 16, cliff: true },
};

/** Each one's home, from the plan. */
function homesFor(): Record<Key, Home> {
  const out = {} as Record<Key, Home>;
  for (const key of KEYS) {
    const h = HOMES[key];
    out[key] = { x: h.x, y: h.y, z: h.z, facing: h.facing, leave: WAYS[key].leave ?? h.facing };
  }
  return out;
}

// ---------------------------------------------------------------------------
// The ground under them, for their shadows and their tails
// ---------------------------------------------------------------------------

/** Whether a place is on Vhagar's rock. */
const onRock = (x: number, z: number): boolean => rockAt(x, z) > WATER_LEVEL;
/** The roofs a dragon lies on, or lays its tail over: the Red Keep's tower and Maegor's Holdfast, and High Tide. */
const ROOFS = LOTS.filter((l) => ['rk-tower', 'rk-holdfast', 'red-keep', 'high-tide'].includes(l.id));
/** How high the ground is at a place, as the plan has it, or the roof there, or the water's top over open water. */
function groundAt(x: number, z: number): number {
  let roof = -Infinity;
  for (const l of ROOFS) if (x >= l.x0 && x <= l.x1 && z >= l.z0 && z <= l.z1) roof = Math.max(roof, l.top);
  // the Dragonpit's dome, which Balerion lies on and his tail lies over, and the top of its drum for a little way past
  // its rim, so that a tail hangs down outside the wall and not through the dome's edge
  const dd = Math.hypot(x - RHAENYS.c[0], z - RHAENYS.c[1]);
  if (dd < RHAENYS.drum + 3) roof = Math.max(roof, dd < RHAENYS.drum ? domeOver(dd) : RHAENYS.wall);
  if (roof > -Infinity) return roof;
  return isWater(x, z) && !onRock(x, z) ? WATER_LEVEL + 0.4 : planGround(x, z);
}
/** How high the Dragonpit's dome stands at a place, or nothing off it. */
function domeAt(x: number, z: number): number {
  const d = Math.hypot(x - RHAENYS.c[0], z - RHAENYS.c[1]);
  return d > RHAENYS.drum ? -Infinity : domeOver(d);
}

// ---------------------------------------------------------------------------
// A moment: who flies, where, and what each does on the way
// ---------------------------------------------------------------------------

/** Something a dragon does for a while in a moment, on the moment's clock. */
interface Ev {
  kind: 'fire' | 'beats' | 'roll' | 'jaw' | 'grab' | 'look';
  t0: number;
  t1: number;
  /** For beats, how many; for a look, which way, in radians to the right. */
  n?: number;
}

/** A place where a dragon sits a while, on the moment's clock: from when it touches down to when it leaves. A half perch keeps its wings spread. */
interface Perch { tA: number; tD: number; y: number; half?: boolean }

/** One dragon's part in a moment. */
interface Part {
  key: Key;
  /** How long it sits at home before it pushes off. */
  wait: number;
  track: Track;
  events: Ev[];
  perches: Perch[];
  /** Which way it faces as it arrives home. */
  arrive: number;
  /** When it is home again and braced, on the moment's clock. */
  end: number;
  /** A slow drift of its own off its line, for one flying beside another: never closer than its place. */
  drift?: { from: number; to: number; side: number; back: number; up: number; phase: number };
  /** How long it takes, before it pushes off, to turn on its perch to the way it leaves by. */
  turn: number;
  /** Whether it drops off its ledge and onto it with its wings drawn in. */
  cliff: boolean;
  /** How long it keeps its wings spread once it is home, before it folds them: for a shriek on its tower. */
  mantle: number;
  /** Off a ledge, how long after it drops it holds its wings in before it opens them. */
  hold: number;
}

interface Moment {
  id: string;
  /** What it is, in a line, for the notes and the console. */
  story: string;
  /** The pieces of sky it uses: no two moments that share one play at once. */
  sky: string[];
  /** How often it is chosen, against the others. */
  weight: number;
  parts: Part[];
  length: number;
}

const P = (x: number, y: number, z: number, v: number): Waypoint => [x, y, z, v];

/**
 * Out of a home: a short run along the way it leaves by, pushing up and climbing hard; or, off a ledge, a drop with
 * its wings drawn in and a run out low before it climbs. The first place is only for the direction.
 */
function outOf(h: Home, L: number, cruise: number, cliff: boolean, climb = 1): Waypoint[] {
  const r = Math.min(L, 24), f = h.leave * RAD, dx = Math.cos(f), dz = Math.sin(f);
  if (cliff) {
    return [
      P(h.x - dx * 3, h.y, h.z - dz * 3, 2),
      P(h.x, h.y, h.z, 3),
      P(h.x + dx * 0.55 * r, h.y - 0.12 * r, h.z + dz * 0.55 * r, 11),
      P(h.x + dx * 1.3 * r, h.y + 0.02 * r, h.z + dz * 1.3 * r, cruise * 0.6),
      P(h.x + dx * 2.2 * r, h.y + 0.4 * r, h.z + dz * 2.2 * r, cruise * 0.72),
    ];
  }
  return [
    P(h.x - dx * 3, h.y, h.z - dz * 3, 2),
    P(h.x, h.y, h.z, 2.5),
    P(h.x + dx * 0.7 * r, h.y + 0.22 * r * climb, h.z + dz * 0.7 * r, 9),
    P(h.x + dx * 1.6 * r, h.y + 0.75 * r * climb, h.z + dz * 1.6 * r, cruise * 0.65),
  ];
}

/** Into a home: down out of the air, arriving the way `towards` points, in degrees, from `r` times 2.3 out. The last place is only for the direction. */
function into(h: Home, r: number, cruise: number, towards: number, steep = 1): Waypoint[] {
  const f = towards * RAD, dx = Math.cos(f), dz = Math.sin(f);
  return [
    P(h.x - dx * 2.3 * r, h.y + 0.6 * r * Math.sqrt(steep), h.z - dz * 2.3 * r, cruise * 0.62),
    P(h.x - dx * 0.95 * r, h.y + 0.17 * r * steep, h.z - dz * 0.95 * r, 8.5),
    P(h.x, h.y, h.z, 2.2),
    P(h.x + dx * 3, h.y, h.z + dz * 3, 2),
  ];
}

/** Places round a middle: from `a0` degrees, `turns` times round (negative for the other way), rising or falling from `y0` to `y1`. */
function ring(cx: number, cz: number, rx: number, rz: number, y0: number, y1: number, a0: number, turns: number, v: number, step = 30): Waypoint[] {
  const out: Waypoint[] = [], n = Math.round((Math.abs(turns) * 360) / step);
  for (let i = 0; i <= n; i++) {
    const a = (a0 + Math.sign(turns) * i * step) * RAD;
    out.push(P(cx + rx * Math.cos(a), y0 + ((y1 - y0) * i) / n, cz + rz * Math.sin(a), v));
  }
  return out;
}

/**
 * One dragon's part: out of its home, along `route`, and back in, then it turns
 * round to face out. `marks` names places of `route` by number, and `at` hands
 * back when it reaches one, for timing what it does there. A `perch` is a place
 * of `route` where it sits a while.
 */
function part(
  key: Key, H: Record<Key, Home>, route: Waypoint[],
  o: { marks?: Record<string, number>; perch?: { at: number; seconds: number; half?: boolean }; beatsOut?: number; mantle?: number } = {},
): { part: Part; at: (mark: string) => number } {
  const h = H[key], kind = KIND[key], L = kind.length, cruise = CRUISE[key], ways = WAYS[key], cliff = ways.cliff === true;
  const head = outOf(h, L, cruise, cliff, ways.climb ?? 1), tail = into(h, ways.approach ?? Math.min(L, 22), cruise, ways.arrive, ways.steep ?? 1);
  const way = [...head, ...route, ...tail], first = head.length;
  const hold = o.perch ? { at: first + o.perch.at, seconds: o.perch.seconds } : undefined;
  const track = new Track(way, false, 1, 1, hold);
  const p: Part = { key, wait: 0, track, events: [], perches: [], arrive: ways.arrive, end: 0, turn: 0, cliff, mantle: o.mantle ?? 0, hold: ways.hold ?? 1.6 };
  const when = (i: number): number => p.wait + 1.2 + track.tAt(track.wayS[i]);
  const marks = o.marks ?? {};
  const at = (mark: string): number => when(first + marks[mark]);
  const touch = 1.2 + track.duration;
  p.perches.push({ tA: -Infinity, tD: 1.2, y: h.y });
  // off a ledge it beats only once its wings are open
  const beat = kind.flight.beat, n = o.beatsOut ?? 3, b0 = cliff ? (ways.hold ?? 1.6) + 1.0 : 1.3;
  p.events.push({ kind: 'beats', t0: b0, t1: b0 + n * beat, n });
  if (o.perch) {
    const tA = when(first + o.perch.at), tD = tA + o.perch.seconds;
    p.perches.push({ tA, tD, y: way[first + o.perch.at][1], half: o.perch.half });
    p.events.push({ kind: 'beats', t0: tD - 0.3, t1: tD - 0.3 + 3 * beat, n: 3 });
  }
  p.perches.push({ tA: touch, tD: Infinity, y: h.y });
  p.end = touch + 1.4 + p.mantle;
  // turning round on its perch to the way it leaves by takes a while, before anything else
  if (Math.abs(((h.leave - h.facing + 540) % 360) - 180) > 5) { p.turn = 2.6; delay(p, 2.6); }
  return { part: p, at };
}

/** Moves a part later on the moment's clock. */
function delay(p: Part, s: number): void {
  p.wait += s;
  for (const e of p.events) { e.t0 += s; e.t1 += s; }
  for (const q of p.perches) { if (q.tA !== -Infinity) q.tA += s; if (q.tD !== Infinity) q.tD += s; }
  p.end += s;
  if (p.drift) { p.drift.from += s; p.drift.to += s; }
}

/** Sets parts off so that each reaches its own `mark` at the same time as the others, give or take its `lag` in seconds. */
function together(parts: { part: Part; at: (m: string) => number }[], mark: string, lags: number[]): void {
  const times = parts.map((p) => p.at(mark));
  const goal = Math.max(...times.map((t, i) => t - lags[i]));
  parts.forEach((p, i) => delay(p.part, goal + lags[i] - times[i]));
}

/** A route offset beside another's, `side` to its right, `back` behind and `up` above, for one flying with another. */
function beside(route: Waypoint[], side: number, back: number, up: number, speed = 1): Waypoint[] {
  return route.map((w, i) => {
    const a = route[Math.max(0, i - 1)], b = route[Math.min(route.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[2] - a[2];
    const l = Math.hypot(dx, dz) || 1;
    dx /= l; dz /= l;
    return P(w[0] - dz * side - dx * back, w[1] + up, w[2] + dx * side - dz * back, w[3] * speed);
  });
}

const V1 = new THREE.Vector3(), V2 = new THREE.Vector3();

/** Where a dragon is, `t` into its part: at home before it goes, along its line, and home again after. */
function placeOf(p: Part, H: Record<Key, Home>, t: number, out: THREE.Vector3): THREE.Vector3 {
  const tt = t - p.wait - 1.2;
  if (tt <= 0) { const h = H[p.key]; return out.set(h.x, h.y, h.z); }
  const s = p.track.sAt(tt);
  p.track.point(s, out);
  const d = p.drift;
  if (d && t > d.from && t < d.to) {
    // beside another: it drifts out and back a little, slowly and on a rhythm of its own, never closer than its place
    const fade = smooth((t - d.from) / 3) * smooth((d.to - t) / 3);
    const w = (period: number, ph: number): number => Math.sin((Math.PI * 2 * t) / period + ph + d.phase);
    const side = d.side * ((1 + 0.6 * w(7.3, 0) + 0.4 * w(3.1, 1.7)) / 2) * fade;
    const back = d.back * ((1 + 0.6 * w(9.7, 2.2) + 0.4 * w(4.3, 0.4)) / 2) * fade;
    const up = d.up * (0.6 * w(6.1, 1.1) + 0.4 * w(2.9, 2.6)) * fade;
    p.track.point(s + 1, V1);
    p.track.point(s - 1, V2);
    V1.sub(V2).normalize();
    out.x += -V1.z * side - V1.x * back;
    out.z += V1.x * side - V1.z * back;
    out.y += up;
  }
  return out;
}

/** How high a dragon's body stands above what it stands on, at its most, by its kind; and its build. */
const STAND: Partial<Record<Key, number>> = {};
const BUILD: Partial<Record<Key, ReturnType<typeof measure>>> = {};
const DOME_AT = new THREE.Vector3(), TAIL_AT = new THREE.Vector3();

/**
 * How far a dragon is carried above its line as it leaves and as it comes home, without turning it. Its line runs at
 * the height of its perch, and the pilot lifts it to its standing height only while it settles or pushes off, so in
 * between it would sink into what it stood on. For its first and last few seconds its body is kept its standing height
 * above whatever is under it, less what its landing lifts it by; and one whose home is the dome, with its long tail
 * trailing back over the roof, is kept above the crown by a share of its length more, within a tail's length of it.
 */
function liftOf(p: Part, H: Record<Key, Home>, t: number, cue: Cue): number {
  // off a ledge and onto it a dragon drops on purpose, its tail in its cave under the rock
  if (p.cliff) return 0;
  const start = p.perches[0].tD, end = p.perches[p.perches.length - 1].tA, dome = WAYS[p.key].dome === true;
  const when = dome
    ? Math.max(1 - smooth((t - start - 12) / 3), smooth((t - (end - 13)) / 3))
    : Math.max(1 - smooth((t - start - 4) / 2), smooth((t - (end - 6)) / 2));
  if (when <= 0) return 0;
  placeOf(p, H, t, DOME_AT);
  const kind = KIND[p.key], L = kind.length, m = (BUILD[p.key] ??= measure(kind.shape));
  const stand = (STAND[p.key] ??= Math.max(stance(0, m).root, stance(1, m).root) * L);
  const land = Math.min(1, cue.sit * 2), down = Math.max(0, cue.sit * 2 - 1);
  const body = DOME_AT.y + stance(down, m).root * L * land;
  // its wings beat below it as it goes, so a third of its length more than its standing height
  let least = groundAt(DOME_AT.x, DOME_AT.z) + (stand + 1 + 0.32 * L) * (1 - land) - 1.5 * land;
  // and its tail trails back over what it left, which may stand higher than what is under its body
  placeOf(p, H, t - 0.6, TAIL_AT);
  const back = Math.hypot(DOME_AT.x - TAIL_AT.x, DOME_AT.z - TAIL_AT.z);
  if (back > 0.5) {
    const s = (0.45 * L) / back, tx = DOME_AT.x + (TAIL_AT.x - DOME_AT.x) * s, tz = DOME_AT.z + (TAIL_AT.z - DOME_AT.z) * s;
    least = Math.max(least, groundAt(tx, tz) + (0.2 * L + 1) * (1 - land) - 1.5 * land);
  }
  if (dome) {
    const near = 1 - smooth((Math.hypot(DOME_AT.x - RHAENYS.c[0], DOME_AT.z - RHAENYS.c[1]) - 40) / 18);
    least = Math.max(least, RHAENYS.capY + 2 + (stand + 0.16 * L) * (1 - land) - 100 * (1 - near));
  }
  const gap = body - least, k = 1.2;
  return (when * (Math.sqrt(gap * gap + k * k) - gap)) / 2;
}

/** What a dragon is told to do, `t` into its part. */
function cueOf(p: Part, t: number, out: Cue): Cue {
  out.fire = 0; out.charge = 0; out.roll = 0; out.beat = 0; out.sit = 0; out.jaw = 0; out.look = 0; out.tuck = 0; out.lift = 0;
  // sitting, landing and leaving, as on Westeros: it flares, its feet come down, and it comes down onto the claws of
  // its wings; it leaves pushing up off them. A half perch keeps its wings spread, and so does a dragon home with a
  // mantle, for a while, before it folds them.
  for (const q of p.perches) {
    if (t < q.tA - 1.7 || t > q.tD + 1.0) continue;
    let top = q.half ? 0.5 : 1;
    if (q.tD === Infinity && p.mantle > 0) top = t < q.tA + p.mantle ? 0.5 : 0.5 + 0.5 * smooth((t - q.tA - p.mantle) / 1.2);
    let s: number;
    if (t < q.tA) s = 0.5 * smooth((t - (q.tA - 1.7)) / 1.7);
    else if (t <= q.tD - 1.2) s = q.tA === -Infinity ? top : 0.5 + (top - 0.5) * smooth((t - q.tA) / 1.2);
    else if (t <= q.tD) s = top - (top - 0.5) * smooth((t - (q.tD - 1.2)) / 1.2);
    else s = 0.5 - 0.5 * smooth((t - q.tD) / 1.0);
    out.sit = Math.max(out.sit, s);
  }
  // off a ledge and onto it, its wings drawn in: until it is clear of the mountain and its neighbours, and from a
  // little before it is down
  if (p.cliff) {
    const off = p.perches[0].tD, on = p.perches[p.perches.length - 1].tA;
    if (t < off + p.hold + 1.0) out.tuck = t < off + p.hold ? 1 : 1 - smooth((t - off - p.hold) / 1.0);
    if (t > on - 4.0) out.tuck = Math.max(out.tuck ?? 0, smooth((t - (on - 4.0)) / 1.4));
  }
  for (const e of p.events) {
    if (e.kind === 'fire') {
      if (t >= e.t0 && t < e.t1) out.fire = Math.max(out.fire, Math.min(1, (t - e.t0) / 0.1, (e.t1 - t) / 0.15));
      // its throat glows a little while before, and brightest just as it breathes
      if (t >= e.t0 - 0.7 && t < e.t1) out.charge = Math.max(out.charge, Math.min(1, (t - (e.t0 - 0.7)) / 0.7));
    } else if (t >= e.t0 && t < e.t1) {
      const f = (t - e.t0) / (e.t1 - e.t0);
      if (e.kind === 'roll') out.roll = smooth(f) * Math.PI * 2;
      else if (e.kind === 'beats') out.beat = (f * (e.n ?? 1)) % 1 || 0.0001;
      else if (e.kind === 'jaw') out.jaw = Math.max(out.jaw ?? 0, Math.min(1, f / 0.2, (1 - f) / 0.25));
      // it reaches down with its feet and flares a little to take something
      else if (e.kind === 'grab') out.sit = Math.max(out.sit, 0.34 * Math.min(1, f / 0.3, (1 - f) / 0.3));
      else if (e.kind === 'look') out.look = (e.n ?? 0) * Math.min(1, f / 0.25, (1 - f) / 0.25);
    }
  }
  return out;
}

function finish(id: string, story: string, sky: string[], weight: number, parts: Part[]): Moment {
  // the first to go goes at once
  const first = Math.min(...parts.map((p) => p.wait - p.turn));
  for (const p of parts) delay(p, -first);
  return { id, story, sky, weight, parts, length: Math.max(...parts.map((p) => p.end)) };
}

// ---------------------------------------------------------------------------
// The moments
// ---------------------------------------------------------------------------

function moments(H: Record<Key, Home>): Moment[] {
  const [dx, dz] = RHAENYS.c;
  const list: Moment[] = [];

  // --- Balerion: three slow laps over King's Landing, and his black fire straight up ---
  // In 93 AC Viserys woke the old dragon and flew him three times round King's Landing (F&B, "Policy, Progeny, and
  // Pain"). Here he leaves the dome and circles the city three times, so slowly and so wide that his shadow covers
  // it, then climbs straight up over the bay and breathes his black fire, swirled with red, at the sky.
  {
    const laps = ring(-44, -26, 26, 26, 74, 82, 20, 3, 24);
    const route: Waypoint[] = [P(-30, 60, -4, 18), P(-22, 70, -18, 22), ...laps, P(-8, 84, -38, 24), P(2, 92, -40, 20), P(6, 110, -41, 15), P(8, 132, -42, 11), P(10, 136, -48, 9), P(4, 122, -60, 14), P(-8, 96, -76, 20), P(-14, 74, -88, 20)];
    const i = 2 + laps.length;
    const b = part('balerion', H, route, { marks: { laps: 2, climb: i + 1, top: i + 3 }, beatsOut: 4 });
    b.part.events.push({ kind: 'jaw', t0: b.at('laps') - 0.5, t1: b.at('laps') + 1.8 }, { kind: 'fire', t0: b.at('climb') + 0.5, t1: b.at('top') - 0.1 });
    list.push(finish('black-dread', "Balerion flies three slow laps over King's Landing, then climbs and breathes his black fire straight up", ['city', 'city-high', 'bay-north'], 1.0, [b.part]));
  }

  // --- Dreamfyre: out of the bronze doors and round the dome ---
  // She lived in the Dragonpit for nearly sixty years (F&B). The research note's gentle show for her: out of the
  // doors, twice round the dome under Balerion, her silver crest catching the light, and back in.
  {
    const circles = ring(dx + 4, dz, 34, 40, 70, 76, 30, -2, 30);
    // she comes home down the west side of the Red Keep and up over the terrace's wall from the south
    const route: Waypoint[] = [P(-24, 31, 2, 24), P(-20, 48, -16, 28), ...circles, P(-30, 48, 2, 26), P(-34, 42, 24, 24), P(-58, 36, 54, 22)];
    const d = part('dreamfyre', H, route, { marks: { round: 2 } });
    d.part.events.push({ kind: 'look', t0: d.at('round'), t1: d.at('round') + 9, n: -0.45 });
    list.push(finish('dome', 'Dreamfyre comes out of the bronze doors and flies twice round the dome', ['city'], 1.2, [d.part]));
  }

  // --- Vermithor and Silverwing: across the bay together, and round the Dragonpit ---
  // They lay together in the Dragonmont, flew together to Dragonstone in 49 AC, and made their entrance at the Golden
  // Wedding in the Dragonpit (F&B). Here they drop off their ledges one after the other, she first, meet over the
  // channel south of Dragonstone, cross the bay, he following in her track, go once round the Dragonpit high over
  // Balerion on his dome, and come back over the channel, where he goes home first and she a turn after him.
  {
    const together1: Waypoint[] = [
      P(74, 34, 30, 26), P(54, 40, 24, 27), P(30, 46, 18, 27), P(4, 52, 10, 27), P(-28, 62, 2, 27),
      ...ring(dx, dz, 34, 34, 74, 72, 90, 0.75, 27),
      P(-14, 62, -14, 27), P(10, 54, 6, 27), P(36, 46, 20, 27),
    ];
    const s = part('silverwing', H, [...together1, P(62, 46, 30, 26), P(78, 44, 46, 26), P(82, 44, 62, 26), P(70, 42, 70, 26), P(56, 40, 56, 26), P(62, 38, 36, 26), P(76, 36, 26, 24)], { marks: { join: 3, leave: together1.length - 1 } });
    // he goes his own way along the island's south shore, and falls in off her right wing over the bay
    const his = [P(58, 48, 10, 27), ...beside(together1, 0, 0, 6, 1.0).slice(3)];
    const v = part('vermithor', H, [...his, P(62, 46, 30, 26)], { marks: { join: 1, leave: his.length - 1 } });
    together([s, v], 'join', [0, 1.5]);
    v.part.drift = { from: v.at('join'), to: v.at('leave'), side: 7, back: 4, up: 2.5, phase: 1.3 };
    s.part.events.push({ kind: 'look', t0: s.at('join') + 6, t1: s.at('join') + 10, n: -0.5 });
    v.part.events.push({ kind: 'look', t0: v.at('join') + 14, t1: v.at('join') + 17, n: 0.5 });
    list.push(finish('pair', 'Vermithor and Silverwing drop off their ledges, cross the bay together, go round the Dragonpit, and come home over the channel', ['gullet', 'bay', 'city', 'city-high'], 0.9, [v.part, s.part]));
  }

  // --- Sheepstealer: a sheep from the fold by the Wendwater ---
  // He hunted sheep across the bay, as far as Driftmark and the Wendwater, and was won with a sheep left out for him
  // every morning; he never harmed a shepherd (F&B). Here he drops off his ledge, crosses the bay high over Vhagar,
  // swoops on the flock by the Wendwater, takes the one that grazes apart, and carries it home up the bay's west side.
  {
    const route: Waypoint[] = [
      P(0, 36, -44, 28), P(12, 42, -18, 30), P(14, 38, 14, 30), P(2, 30, 46, 30), P(-8, 22, 70, 28), P(-14, 14, 82, 22),
      P(-18, 7, 87, 16), P(FOLD.x, 3.8, FOLD.z, 13), P(-17, 8, 95, 15), P(-10, 16, 92, 20), P(-6, 26, 76, 26),
      P(8, 36, 50, 28), P(0, 42, 20, 28), P(-6, 44, -10, 28), P(-8, 42, -36, 28), P(-6, 38, -56, 26),
    ];
    const p = part('sheepstealer', H, route, { marks: { stoop: 6, grab: 7, away: 8 } });
    p.part.events.push({ kind: 'grab', t0: p.at('stoop'), t1: p.at('away') }, { kind: 'jaw', t0: p.at('away') + 0.4, t1: p.at('away') + 1.6 });
    list.push(finish('sheep', 'Sheepstealer swoops on the flock by the Wendwater and carries a sheep home', ['bay', 'bay-north', 'south'], 1.1, [p.part]));
  }

  // --- Caraxes: along the Rush and round the Dragonpit, home to his tower to shriek ---
  // The Blood Wyrm, red and long of neck, whose shriek once shattered every window of a tower (F&B). Here he drops off
  // the Red Keep's tallest tower, snakes low along the Blackwater Rush to the edge of the world, climbs round the city's
  // west and the Dragonpit, and comes back down onto his tower, where he keeps his wings spread and shrieks twice.
  {
    const route: Waypoint[] = [
      P(30, 46, 60, 32), P(22, 38, 76, 34), P(4, 26, 80, 36), P(-24, 18, 80, 38), P(-56, 16, 80, 38), P(-84, 20, 78, 36),
      P(-96, 30, 62, 32), P(-96, 42, 30, 30), P(-94, 54, -4, 30), P(-92, 64, -40, 30), P(-74, 70, -78, 30), P(-44, 68, -82, 30),
      P(-24, 58, -58, 30), P(-18, 52, -28, 30), P(-21, 46, -2, 28),
    ];
    const c = part('caraxes', H, route, { mantle: 6.5 });
    const down = c.part.perches[c.part.perches.length - 1].tA;
    c.part.events.push({ kind: 'look', t0: down + 0.3, t1: down + 1.8, n: 0.5 }, { kind: 'jaw', t0: down + 1.4, t1: down + 2.8 }, { kind: 'jaw', t0: down + 3.8, t1: down + 5.2 });
    list.push(finish('keep', 'Caraxes snakes low along the Blackwater Rush, climbs round the Dragonpit, and comes home to his tower to shriek with his wings spread', ['south', 'city', 'city-south'], 1.0, [c.part]));
  }

  // --- The race: Meleys against Caraxes ---
  // When Princess Alyssa flew with her brothers, Meleys easily beat Caraxes and Vhagar (F&B, "Policy, Progeny, and
  // Pain"). Vhagar, who spans near sixty here, cannot fly a course this board has room for, so here it is Meleys and
  // Caraxes: they meet over the north of the bay and race twice round a course over the bay and the city's east side,
  // each in a lane of its own; Meleys pulls away, and climbs with a lance of fire straight up as she wins.
  {
    const mel = ring(-6, -14, 20, 54, 60, 60, -60, -2, 44, 24), car = ring(-6, -14, 30, 64, 80, 80, -60, -2, 38, 24);
    const m = part('meleys', H, [P(14, 40, 66, 36), P(30, 48, 40, 40), P(26, 54, 4, 42), P(16, 58, -34, 44), ...mel,
      P(-6, 72, -66, 30), P(-5, 92, -68, 18), P(-3, 108, -70, 12), P(10, 96, -56, 18), P(16, 72, -30, 24), P(24, 50, -4, 26), P(28, 40, 12, 26)],
      { marks: { go: 4, climb: 4 + mel.length + 1, top: 4 + mel.length + 2 } });
    const c = part('caraxes', H, [P(4, 60, 30, 36), P(-2, 70, 0, 38), P(-2, 76, -36, 38), ...car,
      P(-16, 70, -60, 34), P(-22, 56, -22, 32), P(-22, 46, 0, 30)], { marks: { go: 3 } });
    together([m, c], 'go', [0, 0.5]);
    m.part.events.push({ kind: 'jaw', t0: m.at('go') - 0.4, t1: m.at('go') + 0.8 }, { kind: 'fire', t0: m.at('climb'), t1: m.at('top') - 0.2 });
    c.part.events.push({ kind: 'jaw', t0: c.at('go') + 0.2, t1: c.at('go') + 1.4 });
    list.push(finish('race', 'Meleys and Caraxes race twice round the bay and the city, and Meleys wins', ['bay', 'bay-north', 'city-south', 'city-high'], 0.7, [m.part, c.part]));
  }

  // --- Meleys over the Velaryon fleet ---
  // She was to fly over the Velaryon fleet as it closed the Gullet (F&B, "The Blacks and the Greens"). Here she leaves
  // High Tide to the west, wheels south round it, runs low along the line of ships closing the Gullet, rolls over them,
  // climbs away with a lance of fire straight up, and glides home over Driftmark.
  {
    const route: Waypoint[] = [
      P(-8, 30, 92, 36), P(4, 26, 96, 40), P(20, 24, 93, 42), P(48, 22, 90, 42), P(60, 20, 84, 42), P(72, 19, 80, 42),
      P(84, 19, 80, 42), P(90, 21, 78, 40), P(94, 36, 68, 30), P(92, 58, 60, 18), P(88, 78, 54, 13), P(80, 84, 48, 12),
      P(62, 70, 32, 24), P(40, 52, 14, 28), P(28, 40, 12, 26),
    ];
    const m = part('meleys', H, route, { marks: { low: 6, up: 8, top: 11 } });
    m.part.events.push({ kind: 'roll', t0: m.at('low') + 0.2, t1: m.at('low') + 1.1 }, { kind: 'fire', t0: m.at('up') + 0.4, t1: m.at('top') - 1.2 });
    list.push(finish('fleet', 'Meleys runs low over the Velaryon fleet in the Gullet, rolls over it, and climbs with fire straight up', ['south', 'gullet', 'sea', 'bay'], 1.0, [m.part]));
  }

  // --- The Cannibal hunts the Narrow Sea ---
  // The largest and oldest of the wild dragons, never ridden, laired at the back of the Dragonmont (F&B). Here he drops
  // off his ledge, quarters the north of the bay high up, stoops, runs low over the water with a burst of fire ahead of
  // him, climbs away, and comes home round the bay.
  {
    const route: Waypoint[] = [
      P(-6, 38, -76, 30), P(8, 44, -84, 30), P(24, 40, -78, 32), P(22, 30, -68, 36), P(20, 22, -57, 40), P(19, 19, -46, 42),
      P(20, 20, -33, 40), P(22, 38, -20, 34), P(16, 46, 0, 30), P(0, 46, -16, 30), P(-4, 42, -42, 30), P(2, 42, -72, 28), P(4, 44, -90, 26), P(20, 44, -100, 26),
    ];
    const c = part('cannibal', H, route, { marks: { stoop: 3, low: 4, fire: 5, out: 6 } });
    c.part.events.push({ kind: 'fire', t0: c.at('fire') - 0.3, t1: c.at('out') - 0.6 }, { kind: 'jaw', t0: c.at('stoop') - 1.4, t1: c.at('stoop') - 0.2 });
    list.push(finish('hunt', 'The Cannibal quarters the north of the bay, stoops, runs low over the water with fire ahead of him, and comes home', ['north', 'bay', 'bay-north'], 1.1, [c.part]));
  }

  // --- Vhagar round the bay ---
  // The greatest dragon living in 129 AC, slow and old, whose roar shook the foundations of Storm's End (TPATQ). Here
  // she turns on her rock and heaves up off it, flies a slow round of the bay high over the city's roofs and Driftmark,
  // roars over Dragonstone, breathes a long fire over the open water, and comes heavily home.
  {
    const route: Waypoint[] = [
      P(10, 40, -84, 22), P(-8, 54, -88, 24), P(-20, 64, -72, 24), P(-6, 66, -38, 24), P(-6, 64, 0, 24), P(-2, 60, 28, 24),
      P(18, 56, 48, 24), P(40, 54, 46, 24), P(52, 54, 26, 24), P(44, 52, 4, 24), P(32, 50, -18, 24), P(26, 46, -50, 24),
      P(10, 38, -72, 22), P(-8, 30, -68, 22),
    ];
    const v = part('vhagar', H, route, { marks: { turn: 9, fire: 10 }, beatsOut: 4 });
    v.part.events.push({ kind: 'jaw', t0: v.at('turn') - 0.6, t1: v.at('turn') + 1.8 }, { kind: 'fire', t0: v.at('fire') - 0.35, t1: v.at('fire') + 0.35 });
    list.push(finish('vhagar', 'Vhagar heaves up off her rock, flies a slow round of the bay, roars, and breathes a long fire over the water', ['bay', 'bay-north', 'city', 'gullet'], 0.9, [v.part]));
  }

  // --- Meraxes, far to the west ---
  // Rhaenys meant one day to fly Meraxes across the Sunset Sea to see what lay beyond it (TWOIAF). Here the silver
  // dragon drops off her high ledge, crosses the whole bay and the city on her long wings, turns at the edge of the
  // world, and comes home round the north of the mountain.
  {
    const route: Waypoint[] = [
      P(56, 62, 14, 26), P(20, 82, 8, 28), P(-20, 88, 0, 28), P(-56, 90, -6, 28), P(-72, 90, -24, 26), P(-68, 88, -54, 26),
      P(-40, 86, -76, 28), P(0, 84, -74, 28), P(36, 80, -72, 28), P(76, 78, -76, 28), P(96, 70, -40, 28), P(88, 60, 6, 28), P(70, 54, 28, 26),
    ];
    const m = part('meraxes', H, route, { marks: { west: 4 } });
    m.part.events.push({ kind: 'look', t0: m.at('west') - 2, t1: m.at('west') + 2, n: 0.5 });
    list.push(finish('west', 'Meraxes crosses the bay and the city on her long wings, turns at the edge of the world, and comes home round the mountain', ['city', 'city-high', 'bay', 'bay-north', 'north', 'sea', 'gullet'], 0.8, [m.part]));
  }

  // --- The three of the Conquest ---
  // Balerion, Vhagar and Meraxes were loosed together only once (TWOIAF, "The Conquest"), and Aegon raised his first
  // fort on the hill above the mouth of the Blackwater Rush. Here, rarely, the three rise from their homes and fall in
  // one behind another, Balerion leading, Vhagar below him and Meraxes above, and go once round King's Landing as a
  // procession of giants; Balerion breathes his black fire out over the bay as he comes round, the others roar as
  // they pass the same place, and each peels off for home.
  {
    // the round: over the bay's north, west over the city, south over the Dragonpit, east over the Red Keep and the
    // river's mouth, and north up the bay's east side to where it began
    const round = (y: number): Waypoint[] => [
      P(0, y, -50, 24), P(-36, y + 2, -60, 24), P(-66, y + 2, -36, 24), P(-66, y, 6, 24), P(-40, y - 2, 36, 24),
      P(-4, y - 2, 42, 24), P(20, y, 14, 24), P(18, y, -26, 24), P(0, y, -50, 24),
    ];
    // he carries straight on out over the city before he turns, so that his lower wing does not reach back over the dome
    const b = part('balerion', H, [P(-20, 68, 0, 22), P(-10, 74, -24, 22), P(10, 84, -40, 22), ...round(90), P(-12, 78, -70, 22)], { marks: { join: 3, over: 9 }, beatsOut: 4 });
    const v = part('vhagar', H, [P(10, 40, -74, 22), P(24, 56, -60, 24), P(16, 66, -40, 24), ...round(72).slice(0, 8), P(30, 60, -40, 24), P(26, 46, -64, 22), P(10, 34, -74, 22)], { marks: { join: 3, over: 9 } });
    const m = part('meraxes', H, [P(44, 66, 18, 26), P(24, 80, 6, 26), P(16, 94, -26, 26), ...round(108).slice(0, 7), P(40, 96, 30, 26), P(66, 70, 34, 26)], { marks: { join: 3, over: 9 } });
    together([b, v, m], 'join', [0, 2.9, 5.8]);
    b.part.events.push({ kind: 'jaw', t0: b.at('join') + 3, t1: b.at('join') + 4.8 }, { kind: 'fire', t0: b.at('over') + 0.3, t1: b.at('over') + 1.6 });
    v.part.events.push({ kind: 'jaw', t0: v.at('over') - 0.5, t1: v.at('over') + 1.6 });
    m.part.events.push({ kind: 'jaw', t0: m.at('over') - 0.4, t1: m.at('over') + 1.4 });
    list.push(finish('conquest', "Balerion, Vhagar and Meraxes, the three of the Conquest, go once round King's Landing one behind another, Balerion breathing his black fire out over the bay", ['city', 'city-high', 'city-south', 'bay', 'bay-north', 'bay-west', 'gullet', 'north', 'sea', 'south'], 0.35, [b.part, v.part, m.part]));
  }

  return list;
}

// ---------------------------------------------------------------------------
// The sheep
// ---------------------------------------------------------------------------

/** One sheep: a fleece, a dark face and four legs. */
function sheepShape(): THREE.BufferGeometry {
  const b = new GeoBuilder();
  b.box(-0.6, 0.45, -0.38, 0.55, 1.15, 0.38, 0xf1ece0, { faces: 'NESWTB' });
  b.box(0.5, 0.7, -0.2, 0.92, 1.12, 0.2, 0x2a2622, { faces: 'NESWTB' });
  for (const [x, z] of [[-0.42, -0.24], [-0.42, 0.24], [0.36, -0.24], [0.36, 0.24]]) b.box(x - 0.07, 0, z - 0.07, x + 0.07, 0.48, z + 0.07, 0x2a2622, { faces: 'NESWT' });
  return b.build();
}

/** The giants with room about their homes to rise and spread their wings now and then. */
const STRETCH: Partial<Record<Key, true>> = { balerion: true, vhagar: true, caraxes: true };

/** Where the fold's own sheep stands, the one Sheepstealer takes. */
const FOLD = { x: FLOCK[0][0], z: FLOCK[0][1] };

// ---------------------------------------------------------------------------
// Putting them on the tile
// ---------------------------------------------------------------------------

export function buildDragons(k: Build): void {
  const H = homesFor();
  const dragons = KEYS.map((key) => new Dragon(KIND[key], k.look));
  for (const d of dragons) k.group.add(d.mesh, d.shadow);
  const pilots = dragons.map((d, i) => new Pilot(d, { phase: i * 1.37, seed: 9100 + i * 61, firstBeat: 0.6 + 0.4 * i }));
  const fire = new Fire(2600, 4);
  const trails = new Trails(KEYS.length * 2);
  k.group.add(fire.mesh, fire.pools, trails.mesh);

  const sheep = new THREE.Mesh(sheepShape(), k.mat.city());
  sheep.name = 'sheep-taken';
  k.group.add(sheep);

  const all = moments(H);
  const byId = new Map(all.map((m) => [m.id, m]));
  const index = new Map(KEYS.map((key, i) => [key, i]));

  const playing: { m: Moment; start: number }[] = [];
  /** Each dragon's part just now, or null at home. */
  const flying: ({ part: Part; start: number } | null)[] = KEYS.map(() => null);
  /** At home: which way it faced as it came down, and when, so that it turns round to face out. */
  const turnFrom = KEYS.map((key) => H[key].facing), turnAt = KEYS.map(() => -1e9);
  /** At home: when it next yawns or roars, and when it last did. */
  const nextYawn = KEYS.map((_, i) => 5 + i * 3.7), yawnAt = KEYS.map(() => -1e9);
  /** At home: when it next rises and spreads its wings, and when it last began to; for those with room about them. */
  const nextStretch = KEYS.map((_, i) => 20 + i * 11), stretchAt = KEYS.map(() => -1e9);
  const held: Held[] = KEYS.map((key) => ({ x: H[key].x, y: H[key].y, z: H[key].z, heading: H[key].facing, sit: 1, speed: 18 }));

  let clock = 0, gap = 1.2, last = '', hushed = false, frameNo = 0;
  let seed = 4021;
  const rand = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  // the first few are chosen, so that whoever opens the tile sees dragons in the air at once
  const opening = ['black-dread', 'fleet', 'sheep', 'hunt', 'dome'];
  /** When each last took off or came home. */
  const flewAt = KEYS.map(() => 0);
  /** How long a moment's dragons have all been home. */
  const waited = (m: Moment): number => Math.min(...m.parts.map((p) => clock - flewAt[index.get(p.key)!]));

  /** Whether a moment may start: its dragons are all home, none of its sky is in use, and no more than three would be up. */
  const free = (m: Moment): boolean => {
    if (m.parts.some((p) => flying[index.get(p.key)!])) return false;
    const used = new Set(playing.flatMap((q) => q.m.sky));
    if (m.sky.some((s) => used.has(s))) return false;
    return flying.filter(Boolean).length + m.parts.length <= 3;
  };
  const start = (m: Moment): void => {
    playing.push({ m, start: clock });
    for (const p of m.parts) {
      flying[index.get(p.key)!] = { part: p, start: clock };
      flewAt[index.get(p.key)!] = clock;
    }
    last = m.id;
  };

  // the sheep: in the fold, then carried, then laid before his cave, then gone, and another in the fold
  let sheepTaken = -1, sheepDown = -1;
  const where = new THREE.Vector3(), fwd = new THREE.Vector3(), up = new THREE.Vector3();

  /** How high what it would land on is, at a moment of its part. */
  const floorFor = (p: Part, t: number): number => {
    let y = H[p.key].y;
    for (const q of p.perches) if (q.tA !== -Infinity && q.tD !== Infinity && t >= q.tA - 2.2 && t <= q.tD + 1.2) y = q.y;
    return y;
  };

  k.each((dt, time, night) => {
    clock += dt;
    frameNo++;

    // --- the director ---
    for (let i = playing.length - 1; i >= 0; i--) if (clock - playing[i].start > playing[i].m.length) playing.splice(i, 1);
    gap -= dt;
    if (gap <= 0 && !hushed) {
      let pick: Moment | undefined;
      if (opening.length > 0) {
        const m = byId.get(opening[0]);
        if (m && free(m)) { pick = m; opening.shift(); }
      } else {
        // fair to every dragon: a moment is the likelier the longer its dragons have all been home, and one whose
        // dragons have all waited three minutes goes next, as soon as its sky is free, with nothing let in before it
        const due = all.filter((m) => m.id !== last && waited(m) > 180).sort((a, b) => waited(b) - waited(a))[0];
        if (due && free(due)) pick = due;
        else {
          // while one is due and its sky is taken, others go only where they take neither its sky nor its dragons
          const clear = (m: Moment): boolean => !due || (!m.sky.some((s) => due.sky.includes(s)) && !m.parts.some((p) => due.parts.some((q) => q.key === p.key)));
          const ready = all.filter((m) => m.id !== last && free(m) && clear(m));
          const odds = (m: Moment): number => m.weight * (0.35 + Math.min(2, waited(m) / 90));
          let r = rand() * ready.reduce((s, m) => s + odds(m), 0);
          for (const m of ready) { r -= odds(m); if (r <= 0) { pick = m; break; } }
        }
      }
      if (pick) { start(pick); gap = 4 + rand() * 8; }
      else gap = 1;
    }

    // --- each dragon ---
    KEYS.forEach((key, i) => {
      const pilot = pilots[i], d = dragons[i], f = flying[i];
      if (f) {
        const t = clock - f.start;
        if (t >= f.part.end) {
          flying[i] = null;
          turnFrom[i] = f.part.arrive;
          turnAt[i] = clock;
          flewAt[i] = clock;
        } else if (t < f.part.wait) {
          // still at home: turning on its perch to the way it leaves by
          const h = H[key], hd = held[i], p = f.part;
          const diff = ((h.leave - h.facing + 540) % 360) - 180;
          hd.heading = h.facing + diff * smooth((t - (p.wait - p.turn)) / Math.max(0.01, p.turn - 0.2));
          hd.look = 0;
          hd.jaw = 0;
          hd.sit = 1;
          hd.beat = 0;
          pilot.hold(hd, time, groundAt);
        } else {
          const p = f.part;
          cueOf(p, t, pilot.cue);
          pilot.cue.lift = liftOf(p, H, t, pilot.cue);
          pilot.fly((tt, out) => placeOf(p, H, tt - f.start, out), clock, time, dt, () => floorFor(p, t), groundAt);
          const cue = pilot.cue;
          if (cue.fire > 0) {
            // at night the lance lights the water under its middle, if it is low enough over it to
            const flame = KIND[key].flame, gx = d.mouth.x + d.mouthDir.x * flame.reach * 0.6, gz = d.mouth.z + d.mouthDir.z * flame.reach * 0.6;
            const gy = d.mouth.y + d.mouthDir.y * flame.reach * 0.6, under = isWater(gx, gz) ? groundAt(gx, gz) : null;
            fire.breathe(i, d.mouth, d.mouthDir, pilot.vel, flame, cue.fire, dt, under !== null && gy - under < 30 ? under : null);
          }
          if (key === 'sheepstealer' && sheepTaken < 0 && p.events.some((e) => e.kind === 'grab' && t >= (e.t0 + e.t1) / 2)) sheepTaken = clock;
        }
      }
      if (!flying[i]) {
        // At home: it turns round to face out once it is down, looks about in its own way, watches whoever flies near
        // it, and now and then yawns, or roars.
        const h = H[key], hd = held[i];
        const diff = turnBy(turnFrom[i], h.facing, WAYS[key].round);
        const heading = (((turnFrom[i] + diff * smooth((clock - turnAt[i]) / 3.4)) % 360) + 360) % 360;
        hd.heading = heading;
        const look = Math.min(1.8, KIND[key].flight.look ?? 1);
        let yaw = (14 * Math.sin(clock * (0.23 + 0.03 * i) + i * 1.7) + 9 * Math.sin(clock * (0.61 + 0.05 * i) + i)) * look;
        let near = Infinity, toward = 0;
        KEYS.forEach((_, j) => {
          if (j === i || !flying[j]) return;
          const q = pilots[j].pose.pos, dd = Math.hypot(q.x - h.x, q.z - h.z);
          if (dd < 85 && dd < near) {
            near = dd;
            toward = ((Math.atan2(q.z - h.z, q.x - h.x) / RAD - heading + 540) % 360) - 180;
          }
        });
        if (near < 85) yaw = yaw * 0.25 + Math.max(-75, Math.min(75, toward)) * 0.75;
        hd.look = yaw;
        if (clock > nextYawn[i]) { yawnAt[i] = clock; nextYawn[i] = clock + 14 + rand() * 30; }
        const y = (clock - yawnAt[i]) / 2.2;
        hd.jaw = y > 0 && y < 1 ? Math.min(1, y / 0.3, (1 - y) / 0.3) * (key === 'cannibal' || key === 'caraxes' || key === 'balerion' ? 1 : 0.7) : 0;
        // A giant with room about it rises now and then, spreads its wings, beats them once and roars, and settles
        // again: never while another flies near, and it folds them at once if one comes.
        hd.sit = 1;
        hd.beat = 0;
        let stretching = false;
        if (STRETCH[key]) {
          if (clock > nextStretch[i] && near > 100 && clock - turnAt[i] > 8) { stretchAt[i] = clock; nextStretch[i] = clock + 40 + rand() * 50; }
          const st = (clock - stretchAt[i]) / 6;
          if (st > 0 && st < 1) {
            stretching = true;
            if (near < 75) stretchAt[i] = Math.min(stretchAt[i], clock - 6 * 0.75);
            hd.sit = 1 - 0.5 * smooth(Math.min(st / 0.2, (1 - st) / 0.25, 1));
            if (st > 0.36 && st < 0.6) hd.beat = (st - 0.36) / 0.24;
            const roar = (st - 0.3) / 0.32;
            if (roar > 0 && roar < 1) hd.jaw = Math.max(hd.jaw, Math.min(1, roar / 0.2, (1 - roar) / 0.3));
          }
        }
        // Posing a dragon is most of what the show costs, and one at rest changes slowly: it is posed on every third
        // frame, each on a frame of its own, unless it is turning round, yawning, watching one fly near or rising.
        const busy = frameNo <= 3 || clock - turnAt[i] < 3.6 || (y > 0 && y < 1) || near < 85 || stretching;
        if (busy || (frameNo + i) % 3 === 0) pilot.hold(hd, time, groundAt);
      }
      const ribbon = pilot.ribbons(dt, !flying[i]);
      trails.feed(i * 2, d.tips[0], ribbon, dt);
      trails.feed(i * 2 + 1, d.tips[1], ribbon, dt);
      pilot.light(night);
    });

    // --- the sheep ---
    const si = index.get('sheepstealer')!, sp = pilots[si];
    if (sheepTaken >= 0 && flying[si]) {
      // in his claws, under his hips
      fwd.set(1, 0, 0).applyQuaternion(sp.pose.quat);
      up.set(0, 1, 0).applyQuaternion(sp.pose.quat);
      where.copy(sp.pose.pos).addScaledVector(fwd, -0.13 * SHEEPSTEALER.length).addScaledVector(up, -0.075 * SHEEPSTEALER.length - 1.1);
      sheep.position.copy(where);
      sheep.quaternion.copy(sp.pose.quat);
      sheep.visible = true;
    } else if (sheepTaken >= 0) {
      // laid on his shelf under his chin, and after a while gone; and another put out in the fold, as one was for him
      // every morning
      if (sheepDown < 0) sheepDown = clock;
      const h = H.sheepstealer, f = h.facing * RAD;
      sheep.position.set(h.x + Math.cos(f) * 2.2, h.y + 0.5, h.z + Math.sin(f) * 2.2);
      sheep.rotation.set(0, -f, Math.PI / 2);
      sheep.visible = clock - sheepDown < 20;
      if (clock - sheepDown > 36) { sheepTaken = -1; sheepDown = -1; }
    } else {
      sheep.position.set(FOLD.x, groundAt(FOLD.x, FOLD.z) + 0.02, FOLD.z);
      sheep.rotation.set(0, 0.6 + 0.3 * Math.sin(clock * 0.4), 0);
      sheep.visible = true;
    }

    fire.update(dt, night);
    trails.update(night);
  });

  if (import.meta.env.DEV) {
    const report = checkShow(all, H);
    console.info(`Blackwater Bay: ${all.length} dragon moments: ${all.map((m) => `${m.id} ${m.length.toFixed(0)} s`).join(', ')}.`);
    if (report.near.length) console.warn(`Blackwater Bay: the dragons come nearer than ${CLEAR} to what is built:\n  ${report.near.join('\n  ')}`);
    else console.info(`Blackwater Bay: the dragons keep ${CLEAR} clear of everything built. Nearest: ${report.nearest}.`);
    if (report.fire.length) console.warn(`Blackwater Bay: fire that is neither straight up nor over open water:\n  ${report.fire.join('\n  ')}`);
    else console.info('Blackwater Bay: every fire goes straight up or out over open water.');
    (window as unknown as { bay: unknown }).bay = {
      moments: all, homes: H, dragons, pilots, report,
      /** Plays a moment now, by its id, if its dragons are home, and stops the director choosing anything else. */
      play(id: string): string {
        const m = byId.get(id);
        if (!m) return `no moment ${id}: ${all.map((x) => x.id).join(', ')}`;
        opening.length = 0;
        hushed = true;
        if (!m.parts.every((p) => !flying[index.get(p.key)!])) return `${id}: one of its dragons is in the air`;
        start(m);
        return `${id}: ${m.story} (${m.length.toFixed(0)} s)`;
      },
      /** Lets the director choose again. */
      free(): void { hushed = false; },
      clock: (): number => clock,
      playing: (): string[] => playing.map((q) => `${q.m.id} ${(clock - q.start).toFixed(1)}/${q.m.length.toFixed(0)}`),
      where: (key: Key): number[] => pilots[index.get(key)!].pose.pos.toArray().map((v) => Math.round(v * 10) / 10),
      /** How high the Dragonmont's rock stands at a place, ribs and all, for leaving out of a check what lies inside it. */
      rock: (x: number, z: number): number => mountBuilt(x, z),
      /** How high what a dragon would stand on is at a place: the show's own ground, roofs, rock, the dome and all. */
      ground: (x: number, z: number): number => groundAt(x, z),
      /** Where a moment's dragon is, `t` into the moment: for aiming pictures. */
      at: (id: string, key: Key, t: number): number[] => {
        const m = byId.get(id)!, p = m.parts.find((q) => q.key === key)!;
        return placeOf(p, H, t, new THREE.Vector3()).toArray().map((v) => Math.round(v * 10) / 10);
      },
    };
  }
}

// ---------------------------------------------------------------------------
// The check
// ---------------------------------------------------------------------------

/** How near a dragon may come to anything built, wing tip and all; and to another dragon resting at home. */
const CLEAR = 6, CLEAR_DRAGON = 3;

/**
 * Flies every moment against the plan: how near each dragon comes to each lot,
 * from its nose, its tail and across its wings as its speed shapes and its turn
 * banks them, leaving out where it sits, takes off and lands; and whether each
 * fire goes straight up or ends over open water.
 */
function checkShow(all: Moment[], H: Record<Key, Home>): { near: string[]; nearest: string; fire: string[] } {
  const worst = new Map<string, { d: number; who: string; m: string; at: number[] }>();
  const fire: string[] = [];
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), v = new THREE.Vector3(), a = new THREE.Vector3();
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), wing = new THREE.Vector3(), q = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const cue: Cue = { fire: 0, charge: 0, roll: 0, beat: 0, sit: 0 };
  const lots = LOTS.filter((l) => l.id !== 'dragonpit' && (!l.part || ['rk-tower', 'rk-holdfast', 'stone-drum', 'windwyrm', 'sea-dragon', 'dp-doors'].includes(l.id)));
  const toBuilt = (x: number, y: number, z: number): { d: number; id: string } => {
    let best = Infinity, id = '';
    for (const l of lots) {
      const dd = Math.hypot(Math.max(l.x0 - x, 0, x - l.x1), Math.max(0, y - l.top), Math.max(l.z0 - z, 0, z - l.z1));
      if (dd < best) { best = dd; id = l.id; }
    }
    const dome = y - Math.max(domeAt(x, z), Math.hypot(x - RHAENYS.c[0], z - RHAENYS.c[1]) <= RHAENYS.drum ? RHAENYS.wall : -Infinity);
    if (dome < best) { best = dome; id = 'dragonpit'; }
    // the mountain as it is built: its shelves cut level, and a rib of rock standing over each cave
    const mount = y - mountBuilt(x, z);
    if (mount < best) { best = mount; id = 'dragonmont'; }
    if (onRock(x, z) && y - rockAt(x, z) < best) { best = y - rockAt(x, z); id = 'vhagars-rock'; }
    return { d: best, id };
  };
  /** Where the two giants lie when they are home, as a line from head to tail with a girth round it, for the others to keep clear of. */
  const lying = (key: Key, head: number, tail: number, girth: number): { a: THREE.Vector3; b: THREE.Vector3; r: number } => {
    const h = H[key], L = KIND[key].length, f = h.facing * RAD, dx = Math.cos(f), dz = Math.sin(f);
    return { a: new THREE.Vector3(h.x + dx * 0.34 * L, h.y + head, h.z + dz * 0.34 * L), b: new THREE.Vector3(h.x - dx * 0.62 * L, h.y + tail, h.z - dz * 0.62 * L), r: girth };
  };
  const RESTING: Partial<Record<Key, { a: THREE.Vector3; b: THREE.Vector3; r: number }>> = {
    balerion: lying('balerion', 13, -14, 10),
    vhagar: lying('vhagar', 12, 1, 8),
  };
  const ab = new THREE.Vector3(), aq = new THREE.Vector3();
  const toLine = (q: THREE.Vector3, s: { a: THREE.Vector3; b: THREE.Vector3; r: number }): number => {
    ab.subVectors(s.b, s.a);
    const t = Math.max(0, Math.min(1, aq.subVectors(q, s.a).dot(ab) / ab.lengthSq()));
    return aq.copy(s.a).addScaledVector(ab, t).distanceTo(q) - s.r;
  };
  /** What a dragon's own home stands on, which it is meant to be near as it leaves and comes back. */
  const OWN: Record<Key, string[]> = {
    balerion: ['dragonpit'], dreamfyre: ['dragonpit', 'dp-doors'], vhagar: ['vhagars-rock', 'dragonmont'],
    meraxes: ['dragonmont'], vermithor: ['dragonmont'], silverwing: ['dragonmont'], sheepstealer: ['dragonmont'],
    caraxes: ['rk-tower', 'rk-holdfast', 'red-keep', 'dragonmont'], meleys: ['high-tide', 'dragonmont'], cannibal: ['dragonmont'],
  };
  const note = (id: string, d: number, who: string, m: string, at: THREE.Vector3): void => {
    const had = worst.get(id);
    if (!had || had.d > d) worst.set(id, { d, who, m, at: [at.x, at.y, at.z].map(Math.round) });
  };
  for (const m of all) {
    // the giants that are home while this moment plays
    const home = (Object.keys(RESTING) as Key[]).filter((k2) => !m.parts.some((q2) => q2.key === k2)).map((k2) => [k2, RESTING[k2]!] as const);
    for (const p of m.parts) {
      const kind = KIND[p.key], L = kind.length, half = 0.675 * L * (kind.shape?.reach ?? 1), h = H[p.key];
      for (let t = 0; t < p.end; t += 0.1) {
        cueOf(p, t, cue);
        if (cue.sit > 0) continue;
        placeOf(p, H, t - 0.1, p0); placeOf(p, H, t, p1); placeOf(p, H, t + 0.1, p2);
        // taking off or landing it is meant to be near what it stands on, and so where it perches and where it swoops
        // to take something
        if (Math.hypot(p1.x - h.x, p1.y - h.y, p1.z - h.z) < 1.1 * Math.min(L, 24)) continue;
        if (t < p.perches[0].tD + 3.2 || t > p.perches[p.perches.length - 1].tA - 3.8) continue;
        if (p.perches.some((r) => r.tA !== -Infinity && r.tD !== Infinity && t > r.tA - 4.5 && t < r.tD + 3.5)) continue;
        if (p.events.some((e) => e.kind === 'grab' && t > e.t0 - 1 && t < e.t1 + 1)) continue;
        v.subVectors(p2, p0).multiplyScalar(5);
        a.copy(p2).add(p0).addScaledVector(p1, -2).multiplyScalar(100);
        const speed = v.length();
        if (speed < 0.5) continue;
        fwd.copy(v).normalize();
        right.crossVectors(fwd, UP);
        if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
        right.normalize();
        const most = (kind.flight.bank ?? 78) * RAD, bank = Math.max(-most, Math.min(most, Math.atan2(a.dot(right), 13)));
        up.crossVectors(right, fwd).normalize();
        wing.copy(right).multiplyScalar(Math.cos(bank)).addScaledVector(up, -Math.sin(bank));
        const span = (cue.tuck ? blendForm(formAt(speed), TUCK, cue.tuck).span : formAt(speed).span) * half;
        const homely = Math.hypot(p1.x - h.x, p1.z - h.z) < 1.4 * L;
        for (const s of [-1, -0.5, 0, 0.5, 1, 0.34, -0.66]) {
          if (Math.abs(s) === 0.34 || s === -0.66) q.copy(p1).addScaledVector(fwd, s * L);
          else q.copy(p1).addScaledVector(wing, span * s);
          const n = toBuilt(q.x, q.y, q.z);
          for (const [k2, s] of home) {
            // measured against its own margin, and noted as if against the usual one
            const dd = toLine(q, s) + (CLEAR - CLEAR_DRAGON);
            if (dd < n.d) { n.d = dd; n.id = `${k2} at home`; }
          }
          if (homely && OWN[p.key].includes(n.id)) continue;
          // taking off and landing near its home, a giant's wing tip may pass a little way over a low roof
          if (homely && L > 40) { const lot = lots.find((l) => l.id === n.id); if (lot && lot.top <= 9) n.d += 4; }
          note(n.id, n.d, kind.name, m.id, q);
        }
        // where its fire goes: straight up, or out over open water and clear of what is built
        if (cue.fire > 0.3) {
          const reach = kind.flame.reach, mouth = q.copy(p1).addScaledVector(fwd, 0.34 * L);
          let wet = true;
          for (const f of [0.3, 0.6, 1]) {
            const x = mouth.x + fwd.x * reach * f, z = mouth.z + fwd.z * reach * f, y = mouth.y + fwd.y * reach * f;
            if (!isWater(x, z) || onRock(x, z) || toBuilt(x, y, z).d < 4) wet = false;
          }
          if (fwd.y < 0.72 && !wet) fire.push(`${kind.name} in ${m.id} at ${t.toFixed(1)} s, from ${[mouth.x, mouth.y, mouth.z].map(Math.round).join(', ')}`);
        }
      }
    }
  }
  const list = [...worst.entries()].sort((x, y) => x[1].d - y[1].d);
  const near = list.filter(([, w]) => w.d < CLEAR).map(([id, w]) => `${id}: ${w.d.toFixed(1)}, ${w.who} in ${w.m} at ${w.at.join(', ')}`);
  const n = list[0];
  return { near, nearest: n ? `${n[0]} ${n[1].d.toFixed(1)}, ${n[1].who} in ${n[1].m}` : 'none', fire: [...new Set(fire)].slice(0, 12) };
}
