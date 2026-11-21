// What every story is written with: places and how a figure stands at one,
// the ways of getting from one place to another, and the few small things the
// show draws itself: taut lines, glowing specks, and rings on the water.
//
// The stories are in stories.ts and their director in show.ts.

import * as THREE from 'three';
import type { V3 } from '../../engine/geo';
import type { Build } from '../../engine/tile';
import type { Air } from './air';
import type { Beasts } from './beasts';
import { fly, glide, idle, leap, run, swing, waddle, walk, type Pose } from './figures';
import type { Machines } from './machines';
import type { Place } from './models';
import type { Solid } from './solid';

export const TAU = Math.PI * 2;
export const E = 0, S = Math.PI / 2, W = Math.PI, N = -Math.PI / 2;
/** The way the opening view looks back from: a figure that faces it shows its front. */
export const TO_VIEW = Math.atan2(0.743, 0.669);

export const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));
export const ease = (t: number): number => { const c = clamp(t); return c * c * (3 - 2 * c); };
/** How far through a stretch of time a moment is, from 0 before it to 1 after it. */
export const span = (t: number, t0: number, t1: number): number => clamp((t - t0) / Math.max(1e-6, t1 - t0));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** The way from one place to another, as a heading: 0 east, a quarter turn south. */
export const toward = (ax: number, az: number, bx: number, bz: number): number => Math.atan2(bz - az, bx - ax);
/** Turns from one heading to another the shorter way, by t. */
export function turnTo(a: number, b: number, t: number): number {
  const d = ((b - a + Math.PI * 3) % TAU) - Math.PI;
  return a + d * clamp(t);
}

// ---------------------------------------------------------------------------
// Places, and how a figure is at one
// ---------------------------------------------------------------------------

/** A place a figure stands, on whatever is at height y, facing h. */
export type Spot = Place;
export const at = (x: number, y: number, z: number, h: number): Spot => ({ x, y, z, h });
/** A place `d` ahead of another and `s` to its right, on the same height, facing the same way or `h`. */
export const beside = (p: Spot, d: number, s = 0, h = p.h): Spot => at(p.x + Math.cos(p.h) * d - Math.sin(p.h) * s, p.y, p.z + Math.sin(p.h) * d + Math.cos(p.h) * s, h);

/** Everything the show sets on a figure at one moment. */
export interface State extends Spot {
  pose: Partial<Pose>;
  /** What it carries: put away at 0, out at 1; and how far what turns has turned. */
  hold: number;
  spin: number;
  /** Its cape: streaming from 0 to 1, and spread like wings from 0 to 1. */
  cape: number;
  spread: number;
  glow: number;
  /** The whole body turned: pitched forward, rolled to its right. */
  pitch: number;
  roll: number;
  size: number;
  shown: boolean;
  /** Where the line it hangs from is made fast, if it hangs from one: the show draws it from its raised hand. */
  line: V3 | null;
  /** In the air on purpose: leaping, swinging, flying, falling. The check lets it be off the ground. */
  aloft: boolean;
  /** Held close to another figure on purpose: carried, caught, in a clinch. The check lets it be near one. */
  close: boolean;
}

export const still = (s: Spot, pose: Partial<Pose> = {}, more: Partial<State> = {}): State => ({
  x: s.x, y: s.y, z: s.z, h: s.h, pose, hold: 0, spin: 0, cape: 0, spread: 0, glow: 0, pitch: 0, roll: 0, size: 1, shown: true, line: null, aloft: false, close: false, ...more,
});
/** Out of sight, wherever it is. */
export const hidden = (s: Spot): State => still(s, {}, { shown: false });

// ---------------------------------------------------------------------------
// Getting about
// ---------------------------------------------------------------------------

/** A way from one place to another, which takes `dur` seconds, and how the figure is on it at each moment. */
export interface Leg { dur: number; at(t: number): State }

/** How a figure gets about when a story calls it from far off. */
export type Way =
  /** On a line: a leap, an arc under a taut line made fast above, the cape spread on the way down. Batman and his family, and Catwoman on her whip. */
  | 'line'
  /** Through the air level, an arm ahead: the League's flyers. */
  | 'fly'
  /** On wings of its own, or a kite's. */
  | 'wings'
  /** Under an umbrella whose canopy spins: the Penguin. */
  | 'umbrella'
  /** Too fast to see but for a streak: the Flash. */
  | 'dash'
  /** On foot, and if it is far, out of sight by the nearest way and in again where it is wanted. */
  | 'foot';

export const WALK = 2.2, RUN = 5.6, SWING = 16, FLY = 22, DRIFT = 9;

