// Storm's End on its headland over Shipbreaker Bay, and Sunspear behind its
// three gates on Dorne's sand.
//
// Storm's End (ACOK, Catelyn and Davos; TWOIAF): one great curtain wall of
// pale grey stone fitted so close that the wind finds no hold, with no corner
// towers and no buttresses, and inside it one colossal drum tower, windowless
// to the sea but for slits, crowned with battlements like a spiked fist. Here
// the wall is tall towards the land and only a parapet towards the sea, so
// that the view the tile opens with looks over it into the bailey; the road
// climbs a ramp to a gate in its west-north-west and goes once round the drum.
//
// Sunspear (AFFC): the Winding Walls, three of them one behind another with
// the shadow city of mud brick between, and the Threefold Gate, whose three
// gates line up so that one road runs straight through all of them; behind the
// third, the Old Palace: the Tower of the Sun with its dome of gold and leaded
// glass, the slender Spear Tower crowned with a spear of gilded steel, and the
// Sandship, the oldest part, a long hall shaped like a ship run aground, its
// prow to the sea.
//
// Everything here is this tile's own drawing from the books' plain words.

import * as THREE from 'three';
import { Smoke } from '../../engine/effects';
import { interior, rng, type GeoBuilder, type QuadOpts, type V3, type WinSpec } from '../../engine/geo';
import { area, oval } from '../../engine/ground';
import { figure, lathe, roundel } from '../../engine/parts';
import { face3, slope3 } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { DARK, DOOR, IRONWORK, PLASTER, ROOF, STONE, TIMBER, TIMBER_DARK, banner, brazier, fire, nameBoard, nameSign } from './look';
import type { Model } from './models';
import { HERO_SPOTS, ROADS, STORMS_END, TURNS, lotOf, roadY, type Lot, type P2 } from './plan';

const TAU = Math.PI * 2;
const wrap = (a: number): number => ((a % TAU) + TAU) % TAU;
/** How far one angle is from another, from -pi to pi. */
const adiff = (a: number, b: number): number => {
  const d = wrap(a - b);
  return d > Math.PI ? d - TAU : d;
};
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * A four-cornered face whose corners go round its edge, facing whichever way
 * `hint` leans. The builder's own `quad` wants its normal given exactly.
 */
