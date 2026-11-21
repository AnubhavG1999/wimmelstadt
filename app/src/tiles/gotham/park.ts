// Robinson Park: Finger Castle on its knoll, the reservoir, the Botanical Garden, the gates and the statues.
//
// The comics give the park as the city's largest, with Finger Castle by a lake
// from which the whole park can be seen, a reservoir that is a skating rink in
// winter, an Alice in Wonderland statue near the gates, a soldier on horseback
// near a gate, and the Forum of the Twelve Caesars at its north end; Poison Ivy
// held it in No Man's Land, and later stories put her at the Botanical
// Gardens. None of their looks is given: the castle is a small grey folly, the
// glasshouse iron and glass lit green-gold, the statues this tile's own.

import * as THREE from 'three';
import { interior, rng, type GeoBuilder, type V3 } from '../../engine/geo';
import { flat, oval, walls, type P2 } from '../../engine/ground';
import { makeWaterMaterial } from '../../engine/look/materials';
import { hip, face3 } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { lathe } from '../../engine/parts';
import { landAt } from './land';
import { BRASS, DARK, LOOP_WIN, SLATE, STONE_TRIM, TIMBER, gasLamp, nameBoard, nameSign } from './look';
import type { Model, Place } from './models';
import { KNOLL, STAGES, lotOf, type Lot } from './plan';
import { ceilingAt, open, underBoards } from './space';


const OWN = ['park', 'finger-castle', 'botanical'];
const VX = 0.669, VZ = 0.743;

/** The castle's grey stone, paler than Old Gotham's, and the park's own colours. */
const CASTLE = 0x6f727a, CASTLE_TRIM = 0x8a8d94, CASTLE_DARK = 0x55585f;
const PATH = 0x7d776c, KERB = 0x8a8d94, BED = 0x4a3c30, MARBLE = 0xb8b4aa, BRONZE = 0x8a7a55, BRONZE_DARK = 0x6a6450;
const RAIL = 0x8a9099;
const GH_WALL = 0x8fae86, GH_ROOF = 0x9fc28a, GH_IRON = 0xa3abb5, GREEN_GOLD = '#d8e87a';
const POND = 0x3a5d70;

// ---------------------------------------------------------------------------
// The layout, from the lots
// ---------------------------------------------------------------------------

function layout() {
  const P = lotOf('park'), C = lotOf('finger-castle'), G = lotOf('botanical');
  const gz = (P.z0 + P.z1) / 2 + 1;
  const pond = { c: [P.x0 + 13, P.z1 - 8] as P2, r: 6 };
  const forum = { c: [P.x0 + 3.6, P.z0 + 5.4] as P2, r: 2.9 };
  const alice: P2 = [P.x1 - 3.2, gz - 3.4], soldier: P2 = [P.x1 - 4.5, gz + 3.2];
  const tower = { c: [C.x1 - 3.4, C.z1 - 3.4] as P2, r: 2.6, top: C.top - 1 };
  const gh = { cx: G.x0 + 6, cz: (G.z0 + G.z1) / 2 };
  const paths: { pts: P2[]; half: number }[] = [
    { pts: [[P.x1 + 0.3, gz], [-68, gz - 0.5], [-74, gz - 2.3], [-78, gz - 2.8]], half: 0.75 },
    { pts: [[-68, gz - 0.5], [-72, gz + 3], [-80, gz + 3.8], [-84.6, gz + 7.5]], half: 0.7 },
    { pts: [[-78, gz - 2.8], [-82.5, gz + 1.8], [-86.5, gz + 3.4], [-96, gz + 1], [-99, gz - 3.5], [-100.5, gz - 9], [forum.c[0], forum.c[1] + 3.3]], half: 0.7 },
    { pts: [[P.x1 - 1, gz + 0.4], [P.x1 - 1, P.z1 - 1.2], [-84.5, P.z1 - 1.2]], half: 0.6 },
  ];
  return { P, C, G, gz, pond, forum, alice, soldier, tower, gh, paths };
}

const L = layout();

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

/** A path of gravel along a line of corners, a hair over the lawn, with a round patch at every bend. */
function path(k: Build, pts: P2[], half: number, y = 0.06): void {
  const W = { win: { cell: 0, storey: 1, lit: 0, kind: 1 } };
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], l = Math.hypot(bx - ax, bz - az) || 1, nx = (-(bz - az) / l) * half, nz = ((bx - ax) / l) * half;
    flat(k.street, [[ax - nx, az - nz], [bx - nx, bz - nz], [bx + nx, bz + nz], [ax + nx, az + nz]], y, PATH, W);
    if (i > 0) flat(k.street, oval(ax, az, half, half, 8), y, PATH, W);
  }
}

