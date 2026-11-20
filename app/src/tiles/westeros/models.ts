// How the tile is put together from its regions. Each region is one file: it
// builds the lots of the plan that lie in it, and whatever stands between
// them. This file is the shape every region has.

import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import type { Lot } from './plan';

/** What builds one lot of the plan, in place of its plain box. */
export type Model = (k: Build, l: Lot) => void;

/** What one region's file hands over. */
export interface Region {
  /** A model for each lot it builds, by the lot's id. A lot that nobody builds stays a box with its name on a board. */
  MODELS: Record<string, Model>;
  /** Lots that are built as part of another lot's model or by `extras`, and so get no box either. */
  COVERS: string[];
  /** Every sign the file hangs. */
  SIGNS: SignDef[];
  /** Whatever is not one of the plan's lots: hills, bridges, small scenes. */
  extras(k: Build): void;
  /** How high its ground is at a place: for what stands on its hills, and for the shadows of the dragons. 0 where it has no hill. */
  heightAt(x: number, z: number): number;
  /** The pieces of ground that it floors itself: `neck`, and the wet lots of the plan. */
  FLOORED: string[];
}
