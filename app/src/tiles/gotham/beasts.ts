// The animals of Gotham: Ace the Bat-Hound, Titus, Bat-Cow and Alfred the
// cat at the Manor, Catwoman's black cat, Harley's two hyenas, Krypto when
// Superman calls, Aquaman's seahorse; and the flocks: the cave's bats, the
// Scarecrow's crows, the Penguin's birds, pigeons on the gargoyles, gulls on
// the harbour, and the grinning fish.
//
// Built as the cast is (figures.ts): every animal is a body on a small
// skeleton, and every part is one instanced mesh for all the animals that wear
// it. A kind's body (torso, neck, head, ears, eyes and its marks) is one mesh;
// the legs of every kind share two (a limb drawn twice to a leg, and a foot),
// the tails one, Krypto's cape one. A stride turns the legs from the hips and
// the knees; a sit pitches the body up about its hind hips and folds the hind
// legs under; lying lowers the belly to the ground with the forelegs out. One
// manner eases into the next.
//
// A flock is one instanced mesh for all its animals. A bird is drawn as two
// halves of one shape, each a half body and one wing, the left half turned
// over onto the right so that the wings beat by turning the halves; a perched
// bird folds them close. A fish is drawn whole.
//
// The comics give the animals' looks in a line each, as the wider cast's note
// reads them (docs/districts/research/gotham-the-wider-cast.md, section 5 and
// its table): Ace a tan and black shepherd in a small black hood mask with a
// bat tag; Titus a black Great Dane with a bat on his collar; the Bat-Cow a
// black and white cow, with a bat-like patch; Alfred the cat small and masked;
// Krypto a white dog in a red cape; Harley's hyenas Bud and Lou; Aquaman's
// great seahorse; and the Joker's Laughing Fish, which wear his grin. The
// shapes, the colours beyond those, the hood's ears and the mask's points are
// this file's own drawing. No emblem is drawn: the tags are plain discs.

import * as THREE from 'three';
import type { Build } from '../../engine/tile';
import { rng } from '../../engine/geo';
import { SHOW_LANES } from './plan';

export type BeastKind = 'ace' | 'titus' | 'batCow' | 'alfredCat' | 'blackCat' | 'hyena' | 'krypto' | 'seahorse';

/** One animal. */
export interface Beast {
  readonly kind: BeastKind;
  /** Stands it on whatever is at height `y`, facing `heading`. */
  at(x: number, y: number, z: number, heading: number): void;
  /** How it goes: `phase` from 0 to 1 is one stride, and `how` its manner: 0 standing, 1 walking, 2 running, 3 sitting, 4 lying. */
  gait(phase: number, how?: number): void;
  shown(v: boolean): void;
}

export type FlockKind = 'bats' | 'crows' | 'pigeons' | 'gulls' | 'birds' | 'fish';

/**
 * A flock: many small animals drawn in one batch, which the show steers as a
 * cloud. Each bird has a place of its own in the cloud and beats its wings by
 * itself; a fish leaps in an arc out of the water and falls back.
 */
export interface Flock {
  readonly kind: FlockKind;
  /**
   * Where the cloud's middle is and how it is shaped: `spread` is how far it
   * reaches sideways and `tall` how far up and down, `n` how many of its
   * animals are out (the rest are hidden), `swirl` how fast they wheel round
   * the middle, and `heading` the way they stream if `stream` is over 0 (0
   * they mill about, 1 they fly in a line that way).
   */
  set(o: { x: number; y: number; z: number; spread: number; tall?: number; n: number; swirl?: number; heading?: number; stream?: number }): void;
  /** Called every frame: moves the animals on. */
  step(dt: number): void;
  shown(v: boolean): void;
}

export interface Beasts {
  /** A new animal of a kind, hidden until it is shown. */
  beast(kind: BeastKind): Beast;
  /** A new flock of a kind with room for `max` animals, hidden until it is shown. */
  flock(kind: FlockKind, max: number): Flock;
  /** Called once a frame, after everything is placed: writes what changed into the meshes. */
  commit(): void;
}

/**
 * Where a rider sits on the seahorse, in its own frame: `x` forward of the
 * point it is stood at, `y` up from it (the water), facing the way it faces.
 * A rider posed astride puts the seat of his hips here.
 */
export const SEAHORSE_SEAT = { x: -0.42, y: 1.62 };

/** How tall each animal stands to the top of its head, and how high at the shoulder, for the show's checks. */
export const BEAST_SIZE: Record<BeastKind, { head: number; shoulder: number; length: number }> = {
  ace: { head: 1.12, shoulder: 0.82, length: 1.6 },
  titus: { head: 1.35, shoulder: 1.03, length: 1.9 },
  batCow: { head: 1.62, shoulder: 1.54, length: 3.3 },
  alfredCat: { head: 0.6, shoulder: 0.42, length: 1.1 },
  blackCat: { head: 0.6, shoulder: 0.41, length: 1.25 },
  hyena: { head: 1.1, shoulder: 1.0, length: 1.75 },
  krypto: { head: 1.0, shoulder: 0.73, length: 1.45 },
  seahorse: { head: 3.25, shoulder: 3.25, length: 1.3 },
};

// ---------------------------------------------------------------------------
// The kit: triangles, tubes, and instanced pools
// ---------------------------------------------------------------------------

type P = [number, number, number];
const TAU = Math.PI * 2;
/** What a corner is to the material: paint takes the instance's colour; a lamp glows by night; own keeps its colour. */
const PAINT = 0, LAMP = 3, OWN = 5;
const WHITE = 0xffffff;
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));
const smooth = (t: number): number => t * t * (3 - 2 * t);
const avg = (pts: P[]): P => {
  let x = 0, y = 0, z = 0;
  for (const p of pts) { x += p[0]; y += p[1]; z += p[2]; }
  return [x / pts.length, y / pts.length, z / pts.length];
};
const hash = (a: number, b: number): number => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const flipZ = (p: P): P => [p[0], p[1], -p[2]];

/** Paints a face of a tube by its middle, its outward way, its segment and its side. */
type Paint = number | ((c: P, n: P, i: number, j: number) => number);

/** Triangles for one part: flat-shaded, each corner with a colour and what it is to the material. */
class Shape {
  readonly pos: number[] = [];
  readonly nor: number[] = [];
  readonly col: number[] = [];
  readonly kind: number[] = [];
  private readonly c = new THREE.Color();

  get tris(): number { return this.pos.length / 9; }

  /** A triangle, its front turned away from `inside`; without it, facing the way its corners turn anticlockwise. */
  tri(a: P, b: P, c: P, color: number, kind = OWN, inside?: P): void {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz);
    if (l < 1e-10) return;
    nx /= l; ny /= l; nz /= l;
    let q = b, r = c;
    if (inside) {
      const ox = (a[0] + b[0] + c[0]) / 3 - inside[0], oy = (a[1] + b[1] + c[1]) / 3 - inside[1], oz = (a[2] + b[2] + c[2]) / 3 - inside[2];
      if (ox * nx + oy * ny + oz * nz < 0) { q = c; r = b; nx = -nx; ny = -ny; nz = -nz; }
    }
    this.c.set(color);
    for (const p of [a, q, r]) {
      this.pos.push(p[0], p[1], p[2]);
      this.nor.push(nx, ny, nz);
      this.col.push(this.c.r, this.c.g, this.c.b);
      this.kind.push(kind);
    }
  }

  quad(a: P, b: P, c: P, d: P, color: number, kind = OWN, inside?: P): void {
    this.tri(a, b, c, color, kind, inside);
    this.tri(a, c, d, color, kind, inside);
  }

  /** A flat triangle seen from both sides, `up` its colour on the side its corners turn anticlockwise to, `down` the other. */
  two(a: P, b: P, c: P, up: number, down = up, kind = OWN): void {
    const m = avg([a, b, c]);
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const n: P = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    this.tri(a, b, c, up, kind, [m[0] - n[0], m[1] - n[1], m[2] - n[2]]);
    this.tri(a, b, c, down, kind, [m[0] + n[0], m[1] + n[1], m[2] + n[2]]);
  }

  /** Rings of corners joined into a tube, its sides facing away from the line through their middles; caps close the first and the last. */
  tube(rings: P[][], paint: Paint, kind = OWN, capA = true, capB = true): void {
    const mids = rings.map(avg);
    const colour = (pts: P[], m: P, i: number, j: number): number => {
      if (typeof paint === 'number') return paint;
      const c = avg(pts), d: P = [c[0] - m[0], c[1] - m[1], c[2] - m[2]], l = Math.hypot(d[0], d[1], d[2]) || 1;
      return paint(c, [d[0] / l, d[1] / l, d[2] / l], i, j);
    };
    for (let i = 0; i + 1 < rings.length; i++) {
      const A = rings[i], B = rings[i + 1], m = avg([mids[i], mids[i + 1]]);
      for (let j = 0; j < A.length; j++) {
        const k = (j + 1) % A.length, c = colour([A[j], A[k], B[k], B[j]], m, i, j);
        this.tri(A[j], A[k], B[k], c, kind, m);
        this.tri(A[j], B[k], B[j], c, kind, m);
      }
    }
    const cap = (ring: P[], from: P, i: number): void => {
      const m = avg(ring), d: P = [m[0] - from[0], m[1] - from[1], m[2] - from[2]], l = Math.hypot(d[0], d[1], d[2]) || 1;
      const c = typeof paint === 'number' ? paint : paint(m, [d[0] / l, d[1] / l, d[2] / l], i, -1);
      for (let j = 1; j + 1 < ring.length; j++) this.tri(ring[0], ring[j], ring[j + 1], c, kind, from);
    };
    if (capA) cap(rings[0], mids[1], -1);
    if (capB) cap(rings[rings.length - 1], mids[mids.length - 2], rings.length - 1);
  }

  /** A solid from its eight corners: four round its bottom, then the four above them in the same order. */
  solid(c: P[], color: number, kind = OWN): void {
    const m = avg(c);
    for (const [a, b, d, e] of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) this.quad(c[a], c[b], c[d], c[e], color, kind, m);
  }

  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: number, kind = OWN): void {
    this.solid([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], color, kind);
  }

  /** A small diamond facing `n`, `r` across, for an eye or a tag. */
  dot(at: P, n: P, r: number, color: number, kind = OWN): void {
    const l = Math.hypot(n[0], n[1], n[2]) || 1, nx = n[0] / l, ny = n[1] / l, nz = n[2] / l;
    // two ways across the face: one level, one up it
    let ax = -nz, az = nx;
    const al = Math.hypot(ax, az) || 1;
    ax /= al; az /= al;
    const bx = ny * az, by = nz * ax - nx * az, bz = -ny * ax;
    const p = (u: number, v: number): P => [at[0] + ax * u + bx * v, at[1] + by * v, at[2] + az * u + bz * v];
    const inside: P = [at[0] - nx, at[1] - ny, at[2] - nz];
    this.quad(p(-r, 0), p(0, -r * 0.8), p(r, 0), p(0, r * 0.8), color, kind, inside);
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aPart', new THREE.Float32BufferAttribute(this.kind, 1));
    g.setAttribute('aLit', new THREE.Float32BufferAttribute(new Array<number>(this.kind.length).fill(0), 1));
    g.computeBoundingSphere();
    return g;
  }
}

