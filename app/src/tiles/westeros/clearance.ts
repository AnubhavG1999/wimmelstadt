// A check that the dragons keep clear of everything that stands on the tile:
// 8 units between a dragon, wing and all, and anything built.
//
// It flies both kinds of circuit in tenths of a second, lays each dragon's
// wing across its line of flight, swept by its speed and banked by its turn,
// and measures from the wing, the nose and the tail to every lot in the plan.
// It speaks in the console, on the development server only.

import * as THREE from 'three';
import { DROGON, HALF_SPAN, RHAEGAL, VISERION, formAt } from './dragon';
import type { Show } from './flight';
import { LOTS, WALL, type Lot } from './plan';

/** How near a dragon may come to anything. */
export const CLEAR = 8;

/** Storm's End's curtain wall is a ring, and the Wall leans back: both are measured as they are, not as their boxes. */
const RING = { x: 62, z: 88, r: 10, top: 16 };

function toLot(p: THREE.Vector3, l: Lot): number {
  const dx = Math.max(l.x0 - p.x, 0, p.x - l.x1), dz = Math.max(l.z0 - p.z, 0, p.z - l.z1), dy = Math.max(0, p.y - l.top);
  return Math.hypot(dx, dy, dz);
}

/** How far a place is from the nearest thing built, and what that is. */
export function nearest(p: THREE.Vector3): { d: number; id: string } {
  let d = Infinity, id = '';
  for (const l of LOTS) {
    if (l.id === 'wall' || l.id === 'se-wall') continue;
    const v = toLot(p, l);
    if (v < d) { d = v; id = l.id; }
  }
  // the Wall: beside it, its face is where it has leant back to at that height; above it, its top
  {
    const east = Math.max(0, p.x - WALL.x1);
    let w: number;
    if (p.y >= WALL.top) w = Math.hypot(east, p.y - WALL.top, Math.max(0, p.z - WALL.topSouth, WALL.topNorth - p.z));
    else w = Math.hypot(east, Math.max(0, p.z - (WALL.south + (WALL.topSouth - WALL.south) * Math.max(0, p.y / WALL.top))));
    if (w < d) { d = w; id = 'wall'; }
  }
  const ring = Math.hypot(Math.max(0, Math.abs(Math.hypot(p.x - RING.x, p.z - RING.z) - RING.r) - 1), Math.max(0, p.y - RING.top));
  if (ring < d) { d = ring; id = 'se-wall'; }
  return { d, id };
}

/** Flies the show against the plan, and says in the console how near the dragons come to what. */
export function checkFlight(show: Show): { id: string; d: number; who: string; at: number[]; split: boolean }[] {
  const kinds = [DROGON, RHAEGAL, VISERION];
  const worst = new Map<string, { id: string; d: number; who: string; at: number[]; split: boolean }>();
  const v = new THREE.Vector3(), a = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), wing = new THREE.Vector3(), p = new THREE.Vector3(), fwd = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  for (const split of [false, true]) {
    const all = show.sampled(split, 0.1);
    for (let who = 0; who < 3; who++) {
      const line = all.filter((s) => s.who === who), L = kinds[who].length;
      for (let i = 2; i + 2 < line.length; i++) {
        const here = line[i].p;
        // where one comes down to land and sits, it is meant to be near what it lands on
        if (split && show.landing(who, line[i].t)) continue;
        v.subVectors(line[i + 1].p, line[i - 1].p).multiplyScalar(1 / 0.2);
        a.copy(line[i + 2].p).add(line[i - 2].p).addScaledVector(here, -2).multiplyScalar(1 / 0.04);
        const speed = v.length();
        if (speed < 0.5) continue;
        fwd.copy(v).normalize();
        // level right, or any direction across it where it climbs straight up: both are tried there
        const steep = Math.abs(fwd.y) > 0.92;
        const rights = steep ? [right.set(1, 0, 0).clone(), right.set(0, 0, 1).clone()] : [right.crossVectors(fwd, UP).normalize().clone()];
        for (const r of rights) {
          const bank = steep ? 0 : Math.max(-1.36, Math.min(1.36, Math.atan2(a.dot(r), 13)));
          up.crossVectors(r, fwd).normalize();
          // banked to its right, its right wing drops
          wing.copy(r).multiplyScalar(Math.cos(bank)).addScaledVector(up, -Math.sin(bank));
          const half = formAt(speed).span * HALF_SPAN * L;
          const pts: THREE.Vector3[] = [];
          for (const s of [-1, -0.5, 0, 0.5, 1]) pts.push(p.copy(here).addScaledVector(wing, half * s).clone());
          pts.push(p.copy(here).addScaledVector(fwd, 0.34 * L).clone(), p.copy(here).addScaledVector(fwd, -0.66 * L).clone());
          for (const q of pts) {
            const n = nearest(q);
            const had = worst.get(n.id);
            if (!had || had.d > n.d) worst.set(n.id, { id: n.id, d: n.d, who: kinds[who].name, at: [Math.round(here.x), Math.round(here.y), Math.round(here.z)], split });
          }
        }
      }
    }
  }
  const list = [...worst.values()].sort((x, y) => x.d - y.d);
  const near = list.filter((w) => w.d < CLEAR);
  if (near.length > 0) {
    console.warn(`Westeros: the dragons come nearer than ${CLEAR} to:\n  ${near.map((w) => `${w.id}: ${w.d.toFixed(1)}, ${w.who} at ${w.at.join(', ')}${w.split ? ', on a split' : ''}`).join('\n  ')}`);
  } else {
    const n = list[0];
    console.info(`Westeros: the dragons keep ${CLEAR} clear of everything. Nearest: ${n.id}, ${n.d.toFixed(1)}, ${n.who} at ${n.at.join(', ')}.`);
  }
  return list;
}
