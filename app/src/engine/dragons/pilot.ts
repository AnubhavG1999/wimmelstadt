// How a dragon flies. A tile says where each of its dragons is at any moment,
// as a place for each time, and what it is told to do (breathe fire, roll,
// beat its wings, land); a pilot turns that into a pose on every frame, in
// the dragon's own manner (`DragonKind.flight`). It points the dragon along
// its way, banks it into its turns, shapes its wings to its speed, beats them
// when the dragon has to work, lets its body ride its wings, and turns its
// head into a turn a moment before its body.
//
// What the dragon does with its fire, its ribbons and its shadow stays the
// tile's: the pilot gives the places and the strengths, and the tile draws.

import * as THREE from 'three';
import { rng } from '../geo';
import { Dragon, FLARE, FOLDED, blendForm, formAt, stance, wingPose, type DragonFlight, type Pose, type WingPose } from './model';

const RAD = Math.PI / 180;
const UP = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const ease = (dt: number, per: number): number => 1 - Math.exp(-dt * per);

/** What a dragon is told to do at a moment, besides being where it is. */
export interface Cue {
  /** How strongly it breathes fire, from 0 to 1, and how far its throat glows before it does. */
  fire: number;
  charge: number;
  /** A roll about its line of flight, in radians, on top of its bank. */
  roll: number;
  /** Where it is in a wingbeat that it has been told to make: 0 if none. */
  beat: number;
  /** How much it sits: 0 flying, towards 1 as it flares, lands and folds its wings. */
  sit: number;
}

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

/** How one pilot differs from another of the same kind, so that two of a kind never fly as one. */
export interface PilotOptions {
  /** Where in its own slow rhythms it starts: rocking on the air, looking about, and how its wings give to the air. */
  phase?: number;
  /** How far its head turns into a turn ahead of its body: 0.5, and a leader looks further. */
  lead?: number;
  /** How much sooner than its kind it beats again: 1, and less for one that has to hold a place beside another. */
  keen?: number;
  /** The seed of its own run of chance, for when it beats. */
  seed?: number;
  /** Seconds before it first beats of its own accord. */
  firstBeat?: number;
}

/** A dragon's manner of flight with every setting given: what its kind leaves out is as Westeros's three fly. */
function manner(f: DragonFlight): Required<DragonFlight> {
  return { beat: f.beat, answer: f.answer, bank: f.bank ?? 78, glide: f.glide ?? 1, stroke: f.stroke ?? 1, heave: f.heave ?? 1, rock: f.rock ?? 1, look: f.look ?? 1, sway: f.sway ?? 1, swayRate: f.swayRate ?? 1, snake: f.snake ?? 0 };
}

const blankWing = (): WingPose => ({ sweep: 0, lift: 0, hand: 0, fan: 1, tip: 0 });

// scratch, shared by every pilot, so that a frame makes nothing new
const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), q0 = new THREE.Vector3(), q2 = new THREE.Vector3();
const vel = new THREE.Vector3(), acc = new THREE.Vector3(), fwd = new THREE.Vector3(), level = new THREE.Vector3(), up = new THREE.Vector3(), right = new THREE.Vector3(), ahead = new THREE.Vector3();
const m4 = new THREE.Matrix4(), euler = new THREE.Euler(), perch = new THREE.Quaternion(), nod = new THREE.Quaternion();

export class Pilot {
  readonly dragon: Dragon;
  /** The pose it was last given. */
  readonly pose: Pose;
  /** What it is told to do just now: the tile fills this in before each `fly`. */
  readonly cue: Cue = { fire: 0, charge: 0, roll: 0, beat: 0, sit: 0 };
  /** How fast it flies and which way, in units a second. */
  readonly vel = new THREE.Vector3();
  /** What is to its right, carried from frame to frame so that it never flips in a climb. */
  readonly right = new THREE.Vector3(1, 0, 0);
  /** How far it is banked to its right, in radians. */
  bank = 0;
  /** The speed its wings are shaped for: it follows its real speed with a little lag. */
  shaped = 30;
  /** A wingbeat of its own, how many more follow it at once, how deep they are, and how long until the next. */
  beat = 0;
  more = 0;
  deep = 1;
  untilBeat: number;
  /** How far its body is lifted by its wings just now: up on the downstroke, down on the upstroke. */
  heave = 0;
  /** How strongly its wing tips draw their ribbons just now. */
  ribbon = 0;
  neckYaw = 0;
  neckPitch = 0;