const segDist = (x: number, z: number, a: P2, b: P2): number => {
  const vx = b[0] - a[0], vz = b[1] - a[1], l = vx * vx + vz * vz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l));
  return Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t);
};
const toPath = (x: number, z: number): number => Math.min(...L.paths.flatMap((p) => p.pts.slice(1).map((q, i) => segDist(x, z, p.pts[i], q) - p.half)));

/** Whether a thing at a place would stand before a box, as the opening view sees it, within `reach`. */
function before(x: number, z: number, box: { x0: number; z0: number; x1: number; z1: number }, reach: number): boolean {
  for (let t = 0; t <= reach; t += 0.7) {
    const px = x - VX * t, pz = z - VZ * t;
    if (px > box.x0 && px < box.x1 && pz > box.z0 && pz < box.z1) return true;
  }
  return false;
}

const LAWN_STAGE = STAGES.parkLawn;

/** Whether a tall thing (a tree, a lamp) may stand at a place in the park. */
function roomFor(x: number, z: number, r: number, h: number): boolean {
  const { P, C, G, pond, forum, alice, soldier } = L;
  if (x < P.x0 + 1 || x > P.x1 - 2.4 || z < P.z0 + 1 || z > P.z1 - 0.8) return false;
  const grow = (b: Lot | typeof LAWN_STAGE, m: number) => ({ x0: b.x0 - m, z0: b.z0 - m, x1: b.x1 + m, z1: b.z1 + m });
  for (const [b, m, reach] of [[LAWN_STAGE, 1, 14], [C, 1.2, 10], [G, 1.2, 7]] as const) {
    const g = grow(b, m);
    if (x > g.x0 && x < g.x1 && z > g.z0 && z < g.z1) return false;
    if (h > 2.2 && before(x, z, b, reach)) return false;
  }
  if (Math.hypot(x - pond.c[0], z - pond.c[1]) < pond.r + 1.4 + r) return false;
  if (Math.hypot(x - forum.c[0], z - forum.c[1]) < forum.r + 1.8 + r) return false;
  if (Math.hypot(x - alice[0], z - alice[1]) < 2 + r || Math.hypot(x - soldier[0], z - soldier[1]) < 2.6 + r) return false;
  if (toPath(x, z) < 0.6 + r) return false;
  const y = landAt(x, z);
  if (y + h > ceilingAt(x, z) || h > underBoards(x, z)) return false;
  return true;
}

/** A sign on a thin dark board on a wall. */
function plaque(k: Build, id: string, x: number, y: number, z: number, nx: number, nz: number, h: number, maxW: number): void {
  const w = k.sign(id, x + nx * 0.13, y, z + nz * 0.13, nx, nz, h, maxW);
  k.b.obox(x + nx * 0.06, y, z + nz * 0.06, 0.04, h / 2 + 0.08, w / 2 + 0.1, Math.atan2(nz, nx), DARK);
}

// ---------------------------------------------------------------------------
// The park's own things
// ---------------------------------------------------------------------------

