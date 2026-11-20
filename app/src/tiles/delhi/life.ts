// What stands between Delhi's things: people on its lawns and sidewalks, the
// trees along its avenues, autos at their stands, carts, a wedding, boards
// over its roads, and the screen on Connaught Place.
//
// Figures, trees and carts do not know where the roads are, so everything
// here is placed through `Places`, which refuses a carriageway, a lot, a
// garden that belongs to a thing, water, and a place kept for a hero.

import * as THREE from 'three';
import { rng, type GeoBuilder } from '../../engine/geo';
import { buildPath } from '../../engine/paths';
import { figure, parasol, wheel } from '../../engine/parts';
import { standingCar } from '../../engine/props';
import type { Build, HeroSpot } from '../../engine/tile';
import { AXIS_Z, CP, CP_R, EAST_BANK, GROUNDS, HEX, HEX_LANES, PLOTS, RAISINA, THINGS, WATERS, WEST_BANK } from './plan';
import { ROUTES, STREETS } from './roads';

/** Knows where nothing may stand. */
export class Places {
  private cells = new Set<number>();
  private rects: [number, number, number, number][] = [];
  private heroes: HeroSpot[];

  constructor(heroes: HeroSpot[]) {
    this.heroes = heroes;
    // every lane of every route, a point for each unit of it, in a grid of cells two units wide
    const p = new THREE.Vector3();
    for (const r of ROUTES) {
      const path = buildPath(r.segs, true, r.hump);
      for (let s = 0; s < path.length; s += 1) {
        path.at(s, p);
        for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) this.cells.add(Places.key(p.x + dx * 2, p.z + dz * 2));
      }
    }
    for (const t of THINGS) if (t.h > 0) this.rects.push([t.x, t.z, t.x + t.w, t.z + t.d]);
    for (const q of PLOTS) this.rects.push([q.x, q.z, q.x + q.w, q.z + q.d]);
    for (const g of Object.values(GROUNDS)) this.rects.push(g);
    for (const w of Object.values(WATERS)) this.rects.push(w.at);
    this.rects.push([WEST_BANK - 0.5, -113, EAST_BANK + 0.5, 113]);
  }

  private static key(x: number, z: number): number {
    return Math.round(x / 2) * 1000 + Math.round(z / 2);
  }

  /** Whether a figure, a tree or a cart may stand here: `pad` is how much room it needs round it. */
  free(x: number, z: number, pad = 0.6): boolean {
    if (x < -103 || x > 103 || z < -112 || z > 112) return false;
    if (this.cells.has(Places.key(x, z))) return false;
    if (this.rects.some(([x0, z0, x1, z1]) => x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad)) return false;
    return !this.heroes.some((h) => Math.hypot(h.x - x, h.z - z) < 5.5);
  }

  /** Keeps everything else out of a rectangle from now on. */
  take(x0: number, z0: number, x1: number, z1: number): void {
    this.rects.push([x0, z0, x1, z1]);
  }
}

// ---------------------------------------------------------------------------
// Small things of the street
// ---------------------------------------------------------------------------

const GREEN = 0x2f8f4f, YELLOW = 0xf2c81e, DARK = 0x1b1c20, STEEL = 0xb9bcc2, WOOD = 0x9a6b3f;

