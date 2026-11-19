// Downtown's own buildings, and the Golden Gate Bridge, made the same way as the
// monuments in landmark-models.ts. Halo Tower, the showroom and the car park
// follow the look prototype; the Gate Tower and the bridge are fitted to the
// island, where the bridge crosses real water and has a length of its own.

import { interior, type V3, type WinSpec } from '../look/geo.ts';
import type { LandmarkCtx } from './landmark-models.ts';

const STOREY = 5;
const ASPHALT = 0x4a4c52;

/** Halo Tower's measures. Its ring is drawn apart from the tower, because its colour changes. */
export const HALO = { podiumR: 11, podiumH: 9, shaftR0: 7.2, shaftR1: 4.4, shaftTop: 120, podTop: 131, podR: 8.5, spireTop: 166, haloY: 110, haloR: 14.5 };

/** Halo Tower: an invented tower, a slim glass shaft with a pod near its top and a ring of light round it. */
export function haloTower({ b, glows, lights }: LandmarkCtx): void {
  const m = HALO;
  b.cyl(0, 0, 0, 0.12, 13.4, 13.4, 28, 0xd8d2c4);
  b.cyl(0, 0, 0.12, m.podiumH, m.podiumR, m.podiumR, 8, 0xe4ded0, { win: { cell: 4.3, storey: 4.6, lit: 0.9, kind: 2 }, seed: 0.42, cap: 0x9d988f });
  b.cyl(0, 0, m.podiumH, m.shaftTop, m.shaftR0, m.shaftR1, 8, 0x9cc3d3, { win: { cell: 2.0, storey: STOREY, lit: 0.6, kind: 1 }, seed: 0.77, cap: false });
  b.cyl(0, 0, m.shaftTop - 5, m.shaftTop, m.shaftR1 + 0.2, m.podR, 12, 0xd9d4ca, { cap: false });
  b.cyl(0, 0, m.shaftTop, m.podTop, m.podR, m.podR, 12, 0xa9c9dc, { win: { cell: 1.7, storey: 5.5, lit: 1, kind: 1 }, seed: 0.13, cap: 0x8d8a83 });
  b.cyl(0, 0, m.podTop, m.podTop + 3, m.podR - 2, 2.2, 12, 0x8d8a83, { cap: false });
  b.cyl(0, 0, m.podTop + 3, m.spireTop, 0.9, 0.15, 6, 0x9aa0a8, { cap: false });
  glows.push({ x: 0, y: m.spireTop + 0.4, z: 0, sx: 0.9, sy: 0.9, sz: 0.9, color: '#ff3b3b' });
  // the four spokes that carry the ring
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const r = (m.haloR + 5.2) / 2;
    b.obox(Math.cos(a) * r, m.haloY, Math.sin(a) * r, (m.haloR - 5.2) / 2, 0.22, 0.22, a, 0x9aa0a8, { faces: 'B' });
  }
  lights.push({ x: 0, z: 0, r: 26, color: '#c77dff', k: 0.5 });
}

/**
 * The Gate Tower: an office tower on two legs. A street runs through its base,
 * and the opening above the lintel is where the expressway will pass through it.
 */
