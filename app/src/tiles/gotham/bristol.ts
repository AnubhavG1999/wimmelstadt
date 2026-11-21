// Bristol: Wayne Manor on Crest Hill, the Batcave cut open under it, the waterfall's cove, the gates and the drive, the old tunnel's mouth, and the Kane Memorial Bridge.
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

/** Every sign this file hangs. Each id begins with `bristol-`. */
export const SIGNS: SignDef[] = [];

/** Places on what this file builds that the show needs as built: its task names them. */
export const PLACES: Record<string, Place> = {};

/** Whatever is not one of the plan's lots. */
export function extras(_k: Build): void {
  // nothing yet
}
