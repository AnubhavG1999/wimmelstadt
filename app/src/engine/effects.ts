// What a hero leaves behind it and shows: smoke, flame, sparks, the flash of
// its lamps, the glow of its brakes, the marks of its tyres and ribbons in the
// air. Plain traffic has none of them, so that a hero shows itself by what it
// does as well as by its detail.
//
// All are made of a few solid shapes, like everything else in the city: smoke
// is puffs of cotton wool that swell, drift up and shrink away, a flame is a
// few stretched boxes that cool from pale blue to orange, and a lit lamp is a
// bright slab over the lamp itself, with its light thrown on the road ahead.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

interface Puff { p: THREE.Vector3; v: THREE.Vector3; age: number; life: number; size: number; shade: number; turn: number; jet: boolean }

/** Smoke: from an exhaust, or from tyres that are spinning. */
export class Smoke {
  readonly mesh: THREE.InstancedMesh;
  private readonly puffs: Puff[] = [];
  private readonly room: number;
  private readonly m4 = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly s = new THREE.Vector3();
  private readonly col = new THREE.Color();
  private readonly up = new THREE.Vector3(0, 1, 0);

  /** `material` is one of the tile's own, so that the smoke is lit as the tile is. */
  constructor(material: THREE.Material, room = 220) {
    this.room = room;
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), material, room);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.setColorAt(0, this.col.set(0xffffff));
  }

  /**
   * One puff at `at`, drifting with `drift`. `size` is how large it grows, and
   * `shade` how light it is: 1 is the white of tyre smoke, 0.8 the grey of an exhaust.
   */
  puff(at: THREE.Vector3, drift: THREE.Vector3, size: number, shade: number): void {
    if (this.puffs.length >= this.room) return;
    this.puffs.push({
      p: at.clone(),
      v: drift.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.6, 0.9 + Math.random() * 1.3, (Math.random() - 0.5) * 1.6)),
      age: 0,
      life: 0.75 + Math.random() * 0.6 + size * 0.35,
      size: size * (0.75 + Math.random() * 0.5),
      shade: shade * (0.94 + Math.random() * 0.08),
      turn: Math.random() * Math.PI * 2,
      jet: false,
    });
  }

  /**
   * One puff of a jet of vapour at `at`, shot out with `speed`. It keeps its
   * speed, widens as it goes and is gone in a moment, so that a stream of them
   * is a plume that stays with whatever it comes from.
   */
  jet(at: THREE.Vector3, speed: THREE.Vector3, size: number): void {
    if (this.puffs.length >= this.room) return;
    this.puffs.push({
      p: at.clone(),
      v: speed.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.9)),
      age: 0,
      life: 0.3 + Math.random() * 0.16,
      size,
      shade: 0.97 + Math.random() * 0.03,
      turn: Math.random() * Math.PI * 2,
      jet: true,
    });
  }

  update(dt: number): void {
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      this.puffs[i].age += dt;
      if (this.puffs[i].age >= this.puffs[i].life) this.puffs.splice(i, 1);
    }
    this.puffs.forEach((f, n) => {
      f.p.addScaledVector(f.v, dt);
      const t = f.age / f.life;
      let size: number;
      if (f.jet) {
        // a jet widens all the way out, and is gone
        size = f.size * (t < 0.8 ? 0.45 + 0.95 * t : 1.21 * (1 - (t - 0.8) / 0.2));
      } else {
        // it loses its push quickly and then only rises
        const slow = Math.max(0, 1 - dt * 2.4);
        f.v.x *= slow;
        f.v.z *= slow;
        // it swells in the first third of its life and thins away over the rest
        size = f.size * (t < 0.33 ? 0.35 + (0.65 * t) / 0.33 : 1 - ((t - 0.33) / 0.67) ** 1.6);
      }
      this.q.setFromAxisAngle(this.up, f.turn + f.age * 0.8);
      this.m4.compose(f.p, this.q, this.s.set(size, size * 0.86, size));
      this.mesh.setMatrixAt(n, this.m4);
      this.mesh.setColorAt(n, this.col.setScalar(f.shade));
    });
    this.mesh.count = this.puffs.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

