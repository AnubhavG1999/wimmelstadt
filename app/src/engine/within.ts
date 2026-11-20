// Keeps the view inside the collector's room, so that it never shows the
// nothing beyond the walls.
//
// The camera has no perspective: everything it sees lies along one direction
// behind the screen. So what a view shows of the room can be worked out on
// the floor. At the floor's level the screen covers a rectangle, turned as
// the view is turned. A place in that rectangle belongs to the room if it is
// on the floor, or if a wall on the far side still hides it: a wall as high
// as H hides the ground behind it for H / tan(tilt), measured the way the
// view looks. Floor and hidden ground together make a shape with six corners
// at most, and a view shows nothing but the room when its rectangle lies
// inside that shape. The walls on the near side are left off (see the room),
// so there the floor's own edge is the limit.

import type { Rect } from './tile';

/** A room the view is kept inside: its floor, the height the floor lies at, and the height of the tops of its walls. */
export interface Hall { floor: Rect; y: number; top: number }

/** A place on a plan: x, then z. */
type P = [number, number];

/** One side of a shape: the way out through it, and how far out it lies. */
interface Side { nx: number; nz: number; far: number }

/** What is kept back from the floor's edges and from the tops of the walls, so that the edge of the screen never runs along one. */
const SPARE = 2;

function areaOf(shape: P[]): number {
  let twice = 0;
  shape.forEach((p, i) => {
    const q = shape[(i + 1) % shape.length];
    twice += p[0] * q[1] - q[0] * p[1];
  });
  return Math.abs(twice) / 2;
}

