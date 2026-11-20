// The flypast: three jets in a tight vic that fly a round over the tile for
// ever, leaning into its turns, and every third time down Kartavya Path trail
// saffron, white and green smoke from Raisina Hill over India Gate to the
// river.
//
// It is the picture that ends the Republic Day parade. The research note says
// to ask before anything of the parade is built: the collector was asked, and
// chose the jets. Only the aircraft and their smoke are here. They carry no
// weapons, no roundel and no number, and the pass has no date.
//
// The jets are the tile's own shape: a display team's jet in red over white,
// with a bubble canopy, swept wings, two canted fins and one engine. All three
// are one mesh, which is moved as one body, so that in a turn the outer wingman
// rides high and the inner one low, as a formation does.

import * as THREE from 'three';
import { GeoBuilder, interior, type QuadOpts, type V3 } from '../../engine/geo';
import type { Build } from '../../engine/tile';
import { AXIS_Z } from './plan';

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const RED = 0xd3202b, BELLY = 0xf5f3ee, TRIM = 0xf5f3ee, DARK = 0x23262c, GLASS = 0x1b2c3e, GLINT = 0x6f9fc4, NOZZLE = 0x3a3d44, FLAME = 0xff9a3a;
/** The paint is seen at night as if the city lit it from below, as the engine's own aircraft are. */
const LIT: QuadOpts = { win: interior(0.4) };
/** The smoke: saffron on the left wing, white from the leader, green on the right. */
const SAFFRON = 0xff7d1c, WHITE = 0xfbfaf4, GREEN = 0x23a03c;

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** A flat face with its true normal, turned to look the way `out` points. */
function face(b: GeoBuilder, A: V3, B: V3, C: V3, D: V3, out: V3, color: number, o: QuadOpts = {}): void {
  const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = D[0] - A[0], vy = D[1] - A[1], vz = D[2] - A[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz);
  if (l < 1e-9) { [nx, ny, nz] = out; } else { nx /= l; ny /= l; nz /= l; }
  if (nx * out[0] + ny * out[1] + nz * out[2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
  b.quad(A, B, C, D, [nx, ny, nz], color, o);
}

/** A place along a body: where it is along the nose's line, how high its middle is, and half its width and height there. */
interface Station { x: number; y: number; w: number; h: number }

/**
 * A body drawn through its stations, with `sides` flat faces round it.
 * `colorOf` is asked for each face with how far up it looks, 1 for the top and
 * -1 for the belly, and with which stretch of the body it is on.
 */
function loft(b: GeoBuilder, st: Station[], sides: number, colorOf: (up: number, stretch: number) => number, o: QuadOpts = {}): void {
  const ring = (s: Station): V3[] => Array.from({ length: sides }, (_, i): V3 => {
    const a = ((i + 0.5) / sides) * Math.PI * 2;
    return [s.x, s.y + Math.sin(a) * s.h, Math.cos(a) * s.w];
  });
  for (let i = 0; i + 1 < st.length; i++) {
    const r0 = ring(st[i]), r1 = ring(st[i + 1]);
    for (let k = 0; k < sides; k++) {
      const k2 = (k + 1) % sides, am = ((k + 1) / sides) * Math.PI * 2;
      face(b, r0[k], r0[k2], r1[k2], r1[k], [0, Math.sin(am), Math.cos(am)], colorOf(Math.sin(am), i), o);
    }
  }
}

/** The end of a body, closed: a flat face of `sides` corners at a station, which looks along the nose's line (1) or back along it (-1). */
function cap(b: GeoBuilder, s: Station, sides: number, toward: 1 | -1, color: number, o: QuadOpts = {}): void {
  const at = (i: number): V3 => {
    const a = ((i + 0.5) / sides) * Math.PI * 2;
    return [s.x, s.y + Math.sin(a) * s.h, Math.cos(a) * s.w];
  };
  for (let i = 1; i + 1 < sides; i += 2) face(b, at(0), at(i), at(i + 1), at(Math.min(i + 2, sides - 1)), [toward, 0, 0], color, o);
}

/** A thin plate: the four corners of one face, and the way and how far its other face lies from it. */
function slab(b: GeoBuilder, p: V3[], d: V3, front: number, back: number, rim: number, o: QuadOpts = {}): void {
  const q = p.map((c): V3 => [c[0] + d[0], c[1] + d[1], c[2] + d[2]]);
  const mid: V3 = [0, 0, 0];
  for (const c of [...p, ...q]) { mid[0] += c[0] / 8; mid[1] += c[1] / 8; mid[2] += c[2] / 8; }
  face(b, p[0], p[1], p[2], p[3], [-d[0], -d[1], -d[2]], front, o);
  face(b, q[0], q[1], q[2], q[3], d, back, o);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const out: V3 = [(p[i][0] + p[j][0] + q[i][0] + q[j][0]) / 4 - mid[0], (p[i][1] + p[j][1] + q[i][1] + q[j][1]) / 4 - mid[1], (p[i][2] + p[j][2] + q[i][2] + q[j][2]) / 4 - mid[2]];
    face(b, p[i], p[j], q[j], q[i], out, rim, o);
  }
}

/** The body, from the nozzle forward to where the nose cone begins. */
const BODY: Station[] = [
  { x: -4.7, y: 0.05, w: 0.5, h: 0.46 },
  { x: -3.6, y: 0.05, w: 0.74, h: 0.58 },
  { x: -1.4, y: 0.02, w: 0.86, h: 0.66 },
  { x: 1.2, y: 0.02, w: 0.8, h: 0.64 },
  { x: 2.9, y: -0.04, w: 0.58, h: 0.52 },
  { x: 4.2, y: -0.12, w: 0.3, h: 0.28 },
];
const NOSE: Station[] = [{ x: 4.2, y: -0.12, w: 0.3, h: 0.28 }, { x: 4.9, y: -0.18, w: 0.13, h: 0.12 }, { x: 5.35, y: -0.22, w: 0.02, h: 0.02 }];
const CANOPY: Station[] = [
  { x: 0.5, y: 0.62, w: 0.12, h: 0.06 },
  { x: 1.35, y: 0.8, w: 0.46, h: 0.43 },
  { x: 2.6, y: 0.8, w: 0.49, h: 0.45 },
  { x: 3.4, y: 0.52, w: 0.27, h: 0.21 },
  { x: 3.78, y: 0.36, w: 0.03, h: 0.03 },
];
const PIPE: Station[] = [{ x: -4.7, y: 0.05, w: 0.5, h: 0.46 }, { x: -5.15, y: 0.05, w: 0.4, h: 0.37 }];
const BLAZE: Station[] = [{ x: -5.16, y: 0.05, w: 0.31, h: 0.29 }, { x: -5.7, y: 0.05, w: 0.24, h: 0.22 }, { x: -6.7, y: 0.05, w: 0.03, h: 0.03 }];

/**
 * One jet, with its nose along +x and its middle at the origin, about ten and
 * a half long and seven across the wings.
 */
function jet(b: GeoBuilder): void {
  // the body: red above, white along the belly, dark on top before the canopy against the glare, a dark nose cone with its probe
  loft(b, BODY, 8, (up, stretch) => (up < -0.3 ? BELLY : stretch === 4 && up > 0.9 ? DARK : RED), LIT);
  loft(b, NOSE, 8, () => DARK);
  b.beam([5.3, -0.22, 0], [5.9, -0.25, 0], 0.035, 0.012, DARK);
  // the canopy: a bubble of dark glass with the sky on its top, in which the instruments glow at night
  loft(b, CANOPY, 6, (up) => (up > 0.5 ? GLINT : GLASS), { win: interior(0.9) });
  // a white stripe down its back, from behind the canopy to between the fins
  for (let i = 1; i < 3; i++) {
    const s0 = BODY[i], s1 = BODY[i + 1], y0 = s0.y + Math.sin(Math.PI * 0.375) * s0.h + 0.012, y1 = s1.y + Math.sin(Math.PI * 0.375) * s1.h + 0.012, x1 = i === 2 ? 0.55 : s1.x;
    const ya = y0 + ((y1 - y0) * (x1 - s0.x)) / (s1.x - s0.x);
    face(b, [s0.x, y0, -0.17], [x1, ya, -0.17], [x1, ya, 0.17], [s0.x, y0, 0.17], [0, 1, 0], TRIM, LIT);
  }
  // a white flash along either side, from the cockpit back to the fins
  for (const side of [-1, 1]) {
    for (let i = 1; i + 1 < BODY.length - 1; i++) {
      const s0 = BODY[i], s1 = BODY[i + 1], z0 = Math.cos(Math.PI / 8) * s0.w + 0.012, z1 = Math.cos(Math.PI / 8) * s1.w + 0.012, t = i === 1 ? 0.05 : 0.11;
      face(b, [s0.x, s0.y - t, z0 * side], [s1.x, s1.y - 0.11, z1 * side], [s1.x, s1.y + 0.11, z1 * side], [s0.x, s0.y + t, z0 * side], [0, 0, side], TRIM, LIT);
    }
  }

  for (const side of [-1, 1]) {
    const Z = (z: number): number => z * side;
    // an intake under the wing's root, dark in its mouth, with the strake that runs forward from the wing over it
    b.box(0.2, -0.55, Math.min(Z(0.72), Z(1.3)), 2.1, 0.1, Math.max(Z(0.72), Z(1.3)), RED, { faces: 'NESWT', ...LIT });
    b.quad([0.2, -0.55, Z(0.72)], [2.1, -0.55, Z(0.72)], [2.1, -0.55, Z(1.3)], [0.2, -0.55, Z(1.3)], [0, -1, 0], BELLY, LIT);
    b.box(2.1, -0.47, Math.min(Z(0.8), Z(1.22)), 2.12, 0.02, Math.max(Z(0.8), Z(1.22)), DARK, { faces: 'E' });
    slab(b, [[3.15, 0.1, Z(0.56)], [2.1, 0.1, Z(1.3)], [1.5, 0.1, Z(1.3)], [1.5, 0.1, Z(0.7)]], [0, -0.1, 0], RED, BELLY, RED, LIT);

    // the wing: swept, red above and white below, with a white tip and its lamp, red on the left and green on the right
    slab(b, [[1.5, 0, Z(0.8)], [-1.5, 0, Z(3.5)], [-2.6, 0, Z(3.5)], [-2.5, 0, Z(0.8)]], [0, -0.14, 0], RED, BELLY, BELLY, LIT);
    face(b, [-0.72, 0.012, Z(2.8)], [-1.5, 0.012, Z(3.5)], [-2.6, 0.012, Z(3.5)], [-2.574, 0.012, Z(2.8)], [0, 1, 0], TRIM, LIT);
    // and a white band across it, swept as its leading edge is
    face(b, [0.5, 0.012, Z(0.86)], [-1.36, 0.012, Z(2.5)], [-1.96, 0.012, Z(2.5)], [-0.1, 0.012, Z(0.86)], [0, 1, 0], TRIM, LIT);
    b.box(-2.3, -0.13, Math.min(Z(3.5), Z(3.64)), -1.85, 0.03, Math.max(Z(3.5), Z(3.64)), side < 0 ? 0xff3030 : 0x30ff60, { faces: 'NESWTB', win: interior(5) });

    // the tailplane
    slab(b, [[-3.2, 0.1, Z(0.55)], [-4.3, 0.1, Z(2.0)], [-4.95, 0.1, Z(2.0)], [-4.75, 0.1, Z(0.55)]], [0, -0.1, 0], RED, BELLY, BELLY, LIT);

    // a fin, leaning outwards: red, and white at its head
    const fin = (f: number, rear: boolean): V3 => [rear ? -4.5 - 0.5 * f : -2.5 - 1.6 * f, 0.55 + 1.85 * f, Z(0.5 + 0.62 * f)];
    const part = (f0: number, f1: number, color: number): void => slab(b, [fin(f0, false), fin(f0, true), fin(f1, true), fin(f1, false)], [0, 0, Z(-0.09)], color, color, color, LIT);
    part(0, 0.74, RED);
    part(0.74, 1, TRIM);
  }

  // the engine: a dark pipe, a fire in it that shows at night, and a short flame behind
  loft(b, PIPE, 8, () => NOZZLE);
  cap(b, PIPE[1], 8, -1, DARK);
  loft(b, BLAZE, 6, () => FLAME, { win: interior(5.5) });
}

/** Where each of the three flies, from the leader's middle: [back, to the right]. */
const VIC: [number, number][] = [[0, 0], [-5.9, -4.7], [-5.9, 4.7]];
/** The colour each trails, in the order of `VIC`: the leader, the left wingman, the right. */
const SMOKE = [WHITE, SAFFRON, GREEN];

function formation(): THREE.BufferGeometry {
  const b = new GeoBuilder();
  for (const [x, z] of VIC) b.moved(x, 0, z, 0, () => jet(b));
  return b.build();
}

/** The white lamps that flash under the three, as one shape. */
function strobes(): THREE.BufferGeometry {
  const b = new GeoBuilder();
  for (const [x, z] of VIC) b.box(x - 0.7, -0.78, z - 0.13, x - 0.44, -0.6, z + 0.13, 0xffffff, { faces: 'NESWTB' });
  return b.build();
}

// ---------------------------------------------------------------------------
// Smoke in colour
// ---------------------------------------------------------------------------

interface Puff { p: THREE.Vector3; v: THREE.Vector3; age: number; life: number; size: number; color: number; turn: number }

/**
 * Trails of coloured smoke. The engine's own smoke is grey, rises and is gone
 * in a second: this hangs where it was left for some seconds, swells a little
 * and thins away. Like everything else in the city it is solid shapes: puffs
 * of cotton wool, all drawn at once.
 */
class Trails {
  readonly mesh: THREE.InstancedMesh;
  private readonly puffs: Puff[] = [];
  private readonly room: number;
  private readonly m4 = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly s = new THREE.Vector3();
  private readonly col = new THREE.Color();
  private readonly pale = new THREE.Color(0xffffff);
  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor(material: THREE.Material, room: number) {
    this.room = room;
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), material, room);
    this.mesh.name = 'flypast smoke';
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.setColorAt(0, this.col.set(0xffffff));
  }

  puff(at: THREE.Vector3, color: number): void {
    if (this.puffs.length >= this.room) return;
    this.puffs.push({
      p: at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5)),
      v: new THREE.Vector3(0.25 + Math.random() * 0.3, 0.1 + Math.random() * 0.3, (Math.random() - 0.5) * 0.35),
      age: 0,
      life: 7.6 + Math.random() * 1.6,
      size: 1.6 + Math.random() * 0.5,
      color,
      turn: Math.random() * Math.PI * 2,
    });
  }

  clear(): void {
    this.puffs.length = 0;
    this.mesh.count = 0;
  }

  update(dt: number): void {
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      this.puffs[i].age += dt;
      if (this.puffs[i].age >= this.puffs[i].life) this.puffs.splice(i, 1);
    }
    this.puffs.forEach((f, n) => {
      f.p.addScaledVector(f.v, dt);
      const t = f.age / f.life;
      // it swells fast as it leaves the pipe, goes on swelling slowly, and thins away over the last third of its life
      const size = f.size * (t < 0.06 ? 0.45 + (0.55 * t) / 0.06 : t < 0.66 ? 1 + 0.3 * ((t - 0.06) / 0.6) : 1.3 * (1 - ((t - 0.66) / 0.34) ** 1.5));
      this.q.setFromAxisAngle(this.up, f.turn + f.age * 0.25);
      this.m4.compose(f.p, this.q, this.s.set(size, size * 0.82, size));
      this.mesh.setMatrixAt(n, this.m4);
      this.mesh.setColorAt(n, this.col.setHex(f.color).lerp(this.pale, t * 0.28));
    });
    this.mesh.count = this.puffs.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