interface Tongue { p: THREE.Vector3; v: THREE.Vector3; up: THREE.Vector3; age: number; life: number; size: number; blue: boolean; jet: boolean }

/** Flame at an exhaust. */
export class Flames {
  readonly mesh: THREE.InstancedMesh;
  private readonly mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  private readonly tongues: Tongue[] = [];
  private readonly room: number;
  private readonly m4 = new THREE.Matrix4();
  private readonly dir = new THREE.Vector3();
  private readonly side = new THREE.Vector3();
  private readonly up2 = new THREE.Vector3();
  private readonly col = new THREE.Color();

  constructor(room = 480) {
    this.room = room;
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.mat, room);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.setColorAt(0, this.col.set(0xffffff));
  }

  /**
   * One tongue of flame at `at`, on something that moves with `carry`. It
   * shoots along `back`, so that it stays at the tail of what it came from.
   * An ordinary flame is a burst, thickest at the pipe. With a `reach`, in
   * units, it is a jet: every tongue goes about that far.
   */
  tongue(at: THREE.Vector3, back: THREE.Vector3, up: THREE.Vector3, carry: THREE.Vector3, strength: number, blue = false, reach = 0): void {
    if (this.tongues.length >= this.room) return;
    const life = reach > 0 ? 0.26 + Math.random() * 0.1 : 0.1 + Math.random() * 0.1 + strength * 0.08;
    const speed = reach > 0 ? ((0.72 + 0.28 * Math.random()) * reach) / 0.36 : 2.5 + Math.random() * 5.5 * (0.4 + strength);
    this.tongues.push({
      p: at.clone(),
      v: carry.clone().addScaledVector(back, speed).addScaledVector(up, Math.random() * 0.9),
      up: up.clone(),
      age: 0,
      life,
      size: (0.2 + Math.random() * 0.16) * (0.65 + strength * 0.6),
      blue,
      jet: reach > 0,
    });
  }

  update(dt: number, night: number): void {
    for (let i = this.tongues.length - 1; i >= 0; i--) {
      this.tongues[i].age += dt;
      if (this.tongues[i].age >= this.tongues[i].life) this.tongues.splice(i, 1);
    }
    this.tongues.forEach((f, n) => {
      f.p.addScaledVector(f.v, dt);
      const t = f.age / f.life;
      // a burst thins to a fifth by its end, a jet only to half
      const s = f.size * (t < 0.25 ? 0.6 + t * 1.6 : 1 - ((t - 0.25) / 0.75) * (f.jet ? 0.5 : 0.8));
      this.dir.copy(f.v).normalize();
      this.side.crossVectors(this.dir, f.up);
      if (this.side.lengthSq() < 1e-6) this.side.set(0, 0, 1);
      this.side.normalize();
      this.up2.crossVectors(this.side, this.dir).normalize();
      this.m4.makeBasis(this.dir.multiplyScalar(s * 3.2), this.up2.multiplyScalar(s), this.side.multiplyScalar(s)).setPosition(f.p);
      this.mesh.setMatrixAt(n, this.m4);
      if (f.blue) {
        // a blue flame is nearly white where it leaves the pipe, and blue all the way out
        if (t < 0.3) this.col.setRGB(0.82, 0.94, 1.0);
        else if (t < 0.65) this.col.setRGB(0.32, 0.64, 1.0);
        else this.col.setRGB(0.14, 0.34, 0.98);
      } else if (t < 0.22) this.col.setRGB(0.62, 0.8, 1.0); // pale blue where it leaves the pipe, then yellow, then orange
      else if (t < 0.55) this.col.setRGB(1.0, 0.74, 0.2);
      else this.col.setRGB(1.0, 0.36, 0.06);
      this.mesh.setColorAt(n, this.col);
    });
    this.mesh.count = this.tongues.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    // by day a flame is only bright; at night it glows
    this.mat.color.setScalar(1.0 + 2.6 * night);
  }
}

