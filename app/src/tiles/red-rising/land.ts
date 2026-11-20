// The ground of the Iron Rain: the dome of Mars, the trench of the Valles
// Marineris that Agea lies in, the river and the lake, and the glow of the
// planet's thin air along its edges.
//
// The shapes and heights are in plan.ts. What stands on the ground is built
// elsewhere.

import * as THREE from 'three';
import { pathOf, flat as line3, rounded } from '../../engine/corners';
import type { GeoBuilder, V3, WinSpec } from '../../engine/geo';
import { band, flat, walls, type P2 } from '../../engine/ground';
import { makeWaterMaterial } from '../../engine/look/materials';
import { carved, field, heightOn, type Bench, type Field } from '../../engine/terrain';
import type { Build } from '../../engine/tile';
import { DOME, F, LAKE, RIVER, TRENCH, WATER_DROP, inside, naturalAt, outOfTrench, smooth, peakShare } from './plan';

/** What the street material is told about a stretch of plain ground. */
const GROUND: WinSpec = { cell: 0, storey: 1, lit: 0, kind: 1 };

// The colours of a terraformed Mars: green and white from orbit, its old red
// only where the ground is still bare, and the canyon's walls in bands of rust
// and ochre.
export const MEADOW = 0x86a35a, MEADOW_DARK = 0x6f8f4c, SCRUB = 0x9a9a5c, BARE = 0xb86a3e, BARE_DARK = 0x9a5434;
export const SNOW = 0xeef2f6, SNOW_SHADE = 0xd6dee8, PAVING = 0xd8bfa2, MUD = 0x7a5a3e;
/** The planet's ground near its edge, where it curves away: darker, as the far side of a globe is. */
const LIMB_GREEN = 0x5f7d48, LIMB_RED = 0x8c4a2e;
/** The peaks' bare rock, under their snow. */
const ROCK = 0x7d6a62, ROCK_DARK = 0x5d4d48, ROCK_LIGHT = 0x9c897e, SNOW_BLUE = 0xc3d0e0;
/** The canyon's strata, bottom to top. */
export const STRATA = [0x9a4a2c, 0xc07a44, 0x7c3a26, 0xd39a62, 0xa85a34, 0xe0b27a, 0x8a4630];
/** How thick a bed of the canyon's rock is. */
export const BED = 2.4;
/** How far the beds wander up and down at a place, so that they do not run level like a layer cake. */
export const bedShift = (x: number, z: number): number => 2.2 * Math.sin(x * 0.05) + 0.8 * Math.sin(z * 0.13);
/** The colour of the nth bed, counted up from height 0. */
export const bedColour = (n: number): number => STRATA[((n % STRATA.length) + STRATA.length) % STRATA.length];

// ---------------------------------------------------------------------------
// The ground as built
// ---------------------------------------------------------------------------

/** Benches cut into the dome for the roads: set once by roads.ts, before the ground is laid. */
let BENCHES: Bench[] = [];
/** A coarse index of the benches, so that each place asks only about those near it. */
let CELLS = new Map<string, Bench[]>();
const CELL = 12;
const key = (i: number, j: number): string => `${i},${j}`;

export function setBenches(benches: Bench[]): void {
  BENCHES = benches;
  CELLS = new Map();
  for (const b of benches) {
    const reach = b.half + 8;
    for (let i = Math.floor((b.x - reach) / CELL); i <= Math.floor((b.x + reach) / CELL); i++) {
      for (let j = Math.floor((b.z - reach) / CELL); j <= Math.floor((b.z + reach) / CELL); j++) {
        const k = key(i, j);
        if (!CELLS.has(k)) CELLS.set(k, []);
        CELLS.get(k)!.push(b);
      }
    }
  }
}

/** Whether a place is under the river or the lake, or within `room` of their banks. */
export function inWater(x: number, z: number, room = 0): boolean {
  if (inside(LAKE, x, z)) return true;
  if (room > 0) for (const [dx, dz] of [[room, 0], [-room, 0], [0, room], [0, -room]]) if (inside(LAKE, x + dx, z + dz)) return true;
  const line = RIVER.line;
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i], b = line[i + 1], vx = b[0] - a[0], vz = b[1] - a[1], l = vx * vx + vz * vz;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l));
    if (Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t) < RIVER.half + room) return true;
  }
  return false;
}

/**
 * The height of the ground as drawn, under whatever stands on it: the dome
 * with the roads cut into it, the river's bed and the lake's. On the trench's
 * floor it is a hair under the floor, which is laid over it.
 */
function drawnAt(x: number, z: number): number {
  const nat = naturalAt(x, z);
  if (inWater(x, z, 1.5)) return F - 1.6;
  const near = CELLS.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
  let y = near && near.length > 0 ? carved(x, z, nat, near, 0.35) : nat;
  if (outOfTrench(x, z) < 0 && y >= F - 0.01) y = F - 0.05;
  return y;
}

/** The ground's field, once it is laid. */
export let MARS: Field | null = null;

