// The cast of Gotham: Batman and his family, the police, the rogues, the
// Justice League on its visits, and the walk-ons, as figures at the size of
// the tile's people, each known at a glance by its colours, its outline, its
// build and the one thing it carries.
//
// A stub: its builder has not written it yet, and the figures it hands out
// draw nothing. Everything exported below is what the show (show.ts) calls,
// and it stays: the names, and the shapes of `Figure`, `Cast` and `Pose`.

import type { Build } from '../../engine/tile';

// ---------------------------------------------------------------------------
// Who there is
// ---------------------------------------------------------------------------

/** Every named figure. */
export type CastId =
  // Batman and his family
  | 'batman' | 'robin' | 'damian' | 'nightwing' | 'redHood' | 'batgirl' | 'batwoman' | 'alfred'
  | 'huntress' | 'azrael' | 'spoiler' | 'orphan' | 'signal' | 'batMite'
  // the city
  | 'gordon' | 'bullock' | 'montoya' | 'lucius' | 'leslie' | 'vicki'
  // the rogues
  | 'joker' | 'harley' | 'penguin' | 'catwoman' | 'riddler' | 'twoFace' | 'ivy' | 'freeze' | 'scarecrow' | 'bane' | 'croc'
  | 'manBat' | 'langstrom' | 'clayface' | 'ras' | 'talia' | 'killerMoth' | 'madHatter' | 'kiteMan' | 'hush' | 'deathstroke'
  | 'blackMask' | 'talon' | 'firefly' | 'ventriloquist' | 'grundy' | 'calendarMan' | 'hugoStrange' | 'tweedledum' | 'tweedledee' | 'polkaDotMan'
  // the Justice League
  | 'superman' | 'wonderWoman' | 'flash' | 'greenLantern' | 'aquaman' | 'martianManhunter';

/** The kinds of unnamed figure the stories need several of. */
export type ExtraKind = 'officer' | 'clown' | 'thug' | 'assassin' | 'citizen' | 'fisher' | 'doorman' | 'guard' | 'collector';

/**
 * What a figure looks like. Its builder says what fields it has; the show only
 * reads these two.
 */
export interface Look {
  /** Who it is, for the console and the checks. */
  name: string;
  /** How tall, to the top of the head, in units: one of the tile's people is 2.3. */
  height: number;
  [more: string]: unknown;
}

// ---------------------------------------------------------------------------
// How a figure stands
// ---------------------------------------------------------------------------

/**
 * A pose, as angles in radians. Every one is 0 for a figure standing straight
 * with its arms at its sides. Forward is the way the figure faces.
 */
export interface Pose {
  /** The body leans forward (positive) or back, from the hips. */
  lean: number;
  /** The body leans to its left (positive) or right. */
  tilt: number;
  /** The shoulders turn, to the left positive. */
  twist: number;
  /** The head turns, to the left positive, and nods forward (positive). */
  head: number;
  nod: number;
  /** Each leg swings forward (positive) from the hip, and its knee bends (positive). Both add to what a crouch bends by itself. */
  hipL: number;
  hipR: number;
  kneeL: number;
  kneeR: number;
  /** Each arm swings forward (positive) from the shoulder, up to straight overhead at about 3; out to the side (positive); and its elbow bends. */
  armL: number;
  armR: number;
  spreadL: number;
  spreadR: number;
  elbowL: number;
  elbowR: number;
  /** How far the whole figure sinks, as in a crouch or a kneel: 0 to 1. The knees bend by themselves to keep the feet on the ground. */
  crouch: number;
  /** The legs spread apart sideways, as astride a motorcycle: 0 to 1. */
  straddle: number;
}

export const STANDING: Pose = { lean: 0, tilt: 0, twist: 0, head: 0, nod: 0, hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, armL: 0, armR: 0, spreadL: 0, spreadR: 0, elbowL: 0, elbowR: 0, crouch: 0, straddle: 0 };

