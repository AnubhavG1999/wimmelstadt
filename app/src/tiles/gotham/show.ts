// What moves on Gotham besides the traffic: its air, the cast at their
// haunts, the machines, the animals, and the stories a director plays.
//
// Written by the tile's main session. The figures, the machines, the animals
// and the air are builders' files; this file sets them going and directs
// them. Each is set going on its own, so that one that fails does not take the
// others with it.
//
// The stories are laid once the buildings stand, since a stage is what is
// built on it. Until then this file only sets the parts going.

import type { Build } from '../../engine/tile';
import { buildAir, type Air } from './air';
import { buildBeasts, type Beasts } from './beasts';
import { buildCast, type Cast } from './figures';
import { buildMachines, type Machines } from './machines';
import { buildBoats } from './traffic';

export interface Show { air: Air | null; cast: Cast | null; machines: Machines | null; beasts: Beasts | null }

/** Sets one part going, and says in the console if it fails. */
function tried<T>(what: string, fn: () => T): T | null {
  try {
    return fn();
  } catch (e) {
    console.error(`Gotham: ${what} failed.`, e);
    return null;
  }
}

export function buildShow(k: Build): Show {
  const air = tried('the air', () => buildAir(k));
  const cast = tried('the cast', () => buildCast(k));
  const machines = tried('the machines', () => buildMachines(k));
  const beasts = tried('the animals', () => buildBeasts(k));
  const boats = tried('the boats', () => buildBoats(k));

  k.each((dt) => {
    if (dt <= 0) return;
    cast?.commit();
    beasts?.commit();
  });

  const show: Show = { air, cast, machines, beasts };
  if (import.meta.env.DEV) (window as unknown as { gothamShow: object }).gothamShow = { ...show, boats };
  return show;
}
