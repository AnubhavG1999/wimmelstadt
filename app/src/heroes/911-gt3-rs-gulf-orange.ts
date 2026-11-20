// The Porsche 911 GT3 RS of the 992 kind, in Gulf Orange, with the Weissach package.
//
// It is a car built round a wing: taller than its roof, lying flat on a
// straight and standing up as an airbrake when the driver is on the brakes.
// So that is its party trick. At speed the tips of its wing draw two white
// ribbons through the air. And it brakes later than anything else in the city:
// nose on the road, tail in the air, and sparks off its splitter. It wants room
// to brake into, so close behind someone it drops back and comes again.
//
// Its brake discs glowed as well, at first. The glow stood out from the wheels
// as a ring of light and took the eye off the car, so it was taken out.

import type { PartyTrick } from '../engine/tricks';

/** How high the tips of its wing are above the road, in units. */
const WING = 1.9;

export const gt3rs: PartyTrick = {
  about: 'Its wing draws two white ribbons through the air at speed, and it brakes later than anything: nose down, tail up and sparks off its splitter.',

  start() {
    let braking = false;
    let hard = 0; // how long it has been on the brakes this time
    let eased = 0; // how long it has been off them
    let was = 0; // how fast it was going a frame ago
    let back = 0; // seconds it still hangs back to open up some road
    let pitch = 0;

    return {
      get pitch(): number {
        return pitch;
      },

      drive(d, fx) {
        let speed = d.cruise * 1.3, nose = 0;
        // close behind someone: as close as the traffic follows, which is further back the faster it goes
        if (d.gap < 4 + d.speed * 0.7) back = 2.4;
        if (back > 0) { back -= d.dt; speed = d.cruise * 0.6; }
        // how hard it is slowing: for a bend, or for whoever is ahead
        const slowing = d.dt > 0 ? (was - d.speed) / d.dt : 0;
        was = d.speed;
        if (!braking && slowing > 10 && d.speed > 6) { braking = true; hard = 0; eased = 0; }
        if (braking) {
          hard += d.dt;
          nose = -0.15;
          // its splitter touches the road as its nose goes down
          if (hard < 0.45) fx.sparks(0.7, 'nose');
          eased = slowing < 3 ? eased + d.dt : 0;
          if (eased > 0.12 || d.speed < 1) braking = false;
        } else if (d.speed > 13 && d.speed > d.cruise * 0.9) {
          // the faster it goes, the more its wing has to do
          fx.streaks(Math.min(1, (d.speed - 10) / 16), 0xffffff, WING);
        }
        pitch += (nose - pitch) * Math.min(1, d.dt * 12);
        return { speed, accel: 17 };
      },
    };
  },
};