// The round they fly
// ---------------------------------------------------------------------------

/**
 * Low and straight down the axis from west to east, a climbing turn to the
 * right over the east bank, back west higher up along the south of the tile,
 * and a turn down over the Ridge to line up again: [x, y, z]. It stays inside
 * the board, and well over everything that stands on it: the dome on Raisina
 * Hill is 22 high with its flag at 25, and the bridge's pylon, which is 48, is
 * far to the north of it.
 */
const ROUND: V3[] = [
  [-72, 35, AXIS_Z], [-36, 33, AXIS_Z], [0, 33, AXIS_Z], [36, 33, AXIS_Z], [64, 35, AXIS_Z],
  [86, 38, AXIS_Z + 10], [96, 42, AXIS_Z + 34], [86, 45, AXIS_Z + 58],
  [60, 46, AXIS_Z + 68], [20, 47, AXIS_Z + 70], [-20, 47, AXIS_Z + 70], [-60, 46, AXIS_Z + 68],
  [-86, 44, AXIS_Z + 58], [-97, 40, AXIS_Z + 34], [-88, 37, AXIS_Z + 10],
];
/** How fast they fly, in units a second: half as fast again as the quickest road. */
const SPEED = 30;
/** Where along the axis the smoke is on, by the leader's place, and on which rounds: every third. */
const SMOKE_ON = { x0: -66, x1: 76, every: 3 };
/** How far apart the puffs of a trail are left. */
const STEP = 1.35;
/** How large the jets are drawn: at 1 each is ten and a half long. A toy jet is about as long as two cars. */
const SCALE = 1.3;

