// What stands on a tile while it is a blockout, apart from its finished models:
// a rough shape for every thing that has no model yet, and plain volumes where
// its ordinary buildings will be.
//
// The volumes are placeholders. They fill each quarter's ground from kerb to
// kerb, in that quarter's sizes and colours, so that the tile's density and its
// street pattern can be judged. Every one of them is replaced by a building
// chosen by hand when the tile is detailed.

import * as THREE from 'three';
import { TILE, type Solid, type Thing, type TilePlan } from '../city/plan.ts';
import { GeoBuilder, interior, rng, type V3, type WinSpec } from '../look/geo.ts';
import { makeCityMaterial } from '../look/materials.ts';
import { WATER_LEVEL, draw, type Ground } from './ground.ts';

interface Style {
  /** How large a plot is, and the gap between two. */
  lot: number;
  gap: number;
  high: [number, number];
  /** Now and then a tower: how often, the least height and the most. */
  towers?: [number, number, number];
  walls: number[];
  roofs: number[];
  /** How many of its buildings have a pitched roof, from 0 to 1. */
  gabled?: number;
  /** How many windows are lit after dark, from 0 to 1. */
  lit: number;
  /** How many of its plots are built on, from 0 to 1. */
  built?: number;
}

const STYLES: Record<string, Style> = {
  chicago: { lot: 12, gap: 1.4, high: [12, 34], towers: [0.2, 42, 70], walls: [0x8f6a55, 0xa9a39a, 0xc9b9a6, 0x7f8a96, 0x9c5a44, 0x5b6068], roofs: [0x6b6f76, 0x8d8a83], lit: 0.5 },
  'new-york': { lot: 10.5, gap: 1.2, high: [14, 40], towers: [0.28, 46, 82], walls: [0xb5553c, 0xc9b9a6, 0xd9cfc0, 0x9c5a44, 0x9aa7b4, 0xa9a39a], roofs: [0x6b6f76, 0x5a5f66, 0x8d8a83], lit: 0.55 },
  'st-louis': { lot: 9, gap: 1.4, high: [6, 14], walls: [0xa5553f, 0x9a4a38, 0xb0624a, 0xc9b9a6], roofs: [0x6b6f76, 0x565b63], lit: 0.45 },
  roadside: { lot: 11, gap: 3, high: [3.6, 5.5], walls: [0xf2efe6, 0x9fd8d0, 0xf6dc8a, 0xf2a9b8, 0xe9d3a0], roofs: [0xc8523f, 0x4aa3a2, 0xe6dfd0], lit: 0.7, built: 0.6 },
  'san-francisco': { lot: 6.6, gap: 0.9, high: [6, 10.5], towers: [0.04, 20, 34], walls: [0xf2b8a0, 0x9fd3c9, 0xf6dc9a, 0xb9cfe6, 0xf2efe6, 0xcfe0b0, 0xe9c9d9], roofs: [0x6b5a5a, 0x5b6468, 0x7a6a5a], gabled: 0.7, lit: 0.5 },
  'new-orleans': { lot: 8.5, gap: 1.6, high: [5.5, 9.5], walls: [0xf6ebc8, 0xf2c9b8, 0xc9e0d2, 0xe9e6df, 0xd9c7e0], roofs: [0x6b6f76, 0x7a5a4a, 0x5b6468], gabled: 0.45, lit: 0.5 },
  'french-quarter': { lot: 4.9, gap: 0.6, high: [6, 9], walls: [0xf2b8a0, 0xf6dc9a, 0x9fd3c9, 0xe9a08a, 0xf2efe6, 0xb9cfe6], roofs: [0x5b6468, 0x6b5a5a], lit: 0.65 },
  downtown: { lot: 13, gap: 1.6, high: [14, 40], towers: [0.26, 48, 88], walls: [0xd9d4ca, 0xbfc7cf, 0xa9b4bf, 0xe6dfd0, 0x9fb7c9, 0xc9b9a6], roofs: [0x8d8a83, 0x7a8088, 0x9d988f], lit: 0.5 },
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Which ground of a tile is taken: by water, lawns, roads, and things. A dot to half a unit. */
class Taken {
  private readonly k = 2;
  private readonly size = TILE * 2;
  private cells: Uint8Array;

  constructor(plan: TilePlan, ground: Ground) {
    const c = document.createElement('canvas');
    c.width = c.height = this.size;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.fillStyle = '#000';
    g.fillRect(0, 0, this.size, this.size);
    g.fillStyle = g.strokeStyle = '#fff';
    for (const s of plan.parks) draw(g, s, this.k);
    g.lineJoin = 'round';
    g.lineCap = 'square';
    // a road keeps its pavement clear as well; a raised one keeps the ground under it
    const line = (path: [number, number][], closed: boolean, width: number): void => {
      g.beginPath();
      path.forEach(([x, z], i) => (i ? g.lineTo(x * this.k, z * this.k) : g.moveTo(x * this.k, z * this.k)));
      if (closed) g.closePath();
      g.lineWidth = width * this.k;
      g.stroke();
    };
    for (const s of plan.streets) line(s.path, s.closed === true, s.width + 2.6);
    for (const r of plan.raised) line(r.path.map(([x, z]): [number, number] => [x, z]), r.closed === true, r.width + 1.6);
    for (const r of plan.rails) if (r.kind === 'trestle') line(r.path, r.closed === true, 7);
    for (const t of plan.things) {
      if (!t.clear || (!t.clear[0] && !t.clear[1])) continue;
      g.save();
      g.translate(t.at[0] * this.k, t.at[1] * this.k);
      g.rotate(THREE.MathUtils.degToRad(t.turn ?? 0));
      g.fillRect(-(t.clear[0] + 0.9) * this.k, -(t.clear[1] + 0.9) * this.k, (t.clear[0] + 0.9) * 2 * this.k, (t.clear[1] + 0.9) * 2 * this.k);
      g.restore();
    }
    const data = g.getImageData(0, 0, this.size, this.size).data;
    this.cells = new Uint8Array(this.size * this.size);
    for (let i = 0; i < this.cells.length; i++) this.cells[i] = data[i * 4] > 60 ? 1 : 0;
    // water and its banks, from the ground itself
    for (let j = 0; j < this.size; j++) {
      for (let i = 0; i < this.size; i++) {
        if (ground.heightAt((i + 0.5) / this.k, (j + 0.5) / this.k) < -0.15) this.cells[j * this.size + i] = 1;
      }
    }
  }

  /** Goes over every dot of a turned rectangle. Stops, and says so, if `each` returns false. */
  private over(x: number, z: number, hx: number, hz: number, yaw: number, each: (cell: number) => boolean): boolean {
    const c = Math.cos(yaw), s = Math.sin(yaw), step = 1 / this.k;
    for (let lx = -hx; lx <= hx + 1e-6; lx += step) {
      for (let lz = -hz; lz <= hz + 1e-6; lz += step) {
        const px = x + lx * c - lz * s, pz = z + lx * s + lz * c;
        if (px < 0 || pz < 0 || px >= TILE || pz >= TILE) return false;
        if (!each(Math.floor(pz * this.k) * this.size + Math.floor(px * this.k))) return false;
      }
    }
    return true;
  }

  free(x: number, z: number, hx: number, hz: number, yaw: number): boolean {
    return this.over(x, z, hx, hz, yaw, (cell) => this.cells[cell] === 0);
  }

  take(x: number, z: number, hx: number, hz: number, yaw: number): void {
    this.over(x, z, hx, hz, yaw, (cell) => {
      this.cells[cell] = 1;
      return true;
    });
  }
}

/** A box turned about the vertical, with walls that know their own length, so that windows sit evenly along them. */
function block(b: GeoBuilder, x: number, z: number, hx: number, hz: number, y0: number, y1: number, yaw: number, colour: number, top: number, win: WinSpec | undefined, seed: number): void {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const at = (lx: number, y: number, lz: number): V3 => [x + lx * c - lz * s, y, z + lx * s + lz * c];
  const to = (lx: number, lz: number): V3 => [lx * c - lz * s, 0, lx * s + lz * c];
  const q = { win, seed, base: y0 };
  b.quad(at(-hx, y0, hz), at(hx, y0, hz), at(hx, y1, hz), at(-hx, y1, hz), to(0, 1), colour, { ...q, L: hx * 2 });
  b.quad(at(hx, y0, -hz), at(-hx, y0, -hz), at(-hx, y1, -hz), at(hx, y1, -hz), to(0, -1), colour, { ...q, L: hx * 2 });
  b.quad(at(hx, y0, hz), at(hx, y0, -hz), at(hx, y1, -hz), at(hx, y1, hz), to(1, 0), colour, { ...q, L: hz * 2 });
  b.quad(at(-hx, y0, -hz), at(-hx, y0, hz), at(-hx, y1, hz), at(-hx, y1, -hz), to(-1, 0), colour, { ...q, L: hz * 2 });
  b.quad(at(-hx, y1, hz), at(hx, y1, hz), at(hx, y1, -hz), at(-hx, y1, -hz), [0, 1, 0], top, win && win.kind === 5 ? { win } : {});
}

/** A pitched roof over a turned box, its ridge along the longer side. */
function gable(b: GeoBuilder, x: number, z: number, hx: number, hz: number, y: number, yaw: number, roof: number, wall: number, rise: number): void {
  const c = Math.cos(yaw), s = Math.sin(yaw), along = hx >= hz, half = along ? hz : hx, len = along ? hx : hz, n = Math.hypot(half, rise);
  const at = (u: number, yy: number, v: number): V3 => (along ? [x + u * c - v * s, yy, z + u * s + v * c] : [x + v * c - u * s, yy, z + v * s + u * c]);
  const to = (u: number, yy: number, v: number): V3 => (along ? [u * c - v * s, yy, u * s + v * c] : [v * c - u * s, yy, v * s + u * c]);
  b.quad(at(-len, y, half), at(len, y, half), at(len, y + rise, 0), at(-len, y + rise, 0), to(0, half / n, rise / n), roof);
  b.quad(at(len, y, -half), at(-len, y, -half), at(-len, y + rise, 0), at(len, y + rise, 0), to(0, half / n, -rise / n), roof);
  for (const e of [-1, 1]) {
    const apex = at(e * len, y + rise, 0);
    b.quad(at(e * len, y, -half), at(e * len, y, half), apex, apex, to(e, 0, 0), wall);
  }
}

/** How high the rough shape of a thing reaches above the ground it stands on. */
export function heightOf(t: Thing): number {
  if (t.top !== undefined) return t.top;
  let top = 6;
  for (const s of t.solids ?? []) top = Math.max(top, (s.at?.[2] ?? 0) + ('box' in s ? s.box[2] : s.drum[2]));
  return top + 3;
}

export interface Massing { mesh: THREE.Mesh; volumes: number; shapes: number; triangles: number }

export function buildMassing(plan: TilePlan, ground: Ground, seed: number): Massing {
  const b = new GeoBuilder();
  const rnd = rng(seed);
  const pick = <T>(list: T[]): T => list[Math.floor(rnd() * list.length)];
  const taken = new Taken(plan, ground);

  // --- a rough shape for each thing that has no model yet ---
  let shapes = 0;
  const solid = (t: Thing, s: Solid, base: number): void => {
    const turn = THREE.MathUtils.degToRad(t.turn ?? 0), c = Math.cos(turn), sn = Math.sin(turn);
    const [dx, dz, up] = s.at ?? [0, 0, 0];
    const x = t.at[0] + dx * c - dz * sn, z = t.at[1] + dx * sn + dz * c, y0 = base + up;
    if ('box' in s) {
      const win: WinSpec | undefined = s.lit ? interior(s.lit) : s.windows ? { cell: 1.7, storey: 3.2, lit: 0.5, kind: 0 } : undefined;
      block(b, x, z, s.box[0] / 2, s.box[1] / 2, y0, y0 + s.box[2], turn + THREE.MathUtils.degToRad(s.turn ?? 0), s.colour, s.top ?? s.colour, win, rnd());
    } else {
      b.cyl(x, z, y0, y0 + s.drum[2], s.drum[0], s.drum[1], s.sides ?? 12, s.colour, { cap: s.top ?? s.colour, win: s.lit ? interior(s.lit) : undefined, phase: (s.sides ?? 12) === 4 ? turn + Math.PI / 4 : undefined });
    }
  };
  for (const t of plan.things) {
    if (!t.solids?.length) continue;
    shapes++;
    const base = t.afloat ? WATER_LEVEL : ground.heightAt(t.at[0], t.at[1]);
    for (const s of t.solids) solid(t, s, base);
  }

  // --- plain volumes where the ordinary buildings will be ---
  let volumes = 0;
  for (const fill of plan.fills) {
    const st = STYLES[fill.style];
    if (!st) continue;
    const [x0, z0, x1, z1] = fill.area, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const yaw = THREE.MathUtils.degToRad(fill.turn ?? 0), c = Math.cos(yaw), s = Math.sin(yaw);
    const pitch = st.lot + st.gap, nx = Math.ceil((x1 - x0) / 2 / pitch), nz = Math.ceil((z1 - z0) / 2 / pitch);
    for (let i = -nx; i <= nx; i++) {
      for (let j = -nz; j <= nz; j++) {
        // try the plot where the grid puts it, then nudged, so that odd corners are filled too
        for (const [ox, oz] of [[0, 0], [0.35, 0], [0, 0.35], [-0.35, 0], [0, -0.35]]) {
          const lx = (i + ox) * pitch, lz = (j + oz) * pitch;
          if (Math.abs(lx) > (x1 - x0) / 2 || Math.abs(lz) > (z1 - z0) / 2) continue;
          const x = cx + lx * c - lz * s, z = cz + lx * s + lz * c;
          const tower = st.towers !== undefined && rnd() < st.towers[0];
          const hx = (st.lot * (0.8 + rnd() * 0.2)) / 2, hz = (st.lot * (0.8 + rnd() * 0.2)) / 2;
          if (!taken.free(x, z, hx + 0.5, hz + 0.5, yaw)) continue;
          taken.take(x, z, hx + st.gap / 2, hz + st.gap / 2, yaw);
          if (st.built !== undefined && rnd() > st.built) break;
          // it stands on the lowest ground under it
          let low = Infinity;
          for (const [px, pz] of [[0, 0], [-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]]) low = Math.min(low, ground.heightAt(x + px * c - pz * s, z + px * s + pz * c));
          const h = tower ? lerp(st.towers![1], st.towers![2], rnd() ** 1.4) : lerp(st.high[0], st.high[1], rnd() ** 1.6);
          const wall = pick(st.walls), roof = pick(st.roofs), base = low - 0.3, top = low + h;
          const glassy = tower && rnd() < 0.5;
          const win: WinSpec = { cell: glassy ? 1.5 : 1.7 + rnd() * 0.8, storey: h > 18 ? 4 : 3.2, lit: st.lit * (0.7 + rnd() * 0.6), kind: glassy ? 1 : rnd() < 0.2 ? 6 : 0 };
          block(b, x, z, hx, hz, base, top, yaw, wall, roof, win, rnd());
          if (!tower && st.gabled !== undefined && rnd() < st.gabled) gable(b, x, z, hx, hz, top, yaw, roof, wall, Math.min(hx, hz) * (0.5 + rnd() * 0.4));
          else if (tower) block(b, x, z, hx * 0.6, hz * 0.6, top, top + 3 + rnd() * 6, yaw, wall, roof, win, rnd());
          volumes++;
          break;
        }
      }
    }
  }

  const mesh = new THREE.Mesh(b.build(), makeCityMaterial());
  mesh.name = `${plan.id}: volumes`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { mesh, volumes, shapes, triangles: b.triangles };
}
