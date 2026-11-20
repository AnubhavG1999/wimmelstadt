// The flypast: three fighter jets in a tight vic that fly a round over the
// tile for ever, leaning into its turns, and every third time down Kartavya
// Path trail saffron, white and green smoke from Raisina Hill over India Gate
// to the river.
//
// It is the picture that ends the Republic Day parade. The research note says
// to ask before anything of the parade is built: the collector was asked, and
// chose the jets. He asked for them in grey, with a small Indian flag on the
// tail, so that they look real. Only the aircraft and their smoke are here.
// They carry no weapons, no squadron's badge and no number, and the pass has
// no date.
//
// The jet is the tile's own shape and no one real type: a fighter in two
// greys, with a long dark nose, a low canopy, swept wings, two engines and two
// fins that lean outwards. Each of the three flies on his own: the wingmen
// follow the leader's line, each holds his place loosely and on a rhythm of his
// own, and each leans into a turn at his own pace, so that they read as three
// pilots and not one shape. In a turn the outer wingman rides high and the
// inner one low, as a formation does.

import * as THREE from 'three';
import { GeoBuilder, interior, type QuadOpts, type V3 } from '../../engine/geo';
import type { Build } from '../../engine/tile';
import { AXIS_Z } from './plan';

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/** The greys of a fighter: a mid grey above, a pale one below, a darker one on its edges, its panel against the glare and its nose. */
const GREY = 0x8b95a1, BELLY = 0xc3cad2, EDGE = 0x6c7682, RADOME = 0x525a64, DARK = 0x23262c, GLASS = 0x1b2c3e, GLINT = 0x6f9fc4, NOZZLE = 0x3a3d44, FLAME = 0xff9a3a;
/** The paint is seen at night as if the city lit it from below, as the engine's own aircraft are. */
const LIT: QuadOpts = { win: interior(0.32) };
/** The flag on each fin: saffron above, white with the wheel's blue in its middle, green below. */
const FLAG = { saffron: 0xff9933, white: 0xffffff, green: 0x138808, navy: 0x000080 };
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

/** The body, from between its two engines forward to where the nose cone begins: broad and flat at the back, round at the cockpit. */
const BODY: Station[] = [
  { x: -4.7, y: 0.05, w: 0.9, h: 0.42 },
  { x: -3.6, y: 0.05, w: 0.94, h: 0.54 },
  { x: -1.4, y: 0.02, w: 0.9, h: 0.66 },
  { x: 1.2, y: 0.02, w: 0.8, h: 0.64 },
  { x: 2.9, y: -0.04, w: 0.58, h: 0.52 },
  { x: 4.2, y: -0.12, w: 0.3, h: 0.28 },
];
const NOSE: Station[] = [{ x: 4.2, y: -0.12, w: 0.3, h: 0.28 }, { x: 5.05, y: -0.18, w: 0.14, h: 0.13 }, { x: 5.8, y: -0.23, w: 0.02, h: 0.02 }];
/** The canopy: long and low, a teardrop that runs back into the spine. (It was a taller bubble at first, which the collector found too round.) */
const CANOPY: Station[] = [
  { x: -0.2, y: 0.6, w: 0.1, h: 0.04 },
  { x: 1.1, y: 0.68, w: 0.3, h: 0.2 },
  { x: 2.4, y: 0.7, w: 0.34, h: 0.25 },
  { x: 3.3, y: 0.53, w: 0.24, h: 0.16 },
  { x: 3.95, y: 0.3, w: 0.03, h: 0.03 },
];
/** One engine's pipe and the flame behind it, on the jet's middle line: each engine is this, moved to its side. */
const PIPE: Station[] = [{ x: -4.7, y: 0.05, w: 0.4, h: 0.38 }, { x: -5.22, y: 0.05, w: 0.32, h: 0.3 }];
const BLAZE: Station[] = [{ x: -5.23, y: 0.05, w: 0.24, h: 0.23 }, { x: -5.75, y: 0.05, w: 0.19, h: 0.18 }, { x: -6.65, y: 0.05, w: 0.03, h: 0.03 }];
/** How far either engine is from the middle line. */
const ENGINE = 0.46;

