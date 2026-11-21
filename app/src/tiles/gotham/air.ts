// Gotham's air, which is most of its mood: the Bat-Signal's beam and the
// cloud it shines on, fog lying on the water, steam from the street's grates,
// searchlights, and the waterfall over the Batcave's door. All of it is there
// by day, faintly, and stronger as night falls, since the board gives a tile
// no night and no weather of its own.
//
// Everything here is a see-through mesh of its own in `k.group`, nine draw
// calls in all:
//
// - the cloud: soft wisps, drifting a little about the place the plan gives
//   it, grey by day and barely seen by night until the Signal lights it;
// - the Signal's beam and the glow it makes on the cloud, in one mesh of
//   added light;
// - the disc on the cloud, lying level, which shows from above and below
//   alike: the picture's top points away from the view the tile opens with,
//   which is also the far side for whoever looks up at it from the street.
//   Its four pictures are this tile's own plain drawings on one canvas;
// - fog: banks of mist over the water, kept off the roads, the bridges, the
//   stages and the casino ship;
// - steam from the street's vents, with the engine's `Smoke`;
// - the three searchlights' cones, and the pools of light where they fall;
// - the waterfall's curtain, with streaks that run down it, and the foam and
//   spray where it lands.

import * as THREE from 'three';
import { Smoke } from '../../engine/effects';
import { rng } from '../../engine/geo';
import type { Build } from '../../engine/tile';
import { landAt } from './land';
import type { Place } from './models';
import { CASINO, CREST, SIGNAL, STAGES, VENTS, Y, groundAt, lotOf } from './plan';
import { REGIONS } from './regions';
import { SPANS } from './roads';
import { toRoad } from './space';

/** What the Bat-Signal's disc shows on the cloud. */
export type SignalPicture = 'bat' | 'joker' | 'pumpkin' | 'question';

export interface Air {
  /**
   * The Bat-Signal: how bright its beam and the disc on its cloud are, from 0
   * off to 1 full, and which picture the disc carries. The cloud is always
   * there. The show lights it; left alone it is off.
   */
  signal(f: number, picture?: SignalPicture): void;
  /**
   * A searchlight, by name: where its beam falls on the ground and how bright
   * it is. Left alone, each sweeps a round of its own: `lounge-1` and
   * `lounge-2` cross before the Iceberg Lounge, `blackgate` sweeps the bay
   * from the prison's tower. `null` gives one back to its own round.
   */
  searchlight(id: 'lounge-1' | 'lounge-2' | 'blackgate', to: { x: number; z: number; f: number } | null): void;
  /** The waterfall over the Batcave's door: how far it is parted for the car to come through, from 0 closed to 1 open. */
  waterfall(part: number): void;
  /** A burst of steam from the street at a place, as when a valve is opened: `f` from 0 to 1. */
  burst(x: number, y: number, z: number, f: number): void;
}

type SearchlightId = 'lounge-1' | 'lounge-2' | 'blackgate';

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/** The Signal's light: a warm white. */
const BEAM = new THREE.Color(0xfff4c2);
/** The cloud by day, a grey smudge; by night, nearly the sky's own dark; and where the Signal lights it. */
const CLOUD_DAY = new THREE.Color(0x6c717c), CLOUD_NIGHT = new THREE.Color(0x30343e), CLOUD_LIT = new THREE.Color(0xd8c88e);
/** Fog by day and by night. */
const FOG_DAY = new THREE.Color(0xb3bac6), FOG_NIGHT = new THREE.Color(0x7f8898);
/** A searchlight's light. */
const SEARCH = new THREE.Color(0xf4f1e2);
/** Falling water by day and by night. */
const FALL_DAY = new THREE.Color(0xd5e6ec), FALL_NIGHT = new THREE.Color(0x7d97a6);

/** The way the view the tile opens with looks, on the ground (away from the camera), and its right hand. */
const FWD = new THREE.Vector3(-0.669, 0, -0.743);
const RIGHT = new THREE.Vector3(0.743, 0, -0.669);

// ---------------------------------------------------------------------------
// Pictures drawn on canvases
// ---------------------------------------------------------------------------

const canvas = (w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d') as CanvasRenderingContext2D];
};

const texture = (c: HTMLCanvasElement): THREE.CanvasTexture => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** A round patch, white in the middle and fading to nothing at its edge. */
function roundTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(64, 64);
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return texture(c);
}

/** A wisp of mist: a few soft blobs heaped together, fading to nothing well inside the square. */
function wispTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128), R = rng(0x6a7f09);
  for (let i = 0; i < 9; i++) {
    const a = R() * Math.PI * 2, d = R() * 26, x = 64 + Math.cos(a) * d, y = 64 + Math.sin(a) * d * 0.8, r = 22 + R() * 18;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.34)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  }
  // nothing reaches the square's edge
  g.globalCompositeOperation = 'destination-in';
  const mask = g.createRadialGradient(64, 64, 30, 64, 64, 63);
  mask.addColorStop(0, 'rgba(255,255,255,1)');
  mask.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = mask;
  g.fillRect(0, 0, 128, 128);
  return texture(c);
}

