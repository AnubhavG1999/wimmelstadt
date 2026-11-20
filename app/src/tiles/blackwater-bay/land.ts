// The ground of Blackwater Bay and its water: the mainland north of the Rush
// and south of it, the bay and the seas, the islands laid over the water, the
// sands that the tide covers, the Wendwater, King's Landing's three hills and
// the Dragonmont.
//
// The shapes are in plan.ts. What stands on the ground is built elsewhere.

import { flat as line3, pathOf, rounded } from '../../engine/corners';
import type { V3, WinSpec } from '../../engine/geo';
import { band, flat, walls, water } from '../../engine/ground';
import { drawField, field, heightOn, type Field } from '../../engine/terrain';
import type { Build } from '../../engine/tile';
import { VAULT_GAP } from './dragonpit';
import { CLIMB } from './roads';
import { AEGON, DRAGONMONT, DYKE, ISLANDS, LAND_NORTH, LAND_SOUTH, RHAENYS, SANDBAR, SANDS, SANDS_Y, VHAGAR_ROCK, VISENYA, WATER, WENDWATER, groundAt, lairAt, mountBuilt, type P2 } from './plan';

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
  // the sands, under the water at high tide, with the causeway's bank of stone across them and a bar of sand that stays dry
  flat(k.street, SANDS, SANDS_Y, SAND, { win: GROUND });
  walls(k.b, SANDS, -1.5, SANDS_Y, SAND);
  const dyke: P2[] = [[DYKE.x0, DYKE.z0], [DYKE.x1, DYKE.z0], [DYKE.x1, DYKE.z1], [DYKE.x0, DYKE.z1]];
  flat(k.b, dyke, DYKE.top, STONE);
  walls(k.b, dyke, -1.5, DYKE.top, STONE_DARK);
  sandbar(k);

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

  vhagarsRock(k);

  // the Dragonmont as built: its natural shape, a level shelf before each lair, and the road at its foot cut in.
  // Its heights are worked out here, for whatever stands on it; dragonmont.ts draws it.
  const M = DRAGONMONT;
  MOUNT = field(M.summit[0] - M.reach.w, M.summit[1] - M.reach.n, M.summit[0] + M.reach.e, M.summit[1] + M.reach.s, 1.2, (x, z) => {
    const y = mountBuilt(x, z);
    return y > 0 ? y + 0.01 : 0;
  });
}

/** Basalt: dark, nearly black, a little lighter where the rock is level. */
const BASALT = 0x3b3a3f, BASALT_TOP = 0x4c4a50;

/**
 * The low dark rock in the bay that Vhagar lies on: a level top 3 high over
 * most of it, its sides falling steeply to the water, and a dark shore of
 * rock round its foot down below the water.
 */
function vhagarsRock(k: Build): void {
  const V = VHAGAR_ROCK, rough = (x: number, z: number): number => 0.25 * Math.sin(x * 1.7 + z * 0.9) * Math.cos(z * 1.3 - x * 0.4);
  const f = field(V.x - V.hx, V.z - V.hz, V.x + V.hx, V.z + V.hz, 1, (x, z) => {
    const d = Math.hypot((x - V.x) / V.hx, (z - V.z) / V.hz);
    if (d >= 0.98) return 0;
    if (d <= 0.78) return V.top + (d > 0.6 ? rough(x, z) * (d - 0.6) * 3 : 0);
    const t = (0.98 - d) / 0.2;
    return Math.max(0.02, V.top * Math.sqrt(t) + rough(x, z));
  });
  drawField(k.b, f, { color: (_y, level) => (level > 0.9 ? BASALT_TOP : BASALT), cut: BASALT, edges: '' });
  // its foot, from below the water up to where the field begins
  const ring: P2[] = Array.from({ length: 28 }, (_, i): P2 => {
    const a = (i / 28) * Math.PI * 2;
    return [V.x + Math.cos(a) * V.hx * 0.98, V.z + Math.sin(a) * V.hz * 0.98];
  });
  walls(k.b, ring, -1.6, 0.03, BASALT);
}

/**
 * The walls round the Dragonpit's terrace, from the ground up to its top,
 * with gaps in the forecourt's south face where the climb comes up onto it
 * and where the hero's vault opens (dragonpit.ts builds the wall over that).
 */
function terraceWalls(k: Build): void {
  const t = RHAENYS.terrace, n = t.length;
  let area = 0;
  for (let i = 0; i < n; i++) area += t[i][0] * t[(i + 1) % n][1] - t[(i + 1) % n][0] * t[i][1];
  const out = area > 0 ? -1 : 1;
  const gaps: [number, number][] = ([[CLIMB.top[0] - 4.6, CLIMB.top[0] + 4.6], VAULT_GAP] as [number, number][]).sort((a, b) => a[0] - b[0]);
  const wall = (p: P2, q: P2): void => {
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (len < 0.01) return;
    const nx = ((q[1] - p[1]) / len) * out, nz = (-(q[0] - p[0]) / len) * out;
    k.b.quad([p[0], 0, p[1]], [q[0], 0, q[1]], [q[0], RHAENYS.y, q[1]], [p[0], RHAENYS.y, p[1]], [nx, 0, nz], STONE, { L: len });
  };
  for (let i = 0; i < n; i++) {
    const p = t[i], q = t[(i + 1) % n];
    // the forecourt's south face: in pieces, between its gaps, keeping the way round so that each piece faces out
    if (Math.abs(p[1] - RHAENYS.forecourt.z1) < 0.01 && Math.abs(q[1] - p[1]) < 0.01) {
      const east = p[0] < q[0], cuts = east ? gaps : [...gaps].reverse();
      let from = p[0];
      for (const [g0, g1] of cuts) {
        const [near, far]: [number, number] = east ? [g0, g1] : [g1, g0];
        if ((east && (near <= from || near >= q[0])) || (!east && (near >= from || near <= q[0]))) continue;
        wall([from, p[1]], [near, p[1]]);
        from = far;
      }
      wall([from, p[1]], q);
      continue;
    }
    wall(p, q);
  }
}

/** The sandbar east of the causeway: a level top, and a skirt that slopes down into the sands all round. */
function sandbar(k: Build): void {
  const b = SANDBAR, N = 24;
  const ring = (f: number, y: number): V3[] =>
    Array.from({ length: N }, (_, i): V3 => [b.x + Math.cos((i / N) * Math.PI * 2) * b.rx * f, y, b.z + Math.sin((i / N) * Math.PI * 2) * b.rz * f]);
  const top = ring(b.level, b.top), foot = ring(1, SANDS_Y - 0.01);
  for (let i = 0; i < N; i++) k.b.up([b.x, b.top, b.z], top[i], top[(i + 1) % N], SAND);
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    slope(k, top[i], foot[i], top[j], SAND);
    slope(k, top[j], foot[i], foot[j], SAND);
  }
}

/** A triangle of a slope, wound to face the sky and shaded by its own tilt. */
function slope(k: Build, p: V3, q: V3, r: V3, color: number): void {
  const ax = q[0] - p[0], ay = q[1] - p[1], az = q[2] - p[2], bx = r[0] - p[0], by = r[1] - p[1], bz = r[2] - p[2];
  const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, l = Math.hypot(nx, ny, nz) || 1;
  if (ny >= 0) k.b.tri(p, q, r, [nx / l, ny / l, nz / l], color);
  else k.b.tri(p, r, q, [-nx / l, -ny / l, -nz / l], color);
}
