// The riverlands: Harrenhal on the Gods Eye's east shore, the Isle of Faces in
// the lake, Riverrun where the Tumblestone meets the Red Fork, the bridge over
// the Trident below it, and the tourney ground between Harrenhal and the
// goldroad, where the collector's own cars are shown.
//
// Everything is drawn from the books' plain descriptions, as the research
// notes give them, and is this tile's own drawing.

import * as THREE from 'three';
import { interior, rng, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { area, flat, rect, walls, water } from '../../engine/ground';
import { archway, figure, lathe, roundel } from '../../engine/parts';
import { face3, prism, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { BANK, FRESH, GRASS } from './land';
import {
  DARK, HOUSE, IRONWORK, LANCETS, LOOPS, LOOPS_CLOSE, ROOF, STONE, TIMBER, TIMBER_DARK,
  banner, brazier, fire, nameBoard, nameSign, roundTower, squareTower, weirwood,
} from './look';
import type { Model } from './models';
import { BRIDGES, HERO_SPOTS, RIVERS, lotOf, type Lot, type P2 } from './plan';
import { MIDDLES } from './roads';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const hash = (s: string): number => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
const sub = (a: V3, c: V3): V3 => [a[0] - c[0], a[1] - c[1], a[2] - c[2]];
const cross = (a: V3, c: V3): V3 => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
const dot = (a: V3, c: V3): number => a[0] * c[0] + a[1] * c[1] + a[2] * c[2];
const unit = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const lerp3 = (a: V3, c: V3, t: number): V3 => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t];

/** A face of four corners that need not lie in one plane: its normal is worked out from its corners and turned towards `out`. */
function face4(b: GeoBuilder, p0: V3, p1: V3, p2: V3, p3: V3, out: V3, color: number): void {
  let n = unit(cross(sub(p2, p0), sub(p3, p1)));
  if (dot(n, out) < 0) n = [-n[0], -n[1], -n[2]];
  b.quad(p0, p1, p2, p3, n, color);
}

/** A rounded lump: of fused stone, of straw, of anything. */
function blob(b: GeoBuilder, x: number, y: number, z: number, s: number, color: number, sides = 5): void {
  lathe(b, x, z, [[0.03, y - 0.7 * s], [s, y - 0.12 * s], [0.03, y + 0.75 * s]], sides, color);
}

/** A thin triangle of cloth on a staff, flying east: a pennon. Seen from both sides. */
function pennon(b: GeoBuilder, x: number, z: number, y: number, staff: number, color: number, len = 1.3): void {
  b.cyl(x, z, y, y + staff, 0.07, 0.05, 4, 0xd8d2c4, { cap: false });
  const t = y + staff - 0.1;
  for (const s of [-1, 1]) face3(b, [x + 0.05, t, z + s * 0.02], [x + 0.05, t - 0.6, z + s * 0.02], [x + 0.05 + len, t - 0.3, z + s * 0.02], [0, 0, s], color);
}

/** A horse standing, in a caparison of `cloth`, its nose along (cos yaw, sin yaw). A few boxes. */
function horse(b: GeoBuilder, x: number, z: number, yaw: number, coat: number, cloth: number): void {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const at = (f: number, y: number, side = 0): V3 => [x + c * f - s * side, y, z + s * f + c * side];
  for (const [f, side] of [[0.55, 0.2], [0.55, -0.2], [-0.55, 0.2], [-0.55, -0.2]]) {
    const p = at(f, 0, side);
    b.box(p[0] - 0.08, 0, p[2] - 0.08, p[0] + 0.08, 0.95, p[2] + 0.08, 0x3a2e26, { faces: 'NESW' });
  }
  b.obox(x, 1.3, z, 0.78, 0.36, 0.3, yaw, coat);
  // the cloth over it, hanging to the knee
  b.obox(x - c * 0.05, 1.05, z - s * 0.05, 0.72, 0.36, 0.34, yaw, cloth, { faces: 'B' });
  b.beam(at(0.6, 1.45), at(1.0, 2.15), 0.17, 0.14, coat);
  b.beam(at(0.95, 2.2), at(1.4, 1.85), 0.15, 0.1, coat);
  b.beam(at(-0.75, 1.5), at(-0.98, 0.85), 0.08, 0.05, 0x2a221c);
}

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------

export const SIGNS: SignDef[] = [
  nameSign('riverlands-harrenhal', 'Harrenhal'),
  nameSign('riverlands-riverrun', 'Riverrun'),
  nameSign('riverlands-tourney', 'Tourney ground'),
];

// ---------------------------------------------------------------------------
// Harrenhal
// ---------------------------------------------------------------------------
//
// The largest castle in the Seven Kingdoms, and a ruin: black stone that
// dragonfire melted, so that its five towers slumped and ran like candles.
// Its curtain walls are cliffs, with a walk a cart could drive along, and its
// gatehouse in the south wall would be another castle's keep. It is nearly
// empty: a few lights only.

const HH = { black: STONE.black, shade: STONE.blackShade, glaze: 0x2b282f, scorch: 0x1d1b1f, inside: 0x1f1d21, ash: 0x5d5750 };
/** Arrow loops far apart, and very few of them lit: Harrenhal is nearly empty. */
const HH_LOOPS: WinSpec = { cell: 5.6, storey: 4.2, lit: 0.12, kind: 6 };
/** The wall's body, which carries the loops, ends at two storeys; the band above it carries the walk. */
const HH_BODY = 8.4, HH_WALK = 9.9;

/** Where the gate is: between the second tower and the Kingspyre, in the south wall. */
function hhGate(): { x: number; half: number } {
  return { x: (lotOf('hh-t2').x1 + lotOf('hh-kingspyre').x0) / 2, half: 2 };
}

/** One of Harrenhal's four curtain walls, and on the north and south walls the bastions at their ends. The south wall has the gatehouse. */
function hhWall(k: Build, l: Lot): void {
  const b = k.b, side = l.id.slice(-1), R = rng(hash(l.id));
  const N = lotOf('hh-wall-n'), S = lotOf('hh-wall-s');
  const alongX = side === 'n' || side === 's';
  const out = side === 'n' || side === 'w' ? -1 : 1;
  // the east and west walls run between the north and the south
  const lo = alongX ? l.x0 : N.z1, hi = alongX ? l.x1 : S.z0;
  const cLo = alongX ? l.z0 : l.x0, cHi = alongX ? l.z1 : l.x1;
  const cOut = out < 0 ? cLo : cHi, cIn = out < 0 ? cHi : cLo;
  const P = (a: number, y: number, c: number): V3 => (alongX ? [a, y, c] : [c, y, a]);
  const outerF = alongX ? (out < 0 ? 'N' : 'S') : out < 0 ? 'W' : 'E';
  const innerF = alongX ? (out < 0 ? 'S' : 'N') : out < 0 ? 'E' : 'W';
  const F = (s: string): string =>
    (s.includes('o') ? outerF : '') + (s.includes('i') ? innerF : '') + (s.includes('e') ? (alongX ? 'EW' : 'NS') : '') + (s.includes('t') ? 'T' : '') + (s.includes('b') ? 'B' : '');
  const bx = (a0: number, a1: number, y0: number, y1: number, c0: number, c1: number, color: number, faces: string, win?: WinSpec, top?: number): void => {
    const [p, q] = [Math.min(c0, c1), Math.max(c0, c1)];
    if (alongX) b.box(a0, y0, p, a1, y1, q, color, { faces: F(faces), win, top, seed: a0 * 0.13 + p * 0.07 });
    else b.box(p, y0, a0, q, y1, a1, color, { faces: F(faces), win, top, seed: a0 * 0.13 + p * 0.07 });
  };
  const outN: V3 = alongX ? [0, 0, out] : [out, 0, 0];

  const gate = side === 's' ? hhGate() : null;
  const spans: [number, number][] = gate ? [[lo, gate.x - gate.half], [gate.x + gate.half, hi]] : [[lo, hi]];
  const ends = alongX ? 'e' : '';
  for (const [s0, s1] of spans) {
    // the body, with loops, and the band above it that carries the walk, a little proud of the face
    bx(s0, s1, 0, HH_BODY, cLo, cHi, HH.black, 'oi' + ends, HH_LOOPS);
    bx(s0, s1, HH_BODY, HH_WALK, cOut + out * 0.22, cIn, HH.black, 'oitb' + ends, undefined, HH.shade);
    // the inner parapet, low and unbroken
    bx(s0, s1, HH_WALK, HH_WALK + 0.55, cIn, cIn + out * 0.32, HH.black, 'oit' + ends, undefined, HH.shade);
    // merlons on the outer edge, some of them melted away
    const edge = cOut + out * 0.22;
    for (let a = s0 + 1.3; a < s1 - 0.9; a += 2.6) {
      if (a < lo + 2.4 || a > hi - 2.4) continue;
      const roll = R();
      if (roll < 0.14) blob(b, ...P(a, HH_WALK + 0.15, edge - out * 0.3), 0.55, HH.glaze);
      else if (roll < 0.2) continue;
      else bx(a - 0.6, a + 0.6, HH_WALK, l.top, edge, edge - out * 0.55, HH.black, 'oiet', undefined, HH.shade);
    }
    // the talus at its foot, which makes it a cliff
    const foot = cOut + out * 1.4, ty = 2.6, len = Math.hypot(1.4, ty);
    const tn: V3 = alongX ? [0, 1.4 / len, (out * ty) / len] : [(out * ty) / len, 1.4 / len, 0];
    b.quad(P(s0, 0, foot), P(s1, 0, foot), P(s1, ty, cOut), P(s0, ty, cOut), tn, HH.shade);
    for (const [a, sg] of [[s0, -1], [s1, 1]] as const) face3(b, P(a, 0, cOut), P(a, 0, foot), P(a, ty, cOut), alongX ? [sg, 0, 0] : [0, 0, sg], HH.shade);
    // scorch: tall dark stains where the fire ran down the stone
    const face = cOut + out * 0.03;
    for (let n = 0; n < Math.round((s1 - s0) / 9); n++) {
      const a = s0 + 2 + R() * (s1 - s0 - 4), w = 0.4 + R() * 0.7, y0 = 2.8 + R() * 3;
      b.quad(P(a - w, y0, face), P(a + w, y0, face), P(a + w * 0.6, HH_BODY - 0.05, face), P(a - w * 0.6, HH_BODY - 0.05, face), outN, HH.scorch);
    }
    // where the stone ran: runs of fused rock down the face from the walk
    for (let n = 0; n < Math.round((s1 - s0) / 14); n++) {
      const a = s0 + 2 + R() * (s1 - s0 - 4), y1 = 4.5 + R() * 2.5, c = cOut + out * 0.3;
      b.sweep([P(a, HH_WALK - 0.1, c + out * 0.05), P(a + 0.15, (HH_WALK + y1) / 2, c), P(a + 0.05, y1, c - out * 0.05)], [0.34, 0.28, 0.2], HH.glaze);
      blob(b, ...P(a + 0.05, y1 - 0.1, c), 0.36, HH.glaze);
    }
  }

  // bastions at the corners: the north and south walls build them
  if (alongX) {
    for (const [a, sa] of [[lo, -1], [hi, 1]] as const) hhBastion(k, a - sa * 0.4, cOut - out * 0.4, sa, out, R);
  }
  if (gate) hhGatehouse(k, gate.x, S);
}

/** A square bastion on a corner of the curtain wall, reaching out past both walls. `sx` and `sz` say which way is out. */
function hhBastion(k: Build, x: number, z: number, sx: number, sz: number, R: () => number): void {
  const b = k.b, h = 1.9, x0 = x - h, x1 = x + h, z0 = z - h, z1 = z + h;
  b.box(x0, 0, z0, x1, HH_BODY, z1, HH.black, { faces: 'NESW', win: HH_LOOPS, seed: x * 0.1 + z * 0.3 });
  b.box(x0 - 0.15, HH_BODY, z0 - 0.15, x1 + 0.15, 10.25, z1 + 0.15, HH.black, { faces: 'NESWTB', top: HH.shade });
  // two merlons on each outer side, and one of them melted to a lump
  const xo = sx > 0 ? x1 + 0.15 : x0 - 0.15, zo = sz > 0 ? z1 + 0.15 : z0 - 0.15;
  for (const t of [-1.05, 1.05]) {
    if (R() < 0.25) blob(b, x + t, 10.45, zo - sz * 0.35, 0.5, HH.glaze);
    else b.box(x + t - 0.5, 10.25, Math.min(zo, zo - sz * 0.5), x + t + 0.5, 11, Math.max(zo, zo - sz * 0.5), HH.black, { top: HH.shade });
    b.box(Math.min(xo, xo - sx * 0.5), 10.25, z + t - 0.5, Math.max(xo, xo - sx * 0.5), 11, z + t + 0.5, HH.black, { top: HH.shade });
  }
}

/**
 * The gatehouse in the south wall: two drum towers that stand out from the
 * wall, a block between them as deep as a keep, the way through it under a
 * round arch, and the portcullis drawn up. Torches at the gate.
 */
function hhGatehouse(k: Build, gx: number, S: Lot): void {
  const b = k.b;
  const z0 = S.z0 - 3.5, z1 = S.z1 + 0.8, w = 2.8, r = w / 2, spring = 3.4, crown = spring + r, top = 10.4;
  // the two sides of the way, the arch over it, and the block above
  b.box(gx - 2, 0, z0, gx - r, crown, z1, HH.black, { faces: 'NSEW' });
  b.box(gx + r, 0, z0, gx + 2, crown, z1, HH.black, { faces: 'NSEW' });
  archway(b, gx, z0, z1, w, spring, crown, HH.black, HH.inside, 8);
  b.box(gx - 2, crown, z0, gx + 2, top, z1, HH.black, { faces: 'NSEWT', top: HH.shade });
  for (const t of [-1.45, 0, 1.45]) b.box(gx + t - 0.45, top, z1 - 0.5, gx + t + 0.45, 11, z1, HH.black, { top: HH.shade });
  // two arrow slits over the arch, dark
  for (const t of [-0.8, 0.8]) b.box(gx + t - 0.12, 6.2, z1, gx + t + 0.12, 7.8, z1 + 0.04, DARK, { faces: 'S' });
  // the drums
  for (const s of [-1, 1]) {
    const x = gx + s * 2.5, z = S.z1 - 0.4;
    roundTower(b, x, z, 1.9, 10.2, HH.black, { shade: HH.shade, win: HH_LOOPS, sides: 10, seed: x * 0.2 });
  }
  // the portcullis, drawn up so that only its teeth show under the arch: painted lighter than iron looks
  const pz = z1 - 0.5, iron = 0x8e9196, arch = (dx: number): number => spring + Math.sqrt(Math.max(0, r * r - dx * dx));
  for (const dx of [-1.1, -0.55, 0, 0.55, 1.1]) b.box(gx + dx - 0.06, 3.15, pz - 0.06, gx + dx + 0.06, arch(dx) - 0.03, pz + 0.06, iron, { faces: 'NESWB' });
  b.box(gx - 1.28, 3.45, pz - 0.05, gx + 1.28, 3.6, pz + 0.05, iron, { faces: 'NSTB' });
  b.box(gx - 0.95, 4.1, pz - 0.05, gx + 0.95, 4.22, pz + 0.05, iron, { faces: 'NSTB' });
  // the way through, paved, and out to the field
  area(k, rect(gx - r, z0, gx + r, z1 + 1.2), 0x48433d, 0.045);
  // torches either side of the gate
  for (const s of [-1, 1]) {
    b.box(gx + s * 1.75 - 0.08, 3.4, z1, gx + s * 1.75 + 0.08, 3.75, z1 + 0.25, IRONWORK);
    fire(k, gx + s * 1.75, 4.0, z1 + 0.18, 0.26, s < 0 ? 7 : 0);
  }
  // one tattered banner, faded, on the gatehouse
  tattered(b, gx + 1.3, z0 + 2.2, top);
  // a guard in the gate
  k.person(gx - 0.6, z1 + 0.6);
}

/** A banner gone to rags on a staff: what is left of a lord's colours. */
function tattered(b: GeoBuilder, x: number, z: number, y: number): void {
  b.cyl(x, z, y, y + 3.6, 0.09, 0.06, 5, 0x8d877c, { cap: false });
  const t = y + 3.45, cloth = 0x4b4247, rag = 0x6a3a33;
  for (const s of [-1, 1]) {
    const zz = z + s * 0.02, n: V3 = [0, 0, s];
    b.quad([x + 0.08, t - 1.0, zz], [x + 1.3, t - 0.9, zz], [x + 1.3, t, zz], [x + 0.08, t, zz], n, cloth);
    // the fly end, torn into three tails
    face3(b, [x + 1.3, t, zz], [x + 1.3, t - 0.32, zz], [x + 2.1, t - 0.12, zz], n, rag);
    face3(b, [x + 1.3, t - 0.35, zz], [x + 1.3, t - 0.62, zz], [x + 1.8, t - 0.6, zz], n, cloth);
    face3(b, [x + 1.3, t - 0.65, zz], [x + 1.3, t - 0.9, zz], [x + 2.0, t - 1.15, zz], n, rag);
  }
}

interface Melt {
  /** How high the shaft stands whole, with its loops: a whole number of storeys. */
  base: number;
  /** Which way the tower slumped, as an angle round it (0 is east, a quarter turn is south). */
  slump: number;
  /** How far its top fell on that side. */
  drop: number;
  /** How far its top leans that way. */
  lean: number;
  drips: number;
}

/**
 * One of Harrenhal's five towers: a shaft of black stone, whole for its first
 * storeys, and above them melted. The stone bulges and sags to one side as
 * wax does down a candle, the top is broken off unevenly and lower on that
 * side, runs of fused rock hang down its flanks, lumps of it cling there, and
 * cracks and gaping holes open into the upper storeys, which are empty: the
 * top is a hollow.
 */
function meltedTower(k: Build, l: Lot, m: Melt): void {
  const b = k.b, R = rng(hash(l.id)), N = 10, M = 5;
  const cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, r = Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2 - 0.6;
  const ang = (j: number): number => Math.PI / N + (((j % N) + N) % N / N) * Math.PI * 2;
  const tw = Array.from({ length: N }, (_, j) => Math.max(0, Math.cos(ang(j) - m.slump)));
  const wob = Array.from({ length: N }, () => R() * 2 - 1);
  const rim = tw.map((w) => l.top - m.drop * w ** 1.5 - R() * 1.2 - (R() < 0.4 ? 1.5 + R() * 2 : 0));
  const hi = Math.max(...rim);
  rim.forEach((y, j) => (rim[j] = y + l.top - hi));
  const lowest = Math.min(...rim);
  const swell = (t: number, j: number): number => 1 + 0.05 * t + 0.15 * wob[j] * t + 0.22 * tw[j] * Math.sin(Math.PI * t * 0.8) - 0.1 * t ** 4;
  const lx = Math.cos(m.slump) * m.lean, lz = Math.sin(m.slump) * m.lean;
  /** A place on the tower's skin, on the line down from its corner `j`, at height `y`, and `out` beyond it. */
  const at = (j: number, y: number, out = 0): V3 => {
    const jj = ((j % N) + N) % N, t = Math.max(0, Math.min(1, (y - m.base) / (rim[jj] - m.base)));
    const rr = r * swell(t, jj) + out, a = ang(jj);
    return [cx + lx * t * t + Math.cos(a) * rr, y, cz + lz * t * t + Math.sin(a) * rr];
  };

  // the foot, a skirt of fallen and fused stone, and the shaft that still stands whole
  b.cyl(cx, cz, 0, 1.5, r + 0.6, r + 0.05, N, HH.shade, { cap: HH.shade });
  b.cyl(cx, cz, 0, m.base, r, r, N, HH.black, { win: HH_LOOPS, seed: cx * 0.17 + cz * 0.05, cap: false });

  // the melted storeys
  const G: V3[][] = [];
  for (let i = 0; i <= M; i++) G.push(Array.from({ length: N }, (_, j) => at(j, m.base + ((rim[j] - m.base) * i) / M, i > 0 && i < M ? (R() - 0.4) * 0.45 : 0)));
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < N; j++) {
      const j2 = (j + 1) % N, p0 = G[i][j], p1 = G[i][j2], p2 = G[i + 1][j2], p3 = G[i + 1][j];
      const mx = (p0[0] + p1[0] + p2[0] + p3[0]) / 4 - cx, mz = (p0[2] + p1[2] + p2[2] + p3[2]) / 4 - cz;
      const fused = i >= 2 && (tw[j] + tw[j2]) / 2 > 0.45;
      face4(b, p0, p1, p2, p3, [mx, 0, mz], fused ? HH.glaze : HH.black);
    }
  }

  // the broken top, and the hollow inside it where the upper storeys were
  const tcx = cx + lx, tcz = cz + lz, fy = lowest - 2.2;
  const inner = G[M].map((p, j): V3 => [tcx + (p[0] - tcx) * 0.7, rim[j] - 0.25, tcz + (p[2] - tcz) * 0.7]);
  const floor = inner.map((p): V3 => [p[0], fy, p[2]]);
  for (let j = 0; j < N; j++) {
    const j2 = (j + 1) % N;
    face4(b, G[M][j], G[M][j2], inner[j2], inner[j], [0, 1, 0], HH.shade);
    const mx = (inner[j][0] + inner[j2][0]) / 2, mz = (inner[j][2] + inner[j2][2]) / 2;
    face4(b, inner[j], inner[j2], floor[j2], floor[j], [tcx - mx, 0, tcz - mz], HH.inside);
    b.up([tcx, fy, tcz], floor[j], floor[j2], DARK);
  }

  // cracks, on the sides the view sees first
  for (let n = 0; n < 2; n++) {
    const j = Math.floor(R() * 4), j2 = (j + 1) % N;
    const i0 = 1 + Math.floor(R() * 2), i1 = Math.min(M, i0 + 2 + Math.floor(R() * 2));
    const pts: V3[] = [];
    for (let i = i0; i <= i1; i++) {
      const p = lerp3(G[i][j], G[i][j2], 0.3 + 0.4 * R());
      const rx = p[0] - cx, rz = p[2] - cz, rl = Math.hypot(rx, rz) || 1;
      pts.push([p[0] + (rx / rl) * 0.06, p[1], p[2] + (rz / rl) * 0.06]);
    }
    for (let i = 0; i + 1 < pts.length; i++) {
      const e = unit(sub(G[i0 + i][j2], G[i0 + i][j])), w = 0.16 - i * 0.03;
      const a = pts[i], c = pts[i + 1];
      face4(b, [a[0] - e[0] * w, a[1], a[2] - e[2] * w], [a[0] + e[0] * w, a[1], a[2] + e[2] * w], [c[0] + e[0] * w * 0.6, c[1], c[2] + e[2] * w * 0.6], [c[0] - e[0] * w * 0.6, c[1], c[2] - e[2] * w * 0.6], [a[0] - cx, 0, a[2] - cz], DARK);
    }
  }
  // gaping holes into the empty storeys
  for (let n = 0; n < 3; n++) {
    const i = M - 1 - Math.floor(R() * 2), j = Math.floor(R() * N), j2 = (j + 1) % N;
    const q = [G[i][j], G[i][j2], G[i + 1][j2], G[i + 1][j]];
    const c = lerp3(lerp3(q[0], q[2], 0.5), lerp3(q[1], q[3], 0.5), 0.5);
    const rx = c[0] - cx, rz = c[2] - cz, rl = Math.hypot(rx, rz) || 1;
    const s = q.map((p): V3 => [c[0] + (p[0] - c[0]) * 0.42 + (rx / rl) * 0.05, c[1] + (p[1] - c[1]) * 0.6, c[2] + (p[2] - c[2]) * 0.42 + (rz / rl) * 0.05]);
    face4(b, s[0], s[1], s[2], s[3], [rx, 0, rz], DARK);
  }
  // runs of fused stone down the flanks, each ending in a drop
  for (let n = 0; n < m.drips; n++) {
    const j = Math.floor(R() * N), y0 = rim[j] - 0.15, y1 = Math.max(m.base + 0.8, y0 - 2.5 - R() * 4.5);
    b.sweep([at(j, y0, 0.08), at(j, (y0 + y1) / 2, 0.12), at(j, y1, 0.1)], [0.3, 0.24, 0.18], HH.glaze);
    const e = at(j, y1, 0.12);
    blob(b, e[0], y1 - 0.1, e[2], 0.34, HH.glaze);
  }
  // lumps of fused stone that cling to it, and two fallen at its foot
  for (let n = 0; n < 4; n++) {
    const j = Math.floor(R() * N), y = m.base * 0.6 + R() * (lowest - 1.5 - m.base * 0.6), p = at(j, y, 0.1);
    blob(b, p[0], y, p[2], 0.5 + R() * 0.45, n % 2 ? HH.glaze : HH.black);
  }
  for (let n = 0; n < 2; n++) {
    const a = R() * Math.PI * 2, d = r + 0.9;
    blob(b, cx + Math.cos(a) * d, 0.3, cz + Math.sin(a) * d, 0.6, HH.shade);
  }
}