/**
 * One jet, with its nose along +x and its middle at the origin, about twelve
 * and a half long with its flames and seven across the wings.
 */
function jet(b: GeoBuilder): void {
  // the body: grey above and pale along the belly, a darker panel on top before the canopy against the glare, and a dark nose cone with its probe
  loft(b, BODY, 8, (up, stretch) => (up < -0.3 ? BELLY : stretch === 4 && up > 0.9 ? EDGE : GREY), LIT);
  cap(b, BODY[0], 8, -1, EDGE);
  loft(b, NOSE, 8, () => RADOME, LIT);
  b.beam([5.75, -0.23, 0], [6.35, -0.26, 0], 0.035, 0.012, DARK);
  // the canopy: dark glass with the sky on its top, in which the instruments glow at night
  loft(b, CANOPY, 6, (up) => (up > 0.5 ? GLINT : GLASS), { win: interior(0.9) });

  for (const side of [-1, 1]) {
    const Z = (z: number): number => z * side;
    // an intake under the wing's root, dark in its mouth, with the strake that runs forward from the wing over it
    b.box(0.2, -0.55, Math.min(Z(0.72), Z(1.3)), 2.1, 0.1, Math.max(Z(0.72), Z(1.3)), GREY, { faces: 'NESWT', ...LIT });
    b.quad([0.2, -0.55, Z(0.72)], [2.1, -0.55, Z(0.72)], [2.1, -0.55, Z(1.3)], [0.2, -0.55, Z(1.3)], [0, -1, 0], BELLY, LIT);
    b.box(2.1, -0.47, Math.min(Z(0.8), Z(1.22)), 2.12, 0.02, Math.max(Z(0.8), Z(1.22)), DARK, { faces: 'E' });
    slab(b, [[3.15, 0.1, Z(0.56)], [2.1, 0.1, Z(1.3)], [1.5, 0.1, Z(1.3)], [1.5, 0.1, Z(0.7)]], [0, -0.1, 0], GREY, BELLY, EDGE, LIT);

    // the wing: swept, darker along its edges, with its lamp at the tip, red on the left and green on the right
    slab(b, [[1.5, 0, Z(0.8)], [-1.5, 0, Z(3.5)], [-2.6, 0, Z(3.5)], [-2.5, 0, Z(0.8)]], [0, -0.14, 0], GREY, BELLY, EDGE, LIT);
    b.box(-2.3, -0.13, Math.min(Z(3.5), Z(3.64)), -1.85, 0.03, Math.max(Z(3.5), Z(3.64)), side < 0 ? 0xff3030 : 0x30ff60, { faces: 'NESWTB', win: interior(5) });

    // the tailplane
    slab(b, [[-3.2, 0.1, Z(0.6)], [-4.3, 0.1, Z(2.05)], [-4.95, 0.1, Z(2.05)], [-4.75, 0.1, Z(0.6)]], [0, -0.1, 0], GREY, BELLY, EDGE, LIT);

    // a fin, leaning outwards, with the flag on both of its faces
    const fin = (f: number, rear: boolean): V3 => [rear ? -4.5 - 0.5 * f : -2.5 - 1.6 * f, 0.4 + 2.0 * f, Z(0.52 + 0.62 * f)];
    slab(b, [fin(0, false), fin(0, true), fin(1, true), fin(1, false)], [0, 0, Z(-0.09)], GREY, GREY, EDGE, LIT);
    /** A place on the fin: `f` up it, `c` from its leading edge back to its trailing edge, and `off` out from its outer face. */
    const onFin = (f: number, c: number, off: number): V3 => {
      const a = fin(f, false), e = fin(f, true);
      return [a[0] + (e[0] - a[0]) * c, a[1] + (e[1] - a[1]) * c, a[2] + (e[2] - a[2]) * c + Z(off)];
    };
    for (const off of [0.012, -0.102]) {
      const out: V3 = [0, 0, Z(off > 0 ? 1 : -1)], shown = { win: interior(0.7) };
      [FLAG.green, FLAG.white, FLAG.saffron].forEach((color, i) => {
        const f0 = 0.5 + i * 0.09, f1 = f0 + 0.09;
        face(b, onFin(f0, 0.2, off), onFin(f0, 0.82, off), onFin(f1, 0.82, off), onFin(f1, 0.2, off), out, color, shown);
      });
      face(b, onFin(0.612, 0.47, off * 1.35), onFin(0.612, 0.55, off * 1.35), onFin(0.658, 0.55, off * 1.35), onFin(0.658, 0.47, off * 1.35), out, FLAG.navy);
    }

    // an engine: a dark pipe, a fire in it that shows at night, and a short flame behind
    b.moved(0, 0, Z(ENGINE), 0, () => {
      loft(b, PIPE, 8, () => NOZZLE);
      cap(b, PIPE[1], 8, -1, DARK);
      loft(b, BLAZE, 6, () => FLAME, { win: interior(5.5) });
    });
  }
}

