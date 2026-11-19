// Toy versions of famous North American buildings and monuments. Each is a few
// dozen boxes, cylinders and bars: enough for the silhouette. Their places come
// from plan.ts.

import type { GeoBuilder, QuadOpts, V3, WinSpec } from '../../engine/geo';
import { interior, rng } from '../../engine/geo';
import type { Build, Glow } from '../../engine/tile';
import {
  ARCH, EXPRESS_HALF, EXPRESS_Y, GOLDEN_GATE, ROUTE66, WRIGLEY, type Building,
} from './plan';

/** What a model builds with: the tile's own build. */
type LandmarkCtx = Build;

type P2 = [number, number];
const Q = Math.PI / 4;
/** A four-sided "cylinder" is measured to its corners: this turns half a width into that radius. */
const D = Math.SQRT2;
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

const RED_LAMP = '#ff3b3b';
const lamp = (ctx: { glows: Glow[] }, x: number, y: number, z: number, s = 0.7, color = RED_LAMP): void => {
  ctx.glows.push({ x, y, z, sx: s, sy: s, sz: s, color });
};

/** A flat triangle that faces the sky, whichever way round its corners are given. */
function upTri(b: GeoBuilder, p0: V3, p1: V3, p2: V3, color: number): void {
  const up = (p1[2] - p0[2]) * (p2[0] - p0[0]) - (p1[0] - p0[0]) * (p2[2] - p0[2]);
  if (up >= 0) b.tri(p0, p1, p2, [0, 1, 0], color);
  else b.tri(p0, p2, p1, [0, 1, 0], color);
}

/** Upright walls round a plan of four corners, with a flat roof unless `top` is false. */
function prism(b: GeoBuilder, plan: P2[], y0: number, y1: number, color: number, o: { win?: WinSpec; seed?: number; top?: number | false } = {}): void {
  const cx = plan.reduce((s, p) => s + p[0], 0) / plan.length, cz = plan.reduce((s, p) => s + p[1], 0) / plan.length;
  plan.forEach((p, i) => {
    const q = plan[(i + 1) % plan.length];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    let nx = (q[1] - p[1]) / len, nz = -(q[0] - p[0]) / len;
    if (nx * ((p[0] + q[0]) / 2 - cx) + nz * ((p[1] + q[1]) / 2 - cz) < 0) { nx = -nx; nz = -nz; }
    b.quad([p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], [nx, 0, nz], color, { win: o.win, seed: o.seed, L: len });
  });
  if (o.top !== false) {
    const [p0, p1, p2, p3] = plan.map((p): V3 => [p[0], y1, p[1]]);
    b.quad(p0, p1, p2, p3, [0, 1, 0], o.top ?? color);
  }
}

// ---------------------------------------------------------------------------
// Towers and other things that stand on a lot
// ---------------------------------------------------------------------------

/** Sears Tower: nine square tubes bundled together, stopping at different heights. */
function sears(l: Building, { b, glows }: LandmarkCtx): void {
  const t = l.w / 3;
  const FLOORS = [[50, 90, 66], [108, 108, 90], [66, 90, 50]]; // rows north to south, columns west to east
  const k = l.y1 / 108;
  const win: WinSpec = { cell: t / 4, storey: 2.6, lit: 0.42, kind: 0 };
  const BODY = 0x2b2e35, BAND = 0x17191d, ROOF = 0x3b3e44;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const top = FLOORS[r][c] * k;
      const x0 = l.x + c * t, z0 = l.z + r * t;
      b.box(x0, 0, z0, x0 + t, top, z0 + t, BODY, { win, seed: 0.11 + r * 0.17 + c * 0.07, top: ROOF });
      // the dark bands of the machine floors
      for (const f of [30, 65, 89]) {
        if (f < FLOORS[r][c] - 4) b.box(x0 - 0.06, f * k, z0 - 0.06, x0 + t + 0.06, f * k + 2.2, z0 + t + 0.06, BAND, { faces: 'NESW' });
      }
      b.box(x0 - 0.06, top - 2.4, z0 - 0.06, x0 + t + 0.06, top + 0.5, z0 + t + 0.06, BAND);
    }
  }
  const az = l.z + t * 1.5;
  for (const [ox, h] of [[0.5, 30], [1.5, 34]]) {
    const ax = l.x + t * ox;
    b.cyl(ax, az, l.y1 + 0.5, l.y1 + 0.5 + h, 0.55, 0.14, 6, 0xe9e9ec, { cap: false });
    lamp({ glows }, ax, l.y1 + h + 0.9, az);
  }
}

/** One of the Twin Towers: a plain silver shaft with pinstripe windows. */
function twinTower(l: Building, ctx: LandmarkCtx, antenna: boolean): void {
  const { b } = ctx;
  const x0 = l.x, z0 = l.z, x1 = l.x + l.w, z1 = l.z + l.d, H = l.y1;
  const win: WinSpec = { cell: l.w / 18, storey: 6, lit: 0.5, kind: 6 };
  b.box(x0, 0, z0, x1, H, z1, 0xbcc4cb, { win, seed: antenna ? 0.23 : 0.61, top: 0x8d9299 });
  b.box(x0 - 0.05, 0, z0 - 0.05, x1 + 0.05, 5.5, z1 + 0.05, 0x3d4650, { faces: 'NESW' }); // the lobby
  for (const y of [H * 0.385, H * 0.7]) b.box(x0 - 0.05, y, z0 - 0.05, x1 + 0.05, y + 2.2, z1 + 0.05, 0x59616b, { faces: 'NESW' });
  b.box(x0 - 0.05, H - 5.5, z0 - 0.05, x1 + 0.05, H + 0.4, z1 + 0.05, 0x59616b);
  b.box(x0 + 2.5, H + 0.4, z0 + 2.5, x1 - 2.5, H + 1.8, z1 - 2.5, 0x7a8088);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  if (antenna) {
    b.cyl(cx, cz, H + 1.8, H + 32, 0.7, 0.12, 6, 0xeeeeee, { cap: false });
    lamp(ctx, cx, H + 32.4, cz);
  } else {
    lamp(ctx, x0 + 0.6, H + 1, z0 + 0.6, 0.6);
    lamp(ctx, x1 - 0.6, H + 1, z1 - 0.6, 0.6);
  }
  ctx.lights.push({ x: cx, z: z1 + 3, r: 10, color: '#dfe9f5', k: 0.4 });
}

/** The Empire State Building: a stone shaft that steps back to a mast. */
function empire(l: Building, ctx: LandmarkCtx): void {
  const { b } = ctx;
  const STONE = 0xd9d0bf, TRIM = 0xb9b0a0;
  const win: WinSpec = { cell: 1.45, storey: 2.6, lit: 0.42, kind: 6 };
  const cx = l.x + l.w / 2, cz = l.z + l.d / 2, H = l.y1;
  const tier = (hx: number, hz: number, y0: number, y1: number, seed: number) =>
    b.box(cx - hx, y0, cz - hz, cx + hx, y1, cz + hz, STONE, { win, seed, top: TRIM });
  tier(l.w / 2, l.d / 2, 0, 8, 0.31);
  tier(l.w / 2 - 1.2, l.d / 2 - 1.5, 8, 26, 0.32);
  tier(l.w / 2 - 2.4, l.d / 2 - 3.2, 26, 34, 0.33);
  tier(4.2, 7.0, 34, H * 0.8, 0.34);
  tier(3.5, 5.6, H * 0.8, H * 0.87, 0.35);
  tier(2.8, 4.2, H * 0.87, H * 0.93, 0.36);
  tier(2.0, 2.9, H * 0.93, H, 0.37);
  // the mast, lit at night, and the spire
  b.cyl(cx, cz, H, H + 7, 1.7, 1.3, 8, 0xc9c2b4, { win: interior(1.4), cap: TRIM });
  b.cyl(cx, cz, H + 7, H + 9, 1.3, 0.6, 8, TRIM, { win: interior(1.4), cap: false });
  b.cyl(cx, cz, H + 9, H + 24, 0.5, 0.08, 6, 0xdadada, { cap: false });
  lamp(ctx, cx, H + 24.4, cz);
  for (const [hx, hz, y] of [[2.0, 2.9, H * 0.93], [2.8, 4.2, H * 0.87]]) {
    ctx.glows.push({ x: cx, y: y + 0.5, z: cz - hz - 0.1, sx: hx * 2, sy: 0.25, sz: 0.2, color: '#fff1c9' });
    ctx.glows.push({ x: cx, y: y + 0.5, z: cz + hz + 0.1, sx: hx * 2, sy: 0.25, sz: 0.2, color: '#fff1c9' });
    ctx.glows.push({ x: cx - hx - 0.1, y: y + 0.5, z: cz, sx: 0.2, sy: 0.25, sz: hz * 2, color: '#fff1c9' });
    ctx.glows.push({ x: cx + hx + 0.1, y: y + 0.5, z: cz, sx: 0.2, sy: 0.25, sz: hz * 2, color: '#fff1c9' });
  }
  ctx.lights.push({ x: cx, z: cz + l.d / 2 + 3, r: 11, color: '#ffe9c4', k: 0.45 });
}

