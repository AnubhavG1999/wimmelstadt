// One dragon: its shape, its joints, and how a pose becomes a mesh.
//
// The three are built after the books' three and in the books' colours: two
// legs, with the wings as the forelimbs, lean and long, most of each a neck, a
// tail and wings. They are meant to read as fast jets that are dragons: head,
// neck and body in one line, everything swept back along that line, a tail fin
// that works as a rudder, and wings that change shape with speed.
//
// A dragon is one mesh. Its parts are rigid: each has its own corners, worked
// out once, and on every frame each part is turned and moved to where the pose
// puts it. Only the wing's skin is drawn afresh, between the shoulder, the
// wrist, the finger tips and the flank.
//
// Lengths in this file are shares of the dragon's length from nose to tail
// tip, so that the three differ only in size and colour.

import * as THREE from 'three';
import { patch, toon, type TileLook } from '../../engine/look/materials';

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
}

/** Black, streaked with scarlet. The largest of the three. */
export const DROGON: DragonKind = {
  name: 'Drogon', length: 14, body: 0x1b181e, belly: 0x29232b, streak: 0x9e1018, horn: 0xb3141c, bone: 0x141216,
  skin: [0x4a080c, 0x3a0609], claw: 0x0b0a0c, eye: 0xff2a1a, mouth: 0x6a0c0c, glow: 0xff3018,
};
/** Green and bronze, with wings of jade. */
export const RHAEGAL: DragonKind = {
  name: 'Rhaegal', length: 12, body: 0x1f4a2a, belly: 0x2c5e36, streak: 0x8c5a26, horn: 0x8c5a26, bone: 0x7a4e22,
  skin: [0x2e7d5b, 0x27694d], claw: 0x0b0a0c, eye: 0xd98a2a, mouth: 0x4a2a10, glow: 0xffa020,
};
/** Cream and gold. The pale one. */
export const VISERION: DragonKind = {
  name: 'Viserion', length: 11.5, body: 0xd8c79a, belly: 0xe2d4ae, streak: 0xb8861f, horn: 0xb8861f, bone: 0xa87a1c,
  skin: [0xc2a878, 0xb09462], claw: 0x0b0a0c, eye: 0xffc83a, mouth: 0x7a4a18, glow: 0xffd870,
};

// ---------------------------------------------------------------------------
// Measures, as shares of the length
// ---------------------------------------------------------------------------

const HEAD = 0.1, NECK = 5, NECK_L = 0.048, BODY = 3, BODY_L = 0.2 / 3, TAIL = 10, TAIL_L = 0.046;
/** Where a wing joins the chest, where a leg joins the hips, and where the wing's skin meets the flank: for the right side. */
const SHOULDER: V3 = [-0.04, 0.026, 0.036], HIP: V3 = [-0.178, -0.02, 0.02], FLANK: V3 = [-0.232, 0.004, 0.018];
const ARM = 0.22, FINGERS = [0.45, 0.405, 0.335, 0.25];
/** How far back each finger fans from the first, when the hand is wide open. */
const FAN = [0, 0.42, 0.9, 1.45];
const THIGH = 0.07, SHIN = 0.066, FOOT = 0.03;
/** Half the full span, from the middle of the back to a wing tip. */
export const HALF_SPAN = 0.675;

/** A slice across the neck, the body or the tail: half its width, how far its back rises and how far its keel drops. */
interface Slice { w: number; up: number; down: number }
const mix = (a: Slice, b: Slice, t: number): Slice => ({ w: a.w + (b.w - a.w) * t, up: a.up + (b.up - a.up) * t, down: a.down + (b.down - a.down) * t });
// Lean, but with a chest: deeper than it is wide where the wings join, and narrow at the hips.
const AT_HEAD: Slice = { w: 0.019, up: 0.022, down: 0.024 }, AT_CHEST: Slice = { w: 0.034, up: 0.038, down: 0.05 };
const DEEPEST: Slice = { w: 0.042, up: 0.044, down: 0.064 }, AT_WAIST: Slice = { w: 0.032, up: 0.035, down: 0.042 }, AT_HIPS: Slice = { w: 0.024, up: 0.028, down: 0.03 };
const TAIL_TIP: Slice = { w: 0.0024, up: 0.0032, down: 0.0032 };

