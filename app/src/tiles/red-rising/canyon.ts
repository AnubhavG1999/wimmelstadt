// The canyon and the plateau: the Valles Marineris's north wall, dressed with hangars, barracks and the drone depot; the fall; the furniture of the loop road and its ramps; the guns on the rim; the Institute's gate and its marble square; and Olympus, floating over the canyon's east end.
//
// The canyon's walls hold factories, hangars and barracks for the city's
// reserve garrisons (GS 41), and a depot from which a cloud of drones rises
// (GS 39). The wall is steep, so the city has cut it back in tiers: upright
// faces of the canyon's own banded rock, each with its row of windows, and a
// ledge on top of each, stepping back up the wall towards the rim. Along the
// foot the hangar mouths open onto the road, and great buttresses of dressed
// stone run up the wall between the bays. Everything is built in front of the
// wall's face as the ground lays it and closes against it, so that what is
// seen is the carved rock and not the ground's own facets behind it.
//
// The Institute's gate building had an open marble square before its gates,
// with pillars on either side, looking out over Agea and the canyon (RR 16,
// 18). Olympus is an artificial mountain floating two kilometres up, with a
// bone-pale marble citadel on top (RR 42). The guns on the canyon carve holes
// in the falling swarm (GS 38). Everything else here is this tile's own
// drawing: the books give no look for the hangars, the depot, the guns, the
// fall or the road.