/** An auto-rickshaw: green below, yellow above, on three small wheels. `yaw` is the way it faces. */
export function auto(b: GeoBuilder, x: number, z: number, yaw: number): void {
  const c = Math.cos(yaw), s = Math.sin(yaw), at = (a: number, d: number): [number, number] => [x + c * a - s * d, z + s * a + c * d];
  b.obox(x, 0.82, z, 1.55, 0.42, 0.95, yaw, GREEN, { faces: 'B' });
  const [nx, nz] = at(1.75, 0);
  b.obox(nx, 0.74, nz, 0.35, 0.34, 0.55, yaw, GREEN);
  const [rx, rz] = at(-0.25, 0);
  b.obox(rx, 1.55, rz, 1.2, 0.32, 0.9, yaw, DARK, { faces: 'B' });
  b.obox(rx, 2.0, rz, 1.32, 0.13, 0.98, yaw, YELLOW, { faces: 'B' });
  const [bx, bz] = at(-1.42, 0);
  b.obox(bx, 1.5, bz, 0.08, 0.5, 0.9, yaw, YELLOW);
  for (const [a, d] of [[1.75, 0], [-1.0, 0.92], [-1.0, -0.92]]) {
    const [wx, wz] = at(a, d);
    b.obox(wx, 0.32, wz, 0.32, 0.32, 0.14, yaw, DARK);
  }
}

/** A hand cart with something to eat on it, under a parasol, and its keeper. */
export function cart(k: Build, x: number, z: number, top: number, shade: number, coat: number): void {
  const b = k.b;
  b.box(x - 0.9, 0.55, z - 0.55, x + 0.9, 0.95, z + 0.55, WOOD, { faces: 'NESWTB' });
  for (const dx of [-0.6, 0.6]) wheel(b, x + dx, 0.36, z + 0.6, 0.36, 0.05, 1);
  b.box(x - 0.7, 0.95, z - 0.4, x + 0.7, 1.25, z + 0.4, top);
  for (const dx of [-0.45, 0, 0.45]) b.cyl(x + dx, z, 1.25, 1.48, 0.17, 0.17, 6, STEEL);
  parasol(b, x - 0.2, z - 0.75, shade);
  figure(b, x + 0.2, z - 0.95, 0, { coat, legs: 0x3a3d46, hat: 0x2a211c, hatH: 0.1 });
}

/** A sugarcane press: a cart with its great wheel, and a sheaf of cane. */
export function canePress(k: Build, x: number, z: number): void {
  const b = k.b;
  b.box(x - 1.0, 0.5, z - 0.55, x + 1.0, 1.0, z + 0.55, 0x2f7d4f, { faces: 'NESWTB' });
  wheel(b, x + 0.2, 1.45, z + 0.62, 0.85, 0.06, 1, 0xc8202c, YELLOW);
  for (let i = 0; i < 5; i++) b.box(x - 0.9 + i * 0.12, 1.0, z - 0.4, x - 0.82 + i * 0.12, 2.5, z - 0.32, 0x9bbf5a);
  for (const dx of [-0.7, 0.7]) b.box(x + dx - 0.06, 0, z - 0.06, x + dx + 0.06, 0.5, z + 0.06, DARK);
  figure(b, x - 0.2, z - 0.95, 0, { coat: 0xf2efe6, legs: 0x4a4f58, hat: 0x2a211c, hatH: 0.1 });
}

/** A board over a road, on two posts: `across` is the road's half width, and the board faces the way (nx, nz) points. */
export function gantry(k: Build, id: string, x: number, z: number, nx: number, nz: number, across: number, y = 0): void {
  const b = k.b, rx = nz, rz = -nx, STEEL_GREY = 0x8a9098, h = 6.4;
  for (const s of [-1, 1]) b.box(x + rx * across * s - 0.2, y, z + rz * across * s - 0.2, x + rx * across * s + 0.2, y + h, z + rz * across * s + 0.2, STEEL_GREY);
  b.beam([x - rx * across, y + h, z - rz * across], [x + rx * across, y + h, z + rz * across], 0.18, 0.18, STEEL_GREY);
  const w = k.sign(id, x + nx * 0.16, y + h - 1.3, z + nz * 0.16, nx, nz, 2.1, across * 1.5);
  b.obox(x, y + h - 1.3, z, 0.1, 1.15, w / 2 + 0.15, Math.atan2(nz, nx), 0x1d4f38, { faces: 'B' });
}

// ---------------------------------------------------------------------------
// The scenes this file stages
// ---------------------------------------------------------------------------

