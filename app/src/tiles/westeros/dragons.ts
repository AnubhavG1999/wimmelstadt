// The three dragons, put on the tile and set flying: Drogon, Rhaegal and
// Viserion, after the books' three and in the books' colours.
//
// What a dragon is, is in dragon.ts. Where each is at any moment is in
// flight.ts and show.ts. This file turns a place in the air into a dragon that
// points along its way, banks into its turns, shapes its wings to its speed,
// beats them now and then, and breathes fire when the show says so.

import * as THREE from 'three';
import type { Build } from '../../engine/tile';
import { checkFlight } from './clearance';
import { aim, close, fourViews, frames, look, sheet } from './debug';
import { DROGON, Dragon, FLARE, FOLDED, RHAEGAL, VISERION, blendForm, formAt, stance, wingPose, type Pose, type WingPose } from './dragon';
import { DROGON_FLAME, Fire, RHAEGAL_FLAME, VISERION_FLAME } from './fire';
import { Show, type Cue } from './flight';
import { LOTS, isWater } from './plan';
import { groundAt } from './regions';
import { SHOW } from './show';
import { Trails } from './trails';

const RAD = Math.PI / 180;
const UP = new THREE.Vector3(0, 1, 0);

/** A dragon held still, for looking at it: where, which way it heads, and how it is posed. */
export interface Held {
  x: number; y: number; z: number;
  /** In degrees: 0 heads east and 90 south, as on the map. */
  heading?: number;
  /** Degrees of bank to its right, and of nose up. */
  bank?: number;
  pitch?: number;
  /** The speed its wings are shaped for. */
  speed?: number;
  /** Where it is in a wingbeat, from 0 to 1. 0 is a glide. */
  beat?: number;
  /**
   * How far it is through landing: 0 flies, 0.5 has its feet down with its wings still spread, and 1 stands
   * braced on the claws of its wings. Where this is given, `y` is the height of what it stands on.
   */
  sit?: number;
  jaw?: number;
  /** How strongly it breathes fire, from 0 to 1. */
  fire?: number;
  /** Its head turned to its right, in degrees. */
  look?: number;
}

const blankWing = (): WingPose => ({ sweep: 0, lift: 0, hand: 0, fan: 1, tip: 0 });

/** What is kept of each dragon from one frame to the next. */
interface State {
  pose: Pose;
  /** What is to its right, carried from frame to frame so that it never flips in a climb. */
  right: THREE.Vector3;
  bank: number;
  /** The speed its wings are shaped for: it follows its real speed with a little lag. */
  shaped: number;
  /** A wingbeat of its own, and how long until the next. */
  beat: number;
  untilBeat: number;
  neckYaw: number;
  neckPitch: number;
  cue: Cue;
  vel: THREE.Vector3;
}

/** Whether a place is free of anything built, so that a flame's light may fall there. */
const open = (x: number, z: number): boolean => isWater(x, z) || !LOTS.some((l) => x > l.x0 - 1 && x < l.x1 + 1 && z > l.z0 - 1 && z < l.z1 + 1);

