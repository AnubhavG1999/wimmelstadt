// One winged dragon of the books: its shape, its joints, and how a pose
// becomes a mesh. Westeros's three were the first built from it, and any tile
// can have its own: a `DragonKind` (see `kinds.ts`) gives its colours, its
// size, its fire and its manner of flight, and a `Pilot` (`pilot.ts`) flies it.
//
// They are built after the books: two legs, with the wings as the forelimbs,
// lean and long, most of each a neck, a tail and wings. They are meant to read as fast jets that are dragons: head,
// neck and body in one line, everything swept back along that line, a tail fin
// that works as a rudder, and wings that change shape with speed.
//
// A dragon is one mesh. Its parts are rigid: each has its own corners, worked
// out once, and on every frame each part is turned and moved to where the pose
// puts it. Only the wing's skin is drawn afresh, between the shoulder, the
// wrist, the finger tips and the flank.
//
// Lengths in this file are shares of the dragon's length from nose to tail
// tip. A kind's `shape` changes them (see `DragonShape`): the great dragons
// of the Targaryens each have one. Westeros's three have none, and so differ
// only in size and colour.

import * as THREE from 'three';
import { patch, toon, type TileLook } from '../look/materials';
import type { Flame } from './fire';

type V3 = [number, number, number];

export interface DragonKind {
  name: string;
  /** From nose to tail tip, in units. Its wings span 1.35 times that. */
  length: number;
  body: number; belly: number;
  /** Narrow streaks along the flanks. */
  streak: number;
  /** Horns, frill and the plates along the spine. */
  horn: number;
  /** The bones of the wing. */
  bone: number;
  /** The wing's skin, in two shades so that the fingers show. */
  skin: [number, number];
  claw: number;
  eye: number;
  /** Inside the jaws. */
  mouth: number;
  /** What its throat glows before it breathes fire, and what its own fire lights it with. */
  glow: number;
  /** Its fire. */
  flame: Flame;
  /** How it flies. */
  flight: DragonFlight;
  /** Its own build, against Westeros's three: see `DragonShape`. Left out, it is built as they are. */
  shape?: DragonShape;
  /** Its teeth, where its shape shows them: the claws' colour unless this says otherwise. */
  tooth?: number;
  /** Old wounds, where its shape has them: a paler shade of its body unless this says otherwise. */
  scar?: number;
}

/**
 * A dragon's own build, against Westeros's three, which are 1 in every
 * measure and 0 in every feature. What is left out is as they are. Lengths are
 * shared out again so that the dragon is still its `length` from nose to
 * tail tip: a longer neck makes the rest a little shorter.
 */
export interface DragonShape {
  /** How long its head, its neck, its body and its tail are. */
  head?: number;
  neck?: number;
  body?: number;
  tail?: number;
  /** How thick its body and the root of its tail are, and its legs: a heavy dragon is 1.4. */
  bulk?: number;
  /** How thick its neck is, from a little way out of the chest. */
  throat?: number;
  /** How heavy its head is: deeper and wider, jaw and all. */
  heft?: number;
  /** How far its wings reach: they span 1.35 times its length, times this. */
  reach?: number;
  /** How broad its wings are from leading edge to trailing edge: its fingers fan wider and run longer. */
  breadth?: number;
  /** How long its horns and the spikes of its frill are. */
  horns?: number;
  /** How tall the plates along its spine stand: a crest of spines is 2 or more. */
  crest?: number;
  /** How large the spade at the end of its tail is. */
  fin?: number;
  /** Teeth that show below its upper jaw, the longest as long as this share of its head: 0 for none. */
  fangs?: number;
  /** How torn the trailing edges of its wings are, from 0 to 1. */
  ragged?: number;
  /** How scarred its hide is, from 0 to 1: pale weals across its flanks and its neck. */
  scars?: number;
}

/**
 * A dragon's manner of flight, which a `Pilot` flies it by. Only `beat` and
 * `answer` must be given: what is left out is as Westeros's three fly.
 */
export interface DragonFlight {
  /** How long one beat of its wings takes, in seconds: the larger the dragon, the slower. */
  beat: number;
  /** How quickly it answers a turn with its bank: 6 is Drogon's. */
  answer: number;
  /** The most it banks, in degrees: 78 unless this says otherwise. */
  bank?: number;
  /** How long it glides between bursts of beats, against the three: 2 is twice as long. */
  glide?: number;
  /** How deep its beats are, against the three. */
  stroke?: number;
  /** How far its body rides up and down on its wings through a beat, against the three. */
  heave?: number;
  /** How much it rocks on the air where it flies straight, against the three. */
  rock?: number;
  /** How much it looks about as it flies, against the three. */
  look?: number;
  /** How far its tail sways as it flies, and how quickly, against the three: a great old dragon's sways slow. */
  sway?: number;
  swayRate?: number;
  /** How much its neck snakes from side to side as it flies: 0 for the three, and 1 for a long neck that never keeps still. */
  snake?: number;
}

// ---------------------------------------------------------------------------
// Measures, as shares of the length
// ---------------------------------------------------------------------------

const HEAD = 0.1, NECK = 5, NECK_L = 0.048, BODY = 3, BODY_L = 0.2 / 3, TAIL = 10, TAIL_L = 0.046;
/** Where a wing joins the chest, where a leg joins the hips, and where the wing's skin meets the flank: for the right side. */
const SHOULDER: V3 = [-0.04, 0.026, 0.036], HIP: V3 = [-0.178, -0.02, 0.02], FLANK: V3 = [-0.232, 0.004, 0.018];
/** The wing's arm is two bones: the upper arm to the elbow, and the forearm to the wrist. As a wing they lie in one line. */
const UPPER = 0.09, FORE = 0.13, ARM = UPPER + FORE, FINGERS = [0.45, 0.405, 0.335, 0.25];
/** How far back each finger fans from the first, when the hand is wide open. */
const FAN = [0, 0.42, 0.9, 1.45];
const THIGH = 0.07, SHIN = 0.066, FOOT = 0.03;
/** Half the full span, from the middle of the back to a wing tip. */
export const HALF_SPAN = 0.675;

const RAD = Math.PI / 180;

// On the ground it stands as a bat does, and as a dragon with two legs must:
// on its feet and on the claws at the wrists of its wings, which it sets down
// ahead of its chest and wide of it, with its elbows up and its fingers folded
// back along its flanks.
/** Where a wing's claws and a foot come down: how far ahead of the root of the neck, and how far to the side. */
const WRIST_AT = [0.012, 0.116], FOOT_AT = [-0.158, 0.058];
/** How the folded fingers lie: how steeply each rises towards the tail, and how far it leans in over the back. */
const FOLD_RISE = [33 * RAD, 25 * RAD, 17 * RAD, 9 * RAD], FOLD_IN = [-0.17, -0.11, -0.05, 0.02];
/** The tail laid out behind it: how steeply each joint runs down to the ground, and how far it curls to one side. */
const LAY = [0.36, 0.55, 0.48, 0.24, 0.05, 0.02, 0.02, 0.02, 0.01, 0], CURL = [0, 0, 0, 0.04, 0.12, 0.24, 0.38, 0.54, 0.72, 0.9];

/**
 * How it stands as it lands. `down` is 0 as its feet touch, reared back with
 * its wings spread, and 1 when it has come down onto its wing claws. Gives how
 * far its nose is up, and how high the root of its neck is over what it stands
 * on, as a share of its length.
 */
export function stance(down: number, m?: Measures): { pitch: number; root: number } {
  const t = down * down * (3 - 2 * down), hip = m ? m.hip : HIP;
  // braced, its chest is held up off the ground on its wings, and its hips are low
  const pitch = 0.6 + (0.3 - 0.6) * t, hips = 0.118 + (0.08 - 0.118) * t;
  return { pitch, root: hips - hip[0] * Math.sin(pitch) - hip[1] * Math.cos(pitch) };
}

/**
 * Two bones in a row from `a` that are to reach `c`: where the joint between
 * them is, bent the way `pole` points. `end` is where they reach to, which is
 * short of `c` if it is too far.
 */
function bend(a: THREE.Vector3, c: THREE.Vector3, l1: number, l2: number, pole: THREE.Vector3, joint: THREE.Vector3, end: THREE.Vector3): void {
  end.subVectors(c, a);
  const far = end.length();
  if (far < 1e-6) end.set(0, -1, 0);
  else end.multiplyScalar(1 / far);
  const d = Math.min((l1 + l2) * 0.985, Math.max(Math.abs(l1 - l2) * 1.02 + 1e-6, far));
  const along = (l1 * l1 + d * d - l2 * l2) / (2 * d), off = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  // the pole, less what lies along the way to the far end
  joint.copy(pole).addScaledVector(end, -pole.dot(end));
  if (joint.lengthSq() < 1e-10) joint.set(1, 0, 0).addScaledVector(end, -end.x);
  joint.normalize().multiplyScalar(off).addScaledVector(end, along).add(a);
  end.multiplyScalar(d).add(a);
}