/** The three jets, their lamps and their smoke, flying their round over the tile. */
export function flypast(k: Build): void {
  const craft = new THREE.Group();
  craft.name = 'flypast';
  craft.matrixAutoUpdate = false;
  const jets = new THREE.Mesh(formation(), k.mat.city());
  jets.frustumCulled = false;
  craft.add(jets);
  const flash = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const lamps = new THREE.Mesh(strobes(), flash);
  lamps.frustumCulled = false;
  craft.add(lamps);
  k.group.add(craft);

  const trails = new Trails(k.mat.prop({ vertexColors: false, color: 0xffffff }), 440);
  k.group.add(trails.mesh);

  const curve = new THREE.CatmullRomCurve3(ROUND.map(([x, y, z]) => new THREE.Vector3(x, y, z)), true, 'centripetal');
  curve.arcLengthDivisions = 800;
  const total = curve.getLength();

  // They begin in the turn over the Ridge, on a round with smoke, so that whoever opens the tile sees the pass soon.
  let dist = total * 0.93, lap = -1, yaw = 0, lean = 0, clock = 0, first = true, smoking = false;
  const pos = new THREE.Vector3(), dir = new THREE.Vector3();
  const fwd = new THREE.Vector3(), up = new THREE.Vector3(), right = new THREE.Vector3(), side = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0), grow = new THREE.Vector3(SCALE, SCALE, SCALE);
  const tails = VIC.map(() => new THREE.Vector3()), was = VIC.map(() => new THREE.Vector3()), owed = VIC.map(() => 0), at = new THREE.Vector3();

  k.each((dt, _time, night) => {
    clock += dt;
    dist += SPEED * dt;
    while (dist >= total) { dist -= total; lap++; }
    const u = dist / total;
    curve.getPointAt(u, pos);
    curve.getTangentAt(u, dir);
    const next = Math.atan2(dir.z, dir.x);
    let d = (next - yaw) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    // They lean into a turn together, the more the faster they are turning. A frame in which no time passes leaves the
    // lean as it was, and a jump in time levels them.
    const steady = !first && dt > 0 && dt < 0.25;
    if (steady) lean += (THREE.MathUtils.clamp((d / dt) * 1.25, -1.05, 1.05) - lean) * (1 - Math.exp(-dt * 3));
    else if (first || dt >= 0.25) lean = 0;
    yaw = next;

    fwd.copy(dir).normalize();
    side.crossVectors(fwd, UP).normalize();
    up.crossVectors(side, fwd).normalize();
    right.copy(side).multiplyScalar(Math.cos(lean)).addScaledVector(up, -Math.sin(lean));
    up.multiplyScalar(Math.cos(lean)).addScaledVector(side, Math.sin(lean));
    craft.matrix.makeBasis(fwd, up, right).scale(grow).setPosition(pos);
    craft.matrixWorldNeedsUpdate = true;

    // the lamps under them flash together, and show most at night
    flash.color.setScalar((clock % 1.3 < 0.1 ? 1 : 0.06) * (0.9 + 3.2 * night));

    // Smoke, by day, on every third round, while they are straight and level over the axis. Each jet leaves its puffs
    // where its pipe has been since the frame before.
    if (dt > 0) {
      const on = steady && night < 0.55 && lap % SMOKE_ON.every === 0 && fwd.x > 0.97 && pos.x > SMOKE_ON.x0 && pos.x < SMOKE_ON.x1;
      VIC.forEach(([x, z], i) => {
        tails[i].set(x - 6.3, 0.05, z).applyMatrix4(craft.matrix);
        if (on && smoking) {
          const gap = tails[i].distanceTo(was[i]);
          let along = STEP - owed[i];
          for (; along <= gap; along += STEP) trails.puff(at.copy(was[i]).lerp(tails[i], along / gap), SMOKE[i]);
          owed[i] = gap - (along - STEP);
        } else owed[i] = 0;
        was[i].copy(tails[i]);
      });
      smoking = on;
      if (dt >= 0.25) trails.clear();
      trails.update(Math.min(dt, 0.25));
    }
    first = false;
  });
}
