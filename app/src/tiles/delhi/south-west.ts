// The south-west: Delhi Public School R. K. Puram, R. K. Puram's flats and its colony park, Hauz Khas with Deer Park, and the dhaba on Aurobindo Marg.
//
// Not built yet: this file is the place for it.

import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import type { Thing } from './plan';

export type Model = (k: Build, t: Thing) => void;

/** What this file builds, by the id of the thing in the plan. */
export const MODELS: Record<string, Model> = {};

/** The signs this file hangs. */
export const SIGNS: SignDef[] = [];

/** Lines that something moves along, as [x, y, z] points, for the check that nothing crosses a road on the level. */
export const RAILS: Record<string, [number, number, number][]> = {};

/** Whatever this file builds that is not one of the plan's things. */
export function extras(_k: Build): void {}
