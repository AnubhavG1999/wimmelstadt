// Toy versions of three of Europe's towers. Every model is written to stand
// at (0, 0), and the tile stands it where it belongs with `placed`.
//
// Big Ben and the Leaning Tower of Pisa are carried over from the look
// prototype by way of the island. The Eiffel Tower came the same way as a few
// solid bars, and has since been built again as open ironwork.

import { interior, type V3, type WinSpec } from '../../engine/geo';
import type { Build, Glow } from '../../engine/tile';

/** What a model builds with: the tile's own build, or the part of it inside `placed`. */
type Ctx = Build;

const lamp = (ctx: { glows: Glow[] }, x: number, y: number, z: number, s = 0.7, color = '#ff3b3b'): void => {
  ctx.glows.push({ x, y, z, sx: s, sy: s, sz: s, color });
};

/** Big Ben: the clock tower alone, `h` high to the tip of its spire, with a lit face on every side. */
export function bigBen(ctx: Ctx, h = 56): void {
  const { b } = ctx;
  const STONE = 0xcbb78a, SLATE = 0x4a4f55, GOLD = 0xd9b24a, FACE = 0xf6efd9, HAND = 0x25272b;
  const k = h / 51.5;
  const hw = 2.5 * k, hb = 3.0 * k;
  const yShaft = 30 * k, yClock = 37.2 * k, yBelfry = 40.4 * k, yRoof = 44.2 * k, yLantern = 46 * k;
  // (window rows are counted from the ground, so the shaft is a whole number of storeys)
  const storey = yShaft / Math.round(yShaft / 3.4);
  b.box(-hw, 0, -hw, hw, yShaft, hw, STONE, { win: { cell: 1.2 * k, storey, lit: 0.3, kind: 6 }, seed: 0.5 });
  b.box(-hb, yShaft, -hb, hb, yClock, hb, STONE);
  // a clock face on every side, lit from within at night, with its hands at three o'clock
  const cy = (yShaft + yClock) / 2, f = 2.2 * k, glow = interior(1.6), e = 0.07;
  for (const [nx, nz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const rx = nz, rz = -nx; // to the right of someone who looks at this face
    const at = (u: number, v: number, out: number): V3 => [nx * (hb + out) + rx * u, cy + v, nz * (hb + out) + rz * u];
    const face = (u0: number, v0: number, u1: number, v1: number, out: number, color: number, win?: WinSpec): void =>
      b.quad(at(u0, v0, out), at(u1, v0, out), at(u1, v1, out), at(u0, v1, out), [nx, 0, nz], color, { win });
    face(-f, -f, f, f, e, FACE, glow);
    face(-0.12 * k, 0, 0.12 * k, 1.9 * k, e * 2, HAND);
    face(0, -0.12 * k, 1.3 * k, 0.12 * k, e * 2, HAND);
  }
  // belfry, roof, lantern and spire
  b.box(-2.7 * k, yClock, -2.7 * k, 2.7 * k, yBelfry, 2.7 * k, 0xb9a678, { win: { cell: 0.9 * k, storey: yBelfry - yClock, lit: 0.2, kind: 6 }, seed: 0.2 });
  b.cyl(0, 0, yBelfry, yRoof, 3.9 * k, 2.0 * k, 4, SLATE, { phase: Math.PI / 4, cap: false });
  b.box(-1.2 * k, yRoof, -1.2 * k, 1.2 * k, yLantern, 1.2 * k, GOLD, { win: interior(0.9) });
  b.cyl(0, 0, yLantern, h, 1.6 * k, 0.08, 4, SLATE, { phase: Math.PI / 4, cap: false });
  lamp(ctx, 0, h + 0.4, 0, 0.5, '#fff1c9');
  ctx.lights.push({ x: 0, z: 0, r: 12, color: '#ffe2ae', k: 0.5 });
}

/**
 * The Eiffel Tower, `H` high, with its four feet `s` out from the middle. It
 * is open ironwork all the way up. Each leg is four bars, with a ring round
 * them where every panel ends and a cross in each panel that faces outwards.
 * Above the second platform the four legs are one mast, braced the same way.
 * Its outline narrows quickly at first and then slowly, which is the curve it
 * is known by.
 */
export function eiffel(ctx: Ctx, s: number, H: number): void {
  const { b } = ctx;
  // (bars this thin are mostly outline, so the iron is painted lighter than it should look)
  const DARK = 0x8f6e50, IRON = 0x9a7859, PALE = 0xa68462, STONE = 0xc9c0ae;
  const o = { win: interior(1.5) }; // floodlit gold at night
  const y1 = H * 0.17, y2 = H * 0.35, y3 = H * 0.84;
  /** How far out from the middle its outer edge is, at each height. */
  const half = (y: number): number =>
    y <= y1 ? s * Math.pow(0.62, y / y1)
      : y <= y2 ? s * 0.62 * Math.pow(0.34 / 0.62, (y - y1) / (y2 - y1))
        : s * 0.34 * Math.pow(1.05 / (s * 0.34), (y - y2) / (y3 - y2));
  /** How wide each of the four legs is, up to where they become one. */
  const wide = (y: number): number => (y <= y1 ? 5.4 - 1.7 * (y / y1) : 3.7 - 1.0 * ((y - y1) / (y2 - y1)));
  const CORNERS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  /** The four legs between two platforms. `ys` are the heights at which their panels begin and end. */
  const legs = (ys: number[], chord: number, bar: number, color: number): void => {
    for (const [sx, sz] of CORNERS) {
      // the four corners of this leg at a height, in order round it, from the one furthest out
      const at = (y: number): V3[] => {
        const a = half(y), c = a - wide(y);
        return [[sx * a, y, sz * a], [sx * a, y, sz * c], [sx * c, y, sz * c], [sx * c, y, sz * a]];
      };
      for (let j = 0; j + 1 < ys.length; j++) {
        const p = at(ys[j]), q = at(ys[j + 1]);
        for (let c = 0; c < 4; c++) {
          b.beam(p[c], q[c], chord, chord, color, o);
          if (j > 0) b.beam(p[c], p[(c + 1) % 4], bar, bar, color, o);
        }
        // a cross in each of the two sides that face outwards
        for (const [u, v] of [[0, 1], [3, 0]]) {
          b.beam(p[u], q[v], bar, bar, color, o);
          b.beam(p[v], q[u], bar, bar, color, o);
        }
      }
    }
  };

  // --- the four feet, on blocks of stone, and the legs up to the first platform ---
  for (const [sx, sz] of CORNERS) {
    const a = half(0) + 0.5, c = half(0) - wide(0) - 0.5;
    b.box(Math.min(sx * a, sx * c), 0, Math.min(sz * a, sz * c), Math.max(sx * a, sx * c), 0.9, Math.max(sz * a, sz * c), STONE);
  }
  legs([0.9, y1 / 3 + 0.6, (y1 * 2) / 3 + 0.3, y1], 0.42, 0.2, DARK);

  // --- the great arch between each pair of feet, with hangers from it up to the platform ---
  for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const foot = 2.6, crown = y1 - 1.5, u0 = half(foot) - wide(foot) + 0.2;
    // a place on this side of the tower: `u` along the side, at height `y`, as far out as the legs lean there
    const on = (u: number, y: number): V3 => {
      const out = half(y) - 0.35;
      return [ax * out + az * u, y, az * out + ax * u];
    };
    const rise = (u: number): number => foot + (crown - foot) * (1 - (u / u0) ** 2);
    const pts: V3[] = [];
    for (let i = 0; i <= 10; i++) {
      const u = ((i / 10) * 2 - 1) * u0;
      pts.push(on(u, rise(u)));
    }
    b.sweep(pts, pts.map(() => 0.34), DARK, o);
    for (const f of [-0.62, -0.31, 0, 0.31, 0.62]) b.beam(on(f * u0, rise(f * u0)), on(f * u0, y1), 0.13, 0.13, DARK, o);
  }

  // --- the first platform: a deck with a square hole in the middle of it, and the gallery round its edge ---
  const p1 = half(y1) + 0.7, q1 = p1 - 3.5;
  for (const [x0, z0, x1, z1] of [[-p1, -p1, p1, -q1], [-p1, q1, p1, p1], [-p1, -q1, -q1, q1], [q1, -q1, p1, q1]]) {
    b.box(x0, y1, z0, x1, y1 + 1.3, z1, IRON, { ...o, faces: 'NESWTB' });
  }
  b.box(-p1 - 0.12, y1 + 0.3, -p1 - 0.12, p1 + 0.12, y1 + 1.0, p1 + 0.12, PALE, { ...o, faces: 'NESW' });

  // --- the legs up to the second platform, and the platform ---
  legs([y1 + 1.3, (y1 + y2) / 2 + 0.6, y2], 0.34, 0.17, IRON);
  const p2 = half(y2) + 0.7;
  b.box(-p2, y2, -p2, p2, y2 + 1.0, p2, IRON, { ...o, faces: 'NESWTB' });
  b.box(-p2 - 0.1, y2 + 0.25, -p2 - 0.1, p2 + 0.1, y2 + 0.8, p2 + 0.1, PALE, { ...o, faces: 'NESW' });

  // --- the mast: four bars that draw together, with a ring and crosses in every panel ---
  const n = 8, ys = Array.from({ length: n + 1 }, (_, i) => y2 + 1.0 + ((y3 - y2 - 1.0) * i) / n);
  const ring = (y: number): V3[] => {
    const a = half(y);
    return [[a, y, a], [a, y, -a], [-a, y, -a], [-a, y, a]];
  };
  for (let j = 0; j < n; j++) {
    const p = ring(ys[j]), q = ring(ys[j + 1]), chord = 0.3 - 0.14 * (j / n), bar = chord * 0.5;
    for (let c = 0; c < 4; c++) {
      const d = (c + 1) % 4;
      b.beam(p[c], q[c], chord, chord, PALE, o);
      if (j > 0) b.beam(p[c], p[d], bar, bar, PALE, o);
      // (near the top the sides are too narrow for a cross to show, and have one bar aslant)
      b.beam(p[c], q[d], bar, bar, PALE, o);
      if (j < 5) b.beam(p[d], q[c], bar, bar, PALE, o);
    }
  }
  const ym = ys[4], pm = half(ym) + 0.45;
  b.box(-pm, ym - 0.2, -pm, pm, ym + 0.3, pm, IRON, { ...o, faces: 'NESWTB' });

  // --- the top: the last platform, the cabin, the cupola and the mast for the aerials ---
  b.box(-1.75, y3, -1.75, 1.75, y3 + 0.45, 1.75, IRON, { ...o, faces: 'NESWTB' });
  b.box(-1.2, y3 + 0.45, -1.2, 1.2, y3 + 1.9, 1.2, PALE, o);
  b.cyl(0, 0, y3 + 1.9, y3 + 3.5, 1.0, 0.45, 8, IRON, { ...o, cap: false });
  b.cyl(0, 0, y3 + 3.5, y3 + 4.3, 0.42, 0.34, 6, PALE, { ...o, cap: IRON });
  b.cyl(0, 0, y3 + 4.3, H, 0.24, 0.05, 5, 0xbdbdbd, { cap: false });
  lamp(ctx, 0, H + 0.4, 0, 0.6, '#fff1c9');
  ctx.lights.push({ x: 0, z: 0, r: 26, color: '#ffc866', k: 0.7 });
}

/** The Leaning Tower of Pisa, `h` high, leaning south, and a little more than the real one. */
export function pisa(ctx: Ctx, h = 24): void {
  const { b } = ctx;
  const MARBLE = 0xf0ebe0, LEAN = 0.1;
  const k = h / 17.2;
  const win: WinSpec = { cell: 0.9 * k, storey: 1.9 * k, lit: 0, kind: 6 };
  const tier = (y0: number, y1: number, r: number): void => {
    const off = ((y0 + y1) / 2) * LEAN;
    b.cyl(0, off, y0, y1, r, r, 12, MARBLE, { win, seed: y0 * 0.07, cap: 0xd9d2c3 });
    b.cyl(0, off, y1 - 0.24 * k, y1, r + 0.26 * k, r + 0.26 * k, 12, 0xe2dccd, { cap: 0xd9d2c3 });
  };
  tier(0.1, 3.2 * k, 2.6 * k);
  for (let i = 0; i < 6; i++) tier((3.2 + i * 1.9) * k, (5.1 + i * 1.9) * k, 2.5 * k);
  tier(14.6 * k, h, 1.95 * k);
  ctx.lights.push({ x: 0, z: 3, r: 9, color: '#fff3dd', k: 0.6 });
}