/** The slice at each end of each joint of the neck, counted from the chest. */
const neckSlice = (j: number): Slice => mix(AT_CHEST, AT_HEAD, j / NECK);
const BODY_SLICES = [AT_CHEST, DEEPEST, AT_WAIST, AT_HIPS];
const tailSlice = (j: number): Slice => mix(AT_HIPS, TAIL_TIP, (j / TAIL) ** 0.8);

// ---------------------------------------------------------------------------
// Building a part
// ---------------------------------------------------------------------------

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

  /** A bar with four sides from a to b, as thick as `ra` at one end and `rb` at the other. `flat` makes it that much thinner one way than the other. */
  beam(a: V3, b: V3, ra: number, rb: number, color: number, flat = 1): void {
    const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l = Math.hypot(d[0], d[1], d[2]) || 1;
    // two directions across the bar: one level, and one at right angles to both
    let u: V3 = [-d[2], 0, d[0]];
    let ul = Math.hypot(u[0], u[2]);
    if (ul < 1e-6 * l) { u = [1, 0, 0]; ul = 1; }
    u = [u[0] / ul, 0, u[2] / ul];
    const v: V3 = [(d[1] * u[2]) / l, (d[2] * u[0] - d[0] * u[2]) / l, (-d[1] * u[0]) / l];
    const ring = (p: V3, r: number): V3[] => [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([su, sv]): V3 =>
      [p[0] + (u[0] * su + v[0] * sv * flat) * r, p[1] + v[1] * sv * flat * r, p[2] + (u[2] * su + v[2] * sv * flat) * r]);
    const ra4 = ring(a, ra), rb4 = ring(b, rb);
    this.loft(ra4, rb4, () => color);
    if (rb > 1e-5) this.cap(rb4, color, d);
  }
}

/** The corners of a slice, at `x` along the part: round the right side from the back to the keel, and up the left. */
function ring(x: number, s: Slice): V3[] {
  const r = s.w * 0.3;
  return [[x, s.up, r], [x, s.up * 0.32, s.w], [x, -s.down * 0.5, s.w * 0.76], [x, -s.down, 0], [x, -s.down * 0.5, -s.w * 0.76], [x, s.up * 0.32, -s.w], [x, s.up, -r]];
}
/** A thinner slice for the tail: four corners. */
function diamond(x: number, s: Slice): V3[] {
  return [[x, s.up, 0], [x, 0, s.w], [x, -s.down, 0], [x, 0, -s.w]];
}

/** One joint of the neck or the body, from x0 to x1, with its plate on top and a streak along each flank. */
function joint(k: DragonKind, x0: number, s0: Slice, x1: number, s1: Slice, plate: number, throat = 0): Shape {
  const b = new Shape();
  const a = ring(x0, s0), c = ring(x1, s1);
  // back and upper flanks in the body's colour, the keel lighter
  const glow = throat > 0 ? (i: number): [number, number] => [0, i === 2 || i === 3 ? throat : i === 1 || i === 4 ? throat * 0.35 : 0] : undefined;
  b.loft(a, c, (i) => (i === 2 || i === 3 ? k.belly : k.body), glow);
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
  return b;
}

/** The head: a long narrow wedge, flat on top, with its horns and frill swept straight back. Its back is at the origin and its nose along +x. */
function headShape(k: DragonKind): Shape {
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
    // two horns from the brow, in line with the head
    b.beam([0.006, 0.025, s * 0.013], [-0.072, 0.04, s * 0.025], 0.0068, 0.0009, k.horn);
    // a frill of three spikes behind the jaw
    for (let i = 0; i < 3; i++) {
      const y = 0.01 - i * 0.0095;
      b.beam([0.003, y, s * 0.0185], [-0.046 + i * 0.008, y - 0.0015 - i * 0.002, s * (0.03 - i * 0.002)], 0.0046 - i * 0.0006, 0.0007, k.horn);
    }
  }
  // the first plate of the spine, on the crown
  b.tri([0.016, 0.027, 0], [-0.002, 0.027, 0], [-0.028, 0.041, 0], k.horn, [0, 0, 1]);
  return b;
}