/** Rings of `n` corners round a line of points, each `ra` from it in the line's own up and `rb` to its side. */
function along(pts: P[], ra: number[], rb: number[], n: number, side: P = [0, 0, 1], phase = 0): P[][] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2];
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl; ty /= tl; tz /= tl;
    const d = side[0] * tx + side[1] * ty + side[2] * tz;
    let sx = side[0] - tx * d, sy = side[1] - ty * d, sz = side[2] - tz * d;
    const sl = Math.hypot(sx, sy, sz) || 1;
    sx /= sl; sy /= sl; sz /= sl;
    const ux = sy * tz - sz * ty, uy = sz * tx - sx * tz, uz = sx * ty - sy * tx;
    const out: P[] = [];
    for (let k = 0; k < n; k++) {
      const an = phase + (k / n) * TAU, c = Math.cos(an) * ra[i], s = Math.sin(an) * rb[i];
      out.push([p[0] + ux * c + sx * s, p[1] + uy * c + sy * s, p[2] + uz * c + sz * s]);
    }
    return out;
  });
}

/** An upright ring of `n` corners at height y. */
function ring(n: number, y: number, r: number, phase = Math.PI / n): P[] {
  return Array.from({ length: n }, (_, i): P => { const a = phase + (i / n) * TAU; return [Math.cos(a) * r, y, Math.sin(a) * r]; });
}

/** A body's line, as [x, y, half its height, half its width] from back to front. */
type Seg = [number, number, number, number];

/** A tube along a body's line, `n` sides, a flat top and bottom. */
function trunk(s: Shape, segs: Seg[], n: number, paint: Paint, capA: boolean, capB: boolean, kind = OWN): P[][] {
  const rings = along(segs.map(([x, y]): P => [x, y, 0]), segs.map((g) => g[2]), segs.map((g) => g[3]), n, [0, 0, 1], Math.PI / n);
  s.tube(rings, paint, kind, capA, capB);
  return rings;
}

/** A line's middle height, half height and half width at x, from segments in order along x. */
function segAt(segs: Seg[], x: number): [number, number, number] {
  const up = segs[segs.length - 1][0] >= segs[0][0];
  for (let i = 0; i + 1 < segs.length; i++) {
    const a = segs[i], b = segs[i + 1];
    if (up ? x <= b[0] : x >= b[0]) {
      const t = clamp((x - a[0]) / (b[0] - a[0] || 1));
      return [mix(a[1], b[1], t), mix(a[2], b[2], t), mix(a[3], b[3], t)];
    }
  }
  const l = segs[segs.length - 1];
  return [l[1], l[2], l[3]];
}

/** One kind of part: an instanced mesh, with a copy for each animal that wears it now, packed so that only those are drawn. */
class Pool {
  mesh: THREE.InstancedMesh;
  readonly tris: number;
  private readonly owners: Slot[] = [];
  private dirtyM = false;
  private dirtyC = false;

  private readonly group: THREE.Group;
  readonly name: string;
  private readonly geo: THREE.BufferGeometry;
  private readonly mat: THREE.Material;

  constructor(group: THREE.Group, name: string, geo: THREE.BufferGeometry, mat: THREE.Material, cap = 4) {
    this.group = group;
    this.name = name;
    this.geo = geo;
    this.mat = mat;
    this.tris = geo.getAttribute('position').count / 3;
    this.mesh = this.make(cap);
    group.add(this.mesh);
  }

  private make(cap: number): THREE.InstancedMesh {
    const m = new THREE.InstancedMesh(this.geo, this.mat, cap);
    m.name = `gotham-beasts-${this.name}`;
    m.count = 0;
    m.visible = false;
    m.frustumCulled = false;
    m.castShadow = false;
    m.receiveShadow = true;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.setColorAt(0, new THREE.Color(1, 1, 1));
    return m;
  }

  take(s: Slot): void {
    if (s.index >= 0) return;
    if (this.owners.length >= this.mesh.instanceMatrix.count) this.grow();
    s.index = this.owners.length;
    this.owners.push(s);
    this.mesh.setColorAt(s.index, s.color);
    this.mesh.count = this.owners.length;
    this.mesh.visible = true;
    this.dirtyC = this.dirtyM = true;
  }

  drop(s: Slot): void {
    const i = s.index, last = this.owners.length - 1;
    if (i < 0) return;
    if (i !== last) {
      const moved = this.owners[last];
      this.owners[i] = moved;
      moved.index = i;
      (this.mesh.instanceMatrix.array as Float32Array).copyWithin(i * 16, last * 16, last * 16 + 16);
      this.mesh.setColorAt(i, moved.color);
    }
    this.owners.pop();
    s.index = -1;
    this.mesh.count = this.owners.length;
    this.mesh.visible = this.owners.length > 0;
    this.dirtyC = this.dirtyM = true;
  }

  put(s: Slot, m: THREE.Matrix4): void {
    if (s.index < 0) return;
    this.mesh.setMatrixAt(s.index, m);
    this.dirtyM = true;
  }

  private grow(): void {
    const old = this.mesh, m = this.make(old.instanceMatrix.count * 2);
    (m.instanceMatrix.array as Float32Array).set(old.instanceMatrix.array as Float32Array);
    (m.instanceColor!.array as Float32Array).set(old.instanceColor!.array as Float32Array);
    m.count = old.count;
    m.visible = old.visible;
    this.group.remove(old);
    old.dispose();
    this.group.add(m);
    this.mesh = m;
  }