/** The Statue of Liberty, on an island in a pond of her own, facing south-east. */
function liberty(l: Building, ctx: LandmarkCtx): void {
  const { b } = ctx;
  const L = { x: l.x + l.w / 2, z: l.z + l.d / 2, pondR: Math.min(l.w, l.d) / 2 - 0.7, top: l.y1 * 0.45 };
  const COPPER = 0x7dbfa6, STONE = 0xcdbfa6, CORNICE = 0xb9ad96;
  const g = interior(0.5);
  const D = Math.SQRT1_2;
  const F = { x: D, z: D }; // the way she faces
  const R = { x: -D, z: D }; // towards her right hand
  b.cyl(L.x, L.z, 0, 0.1, L.pondR + 0.6, L.pondR + 0.6, 20, 0xcfc8b8);
  b.cyl(L.x, L.z, 0.1, 0.16, L.pondR, L.pondR, 20, 0x6fb7d9);
  b.cyl(L.x, L.z, 0.16, 0.5, 4.2, 4.2, 12, 0x8cb873);
  // the star-shaped fort: two squares, one turned an eighth of a turn
  b.obox(L.x, 1.3, L.z, 3.0, 0.8, 3.0, 0, STONE);
  b.obox(L.x, 1.3, L.z, 3.0, 0.8, 3.0, Math.PI / 4, STONE);
  // the pedestal: half the height of the whole, as on the real one
  b.cyl(L.x, L.z, 2.1, 3.4, 3.1, 2.8, 4, STONE, { phase: 0, cap: CORNICE });
  b.cyl(L.x, L.z, 3.4, L.top, 2.7, 2.1, 4, STONE, { phase: 0, cap: CORNICE, win: interior(0.25) });
  b.cyl(L.x, L.z, L.top, L.top + 0.45, 2.45, 2.45, 4, CORNICE, { phase: 0 });
  const y0 = L.top + 0.45;
  // the figure
  b.cyl(L.x, L.z, y0, y0 + 7.4, 1.6, 1.05, 8, COPPER, { win: g, cap: false });
  b.cyl(L.x, L.z, y0 + 7.4, y0 + 9.6, 1.05, 0.85, 8, COPPER, { win: g, cap: COPPER });
  b.box(L.x - 0.48, y0 + 9.6, L.z - 0.48, L.x + 0.48, y0 + 10.7, L.z + 0.48, COPPER, { win: g });
  b.cyl(L.x, L.z, y0 + 10.6, y0 + 10.85, 0.78, 0.78, 8, COPPER, { win: g });
  for (let i = -2; i <= 2; i++) {
    // the rays of the crown, fanned towards the front
    const a = Math.PI / 4 + i * 0.5;
    const dx = Math.cos(a), dz = Math.sin(a);
    b.beam([L.x + dx * 0.55, y0 + 10.8, L.z + dz * 0.55], [L.x + dx * 1.25, y0 + 11.7, L.z + dz * 1.25], 0.1, 0.03, COPPER, { win: g });
  }
  // the raised arm and the torch
  const shoulder: V3 = [L.x + R.x * 0.8, y0 + 9.0, L.z + R.z * 0.8];
  const hand: V3 = [L.x + R.x * 1.45, y0 + 13.4, L.z + R.z * 1.45];
  b.beam(shoulder, hand, 0.38, 0.28, COPPER, { win: g });
  b.beam(hand, [hand[0], hand[1] + 1.0, hand[2]], 0.2, 0.42, COPPER, { win: g });
  b.box(hand[0] - 0.26, hand[1] + 1.0, hand[2] - 0.26, hand[0] + 0.26, hand[1] + 1.65, hand[2] + 0.26, 0xf0c755, { win: interior(4) });
  lamp(ctx, hand[0], hand[1] + 1.9, hand[2], 0.5, '#ffd27a');
  // the tablet, held in the other arm
  b.obox(L.x - R.x * 1.05 + F.x * 0.35, y0 + 7.4, L.z - R.z * 1.05 + F.z * 0.35, 0.5, 0.85, 0.17, Math.PI / 4 + Math.PI / 2, COPPER, { win: g });
  ctx.lights.push({ x: L.x, z: L.z, r: 12, color: '#bfe8d8', k: 0.55 });
}

/** The Chrysler Building: a pale shaft that steps back to a crown of steel arches and a needle. */
function chrysler(l: Building, ctx: LandmarkCtx): void {
  const { b } = ctx;
  const BRICK = 0xdedad0, TRIM = 0xbdb8ad, GRANITE = 0x3d4046, STEEL = 0xcdd6de, PANE = 0xb4c6d8;
  const cx = l.x + l.w / 2, cz = l.z + l.d / 2, H = l.y1;
  const hw = Math.min(l.w, l.d) / 2 - 0.5;
  const s = hw * 0.55; // half the width of the shaft
  const win: WinSpec = { cell: 1.3, storey: 2.6, lit: 0.42, kind: 6 };
  const tier = (h: number, y0: number, y1: number, seed: number): void =>
    b.box(cx - h, y0, cz - h, cx + h, y1, cz + h, BRICK, { win, seed, top: TRIM });
  tier(hw, 0, H * 0.17, 0.41);
  tier(hw - 1.2, H * 0.17, H * 0.26, 0.42);
  tier(hw - 2.2, H * 0.26, H * 0.36, 0.43);
  tier(s, H * 0.36, H * 0.73, 0.44);
  b.box(cx - hw - 0.05, 0, cz - hw - 0.05, cx + hw + 0.05, 3.4, cz + hw + 0.05, GRANITE, { faces: 'NESW' });
  // a darker course of brick below each setback
  for (const [h, y] of [[hw, H * 0.17], [hw - 1.2, H * 0.26], [hw - 2.2, H * 0.36], [s, H * 0.73]]) {
    b.box(cx - h - 0.05, y - 1.1, cz - h - 0.05, cx + h + 0.05, y, cz + h + 0.05, TRIM, { faces: 'NESW' });
  }
  // the steel eagles that lean out from the corners below the crown
  const y0 = H * 0.73, y1 = H * 0.9;
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    b.beam([cx + sx * (s - 0.4), y0 - 0.9, cz + sz * (s - 0.4)], [cx + sx * (s + 1.5), y0 - 0.5, cz + sz * (s + 1.5)], 0.42, 0.14, STEEL, { win: interior(0.4) });
  }
  // the crown: seven arches, each smaller than the one below, each with a fan of three-cornered windows
  const N = 7;
  const half = (t: number): number => s * (1 - t ** 1.7) + 0.3 * t;
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N;
    const ya = mix(y0, y1, t0), yb = mix(y0, y1, t1), h0 = half(t0), h1 = half(t1), dy = yb - ya;
    b.cyl(cx, cz, ya, yb, h0 * D, h1 * D, 4, STEEL, { phase: Q, win: interior(0.45), cap: false });
    const count = Math.max(1, 5 - Math.ceil(i * 0.7));
    const hA = mix(h0, h1, 0.12), hB = mix(h0, h1, 0.9);
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const rx = nz, rz = -nx; // to the right of someone who faces this side
      for (let j = 0; j < count; j++) {
        const u = ((j + 0.5) / count - 0.5) * 2 * hA * 0.84, wb = ((hA * 0.84) / count) * 0.78;
        const foot = (du: number): V3 => [cx + nx * (hA + 0.05) + rx * (u + du), ya + dy * 0.12, cz + nz * (hA + 0.05) + rz * (u + du)];
        const tip: V3 = [cx + nx * (hB + 0.05) + rx * u * (hB / hA), ya + dy * 0.9, cz + nz * (hB + 0.05) + rz * u * (hB / hA)];
        b.tri(foot(-wb), foot(wb), tip, [nx * 0.894, 0.447, nz * 0.894], PANE, { win: interior(3.2) });
      }
    }
  }
  b.cyl(cx, cz, y1, H, half(1) * D, 0.05, 4, STEEL, { phase: Q, win: interior(0.6), cap: false });
  lamp(ctx, cx, H + 0.4, cz, 0.55);
  ctx.lights.push({ x: cx, z: cz + hw + 3, r: 11, color: '#e6f0ff', k: 0.45 });
}