export function gateTower({ b, glows, lights }: LandmarkCtx): void {
  const BODY = 0xb9c4cf, TRIM = 0x7f8891, ROOF = 0x8d8a83;
  const win: WinSpec = { cell: 2.3, storey: STOREY, lit: 0.5, kind: 0 };
  b.box(-14, 0, -16, 14, 36, -6.5, BODY, { win, seed: 0.21, faces: 'NESW' });
  b.box(-14, 0, 6.5, 14, 36, 16, BODY, { win, seed: 0.47, faces: 'NESW' });
  b.box(-14, 7.5, -6.5, 14, 18, 6.5, BODY, { win, seed: 0.33, faces: 'EWT', top: ASPHALT });
  b.box(-14, 36, -16, 14, 104, 16, BODY, { win, seed: 0.62, top: ROOF });
  // a dark band where the tower sits on its legs, and another at its head
  b.box(-14.08, 34.4, -16.08, 14.08, 36.4, 16.08, TRIM, { faces: 'NESW' });
  b.box(-14.08, 101.6, -16.08, 14.08, 104.4, 16.08, TRIM);
  b.box(-8, 104.4, -10, 8, 114, 10, 0xa9b4bf, { win, seed: 0.8, top: ROOF });
  b.cyl(0, 0, 114, 127, 0.6, 0.12, 6, 0xe9e9ec, { cap: false });
  glows.push({ x: 0, y: 127.4, z: 0, sx: 0.7, sy: 0.7, sz: 0.7, color: '#ff3b3b' });
  // the lamps of the road that will run through the opening
  for (const x of [-9, 0, 9]) glows.push({ x, y: 33.9, z: 0, sx: 3.2, sy: 0.14, sz: 0.5, color: '#ffe2ae' });
  lights.push({ x: 0, z: 0, r: 22, color: '#ffe2ae', k: 0.5 });
}

/** The showroom: a cutaway that opens to the south, with a turntable for the car on show. */
export function showroom({ b, glows, lights }: LandmarkCtx): void {
  const s = { x0: -16, z0: -6.5, x1: 16, z1: 6.5, h: 12 };
  const wall = 0xe9e3d6, inner = 0xf5f1e8;
  b.box(s.x0, 0, s.z0, s.x1, 0.06, s.z1, 0xe9e6df, { faces: 'T', win: interior(0.9) });
  b.box(s.x0, 0, s.z0, s.x1, s.h, s.z0 + 0.6, wall, { faces: 'NEWT' });
  b.box(s.x0 + 0.6, 0.06, s.z0 + 0.5, s.x1 - 0.6, s.h - 0.7, s.z0 + 0.6, inner, { faces: 'S', win: interior(0.75) });
  b.box(s.x0, 0, s.z0 + 0.6, s.x0 + 0.6, s.h, s.z1, wall, { faces: 'WST' });
  b.box(s.x0 + 0.5, 0.06, s.z0 + 0.6, s.x0 + 0.6, s.h - 0.7, s.z1, inner, { faces: 'E', win: interior(0.75) });
  b.box(s.x1 - 0.6, 0, s.z0 + 0.6, s.x1, s.h, s.z1, wall, { faces: 'EST' });
  b.box(s.x1 - 0.6, 0.06, s.z0 + 0.6, s.x1 - 0.5, s.h - 0.7, s.z1, inner, { faces: 'W', win: interior(0.75) });
  b.box(s.x0 - 0.4, s.h - 0.7, s.z0 - 0.2, s.x1 + 0.4, s.h, s.z1 + 0.9, 0xd9d4ca, { top: 0x8d8a83 });
  b.box(s.x0 + 0.6, s.h - 0.75, s.z0 + 0.6, s.x1 - 0.6, s.h - 0.7, s.z1, 0xffffff, { faces: 'B', win: interior(0.95) });
  for (const fx of [0.2, 0.5, 0.8]) {
    for (const fz of [0.3, 0.72]) {
      glows.push({ x: s.x0 + (s.x1 - s.x0) * fx, y: s.h - 0.85, z: s.z0 + (s.z1 - s.z0) * fz, sx: 1.6, sy: 0.14, sz: 0.5, color: '#fff3dc' });
    }
  }
  // the turntable
  b.cyl(0, 0.5, 0.06, 0.45, 5, 5, 28, 0xcfcbc2, { win: interior(0.6) });
  lights.push({ x: 0, z: s.z1 + 5, r: 20, color: '#fff0d6', k: 0.75 });
}

