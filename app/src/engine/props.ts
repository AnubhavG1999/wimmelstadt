// Small things that stand all over a tile: vending machines, paper lanterns,
// lamp masts, a sign hung out over a street, and the few vehicles that are part
// of a scene and never drive. Japan's builder wrote most of them, and Hong
// Kong's the sign.

import { interior } from './geo';
import type { Build } from './tile';

const DARK = 0x2a2c31, GLASSY = 0x1c2733;

/** A point `along` the way something faces and `across` to its right, turned by `yaw` about (x, z). */
const turned = (x: number, z: number, yaw: number) => (along: number, across: number): [number, number] =>
  [x + Math.cos(yaw) * along - Math.sin(yaw) * across, z + Math.sin(yaw) * along + Math.cos(yaw) * across];

/**
 * A row of vending machines, side by side: white, red and blue, each with a
 * lit front. `yaw` is the way their fronts face, in radians: 0 is east, a
 * quarter turn is south.
 */
/**
 * A sign hung out over a street from a wall, on a frame of steel, to be read
 * from both ways along the street. `wall` is the z of the wall it hangs from,
 * and `out` which way the street lies: 1 to the south of the wall, -1 to the
 * north. `y` is the height of its middle and `h` how high it is. The sign is
 * one from the tile's own sheet, by its id, and nothing is hung if there is no
 * such sign.
 */
export function hungSign(k: Build, id: string, x: number, wall: number, out: number, y: number, h: number): void {
  const rect = k.signs.atlas.rects.get(id);
  if (!rect) return;
  const b = k.b, w = h * rect.aspect, z0 = wall + out * 0.5, z1 = z0 + out * w, zc = (z0 + z1) / 2;
  b.box(x - 0.09, y - h / 2 - 0.08, Math.min(z0, z1) - 0.08, x + 0.09, y + h / 2 + 0.08, Math.max(z0, z1) + 0.08, 0x14141c, { faces: 'NESWTB' });
  k.sign(id, x + 0.11, y, zc, 1, 0, h);
  k.sign(id, x - 0.11, y, zc, -1, 0, h);
  b.beam([x, y + h / 2 + 0.14, wall], [x, y + h / 2 + 0.14, z1], 0.06, 0.06, 0x59636d);
  b.beam([x, y + h / 2 + 1.7, wall], [x, y + h / 2 + 0.14, z1 - out * 0.3], 0.04, 0.04, 0x59636d);
  k.lights.push({ x, z: zc + out * 1.5, r: 8, color: rect.color, k: 0.45 });
}

export function vending(k: Build, x: number, z: number, yaw: number, count: number, y = 0): void {
  const at = turned(x, z, yaw), BODY = [0xf2f0ea, 0xd8432b, 0x3f6fb5, 0xf2f0ea, 0x4fa36b];
  for (let i = 0; i < count; i++) {
    const [cx, cz] = at(0, (i - (count - 1) / 2) * 1.22);
    k.b.obox(cx, y + 1.05, cz, 0.42, 1.05, 0.55, yaw, BODY[i % BODY.length]);
    // the lit front: a pane a hair proud of the body
    const [fx, fz] = at(0.44, (i - (count - 1) / 2) * 1.22);
    k.b.obox(fx, y + 1.3, fz, 0.02, 0.62, 0.46, yaw, 0xf6fbff, { win: interior(2.2) });
  }
  const [lx, lz] = at(2.2, 0);
  k.lights.push({ x: lx, z: lz, r: 5 + count, color: '#e6f4ff', k: 0.45 });
}

/** A red paper lantern, hanging with its middle at (x, y, z). It glows at night. */
export function lantern(k: Build, x: number, y: number, z: number, size = 1, color = 0xd8432b): void {
  k.b.cyl(x, z, y - 0.5 * size, y + 0.5 * size, 0.36 * size, 0.36 * size, 6, color, { win: interior(1.5), cap: 0x2a1a14 });
  k.b.cyl(x, z, y - 0.62 * size, y - 0.5 * size, 0.22 * size, 0.22 * size, 6, 0x2a1a14);
}

/** A tall mast with lamps at its head, as over a car park. */
export function mast(k: Build, x: number, z: number, h: number, color = '#ffe2ae', reach = 20): void {
  k.b.box(x - 0.2, 0, z - 0.2, x + 0.2, h, z + 0.2, 0x5d6168);
  k.b.box(x - 1.3, h, z - 0.3, x + 1.3, h + 0.35, z + 0.3, 0x5d6168, { faces: 'NESWTB' });
  for (const dx of [-0.95, 0.95]) k.glows.push({ x: x + dx, y: h - 0.12, z, sx: 0.6, sy: 0.2, sz: 0.5, color });
  k.lights.push({ x, z, r: reach, color, k: 0.55 });
}

export interface CarOpts {
  /** The colour of its body, and of its roof and pillars if they differ. */
  body: number;
  top?: number;
  /** A bar of lamps on its roof: a patrol car's, in this colour. */
  beacon?: string;
  /** A lit sign on its roof: a taxi's. */
  roofSign?: number;
  y?: number;
}

