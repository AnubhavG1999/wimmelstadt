// The Dragonmont's lairs: a mouth of rock at the back of each shelf, Grey Ghost's vent, the smoke and the crater; the camp of the Sowing; and the sheep penned below Sheepstealer's cave.
//
// A stub: its builder fills it in. See models.ts for the shape every region has.

import type { SignDef } from '../../engine/signs';
import { drawField } from '../../engine/terrain';
import type { Build } from '../../engine/tile';
import { ASH, MOUNT, ROCK } from './land';
import type { Model } from './models';
import { DRAGONMONT } from './plan';

export const MODELS: Record<string, Model> = {};
export const COVERS: string[] = [];
export const SIGNS: SignDef[] = [];

export function extras(k: Build): void {
  // the mountain itself, as land.ts worked it out from the plan: dark rock where it is steep, ash where it is level, and black at the crater
  if (MOUNT) drawField(k.b, MOUNT, { color: (y, level) => (y > DRAGONMONT.top - 3 ? 0x3a3532 : level > 0.8 ? ASH : ROCK), cut: ROCK, edges: '' });
}

export function heightAt(_x: number, _z: number): number {
  return 0;
}