function q4(b: GeoBuilder, p0: V3, p1: V3, p2: V3, p3: V3, hint: V3, color: number, o: QuadOpts = {}): void {
  const ax = p2[0] - p0[0], ay = p2[1] - p0[1], az = p2[2] - p0[2];
  const bx = p3[0] - p1[0], by = p3[1] - p1[1], bz = p3[2] - p1[2];
  let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
  const l = Math.hypot(nx, ny, nz);
  if (l < 1e-9) return;
  nx /= l; ny /= l; nz /= l;
  if (nx * hint[0] + ny * hint[1] + nz * hint[2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
  b.quad(p0, p1, p2, p3, [nx, ny, nz], color, o);
}

/** A triangle seen from above and from below: a frond, a flap of cloth. */
function twoSided(b: GeoBuilder, p: V3, q: V3, r: V3, top: number, under: number): void {
  const ax = q[0] - p[0], ay = q[1] - p[1], az = q[2] - p[2], bx = r[0] - p[0], by = r[1] - p[1], bz = r[2] - p[2];
  let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
  const l = Math.hypot(nx, ny, nz) || 1;
  if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
  face3(b, p, q, r, [nx / l, ny / l, nz / l], top);
  face3(b, p, q, r, [-nx / l, -ny / l, -nz / l], under);
}

// ===========================================================================
// Storm's End
// ===========================================================================

const SE = STORMS_END;
/** The outside of the curtain wall, its inside, and the bailey's height. */
const RO = SE.wall, RI = SE.wall - 2, BY = SE.y;
/** The top of the parapet on the seaward half: 1.2 above the bailey. */
const LOW_TOP = BY + 1.2;
/** The headland outside the wall lies a little lower than the bailey, so that it is clear of the road where the road comes up. */
const LEDGE = BY - 0.3;
const FORK = ROADS.kingsroad[ROADS.kingsroad.length - 1] as P2;
/** The gate's angle from the castle's middle: where the road from the fork meets the wall. */
const GA = Math.atan2(FORK[1] - SE.z, FORK[0] - SE.x);
/** Along the road, outwards from the middle, and across it. */
const ER: P2 = [Math.cos(GA), Math.sin(GA)], ET: P2 = [-Math.sin(GA), Math.cos(GA)];
const pol = (r: number, a: number, y: number): V3 => [SE.x + Math.cos(a) * r, y, SE.z + Math.sin(a) * r];
const polXZ = (r: number, a: number): P2 => [SE.x + Math.cos(a) * r, SE.z + Math.sin(a) * r];
/** A place in the gate's own terms: `t` across the road, `d` out from the middle. */
const gxz = (t: number, d: number): P2 => [SE.x + ET[0] * t + ER[0] * d, SE.z + ET[1] * t + ER[1] * d];
const gp = (t: number, d: number, y: number): V3 => { const p = gxz(t, d); return [p[0], y, p[1]]; };
const v3 = (p: P2, y: number): V3 => [p[0], y, p[1]];

/** How far round from the south-east a place on the wall is, in degrees: 0 faces the bay, 180 the land. */
const fromSea = (a: number): number => (Math.abs(adiff(a, Math.PI / 4)) * 180) / Math.PI;

/** Where the wall is tall and where it is a parapet: it steps down in four steps at the north-east and the south-west. */
function wallTop(a: number, top: number): number {
  const d = fromSea(a);
  if (d < 78) return LOW_TOP;
  if (d >= 96) return top;
  const step = Math.floor((d - 78) / 6) + 1;
  return LOW_TOP + ((top - LOW_TOP) * step) / 4;
}

/** The gate: an arch 9 wide through the wall, its sides straight to the spring and a half circle above. */
const ARCH = 4.5, SPRING = BY + 3.6, GATE_T = 5;
const archY = (t: number): number => SPRING + Math.sqrt(Math.max(0, ARCH * ARCH - t * t));

const WALL_COLS = 60;
const CHALK = [0xc3beb1, 0xb8b2a5, 0xcac6ba], CHALK_LOW = [0x9e998d, 0x928d81, 0xa8a397];
const TURF = 0xa6a78a, PAVE = 0x9d998e, EARTH_TOP = 0x9c8f78;
const BARATHEON_GUARD = { coat: 0xd6a92e, legs: 0x1d1d20, hat: 0x7d8086, hatH: 0.32 };

// --- the headland: the rock under the castle, sampled once, so that heightAt agrees with what is drawn ---

interface Crag { a: number; rt: number; rm: number; ym: number; rf: number; yf: number }
const CRAGS: Crag[] = (() => {
  const r = rng(5150), M = 40, out: Crag[] = [];
  for (let j = 0; j < M; j++) {
    const a = (j / M) * TAU;
    const rt = RO + 0.2 + 0.35 * r();
    if (Math.abs(adiff(a, GA)) < 0.46) out.push({ a, rt, rm: rt + 0.02, ym: 1.4, rf: rt + 0.04, yf: -0.2 }); // beside the ramp: straight down
    else if (fromSea(a) < 95) out.push({ a, rt, rm: rt + 0.25 + 0.4 * r(), ym: 1.2 + 0.7 * r(), rf: rt + 0.7 + 0.8 * r(), yf: -1.7 }); // the cliff over the bay
    else out.push({ a, rt, rm: rt + 0.9 + 0.5 * r(), ym: 1.4 + 0.5 * r(), rf: rt + 2.1 + 0.7 * r(), yf: -0.2 }); // a slope of rock to the land
  }
  return out;
})();

function skirtAt(x: number, z: number): number {
  const d = Math.hypot(x - SE.x, z - SE.z);
  if (d <= RO + 0.1) return BY;
  const a = wrap(Math.atan2(z - SE.z, x - SE.x)), M = CRAGS.length, f = (a / TAU) * M, j = Math.floor(f) % M, u = f - Math.floor(f);
  const A = CRAGS[j], B = CRAGS[(j + 1) % M];
  const rt = lerp(A.rt, B.rt, u), rm = lerp(A.rm, B.rm, u), ym = lerp(A.ym, B.ym, u), rf = lerp(A.rf, B.rf, u), yf = lerp(A.yf, B.yf, u);
  let y: number;
  if (d <= rt) y = LEDGE;
  else if (d <= rm) y = lerp(LEDGE, ym, (d - rt) / Math.max(0.01, rm - rt));
  else if (d <= rf) y = lerp(ym, yf, (d - rm) / Math.max(0.01, rf - rm));
  else y = 0;
  return Math.max(0, y);
}

// --- the ramp: its top follows the road's surface, which the road eases where its slope changes ---

const D_FORK = Math.hypot(FORK[0] - SE.x, FORK[1] - SE.z), D_RING = TURNS.drum.r;
const RAMP_FOOT = SE.foot, RAMP_END = RI + 0.7, RAMP_HALF = 4.5, RAMP_WALL = 4.1;
const lineY = (d: number): number => roadY(SE.x + ER[0] * d, SE.z + ER[1] * d);
/** The road's height along the middle of the climb, as the road eases it, and a little under it. */
function rampTop(d: number): number {
  const s = D_FORK - d, room = Math.min(2.5, s, D_FORK - D_RING - s);
  let y = lineY(d);
  if (room >= 0.2) {
    let sum = 0, w = 0;
    for (let k = -24; k <= 24; k++) {
      const wt = 1 - Math.abs(k) / 24.5;
      sum += lineY(d + (room * k) / 24) * wt;
      w += wt;
    }
    y = Math.min(y, sum / w);
  }
  return y - 0.07;
}

function stormsEndHeight(x: number, z: number): number {
  let h = 0;
  const dx = x - SE.x, dz = z - SE.z, d = Math.hypot(dx, dz);
  if (d < RO + 4) h = skirtAt(x, z);
  const along = dx * ER[0] + dz * ER[1], off = dx * ET[0] + dz * ET[1];
  if (Math.abs(off) <= RAMP_HALF && along >= RAMP_END && along <= RAMP_FOOT) h = Math.max(h, rampTop(along));
  return h;
}

// --- the wall ---

interface Col { o: P2; i: P2; t?: number }
interface Seg { c0: Col; c1: Col; H: number; walk: number; par: number; low: boolean; arch: boolean; mid: P2 }

/** The corners of the wall all the way round, in the order of their angles, with the gate's own corners in their place. */
function wallColumns(): Col[] {
  const skip = Math.asin(GATE_T / RI) + 0.01, reg: { rel: number; c: Col }[] = [];
  for (let k = 0; k < WALL_COLS; k++) {
    const a = (k / WALL_COLS) * TAU, rel = wrap(a - GA);
    if (rel < skip || rel > TAU - skip) continue;
    reg.push({ rel, c: { o: polXZ(RO, a), i: polXZ(RI, a) } });
  }
  reg.sort((p, q) => p.rel - q.rel);
  const cols = reg.map((r) => r.c);
  const ts = [-GATE_T, ...Array.from({ length: 9 }, (_, i) => -ARCH + (i * 2 * ARCH) / 8), GATE_T];
  for (const t of ts) cols.push({ o: gxz(t, Math.sqrt(RO * RO - t * t)), i: gxz(t, Math.sqrt(RI * RI - t * t)), t });
  return cols;
}

const across = (c: Col, f: number): P2 => [lerp(c.i[0], c.o[0], f), lerp(c.i[1], c.o[1], f)];
const outward = (p: P2, up = 0): V3 => { const dx = p[0] - SE.x, dz = p[1] - SE.z, l = Math.hypot(dx, dz) || 1; return [dx / l, up, dz / l]; };

function stormsEndWall(k: Build, l: Lot): void {
  const b = k.b, C = STONE.storm, SH = STONE.stormShade;
  const cols = wallColumns(), n = cols.length;
  const walkTall = l.top - 0.9;
  const outWin: WinSpec = { cell: 2.6, storey: walkTall / 3, lit: 0.3, kind: 4 };
  const inWin: WinSpec = { cell: 2.1, storey: walkTall / 3, lit: 0.42, kind: 4 };
  const segs: Seg[] = [];
  let u = 0;
  const circ = TAU * RO;
  for (let s = 0; s < n; s++) {
    const c0 = cols[s], c1 = cols[(s + 1) % n];
    const mid: P2 = [(c0.o[0] + c1.o[0]) / 2, (c0.o[1] + c1.o[1]) / 2];
    const arch = c0.t !== undefined && c1.t !== undefined && Math.abs(c0.t) <= ARCH + 1e-6 && Math.abs(c1.t) <= ARCH + 1e-6;
    const H = wallTop(Math.atan2(mid[1] - SE.z, mid[0] - SE.x), l.top);
    const low = H <= LOW_TOP + 1e-6;
    const walk = low ? BY + 0.6 : H - 0.9, par = low ? walk : walk + 0.5;
    const seg: Seg = { c0, c1, H, walk, par, low, arch, mid };
    segs.push(seg);
    const full = !low && H >= l.top - 1e-6 && c0.t === undefined && c1.t === undefined;
    const chord = Math.hypot(c1.o[0] - c0.o[0], c1.o[1] - c0.o[1]);
    const ob0 = arch ? archY(c0.t!) : LEDGE - 0.2, ob1 = arch ? archY(c1.t!) : LEDGE - 0.2;
    const ib0 = arch ? archY(c0.t!) : BY - 0.05, ib1 = arch ? archY(c1.t!) : BY - 0.05;
    const out = outward(mid), inn: V3 = [-out[0], 0, -out[2]];
    // the outer face, smooth, with loops in it where the wall is at its full height
    q4(b, v3(c0.o, ob0), v3(c1.o, ob1), v3(c1.o, walk), v3(c0.o, walk), out, C, full ? { win: outWin, L: circ, u0: u, u1: u + chord, seed: 0.31 } : {});
    // the inner face, and the inner parapet over the walk
    q4(b, v3(c1.i, ib1), v3(c0.i, ib0), v3(c0.i, walk), v3(c1.i, walk), inn, C, full ? { win: inWin, L: circ, u0: circ - u - chord, u1: circ - u, seed: 0.57 } : {});
    const fp = 0.35 / Math.hypot(c0.o[0] - c0.i[0], c0.o[1] - c0.i[1]), fq = 0.35 / Math.hypot(c1.o[0] - c1.i[0], c1.o[1] - c1.i[1]);
    if (!low) {
      q4(b, v3(c1.i, walk), v3(c0.i, walk), v3(c0.i, par), v3(c1.i, par), inn, C);
      q4(b, v3(c0.i, par), v3(c1.i, par), v3(across(c1, fq), par), v3(across(c0, fp), par), [0, 1, 0], SH);
      q4(b, v3(across(c0, fp), walk), v3(across(c1, fq), walk), v3(across(c1, fq), par), v3(across(c0, fp), par), out, C);
      q4(b, v3(across(c0, fp), walk), v3(across(c1, fq), walk), v3(c1.o, walk), v3(c0.o, walk), [0, 1, 0], SH);
    } else {
      q4(b, v3(c0.i, walk), v3(c1.i, walk), v3(c1.o, walk), v3(c0.o, walk), [0, 1, 0], SH);
    }
    // the gate's vault
    if (arch) {
      const tm = (c0.t! + c1.t!) / 2, ym = archY(tm), h = -tm / ARCH, vy = -(ym - SPRING) / ARCH;
      q4(b, v3(c0.o, archY(c0.t!)), v3(c1.o, archY(c1.t!)), v3(c1.i, archY(c1.t!)), v3(c0.i, archY(c0.t!)), [ET[0] * h, vy, ET[1] * h], SH);
    }
    // a merlon on the outer edge for every stretch of wall
    if (chord >= 0.7) {
      const yaw = Math.atan2(c1.o[1] - c0.o[1], c1.o[0] - c0.o[0]);
      const cx = mid[0] - out[0] * 0.3, cz = mid[1] - out[2] * 0.3;
      b.obox(cx, (walk + H) / 2, cz, chord * 0.3, (H - walk) / 2, 0.25, yaw, C, { top: SH });
    }
    u += chord;
  }
  // where the wall steps down, the face of the higher step
  for (let s = 0; s < n; s++) {
    const A = segs[(s - 1 + n) % n], B = segs[s], c = B.c0;
    if (Math.abs(A.walk - B.walk) < 0.01) continue;
    const [hi, lo] = A.walk > B.walk ? [A, B] : [B, A];
    const fp = 0.35 / Math.hypot(c.o[0] - c.i[0], c.o[1] - c.i[1]);
    const toward: V3 = [lo.mid[0] - c.o[0], 0, lo.mid[1] - c.o[1]];
    q4(b, v3(c.i, lo.par), v3(across(c, fp), lo.par), v3(across(c, fp), hi.par), v3(c.i, hi.par), toward, C);
    q4(b, v3(across(c, fp), lo.walk), v3(c.o, lo.walk), v3(c.o, hi.walk), v3(across(c, fp), hi.walk), toward, C);
  }

  // --- the gate: the sides of the way through, the portcullis drawn up, the doors open ---
  for (const s of [-1, 1]) {
    const t = s * ARCH;
    q4(b, gp(t, Math.sqrt(RI * RI - t * t), BY - 0.05), gp(t, Math.sqrt(RO * RO - t * t), BY - 0.05), gp(t, Math.sqrt(RO * RO - t * t), SPRING), gp(t, Math.sqrt(RI * RI - t * t), SPRING), [-ET[0] * s, 0, -ET[1] * s], SH);
  }
  const crown = SPRING + ARCH, pd = Math.sqrt(RO * RO - 2.75 * 2.75) - 0.45, BARS = 0x9a9da2;
  b.beam(gp(-2.75, pd, crown - 1.1), gp(2.75, pd, crown - 1.1), 0.09, 0.09, BARS);
  b.beam(gp(-2.2, pd, crown - 0.55), gp(2.2, pd, crown - 0.55), 0.08, 0.08, BARS);
  for (let t = -2.4; t <= 2.41; t += 0.8) b.beam(gp(t, pd, crown - 1.5), gp(t, pd, archY(t) + 0.05), 0.08, 0.06, BARS);
  b.moved(SE.x, 0, SE.z, GA + Math.PI / 2, () => {
    // in here x runs across the road and -z out along it
    for (const s of [-1, 1]) b.box(s > 0 ? 4.26 : -4.38, BY + 0.02, -9.9, s > 0 ? 4.38 : -4.26, SPRING - 0.15, -8.0, DOOR, { top: TIMBER_DARK });
  });
  const floor: P2[] = [];
  for (let i = 0; i <= 8; i++) { const t = -ARCH + (i * 2 * ARCH) / 8; floor.push(gxz(t, Math.sqrt(RO * RO - t * t))); }
  for (let i = 8; i >= 0; i--) { const t = -ARCH + (i * 2 * ARCH) / 8; floor.push(gxz(t, Math.sqrt(9.3 * 9.3 - t * t))); }
  area(k, floor, PAVE, BY + 0.015);
  // torches either side of the gate, guards and a banner over it
  for (const s of [-1, 1]) {
    const p = gxz(s * 5.6, RO + 0.25);
    b.box(p[0] - 0.1, crown - 3.4, p[1] - 0.1, p[0] + 0.1, crown - 3.0, p[1] + 0.1, IRONWORK);
    fire(k, p[0], crown - 2.75, p[1], 0.28, 8);
    const g = gxz(s * 2.6, RO - 0.95);
    figure(b, g[0], g[1], walkTall, BARATHEON_GUARD);
  }
  const bn = gxz(0, RI + 0.95);
  banner(b, bn[0], bn[1], walkTall, 'baratheon', l.top + 3.9 - walkTall);

  // --- the headland: a ledge round the foot of the wall, then cliffs to the bay and a slope of rock to the land ---
  const M = CRAGS.length, pick = rng(911);
  for (let j = 0; j < M; j++) {
    const A = CRAGS[j], B = CRAGS[(j + 1) % M], am = A.a + Math.PI / M;
    const tA = pol(A.rt, A.a, LEDGE), tB = pol(B.rt, B.a, LEDGE), mA = pol(A.rm, A.a, A.ym), mB = pol(B.rm, B.a, B.ym), fA = pol(A.rf, A.a, A.yf), fB = pol(B.rf, B.a, B.yf);
    const o: V3 = [Math.cos(am), 0.3, Math.sin(am)];
    q4(b, pol(RO - 0.4, A.a, LEDGE), pol(RO - 0.4, B.a, LEDGE), tB, tA, [0, 1, 0], TURF);
    q4(b, tA, tB, mB, mA, o, CHALK[Math.floor(pick() * 3)]);
    q4(b, mA, mB, fB, fA, o, CHALK_LOW[Math.floor(pick() * 3)]);
  }

  // --- the ramp the road climbs, from the ground up to the gate, with a low wall along each edge ---
  const st: number[] = [];
  for (let d = RAMP_FOOT; d > RI + 1.0; d -= 0.75) st.push(d);
  st.push(RI + 1.0, RAMP_END);
  const RAMP = STONE.storm, RAMP_CAP = STONE.stormShade;
  for (let i = 0; i + 1 < st.length; i++) {
    const d0 = st[i], d1 = st[i + 1], y0 = Math.max(-0.05, rampTop(d0)), y1 = Math.max(-0.05, rampTop(d1));
    q4(b, gp(-RAMP_WALL, d0, y0), gp(RAMP_WALL, d0, y0), gp(RAMP_WALL, d1, y1), gp(-RAMP_WALL, d1, y1), [0, 1, 0], EARTH_TOP);
    if (d1 < RI + 1.0 - 1e-6) continue; // under the gate it is only the bed of the road
    for (const s of [-1, 1]) {
      const side: V3 = [ET[0] * s, 0, ET[1] * s], inside: V3 = [-ET[0] * s, 0, -ET[1] * s], w = RAMP_WALL * s, e = RAMP_HALF * s, h = 0.85;
      q4(b, gp(w, d0, y0), gp(w, d1, y1), gp(w, d1, y1 + h), gp(w, d0, y0 + h), inside, RAMP);
      q4(b, gp(w, d0, y0 + h), gp(w, d1, y1 + h), gp(e, d1, y1 + h), gp(e, d0, y0 + h), [0, 1, 0], RAMP_CAP);
      q4(b, gp(e, d0, -0.4), gp(e, d1, -0.4), gp(e, d1, y1 + h), gp(e, d0, y0 + h), side, RAMP);
      if (i === 0) q4(b, gp(w, d0, -0.4), gp(e, d0, -0.4), gp(e, d0, y0 + h), gp(w, d0, y0 + h), [ER[0], 0, ER[1]], RAMP);
    }
  }

  // --- the bailey: paved, the lane round the drum clear, and against the tall wall a stable, a smithy, a well and a sept ---
  area(k, oval(SE.x, SE.z, 9.3, 9.3, WALL_COLS), PAVE, BY + 0.015);
  bailey(k);

  // --- tumbled rock and surf where the headland meets the bay ---
  shore(k);

  // guards on the walk, and braziers where they stand
  for (const deg of [146, 166, 246, 262, 283, 304]) {
    const a = (deg * Math.PI) / 180, p = polXZ(RI + 0.95, a);
    k.person(p[0], p[1], walkTall);
  }
  for (const deg of [156, 272]) { const p = polXZ(RI + 0.92, (deg * Math.PI) / 180); brazier(k, p[0], p[1], walkTall); }
  // and on the low wall to the sea, looking out over the bay
  for (const deg of [8, 40, 78, 104]) { const p = polXZ(RI + 0.75, (deg * Math.PI) / 180); k.person(p[0], p[1], BY + 0.6); }
  k.lights.push({ x: SE.x, z: SE.z, r: 13, color: '#ffcf8a', k: 0.5 });

  // the name, before the castle's south-east side, where the view the tile opens with reads it
  nameBoard(k, 'stormlands-storms-end', SE.x + 10.3, SE.z + 7.3, 0, undefined, 1.2);
}

/** What stands against the inside of the tall wall, clear of the lane round the drum. */
function bailey(k: Build): void {
  const b = k.b, D = Math.PI / 180, step = TAU / WALL_COLS, RF = RI - 0.18;
  // a front against the wall from one corner of it to another: stone below, timber or plaster above, and a roof of its own sloping off the wall
  const front = (a0: number, a1: number, y1: number, split: number, low: number, high: number, roof: number): number[] => {
    const as: number[] = [];
    for (let a = a0; a <= a1 + 1e-6; a += step) as.push(a);
    for (let i = 0; i + 1 < as.length; i++) {
      const p = as[i], q = as[i + 1], inn = outward(polXZ(RI, (p + q) / 2)).map((v, j) => (j === 1 ? 0 : -v)) as V3;
      q4(b, pol(RF, p, BY - 0.05), pol(RF, q, BY - 0.05), pol(RF, q, split), pol(RF, p, split), inn, low);
      q4(b, pol(RF, p, split), pol(RF, q, split), pol(RF, q, y1), pol(RF, p, y1), inn, high);
      q4(b, pol(RF, p, y1), pol(RF, q, y1), pol(RI + 0.05, q, y1), pol(RI + 0.05, p, y1), [0, 1, 0], TIMBER_DARK);
      // the roof off the wall, with its underside
      const yw = y1 + 0.25, yo = y1 - 0.3, ro = RI - 0.78;
      q4(b, pol(RI + 0.05, p, yw), pol(RI + 0.05, q, yw), pol(ro, q, yo), pol(ro, p, yo), [0, 1, 0], roof);
      q4(b, pol(RI + 0.05, p, yw - 0.09), pol(RI + 0.05, q, yw - 0.09), pol(ro, q, yo - 0.09), pol(ro, p, yo - 0.09), [0, -1, 0], TIMBER_DARK);
      q4(b, pol(ro, p, yo - 0.09), pol(ro, q, yo - 0.09), pol(ro, q, yo), pol(ro, p, yo), inn, TIMBER_DARK);
    }
    for (const [a, s] of [[as[0], -1], [as[as.length - 1], 1]] as const) {
      const tan: V3 = [-Math.sin(a) * s, 0, Math.cos(a) * s];
      q4(b, pol(RF, a, BY - 0.05), pol(RI + 0.02, a, BY - 0.05), pol(RI + 0.02, a, y1), pol(RF, a, y1), tan, low);
      q4(b, pol(RI + 0.05, a, y1 + 0.25), pol(RI - 0.78, a, y1 - 0.3), pol(RI - 0.78, a, y1 - 0.39), pol(RI + 0.05, a, y1 + 0.16), tan, TIMBER_DARK);
    }
    return as;
  };
  /** An opening in a front, between two of its corners: a stall, a forge, a door. */
  const opening = (p: number, q: number, f0: number, f1: number, y0: number, y1: number, color: number, lit: number): void => {
    const A = polXZ(RF - 0.05, p), B = polXZ(RF - 0.05, q);
    const P = (f: number, y: number): V3 => [lerp(A[0], B[0], f), y, lerp(A[1], B[1], f)];
    q4(b, P(f0, y0), P(f1, y0), P(f1, y1), P(f0, y1), outward(polXZ(RI, (p + q) / 2)).map((v, j) => (j === 1 ? 0 : -v)) as V3, color, { win: interior(lit) });
  };

  // the stables, in the north: a row of stalls, two horses looking out
  const st = front(252 * D, 288 * D, BY + 3.7, BY + 2.3, STONE.stormShade, PLASTER, ROOF.shingle);
  for (let i = 0; i + 1 < st.length; i++) {
    opening(st[i], st[i + 1], 0.18, 0.82, BY, BY + 2.0, DARK, 0.35);
    if (i % 2 === 1) opening(st[i], st[i + 1], 0.32, 0.68, BY + 2.6, BY + 3.3, TIMBER_DARK, 0.2);
  }
  for (const [i, coat] of [[1, 0x6b4a32], [4, 0x9a948c]] as const) {
    const a = (st[i] + st[i + 1]) / 2, p = polXZ(RF - 0.15, a), h = polXZ(RF - 0.36, a);
    b.obox(p[0], BY + 1.55, p[1], 0.17, 0.22, 0.17, a, coat);
    b.obox(h[0], BY + 1.42, h[1], 0.14, 0.17, 0.15, a, coat);
  }
  for (const deg of [258, 279]) { const p = polXZ(RI - 0.45, deg * D); k.person(p[0], p[1], BY); }

  // the smithy, in the west-south-west: a forge that glows, and a chimney up the face of the wall
  const sm = front(144 * D, 168 * D, BY + 3.2, BY + 3.2, STONE.stormShade, STONE.stormShade, ROOF.slate);
  for (let i = 0; i + 1 < sm.length; i++) opening(sm[i], sm[i + 1], 0.12, 0.88, BY, BY + 2.3, 0x2a1a12, i === 1 || i === 2 ? 0.95 : 0.4);
  const forge = polXZ(RF - 0.1, 156 * D);
  k.glows.push({ x: forge[0], y: BY + 0.7, z: forge[1], sx: 0.9, sy: 0.4, sz: 0.9, color: '#ff8a3a' });
  k.lights.push({ x: forge[0], z: forge[1], r: 7, color: '#ffa860', k: 0.55 });
  b.moved(SE.x, 0, SE.z, 150 * D + Math.PI / 2, () => {
    b.box(-0.42, BY + 3.5, -RI - 0.05, 0.42, BY + 9.4, -RI + 0.55, STONE.stormShade, { top: DARK });
  });
  const cp = polXZ(RI - 0.25, 150 * D);
  const chimneyTop: V3 = [cp[0], BY + 9.6, cp[1]];
  const smoke = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 36);
  k.group.add(smoke.mesh);
  const from = new THREE.Vector3(...chimneyTop), drift = new THREE.Vector3(0.7, 0.35, 0.25);
  let due = 0;
  k.each((dt) => {
    due -= dt;
    if (due <= 0) { due = 0.42; smoke.puff(from, drift, 0.5, 0.5); }
    smoke.update(dt);
  });
  k.person(polXZ(RI - 0.45, 161 * D)[0], polXZ(RI - 0.45, 161 * D)[1], BY);

  // the well, beside the gate: a round kerb under a little roof on two posts
  b.moved(SE.x, 0, SE.z, 171 * D + Math.PI / 2, () => {
    b.cyl(0, -RI + 0.22, BY - 0.05, BY + 0.8, 0.45, 0.45, 8, STONE.storm, { cap: 0x3b4a52 });
    for (const s of [-1, 1]) b.box(s * 0.5 - 0.06, BY, -RI + 0.16, s * 0.5 + 0.06, BY + 2.1, -RI + 0.28, TIMBER);
    b.box(-0.6, BY + 1.95, -RI + 0.17, 0.6, BY + 2.05, -RI + 0.27, TIMBER);
    for (const s of [-1, 1]) {
      // the two slopes of the little roof, each with its underside
      const z0 = -RI - 0.02, z1 = -RI + 0.62;
      q4(b, [-0.75, BY + 2.1, s > 0 ? z1 : z0], [0.75, BY + 2.1, s > 0 ? z1 : z0], [0.75, BY + 2.55, (z0 + z1) / 2], [-0.75, BY + 2.55, (z0 + z1) / 2], [0, 1, s * 0.6], ROOF.shingle);
      q4(b, [-0.75, BY + 2.04, s > 0 ? z1 : z0], [0.75, BY + 2.04, s > 0 ? z1 : z0], [0.75, BY + 2.49, (z0 + z1) / 2], [-0.75, BY + 2.49, (z0 + z1) / 2], [0, -1, -s * 0.6], TIMBER_DARK);
      face3(b, [s * 0.75, BY + 2.04, z0], [s * 0.75, BY + 2.04, z1], [s * 0.75, BY + 2.52, (z0 + z1) / 2], [s, 0, 0], TIMBER_DARK);
    }
  });

  // the sept, in the north-north-east: a pale front with a gable, a door and a window of seven sides
  b.moved(SE.x, 0, SE.z, 300 * D + Math.PI / 2, () => {
    const W = STONE.white, zf = -RI + 0.28, top = BY + 4.0;
    b.box(-1.1, BY - 0.05, -RI - 0.5, 1.1, top, zf, W, { faces: 'SEWT', top: STONE.whiteShade });
    for (const s of [-1, 1]) {
      q4(b, [s * 1.25, top - 0.05, zf + 0.14], [0, top + 1.25, zf + 0.14], [0, top + 1.25, -RI - 0.2], [s * 1.25, top - 0.05, -RI - 0.2], [s * 0.7, 1, 0], ROOF.slate);
      q4(b, [s * 1.25, top - 0.13, zf + 0.14], [0, top + 1.17, zf + 0.14], [0, top + 1.17, -RI - 0.2], [s * 1.25, top - 0.13, -RI - 0.2], [-s * 0.7, -1, 0], TIMBER_DARK);
    }
    face3(b, [-1.1, top, zf], [1.1, top, zf], [0, top + 1.12, zf], [0, 0, 1], W);
    roundel(b, [0, top - 0.75, zf + 0.03], 0.52, 'S', 0x2c2a3c, { win: interior(0.95) }, 7);
    b.box(-0.42, BY, zf, 0.42, BY + 2.0, zf + 0.03, DARK, { faces: 'S', win: interior(0.6) });
    b.box(-0.75, BY - 0.05, zf, 0.75, BY + 0.18, zf + 0.3, STONE.whiteShade);
    b.cyl(0, zf + 0.1, top + 1.12, top + 1.6, 0.12, 0.02, 4, ROOF.gilt, { cap: false });
  });
  const sp = polXZ(RI - 0.55, 296 * D);
  k.person(sp[0], sp[1], BY);
}

/** The drum tower, in the middle: its foot, its shaft, the corbels and the crown of massive battlements. */
function stormsEndDrum(k: Build, l: Lot): void {
  const b = k.b, C = STONE.storm, SH = STONE.stormShade, cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2;
  const S = 14, rB = 3.9, rS = 3.6, rC = 4.45, y0 = BY, yShaft = 4.2, yCorbel = 21.0, yRoof = l.top - 1.9, yBlock = l.top - 0.6;
  const at = (r: number, i: number, y: number): V3 => { const a = (i / S) * TAU; return [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]; };
  const midA = (i: number): number => ((i + 0.5) / S) * TAU;
  // its foot, battered out a little
  b.cyl(cx, cz, y0 - 0.05, yShaft, rB, rS + 0.02, S, C, { cap: false, phase: 0 });
  // the shaft: windows to the land, only slits to the sea
  const side = 2 * rS * Math.sin(Math.PI / S), circ = side * S;
  const toLand: WinSpec = { cell: 1.7, storey: 4.2, lit: 0.45, kind: 4 }, toSea: WinSpec = { cell: 4.8, storey: 4.2, lit: 0.25, kind: 4 };
  for (let i = 0; i < S; i++) {
    const a = midA(i), o: V3 = [Math.cos(a), 0, Math.sin(a)];
    q4(b, at(rS, i, yShaft), at(rS, i + 1, yShaft), at(rS, i + 1, yCorbel), at(rS, i, yCorbel), o, C, { win: fromSea(a) < 95 ? toSea : toLand, L: circ, u0: i * side, u1: (i + 1) * side, seed: 0.83 });
  }
  // a band of stone half way up
  b.cyl(cx, cz, 12.5, 12.85, rS + 0.09, rS + 0.09, S, SH, { cap: false, phase: 0 });
  // the corbels under the crown, and the crown's underside
  for (let i = 0; i < S; i++) {
    const a = (i / S) * TAU;
    b.obox(cx + Math.cos(a) * 4.0, yCorbel - 0.37, cz + Math.sin(a) * 4.0, 0.46, 0.35, 0.24, a, SH);
    q4(b, at(rS, i, yCorbel), at(rS, i + 1, yCorbel), at(rC, i + 1, yCorbel), at(rC, i, yCorbel), [0, -1, 0], SH);
  }
  b.cyl(cx, cz, yCorbel, yRoof, rC, rC, S, C, { cap: SH, phase: 0, win: { cell: 1.9, storey: yRoof / 6, lit: 0.3, kind: 4 } });
  // the battlements: seven great merlons, each a block with a spike on it
  for (let i = 0; i < S; i += 2) {
    const o0 = at(rC, i, yRoof), o1 = at(rC, i + 1, yRoof), i0 = at(3.7, i, yRoof), i1 = at(3.7, i + 1, yRoof);
    const up = (p: V3): V3 => [p[0], yBlock, p[2]];
    const a = midA(i), o: V3 = [Math.cos(a), 0, Math.sin(a)];
    q4(b, o0, o1, up(o1), up(o0), o, C);
    q4(b, i1, i0, up(i0), up(i1), [-o[0], 0, -o[2]], C);
    q4(b, i0, o0, up(o0), up(i0), [-Math.sin(a - Math.PI / S), 0, Math.cos(a - Math.PI / S)].map((v) => -v) as V3, C);
    q4(b, o1, i1, up(i1), up(o1), [-Math.sin(a + Math.PI / S), 0, Math.cos(a + Math.PI / S)], C);
    const apex: V3 = [cx + Math.cos(a) * 4.05, l.top, cz + Math.sin(a) * 4.05];
    slope3(b, up(o0), up(o1), apex, SH);
    slope3(b, up(o1), up(i1), apex, SH);
    slope3(b, up(i1), up(i0), apex, SH);
    slope3(b, up(i0), up(o0), apex, SH);
  }
  // on the roof: a brazier, two guards and the banner of the house
  brazier(k, cx + 1.6, cz + 1.2, yRoof);
  k.person(cx - 2.2, cz + 1.4, yRoof);
  k.person(cx + 1.9, cz - 2.0, yRoof);
  banner(k.b, cx - 0.3, cz - 0.3, yRoof, 'baratheon', l.top + 3.6 - yRoof, 1.3);
  // the door at its foot, facing the gate, in a porch of its own
  b.moved(cx, 0, cz, GA + Math.PI / 2, () => {
    b.box(-0.95, y0 - 0.05, -4.1, 0.95, y0 + 3.0, -3.3, C, { top: SH });
    b.box(-0.55, y0, -4.13, 0.55, y0 + 2.3, -4.1, DARK, { faces: 'N', win: interior(0.75) });
  });
  const door = gp(0, 4.2, y0 + 2.75);
  fire(k, door[0], door[1], door[2], 0.22, 6);
}

/** Tumbled grey rock along the foot of the headland, and white surf where the bay breaks on it. */
function shore(k: Build): void {
  const b = k.b, r = rng(2718), ROCKS = [0x8d877c, 0x7a756c, 0x9a958a, 0x6c675f], SURF = 0xf2f4f1;
  const boardA: P2 = [SE.x + 10.3 + 0.743 * 4.6, SE.z + 7.3 - 0.669 * 4.6], boardB: P2 = [SE.x + 10.3 - 0.743 * 4.6, SE.z + 7.3 + 0.669 * 4.6];
  const nearBoard = (x: number, z: number): boolean => {
    const dx = boardB[0] - boardA[0], dz = boardB[1] - boardA[1], t = Math.max(0, Math.min(1, ((x - boardA[0]) * dx + (z - boardA[1]) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - boardA[0] - dx * t, z - boardA[1] - dz * t) < 1.6;
  };
  const seaAt = (x: number, z: number): boolean => x > 76 || z > 98 + (76 - x) * 0.1;
  const rock = (x: number, z: number, rad: number, h: number): void => {
    if (nearBoard(x, z) || Math.hypot(x - SE.x, z - SE.z) < RO + 0.9) return;
    const y0 = seaAt(x, z) ? -1.3 : -0.3;
    b.cyl(x, z, y0, Math.min(1.9, y0 + h), rad, rad * (0.45 + 0.25 * r()), 5, ROCKS[Math.floor(r() * 4)], { phase: r() * 3, cap: ROCKS[Math.floor(r() * 4)] });
  };
  // down the east shore, and round the corner of the bay
  for (let z = 79; z < 98; z += 1.7 + r()) rock(74.4 + r() * 2.6, z, 0.6 + r() * 0.7, 1.2 + r() * 1.4);
  for (let x = 74.5; x > 56; x -= 1.9 + r()) {
    const zs = 98 + (76 - x) * 0.1;
    rock(x, zs - 0.4 + r() * 1.6, 0.55 + r() * 0.7, 1.0 + r() * 1.3);
  }
  for (const [x, z] of [[75.5, 97.5], [76.6, 98.6], [74.6, 99.2]]) rock(x, z, 0.9 + r() * 0.4, 1.6);
  // a few at the foot of the slope to the land
  for (const deg of [126, 140, 170, 252, 268, 290, 312]) {
    const a = (deg * Math.PI) / 180, p = polXZ(RO + 2.9 + r() * 0.8, a);
    rock(p[0], p[1], 0.45 + r() * 0.35, 0.9 + r() * 0.6);
  }
  // the surf: flat white slabs at the water's edge
  const slabAt = (x: number, z: number, rad: number): void => {
    const pts: V3[] = [];
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + r() * 0.8; pts.push([x + Math.cos(a) * rad * (0.6 + 0.5 * r()), -0.86, z + Math.sin(a) * rad * (0.6 + 0.5 * r())]); }
    for (let i = 1; i + 1 < pts.length; i++) b.up(pts[0], pts[i], pts[i + 1], SURF);
  };
  for (let z = 78; z < 98.5; z += 1.3 + r() * 0.8) slabAt(76.6 + r() * 0.8, z, 0.7 + r() * 0.5);
  for (let x = 75.5; x > 56.5; x -= 1.4 + r() * 0.9) slabAt(x, 98.9 + (76 - x) * 0.1 + r() * 0.6, 0.7 + r() * 0.5);
}

// ===========================================================================
// Sunspear
// ===========================================================================

const SAND = STONE.sand, SAND_SH = STONE.sandShade;
const MUD = [0xdcc591, 0xd4b47e, 0xe3cfa2, 0xc9a674, 0xe8d8b4, 0xd9b38c];
const CLOTH = [0xe07a22, 0xb3141c, 0xe8a23a, 0xc2421c];
const GLASS = 0x8a6a30, GILT = 0xe0b84e, SPEAR_GOLD = 0xf2d27a, DOME = 0xd08a4e;
const PALM_TRUNK = 0x8a6e4a, FROND = 0x5e8f3a, FROND_UNDER = 0x4d7a30, LEAF = 0x3f6e33, ORANGE = 0xf08a1c;
const MUD_WIN: WinSpec = { cell: 1.3, storey: 2.15, lit: 0.5, kind: 4 };

/** The middle of the road through the Threefold Gate, at a place along it. */
function roadX(z: number): number {
  const a = ROADS.sunspear[1], c = ROADS.sunspear[2];
  return a[0] + ((c[0] - a[0]) * (z - a[1])) / (c[1] - a[1]);
}
/** Where a wall of Sunspear stops against the rock of Storm's End's headland, if it comes so far. */
function wallEast(l: Lot): number {
  const zm = (l.z0 + l.z1) / 2, dz = zm - SE.z, reach = RO + 2;
  return Math.abs(dz) < reach ? Math.min(l.x1, SE.x - Math.sqrt(reach * reach - dz * dz)) : l.x1;
}

/** A straight stretch of mud-brick wall between two points, with loops that glow and merlons on both edges. */
function mudWall(b: GeoBuilder, a: P2, c: P2, y1: number, half: number, win: WinSpec, seed: number): void {
  let dx = c[0] - a[0], dz = c[1] - a[1];
  const len = Math.hypot(dx, dz);
  dx /= len; dz /= len;
  const nx = -dz, nz = dx, e = 0.05;
  const A: P2 = [a[0] - dx * e, a[1] - dz * e], B: P2 = [c[0] + dx * e, c[1] + dz * e];
  const P = (p: P2, s: number, y: number): V3 => [p[0] + nx * half * s, y, p[1] + nz * half * s];
  for (const s of [-1, 1]) q4(b, P(A, s, 0), P(B, s, 0), P(B, s, y1), P(A, s, y1), [nx * s, 0, nz * s], SAND, { win, L: len, u0: 0, u1: len, seed: seed + s * 0.21 });
  q4(b, P(A, -1, 0), P(A, 1, 0), P(A, 1, y1), P(A, -1, y1), [-dx, 0, -dz], SAND);
  q4(b, P(B, -1, 0), P(B, 1, 0), P(B, 1, y1), P(B, -1, y1), [dx, 0, dz], SAND);
  q4(b, P(A, -1, y1), P(B, -1, y1), P(B, 1, y1), P(A, 1, y1), [0, 1, 0], SAND_SH);
  const m = Math.max(1, Math.round(len / 1.6)), yaw = Math.atan2(dz, dx);
  for (let i = 0; i < m; i++) {
    const t = ((i + 0.5) / m) * len;
    for (const s of [-1, 1]) b.obox(a[0] + dx * t + nx * (half - 0.12) * s, y1 + 0.33, a[1] + dz * t + nz * (half - 0.12) * s, (len / m) * 0.27, 0.33, 0.12, yaw, SAND, { top: SAND_SH });
  }
}

/** A little round tower at the end of a wall, with a dome on it. */
function wallTower(b: GeoBuilder, x: number, z: number, top: number): void {
  b.cyl(x, z, 0, top - 0.25, 0.85, 0.85, 8, SAND, { cap: SAND_SH, win: { cell: 1.4, storey: (top - 0.25) / 2, lit: 0.4, kind: 4 }, seed: x * 0.1 });
  lathe(b, x, z, [[0.92, top - 0.25], [0.72, top + 0.3], [0.3, top + 0.62], [0.02, top + 0.7]], 8, DOME);
}

/**
 * One of the Threefold Gate's gates: a gatehouse that rises above its wall,
 * with a segmental arch 9 wide through it, a round turret with a dome on each
 * side, and torches at the arch.
 */
function gatehouse(k: Build, xg: number, zm: number, half: number, lit: boolean): void {
  const b = k.b, zN = zm - half, zS = zm + half, W = 4.5, R = 5.7, yc = 0.7, n = 8, walk = 6.9;
  const spring = yc + Math.sqrt(R * R - W * W);
  for (let i = 0; i < n; i++) {
    const ta = -W + (2 * W * i) / n, tb = -W + (2 * W * (i + 1)) / n, ya = yc + Math.sqrt(R * R - ta * ta), yb = yc + Math.sqrt(R * R - tb * tb);
    q4(b, [xg + ta, ya, zS], [xg + tb, yb, zS], [xg + tb, walk, zS], [xg + ta, walk, zS], [0, 0, 1], SAND);
    q4(b, [xg + tb, yb, zN], [xg + ta, ya, zN], [xg + ta, walk, zN], [xg + tb, walk, zN], [0, 0, -1], SAND);
    const tm = (ta + tb) / 2, ym = yc + Math.sqrt(R * R - tm * tm);
    q4(b, [xg + ta, ya, zN], [xg + tb, yb, zN], [xg + tb, yb, zS], [xg + ta, ya, zS], [-tm / R, -(ym - yc) / R, 0], SAND_SH);
  }
  q4(b, [xg - W, walk, zN], [xg + W, walk, zN], [xg + W, walk, zS], [xg - W, walk, zS], [0, 1, 0], SAND_SH);
  for (const s of [-1, 1]) {
    const xa = s > 0 ? xg + W : xg - W - 0.8, xb = s > 0 ? xg + W + 0.8 : xg - W;
    b.box(xa, 0, zN, xb, walk, zS, SAND, { faces: 'NST', top: SAND_SH });
    q4(b, [xg + s * W, 0, zN], [xg + s * W, 0, zS], [xg + s * W, spring, zS], [xg + s * W, spring, zN], [-s, 0, 0], SAND_SH);
    const tx = xg + s * 5.55;
    b.cyl(tx, zm, 0, 7.0, 1.05, 1.05, 10, SAND, { cap: SAND_SH, win: { cell: 1.5, storey: 3.5, lit: 0.4, kind: 4 }, seed: tx * 0.1 + zm * 0.03 });
    lathe(b, tx, zm, [[1.13, 7.0], [0.95, 7.55], [0.5, 7.9], [0.02, 8.0]], 8, DOME);
    fire(k, xg + s * 4.85, 3.6, zN - 0.1, 0.25, lit ? 6 : 0);
  }
  for (const x of [-3, 0, 3]) for (const z of [zN + 0.13, zS - 0.13]) b.obox(xg + x, walk + 0.3, z, 0.45, 0.3, 0.12, 0, SAND, { top: SAND_SH });
  k.person(xg - 2.2, zm, walk);
}

/** A wall of Sunspear: it winds a little from end to end, and the road goes through its gatehouse. */
function windingWall(k: Build, l: Lot, idx: number): void {
  const b = k.b, zm = (l.z0 + l.z1) / 2, xg = roadX(zm), body = l.top - 0.66, half = 0.31, A = (l.z1 - l.z0) / 2 - half - 0.03;
  const win: WinSpec = { cell: 2.4, storey: body, lit: 0.3, kind: 4 };
  const run = (x0: number, x1: number, seed: number): void => {
    const m = Math.max(2, Math.round((x1 - x0) / 3));
    const pts: P2[] = Array.from({ length: m + 1 }, (_, i): P2 => [x0 + ((x1 - x0) * i) / m, i === 0 || i === m ? zm : zm + (i % 2 ? A : -A)]);
    for (let i = 0; i < m; i++) mudWall(b, pts[i], pts[i + 1], body, half, win, seed + i * 0.17);
  };
  const xw = l.x0 + 0.6, xe = wallEast(l);
  run(xw, xg - 5.5, idx * 1.3);
  run(xg + 5.5, xe, idx * 1.3 + 0.6);
  wallTower(b, xw, zm, l.top);
  if (xe >= l.x1 - 0.01) wallTower(b, xe - 0.3, zm, l.top);
  gatehouse(k, xg, zm, (l.z1 - l.z0) / 2, true);
  if (idx !== 1) banner(b, xg + 2.4, zm, 6.9, 'martell', l.top + 3.9 - 6.9, idx === 0 ? 1 : 0.75);
}

/** The shadow city: mud-brick houses and shops between the walls, with alleys, awnings and stalls, and people. */
function shadowCity(k: Build): void {
  const b = k.b, r = rng(7311), w = [lotOf('sun-wall-1'), lotOf('sun-wall-2'), lotOf('sun-wall-3')];
  const gates = w.map((l): P2 => [roadX((l.z0 + l.z1) / 2), (l.z0 + l.z1) / 2]);
  const blocked = (x0: number, z0: number, x1: number, z1: number, road: number): boolean => {
    for (const z of [z0, z1]) { const xr = roadX(z); if (x1 > xr - road && x0 < xr + road) return true; }
    for (const [gx, gz] of gates) if (x1 > gx - 6.8 && x0 < gx + 6.8 && z1 > gz - 1.25 && z0 < gz + 1.25) return true;
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) if (Math.hypot(x - SE.x, z - SE.z) < RO + 3.6) return true;
    return false;
  };
  for (let s = 0; s < 2; s++) {
    const za = w[s].z1 + 0.06, zb = w[s + 1].z0 - 0.06, alley0 = za + 1.85 + r() * 0.3, alley1 = alley0 + 0.85;
    const zr = (za + zb) / 2, xr = roadX(zr);
    for (const [r0, r1, door] of [[za, alley0, 1], [alley1, zb, -1]] as const) {
      for (const side of [-1, 1]) {
        const start = side < 0 ? w[s].x0 + 0.4 : xr + 6.0, end = side < 0 ? xr - 6.0 : Math.min(w[s].x1, 51.5);
        let x = start;
        while (x < end - 1.4) {
          const wd = Math.min(end - x, 1.6 + r() * 1.1), x0 = x, x1 = x + wd;
          x = x1 + 0.06 + (r() < 0.18 ? 0.8 : r() * 0.12);
          if (blocked(x0, r0, x1, r1, 6.0)) continue;
          const tall = r() < 0.38, h = tall ? 4.3 : 2.15, col = MUD[Math.floor(r() * MUD.length)];
          b.box(x0, 0, r0, x1, h, r1, col, { win: MUD_WIN, seed: x0 * 0.31 + r0 * 0.07, top: SAND_SH });
          // the door, on the alley
          const xd = x0 + wd * (0.3 + r() * 0.4), zf = door > 0 ? r1 : r0;
          b.box(xd - 0.28, 0, door > 0 ? zf : zf - 0.04, xd + 0.28, 1.5, door > 0 ? zf + 0.04 : zf, DOOR, { faces: door > 0 ? 'S' : 'N', win: interior(0.55) });
          // an awning over it
          if (r() < 0.45) {
            const c = CLOTH[Math.floor(r() * CLOTH.length)], y = 1.85, out = 0.34;
            q4(b, [x0 + 0.1, y, zf], [x1 - 0.1, y, zf], [x1 - 0.1, y - 0.25, zf + door * out], [x0 + 0.1, y - 0.25, zf + door * out], [0, 1, door * 0.5], c);
            q4(b, [x0 + 0.1, y - 0.05, zf], [x1 - 0.1, y - 0.05, zf], [x1 - 0.1, y - 0.3, zf + door * out], [x0 + 0.1, y - 0.3, zf + door * out], [0, -1, 0], c);
          }
          // on the flat roof of a low house: a room, or a small dome
          if (!tall && r() < 0.4) {
            const cx = x0 + wd * (0.3 + r() * 0.4), cz = (r0 + r1) / 2;
            if (r() < 0.5) b.box(cx - 0.45, h, cz - 0.4, cx + 0.45, h + 0.95, cz + 0.4, col, { top: SAND_SH });
            else lathe(b, cx, cz, [[0.55, h], [0.45, h + 0.4], [0.2, h + 0.68], [0.02, h + 0.75]], 6, r() < 0.5 ? 0xf1ece0 : DOME);
          }
        }
      }
    }
    // the alley's people
    for (let i = 0; i < 4; i++) {
      const side = i % 2 ? 1 : -1, x = side < 0 ? 25 + r() * 7 : xr + 6.4 + r() * 2;
      k.person(x, (alley0 + alley1) / 2, 0);
    }
    // stalls of the bazaar beside the road, each with a counter, its wares and a cloth over it on two posts
    for (const side of [-1, 1]) {
      for (const zc of [zr - 0.9, zr + 0.9]) {
        const x = roadX(zc) + side * 5.5, cloth = CLOTH[Math.floor(r() * CLOTH.length)];
        b.box(x - 0.32, 0, zc - 0.5, x + 0.32, 0.75, zc + 0.5, TIMBER, { top: 0xb89a6a });
        b.box(x - 0.22, 0.75, zc - 0.38, x + 0.22, 0.95, zc + 0.38, [0xd8442a, 0xe9c04a, 0x7a9a3a][Math.floor(r() * 3)]);
        for (const dz of [-0.48, 0.48]) b.box(x + side * 0.35 - 0.05, 0, zc + dz - 0.05, x + side * 0.35 + 0.05, 1.95, zc + dz + 0.05, TIMBER_DARK, { faces: 'NESW' });
        b.box(x - 0.48, 1.95, zc - 0.62, x + 0.48, 2.03, zc + 0.62, cloth, { faces: 'NESWTB' });
        k.person(roadX(zc) + side * 4.55, zc + 0.2, 0);
      }
    }
  }
  k.lights.push({ x: 29, z: 92.8, r: 10, color: '#ffc77a', k: 0.45 }, { x: 46, z: 93, r: 8, color: '#ffc77a', k: 0.4 });
}

/** The Tower of the Sun: a round drum and on it a great dome of gold and leaded glass, which glows at night. */
function towerOfTheSun(k: Build, l: Lot): void {
  const b = k.b, cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, S = 16, rd = Math.min(3.6, (l.x1 - l.x0) / 2 - 0.4);
  const yDrum = 6.8, yDome = 7.25, apex = l.top - 0.15;
  b.cyl(cx, cz, 0.03, 0.5, rd + 0.35, rd + 0.35, S, SAND_SH, { cap: SAND_SH });
  b.cyl(cx, cz, 0.5, yDrum, rd, rd, S, SAND, { cap: false, win: { cell: 1.4, storey: yDrum / 2, lit: 0.5, kind: 6 }, seed: 0.44 });
  b.cyl(cx, cz, yDrum, yDome, rd + 0.18, rd + 0.18, S, SAND_SH, { cap: SAND_SH });
  // the dome: ribs of gold between gores of glass, six rings from its foot to its crown
  const rings = 6, rr = rd - 0.05, ph = Math.PI / S;
  const P = (j: number, i: number): V3 => {
    const f = (j / rings) * (Math.PI / 2), a = ph + (i / S) * TAU;
    return [cx + Math.cos(a) * rr * Math.cos(f), yDome + (apex - 0.55 - yDome) * Math.sin(f), cz + Math.sin(a) * rr * Math.cos(f)];
  };
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < S; i++) {
      const glass = i % 2 === 1 && j < rings - 1, color = glass ? GLASS : GILT;
      const wide = Math.hypot(P(j, i + 1)[0] - P(j, i)[0], P(j, i + 1)[2] - P(j, i)[2]);
      const o: QuadOpts = glass ? { win: { cell: wide + 0.01, storey: 0.55, lit: 1, kind: 1 }, L: wide, u0: 0, u1: wide, seed: i * 0.37 + j } : {};
      const am = ph + ((i + 0.5) / S) * TAU, hint: V3 = [Math.cos(am), 0.4 + j * 0.2, Math.sin(am)];
      if (j === rings - 1) face3(b, P(j, i), P(j, i + 1), P(j + 1, i), [hint[0] * 0.3, 1, hint[2] * 0.3], color);
      else q4(b, P(j, i), P(j, i + 1), P(j + 1, i + 1), P(j + 1, i), hint, color, o);
    }
  }
  // the lantern on its crown, glass that glows, and a gilded sun over it
  const yl = apex - 0.65;
  b.cyl(cx, cz, yl, yl + 0.95, 0.45, 0.45, 8, GLASS, { cap: false, win: interior(1) });
  lathe(b, cx, cz, [[0.55, yl + 0.95], [0.42, yl + 1.25], [0.15, yl + 1.5], [0.02, yl + 1.58]], 8, GILT);
  b.cyl(cx, cz, yl + 1.5, yl + 2.35, 0.07, 0.05, 4, GILT, { cap: false });
  b.cyl(cx, cz, yl + 2.1, yl + 2.4, 0.3, 0.3, 8, GILT);
  // its door, to the east, on the court
  const xd = cx + rd;
  b.box(xd - 0.4, 0.5, cz - 1.05, xd + 0.35, 3.9, cz + 1.05, SAND, { top: SAND_SH });
  b.box(xd + 0.35, 0.5, cz - 0.55, xd + 0.38, 2.6, cz + 0.55, DARK, { faces: 'E', win: interior(0.8) });
  roundel(b, [xd + 0.38, 2.6, cz], 0.55, 'E', DARK, { win: interior(0.8) }, 10);
  b.box(xd + 0.3, 0.03, cz - 0.95, xd + 0.95, 0.27, cz + 0.95, SAND_SH);
  for (const s of [-1, 1]) banner(b, xd + 0.6, cz + s * 1.6, 0.03, 'martell', 4.2, 0.6);
  k.lights.push({ x: cx, z: cz, r: 12, color: '#ffd27a', k: 0.6 });
}

