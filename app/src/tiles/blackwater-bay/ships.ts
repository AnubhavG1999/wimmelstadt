// What lies on the water: the Velaryon fleet at anchor across the Gullet, galleys and cogs at King's Landing's quays and off Hull and Spicetown, fishing boats in the bay, the ferry over the Rush, and ships under sail coming and going.
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