/** The Space Needle: three pairs of legs that pinch to a waist and flare to carry a saucer. */
function spaceNeedle(l: Building, ctx: LandmarkCtx): void {
  const { b } = ctx;
  const WHITE = 0xf1eee6, GOLD = 0xe8872e, GLASS = 0x9cc3d3;
  const g = interior(0.5);
  const cx = l.x + l.w / 2, cz = l.z + l.d / 2, H = l.y1;
  const R0 = Math.min(l.w, l.d) / 2 - 1.2; // how far out the feet stand
  const yS = H * 0.72; // where the saucer begins
  b.cyl(cx, cz, 0, 0.1, R0 + 0.9, R0 + 0.9, 20, 0xd8d2c4);
  // the pavilion at its foot, and the core with the lifts in it
  b.cyl(cx, cz, 0.1, 3.0, 4.4, 4.4, 12, GLASS, { win: { cell: 1.6, storey: 3.0, lit: 1, kind: 1 }, seed: 0.3, cap: WHITE });
  b.cyl(cx, cz, 3.0, yS, 1.2, 1.2, 6, WHITE, { win: g, cap: false });
  // the legs
  const RW = 1.9, R1 = 4.3, yW = yS * 0.62;
  const reach = (y: number): number => (y < yW ? RW + (R0 - RW) * (1 - y / yW) ** 1.7 : RW + (R1 - RW) * ((y - yW) / (yS - yW)) ** 1.6);
  for (let k = 0; k < 3; k++) {
    const a = Math.PI / 2 + (k * 2 * Math.PI) / 3;
    for (const side of [-1, 1]) {
      const pts: V3[] = [], radii: number[] = [];
      for (let i = 0; i <= 14; i++) {
        const y = (i / 14) * yS, r = reach(y), off = side * 0.62;
        pts.push([cx + Math.cos(a) * r - Math.sin(a) * off, y, cz + Math.sin(a) * r + Math.cos(a) * off]);
        radii.push(0.42 - 0.14 * (y / yS));
      }
      b.sweep(pts, radii, WHITE, { win: g });
    }
  }
  // the ring a fifth of the way up
  const yR = H * 0.2;
  b.cyl(cx, cz, yR, yR + 0.6, reach(yR) + 0.7, reach(yR) + 0.7, 12, WHITE, { win: g, cap: WHITE });
  // the saucer: its flaring underside, the halo, a band of windows and the golden roof
  b.cyl(cx, cz, yS, yS + 3.6, 1.8, 5.4, 16, WHITE, { win: g, cap: false });
  b.cyl(cx, cz, yS + 3.6, yS + 3.95, 8.3, 8.3, 20, WHITE, { win: g, cap: WHITE });
  // (window rows are counted from the ground, so the band is made one whole row tall)
  const yB = yS + 3.95, st = yB / Math.round(yB / 1.95), yD = yB + st;
  b.cyl(cx, cz, yB, yD, 7.1, 7.1, 20, GLASS, { win: { cell: 1.1, storey: st, lit: 1, kind: 1 }, seed: 0.2, cap: false });
  b.cyl(cx, cz, yD, yD + 0.5, 7.6, 7.6, 20, WHITE, { win: g, cap: WHITE });
  b.cyl(cx, cz, yD + 0.5, yD + 3.0, 7.2, 2.2, 20, GOLD, { win: interior(0.35), cap: false });
  b.cyl(cx, cz, yD + 3.0, yD + 4.2, 2.2, 1.4, 12, WHITE, { win: g, cap: WHITE });
  b.cyl(cx, cz, yD + 4.2, H, 0.42, 0.05, 6, 0xe9e9ec, { cap: false });
  lamp(ctx, cx, H + 0.3, cz, 0.55, '#fff1c9');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.glows.push({ x: cx + Math.cos(a) * 8.3, y: yS + 3.78, z: cz + Math.sin(a) * 8.3, sx: 0.5, sy: 0.3, sz: 0.5, color: '#fff1c9' });
  }
  ctx.lights.push({ x: cx, z: cz, r: 15, color: '#ffe2ae', k: 0.55 });
}

/** Coit Tower: a white fluted column with an arcade at the top, on its green hill. */
function coitTower(l: Building, ctx: LandmarkCtx): void {
  const { b } = ctx;
  const WHITE = 0xf1ede2, SHADE = 0xd6d0c1;
  const g = interior(0.6);
  const cx = l.x + l.w / 2, cz = l.z + l.d / 2, H = l.y1;
  const R = Math.min(l.w, l.d) / 2 - 0.15;
  // Telegraph Hill
  b.cyl(cx, cz, 0, 0.9, R, R - 0.55, 12, 0x6fa85a, { cap: 0x6fa85a });
  b.cyl(cx, cz, 0.9, 1.7, R - 0.9, R - 1.5, 12, 0x7fb85f, { cap: 0x7fb85f });
  // the base, and the door in it
  b.box(cx - 1.75, 1.7, cz - 1.75, cx + 1.75, 3.3, cz + 1.75, WHITE, { win: g, top: SHADE });
  b.box(cx - 0.45, 1.7, cz + 1.75, cx + 0.45, 2.9, cz + 1.81, 0x4a4f57, { faces: 'S' });
  // the column: its many flat sides stand for the fluting
  const y0 = 3.3, yA = H * 0.8;
  b.cyl(cx, cz, y0, yA, 1.6, 1.45, 16, WHITE, { win: g, cap: false });
  // the arcade: tall openings all round, lit from within
  b.cyl(cx, cz, yA, yA + 0.3, 1.78, 1.78, 12, SHADE, { cap: SHADE });
  const yB = yA + 0.3, st = yB / Math.round(yB / (H * 0.11));
  b.cyl(cx, cz, yB, yB + st, 1.5, 1.5, 12, WHITE, { win: { cell: 0.79, storey: st, lit: 1, kind: 6 }, seed: 0.3, cap: false });
  b.cyl(cx, cz, yB + st, yB + st + 0.3, 1.72, 1.72, 12, SHADE, { cap: SHADE });
  b.cyl(cx, cz, yB + st + 0.3, H, 1.22, 1.22, 12, WHITE, { win: g, cap: SHADE });
  ctx.tree(cx - 1.4, l.z + 1.0, 0.5);
  ctx.tree(cx + 1.5, l.z + l.d - 0.9, 0.55);
  ctx.lights.push({ x: cx, z: cz, r: 10, color: '#fff3dd', k: 0.6 });
}