/** The Spear Tower: slender, round, and crowned with a spear of gilded steel. */
function spearTower(k: Build, l: Lot): void {
  const b = k.b, cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, yShaft = 18.75, yGal = l.top - 0.65;
  b.box(l.x0 + 0.05, 0.03, l.z0 + 0.05, l.x1 - 0.05, 2.4, l.z1 - 0.05, SAND, { top: SAND_SH });
  b.cyl(cx, cz, 2.4, yShaft, 1.0, 0.94, 10, SAND, { cap: false, win: { cell: 1.6, storey: yShaft / 5, lit: 0.45, kind: 4 }, seed: 0.71 });
  b.cyl(cx, cz, yShaft, yGal, 1.24, 1.24, 10, SAND_SH, { cap: SAND_SH });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.3;
    b.obox(cx + Math.cos(a) * 1.08, yGal + 0.33, cz + Math.sin(a) * 1.08, 0.13, 0.33, 0.3, a, SAND, { top: SAND_SH });
  }
  b.box(l.x1 - 0.05, 0.03, cz - 0.4, l.x1 - 0.02, 1.8, cz + 0.4, DARK, { faces: 'E', win: interior(0.6) });
  // the spear: its shaft, its collar and its blade
  b.cyl(cx, cz, yGal, l.top + 3.0, 0.12, 0.1, 4, SPEAR_GOLD, { cap: false });
  b.cyl(cx, cz, l.top + 2.8, l.top + 3.05, 0.2, 0.2, 6, SPEAR_GOLD);
  b.cyl(cx, cz, l.top + 3.05, l.top + 4.0, 0.34, 0.02, 4, SPEAR_GOLD, { cap: false, phase: Math.PI / 4 });
  b.cyl(cx, cz, l.top + 2.9, l.top + 3.05, 0.34, 0.34, 4, SPEAR_GOLD, { phase: Math.PI / 4 });
}

