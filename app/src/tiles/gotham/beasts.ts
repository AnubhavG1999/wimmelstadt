// The animals of Gotham: Ace the Bat-Hound, Titus, Bat-Cow and Alfred the
// cat at the Manor, Catwoman's black cat, Harley's two hyenas, Krypto when
// Superman calls, Aquaman's seahorse; and the flocks: the cave's bats, the
// Scarecrow's crows, the Penguin's birds, pigeons on the gargoyles, gulls on
// the harbour, and the grinning fish.
//
// A stub: its builder has not written it yet, and what it hands out draws
// nothing. Everything exported below is what the show calls, and it stays.

import type { Build } from '../../engine/tile';

export type BeastKind = 'ace' | 'titus' | 'batCow' | 'alfredCat' | 'blackCat' | 'hyena' | 'krypto' | 'seahorse';

/** One animal. */
export interface Beast {
  readonly kind: BeastKind;
  /** Stands it on whatever is at height `y`, facing `heading`. */
  at(x: number, y: number, z: number, heading: number): void;
  /** How it goes: `phase` from 0 to 1 is one stride, and `how` its manner: 0 standing, 1 walking, 2 running, 3 sitting, 4 lying. */
  gait(phase: number, how?: number): void;
  shown(v: boolean): void;
}

export type FlockKind = 'bats' | 'crows' | 'pigeons' | 'gulls' | 'birds' | 'fish';

/**
 * A flock: many small animals drawn in one batch, which the show steers as a
 * cloud. Each bird has a place of its own in the cloud and beats its wings by
 * itself; a fish leaps in an arc out of the water and falls back.
 */
export interface Flock {
  readonly kind: FlockKind;
  /**
   * Where the cloud's middle is and how it is shaped: `spread` is how far it
   * reaches sideways and `tall` how far up and down, `n` how many of its
   * animals are out (the rest are hidden), `swirl` how fast they wheel round
   * the middle, and `heading` the way they stream if `stream` is over 0 (0
   * they mill about, 1 they fly in a line that way).
   */
  set(o: { x: number; y: number; z: number; spread: number; tall?: number; n: number; swirl?: number; heading?: number; stream?: number }): void;
  /** Called every frame: moves the animals on. */
  step(dt: number): void;
  shown(v: boolean): void;
}

export interface Beasts {
  /** A new animal of a kind, hidden until it is shown. */
  beast(kind: BeastKind): Beast;
  /** A new flock of a kind with room for `max` animals, hidden until it is shown. */
  flock(kind: FlockKind, max: number): Flock;
  /** Called once a frame, after everything is placed: writes what changed into the meshes. */
  commit(): void;
}

/** Builds the meshes the animals are drawn from, and hands back what makes them. */
export function buildBeasts(_k: Build): Beasts {
  return {
    beast: (kind) => ({ kind, at() {}, gait() {}, shown() {} }),
    flock: (kind) => ({ kind, set() {}, step() {}, shown() {} }),
    commit() {},
  };
}
