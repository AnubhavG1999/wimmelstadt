// The thin pale ribbons a wing tip draws in the air in a hard turn or at
// speed, as a jet's do. Each is the last half second of where its tip has
// been, and fades at once.

import * as THREE from 'three';

/** How many places a ribbon remembers, and how far apart in time they are. */
const POINTS = 14, EVERY = 0.042;

export class Trails {
  readonly mesh: THREE.Mesh;
  private readonly count: number;
  private readonly position: THREE.BufferAttribute;
  private readonly color: THREE.BufferAttribute;
  /** Each ribbon's remembered places and how strong it was at each, newest first. */
  private readonly past: Float32Array;
  private readonly strength: Float32Array;
  private readonly since: Float32Array;
  private readonly mat: THREE.MeshBasicMaterial;

  constructor(count: number) {
    this.count = count;
    const verts = count * POINTS * 2;
    this.position = new THREE.BufferAttribute(new Float32Array(verts * 3), 3);
    this.color = new THREE.BufferAttribute(new Float32Array(verts * 3), 3);
    this.position.setUsage(THREE.DynamicDrawUsage);
    this.color.setUsage(THREE.DynamicDrawUsage);
    const index: number[] = [];
    for (let r = 0; r < count; r++) {
      for (let i = 0; i + 1 < POINTS; i++) {
        const a = (r * POINTS + i) * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', this.position);
    geo.setAttribute('color', this.color);
    geo.setIndex(index);
    // light added to what is behind it: where it has faded it adds nothing
    // and no haze on it: haze would turn the faded end of a ribbon into a band of mist
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.name = 'dragon-trails';
    this.mesh.frustumCulled = false;
    this.mesh.layers.set(1);
    this.past = new Float32Array(count * POINTS * 3);
    this.strength = new Float32Array(count * POINTS);
    this.since = new Float32Array(count);
  }

  /** Where a ribbon's tip is now, and how strongly it shows, from 0 to 1. Called on every frame for every ribbon. */
  feed(r: number, tip: THREE.Vector3, strength: number, dt: number): void {
    const p = this.past, s = this.strength, at = r * POINTS;
    this.since[r] += dt;
    if (this.since[r] >= EVERY || dt <= 0) {
      this.since[r] = 0;
      // every place moves one back, and the newest is the tip
      p.copyWithin(at * 3 + 3, at * 3, (at + POINTS - 1) * 3);
      s.copyWithin(at + 1, at, at + POINTS - 1);
    }
    p[at * 3] = tip.x; p[at * 3 + 1] = tip.y; p[at * 3 + 2] = tip.z;
    s[at] = strength;
  }

  /** Lays every ribbon out again. `night` dims them: they are vapour, and show by day. */
  update(night: number): void {
    const pos = this.position.array as Float32Array, col = this.color.array as Float32Array, p = this.past, s = this.strength;
    for (let r = 0; r < this.count; r++) {
      for (let i = 0; i < POINTS; i++) {
        const at = r * POINTS + i, o = at * 6;
        const fade = (1 - i / (POINTS - 1)) ** 1.4, k = s[at] * fade * 0.5;
        const half = 0.1 + 0.16 * fade;
        // a ribbon stands on edge, so that it shows from above and from the side
        pos[o] = p[at * 3]; pos[o + 1] = p[at * 3 + 1] + half; pos[o + 2] = p[at * 3 + 2];
        pos[o + 3] = p[at * 3]; pos[o + 4] = p[at * 3 + 1] - half; pos[o + 5] = p[at * 3 + 2];
        col[o] = col[o + 1] = col[o + 2] = col[o + 3] = col[o + 4] = col[o + 5] = k;
      }
    }
    this.position.needsUpdate = true;
    this.color.needsUpdate = true;
    this.mat.opacity = 1;
    this.mat.color.setScalar(1 - 0.6 * night);
  }
}