/** The Sandship: a long hall shaped like a ship run aground in the sand, its prow to the sea. */
function sandship(k: Build): void {
  const b = k.b, w3 = lotOf('sun-wall-3'), hero = HERO_SPOTS.find((h) => h.id === 'sunspear')!;
  const x0 = hero.x + 1.4, z0 = w3.z1 + 2.15;
  // stations from the stern to the prow: how far along, how wide, how high its rail
  const ST: [number, number, number][] = [[0, 1.45, 3.1], [1.0, 1.5, 2.75], [2.6, 1.5, 2.5], [4.2, 1.5, 2.55], [5.4, 1.32, 2.85], [6.5, 0.8, 3.45], [7.4, 0.06, 4.2]];
  b.moved(x0, 0, z0, -0.05, () => {
    for (let i = 0; i + 1 < ST.length; i++) {
      const [u0, v0, h0] = ST[i], [u1, v1, h1] = ST[i + 1];
      for (const s of [-1, 1]) {
        const m0 = h0 * 0.55, m1 = h1 * 0.55, k0 = h0 * 0.66, k1 = h1 * 0.66, side = (h: number, v: number, f: number): number => s * v * (0.84 + 0.16 * f);
        q4(b, [u0, 0, s * v0 * 0.84], [u1, 0, s * v1 * 0.84], [u1, m1, side(m1, v1, 0.55)], [u0, m0, side(m0, v0, 0.55)], [0, 0, s], SAND);
        q4(b, [u0, m0, side(m0, v0, 0.55)], [u1, m1, side(m1, v1, 0.55)], [u1, k1, side(k1, v1, 0.66)], [u0, k0, side(k0, v0, 0.66)], [0, 0, s], 0x8a6a48);
        q4(b, [u0, k0, side(k0, v0, 0.66)], [u1, k1, side(k1, v1, 0.66)], [u1, h1, s * v1], [u0, h0, s * v0], [0, 0, s], SAND);
      }
      q4(b, [u0, h0, -v0], [u1, h1, -v1], [u1, h1, v1], [u0, h0, v0], [0, 1, 0], SAND_SH);
    }
    q4(b, [0, 0, -ST[0][1] * 0.84], [0, 0, ST[0][1] * 0.84], [0, ST[0][2], ST[0][1]], [0, ST[0][2], -ST[0][1]], [-1, 0, 0], SAND);
    // the long hall along its deck, with lights along both sides
    b.box(1.0, 2.4, -1.0, 5.0, 4.0, 1.0, 0xe3cfa2, { top: SAND_SH });
    for (const s of [-1, 1]) for (let u = 1.35; u < 4.7; u += 0.85) b.box(u, 3.0, s > 0 ? 1.0 : -1.03, u + 0.42, 3.6, s > 0 ? 1.03 : -1.0, DARK, { faces: s > 0 ? 'S' : 'N', win: interior(0.75) });
    // a stump of the mast, and the bowsprit over the prow
    b.cyl(3.0, 0, 4.0, 4.45, 0.16, 0.14, 6, TIMBER, { cap: TIMBER_DARK });
    b.beam([6.6, 3.5, 0], [7.9, 4.25, 0], 0.09, 0.06, TIMBER);
    // the stern-castle, and a gilded sun on the prow
    b.box(0, 2.6, -1.45, 1.15, 4.45, 1.45, SAND, { top: SAND_SH });
    b.box(-0.06, 2.9, -0.4, -0.02, 3.8, 0.4, DARK, { faces: 'W', win: interior(0.6) });
    roundel(b, [7.46, 2.9, 0], 0.32, 'E', GILT, {}, 10);
    banner(b, 0.55, 0, 4.45, 'martell', 2.6, 0.8);
  });
}

