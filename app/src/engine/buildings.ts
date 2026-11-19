// Ordinary buildings: a box of a given style on a lot, with a roof, and with
// signs if it is a shop. A tile says what its styles look like and what its
// signs say; this file builds them.

import type { V3, WinSpec } from './geo';
import { FACE_NORMAL, FACE_RIGHT } from './signs';
import type { Build } from './tile';

/** `hip` is a pitched roof. `none` leaves the top bare, for a part of a larger building. */
export type Roof = 'bare' | 'units' | 'tank' | 'helipad' | 'garden' | 'hip' | 'none';

/** One building, or one box of a building made of several. */
export interface Lot {
  /** Its north-west corner and its size. */
  x: number; z: number; w: number; d: number;
  /** Where it starts and how high it goes. */
  y0: number; y1: number;
  /** One of the tile's styles, by name. */
  style: string;
  /** Picks its colour from the style's palette. */
  tint: number;
  roof: Roof;
  /** A narrower storey on top, set in by `inset` and `h` high. */
  crown?: { inset: number; h: number };
  /** A mast on the roof, this high. */
  spire?: number;
  /** The faces that carry signs, as compass letters: 'SE', or '' for none. */
  signs: string;
  /** A lit name near the top, on all four sides: the id of a sign. */
  sign?: string;
  /** Part of a larger building: no ground floor shopfront, no roof details. */
  part?: boolean;
}

export interface StyleDef {
  /** The colours a building of this style may have. */
  palette: number[];
  win: WinSpec;
  /** Whether its ground floor is shops, with a sign over each front. */
  shops?: boolean;
  /** A dark building trimmed with light, with a sign that stands out from the wall and a billboard on the roof. */
  neon?: boolean;
}

/** The signs a building draws from: over shopfronts, standing out from walls, and on rooftops. */
export interface SignPool { fascia: string[]; blade: string[]; billboard: string[] }

export interface BuildingRules<L extends Lot = Lot> {
  styles: Record<string, StyleDef>;
  /** The colours of flat roofs. */
  roofs: number[];
  /** What covers a pitched roof on this lot, and whether it has chimneys. */
  hip(lot: L): { colors: number[]; chimneys?: boolean };
  /** The signs this lot draws from. */
  pool(lot: L): SignPool;
  /** The colours of the strips of light on neon buildings. */
  neon: string[];
}

/**
 * Builds every lot in the list. `special` is asked about each one first: if it
 * answers true it has built that lot itself, as a tile does for a landmark.
 */