/** Lamps that are lit for an instant: the flash of a hero that wants to get by. */
export class Lamps {
  readonly mesh: THREE.InstancedMesh;
  /** The light they throw on the road ahead, which is seen from behind the hero as well. */
  readonly beams: THREE.InstancedMesh;
  /** A glow on the road under a hero and round it. */
  readonly glows: THREE.InstancedMesh;
  private readonly mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  private readonly beamMat: THREE.MeshBasicMaterial;
  private readonly glowMat: THREE.MeshBasicMaterial;
  private thrown = 0;
  private glowing = 0;
  private readonly room: number;
  private readonly m4 = new THREE.Matrix4();
  private readonly x = new THREE.Vector3();
  private readonly y = new THREE.Vector3();
  private readonly z = new THREE.Vector3();
  private readonly col = new THREE.Color();
  private lit = 0;

  /** `beam` is the picture of a beam on the road: bright at the lamps, fanning out and fading. `round` is a round patch that fades to its edge. */
  constructor(beam: THREE.Texture, round: THREE.Texture, room = 96) {
    this.room = room;
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.mat, room);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.setColorAt(0, this.col.set(0xffffff));
    // Light is added to what lies under it. The haze of distance is left out of it, or it
    // would be added too, and show as a pale square round the light.
    this.beamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: beam, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    this.beams = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.beamMat, room / 2);
    this.beams.count = 0;
    this.beams.frustumCulled = false;
    this.beams.layers.set(1); // kept out of the mirror image used for wet streets, as the beams of the traffic are
    this.beams.renderOrder = 2;
    this.beams.setColorAt(0, this.col.set(0xffffff));
    this.glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: round, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    this.glows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.glowMat, room / 2);
    this.glows.count = 0;
    this.glows.frustumCulled = false;
    this.glows.layers.set(1);
    this.glows.renderOrder = 2;
    this.glows.setColorAt(0, this.col.set(0xffffff));
  }

  /** Before the heroes are gone through: nothing is lit yet on this frame. */
  begin(): void {
    this.lit = 0;
    this.thrown = 0;
    this.glowing = 0;
  }

  /** A glow on the road under one hero, on this frame. `place` lays a square flat on the road there; `strength` is from 0 to 1. */
  glow(place: THREE.Matrix4, colour: number, strength: number): void {
    if (this.glowing >= this.room / 2) return;
    this.glows.setMatrixAt(this.glowing, place);
    this.glows.setColorAt(this.glowing, this.col.set(colour).multiplyScalar(Math.min(1, Math.max(0, strength))));
    this.glowing++;
  }

  /** The light of one hero's lamps on the road ahead of it, on this frame. `place` lays a square flat on the road there. */
  beam(place: THREE.Matrix4, colour: number): void {
    if (this.thrown >= this.room / 2) return;
    this.beams.setMatrixAt(this.thrown, place);
    this.beams.setColorAt(this.thrown, this.col.set(colour));
    this.thrown++;
  }

  /** One lamp, lit on this frame: a slab `wide` across, at `at`, on something whose nose points along `fwd`. */
  lamp(at: THREE.Vector3, fwd: THREE.Vector3, up: THREE.Vector3, right: THREE.Vector3, wide: number, colour: number): void {
    if (this.lit >= this.room) return;
    this.m4.makeBasis(this.x.copy(fwd).multiplyScalar(wide * 0.7), this.y.copy(up).multiplyScalar(wide * 0.42), this.z.copy(right).multiplyScalar(wide)).setPosition(at);
    this.mesh.setMatrixAt(this.lit, this.m4);
    this.mesh.setColorAt(this.lit, this.col.set(colour));
    this.lit++;
  }

  /** After the heroes: shows what was lit. By day a lamp is only bright; at night it glows. */
  update(night: number): void {
    this.mesh.count = this.lit;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.mat.color.setScalar(1.25 + 2.2 * night);
    this.beams.count = this.thrown;
    this.beams.instanceMatrix.needsUpdate = true;
    if (this.beams.instanceColor) this.beams.instanceColor.needsUpdate = true;
    this.beamMat.opacity = 0.5 + 0.35 * night;
    this.glows.count = this.glowing;
    this.glows.instanceMatrix.needsUpdate = true;
    if (this.glows.instanceColor) this.glows.instanceColor.needsUpdate = true;
    this.glowMat.opacity = 0.6 + 0.4 * night;
  }
}