import * as THREE from 'three';
import { Smoke } from '../../engine/effects';
import { interior, rng, type BoxOpts, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { flat } from '../../engine/ground';
import { face3, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { BED, bedColour, bedShift as wander, landAt, snowAt } from './land';
import { AMBER, BOARDS, COLD, FRAME, GOLD, MARBLE, STEEL, STONE, STONE_DARK, TO_VIEW, WARM, nameBoard, nameSign, pyramid } from './look';
import type { Model } from './models';
import { FALL, HAIRPIN_Y, HERO_SPOTS, LANDINGS, LOOP, WATER_DROP, F, type P2 } from './plan';
import { LOOP_MIDDLE } from './roads';
import { open, underBoards } from './space';

// ---------------------------------------------------------------------------
// Colours of this file's own
// ---------------------------------------------------------------------------

/** Fresh-cut rock where the city has dressed the wall: the lips of its ledges. */
const DRESSED = 0xb47c52;
/** The steps cut up the face from ledge to ledge. */
const STAIR = 0x9e6a46, STAIR_TOP = 0xb98258;
/** A crane's steel, painted. */
const CRANE = 0xd9b44a;
/** The buttresses' dressed sandstone. */
const BUTTRESS = 0xaa7f5c, BUTTRESS_TOP = 0xc29a72;
/** The dust and paving of the ledges. */
const LEDGE = 0xa9744d;
/** The garrison's concrete and durosteel. */
const CONCRETE = 0xaba497, CONCRETE_DARK = 0x7a746c, CONCRETE_LIGHT = 0xc4beb2;
const DURO = 0x6f7780, DURO_DARK = 0x464c53, DURO_LIGHT = 0xa9b2bb;
/** The inside of a hangar: dark and warm by day, lit by night. */
const HANGAR_IN = 0x3e2b1c;
/** The road's masonry: its retaining walls and parapets. */
const MASONRY = 0xa6825f, PARAPET = 0xc4a17b, COPING = 0xd9bf9b;
/** Wet rock under the fall, and the water. */
const WET = 0x5c3527, WET_DARK = 0x45281d, WATER = 0xf2fafc, WATER_BLUE = 0xa9d7e6, FOAM = 0xffffff, RUN = 0x86c3d2;
/** Cloud, round Olympus. */
const CLOUD = 0xf6f8fa, CLOUD_LOW = 0xdfe6ec;
/** Stacks and pipes. */
const STACK = 0x5a5e63, STACK_BAND = 0x8d9298, STACK_TOP = 0x1e1f22, PIPE = 0x9aa1a8;
/** Bone-pale marble: Olympus's citadel. */
const BONE = 0xeee6d2, BONE_SHADE = 0xd8cdb4, BONE_ROOF = 0xc9bea3;
/** The guns. */
const GUNMETAL = 0x5f666e, GUN_DARK = 0x3a3f45, BARREL = 0x7d858e, OLIVE_CRATE = 0x5f6148;
/** The plateau's rocks. */
const ROCKS = [0x8a5a3e, 0x7a4c34, 0x9b6a48, 0x6f6358, 0x8c7f70];

/** Barracks windows: slits cut in the rock, dark by day and lit by night, one row to a tier. */
const BARRACKS_WIN: WinSpec = { cell: 2.0, storey: 4, lit: 1.3, kind: 7 };
/** A factory's glazing: tall slits from floor to floor. */
const FACTORY_WIN: WinSpec = { cell: 1.15, storey: 4, lit: 1.2, kind: 6 };
/** The Institute's windows and Olympus's. */
const INSTITUTE_WIN: WinSpec = { cell: 2.1, storey: 4, lit: 0.75, kind: 6 };
const OLYMPUS_WIN: WinSpec = { cell: 1.2, storey: 2, lit: 0.95, kind: 6 };

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
/** Points from 0 to `L`, about `step` apart, both ends among them. */
function along(L: number, step: number): number[] {
  const n = Math.max(1, Math.ceil(L / step));
  return Array.from({ length: n + 1 }, (_, i) => (L * i) / n);
}


/**
 * An upright wall from (ax, az) to (bx, bz), between y0 and y1, facing `n`,
 * in the canyon's beds of rock just as the ground has them, so that a face
 * the city has cut reads as the same rock. `u0` and `L` place it along a
 * longer wall, so that rows of windows run on across its pieces.
 */
function rockWall(b: GeoBuilder, ax: number, az: number, bx: number, bz: number, y0: number, y1: number, n: V3, o: { win?: WinSpec; seed?: number; u0?: number; L?: number; tone?: number } = {}): void {
  const len = Math.hypot(bx - ax, bz - az);
  if (len < 1e-3 || y1 - y0 < 1e-3) return;
  let u0 = o.u0 ?? 0;
  const L = o.L ?? len;
  // corners in the order that faces `n`, so that a band that thins to nothing at one end is still turned the right way
  if (-(bz - az) * n[0] + (bx - ax) * n[2] < 0) {
    [ax, az, bx, bz] = [bx, bz, ax, az];
    u0 = L - u0 - len;
  }
  const segs = Math.max(1, Math.ceil(len / 3.5));
  for (let s = 0; s < segs; s++) {
    const t0 = s / segs, t1 = (s + 1) / segs;
    const x0 = mix(ax, bx, t0), z0 = mix(az, bz, t0), x1 = mix(ax, bx, t1), z1 = mix(az, bz, t1);
    const o0 = wander(x0, z0), o1 = wander(x1, z1);
    const k0 = Math.floor((y0 + Math.min(o0, o1)) / BED), k1 = Math.floor((y1 + Math.max(o0, o1)) / BED);
    for (let kk = k0; kk <= k1; kk++) {
      const a0 = clamp(BED * kk - o0, y0, y1), a1 = clamp(BED * (kk + 1) - o0, y0, y1);
      const c0 = clamp(BED * kk - o1, y0, y1), c1 = clamp(BED * (kk + 1) - o1, y0, y1);
      if (a1 - a0 < 0.004 && c1 - c0 < 0.004) continue;
      const colour = o.tone ? tint(bedColour(kk), o.tone) : bedColour(kk);
      b.quad([x0, a0, z0], [x1, c0, z1], [x1, c1, z1], [x0, a1, z0], n, colour, { win: o.win, seed: o.seed, L, u0: u0 + t0 * len, u1: u0 + t1 * len });
    }
  }
}

/** A colour a little lighter or darker. */
function tint(c: number, f: number): number {
  const ch = (s: number): number => Math.max(0, Math.min(255, Math.round(((c >> s) & 255) * f)));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** How far north of `z0` the ground at `x` first reaches height `y`. */
function zReach(x: number, z0: number, y: number, far = 20): number {
  for (let z = z0; z >= z0 - far; z -= 0.05) if (landAt(x, z) >= y) return z;
  return z0 - far;
}

// ---------------------------------------------------------------------------
// A line along the foot of the wall, and what is square to it
// ---------------------------------------------------------------------------

/** A front line on the ground: it runs along `u` from (ax, az) for `L`; `n` is level and points out, away from the wall; `d` is measured back into the wall. */
interface Frame { ax: number; az: number; ux: number; uz: number; nx: number; nz: number; L: number; yaw: number }

function frameBetween(ax: number, az: number, bx: number, bz: number): Frame {
  const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
  // out of the north wall is to the south
  let nx = -uz, nz = ux;
  if (nz < 0) { nx = -nx; nz = -nz; }
  return { ax, az, ux, uz, nx, nz, L, yaw: Math.atan2(uz, ux) };
}
const at = (f: Frame, s: number, d: number): P2 => [f.ax + f.ux * s - f.nx * d, f.az + f.uz * s - f.nz * d];
const at3 = (f: Frame, s: number, d: number, y: number): V3 => {
  const [x, z] = at(f, s, d);
  return [x, y, z];
};
/** How far back from the front line, at `s` along it, the wall's face first reaches height `y`. */
function reach(f: Frame, s: number, y: number, far = 16): number {
  for (let d = 0; d <= far; d += 0.05) if (landAt(...at(f, s, d)) >= y) return d;
  return far;
}
/** A box square to a frame: from s0 to s1 along it, d0 to d1 back from its front line, y0 to y1. */
function fbox(b: GeoBuilder, f: Frame, s0: number, s1: number, d0: number, d1: number, y0: number, y1: number, color: number, o: BoxOpts = {}): void {
  const [cx, cz] = at(f, (s0 + s1) / 2, (d0 + d1) / 2);
  b.obox(cx, (y0 + y1) / 2, cz, (s1 - s0) / 2, (y1 - y0) / 2, (d1 - d0) / 2, f.yaw, color, o);
}
/** A flat panel in a frame, upright at `d`, facing out. */
function panel(b: GeoBuilder, f: Frame, s0: number, s1: number, d: number, y0: number, y1: number, color: number, o: { win?: WinSpec } = {}): void {
  b.quad(at3(f, s0, d, y0), at3(f, s1, d, y0), at3(f, s1, d, y1), at3(f, s0, d, y1), [f.nx, 0, f.nz], color, o);
}

// ---------------------------------------------------------------------------
// The ramps, as the roads file lays them
// ---------------------------------------------------------------------------

type Side = -1 | 1;

/** One ramp of the loop, from the apron's middle outwards to its hairpin, as points in space. */
function rampOf(side: Side): V3[] {
  const hp = side < 0 ? LOOP.hairpinW : LOOP.hairpinE, mid = (LOOP.apron.x0 + LOOP.apron.x1) / 2;
  const pts = LOOP_MIDDLE.filter((p) => side * (p[0] - mid) >= -0.01 && side * (p[0] - hp[0]) <= 0.01 && p[2] >= hp[1] + LOOP.r - 0.6)
    .map((p): V3 => [p[0], p[1], p[2]])
    .sort((a, c) => side * (a[0] - c[0]));
  return pts.filter((p, i) => i === 0 || Math.abs(p[0] - pts[i - 1][0]) > 0.05);
}
const RAMP: Record<Side, V3[]> = { [-1]: rampOf(-1), [1]: rampOf(1) } as Record<Side, V3[]>;

/** Where a ramp's middle is at `x`, how high, and which way it runs outwards. */
function onRamp(side: Side, x: number): { x: number; y: number; z: number; tx: number; tz: number } {
  const pts = RAMP[side];
  let i = 0;
  while (i + 2 < pts.length && side * (pts[i + 1][0] - x) < 0) i++;
  const a = pts[i], c = pts[i + 1], t = clamp((x - a[0]) / (c[0] - a[0] || 1e-6), 0, 1);
  const tx = c[0] - a[0], tz = c[2] - a[2], tl = Math.hypot(tx, tz) || 1;
  return { x: mix(a[0], c[0], t), y: mix(a[1], c[1], t), z: mix(a[2], c[2], t), tx: tx / tl, tz: tz / tl };
}

/** How far from a ramp's middle the carved wall begins: clear of its lanes, its verge and its lamps. */
const FOOT = 7.0;
/** The foot of the canyon's wall beside a ramp, at the ramp's `x`. */
function footAt(side: Side, x: number, off = FOOT): P2 {
  const r = onRamp(side, x);
  let nx = r.tz, nz = -r.tx;
  if (nz > 0) { nx = -nx; nz = -nz; }
  return [r.x + nx * off, r.z + nz * off];
}

// ---------------------------------------------------------------------------
// Smoke from the stacks
// ---------------------------------------------------------------------------

interface Puffer { x: number; y: number; z: number; every: number; size: number; shade: number; spread: number }

function puffing(k: Build, puffers: Puffer[]): void {
  if (puffers.length === 0) return;
  const smoke = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 140);
  k.group.add(smoke.mesh);
  const r = rng(52817), from = new THREE.Vector3(), drift = new THREE.Vector3(0.5, 0.35, 0.25), due = puffers.map(() => r() * 0.6);
  k.each((dt) => {
    puffers.forEach((p, i) => {
      due[i] -= dt;
      if (due[i] > 0) return;
      due[i] = p.every * (0.75 + r() * 0.5);
      smoke.puff(from.set(p.x + (r() - 0.5) * p.spread, p.y, p.z + (r() - 0.5) * p.spread), drift, p.size * (0.85 + r() * 0.3), p.shade * (0.95 + r() * 0.05));
    });
    smoke.update(dt);
  });
}

// ---------------------------------------------------------------------------
// The canyon's wall, dressed
// ---------------------------------------------------------------------------

type BayKind = 'barracks' | 'hangar' | 'factory';
/**
 * A stretch of the wall the city has cut back: from x0 to x1 along a ramp
 * (the end nearer the apron first), the tops of its tiers, what it holds,
 * and for a hangar the size of its door.
 */
interface Bay { side: Side; x0: number; x1: number; tiers: number[]; kind: BayKind; door?: [number, number]; seed: number; board?: boolean }

const BAYS: Bay[] = [
  { side: -1, x0: -17.2, x1: -27, tiers: [24, 28, 32, 36], kind: 'barracks', seed: 0.11 },
  { side: -1, x0: -29, x1: -38.4, tiers: [28, 32], kind: 'hangar', door: [6.2, 4.4], seed: 0.23 },
  { side: -1, x0: -40.2, x1: -47.6, tiers: [28, 32], kind: 'factory', seed: 0.37 },
  { side: -1, x0: -49.4, x1: -55, tiers: [30], kind: 'hangar', door: [4.6, 3.4], seed: 0.41 },
  { side: 1, x0: 18.2, x1: 27.6, tiers: [24, 28, 32, 36], kind: 'barracks', seed: 0.53, board: true },
  { side: 1, x0: 29.6, x1: 38.8, tiers: [28, 32], kind: 'hangar', door: [6.2, 4.4], seed: 0.67 },
  { side: 1, x0: 40.6, x1: 47.8, tiers: [28, 32], kind: 'factory', seed: 0.71 },
  { side: 1, x0: 49.6, x1: 55.2, tiers: [30], kind: 'hangar', door: [4.6, 3.4], seed: 0.83 },
];

/** The buttresses that run up the wall between the bays, at the ramp's x. */
const BUTTRESSES: { side: Side; x: number }[] = [
  { side: -1, x: -15.3 }, { side: -1, x: -28 }, { side: -1, x: -39.3 }, { side: -1, x: -48.5 }, { side: -1, x: -56.1 },
  { side: 1, x: 5.4 }, { side: 1, x: 16.9 }, { side: 1, x: 28.6 }, { side: 1, x: 39.7 }, { side: 1, x: 48.7 }, { side: 1, x: 56.3 },
];

function dressBay(k: Build, bay: Bay, puffers: Puffer[]): void {
  const b = k.b, r = rng(Math.round(bay.seed * 10007));
  const [ax, az] = footAt(bay.side, bay.x0), [bx, bz] = footAt(bay.side, bay.x1);
  const f = frameBetween(ax, az, bx, bz);
  const S = along(f.L, 0.5);
  const base = Math.min(...S.map((s) => landAt(...at(f, s, 0)))) - 0.4;
  const lv = [base, ...bay.tiers], T = bay.tiers.length;
  // each tier's front stands where the wall's face is still below its foot, all along the bay
  const dd = [0];
  for (let i = 1; i < T; i++) dd.push(Math.max(dd[i - 1] + 0.5, Math.min(...S.map((s) => reach(f, s, lv[i]))) - 0.06));
  dd.push(Math.max(dd[T - 1] + 0.6, Math.max(...S.map((s) => reach(f, s, lv[T] + 0.3))) + 0.4));
  const out: V3 = [f.nx, 0, f.nz];
  const win = bay.kind === 'factory' ? FACTORY_WIN : BARRACKS_WIN;

  // a hangar's door, where no lamp stands before it
  let sc = f.L / 2;
  if (bay.door) {
    const W = bay.door[0];
    const blocked = (s: number): boolean => (k.lamps ?? []).some((p) => {
      const ex = p.x - f.ax, ez = p.z - f.az, ps = ex * f.ux + ez * f.uz, pd = -(ex * f.nx + ez * f.nz);
      return pd > -2.5 && pd < 1 && Math.abs(ps - s) < W / 2 + 1.3;
    });
    for (const shift of [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4]) {
      const s = f.L / 2 + shift;
      if (s - W / 2 > 1.1 && s + W / 2 < f.L - 1.1 && !blocked(s)) { sc = s; break; }
    }
  }

  for (let i = 0; i < T; i++) {
    const y0 = lv[i], y1 = lv[i + 1];
    const [x0, z0] = at(f, 0, dd[i]), [x1, z1] = at(f, f.L, dd[i]);
    const seed = bay.seed + i * 0.173;
    if (i === 0 && bay.door) {
      const [W, H] = bay.door, sa = sc - W / 2, sb = sc + W / 2;
      const m = hangarMouth(k, f, sa, sb, H, y1);
      const [pa, qa] = at(f, sa, 0), [pb, qb] = at(f, sb, 0);
      rockWall(b, x0, z0, pa, qa, y0, y1, out, { win, seed, u0: 0, L: f.L });
      rockWall(b, pb, qb, x1, z1, y0, y1, out, { win, seed, u0: sb, L: f.L });
      rockWall(b, pa, qa, pb, qb, m.top, y1, out, { seed, u0: sa, L: f.L });
    } else {
      rockWall(b, x0, z0, x1, z1, y0, y1, out, { win, seed });
    }
    // its ledge, and the dressed lip along the ledge's front
    b.quad(at3(f, 0, dd[i], y1), at3(f, f.L, dd[i], y1), at3(f, f.L, dd[i + 1], y1), at3(f, 0, dd[i + 1], y1), [0, 1, 0], LEDGE);
    fbox(b, f, -0.12, f.L + 0.12, dd[i] - 0.16, dd[i] + 0.22, y1 - 0.26, y1 + 0.1, DRESSED, { faces: 'B' });
    // its ends, back into the rock
    for (const [s, sgn] of [[0, -1], [f.L, 1]] as const) {
      const dEnd = Math.max(dd[i] + 0.3, reach(f, s, y1 + 0.2) + 0.35);
      const [px, pz] = at(f, s, dd[i]), [qx, qz] = at(f, s, dEnd);
      rockWall(b, px, pz, qx, qz, i === 0 ? base : y0, y1, [f.ux * sgn, 0, f.uz * sgn]);
    }
    // grilles over the vents of the halls behind
    if (i > 0 && bay.kind !== 'hangar') {
      for (const s of [f.L * 0.27, f.L * 0.73]) grille(b, f, s + (r() - 0.5) * 0.8, dd[i] - 0.05, y0 + 2.75, 1.1, 0.75);
    }
  }

  const tops = (i: number): { y: number; d: number; deep: number } => {
    const y = lv[i + 1], d = dd[i], deep = (i + 1 < T ? dd[i + 1] : Math.min(...S.map((s) => reach(f, s, y)))) - d;
    return { y, d, deep };
  };

  if (bay.kind === 'factory') {
    // two stacks on the first ledge, set against the tier behind, and pipes down the wall to them
    const t = tops(0), rim = Math.min(...S.map((s) => landAt(...at(f, s, 14))));
    for (const sf of [0.3, 0.7]) {
      const s = f.L * sf, [x, z] = at(f, s, t.d + t.deep - 0.45);
      stack(k, x, z, t.y, Math.min(rim - 0.6, t.y + 9.5 + (sf > 0.5 ? -1.4 : 0)), 0.85, puffers);
    }
    const top = tops(T - 1);
    for (const sf of [0.12, 0.5, 0.88]) {
      const s = f.L * sf, dz = top.d + Math.max(0.35, top.deep - 0.45);
      const y1 = rim - 0.9, back = reach(f, s, y1) + 0.6;
      b.sweep([at3(f, s, dz, top.y - 0.1), at3(f, s, dz, y1), at3(f, s, back, y1)], [0.26, 0.26, 0.26], PIPE);
      fbox(b, f, s - 0.32, s + 0.32, dz - 0.32, dz + 0.32, top.y, top.y + 0.35, STACK_BAND);
    }
  }

  // guards on the top ledge, and a light along the bay by night
  const t = tops(T - 1);
  if (t.deep > 0.9) {
    for (const sf of bay.board ? [0.04, 0.96] : [0.2, 0.8]) {
      const [px, pz] = at(f, f.L * sf + (bay.board ? 0 : r() - 0.5), t.d + Math.min(0.75, t.deep / 2));
      k.person(px, pz, t.y);
    }
  }
  // the garrison about its ledges
  for (let i = 0; i + 1 < T; i++) {
    if (dd[i + 1] - dd[i] < 1.2) continue;
    const sp = f.L * (0.35 + 0.3 * r()), [px, pz] = at(f, sp, dd[i] + 0.45);
    k.person(px, pz, lv[i + 1]);
  }
  const [lx, lz] = at(f, f.L / 2, 1.5);
  k.lights.push({ x: lx, z: lz, r: 9, color: bay.kind === 'barracks' ? WARM : AMBER, k: 0.45 });
  for (let i = 1; i < T; i++) {
    for (const sf of [0.25, 0.75]) {
      const [gx, gz] = at(f, f.L * sf, dd[i] - 0.25);
      k.glows.push({ x: gx, y: lv[i] + 0.3, z: gz, sx: 0.22, sy: 0.16, sz: 0.22, color: '#ffc98a' });
    }
  }
  // flights of steps up the face from ledge to ledge, turning at each, and a doorway at the head of each flight
  if (bay.kind !== 'factory') {
    for (let i = 0; i + 1 < T; i++) {
      const deep = dd[i + 1] - dd[i];
      if (deep < 1.0) continue;
      const rise = lv[i + 2] - lv[i + 1], steps = Math.max(4, Math.round(rise / 0.5)), run = Math.min(f.L * 0.42, steps * 0.62), wide = Math.min(0.85, deep - 0.25);
      const fwd = i % 2 === 0, sFoot = fwd ? 0.9 : f.L - 0.9;
      for (let j = 0; j < steps; j++) {
        const sa = sFoot + (fwd ? 1 : -1) * (run * j) / steps, sb = sFoot + (fwd ? 1 : -1) * (run * (j + 1)) / steps;
        fbox(b, f, Math.min(sa, sb), Math.max(sa, sb), dd[i + 1] - wide, dd[i + 1] - 0.01, lv[i + 1] - 0.1, lv[i + 1] + (rise * (j + 1)) / steps - (j + 1 === steps ? 0.04 : 0), STAIR, { top: STAIR_TOP });
      }
      const sHead = sFoot + (fwd ? 1 : -1) * (run + 0.7);
      if (i + 2 <= T && sHead > 0.6 && sHead < f.L - 0.6) {
        const [gx, gz] = at(f, sHead, dd[i + 1] - 0.3);
        k.glows.push({ x: gx, y: lv[i + 1] + 2.45, z: gz, sx: 0.2, sy: 0.2, sz: 0.2, color: '#ffd9a0' });
        panel(b, f, sHead - 0.45, sHead + 0.45, dd[i + 1] - 0.04, lv[i + 1], lv[i + 1] + 1.9, HANGAR_IN, { win: interior(2.6) });
        fbox(b, f, sHead - 0.62, sHead + 0.62, dd[i + 1] - 0.2, dd[i + 1] + 0.05, lv[i + 1] + 1.9, lv[i + 1] + 2.2, DRESSED, { faces: 'B' });
      }
    }
  }
  // a mast on the top ledge, its lamp red
  if (!bay.board) {
    const [mx, mz] = at(f, f.L * 0.62, t.d + Math.max(0.3, Math.min(0.9, t.deep - 0.4)));
    b.beam([mx, t.y, mz], [mx, t.y + 3.4, mz], 0.08, 0.05, 0xb9c0c8);
    b.beam([mx - 0.5, t.y + 2.6, mz], [mx + 0.5, t.y + 2.6, mz], 0.05, 0.05, 0xb9c0c8);
    k.glows.push({ x: mx, y: t.y + 3.5, z: mz, sx: 0.22, sy: 0.22, sz: 0.22, color: '#ff3b3b' });
  }
  // a balcony on the barracks' highest tier, lit within, and steam from its vents
  if (bay.kind === 'barracks' && T >= 2 && dd[T - 1] - dd[T - 2] > 1.1) {
    const y = lv[T - 1] + 1.6, d = dd[T - 1], sa = f.L * 0.52, sb = f.L * 0.84;
    fbox(b, f, sa, sb, d - 0.8, d + 0.05, y - 0.16, y, DRESSED, { faces: 'B', top: LEDGE });
    fbox(b, f, sa, sb, d - 0.8, d - 0.66, y, y + 0.62, DRESSED);
    for (const sx of [sa + 0.07, sb - 0.07]) fbox(b, f, sx - 0.07, sx + 0.07, d - 0.66, d - 0.05, y, y + 0.62, DRESSED);
    panel(b, f, sa + 0.4, sb - 0.4, d - 0.03, y, y + 1.6, HANGAR_IN, { win: interior(2.8) });
    const [px, pz] = at(f, (sa + sb) / 2, d - 0.35);
    k.person(px, pz, y);
    for (const sf of [0.2, 0.7]) {
      const [vx, vz] = at(f, f.L * sf, dd[T - 1] + 0.4);
      puffers.push({ x: vx, y: lv[T] + 0.3, z: vz, every: 0.7, size: 0.75, shade: 1.0, spread: 0.3 });
    }
  }
  // a crane on a factory's highest ledge, its jib out over the road
  if (bay.kind === 'factory' && t.deep > 0.6) {
    const sCr = f.L * 0.32, dCr = t.d + Math.min(0.55, t.deep / 2), [cx, cz] = at(f, sCr, dCr), y = t.y;
    const [fx2, fz2] = at(f, sCr, dCr - 3.2), [bx2, bz2] = at(f, sCr, dCr + 0.9);
    for (const off of [-0.45, 0.45]) {
      const [lx2, lz2] = at(f, sCr + off, dCr + 0.3);
      b.beam([lx2, y, lz2], [cx, y + 3.0, cz], 0.09, 0.07, CRANE);
    }
    b.beam([cx, y, cz], [cx, y + 3.0, cz], 0.1, 0.08, CRANE);
    b.beam([bx2, y + 2.8, bz2], [fx2, y + 3.6, fz2], 0.1, 0.07, CRANE);
    b.box(bx2 - 0.3, y + 2.4, bz2 - 0.3, bx2 + 0.3, y + 3.0, bz2 + 0.3, GUN_DARK);
    b.beam([fx2, y + 3.55, fz2], [fx2, y + 1.6, fz2], 0.03, 0.03, 0xd8dde2);
    b.box(fx2 - 0.35, y + 1.05, fz2 - 0.3, fx2 + 0.35, y + 1.6, fz2 + 0.3, OLIVE_CRATE, { faces: 'NESWTB' });
    k.glows.push({ x: fx2, y: y + 3.75, z: fz2, sx: 0.2, sy: 0.2, sz: 0.2, color: '#ff3b3b' });
  }
  // crates by a hangar's door
  if (bay.door) {
    for (const [ds, dd2, hh] of [[-1.15, -0.55, 0.8], [-1.95, -0.6, 0.65], [-1.5, -0.62, 1.4]]) {
      const s0 = sc - bay.door[0] / 2 + ds, [cx2, cz2] = at(f, s0, dd2), gy = landAt(cx2, cz2);
      if ((k.lamps ?? []).some((q) => Math.hypot(q.x - cx2, q.z - cz2) < 0.8)) continue;
      fbox(b, f, s0 - 0.38, s0 + 0.38, dd2 - 0.35, dd2 + 0.35, gy - 0.15, gy + (hh > 1 ? 0.62 : hh), OLIVE_CRATE, { top: 0x7d7f62 });
    }
  }
  if (bay.board) {
    const [nx, nz] = at(f, f.L / 2, t.d + Math.min(1.1, t.deep * 0.55));
    nameBoard(k, 'canyon-valles-marineris', nx, nz, t.y - 1.1, out, 0.74);
  }
}

/** A hangar's mouth in the face of a bay's lowest tier: a portal of concrete, the floor, the cheeks and the ceiling inside it, and the doors slid apart on the lit hangar. */
function hangarMouth(k: Build, f: Frame, sa: number, sb: number, H: number, tierTop: number): { top: number } {
  const b = k.b, sc = (sa + sb) / 2, W = sb - sa;
  // the sill is level, at the highest of the ground before it and in it; a step before it comes down to the ground
  let hi = -Infinity, lo = Infinity;
  for (let s = sa - 0.6; s <= sb + 0.6; s += 0.4) {
    for (const d of [-1.1, -0.5, 0, 0.4]) {
      const g = landAt(...at(f, s, d));
      hi = Math.max(hi, g);
      lo = Math.min(lo, g);
    }
  }
  const sill = hi + 0.06;
  const top = Math.min(sill + H, tierTop - 0.8);
  // how far in it can be seen before the wall's own rock rises into it
  let deep = 2;
  for (let s = sa; s <= sb; s += 0.4) deep = Math.min(deep, reach(f, s, sill + 0.03) - 0.15);
  deep = clamp(deep, 0.3, 1.6);
  fbox(b, f, sa - 0.55, sb + 0.55, -1.15, 0.02, lo - 0.3, sill, CONCRETE_DARK);
  // the portal
  fbox(b, f, sa - 0.75, sa, -0.45, 0.05, sill - 0.05, top, CONCRETE);
  fbox(b, f, sb, sb + 0.75, -0.45, 0.05, sill - 0.05, top, CONCRETE);
  fbox(b, f, sa - 0.95, sb + 0.95, -0.55, 0.05, top, Math.min(tierTop - 0.05, top + 0.75), CONCRETE_LIGHT, { faces: 'B' });
  // hazard stripes along the lintel, and down the jambs
  for (let i = 0; i < 6; i++) {
    const s0 = mix(sa - 0.7, sb + 0.7, i / 6), s1 = s0 + (sb - sa + 1.4) / 12;
    panel(b, f, s0, s1, -0.57, top + 0.12, top + 0.6, 0xd8a034);
  }
  for (const s of [sa - 0.375, sb + 0.375]) panel(b, f, s - 0.2, s + 0.2, -0.47, sill + 0.4, sill + 1.2, 0xd8a034);
  // inside
  b.quad(at3(f, sa, 0.02, sill), at3(f, sb, 0.02, sill), at3(f, sb, deep, sill), at3(f, sa, deep, sill), [0, 1, 0], CONCRETE_DARK);
  b.quad(at3(f, sa, 0.05, top), at3(f, sb, 0.05, top), at3(f, sb, deep, top), at3(f, sa, deep, top), [0, -1, 0], DURO_DARK);
  b.quad(at3(f, sa, 0.05, sill), at3(f, sa, deep, sill), at3(f, sa, deep, top), at3(f, sa, 0.05, top), [f.ux, 0, f.uz], CONCRETE_DARK);
  b.quad(at3(f, sb, 0.05, sill), at3(f, sb, deep, sill), at3(f, sb, deep, top), at3(f, sb, 0.05, top), [-f.ux, 0, -f.uz], CONCRETE_DARK);
  // the lit hangar between the leaves, and the leaves
  const gap = Math.min(1.7, W * 0.3);
  panel(b, f, sc - gap / 2 - 0.15, sc + gap / 2 + 0.15, deep, sill, top, HANGAR_IN, { win: interior(3.2) });
  for (const [s0, s1] of [[sa, sc - gap / 2], [sc + gap / 2, sb]]) {
    panel(b, f, s0, s1, deep - 0.04, sill, top - 0.04, DURO);
    for (const h of [0.28, 0.56, 0.84]) panel(b, f, s0 + 0.12, s1 - 0.12, deep - 0.07, mix(sill, top, h) - 0.07, mix(sill, top, h) + 0.07, DURO_LIGHT);
  }
  // lamps over it, and its light on the road
  for (const s of [sa - 0.4, sb + 0.4]) {
    const [gx, gz] = at(f, s, -0.62);
    k.glows.push({ x: gx, y: top + 0.38, z: gz, sx: 0.3, sy: 0.2, sz: 0.3, color: '#ffd9a0' });
  }
  const [lx, lz] = at(f, sc, -3.2);
  k.lights.push({ x: lx, z: lz, r: 9, color: AMBER, k: 0.6 });
  // a crewman at the door
  const [px, pz] = at(f, sb + 1.4, -0.4);
  k.person(px, pz, landAt(px, pz));
  return { top };
}

/** A grille over a vent, upright in a frame. */
function grille(b: GeoBuilder, f: Frame, s: number, d: number, y: number, w: number, h: number): void {
  panel(b, f, s - w / 2, s + w / 2, d, y, y + h, DURO_DARK);
  for (let j = 1; j <= 3; j++) {
    const yy = y + (h * j) / 4;
    panel(b, f, s - w / 2 + 0.08, s + w / 2 - 0.08, d - 0.03, yy - 0.05, yy + 0.05, DURO_LIGHT);
  }
}

/** A factory's stack, with bands round it, a dark mouth, a red lamp on top, and smoke. */
function stack(k: Build, x: number, z: number, y0: number, y1: number, r: number, puffers: Puffer[]): void {
  const b = k.b, rt = r * 0.86;
  b.cyl(x, z, y0 - 0.2, y1 - 0.4, r, mix(r, rt, 0.96), 10, STACK, { cap: false });
  for (const t of [0.3, 0.64]) {
    const y = mix(y0, y1, t), rr = mix(r, rt, t) + 0.1;
    b.cyl(x, z, y, y + 0.35, rr, rr, 10, STACK_BAND, { cap: false });
  }
  b.cyl(x, z, y1 - 0.5, y1 + 0.1, rt + 0.12, rt + 0.12, 10, STACK_BAND, { cap: STACK_TOP });
  k.glows.push({ x, y: y1 + 0.32, z, sx: 0.32, sy: 0.22, sz: 0.32, color: '#ff4040' });
  puffers.push({ x, y: y1 + 0.35, z, every: 0.3, size: 1.25, shade: 0.8, spread: rt * 0.8 });
}

/**
 * A buttress of dressed stone up the wall between two bays, from its foot to
 * just under the rim: in steps that each stand a little proud of the wall
 * where they begin, so that it hugs the wall as the wall leans back.
 */
function buttress(k: Build, side: Side, x: number): void {
  const b = k.b;
  const [ax, az] = footAt(side, x - side * 0.8), [bx, bz] = footAt(side, x + side * 0.8);
  const f = frameBetween(ax, az, bx, bz), mid = f.L / 2, w = 1.1;
  const S = [mid - w, mid, mid + w];
  const g = Math.min(...S.map((s) => landAt(...at(f, s, -0.55)))) - 0.4;
  const rim = landAt(...at(f, mid, 14)), top = rim - 0.8;
  let y0 = g, d0 = -0.55, last = 0;
  for (let n = 0; n < 16 && y0 < top - 0.1; n++) {
    const y1 = Math.min(top, n === 0 ? g + 2.6 : y0 + 2.2);
    if (n > 0) d0 = Math.max(d0, Math.min(...S.map((s) => reach(f, s, y0 + 0.3))) - 0.5);
    last = Math.max(d0 + 0.6, Math.max(...S.map((s) => reach(f, s, y1 + 0.3))) + 0.4);
    fbox(b, f, mid - w, mid + w, d0, last, y0, y1, BUTTRESS, { top: BUTTRESS_TOP });
    y0 = y1;
  }
  fbox(b, f, mid - w - 0.12, mid + w + 0.12, d0 - 0.12, last, top, top + 0.28, BUTTRESS_TOP);
  // a searchlight on its head, looking out over the city
  const [hx, hz] = at(f, mid, d0 + 0.45);
  b.cyl(hx, hz, top + 0.28, top + 0.62, 0.22, 0.22, 6, GUN_DARK, { cap: false });
  b.obox(hx, top + 0.92, hz, 0.36, 0.3, 0.36, f.yaw, GUNMETAL, { top: GUN_DARK });
  const [lx2, lz2] = at(f, mid, d0 + 0.02);
  k.glows.push({ x: lx2, y: top + 0.92, z: lz2, sx: 0.42, sy: 0.4, sz: 0.42, color: '#f4f8ff' });
  // a lamp on its face, over the road
  const [lx, lz] = at(f, mid, -0.62);
  k.glows.push({ x: lx, y: g + 4.2, z: lz, sx: 0.3, sy: 0.3, sz: 0.3, color: '#ffcf8a' });
}

const canyonWall: Model = (k) => {
  const puffers: Puffer[] = [];
  for (const bay of BAYS) dressBay(k, bay, puffers);
  for (const t of BUTTRESSES) buttress(k, t.side, t.x);
  puffing(k, puffers);
};

// ---------------------------------------------------------------------------
// The drone depot
// ---------------------------------------------------------------------------

/** The mouth of the drone depot in the canyon's wall, from which the fleet's file sends its drones up. The builder sets it from the depot it builds. */
export const DEPOT_MOUTH: [number, number, number] = [-4, 24.1, -65.2];

const depot: Model = (k, l) => {
  const b = k.b;
  const front = l.z1, xm = (l.x0 + l.x1) / 2, top = l.top;
  let sill = -Infinity;
  for (const x of [l.x0, (l.x0 + xm) / 2, xm, (xm + l.x1) / 2, l.x1]) for (const z of [front + 1.4, front + 0.6, front, front - 0.35]) sill = Math.max(sill, landAt(x, z));
  sill += 0.06;
  let back = front;
  for (let x = l.x0; x <= l.x1; x += 1) back = Math.min(back, zReach(x, front, top + 0.2) - 0.5);
  const low = Math.min(landAt(l.x0, front + 1.4), landAt(xm, front + 1.4), landAt(l.x1, front + 1.4)) - 0.3;
  // the dock before the doors, out over the foot of the wall
  b.box(l.x0 - 0.2, low, front - 0.35, l.x1 + 0.2, sill, front + 1.4, CONCRETE_DARK, { top: CONCRETE });
  // its block, cut into the rock: the rock's own beds on its cheeks, and a roof of launch hatches
  const roof = top - 0.08;
  rockWall(b, l.x0, front, l.x0, back, low, roof, [-1, 0, 0]);
  rockWall(b, l.x1, front, l.x1, back, low, roof, [1, 0, 0]);
  b.quad([l.x0, roof, front], [l.x1, roof, front], [l.x1, roof, back], [l.x0, roof, back], [0, 1, 0], CONCRETE_DARK);
  // the two pylons that frame the doors
  const pw = 2.6;
  for (const [x0, x1] of [[l.x0 - 0.1, l.x0 + pw], [l.x1 - pw, l.x1 + 0.1]]) {
    b.box(x0, sill - 0.05, front, x1, top - 0.32, front + 1.0, CONCRETE, { faces: 'ESWT' });
    b.box(x0 - 0.1, top - 0.32, front - 0.05, x1 + 0.1, top, front + 1.12, CONCRETE_LIGHT);
    // grooves down their faces, and a slot of lit windows high up
    for (const gx of [x0 + 0.65, x1 - 0.65]) b.quad([gx - 0.09, sill + 0.5, front + 1.03], [gx + 0.09, sill + 0.5, front + 1.03], [gx + 0.09, top - 0.8, front + 1.03], [gx - 0.09, top - 0.8, front + 1.03], [0, 0, 1], CONCRETE_DARK);
    b.quad([x0 + 0.9, top - 2.3, front + 1.03], [x1 - 0.9, top - 2.3, front + 1.03], [x1 - 0.9, top - 1.1, front + 1.03], [x0 + 0.9, top - 1.1, front + 1.03], [0, 0, 1], HANGAR_IN, { win: interior(2.6) });
    k.glows.push({ x: (x0 + x1) / 2, y: top + 0.25, z: front + 0.9, sx: 0.5, sy: 0.25, sz: 0.3, color: '#ffe2ae' });
  }
  // the great doors, slid apart, and the lit bay between them
  const dx0 = l.x0 + pw, dx1 = l.x1 - pw, doorTop = Math.min(sill + 5.0, top - 1.6), gap = 1.7;
  b.quad([xm - gap / 2 - 0.2, sill, front - 0.3], [xm + gap / 2 + 0.2, sill, front - 0.3], [xm + gap / 2 + 0.2, doorTop, front - 0.3], [xm - gap / 2 - 0.2, doorTop, front - 0.3], [0, 0, 1], HANGAR_IN, { win: interior(3.4) });
  for (const [x0, x1] of [[dx0 + 0.45, xm - gap / 2], [xm + gap / 2, dx1 - 0.45]]) {
    b.box(x0, sill, front - 0.28, x1, doorTop - 0.02, front, DURO, { faces: 'NESW' });
    for (const h of [0.2, 0.42, 0.64, 0.86]) {
      const y = mix(sill, doorTop, h);
      b.quad([x0 + 0.15, y - 0.08, front + 0.03], [x1 - 0.15, y - 0.08, front + 0.03], [x1 - 0.15, y + 0.08, front + 0.03], [x0 + 0.15, y + 0.08, front + 0.03], [0, 0, 1], DURO_LIGHT);
    }
    // the Augustan red stripe at the meeting edge
    const ex = x0 > xm ? x0 : x1;
    b.quad([ex - 0.22, sill + 0.2, front + 0.06], [ex + 0.22, sill + 0.2, front + 0.06], [ex + 0.22, doorTop - 0.2, front + 0.06], [ex - 0.22, doorTop - 0.2, front + 0.06], [0, 0, 1], 0xa3241f);
  }
  // the jambs, the lintel over the doors, and the depot's name on it
  b.box(dx0, sill - 0.05, front, dx0 + 0.45, doorTop, front + 0.55, CONCRETE_LIGHT, { faces: 'ES' });
  b.box(dx1 - 0.45, sill - 0.05, front, dx1, doorTop, front + 0.55, CONCRETE_LIGHT, { faces: 'WS' });
  b.box(dx0, doorTop, front, dx1, top - 0.32, front + 0.6, CONCRETE, { faces: 'STB' });
  const signY = (doorTop + top - 0.32) / 2, signH = Math.min(1.05, top - 0.32 - doorTop - 0.3);
  b.box(xm - 4.2, signY - signH / 2 - 0.1, front + 0.6, xm + 4.2, signY + signH / 2 + 0.1, front + 0.7, FRAME, { faces: 'ESWTB' });
  const w = k.sign('canyon-drone-depot', xm, signY, front + 0.73, 0, 1, signH, 8.2);
  BOARDS.push({ x: xm, z: front + 0.73, w });
  // the signal lamps along the lintel, and the light on the apron
  for (let i = 0; i < 6; i++) k.glows.push({ x: mix(dx0 + 0.5, dx1 - 0.5, i / 5), y: top - 0.2, z: front + 0.5, sx: 0.28, sy: 0.18, sz: 0.2, color: i % 2 ? '#ffb45a' : '#ff5a3c' });
  k.lights.push({ x: xm, z: front + 4, r: 12, color: AMBER, k: 0.6 });
  // the launch hatches on its roof, and two masts
  for (const hx of [xm - 4.8, xm, xm + 4.8]) {
    const hz = (front + Math.max(back, front - 4.5)) / 2;
    b.box(hx - 1.3, roof, hz - 1.0, hx + 1.3, roof + 0.18, hz + 1.0, DURO);
    b.quad([hx - 1.05, roof + 0.2, hz + 0.75], [hx + 1.05, roof + 0.2, hz + 0.75], [hx + 1.05, roof + 0.2, hz - 0.75], [hx - 1.05, roof + 0.2, hz - 0.75], [0, 1, 0], DURO_DARK);
    k.glows.push({ x: hx, y: roof + 0.28, z: hz + 0.85, sx: 1.6, sy: 0.06, sz: 0.1, color: '#9ad0ff' });
  }
  for (const mx of [l.x0 + 1.3, l.x1 - 1.3]) {
    const mz = front - 1.6;
    b.beam([mx, roof, mz], [mx, top + 3.4, mz], 0.1, 0.06, STEEL);
    k.glows.push({ x: mx, y: top + 3.55, z: mz, sx: 0.25, sy: 0.25, sz: 0.25, color: '#ff3b3b' });
  }
  // drones parked by the hatches, ready to rise
  for (const [dx2, dz2, turn] of [[-2.4, -1.4, 0.3], [2.6, -2.2, 1.1], [7.2, -3.4, 0.7], [-7.0, -3.6, 2.0]]) {
    const ox = xm + dx2, oz = front + dz2;
    if (oz < back + 0.6) continue;
    drone(b, ox, roof + 0.02, oz, turn);
  }
  // chevrons along the dock's edge
  for (let i = 0; i < 7; i++) k.glows.push({ x: mix(l.x0 + 0.8, l.x1 - 0.8, i / 6), y: sill + 0.05, z: front + 1.32, sx: 0.5, sy: 0.08, sz: 0.12, color: '#ffb45a' });
  // the crew on the dock
  k.person(l.x0 + 1.4, front + 1.15, sill);
  k.person(l.x1 - 1.6, front + 1.2, sill);
};

/** A drone at rest: a body, four arms and their rotors, low and dark. */
function drone(b: GeoBuilder, x: number, y: number, z: number, turn: number): void {
  b.obox(x, y + 0.22, z, 0.32, 0.16, 0.24, turn, 0x2e3237, { top: 0x4a5058 });
  for (const a of [0.785, 2.356, 3.927, 5.498]) {
    const ax = x + Math.cos(a + turn) * 0.62, az = z + Math.sin(a + turn) * 0.62;
    b.beam([x, y + 0.28, z], [ax, y + 0.3, az], 0.05, 0.05, 0x6a7078);
    b.cyl(ax, az, y + 0.3, y + 0.36, 0.3, 0.3, 6, 0x3a3f45, { cap: 0x55606a });
  }
}

// ---------------------------------------------------------------------------
// The fall, its pool, and the bridge that carries the east ramp over the river
// ---------------------------------------------------------------------------

function theFall(k: Build): void {
  const b = k.b;
  const [fx] = FALL.top, w = FALL.half;
  const front = FALL.foot[1] - 3.0;
  const f = frameBetween(fx - w - 0.6, front, fx + w + 0.6, front);
  const L = f.L, mid = L / 2;
  const S = along(L, 0.5);
  const pool = F - WATER_DROP + 0.08;
  const lv = [pool - 1.1, 22, 26, 30, 34.2, 38.25], T = lv.length - 1;
  const dd = [0];
  for (let i = 1; i < T; i++) dd.push(Math.max(dd[i - 1] + 0.5, Math.min(...S.map((s) => reach(f, s, lv[i]))) - 0.06));
  dd.push(Math.max(dd[T - 1] + 0.6, Math.max(...S.map((s) => reach(f, s, lv[T] + 0.25))) + 0.35));
  const out: V3 = [0, 0, 1];
  const glow = interior(0.6);
  for (let i = 0; i < T; i++) {
    const y0 = lv[i], y1 = lv[i + 1];
    // the step of wet rock
    panel(b, f, 0, L, dd[i], y0, y1, WET);
    b.quad(at3(f, 0, dd[i], y1), at3(f, L, dd[i], y1), at3(f, L, dd[i + 1], y1), at3(f, 0, dd[i + 1], y1), [0, 1, 0], WET_DARK);
    for (const [s, sgn] of [[0, -1], [L, 1]] as const) {
      const dEnd = Math.max(dd[i] + 0.3, reach(f, s, y1 + 0.2) + 0.35);
      b.quad(at3(f, s, dd[i], y0), at3(f, s, dEnd, y0), at3(f, s, dEnd, y1), at3(f, s, dd[i], y1), [sgn, 0, 0], WET);
    }
    // the water over its lip in strands that wander from step to step: each curls over the lip, falls in
    // streaks of white and pale blue, and lands in foam
    const yTop = y1 + 0.06, yLow = i === 0 ? pool + 0.02 : y0 + 0.07, drop = yTop - yLow;
    const cuts = [[[0.02, 0.27], [0.36, 0.58], [0.68, 0.97]], [[0, 0.4], [0.52, 0.7], [0.8, 1]], [[0.06, 0.24], [0.33, 0.74], [0.84, 1]]][i % 3];
    const drift = [0, -0.35, 0.3, -0.2, 0.25][i % 5];
    for (const [c0, c1] of cuts) {
      const s0 = mix(mid - w, mid + w, c0) + drift, s1 = mix(mid - w, mid + w, c1) + drift, n = Math.max(2, Math.round((s1 - s0) / 0.55));
      for (let q = 0; q < n; q++) {
        const a0 = mix(s0, s1, q / n), a1 = mix(s0, s1, (q + 1) / n), long = 0.72 + 0.28 * Math.abs(Math.sin(i * 3.1 + q * 1.7 + c0 * 9));
        const yC = yTop - 0.32, yB = yTop - drop * 0.45, yE = yLow + (1 - long) * drop * 0.4;
        // over the lip
        b.quad(at3(f, a0, dd[i] + 0.12, yTop), at3(f, a1, dd[i] + 0.12, yTop), at3(f, a1, dd[i] - 0.3, yC), at3(f, a0, dd[i] - 0.3, yC), [0, 0.8, 0.6], FOAM, { win: glow });
        // falling: white, then blue, a streak at a time
        b.quad(at3(f, a0, dd[i] - 0.3, yC), at3(f, a1, dd[i] - 0.3, yC), at3(f, a1, dd[i] - 0.44, yB), at3(f, a0, dd[i] - 0.44, yB), [0, 0.12, 0.99], q % 2 ? WATER : WATER_BLUE, { win: glow });
        b.quad(at3(f, a0, dd[i] - 0.44, yB), at3(f, a1, dd[i] - 0.44, yB), at3(f, a1 + 0.06, dd[i] - 0.6, yE), at3(f, a0 - 0.06, dd[i] - 0.6, yE), [0, 0.12, 0.99], q % 2 ? WATER_BLUE : WATER, { win: glow });
      }
      // foam where it lands, lying flat
      const [px, pz] = at(f, (s0 + s1) / 2, dd[i] - 0.8), py = (i === 0 ? pool : y0) + 0.03, rr = 0.32 + (s1 - s0) * 0.32;
      b.cyl(px, pz, py, py + 0.22, rr, rr * 0.72, 7, FOAM, { cap: FOAM, win: glow });
    }
    // the pool on the ledge below, running to the next lip
    if (i > 0) b.quad(at3(f, mid - w + 0.05, dd[i - 1] - 0.05, y0 + 0.05), at3(f, mid + w - 0.05, dd[i - 1] - 0.05, y0 + 0.05), at3(f, mid + w - 0.05, dd[i] - 0.1, y0 + 0.05), at3(f, mid - w + 0.05, dd[i] - 0.1, y0 + 0.05), [0, 1, 0], RUN, { win: interior(0.35) });
  }
  // the basin on the rim the river comes out into, under the road, and spills from
  const zb0 = zReach(fx, front, lv[T] + 0.35) + 0.05, zb1 = LOOP.rim[0][1] + 6.55;
  const ground = Math.max(landAt(fx - w - 0.6, zb1), landAt(fx + w + 0.6, zb1), landAt(fx, (zb0 + zb1) / 2));
  const lip = ground + 0.28, rimY = lip + 0.38, wl = fx - w - 0.75, wr = fx + w + 0.75;
  b.box(wl, lv[T] - 0.3, zb1, wl + 0.3, rimY, zb0, STONE_DARK, { top: STONE });
  b.box(wr - 0.3, lv[T] - 0.3, zb1, wr, rimY, zb0, STONE_DARK, { top: STONE });
  // its front, notched where the water spills
  for (const [x0, x1] of [[wl + 0.3, fx - w], [fx + w, wr - 0.3]]) b.box(x0, lv[T] - 0.3, zb0 - 0.3, x1, rimY, zb0, STONE_DARK, { top: STONE });
  b.box(fx - w, lv[T] - 0.3, zb0 - 0.3, fx + w, lip, zb0, WET, { faces: 'NESW' });
  b.quad([wl + 0.3, lip + 0.04, zb0 - 0.3], [wr - 0.3, lip + 0.04, zb0 - 0.3], [wr - 0.3, lip + 0.04, zb1 + 0.3], [wl + 0.3, lip + 0.04, zb1 + 0.3], [0, 1, 0], RUN, { win: interior(0.35) });
  b.quad([fx - w, lip + 0.07, zb0 + 0.05], [fx + w, lip + 0.07, zb0 + 0.05], [fx + w + 0.1, lv[T] + 0.07, zb0 + 0.35], [fx - w - 0.1, lv[T] + 0.07, zb0 + 0.35], [0, 0.4, 0.92], WATER, { win: glow });
  // the headwall behind, with the culvert the river comes out of
  const head = rimY + 1.0;
  b.box(wl - 0.2, lv[T] - 0.3, zb1 - 0.45, wr + 0.2, head, zb1 + 0.3, STONE_DARK, { top: STONE });
  const cy = lip + 0.55;
  ring(b, fx, cy, zb1 + 0.34, 0.95, 0.66, STONE);
  disc(b, fx, cy, zb1 + 0.37, 0.66, 0x1b1d20);
  b.quad([fx - 0.6, cy - 0.3, zb1 + 0.36], [fx + 0.6, cy - 0.3, zb1 + 0.36], [fx + 0.8, lip + 0.05, zb1 + 1.2], [fx - 0.8, lip + 0.05, zb1 + 1.2], [0, 0.6, 0.8], WATER, { win: glow });
  // the foaming pool at its foot, where the river begins
  const shape: P2[] = [];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI + (i / 14) * Math.PI;
    shape.push([fx + Math.cos(a) * (w + 2.0), FALL.foot[1] + 0.1 + Math.sin(a) * 3.15]);
  }
  flat(b, shape, pool, RUN, { win: interior(0.35) });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, rr = 0.7 + 0.3 * Math.sin(i * 2.3);
    const px = fx + Math.cos(a) * (1.4 + 0.5 * Math.sin(i * 1.7)) * 1.4, pz = front + 0.9 + Math.sin(a) * 0.5;
    b.cyl(px, pz, pool - 0.05, pool + 0.22, rr, rr * 0.6, 6, FOAM, { cap: FOAM, win: glow });
  }
  k.lights.push({ x: fx, z: front + 1.5, r: 11, color: '#cfeeff', k: 0.65 });
  k.lights.push({ x: fx, z: (front + zb1) / 2, r: 7, color: '#cfeeff', k: 0.4 });
}

