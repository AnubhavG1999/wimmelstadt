// What stands between Delhi's things: people on its lawns and sidewalks, the
// trees along its avenues, autos at their stands, carts, a wedding, boards
// over its roads, and the screen on Connaught Place.
//
// Figures, trees and carts do not know where the roads are, so everything
// here is placed through `Places`, which refuses a carriageway, a lot, a
// garden that belongs to a thing, water, and a place kept for a hero.

import * as THREE from 'three';
import { interior, rng, type GeoBuilder } from '../../engine/geo';
import { area, rect } from '../../engine/ground';
import { buildPath } from '../../engine/paths';
import { figure, parasol, wheel } from '../../engine/parts';
import { standingCar } from '../../engine/props';
import type { Build, HeroSpot, ParkedSpot } from '../../engine/tile';
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

/**
 * A wedding on a lawn in the Ridge, south of Raisina Hill, where the big hotels' lawns are in life: a tent of red and
 * white, and the groom's procession arriving, with its band and its lamps. It first stood by Aurobindo Marg, hard
 * against the gate of Safdarjung's Tomb, which is no place for it.
 */
function wedding(k: Build, places: Places): void {
  // (it stands at the lawn's east end: further west, the Metro's station hides it from the opening view)
  const b = k.b, x0 = -72, z0 = 31.5, x1 = -65.5, z1 = 40.5;
  area(k, rect(-79.5, 30.3, -63.6, 50.8), 0x86b85c);
  places.take(-79.5, 30, -63.6, 51);
  // the tent: poles, a roof in stripes, and strings of light along its eaves
  for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) b.box(x - 0.1, 0, z - 0.1, x + 0.1, 3.4, z + 0.1, 0xf2efe6);
  for (let i = 0; i < 6; i++) {
    const a = x0 + ((x1 - x0) * i) / 6, c = x0 + ((x1 - x0) * (i + 1)) / 6;
    b.box(a, 3.4, z0, c, 3.6, z1, i % 2 ? 0xf2efe6 : 0xc8202c, { faces: 'NESWTB' });
  }
  b.cyl((x0 + x1) / 2, (z0 + z1) / 2, 3.6, 5.2, 4.2, 0.2, 4, 0xc8202c, { phase: Math.PI / 4, cap: false });
  for (let z = z0; z <= z1; z += 1.5) for (const x of [x0, x1]) k.glows.push({ x, y: 3.3, z, sx: 0.18, sy: 0.18, sz: 0.18, color: '#ffd98a' });
  k.lights.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, r: 11, color: '#ffd9a0', k: 0.7 });
  // inside it: a stage at the far end with a wall of marigolds behind two red chairs, where the bride waits, a carpet up the middle,
  // rows of chairs with the guests among them, and the dinner laid along one side
  const mid = (x0 + x1) / 2, MARIGOLD = [0xf2a01e, 0xf2c81e, 0xe0601c], CLOTH = 0xf4f1e8, CARPET = 0xb01e2e;
  b.box(mid - 2.3, 0, z0 + 0.3, mid + 2.3, 0.45, z0 + 2.1, CLOTH, { top: CARPET });
  for (let i = 0; i < 10; i++) b.box(mid - 2.2 + i * 0.44, 0.45, z0 + 0.3, mid - 1.76 + i * 0.44, 3.0, z0 + 0.45, MARIGOLD[i % 3]);
  for (const dx of [-0.6, 0.6]) {
    b.box(mid + dx - 0.3, 0.45, z0 + 0.75, mid + dx + 0.3, 0.9, z0 + 1.35, CARPET);
    b.box(mid + dx - 0.3, 0.9, z0 + 0.75, mid + dx + 0.3, 1.9, z0 + 0.9, CARPET, { top: 0xd9b24a });
  }
  figure(b, mid - 0.6, z0 + 1.6, 0.45, { coat: 0xc8202c, legs: 0xc8202c, hat: 0xd9b24a, hatH: 0.08 });
  b.box(mid - 0.7, 0, z0 + 2.1, mid + 0.7, 0.06, z1 + 2.4, CARPET);
  for (let row = 0; row < 3; row++) {
    const z = z0 + 3.6 + row * 1.35;
    for (const dx of [-2.6, -1.85, 1.85, 2.6]) {
      b.box(mid + dx - 0.2, 0, z - 0.2, mid + dx + 0.2, 0.45, z + 0.2, CLOTH, { top: CARPET });
      b.box(mid + dx - 0.2, 0.45, z + 0.12, mid + dx + 0.2, 0.95, z + 0.2, CLOTH);
    }
  }
  for (const [dx, dz] of [[-2.2, 3.0], [1.4, 3.1], [2.3, 4.3], [-1.4, 4.4], [-2.3, 5.6], [1.5, 5.7], [0.2, 7.6], [-1.3, 8.2], [2.5, 7.4]]) k.person(mid + dx, z0 + dz);
  b.box(x0 + 0.25, 0, z1 - 2.4, x0 + 0.95, 0.9, z1 - 0.3, CLOTH, { faces: 'NESWT' });
  for (let i = 0; i < 4; i++) b.cyl(x0 + 0.6, z1 - 2.1 + i * 0.5, 0.9, 1.12, 0.19, 0.19, 8, STEEL);
  figure(b, x0 + 1.5, z1 - 1.3, 0, { coat: 0xf4f1e8, legs: 0x26262a, hat: 0xf4f1e8, hatH: 0.3 });
  // marigolds: strings of them hanging from the front eave, and a gate of them where the carpet begins
  for (let x = x0 + 0.2, i = 0; x < x1; x += 0.42, i++) b.box(x - 0.07, 2.5 + (i % 3) * 0.25, z1 - 0.07, x + 0.07, 3.4, z1 + 0.07, MARIGOLD[i % 3]);
  for (const dx of [-1.25, 1.25]) b.box(mid + dx - 0.14, 0, z1 + 2.2, mid + dx + 0.14, 2.9, z1 + 2.48, MARIGOLD[0]);
  b.box(mid - 1.5, 2.9, z1 + 2.16, mid + 1.5, 3.3, z1 + 2.52, MARIGOLD[1], { faces: 'NESWTB' });
  // the baraat: the groom on a white mare, the band in red and gold before him, lamps carried either side
  // (close before the gate: any further south and the Metro's viaduct hides them from the opening view)
  const gx = mid - 0.25, gz = z1 + 4.7;
  b.box(gx - 1.1, 0.9, gz - 0.35, gx + 1.1, 1.75, gz + 0.35, 0xf4f1e8, { faces: 'NESWTB' });
  b.box(gx + 1.0, 1.5, gz - 0.25, gx + 1.6, 2.4, gz + 0.25, 0xf4f1e8);
  for (const [dx, dz] of [[-0.9, -0.25], [-0.9, 0.25], [0.9, -0.25], [0.9, 0.25]]) b.box(gx + dx - 0.1, 0, gz + dz - 0.1, gx + dx + 0.1, 0.9, gz + dz + 0.1, 0xf4f1e8);
  b.box(gx - 0.5, 1.75, gz - 0.4, gx + 0.5, 1.85, gz + 0.4, 0xc8202c);
  figure(b, gx, gz, 1.85, { coat: 0xf2e6c8, legs: 0xf2e6c8, hat: 0xd9b24a, hatH: 0.42 });
  for (let i = 0; i < 6; i++) figure(b, gx + 2.6 + (i % 3) * 1.1, gz - 0.7 + Math.floor(i / 3) * 1.4, 0, { coat: 0xc8202c, legs: 0xf4f1e8, hat: 0xd9b24a, hatH: 0.3 });
  for (let i = 0; i < 4; i++) {
    const lx = gx - 1.5 + i * 1.9, lz = gz + (i % 2 ? 1.7 : -1.7);
    figure(b, lx, lz, 0, { coat: 0x4a4f58, legs: 0x3a3d46, hat: 0x2a211c, hatH: 0.1 });
    b.box(lx - 0.22, 2.4, lz - 0.22, lx + 0.22, 2.95, lz + 0.22, 0xfff3c4);
    k.glows.push({ x: lx, y: 3.05, z: lz, sx: 0.4, sy: 0.5, sz: 0.4, color: '#ffe9a8' });
  }
  k.lights.push({ x: gx + 1, z: gz, r: 8, color: '#ffe2ae', k: 0.6 });
}

