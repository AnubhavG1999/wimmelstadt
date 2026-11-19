// What stands on the Japan tile: its towers, temples and shrines, its castle
// and its stations. Each is a few dozen boxes, cylinders and bars: enough for
// the silhouette. Their places come from plan.ts.
//
// Shrines and temples are drawn plainly and with care: their own colours, their
// own shapes, and nothing added for a laugh.

import { placed } from '../../engine/build';
import type { GeoBuilder, V3, WinSpec } from '../../engine/geo';
import { interior } from '../../engine/geo';
import type { Build } from '../../engine/tile';
import { CASTLE, INARI, KINKAKU, KYOTO_HILL, KYOTO_TOWER, MOAT, PAGODA, RAIL, SENSOJI, SHORE, TOKYO_STATION, TOKYO_TOWER, TORII } from './plan';
import { lantern } from './props';
import { groundHeight } from './terrain';

const Q = Math.PI / 4;
/** A four-sided "cylinder" is measured to its corners: this turns half a width into that radius. */
const D = Math.SQRT2;
const VERMILION = 0xd8432b, TILE = 0x4a4f55, DARK_TILE = 0x3d4347, PLASTER = 0xf1ede2, WOOD = 0x6b3b2a, GOLD = 0xd9b24a, STONE = 0x9a968c;

/** A shape turned from a profile of [height, radius] pairs, as on a lathe. */
export function turnedShape(b: GeoBuilder, cx: number, cz: number, profile: [number, number][], sides: number, color: number, win?: WinSpec): void {
  for (let i = 0; i < profile.length - 1; i++) {
    const [y0, r0] = profile[i], [y1, r1] = profile[i + 1];
    b.cyl(cx, cz, y0, y1, r0, r1, sides, color, { win, cap: i === profile.length - 2 ? color : false });
  }
}

/**
 * The sloping sides between one rectangle and a smaller one above it: an eave
 * that sweeps in, or the battered stone of a castle's base. Each rectangle is
 * [x0, z0, x1, z1].
 */
export function slopes(b: GeoBuilder, low: number[], y0: number, high: number[], y1: number, color: number, win?: WinSpec): void {
  const [a0, c0, a1, c1] = low, [e0, g0, e1, g1] = high;
  const rise = y1 - y0;
  b.quad([a0, y0, c1], [a1, y0, c1], [e1, y1, g1], [e0, y1, g1], [0, c1 - g1, rise], color, { win });
  b.quad([a1, y0, c0], [a0, y0, c0], [e0, y1, g0], [e1, y1, g0], [0, g0 - c0, -rise], color, { win });
  b.quad([a1, y0, c1], [a1, y0, c0], [e1, y1, g0], [e1, y1, g1], [rise, a1 - e1, 0], color, { win });
  b.quad([a0, y0, c0], [a0, y0, c1], [e0, y1, g1], [e0, y1, g0], [-rise, e0 - a0, 0], color, { win });
}

/**
 * A tiled roof over a rectangle, as on a temple or a castle: eaves that stand
 * well out and sweep up gently, and steeper slopes above them to a ridge.
 * `over` is how far the eaves stand out, `rise` how high the ridge is.
 */
export function tiledRoof(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, rise: number, over: number, color = TILE, under = WOOD): void {
  const e = [x0 - over, z0 - over, x1 + over, z1 + over];
  const m = [x0 - over * 0.25, z0 - over * 0.25, x1 + over * 0.25, z1 + over * 0.25];
  // the underside of the eaves, and their edge
  b.quad([e[0], y, e[1]], [e[2], y, e[1]], [e[2], y, e[3]], [e[0], y, e[3]], [0, -1, 0], under);
  slopes(b, e, y, [e[0], e[1], e[2], e[3]], y + 0.3, color);
  slopes(b, e, y + 0.3, m, y + 0.3 + rise * 0.3, color);
  // above the eaves: two long slopes and two hips, up to the ridge
  const w = m[2] - m[0], d = m[3] - m[1], run = Math.min(w, d) / 2, top = y + 0.3 + rise, base = y + 0.3 + rise * 0.3;
  const cx = (m[0] + m[2]) / 2, cz = (m[1] + m[3]) / 2;
  if (w >= d) slopes(b, m, base, [m[0] + run * 0.82, cz - 0.02, m[2] - run * 0.82, cz + 0.02], top, color);
  else slopes(b, m, base, [cx - 0.02, m[1] + run * 0.82, cx + 0.02, m[3] - run * 0.82], top, color);
  // the ridge
  if (w >= d) b.box(m[0] + run * 0.8, top - 0.1, cz - 0.28, m[2] - run * 0.8, top + 0.42, cz + 0.28, DARK_TILE, { faces: 'NESWT' });
  else b.box(cx - 0.28, top - 0.1, m[1] + run * 0.8, cx + 0.28, top + 0.42, m[3] - run * 0.8, DARK_TILE, { faces: 'NESWT' });
}

const RED_LAMP = '#ff3b3b';

// ---------------------------------------------------------------------------
// Tokyo Tower
// ---------------------------------------------------------------------------

/**
 * Tokyo Tower: four legs of lattice that lean in to a point, in orange and
 * white, with a deck of two storeys half way up and a smaller one near the
 * top. At night the whole of it is lit orange from within.
 */