/** The Painted Ladies: a row of tall wooden houses, each its own colour, gables to the street. */
function paintedLadies(l: Building, ctx: LandmarkCtx): void {
  const { b } = ctx;
  const PAINT = [0x8fb9d6, 0xf2d58f, 0xe9a6a0, 0xa9cfa0, 0xcdb7e0, 0xf0e6cf];
  const DOOR = [0x8a3b3b, 0x2f5d73, 0x3f6b4a];
  const TRIM = 0xfaf6ee, ROOF = 0x5a5f66, STEP = 0xb9b2a2;
  const n = 6, wz = l.d / n;
  const back = l.x + 0.6, front = l.x + l.w - 0.6; // they face east
  for (let i = 0; i < n; i++) {
    const z0 = l.z + i * wz + 0.22, z1 = l.z + (i + 1) * wz - 0.22, zc = (z0 + z1) / 2;
    const eave = l.y1 * 0.72 + (i % 2) * 0.6, run = (z1 - z0) / 2 + 0.25, rise = run * 1.15, ridge = eave + rise;
    const col = PAINT[i % PAINT.length];
    b.box(back, 0, z0, front, eave, z1, col, { win: { cell: 1.55, storey: 3.7, lit: 0.45, kind: 0 }, seed: 0.13 + i * 0.17, faces: 'NESW' });
    // the roof: two slopes that meet in a ridge running back from the street
    const len = Math.hypot(run, rise), xr = front + 0.3;
    b.quad([back, eave, z0 - 0.25], [xr, eave, z0 - 0.25], [xr, ridge, zc], [back, ridge, zc], [0, run / len, -rise / len], ROOF);
    b.quad([xr, eave, z1 + 0.25], [back, eave, z1 + 0.25], [back, ridge, zc], [xr, ridge, zc], [0, run / len, rise / len], ROOF);
    b.tri([front, eave, z1 + 0.25], [front, eave, z0 - 0.25], [front, ridge, zc], [1, 0, 0], col);
    b.tri([back, eave, z0 - 0.25], [back, eave, z1 + 0.25], [back, ridge, zc], [-1, 0, 0], col);
    // white boards along the gable, and a white band under the eaves
    b.beam([xr, eave, z0 - 0.25], [xr, ridge + 0.05, zc], 0.17, 0.17, TRIM);
    b.beam([xr, eave, z1 + 0.25], [xr, ridge + 0.05, zc], 0.17, 0.17, TRIM);
    b.box(back - 0.04, eave - 0.55, z0 - 0.04, front + 0.04, eave, z1 + 0.04, TRIM, { faces: 'NESW' });
    // a bay window two storeys tall on one half of the front, and steps up to the door on the other
    b.box(front, 2.0, z0 + 0.3, front + 0.75, eave - 2.2, zc - 0.1, TRIM, { win: { cell: 0.95, storey: 3.7, lit: 0.6, kind: 0 }, seed: 0.3 + i * 0.21 });
    b.box(front, 0, zc + 0.3, front + 1.3, 1.5, z1 - 0.25, STEP);
    b.box(front, 1.5, zc + 0.75, front + 0.07, 3.9, z1 - 0.7, DOOR[i % DOOR.length], { faces: 'E' });
  }
  for (const k of [1, 4]) ctx.lights.push({ x: front + 3, z: l.z + (k + 0.5) * wz, r: 9, color: '#ffd9a8', k: 0.4 });
}

/** The Transamerica Pyramid: a white spike with two wings near the top and a lit cap. */
function transamerica(l: Building, ctx: LandmarkCtx): void {
  const { b } = ctx;
  const WHITE = 0xeeeae0, ALU = 0xd3dbe2, GLASS = 0x39424d;
  const g = interior(0.4);
  const H = l.y1;
  const hb = Math.min(l.w, l.d) / 2 - 0.4; // half the width of its base
  const cx = l.x + l.w / 2, cz = l.z + hb + 0.4; // at the north end of its lot; the rest is its park
  const half = (y: number): number => hb * (1 - y / H);
  b.box(l.x + 0.3, 0, l.z + 0.3, l.x + l.w - 0.3, 0.1, l.z + l.d - 0.3, 0xd8d2c4, { faces: 'T' });
  // the legs: a row of slanting struts on each side, with dark glass behind them
  const yL = H * 0.065, hL = half(yL);
  b.cyl(cx, cz, 0.1, yL, (hb - 1.1) * D, (hL - 1.1) * D, 4, GLASS, { phase: Q, cap: false });
  for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const rx = nz, rz = -nx;
    for (let k = 0; k < 5; k++) {
      const u = (((k + 0.5) / 5) * 2 - 1) * (hb - 0.3);
      const foot: V3 = [cx + nx * hb + rx * u, 0.1, cz + nz * hb + rz * u];
      for (const du of [-1.05, 1.05]) {
        const v = u * (hL / hb) + du;
        b.beam(foot, [cx + nx * hL + rx * v, yL, cz + nz * hL + rz * v], 0.2, 0.2, WHITE, { win: g });
      }
    }
  }
  // the shaft, with a belt where it stands on its legs
  const yS = H * 0.76;
  b.cyl(cx, cz, yL, yL + 0.6, (hL + 0.14) * D, (half(yL + 0.6) + 0.14) * D, 4, WHITE, { phase: Q, cap: false });
  b.cyl(cx, cz, yL + 0.6, yS, half(yL + 0.6) * D, half(yS) * D, 4, WHITE, { phase: Q, win: { cell: 0.95, storey: 1.9, lit: 0.4, kind: 0 }, seed: 0.27, cap: false });
  // the cap, lit from within, and the mast
  b.cyl(cx, cz, yS, H - 2.5, half(yS) * D, 0.2 * D, 4, ALU, { phase: Q, win: interior(0.9), cap: false });
  b.cyl(cx, cz, H - 2.5, H, 0.24, 0.04, 4, 0xe9e9ec, { cap: false });
  lamp(ctx, cx, H + 0.3, cz, 0.6, '#fff1c9');
  // the two wings, for the lifts and the stairs: they stay upright while the shaft leans in
  const yW0 = H * 0.5, yW1 = H * 0.78;
  for (const side of [-1, 1]) {
    const xa = cx + side * (half(yW1) - 0.3), xb = cx + side * (half(yW0) + 0.02);
    b.box(Math.min(xa, xb), yW0, cz - 1.15, Math.max(xa, xb), yW1, cz + 1.15, WHITE, { win: g });
  }
  // the redwoods in its park
  for (const [dx, dz] of [[-4.6, 0], [-1.6, 0.9], [1.5, 0], [4.6, 0.9]]) ctx.tree(cx + dx, l.z + l.d - 2.9 + dz, 0.8, true);
  ctx.lights.push({ x: cx, z: cz + hb + 2, r: 12, color: '#e6f0ff', k: 0.5 });
}

/** The Flatiron Building: a wedge, with its narrow prow towards the corner. */
function flatiron(l: Building, ctx: LandmarkCtx): void {
  const { b } = ctx;
  const STONE = 0xd9ccb0, BASE = 0xc9bb9b, CORNICE = 0xc2b390;
  const P = (lx: number, lz: number): P2 => [l.x + lx, l.z + lz];
  // the plan: a long face on the street, a short back, and a long face behind, meeting at the prow in the south-west
  const plan = [P(1.3, l.d - 0.8), P(l.w - 0.6, l.d - 0.8), P(l.w - 0.6, l.d - 8.0), P(0.8, l.d - 1.75)];
  const cx = plan.reduce((s, p) => s + p[0], 0) / 4, cz = plan.reduce((s, p) => s + p[1], 0) / 4;
  const grown = (d: number): P2[] => plan.map((p): P2 => {
    const k = d / (Math.hypot(p[0] - cx, p[1] - cz) || 1);
    return [p[0] + (p[0] - cx) * k, p[1] + (p[1] - cz) * k];
  });
  // (window rows are counted from the ground, so every part is a whole number of storeys tall)
  const st = 2.1, y1 = 2 * st, y2 = y1 + st * Math.round((l.y1 - 1 - y1) / st);
  prism(b, plan, 0, y1, BASE, { win: { cell: 1.7, storey: y1, lit: 0.5, kind: 2 }, seed: 0.2, top: false });
  prism(b, grown(0.14), y1 - 0.35, y1, CORNICE, { top: false });
  prism(b, plan, y1, y2, STONE, { win: { cell: 1.05, storey: st, lit: 0.4, kind: 0 }, seed: 0.6, top: false });
  prism(b, grown(0.14), y2 - 2 * st - 0.3, y2 - 2 * st, CORNICE, { top: false });
  prism(b, grown(0.5), y2, y2 + 1, CORNICE, { top: 0x8d8a83 });
  ctx.lights.push({ x: l.x + 1, z: l.z + l.d + 2, r: 10, color: '#ffe2ae', k: 0.45 });
}