/** A flat ring upright on a wall that faces south. */
function ring(b: GeoBuilder, x: number, y: number, z: number, r0: number, r1: number, color: number): void {
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    b.quad([x + Math.cos(a0) * r1, y + Math.sin(a0) * r1, z], [x + Math.cos(a1) * r1, y + Math.sin(a1) * r1, z], [x + Math.cos(a1) * r0, y + Math.sin(a1) * r0, z], [x + Math.cos(a0) * r0, y + Math.sin(a0) * r0, z], [0, 0, 1], color);
  }
}
/** A flat disc upright on a wall that faces south. */
function disc(b: GeoBuilder, x: number, y: number, z: number, r: number, color: number): void {
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    face3(b, [x, y, z], [x + Math.cos(a0) * r, y + Math.sin(a0) * r, z], [x + Math.cos(a1) * r, y + Math.sin(a1) * r, z], [0, 0, 1], color);
  }
}

/** The bridge that carries the east ramp over the river at the fall's foot: a deck under the road's own surface, its abutments, and its north parapet over the pool. */
function theBridge(k: Build): void {
  const b = k.b, [fx] = FALL.foot;
  const pts = RAMP[1].filter((p) => Math.abs(p[0] - fx) <= 5.8);
  const half = 6.05;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], c = pts[i + 1];
    slab(b, [a[0], a[1] - 0.09, a[2]], [c[0], c[1] - 0.09, c[2]], half, 0.62, STONE_DARK, { under: 0x6f675c });
  }
  // abutments of stone at the river's banks, under the deck
  for (const [x0, x1] of [[fx - 3.45, fx - 2.95], [fx + 2.95, fx + 3.45]]) {
    const q = onRamp(1, (x0 + x1) / 2);
    b.box(x0, F - 1.8, q.z - half - 0.1, x1, q.y - 0.7, q.z + half + 0.1, STONE_DARK, { faces: 'NESW' });
  }
  // the north parapet; the south one is the ramp's own
  edgeAlong(k, pts, -1, () => 'deck');
  k.glows.push({ x: pts[0][0], y: pts[0][1] + 1.2, z: pts[0][2] - 5.65, sx: 0.3, sy: 0.3, sz: 0.3, color: '#ffe2ae' });
  k.glows.push({ x: pts[pts.length - 1][0], y: pts[pts.length - 1][1] + 1.2, z: pts[pts.length - 1][2] - 5.65, sx: 0.3, sy: 0.3, sz: 0.3, color: '#ffe2ae' });
}