/** Streaks of falling water, light and dark, that repeat up and down. */
function streakTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(64, 128), R = rng(0xfa11);
  g.fillStyle = 'rgba(235,244,248,0.62)';
  g.fillRect(0, 0, 64, 128);
  for (let i = 0; i < 34; i++) {
    const x = R() * 64, w = 1 + R() * 2.5, y = R() * 128, h = 20 + R() * 70, a = 0.3 + R() * 0.6;
    g.fillStyle = R() > 0.35 ? `rgba(255,255,255,${a})` : `rgba(150,185,200,${a * 0.6})`;
    // drawn twice so that it repeats across the top and the bottom
    g.fillRect(x, y, w, h);
    g.fillRect(x, y - 128, w, h);
  }
  const t = texture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** The four pictures the disc can carry, one in each quarter of one canvas, each on a round field that the disc's oval stretches. */
const QUARTERS: Record<SignalPicture, [number, number]> = { bat: [0, 0], joker: [1, 0], pumpkin: [0, 1], question: [1, 1] };

function field(g: CanvasRenderingContext2D, fill: string, rim: string): void {
  g.beginPath();
  g.arc(0, 0, 118, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = 7;
  g.strokeStyle = rim;
  g.stroke();
  // a soft edge outside the rim
  const grad = g.createRadialGradient(0, 0, 118, 0, 0, 128);
  grad.addColorStop(0, rim);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.beginPath();
  g.arc(0, 0, 128, 0, Math.PI * 2);
  g.arc(0, 0, 118, 0, Math.PI * 2, true);
  g.fillStyle = grad;
  g.fill();
}

/** A plain bat's outline, wings spread, their lower edges scalloped: the tile's own drawing, no era's emblem. */
function drawBat(g: CanvasRenderingContext2D): void {
  field(g, '#f3da68', '#d1a93a');
  type Seg = { q?: [number, number]; p: [number, number] };
  // the right half, from the middle of the head round the wing to the tail
  const start: [number, number] = [0, -30];
  const right: Seg[] = [
    { p: [7, -30] }, { p: [13, -52] }, { p: [19, -26] },
    { q: [25, -24], p: [31, -22] },
    { q: [62, -52], p: [106, -30] },
    { q: [87, -14], p: [83, 6] },
    { q: [69, -6], p: [59, 10] },
    { q: [41, 8], p: [35, 30] },
    { q: [15, 22], p: [9, 28] },
    { p: [0, 46] },
  ];
  g.beginPath();
  g.moveTo(start[0], start[1]);
  for (const s of right) s.q ? g.quadraticCurveTo(s.q[0], s.q[1], s.p[0], s.p[1]) : g.lineTo(s.p[0], s.p[1]);
  // the left half, back the other way
  for (let i = right.length - 1; i >= 0; i--) {
    const to = i > 0 ? right[i - 1].p : start, s = right[i];
    s.q ? g.quadraticCurveTo(-s.q[0], s.q[1], -to[0], to[1]) : g.lineTo(-to[0], to[1]);
  }
  g.closePath();
  g.fillStyle = '#141414';
  g.fill();
  g.beginPath();
  g.ellipse(0, 0, 15, 30, 0, 0, Math.PI * 2);
  g.fill();
}

/** A grinning face, in ink on a pale field. */
function drawGrin(g: CanvasRenderingContext2D): void {
  field(g, '#efe9cf', '#7b4aa0');
  const INK = '#18181a';
  g.fillStyle = INK;
  g.strokeStyle = INK;
  g.lineCap = 'round';
  // eyes, narrowed, and brows raised high at their outer ends
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(s * 40, -28, 19, 10, s * 0.28, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(s * 16, -48);
    g.quadraticCurveTo(s * 40, -60, s * 66, -70);
    g.stroke();
  }
  // a short nose
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(0, -18);
  g.quadraticCurveTo(-8, 0, 2, 4);
  g.stroke();
  // the grin, from cheek to cheek
  const grin = new Path2D('M -92 6 Q 0 34 92 6 Q 64 84 0 88 Q -64 84 -92 6 Z');
  g.fill(grin);
  g.save();
  g.clip(grin);
  g.fillStyle = '#f7f3e2';
  g.fill(new Path2D('M -96 4 Q 0 36 96 4 L 90 28 Q 0 58 -90 28 Z'));
  g.lineWidth = 3;
  for (let x = -84; x <= 84; x += 14) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 60);
    g.stroke();
  }
  g.restore();
}

