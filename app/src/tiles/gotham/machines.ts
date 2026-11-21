// The machines of the show, which are neither heroes nor traffic: the
// Batmobile, the Batboat, the Batplane and the Batgyro, the Batcycle and the
// Red Hood's motorcycle, the Jokermobile, the Joker's rowing boat, Wonder
// Woman's invisible plane, and the police helicopter. The show (show.ts)
// drives them; this file only builds them and says how each is moved.
//
// Each is this tile's own drawing. The comics give the Batmobile only "a large,
// dark-colored body and bat-like accessories such as large tailfins scalloped
// to resemble a bat's wings"; the collector asked for a modern one, so it is
// drawn after no film's car and no game's: long, low and black, a long nose
// with a ridge down it that ends in a blunt prow, the wheels half sunk in four
// pods, a slim canopy for two set well back, two swept fins on the rear pods
// with the scalloped trailing edge of a bat's wing, and a jet's nozzle between
// them. The Batboat and the Batcycle carry the same fins, so that the family
// reads as one. The Batplane is a jet whose wings' trailing edges are scalloped
// in three, with twin tails and a long nose, so that from above it is a jet
// and not the shape of a bat emblem. The Batgyro is the Whirly-Bat of 1958, a
// one-man helicopter, here with a bat's head for its nose fairing. The
// Jokermobile is white "to resemble the Joker's skin" (B 37, 1946), a
// long-bonneted roadster with the Joker's face on its front (B 52, 1949), its
// boxing glove on a spring in the boot (B&B 191, 1982) and its plank for
// crossing a gap; its purple fenders and green trim are the tile's own, from
// the Joker's suit. The invisible plane is drawn as the comics drew it,
// semi-transparent, an outline of pale lines over faint glass.
//
// Every machine is a group in `k.group`, hidden until the show shows it, made
// of a body in the city's material and a few meshes that move: wheels, rotors,
// a canopy, a lid; its lamps are a mesh of their own, bright at night, with a
// soft glow round each; a jet's flame, a searchlight's cone and the cards from
// the Jokermobile's tail are meshes that add light. Nothing casts into the
// shadow map, which is drawn only when the sun moves; a car carries a soft
// shadow of its own under it instead.
//
// Each is built in its own coordinates: its nose along +x, its right side
// along +z, its wheels, its waterline or its belly at y = 0.

import * as THREE from 'three';
import { GeoBuilder, interior, type QuadOpts, type V3, type WinSpec } from '../../engine/geo';
import { face3 } from '../../engine/shapes';
import type { Build } from '../../engine/tile';
import { SHOW_LANES, Y } from './plan';

export type MachineKind =
  | 'batmobile' | 'batboat' | 'batplane' | 'batgyro' | 'batcycle' | 'redCycle'
  | 'jokermobile' | 'rowboat' | 'invisiblePlane' | 'policeCopter' | 'batwing';

/** One machine of the show. */
export interface Machine {
  readonly kind: MachineKind;
  /** How long, wide and high it is, in units: the show keeps it clear of things by these. */
  readonly length: number;
  readonly width: number;
  readonly height: number;
  /**
   * Puts it at a place: a car's wheels, a boat's waterline or a flyer's belly
   * at height `y`, its nose the way `heading` points (radians: 0 east, a
   * quarter turn south), with its nose pitched up by `pitch` and banked to its
   * right by `roll`.
   */
  at(x: number, y: number, z: number, heading: number, pitch?: number, roll?: number): void;
  /** Called every frame it moves: turns its wheels, its rotor or its propeller and burns its jet for a speed in units a second over `dt` seconds. */
  run(speed: number, dt: number): void;
  /** Its lamps, from 0 off to 1 full. */
  lights(f: number): void;
  /**
   * Its own tricks, each from 0 to 1, by name. The Batmobile: `canopy` (open),
   * `jet` (its afterburner). The Jokermobile: `glove` (the boxing glove sprung
   * from its boot), `plank` (the plank pushed out ahead of it), `cards` (cards
   * streaming from its tail). The Batgyro and the helicopter: `line` (a line
   * let down under it). The rowing boat: `flag` (a jack-in-the-box flying a flag).
   * The Batwing: `rotors` (how fast its rotors turn, still at 0, a blur at 1),
   * `light` (its searchlight's cone) and `line` (a line with a bar to hold).
   * A name a machine does not know does nothing.
   */
  trick(name: string, f: number): void;
  /** Where a rider sits, in the tile's own coordinates as it now stands: [x, y, z] of the seat, for the show to seat a figure. Seat 0 is the driver's. */
  seat(i?: number): [number, number, number];
  /** Shown, or hidden. */
  shown(v: boolean): void;
}

/** Every machine of the show, one of each kind. */
export interface Machines {
  get(kind: MachineKind): Machine;
}

/**
 * How far above the place `seat` gives a rider's cushion is. `seat` gives the
 * place a seated figure's feet go to: the floor under its hips, or for a
 * motorcycle the place this far under its saddle.
 */
export const SEAT_RISE = 0.6;

/**
 * How far the tricks reach at 1: the Jokermobile's glove 5 behind its tail at
 * height 1, its plank 10 ahead of its nose, and the line under the Batgyro or
 * the helicopter 10 under its belly.
 */
export const REACH = { glove: 5, gloveY: 1, plank: 10, line: 10 };

/** Each one's length, width and height as built (the rowing boat's width is across its oars). */
const SIZES: Record<MachineKind, [number, number, number]> = {
  batmobile: [9.6, 3.4, 2.2], batboat: [9.1, 3.0, 2.3], batplane: [9.9, 11, 2.55], batgyro: [6.0, 5.9, 2.75], batcycle: [4.1, 1.0, 2.05], redCycle: [4.0, 1.1, 1.8],
  jokermobile: [8.45, 3.2, 2.36], rowboat: [4.0, 4.6, 0.75], invisiblePlane: [8.0, 9.0, 2.15], policeCopter: [7.0, 6.5, 2.75], batwing: [10.1, 9.3, 1.95],
};

const KINDS: MachineKind[] = ['batmobile', 'batboat', 'batplane', 'batgyro', 'batcycle', 'redCycle', 'jokermobile', 'rowboat', 'invisiblePlane', 'policeCopter', 'batwing'];

type P2 = [number, number];

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/** The Bat-family: black, its upper surfaces a little lighter and its edges in gunmetal, so that its shape reads by day. */
const BAT = 0x1f2229, BAT_TOP = 0x2c3039, BAT_EDGE = 0x4d535f, BAT_DARK = 0x121318, BAT_UNDER = 0x18191d, BAT_GLASS = 0x2b3f53;
const TYRE = 0x19191c, RIM_DARK = 0x34373e, RIM_STEEL = 0x8d939d;
/** The Jokermobile: the white of his skin, the purple and green of his suit, his red lips. */
const J_WHITE = 0xf0eee7, J_FACE = 0xf8f6f0, J_PURPLE = 0x6b2d92, J_PURPLE_DARK = 0x45205e, J_GREEN = 0x3e9f47, J_GREEN_DARK = 0x2c7434, J_HAIR = 0x55b848, J_RED = 0xcf1f2c, J_INK = 0x18181c, J_TEETH = 0xfcfbf5, J_UNDER = 0x3b3a40;
const WOOD = 0x9c7149, WOOD_DARK = 0x6f4d30, CHROME = 0xc8cdd5, STEEL = 0x9aa1ab, GREY = 0x60656e;
/** The Red Hood's motorcycle. */
const HOOD_RED = 0xa9231c, HOOD_RED_DARK = 0x6f1712;
/** The police: dark blue and white, with a pale patch where POLICE would be lettered. */
const COP_BLUE = 0x1f3c70, COP_WHITE = 0xe9edf1, COP_PATCH = 0xdfe7f0, COP_GLASS = 0x34506a;
/** Lamps. */
const AMBER = 0xffb544, RED_LAMP = 0xff2b1e, WHITE_LAMP = 0xfff1d6, GREEN_LAMP = 0x45ff74;

// ---------------------------------------------------------------------------
// Sums
// ---------------------------------------------------------------------------

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const near = (a: V3, b: V3): boolean => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 1e-5;
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number): number => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** A number from 0 to 1 that is the same every time it is asked for the same two numbers. */
const hash = (a: number, b = 0): number => {
  const s = Math.sin(a * 127.1 + b * 311.7 + 0.5) * 43758.5453;
  return s - Math.floor(s);
};
const area2 = (p: P2[]): number => {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
};

const AX: V3 = [1, 0, 0], AY: V3 = [0, 1, 0], AZ: V3 = [0, 0, 1];

// ---------------------------------------------------------------------------
// The kit a machine is built with
// ---------------------------------------------------------------------------

/** A face of four corners, its normal turned the way `dir` points. */
function quadTo(g: GeoBuilder, a: V3, b: V3, c: V3, d: V3, color: number, dir: V3, o: QuadOpts = {}): void {
  let n = cross(sub(c, a), sub(d, b));
  if (len(n) < 1e-10) return;
  n = unit(n);
  if (dot(n, dir) < 0) n = mul(n, -1);
  g.quad(a, b, c, d, n, color, o);
}

/** A triangle, its normal turned the way `dir` points. */
function triTo(g: GeoBuilder, a: V3, b: V3, c: V3, color: number, dir: V3, o: QuadOpts = {}): void {
  let n = cross(sub(b, a), sub(c, a));
  if (len(n) < 1e-10) return;
  n = unit(n);
  if (dot(n, dir) < 0) n = mul(n, -1);
  face3(g, a, b, c, n, color, o);
}

/** A cross-section of a hull at `x`: its points as (across, up), all the way round. */
interface Ring { x: number; p: P2[] }
const ring = (x: number, p: P2[]): Ring => ({ x, p });
/** A cross-section's points scaled about a middle. */
const scaled = (p: P2[], sz: number, sy: number, cz = 0, cy = 0): P2[] => p.map(([z, y]): P2 => [cz + (z - cz) * sz, cy + (y - cy) * sy]);
const mirror = (p: P2[]): P2[] => p.map(([z, y]): P2 => [-z, y]);
/** An outline along the machine and across it, turned over to the other side. */
const flip = (p: P2[]): P2[] => p.map(([x, z]): P2 => [x, -z]);
const at3 = (x: number, q: P2): V3 => [x, q[1], q[0]];

/**
 * A hull lofted through cross-sections of the same number of points: band j
 * of segment s runs between points j and j + 1 of sections s and s + 1. The
 * ends are closed flat unless told not to be.
 */
function loft(g: GeoBuilder, rings: Ring[], color: (band: number, seg: number) => number, o: { skip?: (band: number, seg: number) => boolean; win?: (band: number, seg: number) => WinSpec | undefined; capA?: number | false; capB?: number | false } = {}): void {
  for (let s = 0; s + 1 < rings.length; s++) {
    const A = rings[s], B = rings[s + 1], n = A.p.length;
    // which way round the section runs, so that every face is turned outwards
    const turn = Math.sign(area2(A.p) || area2(B.p)) || 1;
    for (let j = 0; j < n; j++) {
      if (o.skip?.(j, s)) continue;
      const j2 = (j + 1) % n;
      const a = at3(A.x, A.p[j]), b = at3(B.x, B.p[j]), c = at3(B.x, B.p[j2]), d = at3(A.x, A.p[j2]);
      const ez = A.p[j2][0] - A.p[j][0] + B.p[j2][0] - B.p[j][0], ey = A.p[j2][1] - A.p[j][1] + B.p[j2][1] - B.p[j][1];
      const dir: V3 = [0, -ez * turn, ey * turn];
      const col = color(j, s);
      const w = o.win?.(j, s);
      const q: QuadOpts = w ? { win: w } : {};
      if (near(b, c)) triTo(g, a, b, d, col, dir, q);
      else if (near(a, d)) triTo(g, a, b, c, col, dir, q);
      else quadTo(g, a, b, c, d, col, dir, q);
    }
  }
  const first = rings[0], last = rings[rings.length - 1];
  if (o.capA !== false) capRing(g, first, Math.sign(first.x - rings[1].x), o.capA ?? color(0, 0));
  if (o.capB !== false) capRing(g, last, Math.sign(last.x - rings[rings.length - 2].x), o.capB ?? color(0, rings.length - 2));
}

/** A cross-section closed flat, facing along x the way `sx` says. */
function capRing(g: GeoBuilder, r: Ring, sx: number, color: number): void {
  if (Math.abs(area2(r.p)) < 1e-4) return;
  const tris = THREE.ShapeUtils.triangulateShape(r.p.map((q) => new THREE.Vector2(q[0], q[1])), []);
  for (const t of tris) face3(g, at3(r.x, r.p[t[0]]), at3(r.x, r.p[t[1]]), at3(r.x, r.p[t[2]]), [sx, 0, 0], color);
}

/** A round bar from a to b, `ra` and `rb` in radius, closed at either end unless told not to be. */
function frustum(g: GeoBuilder, a: V3, b: V3, ra: number, rb: number, sides: number, color: number, o: { capA?: number | false; capB?: number | false; phase?: number; win?: WinSpec } = {}): void {
  const ax = unit(sub(b, a)), ref: V3 = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = unit(cross(ax, ref)), v = cross(ax, u), L = len(sub(b, a)), slope = (ra - rb) / Math.max(L, 1e-6), ph = o.phase ?? Math.PI / sides;
  const pt = (c: V3, r: number, t: number): V3 => add(c, add(mul(u, Math.cos(t) * r), mul(v, Math.sin(t) * r)));
  for (let i = 0; i < sides; i++) {
    const t0 = ph + (i / sides) * Math.PI * 2, t1 = ph + ((i + 1) / sides) * Math.PI * 2, tm = (t0 + t1) / 2;
    const n = unit(add(add(mul(u, Math.cos(tm)), mul(v, Math.sin(tm))), mul(ax, slope)));
    const pa0 = pt(a, ra, t0), pa1 = pt(a, ra, t1), pb0 = pt(b, rb, t0), pb1 = pt(b, rb, t1);
    if (rb < 1e-4) face3(g, pa0, pa1, b, n, color);
    else if (ra < 1e-4) face3(g, a, pb1, pb0, n, color);
    else g.quad(pa0, pa1, pb1, pb0, n, color, o.win ? { win: o.win } : {});
    if (o.capA !== false && ra > 1e-4) face3(g, a, pa1, pa0, mul(ax, -1), o.capA ?? color);
    if (o.capB !== false && rb > 1e-4) face3(g, b, pb0, pb1, ax, o.capB ?? color);
  }
}

/** A box along any three axes at right angles, `h` half its size along each. Faces: E W along the first, T B the second, S N the third. */
function rbox(g: GeoBuilder, c: V3, h: V3, ax: V3, ay: V3, az: V3, color: number, faces = 'NESWTB'): void {
  const P = (sx: number, sy: number, sz: number): V3 => add(c, add(add(mul(ax, sx * h[0]), mul(ay, sy * h[1])), mul(az, sz * h[2])));
  if (faces.includes('E')) g.quad(P(1, -1, -1), P(1, -1, 1), P(1, 1, 1), P(1, 1, -1), ax, color);
  if (faces.includes('W')) g.quad(P(-1, -1, 1), P(-1, -1, -1), P(-1, 1, -1), P(-1, 1, 1), mul(ax, -1), color);
  if (faces.includes('T')) g.quad(P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1), ay, color);
  if (faces.includes('B')) g.quad(P(-1, -1, 1), P(1, -1, 1), P(1, -1, -1), P(-1, -1, -1), mul(ay, -1), color);
  if (faces.includes('S')) g.quad(P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1), az, color);
  if (faces.includes('N')) g.quad(P(1, -1, -1), P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1), mul(az, -1), color);
}