/** A wedding on the lawn by Aurobindo Marg: a tent of red and white, and the groom's procession arriving, with its band and its lamps. */
function wedding(k: Build, places: Places): void {
  const b = k.b, x0 = -11, z0 = 24, x1 = -4.5, z1 = 33;
  places.take(x0 - 1, z0 - 1, 0.5, 44);
  // the tent: poles, a roof in stripes, and strings of light along its eaves
  for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) b.box(x - 0.1, 0, z - 0.1, x + 0.1, 3.4, z + 0.1, 0xf2efe6);
  for (let i = 0; i < 6; i++) {
    const a = x0 + ((x1 - x0) * i) / 6, c = x0 + ((x1 - x0) * (i + 1)) / 6;
    b.box(a, 3.4, z0, c, 3.6, z1, i % 2 ? 0xf2efe6 : 0xc8202c, { faces: 'NESWTB' });
  }
  b.cyl((x0 + x1) / 2, (z0 + z1) / 2, 3.6, 5.2, 4.2, 0.2, 4, 0xc8202c, { phase: Math.PI / 4, cap: false });
  for (let z = z0; z <= z1; z += 1.5) for (const x of [x0, x1]) k.glows.push({ x, y: 3.3, z, sx: 0.18, sy: 0.18, sz: 0.18, color: '#ffd98a' });
  k.lights.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, r: 11, color: '#ffd9a0', k: 0.7 });
  // the baraat: the groom on a white mare, the band in red and gold before him, lamps carried either side
  const gx = -8, gz = 39.5;
  b.box(gx - 1.1, 0.9, gz - 0.35, gx + 1.1, 1.75, gz + 0.35, 0xf4f1e8, { faces: 'NESWTB' });
  b.box(gx + 1.0, 1.5, gz - 0.25, gx + 1.6, 2.4, gz + 0.25, 0xf4f1e8);
  for (const [dx, dz] of [[-0.9, -0.25], [-0.9, 0.25], [0.9, -0.25], [0.9, 0.25]]) b.box(gx + dx - 0.1, 0, gz + dz - 0.1, gx + dx + 0.1, 0.9, gz + dz + 0.1, 0xf4f1e8);
  b.box(gx - 0.5, 1.75, gz - 0.4, gx + 0.5, 1.85, gz + 0.4, 0xc8202c);
  figure(b, gx, gz, 1.85, { coat: 0xf2e6c8, legs: 0xf2e6c8, hat: 0xd9b24a, hatH: 0.42 });
  for (let i = 0; i < 6; i++) figure(b, gx + 2.6 + (i % 3) * 1.1, gz - 0.7 + Math.floor(i / 3) * 1.4, 0, { coat: 0xc8202c, legs: 0xf4f1e8, hat: 0xd9b24a, hatH: 0.3 });
  for (let i = 0; i < 4; i++) {
    const lx = gx - 1.5 + i * 1.9, lz = gz + (i % 2 ? 1.9 : -1.9);
    figure(b, lx, lz, 0, { coat: 0x4a4f58, legs: 0x3a3d46, hat: 0x2a211c, hatH: 0.1 });
    b.box(lx - 0.22, 2.4, lz - 0.22, lx + 0.22, 2.95, lz + 0.22, 0xfff3c4);
    k.glows.push({ x: lx, y: 3.05, z: lz, sx: 0.4, sy: 0.5, sz: 0.4, color: '#ffe9a8' });
  }
  k.lights.push({ x: gx + 1, z: gz, r: 8, color: '#ffe2ae', k: 0.6 });
}