/** The lower jaw: a thin wedge, hinged at the origin, with its tip along +x. */
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
function tailShape(k: DragonKind, j: number): Shape {
  const b = new Shape();
  const s0 = tailSlice(j), s1 = tailSlice(j + 1);
  b.loft(diamond(0, s0), diamond(-TAIL_L, s1), (i) => (i === 1 || i === 2 ? k.belly : k.body));
  const plate = 0.026 * (1 - j / TAIL) ** 1.3;
  if (j < TAIL - 2) b.tri([-TAIL_L * 0.1, s0.up, 0], [-TAIL_L * 0.9, s1.up, 0], [-TAIL_L * 1.15, s1.up + plate, 0], k.horn, [0, 0, 1]);
  if (j === TAIL - 1) {
    // the fin: a spade set upright, which swings like a rudder
    const x = -TAIL_L * 0.05;
    b.tri([x, 0, 0], [x - 0.024, 0.026, 0], [x - 0.07, 0, 0], k.horn, [0, 0, 1]);
    b.tri([x, 0, 0], [x - 0.07, 0, 0], [x - 0.024, -0.026, 0], k.horn, [0, 0, 1]);
  }
  return b;
}

/** A bone of the wing or the leg: from the origin along +x. */
function boneShape(color: number, length: number, r0: number, r1: number, flat = 1): Shape {
  const b = new Shape();
  b.beam([0, 0, 0], [length, 0, 0], r0, r1, color, flat);
  return b;
}

/** The arm of the wing, from the shoulder at the origin to the wrist along +x, with the claw at the wrist that points forward. */
function armShape(k: DragonKind, side: number): Shape {
  const b = boneShape(k.bone, ARM, 0.0155, 0.009, 0.8);
  b.beam([ARM, 0, 0], [ARM + 0.014, 0.005, -side * 0.034], 0.0055, 0.0008, k.claw);
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
}

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const turn = (yawRight: number, pitchUp: number, out: THREE.Quaternion): THREE.Quaternion => out.setFromEuler(new THREE.Euler(0, -yawRight, pitchUp, 'YZX'));

interface Part { start: number; count: number; pos: Float32Array; nor: Float32Array; at: THREE.Vector3; q: THREE.Quaternion }

/** How many corners the wings' skin takes: nine triangles to a wing. */
const SKIN_TRIS = 9;

