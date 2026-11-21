// Bristol: Wayne Manor on the edge of Crest Hill's cliff, the Batcave hidden under it, the gates and the drive, the old tunnel's mouth, and the Kane Memorial Bridge.
//
// The mainland north of the Gotham River. land.ts lays the shelf the river
// road runs on, Crest Hill's upright cliff over it, and the two things cut
// into the hill: the shaft of the Batcave's lift, a pit with rock all round
// it, and a notch in the cliff under the Manor's tower. This file builds what
// stands on them.
//
// Wayne Manor is a Gothic Revival country house in pale limestone, rebuilt
// after the earthquake with battlements (the research's "fortress"), and the
// tile's own drawing of one: end pavilions with gables and stair turrets,
// battlemented ranges, and a great tower in the middle that carries it, as
// Arkham's clock tower carries Arkham. It stands at the very edge of the
// cliff, so that the rock and the house read as one front over the river.
// Its height is at its front, since the ceiling along the north edge of the
// board binds it.
//
// The Batcave is hidden, which the collector asked for. The notch under the
// tower is roofed by the terrace and the house, so that it is a grotto: the
// waterfall falls across its mouth (the curtain itself is air.ts's), and the
// Batmobile comes out through it onto the service lane. The mirror pool of the
// pool garden at the house's west end is the lid of the shaft: it splits,
// sinks and slides apart under the lawns (`buildHatch`, which the show calls),
// and the Batwing rises on a lift. In the shaft are the comics' three trophies,
// the mechanical Tyrannosaurus, the giant Lincoln penny and the giant Joker
// card, and the Batcomputer's screens. Nothing names the cave.
//
// The Kane Memorial Bridge is a short suspension bridge with two stone towers
// of pointed arches, in the manner of the Brooklyn and Manhattan bridges that
// the comics' map-maker named, and a copy of neither.

import * as THREE from 'three';
import { GeoBuilder, interior, rng, type V3 } from '../../engine/geo';
import { makeWaterMaterial } from '../../engine/look/materials';
import { hipped, pinnacle, roundel, tri } from '../../engine/parts';
import { face3, gable, slab, slope3 } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { landAt } from './land';
import {
  AMBER, BRASS, COLD, DARK, GOTHIC_WIN, IRON, IRON_DARK, LEAD, LIMESTONE, LIMESTONE_DARK, ROCK, ROCK_DARK, ROCK_LIGHT, SLATE, SMALL_WIN, SODIUM,
  STEEL, STONE, STONE_DARK, STONE_LIGHT, STONE_TRIM, TIMBER_DARK, TO_VIEW, gargoyle, gasLamp, nameBoard, nameSign, padMark, parapet,
} from './look';
import type { Model, Place } from './models';
import { CREST, FALL_HALF, HELIPADS, HERO_SPOTS, KANE, Y, lotOf, type Lot, type P2 } from './plan';
import { MIDDLES } from './roads';
import { ceilingAt, open, underBoards } from './space';

// ---------------------------------------------------------------------------
// Colours of this file's own
// ---------------------------------------------------------------------------

/** The Manor's trim: sills, string courses, copings, a shade paler than its stone. */
const TRIM = 0xa8a69c;
/** A window pane by day, which glows amber at night. */
const PANE = 0x3a2b1c;
const IVY = 0x2f4a2a, IVY_DARK = 0x253d22, HEDGE = 0x2c4628, YEW = 0x22361f, MOWN = 0x5b7d51;
const GRAVEL = 0x9a9284, FLAGS = 0x8f8d86, JOINT = 0x77756f, EARTH = 0x4a3f33, BRICK_OLD = 0x7a5444;
/** The clock's dial, a statue's marble. */
const DIAL = 0xd9d2bf, MARBLE = 0xbab7ad;
/** The cave's machines and its lights. */
const STEEL_DARK = 0x4a5059, STEEL_DECK = 0x30343b, HAZARD = 0xd9b23a;
const COPPER = 0xb8743c, COPPER_DEEP = 0x8f5529;
const REX = 0x5a6c4a, REX_DARK = 0x3f4d35;
const WATER_POOL = 0x3c6878, MIRROR = 0x1d3a46;
const SETT = 0x6b665e;
/** The flag on the tower: plain, a family's colour and nothing on it. */
const FLAG = 0x6e1e28;

const PI = Math.PI;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** A box with all six faces. */
const solid = (b: GeoBuilder, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number, faces = 'NESWTB'): void => b.box(x0, y0, z0, x1, y1, z1, c, { faces });

/** The yaw that turns a frame built to face +z so that it faces (nx, nz). */
const yawFacing = (nx: number, nz: number): number => Math.atan2(-nx, nz);

/** Builds in a frame on a wall that faces south, north, east or west: +z is out of the wall, the wall's face at z 0. */
const FACE_YAW = { S: 0, N: PI, E: -PI / 2, W: PI / 2 } as const;
type Face = keyof typeof FACE_YAW;
const onFace = (b: GeoBuilder, face: Face, x: number, z: number, fn: () => void): void => b.moved(x, 0, z, FACE_YAW[face], fn);

/**
 * A pitched roof whose ridge runs along x, its slopes through the tops of the
 * walls at z0 and z1, so that the gables close right up under it: `overN` and
 * `overS` are how far each slope reaches past its wall, `overX` past the gables.
 */
function roofX(b: GeoBuilder, x0: number, x1: number, z0: number, z1: number, y: number, rise: number, o: { overN?: number; overS?: number; overX?: number; color?: number; wall?: number; gables?: boolean } = {}): void {
  const zc = (z0 + z1) / 2, half = (z1 - z0) / 2, k = rise / half, len = Math.hypot(half, rise);
  const oN = o.overN ?? 0.35, oS = o.overS ?? 0.35, oX = o.overX ?? 0.3, c = o.color ?? SLATE;
  const a = x0 - oX, e = x1 + oX, top = y + rise;
  const nS: V3 = [0, half / len, rise / len], nN: V3 = [0, half / len, -rise / len];
  b.quad([a, y - k * oS, z1 + oS], [e, y - k * oS, z1 + oS], [e, top, zc], [a, top, zc], nS, c);
  b.quad([e, y - k * oN, z0 - oN], [a, y - k * oN, z0 - oN], [a, top, zc], [e, top, zc], nN, c);
  // the undersides, for the eaves seen from below
  b.quad([a, y - k * oS, z1 + oS], [e, y - k * oS, z1 + oS], [e, top, zc], [a, top, zc], [0, -nS[1], -nS[2]], STONE_DARK);
  b.quad([e, y - k * oN, z0 - oN], [a, y - k * oN, z0 - oN], [a, top, zc], [e, top, zc], [0, -nN[1], -nN[2]], STONE_DARK);
  // a ridge tile along the top
  solid(b, a, top - 0.06, zc - 0.13, e, top + 0.12, zc + 0.13, LEAD);
  if (o.gables !== false) {
    face3(b, [x0, y, z0], [x0, y, z1], [x0, top, zc], [-1, 0, 0], o.wall ?? LIMESTONE);
    face3(b, [x1, y, z0], [x1, y, z1], [x1, top, zc], [1, 0, 0], o.wall ?? LIMESTONE);
  }
}

/**
 * A pitched roof with its ridge along x, each end a gable ('g'), a hip ('h')
 * or left open ('o') where it meets another wall, with undersides under every
 * eave. Returns the ridge's height. (Arkham's, so that the two great houses
 * are roofed alike.)
 */
function pitched(b: GeoBuilder, x0: number, x1: number, z0: number, z1: number, y: number, rise: number, o: { over?: number; ends?: [string, string]; wall?: number } = {}): number {
  const over = o.over ?? 0.35, [e0, e1] = o.ends ?? ['g', 'g'];
  const zc = (z0 + z1) / 2, half = (z1 - z0) / 2, k = rise / half, top = y + rise;
  const ye = y - k * over, A = x0 - over, E = x1 + over, N = z0 - over, S = z1 + over, he = half + over;
  const r0 = e0 === 'h' ? Math.min(A + he, (A + E) / 2) : A, r1 = e1 === 'h' ? Math.max(E - he, (A + E) / 2) : E;
  const len = Math.hypot(he, rise);
  const nS: V3 = [0, he / len, rise / len], nN: V3 = [0, he / len, -rise / len];
  const neg = (n: V3): V3 => [-n[0], -n[1], -n[2]];
  const south: [V3, V3, V3, V3] = [[A, ye, S], [E, ye, S], [r1, top, zc], [r0, top, zc]];
  const north: [V3, V3, V3, V3] = [[E, ye, N], [A, ye, N], [r0, top, zc], [r1, top, zc]];
  b.quad(...south, nS, SLATE);
  b.quad(...north, nN, SLATE);
  b.quad(...south, neg(nS), STONE_DARK);
  b.quad(...north, neg(nN), STONE_DARK);
  for (const [e, xe, xr, s] of [[e0, A, r0, -1], [e1, E, r1, 1]] as [string, number, number, number][]) {
    if (e === 'h') {
      const n: V3 = [(s * rise) / len, he / len, 0];
      tri(b, [xe, ye, N], [xe, ye, S], [xr, top, zc], n, SLATE);
      tri(b, [xe, ye, N], [xe, ye, S], [xr, top, zc], neg(n), STONE_DARK);
    } else if (e === 'g') {
      const xw = s < 0 ? x0 : x1;
      tri(b, [xw, y, z0], [xw, y, z1], [xw, top, zc], [s, 0, 0], o.wall ?? LIMESTONE);
    }
  }
  if (r1 - r0 > 0.05) solid(b, r0, top - 0.05, zc - 0.12, r1, top + 0.12, zc + 0.12, LEAD);
  return top;
}

/** The same roof with its ridge along z: its first end is the north one. */
function pitchedZ(b: GeoBuilder, x0: number, x1: number, z0: number, z1: number, y: number, rise: number, o: Parameters<typeof pitched>[7] = {}): number {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  let top = 0;
  b.moved(cx, 0, cz, PI / 2, () => { top = pitched(b, z0 - cz, z1 - cz, -(x1 - cx), -(x0 - cx), y, rise, o); });
  return top;
}

/**
 * A pointed arch through a wall that runs along x: the wall above the arch on
 * both faces up to `top`, and the arch's soffit. The way is `2 × half` wide,
 * its sides upright to `spring`, and each side of the point is an arc of
 * radius `r`, which is more than `half`.
 */
function pointedArch(b: GeoBuilder, cx: number, z0: number, z1: number, half: number, r: number, spring: number, top: number, color: number, soffit: number, n = 6): void {
  const cL = cx - half + r, apexA = Math.acos((cx - cL) / r);
  const at = (i: number, side: number): [number, number, number] => {
    const a = PI + ((apexA - PI) * i) / n, x = cL + r * Math.cos(a), y = spring + r * Math.sin(a);
    return side < 0 ? [x, y, a] : [2 * cx - x, y, a];
  };
  for (const side of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const [xa, ya] = at(i, side), [xb, yb] = at(i + 1, side), am = PI + ((apexA - PI) * (i + 0.5)) / n;
      for (const [z, nz] of [[z0, -1], [z1, 1]]) b.quad([xa, ya, z], [xb, yb, z], [xb, top, z], [xa, top, z], [0, 0, nz], color);
      // the soffit faces the arc's own middle
      b.quad([xa, ya, z0], [xb, yb, z0], [xb, yb, z1], [xa, ya, z1], [side < 0 ? -Math.cos(am) : Math.cos(am), -Math.sin(am), 0], soffit);
    }
  }
}

/** The height of a pointed arch's apex over its spring. */
const archRise = (half: number, r: number): number => Math.sqrt(r * r - (r - half) * (r - half));

/**
 * A Gothic window on a wall, in a frame that faces +z with the wall at z 0:
 * a lit pane with a pointed head, a sill, a hood mould over the head, and
 * mullions, a transom and a ring of tracery of stone. Build it inside `moved`.
 */
function lancet(b: GeoBuilder, w: number, y0: number, y1: number, o: { lights?: number; transom?: number; lit?: number; head?: number; tracery?: boolean; out?: number } = {}): void {
  const lit = interior(o.lit ?? 2.4), h = w * (o.head ?? 0.5), hw = w / 2, z = o.out ?? 0;
  b.quad([-hw, y0, z + 0.03], [hw, y0, z + 0.03], [hw, y1, z + 0.03], [-hw, y1, z + 0.03], [0, 0, 1], PANE, { win: lit });
  tri(b, [-hw, y1, z + 0.03], [hw, y1, z + 0.03], [0, y1 + h, z + 0.03], [0, 0, 1], PANE, { win: lit });
  b.box(-hw - 0.16, y0 - 0.2, z, hw + 0.16, y0, z + 0.16, TRIM, { faces: 'SEWTB' });
  for (const s of [-1, 1]) b.beam([s * (hw + 0.14), y1 - 0.1, z + 0.07], [0, y1 + h + 0.16, z + 0.07], 0.07, 0.07, TRIM);
  const lights = o.lights ?? 2;
  for (let i = 1; i < lights; i++) {
    const x = -hw + (w * i) / lights;
    b.box(x - 0.06, y0, z + 0.03, x + 0.06, y1 + h * (1 - Math.abs(x) / hw) * (o.tracery ? 0.5 : 1) - 0.05, z + 0.1, TRIM, { faces: 'SEW' });
  }
  if (o.transom !== undefined) b.box(-hw, o.transom - 0.06, z + 0.03, hw, o.transom + 0.06, z + 0.1, TRIM, { faces: 'STB' });
  if (o.tracery) {
    // a ring of stone in the head, and the outer lights' arches meeting it
    const cy = y1 + h * 0.45, r = Math.min(hw * 0.42, h * 0.32);
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * PI * 2, a1 = ((i + 1) / 8) * PI * 2;
      b.beam([Math.cos(a0) * r, cy + Math.sin(a0) * r, z + 0.08], [Math.cos(a1) * r, cy + Math.sin(a1) * r, z + 0.08], 0.05, 0.05, TRIM);
    }
    for (const s of [-1, 1]) b.beam([s * hw * 0.96, y1, z + 0.08], [s * r * 0.7, cy - r * 0.7, z + 0.08], 0.05, 0.05, TRIM);
  }
}

/** A strip of crenellations: a parapet with merlons on it, along x from x0 to x1, its outer face at z (facing +z if `out` is 1). */
function battlement(b: GeoBuilder, x0: number, x1: number, z: number, out: number, y: number, color = LIMESTONE, h = 0.7): void {
  const za = z - out * 0.32, zb = z;
  b.box(x0, y, Math.min(za, zb), x1, y + h, Math.max(za, zb), color, { faces: 'NESWT' });
  const n = Math.max(1, Math.round((x1 - x0) / 1.1));
  for (let i = 0; i < n; i++) {
    const x = x0 + ((i + 0.5) * (x1 - x0)) / n;
    b.box(x - 0.28, y + h, Math.min(za, zb) + 0.02, x + 0.28, y + h + 0.55, Math.max(za, zb) - 0.02, TRIM, { faces: 'NESWT' });
  }
}

/** Ivy on a wall: dark green patches a hair proud of it, climbing from `y0`, in a frame facing +z (build it inside `moved`). */
function ivy(b: GeoBuilder, seed: number, w: number, y0: number, y1: number, out = 0): void {
  const R = rng(seed);
  for (let i = 0; i < 5; i++) {
    const x = (R() - 0.5) * w, hw = 0.35 + R() * 0.6, top = y0 + (y1 - y0) * (0.45 + R() * 0.55);
    b.box(x - hw, y0, out + 0.02 + i * 0.012, x + hw, top, out + 0.08 + i * 0.012, i % 2 ? IVY : IVY_DARK, { faces: 'SEWT' });
  }
}

