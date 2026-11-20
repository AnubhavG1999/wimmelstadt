// The centre and the lowColor quarter: the blocks east of the river, the shield park with its four pylons, the low dense blocks of the lowColors, the market, and the noise bubbles over a few blocks.
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
 * The tops of the shield park's four pylons, as meshes of their own that the
 * show makes flare when Mustang's charges blow (story 5): `flare(i, f)` with
 * `i` the pylon (0 north-west, 1 north-east, 2 south-west, 3 south-east) and
 * `f` from 0 still to 1 at its brightest. The builder of this file builds
 * them; the stub has none.
 */
export function buildPylonTops(_k: Build): { flare(i: number, f: number): void } | null {
  return null;
}
