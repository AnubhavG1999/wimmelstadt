// The Porsche 911 GT2 RS of the 991 kind, in black, with the Weissach package.
//
// It held the record round the Nürburgring's north loop, a road with crests
// that fast cars leave the ground over. The best known of them is called
// Flugplatz, the airfield. That is its party trick. Given a clear straight it
// winds its turbochargers up to full boost with a flame at every change of
// gear, takes off with all four wheels in the air, and lands in a shower of
// sparks. Then it gathers itself and looks for the next straight. It wants
// room for that, so close behind someone it drops back and comes again.
// Standing on show its turbochargers are heard: two sharp puffs as the
// throttle is let go.

import type { PartyTrick } from '../engine/tricks';

/** How long it is in the air, in seconds, and how high it goes, in units. */
const AIR = 0.78, HIGH = 1.5;

export const gt2rs: PartyTrick = {
  about: 'Given a clear straight it winds up to full boost with a flame at every change of gear, takes off with all four wheels in the air, and lands in a shower of sparks.',

  start() {
    let mode: 'run' | 'wind' | 'air' | 'land' = 'run';
    let left = 5 + Math.random() * 7; // seconds until the next thing
    let shift = 0; // seconds until the next change of gear
    let t = 0; // how far through its flight it is, from 0 to 1
    let back = 0; // seconds it still hangs back to open up some road
    let rise = 0, pitch = 0;
    // on show: seconds until the next puff, and whether its second half is due
    let rest = 4 + Math.random() * 5, twice = false;

    return {
      get rise(): number {
        return rise;
      },
      get pitch(): number {
        return pitch;
      },

      drive(d, fx) {
        left -= d.dt;
        let speed = d.cruise * 1.15, accel = 14, nose = 0;
        // close behind someone: as close as the traffic follows, which is further back the faster it goes
        if (d.gap < 4 + d.speed * 0.7) back = 2.2;
        if (back > 0) { back -= d.dt; speed = d.cruise * 0.62; }
        const straight = d.bend > 300;
        if (mode === 'run') {
          // when it is time, it lets whoever is ahead get away until there is room for a run-up
          if (left <= 0 && d.gap < 36) speed = d.cruise * 0.6;
          else if (left <= 0 && straight) { mode = 'wind'; left = 1.3; shift = 0.3; }
        } else if (mode === 'wind') {
          // full boost, with a flame at every change of gear
          speed = d.cruise * 1.8;
          accel = 30;
          nose = 0.05;
          shift -= d.dt;
          if (shift <= 0) { fx.flame(0.8); shift = 0.42; }
          if (!straight || d.gap < 14) { mode = 'run'; left = 2 + Math.random() * 3; } // no room for it after all
          else if (left <= 0 || d.speed > d.cruise * 1.55) { mode = 'air'; t = 0; }
        } else if (mode === 'air') {
          t += d.dt / AIR;
          speed = d.speed; // nothing to push against
          rise = 4 * HIGH * t * (1 - t);
          nose = 0.07 - 0.15 * t; // nose up as it leaves the road, and down as it comes back
          if (t >= 1) { mode = 'land'; left = 0.5; fx.sparks(1, 'under'); fx.tyreSmoke(0.4); }
        } else {
          // it lands on its springs, and they give
          nose = left > 0.3 ? -0.07 : 0.03;
          if (left > 0.25) fx.sparks(0.8, 'under');
          if (left <= 0) { mode = 'run'; left = 11 + Math.random() * 9; }
        }
        if (mode !== 'air') rise = 0;
        pitch += (nose - pitch) * Math.min(1, d.dt * 10);
        return { speed, accel };
      },

      idle(dt, _time, fx) {
        rest -= dt;
        if (rest > 0) return;
        fx.exhaust(0.28);
        twice = !twice;
        rest = twice ? 0.2 : 6 + Math.random() * 6;
      },
    };
  },
};