/** The material the dragons are drawn in: the city's cel shading, both sides of every face, no snow, and light of their own in the eyes and the throat. */
export function dragonMaterial(look: TileLook): { mat: THREE.MeshToonMaterial; eye: THREE.Color; throat: THREE.Color; lit: THREE.Color } {
  const eye = new THREE.Color(0, 0, 0), throat = new THREE.Color(0, 0, 0), lit = new THREE.Color(0, 0, 0);
  const mat = toon({ side: THREE.DoubleSide });
  patch(mat, 'westeros-dragon', look, {
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

  private readonly L: number;
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
  private readonly arm: Part[] = [];
  private readonly finger: Part[][] = [[], []];
  private readonly thigh: Part[] = [];
  private readonly shin: Part[] = [];
  private readonly foot: Part[] = [];

  /** Where its body pointed a little while ago: the tail follows that. */
  private readonly memory: { t: number; q: THREE.Quaternion }[] = [];

  constructor(kind: DragonKind, look: TileLook) {
    this.kind = kind;
    this.L = kind.length;
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

    this.head = add(headShape(kind));
    this.jaw = add(jawShape(kind));
    // the neck, from the chest forward: each joint from its own origin along +x
    for (let j = 0; j < NECK; j++) this.neck.push(add(joint(kind, 0, neckSlice(j), NECK_L, neckSlice(j + 1), 0.014 + 0.014 * (1 - j / NECK), j >= 1 ? (j - 0.5) / NECK : 0)));
    // the body, from the chest back: each joint from its own origin along -x, the plates tallest over the shoulders
    for (let j = 0; j < BODY; j++) this.body.push(add(joint(kind, 0, BODY_SLICES[j], -BODY_L, BODY_SLICES[j + 1], [0.038, 0.032, 0.027][j])));
    for (let j = 0; j < TAIL; j++) this.tail.push(add(tailShape(kind, j)));
    for (const side of [1, -1]) {
      const w = side > 0 ? 0 : 1;
      this.arm.push(add(armShape(kind, side)));
      FINGERS.forEach((len, i) => this.finger[w].push(add(boneShape(kind.bone, len, 0.0072 - i * 0.0007, 0.0014, 0.75))));
      this.thigh.push(add(boneShape(kind.body, THIGH, 0.019, 0.012, 0.75)));
      this.shin.push(add(boneShape(kind.body, SHIN, 0.011, 0.0075, 0.8)));
      this.foot.push(add(footShape(kind)));
    }

    // the wings' skin comes last: its corners are set on every frame
    this.skinStart = pos.length / 3;
    const c = new THREE.Color();
    for (let w = 0; w < 2; w++) {
      for (let t = 0; t < SKIN_TRIS; t++) {
        // one shade to each panel between two fingers, and one to the panel next to the body
        c.set(kind.skin[[0, 0, 1, 1, 0, 0, 1, 1, 1][t] ?? 0]);
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
    const m = dragonMaterial(look);
    this.eye = m.eye; this.throat = m.throat; this.lit = m.lit;
    this.mesh = new THREE.Mesh(geo, m.mat);
    this.mesh.name = `dragon-${kind.name}`;
    this.mesh.frustumCulled = false;

    // the shadow: both wings' skin again, laid flat, and a strip for the body
    const sgeo = new THREE.BufferGeometry();
    this.shadowPos = new THREE.BufferAttribute(new Float32Array((SKIN_TRIS * 2 + 4) * 9), 3);
    this.shadowPos.setUsage(THREE.DynamicDrawUsage);
    sgeo.setAttribute('position', this.shadowPos);
    this.shadowMat = new THREE.MeshBasicMaterial({ color: 0x05060a, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.shadow = new THREE.Mesh(sgeo, this.shadowMat);
    this.shadow.name = `dragon-shadow-${kind.name}`;
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
    const L = this.L, { q1, q2, v1, v2, at } = this;

    // --- what the tail remembers ---
    const mem = this.memory;
    if (mem.length > 0 && p.time < mem[mem.length - 1].t) mem.length = 0; // the clock was set back
    if (mem.length === 0 || p.time - mem[mem.length - 1].t > 1e-4) mem.push({ t: p.time, q: p.quat.clone() });
    else mem[mem.length - 1].q.copy(p.quat);
    while (mem.length > 2 && mem[1].t < p.time - 1.2) mem.shift();

    // --- the body: rigid, from the root of the neck back ---
    at.copy(p.pos);
    v1.copy(X).applyQuaternion(p.quat);
    for (let j = 0; j < BODY; j++) {
      this.body[j].at.copy(at);
      this.body[j].q.copy(p.quat);
      at.addScaledVector(v1, -BODY_L * L);
    }

    // --- the tail: each joint points the way the body did when it was there ---
    const lag = Math.min(0.055, (TAIL_L * L) / Math.max(p.speed, 10));
    for (let j = 0; j < TAIL; j++) {
      this.remembered(p.time, lag * (j + 1) * (1 - p.sit), q1);
      // the last few joints swing with the fin, into the turn
      if (j >= TAIL - 4) q1.multiply(turn(p.fin * ((j - (TAIL - 5)) / 4), 0, q2));
      // a tail that is laid out on the ground droops to it and then lies level
      if (p.sit > 0) q1.multiply(turn(0, p.sit * (j < 3 ? -0.2 : j < 6 ? 0.08 : 0.02), q2));
      this.tail[j].at.copy(at);
      this.tail[j].q.copy(q1);
      at.addScaledVector(v2.copy(X).applyQuaternion(q1), -TAIL_L * L);
    }
    this.tailTip.copy(at);

    // --- the neck and the head: forward from the chest ---
    at.copy(p.pos);
    q1.copy(p.quat);
    // drawn up into an S when it sits: up from the chest, then level again at the head
    const S = [0.52, 0.38, 0.05, -0.3, -0.42];
    for (let j = 0; j < NECK; j++) {
      q1.multiply(turn(p.neckYaw / (NECK + 1), p.neckPitch / (NECK + 1) + p.arch * S[j], q2));
      this.neck[j].at.copy(at);
      this.neck[j].q.copy(q1);
      at.addScaledVector(v2.copy(X).applyQuaternion(q1), NECK_L * L);
    }
    q1.multiply(turn(p.neckYaw / (NECK + 1), p.neckPitch / (NECK + 1) - p.arch * 0.2, q2));
    this.head.at.copy(at);
    this.head.q.copy(q1);
    v2.copy(X).applyQuaternion(q1);
    this.mouthDir.copy(v2);
    this.nose.copy(at).addScaledVector(v2, HEAD * L);
    this.mouth.copy(at).addScaledVector(v2, 0.09 * L).addScaledVector(this.v3.copy(Y).applyQuaternion(q1), -0.008 * L);
    // the jaw hangs from the back of the skull, and drops open
    this.jaw.at.copy(at).addScaledVector(v2, 0.008 * L).addScaledVector(this.v3, -0.0084 * L);
    this.jaw.q.copy(q1).multiply(turn(0, -0.34 * p.jaw, q2));

    // --- the wings ---
    const pts = this.joints; // per wing: shoulder, wrist, four tips, flank
    for (let w = 0; w < 2; w++) {
      const side = w === 0 ? 1 : -1, wp = w === 0 ? p.right : p.left;
      const shoulder = pts[0].set(SHOULDER[0] * L, SHOULDER[1] * L, SHOULDER[2] * L * side).applyQuaternion(p.quat).add(p.pos);
      // the arm: swept back and raised, in the body's own frame
      const a = v1.set(-Math.sin(wp.sweep) * Math.cos(wp.lift), Math.sin(wp.lift), side * Math.cos(wp.sweep) * Math.cos(wp.lift));
      // the hand: its first finger, and the way back along the wing from it
      const rise = wp.lift + wp.tip;
      const u = v2.set(-Math.sin(wp.hand) * Math.cos(rise), Math.sin(rise), side * Math.cos(wp.hand) * Math.cos(rise));
      const back = this.v3.set(-1, 0, 0).addScaledVector(u, u.x).normalize(); // straight back, less what lies along the finger
      // what is up for the wing: at right angles to the finger and to the way back
      const up = this.at.crossVectors(back, u).multiplyScalar(side).normalize();
      // the arm's part: its own x along the arm, its y the wing's up
      this.place(this.arm[w], shoulder, a, up, p.quat);
      const wrist = pts[1].copy(a).multiplyScalar(ARM * L).applyQuaternion(p.quat).add(shoulder);
      for (let i = 0; i < 4; i++) {
        const ang = FAN[i] * wp.fan;
        const d = this.q1v.copy(u).multiplyScalar(Math.cos(ang)).addScaledVector(back, Math.sin(ang));
        this.place(this.finger[w][i], wrist, d, up, p.quat);
        pts[2 + i].copy(d).multiplyScalar(FINGERS[i] * L).applyQuaternion(p.quat).add(wrist);
      }
      const flank = pts[6].set(FLANK[0] * L, FLANK[1] * L, FLANK[2] * L * side).applyQuaternion(p.quat).add(p.pos);
      this.tips[w].copy(pts[2]);
      this.skin(w, shoulder, wrist, pts[2], pts[3], pts[4], pts[5], flank, this.q1v.copy(up).applyQuaternion(p.quat), ground);

      // --- the leg on this side: folded flat along the belly, or down ---
      const hip = pts[7].set(HIP[0] * L, HIP[1] * L, HIP[2] * L * side).applyQuaternion(p.quat).add(p.pos);
      const g = p.legs;
      // Each bone is turned from the one before it, in a frame that looks back along the body.
      // Folded, the thigh lies back along the belly, the shin doubles forward under it and the foot back again.
      // Standing, the thigh reaches down and forward, the shin down and back, and the foot lies flat, claws forward.
      const thighPitch = -0.12 + (-2.04 + 0.12) * g, shinPitch = -2.9 + (0.99 + 2.9) * g, footPitch = 2.8 + (-2.09 - 2.8) * g;
      q1.copy(p.quat).multiply(turn(Math.PI - side * 0.06 * (1 - g), 0, q2)).multiply(turn(0, thighPitch, q2));
      this.thigh[w].at.copy(hip);
      this.thigh[w].q.copy(q1);
      const knee = pts[8].copy(X).applyQuaternion(q1).multiplyScalar(THIGH * L).add(hip);
      q1.multiply(turn(0, shinPitch, q2));
      this.shin[w].at.copy(knee);
      this.shin[w].q.copy(q1);
      const ankle = pts[9].copy(X).applyQuaternion(q1).multiplyScalar(SHIN * L).add(knee);
      q1.multiply(turn(0, footPitch, q2));
      this.foot[w].at.copy(ankle);
      this.foot[w].q.copy(q1);
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

  /** Sets a bone at a place in the world, with its length along `dir` and its top along `up`: both given in the body's own frame. */
  private place(part: Part, at: THREE.Vector3, dir: THREE.Vector3, up: THREE.Vector3, body: THREE.Quaternion): void {
    this.bx.copy(dir).normalize();
    this.bz.crossVectors(this.bx, up).normalize();
    this.by.crossVectors(this.bz, this.bx);
    part.q.setFromRotationMatrix(this.m3.makeBasis(this.bx, this.by, this.bz)).premultiply(body);
    part.at.copy(at);
  }

  private readonly e1 = new THREE.Vector3();
  private readonly e2 = new THREE.Vector3();
  private readonly nn = new THREE.Vector3();
  private readonly mids = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

  /** The skin of one wing: drawn taut between the shoulder, the wrist, the finger tips and the flank, with a slight scallop between tips. */
  private skin(w: number, shoulder: THREE.Vector3, wrist: THREE.Vector3, t1: THREE.Vector3, t2: THREE.Vector3, t3: THREE.Vector3, t4: THREE.Vector3, flank: THREE.Vector3, up: THREE.Vector3, ground: (x: number, z: number) => number): void {
    const out = this.position.array as Float32Array, nout = this.normal.array as Float32Array, sp = this.shadowPos.array as Float32Array;
    let o = (this.skinStart + w * SKIN_TRIS * 3) * 3, so = w * SKIN_TRIS * 9;
    const { e1, e2, nn, mids } = this;
    // the middle of each trailing edge, drawn in a little towards where the edge is hung from
    const scallop = (a: THREE.Vector3, b: THREE.Vector3, from: THREE.Vector3, into: THREE.Vector3): THREE.Vector3 => into.addVectors(a, b).multiplyScalar(0.5).lerp(from, 0.07);
    scallop(t1, t2, wrist, mids[0]);
    scallop(t2, t3, wrist, mids[1]);
    scallop(t3, t4, wrist, mids[2]);
    scallop(t4, flank, shoulder, mids[3]);
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
    tri(wrist, t1, mids[0]);
    tri(wrist, mids[0], t2);
    tri(wrist, t2, mids[1]);
    tri(wrist, mids[1], t3);
    tri(wrist, t3, mids[2]);
    tri(wrist, mids[2], t4);
    tri(shoulder, wrist, t4);
    tri(shoulder, t4, mids[3]);
    tri(shoulder, mids[3], flank);
  }
}

// ---------------------------------------------------------------------------
// The shapes a wing takes
// ---------------------------------------------------------------------------

const RAD = Math.PI / 180;

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
 * half folded.
 */
export function wingPose(f: WingForm, beat: number, out: WingPose): WingPose {
  let { sweep, span, lift, fan, tip } = f;
  if (beat > 0) {
    // how far it is raised through the beat: up before the downstroke, down at 0.4, and up again
    const up = 34 * RAD, down = -26 * RAD;
    const ease = (t: number): number => t * t * (3 - 2 * t);
    let raise: number, folded: number;
    if (beat < 0.4) { raise = up + (down - up) * ease(beat / 0.4); folded = 0; }
    else { const t = (beat - 0.4) / 0.6; raise = down + (up - down) * ease(t); folded = Math.sin(Math.PI * t); }
    // it comes in from the glide and goes back out to it at the two ends of the beat
    const into = Math.min(1, beat / 0.08, (1 - beat) / 0.1);
    lift += (raise - lift) * into * (beat < 0.4 ? 1 : 0.85);
    span *= 1 - 0.3 * folded;
    fan *= 1 - 0.28 * folded;
    tip += (-16 * RAD * folded + (beat < 0.4 ? 8 * RAD : 0)) * into;
    sweep += 10 * RAD * folded;
  }
  // the hand's sweep is whatever brings the tip in to the span that is asked for
  const reach = (span * HALF_SPAN - SHOULDER[2] - ARM * Math.cos(sweep) * Math.cos(lift)) / (FINGERS[0] * Math.cos(lift + tip));
  out.sweep = sweep;
  out.lift = lift;
  out.hand = Math.acos(Math.min(1, Math.max(0.03, reach)));
  out.fan = fan;
  out.tip = tip;
  return out;
}