const MELTS: Record<string, Melt> = {
  'hh-kingspyre': { base: 12.6, slump: 0.9, drop: 7, lean: 0.8, drips: 4 },
  'hh-t2': { base: 8.4, slump: 2.4, drop: 6, lean: 0.6, drips: 3 },
  'hh-t3': { base: 8.4, slump: 0.25, drop: 7, lean: 0.7, drips: 3 },
  'hh-t4': { base: 8.4, slump: -1.2, drop: 5, lean: 0.5, drips: 2 },
  'hh-t5': { base: 8.4, slump: -2.6, drop: 4.5, lean: 0.5, drips: 2 },
};

/** Two rings of a round shape: a level ring between two radii, and an upright ring wall. */
function ringFlat(b: GeoBuilder, cx: number, cz: number, r0: number, r1: number, y: number, color: number, sides: number): void {
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2;
    b.quad([cx + Math.cos(a0) * r1, y, cz + Math.sin(a0) * r1], [cx + Math.cos(a1) * r1, y, cz + Math.sin(a1) * r1], [cx + Math.cos(a1) * r0, y, cz + Math.sin(a1) * r0], [cx + Math.cos(a0) * r0, y, cz + Math.sin(a0) * r0], [0, 1, 0], color);
  }
}
function ringWall(b: GeoBuilder, cx: number, cz: number, r: number, y0: number, y1: number, color: number, sides: number, inward: boolean): void {
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2, am = (a0 + a1) / 2, s = inward ? -1 : 1;
    b.quad([cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r], [cx + Math.cos(a1) * r, y1, cz + Math.sin(a1) * r], [cx + Math.cos(a0) * r, y1, cz + Math.sin(a0) * r], [Math.cos(am) * s, 0, Math.sin(am) * s], color);
  }
}

