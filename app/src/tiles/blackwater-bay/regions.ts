// The regions of the tile, each a file of its own, and what they add up to.

import * as dragonmont from './dragonmont';
import * as dragonpit from './dragonpit';
import * as dragonstone from './dragonstone';
import * as driftmark from './driftmark';
import * as highTide from './high-tide';
import * as houses from './houses';
import type { Region } from './models';
import * as northShore from './north-shore';
import { groundAt } from './plan';
import * as redKeep from './red-keep';
import * as ships from './ships';
import * as southShore from './south-shore';
import * as walls from './walls';

export const REGIONS: Record<string, Region> = {
  dragonpit, 'red-keep': redKeep, walls, houses, 'north-shore': northShore, dragonstone, dragonmont, driftmark, 'high-tide': highTide, 'south-shore': southShore, ships,
};

/** How high the ground is at a place as it is built: the plan's ground, and any region's own hills and rocks over it. */
export function groundBuilt(x: number, z: number): number {
  let y = groundAt(x, z);
  for (const r of Object.values(REGIONS)) y = Math.max(y, r.heightAt(x, z));
  return y;
}
