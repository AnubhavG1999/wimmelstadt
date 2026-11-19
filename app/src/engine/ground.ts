// The ground of a tile that is not a grid of streets drawn by one material: a
// board of paving with holes for water, patches of lawn or sand on it, water in
// the holes, and hills built up in levels like a model of contour lines.
//
// Every shape here is a list of corners, [x, z], in order round its edge. It
// may be any outline that does not cross itself.

import * as THREE from 'three';
import type { GeoBuilder, V3, WinSpec } from './geo';
import { makeWaterMaterial } from './look/materials';
import type { Path } from './paths';
import { TILE, type Build } from './tile';

export type P2 = [number, number];

/** What the street material is told about a strip of plain paving. */
const PAVING: WinSpec = { cell: 0, storey: 1, lit: 0, kind: 1 };

/** A rectangle, as a shape. */
export const rect = (x0: number, z0: number, x1: number, z1: number): P2[] => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

/** A circle, or an oval if `rz` is given, as a shape with `sides` corners. */
export function oval(cx: number, cz: number, rx: number, rz = rx, sides = 24): P2[] {
  return Array.from({ length: sides }, (_, i): P2 => [cx + Math.cos((i / sides) * Math.PI * 2) * rx, cz + Math.sin((i / sides) * Math.PI * 2) * rz]);
}

/**
 * A band `half` wide to either side of a path, as a shape: a river, a canal, a
 * strip of park. `half` may be a number, or say how wide the band is at each
 * place along the path, for a river that widens and narrows as it goes.
 */
export function band(path: Path, half: number | ((s: number) => number), step = 4): P2[] {
  const n = Math.max(1, Math.ceil(path.length / step));
  const p = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  const left: P2[] = [], right: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * path.length;
    path.at(s, p);
    path.at(Math.min(path.length, s + 0.6), a);
    path.at(Math.max(0, s - 0.6), b);
    const tx = a.x - b.x, tz = a.z - b.z, l = Math.hypot(tx, tz) || 1;
    const h = typeof half === 'number' ? half : half(s);
    left.push([p.x + (tz / l) * h, p.z - (tx / l) * h]);
    right.push([p.x - (tz / l) * h, p.z + (tx / l) * h]);
  }
  return [...left, ...right.reverse()];
}

/**
 * A shape cut off a hair inside the edge of the board: for a hill, a lawn or a
 * stretch of water that is laid out at an angle and would run off the tile.
 */
export function onBoard(shape: P2[], inset = 0.2): P2[] {
  const X = TILE.x1 - inset, Z = TILE.z1 - inset;
  const cutX = (x: number) => (a: P2, b: P2): P2 => [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])];
  const cutZ = (z: number) => (a: P2, b: P2): P2 => [a[0] + ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]), z];
  const edges: [(p: P2) => boolean, (a: P2, b: P2) => P2][] = [
    [(p) => p[0] <= X, cutX(X)], [(p) => p[0] >= -X, cutX(-X)], [(p) => p[1] <= Z, cutZ(Z)], [(p) => p[1] >= -Z, cutZ(-Z)],
  ];
  let out = shape;
  for (const [inside, cut] of edges) {
    const src = out;
    out = [];
    src.forEach((p, i) => {
      const q = src[(i + 1) % src.length];
      if (inside(p)) out.push(p);
      if (inside(p) !== inside(q)) out.push(cut(p, q));
    });
  }
  return out;
}

/** Twice the area of a shape: positive if its corners run clockwise as seen from above. */
function turnOf(shape: P2[]): number {
  let a = 0;
  shape.forEach((p, i) => {
    const q = shape[(i + 1) % shape.length];
    a += p[0] * q[1] - q[0] * p[1];
  });
  return a;
}