  flush(): void {
    const n = this.owners.length;
    if (this.dirtyM && n > 0) this.mesh.instanceMatrix.needsUpdate = true;
    if (this.dirtyC && n > 0 && this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.dirtyM = this.dirtyC = false;
  }
}

interface Slot { pool: Pool; index: number; color: THREE.Color }

// ---------------------------------------------------------------------------
// The shared parts: a limb, a foot, a tail, a cape
// ---------------------------------------------------------------------------

/** A limb one long, hanging from y 0 to y -1, one thick at the top and a little less below. Paint, for the instance's colour. */
function limbShape(): Shape {
  const s = new Shape();
  s.tube([ring(6, 0, 1), ring(6, -1, 0.82)], WHITE, PAINT, true, true);
  return s;
}
/** A paw or a hoof, from the ankle at y 0 to the sole at y -1, the toe forward along x. */
function footShape(): Shape {
  const s = new Shape();
  s.solid([[-0.4, -1, -0.5], [1, -1, -0.5], [1, -1, 0.5], [-0.4, -1, 0.5], [-0.4, 0, -0.42], [0.5, -0.3, -0.45], [0.5, -0.3, 0.45], [-0.4, 0, 0.42]], WHITE, PAINT);
  return s;
}
/** A tail one long along y, one thick at its root and tapering. */
function tailShape(): Shape {
  const s = new Shape();
  s.tube([ring(5, 0, 1), ring(5, 0.55, 0.85), ring(5, 1, 0.4)], WHITE, PAINT, true, true);
  return s;
}
/** Krypto's cape: a red sheet from the neck (x 0) back to the hem (x -1), ridged over the back. */
function capeShape(): Shape {
  const s = new Shape(), R = 0xd02a24, R2 = 0xa81e1c;
  const neck = 0.42, hem = 0.62, drop = 0.42;
  const c0: P = [0, 0.04, 0], c1: P = [-1, 0.02, 0], l0: P = [0.02, -drop * 0.5, neck], l1: P = [-1.02, -drop, hem];
  for (const side of [1, -1]) {
    const a = side > 0 ? l0 : flipZ(l0), b = side > 0 ? l1 : flipZ(l1);
    const m = avg([c0, c1, a, b]);
    s.quad(c0, c1, b, a, R, OWN, [m[0], m[1] - 1, m[2] - side * 0.2]);
    s.quad(c0, c1, b, a, R2, OWN, [m[0], m[1] + 1, m[2] + side * 0.2]);
  }
  return s;
}

// ---------------------------------------------------------------------------
// The animals: a spec each
// ---------------------------------------------------------------------------

interface TailSpec { at: [number, number]; len: number; r: number; color: number; el: [number, number, number]; wag: number; sitWag: number }

interface Spec {
  kind: BeastKind;
  body: () => Shape;
  /** The withers' height, for how much it bobs. */
  H: number;
  /** The front and the hind hips, [x, y, z] on the right (+z) side. */
  front: P;
  hind: P;
  thigh: [number, number];
  shin: [number, number];
  /** The thigh's share of a leg. */
  share: number;
  foot: [number, number, number];
  stand: { front: [number, number]; hind: [number, number] };
  /** The leg's colours, front left, front right, hind left, hind right, and the feet's. */
  legs: [number, number, number, number];
  feet: [number, number, number, number];
  stride: [number, number];
  tail: TailSpec | null;
  /** The lowest of the torso, standing: where the belly meets the ground when it lies. */
  belly: number;
  sits: boolean;
  /** Folds its forelegs under it to lie, as a cow does; else stretches them forward, as a dog does. */
  kneels: boolean;
  cape: { at: P; len: number; w: number } | null;
  swims: boolean;
  /** The rump's lowest, standing, for sitting it on the ground. */
  rump: [number, number];
}

/** A quadruped's body: a torso, a neck and head, eyes, ears, and whatever marks it has. */
interface BodyOpts {
  torso: Seg[];
  head: Seg[];
  coat: (c: P, n: P, part: 'torso' | 'head', i: number, j: number) => number;
  nose: number;
  eye: { x: number; dy: number; r: number; color: number; kind?: number; out?: number; turn?: number };
  ears: { a: P; b: P; tip: P; color: number; inner?: number; round?: P } | null;
  sides?: [number, number];
  extra?: (s: Shape) => void;
}

function quadBody(o: BodyOpts): Shape {
  const s = new Shape();
  const [nt, nh] = o.sides ?? [8, 6];
  trunk(s, o.torso, nt, (c, n, i, j) => o.coat(c, n, 'torso', i, j), true, true);
  trunk(s, o.head, nh, (c, n, i, j) => (j < 0 && i > 0 ? o.nose : o.coat(c, n, 'head', i, j)), false, true);
  // the eyes, on the head's side, a little forward
  const [ey, , ew] = segAt(o.head, o.eye.x);
  for (const side of [1, -1]) {
    const t = o.eye.turn ?? 0.35;
    s.dot([o.eye.x, ey + o.eye.dy, side * (ew + 0.004 + (o.eye.out ?? 0))], [Math.sin(t), 0.05, side * Math.cos(t)], o.eye.r, o.eye.color, o.eye.kind ?? OWN);
  }
  if (o.ears) {
    const e = o.ears;
    for (const side of [1, -1]) {
      const f = (p: P): P => (side > 0 ? p : flipZ(p));
      if (e.round) {
        // a round ear: a fan of four
        s.two(f(e.a), f(e.b), f(e.round), e.color, e.inner ?? e.color);
        s.two(f(e.a), f(e.round), f(e.tip), e.color, e.inner ?? e.color);
      } else s.two(f(e.a), f(e.b), f(e.tip), e.color, e.inner ?? e.color);
    }
  }
  o.extra?.(s);
  return s;
}

/** The leg lengths that stand a hip at its height with the standing angles. */
function legLengths(hipY: number, share: number, aT: number, aS: number, fh: number): [number, number] {
  const L = (hipY - fh) / (share * Math.cos(aT) + (1 - share) * Math.cos(aT + aS));
  return [L * share, L * (1 - share)];
}

/** Maps a dog's line by size and leg: x and the heights scale by `s`, and the body is lifted by `lift` on longer legs. */
const dogMap = (s: number, lift: number, wide = 1) => (g: Seg): Seg => [g[0] * s, g[1] * s + lift, g[2] * s, g[3] * s * wide];
const dogP = (s: number, lift: number) => (p: P): P => [p[0] * s, p[1] * s + lift, p[2] * s];

// The dog's line, in a shepherd's measures: about 0.82 at the withers, 1.6 from nose to tail's tip.
const DOG_TORSO: Seg[] = [[-0.5, 0.66, 0.12, 0.11], [-0.4, 0.66, 0.16, 0.14], [-0.1, 0.68, 0.13, 0.125], [0.2, 0.645, 0.19, 0.145], [0.38, 0.665, 0.18, 0.13], [0.47, 0.73, 0.13, 0.1]];
const DOG_HEAD: Seg[] = [[0.42, 0.72, 0.1, 0.09], [0.56, 0.9, 0.085, 0.08], [0.66, 0.99, 0.1, 0.095], [0.78, 0.985, 0.085, 0.08], [0.9, 0.945, 0.055, 0.058], [0.98, 0.925, 0.038, 0.042]];

interface DogOpts {
  kind: BeastKind;
  s: number;
  lift: number;
  wide?: number;
  coat: BodyOpts['coat'];
  ears: 'erect' | 'drop';
  earColor: number;
  leg: number;
  feet: number;
  tail: number;
  extra?: (s: Shape, m: (p: P) => P, head: Seg[]) => void;
  eyeOut?: number;
  cape?: boolean;
}

function dogSpec(o: DogOpts): Spec {
  const m = dogMap(o.s, o.lift, o.wide), mp = dogP(o.s, o.lift);
  const torso = DOG_TORSO.map(m), head = DOG_HEAD.map(m);
  const ears = o.ears === 'erect'
    ? { a: mp([0.685, 1.06, 0.035]), b: mp([0.615, 1.05, 0.062]), tip: mp([0.6, 1.24, 0.07]), color: o.earColor }
    : { a: mp([0.69, 1.055, 0.078]), b: mp([0.6, 1.045, 0.088]), tip: mp([0.665, 0.88, 0.128]), color: o.earColor };
  const body = (): Shape => quadBody({
    torso, head, coat: o.coat, nose: 0x141416,
    eye: { x: 0.745 * o.s, dy: 0.018 * o.s, r: 0.022 * o.s, color: 0x1a1410, out: o.eyeOut },
    ears, extra: o.extra ? (s) => o.extra!(s, mp, head) : undefined,
  });
  const front = mp([0.3, 0.52, 0.085]), hind = mp([-0.38, 0.56, 0.085]);
  const fh = 0.05 * o.s;
  return {
    kind: o.kind, body, H: 0.82 * o.s + o.lift, front, hind,
    thigh: [0.058 * o.s, 0.074 * o.s], shin: [0.04 * o.s, 0.042 * o.s], share: 0.52,
    foot: [0.1 * o.s, fh, 0.056 * o.s],
    stand: { front: [-0.1, 0.1], hind: [0.38, -0.8] },
    legs: [o.leg, o.leg, o.leg, o.leg], feet: [o.feet, o.feet, o.feet, o.feet],
    stride: [0.42, 0.75],
    tail: { at: [-0.5 * o.s, 0.7 * o.s + o.lift], len: 0.44 * o.s, r: 0.042 * o.s, color: o.tail, el: [-1.0, -0.55, -0.15], wag: 0.45, sitWag: 0.4 },
    belly: bellyOf(torso), sits: true, kneels: false,
    cape: o.cape ? { at: mp([0.4, 0.835, 0]), len: 0.62 * o.s, w: 0.34 * o.s } : null,
    swims: false, rump: rumpOf(torso),
  };
}

/** The lowest of an eight-sided torso. */
function bellyOf(torso: Seg[]): number { return Math.min(...torso.map((g) => g[1] - g[2] * Math.cos(Math.PI / 8))); }
/** The rump's lowest point at its broadest. */
function rumpOf(torso: Seg[]): [number, number] { const g = torso[1]; return [g[0] - g[3] * 0.3, g[1] - g[2] * 0.92]; }

// Ace: a German shepherd, black saddle over tan, in a small black hood with two short pointed ears and a plain gold tag.
const ACE_BLACK = 0x1d1b1c, ACE_TAN = 0xb67a38, ACE_PALE = 0xcf9e5e;
function aceSpec(): Spec {
  return dogSpec({
    kind: 'ace', s: 1, lift: 0, ears: 'erect', earColor: ACE_BLACK, leg: ACE_TAN, feet: ACE_PALE, tail: 0x2c241e, eyeOut: 0.016,
    coat: (c, n, part, i) => {
      if (part === 'torso') return n[1] < -0.45 ? ACE_PALE : n[1] > 0.3 && i >= 0 && i <= 3 ? ACE_BLACK : ACE_TAN;
      return i <= 1 && n[1] > 0.2 ? ACE_BLACK : n[1] < -0.4 ? ACE_PALE : ACE_TAN;
    },
    extra: (s, mp, head) => {
      // the hood: a black shell close over the crown, the brow and the cheeks, from behind the ears to the eyes' front
      const hood: Seg[] = head.slice(1, 4).map((g) => [g[0], g[1] + 0.004, g[2] + 0.016, g[3] + 0.016]);
      hood[2] = [mix(head[2][0], head[3][0], 0.75), mix(head[2][1], head[3][1], 0.75) + 0.004, mix(head[2][2], head[3][2], 0.75) + 0.016, mix(head[2][3], head[3][3], 0.75) + 0.016];
      trunk(s, hood, 6, (_c, n) => (n[1] < -0.55 ? ACE_TAN : 0x151417), false, false);
      // white about the eyes, under the dark ones
      const [ey, , ew] = segAt(hood, 0.745);
      for (const side of [1, -1]) s.dot([0.742, ey + 0.018, side * (ew + 0.003)], [0.34, 0.05, side * 0.94], 0.036, 0xf0ece4);
      // the tag: a plain gold disc at the throat
      const t = mp([0.5, 0.6, 0]);
      s.box(t[0] - 0.012, t[1] - 0.035, -0.03, t[0] + 0.016, t[1] + 0.02, 0.03, 0xe8be3c);
    },
  });
}

// Titus: a Great Dane, black, long in the leg and deep in the chest, with drop ears, a red collar and a plain gold tag.
const TITUS = 0x19191d;
function titusSpec(): Spec {
  const sp = dogSpec({
    kind: 'titus', s: 1.12, lift: 0.13, wide: 0.92, ears: 'drop', earColor: 0x141418, leg: TITUS, feet: 0x1c1c20, tail: TITUS,
    coat: (_c, n, part) => (part === 'torso' && n[1] < -0.5 ? 0x232328 : TITUS),
    extra: (s, mp, head) => {
      const a = head[0], b = head[1], at = (t: number): Seg => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t) + 0.02, mix(a[3], b[3], t) + 0.02];
      trunk(s, [at(0.42), at(0.58)], 6, 0xc42a24, false, false);
      const t = mp([0.53, 0.66, 0]);
      s.box(t[0] - 0.01, t[1] - 0.06, -0.032, t[0] + 0.024, t[1] - 0.005, 0.032, 0xe2b83a);
    },
  });
  sp.stride = [0.38, 0.7];
  return sp;
}

// Krypto: a white dog with drop ears and a black nose, in a small red cape.
function kryptoSpec(): Spec {
  return dogSpec({
    kind: 'krypto', s: 0.9, lift: 0, ears: 'drop', earColor: 0xe8e4da, leg: 0xf2f0ea, feet: 0xf2f0ea, tail: 0xf2f0ea, cape: true,
    coat: (_c, n) => (n[1] < -0.5 ? 0xe6e2d8 : 0xf4f2ec),
  });
}

// The cats: small, scaled a little over life so that they read; a round head, tall ears, a long tail, eyes that shine by night.
const CAT_TORSO: Seg[] = [[-0.3, 0.335, 0.075, 0.07], [-0.22, 0.335, 0.092, 0.085], [0.0, 0.345, 0.08, 0.074], [0.17, 0.33, 0.092, 0.08], [0.25, 0.36, 0.072, 0.064]];
const CAT_HEAD: Seg[] = [[0.22, 0.38, 0.052, 0.05], [0.3, 0.47, 0.072, 0.072], [0.36, 0.49, 0.08, 0.08], [0.42, 0.47, 0.055, 0.06], [0.455, 0.455, 0.026, 0.032]];

function catSpec(kind: 'alfredCat' | 'blackCat'): Spec {
  const black = kind === 'blackCat' ? 0x131317 : 0x1b1b20, k = kind === 'blackCat' ? 0.9 : 1;
  const torso = CAT_TORSO.map((g): Seg => [g[0], g[1], g[2], g[3] * k]), head = CAT_HEAD;
  const white = 0xf2f0ea;
  const body = (): Shape => quadBody({
    torso, head, nose: kind === 'alfredCat' ? 0xd88a8a : 0x202024,
    coat: (c, n, part, i) => {
      if (kind === 'blackCat') return black;
      // Alfred: a white chest and throat, and a white muzzle and chin
      if (part === 'torso') return n[1] < -0.35 && c[0] > 0.02 ? white : black;
      if (i <= 1 && n[1] < -0.3) return white;
      return i >= 3 || (i === 2 && n[1] < -0.3) ? white : black;
    },
    eye: { x: 0.405, dy: 0.012, r: 0.019, color: kind === 'blackCat' ? 0xe8d22a : 0xb8d83a, kind: LAMP, turn: 0.7 },
    ears: { a: [0.375, 0.548, 0.025], b: [0.315, 0.54, 0.06], tip: [0.33, 0.635, 0.052], color: black, inner: kind === 'alfredCat' ? 0x8a5a5a : black },
  });
  return {
    kind, body, H: 0.42, front: [0.17, 0.27, 0.045], hind: [-0.24, 0.29, 0.05],
    thigh: [0.03, 0.04], shin: [0.022, 0.024], share: 0.5, foot: [0.05, 0.025, 0.03],
    stand: { front: [-0.05, 0.05], hind: [0.42, -0.95] },
    legs: [black, black, black, black], feet: kind === 'alfredCat' ? [white, white, white, white] : [black, black, black, black],
    stride: [0.45, 0.8],
    tail: { at: [-0.3, 0.37], len: kind === 'blackCat' ? 0.62 : 0.5, r: kind === 'blackCat' ? 0.02 : 0.024, color: black, el: [0.45, 1.0, 0.3], wag: 0.15, sitWag: 1.3 },
    belly: bellyOf(torso), sits: true, kneels: false, cape: null, swims: false, rump: rumpOf(torso),
  };
}