/** A palm: a thin curved trunk and six flat fronds. */
function palm(b: GeoBuilder, x: number, z: number, h: number, lean: number, yaw: number): void {
  const pts: V3[] = [];
  for (let i = 0; i <= 3; i++) { const f = i / 3; pts.push([x + Math.cos(yaw) * lean * f * f, h * f, z + Math.sin(yaw) * lean * f * f]); }
  b.sweep(pts, [0.17, 0.14, 0.12, 0.1], PALM_TRUNK);
  const top = pts[3];
  for (let i = 0; i < 6; i++) {
    const a = yaw + 0.4 + (i / 6) * TAU, L = 1.55, ca = Math.cos(a), sa = Math.sin(a);
    const tip: V3 = [top[0] + ca * L, top[1] - 0.6, top[2] + sa * L];
    const l: V3 = [top[0] + ca * L * 0.5 - sa * 0.32, top[1] + 0.12, top[2] + sa * L * 0.5 + ca * 0.32];
    const rr: V3 = [top[0] + ca * L * 0.5 + sa * 0.32, top[1] + 0.12, top[2] + sa * L * 0.5 - ca * 0.32];
    twoSided(b, top, l, tip, FROND, FROND_UNDER);
    twoSided(b, top, tip, rr, FROND, FROND_UNDER);
  }
}

