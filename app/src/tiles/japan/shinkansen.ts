// The Shinkansen: its viaduct across the tile, in front of the mountain, and
// the two trains that run on it. The line ends at Tokyo Station, where a train
// changes ends, and at its other end it runs into a tunnel under Kyoto's hill
// and changes ends out of sight.
//
// A train is one piece, with a nose at each end. The engine's trains are made
// of cars that are all alike, which a bullet train's are not, and on a line
// with no bends one piece will do.

import * as THREE from 'three';
import { GeoBuilder, interior, type V3 } from '../../engine/geo';
import { joined } from '../../engine/paths';
import { train } from '../../engine/rail';
import { CONCRETE } from '../../engine/roads';
import type { Build } from '../../engine/tile';
import { KYOTO_HILL, RAIL } from './plan';

const WHITE = 0xf4f6f8, BLUE = 0x1f4fa8, GLASS = 0xcfe0ea, DARK = 0x2a2c31, ROOF = 0xc9ced4;

/** A flat face of four corners that looks away from the middle of the train. */
function face(b: GeoBuilder, p0: V3, p1: V3, p2: V3, p3: V3, color: number, win?: ReturnType<typeof interior>): void {
  const ex = p1[0] - p0[0], ey = p1[1] - p0[1], ez = p1[2] - p0[2];
  const fx = p3[0] - p0[0], fy = p3[1] - p0[1], fz = p3[2] - p0[2];
  let nx = ey * fz - ez * fy, ny = ez * fx - ex * fz, nz = ex * fy - ey * fx;
  const l = Math.hypot(nx, ny, nz) || 1;
  nx /= l; ny /= l; nz /= l;
  // away from the line along the middle of the body, at about half its height
  const cy = (p0[1] + p1[1] + p2[1] + p3[1]) / 4 - 1.8, cz = (p0[2] + p1[2] + p2[2] + p3[2]) / 4;
  if (ny * cy + nz * cz < 0 && Math.abs(nx) < 0.9) { nx = -nx; ny = -ny; nz = -nz; }
  b.quad(p0, p1, p2, p3, [nx, ny, nz], color, { win });
}