function tokyoTower(k: Build): void {
  const b = k.b, { x: cx, z: cz, h: H } = TOKYO_TOWER;
  const ORANGE = 0xe8541f, WHITE = 0xf4f1ea, glow = interior(0.9);
  // half its width at each of the heights where a girder runs round it
  const levels: [number, number][] = [[0, TOKYO_TOWER.foot], [9, 11.1], [20, 8.8], [34, 6.7], [48, 5.1], [56, 4.35], [63, 3.75], [70, 3.2], [77, 2.7], [84, 2.25], [91, 1.6]];
  // orange below the main deck, then bands of white and orange, as it is painted
  const colorOf = (i: number): number => (i < 4 ? ORANGE : (i - 4) % 2 === 0 ? WHITE : ORANGE);
  const corner = (i: number, j: number): V3 => {
    const [y, w] = levels[i], a = Q + (j * Math.PI) / 2;
    return [cx + Math.cos(a) * w * D, y, cz + Math.sin(a) * w * D];
  };
  for (let i = 0; i + 1 < levels.length; i++) {
    const thick = 0.95 - i * 0.055, color = colorOf(i);
    for (let j = 0; j < 4; j++) {
      // a leg, the girder at the top of this stage, and two braces that cross on each face
      b.beam(corner(i, j), corner(i + 1, j), thick, thick - 0.055, color, { win: glow });
      b.beam(corner(i + 1, j), corner(i + 1, j + 1), 0.26, 0.26, color, { win: glow });
      b.beam(corner(i, j), corner(i + 1, j + 1), 0.15, 0.15, color, { win: glow });
      b.beam(corner(i, j + 1), corner(i + 1, j), 0.15, 0.15, color, { win: glow });
    }
  }
  // the building under it, between the legs
  b.box(cx - 8.5, 0, cz - 8.5, cx + 8.5, 7.5, cz + 8.5, 0xcfc4b4, { win: { cell: 2.8, storey: 3.75, lit: 0.7, kind: 2 }, seed: 0.23, top: 0x8d8a83 });
  b.box(cx - 5, 7.5, cz - 5, cx + 5, 9.6, cz + 5, 0xbdb2a2, { win: { cell: 2.5, storey: 2.1, lit: 0.5, kind: 0 }, seed: 0.6, top: 0x8d8a83 });
  // the main deck, and the smaller one above
  b.box(cx - 6.5, 47.6, cz - 6.5, cx + 6.5, 48.4, cz + 6.5, ORANGE, { win: glow });
  b.box(cx - 6.1, 48.4, cz - 6.1, cx + 6.1, 54.2, cz + 6.1, WHITE, { win: { cell: 1.5, storey: 2.9, lit: 1, kind: 1 }, seed: 0.4 });
  b.box(cx - 6.5, 54.2, cz - 6.5, cx + 6.5, 54.9, cz + 6.5, WHITE, { win: glow });
  b.box(cx - 3.1, 84, cz - 3.1, cx + 3.1, 87.4, cz + 3.1, WHITE, { win: { cell: 1.2, storey: 3.4, lit: 1, kind: 1 }, seed: 0.7 });
  b.box(cx - 3.4, 87.4, cz - 3.4, cx + 3.4, 88, cz + 3.4, ORANGE, { win: glow });
  // the mast
  turnedShape(b, cx, cz, [[91, 1.5], [96, 0.9], [102, 0.6]], 6, WHITE, glow);
  turnedShape(b, cx, cz, [[102, 0.55], [108, 0.32], [H, 0.1]], 6, ORANGE, glow);
  k.glows.push({ x: cx, y: H + 0.5, z: cz, sx: 0.7, sy: 0.7, sz: 0.7, color: RED_LAMP });
  for (let j = 0; j < 4; j++) {
    const [x, , z] = corner(4, j);
    k.glows.push({ x, y: 55.6, z, sx: 0.5, sy: 0.5, sz: 0.5, color: RED_LAMP });
  }
  k.lights.push({ x: cx, z: cz, r: 30, color: '#ff9a4d', k: 0.65 }, { x: cx, z: cz + 12, r: 16, color: '#ffe2ae', k: 0.5 });
}

// ---------------------------------------------------------------------------
// Kyoto Tower and the pagoda: the island's models, on this tile's ground
// ---------------------------------------------------------------------------

/** Kyoto Tower: a white candle with a red-ringed lantern, standing on a hotel block. */
function kyotoTower(k: Build): void {
  const b = k.b, l = KYOTO_TOWER;
  const WHITE = 0xf1eee6, RED = 0xe2532f, ROOF = 0x8d8a83;
  const cx = l.x + l.w / 2, cz = l.z + l.d / 2, H = l.h;
  // the block it stands on: shops below, hotel rooms above
  b.box(l.x + 0.5, 0, l.z + 0.5, l.x + l.w - 0.5, 12.5, l.z + l.d - 0.5, 0xe6e1d6, { win: { cell: 2.6, storey: 5, lit: 0.5, kind: 2 }, seed: 0.37, top: ROOF });
  b.box(l.x + 2.4, 12.5, l.z + 2.4, l.x + l.w - 2.4, 16, l.z + l.d - 2.4, 0xdcd6c9, { win: { cell: 2.3, storey: 3.5, lit: 0.45, kind: 0 }, seed: 0.52, top: ROOF });
  // the shaft: slender at the waist, flaring towards the lantern
  const y0 = 16, yPod = H * 0.72;
  turnedShape(b, cx, cz, [[y0, 3.0], [y0 + 3, 2.1], [y0 + (yPod - y0) * 0.55, 1.45], [yPod - 2.5, 1.9], [yPod, 3.3]], 12, WHITE, interior(0.55));
  // the lantern: a red ring, a band of windows and a white cap
  b.cyl(cx, cz, yPod, yPod + 1.3, 4.3, 4.3, 14, RED, { win: interior(0.9), cap: RED });
  b.cyl(cx, cz, yPod + 1.3, yPod + 3.6, 3.7, 3.7, 14, 0x9cc3d3, { win: { cell: 1.1, storey: 2.3, lit: 1, kind: 1 }, seed: 0.2, cap: WHITE });
  b.cyl(cx, cz, yPod + 3.6, yPod + 4.4, 4.0, 3.5, 14, WHITE, { win: interior(0.5), cap: WHITE });
  b.cyl(cx, cz, yPod + 4.4, yPod + 6.6, 2.4, 1.2, 12, WHITE, { win: interior(0.5), cap: WHITE });
  b.cyl(cx, cz, yPod + 6.6, H - 4, 0.7, 0.4, 8, RED, { win: interior(0.6), cap: false });
  b.cyl(cx, cz, H - 4, H, 0.28, 0.06, 6, 0xe9e9ec, { cap: false });
  k.glows.push({ x: cx, y: H + 0.4, z: cz, sx: 0.55, sy: 0.55, sz: 0.55, color: RED_LAMP });
  k.lights.push({ x: cx, z: cz + l.d / 2 + 3, r: 12, color: '#ffe9c4', k: 0.5 }, { x: cx + l.w / 2 + 3, z: cz, r: 12, color: '#ffe9c4', k: 0.5 });
}