// ---------------------------------------------------------------------------
// The loop road's furniture: parapets on the downhill side of the ramps and
// round the hairpins, and a wall under a ramp where it stands over the floor
// ---------------------------------------------------------------------------

type Edge = 'wall' | 'deck' | 'ground';

/**
 * A parapet along a road's edge, `toward` the south (1) or the north (-1) of
 * it: 0.9 high on its verge. Where the road stands higher than the ground
 * beside it, a retaining wall under it down to the ground, with a crown on
 * which its lamps stand. `kind` says which, by where along the road it is.
 */
function edgeAlong(k: Build, pts: V3[], toward: 1 | -1, kind: (x: number, rise: number) => Edge): void {
  const b = k.b, IN = 5.5, MID = 5.82, OUT = 6.65, UP = 0.86;
  const side = (i: number): P2 => {
    const a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)];
    const tx = c[0] - a[0], tz = c[2] - a[2], l = Math.hypot(tx, tz) || 1;
    let nx = -tz / l, nz = tx / l;
    if (nz * toward < 0) { nx = -nx; nz = -nz; }
    return [nx, nz];
  };
  const idx: number[] = [];
  for (let i = 0; i < pts.length; i += 2) idx.push(i);
  if (idx[idx.length - 1] !== pts.length - 1) idx.push(pts.length - 1);
  if (idx.length < 2) return;
  const P = (i: number, o: number, y: number): V3 => {
    const n = side(i);
    return [pts[i][0] + n[0] * o, y, pts[i][2] + n[1] * o];
  };
  const g = (i: number, o: number): number => landAt(pts[i][0] + side(i)[0] * o, pts[i][2] + side(i)[1] * o);
  const kinds: Edge[] = [];
  for (let j = 0; j + 1 < idx.length; j++) {
    const ia = idx[j], ic = idx[j + 1];
    kinds.push(kind((pts[ia][0] + pts[ic][0]) / 2, Math.max(pts[ia][1] - g(ia, OUT), pts[ic][1] - g(ic, OUT))));
  }
  for (let j = 0; j + 1 < idx.length; j++) {
    const ia = idx[j], ic = idx[j + 1], ya = pts[ia][1], yc = pts[ic][1], e = kinds[j];
    const na = side(ia), nc = side(ic), nOut: V3 = [(na[0] + nc[0]) / 2, 0, (na[1] + nc[1]) / 2], nIn: V3 = [-nOut[0], 0, -nOut[2]];
    // the parapet
    b.quad(P(ia, IN, ya - 0.06), P(ic, IN, yc - 0.06), P(ic, IN, yc + UP), P(ia, IN, ya + UP), nIn, PARAPET);
    b.quad(P(ia, IN - 0.06, ya + UP), P(ic, IN - 0.06, yc + UP), P(ic, MID + 0.06, yc + UP), P(ia, MID + 0.06, ya + UP), [0, 1, 0], COPING);
    if (e === 'wall') {
      b.quad(P(ia, MID, ya - 0.06), P(ic, MID, yc - 0.06), P(ic, MID, yc + UP), P(ia, MID, ya + UP), nOut, PARAPET);
      b.quad(P(ia, MID, ya - 0.07), P(ic, MID, yc - 0.07), P(ic, OUT, yc - 0.07), P(ia, OUT, ya - 0.07), [0, 1, 0], COPING);
      b.quad(P(ia, OUT, g(ia, OUT) - 0.3), P(ic, OUT, g(ic, OUT) - 0.3), P(ic, OUT, yc - 0.07), P(ia, OUT, ya - 0.07), nOut, MASONRY);
      // a rib of dressed stone up its face every few paces
      if (j % 3 === 1 && ya - g(ia, OUT) > 1.0) {
        const [rx, , rz] = P(ia, OUT + 0.2, 0), yaw = Math.atan2(pts[ic][2] - pts[ia][2], pts[ic][0] - pts[ia][0]);
        b.obox(rx, (g(ia, OUT) - 0.3 + ya - 0.2) / 2, rz, 0.32, (ya - 0.2 - g(ia, OUT) + 0.3) / 2, 0.22, yaw, PARAPET, { top: COPING });
      }
      // where a run of wall begins or ends, its end
      const dir: V3 = [pts[ic][0] - pts[ia][0], 0, pts[ic][2] - pts[ia][2]];
      if (j === 0 || kinds[j - 1] !== 'wall') capWall(b, P(ia, MID, 0), P(ia, OUT, 0), g(ia, OUT) - 0.3, ya - 0.07, [-dir[0], 0, -dir[2]]);
      if (j + 1 === kinds.length || kinds[j + 1] !== 'wall') capWall(b, P(ic, MID, 0), P(ic, OUT, 0), g(ic, OUT) - 0.3, yc - 0.07, dir);
    } else if (e === 'deck') {
      b.quad(P(ia, MID, ya - 0.3), P(ic, MID, yc - 0.3), P(ic, MID, yc + UP), P(ia, MID, ya + UP), nOut, PARAPET);
    } else {
      b.quad(P(ia, MID, Math.min(ya, g(ia, MID)) - 0.3), P(ic, MID, Math.min(yc, g(ic, MID)) - 0.3), P(ic, MID, yc + UP), P(ia, MID, ya + UP), nOut, PARAPET);
    }
  }
  // the parapet's ends
  for (const [i, j] of [[idx[0], idx[1]], [idx[idx.length - 1], idx[idx.length - 2]]]) {
    const y = pts[i][1], dir: V3 = [pts[i][0] - pts[j][0], 0, pts[i][2] - pts[j][2]];
    b.quad(P(i, IN, y - 0.06), P(i, MID, y - 0.06), P(i, MID, y + UP), P(i, IN, y + UP), dir, PARAPET);
  }
}