/** A direction part of the way from one to another. `out` may be `to`, but not `from`. */
const towards = (from: THREE.Vector3, to: THREE.Vector3, t: number, out: THREE.Vector3): THREE.Vector3 => out.copy(to).multiplyScalar(t).addScaledVector(from, 1 - t).normalize();

/** A slice across the neck, the body or the tail: half its width, how far its back rises and how far its keel drops. */
interface Slice { w: number; up: number; down: number }
const mix = (a: Slice, b: Slice, t: number): Slice => ({ w: a.w + (b.w - a.w) * t, up: a.up + (b.up - a.up) * t, down: a.down + (b.down - a.down) * t });
// Lean, but with a chest: deeper than it is wide where the wings join, and narrow at the hips.
const AT_HEAD: Slice = { w: 0.019, up: 0.022, down: 0.024 }, AT_CHEST: Slice = { w: 0.034, up: 0.038, down: 0.05 };
const DEEPEST: Slice = { w: 0.042, up: 0.044, down: 0.064 }, AT_WAIST: Slice = { w: 0.032, up: 0.035, down: 0.042 }, AT_HIPS: Slice = { w: 0.024, up: 0.028, down: 0.03 };
const TAIL_TIP: Slice = { w: 0.0024, up: 0.0032, down: 0.0032 };

const scaleSlice = (s: Slice, f: number): Slice => ({ w: s.w * f, up: s.up * f, down: s.down * f });

/** Every measure of one kind's build, as shares of its length, worked out from its shape by `measure`. */
export interface Measures {
  /** How much longer its head is than the three's, and how much deeper and wider. */
  hx: number; hy: number;
  head: number; neckL: number; bodyL: number; tailL: number;
  /** The slices where the neck meets the chest and the head, and along the body from the chest to the hips. */
  atChest: Slice; atHead: Slice; slices: Slice[]; tailTip: Slice;
  /** How much thicker its neck is, and its body. */
  girth: number; bulk: number;
  shoulder: V3; hip: V3; flank: V3;
  upper: number; fore: number; arm: number; fingers: number[]; fan: number[];
  /** Half its full span, from the middle of its back to a wing tip. */
  halfSpan: number;
  horns: number; crest: number; fin: number; fangs: number; ragged: number; scars: number;
}

/** A kind's measures, from its shape. Without one they are exactly the three's. */
export function measure(shape: DragonShape = {}): Measures {
  const h = shape.head ?? 1, n = shape.neck ?? 1, b = shape.body ?? 1, t = shape.tail ?? 1;
  // the parts' lengths shared out again, so that it is still its length from nose to tail tip
  const k = h === 1 && n === 1 && b === 1 && t === 1 ? 1 : 1 / (HEAD * h + NECK * NECK_L * n + BODY * BODY_L * b + TAIL * TAIL_L * t);
  const bulk = shape.bulk ?? 1, heft = shape.heft ?? 1, reach = shape.reach ?? 1, breadth = shape.breadth ?? 1;
  // the wings and the legs keep their places along a longer or a shorter body
  const along = b * k;
  const atChest = scaleSlice(AT_CHEST, bulk);
  return {
    hx: h * k, hy: h * k * heft,
    head: HEAD * h * k, neckL: NECK_L * n * k, bodyL: BODY_L * b * k, tailL: TAIL_L * t * k,
    atChest, atHead: scaleSlice(AT_HEAD, heft), slices: [atChest, scaleSlice(DEEPEST, bulk), scaleSlice(AT_WAIST, bulk), scaleSlice(AT_HIPS, bulk)], tailTip: TAIL_TIP,
    girth: shape.throat ?? 1, bulk,
    shoulder: [SHOULDER[0] * along, SHOULDER[1] * bulk, SHOULDER[2] * bulk],
    hip: [HIP[0] * along, HIP[1] * bulk, HIP[2] * bulk],
    flank: [FLANK[0] * along, FLANK[1] * bulk, FLANK[2] * bulk],
    upper: UPPER * reach, fore: FORE * reach, arm: ARM * reach,
    fingers: FINGERS.map((f, i) => f * reach * (i === 0 ? 1 : Math.sqrt(breadth))),
    fan: FAN.map((a) => a * breadth),
    halfSpan: HALF_SPAN * reach,
    horns: shape.horns ?? 1, crest: shape.crest ?? 1, fin: shape.fin ?? 1, fangs: shape.fangs ?? 0, ragged: shape.ragged ?? 0, scars: shape.scars ?? 0,
  };
}
/** Westeros's three's measures, which every kind without a shape of its own has. */
export const LEAN = measure();

/** The slice at each end of each joint of the neck, counted from the chest: it thins or thickens to its own girth a little way out of the chest. */
const neckSlice = (m: Measures, j: number): Slice => scaleSlice(mix(m.atChest, m.atHead, j / NECK), 1 + (m.girth - 1) * Math.min(1, j / 1.5));
const tailSlice = (m: Measures, j: number): Slice => mix(m.slices[3], m.tailTip, (j / TAIL) ** 0.8);

/** Stretches a part that was made at the three's size: its normals are stretched the other way and made whole again. */
function stretch(s: Shape, sx: number, sy: number, sz: number): Shape {
  if (sx === 1 && sy === 1 && sz === 1) return s;
  for (let i = 0; i < s.pos.length; i += 3) {
    s.pos[i] *= sx; s.pos[i + 1] *= sy; s.pos[i + 2] *= sz;
    const nx = s.nor[i] / sx, ny = s.nor[i + 1] / sy, nz = s.nor[i + 2] / sz, l = Math.hypot(nx, ny, nz) || 1;
    s.nor[i] = nx / l; s.nor[i + 1] = ny / l; s.nor[i + 2] = nz / l;
  }
  return s;
}

/** A shade of a colour part of the way to a pale bone. */
function pale(color: number, t = 0.55): number {
  const c = new THREE.Color(color).lerp(new THREE.Color(0xd9ccb8), t);
  return c.getHex();
}

/** A fixed run of chance, from a number: the same scars on the same dragon every time. */
const chanceOf = (n: number): number => { const x = Math.sin(n * 12.9898 + 4.1414) * 43758.5453; return x - Math.floor(x); };

/** Old wounds healed pale: a weal slanting back across a flank of a joint, here and not there, more of them the more scarred it is. */
function weals(b: Shape, k: DragonKind, x0: number, s0: Slice, x1: number, s1: Slice, amount: number, seed: number): void {
  const color = k.scar ?? pale(k.body);
  for (const side of [1, -1]) {
    for (let w = 0; w < 2; w++) {
      const r = chanceOf(seed * 7 + side * 3 + w * 13);
      if (r > amount * (w === 0 ? 0.9 : 0.45)) continue;
      const a = 0.08 + 0.42 * chanceOf(seed * 11 + side + w * 5), len = 0.24;
      const X = (t: number): number => x0 + (x1 - x0) * t;
      // from high on the flank, slanting back and down to below its middle, standing a hair proud
      const hi = (t: number): V3 => { const s = mix(s0, s1, t); return [X(t), s.up * 0.32 + 0.0012, side * (s.w + 0.0014)]; };
      const lo = (t: number): V3 => { const s = mix(s0, s1, t); return [X(t), -s.down * 0.42, side * (s.w * 0.8 + 0.0014)]; };
      b.quad(hi(a), hi(a + len * 0.5), lo(Math.min(1, a + len * 0.5 + 0.34)), lo(Math.min(1, a + 0.34)), color, [0, 0, side]);
    }
  }
}

// ---------------------------------------------------------------------------
// Building a part
// ---------------------------------------------------------------------------

/**
 * The corners of a bar's ring, across it: six, as round as a bar this small needs to look, set a little further out
 * than the faces of the four-sided bar they replaced, so that it is as stout as it was.
 */
const HEX = [0, 1, 2, 3, 4, 5].map((i) => [1.22 * Math.cos(((30 + 60 * i) * Math.PI) / 180), 1.22 * Math.sin(((30 + 60 * i) * Math.PI) / 180)]);

/** Collects the flat triangles of one rigid part. */
class Shape {
  readonly pos: number[] = [];
  readonly nor: number[] = [];
  readonly col: number[] = [];
  readonly glow: number[] = [];
  private readonly c = new THREE.Color();

