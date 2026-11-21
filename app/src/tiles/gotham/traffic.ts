// Gotham's own traffic: police cruisers, yellow cabs, armoured trucks, the
// Gazette's vans, Ace Chemicals' tankers, and a few cars of the 1940s; and its
// boats: a tug with barges on the Gotham River, the launch to Blackgate, and
// the police's harbour patrol.
//
// A stub: its builder has not written it yet. Until then the tile has no kinds
// of its own, plain traffic drives its roads in Gotham's dark paint, and no
// boat moves. Everything exported below is what the tile calls, and it stays.

import type { Build, TrafficKind } from '../../engine/tile';

/** The tile's own kinds of traffic. */
export const KINDS: TrafficKind[] = [];

/** For each of the tile's routes, by its id in roads.ts: which kinds drive it. A route that is not named here keeps plain traffic. */
export const MIX: Record<string, string[]> = {};

/** Each boat's line on the water, as corners [x, z], so that the show can keep clear of it. */
export const BOAT_LINES: Record<string, [number, number][]> = {};

/** Builds the boats and sets them going. `hold(t)` stands them as they are at `t` seconds, and `hold(null)` lets them go. */
export function buildBoats(_k: Build): { hold(t: number | null): void } {
  return { hold() {} };
}
