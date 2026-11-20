// The Porsche 911 Turbo S of the 992 kind, in Python Green.
//
// Nothing with number plates leaves a line as it does: four driven wheels, two
// turbochargers, and a launch control that anyone can work. So that is its
// party trick. It potters like a commuter until the road ahead is empty. Then
// it stops dead, squats while its boost builds, and goes: so hard that its
// nose lifts off the road, with four black stripes left behind it and no
// smoke, and by night a streak of red light from its lamps. Whoever is behind
// waits for a moment. Standing on show it does nothing at all, which is its
// other trick.

import type { PartyTrick } from '../engine/tricks';

export const turboS: PartyTrick = {
  about: 'When the road ahead is empty it stops dead, squats, and leaves so hard that its nose lifts off the road, with four black stripes behind it and no smoke.',

  start() {
    let mode: 'potter' | 'stop' | 'stage' | 'go' = 'potter';
    let left = 7 + Math.random() * 8; // seconds until the next thing
    let t = 0; // seconds since it went
    let pitch = 0;

    return {
      get pitch(): number {
        return pitch;
      },

      drive(d, fx) {
        left -= d.dt;
        let speed = d.cruise, accel = 9, nose = 0, quick = 8;
        if (mode === 'potter') {
          // when it is time, it lets whoever is ahead get away, and stops once the road is its own
          if (left <= 0 && d.gap < 44) speed = d.cruise * 0.55;
          else if (left <= 0 && d.bend > 150) mode = 'stop';
        } else if (mode === 'stop') {
          speed = 0;
          nose = -0.04;
          if (d.gap < 20) { mode = 'potter'; left = 6; } // someone has come into the way
          else if (d.speed < 0.3) { mode = 'stage'; left = 1.1; }
        } else if (mode === 'stage') {
          // its boost builds: its tail squats and its exhausts huff
          speed = 0;
          nose = 0.035;
          if (Math.random() < d.dt * 7) fx.exhaust(0.35);
          if (left <= 0) { mode = 'go'; t = 0; }
        } else {
          t += d.dt;
          speed = d.cruise * 2.1;
          accel = 62;
          quick = 14;
          // its nose comes up as it goes, and settles as the speed builds
          nose = t < 0.25 ? 0.2 : Math.max(0, 0.2 - (t - 0.25) * 0.24);
          if (t < 0.95) fx.marks(1, true);
          if (d.night > 0.45) fx.streaks(1, 0xff2a1a, 0.85);
          if (t > 2.4 || d.gap < 12 + d.speed * 0.6 || d.bend < 30) { mode = 'potter'; left = 15 + Math.random() * 12; }
        }
        pitch += (nose - pitch) * Math.min(1, d.dt * quick);
        return { speed, accel };
      },
    };
  },
};