/** A jack-o'-lantern's face on an orange field. */
function drawPumpkin(g: CanvasRenderingContext2D): void {
  field(g, '#f08a24', '#b85a12');
  g.save();
  g.beginPath();
  g.arc(0, 0, 116, 0, Math.PI * 2);
  g.clip();
  g.strokeStyle = 'rgba(176,82,14,0.8)';
  g.lineWidth = 6;
  for (const rx of [36, 78]) {
    g.beginPath();
    g.ellipse(0, 6, rx, 120, 0, 0, Math.PI * 2);
    g.stroke();
  }
  g.restore();
  // the stem
  g.fillStyle = '#4e6a2b';
  g.fillRect(-11, -118, 22, 28);
  const FACE = '#2a1406';
  g.fillStyle = FACE;
  for (const s of [-1, 1]) g.fill(new Path2D(`M ${s * 62} -18 L ${s * 20} -18 L ${s * 42} -60 Z`));
  g.fill(new Path2D('M -13 10 L 13 10 L 0 -12 Z'));
  g.fill(new Path2D('M -80 24 L -56 40 L -42 27 L -23 48 L 0 33 L 23 48 L 42 27 L 56 40 L 80 24 Q 62 92 0 94 Q -62 92 -80 24 Z'));
}

/** A question mark on a green field. */
function drawQuestion(g: CanvasRenderingContext2D): void {
  field(g, '#45ae4d', '#2b7a33');
  g.strokeStyle = '#0f2410';
  g.fillStyle = '#0f2410';
  g.lineWidth = 30;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(0, -36, 44, Math.PI * 1.06, Math.PI * 2.25, false);
  g.quadraticCurveTo(0, 2, 0, 30);
  g.stroke();
  g.beginPath();
  g.arc(0, 76, 17, 0, Math.PI * 2);
  g.fill();
}

function pictureTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(512, 512);
  const draw: Record<SignalPicture, (g: CanvasRenderingContext2D) => void> = { bat: drawBat, joker: drawGrin, pumpkin: drawPumpkin, question: drawQuestion };
  for (const id of Object.keys(QUARTERS) as SignalPicture[]) {
    const [col, row] = QUARTERS[id];
    g.save();
    g.translate(col * 256 + 128, row * 256 + 128);
    draw[id](g);
    g.restore();
  }
  const t = texture(c);
  t.repeat.set(0.5, 0.5);
  t.anisotropy = 4;
  return t;
}

// ---------------------------------------------------------------------------
// Meshes built from arrays
// ---------------------------------------------------------------------------

/** Positions, colours and corners, gathered and then made into one geometry. */
class Gather {
  readonly pos: number[] = [];
  readonly col: number[] = [];
  readonly uv: number[] = [];
  readonly idx: number[] = [];
  vert(p: THREE.Vector3, c: THREE.Color, k: number, u = 0, v = 0): number {
    this.pos.push(p.x, p.y, p.z);
    this.col.push(c.r * k, c.g * k, c.b * k);
    this.uv.push(u, v);
    return this.pos.length / 3 - 1;
  }
  geometry(): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    geo.setIndex(this.idx);
    return geo;
  }
}

/** Light added to what lies behind it: a beam, a glow. */
const added = (extra: THREE.MeshBasicMaterialParameters = {}): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false, ...extra });

/** Every mesh of the air, for the console on the development server. */
const MESHES: THREE.Mesh[] = [];

/** A thing of the air: drawn after what is solid, never culled, never picked. */
function aloft<T extends THREE.Mesh>(k: Build, m: T, name: string, order: number): T {
  m.name = name;
  m.frustumCulled = false;
  m.renderOrder = order;
  m.raycast = () => {};
  k.group.add(m);
  MESHES.push(m);
  return m;
}

// ---------------------------------------------------------------------------
// The Bat-Signal and its cloud
// ---------------------------------------------------------------------------

/** The disc's half-widths: across the view the tile opens with, and along it. */
const DISC = { a: 6.2, b: 5.6, y: SIGNAL.cloud.c[1] - 0.4 };

/** A point on the disc's oval, `px` across and `py` along, each from -1 to 1. */
const onDisc = (px: number, py: number, y: number, grow = 1): THREE.Vector3 =>
  new THREE.Vector3(SIGNAL.cloud.c[0], y, SIGNAL.cloud.c[2]).addScaledVector(RIGHT, px * DISC.a * grow).addScaledVector(FWD, py * DISC.b * grow);

interface Signal { set(f: number, picture?: SignalPicture): void; update(t: number, night: number): void }