  /** A triangle. If `out` is given, it faces the way that points. `glow` is how much of the eyes' light and of the throat's it gives off. */
  tri(a: V3, b: V3, c: V3, color: number, out?: V3, glow: [number, number] = [0, 0]): void {
    let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
    let ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    let nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const l = Math.hypot(nx, ny, nz);
    if (l < 1e-12) return;
    nx /= l; ny /= l; nz /= l;
    let pts = [a, b, c];
    if (out && nx * out[0] + ny * out[1] + nz * out[2] < 0) { pts = [a, c, b]; nx = -nx; ny = -ny; nz = -nz; }
    this.c.set(color);
    for (const p of pts) {
      this.pos.push(p[0], p[1], p[2]);
      this.nor.push(nx, ny, nz);
      this.col.push(this.c.r, this.c.g, this.c.b);
      this.glow.push(glow[0], glow[1]);
    }
  }

  quad(a: V3, b: V3, c: V3, d: V3, color: number, out?: V3, glow?: [number, number]): void {
    this.tri(a, b, c, color, out, glow);
    this.tri(a, c, d, color, out, glow);
  }

  /** Skin between two rings of corners, one for one. Each face looks away from the line between the rings' middles. */
  loft(a: V3[], b: V3[], color: (i: number) => number, glow?: (i: number) => [number, number]): void {
    const mid = (r: V3[]): V3 => [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length, r.reduce((s, p) => s + p[2], 0) / r.length];
    const ma = mid(a), mb = mid(b), n = a.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const out: V3 = [(a[i][0] + a[j][0] + b[i][0] + b[j][0]) / 4 - (ma[0] + mb[0]) / 2, (a[i][1] + a[j][1] + b[i][1] + b[j][1]) / 4 - (ma[1] + mb[1]) / 2, (a[i][2] + a[j][2] + b[i][2] + b[j][2]) / 4 - (ma[2] + mb[2]) / 2];
      this.quad(a[i], a[j], b[j], b[i], color(i), out, glow?.(i));
    }
  }

  /** A flat end on a ring of corners, looking the way `out` points. */
  cap(ring: V3[], color: number, out: V3): void {
    for (let i = 1; i + 1 < ring.length; i++) this.tri(ring[0], ring[i], ring[i + 1], color, out);
  }

  /** A bar with six sides from a to b, as thick as `ra` at one end and `rb` at the other. `flat` makes it that much thinner one way than the other. */
  beam(a: V3, b: V3, ra: number, rb: number, color: number, flat = 1): void {
    const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l = Math.hypot(d[0], d[1], d[2]) || 1;
    // two directions across the bar: one level, and one at right angles to both
    let u: V3 = [-d[2], 0, d[0]];
    let ul = Math.hypot(u[0], u[2]);
    if (ul < 1e-6 * l) { u = [1, 0, 0]; ul = 1; }
    u = [u[0] / ul, 0, u[2] / ul];
    const v: V3 = [(d[1] * u[2]) / l, (d[2] * u[0] - d[0] * u[2]) / l, (-d[1] * u[0]) / l];
    const ring = (p: V3, r: number): V3[] => HEX.map(([su, sv]): V3 =>
      [p[0] + (u[0] * su + v[0] * sv * flat) * r, p[1] + v[1] * sv * flat * r, p[2] + (u[2] * su + v[2] * sv * flat) * r]);
    const ra6 = ring(a, ra), rb6 = ring(b, rb);
    this.loft(ra6, rb6, () => color);
    if (rb > 1e-5) this.cap(rb6, color, d);
  }
}

/** The corners of a slice, at `x` along the part: round the right side from the back to the keel, and up the left. */
function ring(x: number, s: Slice): V3[] {
  const r = s.w * 0.3;
  // the belly rounded through a corner on each side between the lower flank and the keel, and a low ridge along the
  // middle of the back; the flanks between, where the streak and the scars lie, are as they were
  return [
    [x, s.up, r], [x, s.up * 0.32, s.w], [x, -s.down * 0.5, s.w * 0.76], [x, -s.down * 0.86, s.w * 0.45], [x, -s.down, 0],
    [x, -s.down * 0.86, -s.w * 0.45], [x, -s.down * 0.5, -s.w * 0.76], [x, s.up * 0.32, -s.w], [x, s.up, -r], [x, s.up * 1.12, 0],
  ];
}
/** A thinner slice for the tail: six corners, at its widest a little above and below its middle. */
function tailRing(x: number, s: Slice): V3[] {
  return [[x, s.up, 0], [x, s.up * 0.4, s.w * 0.92], [x, -s.down * 0.4, s.w * 0.92], [x, -s.down, 0], [x, -s.down * 0.4, -s.w * 0.92], [x, s.up * 0.4, -s.w * 0.92]];
}

/** One joint of the neck or the body, from x0 to x1, with its plate on top, a streak along each flank, and its scars, if `seed` is given. */
function joint(k: DragonKind, m: Measures, x0: number, s0: Slice, x1: number, s1: Slice, plate: number, throat = 0, seed = -1): Shape {
  const b = new Shape();
  const a = ring(x0, s0), c = ring(x1, s1);
  // back and upper flanks in the body's colour, the keel lighter
  const glow = throat > 0 ? (i: number): [number, number] => [0, i >= 2 && i <= 5 ? throat : i === 1 || i === 6 ? throat * 0.35 : 0] : undefined;
  b.loft(a, c, (i) => (i >= 2 && i <= 5 ? k.belly : k.body), glow);
  for (const side of [1, -1]) {
    // the streak: a narrow band that stands a hair proud of the upper flank
    const at = (x: number, s: Slice, t: number): V3 => [x, s.up * (1 - 0.68 * t) + 0.0012, side * (s.w * (0.3 + 0.7 * t) + 0.0012)];
    b.quad(at(x0, s0, 0.52), at(x1, s1, 0.52), at(x1, s1, 0.68), at(x0, s0, 0.68), k.streak, [0, 0.5, side]);
  }
  if (plate > 0) {
    // a low triangle that leans back along the spine
    const front = Math.max(x0, x1), back = Math.min(x0, x1), len = front - back, top = Math.max(s0.up, s1.up);
    b.tri([front - len * 0.12, top, 0], [back + len * 0.08, top, 0], [back - len * 0.22, top + plate, 0], k.horn, [0, 0, 1]);
  }
  if (m.scars > 0 && seed >= 0) weals(b, k, x0, s0, x1, s1, m.scars, seed);
  return b;
}

/**
 * The head: a long narrow wedge, flat on top, with its horns and frill swept straight back. Its back is at the origin
 * and its nose along +x. It is made at the three's size; the Dragon stretches it to its kind's.
 */
function headShape(k: DragonKind, m: Measures): Shape {
  const b = new Shape();
  const skull = (x: number, top: number, w: number, low: number): V3[] =>
    [[x, top, w * 0.7], [x, top * 0.35, w], [x, low, w * 0.9], [x, low, -w * 0.9], [x, top * 0.35, -w], [x, top, -w * 0.7]];
  const back = skull(0, 0.027, 0.02, -0.008), brow = skull(0.04, 0.022, 0.0165, -0.008), mid = skull(0.068, 0.013, 0.0105, -0.007), nose = skull(0.1, 0.005, 0.0045, -0.005);
  b.loft(back, brow, () => k.body);
  b.loft(brow, mid, () => k.body);
  b.loft(mid, nose, () => k.body);
  b.cap(nose, k.body, [1, 0, 0]);
  b.cap(back, k.body, [-1, 0, 0]);
  // the roof of the mouth, which glows before fire
  b.quad([0.008, -0.0082, 0.016], [0.094, -0.0052, 0.0036], [0.094, -0.0052, -0.0036], [0.008, -0.0082, -0.016], k.mouth, [0, -1, 0], [0, 1]);
  for (const s of [1, -1]) {
    // a heavy brow, and a small eye set far back under it
    b.beam([0.004, 0.0295, s * 0.018], [0.05, 0.0205, s * 0.0138], 0.0056, 0.0024, k.body, 0.7);
    b.quad([0.02, 0.0095, s * 0.0206], [0.031, 0.0085, s * 0.0196], [0.031, 0.0145, s * 0.0196], [0.02, 0.016, s * 0.0206], k.eye, [0, 0, s], [1, 0]);
    // two horns from the brow, in line with the head, as long as its kind's
    const longer = (a: V3, e: V3): V3 => (m.horns === 1 ? e : [a[0] + (e[0] - a[0]) * m.horns, a[1] + (e[1] - a[1]) * m.horns, a[2] + (e[2] - a[2]) * m.horns]);
    const thick = Math.sqrt(m.horns);
    b.beam([0.006, 0.025, s * 0.013], longer([0.006, 0.025, s * 0.013], [-0.072, 0.04, s * 0.025]), 0.0068 * thick, 0.0009, k.horn);
    // a frill of three spikes behind the jaw
    for (let i = 0; i < 3; i++) {
      const y = 0.01 - i * 0.0095;
      b.beam([0.003, y, s * 0.0185], longer([0.003, y, s * 0.0185], [-0.046 + i * 0.008, y - 0.0015 - i * 0.002, s * (0.03 - i * 0.002)]), (0.0046 - i * 0.0006) * thick, 0.0007, k.horn);
    }
    if (m.fangs > 0) {
      // Teeth that show below the upper jaw, the longest at the front, set along the jaw's edge and raked a little
      // forward: as the skulls in the Red Keep's cellar show them, black.
      for (const [x, len] of [[0.088, 1], [0.074, 0.82], [0.058, 0.62], [0.043, 0.45]]) {
        const [ey, ez] = jawEdge(x), long = m.fangs * HEAD * len;
        b.beam([x, ey + 0.001, s * ez * 0.92], [x + long * 0.18, ey - long, s * ez * 0.8], 0.0024 * Math.min(1.6, 0.6 + m.fangs * 2.5), 0.0003, k.tooth ?? k.claw);
      }
    }
  }
  // the first plate of the spine, on the crown
  b.tri([0.016, 0.027, 0], [-0.002, 0.027, 0], [-0.028, m.crest === 1 ? 0.041 : 0.027 + 0.014 * m.crest, 0], k.horn, [0, 0, 1]);
  return b;
}