/**
 * Inside Harrenhal's walls: the Hall of a Hundred Hearths with half its roof
 * fallen in, the bear pit, the Flowstone Yard where the ground itself ran,
 * the wild godswood, the stables for a thousand horses half in ruin, and bats
 * round the Kingspyre.
 */
function harrenhalWard(k: Build): void {
  const b = k.b, R = rng(4401);
  const N = lotOf('hh-wall-n'), S = lotOf('hh-wall-s'), Wl = lotOf('hh-wall-w'), E = lotOf('hh-wall-e');
  const t4 = lotOf('hh-t4'), t5 = lotOf('hh-t5'), t2 = lotOf('hh-t2'), ks = lotOf('hh-kingspyre');
  const ward = { x0: Wl.x1, z0: N.z1, x1: E.x0, z1: S.z0 };
  area(k, rect(ward.x0, ward.z0, ward.x1, ward.z1), HH.ash, 0.035);

  // --- the Hall of a Hundred Hearths ---
  const hx0 = t4.x1 + 1, hx1 = t5.x0 - 1, hz0 = ward.z0 + 0.8, hz1 = hz0 + 5.6, th = 0.6, hw = 5.2, hb = 6.3;
  const stone = 0x3d3a40;
  b.box(hx0, 0, hz1 - th, hx1, hw, hz1, stone, { win: { ...LANCETS, lit: 0.12 }, seed: 0.7 });
  b.box(hx0, 0, hz0, hx1, hw, hz0 + th, stone, { win: { ...LANCETS, lit: 0.12 }, seed: 0.9 });
  b.box(hx0, 0, hz0 + th, hx0 + th, hw, hz1 - th, stone, { faces: 'EWT' });
  b.box(hx1 - th, 0, hz0 + th, hx1, hw, hz1 - th, stone, { faces: 'EWT' });
  // the band above the windows: whole at the east end, broken at the west, where the roof fell
  const hm = (hx0 + hx1) / 2 + 0.6;
  b.box(hx0 - 0.1, hw, hz1 - th - 0.1, hx1 + 0.1, hb, hz1 + 0.1, HH.black, { top: HH.shade, faces: 'NESWTB' });
  b.box(hx0 - 0.1, hw, hz0 - 0.1, hx1 + 0.1, hb, hz0 + th + 0.1, HH.black, { top: HH.shade, faces: 'NESWTB' });
  b.box(hx1 - th, hw, hz0 + th + 0.1, hx1 + 0.1, hb, hz1 - th - 0.1, HH.black, { top: HH.shade, faces: 'EWT' });
  b.box(hx0 - 0.1, hw, hz0 + th + 0.1, hx0 + th, hw + 0.6, hz1 - th - 0.1, HH.black, { top: HH.shade, faces: 'EWT' });
  // the roof that still stands, over the east half, and its gable
  const zc = (hz0 + hz1) / 2, ridge = hb + 2.6, xmid = (hm + hx1 + 0.3) / 2, halfx = (hx1 + 0.3 - hm) / 2;
  slab(b, [xmid, hb + 0.05, hz1 + 0.45], [xmid, ridge, zc], halfx, 0.2, ROOF.slate, { under: TIMBER_DARK });
  slab(b, [xmid, hb + 0.05, hz0 - 0.45], [xmid, ridge, zc], halfx, 0.2, ROOF.slate, { under: TIMBER_DARK });
  for (const [x, nx] of [[hx1 + 0.02, 1], [hx1 - th - 0.02, -1]] as const) face3(b, [x, hb, hz0 + 0.1], [x, hb, hz1 - 0.1], [x, ridge - 0.25, zc], [nx, 0, 0], HH.black);
  // what is left of the roof's timbers over the west half, and one fallen
  for (let x = hx0 + 1.2; x < hm - 0.3; x += 1.5) {
    if (R() < 0.3) continue;
    b.beam([x, hb + 0.1, hz1 - 0.1], [x, ridge - 0.2, zc], 0.09, 0.09, TIMBER_DARK);
    if (R() < 0.6) b.beam([x, hb + 0.1, hz0 + 0.1], [x, ridge - 0.2, zc], 0.09, 0.09, TIMBER_DARK);
  }
  b.beam([hx0 + 2.4, 0.2, hz0 + 1.4], [hx0 + 4.4, 3.6, zc + 0.6], 0.1, 0.1, TIMBER_DARK);
  // its floor, strewn with fallen slate and stone
  area(k, rect(hx0 + th + 0.05, hz0 + th + 0.05, hx1 - th - 0.05, hz1 - th - 0.05), 0x403b37, 0.05);
  for (let n = 0; n < 6; n++) blob(b, hx0 + 1.2 + R() * (hm - hx0 - 2), 0.2, hz0 + 1.3 + R() * (hz1 - hz0 - 2.6), 0.35 + R() * 0.3, n % 2 ? ROOF.slate : HH.shade);
  // the hundred hearths' chimneys, along both long sides; some broken short
  for (const [z, zs, face] of [[hz1, 1, 'ESWT'], [hz0, -1, 'NEWT']] as const) {
    for (let x = hx0 + 0.9; x < hx1 - 0.5; x += 1.65) {
      const h = R() < 0.2 ? 5.6 + R() * 1.2 : 8.0 + R() * 1.3;
      const zz0 = zs > 0 ? z + 0.1 : z - 0.55, zz1 = zs > 0 ? z + 0.55 : z - 0.1;
      b.box(x - 0.36, 0, zz0, x + 0.36, h, zz1, 0x34313a, { faces: face, top: DARK });
    }
  }
  // its door, open, with a little light inside
  b.box(hm - 0.8, 0, hz1 + 0.12, hm + 0.8, 2.7, hz1 + 0.16, DARK, { faces: 'S', win: interior(0.45) });
  k.lights.push({ x: hm, z: hz1 + 2, r: 9, color: '#ffcf8a', k: 0.4 });

  // --- the bear pit: a round sunken ring of stone tiers ---
  const bxc = (hx0 + hx1) / 2 + 1.6, bzc = (hz1 + ks.z0) / 2 - 0.1, sides = 14, pit = 0x46424a;
  ringWall(b, bxc, bzc, 2.8, 0, 1.2, pit, sides, false);
  ringFlat(b, bxc, bzc, 2.25, 2.8, 1.2, HH.shade, sides);
  ringWall(b, bxc, bzc, 2.25, 0.85, 1.2, pit, sides, true);
  ringFlat(b, bxc, bzc, 1.7, 2.25, 0.85, HH.shade, sides);
  ringWall(b, bxc, bzc, 1.7, 0.5, 0.85, pit, sides, true);
  ringFlat(b, bxc, bzc, 1.2, 1.7, 0.5, HH.shade, sides);
  ringWall(b, bxc, bzc, 1.2, 0.06, 0.5, pit, sides, true);
  flat(b, Array.from({ length: sides }, (_, i): P2 => [bxc + Math.cos((i / sides) * Math.PI * 2) * 1.2, bzc + Math.sin((i / sides) * Math.PI * 2) * 1.2]), 0.07, 0xa48d68);

  // --- the Flowstone Yard: where the paving itself ran and set, glossy black ---
  const flows: [number, number, number][] = [[hx0 + 1.6, hz1 + 2.6, 1.7], [hx0 + 3.8, ks.z0 - 1.5, 1.4], [bxc + 3.6, hz1 + 1.4, 1.1]];
  for (const [fx, fz, fr] of flows) {
    const shape = (s: number): P2[] => Array.from({ length: 11 }, (_, i): P2 => {
      const a = (i / 11) * Math.PI * 2, w = s * fr * (0.8 + 0.35 * Math.sin(a * 3 + fx));
      return [fx + Math.cos(a) * w * 1.3, fz + Math.sin(a) * w];
    });
    area(k, shape(1), 0x34343f, 0.055);
    area(k, shape(0.6), 0x494a5a, 0.07);
    area(k, shape(0.28), 0x5f6178, 0.085);
  }

  // --- the godswood: wild trees in the west of the ward, round a weirwood ---
  const gx0 = ward.x0 + 0.4, gx1 = t4.x0 - 1.1, gz0 = ward.z0 + 0.4, gz1 = t2.z0 - 0.6;
  area(k, rect(gx0, gz0, gx1, gz1), 0x587545, 0.05);
  weirwood(k, (gx0 + gx1) / 2, gz0 + (gz1 - gz0) * 0.45, 0, 0.55);
  for (let n = 0; n < 9; n++) {
    const z = gz0 + 0.8 + R() * (gz1 - gz0 - 1.6), x = gx0 + 0.6 + R() * (gx1 - gx0 - 1.2);
    if (Math.abs(z - (gz0 + (gz1 - gz0) * 0.45)) < 2) continue;
    k.tree(x, z, 0.4 + R() * 0.25, R() < 0.3);
  }

  // --- the stables, for a thousand horses: a long range on the north wall, half its roof gone ---
  const sx0 = t5.x0 - 0.6, sx1 = ward.x1 - 0.3, sz0 = ward.z0 + 0.3, sz1 = sz0 + 2.3, sm = (sx0 + sx1) / 2;
  b.box(sx0, 0, sz0, sx1, 2.7, sz0 + 0.35, HH.black, { faces: 'NESWT', top: HH.shade });
  for (const x of [sx0, sx1 - 0.35]) b.box(x, 0, sz0 + 0.35, x + 0.35, 2.3, sz1, HH.black, { faces: 'NESWT', top: HH.shade });
  for (let x = sx0 + 1.5; x < sx1 - 0.6; x += 1.5) {
    b.box(x - 0.05, 0, sz0 + 0.35, x + 0.05, 1.3, sz1 - 0.3, TIMBER, { faces: 'EWTS' });
    b.box(x - 0.1, 0, sz1 - 0.2, x + 0.1, 2.3, sz1, TIMBER, { faces: 'NESW' });
  }
  slab(b, [(sm + sx1) / 2, 2.85, sz0 + 0.1], [(sm + sx1) / 2, 2.2, sz1 + 0.35], (sx1 - sm) / 2 + 0.1, 0.12, ROOF.shingle, { under: TIMBER_DARK });
  for (let x = sx0 + 0.8; x < sm; x += 1.3) b.beam([x, 2.8, sz0 + 0.2], [x, 2.25, sz1 + 0.2], 0.07, 0.07, TIMBER_DARK);
  area(k, rect(sx0 + 0.35, sz0 + 0.35, sx1 - 0.35, sz1), 0x8f7d55, 0.05);
  horse(b, sx1 - 2.2, sz1 - 0.9, 0, 0x6b4a32, 0x6b4a32);
  blob(b, sx1 - 0.9, 0.35, sz1 - 0.8, 0.55, 0xc9a85a);

  // --- bats, small dark flecks round the Kingspyre's broken top ---
  const kx = (ks.x0 + ks.x1) / 2, kz = (ks.z0 + ks.z1) / 2;
  for (let n = 0; n < 14; n++) {
    const a = R() * Math.PI * 2, d = 3.6 + R() * 2.6, y = ks.top - 7.5 + R() * 6.5;
    const x = kx + Math.cos(a) * d, z = kz + Math.sin(a) * d, s = 0.22, h = (R() - 0.5) * 0.12;
    const tx = -Math.sin(a) * s, tz = Math.cos(a) * s;
    for (const sg of [-1, 1]) {
      face3(b, [x, y, z], [x + tx * sg * 1.6, y + 0.1 + h, z + tz * sg * 1.6], [x + Math.cos(a) * 0.12, y, z + Math.sin(a) * 0.12], [0, 1, 0], 0x151417);
      face3(b, [x, y, z], [x + tx * sg * 1.6, y + 0.1 + h, z + tz * sg * 1.6], [x + Math.cos(a) * 0.12, y, z + Math.sin(a) * 0.12], [0, -1, 0], 0x151417);
    }
  }

  // --- the few who are here, and one brazier inside the gate ---
  const gate = hhGate();
  brazier(k, gate.x, S.z0 - 4.6);
  k.person(gate.x + 1.2, S.z0 - 5.2);
  k.person(hm + 1.5, hz1 + 1.4);
  k.person(sx1 - 3.4, sz1 + 0.5);
  k.lights.push({ x: (ward.x0 + ward.x1) / 2, z: (ward.z0 + ward.z1) / 2 + 3, r: 13, color: '#ffcf8a', k: 0.35 });

  nameBoard(k, 'riverlands-harrenhal', Wl.x0 + 5, S.z1 + 4.8);
}

