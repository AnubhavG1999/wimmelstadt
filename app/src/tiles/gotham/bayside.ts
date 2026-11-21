// The bay shore: the arches of Grand Avenue's ramp, the Underground Highway's mouth, the Clock Tower, the Gotham Gazette, the boat yard and the fish market.
//
// A stub: its builder has not written it yet, and its lots stand as plain
// boxes. The four exports below are what the tile calls, and they stay.

import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import type { Model, Place } from './models';

/** A model for each lot this file builds, by the lot's id. */
export const MODELS: Record<string, Model> = {};

/** Lots that are built as part of another lot's model or by `extras`, and so get no box either. */
export const COVERS: string[] = [];

/** Every sign this file hangs. Each id begins with `bayside-`. */
export const SIGNS: SignDef[] = [];

/** Places on what this file builds that the show needs as built: its task names them. */
export const PLACES: Record<string, Place> = {};

/** Whatever is not one of the plan's lots. */
export function extras(_k: Build): void {
  // nothing yet
}