/** The reservoir: a round pond in a stone kerb, its water a little above the lawn. */
function reservoir(k: Build): void {
  const { c, r } = L.pond, outer = oval(c[0], c[1], r + 0.4, r + 0.4, 24), inner = oval(c[0], c[1], r, r, 24);
  walls(k.b, outer, 0, 0.45, KERB);
  flat(k.b, outer, 0.45, STONE_TRIM, { holes: [inner] });
  walls(k.b, inner, 0.15, 0.45, KERB, { inward: true });
  const pos: number[] = [];
  for (let i = 0; i < inner.length; i++) {
    const a = inner[i], b = inner[(i + 1) % inner.length];
    pos.push(c[0], 0.3, c[1], b[0], 0.3, b[1], a[0], 0.3, a[1]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  if (geo.attributes.normal.getY(0) < 0) {
    for (let i = 0; i < pos.length; i += 9) for (let j = 0; j < 3; j++) { const t = pos[i + 3 + j]; pos[i + 3 + j] = pos[i + 6 + j]; pos[i + 6 + j] = t; }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
  }
  const mesh = new THREE.Mesh(geo, makeWaterMaterial(k.look, POND));
  mesh.receiveShadow = true;
  mesh.layers.set(1);
  k.group.add(mesh);
  k.mirrors = true;
}

/** The Alice statue near the gates: Alice beside a great mushroom, and the White Rabbit, in bronze on a round plinth. */
function alice(b: GeoBuilder, x: number, z: number): void {
  b.cyl(x, z, 0, 0.55, 0.85, 0.8, 10, STONE_TRIM);
  b.cyl(x + 0.35, z - 0.25, 0.55, 1.3, 0.16, 0.2, 6, BRONZE, { cap: false });
  lathe(b, x + 0.35, z - 0.25, [[0.7, 1.25], [0.68, 1.42], [0.45, 1.6], [0.1, 1.68]], 8, BRONZE);
  const ax = x - 0.3, az = z + 0.15;
  b.cyl(ax, az, 0.55, 1.15, 0.42, 0.2, 6, BRONZE);
  b.box(ax - 0.18, 1.15, az - 0.13, ax + 0.18, 1.52, az + 0.13, BRONZE);
  b.box(ax - 0.15, 1.52, az - 0.15, ax + 0.15, 1.82, az + 0.15, BRONZE);
  b.box(ax - 0.17, 1.5, az - 0.19, ax + 0.17, 1.86, az - 0.08, BRONZE_DARK);
  for (const s of [-1, 1]) b.beam([ax + s * 0.2, 1.48, az], [ax + s * 0.32, 1.05, az + 0.05], 0.05, 0.04, BRONZE);
  const rx = x + 0.45, rz = z + 0.45;
  b.box(rx - 0.14, 0.55, rz - 0.12, rx + 0.14, 0.9, rz + 0.12, BRONZE);
  b.box(rx - 0.1, 0.9, rz - 0.1, rx + 0.1, 1.1, rz + 0.1, BRONZE);
  for (const s of [-1, 1]) b.beam([rx + s * 0.05, 1.08, rz], [rx + s * 0.08, 1.4, rz - 0.03], 0.035, 0.02, BRONZE);
}

/** A soldier on horseback on a tall plinth, facing east, his hat raised. */
function rider(b: GeoBuilder, x: number, z: number): void {
  const C = BRONZE_DARK;
  b.box(x - 1.5, 0, z - 0.75, x + 1.5, 1.6, z + 0.75, STONE_TRIM);
  b.box(x - 1.62, 1.6, z - 0.87, x + 1.62, 1.75, z + 0.87, KERB);
  const y = 1.75;
  for (const [lx, lz] of [[-0.6, -0.2], [-0.6, 0.2], [0.6, 0.2]]) b.beam([x + lx, y, z + lz], [x + lx, y + 0.8, z + lz], 0.08, 0.08, C);
  b.beam([x + 0.6, y + 0.8, z - 0.2], [x + 0.95, y + 0.45, z - 0.2], 0.08, 0.07, C);
  b.box(x - 0.8, y + 0.75, z - 0.28, x + 0.75, y + 1.4, z + 0.28, C);
  b.beam([x + 0.6, y + 1.25, z], [x + 1.0, y + 1.85, z], 0.17, 0.14, C);
  b.box(x + 0.95, y + 1.6, z - 0.14, x + 1.42, y + 1.95, z + 0.14, C);
  b.beam([x - 0.8, y + 1.25, z], [x - 1.1, y + 0.65, z], 0.08, 0.04, C);
  b.box(x - 0.2, y + 1.1, z - 0.34, x + 0.2, y + 1.45, z + 0.34, C);
  b.box(x - 0.15, y + 1.4, z - 0.2, x + 0.18, y + 2.1, z + 0.2, C);
  b.box(x - 0.12, y + 2.1, z - 0.12, x + 0.14, y + 2.38, z + 0.12, C);
  b.beam([x + 0.05, y + 1.95, z - 0.2], [x + 0.3, y + 2.55, z - 0.3], 0.05, 0.05, C);
  b.cyl(x + 0.3, z - 0.3, y + 2.55, y + 2.68, 0.25, 0.22, 3, C);
}

/** The Forum of the Twelve Caesars: twelve busts on columns in a ring, on a round floor. */
function forum(k: Build): void {
  const b = k.b, { c, r } = L.forum;
  flat(k.street, oval(c[0], c[1], r + 0.5, r + 0.5, 16), 0.06, 0x9a958a, { win: { cell: 0, storey: 1, lit: 0, kind: 1 } });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, px = c[0] + Math.cos(a) * r, pz = c[1] + Math.sin(a) * r, y = 0.06;
    b.box(px - 0.18, y, pz - 0.18, px + 0.18, y + 1.25, pz + 0.18, MARBLE);
    b.box(px - 0.26, y + 1.25, pz - 0.26, px + 0.26, y + 1.38, pz + 0.26, MARBLE, { faces: 'NESWTB' });
    b.obox(px, y + 1.5, pz, 0.12, 0.12, 0.23, a, MARBLE);
    b.box(px - 0.11, y + 1.62, pz - 0.11, px + 0.11, y + 1.9, pz + 0.11, MARBLE);
  }
}

/** The iron railing along the park's east side, the gate piers, the open gates and the arch over them. */
function gates(k: Build): void {
  const b = k.b, { P, gz } = L, x = P.x1 - 0.15;
  for (const [z0, z1] of [[P.z0 + 0.4, gz - 2.1], [gz + 2.1, P.z1 - 0.2]]) {
    b.box(x - 0.2, 0, z0, x + 0.2, 0.45, z1, KERB);
    for (const y of [0.85, 1.35]) b.beam([x, y, z0], [x, y, z1], 0.04, 0.04, RAIL);
    for (let z = z0 + 0.5; z < z1; z += 2.5) b.box(x - 0.05, 0.45, z - 0.05, x + 0.05, 1.55, z + 0.05, RAIL, { faces: 'NESWT' });
  }
  for (const s of [-1, 1]) {
    const pz = gz + s * 1.65;
    b.box(x - 0.45, 0, pz - 0.45, x + 0.45, 2.6, pz + 0.45, STONE_TRIM);
    b.box(x - 0.55, 2.6, pz - 0.55, x + 0.55, 2.8, pz + 0.55, KERB, { faces: 'NESWTB' });
    b.cyl(x, pz, 2.8, 3.25, 0.25, 0.08, 6, KERB);
    // the leaf, swung open into the park
    const hz = gz + s * 1.15, ex = x - 1.15, ez = hz - s * 0.3;
    for (const y of [0.3, 2.0]) b.beam([x, y, hz], [ex, y, ez], 0.045, 0.045, RAIL);
    for (let j = 0; j <= 4; j++) { const t = j / 4; b.beam([x + (ex - x) * t, 0.3, hz + (ez - hz) * t], [x + (ex - x) * t, 2.0 + 0.25 * Math.sin(t * Math.PI), hz + (ez - hz) * t], 0.03, 0.03, RAIL); }
  }
  const arch: V3[] = Array.from({ length: 7 }, (_, j): V3 => { const a = Math.PI * (j / 6); return [x, 2.75 + Math.sin(a) * 0.8, gz - Math.cos(a) * 1.2]; });
  b.sweep(arch, arch.map(() => 0.06), RAIL);
  k.glows.push({ x, y: 3.2, z: gz, sx: 0.3, sy: 0.4, sz: 0.3, color: '#ffcf7a' });
  k.lights.push({ x: x + 1, z: gz, r: 9, color: '#ffcf7a', k: 0.45 });
}

/** A bench along a path. */
function bench(b: GeoBuilder, x: number, z: number, yaw: number): void {
  b.obox(x, 0.47, z, 0.9, 0.05, 0.25, yaw, TIMBER, { faces: 'B' });
  b.obox(x - Math.sin(yaw) * 0.22, 0.8, z + Math.cos(yaw) * 0.22, 0.9, 0.25, 0.04, yaw, TIMBER);
  for (const s of [-1, 1]) b.obox(x + Math.cos(yaw) * s * 0.75, 0.21, z + Math.sin(yaw) * s * 0.75, 0.05, 0.21, 0.22, yaw, 0x3c4047);
}

const park: Model = (k) => {
  const b = k.b, { P, C, gz, paths, alice: A, soldier: S } = L;
  for (const p of paths) path(k, p.pts, p.half);
  reservoir(k);
  alice(b, A[0], A[1]);
  rider(b, S[0], S[1]);
  forum(k);
  gates(k);
  // the names: the park's on a board at the gates, the castle's at the foot of its knoll
  nameBoard(k, 'park-robinson-park', P.x1 + 2.6, gz + 4.4, 0);
  nameBoard(k, 'park-finger-castle', C.x1 + 2.4, C.z1 + 2.4, landAt(C.x1 + 2.4, C.z1 + 2.4));

  // lamps along the paths, benches beside some of them
  const r = rng(0x9a4c);
  let n = 0;
  for (const p of paths) {
    for (let i = 1; i < p.pts.length; i++) {
      const [ax, az] = p.pts[i - 1], [bx, bz] = p.pts[i], l = Math.hypot(bx - ax, bz - az) || 1, side = n++ % 2 ? 1 : -1;
      const mx = (ax + bx) / 2 + (-(bz - az) / l) * side * (p.half + 0.6), mz = (az + bz) / 2 + ((bx - ax) / l) * side * (p.half + 0.6);
      if (l > 4 && roomFor(mx, mz, 0.2, 3)) gasLamp(k, mx, landAt(mx, mz) + 2.8, mz, 2.8);
      const cx = (ax + bx) / 2 + (-(bz - az) / l) * -side * (p.half + 0.5), cz = (az + bz) / 2 + ((bx - ax) / l) * -side * (p.half + 0.5);
      if (l > 6 && r() < 0.6 && roomFor(cx, cz, 0.6, 1)) bench(b, cx, cz, Math.atan2(bz - az, bx - ax));
    }
  }
  // people strolling
  for (let i = 0, put = 0; i < 60 && put < 8; i++) {
    const p = paths[Math.floor(r() * paths.length)], j = Math.floor(r() * (p.pts.length - 1)), t = r();
    const x = p.pts[j][0] + (p.pts[j + 1][0] - p.pts[j][0]) * t, z = p.pts[j][1] + (p.pts[j + 1][1] - p.pts[j][1]) * t;
    if (!open(x, z, 0.4, OWN) || Math.hypot(x - A[0], z - A[1]) < 2) continue;
    k.person(x, z, 0.06);
    put++;
  }
  // the trees: many and dark, some tall, kept off the lawn's stage and from before the castle and the glasshouse
  const tr = rng(0x7ee5), trees: [number, number][] = [];
  for (let i = 0; i < 900 && trees.length < 70; i++) {
    const x = P.x0 + 1 + tr() * (P.x1 - P.x0 - 3), z = P.z0 + 1 + tr() * (P.z1 - P.z0 - 2);
    const tall = tr() < 0.3, s = tall ? 0.8 + tr() * 0.3 : 0.5 + tr() * 0.32, h = tall ? s * 9 : s * 7.2, rr = tall ? s * 1.2 : s * 2.4;
    if (!roomFor(x, z, rr * 0.7, h)) continue;
    if (Math.hypot(x - KNOLL.c[0], z - KNOLL.c[1]) < 6.5) continue;
    if (trees.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 2.6)) continue;
    trees.push([x, z]);
    k.tree(x, z, s, tall, landAt(x, z));
  }
  k.lights.push({ x: L.pond.c[0], z: L.pond.c[1], r: 10, color: '#9ad0ff', k: 0.25 });
};