function buildSignal(k: Build, wisp: THREE.Texture): Signal {
  const C = SIGNAL.cloud, R = rng(0xba75);

  // --- the cloud: wisps lying nearly level, at a few heights, within its oval
  interface Wisp { x: number; y: number; z: number; a: number; b: number; yaw: number; tilt: number; ph: number; w: number; near: number }
  const wisps: Wisp[] = [];
  for (let i = 0; i < 16; i++) {
    const size = i < 4 ? 5.5 + R() * 1.5 : 2.6 + R() * 2.6;
    const ang = R() * Math.PI * 2, d = Math.sqrt(R()) * Math.max(0, 1 - size / 8.5);
    const x = C.c[0] + Math.cos(ang) * d * (C.rx - size * 0.55), z = C.c[2] + Math.sin(ang) * d * (C.rz - size * 0.45);
    const y = C.c[1] - 2 + R() * 4.2;
    wisps.push({ x, y, z, a: size, b: size * (0.55 + R() * 0.3), yaw: R() * Math.PI, tilt: (R() - 0.5) * 0.22, ph: R() * 10, w: 0.05 + R() * 0.05, near: 1 - Math.min(1, Math.hypot((x - C.c[0]) / C.rx, (z - C.c[2]) / C.rz)) });
  }
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: wisp, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
  const cloud = aloft(k, new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), cloudMat, wisps.length), 'gotham-signal-cloud', 3);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
  wisps.forEach((_, i) => cloud.setColorAt(i, CLOUD_DAY));

  // --- the beam from the lamp to the disc, a brighter core inside it, and the glow round the disc on the cloud
  const lamp = new THREE.Vector3(...SIGNAL.lamp);
  const beam = new Gather(), N = 24;
  const cone = (r0: number, grow: number, k0: number, k1: number): void => {
    const base = beam.pos.length / 3;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2, cx = Math.cos(a), sz = Math.sin(a);
      beam.vert(lamp.clone().addScaledVector(RIGHT, cx * r0).addScaledVector(FWD, sz * r0), BEAM, k0);
      beam.vert(onDisc(cx, sz, DISC.y - 0.05, grow), BEAM, k1);
    }
    for (let i = 0; i < N; i++) beam.idx.push(base + i * 2, base + i * 2 + 1, base + i * 2 + 3, base + i * 2, base + i * 2 + 3, base + i * 2 + 2);
  };
  cone(0.6, 1, 0.5, 0.2);
  cone(0.32, 0.5, 0.85, 0.22);
  // the glow: dim over the picture, bright at its rim, fading out into the cloud
  {
    const y = DISC.y + 0.12, mid = beam.vert(onDisc(0, 0, y), BEAM, 0.12);
    const ring = (grow: number, kk: number): number => { const at = beam.pos.length / 3; for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; beam.vert(onDisc(Math.cos(a), Math.sin(a), y, grow), BEAM, kk); } return at; };
    const r1 = ring(0.96, 0.75), r2 = ring(1.8, 0);
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      beam.idx.push(mid, r1 + i, r1 + j, r1 + i, r2 + i, r2 + j, r1 + i, r2 + j, r1 + j);
    }
  }
  const beamMat = added({ vertexColors: true });
  const beamMesh = aloft(k, new THREE.Mesh(beam.geometry(), beamMat), 'gotham-signal-beam', 5);

  // --- the disc, lying level, one face seen from both sides: the picture reads the same from above and from below
  const disc = new Gather();
  {
    const mid = disc.vert(onDisc(0, 0, DISC.y), BEAM, 1, 0.5, 0.5), M = 40;
    for (let i = 0; i < M; i++) {
      const a = (i / M) * Math.PI * 2, cx = Math.cos(a), sz = Math.sin(a);
      disc.vert(onDisc(cx, sz, DISC.y), BEAM, 1, 0.5 + 0.5 * cx, 0.5 + 0.5 * sz);
    }
    for (let i = 0; i < M; i++) disc.idx.push(mid, mid + 1 + i, mid + 1 + ((i + 1) % M));
  }
  const pictures = pictureTexture();
  const discMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: pictures, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false });
  // drawn after the beam and the glow, so that the light under it does not wash the picture out
  const discMesh = aloft(k, new THREE.Mesh(disc.geometry(), discMat), 'gotham-signal-disc', 6);
  discMesh.geometry.deleteAttribute('color');

  let f = 0;
  const show = (pic: SignalPicture): void => {
    const [c, r] = QUARTERS[pic];
    pictures.offset.set(c * 0.5, r === 0 ? 0.5 : 0);
  };
  show('bat');

  return {
    set(v, picture) {
      f = Math.min(1, Math.max(0, v));
      if (picture) show(picture);
    },
    update(t, night) {
      // the wisps drift about their places, and never leave them
      wisps.forEach((w, i) => {
        p.set(w.x + Math.sin(t * w.w + w.ph) * 0.9, w.y + Math.sin(t * w.w * 0.7 + w.ph * 2) * 0.25, w.z + Math.cos(t * w.w * 0.8 + w.ph) * 0.6);
        q.setFromEuler(e.set(w.tilt, w.yaw + t * w.w * 0.3, 0, 'YXZ'));
        m4.compose(p, q, s.set(w.a * 2, 1, w.b * 2));
        cloud.setMatrixAt(i, m4);
        col.copy(CLOUD_DAY).lerp(CLOUD_NIGHT, night).lerp(CLOUD_LIT, Math.min(1, f * (0.25 + 0.75 * w.near) * (0.35 + 0.65 * night)));
        cloud.setColorAt(i, col);
      });
      cloud.instanceMatrix.needsUpdate = true;
      if (cloud.instanceColor) cloud.instanceColor.needsUpdate = true;
      // a smudge by day; by night nearly gone until it is lit
      cloudMat.opacity = 0.38 - 0.18 * night + f * 0.14 * night;

      const lit = f > 0.001;
      beamMesh.visible = discMesh.visible = lit;
      beamMat.opacity = f * (0.14 + 0.42 * night);
      discMat.opacity = f * (0.7 + 0.25 * night);
      discMat.color.setScalar(0.9 + 0.8 * night);
    },
  };
}