/** The ground that belongs to the room for a view turned and tilted so: the floor, and what the far walls hide. */
function ground(hall: Hall, az: number, elev: number): { shape: P[]; sides: Side[] } {
  const hides = Math.max(0, (hall.top - SPARE - hall.y) / Math.tan(elev));
  const fx = -Math.sin(az) * hides, fz = -Math.cos(az) * hides;
  const x0 = hall.floor.x0 + SPARE, z0 = hall.floor.z0 + SPARE, x1 = hall.floor.x1 - SPARE, z1 = hall.floor.z1 - SPARE;
  // The floor's corners in turn, and the way out through the wall that starts
  // at each. A wall is a far one if the view looks at its face: what it hides
  // lies beyond it. The shape is the floor with every far wall moved out by
  // what it hides: where a near wall meets a far one, the corner is there
  // twice, once as it is and once moved.
  const corners: P[] = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  const out: P[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const far = out.map((n) => n[0] * fx + n[1] * fz > 1e-9);
  const shape: P[] = [];
  corners.forEach((c, i) => {
    const before = far[(i + 3) % 4], after = far[i], moved: P = [c[0] + fx, c[1] + fz];
    if (before && after) shape.push(moved);
    else if (!before && !after) shape.push(c);
    else if (after) shape.push(c, moved);
    else shape.push(moved, c);
  });
  const sides = shape.map((p, i): Side => {
    const q = shape[(i + 1) % shape.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    const nx = (q[1] - p[1]) / len, nz = -(q[0] - p[0]) / len;
    return { nx, nz, far: nx * p[0] + nz * p[1] };
  });
  return { shape, sides };
}

/**
 * Where the middle of the screen's rectangle may lie, for a view that shows
 * `viewH` units from top to bottom: what is left of the ground when each of
 * its sides is moved in by the rectangle's reach towards that side. Empty if
 * the rectangle does not fit at all.
 */
function leeway(g: { shape: P[]; sides: Side[] }, az: number, elev: number, aspect: number, viewH: number): P[] {
  const hw = (viewH / 2) * aspect, hd = viewH / 2 / Math.sin(elev);
  const rx = Math.cos(az), rz = -Math.sin(az), fx = -Math.sin(az), fz = -Math.cos(az);
  let poly = g.shape;
  for (const s of g.sides) {
    const limit = s.far - (hw * Math.abs(s.nx * rx + s.nz * rz) + hd * Math.abs(s.nx * fx + s.nz * fz));
    const out: P[] = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      const dp = s.nx * p[0] + s.nz * p[1] - limit, dq = s.nx * q[0] + s.nz * q[1] - limit;
      if (dp <= 0) out.push(p);
      if ((dp <= 0) !== (dq <= 0)) out.push([p[0] + ((q[0] - p[0]) * dp) / (dp - dq), p[1] + ((q[1] - p[1]) * dp) / (dp - dq)]);
    }
    poly = out;
    if (poly.length < 3) return [];
  }
  return poly;
}

/** The most a view may show at once, from top to bottom, turned and tilted so. Between `least` and `most`. */
function mostAt(hall: Hall, az: number, elev: number, aspect: number, least: number, most: number): number {
  const g = ground(hall, az, elev);
  const fits = (viewH: number): boolean => areaOf(leeway(g, az, elev, aspect, viewH)) > 0.5;
  if (fits(most)) return most;
  if (!fits(least)) return least;
  let lo = least, hi = most;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * The most a view may show at once at a tilt, whichever way it is turned. One
 * limit for every turn, so that turning the view never makes it draw closer.
 */
export function mostInside(hall: Hall, elev: number, aspect: number, least: number, most: number): number {
  let best = most;
  for (let a = 0; a < 36 && best > least; a++) best = mostAt(hall, (a * Math.PI) / 18, elev, aspect, least, best);
  return best;
}

/** The place in a shape that is nearest to a place: the place itself, if it is inside. */
function nearestIn(shape: P[], x: number, z: number): P {
  let inside = true, best: P = [x, z], bestD = Infinity;
  shape.forEach((p, i) => {
    const q = shape[(i + 1) % shape.length], ex = q[0] - p[0], ez = q[1] - p[1];
    if (ex * (z - p[1]) - ez * (x - p[0]) < 0) inside = false;
    const t = Math.min(1, Math.max(0, ((x - p[0]) * ex + (z - p[1]) * ez) / (ex * ex + ez * ez || 1)));
    const cx = p[0] + ex * t, cz = p[1] + ez * t, d = Math.hypot(cx - x, cz - z);
    if (d < bestD) {
      bestD = d;
      best = [cx, cz];
    }
  });
  return inside ? [x, z] : best;
}

/** A view that the room allows. */
export interface Held {
  /** How much it shows, from top to bottom. */
  viewH: number;
  /** The place on the ground it looks at. */
  x: number;
  z: number;
  /** Whether that place is not the one that was asked for. */
  moved: boolean;
}

/**
 * The view nearest to the one asked for that shows nothing beyond the room.
 * `limit` is the most any view may show at this tilt (from `mostInside`), and
 * `lookY` gives the height the view looks at for how much it shows. The view
 * is first drawn closer if it has to be, and then moved.
 */
export function holdInside(hall: Hall, az: number, elev: number, aspect: number, viewH: number, limit: number, lookY: (viewH: number) => number, x: number, z: number, least: number): Held {
  const g = ground(hall, az, elev);
  let shown = Math.min(viewH, limit);
  let free = leeway(g, az, elev, aspect, shown);
  if (areaOf(free) <= 0.5) {
    // the limit was worked out for a handful of turns, and this one is a little tighter than they were
    shown = mostAt(hall, az, elev, aspect, least, shown);
    free = leeway(g, az, elev, aspect, shown);
  }
  if (free.length < 3) return { viewH: shown, x, z, moved: false };
  // At the floor's level, the middle of what the screen covers lies beyond
  // the place looked at, by as much as the floor is below it.
  const beyond = (lookY(shown) - hall.y) / Math.tan(elev);
  const fx = -Math.sin(az) * beyond, fz = -Math.cos(az) * beyond;
  const [cx, cz] = nearestIn(free, x + fx, z + fz);
  return { viewH: shown, x: cx - fx, z: cz - fz, moved: Math.hypot(cx - fx - x, cz - fz - z) > 0.01 };
}