// ---------------------------------------------------------------------------
// Finger Castle
// ---------------------------------------------------------------------------

const fingerCastle: Model = (k, l) => {
  const b = k.b, { c, r } = L.tower, [tx, tz] = c, deck = L.tower.top;
  // the tower: a battered foot, a round body with arrow loops, a corbelled top, flat, with battlements
  let g = Infinity;
  for (let i = 0; i < 12; i++) g = Math.min(g, landAt(tx + Math.cos(i * 0.52) * (r + 0.4), tz + Math.sin(i * 0.52) * (r + 0.4)));
  b.cyl(tx, tz, g - 0.4, 8, r + 0.35, r + 0.05, 12, CASTLE_DARK, { cap: false });
  b.cyl(tx, tz, 8, deck - 0.5, r, r, 12, CASTLE, { win: LOOP_WIN, seed: 2.3, cap: false });
  b.cyl(tx, tz, deck - 0.5, deck, r, r + 0.25, 12, CASTLE_TRIM, { cap: 0x5c6068 });
  for (let m = 0; m < 8; m++) {
    const a = (m / 8) * Math.PI * 2 + 0.2;
    b.obox(tx + Math.cos(a) * (r + 0.05), deck + 0.42, tz + Math.sin(a) * (r + 0.05), 0.17, 0.42, 0.42, a, CASTLE_TRIM);
  }
  // the hall beside it, lower, with battlements, a slate roof and a bartizan at its north-west corner
  const x0 = l.x0 + 0.5, x1 = tx - 1.2, z0 = l.z0 + 0.8, z1 = l.z1 - 1.8;
  let hg = Infinity;
  for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) hg = Math.min(hg, landAt(x, z));
  b.box(x0 - 0.15, hg - 0.4, z0 - 0.15, x1 + 0.15, 8, z1 + 0.15, CASTLE_DARK);
  b.box(x0, 8, z0, x1, 12, z1, CASTLE, { win: LOOP_WIN, seed: 4.1 });
  b.box(x0 - 0.12, 11.8, z0 - 0.12, x1 + 0.12, 12.05, z1 + 0.12, CASTLE_TRIM, { faces: 'NESWTB' });
  hip(b, x0 + 0.45, z0 + 0.45, x1 - 0.45, z1 - 0.45, 12.05, 1.6, SLATE, 0);
  const merlon = (x: number, z: number, along: 'x' | 'z'): void => {
    const hx = along === 'x' ? 0.3 : 0.15, hz = along === 'x' ? 0.15 : 0.3;
    b.box(x - hx, 12.05, z - hz, x + hx, 12.75, z + hz, CASTLE_TRIM);
  };
  for (let x = x0 + 0.5; x < x1 - 0.2; x += 1.2) { merlon(x, z0 + 0.03, 'x'); merlon(x, z1 - 0.03, 'x'); }
  for (let z = z0 + 1.0; z < z1 - 0.6; z += 1.2) merlon(x0 + 0.03, z, 'z');
  b.cyl(x0, z0, 9.0, 9.6, 0.15, 0.85, 8, CASTLE_TRIM, { cap: false });
  b.cyl(x0, z0, 9.6, 13.2, 0.85, 0.85, 8, CASTLE, { cap: false });
  b.cyl(x0, z0, 13.2, 15.2, 1.0, 0.04, 8, SLATE, { cap: false });
  // the door, in the hall's west end, up a step from the knoll
  const dz = (z0 + z1) / 2, dy = landAt(x0 - 0.5, dz);
  b.box(x0 - 0.8, hg - 0.4, dz - 0.8, x0 - 0.15, dy + 0.2, dz + 0.8, CASTLE_TRIM);
  b.quad([x0 - 0.18, dy + 0.2, dz + 0.55], [x0 - 0.18, dy + 0.2, dz - 0.55], [x0 - 0.18, dy + 2.0, dz - 0.55], [x0 - 0.18, dy + 2.0, dz + 0.55], [-1, 0, 0], 0x2a2018, { win: interior(1.5) });
  face3(b, [x0 - 0.18, dy + 2.0, dz - 0.55], [x0 - 0.18, dy + 2.0, dz + 0.55], [x0 - 0.18, dy + 2.6, dz], [-1, 0, 0], 0x2a2018, { win: interior(1.5) });
  k.glows.push({ x: x0 - 0.35, y: dy + 2.8, z: dz, sx: 0.25, sy: 0.3, sz: 0.25, color: '#ffcf7a' });
  k.lights.push({ x: tx + 3, z: tz + 3, r: 12, color: '#ffcf7a', k: 0.4 });
  k.lights.push({ x: x0 - 2, z: dz, r: 8, color: '#ffcf7a', k: 0.35 });
};

