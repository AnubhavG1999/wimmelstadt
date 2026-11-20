// The Iron Rain itself, and the weather of the battle: waves of starShells
// fired in a volley rippling along the spitTubes of the Pax and the Morning
// Star, streaking across the sky in long trails of fire and shedding the
// panels that burn away, firing their gravBoots at the cloud line and flying
// on in squadrons to their landing points, landing in rings of dust,
// splitting their outer husks and stepping out; the shield over Agea, which
// turns them aside until Mustang drops it; a few low clouds along the
// planet's limb; the thunderstorm coming in from the east (GS 38); and the
// canyon's guns firing up. Every shell, husk and knight is an instance of one
// shape, and every trail, glow and spark is written into one mesh, so that a
// wave of sixty costs a handful of draw calls.
//
// From the books, as the research note gives them (section 1): a starShell is
// armour four metres tall and about three tonnes (DA 11), like a shelled golem
// with long ape-like arms (IG 53), flying on built-in gravBoots and shoulder
// thrusters (DA 10). For the fall it wears panels that cut friction and burn
// away, and a clumsy outer armour against the heat, shed after landing (GS 38).
// Hivepods of twelve Grays fall with them (GS 38). Below the upper air the
// falling soldiers fire their gravBoots and break into squadrons, each to its
// own landing point, while gunfire from the ground carves into the swarm
// (GS 38). A thunderstorm comes in from the east (GS 38). The shield over Agea
// shatters as its nexuses overload one by one (GS 41). How any of it looks is
// silent, and is this tile's own drawing: the glow and the trails, the flakes,
// the rings of dust and the scorch, the husk splitting in two, the shield's
// hexagons and ripples, the clouds and the lightning.
//
// A person on this tile is 2.3 tall, so a starShell is 5 and its husk 5.75.
// Time is the page's own clock, the `time` that every tile's `each` is handed:
// every shell flies a path worked out when it is fired, and all that is drawn
// of it is worked out from that path and the clock, so `hold(t)` can stand
// everything as it is at any moment.

import * as THREE from 'three';
import { rng, type GeoBuilder, type V3 } from '../../engine/geo';
import { patch, toon } from '../../engine/look/materials';
import type { Build } from '../../engine/tile';
import { GUN_MUZZLES } from './canyon';
import { inWater, snowAt } from './land';
import { AUGUSTUS_GOLD, AUGUSTUS_RED, BOARDS } from './look';
import { F, HERO_SPOTS, LANDINGS, LOTS, SHIELD, outOfTrench } from './plan';
import { ROAD_HALF, onStage, toRoad } from './space';

/** A rectangle of ground where shells may land. */
export interface Zone { x0: number; z0: number; x1: number; z1: number }

export interface Rain {
  /**
   * Fires a wave of `count` shells. `from` says where the launching ship's
   * spitTube mouths are at this moment (the ship moves), and each shell picks
   * a mouth and a place in one of `zones`. Shells fired while the shield is up
   * at a place under it are turned aside onto the nearest zone outside it.
   * Returns how many seconds until the last of them has landed and its knight
   * has stepped out.
   */
  wave(from: () => V3[], zones: Zone[], count: number): number;
  /**
   * Drops one marked shell, painted `paint` (the Reaper's red, a Howler's
   * grey), from a place to a place, and calls `opened` when it has landed and
   * split, so that the show can stand the figure who was in it there. Returns
   * the seconds until it opens.
   */
  drop(from: V3, to: V3, paint: number, opened?: () => void): number;
  /** The shield over the city. `down` shatters it over a few seconds, section by section (story 5); `up` raises it again. */
  shield: { up(): void; down(): void; isUp(): boolean };
  /** Stands everything still as it is at `t` seconds, for pictures; null lets it go. */
  hold(t: number | null): void;
}

// ---------------------------------------------------------------------------
// The numbers the Rain keeps to
// ---------------------------------------------------------------------------

/**
 * How far over where it lands a falling shell fires its gravBoots, and the
 * least height it does so at: low, so that it burns most of its way down from
 * its ship and the whole wave is seen as lines of fire from the sky to the
 * ground.
 */
const BOOTS_OVER = 24, BOOTS_LEAST = 36;
/** How fast a shell streaks down before its boots fire, how fast it flies under them, and how fast it skids on the shield, in units a second. */
const STREAK = 16, BOOTS = 15, SKID = 22;
/** How long a wave's volley takes to ripple from one end of the row of tubes to the other. */
const VOLLEY = 1.5;
/** The most shells there may be at once, in the air and on the ground. */
const MOST = 180;
/** After a shell lands, in seconds from its touchdown: it crouches and stands, splits its husk, and its knight steps out. */
const STAND0 = 0.5, STAND1 = 1.15, SPLIT = 1.4, OPENING = 0.55, STEP0 = 2.0, STEP1 = 2.8;
/** A hivepod opens sooner, and its Grays come out. */
const HIVE_SPLIT = 1.0, HIVE_OUT = 1.4;
/** How far a husk's halves fall open at once, and once they have settled, in radians. */
const OPEN_A = 0.72, OPEN_B = 0.9;
/** When a husk fades, and when its scorch has faded, in seconds from touchdown. */
const HUSK_FADE = 11, HUSK_GONE = 12.6, SCORCH_FADE = 8, SCORCH_GONE = 22;
/** How long the smoke of a trail hangs: from the streak, and from the boots. */
const SMOKE_HOT = 6.5, SMOKE_BOOTS = 3;
/** How many seconds of a shell's way its trail of fire reaches back along, and the most units it may be. */
const TRAIL = 2.3, TRAIL_MOST = 42;
/** How fast a tracer flies. */
const TRACER = 150;
/** How long a shard of the shield falls before it has faded. */
const LIFE = 2.6;

/** The kinds of shell: a knight's, a hivepod of twelve Grays, and a marked one for the show. */
const KNIGHT = 0, HIVE = 1, MARKED = 2;
/** How large each kind's husk is, against a knight's, which is 5.75 tall. */
const SIZE = [1, 1.55, 0.72];
/** How far an open husk of each kind reaches from its middle: the room a landing keeps from the next. */
const REACH = [4.6, 7.2, 3.4];

// The colours. The husk is a scarred heat armour with the Augustan gold down
// its side; the knights inside are in the Augustan red and gold, a few in the
// black of the Obsidians and a few in gold; the Grays in grey.
const HUSK_PAINT = 0x4a4d57, HIVE_PAINT = 0x3d424c, CERAMIC = 0x777a82, HEAT_SHIELD = 0x26221f, SEAM = 0x17171a;
const IRON = 0x3b3c42, TRIM = AUGUSTUS_GOLD, NOZZLE = 0x9fb4c8;
const KNIGHT_PAINTS = [AUGUSTUS_RED, AUGUSTUS_RED, AUGUSTUS_RED, 0x2c2b31, 0x2c2b31, 0xc69a34];
const GRAY_PAINT = 0x7f848c;
const DUST = 0xa88466, SNOW_DUST = 0xf2f5f8, STONE_DUST = 0xd9cdb8;