/** Where the outer edge of the upper jaw runs, along the head: how low it is and how far out, at a share `x` of the length. */
function jawEdge(x: number): [number, number] {
  const at = [[0, -0.008, 0.018], [0.04, -0.008, 0.01485], [0.068, -0.007, 0.00945], [0.1, -0.005, 0.00405]];
  for (let i = 0; i + 1 < at.length; i++) {
    const [x0, y0, z0] = at[i], [x1, y1, z1] = at[i + 1];
    if (x <= x1) { const t = (x - x0) / (x1 - x0); return [y0 + (y1 - y0) * t, z0 + (z1 - z0) * t]; }
  }
  return [-0.005, 0.00405];
}

/** The lower jaw: a thin wedge, hinged at the origin, with its tip along +x. Made at the three's size, as the head is. */
function jawShape(k: DragonKind): Shape {
  const b = new Shape();
  const at = (x: number, w: number, top: number, low: number): V3[] => [[x, top, w], [x, low, w * 0.8], [x, low, -w * 0.8], [x, top, -w]];
  const back = at(0, 0.017, 0, -0.013), tip = at(0.086, 0.0034, 0.0006, -0.0028);
  b.loft(back, tip, (i) => (i === 3 ? k.mouth : i === 1 ? k.belly : k.body), (i) => [0, i === 3 ? 1 : 0]);
  b.cap(tip, k.body, [1, 0, 0]);
  b.cap(back, k.body, [-1, 0, 0]);
  return b;
}

/** One joint of the tail, from the origin back along -x. The last one carries the fin: a flat spade set upright. */
function tailShape(k: DragonKind, m: Measures, j: number): Shape {
  const b = new Shape(), TL = m.tailL, f = m.fin;
  const s0 = tailSlice(m, j), s1 = tailSlice(m, j + 1);
  b.loft(tailRing(0, s0), tailRing(-TL, s1), (i) => (i === 2 || i === 3 ? k.belly : k.body));
  const plate = 0.026 * (1 - j / TAIL) ** 1.3 * m.crest;
  if (j < TAIL - 2) b.tri([-TL * 0.1, s0.up, 0], [-TL * 0.9, s1.up, 0], [-TL * 1.15, s1.up + plate, 0], k.horn, [0, 0, 1]);
  if (j === TAIL - 1) {
    // the fin: a spade set upright, which swings like a rudder
    const x = -TL * 0.05;
    b.tri([x, 0, 0], [x - 0.024 * f, 0.026 * f, 0], [x - 0.07 * f, 0, 0], k.horn, [0, 0, 1]);
    b.tri([x, 0, 0], [x - 0.07 * f, 0, 0], [x - 0.024 * f, -0.026 * f, 0], k.horn, [0, 0, 1]);
  }
  return b;
}

/** A bone of the wing or the leg: from the origin along +x. */
function boneShape(color: number, length: number, r0: number, r1: number, flat = 1): Shape {
  const b = new Shape();
  b.beam([0, 0, 0], [length, 0, 0], r0, r1, color, flat);
  return b;
}

/**
 * The hand at the wrist of a wing: a heel that takes its weight, and three
 * hooked claws, the inner one the longest. Its claws point along +x and its
 * back is +y. In the air they point forward off the wing's leading edge; on
 * the ground it stands on them.
 */
function handShape(k: DragonKind, side: number): Shape {
  const b = new Shape();
  b.beam([-0.013, 0, 0], [0.012, 0, 0], 0.0105, 0.0085, k.bone, 0.75);
  // where each claw leaves the hand, how long it is and how thick
  const claws: [number, number, number][] = [[-side * 0.012, 0.06, 0.0072], [0, 0.048, 0.006], [side * 0.012, 0.04, 0.005]];
  for (const [z, len, r] of claws) {
    const knuckle: V3 = [0.008 + len * 0.58, 0.007, z * 1.9], tip: V3 = [0.008 + len, -0.008, z * 2.5];
    b.beam([0.006, 0.001, z], knuckle, r, r * 0.66, k.claw);
    b.beam(knuckle, tip, r * 0.66, 0.0006, k.claw);
  }
  return b;
}

/** A foot: three claws forward and one back, from the origin along +x. */
function footShape(k: DragonKind): Shape {
  const b = new Shape();
  b.beam([0, 0, 0], [FOOT, 0, 0], 0.008, 0.0066, k.body, 0.7);
  for (const z of [-0.011, 0, 0.011]) b.beam([FOOT * 0.8, 0, z * 0.5], [FOOT + 0.026, -0.005, z], 0.0044, 0.0006, k.claw);
  b.beam([0.002, 0, 0], [-0.018, -0.005, 0], 0.004, 0.0006, k.claw);
  return b;
}

// ---------------------------------------------------------------------------
// The pose
// ---------------------------------------------------------------------------

/** How one wing is held. Angles are in radians. */
export interface WingPose {
  /** How far the arm is swept back from straight out. */
  sweep: number;
  /** How far the whole wing is raised above level, at the shoulder. */
  lift: number;
  /** How far the first finger is swept back from straight out. */
  hand: number;
  /** How wide the fingers fan: 1 is wide open. */
  fan: number;
  /** How far the hand is raised above the arm: tips up, or down on an upstroke. */
  tip: number;
}

/** Everything that places a dragon and sets its joints, for one frame. */
export interface Pose {
  /** Where the root of its neck is, and how its body is turned: +x is forward, +y its back, +z its right side. */
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  /** How fast it flies, which says how far its tail trails behind its turns. */
  speed: number;
  /** The clock, for the memory its tail keeps of where its body pointed. */
  time: number;
  /** How far its head is turned to its right and raised, shared out along its neck. */
  neckYaw: number;
  neckPitch: number;
  /** How far its neck is drawn up into an S: 0 in fast flight, 1 when it sits. */
  arch: number;
  right: WingPose;
  left: WingPose;
  /** How far its jaws are open, from 0 to 1. */
  jaw: number;
  /** How far its legs are down, from 0 (folded flat) to 1 (standing). */
  legs: number;
  /** How far its tail fin swings to its right. */
  fin: number;
  /** How much it sits rather than flies: its tail is laid out behind it. */
  sit: number;
  /** How far it is down on the claws of its wings: 0 while its wings are wings, 1 when it stands braced on them. */
  brace: number;
  /** How high what it stands on is: where its feet and its wing claws come down. */
  floor: number;
}

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const EULER = new THREE.Euler();
const turn = (yawRight: number, pitchUp: number, out: THREE.Quaternion): THREE.Quaternion => out.setFromEuler(EULER.set(0, -yawRight, pitchUp, 'YZX'));

interface Part { start: number; count: number; pos: Float32Array; nor: Float32Array; at: THREE.Vector3; q: THREE.Quaternion }

/**
 * Which of its kind's two shades each triangle of a wing's skin takes, in the order `skin` draws them: four triangles
 * to each panel between two tips, so that its trailing edge hangs in a curve, one shade to each panel between two
 * fingers, and the other to the panels by the arm and the body.
 */
