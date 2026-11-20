// Dragon fire: a long narrow lance out of the jaws, made of flakes that stream
// along it and shrink away, in each dragon's own colours. Like the city's
// smoke and flame it is made of small solid shapes, so that it sits in the
// city's look.
//
// Fire harms nothing. Where it may go is the tile's to decide, not this file's.
// Each dragon's own flame is in its kind (`kinds.ts`).

import * as THREE from 'three';

type RGB = [number, number, number];

/** The colours of one dragon's flame: what its core is, what its edge is, and what flecks run through it, with how often. */
export interface Flame {
  core: RGB;
  edge: RGB;
  fleck: RGB;
  /** The share of flakes that are flecks, and the share that are core. */
  flecks: number;
  cores: number;
  /** Whether its core is dark: black fire does not shine. */
  dark?: boolean;
  /** How long the lance is, in units. */
  reach: number;
  /** How large its flakes are and how many it throws, against Drogon's: 1 unless this says otherwise. A great dragon's fire is a torrent. */
  size?: number;
  /** How wide it spreads as it goes, against Drogon's lance: 1 unless this says otherwise. A great dragon's fire billows. */
  spread?: number;
  /** The light it throws on the ground at night. */
  light: number;
}

interface Flake { p: THREE.Vector3; v: THREE.Vector3; carry: THREE.Vector3; age: number; life: number; size: number; color: RGB; dark: boolean }

/** The pool of light a lance throws on the ground at night is this wide for a flame of size 1. */
const POOL = 26;

export class Fire {
  /** The flakes. */
  readonly mesh: THREE.InstancedMesh;
  /** The pools of light a flame throws on the ground at night. */
  readonly pools: THREE.InstancedMesh;
  private readonly mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  private readonly poolMat: THREE.MeshBasicMaterial;
  private readonly flakes: Flake[] = [];
  private readonly room: number;
  private readonly lit: { x: number; y: number; z: number; color: THREE.Color; k: number; r: number }[] = [];
  private readonly poolRoom: number;
  private readonly m4 = new THREE.Matrix4();
  private readonly dir = new THREE.Vector3();
  private readonly side = new THREE.Vector3();
  private readonly up2 = new THREE.Vector3();
  private readonly col = new THREE.Color();
  /** How many flakes each dragon still owes the air, by its number. */
  private readonly owed: number[] = [];

  /** `room` is how many flakes there may be at once, and `pools` how many pools of light, one for each dragon breathing at once. */
  constructor(room = 620, pools = 3) {
    this.room = room;
    this.poolRoom = pools;
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.mat, room);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.setColorAt(0, this.col.set(0xffffff));
    this.mesh.name = 'dragon-fire';