// ---------------------------------------------------------------------------
// Small sums
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2;
const clamp = (v: number, a = 0, b = 1): number => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const ease = (t: number): number => { const c = clamp(t); return c * c * (3 - 2 * c); };
const easeOut = (t: number): number => 1 - (1 - clamp(t)) ** 3;
/** How far through a stretch of time a moment is, from 0 before it to 1 after it. */
const span = (t: number, a: number, b: number): number => clamp((t - a) / (b - a));
/** Eases out past its mark and settles back: a heavy half of a husk falling open. */
const backOut = (t: number): number => { const c = clamp(t) - 1, s = 1.7; return 1 + (s + 1) * c * c * c + s * c * c; };
const dist3 = (a: V3, b: V3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/** A number from 0 to 1, the same for the same seed. */
const hash = (n: number): number => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------------------------------------------------------------------------
// The dome of the shield
// ---------------------------------------------------------------------------

const [CX, CY, CZ] = SHIELD.c;
const RX = SHIELD.rx, RY = SHIELD.ry, RZ = SHIELD.rz;

/** How far inside the dome a place is: under 1 inside it, over 1 outside. `m` widens the dome by so much each way. */
const domeE = (x: number, y: number, z: number, m = 0): number => ((x - CX) / (RX + m)) ** 2 + ((y - CY) / (RY + m)) ** 2 + ((z - CZ) / (RZ + m)) ** 2;
/** Whether a place is inside the dome, which stands on the city's floor. */
const inDome = (x: number, y: number, z: number, m = 0): boolean => y > CY - 3 && domeE(x, y, z, m) < 1;
/** Whether a place on the ground lies under the dome. */
const underDome = (x: number, z: number, m = 0): boolean => ((x - CX) / (RX + m)) ** 2 + ((z - CZ) / (RZ + m)) ** 2 < 1;
/** How high the dome's surface is over a place, or the floor beyond its foot. */
function domeY(x: number, z: number): number {
  const q = 1 - ((x - CX) / RX) ** 2 - ((z - CZ) / RZ) ** 2;
  return q > 0 ? CY + RY * Math.sqrt(q) : CY;
}
/** A place on the ground pushed out from under the dome, along the way from its middle, to `k` times the foot of a dome widened by `m`. */
function outFromDome(x: number, z: number, m: number, k: number): [number, number] {
  let dx = x - CX, dz = z - CZ;
  if (Math.hypot(dx, dz) < 1e-3) dz = 1;
  const e = Math.sqrt((dx / (RX + m)) ** 2 + (dz / (RZ + m)) ** 2);
  const s = Math.max(1, k / e);
  return [CX + dx * s, CZ + dz * s];
}
/** How far it is from a place under the dome to its foot, going along (ux, uz). */
function toFoot(x: number, z: number, ux: number, uz: number): number {
  const ax = ux / RX, az = uz / RZ, bx = (x - CX) / RX, bz = (z - CZ) / RZ;
  const a = ax * ax + az * az, b = 2 * (ax * bx + az * bz), c = bx * bx + bz * bz - 1;
  const d = b * b - 4 * a * c;
  return d < 0 || a < 1e-9 ? 0 : Math.max(0, (-b + Math.sqrt(d)) / (2 * a));
}

/** Where the overload starts when the shield goes down: its generators' park, on the dome's east side. */
const PARK: V3 = [71, 40, -26];
/**
 * The dome's sections, each round a nexus: when the shield is dropped, they
 * overload and shatter one by one, those nearest the generators first (GS 41).
 */
const SECTIONS = (() => {
  const r = rng(8121);
  const pts = Array.from({ length: 14 }, (): V3 => {
    const a = r() * TAU, e = 0.06 + r() * 1.3;
    return [CX + Math.cos(e) * Math.cos(a) * RX, CY + Math.sin(e) * RY, CZ + Math.cos(e) * Math.sin(a) * RZ];
  });
  const at = new Array<number>(pts.length).fill(0);
  pts.map((p, i) => ({ i, d: dist3(p, PARK) })).sort((a, b) => a.d - b.d).forEach((o, rank) => (at[o.i] = 0.35 + rank * 0.5 + r() * 0.3));
  return { pts, at };
})();
/** How many seconds after the shield is dropped it breaks at a place on it. */
function breakAt(x: number, y: number, z: number): number {
  let best = 0, bd = Infinity;
  SECTIONS.pts.forEach((p, i) => {
    const d = (p[0] - x) ** 2 + (p[1] - y) ** 2 + (p[2] - z) ** 2;
    if (d < bd) { bd = d; best = i; }
  });
  return SECTIONS.at[best] + Math.sqrt(bd) / 55;
}
/** The shield's generators: its four pylons in the park on the city's east side, their tops 22 over the floor. */
const PYLONS: [number, number][] = [[60, -40], [82, -40], [60, -12], [82, -12]];
/** Where the shield's light rises from when it is raised again: the dome nearest the tops of the generators' four pylons. */
const RISE: V3[] = PYLONS.map(([x, z]): V3 => {
  const y = F + 22, s = 1 / Math.sqrt(domeE(x, y, z));
  return [CX + (x - CX) * s, CY + (y - CY) * s, CZ + (z - CZ) * s];
});

/**
 * The dome as a geodesic shell: a sphere of triangles turned into the
 * ellipsoid of the shield, its upper half. Each corner knows where it is in
 * its triangle, for the hexagons drawn across it, and each triangle where its
 * middle is and when it breaks, so that it can fall as a shard.
 */
function domeGeometry(): { geo: THREE.BufferGeometry; last: number } {
  const ico = new THREE.IcosahedronGeometry(1, 9).getAttribute('position');
  const pos: number[] = [], nor: number[] = [], bary: number[] = [], cent: number[] = [], brk: number[] = [];
  const r = rng(4417);
  let last = 0;
  for (let t = 0; t + 2 < ico.count; t += 3) {
    const u = [0, 1, 2].map((i): V3 => [ico.getX(t + i), ico.getY(t + i), ico.getZ(t + i)]);
    if (Math.max(u[0][1], u[1][1], u[2][1]) < -0.02) continue;
    const p = u.map(([x, y, z]): V3 => [CX + x * RX, CY + y * RY, CZ + z * RZ]);
    const c: V3 = [(p[0][0] + p[1][0] + p[2][0]) / 3, (p[0][1] + p[1][1] + p[2][1]) / 3, (p[0][2] + p[1][2] + p[2][2]) / 3];
    const at = breakAt(c[0], c[1], c[2]), rand = r();
    last = Math.max(last, at);
    for (let i = 0; i < 3; i++) {
      pos.push(...p[i]);
      const n = new THREE.Vector3(u[i][0] / RX, u[i][1] / RY, u[i][2] / RZ).normalize();
      nor.push(n.x, n.y, n.z);
      bary.push(i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0);
      cent.push(...c);
      brk.push(at, rand);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('aBary', new THREE.Float32BufferAttribute(bary, 3));
  geo.setAttribute('aCent', new THREE.Float32BufferAttribute(cent, 3));
  geo.setAttribute('aBreak', new THREE.Float32BufferAttribute(brk, 2));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(CX, CY + 30, CZ), 130);
  return { geo, last };
}

const SHIELD_VERT = /* glsl */ `
uniform float uT;
uniform float uDownAt;
uniform float uUpAt;
uniform vec3 uC;
attribute vec3 aBary;
attribute vec3 aCent;
attribute vec2 aBreak;
varying vec3 vBary;
varying vec3 vPos;
varying vec3 vNrm;
varying float vSince;
varying float vRand;
vec3 turn(vec3 v, vec3 k, float a) {
  float c = cos(a), s = sin(a);
  return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
}
void main() {
  vec3 p = position;
  float since = -100.0;
  if (uDownAt > uUpAt) {
    since = uT - uDownAt - aBreak.x;
    if (since > 0.0) {
      // a shard: smaller, turning over and over, thrown out and falling
      float k = clamp(since / ${LIFE.toFixed(2)}, 0.0, 1.0);
      vec3 ax = normalize(vec3(aBreak.y - 0.5, 0.7, fract(aBreak.y * 7.31) - 0.5));
      vec3 rel = turn((position - aCent) * mix(0.72, 0.18, k), ax, since * (1.6 + 3.5 * aBreak.y));
      vec3 outw = normalize(aCent - uC);
      p = aCent + rel + outw * since * (1.5 + 4.0 * aBreak.y) - vec3(0.0, 4.0 * since * since, 0.0);
      if (k >= 1.0) p = aCent;
    }
  }
  vBary = aBary;
  vPos = p;
  vNrm = normal;
  vSince = since;
  vRand = aBreak.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const SHIELD_FRAG = /* glsl */ `
uniform float uT;
uniform float uDownAt;
uniform float uUpAt;
uniform float uNight;
uniform float uFloor;
uniform vec4 uStrike[8];
uniform int uStrikes;
uniform vec3 uRise[4];
varying vec3 vBary;
varying vec3 vPos;
varying vec3 vNrm;
varying float vSince;
varying float vRand;
void main() {
  // the view looks the same way from everywhere: glass is brightest where it is seen edge on
  vec3 toCam = normalize(vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));
  float facing = abs(dot(normalize(vNrm), toCam));
  float rim = pow(1.0 - facing, 3.0);
  // the hexagons: where the two largest of a corner's shares are equal, a cell meets the next
  float m1 = max(vBary.x, max(vBary.y, vBary.z));
  float mn = min(vBary.x, min(vBary.y, vBary.z));
  float m2 = vBary.x + vBary.y + vBary.z - m1 - mn;
  float d = m1 - m2;
  float fw = fwidth(d);
  float line = 1.0 - smoothstep(0.012, 0.03 + 1.5 * fw, d);
  float shimmer = 0.55 + 0.45 * sin(vPos.x * 0.09 + vPos.z * 0.07 - uT * 1.1) * sin(vPos.y * 0.12 + uT * 0.7);
  // faint glass: by night it is felt at its rim, not as a net over the city's lights
  float I = mix(0.014, 0.01, uNight) + rim * mix(0.32, 0.4, uNight) + line * mix(0.09, 0.016, uNight) * shimmer;
  // its foot, where it stands on the floor, glows
  I += exp(-max(vPos.y - uFloor, 0.0) / 2.2) * mix(0.25, 0.42, uNight);
  // and the sky glints on its crown
  vec3 nf = normalize(vNrm);
  if (dot(nf, toCam) < 0.0) nf = -nf;
  I += pow(max(dot(reflect(-toCam, nf), normalize(vec3(0.35, 1.0, 0.45))), 0.0), 40.0) * mix(0.45, 0.6, uNight);
  vec3 col = mix(vec3(0.55, 0.8, 1.0), vec3(0.32, 0.6, 1.0), uNight);
  // where shells have struck it: a flash, and a bright ripple spreading over a few cells and fading
  for (int i = 0; i < 8; i++) {
    if (i >= uStrikes) break;
    vec4 s = uStrike[i];
    float age = uT - s.w;
    if (age < 0.0 || age > 2.2) continue;
    float dist = length(vPos - s.xyz);
    float w = 1.8 + age * 1.6;
    float ring = exp(-pow((dist - age * 13.0) / w, 2.0)) * exp(-age * 1.9);
    float flash = exp(-dist * dist / 30.0) * exp(-age * 5.5);
    I += ring * (0.5 + 3.2 * line) + flash * 2.8;
  }
  if (uDownAt > uUpAt) {
    if (vSince > 0.0) {
      // a shard of light, falling and fading
      float k = clamp(vSince / ${LIFE.toFixed(2)}, 0.0, 1.0);
      if (k >= 1.0) discard;
      I = (0.8 + 2.4 * line) * (1.0 - k) * (1.0 - k) * mix(0.75, 1.3, uNight);
      col = mix(vec3(0.82, 0.93, 1.0), col, k);
    } else if (vSince > -1.4) {
      // its nexus overloading: the cells flicker bright before they break
      float o = smoothstep(-1.4, 0.0, vSince);
      I += o * (0.25 + 1.9 * line) * (0.6 + 0.4 * sin(uT * 47.0 + vRand * 31.0));
    }
  } else {
    float since = uT - uUpAt;
    if (since < 6.0) {
      // raised again: a front of light spreading out over the dome from the generators
      float dmin = 1e9;
      for (int i = 0; i < 4; i++) dmin = min(dmin, length(vPos - uRise[i]));
      float R = 40.0 * since + 4.0 * since * since;
      if (dmin > R) discard;
      I += exp(-pow((R - dmin) / 6.0, 2.0)) * (1.2 + 2.2 * line);
      I += exp(-(R - dmin) / 30.0) * line * 0.9 * (1.0 - since / 6.0);
    }
  }
  gl_FragColor = vec4(col * I, 1.0);
}
`;

// ---------------------------------------------------------------------------
// What stands where: the highest surface built at a place
// ---------------------------------------------------------------------------

const PCELL = 4, PX = Math.ceil(208 / PCELL), PZ = Math.ceil(226 / PCELL);
const pcx = (x: number): number => Math.min(PX - 1, Math.max(0, Math.floor((x + 104) / PCELL)));
const pcz = (z: number): number => Math.min(PZ - 1, Math.max(0, Math.floor((z + 113) / PCELL)));

/**
 * The highest surface facing the sky at a place, of everything the tile has
 * built: the planet's ground, a mountain, a plaza, a roof. It is worked out
 * once, the first time it is asked, from the triangles that stand still.
 */
class Probe {
  private start: Int32Array | null = null;
  private list = new Int32Array(0);
  private pos: readonly number[] = [];
  private readonly b: GeoBuilder;
  constructor(b: GeoBuilder) {
    this.b = b;
  }
  private index(): void {
    const p = this.b.added.pos, nt = Math.floor(p.length / 9), cells = PX * PZ;
    const count = new Int32Array(cells), keep = new Uint8Array(nt);
    const each = (t: number, fn: (c: number) => void): void => {
      const o = t * 9;
      const i0 = pcx(Math.min(p[o], p[o + 3], p[o + 6])), i1 = pcx(Math.max(p[o], p[o + 3], p[o + 6]));
      const j0 = pcz(Math.min(p[o + 2], p[o + 5], p[o + 8])), j1 = pcz(Math.max(p[o + 2], p[o + 5], p[o + 8]));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) fn(j * PX + i);
    };
    for (let t = 0; t < nt; t++) {
      const o = t * 9;
      // only what faces the sky: walls and undersides are no surface to stand on
      const up = (p[o + 5] - p[o + 2]) * (p[o + 6] - p[o]) - (p[o + 3] - p[o]) * (p[o + 8] - p[o + 2]);
      if (up <= 1e-5) continue;
      keep[t] = 1;
      each(t, (c) => count[c]++);
    }
    const start = new Int32Array(cells + 1);
    for (let c = 0; c < cells; c++) start[c + 1] = start[c] + count[c];
    const list = new Int32Array(start[cells]), fill = start.slice(0, cells);
    for (let t = 0; t < nt; t++) if (keep[t]) each(t, (c) => (list[fill[c]++] = t));
    this.start = start;
    this.list = list;
    this.pos = p;
  }
  top(x: number, z: number): number {
    if (!this.start) this.index();
    const start = this.start!, p = this.pos, c = pcz(z) * PX + pcx(x);
    let best = -Infinity;
    for (let n = start[c]; n < start[c + 1]; n++) {
      const o = this.list[n] * 9;
      const ax = p[o], az = p[o + 2], bx = p[o + 3], bz = p[o + 5], cx = p[o + 6], cz = p[o + 8];
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(d) < 1e-9) continue;
      const w1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d;
      const w2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d;
      const w3 = 1 - w1 - w2;
      if (w1 < -1e-6 || w2 < -1e-6 || w3 < -1e-6) continue;
      best = Math.max(best, w1 * p[o + 1] + w2 * p[o + 4] + w3 * p[o + 7]);
    }
    return best;
  }
}

// ---------------------------------------------------------------------------
// The way a shell flies: places it passes at given times, with its speed there
// ---------------------------------------------------------------------------

interface Key { t: number; p: V3; v: V3 }

/** Where a shell is at time `t` on its way, and how fast it is going, by smooth curves between its keys. */
function pathAt(keys: Key[], t: number, p: V3, v: V3 | null = null): void {
  const n = keys.length;
  if (t <= keys[0].t || n === 1) {
    p[0] = keys[0].p[0]; p[1] = keys[0].p[1]; p[2] = keys[0].p[2];
    if (v) { v[0] = keys[0].v[0]; v[1] = keys[0].v[1]; v[2] = keys[0].v[2]; }
    return;
  }
  if (t >= keys[n - 1].t) {
    const k = keys[n - 1];
    p[0] = k.p[0]; p[1] = k.p[1]; p[2] = k.p[2];
    if (v) { v[0] = 0; v[1] = 0; v[2] = 0; }
    return;
  }
  let i = 0;
  while (i < n - 2 && t >= keys[i + 1].t) i++;
  const a = keys[i], b = keys[i + 1], h = b.t - a.t, s = (t - a.t) / h, s2 = s * s, s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
  for (let j = 0; j < 3; j++) p[j] = h00 * a.p[j] + h10 * h * a.v[j] + h01 * b.p[j] + h11 * h * b.v[j];
  if (v) {
    const d00 = 6 * s2 - 6 * s, d10 = 3 * s2 - 4 * s + 1, d01 = -6 * s2 + 6 * s, d11 = 3 * s2 - 2 * s;
    for (let j = 0; j < 3; j++) v[j] = (d00 * a.p[j] + d01 * b.p[j]) / h + d10 * a.v[j] + d11 * b.v[j];
  }
}

// ---------------------------------------------------------------------------
// Shapes: the husk, the knight, the Gray
// ---------------------------------------------------------------------------

/**
 * Collects a shape's triangles with what the Rain's material reads of them:
 * their colour, whether they take the paint, the part of the body they move
 * with and where it turns, and what of them glows.
 */
class Mesher {
  private readonly pos: number[] = [];
  private readonly nor: number[] = [];
  private readonly col: number[] = [];
  private readonly part: number[] = [];
  private readonly glow: number[] = [];
  private readonly paint: number[] = [];
  private readonly piv: number[] = [];
  private readonly c = new THREE.Color();
  private now = { part: 0, glow: 0, paint: 0, piv: [0, 0, 0] as V3 };

  /**
   * What is added next: its colour; whether it takes the paint (1) or keeps
   * its colour (0); the part it moves with (1 and 2 the legs, 3 and 4 the
   * arms, 11 to 13 a panel that burns away); what glows (1 a visor, 2 a
   * gravBoot or a thruster, 3 the heat shield, 4 a Gray's visor); and where
   * its part turns.
   */
  set(color: number, paint = 0, part = 0, glow = 0, piv: V3 = [0, 0, 0]): this {
    this.c.set(color);
    this.now = { part, glow, paint, piv };
    return this;
  }

  /** A flat triangle, facing away from `inside`. */
  tri(a: V3, b: V3, c: V3, inside: V3): this {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz);
    if (l < 1e-9) return this;
    nx /= l; ny /= l; nz /= l;
    const mx = (a[0] + b[0] + c[0]) / 3 - inside[0], my = (a[1] + b[1] + c[1]) / 3 - inside[1], mz = (a[2] + b[2] + c[2]) / 3 - inside[2];
    let pts = [a, b, c];
    if (nx * mx + ny * my + nz * mz < 0) {
      nx = -nx; ny = -ny; nz = -nz;
      pts = [a, c, b];
    }
    for (const p of pts) {
      this.pos.push(p[0], p[1], p[2]);
      this.nor.push(nx, ny, nz);
      this.col.push(this.c.r, this.c.g, this.c.b);
      this.part.push(this.now.part);
      this.glow.push(this.now.glow);
      this.paint.push(this.now.paint);
      this.piv.push(this.now.piv[0], this.now.piv[1], this.now.piv[2]);
    }
    return this;
  }

  quad(a: V3, b: V3, c: V3, d: V3, inside: V3): this {
    return this.tri(a, b, c, inside).tri(a, c, d, inside);
  }

  /** A box with the faces asked for: N E S W T B. */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, faces = 'NESWT'): this {
    const m: V3 = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    if (faces.includes('T')) this.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], m);
    if (faces.includes('B')) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], m);
    if (faces.includes('N')) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], m);
    if (faces.includes('S')) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], m);
    if (faces.includes('E')) this.quad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], m);
    if (faces.includes('W')) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], m);
    return this;
  }

  get triangles(): number {
    return this.pos.length / 9;
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aPart', new THREE.Float32BufferAttribute(this.part, 1));
    g.setAttribute('aGlow', new THREE.Float32BufferAttribute(this.glow, 1));
    g.setAttribute('aPaint', new THREE.Float32BufferAttribute(this.paint, 1));
    g.setAttribute('aPivot', new THREE.Float32BufferAttribute(this.piv, 3));
    return g;
  }
}

/** The husk's outline, from the heat shield under the feet to the crown: radius and height. */
const RINGS: [number, number][] = [[1.2, 0], [1.5, 0.45], [1.72, 1.5], [1.8, 3.1], [1.6, 4.25], [1.12, 5.05], [0.55, 5.55]];
const HUSK_TOP = 5.75, HUSK_NOSE = -0.34;
/** Each half of a husk falls open about its outer bottom edge. */
const HINGE = RINGS[0][0];

/**
 * One half of a husk, the clumsy outer armour a knight falls in (GS 38): the
 * half on its right, an eight-sided shell cut down its front and back, with a
 * heat shield under the feet, a dark seam at the eyes, a stripe of Augustan
 * gold down its side, and the ceramic friction panels that burn away. Its left
 * half is the same turned about, so the shape is alike front and back.
 */
function huskHalf(): THREE.BufferGeometry {
  const m = new Mesher(), mid: V3 = [0, 2.8, 0];
  const at = (r: number, y: number, s: number): V3 => [r * Math.cos((s * Math.PI) / 4), y, r * Math.sin((s * Math.PI) / 4)];
  const rAt = (y: number): number => {
    for (let i = 0; i + 1 < RINGS.length; i++) {
      const [r0, y0] = RINGS[i], [r1, y1] = RINGS[i + 1];
      if (y <= y1) return lerp(r0, r1, (y - y0) / (y1 - y0));
    }
    return RINGS[RINGS.length - 1][0];
  };
  /** A place on one of the half's four faces, `f` of the way across it and lifted off it. */
  const on = (y: number, s: number, f: number, lift: number): V3 => {
    const r = rAt(y) + lift, a = at(r, y, s), b = at(r, y, s + 1);
    return [lerp(a[0], b[0], f), y, lerp(a[2], b[2], f)];
  };
  m.set(0xffffff, 1);
  for (let i = 0; i + 1 < RINGS.length; i++) {
    for (let s = 0; s < 4; s++) {
      const [r0, y0] = RINGS[i], [r1, y1] = RINGS[i + 1];
      m.quad(at(r0, y0, s), at(r0, y0, s + 1), at(r1, y1, s + 1), at(r1, y1, s), mid);
    }
  }
  const [rt, yt] = RINGS[RINGS.length - 1];
  for (let s = 0; s < 4; s++) m.tri(at(rt, yt, s), at(rt, yt, s + 1), [0, HUSK_TOP, 0], mid);
  // the heat shield under the feet: a shallow cone that glows white when the shell is hot
  m.set(HEAT_SHIELD, 0, 0, 3);
  for (let s = 0; s < 4; s++) m.tri(at(HINGE, 0, s), at(HINGE, 0, s + 1), [0, HUSK_NOSE, 0], mid);
  // the seam round it at the height of the eyes
  m.set(SEAM, 0);
  for (let s = 0; s < 4; s++) m.quad(on(3.7, s, 0, 0.05), on(3.7, s, 1, 0.05), on(4.08, s, 1, 0.05), on(4.08, s, 0, 0.05), mid);
  // a stripe of Augustan gold down its side, bent where the shell bends
  m.set(TRIM, 0);
  for (const [ya, yb] of [[0.75, 1.5], [1.5, 3.1], [3.1, 3.55]]) {
    m.quad(on(ya, 1, 0.8, 0.04), on(ya, 1, 1, 0.04), on(yb, 1, 1, 0.04), on(yb, 1, 0.8, 0.04), mid);
    m.quad(on(ya, 2, 0, 0.04), on(ya, 2, 0.2, 0.04), on(yb, 2, 0.2, 0.04), on(yb, 2, 0, 0.04), mid);
  }
  // the friction panels, which burn away one by one on the way down
  const panel = (n: number, s: number, ya: number, yb: number, fa: number, fb: number): void => {
    m.set(CERAMIC, 0, 10 + n);
    m.quad(on(ya, s, fa, 0.08), on(ya, s, fb, 0.08), on(yb, s, fb, 0.08), on(yb, s, fa, 0.08), mid);
  };
  panel(1, 0, 1.7, 2.95, 0.14, 0.86);
  panel(2, 3, 1.7, 2.95, 0.14, 0.86);
  panel(3, 1, 0.62, 1.4, 0.1, 0.7);
  panel(3, 2, 0.62, 1.4, 0.3, 0.9);
  return m.build();
}

/**
 * A knight in his starShell, 5 tall: a shelled golem with long arms like an
 * ape's that reach to his knees (IG 53), heavy boots that are his gravBoots,
 * a thruster on the back of each shoulder (DA 10), a barrel chest, his helm
 * sunk into the yoke of his shoulders with a lit visor, and a crest of gold.
 * He faces along x. Legs and arms swing about their joints as he walks.
 */
function knightShape(): THREE.BufferGeometry {
  const m = new Mesher();
  for (const side of [-1, 1]) {
    const leg = side < 0 ? 1 : 2, arm = side < 0 ? 3 : 4;
    const lz = side * 0.55, az = side * 1.62, tz = side * 1.15;
    const hip: V3 = [0, 2.0, lz], shoulder: V3 = [0, 3.95, side * 1.55];
    // the boot, and the gravBoot under it, which glows when it fires
    m.set(IRON, 0, leg, 0, hip).box(-0.45, 0, lz - 0.38, 0.68, 0.62, lz + 0.38);
    m.set(NOZZLE, 0, leg, 2, hip).quad([-0.45, 0, lz - 0.38], [0.68, 0, lz - 0.38], [0.68, 0, lz + 0.38], [-0.45, 0, lz + 0.38], [0, 1, lz]);
    // the leg
    m.set(0xffffff, 1, leg, 0, hip).box(-0.33, 0.62, lz - 0.3, 0.38, 2.05, lz + 0.3, 'NESW');
    // the arm, long as an ape's, and its fist
    m.set(0xffffff, 1, arm, 0, shoulder).box(-0.3, 1.55, az - 0.3, 0.3, 4.0, az + 0.3, 'NESW');
    m.set(IRON, 0, arm, 0, shoulder).box(-0.3, 0.88, az - 0.36, 0.5, 1.55, az + 0.36);
    // the thruster on the back of the shoulder, and its nozzle
    m.set(IRON, 0).box(-1.15, 3.15, tz - 0.3, -0.72, 4.0, tz + 0.3);
    m.set(NOZZLE, 0, 0, 2).quad([-1.15, 3.15, tz - 0.3], [-0.72, 3.15, tz - 0.3], [-0.72, 3.15, tz + 0.3], [-1.15, 3.15, tz + 0.3], [-0.93, 4, tz]);
  }
  // the hips, and a belt of gold
  m.set(IRON, 0).box(-0.6, 1.95, -0.95, 0.6, 2.42, 0.95, 'NESW');
  m.set(TRIM, 0).box(-0.64, 2.42, -0.99, 0.64, 2.58, 0.99);
  // the barrel of the chest, broader at the top, and closed over
  m.set(0xffffff, 1);
  const ring = (r: number, y: number, i: number): V3 => [r * Math.cos((i * Math.PI) / 4 + Math.PI / 8), y, r * Math.sin((i * Math.PI) / 4 + Math.PI / 8)];
  for (let i = 0; i < 8; i++) {
    m.quad(ring(1.0, 2.58, i), ring(1.0, 2.58, i + 1), ring(1.3, 3.4, i + 1), ring(1.3, 3.4, i), [0, 3, 0]);
    m.tri(ring(1.3, 3.4, i), ring(1.3, 3.4, i + 1), [0, 3.4, 0], [0, 0, 0]);
  }
  // the yoke over the shoulders, and the helm sunk into it, with its visor
  m.set(0xffffff, 1).box(-0.8, 3.35, -1.95, 0.74, 4.3, 1.95);
  m.set(0xffffff, 1).box(-0.42, 4.3, -0.42, 0.44, 4.88, 0.42);
  m.set(0x2a1d16, 0, 0, 1).quad([0.445, 4.48, -0.32], [0.445, 4.48, 0.32], [0.445, 4.7, 0.32], [0.445, 4.7, -0.32], [0, 4.6, 0]);
  m.set(TRIM, 0).box(-0.36, 4.88, -0.07, 0.3, 4.99, 0.07);
  return m.build();
}

/** A Gray, 2.3 tall, in grey armour and helmet with a dark visor, his rifle across him. He faces along x. */
function grayShape(): THREE.BufferGeometry {
  const m = new Mesher();
  for (const side of [-1, 1]) {
    const leg = side < 0 ? 1 : 2, arm = side < 0 ? 3 : 4;
    m.set(0xffffff, 1, leg, 0, [0, 1.0, side * 0.2]).box(-0.16, 0, side * 0.2 - 0.15, 0.2, 1.02, side * 0.2 + 0.15);
    m.set(0xffffff, 1, arm, 0, [0, 1.68, side * 0.48]).box(-0.11, 0.98, side * 0.48 - 0.09, 0.13, 1.72, side * 0.48 + 0.09, 'NESW');
  }
  m.set(0xffffff, 1).box(-0.25, 0.98, -0.4, 0.27, 1.76, 0.4);
  m.set(0x5c6168, 0).box(-0.21, 1.76, -0.2, 0.21, 2.22, 0.2);
  m.set(0x1f2328, 0, 0, 4).quad([0.215, 1.93, -0.15], [0.215, 1.93, 0.15], [0.215, 2.06, 0.15], [0.215, 2.06, -0.15], [0, 2, 0]);
  m.set(IRON, 0).box(0.05, 1.28, 0.12, 0.95, 1.4, 0.24);
  m.set(0x555a60, 0).box(-0.42, 1.12, -0.24, -0.25, 1.66, 0.24);
  return m.build();
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

const SOLID_PARS = /* glsl */ `
  attribute float aPart;
  attribute float aGlow;
  attribute float aPaint;
  attribute vec3 aPivot;
  attribute vec4 iFx;
  attribute vec4 iAnim;
  varying vec4 vFx;
  varying vec4 vAnim;
  varying float vGlow;
  varying float vLocalY;
  float rrSwing() {
    if (aPart > 0.5 && aPart < 1.5) return iAnim.x;
    if (aPart > 1.5 && aPart < 2.5) return -iAnim.x;
    if (aPart > 2.5 && aPart < 3.5) return -0.75 * iAnim.x;
    if (aPart > 3.5 && aPart < 4.5) return 0.75 * iAnim.x;
    return 0.0;
  }
  vec3 rrTurnZ(vec3 v, float a) {
    float c = cos(a), s = sin(a);
    return vec3(c * v.x - s * v.y, s * v.x + c * v.y, v.z);
  }
`;
/** The paint goes only where the shape takes it; trim, iron and glass keep their colours. */
const SOLID_COLOR = /* glsl */ `
  #if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
    vColor = vec4( 1.0 );
  #endif
  #ifdef USE_COLOR
    vColor.rgb *= color;
  #endif
  #ifdef USE_INSTANCING_COLOR
    vColor.rgb *= mix( vec3( 1.0 ), instanceColor.rgb, aPaint );
  #endif
`;
/** Legs and arms swing about their joints, a burnt panel is gone, and a crouch bends the figure down and forward. */
const SOLID_MOVE = /* glsl */ `
  {
    float rrS = rrSwing();
    if (rrS != 0.0) transformed = aPivot + rrTurnZ(transformed - aPivot, rrS);
    if (aPart > 10.5 && aPart - 10.0 > iFx.y + 0.01) transformed = vec3(0.0, 2.8, 0.0);
    if (iAnim.y > 0.0) {
      transformed.y *= 1.0 - 0.24 * iAnim.y;
      transformed.x += 0.18 * iAnim.y * transformed.y;
    }
  }
`;
const SOLID_NORMAL = /* glsl */ `
  {
    float rrS = rrSwing();
    if (rrS != 0.0) objectNormal = rrTurnZ(objectNormal, rrS);
  }
`;
/**
 * What glows: the leading end of a hot husk, white and then orange and red as
 * it cools; a knight's visor; gravBoots and thrusters while they fire. A figure
 * that fades is drawn in fewer and fewer of its pixels until it is gone.
 */
const SOLID_FRAG = /* glsl */ `
  if (vFx.z < 0.999 && ign(gl_FragCoord.xy) > vFx.z) discard;
  vec3 rrEmis = vec3(0.0);
  {
    float h = min(vFx.x, 1.0);
    if (h > 0.002) {
      float lead = vGlow > 2.5 && vGlow < 3.5 ? 1.0 : exp(-max(vLocalY, 0.0) / 0.9);
      vec3 hot = mix(vec3(0.85, 0.13, 0.02), vec3(1.0, 0.45, 0.1), smoothstep(0.2, 0.7, h));
      hot = mix(hot, vec3(1.0, 0.75, 0.42), smoothstep(0.85, 1.0, h));
      rrEmis += hot * (lead * h * (0.6 + 1.4 * h) + 0.03 * h * h) * (1.0 + 1.4 * uNight);
      diffuseColor.rgb *= 1.0 - 0.55 * lead * min(1.0, h * 1.5);
    }
    if (vGlow > 0.5 && vGlow < 1.5) rrEmis += vec3(1.0, 0.5, 0.14) * (0.7 + 2.4 * uNight);
    if (vGlow > 1.5 && vGlow < 2.5) rrEmis += vec3(0.6, 0.82, 1.0) * vAnim.z * (1.8 + 2.6 * uNight);
    if (vGlow > 3.5 && vGlow < 4.5) rrEmis += vec3(0.55, 0.75, 0.95) * (0.08 + 0.7 * uNight);
  }
`;

/** The material of the husks, the knights and the Grays: the city's own cel shading, with what moves and glows. */
function solidMaterial(k: Build, key: string, side: THREE.Side): THREE.MeshToonMaterial {
  const m = toon({ side });
  patch(m, key, k.look, {
    snow: 0.3,
    vertPars: SOLID_PARS,
    vertColor: SOLID_COLOR,
    vertBegin: 'vFx = iFx; vAnim = iAnim; vGlow = aGlow; vLocalY = position.y;',
    fragPars: 'varying vec4 vFx; varying vec4 vAnim; varying float vGlow; varying float vLocalY;',
    fragColor: SOLID_FRAG,
    fragEmissive: 'totalEmissiveRadiance += rrEmis; totalEmissiveRadiance += diffuseColor.rgb * streetLight(vWPos) * uNight * 0.9;',
  });
  // the joints and the panels move the shape before anything else reads where it is
  const inner = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    inner.call(m, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${SOLID_NORMAL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${SOLID_MOVE}`);
  };
  return m;
}

