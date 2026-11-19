// A tunnel's mouth: where a road dives under the ground or the water and goes
// out of sight. It was built for Hong Kong's harbour tunnel.
//
// The mouth is built at (0, 0) with the road running in towards +x and down,
// and its roof beginning at x = 0. Stand it where it belongs with `placed`. Two
// things have to be true of the tile round it: the ground has a hole for the
// cutting, as it has for water, and the road is about 4 units down before the
// hole ends, or the ground shows through the road.

import { CONCRETE } from './roads';
import type { Build } from './tile';

export interface MouthOpts {
  /** How far the open cutting runs back from where the roof begins. */
  open: number;
  /** How far the hood runs in from there. */
  hood: number;
  /** Half the width of the road between its kerbs. Two lanes and their kerbs are 5.1. */
  half?: number;
  /** A sign over the mouth, by its id, if the tile has one for it. */
  sign?: string;
  /** The colour of the darkness a little way in. */
  dark?: number;
}

/**
 * An open cutting with a low wall round it, a hood with a wall between the
 * two tubes, and darkness a little way in, which is where a vehicle goes out
 * of sight.
 */
export function tunnelMouth(k: Build, o: MouthOpts): void {
  const b = k.b, W = o.half ?? 5.1, open = o.open, hood = o.hood;
  for (const s of [-1, 1]) {
    const z0 = s < 0 ? -W - 0.5 : W, z1 = s < 0 ? -W : W + 0.5;
    b.box(-open, -8, z0, hood, 0, z1, CONCRETE, { faces: s < 0 ? 'S' : 'N' });
    b.box(-open - 0.3, 0, s < 0 ? -W - 0.6 : W, hood + 0.3, 0.9, s < 0 ? -W : W + 0.6, CONCRETE);
    b.box(0, 0.9, s < 0 ? -W - 1.2 : W, hood + 0.5, 4.3, s < 0 ? -W : W + 1.2, CONCRETE);
  }
  b.box(0, 4.3, -W - 1.2, hood + 0.5, 5.7, W + 1.2, CONCRETE, { faces: 'NESWTB' });
  b.box(0, -6, -0.4, hood + 0.5, 4.3, 0.4, CONCRETE);
  b.box(hood - 0.1, 0, -W, hood + 0.5, 4.3, W, CONCRETE);
  b.box(3.4, -5, -W, 3.5, 4.3, W, o.dark ?? 0x0c0c10, { faces: 'W' });
  if (o.sign) k.sign(o.sign, -0.14, 5.0, 0, -1, 0, 1.2, 9.6);
  k.lights.push({ x: -2, z: 0, r: 9, color: '#ffe2ae', k: 0.5 });
}