interface Spark { p: THREE.Vector3; v: THREE.Vector3; age: number; life: number; size: number; floor: number }

/** Sparks: what a splitter throws when it touches the road, and what flies from under a car that lands hard. */
export class Sparks {
  readonly mesh: THREE.InstancedMesh;
  private readonly mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  private readonly sparks: Spark[] = [];
  private readonly room: number;
  private readonly m4 = new THREE.Matrix4();
  private readonly dir = new THREE.Vector3();
  private readonly side = new THREE.Vector3();
  private readonly up2 = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly col = new THREE.Color();

  constructor(room = 420) {
    this.room = room;
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.mat, room);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.setColorAt(0, this.col.set(0xffffff));
  }

  /**
   * One spark at `at`, thrown along `back` from something that moves with
   * `carry`. It falls, bounces and goes out. A `low` one skims the road and
   * sprays out to the sides, as from a splitter; the others fly up, as from
   * under a car that lands.
   */
  spark(at: THREE.Vector3, back: THREE.Vector3, carry: THREE.Vector3, strength: number, low: boolean): void {
    if (this.sparks.length >= this.room) return;
    const v = carry.clone().multiplyScalar(low ? 0.35 : 0.55).addScaledVector(back, 2 + Math.random() * 8 * (0.5 + strength));
    const out = low ? 16 : 10;
    v.x += (Math.random() - 0.5) * out;
    v.z += (Math.random() - 0.5) * out;
    v.y += low ? 0.6 + Math.random() * 2.6 : 3 + Math.random() * 9 * (0.5 + strength);
    this.sparks.push({ p: at.clone(), v, age: 0, life: 0.35 + Math.random() * 0.6, size: 0.11 + Math.random() * 0.1, floor: at.y });
  }

  update(dt: number, night: number): void {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      this.sparks[i].age += dt;
      if (this.sparks[i].age >= this.sparks[i].life) this.sparks.splice(i, 1);
    }
    this.sparks.forEach((f, n) => {
      f.v.y -= 30 * dt;
      f.p.addScaledVector(f.v, dt);
      if (f.p.y < f.floor && f.v.y < 0) {
        f.p.y = f.floor;
        f.v.y *= -0.4;
        f.v.x *= 0.7;
        f.v.z *= 0.7;
      }
      const speed = f.v.length();
      this.dir.copy(f.v).multiplyScalar(1 / Math.max(speed, 1e-3));
      this.side.crossVectors(this.dir, this.up);
      if (this.side.lengthSq() < 1e-6) this.side.set(0, 0, 1);
      this.side.normalize();
      this.up2.crossVectors(this.side, this.dir).normalize();
      const t = f.age / f.life, s = f.size * (1 - t * 0.6);
      // a streak along the way it flies, longer the faster it goes
      this.m4.makeBasis(this.dir.multiplyScalar(s * (2 + speed * 0.22)), this.up2.multiplyScalar(s), this.side.multiplyScalar(s)).setPosition(f.p);
      this.mesh.setMatrixAt(n, this.m4);
      // white as it leaves, then yellow, then orange
      if (t < 0.3) this.col.setRGB(1.0, 0.96, 0.78);
      else if (t < 0.7) this.col.setRGB(1.0, 0.72, 0.24);
      else this.col.setRGB(1.0, 0.4, 0.08);
      this.mesh.setColorAt(n, this.col);
    });
    this.mesh.count = this.sparks.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.mat.color.setScalar(1.3 + 2.4 * night);
  }
}

/** Brake discs that glow: a disc that has been worked hard is seen through its wheel, dull red and then orange. */
export class Discs {
  readonly mesh: THREE.InstancedMesh;
  private readonly mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  private readonly room: number;
  private readonly m4 = new THREE.Matrix4();
  private readonly x = new THREE.Vector3();
  private readonly y = new THREE.Vector3();
  private readonly z = new THREE.Vector3();
  private readonly col = new THREE.Color();
  private lit = 0;

