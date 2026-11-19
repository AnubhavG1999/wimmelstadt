// The shapes of plain traffic: a saloon, a hatchback, a van, a pick-up and a bus,
// each one merged geometry so that all vehicles of a kind are one draw call.
// Carried over from the look prototype. A vehicle is built with its nose towards
// +x and its wheels standing on y = 0.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

type P2 = [number, number];

// Which part of a vehicle a vertex belongs to. The shader lights lamps at night
// and lets only the paint take a vehicle's colour.
const PAINT = 0, GLASS = 1, TRIM = 2, HEAD = 3, TAIL = 4, HUB = 5;
const C_GLASS = 0x1c2733, C_TYRE = 0x17171a, C_TRIM = 0x2a2c31, C_HUB = 0xb9bcc2, C_HEAD = 0xfff4d6, C_TAIL = 0xc81e1e;

function part(g: THREE.BufferGeometry, p: number, color: number): THREE.BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  ng.computeVertexNormals();
  const n = ng.getAttribute('position').count;
  ng.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(n).fill(p), 1));
  const c = new THREE.Color(color);
  const cols = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) cols.set([c.r, c.g, c.b], i * 3);
  ng.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  if (!ng.getAttribute('uv')) ng.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  ng.clearGroups();
  return ng;
}

/** A side profile pushed out to a width: the quickest way to a car-shaped body. */
function extrude(pts: P2[], width: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false, steps: 1 });
  g.translate(0, 0, -width / 2);
  return g;
}

function box(sx: number, sy: number, sz: number, x: number, y: number, z: number): THREE.BufferGeometry {
  return new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);
}

function wheelsFor(r: number, wid: number, xs: number[]): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (const x of xs) {
    for (const side of [-1, 1]) {
      const z = side * (wid / 2 - 0.32);
      out.push(part(new THREE.CylinderGeometry(r, r, 0.85, 10).rotateX(Math.PI / 2).translate(x, r, z), TRIM, C_TYRE));
      out.push(part(new THREE.CylinderGeometry(r * 0.52, r * 0.52, 0.93, 8).rotateX(Math.PI / 2).translate(x, r, z), HUB, C_HUB));
    }
  }
  return out;
}

function lampsFor(nose: number, tail: number, yHead: number, yTail: number, wid: number): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    out.push(part(box(0.16, 0.36, 0.8, nose, yHead, side * (wid / 2 - 0.7)), HEAD, C_HEAD));
    out.push(part(box(0.16, 0.3, 0.85, tail, yTail, side * (wid / 2 - 0.7)), TAIL, C_TAIL));
  }
  return out;
}

export interface VType { name: string; geo: THREE.BufferGeometry; len: number; wid: number; wb: number; colors: number[] }

const TRAFFIC_COLORS = [0xd9d4cc, 0x9aa3ad, 0x5b6b7a, 0x2e3440, 0xb5483a, 0x4f7a6b, 0x3f6fa3, 0xd1b25a, 0xf2f0ea, 0x8b5e83, 0x6d8f9b];

