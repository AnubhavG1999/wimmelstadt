// The L: Chicago's elevated railway, as a loop round the block of Marina City.
// It runs above the street beside Wrigley Field, up the street on the east
// side and along the edge of the boulevard, and comes back under the
// expressway, where street, train and expressway stack three deep.

import { buildPath } from '../../engine/paths';
import { station, track, train, trestle } from '../../engine/rail';
import type { Build } from '../../engine/tile';
import { H_STREETS, L_LINE, V_STREETS } from './plan';

/** `piers` is where the expressway's piers stand, so that the L's columns keep clear of them. */
export function buildL(k: Build, piers: { x: number; z: number }[]): void {
  const path = buildPath([L_LINE.ring], true);

  trestle(k, path, {
    every: 8,
    bent: (x, z) => {
      const v = V_STREETS.find((s) => Math.abs(x - s.x) < s.carr), h = H_STREETS.find((s) => Math.abs(z - s.z) < s.carr);
      // never in the middle of a junction
      if (v && h) return null;
      // Under the expressway the track runs above one lane, so its columns stand to
      // one side of it, on the line between the lanes, where the expressway's piers are.
      if (Math.abs(x - L_LINE.west) < 0.8) {
        return piers.some((p) => Math.hypot(p.x - (x - 2.25), p.z - z) < 2.4) ? null : { arm: -2.25 };
      }
      // above a street its columns stand on the line between the lanes, and nowhere else
      if (v) return Math.abs(x - v.x) < 0.6 ? 'T' : null;
      if (h) return Math.abs(z - h.z) < 0.6 ? 'T' : null;
      // and above a sidewalk they stand where they like
      return 'T';
    },
  });
  track(k, path);

  // Addison is the station at the ballpark, as in life. The other is the one nearest Marina City.
  const addison = station(k, path, path.closest(64, L_LINE.south), { length: 17, side: -1, name: 'addison' });
  const stateLake = station(k, path, path.closest(L_LINE.east, 16), { length: 17, side: 1, name: 'state-lake' });

  // two short trains, half the loop apart
  for (const from of [path.closest(64, L_LINE.north), path.closest(L_LINE.west, 12)]) {
    train(k, path, { cars: 2, speed: 13, stops: [addison, stateLake], from });
  }
}