/** A figure on the tile, which the show moves and poses. */
export interface Figure {
  readonly look: Look;
  /** Stands it with its feet on whatever is at height `y`, at (x, z), facing `heading` (radians: 0 east, a quarter turn south). */
  at(x: number, y: number, z: number, heading: number): void;
  /**
   * Turns the whole body about its middle, legs and all: `pitch` forward
   * (a flyer level in the air is about 1.45, one hanging by its feet is
   * pi) and `roll` to its right (a cartwheel goes round in roll). 0, 0 is
   * upright. `at` still says where its feet would be if it stood.
   */
  lie(pitch: number, roll?: number): void;
  /** Poses it. What is left out is as in STANDING. */
  pose(p: Partial<Pose>): void;
  /**
   * What it carries: `out` from 0, put away, closed or at its side, to 1, out,
   * open or raised (an umbrella opened, a whip cracked, a sword drawn, a coin
   * in the air, a lasso thrown), and `spin`, a turn in radians for what turns
   * (the umbrella's canopy, the coin, the mallet).
   */
  hold(out: number, spin?: number): void;
  /** Its cape, cloak or coat-tails: `stream` from 0 hanging still to 1 streaming out behind, and `spread` from 0 to 1 opened wide to either side like wings. */
  cape(stream: number, spread?: number): void;
  /** Whatever on it gives light, from 0 to 1: a cowl's white eyes, a ring, a helmet's dome, a lasso. */
  glow(f: number): void;
  /** How large it is drawn, 1 as its look says: for a figure that shrinks, swells or melts. */
  size(s: number): void;
  /** Shown, or hidden. */
  shown(v: boolean): void;
}

/** Everyone on the tile. */
export interface Cast {
  /** A figure with this look, standing nowhere and hidden until it is put somewhere and shown. */
  add(look: Look): Figure;
  /** Called once a frame, after posing: writes what changed into the meshes. */
  commit(): void;
  /** How many triangles one figure costs on average, for the console. */
  triangles(): number;
}

// ---------------------------------------------------------------------------
// The looks
// ---------------------------------------------------------------------------

const NOBODY = (name: string): Look => ({ name, height: 2.6 });

/** The look of every named figure. */
export const LOOKS: Record<CastId, Look> = new Proxy({} as Record<CastId, Look>, { get: (_t, id) => NOBODY(String(id)) });

/** The looks of the unnamed, by kind. */
export const EXTRAS: Record<ExtraKind, Look> = new Proxy({} as Record<ExtraKind, Look>, { get: (_t, id) => NOBODY(String(id)) });

// ---------------------------------------------------------------------------
// Poses, each at a moment `t` from 0 to 1 of its round or of its doing
// ---------------------------------------------------------------------------

type Move = (t: number) => Partial<Pose>;
const STILL: Move = () => ({});

/** A walk and a run, one stride to a round; the Penguin's waddle. */
export const walk: Move = STILL, run: Move = STILL, waddle: Move = STILL;
/** A leap: gathering at 0, in the air at a half, landing at 1. */
export const leap: Move = STILL;
/** Crouched on a gargoyle or a roof's edge, cape about it, looking down. */
export const perch: Move = STILL;
/** Hanging from a line by one raised arm, legs trailing: swinging forward as t grows. */
export const swing: Move = STILL;
/** Arms out to either side and legs together, as under a spread cape. */
export const glide: Move = STILL;
/** One arm stretched ahead, the other at the side, legs together: for a body that `lie` has laid level. */
export const fly: Move = STILL;
/** A blow with what it holds, a parry, and a lunge. */
export const strike: Move = STILL, parry: Move = STILL, lunge: Move = STILL;
/** A bow, a salute, a kneel, sitting down, pointing, a shrug, laughing with the head thrown back. */
export const bow: Move = STILL, salute: Move = STILL, kneel: Move = STILL, sit: Move = STILL, point: Move = STILL, shrug: Move = STILL, laugh: Move = STILL;
/** Tossing or flipping something up with the right hand, and catching it. */
export const toss: Move = STILL, caught: Move = STILL;
/** Holding something large overhead in both hands. */
export const carry: Move = STILL;
/** Both arms pushing, climbing hand over hand, a swimming stroke, rowing, sitting at a wheel or on a saddle. */
export const push: Move = STILL, climb: Move = STILL, swim: Move = STILL, row: Move = STILL, drive: Move = STILL;
/** Arms crossed on the chest and legs together, for one that hangs by its feet. */
export const hang: Move = STILL;
/** Arms and legs spread like a star, for a cartwheel that `lie` turns. */
export const star: Move = STILL;
/** At ease, looking about: for a figure at home. */
export const idle: Move = STILL;

/** One pose blended into another. */
export function blend(a: Partial<Pose>, b: Partial<Pose>, t: number): Partial<Pose> {
  const out: Partial<Pose> = {};
  for (const key of Object.keys(STANDING) as (keyof Pose)[]) out[key] = (a[key] ?? 0) + ((b[key] ?? 0) - (a[key] ?? 0)) * t;
  return out;
}

// ---------------------------------------------------------------------------
// Building them
// ---------------------------------------------------------------------------

/** Builds the meshes every figure is drawn from, and hands back the cast. */
export function buildCast(_k: Build): Cast {
  const nobody = (look: Look): Figure => ({ look, at() {}, lie() {}, pose() {}, hold() {}, cape() {}, glow() {}, size() {}, shown() {} });
  return { add: nobody, commit() {}, triangles: () => 0 };
}
