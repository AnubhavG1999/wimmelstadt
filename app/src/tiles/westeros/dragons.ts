// The three dragons, put on the tile and set flying: Drogon, Rhaegal and
// Viserion, after the books' three and in the books' colours.
//
// What a dragon is and how one flies are the engine's (`engine/dragons/`),
// which began here, and the three kinds are in its `kinds.ts`. Where each is
// at any moment is in flight.ts and show.ts. This file puts the three on the
// tile, flies each with a pilot of its own, and draws their fire, their
// ribbons and their shadows.

import * as THREE from 'three';
import { Fire } from '../../engine/dragons/fire';
import { DROGON, RHAEGAL, VISERION } from '../../engine/dragons/kinds';
import { Dragon } from '../../engine/dragons/model';
import { Pilot, type Held } from '../../engine/dragons/pilot';
import { Trails } from '../../engine/dragons/trails';
import type { Build } from '../../engine/tile';
import { CLEAR, checkFlight, nearest, reachOf } from './clearance';
import { aim, close, fourViews, frames, look, sheet } from './debug';
import { Show } from './flight';
import { LOTS, isWater } from './plan';
import { groundAt } from './regions';
import { SHOW } from './show';

const RAD = Math.PI / 180;

/** Whether a place is free of anything built, so that a flame's light may fall there. */
const open = (x: number, z: number): boolean => isWater(x, z) || !LOTS.some((l) => x > l.x0 - 1 && x < l.x1 + 1 && z > l.z0 - 1 && z < l.z1 + 1);

export function buildDragons(k: Build): void {
  const kinds = [DROGON, RHAEGAL, VISERION];
  const dragons = kinds.map((kind) => new Dragon(kind, k.look));
  const fire = new Fire();
  const trails = new Trails(6);
  for (const d of dragons) k.group.add(d.mesh, d.shadow);
  k.group.add(fire.mesh, fire.pools, trails.mesh);

  // near anything built they hold their slots closely: each strays no further than it could and still keep clear,
  // measured as the check of their clearance measures it, and with a little more for how a drift tips its wings
  const TIP = 1.3;
  const show = new Show(SHOW, (who, p, v, a) => {
    const reach = reachOf(who, p, v, a);
    return reach.length > 0 ? Math.min(...reach.map((q) => nearest(q).d)) - CLEAR - TIP : 0;
  });
  const held: (Held | null)[] = [null, null, null];
  // Each flies in its own time. The leader looks further into a turn, and the two that follow beat a little
  // sooner than he does, to hold their places.
  const pilots = dragons.map((d, i) => new Pilot(d, { phase: i, lead: i === 0 ? 0.9 : 0.5, keen: i === 0 ? 1 : 0.85, seed: 4711 + i * 97, firstBeat: 0.8 + i * 0.9 }));
  /** Where each is on the show's clock, and how high what it would land on is. */
  const where = dragons.map((_, i) => (t: number, out: THREE.Vector3): THREE.Vector3 => show.pos(i, t, out));
  const floor = dragons.map((_, i) => (p: THREE.Vector3): number => show.perchFloor(i) ?? groundAt(p.x, p.z));

  // the show's own clock: it can be stopped, set and sped up from the console
  let clock = 0, rate = 1;
  // taken away, for measuring what they cost
  let away = false;

  k.each((dt, time, night) => {
    if (away) return;
    clock += dt * rate;
    dragons.forEach((d, i) => {
      const h = held[i], pilot = pilots[i], flame = kinds[i].flame;
      if (h) {
        // held still, to be looked at
        pilot.hold(h, time, groundAt);
        if (h.fire) {
          const mid = d.mouth;
          fire.breathe(i, d.mouth, d.mouthDir, pilot.vel, flame, h.fire, dt, open(mid.x + d.mouthDir.x * 6, mid.z + d.mouthDir.z * 6) ? groundAt(mid.x + d.mouthDir.x * 6, mid.z + d.mouthDir.z * 6) : null);
        }
      } else {
        // in the show: placed where the show has it, and turned and posed by how it is moving
        show.cue(i, clock, pilot.cue);
        pilot.fly(where[i], clock, time, dt * rate, floor[i], groundAt);
        const cue = pilot.cue;
        if (cue.fire > 0) {
          const gx = d.mouth.x + d.mouthDir.x * flame.reach * 0.5, gz = d.mouth.z + d.mouthDir.z * flame.reach * 0.5;
          fire.breathe(i, d.mouth, d.mouthDir, pilot.vel, flame, cue.fire, dt * rate, open(gx, gz) ? groundAt(gx, gz) : null);
        }
      }
      // a ribbon off each wing tip in a hard turn or at speed, and in the cold air of the North a little more
      const ribbon = pilot.ribbons(dt * rate, h !== null, pilot.pose.pos.z < -40 ? 1.3 : 1);
      trails.feed(i * 2, d.tips[0], ribbon, dt * rate);
      trails.feed(i * 2 + 1, d.tips[1], ribbon, dt * rate);
      pilot.light(night);
    });
    fire.update(dt * rate, night);
    trails.update(night);
  });

  if (import.meta.env.DEV) {
    const worst = checkFlight(show);
    const whereNow = (): number[][] => pilots.map((p) => p.pose.pos.toArray().map((v) => Math.round(v * 10) / 10));
    const t = show.times;
    console.info(`Westeros: a display circuit takes ${t.display.toFixed(1)} s, a split ${t.split.toFixed(1)} s, of which ${t.apart.toFixed(1)} apart. Alone they would take ${show.natural.map((n) => n.toFixed(1)).join(', ')} s.`);
    // For the console. westeros.hold(0, { x, y, z, heading, bank, speed, sit, fire }) stands a dragon still to be looked at,
    // and westeros.hold(0, null) lets it fly again. westeros.at(seconds) sets the show's clock, westeros.rate(0) stops it,
    // westeros.split() makes the next circuit a split and goes to just before the climb.
    (window as unknown as { westeros: unknown }).westeros = {
      dragons, pilots, show, worst,
      hold(i: number, h: Held | null): void { held[i] = h; },
      at(seconds?: number): number { if (seconds !== undefined) clock = seconds; return clock; },
      rate(r?: number): number { if (r !== undefined) rate = r; return rate; },
      split(split = true): number { const start = show.force(clock, split); clock = start; return start; },
      where: whereNow,
      /** Where each is in a beat of its wings just now: 0 while it glides. */
      beating: (): number[] => pilots.map((s) => s.cue.beat || s.beat),
      /** How fast each flies, how fast it climbs, and how far it is banked, in degrees. */
      moving: (): number[][] => pilots.map((s) => [Math.round(s.vel.length() * 10) / 10, Math.round(s.vel.y * 10) / 10, Math.round(s.bank / RAD)]),
      /** Takes the dragons, their fire, their shadows and their ribbons away, or puts them back: for measuring what they cost. */
      off(v = true): void {
        away = v;
        for (const o of [...dragons.flatMap((d) => [d.mesh, d.shadow]), fire.mesh, fire.pools, trails.mesh]) o.visible = !v;
      },
      /** Goes to a moment of the show and stops there: the clock is set a little before it and frames run up to it, so that banks have settled. */
      goto(seconds: number): number[][] { rate = 1; clock = seconds - 0.5; frames(30); rate = 0; return whereNow(); },
      frames, look, close, aim, sheet, fourViews,
    };
  }
}