/** A tall chimney stack: a shaft, a band, and two pots, standing on `y0` and reaching `y1`. */
function chimney(b: GeoBuilder, x: number, z: number, y0: number, y1: number, along: 'x' | 'z' = 'x'): void {
  const hx = along === 'x' ? 0.75 : 0.45, hz = along === 'x' ? 0.45 : 0.75;
  b.box(x - hx, y0, z - hz, x + hx, y1 - 0.75, z + hz, LIMESTONE_DARK);
  solid(b, x - hx - 0.1, y1 - 0.75, z - hz - 0.1, x + hx + 0.1, y1 - 0.5, z + hz + 0.1, TRIM);
  for (const s of [-1, 1]) {
    const px = along === 'x' ? x + s * 0.38 : x, pz = along === 'x' ? z : z + s * 0.38;
    b.cyl(px, pz, y1 - 0.5, y1, 0.2, 0.16, 6, BRICK_OLD);
  }
}

/** Iron cresting along a ridge: a rail with spikes on it. */
function cresting(b: GeoBuilder, a: V3, c: V3, every = 0.5): void {
  const n = Math.max(1, Math.round(Math.hypot(c[0] - a[0], c[2] - a[2]) / every));
  b.beam([a[0], a[1] + 0.3, a[2]], [c[0], c[1] + 0.3, c[2]], 0.04, 0.04, IRON);
  for (let i = 0; i <= n; i++) {
    const x = a[0] + ((c[0] - a[0]) * i) / n, y = a[1] + ((c[1] - a[1]) * i) / n, z = a[2] + ((c[2] - a[2]) * i) / n;
    b.beam([x, y, z], [x, y + (i % 2 ? 0.42 : 0.6), z], 0.035, 0.015, IRON);
  }
}

/**
 * A stone balustrade along a line of corners, as look.ts draws one (a rail on
 * short posts, a pier every `every` units), but with one pier at each corner
 * where two lengths meet, not two in one place. Returns where its piers stand.
 */
function balustrade(b: GeoBuilder, pts: P2[], y: number, color = TRIM, every = 4): P2[] {
  const piers: P2[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az);
    if (len < 1e-3) continue;
    const yaw = Math.atan2(bz - az, bx - ax), dx = (bx - ax) / len, dz = (bz - az) / len;
    b.obox((ax + bx) / 2, y + 1.0, (az + bz) / 2, len / 2, 0.1, 0.16, yaw, color, { faces: 'NESWTB' });
    b.obox((ax + bx) / 2, y + 0.1, (az + bz) / 2, len / 2, 0.1, 0.14, yaw, color, { faces: 'NESWTB' });
    const n = Math.max(1, Math.round(len / every));
    for (let j = i === 0 ? 0 : 1; j <= n; j++) {
      const s = (j / n) * len, p: P2 = [ax + dx * s, az + dz * s];
      b.obox(p[0], y + 0.6, p[1], 0.22, 0.6, 0.22, yaw, color, { faces: 'NESWTB' });
      piers.push(p);
    }
    b.obox((ax + bx) / 2, y + 0.55, (az + bz) / 2, len / 2, 0.36, 0.05, yaw, STONE_LIGHT, { faces: 'NESWTB' });
  }
  return piers;
}

/** An urn on a pier or a pedestal whose top is at `y`. */
function urn(b: GeoBuilder, x: number, y: number, z: number, s = 1): void {
  b.cyl(x, z, y, y + 0.12 * s, 0.2 * s, 0.2 * s, 6, TRIM, { cap: false });
  b.cyl(x, z, y + 0.12 * s, y + 0.45 * s, 0.14 * s, 0.3 * s, 6, TRIM, { cap: false });
  b.cyl(x, z, y + 0.45 * s, y + 0.6 * s, 0.3 * s, 0.24 * s, 6, TRIM, { cap: IVY_DARK });
}

/** The height of the Kane Bridge's road at a place along it, read off its middle as it was laid. */
function kaneRoad(): (z: number) => number {
  const path = MIDDLES.circuit, p = new THREE.Vector3(), pts: [number, number][] = [];
  if (path) {
    const n = Math.ceil(path.length / 0.4);
    for (let i = 0; i <= n; i++) {
      path.at((i / n) * path.length, p);
      if (Math.abs(p.x - KANE.x) < 0.8 && p.z > KANE.z0 - 4 && p.z < KANE.z1 + 4) pts.push([p.z, p.y]);
    }
  }
  pts.sort((a, b) => a[0] - b[0]);
  const plain = (z: number): number => KANE.north + ((KANE.south - KANE.north) * Math.min(1, Math.max(0, (z - KANE.z0) / (KANE.z1 - KANE.z0))));
  if (pts.length < 2) return plain;
  return (z: number): number => {
    if (z <= pts[0][0]) return pts[0][1];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [za, ya] = pts[i], [zb, yb] = pts[i + 1];
      if (z <= zb) return ya + ((yb - ya) * (z - za)) / Math.max(1e-6, zb - za);
    }
    return pts[pts.length - 1][1];
  };
}

/** A surface of water of this file's own, at its own height: the grotto's pool. */
function waterOf(k: Build, shapes: { pts: P2[]; y: number }[], color: number): void {
  const pos: number[] = [];
  for (const { pts, y } of shapes) {
    const v2 = pts.map((p) => new THREE.Vector2(p[0], p[1]));
    for (const t of THREE.ShapeUtils.triangulateShape(v2, [])) {
      const [a, b, c] = t.map((i) => pts[i]);
      const over = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
      for (const p of over >= 0 ? [a, b, c] : [a, c, b]) pos.push(p[0], y, p[1]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, makeWaterMaterial(k.look, color));
  mesh.receiveShadow = true;
  mesh.layers.set(1);
  k.group.add(mesh);
}

/** A band along a line of corners, `half` either side of it, laid on the ground as built `lift` above it, in short pieces: a drive, a lawn's stripe. */
function laid(b: GeoBuilder, line: P2[], half: number, color: number, lift = 0.07, step = 1.4, y?: number): void {
  const dense: P2[] = [];
  for (let i = 0; i + 1 < line.length; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let j = 0; j < n; j++) dense.push([ax + ((bx - ax) * j) / n, az + ((bz - az) * j) / n]);
  }
  dense.push(line[line.length - 1]);
  const side = dense.map((p, i) => {
    const a = dense[Math.max(0, i - 1)], c = dense[Math.min(dense.length - 1, i + 1)], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz) || 1;
    return [-dz / l, dx / l] as P2;
  });
  const at = (i: number, s: number): V3 => {
    const x = dense[i][0] + side[i][0] * half * s, z = dense[i][1] + side[i][1] * half * s;
    return [x, (y ?? landAt(x, z)) + lift, z];
  };
  for (let i = 0; i + 1 < dense.length; i++) {
    slope3(b, at(i, -1), at(i, 1), at(i + 1, 1), color);
    slope3(b, at(i, -1), at(i + 1, 1), at(i + 1, -1), color);
  }
}

/** A level quad that faces the sky, from (x0, z0) to (x1, z1) at height y. */
const flat = (b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, color: number, o: { win?: ReturnType<typeof interior> } = {}): void =>
  b.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], color, o);

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------

/** The Batcomputer's great screen: a map of the city, a trace, and rows of figures. */
function paintScreen(ctx: CanvasRenderingContext2D, _s: SignDef, w: number, h: number): void {
  ctx.fillStyle = '#04101d';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(70,160,255,0.28)';
  ctx.lineWidth = 1;
  for (let x = 8; x < w * 0.66; x += 12) { ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x, h - 8); ctx.stroke(); }
  for (let y = 8; y < h - 4; y += 12) { ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(w * 0.66, y); ctx.stroke(); }
  // the rivers
  ctx.strokeStyle = '#4fc3ff';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(10, h * 0.28); ctx.bezierCurveTo(w * 0.25, h * 0.2, w * 0.45, h * 0.34, w * 0.66, h * 0.24); ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(w * 0.18, h * 0.3); ctx.lineTo(w * 0.48, h * 0.92); ctx.stroke();
  // blocks
  ctx.fillStyle = 'rgba(110,200,255,0.55)';
  const R = rng(77);
  for (let i = 0; i < 26; i++) ctx.fillRect(12 + R() * w * 0.6, h * 0.36 + R() * h * 0.56, 4 + R() * 8, 3 + R() * 7);
  // a place marked
  ctx.strokeStyle = '#ff4a4a';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(w * 0.4, h * 0.62, 9, 0, PI * 2); ctx.stroke();
  // a trace and rows of figures on the right
  ctx.strokeStyle = '#7dffb0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 30; i++) {
    const x = w * 0.7 + (i / 30) * w * 0.27, y = h * 0.2 + Math.sin(i * 0.9) * 8 + Math.sin(i * 2.3) * 4;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(150,215,255,0.8)';
  for (let i = 0; i < 9; i++) ctx.fillRect(w * 0.7, h * 0.36 + i * 10, w * (0.1 + ((i * 37) % 17) / 100), 4);
  ctx.strokeStyle = '#2f7fd0';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, w - 4, h - 4);
}

/** A side screen: a slowly turning globe of lines, and a column of readings. */
function paintSide(ctx: CanvasRenderingContext2D, _s: SignDef, w: number, h: number): void {
  ctx.fillStyle = '#05121f';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#4fb8ff';
  ctx.lineWidth = 2;
  const cx = w * 0.36, cy = h * 0.5, r = h * 0.36;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, PI * 2); ctx.stroke();
  for (const f of [0.35, 0.75]) { ctx.beginPath(); ctx.ellipse(cx, cy, r * f, r, 0, 0, PI * 2); ctx.stroke(); }
  for (const f of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(cx - r * Math.sqrt(1 - f * f), cy + f * r); ctx.lineTo(cx + r * Math.sqrt(1 - f * f), cy + f * r); ctx.stroke(); }
  ctx.fillStyle = '#9fe0ff';
  for (let i = 0; i < 6; i++) ctx.fillRect(w * 0.68, h * 0.18 + i * h * 0.12, w * (0.12 + (i % 3) * 0.06), h * 0.05);
  ctx.strokeStyle = '#2f7fd0';
  ctx.strokeRect(2, 2, w - 4, h - 4);
}

