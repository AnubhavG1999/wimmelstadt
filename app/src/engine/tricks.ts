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
  /** How much clear road is behind it, to the next one on its own road, in units. */
  behind: number;
  /** The radius of the bend it is in or coming to. Very large on a straight. */
  bend: number;
  /** Which way that bend goes: 1 to the right, -1 to the left, 0 on a straight. */
  turn: number;
  /** How far the road runs straight on ahead of it, before its next bend, in units. */
  straight: number;
  /** How many of the tile's figures stand near enough to see it. */
  crowd: number;
  /** How wet the road is, from 0 to 1. */
  wet: number;
  /** How far round its road it is, from 0 to 1. A new lap begins where this falls back towards 0. */
  lap: number;
}

/** What a trick can show. Each lasts a moment, and how long grows with `strength`, from 0 to 1. */
export interface TrickFx {
  /** Flame at the exhausts: yellow and orange, or blue. */
  flame(strength: number, blue?: boolean): void;
  /** Smoke from the rear tyres, as when they spin. */
  tyreSmoke(strength: number): void;
  /** A cloud from the exhausts, heavier than the wisp every hero makes. */
  exhaust(strength: number): void;
  /** Its headlamps, lit for an instant: one flash. `colour` is theirs, if they are not white. */
  lamps(strength: number, colour?: number): void;
  /** Mist thrown up behind it, as wide tyres throw it up on a wet road. */
  mist(strength: number): void;
  /** Sparks: from under its nose, as a splitter throws them when it touches the road, or from under the whole of it. */
  sparks(strength: number, from?: 'nose' | 'under'): void;
  /** Its brake discs, glowing through its wheels: dull red at a little heat, orange at a lot. They cool by themselves. */
  glow(heat: number): void;
  /** Black marks laid on the road by its rear tyres, or by all four, for as long as the trick goes on asking. They fade away in under a minute. */
  marks(strength: number, all?: boolean): void;
  /** Two ribbons drawn through the air from the corners of its tail, in `colour`, `up` units above the road: white off the tips of a wing, red from its lamps. */
  streaks(strength: number, colour?: number, up?: number): void;
  /** A smoke screen: thick smoke from the whole width of its tail, which hangs where it was laid. */
  screen(strength: number): void;
  /** A glow on the road under it and round it, in `colour`. */
  under(strength: number, colour?: number): void;
  /** Two jets of white vapour from its bonnet, one to each side. */
  purge(strength: number): void;
  /** Flashbulbs: the cameras of the tile's figures that stand near it. Where nobody stands, nothing happens. */
  bulbs(strength: number): void;
  /** Its four hazard lamps, lit for an instant: the trick calls this on and off to make them blink. */
  hazards(): void;
}

/** One hero's trick, running. */
export interface TrickRun {
  /** While it drives: the speed it wants, and how hard it pulls to reach it. Plain traffic pulls at 9. */
  drive?(d: TrickDrive, fx: TrickFx): { speed: number; accel?: number };
  /** While it stands on show. */
  idle?(dt: number, time: number, fx: TrickFx): void;
  /** How far its nose is lifted, in radians. Negative dips it. It stands on its rear wheels to lift its nose and on its front ones to dip it. */
  readonly pitch?: number;
  /**
   * How far it is turned from the way it is going, in radians: a slide.
   * Positive turns its nose to its right, which swings its tail out to its
   * left. It turns about a place just ahead of its middle, so that its nose
   * keeps near its line and its tail does the travelling.
   */
  readonly slide?: number;
  /** How far to the right of its line it is, in units. The engine keeps it inside its lane. */
  readonly sway?: number;
  /** How far it leans to its right, in radians. It turns about its own middle, so it can go right over. */
  readonly roll?: number;
  /** How far it is off the road, in units. Its shadow stays where it was. */
  readonly rise?: number;
}

/** A place on a hero where its exhaust comes out. */
export interface Pipe {
  /** How far ahead of its middle, as a share of its length: -0.5 is its tail. */
  along: number;
  /** How far to the right of its middle, as a share of its width: -0.5 is its left flank. */
  across: number;
  /** Which way it points. */
  points: 'back' | 'left' | 'right';
  /** How high it is above the road, in units. A pipe at the tail is at 0.6. */
  up?: number;
  /** How big it is beside one of an ordinary pair: 2 throws as much flame as both of those together, and further. */
  bore?: number;
  /** How far its flame carries when it is blown hardest, as a share of the hero's own length. With this it is a jet, all of which goes that far; without it, a burst that is thickest at the pipe. */
  reach?: number;
}

/** Where a hero's headlamps are. One is given, the right-hand one, and the other mirrors it. */
export interface Lamp {
  /** How far ahead of its middle, as a share of its length: 0.5 is the tip of its nose. */
  along: number;
  /** How far to the right of its middle, as a share of its width. */
  across: number;
  /** How high it is above the road, in units. */
  up: number;
  /** How wide the lamp is, as a share of the hero's width. */
  wide: number;
}

export interface PartyTrick {
  /** One line that says what the trick is. */
  about: string;
  /** Where its exhaust comes out, if that is not from two pipes at its tail. Its flame and its smoke come from there. */
  pipes?: Pipe[];
  /** Where its headlamps are, for a trick that lights them. Set by eye, so that the light lies over the lamp. */
  lamps?: Lamp;
  /** Called once for each hero that has this trick. */
  start(): TrickRun;
}