/**
 * How high the ground is at a place, as built: on the trench's floor, the
 * floor; elsewhere the very facet that is drawn there, so that what stands on
 * it neither floats nor sinks.
 */
export function landAt(x: number, z: number): number {
  if (outOfTrench(x, z) < -0.5 && !inWater(x, z)) return F;
  if (!MARS) return naturalAt(x, z);
  const y = heightOn(MARS, x, z);
  return outOfTrench(x, z) < 0 && y > F - 0.06 ? F : y;
}

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

/** Smooth noise over the ground, from 0 to 1, the same on every load. */
function noise(x: number, z: number): number {
  const h = (i: number, j: number): number => {
    const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return h(i, j) * (1 - u) * (1 - v) + h(i + 1, j) * u * (1 - v) + h(i, j + 1) * (1 - u) * v + h(i + 1, j + 1) * u * v;
}

/** Where snow lies on the planet: the north-east of the plateau, and the peaks over the south-east of the flank. */
export function snowAt(x: number, z: number, y: number): number {
  const ne = smooth(10, 50, x) * smooth(-80, -96, z);
  void y;
  return Math.max(ne, smooth(0.34, 0.5, peakShare(x, z)));
}

/** The colour of a facet of the planet, by its height, how level it is, and where. */
function colourAt(y: number, level: number, x: number, z: number): number {
  const n = noise(x * 0.07, z * 0.07), m = noise(x * 0.23 + 40, z * 0.23 - 17);
  // a mountain: scree among the grass at its foot, bare rock on its flanks, snow from its shoulders up
  const up = peakShare(x, z);
  if (up > 0.05) {
    const crisp = noise(x * 0.9 + 7, z * 0.9 - 3);
    if (up > 0.4 + 0.12 * (crisp - 0.5)) return level > 0.8 ? SNOW : crisp > 0.5 ? SNOW_SHADE : SNOW_BLUE;
    if (up > 0.13) return level > 0.82 ? ROCK_LIGHT : crisp > 0.5 ? ROCK : ROCK_DARK;
    if (crisp > 0.62) return ROCK_LIGHT;
  }
  // the canyon's wall and anything else steep: bands of rust and ochre
  // the planet's own steep edge, where it curves away to the board's edge: its landscape, darker towards the edge
  if (level < 0.8 && outOfTrench(x, z) > 18) {
    const edge = Math.min(104 - Math.abs(x), 113 - Math.abs(z));
    if (snowAt(x, z, y) > 0.6) return SNOW_SHADE;
    if (n > 0.6) return edge < 8 ? LIMB_RED : BARE_DARK;
    return edge < 8 ? LIMB_GREEN : MEADOW_DARK;
  }
  if (level < 0.72) {
    return bedColour(Math.floor((y + bedShift(x, z)) / BED));
  }
  if (snowAt(x, z, y) > 0.5 + 0.25 * (m - 0.5)) return level > 0.9 ? SNOW : SNOW_SHADE;
  // the trench's floor beyond the city: dust
  if (Math.abs(y - F) < 0.2 && outOfTrench(x, z) < 1) return m > 0.55 ? BARE_DARK : BARE;
  // bare red ground in patches, more of it towards the limb where the air is thin
  const limb = 1 - Math.min(1, y / (DOME.H * 0.5));
  if (n + 0.35 * limb > 0.78) return m > 0.5 ? BARE : BARE_DARK;
  if (level < 0.86) return m > 0.6 ? SCRUB : MEADOW_DARK;
  return m > 0.62 ? MEADOW_DARK : n > 0.62 ? SCRUB : MEADOW;
}

// ---------------------------------------------------------------------------
// Laying it
// ---------------------------------------------------------------------------

/** The trench's floor as an outline, for the paving: a rounded oblong a little inside the trench's edge. */
function floorOutline(inset: number): P2[] {
  const t = TRENCH, r = t.r - inset, x0 = t.x0 + inset, x1 = t.x1 - inset, z0 = t.z0 + inset, z1 = t.z1 - inset;
  const corner = (cx: number, cz: number, a0: number): P2[] =>
    Array.from({ length: 7 }, (_, i): P2 => [cx + Math.cos(a0 + (i / 6) * (Math.PI / 2)) * r, cz + Math.sin(a0 + (i / 6) * (Math.PI / 2)) * r]);
  return [
    ...corner(x1 - r, z1 - r, 0), ...corner(x0 + r, z1 - r, Math.PI / 2), ...corner(x0 + r, z0 + r, Math.PI), ...corner(x1 - r, z0 + r, Math.PI * 1.5),
  ];
}

/** The river as a shape on the ground, and the lake. */
export function riverShape(): P2[] {
  const path = pathOf(line3(rounded(RIVER.line, 6)));
  return band(path, RIVER.half, 2);
}

/** Draws the planet's field into `b`, but for what lies under the trench's paved floor. */
function drawMars(b: GeoBuilder, f: Field): void {
  const X = (i: number): number => f.x0 + ((f.x1 - f.x0) * i) / f.nx, Z = (j: number): number => f.z0 + ((f.z1 - f.z0) * j) / f.nz;
  const at = (i: number, j: number): V3 => [X(i), f.y[j * (f.nx + 1) + i], Z(j)];
  const facet = (p: V3, q: V3, r: V3): void => {
    // under the floor: the floor is laid over it
    if ([p, q, r].every((v) => outOfTrench(v[0], v[2]) < -1.2 && !inWater(v[0], v[2], 2.5))) return;
    const ax = q[0] - p[0], ay = q[1] - p[1], az = q[2] - p[2], bx = r[0] - p[0], by = r[1] - p[1], bz = r[2] - p[2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const l = Math.hypot(nx, ny, nz) || 1;
    const flip = ny < 0;
    nx /= l; ny /= l; nz /= l;
    if (flip) { nx = -nx; ny = -ny; nz = -nz; }
    const cx = (p[0] + q[0] + r[0]) / 3, cy = (p[1] + q[1] + r[1]) / 3, cz = (p[2] + q[2] + r[2]) / 3;
    const color = inWater(cx, cz) ? MUD : colourAt(cy, ny, cx, cz);
    if (flip) b.tri(p, r, q, [nx, ny, nz], color);
    else b.tri(p, q, r, [nx, ny, nz], color);
  };
  for (let j = 0; j < f.nz; j++) {
    for (let i = 0; i < f.nx; i++) {
      facet(at(i, j), at(i + 1, j), at(i + 1, j + 1));
      facet(at(i, j), at(i + 1, j + 1), at(i, j + 1));
    }
  }
}

/**
 * The glow of the planet's thin air along its edges: a band of pale blue that
 * rises off the ground at the board's edge and fades upwards, brightest where
 * the ground meets the base, as the air is seen edge on round a planet from
 * orbit. It glows more by night.
 */
function atmosphere(k: Build): void {
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const H = 15, OUT = 3.5;
  // the four edges, walked round, a point every two units
  const ring: [number, number, number, number][] = [];
  const step = 2;
  for (let x = -104; x < 104; x += step) ring.push([x, -113, 0, -1]);
  for (let z = -113; z < 113; z += step) ring.push([104, z, 1, 0]);
  for (let x = 104; x > -104; x -= step) ring.push([x, 113, 0, 1]);
  for (let z = 113; z > -113; z -= step) ring.push([-104, z, -1, 0]);
  // white with a little blue in it: the material tints it, pale by day and a deep blue by night
  ring.forEach(([x, z, nx, nz]) => {
    // a little in from the edge, where the ground is still above the base
    const y0 = 0.05;
    pos.push(x, y0, z, x + nx * OUT * 0.4, H * 0.45, z + nz * OUT * 0.4, x + nx * OUT, H, z + nz * OUT);
    col.push(1, 1, 1, 1, 0.86, 0.93, 1, 0.5, 0.7, 0.85, 1, 0);
  });
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = i * 3, b = ((i + 1) % n) * 3;
    idx.push(a, b, a + 1, b, b + 1, a + 1, a + 1, b + 1, a + 2, b + 1, b + 2, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  geo.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const DAY = new THREE.Color(0xe4f3ff), NIGHT = new THREE.Color(0x4f9cf0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'atmosphere';
  mesh.renderOrder = 2;
  k.group.add(mesh);
  k.each((_dt, _t, night) => {
    // a pale haze by day, as thin air is; a blue glow by night
    mat.opacity = 0.26 + 0.6 * night;
    mat.color.copy(DAY).lerp(NIGHT, night);
    mat.blending = night > 0.5 ? THREE.AdditiveBlending : THREE.NormalBlending;
  });
}

export function buildLand(k: Build): void {
  const f = field(-104, -113, 104, 113, 2, drawnAt);
  MARS = f;
  drawMars(k.b, f);

  // the trench's floor, paved, with the river and the lake let into it
  const river = riverShape();
  // the hole for the river stops inside the paving's edge, or the paving is laid without it
  const riverHole = river.map(([x, z]): P2 => [x, Math.max(z, TRENCH.z0 + 0.9)]);
  flat(k.street, floorOutline(0.6), F, PAVING, { win: GROUND, holes: [riverHole, LAKE] });

  // the water: its own, at the floor, with banks of mud down to it
  const level = F - WATER_DROP;
  for (const shape of [river, LAKE]) {
    walls(k.b, shape, F - 1.6, F, MUD, { inward: true });
    const v2 = shape.map((p) => new THREE.Vector2(p[0], p[1]));
    const pos: number[] = [];
    for (const tri of THREE.ShapeUtils.triangulateShape(v2, [])) {
      const [a, b, c] = tri.map((i) => shape[i]);
      const over = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
      // the river runs into the lake a hair under it, so that where the two overlap one water is drawn and not two at once
      for (const p of over >= 0 ? [a, b, c] : [a, c, b]) pos.push(p[0], shape === LAKE ? level : level - 0.04, p[1]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, makeWaterMaterial(k.look, shape === LAKE ? 0x4f8a9a : 0x5d7f74));
    mesh.receiveShadow = true;
    mesh.layers.set(1);
    k.group.add(mesh);
  }
  atmosphere(k);
}
