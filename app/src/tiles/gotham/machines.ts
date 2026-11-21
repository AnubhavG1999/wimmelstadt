// The machines of the show, which are neither heroes nor traffic: the
// Batmobile, the Batboat, the Batplane and the Batgyro, the Batcycle and the
// Red Hood's motorcycle, the Jokermobile, the Joker's rowing boat, Wonder
// Woman's invisible plane, the police helicopter and Wayne Enterprises' own.
// The show (show.ts)
// drives them; this file only builds them and says how each is moved.
//
// The Batmobile is the collector's own design, built after the renders of the
// model he made of it: a very short, very wide open-wheeled racing car in matte
// black, one smooth shell over four bare slicks, a plank of a wing across its
// back and two jets under it. The rest are this tile's own drawing. The Batboat
// and the Batcycle carry swept fins with the scalloped trailing edge of a bat's
// wing, so that the family reads as one. The Batplane is a jet whose wings' trailing edges are scalloped
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
import { Smoke } from '../../engine/effects';
import type { Build } from '../../engine/tile';
import { SHOW_LANES, Y } from './plan';

export type MachineKind =
  | 'batmobile' | 'batboat' | 'batplane' | 'batgyro' | 'batcycle' | 'redCycle'
  | 'jokermobile' | 'rowboat' | 'invisiblePlane' | 'policeCopter' | 'batwing' | 'wayneCopter';

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
   * Its own tricks, each from 0 to 1, by name. The Batmobile: `canopy` (its
   * lid lifted and slid forward), `jet` (both plumes at full burn), `brake` (its
   * air brakes up), `chutes` (two parachutes out behind it), `smoke` (a smoke
   * screen from its outlets, thicker the higher), `hookL` and `hookR` (a
   * grapnel fired out from its left or right side, REACH.hook long at 1); by
   * itself it squats when it launches, dips when it brakes, burns its jets
   * when pushed hard and throws a bat's shape ahead of it with its lamps on.
   * The Jokermobile: `glove` (the boxing glove sprung
   * from its boot), `plank` (the plank pushed out ahead of it), `cards` (cards
   * streaming from its tail). The Batgyro and the helicopter: `line` (a line
   * let down under it). The rowing boat: `flag` (a jack-in-the-box flying a flag).
   * The Batwing: `rotors` (how fast its rotors turn, still at 0, a blur at 1),
   * `light` (its searchlight's cone) and `line` (a line with a bar to hold).
   * Both helicopters: `rotors` (how fast their rotors turn, still at 0: the
   * police's turn from the first, Wayne Enterprises' stand still until asked).
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
 * the helicopter 10 under its belly, and the Batmobile's grapnel 7 out from its side.
 */
export const REACH = { glove: 5, gloveY: 1, plank: 10, line: 10, hook: 7 };

/** Each one's length, width and height as built (the rowing boat's width is across its oars). */
const SIZES: Record<MachineKind, [number, number, number]> = {
  batmobile: [5.4, 3.84, 1.45], batboat: [9.1, 3.0, 2.3], batplane: [9.9, 11, 2.55], batgyro: [6.0, 5.9, 2.75], batcycle: [4.1, 1.0, 2.05], redCycle: [4.0, 1.1, 1.8],
  jokermobile: [8.45, 3.2, 2.36], rowboat: [4.0, 4.6, 0.75], invisiblePlane: [8.0, 9.0, 2.15], policeCopter: [7.0, 6.5, 2.75], batwing: [10.1, 9.3, 1.95], wayneCopter: [7.0, 6.5, 2.75],
};

const KINDS: MachineKind[] = ['batmobile', 'batboat', 'batplane', 'batgyro', 'batcycle', 'redCycle', 'jokermobile', 'rowboat', 'invisiblePlane', 'policeCopter', 'batwing', 'wayneCopter'];

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
/** Wayne Enterprises' helicopter: black below and graphite above, a silver band along its side and its boom, silver tips to its blades, dark glass. The tile's own paint. */
const WAYNE_BLACK = 0x1f2228, WAYNE_GRAPHITE = 0x30343d, WAYNE_SILVER = 0xcbd0d8, WAYNE_GLASS = 0x1e2b39;
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
  /** The faint discs its rotors sweep, and how fast its rotors and propellers turn, from 0 still to 1 full. */
  readonly discs: THREE.Object3D[] = [];
  spin = 1;
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
  /** What rides on its springs, if it has any: its lamps and its jets go there, so that they squat and dip with it. Only the Batmobile has one. */
  shell: THREE.Object3D | null = null;
  /** How hard it is pushed, from 0 to 1, which burns its jets as `jet` does: the Batmobile sets it from its own speed. */
  surge = 0;
  /** How much longer than at full burn its flames are, as a share: the Batmobile's grow when it is pushed hard. */
  stretch = 0;
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

  /** A mesh of the city's material made from a geometry already built, in the body or in `parent`. */
  mesh(geo: THREE.BufferGeometry, parent: THREE.Object3D = this.body): THREE.Mesh {
    this.tris += geo.getAttribute('position').count / 3;
    const m = new THREE.Mesh(geo, this.mat);
    m.castShadow = false;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  /** Its lamps, bright at night, with a glow round those that have one. */
  lamps(lg: GeoBuilder, halos: Halo[]): void {
    this.tris += lg.triangles;
    this.lampMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    const m = new THREE.Mesh(lg.build(), this.lampMat);
    const into = this.shell ?? this.body;
    into.add(m);
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
    into.add(hm);
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

  /** The light its lamps throw on the road ahead, from `x` forward: a round pool, or the picture `map`. */
  beam(x: number, l: number, w: number, color: number, map: THREE.Texture = roundTex()): void {
    this.beamMat = additive({ map, color, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    // each kind's pool lies at a height of its own, 0.004 apart, so that two that overlap, as the Batmobile's and
    // the Jokermobile's do in the chase, are not in one plane
    this.patch(this.root, x - 1, x + l, -w / 2, w / 2, 0.06 + KINDS.indexOf(this.kind) * 0.004, this.beamMat);
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
      this.discs.push(d);
    }
    return m;
  }

  /** A jet's nozzle at `at`, firing back along -x: its flame `len` long at full burn, `r` wide and `ry` high (as wide unless told). */
  jet(at: V3, r: number, l: number, ry = r): void {
    if (!this.jetMat) this.jetMat = additive({ vertexColors: true });
    const m = new THREE.Mesh(flameGeo(), this.jetMat);
    m.position.set(at[0], at[1], at[2]);
    m.visible = false;
    m.userData = { r, l, ry };
    m.renderOrder = 3;
    (this.shell ?? this.body).add(m);
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
    for (const s of this.spinners) s.m.rotation[s.axis] += s.rate * this.spin * dt;
    for (const d of this.discs) d.visible = this.spin > 0.4;
    const burn = Math.max(this.value.jet ?? 0, this.cruise * Math.min(1, Math.abs(this.speed) / 20), this.surge);
    this.jets.forEach((j, i) => {
      j.visible = burn > 0.02;
      if (!j.visible) return;
      const { r, l, ry } = j.userData as { r: number; l: number; ry: number };
      const fl = 0.86 + 0.1 * Math.sin(time * 51 + i * 2.1) + 0.06 * Math.sin(time * 23 + i);
      const w = 0.7 + 0.3 * burn;
      j.scale.set(Math.max(0.05, l * burn * fl * (1 + this.stretch)), ry * w, r * w);
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

/** The Batmobile's carbon, its slicks and wheel covers, the worn steel and rust of its machinery, and its few colours. */
const CARBON = 0x141518, SLICK = 0x2a2b30, COVER = 0x1c1d21, COVER_LINE = 0x484c55, PIT = 0x0e0f12, BORE = 0x08080a;
const WORN = 0x767b83, BRIGHT = 0xb9bfc8, RUST = 0x86553a, ORANGE = 0xd9761f, COPPER = 0xbf6a33, PLATE = 0x6c717a;
const DAMPER = 0xff9b30, COOL_LAMP = 0xe2eeff;

/** A smooth curve through points (x, y) given with x falling, held flat beyond its ends. */
function curve(t: P2[]): (x: number) => number {
  return (x) => {
    const n = t.length;
    if (x >= t[0][0]) return t[0][1];
    if (x <= t[n - 1][0]) return t[n - 1][1];
    let i = 0;
    while (i < n - 2 && x < t[i + 1][0]) i++;
    const p0 = t[Math.max(0, i - 1)], p1 = t[i], p2 = t[i + 1], p3 = t[Math.min(n - 1, i + 2)];
    const h = p2[0] - p1[0], u = (x - p1[0]) / h;
    const m1 = ((p2[1] - p0[1]) / (p2[0] - p0[0])) * h, m2 = ((p3[1] - p1[1]) / (p3[0] - p1[0])) * h;
    const u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * p1[1] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[1] + (u3 - u2) * m2;
  };
}
/** The larger of two numbers and the smaller, with a rounded fillet `k` wide where they meet. */
const smax = (a: number, b: number, k: number): number => {
  const h = Math.max(0, k - Math.abs(a - b)) / k;
  return Math.max(a, b) + (h * h * k) / 4;
};
const smin = (a: number, b: number, k: number): number => -smax(-a, -b, k);

/**
 * Shades faces smoothly where they meet at less than `crease` (radians), across
 * all of `geos` together, so that a body made of facets reads as one smooth
 * surface; and paints each corner by how much it faces the sky, if `paint` is given.
 */
function smoothen(geos: THREE.BufferGeometry[], crease: number, paint?: (ny: number, c: THREE.Color) => void): void {
  const cos = Math.cos(crease), groups = new Map<string, number[]>(), at: [number, number][] = [];
  const pos = geos.map((g) => g.getAttribute('position') as THREE.BufferAttribute);
  const nor = geos.map((g) => g.getAttribute('normal') as THREE.BufferAttribute);
  geos.forEach((_, gi) => {
    for (let i = 0; i < pos[gi].count; i++) {
      const key = `${Math.round(pos[gi].getX(i) * 4000)},${Math.round(pos[gi].getY(i) * 4000)},${Math.round(pos[gi].getZ(i) * 4000)}`;
      let l = groups.get(key);
      if (!l) groups.set(key, (l = []));
      l.push(at.length);
      at.push([gi, i]);
    }
  });
  const flat = at.map(([gi, i]) => new THREE.Vector3(nor[gi].getX(i), nor[gi].getY(i), nor[gi].getZ(i)));
  const s = new THREE.Vector3(), c = new THREE.Color();
  for (const l of groups.values()) {
    for (const a of l) {
      s.set(0, 0, 0);
      for (const b of l) if (flat[a].dot(flat[b]) > cos) s.add(flat[b]);
      s.normalize();
      const [gi, i] = at[a];
      nor[gi].setXYZ(i, s.x, s.y, s.z);
      if (paint) {
        paint(s.y, c);
        (geos[gi].getAttribute('color') as THREE.BufferAttribute).setXYZ(i, c.r, c.g, c.b);
      }
    }
  }
}

/**
 * A fat slick, its axle along z and its middle at the origin, its outer face
 * toward `s` (1 for +z): a cover over the whole wheel, a shallow dish with a
 * small recessed hub and a nut in it and one fine line from the hub to the rim,
 * so that it is seen to turn; its inner face a flat disc of `inner`.
 */
function slickGeo(R: number, w: number, s: number, inner: number): THREE.BufferGeometry {
  const g = new GeoBuilder(), N = 16, h = w / 2;
  const A = (i: number): number => ((i + 0.5) / N) * Math.PI * 2;
  const P = (z: number, rr: number, i: number): V3 => [Math.cos(A(i)) * rr, Math.sin(A(i)) * rr, s * z];
  const prof: P2[] = [[-h, R * 0.8], [-h + 0.1, R * 0.99], [h - 0.1, R * 0.99], [h, R * 0.8]];
  for (let k = 0; k + 1 < prof.length; k++) {
    for (let i = 0; i < N; i++) {
      const m = A(i + 0.5);
      quadTo(g, P(prof[k][0], prof[k][1], i), P(prof[k][0], prof[k][1], i + 1), P(prof[k + 1][0], prof[k + 1][1], i + 1), P(prof[k + 1][0], prof[k + 1][1], i), SLICK, [Math.cos(m), Math.sin(m), 0]);
    }
  }
  const DISH = 0.045, HUB = 0.24 * R, DEEP = 0.085;
  for (let i = 0; i < N; i++) {
    const m = A(i + 0.5);
    quadTo(g, P(h, R * 0.8, i), P(h, R * 0.8, i + 1), P(h - DISH, HUB, i + 1), P(h - DISH, HUB, i), COVER, [0, 0, s]);
    quadTo(g, P(h - DISH, HUB, i), P(h - DISH, HUB, i + 1), P(h - DEEP, HUB, i + 1), P(h - DEEP, HUB, i), COVER, [-Math.cos(m), -Math.sin(m), 0]);
    triTo(g, P(h - DEEP, HUB, i), P(h - DEEP, HUB, i + 1), [0, 0, s * (h - DEEP)], COVER, [0, 0, s]);
  }
  decal(g, circle(0.1 * R, 6), [0, 0, s * (h - DEEP)], AX, AY, [0, 0, s], 0.012, WORN);
  const zd = (rr: number): number => h - DISH * ((R * 0.8 - rr) / (R * 0.8 - HUB)) + 0.006;
  quadTo(g, [HUB + 0.01, -0.012, s * zd(HUB + 0.01)], [R * 0.79, -0.012, s * zd(R * 0.79)], [R * 0.79, 0.012, s * zd(R * 0.79)], [HUB + 0.01, 0.012, s * zd(HUB + 0.01)], COVER_LINE, [0, 0, s]);
  decal(g, circle(R * 0.8, N, Math.PI / N), [0, 0, -s * h], AX, AY, [0, 0, -s], 0, inner);
  const geo = g.build();
  smoothen([geo], 0.75);
  return geo;
}

let BAT_POOL: THREE.Texture | null = null;
/** The pool the Batmobile's lamps throw ahead of it: a faint round glow, and in it a plain bat's outline with its wings spread, its head away from the car. */
function batPoolTex(): THREE.Texture {
  if (BAT_POOL) return BAT_POOL;
  const S = 256, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const x = cv.getContext('2d')!;
  const gr = x.createRadialGradient(S * 0.5, S / 2, 0, S * 0.5, S / 2, S / 2);
  gr.addColorStop(0, 'rgba(255,255,255,0.3)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, S, S);
  // drawn upright, then turned so that its head points along the car
  x.save();
  x.translate(S * 0.57, S / 2);
  x.rotate(Math.PI / 2);
  x.scale(S * 0.42, S * 0.32);
  const right: [number, number, number, number][] = [
    [0.16, -0.1, 0.24, -0.14], [0.6, -0.34, 1.0, -0.42], [0.9, -0.2, 0.86, -0.02], [0.74, -0.12, 0.6, -0.02], [0.46, -0.08, 0.36, 0.08], [0.22, 0.04, 0.14, 0.2], [0.06, 0.28, 0, 0.42],
  ];
  x.beginPath();
  x.moveTo(0, -0.18);
  x.lineTo(0.06, -0.34);
  x.lineTo(0.1, -0.16);
  for (const [cx, cy, px, py] of right) x.quadraticCurveTo(cx, cy, px, py);
  // and back up the left side, the same curves the other way round
  const pts: [number, number][] = [[0.1, -0.16], ...right.map(([, , px, py]): [number, number] => [px, py])];
  for (let i = right.length - 1; i >= 0; i--) x.quadraticCurveTo(-right[i][0], right[i][1], -pts[i][0], pts[i][1]);
  x.lineTo(-0.06, -0.34);
  x.closePath();
  x.shadowColor = 'rgba(255,255,255,1)';
  x.shadowBlur = 9;
  x.fillStyle = 'rgba(255,255,255,0.95)';
  x.fill();
  x.restore();
  BAT_POOL = new THREE.CanvasTexture(cv);
  return BAT_POOL;
}

/**
 * The collector's own design, built line for line after the renders of the
 * model he made himself, with a canopy he asked for after them. A very short,
 * very wide open-wheeled racing car in matte black on four fat bare slicks: one
 * smooth shell, a pointed nose between the front tyres, low shoulders as wide
 * as the car behind them, a narrow rounded waist and a plank of a wing right
 * across the back; one long shallow arc from the lip to the trailing edge; a
 * cockpit blister with dark glass set flush in it; two seams and two bars on
 * top; a red strip under the trailing lip. Under the shell it is open and
 * mechanical: a carbon splitter with two scoops, bare steel arms and orange
 * dampers in front, side tunnels and grey plates, and under the wing two
 * electric motors, a toothed bar, orange panels and two tall outlets, which are
 * its jets.
 */
function batmobile(k: Build, mat: THREE.Material): Rig {
  const r = new Rig('batmobile', k, mat);
  // everything but the wheels and their arms rides on its springs, and squats and dips
  const sh = r.pivot([0, 0, 0]);
  r.shell = sh;
  const g = new GeoBuilder(), lg = new GeoBuilder(), un = new GeoBuilder(), halos: Halo[] = [];

  // ---- the shell, as numbers measured from his renders ----
  const TAIL = -2.685, WING = -1.265, TIP = 1.92;
  /** The top down the middle. */
  const C = curve([[2.45, 0.72], [2.07, 0.98], [1.9, 1.05], [1.5, 1.16], [1.1, 1.29], [0.65, 1.37], [0.2, 1.42], [-0.25, 1.44], [-0.7, 1.44], [-1.1, 1.42], [-1.55, 1.38], [-2.0, 1.35], [-2.35, 1.34], [TAIL, 1.33]]);
  /** The half-width of the rounded middle: the nose, the cockpit's blister, the waist's back, and its fillet into the wing. */
  const BW = curve([[2.45, 0.2], [2.37, 0.31], [2.2, 0.46], [2.05, 0.56], [1.75, 0.6], [1.2, 0.625], [0.8, 0.625], [0.45, 0.64], [0.15, 0.7], [-0.05, 0.79], [-1.25, 0.79], [-1.4, 0.7], [-1.7, 0.58], [-2.1, 0.5], [TAIL, 0.46]]);
  /** How high the rounded middle's foot is. */
  const F = curve([[2.45, 0.66], [2.3, 0.67], [2.05, 0.7], [1.75, 0.82], [1.5, 0.92], [1.2, 0.95], [0.5, 0.95], [0.2, 0.97], [-0.05, 0.99], [-1.25, 1.0], [-1.45, 1.12], [-1.8, 1.2], [TAIL, 1.22]]);
  /** How high the shelf's outer rim is, in front of the wing. */
  const EG = curve([[2.45, 0.66], [2.05, 0.65], [1.6, 0.67], [1.12, 0.7], [0.78, 0.74], [0.4, 0.85], [-0.05, 0.99]]);
  /** How low the shell's underside comes under its middle. */
  const BB = curve([[2.45, 0.57], [2.2, 0.575], [1.9, 0.6], [1.6, 0.63], [1.3, 0.72], [1.0, 0.82], [0.6, 0.88], [-1.25, 0.93], [-1.35, 1.08], [-1.6, 1.22], [TAIL, 1.26]]);
  const NOSE = curve([[2.45, 0.2], [2.37, 0.32], [2.2, 0.5], [2.05, 0.66], [1.82, 0.87], [1.6, 1.06]]);
  /** The outline seen from above, each side of the middle. */
  const halfW = (x: number): number => {
    if (x >= 1.6) return NOSE(x);
    if (x >= 1.58) return 1.06;
    // round the back of the front tyre to the shoulder's corner
    if (x >= 1.12) { const s = (x - 1.12) / 0.46; return 1.06 + 0.6 * Math.sqrt(Math.max(0, 1 - s * s)); }
    if (x >= 0.78) return 1.66;
    if (x >= -0.05) return lerp(0.8, 1.66, (x + 0.05) / 0.83);
    if (x >= -1.25) return lerp(0.78, 0.8, (x + 1.25) / 1.2);
    if (x >= -1.28) return lerp(0.8, 0.78, (x + 1.28) / 0.03);
    // the wing's leading edge, swept back a little, into its tip's rounded corner
    if (x >= -1.8) return smin(0.8 + 1.12 * ((x + 1.28) / -0.34), TIP, 0.12);
    const rc = 0.14, x0 = TAIL + rc;
    if (x >= x0) return TIP;
    return TIP - rc + Math.sqrt(Math.max(0, rc * rc - (x - x0) ** 2));
  };
  const bwAt = (x: number, W: number): number => Math.min(BW(x), W);
  const top = (x: number, u: number): number => {
    const W = halfW(x), bw = bwAt(x, W), a = Math.abs(u), f = F(x), c = C(x);
    const dome = a < bw ? f + (c - f) * Math.sqrt(1 - (a / bw) ** 2) : f - 3 * (a - bw);
    let plank: number;
    if (x > WING) plank = W - bw < 1e-4 ? f : EG(x) + (f - EG(x)) * clamp01((W - a) / (W - bw));
    else plank = 1.33 - 0.08 * (a / TIP) ** 2 - 0.03 * smooth(W - 0.12, W, a);
    return smax(dome, plank, 0.07);
  };
  const bot = (x: number, u: number): number => {
    const W = halfW(x), bw = bwAt(x, W), a = Math.abs(u), t = top(x, u), th = 0.06 + 0.04 * smooth(-2.55, TAIL, x);
    // the lip's lower edge is a shallow V from the front
    const v = 0.12 * (a / W) ** 2 * smooth(1.9, 2.3, x);
    return lerp(Math.min(t - th, BB(x) + v), t - th, smooth(bw - 0.02, bw + 0.12, a));
  };

  // the cross-sections: across the top from left to right, the rounded middle
  // sampled closely and the shelf or wing more widely, and back under it
  const X = [2.45, 2.35, 2.2, 1.98, 1.9, 1.75, 1.6, 1.52, 1.34, 1.23, 1.12, 0.95, 0.78, 0.55, 0.3, 0.08, -0.05, -0.4, -0.95, -1.25, -1.28,
    -1.42, -1.52, -1.62, -1.9, -2.35, -2.545, -2.61, -2.66, TAIL];
  const NI = 5, NO = 3;
  const rings = X.map((x): Ring => {
    const W = halfW(x), bw = bwAt(x, W), half: number[] = [];
    for (let i = 1; i <= NI; i++) half.push(bw * Math.sin((Math.PI / 2) * (i / NI)));
    for (let j = 1; j <= NO; j++) half.push(bw + (W - bw) * (j / NO));
    const us = [...half.slice().reverse().map((u) => -u), 0, ...half];
    const under = [W, (W + bw) / 2, bw, 0.55 * bw, 0, -0.55 * bw, -bw, -(W + bw) / 2, -W];
    return ring(x, [...us.map((u): P2 => [u, top(x, u)]), ...under.map((u): P2 => [u, bot(x, u)])]);
  });
  // the lid: the blister from x 1.9 back to x 0.08, the canopy with a hand's breadth of shell round it
  const iL0 = X.indexOf(1.9), iL1 = X.indexOf(0.08), J0 = NO, J1 = NO + 2 * NI;
  const isLid = (j: number, s: number): boolean => s >= iL0 && s < iL1 && j >= J0 && j < J1;
  const gs = new GeoBuilder(), gl = new GeoBuilder();
  loft(gs, rings, () => BAT, { skip: isLid, capA: false, capB: false });
  loft(gl, rings, () => BAT, { skip: (j, s) => !isLid(j, s), capA: false, capB: false });
  // its two ends closed flat: the blunt lip and the trailing lip
  const dedup = (q: Ring): Ring => ring(q.x, q.p.filter((p, i) => { const n = q.p[(i + 1) % q.p.length]; return Math.abs(p[0] - n[0]) + Math.abs(p[1] - n[1]) > 1e-5; }));
  capRing(gs, dedup(rings[0]), 1, BAT);
  capRing(gs, dedup(rings[rings.length - 1]), -1, BAT);
  const shellGeo = gs.build(), lidGeo = gl.build();
  const cTop = new THREE.Color(BAT_TOP), cMid = new THREE.Color(BAT), cUnder = new THREE.Color(BAT_UNDER);
  smoothen([shellGeo, lidGeo], 0.87, (ny, c) => {
    if (ny >= 0) c.copy(cMid).lerp(cTop, smooth(0.3, 0.95, ny));
    else c.copy(cMid).lerp(cUnder, smooth(0, -0.5, ny));
  });
  r.mesh(shellGeo, sh);

  /** A sheet lying on the shell's top, `lift` over it, from x0 to x1 and z0 to z1 (each with its sign), in nx by nz pieces; facing down if `down`, moved by `o`. */
  const onTop = (b: GeoBuilder, x0: number, x1: number, z0: number, z1: number, lift: number, color: number, nx: number, nz: number, down = false, o: V3 = [0, 0, 0], q: QuadOpts = {}): void => {
    const P = (i: number, j: number): V3 => {
      const x = lerp(x0, x1, i / nx), z = lerp(z0, z1, j / nz);
      return [x - o[0], top(x, z) + lift - o[1], z - o[2]];
    };
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) quadTo(b, P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), color, [0, down ? -1 : 1, 0], q);
  };
  const R = (s: number, j: number): V3 => at3(rings[s].x, rings[s].p[j]);

  // ---- the lid, which lifts at its back edge and slides forward ----
  const LX = X[iL0], LY = top(LX, 0);
  const lidP = r.pivot([LX, LY, 0], sh);
  const lid = r.mesh(lidGeo, lidP);
  lid.position.set(-LX, -LY, 0);
  const li = new GeoBuilder(), DN: V3 = [0, -0.035, 0];
  // (its underside is coarser than its top: it is seen only when the lid is up)
  for (let s = iL0; s < iL1; s += 2) {
    const s2 = Math.min(s + 2, iL1);
    for (let j = J0; j < J1; j += 2) quadTo(li, add(R(s, j), DN), add(R(s2, j), DN), add(R(s2, j + 2), DN), add(R(s, j + 2), DN), BAT_DARK, [0, -1, 0]);
  }
  for (let s = iL0; s < iL1; s++) {
    for (const [j, sz] of [[J0, -1], [J1, 1]] as const) quadTo(li, R(s, j), R(s + 1, j), add(R(s + 1, j), DN), add(R(s, j), DN), BAT, [0, 0, sz]);
  }
  for (const [s, sx] of [[iL0, 1], [iL1, -1]] as const) for (let j = J0; j < J1; j++) quadTo(li, R(s, j), R(s, j + 1), add(R(s, j + 1), DN), add(R(s, j), DN), BAT, [sx, 0, 0]);
  // the canopy: dark glass flush in the blister, pointed toward the nose and rounded at its back, in a fine dark outline
  const glassHW = (x: number): number => (x > 1.15 ? 0.45 * Math.pow(Math.max(0, (1.75 - x) / 0.6), 0.7) : x > 0.6 ? 0.45 : 0.45 * Math.sqrt(Math.max(0, 1 - ((0.6 - x) / 0.25) ** 2)));
  const pane = (x0: number, x1: number, grow: number, lift: number, color: number, q: QuadOpts): void => {
    const NXg = 7, NZg = 5;
    const P = (i: number, j: number): V3 => {
      const x = lerp(x0, x1, i / NXg), hw = glassHW(Math.min(1.75, Math.max(0.35, x))) + grow, z = lerp(-hw, hw, j / NZg);
      return [x, top(x, z) + lift, z];
    };
    for (let i = 0; i < NXg; i++) for (let j = 0; j < NZg; j++) quadTo(li, P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), color, [0, 1, 0], q);
  };
  pane(1.785, 0.315, 0.03, 0.005, BAT_DARK, {});
  pane(1.75, 0.35, 0, 0.009, BAT_GLASS, { win: interior(0.5) });
  // its underside, edges and glass are built where the body has them, and moved to the lid's pivot as the lid is
  r.solid(li, lidP).position.set(-LX, -LY, 0);
  r.fx.canopy = (f) => {
    lidP.position.set(LX + 0.8 * smooth(0.3, 1, f), LY + 0.14 * smooth(0, 0.4, f), 0);
    lidP.rotation.z = -0.32 * smooth(0, 0.45, f);
  };

  // ---- the cockpit under it: a dark pit, and two seats in tandem ----
  const FLOOR = 0.66;
  const fz = (z: number): number => Math.sign(z) * Math.min(Math.abs(z), 0.5);
  for (let s = iL0; s < iL1; s++) {
    for (const [j, sd] of [[J0, -1], [J1, 1]] as const) {
      const a = R(s, j), b = R(s + 1, j);
      quadTo(g, a, b, [b[0], FLOOR, fz(b[2])], [a[0], FLOOR, fz(a[2])], PIT, [0, 0.2, -sd]);
    }
    const a = R(s, J0), b = R(s + 1, J0);
    quadTo(g, [a[0], FLOOR, fz(a[2])], [b[0], FLOOR, fz(b[2])], [b[0], FLOOR, -fz(b[2])], [a[0], FLOOR, -fz(a[2])], PIT, [0, 1, 0]);
  }
  for (const [s, sx] of [[iL0, -1], [iL1, 1]] as const) {
    for (let j = J0; j < J1; j++) { const a = R(s, j), b = R(s, j + 1); quadTo(g, a, b, [b[0], FLOOR, fz(b[2])], [a[0], FLOOR, fz(a[2])], PIT, [sx, 0, 0]); }
  }
  for (const [x0, x1] of [[0.85, 1.2], [0.12, 0.42]]) {
    block(g, [x0, FLOOR, -0.25], [x1, FLOOR + 0.22, 0.25], BAT_EDGE, BAT_EDGE, 'NESWT');
    block(g, [x0 - 0.06, FLOOR, -0.25], [x0, FLOOR + 0.5, 0.25], BAT_EDGE, BAT_EDGE, 'NESWT');
  }
  r.seats = [[1.0, FLOOR, 0], [0.2, FLOOR, 0]];

  // ---- on top: two seams, a bar on each, and the air brakes' outlines ----
  for (const s of [-1, 1]) {
    const z = s * 0.27;
    for (let x = 0.08; x > TAIL + 0.03; x -= 0.2) {
      const x2 = Math.max(TAIL + 0.03, x - 0.2);
      quadTo(g, [x, top(x, z - 0.01) + 0.008, z - 0.01], [x2, top(x2, z - 0.01) + 0.008, z - 0.01], [x2, top(x2, z + 0.01) + 0.008, z + 0.01], [x, top(x, z + 0.01) + 0.008, z + 0.01], BAT_DARK, [0, 1, 0]);
    }
    const bar = (x: number, hw: number, hh: number): Ring => { const y = top(x, z); return ring(x, [[z - hw, y - 0.01], [z + hw, y - 0.01], [z + hw, y + hh], [z - hw, y + hh]]); };
    loft(g, [bar(0.08, 0.015, 0.012), bar(0.06, 0.025, 0.035), bar(-0.32, 0.025, 0.035), bar(-0.7, 0.025, 0.035), bar(-0.72, 0.015, 0.012)], () => 0x30343c, { capA: 0x30343c, capB: 0x30343c });
  }
  const FX0 = -2.2, FX1 = -2.65, FZ0 = 0.45, FZ1 = 1.65;
  const flaps: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const z0 = s < 0 ? -FZ1 : FZ0, z1 = s < 0 ? -FZ0 : FZ1;
    onTop(g, FX0 + 0.025, FX1 - 0.025, z0 - 0.025, z1 + 0.025, 0.005, BAT_DARK, 2, 3);
    const hy = top(FX0, s * 1.05) + 0.012, o: V3 = [FX0, hy, 0];
    const fg = new GeoBuilder();
    onTop(fg, FX0, FX1, z0, z1, 0.03, BAT_TOP, 2, 3, false, o);
    onTop(fg, FX0, FX1, z0, z1, 0.012, BAT_DARK, 2, 3, true, o);
    const E = (x: number, z: number, l: number): V3 => [x - o[0], top(x, z) + l - o[1], z];
    for (const [x, sx] of [[FX0, 1], [FX1, -1]] as const) for (let j = 0; j < 3; j++) {
      const za = lerp(z0, z1, j / 3), zb = lerp(z0, z1, (j + 1) / 3);
      quadTo(fg, E(x, za, 0.012), E(x, zb, 0.012), E(x, zb, 0.03), E(x, za, 0.03), BAT, [sx, 0, 0]);
    }
    for (const [z, sz] of [[z0, -1], [z1, 1]] as const) for (let i = 0; i < 2; i++) {
      const xa = lerp(FX0, FX1, i / 2), xb = lerp(FX0, FX1, (i + 1) / 2);
      quadTo(fg, E(xa, z, 0.012), E(xb, z, 0.012), E(xb, z, 0.03), E(xa, z, 0.03), BAT, [0, 0, sz]);
    }
    const p = r.pivot(o, sh);
    r.solid(fg, p);
    flaps.push(p);
  }

  // ---- the front: splitter, scoops, blade, and bare suspension ----
  slab(g, [[2.8, 0], [2.685, 1.5], [2.36, 1.5], [2.36, 1.08], [1.77, 1.08], [1.77, -1.08], [2.36, -1.08], [2.36, -1.5], [2.685, -1.5]], [0, 0.02, 0], AX, AZ, AY, 0, 0.05, CARBON, CARBON);
  for (const s of [-1, 1]) {
    // a scoop before each tyre, hollow behind; its rear stands just clear of the tyre's front
    const side: P2[] = [[2.585, 0.065], [2.685, 0.065], [2.63, 0.48], [2.6, 0.52], [2.585, 0.52]];
    slab(g, side, [0, 0, 0], AX, AY, AZ, s * 0.97, s * 1.47, CARBON, CARBON);
    quadTo(g, [2.582, 0.08, s * 1.0], [2.582, 0.08, s * 1.44], [2.582, 0.5, s * 1.44], [2.582, 0.5, s * 1.0], BORE, [-1, 0, 0]);
    slab(g, [[2.36, 0.065], [2.585, 0.065], [2.585, 0.52], [2.45, 0.52], [2.36, 0.4]], [0, 0, 0], AX, AY, AZ, s * 0.97, s * 1.0, CARBON, CARBON);
    // one thick jointed arm of worn steel from the middle out to the wheel, and its upright
    un.beam([2.0, 0.46, s * 0.2], [2.04, 0.5, s * 0.72], 0.045, 0.04, WORN);
    un.beam([2.04, 0.5, s * 0.72], [2.065, 0.5, s * 1.08], 0.04, 0.035, WORN);
    block(un, [1.99, 0.455, s * 0.68], [2.09, 0.545, s * 0.76], RUST);
    block(un, [1.99, 0.36, s * 1.06], [2.14, 0.64, s * 1.1], CARBON);
    // an orange coil-sprung damper at an angle, lit as a small amber lamp
    frustum(lg, [1.95, 0.18, s * 0.42], [2.1, 0.53, s * 0.56], 0.05, 0.05, 8, DAMPER);
    halos.push({ at: [2.05, 0.42, s * 0.52], r: 0.22, color: AMBER });
    for (const t of [0.3, 0.7]) {
      const c: V3 = [lerp(1.95, 2.1, t), lerp(0.18, 0.53, t), s * lerp(0.42, 0.56, t)];
      frustum(g, sub(c, [0.006, 0.014, s * 0.0056]), add(c, [0.006, 0.014, s * 0.0056]), 0.065, 0.065, 8, RUST, { capA: false, capB: false });
    }
    // a faint cool lamp under the lip
    lamp(lg, halos, [2.3, 0.525, s * 0.1], [2.38, 0.555, s * 0.26], COOL_LAMP, 0.2);
  }
  slab(g, [[2.15, 0.065], [2.75, 0.065], [2.47, 0.6], [2.15, 0.62]], [0, 0, 0], AX, AY, AZ, -0.018, 0.018, CARBON, CARBON);
  frustum(g, [2.49, 0.58, 0], [2.78, 0.1, 0], 0.02, 0.02, 6, COPPER);
  frustum(g, [2.78, 0.1, 0], [2.88, 0.085, 0], 0.02, 0.018, 6, COPPER);
  block(g, [1.85, 0.07, -0.22], [2.25, 0.3, 0.22], CARBON);
  for (const s of [-1, 1]) frustum(g, [2.25, 0.2, s * 0.1], [2.28, 0.2, s * 0.1], 0.035, 0.035, 6, WORN);

  // ---- the sides: floor, tub, the shoulders' walls, the plates before the rear tyres ----
  block(g, [-1.5, 0.08, -1.66], [1.55, 0.13, 1.66], CARBON, CARBON, 'NESWTB');
  const TUB: [number, number][] = [[1.65, 0.62], [1.2, 0.65], [0.8, 0.8], [0.5, 0.9], [0.08, 0.92], [-0.05, 0.92], [-0.6, 0.9], [-0.9, 0.7], [-1.25, 0.62], [-1.5, 0.62], [-1.8, 0.62]];
  // its top is left open under the cockpit
  loft(g, TUB.map(([x, fw]) => { const t = BB(x) + 0.03; return ring(x, [[fw, 0.12], [0.6, 0.62], [0.6, t], [-0.6, t], [-0.6, 0.62], [-fw, 0.12]]); }), () => CARBON, { skip: (j, s) => j === 2 && s < 4, capA: CARBON, capB: CARBON });
  for (const s of [-1, 1]) {
    const wall = (x: number): Ring => { const t = bot(x, 1.63) + 0.03; return ring(x, [[s * 1.6, 0.12], [s * 1.66, 0.12], [s * 1.66, t], [s * 1.6, t]]); };
    loft(g, [wall(1.25), wall(1.0), wall(0.73)], () => CARBON, { capA: CARBON, capB: CARBON });
    // the plate before the rear tyre, a smooth grey that catches the light, and a ribbed steel bar on its top
    block(g, [-1.43, 0.12, s < 0 ? -1.64 : 1.6], [-0.8, 0.79, s < 0 ? -1.6 : 1.64], PLATE, PLATE);
    block(g, [-1.15, 0.79, s < 0 ? -1.63 : 1.1], [-1.08, 0.84, s < 0 ? -1.1 : 1.63], BRIGHT, BRIGHT);
    for (const z of [1.2, 1.32, 1.44, 1.56]) block(g, [-1.16, 0.785, s * z - 0.012], [-1.07, 0.85, s * z + 0.012], WORN, WORN);
    // the grapnel's launcher, on the side of the tub in the tunnel
    block(g, [-0.08, 0.36, s < 0 ? -0.82 : 0.7], [0.08, 0.48, s < 0 ? -0.7 : 0.82], BAT_EDGE, BAT_EDGE);
  }

  // ---- the tail, under the wing ----
  block(g, [-2.33, 0.3, -0.75], [-1.75, 1.08, 0.75], CARBON);
  block(g, [-2.55, 1.1, -0.5], [-2.0, bot(-2.3, 0) + 0.03, 0.5], CARBON);
  // a toothed bar of rusty steel across
  {
    const TW = 0.63, n = 16, w = (2 * TW) / n, out: P2[] = [[-TW, 0.99], [TW, 0.99], [TW, 1.03]];
    for (let i = 0; i < n; i++) { const z = TW - i * w; out.push([z - w * 0.5, 1.065], [z - w, 1.03]); }
    out.pop();
    out.push([-TW, 1.03]);
    slab(g, out, [-2.55, 0, 0], AZ, AY, AX, -0.02, 0.02, RUST, RUST);
  }
  for (const [z0, z1] of [[-0.33, -0.01], [0.03, 0.35], [0.39, 0.72]]) block(g, [-2.53, 0.83, z0], [-2.4, 0.92, z1], ORANGE);
  // two electric motors side by side across the car, ribbed, with rusty end caps
  for (const [z0, z1] of [[-0.52, -0.03], [0.03, 0.52]]) {
    frustum(g, [-2.45, 0.68, z0], [-2.45, 0.68, z1], 0.12, 0.12, 10, WORN, { capA: RUST, capB: RUST });
    for (let i = 1; i <= 3; i++) { const z = lerp(z0, z1, i / 4); frustum(g, [-2.45, 0.68, z - 0.014], [-2.45, 0.68, z + 0.014], 0.132, 0.132, 10, 0x5c6168, { capA: false, capB: false }); }
  }
  block(g, [-2.55, 0.17, -0.25], [-2.2, 0.35, 0.25], CARBON);
  decal(g, circle(0.06, 10), [-2.55, 0.26, 0], AZ, AY, [-1, 0, 0], 0.004, BORE);
  for (const s of [-1, 1]) {
    // the struts that hold the wing
    g.beam([-2.35, bot(-2.35, s * 1.6) + 0.03, s * 1.6], [-2.35, 0.95, s * 0.75], 0.03, 0.03, CARBON);
    // a tall outlet either side of the motors, with two upright slots: its jets
    const za = s < 0 ? -1.13 : 0.52, zb = s < 0 ? -0.52 : 1.13;
    block(g, [-2.6, 0.12, za], [-2.47, 0.78, zb], CARBON, CARBON, 'NESWTB');
    for (const [z0, z1] of [[0.6, 0.79], [0.86, 1.05]]) decal(g, [[s * z0, 0.2], [s * z1, 0.2], [s * z1, 0.7], [s * z0, 0.7]].map(([z, y]): P2 => [z, y]), [-2.6, 0, 0], AZ, AY, [-1, 0, 0], 0.004, BORE);
    r.jet([-2.61, 0.45, s * 0.825], 0.3, 3.0, 0.33);
  }
  // the red strip under the trailing lip, from tip to tip
  for (let i = 0; i < 6; i++) {
    const za = -1.74 + (3.48 * i) / 6, zb = -1.74 + (3.48 * (i + 1)) / 6, y = bot(-2.65, (za + zb) / 2);
    lamp(lg, halos, [-2.68, y - 0.075, za], [-2.61, y - 0.005, zb], RED_LAMP);
    halos.push({ at: [-2.71, y - 0.07, (za + zb) / 2], r: 0.12, color: RED_LAMP });
  }

  // ---- its tricks ----
  // two brake parachutes, on lines from the tail
  const cgb = new GeoBuilder(), NS = 7, CR: P2[] = [[0, 0.6], [-0.24, 0.44], [-0.38, 0]];
  const cc: V3 = [0.3, 0, 0];
  for (let kk = 0; kk + 1 < CR.length; kk++) for (let i = 0; i < NS; i++) {
    const Q = (q: P2, j: number, dx: number): V3 => { const a = (j / NS) * Math.PI * 2; return [q[0] + dx, Math.cos(a) * q[1], Math.sin(a) * q[1]]; };
    const a = Q(CR[kk], i, 0), b = Q(CR[kk], i + 1, 0), c = Q(CR[kk + 1], i + 1, 0), d = Q(CR[kk + 1], i, 0);
    const mid = mul(add(add(a, b), add(c, d)), 0.25);
    quadTo(cgb, a, b, c, d, BAT_DARK, sub(mid, cc));
    const a2 = Q(CR[kk], i, 0.012), b2 = Q(CR[kk], i + 1, 0.012), c2 = Q(CR[kk + 1], i + 1, 0.012), d2 = Q(CR[kk + 1], i, 0.012);
    quadTo(cgb, a2, b2, c2, d2, BAT_UNDER, sub(cc, mid));
  }
  for (let i = 0; i < 3; i++) { const a = ((i + 0.5) / 3) * Math.PI * 2; cgb.beam([0.01, Math.cos(a) * 0.59, Math.sin(a) * 0.59], [0.8, 0, 0], 0.008, 0.008, GREY); }
  const cgeo = cgb.build(), rgb = new GeoBuilder();
  block(rgb, [-1, -0.01, -0.01], [0, 0.01, 0.01], GREY);
  const rgeo = rgb.build();
  const chutes = [-1, 1].map((s) => ({ s, p: r.pivot([0, 0, 0], sh), rope: r.pivot([-2.62, 1.0, s * 0.12], sh) }));
  for (const c of chutes) { r.mesh(cgeo, c.p); r.mesh(rgeo, c.rope); c.p.visible = c.rope.visible = false; }
  const tv = new THREE.Vector3(), nx = new THREE.Vector3(-1, 0, 0);
  const placeChutes = (f: number, time: number): void => {
    for (const [i, c] of chutes.entries()) {
      const on = f > 0.005;
      c.p.visible = c.rope.visible = on;
      if (!on) continue;
      const sc = Math.max(0.01, smooth(0.05, 0.4, f) + 0.12 * Math.sin(Math.PI * smooth(0.2, 0.55, f))), d = 2.6 * smooth(0.02, 0.5, f), sw = smooth(0.4, 1, f);
      c.p.position.set(TAIL - d, 0.85 + 0.05 * sw * Math.sin(time * 2.1 + i), c.s * (0.2 + 0.48 * smooth(0.05, 0.5, f)) + 0.06 * sw * Math.sin(time * 1.6 + 2 * i));
      c.p.rotation.set(0.1 * sw * Math.sin(time * 1.9 + i), 0.08 * sw * Math.sin(time * 1.3 + 3 * i), 0.06 * sw * Math.sin(time * 1.7 + i));
      c.p.scale.setScalar(sc);
      tv.set(c.p.position.x + 0.8 * sc, c.p.position.y, c.p.position.z).sub(c.rope.position);
      const L = tv.length();
      c.rope.quaternion.setFromUnitVectors(nx, tv.normalize());
      c.rope.scale.set(Math.max(0.01, L), 1, 1);
    }
  };
  r.fx.chutes = (f) => placeChutes(f, 0);
  // a grapnel from either side tunnel
  for (const [name, s] of [['hookL', -1], ['hookR', 1]] as const) {
    const base = r.pivot([0, 0.42, s * 0.82], sh);
    if (s < 0) base.rotation.y = Math.PI;
    const rg = new GeoBuilder(), hg = new GeoBuilder();
    block(rg, [-0.014, -0.014, 0], [0.014, 0.014, 1], GREY);
    frustum(hg, [0, 0, -0.14], [0, 0, 0.06], 0.03, 0.025, 6, BRIGHT);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      hg.sweep([[0, 0, 0.04], [c * 0.12, sn * 0.12, -0.02], [c * 0.1, sn * 0.1, -0.1]], [0.016, 0.016, 0.012], BRIGHT);
    }
    const rope = r.solid(rg, base), hook = r.solid(hg, base);
    rope.visible = hook.visible = false;
    r.fx[name] = (f) => {
      const L = REACH.hook * f;
      rope.visible = hook.visible = f > 0.004;
      rope.scale.set(1, 1, Math.max(0.01, L));
      hook.position.z = L + 0.06;
    };
  }
  r.fx.brake = () => {};
  r.fx.smoke = () => {};
  const smoke = new Smoke(k.mat.prop({ vertexColors: false, color: 0x45474d }), 160);
  k.group.add(smoke.mesh);
  k.each((dt) => { if (dt > 0) smoke.update(dt); });
  // the orange pool its flames throw on the road behind it
  const poolMat = additive({ map: roundTex(), color: 0xff8a3a, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const pool = r.patch(r.root, TAIL - 4.4, TAIL - 0.2, -1.7, 1.7, 0.05, poolMat);
  pool.visible = false;

  r.lamps(lg, halos);
  r.solid(g, sh);
  r.solid(un);
  r.wheel(slickGeo(0.5, 0.64, 1, CARBON), 0.5, [[2.065, 0.5, 1.435]]);
  r.wheel(slickGeo(0.5, 0.64, -1, CARBON), 0.5, [[2.065, 0.5, -1.435]]);
  r.wheel(slickGeo(0.5, 0.66, 1, COVER), 0.5, [[-1.955, 0.5, 1.35]]);
  r.wheel(slickGeo(0.5, 0.66, -1, COVER), 0.5, [[-1.955, 0.5, -1.35]]);
  // a bat's shape in the pool its lamps throw ahead of it
  r.beam(2.8, 7, 6.0, 0xffd9a0, batPoolTex());
  r.blob(5.9, 4.1);

  // ---- by itself: it reads its own speed from where it is, squats when it launches, dips when it brakes ----
  const nose = new THREE.Vector3(), last = new THREE.Vector3(), step = new THREE.Vector3(), at = new THREE.Vector3(), drift = new THREE.Vector3();
  let lastT = -1, fresh = true, v = 0, acc = 0, pitch = 0, air = 0, due = 0;
  r.each = (dt, time, night) => {
    r.root.updateMatrix();
    nose.setFromMatrixColumn(r.root.matrix, 0);
    step.copy(r.root.position).sub(last);
    // a jump of more than a few units in a frame, or a long gap, is the car set down somewhere new
    if (lastT < 0 || time - lastT > 0.3 || step.length() > 3 || dt <= 0) fresh = true;
    else if (fresh) { v = step.dot(nose) / dt; acc = 0; fresh = false; }
    else {
      const v0 = v;
      v += (step.dot(nose) / dt - v) * Math.min(1, dt * 10);
      acc += ((v - v0) / dt - acc) * Math.min(1, dt * 6);
    }
    last.copy(r.root.position);
    lastT = time;
    // nose up about a point ahead of the rear axle as it launches, down about the splitter's tip as it brakes
    const want = acc > 0 ? 0.05 * clamp01(acc / 18) : -0.06 * clamp01(-acc / 14);
    pitch += (want - pitch) * Math.min(1, dt * 7);
    const [px, py] = pitch >= 0 ? [-1.0, 0.5] : [2.8, 0.02];
    const c = Math.cos(pitch), sn = Math.sin(pitch);
    sh.rotation.z = pitch;
    sh.position.set(px - (px * c - py * sn), py - (px * sn + py * c), 0);
    // the harder it is pushed, the more its jets burn and the longer their flames
    r.surge += (clamp01(acc / 24) - r.surge) * Math.min(1, dt * 8);
    r.stretch = 0.35 * r.surge;
    const burn = Math.max(r.value.jet ?? 0, r.surge);
    pool.visible = burn > 0.01;
    poolMat.opacity = burn * (0.18 + 0.55 * night);
    // the air brakes come up by themselves when it brakes hard
    air += (clamp01((-acc - 6) / 12) - air) * Math.min(1, dt * 8);
    const flap = Math.max(r.value.brake ?? 0, air);
    for (const p of flaps) p.rotation.z = -1.0 * flap;
    placeChutes(r.value.chutes ?? 0, time);
    // the smoke screen, from both outlets
    const sm = r.value.smoke ?? 0;
    if (sm > 0) {
      sh.updateMatrix();
      r.body.updateMatrix();
      due -= dt;
      while (due <= 0) {
        due += 1 / (8 + 14 * sm);
        for (const s of [-1, 1]) {
          at.set(-2.7, 0.45, s * 0.825).applyMatrix4(sh.matrix).applyMatrix4(r.body.matrix).applyMatrix4(r.root.matrix);
          smoke.puff(at, drift.copy(nose).multiplyScalar(-2.2), 0.45 + 0.35 * sm, 1);
        }
      }
    } else due = 0;
  };
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

/** A helicopter's paint: its belly and boom, its upper body, the patch on its side and its boom, and its glass. */
interface CopterPaint { body: number; top: number; patch: number; glass: number }

/**
 * A light helicopter: a glazed nose, a patch on its side, a three-bladed rotor, and skids. The police's is dark blue
 * below and white above, its patch pale where POLICE would be lettered, with a searchlight under its nose and a line
 * to let down. Wayne Enterprises', which the collector asked for, is black below and graphite above with a silver band,
 * has neither, and stands with its rotors still until it is flown.
 */
function copter(kind: 'policeCopter' | 'wayneCopter', k: Build, mat: THREE.Material, C: CopterPaint, police: boolean): Rig {
  const r = new Rig(kind, k, mat);
  const g = new GeoBuilder(), lg = new GeoBuilder(), halos: Halo[] = [];
  const cab = [
    body8(2.35, 0.2, 0.85, 0.3, 0.95, 1.15, 0.2, 1.25),
    body8(1.85, 0.5, 0.6, 0.7, 0.75, 1.5, 0.5, 1.72),
    body8(0.8, 0.6, 0.52, 0.82, 0.7, 1.7, 0.6, 2.0),
    body8(-0.6, 0.6, 0.52, 0.82, 0.7, 1.7, 0.6, 2.0),
    body8(-1.45, 0.3, 0.95, 0.42, 1.1, 1.65, 0.3, 1.85),
  ];
  loft(g, cab, (j, s) => {
    if (j === 0 || j === 6 || j === 7) return C.body;
    if (s <= 1) return j === 3 && s === 1 ? C.top : C.glass;
    return j === 1 || j === 5 ? C.body : C.top;
  }, { win: (j, s) => (s <= 1 && j >= 1 && j <= 5 && !(j === 3 && s === 1) ? interior(0.6) : undefined), capA: C.glass, capB: C.body });
  for (const s of [-1, 1]) {
    // a window either side, and the pale patch under it
    quadTo(g, [0.65, 1.22, s * 0.835], [-0.35, 1.22, s * 0.835], [-0.35, 1.6, s * 0.835], [0.65, 1.6, s * 0.835], C.glass, [0, 0, s], { win: interior(0.6) });
    quadTo(g, [0.6, 0.84, s * 0.835], [-0.4, 0.84, s * 0.835], [-0.4, 1.1, s * 0.835], [0.6, 1.1, s * 0.835], C.patch, [0, 0, s]);
    // skids and struts
    frustum(g, [-1.1, 0.08, s * 0.75], [1.3, 0.08, s * 0.75], 0.06, 0.06, 6, STEEL);
    frustum(g, [1.3, 0.08, s * 0.75], [1.65, 0.32, s * 0.75], 0.06, 0.05, 6, STEEL);
    for (const x of [-0.6, 0.8]) g.beam([x, 0.08, s * 0.75], [x * 0.92, 0.6, s * 0.5], 0.04, 0.04, STEEL);
    // the boom's pale patch
    block(g, [-3.2, 1.44, s * 0.215], [-2.0, 1.66, s * 0.235], C.patch);
  }
  // the tail boom, its fin and its stabiliser
  frustum(g, [-1.3, 1.45, 0], [-4.5, 1.62, 0], 0.3, 0.13, 8, C.body);
  slab(g, [[-3.95, 1.45], [-4.6, 1.5], [-4.68, 2.65], [-4.38, 2.62]], [0, 0, 0], AX, AY, AZ, -0.05, 0.05, C.body, C.top);
  slab(g, [[-3.4, -0.75], [-3.7, -0.75], [-3.7, 0.75], [-3.4, 0.75]], [0, 1.55, 0], AX, AZ, [0, -1, 0], -0.04, 0.04, C.top);
  // the engine on its roof, and the mast
  block(g, [-1.0, 1.95, -0.42], [0.45, 2.32, 0.42], C.top, 0xcfd5dc);
  frustum(g, [-0.8, 2.05, 0.43], [-1.3, 2.05, 0.45], 0.1, 0.1, 6, GREY, { capB: BAT_DARK });
  frustum(g, [0.05, 2.3, 0], [0.05, 2.7, 0], 0.1, 0.09, 8, GREY);
  if (police) {
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
  }
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
    rbox(rg, mul(ax, 3.12), [0.13, 0.027, 0.135], ax, AY, cross(ax, AY), C.patch);
  }
  r.spinner(rg, [0.05, 2.74, 0], 'y', 17, 3.25);
  const tg = new GeoBuilder();
  rbox(tg, [0, 0, 0], [0.08, 0.55, 0.02], AX, AY, AZ, 0x3a3d44);
  r.spinner(tg, [-4.45, 2.15, 0.12], 'z', 40);
  if (police) {
    // the line it lets down, with a hook
    const hk = new GeoBuilder();
    hk.beam([0, 0, 0], [0, -0.35, 0], 0.05, 0.05, STEEL);
    hk.beam([0, -0.35, 0], [0.18, -0.42, 0], 0.045, 0.045, STEEL);
    hk.beam([0.18, -0.42, 0], [0.22, -0.25, 0], 0.04, 0.04, STEEL);
    r.line([0.2, 0.5, 0], hk);
  }
  r.solid(g);
  r.seats = [[1.15, 0.6, -0.36], [1.15, 0.6, 0.36]];
  // its rotors: the police's turn from the first frame it is shown, Wayne Enterprises' stand still until they are asked
  r.fx.rotors = (f) => { r.spin = f; };
  if (!police) r.trick('rotors', 0);
  return r;
}

const policeCopter = (k: Build, mat: THREE.Material): Rig => copter('policeCopter', k, mat, { body: COP_BLUE, top: COP_WHITE, patch: COP_PATCH, glass: COP_GLASS }, true);
const wayneCopter = (k: Build, mat: THREE.Material): Rig => copter('wayneCopter', k, mat, { body: WAYNE_BLACK, top: WAYNE_GRAPHITE, patch: WAYNE_SILVER, glass: WAYNE_GLASS }, false);

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

const MAKERS: Record<MachineKind, (k: Build, mat: THREE.Material) => Rig> = { batmobile, batboat, batplane, batgyro, batcycle, redCycle, jokermobile, rowboat, invisiblePlane, policeCopter, batwing, wayneCopter };

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