/** The end of a retaining wall: from its face back to the parapet, from the ground to its crown. */
function capWall(b: GeoBuilder, a: V3, c: V3, y0: number, y1: number, dir: V3): void {
  const l = Math.hypot(dir[0], dir[2]) || 1;
  b.quad([a[0], y0, a[2]], [c[0], y0, c[2]], [c[0], y1, c[2]], [a[0], y1, a[2]], [dir[0] / l, 0, dir[2] / l], MASONRY);
}

/** A parapet round the outside of a hairpin, on the edge of its bench. */
function hairpinEdge(k: Build, c: P2, side: Side): void {
  const b = k.b, R0 = LOOP.r + 6.0, R1 = R0 + 0.32, UP = 0.86, n = 14, y = HAIRPIN_Y;
  const a0 = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  const P = (a: number, r: number, h: number): V3 => [c[0] + Math.cos(a) * r, h, c[1] + Math.sin(a) * r];
  for (let i = 0; i < n; i++) {
    const t0 = a0 + (i / n) * Math.PI, t1 = a0 + ((i + 1) / n) * Math.PI, tm = (t0 + t1) / 2;
    const out: V3 = [Math.cos(tm), 0, Math.sin(tm)], inn: V3 = [-out[0], 0, -out[2]];
    const g0 = landAt(c[0] + Math.cos(t0) * R1, c[1] + Math.sin(t0) * R1), g1 = landAt(c[0] + Math.cos(t1) * R1, c[1] + Math.sin(t1) * R1);
    b.quad(P(t0, R0, y - 0.06), P(t1, R0, y - 0.06), P(t1, R0, y + UP), P(t0, R0, y + UP), inn, PARAPET);
    b.quad(P(t0, R0 - 0.06, y + UP), P(t1, R0 - 0.06, y + UP), P(t1, R1 + 0.06, y + UP), P(t0, R1 + 0.06, y + UP), [0, 1, 0], COPING);
    b.quad(P(t0, R1, Math.min(y, g0) - 0.3), P(t1, R1, Math.min(y, g1) - 0.3), P(t1, R1, y + UP), P(t0, R1, y + UP), out, PARAPET);
  }
  for (const t of [a0, a0 + Math.PI]) {
    const tang: V3 = [-Math.sin(t), 0, Math.cos(t)];
    b.quad(P(t, R0, y - 0.06), P(t, R1, y - 0.06), P(t, R1, y + UP), P(t, R0, y + UP), tang, PARAPET);
  }
  // a sign for the column at the top of the ramp, and a lamp on the turn
  const sa = side < 0 ? Math.PI * 0.75 : Math.PI * 0.25, sr = R1 + 1.4;
  const sx = c[0] + Math.cos(sa) * sr, sz = c[1] + Math.sin(sa) * sr, gy = landAt(sx, sz);
  for (const s of [-1, 1]) {
    const px = sx - TO_VIEW[2] * s * 1.25 - TO_VIEW[0] * 0.08, pz = sz + TO_VIEW[0] * s * 1.25 - TO_VIEW[2] * 0.08;
    b.beam([px, gy - 0.2, pz], [px, gy + 2.55, pz], 0.08, 0.07, STEEL);
  }
  b.obox(sx - TO_VIEW[0] * 0.05, gy + 2.05, sz - TO_VIEW[2] * 0.05, 1.3, 0.38, 0.04, Math.atan2(TO_VIEW[0], -TO_VIEW[2]), FRAME, { faces: 'B' });
  k.sign('canyon-north-gate', sx, gy + 2.05, sz, TO_VIEW[0], TO_VIEW[2], 0.62, 2.6);
}