  constructor(room = 96) {
    this.room = room;
    // a disc that faces along z, which is across whatever carries it
    this.mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 14).rotateX(Math.PI / 2), this.mat, room);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.setColorAt(0, this.col.set(0xffffff));
  }

  /** Before the heroes are gone through: nothing glows yet on this frame. */
  begin(): void {
    this.lit = 0;
  }

  /** One disc, glowing on this frame: at `at`, `radius` across, on something whose nose points along `fwd`. `heat` is from 0 to 1. */
  disc(at: THREE.Vector3, fwd: THREE.Vector3, up: THREE.Vector3, right: THREE.Vector3, radius: number, heat: number): void {
    if (this.lit >= this.room) return;
    this.m4.makeBasis(this.x.copy(fwd).multiplyScalar(radius), this.y.copy(up).multiplyScalar(radius), this.z.copy(right).multiplyScalar(0.1)).setPosition(at);
    this.mesh.setMatrixAt(this.lit, this.m4);
    const h = Math.min(1, Math.max(0, heat));
    // dull red, then orange: never the yellow of a lamp
    if (h < 0.5) this.col.setRGB(0.4 + 1.1 * h, 0.04 + 0.44 * h, 0.02 + 0.04 * h);
    else this.col.setRGB(0.95 + 0.1 * (h - 0.5), 0.26 + 0.4 * (h - 0.5), 0.04 + 0.12 * (h - 0.5));
    this.mesh.setColorAt(this.lit, this.col);
    this.lit++;
  }

  /** After the heroes: shows what glows. By day it is a dull glow; at night it is bright. */
  update(night: number): void {
    this.mesh.count = this.lit;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.mat.color.setScalar(1.0 + 2.2 * night);
  }
}

/**
 * Strips laid where something has been: the black marks of tyres on the road,
 * and ribbons drawn through the air. Each lasts a while and then fades away.
 * When there is no more room, the oldest goes.
 */
export class Strips {
  readonly mesh: THREE.InstancedMesh;
  private readonly fade: THREE.InstancedBufferAttribute;
  private readonly born: Float32Array;
  private readonly life: Float32Array;
  private readonly room: number;
  private readonly hold: number;
  private next = 0;
  private used = 0;
  private clock = 0;
  private readonly m4 = new THREE.Matrix4();
  private readonly x = new THREE.Vector3();
  private readonly z = new THREE.Vector3();
  private readonly mid = new THREE.Vector3();
  private readonly col = new THREE.Color();

  /**
   * `onRoad` strips lie on the road as a shadow does; the others hang in the
   * air. `hold` is the share of its life that a strip stays whole before it
   * begins to fade.
   */
  constructor(room: number, opacity: number, onRoad: boolean, hold: number) {
    this.room = room;
    this.hold = hold;
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.fade = new THREE.InstancedBufferAttribute(new Float32Array(room), 1);
    this.fade.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aFade', this.fade);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
      polygonOffset: onRoad, polygonOffsetFactor: -2.5, polygonOffsetUnits: -2.5,
    });
    // every strip fades by itself
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aFade;\nvarying float vFade;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = aFade;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vFade;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vFade;');
    };
    mat.customProgramCacheKey = () => 'wimmelstadt-strips';
    this.mesh = new THREE.InstancedMesh(geo, mat, room);
    this.mesh.count = 0;
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
    this.mesh.setColorAt(0, this.col.set(0xffffff));
    if (onRoad) {
      this.mesh.layers.set(1); // kept out of the mirror image used for wet streets, as shadows are
      this.mesh.renderOrder = 2;
    }
    this.born = new Float32Array(room);
    this.life = new Float32Array(room);
  }

  /** One strip from `a` to `b`, `wide` across, lying flat to `up`, which lasts `life` seconds. */
  add(a: THREE.Vector3, b: THREE.Vector3, up: THREE.Vector3, wide: number, colour: number, life: number): void {
    this.x.subVectors(b, a);
    this.z.crossVectors(this.x, up);
    if (this.z.lengthSq() < 1e-8) return;
    this.z.normalize().multiplyScalar(wide);
    const i = this.next;
    this.next = (this.next + 1) % this.room;
    this.used = Math.min(this.room, this.used + 1);
    this.m4.makeBasis(this.x, up, this.z).setPosition(this.mid.addVectors(a, b).multiplyScalar(0.5));
    this.mesh.setMatrixAt(i, this.m4);
    this.mesh.setColorAt(i, this.col.set(colour));
    this.born[i] = this.clock;
    this.life[i] = life;
    this.fade.setX(i, 1);
    this.mesh.count = this.used;
    this.mesh.visible = true;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    this.clock += dt;
    if (!this.mesh.visible) return;
    let any = false;
    for (let i = 0; i < this.used; i++) {
      const left = 1 - (this.clock - this.born[i]) / this.life[i];
      const f = left <= 0 ? 0 : Math.min(1, left / (1 - this.hold));
      if (f > 0) any = true;
      this.fade.setX(i, f);
    }
    this.fade.needsUpdate = true;
    this.mesh.visible = any;
  }
}

