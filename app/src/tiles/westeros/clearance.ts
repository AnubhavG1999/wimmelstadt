// A check that the dragons keep clear of everything that stands on the tile:
// 8 units between a dragon, wing and all, and anything built.
//
// It flies both kinds of circuit in tenths of a second, lays each dragon's
// wing across its line of flight, swept by its speed and banked by its turn,
// and measures from the wing, the nose and the tail to every lot in the plan.
// It speaks in the console, on the development server only. Where a dragon
// reaches, and how far that is from the nearest thing built, is also what the
// dragons go by as they fly: near what stands on the tile they hold their
// slots closely.

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

const UP = new THREE.Vector3(0, 1, 0);
const KINDS = [DROGON, RHAEGAL, VISERION];

/**
 * Where a dragon reaches at a place, going at `v` and turning at `a`: five places across its wing, laid across its
 * line of flight, swept by its speed and banked by its turn, and its nose and the tip of its tail. Where it climbs
 * straight up any way across may be its wing's, and two are tried. Nothing where it is all but still.
 */
export function reachOf(who: number, here: THREE.Vector3, v: THREE.Vector3, a: THREE.Vector3): THREE.Vector3[] {
  const L = KINDS[who].length, speed = v.length();
  if (speed < 0.5) return [];
  const fwd = v.clone().normalize();
  // level right, or any direction across it where it climbs straight up: both are tried there
  const steep = Math.abs(fwd.y) > 0.92;
  const rights = steep ? [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1)] : [new THREE.Vector3().crossVectors(fwd, UP).normalize()];
  const pts: THREE.Vector3[] = [];
  for (const r of rights) {
    const bank = steep ? 0 : Math.max(-1.36, Math.min(1.36, Math.atan2(a.dot(r), 13)));
    const up = new THREE.Vector3().crossVectors(r, fwd).normalize();
    // banked to its right, its right wing drops
    const wing = r.clone().multiplyScalar(Math.cos(bank)).addScaledVector(up, -Math.sin(bank));
    const half = formAt(speed).span * HALF_SPAN * L;
    for (const s of [-1, -0.5, 0, 0.5, 1]) pts.push(here.clone().addScaledVector(wing, half * s));
    pts.push(here.clone().addScaledVector(fwd, 0.34 * L), here.clone().addScaledVector(fwd, -0.66 * L));
  }
  return pts;
}

/** Flies the show against the plan, and says in the console how near the dragons come to what. */
export function checkFlight(show: Show): { id: string; d: number; who: string; at: number[]; split: boolean }[] {
  const worst = new Map<string, { id: string; d: number; who: string; at: number[]; split: boolean }>();
  const v = new THREE.Vector3(), a = new THREE.Vector3();
  for (const split of [false, true]) {
    // four circuits of each, so that the dragons are seen strayed every way from their slots
    const all = show.sampled(split, 0.1, 4);
    for (let who = 0; who < 3; who++) {
      const line = all.filter((s) => s.who === who);
      for (let i = 2; i + 2 < line.length; i++) {
        const here = line[i].p;
        // where one comes down to land and sits, it is meant to be near what it lands on
        if (split && show.landing(who, line[i].t)) continue;
        v.subVectors(line[i + 1].p, line[i - 1].p).multiplyScalar(1 / 0.2);
        a.copy(line[i + 2].p).add(line[i - 2].p).addScaledVector(here, -2).multiplyScalar(1 / 0.04);
        for (const q of reachOf(who, here, v, a)) {
          const n = nearest(q);
          const had = worst.get(n.id);
          if (!had || had.d > n.d) worst.set(n.id, { id: n.id, d: n.d, who: KINDS[who].name, at: [Math.round(here.x), Math.round(here.y), Math.round(here.z)], split });
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
