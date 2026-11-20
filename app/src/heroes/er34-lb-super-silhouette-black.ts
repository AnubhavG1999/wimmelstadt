// The Nissan Skyline with Liberty Walk's Super Silhouette body, in black.
//
// The racing Skylines of the 1980s that its body is drawn from were known for
// one thing above all: the flame from the pipe in the sill whenever the driver
// came off the throttle. So its party trick is fire on the way in. It runs the
// straights harder than the traffic, and whenever it has to brake hard, for a
// bend or for whoever is ahead, its nose goes down and it spits a flame from
// under its left door on every change down, with a crackle after the last. It
// wants a clear road to do that on, so close behind someone it drops back for
// a moment and then comes again. Standing on show it is revved in the rhythm
// of three, three and seven, as such cars are in Japan.

import type { PartyTrick } from '../engine/tricks';

/** On show: how long after each pop the next one comes. Three, three and seven. */
const CALL = [0.27, 0.27, 0.62, 0.27, 0.27, 0.62, 0.27, 0.27, 0.27, 0.27, 0.27, 0.27, 0];

export const er34: PartyTrick = {
  about: 'It brakes late and hard, with a flame from the pipe under its left door on each change down.',
  // its one big pipe, in the left sill between the wheels
  pipes: [{ along: -0.04, across: -0.5, points: 'left', up: 0.42, bore: 2.2 }],

  start() {
    let braking = false;
    let changes = 0; // changes down still to come in this braking
    let next = 0; // seconds until the next of them
    let crackle = 0; // seconds of crackle left after the last
    let back = 0; // seconds it still hangs back to open up some road
    let was = 0; // how fast it was going a frame ago
    let eased = 0; // how long it has been off the brakes
    let pitch = 0;
    // on show: the pops still to come in this call, and the time to the next
    let call: number[] = [];
    let beat = 4 + Math.random() * 5;

    return {
      get pitch(): number {
        return pitch;
      },

      drive(d, fx) {
        let speed = d.cruise * 1.3, nose = 0;
        // close behind someone: as close as the traffic follows, which is further back the faster it goes
        if (d.gap < 4 + d.speed * 0.7) back = 2.4;
        if (back > 0) { back -= d.dt; speed = d.cruise * 0.62; }
        // how hard it is slowing: for a bend, or for whoever is ahead
        const slowing = d.dt > 0 ? (was - d.speed) / d.dt : 0;
        was = d.speed;
        if (!braking && slowing > 10 && d.speed > 5) {
          // hard on the brakes: more changes down the faster it was going, and never fewer than two
          braking = true;
          changes = d.speed > 24 ? 4 : d.speed > 14 ? 3 : 2;
          next = 0.04;
          eased = 0;
        }
        if (braking) {
          nose = -0.07;
          next -= d.dt;
          if (changes > 0 && next <= 0) { fx.flame(0.55 + 0.45 * Math.random()); changes--; next = 0.19 + Math.random() * 0.06; }
          // it is off the brakes once it has stopped slowing for a moment
          eased = slowing < 3 ? eased + d.dt : 0;
          if (eased > 0.12 || d.speed < 1) { braking = false; changes = 0; crackle = 0.5; }
        } else if (crackle > 0) {
          // off the brakes and not yet on the throttle
          crackle -= d.dt;
          speed = Math.min(speed, d.speed + 0.5);
          if (Math.random() < d.dt * 9) fx.flame(0.2);
        }
        pitch += (nose - pitch) * Math.min(1, d.dt * 9);
        return { speed, accel: 15 };
      },

      idle(dt, _time, fx) {
        beat -= dt;
        if (beat > 0) return;
        if (call.length === 0) call = [...CALL];
        fx.flame(0.2);
        const wait = call.shift() ?? 0;
        if (call.length > 0) beat = wait;
        else { fx.exhaust(0.5); beat = 8 + Math.random() * 7; }
      },
    };
  },
};