/** A five-storey pagoda in a gravel yard, lit from within like a lantern. It is built round (0, 0). */
function pagoda(k: Build, h: number): void {
  const b = k.b;
  const RED = 0xc8402a, WHITE = 0xf4e6c8;
  b.box(-6.2, 0, -6.2, 6.2, 0.1, 6.2, 0xd8d2c4, { faces: 'T' });
  b.box(-5, 0.1, -5, 5, 0.9, 5, 0xb9b2a2);
  const tiers = 5;
  let y = 0.9;
  const tierH = (h * 0.78 - y) / tiers;
  for (let i = 0; i < tiers; i++) {
    const hw = 3.5 - i * 0.42; // half the width of this storey
    const bodyH = tierH * 0.56;
    // paper walls that glow at night, storey above storey
    b.box(-hw, y, -hw, hw, y + bodyH, hw, WHITE, { win: interior(1.15) });
    // a red rail around the storey, and red posts at its corners
    b.box(-hw - 0.3, y, -hw - 0.3, hw + 0.3, y + 0.5, hw + 0.3, RED);
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      b.box(sx * hw - 0.22, y + 0.5, sz * hw - 0.22, sx * hw + 0.22, y + bodyH, sz * hw + 0.22, RED, { faces: 'NESW' });
    }
    // the roof: a wide eave that sweeps in to the storey above
    const eave = hw + 2.3 - i * 0.12, next = hw - 0.17;
    b.cyl(0, 0, y + bodyH, y + bodyH + 0.35, eave * D, eave * D, 4, WOOD, { phase: Q, cap: false });
    b.cyl(0, 0, y + bodyH + 0.35, y + tierH, eave * D, next * D, 4, DARK_TILE, { phase: Q, cap: DARK_TILE });
    y += tierH;
  }
  // the finial: a mast with rings
  b.cyl(0, 0, y, y + 1.0, 0.9, 0.5, 8, DARK_TILE, { cap: false });
  b.cyl(0, 0, y + 1.0, h, 0.2, 0.05, 6, GOLD, { win: interior(0.6), cap: false });
  for (let n = 0; n < 5; n++) {
    const r = 0.62 - n * 0.07;
    b.cyl(0, 0, y + 1.6 + n * 0.75, y + 1.85 + n * 0.75, r, r, 8, GOLD, { win: interior(0.6) });
  }
  // stone lanterns on either side of the way in
  for (const side of [-1, 1]) stoneLantern(k, side * 2.4, 4.9);
  k.lights.push({ x: 0, z: 0, r: 14, color: '#ffb48a', k: 0.55 });
}

/** A stone lantern: a post, a lit box and a cap. */
export function stoneLantern(k: Build, x: number, z: number, y = 0): void {
  const b = k.b;
  b.box(x - 0.25, y, z - 0.25, x + 0.25, y + 1.3, z + 0.25, STONE);
  b.box(x - 0.45, y + 1.3, z - 0.45, x + 0.45, y + 1.9, z + 0.45, 0xfff1c9, { win: interior(3) });
  b.cyl(x, z, y + 1.9, y + 2.5, 0.85, 0.1, 4, STONE, { phase: Q, cap: false });
  k.lights.push({ x, z, r: 6, color: '#ffd9a0', k: 0.45 });
}

// ---------------------------------------------------------------------------
// Shrines: gates, the great torii in the water, and Fushimi Inari
// ---------------------------------------------------------------------------

/**
 * A torii: two posts, a tie beam, and a lintel whose ends turn up. It is built
 * round (x, z), `half` wide to either side, and faces along `yaw`.
 */
export function torii(k: Build, x: number, z: number, yaw: number, half: number, top: number, y = 0, color = VERMILION): void {
  const b = k.b, rx = -Math.sin(yaw), rz = Math.cos(yaw), post = Math.max(0.16, half * 0.085);
  const glow = interior(0.4), BLACK = 0x23262b;
  for (const s of [-1, 1]) {
    const px = x + rx * half * s, pz = z + rz * half * s;
    b.obox(px, y + 0.3, pz, post * 1.35, 0.3, post * 1.35, yaw, BLACK);
    b.obox(px, y + 0.6 + (top - 0.6 - top * 0.16) / 2, pz, post, (top - 0.6 - top * 0.16) / 2, post, yaw, color, { win: glow });
  }
  // the tie beam through the posts, and the two beams of the lintel
  b.obox(x, y + top * 0.72, z, post * 0.8, top * 0.035, half + post * 2.2, yaw, color, { faces: 'B', win: glow });
  b.obox(x, y + top * 0.88, z, post * 1.1, top * 0.04, half + post * 4, yaw, color, { faces: 'B', win: glow });
  b.obox(x, y + top * 0.955, z, post * 1.45, top * 0.035, half + post * 5.2, yaw, BLACK, { faces: 'B' });
}

/** The great torii that stands in the water: six legs, a roofed lintel, and the sea round its feet. */
function greatTorii(k: Build): void {
  const b = k.b, { x, z } = TORII, half = 6.2, top = 14.4, glow = interior(0.45), BLACK = 0x2a2420;
  for (const s of [-1, 1]) {
    const px = x + s * half;
    // a main post, thick as a tree, and a smaller one before and behind it, tied to it by two rails
    b.cyl(px, z, -1.5, top - 2.3, 0.95, 0.8, 8, VERMILION, { win: glow, cap: false });
    for (const dz of [-2.7, 2.7]) {
      b.cyl(px, z + dz, -1.5, 7.4, 0.5, 0.44, 6, VERMILION, { win: glow });
      b.cyl(px, z + dz, 7.4, 8.1, 0.95, 0.2, 4, TILE, { phase: Q, cap: false });
      for (const y of [2.6, 5.4]) b.box(px - 0.2, y, Math.min(z, z + dz), px + 0.2, y + 0.6, Math.max(z, z + dz), VERMILION, { faces: 'EWTB', win: glow });
    }
  }
  b.box(x - half - 1.3, top - 5.3, z - 0.34, x + half + 1.3, top - 4.3, z + 0.34, VERMILION, { faces: 'NESWTB', win: glow });
  b.box(x - 0.75, top - 4.3, z - 0.22, x + 0.75, top - 2.4, z + 0.22, 0x1d2a24, { faces: 'NESW' });
  b.box(x - half - 2.7, top - 2.4, z - 0.6, x + half + 2.7, top - 1.4, z + 0.6, VERMILION, { faces: 'NESWTB', win: glow });
  // the lintel's roof, and its ends, which turn up
  b.box(x - half - 3.2, top - 1.4, z - 0.9, x + half + 3.2, top - 0.7, z + 0.9, BLACK, { faces: 'NESWTB' });
  for (const s of [-1, 1]) b.beam([x + s * (half + 3.0), top - 1.05, z], [x + s * (half + 4.5), top - 0.25, z], 0.62, 0.42, BLACK);
  k.lights.push({ x, z, r: 15, color: '#ffb48a', k: 0.6 });

  // The shrine hall on the shore behind it: a floor on posts over the water, red
  // pillars, white walls, and a roof of bark. A walk leads to it from the land.
  const sz = SHORE.kyoto, hx0 = x - 8, hx1 = x + 8, hz0 = sz + 1.2, hz1 = sz + 8.2;
  b.box(hx0 - 1.4, 0.2, hz0 - 1.2, hx1 + 1.4, 0.8, hz1 + 2.6, 0xb5463a, { faces: 'NESWTB' });
  for (let px = hx0 - 0.9; px <= hx1 + 0.91; px += 4.45) for (const pz of [hz0 - 0.6, hz1 + 2]) b.box(px - 0.22, -1.5, pz - 0.22, px + 0.22, 0.2, pz + 0.22, VERMILION);
  b.box(hx0, 0.8, hz0, hx1, 4.2, hz1, PLASTER, { win: interior(0.7), faces: 'NESW' });
  for (let px = hx0; px <= hx1 + 0.01; px += 3.2) for (const pz of [hz0, hz1]) b.box(px - 0.24, 0.8, pz - 0.24, px + 0.24, 4.2, pz + 0.24, VERMILION, { faces: 'NESW' });
  tiledRoof(b, hx0, hz0, hx1, hz1, 4.2, 3.4, 1.7, 0x6a5a48, 0xb5463a);
  // a stage in front of it, out over the water, with a lantern at each corner
  b.box(x - 3.2, 0.2, hz1 + 2.6, x + 3.2, 0.8, hz1 + 7, 0xb5463a, { faces: 'NESWTB' });
  for (const s of [-1, 1]) {
    b.box(x + s * 3 - 0.2, -1.5, hz1 + 6.6, x + s * 3 + 0.2, 0.2, hz1 + 7, VERMILION);
    lantern(k, x + s * 2.9, 2.2, hz1 + 6.7, 0.9);
    b.box(x + s * 2.9 - 0.06, 0.8, hz1 + 6.64, x + s * 2.9 + 0.06, 1.7, hz1 + 6.76, 0x2a2420);
  }
  k.lights.push({ x, z: hz1 + 3, r: 13, color: '#ffd9a0', k: 0.55 });
}

