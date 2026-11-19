// The shapes of what moves on Hong Kong besides the traffic: trams and buses
// with two decks, the Star Ferry, a junk, dragon boats and the Peak Tram. The
// engine's traffic has no vehicles of a tile's own shape yet, so each of these
// is a car for the engine's `train`, which runs it along a line of its own.
//
// A shape is built standing on y = 0 with its nose along +x and its middle at
// the origin, as the engine's own train car is. For a boat, y = 0 is the
// waterline. What goes to and fro and never turns round (a ferry, the Peak
// Tram) is the same at both ends.

import * as THREE from 'three';
import { GeoBuilder, interior } from '../../engine/geo';

const GLASS = 0xbfd3df, DARK = 0x2a2c31, LAMP = 0xfff4d6, CREAM = 0xf2e6c4;
type XZ = [number, number];
export interface Car { geometry: THREE.BufferGeometry; length: number }

/** Upright walls round an outline, and a flat top on it. The outline runs clockwise as seen from above. */
function prism(b: GeoBuilder, outline: XZ[], y0: number, y1: number, color: number, top: number = color): void {
  const cx = outline.reduce((s, p) => s + p[0], 0) / outline.length, cz = outline.reduce((s, p) => s + p[1], 0) / outline.length;
  outline.forEach((p, i) => {
    const q = outline[(i + 1) % outline.length];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    let nx = (q[1] - p[1]) / len, nz = -(q[0] - p[0]) / len;
    if (nx * ((p[0] + q[0]) / 2 - cx) + nz * ((p[1] + q[1]) / 2 - cz) < 0) { nx = -nx; nz = -nz; }
    b.quad([p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], [nx, 0, nz], color);
    b.up([cx, y1, cz], [p[0], y1, p[1]], [q[0], y1, q[1]], top);
  });
}

/** The outline of a hull: `L` and `W` are half its length and half its beam, and each end comes to a point over `bow` and `stern`. */
const hull = (L: number, W: number, bow: number, stern: number): XZ[] =>
  [[-L + stern, -W], [L - bow, -W], [L, 0], [L - bow, W], [-L + stern, W], [-L, 0]];

/** A band of glass round a body, lit from within at night, with posts between the windows. */
function glazed(b: GeoBuilder, L: number, W: number, y0: number, y1: number, body: number, posts: number): void {
  b.box(-L, y0, -W, L, y1, W, GLASS, { win: interior(1.25), faces: 'NESW' });
  for (let i = 0; i <= posts; i++) {
    const x = -L + 0.1 + (i / posts) * (2 * L - 0.2);
    b.box(x - 0.1, y0, -W - 0.02, x + 0.1, y1, W + 0.02, body, { faces: 'NESW' });
  }
}

