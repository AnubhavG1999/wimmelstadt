// Which file builds what. Every file of models hands over the same three
// things (see `ModelFile` in plan.ts), and this file gathers them: the models
// by the id of their lot, the signs, and whatever is built besides the lots.
//
// A lot that no file has a model for is a plain box with its name on a board:
// city.ts sees to that.

import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import * as campustown from './campustown';
import * as east from './east';
import * as engineering from './engineering';
import * as greenNorth from './green-north';
import * as gregoryPlace from './gregory-place';
import * as houses from './houses';
import * as moving from './moving';
import { BOX_SIGNS, type Model, type ModelFile } from './plan';
import * as planting from './planting';
import * as quadEast from './quad-east';
import * as quadWest from './quad-west';
import * as scenes from './scenes';
import * as sixPack from './six-pack';
import * as sixth from './sixth';
import * as southCampus from './south-campus';
import * as stadium from './stadium';
import * as union from './union';

const FILES: Record<string, ModelFile> = {
  union,
  'quad-west': quadWest,
  'quad-east': quadEast,
  engineering,
  'green-north': greenNorth,
  campustown,
  houses,
  sixth,
  'south-campus': southCampus,
  stadium,
  east,
  'gregory-place': gregoryPlace,
  'six-pack': sixPack,
  scenes,
  moving,
  // (last, because it plants round everything else)
  planting,
};

export const MODELS: Record<string, Model> = {};
for (const [file, f] of Object.entries(FILES)) {
  for (const [id, model] of Object.entries(f.MODELS)) {
    if (MODELS[id]) console.warn(`Urbana-Champaign: two files have a model of ${id}; the one in ${file}.ts is used.`);
    MODELS[id] = model;
  }
}

/** The tile's sheet of signs: every model's own, and a name board for each lot that is still a box. */
export const SIGNS: SignDef[] = [
  ...BOX_SIGNS.filter((s) => !(s.id.replace(/^box-/, '') in MODELS)),
  ...Object.values(FILES).flatMap((f) => f.SIGNS),
];

/** Builds what the files build besides their lots. One that fails says so, and the rest are still built. */
export function extras(k: Build): void {
  for (const [file, f] of Object.entries(FILES)) {
    try {
      f.extras(k);
    } catch (e) {
      console.warn(`Urbana-Champaign: the extras of ${file}.ts failed: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
    }
  }
}
