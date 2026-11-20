// The south shore: the kingswood, the meadow and the sheepfold by the Wendwater with its flock, the ford, the ferry's landing, Stonedance and Sharp Point on Massey's Hook.
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