    // a soft round patch of light, laid on the ground
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const ctx = cv.getContext('2d')!;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#8a8a8a'); g.addColorStop(1, '#000000');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(cv);
    this.poolMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    this.pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.poolMat, pools);
    this.pools.count = 0;
    this.pools.frustumCulled = false;
    this.pools.renderOrder = 2;
    this.pools.layers.set(1);
    this.pools.setColorAt(0, this.col.set(0xffffff));
    this.pools.name = 'dragon-fire-light';
  }

  /**
   * Breathes for one frame: from `at` along `dir`, from something that moves
   * with `carry`. `power` is how strongly, from 0 to 1. `ground` is how high
   * the ground is under the middle of the lance, or null where no light may fall.
   */
  breathe(who: number, at: THREE.Vector3, dir: THREE.Vector3, carry: THREE.Vector3, flame: Flame, power: number, dt: number, ground: number | null): void {
    const life = 0.4, speed = flame.reach / life, size = flame.size ?? 1;
    this.owed[who] = (this.owed[who] ?? 0) + 380 * size * power * dt;
    // what is up for the lance, so that flakes can be spread round it
    this.side.crossVectors(dir, Math.abs(dir.y) > 0.9 ? this.up2.set(1, 0, 0) : this.up2.set(0, 1, 0)).normalize();
    this.up2.crossVectors(this.side, dir).normalize();
    while (this.owed[who] >= 1) {
      this.owed[who] -= 1;
      if (this.flakes.length >= this.room) continue;
      const pick = Math.random();
      const core = pick < flame.cores, fleck = !core && pick < flame.cores + flame.flecks;
      // the core stays close to the middle of the lance; its edge spreads to 1.4 wide at the far end.
      // Black fire is black all through, and the red runs in it: its dark flakes spread as wide as the rest.
      const spread = (core && !flame.dark ? 0.02 : 0.07) * speed * (flame.spread ?? 1), a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
      const v = new THREE.Vector3().copy(dir).multiplyScalar(speed * (0.82 + Math.random() * 0.3))
        .addScaledVector(this.side, Math.cos(a) * r * spread).addScaledVector(this.up2, Math.sin(a) * r * spread);
      const back = Math.random() * dt;
      this.flakes.push({
        p: new THREE.Vector3().copy(at).addScaledVector(v, back).addScaledVector(carry, back),
        v, carry: carry.clone(), age: back, life: life * (0.8 + Math.random() * 0.35),
        size: (core ? 0.3 : 0.36) * (0.8 + Math.random() * 0.5) * size, color: core ? flame.core : fleck ? flame.fleck : flame.edge, dark: core && flame.dark === true,
      });
    }
    if (ground !== null) {
      this.lit.push({ x: at.x + dir.x * flame.reach * 0.5, y: ground, z: at.z + dir.z * flame.reach * 0.5, color: new THREE.Color(flame.light), k: power, r: POOL * Math.sqrt(size) });
    }
  }

  update(dt: number, night: number): void {
    const flakes = this.flakes;
    for (let i = flakes.length - 1; i >= 0; i--) {
      flakes[i].age += dt;
      if (flakes[i].age >= flakes[i].life) flakes.splice(i, 1);
    }
    const shine = 1 + 2.4 * night;
    flakes.forEach((f, n) => {
      // it leaves the jaws fast and loses its push towards the far end, while the dragon's own speed carries it on
      f.p.addScaledVector(f.v, dt).addScaledVector(f.carry, dt);
      f.v.multiplyScalar(Math.max(0, 1 - dt * 0.9));
      const t = f.age / f.life;
      // it swells over the first third of its way, and thins away to nothing at the end
      const s = f.size * (t < 0.3 ? 0.55 + 1.5 * t : 1 - ((t - 0.3) / 0.7) ** 1.5) * (1 + 1.6 * t);
      this.dir.copy(f.v).normalize();
      this.side.crossVectors(this.dir, Math.abs(this.dir.y) > 0.9 ? this.up2.set(1, 0, 0) : this.up2.set(0, 1, 0)).normalize();
      this.up2.crossVectors(this.side, this.dir).normalize();
      this.m4.makeBasis(this.dir.multiplyScalar(s * 3.4), this.up2.multiplyScalar(s * 0.45), this.side.multiplyScalar(s)).setPosition(f.p);
      this.mesh.setMatrixAt(n, this.m4);
      // it cools along its way; black fire stays black
      const cool = f.dark ? 1 : 1 - 0.45 * t * t;
      const k = f.dark ? 1 : shine;
      this.mesh.setColorAt(n, this.col.setRGB(f.color[0] * cool * k, f.color[1] * cool * cool * k, f.color[2] * cool * cool * k));
    });
    this.mesh.count = flakes.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    // light on the ground, by night only
    this.pools.count = night > 0.15 ? Math.min(this.poolRoom, this.lit.length) : 0;
    for (let i = 0; i < this.pools.count; i++) {
      const l = this.lit[i];
      this.m4.makeScale(l.r, 1, l.r).setPosition(l.x, l.y + 0.12, l.z);
      this.pools.setMatrixAt(i, this.m4);
      this.pools.setColorAt(i, this.col.copy(l.color).multiplyScalar(0.5 * l.k * night));
    }
    this.pools.instanceMatrix.needsUpdate = true;
    if (this.pools.instanceColor) this.pools.instanceColor.needsUpdate = true;
    this.lit.length = 0;
  }
}
