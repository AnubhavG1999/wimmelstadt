// The tide at High Tide: the sands between Driftmark and High Tide's islet are
// covered and uncovered in a slow round, and at the top of it the sea covers
// the causeway, as the books' "reached by a causeway at low tide" says.
//
// The engine's water has one level, so the tide is the tile's own: a second
// surface of water over the sands. Its middle rises and falls with the tide;
// round it, a margin slopes out from that level down to below the bay's own
// water a few units off, so that where it shows it swells up out of the bay
// rather than standing in a wall. At low tide all of it is under the bay's
// water and the sands are dry.

import * as THREE from 'three';
import { makeWaterMaterial } from '../../engine/look/materials';
import type { Build } from '../../engine/tile';
import { BAY } from './land';
import { SANDS, WATER_LEVEL, type P2 } from './plan';

/** The tide's round: how many seconds it takes, and how high the water's middle stands at its lowest and its highest. */
export const TIDE = { period: 150, low: WATER_LEVEL - 0.05, high: 0.08 };

const ease = (t: number): number => t * t * (3 - 2 * t);

/** How high the tide stands at a time, in seconds: low for two-fifths of its round, rising, high for a fifth, and falling. */
export function tideAt(time: number): number {
  const f = (((time % TIDE.period) + TIDE.period) % TIDE.period) / TIDE.period;
  const up = f < 0.4 ? 0 : f < 0.6 ? ease((f - 0.4) / 0.2) : f < 0.8 ? 1 : 1 - ease((f - 0.8) / 0.2);
  return TIDE.low + (TIDE.high - TIDE.low) * up;
}

let pinned: number | null = null;

/** For the checks: stands the tide still at a share of the way from low (0) to high (1), or lets it go with the time again (null). */
export function pinTide(up: number | null): void {
  pinned = up;
}

/** An outline pushed outwards by `d`, corner by corner. */
function grown(shape: P2[], d: number): P2[] {
  const n = shape.length;
  let area = 0;
  for (let i = 0; i < n; i++) area += shape[i][0] * shape[(i + 1) % n][1] - shape[(i + 1) % n][0] * shape[i][1];
  const s = area > 0 ? 1 : -1;
  return shape.map((p, i) => {
    const a = shape[(i + n - 1) % n], c = shape[(i + 1) % n];
    const n1 = [(p[1] - a[1]) * s, -(p[0] - a[0]) * s], n2 = [(c[1] - p[1]) * s, -(c[0] - p[0]) * s];
    const l1 = Math.hypot(n1[0], n1[1]) || 1, l2 = Math.hypot(n2[0], n2[1]) || 1;
    const mx = n1[0] / l1 + n2[0] / l2, mz = n1[1] / l1 + n2[1] / l2, ml = Math.hypot(mx, mz) || 1;
    // the corner moves out along the bisector, far enough that each side moves out by d
    const k = d / Math.max(0.35, (mx / ml) * (n1[0] / l1) + (mz / ml) * (n1[1] / l1));
    return [p[0] + (mx / ml) * k, p[1] + (mz / ml) * k];
  });
}

export function buildTide(k: Build): void {
  const inner = grown(SANDS, 0.6), outer = grown(SANDS, 8);
  const n = inner.length, pos: number[] = [];
  // the middle, over the sands: its corners rise and fall
  const tris = THREE.ShapeUtils.triangulateShape(inner.map((p) => new THREE.Vector2(p[0], p[1])), []);
  const moving: number[] = [];
  const push = (p: P2, y: number, moves: boolean): void => {
    if (moves) moving.push(pos.length / 3);
    pos.push(p[0], y, p[1]);
  };
  for (const t of tris) {
    // wound so that the surface faces the sky
    const [a, b, c] = t.map((i) => inner[i]);
    const over = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
    for (const p of over >= 0 ? [a, b, c] : [a, c, b]) push(p, 0, true);
  }
  // the margin, from the middle's edge out to below the bay's water
  const low = WATER_LEVEL - 0.08;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, ai = inner[i], aj = inner[j], bi = outer[i], bj = outer[j];
    const over = (aj[1] - ai[1]) * (bi[0] - ai[0]) - (aj[0] - ai[0]) * (bi[1] - ai[1]);
    if (over >= 0) {
      push(ai, 0, true); push(aj, 0, true); push(bi, low, false);
      push(aj, 0, true); push(bj, low, false); push(bi, low, false);
    } else {
      push(ai, 0, true); push(bi, low, false); push(aj, 0, true);
      push(aj, 0, true); push(bi, low, false); push(bj, low, false);
    }
  }
  const geo = new THREE.BufferGeometry();
  const attr = new THREE.Float32BufferAttribute(pos, 3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', attr);
  // level everywhere, as the bay's own water is: a crease in the light would draw a line across the water
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(Array.from({ length: pos.length }, (_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  const level = (y: number): void => {
    for (const i of moving) attr.setY(i, y);
    attr.needsUpdate = true;
    geo.computeBoundingSphere();
  };
  level(tideAt(0));
  const mesh = new THREE.Mesh(geo, makeWaterMaterial(k.look, BAY));
  mesh.name = 'tide';
  mesh.receiveShadow = true;
  // it mirrors the city as the bay does, so it is left out of the mirror image itself
  mesh.layers.set(1);
  k.group.add(mesh);
  let last = NaN;
  k.each((_dt, time) => {
    const y = pinned === null ? tideAt(time) : TIDE.low + (TIDE.high - TIDE.low) * pinned;
    if (Math.abs(y - last) < 0.002) return;
    last = y;
    level(y);
  });
}