/** A plain car that stands still: for a scene, where the car's colours are the point. `yaw` is the way it faces. */
export function standingCar(k: Build, x: number, z: number, yaw: number, o: CarOpts): void {
  const y = o.y ?? 0, b = k.b, at = turned(x, z, yaw);
  b.obox(x, y + 0.98, z, 3.45, 0.47, 1.52, yaw, o.body, { faces: 'B' });
  const [cx, cz] = at(-0.5, 0);
  b.obox(cx, y + 1.82, cz, 1.75, 0.38, 1.3, yaw, GLASSY);
  b.obox(cx, y + 2.26, cz, 1.72, 0.07, 1.34, yaw, o.top ?? o.body);
  for (const [a, c] of [[2.1, 1.25], [2.1, -1.25], [-2.1, 1.25], [-2.1, -1.25]]) {
    const [wx, wz] = at(a, c);
    b.obox(wx, y + 0.5, wz, 0.9, 0.5, 0.36, yaw, 0x17171a);
  }
  // lamps at its nose and tail
  for (const c of [-0.95, 0.95]) {
    const [hx, hz] = at(3.46, c), [tx, tz] = at(-3.46, c);
    b.obox(hx, y + 1.05, hz, 0.03, 0.17, 0.36, yaw, 0xfff4d6, { win: interior(2.4) });
    b.obox(tx, y + 1.12, tz, 0.03, 0.15, 0.38, yaw, 0xc81e1e, { win: interior(1.8) });
  }
  if (o.beacon) {
    b.obox(cx, y + 2.48, cz, 0.3, 0.14, 0.95, yaw, 0xd8dde4);
    for (const c of [-0.6, 0.6]) {
      const [gx, gz] = at(-0.5, c);
      k.glows.push({ x: gx, y: y + 2.5, z: gz, sx: 0.5, sy: 0.3, sz: 0.5, color: o.beacon });
    }
  }
  if (o.roofSign !== undefined) b.obox(cx, y + 2.5, cz, 0.3, 0.17, 0.5, yaw, o.roofSign, { win: interior(2) });
}

/**
 * A dekotora: a lorry dressed in chrome and rows of lamps, as its driver's
 * pride. It stands still, with its lamps lit.
 */
export function dekotora(k: Build, x: number, z: number, yaw: number): void {
  const b = k.b, at = turned(x, z, yaw);
  const CHROME = 0xd4d9de, PANEL = 0x27407a, GILT = 0xe2b64c;
  const [bx, bz] = at(-1.4, 0), [cx, cz] = at(3.55, 0);
  // the box behind, painted, with a gilt rail round its top
  b.obox(bx, 2.55, bz, 3.4, 1.75, 1.6, yaw, PANEL, { faces: 'B' });
  b.obox(bx, 4.38, bz, 3.45, 0.1, 1.65, yaw, GILT);
  // the cab, with a visor that reaches out over the windscreen
  b.obox(cx, 2.05, cz, 1.2, 1.3, 1.55, yaw, CHROME, { faces: 'B' });
  const [gx, gz] = at(4.3, 0);
  b.obox(gx, 2.7, gz, 0.5, 0.45, 1.35, yaw, GLASSY);
  const [vx, vz] = at(4.75, 0);
  b.obox(vx, 3.5, vz, 0.75, 0.12, 1.7, yaw, CHROME, { faces: 'B' });
  // bumper, tanks along the sides, wheels
  const [fx, fz] = at(5.05, 0);
  b.obox(fx, 0.85, fz, 0.35, 0.4, 1.75, yaw, CHROME, { faces: 'B' });
  for (const c of [-1.55, 1.55]) {
    const [sx, sz] = at(-0.6, c);
    b.obox(sx, 0.9, sz, 2.2, 0.26, 0.2, yaw, CHROME);
    for (const a of [3.4, -2.2, -3.6]) {
      const [wx, wz] = at(a, c * 0.86);
      b.obox(wx, 0.55, wz, 0.55, 0.55, 0.3, yaw, 0x17171a);
    }
  }
  // its lamps: rows along the visor, the bumper, the rail and the sides
  const lamp = (along: number, across: number, y: number, color: string, s = 0.26): void => {
    const [lx, lz] = at(along, across);
    k.glows.push({ x: lx, y, z: lz, sx: s, sy: s, sz: s, color });
  };
  for (let i = -3; i <= 3; i++) {
    lamp(5.5, i * 0.5, 3.52, i % 2 ? '#ffd23f' : '#ff5a4f');
    lamp(5.42, i * 0.52, 0.86, '#7dff9b');
  }
  for (let i = 0; i < 8; i++) {
    for (const c of [-1.68, 1.68]) {
      lamp(-4.5 + i * 0.86, c, 4.4, i % 2 ? '#35e0ff' : '#ff3d9a', 0.22);
      lamp(-4.5 + i * 0.86, c * 1.02, 0.92, '#ffb02e', 0.2);
    }
  }
  const [px, pz] = at(2, 0);
  k.lights.push({ x: px, z: pz, r: 11, color: '#ff9ccb', k: 0.5 });
  void DARK;
}