/** The giant Joker card's face: a jester's cap and a grin, this tile's own drawing, and JOKER at two corners. */
function paintCard(ctx: CanvasRenderingContext2D, _s: SignDef, w: number, h: number): void {
  ctx.fillStyle = '#f5f0e4';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#b8202c';
  ctx.lineWidth = 3;
  ctx.strokeRect(7, 7, w - 14, h - 14);
  // JOKER down two corners
  ctx.fillStyle = '#b8202c';
  ctx.font = `900 ${Math.round(w * 0.1)}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  'JOKER'.split('').forEach((ch, i) => {
    ctx.fillText(ch, w * 0.12, h * 0.12 + i * w * 0.11);
    ctx.save();
    ctx.translate(w * 0.88, h * 0.88 - i * w * 0.11);
    ctx.rotate(PI);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  // the cap: three drooping points, purple, green and purple, with a bell at each tip
  const cx = w / 2, band = h * 0.42;
  const point = (tipX: number, tipY: number, x0: number, x1: number, color: string): void => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x0, band);
    ctx.quadraticCurveTo((x0 + tipX) / 2, band - h * 0.26, tipX, tipY);
    ctx.quadraticCurveTo((x1 + tipX) / 2 + (tipX < cx ? w * 0.08 : tipX > cx ? -w * 0.08 : 0), band - h * 0.12, x1, band);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e6b52c';
    ctx.beginPath(); ctx.arc(tipX, tipY, w * 0.045, 0, PI * 2); ctx.fill();
  };
  point(cx - w * 0.3, band - h * 0.05, cx - w * 0.24, cx - w * 0.02, '#6a2f8f');
  point(cx + w * 0.3, band - h * 0.05, cx + w * 0.02, cx + w * 0.24, '#6a2f8f');
  point(cx, band - h * 0.27, cx - w * 0.12, cx + w * 0.12, '#2f8f4a');
  ctx.fillStyle = '#e6b52c';
  ctx.fillRect(cx - w * 0.26, band - 2, w * 0.52, h * 0.035);
  // two eyes and a wide grin under it
  ctx.fillStyle = '#1d1d22';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * w * 0.1, h * 0.53, w * 0.03, w * 0.045, 0, 0, PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#b8202c';
  ctx.lineWidth = Math.max(3, w * 0.035);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, h * 0.55, w * 0.2, 0.15 * PI, 0.85 * PI); ctx.stroke();
  ctx.lineWidth = 2;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * w * 0.2, h * 0.6); ctx.lineTo(cx + s * w * 0.23, h * 0.57); ctx.stroke(); }
}

/** Every sign this file hangs. Each id begins with `bristol-`. */
export const SIGNS: SignDef[] = [
  nameSign('bristol-manor', 'Wayne Manor'),
  nameSign('bristol-kane', 'Kane Memorial Bridge'),
  { id: 'bristol-screen', lines: [], color: '#04101d', aspect: 1.6, kind: 'board', size: [256, 160], paint: paintScreen },
  { id: 'bristol-screen-side', lines: [], color: '#05121f', aspect: 1.4, kind: 'board', size: [140, 100], paint: paintSide },
  { id: 'bristol-card', lines: [], color: '#f5f0e4', aspect: 0.72, kind: 'board', size: [144, 200], paint: paintCard },
];

// ---------------------------------------------------------------------------
// Where things stand, from the plan
// ---------------------------------------------------------------------------

const M = lotOf('manor'), COURT = lotOf('forecourt');
const SHAFT = CREST.cave, COVE = CREST.cove, SPUR = CREST.spur, CLIFF = CREST.cliff;
const COVE_MID = (COVE.x0 + COVE.x1) / 2;
/** The middle of the shaft of the lift, which is the mirror pool's. */
const SHAFT_X = (SHAFT.x0 + SHAFT.x1) / 2, SHAFT_Z = (SHAFT.z0 + SHAFT.z1) / 2;
/** The grotto's pool and the ford through it. */
const POOL_Y = Y.cave + 0.25, FORD_Y = POOL_Y - 0.03;
/** The waterfall's lip under the terrace's slab, and how far inside the cliff's face it hangs. */
const FALL = { top: Y.crest - 0.6, z: CLIFF - 0.6 };
/** The grotto's ceiling: the underside of the terrace's slab and of the tower's floor over it. */
const GROTTO_ROOF = Y.crest - 0.5;
/** The house's levels: where its walls stand in the ground, its doors' sills, its plinth's top, where its storeys begin. */
const FOOT = Y.crest - 0.4, SILL = Y.crest + 0.5, PLINTH = Y.crest + 2;
/** Its depths: the back of the main pile, the front of the pavilions and the tower, and the front of the ranges between them. */
const ZB = M.z1 - 8, ZP = M.z1 - 1, ZR = ZP - 1.5;
/** The end pavilions, west and east, and the side each turret is on. */
const PAV = [{ x0: M.x0 + 0.8, x1: M.x0 + 6, outer: -1 }, { x0: M.x1 - 6, x1: M.x1 - 0.8, outer: 1 }];
/** The great tower, which stands over the grotto. */
const TOWER = { x0: COVE.x0, x1: COVE.x1, z0: ZB, z1: ZP, top: 29.5 };
/** The two ranges between the pavilions and the tower, and the way each one's far end points. */
const RANGES = [{ x0: PAV[0].x1, x1: TOWER.x0, dir: -1 }, { x0: TOWER.x1, x1: PAV[1].x0, dir: 1 }];
/** The tower's porch, with the front door in it. */
const PORCH = { x0: COVE_MID - 2.4, x1: COVE_MID + 2.4, z0: ZP, z1: M.z1, top: Y.crest + 5.2, door: 1.0 };
/** The terrace walk along the cliff's edge: its flags, and the balustrade along the edge. */
const TERRACE = { top: Y.crest + 0.04, z1: CLIFF - 0.12, rail: CLIFF - 0.3 };
/** The porte-cochère at the east end, towards the entrance court, and the east door in it. */
const PORTE = { x0: PAV[1].x1, x1: PAV[1].x1 + 4.6, z0: ZP - 6.2, z1: ZP - 1.6, top: Y.crest + 3.9 };
const PORTE_Z = (PORTE.z0 + PORTE.z1) / 2;
/** The garden door in the west pavilion's end, and where the drive comes into the court. */
const GARDEN_DOOR_Z = ZP - 3.5, DRIVE_IN = COURT.z1 - 9;
/** The mirror pool's two halves: how far each is from the seam to its outer kerb, and how far each sinks and slides. */
const HATCH = { hw: (SHAFT.x1 - SHAFT.x0) / 2, hd: (SHAFT.z1 - SHAFT.z0) / 2, kerb: 1, sink: 0.4, slide: 7.3, seam: 0.015 };
/** The lift's platform: half its size, and where its top is when down and up. */
const LIFT = { hw: 6.5, hd: 5.5, down: Y.cave + 0.6, up: Y.crest };
/** The old tunnel's mouth in the spur's west face: where its middle is, and half its width. It is 4.1 wide for the Batmobile, whose wing is 3.84. */
const OLD_TUNNEL = { z: CLIFF + 2.6, half: 2.05 };
/** The Batboat's arch in the shelf's river wall. */
const BOATHOUSE = { x: 30, z: -67, half: 2.5 };
/** The gates on the shelf. */
const GATES = { x: 96, z: -79.5 };
/** The hero's place on the lawn, and the stone stand it is on. */
const STAND = HERO_SPOTS.find((s) => s.id === 'garden') ?? { x: 5, z: -104.5, y: Y.crest + 0.34 };

/** Places on what this file builds that the show needs as built: its task names them. */
export const PLACES: Record<string, Place> = {
  // the grotto and the fall
  batmobile: { x: COVE_MID, y: FORD_Y, z: FALL.z - 3.5, h: PI / 2 },
  coveTunnel: { x: COVE_MID, y: FORD_Y, z: COVE.z0 + 0.45, h: PI / 2 },
  fordSouth: { x: COVE_MID, y: FORD_Y, z: CLIFF - 0.15, h: PI / 2 },
  fallTop: { x: COVE_MID, y: FALL.top, z: FALL.z, h: PI / 2 },
  fallFoot: { x: COVE_MID, y: POOL_Y, z: CLIFF - 0.4, h: PI / 2 },
  // the pool and the lift
  hatch: { x: SHAFT_X, y: Y.crest, z: SHAFT_Z, h: 0 },
  batplane: { x: SHAFT_X, y: LIFT.down, z: SHAFT_Z, h: PI / 2 },
  // the house
  alfred: { x: COVE_MID, y: TERRACE.top, z: M.z1 + 1.2, h: PI / 2 },
  manorDoor: { x: COVE_MID, y: SILL, z: M.z1 - 0.2, h: PI / 2 },
  eastDoor: { x: PORTE.x0 + 0.75, y: TERRACE.top, z: PORTE_Z, h: 0 },
  eastPath: { x: PORTE.x0 + 3.75, y: TERRACE.top, z: PORTE_Z, h: 0 },
  gardenDoor: { x: PAV[0].x0 - 1.9, y: TERRACE.top, z: GARDEN_DOOR_Z, h: PI },
  terraceWest: { x: M.x0 + 2.6, y: TERRACE.top, z: M.z1 + 0.8, h: PI / 2 },
  terraceEast: { x: M.x1 - 2.6, y: TERRACE.top, z: M.z1 + 0.8, h: PI / 2 },
  towerTop: { x: COVE_MID, y: TOWER.top, z: TOWER.z1 - 0.65, h: PI / 2 },
  // the ring on the lawn east of the court where the helicopter's skids stand
  manorPad: { x: HELIPADS.manor.x, y: Y.crest + 0.09, z: HELIPADS.manor.z, h: Math.atan2(TO_VIEW[2], TO_VIEW[0]) },
  // the west lawn: Damian, his dog, the cow and the cat
  damian: { x: -5.0, y: Y.crest, z: -102.5, h: PI / 4 },
  titus: { x: -3.0, y: Y.crest, z: -101.0, h: PI / 4 },
  batCow: { x: -8.6, y: Y.crest, z: -105.6, h: PI / 3 },
  alfredCat: { x: -2.4, y: Y.crest, z: -104.4, h: PI / 4 },
  // what was there before
  batsCrevice: { x: -18, y: 6, z: CLIFF + 0.4, h: PI / 2 },
  gates: { x: GATES.x, y: Y.shelf, z: GATES.z, h: PI / 2 },
  oldTunnel: { x: SPUR.x0 - 0.45, y: Y.shelf, z: OLD_TUNNEL.z, h: 0 },
  batboat: { x: BOATHOUSE.x, y: Y.water, z: BOATHOUSE.z + 1.2, h: PI / 2 },
};

// ---------------------------------------------------------------------------
// Wayne Manor
// ---------------------------------------------------------------------------

function manor(k: Build, l: Lot): void {
  for (const p of PAV) pavilion(k, p.x0, p.x1, p.outer);
  for (const r of RANGES) range(k, r.x0, r.x1, r.dir);
  tower(k);
  serviceRange(k, l);
  porteCochere(k);
  terraceWalk(k, l);
  cliffFront(k);
  // the house's lamps by night: before the front door, before the pavilions, in the porte-cochère
  k.lights.push({ x: COVE_MID, z: M.z1 + 1.4, r: 12, color: AMBER, k: 0.5 });
  for (const p of PAV) k.lights.push({ x: (p.x0 + p.x1) / 2, z: M.z1 + 1, r: 8, color: AMBER, k: 0.4 });
}

/** An end pavilion: three storeys to a gable over the front, a bay window through two of them, a stair turret at its outer front corner. */
function pavilion(k: Build, x0: number, x1: number, outer: number): void {
  const b = k.b, mid = (x0 + x1) / 2, hw = (x1 - x0) / 2, ox = outer < 0 ? x0 : x1, seed = outer < 0 ? 5.3 : 5.9;
  const EAVE = 24, RIDGE = EAVE + 4;

  // the plinth, the walls, and the string courses and cornice round them
  solid(b, x0 - 0.15, FOOT, ZB - 0.15, x1 + 0.15, PLINTH, ZP + 0.15, LIMESTONE_DARK, 'NESWT');
  b.box(x0, PLINTH, ZB, x1, EAVE, ZP, LIMESTONE, { faces: 'NEW', win: GOTHIC_WIN, seed });
  b.box(x0, PLINTH, ZB, x1, EAVE, ZP, LIMESTONE, { faces: 'S' });
  for (const y of [16, 20]) solid(b, x0 - 0.1, y - 0.12, ZB - 0.1, x1 + 0.1, y + 0.1, ZP + 0.1, TRIM, 'NESWTB');
  solid(b, x0 - 0.18, EAVE - 0.25, ZB - 0.18, x1 + 0.18, EAVE + 0.05, ZP + 0.18, TRIM, 'NESWTB');

  // the roof: a gable to the front, a hip behind under the ceiling; the gable's coping, kneelers and finial
  pitchedZ(b, x0, x1, ZB, ZP, EAVE, RIDGE - EAVE, { ends: ['h', 'g'], over: 0.35, wall: LIMESTONE });
  for (const s of [-1, 1]) {
    b.beam([mid + s * (hw + 0.2), EAVE - 0.05, ZP + 0.12], [mid, RIDGE + 0.2, ZP + 0.12], 0.17, 0.17, TRIM);
    solid(b, mid + s * hw - 0.4, EAVE - 0.1, ZP - 0.25, mid + s * hw + 0.4, EAVE + 0.55, ZP + 0.3, TRIM);
  }
  pinnacle(b, mid, ZP + 0.1, RIDGE + 0.1, 1.5, 0.2, TRIM);
  b.moved(mid, 0, ZP, 0, () => {
    lancet(b, 0.7, EAVE + 0.7, EAVE + 1.8, { lights: 1, lit: 1.8 });
    lancet(b, 1.8, 21.2, 22.9, { lights: 2, head: 0.45 });
  });
  chimney(b, mid, ZB + 1.4, RIDGE - 2.1, RIDGE + 1.8);

  // the bay window through the two lower storeys, battlemented, with pinnacles at its front corners
  {
    const bx0 = mid - 1.6, bx1 = mid + 1.6, zf = M.z1, top = 20.3;
    solid(b, bx0 - 0.12, FOOT, ZP, bx1 + 0.12, PLINTH, zf + 0.12, LIMESTONE_DARK, 'ESWT');
    b.box(bx0, PLINTH, ZP, bx1, top, zf, LIMESTONE, { faces: 'ESWT', top: LEAD });
    b.moved(mid, 0, zf, 0, () => lancet(b, 2.6, 12.5, 18.6, { lights: 3, transom: 15.5, head: 0.32 }));
    for (const [x, face] of [[bx0, 'W'], [bx1, 'E']] as const) {
      onFace(b, face, x, (ZP + zf) / 2, () => {
        lancet(b, 0.45, 12.6, 15.0, { lights: 1 });
        lancet(b, 0.45, 16.6, 18.9, { lights: 1 });
      });
      solid(b, x - 0.16, top, ZP, x + 0.16, top + 0.6, zf - 0.2, TRIM, 'NESWT');
    }
    battlement(b, bx0 - 0.05, bx1 + 0.05, zf + 0.05, 1, top);
    for (const x of [bx0 + 0.05, bx1 - 0.05]) pinnacle(b, x, zf - 0.1, top + 0.7, 1.3, 0.17, TRIM);
  }

  // the stair turret at the outer front corner: round, banded, lit by slits, with a conical cap
  {
    const tx = ox - outer * 0.1, tz = ZP, r = 0.85, ap = r * Math.cos(PI / 8);
    b.cyl(tx, tz, FOOT, PLINTH, r + 0.12, r + 0.12, 8, LIMESTONE_DARK, { cap: false });
    b.cyl(tx, tz, PLINTH, 25.3, r, r, 8, LIMESTONE, { cap: false });
    for (const y of [16, 20]) b.cyl(tx, tz, y - 0.14, y + 0.08, r + 0.08, r + 0.08, 8, TRIM, { cap: false });
    for (const a of outer < 0 ? [PI, (3 * PI) / 4, PI / 2] : [0, PI / 4, PI / 2]) {
      for (const y of [13.0, 17.0, 21.0]) {
        b.moved(tx + Math.cos(a) * ap, 0, tz + Math.sin(a) * ap, yawFacing(Math.cos(a), Math.sin(a)), () =>
          b.quad([-0.1, y, 0.02], [0.1, y, 0.02], [0.1, y + 1.5, 0.02], [-0.1, y + 1.5, 0.02], [0, 0, 1], PANE, { win: interior(2.0) }));
      }
    }
    b.cyl(tx, tz, 25.3, 25.55, r + 0.15, r + 0.15, 8, TRIM);
    b.cyl(tx, tz, 25.55, 30.0, r + 0.13, 0.04, 8, SLATE, { cap: false });
    b.cyl(tx, tz, 29.85, 30.4, 0.09, 0.02, 4, BRASS, { cap: false });
  }

  // ivy up the outer side, near the front
  onFace(b, outer < 0 ? 'W' : 'E', ox, ZP - 2.4, () => ivy(b, outer < 0 ? 41 : 43, 2.2, FOOT + 0.3, 19, 0.15));

  // the garden door in the west pavilion's end, and three steps down into the pool garden
  if (outer < 0) {
    onFace(b, 'W', x0, GARDEN_DOOR_Z, () => {
      const dw = 0.7, d0 = SILL + 0.25, dt = 13.0, z = 0.18;
      b.quad([-dw, d0, z + 0.02], [dw, d0, z + 0.02], [dw, dt, z + 0.02], [-dw, dt, z + 0.02], [0, 0, 1], TIMBER_DARK, { win: interior(0.5) });
      tri(b, [-dw, dt, z + 0.02], [dw, dt, z + 0.02], [0, dt + 0.8, z + 0.02], [0, 0, 1], TIMBER_DARK, { win: interior(0.5) });
      for (const s of [-1, 1]) {
        b.box(s * (dw + 0.12) - 0.13, FOOT, 0, s * (dw + 0.12) + 0.13, dt, z + 0.1, TRIM, { faces: 'SEWT' });
        b.beam([s * (dw + 0.12), dt - 0.05, z + 0.05], [0, dt + 0.95, z + 0.05], 0.13, 0.13, TRIM);
      }
      // the steps: a landing at the sill, then two more down to the walk
      for (const [z0, z1, y] of [[0, 0.45, d0], [0.45, 0.85, SILL], [0.85, 1.25, SILL - 0.23]]) b.box(-1.0, FOOT, z0, 1.0, y, z1, STONE_LIGHT, { faces: 'ESWT' });
    });
    gasLamp(k, x0 - 0.35, 13.4, GARDEN_DOOR_Z + 1.2, 0, AMBER);
  }
}

/** A range between a pavilion and the tower: two storeys of tall mullioned windows, battlemented, with a steep roof, two dormers and a tall stack. */
function range(k: Build, x0: number, x1: number, dir: number): void {
  const b = k.b, EAVE = 20, rise = 5, half = (ZR - ZB) / 2, slope = rise / half;
  // the plinth stops short of its neighbours', so that their tops never lie in one plane
  solid(b, x0 + 0.15, FOOT, ZB, x1 - 0.15, PLINTH, ZR + 0.15, LIMESTONE_DARK, 'ST');
  b.box(x0, PLINTH, ZB, x1, EAVE, ZR, LIMESTONE, { faces: 'S' });
  solid(b, x0, 15.85, ZR, x1, 16.05, ZR + 0.1, TRIM, 'STB');
  solid(b, x0, EAVE - 0.25, ZR, x1, EAVE, ZR + 0.14, TRIM, 'STB');
  for (let i = 0; i < 3; i++) {
    const x = x0 + ((i + 0.5) * (x1 - x0)) / 3;
    b.moved(x, 0, ZR, 0, () => {
      lancet(b, 1.5, 12.6, 14.9, { lights: 2, transom: 13.9 });
      lancet(b, 1.5, 16.6, 18.9, { lights: 2, transom: 17.9 });
    });
  }
  battlement(b, x0, x1, ZR + 0.14, 1, EAVE);
  // the roof reaches into the pavilion's, so that its end is buried there; the tower is taller and hides the other
  roofX(b, x0 - (dir < 0 ? 0.75 : 0), x1 + (dir > 0 ? 0.75 : 0), ZB, ZR, EAVE, rise, { overS: 0, overN: 0.3, overX: 0, gables: false });
  // two dormers on its front slope
  for (const xd of [x0 + 2.2, x1 - 2.2]) {
    const zf = ZR - 0.8, yb = EAVE + 0.8 * slope - 0.25;
    b.box(xd - 0.75, yb, zf - 1.6, xd + 0.75, 22.9, zf, LIMESTONE, { faces: 'SEW' });
    gable(b, xd - 0.75, zf - 1.8, xd + 0.75, zf, 22.9, 0.85, SLATE, LIMESTONE, 'z', 0.15);
    b.moved(xd, 0, zf, 0, () => lancet(b, 0.75, 21.5, 22.3, { lights: 1, lit: 2 }));
  }
  chimney(b, (x0 + x1) / 2, (ZB + ZR) / 2, EAVE + rise - 0.6, EAVE + rise + 3.6);
}

/** The great tower in the middle: a porch with the front door, a great traceried window, a clock, a battlemented top with corner turrets, a steep roof with cresting, and a flag. */
function tower(k: Build): void {
  const b = k.b, T = TOWER, cx = COVE_MID, cz = (T.z0 + T.z1) / 2, top = T.top;

  // the body, on its plinth; its top stage is the leads behind the parapet
  solid(b, T.x0 - 0.15, FOOT, T.z0, T.x1 + 0.15, PLINTH, T.z1 + 0.15, LIMESTONE_DARK, 'ESWT');
  b.box(T.x0, PLINTH, T.z0, T.x1, 28, T.z1, LIMESTONE, { faces: 'NEW', win: GOTHIC_WIN, seed: 7.7 });
  b.box(T.x0, PLINTH, T.z0, T.x1, 28, T.z1, LIMESTONE, { faces: 'S' });
  b.box(T.x0, 28, T.z0, T.x1, top, T.z1, LIMESTONE, { faces: 'NESWT', top: LEAD });
  for (const [y0, y1] of [[22.85, 23.1], [27.3, 27.6]]) solid(b, T.x0 - 0.14, y0, T.z0 - 0.14, T.x1 + 0.14, y1, T.z1 + 0.14, TRIM);
  // quoins up its two front corners
  for (const x of [T.x0 - 0.1, T.x1 - 0.32]) solid(b, x, PLINTH, T.z1 - 0.3, x + 0.42, 22.85, T.z1 + 0.1, TRIM, 'ESWT');

  // the porch, standing out onto the terrace, with the front door in a pointed arch
  {
    const P = PORCH, dh = P.door, spring = 13.0, r = 1.35, deep = 0.45;
    b.box(P.x0, FOOT, P.z0, P.x1, P.top, P.z1, LIMESTONE, { faces: 'EW' });
    b.quad([P.x0, FOOT, P.z1], [cx - dh, FOOT, P.z1], [cx - dh, P.top, P.z1], [P.x0, P.top, P.z1], [0, 0, 1], LIMESTONE);
    b.quad([cx + dh, FOOT, P.z1], [P.x1, FOOT, P.z1], [P.x1, P.top, P.z1], [cx + dh, P.top, P.z1], [0, 0, 1], LIMESTONE);
    flat(b, P.x0, P.z0, P.x1, P.z1, P.top, LEAD);
    pointedArch(b, cx, P.z1 - deep, P.z1, dh, r, spring, P.top, LIMESTONE, LIMESTONE_DARK, 5);
    for (const s of [-1, 1]) b.quad([cx + s * dh, SILL, P.z1 - deep], [cx + s * dh, SILL, P.z1], [cx + s * dh, spring, P.z1], [cx + s * dh, spring, P.z1 - deep], [-s, 0, 0], LIMESTONE_DARK);
    solid(b, cx - dh, FOOT, P.z1 - deep, cx + dh, SILL, P.z1, STONE_LIGHT, 'ST');
    // the door: oak, in two leaves, lit through a fanlight at night
    const apex = spring + archRise(dh, r) - 0.03, zl = P.z1 - deep + 0.02;
    b.quad([cx - dh, SILL, zl], [cx + dh, SILL, zl], [cx + dh, spring, zl], [cx - dh, spring, zl], [0, 0, 1], TIMBER_DARK);
    tri(b, [cx - dh, spring, zl], [cx + dh, spring, zl], [cx, apex, zl], [0, 0, 1], PANE, { win: interior(2.4) });
    b.box(cx - 0.05, SILL, zl, cx + 0.05, spring, zl + 0.05, 0x2a1c12, { faces: 'SEW' });
    // its surround of trim, the plinth's band each side, and a lamp on each side
    for (const s of [-1, 1]) {
      b.beam([cx + s * (dh + 0.16), FOOT, P.z1 + 0.08], [cx + s * (dh + 0.16), spring, P.z1 + 0.08], 0.14, 0.14, TRIM);
      b.beam([cx + s * (dh + 0.16), spring - 0.05, P.z1 + 0.08], [cx, apex + 0.3, P.z1 + 0.08], 0.14, 0.14, TRIM);
      const bx0 = s < 0 ? P.x0 - 0.1 : cx + dh + 0.3, bx1 = s < 0 ? cx - dh - 0.3 : P.x1 + 0.1;
      solid(b, bx0, FOOT, P.z0, bx1, PLINTH, P.z1 + 0.1, LIMESTONE_DARK, 'ESWT');
      b.beam([cx + s * 2.0, 13.0, P.z1], [cx + s * 2.0, 13.0, P.z1 + 0.4], 0.05, 0.05, IRON_DARK);
      gasLamp(k, cx + s * 2.0, 12.6, P.z1 + 0.45, 0, AMBER);
    }
    // battlements, and pinnacles at its front corners
    battlement(b, P.x0, P.x1, P.z1 + 0.1, 1, P.top);
    for (const x of [P.x0, P.x1]) pinnacle(b, x, P.z1, P.top + 0.7, 1.4, 0.2, TRIM);
    // the two steps up from the terrace to the sill
    solid(b, cx - 1.6, FOOT, P.z1, cx + 1.6, SILL - 0.15, P.z1 + 0.4, STONE_LIGHT, 'ESWT');
    solid(b, cx - 1.9, FOOT, P.z1 + 0.4, cx + 1.9, SILL - 0.3, P.z1 + 0.75, STONE_LIGHT, 'ESWT');
  }

  // the great window over the porch, traceried, and the clock over it
  b.moved(cx, 0, T.z1, 0, () => lancet(b, 3.4, 16.0, 20.4, { lights: 3, transom: 18.2, head: 0.62, tracery: true }));
  {
    const cy = 25.2, z = T.z1;
    roundel(b, [cx, cy, z + 0.04], 1.62, 'S', TRIM, {}, 16);
    roundel(b, [cx, cy, z + 0.08], 1.4, 'S', DIAL, { win: interior(1.6) }, 16);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2, tx = cx + Math.cos(a) * 1.18, ty = cy + Math.sin(a) * 1.18, s = i % 3 === 0 ? 0.11 : 0.06;
      b.quad([tx - s, ty - s, z + 0.1], [tx + s, ty - s, z + 0.1], [tx + s, ty + s, z + 0.1], [tx - s, ty + s, z + 0.1], [0, 0, 1], 0x24221f);
    }
    // the hands at ten past ten
    b.beam([cx, cy, z + 0.13], [cx - 0.62, cy + 0.36, z + 0.13], 0.07, 0.04, 0x24221f);
    b.beam([cx, cy, z + 0.14], [cx + 0.85, cy + 0.5, z + 0.14], 0.05, 0.03, 0x24221f);
  }

  // the top stage, lit at night: three small lancets to the front, two on each other face
  b.moved(cx, 0, T.z1, 0, () => { for (const x of [-2, 0, 2]) b.moved(x, 0, 0, 0, () => lancet(b, 0.7, 27.85, 28.9, { lights: 1, lit: 2.8 })); });
  for (const [face, x, z, along] of [['E', T.x1, cz, 'z'], ['W', T.x0, cz, 'z'], ['N', cx, T.z0, 'x']] as const) {
    for (const d of [-1.5, 1.5]) onFace(b, face, along === 'z' ? x : x + d, along === 'z' ? z + d : z, () => lancet(b, 0.7, 27.85, 28.9, { lights: 1, lit: 2.8 }));
  }

  // gargoyles on the string course under the clock, one out at each corner
  for (const [x, z, yaw] of [[T.x0 - 0.05, T.z1 + 0.05, (3 * PI) / 4], [T.x1 + 0.05, T.z1 + 0.05, PI / 4], [T.x0 - 0.05, T.z0 - 0.05, (-3 * PI) / 4], [T.x1 + 0.05, T.z0 - 0.05, -PI / 4]] as const) {
    gargoyle(b, x, 23.1, z, yaw, 0.8);
  }

  // the parapet, battlemented, and a turret corbelled out at each corner
  battlement(b, T.x0, T.x1, T.z1 + 0.12, 1, top);
  battlement(b, T.x0, T.x1, T.z0 - 0.12, -1, top);
  for (const [face, x] of [['E', T.x1], ['W', T.x0]] as const) onFace(b, face, x, cz, () => battlement(b, -(T.z1 - T.z0) / 2, (T.z1 - T.z0) / 2, 0.12, 1, top));
  for (const [x, z] of [[T.x0, T.z1], [T.x1, T.z1], [T.x0, T.z0], [T.x1, T.z0]]) {
    b.cyl(x, z, 25.3, 26.4, 0.12, 0.9, 8, TRIM, { cap: false });
    b.cyl(x, z, 26.4, 31.4, 0.85, 0.85, 8, LIMESTONE, { cap: false });
    b.cyl(x, z, 31.4, 31.65, 1.0, 1.0, 8, TRIM);
    b.cyl(x, z, 31.65, 34.1, 0.97, 0.04, 8, SLATE, { cap: false });
    const a = Math.atan2(z - cz, x - cx), ap = 0.85 * Math.cos(PI / 8) + 0.02;
    b.moved(x + Math.cos(a) * ap, 0, z + Math.sin(a) * ap, yawFacing(Math.cos(a), Math.sin(a)), () =>
      b.quad([-0.1, 28.2, 0], [0.1, 28.2, 0], [0.1, 29.7, 0], [-0.1, 29.7, 0], [0, 0, 1], PANE, { win: interior(2.4) }));
  }

  // the roof: steep, its slopes leaning in to a small flat top with iron cresting round it, and a lucarne to the front
  {
    const rx0 = T.x0 + 1.0, rx1 = T.x1 - 1.0, rz0 = T.z0 + 0.9, rz1 = T.z1 - 1.3, ry = 36.4;
    const inX = (rx1 - rx0 - 1) / 2, inZ = (rz1 - rz0 - 1) / 2, rzc = (rz0 + rz1) / 2;
    hipped(b, rx0, rz0, rx1, rz1, top, ry, inX, inZ, SLATE, LEAD);
    const c: V3[] = [[cx - 0.5, ry, rzc - 0.5], [cx + 0.5, ry, rzc - 0.5], [cx + 0.5, ry, rzc + 0.5], [cx - 0.5, ry, rzc + 0.5]];
    for (let i = 0; i < 4; i++) cresting(b, c[i], c[(i + 1) % 4], 0.33);
    // the lucarne: a small gabled window on the front slope
    const ly = 31.2, lz = rz1 - ((ly - top) / (ry - top)) * inZ;
    b.box(cx - 0.6, ly - 0.3, lz - 0.8, cx + 0.6, ly + 1.2, lz, LIMESTONE, { faces: 'SEW' });
    gable(b, cx - 0.6, lz - 1.0, cx + 0.6, lz, ly + 1.2, 0.7, SLATE, LIMESTONE, 'z', 0.12);
    b.moved(cx, 0, lz, 0, () => lancet(b, 0.55, ly, ly + 0.8, { lights: 1, lit: 2.6, head: 0.4 }));
    // the mast and the flag, flying east
    b.cyl(cx, rzc, ry, 41.0, 0.13, 0.07, 6, 0xd8d8d8, { cap: false });
    b.cyl(cx, rzc, 40.95, 41.25, 0.15, 0.15, 6, BRASS);
    for (const s of [-1, 1]) b.quad([cx + 0.1, 39.55, rzc + s * 0.02], [cx + 1.9, 39.65, rzc + s * 0.02], [cx + 1.9, 40.7, rzc + s * 0.02], [cx + 0.1, 40.8, rzc + s * 0.02], [0, 0, s], FLAG);
  }

  // ivy on the tower's foot, beside the porch
  b.moved(T.x1 - 1.0, 0, T.z1, 0, () => ivy(b, 47, 1.4, FOOT + 0.3, 17, 0.15));
}

/** The service ranges along the back, under the ceiling: plain windows, a hipped roof, two chimneys and a back door. */
function serviceRange(k: Build, l: Lot): void {
  const b = k.b, x0 = PAV[0].x0 + 0.6, x1 = PAV[1].x1 - 0.6, z0 = l.z0 + 0.1, z1 = ZB - 0.2, EAVE = 20;
  solid(b, x0 - 0.12, FOOT, z0 - 0.12, x1 + 0.12, PLINTH, z1, LIMESTONE_DARK, 'NEWT');
  b.box(x0, PLINTH, z0, x1, EAVE, z1, LIMESTONE, { faces: 'NEW', win: SMALL_WIN, seed: 9.3 });
  solid(b, x0 - 0.1, EAVE - 0.25, z0 - 0.1, x1 + 0.1, EAVE, z1, TRIM, 'NEWB');
  pitched(b, x0, x1, z0, z1, EAVE, 2.2, { ends: ['h', 'h'], over: 0.3 });
  for (const x of [x0 + 8, x1 - 8]) chimney(b, x, z0 + 1.6, EAVE + 0.8, Math.min(ceilingAt(x, z0 + 1.1) - 0.6, 24.6));
  // the back door and its lamp
  const dx = COVE_MID + 4;
  b.quad([dx - 0.7, SILL, z0 - 0.15], [dx + 0.7, SILL, z0 - 0.15], [dx + 0.7, 12.8, z0 - 0.15], [dx - 0.7, 12.8, z0 - 0.15], [0, 0, -1], TIMBER_DARK, { win: interior(0.5) });
  solid(b, dx - 1.0, FOOT, z0 - 0.75, dx + 1.0, SILL, z0 - 0.12, STONE_LIGHT, 'NEWT');
  gasLamp(k, dx + 1.2, 13.0, z0 - 0.35, 0, AMBER);
}

/** The porte-cochère: a carriage porch of three pointed arches with a flat balustraded roof, before the east door. */
function porteCochere(k: Build): void {
  const b = k.b, P = PORTE, pier = 0.55, half = (P.x1 - P.x0) / 2 - pier, sideHalf = (P.z1 - P.z0) / 2 - 0.5;
  // low pointed arches, struck from 1.15 times their half-width, and sprung so that the widest one's point stays 0.1
  // under the roof's slab (struck from 1.3 times it and sprung 2.2 up, their points stood through the slab)
  const POINT = 1.15, wide = Math.max(half, sideHalf), spring = P.top - 0.1 - archRise(wide, wide * POINT);
  // the piers at its corners
  for (const [x0, z0] of [[P.x0, P.z0], [P.x1 - pier, P.z0], [P.x0, P.z1 - 0.5], [P.x1 - pier, P.z1 - 0.5]]) solid(b, x0, FOOT, z0, x0 + pier, P.top, z0 + 0.5, LIMESTONE, 'NESWT');
  // its arches: one at each end, which the carriages pass through, and one to the court
  for (const z of [P.z0, P.z1 - 0.5]) pointedArch(b, (P.x0 + P.x1) / 2, z, z + 0.5, half, half * POINT, spring, P.top, LIMESTONE, LIMESTONE_DARK, 5);
  b.moved(P.x1 - 0.25, 0, PORTE_Z, PI / 2, () => pointedArch(b, 0, -0.25, 0.25, sideHalf, sideHalf * POINT, spring, P.top, LIMESTONE, LIMESTONE_DARK, 5));
  // its roof: a slab with a cornice, whose underside is the porch's ceiling, and a balustrade round it
  solid(b, P.x0, P.top, P.z0 - 0.1, P.x1 + 0.1, P.top + 0.45, P.z1 + 0.1, TRIM, 'NESWTB');
  const piers = balustrade(b, [[P.x1 - 0.15, P.z0 + 0.15], [P.x1 - 0.15, P.z1 - 0.15]], P.top + 0.45, TRIM, 2.4);
  balustrade(b, [[P.x0 + 0.2, P.z0 + 0.15], [P.x1 - 0.6, P.z0 + 0.15]], P.top + 0.45, TRIM, 2.4);
  balustrade(b, [[P.x0 + 0.2, P.z1 - 0.15], [P.x1 - 0.6, P.z1 - 0.15]], P.top + 0.45, TRIM, 2.4);
  for (const [x, z] of [piers[0], piers[piers.length - 1]]) urn(b, x, P.top + 1.65, z);
  // the flags under it, the east door with its step, and the lamp that hangs inside
  flat(b, P.x0, P.z0, COURT.x0 + 0.2, P.z1, TERRACE.top, FLAGS);
  onFace(b, 'E', P.x0, PORTE_Z, () => {
    const dw = 0.75, dt = 12.9, z = 0.18;
    b.quad([-dw, SILL, z + 0.02], [dw, SILL, z + 0.02], [dw, dt, z + 0.02], [-dw, dt, z + 0.02], [0, 0, 1], TIMBER_DARK, { win: interior(0.5) });
    tri(b, [-dw, dt, z + 0.02], [dw, dt, z + 0.02], [0, dt + 0.8, z + 0.02], [0, 0, 1], PANE, { win: interior(2.2) });
    for (const s of [-1, 1]) b.box(s * (dw + 0.12) - 0.13, FOOT, 0, s * (dw + 0.12) + 0.13, dt + 0.2, z + 0.1, TRIM, { faces: 'SEWT' });
    b.box(-1.0, FOOT, 0, 1.0, SILL, 0.5, STONE_LIGHT, { faces: 'ESWT' });
  });
  b.beam([(P.x0 + P.x1) / 2, P.top, PORTE_Z], [(P.x0 + P.x1) / 2, P.top - 0.6, PORTE_Z], 0.03, 0.03, IRON_DARK);
  k.glows.push({ x: (P.x0 + P.x1) / 2, y: P.top - 0.8, z: PORTE_Z, sx: 0.3, sy: 0.36, sz: 0.3, color: AMBER });
  k.lights.push({ x: (P.x0 + P.x1) / 2, z: PORTE_Z, r: 8, color: AMBER, k: 0.5 });
}

/** The terrace walk along the cliff's edge before the house: flags, and a balustrade along the edge from the pool garden to the court, with urns and lamps on its piers. */
function terraceWalk(k: Build, l: Lot): void {
  const b = k.b, x0 = PAV[0].x0 - 0.15, x1 = l.x1 + 1.0;
  flat(b, x0, ZR, x1, TERRACE.z1, TERRACE.top, FLAGS);
  // the joints between the flags
  for (let x = x0 + 2.4; x < x1 - 0.5; x += 2.4) flat(b, x - 0.04, ZP + 0.05, x + 0.04, TERRACE.z1 - 0.05, TERRACE.top + 0.008, JOINT);
  // the balustrade runs on west along the pool garden's front
  const piers = balustrade(b, [[lotOf('pool-garden').x0 + 0.2, TERRACE.rail], [x1 - 0.2, TERRACE.rail]], TERRACE.top);
  piers.forEach(([x, z], i) => {
    const nearDoor = Math.abs(x - COVE_MID) < 9 && Math.abs(x - COVE_MID) > 4;
    if (nearDoor || i === 2) {
      b.beam([x, TERRACE.top + 1.2, z], [x, TERRACE.top + 2.3, z], 0.08, 0.06, IRON_DARK);
      gasLamp(k, x, TERRACE.top + 2.3, z, 0, AMBER);
    } else if (i % 2 === 1) urn(b, x, TERRACE.top + 1.2, z);
  });
}

/**
 * The cliff under the house, dressed so that the house rises out of it:
 * masonry piers under the pavilions and either side of the grotto, a
 * cornice along the cliff's top under the balustrade, two drain spouts and
 * hanging ivy. Nothing stands more than 0.5 out from the rock's face.
 */
function cliffFront(k: Build): void {
  const b = k.b, z = CLIFF, R = rng(0xc11f);
  // the cornice along the top, broken where the grotto's rock is
  for (const [xa, xc] of [[lotOf('pool-garden').x0, TOWER.x0 - 1.4], [TOWER.x1 + 1.4, M.x1 + 1.0]]) solid(b, xa, GROTTO_ROOF + 0.15, z - 0.05, xc, Y.crest + 0.1, z + 0.28, TRIM, 'ESWTB');
  // the piers: battered, a set-off half way, their feet on the shelf
  const piers: [number, number][] = [];
  for (const p of PAV) piers.push([p.x0 + 0.3, p.x0 + 1.5], [p.x1 - 1.5, p.x1 - 0.3]);
  piers.push([TOWER.x0 - 1.4, TOWER.x0], [TOWER.x1, TOWER.x1 + 1.4]);
  for (const [xa, xc] of piers) {
    solid(b, xa - 0.1, Y.shelf - 0.1, z - 0.05, xc + 0.1, 6.6, z + 0.48, STONE_LIGHT, 'ESWT');
    slab(b, [(xa + xc) / 2, 6.95, z + 0.33], [(xa + xc) / 2, 6.6, z + 0.48], (xc - xa) / 2 + 0.1, 0.05, TRIM);
    solid(b, xa, 6.6, z - 0.05, xc, GROTTO_ROOF + 0.15, z + 0.33, STONE_LIGHT, 'ESW');
    solid(b, xa - 0.06, Y.shelf - 0.1, z + 0.48, xc + 0.06, Y.shelf + 0.35, z + 0.5, TRIM, 'ESWT');
  }
  // two drain spouts out of the cornice, with the stain of the water under each
  for (const x of [(RANGES[0].x0 + RANGES[0].x1) / 2, (RANGES[1].x0 + RANGES[1].x1) / 2]) {
    solid(b, x - 0.16, GROTTO_ROOF - 0.05, z, x + 0.16, GROTTO_ROOF + 0.25, z + 0.48, TRIM, 'NESWTB');
    b.quad([x - 0.3, Y.shelf + 0.3, z + 0.02], [x + 0.3, Y.shelf + 0.3, z + 0.02], [x + 0.25, GROTTO_ROOF + 0.1, z + 0.02], [x - 0.25, GROTTO_ROOF + 0.1, z + 0.02], [0, 0, 1], ROCK_DARK);
  }
  // ivy hanging from the cornice
  for (let i = 0; i < 6; i++) {
    const x = PAV[0].x0 + R() * (PAV[1].x1 - PAV[0].x0);
    if (x > TOWER.x0 - 1.6 && x < TOWER.x1 + 1.6) continue;
    // a few trailing strands of different lengths, not a curtain
    for (let j = 0; j < 4; j++) {
      const xs = x + (j - 1.5) * 0.28 + (R() - 0.5) * 0.1, y0 = GROTTO_ROOF - 0.8 - R() * 2.4, w = 0.09 + R() * 0.06;
      b.quad([xs - w, y0, z + 0.03 + j * 0.005], [xs + w, y0, z + 0.03 + j * 0.005], [xs + w, GROTTO_ROOF + 0.12, z + 0.03 + j * 0.005], [xs - w, GROTTO_ROOF + 0.12, z + 0.03 + j * 0.005], [0, 0, 1], (i + j) % 2 ? IVY : IVY_DARK);
    }
  }
}

// ---------------------------------------------------------------------------
// The grotto under the tower, behind the waterfall
// ---------------------------------------------------------------------------

/** Half the width of the waterfall's curtain at a height, as air.ts hangs it, from the plan's FALL_HALF. */
const curtainHalf = (y: number): number => FALL_HALF.lip + (FALL_HALF.foot - FALL_HALF.lip) * Math.min(1, Math.max(0, (FALL.top - y) / (FALL.top - POOL_Y)));
/** Half the width of the ford of setts through the grotto, which the Batmobile's wheels keep to on its turn. */
const FORD_HALF = 3.45;
/** The steel door at the grotto's back: half its width, its height, and the name of its shutter's mesh. */
const BACK_DOOR = { half: 2.8, h: 3.6, name: 'bristol-grotto-door' };

function cove(k: Build, l: Lot): void {
  const b = k.b, F = l.base, mid = COVE_MID, R = rng(0xc07e);
  const front = FALL.z + 0.25, face = CLIFF + 0.45;

  // --- the roof: the underside of the terrace's slab and of the tower's floor, with stalactites hanging from it
  b.quad([l.x0, GROTTO_ROOF, l.z0], [l.x1, GROTTO_ROOF, l.z0], [l.x1, GROTTO_ROOF, front], [l.x0, GROTTO_ROOF, front], [0, -1, 0], ROCK_DARK, { win: interior(0.6) });
  for (let i = 0; i < 12; i++) {
    const x = l.x0 + 0.4 + R() * (l.x1 - l.x0 - 0.8), z = l.z0 + 0.4 + R() * (front - l.z0 - 0.9), len = 0.4 + R() * 0.6;
    b.cyl(x, z, GROTTO_ROOF - len, GROTTO_ROOF + 0.02, 0.03, 0.16 + R() * 0.12, 5, i % 3 ? ROCK : ROCK_LIGHT, { cap: false });
  }

  // --- the mouth: rock in uneven courses either side of an arch, in front of the curtain, closing everything outside it
  {
    const crown = FALL.top - 0.1;
    const opening = (y: number): number => {
      if (y >= crown) return 0;
      const t = Math.max(0, (y - 7.4) / (crown - 7.4));
      return (curtainHalf(y) - 0.14) * (1 - 0.42 * t * t);
    };
    // courses of 0.55 low down, finer where the arch turns, so that it reads as an arch and not as steps
    for (let y = Y.shelf - 0.1, step = 0.55; y < Y.crest - 0.05; y += step, step = y > 7.2 && y < crown ? 0.3 : 0.55) {
      const y1 = Math.min(Y.crest - 0.04, y + step + 0.04);
      const half = Math.min(opening(y), opening(Math.min(y1, crown - 0.01)));
      const c = R() > 0.5 ? ROCK : ROCK_LIGHT, z1 = face - R() * 0.12;
      if (half <= 0.05) {
        // over the arch: the rock that closes it up to the terrace's edge
        solid(b, l.x0 - 0.15, y, front, l.x1 + 0.15, y1 - R() * 0.06, z1, c, 'NESWTB');
        continue;
      }
      const j = (R() - 0.5) * 0.16;
      solid(b, l.x0 - 0.15, y, front, mid - half + j, y1, z1, c, 'NESWTB');
      solid(b, mid + half + j, y, front, l.x1 + 0.15, y1, face - R() * 0.12, R() > 0.5 ? ROCK : ROCK_DARK, 'NESWTB');
    }
    // stalactites along the arch's lip
    for (let i = 0; i < 7; i++) {
      const x = mid - 1.7 + (i / 6) * 3.4 + (R() - 0.5) * 0.3, len = 0.25 + R() * 0.45;
      b.cyl(x, face - 0.2, crown - len, crown + 0.02, 0.03, 0.14, 5, ROCK_LIGHT, { cap: false });
    }
    // the lip the water comes over, under the slab
    solid(b, mid - FALL_HALF.lip, FALL.top - 0.02, FALL.z - 0.7, mid + FALL_HALF.lip, GROTTO_ROOF - 0.01, FALL.z + 0.1, ROCK_DARK, 'NESWB');
  }

  // --- the pool on its floor, its sill at the mouth, and the ford of setts through it from the door to the mouth
  {
    const x0 = l.x0 + 0.05, x1 = l.x1 - 0.05, z0 = l.z0 + 0.05, zs = CLIFF - 0.25;
    waterOf(k, [{ pts: [[x0, z0], [x1, z0], [x1, zs], [x0, zs]], y: POOL_Y }], WATER_POOL);
    flat(b, x0, z0, x1, zs, F + 0.035, 0x2c3a3e);
    for (const [a, c] of [[l.x0, mid - FORD_HALF - 0.05], [mid + FORD_HALF + 0.05, l.x1]]) solid(b, a, Y.shelf - 0.1, zs, c, POOL_Y + 0.14, CLIFF + 0.05, STONE_LIGHT, 'NESWT');
    b.box(mid - FORD_HALF, F, z0, mid + FORD_HALF, FORD_Y, CLIFF + 0.02, SETT, { faces: 'EWT' });
    for (let z = z0 + 0.8; z < zs - 0.3; z += 1.2) flat(b, mid - FORD_HALF, z - 0.06, mid + FORD_HALF, z + 0.06, FORD_Y + 0.012, 0x4f4a44);
    // out over the sill and down onto the shelf
    slab(b, [mid, FORD_Y, CLIFF + 0.02], [mid, Y.shelf + 0.045, CLIFF + 0.48], FORD_HALF, 0.4, SETT);
    // (no stalagmites on its floor: the car's tail swings to within a hand of its walls as it turns)
  }

  // --- the door at the back: riveted steel in a frame of rock, in shadow. Its shutter is a mesh of its own, hung from
  // the door's head, which the show rolls up for the car (`door` of `buildHatch`); behind it the way in is dark.
  {
    const D = BACK_DOOR, z = l.z0, x0 = mid - D.half, x1 = mid + D.half, top = F + D.h;
    b.quad([x0, F, z + 0.03], [x1, F, z + 0.03], [x1, top, z + 0.03], [x0, top, z + 0.03], [0, 0, 1], 0x08090b);
    const g = new GeoBuilder();
    g.box(-D.half, -D.h, 0.05, D.half, 0, 0.15, STEEL_DARK, { faces: 'SEWB' });
    for (const y of [0.9, 1.9, 2.9]) g.box(-D.half + 0.1, y - D.h - 0.05, 0.15, D.half - 0.1, y - D.h + 0.05, 0.19, IRON_DARK, { faces: 'STB' });
    g.box(-0.04, -D.h, 0.15, 0.04, -0.1, 0.2, IRON_DARK, { faces: 'SEW' });
    const shutter = new THREE.Mesh(g.build(), k.mat.city());
    shutter.name = D.name;
    shutter.castShadow = false;
    shutter.receiveShadow = true;
    shutter.position.set(mid, top, z);
    k.group.add(shutter);
    for (const s of [-1, 1]) solid(b, s < 0 ? x0 - 0.6 : x1, F - 0.1, z, s < 0 ? x0 : x1 + 0.6, top + 0.5, z + 0.45, ROCK_LIGHT, 'NESWT');
    solid(b, x0 - 0.6, top, z, x1 + 0.6, top + 0.8, z + 0.5, ROCK, 'NESWTB');
    k.glows.push({ x: mid, y: top + 0.05, z: z + 0.6, sx: 0.5, sy: 0.12, sz: 0.12, color: '#ff4a3a' });
  }

  // --- blue light inside at night, behind the fall
  for (const x of [l.x0 + 0.12, l.x1 - 0.12]) k.glows.push({ x, y: F + 3.4, z: l.z0 + 2.2, sx: 0.08, sy: 0.3, sz: 0.6, color: '#bfe4ff' });
  k.glows.push({ x: mid, y: F + 1.0, z: l.z0 + 1.2, sx: 2.0, sy: 0.6, sz: 0.15, color: '#5f8fbf' });
  k.lights.push({ x: mid, z: CLIFF - 1.5, r: 8, color: COLD, k: 0.6 });

  // --- the culvert's mouth in the river wall south of the grotto, where its pool drains
  {
    const z = -67, cx = mid, half = 1.2, spring = 0.4;
    b.quad([cx - half, Y.water, z + 0.04], [cx + half, Y.water, z + 0.04], [cx + half, spring + half, z + 0.04], [cx - half, spring + half, z + 0.04], [0, 0, 1], DARK);
    pointedArch(b, cx, z, z + 0.4, half, half, spring, spring + half + 0.7, STONE_LIGHT, STONE_DARK, 4);
    for (const s of [-1, 1]) solid(b, cx + s * half - (s > 0 ? 0 : 0.6), Y.water - 0.3, z, cx + s * half + (s > 0 ? 0.6 : 0), spring + half + 0.7, z + 0.4, STONE_LIGHT, 'NESWT');
    solid(b, cx - half - 0.7, spring + half + 0.7, z, cx + half + 0.7, spring + half + 0.95, z + 0.5, STONE_TRIM, 'NESWTB');
  }
}

// ---------------------------------------------------------------------------
// The pool garden, and the shaft under its pool
// ---------------------------------------------------------------------------

/** A slender statue on a pedestal: a robed figure with a staff, `h` from the ground to its head. */
function statue(b: GeoBuilder, x: number, z: number, y: number): void {
  solid(b, x - 0.38, y, z - 0.38, x + 0.38, y + 0.7, z + 0.38, TRIM, 'NESWT');
  solid(b, x - 0.47, y + 0.7, z - 0.47, x + 0.47, y + 0.8, z + 0.47, TRIM, 'NESWTB');
  b.cyl(x, z, y + 0.8, y + 1.95, 0.3, 0.16, 6, MARBLE, { cap: false });
  b.cyl(x, z, y + 1.95, y + 2.12, 0.2, 0.1, 6, MARBLE, { cap: false });
  b.cyl(x, z, y + 2.12, y + 2.45, 0.13, 0.1, 6, MARBLE);
  b.beam([x + 0.22, y + 0.82, z + 0.05], [x + 0.26, y + 2.6, z + 0.05], 0.035, 0.03, MARBLE);
}

/** The giant Lincoln penny, standing on its edge, its face to the way a frame turned by `yaw` faces: `r` its radius. */
function penny(b: GeoBuilder, x: number, y: number, z: number, r: number, yaw: number): void {
  const t = 0.12, n = 12, s = r / 2.25;
  b.moved(x, y, z, yaw, () => {
    const p = (i: number, rr: number, lz: number): V3 => [Math.cos((i / n) * PI * 2) * rr, Math.sin((i / n) * PI * 2) * rr, lz];
    for (let i = 0; i < n; i++) {
      const m = ((i + 0.5) / n) * PI * 2;
      b.quad(p(i, r, -t), p(i + 1, r, -t), p(i + 1, r, t), p(i, r, t), [Math.cos(m), Math.sin(m), 0], COPPER);
      tri(b, [0, 0, t], p(i, r, t), p(i + 1, r, t), [0, 0, 1], COPPER);
      tri(b, [0, 0, t + 0.03], p(i, r - 0.16, t + 0.03), p(i + 1, r - 0.16, t + 0.03), [0, 0, 1], 0xa8662f);
    }
    // Lincoln's bust in profile, facing right as on the coin: head, beard, neck and shoulders, in relief
    const Q = (x0: number, y0: number, x1: number, y1: number, c = COPPER_DEEP): void => b.box(x0 * s, y0 * s, t + 0.03, x1 * s, y1 * s, t + 0.15, c, { faces: 'NESWT' });
    Q(-0.55, 0.15, 0.45, 1.25);
    Q(-0.2, -0.35, 0.65, 0.35);
    Q(0.45, 0.35, 0.62, 0.75);
    Q(-0.4, -0.8, 0.25, -0.3);
    Q(-1.3, -1.75, 0.9, -0.75);
    Q(-0.6, 1.1, 0.3, 1.45, 0x7a4622);
  });
}

/** The mechanical Tyrannosaurus's head and neck, coming out of a niche in the shaft's west wall: a toy robot's, in relief, for the room there is. */
function rexHead(k: Build, zc: number): void {
  const b = k.b, x = SHAFT.x0;
  // in this frame +z is out of the wall (east), and the head points along -x (south)
  b.moved(x, 0, zc, yawFacing(1, 0), () => {
    b.quad([-1.4, 5.6, 0.03], [1.4, 5.6, 0.03], [1.4, 8.1, 0.03], [-1.4, 8.1, 0.03], [0, 0, 1], DARK);
    tri(b, [-1.4, 8.1, 0.03], [1.4, 8.1, 0.03], [0, 8.85, 0.03], [0, 0, 1], DARK);
    for (const s of [-1, 1]) {
      solid(b, s < 0 ? -1.75 : 1.4, 5.3, 0, s < 0 ? -1.4 : 1.75, 8.15, 0.2, ROCK_LIGHT, 'NESWT');
      b.beam([s * 1.57, 8.05, 0.1], [0, 9.0, 0.1], 0.15, 0.1, ROCK_LIGHT);
    }
    solid(b, -2.3, 5.15, 0, 1.8, 5.4, 0.35, ROCK, 'NESWT');
    // the neck out of the niche's back, the skull, the snout, the jaw a little open with its teeth, the brow
    b.box(-0.3, 6.6, 0.04, 1.1, 7.5, 0.34, REX, { faces: 'NESWT' });
    b.box(-1.5, 7.0, 0.06, 0.15, 7.85, 0.44, REX, { faces: 'NESWTB' });
    b.box(-2.2, 7.08, 0.1, -1.45, 7.6, 0.42, REX, { faces: 'NESWTB' });
    b.box(-2.05, 6.5, 0.08, -0.15, 6.82, 0.4, REX_DARK, { faces: 'NESWTB' });
    b.box(-2.0, 6.82, 0.14, -0.6, 6.95, 0.38, 0xe9e4d4, { faces: 'SEWT' });
    b.box(-2.15, 6.95, 0.14, -1.5, 7.08, 0.38, 0xe9e4d4, { faces: 'SEWB' });
    b.box(-1.15, 7.85, 0.08, -0.35, 8.02, 0.44, REX_DARK, { faces: 'NESWT' });
    for (let i = 0; i < 3; i++) b.box(0.1 + i * 0.35, 7.5, 0.1, 0.32 + i * 0.35, 7.75, 0.3, REX_DARK, { faces: 'NESWT' });
  });
  // its eye glows red at night, as a machine's would
  k.glows.push({ x: x + 0.46, y: 7.6, z: zc + 0.85, sx: 0.1, sy: 0.1, sz: 0.1, color: '#ff4030' });
}

/** Hazard chevrons along a wall of the shaft, just under the lid: from `a` to `c` along the wall, `n` the way its face looks. */
function chevrons(b: GeoBuilder, a: P2, c: P2, n: P2): void {
  const L = Math.hypot(c[0] - a[0], c[1] - a[1]), ux = (c[0] - a[0]) / L, uz = (c[1] - a[1]) / L, y0 = 8.95, y1 = 9.3, N: V3 = [n[0], 0, n[1]];
  const at = (t: number, y: number, off: number): V3 => [a[0] + ux * t + n[0] * off, y, a[1] + uz * t + n[1] * off];
  b.quad(at(0, y0 - 0.05, 0.02), at(L, y0 - 0.05, 0.02), at(L, y1 + 0.05, 0.02), at(0, y1 + 0.05, 0.02), N, 0x1c1c20);
  for (let t = 0.1; t + 0.6 < L; t += 0.7) b.quad(at(t, y0, 0.03), at(t + 0.35, y0, 0.03), at(t + 0.6, y1, 0.03), at(t + 0.25, y1, 0.03), N, HAZARD);
}

function poolGarden(k: Build, l: Lot): void {
  const b = k.b, S = SHAFT, y = TERRACE.top;

  // --- the flagged walks round the pool, and the walk on to the house's garden door
  const hedgeX = l.x0 + 0.55, hedgeZ = l.z0 + 0.55;
  flat(b, hedgeX, hedgeZ, S.x0, TERRACE.z1, y, FLAGS);
  flat(b, S.x1, hedgeZ, l.x1, TERRACE.z1, y, FLAGS);
  flat(b, S.x0, hedgeZ, S.x1, S.z0, y, FLAGS);
  flat(b, S.x0, S.z1, S.x1, TERRACE.z1, y, FLAGS);
  flat(b, l.x1, ZB, PAV[0].x0 - 0.15, TERRACE.z1, y, FLAGS);

  // --- a clipped hedge round its west and north sides, urns at its north corners, a statue at each south corner
  solid(b, l.x0 + 0.05, Y.crest - 0.1, hedgeZ, hedgeX, Y.crest + 0.85, M.z1 - 0.2, HEDGE, 'NESWT');
  solid(b, l.x0 + 0.05, Y.crest - 0.1, l.z0 + 0.05, l.x1 - 0.05, Y.crest + 0.85, hedgeZ, HEDGE, 'NESWT');
  for (const x of [(hedgeX + S.x0) / 2, (S.x1 + l.x1) / 2]) {
    solid(b, x - 0.3, y, S.z0 - 0.35, x + 0.3, y + 0.5, S.z0 + 0.25, TRIM, 'NESWT');
    urn(b, x, y + 0.5, S.z0 - 0.05);
  }
  for (const x of [(hedgeX + S.x0) / 2, (S.x1 + l.x1) / 2]) statue(b, x, S.z1 + 0.9, Y.crest);

  // --- the shaft's inside, seen only while the pool is open: the screens, the penny on its ledge, the Tyrannosaurus, the card
  {
    // the Batcomputer's screens on the north wall
    const zn = S.z0 + 0.02;
    solid(b, S.x0 + 5.6, 5.3, zn, S.x0 + 10.4, 8.5, zn + 0.12, DARK, 'NESWTB');
    k.sign('bristol-screen', S.x0 + 8, 6.9, zn + 0.15, 0, 1, 2.8, 4.6);
    solid(b, S.x0 + 11.05, 5.9, zn, S.x0 + 13.55, 7.9, zn + 0.1, DARK, 'NESWTB');
    k.sign('bristol-screen-side', S.x0 + 12.3, 6.9, zn + 0.13, 0, 1, 1.6, 2.3);
    // a desk's edge of light under them
    k.glows.push({ x: S.x0 + 8, y: 5.15, z: zn + 0.25, sx: 4.2, sy: 0.05, sz: 0.1, color: '#7fc8ff' });
    // the penny on a ledge of rock in the north-west corner
    solid(b, S.x0 + 0.02, 5.0, zn, S.x0 + 4.2, 5.32, zn + 0.4, ROCK_LIGHT, 'NESWTB');
    penny(b, S.x0 + 2.4, 5.32 + 1.45 + 0.02, zn + 0.2, 1.45, 0);
    // the Tyrannosaurus out of its niche in the west wall, the card on the east wall
    rexHead(k, SHAFT_Z - 0.5);
    solid(b, S.x1 - 0.1, 5.2, SHAFT_Z - 1.35, S.x1 - 0.02, 8.8, SHAFT_Z + 1.35, 0xe9e4d8, 'NESWTB');
    k.sign('bristol-card', S.x1 - 0.13, 7.0, SHAFT_Z, -1, 0, 3.5, 2.6);
    // blue-white lamps down its walls, and chevrons round its rim under the lid
    for (const x of [S.x0 + 1.2, S.x0 + 4.6, S.x1 - 1.4]) k.glows.push({ x, y: 8.55, z: zn + 0.12, sx: 0.5, sy: 0.12, sz: 0.1, color: '#d8ecff' });
    for (const x of [S.x0 + 2.5, SHAFT_X, S.x1 - 2.5]) k.glows.push({ x, y: 8.55, z: S.z1 - 0.12, sx: 0.5, sy: 0.12, sz: 0.1, color: '#d8ecff' });
    for (const z of [S.z0 + 2.5, S.z1 - 2.5]) for (const x of [S.x0 + 0.12, S.x1 - 0.12]) k.glows.push({ x, y: 8.55, z, sx: 0.1, sy: 0.12, sz: 0.5, color: '#d8ecff' });
    chevrons(b, [S.x0, S.z0], [S.x1, S.z0], [0, 1]);
    chevrons(b, [S.x1, S.z1], [S.x0, S.z1], [0, -1]);
    chevrons(b, [S.x0, S.z1], [S.x0, S.z0], [1, 0]);
    chevrons(b, [S.x1, S.z0], [S.x1, S.z1], [-1, 0]);
  }

  // the pool's faint blue glow at night, as if lit from below
  k.lights.push({ x: SHAFT_X, z: SHAFT_Z, r: 9, color: COLD, k: 0.35 });
}

/**
 * The mirror pool, which is the lid of the Batcave's lift, and the lift: as
 * meshes of their own, which the show moves. `open(0)` is shut, one pool with
 * its water at the garden's level; from 0 to 0.15 its two halves sink by 0.4,
 * and from 0.15 to 1 they slide apart, west under the lawn and east under the
 * house, where the ground hides them. `lift(0)` has the platform down at the
 * shaft's floor, `lift(1)` up level with the garden. Both start at 0.
 *
 * It also hands over the steel door at the grotto's back, whose shutter is
 * built with the grotto, shut: `door(1)` rolls it up under its head for the
 * Batmobile, `door(0)` lets it down.
 */
export function buildHatch(k: Build): { open(f: number): void; lift(f: number): void; door(f: number): void } {
  const H = HATCH, mat = k.mat.city();
  const mesh = (g: GeoBuilder, name: string): THREE.Mesh => {
    const m = new THREE.Mesh(g.build(), mat);
    m.name = name;
    m.castShadow = false;
    m.receiveShadow = true;
    k.group.add(m);
    return m;
  };

  // --- the two halves, each built with the seam at x 0 and the water's surface at y 0
  const halves = [-1, 1].map((s) => {
    const g = new GeoBuilder(), inner = s * H.seam, outer = s * H.hw, kerbIn = s * (H.hw - H.kerb);
    const [a, c] = s < 0 ? [outer, inner] : [inner, outer], [ka, kc] = s < 0 ? [outer, kerbIn] : [kerbIn, outer];
    // the body under the water, and the water, lit faintly from below at night
    g.box(a, -0.6, -H.hd + 0.02, c, 0, H.hd - 0.02, STONE_DARK, { faces: 'NESWB' });
    const [wa, wc] = s < 0 ? [kerbIn, inner] : [inner, kerbIn];
    g.quad([wa, 0, H.hd - H.kerb], [wc, 0, H.hd - H.kerb], [wc, 0, -H.hd + H.kerb], [wa, 0, -H.hd + H.kerb], [0, 1, 0], MIRROR, { win: interior(0.4) });
    // the kerb: its outer side, and its two ends up to the seam
    g.box(ka, -0.6, -H.hd + 0.02, kc, 0.25, H.hd - 0.02, TRIM, { faces: 'NESWT' });
    for (const z of [-H.hd + 0.02, H.hd - H.kerb]) g.box(s < 0 ? kerbIn : inner, -0.6, z, s < 0 ? inner : kerbIn, 0.25, z + H.kerb - 0.02, TRIM, { faces: 'NESWT' });
    return mesh(g, s < 0 ? 'bristol-pool-west' : 'bristol-pool-east');
  });

  // --- the lift: a steel platform with a hazard-striped edge and a pale ring, on a ram
  const g = new GeoBuilder();
  g.box(-LIFT.hw, -1.0, -LIFT.hd, LIFT.hw, 0, LIFT.hd, STEEL_DARK, { faces: 'NESWTB', top: STEEL_DECK });
  g.cyl(0, 0, -6.4, -1.0, 1.1, 1.1, 6, STEEL, { cap: false });
  const band = 0.45, stripe = (x0: number, z0: number, x1: number, z1: number): void => g.quad([x0, 0.012, z1], [x1, 0.012, z1], [x1, 0.012, z0], [x0, 0.012, z0], [0, 1, 0], HAZARD);
  for (let x = -LIFT.hw; x + 0.45 <= LIFT.hw + 1e-6; x += 0.9) {
    stripe(x, -LIFT.hd, x + 0.45, -LIFT.hd + band);
    stripe(x, LIFT.hd - band, x + 0.45, LIFT.hd);
  }
  for (let z = -LIFT.hd + band + 0.45; z + 0.45 <= LIFT.hd - band + 1e-6; z += 0.9) {
    stripe(-LIFT.hw, z, -LIFT.hw + band, z + 0.45);
    stripe(LIFT.hw - band, z, LIFT.hw, z + 0.45);
  }
  for (let i = 0; i < 16; i++) {
    const a0 = (i / 16) * PI * 2, a1 = ((i + 1) / 16) * PI * 2, r0 = 3.0, r1 = 3.4;
    g.quad([Math.cos(a0) * r0, 0.012, Math.sin(a0) * r0], [Math.cos(a0) * r1, 0.012, Math.sin(a0) * r1], [Math.cos(a1) * r1, 0.012, Math.sin(a1) * r1], [Math.cos(a1) * r0, 0.012, Math.sin(a1) * r0], [0, 1, 0], 0xcfd6df, { win: interior(0.9) });
  }
  const lift = mesh(g, 'bristol-lift');

  const place = { open: 0, lift: 0 };
  const set = (): void => {
    const f = place.open, sink = Math.min(1, f / 0.15) * H.sink, slide = f <= 0.15 ? 0 : ((f - 0.15) / 0.85) * H.slide;
    halves[0].position.set(SHAFT_X - slide, Y.crest - sink, SHAFT_Z);
    halves[1].position.set(SHAFT_X + slide, Y.crest - sink, SHAFT_Z);
    lift.position.set(SHAFT_X, LIFT.down + (LIFT.up - LIFT.down) * place.lift, SHAFT_Z);
  };
  set();
  return {
    open(f: number): void { place.open = Math.min(1, Math.max(0, f)); set(); },
    lift(f: number): void { place.lift = Math.min(1, Math.max(0, f)); set(); },
    door(f: number): void {
      const shutter = k.group.getObjectByName(BACK_DOOR.name);
      if (shutter) shutter.scale.y = 1 - 0.95 * Math.min(1, Math.max(0, f));
    },
  };
}

// ---------------------------------------------------------------------------
// The entrance court
// ---------------------------------------------------------------------------

function forecourt(k: Build, l: Lot): void {
  const b = k.b, y = l.base;
  flat(b, l.x0 + 0.2, l.z0 + 0.2, l.x1 - 0.2, l.z1 - 0.2, y + 0.04, GRAVEL);
  // a low kerb round it, open where the drive comes in and under the porte-cochère
  const kerb = (x0: number, z0: number, x1: number, z1: number): void => b.box(x0, y - 0.1, z0, x1, y + 0.16, z1, TRIM, { faces: 'NESWT' });
  kerb(l.x0, l.z0, l.x1, l.z0 + 0.2);
  kerb(l.x0, l.z1 - 0.2, l.x1, l.z1);
  kerb(l.x1 - 0.2, l.z0 + 0.2, l.x1, DRIVE_IN - 1.75);
  kerb(l.x1 - 0.2, DRIVE_IN + 1.75, l.x1, l.z1 - 0.2);
  kerb(l.x0, l.z0 + 0.2, l.x0 + 0.2, PORTE.z0);
  kerb(l.x0, PORTE.z1, l.x0 + 0.2, l.z1 - 0.2);
  // gate piers with lamps where the drive comes in
  for (const s of [-1, 1]) {
    const px = l.x1 - 0.45, pz = DRIVE_IN + s * 2.15;
    solid(b, px - 0.45, y - 0.1, pz - 0.45, px + 0.45, y + 2.4, pz + 0.45, LIMESTONE_DARK, 'NESWT');
    solid(b, px - 0.56, y + 2.4, pz - 0.56, px + 0.56, y + 2.6, pz + 0.56, TRIM, 'NESWTB');
    gasLamp(k, px, y + 2.6, pz, 0, SODIUM);
  }
  // a lamp at its north-west corner (the north-east one is the gate pier's)
  b.beam([l.x0 + 0.7, y, l.z0 + 0.7], [l.x0 + 0.7, y + 3.2, l.z0 + 0.7], 0.12, 0.08, IRON_DARK);
  gasLamp(k, l.x0 + 0.7, y + 3.2, l.z0 + 0.7, 0, SODIUM);
  // the name, once, at its south-west corner, facing the view
  nameBoard(k, 'bristol-manor', l.x0 + 1.4, l.z1 - 0.5, y, TO_VIEW, 0.9);
}

// ---------------------------------------------------------------------------
// The Kane Memorial Bridge
// ---------------------------------------------------------------------------

function kaneBridge(k: Build, _l: Lot): void {
  const b = k.b, cx = KANE.x, road = kaneRoad();
  // the towers: one on each bank, straddling the river wall, each two piers joined over the road by a pointed arch
  const inner = 5.85, outer = 7.85, top = 26.6;
  const towers = [{ z0: KANE.z0 - 0.8, z1: KANE.z0 + 1.6 }, { z0: KANE.z1 - 1.9, z1: KANE.z1 + 0.5 }];
  const STONE_BR = 0x6f6c66, STONE_BR_DARK = 0x57544f;
  for (const t of towers) {
    const zc = (t.z0 + t.z1) / 2, ry = road(zc), spring = ry + 7.2;
    for (const s of [-1, 1]) {
      const xa = cx + s * inner, xb = cx + s * outer, x0 = Math.min(xa, xb), x1 = Math.max(xa, xb);
      // the pier, and its plinth at the water
      b.box(x0, Y.water - 0.3, t.z0, x1, top, t.z1, STONE_BR, { faces: 'NESW' });
      solid(b, x0 - 0.3, Y.water - 0.3, t.z0 - 0.3, x1 + 0.3, ry + 1.4, t.z1 + 0.3, STONE_BR_DARK, 'NESWT');
      // a string course at the arch's spring and blind lancets up each face
      solid(b, x0 - 0.12, spring - 0.25, t.z0 - 0.12, x1 + 0.12, spring, t.z1 + 0.12, STONE_TRIM, 'NESWTB');
      for (const [z, nz] of [[t.z0 - 0.03, -1], [t.z1 + 0.03, 1]] as const) {
        const mx = (x0 + x1) / 2, hw = 0.55, ya = ry + 2.2, yb = spring - 1.6;
        b.quad([mx - hw, ya, z], [mx + hw, ya, z], [mx + hw, yb, z], [mx - hw, yb, z], [0, 0, nz], DARK);
        tri(b, [mx - hw, yb, z], [mx + hw, yb, z], [mx, yb + 0.9, z], [0, 0, nz], DARK);
        const yc = spring + 1.0, yd = top - 4.6;
        b.quad([mx - hw, yc, z], [mx + hw, yc, z], [mx + hw, yd, z], [mx - hw, yd, z], [0, 0, nz], DARK);
        tri(b, [mx - hw, yd, z], [mx + hw, yd, z], [mx, yd + 0.9, z], [0, 0, nz], DARK);
      }
    }
    // the arch over the road, and the stone above it up to the cornice
    pointedArch(b, cx, t.z0, t.z1, inner, 7.5, spring, top, STONE_BR, STONE_BR_DARK, 6);
    b.box(cx - inner, spring - 0.01, t.z0, cx + inner, spring, t.z1, STONE_BR, { faces: 'B' });
    // two blind lancets and a roundel over the arch on each face
    for (const [z, nz] of [[t.z0 - 0.03, -1], [t.z1 + 0.03, 1]] as const) {
      for (const s of [-1, 1]) {
        const mx = cx + s * 2.6, hw = 0.6, ya = top - 5.2, yb = top - 2.4;
        b.quad([mx - hw, ya, z], [mx + hw, ya, z], [mx + hw, yb, z], [mx - hw, yb, z], [0, 0, nz], DARK);
        tri(b, [mx - hw, yb, z], [mx + hw, yb, z], [mx, yb + 0.8, z], [0, 0, nz], DARK);
      }
      roundel(b, [cx, top - 3.0, z], 0.8, nz > 0 ? 'S' : 'N', DARK, {}, 8);
    }
    // the cornice, a low parapet and four pinnacles
    solid(b, cx - outer - 0.3, top, t.z0 - 0.3, cx + outer + 0.3, top + 0.5, t.z1 + 0.3, STONE_TRIM);
    b.box(cx - outer - 0.1, top + 0.5, t.z0 - 0.1, cx + outer + 0.1, top + 0.9, t.z1 + 0.1, STONE_BR, { faces: 'NESWT' });
    for (const x of [cx - outer, cx + outer]) for (const z of [t.z0, t.z1]) pinnacle(b, x, z, top + 0.9, 2.2, 0.35, STONE_TRIM);
    // lamps on the piers, lighting the road through the arch
    for (const s of [-1, 1]) gasLamp(k, cx + s * (inner - 0.25), ry + 4.2, s > 0 ? t.z1 + 0.25 : t.z0 - 0.25, 0, SODIUM);
    k.lights.push({ x: cx, z: zc, r: 9, color: SODIUM, k: 0.5 });
  }

  // the name, on a plaque over the south tower's arch
  {
    const t = towers[1], z = t.z1, y = top - 6.6;
    const w = k.sign('bristol-kane', cx, y, z + 0.13, 0, 1, 1.0, 10.5);
    solid(b, cx - w / 2 - 0.2, y - 0.65, z, cx + w / 2 + 0.2, y + 0.65, z + 0.1, DARK, 'NESWTB');
  }

  // --- the deck: its girders, which are its parapets, its underside and cross-beams, from tower to tower and through them
  const za = towers[0].z0 - 0.6, zb = towers[1].z1 + 0.4, pieces = 9;
  const half = 6.05, gird = 0.3;
  for (let i = 0; i < pieces; i++) {
    const z0 = za + ((zb - za) * i) / pieces, z1 = za + ((zb - za) * (i + 1)) / pieces, y0 = road(z0), y1 = road(z1);
    for (const s of [-1, 1]) slab(b, [cx + s * half, y0 + 1.0, z0], [cx + s * half, y1 + 1.0, z1], gird, 2.6, STEEL, { under: IRON });
    if (z1 > KANE.z0 && z0 < KANE.z1) slab(b, [cx, y0 - 0.06, z0], [cx, y1 - 0.06, z1], half - 0.3, 0.55, IRON_DARK);
  }
  for (let z = KANE.z0 + 2; z < KANE.z1 - 1; z += 3.2) {
    const y = road(z);
    solid(b, cx - half, y - 1.5, z - 0.2, cx + half, y - 0.61, z + 0.2, IRON, 'NESWB');
  }
  // the parapets' coping, a band of trim along each
  for (const s of [-1, 1]) {
    for (let i = 0; i < pieces; i++) {
      const z0 = za + ((zb - za) * i) / pieces, z1 = za + ((zb - za) * (i + 1)) / pieces;
      slab(b, [cx + s * half, road(z0) + 1.12, z0], [cx + s * half, road(z1) + 1.12, z1], gird + 0.08, 0.12, STONE_TRIM);
    }
  }

  // --- the cables: one on each side, in a curve from tower top to tower top, with hangers down to the girders
  const ca = towers[0].z1, cb = towers[1].z0, sag = (z: number): number => {
    const t = (z - ca) / (cb - ca), low = road((ca + cb) / 2) + 2.0, high = top - 0.4;
    return low + (high - low) * (2 * t - 1) * (2 * t - 1);
  };
  for (const s of [-1, 1]) {
    const x = cx + s * (half + 0.05), pts: V3[] = [], n = 12;
    for (let i = 0; i <= n; i++) {
      const z = ca + ((cb - ca) * i) / n;
      pts.push([x, sag(z), z]);
    }
    b.sweep(pts, pts.map(() => 0.16), 0xc8ccd2);
    for (let z = ca + 1.4; z < cb - 0.9; z += 1.5) b.beam([x, sag(z), z], [x, road(z) + 1.12, z], 0.05, 0.05, 0xc8ccd2);
    // and the cable's saddle on each tower, and its run down the tower's back to the anchor in the pier
    for (const t of towers) solid(b, x - 0.35, top - 0.6, t.z0 + 0.3, x + 0.35, top + 0.05, t.z1 - 0.3, IRON);
  }
}

// ---------------------------------------------------------------------------
// Besides the lots
// ---------------------------------------------------------------------------

/** The old tunnel's mouth in the spur's west face, where the service lane ends: a stone portal, dark inside. */
function oldTunnel(b: GeoBuilder): void {
  const x = SPUR.x0, zc = OLD_TUNNEL.z, y = Y.shelf, half = OLD_TUNNEL.half, spring = 2.4, top = 5.2;
  b.moved(x, y, zc, PI / 2, () => {
    // in this frame +z is west, out of the rock: lz 0 is the rock's face, and the portal stands out to lz 0.8
    b.quad([-half, 0, 0.05], [half, 0, 0.05], [half, spring + half, 0.05], [-half, spring + half, 0.05], [0, 0, 1], DARK, { win: interior(0.3) });
    pointedArch(b, 0, 0.3, 0.8, half, half, spring, top, STONE, STONE_DARK, 5);
    solid(b, -half - 0.3, 0, 0.1, -half, top, 0.8, STONE, 'NESWT');
    solid(b, half, 0, 0.1, half + 0.3, top, 0.8, STONE, 'NESWT');
    solid(b, -half - 0.4, top, 0.0, half + 0.4, top + 0.4, 0.95, STONE_TRIM, 'NESWTB');
    // the keystone, and the old date-stone's blank panel over it
    solid(b, -0.25, spring + half - 0.15, 0.8, 0.25, spring + half + 0.45, 0.9, STONE_TRIM, 'NESWTB');
  });
}

/** The Batboat's arch in the shelf's river wall: a low arched mouth at the water in a stone frame, faintly lit, and a small landing. */
function boathouse(k: Build): void {
  const b = k.b, { x, z, half } = BOATHOUSE, spring = 0.9, top = 3.6;
  b.quad([x - half, Y.water, z + 0.04], [x + half, Y.water, z + 0.04], [x + half, spring + half, z + 0.04], [x - half, spring + half, z + 0.04], [0, 0, 1], 0x1b2430, { win: interior(1.0) });
  pointedArch(b, x, z, z + 0.5, half, half * 1.25, spring, top, STONE, STONE_DARK, 6);
  for (const s of [-1, 1]) solid(b, x + s * half - (s > 0 ? 0 : 0.9), Y.water - 0.3, z, x + s * half + (s > 0 ? 0.9 : 0), top, z + 0.5, STONE, 'NESWT');
  solid(b, x - half - 1.0, top, z, x + half + 1.0, top + 0.3, z + 0.6, STONE_TRIM, 'NESWTB');
  k.glows.push({ x, y: spring + 0.4, z: z + 0.1, sx: 3.8, sy: 0.06, sz: 0.06, color: '#7f9fc4' });
  k.lights.push({ x, z: z + 2, r: 7, color: '#8fb0d8', k: 0.4 });
  // the landing beside it, a bollard, and a ring in the wall
  solid(b, x + half + 0.9, Y.water - 0.3, z, x + half + 5.0, 0.15, z + 1.4, STONE_LIGHT, 'NESWT');
  b.cyl(x + half + 4.2, z + 0.8, 0.15, 0.75, 0.22, 0.2, 6, IRON_DARK);
}

/** The gates on stone piers, the lodge beside them, and the drive up the hill's east slope to the entrance court. */
function gatesAndDrive(k: Build): void {
  const b = k.b, { x, z } = GATES, y = Y.shelf, gap = 2.4;
  // the piers, with caps and lamps
  for (const s of [-1, 1]) {
    const px = x + s * (gap + 0.6);
    solid(b, px - 0.6, y, z - 0.6, px + 0.6, y + 3.6, z + 0.6, LIMESTONE_DARK, 'NESWT');
    solid(b, px - 0.75, y + 3.6, z - 0.75, px + 0.75, y + 3.9, z + 0.75, TRIM, 'NESWTB');
    gasLamp(k, px, y + 4.0, z, 0, SODIUM);
    // a low wall on to either side
    const wx0 = s < 0 ? px - 6 : px + 0.6, wx1 = s < 0 ? px - 0.6 : px + 4.5;
    b.box(wx0, y, z - 0.25, wx1, y + 1.4, z + 0.25, LIMESTONE_DARK, { faces: 'NESWT' });
    solid(b, wx0, y + 1.4, z - 0.32, wx1, y + 1.55, z + 0.32, TRIM, 'NESWTB');
    // the gate's leaf: rails and bars of iron, standing open a little
    const hx = s < 0 ? px + 0.6 : px - 0.6, dir = -s, ang = 0.35;
    b.moved(hx, y, z, dir < 0 ? PI + ang : -ang, () => {
      for (const yy of [0.4, 2.0, 2.9]) b.box(0, yy - 0.06, -0.05, gap, yy + 0.06, 0.05, IRON, { faces: 'NESWTB' });
      for (let i = 0; i <= 6; i++) b.box((i / 6) * gap - 0.04, 0.1, -0.04, (i / 6) * gap + 0.04, 3.1 + 0.25 * Math.sin((i / 6) * PI), 0.04, IRON, { faces: 'NESWT' });
    });
  }
  k.lights.push({ x, z: z + 1, r: 9, color: SODIUM, k: 0.5 });

  // the lodge, west of the gates: one storey of stone under a steep slate roof, its gable to the south
  {
    const x0 = x - 9.5, x1 = x - 4.6, z0 = z - 3, z1 = z + 1.8;
    b.box(x0 - 0.12, y - 0.2, z0 - 0.12, x1 + 0.12, y + 0.6, z1 + 0.12, LIMESTONE_DARK, { faces: 'NESW' });
    b.box(x0, y + 0.6, z0, x1, y + 4, z1, LIMESTONE, { faces: 'EW', win: SMALL_WIN, seed: 9.1 });
    b.box(x0, y + 0.6, z0, x1, y + 4, z1, LIMESTONE, { faces: 'NS' });
    const mid = (x0 + x1) / 2, rise = 3.2, hw = (x1 - x0) / 2, k2 = rise / hw, o = 0.35, len = Math.hypot(hw, rise);
    for (const [zz, nz] of [[z0, -1], [z1, 1]] as const) face3(b, [x0, y + 4, zz], [x1, y + 4, zz], [mid, y + 4 + rise, zz], [0, 0, nz], LIMESTONE);
    for (const s of [-1, 1]) {
      const xe = s < 0 ? x0 - o : x1 + o, n: V3 = [(s * rise) / len, hw / len, 0];
      b.quad([xe, y + 4 - k2 * o, z1 + o], [xe, y + 4 - k2 * o, z0 - o], [mid, y + 4 + rise, z0 - o], [mid, y + 4 + rise, z1 + o], n, SLATE);
      b.quad([xe, y + 4 - k2 * o, z1 + o], [xe, y + 4 - k2 * o, z0 - o], [mid, y + 4 + rise, z0 - o], [mid, y + 4 + rise, z1 + o], [-n[0], -n[1], -n[2]], STONE_DARK);
    }
    b.moved(mid, 0, z1, 0, () => {
      lancet(b, 1.4, y + 1.2, y + 3.0, { lights: 2 });
      lancet(b, 0.7, y + 4.4, y + 5.4, { lights: 1, lit: 1.8 });
    });
    b.quad([x1 + 0.03, y, z0 + 0.8], [x1 + 0.03, y, z0 + 2.2], [x1 + 0.03, y + 2.5, z0 + 2.2], [x1 + 0.03, y + 2.5, z0 + 0.8], [1, 0, 0], TIMBER_DARK, { win: interior(0.6) });
    chimney(b, x0 + 1.1, z0 + 1.3, y + 4, y + 8.2);
    k.lights.push({ x: mid, z: z1 + 1.5, r: 7, color: AMBER, k: 0.4 });
  }

  // the drive: north from the gates, round the hill's east foot, and west up its slope to the court
  laid(b, DRIVE, 1.6, GRAVEL, 0.08, 1.4);
}

/** The drive's middle line, from the gates to the entrance court's east side, clear of the helicopter's ring. */
const DRIVE: P2[] = [[GATES.x, GATES.z - 0.6], [GATES.x + 0.4, -83.0], [100.6, -85.2], [101.0, -89.5], [99.8, -94.5], [94.8, -98.6], [87.5, -100.2], [80.0, -99.8], [76.6, -98.1], [COURT.x1 + 0.2, DRIVE_IN]];

/** How far a place is from the drive's middle line. */
function toDrive(x: number, z: number): number {
  let d = Infinity;
  for (let i = 0; i + 1 < DRIVE.length; i++) {
    const [ax, az] = DRIVE[i], [bx, bz] = DRIVE[i + 1], vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2));
    d = Math.min(d, Math.hypot(x - ax - vx * t, z - az - vz * t));
  }
  return d;
}

/** The parapet with lamps along the river side of the river road's walk. */
function riverParapet(k: Build): void {
  const b = k.b, z = -67.2, x0 = -9.8, x1 = 70.8, y = Y.shelf;
  parapet(b, [[x0, z], [x1, z]], y, 0.95, 0.32, STONE);
  b.box(x0, y + 0.95, z - 0.22, x1, y + 1.08, z + 0.22, STONE_TRIM, { faces: 'NESWT' });
  const n = Math.round((x1 - x0) / 8);
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    solid(b, x - 0.3, y, z - 0.3, x + 0.3, y + 1.35, z + 0.3, STONE_LIGHT, 'NESWT');
    if (i % 2 === 0) {
      b.beam([x, y + 1.35, z], [x, y + 3.6, z], 0.09, 0.07, IRON_DARK);
      gasLamp(k, x, y + 3.6, z, 0, SODIUM);
    }
  }
}

/** The dark cleft in the cliff's west end that the bats pour out of at dusk. */
function cleft(b: GeoBuilder): void {
  const x = -18, z = CLIFF + 0.03, y = Y.shelf;
  b.quad([x - 0.5, y + 0.5, z], [x + 0.45, y + 0.5, z], [x + 0.3, y + 2.9, z], [x - 0.35, y + 2.9, z], [0, 0, 1], DARK);
  tri(b, [x - 0.35, y + 2.9, z], [x + 0.3, y + 2.9, z], [x + 0.05, y + 3.5, z], [0, 0, 1], DARK);
  tri(b, [x - 0.5, y + 0.5, z], [x + 0.45, y + 0.5, z], [x - 0.1, y + 0.1, z], [0, 0, 1], DARK);
  for (const [a, c, h] of [[-1.6, -0.5, 3.4], [0.45, 1.4, 2.8]]) solid(b, x + a, y - 0.1, z - 0.03, x + c, y + h, z + 0.45, ROCK_LIGHT, 'NESWT');
}

/**
 * The ring on the lawn east of the entrance court where Wayne Enterprises' helicopter sets down, which the collector
 * asked for with Bruce Wayne's flight home: a round of gravel edged in pale stone, its markings and its lamps.
 */
function helipad(k: Build): void {
  const b = k.b, { x, z, r } = HELIPADS.manor, y = Y.crest;
  b.cyl(x, z, y - 0.15, y + 0.06, r, r, 16, TRIM, { cap: GRAVEL });
  padMark(k, x, y + 0.085, z, r, 0xe4e1d6);
  k.lights.push({ x, z, r: 7, color: COLD, k: 0.35 });
}

/** The round stone stand on the lawn north-west of the pool garden, where the collector's car stands: a low kerb round it and nothing on it. */
function heroStand(b: GeoBuilder): void {
  const { x, z, y } = STAND;
  b.cyl(x, z, Y.crest - 0.3, Y.crest + 0.14, 3.75, 3.75, 16, TRIM, { cap: LIMESTONE_DARK });
  b.cyl(x, z, Y.crest - 0.3, y, 3.4, 3.4, 16, LIMESTONE, { cap: STONE_LIGHT });
}

/** The west lawn, mown in stripes, which is Damian's: open, for him and his animals. */
function lawn(b: GeoBuilder): void {
  for (let x = -11; x < 0; x += 4) laid(b, [[x, -98.4], [x, -109.6]], 1.0, MOWN, 0.04, 1.6);
}

/** What stands behind the house, low under the ceiling: yews, a walled kitchen garden and a coach house. */
const BACK = {
  garden: { x0: 25.5, z0: -108, x1: 40, z1: -101.5 },
  coach: { x0: 44, z0: -107.4, x1: 54, z1: -102 },
  yews: { x0: 24, z0: -101, x1: 43, z1: -99.4 },
};

function backOfHill(k: Build): void {
  const b = k.b, y = Y.crest;
  // yews along the house's back
  for (let x = BACK.yews.x0 + 1.5; x < BACK.yews.x1; x += 3) {
    const z = (BACK.yews.z0 + BACK.yews.z1) / 2;
    b.cyl(x, z, y - 0.1, y + 2.6, 0.62, 0.06, 7, YEW, { cap: false });
  }
  // the kitchen garden: a wall of old brick with a gap to the south, and its beds
  {
    const G = BACK.garden, h = 1.5, t = 0.28, gap = [G.x0 + 6.5, G.x0 + 8.3];
    for (const [x0, z0, x1, z1] of [[G.x0, G.z0, G.x1, G.z0 + t], [G.x0, G.z1 - t, gap[0], G.z1], [gap[1], G.z1 - t, G.x1, G.z1], [G.x0, G.z0 + t, G.x0 + t, G.z1 - t], [G.x1 - t, G.z0 + t, G.x1, G.z1 - t]]) {
      b.box(x0, y - 0.1, z0, x1, y + h, z1, BRICK_OLD, { faces: 'NESWT', top: TRIM });
    }
    for (let i = 0; i < 3; i++) {
      const z0 = G.z0 + 0.9 + i * 2.0, z1 = z0 + 1.3;
      for (const [x0, x1] of [[G.x0 + 0.8, gap[0] - 0.3], [gap[1] + 0.3, G.x1 - 0.8]]) {
        flat(b, x0, z0, x1, z1, y + 0.05, EARTH);
        for (let j = 0; j < 2; j++) flat(b, x0 + 0.2, z0 + 0.3 + j * 0.55, x1 - 0.2, z0 + 0.5 + j * 0.55, y + 0.09, i === 1 ? 0x6f8a4a : 0x5a7a40);
      }
    }
  }
  // the coach house: one storey of stone, two carriage doors, a hipped roof and a small cupola, all under the ceiling
  {
    const C = BACK.coach, eave = y + 3.6, mid = (C.x0 + C.x1) / 2, zc = (C.z0 + C.z1) / 2;
    solid(b, C.x0 - 0.1, y - 0.2, C.z0 - 0.1, C.x1 + 0.1, y + 0.5, C.z1 + 0.1, LIMESTONE_DARK, 'NESWT');
    b.box(C.x0, y + 0.5, C.z0, C.x1, eave, C.z1, LIMESTONE, { faces: 'NESW' });
    pitched(b, C.x0, C.x1, C.z0, C.z1, eave, 2.0, { ends: ['h', 'h'], over: 0.3 });
    for (const dx of [-2.4, 2.4]) {
      b.moved(mid + dx, 0, C.z1, 0, () => {
        b.quad([-1.2, y + 0.5, 0.03], [1.2, y + 0.5, 0.03], [1.2, y + 2.6, 0.03], [-1.2, y + 2.6, 0.03], [0, 0, 1], TIMBER_DARK);
        for (const s of [-1, 1]) b.box(s * 1.32 - 0.12, y + 0.5, 0, s * 1.32 + 0.12, y + 2.6, 0.12, TRIM, { faces: 'SEWT' });
        b.box(-1.44, y + 2.6, 0, 1.44, y + 2.85, 0.14, TRIM, { faces: 'SEWTB' });
      });
    }
    b.moved(mid, 0, C.z1, 0, () => lancet(b, 0.7, y + 1.0, y + 2.4, { lights: 1, lit: 1.6 }));
    const cy = eave + 1.75;
    solid(b, mid - 0.45, cy - 0.3, zc - 0.45, mid + 0.45, cy + 0.8, zc + 0.45, TRIM, 'NESW');
    b.cyl(mid, zc, cy + 0.8, Math.min(ceilingAt(mid, zc) - 0.3, cy + 1.6), 0.7, 0.04, 4, LEAD, { phase: PI / 4, cap: false });
    k.lights.push({ x: mid, z: C.z1 + 1.2, r: 6, color: AMBER, k: 0.35 });
  }
  // a gravel path from the court to the coach house
  laid(b, [[COURT.x0 + 0.5, COURT.z0 + 0.6], [BACK.coach.x1 + 1.0, -100.6], [BACK.coach.x1 - 2.4, BACK.coach.z1 + 0.6]], 0.8, GRAVEL, 0.05, 1.4);
}

/** Whether a place is within `room` of something this file has put down where no lot is. */
const inBack = (x: number, z: number, room: number): boolean => Object.values(BACK).some((r) => x > r.x0 - room && x < r.x1 + room && z > r.z0 - room && z < r.z1 + room);

/** The woods on the hill's west end, its east end and its back: dark slender trees on the ground as built, kept under the ceiling. */
function woods(k: Build): void {
  const R = rng(0x30d5);
  const plant = (x: number, z: number, s: number): void => {
    const y = landAt(x, z);
    if (y < Y.shelf + 0.3 || z > CLIFF - 1.5) return;
    if (!open(x, z, 1.0)) return;
    if (toDrive(x, z) < 3 || inBack(x, z, 1.2) || Math.hypot(x - STAND.x, z - STAND.z) < 7) return;
    const room = Math.min(ceilingAt(x, z) - 0.3, underBoards(x, z) + y) - y, size = Math.min(s, room / 9);
    if (size < 0.28) return;
    k.tree(x, z, size, true, y);
  };
  // the west end, round the lawn, with a tree or two at its west edge
  for (let i = 0; i < 40; i++) plant(-21.5 + R() * 17, -112 + R() * 25, 0.7 + R() * 0.5);
  plant(-13.6, -101.5, 0.9);
  plant(-13.9, -106.8, 0.8);
  // the east end, round the drive
  for (let i = 0; i < 60; i++) plant(66 + R() * 35, -112 + R() * 25, 0.7 + R() * 0.55);
  // the back of the hill, behind the house, low under the ceiling
  for (let i = 0; i < 30; i++) plant(-6 + R() * 72, -112.6 + R() * 6, 0.5);
}

/** Whatever is not one of the plan's lots. */
export function extras(k: Build): void {
  oldTunnel(k.b);
  boathouse(k);
  gatesAndDrive(k);
  riverParapet(k);
  cleft(k.b);
  helipad(k);
  heroStand(k.b);
  lawn(k.b);
  backOfHill(k);
  woods(k);
  // a few people: a visitor at the lodge, two on the gravel by the gates, a gardener in the kitchen garden
  for (const [x, z] of [[GATES.x - 7, GATES.z + 3.2], [GATES.x + 4.6, GATES.z + 3.6], [GATES.x + 5.6, GATES.z + 3.3]]) if (open(x, z, 0.6)) k.person(x, z, Y.shelf);
  k.person(BACK.garden.x0 + 7.4, BACK.garden.z0 + 2.4, Y.crest);
}

/** A model for each lot this file builds, by the lot's id. */
export const MODELS: Record<string, Model> = {
  manor,
  'pool-garden': poolGarden,
  cove,
  forecourt,
  'kane-bridge': kaneBridge,
};

/** Lots that are built as part of another lot's model or by `extras`, and so get no box either. */
export const COVERS: string[] = [];
