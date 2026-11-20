// South of the Quad: the Main Library, the South Quad with its bell tower, the Stock Pavilion, the ACES Library, the halls round them, and the greenhouses.
//
// Not built yet: each of these lots is a plain box with its name on a board
// until its model is entered in MODELS below.

import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import type { Model } from './plan';

/** The models, by the id of their lot in plan.ts. */
export const MODELS: Record<string, Model> = {};

/** Every sign this file hangs. Each id begins with `south-campus-`. */
export const SIGNS: SignDef[] = [];

/** Whatever this file builds that is not a lot. */
export function extras(k: Build): void {
  void k;
}
