// Builds everything that stands still on Westeros, and sets the dragons flying.
// The shapes come from plan.ts.

import type { WinSpec } from '../../engine/geo';
import { area, flat, oval, water } from '../../engine/ground';
import type { Build, TileParts } from '../../engine/tile';
import { buildDragons } from './dragons';
import { DORNE, GODS_EYE, LAND_NECK, LAND_NORTH, LAND_SOUTH, LOTS, SEA_NORTH_EAST, SEA_SOUTH_EAST, SEA_WEST, WALL, type Lot } from './plan';

/** What the street material is told about a stretch of plain ground. */
const GROUND: WinSpec = { cell: 0, storey: 1, lit: 0, kind: 1 };

const SNOW = 0xe6ecf0, BOG = 0x76835c, GRASS = 0x8ab56a, SAND = 0xe2cf9a;
const SEA_COLD = 0x55809a, SEA_WARM = 0x4f9cc0, SEA_SUNSET = 0x4a88aa;
const SHORE_COLD = 0xc3ccd1, SHORE = 0xb9ad90;
const ICE = 0xcfe4ee, ICE_SHADE = 0xb4d0de, STONE = 0xb8b2a6, ROCK = 0x9a948a;

/** A lot that is still only a box, with its name on a board that faces the view the tile opens with. */
function box(k: Build, l: Lot): void {
  const rock = l.id.startsWith('frostfangs') || l.id.startsWith('vale') || l.id.startsWith('casterly') || l.id === 'dragonmont';
  k.b.box(l.x0, 0, l.z0, l.x1, l.top, l.z1, rock ? ROCK : STONE, { seed: l.x0 * 0.13 + l.z0 * 0.07 });
  if (l.part || !l.name) return;
  // the camera stands in the south-south-east: 0.67 east and 0.74 south
  k.sign(`box-${l.id}`, (l.x0 + l.x1) / 2, l.top + 2.4, (l.z0 + l.z1) / 2, 0.669, 0.743, 2.6, 22);
}

/** The Wall as a block of ice that leans back: a face to the south, a walk on top, a face to the north. */
function wallBlock(k: Build): void {
  const b = k.b, W = WALL;
  b.quad([W.x0, 0, W.south], [W.x1, 0, W.south], [W.x1, W.top, W.topSouth], [W.x0, W.top, W.topSouth], [0, 0.07, 1], ICE);
  b.quad([W.x1, 0, W.north], [W.x0, 0, W.north], [W.x0, W.top, W.topNorth], [W.x1, W.top, W.topNorth], [0, 0.05, -1], ICE_SHADE);
  b.quad([W.x0, W.top, W.topSouth], [W.x1, W.top, W.topSouth], [W.x1, W.top, W.topNorth], [W.x0, W.top, W.topNorth], [0, 1, 0], 0xe8f1f5);
  // its east end, where it stops at Eastwatch
  b.quad([W.x1, 0, W.south], [W.x1, 0, W.north], [W.x1, W.top, W.topNorth], [W.x1, W.top, W.topSouth], [1, 0, 0], ICE_SHADE);
}

export function buildWesteros(k: Build): TileParts {
  // -------------------------------------------------------------------------
  // The ground: snow north of the Neck, bog in it, green south of it, sand in Dorne
  // -------------------------------------------------------------------------

  const godsEye = oval(GODS_EYE.x, GODS_EYE.z, GODS_EYE.rx, GODS_EYE.rz, 22);
  flat(k.street, LAND_NORTH, 0, SNOW, { win: GROUND });
  flat(k.street, LAND_NECK, 0, BOG, { win: GROUND });
  flat(k.street, LAND_SOUTH, 0, GRASS, { win: GROUND, holes: [godsEye] });
  area(k, DORNE, SAND);

  water(k, SEA_WEST, { color: SEA_SUNSET, quay: SHORE });
  water(k, SEA_NORTH_EAST, { color: SEA_COLD, quay: SHORE_COLD });
  water(k, SEA_SOUTH_EAST, { color: SEA_WARM, quay: SHORE });
  water(k, godsEye, { color: 0x5f9fb4, quay: SHORE });

  // -------------------------------------------------------------------------
  // The blockout: every lot as a plain box, until its model is built
  // -------------------------------------------------------------------------

  wallBlock(k);
  for (const l of LOTS) if (l.id !== 'wall') box(k, l);

  // -------------------------------------------------------------------------
  // The dragons
  // -------------------------------------------------------------------------

  buildDragons(k);

  return { routes: [], parked: [], heroSpots: [] };
}