// ---------------------------------------------------------------------------
// The Isle of Faces
// ---------------------------------------------------------------------------

const ISLE = { x: -53, z: 22, r: 3.5, top: 1.3 };

function isleOfFaces(k: Build): void {
  const b = k.b, sides = 12, R = rng(777);
  const ring = (r: number): P2[] => Array.from({ length: sides }, (_, i): P2 => {
    const a = Math.PI / sides + (i / sides) * Math.PI * 2;
    return [ISLE.x + Math.cos(a) * r, ISLE.z + Math.sin(a) * r];
  });
  walls(b, ring(ISLE.r), -1.6, 0.2, 0x8a7d62);
  lathe(b, ISLE.x, ISLE.z, [[ISLE.r, 0.2], [ISLE.r * 0.72, 0.85], [ISLE.r * 0.38, 1.18], [0.02, ISLE.top]], sides, 0x6f9a52);
  // the grove: weirwoods with their faces cut in them, and no one among them
  const grove: [number, number, number][] = [[0, 0, 0.8], [1.6, 0.9, 0.6], [-1.5, 1.1, 0.55], [0.6, -1.7, 0.65], [-1.4, -1.2, 0.5]];
  for (const [dx, dz, s] of grove) {
    const x = ISLE.x + dx, z = ISLE.z + dz;
    weirwood(k, x, z, isleHeight(x, z) - 0.05, s + R() * 0.04);
  }
}

function isleHeight(x: number, z: number): number {
  const d = Math.hypot(x - ISLE.x, z - ISLE.z) / ISLE.r;
  if (d >= 1) return 0;
  return 0.2 + (ISLE.top - 0.2) * Math.max(0, 1 - d * d * 0.95);
}

// ---------------------------------------------------------------------------
// Riverrun
// ---------------------------------------------------------------------------
//
// The castle of the Tullys, where the Tumblestone, coming from the north-west,
// meets the Red Fork, coming from the south-west: three-sided, like a great
// ship with its prow to the east, downstream. Its red sandstone walls rise
// sheer from the water on two sides, and on the third a moat cut between the
// rivers makes it an island. The Water Gate is a great arch in the wall
// through which boats row in, under a portcullis; the Wheel Tower has its
// water wheel in the stream.

const RR = {
  sand: 0xa8705a, shade: 0x8c5a47, plinth: 0x6a4a3e, soffit: 0x5a3c31, court: 0xb99a82,
  wall: 8.4, court_y: 0.45, th: 1.1,
};

interface Opening { u0: number; u1: number; floor: number; spring: number; water?: boolean }

/**
 * One side of Riverrun's curtain wall, from `A` to `B` along its outer face,
 * with the inner face between the inner corners `iA` and `iB`. The wall is
 * walked round so that outside is on the left: (-dz, dx). It rises from below
 * the water, has a walk on top with battlements on both edges, and is cut by
 * the openings given, which are measured along its outer face.
 */
function curtain(k: Build, A: P2, B: P2, iA: P2, iB: P2, ops: Opening[]): void {
  const b = k.b, dx = B[0] - A[0], dz = B[1] - A[1], L = Math.hypot(dx, dz), tx = dx / L, tz = dz / L;
  const loc = (p: P2): number => (p[0] - A[0]) * tx + (p[1] - A[1]) * tz;
  const a = loc(iA), c = loc(iB), th = RR.th, top = RR.wall, CL = RR.court_y;
  /** What is left of [s, e] once the openings are cut out of it. */
  const cut = (s: number, e: number, o: Opening[]): [number, number][] => {
    let out: [number, number][] = [[s, e]];
    for (const op of o) out = out.flatMap(([p, q]): [number, number][] => (op.u1 <= p || op.u0 >= q ? [[p, q]] : [[p, op.u0], [op.u1, q]].filter(([m, n]) => n - m > 0.01) as [number, number][]));
    return out;
  };
  b.moved(A[0], 0, A[1], Math.atan2(tz, tx), () => {
    // the outer face, and the masonry at its foot that the water has stained
    for (const [s, e] of cut(0, L, ops)) {
      b.quad([s, 0, 0], [e, 0, 0], [e, top, 0], [s, top, 0], [0, 0, 1], RR.sand, { win: LOOPS, u0: s, u1: e, L, seed: A[0] * 0.3 });
      b.box(s, -1.6, 0, e, 0.25, 0.14, RR.plinth, { faces: 'SEWT' });
    }
    // the inner face, to the court, unbroken but for a gate the court opens into
    for (const [s, e] of cut(a, c, ops.filter((o) => !o.water))) b.quad([s, CL, -th], [e, CL, -th], [e, top, -th], [s, top, -th], [0, 0, -1], RR.sand, { win: LOOPS, u0: s, u1: e, L, seed: A[1] * 0.3 });
    // the walk, and battlements along both its edges
    b.quad([0, top, 0], [L, top, 0], [c, top, -th], [a, top, -th], [0, 1, 0], RR.shade);
    for (let u = 1.9; u < L - 1.8; u += 1.9) b.box(u - 0.4, top, -0.32, u + 0.4, top + 0.75, 0, RR.sand, { faces: 'NESWT', top: RR.shade });
    b.box(a + 0.3, top, -th, c - 0.3, top + 0.5, -th + 0.28, RR.sand, { faces: "NESWT", top: RR.shade });
    // the openings
    for (const op of ops) {
      const w = op.u1 - op.u0, r = w / 2, um = (op.u0 + op.u1) / 2, crown = op.spring + r;
      const back = op.water ? -th + 0.03 : -th;
      archway(b, um, back, 0, w, op.spring, crown, RR.sand, RR.soffit, 8);
      b.box(op.u0, crown, -th, op.u1, top, 0, RR.sand, { faces: op.water ? 'S' : 'NS', win: LOOPS, seed: um });
      for (const [u, n] of [[op.u0, 1], [op.u1, -1]] as const) b.quad([u, op.floor, 0], [u, op.floor, back], [u, op.spring, back], [u, op.spring, 0], [n, 0, 0], RR.sand);
      if (op.water) {
        // the way in is dark: a boat rows into the castle's own water stair
        b.quad([op.u0, -1.6, back], [op.u1, -1.6, back], [op.u1, crown, back], [op.u0, crown, back], [0, 0, 1], DARK, { win: interior(0.25) });
        // the portcullis, drawn half up: painted rust, and lighter than rust looks
        const arch = (du: number): number => op.spring + Math.sqrt(Math.max(0, r * r - du * du));
        for (let du = -r + 0.35; du < r - 0.3; du += 0.5) b.box(um + du - 0.06, 1.05, -0.42, um + du + 0.06, arch(du) - 0.03, -0.3, 0xb4806a, { faces: 'NESWB' });
        b.box(op.u0 + 0.05, 1.35, -0.42, op.u1 - 0.05, 1.48, -0.3, 0xb4806a, { faces: 'NSTB' });
        for (const u of [op.u0 - 0.35, op.u1 + 0.35]) b.box(u - 0.08, 2.4, 0, u + 0.08, 2.7, 0.25, IRONWORK);
      } else {
        // the sill under a gate, and the floor of the way through
        b.quad([op.u0, 0, 0], [op.u1, 0, 0], [op.u1, op.floor, 0], [op.u0, op.floor, 0], [0, 0, 1], RR.sand);
        b.box(op.u0, -1.6, 0, op.u1, 0.25, 0.14, RR.plinth, { faces: 'ST' });
        b.quad([op.u0, op.floor, 0], [op.u1, op.floor, 0], [op.u1, op.floor, -th], [op.u0, op.floor, -th], [0, 1, 0], 0x8b7764);
      }
    }
  });
}