// The hyenas: a sloping back, high in the shoulder and low in the rump, a heavy head held low, big round ears, spots, a dark muzzle.
const HY_SAND = 0xb39c6c, HY_SPOT = 0x4b3a28, HY_DARK = 0x3a3028;
function hyenaSpec(): Spec {
  const torso: Seg[] = [[-0.48, 0.6, 0.125, 0.125], [-0.36, 0.62, 0.17, 0.15], [-0.05, 0.71, 0.17, 0.15], [0.22, 0.8, 0.2, 0.16], [0.38, 0.85, 0.17, 0.13]];
  const head: Seg[] = [[0.36, 0.86, 0.14, 0.11], [0.5, 0.93, 0.13, 0.11], [0.6, 0.95, 0.14, 0.13], [0.72, 0.9, 0.11, 0.1], [0.83, 0.84, 0.08, 0.075], [0.9, 0.82, 0.058, 0.058]];
  const body = (): Shape => quadBody({
    torso, head, nose: 0x161416,
    coat: (c, n, part, i, j) => {
      if (part === 'head') return i >= 3 ? HY_DARK : i <= 1 && n[1] > 0.45 ? HY_DARK : HY_SAND;
      if (n[1] > 0.6 && c[0] > 0.1) return HY_DARK;
      return n[1] < -0.5 ? 0xc8b282 : hash(i * 3.1, j) > 0.58 ? HY_SPOT : HY_SAND;
    },
    eye: { x: 0.68, dy: 0.025, r: 0.022, color: 0x1a1410 },
    ears: { a: [0.63, 1.06, 0.05], b: [0.53, 1.04, 0.095], round: [0.5, 1.2, 0.14], tip: [0.62, 1.24, 0.11], color: 0x8a7650, inner: 0x5a4a38 },
    extra: (s) => {
      // spots on the haunches and shoulders, as patches on the coat's sides
      const r = rng(9137);
      for (let i = 0; i < 6; i++) {
        const x = mix(-0.4, 0.25, r()), [y, hh, hw] = segAt(torso, x), side = i % 2 ? 1 : -1;
        s.dot([x, y - hh * 0.25 + r() * hh * 0.3, side * (hw * 0.96 + 0.006)], [0, 0, side], 0.045, HY_SPOT);
      }
    },
  });
  return {
    kind: 'hyena', body, H: 1.0, front: [0.26, 0.68, 0.09], hind: [-0.36, 0.52, 0.09],
    thigh: [0.068, 0.078], shin: [0.045, 0.045], share: 0.5, foot: [0.1, 0.05, 0.062],
    stand: { front: [-0.05, 0.05], hind: [0.3, -0.6] },
    legs: [HY_SAND, HY_SAND, HY_SAND, HY_SAND], feet: [HY_DARK, HY_DARK, HY_DARK, HY_DARK],
    stride: [0.4, 0.7],
    tail: { at: [-0.5, 0.63], len: 0.32, r: 0.042, color: 0x5a4a34, el: [-1.2, -0.9, -0.35], wag: 0.3, sitWag: 0.2 },
    belly: bellyOf(torso), sits: true, kneels: false, cape: null, swims: false, rump: rumpOf(torso),
  };
}

// The Bat-Cow: black and white, and across her eyes a black mask with two points up over her brow, as a bat's.
const COW_W = 0xf1eee6, COW_B = 0x1c1c1f, COW_PINK = 0xdba3a0;
function cowSpec(): Spec {
  const torso: Seg[] = [[-1.0, 1.22, 0.26, 0.26], [-0.85, 1.22, 0.36, 0.34], [-0.3, 1.15, 0.42, 0.4], [0.35, 1.15, 0.42, 0.38], [0.65, 1.2, 0.34, 0.28], [0.8, 1.3, 0.22, 0.18]];
  const head: Seg[] = [[0.76, 1.3, 0.2, 0.16], [0.98, 1.36, 0.17, 0.14], [1.12, 1.29, 0.17, 0.15], [1.28, 1.11, 0.14, 0.13], [1.38, 0.99, 0.12, 0.13], [1.44, 0.93, 0.09, 0.11]];
  const body = (): Shape => quadBody({
    torso, head, nose: 0xc8888a,
    coat: (_c, n, part, i, j) => {
      if (part === 'torso') return hash(i + 0.37, Math.floor(j / 2) + (n[2] > 0 ? 7 : 0)) > 0.5 ? COW_B : COW_W;
      if (i === 0) return COW_B;
      if (i === 2) return COW_B; // the mask's band, round the head at the eyes
      return i >= 4 ? COW_PINK : COW_W;
    },
    eye: { x: 1.2, dy: 0.02, r: 0.03, color: 0x0e0e10, out: 0.004 },
    ears: { a: [1.0, 1.44, 0.12], b: [0.93, 1.41, 0.12], tip: [0.94, 1.37, 0.32], color: COW_W, inner: 0xd8b0aa },
    extra: (s) => {
      // white about the eyes in the mask, so that it reads as a mask and not as a patch
      const [ey, , ew] = segAt(head, 1.2);
      for (const side of [1, -1]) s.dot([1.2, ey + 0.02, side * (ew + 0.004)], [0.35, 0.05, side * 0.94], 0.055, 0xf4f2ec);
      // the mask's two points, up over the brow to the poll
      for (const side of [1, -1]) {
        const f = (p: P): P => (side > 0 ? p : flipZ(p));
        s.tri(f([1.13, 1.448, 0.012]), f([1.13, 1.448, 0.075]), f([0.99, 1.512, 0.058]), COW_B, OWN, [1.08, 1.3, side * 0.04]);
      }
      // small horns
      for (const side of [1, -1]) {
        const base: P = [0.97, 1.48, side * 0.09];
        s.tube([ring(4, 0, 0.032).map((p): P => [base[0] + p[0], base[1] + p[1], base[2] + p[2]]), ring(4, 0, 0.01).map((p): P => [0.95 + p[0], 1.6 + p[1], side * 0.19 + p[2]])], 0xe8dcc0, OWN, false, true);
      }
      // the udder
      s.solid([[-0.66, 0.66, -0.1], [-0.36, 0.66, -0.1], [-0.36, 0.66, 0.1], [-0.66, 0.66, 0.1], [-0.7, 0.88, -0.15], [-0.3, 0.88, -0.15], [-0.3, 0.88, 0.15], [-0.7, 0.88, 0.15]], COW_PINK);
    },
  });
  return {
    kind: 'batCow', body, H: 1.54, front: [0.48, 0.95, 0.2], hind: [-0.76, 1.0, 0.2],
    thigh: [0.12, 0.15], shin: [0.07, 0.075], share: 0.5, foot: [0.14, 0.1, 0.1],
    stand: { front: [0, 0], hind: [0.25, -0.45] },
    legs: [COW_W, COW_B, COW_W, COW_W], feet: [0x2a2420, 0x2a2420, 0x2a2420, 0x2a2420],
    stride: [0.3, 0.55],
    tail: { at: [-1.02, 1.36], len: 0.95, r: 0.032, color: COW_B, el: [-1.45, -1.35, -1.0], wag: 0.22, sitWag: 0.2 },
    belly: bellyOf(torso), sits: false, kneels: true, cape: null, swims: false, rump: rumpOf(torso),
  };
}

// Aquaman's seahorse: about four tall from the curl of its tail, green-gold in bands with a pale belly, a crown of spines, a fin down its back.
function seahorseSpec(): Spec {
  // the line from the snout's tip down to the tail's curl: [x, y, half its depth, half its width]
  const lift = -0.62;
  const line: Seg[] = [
    [0.98, 3.3, 0.05, 0.045], [0.72, 3.37, 0.075, 0.065], [0.5, 3.44, 0.1, 0.09], [0.28, 3.5, 0.24, 0.2], [0.08, 3.4, 0.25, 0.21],
    [0.0, 3.05, 0.2, 0.18], [0.12, 2.55, 0.32, 0.26], [0.15, 2.0, 0.38, 0.3], [0.03, 1.45, 0.32, 0.26], [-0.1, 0.95, 0.24, 0.2],
    [-0.12, 0.5, 0.17, 0.15], [0.0, 0.15, 0.13, 0.12], [0.22, -0.02, 0.1, 0.09], [0.42, 0.05, 0.08, 0.075], [0.47, 0.25, 0.06, 0.055], [0.33, 0.37, 0.045, 0.04], [0.2, 0.27, 0.02, 0.02],
  ].map((g): Seg => [g[0], g[1] + lift, g[2], g[3]]);
  const GREEN = 0x7c9a3a, GOLD = 0xc2a63c, PALE = 0xdcc66a;
  const body = (): Shape => {
    const s = new Shape();
    const pts = line.map(([x, y]): P => [x, y, 0]);
    const rings = along(pts, line.map((g) => g[2]), line.map((g) => g[3]), 6, [0, 0, 1], Math.PI / 6);
    s.tube(rings, (_c, n, i) => (i < 0 ? GOLD : i >= 5 && i <= 8 && n[0] > 0.45 ? PALE : i % 2 ? GOLD : GREEN), OWN, true, true);
    // the eye, gold-ringed, on each side of the head
    for (const side of [1, -1]) {
      s.dot([0.3, 3.55 + lift, side * 0.205], [0.25, 0.1, side], 0.07, GOLD);
      s.dot([0.31, 3.555 + lift, side * 0.212], [0.25, 0.1, side], 0.04, 0x101012);
    }
    // the crown: three short spines on the crown of the head
    for (const [x, h] of [[0.18, 0.22], [0.3, 0.17], [0.06, 0.15]] as [number, number][]) {
      const y0 = 3.68 + lift, a: P = [x - 0.06, y0, -0.06], b: P = [x + 0.06, y0, -0.06], c: P = [x, y0, 0.07], t: P = [x - 0.03, y0 + h, 0];
      const m: P = [x, y0 + 0.03, 0];
      s.tri(a, b, t, GOLD, OWN, m); s.tri(b, c, t, GOLD, OWN, m); s.tri(c, a, t, GOLD, OWN, m);
    }
    // the fin down the back, a fan of three
    const fin: [P, P][] = [[[-0.14, 2.35 + lift, 0], [-0.42, 2.45 + lift, 0]], [[-0.2, 1.95 + lift, 0], [-0.5, 1.98 + lift, 0]], [[-0.17, 1.55 + lift, 0], [-0.44, 1.5 + lift, 0]], [[-0.1, 1.2 + lift, 0], [-0.28, 1.12 + lift, 0]]];
    for (let i = 0; i + 1 < fin.length; i++) {
      s.two(fin[i][0], fin[i + 1][0], fin[i + 1][1], 0xd8be52, 0xc8ae48);
      s.two(fin[i][0], fin[i + 1][1], fin[i][1], 0xd8be52, 0xc8ae48);
    }
    return s;
  };
  return {
    kind: 'seahorse', body, H: 3.2, front: [0, 0, 0], hind: [0, 1.4 + lift, 0],
    thigh: [0, 0], shin: [0, 0], share: 0.5, foot: [0, 0, 0], stand: { front: [0, 0], hind: [0, 0] },
    legs: [0, 0, 0, 0], feet: [0, 0, 0, 0], stride: [0, 0], tail: null, belly: 0, sits: false, kneels: false, cape: null, swims: true, rump: [0, 0],
  };
}