function roadFurniture(k: Build): void {
  const [fx] = FALL.foot;
  for (const side of [-1, 1] as const) {
    const pts = RAMP[side].filter((p) => side * (p[0] - (side < 0 ? LOOP.apron.x0 : LOOP.apron.x1)) >= -1.5);
    edgeAlong(k, pts, 1, (x, rise) => (side > 0 && Math.abs(x - fx) < 5.6 ? 'deck' : rise > 0.25 ? 'wall' : 'ground'));
    hairpinEdge(k, side < 0 ? LOOP.hairpinW : LOOP.hairpinE, side);
  }
}

// ---------------------------------------------------------------------------
// The guns on the rim
// ---------------------------------------------------------------------------

/** The muzzles of the guns on the rim, from which the Rain's file fires its tracers at the falling shells. The builder sets them from the guns it builds. */
export const GUN_MUZZLES: [number, number, number][] = [
  [-18.95, 41.95, -92.47], [-19.66, 41.95, -92.21], [-11.16, 41.95, -93.55], [-11.79, 41.95, -93.11],
  [28.45, 41.95, -93.57], [27.91, 41.95, -93.03], [35.91, 41.95, -94.97], [35.53, 41.95, -94.31],
];
let gunsBuilt = 0;

/** One heavy gun: a level plinth on the slope behind the rim, a turret on it as high as `top`, and two long barrels up at the sky. */
function turret(k: Build, x: number, z: number, aim: number, top: number, muzzles: [number, number, number][]): void {
  const b = k.b, R = 1.5;
  let hi = -Infinity, lo = Infinity;
  for (let i = 0; i < 12; i++) {
    for (const rr of [0, R * 0.6, R * 1.15]) {
      const g = landAt(x + Math.cos((i / 12) * Math.PI * 2) * rr, z + Math.sin((i / 12) * Math.PI * 2) * rr);
      hi = Math.max(hi, g);
      lo = Math.min(lo, g);
    }
  }
  const ringH = 0.5, py = Math.max(hi + 0.1, top - 0.05 - 1.7 - ringH), housing = Math.max(1.1, Math.min(1.7, top - 0.05 - ringH - py));
  b.cyl(x, z, lo - 0.3, py, R * 1.12, R * 1.06, 10, CONCRETE, { cap: CONCRETE_LIGHT });
  b.cyl(x, z, py, py + ringH, 1.15, 1.1, 10, GUN_DARK, { cap: GUNMETAL });
  const c = Math.cos(aim), s = Math.sin(aim), y0 = py + ringH, y1 = y0 + housing;
  b.obox(x - c * 0.2, (y0 + y1) / 2, z - s * 0.2, 1.25, housing / 2, 0.92, aim, GUNMETAL, { top: 0x7a828b });
  // its sloped front, and a hatch on its back
  b.obox(x + c * 1.0, y0 + 0.62, z + s * 1.0, 0.14, 0.62, 0.86, aim, GUN_DARK);
  b.obox(x - c * 1.48, y0 + 0.8, z - s * 1.48, 0.06, 0.45, 0.45, aim, GUN_DARK);
  const el = 0.95, ce = Math.cos(el), se = Math.sin(el);
  const pivot: V3 = [x + c * 0.8, y0 + 1.15, z + s * 0.8], len = Math.min(6.4, (top + 3.95 - pivot[1]) / se);
  for (const off of [-0.38, 0.38]) {
    const a: V3 = [pivot[0] - s * off, pivot[1], pivot[2] + c * off];
    const tip: V3 = [a[0] + c * ce * len, a[1] + se * len, a[2] + s * ce * len];
    b.beam(a, tip, 0.2, 0.15, BARREL);
    const mb: V3 = [tip[0] - c * ce * 0.6, tip[1] - se * 0.6, tip[2] - s * ce * 0.6];
    b.beam(mb, [tip[0] + c * ce * 0.04, tip[1] + se * 0.04, tip[2] + s * ce * 0.04], 0.25, 0.25, GUN_DARK);
    muzzles.push([+tip[0].toFixed(2), +tip[1].toFixed(2), +tip[2].toFixed(2)]);
  }
  // its crew, on the plinth's uphill side
  k.person(x - s * 1.2 - c * 1.0, z + c * 1.2 - s * 1.0, py);
}

const guns: Model = (k, l) => {
  const b = k.b, east = l.x0 > 0;
  const zc = l.z0 + 1.6, muzzles: [number, number, number][] = [];
  // two guns in each battery, aimed up at the sky over the south and the east where the shells come from
  const xs = [l.x0 + 3.3, l.x1 - 3.8], aims = east ? [0.78, 0.52] : [1.22, 0.96];
  xs.forEach((x, i) => turret(k, x, zc + (i ? -0.25 : 0.25), aims[i], l.top, muzzles));
  // the magazine between them and a little behind the rim's crest, half sunk into the slope, its door towards the guns
  const mx = (l.x0 + l.x1) / 2, mz = zc + 0.7;
  const mg = Math.min(landAt(mx - 1.2, mz - 0.9), landAt(mx + 1.2, mz - 0.9), landAt(mx, mz - 0.9));
  const mt = Math.min(l.top - 1.5, Math.max(landAt(mx - 1.2, mz + 0.9), landAt(mx + 1.2, mz + 0.9), landAt(mx, mz + 0.9)) + 1.0);
  b.box(mx - 1.2, mg - 0.4, mz - 0.9, mx + 1.2, mt, mz + 0.9, CONCRETE_DARK, { top: CONCRETE });
  b.quad([mx - 0.5, mg + 0.2, mz - 0.92], [mx + 0.5, mg + 0.2, mz - 0.92], [mx + 0.5, Math.min(mt - 0.3, mg + 1.9), mz - 0.92], [mx - 0.5, Math.min(mt - 0.3, mg + 1.9), mz - 0.92], [0, 0, -1], DURO_DARK);
  k.glows.push({ x: mx, y: mt + 0.15, z: mz, sx: 0.3, sy: 0.2, sz: 0.3, color: '#ff4040' });
  // a searchlight on the magazine's roof, pointed at the sky, and ammunition stacked by its door
  b.cyl(mx + 0.6, mz, mt, mt + 0.5, 0.18, 0.18, 6, GUN_DARK, { cap: false });
  b.obox(mx + 0.6, mt + 0.75, mz + 0.15, 0.42, 0.32, 0.42, 0.6, GUNMETAL, { top: GUN_DARK });
  k.glows.push({ x: mx + 0.6, y: mt + 0.8, z: mz + 0.6, sx: 0.55, sy: 0.45, sz: 0.12, color: '#eef6ff' });
  for (const [cx2, cz2] of [[-0.7, -1.45], [0.2, -1.55], [-0.25, -2.0]]) {
    const gy = landAt(mx + cx2, mz + cz2);
    b.box(mx + cx2 - 0.35, gy - 0.2, mz + cz2 - 0.3, mx + cx2 + 0.35, gy + 0.5, mz + cz2 + 0.3, OLIVE_CRATE, { top: 0x7d7f62 });
  }
  k.lights.push({ x: mx, z: zc, r: 9, color: AMBER, k: 0.45 });
  // where the Rain's file fires from: both batteries' muzzles, once both are built
  if (gunsBuilt === 0) GUN_MUZZLES.length = 0;
  GUN_MUZZLES.push(...muzzles);
  gunsBuilt = (gunsBuilt + 1) % 2;
};

// ---------------------------------------------------------------------------
// The Institute's gate building, and its marble square
// ---------------------------------------------------------------------------