/** A diner in polished steel, its name in neon on the roof, with room to park in front. */
function diner(l: Building, ctx: LandmarkCtx): void {
  const { b } = ctx;
  const STEEL = 0xcfd8df, RED = 0xc8402a, ROOF = 0xe6ebef, BOARD = 0x14141c;
  const z0 = l.z + 0.8, z1 = l.z + 5.8, h = 4.4;
  const zc = (z0 + z1) / 2, r = (z1 - z0) / 2;
  const x0 = l.x + 0.7 + r, x1 = l.x + l.w - 0.7 - r, cx = (x0 + x1) / 2;
  // the forecourt, marked out for three cars
  b.box(l.x + 0.2, 0, z1 + 0.5, l.x + l.w - 0.2, 0.06, l.z + l.d + 1, 0x55575d, { faces: 'T' });
  for (const lx of [0.5, 4.8, 9.2, 13.5]) b.box(l.x + lx - 0.08, 0, l.z + 7.4, l.x + lx + 0.08, 0.08, l.z + l.d + 0.6, 0xf2efe6, { faces: 'T' });
  // the car: a long body with rounded ends, a band of windows, and red stripes
  b.box(x0, 0, z0, x1, h, z1, STEEL, { win: { cell: 1.9, storey: h, lit: 1, kind: 2 }, seed: 0.5, faces: 'NST', top: ROOF });
  for (const x of [x0, x1]) b.cyl(x, zc, 0, h, r, r, 12, STEEL, { win: interior(0.35), cap: ROOF });
  for (const [ya, yb] of [[0.15, 0.5], [h - 0.6, h - 0.2]]) {
    b.box(x0, ya, z0 - 0.06, x1, yb, z1 + 0.06, RED, { faces: 'NS' });
    for (const x of [x0, x1]) b.cyl(x, zc, ya, yb, r + 0.06, r + 0.06, 12, RED, { cap: false });
  }
  // the raised strip of roof, and the name above it
  b.box(x0 - 0.6, h, z0 + 1.1, x1 + 0.6, h + 0.6, z1 - 1.1, STEEL, { win: interior(0.3), top: ROOF });
  const y = h + 0.6 + 1.7;
  const w = ctx.sign('diner', cx, y, zc + 0.14, 0, 1, 3.0);
  ctx.sign('diner', cx, y, zc - 0.14, 0, -1, 3.0);
  b.box(cx - w / 2, y - 1.5, zc - 0.12, cx + w / 2, y + 1.5, zc + 0.12, BOARD);
  // the door and its step
  b.box(cx - 0.75, 0, z1, cx + 0.75, 0.3, z1 + 0.9, 0xb9b2a2);
  b.box(cx - 0.55, 0.3, z1, cx + 0.55, 3.3, z1 + 0.08, 0x7a2f2a, { faces: 'S' });
  // a sign on a pole at the kerb
  const px = l.x + l.w - 0.9, pz = l.z + l.d + 0.4;
  b.box(px - 0.14, 0, pz - 0.14, px + 0.14, 5.0, pz + 0.14, 0x4b4f57);
  const bw = ctx.sign('eat-v', px, 7.4, pz + 0.12, 0, 1, 4.8);
  ctx.sign('eat-v', px, 7.4, pz - 0.12, 0, -1, 4.8);
  b.box(px - bw / 2, 5.0, pz - 0.1, px + bw / 2, 9.8, pz + 0.1, BOARD);
  ctx.lights.push({ x: cx, z: z1 + 3.5, r: 13, color: '#ff8a7a', k: 0.55 });
  ctx.lights.push({ x: cx, z: zc, r: 9, color: '#ffe2ae', k: 0.5 });
}

/** Marina City: two round towers like corncobs, car parks below and balconies above. */
function marinaCity(l: Building, ctx: LandmarkCtx): void {
  const { b } = ctx;
  const CONC = 0xdcd5c5, SHADE = 0xb5afa2, DARK = 0x3a3f45, ROOMS = 0xa89a7c;
  const H = l.y1, R = 3.15;
  b.box(l.x + 0.4, 0, l.z + 0.4, l.x + l.w - 0.4, 2.8, l.z + l.d - 0.4, 0xcfc8b8, { win: { cell: 2.2, storey: 2.8, lit: 0.8, kind: 2 }, seed: 0.6, top: SHADE });
  const st = 2.0, y0 = 2.8;
  const yP = st * Math.round((y0 + (H - y0) * 0.3) / st), yT = yP + st * Math.floor((H - 2.6 - yP) / st);
  const towers: [number, number, boolean][] = [[l.x + 4.0, l.z + l.d - 4.6, true], [l.x + l.w - 4.0, l.z + 4.6, false]];
  for (const [cx, cz, mast] of towers) {
    // the car park: a stack of thin decks round a dark core
    b.cyl(cx, cz, y0, yP, 1.5, 1.5, 10, DARK, { cap: false });
    for (let y = y0 + 0.85; y < yP - 0.3; y += 1.25) b.cyl(cx, cz, y, y + 0.42, R, R, 16, CONC, { cap: CONC });
    // the flats: ring upon ring of balconies, with the lit rooms showing between them
    b.cyl(cx, cz, yP, yT, R - 0.45, R - 0.45, 16, ROOMS, { win: interior(1.5), cap: false });
    for (let y = yP; y < yT + 0.1; y += st) b.cyl(cx, cz, y, y + 0.5, R + 0.2, R + 0.2, 16, CONC, { win: interior(0.12), cap: CONC });
    // the plant room on the roof
    b.cyl(cx, cz, yT + 0.62, H, 1.6, 1.6, 10, CONC, { cap: SHADE });
    if (mast) {
      b.cyl(cx, cz, H, H + 11, 0.3, 0.06, 6, 0xe9e9ec, { cap: false });
      lamp(ctx, cx, H + 11.4, cz);
    } else {
      lamp(ctx, cx + 0.8, H + 0.6, cz, 0.5);
    }
  }
  ctx.lights.push({ x: l.x + l.w / 2, z: l.z + l.d + 2.5, r: 12, color: '#ffe2ae', k: 0.5 });
}

export function buildLandmarkLot(l: Building, ctx: LandmarkCtx): void {
  switch (l.landmark) {
    case 'sears': return sears(l, ctx);
    case 'wtc-north': return twinTower(l, ctx, true);
    case 'wtc-south': return twinTower(l, ctx, false);
    case 'empire': return empire(l, ctx);
    case 'liberty': return liberty(l, ctx);
    case 'chrysler': return chrysler(l, ctx);
    case 'needle': return spaceNeedle(l, ctx);
    case 'coit': return coitTower(l, ctx);
    case 'ladies': return paintedLadies(l, ctx);
    case 'transamerica': return transamerica(l, ctx);
    case 'flatiron': return flatiron(l, ctx);
    case 'diner': return diner(l, ctx);
    case 'marina': return marinaCity(l, ctx);
  }
}

// ---------------------------------------------------------------------------
// Monuments that stand on their own
// ---------------------------------------------------------------------------

/** The Gateway Arch, spanning the boulevard so that traffic drives through it. */
function gatewayArch({ b, lights }: LandmarkCtx): void {
  const k = 3.0, n = 34;
  const pts: V3[] = [], radii: number[] = [];
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * 2 - 1;
    const y = ARCH.height * (1 - (Math.cosh(k * u) - 1) / (Math.cosh(k) - 1));
    pts.push([ARCH.x, y, ARCH.z + (u * ARCH.span) / 2]);
    radii.push(2.3 - 1.5 * (y / ARCH.height)); // thick at the feet, slender at the crown
  }
  b.sweep(pts, radii, 0xc9d3db, { win: interior(0.34) });
  for (const side of [-1, 1]) {
    const z = ARCH.z + (side * ARCH.span) / 2;
    b.box(ARCH.x - 4.5, 0, z - 4.5, ARCH.x + 4.5, 0.14, z + 4.5, 0xd8d2c4, { faces: 'NESWT' });
    lights.push({ x: ARCH.x, z, r: 11, color: '#e6f0ff', k: 0.6 });
  }
}

