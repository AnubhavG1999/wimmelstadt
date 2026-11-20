// A check of what the view the tile opens with can see of the roads and of
// the places for a hero: from the south-south-east, looking down at 38
// degrees, a thing as high as H hides the ground for about 1.3 H behind it.
//
// It goes by the plan's lots as boxes with their heights, so it is a guide to
// where to look, and not the last word: a mountain is not a box, and Storm's
// End's wall is low towards the sea. It speaks in the console, on the
// development server only.

import { hiddenBy, type Tall } from '../../engine/checks';
import type { P3 } from '../../engine/corners';
import { GATES, HERO_SPOTS, LOTS, STORMS_END } from './plan';
import { LANES } from './roads';

/** A traveller is seen if a point this high above the road is. */
const EYE = 1.6;

export function checkSight(): void {
  // a gate hides what goes through it, which is as it should be, and the ice of the Wall hides the ring beyond it
  const gates = new Set(GATES.map((g) => g.lot));
  const talls: Tall[] = LOTS.filter((l) => l.id !== 'se-wall').map((l) => ({ id: l.id, x0: l.x0, z0: l.z0, x1: l.x1, z1: l.z1, top: l.top }));
  const lines: string[] = [];
  for (const [id, lane] of Object.entries(LANES)) {
    let hidden = 0, total = 0;
    const by = new Map<string, number>();
    lane.forEach((p: P3, i) => {
      const q = lane[(i + 1) % lane.length], d = Math.hypot(q[0] - p[0], q[2] - p[2]);
      total += d;
      // inside Storm's End's wall the bailey is seen over the low side of the wall
      if (Math.hypot(p[0] - STORMS_END.x, p[2] - STORMS_END.z) < STORMS_END.wall) return;
      // what a traveller is in or under does not count as hiding it
      const hides = hiddenBy({ x: p[0], y: p[1] + EYE, z: p[2] }, talls.filter((t) => !(gates.has(t.id) && p[0] > t.x0 - 1 && p[0] < t.x1 + 1 && p[2] > t.z0 - 1 && p[2] < t.z1 + 1)));
      if (hides.length === 0) return;
      hidden += d;
      by.set(hides[0], (by.get(hides[0]) ?? 0) + d);
    });
    const worst = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([what, d]) => `${what} ${d.toFixed(0)}`).join(', ');
    lines.push(`${id}: ${hidden.toFixed(0)} of ${total.toFixed(0)} units are out of sight${worst ? ` (behind ${worst})` : ''}`);
  }
  for (const s of HERO_SPOTS) {
    const hides = hiddenBy({ x: s.x, y: EYE, z: s.z }, talls);
    if (hides.length > 0) lines.push(`the place for a hero ${s.id} is behind ${hides.join(', ')}`);
  }
  console.info(`Westeros: what the opening view sees of the roads, by the plan's boxes:\n  ${lines.join('\n  ')}`);
}