/** A round tower of Riverrun, rising from the water: its foot of stained masonry, and above it the shaft. */
function rrTower(b: GeoBuilder, x: number, z: number, r: number, top: number, cone?: number): void {
  b.cyl(x, z, -1.6, 0.25, r + 0.14, r + 0.14, 8, RR.plinth, { cap: RR.plinth });
  roundTower(b, x, z, r, top, RR.sand, { y0: 0.25, shade: RR.shade, win: LOOPS, sides: 8, cone: cone ? { color: ROOF.slate, h: cone } : undefined });
}

/** A rowing boat on the water, its bow along (cos yaw, sin yaw). Its hull reaches well under the surface. */
function boat(k: Build, x: number, z: number, yaw: number, rower: boolean): void {
  const b = k.b, c = Math.cos(yaw), s = Math.sin(yaw), wood = 0x7a5638;
  b.obox(x, -0.85, z, 1.0, 0.35, 0.45, yaw, wood, { top: 0x4e3826 });
  const P = (f: number, y: number, side: number): V3 => [x + c * f - s * side, y, z + s * f + c * side];
  // the bow, to a point
  for (const sg of [-1, 1]) {
    const n: V3 = [c * 0.67 - s * sg * 0.74, 0, s * 0.67 + c * sg * 0.74];
    face3(b, P(1.0, -0.5, sg * 0.45), P(1.0, -1.2, sg * 0.45), P(1.6, -0.45, 0), n, wood);
    face3(b, P(1.0, -1.2, sg * 0.45), P(1.6, -0.45, 0), P(1.0, -1.2, 0), n, wood);
  }
  face3(b, P(1.0, -0.5, -0.45), P(1.0, -0.5, 0.45), P(1.6, -0.45, 0), [0, 1, 0], 0x4e3826);
  if (!rower) return;
  k.person(x - c * 0.2, z - s * 0.2, -0.5);
  for (const sg of [-1, 1]) b.beam(P(-0.1, 0.4, sg * 0.3), P(0.4, -0.75, sg * 1.5), 0.04, 0.04, 0xc9b28a);
}

/** A clump of reeds at the water's edge. */
function reeds(b: GeoBuilder, x: number, z: number, seed: number, n = 11): void {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = R() * 1.1, h = 0.9 + R() * 0.7;
    b.cyl(x + Math.cos(a) * d, z + Math.sin(a) * d, -0.7, h, 0.08, 0.01, 3, i % 3 ? 0x7f8f4a : 0x9a8f52, { cap: false });
  }
}

/**
 * The water wheel on the Wheel Tower: two rims of timber with paddles between
 * them, spokes and a hub, standing in the stream with its lowest paddles
 * under the water. Built in a frame where the wall runs along x and outside is +z.
 */
function waterWheel(b: GeoBuilder, u: number, yc: number, z0: number, z1: number, r: number): void {
  const n = 8, rim = (z: number): V3[] => Array.from({ length: 9 }, (_, i): V3 => [u + Math.cos((i / 8) * Math.PI * 2) * r, yc + Math.sin((i / 8) * Math.PI * 2) * r, z]);
  for (const z of [z0, z1]) {
    b.sweep(rim(z), new Array(9).fill(0.07), TIMBER);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI + 0.3;
      b.beam([u + Math.cos(a) * r, yc + Math.sin(a) * r, z], [u - Math.cos(a) * r, yc - Math.sin(a) * r, z], 0.05, 0.05, TIMBER_DARK);
    }
  }
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.2, ca = Math.cos(a), sa = Math.sin(a), r0 = r - 0.5, r1 = r + 0.08;
    const q: V3[] = [[u + ca * r0, yc + sa * r0, z0], [u + ca * r1, yc + sa * r1, z0], [u + ca * r1, yc + sa * r1, z1], [u + ca * r0, yc + sa * r0, z1]];
    b.quad(q[0], q[1], q[2], q[3], [-sa, ca, 0], 0x86603f);
    b.quad(q[0], q[1], q[2], q[3], [sa, -ca, 0], 0x86603f);
  }
  b.box(u - 0.14, yc - 0.14, z0 - 1.0, u + 0.14, yc + 0.14, z1 + 0.15, TIMBER_DARK, { faces: 'NESWTB' });
}

function riverrun(k: Build, l: Lot): void {
  const b = k.b, W = l.x1 - l.x0, H = l.z1 - l.z0;
  const at = (u: number, v: number): P2 => [l.x0 + u * W, l.z0 + v * H];
  const WN = at(0.1375, 0.15), WS = at(0.1375, 0.843), PR = at(0.7875, 0.557);
  const tr = RIVERS.trident;
  const zA = tr.line[0][1] - tr.half[0] - 0.1, ch = 3.0;

  // --- the water, and the banks round it ---
  const tNE = [(PR[0] - WN[0]) / Math.hypot(PR[0] - WN[0], PR[1] - WN[1]), (PR[1] - WN[1]) / Math.hypot(PR[0] - WN[0], PR[1] - WN[1])];
  const nNE = [tNE[1], -tNE[0]];
  const sB = (l.z0 - (WN[1] + nNE[1] * ch)) / tNE[1];
  const B: P2 = [WN[0] + nNE[0] * ch + tNE[0] * sB, l.z0];
  const C: P2 = [PR[0] + nNE[0] * ch, PR[1] + nNE[1] * ch];
  const D: P2 = [l.x1 - 0.7, C[1] + 1.2], E: P2 = [l.x1 - 0.7, zA - 0.7], F: P2 = [l.x1, zA];
  const Hh: P2 = [l.x1 - 3, l.z1], I: P2 = [l.x1 - 3.8, l.z1 - 0.55], J: P2 = [l.x0 + 3.6, l.z1 - 0.55], K: P2 = [l.x0 + 2.8, l.z1];
  const river: P2[] = [[l.x0, l.z0], B, C, D, E, F, [l.x1, l.z1], Hh, I, J, K, [l.x0, l.z1]];
  flat(b, rect(l.x0, l.z0, l.x1, l.z1), -1.6, 0x46524a);
  walls(b, river, -1.6, -1.3, BANK, { inward: true });
  water(k, river, { color: FRESH, quay: BANK, drop: 0.7 });
  area(k, [B, [l.x1, l.z0], F, E, D, C], GRASS, 0);
  area(k, [Hh, I, J, K], GRASS, 0);

  // --- the castle: three walls round a triangle, the inner corners worked out from the outer ---
  const sides: [P2, P2][] = [[WS, PR], [PR, WN], [WN, WS]];
  const outward = ([p, q]: [P2, P2]): P2 => {
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    return [-(q[1] - p[1]) / L, (q[0] - p[0]) / L];
  };
  const ns = sides.map(outward);
  const innerAt = (V: P2, n1: P2, n2: P2): P2 => {
    const k2 = 1 + n1[0] * n2[0] + n1[1] * n2[1];
    return [V[0] - (RR.th * (n1[0] + n2[0])) / k2, V[1] - (RR.th * (n1[1] + n2[1])) / k2];
  };
  const iWS = innerAt(WS, ns[2], ns[0]), iPR = innerAt(PR, ns[0], ns[1]), iWN = innerAt(WN, ns[1], ns[2]);
  const len = (p: P2, q: P2): number => Math.hypot(q[0] - p[0], q[1] - p[1]);
  const L1 = len(WS, PR), L3 = len(WN, WS);
  // the Water Gate in the wall on the Red Fork, and the land gate in the wall on the moat
  const wg = L1 * 0.665, gate = L3 / 2;
  curtain(k, WS, PR, iWS, iPR, [{ u0: wg - 1.3, u1: wg + 1.3, floor: -1.6, spring: 1.5, water: true }]);
  curtain(k, PR, WN, iPR, iWN, []);
  curtain(k, WN, WS, iWN, iWS, [{ u0: gate - 1.0, u1: gate + 1.0, floor: RR.court_y, spring: 2.4 }]);
  flat(b, [iWS, iPR, iWN], RR.court_y, RR.court);

  // the towers: one on each corner, the Wheel Tower on the Red Fork, two at the land gate
  for (const [x, z] of [WN, WS, PR]) rrTower(b, x, z, 1.5, 11.2);
  const t1: P2 = [(PR[0] - WS[0]) / L1, (PR[1] - WS[1]) / L1], n1 = ns[0];
  const uW = 3.6, wheel: P2 = [WS[0] + t1[0] * uW + n1[0] * 0.35, WS[1] + t1[1] * uW + n1[1] * 0.35];
  rrTower(b, wheel[0], wheel[1], 1.35, 11.6, 2.6);
  b.moved(WS[0], 0, WS[1], Math.atan2(t1[1], t1[0]), () => {
    waterWheel(b, uW, 0.55, 1.95, 2.5, 1.45);
    // ivy on the Wheel Tower, on its side to the stream
    for (const [du, y0, y1] of [[-0.55, 1.2, 5.5], [0.45, 2.4, 7.2]]) b.quad([uW + du - 0.35, y0, 1.73], [uW + du + 0.35, y0, 1.73], [uW + du + 0.2, y1, 1.73], [uW + du - 0.25, y1, 1.73], [0, 0, 1], 0x4f7a3a);
  });
  const t3: P2 = [(WS[0] - WN[0]) / L3, (WS[1] - WN[1]) / L3], n3 = ns[2];
  for (const s of [-1, 1]) rrTower(b, WN[0] + t3[0] * (gate + s * 2.05) + n3[0] * 0.2, WN[1] + t3[1] * (gate + s * 2.05) + n3[1] * 0.2, 0.95, 9.8);

  // the drawbridge, down, across the moat to the west bank, on its chains
  const G: P2 = [WN[0] + t3[0] * gate, WN[1] + t3[1] * gate], far = l.x0 - 0.35;
  slab(b, [G[0] - 0.05, RR.court_y, G[1]], [far, 0.06, G[1]], 0.95, 0.25, TIMBER, { under: TIMBER_DARK });
  for (const s of [-0.85, 0.85]) b.beam([G[0] - 0.1, 3.0, G[1] + s], [far + 0.3, 0.2, G[1] + s], 0.05, 0.05, 0xb5b7bb);
  for (const s of [-1, 1]) fire(k, G[0] - 0.2, 2.7, G[1] + s * 1.3, 0.22, s < 0 ? 6 : 0);

  // --- inside: the keep, the sept and the godswood ---
  const a = len(WS, PR), bb = len(WN, PR), c = len(WN, WS), P = a + bb + c;
  const Ic: P2 = [(a * WN[0] + bb * WS[0] + c * PR[0]) / P, (a * WN[1] + bb * WS[1] + c * PR[1]) / P];
  squareTower(b, Ic[0], Ic[1], 1.3, l.top - 0.8, RR.sand, { y0: RR.court_y, shade: RR.shade, win: LOOPS_CLOSE });
  banner(b, Ic[0], Ic[1], l.top - 0.8, 'tully', 3.6);
  const sept: P2 = [Ic[0] + (iWN[0] - Ic[0]) * 0.7, Ic[1] + (iWN[1] - Ic[1]) * 0.7];
  b.cyl(sept[0], sept[1], RR.court_y, 3.0, 0.55, 0.55, 7, 0xe2d6c0, { win: { ...LANCETS, cell: 0.9 }, cap: false });
  lathe(b, sept[0], sept[1], [[0.72, 3.0], [0.4, 3.7], [0.03, 4.6]], 7, ROOF.lead);
  const gw: P2 = [Ic[0] + (iPR[0] - Ic[0]) * 0.52, Ic[1] + (iPR[1] - Ic[1]) * 0.52];
  flat(b, [lerp2(Ic, iPR, 0.3, iWS, 0.25), iPR, lerp2(Ic, iPR, 0.3, iWN, 0.25)], RR.court_y + 0.03, 0x6d9550);
  weirwood(k, gw[0], gw[1], RR.court_y, 0.34);
  k.tree(gw[0] + 1.0, gw[1] + 0.2, 0.3, false, RR.court_y);

  // the Tully colours on the prow tower as well
  banner(b, PR[0], PR[1], 11.2, 'tully', 3);

  // --- life: boats at the Water Gate, guards on the walls, a lit court ---
  const gateOut: P2 = [WS[0] + t1[0] * wg + n1[0] * 2.0, WS[1] + t1[1] * wg + n1[1] * 2.0];
  boat(k, gateOut[0], gateOut[1], Math.atan2(-n1[1], -n1[0]), true);
  for (const s of [-1.65, 1.65]) fire(k, WS[0] + t1[0] * (wg + s) + n1[0] * 0.3, 2.95, WS[1] + t1[1] * (wg + s) + n1[1] * 0.3, 0.22, 0);
  boat(k, (J[0] + I[0]) / 2 - 1.5, J[1] - 0.95, 0, false);
  const walk = (A: P2, t: P2, n: P2, u: number): [number, number] => [A[0] + t[0] * u - n[0] * 0.55, A[1] + t[1] * u - n[1] * 0.55];
  k.person(...walk(WS, t1, n1, 5.2), RR.wall);
  const t2: P2 = [(WN[0] - PR[0]) / bb, (WN[1] - PR[1]) / bb];
  k.person(...walk(PR, t2, ns[1], 5.5), RR.wall);
  k.person(G[0] - 1.6, G[1] + 1.5, 0.15);
  k.lights.push({ x: Ic[0], z: Ic[1], r: 10, color: '#ffcf8a', k: 0.5 }, { x: gateOut[0], z: gateOut[1], r: 8, color: '#ffcf8a', k: 0.4 });

  // --- where the two rivers come in: reeds and willows hide where they begin ---
  reeds(b, l.x0 + 1.3, l.z0 + 0.8, 11, 8);
  reeds(b, l.x0 + 0.9, l.z1 - 1.0, 12, 8);
  reeds(b, (Hh[0] + I[0]) / 2 - 0.4, l.z1 - 0.9, 13, 7);
  k.tree(l.x0 - 1.6, l.z0 + 0.6, 0.5);
  k.tree(l.x0 + 1.2, l.z0 - 1.6, 0.45);
  k.tree(l.x0 - 1.5, l.z1 - 0.8, 0.5);
  k.tree(l.x0 + 1.3, l.z1 + 1.6, 0.45);
  k.tree(l.x1 - 2.4, l.z0 + 1.4, 0.45);
}