/** An axis-aligned box from two corners in any order, closed on every side. */
function block(g: GeoBuilder, a: V3, b: V3, color: number, top?: number, faces = 'NESWTB'): void {
  g.box(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2]), color, { faces, top });
}

/**
 * A flat shape with a thickness: an outline in the plane of `u` and `v`
 * through `o`, pushed out along the normal `n` from `t0` to `t1`. A fin, a
 * wing, a face, a flag.
 */
function slab(g: GeoBuilder, outline: P2[], o: V3, u: V3, v: V3, n: V3, t0: number, t1: number, color: number, side = color): void {
  const P = (p: P2, t: number): V3 => add(add(add(o, mul(u, p[0])), mul(v, p[1])), mul(n, t));
  const tris = THREE.ShapeUtils.triangulateShape(outline.map((p) => new THREE.Vector2(p[0], p[1])), []);
  const up = t1 >= t0 ? n : mul(n, -1);
  for (const t of tris) {
    face3(g, P(outline[t[0]], t1), P(outline[t[1]], t1), P(outline[t[2]], t1), up, color);
    face3(g, P(outline[t[0]], t0), P(outline[t[1]], t0), P(outline[t[2]], t0), mul(up, -1), color);
  }
  const turn = area2(outline) >= 0 ? 1 : -1;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    const out = add(mul(u, (b[1] - a[1]) * turn), mul(v, -(b[0] - a[0]) * turn));
    quadTo(g, P(a, t0), P(b, t0), P(b, t1), P(a, t1), side, out);
  }
}

/** A shape painted on a face: an outline in the plane of `u` and `v` through `o`, `lift` proud of it along `n`. */
function decal(g: GeoBuilder, outline: P2[], o: V3, u: V3, v: V3, n: V3, lift: number, color: number, q: QuadOpts = {}): void {
  const P = (p: P2): V3 => add(add(add(o, mul(u, p[0])), mul(v, p[1])), mul(n, lift));
  for (const t of THREE.ShapeUtils.triangulateShape(outline.map((p) => new THREE.Vector2(p[0], p[1])), [])) face3(g, P(outline[t[0]]), P(outline[t[1]]), P(outline[t[2]]), n, color, q);
}

const circle = (r: number, n: number, phase = 0, cx = 0, cy = 0): P2[] => Array.from({ length: n }, (_, i): P2 => [cx + Math.cos(phase + (i / n) * Math.PI * 2) * r, cy + Math.sin(phase + (i / n) * Math.PI * 2) * r]);

/** An octagonal cross-section, flattened a little, for a fuselage or a glove. */
const oct = (r: number, cy: number, sz = 1.1, sy = 0.85): P2[] => Array.from({ length: 8 }, (_, i): P2 => {
  const a = -Math.PI / 2 + Math.PI / 8 + (i * Math.PI) / 4;
  return [Math.cos(a) * r * sz, cy + Math.sin(a) * r * sy];
});

/** A body's cross-section: across and up at its bottom, its side, its shoulder and its top. */
const body8 = (x: number, zb: number, yb: number, zs: number, yl: number, yu: number, zt: number, yt: number): Ring =>
  ring(x, [[zb, yb], [zs, yl], [zs, yu], [zt, yt], [-zt, yt], [-zs, yu], [-zs, yl], [-zb, yb]]);

/** A slender frame's cross-section, for a motorcycle. */
const hex = (hw: number, yb: number, yt: number): P2[] => {
  const h = yt - yb;
  return [[hw * 0.6, yb], [hw, yb + 0.35 * h], [hw, yb + 0.75 * h], [hw * 0.55, yt], [-hw * 0.55, yt], [-hw, yb + 0.75 * h], [-hw, yb + 0.35 * h], [-hw * 0.6, yb]];
};

/**
 * The points of a scalloped edge from a to b (a left out, b kept): `n`
 * hollows like those between the fingers of a bat's wing, each bowed `depth`
 * toward `side`.
 */
function scallops(a: P2, b: P2, n: number, depth: number, side: P2, steps = 3): P2[] {
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    for (let s = 1; s <= steps; s++) {
      const t = (i + s / steps) / n, bow = s === steps ? 0 : Math.sin((s / steps) * Math.PI) * depth;
      out.push([a[0] + (b[0] - a[0]) * t + side[0] * bow, a[1] + (b[1] - a[1]) * t + side[1] * bow]);
    }
  }
  return out;
}

/** A grin: a crescent between a lower curve and an upper one that meet at its corners, `w` either side of the middle. */
function grin(w: number, lo: number, dl: number, up: number, du: number, n = 10): P2[] {
  const out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const z = -w + (2 * w * i) / n;
    out.push([z, lo + dl * (z / w) ** 2]);
  }
  for (let i = n - 1; i >= 1; i--) {
    const z = -w + (2 * w * i) / n;
    out.push([z, up + du * (z / w) ** 2]);
  }
  return out;
}

/** A wheel, its axle along z and its middle at the origin: a tyre, a rim and five spokes on either face, so that it is seen to turn. */
function wheelGeo(r: number, w: number, rim = RIM_DARK, spoke = RIM_STEEL, hub = spoke, sides = 10): THREE.BufferGeometry {
  const g = new GeoBuilder();
  frustum(g, [0, 0, -w / 2], [0, 0, w / 2], r, r, sides, TYRE);
  for (const s of [-1, 1]) {
    const o: V3 = [0, 0, (s * w) / 2], n: V3 = [0, 0, s];
    decal(g, circle(r * 0.66, sides, Math.PI / sides), o, AX, AY, n, 0.02, rim);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), hw = r * 0.07;
      const P = (ra: number, sw: number): P2 => [c * ra - sn * sw, sn * ra + c * sw];
      decal(g, [P(r * 0.12, -hw), P(r * 0.62, -hw), P(r * 0.62, hw), P(r * 0.12, hw)], o, AX, AY, n, 0.04, spoke);
    }
    decal(g, circle(r * 0.17, 6), o, AX, AY, n, 0.05, hub);
  }
  return g.build();
}

/** A lamp, its glow, and nothing else: a small box in the lamps' builder, and a halo of `r` round it if `r` is given. */
interface Halo { at: V3; r: number; color: number }
function lamp(lg: GeoBuilder, halos: Halo[], a: V3, b: V3, color: number, r = 0): void {
  block(lg, a, b, color);
  if (r > 0) halos.push({ at: mul(add(a, b), 0.5), r, color });
}

// ---------------------------------------------------------------------------
// What glows: a soft round picture, and the flame of a jet
// ---------------------------------------------------------------------------

let ROUND: THREE.Texture | null = null;
/** A round patch, white in the middle and fading to nothing at its edge. */
function roundTex(): THREE.Texture {
  if (ROUND) return ROUND;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const x = cv.getContext('2d')!;
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  ROUND = new THREE.CanvasTexture(cv);
  return ROUND;
}

let FLAME: THREE.BufferGeometry | null = null;
/** A jet's flame, a unit long and a unit wide, from its nozzle at the origin back along -x: an orange cone round a pale core, and the glow of the nozzle. */
function flameGeo(): THREE.BufferGeometry {
  if (FLAME) return FLAME;
  const g = new GeoBuilder();
  frustum(g, [0, 0, 0], [-1, 0, 0], 1, 0, 10, 0xff6a24, { capA: false });
  frustum(g, [0.02, 0, 0], [-0.55, 0, 0], 0.6, 0, 8, 0xffe7b8, { capA: false });
  decal(g, circle(0.95, 10), [0.03, 0, 0], AZ, AY, [-1, 0, 0], 0, 0xffc890);
  FLAME = g.build();
  return FLAME;
}

const additive = (o: THREE.MeshBasicMaterialParameters = {}): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, side: THREE.DoubleSide, ...o });

// ---------------------------------------------------------------------------
// A machine as the show holds it
// ---------------------------------------------------------------------------

class Rig implements Machine {
  readonly root = new THREE.Group();
  /** What bobs on the water: everything but the wake. */
  readonly body = new THREE.Group();
  readonly length: number;
  readonly width: number;
  readonly height: number;
  readonly wheels: { m: THREE.Object3D; r: number }[] = [];
  readonly spinners: { m: THREE.Object3D; axis: 'y' | 'z'; rate: number }[] = [];
  readonly jets: THREE.Object3D[] = [];
  /** Its tricks, by name. */
  readonly fx: Record<string, (f: number) => void> = {};
  /** Where each trick stands now. */
  readonly value: Record<string, number> = {};
  seats: V3[] = [[0, 0, 0]];
  /** Whether it floats and bobs. */
  boat = false;
  /** How strongly its jets burn at speed without the afterburner: a flyer's do, a car's do not. */
  cruise = 0;
  tris = 0;
  /** What it does on every frame it is shown, besides what every machine does. */
  each?: (dt: number, time: number, night: number) => void;
  /** What it does when it is run, besides turning its wheels. */
  onRun?: (speed: number, dt: number) => void;
  speed = 0;
  lit = 0;
  private ran = false;
  private lampMat: THREE.MeshBasicMaterial | null = null;
  private haloMat: THREE.MeshBasicMaterial | null = null;
  private beamMat: THREE.MeshBasicMaterial | null = null;
  private jetMat: THREE.MeshBasicMaterial | null = null;
  private readonly v = new THREE.Vector3();
  private readonly mat: THREE.Material;

  readonly kind: MachineKind;

  constructor(kind: MachineKind, k: Build, mat: THREE.Material) {
    this.kind = kind;
    const [l, w, h] = SIZES[kind];
    this.length = l;
    this.width = w;
    this.height = h;
    this.mat = mat;
    this.root.name = `machine-${kind}`;
    this.root.visible = false;
    this.root.add(this.body);
    k.group.add(this.root);
  }