const SPECS: Record<BeastKind, () => Spec> = {
  ace: aceSpec, titus: titusSpec, krypto: kryptoSpec, alfredCat: () => catSpec('alfredCat'), blackCat: () => catSpec('blackCat'),
  hyena: hyenaSpec, batCow: cowSpec, seahorse: seahorseSpec,
};

// ---------------------------------------------------------------------------
// A pose, as numbers that ease from one manner into the next
// ---------------------------------------------------------------------------

const DROP = 0, PITCH = 1, BOB = 2, LEG = 3, TEL = 11, TWAG = 12, CAPE = 13, ROLL = 14, N = 15;
/** Each leg's place in the stride, front left, front right, hind left, hind right: at a walk, and at a gallop. */
const WALK = [0.25, 0.75, 0, 0.5], GALLOP = [0, 0.1, 0.6, 0.5];

/** What a spec works out once: its legs' lengths, how it sits and how it lies. */
interface Made {
  sp: Spec;
  len: [number, number][];
  sit: { theta: number; drop: number; front: [number, number]; hind: [number, number] };
  lie: { drop: number; front: [number, number]; hind: [number, number] };
}

/** A folded leg from a hip at height `h`: the thigh forward at `tw` from straight down, the shin back so that the foot comes to the ground. */
function fold(h: number, L1: number, L2: number, fh: number, tw: number): [number, number] {
  const c = clamp((h - L1 * Math.cos(tw) - fh) / L2, -0.2, 1);
  const ws = -Math.acos(c);
  return [tw, ws - tw];
}

function make(sp: Spec): Made {
  const fh = sp.foot[1];
  const lf = legLengths(sp.front[1], sp.share, sp.stand.front[0], sp.stand.front[1], fh);
  const lh = legLengths(sp.hind[1], sp.share, sp.stand.hind[0], sp.stand.hind[1], fh);
  const len: [number, number][] = [lf, lf, lh, lh];
  // sitting: pitched up about the hind hips until the forelegs stand straight, the rump on the ground
  const [xf, yf] = sp.front, [xh, yh] = sp.hind, Lf = lf[0] + lf[1] + fh;
  let hs = yh * 0.4, theta = 0;
  for (let k = 0; k < 6; k++) {
    const d = xf - xh, e = yf - yh, R = Math.hypot(d, e), psi = Math.atan2(e, d);
    theta = clamp(Math.asin(clamp((Lf - hs) / R, -1, 1)) - psi, 0, 0.52);
    const rx = sp.rump[0] - xh, ry = sp.rump[1] - yh, rumpY = hs + rx * Math.sin(theta) + ry * Math.cos(theta);
    hs = Math.max(sp.thigh[1], hs - (rumpY - 0.012));
  }
  // where the chest comes to: the forelegs lean forward from it as far as they must to reach the ground
  const chestY = hs + (xf - xh) * Math.sin(theta) + (yf - yh) * Math.cos(theta);
  const lean = Math.acos(clamp((chestY - fh) / (lf[0] + lf[1])));
  const sitHind = fold(hs, lh[0], lh[1], fh, 1.25);
  // lying: the belly on the ground
  const drop = sp.belly - 0.015, hf = yf - drop, hh = yh - drop;
  const lieFront: [number, number] = sp.kneels ? fold(hf, lf[0], lf[1], fh * 0.6, 1.15) : [Math.acos(clamp((hf - fh * 0.9) / (lf[0] + lf[1]), -1, 1)), 0.05];
  return {
    sp, len,
    sit: { theta, drop: yh - hs, front: [lean - theta, 0], hind:[sitHind[0] - theta, sitHind[1]] },
    lie: { drop, front: lieFront, hind: fold(hh, lh[0], lh[1], fh * 0.6, 1.35) },
  };
}

function poseOf(m: Made, phase: number, how: number, out: number[]): void {
  const sp = m.sp, ph = phase - Math.floor(phase);
  out.fill(0);
  if (sp.swims) {
    const swim = how === 1 || how === 2 ? how : 0;
    out[PITCH] = swim === 2 ? -0.3 : swim === 1 ? -0.16 : 0.04 * Math.sin(TAU * ph);
    out[BOB] = (swim ? 0.1 : 0.07) * Math.sin(TAU * ph);
    out[ROLL] = 0.05 * Math.sin(TAU * ph + 1.2);
    return;
  }
  const t = sp.tail;
  const legs = (f: (i: number) => [number, number]): void => { for (let i = 0; i < 4; i++) { const [a, b] = f(i); out[LEG + i * 2] = a; out[LEG + i * 2 + 1] = b; } };
  const st = (i: number): [number, number] => (i < 2 ? sp.stand.front : sp.stand.hind);
  if (how === 1 || how === 2) {
    const run = how === 2, A = sp.stride[run ? 1 : 0], offs = run ? GALLOP : WALK;
    legs((i) => {
      const phi = TAU * (ph + offs[i]), [a0, b0] = st(i), lift = Math.max(0, Math.cos(phi));
      const bend = (run ? 1.25 : 0.75) * lift;
      return [a0 + A * Math.sin(phi) * (i < 2 ? 1 : 0.9), b0 - bend * (i < 2 ? 1 : 0.75)];
    });
    out[BOB] = run ? sp.H * 0.045 * Math.sin(TAU * ph + 0.4) + sp.H * 0.02 : sp.H * 0.012 * Math.cos(2 * TAU * ph);
    out[PITCH] = run ? 0.07 * Math.sin(TAU * ph + 1.0) : 0;
    if (t) { out[TEL] = t.el[run ? 2 : 1]; out[TWAG] = (run ? 0.1 : 0.18) * t.wag * Math.sin(TAU * ph); }
    out[CAPE] = run ? 1.05 + 0.18 * Math.sin(TAU * ph * 3) : 0.28 + 0.06 * Math.sin(TAU * ph * 2);
    return;
  }
  if (how === 3 && sp.sits) {
    out[DROP] = m.sit.drop;
    out[PITCH] = m.sit.theta;
    legs((i) => (i < 2 ? m.sit.front : m.sit.hind));
    if (t) { out[TEL] = m.sit.theta - 0.06; out[TWAG] = t.sitWag + 0.12 * t.wag * Math.sin(TAU * ph * 2); }
    out[CAPE] = -0.08;
    return;
  }
  if (how === 3 || how === 4) {
    out[DROP] = m.lie.drop;
    legs((i) => (i < 2 ? m.lie.front : m.lie.hind));
    if (t) { out[TEL] = -0.12; out[TWAG] = t.sitWag * 0.8 + 0.1 * t.wag * Math.sin(TAU * ph); }
    out[BOB] = 0.004 * sp.H * Math.sin(TAU * ph);
    return;
  }
  legs(st);
  out[BOB] = 0.004 * sp.H * Math.sin(TAU * ph);
  if (t) { out[TEL] = t.el[0]; out[TWAG] = t.wag * Math.sin(TAU * ph * 2); }
}

// ---------------------------------------------------------------------------
// An animal
// ---------------------------------------------------------------------------

const M0 = new THREE.Matrix4(), M1 = new THREE.Matrix4(), M2 = new THREE.Matrix4(), TMP = new THREE.Matrix4();
const V1 = new THREE.Vector3(), Q1 = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);
const move = (m: THREE.Matrix4, x: number, y: number, z: number): THREE.Matrix4 => m.multiply(TMP.makeTranslation(x, y, z));
const rotZ = (m: THREE.Matrix4, a: number): THREE.Matrix4 => m.multiply(TMP.makeRotationZ(a));
const rotX = (m: THREE.Matrix4, a: number): THREE.Matrix4 => m.multiply(TMP.makeRotationX(a));
const scaled = (m: THREE.Matrix4, x: number, y: number, z: number): THREE.Matrix4 => m.multiply(TMP.makeScale(x, y, z));

/** For looking closely on the development server only: draws every animal this many times its size. */
let magnify = 1;

interface Kit {
  group: THREE.Group;
  paint: THREE.Material;
  pools: Map<string, Pool>;
  pool(name: string, shape: () => Shape): Pool;
}

class Rig implements Beast {
  readonly kind: BeastKind;
  private readonly m: Made;
  private readonly body: Slot;
  private readonly thighs: Slot[] = [];
  private readonly shins: Slot[] = [];
  private readonly feet: Slot[] = [];
  private readonly tail: Slot | null = null;
  private readonly cape: Slot | null = null;
  private x = 0; private y = -40; private z = 0; private h = 0;
  private on = false;
  dirty = false;
  private readonly cur = new Array<number>(N).fill(0);
  private from = new Array<number>(N).fill(0);
  private readonly to = new Array<number>(N).fill(0);
  private blend = 1;
  private how = -1;

  constructor(kind: BeastKind, m: Made, kit: Kit) {
    this.kind = kind;
    this.m = m;
    const sp = m.sp, white = new THREE.Color(1, 1, 1);
    const slot = (pool: Pool, color: THREE.Color | number): Slot => ({ pool, index: -1, color: typeof color === 'number' ? new THREE.Color(color) : color });
    this.body = slot(kit.pool(`body-${kind}`, sp.body), white);
    if (!sp.swims) {
      const limb = kit.pool('limb', limbShape), foot = kit.pool('foot', footShape);
      for (let i = 0; i < 4; i++) {
        this.thighs.push(slot(limb, sp.legs[i]));
        this.shins.push(slot(limb, sp.legs[i]));
        this.feet.push(slot(foot, sp.feet[i]));
      }
    }
    if (sp.tail) this.tail = slot(kit.pool('tail', tailShape), sp.tail.color);
    if (sp.cape) this.cape = slot(kit.pool('cape', capeShape), white);
    this.gait(0, 0);
  }