// ---------------------------------------------------------------------------
// The Botanical Garden
// ---------------------------------------------------------------------------

const botanical: Model = (k, l) => {
  const b = k.b, { cx, cz } = L.gh, W = { win: { cell: 0, storey: 1, lit: 0, kind: 1 } };
  const glass = interior(1.3), roofGlass = interior(1.7);
  // the middle pavilion: glass walls on iron, a cornice, and a glass dome with a lantern
  const h = 3, wall = 4;
  b.box(cx - h, 0, cz - h, cx + h, wall, cz + h, GH_WALL, { win: glass, faces: 'NESW' });
  b.box(cx - h - 0.12, wall, cz - h - 0.12, cx + h + 0.12, wall + 0.3, cz + h + 0.12, GH_IRON, { faces: 'NESWTB' });
  b.box(cx - h - 0.05, 2.1, cz - h - 0.05, cx + h + 0.05, 2.25, cz + h + 0.05, GH_IRON, { faces: 'NESW' });
  for (let u = -1.5; u <= 1.5; u += 1.5) {
    for (const s of [-1, 1]) {
      b.box(cx + u - 0.06, 0, cz + s * h - 0.06, cx + u + 0.06, wall, cz + s * h + 0.06, GH_IRON, { faces: 'NESW' });
      b.box(cx + s * h - 0.06, 0, cz + u - 0.06, cx + s * h + 0.06, wall, cz + u + 0.06, GH_IRON, { faces: 'NESW' });
    }
  }
  const rings: [number, number][] = [[3.05, wall + 0.3], [2.9, wall + 1.3], [2.45, wall + 2.25], [1.6, wall + 2.95], [0.65, wall + 3.3]];
  lathe(b, cx, cz, rings, 8, GH_ROOF, { win: roofGlass });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    b.sweep(rings.map(([rr, y]): V3 => [cx + Math.cos(a) * (rr + 0.04), y + 0.02, cz + Math.sin(a) * (rr + 0.04)]), rings.map(() => 0.05), GH_IRON);
  }
  b.cyl(cx, cz, wall + 3.25, l.top - 0.05, 0.7, 0.6, 8, GH_ROOF, { cap: GH_IRON, win: roofGlass });
  b.beam([cx, l.top - 0.05, cz], [cx, l.top + 0.6, cz], 0.06, 0.02, BRASS);
  // the two wings, with vaulted glass roofs
  const vault = (x0: number, x1: number): void => {
    b.box(x0, 0, cz - 2, x1, 2.8, cz + 2, GH_WALL, { win: glass, faces: x0 < cx ? 'NSW' : 'NSE' });
    const pts: [number, number][] = [[cz - 2, 2.8], [cz - 1.6, 3.6], [cz - 0.9, 4.15], [cz, 4.35], [cz + 0.9, 4.15], [cz + 1.6, 3.6], [cz + 2, 2.8]];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [u0, y0] = pts[i], [u1, y1] = pts[i + 1];
      b.quad([x0, y0, u0], [x1, y0, u0], [x1, y1, u1], [x0, y1, u1], [0, u1 - u0, -(y1 - y0)].map((v, j, a) => v / Math.hypot(...a)) as V3, GH_ROOF, { win: roofGlass });
      b.quad([x0, y0 - 0.06, u0], [x1, y0 - 0.06, u0], [x1, y1 - 0.06, u1], [x0, y1 - 0.06, u1], [0, -(u1 - u0), y1 - y0].map((v, j, a) => v / Math.hypot(...a)) as V3, 0x2f4a36);
      const ex = x0 < cx ? x0 : x1, n: V3 = [x0 < cx ? -1 : 1, 0, 0];
      face3(b, [ex, 2.8, cz], [ex, y0, u0], [ex, y1, u1], n, GH_WALL, { win: glass });
    }
    for (const x of [x0 + 0.05, (x0 + x1) / 2, x1 - 0.05]) b.sweep(pts.map(([u, y]): V3 => [x, y + 0.03, u]), pts.map(() => 0.05), GH_IRON);
    b.beam([x0, 4.4, cz], [x1, 4.4, cz], 0.05, 0.05, GH_IRON);
  };
  vault(l.x0 + 0.4, cx - h);
  vault(cx + h, l.x1 - 2.4);
  // the porch to the south, the door, and the name over it
  b.box(cx - 1.3, 0, cz + h, cx + 1.3, 2.9, cz + h + 0.7, GH_WALL, { win: glass, faces: 'ESW' });
  b.box(cx - 1.45, 2.9, cz + h - 0.05, cx + 1.45, 3.05, cz + h + 0.85, GH_IRON, { faces: 'NESWTB' });
  b.quad([cx - 0.55, 0.06, cz + h + 0.73], [cx + 0.55, 0.06, cz + h + 0.73], [cx + 0.55, 2.0, cz + h + 0.73], [cx - 0.55, 2.0, cz + h + 0.73], [0, 0, 1], 0x24321f, { win: interior(1.8) });
  plaque(k, 'park-botanical-garden', cx, 3.55, cz + h, 0, 1, 0.5, 5.6);
  // the beds round it, of large strange flowers, with the path to the door between them
  const B = 0.075, beds: [number, number, number, number][] = [
    [l.x0 + 0.4, cz + h + 0.9, cx - 0.8, l.z1 - 0.3], [cx + 0.8, cz + h + 0.9, l.x1 - 0.4, l.z1 - 0.3],
    [l.x1 - 1.9, cz - h, l.x1 - 0.3, cz + h - 0.5], [l.x0 + 0.4, l.z0 + 0.3, l.x1 - 0.4, cz - h - 0.3],
  ];
  for (const [x0, z0, x1, z1] of beds) flat(k.street, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], B, BED, W);
  flat(k.street, [[cx - 0.8, cz + h + 0.7], [cx + 0.8, cz + h + 0.7], [cx + 0.8, l.z1 + 1.2], [cx - 0.8, l.z1 + 1.2]], 0.06, PATH, W);
  const ivy = PLACES.ivy, fr = rng(0xf10e7), COLS = [0xc8327a, 0xb8262e, 0x7a3aa8, 0xd8b02a, 0xd86a2a, 0xe04aa0];
  const GLOWS = ['#ff7ad8', '#c8ff6a', '#ffb0f0'];
  let put = 0;
  for (let i = 0; i < 200 && put < 28; i++) {
    const [x0, z0, x1, z1] = beds[i % beds.length];
    const x = x0 + 0.4 + fr() * (x1 - x0 - 0.8), z = z0 + 0.35 + fr() * (z1 - z0 - 0.7);
    if (Math.hypot(x - ivy.x, z - ivy.z) < 1.1) continue;
    const stem = 0.6 + fr() * 1.2, col = COLS[Math.floor(fr() * COLS.length)], kind = Math.floor(fr() * 3);
    b.beam([x, B, z], [x, B + stem, z], 0.05, 0.04, 0x3f6a35);
    face3(b, [x, B, z], [x + 0.45, B + 0.35, z + 0.1], [x + 0.1, B + 0.5, z], [0, 0.3, 1], 0x4f7f3f);
    face3(b, [x, B, z], [x + 0.45, B + 0.35, z + 0.1], [x + 0.1, B + 0.5, z], [0, 0.3, -1], 0x4f7f3f);
    const y = B + stem;
    if (kind === 0) b.cyl(x, z, y, y + 0.35, 0.08, 0.48, 6, col, { cap: 0xf2d24a });
    else if (kind === 1) b.cyl(x, z, y - 0.4, y + 0.25, 0.22, 0.32, 5, col, { cap: 0x3a1a26 });
    else b.cyl(x, z, y, y + 0.55, 0.42, 0.02, 5, col, { cap: false });
    if (fr() < 0.4) k.glows.push({ x, y: y + 0.25, z, sx: 0.28, sy: 0.22, sz: 0.28, color: GLOWS[Math.floor(fr() * GLOWS.length)] });
    put++;
  }
  k.glows.push({ x: cx, y: l.top - 0.4, z: cz, sx: 0.6, sy: 0.4, sz: 0.6, color: GREEN_GOLD });
  k.lights.push({ x: cx, z: cz + 2, r: 13, color: GREEN_GOLD, k: 0.6 });
};

