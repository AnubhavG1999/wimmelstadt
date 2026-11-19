// What a hero leaves in the air: smoke and flame. Plain traffic has neither, so
// that a hero shows itself by what it does as well as by its detail.
//
// Both are made of a few solid shapes, like everything else in the city: smoke
// is puffs of cotton wool that swell, drift up and shrink away, and a flame is
// a few stretched boxes at the tail that cool from pale blue to orange.

import * as THREE from 'three';

interface Puff { p: THREE.Vector3; v: THREE.Vector3; age: number; life: number; size: number; shade: number; turn: number }

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
    });
  }

  update(dt: number): void {
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      this.puffs[i].age += dt;
      if (this.puffs[i].age >= this.puffs[i].life) this.puffs.splice(i, 1);
    }
    this.puffs.forEach((f, n) => {
      f.p.addScaledVector(f.v, dt);
      // it loses its push quickly and then only rises
      const slow = Math.max(0, 1 - dt * 2.4);
      f.v.x *= slow;
      f.v.z *= slow;
      const t = f.age / f.life;
      // it swells in the first third of its life and thins away over the rest
      const size = f.size * (t < 0.33 ? 0.35 + (0.65 * t) / 0.33 : 1 - ((t - 0.33) / 0.67) ** 1.6);
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

interface Tongue { p: THREE.Vector3; v: THREE.Vector3; up: THREE.Vector3; age: number; life: number; size: number }

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

  constructor(room = 96) {
    this.room = room;
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.mat, room);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.setColorAt(0, this.col.set(0xffffff));
  }

  /**
   * One tongue of flame at `at`, on something that moves with `carry`. It
   * shoots along `back`, so that it stays at the tail of what it came from.
   */
  tongue(at: THREE.Vector3, back: THREE.Vector3, up: THREE.Vector3, carry: THREE.Vector3, strength: number): void {
    if (this.tongues.length >= this.room) return;
    this.tongues.push({
      p: at.clone(),
      v: carry.clone().addScaledVector(back, 2.5 + Math.random() * 5.5 * (0.4 + strength)).addScaledVector(up, Math.random() * 0.9),
      up: up.clone(),
      age: 0,
      life: 0.1 + Math.random() * 0.1 + strength * 0.08,
      size: (0.2 + Math.random() * 0.16) * (0.65 + strength * 0.6),
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
      const s = f.size * (t < 0.25 ? 0.6 + t * 1.6 : 1 - ((t - 0.25) / 0.75) * 0.8);
      this.dir.copy(f.v).normalize();
      this.side.crossVectors(this.dir, f.up);
      if (this.side.lengthSq() < 1e-6) this.side.set(0, 0, 1);
      this.side.normalize();
      this.up2.crossVectors(this.side, this.dir).normalize();
      this.m4.makeBasis(this.dir.multiplyScalar(s * 3.2), this.up2.multiplyScalar(s), this.side.multiplyScalar(s)).setPosition(f.p);
      this.mesh.setMatrixAt(n, this.m4);
      // pale blue where it leaves the pipe, then yellow, then orange
      if (t < 0.22) this.col.setRGB(0.62, 0.8, 1.0);
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