export function buildDragons(k: Build): void {
  const kinds = [DROGON, RHAEGAL, VISERION], flames = [DROGON_FLAME, RHAEGAL_FLAME, VISERION_FLAME];
  const dragons = kinds.map((kind) => new Dragon(kind, k.look));
  const fire = new Fire();
  const trails = new Trails(6);
  for (const d of dragons) k.group.add(d.mesh, d.shadow);
  k.group.add(fire.mesh, fire.pools, trails.mesh);

  const show = new Show(SHOW);
  const held: (Held | null)[] = [null, null, null];
  const state = dragons.map((_, i): State => ({
    pose: { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), speed: 30, time: 0, neckYaw: 0, neckPitch: 0, arch: 0, right: blankWing(), left: blankWing(), jaw: 0, legs: 0, fin: 0, sit: 0, brace: 0, floor: 0 },
    right: new THREE.Vector3(1, 0, 0), bank: 0, shaped: 30, beat: 0, untilBeat: 2 + i * 1.9, neckYaw: 0, neckPitch: 0,
    cue: { fire: 0, charge: 0, roll: 0, beat: 0, sit: 0 }, vel: new THREE.Vector3(),
  }));

  // the show's own clock: it can be stopped, set and sped up from the console
  let clock = 0, rate = 1;
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), q0 = new THREE.Vector3(), q2 = new THREE.Vector3();
  const vel = new THREE.Vector3(), acc = new THREE.Vector3(), fwd = new THREE.Vector3(), level = new THREE.Vector3(), up = new THREE.Vector3(), right = new THREE.Vector3(), ahead = new THREE.Vector3();
  const m4 = new THREE.Matrix4(), euler = new THREE.Euler(), perch = new THREE.Quaternion();
  const ease = (dt: number, per: number): number => 1 - Math.exp(-dt * per);

  /** Sets a dragon's wings: by its speed, by how far it is through landing, and by where it is in a beat. */
  const wings = (p: Pose, speed: number, sit: number, beat: number): void => {
    const flying = formAt(speed);
    const form = sit <= 0 ? flying : sit < 0.5 ? blendForm(flying, FLARE, sit * 2) : blendForm(FLARE, FOLDED, (sit - 0.5) * 2);
    wingPose(form, sit > 0.5 ? 0 : beat, p.right);
    wingPose(form, sit > 0.5 ? 0 : beat, p.left);
  };

  /** A dragon held still, to be looked at. */
  const holdStill = (i: number, h: Held, time: number, dt: number): void => {
    const d = dragons[i], p = state[i].pose, sit = h.sit ?? 0;
    // how far its feet are down, and how far it has come down onto its wing claws
    const land = Math.min(1, sit * 2), down = Math.max(0, sit * 2 - 1), stn = stance(down);
    p.pos.set(h.x, h.y + stn.root * d.kind.length * land, h.z);
    // heading, then nose up, then bank to its right; as it lands, it stands as a landing dragon stands
    p.quat.setFromEuler(euler.set((h.bank ?? 0) * RAD * (1 - land), -(h.heading ?? 0) * RAD, (h.pitch ?? 0) * RAD * (1 - land) + stn.pitch * land, 'YZX'));
    p.speed = h.speed ?? 30;
    p.time = time;
    p.neckYaw = (h.look ?? 0) * RAD;
    p.neckPitch = 0;
    p.arch = down;
    p.sit = down;
    p.brace = down;
    p.legs = land;
    p.floor = sit > 0 ? h.y : groundAt(h.x, h.z);
    p.jaw = h.jaw ?? (h.fire ? 1 : 0);
    p.fin = ((h.bank ?? 0) * RAD) / 4;
    wings(p, p.speed, sit, h.beat ?? 0);
    d.pose(p, groundAt);
    d.throat.set(d.kind.glow).multiplyScalar(p.jaw * 2.2);
    if (h.fire) {
      const mid = d.mouth;
      fire.breathe(i, d.mouth, d.mouthDir, vel.set(0, 0, 0), flames[i], h.fire, dt, open(mid.x + d.mouthDir.x * 6, mid.z + d.mouthDir.z * 6) ? groundAt(mid.x + d.mouthDir.x * 6, mid.z + d.mouthDir.z * 6) : null);
    }
  };

  /** A dragon in the show: placed where the show has it, and turned and posed by how it is moving. */
  const fly = (i: number, time: number, dt: number): void => {
    const d = dragons[i], st = state[i], p = st.pose, cue = show.cue(i, clock, st.cue);
    // where it is, how fast it goes and how hard it turns: from where it was and where it will be
    show.pos(i, clock - 0.05, p0);
    show.pos(i, clock, p1);
    show.pos(i, clock + 0.05, p2);
    show.pos(i, clock - 0.14, q0);
    show.pos(i, clock + 0.14, q2);
    vel.subVectors(p2, p0).multiplyScalar(1 / 0.1);
    acc.copy(q2).add(q0).addScaledVector(p1, -2).multiplyScalar(1 / (0.14 * 0.14));
    const speed = vel.length();
    st.vel.copy(vel);
    if (speed > 0.4) fwd.copy(vel).multiplyScalar(1 / speed);
    else fwd.set(1, 0, 0).applyQuaternion(p.quat);

    // what is to its right: carried along, and drawn level again where it flies level
    st.right.addScaledVector(fwd, -st.right.dot(fwd));
    if (st.right.lengthSq() < 1e-6) st.right.crossVectors(fwd, UP);
    st.right.normalize();
    const flat = 1 - Math.abs(fwd.y);
    if (flat > 0.1) {
      level.crossVectors(fwd, UP).normalize();
      st.right.lerp(level, ease(dt, 7 * flat * flat)).normalize();
    }
    // the bank: into the turn, by how hard it turns at its speed, and never more than 78 degrees
    const want = flat > 0.1 ? THREE.MathUtils.clamp(Math.atan2(acc.dot(level), 13) * Math.min(1, flat * 1.6), -78 * RAD, 78 * RAD) : 0;
    st.bank += (want - st.bank) * ease(dt, 6);
    const tilt = st.bank + cue.roll;
    up.crossVectors(st.right, fwd).normalize();
    right.copy(st.right).multiplyScalar(Math.cos(tilt)).addScaledVector(up, -Math.sin(tilt));
    up.multiplyScalar(Math.cos(tilt)).addScaledVector(st.right, Math.sin(tilt));
    p.quat.setFromRotationMatrix(m4.makeBasis(fwd, up, right));
    p.pos.copy(p1);

    // Landing: it rears back as it flares, its feet come down, and then it comes down onto the claws of its wings.
    // The place it lands on is the ground under its feet, so the root of its neck is carried that much above its line.
    const land = Math.min(1, cue.sit * 2), down = Math.max(0, cue.sit * 2 - 1);
    if (cue.sit > 0) {
      const heading = Math.atan2(fwd.z, fwd.x), stn = stance(down);
      perch.setFromEuler(euler.set(0, -heading, stn.pitch * land, 'YZX'));
      p.quat.slerp(perch, land);
      p.pos.y += stn.root * d.kind.length * land;
    }

    p.speed = speed;
    p.time = time;
    p.sit = down;
    p.arch = down;
    p.brace = down;
    p.legs = land;
    p.floor = show.perchFloor(i) ?? groundAt(p1.x, p1.z);

    // its head turns into a turn a moment before its body does, the leader's most of all
    show.pos(i, clock + 0.4, ahead);
    ahead.sub(p2).normalize();
    const lead = i === 0 ? 0.9 : 0.5;
    const yaw = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(ahead.dot(right), -1, 1)) * lead, -0.5, 0.5);
    const pitch = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(ahead.dot(up), -1, 1)) * 0.6, -0.3, 0.3);
    st.neckYaw += (yaw * (1 - p.sit) - st.neckYaw) * ease(dt, 5);
    st.neckPitch += (pitch * (1 - p.sit) - st.neckPitch) * ease(dt, 5);
    p.neckYaw = st.neckYaw + p.sit * 0.5 * Math.sin(time * 0.5 + i);
    p.neckPitch = st.neckPitch;
    p.fin = st.bank / 4;

    // its wings: shaped by its speed, with a little lag, and beaten now and then
    st.shaped += (speed - st.shaped) * ease(dt, 2.2);
    let beat = cue.beat;
    if (beat <= 0) {
      // a beat of its own: one every few seconds while it cruises, none when it is fast
      if (st.beat > 0) {
        st.beat += dt / 0.76;
        if (st.beat >= 1) st.beat = 0;
      } else if (st.shaped < 36 && cue.sit <= 0) {
        st.untilBeat -= dt;
        if (st.untilBeat <= 0) { st.beat = 0.0001; st.untilBeat = 5 + 3 * ((Math.sin(time * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) % 1; }
      }
      beat = st.beat;
    } else st.beat = 0;
    wings(p, st.shaped, cue.sit, beat);

    p.jaw = Math.max(cue.fire, cue.charge * 0.45);
    d.pose(p, groundAt);
    d.throat.set(d.kind.glow).multiplyScalar(cue.charge * 1.5 + cue.fire * 1.6);
    d.lit.set(d.kind.glow).multiplyScalar(cue.fire * 0.3);
    if (cue.fire > 0) {
      const gx = d.mouth.x + d.mouthDir.x * flames[i].reach * 0.5, gz = d.mouth.z + d.mouthDir.z * flames[i].reach * 0.5;
      fire.breathe(i, d.mouth, d.mouthDir, vel, flames[i], cue.fire, dt, open(gx, gz) ? groundAt(gx, gz) : null);
    }
  };

  // taken away, for measuring what they cost
  let away = false;

  k.each((dt, time, night) => {
    if (away) return;
    clock += dt * rate;
    dragons.forEach((d, i) => {
      const h = held[i];
      if (h) holdStill(i, h, time, dt);
      else fly(i, time, dt * rate);
      // a ribbon off each wing tip in a hard turn or at speed, and in the cold air of the North a little more
      const st = state[i];
      const hard = h ? 0 : Math.max(THREE.MathUtils.smoothstep(Math.abs(st.bank) / RAD, 42, 62), THREE.MathUtils.smoothstep(st.shaped, 38, 46)) * (st.pose.pos.z < -40 ? 1.3 : 1) * (st.cue.sit > 0 ? 0 : 1);
      trails.feed(i * 2, d.tips[0], hard, dt * rate);
      trails.feed(i * 2 + 1, d.tips[1], hard, dt * rate);
      // its eyes show by day and burn at night; its shadow is paler the higher it is, and gone by night
      d.eye.set(d.kind.eye).multiplyScalar(0.6 + 2.2 * night);
      d.shadowMat.opacity = 0.32 * (1 - night) * Math.max(0.3, 1 - state[i].pose.pos.y / 150);
    });
    fire.update(dt * rate, night);
    trails.update(night);
  });

  if (import.meta.env.DEV) {
    const worst = checkFlight(show);
    const where = (): number[][] => dragons.map((_, i) => state[i].pose.pos.toArray().map((v) => Math.round(v * 10) / 10));
    const t = show.times;
    console.info(`Westeros: a display circuit takes ${t.display.toFixed(1)} s, a split ${t.split.toFixed(1)} s, of which ${t.apart.toFixed(1)} apart. Alone they would take ${show.natural.map((n) => n.toFixed(1)).join(', ')} s.`);
    // For the console. westeros.hold(0, { x, y, z, heading, bank, speed, sit, fire }) stands a dragon still to be looked at,
    // and westeros.hold(0, null) lets it fly again. westeros.at(seconds) sets the show's clock, westeros.rate(0) stops it,
    // westeros.split() makes the next circuit a split and goes to just before the climb.
    (window as unknown as { westeros: unknown }).westeros = {
      dragons, show, worst,
      hold(i: number, h: Held | null): void { held[i] = h; },
      at(seconds?: number): number { if (seconds !== undefined) clock = seconds; return clock; },
      rate(r?: number): number { if (r !== undefined) rate = r; return rate; },
      split(split = true): number { const start = show.force(clock, split); clock = start; return start; },
      where,
      /** Takes the dragons, their fire, their shadows and their ribbons away, or puts them back: for measuring what they cost. */
      off(v = true): void {
        away = v;
        for (const o of [...dragons.flatMap((d) => [d.mesh, d.shadow]), fire.mesh, fire.pools, trails.mesh]) o.visible = !v;
      },
      /** Goes to a moment of the show and stops there: the clock is set a little before it and frames run up to it, so that banks have settled. */
      goto(seconds: number): number[][] { rate = 1; clock = seconds - 0.5; frames(30); rate = 0; return where(); },
      frames, look, close, aim, sheet, fourViews,
    };
  }
}
