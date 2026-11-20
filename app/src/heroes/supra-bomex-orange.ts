// The Toyota Supra of the film The Fast and the Furious: orange, with a body
// kit by Bomex and a wing as wide as itself.
//
// It is that film's ten-second car, and its party trick is a run on nitrous as
// that film shows one. First it purges: two jets of white vapour from its
// bonnet. Then it goes, for exactly ten seconds, with its nose up, a long
// flame at its exhaust and the light of its tail lamps drawn out behind it.
// In those ten seconds it changes up far more often than it has gears to
// change to, with a bang at each. Then it has to cool. Close behind someone it
// lifts, and its flame shrinks to a flicker, but the ten seconds go on
// counting. Standing on show it purges now and then, for whoever is looking.

import type { PartyTrick } from '../engine/tricks';

/** How long a run lasts, in seconds. */
const RUN = 10;

export const supra: PartyTrick = {
  about: 'It purges two jets of white vapour from its bonnet and goes for exactly ten seconds, nose up, with a long flame at its exhaust and far more changes of gear than it has gears, each with a bang.',

  // one large pipe at the left of its tail
  pipes: [{ along: -0.5, across: -0.3, points: 'back', up: 0.55, bore: 2.6, reach: 1.25 }],

  start() {
    let mode: 'cruise' | 'purge' | 'run' | 'cool' = 'cruise';
    let left = 6 + Math.random() * 8; // seconds until the next thing
    let shift = 0; // seconds until the next change of gear
    let cut = 0; // seconds for which the power is off, at a change
    let bang = 0; // seconds for which the bang that follows still lasts
    let pitch = 0;
    // on show: seconds until the next purge, and seconds it still lasts
    let rest = 5 + Math.random() * 6, hiss = 0;

    return {
      get pitch(): number {
        return pitch;
      },

      drive(d, fx) {
        left -= d.dt;
        let speed = d.cruise * 1.05, accel = 10, nose = 0, quick = 9;
        if (mode === 'cruise') {
          // when it is time, it lets whoever is ahead get away until the road is its own
          if (left <= 0 && d.gap < 70) speed = d.cruise * 0.55;
          else if (left <= 0 && d.bend > 150) { mode = 'purge'; left = 1.3; }
        } else if (mode === 'purge') {
          fx.purge(1);
          speed = d.cruise * 0.9;
          nose = -0.02;
          if (left <= 0) { mode = 'run'; left = RUN; shift = 0.6; cut = 0; bang = 0.3; }
        } else if (mode === 'run') {
          speed = d.cruise * 1.5;
          accel = 34;
          // close behind someone it has to lift
          const lifted = d.gap < 4 + d.speed * 0.7;
          if (cut > 0) {
            // a change of gear: the power is off for an instant, and comes back with a bang and a puff
            cut -= d.dt;
            nose = 0.01;
            quick = 24;
            if (cut <= 0) { bang = 0.17; fx.exhaust(0.45); }
          } else {
            nose = lifted ? 0.02 : 0.1;
            bang -= d.dt;
            fx.flame(bang > 0 ? 1 : lifted ? 0.15 : 0.5);
            shift -= d.dt;
            if (shift <= 0) { cut = 0.1; shift = 0.52 + Math.random() * 0.34; }
          }
          fx.streaks(1, 0xff3a1a, 1.25);
          if (left <= 0) { mode = 'cool'; left = 9 + Math.random() * 6; fx.exhaust(0.7); }
        } else {
          // it ticks and smokes while it cools
          speed = d.cruise * 0.8;
          if (Math.random() < d.dt * 2.5) fx.exhaust(0.3);
          if (left <= 0) { mode = 'cruise'; left = 12 + Math.random() * 12; }
        }
        pitch += (nose - pitch) * Math.min(1, d.dt * quick);
        return { speed, accel };
      },

      idle(dt, _time, fx) {
        if (hiss > 0) {
          hiss -= dt;
          fx.purge(1);
          return;
        }
        rest -= dt;
        if (rest <= 0) { hiss = 0.9; rest = 9 + Math.random() * 9; }
      },
    };
  },
};