// ---------------------------------------------------------------------------
// Fog on the water
// ---------------------------------------------------------------------------

/** How far a place is from a line between two places. */
const toLine = (x: number, z: number, a: [number, number], b: [number, number]): number => {
  const vx = b[0] - a[0], vz = b[1] - a[1], l = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l));
  return Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t);
};

/** Whether a bank of fog this wide may lie here: on open water all round, clear of roads, bridges, stages and the casino ship. */
function fogFits(x: number, z: number, r: number): boolean {
  if (Math.abs(x) > 104 - r || Math.abs(z) > 113 - r) return false;
  // its soft edge fades out at about four fifths of its width, and it drifts a little
  const room = r * 0.85 + 0.9;
  if (groundAt(x, z) >= 0) return false;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    for (const d of [room, room * 0.55]) if (groundAt(x + Math.cos(a) * d, z + Math.sin(a) * d) >= 0) return false;
  }
  if (toRoad(x, z) < room + 3.5) return false;
  for (const sp of Object.values(SPANS)) if (toLine(x, z, sp.a, sp.b) < sp.half + room + 0.5) return false;
  for (const st of Object.values(STAGES)) if (x > st.x0 - room && x < st.x1 + room && z > st.z0 - room && z < st.z1 + room) return false;
  if (Math.hypot(x - CASINO.c[0], z - CASINO.c[1]) < CASINO.length / 2 + room + 1) return false;
  return true;
}

function buildFog(k: Build, wisp: THREE.Texture): (t: number, night: number) => void {
  const R = rng(0xf0c), banks: { x: number; z: number; y: number; r: number; asp: number; yaw: number; ph: number; w: number }[] = [];
  for (let x = -102; x <= 102; x += 3.5) {
    for (let z = -111; z <= 111; z += 3.5) {
      const jx = x + (R() - 0.5) * 2, jz = z + (R() - 0.5) * 2;
      if (R() < 0.3) continue;
      // as wide a bank as the water here has room for
      let r = 3.6 + R() * 4.4;
      while (r >= 2.2 && !fogFits(jx, jz, r)) r -= 0.6;
      if (r < 2.2) continue;
      banks.push({ x: jx, z: jz, y: Y.water + 0.85 + R() * 0.9, r, asp: 0.55 + R() * 0.35, yaw: R() * Math.PI, ph: R() * 20, w: 0.04 + R() * 0.05 });
    }
  }
  // no more than so many, taken evenly from all the water
  while (banks.length > 130) banks.splice(Math.floor(R() * banks.length), 1);
  const mat = new THREE.MeshBasicMaterial({ color: FOG_DAY.clone(), map: wisp, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
  const mesh = aloft(k, new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat, Math.max(1, banks.length)), 'gotham-fog', 2);
  mesh.count = banks.length;
  // kept out of the mirror image of the wet streets and the water, as the lamps' pools are
  mesh.layers.set(1);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), s = new THREE.Vector3();
  return (t, night) => {
    banks.forEach((b, i) => {
      // each drifts slowly about its place, turning and breathing
      p.set(b.x + Math.sin(t * b.w + b.ph) * 0.8, b.y, b.z + Math.cos(t * b.w * 0.8 + b.ph) * 0.8);
      q.setFromAxisAngle(up, b.yaw + Math.sin(t * b.w * 0.5 + b.ph) * 0.5);
      const br = 1 + 0.08 * Math.sin(t * b.w * 2 + b.ph);
      m4.compose(p, q, s.set(b.r * 2 * br, 1, b.r * 2 * b.asp * br));
      mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
    // thicker towards night
    mat.opacity = 0.22 + 0.3 * night;
    mat.color.copy(FOG_DAY).lerp(FOG_NIGHT, night);
  };
}

// ---------------------------------------------------------------------------
// Steam from the street
// ---------------------------------------------------------------------------

interface Steam { burst(x: number, y: number, z: number, f: number): void; update(dt: number, night: number): void }

function buildSteam(k: Build): Steam {
  const R = rng(0x57ea), smoke = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false }), 140);
  aloft(k, smoke.mesh, 'gotham-steam', 3);
  const vents = VENTS.map(([x, z]) => ({ x, y: landAt(x, z) + 0.12, z, due: R() * 2 }));
  const bursts: { x: number; y: number; z: number; f: number; t: number; owe: number }[] = [];
  const at = new THREE.Vector3(), drift = new THREE.Vector3(0.22, 0, 0.1), jet = new THREE.Vector3();
  return {
    burst(x, y, z, f) {
      bursts.push({ x, y, z, f: Math.min(1, Math.max(0, f)), t: 0, owe: 0 });
      if (bursts.length > 4) bursts.shift();
    },
    update(dt, night) {
      for (const v of vents) {
        v.due -= dt;
        if (v.due > 0) continue;
        // a wisp now and then by day, a steady plume by night
        v.due = (1.3 - 0.85 * night) * (0.7 + 0.6 * R());
        smoke.puff(at.set(v.x + (R() - 0.5) * 0.4, v.y, v.z + (R() - 0.5) * 0.4), drift, 0.42 + 0.3 * night, 0.95);
      }
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.t += dt;
        if (b.t > 1.6) { bursts.splice(i, 1); continue; }
        // a jet that rises hard and then dies down
        b.owe += dt * (10 + 26 * b.f) * (b.t < 1.1 ? 1 : 0.3);
        while (b.owe >= 1) {
          b.owe -= 1;
          smoke.jet(at.set(b.x, b.y + 0.1, b.z), jet.set(0, 4 + 6 * b.f, 0), 0.55 + 0.6 * b.f);
          if (R() < 0.3) smoke.puff(at.set(b.x, b.y + 1 + R() * 2 * b.f, b.z), drift, 0.7 + 0.5 * b.f, 0.97);
        }
      }
      smoke.update(dt);
    },
  };
}

