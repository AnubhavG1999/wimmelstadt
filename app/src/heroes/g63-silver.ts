// The Mercedes-AMG G 63, in silver.
//
// It was drawn with a ruler for armies and foresters, and it is now what the
// famous are driven to dinner in. So its party trick is to be seen. Wherever
// it passes people, their flashbulbs go off. Now and then, where enough of
// them stand, it stops in the middle of the road with its hazard lamps going,
// and the flashbulbs go mad while whoever is behind it waits. Then it leaves
// with its tail squatting and flame from the pipes under its doors, which is
// where a G 63 keeps them. Standing on show its hazard lamps blink: it is only
// stopping for a moment.

import type { PartyTrick } from '../engine/tricks';

/** How long its hazard lamps are lit and dark for, in seconds: one blink. */
const BLINK = 0.72;

export const g63: PartyTrick = {
  about: 'Flashbulbs go off wherever people stand to see it pass. Now and then it stops in front of them, in the middle of the road, with its hazard lamps going, and leaves with its tail squatting and flame from the pipes under its doors.',

  // its pipes come out under its doors, a pair on each side, just ahead of the rear wheels
  pipes: [
    { along: -0.11, across: -0.5, points: 'left', up: 0.5, bore: 2 },
    { along: -0.11, across: 0.5, points: 'right', up: 0.5, bore: 2 },
  ],
  // its indicators stand on top of its front wings
  lamps: { along: 0.41, across: 0.4, up: 1.8, wide: 0.17 },

  start() {
    let mode: 'parade' | 'stop' | 'pose' | 'leave' = 'parade';
    let left = 9 + Math.random() * 9; // seconds until the next thing
    let t = 0; // seconds since it left
    let lit = 0; // where its hazard lamps are in their blink, in seconds
    let pitch = 0;

    return {
      get pitch(): number {
        return pitch;
      },

      drive(d, fx) {
        left -= d.dt;
        let speed = d.cruise * 0.92, accel = 8, nose = 0, quick = 6;
        let hazards = false;
        if (mode === 'parade') {
          fx.bulbs(0.4);
          // It stops where it likes, as long as there is someone there to see it: whoever is
          // ahead or behind is no concern of its own. Where it finds nobody for a while, it
          // stops anyway.
          if (left <= 0 && d.bend > 150 && (d.crowd >= 3 || left < -20)) mode = 'stop';
        } else if (mode === 'stop') {
          speed = 0;
          nose = -0.03;
          hazards = true;
          fx.bulbs(0.9);
          if (d.speed < 0.3) { mode = 'pose'; left = 3.6; }
        } else if (mode === 'pose') {
          speed = 0;
          hazards = true;
          fx.bulbs(3);
          if (left <= 0) { mode = 'leave'; t = 0; }
        } else {
          t += d.dt;
          speed = d.cruise * 1.5;
          accel = 26;
          quick = 9;
          // its tail squats as it goes
          nose = t < 0.9 ? 0.075 : 0;
          if (t < 0.75) fx.flame(0.9);
          fx.bulbs(1.2);
          if (t > 2.2) { mode = 'parade'; left = 16 + Math.random() * 14; }
        }
        lit = hazards ? (lit + d.dt) % BLINK : 0;
        if (hazards && lit < BLINK / 2) fx.hazards();
        pitch += (nose - pitch) * Math.min(1, d.dt * quick);
        return { speed, accel };
      },

      idle(_dt, time, fx) {
        fx.bulbs(0.5);
        if (time % BLINK < BLINK / 2) fx.hazards();
      },
    };
  },
};
