// The regions of the tile, each a file of its own, and what they add up to.

import * as dragonstone from './dragonstone';
import * as holds from './holds';
import * as kingsLanding from './kings-landing';
import type { Region } from './models';
import * as neck from './neck';
import { WATER_LEVEL, isWater } from './plan';
import * as reach from './reach';
import * as riverlands from './riverlands';
import * as stormlands from './stormlands';
import * as vale from './vale';
import * as wall from './wall';
import * as west from './west';
import * as winterfell from './winterfell';

export const REGIONS: Record<string, Region> = {
  wall, holds, winterfell, neck, vale, riverlands, 'kings-landing': kingsLanding, stormlands, reach, west, dragonstone,
};

/** How high the ground is at a place: the water's level where there is open water, and otherwise the highest hill any region has there. */
export function groundAt(x: number, z: number): number {
  let y = 0;
  for (const r of Object.values(REGIONS)) y = Math.max(y, r.heightAt(x, z));
  return y > 0.05 ? y : isWater(x, z) ? WATER_LEVEL : 0;
}