/** The whole train: three cars, the outer two with long noses. It stands on y = 0, along x, with its middle at the origin. */
function trainGeometry(length: number): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const L = length / 2, W = 1.42, body = 7.2; // half its length, half its width, and where the noses begin
  const floor = 0.5, shoulder = 3.0, top = 3.5, roofW = 1.08;
  // --- the body between the noses ---
  b.box(-body, floor, -W, body, shoulder, W, WHITE, { faces: 'NS' });
  for (const s of [-1, 1]) face(b, [-body, shoulder, s * W], [body, shoulder, s * W], [body, top, s * roofW], [-body, top, s * roofW], WHITE);
  b.box(-body, top - 0.02, -roofW, body, top, roofW, ROOF, { faces: 'T' });
  b.box(-body, 0.14, -W + 0.18, body, floor, W - 0.18, DARK, { faces: 'NSB' });
  // a band of windows that is lit at night, with posts between them, and the blue line below it
  b.box(-body + 0.6, 1.98, -W - 0.02, body - 0.6, 2.62, W + 0.02, GLASS, { win: interior(1.3), faces: 'NS' });
  for (let x = -body + 0.6; x <= body - 0.59; x += 1.02) b.box(x - 0.13, 1.98, -W - 0.035, x + 0.13, 2.62, W + 0.035, WHITE, { faces: 'NS' });
  b.box(-body, 1.44, -W - 0.02, body, 1.72, W + 0.02, BLUE, { faces: 'NS' });
  b.box(-body, 1.22, -W - 0.02, body, 1.3, W + 0.02, BLUE, { faces: 'NS' });
  // where one car meets the next, and the doors beside it
  for (const x of [-4.35, 4.35]) {
    b.box(x - 0.1, floor, -W - 0.03, x + 0.1, top + 0.03, W + 0.03, DARK, { faces: 'NST' });
    for (const d of [-0.95, 0.95]) b.box(x + d - 0.38, 0.62, -W - 0.03, x + d + 0.38, 2.7, W + 0.03, 0xdfe4e8, { faces: 'NS' });
  }
  // the wheels' frames
  for (const x of [-11.2, -6, -2.6, 2.6, 6, 11.2].filter((v) => Math.abs(v) < L - 1.2)) b.box(x - 0.95, 0.1, -W + 0.12, x + 0.95, 0.52, W - 0.12, DARK);
  // on the roof of the middle car: the arm that reaches up to the wire
  b.box(-1.5, top, -0.5, 1.5, top + 0.22, 0.5, ROOF);
  b.beam([-1.1, top + 0.22, 0], [0.5, top + 0.95, 0], 0.07, 0.07, DARK);
  b.beam([0.5, top + 0.95, 0], [-0.4, top + 1.5, 0], 0.07, 0.07, DARK);
  b.box(-0.5, top + 1.47, -0.85, -0.3, top + 1.56, 0.85, DARK, { faces: 'NESWTB' });
  // --- a nose at each end: it narrows and sinks from the body to the tip ---
  // each row: how far along, half the width, the shoulder, half the roof's width, the roof
  const rows: [number, number, number, number, number][] = [
    [body, W, shoulder, roofW, top], [9.3, 1.38, 2.72, 0.94, 3.12], [11.0, 1.2, 2.05, 0.72, 2.3], [12.4, 0.82, 1.38, 0.42, 1.52], [L, 0.42, 0.98, 0.2, 1.06],
  ];
  for (const way of [-1, 1]) {
    for (let i = 0; i + 1 < rows.length; i++) {
      const [x0, w0, s0, r0, t0] = rows[i], [x1, w1, s1, r1, t1] = rows[i + 1];
      const a = way * x0, c = way * x1;
      for (const s of [-1, 1]) {
        face(b, [a, floor, s * w0], [c, floor, s * w1], [c, s1, s * w1], [a, s0, s * w0], WHITE);
        face(b, [a, s0, s * w0], [c, s1, s * w1], [c, t1, s * r1], [a, t0, s * r0], WHITE);
        // the blue line runs on along the nose as far as there is room for it
        if (s1 > 1.8) face(b, [a, 1.44, s * (w0 + 0.02)], [c, 1.44, s * (w1 + 0.02)], [c, 1.72, s * (w1 + 0.02)], [a, 1.72, s * (w0 + 0.02)], BLUE);
      }
      // the roof of the nose; its second piece is the driver's window
      const dark = i === 1;
      b.quad([a, t0, -r0], [a, t0, r0], [c, t1, r1], [c, t1, -r1], [way * (t0 - t1), x1 - x0, 0], dark ? 0x1c2733 : WHITE);
      b.quad([a, floor, -w0], [a, floor, w0], [c, floor, w1], [c, floor, -w1], [0, -1, 0], DARK);
    }
    // the tip, with a lamp on either side of it
    const [, w, s, r, t] = rows[rows.length - 1], x = way * L;
    b.quad([x, floor, -w], [x, floor, w], [x, s, w], [x, s, -w], [way, 0, 0], WHITE);
    b.quad([x, s, -w], [x, s, w], [x, t, r], [x, t, -r], [way, 0.4, 0], WHITE);
    for (const z of [-0.5, 0.5]) {
      const lx = way * 12.42;
      b.box(Math.min(lx, lx + way * 0.1), 1.0, z - 0.16, Math.max(lx, lx + way * 0.1), 1.24, z + 0.16, 0xfff4d6, { win: interior(3), faces: way > 0 ? 'E' : 'W' });
    }
  }
  return b.build();
}