/** A point part of the way from `o` towards `p`, and then part of the way from there towards `q`. */
function lerp2(o: P2, p: P2, s: number, q: P2, t: number): P2 {
  const m: P2 = [o[0] + (p[0] - o[0]) * s, o[1] + (p[1] - o[1]) * s];
  return [m[0] + (q[0] - m[0]) * t, m[1] + (q[1] - m[1]) * t];
}

/** Riverrun's court is above the water: what the dragons' shadows fall on there. */
function riverrunHeight(x: number, z: number): number {
  const l = lotOf('riverrun');
  if (x < l.x0 || x > l.x1 || z < l.z0 || z > l.z1) return 0;
  const W = l.x1 - l.x0, H = l.z1 - l.z0;
  const WN: P2 = [l.x0 + 0.1375 * W, l.z0 + 0.15 * H], WS: P2 = [l.x0 + 0.1375 * W, l.z0 + 0.843 * H], PR: P2 = [l.x0 + 0.7875 * W, l.z0 + 0.557 * H];
  const s = (p: P2, q: P2): number => (q[0] - p[0]) * (z - p[1]) - (q[1] - p[1]) * (x - p[0]);
  const d1 = s(WS, PR), d2 = s(PR, WN), d3 = s(WN, WS);
  return (d1 <= 0 && d2 <= 0 && d3 <= 0) || (d1 >= 0 && d2 >= 0 && d3 >= 0) ? RR.court_y : 0;
}

// ---------------------------------------------------------------------------
// The bridge below Riverrun
// ---------------------------------------------------------------------------

/**
 * The river road's bridge over the Trident: three low arches of grey-brown
 * stone, cutwaters on the piers, and a parapet along each side. The road's
 * own surface lies on it; this is what carries it.
 */
function tridentBridge(k: Build): void {
  const b = k.b, spot = BRIDGES.find((x) => x.road === 'river' && x.x < -30);
  const path = MIDDLES.river;
  if (!spot || !path) return;
  // find the middle of the road nearest the bridge, and which way it runs there
  const p = new THREE.Vector3(), q = new THREE.Vector3();
  let best = 0, bestD = Infinity;
  for (let s = 0; s <= path.length; s += 0.25) {
    path.at(s, p);
    const d = Math.hypot(p.x - spot.x, p.z - spot.z);
    if (d < bestD) { bestD = d; best = s; }
  }
  path.at(best, p);
  path.at(Math.min(path.length, best + 0.6), q);
  const yaw = Math.atan2(q.z - p.z, q.x - p.x);
  const stone = STONE.river, shade = STONE.riverShade, top = -0.04, hw = 4.5;
  b.moved(p.x, 0, p.z, yaw, () => {
    const arches = [-1.9, 0, 1.9], w = 1.6, r = w / 2, spring = -1.0;
    for (const u of arches) {
      archway(b, u, -hw, hw, w, spring, top, stone, shade, 6);
      b.quad([u - r, top, hw], [u + r, top, hw], [u + r, top, -hw], [u - r, top, -hw], [0, 1, 0], shade);
    }
    // the piers between the arches, and the abutments at the ends
    for (const [u0, u1] of [[-3.6, -2.7], [-1.1, -0.8], [0.8, 1.1], [2.7, 3.6]]) {
      b.box(u0, -1.6, -hw, u1, top, hw, stone, { top: shade });
    }
    // cutwaters on both sides of each pier
    for (const um of [-0.95, 0.95]) for (const s of [-1, 1]) prism(b, [[um - 0.15, s * hw], [um, s * (hw + 0.6)], [um + 0.15, s * hw]], -1.6, -0.3, stone, { top: shade });
    // the parapets, outside the road's eight
    for (const s of [-1, 1]) {
      const z0 = s < 0 ? -hw : 4.05, z1 = s < 0 ? -4.05 : hw;
      b.box(-3.6, top, z0, 3.6, 0.75, z1, stone, { faces: 'NESW' });
      b.box(-3.7, 0.75, z0 - 0.05, 3.7, 0.86, z1 + 0.05, shade, { faces: 'NESWTB' });
    }
  });
}

// ---------------------------------------------------------------------------
// The tourney ground
// ---------------------------------------------------------------------------
//
// The lists between Harrenhal and the goldroad, where the collector's own cars
// are shown: the royal stand to the north of them, under the royal colours,
// the tilt barrier down the middle, a row of pavilions in the colours of many
// houses to the south, and all that goes on round a tourney. Before the royal
// box the lists are kept clear for a hero on show.

const GOLD = HOUSE.baratheon[0], SABLE = HOUSE.baratheon[1], CREAM = 0xe9dcc0;
const TOURNEY = HERO_SPOTS.find((s) => s.id === 'tourney') ?? { x: 0, z: 39.3, heading: 0.35 };
/** The tilt barrier runs along here, east to west, with a gap before the royal box for the hero. */
const TILT = { z: TOURNEY.z + 2.0, x0: -16.5, x1: 15.2, gap0: TOURNEY.x - 3, gap1: TOURNEY.x + 11 };
/** The herald's board: its middle, which way it faces, how high and how wide it may be. */
const HERALD = { x: -14.6, y: 5.2, z: 37.4, nx: 0.669, nz: 0.743, h: 6.2, w: 11.2 };

