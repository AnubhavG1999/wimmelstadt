// The Porsche 911 GT3 of the 992 kind, in Racing Yellow.
//
// It is a racing car with number plates, and it treats whatever road it is on
// as a circuit. Its party trick is a race of three laps, over and over. The
// first is the formation lap: it holds back and weaves from side to side to
// warm its tyres. As that lap ends its rear tyres light up, and the second is
// the flying lap: lamps lit, flat out, leaning on its outside wheels through
// the bends. The third is slow, to cool everything down. Standing on show it
// is given a blip now and then.

import type { PartyTrick } from '../engine/tricks';

export const gt3: PartyTrick = {
  about: 'It runs its road as a race: a lap weaving from side to side to warm its tyres, a flying lap flat out with its lamps lit, and a slow lap to cool down.',
  // its lamps are round, set back on its front wings
  lamps: { along: 0.37, across: 0.33, up: 1.08, wide: 0.2 },

  start() {
    let lap: 'formation' | 'flying' | 'cool' = 'formation';
    let was = -1; // how far round its road it was a frame ago
    let weave = 0; // where it is in its weave
    let spin = 0; // seconds of wheelspin left as the flying lap begins
    let sway = 0, roll = 0, pitch = 0;
    let rest = 6 + Math.random() * 6;

    return {
      get sway(): number {
        return sway;
      },
      get roll(): number {
        return roll;
      },
      get pitch(): number {
        return pitch;
      },

      drive(d, fx) {
        // a new lap begins where it comes round to the start of its road again
        if (was >= 0 && d.lap < was - 0.5) {
          lap = lap === 'formation' ? 'flying' : lap === 'flying' ? 'cool' : 'formation';
          if (lap === 'flying') spin = 0.7;
        }
        was = d.lap;
        let speed = d.cruise, accel = 9, side = 0, lean = 0, nose = 0;
        if (lap === 'formation') {
          speed = d.cruise * 0.74;
          // from side to side, less in a bend than on a straight, and not at all at a crawl
          weave += d.dt * 5.2 * Math.max(0.5, Math.min(1.3, d.speed / 10));
          const reach = (d.bend < 40 ? 0.35 : 1) * Math.min(1, d.speed / 6);
          side = Math.sin(weave) * 0.98 * reach;
          lean = -Math.cos(weave) * 0.05 * reach;
        } else if (lap === 'flying') {
          speed = d.cruise * 1.32;
          accel = 26;
          fx.lamps(0.5);
          if (spin > 0) { spin -= d.dt; fx.tyreSmoke(0.9); fx.marks(1); nose = 0.05; }
          // it leans on its outside wheels through a bend
          if (d.bend < 46) lean = -d.turn * 0.055;
        } else {
          speed = d.cruise * 0.8;
        }
        const ease = Math.min(1, d.dt * 9);
        sway += (side - sway) * ease;
        roll += (lean - roll) * ease;
        pitch += (nose - pitch) * ease;
        return { speed, accel };
      },

      idle(dt, _time, fx) {
        rest -= dt;
        if (rest > 0) return;
        fx.exhaust(0.25);
        rest = Math.random() < 0.3 ? 0.4 : 8 + Math.random() * 7;
      },
    };
  },
};