export function buildShinkansen(k: Build): void {
  const b = k.b, r = RAIL, slab = r.y - 0.14, east = r.east + 2;
  const STEEL = 0x5f8f8a;

  // --- the viaduct: a slab with a low wall along each edge ---
  b.box(r.west, slab - 1.4, r.z - r.half, east, slab, r.z + r.half, CONCRETE, { faces: 'NESTB' });
  for (const side of [-1, 1]) {
    const z = r.z + side * (r.half - 0.25);
    b.box(r.west, slab, z - 0.25, east, slab + 1.3, z + 0.25, 0xd9d5cb);
    // two rails for each track
    for (const g of [-0.78, 0.78]) {
      const rz = r.z + side * r.off + g;
      b.box(r.west - 1, slab, rz - 0.09, r.east, slab + 0.24, rz + 0.09, 0x9aa0a8, { faces: 'NST' });
    }
    // where the line ends: a buffer for each track, with a red lamp on it
    const bz = r.z + side * r.off;
    b.box(r.east, slab, bz - 1.2, r.east + 0.7, slab + 1.9, bz + 1.2, DARK);
    b.box(r.east - 0.12, slab + 0.9, bz - 0.9, r.east, slab + 1.5, bz + 0.9, 0xd8432b, { faces: 'W' });
    k.glows.push({ x: r.east + 0.35, y: slab + 2.15, z: bz, sx: 0.3, sy: 0.3, sz: 0.3, color: '#ff4a3a' });
  }
  b.box(east - 0.5, slab, r.z - r.half, east, slab + 1.3, r.z + r.half, 0xd9d5cb);
  // Columns keep out of the roads below. Where the pass and the river road run
  // under it there is no room for one, and a steel girder carries the line across.
  const spanFrom = -44, spanTo = -9;
  for (const x of [-66, -55, spanFrom, spanTo, 3, 25, 36, 47, east - 2]) {
    b.box(x - 0.9, 0, r.z - 1.6, x + 0.9, slab - 2.3, r.z + 1.6, CONCRETE);
    b.box(x - 1.1, slab - 2.3, r.z - r.half + 0.6, x + 1.1, slab - 1.4, r.z + r.half - 0.6, CONCRETE, { faces: 'NESWB' });
  }
  for (const side of [-1, 1]) {
    const z = r.z + side * (r.half + 0.02);
    b.box(spanFrom - 1, slab - 2.9, Math.min(z, z + side * 0.5), spanTo + 1, slab + 0.5, Math.max(z, z + side * 0.5), STEEL);
    for (let x = spanFrom + 2; x < spanTo; x += 3.6) {
      b.box(x - 0.14, slab - 2.9, z + side * 0.5, x + 0.14, slab + 0.5, z + side * 0.62, 0x4a7772, { faces: side < 0 ? 'NEW' : 'SEW' });
    }
  }
  // the posts and the wire the trains draw their power from
  for (let x = r.west + 5; x < r.east; x += 13.5) {
    for (const side of [-1, 1]) b.box(x - 0.14, slab, r.z + side * (r.half - 0.6) - 0.14, x + 0.14, slab + 6.6, r.z + side * (r.half - 0.6) + 0.14, 0x6b7076);
    b.box(x - 0.1, slab + 6.2, r.z - r.half + 0.6, x + 0.1, slab + 6.4, r.z + r.half - 0.6, 0x6b7076, { faces: 'NESWTB' });
  }
  for (const side of [-1, 1]) b.box(r.west, slab + 5.62, r.z + side * r.off - 0.04, r.east, slab + 5.7, r.z + side * r.off + 0.04, 0x4b4f57, { faces: 'NSTB' });

  // --- the mouth of the tunnel under Kyoto's hill: a wall against the hill, with a dark opening ---
  b.box(r.west - 2.4, 0, r.z - r.half - 4, r.west, KYOTO_HILL.y + 0.6, r.z + r.half + 4, 0xb9b4a8);
  b.box(r.west, slab, r.z - r.half + 0.5, r.west + 0.06, slab + 6.3, r.z + r.half - 0.5, 0x15161a, { faces: 'E' });
  b.box(r.west, slab + 6.3, r.z - r.half, r.west + 0.3, slab + 7, r.z + r.half, 0x9a968c);

  // --- the trains: one to each track, each running to both ends of its line and back ---
  const car = { geometry: trainGeometry(r.train), length: r.train };
  const stand = r.train / 2 + 0.8;
  [-1, 1].forEach((side, n) => {
    const z = r.z + side * r.off;
    const count = Math.ceil((r.east - r.hidden) / 0.5);
    const out = Array.from({ length: count + 1 }, (_, i) => new THREE.Vector3(r.hidden + ((r.east - r.hidden) * i) / count, r.y, z));
    const run = joined([out, [...out].reverse()], true);
    const far = run.starts[1], along = (x: number): number => x - r.hidden;
    train(k, run.path, {
      cars: 1, car, speed: 40, dwell: 6, turnDwell: 9,
      ends: [far, 0],
      // eastbound at Kyoto, the end of the line at Tokyo, westbound at Kyoto, and the end of the line inside the hill
      stops: [along(r.kyoto), far - stand, 2 * far - along(r.kyoto), 2 * far - stand],
      // the two set out from opposite ends
      from: n === 0 ? stand + 0.5 : far + stand + 0.5,
    });
  });
}
