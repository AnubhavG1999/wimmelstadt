// Toy versions of Europe's famous buildings. Each is a few dozen boxes,
// cylinders and bars: enough for the silhouette. Every model is written to
// stand at (0, 0), and the tile stands it where it belongs with `placed`.
//
// Big Ben, the Eiffel Tower and the Leaning Tower of Pisa are carried over
// from the look prototype by way of the island.

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

/** The Eiffel Tower: four legs `s` out from the middle, two platforms and a long taper, `H` high. */
export function eiffel(ctx: Ctx, s: number, H: number): void {
  const { b } = ctx;
  const IRON = 0x80614a;
  const o = { win: interior(1.5) }; // floodlit gold at night
  const y1 = H * 0.17, y2 = H * 0.35, y3 = H * 0.84;
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    b.beam([sx * s, 0, sz * s], [sx * s * 0.62, y1, sz * s * 0.62], 1.9, 1.5, IRON, o);
    b.beam([sx * s * 0.6, y1 + 0.7, sz * s * 0.6], [sx * s * 0.34, y2, sz * s * 0.34], 1.4, 1.1, IRON, o);
  }
  // the arches between the feet
  for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const pts: V3[] = [];
    for (let i = 0; i <= 10; i++) {
      const u = (i / 10) * 2 - 1;
      const y = 2 + (y1 - 3.2) * (1 - u * u);
      const lean = s * (1 - 0.38 * (y / y1));
      // along the side, and in from it as the legs lean
      pts.push([ax * lean + az * u * s * 0.8, y, az * lean + ax * u * s * 0.8]);
    }
    b.sweep(pts, pts.map(() => 0.42), IRON, o);
  }
  b.box(-s * 0.7, y1, -s * 0.7, s * 0.7, y1 + 1.2, s * 0.7, IRON, { ...o, faces: 'NESWTB' });
  b.box(-s * 0.42, y2, -s * 0.42, s * 0.42, y2 + 1.0, s * 0.42, IRON, { ...o, faces: 'NESWTB' });
  b.beam([0, y2 + 1.0, 0], [0, y3, 0], s * 0.34, 1.05, IRON, o);
  b.box(-1.6, y3, -1.6, 1.6, y3 + 1.5, 1.6, IRON, o);
  b.cyl(0, 0, y3 + 1.5, y3 + 3.6, 1.0, 0.5, 6, IRON, { ...o, cap: false });
  b.cyl(0, 0, y3 + 3.6, H, 0.26, 0.06, 5, 0xbdbdbd, { cap: false });
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
