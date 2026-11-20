// The Citadel of Agea: its white and red spires, the lions of House Augustus, its outer wall and tea gardens, the bunker's door, the terrace where Lorn taught the Willow Way, the landing pads with the Sovereign's shuttle and three decoys, and the Field of Mars.
//
// One builder's file: see the builders' brief. It is a stub until it is built.

import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import type { Model } from './models';

/** A model for each lot this file builds, by the id of the lot in plan.ts. */
export const MODELS: Record<string, Model> = {};
/** Lots built as part of another lot's model or by `extras`, which get no box either. */
export const COVERS: string[] = [];
/** Every sign this file hangs. Each id begins with this file's name and a hyphen. */
export const SIGNS: SignDef[] = [];
/** Whatever this file builds that is not one of the plan's lots. */
export function extras(_k: Build): void {}

/**
 * The Sovereign's shuttle, which the three decoys look exactly like (GS 41):
 * its nose along +x, standing on y = 0, its middle over (0, 0), for the show
 * to build four of and fly (story 6). The builder of this file builds it; the
 * stub has none.
 */
export function shuttleGeometry(): import('three').BufferGeometry | null {
  return null;
}

/** Where the four shuttles stand on the landing pads, and which way each faces (radians: 0 east). The builder sets these from the pads it builds. */
export const SHUTTLE_PADS: { x: number; z: number; heading: number }[] = [
  { x: -25.5, z: 6.5, heading: 0 },
  { x: -16.5, z: 6.5, heading: 0 },
  { x: -25.5, z: 14, heading: 0 },
  { x: -16.5, z: 14, heading: 0 },
];
