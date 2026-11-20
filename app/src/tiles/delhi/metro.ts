// The Metro: the Pink Line's viaduct along the Ring Road's verge and over the Yamuna, its two stations and its trains.
//
// So far only the viaduct stands: a trough of concrete on single piers. The
// tracks, the stations and the trains are still to be built here.

import { sample } from '../../engine/lines';
import { CONCRETE } from '../../engine/roads';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { AUROBINDO_X, EAST_BANK, RING, SHANTI_X, WEST_BANK, type Thing } from './plan';
import { METRO_LINE } from './roads';

export type Model = (k: Build, t: Thing) => void;

/** What this file builds, by the id of the thing in the plan. */
export const MODELS: Record<string, Model> = {};

/** The signs this file hangs. */
export const SIGNS: SignDef[] = [];

/** Lines that something moves along, as [x, y, z] points, for the check that nothing crosses a road on the level. */
export const RAILS: Record<string, [number, number, number][]> = { metro: sample(METRO_LINE, 1) };

/** Whatever this file builds that is not one of the plan's things. */
export function extras(k: Build): void {
  const b = k.b;
  // the viaduct: a trough of concrete on single piers
  {
    const pts = sample(METRO_LINE, 2);
    const onRoad = (x: number, z: number): boolean =>
      // the two streets under the flyovers, and the Ring Road's corner, where its lanes swing north under the viaduct
      (z < RING.z + 12 && (Math.abs(x - SHANTI_X) < 8.5 || Math.abs(x - AUROBINDO_X) < 8.5)) || (x > 46 && x < 68) || (x > WEST_BANK + 1 && x < EAST_BANK - 1 && Math.abs(x - 79) > 2);
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, y, z0] = pts[i], [x1, , z1] = pts[i + 1];
      const yaw = Math.atan2(z1 - z0, x1 - x0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, half = Math.hypot(x1 - x0, z1 - z0) / 2 + 0.03;
      b.obox(cx, y - 0.55, cz, half, 0.45, 3.3, yaw, CONCRETE, { faces: 'B' });
      for (const side of [-1, 1]) b.obox(cx - Math.sin(yaw) * 3.1 * side, y + 0.35, cz + Math.cos(yaw) * 3.1 * side, half, 0.45, 0.2, yaw, CONCRETE);
      if (i % 6 === 3 && !onRoad(cx, cz)) {
        const foot = cx > WEST_BANK && cx < EAST_BANK ? -2.4 : 0;
        b.cyl(cx, cz, foot, y - 1.8, 0.75, 0.75, 8, CONCRETE, { cap: false });
        b.obox(cx, y - 1.4, cz, 0.9, 0.4, 2.2, yaw, CONCRETE, { faces: 'B' });
      }
    }
  }
}