export function walkLeg(a: Spot, b: Spot, speed = WALK, gait: (t: number) => Partial<Pose> = speed > 3 ? run : walk, more: Partial<State> = {}): Leg {
  const d = Math.hypot(b.x - a.x, b.z - a.z), h = d > 0.05 ? toward(a.x, a.z, b.x, b.z) : a.h;
  const dur = d / speed + 0.6, stride = speed > 3 ? 2.6 : 1.6;
  return {
    dur,
    at(t) {
      const s = clamp((t - 0.3) / Math.max(1e-6, dur - 0.6));
      // turn to the way first, and to the place's own way at the end
      const head = t < 0.3 ? turnTo(a.h, h, t / 0.3) : t > dur - 0.3 ? turnTo(h, b.h, (t - dur + 0.3) / 0.3) : h;
      const pose = s > 0 && s < 1 ? gait(((s * d) / stride) % 1) : {};
      return still(at(lerp(a.x, b.x, s), lerp(a.y, b.y, s), lerp(a.z, b.z, s), head), pose, { cape: speed > 3 ? 0.5 : 0.15, ...more });
    },
  };
}

/** How high an arc from one place to another must rise over the straight line between them to clear what is built under it by `clear`. */
export function bumpOver(solid: Solid, a: Spot, b: Spot, lift: number, clear: number, least: number): number {
  let bump = least;
  for (let i = 1; i < 28; i++) {
    const s = i / 28, x = lerp(a.x, b.x, s), z = lerp(a.z, b.z, s), base = lerp(a.y + lift, b.y + lift, s);
    // a little to either side as well, since a body and a cape have width
    const dx = -(b.z - a.z), dz = b.x - a.x, l = Math.hypot(dx, dz) || 1;
    const top = Math.max(solid.top(x, z), solid.top(x + (dx / l) * 1.2, z + (dz / l) * 1.2), solid.top(x - (dx / l) * 1.2, z - (dz / l) * 1.2));
    bump = Math.max(bump, (top + clear - base) / Math.max(0.15, Math.sin(Math.PI * s)));
  }
  return bump;
}

/**
 * On a line: a leap up off the place, an arc under a line made fast high
 * ahead, the cape opening as the figure comes down, and a crouched landing.
 */
export function lineLeg(solid: Solid, a: Spot, b: Spot): Leg {
  const d = Math.hypot(b.x - a.x, b.z - a.z), up = 1.2;
  const bump = bumpOver(solid, a, b, up, 2.4, 1.5 + d * 0.08);
  const rise = 0.45, land = 0.5, swingT = Math.max(0.9, (d + bump * 1.4) / SWING);
  const dur = rise + swingT + land, h = d > 0.05 ? toward(a.x, a.z, b.x, b.z) : a.h;
  // the line is made fast over the arc's top, a little ahead of it
  const fast: V3 = [lerp(a.x, b.x, 0.56), lerp(a.y, b.y, 0.56) + up + bump + 5, lerp(a.z, b.z, 0.56)];
  return {
    dur,
    at(t) {
      if (t < rise) {
        const s = t / rise;
        return still(at(a.x, a.y + up * ease(s), a.z, turnTo(a.h, h, s)), leap(0.15 + 0.35 * s), { cape: 0.4 * s, hold: 0, aloft: true });
      }
      if (t < rise + swingT) {
        const s = (t - rise) / swingT, e = ease(s);
        const y = lerp(a.y + up, b.y + up, e) + bump * Math.sin(Math.PI * e);
        const rising = s < 0.55;
        return still(at(lerp(a.x, b.x, e), y, lerp(a.z, b.z, e), h), rising ? swing(s / 0.55) : glide((s - 0.55) / 0.45), {
          cape: 1, spread: rising ? 0.15 : ease((s - 0.55) / 0.3), line: rising ? fast : null, pitch: rising ? 0.25 : 0.5 * (1 - (s - 0.55) / 0.45), aloft: true,
        });
      }
      const s = (t - rise - swingT) / land;
      return still(at(b.x, b.y + up * (1 - ease(s)), b.z, turnTo(h, b.h, s)), leap(0.7 + 0.3 * s), { cape: 1 - s, spread: 1 - s, aloft: s < 0.8 });
    },
  };
}

