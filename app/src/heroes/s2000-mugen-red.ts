// The Honda S2000 as Mugen dressed it, in red, with its roof down.
//
// Its party trick is its engine, which has two characters. Low in its revs it
// is a polite roadster; high up, its second cam comes in and it kicks. So it
// pulls gently out of every bend, then kicks with its nose in the air, and
// runs each gear right out before it takes the next, nodding at every change.
// Coming down for a bend it is given a blip for each gear on the way. It likes
// a bend and carries a little more speed through one than the traffic does,
// and it wants room to run through its gears, so close behind someone it lifts
// for a moment and then pulls again. And because its roof is down, it hurries
// when it rains.

import type { PartyTrick } from '../engine/tricks';

/** How much speed one gear is good for, once it is up on its second cam. */
const GEAR = 3.4;

export const s2000: PartyTrick = {
  about: 'It pulls gently out of each bend until its second cam comes in, then kicks, and runs every gear right out. Its roof is down, so it hurries in the rain.',

  start() {
    let mode: 'cruise' | 'gentle' | 'kick' = 'cruise';
    let left = 0; // seconds of the gentle pull still to go
    let mark = 0; // the speed at which it takes the next gear
    let nod = 0; // seconds of the nod at a change of gear still to go
    let was = 0; // how fast it was going a frame ago
    let blip = 0; // the speed at which it is next given a blip on the way down
    let back = 0; // seconds it still hangs back to open up some road
    let pitch = 0;
    // on show: seconds until it is next revved
    let rest = 6 + Math.random() * 6;

    return {
      get pitch(): number {
        return pitch;
      },

      drive(d, fx) {
        let speed = d.cruise * (d.bend < 60 ? 1.15 : 1.2) * (d.wet > 0.25 ? 1.25 : 1);
        // it wants room to run through its gears: close behind someone it lifts, and then pulls again
        if (d.gap < 4 + d.speed * 0.7) back = 2;
        if (back > 0) { back -= d.dt; speed = d.cruise * 0.66; }
        let accel = 9, nose = 0;
        nod -= d.dt;
        if (mode === 'cruise') {
          // a real pull is called for: out of a bend, or away from a stand
          if (d.speed < speed - 3.5) { mode = 'gentle'; left = 0.75 + Math.random() * 0.25; }
        } else if (mode === 'gentle') {
          accel = 4;
          left -= d.dt;
          if (d.speed > speed - 1) mode = 'cruise';
          else if (left <= 0) { mode = 'kick'; mark = d.speed + GEAR * 0.7; fx.exhaust(0.2); }
        } else {
          // on the second cam: it pulls hard, and lifts for an instant at every change of gear
          accel = nod > 0 ? 0 : 24;
          nose = 0.06;
          if (d.speed >= mark) { nod = 0.15; mark = d.speed + GEAR; }
          if (d.speed > speed - 0.6) mode = 'cruise';
        }
        if (nod > 0) nose = -0.075;
        // slowing for a bend: a blip for each gear on the way down
        if (d.speed < was - 0.05) {
          if (d.speed < blip) { fx.exhaust(0.12); blip = d.speed - GEAR; }
        } else blip = d.speed - GEAR * 0.6;
        was = d.speed;
        pitch += (nose - pitch) * Math.min(1, d.dt * 11);
        return { speed, accel };
      },

      idle(dt, _time, fx) {
        rest -= dt;
        if (rest > 0) return;
        fx.exhaust(0.25);
        // now and then twice
        rest = Math.random() < 0.3 ? 0.45 : 8 + Math.random() * 8;
      },
    };
  },
};
