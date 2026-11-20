// A check of every lane against what is really built.
//
// `checkRoads` in engine/checks.ts looks along the routes against boxes that a
// tile hands it, one for each lot. A box is not what is built: an arch is open
// under its top, a wall may lean out over a road, and a ramp's low wall may
// stand where a lane turns. This check sweeps every lane with what drives on
// it, by rays through the tile's own triangles, and says in the console where
// something stands in a lane, hangs lower over it than what drives there, or
// where one of the tile's people stands in it. It found a traveller coming
// down from Storm's End clipping the ramp's wall as it turned for Sunspear,
// where the boxes said that all was clear.
//
// It is this tile's for now, and belongs beside `checkRoads`. Like the other
// checks, it runs on the development server only: city.ts calls it once the
// tile is built.

import * as THREE from 'three';
import type { GeoBuilder } from '../../engine/geo';
import { buildPath } from '../../engine/paths';
import type { Route, TrafficKind } from '../../engine/tile';

/**
 * A plain vehicle, as the engine's own checks take it: this high, reaching
 * this far to either side of the middle of its lane, this long, and held to
 * the road at two places this far apart. Heroes are lower.
 */
const PLAIN = { tall: 3, wide: 1.5, len: 7, wb: 4.2 };
/** The room left over what drives. */
const SPARE = 0.15;
/** How far apart along a lane the rays are cast. */
const STEP = 1;
/** The rays start this far over the lane, so that the road and what carries it are not seen. */
const LIFT = 0.3;
/** A person reaches this far from where they stand, and is in a lane if they stand within this much of what drives there. */
const PERSON = 0.35;
/** The squares the triangles are filed under, to find the few a ray can meet. */
const CELL = 4;

/** Something in the way of a lane. */
export interface LaneFault {
  route: string;
  /** How far along the route, and where. */
  s: number;
  x: number;
  y: number;
  z: number;
  /** `in`: something built stands in the lane. `over`: something built hangs lower over it than what drives there. `person`: one of the tile's people stands in it. */
  what: 'in' | 'over' | 'person';
  /** How high over the lane it is, and how far from the lane's middle. */
  h: number;
  lat: number;
}

export interface LaneCheck {
  /** The tile's own kinds of traffic: their shapes say how high and how wide what drives is. Plain vehicles and heroes are counted whether or not any are given. */
  kinds?: TrafficKind[];
  /** Where the tile's people stand: `k.people`. */
  people?: readonly { x: number; y: number; z: number }[];
}

/**
 * How tall what drives is at a distance across from the middle of its lane:
 * the plain vehicles' box, and each of the tile's own kinds seen from ahead,
 * as its shape has it (its nose along +x, so z is across). A point counts a
 * quarter of a unit further in than it is, since a vehicle swings a little in
 * a bend.
 */
function profileOf(kinds: TrafficKind[]): (lat: number) => number {
  const across: number[] = [], up: number[] = [];
  for (const kind of kinds) {
    const p = kind.geo.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      across.push(Math.abs(p.getZ(i)));
      up.push(p.getY(i));
    }
  }
  return (lat) => {
    let h = lat <= PLAIN.wide ? PLAIN.tall : 0;
    for (let i = 0; i < up.length; i++) if (across[i] >= lat - 0.25 && up[i] > h) h = up[i];
    return h;
  };
}

const key = (i: number, j: number): number => (i + 4096) * 8192 + (j + 4096);

/** Files every triangle under each square of ground its outline reaches. `p` is nine numbers to a triangle. */
function filed(p: Float32Array): Map<number, number[]> {
  const cells = new Map<number, number[]>();
  for (let t = 0; t < p.length; t += 9) {
    const i0 = Math.floor(Math.min(p[t], p[t + 3], p[t + 6]) / CELL), i1 = Math.floor(Math.max(p[t], p[t + 3], p[t + 6]) / CELL);
    const j0 = Math.floor(Math.min(p[t + 2], p[t + 5], p[t + 8]) / CELL), j1 = Math.floor(Math.max(p[t + 2], p[t + 5], p[t + 8]) / CELL);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const at = key(i, j), list = cells.get(at);
        if (list) list.push(t);
        else cells.set(at, [t]);
      }
    }
  }
  return cells;
}