/** The clouds: soft cel-shaded puffs, a little see-through, each lit from within by what flies through it, and the storm's by its lightning. */
function cloudMaterial(k: Build): THREE.MeshToonMaterial {
  const m = toon({ vertexColors: false, color: 0xffffff, transparent: true, opacity: 0.84 });
  patch(m, 'rr-rain-cloud', k.look, {
    vertPars: 'attribute vec3 iGlow; varying vec3 vGlow;',
    vertBegin: 'vGlow = iGlow;',
    fragPars: 'varying vec3 vGlow;',
    fragEmissive: 'totalEmissiveRadiance += vGlow;',
  });
  return m;
}

/** A scorch on the ground: a charred blotch with rays where the blast went out, each fading as its own. */
function scorchMaterial(): THREE.MeshBasicMaterial {
  const S = 96, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.8)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const r = rng(551);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  for (let i = 0; i < 15; i++) {
    const a = r() * TAU, len = S * (0.34 + r() * 0.15), w = 0.05 + r() * 0.08;
    ctx.beginPath();
    ctx.moveTo(S / 2 + Math.cos(a - w) * S * 0.18, S / 2 + Math.sin(a - w) * S * 0.18);
    ctx.lineTo(S / 2 + Math.cos(a) * len, S / 2 + Math.sin(a) * len);
    ctx.lineTo(S / 2 + Math.cos(a + w) * S * 0.18, S / 2 + Math.sin(a + w) * S * 0.18);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float iAlpha;\nvarying float vAlpha;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlpha = iAlpha;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vAlpha;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vAlpha;');
  };
  mat.customProgramCacheKey = () => 'rr-rain-scorch';
  return mat;
}

/**
 * Glows, ribbons and smoke are written afresh every frame into one mesh each,
 * and turned to face the view where they are drawn: a round glow by the view's
 * own across and up, a ribbon across its way and the view's.
 */
