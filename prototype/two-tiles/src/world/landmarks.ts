// The things on a tile that have their finished model. Each is built from the
// models in landmark-models.ts and downtown-models.ts and stood where the
// tile's plan says, in the tile's own units.

import * as THREE from 'three';
import type { P, Thing, TilePlan } from '../city/plan.ts';
import { GeoBuilder } from '../look/geo.ts';
import * as D from './downtown-models.ts';
import type { Ground } from './ground.ts';
import * as L from './landmark-models.ts';

/** One part of a model, and where it stands from the model's middle. */
interface Piece { build: (ctx: L.LandmarkCtx) => void; dx?: number; dz?: number }

/** How wide the road over a bridge is, for the bridges that are models. */
const BRIDGE_ROAD = 7;

const MODELS: Record<string, (t: Thing) => Piece[]> = {
  halo: () => [{ build: D.haloTower }],
  'gate-tower': () => [{ build: D.gateTower }],
  showroom: () => [{ build: D.showroom }],
  'car-park': () => [{ build: D.carPark }],
  sears: () => [{ build: (c) => L.sears(L.lot(21, 21, 140), c) }],
  'twin-towers': () => [
    { build: (c) => L.twinTower(L.lot(13, 13, 128, -5, -7.5), c, true) },
    { build: (c) => L.twinTower(L.lot(13, 13, 128, 5, 7.5), c, false) },
  ],
  'empire-state': () => [{ build: (c) => L.empire(L.lot(14, 22, 112), c) }],
  liberty: () => [{ build: (c) => L.liberty(L.lot(14, 14, 30), c) }],
  'gateway-arch': () => [{ build: L.gatewayArch }],
  // a bridge is as long as the water it crosses, and is built along it
  'golden-gate': (t) => [{ build: (c) => D.goldenGate(c, span(t), BRIDGE_ROAD / 2, 0) }],
};

const span = (t: Thing): number => (t.span ? Math.hypot(t.span[1][0] - t.span[0][0], t.span[1][1] - t.span[0][1]) : 40);

/** A lamp that glows by itself, already in its place on the tile. */
export interface Lamp { at: THREE.Matrix4; color: string }

export interface Landmarks {
  group: THREE.Group;
  lamps: Lamp[];
  /** The ring of light round Halo Tower, if this tile has it. Its colour changes with the hour. */
  halo: THREE.MeshBasicMaterial | null;
  triangles: number;
}

export function buildLandmarks(plan: TilePlan, ground: Ground, material: THREE.Material): Landmarks {
  const group = new THREE.Group();
  group.name = `${plan.id}: landmarks`;
  const lamps: Lamp[] = [];
  let halo: THREE.MeshBasicMaterial | null = null, triangles = 0;

  for (const t of plan.things) {
    const pieces = t.model ? MODELS[t.model]?.(t) : undefined;
    if (!pieces) continue;
    // a bridge stands across its water; anything else stands on the ground at its place
    let at: P = t.at, y = Math.max(ground.heightAt(t.at[0], t.at[1]), 0) + 0.04, turn = THREE.MathUtils.degToRad(t.turn ?? 0);
    if (t.span) {
      const [a, b] = t.span;
      at = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      y = 0;
      turn = -Math.atan2(b[0] - a[0], b[1] - a[1]);
    }
    const scale = t.scale ?? 1;
    const holder = new THREE.Group();
    holder.name = t.id;
    holder.position.set(at[0], y, at[1]);
    holder.rotation.y = -turn;
    holder.scale.setScalar(scale);
    holder.updateMatrix();
    for (const piece of pieces) {
      const b = new GeoBuilder();
      const ctx: L.LandmarkCtx = { b, glows: [], lights: [] };
      piece.build(ctx);
      triangles += b.triangles;
      const mesh = new THREE.Mesh(b.build(), material);
      mesh.position.set(piece.dx ?? 0, 0, piece.dz ?? 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.updateMatrix();
      holder.add(mesh);
      for (const g of ctx.glows) {
        const local = new THREE.Matrix4().compose(new THREE.Vector3(g.x, g.y, g.z), new THREE.Quaternion(), new THREE.Vector3(g.sx, g.sy, g.sz));
        lamps.push({ at: local.premultiply(mesh.matrix).premultiply(holder.matrix), color: g.color });
      }
    }
    if (t.model === 'halo') {
      halo = new THREE.MeshBasicMaterial({ color: 0xff3d9a, toneMapped: false });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(D.HALO.haloR, 0.85, 6, 44), halo);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = D.HALO.haloY;
      holder.add(ring);
    }
    group.add(holder);
  }
  return { group, lamps, halo, triangles };
}
