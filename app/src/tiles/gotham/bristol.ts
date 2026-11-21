// Bristol: Wayne Manor on Crest Hill, the Batcave cut open under it, the waterfall's cove, the gates and the drive, the old tunnel's mouth, and the Kane Memorial Bridge.
//
// The mainland north of the Gotham River. land.ts lays the shelf the river
// road runs on, Crest Hill's upright cliff over it, and the two cuts in the
// cliff: the Batcave's, open to the sky and to the view like a doll's house,
// and the waterfall's cove west of it. This file builds what stands on them.
//
// Wayne Manor is a Gothic Revival house rebuilt after the earthquake with
// battlements (the research's "fortress"): long and low, its height at its
// south front, since the ceiling along the north edge of the board binds it.
// Its terrace is built out over the back of the cave, which is the cave's
// roof there. In the cave: the Batmobile's turntable before the tunnel to the
// waterfall, a guest's turntable, the Batplane's pad, the three trophies of
// the comics (the mechanical Tyrannosaurus, the giant Lincoln penny and the
// giant Joker card), the Batcomputer on its platform, and the stair down from
// the Manor's study. The Kane Memorial Bridge is a short suspension bridge
// with two stone towers of pointed arches, in the manner of the Brooklyn and
// Manhattan bridges that the comics' map-maker named, and a copy of neither.

import * as THREE from 'three';
import { interior, rng, type GeoBuilder, type V3 } from '../../engine/geo';
import { makeWaterMaterial } from '../../engine/look/materials';
import { pinnacle, roundel, tri } from '../../engine/parts';
import { face3, slab, slope3 } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { landAt } from './land';
import {
  AMBER, BOARDS, BRASS, COLD, DARK, GOTHIC_WIN, IRON, IRON_DARK, LEAD, LIMESTONE, LIMESTONE_DARK, ROCK, ROCK_DARK, ROCK_LIGHT, SLATE, SMALL_WIN, SODIUM,
  STEEL, STONE, STONE_DARK, STONE_LIGHT, STONE_TRIM, TIMBER, TIMBER_DARK, TO_VIEW, balustrade, gasLamp, nameBoard, nameSign, parapet,
} from './look';
import type { Model, Place } from './models';
import { CREST, KANE, Y, lotOf, type Lot, type P2 } from './plan';
import { MIDDLES } from './roads';
import { ceilingAt, open, underBoards } from './space';

// ---------------------------------------------------------------------------
// Colours of this file's own
// ---------------------------------------------------------------------------

/** The Manor's trim: sills, string courses, copings, a shade paler than its stone. */
const TRIM = 0xa8a69c;
/** A window pane by day, which glows amber at night. */
const PANE = 0x3a2b1c;
const IVY = 0x2f4a2a, IVY_DARK = 0x253d22;
const GRAVEL = 0x9a9284;
/** The cave's floor, its machines and its lights. */
const CONCRETE = 0x393b41, STEEL_DARK = 0x4a5059, STEEL_DECK = 0x30343b, HAZARD = 0xd9b23a;
const COPPER = 0xb8743c, COPPER_DEEP = 0x8f5529;
const REX = 0x5a6c4a, REX_DARK = 0x3f4d35, REX_BELLY = 0x8b8f66;
const WATER_POOL = 0x3c6878, WATER_STREAM = 0x4d7a88;
const SETT = 0x6b665e;

const PI = Math.PI;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** A box with all six faces. */
const solid = (b: GeoBuilder, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number, faces = 'NESWTB'): void => b.box(x0, y0, z0, x1, y1, z1, c, { faces });

/** A point in a frame that is turned by `yaw` and moved to (x, z), as `moved` does it. */
const toWorld = (x: number, z: number, yaw: number, lx: number, lz: number): P2 => [x + lx * Math.cos(yaw) - lz * Math.sin(yaw), z + lx * Math.sin(yaw) + lz * Math.cos(yaw)];

/** The yaw that turns a frame built to face +z so that it faces (nx, nz). */
const yawFacing = (nx: number, nz: number): number => Math.atan2(-nx, nz);

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
 * The roof of a cross-wing: a gable at its south end, over the front, and a
 * hip at its north end, which keeps it under the ceiling that binds the
 * Manor. Its ridge runs along z.
 */