/** Fills a shape with triangles that face the sky, at height `y`. */
export function flat(b: GeoBuilder, shape: P2[], y: number, color: number, o: { win?: WinSpec; holes?: P2[][] } = {}): void {
  const v2 = (s: P2[]): THREE.Vector2[] => s.map((p) => new THREE.Vector2(p[0], p[1]));
  const holes = o.holes ?? [];
  const all = [...shape, ...holes.flat()];
  for (const [i, j, l] of THREE.ShapeUtils.triangulateShape(v2(shape), holes.map(v2))) {
    const at = (n: number): V3 => [all[n][0], y, all[n][1]];
    b.up(at(i), at(j), at(l), color, { win: o.win });
  }
}

/** Upright walls round a shape, from `y0` to `y1`, that face outwards, or inwards if `inward` is set. */
export function walls(b: GeoBuilder, shape: P2[], y0: number, y1: number, color: number, o: { win?: WinSpec; seed?: number; inward?: boolean } = {}): void {
  const out = (turnOf(shape) > 0 ? 1 : -1) * (o.inward ? -1 : 1);
  shape.forEach((p, i) => {
    const q = shape[(i + 1) % shape.length];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    // for corners that run clockwise, outwards is to the left of the way round
    const nx = ((q[1] - p[1]) / len) * out, nz = (-(q[0] - p[0]) / len) * out;
    b.quad([p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], [nx, 0, nz], color, { win: o.win, seed: o.seed, L: len });
  });
}

/**
 * The tile's ground: the whole board as paving, with a hole wherever there is
 * water. Call it once. A tile whose ground is drawn by a material of its own,
 * as North America's is, does not call it at all.
 */
export function ground(k: Build, o: { color?: number; holes?: P2[][] } = {}): void {
  const r = k.board;
  flat(k.street, rect(r.x0, r.z0, r.x1, r.z1), 0, o.color ?? 0xb3ab9c, { win: PAVING, holes: o.holes });
}

/** A patch of the ground in a colour of its own: a lawn, a square, a beach, a car park. */
export function area(k: Build, shape: P2[], color: number, y = 0.02): void {
  flat(k.street, shape, y, color, { win: PAVING });
}

export const LAWN = 0x6fa85a, SAND = 0xe3d3a4, PLAZA = 0xd8d2c4;

export interface WaterOpts {
  /** How far below the ground its surface lies. */
  drop?: number;
  color?: number;
  /** The colour of the wall round it. */
  quay?: number;
}

/**
 * Water: a pond, a river, a canal, a harbour. The ground needs a hole of the
 * same shape, or the water is under the paving. A shape may run to the edge of
 * the board, where the water then ends at the tile's base.
 */
export function water(k: Build, shape: P2[], o: WaterOpts = {}): void {
  const level = -(o.drop ?? 0.9);
  const v2 = shape.map((p) => new THREE.Vector2(p[0], p[1]));
  const pos: number[] = [];
  for (const tri of THREE.ShapeUtils.triangulateShape(v2, [])) {
    // wound so that the surface faces the sky
    const [a, b, c] = tri.map((n) => shape[n]);
    const over = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
    for (const p of over >= 0 ? [a, b, c] : [a, c, b]) pos.push(p[0], level, p[1]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, makeWaterMaterial(k.look, o.color ?? 0x5f9fc4));
  mesh.receiveShadow = true;
  mesh.layers.set(1); // it mirrors the city, so it is left out of the mirror image itself
  k.group.add(mesh);
  k.mirrors = true;
  // the wall round it, from below the surface up to the ground
  walls(k.b, shape, level - 0.6, 0, o.quay ?? 0xa9a59a, { inward: true });
}

export interface TerraceOpts {
  /** The colour of its top, and of its sides. */
  top?: number;
  side?: number;
}

/**
 * One level of a hill: a slab from `y0` up to `y1` with upright sides. A hill
 * is several of these, each smaller than the one below, like the layers of a
 * model made from a map's contour lines. Things stand on a level at its `y1`.
 */
export function terrace(k: Build, shape: P2[], y0: number, y1: number, o: TerraceOpts = {}): void {
  flat(k.b, shape, y1, o.top ?? LAWN);
  walls(k.b, shape, y0, y1, o.side ?? 0x9a8f7c);
}