  /** A mesh of the city's material, in the body or in `parent`. */
  solid(g: GeoBuilder, parent: THREE.Object3D = this.body): THREE.Mesh {
    this.tris += g.triangles;
    const m = new THREE.Mesh(g.build(), this.mat);
    m.castShadow = false;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  /** An empty place that a part turns about. */
  pivot(at: V3, parent: THREE.Object3D = this.body): THREE.Group {
    const p = new THREE.Group();
    p.position.set(at[0], at[1], at[2]);
    parent.add(p);
    return p;
  }

  /** Its lamps, bright at night, with a glow round those that have one. */
  lamps(lg: GeoBuilder, halos: Halo[]): void {
    this.tris += lg.triangles;
    this.lampMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    const m = new THREE.Mesh(lg.build(), this.lampMat);
    this.body.add(m);
    if (!halos.length) return;
    const hg = new GeoBuilder();
    for (const h of halos) {
      const [x, y, z] = h.at, r = h.r;
      hg.quad([x - r, y - r, z], [x + r, y - r, z], [x + r, y + r, z], [x - r, y + r, z], [0, 0, 1], h.color);
      hg.quad([x - r, y, z - r], [x + r, y, z - r], [x + r, y, z + r], [x - r, y, z + r], [0, 1, 0], h.color);
      hg.quad([x, y - r, z - r], [x, y - r, z + r], [x, y + r, z + r], [x, y + r, z - r], [1, 0, 0], h.color);
    }
    this.haloMat = additive({ map: roundTex(), vertexColors: true });
    const hm = new THREE.Mesh(hg.build(), this.haloMat);
    hm.renderOrder = 3;
    this.body.add(hm);
  }

  /** A patch lying flat at height `y`, from x0 to x1 and z0 to z1, with the round picture on it: a pool of lamplight, a shadow, a wake. */
  patch(parent: THREE.Object3D, x0: number, x1: number, z0: number, z1: number, y: number, mat: THREE.MeshBasicMaterial): THREE.Mesh {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([x0, y, z0, x0, y, z1, x1, y, z1, x1, y, z0], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 1, 0], 2));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 2;
    parent.add(m);
    return m;
  }

  /** The light its lamps throw on the road ahead, from `x` forward. */
  beam(x: number, l: number, w: number, color: number): void {
    this.beamMat = additive({ map: roundTex(), color, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.patch(this.root, x - 1, x + l, -w / 2, w / 2, 0.06, this.beamMat);
  }

  /** A soft shadow on the ground under it. */
  blob(l: number, w: number): void {
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, map: roundTex(), transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    this.patch(this.root, -l / 2, l / 2, -w / 2, w / 2, 0.035, mat);
  }

  /** Wheels of one shape, each at its place (its middle), turning as it goes. */
  wheel(geo: THREE.BufferGeometry, r: number, places: V3[]): void {
    for (const p of places) {
      const m = new THREE.Mesh(geo, this.mat);
      m.position.set(p[0], p[1], p[2]);
      this.body.add(m);
      this.wheels.push({ m, r });
      this.tris += geo.getAttribute('position').count / 3;
    }
  }

  /** A rotor or a propeller that turns about `axis` at `rate` radians a second while it is shown, and the faint disc it sweeps if `disc` is given. */
  spinner(g: GeoBuilder, at: V3, axis: 'y' | 'z', rate: number, disc = 0): THREE.Mesh {
    const p = this.pivot(at);
    const m = this.solid(g, p);
    this.spinners.push({ m, axis, rate });
    if (disc > 0) {
      const d = new THREE.Mesh(new THREE.CircleGeometry(disc, 24), new THREE.MeshBasicMaterial({ color: 0x2a2c33, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
      if (axis === 'y') d.rotation.x = -Math.PI / 2;
      d.renderOrder = 2;
      p.add(d);
    }
    return m;
  }

  /** A jet's nozzle at `at`, firing back along -x: its flame `len` long at full burn and `r` wide. */
  jet(at: V3, r: number, l: number): void {
    if (!this.jetMat) this.jetMat = additive({ vertexColors: true });
    const m = new THREE.Mesh(flameGeo(), this.jetMat);
    m.position.set(at[0], at[1], at[2]);
    m.visible = false;
    m.userData = { r, l };
    m.renderOrder = 3;
    this.body.add(m);
    this.jets.push(m);
    if (!this.fx.jet) this.fx.jet = () => {};
  }

  /** A line let down from `at`, with what hangs on its end: `line` from 0 to 1 lets it down to REACH.line. */
  line(at: V3, end: GeoBuilder): void {
    const p = this.pivot(at);
    const lg = new GeoBuilder();
    block(lg, [-0.035, -1, -0.035], [0.035, 0, 0.035], STEEL);
    const rope = this.solid(lg, p);
    const hook = this.solid(end, p);
    rope.visible = hook.visible = false;
    this.fx.line = (f) => {
      const l = REACH.line * f;
      rope.visible = hook.visible = l > 0.05;
      rope.scale.set(1, Math.max(0.01, l), 1);
      hook.position.y = -l;
    };
  }

  at(x: number, y: number, z: number, heading: number, pitch = 0, roll = 0): void {
    this.root.position.set(x, y, z);
    this.root.rotation.set(roll, -heading, pitch, 'YZX');
  }

  run(speed: number, dt: number): void {
    this.speed = speed;
    this.ran = true;
    for (const w of this.wheels) w.m.rotation.z -= (speed * dt) / w.r;
    this.onRun?.(speed, dt);
  }

  lights(f: number): void {
    this.lit = clamp01(f);
  }

  trick(name: string, f: number): void {
    const fn = this.fx[name];
    if (!fn) return;
    const v = clamp01(f);
    this.value[name] = v;
    fn(v);
  }

  seat(i = 0): [number, number, number] {
    const s = this.seats[Math.min(Math.max(0, Math.floor(i)), this.seats.length - 1)];
    this.body.updateMatrix();
    this.root.updateMatrix();
    this.v.set(s[0], s[1], s[2]).applyMatrix4(this.body.matrix).applyMatrix4(this.root.matrix);
    return [this.v.x, this.v.y, this.v.z];
  }

  shown(v: boolean): void {
    this.root.visible = v;
  }

  /** Every frame it is shown: its lamps for the hour, its rotors, its jets, its bobbing. */
  update(dt: number, time: number, night: number): void {
    if (!this.ran) this.speed = 0;
    this.ran = false;
    const lit = this.lit;
    if (this.lampMat) this.lampMat.color.setScalar(0.42 + lit * (0.8 + 2.0 * night));
    if (this.haloMat) this.haloMat.opacity = lit * (0.12 + 0.72 * night);
    if (this.beamMat) this.beamMat.opacity = lit * (0.04 + 0.42 * night);
    for (const s of this.spinners) s.m.rotation[s.axis] += s.rate * dt;
    const burn = Math.max(this.value.jet ?? 0, this.cruise * Math.min(1, Math.abs(this.speed) / 20));
    this.jets.forEach((j, i) => {
      j.visible = burn > 0.02;
      if (!j.visible) return;
      const { r, l } = j.userData as { r: number; l: number };
      const fl = 0.86 + 0.1 * Math.sin(time * 51 + i * 2.1) + 0.06 * Math.sin(time * 23 + i);
      const w = r * (0.7 + 0.3 * burn);
      j.scale.set(Math.max(0.05, l * burn * fl), w, w);
    });
    if (this.jetMat) this.jetMat.opacity = Math.min(1, 0.35 + 0.65 * burn);
    if (this.boat) {
      const plane = Math.min(0.06, Math.abs(this.speed) * 0.0035);
      this.body.position.y = Math.sin(time * 1.9) * 0.05 + plane * 2;
      this.body.rotation.z = plane + Math.sin(time * 1.3) * 0.015;
      this.body.rotation.x = Math.sin(time * 1.1 + 0.7) * 0.025;
    }
    this.each?.(dt, time, night);
  }
}

/** The swept fin the Bat-family share, rising from `y0` at `z0` across and leaning out by `cant`: its outline along the machine and up the fin. */
function batFin(g: GeoBuilder, outline: P2[], y0: number, z0: number, cant: number): void {
  for (const s of [-1, 1]) {
    const v: V3 = [0, Math.cos(cant), s * Math.sin(cant)];
    slab(g, outline, [0, y0, s * z0], AX, v, unit(cross(AX, v)), -0.05, 0.05, BAT, BAT_EDGE);
  }
}

// ---------------------------------------------------------------------------
// The Batmobile
// ---------------------------------------------------------------------------

/**
 * Long, low and black. A narrow body runs from a blunt prow, lit by a thin
 * amber bar, down a long nose with a ridge along it to a slim canopy for two
 * set well back; four pods over the wheels make it wide, the front pair with
 * amber slits in their noses, the rear pair taller, each carrying a swept fin
 * whose trailing edge is scalloped like a bat's wing; between the fins the
 * nozzle of its jet, and thin red lamps across its tail.
 */
function batmobile(k: Build, mat: THREE.Material): Rig {
  const r = new Rig('batmobile', k, mat);
  const g = new GeoBuilder(), lg = new GeoBuilder(), halos: Halo[] = [];
  const NW = 0.84; // half the narrow body's width, between the wheels
  const rings = [
    body8(4.75, 0.6, 0.36, 0.8, 0.42, 0.6, 0.54, 0.7),
    body8(4.45, 0.7, 0.3, 0.88, 0.38, 0.66, 0.62, 0.8),
    body8(3.75, 0.68, 0.28, NW, 0.38, 0.74, 0.6, 0.9),
    body8(2.05, 0.68, 0.28, NW, 0.4, 0.86, 0.62, 1.02),
    body8(1.7, 1.25, 0.3, 1.66, 0.46, 0.9, 1.04, 1.07),
    body8(-0.3, 1.3, 0.3, 1.68, 0.46, 0.94, 1.02, 1.1),
    body8(-1.85, 1.3, 0.3, 1.66, 0.46, 0.98, 1.0, 1.14),
    body8(-2.15, 0.68, 0.3, NW, 0.46, 1.0, 0.7, 1.18),
    body8(-3.8, 0.68, 0.32, NW, 0.46, 1.02, 0.7, 1.2),
    body8(-4.2, 0.85, 0.36, 1.08, 0.48, 1.04, 0.86, 1.18),
    body8(-4.75, 0.8, 0.42, 1.04, 0.5, 1.0, 0.82, 1.12),
  ];
  const BAND = [BAT_DARK, BAT, BAT, BAT_TOP, BAT, BAT, BAT_DARK, BAT_UNDER];
  // the cockpit's floor, under the canopy, is dark
  loft(g, rings, (j, s) => (j === 3 && s === 5 ? BAT_DARK : BAND[j]), { capA: BAT_EDGE, capB: BAT_DARK });

  // --- the pods over the wheels ---
  const POD: P2[] = [[0.86, 0.74], [1.6, 0.72], [1.7, 0.82], [1.7, 1.4], [1.5, 1.62], [1.06, 1.62], [0.86, 1.44]];
  const REAR: P2[] = [[0.86, 0.74], [1.6, 0.72], [1.7, 0.82], [1.7, 1.42], [1.5, 1.7], [1.04, 1.7], [0.86, 1.5]];
  const PB = [BAT_UNDER, BAT, BAT, BAT, BAT_TOP, BAT, BAT_DARK];
  for (const s of [-1, 1]) {
    const m = (p: P2[]): P2[] => (s < 0 ? mirror(p) : p);
    loft(g, [
      ring(4.05, m(scaled(POD, 0.5, 0.42, 1.28, 1.0))),
      ring(3.7, m(scaled(POD, 0.96, 0.9, 1.28, 1.17))),
      ring(2.2, m(POD)),
      ring(1.6, m(scaled(POD, 1, 0.6, 1.28, 0.72))),
      ring(1.15, m(scaled(POD, 0.9, 0.3, 1.28, 0.74))),
    ], (j) => PB[j], { capA: BAT_EDGE, capB: BAT });
    loft(g, [
      ring(-1.45, m(scaled(REAR, 0.9, 0.3, 1.3, 0.8))),
      ring(-2.2, m(scaled(REAR, 1, 0.94, 1.3, 0.72))),
      ring(-3.75, m(REAR)),
      ring(-4.55, m(scaled(REAR, 0.86, 0.72, 1.3, 1.0))),
    ], (j) => PB[j], { capA: BAT, capB: BAT_EDGE });
    // an intake in each sill, ahead of the rear wheel
    quadTo(g, [-0.5, 0.56, s * 1.7], [-1.6, 0.56, s * 1.7], [-1.6, 0.86, s * 1.7], [-0.5, 0.86, s * 1.7], BAT_DARK, [0, 0, s]);
    for (const x of [-0.85, -1.25]) quadTo(g, [x, 0.56, s * 1.715], [x - 0.08, 0.56, s * 1.715], [x - 0.08, 0.86, s * 1.715], [x, 0.86, s * 1.715], BAT_EDGE, [0, 0, s]);
    // vents in the bonnet either side of its ridge
    for (const [z0, z1] of [[0.24, 0.34], [0.42, 0.52]]) {
      const yh = (x: number): number => 0.9 + ((3.75 - x) / 1.7) * 0.12 + 0.016;
      quadTo(g, [3.45, yh(3.45), s * z0], [2.5, yh(2.5), s * z0], [2.5, yh(2.5), s * z1], [3.45, yh(3.45), s * z1], BAT_DARK, [0, 1, 0]);
    }
  }
  // the ridge down the nose, and a chin under the prow
  g.beam([4.62, 0.76, 0], [2.05, 1.05, 0], 0.06, 0.09, BAT_EDGE);
  g.beam([2.05, 1.05, 0], [-0.1, 1.13, 0], 0.09, 0.1, BAT_EDGE);
  block(g, [4.3, 0.24, -0.86], [4.79, 0.31, 0.86], BAT_EDGE);
  // two seat backs in the cockpit, seen when the canopy is open
  block(g, [-1.42, 1.0, -0.32], [-1.26, 1.5, 0.32], BAT_EDGE);
  block(g, [-2.38, 1.06, -0.3], [-2.22, 1.48, 0.3], BAT_EDGE);

  // --- the fins: swept back from the rear pods, scalloped behind like a bat's wing ---
  const lead: P2[] = [[-2.2, -0.25], [-2.9, 0.14], [-3.6, 0.36], [-4.25, 0.53], [-4.72, 0.62]];
  batFin(g, [...lead, ...scallops([-4.72, 0.62], [-4.3, -0.25], 2, 0.13, [1, 0.12])], 1.62, 1.27, 0.38);

  // --- the jet's nozzle between them ---
  frustum(g, [-4.35, 0.78, 0], [-4.82, 0.78, 0], 0.36, 0.33, 12, BAT_EDGE, { capA: false, capB: BAT_DARK });
  frustum(g, [-4.81, 0.78, 0], [-4.84, 0.78, 0], 0.26, 0.26, 12, 0x5a3a2a, { capA: false, capB: 0x3a2418 });
  r.jet([-4.85, 0.78, 0], 0.31, 2.6);

  // --- the canopy, which slides back ---
  const CAN: P2[] = [[0.52, 1.06], [0.54, 1.38], [0.3, 1.74], [-0.3, 1.74], [-0.54, 1.38], [-0.52, 1.06]];
  const cg = new GeoBuilder();
  loft(cg, [
    ring(-0.12, scaled(CAN, 0.55, 0.1, 0, 1.06)),
    ring(-0.6, scaled(CAN, 0.88, 0.62, 0, 1.06)),
    ring(-1.4, CAN),
    ring(-2.1, scaled(CAN, 0.94, 0.86, 0, 1.06)),
    ring(-2.75, scaled(CAN, 0.62, 0.3, 0, 1.06)),
  ], (j) => (j === 0 || j === 4 ? BAT : j === 5 ? BAT_DARK : BAT_GLASS), { win: (j) => (j >= 1 && j <= 3 ? interior(0.5) : undefined), capA: BAT, capB: BAT });
  cg.beam([-0.6, 1.49, 0], [-1.4, 1.75, 0], 0.035, 0.035, BAT_EDGE);
  cg.beam([-1.4, 1.75, 0], [-2.1, 1.65, 0], 0.035, 0.035, BAT_EDGE);
  const canopy = r.solid(cg);
  r.fx.canopy = (f) => canopy.position.set(-1.5 * smooth(0.15, 1, f), 0.32 * smooth(0, 0.3, f), 0);

  // --- lamps: thin amber in front, red behind ---
  lamp(lg, halos, [4.74, 0.5, -0.58], [4.795, 0.56, 0.58], AMBER);
  for (const s of [-1, 1]) {
    halos.push({ at: [4.82, 0.53, s * 0.36], r: 0.42, color: AMBER });
    lamp(lg, halos, [4.02, 0.98, s * 1.1], [4.1, 1.04, s * 1.46], AMBER, 0.38);
    lamp(lg, halos, [-4.79, 0.92, s * 0.42], [-4.74, 0.98, s * 0.95], RED_LAMP, 0.36);
    lamp(lg, halos, [-4.6, 1.12, s * 1.06], [-4.53, 1.19, s * 1.5], RED_LAMP, 0.32);
  }
  r.lamps(lg, halos);
  r.solid(g);
  r.wheel(wheelGeo(0.72, 0.68), 0.72, [[2.9, 0.72, 1.22], [2.9, 0.72, -1.22], [-3.0, 0.72, 1.22], [-3.0, 0.72, -1.22]]);
  r.beam(4.8, 9, 5.4, 0xffd9a0);
  r.blob(10.2, 4.0);
  // tandem seats under the canopy: the driver's, and the one behind
  r.seats = [[-1.0, 0.5, 0], [-1.95, 0.56, 0]];
  return r;
}

// ---------------------------------------------------------------------------
// The Batboat
// ---------------------------------------------------------------------------

/** A black speedboat with a raised spine on its foredeck, a low cockpit behind a raked windscreen, the Batmobile's two fins at its stern and a jet's nozzle in its transom. */
function batboat(k: Build, mat: THREE.Material): Rig {
  const r = new Rig('batboat', k, mat);
  r.boat = true;
  const g = new GeoBuilder(), lg = new GeoBuilder(), halos: Halo[] = [];
  // a sharp, rising bow, a crowned deck and topsides that lean in a little
  const H = (x: number, yk: number, zc: number, ych: number, zg: number, yg: number, zd: number, yd: number, yc: number): Ring =>
    ring(x, [[0, yk], [zc, ych], [zg, yg], [zd, yd], [0, yc], [-zd, yd], [-zg, yg], [-zc, ych]]);
  const hull = [
    H(4.5, 0.6, 0.03, 0.8, 0.05, 1.25, 0.04, 1.3, 1.33),
    H(3.9, 0.15, 0.45, 0.45, 0.7, 1.1, 0.6, 1.2, 1.38),
    H(3.0, -0.25, 0.95, 0.1, 1.2, 1.02, 1.05, 1.15, 1.32),
    H(1.6, -0.48, 1.25, -0.05, 1.48, 0.98, 1.3, 1.12, 1.25),
    H(0.4, -0.55, 1.32, -0.1, 1.5, 0.95, 1.34, 1.08, 1.18),
    H(-2.2, -0.55, 1.3, -0.12, 1.5, 0.92, 1.36, 1.05, 1.12),
    H(-4.5, -0.45, 1.22, -0.1, 1.4, 0.88, 1.28, 1.0, 1.08),
  ];
  const HB = [BAT_UNDER, BAT, BAT_EDGE, BAT_TOP, BAT_TOP, BAT_EDGE, BAT, BAT_UNDER];
  loft(g, hull, (j) => HB[j], { skip: (j, s) => (j === 3 || j === 4) && s === 4, capA: BAT, capB: BAT_EDGE });
  // the cockpit, let into the deck
  const FL = 0.5, WELL = 0x24272e;
  for (const s of [-1, 1]) {
    quadTo(g, [0.4, 1.08, s * 1.34], [-2.2, 1.05, s * 1.36], [-2.2, FL, s * 1.36], [0.4, FL, s * 1.34], WELL, [0, 0, -s]);
    for (const [x, yd, yc, zd, dx] of [[0.4, 1.08, 1.18, 1.34, -1], [-2.2, 1.05, 1.12, 1.36, 1]]) {
      quadTo(g, [x, yd, s * zd], [x, yc, 0], [x, FL, 0], [x, FL, s * zd], WELL, [dx, 0, 0]);
    }
  }
  quadTo(g, [0.4, FL, -1.34], [0.4, FL, 1.34], [-2.2, FL, 1.36], [-2.2, FL, -1.36], BAT_DARK, [0, 1, 0]);
  // a hatch over the engine, with a vent
  block(g, [-3.9, 0.95, -0.62], [-2.5, 1.24, 0.62], BAT_EDGE, BAT_TOP);
  quadTo(g, [-3.6, 1.245, -0.4], [-2.8, 1.245, -0.4], [-2.8, 1.245, 0.4], [-3.6, 1.245, 0.4], BAT_DARK, [0, 1, 0]);
  block(g, [-1.75, FL, -1.15], [-0.95, 1.1, 1.15], BAT_EDGE, BAT_DARK, 'NESWT');
  block(g, [-2.1, FL, -1.15], [-1.75, 1.5, 1.15], BAT_EDGE, BAT_DARK, 'NESWT');
  // a small wheel and a dash
  block(g, [-0.1, FL, -1.2], [0.4, 1.0, 1.2], BAT_DARK, BAT_EDGE, 'NESWT');
  frustum(g, [-0.15, 1.12, -0.5], [-0.22, 1.18, -0.5], 0.22, 0.22, 8, BAT_EDGE);
  // the windscreen, raked back
  const wv = unit([-0.6, 0.8, 0]);
  slab(g, [[-1.2, 0], [1.2, 0], [0.9, 0.62], [-0.9, 0.62]], [0.62, 1.1, 0], AZ, wv, unit(cross(AZ, wv)), -0.03, 0.03, BAT_GLASS, BAT_EDGE);
  // the spine along the foredeck
  g.beam([4.4, 1.34, 0], [3.9, 1.39, 0], 0.05, 0.07, BAT_EDGE);
  g.beam([3.9, 1.39, 0], [0.75, 1.2, 0], 0.07, 0.09, BAT_EDGE);
  // the fins
  const lead: P2[] = [[-2.5, -0.15], [-3.1, 0.3], [-3.7, 0.75], [-4.15, 1.08], [-4.45, 1.3]];
  batFin(g, [...lead, ...scallops([-4.45, 1.3], [-4.3, -0.15], 2, 0.16, [1, 0.1])], 1.0, 0.95, 0.38);
  // the nozzle of its jet
  frustum(g, [-4.2, 0.42, 0], [-4.62, 0.42, 0], 0.36, 0.32, 12, BAT_EDGE, { capA: false, capB: BAT_DARK });
  r.jet([-4.63, 0.42, 0], 0.26, 2.6);
  // lamps: amber at the bow, red at the stern
  for (const s of [-1, 1]) {
    lamp(lg, halos, [3.2, 1.25, s * 0.42], [3.8, 1.32, s * 0.52], AMBER, 0.36);
    lamp(lg, halos, [-4.56, 0.7, s * 0.55], [-4.49, 0.78, s * 1.05], RED_LAMP, 0.34);
  }
  r.lamps(lg, halos);
  r.solid(g);
  // its wake, which grows with its speed
  const wakeMat = additive({ map: roundTex(), color: 0xe8f2f6, side: THREE.FrontSide });
  const wake = r.patch(r.root, -15, -3.5, -3.6, 3.6, 0.05, wakeMat);
  const bowWave = r.patch(r.root, -3, 5.2, -2.6, 2.6, 0.04, additive({ map: roundTex(), color: 0xc9dde4, side: THREE.FrontSide }));
  r.each = (_dt, _t, night) => {
    const f = Math.min(1, Math.abs(r.speed) / 24);
    wake.visible = bowWave.visible = f > 0.03;
    wakeMat.opacity = f * (0.5 - 0.2 * night);
    (bowWave.material as THREE.MeshBasicMaterial).opacity = f * (0.3 - 0.1 * night);
  };
  r.seats = [[-1.3, FL, -0.55], [-1.3, FL, 0.55]];
  return r;
}

// ---------------------------------------------------------------------------
// The Batplane
// ---------------------------------------------------------------------------

/** A black jet: a long pointed nose and a bubble canopy, wings swept back whose trailing edges are scalloped in three like a bat's, twin tails canted out, and two nozzles. */
function batplane(k: Build, mat: THREE.Material): Rig {
  const r = new Rig('batplane', k, mat);
  r.cruise = 0.35;
  const g = new GeoBuilder(), lg = new GeoBuilder(), halos: Halo[] = [];
  const CY = 0.75;
  const fus = ([[5.0, 0.02], [4.4, 0.28], [3.4, 0.52], [2.0, 0.7], [0.0, 0.78], [-2.0, 0.75], [-3.8, 0.66], [-4.6, 0.58]] as P2[]).map(([x, rr]) => ring(x, oct(rr, CY)));
  const FB = [BAT, BAT, BAT, BAT_TOP, BAT, BAT, BAT, BAT_UNDER];
  loft(g, fus, (j) => FB[j], { capA: BAT, capB: BAT_DARK });
  // the canopy
  const PC: P2[] = [[0.42, 1.06], [0.44, 1.4], [0.24, 1.72], [-0.24, 1.72], [-0.44, 1.4], [-0.42, 1.06]];
  loft(g, [ring(3.7, scaled(PC, 0.5, 0.15, 0, 1.06)), ring(3.1, scaled(PC, 0.85, 0.65, 0, 1.06)), ring(2.2, PC), ring(1.2, scaled(PC, 0.92, 0.8, 0, 1.06)), ring(0.4, scaled(PC, 0.55, 0.2, 0, 1.06))],
    (j) => (j === 5 ? BAT_DARK : j === 0 || j === 4 ? BAT : BAT_GLASS), { win: (j) => (j >= 1 && j <= 3 ? interior(0.5) : undefined), capA: BAT, capB: BAT });
  // the wings: swept, their trailing edges scalloped in three
  const lead: P2[] = [[2.4, 0.5], [1.2, 1.6], [-0.2, 2.9], [-1.6, 4.4], [-2.5, 5.5]];
  const wing: P2[] = [
    ...lead,
    ...scallops([-2.5, 5.5], [-3.35, 3.9], 1, 0.42, [1, 0.3]),
    ...scallops([-3.35, 3.9], [-3.75, 2.25], 1, 0.4, [1, 0.12]),
    ...scallops([-3.75, 2.25], [-3.8, 0.5], 1, 0.36, [1, 0]),
  ];
  for (const s of [-1, 1]) slab(g, s < 0 ? flip(wing) : wing, [0, 0.62, 0], AX, AZ, [0, -1, 0], -0.08, 0.08, BAT, BAT_EDGE);
  // twin tails, canted out
  for (const s of [-1, 1]) {
    const v: V3 = [0, Math.cos(0.26), s * Math.sin(0.26)];
    slab(g, [[-2.3, -0.2], [-4.4, -0.2], ...scallops([-4.4, -0.2], [-4.95, 1.48], 1, 0.16, [1, -0.2]), [-4.35, 1.55]], [0, 1.0, s * 0.5], AX, v, unit(cross(AX, v)), -0.05, 0.05, BAT, BAT_EDGE);
    // the intakes either side, and the nozzles
    rbox(g, [0.8, 0.72, s * 0.8], [0.7, 0.2, 0.14], AX, AY, AZ, BAT_DARK);
    frustum(g, [-4.25, 0.72, s * 0.32], [-4.85, 0.72, s * 0.32], 0.3, 0.27, 10, BAT_EDGE, { capA: false, capB: BAT_DARK });
    r.jet([-4.86, 0.72, s * 0.32], 0.22, 2.8);
  }
  // lamps: red to port, green to starboard, white on the tails, and a landing lamp under the nose
  lamp(lg, halos, [-2.62, 0.58, -5.56], [-2.4, 0.68, -5.4], RED_LAMP, 0.5);
  lamp(lg, halos, [-2.62, 0.58, 5.4], [-2.4, 0.68, 5.56], GREEN_LAMP, 0.5);
  for (const s of [-1, 1]) lamp(lg, halos, [-5.0, 2.38, s * 0.84], [-4.9, 2.48, s * 0.94], WHITE_LAMP, 0.3);
  lamp(lg, halos, [3.4, 0.28, -0.12], [3.7, 0.34, 0.12], AMBER, 0.45);
  r.lamps(lg, halos);
  r.solid(g);
  r.seats = [[2.1, 0.5, 0]];
  return r;
}

// ---------------------------------------------------------------------------
// The Batgyro
// ---------------------------------------------------------------------------

/** The Whirly-Bat: a one-man helicopter, an open seat on a frame, a bat's head for its nose fairing, a two-bladed rotor on a mast, a tail boom with a small rotor, and skids. */
function batgyro(k: Build, mat: THREE.Material): Rig {
  const r = new Rig('batgyro', k, mat);
  const g = new GeoBuilder(), lg = new GeoBuilder(), halos: Halo[] = [];
  for (const s of [-1, 1]) {
    // skids, turned up in front, and their struts
    frustum(g, [-1.3, 0.08, s * 0.85], [1.3, 0.08, s * 0.85], 0.07, 0.07, 6, BAT_EDGE);
    frustum(g, [1.3, 0.08, s * 0.85], [1.62, 0.34, s * 0.85], 0.07, 0.06, 6, BAT_EDGE);
    for (const x of [-0.6, 0.7]) g.beam([x, 0.08, s * 0.85], [x * 0.9, 0.5, s * 0.4], 0.045, 0.045, BAT_EDGE);
  }
  // the frame and the seat
  block(g, [-0.65, 0.4, -0.45], [0.95, 0.5, 0.45], BAT_EDGE);
  block(g, [-0.45, 0.5, -0.36], [0.15, 1.05, 0.36], BAT_DARK, BAT);
  block(g, [-0.6, 0.5, -0.36], [-0.45, 1.75, 0.36], BAT_DARK);
  // the engine behind the seat, the mast, and the tail boom
  block(g, [-1.25, 0.5, -0.38], [-0.6, 1.95, 0.38], BAT, BAT_TOP);
  frustum(g, [-1.25, 1.0, 0.25], [-1.6, 0.95, 0.3], 0.1, 0.09, 6, GREY, { capB: BAT_DARK });
  frustum(g, [-0.4, 1.9, 0], [-0.4, 2.58, 0], 0.08, 0.07, 6, BAT_EDGE);
  frustum(g, [-1.2, 1.3, 0], [-3.05, 1.48, 0], 0.15, 0.07, 6, BAT);
  slab(g, [[-2.6, 1.4], [-3.1, 1.42], [-3.15, 2.05], [-2.88, 2.0]], [0, 0, 0], AX, AY, AZ, -0.03, 0.03, BAT, BAT_EDGE);
  // the nose fairing: a bat's head with two ears, leaning back, and amber eyes
  const fv = unit([-0.28, 1, 0]), fn = unit(cross(AZ, fv)), fo: V3 = [1.0, 0.5, 0];
  const head: P2[] = [[0, -0.05], [0.3, 0.1], [0.5, 0.55], [0.46, 0.82], [0.36, 1.5], [0.17, 0.9], [0, 0.82], [-0.17, 0.9], [-0.36, 1.5], [-0.46, 0.82], [-0.5, 0.55], [-0.3, 0.1]];
  slab(g, head, fo, AZ, fv, fn, -0.06, 0.06, BAT, BAT_EDGE);
  for (const s of [-1, 1]) {
    const c = add(add(fo, mul(AZ, s * 0.22)), mul(fv, 0.72));
    const f = mul(fn, Math.sign(fn[0]) * 0.07);
    lamp(lg, halos, add(c, add(f, [-0.04, -0.035, -0.1])), add(c, add(f, [0.04, 0.035, 0.1])), AMBER, 0.22);
  }
  lamp(lg, halos, [-3.08, 2.05, -0.04], [-2.98, 2.13, 0.04], RED_LAMP, 0.25);
  // the rotor and the tail rotor
  const rg = new GeoBuilder();
  frustum(rg, [0, -0.06, 0], [0, 0.08, 0], 0.16, 0.12, 8, BAT_EDGE);
  rbox(rg, [0, 0.02, 0], [2.95, 0.025, 0.15], AX, AY, AZ, BAT);
  for (const s of [-1, 1]) rbox(rg, [s * 2.82, 0.03, 0], [0.13, 0.026, 0.155], AX, AY, AZ, BAT_EDGE);
  r.spinner(rg, [-0.4, 2.62, 0], 'y', 19, 2.95);
  const tg = new GeoBuilder();
  rbox(tg, [0, 0, 0], [0.07, 0.5, 0.02], AX, AY, AZ, BAT);
  r.spinner(tg, [-3.0, 1.5, 0.12], 'z', 42);
  // the line it lets down, with a bar to hold
  const bar = new GeoBuilder();
  frustum(bar, [0, -0.04, -0.4], [0, -0.04, 0.4], 0.05, 0.05, 6, BAT_EDGE);
  r.line([0.1, 0.42, 0], bar);
  r.lamps(lg, halos);
  r.solid(g);
  r.seats = [[-0.15, 0.45, 0]];
  return r;
}

// ---------------------------------------------------------------------------
// The motorcycles
// ---------------------------------------------------------------------------

/** The Batcycle: black, a fairing in the shape of a bat's head with amber eyes, a slender frame, and two small swept fins at its tail. */
function batcycle(k: Build, mat: THREE.Material): Rig {
  const r = new Rig('batcycle', k, mat);
  const g = new GeoBuilder(), lg = new GeoBuilder(), halos: Halo[] = [];
  const frame = [
    ring(1.62, hex(0.3, 1.36, 1.62)), ring(0.95, hex(0.26, 1.08, 1.45)), ring(0.4, hex(0.42, 0.58, 1.52)), ring(-0.2, hex(0.4, 0.5, 1.22)),
    ring(-0.75, hex(0.36, 0.75, 1.25)), ring(-1.3, hex(0.3, 1.25, 1.42)), ring(-1.95, hex(0.15, 1.24, 1.44)),
  ];
  const FB = [BAT_DARK, BAT, BAT, BAT_TOP, BAT, BAT, BAT_DARK, BAT_UNDER];
  loft(g, frame, (j) => FB[j], { capA: BAT, capB: BAT_EDGE });
  // the saddle, the engine and its pipe, the fork and the swing arm, the bars
  block(g, [-1.05, 1.2, -0.3], [-0.15, 1.34, 0.3], BAT_DARK, 0x2a2a30);
  block(g, [-0.5, 0.32, -0.3], [0.5, 0.75, 0.3], RIM_DARK, GREY);
  frustum(g, [-0.2, 0.42, 0.33], [-1.75, 0.8, 0.3], 0.09, 0.08, 6, GREY, { capB: BAT_DARK });
  for (const s of [-1, 1]) {
    g.beam([1.0, 1.28, s * 0.22], [1.45, 0.62, s * 0.25], 0.05, 0.045, BAT_EDGE);
    g.beam([-0.45, 0.68, s * 0.22], [-1.42, 0.62, s * 0.25], 0.055, 0.045, BAT_EDGE);
  }
  g.beam([0.9, 1.62, -0.5], [0.9, 1.62, 0.5], 0.035, 0.035, BAT_EDGE);
  // the fairing: a bat's head, leaning back, with two ears and two amber eyes
  const fv = unit([-0.35, 1, 0]), fn = unit(cross(AZ, fv)), fo: V3 = [1.75, 1.05, 0];
  const head: P2[] = [[0, -0.03], [0.24, 0.08], [0.38, 0.42], [0.35, 0.6], [0.27, 1.05], [0.13, 0.66], [0, 0.6], [-0.13, 0.66], [-0.27, 1.05], [-0.35, 0.6], [-0.38, 0.42], [-0.24, 0.08]];
  slab(g, head, fo, AZ, fv, fn, -0.07, 0.07, BAT, BAT_EDGE);
  const out = mul(fn, Math.sign(fn[0]));
  for (const s of [-1, 1]) {
    const c = add(add(add(fo, mul(AZ, s * 0.15)), mul(fv, 0.52)), mul(out, 0.08));
    lamp(lg, halos, add(c, [-0.03, -0.03, -0.075]), add(c, [0.03, 0.03, 0.075]), AMBER, 0.2);
  }
  {
    const c = add(add(fo, mul(fv, 0.22)), mul(out, 0.08));
    lamp(lg, halos, add(c, [-0.03, -0.025, -0.16]), add(c, [0.03, 0.025, 0.16]), AMBER, 0.3);
  }
  // the fins at its tail
  for (const s of [-1, 1]) {
    const v: V3 = [0, Math.cos(0.5), s * Math.sin(0.5)];
    slab(g, [[-0.95, -0.05], [-1.5, 0.25], [-2.06, 0.62], ...scallops([-2.06, 0.62], [-1.9, -0.05], 1, 0.12, [1, 0])], [0, 1.38, s * 0.1], AX, v, unit(cross(AX, v)), -0.035, 0.035, BAT, BAT_EDGE);
  }
  lamp(lg, halos, [-2.0, 1.27, -0.08], [-1.94, 1.35, 0.08], RED_LAMP, 0.25);
  r.lamps(lg, halos);
  r.solid(g);
  r.wheel(wheelGeo(0.62, 0.42), 0.62, [[1.45, 0.62, 0], [-1.42, 0.62, 0]]);
  r.beam(2.1, 7, 3.4, 0xffd9a0);
  r.blob(4.6, 1.5);
  r.seats = [[-0.6, 1.34 - SEAT_RISE, 0]];
  return r;
}

/** The Red Hood's motorcycle: a plain heavy machine, a red tank and fenders on a black frame, a round headlamp, an engine and pipes in steel. */
function redCycle(k: Build, mat: THREE.Material): Rig {
  const r = new Rig('redCycle', k, mat);
  const g = new GeoBuilder(), lg = new GeoBuilder(), halos: Halo[] = [];
  const frame = [
    ring(1.0, hex(0.2, 1.05, 1.35)), ring(0.55, hex(0.42, 0.95, 1.58)), ring(-0.15, hex(0.38, 0.85, 1.42)), ring(-0.3, hex(0.3, 0.8, 1.25)),
    ring(-1.3, hex(0.28, 1.22, 1.38)), ring(-1.9, hex(0.15, 1.22, 1.38)),
  ];
  loft(g, frame, (j, s) => (j === 7 ? BAT_UNDER : s <= 1 ? (j === 3 ? HOOD_RED : j === 0 || j === 6 ? HOOD_RED_DARK : HOOD_RED) : BAT), { capA: BAT, capB: BAT });
  // the saddle, the engine with its two cylinders, the pipes
  block(g, [-1.15, 1.22, -0.3], [-0.25, 1.4, 0.3], BAT_DARK, 0x2a2a30);
  block(g, [-0.5, 0.3, -0.32], [0.45, 0.85, 0.32], GREY, STEEL);
  for (const a of [-0.45, 0.45]) frustum(g, [0, 0.8, 0], [Math.sin(a) * 0.6, 0.8 + Math.cos(a) * 0.55, 0], 0.2, 0.17, 8, STEEL, { capB: CHROME });
  for (const y of [0.42, 0.6]) frustum(g, [0.3, y, 0.34], [-1.85, y + 0.2, 0.36], 0.08, 0.08, 6, CHROME, { capB: BAT_DARK });
  // fork, swing arm, bars, and the round headlamp
  for (const s of [-1, 1]) {
    g.beam([1.05, 1.32, s * 0.2], [1.38, 0.62, s * 0.26], 0.05, 0.045, CHROME);
    g.beam([-0.45, 0.68, s * 0.22], [-1.38, 0.62, s * 0.27], 0.06, 0.05, BAT);
  }
  g.beam([0.95, 1.72, -0.55], [0.95, 1.72, 0.55], 0.035, 0.035, CHROME);
  g.beam([1.05, 1.32, 0], [0.95, 1.72, 0], 0.04, 0.04, CHROME);
  frustum(g, [1.28, 1.42, 0], [1.55, 1.42, 0], 0.18, 0.22, 10, CHROME, { capB: false });
  lamp(lg, halos, [1.53, 1.3, -0.12], [1.57, 1.54, 0.12], WHITE_LAMP, 0.4);
  // the fenders, red, over both wheels
  for (const [cx, a0, a1] of [[1.38, 0.15, 2.0], [-1.38, 1.3, 2.9]] as V3[]) {
    const pts: V3[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = lerp(a0, a1, i / 8);
      pts.push([cx + Math.cos(a) * 0.78, 0.62 + Math.sin(a) * 0.78, 0]);
    }
    for (let i = 0; i + 1 < pts.length; i++) rbox(g, mul(add(pts[i], pts[i + 1]), 0.5), [len(sub(pts[i + 1], pts[i])) / 2 + 0.02, 0.04, 0.27], unit(sub(pts[i + 1], pts[i])), unit(cross(AZ, unit(sub(pts[i + 1], pts[i])))), AZ, HOOD_RED);
  }
  lamp(lg, halos, [-1.96, 1.24, -0.1], [-1.9, 1.34, 0.1], RED_LAMP, 0.25);
  r.lamps(lg, halos);
  r.solid(g);
  r.wheel(wheelGeo(0.62, 0.46, RIM_DARK, CHROME), 0.62, [[1.38, 0.62, 0], [-1.38, 0.62, 0]]);
  r.beam(1.9, 7, 3.4, 0xfff0d0);
  r.blob(4.4, 1.5);
  r.seats = [[-0.7, 1.4 - SEAT_RISE, 0]];
  return r;
}

// ---------------------------------------------------------------------------
// The Jokermobile
// ---------------------------------------------------------------------------

/**
 * A long-bonneted roadster, white, with the Joker's grinning face for its
 * front: chalk white, green hair spiking over the bonnet, arched black brows
 * and a grin from ear to ear. Purple flowing fenders and running boards,
 * white-walled wheels with green hubs, two green seats behind a low
 * windscreen, a purple boot lid over the glove on its spring, and the plank
 * folded under its nose.
 */
function jokermobile(k: Build, mat: THREE.Material): Rig {
  const r = new Rig('jokermobile', k, mat);
  const g = new GeoBuilder(), lg = new GeoBuilder(), halos: Halo[] = [];
  const rings = [
    body8(4.0, 0.7, 0.5, 0.85, 0.6, 1.3, 0.7, 1.45),
    body8(3.5, 0.75, 0.48, 0.9, 0.6, 1.35, 0.72, 1.5),
    body8(1.95, 0.75, 0.48, 0.9, 0.6, 1.42, 0.72, 1.56),
    body8(1.75, 1.1, 0.48, 1.28, 0.6, 1.45, 1.05, 1.58),
    body8(0.55, 1.1, 0.48, 1.3, 0.6, 1.5, 1.08, 1.6),
    body8(-1.55, 1.1, 0.48, 1.3, 0.6, 1.5, 1.08, 1.6),
    body8(-1.75, 0.75, 0.5, 0.9, 0.62, 1.48, 0.72, 1.62),
    body8(-3.55, 0.75, 0.52, 0.9, 0.64, 1.4, 0.7, 1.55),
    body8(-4.1, 0.6, 0.62, 0.75, 0.72, 1.15, 0.55, 1.3),
    body8(-4.25, 0.4, 0.75, 0.5, 0.82, 1.0, 0.35, 1.08),
  ];
  const BAND = [J_UNDER, J_WHITE, J_WHITE, J_WHITE, J_WHITE, J_WHITE, J_UNDER, J_UNDER];
  // the cockpit is open; the boot's top, under its lid, is dark
  loft(g, rings, (j, s) => (j === 3 && (s === 6 || s === 7) ? J_INK : BAND[j]), { skip: (j, s) => j === 3 && s === 4, capA: J_WHITE, capB: J_WHITE });
  // the cockpit's walls, its dash and its floor
  const CF = 0.55;
  for (const s of [-1, 1]) quadTo(g, [0.55, 1.6, s * 1.08], [-1.55, 1.6, s * 1.08], [-1.55, CF, s * 1.08], [0.55, CF, s * 1.08], J_PURPLE_DARK, [0, 0, -s]);
  quadTo(g, [0.55, 1.6, -1.08], [0.55, 1.6, 1.08], [0.55, CF, 1.08], [0.55, CF, -1.08], J_PURPLE_DARK, [-1, 0, 0]);
  quadTo(g, [-1.55, 1.6, -1.08], [-1.55, 1.6, 1.08], [-1.55, CF, 1.08], [-1.55, CF, -1.08], J_PURPLE_DARK, [1, 0, 0]);
  quadTo(g, [0.55, CF, -1.08], [0.55, CF, 1.08], [-1.55, CF, 1.08], [-1.55, CF, -1.08], J_INK, [0, 1, 0]);
  // two green seats
  for (const s of [-1, 1]) {
    const zc = s * 0.55;
    block(g, [-1.3, CF, zc - 0.42], [-0.4, CF + SEAT_RISE, zc + 0.42], J_GREEN, J_GREEN, 'NESWT');
    block(g, [-1.52, CF, zc - 0.42], [-1.3, 1.62, zc + 0.42], J_GREEN, J_GREEN_DARK, 'NESWT');
  }
  // the wheel and its column
  const sc: V3 = [0.12, 1.42, -0.55], sa = unit([-1, 0.6, 0]);
  frustum(g, sc, add(sc, mul(sa, 0.06)), 0.28, 0.28, 8, J_INK);
  g.beam(sc, [0.55, 1.15, -0.55], 0.03, 0.03, J_INK);
  // the windscreen, framed in purple
  const wv = unit([-0.35, 1, 0]), wo: V3 = [0.62, 1.6, 0];
  slab(g, [[-1.0, 0], [1.0, 0], [0.92, 0.5], [-0.92, 0.5]], wo, AZ, wv, unit(cross(AZ, wv)), -0.025, 0.025, 0xa8c8d8, J_PURPLE);
  g.beam(add(wo, add(mul(AZ, -0.95), mul(wv, 0.52))), add(wo, add(mul(AZ, 0.95), mul(wv, 0.52))), 0.04, 0.04, J_PURPLE);
  // a purple stripe down the bonnet, and a green line along each side
  for (let s = 0; s < 4; s++) {
    const A = rings[s], B = rings[s + 1];
    const ya = A.p[3][1] + 0.012, yb = B.p[3][1] + 0.012;
    quadTo(g, [A.x, ya, -0.15], [B.x, yb, -0.15], [B.x, yb, 0.15], [A.x, ya, 0.15], J_PURPLE, [0, 1, 0]);
  }
  for (let s = 0; s + 1 < rings.length - 1; s++) {
    const A = rings[s], B = rings[s + 1];
    for (const side of [-1, 1]) {
      const za = side * (A.p[1][0] + 0.015), zb = side * (B.p[1][0] + 0.015);
      quadTo(g, [A.x, 1.18, za], [B.x, 1.18, zb], [B.x, 1.25, zb], [A.x, 1.25, za], J_GREEN, [0, 0, side]);
    }
  }

  // --- the fenders and running boards, purple ---
  const FEN = (yt: number): P2[] => [[0.95, yt - 0.34], [1.56, yt - 0.38], [1.6, yt - 0.14], [1.44, yt], [1.06, yt], [0.92, yt - 0.12]];
  const FC = [J_PURPLE_DARK, J_PURPLE, J_PURPLE, J_PURPLE, J_PURPLE, J_PURPLE_DARK];
  for (const s of [-1, 1]) {
    const m = (p: P2[]): P2[] => (s < 0 ? mirror(p) : p);
    loft(g, [
      ring(4.0, m(scaled(FEN(0.95), 0.85, 1, 1.26, 0.8))), ring(3.6, m(FEN(1.45))), ring(2.75, m(FEN(1.74))), ring(1.95, m(FEN(1.48))), ring(1.45, m(FEN(0.98))), ring(1.05, m(FEN(0.72))),
    ], (j) => FC[j], { capA: J_PURPLE, capB: J_PURPLE });
    loft(g, [
      ring(-1.45, m(FEN(0.74))), ring(-1.95, m(FEN(1.42))), ring(-2.7, m(FEN(1.72))), ring(-3.45, m(FEN(1.45))), ring(-3.95, m(scaled(FEN(0.98), 0.9, 1, 1.26, 0.8))),
    ], (j) => FC[j], { capA: J_PURPLE, capB: J_PURPLE });
    block(g, [-1.6, 0.5, s * 1.28], [1.25, 0.6, s * 1.56], J_PURPLE_DARK, J_PURPLE);
    // the headlamps on the front fenders, in chrome
    frustum(g, [3.1, 1.76, s * 1.25], [3.5, 1.76, s * 1.25], 0.2, 0.24, 10, CHROME, { capB: false });
    frustum(g, [3.49, 1.76, s * 1.25], [3.52, 1.76, s * 1.25], 0.2, 0.2, 10, WHITE_LAMP);
    halos.push({ at: [3.56, 1.76, s * 1.25], r: 0.55, color: WHITE_LAMP });
    lamp(lg, halos, [3.495, 1.62, s * 1.25 - 0.13], [3.535, 1.9, s * 1.25 + 0.13], WHITE_LAMP);
    // the tail lamps
    lamp(lg, halos, [-4.0, 0.7, s * 1.12], [-3.93, 0.86, s * 1.38], RED_LAMP, 0.34);
  }

  // --- the face on its nose ---
  const FACE: P2[] = [[0, 0.36], [0.6, 0.42], [1.0, 0.66], [1.15, 1.02], [1.1, 1.42], [0.88, 1.74], [0.48, 1.92], [0, 1.97], [-0.48, 1.92], [-0.88, 1.74], [-1.1, 1.42], [-1.15, 1.02], [-1.0, 0.66], [-0.6, 0.42]];
  const NX: V3 = [-1, 0, 0]; // the normal of the plane across the car, which the face's outline is drawn in
  slab(g, FACE, [3.95, 0, 0], AZ, AY, NX, -0.25, 0, J_FACE, J_FACE);
  // green hair, spiking up over the face and the bonnet
  const HAIR: P2[] = [[-1.12, 1.4], [1.12, 1.4], [1.28, 1.85], [0.98, 1.78], [1.0, 2.12], [0.62, 1.98], [0.5, 2.32], [0.2, 2.06], [0, 2.36], [-0.2, 2.06], [-0.5, 2.32], [-0.62, 1.98], [-1.0, 2.12], [-0.98, 1.78], [-1.28, 1.85]];
  slab(g, HAIR, [3.95, 0, 0], AZ, AY, NX, -0.2, 0.05, J_HAIR, J_GREEN_DARK);
  // its features, painted on its front
  const fo: V3 = [4.2, 0, 0];
  const paint = (p: P2[], lift: number, c: number): void => decal(g, p, fo, AZ, AY, AX, lift, c);
  for (const s of [-1, 1]) {
    const m = (p: P2[]): P2[] => (s < 0 ? mirror(p) : p);
    paint(m([[0.2, 1.38], [0.32, 1.48], [0.5, 1.5], [0.66, 1.42], [0.6, 1.33], [0.42, 1.3], [0.26, 1.32]]), 0.015, J_INK);
    paint(m([[0.38, 1.37], [0.46, 1.36], [0.48, 1.43], [0.4, 1.44]]), 0.03, J_GREEN);
    paint(m([[0.14, 1.56], [0.4, 1.72], [0.76, 1.64], [0.74, 1.58], [0.4, 1.65], [0.16, 1.5]]), 0.015, J_INK);
    paint(m([[0.98, 0.98], [1.06, 1.0], [1.1, 1.14], [1.04, 1.13]]), 0.015, J_INK);
  }
  paint([[0, 1.25], [0.1, 1.07], [0.02, 1.1], [-0.1, 1.07]], 0.015, J_INK);
  paint(grin(1.0, 0.5, 0.5, 0.8, 0.2), 0.015, J_RED);
  paint(grin(0.88, 0.58, 0.36, 0.84, 0.1), 0.03, J_INK);
  paint(grin(0.84, 0.7, 0.22, 0.84, 0.08), 0.045, J_TEETH);
  for (const z of [-0.6, -0.3, 0, 0.3, 0.6]) {
    const q = (z / 0.84) ** 2, lo = 0.7 + 0.22 * q, up = 0.84 + 0.08 * q;
    paint([[z - 0.016, lo], [z + 0.016, lo], [z + 0.016, up], [z - 0.016, up]], 0.06, J_INK);
  }

  // --- the boot lid, hinged at its front edge ---
  const lidG = new GeoBuilder();
  const LR = (x: number, y: number): Ring => ring(x, [[0.68, y], [0.68, y + 0.06], [-0.68, y + 0.06], [-0.68, y]]);
  loft(lidG, [LR(-0.05, 0.006), LR(-1.7, -0.05), LR(-2.2, -0.26)], (j) => (j === 1 ? J_PURPLE : J_PURPLE_DARK), { capA: J_PURPLE_DARK, capB: J_PURPLE_DARK });
  decal(lidG, [[-1.0, -0.1], [-0.82, 0], [-1.0, 0.1], [-1.18, 0]], [0, 0.04, 0], AX, AZ, AY, 0.03, J_GREEN);
  const lidP = r.pivot([-1.8, 1.63, 0]);
  r.solid(lidG, lidP);

  // --- the glove on its spring ---
  const gg = new GeoBuilder();
  const GL = ([[-0.6, 0.22], [-0.48, 0.48], [-0.15, 0.56], [0.2, 0.5], [0.34, 0.4], [0.36, 0.38], [0.62, 0.36]] as P2[]).map(([x, rr]) => ring(x, oct(rr, 0, 1, 1)));
  loft(gg, GL, (_j, s) => (s >= 5 ? J_TEETH : J_RED), { capA: J_RED, capB: J_TEETH });
  frustum(gg, [0.12, 0.08, 0.4], [-0.34, 0.16, 0.5], 0.2, 0.15, 8, J_RED);
  // drawn large, as the comics draw their props: half again a fist's size
  const GS = 1.5;
  const glove = r.solid(gg, r.pivot([0, 0, 0]));
  glove.scale.setScalar(GS);
  const sg = new GeoBuilder();
  const coil: V3[] = [];
  for (let i = 0; i <= 28; i++) coil.push([-i / 28, 0.28 * Math.cos((i * Math.PI) / 2), 0.28 * Math.sin((i * Math.PI) / 2)]);
  sg.sweep(coil, coil.map(() => 0.05), J_GREEN);
  const spring = r.solid(sg, r.pivot([0, 0, 0]));
  glove.visible = spring.visible = false;
  const BASE: P2 = [-2.5, 1.35], TAIL = -4.25;
  r.fx.glove = (f) => {
    lidP.rotation.z = -1.25 * smooth(0, 0.18, f);
    const on = f > 0.01;
    glove.visible = spring.visible = on;
    if (!on) return;
    const ext = smooth(0.12, 1, f), rise = smooth(0.04, 0.16, f);
    const gx = lerp(BASE[0], TAIL - REACH.glove + 0.6 * GS, ext), gy = lerp(BASE[1] + 0.9 * rise, REACH.gloveY, ext);
    glove.parent!.position.set(gx, gy, 0);
    const dx = gx + 0.6 * GS - BASE[0], dy = gy - BASE[1];
    spring.parent!.position.set(BASE[0], BASE[1], 0);
    spring.parent!.rotation.set(0, 0, Math.atan2(-dy, -dx));
    spring.parent!.scale.set(Math.max(0.02, Math.hypot(dx, dy)), 1, 1);
  };

  // --- the plank, folded under its nose ---
  const pg = new GeoBuilder();
  block(pg, [0, 0.02, -1.3], [1, 0.14, 1.3], WOOD, WOOD);
  for (const z of [-0.9, 0.9]) quadTo(pg, [0, 0.146, z - 0.07], [1, 0.146, z - 0.07], [1, 0.146, z + 0.07], [0, 0.146, z + 0.07], J_PURPLE, [0, 1, 0]);
  const plank = r.solid(pg, r.pivot([3.3, 0, 0]));
  plank.visible = false;
  r.fx.plank = (f) => {
    plank.visible = f > 0.005;
    plank.parent!.scale.set(0.95 + REACH.plank * f, 1, 1);
  };

  // --- the cards that stream from its tail ---
  const cg = new GeoBuilder();
  quadTo(cg, [-0.3, -0.43, 0.006], [0.3, -0.43, 0.006], [0.3, 0.43, 0.006], [-0.3, 0.43, 0.006], 0xffffff, [0, 0, 1]);
  quadTo(cg, [-0.3, -0.43, -0.006], [0.3, -0.43, -0.006], [0.3, 0.43, -0.006], [-0.3, 0.43, -0.006], J_PURPLE, [0, 0, -1]);
  decal(cg, [[0, -0.2], [0.14, 0], [0, 0.2], [-0.14, 0]], [0, 0, 0.006], AX, AY, AZ, 0.006, J_RED);
  decal(cg, [[-0.22, -0.35], [0.22, -0.35], [0.22, 0.35], [-0.22, 0.35]], [0, 0, -0.006], AX, AY, [0, 0, -1], 0.006, J_GREEN);
  const N = 18;
  const cards = new THREE.InstancedMesh(cg.build(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), N);
  cards.count = 0;
  cards.frustumCulled = false;
  cards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  r.body.add(cards);
  r.tris += cg.triangles * N;
  r.fx.cards = () => {};
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc3 = new THREE.Vector3();
  r.each = (_dt, time) => {
    const f = r.value.cards ?? 0;
    cards.count = Math.ceil(N * f);
    for (let i = 0; i < cards.count; i++) {
      const t = (time * 0.55 + i / N) % 1, h1 = hash(i), h2 = hash(i, 2);
      p.set(TAIL - 0.3 - t * 7.5, 1.25 + t * 2.4 - t * t * 1.5 + 0.25 * Math.sin(time * 3 + i), (h1 - 0.5) * 1.2 + (h2 - 0.5) * 4.5 * t);
      e.set(time * (2 + h1 * 3) + i, time * (1.5 + h2 * 2), i * 0.7);
      const s = t < 0.85 ? Math.min(1, t * 8) : (1 - t) / 0.15;
      m4.compose(p, q.setFromEuler(e), sc3.setScalar(Math.max(0.01, s)));
      cards.setMatrixAt(i, m4);
    }
    cards.instanceMatrix.needsUpdate = true;
  };

  r.lamps(lg, halos);
  r.solid(g);
  r.wheel(wheelGeo(0.78, 0.55, J_WHITE, J_GREEN, J_GREEN_DARK), 0.78, [[2.75, 0.78, 1.22], [2.75, 0.78, -1.22], [-2.7, 0.78, 1.22], [-2.7, 0.78, -1.22]]);
  r.beam(4.25, 9, 5.4, 0xfff0d0);
  r.blob(9.2, 3.8);
  r.seats = [[-0.85, CF - 0.05, -0.55], [-0.85, CF - 0.05, 0.55]];
  return r;
}

// ---------------------------------------------------------------------------
// The Joker's rowing boat
// ---------------------------------------------------------------------------

/** A little white rowing boat with the Joker's grin painted on its bows, two oars, and a jack-in-the-box in its stern that flies a flag with a grin on it. */
function rowboat(k: Build, mat: THREE.Material): Rig {
  const r = new Rig('rowboat', k, mat);
  r.boat = true;
  const g = new GeoBuilder();
  const IN = (v: number, d: number): number => Math.max(0.005, v - d);
  const shell = (x: number, yk: number, zb: number, yb: number, zg: number, yg: number): Ring =>
    ring(x, [[0, yk], [zb, yb], [zg, yg], [IN(zg, 0.08), yg], [IN(zb, 0.1), yb + 0.1], [0, yk + 0.1], [-IN(zb, 0.1), yb + 0.1], [-IN(zg, 0.08), yg], [-zg, yg], [-zb, yb]]);
  const hull = [shell(2.0, 0.3, 0.03, 0.34, 0.06, 0.74), shell(1.4, -0.2, 0.5, 0.0, 0.62, 0.62), shell(0.0, -0.28, 0.7, -0.05, 0.8, 0.55), shell(-1.4, -0.25, 0.66, -0.03, 0.75, 0.55), shell(-2.0, -0.18, 0.55, 0.0, 0.65, 0.58)];
  const HC = [J_GREEN, J_WHITE, J_PURPLE, WOOD, WOOD_DARK, WOOD_DARK, WOOD, J_PURPLE, J_WHITE, J_GREEN];
  loft(g, hull, (j) => HC[j], { capA: J_PURPLE, capB: J_PURPLE });
  // the grin on each bow
  for (const s of [-1, 1]) {
    const o: V3 = [0.75, 0.282, s * 0.6485];
    const u = unit([1, 0.043, -0.136 * s]), v = unit([0, 0.61, 0.111 * s]);
    let n = unit(cross(u, v));
    if (n[2] * s < 0) n = mul(n, -1);
    decal(g, grin(0.62, -0.2, 0.32, -0.02, 0.14), o, u, v, n, 0.05, J_RED);
    decal(g, grin(0.54, -0.15, 0.23, -0.01, 0.09), o, u, v, n, 0.07, J_INK);
    decal(g, grin(0.5, -0.08, 0.13, -0.01, 0.06), o, u, v, n, 0.09, J_TEETH);
    decal(g, [[0.52, 0.17], [0.6, 0.23], [0.72, 0.2], [0.66, 0.15]], o, u, v, n, 0.05, J_INK);
  }
  // the thwart the Joker rows from, the floor boards, and the oarlocks
  block(g, [0.05, 0.42, -0.7], [0.55, 0.54, 0.7], WOOD, WOOD);
  block(g, [-1.6, -0.12, -0.34], [1.2, -0.06, 0.34], WOOD_DARK, WOOD, 'NESWT');
  for (const s of [-1, 1]) block(g, [0.04, 0.55, s * 0.74], [0.16, 0.7, s * 0.84], STEEL);
  // the jack-in-the-box, with its lid
  block(g, [-1.72, -0.06, -0.25], [-1.22, 0.5, 0.25], J_PURPLE, J_INK);
  for (const [o, n] of [[[-1.22, 0.22, 0], AX], [[-1.47, 0.22, 0.25], AZ], [[-1.47, 0.22, -0.25], [0, 0, -1]]] as [V3, V3][]) {
    const u = Math.abs(n[0]) > 0.5 ? AZ : AX;
    decal(g, [[0, -0.16], [0.13, 0], [0, 0.16], [-0.13, 0]], o, u, AY, n, 0.01, J_GREEN);
  }
  const lidG = new GeoBuilder();
  block(lidG, [0, 0, -0.27], [0.52, 0.06, 0.27], J_GREEN, J_GREEN);
  const lidP = r.pivot([-1.73, 0.5, 0]);
  r.solid(lidG, lidP);
  const jg = new GeoBuilder();
  const coil: V3[] = [];
  for (let i = 0; i <= 20; i++) coil.push([0.13 * Math.cos((i * Math.PI) / 2), i / 20, 0.13 * Math.sin((i * Math.PI) / 2)]);
  jg.sweep(coil, coil.map(() => 0.03), J_GREEN);
  const jack = r.pivot([-1.47, 0.45, 0]);
  const spring = r.solid(jg, jack);
  const hg = new GeoBuilder();
  block(hg, [-0.24, -0.24, -0.24], [0.24, 0.24, 0.24], J_FACE);
  slab(hg, [[-0.26, 0.1], [0.26, 0.1], [0.3, 0.36], [0.14, 0.3], [0.08, 0.44], [-0.04, 0.3], [-0.16, 0.42], [-0.3, 0.32]], [0, 0, 0], AX, AY, AZ, -0.26, 0.26, J_HAIR, J_GREEN_DARK);
  for (const s of [-1, 1]) {
    const fo: V3 = [s * 0.24, 0, 0], u: V3 = [0, 0, -s], n: V3 = [s, 0, 0];
    decal(hg, grin(0.18, -0.16, 0.1, -0.1, 0.04), fo, u, AY, n, 0.01, J_RED);
    decal(hg, grin(0.15, -0.13, 0.06, -0.09, 0.02), fo, u, AY, n, 0.02, J_TEETH);
    for (const e of [-0.09, 0.09]) decal(hg, circle(0.035, 6, 0, e, 0.06), fo, u, AY, n, 0.01, J_INK);
  }
  hg.beam([0, 0.24, 0.18], [0, 1.3, 0.18], 0.025, 0.02, STEEL);
  const head = r.solid(hg, r.pivot([0, 0, 0], jack));
  const flagG = new GeoBuilder();
  slab(flagG, [[0, -0.5], [0.95, -0.5], [0.95, 0], [0, 0]], [0, 0, 0], AX, AY, AZ, -0.01, 0.01, J_FACE, J_FACE);
  for (const s of [-1, 1]) {
    decal(flagG, grin(0.32, -0.4, 0.18, -0.29, 0.07), [0.48, 0, s * 0.01], AX, AY, [0, 0, s], 0.004, J_RED);
    decal(flagG, grin(0.27, -0.36, 0.12, -0.28, 0.04), [0.48, 0, s * 0.01], AX, AY, [0, 0, s], 0.008, J_TEETH);
  }
  const flagP = r.pivot([0, 1.28, 0.18], head.parent!);
  r.solid(flagG, flagP);
  head.parent!.visible = spring.visible = false;
  r.fx.flag = (f) => {
    lidP.rotation.z = 1.9 * smooth(0, 0.2, f);
    const on = f > 0.03;
    head.parent!.visible = spring.visible = on;
    const rise = smooth(0.1, 0.7, f) * 1.0;
    spring.scale.set(1, 0.05 + rise, 1);
    head.parent!.position.y = 0.05 + rise + 0.24;
  };
  // the oars, each turning about its oarlock
  const oars: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const og = new GeoBuilder();
    og.beam([0, 0, -s * 0.85], [0, 0, s * 1.55], 0.035, 0.035, WOOD);
    block(og, [-0.13, -0.025, s * 1.05], [0.13, 0.025, s * 1.65], WOOD, WOOD);
    block(og, [-0.14, -0.03, s * 1.4], [0.14, 0.03, s * 1.66], J_PURPLE, J_PURPLE);
    const op = r.pivot([0.1, 0.66, s * 0.8]);
    op.rotation.order = 'YXZ';
    op.rotation.x = s * 0.34;
    r.solid(og, op);
    oars.push(op);
  }
  let stroke = 0;
  r.onRun = (speed, dt) => {
    stroke += Math.abs(speed) * dt * 1.7;
    const on = Math.abs(speed) > 0.05 ? 1 : 0;
    oars.forEach((op, i) => {
      const s = i === 0 ? -1 : 1;
      op.rotation.y = on * s * Math.sin(stroke) * 0.45;
      op.rotation.x = s * (0.34 + on * 0.1 * Math.cos(stroke));
    });
  };
  r.each = (_dt, time) => {
    flagP.rotation.y = Math.sin(time * 4.2) * 0.35;
  };
  r.solid(g);
  // the Joker rows from the thwart, facing the stern
  r.seats = [[0.3, 0.54 - SEAT_RISE, 0]];
  return r;
}

// ---------------------------------------------------------------------------
// Wonder Woman's invisible plane
// ---------------------------------------------------------------------------

/** A jet seen only by its outline: thin pale lines over faintly glassy surfaces. */
function invisiblePlane(k: Build, mat: THREE.Material): Rig {
  const r = new Rig('invisiblePlane', k, mat);
  const g = new GeoBuilder();
  const C = 0xffffff;
  loft(g, ([[4.0, 0.02], [3.3, 0.3], [2.2, 0.5], [0.6, 0.58], [-1.8, 0.52], [-3.6, 0.35], [-4.0, 0.25]] as P2[]).map(([x, rr]) => ring(x, oct(rr, 0.62))), () => C);
  const PC: P2[] = [[0.36, 0.95], [0.38, 1.18], [0.2, 1.45], [-0.2, 1.45], [-0.38, 1.18], [-0.36, 0.95]];
  loft(g, [ring(2.6, scaled(PC, 0.5, 0.2, 0, 0.95)), ring(2.0, PC), ring(1.1, scaled(PC, 0.95, 0.9, 0, 0.95)), ring(0.4, scaled(PC, 0.5, 0.2, 0, 0.95))], () => C);
  const wing: P2[] = [[1.4, 0.4], [0.2, 2.2], [-1.4, 4.5], [-2.1, 4.5], [-1.95, 2.2], [-1.9, 0.4]];
  for (const s of [-1, 1]) {
    slab(g, s < 0 ? flip(wing) : wing, [0, 0.55, 0], AX, AZ, [0, -1, 0], -0.05, 0.05, C);
    slab(g, [[-3.0, 0.3], [-3.75, 1.5], [-4.02, 1.5], [-3.95, 0.3]].map(([x, z]): P2 => [x, z * s]), [0, 0.72, 0], AX, AZ, [0, -1, 0], -0.03, 0.03, C);
  }
  slab(g, [[-2.4, 0.9], [-3.98, 0.9], [-4.0, 2.15], [-3.5, 2.15]], [0, 0, 0], AX, AY, AZ, -0.03, 0.03, C);
  const geo = g.build();
  r.tris += g.triangles;
  const glass = new THREE.MeshBasicMaterial({ color: 0xd4ecff, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const surf = new THREE.Mesh(geo, glass);
  surf.renderOrder = 4;
  const lineMat = new THREE.LineBasicMaterial({ color: 0xeef8ff, transparent: true, opacity: 0.85, toneMapped: false });
  const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 18), lineMat);
  lines.renderOrder = 5;
  r.body.add(surf, lines);
  r.each = (_dt, _t, night) => {
    glass.opacity = 0.1 + 0.05 * night;
    lineMat.opacity = 0.75 + 0.2 * night;
  };
  r.seats = [[1.5, 0.45, 0]];
  return r;
}

// ---------------------------------------------------------------------------
// The police helicopter
// ---------------------------------------------------------------------------

/** Dark blue below and white above, a glazed nose, a pale patch where POLICE would be lettered, a searchlight under its nose, a three-bladed rotor, and skids. */
function policeCopter(k: Build, mat: THREE.Material): Rig {
  const r = new Rig('policeCopter', k, mat);
  const g = new GeoBuilder(), lg = new GeoBuilder(), halos: Halo[] = [];
  const cab = [
    body8(2.35, 0.2, 0.85, 0.3, 0.95, 1.15, 0.2, 1.25),
    body8(1.85, 0.5, 0.6, 0.7, 0.75, 1.5, 0.5, 1.72),
    body8(0.8, 0.6, 0.52, 0.82, 0.7, 1.7, 0.6, 2.0),
    body8(-0.6, 0.6, 0.52, 0.82, 0.7, 1.7, 0.6, 2.0),
    body8(-1.45, 0.3, 0.95, 0.42, 1.1, 1.65, 0.3, 1.85),
  ];
  loft(g, cab, (j, s) => {
    if (j === 0 || j === 6 || j === 7) return COP_BLUE;
    if (s <= 1) return j === 3 && s === 1 ? COP_WHITE : COP_GLASS;
    return j === 1 || j === 5 ? COP_BLUE : COP_WHITE;
  }, { win: (j, s) => (s <= 1 && j >= 1 && j <= 5 && !(j === 3 && s === 1) ? interior(0.6) : undefined), capA: COP_GLASS, capB: COP_BLUE });
  for (const s of [-1, 1]) {
    // a window either side, and the pale patch under it
    quadTo(g, [0.65, 1.22, s * 0.835], [-0.35, 1.22, s * 0.835], [-0.35, 1.6, s * 0.835], [0.65, 1.6, s * 0.835], COP_GLASS, [0, 0, s], { win: interior(0.6) });
    quadTo(g, [0.6, 0.84, s * 0.835], [-0.4, 0.84, s * 0.835], [-0.4, 1.1, s * 0.835], [0.6, 1.1, s * 0.835], COP_PATCH, [0, 0, s]);
    // skids and struts
    frustum(g, [-1.1, 0.08, s * 0.75], [1.3, 0.08, s * 0.75], 0.06, 0.06, 6, STEEL);
    frustum(g, [1.3, 0.08, s * 0.75], [1.65, 0.32, s * 0.75], 0.06, 0.05, 6, STEEL);
    for (const x of [-0.6, 0.8]) g.beam([x, 0.08, s * 0.75], [x * 0.92, 0.6, s * 0.5], 0.04, 0.04, STEEL);
    // the boom's pale patch
    block(g, [-3.2, 1.44, s * 0.215], [-2.0, 1.66, s * 0.235], COP_PATCH);
  }
  // the tail boom, its fin and its stabiliser
  frustum(g, [-1.3, 1.45, 0], [-4.5, 1.62, 0], 0.3, 0.13, 8, COP_BLUE);
  slab(g, [[-3.95, 1.45], [-4.6, 1.5], [-4.68, 2.65], [-4.38, 2.62]], [0, 0, 0], AX, AY, AZ, -0.05, 0.05, COP_BLUE, COP_WHITE);
  slab(g, [[-3.4, -0.75], [-3.7, -0.75], [-3.7, 0.75], [-3.4, 0.75]], [0, 1.55, 0], AX, AZ, [0, -1, 0], -0.04, 0.04, COP_WHITE);
  // the engine on its roof, and the mast
  block(g, [-1.0, 1.95, -0.42], [0.45, 2.32, 0.42], COP_WHITE, 0xcfd5dc);
  frustum(g, [-0.8, 2.05, 0.43], [-1.3, 2.05, 0.45], 0.1, 0.1, 6, GREY, { capB: BAT_DARK });
  frustum(g, [0.05, 2.3, 0], [0.05, 2.7, 0], 0.1, 0.09, 8, GREY);
  // the searchlight under its nose
  const aim = unit([0.574, -0.819, 0]), sc: V3 = [1.55, 0.36, 0];
  frustum(g, [1.55, 0.62, 0], [1.55, 0.4, 0], 0.09, 0.09, 6, BAT_DARK);
  frustum(g, sc, add(sc, mul(aim, 0.3)), 0.17, 0.2, 10, STEEL, { capB: false });
  const sg = new GeoBuilder();
  frustum(sg, add(sc, mul(aim, 0.28)), add(sc, mul(aim, 0.31)), 0.18, 0.18, 10, WHITE_LAMP);
  const searchMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  r.body.add(new THREE.Mesh(sg.build(), searchMat));
  r.tris += sg.triangles;
  // its cone of light, fading as it goes
  const cg = new GeoBuilder();
  frustum(cg, [0, 0, 0], [0, -1, 0], 0.06, 1, 14, 0xffffff, { capA: false, capB: false });
  const cgeo = cg.build();
  const pos = cgeo.getAttribute('position') as THREE.BufferAttribute, col = cgeo.getAttribute('color') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) col.setXYZ(i, 1 + 0.85 * pos.getY(i), 1 + 0.85 * pos.getY(i), 1 + 0.85 * pos.getY(i));
  const coneMat = additive({ vertexColors: true, color: 0xfff0c8 });
  const cone = new THREE.Mesh(cgeo, coneMat);
  const conePivot = r.pivot(add(sc, mul(aim, 0.32)));
  conePivot.rotation.z = Math.atan2(aim[0], -aim[1]);
  cone.scale.set(3.0, 15, 3.0);
  cone.renderOrder = 4;
  cone.visible = false;
  conePivot.add(cone);
  r.fx.light = () => {};
  r.each = (_dt, _t, night) => {
    const v = r.value.light ?? 0;
    cone.visible = v > 0.01;
    coneMat.opacity = v * (0.1 + 0.22 * night);
    searchMat.color.setScalar(0.45 + Math.max(v, r.lit * 0.3) * (1.0 + 2.2 * night));
  };
  // lamps: a red beacon on the roof, red and green to the sides, white at the tail
  lamp(lg, halos, [-0.35, 2.32, -0.08], [-0.2, 2.42, 0.08], RED_LAMP, 0.4);
  lamp(lg, halos, [-3.7, 1.5, -0.82], [-3.55, 1.6, -0.75], RED_LAMP, 0.35);
  lamp(lg, halos, [-3.7, 1.5, 0.75], [-3.55, 1.6, 0.82], GREEN_LAMP, 0.35);
  lamp(lg, halos, [-4.72, 2.0, -0.06], [-4.6, 2.1, 0.06], WHITE_LAMP, 0.3);
  r.lamps(lg, halos);
  // the rotors
  const rg = new GeoBuilder();
  frustum(rg, [0, -0.06, 0], [0, 0.1, 0], 0.2, 0.16, 8, GREY);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2, ax: V3 = [Math.cos(a), 0, Math.sin(a)];
    rbox(rg, mul(ax, 1.7), [1.58, 0.025, 0.13], ax, AY, cross(ax, AY), 0x3a3d44);
    rbox(rg, mul(ax, 3.12), [0.13, 0.027, 0.135], ax, AY, cross(ax, AY), COP_WHITE);
  }
  r.spinner(rg, [0.05, 2.74, 0], 'y', 17, 3.25);
  const tg = new GeoBuilder();
  rbox(tg, [0, 0, 0], [0.08, 0.55, 0.02], AX, AY, AZ, 0x3a3d44);
  r.spinner(tg, [-4.45, 2.15, 0.12], 'z', 40);
  // the line it lets down, with a hook
  const hk = new GeoBuilder();
  hk.beam([0, 0, 0], [0, -0.35, 0], 0.05, 0.05, STEEL);
  hk.beam([0, -0.35, 0], [0.18, -0.42, 0], 0.045, 0.045, STEEL);
  hk.beam([0.18, -0.42, 0], [0.22, -0.25, 0], 0.04, 0.04, STEEL);
  r.line([0.2, 0.5, 0], hk);
  r.solid(g);
  r.seats = [[1.15, 0.6, -0.36], [1.15, 0.6, 0.36]];
  return r;
}

// ---------------------------------------------------------------------------
// The Batwing
// ---------------------------------------------------------------------------

/**
 * A flat shape seen from above, outline (x, z), with a thickness and a
 * bevelled top: straight sides from `y0` to `y1`, then a sloping facet in to
 * the same outline drawn `inset` smaller, at `y2`.
 */
function bevelSlab(g: GeoBuilder, P: P2[], inset: number, y0: number, y1: number, y2: number, top: number, bevel: number, side: number, under: number, holes: P2[][] = []): void {
  const turn = area2(P) >= 0 ? 1 : -1, n = P.length;
  // the outline drawn smaller: each corner moved in along the bisector of its two edges
  const Q: P2[] = P.map((p, i) => {
    const a = P[(i + n - 1) % n], b = P[(i + 1) % n];
    const e1 = [p[0] - a[0], p[1] - a[1]], e2 = [b[0] - p[0], b[1] - p[1]];
    const l1 = Math.hypot(e1[0], e1[1]) || 1, l2 = Math.hypot(e2[0], e2[1]) || 1;
    // inward normals of the two edges
    const n1 = [(-e1[1] / l1) * turn, (e1[0] / l1) * turn], n2 = [(-e2[1] / l2) * turn, (e2[0] / l2) * turn];
    let bx = n1[0] + n2[0], bz = n1[1] + n2[1];
    const bl = Math.hypot(bx, bz) || 1;
    bx /= bl;
    bz /= bl;
    const m = inset / Math.max(0.35, bx * n1[0] + bz * n1[1]);
    return [p[0] + bx * m, p[1] + bz * m];
  });
  const V = (p: P2, y: number): V3 => [p[0], y, p[1]];
  // the top and the bottom, with any holes cut through both
  const v2 = (p: P2): THREE.Vector2 => new THREE.Vector2(p[0], p[1]);
  const flat = (pts: P2[], y: number, up: number, color: number): void => {
    const all = [...pts, ...holes.flat()];
    for (const t of THREE.ShapeUtils.triangulateShape(pts.map(v2), holes.map((h) => h.map(v2)))) face3(g, V(all[t[0]], y), V(all[t[1]], y), V(all[t[2]], y), [0, up, 0], color);
  };
  flat(P, y0, -1, under);
  flat(Q, y2, 1, top);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, ex = P[j][0] - P[i][0], ez = P[j][1] - P[i][1];
    const out: V3 = [ez * turn, 0, -ex * turn];
    quadTo(g, V(P[i], y0), V(P[j], y0), V(P[j], y1), V(P[i], y1), side, out);
    quadTo(g, V(P[i], y1), V(P[j], y1), V(Q[j], y2), V(Q[i], y2), bevel, [out[0], Math.hypot(ex, ez) * 0.8, out[2]]);
  }
}