const institute: Model = (k, l) => {
  const b = k.b;
  const hero = HERO_SPOTS.find((h) => h.id === 'institute');
  const hx = hero?.x ?? (l.x0 + l.x1) / 2, hz = hero?.z ?? l.z1 + 1.8;
  // The square runs from the rim road's verge north to the gates: an upper part beside the road, where a hero
  // stands looking out over the canyon, and steps down to a forecourt before the portico. Each is level, on a
  // podium where the plateau falls away under it.
  const facade = l.z1 - 3.9, x0 = l.x0 + 0.5, x1 = hx + 4.6, z1 = hz + 1.65, zStep = hz - 2.1, zCourt = zStep - 1.3;
  const span = (za: number, zb: number): [number, number] => {
    let hi = -Infinity, lo = Infinity;
    for (let x = x0; x <= x1 + 1e-6; x += 0.5) {
      for (let z = za; z <= zb + 1e-6; z += 0.5) {
        const g = landAt(x, z);
        hi = Math.max(hi, g);
        lo = Math.min(lo, g);
      }
    }
    return [hi, lo];
  };
  const [hiU, loU] = span(zStep, z1), [hiC, loC] = span(facade, zCourt);
  const SQY = hiU + 0.06, FY = Math.min(SQY - 0.8, hiC + 0.06);
  // the upper square
  b.box(x0, Math.min(loU, FY) - 0.4, zStep, x1, SQY - 0.12, z1, BONE_SHADE, { faces: 'NESW' });
  b.box(x0 - 0.12, SQY - 0.12, zStep, x1 + 0.12, SQY, z1 + 0.12, MARBLE, { faces: 'NESWT' });
  // the steps down, and the forecourt
  const n = Math.max(2, Math.round((SQY - FY) / 0.42)), rise = (SQY - FY) / n, run = (zStep - zCourt) / (n - 1);
  for (let j = 1; j < n; j++) b.box(x0 + 0.4, FY - 0.3, zStep - j * run, x1 - 0.4, SQY - j * rise, zStep - (j - 1) * run, MARBLE, { faces: 'NEWT' });
  b.box(x0, loC - 0.4, facade, x1, FY - 0.12, zCourt, BONE_SHADE, { faces: 'EW' });
  b.box(x0 - 0.12, FY - 0.12, facade, x1 + 0.12, FY, zCourt, MARBLE, { faces: 'EWT' });
  // the paving: a border on the square, and the Society's pyramid laid in gold before the gates
  const gate = (x0 + x1) / 2 - 1.4;
  b.quad([x0 + 0.5, SQY + 0.02, z1 - 0.5], [x1 - 0.5, SQY + 0.02, z1 - 0.5], [x1 - 0.5, SQY + 0.02, z1 - 0.8], [x0 + 0.5, SQY + 0.02, z1 - 0.8], [0, 1, 0], STONE_DARK);
  face3(b, [gate - 1.3, FY + 0.02, zCourt - 0.25], [gate + 1.3, FY + 0.02, zCourt - 0.25], [gate, FY + 0.02, zCourt - 1.6], [0, 1, 0], GOLD);
  // balustrades where the square stands over the plateau and the road
  const bal = (xa: number, za: number, xb: number, zb: number, y: number): void => {
    b.box(Math.min(xa, xb), y, Math.min(za, zb), Math.max(xa, xb), y + 0.75, Math.max(za, zb), MARBLE, { top: BONE });
  };
  bal(x0, zStep, x0 + 0.3, z1 - 0.3, SQY);
  bal(x0, z1 - 0.3, hx - 4.6, z1, SQY);
  bal(x0, facade + 2.0, x0 + 0.3, zCourt, FY);
  bal(x1 - 0.3, facade + 0.4, x1, zCourt, FY);
  // its name, on the face of the podium over the road
  const signH = 0.82, py = Math.max(landAt(x0 + 4, z1 + 0.3), landAt(hx - 5, z1 + 0.3)) + 0.25 + signH / 2 + 0.12;
  b.box(x0 + 0.4, py - signH / 2 - 0.12, z1, hx - 4.9, py + signH / 2 + 0.12, z1 + 0.1, FRAME, { faces: 'ESWTB' });
  const iw = k.sign('canyon-the-institute', (x0 + 0.4 + hx - 4.9) / 2, py, z1 + 0.13, 0, 1, signH, hx - 4.9 - x0 - 0.6);
  BOARDS.push({ x: (x0 + hx - 4.5) / 2, z: z1 + 0.13, w: iw });

  // the building, down the plateau's north slope behind the forecourt, its roof at the lot's top
  const bx0 = l.x0 + 0.25, bx1 = l.x1 - 0.25, bz0 = l.z0 + 0.4, roof = l.top - 0.36;
  const base = Math.min(landAt(bx0, bz0), landAt(bx1, bz0), landAt((bx0 + bx1) / 2, bz0)) - 0.5;
  b.box(bx0, base, bz0, bx1, roof, facade, MARBLE, { faces: 'NESW', win: INSTITUTE_WIN, seed: 0.61 });
  b.box(bx0 + 0.3, roof - 0.01, bz0 + 0.3, bx1 - 0.3, roof + 0.02, facade - 0.3, BONE_SHADE, { faces: 'T' });
  for (const [xa, za, xb, zb] of [[bx0, bz0, bx1, bz0 + 0.35], [bx0, facade - 0.35, bx1, facade], [bx0, bz0 + 0.35, bx0 + 0.35, facade - 0.35], [bx1 - 0.35, bz0 + 0.35, bx1, facade - 0.35]]) b.box(xa, roof, za, xb, l.top, zb, BONE);
  b.box(bx0 - 0.15, roof - 0.5, bz0 - 0.15, bx1 + 0.15, roof - 0.3, facade, BONE_SHADE, { faces: 'NEWTB', top: BONE_SHADE });
  b.box(bx0 - 0.15, roof - 0.5, facade, bx1 + 0.15, roof - 0.3, facade + 0.12, BONE_SHADE, { faces: 'ESWTB' });
  for (let i = 1; i < 10; i++) {
    const px = mix(bx0, bx1, i / 10);
    b.box(px - 0.3, base, bz0 - 0.14, px + 0.3, roof - 0.5, bz0, BONE, { faces: 'NEW' });
  }
  for (let i = 1; i < 4; i++) {
    const pz = mix(bz0, facade, i / 4);
    for (const [x0, x1, f2] of [[bx0 - 0.14, bx0, 'NSW'], [bx1, bx1 + 0.14, 'NSE']] as const) b.box(x0, base, pz - 0.3, x1, roof - 0.5, pz + 0.3, BONE, { faces: f2 });
  }
  // skylights along its roof, and the Society's pyramid in gold over its middle
  const rzm = (bz0 + facade) / 2;
  for (let i = 0; i < 6; i++) {
    const sx = mix(bx0 + 1.6, bx1 - 1.6, i / 5);
    if (Math.abs(sx - (bx0 + bx1) / 2) < 3) continue;
    for (const sz of [rzm - 2.1, rzm + 2.1]) b.quad([sx - 0.9, roof + 0.05, sz + 0.7], [sx + 0.9, roof + 0.05, sz + 0.7], [sx + 0.9, roof + 0.05, sz - 0.7], [sx - 0.9, roof + 0.05, sz - 0.7], [0, 1, 0], 0x3d5266, { win: interior(1.6) });
  }
  pyramid(b, (bx0 + bx1) / 2, roof + 0.02, rzm, 4.3);

  // the portico before the gates, on the forecourt
  const pz1 = facade + 2.0, cols = [-4.8, -1.6, 1.6, 4.8].map((c) => gate + c);
  const ent0 = l.top - 0.75, ent1 = l.top - 0.05;
  for (const cx of cols) {
    b.box(cx - 0.42, FY, pz1 - 0.92, cx + 0.42, FY + 0.25, pz1 - 0.08, BONE_SHADE);
    b.cyl(cx, pz1 - 0.5, FY + 0.25, ent0 - 0.22, 0.36, 0.3, 8, BONE, { cap: false });
    b.box(cx - 0.4, ent0 - 0.22, pz1 - 0.9, cx + 0.4, ent0, pz1 - 0.1, BONE_SHADE, { faces: 'NESWB' });
  }
  b.box(cols[0] - 0.7, ent0, facade, cols[3] + 0.7, ent1, pz1, BONE, { faces: 'ESWTB', top: BONE_SHADE });
  b.quad([cols[0] - 0.5, ent0 + 0.22, pz1 + 0.04], [cols[3] + 0.5, ent0 + 0.22, pz1 + 0.04], [cols[3] + 0.5, ent0 + 0.4, pz1 + 0.04], [cols[0] - 0.5, ent0 + 0.4, pz1 + 0.04], [0, 0, 1], GOLD);
  // the gates, bronze, in a doorway of their own
  const gw = 2.6, gh = Math.min(3.6, ent0 - FY - 0.45);
  b.box(gate - gw / 2 - 0.35, FY, facade, gate + gw / 2 + 0.35, FY + gh + 0.35, facade + 0.3, BONE_SHADE, { faces: 'ESWT' });
  b.quad([gate - gw / 2, FY + 0.01, facade + 0.34], [gate + gw / 2, FY + 0.01, facade + 0.34], [gate + gw / 2, FY + gh, facade + 0.34], [gate - gw / 2, FY + gh, facade + 0.34], [0, 0, 1], 0x8a5f2e);
  b.quad([gate - 0.04, FY + 0.01, facade + 0.38], [gate + 0.04, FY + 0.01, facade + 0.38], [gate + 0.04, FY + gh, facade + 0.38], [gate - 0.04, FY + gh, facade + 0.38], [0, 0, 1], 0x3a2614);
  for (const sgn of [-1, 1]) b.quad([gate + sgn * 0.62 - 0.2, FY + gh * 0.45, facade + 0.38], [gate + sgn * 0.62 + 0.2, FY + gh * 0.45, facade + 0.38], [gate + sgn * 0.62 + 0.2, FY + gh * 0.62, facade + 0.38], [gate + sgn * 0.62 - 0.2, FY + gh * 0.62, facade + 0.38], [0, 0, 1], GOLD);
  // the pillars on either side, gold-tipped
  for (const px of [x0 + 0.65, cols[3] + 1.6]) {
    const pzc = facade + 1.0;
    b.box(px - 0.55, FY, pzc - 0.55, px + 0.55, FY + 0.4, pzc + 0.55, BONE_SHADE);
    b.cyl(px, pzc, FY + 0.4, l.top + 0.2, 0.42 * Math.SQRT2, 0.34 * Math.SQRT2, 4, BONE, { phase: Math.PI / 4, cap: false });
    b.box(px - 0.5, l.top + 0.2, pzc - 0.5, px + 0.5, l.top + 0.45, pzc + 0.5, BONE_SHADE);
    b.cyl(px, pzc, l.top + 0.45, l.top + 2.6, 0.5 * Math.SQRT2, 0.02, 4, GOLD, { phase: Math.PI / 4 });
    k.glows.push({ x: px, y: l.top + 0.6, z: pzc + 0.6, sx: 0.3, sy: 0.3, sz: 0.2, color: '#ffe2ae' });
  }
  // students on the square and the forecourt
  for (const [px, pz, py2] of [[x0 + 1.5, zStep + 0.9, SQY], [gate + 2.6, zCourt - 0.7, FY], [gate - 2.4, zCourt - 0.5, FY]]) k.person(px, pz, py2);
  k.lights.push({ x: gate, z: zCourt, r: 11, color: WARM, k: 0.6 });
  k.lights.push({ x: (bx0 + bx1) / 2, z: bz0 - 2, r: 10, color: WARM, k: 0.4 });
};

// ---------------------------------------------------------------------------
// Olympus
// ---------------------------------------------------------------------------