/** The plain toy vehicles that make up traffic: no decals, so that a hero stands out by its detail. */
export function trafficTypes(): VType[] {
  const types: VType[] = [];

  {
    const W = 3.1;
    types.push({
      name: 'sedan', len: 7.2, wid: W, wb: 4.4, colors: TRAFFIC_COLORS,
      geo: mergeGeometries([
        part(extrude([[-3.6, 0.55], [3.5, 0.5], [3.6, 0.9], [3.45, 1.25], [1.3, 1.45], [-2.2, 1.5], [-3.6, 1.4]], W), PAINT, 0xffffff),
        part(extrude([[1.2, 1.42], [0.35, 2.2], [-1.7, 2.2], [-2.5, 1.48]], W - 0.5), GLASS, C_GLASS),
        part(box(2.15, 0.13, W - 0.6, -0.675, 2.26, 0), PAINT, 0xffffff),
        ...wheelsFor(0.98, W, [2.2, -2.2]),
        ...lampsFor(3.56, -3.58, 1.02, 1.2, W),
      ])!,
    });
  }
  {
    const W = 3.0;
    types.push({
      name: 'hatch', len: 6.2, wid: W, wb: 3.8, colors: TRAFFIC_COLORS,
      geo: mergeGeometries([
        part(extrude([[-3.1, 0.55], [3.0, 0.5], [3.1, 0.9], [2.95, 1.25], [1.2, 1.5], [-3.1, 1.55]], W), PAINT, 0xffffff),
        part(extrude([[1.1, 1.48], [0.4, 2.3], [-2.6, 2.3], [-3.0, 1.55]], W - 0.5), GLASS, C_GLASS),
        part(box(3.05, 0.13, W - 0.6, -1.1, 2.36, 0), PAINT, 0xffffff),
        ...wheelsFor(0.95, W, [1.95, -1.95]),
        ...lampsFor(3.06, -3.08, 1.02, 1.25, W),
      ])!,
    });
  }
  {
    const W = 3.2;
    types.push({
      name: 'van', len: 7.4, wid: W, wb: 4.5, colors: [0xf2f0ea, 0xd9d4cc, 0x9aa3ad, 0x3f6fa3, 0xd1b25a, 0x4f7a6b],
      geo: mergeGeometries([
        part(extrude([[-3.7, 0.55], [3.6, 0.5], [3.7, 1.0], [3.55, 1.7], [2.5, 1.85], [-3.7, 1.85]], W), PAINT, 0xffffff),
        part(extrude([[2.5, 1.85], [1.95, 2.95], [0.5, 2.95], [0.5, 1.85]], W - 0.4), GLASS, C_GLASS),
        part(box(4.2, 1.35, W, -1.6, 2.52, 0), PAINT, 0xffffff),
        part(box(1.5, 0.13, W - 0.5, 1.2, 3.02, 0), PAINT, 0xffffff),
        ...wheelsFor(1.0, W, [2.3, -2.3]),
        ...lampsFor(3.66, -3.68, 1.15, 1.4, W),
      ])!,
    });
  }
  {
    const W = 3.2;
    types.push({
      name: 'pickup', len: 7.6, wid: W, wb: 4.7, colors: TRAFFIC_COLORS,
      geo: mergeGeometries([
        part(extrude([[-3.8, 0.6], [3.7, 0.55], [3.8, 1.0], [3.65, 1.45], [1.7, 1.62], [-3.8, 1.62]], W), PAINT, 0xffffff),
        part(extrude([[1.6, 1.6], [1.0, 2.45], [-0.5, 2.45], [-0.7, 1.6]], W - 0.5), GLASS, C_GLASS),
        part(box(1.55, 0.13, W - 0.6, 0.25, 2.51, 0), PAINT, 0xffffff),
        part(box(3.0, 0.45, 0.16, -2.25, 1.84, W / 2 - 0.08), PAINT, 0xffffff),
        part(box(3.0, 0.45, 0.16, -2.25, 1.84, -W / 2 + 0.08), PAINT, 0xffffff),
        part(box(0.16, 0.45, W, -3.72, 1.84, 0), PAINT, 0xffffff),
        part(box(2.9, 0.06, W - 0.4, -2.2, 1.65, 0), TRIM, C_TRIM),
        ...wheelsFor(1.05, W, [2.35, -2.35]),
        ...lampsFor(3.76, -3.82, 1.1, 1.3, W),
      ])!,
    });
  }
  {
    // toy size: the bus is hardly longer than a car, as its diecast would be
    const W = 3.3;
    types.push({
      name: 'bus', len: 8.8, wid: W, wb: 5.2, colors: [0x4aa3a2, 0xc8523f, 0xe8c24a, 0x5676b8],
      geo: mergeGeometries([
        part(box(8.8, 1.45, W, 0, 1.275, 0), PAINT, 0xffffff),
        part(box(8.5, 1.05, W - 0.12, 0, 2.52, 0), GLASS, C_GLASS),
        part(box(8.8, 0.6, W, 0, 3.34, 0), PAINT, 0xffffff),
        part(box(0.3, 1.05, W - 0.08, -4.2, 2.52, 0), PAINT, 0xffffff),
        part(box(0.25, 1.05, W - 0.08, -1.2, 2.52, 0), PAINT, 0xffffff),
        part(box(0.25, 1.05, W - 0.08, 1.6, 2.52, 0), PAINT, 0xffffff),
        ...wheelsFor(1.05, W, [2.7, -2.7]),
        ...lampsFor(4.42, -4.42, 1.0, 1.2, W),
      ])!,
    });
  }
  return types;
}