/**
 * A neighbourhood park on the open ground south of the AIIMS flyover, between
 * the dhaba and the Ring Road's swing to the south. It lies beside the Lotus
 * Temple's garden, which is a place of silence, so it is a quiet one: old
 * trees, benches, and a class at its exercises on their mats. (Gully cricket
 * was played here at first. That game is in R. K. Puram's colony park.)
 */
function park(k: Build, places: Places): void {
  const b = k.b, GRASS = 0x8fbf63, MATS = [0x7a4fa3, 0x2a6fb0, 0xd8432b, 0x2f8f6f, 0xf08a24, 0xd9a25f], COATS = [0xf4f1e8, 0xe9dcc4, 0xf2c14e, 0x9fd0c8];
  area(k, [[13.5, 68], [24.3, 68], [37.6, 81.3], [13.5, 81.3]], GRASS);
  places.take(13, 67.5, 38, 81.8);
  // the class: two rows of four on their mats, and the teacher before them
  for (let i = 0; i < 8; i++) {
    const x = 18.4 + (i % 4) * 2.1, z = 73.4 + Math.floor(i / 4) * 3;
    area(k, rect(x - 0.45, z - 1, x + 0.45, z + 1), MATS[i % MATS.length], 0.035);
    figure(b, x, z, 0, { coat: COATS[i % COATS.length], legs: 0x3a4a6a, hat: 0x2a211c, hatH: 0.1 });
  }
  area(k, rect(27.2, 73.9, 28.1, 75.9), 0xf4f1e8, 0.035);
  figure(b, 27.65, 74.9, 0, { coat: 0xf4f1e8, legs: 0xf4f1e8, hat: 0x2a211c, hatH: 0.1 });
  // benches along the west side, with someone on the walk before each, and old trees round the edge
  for (const z of [70, 74.2, 78.4]) {
    b.box(14.1, 0.38, z - 0.8, 14.6, 0.5, z + 0.8, 0x9a6b3f, { faces: 'NESWTB' });
    b.box(14.0, 0.5, z - 0.8, 14.12, 1.05, z + 0.8, 0x9a6b3f);
    for (const dz of [-0.65, 0.65]) b.box(14.15, 0, z + dz - 0.06, 14.55, 0.38, z + dz + 0.06, 0x3a3d46);
    k.person(15.6, z + 0.5);
  }
  // (none in the south-west corner: a tree there stood before the dhaba's yard in the opening view)
  for (const [x, z, size] of [[34.6, 80.3, 0.58], [21.5, 69.3, 0.6], [29.5, 79.6, 0.55], [16.4, 68.9, 0.5], [25.5, 80.2, 0.5]]) k.tree(x, z, size);
  k.person(31.6, 77.2);
  k.person(23.2, 79);
}