/** Where each of the three flies, from the leader's middle: [back, to the right], before the jets are drawn larger. */
const VIC: [number, number][] = [[0, 0], [-5.9, -4.7], [-5.9, 4.7]];
/** The colour each trails, in the order of `VIC`: the leader, the left wingman, the right. */
const SMOKE = [WHITE, SAFFRON, GREEN];
/**
 * How far each strays from his place at most, in units: [back, out, up].
 * Three pilots in a vic do not hold their places as one body: each drifts back
 * and closes up again, wider and in again, and up and down a little, slowly
 * and on a rhythm of his own. The collector asked for this: three flying with
 * each other, not three sharing one mind.
 *
 * Each strays only to where the vic is more open, never to where it is
 * tighter: a wingman wider and further back than his place, the leader a
 * little ahead of his and to either side. So being loose never brings two
 * nearer each other than the vic itself does. Up and down they stray both
 * ways, since all three hold the same height.
 */
const STRAY: V3[] = [[0.5, 0.3, 0.25], [2.0, 1.2, 0.5], [1.8, 1.25, 0.55]];
/** How quickly each answers a turn with his lean, and where in the strobe's beat his own lamp flashes. */
const ANSWER = [3, 2.5, 3.6], BLINK = [0, 0.43, 0.87];

/** One jet. */
function one(): THREE.BufferGeometry {
  const b = new GeoBuilder();
  jet(b);
  return b.build();
}