/**
 * Fushimi Inari: a tunnel of red gates up the side of Kyoto's hill, from a
 * two-storey gate at the street to a small shrine at the top.
 */
function inari(k: Build): void {
  const b = k.b, way = INARI.way;
  // how far along the way each of its corners is
  const far: number[] = [0];
  for (let i = 1; i < way.length; i++) far.push(far[i - 1] + Math.hypot(way[i][0] - way[i - 1][0], way[i][1] - way[i - 1][1]));
  const total = far[far.length - 1];
  const at = (s: number): { x: number; z: number; yaw: number } => {
    let i = 1;
    while (i < way.length - 1 && far[i] < s) i++;
    const t = (s - far[i - 1]) / (far[i] - far[i - 1]);
    const [x0, z0] = way[i - 1], [x1, z1] = way[i];
    return { x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, yaw: Math.atan2(z1 - z0, x1 - x0) };
  };
  // the gates, one behind the other, each a little out of line with the last, as they are
  for (let s = 4.2; s < total - 2.5; s += 1.05) {
    const p = at(s), y = groundHeight(p.x, p.z);
    torii(k, p.x, p.z, p.yaw, 1.45, 3.7 + ((s * 7.3) % 0.5), y - 0.25, (Math.round(s * 3) % 3 === 0) ? 0xe8662f : 0xe0562d);
  }
  // steps of stone under them
  for (let s = 3.4; s < total - 2; s += 1.6) {
    const p = at(s), y = groundHeight(p.x, p.z);
    b.obox(p.x, y - 0.1, p.z, 0.85, 0.28, 1.25, p.yaw, 0xb9b2a2);
  }
  // the tower gate at the foot: two storeys, red and white, under a tiled roof
  {
    const p = at(0), w = 4.4, d = 1.9;
    placed(k, p.x, p.z, (p.yaw * 180) / Math.PI, (q) => {
      const g = q.b;
      for (const s of [-1, 1]) {
        g.box(-d, 0, s * w - (s > 0 ? 2.6 : 0), d, 3.6, s * w + (s > 0 ? 0 : 2.6), PLASTER, { win: interior(0.5) });
        for (const dz of [0, s * -2.6]) g.box(-d - 0.05, 0, s * w + dz - 0.24, d + 0.05, 3.6, s * w + dz + 0.24, VERMILION, { faces: 'NESW' });
      }
      g.box(-d - 0.2, 3.6, -w - 0.2, d + 0.2, 4.1, w + 0.2, VERMILION, { faces: 'NESWTB' });
      g.box(-d + 0.3, 4.1, -w + 0.5, d - 0.3, 6.1, w - 0.5, PLASTER, { win: interior(0.6) });
      for (let z = -w + 0.5; z <= w - 0.49; z += (2 * w - 1) / 4) g.box(-d + 0.25, 4.1, z - 0.2, d - 0.25, 6.1, z + 0.2, VERMILION, { faces: 'NESW' });
      tiledRoof(g, -d + 0.3, -w + 0.5, d - 0.3, w - 0.5, 6.1, 2.6, 1.5);
    });
    // a fox of stone on either side of the way in, each on a plinth
    for (const s of [-1, 1]) {
      const fx = p.x - Math.sin(p.yaw) * 6.3 * s - Math.cos(p.yaw) * 2.6, fz = p.z + Math.cos(p.yaw) * 6.3 * s - Math.sin(p.yaw) * 2.6;
      b.box(fx - 0.6, 0, fz - 0.6, fx + 0.6, 1.2, fz + 0.6, STONE);
      b.obox(fx, 1.75, fz, 0.55, 0.55, 0.3, p.yaw, 0xe9e6df);
      b.obox(fx + Math.cos(p.yaw) * 0.45, 2.55, fz + Math.sin(p.yaw) * 0.45, 0.3, 0.3, 0.24, p.yaw, 0xe9e6df);
      b.obox(fx - Math.cos(p.yaw) * 0.6, 2.3, fz - Math.sin(p.yaw) * 0.6, 0.14, 0.6, 0.14, p.yaw, 0xe9e6df);
    }
    k.lights.push({ x: p.x, z: p.z, r: 11, color: '#ffb48a', k: 0.55 });
  }
  // the shrine at the top: a small hall, with lanterns
  {
    const p = at(total), y = groundHeight(p.x, p.z);
    placed(k, p.x, p.z, (p.yaw * 180) / Math.PI, (q) => {
      q.b.box(-1.8, 0, -2.4, 1.8, 0.5, 2.4, STONE);
      q.b.box(-1.4, 0.5, -1.9, 1.4, 3.2, 1.9, PLASTER, { win: interior(0.8) });
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) q.b.box(sx * 1.4 - 0.2, 0.5, sz * 1.9 - 0.2, sx * 1.4 + 0.2, 3.2, sz * 1.9 + 0.2, VERMILION, { faces: 'NESW' });
      tiledRoof(q.b, -1.4, -1.9, 1.4, 1.9, 3.2, 2, 1.1, 0x6a5a48, VERMILION);
      stoneLantern(q, -2.8, -2.6);
      stoneLantern(q, -2.8, 2.6);
    }, y - 0.2);
  }
}

// ---------------------------------------------------------------------------
// The castle
// ---------------------------------------------------------------------------

