// What moves over and on the Iron Rain besides the traffic: the fleet in the
// sky, the Rain falling from it, and the cast acting out their stories.
//
// Written by the tile's main session. The fleet, the Rain, the figures and
// the column's vehicles are each a builder's file; this file sets them going
// and directs them. Each is set going on its own, so that one that fails does
// not take the others with it.

import type { Build } from '../../engine/tile';
import { buildCast, type Cast } from './figures';
import { buildFleet, type Fleet } from './fleet';
import { landAt } from './land';
import { LANDINGS } from './plan';
import { buildRain, type Rain } from './rain';
import { buildSpiders } from './traffic';

export interface Sky { fleet: Fleet | null; rain: Rain | null; cast: Cast | null }

/** Sets one part going, and says in the console if it fails. */
function tried<T>(what: string, fn: () => T): T | null {
  try {
    return fn();
  } catch (e) {
    console.error(`The Iron Rain: ${what} failed.`, e);
    return null;
  }
}

export function buildShow(k: Build): Sky {
  const fleet = tried('the fleet', () => buildFleet(k));
  const rain = tried('the Rain', () => buildRain(k, landAt));
  const cast = tried('the cast', () => buildCast(k));
  tried('the spider tanks', () => buildSpiders(k));
  if (fleet && rain) {
    // until the director is written: a wave from the Pax every forty seconds onto the zones outside the city
    let next = 2;
    k.each((dt) => {
      next -= dt;
      if (next > 0) return;
      const zones = [LANDINGS.west, LANDINGS.east, LANDINGS.plateau, LANDINGS.flank, LANDINGS.peaks];
      next = Math.max(40, rain.wave(() => fleet.tubes('pax'), zones, 24));
    });
  }
  if (cast) k.each(() => cast.commit());
  return { fleet, rain, cast };
}