const SKIN_SHADES = [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1];
/** How many triangles a wing's skin takes. */
const SKIN_TRIS = SKIN_SHADES.length;

/** The material the dragons are drawn in: the city's cel shading, both sides of every face, no snow, and light of their own in the eyes and the throat. */
export function dragonMaterial(look: TileLook): { mat: THREE.MeshToonMaterial; eye: THREE.Color; throat: THREE.Color; lit: THREE.Color } {
  const eye = new THREE.Color(0, 0, 0), throat = new THREE.Color(0, 0, 0), lit = new THREE.Color(0, 0, 0);
  const mat = toon({ side: THREE.DoubleSide });
  patch(mat, 'winged-dragon', look, {
    uniforms: { uEye: { value: eye }, uThroat: { value: throat }, uLit: { value: lit } },
    vertPars: /* glsl */ `
      attribute vec2 aGlow;
      varying vec2 vGlow;
    `,
    vertBegin: /* glsl */ `
      vGlow = aGlow;
    `,
    fragPars: /* glsl */ `
      varying vec2 vGlow;
      uniform vec3 uEye;
      uniform vec3 uThroat;
      uniform vec3 uLit;
    `,
    fragEmissive: /* glsl */ `
      // by night it is a dark shape that the land below just lights; its eyes and its throat give light of their own
      totalEmissiveRadiance += diffuseColor.rgb * (0.5 * uNight + uLit);
      totalEmissiveRadiance += uEye * vGlow.x + uThroat * vGlow.y;
    `,
  });
  return { mat, eye, throat, lit };
}

export class Dragon {
  readonly kind: DragonKind;
  readonly mesh: THREE.Mesh;
  /** The flat shape it throws on the ground: its wings and the line of its body. */
  readonly shadow: THREE.Mesh;
  readonly shadowMat: THREE.MeshBasicMaterial;
  /** Its eyes, its throat, and the light its own fire throws on it. */
  readonly eye: THREE.Color;
  readonly throat: THREE.Color;
  readonly lit: THREE.Color;
  /** Where its jaws are and which way they point, for its fire. Set by `pose`. */
  readonly mouth = new THREE.Vector3();
  readonly mouthDir = new THREE.Vector3();
  /** Its two wing tips, for the trails they leave. Set by `pose`. */
  readonly tips = [new THREE.Vector3(), new THREE.Vector3()];
  /** Its nose and the tip of its tail. Set by `pose`. */
  readonly nose = new THREE.Vector3();
  readonly tailTip = new THREE.Vector3();

  /** Every measure of its build, from its kind's shape. */
  readonly measures: Measures;
  private readonly L: number;
  /** How its tail sways and how its neck snakes, from its kind's manner of flight. */
  private readonly sway: number;
  private readonly swayRate: number;
  private readonly snake: number;
  private readonly parts: Part[] = [];
  private readonly position: THREE.BufferAttribute;
  private readonly normal: THREE.BufferAttribute;
  private readonly skinStart: number;
  private readonly shadowPos: THREE.BufferAttribute;

  private readonly head: Part;
  private readonly jaw: Part;
  private readonly neck: Part[] = [];
  private readonly body: Part[] = [];
  private readonly tail: Part[] = [];
  private readonly upper: Part[] = [];
  private readonly fore: Part[] = [];
  private readonly hand: Part[] = [];
  private readonly finger: Part[][] = [[], []];
  private readonly thigh: Part[] = [];
  private readonly shin: Part[] = [];
  private readonly foot: Part[] = [];

  /** Where its body pointed a little while ago: the tail follows that. */
  private readonly memory: { t: number; q: THREE.Quaternion }[] = [];

  constructor(kind: DragonKind, look: TileLook) {
    this.kind = kind;
    this.L = kind.length;
    const m = (this.measures = kind.shape ? measure(kind.shape) : LEAN);
    this.sway = kind.flight.sway ?? 1;
    this.swayRate = kind.flight.swayRate ?? 1;
    this.snake = kind.flight.snake ?? 0;
    const pos: number[] = [], col: number[] = [], glow: number[] = [];
    const add = (s: Shape): Part => {
      const start = pos.length / 3, count = s.pos.length / 3;
      const p: Part = { start, count, pos: new Float32Array(s.pos.map((v) => v * this.L)), nor: new Float32Array(s.nor), at: new THREE.Vector3(), q: new THREE.Quaternion() };
      for (let i = 0; i < s.pos.length; i++) pos.push(0);
      col.push(...s.col);
      glow.push(...s.glow);
      this.parts.push(p);
      return p;
    };

    this.head = add(stretch(headShape(kind, m), m.hx, m.hy, m.hy));
    this.jaw = add(stretch(jawShape(kind), m.hx, m.hy, m.hy));
    // the neck, from the chest forward: each joint from its own origin along +x
    for (let j = 0; j < NECK; j++) this.neck.push(add(joint(kind, m, 0, neckSlice(m, j), m.neckL, neckSlice(m, j + 1), (0.014 + 0.014 * (1 - j / NECK)) * m.crest, j >= 1 ? (j - 0.5) / NECK : 0, 10 + j)));
    // the body, from the chest back: each joint from its own origin along -x, the plates tallest over the shoulders
    for (let j = 0; j < BODY; j++) this.body.push(add(joint(kind, m, 0, m.slices[j], -m.bodyL, m.slices[j + 1], [0.038, 0.032, 0.027][j] * m.crest, 0, 20 + j)));
    for (let j = 0; j < TAIL; j++) this.tail.push(add(tailShape(kind, m, j)));
    for (const side of [1, -1]) {
      const w = side > 0 ? 0 : 1;
      this.upper.push(add(boneShape(kind.bone, m.upper, 0.0155, 0.0125, 0.8)));
      this.fore.push(add(boneShape(kind.bone, m.fore, 0.0125, 0.009, 0.8)));
      this.hand.push(add(handShape(kind, side)));
      m.fingers.forEach((len, i) => this.finger[w].push(add(boneShape(kind.bone, len, 0.0072 - i * 0.0007, 0.0014, 0.75))));
      this.thigh.push(add(boneShape(kind.body, THIGH, 0.019 * m.bulk, 0.012 * m.bulk, 0.75)));
      this.shin.push(add(boneShape(kind.body, SHIN, 0.011 * m.bulk, 0.0075 * m.bulk, 0.8)));
      this.foot.push(add(footShape(kind)));
    }

    // the wings' skin comes last: its corners are set on every frame
    this.skinStart = pos.length / 3;
    const c = new THREE.Color();
    for (let w = 0; w < 2; w++) {
      for (let t = 0; t < SKIN_TRIS; t++) {
        c.set(kind.skin[SKIN_SHADES[t] ?? 0]);
        for (let v = 0; v < 3; v++) { pos.push(0, 0, 0); col.push(c.r, c.g, c.b); glow.push(0, 0); }
      }
    }

    const geo = new THREE.BufferGeometry();
    this.position = new THREE.BufferAttribute(new Float32Array(pos.length), 3);
    this.normal = new THREE.BufferAttribute(new Float32Array(pos.length), 3);
    this.position.setUsage(THREE.DynamicDrawUsage);
    this.normal.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.position);
    geo.setAttribute('normal', this.normal);
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
    geo.setAttribute('aGlow', new THREE.BufferAttribute(new Float32Array(glow), 2));
    const material = dragonMaterial(look);
    this.eye = material.eye; this.throat = material.throat; this.lit = material.lit;
    this.mesh = new THREE.Mesh(geo, material.mat);
    this.mesh.name = `dragon-${kind.name}`;
    this.mesh.frustumCulled = false;

