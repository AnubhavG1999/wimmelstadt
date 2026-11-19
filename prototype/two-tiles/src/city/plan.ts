// What a tile's plan is made of. A plan is the record of one tile's layout:
// its ground, its roads, and where each building and landmark stands. The tile
// is built from it.
//
// Everything is measured in the tile's own units, from its north-west corner:
// x runs east and z runs south, both from 0 to TILE. One unit is a centimetre
// of toy, and a car is about seven long. Height is 0 at street level.

/** How long each side of a tile is. Every tile is the same size. */
export const TILE = 280;

/** How wide the avenue between two tiles is. An avenue belongs to the city, not to a tile. */
export const AVENUE = 14;

export type P = [number, number];
export type P3 = [number, number, number];

/** A piece of ground: an outline, a line with a width, or a round patch. */
export type Shape =
  | { outline: P[] }
  | { line: P[]; width: number }
  | { round: P; rx: number; rz: number };

export interface Hill { at: P; r: number; h: number }

/**
 * A road on the ground. `drive` marks the ones that carry traffic while the
 * tile is a blockout; a `lane` is too small for that, and a `route` is a road
 * with a name of its own.
 */
export interface Street {
  id: string;
  name?: string;
  kind: 'street' | 'boulevard' | 'route' | 'lane';
  path: P[];
  width: number;
  drive?: boolean;
  closed?: boolean;
}

/** A road above the ground. Its path gives the height at each point. */
export interface Raised {
  id: string;
  name?: string;
  path: P3[];
  width: number;
  closed?: boolean;
  drive?: boolean;
  /** How far apart the pillars under it stand. None if left out. */
  pillars?: number;
}

/** Rails: a tram's in the street, or a railway's on a trestle above it. */
export interface Rail { id: string; kind: 'trestle' | 'tram'; path: P[]; closed?: boolean; y?: number }

/** A named part of a tile that holds more than one place. */
export interface Quarter { name: string; at: P }

/**
 * Ground where ordinary buildings stand, as plain volumes while the tile is a
 * blockout: from one corner to the other, in the style of its quarter. `turn`
 * swings its street grid, in degrees.
 */
export interface Fill { area: [number, number, number, number]; style: string; turn?: number }

/**
 * A plain solid, part of the rough shape that stands in for a thing that has no
 * model yet. A box is given as width, depth and height, and a drum as its radius
 * at the foot, its radius at the top and its height. `at` is how far east, how
 * far south and how high it stands from the thing it belongs to.
 */
export type Solid =
  | { box: [number, number, number]; at?: P3; turn?: number; colour: number; top?: number; windows?: boolean; lit?: number }
  | { drum: [number, number, number]; sides?: number; at?: P3; colour: number; top?: number; lit?: number };

/**
 * A recognisable thing: a landmark, a named business or a small scene. Either
 * a finished model stands for it, or a rough shape does until it has one.
 */
export interface Thing {
  id: string;
  name: string;
  at: P;
  /** Shown on the map from further away. */
  major?: boolean;
  /** The finished model that stands here. */
  model?: string;
  /** Its size next to the model as built, and how far it is turned, in degrees. */
  scale?: number;
  turn?: number;
  /** The rough shape that stands in for it. */
  solids?: Solid[];
  /** The ground it keeps clear of ordinary buildings: half its width and half its depth. */
  clear?: P;
  /** For a bridge: the two ends of the water it crosses. It is built along that line. */
  span?: [P, P];
  /** It stands on the water, so it floats at the water's level. */
  afloat?: boolean;
  /** How high its name floats. Worked out from its shape if left out. */
  top?: number;
}

export interface TilePlan {
  id: string;
  name: string;
  /** Traffic keeps to the left here, as it does in the real place. */
  drivesOnLeft?: boolean;
  water: Shape[];
  /** Ground that rises out of the water again: an island, a headland. */
  land: Shape[];
  parks: Shape[];
  hills: Hill[];
  streets: Street[];
  raised: Raised[];
  rails: Rail[];
  quarters: Quarter[];
  fills: Fill[];
  things: Thing[];
}

// --- small helpers shared by the plans and the builders ------------------------

/** A smooth line through the given points (Catmull-Rom), as a list of points. */
export function smooth(points: P[], closed: boolean, perSpan = 8): P[] {
  const n = points.length;
  if (n < 3) return points.slice();
  const at = (i: number): P => (closed ? points[((i % n) + n) % n] : points[Math.min(n - 1, Math.max(0, i))]);
  const out: P[] = [];
  const spans = closed ? n : n - 1;
  for (let i = 0; i < spans; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < perSpan; k++) {
      const t = k / perSpan, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  if (!closed) out.push(points[n - 1]);
  return out;
}

/** Points round a circle, for a round road or a round shore. */
export function circle(cx: number, cz: number, r: number, n = 48): P[] {
  return Array.from({ length: n }, (_, i): P => [cx + Math.cos((i / n) * Math.PI * 2) * r, cz + Math.sin((i / n) * Math.PI * 2) * r]);
}

/** A rectangle's outline, from one corner to the other. */
export const rect = (x0: number, z0: number, x1: number, z1: number): { outline: P[] } => ({ outline: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] });