/** The royal stand: tiers of benches under a striped canopy, the royal box in the middle under a higher one, pennons on its posts, people on its benches. */
function royalStand(k: Build, l: Lot): void {
  const b = k.b, R = rng(hash(l.id));
  const box0 = (l.x0 + l.x1) / 2 - 2.6, box1 = (l.x0 + l.x1) / 2 + 2.6, mid = (l.x0 + l.x1) / 2;
  const back = l.z0 + 0.25, rows = 4, depth = (l.z1 - back) / rows;
  // the back wall, and its posts that carry the canopy
  b.box(l.x0, 0, l.z0, l.x1, 4.1, back, TIMBER, { faces: 'NESWT' });
  const front = [l.x0 + 0.1, l.x0 + 3.7, box0, box1, l.x1 - 3.7, l.x1 - 0.1];
  for (const x of front) {
    b.box(x - 0.11, 4.1, l.z0, x + 0.11, 5.62, l.z0 + 0.22, TIMBER_DARK, { faces: 'NESW' });
    b.box(x - 0.11, 0, l.z1 + 0.05, x + 0.11, 4.92, l.z1 + 0.27, TIMBER_DARK, { faces: 'NESW' });
  }
  // the tiers, on each side of the royal box
  for (const [x0, x1] of [[l.x0, box0], [box1, l.x1]]) {
    for (let i = 0; i < rows; i++) {
      const z1 = l.z1 - i * depth, z0 = z1 - depth, h = 0.75 + i * 0.7;
      b.box(x0, 0, z0, x1, h, z1, i === 0 ? TIMBER_DARK : TIMBER, { faces: i === 0 ? 'EWT' : 'SEWT', top: 0x8a6a4c });
      b.box(x0 + 0.15, h, z0 + 0.1, x1 - 0.15, h + 0.2, z0 + 0.4, TIMBER_DARK, { faces: 'NSEWT' });
      for (let x = x0 + 0.5; x < x1 - 0.3; x += 0.95) if (R() < 0.75) k.person(x + R() * 0.3, z0 + 0.3 + R() * 0.15, h);
    }
    // the front row's skirt, in the royal colours
    const n = Math.round((x1 - x0) / 0.9);
    for (let i = 0; i < n; i++) b.quad([x0 + (i * (x1 - x0)) / n, 0, l.z1 + 0.02], [x0 + ((i + 1) * (x1 - x0)) / n, 0, l.z1 + 0.02], [x0 + ((i + 1) * (x1 - x0)) / n, 0.75, l.z1 + 0.02], [x0 + (i * (x1 - x0)) / n, 0.75, l.z1 + 0.02], [0, 0, 1], i % 2 ? GOLD : SABLE);
    // the canopy, in stripes of gold and black, sloping down to the front
    const m = Math.round((x1 - x0) / 1.2);
    for (let i = 0; i < m; i++) {
      const xa = x0 + (i * (x1 - x0)) / m, xb = x0 + ((i + 1) * (x1 - x0)) / m, xm = (xa + xb) / 2, color = i % 2 ? GOLD : SABLE;
      slab(b, [xm, 5.7, l.z0 + 0.05], [xm, 4.97, l.z1 + 0.35], (xb - xa) / 2, 0.08, color, { under: CREAM });
      for (const [nz, dz] of [[1, 0.02], [-1, -0.02]] as const) face3(b, [xa, 4.9, l.z1 + 0.35 + dz], [xb, 4.9, l.z1 + 0.35 + dz], [xm, 4.45, l.z1 + 0.35 + dz], [0, 0, nz], i % 2 ? SABLE : GOLD);
    }
  }
  // the royal box: raised, hung with cloth of gold, two high chairs, the king's guard either side
  b.box(box0, 0, back, box1, 2.0, l.z1, TIMBER_DARK, { faces: 'EWT', top: 0x7a2a26 });
  b.quad([box0, 0, l.z1 + 0.02], [box1, 0, l.z1 + 0.02], [box1, 2.0, l.z1 + 0.02], [box0, 2.0, l.z1 + 0.02], [0, 0, 1], GOLD);
  b.quad([mid - 0.9, 0.5, l.z1 + 0.04], [mid + 0.9, 0.5, l.z1 + 0.04], [mid + 0.9, 1.6, l.z1 + 0.04], [mid - 0.9, 1.6, l.z1 + 0.04], [0, 0, 1], SABLE);
  b.box(box0 + 0.1, 2.0, l.z1 - 0.25, box1 - 0.1, 2.85, l.z1 - 0.1, GOLD, { faces: 'NSEWT' });
  for (const s of [-1, 1]) {
    const x = mid + s * 0.8, z = l.z0 + 1.3;
    b.box(x - 0.4, 2.0, z - 0.3, x + 0.4, 2.55, z + 0.35, 0x7a2a26);
    b.box(x - 0.4, 2.55, z - 0.45, x + 0.4, 4.0, z - 0.3, GOLD, { faces: 'NESWT' });
    k.person(x, z + 0.1, 2.0);
    figure(b, mid + s * 2.15, l.z1 - 0.7, 2.0, { coat: 0xf1efe6, legs: 0xc9ccd1, hat: 0xc9ccd1, hatH: 0.3 });
  }
  // its own canopy, higher, peaked, with a ceiling under it
  b.box(box0 - 0.2, 5.75, l.z0, box1 + 0.2, 5.98, l.z1 + 0.4, GOLD, { faces: 'NESWTB' });
  for (const x of [box0 - 0.1, box1 + 0.1]) b.box(x - 0.12, 2.0, l.z1 + 0.15, x + 0.12, 5.75, l.z1 + 0.39, TIMBER_DARK, { faces: 'NESW' });
  pavilionRoof(b, box0 - 0.3, l.z0 - 0.1, box1 + 0.3, l.z1 + 0.5, 5.98, 7.3, GOLD, SABLE);
  banner(b, mid, (l.z0 + l.z1) / 2 + 0.2, 7.3, 'baratheon', 2.5, 0.85);
  // pennons on the front posts
  front.forEach((x, i) => {
    if (x === box0 || x === box1) return;
    pennon(b, x, l.z1 + 0.16, 4.92, 3.0, i % 2 ? GOLD : SABLE);
  });
  k.lights.push({ x: mid, z: l.z1 + 1.5, r: 12, color: '#ffcf8a', k: 0.55 });
}

/** A roof of four slopes to a point, striped by its slopes: over a pavilion, or the royal box. */
function pavilionRoof(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, c0: number, c1: number): void {
  const apex: V3 = [(x0 + x1) / 2, y1, (z0 + z1) / 2];
  const c: V3[] = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]];
  for (let i = 0; i < 4; i++) {
    const p = c[i], q = c[(i + 1) % 4], n = unit(cross(sub(q, p), sub(apex, p)));
    face3(b, p, q, apex, n[1] < 0 ? [-n[0], -n[1], -n[2]] : n, i % 2 ? c1 : c0);
  }
  b.quad(c[3], c[2], c[1], c[0], [0, -1, 0], CREAM);
}

/** A pavilion: round or square, striped in a house's colours, a pennon on its top, a dark doorway with a lamp inside, and the house's shield on a stand before it. */
function pavilion(k: Build, x: number, z: number, r: number, house: string, round: boolean): void {
  const b = k.b, [c0, c1] = HOUSE[house] ?? HOUSE.stark, wall = 2.0;
  let peak = 3.9;
  if (round) {
    const n = 10, ang = (i: number): number => Math.PI / 2 - Math.PI / n + (i / n) * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a0 = ang(i), a1 = ang(i + 1), am = (a0 + a1) / 2;
      b.quad([x + Math.cos(a0) * r, 0, z + Math.sin(a0) * r], [x + Math.cos(a1) * r, 0, z + Math.sin(a1) * r], [x + Math.cos(a1) * r, wall, z + Math.sin(a1) * r], [x + Math.cos(a0) * r, wall, z + Math.sin(a0) * r], [Math.cos(am), 0, Math.sin(am)], i % 2 ? c1 : c0);
    }
    lathe(b, x, z, [[r + 0.2, wall], [r * 0.5, wall + 1.05], [0.03, peak]], n, c0);
    b.cyl(x, z, wall - 0.01, wall, r + 0.2, r + 0.2, n, CREAM, { cap: false });
    // the doorway faces south, on the side that is centred there
    const half = r * Math.sin(Math.PI / n) * 0.7, dz = z + r * Math.cos(Math.PI / n) + 0.02;
    b.quad([x - half, 0, dz], [x + half, 0, dz], [x + half, 1.6, dz], [x - half, 1.6, dz], [0, 0, 1], DARK, { win: interior(0.55) });
  } else {
    const n = 4, w = (2 * r) / n;
    for (const [nx, nz] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
      for (let i = 0; i < n; i++) {
        const u0 = -r + i * w, u1 = u0 + w;
        const P = (u: number, y: number): V3 => (nz !== 0 ? [x + u * nz, y, z + nz * r] : [x + nx * r, y, z - u * nx]);
        b.quad(P(u0, 0), P(u1, 0), P(u1, wall - 0.1), P(u0, wall - 0.1), [nx, 0, nz], i % 2 ? c1 : c0);
      }
    }
    peak = 3.7;
    pavilionRoof(b, x - r - 0.25, z - r - 0.25, x + r + 0.25, z + r + 0.25, wall - 0.1, peak, c0, c1);
    b.quad([x - 0.4, 0, z + r + 0.02], [x + 0.4, 0, z + r + 0.02], [x + 0.4, 1.6, z + r + 0.02], [x - 0.4, 1.6, z + r + 0.02], [0, 0, 1], DARK, { win: interior(0.55) });
  }
  pennon(b, x, z, peak - 0.05, 1.8, c1, 1.1);
  // the shield on its stand before the door
  const sz = z + r + 0.55;
  b.box(x + 0.75, 0, sz - 0.05, x + 0.85, 1.0, sz + 0.05, TIMBER_DARK, { faces: 'NESW' });
  b.box(x + 0.48, 0.85, sz + 0.05, x + 1.12, 1.4, sz + 0.12, c0, { faces: 'NESWT' });
  b.quad([x + 0.72, 0.85, sz + 0.13], [x + 0.88, 0.85, sz + 0.13], [x + 0.88, 1.4, sz + 0.13], [x + 0.72, 1.4, sz + 0.13], [0, 0, 1], c1);
  for (const [nz, dz] of [[1, 0.12], [-1, 0.05]] as const) face3(b, [x + 0.48, 0.85, sz + dz], [x + 1.12, 0.85, sz + dz], [x + 0.8, 0.45, sz + dz], [0, 0, nz], c0);
}

/** The row of pavilions, in the colours of many houses. Their middle is left open, south-east of the place for a hero. */
function pavilions(k: Build, l: Lot): void {
  const z = (l.z0 + l.z1) / 2, r = (l.z1 - l.z0) / 2 - 0.05;
  const clear0 = TOURNEY.x - 1.5;
  const west: [string, boolean][] = [['stark', true], ['lannister', false], ['tyrell', true], ['arryn', false]];
  let x = l.x0 + r + 0.1;
  for (const [house, round] of west) {
    const rr = round ? r : r - 0.2;
    if (x + rr > clear0) break;
    pavilion(k, x, z, rr, house, round);
    x += rr + 0.45 + (round ? r - 0.2 : r);
  }
  pavilion(k, l.x1 - r - 0.8, z, r, 'martell', true);
  // squires and knights about the pavilions
  const knight = { coat: 0xa9adb3, legs: 0x8d9096, hat: 0x9ea2a8, hatH: 0.35 };
  figure(k.b, l.x0 + 3.3, l.z1 + 0.9, 0, knight);
  figure(k.b, l.x0 + 6.6, l.z1 + 1.0, 0, knight);
  k.person(l.x0 + 1.4, l.z1 + 1.1);
  k.person(l.x1 - 3.1, l.z1 + 0.9);
}

