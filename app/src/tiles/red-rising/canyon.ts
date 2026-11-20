// The canyon and the plateau: the Valles Marineris's north wall, dressed with hangars, barracks and the drone depot; the fall; the furniture of the loop road and its ramps; the guns on the rim; the Institute's gate and its marble square; and Olympus, floating over the canyon's east end.
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

/** The mouth of the drone depot in the canyon's wall, from which the fleet's file sends its drones up. The builder sets it from the depot it builds. */
export const DEPOT_MOUTH: [number, number, number] = [-4, 30, -69];
/** The muzzles of the guns on the rim, from which the Rain's file fires its tracers at the falling shells. The builder sets them from the guns it builds. */
export const GUN_MUZZLES: [number, number, number][] = [[-17, 42, -94], [29, 42, -94]];
