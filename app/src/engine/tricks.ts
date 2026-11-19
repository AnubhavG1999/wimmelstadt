// Party tricks: the showpiece that one hero has and no other.
//
// A trick is written for one diecast, in src/heroes. The engine tells it how the
// hero is doing on every frame, and the trick answers with how fast it wants to
// go and what it wants to show. A trick cannot make a hero run into anything:
// the engine still slows it for bends and for whoever is ahead.
//
// Every hero smokes a little at the exhaust when it pulls away, trick or no
// trick. What a trick adds is its own.

/** What a trick is told about its hero on every frame that it drives. */
export interface TrickDrive {
  dt: number;
  time: number;
  /** 0 by day, 1 at night. */
  night: number;
  /** How fast it is going now, in units per second. */
  speed: number;
  /** How fast it would go if it were left alone. */
  cruise: number;
  /** How much clear road is ahead of it, in units. */
  gap: number;
  /** The radius of the bend it is in or coming to. Very large on a straight. */
  bend: number;
}

/** What a trick can show. Each lasts a moment, and how long grows with `strength`, from 0 to 1. */
export interface TrickFx {
  /** Flame at the exhausts. */
  flame(strength: number): void;
  /** Smoke from the rear tyres, as when they spin. */
  tyreSmoke(strength: number): void;
  /** A cloud from the exhausts, heavier than the wisp every hero makes. */
  exhaust(strength: number): void;
}

/** One hero's trick, running. */
export interface TrickRun {
  /** While it drives: the speed it wants, and how hard it pulls to reach it. Plain traffic pulls at 9. */
  drive?(d: TrickDrive, fx: TrickFx): { speed: number; accel?: number };
  /** While it stands on show. */
  idle?(dt: number, time: number, fx: TrickFx): void;
  /** How far its nose is lifted, in radians. Negative dips it. */
  readonly pitch?: number;
}

export interface PartyTrick {
  /** One line that says what the trick is. */
  about: string;
  /** Called once for each hero that has this trick. */
  start(): TrickRun;
}
