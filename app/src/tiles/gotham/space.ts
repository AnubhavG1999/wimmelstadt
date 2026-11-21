// Where there is room: the ground that no lot, road, water, stage, place for a
// hero or name board has taken. Whoever plants a tree, stands a person, a
// crate or a parked car where no lot of theirs is asks here first.
//
// The way of asking is the Westeros tile's, Blackwater Bay's and the Iron
// Rain's.

import { inWater, landAt } from './land';
import { BOARDS } from './look';
import { HERO_SPOTS, LOTS, SHOW_LANES, STAGES, TRIGATE, TURNS, type P2 } from './plan';
import { EL_ENDS, LANES } from './roads';

const d2 = (px: number, pz: number, ax: number, az: number, bx: number, bz: number): number => {
  const vx = bx - ax, vz = bz - az, l = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / l));
  return Math.hypot(px - ax - vx * t, pz - az - vz * t);
};

/** Every ring a road turns in, the Trigate's and the one before Arkham's gate among them. */
const RINGS: { c: P2; r: number }[] = [...Object.values(TURNS), { c: TRIGATE.c, r: TRIGATE.r }, TRIGATE.arkham];

/**
 * How far a place is from the middle of the nearest lane, whatever its
 * height. A ring to turn in counts as road right across, its island too: what
 * stands on an island is its builder's own. The show's lanes count as lanes.
 */
export function toRoad(x: number, z: number): number {
  let d = Infinity;
  for (const line of Object.values(LANES)) for (let i = 0; i < line.length; i++) { const a = line[i], b = line[(i + 1) % line.length]; d = Math.min(d, d2(x, z, a[0], a[2], b[0], b[2])); }
  for (const t of RINGS) d = Math.min(d, Math.max(0, Math.hypot(x - t.c[0], z - t.c[1]) - t.r));
  for (const s of Object.values(SHOW_LANES)) d = Math.min(d, d2(x, z, s.x0, s.z, s.x1, s.z));
  return d;
}

/** Half the width of a lane with its kerb and its sidewalk: a place nearer than this to a lane's middle is on the road. */
export const ROAD_HALF = 5.6;

/** Whether a place is on one of the stories' stages, or within `room` of one. */
export function onStage(x: number, z: number, room = 0): string | null {
  for (const [id, s] of Object.entries(STAGES)) if (x > s.x0 - room && x < s.x1 + room && z > s.z0 - room && z < s.z1 + room) return id;
  return null;
}

/** The direction the view the tile opens with looks back from, on the ground. */
const VX = 0.669, VZ = 0.743;

/**
 * Whether a place is open ground with `room` to spare round it: on the board,
 * and at least `room` clear of every lot, lane, ring, water, stage, place for a
 * hero and name board. A place for a hero is seen from the south-east, so
 * nothing stands in a strip before it. `own` names lots that are the asker's
 * own to stand things in: a park, a yard, a forecourt.
 */
export function open(x: number, z: number, room = 2, own: string[] = []): boolean {
  if (Math.abs(x) > 104 - room || Math.abs(z) > 113 - room) return false;
  if (inWater(x, z, room)) return false;
  for (const l of LOTS) if (!own.includes(l.id) && x > l.x0 - room && x < l.x1 + room && z > l.z0 - room && z < l.z1 + room) return false;
  if (toRoad(x, z) < ROAD_HALF + room) return false;
  // the elevated railway's columns stand under its line
  if (d2(x, z, EL_ENDS[0][0], EL_ENDS[0][1], EL_ENDS[1][0], EL_ENDS[1][1]) < 2.4 + room) return false;
  if (onStage(x, z, room)) return false;
  for (const s of HERO_SPOTS) {
    const ex = x - s.x, ez = z - s.z, along = ex * VX + ez * VZ, across = Math.abs(-ex * VZ + ez * VX);
    if (Math.hypot(ex, ez) < 6 + room || (along > 0 && along < 14 && across < 6)) return false;
  }
  for (const b of BOARDS) {
    const ex = x - b.x, ez = z - b.z, along = ex * VX + ez * VZ, across = Math.abs(-ex * VZ + ez * VX);
    if (Math.abs(along) < 0.6 + room && across < b.w / 2 + 0.4 + room) return false;
  }
  return true;
}

/**
 * How tall a thing at a place may be without hiding a name board. A board is
 * read from the south-east, and its lettering begins 2.3 above the ground: a
 * thing before it may be the taller the farther before it it stands. Infinity
 * where no board stands behind the place.
 */
export function underBoards(x: number, z: number, room = 1): number {
  let h = Infinity;
  for (const b of BOARDS) {
    const ex = x - b.x, ez = z - b.z, along = ex * VX + ez * VZ, across = Math.abs(-ex * VZ + ez * VX);
    if (along > 0 && along < 12 && across < b.w / 2 + room) h = Math.min(h, 1.9 + 0.78 * along);
  }
  return h;
}

/**
 * How tall anything at a place may stand, ground and all, without being seen
 * over the gap to whichever tile stands behind this one or west of it on the
 * board. It binds along the north and the west edges: Wayne Manor, Arkham.
 * Old Gotham's towers break it on purpose, as every tile's towers do.
 */
export const ceilingAt = (x: number, z: number): number => Math.min((z + 121.4) / 0.95, (x + 112.4) / 0.86);

/** How high the ground is at a place, as built. */
export const groundHere = (x: number, z: number): number => landAt(x, z);

export type { P2 };
