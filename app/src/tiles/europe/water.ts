// Boats on the river: one that goes up and down the bend between London and
// Paris, and one tied up at the Seine's south quay, across from Notre-Dame. They are made the
// way the tile's other moving things are: a mesh of their own, moved by `k.each`.

import * as THREE from 'three';
import { GeoBuilder, interior } from '../../engine/geo';
import type { Build } from '../../engine/tile';
import { tri } from './parts';
import { BEND_1, SEINE_Z, THAMES_X, WATER_DROP } from './plan';

/**
 * A river boat for sightseers, built at the middle of its own length with its
 * bow to the east: a white hull, a long cabin of glass, and an open deck on
 * top with people on it.
 */
function riverBoat(g: GeoBuilder, stripe: number): void {
  const HULL = 0xf2f0ea, GLASS = 0x8fc0d8, DECK = 0xc9b58f, L = 4.6, W = 1.35;
  g.box(-L, -0.3, -W, L - 1.6, 0.75, W, HULL, { faces: 'NSWT' });
  // the bow: the two sides come to a point
  for (const s of [-1, 1]) g.quad([L - 1.6, -0.3, s * W], [L, -0.3, 0], [L, 0.75, 0], [L - 1.6, 0.75, s * W], [0.6, 0, s * 0.8], HULL);
  tri(g, [L - 1.6, 0.75, -W], [L - 1.6, 0.75, W], [L, 0.75, 0], [0, 1, 0], HULL);
  g.box(-L, 0.28, -W - 0.02, L - 1.6, 0.48, W + 0.02, stripe, { faces: 'NSW' });
  g.box(-L + 0.5, 0.75, -W + 0.15, L - 2.4, 1.75, W - 0.15, GLASS, { win: interior(0.7), faces: 'NESW' });
  g.box(-L + 0.3, 1.75, -W + 0.05, L - 2.2, 1.9, W - 0.05, DECK, { faces: 'NESWTB' });
  // a rail round the deck, and those on it
  for (const s of [-1, 1]) g.box(-L + 0.3, 1.9, s > 0 ? W - 0.12 : -W + 0.05, L - 2.2, 2.35, s > 0 ? W - 0.05 : -W + 0.12, HULL);
  const coats = [0xd94f4f, 0x3f6fb5, 0xf2c14e, 0x4fa36b, 0xeeeeee, 0xc77dba];
  coats.forEach((coat, i) => {
    const x = -L + 1.1 + i * 0.85, z = (i % 2 ? 0.45 : -0.45);
    g.box(x - 0.2, 1.9, z - 0.2, x + 0.2, 2.9, z + 0.2, coat, { faces: 'NESW' });
    g.box(x - 0.16, 2.9, z - 0.16, x + 0.16, 3.25, z + 0.16, 0xe8c4a0);
  });
  g.box(-L + 0.05, 0.75, -0.04, -L + 0.13, 2.9, 0.04, 0x8d8a83, { faces: 'NESW' });
  g.box(-L - 0.7, 2.3, -0.02, -L + 0.05, 2.85, 0.02, stripe, { faces: 'NS' });
}

/**
 * The boats. The one that moves goes from below Westminster Bridge round the
 * river's bend to the Pont d'Iéna, turns about and comes back.
 */
export function boats(k: Build): void {
  const wl = -WATER_DROP;

  // --- tied up at the south quay of the Seine, across from Notre-Dame ---
  k.b.moved(22, wl, SEINE_Z + 12.0, 0, () => riverBoat(k.b, 0x1f55b5));

  // --- under way: down the Thames, round the bend, and along the Seine as far as the bridge ---
  const g = new GeoBuilder();
  riverBoat(g, 0xc8202c);
  const boat = new THREE.Mesh(g.build(), k.mat.city());
  boat.name = 'river-boat';
  boat.castShadow = true;
  k.group.add(boat);
  // its way: a straight stretch, then the quarter circle of the bend, a little outside the river's middle line
  const cx = THAMES_X + BEND_1, cz = SEINE_Z - BEND_1, R = BEND_1 + 1.5;
  const way: [number, number][] = [[cx - R, -15]];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI - (i / 14) * (Math.PI / 2) * 0.86;
    way.push([cx + Math.cos(a) * R, cz + Math.sin(a) * R]);
  }
  const lens: number[] = [0];
  for (let i = 1; i < way.length; i++) lens.push(lens[i - 1] + Math.hypot(way[i][0] - way[i - 1][0], way[i][1] - way[i - 1][1]));
  const total = lens[lens.length - 1], pace = 3.2, rest = 4, leg = total / pace, lap = 2 * (leg + rest);
  const at = (s: number): { x: number; z: number; yaw: number } => {
    let i = 1;
    while (i < way.length - 1 && lens[i] < s) i++;
    const u = (s - lens[i - 1]) / (lens[i] - lens[i - 1]), a = way[i - 1], c = way[i];
    return { x: a[0] + (c[0] - a[0]) * u, z: a[1] + (c[1] - a[1]) * u, yaw: Math.atan2(c[1] - a[1], c[0] - a[0]) };
  };
  let t = 0, yaw = 0;
  k.each((dt) => {
    t = (t + dt) % lap;
    const back = t >= leg + rest, u = back ? t - leg - rest : t;
    const s = Math.min(u, leg) * pace, turning = Math.max(0, u - leg) / rest;
    const p = at(back ? total - s : s);
    // its bow follows its way, and at each end it swings right round
    const want = p.yaw + (back ? Math.PI : 0) + turning * Math.PI;
    const d = Math.atan2(Math.sin(want - yaw), Math.cos(want - yaw));
    yaw += d * Math.min(1, dt * 4);
    boat.position.set(p.x, wl + 0.04 * Math.sin(t * 1.4), p.z);
    boat.rotation.y = -yaw;
  });
}