  private readonly f: Required<DragonFlight>;
  private readonly phase: number;
  private readonly lead: number;
  private readonly keen: number;
  /** Its own run of chance, for when it beats its wings. */
  private readonly chance: () => number;

  constructor(dragon: Dragon, o: PilotOptions = {}) {
    this.dragon = dragon;
    this.f = manner(dragon.kind.flight);
    this.phase = o.phase ?? 0;
    this.lead = o.lead ?? 0.5;
    this.keen = o.keen ?? 1;
    this.chance = rng(o.seed ?? 4711);
    this.untilBeat = o.firstBeat ?? 0.8;
    this.pose = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), speed: 30, time: 0, neckYaw: 0, neckPitch: 0, arch: 0, right: blankWing(), left: blankWing(), jaw: 0, legs: 0, fin: 0, sit: 0, brace: 0, floor: 0 };
  }

  /** Sets its wings: by its speed, by how far it is through landing, and by where it is in a beat and how deep the beat is. */
  wings(speed: number, sit: number, beat: number, deep = 1): void {
    const p = this.pose;
    const flying = formAt(speed);
    const form = sit <= 0 ? flying : sit < 0.5 ? blendForm(flying, FLARE, sit * 2) : blendForm(FLARE, FOLDED, (sit - 0.5) * 2);
    const m = this.dragon.measures;
    wingPose(form, sit > 0.5 ? 0 : beat, p.right, deep, m);
    wingPose(form, sit > 0.5 ? 0 : beat, p.left, deep, m);
  }

  /**
   * Stands it still, to be looked at, and writes its mesh. `ground` says how high the ground is under a place.
   * Its fire, if `h.fire` asks for it, is the tile's to draw, from its mouth.
   */
  hold(h: Held, time: number, ground: (x: number, z: number) => number): void {
    const d = this.dragon, p = this.pose, sit = h.sit ?? 0;
    // how far its feet are down, and how far it has come down onto its wing claws
    const land = Math.min(1, sit * 2), down = Math.max(0, sit * 2 - 1), stn = stance(down, d.measures);
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
    p.floor = sit > 0 ? h.y : ground(h.x, h.z);
    p.jaw = h.jaw ?? (h.fire ? 1 : 0);
    p.fin = ((h.bank ?? 0) * RAD) / 4;
    this.wings(p.speed, sit, h.beat ?? 0);
    d.pose(p, ground);
    d.throat.set(d.kind.glow).multiplyScalar(p.jaw * 2.2);
    this.vel.set(0, 0, 0);
  }

  /**
   * Flies it for one frame, and writes its mesh. `at(t, out)` says where it is at a time on the clock the tile
   * flies it by, and `clock` is that clock now; `time` is the city's own, which its tail and its wings' give to the
   * air go by. `floorAt` says how high what it would stand on is under a place, where it lands; `ground` how high
   * the ground is, for its shadow. Fill in `cue` first.
   */
  fly(at: (t: number, out: THREE.Vector3) => THREE.Vector3, clock: number, time: number, dt: number, floorAt: (p: THREE.Vector3) => number, ground: (x: number, z: number) => number): void {
    const d = this.dragon, p = this.pose, cue = this.cue, f = this.f, ph = this.phase;
    // where it is, how fast it goes and how hard it turns: from where it was and where it will be
    at(clock - 0.05, p0);
    at(clock, p1);
    at(clock + 0.05, p2);
    at(clock - 0.14, q0);
    at(clock + 0.14, q2);
    vel.subVectors(p2, p0).multiplyScalar(1 / 0.1);
    acc.copy(q2).add(q0).addScaledVector(p1, -2).multiplyScalar(1 / (0.14 * 0.14));
    const speed = vel.length();
    this.vel.copy(vel);
    if (speed > 0.4) fwd.copy(vel).multiplyScalar(1 / speed);
    else fwd.set(1, 0, 0).applyQuaternion(p.quat);

    // what is to its right: carried along, and drawn level again where it flies level
    const r = this.right;
    r.addScaledVector(fwd, -r.dot(fwd));
    if (r.lengthSq() < 1e-6) r.crossVectors(fwd, UP);
    r.normalize();
    const flat = 1 - Math.abs(fwd.y);
    if (flat > 0.1) {
      level.crossVectors(fwd, UP).normalize();
      r.lerp(level, ease(dt, 7 * flat * flat)).normalize();
    }
    // the bank: into the turn, by how hard it turns at its speed, and never more than its kind banks
    const want = flat > 0.1 ? THREE.MathUtils.clamp(Math.atan2(acc.dot(level), 13) * Math.min(1, flat * 1.6), -f.bank * RAD, f.bank * RAD) : 0;
    // each answers a turn at its own pace, and rocks a little on the air even where it flies straight
    const rock = 0.035 * f.rock * Math.sin(clock * (0.9 + 0.23 * ph) + 2.1 * ph);
    this.bank += (want + rock - this.bank) * ease(dt, f.answer);
    const tilt = this.bank + cue.roll;
    up.crossVectors(r, fwd).normalize();
    right.copy(r).multiplyScalar(Math.cos(tilt)).addScaledVector(up, -Math.sin(tilt));
    up.multiplyScalar(Math.cos(tilt)).addScaledVector(r, Math.sin(tilt));
    p.quat.setFromRotationMatrix(m4.makeBasis(fwd, up, right));
    p.pos.copy(p1);

    // Landing: it rears back as it flares, its feet come down, and then it comes down onto the claws of its wings.
    // The place it lands on is the ground under its feet, so the root of its neck is carried that much above its line.
    const land = Math.min(1, cue.sit * 2), down = Math.max(0, cue.sit * 2 - 1);
    if (cue.sit > 0) {
      const heading = Math.atan2(fwd.z, fwd.x), stn = stance(down, d.measures);
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
    p.floor = floorAt(p1);

    // its head turns into a turn a moment before its body does
    at(clock + 0.4, ahead);
    ahead.sub(p2).normalize();
    const yaw = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(ahead.dot(right), -1, 1)) * this.lead, -0.5, 0.5);
    const pitch = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(ahead.dot(up), -1, 1)) * 0.6, -0.3, 0.3);
    this.neckYaw += (yaw * (1 - p.sit) - this.neckYaw) * ease(dt, 5);
    this.neckPitch += (pitch * (1 - p.sit) - this.neckPitch) * ease(dt, 5);
    // and now and then it looks about, each on its own, but not while its throat glows to breathe fire
    const about = (1 - p.sit) * (1 - cue.charge);
    p.neckYaw = this.neckYaw + p.sit * 0.5 * Math.sin(time * 0.5 + ph) + about * f.look * (0.13 * Math.sin(clock * (0.61 + 0.11 * ph) + 1.9 * ph) + 0.05 * Math.sin(clock * 1.37 + 0.7 * ph));
    p.neckPitch = this.neckPitch + about * f.look * 0.06 * Math.sin(clock * (0.43 + 0.09 * ph) + 2.6 * ph);
    p.fin = this.bank / 4;

    // Its wings: shaped by its speed, with a little lag, and beaten as a great bird beats them. It beats when
    // it has to work: without a pause while it climbs, two or three beats and then a glide while it cruises,
    // one shallow flick now and then when it is fast, and not at all when it comes down or dives.
    this.shaped += (speed - this.shaped) * ease(dt, 2.2);
    let beat = cue.beat, deep = 1;
    if (beat <= 0) {
      if (this.beat > 0) {
        this.beat += dt / f.beat;
        if (this.beat >= 1) {
          this.more -= 1;
          this.beat = this.more > 0 ? 0.0001 : 0;
        }
      } else if (cue.sit <= 0 && cue.roll === 0 && vel.y > -7 && this.shaped < 50) {
        this.untilBeat -= dt;
        if (this.untilBeat <= 0) {
          const chance = this.chance, climbing = vel.y > 5, fast = this.shaped > 36;
          this.beat = 0.0001;
          this.more = climbing ? 2 + Math.floor(chance() * 2) : fast ? 1 : 1 + Math.floor(chance() * 2.6);
          this.deep = (fast && !climbing ? 0.55 : 1) * f.stroke;
          // how long it glides before it beats again: as long as its kind glides, and sooner if it holds a place
          this.untilBeat = (climbing ? 0.25 + 0.4 * chance() : fast ? 2.6 + 1.9 * chance() : 1.6 + 1.8 * chance()) * this.keen * f.glide;
        }
      }
      beat = this.beat;
      deep = this.deep;
    } else {
      this.beat = 0;
      this.more = 0;
    }
    this.wings(this.shaped, cue.sit, beat, deep);

    if (cue.sit <= 0) {
      // In a turn the wing on the inside is drawn in a little and the one on the outside reaches.
      const tuck = Math.min(1, Math.abs(this.bank) / (70 * RAD)) * 0.5, inner = this.bank > 0 ? p.right : p.left, outer = this.bank > 0 ? p.left : p.right;
      inner.sweep += 0.1 * tuck; inner.hand += 0.14 * tuck; inner.fan -= 0.06 * tuck; inner.lift += 0.05 * tuck;
      outer.hand = Math.max(0.03, outer.hand - 0.05 * tuck); outer.tip += 0.04 * tuck;
      // And a wing is never quite still in a glide: it gives a little to the air, each wing in its own time.
      p.right.lift += 0.035 * Math.sin(time * 1.15 + ph * 2.1);
      p.left.lift += 0.035 * Math.sin(time * 1.15 + ph * 2.1 + 0.7);
      p.right.tip += 0.03 * Math.sin(time * 0.8 + ph * 1.3);
      p.left.tip += 0.03 * Math.sin(time * 0.8 + ph * 1.3 + 1.1);
    }

    // Its body rides its wings: lifted through the downstroke and let down through the upstroke, its nose
    // with it. Its neck gives the other way, so that its head stays steadier than its chest, and its tail
    // follows a moment later, as it follows every turn.
    const riding = beat > 0 ? Math.sin(Math.PI * 2 * (beat - 0.12)) * deep * Math.min(1, beat / 0.1, (1 - beat) / 0.12) : 0;
    this.heave += (riding * (1 - land) - this.heave) * ease(dt, 14);
    p.pos.addScaledVector(up, this.heave * 0.034 * f.heave * d.kind.length);
    p.quat.multiply(nod.setFromAxisAngle(Z, this.heave * 0.045 * f.heave));
    p.neckPitch -= this.heave * 0.032 * f.heave;

    p.jaw = Math.max(cue.fire, cue.charge * 0.45);
    d.pose(p, ground);
    d.throat.set(d.kind.glow).multiplyScalar(cue.charge * 1.5 + cue.fire * 1.6);
    d.lit.set(d.kind.glow).multiplyScalar(cue.fire * 0.3);
  }

  /**
   * How strongly its wing tips draw their ribbons this frame, from 0 to 1: in a hard turn or at speed, never while
   * it beats or lands, and coming back a moment after a beat. `held` is whether it is being held still; `more`
   * makes them stronger, as cold air does.
   */
  ribbons(dt: number, held: boolean, more = 1): number {
    const hard = held ? 0 : Math.max(THREE.MathUtils.smoothstep(Math.abs(this.bank) / RAD, 42, 62), THREE.MathUtils.smoothstep(this.shaped, 38, 46)) * more * (this.cue.sit > 0 ? 0 : 1);
    // a wing that beats draws no ribbon: the ribbon is what a still wing leaves, and it comes back a moment after the beat
    const still = (this.cue.beat || this.beat) > 0 ? 0 : hard;
    this.ribbon += (still - this.ribbon) * (1 - Math.exp(-dt * (still < this.ribbon ? 22 : 3.5)));
    return this.ribbon;
  }

  /** Its eyes show by day and burn at night; its shadow is paler the higher it is, and gone by night. */
  light(night: number): void {
    const d = this.dragon;
    d.eye.set(d.kind.eye).multiplyScalar(0.6 + 2.2 * night);
    d.shadowMat.opacity = 0.32 * (1 - night) * Math.max(0.3, 1 - this.pose.pos.y / 150);
  }
}
