// A check of what the view the tile opens with can see: from the
// south-south-east, looking down at 38 degrees, a thing as high as H hides the
// ground for about 1.3 H behind it.
//
// It goes by the plan's lots as boxes with their heights, so it is a guide to
// where to look, and not the last word: the ground's own rises (the canyon's
// rim, the trench's south rim) are not in it. It speaks in the console, on the
// development server only.

import { hiddenBy, type Tall } from '../../engine/checks';
import type { P3 } from '../../engine/corners';
import { HERO_SPOTS, LOTS, SIGHT } from './plan';
import { LANES } from './roads';

/** A vehicle is seen if a point this high above the road is. */
const EYE = 1.6;

/** What could hide a place: every lot that stands, but those the place is in or under. */
function around(x: number, z: number): Tall[] {
  return LOTS.filter((l) => !l.part && !(x > l.x0 - 0.5 && x < l.x1 + 0.5 && z > l.z0 - 0.5 && z < l.z1 + 0.5))
    .map((l) => ({ id: l.id, x0: l.x0, z0: l.z0, x1: l.x1, z1: l.z1, top: l.top }));
}

export function checkSight(): void {
  const lines: string[] = [];
  for (const [id, lane] of Object.entries(LANES)) {
    let hidden = 0, total = 0;
    const by = new Map<string, number>();
    lane.forEach((p: P3, i) => {
      const q = lane[(i + 1) % lane.length], d = Math.hypot(q[0] - p[0], q[2] - p[2]);
      total += d;
      const hides = hiddenBy({ x: p[0], y: p[1] + EYE, z: p[2] }, around(p[0], p[2]));
      if (hides.length === 0) return;
      hidden += d;
      by.set(hides[0], (by.get(hides[0]) ?? 0) + d);
    });
    const worst = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([what, d]) => `${what} ${d.toFixed(0)}`).join(', ');
    lines.push(`${id}: ${hidden.toFixed(0)} of ${total.toFixed(0)} units out of sight${worst ? ` (behind ${worst})` : ''}`);
  }
  for (const p of SIGHT) {
    const hides = hiddenBy(p, around(p.x, p.z));
    if (hides.length > 0) lines.push(`${p.id} is behind ${hides.join(', ')}`);
  }
  for (const s of HERO_SPOTS) {
    const hides = hiddenBy({ x: s.x, y: s.y + EYE, z: s.z }, around(s.x, s.z));
    if (hides.length > 0) lines.push(`the place for a hero ${s.id} is behind ${hides.join(', ')}`);
  }
  console.info(`Gotham: what the opening view sees, by the plan's boxes:\n  ${lines.join('\n  ')}`);
}
