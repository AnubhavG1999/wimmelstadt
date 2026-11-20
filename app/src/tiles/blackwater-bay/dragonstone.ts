// Dragonstone's castle (the Stone Drum, the Windwyrm, the Sea Dragon Tower, the Great Hall, the kitchens, Aegon's Garden and the Dragon's Tail arch), its town, its harbour, and the old inn on the stone pier.
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