/** The car park: five open floors, a roof deck, and two spiral ramps on its south side. */
export function carPark({ b, glows, lights }: LandmarkCtx): void {
  const c = { x0: -22, x1: 22, z0: -22, z1: -2, floors: 5, roofY: 25 };
  const slab = 0xc4c0b6, wall = 0xb3aea3;
  b.box(c.x0, 0, c.z0, c.x1, 0.05, c.z1, slab, { faces: 'T', win: interior(0.5) });
  for (let f = 1; f < c.floors; f++) b.box(c.x0, f * STOREY - 0.5, c.z0, c.x1, f * STOREY, c.z1, slab, { faces: 'NESWTB', win: interior(0.5) });
  b.box(c.x0, c.roofY - 0.7, c.z0, c.x1, c.roofY, c.z1, slab, { top: ASPHALT });
  b.box(c.x0 + 0.6, c.roofY - 0.75, c.z0 + 0.6, c.x1 - 0.6, c.roofY - 0.7, c.z1, 0xffffff, { faces: 'B', win: interior(0.6) });
  // the back and side walls: plain outside, lit inside
  b.box(c.x0, 0, c.z0, c.x1, c.roofY + 1, c.z0 + 0.6, wall, { faces: 'NEWT' });
  b.box(c.x0 + 0.6, 0, c.z0 + 0.5, c.x1 - 0.6, c.roofY - 0.7, c.z0 + 0.6, 0xd9d5cb, { faces: 'S', win: interior(0.45) });
  b.box(c.x0, 0, c.z0 + 0.6, c.x0 + 0.6, c.roofY + 1, c.z1, wall, { faces: 'WST' });
  b.box(c.x0 + 0.5, 0, c.z0 + 0.6, c.x0 + 0.6, c.roofY - 0.7, c.z1, 0xd9d5cb, { faces: 'E', win: interior(0.45) });
  b.box(c.x1 - 0.6, 0, c.z0 + 0.6, c.x1, c.roofY + 1, c.z1, wall, { faces: 'EST' });
  b.box(c.x1 - 0.6, 0, c.z0 + 0.6, c.x1 - 0.5, c.roofY - 0.7, c.z1, 0xd9d5cb, { faces: 'W', win: interior(0.45) });
  // columns along the open side, and a strip of light under every floor
  for (let k = 1; k < 5; k++) {
    const x = c.x0 + ((c.x1 - c.x0) * k) / 5;
    b.box(x - 0.5, 0, c.z1 - 1, x + 0.5, c.roofY - 0.7, c.z1, wall);
  }
  for (let f = 0; f < c.floors; f++) {
    glows.push({ x: 0, y: f * STOREY + 4.25, z: c.z1 - 2.4, sx: c.x1 - c.x0 - 3, sy: 0.14, sz: 0.3, color: '#d8f0ff' });
  }
  lights.push({ x: -10, z: c.z1 + 5, r: 20, color: '#cfe8ff', k: 0.55 }, { x: 10, z: c.z1 + 5, r: 20, color: '#cfe8ff', k: 0.55 });

  // The two spirals. Each is a ring of short level slabs, every one a little higher
  // than the last: at this size that reads as a ramp.
  const R = 6.5, half = 2.6, per = 14, turns = c.roofY / STOREY;
  for (const cx of [-13, 13]) {
    const cz = 10, n = Math.round(per * turns);
    b.cyl(cx, cz, 0, c.roofY + 1.5, 3.3, 3.3, 10, wall, { cap: 0x8d8a83 });
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      const px = cx + Math.cos(a) * 9.5, pz = cz + Math.sin(a) * 9.5;
      b.box(px - 0.3, 0, pz - 0.3, px + 0.3, c.roofY + 0.9, pz + 0.3, wall);
    }
    for (let i = 0; i <= n; i++) {
      // the top of each spiral comes out on its north side, facing the roof
      const a = -Math.PI / 2 - (1 - i / n) * turns * Math.PI * 2 * (cx < 0 ? 1 : -1);
      const y = (c.roofY * i) / n;
      const long = R * Math.tan(Math.PI / per) * 1.2;
      b.obox(cx + Math.cos(a) * R, y - 0.3, cz + Math.sin(a) * R, half, 0.3, long, a, slab, { top: ASPHALT, faces: 'B' });
      b.obox(cx + Math.cos(a) * (R + half), y + 0.45, cz + Math.sin(a) * (R + half), 0.14, 0.45, long * 1.35, a, wall);
    }
    // the short bridge from the spiral to the roof
    b.box(cx - half, c.roofY - 0.6, c.z1, cx + half, c.roofY, cz - R + half, slab, { top: ASPHALT, faces: 'EWTB' });
    lights.push({ x: cx, z: cz, r: 15, color: '#cfe8ff', k: 0.5 });
  }
}