/**
 * A bungalow of Lutyens' Delhi, between Connaught Place and the hexagon:
 * white, one storey, a verandah on round columns towards its garden, a flat
 * roof behind a parapet, a hedge round it and a white saloon in the drive. It
 * is low, so that Agrasen ki Baoli beside it is seen.
 */
function bungalow(k: Build, places: Places): void {
  const b = k.b, x0 = 21, z0 = -30, x1 = 30, z1 = -20.2, WHITE = 0xf4f1e8, TRIM = 0xe2dccb, HEDGE = 0x4f8a45, H = 3.3;
  places.take(x0 - 0.5, z0 - 0.5, x1 + 0.5, z1 + 0.5);
  area(k, rect(x0, z0, x1, z1), 0x86b85c);
  // the house at the back of its garden: plain white walls with small windows, a cornice and a parapet
  const hx0 = x0 + 0.9, hx1 = x1 - 0.9, hz0 = z0 + 0.5, hz1 = z0 + 4.7;
  b.box(hx0, 0, hz0, hx1, H, hz1, WHITE, { win: { cell: 1.5, storey: H, lit: 0.5, kind: 4 }, seed: 0.3, faces: 'NEW' });
  b.box(hx0, 0, hz0, hx1, H, hz1, WHITE, { faces: 'S' });
  b.box(hx0 - 0.18, H, hz0 - 0.18, hx1 + 0.18, H + 0.28, hz1 + 0.18, TRIM, { faces: 'NESWTB' });
  b.box(hx0 + 0.1, H + 0.28, hz0 + 0.1, hx1 - 0.1, H + 0.7, hz1 - 0.1, WHITE, { top: 0xcfc4ae });
  // the verandah along its south side: a floor, six round columns, a flat roof, and shade behind them that is lamp-lit at night
  const vz = hz1 + 1.5;
  b.box(hx0, 0, hz1, hx1, 0.28, vz, TRIM);
  b.box(hx0 + 0.3, 0.28, hz1, hx1 - 0.3, 2.6, hz1 + 0.05, 0x4f3a26, { win: interior(2.2), faces: 'S' });
  for (let i = 0; i < 6; i++) b.cyl(hx0 + 0.3 + (i / 5) * (hx1 - hx0 - 0.6), vz - 0.25, 0.28, 2.6, 0.17, 0.14, 8, WHITE, { cap: false });
  b.box(hx0 - 0.18, 2.6, hz1, hx1 + 0.18, 2.9, vz + 0.12, WHITE, { faces: 'ESWTB' });
  // the hedge round the garden, open at the gate in the south-east corner, with a white pier either side of it
  b.box(x0, 0, z0, x1, 0.75, z0 + 0.35, HEDGE);
  b.box(x0, 0, z0 + 0.35, x0 + 0.35, 0.75, z1, HEDGE);
  b.box(x1 - 0.35, 0, z0 + 0.35, x1, 0.75, z1 - 3.4, HEDGE);
  b.box(x0 + 0.35, 0, z1 - 0.35, x1, 0.75, z1, HEDGE);
  for (const z of [z1 - 3.4, z1 - 0.4]) b.box(x1 - 0.4, 0, z - 0.2, x1, 1.3, z + 0.2, WHITE, { top: TRIM });
  // the drive across the front, of red gravel, and the saloon that waits on it
  area(k, rect(x0 + 0.6, vz + 0.2, x1 - 0.35, z1 - 0.5), 0xc9906f, 0.03);
  standingCar(k, x0 + 4.6, (vz + z1) / 2 - 0.05, 0, { body: 0xf4f1e8 });
  k.tree(x1 - 1.3, vz + 0.4, 0.42);
  k.lights.push({ x: (x0 + x1) / 2, z: vz + 1, r: 7, color: '#ffe2ae', k: 0.5 });
  figure(b, x1 - 0.9, z1 - 1.9, 0, { coat: 0x4a5f3a, legs: 0x4a5f3a, hat: 0x4a5f3a, hatH: 0.16 });
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

/** Everything this file adds, once all the things are built. It hands back the autos that wait at their stands. */
export function life(k: Build, heroes: HeroSpot[]): ParkedSpot[] {
  const places = new Places(heroes), rand = rng(77201), b = k.b, parked: ParkedSpot[] = [];
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
  park(k, places);
  bungalow(k, places);
  // (a thing that is ground is not kept clear by its height: the baoli is kept clear by name)
  places.take(4, -30.5, 16, -23);

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
  // --- the lawn north-east of the hexagon: a few trees at its south end, well clear of the Auto Expo's turntable, and people ---
  for (const [x, z, size] of [[48.6, -7.5, 0.6], [49.4, -1.2, 0.5], [46.4, -11.5, 0.52]]) if (places.free(x, z, 1)) k.tree(x, z, size);
  scatter(6, 41, -22.5, 50.5, -6);
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
      if (places.free(ax, az, 1.6)) parked.push({ x: ax, y: 0.03, z: az, heading: yaw, type: 'auto' });
    }
  }
  for (const [x, z] of [[-9.5, -46.5], [26, -43], [-47, 20.5], [9, 53.5]]) if (places.free(x, z, 1.2)) cart(k, x, z, 0xd9a25f, 0xd8432b, 0xe9dcc4);
  for (const [x, z] of [[-63, 66.5], [4.5, 20.5]]) if (places.free(x, z, 1.2)) canePress(k, x, z);

  // --- boards over the roads: the way each faces is the way its traffic comes from ---
  // (this one stands north of the rally's line of cars: at z 34 its west post stood before the hero's place there)
  gantry(k, 'road-kashmere-gate', 60.5, 17, 0, 1, 9.2);
  gantry(k, 'road-ring-road', 60.5, -46, 0, -1, 9.2);
  gantry(k, 'road-aiims', 25.2, 59.3, 1, 0, 9.4);
  gantry(k, 'road-dhaula-kuan', -28, 59, 1, 0, 9.4);
  gantry(k, 'road-chandni-chowk', 19.5, -50, 0, 1, 7.7);
  gantry(k, 'road-karol-bagh', -70, -38, 1, 0, 7.7);
  gantry(k, 'road-india-gate', -2, 78, 0, 1, 7.7);
  gantry(k, 'road-moti-bagh', -54, 82, 0, 1, 7.7);
  gantry(k, 'road-connaught-place', 4, -38, 1, 0, 7.7);

  return parked;

}