/** Through the air: up off the place, level along an arc that clears everything, and down. `how` says what the figure does with itself on the way. */
export function airLeg(solid: Solid, a: Spot, b: Spot, how: 'fly' | 'wings' | 'umbrella' | 'dash'): Leg {
  const d = Math.hypot(b.x - a.x, b.z - a.z), up = how === 'umbrella' ? 1.6 : 2.2;
  const bump = bumpOver(solid, a, b, up, 3, how === 'umbrella' ? 4 + d * 0.05 : 2.5 + d * 0.05);
  const speed = how === 'umbrella' ? DRIFT : how === 'wings' ? 15 : FLY;
  const rise = how === 'umbrella' ? 1.0 : 0.6, land = how === 'umbrella' ? 1.0 : 0.6, mid = Math.max(1, (d + bump * 1.5) / speed);
  const dur = rise + mid + land, h = d > 0.05 ? toward(a.x, a.z, b.x, b.z) : a.h;
  const level = how === 'umbrella' ? 0 : how === 'wings' ? 1.1 : 1.45;
  const more = (f: number): Partial<State> => ({ aloft: true, ...(how === 'umbrella' ? { hold: 1, spin: f * 40 } : how === 'wings' ? { cape: 1, spread: 1 } : { cape: 1 }) });
  return {
    dur,
    at(t) {
      if (t < rise) {
        const s = t / rise;
        return still(at(a.x, a.y + up * ease(s), a.z, turnTo(a.h, h, s)), how === 'umbrella' ? {} : leap(0.2 + 0.3 * s), { ...more(t), pitch: level * s * 0.5 });
      }
      if (t < rise + mid) {
        const s = (t - rise) / mid, e = ease(s);
        const y = lerp(a.y + up, b.y + up, e) + bump * Math.sin(Math.PI * e);
        // an umbrella's rider paddles his legs; a flyer lies level
        const pose = how === 'umbrella' ? waddle((t * 1.6) % 1) : fly(s);
        return still(at(lerp(a.x, b.x, e), y, lerp(a.z, b.z, e), h), pose, { ...more(t), pitch: level });
      }
      const s = (t - rise - mid) / land;
      return still(at(b.x, b.y + up * (1 - ease(s)), b.z, turnTo(h, b.h, s)), how === 'umbrella' ? {} : leap(0.7 + 0.3 * s), { ...more(t), ...(how === 'umbrella' ? { hold: 1 - s } : {}), pitch: level * (1 - s) * 0.5 });
    },
  };
}

/** On foot when it is near and level; else out of sight by the nearest way, and in again where it is wanted. */
export function footLeg(a: Spot, b: Spot, hurry: boolean, gait?: (t: number) => Partial<Pose>): Leg {
  const d = Math.hypot(b.x - a.x, b.z - a.z), dy = Math.abs(b.y - a.y);
  if (dy < 1.2 && d < (hurry ? 30 : 16)) return walkLeg(a, b, hurry ? RUN : WALK, gait);
  // a few steps the way it is going, then gone; it is where it is wanted when the story shows it
  const h = toward(a.x, a.z, b.x, b.z), off = at(a.x + Math.cos(h) * 1.6, a.y, a.z + Math.sin(h) * 1.6, h), out = walkLeg(a, off, WALK, gait);
  return { dur: out.dur + 0.2, at: (t) => (t < out.dur ? out.at(t) : hidden(b)) };
}

/** The way a figure takes between two places, by how it gets about. */
export function legBetween(solid: Solid, way: Way, a: Spot, b: Spot, hurry = false, gait?: (t: number) => Partial<Pose>): Leg {
  const d = Math.hypot(b.x - a.x, b.z - a.z), dy = Math.abs(b.y - a.y);
  if (d < 0.05 && dy < 0.05) return { dur: 0, at: () => still(b) };
  // near and level, everyone walks
  if (dy < 1.2 && d < (hurry ? 20 : 11) && way !== 'dash') return walkLeg(a, b, hurry ? RUN : WALK, gait);
  if (way === 'line') return lineLeg(solid, a, b);
  if (way === 'foot') return footLeg(a, b, hurry, gait);
  return airLeg(solid, a, b, way);
}

// ---------------------------------------------------------------------------
// What the show draws itself
// ---------------------------------------------------------------------------

