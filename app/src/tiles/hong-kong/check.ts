// Checks for the development server only. Routes know nothing of each other,
// and neither do trams and buses, so nothing on this tile may cross anything
// else on the level. This looks for the places where two of them come closer
// than two vehicles can pass, and for the places where one of them runs
// through something that is built, and says so in the console.

import { buildPath } from '../../engine/paths';
import type { Route } from '../../engine/tile';
import { lengths3, type P3 } from './geom';
import * as THREE from 'three';

interface Sample { x: number; y: number; z: number; s: number }

/** Two vehicles need this much between the middles of their lanes. */
const ROOM = 2.9;
/** Roads further apart than this in height pass over each other. */
const CLEAR = 3.4;

/** Something built: the ground it covers, and from how high to how high it stands. */
export interface Solid { id: string; x0: number; z0: number; x1: number; z1: number; y0: number; y1: number }

/** A vehicle is about this high, and reaches this far to either side of the middle of its lane. */
const TALL = 3, WIDE = 1.5;

export function checkRoads(routes: Route[], rails: Record<string, P3[]>, solids: Solid[] = []): void {
  const lines: { id: string; pts: Sample[]; length: number }[] = [];
  const v = new THREE.Vector3();
  for (const r of routes) {
    const path = buildPath(r.segs, true, r.hump);
    const pts: Sample[] = [];
    for (let s = 0; s < path.length; s += 1) {
      path.at(s, v);
      pts.push({ x: v.x, y: v.y, z: v.z, s });
    }
    lines.push({ id: r.id, pts, length: path.length });
  }
  for (const [id, line] of Object.entries(rails)) {
    const s = lengths3(line);
    lines.push({ id, pts: line.map((p, i) => ({ x: p[0], y: p[1], z: p[2], s: s[i] })), length: s[s.length - 1] });
  }

  const found: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    for (let j = i; j < lines.length; j++) {
      const A = lines[i], B = lines[j];
      let worst = Infinity, at: Sample | null = null;
      for (const a of A.pts) {
        for (const c of B.pts) {
          if (Math.abs(a.y - c.y) > CLEAR) continue;
          if (i === j) {
            // the same road: only places far apart along it count
            const along = Math.abs(a.s - c.s);
            if (Math.min(along, A.length - along) < 14) continue;
          }
          const d = Math.hypot(a.x - c.x, a.z - c.z);
          if (d < worst) { worst = d; at = a; }
        }
      }
      if (at && worst < ROOM) found.push(`${A.id} and ${B.id} come within ${worst.toFixed(1)} at x ${at.x.toFixed(0)}, z ${at.z.toFixed(0)}`);
    }
  }
  const through = new Set<string>();
  for (const line of lines) {
    for (const p of line.pts) {
      for (const q of solids) {
        if (p.x > q.x0 - WIDE && p.x < q.x1 + WIDE && p.z > q.z0 - WIDE && p.z < q.z1 + WIDE && p.y + TALL > q.y0 && p.y < q.y1) through.add(`${line.id} runs through ${q.id}`);
      }
    }
  }
  if (through.size > 0) console.warn(`Hong Kong: roads that run through what is built:\n  ${[...through].join('\n  ')}`);
  const total = lines.map((l) => `${l.id} ${l.length.toFixed(0)}`).join(', ');
  if (found.length > 0) console.warn(`Hong Kong: roads that cross on the level:\n  ${found.join('\n  ')}`);
  else console.info(`Hong Kong: no road crosses another on the level${through.size > 0 ? '' : ', and none runs through anything built'}. Lengths: ${total}`);
}