/** White Ambassadors on Raisina Hill, and monkeys on its parapet. */
function raisina(k: Build): void {
  const y = RAISINA.y;
  for (const [x, z, yaw] of [[-66, AXIS_Z - 8.6, 0], [-70.5, AXIS_Z + 9.2, Math.PI]]) {
    standingCar(k, x, z, yaw, { body: 0xf4f1e8, y: y + 0.02 });
    k.glows.push({ x: x - Math.cos(yaw) * 0.4, y: y + 2.5, z, sx: 0.3, sy: 0.22, sz: 0.3, color: '#ff4a3c' });
  }
  for (const z of [RAISINA.z0 + 2.5, RAISINA.z0 + 5, RAISINA.z1 - 3, RAISINA.z1 - 6.5]) {
    const x = RAISINA.x1 - 0.5;
    k.b.box(x - 0.3, y, z - 0.22, x + 0.3, y + 0.5, z + 0.22, 0x8a6a4a);
    k.b.box(x + 0.05, y + 0.5, z - 0.18, x + 0.4, y + 0.85, z + 0.18, 0x9a7a58);
  }
}

/** Everything this file adds, once all the things are built. */
export function life(k: Build, heroes: HeroSpot[]): void {
  const places = new Places(heroes), rand = rng(77201), b = k.b;
  const scatter = (n: number, x0: number, z0: number, x1: number, z1: number, y = 0): void => {
    for (let i = 0, tries = 0; i < n && tries < n * 8; tries++) {
      const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0);
      if (!places.free(x, z)) continue;
      k.person(x, z, y);
      i++;
    }
  };

  wedding(k, places);
  raisina(k);

  // --- Kartavya Path: families on the lawns, ice-cream carts and a balloon seller on the walks ---
  const lawns = THINGS.find((t) => t.id === 'kartavya-path')!;
  scatter(26, lawns.x + 1, lawns.z + 1.5, lawns.x + lawns.w - 1, AXIS_Z - 14);
  scatter(26, lawns.x + 1, AXIS_Z + 14, lawns.x + lawns.w - 1, lawns.z + lawns.d - 1.5);
  scatter(18, lawns.x + 1, AXIS_Z - 10.2, lawns.x + lawns.w - 1, AXIS_Z - 7.6);
  scatter(18, lawns.x + 1, AXIS_Z + 7.6, lawns.x + lawns.w - 1, AXIS_Z + 10.2);
  for (const [x, z, shade] of [[-36, AXIS_Z - 9, 0xd8432b], [-17, AXIS_Z + 9.2, 0x2a6fb0], [-27, AXIS_Z + 9, 0xf2c14e]]) cart(k, x, z, 0xf4f1e8, shade, 0xf4f1e8);
  {
    // the balloon seller: a figure, a pole, and a bunch of balloons
    const x = -22.5, z = AXIS_Z - 8.8;
    figure(b, x, z, 0, { coat: 0x7a8fb5, legs: 0x3a3d46, hat: 0x2a211c, hatH: 0.1 });
    b.box(x + 0.45, 0, z - 0.04, x + 0.53, 3.3, z + 0.04, 0xd9d2c2);
    [0xd8432b, 0xf2c14e, 0x3f8fd0, 0x4fa36b, 0xff7fb0, 0xf08a24].forEach((color, i) => b.cyl(x + 0.5 + Math.cos(i * 1.05) * 0.5, z + Math.sin(i * 1.05) * 0.5, 3.1 + (i % 3) * 0.35, 3.8 + (i % 3) * 0.35, 0.28, 0.28, 6, color));
  }
  // --- India Gate's lawns: people round it, and none on the memorials ---
  {
    const inner = HEX_LANES[0] - 5.5;
    for (let i = 0, tries = 0; i < 26 && tries < 300; tries++) {
      const a = rand() * Math.PI * 2, r = 4 + rand() * (inner - 4), x = HEX[0] + Math.cos(a) * r, z = HEX[1] + Math.sin(a) * r * 0.86;
      if (!places.free(x, z, 1.4)) continue;
      k.person(x, z);
      i++;
    }
  }

  // --- people on the sidewalks of every street ---
  const p = new THREE.Vector3(), a = new THREE.Vector3(), c = new THREE.Vector3();
  for (const s of STREETS) {
    const walk = s.opts?.sidewalk ?? 3;
    if (walk < 2) continue;
    const path = buildPath(s.segs, s.closed === true, s.hump), half = (s.opts?.width ?? (s.opts?.lanes ?? 2) * 5) / 2;
    for (let d = 3; d < path.length - 2; d += 5.5 + rand() * 4) {
      path.at(d, p); path.at(d + 0.5, a); path.at(d - 0.5, c);
      const tx = a.x - c.x, tz = a.z - c.z, l = Math.hypot(tx, tz) || 1, side = rand() < 0.5 ? -1 : 1, off = half + 0.5 + rand() * (walk - 1);
      const x = p.x + (-tz / l) * off * side, z = p.z + (tx / l) * off * side;
      if (places.free(x, z, 0.3)) k.person(x, z, p.y);
    }
  }
  // --- Connaught Place's park, and the forecourts round it ---
  scatter(8, CP[0] - CP_R.park + 1, CP[1] - CP_R.park + 1, CP[0] + CP_R.park - 1, CP[1] + CP_R.park - 1);

  // --- trees along the avenues: a row behind each sidewalk ---
  const avenue = (x0: number, z0: number, x1: number, z1: number, off: number, every: number): void => {
    const len = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / len, uz = (z1 - z0) / len;
    for (let d = every / 2; d < len; d += every) {
      for (const side of [-1, 1]) {
        const x = x0 + ux * d - uz * off * side, z = z0 + uz * d + ux * off * side;
        if (places.free(x, z, 1.2)) k.tree(x, z, 0.58 + rand() * 0.22);
      }
    }
  };
  avenue(-54, 48, -54, 96, 8.6, 8);
  avenue(-2, 48, -2, 96, 8.6, 8);
  avenue(19.5, -44, 19.5, -100, 8.6, 9);
  avenue(-90, -38, -66, -38, 8.6, 8);
  avenue(-13, -38, 12, -38, 8.6, 8);
  avenue(60.5, 62, 60.5, -88, 10, 9);
  avenue(-90, 100, -62, 100, 8.6, 8);

  // --- autos at their stands, and carts on the corners ---
  for (const [x, z, yaw, n] of [[-66.5, -47.5, 0, 3], [-11.5, 47, Math.PI / 2, 3], [-46.5, 52.5, 0, 2], [24.5, -30, Math.PI / 2, 3]]) {
    for (let i = 0; i < n; i++) {
      const ax = x + Math.cos(yaw) * i * 3.9, az = z + Math.sin(yaw) * i * 3.9;
      if (places.free(ax, az, 1.6)) auto(b, ax, az, yaw);
    }
  }
  for (const [x, z] of [[-9.5, -46.5], [26, -43], [-47, 20.5], [9, 53.5]]) if (places.free(x, z, 1.2)) cart(k, x, z, 0xd9a25f, 0xd8432b, 0xe9dcc4);
  for (const [x, z] of [[-63, 66.5], [4.5, 20.5]]) if (places.free(x, z, 1.2)) canePress(k, x, z);

  // --- boards over the roads: the way each faces is the way its traffic comes from ---
  gantry(k, 'road-kashmere-gate', 60.5, 34, 0, 1, 9.2);
  gantry(k, 'road-ring-road', 60.5, -46, 0, -1, 9.2);
  gantry(k, 'road-aiims', 25.2, 59.3, 1, 0, 9.4);
  gantry(k, 'road-dhaula-kuan', -28, 59, 1, 0, 9.4);
  gantry(k, 'road-chandni-chowk', 19.5, -50, 0, 1, 7.7);
  gantry(k, 'road-karol-bagh', -70, -38, 1, 0, 7.7);
  gantry(k, 'road-india-gate', -2, 78, 0, 1, 7.7);
  gantry(k, 'road-moti-bagh', -54, 82, 0, 1, 7.7);
  gantry(k, 'road-connaught-place', 4, -38, 1, 0, 7.7);

}