/** Thin taut lines, drawn in one batch: a grapple's line, a whip, a lasso, a rope under a helicopter. */
export class Lines {
  readonly mesh: THREE.InstancedMesh;
  private n = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly v = new THREE.Vector3();
  private readonly mid = new THREE.Vector3();
  private readonly sc = new THREE.Vector3();
  private readonly col = new THREE.Color();
  private static readonly Z = new THREE.Vector3(0, 0, 1);
  constructor(k: Build, max = 48, glowing = false) {
    const mat = glowing
      ? new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
      : new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, max);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    if (glowing) this.mesh.renderOrder = 3;
    k.group.add(this.mesh);
  }
  /** Starts a frame's lines afresh. */
  begin(): void { this.n = 0; }
  /** A line from a to b, `w` thick, in a colour. */
  line(a: V3, b: V3, w: number, color: number): void {
    if (this.n >= this.mesh.instanceMatrix.count) return;
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], l = Math.hypot(dx, dy, dz) || 1e-3;
    this.q.setFromUnitVectors(Lines.Z, this.v.set(dx / l, dy / l, dz / l));
    this.m.compose(this.mid.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), this.q, this.sc.set(w, w, l));
    this.mesh.setMatrixAt(this.n, this.m);
    this.mesh.setColorAt(this.n, this.col.set(color));
    this.n++;
  }
  /** A speck, `r` across, at a place. */
  speck(p: V3, r: number, color: number): void {
    this.line([p[0], p[1] - r / 2, p[2]], [p[0], p[1] + r / 2, p[2]], r, color);
  }
  end(): void {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

/** Rings that spread over the ground or the water and fade: a splash, a pulse, a burst. */
export class Rings {
  private readonly meshes: THREE.Mesh[] = [];
  constructor(k: Build, n = 8) {
    const geo = new THREE.RingGeometry(0.82, 1, 36).rotateX(-Math.PI / 2);
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      mesh.visible = false;
      mesh.renderOrder = 3;
      k.group.add(mesh);
      this.meshes.push(mesh);
    }
  }
  /** Shows ring `i` at a place, `r` across, as bright as `a` (0 hides it). */
  set(i: number, p: V3, r: number, a: number, color = 0xdfeeff): void {
    const mesh = this.meshes[i];
    if (!mesh) return;
    mesh.visible = a > 0.01;
    if (!mesh.visible) return;
    mesh.position.set(p[0], p[1], p[2]);
    mesh.scale.setScalar(Math.max(0.05, r));
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = clamp(a);
    mat.color.set(color);
  }
  hideAll(): void { for (const m of this.meshes) m.visible = false; }
}

// ---------------------------------------------------------------------------
// What a story is
// ---------------------------------------------------------------------------

export type Id = string;

/** What a story's body says each figure is doing: `put` sets one, and `from` asks where one stood when the body began. */
export interface Putter {
  put(id: Id, s: State): void;
  from(id: Id): Spot;
}

/**
 * The mirror pool of Wayne Manor's pool garden, which is the lid of the Batcave's lift (bristol.ts builds it):
 * `open` slides its two halves apart, from 0 shut to 1 open, and `lift` raises the platform under it, from 0 down
 * on the cave's floor to 1 level with the garden. A story that moves either puts both back to 0 when it ends.
 */
export interface Hatch { open(f: number): void; lift(f: number): void }

/** Everything a story can reach. */
export interface World {
  solid: Solid;
  /** Where each figure rests between stories, or null if it is away until a story brings it. */
  posts: Record<Id, Spot | null>;
  /** A place a builder's file gives by name, or the one the story falls back on while that file is not built. */
  place(file: string, name: string, or: Spot): Spot;
  air: Air | null;
  machines: Machines | null;
  beasts: Beasts | null;
  /** The show's own lines, lit specks and rings, for the frame being drawn. */
  lines: Lines;
  glints: Lines;
  rings: Rings;
  /** The east chapter's own rings: its stories are handed these as `rings`, so that the two chapters never share one. */
  ringsEast: Rings;
  /** How dark it is now, from 0 at noon to 1 at night. */
  night(): number;
  /** The lid over the Batcave's lift, in the Manor's pool garden, and the lift under it: null if it could not be built. */
  hatch: Hatch | null;
}

export interface StoryDef {
  id: string;
  name: string;
  cast: Id[];
  /** What it holds while it plays: its stages, and things only one story may have at a time ('signal', 'sky', 'batmobile'). */
  holds: string[];
  /** How often it should play, by its turn: 1 as often as any other. */
  weight: number;
  /** Where each figure must be when the body begins: a place, or 'post' to stay at its post. A figure that is away appears there when the body shows it. */
  marks: Record<Id, Spot | 'post'>;
  /** How long its body lasts, in seconds. */
  body: number;
  /** Whether it may begin now. */
  may?(W: World): boolean;
  /** Poses its cast at body time tb. A figure it leaves alone holds what it was last given. */
  play(tb: number, P: Putter): void;
  /** Moves what it moves besides its figures at body time tb. If `live`, it may also do what can only be done once, through `once`. */
  props?(tb: number, live: boolean, once: (key: string, fn: () => void) => void): void;
  /** Called when it ends, however it ended: puts everything it moved back. */
  end?(): void;
}

/** A figure at rest: how it is at its post at time t. */
export type Rest = (t: number, post: Spot) => State;

/** Looking about at ease. */
export const atEase: Rest = (t, post) => still(post, { ...idle((t * 0.07) % 1), head: Math.sin(t * 0.31) * 0.6 * (Math.sin(t * 0.11) > 0.3 ? 1 : 0) });
