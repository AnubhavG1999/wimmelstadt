// The engineering campus, north of Green Street: Engineering Hall, Grainger Library, the Siebel Center, the car teams' workshop, Everitt and Talbot laboratories, and Boneyard Creek.
//
// Not built yet: each of these lots is a plain box with its name on a board
// until its model is entered in MODELS below.

import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import type { Model } from './plan';

/** The models, by the id of their lot in plan.ts. */
export const MODELS: Record<string, Model> = {};

/** Every sign this file hangs. Each id begins with `engineering-`. */
export const SIGNS: SignDef[] = [];

/** Whatever this file builds that is not a lot. */
export function extras(k: Build): void {
  void k;
}