/**
 * The Batwing, as the tile draws it: a heavy armoured craft that hovers on
 * two lift fans. Black all over, and from above a bat: a blunt head with two
 * small ears either side of a two-seat canopy, wings whose leading edges run
 * out almost square to the wrists, trailing edges scalloped between the
 * fingers back in to the tail, and a slot down the back between the family's
 * scalloped fins. The fans are set flush into the wings, each a round
 * opening with its blades turning inside, a thin ring round its rim and a
 * grille over it. Nothing hangs below: the belly is one clean surface with
 * lighter panel lines, the two openings, a flush lens for the searchlight and
 * two amber strips that glow while the fans turn, and it lands on it.
 */
function batwing(k: Build, mat: THREE.Material): Rig {
  const r = new Rig('batwing', k, mat);
  const g = new GeoBuilder(), lg = new GeoBuilder(), halos: Halo[] = [];
  /** The belly, in the shape's own heights: everything is lowered by this, so that `at` puts the belly at its `y`. */
  const BELLY = 1.45, DECK = 1.98;
  r.body.position.y = -BELLY;
  // --- the body, seen from above: a bat, with the two fans' openings cut through it ---
  const half: P2[] = [[5.1, 0.85], [4.1, 1.0], [3.6, 1.6], [3.25, 3.0], [3.3, 4.3], [2.9, 4.65], ...scallops([2.9, 4.65], [0, 4.3], 1, 0.75, [0.12, -1], 3), ...scallops([0, 4.3], [-2.6, 3.2], 1, 0.7, [0.39, -0.92], 3), ...scallops([-2.6, 3.2], [-4.5, 1.45], 1, 0.55, [0.68, -0.74], 3), [-4.2, 0.6], [-1.8, 0.6]];
  const outline: P2[] = [...half, ...half.slice().reverse().map(([x, z]): P2 => [x, -z])];
  const FANS: P2[] = [[0.6, 2.35], [0.6, -2.35]], FR = 1.05, FN = 14;
  const holes = FANS.map(([cx, cz]) => circle(FR, FN, 0, cx, cz));
  bevelSlab(g, outline, 0.32, BELLY, 1.72, DECK, BAT_TOP, BAT, BAT_DARK, BAT_UNDER, holes);
  // --- the middle: an armoured nose and the cockpit, its underside hidden just inside the belly ---
  const MID = [
    body8(5.25, 0.5, 1.5, 0.7, 1.55, 1.85, 0.45, 2.05),
    body8(4.2, 0.8, 1.47, 1.1, 1.52, 2.1, 0.72, 2.32),
    body8(2.0, 0.85, 1.47, 1.2, 1.52, 2.25, 0.74, 2.4),
    body8(-0.2, 0.75, 1.47, 1.0, 1.52, 2.2, 0.6, 2.45),
    body8(-1.8, 0.45, 1.5, 0.6, 1.6, 2.0, 0.35, 2.15),
  ];
  // the cockpit is open under its canopy, for a caped figure to sit in
  loft(g, MID, (j) => [BAT_DARK, BAT, BAT, BAT_TOP, BAT, BAT, BAT_DARK, BAT_UNDER][j], { skip: (j, s) => j === 3 && s === 1, capA: BAT_EDGE, capB: BAT_EDGE });
  for (const s of [-1, 1]) quadTo(g, [4.2, 2.32, s * 0.72], [2.0, 2.4, s * 0.74], [2.0, 1.99, s * 0.74], [4.2, 1.99, s * 0.72], BAT_DARK, [0, 0, -s]);
  quadTo(g, [4.2, 2.32, -0.72], [4.2, 2.32, 0.72], [4.2, 1.99, 0.72], [4.2, 1.99, -0.72], BAT_DARK, [-1, 0, 0]);
  quadTo(g, [2.0, 2.4, -0.74], [2.0, 2.4, 0.74], [2.0, 1.99, 0.74], [2.0, 1.99, -0.74], BAT_DARK, [1, 0, 0]);
  g.beam([2.0, 2.41, 0], [-1.6, 2.15, 0], 0.08, 0.06, BAT_EDGE);
  // a dash, and two seat backs
  block(g, [3.75, 1.99, -0.6], [4.15, 2.3, 0.6], BAT_EDGE, BAT_DARK, 'NESWT');
  block(g, [2.75, 1.99, -0.42], [2.88, 2.5, 0.42], BAT_EDGE, BAT_EDGE, 'NESWT');
  block(g, [2.05, 1.99, -0.42], [2.18, 2.5, 0.42], BAT_EDGE, BAT_EDGE, 'NESWT');
  // the canopy: smoked glass that the crew are seen through, tall enough for a caped figure's head
  const CAN: P2[] = [[0.7, 2.25], [0.74, 2.7], [0.44, 3.4], [-0.44, 3.4], [-0.74, 2.7], [-0.7, 2.25]];
  const cg = new GeoBuilder();
  const crings = [ring(4.65, scaled(CAN, 0.6, 0.12, 0, 2.25)), ring(4.05, scaled(CAN, 0.94, 0.75, 0, 2.25)), ring(3.2, CAN), ring(2.3, scaled(CAN, 0.97, 0.94, 0, 2.25)), ring(1.55, scaled(CAN, 0.62, 0.25, 0, 2.25))];
  loft(cg, crings, () => 0xffffff, { capA: false, capB: false });
  const glassMat = new THREE.MeshBasicMaterial({ color: 0x31475e, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide });
  const glass = new THREE.Mesh(cg.build(), glassMat);
  glass.renderOrder = 4;
  r.body.add(glass);
  r.tris += cg.triangles;
  // its frame: two hoops at the sides, none across the crew's heads
  for (const x of [4.05, 2.3]) {
    const p = crings.find((c) => c.x === x)!.p;
    g.beam(at3(x, p[1]), at3(x, p[2]), 0.05, 0.05, BAT_EDGE);
    g.beam(at3(x, p[4]), at3(x, p[3]), 0.05, 0.05, BAT_EDGE);
  }
  // two small ears either side of the canopy, as a bat's head has
  for (const s of [-1, 1]) {
    const v: V3 = [0, Math.cos(0.3), s * Math.sin(0.3)];
    slab(g, [[5.0, -0.2], [3.85, -0.2], [4.6, 0.98]], [0, 2.02, s * 0.9], AX, v, unit(cross(AX, v)), -0.07, 0.07, BAT, BAT_EDGE);
  }
  // armour plates on the nose's cheeks
  for (const s of [-1, 1]) quadTo(g, [4.9, 1.6, s * 0.78], [3.9, 1.55, s * 1.16], [3.9, 1.95, s * 1.16], [4.9, 1.8, s * 0.78], BAT_EDGE, [0.5, 0, s]);

  // --- the fans, set into the wings: each opening's wall, a thin ring round its rim above and below, a hub on two struts, and a grille over it ---
  const annulus = (cx: number, cz: number, y: number, r0: number, r1: number, up: number): void => {
    for (let i = 0; i < FN; i++) {
      const a0 = (i / FN) * Math.PI * 2, a1 = ((i + 1) / FN) * Math.PI * 2;
      const P = (a: number, rr: number): V3 => [cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr];
      quadTo(g, P(a0, r0), P(a1, r0), P(a1, r1), P(a0, r1), BAT_EDGE, [0, up, 0]);
    }
  };
  for (const [cx, cz] of FANS) {
    for (let i = 0; i < FN; i++) {
      const a0 = (i / FN) * Math.PI * 2, a1 = ((i + 1) / FN) * Math.PI * 2, am = (a0 + a1) / 2;
      const P = (a: number, y: number): V3 => [cx + Math.cos(a) * FR, y, cz + Math.sin(a) * FR];
      quadTo(g, P(a0, BELLY), P(a1, BELLY), P(a1, DECK), P(a0, DECK), BAT_DARK, [-Math.cos(am), 0, -Math.sin(am)]);
    }
    annulus(cx, cz, BELLY - 0.02, FR, FR + 0.13, -1);
    annulus(cx, cz, DECK + 0.01, FR, FR + 0.13, 1);
    frustum(g, [cx, BELLY + 0.08, cz], [cx, DECK - 0.04, cz], 0.22, 0.2, 8, GREY);
    for (const s of [-1, 1]) rbox(g, [cx, 1.88, cz + s * (FR + 0.22) / 2], [0.05, 0.05, (FR - 0.22) / 2 + 0.02], AX, AY, AZ, BAT_EDGE);
    // the grille over the opening, its slats lighter, seen through to the blades
    for (let i = -2; i <= 2; i++) {
      const x = cx + i * 0.38, hw = Math.sqrt(Math.max(0, FR * FR - (i * 0.38) ** 2)) + 0.04;
      block(g, [x - 0.05, DECK - 0.04, cz - hw], [x + 0.05, DECK + 0.02, cz + hw], BAT_EDGE);
    }
  }
  // the blades: five to a fan, turning opposite ways inside the openings, and the blur of their discs
  const rotors: THREE.Object3D[] = [], discs: THREE.MeshBasicMaterial[] = [];
  for (const [cx, cz] of FANS) {
    const rg = new GeoBuilder();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2, ax: V3 = [Math.cos(a), 0, Math.sin(a)];
      rbox(rg, mul(ax, 0.6), [0.38, 0.025, 0.12], ax, AY, cross(ax, AY), 0x3a3d45);
    }
    const p = r.pivot([cx, 1.7, cz]);
    rotors.push(r.solid(rg, p));
    const dm = new THREE.MeshBasicMaterial({ color: 0x2a2c33, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const d = new THREE.Mesh(new THREE.CircleGeometry(FR - 0.04, 20), dm);
    d.rotation.x = -Math.PI / 2;
    d.renderOrder = 2;
    p.add(d);
    discs.push(dm);
  }
  r.fx.rotors = () => {};

  // --- the belly's flush detail: panel lines a shade lighter, and two amber strips that glow while the fans turn ---
  const PANEL = 0x2d313a, yb = BELLY - 0.01;
  const line = (a: P2, b: P2, w = 0.035): void => {
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, px = (-dz / l) * w, pz = (dx / l) * w;
    quadTo(g, [a[0] + px, yb, a[1] + pz], [b[0] + px, yb, b[1] + pz], [b[0] - px, yb, b[1] - pz], [a[0] - px, yb, a[1] - pz], PANEL, [0, -1, 0]);
  };
  for (const s of [-1, 1]) {
    line([4.6, s * 0.55], [-1.7, s * 0.55]);
    line([3.0, s * 0.6], [3.0, s * 3.4]);
    line([-2.3, s * 0.65], [-2.3, s * 2.5]);
    line([3.0, s * 3.4], [-0.6, s * 3.6]);
  }
  line([4.6, -0.55], [4.6, 0.55]);
  const strips = new GeoBuilder();
  for (const s of [-1, 1]) quadTo(strips, [2.4, BELLY - 0.03, s * 1.05], [-1.2, BELLY - 0.03, s * 1.05], [-1.2, BELLY - 0.03, s * 1.13], [2.4, BELLY - 0.03, s * 1.13], AMBER, [0, -1, 0]);
  const stripMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  r.body.add(new THREE.Mesh(strips.build(), stripMat));
  r.tris += strips.triangles;

  // --- the fins at the tails of the two halves, the family's ---
  const lead: P2[] = [[-1.9, -0.2], [-2.7, 0.28], [-3.4, 0.6], [-4.05, 0.82], [-4.55, 0.92]];
  batFin(g, [...lead, ...scallops([-4.55, 0.92], [-4.0, -0.2], 2, 0.14, [1, 0.12])], 1.95, 1.55, 0.42);

  // --- lamps: amber slits across the nose and the leading edges, red and green at the wings' tips, red at the tails ---
  lamp(lg, halos, [5.22, 1.66, -0.5], [5.28, 1.72, 0.5], AMBER);
  for (const s of [-1, 1]) {
    halos.push({ at: [5.32, 1.69, s * 0.3], r: 0.42, color: AMBER });
    lamp(lg, halos, [3.48, 1.6, s * 1.75], [3.6, 1.68, s * 2.15], AMBER, 0.3);
    lamp(lg, halos, [2.8, 1.55, s * 4.52], [3.0, 1.68, s * 4.68], s < 0 ? RED_LAMP : GREEN_LAMP, 0.5);
    lamp(lg, halos, [-4.74, 1.58, s * 1.55], [-4.6, 1.66, s * 1.8], RED_LAMP, 0.32);
  }
  r.lamps(lg, halos);

  // --- the searchlight: a lens flush in the nose's underside, and its cone ---
  const aim = unit([0.574, -0.819, 0]), sc: V3 = [4.75, BELLY - 0.02, 0];
  const sg = new GeoBuilder();
  decal(sg, circle(0.24, 10), sc, AX, AZ, [0, -1, 0], 0, WHITE_LAMP);
  decal(g, circle(0.32, 10), [4.75, BELLY - 0.01, 0], AX, AZ, [0, -1, 0], 0, BAT_EDGE);
  const searchMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  r.body.add(new THREE.Mesh(sg.build(), searchMat));
  r.tris += sg.triangles;
  const coneG = new GeoBuilder();
  frustum(coneG, [0, 0, 0], [0, -1, 0], 0.08, 1, 14, 0xffffff, { capA: false, capB: false });
  const cgeo = coneG.build();
  const pos = cgeo.getAttribute('position') as THREE.BufferAttribute, col = cgeo.getAttribute('color') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) col.setXYZ(i, 1 + 0.85 * pos.getY(i), 1 + 0.85 * pos.getY(i), 1 + 0.85 * pos.getY(i));
  const coneMat = additive({ vertexColors: true, color: 0xfff0c8 });
  const cone = new THREE.Mesh(cgeo, coneMat);
  const conePivot = r.pivot([sc[0], sc[1] - 0.01, 0]);
  conePivot.rotation.z = Math.atan2(aim[0], -aim[1]);
  cone.scale.set(3.4, 16, 3.4);
  cone.renderOrder = 4;
  cone.visible = false;
  conePivot.add(cone);
  r.fx.light = () => {};

  // --- the line from its belly, with a bar to hold: nothing of it shows until it is let down ---
  const bar = new GeoBuilder();
  frustum(bar, [0, -0.04, -0.45], [0, -0.04, 0.45], 0.05, 0.05, 6, BAT_EDGE);
  r.line([0.4, BELLY, 0], bar);

  let spin = 0;
  r.each = (dt, _t, night) => {
    const v = r.value.light ?? 0;
    cone.visible = v > 0.01;
    coneMat.opacity = v * (0.1 + 0.22 * night);
    searchMat.color.setScalar(0.45 + Math.max(v, r.lit * 0.3) * (1.0 + 2.2 * night));
    // the fans: still at 0, a blur at 1; and turning whenever it is flown
    const target = Math.max(r.value.rotors ?? 0, Math.abs(r.speed) > 0.1 ? 1 : 0);
    spin += (target - spin) * Math.min(1, dt * 2.5);
    rotors.forEach((m, i) => { m.rotation.y += (i === 0 ? 1 : -1) * spin * 28 * dt; });
    for (const d of discs) d.opacity = 0.3 * smooth(0.3, 1, spin);
    stripMat.color.setScalar(0.25 + spin * (0.5 + 1.6 * night));
  };
  r.solid(g);
  // the pilot in front, the second seat behind: a seated figure's feet just above the belly, its cushion SEAT_RISE above, and the glass 3.4 high over it
  r.seats = [[3.3, 1.5, 0], [2.4, 1.5, 0]];
  return r;
}

