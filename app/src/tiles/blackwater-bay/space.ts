// Where there is room: the ground that no lot, road, water, yard, dragon or
// place for a hero has taken. Whoever plants a tree, stands a person, a cart
// or a stall where no lot of theirs is asks here first.
//
// The way of asking is the Westeros tile's, in its space.ts.

import { BOARDS } from './look';
import { HERO_SPOTS, HOMES, ISLANDS, LAND_NORTH, LAND_SOUTH, LENGTH, LOTS, MEADOW, RHAENYS, ROADS, SANDS, SOWING, TURNS, WENDWATER, inside, isWater, type P2 } from './plan';

/** Ground that belongs to a place although no lot covers it: a square, a quay, a camp, a strand. Nothing else stands there. */
export const KEPT: { what: string; x0: number; z0: number; x1: number; z1: number }[] = [
  { what: "the square at the terrace's east foot", x0: -42, z0: -4, x1: -15.5, z1: 7 },
  { what: "the square at the terrace's west foot", x0: -99.5, z0: -4, x1: -76, z1: 4 },
  { what: "the houses on Visenya's Hill's slopes", x0: -98.5, z0: 13.5, x1: -71.5, z1: 46.5 },
  { what: "King's Landing's quays", x0: -99.5, z0: 60, x1: -14, z1: 74 },
  { what: 'the camp of the Sowing', ...SOWING },
  { what: "Aegon's strand", x0: -21, z0: 60, x1: -12, z1: 74 },
];

const d2 = (px: number, pz: number, a: P2, b: P2): number => {
  const vx = b[0] - a[0], vz = b[1] - a[1], l = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (pz - a[1]) * vz) / l));
  return Math.hypot(px - a[0] - vx * t, pz - a[1] - vz * t);
};

/** How far a place is from a line of corners. */
export function toLine(x: number, z: number, line: P2[]): number {
  let d = Infinity;
  for (let i = 0; i + 1 < line.length; i++) d = Math.min(d, d2(x, z, line[i], line[i + 1]));
  return d;
}

/** How far a place is from the middle of the nearest road, counting a ring to turn in as a road round its circle. */
export function toRoad(x: number, z: number): number {
  let d = Infinity;
  for (const line of Object.values(ROADS)) d = Math.min(d, toLine(x, z, line as P2[]));
  for (const t of Object.values(TURNS)) d = Math.min(d, Math.abs(Math.hypot(x - t.c[0], z - t.c[1]) - t.r) - 0.6);
  // Driftmark's road closes on itself
  const r = ROADS.driftmark;
  d = Math.min(d, d2(x, z, r[r.length - 1], r[0]));
  return d;
}

/** Whether a place is land: the mainland or an island, and not water, the sands or the Wendwater. */
export function isLand(x: number, z: number): boolean {
  if (inside(SANDS, x, z) || toLine(x, z, WENDWATER.line) < WENDWATER.half[1] + 0.3) return false;
  if (Object.values(ISLANDS).some((s) => inside(s, x, z))) return true;
  return (inside(LAND_NORTH, x, z) || inside(LAND_SOUTH, x, z)) && !isWater(x, z);
}

/** Whether a place is under a dragon at home: from where its head hangs to the tip of its tail, and as wide as its braced wings. */
export function underDragon(x: number, z: number, room = 0): boolean {
  for (const [id, h] of Object.entries(HOMES)) {
    const L = LENGTH[id], a = (h.facing * Math.PI) / 180, dx = x - h.x, dz = z - h.z;
    const along = dx * Math.cos(a) + dz * Math.sin(a), side = Math.abs(-dx * Math.sin(a) + dz * Math.cos(a));
    if (along < 0.34 * L + room && along > -0.72 * L - room && side < 0.14 * L + room) return true;
  }
  return false;
}

/**
 * Whether a place is open ground with `room` to spare round it: on the land,
 * and at least `room` clear of every lot, kept square, road, ring, shore,
 * dragon at home and place for a hero, and of every name board.
 */
export function open(x: number, z: number, room = 2): boolean {
  if (!isLand(x, z)) return false;
  for (const [dx, dz] of [[room, 0], [-room, 0], [0, room], [0, -room]]) if (!isLand(x + dx, z + dz)) return false;
  for (const l of LOTS) if (x > l.x0 - room && x < l.x1 + room && z > l.z0 - room && z < l.z1 + room) return false;
  for (const k of KEPT) if (x > k.x0 - room && x < k.x1 + room && z > k.z0 - room && z < k.z1 + room) return false;
  if (inside(RHAENYS.terrace, x, z)) return false;
  if (toRoad(x, z) < 4 + room) return false;
  if (underDragon(x, z, room)) return false;
  // a hero on show is seen from the south-east: nothing stands before it, and nothing crowds it
  for (const s of HERO_SPOTS) {
    const ex = x - s.x, ez = z - s.z, along = ex * 0.669 + ez * 0.743, across = Math.abs(-ex * 0.743 + ez * 0.669);
    if (Math.hypot(ex, ez) < 6 + room || (along > 0 && along < 14 && across < 6)) return false;
  }
  // nothing stands in a name board or its posts
  for (const b of BOARDS) {
    const ex = x - b.x, ez = z - b.z, along = ex * 0.669 + ez * 0.743, across = Math.abs(-ex * 0.743 + ez * 0.669);
    if (Math.abs(along) < 0.6 + room && across < b.w / 2 + 0.4 + room) return false;
  }
  return true;
}

/** Whether a place is in the kingswood's meadow by the Wendwater, where the flock grazes. */
export const inMeadow = (x: number, z: number): boolean => inside(MEADOW, x, z);

/**
 * How tall a thing at a place may be without hiding a name board. A board is
 * read from the south-east, and its lettering begins 2.3 above the ground: a
 * thing before it may be the taller the farther before it it stands. Infinity
 * where no board stands behind the place.
 */
export function underBoards(x: number, z: number, room = 1): number {
  let h = Infinity;
  for (const b of BOARDS) {
    const ex = x - b.x, ez = z - b.z, along = ex * 0.669 + ez * 0.743, across = Math.abs(-ex * 0.743 + ez * 0.669);
    if (along > 0 && along < 12 && across < b.w / 2 + room) h = Math.min(h, 1.9 + 0.78 * along);
  }
  return h;
}