const BATCH_VERT = /* glsl */ `
attribute vec3 aDir;
attribute vec3 aExp;
attribute vec4 aCol;
attribute vec2 aUv;
varying vec4 vCol;
varying vec2 vUv;
void main() {
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 back = vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]);
  vec3 p = position;
  if (aExp.z != 0.0) {
    vec3 side = cross(aDir, back);
    float l = length(side);
    p += (l > 1e-5 ? side / l : right) * aExp.z;
  } else {
    p += right * aExp.x + up * aExp.y;
  }
  vCol = aCol;
  vUv = aUv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;
const GLOW_FRAG = /* glsl */ `
uniform float uGain;
varying vec4 vCol;
varying vec2 vUv;
void main() {
  vec2 q = vUv * 2.0 - 1.0;
  float r2 = dot(q, q);
  float a = exp(-r2 * 3.0) * 1.05 - 0.05 + 0.55 * exp(-r2 * 16.0);
  if (a <= 0.0) discard;
  gl_FragColor = vec4(vCol.rgb * vCol.a * a * uGain, 1.0);
}
`;
const SMOKE_FRAG = /* glsl */ `
varying vec4 vCol;
varying vec2 vUv;
void main() {
  vec2 q = vUv * 2.0 - 1.0;
  float a = (exp(-dot(q, q) * 2.4) - 0.09) / 0.91;
  if (a <= 0.0) discard;
  gl_FragColor = vec4(vCol.rgb, vCol.a * a);
}
`;

/** One mesh written afresh each frame: round glows, glows drawn out along a line, ribbons, and patches laid on the ground. */
class Batch {
  readonly mesh: THREE.Mesh;
  private readonly cap: number;
  private readonly P: Float32Array;
  private readonly D: Float32Array;
  private readonly E: Float32Array;
  private readonly C: Float32Array;
  private readonly U: Float32Array;
  private readonly I: Uint16Array;
  private readonly attrs: THREE.BufferAttribute[];
  private readonly index: THREE.BufferAttribute;
  private nv = 0;
  private ni = 0;

  constructor(cap: number, mat: THREE.Material, name: string) {
    this.cap = cap;
    this.P = new Float32Array(cap * 3);
    this.D = new Float32Array(cap * 3);
    this.E = new Float32Array(cap * 3);
    this.C = new Float32Array(cap * 4);
    this.U = new Float32Array(cap * 2);
    this.I = new Uint16Array(cap * 3);
    const geo = new THREE.BufferGeometry();
    const a = (arr: Float32Array, n: number): THREE.BufferAttribute => new THREE.BufferAttribute(arr, n).setUsage(THREE.DynamicDrawUsage);
    this.attrs = [a(this.P, 3), a(this.D, 3), a(this.E, 3), a(this.C, 4), a(this.U, 2)];
    ['position', 'aDir', 'aExp', 'aCol', 'aUv'].forEach((n, i) => geo.setAttribute(n, this.attrs[i]));
    this.index = new THREE.BufferAttribute(this.I, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setIndex(this.index);
    geo.setDrawRange(0, 0);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 40, 0), 400);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.name = name;
    this.mesh.frustumCulled = false;
    this.mesh.raycast = () => {};
  }

  begin(): void {
    this.nv = 0;
    this.ni = 0;
  }

  private room(v: number, i: number): boolean {
    return this.nv + v <= this.cap && this.ni + i <= this.I.length;
  }

  private vert(x: number, y: number, z: number, dx: number, dy: number, dz: number, ex: number, ey: number, ez: number, r: number, g: number, b: number, a: number, u: number, w: number): number {
    const n = this.nv++;
    this.P[n * 3] = x; this.P[n * 3 + 1] = y; this.P[n * 3 + 2] = z;
    this.D[n * 3] = dx; this.D[n * 3 + 1] = dy; this.D[n * 3 + 2] = dz;
    this.E[n * 3] = ex; this.E[n * 3 + 1] = ey; this.E[n * 3 + 2] = ez;
    this.C[n * 4] = r; this.C[n * 4 + 1] = g; this.C[n * 4 + 2] = b; this.C[n * 4 + 3] = a;
    this.U[n * 2] = u; this.U[n * 2 + 1] = w;
    return n;
  }

  private quadIdx(a: number, b: number, c: number, d: number): void {
    const I = this.I, i = this.ni;
    I[i] = a; I[i + 1] = b; I[i + 2] = c; I[i + 3] = a; I[i + 4] = c; I[i + 5] = d;
    this.ni += 6;
  }

  /** A round glow facing the view, `s` across from its middle to its edge. */
  sprite(x: number, y: number, z: number, s: number, r: number, g: number, b: number, a = 1): void {
    if (s <= 0 || a <= 0 || !this.room(4, 6)) return;
    const v0 = this.vert(x, y, z, 0, 0, 0, -s, -s, 0, r, g, b, a, 0, 0);
    this.vert(x, y, z, 0, 0, 0, s, -s, 0, r, g, b, a, 1, 0);
    this.vert(x, y, z, 0, 0, 0, s, s, 0, r, g, b, a, 1, 1);
    this.vert(x, y, z, 0, 0, 0, -s, s, 0, r, g, b, a, 0, 1);
    this.quadIdx(v0, v0 + 1, v0 + 2, v0 + 3);
  }

  /** A glow drawn out from one place to another, `w` from its middle line to its edge, soft at both ends: a flame, a tracer, a spark. */
  blob(ax: number, ay: number, az: number, bx: number, by: number, bz: number, w: number, r: number, g: number, b: number, a = 1): void {
    if (w <= 0 || a <= 0 || !this.room(4, 6)) return;
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const v0 = this.vert(ax, ay, az, dx, dy, dz, 0, 0, -w, r, g, b, a, 0, 0);
    this.vert(ax, ay, az, dx, dy, dz, 0, 0, w, r, g, b, a, 1, 0);
    this.vert(bx, by, bz, dx, dy, dz, 0, 0, w, r, g, b, a, 1, 1);
    this.vert(bx, by, bz, dx, dy, dz, 0, 0, -w, r, g, b, a, 0, 1);
    this.quadIdx(v0, v0 + 1, v0 + 2, v0 + 3);
  }

  /** A ribbon through `n` places (x y z each in `p`), with a half width and a colour (r g b a) at each. */
  strip(n: number, p: Float32Array, w: Float32Array, c: Float32Array): void {
    if (n < 2 || !this.room(n * 2, (n - 1) * 6)) return;
    const v0 = this.nv;
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      const dx = p[b * 3] - p[a * 3], dy = p[b * 3 + 1] - p[a * 3 + 1], dz = p[b * 3 + 2] - p[a * 3 + 2];
      for (const side of [-1, 1]) this.vert(p[i * 3], p[i * 3 + 1], p[i * 3 + 2], dx, dy, dz, 0, 0, side * Math.max(1e-3, w[i]), c[i * 4], c[i * 4 + 1], c[i * 4 + 2], c[i * 4 + 3], side < 0 ? 0 : 1, 0.5);
    }
    for (let i = 0; i + 1 < n; i++) this.quadIdx(v0 + i * 2, v0 + i * 2 + 1, v0 + i * 2 + 3, v0 + i * 2 + 2);
  }

  /** A round glow lying on the ground, square to its slope `n`. */
  flat(x: number, y: number, z: number, n: V3, s: number, r: number, g: number, b: number, a = 1): void {
    if (s <= 0 || a <= 0 || !this.room(4, 6)) return;
    // two ways across the ground there
    let tx = n[1], ty = -n[0], tz = 0;
    let l = Math.hypot(tx, ty, tz);
    if (l < 1e-4) { tx = 0; ty = -n[2]; tz = n[1]; l = Math.hypot(tx, ty, tz); }
    tx /= l; ty /= l; tz /= l;
    const ux = n[1] * tz - n[2] * ty, uy = n[2] * tx - n[0] * tz, uz = n[0] * ty - n[1] * tx;
    const corner = (i: number, j: number, u: number, w: number): number =>
      this.vert(x + (tx * i + ux * j) * s, y + (ty * i + uy * j) * s, z + (tz * i + uz * j) * s, 0, 0, 0, 0, 0, 0, r, g, b, a, u, w);
    const v0 = corner(-1, -1, 0, 0);
    corner(1, -1, 1, 0);
    corner(1, 1, 1, 1);
    corner(-1, 1, 0, 1);
    this.quadIdx(v0, v0 + 1, v0 + 2, v0 + 3);
  }

  end(): void {
    const geo = this.mesh.geometry;
    const sizes = [3, 3, 3, 4, 2];
    this.attrs.forEach((a, i) => {
      a.clearUpdateRanges();
      a.addUpdateRange(0, Math.max(1, this.nv) * sizes[i]);
      a.needsUpdate = true;
    });
    this.index.clearUpdateRanges();
    this.index.addUpdateRange(0, Math.max(1, this.ni));
    this.index.needsUpdate = true;
    geo.setDrawRange(0, this.ni);
  }
}

/** Instances of one shape, written afresh every frame, with what each carries besides where it is and its colour. */
class Pack {
  readonly mesh: THREE.InstancedMesh;
  readonly cap: number;
  readonly extra: Record<string, THREE.InstancedBufferAttribute> = {};
  n = 0;

  constructor(geo: THREE.BufferGeometry, mat: THREE.Material, cap: number, name: string, extra: Record<string, number> = {}) {
    this.cap = cap;
    for (const [key, size] of Object.entries(extra)) {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(cap * size), size);
      a.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute(key, a);
      this.extra[key] = a;
    }
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.name = name;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, new THREE.Color(0xffffff));
    this.mesh.instanceColor!.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.raycast = () => {};
  }

  /** Adds one, and hands back its number, or -1 if there is no more room. */
  add(m: THREE.Matrix4, color: THREE.Color): number {
    if (this.n >= this.cap) return -1;
    const i = this.n++;
    m.toArray(this.mesh.instanceMatrix.array as Float32Array, i * 16);
    color.toArray(this.mesh.instanceColor!.array as Float32Array, i * 3);
    return i;
  }

  set(key: string, i: number, a: number, b = 0, c = 0, d = 0): void {
    const attr = this.extra[key], s = attr.itemSize, arr = attr.array as Float32Array;
    arr[i * s] = a;
    if (s > 1) arr[i * s + 1] = b;
    if (s > 2) arr[i * s + 2] = c;
    if (s > 3) arr[i * s + 3] = d;
  }

  end(): void {
    const n = Math.max(1, this.n);
    this.mesh.count = this.n;
    const up = (a: THREE.BufferAttribute, size: number): void => {
      a.clearUpdateRanges();
      a.addUpdateRange(0, n * size);
      a.needsUpdate = true;
    };
    up(this.mesh.instanceMatrix, 16);
    up(this.mesh.instanceColor!, 3);
    for (const a of Object.values(this.extra)) up(a, a.itemSize);
  }
}

// ---------------------------------------------------------------------------
// The clouds: a broken layer over the south, and the storm bank on the east
// ---------------------------------------------------------------------------

interface Puff { x: number; y: number; z: number; sx: number; sy: number; sz: number; color: number; storm: boolean; turn: number }

/**
 * The cloud: a few soft heaps low over the planet's limb, along the board's
 * south and east edges, 7 to 13 over the ground under them. From the view the
 * tile opens with, a thing h over the ground hides the ground about 1.3 h
 * north-west of it, so these hide only the planet's edge, and never a stage,
 * the city's floor or the south wall. They keep off the Mine on the south edge
 * and off what they would hide of the places the shells land in. The white
 * heaps are on the south; the storm coming in from the east (GS 38) is a grey
 * bank along the east edge, north of where the shells land there.
 */
function cloudLayout(ground: (x: number, z: number) => number): Puff[] {
  const r = rng(6607), out: Puff[] = [];
  const add = (x: number, over: number, z: number, sx: number, sy: number, sz: number, color: number, storm: boolean, turn: number): void => {
    out.push({ x, y: ground(x, z) + over, z, sx, sy, sz, color, storm, turn });
  };
  const south: [number, number, number][] = [[-95, 106, 0.95], [-73, 108, 1.0], [-51, 109, 0.85], [-29, 110, 0.9], [57, 109, 0.85]];
  for (const [x, z, k] of south) {
    add(x, 9 + r() * 1.5, z, 4.2 * k, 2.5 * k, 2.8, 0xe9ecf0, false, (r() - 0.5) * 0.5);
    add(x + (r() < 0.5 ? -1 : 1) * 7.5 * k, 8 + r(), z - 1 + r() * 2, 2.6 * k, 1.9 * k, 2.3, 0xdfe3e8, false, (r() - 0.5) * 0.6);
  }
  const east: [number, number, number][] = [[99, -104, 0.95], [97, -89, 1.1], [99, -74, 0.95], [97, -59, 1.05]];
  east.forEach(([x, z, k], i) => {
    add(x, 9.5 + r(), z, 4.0 * k, 2.8 * k, 3.0, i % 2 ? 0x5a6069 : 0x646a73, true, Math.PI / 2 + (r() - 0.5) * 0.5);
    if (i % 2 === 1) add(x + 0.5, 11 + r() * 0.6, z + (r() - 0.5) * 3, 2.3, 2.1, 2.3, 0x737a84, true, r() * TAU);
  });
  return out;
}

/**
 * A heap of cloud: a big round puff with a smaller one either side of it,
 * smooth, so that each stretched heap is a soft cumulus and not an egg or a
 * stone. About 3.3 across, 1.7 high and 1.8 deep before it is stretched.
 */
function cloudChunk(): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [];
  const bump = (detail: number, s: V3, c: V3): void => {
    const a = new THREE.IcosahedronGeometry(1, detail).getAttribute('position');
    for (let i = 0; i < a.count; i++) {
      const ux = a.getX(i), uy = a.getY(i), uz = a.getZ(i);
      pos.push(c[0] + ux * s[0], c[1] + uy * s[1], c[2] + uz * s[2]);
      const n = new THREE.Vector3(ux / s[0], uy / s[1], uz / s[2]).normalize();
      nor.push(n.x, n.y, n.z);
    }
  };
  bump(1, [1.0, 0.8, 0.92], [0, 0.12, 0]);
  bump(1, [0.74, 0.62, 0.72], [-0.92, -0.06, 0.08]);
  bump(1, [0.68, 0.58, 0.68], [0.9, -0.04, -0.06]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

/** The storm's lightning: now and then, somewhere in its bank, flickering inside the cloud or down to the ground at the board's edge. `over` is how high in the cloud it is. */
interface Bolt { t0: number; x: number; over: number; z: number; ground: boolean; seed: number }
const BOLT_EVERY = 6;
function boltIn(n: number): Bolt | null {
  if (hash(n * 3.17 + 1) > 0.72) return null;
  return {
    t0: n * BOLT_EVERY + hash(n * 7.1 + 3) * 4.2,
    x: 97 + hash(n * 2.9 + 4) * 3.5,
    over: 9 + hash(n * 4.3 + 5) * 2.5,
    z: lerp(-106, -56, hash(n * 6.7 + 6)),
    ground: hash(n * 8.9 + 7) < 0.45,
    seed: n,
  };
}
/** How bright a bolt is a moment after it strikes: three flickers. */
const flicker = (tau: number): number => Math.exp(-((tau / 0.035) ** 2)) + 0.6 * Math.exp(-(((tau - 0.09) / 0.03) ** 2)) + 0.85 * Math.exp(-(((tau - 0.24) / 0.04) ** 2));

// ---------------------------------------------------------------------------
// A shell, and all that is worked out for it when it is fired
// ---------------------------------------------------------------------------

/** A knight's last moments on the tile: out of the husk, then a stride or a leap towards the city, and gone. */
interface Afterlife { out: V3; leap: boolean; walk: V3[]; len: number; to: V3; arc: number; fadeAt: number; gone: number }
/** A Gray of a hivepod: from his place in the pod to his place in the line, and gone. */
interface Gray { from: V3; to: V3; at: number; dur: number; fade: number; face: number }

interface Shell {
  kind: number;
  seed: number;
  scale: number;
  fireAt: number;
  fired: boolean;
  /** Which tube it takes, and the ship's tubes as they are when it is fired. */
  tube: number;
  from: (() => V3[]) | null;
  keys: Key[];
  /** When its boots fire, when it strikes the shield and where, and when it lands and where. */
  bootsAt: number;
  strikeAt: number;
  strike: V3 | null;
  landAt: number;
  land: V3;
  /** Where it meant to land, before the shield turned it aside. */
  aim: V3;
  heading: number;
  roll: number;
  /** When each of its three friction panels burns away, the last of them first. */
  sheds: number[];
  husk: THREE.Color;
  paint: THREE.Color;
  after: Afterlife | null;
  grays: Gray[] | null;
  dust: number;
  ground: V3;
  opened: (() => void) | null;
  said: boolean;
  end: number;
}

/** A shot from one of the canyon's guns, aimed when its moment comes, at a shell it will miss. */
interface Shot { t: number; gun: number; from: V3; seed: number; aimed: boolean; burst: V3 | null; hit: number }

/** A place a shell will land, and the room it keeps there until its husk is gone. */
interface Site { x: number; z: number; r: number; until: number }

// ---------------------------------------------------------------------------
// The Rain
// ---------------------------------------------------------------------------

export function buildRain(k: Build, ground: (x: number, z: number) => number): Rain {
  let clock = 0;
  let held: number | null = null;
  const now = (): number => held ?? clock;
  let waves = 0, drops = 0;
  let up = true, downAt = -1e6, upAt = -1e6;

  const shells: Shell[] = [];
  const shots: Shot[] = [];
  const sites: Site[] = [];
  const probe = new Probe(k.b);

  // ------------------------------------------------------------- the meshes
  const husks = new Pack(huskHalf(), solidMaterial(k, 'rr-rain-husk', THREE.DoubleSide), 2 * MOST, 'iron rain husks', { iFx: 4, iAnim: 4 });
  const knights = new Pack(knightShape(), solidMaterial(k, 'rr-rain-knight', THREE.FrontSide), MOST, 'iron rain knights', { iFx: 4, iAnim: 4 });
  const grays = new Pack(grayShape(), solidMaterial(k, 'rr-rain-knight', THREE.FrontSide), 12 * 24, 'iron rain grays', { iFx: 4, iAnim: 4 });
  const puffs = new Pack(new THREE.IcosahedronGeometry(1, 0), k.mat.prop({ vertexColors: false, color: 0xffffff }), 900, 'iron rain dust');
  const scorch = new Pack(new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2), scorchMaterial(), MOST, 'iron rain scorches', { iAlpha: 1 });
  const layout = cloudLayout(ground);
  const clouds = new Pack(cloudChunk(), cloudMaterial(k), layout.length, 'iron rain clouds', { iGlow: 3 });
  const glowMat = new THREE.ShaderMaterial({
    uniforms: { uGain: { value: 1.5 } }, vertexShader: BATCH_VERT, fragmentShader: GLOW_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const smokeMat = new THREE.ShaderMaterial({ vertexShader: BATCH_VERT, fragmentShader: SMOKE_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const glow = new Batch(24000, glowMat, 'iron rain glow');
  const smoke = new Batch(21000, smokeMat, 'iron rain smoke');
  const dome = domeGeometry();
  const SHATTERED = dome.last + LIFE + 0.3;
  const shieldU = {
    uT: { value: 0 }, uDownAt: { value: downAt }, uUpAt: { value: upAt }, uNight: { value: 0 }, uFloor: { value: F }, uC: { value: new THREE.Vector3(CX, CY, CZ) },
    uStrike: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) }, uStrikes: { value: 0 }, uRise: { value: RISE.map((p) => new THREE.Vector3(...p)) },
  };
  const shieldMesh = new THREE.Mesh(dome.geo, new THREE.ShaderMaterial({
    uniforms: shieldU, vertexShader: SHIELD_VERT, fragmentShader: SHIELD_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
  shieldMesh.name = 'iron rain shield';
  shieldMesh.frustumCulled = false;
  shieldMesh.raycast = () => {};
  // the sky's things are left out of the mirror image of wet streets; what falls and lands is in it
  for (const m of [shieldMesh, clouds.mesh, smoke.mesh, scorch.mesh]) m.layers.set(1);
  clouds.mesh.renderOrder = 2;
  shieldMesh.renderOrder = 3;
  smoke.mesh.renderOrder = 4;
  glow.mesh.renderOrder = 5;
  for (const m of [husks.mesh, knights.mesh, grays.mesh]) m.receiveShadow = true;
  k.group.add(husks.mesh, knights.mesh, grays.mesh, puffs.mesh, scorch.mesh, clouds.mesh, shieldMesh, smoke.mesh, glow.mesh);

  // ------------------------------------------------------------- the ground
  /** How high what stands is at a place: the ground, or anything built on it. */
  const height = (x: number, z: number): number => Math.max(ground(x, z), probe.top(x, z));
  /** The slope of the ground at a place, as which way is up there. */
  const slope = (x: number, z: number): V3 => {
    const dx = height(x - 1, z) - height(x + 1, z), dz = height(x, z - 1) - height(x, z + 1);
    const l = Math.hypot(dx, 2, dz);
    return [dx / l, 2 / l, dz / l];
  };
  const TALL = LOTS.filter((l) => l.top > 0);
  /** How high a shell must keep above a place in flight: the ground, or the top of any lot over it. */
  const clearAt = (x: number, z: number): number => {
    let y = ground(x, z);
    for (const l of TALL) if (x > l.x0 - 2 && x < l.x1 + 2 && z > l.z0 - 2 && z < l.z1 + 2) y = Math.max(y, l.top);
    return y;
  };
  /** What the dust a shell throws up is: snow on the peaks and the plateau, pale stone on the city's floor, earth elsewhere. */
  const dustAt = (x: number, y: number, z: number): number => (snowAt(x, z, y) > 0.5 ? SNOW_DUST : outOfTrench(x, z) < 0 && Math.abs(y - F) < 1 ? STONE_DUST : DUST);

  // ------------------------------------------------------------- where shells land
  const VX = 0.669, VZ = 0.743;
  /**
   * A place in a zone for a shell to land, with room for its husk to fall
   * open: on the board, out of the water and off the roads, clear of trees,
   * lamps, people and name boards, on ground level enough to stand on, and
   * clear of every other landing that still stands. It keeps off the stories'
   * stages and the strips before the places for heroes where it can.
   */
  function site(zone: Zone, R: () => number, reach: number, at: number): V3 {
    const trees = k.trees ?? [], lamps = k.lamps ?? [];
    const live = sites.filter((s) => s.until > at - 2);
    let best: V3 = [(zone.x0 + zone.x1) / 2, 0, (zone.z0 + zone.z1) / 2], bestCost = Infinity;
    const w = Math.max(0.5, zone.x1 - zone.x0 - 4), d = Math.max(0.5, zone.z1 - zone.z0 - 4);
    // every place tried has a cost, and the cheapest is taken: so a squadron spreads out even where the ground is poor
    for (let n = 0; n < 48 && bestCost > 0.6; n++) {
      const x = zone.x0 + 2 + R() * w, z = zone.z0 + 2 + R() * d;
      if (Math.abs(x) > 101 || Math.abs(z) > 110) continue;
      let cost = 0;
      if (inWater(x, z, 3)) cost += 100;
      // off the roads by the room its husk takes to fall open, and never on one
      const road = toRoad(x, z);
      if (road < ROAD_HALF + reach * 0.75) cost += 20 + 10 * (ROAD_HALF + reach * 0.75 - road) + (road < ROAD_HALF ? 200 : 0);
      if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < t.s * 2.7 + reach * 0.6)) cost += 30;
      if (lamps.some((l) => Math.hypot(l.x - x, l.z - z) < 2.5 + reach * 0.5)) cost += 30;
      if (k.people.some((p) => Math.hypot(p.x - x, p.z - z) < 1.5 + reach * 0.5)) cost += 30;
      if (BOARDS.some((b) => Math.hypot(b.x - x, b.z - z) < b.w / 2 + reach)) cost += 30;
      // clear of every landing that still stands
      for (const s of live) {
        const dd = Math.hypot(s.x - x, s.z - z), room = s.r + reach;
        if (dd < room) cost += 40 * (1 - dd / room) + 10;
      }
      // as level as the planet's limb allows: it is steep near the board's edges
      const hs = [height(x, z), height(x + 2.2, z), height(x - 2.2, z), height(x, z + 2.2), height(x, z - 2.2)];
      const spread = Math.max(...hs) - Math.min(...hs);
      cost += 0.8 * spread + (spread > 4 ? 50 : 0);
      if (onStage(x, z, 2)) cost += 3;
      for (const h of HERO_SPOTS) {
        const ex = x - h.x, ez = z - h.z, along = ex * VX + ez * VZ, across = Math.abs(-ex * VZ + ez * VX);
        if (Math.hypot(ex, ez) < 8 || (along > 0 && along < 14 && across < 7)) cost += 5;
      }
      if (cost < bestCost) {
        bestCost = cost;
        // on a slope it lands dug in a little on the uphill side, as a hard landing would
        best = [x, hs[0] - 0.35 * (hs[0] - Math.min(...hs)), z];
      }
    }
    if (bestCost === Infinity) best[1] = height(best[0], best[2]);
    return best;
  }

  /** The zones outside the dome that a shell turned aside by the shield may land in. */
  const OUTSIDE: Zone[] = [LANDINGS.west, LANDINGS.east, LANDINGS.plateau, LANDINGS.flank, LANDINGS.peaks];
  const zoneUnder = (z: Zone): boolean => underDome((z.x0 + z.x1) / 2, (z.z0 + z.z1) / 2);
  /** The zone outside the dome nearest a place. */
  function nearestOutside(x: number, z: number, zones: Zone[]): Zone {
    const pool = zones.filter((zz) => !zoneUnder(zz));
    const from = pool.length ? pool : OUTSIDE;
    let best = from[0], bd = Infinity;
    for (const zz of from) {
      const dx = Math.max(zz.x0 - x, 0, x - zz.x1), dz = Math.max(zz.z0 - z, 0, z - zz.z1), dd = Math.hypot(dx, dz);
      if (dd < bd) { bd = dd; best = zz; }
    }
    return best;
  }

  // ------------------------------------------------------------- the way a shell flies
  /**
   * The way from where a shell is to where it lands under its boots: round the
   * dome while the shield stands (but where it means to land under it, which
   * is the strike's to settle), and over everything built, coming in to land
   * slowly from the way it was going.
   */
  function route(a: Key, L: V3, avoid: boolean): Key[] {
    const pts: V3[] = [a.p, L];
    const bad = (x: number, y: number, z: number, margin: number): boolean => {
      if (avoid && Math.hypot(x - a.p[0], y - a.p[1], z - a.p[2]) > 4 && inDome(x, y, z, margin)) return true;
      return Math.hypot(x - L[0], z - L[2]) > 14 && y < clearAt(x, z) + 5;
    };
    /** Puts a place in the way, out from under the dome and up over what is built. */
    const mend = (x: number, y: number, z: number, k2: number): V3 => {
      let mx = x, mz = z;
      if (avoid && underDome(x, z, 6)) [mx, mz] = outFromDome(x, z, 8, k2);
      return [mx, Math.max(y, clearAt(mx, mz) + 9), mz];
    };
    for (let n = 0; n < 10; n++) {
      let fixed = false;
      for (let i = 0; i + 1 < pts.length && !fixed; i++) {
        const p = pts[i], q = pts[i + 1];
        for (let s = 1; s < 12; s++) {
          const f = s / 12;
          if (!bad(lerp(p[0], q[0], f), lerp(p[1], q[1], f), lerp(p[2], q[2], f), 5)) continue;
          pts.splice(i + 1, 0, mend(lerp(p[0], q[0], 0.5), lerp(p[1], q[1], 0.5), lerp(p[2], q[2], 0.5), 1.1));
          fixed = true;
          break;
        }
      }
      if (!fixed) break;
    }
    const keysOf = (): Key[] => {
      const keys: Key[] = [a];
      let t = a.t;
      for (let i = 1; i < pts.length; i++) {
        const len = dist3(pts[i - 1], pts[i]), last = i === pts.length - 1;
        t += Math.max(last ? 1.3 : 0.5, len / (BOOTS * (last ? 0.7 : 1)));
        keys.push({ t, p: pts[i], v: [0, 0, 0] });
      }
      for (let i = 1; i < keys.length - 1; i++) {
        const p = keys[i - 1], q = keys[i + 1], dt = q.t - p.t;
        keys[i].v = [(q.p[0] - p.p[0]) / dt, (q.p[1] - p.p[1]) / dt, (q.p[2] - p.p[2]) / dt];
      }
      const e = keys[keys.length - 1], b = keys[keys.length - 2], dx = e.p[0] - b.p[0], dz = e.p[2] - b.p[2], dl = Math.hypot(dx, dz) || 1;
      e.v = [(dx / dl) * 1.6, -2.6, (dz / dl) * 1.6];
      return keys;
    };
    // the curve through the places can swing wider than the lines between them: where it does, another place in the way
    let keys = keysOf();
    const P: V3 = [0, 0, 0];
    for (let n = 0; n < 6; n++) {
      let at = -1;
      for (let i = 0; i + 1 < keys.length && at < 0; i++) {
        for (let s = 1; s < 16; s++) {
          pathAt(keys, lerp(keys[i].t, keys[i + 1].t, s / 16), P);
          if (bad(P[0], P[1], P[2], 1.5)) { at = i; break; }
        }
      }
      if (at < 0) break;
      pathAt(keys, (keys[at].t + keys[at + 1].t) / 2, P);
      pts.splice(at + 1, 0, mend(P[0], P[1], P[2], 1.18));
      keys = keysOf();
    }
    return keys;
  }

  /** The first moment its way runs into the dome, found to a hundredth of a second, with where it is then and how fast. */
  function intoDome(keys: Key[], scale: number): { t: number; p: V3; v: V3 } | null {
    const P: V3 = [0, 0, 0], m = 1.5 * scale, t0 = keys[0].t, t1 = keys[keys.length - 1].t;
    const inside = (t: number): boolean => { pathAt(keys, t, P); return P[1] > F + 1.5 && domeE(P[0], P[1], P[2], m) < 1; };
    let prev = t0;
    for (let t = t0 + 0.05; t <= t1; t += 0.05) {
      if (inside(t)) {
        let lo = prev, hi = t;
        for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2; if (inside(mid)) hi = mid; else lo = mid; }
        const p: V3 = [0, 0, 0], v: V3 = [0, 0, 0];
        pathAt(keys, lo, p, v);
        return { t: lo, p, v };
      }
      prev = t;
    }
    return null;
  }

  /**
   * Strikes the shield where `keys` run into it: a flash and a ripple, a skid
   * down the dome's side, and off it on its boots onto ground outside, in the
   * zone nearest. Hands back the new way, when its boots fire, and where it
   * strikes and lands; or null if its way does not touch the dome.
   */
  function strikeOff(keys: Key[], bootsAt: number, scale: number, zones: Zone[], R: () => number, reach: number): { keys: Key[]; bootsAt: number; at: number; strike: V3; land: V3 } | null {
    const hit = intoDome(keys, scale);
    if (!hit) return null;
    const S = hit.p;
    // where it touches the glass
    const e = 1 / Math.sqrt(domeE(S[0], S[1], S[2]));
    const touch: V3 = [CX + (S[0] - CX) * e, CY + (S[1] - CY) * e, CZ + (S[2] - CZ) * e];
    const zone = nearestOutside(S[0], S[2], zones);
    const L = site(zone, R, reach, hit.t + 6);
    const dx = L[0] - S[0], dz = L[2] - S[2], dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl;
    const len = Math.min(26, toFoot(S[0], S[2], ux, uz) * 0.7), lift = 1.3 * scale;
    const K1: V3 = [S[0] + ux * len * 0.4, 0, S[2] + uz * len * 0.4];
    K1[1] = domeY(K1[0], K1[2]) + lift;
    const K2: V3 = [S[0] + ux * len, 0, S[2] + uz * len];
    K2[1] = domeY(K2[0], K2[2]) + lift;
    const t1 = hit.t + Math.max(0.15, dist3(S, K1) / SKID), t2 = t1 + Math.max(0.15, dist3(K1, K2) / (SKID - 2));
    const v1: V3 = [(K2[0] - S[0]) / (t2 - hit.t), (K2[1] - S[1]) / (t2 - hit.t), (K2[2] - S[2]) / (t2 - hit.t)];
    const v2: V3 = [(K2[0] - K1[0]) / (t2 - t1), (K2[1] - K1[1]) / (t2 - t1), (K2[2] - K1[2]) / (t2 - t1)];
    const head = keys.filter((kk) => kk.t < hit.t - 1e-3);
    const next = [...head, { t: hit.t, p: S, v: hit.v }, { t: t1, p: K1, v: v1 }, ...route({ t: t2, p: K2, v: v2 }, L, true)];
    return { keys: next, bootsAt: Math.min(bootsAt, t2), at: hit.t, strike: touch, land: L };
  }

  /**
   * A shell's way from a tube to a place, through where its boots fire: the
   * streak down from the tube, over the dome if the shield stands and the ship
   * is above it, or round it if it is not, and then under its boots.
   */
  function streakTo(t0: number, P0: V3, B: V3, out: V3, L: V3, avoid: boolean): { keys: Key[]; bootsAt: number } {
    const pts: V3[] = [P0, B];
    const into = (p: V3, m: number): boolean => avoid && inDome(p[0], p[1], p[2], m);
    for (let n = 0; n < 6; n++) {
      let fixed = false;
      for (let i = 0; i + 1 < pts.length && !fixed; i++) {
        const p = pts[i], q = pts[i + 1];
        for (let s = 1; s < 12; s++) {
          const f = s / 12;
          if (!into([lerp(p[0], q[0], f), lerp(p[1], q[1], f), lerp(p[2], q[2], f)], 4)) continue;
          let mx = lerp(p[0], q[0], 0.5), my = lerp(p[1], q[1], 0.5), mz = lerp(p[2], q[2], 0.5);
          if (my > CY + RY * 0.55) my = Math.max(my, domeY(mx, mz) + 10);
          else [mx, mz] = outFromDome(mx, mz, 8, 1.1);
          pts.splice(i + 1, 0, [mx, my, mz]);
          fixed = true;
          break;
        }
      }
      if (!fixed) break;
    }
    const keys: Key[] = [{ t: t0, p: P0, v: out }];
    // a long streak across the sky is flown faster, so that none lasts more than a few seconds
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += dist3(pts[i - 1], pts[i]);
    const speed = Math.max(STREAK, len / 5.5);
    let t = t0;
    for (let i = 1; i < pts.length; i++) {
      t += dist3(pts[i - 1], pts[i]) / speed;
      keys.push({ t, p: pts[i], v: [0, 0, 0] });
    }
    // never shorter than a second and a bit, however near the cloud the tubes are
    const stretch = Math.max(1, 1.2 / Math.max(1e-3, t - t0));
    keys.forEach((kk) => (kk.t = t0 + (kk.t - t0) * stretch));
    for (let i = 1; i < keys.length - 1; i++) {
      const a = keys[i - 1], b = keys[i + 1], dt = b.t - a.t;
      keys[i].v = [(b.p[0] - a.p[0]) / dt, (b.p[1] - a.p[1]) / dt, (b.p[2] - a.p[2]) / dt];
    }
    const e = keys[keys.length - 1], b = keys[keys.length - 2], dl = dist3(e.p, b.p) || 1, ve = Math.min(speed * 0.8, 16);
    e.v = [((e.p[0] - b.p[0]) / dl) * ve, ((e.p[1] - b.p[1]) / dl) * ve, ((e.p[2] - b.p[2]) / dl) * ve];
    return { keys: [...keys.slice(0, -1), ...route(e, L, avoid)], bootsAt: e.t };
  }

  /** What a knight does once he is out of his husk: a stride or a leap towards the city, as far as there is ground for it. */
  function afterlife(L: V3, heading: number, R: () => number): Afterlife {
    const hx = Math.cos(heading), hz = Math.sin(heading);
    const out: V3 = [L[0] + hx * 2.6, 0, L[2] + hz * 2.6];
    out[1] = height(out[0], out[2]);
    const home = LOTS.filter((l) => L[0] > l.x0 && L[0] < l.x1 && L[2] > l.z0 && L[2] < l.z1);
    const free = (x: number, z: number, room: number): boolean => {
      if (Math.abs(x) > 101 || Math.abs(z) > 110) return false;
      if (up && underDome(x, z, 3)) return false;
      if (inWater(x, z, 1) || toRoad(x, z) < ROAD_HALF + room) return false;
      return !LOTS.some((l) => !home.includes(l) && !l.part && x > l.x0 - room && x < l.x1 + room && z > l.z0 - room && z < l.z1 + room);
    };
    const leap = R() < 0.4;
    // how far the ground lets him go
    const walk: V3[] = [out];
    let y = out[1];
    for (let d = 0.8; d <= (leap ? 14 : 7.6); d += 0.8) {
      const x = out[0] + hx * d, z = out[2] + hz * d, h = height(x, z);
      if (!free(x, z, leap ? 0.5 : 1) || (!leap && Math.abs(h - y) > 1.1)) break;
      y = h;
      walk.push([x, h, z]);
    }
    const len = (walk.length - 1) * 0.8;
    if (leap && len >= 6) {
      const to = walk[walk.length - 1];
      // high enough to clear the ground under it, all the way
      let arc = 6.5;
      for (let n = 0; n < 6; n++) {
        let ok = true;
        for (let u = 0.05; u < 0.95; u += 0.05) {
          const x = lerp(out[0], to[0], u), z = lerp(out[2], to[2], u), yy = lerp(out[1], to[1], u) + 4 * arc * u * (1 - u);
          if (yy < height(x, z) + 1.2) { ok = false; break; }
        }
        if (ok) break;
        arc += 3;
      }
      return { out, leap: true, walk, len, to, arc, fadeAt: STEP1 + 0.35 + 0.75, gone: STEP1 + 0.35 + 1.7 };
    }
    const walked = Math.min(len, 7.2), dur = walked / 1.6;
    return { out, leap: false, walk, len: walked, to: walk[walk.length - 1], arc: 0, fadeAt: STEP1 + Math.max(1.6, dur - 0.6), gone: STEP1 + Math.max(1.6, dur - 0.6) + 1.2 };
  }

  /** The twelve Grays of a hivepod: in three rows in the pod, then out in a fanned line towards the city. */
  function grayLine(L: V3, heading: number, R: () => number): Gray[] {
    const hx = Math.cos(heading), hz = Math.sin(heading), px = -hz, pz = hx;
    return Array.from({ length: 12 }, (_, j): Gray => {
      const row = Math.floor(j / 4), col = j % 4;
      const fx = L[0] + hx * (1 - row) * 1.1 + px * (col - 1.5) * 1.15, fz = L[2] + hz * (1 - row) * 1.1 + pz * (col - 1.5) * 1.15;
      let along = 4.5 + row * 1.9 + R() * 0.8;
      const across = (col - 1.5) * 2.4 + (R() - 0.5) * 0.8;
      let tx = 0, tz = 0;
      for (let n = 0; n < 6; n++) {
        tx = L[0] + hx * along + px * across;
        tz = L[2] + hz * along + pz * across;
        if (!(up && underDome(tx, tz, 2)) && !inWater(tx, tz, 1) && toRoad(tx, tz) >= ROAD_HALF && Math.abs(height(tx, tz) - L[1]) < 3) break;
        along *= 0.7;
      }
      const from: V3 = [fx, height(fx, fz), fz], to: V3 = [tx, height(tx, tz), tz];
      const d = Math.hypot(tx - fx, tz - fz);
      return { from, to, at: HIVE_OUT + j * 0.07, dur: d / 2.6, fade: 8.6 + j * 0.12, face: Math.atan2(tz - fz, tx - fx) };
    });
  }

  /** Plans one shell from a tube to a place: its way, its strike if the shield turns it, and what it does once it is down. */
  function plan(o: { kind: number; fireAt: number; tube: number; from: (() => V3[]) | null; P0: V3; B: V3; out: V3; aim: V3; zones: Zone[]; R: () => number; husk: number; paint: number; strikes: boolean }): Shell {
    const { kind, R } = o, scale = SIZE[kind];
    const under = underDome(o.aim[0], o.aim[2], 1);
    let { keys, bootsAt } = streakTo(o.fireAt, o.P0, o.B, o.out, o.aim, up && !under);
    let strikeAt = Infinity, strike: V3 | null = null, land = o.aim;
    if (up && o.strikes) {
      const s = strikeOff(keys, bootsAt, scale, o.zones, R, REACH[kind]);
      if (s) ({ keys, bootsAt, at: strikeAt, strike, land } = s);
    }
    const landAt = keys[keys.length - 1].t;
    land = keys[keys.length - 1].p;
    const heading = Math.atan2(CZ - land[2], CX - land[0]);
    const T1 = bootsAt - o.fireAt;
    const sheds = [0.78, 0.52, 0.27].map((f) => o.fireAt + T1 * (f + (R() - 0.5) * 0.1));
    const after = kind === KNIGHT ? afterlife(land, heading, R) : null;
    const gr = kind === HIVE ? grayLine(land, heading, R) : null;
    const lastOn = Math.max(SCORCH_GONE, HUSK_GONE, after ? after.gone : 0, gr ? Math.max(...gr.map((g) => g.fade + 1)) : 0);
    sites.push({ x: land[0], z: land[2], r: REACH[kind], until: landAt + HUSK_GONE });
    return {
      kind, seed: R() * 1e5, scale, fireAt: o.fireAt, fired: false, tube: o.tube, from: o.from, keys, bootsAt, strikeAt, strike, landAt, land, aim: o.aim, heading,
      roll: R() * TAU, sheds, husk: new THREE.Color(o.husk), paint: new THREE.Color(o.paint), after, grays: gr,
      dust: dustAt(land[0], land[1], land[2]), ground: slope(land[0], land[2]), opened: null, said: false, end: landAt + lastOn + 0.5,
    };
  }

  /** Where a ship's tubes are now, never none. */
  const tubesOf = (from: () => V3[]): V3[] => {
    let t: V3[] = [];
    try { t = from(); } catch { t = []; }
    return t && t.length ? t : [[82, 100, 40]];
  };

  // ------------------------------------------------------------- the guns
  /** The canyon's guns, each with the muzzles of its barrels: muzzles side by side are one gun's. */
  const gunsNow = (): V3[][] => {
    const guns: V3[][] = [];
    for (const m of GUN_MUZZLES as V3[]) {
      const g = guns.find((gg) => dist3(gg[0], m) < 2.5);
      if (g) g.push(m);
      else guns.push([m]);
    }
    return guns;
  };
  /** Bursts from each of the canyon's guns while a wave is in the air, three tracers at a time from its barrels in turn. */
  function planShots(t0: number, t1: number, R: () => number): void {
    gunsNow().forEach((barrels, gun) => {
      let t = t0 + 1.6 + R() * 1.5;
      while (t < t1) {
        for (let b = 0; b < 3; b++) shots.push({ t: t + b * 0.12, gun, from: barrels[b % barrels.length], seed: R() * 1e5, aimed: false, burst: null, hit: 0 });
        t += 1.5 + R() * 1.3;
      }
    });
  }
  const P_ = [0, 0, 0] as V3, V_ = [0, 0, 0] as V3;
  /** Whether a line of fire from a gun passes through the dome. */
  const throughDome = (a: V3, b: V3): boolean => {
    if (!up) return false;
    for (let i = 1; i < 10; i++) if (inDome(lerp(a[0], b[0], i / 10), lerp(a[1], b[1], i / 10), lerp(a[2], b[2], i / 10))) return true;
    return false;
  };
  /** Aims a shot when its moment comes: at a shell in the air the gun can see past the dome if it can, leading it, and missing by a few units. */
  function aimShot(sh: Shot): void {
    sh.aimed = true;
    const m = sh.from;
    const cands = shells.filter((s) => s.kind !== MARKED && s.fireAt < sh.t - 0.3 && s.landAt > sh.t + 1.6).filter((s) => {
      pathAt(s.keys, sh.t + 0.9, P_);
      return P_[1] > 32;
    });
    if (!cands.length) return;
    const clear = cands.filter((s) => { pathAt(s.keys, sh.t + 0.9, P_); return !throughDome(m, P_); });
    const pool = clear.length ? clear : cands;
    const s = pool[Math.floor(hash(sh.seed) * pool.length) % pool.length];
    let tHit = sh.t + 1;
    for (let i = 0; i < 3; i++) { pathAt(s.keys, tHit, P_); tHit = sh.t + dist3(m, P_) / TRACER; }
    pathAt(s.keys, tHit, P_);
    // across the line of fire, a few units off
    const fx = P_[0] - m[0], fy = P_[1] - m[1], fz = P_[2] - m[2], fl = Math.hypot(fx, fy, fz) || 1;
    let ax = -fz, az = fx;
    const al = Math.hypot(ax, az) || 1;
    ax /= al; az /= al;
    const bx = (fy * az) / fl, by = (fz * ax - fx * az) / fl, bz = (-fy * ax) / fl;
    const miss = 4 + 4 * hash(sh.seed + 1), a = hash(sh.seed + 2) * TAU;
    sh.burst = [P_[0] + (ax * Math.cos(a) + bx * Math.sin(a)) * miss, P_[1] + by * Math.sin(a) * miss, P_[2] + (az * Math.cos(a) + bz * Math.sin(a)) * miss];
    sh.hit = sh.t + dist3(m, sh.burst) / TRACER;
  }

  // ------------------------------------------------------------- the waves
  function wave(from: () => V3[], zones: Zone[], count: number): number {
    const t0 = now();
    const room = MOST - shells.length;
    const n = Math.min(Math.max(0, Math.floor(count)), room);
    if (n <= 0 || zones.length === 0) return 0;
    const R = rng(0x1ea7 + 977 * ++waves);
    const tubes = tubesOf(from);
    const tx = tubes.reduce((s, p) => s + p[0], 0) / tubes.length, ty = tubes.reduce((s, p) => s + p[1], 0) / tubes.length, tz = tubes.reduce((s, p) => s + p[2], 0) / tubes.length;
    // the tubes in a row along the ship's side, from one end to the other
    const far = (from0: V3): V3 => tubes.reduce((best, p) => (Math.hypot(p[0] - from0[0], p[2] - from0[2]) > Math.hypot(best[0] - from0[0], best[2] - from0[2]) ? p : best), from0);
    const end1 = far([tx, ty, tz]), end2 = far(end1), al = Math.hypot(end2[0] - end1[0], end2[2] - end1[2]);
    const ax = al > 1 ? (end2[0] - end1[0]) / al : 1, az = al > 1 ? (end2[2] - end1[2]) / al : 0;
    const along = (x: number, z: number): number => (x - tx) * ax + (z - tz) * az;
    const row = tubes.map((p, i) => ({ i, s: along(p[0], p[2]) })).sort((a, b) => a.s - b.s).map((o) => o.i);
    // the squadrons: the shells shared out among the zones, each zone a stretch of the row, in the order the zones lie along it
    const order = [...zones].sort((a, b) => along((a.x0 + a.x1) / 2, (a.z0 + a.z1) / 2) - along((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2));
    const per = order.map((_, i) => Math.floor(n / order.length) + (i < n % order.length ? 1 : 0));
    const hives = n >= 18 ? 2 : n >= 4 ? 1 : 0;
    const hiveAt = new Set<number>();
    for (let h = 0; h < hives; h++) hiveAt.add(Math.floor(((h + 0.5) / hives) * n));
    let i = 0, last = t0, airEnd = t0;
    order.forEach((zone, zi) => {
      for (let j = 0; j < per[zi]; j++, i++) {
        const kind = hiveAt.has(i) ? HIVE : KNIGHT;
        // a volley rippling along the row of tubes, so that the wave falls as a curtain of streaks side by side
        const f = n > 1 ? i / (n - 1) : 0.5;
        const tube = row[Math.round(f * (row.length - 1))];
        const fireAt = t0 + f * VOLLEY + (R() - 0.5) * 0.05;
        const P0 = tubes[tube];
        const aim = site(zone, R, REACH[kind], fireAt + 9);
        // it streaks most of the way towards where it lands, so that the volley fans out across the sky, and fires its
        // boots at the cloud line; its squadron, out of the tubes beside it and bound for the same zone, flies with it
        const k2 = 0.68 + (R() - 0.5) * 0.1, near = Math.hypot(aim[0] - P0[0], aim[2] - P0[2]) < 24;
        const B: V3 = [
          lerp(P0[0], aim[0], near ? 0.5 : k2) + (R() - 0.5) * 3,
          Math.min(Math.max(aim[1] + BOOTS_OVER, BOOTS_LEAST) + (R() - 0.5) * 5, P0[1] - 12),
          lerp(P0[2], aim[2], near ? 0.5 : k2) + (R() - 0.5) * 3,
        ];
        if (up && !underDome(aim[0], aim[2], 1) && inDome(B[0], B[1], B[2], 6)) {
          const o = outFromDome(B[0], B[2], 8, 1.06);
          B[0] = o[0]; B[2] = o[1];
        }
        // out of the tube the way it will fall, so that no shell turns back on itself
        const bx = B[0] - P0[0], bz = B[2] - P0[2], bl = Math.hypot(bx, bz);
        const out: V3 = bl > 1 ? [(bx / bl) * Math.min(15, bl * 0.9), -6, (bz / bl) * Math.min(15, bl * 0.9)] : [0, -10, 0];
        const s = plan({
          kind, fireAt, tube, from, P0, B, out, aim, zones, R,
          husk: kind === HIVE ? HIVE_PAINT : HUSK_PAINT, paint: kind === HIVE ? GRAY_PAINT : KNIGHT_PAINTS[Math.floor(R() * KNIGHT_PAINTS.length)], strikes: true,
        });
        shells.push(s);
        last = Math.max(last, s.landAt + (kind === HIVE ? HIVE_OUT + 1.5 : STEP1));
        airEnd = Math.max(airEnd, s.landAt - 1.5);
      }
    });
    planShots(t0, airEnd, R);
    return last - t0;
  }

  function drop(from: V3, to: V3, paint: number, opened?: () => void): number {
    const t0 = now();
    const R = rng(0xd0e5 + 613 * ++drops);
    // a streak most of the way from where it is fired towards where it lands, down to the cloud line, and then under its boots to the place
    const near = Math.hypot(to[0] - from[0], to[2] - from[2]) < 24;
    const B: V3 = [lerp(from[0], to[0], near ? 0.5 : 0.7), Math.min(from[1] - 10, Math.max(BOOTS_LEAST, to[1] + BOOTS_OVER)), lerp(from[2], to[2], near ? 0.5 : 0.7)];
    if (up && !underDome(to[0], to[2], 1) && inDome(B[0], B[1], B[2], 8)) {
      const o = outFromDome(B[0], B[2], 10, 1.08);
      B[0] = o[0]; B[2] = o[1];
    }
    const bx = B[0] - from[0], bz = B[2] - from[2], bl = Math.hypot(bx, bz);
    const out: V3 = bl > 1 ? [(bx / bl) * Math.min(12, bl * 0.9), -6, (bz / bl) * Math.min(12, bl * 0.9)] : [0, -10, 0];
    const s = plan({ kind: MARKED, fireAt: t0, tube: 0, from: null, P0: [from[0], from[1], from[2]], B, out, aim: [to[0], to[1], to[2]], zones: OUTSIDE, R, husk: paint, paint, strikes: false });
    s.opened = opened ?? null;
    shells.push(s);
    return s.landAt + SPLIT - t0;
  }

  // ------------------------------------------------------------- the shield
  /** Once the shield has changed, shells already on their way fly on as the dome now stands. */
  function rethink(): void {
    const T = now(), P: V3 = [0, 0, 0], V: V3 = [0, 0, 0];
    for (const s of shells) {
      if (s.kind === MARKED || T >= s.landAt || T < s.fireAt) continue;
      if (!up && s.strikeAt > T) {
        // the shield is going: a shell that would strike a part of it that has already broken flies on to where it meant to land
        if (s.strike && downAt + breakAt(s.strike[0], s.strike[1], s.strike[2]) > s.strikeAt) continue;
        pathAt(s.keys, T, P, V);
        const head = s.keys.filter((kk) => kk.t < T - 1e-3);
        const here: Key = { t: T, p: [...P], v: [...V] };
        const rest = route(here, s.aim, false);
        s.keys = [...head, ...rest];
        s.strikeAt = Infinity;
        s.strike = null;
      } else if (up && underDome(s.aim[0], s.aim[2], 1) && s.strikeAt === Infinity) {
        // the shield is rising: one bound for the city strikes it now
        pathAt(s.keys, T, P, V);
        if (inDome(P[0], P[1], P[2])) continue;
        const head = s.keys.filter((kk) => kk.t < T - 1e-3);
        const R = rng(Math.floor(s.seed));
        const struck = strikeOff([...head, { t: T, p: [...P], v: [...V] }, ...s.keys.filter((kk) => kk.t > T + 1e-3)], s.bootsAt, s.scale, OUTSIDE, R, REACH[s.kind]);
        if (!struck || struck.at < T + 1.5) continue;
        s.keys = struck.keys;
        s.bootsAt = struck.bootsAt;
        s.strikeAt = struck.at;
        s.strike = struck.strike;
      } else continue;
      // where it lands now, and all that follows from it
      s.landAt = s.keys[s.keys.length - 1].t;
      s.land = s.keys[s.keys.length - 1].p;
      s.heading = Math.atan2(CZ - s.land[2], CX - s.land[0]);
      const R = rng(Math.floor(s.seed) + 7);
      s.after = s.kind === KNIGHT ? afterlife(s.land, s.heading, R) : null;
      s.grays = s.kind === HIVE ? grayLine(s.land, s.heading, R) : null;
      s.dust = dustAt(s.land[0], s.land[1], s.land[2]);
      s.ground = slope(s.land[0], s.land[2]);
      s.end = s.landAt + Math.max(SCORCH_GONE, HUSK_GONE, s.after ? s.after.gone : 0, s.grays ? Math.max(...s.grays.map((g) => g.fade + 1)) : 0) + 0.5;
    }
  }

  const shield = {
    up(): void {
      if (up) return;
      up = true;
      upAt = now();
      rethink();
    },
    down(): void {
      if (!up) return;
      up = false;
      downAt = now();
      rethink();
    },
    isUp: (): boolean => up,
  };

  // ------------------------------------------------------------- drawing it all, every frame
  const m4 = new THREE.Matrix4(), mh = new THREE.Matrix4(), mb = new THREE.Matrix4();
  const RY_PI = new THREE.Matrix4().makeRotationY(Math.PI);
  const q = new THREE.Quaternion(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  const pv = new THREE.Vector3(), sv = new THREE.Vector3(), col = new THREE.Color();
  const AX = new THREE.Vector3(), AY = new THREE.Vector3(), AZ = new THREE.Vector3(), basis = new THREE.Matrix4();
  const UPV = new THREE.Vector3(0, 1, 0), ZV = new THREE.Vector3(0, 0, 1);
  const P: V3 = [0, 0, 0], V: V3 = [0, 0, 0], Q: V3 = [0, 0, 0];
  const SP = new Float32Array(3 * 20), SW = new Float32Array(20), SC = new Float32Array(4 * 20);

  /** Turns `out` so that a shell's head points along `u` and its front along `f`, as near as can be. */
  function orient(out: THREE.Quaternion, ux: number, uy: number, uz: number, fx: number, fy: number, fz: number): void {
    AY.set(ux, uy, uz).normalize();
    AX.set(fx, fy, fz).addScaledVector(AY, -(fx * AY.x + fy * AY.y + fz * AY.z));
    if (AX.lengthSq() < 1e-6) AX.set(1, 0, 0).addScaledVector(AY, -AY.x);
    if (AX.lengthSq() < 1e-6) AX.set(0, 0, 1).addScaledVector(AY, -AY.z);
    AX.normalize();
    AZ.crossVectors(AX, AY);
    basis.makeBasis(AX, AY, AZ);
    out.setFromRotationMatrix(basis);
  }

  /** How hot a shell is: heating on the way down, flaring as each panel goes, and cooling once its boots fire. */
  function heatOf(s: Shell, T: number): number {
    if (T < s.fireAt) return 0;
    let h = T < s.bootsAt ? Math.min(1, 0.25 + (0.75 * (T - s.fireAt)) / Math.max(0.3, 0.45 * (s.bootsAt - s.fireAt))) : Math.exp(-(T - s.bootsAt) / 0.9);
    for (const t of s.sheds) h += 0.35 * Math.exp(-(((T - t) / 0.08) ** 2));
    return clamp(h, 0, 1.3);
  }

  /** The way a shell faces in flight: feet first and turning about itself in the streak, upright and leaning into its way under its boots. */
  function flightTurn(s: Shell, T: number, out: THREE.Quaternion): void {
    const streak = (t: number, o: THREE.Quaternion): void => {
      pathAt(s.keys, t, Q, V);
      orient(o, -V[0], -V[1], -V[2], V[0], 0, V[2]);
      o.multiply(qb.setFromAxisAngle(UPV, s.roll + (t - s.fireAt) * 2.2));
    };
    if (T < s.bootsAt) { streak(T, out); return; }
    pathAt(s.keys, T, Q, V);
    const turn = ease(span(T, s.landAt - 1.3, s.landAt - 0.2));
    const sp = Math.hypot(V[0], V[2]) || 1;
    const fx = lerp(V[0] / sp, Math.cos(s.heading), turn), fz = lerp(V[2] / sp, Math.sin(s.heading), turn);
    const lean = Math.min(0.4, 0.03 * sp);
    orient(out, (V[0] / sp) * lean, 1, (V[2] / sp) * lean, fx, 0, fz);
    if (T < s.bootsAt + 0.55) {
      streak(s.bootsAt - 1e-3, qa);
      out.copy(qa.slerp(out, ease((T - s.bootsAt) / 0.55)));
    }
  }

  /** Both halves of a husk, open by `theta`, faded to `fade`. */
  function huskAt(s: Shell, base: THREE.Matrix4, theta: number, heat: number, panels: number, fade: number): void {
    const c = Math.cos(theta), sn = Math.sin(theta);
    mh.makeRotationX(theta).setPosition(0, HINGE * sn, HINGE * (1 - c));
    for (const left of [false, true]) {
      mb.copy(base);
      if (left) mb.multiply(RY_PI);
      mb.multiply(mh);
      const i = husks.add(mb, s.husk);
      if (i < 0) return;
      husks.set('iFx', i, heat, panels, fade, 0);
      husks.set('iAnim', i, 0, 0, 0, 0);
    }
  }

  /** A puff of dust or smoke, `size` across, in a colour. */
  function puff(x: number, y: number, z: number, size: number, color: number, turn: number): void {
    if (size <= 0.02) return;
    q.setFromAxisAngle(UPV, turn);
    m4.compose(pv.set(x, y, z), q, sv.set(size, size * 0.82, size));
    puffs.add(m4, col.set(color));
  }

  /**
   * The trail a shell leaves. In the streak: a tongue of fire streaming back
   * from it, white-hot where it leaves the shell, and smoke from the burning
   * panels, sooty where it leaves them and paling and spreading as it hangs.
   * Under the boots: a thin pale exhaust.
   */
  function trails(s: Shell, T: number, night: number, heat: number): void {
    // in the streak it falls feet first, so its trail streams from its crown, a husk's length behind where it is
    pathAt(s.keys, T, Q, V);
    const tail = T < s.bootsAt ? (HUSK_TOP * s.scale) / Math.max(4, Math.hypot(V[0], V[1], V[2])) : 0;
    const tA = Math.max(s.fireAt, T - SMOKE_HOT), tB = Math.min(T - tail, s.landAt);
    if (tB - tA > 0.05) {
      const n = 20;
      for (let i = 0; i < n; i++) {
        const t = tB - ((tB - tA) * i) / (n - 1), a = T - t, hot = t < s.bootsAt, life = hot ? SMOKE_HOT : SMOKE_BOOTS;
        pathAt(s.keys, t, Q);
        SP[i * 3] = Q[0] - 0.5 * a;
        SP[i * 3 + 1] = Q[1] + 0.25 * a;
        SP[i * 3 + 2] = Q[2];
        SW[i] = s.scale * (hot ? 0.36 + 0.13 * a : 0.36 + 0.3 * a);
        const left = clamp(1 - a / life);
        SC[i * 4 + 3] = (hot ? 0.7 : 0.3) * left ** 1.1 * ease((a - tail) / 0.15);
        const pale = hot ? ease(a / 9) : 1;
        SC[i * 4] = lerp(lerp(0.2, 0.62, pale), lerp(0.1, 0.28, pale), night);
        SC[i * 4 + 1] = lerp(lerp(0.17, 0.6, pale), lerp(0.09, 0.28, pale), night);
        SC[i * 4 + 2] = lerp(lerp(0.16, 0.6, pale), lerp(0.1, 0.33, pale), night);
      }
      smoke.strip(n, SP, SW, SC);
    }
    // the fire: all the while it streaks, and dying away where it was for a moment once its boots fire
    const burn = T < s.bootsAt ? 1 : clamp(1 - (T - s.bootsAt) / 0.6);
    if (burn > 0 && T < s.landAt) {
      const hot = Math.max(heat, 0.4) * burn, tEnd = Math.min(T, s.bootsAt);
      // a long trail of fire along its way: about a second and a half of it, and no more than 24 units
      const span = Math.min(TRAIL, TRAIL_MOST / Math.max(4, Math.hypot(V[0], V[1], V[2])));
      const n = 11;
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1), t = Math.max(s.fireAt, tEnd - span * f);
        pathAt(s.keys, t, Q);
        SP[i * 3] = Q[0]; SP[i * 3 + 1] = Q[1]; SP[i * 3 + 2] = Q[2];
        SW[i] = s.scale * lerp(2.1, 0.3, f) * (1.3 - 0.3 * burn);
      }
      // its body of solid flame, orange to red, a fireball with a tail, which shows by day against the pale city as a glow alone does not
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1);
        SC[i * 4] = lerp(1.0, 0.85, f); SC[i * 4 + 1] = lerp(0.62, 0.12, f); SC[i * 4 + 2] = lerp(0.12, 0.02, f);
        SC[i * 4 + 3] = Math.min(1, hot * 1.3) * (1 - f) ** 0.75 * (1 - 0.75 * night) * ease(f / 0.08 + 0.3);
      }
      smoke.strip(n, SP, SW, SC);
      // down its middle a core of white and yellow, which by day is what the eye follows from the ship to the ground
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1);
        SW[i] = s.scale * lerp(0.85, 0.08, f ** 0.7) * (1.3 - 0.3 * burn);
        SC[i * 4] = 1.0; SC[i * 4 + 1] = lerp(0.98, 0.72, f); SC[i * 4 + 2] = lerp(0.86, 0.2, f);
        SC[i * 4 + 3] = Math.min(1, hot * 1.4) * (1 - f) ** 0.6 * (1 - 0.6 * night) * ease(f / 0.05 + 0.4);
      }
      smoke.strip(n, SP, SW, SC);
      for (let i = 0; i < n; i++) SW[i] = s.scale * lerp(2.1, 0.3, i / (n - 1)) * (1.3 - 0.3 * burn);
      // and its glow, white at the shell, then orange and red, and nothing
      for (let i = 0; i < n; i++) SW[i] = s.scale * lerp(1.5, 0.15, i / (n - 1)) * (1.3 - 0.3 * burn);
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1), w = clamp(f / 0.18), o = clamp((f - 0.18) / 0.5);
        SC[i * 4] = 1.0;
        SC[i * 4 + 1] = lerp(lerp(0.95, 0.55, w), 0.12, o);
        SC[i * 4 + 2] = lerp(lerp(0.82, 0.15, w), 0.02, o);
        SC[i * 4 + 3] = hot * (1 - f) ** 1.3 * 1.6;
      }
      glow.strip(n, SP, SW, SC);
      // and a wider haze of orange about it, nearer the shell
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1), t = Math.max(s.fireAt, tEnd - span * 0.6 * f);
        pathAt(s.keys, t, Q);
        SP[i * 3] = Q[0]; SP[i * 3 + 1] = Q[1]; SP[i * 3 + 2] = Q[2];
        SW[i] = s.scale * lerp(3.2, 0.6, f);
        SC[i * 4] = 1.0; SC[i * 4 + 1] = 0.42; SC[i * 4 + 2] = 0.1;
        SC[i * 4 + 3] = hot * (1 - f) ** 1.8 * 0.45;
      }
      glow.strip(n, SP, SW, SC);
    }
  }

  /** Sparks of burning panel shed in the upper fall: each drifts back along the trail as the shell flies on, and dies. */
  function sparks(s: Shell, T: number): void {
    const T1 = s.bootsAt - s.fireAt;
    for (let j = 0; j < 12; j++) {
      const te = s.fireAt + T1 * (0.05 + (0.68 * j) / 11) + (hash(s.seed + j * 1.7) - 0.5) * 0.12, age = T - te;
      if (age < 0 || age > 0.9) continue;
      pathAt(s.keys, te, Q, V);
      const a = hash(s.seed + j * 3.3) * TAU, kick = 2.5 + 3.5 * hash(s.seed + j * 5.1), drag = 0.12 * (1 - Math.exp(-age / 0.12));
      const kx = AX.x * Math.cos(a) + AZ.x * Math.sin(a), ky = AX.y * Math.cos(a) + AZ.y * Math.sin(a), kz = AX.z * Math.cos(a) + AZ.z * Math.sin(a);
      const x = Q[0] + V[0] * drag + kx * kick * age, y = Q[1] + V[1] * drag + ky * kick * age - 2.5 * age * age, z = Q[2] + V[2] * drag + kz * kick * age;
      const e = Math.exp(-age / 0.12), f = age / 0.9;
      glow.blob(x, y, z, x - (V[0] * e + kx * kick) * 0.03, y - (V[1] * e + ky * kick) * 0.03, z - (V[2] * e + kz * kick) * 0.03, 0.2 * s.scale,
        1.0, lerp(0.85, 0.25, f), lerp(0.5, 0.04, f), (1 - f) ** 1.5 * 1.8);
    }
  }

  /** A jet of flame from a gravBoot or a thruster: from `p` along `d`, `len` long. */
  function jet(px: number, py: number, pz: number, dx: number, dy: number, dz: number, len: number, w: number, k2: number): void {
    glow.blob(px - dx * 0.3, py - dy * 0.3, pz - dz * 0.3, px + dx * len, py + dy * len, pz + dz * len, w, 0.6, 0.8, 1.0, 1.3 * k2);
    glow.blob(px - dx * 0.1, py - dy * 0.1, pz - dz * 0.1, px + dx * len * 0.45, py + dy * len * 0.45, pz + dz * len * 0.45, w * 0.5, 1.0, 1.0, 1.0, 1.4 * k2);
  }

  function drawFlying(s: Shell, T: number, night: number): void {
    pathAt(s.keys, T, P, V);
    flightTurn(s, T, q);
    const S = s.scale, heat = heatOf(s, T);
    m4.compose(pv.set(P[0], P[1], P[2]), q, sv.set(S, S, S));
    const panels = s.sheds.filter((t) => t > T).length;
    huskAt(s, m4, 0, heat, panels, 1);
    // its own way up, down and across, as it flies
    basis.makeRotationFromQuaternion(q);
    basis.extractBasis(AX, AY, AZ);
    const sp = Math.hypot(V[0], V[1], V[2]) || 1;
    trails(s, T, night, heat);
    if (T < s.bootsAt + 0.4 && heat > 0.05) {
      // the white-hot nose where the air burns at its leading end, and the bow of it
      const h = Math.min(1, heat) * (T < s.bootsAt ? 1 : 1 - (T - s.bootsAt) / 0.4);
      const nx = P[0] - AY.x * 0.4 * S, ny = P[1] - AY.y * 0.4 * S, nz = P[2] - AY.z * 0.4 * S;
      glow.sprite(nx, ny, nz, S * (0.9 + 0.7 * h), 1.0, 0.95, 0.82, h * 1.9);
      glow.blob(nx, ny, nz, nx + (V[0] / sp) * 1.6 * S, ny + (V[1] / sp) * 1.6 * S, nz + (V[2] / sp) * 1.6 * S, 0.75 * S, 1.0, 0.92, 0.75, h * 1.5);
      // and an orange sheath of glow round the whole pod
      glow.sprite(P[0] + AY.x * 2.8 * S, P[1] + AY.y * 2.8 * S, P[2] + AY.z * 2.8 * S, 3.6 * S, 1.0, 0.5, 0.14, h * 0.75);
    }
    if (T - s.fireAt < 0.4) {
      const f = (T - s.fireAt) / 0.4, p0 = s.keys[0].p;
      glow.sprite(p0[0], p0[1], p0[2], S * (2.2 + 2.5 * f), 1.0, 0.86, 0.6, (1 - f) ** 2 * 2.2);
      smoke.sprite(p0[0], p0[1], p0[2], S * (1.2 + 2.2 * f), 1.0, 0.95, 0.8, (1 - f) ** 1.5 * 0.85 * (1 - 0.7 * night));
    }
    if (T < s.bootsAt + 0.9) sparks(s, T);
    // the panels that have burnt away, flaking off behind it
    s.sheds.forEach((t, k2) => {
      const age = T - t;
      if (age < 0 || age > 1.1) return;
      pathAt(s.keys, t, Q, V);
      for (const side of [-1, 1]) {
        const h = hash(s.seed + k2 * 7 + side);
        const drag = 0.25 * (1 - Math.exp(-age / 0.25));
        const kick = 2.4 + 2 * h;
        const x = Q[0] + V[0] * drag + AZ.x * side * (1.9 * S + kick * age) + AY.x * 2.2 * S;
        const y = Q[1] + V[1] * drag + AZ.y * side * (1.9 * S + kick * age) + AY.y * 2.2 * S - 2.5 * age * age;
        const z = Q[2] + V[2] * drag + AZ.z * side * (1.9 * S + kick * age) + AY.z * 2.2 * S;
        const f = age / 1.1;
        glow.blob(x, y, z, x - V[0] * 0.04, y - V[1] * 0.04 + 0.3, z - V[2] * 0.04, 0.35 * S * (1 - f * 0.5), 1.0, lerp(0.8, 0.25, f), lerp(0.5, 0.05, f), (1 - f) ** 2 * 1.8);
      }
      if (age < 0.16) glow.sprite(Q[0] + AY.x * 2.4 * S, Q[1] + AY.y * 2.4 * S, Q[2] + AY.z * 2.4 * S, 2.2 * S, 1.0, 0.7, 0.35, (1 - age / 0.16) * 1.4);
    });
    // where it strikes the shield: a flash, and sparks as it skids down the glass
    if (s.strike && T >= s.strikeAt && T < s.strikeAt + 1.2) {
      const age = T - s.strikeAt;
      if (age < 0.35) glow.sprite(s.strike[0], s.strike[1], s.strike[2], 7 * S, 0.6, 0.85, 1.0, (1 - age / 0.35) ** 2 * 2.4);
      for (let j = 0; j < 24; j++) {
        const te = s.strikeAt + j * 0.035, a = T - te;
        if (a < 0 || a > 0.45) continue;
        pathAt(s.keys, te, Q, V);
        const h1 = hash(s.seed + j * 3.1), h2 = hash(s.seed + j * 5.7), h3 = hash(s.seed + j * 9.3);
        const vx = -V[0] * 0.25 + (h1 - 0.5) * 9, vy = 3 + h2 * 5, vz = -V[2] * 0.25 + (h3 - 0.5) * 9;
        const x = Q[0] + vx * a, y = Q[1] + vy * a - 9 * a * a, z = Q[2] + vz * a;
        glow.blob(x, y, z, x - vx * 0.04, y - (vy - 18 * a) * 0.04, z - vz * 0.04, 0.16, 1.0, 0.75, 0.35, (1 - a / 0.45) * 2.2);
      }
    }
    // the gravBoots and the shoulder thrusters, once they fire
    if (T >= s.bootsAt) {
      const since = T - s.bootsAt, brake = span(T, s.landAt - 0.8, s.landAt - 0.1);
      const fl = 0.85 + 0.15 * Math.sin(T * 53 + s.seed);
      const len = S * (2.2 + 1.6 * brake) * fl;
      for (const side of [-1, 1]) {
        const x = P[0] + AZ.x * side * 0.5 * S - AY.x * 0.3 * S, y = P[1] + AZ.y * side * 0.5 * S - AY.y * 0.3 * S, z = P[2] + AZ.z * side * 0.5 * S - AY.z * 0.3 * S;
        jet(x, y, z, -AY.x, -AY.y, -AY.z, len, 0.55 * S, 1);
        const tx = P[0] - AX.x * 1.0 * S + AZ.x * side * 1.2 * S + AY.x * 3.6 * S, ty = P[1] - AX.y * 1.0 * S + AZ.y * side * 1.2 * S + AY.y * 3.6 * S, tz = P[2] - AX.z * 1.0 * S + AZ.z * side * 1.2 * S + AY.z * 3.6 * S;
        jet(tx, ty, tz, -AY.x * 0.8 - AX.x * 0.5, -AY.y * 0.8 - AX.y * 0.5, -AY.z * 0.8 - AX.z * 0.5, 1.3 * S * fl, 0.3 * S, 0.7);
      }
      // the flash as the boots light, and a ring of vapour where they do
      if (since < 0.4) {
        glow.sprite(P[0], P[1] + 1.5 * S, P[2], 6.5 * S, 0.7, 0.85, 1.0, (1 - since / 0.4) ** 2 * 2.0);
        smoke.sprite(P[0], P[1] + 1.5 * S, P[2], S * (2 + 6 * since), 0.86, 0.94, 1.0, (1 - since / 0.4) ** 1.5 * 0.8 * (1 - 0.7 * night));
      }
      if (since < 1.8 && s.strikeAt === Infinity) {
        pathAt(s.keys, s.bootsAt, Q);
        const f = since / 1.8;
        for (let j = 0; j < 6; j++) {
          const a = (j / 6) * TAU + s.roll, r = (1.2 + 4.6 * easeOut(Math.min(1, since / 1.2))) * S;
          smoke.sprite(Q[0] + Math.cos(a) * r, Q[1] - 0.6 + 0.5 * since, Q[2] + Math.sin(a) * r, S * (1.0 + 1.7 * f), 0.93, 0.96, 1.0, (1 - f) ** 1.6 * 0.55 * (1 - 0.6 * night));
        }
      }
    }
  }

  function drawLanded(s: Shell, T: number, night: number): void {
    const tau = T - s.landAt, L = s.land, S = s.scale, hive = s.kind === HIVE;
    const split = hive ? HIVE_SPLIT : SPLIT;
    // the husk: down hard, a crouch, up, and split open; then it fades
    let sy = 1;
    if (!hive) sy = tau < 0.12 ? 1 - 0.2 * (tau / 0.12) : tau < STAND0 ? 0.8 : 0.8 + 0.2 * ease((tau - STAND0) / (STAND1 - STAND0));
    const lean = (1 - sy) * 0.6;
    const theta = tau < split ? 0 : tau < split + OPENING ? OPEN_A * backOut((tau - split) / OPENING) : OPEN_A + (OPEN_B - OPEN_A) * ease((tau - split - OPENING) / 3);
    const fade = 1 - span(tau, HUSK_FADE, HUSK_GONE);
    if (fade > 0) {
      q.setFromAxisAngle(UPV, -s.heading).multiply(qb.setFromAxisAngle(ZV, -lean));
      m4.compose(pv.set(L[0], L[1], L[2]), q, sv.set(S, S * sy, S));
      huskAt(s, m4, theta, heatOf(s, T), 0, fade);
    }
    // the knight: out of the husk, a step, and a stride or a leap towards the city
    const a = s.after;
    if (a && tau >= split && tau < a.gone) {
      let x = L[0], y = L[1], z = L[2], swing = 0, crouch = 0, boots = 0, pitch = 0, kfade = 1;
      if (tau >= STEP0 && tau < STEP1) {
        const f = ease((tau - STEP0) / (STEP1 - STEP0));
        x = lerp(L[0], a.out[0], f); y = lerp(L[1], a.out[1], f); z = lerp(L[2], a.out[2], f);
        swing = Math.sin(f * Math.PI) * 0.55;
      } else if (tau >= STEP1 && !a.leap) {
        const d = Math.min(a.len, (tau - STEP1) * 1.6), i = Math.min(a.walk.length - 2, Math.floor(d / 0.8)), f = clamp(d / 0.8 - i);
        const p0 = a.walk[Math.max(0, i)], p1 = a.walk[Math.max(0, i) + 1] ?? p0;
        x = lerp(p0[0], p1[0], f); y = lerp(p0[1], p1[1], f); z = lerp(p0[2], p1[2], f);
        swing = d < a.len ? Math.sin((d / 2.4) * TAU) * 0.5 : 0;
        kfade = 1 - span(tau, a.fadeAt, a.gone);
      } else if (tau >= STEP1) {
        x = a.out[0]; y = a.out[1]; z = a.out[2];
        if (tau < STEP1 + 0.35) crouch = ease((tau - STEP1) / 0.35);
        else {
          const u = clamp((tau - STEP1 - 0.35) / 1.7);
          x = lerp(a.out[0], a.to[0], u); z = lerp(a.out[2], a.to[2], u);
          y = lerp(a.out[1], a.to[1], u) + 4 * a.arc * u * (1 - u);
          crouch = Math.max(0, 1 - u * 5) * 0.6;
          swing = 0.35;
          boots = u < 0.75 ? 1 : 0.4;
          pitch = 0.3;
          kfade = 1 - span(tau, a.fadeAt, a.gone);
        }
      }
      if (kfade > 0) {
        q.setFromAxisAngle(UPV, -s.heading).multiply(qb.setFromAxisAngle(ZV, -pitch));
        m4.compose(pv.set(x, y, z), q, sv.set(1, 1, 1));
        const i = knights.add(m4, s.paint);
        if (i >= 0) {
          knights.set('iFx', i, 0, 3, kfade, 0);
          knights.set('iAnim', i, swing, crouch, boots, 0);
        }
        if (boots > 0 && kfade > 0.1) {
          basis.makeRotationFromQuaternion(q);
          basis.extractBasis(AX, AY, AZ);
          const fl = 0.85 + 0.15 * Math.sin(T * 47 + s.seed);
          for (const side of [-1, 1]) jet(x + AZ.x * side * 0.55 + AX.x * 0.1, y + AZ.y * side * 0.55 + 0.05, z + AZ.z * side * 0.55 + AX.z * 0.1, -AY.x, -AY.y, -AY.z, 2.4 * fl * boots, 0.45, kfade);
        }
      }
    }
    // the Grays of a hivepod: out in a line, at the ready, and gone
    if (s.grays && tau >= split) {
      s.grays.forEach((g, j) => {
        const f = g.dur > 0 ? clamp((tau - g.at) / g.dur) : 1;
        if (tau > g.fade + 0.9) return;
        const gf = 1 - span(tau, g.fade, g.fade + 0.9);
        const x = lerp(g.from[0], g.to[0], f), z = lerp(g.from[2], g.to[2], f), y = lerp(g.from[1], g.to[1], f);
        const moving = tau > g.at && f < 1;
        const face = moving || f < 1 ? g.face : s.heading;
        q.setFromAxisAngle(UPV, -face);
        m4.compose(pv.set(x, y + (moving ? Math.abs(Math.sin((tau - g.at) * 9 + j)) * 0.12 : 0), z), q, sv.set(1, 1, 1));
        const i = grays.add(m4, col.set(GRAY_PAINT));
        if (i >= 0) {
          grays.set('iFx', i, 0, 3, gf, 0);
          grays.set('iAnim', i, moving ? Math.sin((tau - g.at) * 9 + j) * 0.6 : 0, 0, 0, 0);
        }
      });
    }
    // the ring of dust it lands in
    if (tau < 2.6) {
      const grow = easeOut(tau / 1.1), thin = 1 - span(tau, 1.1, 2.6) ** 1.5;
      for (let j = 0; j < 10; j++) {
        const ang = (j / 10) * TAU + hash(s.seed + j) * 0.5, r = S * (hive ? 1.4 : 1) * (0.6 + 4.6 * grow);
        const x = L[0] + Math.cos(ang) * r, z = L[2] + Math.sin(ang) * r;
        puff(x, height(x, z) + 0.3 + 0.9 * easeOut(tau / 1.5), z, S * (0.6 + 1.2 * easeOut(tau / 0.5)) * thin, s.dust, ang);
      }
      puff(L[0], L[1] + 1 + 1.5 * easeOut(tau / 1.5), L[2], S * 2.0 * easeOut(tau / 0.3) * thin, s.dust, s.roll);
    }
    // steam out of the seams as it splits
    if (tau >= split && tau < split + 1.6) {
      const f = (tau - split) / 1.6;
      for (let j = 0; j < 3; j++) puff(L[0] + (j - 1) * 0.5 * S, L[1] + 5.2 * S + f * 3, L[2], S * 0.8 * easeOut(f * 4) * (1 - f), 0xf2f3f5, j + s.roll);
    }
    // the scorch, and the glow of the hot ground for a moment, which shows by night
    const sa = 0.78 * (1 - span(tau, SCORCH_FADE, SCORCH_GONE));
    if (sa > 0) {
      qa.setFromUnitVectors(UPV, pv.set(s.ground[0], s.ground[1], s.ground[2]));
      q.setFromAxisAngle(UPV, s.roll);
      qa.multiply(q);
      const R = 3.2 * S * (hive ? 1.3 : 1) * (0.5 + 0.5 * easeOut(tau / 0.2));
      m4.compose(pv.set(L[0], L[1] + 0.12, L[2]), qa, sv.set(R, 1, R));
      const i = scorch.add(m4, col.set(0x2a2220));
      if (i >= 0) scorch.set('iAlpha', i, sa);
    }
    if (tau < 0.3) glow.sprite(L[0], L[1] + 1.2 * S, L[2], 6 * S, 1.0, 0.75, 0.45, (1 - tau / 0.3) ** 2 * 2.2);
    if (tau < 4) glow.flat(L[0], L[1] + 0.2 + (s.seed % 1) * 0.02, L[2], s.ground, 2.6 * S, 1.0, 0.35, 0.08, (1 - tau / 4) ** 2 * (0.5 + 1.2 * night));
    if (tau < 1.6 && night > 0.05) glow.flat(L[0], L[1] + 0.24 + (s.seed % 1) * 0.02, L[2], s.ground, 10 * S, 1.0, 0.55, 0.22, (1 - tau / 1.6) * night * 0.8);
    // the smoke of its trail still hangs a while
    trails(s, T, night, 0);
  }

  function drawShot(sh: Shot, T: number, night: number): void {
    if (T < sh.t) return;
    if (!sh.aimed) aimShot(sh);
    const m = sh.from;
    if (!sh.burst) return;
    const b = sh.burst;
    if (T - sh.t < 0.07) {
      glow.sprite(m[0], m[1], m[2], 2.4, 1.0, 0.8, 0.45, 2.2);
      if (night > 0.05) glow.flat(m[0], ground(m[0], m[2]) + 0.3 + sh.gun * 0.01, m[2], [0, 1, 0], 9, 1.0, 0.7, 0.35, night * 0.7);
    }
    if (T < sh.hit) {
      const len = dist3(m, b), f = (T - sh.t) / (sh.hit - sh.t), f0 = Math.max(0, f - 7 / len);
      glow.blob(lerp(m[0], b[0], f0), lerp(m[1], b[1], f0), lerp(m[2], b[2], f0), lerp(m[0], b[0], f), lerp(m[1], b[1], f), lerp(m[2], b[2], f), 0.32, 1.0, 0.85, 0.45, 2.0);
      return;
    }
    const age = T - sh.hit;
    if (age < 0.2) glow.sprite(b[0], b[1], b[2], 3.4, 1.0, 0.75, 0.4, (1 - age / 0.2) ** 2 * 2.4);
    if (age < 2.8) {
      const size = 1.7 * easeOut(age / 0.35) * (1 - span(age, 1.6, 2.8) ** 1.5);
      puff(b[0] + 0.3 * age, b[1] + 0.2 * age, b[2], size, age < 0.6 ? 0x2f2b28 : 0x4a4643, sh.seed);
    }
  }

  /** The lightning in the storm bank, and the cloud it lights. Returns where it is and how bright, for the clouds. */
  function drawLightning(T: number, night: number): { x: number; y: number; z: number; f: number } | null {
    const n0 = Math.floor(T / BOLT_EVERY);
    for (const n of [n0, n0 - 1]) {
      const b = boltIn(n);
      if (!b || T < b.t0 || T > b.t0 + 0.45) continue;
      const f = flicker(T - b.t0);
      const y = ground(b.x, b.z) + b.over;
      if (f < 0.02) return { x: b.x, y, z: b.z, f: 0 };
      // the bolt, jagged: out of the cloud's underside down to the ground at the board's edge, or along inside the cloud
      const pts: V3[] = [];
      const gx = Math.min(103, b.x + 2), gy = ground(gx, b.z);
      for (let i = 0; i <= 6; i++) {
        const u = i / 6, mid = i > 0 && i < 6, j1 = (hash(b.seed * 13 + i) - 0.5) * 2.2, j2 = (hash(b.seed * 17 + i) - 0.5) * 2.2;
        pts.push(b.ground
          ? [lerp(b.x, gx, u) + (mid ? j1 * 0.5 : 0), lerp(y - 2.5, gy, u), b.z + (mid ? j2 : 0)]
          : [b.x + j1 * 0.5, y + (mid ? j2 * 0.4 : 0), b.z - 6 + u * 12]);
      }
      const k2 = f * (0.8 + 0.8 * night);
      for (let i = 0; i < 6; i++) {
        const [a, c] = [pts[i], pts[i + 1]];
        glow.blob(a[0], a[1], a[2], c[0], c[1], c[2], 0.22, 0.85, 0.9, 1.0, 2.2 * k2);
        glow.blob(a[0], a[1], a[2], c[0], c[1], c[2], 0.9, 0.5, 0.6, 1.0, 0.45 * k2);
      }
      // and the cloud lit from inside, and by night the ground under it
      glow.sprite(b.x, y, b.z, 6, 0.55, 0.62, 1.0, 0.5 * k2);
      if (b.ground && night > 0.05) glow.flat(gx, gy + 0.35, b.z, slope(gx, b.z), 16, 0.6, 0.7, 1.0, f * night * 0.9);
      return { x: b.x, y, z: b.z, f };
    }
    return null;
  }

  function drawClouds(T: number, night: number, bolt: { x: number; y: number; z: number; f: number } | null): void {
    const lit = shells.filter((s) => T >= s.fireAt && T < s.landAt);
    layout.forEach((c, i) => {
      const x = c.x + Math.sin(T * 0.05 + i) * 0.8, y = c.y + Math.sin(T * 0.13 + i * 1.7) * 0.4;
      q.setFromAxisAngle(UPV, c.turn);
      m4.compose(pv.set(x, y, c.z), q, sv.set(c.sx, c.sy, c.sz));
      const n = clouds.add(m4, col.set(c.color));
      if (n < 0) return;
      // lit from within by the shells passing through it, and by the lightning
      let r = 0, g = 0, b = 0;
      const reach = Math.max(c.sx, c.sz) * 1.8 + 8;
      for (const s of lit) {
        pathAt(s.keys, T, P);
        const d = Math.hypot(P[0] - x, (P[1] - y) * 1.6, P[2] - c.z);
        if (d > reach) continue;
        const w = (1 - d / reach) ** 2;
        const h = heatOf(s, T), since = T - s.bootsAt;
        r += w * (h * h * 1.2 + (since >= 0 && since < 0.4 ? 1.2 * (1 - since / 0.4) : 0) + (since >= 0 ? 0.15 : 0));
        g += w * (h * h * 0.6 + (since >= 0 && since < 0.4 ? 1.4 * (1 - since / 0.4) : 0) + (since >= 0 ? 0.22 : 0));
        b += w * (h * h * 0.25 + (since >= 0 && since < 0.4 ? 1.8 * (1 - since / 0.4) : 0) + (since >= 0 ? 0.3 : 0));
      }
      if (bolt && bolt.f > 0 && c.storm) {
        const d = Math.hypot(bolt.x - x, bolt.y - y, bolt.z - c.z);
        if (d < 26) {
          const w = (1 - d / 26) * bolt.f * (0.6 + 1.6 * night);
          r += 0.75 * w; g += 0.82 * w; b += 1.1 * w;
        }
      }
      const k2 = 0.5 + 1.2 * night;
      clouds.set('iGlow', n, Math.min(3, r * k2), Math.min(3, g * k2), Math.min(3, b * k2));
    });
  }

  function drawShield(T: number, night: number): void {
    shieldU.uT.value = T;
    shieldU.uNight.value = night;
    shieldU.uDownAt.value = downAt;
    shieldU.uUpAt.value = upAt;
    shieldMesh.visible = !(downAt > upAt && T - downAt > SHATTERED);
    // raised again: light climbs from the tops of the generators' four pylons onto the dome
    const rising = T - upAt;
    if (upAt > downAt && rising >= 0 && rising < 1.6) {
      const f = rising < 0.25 ? rising / 0.25 : 1 - (rising - 0.25) / 1.35;
      RISE.forEach((p, i) => {
        const [x, z] = PYLONS[i], y0 = F + 22, u = clamp(rising / 0.35);
        glow.blob(x, y0, z, lerp(x, p[0], u), lerp(y0, p[1], u), lerp(z, p[2], u), 0.7, 0.55, 0.8, 1.0, 1.6 * f);
        glow.sprite(x, y0 + 0.5, z, 2.4, 0.6, 0.85, 1.0, 1.4 * f);
      });
    }
    // the latest strikes, which ripple across it
    const strikes = shells.filter((s) => s.strike && T >= s.strikeAt && T < s.strikeAt + 2.2).sort((a, b) => b.strikeAt - a.strikeAt).slice(0, 8);
    strikes.forEach((s, i) => shieldU.uStrike.value[i].set(s.strike![0], s.strike![1], s.strike![2], s.strikeAt));
    shieldU.uStrikes.value = strikes.length;
  }

  function update(night: number): void {
    const T = now();
    // a shell takes its start from its ship's tube as the ship is when it is fired
    for (const s of shells) {
      if (s.fired || (T < s.fireAt && clock < s.fireAt)) continue;
      s.fired = true;
      if (s.from) {
        const tb = tubesOf(s.from);
        const p = tb[s.tube % tb.length];
        s.keys[0].p = [p[0], p[1], p[2]];
      }
    }
    // a marked shell says when it has split, by the clock that runs
    for (const s of shells) {
      if (!s.opened || s.said || clock < s.landAt + SPLIT) continue;
      s.said = true;
      try { s.opened(); } catch (e) { console.error('The Iron Rain: a shell\'s `opened` failed.', e); }
    }
    // what is over and gone is let go, unless the picture is being held
    if (held === null) {
      for (let i = shells.length - 1; i >= 0; i--) if (clock > shells[i].end) shells.splice(i, 1);
      for (let i = shots.length - 1; i >= 0; i--) if (clock > shots[i].t + 4.5) shots.splice(i, 1);
      for (let i = sites.length - 1; i >= 0; i--) if (clock > sites[i].until + 2) sites.splice(i, 1);
    }
    husks.n = knights.n = grays.n = puffs.n = scorch.n = clouds.n = 0;
    glow.begin();
    smoke.begin();
    for (const s of shells) {
      if (T < s.fireAt) continue;
      if (T < s.landAt) drawFlying(s, T, night);
      else drawLanded(s, T, night);
    }
    for (const sh of shots) drawShot(sh, T, night);
    const bolt = drawLightning(T, night);
    drawClouds(T, night, bolt);
    drawShield(T, night);
    glowMat.uniforms.uGain.value = 1.15 + 2.3 * night;
    for (const p of [husks, knights, grays, puffs, scorch, clouds]) p.end();
    glow.end();
    smoke.end();
  }

  k.each((_dt, time, night) => {
    clock = time;
    update(night);
  });

  const rain: Rain = {
    wave,
    drop,
    shield,
    hold: (t) => { held = t; },
  };

  if (import.meta.env.DEV) {
    // For the console: `rrRain.wave(24)` fires a wave from a line of tubes over the east onto the
    // landing zones outside the city, `rrRain.city(8)` onto the Field of Mars, `rrRain.hold(t)` stands
    // everything as it is at t (the clock is `rrRain.now()`), and `rrRain.shieldDown()` and `shieldUp()`.
    const TUBES: V3[] = Array.from({ length: 24 }, (_, i): V3 => [82, 100, 18 + (i * 44) / 23]);
    const ZONES: Zone[] = [LANDINGS.west, LANDINGS.east, LANDINGS.plateau, LANDINGS.flank, LANDINGS.peaks];
    (window as unknown as { rrRain: object }).rrRain = {
      wave: (n = 24) => ({ at: now(), lasts: wave(() => TUBES, ZONES, n) }),
      city: (n = 8) => ({ at: now(), lasts: wave(() => TUBES, [LANDINGS.city], n) }),
      drop: (paint = 0xb3201a, to: V3 = [-94, ground(-94, -6), -6]) => ({ at: now(), opens: drop([82, 100, 40], to, paint, () => console.info('The Iron Rain: a marked shell has opened.')) }),
      shieldDown: () => shield.down(),
      shieldUp: () => shield.up(),
      hold: (t: number | null) => rain.hold(t),
      now,
      state: () => ({
        now: now(), shells: shells.length, flying: shells.filter((s) => now() >= s.fireAt && now() < s.landAt).length, shots: shots.length, up,
        drawn: { husks: husks.n, knights: knights.n, grays: grays.n, puffs: puffs.n, scorch: scorch.n, clouds: clouds.n },
        triangles: husks.n * 84 + knights.n * 174 + grays.n * 78 + puffs.n * 20 + scorch.n * 12 + clouds.n * 240 + dome.geo.getAttribute('position').count / 3,
      }),
      shells: () => shells.map((s) => ({ kind: s.kind, fire: s.fireAt, boots: s.bootsAt, strike: s.strikeAt, land: s.landAt, at: s.land.map((v) => Math.round(v * 10) / 10), leap: s.after?.leap ?? null, heading: s.heading })),
      /** The next flash of lightning in the storm after now: when, and where. */
      bolt: () => {
        for (let n = Math.floor(now() / BOLT_EVERY); n < Math.floor(now() / BOLT_EVERY) + 30; n++) {
          const b = boltIn(n);
          if (b && b.t0 > now()) return { ...b, y: ground(b.x, b.z) + b.over };
        }
        return null;
      },
    };
  }
  return rain;
}