    // the shadow: both wings' skin again, laid flat, and a strip for the body
    const sgeo = new THREE.BufferGeometry();
    this.shadowPos = new THREE.BufferAttribute(new Float32Array((SKIN_TRIS * 2 + 4) * 9), 3);
    this.shadowPos.setUsage(THREE.DynamicDrawUsage);
    sgeo.setAttribute('position', this.shadowPos);
    this.shadowMat = new THREE.MeshBasicMaterial({ color: 0x05060a, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.shadow = new THREE.Mesh(sgeo, this.shadowMat);
    // one name for all three: where two dragons' shadows cross they only darken, and the check for surfaces that
    // fight in one plane takes two of one name and one colour for one
    this.shadow.name = 'dragon-shadow';
    this.shadow.frustumCulled = false;
    this.shadow.renderOrder = 2;
    this.shadow.layers.set(1); // kept out of the mirror image, as the shadows under vehicles are
  }

  get triangles(): number {
    return this.position.count / 3;
  }

  // scratch, so that a frame makes nothing new
  private readonly q1 = new THREE.Quaternion();
  private readonly q2 = new THREE.Quaternion();
  private readonly q3 = new THREE.Quaternion();
  private readonly qYaw = new THREE.Quaternion();
  private readonly s = Array.from({ length: 16 }, () => new THREE.Vector3());
  private readonly v1 = new THREE.Vector3();
  private readonly v2 = new THREE.Vector3();
  private readonly v3 = new THREE.Vector3();
  private readonly at = new THREE.Vector3();
  private readonly m3 = new THREE.Matrix4();
  private readonly joints = Array.from({ length: 12 }, () => new THREE.Vector3());

  /** Where its body pointed `ago` seconds back. */
  private remembered(time: number, ago: number, out: THREE.Quaternion): THREE.Quaternion {
    const want = time - ago, mem = this.memory;
    for (let i = mem.length - 1; i > 0; i--) {
      if (mem[i - 1].t <= want) {
        const span = mem[i].t - mem[i - 1].t;
        return out.copy(mem[i - 1].q).slerp(mem[i].q, span > 1e-6 ? (want - mem[i - 1].t) / span : 1);
      }
    }
    return out.copy(mem[0].q);
  }

  /**
   * Sets every joint, and writes the mesh. `ground` says how high the ground
   * is under a place, for the shadow.
   */
  pose(p: Pose, ground: (x: number, z: number) => number): void {
    const L = this.L, m = this.measures, { q1, q2, v1, v2, at } = this;

    // --- what the tail remembers ---
    const mem = this.memory;
    if (mem.length > 0 && p.time < mem[mem.length - 1].t) mem.length = 0; // the clock was set back
    if (mem.length === 0 || p.time - mem[mem.length - 1].t > 1e-4) mem.push({ t: p.time, q: p.quat.clone() });
    else mem[mem.length - 1].q.copy(p.quat);
    while (mem.length > 2 && mem[1].t < p.time - 1.2) mem.shift();

    // --- its heading, for when it stands: forward and to its right along the ground ---
    const fwd = this.s[12].copy(X).applyQuaternion(p.quat), zb = this.s[13].copy(Z).applyQuaternion(p.quat);
    const hf = this.s[14].set(fwd.x, 0, fwd.z);
    if (hf.lengthSq() < 1e-6) hf.set(1, 0, 0);
    hf.normalize();
    const hr = this.s[15].set(-hf.z, 0, hf.x);
    this.qYaw.setFromAxisAngle(Y, -Math.atan2(hf.z, hf.x));

    // --- the body: rigid, from the root of the neck back ---
    at.copy(p.pos);
    v1.copy(X).applyQuaternion(p.quat);
    for (let j = 0; j < BODY; j++) {
      this.body[j].at.copy(at);
      this.body[j].q.copy(p.quat);
      at.addScaledVector(v1, -m.bodyL * L);
    }

    // --- the tail: each joint points the way the body did when it was there ---
    const lag = Math.min(0.055, (m.tailL * L) / Math.max(p.speed, 10));
    // when it sits, how steeply the tail must run down from the hips to lie on the ground
    const lay = p.sit > 0 ? THREE.MathUtils.clamp(((at.y - p.floor) / L - 0.012) / 0.078, 0, 1.7) : 0;
    // how high the end of each joint lies over level ground as the tail is laid out, and how steeply the joint before it runs down
    let over = at.y - p.floor, before = Math.asin(THREE.MathUtils.clamp(fwd.y, -1, 1));
    const len = m.tailL * L;
    for (let j = 0; j < TAIL; j++) {
      this.remembered(p.time, lag * (j + 1) * (1 - p.sit), q1);
      // the last few joints swing with the fin, into the turn
      if (j >= TAIL - 4) q1.multiply(turn(p.fin * ((j - (TAIL - 5)) / 4), 0, q2));
      // and the whole tail sways as it flies: a slow wave that runs down it and grows towards its tip, each dragon's in its own time
      if (p.sit < 1) q1.multiply(turn((1 - p.sit) * (0.012 + 0.011 * j) * this.sway * Math.sin(p.time * 1.9 * this.swayRate - j * 0.6 + L), 0, q2));
      // laid out behind it when it sits: down to the ground, then along it, curling to one side
      if (p.sit > 0) {
        let pitch = LAY[j] * lay;
        over -= len * Math.sin(pitch);
        // Where the ground falls away behind it, as on a rim, the tail hangs down over the edge and lies on
        // the slope below: each joint runs down until its end is as far over the ground as it would be over level ground.
        v2.copy(X).applyQuaternion(this.q3.copy(this.qYaw).multiply(turn(CURL[j], 0, q2)));
        const bx = v2.x, bz = v2.z, ax = at.x, ay = at.y, az = at.z;
        const clear = (a: number): number => ay - len * Math.sin(a) - ground(ax - bx * len * Math.cos(a), az - bz * len * Math.cos(a));
        if (clear(pitch) > over + 0.03 * L) {
          let lo = pitch, hi = Math.min(before + 0.8, 1.45);
          if (clear(hi) < over) {
            for (let n = 0; n < 6; n++) {
              const mid = (lo + hi) / 2;
              if (clear(mid) > over) lo = mid;
              else hi = mid;
            }
          }
          pitch = hi;
        }
        before = pitch;
        q1.slerp(this.q3.copy(this.qYaw).multiply(turn(CURL[j], pitch, q2)), p.sit);
      }
      this.tail[j].at.copy(at);
      this.tail[j].q.copy(q1);
      at.addScaledVector(v2.copy(X).applyQuaternion(q1), -len);
    }
    this.tailTip.copy(at);

    // --- the neck and the head: forward from the chest ---
    at.copy(p.pos);
    q1.copy(p.quat);
    // when it sits its shoulders are high, and its neck runs forward and down from them: the head hangs low and looks out level
    const S = [-0.1, -0.25, -0.3, -0.1, 0.15];
    for (let j = 0; j < NECK; j++) {
      // a neck that snakes: a slow wave from side to side that runs out along it, larger towards the head
      const yaw = this.snake > 0 ? p.neckYaw / (NECK + 1) + this.snake * (1 - p.sit) * (0.05 + 0.025 * j) * Math.sin(p.time * 1.7 - j * 1.05 + L) : p.neckYaw / (NECK + 1);
      q1.multiply(turn(yaw, p.neckPitch / (NECK + 1) + p.arch * S[j], q2));
      this.neck[j].at.copy(at);
      this.neck[j].q.copy(q1);
      at.addScaledVector(v2.copy(X).applyQuaternion(q1), m.neckL * L);
    }
    q1.multiply(turn(p.neckYaw / (NECK + 1), p.neckPitch / (NECK + 1) + p.arch * 0.25, q2));
    this.head.at.copy(at);
    this.head.q.copy(q1);
    v2.copy(X).applyQuaternion(q1);
    this.mouthDir.copy(v2);
    this.nose.copy(at).addScaledVector(v2, m.head * L);
    this.mouth.copy(at).addScaledVector(v2, 0.09 * m.hx * L).addScaledVector(this.v3.copy(Y).applyQuaternion(q1), -0.008 * m.hy * L);
    // the jaw hangs from the back of the skull, and drops open
    this.jaw.at.copy(at).addScaledVector(v2, 0.008 * m.hx * L).addScaledVector(this.v3, -0.0084 * m.hy * L);
    this.jaw.q.copy(q1).multiply(turn(0, -0.34 * p.jaw, q2));

    // --- the wings ---
    const pts = this.joints; // per wing: shoulder, elbow, wrist, four tips, flank; then the leg: hip, knee, ankle
    const [aW, uW, backW, upW, target, pole, bentAt, reachTo, d, dB, upB, hint] = this.s;
    const b = p.brace * p.brace * (3 - 2 * p.brace);
    for (let w = 0; w < 2; w++) {
      const side = w === 0 ? 1 : -1, wp = w === 0 ? p.right : p.left;
      const shoulder = pts[0].set(m.shoulder[0] * L, m.shoulder[1] * L, m.shoulder[2] * L * side).applyQuaternion(p.quat).add(p.pos);
      // As a wing. The arm: swept back and raised, in the body's own frame.
      aW.set(-Math.sin(wp.sweep) * Math.cos(wp.lift), Math.sin(wp.lift), side * Math.cos(wp.sweep) * Math.cos(wp.lift));
      // The hand: its first finger, and the way back along the wing from it.
      const rise = wp.lift + wp.tip;
      uW.set(-Math.sin(wp.hand) * Math.cos(rise), Math.sin(rise), side * Math.cos(wp.hand) * Math.cos(rise));
      backW.set(-1, 0, 0).addScaledVector(uW, uW.x).normalize(); // straight back, less what lies along the finger
      // what is up for the wing: at right angles to the finger and to the way back
      upW.crossVectors(backW, uW).multiplyScalar(side).normalize();
      // all of it turned into the world
      aW.applyQuaternion(p.quat);
      uW.applyQuaternion(p.quat);
      backW.applyQuaternion(p.quat);
      upW.applyQuaternion(p.quat);

      // Braced on the ground: the wrist comes down ahead of the chest and wide of it, and the elbow stands up and out.
      let upperDir = aW, foreDir = aW;
      if (b > 0) {
        target.copy(p.pos).addScaledVector(hf, WRIST_AT[0] * L).addScaledVector(hr, side * WRIST_AT[1] * L);
        target.y = p.floor + 0.009 * L;
        pole.copy(Y).addScaledVector(hf, -0.6).addScaledVector(hr, side * 0.5);
        bend(shoulder, target, m.upper * L, m.fore * L, pole, bentAt, reachTo);
        // the way each bone points, part of the way from the wing's to these
        reachTo.sub(bentAt).normalize();
        bentAt.sub(shoulder).normalize();
        upperDir = towards(aW, bentAt, b, bentAt);
        foreDir = towards(aW, reachTo, b, reachTo);
        upW.lerp(upB.copy(Y).addScaledVector(hr, side * 0.7).normalize(), b).normalize();
      }
      const elbow = pts[1].copy(shoulder).addScaledVector(upperDir, m.upper * L);
      const wrist = pts[2].copy(elbow).addScaledVector(foreDir, m.fore * L);
      this.place(this.upper[w], shoulder, upperDir, upW);
      this.place(this.fore[w], elbow, foreDir, upW);
      for (let i = 0; i < 4; i++) {
        const ang = m.fan[i] * wp.fan;
        d.copy(uW).multiplyScalar(Math.cos(ang)).addScaledVector(backW, Math.sin(ang));
        if (b > 0) {
          // folded: back along the flank from the wrist, rising towards the tail and leaning in over the back
          dB.copy(hf).multiplyScalar(-Math.cos(FOLD_RISE[i])).addScaledVector(Y, Math.sin(FOLD_RISE[i])).addScaledVector(hr, side * FOLD_IN[i]).normalize();
          d.copy(towards(d, dB, b, dB));
        }
        this.place(this.finger[w][i], wrist, d, upW);
        pts[3 + i].copy(wrist).addScaledVector(d, m.fingers[i] * L);
      }
      // the hand: its claws forward off the wing's leading edge in the air, and set down on the ground turned a little out
      this.bx.copy(fwd);
      this.bz.crossVectors(this.bx, upW).normalize();
      this.by.crossVectors(this.bz, this.bx);
      q1.setFromRotationMatrix(this.m3.makeBasis(this.bx, this.by, this.bz));
      if (b > 0) {
        this.bx.copy(hf).multiplyScalar(Math.cos(0.4)).addScaledVector(hr, side * Math.sin(0.4));
        this.bz.crossVectors(this.bx, Y);
        q1.slerp(q2.setFromRotationMatrix(this.m3.makeBasis(this.bx, Y, this.bz)), b);
      }
      this.hand[w].at.copy(wrist);
      this.hand[w].q.copy(q1);
      const flank = pts[7].set(m.flank[0] * L, m.flank[1] * L, m.flank[2] * L * side).applyQuaternion(p.quat).add(p.pos);
      this.tips[w].copy(pts[3]);
      this.skin(w, shoulder, elbow, wrist, pts[3], pts[4], pts[5], pts[6], flank, upW, ground);

      // --- the leg on this side ---
      const hip = pts[8].set(m.hip[0] * L, m.hip[1] * L, m.hip[2] * L * side).applyQuaternion(p.quat).add(p.pos);
      // Folded: the thigh lies back along the belly, the shin doubles forward under it and the foot back again.
      // Each bone is turned from the one before it, in a frame that looks back along the body.
      q1.copy(p.quat).multiply(turn(Math.PI - side * 0.06, 0, q2)).multiply(turn(0, -0.12, q2));
      const thighDir = aW.copy(X).applyQuaternion(q1);
      q1.multiply(turn(0, -2.9, q2));
      const shinDir = uW.copy(X).applyQuaternion(q1);
      q1.multiply(turn(0, 2.8, q2));
      const footDir = backW.copy(X).applyQuaternion(q1);
      const footUp = hint.crossVectors(footDir, zb);
      const g = p.legs * p.legs * (3 - 2 * p.legs);
      if (g > 0) {
        // Down: the foot reaches for the ground under the hip, the knee forward and out. While the ground is
        // still out of reach the leg hangs towards it with its claws down, and they come level as they touch.
        target.copy(p.pos).addScaledVector(hf, FOOT_AT[0] * L).addScaledVector(hr, side * FOOT_AT[1] * L);
        target.y = p.floor + 0.009 * L;
        const short = THREE.MathUtils.clamp((hip.distanceTo(target) - (THIGH + SHIN) * L * 0.985) / (0.08 * L), 0, 1);
        pole.copy(hf).addScaledVector(hr, side * 0.5).addScaledVector(Y, 0.25);
        bend(hip, target, THIGH * L, SHIN * L, pole, bentAt, reachTo);
        reachTo.sub(bentAt).normalize();
        bentAt.sub(hip).normalize();
        thighDir.copy(towards(thighDir, bentAt, g, bentAt));
        shinDir.copy(towards(shinDir, reachTo, g, reachTo));
        dB.copy(hf).multiplyScalar(Math.cos(0.22)).addScaledVector(hr, side * Math.sin(0.22)).multiplyScalar(Math.cos(0.9 * short)).addScaledVector(Y, -Math.sin(0.9 * short));
        footDir.copy(towards(footDir, dB, g, dB));
        footUp.copy(towards(footUp, upB.copy(Y), g, upB));
      }
      const knee = pts[9].copy(hip).addScaledVector(thighDir, THIGH * L);
      const ankle = pts[10].copy(knee).addScaledVector(shinDir, SHIN * L);
      this.place(this.thigh[w], hip, thighDir, d.crossVectors(thighDir, zb));
      this.place(this.shin[w], knee, shinDir, d.crossVectors(shinDir, zb));
      this.place(this.foot[w], ankle, footDir, footUp);
    }

    // --- every rigid part, turned and moved into the mesh ---
    const out = this.position.array as Float32Array, nout = this.normal.array as Float32Array;
    for (const part of this.parts) {
      const e = this.m3.makeRotationFromQuaternion(part.q).elements;
      const ox = part.at.x, oy = part.at.y, oz = part.at.z;
      const src = part.pos, nsrc = part.nor;
      let o = part.start * 3;
      for (let i = 0; i < part.count * 3; i += 3, o += 3) {
        const x = src[i], y = src[i + 1], z = src[i + 2];
        out[o] = ox + e[0] * x + e[4] * y + e[8] * z;
        out[o + 1] = oy + e[1] * x + e[5] * y + e[9] * z;
        out[o + 2] = oz + e[2] * x + e[6] * y + e[10] * z;
        const nx = nsrc[i], ny = nsrc[i + 1], nz = nsrc[i + 2];
        nout[o] = e[0] * nx + e[4] * ny + e[8] * nz;
        nout[o + 1] = e[1] * nx + e[5] * ny + e[9] * nz;
        nout[o + 2] = e[2] * nx + e[6] * ny + e[10] * nz;
      }
    }
    this.position.needsUpdate = true;
    this.normal.needsUpdate = true;

    // --- the body's part of the shadow: a thin strip from nose to tail ---
    const sp = this.shadowPos.array as Float32Array;
    let o = SKIN_TRIS * 2 * 9;
    const strip = (a: THREE.Vector3, b: THREE.Vector3, wa: number, wb: number): void => {
      const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, px = (-dz / l), pz = dx / l;
      const c: [number, number][] = [[a.x + px * wa, a.z + pz * wa], [a.x - px * wa, a.z - pz * wa], [b.x - px * wb, b.z - pz * wb], [b.x + px * wb, b.z + pz * wb]];
      for (const i of [0, 1, 2, 0, 2, 3]) { sp[o++] = c[i][0]; sp[o++] = ground(c[i][0], c[i][1]) + 0.07; sp[o++] = c[i][1]; }
    };
    strip(this.nose, p.pos, 0.006 * L, 0.02 * L);
    strip(p.pos, this.tailTip, 0.02 * L, 0.003 * L);
    this.shadowPos.needsUpdate = true;
  }

  private readonly q1v = new THREE.Vector3();
  private readonly bx = new THREE.Vector3();
  private readonly by = new THREE.Vector3();
  private readonly bz = new THREE.Vector3();

  /** Sets a bone at a place, with its length along `dir` and its top along `up`. */
  private place(part: Part, at: THREE.Vector3, dir: THREE.Vector3, up: THREE.Vector3): void {
    this.bx.copy(dir).normalize();
    this.bz.crossVectors(this.bx, up).normalize();
    this.by.crossVectors(this.bz, this.bx);
    part.q.setFromRotationMatrix(this.m3.makeBasis(this.bx, this.by, this.bz));
    part.at.copy(at);
  }

  private readonly e1 = new THREE.Vector3();
  private readonly e2 = new THREE.Vector3();
  private readonly nn = new THREE.Vector3();
  private readonly mids = Array.from({ length: 12 }, () => new THREE.Vector3());

  /** The skin of one wing: drawn taut between the shoulder, the elbow, the wrist, the finger tips and the flank, its trailing edge hanging in a curve between tips. */
  private skin(w: number, shoulder: THREE.Vector3, elbow: THREE.Vector3, wrist: THREE.Vector3, t1: THREE.Vector3, t2: THREE.Vector3, t3: THREE.Vector3, t4: THREE.Vector3, flank: THREE.Vector3, up: THREE.Vector3, ground: (x: number, z: number) => number): void {
    const out = this.position.array as Float32Array, nout = this.normal.array as Float32Array, sp = this.shadowPos.array as Float32Array;
    let o = (this.skinStart + w * SKIN_TRIS * 3) * 3, so = w * SKIN_TRIS * 9;
    const { e1, e2, nn, mids } = this;
    // each trailing edge hangs in a curve between the tips it joins, drawn in towards where it is hung from, deepest in
    // its middle, and torn deeper, and unevenly, where its kind's wings are ragged: three places along it, from `at`
    const r = this.measures.ragged;
    const scallop = (a: THREE.Vector3, b: THREE.Vector3, from: THREE.Vector3, at: number, tear: number): void => {
      const depth = 0.1 + r * tear;
      for (let i = 0; i < 3; i++) {
        const s = (i + 1) / 4;
        mids[at + i].lerpVectors(a, b, s).lerp(from, depth * 4 * s * (1 - s));
      }
    };
    scallop(t1, t2, wrist, 0, 0.2);
    scallop(t2, t3, wrist, 3, 0.34);
    scallop(t3, t4, wrist, 6, 0.14);
    scallop(t4, flank, shoulder, 9, 0.26);
    const tri = (a: THREE.Vector3, b0: THREE.Vector3, c0: THREE.Vector3): void => {
      let b = b0, c = c0;
      nn.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)).normalize();
      // its front is the wing's back: the corners are given the way round that makes it so
      if (nn.dot(up) < 0) { nn.negate(); b = c0; c = b0; }
      for (const v of [a, b, c]) {
        out[o] = v.x; out[o + 1] = v.y; out[o + 2] = v.z;
        nout[o] = nn.x; nout[o + 1] = nn.y; nout[o + 2] = nn.z;
        o += 3;
        sp[so++] = v.x; sp[so++] = ground(v.x, v.z) + 0.07; sp[so++] = v.z;
      }
    };
    /** A panel from a hub out to its curved edge between two tips, in four triangles. */
    const panel = (hub: THREE.Vector3, a: THREE.Vector3, at: number, b: THREE.Vector3): void => {
      tri(hub, a, mids[at]);
      tri(hub, mids[at], mids[at + 1]);
      tri(hub, mids[at + 1], mids[at + 2]);
      tri(hub, mids[at + 2], b);
    };
    panel(wrist, t1, 0, t2);
    panel(wrist, t2, 3, t3);
    panel(wrist, t3, 6, t4);
    tri(shoulder, elbow, t4);
    tri(elbow, wrist, t4);
    panel(shoulder, t4, 9, flank);
  }
}

