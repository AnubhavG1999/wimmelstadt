// The Iron Rain itself, and the weather of the battle: waves of starShells
// fired from the spitTubes of the Pax and the Morning Star, glowing as they
// fall and shedding the panels that burn away, firing their gravBoots at the
// cloud and fanning out into squadrons, landing in rings of dust, splitting
// their outer husks and stepping out; the shield over Agea, which turns them
// aside until Mustang drops it; a broken layer of cloud under the fleet; the
// thunderstorm coming in from the east (GS 38); and the canyon's guns firing
// up. Every shell, trail, husk and knight is drawn from instanced meshes, so
// that a wave of sixty costs a handful of draw calls.
//
// One builder's file: see the builders' brief. It is a stub until it is built.

import type { V3 } from '../../engine/geo';
import type { Build } from '../../engine/tile';

/** A rectangle of ground where shells may land. */
export interface Zone { x0: number; z0: number; x1: number; z1: number }

export interface Rain {
  /**
   * Fires a wave of `count` shells. `from` says where the launching ship's
   * spitTube mouths are at this moment (the ship moves), and each shell picks
   * a mouth and a place in one of `zones`. Shells fired while the shield is up
   * at a place under it are turned aside onto the nearest zone outside it.
   * Returns how many seconds until the last of them has landed and its knight
   * has stepped out.
   */
  wave(from: () => V3[], zones: Zone[], count: number): number;
  /**
   * Drops one marked shell, painted `paint` (the Reaper's red, a Howler's
   * grey), from a place to a place, and calls `opened` when it has landed and
   * split, so that the show can stand the figure who was in it there. Returns
   * the seconds until it opens.
   */
  drop(from: V3, to: V3, paint: number, opened?: () => void): number;
  /** The shield over the city. `down` shatters it over a few seconds, section by section (story 5); `up` raises it again. */
  shield: { up(): void; down(): void; isUp(): boolean };
  /** Stands everything still as it is at `t` seconds, for pictures; null lets it go. */
  hold(t: number | null): void;
}

/** The stub: nothing falls, and the shield is always up. */
export function buildRain(_k: Build, _ground: (x: number, z: number) => number): Rain {
  let up = true;
  return {
    wave: () => 0,
    drop: (_f, _t, _p, opened) => {
      opened?.();
      return 0;
    },
    shield: { up: () => void (up = true), down: () => void (up = false), isUp: () => up },
    hold: () => {},
  };
}
