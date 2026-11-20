// The Mazda RX-7 with VeilSide's Fortune body, in orange and black.
//
// Its party trick is the drift. It comes up to a bend faster than it should,
// flicks its tail the wrong way for an instant, and then takes the whole bend
// sideways: nose pointing in, tail hanging out, rear tyres smoking. Where the
// road straightens it gathers itself up with one wag the other way, and a bend
// the other way straight after is taken in one swing from side to side.
// Standing on show it cannot leave its tyres alone either: every so often it
// lights them up until they smoke.

import type { PartyTrick } from '../engine/tricks';

/** A bend tighter than this is worth sliding through. */
const BEND = 42;

export const rx7: PartyTrick = {
  about: 'It drifts: it takes every bend sideways, with its tail out and its rear tyres smoking.',

  start() {
    let mode: 'grip' | 'flick' | 'slide' | 'catch' = 'grip';
    let left = 0; // seconds until the next thing
    let way = 0; // which way the bend goes that it is sliding through
    let aim = 0, slide = 0, pitch = 0;
    // on show: seconds until the next burnout, and seconds of this one left
    let rest = 5 + Math.random() * 6, smoking = 0;

    return {
      get slide(): number {
        return slide;
      },
      get pitch(): number {
        return pitch;
      },

      drive(d, fx) {
        left -= d.dt;
        const bend = d.bend < BEND ? d.turn : 0;
        // the tighter the bend, the further out the tail: from 15 degrees to 27
        const angle = 0.26 + 0.21 * Math.min(1, Math.max(0, (BEND - d.bend) / 34));
        let speed = d.cruise * 1.12, nose = 0, quick = 7.5;
        if (mode === 'grip') {
          if (bend !== 0) { mode = 'flick'; way = bend; left = 0.2; aim = -way * 0.12; }
        } else if (mode === 'flick') {
          // the feint: the tail goes the wrong way for an instant, which is what throws it the right way
          quick = 16;
          if (left <= 0) { mode = 'slide'; aim = way * angle; fx.tyreSmoke(1); }
        } else if (mode === 'slide') {
          speed = d.cruise * 1.3;
          nose = 0.02;
          fx.tyreSmoke(0.75);
          fx.marks(1); // and its rear tyres write the bend on the road
          if (bend === 0) { mode = 'catch'; left = 0.34; aim = -way * 0.09; } // the road straightens: one wag the other way
          else { way = bend; aim = way * angle; } // still in it, or straight into a bend the other way
        } else if (left <= 0) {
          mode = 'grip';
          aim = 0;
        }
        slide += (aim - slide) * Math.min(1, d.dt * quick);
        pitch += (nose - pitch) * Math.min(1, d.dt * 8);
        return { speed, accel: 16 };
      },

      idle(dt, _time, fx) {
        rest -= dt;
        if (smoking > 0) {
          // a burnout: it squats on its tail with both rear tyres alight
          smoking -= dt;
          fx.tyreSmoke(1);
          if (Math.random() < dt * 4) fx.exhaust(0.35);
        } else if (rest <= 0) {
          smoking = 1.8 + Math.random() * 1.2;
          rest = smoking + 14 + Math.random() * 12;
        }
        pitch += ((smoking > 0 ? 0.03 : 0) - pitch) * Math.min(1, dt * 8);
      },
    };
  },
};
