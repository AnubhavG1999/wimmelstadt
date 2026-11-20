// The BMW M4 CS, in Frozen Isle of Man Green, with the yellow lamps of its kind.
//
// Its party trick is that it wants to get by. It closes up on whoever is ahead,
// sits as close as it dares and flashes its yellow lamps: once at first, then
// in twos, then in threes, and at last without stopping. Nobody in the city
// ever moves over, so after a while it gives up in a sulk and drops back. Then
// the road ahead is open, and it is gone: all four wheels driving, no smoke,
// until it has caught the same car up again. Standing on show it winks at
// whoever walks past.

import type { PartyTrick } from '../engine/tricks';

const YELLOW = 0xffd83a;

export const m4cs: PartyTrick = {
  about: 'It sits close behind whoever is ahead and flashes its yellow lamps, more and more insistently. When the road opens it is gone.',
  // its lamps are slim, high on the corners of its nose
  lamps: { along: 0.415, across: 0.31, up: 1.04, wide: 0.24 },

  start() {
    let held = 0; // how long it has been held up
    let burst = 0; // flashes still to come in this burst
    let next = 0; // seconds until the next flash
    let wait = 2.5; // seconds until the next burst
    let sulk = 0; // seconds it still drops back for
    let gone = 0; // seconds of its getaway left
    let pitch = 0;
    // on show: seconds until the next wink, and whether its second half is due
    let rest = 4 + Math.random() * 5, twice = false;

    return {
      get pitch(): number {
        return pitch;
      },

      drive(d, fx) {
        let speed = d.cruise * 1.28, accel = 14, nose = 0;
        // held up: it is as close behind someone as the road lets it be
        const close = d.gap < 5.5 + d.speed * 0.62;
        if (sulk > 0) {
          sulk -= d.dt;
          speed = d.cruise * 0.58;
          held = 0;
          burst = 0;
          if (sulk <= 0 && d.gap > 18) gone = 2.8;
        } else if (close) {
          gone = 0;
          held += d.dt;
          wait -= d.dt;
          if (burst === 0 && wait <= 0) {
            // once, then in twos, then in threes, then without stopping
            burst = held < 6 ? 1 : held < 12 ? 2 : held < 19 ? 3 : 5;
            wait = held < 6 ? 3 : held < 12 ? 2.6 : held < 19 ? 2.2 : 1.3;
            next = 0;
          }
          // nobody moves over: it gives up, for now
          if (held > 23) sulk = 5;
        } else if (d.gap > 14) {
          // the road has opened of itself
          if (held > 2 && d.gap > 26) gone = 2.8;
          held = 0;
          burst = 0;
          wait = 2.5;
        }
        if (burst > 0) {
          next -= d.dt;
          if (next <= 0) { fx.lamps(1, YELLOW); burst--; next = 0.23; }
        }
        if (gone > 0) {
          gone -= d.dt;
          speed = d.cruise * 1.7;
          accel = 34;
          nose = 0.045;
        }
        pitch += (nose - pitch) * Math.min(1, d.dt * 8);
        return { speed, accel };
      },

      idle(dt, _time, fx) {
        rest -= dt;
        if (rest > 0) return;
        fx.lamps(0.8, YELLOW);
        twice = !twice;
        rest = twice ? 0.24 : 6 + Math.random() * 6;
      },
    };
  },
};
