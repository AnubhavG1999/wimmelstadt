// The machines of the show, which are neither heroes nor traffic: the
// Batmobile, the Batboat, the Batplane and the Batgyro, the Batcycle and the
// Red Hood's motorcycle, the Jokermobile, the Joker's rowing boat, Wonder
// Woman's invisible plane, and the police helicopter. The show (show.ts)
// drives them; this file only builds them and says how each is moved.
//
// A stub: its builder has not written it yet, and the machines it hands out
// draw nothing. Everything exported below is what the show calls, and it stays.

import type { Build } from '../../engine/tile';

export type MachineKind =
  | 'batmobile' | 'batboat' | 'batplane' | 'batgyro' | 'batcycle' | 'redCycle'
  | 'jokermobile' | 'rowboat' | 'invisiblePlane' | 'policeCopter';

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

const SIZES: Record<MachineKind, [number, number, number]> = {
  batmobile: [9.5, 3.4, 2.2], batboat: [9, 3, 2.4], batplane: [10, 11, 2.6], batgyro: [6, 6, 3], batcycle: [4.2, 1.2, 2.2], redCycle: [4, 1.2, 2.2],
  jokermobile: [8.5, 3.2, 2.6], rowboat: [4, 1.6, 1], invisiblePlane: [8, 9, 2.2], policeCopter: [7, 6.5, 3],
};

/** Builds every machine, hidden until the show shows it. */
export function buildMachines(_k: Build): Machines {
  const made = new Map<MachineKind, Machine>();
  return {
    get(kind) {
      let m = made.get(kind);
      if (!m) {
        const [length, width, height] = SIZES[kind];
        m = { kind, length, width, height, at() {}, run() {}, lights() {}, trick() {}, seat: () => [0, 0, 0], shown() {} };
        made.set(kind, m);
      }
      return m;
    },
  };
}