  private slots(): Slot[] {
    const out = [this.body, ...this.thighs, ...this.shins, ...this.feet];
    if (this.tail) out.push(this.tail);
    if (this.cape) out.push(this.cape);
    return out;
  }

  /** How it sits and lies, for checking. */
  get folds(): { sit: Made['sit']; lie: Made['lie']; legs: [number, number][] } { return { sit: this.m.sit, lie: this.m.lie, legs: this.m.len }; }

  get triangles(): number { return this.slots().reduce((n, s) => n + s.pool.tris, 0); }

  at(x: number, y: number, z: number, heading: number): void {
    this.x = x; this.y = y; this.z = z; this.h = heading;
    this.dirty = true;
  }

  gait(phase: number, how = 0): void {
    poseOf(this.m, phase, how, this.to);
    if (how !== this.how) {
      if (this.how < 0) this.blend = 1;
      else { this.from = this.cur.slice(); this.blend = 0; }
      this.how = how;
    }
    this.dirty = true;
  }

  shown(v: boolean): void {
    if (v === this.on) return;
    this.on = v;
    for (const s of this.slots()) { if (v) s.pool.take(s); else s.pool.drop(s); }
    if (v) { this.blend = 1; this.dirty = true; }
  }

  write(dt: number): void {
    if (!this.on) { this.dirty = false; return; }
    if (this.blend < 1) this.blend = Math.min(1, this.blend + dt / 0.4);
    const b = smooth(this.blend), c = this.cur;
    for (let i = 0; i < N; i++) c[i] = mix(this.from[i], this.to[i], b);
    this.dirty = this.blend < 1;
    const sp = this.m.sp;
    // the body: about the hind hips, so that a sit lowers the rump and lifts the chest
    const B = M0.makeRotationY(-this.h).setPosition(this.x, this.y, this.z);
    if (magnify !== 1) scaled(B, magnify, magnify, magnify);
    const [xh, yh] = sp.hind;
    move(B, xh, yh - c[DROP] + c[BOB], 0);
    rotZ(B, c[PITCH]);
    if (c[ROLL]) rotX(B, c[ROLL]);
    move(B, -xh, -yh, 0);
    this.body.pool.put(this.body, B);
    if (!sp.swims) {
      for (let i = 0; i < 4; i++) {
        const hip = i < 2 ? sp.front : sp.hind, zs = i % 2 ? 1 : -1;
        const [L1, L2] = this.m.len[i], aT = c[LEG + i * 2], aS = c[LEG + i * 2 + 1];
        const r1 = sp.thigh[i < 2 ? 0 : 1], r2 = sp.shin[i < 2 ? 0 : 1];
        rotZ(move(M1.copy(B), hip[0], hip[1], hip[2] * zs), aT);
        M2.copy(M1);
        this.thighs[i].pool.put(this.thighs[i], scaled(move(M2, 0, r1 * 0.5, 0), r1, L1 + r1 * 0.5, r1));
        rotZ(move(M1, 0, -L1, 0), aS);
        M2.copy(M1);
        this.shins[i].pool.put(this.shins[i], scaled(move(M2, 0, r2 * 0.6, 0), r2, L2 + r2 * 0.6, r2));
        // the foot keeps level with the ground
        rotZ(move(M1, 0, -L2, 0), -(c[PITCH] + aT + aS));
        this.feet[i].pool.put(this.feet[i], scaled(M1, sp.foot[0], sp.foot[1], sp.foot[2]));
      }
    }
    const t = sp.tail;
    if (t && this.tail) {
      const el = c[TEL], w = c[TWAG];
      V1.set(-Math.cos(el) * Math.cos(w), Math.sin(el), Math.cos(el) * Math.sin(w)).normalize();
      Q1.setFromUnitVectors(UP, V1);
      move(M1.copy(B), t.at[0], t.at[1], 0);
      M1.multiply(TMP.makeRotationFromQuaternion(Q1));
      this.tail.pool.put(this.tail, scaled(M1, t.r, t.len, t.r));
    }
    if (sp.cape && this.cape) {
      const cp = sp.cape;
      rotZ(move(M1.copy(B), cp.at[0], cp.at[1], cp.at[2]), -c[CAPE]);
      this.cape.pool.put(this.cape, scaled(M1, cp.len, cp.len * 0.6, cp.w));
    }
  }
}

// ---------------------------------------------------------------------------
// Flocks
// ---------------------------------------------------------------------------

interface BirdSpec {
  half: () => Shape;
  colors: number[];
  /** Beats a second, the least and the most, and how far a beat swings. */
  beat: [number, number];
  amp: number;
  /** Beyond this share of its time a bird glides. */
  glide: number;
  follow: number;
  /** How far a bird wanders from its place, as a share of the spread, and how fast it jinks. */
  wander: number;
  jink: number;
  size: [number, number];
}

/** Half a bird: half its body as a diamond on its right side, one wing, half its tail, all level with the wing's plane, so that turned over it is the other half. */
function halfBird(o: { L: number; w: number; h: number; span: number; chord: number; sweep: number; tail: number; bodyColor: number; bodyKind: number; wing: number; tip?: number; bat?: boolean }): Shape {
  const s = new Shape(), { L, w, h } = o;
  const N0: P = [L * 0.5, 0, 0], T0: P = [-L * 0.5, 0, 0], U: P = [0, h, 0], D: P = [0, -h, 0], S: P = [0, 0, w], O: P = [0, 0, -0.01];
  s.tri(N0, U, S, o.bodyColor, o.bodyKind, O);
  s.tri(N0, S, D, o.bodyColor, o.bodyKind, O);
  s.tri(T0, S, U, o.bodyColor, o.bodyKind, O);
  s.tri(T0, D, S, o.bodyColor, o.bodyKind, O);
  const half = o.span / 2;
  if (o.bat) {
    const rf: P = [L * 0.2, 0, w * 0.8], rb: P = [-L * 0.35, 0, w * 0.8], wrist: P = [L * 0.25, 0, half * 0.5], tip: P = [-L * 0.1, 0, half], notch: P = [-L * 0.3, 0, half * 0.62];
    s.two(rf, wrist, rb, o.wing, o.wing, PAINT);
    s.two(wrist, tip, notch, o.wing, o.wing, PAINT);
    s.two(wrist, notch, rb, o.wing, o.wing, PAINT);
  } else {
    const rf: P = [L * 0.18, 0, w * 0.8], rb: P = [-L * 0.12 - o.chord * 0.4, 0, w * 0.8];
    const reach = o.tip !== undefined ? 0.72 : 1;
    const tf: P = [o.sweep * reach + L * 0.08, 0, half * reach], tb: P = [o.sweep * reach - o.chord * 0.55, 0, half * reach];
    s.two(rf, tf, tb, o.wing, o.wing, PAINT);
    s.two(rf, tb, rb, o.wing, o.wing, PAINT);
    if (o.tip !== undefined) s.two(tf, [o.sweep - o.chord * 0.25, 0, half], tb, o.tip, o.tip, OWN);
    s.two(T0, [-L * 0.5 - o.tail, 0, 0], [-L * 0.5 - o.tail * 0.85, 0, w * 1.5], o.wing, o.wing, PAINT);
  }
  return s;
}

const BIRDS: Record<Exclude<FlockKind, 'fish'>, BirdSpec> = {
  bats: {
    half: () => halfBird({ L: 0.2, w: 0.05, h: 0.05, span: 0.82, chord: 0.18, sweep: 0, tail: 0, bodyColor: WHITE, bodyKind: PAINT, wing: WHITE, bat: true }),
    colors: [0x141218, 0x1a161e, 0x100e12, 0x1c1614], beat: [8, 12], amp: 0.95, glide: 2, follow: 3.2, wander: 0.3, jink: 6, size: [0.85, 1.15],
  },
  crows: {
    half: () => halfBird({ L: 0.5, w: 0.08, h: 0.08, span: 1.25, chord: 0.28, sweep: -0.05, tail: 0.2, bodyColor: WHITE, bodyKind: PAINT, wing: WHITE }),
    colors: [0x17171e, 0x1d1d28, 0x121216, 0x202024], beat: [2.4, 3.2], amp: 0.6, glide: 0.55, follow: 1.6, wander: 0.22, jink: 0.8, size: [0.9, 1.1],
  },
  pigeons: {
    half: () => halfBird({ L: 0.4, w: 0.1, h: 0.1, span: 0.82, chord: 0.2, sweep: -0.02, tail: 0.12, bodyColor: WHITE, bodyKind: PAINT, wing: WHITE }),
    colors: [0x8c909a, 0x7a7e88, 0x9ea2aa, 0x6e6a72, 0xa8a49e], beat: [5, 6.5], amp: 0.8, glide: 0.8, follow: 2.6, wander: 0.18, jink: 1.5, size: [0.9, 1.1],
  },
  gulls: {
    half: () => halfBird({ L: 0.55, w: 0.09, h: 0.085, span: 1.7, chord: 0.26, sweep: -0.08, tail: 0.14, bodyColor: 0xf4f4f0, bodyKind: OWN, wing: WHITE, tip: 0x1e1e22 }),
    colors: [0xbcc2ca, 0xc4c8d0, 0xb2b8c0], beat: [1.4, 1.9], amp: 0.38, glide: 0.25, follow: 1.0, wander: 0.2, jink: 0.4, size: [0.9, 1.1],
  },
  birds: {
    half: () => halfBird({ L: 0.26, w: 0.06, h: 0.06, span: 0.56, chord: 0.14, sweep: 0, tail: 0.1, bodyColor: WHITE, bodyKind: PAINT, wing: WHITE }),
    colors: [0xf2c81e, 0xe0402a, 0x2a8ae0, 0x34b048, 0xf08a1e, 0xb04ac8, 0x30c8c8, 0xf06aa0], beat: [7, 9], amp: 0.85, glide: 0.9, follow: 3, wander: 0.35, jink: 3, size: [0.85, 1.15],
  },
};

interface Cloud { x: number; y: number; z: number; spread: number; tall: number; n: number; swirl: number; heading: number; stream: number }

/** Each animal's own: its place in the cloud, how it wheels and beats, where it is now. */
interface Own { ox: number; oy: number; oz: number; a0: number; rf: number; ws: number; f1: number; f2: number; f3: number; s1: number; s2: number; s3: number; beat: number; rate: number; size: number; px: number; py: number; pz: number; yaw: number; pitch: number; out: boolean; burst: number }