// ---------------------------------------------------------------------------
// Searchlights
// ---------------------------------------------------------------------------

interface Light { id: SearchlightId; lamp: THREE.Vector3; to: { x: number; z: number; f: number } | null; round(t: number, end: THREE.Vector3): boolean }

/** A place another file gives, or a fallback. */
const placeOf = (file: string, name: string): Place | undefined => REGIONS[file]?.PLACES?.[name];

function lights(): Light[] {
  const lot = lotOf('iceberg-lounge'), gaol = lotOf('blackgate');
  const p1 = placeOf('waterfront', 'searchlight1'), p2 = placeOf('waterfront', 'searchlight2'), pg = placeOf('bay', 'searchlight');
  const l1 = p1 ? new THREE.Vector3(p1.x, p1.y + 0.35, p1.z) : new THREE.Vector3(lot.x1 - 0.8, lot.base + 1.8, lot.z1 - 4);
  const l2 = p2 ? new THREE.Vector3(p2.x, p2.y + 0.35, p2.z) : new THREE.Vector3(lot.x1 - 4, lot.base + 1.8, lot.z1 - 0.8);
  const lg = pg ? new THREE.Vector3(pg.x, pg.y, pg.z) : new THREE.Vector3(gaol.x1, gaol.top, gaol.z1);
  // the two before the Lounge lean out over the forecourt, the way its door faces, and swing across each other
  const h = p1?.h ?? Math.PI / 4, out = new THREE.Vector3(Math.cos(h), 0, Math.sin(h));
  const along = l2.clone().sub(l1).setY(0).normalize(), up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
  const sky = (lamp: THREE.Vector3, sign: number, ph: number) => (t: number, end: THREE.Vector3): boolean => {
    const swing = 0.2 + 0.15 * Math.sin(t * 0.33 + ph);
    d.copy(up).addScaledVector(along, sign * swing).addScaledVector(out, 0.26 + 0.1 * Math.sin(t * 0.21 + ph * 2)).normalize();
    end.copy(lamp).addScaledVector(d, 46);
    return false;
  };
  // Blackgate's sweeps the harbour north-west of its tower, round and round
  const c = { x: lg.x - 20, z: lg.z - 24 };
  return [
    { id: 'lounge-1', lamp: l1, to: null, round: sky(l1, 1, 0) },
    { id: 'lounge-2', lamp: l2, to: null, round: sky(l2, -1, 1.9) },
    {
      id: 'blackgate', lamp: lg, to: null,
      round(t, end) {
        const a = t * 0.22;
        const x = c.x + Math.cos(a) * 10, z = c.z + Math.sin(a) * 7;
        end.set(x, landAt(x, z), z);
        return true;
      },
    },
  ];
}

interface Searchlights { set(id: SearchlightId, to: { x: number; z: number; f: number } | null): void; update(t: number, night: number): void }

