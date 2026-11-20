// Where the open country is: the ground that no castle, road, river or yard
// has taken. Whoever plants a wood or stands a farm asks here first.

import { GODS_EYE, HERO_SPOTS, ISLANDS, LAND_NORTH, LAND_SOUTH, DORNE, LOTS, NECK, RIVERS, ROADS, STORMS_END, TURNS, WET, inside, type P2 } from './plan';

/** Ground that belongs to a place although no lot covers it: its yard, its square, its court, its quay. */
const KEPT: { what: string; x0: number; z0: number; x1: number; z1: number }[] = [
  { what: "Castle Black's yard", x0: -17, z0: -89.5, x1: 45, z1: -75.5 },
  { what: "the apron before Winterfell's gate", x0: 8, z0: -66, x1: 13, z1: -54 },
  { what: "Winter Town's market square", x0: 22, z0: -66, x1: 44, z1: -42 },
  { what: 'the yard of the inn', x0: 42, z0: -29, x1: 62, z1: -17 },
  { what: 'the yard of the Gates of the Moon', x0: 67, z0: -16, x1: 82.5, z1: -1 },
  { what: 'the tourney ground', x0: -16, z0: 31, x1: 24, z1: 47.5 },
  { what: "King's Landing's quays and river front", x0: 9, z0: 2, x1: 77, z1: 64 },
  { what: 'the court of roses', x0: -19, z0: 84.5, x1: -5, z1: 94 },
  { what: 'Oldtown', x0: -66, z0: 85, x1: -42, z1: 113 },
  { what: 'Sunspear and its shadow city', x0: 19, z0: 84, x1: 55, z1: 113 },
  { what: "the foot of Casterly Rock and Lannisport's gate", x0: -74, z0: 6, x1: -71.4, z1: 48 },
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

/** How far a place is from the middle of the nearest road, turning rings and the climb to Storm's End included. */
export function toRoad(x: number, z: number): number {
  let d = Infinity;
  for (const line of Object.values(ROADS)) d = Math.min(d, toLine(x, z, line));
  // a ring to turn in, and what stands in its middle, which is its builder's
  for (const t of Object.values(TURNS)) d = Math.min(d, Math.max(0, Math.hypot(x - t.c[0], z - t.c[1]) - t.r));
  // the road from the fork up to Storm's End's ring
  d = Math.min(d, toLine(x, z, [ROADS.kingsroad[14], [STORMS_END.x, STORMS_END.z]]));
  return d;
}

/** How far a place is from the nearest river's middle, less half the river's width there at its widest. */
export function toRiver(x: number, z: number): number {
  let d = Infinity;
  for (const r of Object.values(RIVERS)) d = Math.min(d, toLine(x, z, r.line) - r.half[1]);
  return d;
}

/** Which kind of ground a place is: snow in the North, sand in Dorne, green elsewhere. Null where there is no open ground: water, the bog, an island. */
export function groundKind(x: number, z: number): 'snow' | 'green' | 'sand' | null {
  if (((x - GODS_EYE.x) / GODS_EYE.rx) ** 2 + ((z - GODS_EYE.z) / GODS_EYE.rz) ** 2 < 1.12) return null;
  if (x > NECK.x0 && x < NECK.x1 && z > NECK.z0 && z < NECK.z1) return null;
  if (inside(LAND_NORTH, x, z)) return 'snow';
  if (inside(DORNE, x, z)) return 'sand';
  if (inside(LAND_SOUTH, x, z)) return 'green';
  return null;
}

/**
 * Whether a place is open country with `room` to spare round it: on the land,
 * and at least `room` clear of every lot, wet lot, river, shore, kept yard and
 * place for a hero, and `room` clear of the edge of every road.
 */
export function open(x: number, z: number, room = 2): boolean {
  if (!groundKind(x, z)) return false;
  // not within `room` of the shore: every way round, the ground is still ground
  for (const [dx, dz] of [[room, 0], [-room, 0], [0, room], [0, -room]]) if (!groundKind(x + dx, z + dz)) return false;
  for (const l of LOTS) if (x > l.x0 - room && x < l.x1 + room && z > l.z0 - room && z < l.z1 + room) return false;
  for (const k of KEPT) if (x > k.x0 - room && x < k.x1 + room && z > k.z0 - room && z < k.z1 + room) return false;
  for (const w of Object.values(WET)) {
    const xs = w.map((p) => p[0]), zs = w.map((p) => p[1]);
    if (x > Math.min(...xs) - room && x < Math.max(...xs) + room && z > Math.min(...zs) - room && z < Math.max(...zs) + room) return false;
  }
  for (const i of Object.values(ISLANDS)) if (((x - i.x) / (i.rx + room)) ** 2 + ((z - i.z) / (i.rz + room)) ** 2 < 1) return false;
  if (toRoad(x, z) < 4 + room) return false;
  if (toRiver(x, z) < room) return false;
  if (Math.hypot(x - STORMS_END.x, z - STORMS_END.z) < 15 + room) return false;
  // a hero on show is seen from the south-east: nothing stands before it, and nothing crowds it
  for (const s of HERO_SPOTS) {
    const ex = x - s.x, ez = z - s.z, along = ex * 0.669 + ez * 0.743, across = Math.abs(-ex * 0.743 + ez * 0.669);
    if (Math.hypot(ex, ez) < 7 + room || (along > 0 && along < 14 && across < 7)) return false;
  }
  return true;
}