/**
 * The Golden Gate Bridge: two red towers, the cables over them and the hangers
 * down to the deck. Built along z around its middle; `deckY` is the top of the road.
 */
export function goldenGate(ctx: LandmarkCtx, length: number, halfDeck: number, deckY: number): void {
  const { b } = ctx;
  const RED = 0xc8402a;
  const g = interior(0.6);
  const top = Math.min(46, length * 0.56);
  const z0 = -length / 4, z1 = length / 4, reach = length / 4;
  const hw = halfDeck + 0.72; // the towers stand just outside the deck
  for (const z of [z0, z1]) {
    for (const side of [-1, 1]) {
      const x = side * hw;
      b.box(x - 0.75, -1, z - 0.75, x + 0.75, top * 0.54, z + 0.75, RED, { win: g });
      b.box(x - 0.6, top * 0.54, z - 0.6, x + 0.6, top * 0.79, z + 0.6, RED, { win: g });
      b.box(x - 0.48, top * 0.79, z - 0.48, x + 0.48, top, z + 0.48, RED, { win: g });
      ctx.glows.push({ x, y: top + 0.5, z, sx: 0.6, sy: 0.6, sz: 0.6, color: '#ff3b3b' });
    }
    for (const f of [0.3, 0.55, 0.72, 0.87]) {
      b.box(-hw, top * f, z - 0.42, hw, top * f + (f > 0.5 ? 1.4 : 2.0), z + 0.42, RED, { win: g, faces: 'NESWTB' });
    }
    b.box(-hw, top - 2.7, z - 0.42, hw, top - 1.3, z + 0.42, RED, { win: g, faces: 'NESWTB' });
    ctx.lights.push({ x: 0, z, r: 11, color: '#ffb48a', k: 0.5 });
  }
  const low = deckY + 1.9;
  for (const side of [-1, 1]) {
    const x = side * hw;
    const pts: V3[] = [];
    // up from the far anchorage, over both towers, and down again
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      pts.push([x, deckY + (top - deckY) * (t * t * 0.55 + t * 0.45), z0 - reach + reach * t]);
    }
    for (let i = 1; i <= 14; i++) {
      const u = (i / 14) * 2 - 1;
      pts.push([x, low + (top - low) * u * u, (z0 + z1) / 2 + (u * (z1 - z0)) / 2]);
    }
    for (let i = 1; i <= 6; i++) {
      const t = 1 - i / 6;
      pts.push([x, deckY + (top - deckY) * (t * t * 0.55 + t * 0.45), z1 + reach * (1 - t)]);
    }
    b.sweep(pts, pts.map(() => 0.28), RED, { win: g });
    // the hangers from the cable down to the deck
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i];
      if (p[1] - deckY < 1.2) continue;
      b.box(x - 0.08, deckY, p[2] - 0.08, x + 0.08, p[1], p[2] + 0.08, RED, { faces: 'NESW' });
    }
    // the red girder along the deck's edge
    const gx = side * (halfDeck + 0.14);
    b.box(gx - 0.16, deckY - 1.7, z0 - reach, gx + 0.16, deckY + 1.1, z1 + reach, RED, { win: g, faces: 'NESWTB' });
  }
}