/**
 * The castle: a black keep of five roofs on a base of sloping stone, in a moat,
 * with a red bridge. It is Matsumoto's, the "crow castle" of the Alps: black
 * boards below white plaster on every storey, and a wing with a red rail for
 * watching the moon.
 */
function castle(k: Build): void {
  const b = k.b, { x: cx, z: cz } = CASTLE;
  const BLACK = 0x23262b, glow = interior(0.4);
  // the base: stone that leans in as it rises, out of the water
  slopes(b, [cx - 9.6, cz - 9.6, cx + 9.6, cz + 9.6], -1.5, [cx - 7.7, cz - 7.7, cx + 7.7, cz + 7.7], 7, STONE);
  b.box(cx - 7.7, 6.9, cz - 7.7, cx + 7.7, 7, cz + 7.7, 0xa9a59a, { faces: 'T' });
  // the storeys: each smaller than the one below, with a roof between
  const half = [6.9, 5.9, 4.9, 4.0, 3.2];
  let y = 7;
  half.forEach((w, i) => {
    const tall = i === 0 ? 4.6 : 3.9, last = i === half.length - 1;
    b.box(cx - w, y, cz - w, cx + w, y + tall * 0.58, cz + w, BLACK);
    b.box(cx - w + 0.05, y + tall * 0.58, cz - w + 0.05, cx + w - 0.05, y + tall, cz + w - 0.05, PLASTER, { win: { cell: 1.5, storey: tall * 0.42, lit: 0.55, kind: 4 }, seed: 0.2 + i * 0.13 });
    y += tall;
    if (!last) {
      const next = half[i + 1];
      b.quad([cx - w - 1.5, y, cz - w - 1.5], [cx + w + 1.5, y, cz - w - 1.5], [cx + w + 1.5, y, cz + w + 1.5], [cx - w - 1.5, y, cz + w + 1.5], [0, -1, 0], 0xd9d5cb);
      slopes(b, [cx - w - 1.5, cz - w - 1.5, cx + w + 1.5, cz + w + 1.5], y, [cx - w - 1.5, cz - w - 1.5, cx + w + 1.5, cz + w + 1.5], y + 0.28, TILE);
      slopes(b, [cx - w - 1.5, cz - w - 1.5, cx + w + 1.5, cz + w + 1.5], y + 0.28, [cx - next - 0.05, cz - next - 0.05, cx + next + 0.05, cz + next + 0.05], y + 1.25, TILE);
      // a gable in the middle of the roof on two sides, as a castle's roofs have
      if (i === 1 || i === 2) {
        for (const s of [-1, 1]) {
          const gz = cz + s * (w + 0.4);
          // (a triangle shows from one side only: its corners go the other way round on the north face)
          b.tri([cx - 2.1 * s, y + 0.45, gz], [cx + 2.1 * s, y + 0.45, gz], [cx, y + 2.1, gz], [0, 0, s], PLASTER);
          b.beam([cx - 2.4, y + 0.4, gz + s * 0.2], [cx, y + 2.35, gz + s * 0.2], 0.2, 0.2, TILE);
          b.beam([cx + 2.4, y + 0.4, gz + s * 0.2], [cx, y + 2.35, gz + s * 0.2], 0.2, 0.2, TILE);
        }
      }
      y += 1.25;
    }
  });
  // the top roof, and a golden fish at each end of its ridge
  const w = half[half.length - 1];
  tiledRoof(b, cx - w, cz - w, cx + w, cz + w - 0.01, y, 3.1, 1.4);
  for (const s of [-1, 1]) {
    b.obox(cx + s * 1.3, y + 4.05, cz, 0.22, 0.42, 0.2, 0, GOLD, { win: interior(0.8) });
    b.beam([cx + s * 1.3, y + 4.3, cz], [cx + s * 1.75, y + 4.95, cz], 0.2, 0.06, GOLD, { win: interior(0.8) });
  }
  // the wing for watching the moon: low, open, with a red rail round it
  {
    const x0 = cx + 6.9, x1 = cx + 12.2, z0 = cz + 0.5, z1 = cz + 6.5;
    slopes(b, [x0 - 0.4, z0 - 1, x1 + 1.3, z1 + 1.3], -1.5, [x0, z0, x1, z1], 7, STONE);
    b.box(x0, 7, z0, x1, 7.4, z1, 0xb9b2a2, { faces: 'NESWT' });
    b.box(x0 + 0.6, 7.4, z0 + 0.6, x1 - 0.6, 10.3, z1 - 0.6, PLASTER, { win: interior(0.8) });
    for (const [px, pz] of [[x0 + 0.6, z0 + 0.6], [x1 - 0.6, z0 + 0.6], [x0 + 0.6, z1 - 0.6], [x1 - 0.6, z1 - 0.6]]) b.box(px - 0.2, 7.4, pz - 0.2, px + 0.2, 10.3, pz + 0.2, BLACK, { faces: 'NESW' });
    b.box(x0 + 0.1, 7.9, z0 + 0.1, x1 - 0.1, 8.15, z1 - 0.1, VERMILION, { faces: 'NESW' });
    tiledRoof(b, x0 + 0.6, z0 + 0.6, x1 - 0.6, z1 - 0.6, 10.3, 2.2, 1.3);
  }
  // the red bridge over the moat, from the bank by the street to a gate in the stone: a low arch on posts
  {
    const z = cz - 4, x0 = cx + 9, x1 = MOAT.x1 + 0.5;
    b.box(x0 - 0.5, 0.2, z - 1.4, x0 + 0.25, 3.1, z + 1.4, BLACK, { win: interior(0.5) });
    b.box(x0 - 0.7, 3.1, z - 1.9, x0 + 0.7, 3.5, z + 1.9, TILE, { faces: 'NESWTB' });
    for (let i = 0; i < 6; i++) {
      const u0 = i / 6, u1 = (i + 1) / 6, ax = x0 + (x1 - x0) * u0, bx = x0 + (x1 - x0) * u1;
      const y0 = 0.25 + Math.sin(u0 * Math.PI) * 1.3, y1 = 0.25 + Math.sin(u1 * Math.PI) * 1.3;
      b.quad([ax, y0, z - 1.5], [bx, y1, z - 1.5], [bx, y1, z + 1.5], [ax, y0, z + 1.5], [0, 1, 0], 0xb5463a);
      for (const s of [-1, 1]) b.beam([ax, y0 + 0.9, z + s * 1.5], [bx, y1 + 0.9, z + s * 1.5], 0.12, 0.12, VERMILION, { win: glow });
      if (i > 0) for (const s of [-1, 1]) b.box(ax - 0.12, -1.5, z + s * 1.5 - 0.12, ax + 0.12, y0 + 0.9, z + s * 1.5 + 0.12, VERMILION);
    }
  }
  k.lights.push({ x: cx, z: cz + 11, r: 20, color: '#dfe8ff', k: 0.55 }, { x: cx + 12, z: cz + 2, r: 14, color: '#dfe8ff', k: 0.5 });
}

