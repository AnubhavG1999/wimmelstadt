// The planet's south flank, outside the walls: the Augustan camp, the mine with its clawDrill, the snowy peaks in the south-east, and the planet's forests and fields.
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
