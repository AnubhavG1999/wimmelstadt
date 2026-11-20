// Agea's commercial district: kilometre-high blades of steel and glass on a podium, a garden of jewelled blades by night, with Tryst and Temptation, the clubs on their roofs, and the screen.
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
