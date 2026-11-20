// The Aston Martin DBS of the film Casino Royale.
//
// In that film it swerves round someone lying in the road and goes over: seven
// times, which stood as a record for years. That is its party trick, with the
// ending the film did not give it. Given a clear straight it swerves one way,
// then the other, turns right over in the air and comes down on its wheels in
// a shower of sparks. Then it drives on as if nothing had happened. Now and
// then it goes over all seven times, bouncing off its wheels between one turn
// and the next, and stands for a moment before it leaves. Its other habit is
// older than this car: whoever sits on its tail for long is left in a smoke
// screen. Standing on show, someone leans on the wrong switch now and then.

import type { PartyTrick } from '../engine/tricks';

/** One turn in the air: how long it takes, in seconds, and how high it goes, in units. */
const AIR = 1.0, HIGH = 2.6;
/** All seven: how long they take, in seconds, and how high it bounces between them. */
const SEVEN = 4.6, BOUNCE = 1.0;
/** How much straight road it wants ahead of it, in units: to go over once, and to go over seven times. */
const ROOM = 36, ROOM_SEVEN = 72;
/** How often it goes over all seven times and not once: one time in four. */
const ALL = 0.25;
/** How wide and how tall it is, in units, and how high the middle is that it turns about: what has to clear the road as it goes over. */
const WIDE = 3.3, TALL = 2.26, MIDDLE = 0.81;

/** How far it has to be off the road to be turned this far over without touching it. */
const clear = (angle: number): number => {
  const c = Math.cos(angle);
  return (WIDE / 2) * Math.abs(Math.sin(angle)) + (c > 0 ? MIDDLE * c : (MIDDLE - TALL) * c) - MIDDLE;
};

export const dbs: PartyTrick = {
  about: 'Given a clear straight it swerves, turns right over in the air and lands on its wheels in a shower of sparks, and drives on as if nothing had happened. Whoever sits on its tail is left in a smoke screen.',

  start() {
    let mode: 'drive' | 'swerve' | 'over' | 'land' | 'stand' = 'drive';
    let left = 6 + Math.random() * 8; // seconds until the next thing
    let way = 1; // which way it goes over: 1 is to its right
    let turns = Math.random() < ALL ? 7 : 1; // how many times it will go over next
    let t = 0; // how far through going over it is, from 0 to 1
    let touched = 0; // how many times its wheels have come down on the way
    let roll = 0, rise = 0, pitch = 0, sway = 0, slide = 0;
    let tailed = 0; // seconds for which someone has sat on its tail
    let screen = 0; // seconds of smoke screen still to lay
    let quiet = 8; // seconds until it will lay another
    // on show: seconds until the switch is leant on again, and seconds it is still held
    let rest = 6 + Math.random() * 8, held = 0;

    return {
      get roll(): number {
        return roll;
      },
      get rise(): number {
        return rise;
      },
      get pitch(): number {
        return pitch;
      },
      get sway(): number {
        return sway;
      },
      get slide(): number {
        return slide;
      },

      drive(d, fx) {
        left -= d.dt;
        let speed = d.cruise * 1.1, accel = 12, nose = 0, aside = 0, yaw = 0, quick = 5;
        if (mode === 'drive') {
          // someone who sits on its tail for long is left in a smoke screen
          quiet -= d.dt;
          tailed = d.behind < 6 + d.speed * 0.45 ? tailed + d.dt : 0;
          if (tailed > 2.5 && quiet <= 0) { screen = 2.8; quiet = 30 + Math.random() * 20; tailed = 0; }
          if (screen > 0) {
            screen -= d.dt;
            fx.screen(1);
            speed = d.cruise * 1.45;
            accel = 22;
          } else if (left <= 0 && d.gap < (turns > 1 ? ROOM_SEVEN : ROOM)) {
            // when it is time, it lets whoever is ahead get away until there is room to go over in: more of it for all seven
            speed = d.cruise * 0.6;
          } else if (left <= 0 && (d.straight > (turns > 1 ? ROOM_SEVEN : ROOM) || (left < -25 && d.bend > 300))) {
            // on a straight that is long enough. Where it has found none for a while, any straight will do.
            mode = 'swerve';
            left = 0.54;
            way = Math.random() < 0.5 ? 1 : -1;
          }
        } else if (mode === 'swerve') {
          // one way, and then the other: and the second is one too many
          const first = left > 0.24;
          aside = way * (first ? 0.7 : 0.2);
          yaw = way * (first ? 0.12 : -0.22);
          quick = first ? 9 : 14;
          if (!first) fx.tyreSmoke(0.5);
          if (left <= 0) { mode = 'over'; t = 0; touched = 0; }
        } else if (mode === 'over') {
          let angle: number;
          if (turns === 1) {
            t += d.dt / AIR;
            speed = d.speed; // nothing to push against
            angle = 2 * Math.PI * Math.min(1, t);
            rise = Math.max(4 * HIGH * t * (1 - t), clear(angle) + 0.05);
          } else {
            t += d.dt / SEVEN;
            // it turns fast at first and more slowly as it goes, and loses speed all the while
            const u = Math.min(1, t);
            angle = (14 * Math.PI * u * (1 - 0.275 * u)) / 0.725;
            speed = Math.max(d.cruise * 0.4, d.speed - 2.4 * d.dt);
            rise = clear(angle) + 0.05 + BOUNCE * Math.sin(angle / 2) ** 2;
            // sparks each time its wheels come down
            const down = Math.floor(angle / (2 * Math.PI) + 0.04);
            if (down > touched) { touched = down; fx.sparks(1, 'under'); fx.tyreSmoke(0.5); }
          }
          roll = way * angle;
          if (t >= 1) { mode = 'land'; left = 0.5; fx.sparks(1, 'under'); fx.tyreSmoke(0.6); }
        } else if (mode === 'land') {
          // it comes down on its springs, and they give
          nose = left > 0.3 ? -0.06 : 0.03;
          if (left > 0.3) fx.sparks(0.8, 'under');
          if (turns > 1) speed = 0;
          if (left <= 0) {
            if (turns > 1) { mode = 'stand'; left = 1.5; }
            else { mode = 'drive'; left = 14 + Math.random() * 12; turns = Math.random() < ALL ? 7 : 1; }
          }
        } else {
          // after all seven it stands for a moment, and then leaves as if nothing had happened
          speed = 0;
          if (left <= 0) { mode = 'drive'; left = 20 + Math.random() * 14; turns = Math.random() < ALL ? 7 : 1; }
        }
        if (mode !== 'over') { rise = 0; roll = 0; }
        sway += (aside - sway) * Math.min(1, d.dt * quick);
        slide += (yaw - slide) * Math.min(1, d.dt * quick);
        pitch += (nose - pitch) * Math.min(1, d.dt * 10);
        return { speed, accel };
      },

      idle(dt, _time, fx) {
        if (held > 0) {
          held -= dt;
          fx.screen(0.45);
          return;
        }
        rest -= dt;
        if (rest <= 0) { held = 0.5; rest = 10 + Math.random() * 10; }
      },
    };
  },
};