// ---------------------------------------------------------------------------
// The shapes a wing takes
// ---------------------------------------------------------------------------

/** A wing's shape by what it is doing: how far the arm is swept, what share of the full span it shows, how it is raised and how wide the hand is. */
interface WingForm { sweep: number; span: number; lift: number; fan: number; tip: number }
const SPREAD: WingForm = { sweep: 5 * RAD, span: 1, lift: 7 * RAD, fan: 1, tip: 5 * RAD };
const CRUISE: WingForm = { sweep: 20 * RAD, span: 0.85, lift: 4 * RAD, fan: 0.9, tip: 3 * RAD };
const FAST: WingForm = { sweep: 40 * RAD, span: 0.6, lift: 0, fan: 0.66, tip: 0 };
const DIVE: WingForm = { sweep: 55 * RAD, span: 0.4, lift: -3 * RAD, fan: 0.42, tip: 0 };
/** The last two seconds before it lands: cupped, the arms brought a little forward, the tips well up. */
export const FLARE: WingForm = { sweep: -6 * RAD, span: 1, lift: 20 * RAD, fan: 1, tip: 14 * RAD };
/** Folded flat along the body, as it sits. */
export const FOLDED: WingForm = { sweep: 74 * RAD, span: 0.16, lift: 16 * RAD, fan: 0.1, tip: -10 * RAD };
/** Drawn in close in the air, as a falcon drops off a cliff: for leaving or reaching a ledge with others close beside it. */
export const TUCK: WingForm = { sweep: 64 * RAD, span: 0.28, lift: 8 * RAD, fan: 0.24, tip: -4 * RAD };