interface Bulb { p: THREE.Vector3; q: THREE.Quaternion; age: number; life: number; size: number; floor: number }

/** A sparkle: three thin spikes that cross in the middle, so that it is a star from wherever it is seen. */
function sparkle(): THREE.BufferGeometry {
  const spikes = [[1, 0.15, 0.15], [0.15, 1, 0.15], [0.15, 0.15, 1]].map(([x, y, z]) => new THREE.OctahedronGeometry(1, 0).scale(x, y, z));
  return mergeGeometries(spikes);
}

/** Flashbulbs: the cameras of whoever stands on the pavement as something worth a picture goes by. */
export class Bulbs {
  readonly mesh: THREE.InstancedMesh;
  private readonly mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  private readonly bulbs: Bulb[] = [];
  private readonly room: number;
  private readonly m4 = new THREE.Matrix4();
  private readonly turn = new THREE.Euler();
  private readonly s = new THREE.Vector3();
  private readonly col = new THREE.Color();

  constructor(room = 64) {
    this.room = room;
    this.mesh = new THREE.InstancedMesh(sparkle(), this.mat, room);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.setColorAt(0, this.col.set(0xffffff));
  }

  /** One flash, at `at`, over ground that is `floor` high. It is over in a fifth of a second. */
  flash(at: THREE.Vector3, floor: number): void {
    if (this.bulbs.length >= this.room) return;
    // each is turned its own way
    const q = new THREE.Quaternion().setFromEuler(this.turn.set(Math.random() * 0.7, Math.random() * Math.PI, Math.random() * 0.7));
    this.bulbs.push({ p: at.clone(), q, age: 0, life: 0.15 + Math.random() * 0.08, size: 1.0 + Math.random() * 0.6, floor });
  }

  /** `light` lays the light of one flash on the ground: where, how wide, and how strong from 0 to 1. */
  update(dt: number, night: number, light: (x: number, y: number, z: number, wide: number, strength: number) => void): void {
    for (let i = this.bulbs.length - 1; i >= 0; i--) {
      this.bulbs[i].age += dt;
      if (this.bulbs[i].age >= this.bulbs[i].life) this.bulbs.splice(i, 1);
    }
    this.bulbs.forEach((f, n) => {
      const t = f.age / f.life;
      // it bursts out and is gone
      const size = f.size * (t < 0.25 ? 0.5 + 2 * t : 1 - (t - 0.25) / 0.75);
      light(f.p.x, f.floor, f.p.z, 9.5, Math.min(1, 1.6 * (1 - t)));
      this.m4.compose(f.p, f.q, this.s.setScalar(size));
      this.mesh.setMatrixAt(n, this.m4);
      this.mesh.setColorAt(n, this.col.setRGB(1, 1, 1));
    });
    this.mesh.count = this.bulbs.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.mat.color.setScalar(1.6 + 3 * night);
  }
}