/** The Golden Gate Bridge, carrying the expressway over the boulevard. */
function goldenGate(ctx: LandmarkCtx): void {
  const { b } = ctx;
  const G = GOLDEN_GATE;
  const RED = 0xc8402a;
  const g = interior(0.6);
  const hw = EXPRESS_HALF + 0.72; // the towers stand just outside the deck
  const reach = 12; // how far the side spans run beyond each tower, before the deck starts to curve
  for (const z of [G.z0, G.z1]) {
    for (const side of [-1, 1]) {
      const x = G.x + side * hw;
      b.box(x - 0.75, 0, z - 0.75, x + 0.75, 30, z + 0.75, RED, { win: g });
      b.box(x - 0.6, 30, z - 0.6, x + 0.6, 44, z + 0.6, RED, { win: g });
      b.box(x - 0.48, 44, z - 0.48, x + 0.48, G.top, z + 0.48, RED, { win: g });
      lamp(ctx, x, G.top + 0.5, z, 0.6);
    }
    for (const y of [14.5, 31, 40.5, 48.5, G.top - 1.3]) {
      b.box(G.x - hw, y, z - 0.42, G.x + hw, y + (y > 30 ? 1.4 : 2.0), z + 0.42, RED, { win: g, faces: 'NESWTB' });
    }
    ctx.lights.push({ x: G.x, z, r: 11, color: '#ffb48a', k: 0.5 });
  }
  const low = EXPRESS_Y + 3.0, deck = EXPRESS_Y + 1.1;
  for (const side of [-1, 1]) {
    const x = G.x + side * hw;
    const pts: V3[] = [];
    // down from the far anchorage, over both towers, and down again
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      pts.push([x, deck + (G.top - deck) * (t * t * 0.55 + t * 0.45), G.z0 - reach + reach * t]);
    }
    for (let i = 1; i <= 14; i++) {
      const u = (i / 14) * 2 - 1;
      pts.push([x, low + (G.top - low) * u * u, (G.z0 + G.z1) / 2 + (u * (G.z1 - G.z0)) / 2]);
    }
    for (let i = 1; i <= 6; i++) {
      const t = 1 - i / 6;
      pts.push([x, deck + (G.top - deck) * (t * t * 0.55 + t * 0.45), G.z1 + reach * (1 - t)]);
    }
    b.sweep(pts, pts.map(() => 0.28), RED, { win: g });
    // the hangers from the cable down to the deck
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i];
      if (p[1] - deck < 1.2) continue;
      b.box(x - 0.08, deck, p[2] - 0.08, x + 0.08, p[1], p[2] + 0.08, RED, { faces: 'NESW' });
    }
    // the red girder along the deck's edge
    const gx = G.x + side * (EXPRESS_HALF + 0.14);
    b.box(gx - 0.16, EXPRESS_Y - 2.4, G.z0 - reach, gx + 0.16, EXPRESS_Y + 1.25, G.z1 + reach, RED, { win: g, faces: 'NESWTB' });
  }
}

/** A neon arch for Route 66 astride the street, so that traffic drives through it. */
function route66(ctx: LandmarkCtx): void {
  const { b } = ctx;
  const T = ROUTE66;
  const STEEL = 0x2f6f7a, BOARD = 0x14141c;
  const g = interior(0.35);
  const top = T.height + 0.6;
  for (const side of [-1, 1]) {
    const x = T.x + side * T.half;
    b.box(x - 0.9, 0, T.z - 0.9, x + 0.9, 0.5, T.z + 0.9, 0xb9b2a2);
    b.box(x - 0.42, 0.5, T.z - 0.42, x + 0.42, top, T.z + 0.42, STEEL, { win: g });
    ctx.lights.push({ x, z: T.z, r: 9, color: '#ffb02e', k: 0.5 });
    for (let i = 0; i < 3; i++) ctx.person(T.x + side * 5.8, T.z + 1.6 + i * 1.1);
  }
  // the truss: a flat chord on top, an arched one below, and struts between them
  const n = 12;
  const lower: V3[] = [], upper: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * 2 - 1;
    lower.push([T.x + u * T.half, T.height - 3.4 + 1.6 * (1 - u * u), T.z]);
    upper.push([T.x + u * T.half, top - 0.2, T.z]);
  }
  b.sweep(lower, lower.map(() => 0.2), STEEL, { win: g });
  b.sweep(upper, upper.map(() => 0.2), STEEL, { win: g });
  for (let i = 1; i < n; i++) b.beam(lower[i], upper[i], 0.1, 0.1, STEEL, { win: g });
  // one word along the truss, and the highway's marker above it: together, what the road's signs say today
  const w = ctx.sign('historic', T.x, T.height - 0.4, T.z + 0.3, 0, 1, 1.9);
  ctx.sign('historic', T.x, T.height - 0.4, T.z - 0.3, 0, -1, 1.9);
  b.box(T.x - w / 2 - 0.1, T.height - 1.4, T.z - 0.26, T.x + w / 2 + 0.1, T.height + 0.6, T.z + 0.26, BOARD);
  const sw = ctx.sign('shield66', T.x, top + 2.5, T.z + 0.2, 0, 1, 4.4);
  ctx.sign('shield66', T.x, top + 2.5, T.z - 0.2, 0, -1, 4.4);
  b.box(T.x - sw / 2, top + 0.3, T.z - 0.17, T.x + sw / 2, top + 4.7, T.z + 0.17, BOARD);
  b.box(T.x - 0.25, top - 0.2, T.z - 0.2, T.x + 0.25, top + 0.3, T.z + 0.2, STEEL);
  ctx.lights.push({ x: T.x, z: T.z + 4, r: 14, color: '#ffb02e', k: 0.5 });
}

/**
 * Wrigley Field: the grandstand round home plate, ivy on the outfield wall, the
 * bleachers behind it and the green scoreboard above them. Home plate is
 * towards the block's north-west corner, so the field opens to the south-east.
 */
