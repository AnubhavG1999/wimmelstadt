// Everything road-like that is not painted on the ground: raised roads on their
// pillars, a railway on its trestle, and a deck wherever a street crosses water.
// Built in the tile's own units.

import * as THREE from 'three';
import type { P, P3, TilePlan } from '../city/plan.ts';
import { GeoBuilder, type V3 } from '../look/geo.ts';
import { makeCityMaterial } from '../look/materials.ts';
import type { Ground } from './ground.ts';

const ASPHALT = 0x4b4e55, CONCRETE = 0xbdb8ad, SHADE = 0x9d988f, IRON = 0x6b5546;

/** A point along a road: where it is, how high, and which way is across it. */
interface Station { x: number; y: number; z: number; ax: number; az: number }

/** Points about `step` apart along a path of [x, z, height] points, each knowing which way is across the road. */
function stations(path: P3[], closed: boolean, step: number): Station[] {
  const pts = closed ? [...path, path[0]] : path;
  const out: { x: number; y: number; z: number }[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push({ x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, y: a[2] + (b[2] - a[2]) * t });
    }
  }
  if (!closed) {
    const e = pts[pts.length - 1];
    out.push({ x: e[0], z: e[1], y: e[2] });
  }
  const n = out.length;
  return out.map((p, i) => {
    const a = closed ? out[(i - 1 + n) % n] : out[Math.max(0, i - 1)], b = closed ? out[(i + 1) % n] : out[Math.min(n - 1, i + 1)];
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
    return { ...p, ax: -dz / l, az: dx / l };
  });
}

interface DeckOpts { thick: number; wall: number; top: number; side: number }

/** A deck along a line of stations: a top, an underside, two edges, and a low wall on either side. */
function deck(b: GeoBuilder, st: Station[], closed: boolean, width: number, o: DeckOpts): void {
  const h = width / 2, n = st.length, last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p = st[i], q = st[(i + 1) % n];
    const at = (s: Station, side: number, y: number): V3 => [s.x + s.ax * h * side, s.y + y, s.z + s.az * h * side];
    // the road itself, and what is seen of it from below
    b.quad(at(p, -1, 0), at(p, 1, 0), at(q, 1, 0), at(q, -1, 0), [0, 1, 0], o.top);
    b.quad(at(p, -1, -o.thick), at(p, 1, -o.thick), at(q, 1, -o.thick), at(q, -1, -o.thick), [0, -1, 0], SHADE);
    for (const side of [-1, 1]) {
      const out: V3 = [p.ax * side, 0, p.az * side], back: V3 = [-p.ax * side, 0, -p.az * side];
      // the edge of the deck, and the wall that stands on it
      b.quad(at(p, side, -o.thick), at(q, side, -o.thick), at(q, side, o.wall), at(p, side, o.wall), out, o.side);
      if (o.wall > 0) {
        const inner = (s: Station, y: number): V3 => [s.x + s.ax * (h - 0.35) * side, s.y + y, s.z + s.az * (h - 0.35) * side];
        b.quad(inner(p, 0), inner(q, 0), inner(q, o.wall), inner(p, o.wall), back, o.side);
        b.quad(inner(p, o.wall), inner(q, o.wall), at(q, side, o.wall), at(p, side, o.wall), [0, 1, 0], o.side);
      }
    }
  }
}

export interface Roads { mesh: THREE.Mesh; triangles: number }

export function buildRoads(plan: TilePlan, ground: Ground): Roads {
  const b = new GeoBuilder();
  const floor = (x: number, z: number): number => Math.max(ground.heightAt(x, z), -2.8);

  // --- raised roads ---
  for (const r of plan.raised) {
    const st = stations(r.path, r.closed === true, 3);
    deck(b, st, r.closed === true, r.width, { thick: 0.8, wall: 0.9, top: ASPHALT, side: CONCRETE });
    if (!r.pillars) continue;
    // a pillar every so often, wherever the road is high enough to need one
    const every = Math.max(1, Math.round(r.pillars / 3));
    for (let i = Math.floor(every / 2); i < st.length; i += every) {
      const p = st[i], foot = floor(p.x, p.z);
      if (p.y - foot < 3) continue;
      b.box(p.x - 0.8, foot, p.z - 0.8, p.x + 0.8, p.y - 0.8, p.z + 0.8, CONCRETE, { faces: 'NESW' });
      b.box(p.x - 1.6, p.y - 1.5, p.z - 1.6, p.x + 1.6, p.y - 0.8, p.z + 1.6, CONCRETE, { faces: 'NESWB' });
    }
  }

  // --- a railway on its trestle: a slim deck of iron, on a pair of legs astride the street ---
  for (const r of plan.rails) {
    if (r.kind !== 'trestle') continue;
    const y = r.y ?? 7;
    const st = stations(r.path.map(([x, z]): P3 => [x, z, y]), r.closed === true, 2.5);
    deck(b, st, r.closed === true, 3.6, { thick: 0.6, wall: 0, top: 0x7a6656, side: IRON });
    for (let i = 0; i < st.length; i += 4) {
      const p = st[i];
      for (const side of [-1, 1]) {
        const x = p.x + p.ax * 2.6 * side, z = p.z + p.az * 2.6 * side;
        b.box(x - 0.28, floor(x, z), z - 0.28, x + 0.28, y - 0.6, z + 0.28, IRON, { faces: 'NESW' });
      }
      b.obox(p.x, y - 0.9, p.z, 2.9, 0.3, 0.3, Math.atan2(p.az, p.ax), IRON, { faces: 'B' });
    }
  }

  // --- wherever a street crosses water it gets a deck, so that nothing drives on water ---
  for (const s of plan.streets) {
    const path: P[] = s.closed ? [...s.path, s.path[0]] : s.path;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], c = path[i], len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const n = Math.max(1, Math.round(len / 2));
      for (let k = 0; k < n; k++) {
        const x = a[0] + ((c[0] - a[0]) * (k + 0.5)) / n, z = a[1] + ((c[1] - a[1]) * (k + 0.5)) / n;
        if (ground.heightAt(x, z) > -0.3) continue;
        const yaw = Math.atan2(c[1] - a[1], c[0] - a[0]);
        b.obox(x, -0.4, z, len / n / 2 + 0.15, 0.4, s.width / 2 + 0.7, yaw, CONCRETE, { top: ASPHALT, faces: 'B' });
        // a rail along either side
        for (const side of [-1, 1]) {
          const ox = -Math.sin(yaw) * (s.width / 2 + 0.55) * side, oz = Math.cos(yaw) * (s.width / 2 + 0.55) * side;
          b.obox(x + ox, 0.35, z + oz, len / n / 2 + 0.15, 0.35, 0.15, yaw, CONCRETE);
        }
      }
    }
  }

  const mesh = new THREE.Mesh(b.build(), makeCityMaterial());
  mesh.name = `${plan.id}: roads`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { mesh, triangles: b.triangles };
}