/** What goes on round the lists: the ground, the tilt barrier, the quintain, the butts, racks of lances, trumpeters, horses, the crowd, the herald's board. */
function tourneyGround(k: Build): void {
  const b = k.b, R = rng(5150), stand = lotOf('tourney-stand'), tents = lotOf('tourney-tents');
  // the lists: trodden grass, and sand along the barrier where the horses run
  area(k, rect(-16, stand.z1 + 0.1, 15.7, tents.z0 - 0.05), 0x9aa865, 0.035);
  for (const [x0, x1] of [[TILT.x0 - 0.5, TILT.gap0], [TILT.gap1, TILT.x1 + 0.5]]) area(k, rect(x0, TILT.z - 1.1, x1, TILT.z + 1.1), 0xc6b089, 0.05);
  // the tilt barrier: a low rail of painted boards, with the gap before the royal box
  for (const [x0, x1] of [[TILT.x0, TILT.gap0], [TILT.gap1, TILT.x1]]) {
    const n = Math.max(1, Math.round((x1 - x0) / 2));
    for (let i = 0; i < n; i++) {
      const a = x0 + ((x1 - x0) * i) / n, c = x0 + ((x1 - x0) * (i + 1)) / n;
      b.box(a, 0.75, TILT.z - 0.07, c, 1.1, TILT.z + 0.07, i % 2 ? 0xb03028 : 0xe9e4d6, { faces: 'NSEWT' });
      b.box(a - 0.08, 0, TILT.z - 0.08, a + 0.08, 1.15, TILT.z + 0.08, TIMBER_DARK, { faces: 'NESWT' });
    }
    b.box(x1 - 0.08, 0, TILT.z - 0.08, x1 + 0.08, 1.15, TILT.z + 0.08, TIMBER_DARK, { faces: 'NESWT' });
  }
  // the quintain at the west end of the stand: a post, an arm that swings, a shield and a sandbag
  const qx = stand.x0 - 1.6, qz = stand.z1 + 3.4;
  b.box(qx - 0.13, 0, qz - 0.13, qx + 0.13, 2.4, qz + 0.13, TIMBER, { faces: 'NESWT' });
  b.box(qx - 1.2, 2.2, qz - 0.07, qx + 1.2, 2.35, qz + 0.07, TIMBER_DARK, { faces: 'NSEWTB' });
  b.box(qx + 0.9, 1.5, qz - 0.05, qx + 1.4, 2.15, qz + 0.05, 0xb03028);
  b.box(qx - 1.35, 1.3, qz - 0.2, qx - 0.95, 1.85, qz + 0.2, 0xb59c72, { faces: 'NESWTB' });
  for (const [dx, dz] of [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]]) b.beam([qx, 0.6, qz], [qx + dx, 0.05, qz + dz], 0.06, 0.06, TIMBER_DARK);
  // the archery butts at the west end, and archers shooting at them
  for (const z of [tents.z0 + 0.4, tents.z0 + 2.1]) {
    const x = -15.6;
    b.box(x - 0.25, 0.3, z - 0.6, x + 0.25, 1.5, z + 0.6, 0xc9a85a, { faces: 'NESWT' });
    for (const s of [-0.4, 0.4]) b.beam([x - 0.1, 0, z + s], [x - 0.1, 0.4, z + s], 0.05, 0.05, TIMBER_DARK);
    roundel(b, [x + 0.27, 0.9, z], 0.48, 'E', 0xf1efe6);
    roundel(b, [x + 0.29, 0.9, z], 0.32, 'E', 0xb3141c);
    roundel(b, [x + 0.31, 0.9, z], 0.14, 'E', 0xd9b23c);
  }
  k.person(-13.2, tents.z0 + 0.5);
  k.person(-12.9, tents.z0 + 2.0);
  // racks of lances, painted in stripes
  for (const [x, z] of [[stand.x1 + 2.2, stand.z0 + 1.0], [tents.x0 + 0.4, tents.z0 - 0.8]]) {
    for (const s of [-1, 1]) b.box(x + s * 1.1 - 0.08, 0, z - 0.08, x + s * 1.1 + 0.08, 2.0, z + 0.08, TIMBER_DARK, { faces: 'NESWT' });
    b.box(x - 1.25, 1.75, z - 0.06, x + 1.25, 1.9, z + 0.06, TIMBER_DARK, { faces: 'NSEWTB' });
    for (let i = 0; i < 6; i++) {
      const lx = x - 0.95 + i * 0.38, col = [0xb03028, 0x2f5fa8, 0xd9b23c, 0xe9e4d6, 0x3f7a3a, 0x1d1d20][i];
      b.beam([lx, 0, z + 0.45], [lx + 0.05, 3.4, z - 0.1], 0.06, 0.04, col);
    }
  }
  // the herald's trumpeters, either side of the royal box
  const mid = (stand.x0 + stand.x1) / 2, tabard = { coat: GOLD, legs: SABLE, hat: SABLE, hatH: 0.2 };
  for (const s of [-1, 1]) {
    const x = mid + s * 5.6, z = stand.z1 + 0.95;
    figure(b, x, z, 0, tabard);
    b.beam([x + 0.1, 2.0, z + 0.25], [x + 0.25, 2.45, z + 1.3], 0.045, 0.1, 0xd9b24a);
    b.quad([x + 0.18, 1.5, z + 0.9], [x + 0.18, 1.5, z + 0.5], [x + 0.18, 2.2, z + 0.45], [x + 0.18, 2.2, z + 0.95], [1, 0, 0], GOLD);
    b.quad([x + 0.16, 1.5, z + 0.5], [x + 0.16, 1.5, z + 0.9], [x + 0.16, 2.2, z + 0.95], [x + 0.16, 2.2, z + 0.45], [-1, 0, 0], GOLD);
  }
  // squires with their knights' horses, south of the barrier and clear of the hero
  horse(b, -14.2, TILT.z - 1.1, 0, 0x5a3f2c, 0x9b1b1f);
  horse(b, -8.6, TILT.z + 1.0, Math.PI, 0xe0dcd2, 0x3f7a3a);
  horse(b, 14.6, TILT.z + 1.0, Math.PI, 0x2f2a27, 0x2f5fa8);
  for (const [x, z] of [[-14.2, TILT.z - 1.85], [-8.6, TILT.z + 1.75], [14.6, TILT.z + 1.75]]) k.person(x + 0.4, z);
  // the crowd at the rails, but not before the royal box
  for (let x = TILT.x0 + 0.6; x < TILT.gap0 - 1.2; x += 1.1 + R() * 0.6) {
    if (Math.abs(x + 8.6) < 1.2) continue;
    k.person(x, TILT.z + 0.55 + R() * 0.3);
    if (R() < 0.35 && x > -12 && x < -6) k.person(x + 0.3, TILT.z - 0.7 - R() * 0.3);
  }
  for (let x = TILT.gap1 + 1.2; x < 14; x += 1.2) k.person(x, TILT.z + 0.6 + R() * 0.25);
  // two braziers for the evening, and the light over the lists
  brazier(k, stand.x0 - 0.9, stand.z1 + 1.2);
  brazier(k, stand.x1 + 0.7, stand.z1 + 1.0);
  k.lights.push({ x: TOURNEY.x, z: TOURNEY.z, r: 12, color: '#ffcf8a', k: 0.5 });

  heraldBoard(k);
  nameBoard(k, 'riverlands-tourney', -10, 57.8);
}

/**
 * The herald's board, the one that shows what is playing: the board itself is
 * the main session's sign, hung here on a stout timber frame of two great
 * posts with braces, a dark board behind it, and a little shingled roof over
 * it. A herald with a trumpet stands beside it.
 */
function heraldBoard(k: Build): void {
  const b = k.b, H = HERALD, nx = H.nx, nz = H.nz, ax = -nz, az = nx, yaw = Math.atan2(az, ax);
  const w = k.sign('herald', H.x, H.y, H.z, nx, nz, H.h, H.w);
  const at = (u: number, back: number): [number, number] => [H.x + ax * u - nx * back, H.z + az * u - nz * back];
  // the dark board behind the sign
  const [bx, bz] = at(0, 0.15);
  b.obox(bx, H.y, bz, w / 2 + 0.2, H.h / 2 + 0.2, 0.05, yaw, 0x2a2420, { faces: 'B' });
  // the two great posts, the beams across, and the braces behind
  const pu = w / 2 + 0.55, py = H.y + H.h / 2 + 0.35;
  for (const s of [-1, 1]) {
    const [px, pz] = at(s * pu, 0.15);
    b.obox(px, py / 2, pz, 0.32, py / 2, 0.32, yaw, TIMBER);
    const [fx, fz] = at(s * pu, 1.8);
    b.beam([px - nx * 0.2, 5.4, pz - nz * 0.2], [fx, 0, fz], 0.14, 0.16, TIMBER_DARK);
    const [kx, kz] = at(s * (pu - 1.1), 0.15);
    b.beam([px, py - 1.2, pz], [kx, py - 0.15, kz], 0.1, 0.1, TIMBER_DARK);
  }
  for (const y of [H.y - H.h / 2 - 0.3, py]) {
    const [cx, cz] = at(0, 0.15);
    b.obox(cx, y, cz, pu + 0.32, 0.17, 0.2, yaw, TIMBER_DARK, { faces: 'B' });
  }
  // the little roof, shingled, its ridge at the frame's height
  const roofTop = Math.min(9, py + 0.75), [ex, ez] = at(0, -0.75), [rx, rz] = at(0, 0.15), [qx, qz] = at(0, 1.05);
  slab(b, [ex, py + 0.25, ez], [rx, roofTop, rz], pu + 0.6, 0.12, ROOF.shingle, { under: TIMBER_DARK });
  slab(b, [qx, py + 0.25, qz], [rx, roofTop, rz], pu + 0.6, 0.12, ROOF.shingle, { under: TIMBER_DARK });
  // the herald, in the royal colours, with his trumpet
  const [hx, hz] = at(pu + 0.9, -1.0);
  figure(b, hx, hz, 0, { coat: GOLD, legs: SABLE, hat: 0x7a2a26, hatH: 0.25 });
  b.beam([hx + nx * 0.25, 2.0, hz + nz * 0.25], [hx + nx * 1.25, 2.4, hz + nz * 1.25], 0.045, 0.11, 0xd9b24a);
  k.lights.push({ x: H.x + nx * 2, z: H.z + nz * 2, r: 9, color: '#ffe2ae', k: 0.45 });
}

// ---------------------------------------------------------------------------
// What the region hands over
// ---------------------------------------------------------------------------

const tower: Model = (k, l) => meltedTower(k, l, MELTS[l.id]);

export const MODELS: Record<string, Model> = {
  'hh-wall-n': hhWall,
  'hh-wall-s': hhWall,
  'hh-wall-w': hhWall,
  'hh-wall-e': hhWall,
  'hh-kingspyre': tower,
  'hh-t2': tower,
  'hh-t3': tower,
  'hh-t4': tower,
  'hh-t5': tower,
  riverrun,
  'tourney-stand': royalStand,
  'tourney-tents': pavilions,
};
export const COVERS: string[] = [];
export const FLOORED: string[] = ['riverrun'];

export function heightAt(x: number, z: number): number {
  return Math.max(isleHeight(x, z), riverrunHeight(x, z));
}

export function extras(k: Build): void {
  const parts: [string, (k: Build) => void][] = [
    ["Harrenhal's ward", harrenhalWard],
    ['the Isle of Faces', isleOfFaces],
    ['the bridge below Riverrun', tridentBridge],
    ['the tourney ground', tourneyGround],
    ['the name board by Riverrun', (kk) => nameBoard(kk, 'riverlands-riverrun', -60.5, -5.0)],
  ];
  for (const [what, fn] of parts) {
    try {
      fn(k);
    } catch (e) {
      console.error(`Westeros: the riverlands' ${what} failed.`, e);
    }
  }
}
