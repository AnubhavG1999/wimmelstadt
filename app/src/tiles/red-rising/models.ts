// How the tile is put together from its files. Each region is one file: it
// builds the lots of the plan that lie in it, and whatever stands between
// them. This file is the shape every region has.

import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import type { Lot } from './plan';

/** What builds one lot of the plan, in place of its plain box and name board. */
export type Model = (k: Build, l: Lot) => void;

/** What one region's file hands over. */
export interface Region {
  /** A model for each lot it builds, by the lot's id. A lot that nobody builds stays a box with its name on a board. */
  MODELS: Record<string, Model>;
  /** Lots that are built as part of another lot's model or by `extras`, and so get no box either. */
  COVERS: string[];
  /** Every sign the file hangs. Each id begins with the file's name and a hyphen. */
  SIGNS: SignDef[];
  /** Whatever is not one of the plan's lots: a quay, a camp, a wood, small scenes. */
  extras(k: Build): void;
}