// ---------------------------------------------------------------------------
// Kinkaku-ji, the Golden Pavilion
// ---------------------------------------------------------------------------

/**
 * The Golden Pavilion: three storeys at the edge of a pond, the upper two
 * covered in gold, under roofs of shingle, with a phoenix on top.
 */
function kinkakuji(k: Build): void {
  const b = k.b, { x: cx, z: cz } = KINKAKU;
  const SHINGLE = 0x6a5a48, gold = interior(0.75);
  // a spit of land out into the pond for it to stand on, with a stone edge
  b.box(cx - 7, -1.5, cz - 6.5, cx + 6.5, 0.12, cz + 6, 0xb9b2a2);
  b.box(cx - 13.5, -1.5, cz - 2.4, cx - 7, 0.1, cz + 2.4, 0xb9b2a2);
  // the ground floor: plain wood and white walls, with a walk round it
  b.box(cx - 5.4, 0.12, cz - 4.9, cx + 5.4, 0.55, cz + 4.9, WOOD);
  b.box(cx - 4.6, 0.55, cz - 4.1, cx + 4.6, 3.7, cz + 4.1, PLASTER, { win: interior(0.6) });
  for (let x = cx - 4.6; x <= cx + 4.61; x += 2.3) for (const z of [cz - 4.1, cz + 4.1]) b.box(x - 0.16, 0.55, z - 0.16, x + 0.16, 3.7, z + 0.16, WOOD, { faces: 'NESW' });
  // the middle storey, in gold, with a rail, and its roof
  b.quad([cx - 6.3, 3.7, cz - 5.8], [cx + 6.3, 3.7, cz - 5.8], [cx + 6.3, 3.7, cz + 5.8], [cx - 6.3, 3.7, cz + 5.8], [0, -1, 0], WOOD);
  slopes(b, [cx - 6.3, cz - 5.8, cx + 6.3, cz + 5.8], 3.7, [cx - 6.3, cz - 5.8, cx + 6.3, cz + 5.8], 3.95, SHINGLE);
  slopes(b, [cx - 6.3, cz - 5.8, cx + 6.3, cz + 5.8], 3.95, [cx - 4.4, cz - 3.9, cx + 4.4, cz + 3.9], 4.7, SHINGLE);
  b.box(cx - 4.3, 4.7, cz - 3.8, cx + 4.3, 7.6, cz + 3.8, GOLD, { win: gold });
  b.box(cx - 4.9, 4.7, cz - 4.4, cx + 4.9, 5.25, cz + 4.4, 0xc49a3a, { win: gold, faces: 'NESW' });
  b.quad([cx - 5.9, 7.6, cz - 5.4], [cx + 5.9, 7.6, cz - 5.4], [cx + 5.9, 7.6, cz + 5.4], [cx - 5.9, 7.6, cz + 5.4], [0, -1, 0], 0xc49a3a);
  slopes(b, [cx - 5.9, cz - 5.4, cx + 5.9, cz + 5.4], 7.6, [cx - 5.9, cz - 5.4, cx + 5.9, cz + 5.4], 7.85, SHINGLE);
  slopes(b, [cx - 5.9, cz - 5.4, cx + 5.9, cz + 5.4], 7.85, [cx - 2.9, cz - 2.9, cx + 2.9, cz + 2.9], 8.7, SHINGLE);
  // the top storey: smaller, square and gold, under a roof that comes to a point
  b.box(cx - 2.8, 8.7, cz - 2.8, cx + 2.8, 11.1, cz + 2.8, GOLD, { win: gold });
  b.cyl(cx, cz, 11.1, 11.35, 4.5 * D, 4.5 * D, 4, 0xc49a3a, { phase: Q, cap: false });
  b.cyl(cx, cz, 11.35, 13.6, 4.5 * D, 0.2, 4, SHINGLE, { phase: Q, cap: false });
  // the phoenix: a body, a neck and two wings, in gold
  b.box(cx - 0.12, 13.5, cz - 0.12, cx + 0.12, 14.1, cz + 0.12, GOLD, { win: gold });
  b.beam([cx - 0.5, 14.3, cz], [cx + 0.5, 14.5, cz], 0.2, 0.12, GOLD, { win: interior(1.2) });
  b.beam([cx + 0.4, 14.5, cz], [cx + 0.75, 15.1, cz], 0.1, 0.06, GOLD, { win: interior(1.2) });
  for (const s of [-1, 1]) b.beam([cx, 14.45, cz], [cx - 0.3, 14.95, cz + s * 0.75], 0.14, 0.03, GOLD, { win: interior(1.2) });
  // rocks in the pond, with a pine on the largest
  for (const [dx, dz, r] of [[11, 4, 1.6], [9, 12, 2.3], [-2, 15, 1.2], [14, -6, 1.1]]) {
    b.cyl(cx + dx, cz + dz, -1.5, 0.5, r * 1.15, r * 0.7, 6, 0x8a8277);
    if (r > 2) k.tree(cx + dx, cz + dz, 0.55, false, 0.4);
  }
  k.lights.push({ x: cx, z: cz + 8, r: 17, color: '#ffd98a', k: 0.7 }, { x: cx + 9, z: cz, r: 13, color: '#ffd98a', k: 0.5 });
}

// ---------------------------------------------------------------------------
// Sensō-ji
// ---------------------------------------------------------------------------

/**
 * Sensō-ji: Kaminarimon, the gate with the great red lantern; the lane of
 * stalls behind it; and the main hall at the end of the lane.
 */
