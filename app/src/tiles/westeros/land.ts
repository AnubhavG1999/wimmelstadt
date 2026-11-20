// The ground of Westeros and its water: snow north of the Neck, bog in it,
// green south of it, sand in Dorne, three seas, the Gods Eye and the rivers.
//
// The shapes are in plan.ts. What stands on the ground is built elsewhere.

import { flat as line3, pathOf, rounded } from '../../engine/corners';
import type { WinSpec } from '../../engine/geo';
import { area, band, flat, onBoard, oval, walls, water } from '../../engine/ground';
import type { Build } from '../../engine/tile';
import { DORNE, GODS_EYE, ISLANDS, LAND_NECK, LAND_NORTH, LAND_SOUTH, RIVERS, SEA_NORTH_EAST, SEA_SOUTH_EAST, SEA_WEST, WET, type P2 } from './plan';

/** What the street material is told about a stretch of plain ground. */
const GROUND: WinSpec = { cell: 0, storey: 1, lit: 0, kind: 1 };

export const SNOW = 0xe6ecf0, BOG = 0x76835c, GRASS = 0x8ab56a, SAND = 0xe2cf9a;
export const SEA_COLD = 0x55809a, SEA_WARM = 0x4f9cc0, SEA_SUNSET = 0x4a88aa, FRESH = 0x5f9fb4;
export const SHORE_COLD = 0xc3ccd1, SHORE = 0xb9ad90, BANK = 0x8f8262;

/** A river as a shape: narrow at its spring and wider at its mouth. */
function riverShape(r: { line: P2[]; half: number[] }): P2[] {
  const path = pathOf(line3(rounded(r.line, 7)));
  return band(path, (s) => r.half[0] + (r.half[1] - r.half[0]) * (s / path.length), 2.5);
}

/**
 * Lays the ground and the water. `floored` names the pieces of ground that
 * somebody else floors: the Neck, and the wet lots of the plan. Until their
 * builders do, they are laid here as plain bog and plain water.
 */
export function buildLand(k: Build, floored: Set<string>): void {
  const godsEye = oval(GODS_EYE.x, GODS_EYE.z, GODS_EYE.rx, GODS_EYE.rz, 26);
  const rivers = Object.values(RIVERS).map(riverShape);

  flat(k.street, LAND_NORTH, 0, SNOW, { win: GROUND, holes: [WET.winterfell, WET.queenscrown] });
  if (!floored.has('neck')) flat(k.street, LAND_NECK, 0, BOG, { win: GROUND });
  flat(k.street, LAND_SOUTH, 0, GRASS, { win: GROUND, holes: [godsEye, WET.riverrun, ...rivers] });
  area(k, DORNE, SAND);

  water(k, SEA_WEST, { color: SEA_SUNSET, quay: SHORE });
  water(k, SEA_NORTH_EAST, { color: SEA_COLD, quay: SHORE_COLD });
  water(k, SEA_SOUTH_EAST, { color: SEA_WARM, quay: SHORE });
  water(k, godsEye, { color: FRESH, quay: SHORE });
  for (const r of rivers) water(k, r, { color: FRESH, quay: BANK, drop: 0.7 });
  for (const [id, shape] of Object.entries(WET)) if (!floored.has(id)) water(k, shape, { color: id === 'riverrun' ? FRESH : SEA_COLD, quay: SHORE_COLD });

  // the islands: level ground in the sea, with a shore round each
  for (const [id, i] of Object.entries(ISLANDS)) {
    const shape = onBoard(oval(i.x, i.z, i.rx, i.rz, 22));
    const cold = id === 'bear';
    flat(k.street, shape, 0.01, cold ? SNOW : id === 'battle' ? 0xa9a59a : 0x9d9684, { win: GROUND });
    walls(k.b, shape, -1.5, 0.01, cold ? SHORE_COLD : SHORE);
  }
}
