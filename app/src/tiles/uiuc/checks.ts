// Checks that the tile runs on itself on the development server, and says in
// the console what it finds.
//
// This tile's routes share lanes on purpose: a loop round several blocks runs
// in the lanes of the loops inside it. The checks for that, `roadFaults` and
// `throughSolids`, were written here and are in the engine since the tile
// joined the board: see engine/checks.ts. What is left is the tile's own.

import { hiddenBy, type Tall } from '../../engine/checks';
import type { SightPoint } from './plan';

/** The places that must be seen from the opening view and are not, each with what stands in the way. */
export function unseen(points: SightPoint[], tall: Tall[]): string[] {
  return points.flatMap((p) => {
    const by = hiddenBy(p, tall.filter((t) => !p.skip.some((s) => t.id === s || t.id.startsWith(`${s}/`))));
    return by.length > 0 ? [`${p.name} is behind ${by.join(', ')}`] : [];
  });
}