function sensoji(k: Build): void {
  const b = k.b, s = SENSOJI, cx = s.x;
  // --- Kaminarimon: a gate of three bays under a heavy roof. The lantern hangs in the middle one. ---
  {
    const z = s.gate, hw = 5.4, d = 1.9, h = 5.4;
    for (const side of [-1, 1]) {
      // each outer bay is a closed room for a guardian: red posts, dark between them
      const x0 = cx + side * 2.1, x1 = cx + side * hw;
      b.box(Math.min(x0, x1), 0, z - d, Math.max(x0, x1), h, z + d, 0x3a2a24, { win: interior(0.25) });
      for (const px of [x0, x1]) for (const pz of [z - d, z + d]) b.box(px - 0.3, 0, pz - 0.3, px + 0.3, h, pz + 0.3, VERMILION, { faces: 'NESW' });
    }
    b.box(cx - hw - 0.3, h, z - d - 0.3, cx + hw + 0.3, h + 0.8, z + d + 0.3, VERMILION, { faces: 'NESWTB' });
    tiledRoof(b, cx - hw, z - d, cx + hw, z + d, h + 0.8, 3.6, 2.2);
    // the lantern: red paper, black at its top and bottom, with the gate's name on it
    b.cyl(cx, z, 1.5, 4.9, 1.55, 1.55, 10, 0xc8322a, { win: interior(1.1), cap: false });
    b.cyl(cx, z, 4.9, 5.25, 1.6, 1.3, 10, 0x1d1a1a);
    b.cyl(cx, z, 1.15, 1.5, 1.3, 1.6, 10, 0x1d1a1a, { cap: false });
    b.cyl(cx, z, 1.1, 1.16, 1.3, 1.3, 10, GOLD);
    k.sign('kaminarimon', cx, 3.2, z + 1.62, 0, 1, 2.6);
    k.sign('kaminarimon', cx, 3.2, z - 1.62, 0, -1, 2.6);
    k.lights.push({ x: cx, z: z + 4, r: 12, color: '#ff9a7a', k: 0.6 });
  }
  // --- the lane of stalls: two rows of small shops under one long roof each, with lanterns ---
  for (const side of [-1, 1]) {
    const x0 = cx + side * 2.2, x1 = cx + side * 5.6, z0 = s.lane[0], z1 = s.lane[1];
    b.box(Math.min(x0, x1), 0, z0, Math.max(x0, x1), 3.1, z1, 0xe9e3d6, { win: { cell: 2.6, storey: 3.1, lit: 1, kind: 2 }, seed: 0.3 + side * 0.1 });
    slopes(b, [Math.min(x0, x1) - 0.5, z0 - 0.3, Math.max(x0, x1) + 0.5, z1 + 0.3], 3.1, [Math.min(x0, x1) + 1.2, z0 + 0.4, Math.max(x0, x1) - 1.2, z1 - 0.4], 4.3, 0xb5463a);
    b.box(Math.min(x0, x1) + 1.2, 4.28, z0 + 0.4, Math.max(x0, x1) - 1.2, 4.3, z1 - 0.4, 0xa53a30, { faces: 'T' });
    for (let z = z0 + 1.4; z < z1; z += 2.6) lantern(k, x0 - side * 0.15, 2.5, z, 0.55);
    k.lights.push({ x: cx, z: (z0 + z1) / 2 + side * 5, r: 9, color: '#ffd9a8', k: 0.5 });
  }
  // --- the main hall: red pillars, white walls, and a great steep roof ---
  {
    const z0 = s.hall[0], z1 = s.hall[1], hw = 7;
    b.box(cx - hw - 1.4, 0, z0 - 1, cx + hw + 1.4, 1.1, z1 + 2.6, 0xb9b2a2);
    for (let i = 0; i < 4; i++) b.box(cx - 3.4, 0, z1 + 2.6 + i * 0.5, cx + 3.4, 1.1 - (i + 1) * 0.26, z1 + 3.1 + i * 0.5, 0xa9a59a);
    b.box(cx - hw, 1.1, z0, cx + hw, 6.4, z1, PLASTER, { win: interior(0.55), faces: 'NESW' });
    for (let x = cx - hw; x <= cx + hw + 0.01; x += 2.8) for (const z of [z0, z1]) b.box(x - 0.32, 1.1, z - 0.32, x + 0.32, 6.4, z + 0.32, VERMILION, { faces: 'NESW' });
    b.box(cx - hw - 0.3, 6.4, z0 - 0.3, cx + hw + 0.3, 7.2, z1 + 0.3, VERMILION, { faces: 'NESWTB' });
    tiledRoof(b, cx - hw, z0, cx + hw, z1, 7.2, 6.4, 2.6);
    // the lantern that hangs in its doorway, and the great bowl for incense before it
    b.cyl(cx, z1 + 0.5, 3, 5.2, 1.0, 1.0, 8, 0xc8322a, { win: interior(1.1), cap: 0x1d1a1a });
    b.cyl(cx, z1 + 6.8, 0, 1.3, 0.9, 1.15, 8, 0x6a5a48);
    b.cyl(cx, z1 + 6.8, 1.3, 1.5, 1.25, 1.25, 8, 0x4a3f36);
    k.lights.push({ x: cx, z: z1 + 5, r: 15, color: '#ffc49a', k: 0.6 });
  }
}

// ---------------------------------------------------------------------------
// The two stations
// ---------------------------------------------------------------------------

/**
 * Tokyo Station: the long front of red brick with white bands, a dome at each
 * end, and the platforms behind it up on the viaduct, each under a roof.
 */
