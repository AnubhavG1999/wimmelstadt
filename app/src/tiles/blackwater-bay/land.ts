// The ground of Blackwater Bay and its water: the mainland north of the Rush
// and south of it, the bay and the seas, the islands laid over the water, the
// sands that the tide covers, the Wendwater, King's Landing's three hills and
// the Dragonmont.
//
// The shapes are in plan.ts. What stands on the ground is built elsewhere.

import { flat as line3, pathOf, rounded } from '../../engine/corners';
import type { WinSpec } from '../../engine/geo';
import { band, flat, walls, water } from '../../engine/ground';
import { drawField, field, heightOn, type Field } from '../../engine/terrain';
import type { Build } from '../../engine/tile';
import { CLIMB } from './roads';
import { AEGON, DRAGONMONT, ISLANDS, LAND_NORTH, LAND_SOUTH, RHAENYS, SANDS, VISENYA, WATER, WENDWATER, groundAt, lairAt, mountBuilt, type P2 } from './plan';

/** What the street material is told about a stretch of plain ground. */
const GROUND: WinSpec = { cell: 0, storey: 1, lit: 0, kind: 1 };

export const GRASS = 0x86b066, WOOD = 0x6f9a55, PAVING = 0xc4b9a4, SAND = 0xdcc893, ROCK = 0x5d5853, ASH = 0x77716a;
export const BAY = 0x4f8fae, SEA = 0x4a86a8, RIVER = 0x5b8f8a, SHORE = 0xb3a68a, BANK = 0x8b7f63;
export const STONE = 0xb9b0a0, STONE_DARK = 0x8f8576;

/** The Wendwater as a shape: narrow where it rises and wider at its mouth. */
export function wendwater(): P2[] {
  const path = pathOf(line3(rounded(WENDWATER.line, 6)));
  return band(path, (s) => WENDWATER.half[0] + (WENDWATER.half[1] - WENDWATER.half[0]) * (s / path.length), 2.5);
}

/** King's Landing inside its walls, which is paved, and the rest of the land north of the Rush, which is green. */
export const CITY: P2[] = [[-99.5, -104.5], [-14, -104.5], [-14, 70.4], [-16.6, 73.8], [-99.5, 73.8]];

/** The Dragonmont's ground, once its builder has carved it: a field over the island's north. */
export let MOUNT: Field | null = null;

/**
 * How high the ground is at a place, as built: on the Dragonmont, the very
 * facet that is drawn there, so that what stands on it neither floats nor
 * sinks; in a lair, its shelf's and its cave's floor; and elsewhere the
 * terrace, the hills and the water, as the plan's `groundAt` has them.
 */
export function landAt(x: number, z: number): number {
  if (lairAt(x, z)) return groundAt(x, z);
  if (MOUNT && x >= MOUNT.x0 && x <= MOUNT.x1 && z >= MOUNT.z0 && z <= MOUNT.z1) {
    const y = heightOn(MOUNT, x, z);
    if (y > 0.02) return y;
  }
  return groundAt(x, z);
}

export function buildLand(k: Build): void {
  const wend = wendwater();
  // the mainland: the city paved, the rest green, and the kingswood darker
  flat(k.street, LAND_NORTH, 0, GRASS, { win: GROUND, holes: [CITY] });
  flat(k.street, CITY, 0, PAVING, { win: GROUND });
  flat(k.street, LAND_SOUTH, 0, WOOD, { win: GROUND, holes: [wend] });

  water(k, WATER, { color: BAY, quay: SHORE });
  water(k, wend, { color: RIVER, quay: BANK, drop: 0.6 });

  // the islands: level ground over the water, with a shore round each
  for (const [id, shape] of Object.entries(ISLANDS)) {
    flat(k.street, shape, 0.01, id === 'dragonstone' ? ASH : id === 'claw-isle' ? ROCK : GRASS, { win: GROUND });
    walls(k.b, shape, -1.5, 0.01, SHORE);
  }
  // the sands, under the water at high tide
  flat(k.street, SANDS, -0.35, SAND, { win: GROUND });
  walls(k.b, SANDS, -1.5, -0.35, SAND);

  // King's Landing's hills: the Dragonpit's terrace, walled round, and the two others as slopes
  flat(k.b, RHAENYS.terrace, RHAENYS.y, PAVING);
  terraceWalls(k);
  for (const h of [VISENYA, AEGON]) {
    const f = field(h.c[0] - h.foot, h.c[1] - h.foot, h.c[0] + h.foot, h.c[1] + h.foot, 2, (x, z) => {
      const d = Math.hypot(x - h.c[0], z - h.c[1]);
      if (d <= h.crown) return h.y;
      if (d >= h.foot) return 0;
      const t = (h.foot - d) / (h.foot - h.crown);
      return h.y * t * t * (3 - 2 * t);
    });
    drawField(k.b, f, { color: (y, level) => (level > 0.93 ? (y > h.y - 0.1 ? PAVING : 0xb8ae96) : STONE_DARK), cut: STONE_DARK, edges: '' });
  }

  // the Dragonmont as built: its natural shape, a level shelf before each lair, the rock over each cave, and the road at its foot cut in
  const M = DRAGONMONT;
  MOUNT = field(M.summit[0] - M.reach.w, M.summit[1] - M.reach.n, M.summit[0] + M.reach.e, M.summit[1] + M.reach.s, 1.2, (x, z) => {
    const y = mountBuilt(x, z);
    return y > 0 ? y + 0.01 : 0;
  });
  drawField(k.b, MOUNT, { color: (y, level) => (y > M.top - 3 ? 0x3a3532 : level > 0.8 ? ASH : ROCK), cut: ROCK, edges: '' });
}

/**
 * The walls round the Dragonpit's terrace, from the ground up to its top,
 * with a gap in the south face where the climb comes up onto the forecourt.
 */
function terraceWalls(k: Build): void {
  const t = RHAENYS.terrace, n = t.length;
  let area = 0;
  for (let i = 0; i < n; i++) area += t[i][0] * t[(i + 1) % n][1] - t[(i + 1) % n][0] * t[i][1];
  const out = area > 0 ? -1 : 1, gap: [number, number] = [CLIMB.top[0] - 4.6, CLIMB.top[0] + 4.6];
  const wall = (p: P2, q: P2): void => {
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (len < 0.01) return;
    const nx = ((q[1] - p[1]) / len) * out, nz = (-(q[0] - p[0]) / len) * out;
    k.b.quad([p[0], 0, p[1]], [q[0], 0, q[1]], [q[0], RHAENYS.y, q[1]], [p[0], RHAENYS.y, p[1]], [nx, 0, nz], STONE, { L: len });
  };
  for (let i = 0; i < n; i++) {
    const p = t[i], q = t[(i + 1) % n];
    // the south face, where the climb meets it: in two pieces, either side of the road
    if (Math.abs(p[1] - RHAENYS.forecourt.z1) < 0.01 && Math.abs(q[1] - p[1]) < 0.01 && Math.min(p[0], q[0]) < gap[0] && Math.max(p[0], q[0]) > gap[1]) {
      // keep the way round, so that each piece faces out
      const [near, far] = p[0] < q[0] ? gap : [gap[1], gap[0]];
      wall(p, [near, p[1]]);
      wall([far, p[1]], q);
      continue;
    }
    wall(p, q);
  }
}