/** The white lamp that flashes under a jet. */
function strobe(): THREE.BufferGeometry {
  const b = new GeoBuilder();
  b.box(-0.7, -0.78, -0.13, -0.44, -0.6, 0.13, 0xffffff, { faces: 'NESWTB' });
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
  // Each jet is a group of his own. The leader's is named `flypast`, and its place is where the flight is.
  const shape = one(), lampShape = strobe(), paint = k.mat.city();
  const flashes: THREE.MeshBasicMaterial[] = [];
  const planes = VIC.map((_, i) => {
    const plane = new THREE.Group();
    plane.name = i === 0 ? 'flypast' : i === 1 ? 'flypast left' : 'flypast right';
    plane.matrixAutoUpdate = false;
    const body = new THREE.Mesh(shape, paint);
    body.frustumCulled = false;
    const flash = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    flashes.push(flash);
    const lamp = new THREE.Mesh(lampShape, flash);
    lamp.frustumCulled = false;
    plane.add(body, lamp);
    k.group.add(plane);
    return plane;
  });

  const trails = new Trails(k.mat.prop({ vertexColors: false, color: 0xffffff }), 440);
  k.group.add(trails.mesh);

  const curve = new THREE.CatmullRomCurve3(ROUND.map(([x, y, z]) => new THREE.Vector3(x, y, z)), true, 'centripetal');
  curve.arcLengthDivisions = 800;
  const total = curve.getLength();

  // They begin in the turn over the Ridge, on a round with smoke, so that whoever opens the tile sees the pass soon.
  let dist = total * 0.93, lap = -1, clock = 0, first = true, smoking = false;
  const yaw = VIC.map(() => 0), lean = VIC.map(() => 0);
  const pos = new THREE.Vector3(), dir = new THREE.Vector3();
  const fwd = new THREE.Vector3(), up = new THREE.Vector3(), right = new THREE.Vector3(), side = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0), grow = new THREE.Vector3(SCALE, SCALE, SCALE);
  const tails = VIC.map(() => new THREE.Vector3()), was = VIC.map(() => new THREE.Vector3()), owed = VIC.map(() => 0), at = new THREE.Vector3();
  /** Where the leader is and which way he points: the smoke goes by him. */
  const lead = new THREE.Vector3(), leadFwd = new THREE.Vector3();
  const wave = (period: number, phase: number): number => Math.sin((Math.PI * 2 * clock) / period + phase);

  k.each((dt, _time, night) => {
    clock += dt;
    dist += SPEED * dt;
    while (dist >= total) { dist -= total; lap++; }
    // A frame in which no time passes leaves each lean as it was, and a jump in time levels them.
    const steady = !first && dt > 0 && dt < 0.25;
    VIC.forEach(([x, z], i) => {
      // each follows the leader's line, as far behind him as his place is, and strays from his place a little, only ever
      // to where the vic is more open: the leader ahead and to either side, a wingman back and outwards
      const [b, r, u] = STRAY[i];
      const fall = (1 + 0.6 * wave(8.3 + 1.9 * i, 1.1 * i) + 0.4 * wave(3.9 + 0.7 * i, 2 + i)) / 2;
      const wide = 0.6 * wave(6.7 + 1.3 * i, 0.6 + i) + 0.4 * wave(2.9 + 0.5 * i, 1.7 * i);
      const back = -x * SCALE + b * (i === 0 ? -fall : fall);
      const aside = z * SCALE + r * (i === 0 ? wide : Math.sign(z) * (1 + wide) / 2);
      const rise = u * (0.6 * wave(7.3 - 0.9 * i, 2.3 * i) + 0.4 * wave(3.3 + 0.4 * i, 0.9 + i));
      const s = (((dist - back) % total) + total) % total;
      curve.getPointAt(s / total, pos);
      curve.getTangentAt(s / total, dir);
      const next = Math.atan2(dir.z, dir.x);
      let d = (next - yaw[i]) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      // each leans into a turn by how fast he is turning, at his own pace, and rocks a little on the air
      const rock = 0.025 * Math.sin(clock * (1.1 + 0.3 * i) + 1.7 * i);
      if (steady) lean[i] += (THREE.MathUtils.clamp((d / dt) * 1.25, -1.05, 1.05) + rock - lean[i]) * (1 - Math.exp(-dt * ANSWER[i]));
      else if (first || dt >= 0.25) lean[i] = 0;
      yaw[i] = next;

      fwd.copy(dir).normalize();
      side.crossVectors(fwd, UP).normalize();
      up.crossVectors(side, fwd).normalize();
      right.copy(side).multiplyScalar(Math.cos(lean[i])).addScaledVector(up, -Math.sin(lean[i]));
      up.multiplyScalar(Math.cos(lean[i])).addScaledVector(side, Math.sin(lean[i]));
      // his place beside the line is across his own wings, so in a turn the outer wingman rides high and the inner one low
      pos.addScaledVector(right, aside).addScaledVector(up, rise);
      planes[i].matrix.makeBasis(fwd, up, right).scale(grow).setPosition(pos);
      planes[i].matrixWorldNeedsUpdate = true;
      if (i === 0) { lead.copy(pos); leadFwd.copy(fwd); }
      // his lamp flashes on his own beat, and shows most at night
      flashes[i].color.setScalar(((clock + BLINK[i]) % 1.3 < 0.1 ? 1 : 0.06) * (0.9 + 3.2 * night));
    });

    // Smoke, by day, on every third round, while they are straight and level over the axis. Each jet leaves its puffs
    // where its pipe has been since the frame before.
    if (dt > 0) {
      const on = steady && night < 0.55 && lap % SMOKE_ON.every === 0 && leadFwd.x > 0.97 && lead.x > SMOKE_ON.x0 && lead.x < SMOKE_ON.x1;
      VIC.forEach((_, i) => {
        tails[i].set(-6.3, 0.05, 0).applyMatrix4(planes[i].matrix);
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
