// The Neck with Moat Cailin and the crannogs, and the Twins with their bridge.
//
// A stub: nothing is built here yet, so every lot of this region is still a box.

import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import type { Model } from './models';

export const MODELS: Record<string, Model> = {};
export const COVERS: string[] = [];
export const SIGNS: SignDef[] = [];
export const FLOORED: string[] = [];

export function heightAt(_x: number, _z: number): number {
  return 0;
}

export function extras(_k: Build): void {}