/** An orange tree: a short trunk, a round dark crown and its fruit. */
function orangeTree(b: GeoBuilder, x: number, z: number, s: number): void {
  b.cyl(x, z, 0.03, 0.85 * s, 0.1, 0.08, 5, PALM_TRUNK, { cap: false });
  lathe(b, x, z, [[0.02, 0.62 * s], [0.75 * s, 0.95 * s], [0.78 * s, 1.5 * s], [0.04, 1.95 * s]], 7, LEAF);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7 + 0.4, y = (1.05 + (i % 2) * 0.35) * s, rr = 0.8 * s;
    b.cyl(x + Math.cos(a) * rr, z + Math.sin(a) * rr, y, y + 0.16, 0.1, 0.1, 4, ORANGE);
  }
}

/** The court inside the third gate: paved round the ring the road turns in, a fountain in its middle, palms and orange trees along its north side. */
function court(k: Build): void {
  const b = k.b, [cx, cz] = TURNS.sun.c, R = TURNS.sun.r + 2.6 + 0.05, w3 = lotOf('sun-wall-3');
  const zN = w3.z1 + 0.05, zS = 112.75, xl = cx - 4.05, xr = cx + 4.05, zc = cz - Math.sqrt(R * R - 4.05 * 4.05);
  const arc = (a0: number, a1: number, m: number): P2[] => Array.from({ length: m + 1 }, (_, i): P2 => { const a = lerp(a0, a1, i / m); return [cx + Math.cos(a) * R, cz + Math.sin(a) * R]; });
  const aTop = Math.atan2(zc - cz, xl - cx), aLow = Math.asin(Math.min(1, (zS - cz) / R));
  const west: P2[] = [[w3.x0 + 7.3, zN], [xl, zN], ...arc(TAU + aTop, Math.PI - aLow, 12), [w3.x0 + 7.3, zS]];
  const east: P2[] = [[xr, zN], [55.7, zN], [55.7, zS], ...arc(aLow, Math.atan2(zc - cz, xr - cx), 12)];
  const PAVING = 0xe6d6ad;
  area(k, west, PAVING, 0.035);
  area(k, east, PAVING, 0.035);
  area(k, oval(cx, cz, TURNS.sun.r - 2.6 - 0.05, TURNS.sun.r - 2.6 - 0.05, 12), PAVING, 0.035);
  // the fountain
  b.cyl(cx, cz, 0.035, 0.38, 0.5, 0.5, 8, SAND_SH, { cap: 0x6fb7c9 });
  b.cyl(cx, cz, 0.38, 0.9, 0.08, 0.06, 5, SAND, { cap: false });
  b.cyl(cx, cz, 0.9, 1.0, 0.22, 0.22, 6, 0xbfe3ec);
  // palms and orange trees along the north side
  palm(b, cx - 4.7, zN + 0.95, 4.4, 0.5, 2.4);
  palm(b, cx + 4.8, zN + 0.9, 4.8, 0.6, 0.3);
  palm(b, cx + 7.2, zN + 0.9, 4.2, 0.4, -0.6);
  orangeTree(b, cx + 6.0, zN + 1.4, 1);
  orangeTree(b, cx + 8.5, zN + 1.3, 0.9);
  // people in the court, none of them on the hero's place or south-east of it
  for (const [x, z] of [[31.0, 103.6], [31.0, 109.0], [42.6, 101.4], [32.3, 101.0]]) k.person(x, z, 0);
  k.lights.push({ x: cx + 2, z: cz, r: 13, color: '#ffcf8a', k: 0.5 });
}