/** How far along a ray from `o` the way `d` points (a unit long) it meets the triangle at `t`, from either side, or Infinity. */
function meet(p: Float32Array, t: number, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number): number {
  const ax = p[t], ay = p[t + 1], az = p[t + 2];
  const e1x = p[t + 3] - ax, e1y = p[t + 4] - ay, e1z = p[t + 5] - az, e2x = p[t + 6] - ax, e2y = p[t + 7] - ay, e2z = p[t + 8] - az;
  const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
  const det = e1x * px + e1y * py + e1z * pz;
  if (Math.abs(det) < 1e-12) return Infinity;
  const inv = 1 / det, tx = ox - ax, ty = oy - ay, tz = oz - az;
  const u = (tx * px + ty * py + tz * pz) * inv;
  if (u < 0 || u > 1) return Infinity;
  const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
  const v = (dx * qx + dy * qy + dz * qz) * inv;
  if (v < 0 || u + v > 1) return Infinity;
  const d = (e2x * qx + e2y * qy + e2z * qz) * inv;
  return d > 1e-5 ? d : Infinity;
}

/**
 * Sweeps every lane of `routes` with what drives on it, through the triangles
 * of `built` (the tile's `k.b`, once everything is built), and says in the
 * console under the tile's name what it finds. Every unit along each lane,
 * at its middle and at each edge of the widest thing that drives there:
 *
 * - a ray straight up from just above the lane, as high as what drives there
 *   is at that distance from the middle, and a little more;
 * - rays along the lane to the next place, at three heights up to that.
 *
 * In a bend the middle and the inner edge are moved in, and the outer edge
 * out, by as far as the longest thing that drives there swings: a vehicle is
 * held to the road at two places, so in a bend its middle cuts inside the
 * lane and its ends swing outside it. On a ring 4 across a wheelhouse 10 long
 * reaches a unit in and two out.
 *
 * A gate's arch, a bridge's deck under the road and a wall beside it are
 * clear of all of these. What is not, is a fault. With `people`, it also
 * finds anybody who stands where what drives would run into them.
 *
 * Returns what it found, so that it can be looked at from the console.
 */