function roofWing(b: GeoBuilder, x0: number, x1: number, zB: number, zF: number, y: number, rise: number, over = 0.3, wall = LIMESTONE): void {
  const half = (x1 - x0) / 2, xc = (x0 + x1) / 2, k = rise / half, len = Math.hypot(half, rise), top = y + rise;
  const ye = y - k * over, A = x0 - over, E = x1 + over, F = zF + over, B = zB - over, zr = zB + half;
  const nW: V3 = [-rise / len, half / len, 0], nE: V3 = [rise / len, half / len, 0], nB: V3 = [0, half / len, -rise / len];
  const under = (n: V3): V3 => [-n[0], -n[1], -n[2]];
  b.quad([A, ye, F], [A, ye, B], [xc, top, zr], [xc, top, F], nW, SLATE);
  b.quad([E, ye, B], [E, ye, F], [xc, top, F], [xc, top, zr], nE, SLATE);
  face3(b, [A, ye, B], [E, ye, B], [xc, top, zr], nB, SLATE);
  b.quad([A, ye, F], [A, ye, B], [xc, top, zr], [xc, top, F], under(nW), STONE_DARK);
  b.quad([E, ye, B], [E, ye, F], [xc, top, F], [xc, top, zr], under(nE), STONE_DARK);
  face3(b, [A, ye, B], [E, ye, B], [xc, top, zr], under(nB), STONE_DARK);
  solid(b, xc - 0.13, top - 0.06, zr, xc + 0.13, top + 0.12, F, LEAD);
  // the gable under it, and its coping
  face3(b, [x0, y, zF], [x1, y, zF], [xc, top, zF], [0, 0, 1], wall);
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

/**
 * A Gothic window on a wall, in a frame that faces +z with the wall at z 0:
 * a lit pane with a pointed head, a sill, a hood mould over the head, and
 * mullions and a transom of stone. Build it inside `moved`.
 */
function lancet(b: GeoBuilder, w: number, y0: number, y1: number, o: { lights?: number; transom?: number; lit?: number; head?: number } = {}): void {
  const lit = interior(o.lit ?? 2.4), h = w * (o.head ?? 0.5), hw = w / 2;
  b.quad([-hw, y0, 0.03], [hw, y0, 0.03], [hw, y1, 0.03], [-hw, y1, 0.03], [0, 0, 1], PANE, { win: lit });
  tri(b, [-hw, y1, 0.03], [hw, y1, 0.03], [0, y1 + h, 0.03], [0, 0, 1], PANE, { win: lit });
  b.box(-hw - 0.16, y0 - 0.2, 0, hw + 0.16, y0, 0.16, TRIM, { faces: 'SEWTB' });
  for (const s of [-1, 1]) b.beam([s * (hw + 0.14), y1 - 0.1, 0.07], [0, y1 + h + 0.16, 0.07], 0.07, 0.07, TRIM);
  const lights = o.lights ?? 2;
  for (let i = 1; i < lights; i++) {
    const x = -hw + (w * i) / lights;
    b.box(x - 0.06, y0, 0.03, x + 0.06, y1 + h * (1 - Math.abs(x) / hw) - 0.05, 0.1, TRIM, { faces: 'SEW' });
  }
  if (o.transom !== undefined) b.box(-hw, o.transom - 0.06, 0.03, hw, o.transom + 0.06, 0.1, TRIM, { faces: 'STB' });
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
function ivy(b: GeoBuilder, seed: number, w: number, y0: number, y1: number): void {
  const R = rng(seed);
  for (let i = 0; i < 6; i++) {
    const x = (R() - 0.5) * w, hw = 0.4 + R() * 0.7, top = y0 + (y1 - y0) * (0.45 + R() * 0.55);
    b.box(x - hw, y0, 0.02 + i * 0.012, x + hw, top, 0.08 + i * 0.012, i % 2 ? IVY : IVY_DARK, { faces: 'SEWT' });
  }
}

/** A tall chimney stack: a shaft, a band, and two pots, standing on `y0` and reaching `y1`. */
function chimney(b: GeoBuilder, x: number, z: number, y0: number, y1: number, along: 'x' | 'z' = 'x'): void {
  const hx = along === 'x' ? 0.75 : 0.45, hz = along === 'x' ? 0.45 : 0.75;
  b.box(x - hx, y0, z - hz, x + hx, y1 - 0.75, z + hz, LIMESTONE_DARK);
  solid(b, x - hx - 0.1, y1 - 0.75, z - hz - 0.1, x + hx + 0.1, y1 - 0.5, z + hz + 0.1, TRIM);
  for (const s of [-1, 1]) {
    const px = along === 'x' ? x + s * 0.38 : x, pz = along === 'x' ? z : z + s * 0.38;
    b.cyl(px, pz, y1 - 0.5, y1, 0.2, 0.16, 6, 0x7a5444);
  }
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

/** A surface of water of this file's own, at its own height: the cove's pool, the stream and its pond. */
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

/** A band along a line of corners, `half` either side of it, laid on the ground as built `lift` above it, in short pieces: a drive, a stream's bed. */
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

/** The card's back: a red lattice in a white border. */
function paintCardBack(ctx: CanvasRenderingContext2D, _s: SignDef, w: number, h: number): void {
  ctx.fillStyle = '#f5f0e4';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#9e1e28';
  ctx.fillRect(9, 9, w - 18, h - 18);
  ctx.strokeStyle = '#e07a7f';
  ctx.lineWidth = 2;
  for (let d = -h; d < w + h; d += 14) {
    ctx.beginPath(); ctx.moveTo(d, 9); ctx.lineTo(d + h, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(d, h - 9); ctx.lineTo(d + h, 0); ctx.stroke();
  }
  ctx.strokeStyle = '#f5f0e4';
  ctx.lineWidth = 4;
  ctx.strokeRect(9, 9, w - 18, h - 18);
}

/** Every sign this file hangs. Each id begins with `bristol-`. */
export const SIGNS: SignDef[] = [
  nameSign('bristol-manor', 'Wayne Manor'),
  nameSign('bristol-batcave', 'The Batcave'),
  nameSign('bristol-kane', 'Kane Memorial Bridge'),
  { id: 'bristol-screen', lines: [], color: '#04101d', aspect: 1.6, kind: 'board', size: [256, 160], paint: paintScreen },
  { id: 'bristol-screen-side', lines: [], color: '#05121f', aspect: 1.4, kind: 'board', size: [140, 100], paint: paintSide },
  { id: 'bristol-card', lines: [], color: '#f5f0e4', aspect: 0.72, kind: 'board', size: [144, 200], paint: paintCard },
  { id: 'bristol-card-back', lines: [], color: '#9e1e28', aspect: 0.72, kind: 'board', size: [72, 100], paint: paintCardBack },
];

// ---------------------------------------------------------------------------
// Where things stand, from the plan
// ---------------------------------------------------------------------------

const CAVE = CREST.cave, COVE = CREST.cove, SPUR = CREST.spur;
/** The Batmobile's turntable, the guest's and the Batplane's pad. */
const TABLE = { x: 14, z: -90.5, r: 5.2, top: Y.cave + 0.25 };
const GUEST = { x: 30, z: -89.5, r: 4.6, top: Y.cave + 0.35 };
const PAD = { x: 43.5, z: -90.5, r: 5.4, top: Y.cave + 0.6 };
/** The terrace over the cave's back: its top, its underside. */
const TERRACE = { top: Y.crest + 0.04, under: Y.crest - 0.6, z1: CAVE.roofed };
/** The west tunnel's mouth, in line with the Batmobile's turntable. */
const WEST_TUNNEL = { z: TABLE.z, half: 2.5, h: 3.4 };
/** The stair from the Manor's study: its landing and door at the west end of the back wall, and its foot. */
const STAIR = { x0: 8.2, land: 10.2, x1: 16.0, top: 7.4, z0: CAVE.z0 + 0.05, z1: CAVE.z0 + 1.15 };
/** The Batcomputer's platform, under the terrace behind the guest's turntable. */
const DESK = { x0: 26, x1: 34, z0: CAVE.z0 + 0.1, z1: CAVE.z0 + 2.5, top: Y.cave + 0.8 };
/** The cove's tunnel, its waterfall's lip, its pool and its ford. */
const COVE_MID = (COVE.x0 + COVE.x1) / 2;
const POOL_Y = Y.cave + 0.25, FORD_Y = POOL_Y - 0.03, FALL_Z = COVE.z0 + 0.7;
/** The Batboat's arch in the shelf's river wall. */
const BOATHOUSE = { x: 30, z: -67, half: 2.5 };
/** The gates on the shelf. */
const GATES = { x: 96, z: -79.5 };

/** Places on what this file builds that the show needs as built: its task names them. */
export const PLACES: Record<string, Place> = {
  batmobile: { x: TABLE.x, y: TABLE.top, z: TABLE.z, h: PI },
  caveTunnel: { x: CAVE.x0 + 0.6, y: Y.cave + 0.055, z: WEST_TUNNEL.z, h: PI },
  guest: { x: GUEST.x, y: GUEST.top, z: GUEST.z, h: 0 },
  batplane: { x: PAD.x, y: PAD.top, z: PAD.z, h: PI / 2 },
  computer: { x: (DESK.x0 + DESK.x1) / 2, y: DESK.top, z: DESK.z0 + 1.85, h: -PI / 2 },
  caveStairTop: { x: (STAIR.x0 + STAIR.land) / 2, y: STAIR.top, z: (STAIR.z0 + STAIR.z1) / 2, h: 0 },
  caveStairFoot: { x: STAIR.x1 + 0.6, y: Y.cave + 0.04, z: (STAIR.z0 + STAIR.z1) / 2, h: 0 },
  fallTop: { x: COVE_MID, y: Y.crest + 0.06, z: FALL_Z, h: PI / 2 },
  fallFoot: { x: COVE_MID, y: POOL_Y, z: FALL_Z + 0.6, h: PI / 2 },
  coveTunnel: { x: COVE_MID, y: FORD_Y, z: COVE.z0 + 0.4, h: PI / 2 },
  fordSouth: { x: COVE_MID, y: FORD_Y, z: COVE.z1 - 0.4, h: PI / 2 },
  oldTunnel: { x: SPUR.x0 - 0.45, y: Y.shelf, z: CREST.cliff + 2, h: 0 },
  batboat: { x: BOATHOUSE.x, y: Y.water, z: BOATHOUSE.z + 1.2, h: PI / 2 },
  alfred: { x: 28, y: TERRACE.top, z: CAVE.z0 + 1.5, h: PI / 2 },
  manorDoor: { x: 28, y: TERRACE.top, z: CAVE.z0 - 0.15, h: PI / 2 },
  damian: { x: -1.5, y: Y.crest, z: -100.5, h: PI / 4 },
  titus: { x: 0.8, y: Y.crest, z: -99.2, h: PI / 4 },
  batCow: { x: -4.8, y: Y.crest, z: -104, h: PI / 3 },
  alfredCat: { x: 3.6, y: Y.crest, z: -103.6, h: PI / 4 },
  batsCrevice: { x: -18, y: 6, z: CREST.cliff + 0.4, h: PI / 2 },
  gates: { x: GATES.x, y: Y.shelf, z: GATES.z, h: PI / 2 },
};

// ---------------------------------------------------------------------------
// Wayne Manor
// ---------------------------------------------------------------------------

function manor(k: Build, l: Lot): void {
  const b = k.b, y0 = l.base;
  // the long range, the two cross-wings at its ends and the entrance bay between them
  const X0 = l.x0 + 2, X1 = l.x1 - 2, front = l.z1 - 0.3, zS = l.z1 - 2.5, zN = l.z1 - 8.5;
  const wingW = 7.5, wB = zS - 2.3, xc = (l.x0 + l.x1) / 2, bay = { x0: xc - 2.5, x1: xc + 2.5, z0: zS - 0.5 };
  // the wings stand a little proud of the range's ends, so that their walls and its gables never lie in one plane
  const wings = [{ x0: X0 - 0.15, x1: X0 + wingW, outer: -1 }, { x0: X1 - wingW, x1: X1 + 0.15, outer: 1 }];
  const plinth = y0 + 2, eaves = y0 + 6, wingTop = y0 + 10;

  // --- the range: plinth, one storey, cornice, battlements along its front, a steep slate roof
  b.box(X0 - 0.15, y0 - 0.4, zN - 0.15, X1 + 0.15, plinth, zS + 0.15, LIMESTONE_DARK, { faces: 'NEW' });
  b.box(X0, plinth, zN, X1, eaves, zS, LIMESTONE, { faces: 'NEW', win: GOTHIC_WIN, seed: 3.1 });
  b.box(X0, plinth, zN, X1, eaves, zS, LIMESTONE, { faces: 'S' });
  solid(b, X0 - 0.1, plinth - 0.1, zN - 0.12, X1 + 0.1, plinth + 0.15, zN, TRIM, 'NEWT');
  solid(b, X0 - 0.12, eaves - 0.25, zN - 0.15, X1 + 0.12, eaves, zN, TRIM, 'NEWB');
  roofX(b, X0, X1, zN, zS, eaves, 3.5, { overS: 0, overN: 0.35 });
  // the recessed fronts between the wings and the bay, each with two windows and battlements
  for (const [a, c] of [[wings[0].x1, bay.x0], [bay.x1, wings[1].x0]]) {
    b.box(a, y0 - 0.4, zS, c, plinth, zS + 0.15, LIMESTONE_DARK, { faces: 'S' });
    solid(b, a, plinth - 0.1, zS, c, plinth + 0.15, zS + 0.12, TRIM, 'STB');
    battlement(b, a, c, zS + 0.12, 1, eaves);
    const n = 2;
    for (let i = 0; i < n; i++) b.moved(a + ((i + 0.5) * (c - a)) / n, 0, zS, 0, () => lancet(b, 1.7, plinth + 0.5, eaves - 1.2, { transom: plinth + 2.2 }));
  }
  // tall chimneys on the range's front slope, between the wings and the bay
  const slopeY = (z: number): number => eaves + ((zS - z) * 3.5) / 3;
  for (const x of [(wings[0].x1 + bay.x0) / 2, (bay.x1 + wings[1].x0) / 2]) {
    const z = zS - 1.45;
    chimney(b, x, z, slopeY(z) - 0.4, Math.min(ceilingAt(x, z - 0.45), 22) - 0.4);
  }

  // --- the cross-wings: two storeys over a plinth, a gable to the front, a hip behind
  for (const w of wings) {
    const x0 = w.x0, x1 = w.x1, mid = (x0 + x1) / 2, outerX = w.outer < 0 ? x0 : x1;
    b.box(x0 - 0.15, y0 - 0.4, wB, x1 + 0.15, plinth, front + 0.15, LIMESTONE_DARK, { faces: 'ESW' });
    // the outer side with windows, the inner side's short stretch in front of the range with windows, and the front plain
    if (w.outer < 0) b.box(x0, plinth, wB, x1, wingTop, front, LIMESTONE, { faces: 'W', win: GOTHIC_WIN, seed: 5.3 });
    else b.box(x0, plinth, wB, x1, wingTop, front, LIMESTONE, { faces: 'E', win: GOTHIC_WIN, seed: 5.9 });
    const innerX = w.outer < 0 ? x1 : x0;
    b.box(innerX, plinth, zS, innerX + 0.001, wingTop, front, LIMESTONE, { faces: w.outer < 0 ? 'E' : 'W' });
    b.moved(innerX, 0, (zS + front) / 2, w.outer < 0 ? -PI / 2 : PI / 2, () => {
      lancet(b, 0.9, plinth + 0.6, eaves - 1.0, { lights: 1 });
      lancet(b, 0.9, eaves + 0.6, wingTop - 1.2, { lights: 1 });
    });
    b.box(x0, eaves - 0.3, wB, x1, wingTop, zS, LIMESTONE, { faces: w.outer < 0 ? 'EN' : 'WN' });
    if (w.outer > 0) b.box(x0, plinth, wB, x1, wingTop, front, LIMESTONE, { faces: 'S' });
    solid(b, x0 - 0.1, plinth - 0.1, wB, x1 + 0.1, plinth + 0.15, front + 0.12, TRIM, 'ESWT');
    solid(b, x0 - 0.1, eaves - 0.12, front, x1 + 0.1, eaves + 0.12, front + 0.12, TRIM, 'STB');
    solid(b, x0 - 0.12, wingTop - 0.25, wB - 0.12, x1 + 0.12, wingTop, front + 0.12, TRIM, 'NESWB');
    roofWing(b, x0, x1, wB, front, wingTop, 3.4);
    // a finial over the gable's point, and a small lancet in the gable
    pinnacle(b, mid, front + 0.05, wingTop + 3.3, 1.0, 0.16, TRIM);
    b.moved(mid, 0, front, 0, () => lancet(b, 0.8, wingTop + 0.5, wingTop + 1.6, { lights: 1, lit: 2 }));
    // the front: a great window of three lights on the ground storey (the west one the study's), two lancets over it
    if (w.outer > 0) b.moved(mid, 0, front, 0, () => lancet(b, 3.0, plinth + 0.4, eaves - 1.0, { lights: 3, transom: plinth + 2.4, head: 0.3 }));
    for (const s of [-1, 1]) b.moved(mid + s * 1.6, 0, front, 0, () => lancet(b, 1.2, eaves + 0.6, wingTop - 1.3, { lights: 1 }));
    // a tall chimney on the outer side
    const cz = wB + 1.6, cxo = outerX + w.outer * 0.45;
    b.box(cxo - 0.45, plinth, cz - 0.6, cxo + 0.45, wingTop, cz + 0.6, LIMESTONE_DARK, { faces: 'NESW' });
    chimney(b, cxo, cz, wingTop, Math.min(ceilingAt(cxo, cz - 0.7), 22.6) - 0.35, 'z');
    // a turret corbelled out from the front's outer corner, with a spire
    const tx = outerX + w.outer * 0.1, tz = front - 0.1;
    b.cyl(tx, tz, y0 + 4.4, y0 + 5.5, 0.15, 1.05, 8, TRIM, { cap: false });
    b.cyl(tx, tz, y0 + 5.5, wingTop, 1.0, 1.0, 8, LIMESTONE);
    for (const a of [PI / 2, w.outer * 0.0 + (w.outer > 0 ? 0 : PI)]) {
      const sx = tx + Math.cos(a) * 0.96, sz = tz + Math.sin(a) * 0.96;
      b.moved(sx, 0, sz, yawFacing(Math.cos(a), Math.sin(a)), () => b.quad([-0.14, y0 + 6.4, 0.02], [0.14, y0 + 6.4, 0.02], [0.14, y0 + 8.6, 0.02], [-0.14, y0 + 8.6, 0.02], [0, 0, 1], PANE, { win: interior(2.2) }));
    }
    b.cyl(tx, tz, wingTop, wingTop + 1.1, 1.0, 1.0, 8, LIMESTONE);
    solid(b, tx - 1.12, wingTop + 1.1, tz - 1.12, tx + 1.12, wingTop + 1.3, tz + 1.12, TRIM);
    b.cyl(tx, tz, wingTop + 1.3, Math.min(l.top, ceilingAt(tx, tz + 1)) - 0.2, 1.15, 0.05, 8, SLATE, { cap: false });
    // ivy up the outer corner
    b.moved(outerX - w.outer * 1.4, 0, front, 0, () => ivy(b, w.outer > 0 ? 41 : 43, 2.6, y0, wingTop - 2));
  }

  // --- the study: the west wing's great window, set in a recess, with the grandfather clock inside it
  {
    const w = wings[0], mid = (w.x0 + w.x1) / 2, hw = 1.5, sy0 = plinth + 0.4, sy1 = eaves - 1.3, head = sy1 + 0.8, back = front - 0.45;
    const warm = interior(2.6);
    b.quad([mid - hw, sy0, back], [mid + hw, sy0, back], [mid + hw, head, back], [mid - hw, head, back], [0, 0, 1], 0x4a3420, { win: warm });
    for (const s of [-1, 1]) b.quad([mid + s * hw, sy0, front + 0.02], [mid + s * hw, sy0, back], [mid + s * hw, head, back], [mid + s * hw, head, front + 0.02], [-s, 0, 0], LIMESTONE_DARK);
    b.quad([mid - hw, sy0, front + 0.02], [mid + hw, sy0, front + 0.02], [mid + hw, sy0, back], [mid - hw, sy0, back], [0, 1, 0], TRIM);
    b.quad([mid - hw, head, back], [mid + hw, head, back], [mid + hw, head, front + 0.02], [mid - hw, head, front + 0.02], [0, -1, 0], LIMESTONE_DARK);
    // the clock: a tall case, its hood, its dial with two hands at no particular hour, and its pendulum's window
    const cz = back + 0.06;
    solid(b, mid - 0.42, sy0, cz, mid + 0.42, sy0 + 2.4, cz + 0.28, 0x3b2618, 'NESWT');
    solid(b, mid - 0.5, sy0 + 2.4, cz - 0.02, mid + 0.5, sy0 + 2.85, cz + 0.32, 0x4a3020, 'NESWT');
    solid(b, mid - 0.56, sy0 + 2.85, cz - 0.02, mid + 0.56, sy0 + 2.97, cz + 0.34, BRASS, 'NESWT');
    roundel(b, [mid, sy0 + 2.62, cz + 0.33], 0.2, 'S', 0xefe4c8);
    for (const [a, len] of [[1.2, 0.17], [3.9, 0.12]]) b.beam([mid, sy0 + 2.62, cz + 0.35], [mid + Math.cos(a) * len, sy0 + 2.62 + Math.sin(a) * len, cz + 0.35], 0.02, 0.015, 0x1a1a1a);
    roundel(b, [mid, sy0 + 1.0, cz + 0.29], 0.13, 'S', BRASS, {}, 8);
    k.glows.push({ x: mid - 1.0, y: sy0 + 1.2, z: back + 0.25, sx: 0.25, sy: 0.3, sz: 0.25, color: '#ffd28a' });
    // the wall round the recess, and the stone bars of three lights in front of it, leaving the clock in the middle light
    b.quad([w.x0, plinth, front], [mid - hw, plinth, front], [mid - hw, wingTop, front], [w.x0, wingTop, front], [0, 0, 1], LIMESTONE);
    b.quad([mid + hw, plinth, front], [w.x1, plinth, front], [w.x1, wingTop, front], [mid + hw, wingTop, front], [0, 0, 1], LIMESTONE);
    b.quad([mid - hw, plinth, front], [mid + hw, plinth, front], [mid + hw, sy0, front], [mid - hw, sy0, front], [0, 0, 1], LIMESTONE);
    b.quad([mid - hw, head, front], [mid + hw, head, front], [mid + hw, wingTop, front], [mid - hw, wingTop, front], [0, 0, 1], LIMESTONE);
    for (const s of [-1, 1]) b.box(mid + s * 0.52 - 0.07, sy0, front, mid + s * 0.52 + 0.07, head, front + 0.1, TRIM, { faces: 'SEW' });
    b.box(mid - hw, sy1 - 0.07, front, mid + hw, sy1 + 0.07, front + 0.1, TRIM, { faces: 'STB' });
    b.box(mid - hw - 0.16, sy0 - 0.2, front, mid + hw + 0.16, sy0, front + 0.18, TRIM, { faces: 'SEWTB' });
  }

  // --- the entrance bay: a pointed door onto the terrace, an oriel over it, battlements and pinnacles
  {
    const { x0, x1 } = bay, z0 = bay.z0, mid = xc;
    b.box(x0 - 0.15, y0 - 0.4, z0, x1 + 0.15, plinth, front + 0.15, LIMESTONE_DARK, { faces: 'ESW' });
    b.box(x0, plinth, z0, x1, wingTop, front, LIMESTONE, { faces: 'EW', win: GOTHIC_WIN, seed: 7.7 });
    b.box(x0, plinth, z0, x1, wingTop, front, LIMESTONE, { faces: 'ST', top: LEAD });
    solid(b, x0 - 0.1, plinth - 0.1, z0, x1 + 0.1, plinth + 0.15, front + 0.12, TRIM, 'ESWT');
    battlement(b, x0 - 0.1, x1 + 0.1, front + 0.12, 1, wingTop);
    for (const [x, za, zb] of [[x0 - 0.1, z0, front + 0.12], [x1 - 0.22, z0, front + 0.12]] as const) b.box(x, wingTop, za, x + 0.32, wingTop + 0.7, zb, LIMESTONE, { faces: 'NESWT' });
    for (const [x, z] of [[x0, front], [x1, front], [x0, z0 + 0.3], [x1, z0 + 0.3]]) pinnacle(b, x, z, wingTop + 0.7, Math.min(1.8, ceilingAt(x, z) - wingTop - 0.9), 0.22, TRIM);
    // the door: oak in a pointed arch with a stone surround, a lamp each side
    const dw = 1.9, dt = y0 + 3.0;
    b.quad([mid - dw / 2, y0 + 0.04, front + 0.03], [mid + dw / 2, y0 + 0.04, front + 0.03], [mid + dw / 2, dt, front + 0.03], [mid - dw / 2, dt, front + 0.03], [0, 0, 1], TIMBER_DARK, { win: interior(0.5) });
    tri(b, [mid - dw / 2, dt, front + 0.03], [mid + dw / 2, dt, front + 0.03], [mid, dt + 0.9, front + 0.03], [0, 0, 1], TIMBER_DARK, { win: interior(0.5) });
    for (const s of [-1, 1]) {
      b.box(mid + s * (dw / 2 + 0.12) - 0.14, y0, front, mid + s * (dw / 2 + 0.12) + 0.14, dt, front + 0.22, TRIM, { faces: 'SEWT' });
      b.beam([mid + s * (dw / 2 + 0.12), dt - 0.05, front + 0.1], [mid, dt + 1.05, front + 0.1], 0.13, 0.13, TRIM);
      gasLamp(k, mid + s * 1.55, y0 + 2.6, front + 0.35, 0, AMBER);
    }
    b.box(mid - 0.07, y0 + 0.04, front + 0.03, mid + 0.07, dt + 0.85, front + 0.07, 0x2a1c12, { faces: 'SEW' });
    // the oriel over the door: a window bay on corbels
    const oy = eaves + 0.2;
    b.box(mid - 1.2, oy - 0.5, front, mid + 1.2, oy, front + 0.7, TRIM, { faces: 'SEWB' });
    b.cyl(mid, front + 0.2, oy - 1.4, oy - 0.5, 0.1, 0.75, 4, TRIM, { cap: false, phase: PI / 4 });
    b.box(mid - 1.2, oy, front + 0.02, mid + 1.2, wingTop - 0.9, front + 0.7, LIMESTONE, { faces: 'EW', win: interior(2.2) });
    b.box(mid - 1.2, oy, front + 0.02, mid + 1.2, wingTop - 0.9, front + 0.7, LIMESTONE, { faces: 'S' });
    b.moved(mid, 0, front + 0.7, 0, () => lancet(b, 2.0, oy + 0.2, wingTop - 1.6, { lights: 3, head: 0.25 }));
    solid(b, mid - 1.3, wingTop - 0.9, front - 0.05, mid + 1.3, wingTop - 0.6, front + 0.8, TRIM);
    b.moved(x1, 0, front - 0.6, 0, () => ivy(b, 47, 1.2, y0, eaves + 2));
  }

  // --- the paving before the house between the wings, a step down from the door to the terrace, the lawn's edge
  for (const [a, c] of [[wings[0].x1, bay.x0], [bay.x1, wings[1].x0]]) b.quad([a, TERRACE.top, front], [c, TERRACE.top, front], [c, TERRACE.top, zS + 0.15], [a, TERRACE.top, zS + 0.15], [0, 1, 0], LIMESTONE);
  // the path from the house's east door to the forecourt
  const fc = lotOf('forecourt');
  b.quad([X1 + 0.15, Y.crest + 0.04, zN + 1.5], [fc.x0 + 0.2, Y.crest + 0.04, zN + 1.5], [fc.x0 + 0.2, Y.crest + 0.04, zN + 4.5], [X1 + 0.15, Y.crest + 0.04, zN + 4.5], [0, 1, 0], GRAVEL);
  // a side door into the east wing's range
  b.box(X1, y0, zN + 2.2, X1 + 0.24, y0 + 2.6, zN + 3.8, TIMBER_DARK, { faces: 'NEST', win: interior(0.5) });
  gasLamp(k, X1 + 0.35, y0 + 3.1, zN + 4.3, 0, AMBER);
  k.lights.push({ x: xc, z: l.z1 + 1.5, r: 11, color: AMBER, k: 0.5 });
  k.lights.push({ x: X0 + 3, z: l.z1 - 1, r: 8, color: AMBER, k: 0.4 });
  k.lights.push({ x: X1 - 3, z: l.z1 - 1, r: 8, color: AMBER, k: 0.4 });
}

// ---------------------------------------------------------------------------
// The Batcave
// ---------------------------------------------------------------------------

/** A round deck that faces the sky and glows a little at night, as if lit from under: a turntable's top, the pad's. */
function disc(b: GeoBuilder, x: number, z: number, y: number, r: number, color: number, lit = 0.6, n = 12): void {
  for (let i = 0; i < n; i++) {
    const a0 = PI / n + (i / n) * PI * 2, a1 = PI / n + ((i + 1) / n) * PI * 2;
    b.up([x, y, z], [x + Math.cos(a0) * r, y, z + Math.sin(a0) * r], [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r], color, { win: interior(lit) });
  }
}

/** A turntable's drum: an outer step and an inner top, with lamps round its rim. */
function turntable(k: Build, x: number, z: number, r: number, top: number, lamp: string): void {
  const b = k.b;
  b.cyl(x, z, Y.shelf, top - 0.08, r, r, 12, STEEL_DARK, { cap: STEEL });
  b.cyl(x, z, top - 0.1, top, r - 0.5, r - 0.5, 12, STEEL_DECK, { cap: false });
  disc(b, x, z, top, r - 0.5, STEEL_DECK, 0.5);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + 0.2;
    k.glows.push({ x: x + Math.cos(a) * (r - 0.25), y: top - 0.05, z: z + Math.sin(a) * (r - 0.25), sx: 0.22, sy: 0.06, sz: 0.22, color: lamp });
  }
}

/** The giant Lincoln penny, standing on its edge in a cradle, its face to the way (nx, nz). */
function penny(b: GeoBuilder, x: number, z: number, nx: number, nz: number): void {
  const r = 2.25, t = 0.2, y = Y.cave + 0.45 + r, n = 14, yaw = yawFacing(nx, nz);
  b.moved(x, y, z, yaw, () => {
    const p = (i: number, rr: number, lz: number): V3 => [Math.cos((i / n) * PI * 2) * rr, Math.sin((i / n) * PI * 2) * rr, lz];
    for (let i = 0; i < n; i++) {
      const m = ((i + 0.5) / n) * PI * 2;
      b.quad(p(i, r, -t), p(i + 1, r, -t), p(i + 1, r, t), p(i, r, t), [Math.cos(m), Math.sin(m), 0], COPPER);
      for (const s of [-1, 1]) {
        tri(b, [0, 0, s * t], p(i, r, s * t), p(i + 1, r, s * t), [0, 0, s], COPPER);
        tri(b, [0, 0, s * (t + 0.04)], p(i, r - 0.22, s * (t + 0.04)), p(i + 1, r - 0.22, s * (t + 0.04)), [0, 0, s], 0xa8662f);
      }
    }
    // Lincoln's bust in profile, facing right as on the coin: head, beard, neck and shoulders, in relief
    const R = (x0: number, y0: number, x1: number, y1: number, c = COPPER_DEEP): void => b.box(x0, y0, t + 0.04, x1, y1, t + 0.2, c, { faces: 'NESWT' });
    R(-0.55, 0.15, 0.45, 1.25);
    R(-0.2, -0.35, 0.65, 0.35);
    R(0.45, 0.35, 0.62, 0.75);
    R(-0.4, -0.8, 0.25, -0.3);
    R(-1.3, -1.75, 0.9, -0.75);
    R(-0.6, 1.1, 0.3, 1.45, 0x7a4622);
  });
  // the cradle it stands in
  b.moved(x, 0, z, yaw, () => {
    solid(b, -1.3, Y.cave, -0.55, 1.3, Y.cave + 0.55, 0.55, STEEL_DARK, 'NESWT');
    solid(b, -1.45, Y.cave, -0.65, 1.45, Y.cave + 0.12, 0.65, IRON_DARK, 'NESWT');
  });
}

/** The mechanical Tyrannosaurus, on a low plinth, facing the way `yaw` turns +x to: a toy's blocky robot of one. Its head reaches about `Y.cave + 6.7`. */
function rex(k: Build, x: number, z: number, yaw: number): void {
  const b = k.b, y = Y.cave + 0.3;
  b.moved(x, y, z, yaw, () => {
    solid(b, -2.0, -0.3, -1.0, 1.6, 0, 1.0, STONE_DARK, 'NESWT');
    // the spine, from the tail's tip, which rests on the floor, to the neck
    const spine: V3[] = [[-4.4, 0.35, -0.6], [-3.3, 1.2, -0.35], [-2.0, 2.4, -0.1], [-0.6, 3.4, 0], [0.5, 4.2, 0], [1.2, 4.9, 0], [1.6, 5.4, 0]];
    b.sweep(spine, [0.12, 0.3, 0.55, 0.9, 0.95, 0.7, 0.5], REX);
    // the belly, paler
    b.beam([-0.4, 2.85, 0], [1.1, 4.1, 0], 0.62, 0.5, REX_BELLY);
    // the head and the jaw, a little open, with a row of teeth
    b.obox(2.2, 5.8, 0, 0.95, 0.42, 0.42, -0.12, REX);
    b.obox(2.1, 5.22, 0, 0.82, 0.16, 0.34, 0.18, REX_DARK);
    b.obox(2.25, 5.45, 0, 0.7, 0.08, 0.3, 0.05, 0xe9e4d4);
    for (const s of [-1, 1]) b.box(2.0, 6.1, s * 0.3 - 0.12, 2.35, 6.32, s * 0.3 + 0.12, REX_DARK, { faces: 'NESWT' });
    // the legs: thigh, shin and a foot of three toes
    for (const s of [-1, 1]) {
      b.beam([-0.5, 3.2, s * 0.75], [0.35, 1.7, s * 0.85], 0.55, 0.38, REX);
      b.beam([0.35, 1.7, s * 0.85], [-0.3, 0.45, s * 0.85], 0.32, 0.24, REX_DARK);
      b.obox(0.25, 0.15, s * 0.85, 0.7, 0.15, 0.36, 0, REX_DARK);
      // the small arms
      b.beam([1.0, 4.5, s * 0.55], [1.6, 3.9, s * 0.65], 0.14, 0.09, REX_DARK);
    }
    // plates of the machine along its back
    for (let i = 0; i < 5; i++) {
      const t = 0.15 + i * 0.17, p = spine[Math.min(spine.length - 1, Math.round(t * (spine.length - 1)))];
      b.box(p[0] - 0.22, p[1] + 0.45, p[2] - 0.08, p[0] + 0.22, p[1] + 0.85, p[2] + 0.08, REX_DARK, { faces: 'NESWT' });
    }
  });
  // its eyes glow red at night, as a machine's would
  for (const s of [-1, 1]) {
    const [ex, ez] = toWorld(x, z, yaw, 2.55, s * 0.43);
    k.glows.push({ x: ex, y: y + 5.95, z: ez, sx: 0.12, sy: 0.12, sz: 0.12, color: '#ff4030' });
  }
}

function batcave(k: Build, l: Lot): void {
  const b = k.b, F = Y.cave, R = rng(0xba7c);
  const m = lotOf('manor');

  // --- the floor: a concrete apron over the rock, with lines to the tunnel
  b.quad([l.x0 + 0.2, F + 0.035, l.z1 - 0.15], [l.x1 - 0.2, F + 0.035, l.z1 - 0.15], [l.x1 - 0.2, F + 0.035, l.z0 + 0.05], [l.x0 + 0.2, F + 0.035, l.z0 + 0.05], [0, 1, 0], CONCRETE);
  for (const s of [-1, 1]) b.quad([l.x0 + 1.4, F + 0.06, WEST_TUNNEL.z + s * 1.9 + 0.08], [TABLE.x - TABLE.r + 0.2, F + 0.06, WEST_TUNNEL.z + s * 1.9 + 0.08], [TABLE.x - TABLE.r + 0.2, F + 0.06, WEST_TUNNEL.z + s * 1.9 - 0.08], [l.x0 + 1.4, F + 0.06, WEST_TUNNEL.z + s * 1.9 - 0.08], [0, 1, 0], HAZARD);

  // --- the terrace over the cave's back: a slab of rock faced in stone, its paving on top, a balustrade along its edges
  {
    const x0 = m.x0, x1 = m.x1, zb = l.z0, zf = TERRACE.z1, top = TERRACE.top, under = TERRACE.under;
    b.quad([x0, top, m.z1 - 0.3], [x1, top, m.z1 - 0.3], [x1, top, zf], [x0, top, zf], [0, 1, 0], LIMESTONE);
    b.quad([x0, under, zb], [x1, under, zb], [x1, under, zf], [x0, under, zf], [0, -1, 0], ROCK_DARK, { win: interior(0.9) });
    b.quad([x0, under, zf], [x1, under, zf], [x1, top, zf], [x0, top, zf], [0, 0, 1], LIMESTONE_DARK);
    for (const [x, nx] of [[x0, -1], [x1, 1]] as const) b.quad([x, under, zb], [x, under, zf], [x, top, zf], [x, top, zb], [nx, 0, 0], LIMESTONE_DARK);
    balustrade(b, [[x0 + 0.2, zf - 0.2], [x1 - 0.2, zf - 0.2]], top, TRIM);
    balustrade(b, [[x0 + 0.2, zb - 0.1], [x0 + 0.2, zf - 0.2]], top, TRIM);
    balustrade(b, [[x1 - 0.2, zf - 0.2], [x1 - 0.2, zb - 0.1]], top, TRIM);
    for (const x of [x0 + 10, x1 - 10]) gasLamp(k, x, top + 1.7, zf - 0.2, 0.6, AMBER);
    // lamps under it, lighting the cave's back
    for (let x = x0 + 3; x < x1 - 1; x += 6.5) k.glows.push({ x, y: under - 0.32, z: zf - 0.5, sx: 0.9, sy: 0.08, sz: 0.25, color: '#d8ecff' });
    // stalactites, and a few roosting bats
    for (let i = 0; i < 18; i++) {
      const x = x0 + 1 + R() * (x1 - x0 - 2), z = zb + 0.4 + R() * (zf - zb - 0.8), len = 0.5 + R() * 0.7;
      if (x > DESK.x0 - 1.5 && x < DESK.x1 + 1.5) continue;
      b.cyl(x, z, under - len - 0.25, under - 0.2, 0.03, 0.22 + R() * 0.15, 5, i % 3 ? ROCK : ROCK_LIGHT, { cap: false });
    }
    for (let i = 0; i < 8; i++) {
      const x = x0 + 3 + R() * (x1 - x0 - 6), z = zb + 0.8 + R() * (zf - zb - 1.4), yb = under - 0.25;
      b.box(x - 0.09, yb - 0.42, z - 0.09, x + 0.09, yb, z + 0.09, 0x141418, { faces: 'NESWB' });
      b.box(x - 0.2, yb - 0.36, z - 0.05, x + 0.2, yb - 0.05, z + 0.05, 0x1c1c22, { faces: 'NESWB' });
    }
  }

  // --- the turntables and the Batplane's pad
  turntable(k, TABLE.x, TABLE.z, TABLE.r, TABLE.top, '#cfe6ff');
  turntable(k, GUEST.x, GUEST.z, GUEST.r, GUEST.top, '#ffd28a');
  b.cyl(PAD.x, PAD.z, Y.shelf, PAD.top - 0.06, PAD.r, PAD.r, 12, STEEL_DARK, { cap: STEEL });
  b.cyl(PAD.x, PAD.z, PAD.top - 0.08, PAD.top, PAD.r - 0.6, PAD.r - 0.6, 12, STEEL_DECK, { cap: false });
  disc(b, PAD.x, PAD.z, PAD.top, PAD.r - 0.6, STEEL_DECK, 0.5);
  b.cyl(PAD.x, PAD.z, PAD.top - 0.08, PAD.top + 0.02, 1.3, 1.3, 12, HAZARD, { cap: STEEL_DECK });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2;
    k.glows.push({ x: PAD.x + Math.cos(a) * (PAD.r - 0.3), y: PAD.top - 0.04, z: PAD.z + Math.sin(a) * (PAD.r - 0.3), sx: 0.2, sy: 0.06, sz: 0.2, color: '#ff7a3a' });
  }

  // --- the tunnel's mouth in the west wall, in line with the Batmobile's turntable
  {
    const x0 = l.x0, z0 = WEST_TUNNEL.z - WEST_TUNNEL.half, z1 = WEST_TUNNEL.z + WEST_TUNNEL.half, top = F + WEST_TUNNEL.h, d = 1.3;
    b.quad([x0 + 0.06, F, z1], [x0 + 0.06, F, z0], [x0 + 0.06, top, z0], [x0 + 0.06, top, z1], [1, 0, 0], DARK, { win: interior(0.6) });
    for (const [za, zb] of [[z0 - 0.6, z0], [z1, z1 + 0.6]]) solid(b, x0, F, za, x0 + d, top, zb, STEEL_DARK, 'NESW');
    solid(b, x0, top, z0 - 0.6, x0 + d, top + 0.8, z1 + 0.6, STEEL_DARK, 'ESTB');
    b.box(x0 + d, top + 0.15, z0 - 0.4, x0 + d + 0.04, top + 0.55, z1 + 0.4, HAZARD, { faces: 'E' });
    // the floor inside, the tunnel's lamps running in, and two lamps at its mouth
    b.quad([x0, F + 0.055, z1], [x0 + d, F + 0.055, z1], [x0 + d, F + 0.055, z0], [x0, F + 0.055, z0], [0, 1, 0], STEEL_DECK);
    for (let i = 0; i < 3; i++) k.glows.push({ x: x0 + 0.25 + i * 0.4, y: top - 0.12, z: WEST_TUNNEL.z, sx: 0.12, sy: 0.06, sz: 3.6, color: '#ffcf7a' });
    for (const zz of [z0 - 0.3, z1 + 0.3]) k.glows.push({ x: x0 + d + 0.08, y: top + 0.4, z: zz, sx: 0.08, sy: 0.25, sz: 0.25, color: '#ff4a3a' });
  }

  // --- the stair from the Manor's study: a lit doorway in the back wall, a landing, and a flight down to the floor
  {
    const z0 = STAIR.z0, z1 = STAIR.z1, top = STAIR.top, warm = interior(2.6);
    b.quad([STAIR.x0 + 0.25, top, z0], [STAIR.land - 0.35, top, z0], [STAIR.land - 0.35, TERRACE.under - 0.3, z0], [STAIR.x0 + 0.25, TERRACE.under - 0.3, z0], [0, 0, 1], 0x4a3420, { win: warm });
    for (const x of [STAIR.x0 + 0.1, STAIR.land - 0.35]) solid(b, x, top, z0 - 0.05, x + 0.25, TERRACE.under - 0.1, z0 + 0.15, STONE_TRIM, 'NESWT');
    solid(b, STAIR.x0 + 0.1, TERRACE.under - 0.35, z0 - 0.05, STAIR.land - 0.1, TERRACE.under - 0.05, z0 + 0.2, STONE_TRIM, 'NESWB');
    solid(b, STAIR.x0, top - 0.3, z0, STAIR.land, top, z1, STONE, 'NESWTB');
    b.beam([STAIR.x0 + 0.3, top - 0.3, z1 - 0.2], [STAIR.x0 + 0.3, F, z1 - 0.2], 0.12, 0.12, STONE_DARK);
    const steps = 9, run = (STAIR.x1 - STAIR.land) / steps, rise = (top - F) / (steps + 1);
    for (let i = 0; i < steps; i++) {
      const xa = STAIR.land + i * run, yt = top - (i + 1) * rise;
      b.box(xa, yt - 0.35, z0, xa + run + 0.02, yt, z1, STONE, { faces: 'NESWTB' });
    }
    // a rail on its open side
    b.beam([STAIR.x0 + 0.1, top + 1.0, z1 - 0.06], [STAIR.land, top + 1.0, z1 - 0.06], 0.05, 0.05, IRON);
    b.beam([STAIR.land, top + 1.0, z1 - 0.06], [STAIR.x1, F + 1.0, z1 - 0.06], 0.05, 0.05, IRON);
    for (const t of [0, 0.5, 1]) {
      const x = STAIR.land + (STAIR.x1 - STAIR.land) * t, yy = top - (top - F) * t;
      b.beam([x, yy - 0.1, z1 - 0.06], [x, yy + 1.0, z1 - 0.06], 0.04, 0.04, IRON);
    }
    k.lights.push({ x: STAIR.land, z: z1 + 1, r: 6, color: AMBER, k: 0.45 });
  }

  // --- the Batcomputer on its platform under the terrace: a desk, a great screen and two side screens
  {
    const { x0, x1, z0, z1, top } = DESK, mid = (x0 + x1) / 2;
    b.box(x0, F, z0, x1, top, z1, STEEL_DARK, { faces: 'NESWT', top: STEEL_DECK });
    solid(b, x0 - 0.6, F, z0 + 0.9, x0, F + 0.4, z0 + 1.9, STEEL, 'NESWT');
    solid(b, x1, F, z0 + 0.9, x1 + 0.6, F + 0.4, z0 + 1.9, STEEL, 'NESWT');
    b.beam([x0 + 0.1, top + 1.0, z1 - 0.1], [x1 - 0.1, top + 1.0, z1 - 0.1], 0.05, 0.05, IRON);
    for (const x of [x0 + 0.1, mid, x1 - 0.1]) b.beam([x, top, z1 - 0.1], [x, top + 1.0, z1 - 0.1], 0.04, 0.04, IRON);
    // the desk, its keys glowing
    solid(b, mid - 2.8, top, z0 + 0.95, mid + 2.8, top + 0.85, z0 + 1.45, STEEL_DARK, 'NESWT');
    k.glows.push({ x: mid, y: top + 0.88, z: z0 + 1.3, sx: 4.6, sy: 0.03, sz: 0.25, color: '#7fc8ff' });
    // the great screen on its frame
    const sz = z0 + 0.72;
    solid(b, mid - 2.1, top + 0.85, sz - 0.12, mid + 2.1, top + 3.55, sz, DARK, 'NESWTB');
    k.sign('bristol-screen', mid, top + 2.2, sz + 0.03, 0, 1, 2.4, 3.9);
    for (const s of [-1, 1]) {
      const sx = mid + s * 3.0, sz2 = z0 + 1.05, nx = -s * 0.45, nz = 0.89, yaw = Math.atan2(-nx, nz);
      b.moved(sx, 0, sz2, yaw, () => solid(b, -0.95, top + 1.2, -0.14, 0.95, top + 2.75, 0, DARK, 'NESWTB'));
      k.sign('bristol-screen-side', sx + nx * 0.03, top + 1.97, sz2 + nz * 0.03, nx, nz, 1.3, 1.8);
    }
    k.lights.push({ x: mid, z: z1 + 0.8, r: 7, color: '#7fb8ff', k: 0.6 });
  }

  // --- the workbench and the lockers along the back, oil drums by the pad
  {
    const z0 = l.z0 + 0.08;
    solid(b, 18.6, F, z0, 24.8, F + 1.05, z0 + 1.0, TIMBER_DARK, 'NESWT');
    solid(b, 18.5, F + 1.05, z0 - 0.02, 24.9, F + 1.15, z0 + 1.08, STEEL, 'NESWT');
    solid(b, 19.2, F + 1.15, z0 + 0.2, 20.4, F + 1.6, z0 + 0.7, 0xa03028, 'NESWT');
    solid(b, 22.2, F + 1.15, z0 + 0.3, 22.7, F + 1.55, z0 + 0.6, IRON, 'NESWT');
    b.quad([18.8, F + 1.5, z0 - 0.03], [24.6, F + 1.5, z0 - 0.03], [24.6, F + 3.1, z0 - 0.03], [18.8, F + 3.1, z0 - 0.03], [0, 0, 1], TIMBER);
    k.glows.push({ x: 21.7, y: F + 3.3, z: z0 + 0.4, sx: 1.4, sy: 0.08, sz: 0.2, color: '#ffe6b0' });
    solid(b, 44.4, F, z0, 48.8, F + 2.6, z0 + 0.65, STEEL, 'NESWT');
    for (let x = 45.5; x < 48.7; x += 1.1) b.box(x - 0.03, F + 0.1, z0 + 0.65, x + 0.03, F + 2.5, z0 + 0.68, IRON_DARK, { faces: 'S' });
    for (const [x, zz] of [[39.6, z0 + 0.6], [40.7, z0 + 0.5], [40.1, z0 + 1.35]]) b.cyl(x, zz, F, F + 1.2, 0.45, 0.45, 8, zz > z0 + 1 ? 0x7a3a2c : 0x3a5a7a);
  }

  // --- the trophies: the penny and the Tyrannosaurus at the back of the open part, the Joker card at the cut's mouth
  penny(b, 22.6, -93.0, 0.34, 0.94);
  rex(k, 36.2, -92.6, 1.15);
  {
    const cx = l.x0 + 1.8, cz = l.z1 - 1.3, nx = TO_VIEW[0], nz = TO_VIEW[2], yaw = yawFacing(nx, nz), cy = F + 0.4 + 2.5;
    b.moved(cx, 0, cz, yaw, () => {
      solid(b, -1.8, cy - 2.5, -0.06, 1.8, cy + 2.5, 0.06, 0xe9e4d8);
      solid(b, -1.0, F, -0.5, 1.0, F + 0.4, 0.3, STEEL_DARK, 'NESWT');
      b.beam([0, F + 0.3, -0.45], [0, cy + 0.6, -0.08], 0.08, 0.06, IRON);
    });
    k.sign('bristol-card', cx + nx * 0.09, cy, cz + nz * 0.09, nx, nz, 5, 3.6);
    k.sign('bristol-card-back', cx - nx * 0.09, cy, cz - nz * 0.09, -nx, -nz, 5, 3.6);
  }

  // --- the cave's rock: lips that overhang its cut along the top of its walls, stalactites under them, stalagmites at its edges
  for (const [x, dir] of [[l.x0, 1], [l.x1, -1]] as const) {
    const cuts = [l.z0, l.z0 + 3, l.z0 + 6.2, l.z0 + 9.1, l.z1 - 0.3];
    for (let i = 0; i + 1 < cuts.length; i++) {
      const za = cuts[i] + 0.05, zb = cuts[i + 1] - 0.05, overPortal = dir > 0 && za < WEST_TUNNEL.z + WEST_TUNNEL.half + 1.2 && zb > WEST_TUNNEL.z - WEST_TUNNEL.half - 1.2;
      const overCard = dir > 0 && zb > l.z1 - 3.4;
      const reach = overCard ? 0.45 : 0.6 + R() * 0.8;
      let yb = Y.crest - 1.3 - R() * 0.9;
      if (overPortal) yb = Math.max(yb, Y.cave + WEST_TUNNEL.h + 1.05);
      if (overCard) yb = Math.max(yb, Y.crest - 0.3);
      const xa = dir > 0 ? x - 0.4 : x - reach, xb = dir > 0 ? x + reach : x + 0.4;
      solid(b, xa, yb, za, xb, Y.crest + 0.25 + R() * 0.35, zb, i % 2 ? ROCK : ROCK_LIGHT);
      for (let j = 0; j < 3; j++) {
        if (overPortal || overCard) continue;
        const sx = dir > 0 ? x + 0.15 + R() * (reach - 0.25) : x - 0.15 - R() * (reach - 0.25), sz = za + 0.4 + R() * (zb - za - 0.8);
        b.cyl(sx, sz, yb - 0.5 - R() * 0.5, yb, 0.03, 0.18, 5, ROCK_DARK, { cap: false });
      }
    }
  }
  for (const [x, z, h] of [[49.4, -88.4, 1.4], [49.5, -89.6, 0.9], [6.7, -95.0, 1.1]]) b.cyl(x, z, F, F + h, 0.5, 0.05, 6, ROCK, { cap: false });
  // a column of rock at the mouth's east corner, where a stalagmite has met its stalactite: it frames the cutaway
  {
    const x = l.x1 - 0.9, z = l.z1 - 1.0;
    b.cyl(x, z, F - 0.1, F + 3.2, 1.15, 0.42, 7, ROCK);
    b.cyl(x, z, F + 3.2, Y.crest + 0.3, 0.42, 1.2, 7, ROCK_LIGHT, { cap: ROCK });
  }
  // the walls of the cut and its back, faced in rock that glows a little at night, as a cave lit from within does
  b.quad([l.x0 + 0.03, F, l.z0 + 0.02], [l.x0 + 0.03, F, l.z1], [l.x0 + 0.03, Y.crest - 0.3, l.z1], [l.x0 + 0.03, Y.crest - 0.3, l.z0 + 0.02], [1, 0, 0], ROCK, { win: interior(0.7) });
  b.quad([l.x1 - 0.03, F, l.z1], [l.x1 - 0.03, F, l.z0 + 0.02], [l.x1 - 0.03, Y.crest - 0.3, l.z0 + 0.02], [l.x1 - 0.03, Y.crest - 0.3, l.z1], [-1, 0, 0], ROCK, { win: interior(0.7) });
  b.quad([l.x0, F, l.z0 + 0.02], [l.x1, F, l.z0 + 0.02], [l.x1, TERRACE.under, l.z0 + 0.02], [l.x0, TERRACE.under, l.z0 + 0.02], [0, 0, 1], ROCK_DARK, { win: interior(0.9) });
  // rocks along the clifftop on either side of the cut, so that its rim reads as rock and not lawn
  for (const [xa, xb] of [[CREST.cove.x1 + 0.5, l.x0 - 0.3], [l.x1 + 0.3, CREST.spur.x0 - 0.3]]) {
    for (let x = xa; x < xb - 0.8; ) {
      const w = 1.2 + R() * 1.6, x1 = Math.min(xb, x + w);
      solid(b, x, Y.crest - 0.6, CREST.cliff - 1.3 - R() * 0.6, x1, Y.crest + 0.3 + R() * 0.55, CREST.cliff - 0.1, R() > 0.5 ? ROCK : ROCK_LIGHT, 'NESWT');
      x = x1 + 0.2 + R() * 0.8;
    }
  }

  // the cave glows from within at night
  k.lights.push({ x: TABLE.x, z: TABLE.z, r: 10, color: COLD, k: 0.7 });
  k.lights.push({ x: GUEST.x, z: GUEST.z, r: 9, color: AMBER, k: 0.65 });
  k.lights.push({ x: PAD.x, z: PAD.z, r: 9, color: COLD, k: 0.65 });
  k.lights.push({ x: 36, z: -88, r: 8, color: '#9ad0ff', k: 0.5 });
  // guide lamps let into the floor along the mouth, lamps on the west wall, and lamps that light the trophies from below
  for (let x = l.x0 + 1.5; x < l.x1 - 2; x += 2.6) k.glows.push({ x, y: F + 0.06, z: l.z1 - 0.35, sx: 0.5, sy: 0.04, sz: 0.14, color: '#6fb8ff' });
  for (let z = l.z0 + 3.4; z < l.z1 - 1; z += 3.6) if (Math.abs(z - WEST_TUNNEL.z) > WEST_TUNNEL.half + 0.9) k.glows.push({ x: l.x0 + 0.15, y: Y.crest - 2.2, z, sx: 0.12, sy: 0.3, sz: 0.5, color: '#d8ecff' });
  for (const [x, z] of [[21.6, -91.9], [23.6, -92.3], [37.4, -91.2]]) k.glows.push({ x, y: F + 0.12, z, sx: 0.3, sy: 0.12, sz: 0.3, color: '#ffe0a0' });
  k.lights.push({ x: 22.6, z: -91.5, r: 6, color: '#ffd28a', k: 0.45 });

  // the name, as a museum labels a cutaway: a small board at the cut's edge, on the hill east of it
  {
    const x = l.x1 + 1.6, z = l.z1 - 1.3, y = Y.crest, h = 0.8;
    const w = k.sign('bristol-batcave', x + TO_VIEW[0] * 0.03, y + 1.25, z + TO_VIEW[2] * 0.03, TO_VIEW[0], TO_VIEW[2], h, 5);
    const yaw = Math.atan2(TO_VIEW[0], -TO_VIEW[2]);
    b.obox(x - TO_VIEW[0] * 0.05, y + 1.25, z - TO_VIEW[2] * 0.05, w / 2 + 0.1, h / 2 + 0.08, 0.05, yaw, DARK, { faces: 'B' });
    for (const s of [-1, 1]) b.beam([x + Math.cos(yaw) * s * (w / 2 - 0.2), y, z + Math.sin(yaw) * s * (w / 2 - 0.2)], [x + Math.cos(yaw) * s * (w / 2 - 0.2), y + 0.85, z + Math.sin(yaw) * s * (w / 2 - 0.2)], 0.07, 0.07, IRON);
    BOARDS.push({ x, z, w });
  }
}

// ---------------------------------------------------------------------------
// The waterfall's cove
// ---------------------------------------------------------------------------

function cove(k: Build, l: Lot): void {
  const b = k.b, F = Y.cave, mid = (l.x0 + l.x1) / 2, R = rng(0xc07e);

  // --- the tunnel's mouth in the middle of its north wall, dark, which the waterfall hides
  {
    const z = l.z0, x0 = mid - 2.5, x1 = mid + 2.5, top = F + 3.4;
    b.quad([x0, F, z + 0.04], [x1, F, z + 0.04], [x1, top, z + 0.04], [x0, top, z + 0.04], [0, 0, 1], DARK, { win: interior(0.5) });
    solid(b, x0 - 0.8, F - 0.2, z, x0, top + 0.6, z + 0.5, ROCK_LIGHT, 'NESWT');
    solid(b, x1, F - 0.2, z, x1 + 0.8, top + 0.6, z + 0.5, ROCK_LIGHT, 'NESWT');
    solid(b, x0 - 0.8, top, z, x1 + 0.8, top + 0.9, z + 0.5, ROCK, 'NESWTB');
    for (let i = 0; i < 2; i++) k.glows.push({ x: mid, y: top - 0.15, z: z + 0.15 + i * 0.01, sx: 4.4, sy: 0.05, sz: 0.06, color: '#ffcf7a' });
  }

  // --- the lip the water comes over, in a notch at the cliff's top, between two shoulders of rock
  {
    const z = l.z0;
    solid(b, mid - 2.2, Y.crest - 0.3, z - 0.3, mid + 2.2, Y.crest + 0.03, FALL_Z + 0.05, ROCK_DARK, 'NESWTB');
    for (const s of [-1, 1]) {
      solid(b, mid + s * 2.2 - (s > 0 ? 0 : 1.9), Y.crest - 0.6, z - 1.8, mid + s * 2.2 + (s > 0 ? 1.9 : 0), Y.crest + 1.1, z + 0.55, ROCK);
      solid(b, mid + s * 3.4 - 0.8, Y.crest - 0.2, z - 3.2, mid + s * 3.4 + 0.8, Y.crest + 0.6, z - 1.6, ROCK_LIGHT);
    }
  }

  // --- the pool on its floor, its sill at the mouth, and the ford of setts across it from the tunnel to the mouth
  {
    const x0 = l.x0 + 0.05, x1 = l.x1 - 0.05, z0 = l.z0 + 0.05, zs = l.z1 - 0.6;
    waterOf(k, [{ pts: [[x0, z0], [x1, z0], [x1, zs], [x0, zs]], y: POOL_Y }], WATER_POOL);
    b.quad([x0, F + 0.035, z0], [x1, F + 0.035, z0], [x1, F + 0.035, zs], [x0, F + 0.035, zs], [0, 1, 0], 0x2c3a3e);
    for (const [a, c] of [[x0, mid - 2.1], [mid + 2.1, x1]]) solid(b, a, F - 0.2, zs, c, POOL_Y + 0.2, l.z1 - 0.05, STONE_LIGHT, 'NESWT');
    b.box(mid - 2, F, z0, mid + 2, FORD_Y, zs, SETT, { faces: 'EWT' });
    // the setts' joints: a few darker courses across it
    for (let z = z0 + 0.8; z < zs - 0.3; z += 1.2) b.quad([mid - 2, FORD_Y + 0.012, z + 0.06], [mid + 2, FORD_Y + 0.012, z + 0.06], [mid + 2, FORD_Y + 0.012, z - 0.06], [mid - 2, FORD_Y + 0.012, z - 0.06], [0, 1, 0], 0x4f4a44);
    // out of the mouth and down onto the shelf
    slab(b, [mid, FORD_Y, zs], [mid, Y.shelf + 0.045, l.z1 + 0.6], 2, 0.4, SETT);
    // boulders in the pool and along its walls
    for (const [x, z, s] of [[l.x0 + 1.3, l.z0 + 2.5, 1.2], [l.x0 + 1.0, l.z1 - 2.8, 0.9], [l.x1 - 1.2, l.z0 + 3.2, 1.0], [l.x1 - 1.6, l.z1 - 2.2, 0.7]]) {
      solid(b, x - s, F - 0.2, z - s * 0.8, x + s, F + s * 0.9 + 0.3, z + s * 0.8, R() > 0.5 ? ROCK : ROCK_LIGHT, 'NESWT');
    }
    // outcrops on its side walls, climbing to the rim
    for (const [x, dir] of [[l.x0, 1], [l.x1, -1]] as const) {
      for (let i = 0; i < 3; i++) {
        const z = l.z0 + 1.2 + i * 2.4 + R(), y0 = F + 1.5 + R() * 2.5, reach = 0.4 + R() * 0.5;
        solid(b, dir > 0 ? x - 0.3 : x - reach, y0, z - 0.9, dir > 0 ? x + reach : x + 0.3, y0 + 1.2 + R() * 1.5, z + 0.9, i % 2 ? ROCK_LIGHT : ROCK);
      }
      solid(b, dir > 0 ? x - 1.6 : x - 0.4, Y.crest - 0.8, l.z0 - 0.5, dir > 0 ? x + 0.4 : x + 1.6, Y.crest + 0.8, l.z1 - 0.4, ROCK);
    }
  }

  // --- the stream from the lip back north to a small pond on the hill
  {
    const line: P2[] = [[mid, FALL_Z], [mid - 0.1, l.z0 - 0.6], [mid - 0.8, l.z0 - 2.4], [mid - 1.6, l.z0 - 4.0], [mid - 2.3, l.z0 - 5.4]];
    const pond = { x: mid - 3.0, z: l.z0 - 7.2, r: 2.1 };
    laid(b, line.slice(1), 0.85, 0x2f3a34, 0.035, 1.2, Y.crest);
    const band: P2[] = [];
    const side = (i: number): P2 => {
      const a = line[Math.max(0, i - 1)], c = line[Math.min(line.length - 1, i + 1)], dx = c[0] - a[0], dz = c[1] - a[1], ln = Math.hypot(dx, dz) || 1;
      return [-dz / ln, dx / ln];
    };
    line.forEach((p, i) => band.push([p[0] + side(i)[0] * 0.6, p[1] + side(i)[1] * 0.6]));
    for (let i = line.length - 1; i >= 0; i--) band.push([line[i][0] - side(i)[0] * 0.6, line[i][1] - side(i)[1] * 0.6]);
    const ring = (r: number, n = 12): P2[] => Array.from({ length: n }, (_, i): P2 => [pond.x + Math.cos((i / n) * PI * 2) * r, pond.z + Math.sin((i / n) * PI * 2) * r * 0.8]);
    b.quad([pond.x - pond.r - 0.3, Y.crest + 0.045, pond.z + pond.r], [pond.x + pond.r + 0.3, Y.crest + 0.045, pond.z + pond.r], [pond.x + pond.r + 0.3, Y.crest + 0.045, pond.z - pond.r], [pond.x - pond.r - 0.3, Y.crest + 0.045, pond.z - pond.r], [0, 1, 0], 0x2f3a34);
    waterOf(k, [{ pts: band, y: Y.crest + 0.06 }, { pts: ring(pond.r), y: Y.crest + 0.08 }], WATER_STREAM);
    // stones on its banks and round the pond
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * PI * 2 + 0.3, x = pond.x + Math.cos(a) * (pond.r + 0.2), z = pond.z + Math.sin(a) * (pond.r + 0.2) * 0.8, s = 0.25 + R() * 0.25;
      solid(b, x - s, Y.crest - 0.05, z - s, x + s, Y.crest + s * 0.9, z + s, R() > 0.5 ? STONE_LIGHT : ROCK_LIGHT, 'NESWT');
    }
    for (let i = 1; i < line.length - 1; i++) {
      for (const s of [-1, 1]) {
        const x = line[i][0] + side(i)[0] * 0.95 * s, z = line[i][1] + side(i)[1] * 0.95 * s, r = 0.2 + R() * 0.2;
        solid(b, x - r, Y.crest - 0.05, z - r, x + r, Y.crest + r, z + r, ROCK_LIGHT, 'NESWT');
      }
    }
  }

  // --- the culvert's mouth in the river wall south of the cove, where the pool drains
  {
    const z = -67, cx = mid, half = 1.2, spring = 0.4;
    b.quad([cx - half, Y.water, z + 0.04], [cx + half, Y.water, z + 0.04], [cx + half, spring + half, z + 0.04], [cx - half, spring + half, z + 0.04], [0, 0, 1], DARK);
    pointedArch(b, cx, z, z + 0.4, half, half, spring, spring + half + 0.7, STONE_LIGHT, STONE_DARK, 4);
    for (const s of [-1, 1]) solid(b, cx + s * half - (s > 0 ? 0 : 0.6), Y.water - 0.3, z, cx + s * half + (s > 0 ? 0.6 : 0), spring + half + 0.7, z + 0.4, STONE_LIGHT, 'NESWT');
    solid(b, cx - half - 0.7, spring + half + 0.7, z, cx + half + 0.7, spring + half + 0.95, z + 0.5, STONE_TRIM, 'NESWTB');
  }
  k.lights.push({ x: mid, z: l.z0 + 2.5, r: 8, color: '#9ad0ff', k: 0.45 });
}

// ---------------------------------------------------------------------------
// The forecourt
// ---------------------------------------------------------------------------

function forecourt(k: Build, l: Lot): void {
  const b = k.b, y = l.base + 0.04;
  b.quad([l.x0 + 0.2, y, l.z1 - 0.2], [l.x1 - 0.2, y, l.z1 - 0.2], [l.x1 - 0.2, y, l.z0 + 0.2], [l.x0 + 0.2, y, l.z0 + 0.2], [0, 1, 0], GRAVEL);
  // a low kerb round it
  for (const [x0, z0, x1, z1] of [[l.x0, l.z0, l.x1, l.z0 + 0.2], [l.x0, l.z1 - 0.2, l.x1, l.z1], [l.x0, l.z0, l.x0 + 0.2, l.z1], [l.x1 - 0.2, l.z0, l.x1, l.z1]]) {
    b.box(x0, l.base - 0.1, z0, x1, l.base + 0.16, z1, TRIM, { faces: 'NESWT' });
  }
  // a low fountain at its west side: a basin, a bowl on a stem
  const fx = l.x0 + 2.3, fz = (l.z0 + l.z1) / 2;
  b.cyl(fx, fz, l.base, l.base + 0.55, 1.75, 1.75, 10, TRIM, { cap: false });
  b.cyl(fx, fz, l.base + 0.4, l.base + 0.47, 1.6, 1.6, 10, 0x5d8aa0);
  b.cyl(fx, fz, l.base + 0.4, l.base + 1.3, 0.25, 0.18, 6, TRIM);
  b.cyl(fx, fz, l.base + 1.3, l.base + 1.55, 0.35, 0.75, 8, TRIM, { cap: 0x5d8aa0 });
  k.glows.push({ x: fx, y: l.base + 1.75, z: fz, sx: 0.2, sy: 0.35, sz: 0.2, color: '#cfefff' });
  // lamps at its two back corners
  for (const x of [l.x0 + 0.7, l.x1 - 0.7]) {
    b.beam([x, l.base, l.z0 + 0.7], [x, l.base + 3.2, l.z0 + 0.7], 0.12, 0.08, IRON_DARK);
    gasLamp(k, x, l.base + 3.2, l.z0 + 0.7, 0, SODIUM);
  }
}

// ---------------------------------------------------------------------------
// The Kane Memorial Bridge
// ---------------------------------------------------------------------------

function kaneBridge(k: Build, l: Lot): void {
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
  const x = SPUR.x0, zc = CREST.cliff + 2, y = Y.shelf, half = 1.8, spring = 2.4, top = 5.2;
  b.moved(x, y, zc, PI / 2, () => {
    // in this frame +z is west, out of the rock: lz 0 is the rock's face, and the portal stands out to lz 0.8
    b.quad([-half, 0, 0.05], [half, 0, 0.05], [half, spring + half, 0.05], [-half, spring + half, 0.05], [0, 0, 1], DARK, { win: interior(0.3) });
    pointedArch(b, 0, 0.3, 0.8, half, half, spring, top, STONE, STONE_DARK, 5);
    solid(b, -2.0, 0, 0.1, -half, top, 0.8, STONE, 'NESWT');
    solid(b, half, 0, 0.1, 2.15, top, 0.8, STONE, 'NESWT');
    solid(b, -2.15, top, 0.0, 2.3, top + 0.4, 0.95, STONE_TRIM, 'NESWTB');
    // the keystone, and the old date-stone's blank panel over it
    solid(b, -0.25, spring + half - 0.15, 0.8, 0.25, spring + half + 0.45, 0.9, STONE_TRIM, 'NESWT');
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

/** The gates on stone piers, the lodge beside them, and the drive up the hill's east slope to the forecourt. */
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
  // the name, on a board beside the gates
  nameBoard(k, 'bristol-manor', x + 1.5, z + 3.9, y);

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

  // the drive: north from the gates, round the hill's east foot, and west up its slope to the forecourt
  laid(b, DRIVE, 1.6, GRAVEL, 0.08, 1.4);
}

/** The drive's middle line, from the gates to the forecourt. */
const DRIVE: P2[] = [[GATES.x, GATES.z - 0.6], [GATES.x + 0.4, -83.0], [100.6, -85.2], [101.0, -89.5], [99.8, -94.5], [94.8, -98.6], [87.5, -100.6], [76, -101.1], [lotOf('forecourt').x1 - 0.2, -101.0]];

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
  const x = -18, z = CREST.cliff + 0.03, y = Y.shelf;
  b.quad([x - 0.5, y + 0.5, z], [x + 0.45, y + 0.5, z], [x + 0.3, y + 2.9, z], [x - 0.35, y + 2.9, z], [0, 0, 1], DARK);
  tri(b, [x - 0.35, y + 2.9, z], [x + 0.3, y + 2.9, z], [x + 0.05, y + 3.5, z], [0, 0, 1], DARK);
  tri(b, [x - 0.5, y + 0.5, z], [x + 0.45, y + 0.5, z], [x - 0.1, y + 0.1, z], [0, 0, 1], DARK);
  for (const [a, c, h] of [[-1.6, -0.5, 3.4], [0.45, 1.4, 2.8]]) solid(b, x + a, y - 0.1, z - 0.03, x + c, y + h, z + 0.45, ROCK_LIGHT, 'NESWT');
}

/** The woods on the hill's west end, its east end and its back: dark slender trees on the ground as built, kept under the ceiling. */
function woods(k: Build): void {
  const R = rng(0x30d5);
  const plant = (x: number, z: number, s: number): void => {
    const y = landAt(x, z);
    if (y < Y.shelf + 0.3 || z > CREST.cliff - 1.5) return;
    if (!open(x, z, 1.0)) return;
    if (toDrive(x, z) < 3) return;
    const room = Math.min(ceilingAt(x, z) - 0.3, underBoards(x, z) + y) - y, size = Math.min(s, room / 9);
    if (size < 0.28) return;
    k.tree(x, z, size, true, y);
  };
  // the west end: round the cove, its pond and its stream, and clear of the lawn
  for (let i = 0; i < 40; i++) {
    const x = -21.5 + R() * 15.5, z = -112 + R() * 25, s = 0.7 + R() * 0.5;
    if (x > CREST.cove.x0 - 2 && x < CREST.cove.x1 + 1 && z > CREST.cove.z0 - 8.5) continue;
    plant(x, z, s);
  }
  // the east end, round the drive
  for (let i = 0; i < 60; i++) plant(66 + R() * 35, -112 + R() * 25, 0.7 + R() * 0.55);
  // the back of the hill, behind the Manor, low under the ceiling
  for (let i = 0; i < 30; i++) plant(-6 + R() * 72, -112.6 + R() * 4.4, 0.5);
}

/** Whatever is not one of the plan's lots. */
export function extras(k: Build): void {
  oldTunnel(k.b);
  boathouse(k);
  gatesAndDrive(k);
  riverParapet(k);
  cleft(k.b);
  woods(k);
  // a few people: a visitor at the lodge, two on the gravel by the gates
  for (const [x, z] of [[GATES.x - 7, GATES.z + 3.2], [GATES.x + 4.6, GATES.z + 3.6], [GATES.x + 5.6, GATES.z + 3.3]]) if (open(x, z, 0.6)) k.person(x, z, Y.shelf);
}

/** A model for each lot this file builds, by the lot's id. */
export const MODELS: Record<string, Model> = {
  manor,
  batcave,
  cove,
  forecourt,
  'kane-bridge': kaneBridge,
};

/** Lots that are built as part of another lot's model or by `extras`, and so get no box either. */
export const COVERS: string[] = [];
