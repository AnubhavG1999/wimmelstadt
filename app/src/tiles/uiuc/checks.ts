// Checks that the tile runs on itself on the development server, and says in
// the console what it finds.
//
// The engine's `checkRoads` takes any two routes that come close for a
// crossing. This tile's routes share lanes on purpose: a loop round several
// blocks runs in the lanes of the loops inside it. So the tile looks for the
// two things that are faults here: two routes whose lines really cross, and two
// that meet head-on in one lane. A lane that two routes drive the same way is
// as it should be.

import * as THREE from 'three';
import { hiddenBy, type Solid, type Tall } from '../../engine/checks';
import { buildPath } from '../../engine/paths';
import type { Route } from '../../engine/tile';
import type { SightPoint } from './plan';

interface Sample { x: number; z: number; y: number; tx: number; tz: number }

/** A route as points half a unit apart, each with the way it heads. */
function sampled(r: Route): Sample[] {
  const path = buildPath(r.segs, true, r.hump);
  const n = Math.max(8, Math.round(path.length / 0.5));
  const p = new THREE.Vector3(), q = new THREE.Vector3();
  return Array.from({ length: n }, (_, i) => {
    const s = (i / n) * path.length;
    path.at(s, p);
    path.at(s + 0.25, q);
    const tx = q.x - p.x, tz = q.z - p.z, l = Math.hypot(tx, tz) || 1;
    return { x: p.x, y: p.y, z: p.z, tx: tx / l, tz: tz / l };
  });
}

/** Where the stretch from a to b and the stretch from c to d cross, if each passes through the inside of the other. */
function crossing(a: Sample, b: Sample, c: Sample, d: Sample): { x: number; z: number } | null {
  const rx = b.x - a.x, rz = b.z - a.z, sx = d.x - c.x, sz = d.z - c.z;
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * sz - (c.z - a.z) * sx) / den, u = ((c.x - a.x) * rz - (c.z - a.z) * rx) / den;
  if (t <= 0.02 || t >= 0.98 || u <= 0.02 || u >= 0.98) return null;
  return { x: a.x + rx * t, z: a.z + rz * t };
}

/**
 * The places where two routes cross on the level, or meet head-on in one
 * lane. Where one route leaves a lane that another goes on along, the two
 * lines part at a shallow angle and do not cross: only a crossing at more
 * than about 25 degrees counts.
 */
export function roadFaults(routes: Route[]): string[] {
  const lines = routes.map((r) => ({ id: r.id, pts: sampled(r) }));
  const found = new Set<string>();
  const CELL = 4;
  const key = (cx: number, cz: number): number => (cx + 256) * 1024 + (cz + 256);
  for (let i = 0; i < lines.length; i++) {
    // this route's stretches, sorted into squares on the ground
    const A = lines[i], grid = new Map<number, number[]>();
    A.pts.forEach((p, n) => {
      const at = key(Math.floor(p.x / CELL), Math.floor(p.z / CELL));
      let cell = grid.get(at);
      if (!cell) grid.set(at, (cell = []));
      cell.push(n);
    });
    for (let j = i; j < lines.length; j++) {
      const B = lines[j];
      for (let m = 0; m < B.pts.length; m++) {
        const c = B.pts[m], d = B.pts[(m + 1) % B.pts.length];
        const cx = Math.floor(c.x / CELL), cz = Math.floor(c.z / CELL);
        for (let ix = -1; ix <= 1; ix++) for (let iz = -1; iz <= 1; iz++) {
          for (const n of grid.get(key(cx + ix, cz + iz)) ?? []) {
            if (i === j && Math.min(Math.abs(n - m), A.pts.length - Math.abs(n - m)) < 12) continue;
            const a = A.pts[n], b = A.pts[(n + 1) % A.pts.length];
            if (Math.abs(a.y - c.y) > 3.4) continue;
            const dot = a.tx * c.tx + a.tz * c.tz;
            // head-on: in one lane, the opposite way
            if (dot < -0.9 && Math.hypot(a.x - c.x, a.z - c.z) < 1.2) {
              found.add(`${A.id} and ${B.id} meet head-on near x ${Math.round(a.x)}, z ${Math.round(a.z)}`);
              continue;
            }
            if (Math.abs(dot) > 0.9) continue; // side by side, or one leaving the other's lane
            const at = crossing(a, b, c, d);
            if (at) found.add(`${A.id} and ${B.id} cross near x ${Math.round(at.x)}, z ${Math.round(at.z)}`);
          }
        }
      }
    }
  }
  return [...found];
}

/** The routes that run through something built: a vehicle is about 3 high and reaches 1.5 to either side of its line. */
export function throughSolids(routes: Route[], solids: Solid[]): string[] {
  const found = new Set<string>();
  for (const r of routes) {
    for (const p of sampled(r)) {
      for (const q of solids) {
        if (p.x > q.x0 - 1.5 && p.x < q.x1 + 1.5 && p.z > q.z0 - 1.5 && p.z < q.z1 + 1.5 && p.y + 3 > q.y0 && p.y < q.y1) found.add(`${r.id} runs through ${q.id}`);
      }
    }
  }
  return [...found];
}

/** The places that must be seen from the opening view and are not, each with what stands in the way. */
export function unseen(points: SightPoint[], tall: Tall[]): string[] {
  return points.flatMap((p) => {
    const by = hiddenBy(p, tall.filter((t) => !p.skip.some((s) => t.id === s || t.id.startsWith(`${s}/`))));
    return by.length > 0 ? [`${p.name} is behind ${by.join(', ')}`] : [];
  });
}
