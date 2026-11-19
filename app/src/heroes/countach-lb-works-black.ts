// The Lamborghini Countach LB-WORKS, in black.
//
// Its party trick is the pull. It hangs back until the road ahead of it is
// clear, then launches into the gap with its rear tyres smoking and flame at
// its exhausts, lifts off with a crackle when it catches the traffic up, and
// settles down again until the next one. Standing on show it cannot keep quiet
// either: every few seconds it is given a blip of throttle.

import type { PartyTrick } from '../engine/tricks';

export const countach: PartyTrick = {
  about: 'It does pulls: it hangs back until the road ahead is clear, then launches with flame at its exhausts.',

  start() {
    let mode: 'cruise' | 'hang' | 'launch' | 'lift' = 'cruise';
    let left = 4 + Math.random() * 5; // seconds until the next thing
    let shift = 0; // seconds until the next gear
    let pitch = 0;

    return {
      get pitch(): number {
        return pitch;
      },

      drive(d, fx) {
        left -= d.dt;
        let speed = d.cruise, accel = 9, nose = 0;
        if (mode === 'cruise') {
          if (left <= 0) { mode = 'hang'; left = 5; }
        } else if (mode === 'hang') {
          // drop back to open up some road
          speed = d.cruise * 0.5;
          if (d.gap > 46 || left <= 0) {
            if (d.gap > 22) { mode = 'launch'; left = 3.2; shift = 0.8; fx.flame(1); fx.tyreSmoke(0.8); }
            else { mode = 'cruise'; left = 3 + Math.random() * 4; }
          }
        } else if (mode === 'launch') {
          speed = d.cruise * 1.9;
          accel = 30;
          nose = 0.07;
          shift -= d.dt;
          if (shift <= 0) { fx.flame(0.5); shift = 0.8; } // a pop on every change of gear
          if (d.gap < 11 + d.speed * 0.6 || left <= 0) { mode = 'lift'; left = 0.8; fx.flame(0.75); }
        } else {
          // off the throttle: the nose dips and the exhaust crackles
          nose = -0.05;
          if (Math.random() < d.dt * 8) fx.flame(0.25);
          if (left <= 0) { mode = 'cruise'; left = 6 + Math.random() * 7; }
        }
        pitch += (nose - pitch) * Math.min(1, d.dt * 8);
        return { speed, accel };
      },

      idle(dt, _time, fx) {
        left -= dt;
        if (left > 0) return;
        fx.flame(0.6);
        fx.exhaust(0.5);
        // often twice in quick succession
        left = Math.random() < 0.4 ? 0.3 : 5 + Math.random() * 6;
      },
    };
  },
};