function buildSearchlights(k: Build, round: THREE.Texture): Searchlights {
  const L = lights(), N = 12;
  // each light: a ring at the lamp, a ring where it ends, and a lens over the lamp
  const per = N * 2 + N + 1;
  const pos = new Float32Array(L.length * per * 3), col = new Float32Array(L.length * per * 3), idx: number[] = [];
  L.forEach((_, j) => {
    const o = j * per;
    for (let i = 0; i < N; i++) {
      const a = o + i * 2, b = o + ((i + 1) % N) * 2;
      idx.push(a, a + 1, b + 1, a, b + 1, b);
      const lens = o + N * 2;
      idx.push(lens, lens + 1 + i, lens + 1 + ((i + 1) % N));
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setIndex(idx);
  const mat = added({ vertexColors: true, opacity: 1 });
  aloft(k, new THREE.Mesh(geo, mat), 'gotham-searchlights', 5);

  // the pools of light where they fall
  const poolMat = added({ map: round, opacity: 1, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const pools = aloft(k, new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), poolMat, L.length), 'gotham-searchlight-pools', 2);
  pools.layers.set(1);
  L.forEach((_, i) => pools.setColorAt(i, SEARCH));

  const end = new THREE.Vector3(), d = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), v = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), c = new THREE.Color();
  const put = (n: number, p: THREE.Vector3, k: number): void => {
    pos[n * 3] = p.x; pos[n * 3 + 1] = p.y; pos[n * 3 + 2] = p.z;
    col[n * 3] = SEARCH.r * k; col[n * 3 + 1] = SEARCH.g * k; col[n * 3 + 2] = SEARCH.b * k;
  };
  return {
    set(id, to) {
      const l = L.find((x) => x.id === id);
      if (l) l.to = to ? { x: to.x, z: to.z, f: Math.min(1, Math.max(0, to.f)) } : null;
    },
    update(t, night) {
      L.forEach((l, j) => {
        let ground: boolean, f = 1;
        if (l.to) {
          end.set(l.to.x, landAt(l.to.x, l.to.z), l.to.z);
          ground = true;
          f = l.to.f;
        } else ground = l.round(t, end);
        const k0 = f * (0.05 + 0.5 * night);
        d.subVectors(end, l.lamp);
        const len = d.length();
        d.multiplyScalar(1 / Math.max(len, 1e-3));
        a.crossVectors(d, Math.abs(d.y) > 0.95 ? RIGHT : up).normalize();
        b.crossVectors(d, a).normalize();
        const r0 = 0.32, r1 = ground ? 2.2 + len * 0.02 : 3.2, o = j * per;
        for (let i = 0; i < N; i++) {
          const ang = (i / N) * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang);
          put(o + i * 2, v.copy(l.lamp).addScaledVector(a, ca * r0).addScaledVector(b, sa * r0), k0 * 0.9);
          put(o + i * 2 + 1, v.copy(end).addScaledVector(a, ca * r1).addScaledVector(b, sa * r1), ground ? k0 * 0.3 : 0);
        }
        // the lens, facing along the beam
        const lens = o + N * 2;
        put(lens, v.copy(l.lamp).addScaledVector(d, 0.05), f * (0.6 + 1.6 * night));
        for (let i = 0; i < N; i++) {
          const ang = (i / N) * Math.PI * 2;
          put(lens + 1 + i, v.copy(l.lamp).addScaledVector(d, 0.05).addScaledVector(a, Math.cos(ang) * 0.42).addScaledVector(b, Math.sin(ang) * 0.42), f * 0.3 * night);
        }
        // the pool: stretched the way the beam comes in, the more the lower it comes
        if (ground) {
          const flat = Math.hypot(d.x, d.z), stretch = Math.min(2.4, 1 / Math.max(0.42, -d.y));
          q.setFromAxisAngle(up, flat > 1e-3 ? -Math.atan2(d.z, d.x) : 0);
          m4.compose(v.set(end.x, end.y + 0.08, end.z), q, s.set(r1 * 2.2 * stretch, 1, r1 * 2.2));
          pools.setColorAt(j, c.copy(SEARCH).multiplyScalar(f * (0.12 + 0.8 * night)));
        } else m4.makeScale(0, 0, 0);
        pools.setMatrixAt(j, m4);
      });
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      pools.instanceMatrix.needsUpdate = true;
      if (pools.instanceColor) pools.instanceColor.needsUpdate = true;
    },
  };
}

// ---------------------------------------------------------------------------
// The waterfall over the Batcave's door
// ---------------------------------------------------------------------------

interface Fall { part(p: number): void; update(dt: number, t: number, night: number): void }