const blend = (a: WingForm, b: WingForm, t: number): WingForm => ({
  sweep: a.sweep + (b.sweep - a.sweep) * t, span: a.span + (b.span - a.span) * t, lift: a.lift + (b.lift - a.lift) * t, fan: a.fan + (b.fan - a.fan) * t, tip: a.tip + (b.tip - a.tip) * t,
});

/** The shape a wing takes at a speed, as a swing-wing jet's: spread when slow, a delta when fast, a dart in a dive. */
export function formAt(speed: number): WingForm {
  if (speed <= 22) return SPREAD;
  if (speed <= 30) return blend(SPREAD, CRUISE, (speed - 22) / 8);
  if (speed <= 45) return blend(CRUISE, FAST, (speed - 30) / 15);
  if (speed <= 55) return blend(FAST, DIVE, (speed - 45) / 10);
  return DIVE;
}
export const blendForm = blend;

/**
 * A wing's form as the angles of its bones. `beat` is where it is in a
 * wingbeat: 0 when it glides, and from 0 to 1 through one beat, a quick
 * downstroke with the wing spread and then a slower upstroke with the hand
 * half folded. `amount` is how deep the beat is: 1 is a full beat, and less
 * is the shallow flick of a wing that stays swept at speed.
 */
export function wingPose(f: WingForm, beat: number, out: WingPose, amount = 1, m: Measures = LEAN): WingPose {
  let { sweep, span, lift, fan, tip } = f;
  if (beat > 0) {
    // how far it is raised through the beat: up before the downstroke, down at 0.4, and up again
    const up = lift + (34 * RAD - lift) * amount, down = lift + (-26 * RAD - lift) * amount;
    const ease = (t: number): number => t * t * (3 - 2 * t);
    let raise: number, folded: number;
    if (beat < 0.4) { raise = up + (down - up) * ease(beat / 0.4); folded = 0; }
    else { const t = (beat - 0.4) / 0.6; raise = down + (up - down) * ease(t); folded = Math.sin(Math.PI * t); }
    // it comes in from the glide and goes back out to it at the two ends of the beat
    const into = Math.min(1, beat / 0.08, (1 - beat) / 0.1);
    lift += (raise - lift) * into * (beat < 0.4 ? 1 : 0.85);
    span *= 1 - 0.3 * folded * amount;
    fan *= 1 - 0.28 * folded * amount;
    tip += (-16 * RAD * folded + (beat < 0.4 ? 8 * RAD : 0)) * into * amount;
    sweep += 10 * RAD * folded * amount;
  }
  // the hand's sweep is whatever brings the tip in to the span that is asked for
  const reach = (span * m.halfSpan - m.shoulder[2] - m.arm * Math.cos(sweep) * Math.cos(lift)) / (m.fingers[0] * Math.cos(lift + tip));
  out.sweep = sweep;
  out.lift = lift;
  out.hand = Math.acos(Math.min(1, Math.max(0.03, reach)));
  out.fan = fan;
  out.tip = tip;
  return out;
}