export function checkLanes(tile: string, routes: Route[], built: GeoBuilder, o: LaneCheck = {}): LaneFault[] {
  const geo = built.build(), p = geo.getAttribute('position').array as Float32Array;
  geo.dispose();
  const cells = filed(p), stamp = new Int32Array(p.length / 9);
  let query = 0;
  /** The nearest that a ray from `o` the way `d` points meets anything built, within `far`, or Infinity. */
  const nearest = (ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, far: number): number => {
    query++;
    let best = Infinity;
    const i0 = Math.floor(Math.min(ox, ox + dx * far) / CELL), i1 = Math.floor(Math.max(ox, ox + dx * far) / CELL);
    const j0 = Math.floor(Math.min(oz, oz + dz * far) / CELL), j1 = Math.floor(Math.max(oz, oz + dz * far) / CELL);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        for (const t of cells.get(key(i, j)) ?? []) {
          if (stamp[t / 9] === query) continue;
          stamp[t / 9] = query;
          const d = meet(p, t, ox, oy, oz, dx, dy, dz);
          if (d < best) best = d;
        }
      }
    }
    return best <= far ? best : Infinity;
  };

  const kinds = o.kinds ?? [];
  const wide = Math.max(PLAIN.wide, ...kinds.map((k) => k.wid / 2));
  const profile = profileOf(kinds), tallMid = profile(0) + SPARE, tallEdge = profile(wide) + SPARE;
  // the longest of what drives, and the two places furthest apart that hold anything to the road
  const long = Math.max(PLAIN.len, ...kinds.map((k) => k.len)), wb = Math.max(PLAIN.wb, ...kinds.map((k) => k.wb ?? 0.6 * k.len));
  const faults: LaneFault[] = [];
  const lanes: { route: string; s: number; x: number; y: number; z: number }[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c0 = new THREE.Vector3(), c1 = new THREE.Vector3();
  for (const r of routes) {
    const path = buildPath(r.segs, true, r.hump);
    for (let s = 0; s < path.length; s += STEP) {
      path.at(s, a);
      path.at(s + STEP, b);
      lanes.push({ route: r.id, s, x: a.x, y: a.y, z: a.z });
      const fx = b.x - a.x, fy = b.y - a.y, fz = b.z - a.z, fl = Math.hypot(fx, fy, fz), hl = Math.hypot(fx, fz);
      if (fl < 1e-6 || hl < 1e-6) continue;
      // across the lane, level: to the right of the way it runs
      const nx = -fz / hl, nz = fx / hl;
      // how sharply the lane bends here, over the length that holds the longest to the road, and to which side: + is right
      path.at(s - wb / 2, c0);
      path.at(s + wb / 2, c1);
      const d1x = a.x - c0.x, d1z = a.z - c0.z, d2x = c1.x - a.x, d2z = c1.z - a.z;
      const turn = Math.atan2(d1x * d2z - d1z * d2x, d1x * d2x + d1z * d2z), bend = Math.abs(turn) / (wb / 2), side = turn < 0 ? -1 : 1;
      const inward = ((wb * wb) / 8) * bend, outward = ((long * long - wb * wb) / 8) * bend;
      const rays: [number, number][] = [[side * inward, tallMid], [side * (wide + inward), tallEdge], [-side * (wide + outward), tallEdge]];
      rays.forEach(([lat, H]) => {
        const ox = a.x + nx * lat, oz = a.z + nz * lat;
        const up = nearest(ox, a.y + LIFT, oz, 0, 1, 0, H - LIFT);
        if (up < Infinity) faults.push({ route: r.id, s, x: ox, y: a.y, z: oz, what: 'over', h: LIFT + up, lat });
        for (const h of [0.7, H * 0.5, H - 0.3]) {
          if (nearest(ox, a.y + h, oz, fx / fl, fy / fl, fz / fl, fl) < Infinity) {
            faults.push({ route: r.id, s, x: ox, y: a.y, z: oz, what: 'in', h, lat });
            break;
          }
        }
      });
    }
  }

  // the tile's people: anybody who stands where the widest thing that drives would run into them
  if (o.people) {
    const near = new Map<number, typeof lanes>();
    for (const l of lanes) {
      const at = key(Math.floor(l.x / CELL), Math.floor(l.z / CELL)), list = near.get(at);
      if (list) list.push(l);
      else near.set(at, [l]);
    }
    for (const m of o.people) {
      let hit: (typeof lanes)[number] | null = null, best = wide + PERSON;
      const i = Math.floor(m.x / CELL), j = Math.floor(m.z / CELL);
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          for (const l of near.get(key(i + di, j + dj)) ?? []) {
            const d = Math.hypot(m.x - l.x, m.z - l.z);
            if (d < best && Math.abs(m.y - l.y) < tallMid) { best = d; hit = l; }
          }
        }
      }
      if (hit) faults.push({ route: hit.route, s: hit.s, x: m.x, y: m.y, z: m.z, what: 'person', h: m.y - hit.y, lat: best });
    }
  }

  // one line for each stretch of a lane where something is in the way
  const said: string[] = [];
  const sorted = [...faults].sort((x, y) => (x.route === y.route ? x.s - y.s : x.route < y.route ? -1 : 1));
  for (let i = 0; i < sorted.length; i++) {
    const f = sorted[i], run = [f], person = f.what === 'person';
    while (i + 1 < sorted.length && sorted[i + 1].route === f.route && (sorted[i + 1].what === 'person') === person && sorted[i + 1].s - run[run.length - 1].s <= 2 * STEP) run.push(sorted[++i]);
    const last = run[run.length - 1], along = last.s > f.s ? `, for ${(last.s - f.s + STEP).toFixed(0)} along it` : '';
    const lo = Math.min(...run.map((g) => g.h)), hi = Math.max(...run.map((g) => g.h)), out = Math.max(...run.map((g) => Math.abs(g.lat)));
    const how = hi - lo < 0.05 ? lo.toFixed(1) : `${lo.toFixed(1)} to ${hi.toFixed(1)}`;
    said.push(`${f.route} at x ${f.x.toFixed(1)}, z ${f.z.toFixed(1)}${along}: ${person ? `somebody stands in it, ${out.toFixed(1)} from its middle` : `something built is in the way, ${how} over the lane and up to ${out.toFixed(1)} from its middle`}`);
  }
  if (said.length > 0) {
    console.warn(`${tile}: lanes that run into something, by rays along them through what is built:\n  ${said.slice(0, 20).join('\n  ')}${said.length > 20 ? `\n  and ${said.length - 20} more` : ''}`);
  } else {
    console.info(`${tile}: every lane is clear, by rays along it through what is built. Nothing stands in one, nothing hangs lower over one than ${tallMid.toFixed(1)} over its middle or ${tallEdge.toFixed(1)} at ${wide.toFixed(2)} from it, in bends too${o.people ? ", and none of the tile's people stands in one" : ''}.`);
  }
  return faults;
}