// ---------------------------------------------------------------------------
// All of them
// ---------------------------------------------------------------------------

const MAKERS: Record<MachineKind, (k: Build, mat: THREE.Material) => Rig> = { batmobile, batboat, batplane, batgyro, batcycle, redCycle, jokermobile, rowboat, invisiblePlane, policeCopter, batwing };

/** Builds every machine, hidden until the show shows it. */
export function buildMachines(k: Build): Machines {
  const mat = k.mat.city();
  const rigs = new Map<MachineKind, Rig>();
  for (const kind of KINDS) {
    try {
      rigs.set(kind, MAKERS[kind](k, mat));
    } catch (e) {
      console.error(`Gotham: the machine ${kind} failed.`, e);
      rigs.set(kind, new Rig(kind, k, mat));
    }
  }
  /** The speed every shown machine is run at, for looking at them; null when the show runs them. */
  let demo: number | null = null;
  k.each((dt, time, night) => {
    if (dt <= 0) return;
    for (const r of rigs.values()) {
      if (!r.root.visible) continue;
      if (demo !== null) r.run(demo, dt);
      r.update(dt, time, night);
    }
  });
  const machines: Machines = { get: (kind) => rigs.get(kind)! };

  if (import.meta.env.DEV) {
    const tris = KINDS.map((kind) => `${kind} ${Math.round(rigs.get(kind)!.tris)}`);
    const total = KINDS.reduce((s, kind) => s + rigs.get(kind)!.tris, 0);
    console.info(`Gotham: the machines: ${Math.round(total)} triangles (${tris.join(', ')}).`);
    const A = SHOW_LANES.apron;
    const ROWS: { kinds: MachineKind[]; y: number; z: number; from?: number }[] = [
      { kinds: ['batmobile', 'jokermobile', 'batcycle', 'redCycle'], y: A.y, z: A.z },
      { kinds: ['batboat', 'rowboat'], y: Y.water, z: 42 },
      { kinds: ['batplane', 'policeCopter', 'batgyro', 'invisiblePlane'], y: A.y + 6, z: A.z },
      // the Batwing hovers 6 over the water beside the boats, clear of the viaduct over the apron
      { kinds: ['batwing'], y: Y.water + 6, z: 44, from: 2 },
    ];
    (window as unknown as { gothamMachines: object }).gothamMachines = {
      kinds: KINDS,
      get: (kind: MachineKind) => rigs.get(kind),
      /** Stands them all in rows along the docks' apron, facing south: cars on it, boats on the water off the quay, flyers 6 up. */
      line(): string {
        for (const row of ROWS) row.kinds.forEach((kind, i) => {
          const m = rigs.get(kind)!;
          m.at(A.x0 + 2 + (i + (row.from ?? 0)) * 13, row.y, row.z, Math.PI / 2);
          m.shown(true);
        });
        return ROWS.map((row) => row.kinds.map((kind, i) => `${kind} at x ${A.x0 + 2 + (i + (row.from ?? 0)) * 13}`).join(', ')).join('; ');
      },
      at: (kind: MachineKind, x: number, y: number, z: number, h: number, p = 0, ro = 0) => { const m = rigs.get(kind)!; m.at(x, y, z, h, p, ro); m.shown(true); },
      trick: (kind: MachineKind, name: string, f: number) => rigs.get(kind)?.trick(name, f),
      lights: (f: number) => { for (const r of rigs.values()) r.lights(f); },
      /** Runs every shown machine at this speed while frames pass; null stops them. */
      run: (speed: number | null) => { demo = speed; },
      seat: (kind: MachineKind, i = 0) => rigs.get(kind)?.seat(i),
      clear(): void {
        demo = null;
        for (const r of rigs.values()) {
          for (const name of Object.keys(r.fx)) r.trick(name, 0);
          r.lights(0);
          r.shown(false);
        }
      },
      tris: () => tris,
    };
  }
  return machines;
}