function tokyoStation(k: Build): void {
  const b = k.b, { x0, x1, z1 } = TOKYO_STATION;
  const BRICK = 0xa8553f, BAND = 0xe9e3d6, SLATE = 0x3a3f46, top = RAIL.y - 0.2;
  // how deep a platform is, and where the brick front begins: in front of the near platform
  const deep = 3, z0 = RAIL.z + RAIL.half + deep + 0.2;
  const floor = RAIL.y + 0.67, roof = RAIL.y + 5.9;
  b.box(x0, 0, z0, x1, top, z1, BRICK, { win: { cell: 1.9, storey: 4.2, lit: 0.6, kind: 0 }, seed: 0.42 });
  for (const y of [4.2, 8.4, top - 0.35]) b.box(x0 - 0.08, y, z0, x1 + 0.08, y + 0.35, z1 + 0.08, BAND, { faces: 'ESW' });
  // the middle of the front stands forward under a gable, where the way in is
  const mx = (x0 + x1) / 2;
  b.box(mx - 4, 0, z1, mx + 4, top + 1.6, z1 + 1.1, BRICK, { win: { cell: 2, storey: 4.2, lit: 0.8, kind: 0 }, seed: 0.1 });
  b.tri([mx - 4, top + 1.6, z1 + 1.12], [mx + 4, top + 1.6, z1 + 1.12], [mx, top + 4, z1 + 1.12], [0, 0, 1], BAND);
  b.box(mx - 1.6, 0, z1 + 1.1, mx + 1.6, 3.4, z1 + 1.16, 0xfff0d6, { win: interior(1.4), faces: 'S' });
  // a slate roof along it, and an eight-sided dome over each end
  slopes(b, [x0, z0, x1, z1], top, [x0 + 1.6, z0 + 1.9, x1 - 1.6, z1 - 1.9], top + 2.3, SLATE);
  b.box(x0 + 1.6, top + 2.28, z0 + 1.9, x1 - 1.6, top + 2.3, z1 - 1.9, 0x2f343a, { faces: 'T' });
  for (const cx of [x0 + 4.6, x1 - 4.6]) {
    const cz = (z0 + z1) / 2;
    b.cyl(cx, cz, top - 0.2, top + 2.6, 3.3, 3.3, 8, BRICK, { win: { cell: 1.3, storey: 2.8, lit: 0.9, kind: 0 }, seed: 0.3, cap: false });
    b.cyl(cx, cz, top + 2.6, top + 3, 3.55, 3.55, 8, BAND, { cap: false });
    turnedShape(b, cx, cz, [[top + 3, 3.4], [top + 4.8, 2.7], [top + 6, 1.5], [top + 6.5, 0.7]], 8, SLATE);
    b.cyl(cx, cz, top + 6.5, top + 7.7, 0.42, 0.08, 6, BAND, { cap: false });
  }
  k.sign('tokyo-eki', mx, top - 2.2, z1 + 1.2, 0, 1, 1.5);
  // behind the front, under the near platform: the hall that people come up through
  b.box(x0 + 0.6, 0, RAIL.z + RAIL.half + 0.4, x1 - 0.6, floor - 0.52, z0, 0xd9d2c2, { win: { cell: 2.4, storey: 4.3, lit: 0.5, kind: 0 }, seed: 0.7 });
  // the platforms: one each side of the two tracks, each with a roof on posts
  for (const side of [-1, 1]) {
    const pz0 = RAIL.z + side * (RAIL.half + 0.1), pz1 = RAIL.z + side * (RAIL.half + deep);
    const lo = Math.min(pz0, pz1), hi = Math.max(pz0, pz1);
    b.box(x0 + 0.6, floor - 0.5, lo, x1 + 0.4, floor, hi, 0xcfc8b8, { faces: 'NESWTB' });
    b.box(x0 + 0.6, floor, Math.min(pz0, pz0 + side * 0.3), x1 + 0.4, floor + 0.03, Math.max(pz0, pz0 + side * 0.3), 0xe9c94a, { faces: 'T' });
    // the far platform has nothing under it, so it rests on brackets from the viaduct
    if (side < 0) for (let x = x0 + 3; x < x1; x += 6) b.beam([x, floor - 0.5, pz1 + 0.3], [x, floor - 2.6, pz0], 0.22, 0.22, 0xbdb8ad);
    b.box(x0 + 1.6, roof, lo - 0.4, x1 - 0.2, roof + 0.3, hi + 0.4, 0xf2f0ea, { faces: 'NESWTB', top: 0xcfd6dc });
    for (let x = x0 + 3.5; x < x1 - 1; x += 7) {
      b.box(x - 0.12, floor, pz1 - side * 0.45 - 0.12, x + 0.12, roof, pz1 - side * 0.45 + 0.12, 0x6b7076);
      k.glows.push({ x, y: roof - 0.16, z: (pz0 + pz1) / 2, sx: 1.4, sy: 0.12, sz: 0.4, color: '#fff3dc' });
    }
    for (let i = 0; i < 9; i++) k.person(x0 + 2.4 + ((i * 3.37 + (side > 0 ? 1.2 : 0)) % (x1 - x0 - 5)), (pz0 + pz1) / 2 + side * 0.35, floor);
    k.lights.push({ x: mx, z: (pz0 + pz1) / 2, r: 16, color: '#fff0d6', k: 0.5 });
  }
  k.lights.push({ x: mx, z: z1 + 5, r: 18, color: '#ffe2ae', k: 0.6 });
}

/**
 * Kyoto Station: a hall of glass and grey steel that spans the tracks, with a
 * great roof and the trains running through it.
 */
function kyotoStation(k: Build): void {
  const b = k.b, x0 = -70, x1 = -46, r = RAIL;
  const GLASS = 0x8fb4cf, FRAME = 0x6b7076, floor = r.y + 0.67;
  const n0 = r.z - r.half - 4.6, n1 = r.z - r.half - 0.05, s0 = r.z + r.half + 0.05, s1 = r.z + r.half + 3.9;
  // a block to either side of the tracks: glass above, and the way in below on the street side
  b.box(x0, 0, n0, x1, 17, n1, GLASS, { win: { cell: 2, storey: 4.25, lit: 0.5, kind: 1 }, seed: 0.2 });
  b.box(x0, 0, s0, x1, 17, s1, GLASS, { win: { cell: 2, storey: 4.25, lit: 0.6, kind: 1 }, seed: 0.6 });
  for (let x = x0; x <= x1 + 0.01; x += 6) b.box(x - 0.2, 0, s1, x + 0.2, 17, s1 + 0.12, FRAME, { faces: 'ESW' });
  b.box(x0 + 7, 0, s1, x1 - 7, 4.2, s1 + 0.14, 0xfff0d6, { win: interior(1.4), faces: 'S' });
  // the roof: a long vault of glass over the tracks, on steel ribs
  const top = 21;
  for (let i = 0; i < 6; i++) {
    const u0 = i / 6, u1 = (i + 1) / 6, za = n0 + (s1 - n0) * u0, zb = n0 + (s1 - n0) * u1;
    const ya = 17 + Math.sin(u0 * Math.PI) * (top - 17), yb = 17 + Math.sin(u1 * Math.PI) * (top - 17);
    b.quad([x0 - 1, ya, za], [x1 + 1, ya, za], [x1 + 1, yb, zb], [x0 - 1, yb, zb], [0, 1, 0], i % 2 ? 0xa9c9dc : 0x9cc3d3);
    for (const x of [x0 - 1, x1 + 1]) b.beam([x, ya + 0.05, za], [x, yb + 0.05, zb], 0.22, 0.22, FRAME);
  }
  // the name of the place, over the way in
  k.sign('kyoto-eki', (x0 + x1) / 2, 6.2, s1 + 0.2, 0, 1, 1.7);
  // platforms inside it, with people waiting
  for (const side of [-1, 1]) {
    const pz = r.z + side * (r.half - 0.1);
    b.box(x0 + 0.4, floor - 0.4, Math.min(pz, pz + side * 0.9), x1 - 0.4, floor, Math.max(pz, pz + side * 0.9), 0xcfc8b8, { faces: 'NESWTB' });
    k.glows.push({ x: (x0 + x1) / 2, y: 16.6, z: pz, sx: x1 - x0 - 3, sy: 0.14, sz: 0.3, color: '#fff3dc' });
  }
  k.lights.push({ x: (x0 + x1) / 2, z: s1 + 5, r: 17, color: '#e6f4ff', k: 0.6 });
}

// ---------------------------------------------------------------------------
// Everything, in turn
// ---------------------------------------------------------------------------

export function buildLandmarks(k: Build): void {
  tokyoTower(k);
  kyotoTower(k);
  placed(k, PAGODA.x, PAGODA.z, 0, (q) => pagoda(q, PAGODA.h), KYOTO_HILL.y - 0.1);
  greatTorii(k);
  inari(k);
  castle(k);
  kinkakuji(k);
  sensoji(k);
  tokyoStation(k);
  kyotoStation(k);
}