const olympus: Model = (k, l) => {
  const b = k.b, r = rng(4242);
  const cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2;
  const TOP = 52, LOW = 44, R = Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2 - 1.0;
  // the mountain the wrong way up: rings from its rim down to its point, each more jagged than the last
  const N = 20;
  const rings: { y: number; r: number; j: number; dy: number }[] = [
    { y: TOP, r: R, j: 0.05, dy: 0 }, { y: TOP - 0.6, r: R * 1.03, j: 0.07, dy: 0.15 }, { y: TOP - 1.3, r: R * 0.93, j: 0.12, dy: 0.3 },
    { y: TOP - 2.3, r: R * 0.76, j: 0.18, dy: 0.4 }, { y: TOP - 3.5, r: R * 0.56, j: 0.24, dy: 0.45 }, { y: TOP - 4.9, r: R * 0.37, j: 0.3, dy: 0.4 },
    { y: TOP - 6.3, r: R * 0.18, j: 0.3, dy: 0.25 },
  ];
  const pts: V3[][] = rings.map((g, k2) => Array.from({ length: N }, (_, i): V3 => {
    const a = ((i + (k2 % 2) * 0.5) / N) * Math.PI * 2 + (r() - 0.5) * 0.12;
    const rr = g.r * (1 + (r() - 0.5) * 2 * g.j);
    return [cx + Math.cos(a) * rr, g.y + (r() - 0.5) * 2 * g.dy, cz + Math.sin(a) * rr];
  }));
  const tip: V3 = [cx + 0.6, LOW, cz - 0.4];
  const facet = (p: V3, q: V3, s: V3): void => {
    const ax = q[0] - p[0], ay = q[1] - p[1], az = q[2] - p[2], bx = s[0] - p[0], by = s[1] - p[1], bz = s[2] - p[2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const mx = (p[0] + q[0] + s[0]) / 3 - cx, mz = (p[2] + q[2] + s[2]) / 3 - cz;
    if (nx * mx + nz * mz + ny * -0.6 < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const ln = Math.hypot(nx, ny, nz) || 1, my = (p[1] + q[1] + s[1]) / 3;
    const colour = tint(bedColour(Math.floor((my + wander(mx + cx, mz + cz)) / BED)), my < TOP - 3 ? 0.78 : 0.95);
    face3(b, p, q, s, [nx / ln, ny / ln, nz / ln], colour);
  };
  for (let k2 = 0; k2 + 1 < pts.length; k2++) {
    for (let i = 0; i < N; i++) {
      const a = pts[k2][i], c = pts[k2][(i + 1) % N];
      const d = pts[k2 + 1][(i + (k2 % 2)) % N], e = pts[k2 + 1][(i + (k2 % 2) + N - 1) % N];
      facet(a, c, d);
      facet(a, d, e);
    }
  }
  for (let i = 0; i < N; i++) facet(pts[pts.length - 1][i], pts[pts.length - 1][(i + 1) % N], tip);
  // how high its underside is at a distance from its middle, from the rings
  const under = (d: number): number => {
    for (let k2 = 0; k2 + 1 < rings.length; k2++) {
      const ra = rings[k2].r, rb = rings[k2 + 1].r;
      if (d <= ra && d >= rb) return mix(rings[k2].y, rings[k2 + 1].y, (ra - d) / (ra - rb));
    }
    return d > rings[0].r ? TOP : LOW;
  };
  // crags hanging from its underside, an upside-down range round its point
  const crags: V3[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.25 + (r() - 0.5) * 0.3, d = R * (0.36 + 0.42 * r()), rad = 0.7 + r() * 0.6;
    const px = cx + Math.cos(a) * d, pz = cz + Math.sin(a) * d, root = under(Math.max(0, d - rad * 1.3)) + 0.25;
    const y0 = Math.max(LOW + 0.6, root - 2.4 - r() * 2.4);
    b.cyl(px, pz, y0, root, 0.05, rad, 5, tint(bedColour(i * 2 + 1), 0.7), { cap: tint(bedColour(i * 2 + 1), 0.7), phase: r() * 2 });
    crags.push([px, y0, pz]);
  }
  // its top: lawn, and a marble court in the middle
  for (let i = 0; i < N; i++) b.up([cx, TOP, cz], pts[0][i], pts[0][(i + 1) % N], 0x7fa35a);
  const court: P2[] = Array.from({ length: 12 }, (_, i): P2 => [cx + Math.cos((i / 12) * Math.PI * 2) * R * 0.66, cz + Math.sin((i / 12) * Math.PI * 2) * R * 0.66]);
  flat(b, court, TOP + 0.04, BONE_SHADE);

  // the citadel: a ring wall with towers, a hall of columns, and a tall keep with a gold crown
  const wr = R * 0.82;
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * Math.PI * 2, a1 = ((i + 1) / 12) * Math.PI * 2;
    if (i === 1) continue; // the gate, towards the south-east
    const x0 = cx + Math.cos(a0) * wr, z0 = cz + Math.sin(a0) * wr, x1 = cx + Math.cos(a1) * wr, z1 = cz + Math.sin(a1) * wr;
    b.obox((x0 + x1) / 2, TOP + 0.7, (z0 + z1) / 2, Math.hypot(x1 - x0, z1 - z0) / 2 + 0.2, 0.7, 0.22, Math.atan2(z1 - z0, x1 - x0), BONE, { top: BONE_SHADE });
    if (i % 3 === 0) {
      b.cyl(x0, z0, TOP, TOP + 2.6, 0.62, 0.58, 8, BONE, { cap: false, win: OLYMPUS_WIN, seed: i * 0.1 });
      b.cyl(x0, z0, TOP + 2.6, TOP + 4.0, 0.74, 0.03, 8, BONE_ROOF);
    }
  }
  // the hall: a temple of the Proctors on a podium, its columns to the south and the east
  const hx0 = cx - 4.6, hx1 = cx + 1.0, hz0 = cz - 3.4, hz1 = cz + 0.6, hy = TOP + 0.6, eave = hy + 3.6;
  b.box(hx0 - 0.6, TOP, hz0 - 0.6, hx1 + 0.6, hy, hz1 + 0.6, BONE_SHADE);
  b.box(hx0 + 0.9, hy, hz0 + 0.5, hx1 - 0.9, eave, hz1 - 1.0, BONE, { faces: 'NESW', win: OLYMPUS_WIN, seed: 0.33 });
  for (let i = 0; i < 6; i++) {
    const x = mix(hx0 + 0.35, hx1 - 0.35, i / 5);
    b.cyl(x, hz1 - 0.3, hy, eave, 0.26, 0.22, 6, BONE, { cap: false });
  }
  for (let i = 1; i < 4; i++) {
    const z = mix(hz0 + 0.35, hz1 - 0.3, i / 4);
    b.cyl(hx1 - 0.3, z, hy, eave, 0.26, 0.22, 6, BONE, { cap: false });
  }
  b.box(hx0 - 0.1, eave, hz0 - 0.1, hx1 + 0.1, eave + 0.45, hz1 + 0.1, BONE_SHADE, { faces: 'NESWTB' });
  // its pitched roof, the gables to the east and west
  const rx0 = hx0 - 0.2, rx1 = hx1 + 0.2, rz0 = hz0 - 0.25, rz1 = hz1 + 0.25, ry = eave + 0.45, ridge = ry + 1.5, rzm = (rz0 + rz1) / 2;
  slab(b, [(rx0 + rx1) / 2, ry, rz0], [(rx0 + rx1) / 2, ridge, rzm], (rx1 - rx0) / 2, 0.15, BONE_ROOF, { under: BONE_SHADE });
  slab(b, [(rx0 + rx1) / 2, ry, rz1], [(rx0 + rx1) / 2, ridge, rzm], (rx1 - rx0) / 2, 0.15, BONE_ROOF, { under: BONE_SHADE });
  face3(b, [rx0 + 0.05, ry, rz0 + 0.1], [rx0 + 0.05, ry, rz1 - 0.1], [rx0 + 0.05, ridge - 0.1, rzm], [-1, 0, 0], BONE);
  face3(b, [rx1 - 0.05, ry, rz0 + 0.1], [rx1 - 0.05, ry, rz1 - 0.1], [rx1 - 0.05, ridge - 0.1, rzm], [1, 0, 0], BONE);
  // the keep, tallest of all, its crown gold
  const kx = cx + 3.2, kz = cz - 2.8, kTop = l.top - 1.6;
  b.box(kx - 1.5, TOP, kz - 1.5, kx + 1.5, TOP + 4.2, kz + 1.5, BONE, { win: OLYMPUS_WIN, seed: 0.71 });
  b.box(kx - 1.1, TOP + 4.2, kz - 1.1, kx + 1.1, kTop, kz + 1.1, BONE, { win: OLYMPUS_WIN, seed: 0.73 });
  b.box(kx - 1.3, kTop, kz - 1.3, kx + 1.3, kTop + 0.35, kz + 1.3, BONE_SHADE);
  b.cyl(kx, kz, kTop + 0.35, l.top + 1.2, 1.15, 0.5, 8, BONE, { cap: false });
  b.cyl(kx, kz, l.top + 1.2, l.top + 3.6, 0.55, 0.03, 8, GOLD);
  // a smaller tower to the west
  const wx = cx - 4.6, wz = cz + 2.6;
  b.box(wx - 0.9, TOP, wz - 0.9, wx + 0.9, TOP + 6.0, wz + 0.9, BONE, { win: OLYMPUS_WIN, seed: 0.81 });
  b.cyl(wx, wz, TOP + 6.0, TOP + 7.8, 1.25, 0.03, 4, BONE_ROOF, { phase: Math.PI / 4 });
  // a rotunda with a golden dome, by the keep
  const ox = cx + 3.9, oz = cz + 1.0;
  b.cyl(ox, oz, TOP, TOP + 2.9, 1.35, 1.35, 10, BONE, { cap: false, win: OLYMPUS_WIN, seed: 0.91 });
  b.cyl(ox, oz, TOP + 2.9, TOP + 3.2, 1.5, 1.5, 10, BONE_SHADE, { cap: false });
  for (const [r0, y0, r1, y1] of [[1.45, 3.2, 1.3, 3.75], [1.3, 3.75, 0.95, 4.3], [0.95, 4.3, 0.45, 4.7]]) b.cyl(ox, oz, TOP + y0, TOP + y1, r0, r1, 10, GOLD, { cap: false });
  b.cyl(ox, oz, TOP + 4.7, TOP + 5.6, 0.45, 0.04, 10, GOLD);
  // its windows glow by night, and lamps on its towers
  k.glows.push({ x: kx, y: l.top + 1.0, z: kz + 1.0, sx: 0.4, sy: 0.4, sz: 0.4, color: '#ffe2ae' });
  k.glows.push({ x: (hx0 + hx1) / 2, y: hy + 0.4, z: hz1 + 0.7, sx: 4, sy: 0.12, sz: 0.2, color: '#ffe2ae' });

  // what shows that it floats: the glow of its lifting engines at its points, a ring of cloud round its waist, and a pool of cold light far below
  k.glows.push({ x: tip[0], y: tip[1] - 0.3, z: tip[2], sx: 0.9, sy: 0.5, sz: 0.9, color: '#bfe8ff' });
  for (const c of crags.filter((_, i) => i % 2 === 0)) k.glows.push({ x: c[0], y: c[1] - 0.2, z: c[2], sx: 0.45, sy: 0.3, sz: 0.45, color: '#9ad0ff' });
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + 0.2, d = R * (0.88 + 0.08 * Math.sin(i * 2.7)), sz2 = 0.8 + 0.4 * Math.abs(Math.sin(i * 1.9));
    const y = TOP - 1.3 - 0.9 * Math.abs(Math.sin(i * 1.3));
    const px = cx + Math.cos(a) * d, pz = cz + Math.sin(a) * d;
    b.cyl(px, pz, y - 0.45 * sz2, y, 0.35 * sz2, 1.1 * sz2, 7, CLOUD_LOW, { cap: false, phase: a });
    b.cyl(px, pz, y, y + 0.65 * sz2, 1.1 * sz2, 0.3 * sz2, 7, CLOUD, { cap: CLOUD, phase: a });
  }
  k.lights.push({ x: cx, z: cz, r: 12, color: COLD, k: 0.45 });
  // its name, on its rim, and a few of the Proctors' people on the court
  nameBoard(k, 'canyon-olympus', cx + R * 0.48, cz + R * 0.48, TOP + 0.04, TO_VIEW, 1.4);
  for (const [px, pz] of [[cx + 1.4, cz + 2.6], [cx - 1.2, cz + 3.6], [cx - 2.6, cz + 4.4]]) k.person(px, pz, TOP + 0.04);
};

// ---------------------------------------------------------------------------
// The plateau: pines and rocks on the green, snowy rocks in the snow
// ---------------------------------------------------------------------------

/** A squat lump of rock: a five-sided frustum, its top white where snow lies. */
function boulder(b: GeoBuilder, x: number, y: number, z: number, s: number, turn: number, color: number, snowy: boolean): void {
  b.cyl(x, z, y - 0.35, y + 0.55 * s, 0.9 * s, 0.55 * s, 5, color, { phase: turn, cap: snowy ? 0xf2f5f8 : tint(color, 1.12) });
  if (s > 0.9) b.cyl(x + 0.5 * s, z - 0.35 * s, y - 0.3, y + 0.32 * s, 0.55 * s, 0.32 * s, 5, tint(color, 0.9), { phase: turn + 1, cap: snowy ? 0xf2f5f8 : tint(color, 1.05) });
}

function plateau(k: Build): void {
  const b = k.b, r = rng(90517);
  const zone = LANDINGS.plateau;
  let pines = 0, rocks = 0;
  for (let tries = 0; tries < 2400 && (pines < 64 || rocks < 84); tries++) {
    const x = -101 + r() * 202, z = -111 + r() * 54;
    // the plateau beyond the rim road, and the dome's shoulders past the hairpins
    if (z > -90 && Math.abs(x) < 84) continue;
    if (x > zone.x0 - 2 && x < zone.x1 + 2 && z > zone.z0 - 2 && z < zone.z1 + 2) continue;
    const y = landAt(x, z);
    if (y < 7 || !open(x, z, 1.4)) continue;
    const snowy = snowAt(x, z, y) > 0.55;
    const kind = r();
    if (kind < 0.6 && pines < 64 && !snowy) {
      const s = 0.42 + r() * 0.32;
      if (s * 9 > underBoards(x, z)) continue;
      k.tree(x, z, s, true, y - 0.1);
      pines++;
    } else if (rocks < 84) {
      const s = 0.6 + r() * 0.9;
      boulder(b, x, y, z, s, r() * 6, ROCKS[Math.floor(r() * ROCKS.length)], snowy);
      rocks++;
    }
  }
}

// ---------------------------------------------------------------------------
// What this file hands over
// ---------------------------------------------------------------------------

/** A model for each lot this file builds, by the id of the lot in plan.ts. */
export const MODELS: Record<string, Model> = {
  'canyon-wall': canyonWall,
  depot,
  institute,
  'guns-w': guns,
  'guns-e': guns,
  olympus,
};
/** Lots built as part of another lot's model or by `extras`, which get no box either. */
export const COVERS: string[] = [];

const roadSign = (id: string, text: string): SignDef => ({ id, lines: [text], color: '#262a30', ink: '#f0c060', aspect: 4.2, kind: 'board', size: [176, 42] });

/** Every sign this file hangs. Each id begins with this file's name and a hyphen. */
export const SIGNS: SignDef[] = [
  nameSign('canyon-valles-marineris', 'Valles Marineris'),
  nameSign('canyon-drone-depot', 'Drone Depot'),
  nameSign('canyon-the-institute', 'The Institute'),
  nameSign('canyon-olympus', 'Olympus'),
  roadSign('canyon-north-gate', 'NORTH GATE'),
];

/** Whatever this file builds that is not one of the plan's lots. */
export function extras(k: Build): void {
  theFall(k);
  theBridge(k);
  roadFurniture(k);
  plateau(k);
}