function owns(max: number, seed: number, spec: { beat: [number, number]; size: [number, number] }): Own[] {
  const r = rng(seed);
  return Array.from({ length: max }, (): Own => {
    // a place in a ball: further from the middle more often than nearer
    const a = r() * TAU, u = r() * 2 - 1, rad = Math.cbrt(r()), q = Math.sqrt(1 - u * u);
    return {
      ox: Math.cos(a) * q * rad, oy: u * rad, oz: Math.sin(a) * q * rad, a0: r() * TAU, rf: 0.3 + 0.7 * Math.sqrt(r()), ws: 0.7 + 0.6 * r(),
      f1: 0.3 + r() * 0.5, f2: 0.4 + r() * 0.6, f3: 0.25 + r() * 0.5, s1: r() * TAU, s2: r() * TAU, s3: r() * TAU,
      beat: r(), rate: mix(spec.beat[0], spec.beat[1], r()), size: mix(spec.size[0], spec.size[1], r()),
      px: 0, py: 0, pz: 0, yaw: r() * TAU, pitch: 0, out: false, burst: 0,
    };
  });
}

class BirdFlock implements Flock {
  readonly kind: FlockKind;
  readonly mesh: THREE.InstancedMesh;
  private readonly spec: BirdSpec;
  private readonly a: Own[];
  private readonly c: Cloud = { x: 0, y: -40, z: 0, spread: 1, tall: 1, n: 0, swirl: 0, heading: 0, stream: 0 };
  private t = 0;
  private perched = false;
  private shownN = 0;
  readonly tris: number;

  constructor(kind: Exclude<FlockKind, 'fish'>, max: number, kit: Kit, seed: number) {
    this.kind = kind;
    this.spec = BIRDS[kind];
    const geo = this.spec.half().build();
    this.tris = (geo.getAttribute('position').count / 3) * 2;
    this.mesh = new THREE.InstancedMesh(geo, kit.paint, Math.max(2, max * 2));
    this.mesh.name = `gotham-beasts-${kind}`;
    this.mesh.count = 0;
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.a = owns(max, seed, this.spec);
    const col = new THREE.Color(), r = rng(seed + 17);
    for (let i = 0; i < max; i++) {
      col.set(this.spec.colors[Math.floor(r() * this.spec.colors.length)]);
      this.mesh.setColorAt(i * 2, col);
      this.mesh.setColorAt(i * 2 + 1, col);
    }
    kit.group.add(this.mesh);
  }

  set(o: { x: number; y: number; z: number; spread: number; tall?: number; n: number; swirl?: number; heading?: number; stream?: number }): void {
    const c = this.c;
    c.x = o.x; c.y = o.y; c.z = o.z; c.spread = Math.max(0.05, o.spread); c.tall = o.tall ?? o.spread * 0.4;
    c.n = Math.max(0, Math.min(this.a.length, Math.round(o.n))); c.swirl = o.swirl ?? 0; c.heading = o.heading ?? 0; c.stream = clamp(o.stream ?? 0);
  }

  shown(v: boolean): void { this.mesh.visible = v && this.shownN > 0; this.on = v; }
  private on = false;

  step(dt: number): void {
    const c = this.c, sp = this.spec;
    this.t += dt;
    const t = this.t;
    const perched = c.swirl === 0 && c.spread <= 1.5 && c.stream <= 0;
    if (this.perched && !perched) for (const a of this.a) a.burst = 1;
    this.perched = perched;
    const hx = Math.cos(c.heading), hz = Math.sin(c.heading);
    for (let i = 0; i < this.a.length; i++) {
      const a = this.a[i];
      if (i >= c.n) { a.out = false; continue; }
      if (!a.out) { a.out = true; a.px = c.x; a.py = c.y; a.pz = c.z; a.burst = perched ? 0 : 0.6; }
      let tx: number, ty: number, tz: number;
      if (perched) {
        // on a ledge: each at its own place along it, at the ledge's height
        tx = c.x + a.ox * c.spread; tz = c.z + a.oz * c.spread; ty = c.y;
      } else {
        const ang = a.a0 + c.swirl * a.ws * t, r = c.spread * a.rf;
        const wx = Math.sin(t * a.f1 + a.s1) + 0.35 * Math.sin(t * sp.jink * a.f2 + a.s2);
        const wy = Math.sin(t * a.f2 + a.s2) * 0.6 + 0.3 * Math.sin(t * sp.jink * a.f3 + a.s3);
        const wz = Math.cos(t * a.f3 + a.s3) + 0.35 * Math.cos(t * sp.jink * a.f1 + a.s1);
        const W = c.spread * sp.wander;
        const mx = c.x + Math.cos(ang) * r + wx * W, my = c.y + a.oy * c.tall + wy * W * 0.6, mz = c.z + Math.sin(ang) * r + wz * W;
        // in a line: each at its own place along the heading, a little to either side
        const u = c.n > 1 ? i / (c.n - 1) : 0.5, along = (0.5 - u) * 2 * c.spread, side = a.ox * c.spread * 0.18;
        const lx = c.x + hx * along - hz * side + wx * W * 0.3, ly = c.y + a.oy * c.tall * 0.35 + wy * W * 0.3, lz = c.z + hz * along + hx * side + wz * W * 0.3;
        tx = mix(mx, lx, c.stream); ty = mix(my, ly, c.stream); tz = mix(mz, lz, c.stream);
        if (a.burst > 0) {
          // startled: up and out from where they sat
          const k = a.burst * c.spread * 0.8;
          tx += a.ox * k; ty += (Math.abs(a.oy) + 0.8) * k; tz += a.oz * k;
          a.burst = Math.max(0, a.burst - dt * 0.8);
        }
      }
      const f = 1 - Math.exp(-dt * sp.follow * (perched ? 2.5 : 0.6 + 0.8 * a.rf));
      const ox = a.px, oy = a.py, oz = a.pz;
      a.px += (tx - a.px) * f; a.py += (ty - a.py) * f; a.pz += (tz - a.pz) * f;
      const vx = a.px - ox, vy = a.py - oy, vz = a.pz - oz, hs = Math.hypot(vx, vz);
      let want = a.yaw;
      if (c.stream > 0.5 && !perched) want = c.heading;
      else if (hs > 0.002 * Math.max(dt * 60, 0.01)) want = Math.atan2(vz, vx);
      let d = want - a.yaw;
      d -= Math.round(d / TAU) * TAU;
      a.yaw += d * (1 - Math.exp(-dt * 5));
      a.pitch += (clamp(Math.atan2(vy, hs + 1e-4) * 0.6, -0.6, 0.6) * (perched ? 0 : 1) - a.pitch) * (1 - Math.exp(-dt * 4));
      a.beat += dt * a.rate * (0.85 + 0.3 * Math.sin(t * 1.7 + a.s1));
    }
    this.write();
  }

