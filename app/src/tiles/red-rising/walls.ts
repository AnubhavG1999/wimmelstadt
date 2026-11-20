// Agea's walls: the north wall with the North Gate, the postern and the river's grates, the mud banks and the forest belt inside it; the south wall on the trench's low south rim, and the South Gate.
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
 * The postern's two doors, as meshes of their own that the show swings open
 * when Ragnar sets his shoulder to them (story 3): `open(0)` shut, `open(1)`
 * wide. The builder of this file builds them; the stub has none.
 */
export function buildPosternDoors(_k: Build): { open(f: number): void } | null {
  return null;
}
