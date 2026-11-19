// What stands on the Japan tile: its towers, temples and shrines, its castle,
// and the smaller things to find. Each is a few dozen boxes, cylinders and
// bars: enough for the silhouette. Their places come from plan.ts.

import type { Build } from '../../engine/tile';
import { FERRIS, RAIL, SHORE, TORII } from './plan';
import { groundHeight } from './terrain';

export function buildLandmarks(k: Build): void {
  const b = k.b;

  // Kyoto Station's roof spans the tracks, and Tokyo Station's platforms stand on the viaduct
  b.box(-70, 18, -40, -46, 19.4, -21.2, 0xcfd6dc);
  b.box(19, RAIL.y + 4.2, RAIL.z - RAIL.half - 0.4, 53, RAIL.y + 4.7, RAIL.z + RAIL.half + 0.4, 0xe9e3d6);
  // Tokyo Tower: its shape alone, for how it stands against the rest
  b.cyl(36, -80, 0, 112, 15 * Math.SQRT2, 1, 4, 0xe2532f, { phase: Math.PI / 4, cap: false });
  // Kyoto Tower, on its block
  b.cyl(-50.5, -3, 16, 58, 2.3, 1.5, 10, 0xf1eee6, { cap: false });
  b.cyl(-50.5, -3, 43, 48, 4.2, 4.2, 12, 0xe2532f);
  // the castle's stone base, in its moat
  b.cyl(-88, 9, -1.5, 7, 9.6 * Math.SQRT2, 7.6 * Math.SQRT2, 4, 0x9a968c, { phase: Math.PI / 4 });
  // the great torii, standing in the water
  {
    const x = TORII.x, z = TORII.z, RED = 0xd8432b;
    for (const s of [-1, 1]) b.cyl(x + s * 6.6, z, -1.5, 13, 0.75, 0.6, 8, RED);
    b.box(x - 9.6, 12.6, z - 0.6, x + 9.6, 13.9, z + 0.6, RED, { faces: 'NESWTB' });
    b.box(x - 8, 9.6, z - 0.4, x + 8, 10.6, z + 0.4, RED, { faces: 'NESWTB' });
  }
  // the red bridge over the river
  b.box(SHORE.river.west - 1, 0.6, 28.4, SHORE.river.east + 1, 1.3, 31.6, 0xd8432b, { faces: 'NESWTB' });
  // Fushimi Inari: a line of gates up the side of the hill
  for (let i = 0; i < 13; i++) {
    const x = -75 - i * 1.7, z = -6 - i * 1.25, y = groundHeight(x, z), RED = 0xe0562d;
    for (const s of [-1, 1]) b.box(x - 0.2, y - 0.5, z + s * 1.5 - 0.2, x + 0.2, y + 3.4, z + s * 1.5 + 0.2, RED);
    b.box(x - 0.25, y + 3.4, z - 2.1, x + 0.25, y + 3.9, z + 2.1, RED, { faces: 'NESWTB' });
  }
  // the Ferris wheel: a rim, spokes and two legs
  {
    const f = FERRIS, n = 20, STEEL = 0xf2f0ea;
    const at = (i: number, r = f.r): [number, number, number] => [f.x + Math.cos((i / n) * Math.PI * 2) * r, f.y + Math.sin((i / n) * Math.PI * 2) * r, f.z];
    for (let i = 0; i < n; i++) {
      b.beam(at(i), at(i + 1), 0.3, 0.3, STEEL);
      if (i % 2 === 0) b.beam([f.x, f.y, f.z], at(i), 0.14, 0.14, STEEL);
      const [x, y, z] = at(i);
      b.box(x - 0.8, y - 1.5, z - 0.8, x + 0.8, y - 0.2, z + 0.8, [0xe8523f, 0xf2c14e, 0x4fa3d8, 0x6fbf73][i % 4]);
    }
    for (const s of [-1, 1]) for (const dz of [-1.6, 1.6]) b.beam([f.x + s * 7, 0, f.z + dz], [f.x, f.y, f.z + dz * 0.6], 0.45, 0.35, STEEL);
    b.cyl(f.x, f.z, f.y - 1, f.y + 1, 1.2, 1.2, 8, 0xd9dde4);
    k.lights.push({ x: f.x, z: f.z + 4, r: 18, color: '#ffd9f0', k: 0.5 });
  }
}