export function ordinaryBuildings<L extends Lot>(k: Build, lots: L[], rules: BuildingRules<L>, special?: (lot: L, i: number) => boolean): void {
  const cityB = k.b, glows = k.glows, lights = k.lights, signs = k.signs, atlas = k.signs.atlas, rand = k.rand;

  function parapet(x0: number, z0: number, x1: number, z1: number, y: number, color: number): void {
    if (x1 - x0 < 4 || z1 - z0 < 4) return;
    const t = 0.4, h = 0.7;
    cityB.box(x0, y, z0, x1, y + h, z0 + t, color);
    cityB.box(x0, y, z1 - t, x1, y + h, z1, color);
    cityB.box(x0, y, z0 + t, x0 + t, y + h, z1 - t, color, { faces: 'EWT' });
    cityB.box(x1 - t, y, z0 + t, x1, y + h, z1 - t, color, { faces: 'EWT' });
  }

  /** A pitched roof with four slopes, standing a little proud of the walls. */
  function hipRoof(x0: number, z0: number, x1: number, z1: number, y: number, color: number, chimneys: boolean): void {
    const o = 0.45;
    const ax0 = x0 - o, az0 = z0 - o, ax1 = x1 + o, az1 = z1 + o;
    const w = ax1 - ax0, d = az1 - az0;
    const run = Math.min(w, d) / 2;
    const rise = Math.min(5.2, run * 0.62);
    const cx = (ax0 + ax1) / 2, cz = (az0 + az1) / 2;
    const A: V3 = [ax0, y, az0], B: V3 = [ax1, y, az0], C: V3 = [ax1, y, az1], D: V3 = [ax0, y, az1];
    const len = Math.hypot(run, rise);
    const n = (nx: number, nz: number): V3 => [(nx * rise) / len, run / len, (nz * rise) / len];
    if (w >= d) {
      const R0: V3 = [ax0 + run, y + rise, cz], R1: V3 = [ax1 - run, y + rise, cz];
      cityB.quad(D, C, R1, R0, n(0, 1), color);
      cityB.quad(B, A, R0, R1, n(0, -1), color);
      cityB.tri(A, D, R0, n(-1, 0), color);
      cityB.tri(C, B, R1, n(1, 0), color);
    } else {
      const R0: V3 = [cx, y + rise, az0 + run], R1: V3 = [cx, y + rise, az1 - run];
      cityB.quad(A, D, R1, R0, n(-1, 0), color);
      cityB.quad(C, B, R0, R1, n(1, 0), color);
      cityB.tri(B, A, R0, n(0, -1), color);
      cityB.tri(D, C, R1, n(0, 1), color);
    }
    cityB.box(ax0, y - 0.3, az0, ax1, y, az1, 0xe9e3d6, { faces: 'NESW' });
    if (chimneys) {
      for (const [fx, fz] of [[0.3, 0.34], [0.72, 0.62]]) {
        const px = x0 + (x1 - x0) * fx, pz = z0 + (z1 - z0) * fz;
        cityB.box(px - 0.5, y, pz - 0.5, px + 0.5, y + rise + 0.9, pz + 0.5, 0xa5674f, { top: 0x4a4f55 });
      }
    }
  }

  function roofDetails(b: L, x0: number, z0: number, x1: number, z1: number, y: number): void {
    const w = x1 - x0, d = z1 - z0;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (b.roof === 'none') return;
    if (b.roof === 'hip') {
      const hip = rules.hip(b);
      hipRoof(x0, z0, x1, z1, y, hip.colors[b.tint % hip.colors.length], hip.chimneys === true);
      return;
    }
    parapet(x0, z0, x1, z1, y, 0xb0aca4);
    const unit = () => {
      const ux = x0 + 1.2 + rand() * Math.max(0.1, w - 4.6), uz = z0 + 1.2 + rand() * Math.max(0.1, d - 3.8);
      cityB.box(ux, y, uz, ux + 2.2, y + 1.6, uz + 1.4, 0xb9bcc0);
    };
    if (b.roof === 'units') {
      const n = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) unit();
      cityB.box(x0 + 1.5, y, z0 + 1.5, x0 + 5, y + 3, z0 + 4.5, 0xa39f97);
    } else if (b.roof === 'tank') {
      const tx = x1 - 3.4, tz = z1 - 3.4;
      for (const [ox, oz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) cityB.box(tx + ox - 0.15, y, tz + oz - 0.15, tx + ox + 0.15, y + 1.3, tz + oz + 0.15, 0x5d5a55);
      cityB.cyl(tx, tz, y + 1.2, y + 4, 1.5, 1.5, 8, 0x9b7653);
      cityB.cyl(tx, tz, y + 4, y + 5, 1.65, 0.15, 8, 0x6b6f76, { cap: false });
      unit();
    } else if (b.roof === 'helipad') {
      const R = Math.min(w, d) / 2 - 1.6;
      cityB.cyl(cx, cz, y, y + 0.25, R, R, 18, 0x4b5560);
      cityB.cyl(cx, cz, y + 0.25, y + 0.3, R - 0.6, R - 0.6, 18, 0xe9c94a);
      cityB.cyl(cx, cz, y + 0.3, y + 0.34, R - 1.3, R - 1.3, 18, 0x4b5560);
    } else if (b.roof === 'garden') {
      cityB.box(x0 + 1, y, z0 + 1, x1 - 1, y + 0.5, z1 - 1, 0x6aa457);
      cityB.box(x0 + 2, y + 0.5, z0 + 2, x0 + 3.6, y + 1.9, z0 + 3.6, 0x4f8f4a);
      cityB.box(x1 - 4, y + 0.5, z1 - 3.8, x1 - 2.2, y + 2.1, z1 - 2, 0x5f9f4e);
    } else if (w > 10) {
      cityB.box(x0 + 1.5, y, z0 + 1.5, x0 + 4.5, y + 2.6, z0 + 4, 0xa39f97);
    }
  }

  function signage(b: L, idx: number): void {
    if (b.part || b.y0 > 0) return;
    const faces = b.signs;
    const style = rules.styles[b.style];
    const isNeon = style.neon === true;
    if (!style.shops && !isNeon) return;
    const pool = rules.pool(b);
    let k = idx;
    for (const face of faces) {
      const n = FACE_NORMAL[face], R = FACE_RIGHT[face];
      const ns = face === 'N' || face === 'S';
      const faceLen = ns ? b.w : b.d;
      const fx = face === 'E' ? b.x + b.w : face === 'W' ? b.x : b.x + b.w / 2;
      const fz = face === 'S' ? b.z + b.d : face === 'N' ? b.z : b.z + b.d / 2;
      const id = pool.fascia[k++ % pool.fascia.length];
      const h = isNeon ? 3.0 : 2.1;
      const cy = b.y1 < 7.6 ? b.y1 + h / 2 + 0.25 : isNeon ? 6.3 : 5.7;
      signs.add(id, fx + n[0] * 0.12, cy, fz + n[2] * 0.12, face, h, faceLen - 1.5);
      const col = atlas.rects.get(id)!.color;
      lights.push({ x: fx + n[0] * 4, z: fz + n[2] * 4, r: isNeon ? 15 : 10, color: col, k: isNeon ? 0.6 : 0.4 });
      lights.push({ x: fx + n[0] * 2.5, z: fz + n[2] * 2.5, r: 8, color: '#ffd9a8', k: 0.35 });

      if (isNeon && b.y1 >= 14) {
        // a blade sign that stands out from the wall, readable from both sides
        const bid = pool.blade[(idx + k) % pool.blade.length];
        const rect = atlas.rects.get(bid)!;
        const bh = Math.min(b.y1 - 8, 15), bw = bh * rect.aspect;
        const along = faceLen / 2 - 0.9;
        const bx = fx + R[0] * along + n[0] * (0.35 + bw / 2), bz = fz + R[2] * along + n[2] * (0.35 + bw / 2);
        const by = 7.5 + bh / 2;
        for (const f2 of ns ? ['E', 'W'] : ['S', 'N']) {
          const n2 = FACE_NORMAL[f2];
          signs.add(bid, bx + n2[0] * 0.1, by, bz + n2[2] * 0.1, f2, bh);
        }
        if (ns) cityB.box(bx - 0.08, by - bh / 2, bz - bw / 2, bx + 0.08, by + bh / 2, bz + bw / 2, 0x14141c);
        else cityB.box(bx - bw / 2, by - bh / 2, bz - 0.08, bx + bw / 2, by + bh / 2, bz + 0.08, 0x14141c);
        lights.push({ x: bx + n[0] * 3, z: bz + n[2] * 3, r: 12, color: rect.color, k: 0.5 });
      }
    }
    if (isNeon) {
      const col = rules.neon[idx % rules.neon.length];
      const y = b.y1 + 0.85;
      glows.push({ x: b.x + b.w / 2, y, z: b.z + 0.2, sx: b.w, sy: 0.3, sz: 0.3, color: col });
      glows.push({ x: b.x + b.w / 2, y, z: b.z + b.d - 0.2, sx: b.w, sy: 0.3, sz: 0.3, color: col });
      glows.push({ x: b.x + 0.2, y, z: b.z + b.d / 2, sx: 0.3, sy: 0.3, sz: b.d, color: col });
      glows.push({ x: b.x + b.w - 0.2, y, z: b.z + b.d / 2, sx: 0.3, sy: 0.3, sz: b.d, color: col });
      if (b.y1 <= 50) {
        // a billboard on the roof, readable from the south and from the north
        const board = pool.billboard[idx % pool.billboard.length];
        const cx = b.x + b.w / 2, cz = b.z + b.d / 2;
        const bh = Math.min(5, (b.w - 1) / atlas.rects.get(board)!.aspect);
        const cy = b.y1 + 1.8 + bh / 2;
        const bw = signs.add(board, cx, cy, cz + 0.12, 'S', bh, b.w - 1);
        signs.add(board, cx, cy, cz - 0.12, 'N', bh, b.w - 1);
        cityB.box(cx - bw / 2, cy - bh / 2, cz - 0.1, cx + bw / 2, cy + bh / 2, cz + 0.1, 0x14141c);
        cityB.box(cx - bw / 2 + 0.6, b.y1, cz - 0.15, cx - bw / 2 + 0.9, cy - bh / 2, cz + 0.15, 0x5d5a55);
        cityB.box(cx + bw / 2 - 0.9, b.y1, cz - 0.15, cx + bw / 2 - 0.6, cy - bh / 2, cz + 0.15, 0x5d5a55);
      }
    }
  }

  lots.forEach((b, i) => {
    if (special?.(b, i)) return;
    const pal = rules.styles[b.style].palette;
    const color = pal[b.tint % pal.length];
    const seed = (i * 0.618034) % 1;
    const win = rules.styles[b.style].win;
    const roofCol = rules.roofs[i % rules.roofs.length];
    let x0 = b.x, z0 = b.z, x1 = b.x + b.w, z1 = b.z + b.d, top = b.y1;
    cityB.box(x0, b.y0, z0, x1, b.y1, z1, color, { win, seed, top: roofCol });
    if (b.crown) {
      parapet(x0, z0, x1, z1, b.y1, 0xb0aca4);
      x0 += b.crown.inset; z0 += b.crown.inset; x1 -= b.crown.inset; z1 -= b.crown.inset;
      top = b.y1 + b.crown.h;
      cityB.box(x0, b.y1, z0, x1, top, z1, color, { win, seed: seed + 0.31, top: roofCol });
      parapet(x0, z0, x1, z1, top, 0xb0aca4);
    }
    roofDetails(b, x0, z0, x1, z1, top);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (b.spire) {
      cityB.cyl(cx, cz, top, top + b.spire, 0.55, 0.12, 6, 0x9aa0a8, { cap: false });
      glows.push({ x: cx, y: top + b.spire + 0.3, z: cz, sx: 0.8, sy: 0.8, sz: 0.8, color: '#ff3b3b' });
    } else if (top > 85) {
      glows.push({ x: x0 + 0.5, y: top + 1.1, z: z0 + 0.5, sx: 0.6, sy: 0.6, sz: 0.6, color: '#ff3b3b' });
      glows.push({ x: x1 - 0.5, y: top + 1.1, z: z1 - 0.5, sx: 0.6, sy: 0.6, sz: 0.6, color: '#ff3b3b' });
    }
    signage(b, i);
    const crown = b.sign;
    if (crown) {
      signs.add(crown, b.x + b.w / 2, b.y1 - 4.5, b.z + b.d + 0.12, 'S', 4.4, b.w - 2);
      signs.add(crown, b.x + b.w + 0.12, b.y1 - 4.5, b.z + b.d / 2, 'E', 4.4, b.d - 2);
      signs.add(crown, b.x + b.w / 2, b.y1 - 4.5, b.z - 0.12, 'N', 4.4, b.w - 2);
      signs.add(crown, b.x - 0.12, b.y1 - 4.5, b.z + b.d / 2, 'W', 4.4, b.d - 2);
    }
  });
}
