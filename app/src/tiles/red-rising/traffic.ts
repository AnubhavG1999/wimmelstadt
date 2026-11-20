// The Augustan ground column, which is the tile's traffic (GS 39): hover
// skiffs carrying Gray infantry, speederbikes (gravBikes that float half a
// metre up on thrusters), and supply haulers, all floating, so that gliding
// along the roads is right for them; and spider tanks, which walk on legs that
// move, on paths of their own beside the roads. The books give none of their
// looks: they are the tile's own drawing, in the Augustan colours.
//
// One builder's file: see the builders' brief. It is a stub until it is built.

import type { TrafficKind, Build } from '../../engine/tile';

/** The column's kinds, which the routes ask for by name. Empty until built: the routes fall back to the plain kinds. */
export const KINDS: TrafficKind[] = [];

/** Spider tanks walking their own paths: the stub builds none. */
export function buildSpiders(_k: Build): void {}
