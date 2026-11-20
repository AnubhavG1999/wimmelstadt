// The Red Keep on Aegon's High Hill, new in 129 AC, with Maegor's Holdfast; and Aegon's strand below it, with three ships of the Conquest drawn up.
//
// A stub: its builder fills it in. See models.ts for the shape every region has.

import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import type { Model } from './models';

export const MODELS: Record<string, Model> = {};
export const COVERS: string[] = [];
export const SIGNS: SignDef[] = [];

export function extras(_k: Build): void {}

export function heightAt(_x: number, _z: number): number {
  return 0;
}