// ===========================================================================
// The file's shape
// ===========================================================================

export const MODELS: Record<string, Model> = {
  'se-wall': stormsEndWall,
  'se-drum': stormsEndDrum,
  'sun-wall-1': (k, l) => windingWall(k, l, 0),
  'sun-wall-2': (k, l) => windingWall(k, l, 1),
  'sun-wall-3': (k, l) => windingWall(k, l, 2),
  'sun-tower': towerOfTheSun,
  'sun-spear': spearTower,
};
export const COVERS: string[] = [];
export const SIGNS: SignDef[] = [nameSign('stormlands-storms-end', lotOf('se-wall').name), nameSign('stormlands-sunspear', lotOf('sun-wall-1').name)];
export const FLOORED: string[] = [];

export function heightAt(x: number, z: number): number {
  return stormsEndHeight(x, z);
}

export function extras(k: Build): void {
  shadowCity(k);
  court(k);
  sandship(k);
  const ra = ROADS.sunspear[0], rb = ROADS.sunspear[1], rl = Math.hypot(rb[0] - ra[0], rb[1] - ra[1]), ax = (rb[0] - ra[0]) / rl, az = (rb[1] - ra[1]) / rl;
  // seven along the road from the fork, five and a half to its west, facing across it towards the view
  nameBoard(k, 'stormlands-sunspear', ra[0] + ax * 7 - az * 5.4, ra[1] + az * 7 + ax * 5.4, 0, [az, 0, -ax], 1.3);
}
