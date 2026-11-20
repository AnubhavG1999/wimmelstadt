// The McLaren MP4/4, number 12, as it ran in the Japanese Grand Prix of 1988.
//
// That race is its party trick. On the grid at Suzuka it stalled, was got going
// again on the slope, and came through the field to win, quicker still once
// rain began to fall. So here it sits a beat too long whenever it sets off, and
// then pulls harder than anything in the city. It has no smoke and no flame:
// it is simply faster, most of all through a bend, which it takes as if on
// rails. It keeps room ahead of itself to do that in, dropping back from
// whoever it catches and then coming again. When the road is wet it goes
// quicker, not slower, with a plume of mist standing behind it. Standing on
// show its engine is kept warm: a blip, and then two.

import type { PartyTrick } from '../engine/tricks';

export const mp44: PartyTrick = {
  about: 'It sits a beat too long when it sets off, then pulls harder than anything, takes bends as if on rails, and goes quicker in the rain.',

  start() {
    // it starts as it started that day: stalled
    let stall = 1.4 + Math.random() * 0.8; // seconds it still sits once the road ahead is clear
    let stood = 0; // how long it has been standing in traffic
    let driven = false; // whether it has driven since it last stalled
    let back = 0; // seconds it still hangs back to open up some road
    let pitch = 0;
    // on show: the blips still to come, and the time to the next
    let blips: number[] = [];
    let beat = 3 + Math.random() * 4;

    return {
      get pitch(): number {
        return pitch;
      },

      drive(d, fx) {
        const ease = Math.min(1, d.dt * 8);
        // brought to a stand by the traffic for more than a moment, it will stall again
        if (d.speed > 3) driven = true;
        if (d.speed < 0.4) {
          stood += d.dt;
          if (driven && stood > 1.5) { stall = 0.8 + Math.random() * 0.6; driven = false; }
        } else stood = 0;
        if (stall > 0) {
          // it comes to a stand, and does not move until the road ahead has been clear for that long
          if (d.gap > 9 && d.speed < 0.4) stall -= d.dt;
          pitch += (0 - pitch) * ease;
          return { speed: 0 };
        }

        const wet = d.wet > 0.25;
        // close behind someone: as close as the traffic follows, which is further back the faster it goes
        if (d.gap < 4 + d.speed * 0.7) back = 2.2;
        let speed = d.cruise * (d.bend < 60 ? 1.3 : 1.22) * (wet ? 1.1 : 1);
        if (back > 0) { back -= d.dt; speed = d.cruise * 0.6; }
        if (wet && d.speed > 6) fx.mist(Math.min(1, d.speed / 22));
        // its nose lifts a little under power and dips on the brakes
        const nose = d.speed < speed - 2 ? 0.035 : d.speed > speed + 2 ? -0.045 : 0;
        pitch += (nose - pitch) * ease;
        return { speed, accel: 32 };
      },

      idle(dt, _time, fx) {
        beat -= dt;
        if (beat > 0) return;
        if (blips.length === 0) blips = [0.9, 0.28, 0];
        fx.exhaust(0.22);
        const wait = blips.shift() ?? 0;
        beat = blips.length > 0 ? wait : 7 + Math.random() * 6;
      },
    };
  },
};