function wrigleyField(ctx: LandmarkCtx): void {
  const { b } = ctx;
  const W = WRIGLEY;
  const GRASS = [0x5fa04e, 0x6bb058], DIRT = 0xb98a5e, IVY = 0x3f7f3a, BRICK = 0xa0523d, CHALK = 0xf6f3ea;
  const SEAT = 0x2f6f4f, BOX_SEAT = 0x3b7d5a, CREAM = 0xe9e3d6, SHADOW = 0x3a3f45, ROOF = 0x59635e, GREEN = 0x2f5d48, STEEL = 0x35584a;
  const CLOTHES = [0xd94f4f, 0x3f6fb5, 0xf2c14e, 0xeeeeee, 0x2f2f38, 0xf08a4b, 0x7fd0c8, 0x3f6fb5, 0xeeeeee];
  const D2 = Math.SQRT1_2, QUARTER = Math.PI / 2;
  const rand = rng(1914);
  const hx = W.home.x, hz = W.home.z;
  /** A point `r` from home plate: an angle of 0 is along the line to the east, a quarter turn along the line to the south. */
  const at = (r: number, a: number, y: number): V3 => [hx + Math.cos(a) * r, y, hz + Math.sin(a) * r];
  /** A flat patch on the ground, `y` above it. */
  const flat = (x0: number, z0: number, x1: number, z1: number, y: number, color: number): void =>
    b.box(x0, 0, z0, x1, y, z1, color, { faces: 'T' });
  const fan = (x: number, y: number, z: number): void =>
    b.box(x - 0.22, y, z - 0.22, x + 0.22, y + 0.62, z + 0.22, CLOTHES[Math.floor(rand() * CLOTHES.length)]);

  // --- the field: outfield grass mown in wedges, with the warning track at the foot of the wall ---
  const SEG = 18, far = W.wall(0);
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * QUARTER, a1 = ((i + 1) / SEG) * QUARTER;
    const r0 = W.wall(a0), r1 = W.wall(a1);
    upTri(b, [hx, 0.07, hz], at(r0 - 1.4, a0, 0.07), at(r1 - 1.4, a1, 0.07), GRASS[(i >> 1) % 2]);
    b.quad(at(r0 - 1.4, a0, 0.07), at(r0, a0, 0.07), at(r1, a1, 0.07), at(r1 - 1.4, a1, 0.07), [0, 1, 0], DIRT);
  }
  // foul ground, between the lines and the stands
  const gap = hx - (W.x0 + W.front);
  b.quad([hx + 4, 0.07, hz - gap], [hx + far, 0.07, hz - gap], [hx + far, 0.07, hz], [hx, 0.07, hz], [0, 1, 0], GRASS[0]);
  b.quad([hx - gap, 0.07, hz + 4], [hx, 0.07, hz], [hx, 0.07, hz + far], [hx - gap, 0.07, hz + far], [0, 1, 0], GRASS[0]);
  upTri(b, [hx + 4, 0.07, hz - gap], [hx, 0.07, hz], [hx - gap, 0.07, hz + 4], GRASS[0]);
  // the infield: dirt, the square of grass inside the bases, the mound and home plate
  const base = 7.4;
  b.cyl(hx + 3.5, hz + 3.5, 0, 0.1, 7.8, 7.8, 24, DIRT);
  flat(hx + 0.9, hz + 0.9, hx + base - 0.9, hz + base - 0.9, 0.13, GRASS[1]);
  b.cyl(hx + 3.5, hz + 3.5, 0, 0.16, 1.0, 1.0, 12, DIRT);
  b.cyl(hx, hz, 0, 0.12, 1.5, 1.5, 12, DIRT);
  // the foul lines, the bases and the foul poles
  flat(hx + 1, hz - 0.07, hx + far, hz + 0.07, 0.18, CHALK);
  flat(hx - 0.07, hz + 1, hx + 0.07, hz + far, 0.18, CHALK);
  for (const [dx, dz] of [[base, 0], [base, base], [0, base], [0, 0], [3.5, 3.5]]) flat(hx + dx - 0.28, hz + dz - 0.28, hx + dx + 0.28, hz + dz + 0.28, 0.2, CHALK);
  for (const a of [0, QUARTER]) {
    const p = at(far, a, 0);
    b.box(p[0] - 0.12, 0, p[2] - 0.12, p[0] + 0.12, 9, p[2] + 0.12, 0xf6c744);
  }

  // --- the outfield wall with its ivy, and the bleachers behind it ---
  const yW = 2.4, thick = 0.35, rise = 0.55;
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * QUARTER, a1 = ((i + 1) / SEG) * QUARTER, am = (a0 + a1) / 2;
    const cs = Math.cos(am), sn = Math.sin(am);
    const r0 = W.wall(a0), r1 = W.wall(a1), d0 = W.bleachers(a0), d1 = W.bleachers(a1);
    b.quad(at(r0, a0, 0), at(r1, a1, 0), at(r1, a1, yW), at(r0, a0, yW), [-cs, 0, -sn], IVY);
    b.quad(at(r0, a0, yW), at(r1, a1, yW), at(r1 + thick, a1, yW), at(r0 + thick, a0, yW), [0, 1, 0], BRICK);
    // the middle of centre field is kept dark and empty, so that the batter can see the ball
    const eye = Math.abs(am - Q) < 0.14;
    for (let k = 0; k < 3; k++) {
      const f0 = k / 3, f1 = (k + 1) / 3;
      b.quad(
        at(r0 + thick + d0 * f0, a0, yW + d0 * f0 * rise), at(r1 + thick + d1 * f0, a1, yW + d1 * f0 * rise),
        at(r1 + thick + d1 * f1, a1, yW + d1 * f1 * rise), at(r0 + thick + d0 * f1, a0, yW + d0 * f1 * rise),
        [-cs * 0.48, 0.88, -sn * 0.48], eye ? 0x2a5a3a : k % 2 ? SEAT : BOX_SEAT,
      );
    }
    // the back of the bleachers: a brick wall with a low parapet
    const p0 = at(r0 + thick + d0, a0, 0), p1 = at(r1 + thick + d1, a1, 0);
    const yb0 = yW + d0 * rise, yb1 = yW + d1 * rise;
    b.quad(p0, p1, [p1[0], yb1 + 0.6, p1[2]], [p0[0], yb0 + 0.6, p0[2]], [cs, 0, sn], BRICK);
    b.quad([p0[0], yb0, p0[2]], [p1[0], yb1, p1[2]], [p1[0], yb1 + 0.6, p1[2]], [p0[0], yb0 + 0.6, p0[2]], [-cs, 0, -sn], BRICK);
    if (eye) continue;
    for (let k = 0; k < 4; k++) {
      const u = rand(), f = 0.08 + rand() * 0.84, d = mix(d0, d1, u);
      const p = at(mix(r0, r1, u) + thick + d * f, mix(a0, a1, u), yW + d * f * rise);
      fan(p[0], p[1], p[2]);
    }
  }
  for (const [a, nx, nz] of [[0, 0, -1], [QUARTER, -1, 0]]) {
    const r = W.wall(a), d = W.bleachers(a);
    b.quad(at(r, a, 0), at(r + thick, a, 0), at(r + thick, a, yW), at(r, a, yW), [nx, 0, nz], BRICK);
    b.quad(at(r + thick, a, 0), at(r + thick + d, a, 0), at(r + thick + d, a, yW + d * rise + 0.6), at(r + thick, a, yW), [nx, 0, nz], BRICK);
  }

  // --- the scoreboard in centre field ---
  {
    const [sx, , sz] = at(W.wall(Q) + thick + W.bleachers(Q) + 0.9, Q, 0);
    for (const k of [-4.2, 0, 4.2]) b.obox(sx - D2 * k, 4.2, sz + D2 * k, 0.28, 4.2, 0.28, Q, STEEL);
    b.obox(sx, 11.9, sz, 0.6, 3.5, 5.7, Q, GREEN);
    b.obox(sx, 15.6, sz, 0.75, 0.2, 5.9, Q, STEEL);
    // the clock on top of it, and the mast with its flags
    b.obox(sx, 16.75, sz, 0.3, 0.95, 0.95, Q, 0xf2efe6, { win: interior(1.2) });
    b.cyl(sx, sz, 17.7, 22.5, 0.1, 0.06, 5, 0xe9e9ec, { cap: false });
    for (const [y, col] of [[21.6, 0xf2efe6], [20.6, 0x3f6fb5], [19.6, 0xd94f4f]]) b.obox(sx - D2 * 0.75, y, sz + D2 * 0.75, 0.04, 0.38, 0.7, Q, col);
    // its face looks at home plate
    ctx.sign('scoreboard', sx - D2 * 0.64, 11.9, sz - D2 * 0.64, -D2, -D2, 5.8);
    // The red marquee hangs below it, over the gate to the bleachers. The real one
    // is on the corner behind home plate. On this tile that corner faces the
    // expressway and the Gate Tower, and no view of the city can see it.
    const mx = sx + D2 * 0.7, mz = sz + D2 * 0.7;
    b.obox(mx, 6.3, mz, 0.2, 1.9, 6.15, Q, 0xa81a24);
    ctx.sign('marquee', mx + D2 * 0.24, 6.3, mz + D2 * 0.24, D2, D2, 3.6);
    ctx.lights.push({ x: sx + 3, z: sz + 3, r: 11, color: '#ff8a8a', k: 0.5 });
  }

  // --- the grandstand ---
  // A rib is where the front and the back of the stand meet the ground. The stand
  // is three stretches between four ribs: a wing along the north side, the corner
  // behind home plate, and a wing along the west side.
  interface Rib { f: P2; k: P2 }
  const L = (u: number, v: number): P2 => [W.x0 + u, W.z0 + v];
  const F = W.front, K = W.front - W.depth, TOP = 12.9;
  const ribE: Rib = { f: L(41, F), k: L(41, K) }, ribN: Rib = { f: L(17, F), k: L(17, K) };
  const ribW: Rib = { f: L(F, 17), k: L(K, 17) }, ribS: Rib = { f: L(F, 41), k: L(K, 41) };
  const on = (r: Rib, t: number, y: number): V3 => [mix(r.f[0], r.k[0], t), y, mix(r.f[1], r.k[1], t)];
  /** An upright face between two ribs, `t` of the way back, that looks at the field (1) or away from it (-1). */
  const face = (A: Rib, B: Rib, t: number, y0: number, y1: number, dir: number, color: number, o: QuadOpts = {}): void => {
    const p = on(A, t, y0), q = on(B, t, y0);
    const len = Math.hypot(q[0] - p[0], q[2] - p[2]) || 1;
    let nx = (q[2] - p[2]) / len, nz = -(q[0] - p[0]) / len;
    if ((nx * (hx + 15 - (p[0] + q[0]) / 2) + nz * (hz + 15 - (p[2] + q[2]) / 2)) * dir < 0) { nx = -nx; nz = -nz; }
    b.quad(p, q, on(B, t, y1), on(A, t, y1), [nx, 0, nz], color, { ...o, L: len });
  };
  /** A bank of seats between two ribs, rising towards the back, with some of the crowd in it. */
  const seats = (A: Rib, B: Rib, t0: number, y0: number, t1: number, y1: number, color: number, crowd: number): void => {
    const p0 = on(A, t0, y0), p1 = on(B, t0, y0), p2 = on(B, t1, y1), p3 = on(A, t1, y1);
    const e: V3 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], g: V3 = [p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]];
    const n: V3 = [e[1] * g[2] - e[2] * g[1], e[2] * g[0] - e[0] * g[2], e[0] * g[1] - e[1] * g[0]];
    const nl = (Math.hypot(n[0], n[1], n[2]) || 1) * (n[1] < 0 ? -1 : 1);
    b.quad(p0, p1, p2, p3, [n[0] / nl, n[1] / nl, n[2] / nl], color);
    for (let i = 0; i < crowd; i++) {
      const u = rand(), t = mix(t0, t1, 0.06 + rand() * 0.88);
      const a = on(A, t, 0), c = on(B, t, 0);
      fan(mix(a[0], c[0], u), mix(y0, y1, (t - t0) / (t1 - t0)), mix(a[2], c[2], u));
    }
  };
  const stand = (A: Rib, B: Rib, roofed: boolean): void => {
    const len = Math.hypot(B.f[0] - A.f[0], B.f[1] - A.f[1]);
    face(A, B, 0, 0, 1.4, 1, BRICK);
    seats(A, B, 0, 1.4, 0.3, 3.1, BOX_SEAT, Math.round(len * 1.1));
    seats(A, B, 0.3, 3.1, 0.62, 4.9, SEAT, Math.round(len * 1.2));
    face(A, B, 0.62, 4.9, 6.3, 1, SHADOW);
    face(A, B, 0.46, 6.3, 7.5, 1, CREAM, { win: interior(0.35) });
    seats(A, B, 0.46, 7.5, 1, 11.4, SEAT, Math.round(len * 1.8));
    face(A, B, 1, 11.4, TOP, 1, CREAM);
    // the outside: brick below, with the gates in it, and cream above
    face(A, B, 1, 0, 4.3, -1, BRICK, { win: { cell: 3.2, storey: 4.3, lit: 0.6, kind: 2 }, seed: 0.4 });
    face(A, B, 1, 4.3, TOP, -1, CREAM, { win: { cell: 2.3, storey: 4.3, lit: 0.3, kind: 6 }, seed: 0.7 });
    if (!roofed) return;
    // the roof over the back of the upper deck, on its posts
    const yR = TOP + 1.1;
    b.quad(on(A, 0.64, yR), on(B, 0.64, yR), on(B, 1.02, yR), on(A, 1.02, yR), [0, 1, 0], ROOF);
    face(A, B, 0.64, yR - 0.45, yR, 1, CREAM);
    face(A, B, 1, TOP, yR, -1, CREAM);
    const posts = Math.max(2, Math.round(len / 4.8));
    for (let i = 0; i <= posts; i++) {
      const a = on(A, 0.66, 0), c = on(B, 0.66, 0);
      const x = mix(a[0], c[0], i / posts), z = mix(a[2], c[2], i / posts);
      b.beam([x, 8.9, z], [x, yR - 0.4, z], 0.11, 0.11, STEEL);
    }
    // three banks of lights on the roof, turned towards the field
    const ex = (B.f[0] - A.f[0]) / len, ez = (B.f[1] - A.f[1]) / len;
    for (const u of [0.18, 0.5, 0.82]) {
      const a = on(A, 0.84, 0), c = on(B, 0.84, 0), fa = on(A, 0.7, 0), fc = on(B, 0.7, 0);
      const x = mix(a[0], c[0], u), z = mix(a[2], c[2], u);
      const fx = mix(fa[0], fc[0], u) - x, fz = mix(fa[2], fc[2], u) - z, fl = Math.hypot(fx, fz) || 1;
      for (const s of [-1.3, 1.3]) b.beam([x + ex * s, yR, z + ez * s], [x + ex * s, yR + 2.4, z + ez * s], 0.1, 0.1, STEEL);
      b.obox(x, yR + 3.2, z, 1.75, 0.95, 0.14, Math.atan2(ez, ex), STEEL);
      for (let row = 0; row < 2; row++) {
        for (let j = 0; j < 4; j++) {
          const s = (j - 1.5) * 0.8;
          ctx.glows.push({ x: x + ex * s + (fx / fl) * 0.26, y: yR + 2.8 + row * 0.8, z: z + ez * s + (fz / fl) * 0.26, sx: 0.44, sy: 0.44, sz: 0.44, color: '#fff6e0' });
        }
      }
    }
  };
  stand(ribE, ribN, true);
  stand(ribN, ribW, false);
  stand(ribW, ribS, true);
  // the open ends of the two wings
  for (const [R, nx, nz] of [[ribE, 1, 0], [ribS, 0, 1]] as [Rib, number, number][]) {
    b.quad(on(R, 0, 0), on(R, 0.62, 0), on(R, 0.62, 4.9), on(R, 0, 1.4), [nx, 0, nz], BRICK);
    b.quad(on(R, 0.62, 0), on(R, 1, 0), on(R, 1, 6.3), on(R, 0.62, 6.3), [nx, 0, nz], BRICK);
    b.quad(on(R, 0.46, 6.3), on(R, 1, 6.3), on(R, 1, TOP), on(R, 0.46, 7.5), [nx, 0, nz], CREAM);
  }
  {
    // the press box, at the top of the stand behind home plate
    const [px, pz] = L(9.9, 9.9);
    b.obox(px, 12.7, pz, 1.0, 1.3, 4.2, Q, CREAM, { win: interior(0.7) });
    b.obox(px + D2 * 1.02, 12.9, pz + D2 * 1.02, 0.03, 0.5, 3.9, Q, 0x39424d);
    // the corner in front of the gates
    ctx.lights.push({ x: W.x0 + 5, z: W.z0 + 5, r: 12, color: '#ffe2ae', k: 0.5 });
  }

  // floodlights, for the night games
  ctx.lights.push({ x: hx + 12, z: hz + 12, r: 34, color: '#f4f8ff', k: 0.95 });
  ctx.lights.push({ x: hx + 22, z: hz + 7, r: 18, color: '#f4f8ff', k: 0.5 });
  ctx.lights.push({ x: hx + 7, z: hz + 22, r: 18, color: '#f4f8ff', k: 0.5 });
  // the two teams, and the crowd on the corner in front of the gates
  for (const [dx, dz] of [[3.5, 3.5], [-0.5, -0.5], [0.8, -0.3], [-1.3, -1.3], [0.8, 7.7], [4.6, 8.6], [8.6, 4.6], [7.7, 0.8]]) ctx.person(hx + dx, hz + dz);
  for (const [r, a] of [[20, 0.3], [24, Q], [20, QUARTER - 0.3]]) {
    const p = at(r, a, 0);
    ctx.person(p[0], p[2]);
  }
  for (let i = 0; i < 9; i++) ctx.person(W.x0 + 1.5 + rand() * 5.5, W.z0 + 1.5 + rand() * 5.5);
  ctx.tree(W.x0 + 2.4, W.z0 + 8.6, 0.7);
  ctx.tree(W.x0 + 8.6, W.z0 + 2.4, 0.7);
  {
    // a hot-dog cart under its umbrella, on the corner behind the scoreboard
    const cx = W.x1 - 4.2, cz = W.z1 - 3.4;
    b.box(cx - 1.1, 0.45, cz - 0.6, cx + 1.1, 1.5, cz + 0.6, 0xcfd8df, { top: 0xb9bcc2 });
    b.box(cx - 1.12, 0.9, cz - 0.62, cx + 1.12, 1.15, cz + 0.62, 0xc8402a, { faces: 'NESW' });
    for (const dx of [-0.7, 0.7]) b.box(cx + dx - 0.25, 0, cz - 0.68, cx + dx + 0.25, 0.5, cz + 0.68, 0x17171a);
    b.box(cx - 0.06, 1.5, cz - 0.06, cx + 0.06, 3.3, cz + 0.06, 0x4b4f57);
    b.cyl(cx, cz, 3.0, 3.7, 1.9, 0.12, 8, 0xf6c744, { cap: false });
    b.cyl(cx, cz, 3.7, 3.9, 0.14, 0.14, 6, 0xc8402a);
    for (let i = 0; i < 6; i++) ctx.person(cx - 2.6 + rand() * 5.2, cz + 1.2 + rand() * 1.4);
    ctx.lights.push({ x: cx, z: cz, r: 7, color: '#ffe2ae', k: 0.5 });
  }
}

export function buildMonuments(ctx: LandmarkCtx): void {
  gatewayArch(ctx);
  goldenGate(ctx);
  route66(ctx);
  wrigleyField(ctx);
}
