// The stories of the west bank and Bristol: Old Gotham's towers and its police
// roof, the civic quarter, Robinson Park, the waterfront, and Wayne Manor with
// the Batcave.
//
// One story is written, the Signal, as the model for the rest: its chapter's
// builder writes the others. The one export below is what stories.ts calls,
// and it stays.

import type { Build } from '../../engine/tile';
import { blend, idle, leap, perch, point, shrug, walk } from './figures';
import { SIGNAL, lotOf } from './plan';
import { TO_VIEW, at, beside, ease, hidden, lerp, lineLeg, span, still, toward, turnTo, type Leg, type World } from './stage';
import type { Book } from './stories';

/** Gives the west's figures their posts and adds its stories to the book. */
export function west(_k: Build, W: World, book: Book): void {
  const tower = lotOf('wayne-tower'), gcpd = lotOf('gcpd');

  // ------------------------------------------------------------------ places
  const PERCH = W.place('towers', 'perch', at(tower.x1 - 0.6, tower.top, tower.z1 - 0.6, TO_VIEW));
  const GORDON = W.place('civic', 'gordon', at(SIGNAL.lamp[0] - 1.4, gcpd.top, SIGNAL.lamp[2] - 1.4, TO_VIEW));

  // ------------------------------------------------------------------ the cast at rest
  // Batman crouches on his gargoyle, cape about him, and turns his head to the city; his eyes show at night.
  book.post('batman', PERCH, (t, post) => still(post, { ...perch((t * 0.05) % 1), head: Math.sin(t * 0.23) * 0.7 }, { glow: W.night(), cape: 0.1 }));
  book.post('gordon', GORDON);

  // ------------------------------------------------------------------ 1. The Signal
  // Detective Comics 60 (1942): the lamp on the police roof. Gordon lights it, Batman comes down on his line, they
  // talk, Gordon looks where he pointed, and when he looks back the roof is empty.
  {
    const behind = beside(GORDON, -2.6, 0.4, GORDON.h), edge = at(behind.x + Math.cos(TO_VIEW) * 3.2, behind.y, behind.z + Math.sin(TO_VIEW) * 3.2, TO_VIEW);
    const LIT = 1.5, UP = 5, LAND = UP + 0.6, GONE = 22;
    let down: Leg | null = null;
    const lit = (tb: number): number => (tb < 27 ? ease(span(tb, LIT, LIT + 2)) : 1 - ease(span(tb, 27, 29)));
    book.stories.push({
      id: 'signal', name: 'the Signal', cast: ['gordon', 'batman'], holds: ['policeRoof', 'signal'], weight: 1.3, marks: { gordon: 'post', batman: 'post' }, body: 30,
      may: (w) => w.night() > 0.3,
      play(tb, P) {
        const g = P.from('gordon'), home = P.from('batman');
        down ??= lineLeg(W.solid, home, behind);
        // Gordon: throws the switch, waits looking up, turns when Batman lands, points across the city, looks that way,
        // looks back at an empty roof, shrugs, and puts the light out
        const turned = turnTo(g.h, toward(g.x, g.z, behind.x, behind.z), span(tb, LAND + down.dur, LAND + down.dur + 0.5));
        const backAgain = turnTo(turned, g.h, span(tb, 15, 15.6)), last = turnTo(g.h, turned, span(tb, GONE + 0.8, GONE + 1.3));
        const gh = tb < 15 ? turned : tb < GONE + 0.8 ? backAgain : last;
        const gp = tb < LIT + 0.8 ? { armR: 1.4 * ease(span(tb, 0.3, 1.2)), elbowR: 0.3 }
          : tb < LAND ? { nod: -0.35 }
          : tb > 12 && tb < 19.5 ? point(span(tb, 12, 19.5))
          : tb > GONE + 1.6 && tb < GONE + 4 ? shrug(span(tb, GONE + 1.6, GONE + 4))
          : tb > 26 && tb < 27.6 ? { armR: 1.4, elbowR: 0.3 } : idle((tb * 0.1) % 1);
        P.put('gordon', still(at(g.x, g.y, g.z, gh), gp));
        // Batman: rises on his gargoyle with his cape opening, comes down on his line, listens, and is gone
        if (tb < UP) {
          const s = ease(span(tb, 3.4, UP));
          P.put('batman', still(home, blend(perch(0), {}, s), { cape: 0.1 + 0.5 * s, spread: 0.5 * s, glow: W.night() }));
        } else if (tb < LAND + down.dur) {
          P.put('batman', tb < LAND ? still(home, leap(0.1), { cape: 0.6, spread: 0.5, glow: W.night() }) : { ...down.at(tb - LAND), glow: W.night() });
        } else if (tb < GONE - 2.2) {
          P.put('batman', still(at(behind.x, behind.y, behind.z, toward(behind.x, behind.z, g.x, g.z)), { head: 0.25 * Math.sin(tb * 0.6) }, { cape: 0.1, glow: W.night() }));
        } else if (tb < GONE) {
          // to the parapet while Gordon looks the other way, and over it with his cape spread
          const s = span(tb, GONE - 2.2, GONE), over = span(tb, GONE - 0.7, GONE);
          P.put('batman', still(at(lerp(behind.x, edge.x, s), behind.y + 1.4 * Math.sin(Math.PI * Math.min(1, over * 1.2)) - 2.4 * over * over, lerp(behind.z, edge.z, s), TO_VIEW),
            over > 0 ? leap(0.4 + 0.5 * over) : walk((s * 2.2) % 1), { cape: 0.4 + 0.6 * over, spread: over, aloft: over > 0, glow: W.night() }));
        } else P.put('batman', hidden(edge));
      },
      props(tb) { W.air?.signal(lit(tb), 'bat'); },
      end() { down = null; W.air?.signal(0); },
    });
  }

  book.opening.push('signal');
}