// ---------------------------------------------------------------------------
// What the tile calls
// ---------------------------------------------------------------------------

/** A model for each lot this file builds, by the lot's id. */
export const MODELS: Record<string, Model> = { park, 'finger-castle': fingerCastle, botanical };

/** Lots that are built as part of another lot's model or by `extras`, and so get no box either. */
export const COVERS: string[] = [];

/** Every sign this file hangs. Each id begins with `park-`. */
export const SIGNS: SignDef[] = [
  nameSign('park-robinson-park', 'Robinson Park'),
  nameSign('park-finger-castle', 'Finger Castle'),
  { id: 'park-botanical-garden', lines: ['BOTANICAL GARDEN'], color: '#1d1f24', ink: '#e8f0c8', aspect: 10.2, kind: 'board', size: [430, 42] },
];

function places(): Record<string, Place> {
  const { P, C, gz, gh, tower } = L, G = lotOf('botanical');
  const SE = Math.PI / 4, S = Math.PI / 2;
  const fx = C.x1 - 0.4, fz = C.z1 - 0.4 + 0.2;
  return {
    ivy: { x: gh.cx + 1.6, y: 0.075, z: G.z1 - 1.4, h: SE },
    gardenDoor: { x: gh.cx, y: 0.06, z: gh.cz + 3 + 1.4, h: S },
    castleTop: { x: tower.c[0], y: tower.top, z: tower.c[1], h: SE },
    castleFoot: { x: fx + 0.2, y: landAt(fx + 0.2, fz + 0.4), z: fz + 0.4, h: SE },
    harley: { x: STAGES.parkLawn.x0 + 10, y: 0.02, z: STAGES.parkLawn.z0 + 9, h: SE },
    lawnMiddle: { x: (STAGES.parkLawn.x0 + STAGES.parkLawn.x1) / 2, y: 0.02, z: (STAGES.parkLawn.z0 + STAGES.parkLawn.z1) / 2, h: SE },
    parkGate: { x: P.x1 - 0.8, y: 0.06, z: gz, h: 0 },
  };
}

/** Places on what this file builds that the show needs as built: its task names them. */
export const PLACES: Record<string, Place> = places();

/** Whatever is not one of the plan's lots. */
export function extras(_k: Build): void {
  // everything of the park is built by its three lots' models
}