  private write(): void {
    const c = this.c, sp = this.spec, t = this.t;
    let k = 0;
    for (let i = 0; i < c.n; i++) {
      const a = this.a[i];
      let beta: number, kz = 1;
      // perched, the wings close to stubs along the flanks: the bird is a plump body seen from above
      if (this.perched) { beta = -0.12; kz = 0.3; }
      else {
        const gliding = Math.sin(t * 0.35 + a.s3 * 3) > sp.glide && a.burst <= 0;
        beta = gliding ? 0.1 + 0.04 * Math.sin(t * 2 + a.s1) : 0.12 + sp.amp * Math.sin(TAU * a.beat);
      }
      M0.makeRotationY(-a.yaw).setPosition(a.px, a.py, a.pz);
      rotZ(M0, a.pitch);
      scaled(M0, a.size * magnify, a.size * magnify, a.size * magnify);
      M1.copy(M0); rotX(M1, -beta); scaled(M1, 1, 1, kz);
      this.mesh.setMatrixAt(k++, M1);
      M1.copy(M0); rotX(M1, Math.PI + beta); scaled(M1, 1, 1, kz);
      this.mesh.setMatrixAt(k++, M1);
    }
    this.shownN = c.n;
    this.mesh.count = k;
    this.mesh.visible = this.on && k > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// The Laughing Fish: each about 1.2 long, three times life so that the grin reads: a blue-grey body, the Joker's white face, a red grin from cheek to cheek.
const FISH_FACE = 0xf4f2ec, FISH_GRIN = 0xd2222e;
function fishShape(): Shape {
  const s = new Shape();
  const segs: Seg[] = [[0.6, 0.015, 0.045, 0.035], [0.48, 0.0, 0.14, 0.09], [0.3, 0.0, 0.19, 0.11], [0.0, 0.0, 0.18, 0.1], [-0.3, 0.0, 0.11, 0.065], [-0.44, 0.0, 0.05, 0.035]];
  const rings = along(segs.map(([x, y]): P => [x, y, 0]), segs.map((g) => g[2]), segs.map((g) => g[3]), 6, [0, 0, 1], Math.PI / 6);
  // the face, white, and the mouth's front red; the body takes the instance's colour
  s.tube(rings.slice(0, 3), (_c, _n, i) => (i < 0 ? FISH_GRIN : FISH_FACE), OWN, true, false);
  s.tube(rings.slice(2), WHITE, PAINT, false, true);
  // the grin: a red band from the mouth's corner back along each cheek, turning up at its end
  const zAt = (x: number, y: number): number => { const [cy, hh, hw] = segAt(segs.slice().reverse(), x); return hw * (1 - 0.5 * Math.min(1, Math.abs(y - cy) / (0.87 * hh))) + 0.007; };
  const grin: [number, number][] = [[0.575, -0.012], [0.5, -0.05], [0.42, -0.055], [0.355, -0.012]];
  for (const side of [1, -1]) {
    for (let i = 0; i + 1 < grin.length; i++) {
      const [x0, y0] = grin[i], [x1, y1] = grin[i + 1], w0 = i === 0 ? 0.012 : 0.022, w1 = 0.022;
      const p = (x: number, y: number): P => [x, y, side * zAt(x, y)];
      s.quad(p(x0, y0 + w0), p(x1, y1 + w1), p(x1, y1 - w1), p(x0, y0 - w0), FISH_GRIN, OWN, [(x0 + x1) / 2, (y0 + y1) / 2, 0]);
    }
    // a black eye with a pale ring
    s.dot([0.43, 0.075, side * zAt(0.43, 0.075)], [0.2, 0.15, side], 0.032, 0x101014);
  }
  // the tail and the fin on its back
  s.two([-0.42, 0, 0], [-0.72, 0.22, 0], [-0.62, 0, 0], WHITE, WHITE, PAINT);
  s.two([-0.42, 0, 0], [-0.62, 0, 0], [-0.72, -0.22, 0], WHITE, WHITE, PAINT);
  s.two([0.08, 0.16, 0], [-0.2, 0.1, 0], [-0.12, 0.3, 0], WHITE, WHITE, PAINT);
  return s;
}

/** A fish's leap: where and when it starts, how long and how high. */
interface Leap { t0: number; dur: number; x: number; z: number; dir: number; len: number; h: number }

class FishSchool implements Flock {
  readonly kind: FlockKind = 'fish';
  readonly mesh: THREE.InstancedMesh;
  readonly tris: number;
  private readonly c: Cloud = { x: 0, y: -40, z: 0, spread: 1, tall: 1.6, n: 0, swirl: 0, heading: 0, stream: 0 };
  private readonly leaps: Leap[];
  private readonly sizes: number[];
  private readonly r: () => number;
  private t = 0;
  private on = false;

  constructor(max: number, kit: Kit, seed: number) {
    const geo = fishShape().build();
    this.tris = geo.getAttribute('position').count / 3;
    this.mesh = new THREE.InstancedMesh(geo, kit.paint, Math.max(1, max));
    this.mesh.name = 'gotham-beasts-fish';
    this.mesh.count = 0;
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.r = rng(seed);
    const col = new THREE.Color(), palette = [0x7f98a6, 0x6f8c96, 0x8aa2a0, 0x92a6b4];
    this.sizes = [];
    this.leaps = [];
    for (let i = 0; i < max; i++) {
      col.set(palette[Math.floor(this.r() * palette.length)]);
      this.mesh.setColorAt(i, col);
      this.sizes.push(0.9 + 0.2 * this.r());
      this.leaps.push({ t0: -this.r() * 3, dur: 1, x: 0, z: 0, dir: 0, len: 2, h: 1.5 });
    }
    kit.group.add(this.mesh);
  }

  set(o: { x: number; y: number; z: number; spread: number; tall?: number; n: number; swirl?: number; heading?: number; stream?: number }): void {
    const c = this.c;
    c.x = o.x; c.y = o.y; c.z = o.z; c.spread = Math.max(0.5, o.spread); c.tall = o.tall ?? 1.6;
    c.n = Math.max(0, Math.min(this.leaps.length, Math.round(o.n))); c.swirl = o.swirl ?? 0; c.heading = o.heading ?? 0; c.stream = clamp(o.stream ?? 0);
  }

  shown(v: boolean): void { this.on = v; this.mesh.visible = v && this.c.n > 0; }

  private next(i: number, now: number): void {
    const c = this.c, L = this.leaps[i], r = this.r;
    L.t0 = now + 0.4 + r() * 2.2;
    L.dur = 0.9 + r() * 0.5;
    L.h = c.tall * (0.7 + 0.5 * r());
    L.len = 1.6 + r() * 1.4;
    if (c.stream > 0.5) {
      // in a line along the heading, each leaping that way
      const u = c.n > 1 ? i / (c.n - 1) : 0.5, along = (0.5 - u) * 2 * c.spread;
      L.x = c.x + Math.cos(c.heading) * along + (r() - 0.5) * 0.6; L.z = c.z + Math.sin(c.heading) * along + (r() - 0.5) * 0.6;
      L.dir = c.heading;
    } else {
      const a = r() * TAU, d = Math.sqrt(r()) * c.spread;
      L.x = c.x + Math.cos(a) * d; L.z = c.z + Math.sin(a) * d;
      // leaping round the middle, as a school wheels
      L.dir = a + Math.PI / 2 + (r() - 0.5) * 1.2 + (c.swirl < 0 ? Math.PI : 0);
    }
  }

  step(dt: number): void {
    this.t += dt;
    const c = this.c, now = this.t;
    let k = 0;
    for (let i = 0; i < c.n; i++) {
      const L = this.leaps[i];
      if (now > L.t0 + L.dur) this.next(i, now);
      const u = (now - L.t0) / L.dur;
      if (u < 0 || u > 1) {
        // under the water between leaps
        M0.makeScale(0, 0, 0).setPosition(c.x, c.y - 3, c.z);
      } else {
        const sink = 0.4, H = L.h + sink;
        const d = u * L.len - L.len / 2, x = L.x + Math.cos(L.dir) * d, z = L.z + Math.sin(L.dir) * d;
        const y = c.y - sink + H * 4 * u * (1 - u), dy = H * 4 * (1 - 2 * u);
        const s = this.sizes[i] * magnify;
        M0.makeRotationY(-L.dir).setPosition(x, y, z);
        rotZ(M0, Math.atan2(dy, L.len));
        // a flick of the tail's end, by turning the whole a little
        M0.multiply(TMP.makeRotationY(0.18 * Math.sin(now * 14 + i)));
        scaled(M0, s, s, s);
      }
      this.mesh.setMatrixAt(k++, M0);
    }
    this.mesh.count = k;
    this.mesh.visible = this.on && k > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
// The animals' kit
// ---------------------------------------------------------------------------

/** Builds the meshes the animals are drawn from, and hands back what makes them. */
export function buildBeasts(k: Build): Beasts {
  const pools = new Map<string, Pool>();
  const kit: Kit = {
    group: k.group, paint: k.mat.vehicle(), pools,
    pool(name, shape) {
      let p = pools.get(name);
      if (!p) { p = new Pool(k.group, name, shape().build(), this.paint); pools.set(name, p); }
      return p;
    },
  };
  const made = new Map<BeastKind, Made>();
  const rigs: Rig[] = [];
  const flocks: (BirdFlock | FishSchool)[] = [];
  let pending = 0, seed = 4401;
  k.each((dt) => { pending += Math.max(0, dt); });
  const beasts: Beasts = {
    beast(kind) {
      let m = made.get(kind);
      if (!m) { m = make(SPECS[kind]()); made.set(kind, m); }
      const r = new Rig(kind, m, kit);
      rigs.push(r);
      return r;
    },
    flock(kind, max) {
      const f = kind === 'fish' ? new FishSchool(max, kit, seed++ * 7919) : new BirdFlock(kind, max, kit, seed++ * 7919);
      flocks.push(f);
      return f;
    },
    commit() {
      const dt = Math.min(pending, 0.1);
      pending = 0;
      for (const r of rigs) if (r.dirty) r.write(dt);
      for (const p of pools.values()) p.flush();
    },
  };
  if (import.meta.env.DEV) devTools(k, beasts, () => rigs, () => flocks, pools);
  return beasts;
}

// ---------------------------------------------------------------------------
// For checking, on the development server: window.gothamBeasts
// ---------------------------------------------------------------------------
//
// gothamBeasts.yard(how) stands one of each animal in a row on the docks' apron
// (at its z, from x 62 eastwards, 4.5 apart, facing south; the seahorse on the
// water just south of the quay), going in the manner `how` (0 standing, 1
// walking, 2 running, 3 sitting, 4 lying; walking by default), and sets each
// flock going over the harbour just south of the quay's edge, the fish leaping
// in the water. how(n) changes their manner, perch() sets the pigeons down on
// the quay's edge and burst() startles them, stream(heading) lines the birds
// up, still(phase) stops the stride at one place for a picture, costs() says
// what they cost, clear() hides them.

const YARD: BeastKind[] = ['ace', 'titus', 'batCow', 'alfredCat', 'blackCat', 'hyena', 'krypto', 'seahorse'];
const YARD_FLOCKS: [FlockKind, number, number, number, number, number][] = [
  // kind, room, x, y, n, spread
  ['bats', 120, 60, 10, 90, 5], ['crows', 24, 70, 11, 16, 4], ['pigeons', 24, 79, 7, 18, 3.5], ['gulls', 12, 88, 12, 8, 6], ['birds', 30, 97, 8, 26, 3], ['fish', 16, 76, -0.9, 12, 4],
];

function devTools(k: Build, beasts: Beasts, rigs: () => Rig[], flocks: () => (BirdFlock | FishSchool)[], pools: Map<string, Pool>): void {
  const lane = SHOW_LANES.apron;
  const row = new Map<BeastKind, Beast>();
  const herd = new Map<FlockKind, Flock>();
  let how = 1, phase = 0, going = false, frozen = -1;
  const FZ = 57;
  const place = (x0: number, gap: number, z: number, y: number): void => {
    YARD.forEach((kind, i) => {
      let b = row.get(kind);
      if (!b) { b = beasts.beast(kind); row.set(kind, b); }
      const x = x0 + i * gap;
      if (kind === 'seahorse' && z === lane.z) b.at(x, -0.9, 54, Math.PI / 2); else b.at(x, y, z, Math.PI / 2);
      b.gait(0, how);
      b.shown(true);
    });
  };
  const fly = (): void => {
    for (const [kind, room, x, y, n, spread] of YARD_FLOCKS) {
      let f = herd.get(kind);
      if (!f) { f = beasts.flock(kind, room); herd.set(kind, f); }
      f.set({ x, y, z: FZ, spread, tall: kind === 'fish' ? 1.6 : spread * 0.35, n, swirl: kind === 'gulls' ? 0.25 : kind === 'bats' ? 0.9 : 0.5 });
      f.shown(true);
    }
  };
  k.each((dt) => {
    if (!going) return;
    const fast = how === 2 ? 1.9 : 1.0;
    phase = frozen >= 0 ? frozen : phase + dt * fast;
    for (const b of row.values()) b.gait(phase, how);
    for (const f of herd.values()) f.step(dt);
  });
  const tools = {
    /** The row starts at x0 and goes east `gap` apart; another z and y stand it elsewhere, for a picture where nothing is overhead. */
    yard(h = 1, x0 = 62, gap = 4.5, z: number = lane.z, y: number = lane.y): string {
      how = h; frozen = -1; going = true;
      place(x0, gap, z, y); fly();
      return `${row.size} animals at z ${z} from x ${x0}, ${gap} apart; ${herd.size} flocks over the harbour at z ${FZ}`;
    },
    how(h: number): void { how = h; },
    still(p: number): void { frozen = p; },
    /** Draws the animals `k` times their size, to see their shapes closer than a picture allows; big(1) puts them back. */
    big(k2: number): void { magnify = k2; for (const r of rigs()) r.dirty = true; },
    go(): void { frozen = -1; },
    perch(): void { herd.get('pigeons')?.set({ x: 79, y: 0.05, z: 49.3, spread: 1.4, n: 18, swirl: 0 }); },
    burst(): void { herd.get('pigeons')?.set({ x: 79, y: 7, z: FZ, spread: 3.5, tall: 1.2, n: 18, swirl: 0.5 }); },
    stream(heading = 0): void {
      for (const [kind, , x, y, n, spread] of YARD_FLOCKS) herd.get(kind)?.set({ x, y, z: FZ, spread: spread * 1.5, tall: 1, n, swirl: 0, heading, stream: 1 });
    },
    clear(): void {
      going = false;
      for (const b of row.values()) b.shown(false);
      for (const f of herd.values()) f.shown(false);
    },
    folds(): Record<string, unknown> { const o: Record<string, unknown> = {}; for (const r of rigs()) o[r.kind] = r.folds; return o; },
    costs(): { animals: Record<string, number>; birds: Record<string, number>; meshes: number } {
      const animals: Record<string, number> = {}, birds: Record<string, number> = {};
      for (const r of rigs()) animals[r.kind] = r.triangles;
      for (const f of flocks()) birds[f.kind] = f.tris;
      const meshes = [...pools.values()].filter((p) => p.mesh.visible).length + flocks().filter((f) => f.mesh.visible).length;
      return { animals, birds, meshes };
    },
  };
  (window as unknown as { gothamBeasts: object }).gothamBeasts = tools;
}
