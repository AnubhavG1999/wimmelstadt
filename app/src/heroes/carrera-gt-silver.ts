// The Porsche Carrera GT, in GT Silver.
//
// It was known from the day it came out as a car that bites: a racing engine
// behind the driver and nothing to step in when a right foot is too heavy. Its
// party trick is the moment that name was made of, and the hands that get away
// with it. When its confidence is up it comes out of a bend too hard and its
// tail snaps round, far further than any drift, in a cloud of tyre smoke. It
// is caught: the tail swings back the other way, wobbles once more and comes
// straight, with black marks on the road to show for it. Then it is driven
// like a saint for half a minute, until its nerve comes back. Standing on show
// its ten cylinders are given a blip now and then.

import type { PartyTrick } from '../engine/tricks';

/** How far round the tail goes at the worst of it: about 65 degrees. */
const SNAP = 1.13;
/**
 * The save, a step at a time: how far out the tail is, as a share of the snap;
 * for how long; and how quickly it gets there. Out, caught the other way, one
 * last wobble, and straight.
 */
const SAVE: [number, number, number][] = [
  [1, 0.34, 11],
  [-0.46, 0.42, 6.5],
  [0.2, 0.32, 7],
  [0, 0.3, 8],
];

export const carreraGT: PartyTrick = {
  about: 'When its confidence is up its tail snaps round out of a bend in a cloud of smoke, and it is caught just in time. Then it is driven like a saint until its nerve comes back.',

  start() {
    let mood: 'bold' | 'save' | 'saint' = 'bold';
    let left = 7 + Math.random() * 9; // seconds of this mood left
    let step = 0, stepLeft = 0; // where it is in the save
    let way = 1; // which way the bend went that it came out of
    let lastTurn = 1, inBend = false;
    let shaken = 0; // seconds for which it still hardly dares move
    let aim = 0, quick = 8, slide = 0, pitch = 0;
    let rest = 5 + Math.random() * 6;

    return {
      get slide(): number {
        return slide;
      },
      get pitch(): number {
        return pitch;
      },

      drive(d, fx) {
        left -= d.dt;
        const bend = d.bend < 46 ? d.turn : 0;
        if (bend !== 0) lastTurn = bend;
        let speed = d.cruise, accel = 9, nose = 0;
        if (mood === 'bold') {
          speed = d.cruise * 1.28;
          accel = 18;
          // Out of a bend, too hard on the power. On a road with no bend to come out of it
          // happens on the straight, a little later.
          const leaving = inBend && bend === 0;
          if (d.speed > 6 && ((left <= 0 && leaving) || (left <= -7 && d.bend > 400))) {
            mood = 'save';
            way = leaving ? lastTurn : Math.random() < 0.5 ? 1 : -1;
            step = 0;
            stepLeft = SAVE[0][1];
          }
        } else if (mood === 'save') {
          const [share, , rate] = SAVE[step];
          aim = way * SNAP * share;
          quick = rate;
          speed = Math.max(4, d.cruise * 0.45);
          nose = -0.03;
          fx.tyreSmoke(step < 2 ? 1 : 0.5);
          if (step < 3) fx.marks(1);
          stepLeft -= d.dt;
          if (stepLeft <= 0) {
            step++;
            if (step < SAVE.length) stepLeft = SAVE[step][1];
            else { mood = 'saint'; left = 24 + Math.random() * 10; shaken = 3.2; aim = 0; }
          }
        } else {
          // chastened: it hardly dares move at first, and then goes carefully
          shaken -= d.dt;
          speed = d.cruise * (shaken > 0 ? 0.45 : 0.8);
          if (left <= 0) { mood = 'bold'; left = 9 + Math.random() * 12; }
        }
        inBend = bend !== 0;
        slide += (aim - slide) * Math.min(1, d.dt * quick);
        pitch += (nose - pitch) * Math.min(1, d.dt * 8);
        return { speed, accel };
      },

      idle(dt, _time, fx) {
        rest -= dt;
        if (rest > 0) return;
        fx.exhaust(0.3);
        // often twice
        rest = Math.random() < 0.4 ? 0.35 : 7 + Math.random() * 7;
      },
    };
  },
};