/** A lamp at each end of a vehicle. */
function lamps(b: GeoBuilder, L: number, y: number, z: number): void {
  for (const s of [-z, z]) {
    b.box(L, y, s - 0.18, L + 0.05, y + 0.24, s + 0.18, LAMP, { win: interior(3), faces: 'E' });
    b.box(-L - 0.05, y, s - 0.18, -L, y + 0.24, s + 0.18, LAMP, { win: interior(3), faces: 'W' });
  }
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** A Hong Kong tram: narrow, two decks, a pole on the roof. Dark green with a cream band, unless it is given another colour. */
export function tramCar(body = 0x1f6b3a, band = CREAM): Car {
  const b = new GeoBuilder(), L = 3.6, W = 1.15;
  b.box(-L, 0.4, -W, L, 1.3, W, body);
  glazed(b, L, W, 1.3, 2.2, body, 6);
  b.box(-L - 0.03, 2.2, -W - 0.03, L + 0.03, 2.8, W + 0.03, band);
  glazed(b, L, W, 2.8, 3.65, body, 6);
  b.box(-L, 3.65, -W, L, 3.95, W, body, { top: 0x8d9299 });
  for (const x of [-2.3, 2.3]) b.box(x - 0.7, 0.05, -W + 0.12, x + 0.7, 0.45, W - 0.12, DARK);
  b.beam([0.6, 3.95, 0], [-2.7, 5.3, 0], 0.07, 0.05, DARK);
  lamps(b, L, 0.7, 0.7);
  return { geometry: b.build(), length: 7.3 };
}

/** A double-decker bus, at toy size: hardly longer than a car, and twice as tall. */
export function busCar(body = 0xc8322b, band = CREAM): Car {
  const b = new GeoBuilder(), L = 4.3, W = 1.6;
  b.box(-L, 0.45, -W, L, 1.45, W, body);
  glazed(b, L, W, 1.45, 2.4, body, 5);
  b.box(-L - 0.03, 2.4, -W - 0.03, L + 0.03, 2.95, W + 0.03, band);
  glazed(b, L, W, 2.95, 3.9, body, 5);
  b.box(-L, 3.9, -W, L, 4.25, W, body, { top: 0xe9e3d6 });
  // the windscreen, on both decks
  b.box(L - 0.04, 1.5, -W + 0.2, L + 0.04, 2.35, W - 0.2, 0x1c2733, { faces: 'E' });
  b.box(L - 0.04, 3.0, -W + 0.2, L + 0.04, 3.85, W - 0.2, 0x1c2733, { faces: 'E' });
  for (const x of [-2.7, 2.7]) for (const s of [-1, 1]) b.cyl(x, s * (W - 0.25), 0, 1.0, 0.5, 0.5, 8, 0x17171a);
  lamps(b, L, 0.75, 1.0);
  return { geometry: b.build(), length: 8.8 };
}

/** A Star Ferry: green below and white above, two decks, the same at both ends, so that it never turns round. */
export function ferryBoat(): Car {
  const b = new GeoBuilder(), L = 5.8, W = 1.9, GREEN = 0x2f7a55, WHITE = 0xf3f0e6;
  prism(b, hull(L, W, 1.6, 1.6), -0.5, 0.75, GREEN, 0xb9a888);
  b.box(-L + 1.2, 0.75, -W + 0.1, L - 1.2, 0.95, W - 0.1, WHITE, { faces: 'NESW' });
  glazed(b, L - 1.5, W - 0.2, 0.95, 1.75, WHITE, 7);
  b.box(-L + 1.3, 1.75, -W + 0.05, L - 1.3, 2.0, W - 0.05, WHITE);
  glazed(b, L - 2.2, W - 0.35, 2.0, 2.75, WHITE, 5);
  b.box(-L + 2.0, 2.75, -W + 0.2, L - 2.0, 2.95, W - 0.2, 0xdad6ca, { top: 0xcfc8b8 });
  // a wheelhouse at each end, and the funnel between them
  for (const x of [-L + 2.7, L - 2.7]) b.box(x - 0.6, 2.95, -0.7, x + 0.6, 3.65, 0.7, WHITE, { win: interior(0.9), top: GREEN });
  b.cyl(0, 0, 2.95, 4.5, 0.5, 0.42, 8, 0xe8dfc4, { cap: DARK });
  b.cyl(0, 0, 4.1, 4.5, 0.53, 0.47, 8, DARK, { cap: false });
  return { geometry: b.build(), length: 11.6 };
}

/** A junk: a dark hull with a high stern, and three ribbed sails of red. */
export function junkBoat(): Car {
  const b = new GeoBuilder(), L = 4.6, W = 1.45, WOOD = 0x6b4a32, SAIL = 0xb52a23;
  prism(b, hull(L, W, 2.2, 0.8), -0.4, 0.9, WOOD, 0xa98a62);
  b.box(-L + 0.3, 0.9, -W + 0.15, -L + 2.4, 1.9, W - 0.15, WOOD, { top: 0xa98a62 }); // the poop
  b.box(-0.8, 0.9, -0.8, 0.9, 1.5, 0.8, 0x8a6a48, { win: interior(0.8), top: 0xa98a62 });
  // each sail is a fan of battens: a mast, and a sheet in three panels that widens towards its foot
  for (const [x, h, w] of [[2.6, 5.2, 1.7], [0.2, 7.4, 2.5], [-2.9, 4.6, 1.5]] as [number, number, number][]) {
    b.box(x - 0.08, 0.9, -0.08, x + 0.08, h + 0.6, 0.08, 0x3a2a20);
    for (let i = 0; i < 4; i++) {
      const y0 = 1.6 + (i * (h - 1.6)) / 4, y1 = 1.6 + ((i + 1) * (h - 1.6)) / 4 - 0.08;
      const reach = w * (1 - i * 0.16);
      b.box(x - reach * 0.35, y0, -0.04, x + reach * 0.65, y1, 0.04, SAIL, { win: interior(0.25) });
    }
  }
  b.box(L - 0.5, 1.0, -0.05, L - 0.4, 1.3, 0.05, LAMP, { win: interior(3) });
  return { geometry: b.build(), length: 9.2 };
}

/** A dragon boat: long and narrow, a head at the bow and a tail at the stern, a drummer, and a crew at the paddles. */
export function dragonBoat(team: number): Car {
  const b = new GeoBuilder(), L = 4.4, W = 0.5;
  prism(b, hull(L, W, 1.0, 0.8), -0.15, 0.4, team, 0xe8c24a);
  // the head, with its horns, and the tail
  b.beam([L - 0.5, 0.4, 0], [L + 0.5, 1.2, 0], 0.22, 0.3, 0xe8c24a);
  b.box(L + 0.25, 1.1, -0.28, L + 0.85, 1.55, 0.28, 0x2f8f4f, { top: 0xe8c24a });
  b.beam([-L + 0.4, 0.4, 0], [-L - 0.4, 1.3, 0], 0.18, 0.08, 0x2f8f4f);
  // the drum and the drummer, who faces the crew
  b.cyl(L - 1.5, 0, 0.4, 0.9, 0.32, 0.32, 8, 0xb5332a, { cap: 0xe9dcc3 });
  b.box(L - 2.2, 0.4, -0.2, L - 1.85, 1.25, 0.2, 0xf2efe6, { top: 0xe8c4a0 });
  for (let i = 0; i < 7; i++) {
    const x = L - 3.0 - i * 0.82;
    for (const s of [-1, 1]) {
      b.box(x - 0.17, 0.4, s * 0.3 - 0.14, x + 0.17, 1.05, s * 0.3 + 0.14, team, { top: 0xe8c4a0 });
      b.beam([x, 0.95, s * 0.42], [x + 0.25, -0.1, s * 0.78], 0.04, 0.07, 0xd8c9a8); // a paddle
    }
  }
  return { geometry: b.build(), length: 9.6 };
}

/** The Peak Tram's car: dark green, with a pale roof. It follows its track up the incline, as the real one does. */
export function peakTramCar(): Car {
  const b = new GeoBuilder(), L = 3.3, W = 1.2, GREEN = 0x1d5a3c;
  b.box(-L, 0.35, -W, L, 1.2, W, GREEN);
  glazed(b, L, W, 1.2, 2.3, GREEN, 5);
  b.box(-L, 2.3, -W, L, 2.9, W, GREEN, { top: 0xdad6ca });
  for (const x of [-2.1, 2.1]) b.box(x - 0.6, 0.05, -W + 0.12, x + 0.6, 0.4, W - 0.12, DARK);
  lamps(b, L, 0.6, 0.7);
  return { geometry: b.build(), length: L * 2 };
}

// ---------------------------------------------------------------------------
// A racehorse, and an airliner
// ---------------------------------------------------------------------------

type V3 = [number, number, number];

/**
 * A flat plate with four corners: a wing, a fin. `down` is the way its
 * thickness goes, and `thick` how far.
 */
function plate(b: GeoBuilder, p: V3[], thick: number, color: number, down: V3 = [0, -1, 0]): void {
  const q = p.map((v): V3 => [v[0] + down[0] * thick, v[1] + down[1] * thick, v[2] + down[2] * thick]);
  const up: V3 = [-down[0], -down[1], -down[2]];
  b.quad(p[0], p[1], p[2], p[3], up, color);
  b.quad(q[0], q[1], q[2], q[3], down, color);
  const cx = (p[0][0] + p[1][0] + p[2][0] + p[3][0]) / 4, cy = (p[0][1] + p[1][1] + p[2][1] + p[3][1]) / 4, cz = (p[0][2] + p[1][2] + p[2][2] + p[3][2]) / 4;
  for (let i = 0; i < 4; i++) {
    const a = p[i], c = p[(i + 1) % 4];
    const ex = c[0] - a[0], ey = c[1] - a[1], ez = c[2] - a[2];
    // across the edge and across the thickness: the way the edge faces, turned to point away from the middle
    let nx = ey * down[2] - ez * down[1], ny = ez * down[0] - ex * down[2], nz = ex * down[1] - ey * down[0];
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    if (nx * ((a[0] + c[0]) / 2 - cx) + ny * ((a[1] + c[1]) / 2 - cy) + nz * ((a[2] + c[2]) / 2 - cz) < 0) { nx = -nx; ny = -ny; nz = -nz; }
    b.quad(a, c, q[(i + 1) % 4], q[i], [nx, ny, nz], color);
  }
}

/** A racehorse at the gallop, with a jockey up in silks of one colour. */
export function horse(silks: number, coat = 0x6b4a32): Car {
  const b = new GeoBuilder();
  b.box(-1.0, 1.0, -0.28, 0.9, 1.7, 0.28, coat);
  b.beam([0.8, 1.6, 0], [1.5, 2.25, 0], 0.22, 0.17, coat);
  b.box(1.3, 2.05, -0.16, 1.95, 2.4, 0.16, coat);
  b.beam([-1.0, 1.6, 0], [-1.55, 1.2, 0], 0.07, 0.04, 0x2a2018);
  for (const s of [-0.18, 0.18]) {
    b.beam([0.7, 1.05, s], [1.35, 0.08, s], 0.09, 0.07, coat);
    b.beam([-0.8, 1.05, s], [-1.45, 0.08, s], 0.09, 0.07, coat);
  }
  b.box(-0.2, 1.7, -0.2, 0.45, 2.25, 0.2, silks);
  b.box(0.3, 2.2, -0.16, 0.62, 2.52, 0.16, 0xf2efe6, { top: silks });
  return { geometry: b.build(), length: 3.5 };
}

/**
 * A jumbo jet, at toy size: a white body with a hump behind its nose, swept
 * wings with two engines under each, and a tail in one plain colour. It
 * carries no airline's name.
 */
export function jumbo(): Car {
  const b = new GeoBuilder(), WHITE = 0xf4f3ef, GREY = 0xc9ced2, TAIL = 0x1f7a6b, GLASS = 0x2a3442;
  b.sweep([[-14, 2.7, 0], [-10, 2.1, 0], [-4, 1.8, 0], [8, 1.8, 0], [12, 1.7, 0], [14.2, 1.4, 0]], [0.35, 1.3, 1.75, 1.75, 1.25, 0.35], WHITE);
  b.box(4.5, 3.2, -1.15, 11, 4.3, 1.15, WHITE);
  b.box(11, 3.2, -1.0, 12.2, 3.9, 1.0, WHITE);
  b.box(11.3, 3.45, -1.04, 12.3, 3.8, 1.04, GLASS, { win: interior(1.0), faces: 'NES' });
  for (const s of [-1, 1]) {
    b.box(-8, 2.25, s * 1.77 - 0.03, 10, 2.5, s * 1.77 + 0.03, GLASS, { win: interior(1.4), faces: s > 0 ? 'S' : 'N' });
    b.box(-11, 1.45, s * 1.77 - 0.03, 11.6, 1.75, s * 1.77 + 0.03, TAIL, { faces: s > 0 ? 'S' : 'N' });
    plate(b, [[3.6, 1.3, s * 1.4], [-2.6, 1.3, s * 1.4], [-7.8, 2.0, s * 13.2], [-5.7, 2.0, s * 13.2]], 0.32, GREY);
    plate(b, [[-10.4, 2.5, s * 0.8], [-13.2, 2.5, s * 0.8], [-14.6, 2.7, s * 5.2], [-13.3, 2.7, s * 5.2]], 0.2, GREY);
    for (const [ex, ez] of [[1.3, 4.7], [-2.3, 8.8]]) {
      b.box(ex - 1.1, 0.15, s * ez - 0.5, ex + 1.6, 1.15, s * ez + 0.5, WHITE, { faces: 'NESWTB' });
      b.box(ex + 1.6, 0.25, s * ez - 0.4, ex + 1.66, 1.05, s * ez + 0.4, 0x3a3f46, { faces: 'E' });
    }
    b.box(-7.2, 1.95, s * 13.2 - 0.14, -6.5, 2.2, s * 13.2 + 0.14, s > 0 ? 0x3fd96b : 0xff4a4a, { win: interior(3), faces: 'NESWTB' });
  }
  plate(b, [[-9.4, 3.2, -0.16], [-13.5, 3.2, -0.16], [-14.7, 8.4, -0.16], [-12.7, 8.4, -0.16]], 0.32, TAIL, [0, 0, 1]);
  b.box(13.95, 0.95, -0.3, 14.3, 1.35, 0.3, 0xfff4d6, { win: interior(3), faces: 'NESWTB' });
  b.box(-1, 0.05, -0.2, -0.6, 0.3, 0.2, 0xff4a4a, { win: interior(3), faces: 'NESWTB' });
  return { geometry: b.build(), length: 28 };
}

// ---------------------------------------------------------------------------
// Boats that stay where they are
// ---------------------------------------------------------------------------

/** A sampan under its awning, moored. */
export function sampan(b: GeoBuilder, x: number, z: number, yaw: number, awning = 0x4f8f6a): void {
  b.moved(x, -0.9, z, yaw, () => {
    prism(b, hull(2.3, 0.8, 0.9, 0.5), -0.3, 0.5, 0x7a5a3c, 0xc9b48a);
    b.box(-1.3, 0.5, -0.7, 0.7, 1.5, 0.7, awning, { faces: 'NST', top: awning });
    b.box(-1.3, 0.5, -0.7, -1.2, 1.5, 0.7, awning);
  });
}

/** A public light bus: cream, with a roof of red or of green, and sixteen seats. This one is waiting for the last of them to fill. */
export function minibus(b: GeoBuilder, x: number, z: number, yaw: number, roof = 0xc8322b): void {
  b.moved(x, 0, z, yaw, () => {
    b.box(-2.7, 0.4, -1.05, 2.7, 1.5, 1.05, 0xf2e6c4);
    b.box(-2.7, 1.5, -1.05, 2.7, 2.35, 1.05, 0x1c2733, { win: interior(0.8), faces: 'NESW' });
    for (let i = 0; i <= 4; i++) b.box(-2.7 + i * 1.33 - 0.09, 1.5, -1.07, -2.7 + i * 1.33 + 0.09, 2.35, 1.07, 0xf2e6c4, { faces: 'NS' });
    b.box(-2.72, 2.35, -1.07, 2.72, 2.75, 1.07, roof);
    for (const wx of [-1.7, 1.7]) for (const s of [-1, 1]) b.box(wx - 0.45, 0, s * 0.85 - 0.22, wx + 0.45, 0.85, s * 0.85 + 0.22, 0x17171a);
  });
}

/** A lighter with a derrick, loaded with containers: how goods are still worked in mid-stream. */
export function lighter(b: GeoBuilder, x: number, z: number, yaw: number): void {
  b.moved(x, -0.9, z, yaw, () => {
    prism(b, hull(7, 2.6, 1.2, 0.6), -0.4, 0.9, 0x4a5560, 0x6d737a);
    const BOXES = [0xc8523f, 0x3f6fa3, 0xd1b25a, 0x4f7a6b, 0xe9836b, 0x8b5e83];
    let n = 0;
    for (const [bx, by] of [[-4.6, 0], [-2.2, 0], [0.2, 0], [-3.4, 1.3], [-1.0, 1.3]]) {
      for (const bz of [-1.25, 1.25]) b.box(bx - 1.1, 0.9 + by, bz - 1.1, bx + 1.1, 2.2 + by, bz + 1.1, BOXES[n++ % BOXES.length]);
    }
    // the derrick: an A-frame, a boom, and a hook
    b.box(3.2, 0.9, -1.4, 5.0, 2.6, 1.4, 0xd8d2c4, { win: interior(0.6), top: 0x8d8a83 });
    b.beam([4.1, 2.6, 0], [4.1, 8.4, 0], 0.22, 0.16, 0xd9a13a);
    b.beam([4.1, 3.0, 0], [-3.2, 9.6, 0], 0.2, 0.12, 0xd9a13a);
    b.beam([4.1, 8.4, 0], [-3.2, 9.6, 0], 0.05, 0.05, DARK);
    b.beam([-3.2, 9.6, 0], [-3.2, 5.2, 0], 0.04, 0.04, DARK);
    b.box(-3.5, 4.6, -0.3, -2.9, 5.2, 0.3, 0xd9a13a);
  });
}