function buildWaterfall(k: Build, round: THREE.Texture): Fall {
  const cove = CREST.cove, mid = (cove.x0 + cove.x1) / 2;
  const top = placeOf('bristol', 'fallTop'), foot = placeOf('bristol', 'fallFoot');
  const X = top?.x ?? foot?.x ?? mid;
  const Y0 = top?.y ?? Y.crest, Y1 = (foot?.y ?? Y.cave) + 0.02;
  // it hangs just in front of the lip and of the tunnel's portal, and leans out a little as it falls
  const Z0 = (top?.z ?? cove.z0 + 0.7) + 0.15, Z1 = (foot?.z ?? cove.z0 + 1.3) - 0.35;
  /** Half the curtain's width at a share of the way down: as wide as the lip at its top, spreading as it falls. */
  const half = (s: number): number => 2.2 + 0.85 * s;
  const COLS = 4, ROWS = 8;

  // --- the curtain: two halves, which draw aside from the middle
  const per = (COLS + 1) * (ROWS + 1);
  const pos = new Float32Array(per * 2 * 3), uv = new Float32Array(per * 2 * 2), idx: number[] = [];
  for (let h = 0; h < 2; h++) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const a = h * per + r * (COLS + 1) + c, b = a + 1, d = a + COLS + 1, e = d + 1;
        idx.push(a, d, e, a, e, b);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const streaks = streakTexture();
  const mat = new THREE.MeshBasicMaterial({ color: FALL_DAY.clone(), map: streaks, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
  aloft(k, new THREE.Mesh(geo, mat), 'gotham-waterfall', 3);

  // --- the foam where it lands and the spray over it, under each half
  const fpos = new Float32Array(2 * 2 * 4 * 3), fuv = new Float32Array(2 * 2 * 4 * 2), fidx: number[] = [];
  for (let i = 0; i < 4; i++) {
    const o = i * 4;
    fidx.push(o, o + 1, o + 2, o, o + 2, o + 3);
    fuv.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8);
  }
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3).setUsage(THREE.DynamicDrawUsage));
  fgeo.setAttribute('uv', new THREE.BufferAttribute(fuv, 2));
  fgeo.setIndex(fidx);
  const fmat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: round, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
  aloft(k, new THREE.Mesh(fgeo, fmat), 'gotham-waterfall-foam', 4);

  let part = 0, dirty = true;
  /** Where each half's inner and outer edges are at a share of the way down. */
  const edges = (hf: number, s: number): [number, number] => {
    const gap = 1.85 * part, outer = half(s) + 0.45 * part;
    return hf === 0 ? [X - outer, X - gap] : [X + gap, X + outer];
  };
  const shape = (): void => {
    for (let h = 0; h < 2; h++) {
      for (let r = 0; r <= ROWS; r++) {
        const s = r / ROWS, [e0, e1] = edges(h, s);
        // it falls away from the lip on a curve, and hangs nearly straight below
        const y = Y0 - (Y0 - Y1) * s, z = Z0 + (Z1 - Z0) * Math.sqrt(s);
        for (let c = 0; c <= COLS; c++) {
          const n = h * per + r * (COLS + 1) + c, u = c / COLS;
          pos[n * 3] = e0 + (e1 - e0) * u;
          pos[n * 3 + 1] = y;
          pos[n * 3 + 2] = z;
          uv[n * 2] = h * 0.5 + u * 0.5;
          uv[n * 2 + 1] = (1 - s) * 2.6;
        }
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.uv.needsUpdate = true;
    dirty = false;
  };

  const quad = (i: number, p: [number, number, number][]): void => p.forEach((q, j) => fpos.set(q, (i * 4 + j) * 3));
  return {
    part(p) {
      const v = Math.min(1, Math.max(0, p));
      if (v !== part) { part = v; dirty = true; }
    },
    update(dt, t, night) {
      if (dirty) shape();
      streaks.offset.y += dt * 1.6;
      mat.color.copy(FALL_DAY).lerp(FALL_NIGHT, night);
      fmat.color.setScalar(1 - 0.35 * night);
      // the foam lies on the pool under each half; the spray stands over it and rises and falls
      for (let h = 0; h < 2; h++) {
        const [e0, e1] = edges(h, 1), w0 = e0 - 0.7, w1 = e1 + 0.7, fy = Y1 + 0.05;
        quad(h * 2, [[w0, fy, Z1 - 0.9], [w1, fy, Z1 - 0.9], [w1, fy, Z1 + 1.6], [w0, fy, Z1 + 1.6]]);
        const sh = 1.3 + 0.35 * Math.sin(t * 3.1 + h * 1.7) + 0.2 * Math.sin(t * 7.3 + h);
        quad(h * 2 + 1, [[w0 + 0.2, Y1 - 0.2, Z1 + 0.25], [w1 - 0.2, Y1 - 0.2, Z1 + 0.25], [w1 - 0.2, Y1 + sh, Z1 + 0.25], [w0 + 0.2, Y1 + sh, Z1 + 0.25]]);
      }
      fgeo.attributes.position.needsUpdate = true;
    },
  };
}

// ---------------------------------------------------------------------------
// The whole air
// ---------------------------------------------------------------------------

/** Builds the air, and sets going what moves by itself. */
export function buildAir(k: Build): Air {
  const round = roundTexture(), wisp = wispTexture();
  const signal = buildSignal(k, wisp);
  const fog = buildFog(k, wisp);
  const steam = buildSteam(k);
  const search = buildSearchlights(k, round);
  const fall = buildWaterfall(k, round);

  k.each((dt, time, night) => {
    signal.update(time, night);
    fog(time, night);
    steam.update(dt, night);
    search.update(time, night);
    fall.update(dt, time, night);
  });

  const air: Air = {
    signal: (f, picture) => signal.set(f, picture),
    searchlight: (id, to) => search.set(id, to),
    waterfall: (part) => fall.part(part),
    burst: (x, y, z, f) => steam.burst(x, y, z, f),
  };
  if (import.meta.env.DEV) {
    // the air itself, and what it is made of: each mesh's name, how many it draws and how many triangles that is
    const parts = (): { name: string; count: number; tris: number }[] =>
      MESHES.filter((m) => m.parent).map((m) => {
        const g = m.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3, c = (m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : 1;
        return { name: m.name, count: c, tris: n * c };
      });
    (window as unknown as { gothamAir: Air & { parts: typeof parts } }).gothamAir = { ...air, parts };
  }
  return air;
}
