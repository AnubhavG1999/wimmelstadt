// The Nissan Skyline GT-R of the R34 kind, a V-Spec II in Bayside Blue.
//
// When the GT-R first went abroad it beat everything it met, and the papers
// there called it Godzilla: the monster from Japan. Every GT-R since has
// answered to that name. So its party trick is the monster's own. A blue glow
// gathers on the road under it, as it gathers along the monster's back before
// it breathes. Then it breathes: a long blue flame from its tail, and it
// charges, with all four wheels clawing black marks into the road. By night
// the glow lights the street. Afterwards it smokes a little and the glow dies
// away. Standing on show it sleeps, and the glow comes and goes under it.

import type { PartyTrick } from '../engine/tricks';

/** The blue of its glow. */
const BLUE = 0x2a6bff;

export const r34: PartyTrick = {
  about: 'A blue glow gathers on the road under it, and then it breathes a long blue flame from its tail and charges, with all four wheels clawing black marks into the road.',

  // its pipe is at the left of its tail, and what comes out of it here is no exhaust
  pipes: [{ along: -0.5, across: -0.3, points: 'back', up: 0.5, bore: 3, reach: 1.2 }],

  start() {
    let mode: 'prowl' | 'gather' | 'breathe' | 'spent' = 'prowl';
    let left = 6 + Math.random() * 9; // seconds until the next thing
    let t = 0; // seconds since it began to breathe
    let glow = 0; // how bright the glow under it is, from 0 to 1
    let pitch = 0;
    // on show: where it is in a breath of its sleep, in seconds
    let sleep = Math.random() * 6;

    return {
      get pitch(): number {
        return pitch;
      },

      drive(d, fx) {
        left -= d.dt;
        let speed = d.cruise, accel = 9, nose = 0, aim = 0, quick = 1;
        if (mode === 'prowl') {
          // when it is time, it lets whoever is ahead get away until there is room to charge
          if (left <= 0 && d.gap < 46) speed = d.cruise * 0.6;
          else if (left <= 0 && d.bend > 150) { mode = 'gather'; left = 1.9; }
        } else if (mode === 'gather') {
          // it holds back while the glow gathers
          speed = d.cruise * 0.7;
          nose = -0.025;
          aim = 1;
          quick = 1.6;
          if (left <= 0) { mode = 'breathe'; t = 0; left = 3.4; }
        } else if (mode === 'breathe') {
          t += d.dt;
          speed = d.cruise * 1.9;
          accel = 44;
          aim = 1;
          quick = 6;
          nose = t < 0.3 ? 0.1 : 0.045;
          fx.flame(1, true);
          if (t < 1.1) fx.marks(1, true);
          // it breathes until it is out of breath, however much road there is left to charge on
          if (left <= 0) { mode = 'spent'; left = 2.6; }
        } else {
          speed = d.cruise * 0.85;
          quick = 0.9;
          if (Math.random() < d.dt * 4) fx.exhaust(0.3);
          if (left <= 0) { mode = 'prowl'; left = 14 + Math.random() * 12; }
        }
        glow += (aim - glow) * Math.min(1, d.dt * quick);
        // it flickers as it gathers, and burns steadily once it breathes
        if (glow > 0.02) fx.under(glow * (mode === 'gather' ? 0.8 + 0.2 * Math.sin(d.time * 21) : 1), BLUE);
        pitch += (nose - pitch) * Math.min(1, d.dt * 9);
        return { speed, accel };
      },

      idle(dt, _time, fx) {
        // one slow breath in every nine seconds or so
        sleep = (sleep + dt) % 9;
        if (sleep < 3.6) fx.under(0.5 * Math.sin((Math.PI * sleep) / 3.6) ** 2, BLUE);
      },
    };
  },
};
