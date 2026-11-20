// The north shore of Blackwater Bay along the Rosby road, from King's
// Landing's Iron Gate to Rook's Rest: Rosby, Stokeworth, a fishing village,
// Duskendale and Rook's Rest, the farmed country between them, and beyond the
// road's end Crackclaw Point and Claw Isle.
//
// From the books, as the research note and the wikis give them: the Rosby
// road runs along the bay from the Iron Gate through Rosby to Duskendale.
// Rosby is a small castle with a village of wattle-and-daub huts round it.
// Stokeworth is a castle beyond it on the same road, which yielded to Visenya
// once Vhagar's fire caught its roofs, long since mended. Duskendale is the
// bay's second port, its strong walls pale in the dawn, its streets cobbled,
// a market at its gate, and over its harbour the Darklyns' castle, the Dun
// Fort: a squat square castle of stone with great round towers. Rook's Rest
// stands on the shore beyond it. Crackclaw Point is the bay's northern arm,
// of pines, bogs and hills, whose clans keep their own halls. Claw Isle, off
// the Point, is House Celtigar's castle on its rock.
//
// The looks of Rosby, Stokeworth, Rook's Rest and Claw Isle's castle were
// not found, so each is this tile's own drawing, the three on the road each
// of a character of its own: Rosby a square keep over a walled yard,
// Stokeworth a round tower-house with its hall and a walled orchard, Rook's
// Rest a tall keep behind a gate of two drum towers, with rooks round it. No
// arms are flown but plain colours. It is 129 AC: nothing has burned or
// fallen, and nothing shows what is to come. Nothing is taken from the
// television series.
//
// Every place and size comes from plan.ts.

import * as THREE from 'three';
import { Smoke } from '../../engine/effects';
import { NO_WIN, interior, rng, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { area, flat, oval, rect, type P2 as GP2 } from '../../engine/ground';
import { figure, lathe, wheel, type Dress } from '../../engine/parts';
import { face3, prism, slab, type XZ } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import { drawField, field, heightOn, type Field } from '../../engine/terrain';
import type { Build } from '../../engine/tile';
import { landAt } from './land';
import {
  DAUB, DOOR, HOUSE_WIN, PLASTER, ROOF, STONE, TIMBER, TIMBER_DARK, TO_VIEW,
  banner, brazier, doorway, fire, nameBoard, nameSign, roundTower, squareTower,
} from './look';
import type { Model } from './models';
import { ISLANDS, LANE, ROADS, SHORE, TURNS, inside, lotOf, type P2 } from './plan';
import { MIDDLES } from './roads';
import { toLine, toRoad, underBoards } from './space';

// ---------------------------------------------------------------------------
// Colours, and what this file's things share
// ---------------------------------------------------------------------------

const SH = STONE.shore, SHS = STONE.shoreShade;
/** Duskendale's town walls: a pale stone that glows pale before the dawn. Not in look.ts. */
const CHALK = 0xd8d1bf, CHALK_SHADE = 0xbab29f;
/** The Dun Fort's dun stone: a dull grey-brown, warmer than the shore's castles. Not in look.ts. */
const DUN = 0x9f8d6e, DUN_SHADE = 0x84745a;
/** Claw Isle's sea-worn stone. */
const SEA = STONE.sea, SEAS = STONE.seaShade;
/** Arrow slits: dark, and warm where a lamp burns behind them, as walls.ts has them. */
const SLIT = 0x3a2b20, SLIT_LIT = 0x5e3d20, LAMPLIT: WinSpec = interior(3.2);
/** The shadowed stone under an arch. */
const SOFFIT = 0x7d7262;
const SHINGLE = 0x9d968a, SHINGLE_DARK = 0x857e72, NETS = 0x6c6a4c, HULL = 0x6b4f36, HULL_DARK = 0x3b2e22;
const THATCH = ROOF.thatch, HEDGE = 0x557f3e, HEDGE_TOP = 0x62904a;
const FISH = 0xb7c3c6, ROPE = 0xd8ccaa, ROCK_GREY = 0x6f6a63;
/** Plain colours for banners, as no house's arms here were checked: each castle its own pair. */
const PLAIN = {
  rosby: [0x7a5a3c, 0xe2d6b8, 0x7a5a3c],
  stokeworth: [0x55704a, 0xe2d6b8, 0x55704a],
  duskendale: [0x5a5048, 0xd8cbb0, 0x5a5048],
  rooks: [0x3b3a40, 0xd9d4c8, 0x3b3a40],
  claw: [0x6d7371, 0xeceae4, 0x6d7371],
};
const SKIN = 0xe8c4a0;
/** A man-at-arms of the castles here, in a plain surcoat and a steel cap. */
const GUARD: Dress = { coat: 0x6a5a48, legs: 0x3a3632, hat: 0xa8afb6, hatH: 0.3 };

/** Sign ids: each begins with this file's name. */
const SIGN = {
  rosby: 'north-shore-rosby', stokeworth: 'north-shore-stokeworth', duskendale: 'north-shore-duskendale',
  rooks: 'north-shore-rooks-rest', crackclaw: 'north-shore-crackclaw-point', claw: 'north-shore-claw-isle', fish: 'north-shore-fish',
};

/** How far a thing must stand from a road's middle: the road's 4, and 1 beyond it, and a little for the rounded corners. */
const ROAD_CLEAR = LANE + 1.4;
/** Whether a place is clear of every road and ring, with `m` to spare. */
const clearOfRoad = (x: number, z: number, m = 0): boolean => toRoad(x, z) >= ROAD_CLEAR + m;

/** The Rosby road's middle at a place along it, by x: straight between its corners, as the plan gives them. */
function roadZ(x: number): number {
  const r = ROADS.rosby;
  for (let i = 0; i + 1 < r.length; i++) {
    const [ax, az] = r[i], [bx, bz] = r[i + 1];
    if (x >= ax && x <= bx) return az + ((bz - az) * (x - ax)) / (bx - ax);
  }
  return x < r[0][0] ? r[0][1] : r[r.length - 1][1];
}

/** The Rosby road's middle as it is laid, its corners rounded, sampled once the roads are built: [x, z] by x. */
let LAID: P2[] = [];
/** The Rosby road's middle at a place along it, by x, as it is laid: the plan's line where the road is not yet known. */
function roadMid(x: number): number {
  if (LAID.length === 0 && MIDDLES.rosby) {
    const p = MIDDLES.rosby, v = new THREE.Vector3();
    for (let s = 0; s <= p.length; s += 0.25) {
      p.at(s, v);
      LAID.push([v.x, v.z]);
    }
    LAID.sort((a, c) => a[0] - c[0]);
  }
  for (let i = 0; i + 1 < LAID.length; i++) {
    const [ax, az] = LAID[i], [bx, bz] = LAID[i + 1];
    if (x >= ax && x <= bx) return bx - ax < 1e-6 ? az : az + ((bz - az) * (x - ax)) / (bx - ax);
  }
  return roadZ(x);
}

/** Smoke that rises from the places here: gathered as they are built, and set going once. */
const SMOKES: { at: V3; size: number; shade: number; every: number }[] = [];
/** Chimneys and roof holes that may smoke. */
const smoke = (x: number, y: number, z: number, size = 0.42, shade = 0.8, every = 0.55): void => void SMOKES.push({ at: [x, y, z], size, shade, every });

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

/** An arrow slit in a wall that faces (nx, nz): a dark slit a hair proud of the face, warm at night if lit. */
function slit(b: GeoBuilder, x: number, y: number, z: number, nx: number, nz: number, lit: boolean, h = 1.0, w = 0.26): void {
  const ax = -nz, az = nx, o = 0.03;
  const p = (s: number, v: number): V3 => [x + nx * o + ax * s, y + v, z + nz * o + az * s];
  b.quad(p(-w / 2, 0), p(w / 2, 0), p(w / 2, h), p(-w / 2, h), [nx, 0, nz], lit ? SLIT_LIT : SLIT, lit ? { win: LAMPLIT } : {});
}

/** A window of a house or a hall that faces (nx, nz): dark by day, lamplit at night if lit. */
function pane(b: GeoBuilder, x: number, y: number, z: number, nx: number, nz: number, w: number, h: number, lit: number): void {
  const ax = -nz, az = nx, o = 0.03;
  const p = (s: number, v: number): V3 => [x + nx * o + ax * s, y + v, z + nz * o + az * s];
  b.quad(p(-w / 2, 0), p(w / 2, 0), p(w / 2, h), p(-w / 2, h), [nx, 0, nz], 0x3a3029, lit > 0 ? { win: interior(lit) } : {});
}

/** Slits round a round tower's shaft: one in each of `n` faces, high and low by turns. */
function towerSlits(b: GeoBuilder, x: number, z: number, r: number, sides: number, lo: number, hi: number, seed: number, skip?: (nx: number, nz: number) => boolean): void {
  const apothem = r * Math.cos(Math.PI / sides);
  for (let i = 0; i < sides; i++) {
    const a = ((i + 0.5) / sides) * Math.PI * 2 + Math.PI / sides, nx = Math.cos(a), nz = Math.sin(a);
    if (skip?.(nx, nz)) continue;
    // the engine's cyl starts its first face at phase π/sides: this is the middle of face i
    slit(b, x + nx * apothem, i % 2 ? lo : hi, z + nz * apothem, nx, nz, (i + seed) % 3 === 0);
  }
}

/** Slits in the four faces of a square block, `half` from its middle each way. */
function boxSlits(b: GeoBuilder, x: number, z: number, hx: number, hz: number, ys: number[], seed: number, faces = 'NESW'): void {
  let i = seed;
  for (const y of ys) {
    if (faces.includes('S')) slit(b, x, y, z + hz, 0, 1, i++ % 3 === 0);
    if (faces.includes('E')) slit(b, x + hx, y, z, 1, 0, i++ % 3 === 1);
    if (faces.includes('N')) slit(b, x, y, z - hz, 0, -1, i++ % 3 === 2);
    if (faces.includes('W')) slit(b, x - hx, y, z, -1, 0, i++ % 3 === 0);
  }
}

/**
 * A stretch of curtain wall between two points, `top` high to its walk, with
 * merlons along its outer edge only (on the side `out` points to): cheaper
 * than look.ts's rampart, which has them on both edges, and as closed.
 */
function curtain(b: GeoBuilder, a: P2, c: P2, top: number, color: number, shade: number, out: 1 | -1, o: { thick?: number; y0?: number; merlon?: number; spacing?: number } = {}): void {
  const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dz, dx), half = (o.thick ?? 1.2) / 2, y0 = o.y0 ?? 0;
  b.moved((a[0] + c[0]) / 2, 0, (a[1] + c[1]) / 2, yaw, () => {
    b.box(-len / 2, y0, -half, len / 2, top, half, color, { top: shade, faces: 'NSTEW' });
  });
  const mh = o.merlon ?? 0.75, n = Math.max(1, Math.round(len / (o.spacing ?? 1.8))), nx = -Math.sin(yaw), nz = Math.cos(yaw);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = a[0] + dx * t, z = a[1] + dz * t;
    b.obox(x + nx * out * (half - 0.18), top + mh / 2, z + nz * out * (half - 0.18), (len / n) * 0.3, mh / 2, 0.18, yaw, color, { top: shade });
  }
}

/** A banner on a staff in plain colours. */
function flag(b: GeoBuilder, x: number, z: number, y: number, colors: number[], staff = 3.4, size = 0.8): void {
  banner(b, x, z, y, 'none', staff, size, colors);
}

/** A pennant: a staff and a long narrow triangle of cloth flying east, seen from both sides. */
function pennant(b: GeoBuilder, x: number, z: number, y: number, staff: number, color: number): void {
  b.cyl(x, z, y, y + staff, 0.08, 0.05, 4, 0xd6d3cc, { cap: false });
  const t = y + staff - 0.1;
  for (const s of [-1, 1]) face3(b, [x + 0.06, t, z + s * 0.02], [x + 0.06, t - 0.7, z + s * 0.02], [x + 2.2, t - 0.38, z + s * 0.02], [0, 0, s], color);
}

/**
 * A round-headed archway through a wall that runs along x, in a frame where
 * the wall's faces are at z0 and z1: the wall above the arch on both faces up
 * to `top`, the piers' inner faces, and the soffit. The way is `w` wide and
 * its sides go straight up to `spring`; the arch rises `rise` over that.
 */
function arch(b: GeoBuilder, cx: number, z0: number, z1: number, w: number, spring: number, rise: number, top: number, color: number, n = 8): void {
  const h = w / 2;
  const at = (i: number): [number, number] => {
    const a = Math.PI * (1 - i / n);
    return [cx + Math.cos(a) * h, spring + Math.sin(a) * rise];
  };
  for (let i = 0; i < n; i++) {
    const [xa, ya] = at(i), [xb, yb] = at(i + 1);
    for (const [z, nz] of [[z0, -1], [z1, 1]] as [number, number][]) b.quad([xa, ya, z], [xb, yb, z], [xb, top, z], [xa, top, z], [0, 0, nz], color);
    const m = Math.PI * (1 - (i + 0.5) / n), nx = -Math.cos(m) / h, ny = -Math.sin(m) / rise, l = Math.hypot(nx, ny);
    b.quad([xa, ya, z0], [xb, yb, z0], [xb, yb, z1], [xa, ya, z1], [nx / l, ny / l, 0], SOFFIT);
  }
  // the inside faces of the piers, up to where the arch springs
  b.quad([cx - h, 0, z1], [cx - h, 0, z0], [cx - h, spring, z0], [cx - h, spring, z1], [1, 0, 0], color);
  b.quad([cx + h, 0, z0], [cx + h, 0, z1], [cx + h, spring, z1], [cx + h, spring, z0], [-1, 0, 0], color);
}

/** A pitched roof over a rectangle, sitting on its walls' tops at `y`, its ridge `rise` over them along x or z, its eaves reaching `eave` out; a gable wall closes each end. */
function roof(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, rise: number, color: number, wall: number, alongZ: boolean, eave = 0.22): void {
  if (alongZ) {
    const xc = (x0 + x1) / 2, half = (x1 - x0) / 2, drop = (eave * rise) / half, len = Math.hypot(half, rise), a = z0 - eave, c = z1 + eave;
    b.quad([x0 - eave, y - drop, c], [x0 - eave, y - drop, a], [xc, y + rise, a], [xc, y + rise, c], [-rise / len, half / len, 0], color);
    b.quad([x1 + eave, y - drop, a], [x1 + eave, y - drop, c], [xc, y + rise, c], [xc, y + rise, a], [rise / len, half / len, 0], color);
    face3(b, [x0, y, z0], [x1, y, z0], [xc, y + rise, z0], [0, 0, -1], wall);
    face3(b, [x0, y, z1], [x1, y, z1], [xc, y + rise, z1], [0, 0, 1], wall);
  } else {
    const zc = (z0 + z1) / 2, half = (z1 - z0) / 2, drop = (eave * rise) / half, len = Math.hypot(half, rise), a = x0 - eave, c = x1 + eave;
    b.quad([a, y - drop, z0 - eave], [c, y - drop, z0 - eave], [c, y + rise, zc], [a, y + rise, zc], [0, half / len, -rise / len], color);
    b.quad([c, y - drop, z1 + eave], [a, y - drop, z1 + eave], [a, y + rise, zc], [c, y + rise, zc], [0, half / len, rise / len], color);
    face3(b, [x0, y, z0], [x0, y, z1], [x0, y + rise, zc], [-1, 0, 0], wall);
    face3(b, [x1, y, z0], [x1, y, z1], [x1, y + rise, zc], [1, 0, 0], wall);
  }
  // the underside of the eaves, where they reach past the walls, so that nothing is open from below
  if (eave > 0.05) {
    const lo = y - (eave * rise) / ((alongZ ? x1 - x0 : z1 - z0) / 2);
    if (alongZ) for (const [p, q] of [[x0 - eave, x0], [x1, x1 + eave]]) b.quad([p, lo, z0 - eave], [q, lo, z0 - eave], [q, lo, z1 + eave], [p, lo, z1 + eave], [0, -1, 0], color);
    else for (const [p, q] of [[z0 - eave, z0], [z1, z1 + eave]]) b.quad([x0 - eave, lo, q], [x1 + eave, lo, q], [x1 + eave, lo, p], [x0 - eave, lo, p], [0, -1, 0], color);
  }
}

/**
 * A cottage or a small house: walls `wall` high with windows that glow at
 * night, a door in its front, and a steep pitched roof whose ridge stands at
 * `ridge`. Its front faces `face` (N, E, S or W); its ridge runs along its
 * longer side. A chimney if `chimney`.
 */
function cottage(k: Build, x0: number, z0: number, x1: number, z1: number, y: number, wall: number, ridge: number, o: { face: 'N' | 'E' | 'S' | 'W'; walls?: number; roof?: number; chimney?: boolean; win?: boolean; lit?: number; along?: 'x' | 'z' }): void {
  const b = k.b, W = o.walls ?? DAUB, R = o.roof ?? THATCH, alongZ = (o.along ?? (z1 - z0 > x1 - x0 ? 'z' : 'x')) === 'z';
  b.box(x0, y - 0.3, z0, x1, y + wall, z1, W, { faces: 'NESW', win: o.win ? { ...HOUSE_WIN, storey: Math.max(1.6, wall), lit: o.lit ?? 0.5 } : undefined, seed: x0 * 0.31 + z0 * 0.17 });
  roof(b, x0, z0, x1, z1, y + wall, ridge - wall, R, W, alongZ, 0.2);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, dh = Math.min(1.55, wall - 0.15);
  const n = o.face === 'N' ? [0, -1] : o.face === 'S' ? [0, 1] : o.face === 'E' ? [1, 0] : [-1, 0];
  const fx = o.face === 'E' ? x1 : o.face === 'W' ? x0 : cx, fz = o.face === 'S' ? z1 : o.face === 'N' ? z0 : cz;
  const ax = -n[1], az = n[0], dw = 0.42, d = 0.03;
  b.quad([fx + ax * -dw + n[0] * d, y, fz + az * -dw + n[1] * d], [fx + ax * dw + n[0] * d, y, fz + az * dw + n[1] * d], [fx + ax * dw + n[0] * d, y + dh, fz + az * dw + n[1] * d], [fx + ax * -dw + n[0] * d, y + dh, fz + az * -dw + n[1] * d], [n[0], 0, n[1]], DOOR);
  if (o.chimney) {
    const chx = alongZ ? cx : x1 - 0.55, chz = alongZ ? z0 + 0.55 : cz, top = ridge + 0.35;
    b.box(chx - 0.22, ridge - 1.0, chz - 0.22, chx + 0.22, top, chz + 0.22, 0x8e7e6b, { top: 0x3b3633 });
    smoke(chx, top + 0.15, chz, 0.36, 0.82, 0.8);
  }
}

function barrel(b: GeoBuilder, x: number, z: number, y = 0, r = 0.3): void {
  b.cyl(x, z, y, y + r * 2.5, r, r, 6, 0x7a5a3a, { cap: 0x5a4128 });
}
function crate(b: GeoBuilder, x: number, z: number, s = 0.7, y = 0): void {
  b.box(x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2, 0x9a7a52, { top: 0xa98a60 });
}
function bollard(b: GeoBuilder, x: number, z: number, y = 0): void {
  b.cyl(x, z, y, y + 0.6, 0.2, 0.17, 6, 0x4d4f52, { cap: 0x3a3b3e });
}
/** A basket of the catch, or of something else of colour `goods`. */
function basket(b: GeoBuilder, x: number, z: number, y: number, goods: number): void {
  b.cyl(x, z, y, y + 0.42, 0.3, 0.36, 6, 0x9a7a4a, { cap: goods });
}

/**
 * A small open boat drawn up on the shingle, its bow along `yaw`: a hull with
 * a pointed bow, dark inside, a thwart across it; or upturned, showing its keel.
 */
function boat(b: GeoBuilder, x: number, z: number, y: number, yaw: number, len: number, color = HULL, upturned = false): void {
  b.moved(x, y, z, yaw, () => {
    const h = len / 2, w = len * 0.2, rail = 0.5;
    const plan: P2[] = [[h, 0], [h * 0.45, w], [-h * 0.7, w * 0.95], [-h, w * 0.6], [-h, -w * 0.6], [-h * 0.7, -w * 0.95], [h * 0.45, -w]];
    if (upturned) {
      prism(b, plan as XZ[], 0, rail, color, { top: color });
      b.box(-h * 0.9, rail, -0.05, h * 0.9, rail + 0.07, 0.05, TIMBER_DARK);
      return;
    }
    plan.forEach((p, i) => {
      const q = plan[(i + 1) % plan.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      let nx = (q[1] - p[1]) / l, nz = -(q[0] - p[0]) / l;
      if (nx * (p[0] + q[0]) + nz * (p[1] + q[1]) < 0) { nx = -nx; nz = -nz; }
      b.quad([p[0] * 0.84, 0, p[1] * 0.7], [q[0] * 0.84, 0, q[1] * 0.7], [q[0], rail, q[1]], [p[0], rail, p[1]], [nx, -0.3, nz], color);
    });
    flat(b, plan.map(([px, pz]): GP2 => [px * 0.92, pz * 0.86]), rail - 0.1, HULL_DARK);
    b.box(-0.12, rail - 0.22, -w * 0.86, 0.12, rail - 0.06, w * 0.86, TIMBER);
  });
}

/** A net hung to dry between two poles, sagging between them, seen from both sides. */
function net(b: GeoBuilder, a: P2, c: P2, y: number, h: number): void {
  for (const p of [a, c]) b.cyl(p[0], p[1], y, y + h, 0.07, 0.06, 4, TIMBER_DARK, { cap: false });
  const dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = dz / l, nz = -dx / l, mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
  for (const s of [-1, 1]) {
    const o = s * 0.015, P = (px: number, py: number, pz: number): V3 => [px + nx * o, y + py, pz + nz * o], n: V3 = [nx * s, 0, nz * s];
    b.quad(P(a[0], h - 0.15, a[1]), P(mx, h - 0.4, mz), P(mx, 0.5, mz), P(a[0], 0.75, a[1]), n, NETS);
    b.quad(P(mx, h - 0.4, mz), P(c[0], h - 0.15, c[1]), P(c[0], 0.75, c[1]), P(mx, 0.5, mz), n, NETS);
  }
}

/** A rack for drying fish: two trestles and two poles across them, with fish hung from each pole. It runs along x. */
function fishRack(b: GeoBuilder, x0: number, x1: number, z: number, y: number): void {
  for (const x of [x0, x1]) {
    b.beam([x, y, z - 0.45], [x, y + 1.75, z], 0.05, 0.05, TIMBER_DARK);
    b.beam([x, y, z + 0.45], [x, y + 1.75, z], 0.05, 0.05, TIMBER_DARK);
  }
  for (const dz of [-0.22, 0.22]) {
    const hz = z + dz, hy = y + 1.55;
    b.box(x0, hy, hz - 0.04, x1, hy + 0.08, hz + 0.04, TIMBER, { faces: 'NSTB' });
    // the fish, in a row, each a slip of silver hung by its tail, seen from both sides
    const n = Math.round((x1 - x0) / 0.32);
    for (let i = 1; i < n; i++) {
      const fx = x0 + ((x1 - x0) * i) / n, col = i % 3 ? FISH : 0x9aa6a8;
      for (const s of [-1, 1]) face3(b, [fx - 0.09, hy - 0.05, hz + s * 0.03], [fx + 0.09, hy - 0.05, hz + s * 0.03], [fx, hy - 0.68, hz + s * 0.03], [0, 0, s], col);
    }
  }
}

/** A sheep, grazing with its head along (cos yaw, sin yaw). */
function sheep(b: GeoBuilder, x: number, z: number, y: number, yaw: number, wool = 0xf0ece2): void {
  b.obox(x, y + 0.42, z, 0.5, 0.36, 0.3, yaw, wool, { top: 0xf7f4ec, faces: 'B' });
  b.obox(x + Math.cos(yaw) * 0.6, y + 0.6, z + Math.sin(yaw) * 0.6, 0.18, 0.16, 0.14, yaw, 0x2b2626);
}

/** A goat: smaller, shaggy brown or white, with a pair of horns swept back. */
function goat(b: GeoBuilder, x: number, z: number, y: number, yaw: number, hide: number): void {
  const fx = Math.cos(yaw), fz = Math.sin(yaw);
  b.obox(x, y + 0.5, z, 0.42, 0.24, 0.2, yaw, hide, { faces: 'B' });
  b.obox(x, y + 0.14, z, 0.32, 0.14, 0.14, yaw, 0x3a302a);
  b.obox(x + fx * 0.52, y + 0.82, z + fz * 0.52, 0.14, 0.13, 0.11, yaw, hide);
  b.beam([x + fx * 0.5, y + 0.95, z + fz * 0.5], [x + fx * 0.32, y + 1.18, z + fz * 0.32], 0.035, 0.02, 0xd9cdb0);
}

/** A beast of the herd, its head along `yaw`. */
function cow(b: GeoBuilder, x: number, z: number, y: number, yaw: number, hide: number): void {
  const fx = Math.cos(yaw), fz = Math.sin(yaw);
  b.obox(x, y + 0.24, z, 0.62, 0.24, 0.24, yaw, 0x3a302a);
  b.obox(x, y + 0.84, z, 0.8, 0.38, 0.34, yaw, hide, { faces: 'B' });
  b.obox(x + fx * 0.98, y + 1.04, z + fz * 0.98, 0.22, 0.2, 0.17, yaw, hide);
}

/** A two-wheeled cart, its shafts along `yaw`, with sacks, barrels, hay or fish on it. */
function cart(b: GeoBuilder, x: number, z: number, y: number, yaw: number, load: 'sacks' | 'barrels' | 'hay' | 'fish'): void {
  b.moved(x, y, z, yaw, () => {
    b.box(-1.0, 0.72, -0.62, 1.0, 0.86, 0.62, 0x8a6a48, { faces: 'NESWTB', top: 0x9a7a52 });
    for (const s of [-1, 1]) b.box(-1.0, 0.86, s * 0.62 - (s > 0 ? 0.08 : 0), 1.0, 1.2, s * 0.62 + (s < 0 ? 0.08 : 0), 0x7a5a3a, { faces: 'NESWT' });
    wheel(b, 0, 0.62, -0.72, 0.62, 0.07, -1, 0x5a4532, 0x8a6a48);
    wheel(b, 0, 0.62, 0.72, 0.62, 0.07, 1, 0x5a4532, 0x8a6a48);
    for (const s of [-1, 1]) b.beam([0.95, 0.8, s * 0.5], [2.4, 0.05, s * 0.4], 0.05, 0.05, TIMBER);
    if (load === 'hay') b.box(-0.95, 0.86, -0.58, 0.95, 1.75, 0.58, 0xd2b866, { top: 0xdcc679, faces: 'NESWT' });
    else if (load === 'sacks') for (const [sx, sz] of [[-0.5, -0.25], [0.1, 0.22], [0.55, -0.2]]) b.box(sx - 0.3, 0.86, sz - 0.22, sx + 0.3, 1.3, sz + 0.22, 0xcdbb94, { top: 0xbfae88 });
    else if (load === 'fish') for (const sx of [-0.5, 0.2]) b.cyl(sx, 0, 0.86, 1.28, 0.3, 0.36, 6, 0x9a7a4a, { cap: FISH });
    else for (const [sx, sz] of [[-0.5, -0.28], [-0.5, 0.28], [0.2, 0]]) b.cyl(sx, sz, 0.86, 1.6, 0.26, 0.26, 6, 0x7a5a3a, { cap: 0x5a4128 });
  });
}

/** A well: a round kerb of stone, two posts, a beam with its bucket, and a little roof, under 3 high. */
function well(b: GeoBuilder, x: number, z: number, y: number, roofC: number): void {
  b.cyl(x, z, y, y + 0.8, 0.75, 0.75, 6, 0x9d9484, { cap: 0x2a3540 });
  for (const s of [-1, 1]) b.box(x + s * 0.62 - 0.07, y + 0.78, z - 0.07, x + s * 0.62 + 0.07, y + 2.05, z + 0.07, TIMBER_DARK, { faces: 'NESW' });
  slab(b, [x, y + 2.5, z], [x, y + 2.0, z - 0.6], 0.95, 0.05, roofC, { under: TIMBER });
  slab(b, [x, y + 2.5, z], [x, y + 2.0, z + 0.6], 0.95, 0.05, roofC, { under: TIMBER });
}

/** A haystack: a cone of hay with a rounded top. */
function haystack(b: GeoBuilder, x: number, z: number, y: number, s = 1): void {
  lathe(b, x, z, [[1.05 * s, y], [0.95 * s, y + 1.1 * s], [0.03, y + 2.2 * s]], 6, 0xcfae52);
}

/** A market stall: a counter with its wares, two posts at its back, and a sloping awning with its underside. Its front looks along `yaw`. */
function stall(b: GeoBuilder, x: number, z: number, yaw: number, y: number, cloth: number, goods: number): void {
  b.moved(x, y, z, yaw, () => {
    b.box(-0.35, 0, -0.75, 0.35, 0.85, 0.75, TIMBER, { top: 0x8a6a48 });
    b.box(-0.14, 0.85, -0.6, 0.16, 0.97, 0.6, goods, { faces: 'NESWT' });
    for (const s of [-1, 1]) b.beam([-0.45, 0, s * 0.68], [-0.45, 2.25, s * 0.68], 0.06, 0.06, TIMBER_DARK);
    slab(b, [-0.45, 2.25, 0], [0.75, 1.8, 0], 0.88, 0.05, cloth, { under: 0xe8dcc0 });
  });
}

/** A low hedge along a line. */
function hedge(b: GeoBuilder, a: P2, c: P2, y: number, h = 0.8): void {
  const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dz, dx);
  b.obox((a[0] + c[0]) / 2, y + h / 2 - 0.1, (a[1] + c[1]) / 2, len / 2, h / 2 + 0.1, 0.28, yaw, HEDGE, { top: HEDGE_TOP });
}

/** A rook: a black bird, perched with its wings folded, or in the air with them spread. */
function rook(b: GeoBuilder, x: number, y: number, z: number, yaw: number, flying: boolean): void {
  const c = Math.cos(yaw), s = Math.sin(yaw), ink = 0x232227;
  b.obox(x + c * 0.04, y + 0.14, z + s * 0.04, 0.3, 0.12, 0.1, yaw, ink, { faces: 'B' });
  if (!flying) return;
  // the wings, spread and a little raised, seen from above and below
  for (const side of [-1, 1]) {
    const root: V3 = [x - s * side * 0.08, y + 0.18, z + c * side * 0.08];
    const tipA: V3 = [x - s * side * 0.75 + c * 0.1, y + 0.36, z + c * side * 0.75 + s * 0.1];
    const tipB: V3 = [x - s * side * 0.6 - c * 0.22, y + 0.3, z + c * side * 0.6 - s * 0.22];
    face3(b, root, tipA, tipB, [0, 1, 0], ink);
    face3(b, root, tipA, tipB, [0, -1, 0], ink);
  }
}

/** A wayside shrine to the Seven: a seven-sided stone on a step, a carved post on it under a little cap, flowers on the step, and a candle at night. */
function shrine(k: Build, x: number, z: number, y: number): void {
  const b = k.b;
  b.cyl(x, z, y, y + 0.25, 0.85, 0.85, 7, 0xb9b2a0, { cap: 0xcfc8b6 });
  b.cyl(x, z, y + 0.25, y + 0.95, 0.55, 0.5, 7, 0xc9c2b0, { cap: 0xd8d1c0 });
  b.box(x - 0.13, y + 0.95, z - 0.13, x + 0.13, y + 2.05, z + 0.13, 0x8a6f4a, { faces: 'NESW' });
  for (const yy of [1.3, 1.7]) b.box(x - 0.17, y + yy, z - 0.17, x + 0.17, y + yy + 0.1, z + 0.17, 0x6b5136, { faces: 'NESWTB' });
  b.cyl(x, z, y + 2.05, y + 2.4, 0.3, 0.04, 7, 0x6b5136, { cap: false });
  b.box(x - 0.35, y + 0.25, z + 0.62, x + 0.35, y + 0.36, z + 0.78, 0xd94f6a, { top: 0xf2c14e });
  fire(k, x + 0.32, y + 1.07, z + 0.36, 0.06, 4);
}

/** A scarecrow: a post, a crossbar with a coat on it, a sacking head and a hat. */
function scarecrow(b: GeoBuilder, x: number, z: number, y: number): void {
  b.box(x - 0.07, y, z - 0.07, x + 0.07, y + 2.3, z + 0.07, TIMBER, { faces: 'NESW' });
  b.box(x - 0.9, y + 1.75, z - 0.06, x + 0.9, y + 1.87, z + 0.06, TIMBER, { faces: 'NESWTB' });
  b.box(x - 0.36, y + 1.05, z - 0.2, x + 0.36, y + 1.95, z + 0.2, 0x6a5a8a, { faces: 'NESWTB' });
  b.box(x - 0.22, y + 1.95, z - 0.2, x + 0.22, y + 2.4, z + 0.2, 0xd9c79a);
  b.cyl(x, z, y + 2.4, y + 2.75, 0.42, 0.2, 6, 0x5b4634, { cap: 0x4c3a2b });
}

/** A child: smaller than the tile's people, in a coat of some colour. */
function child(b: GeoBuilder, x: number, z: number, y: number, coat: number): void {
  b.box(x - 0.2, y, z - 0.13, x + 0.2, y + 0.55, z + 0.13, 0x4a4038, { faces: 'NESW' });
  b.box(x - 0.25, y + 0.55, z - 0.16, x + 0.25, y + 1.22, z + 0.16, coat);
  b.box(x - 0.17, y + 1.24, z - 0.17, x + 0.17, y + 1.58, z + 0.17, SKIN, { top: 0x5a3e28 });
}

/** Someone at work in a field: the tile's own figure, and a hoe beside them. */
function worker(k: Build, x: number, z: number, y: number, tool = true): void {
  k.person(x, z, y);
  if (tool) k.b.beam([x + 0.5, y, z + 0.3], [x + 0.75, y + 1.9, z + 0.05], 0.035, 0.035, 0x9a7a52);
}

/** A lantern on a post, lit at night, and its pool of light on the ground. */
function lanternPost(k: Build, x: number, z: number, y: number, h = 2.3, reach = 9): void {
  k.b.box(x - 0.09, y, z - 0.09, x + 0.09, y + h, z + 0.09, TIMBER_DARK, { faces: 'NESW' });
  k.b.box(x - 0.24, y + h, z - 0.24, x + 0.24, y + h + 0.42, z + 0.24, 0x4b4f57, { faces: 'NESWTB' });
  k.b.cyl(x, z, y + h + 0.42, y + h + 0.66, 0.3, 0.05, 4, 0x4b4f57, { phase: Math.PI / 4, cap: false });
  k.glows.push({ x, y: y + h + 0.21, z, sx: 0.36, sy: 0.3, sz: 0.36, color: '#ffe2ae' });
  k.lights.push({ x, z, r: reach, color: '#ffd9a0', k: 0.5 });
}

/**
 * A gate between two drum towers in a wall that runs along x at `z`: the
 * towers, the arch between them with its soffit, the walk over it with its
 * merlons, the doors standing open inside, torches either side outside, and a
 * guard at each side of the way. `out` is the side the gate looks out to.
 */
function towerGate(k: Build, gx: number, z: number, y: number, o: { apart: number; r: number; towerTop: number; walk: number; thick: number; w: number; spring: number; rise: number; color: number; shade: number; out: 1 | -1; sides?: number }): void {
  const b = k.b, h = o.thick / 2;
  for (const s of [-1, 1]) {
    roundTower(b, gx + s * o.apart, z, o.r, o.towerTop, o.color, { shade: o.shade, win: NO_WIN, sides: o.sides ?? 8, y0: y });
    // a slit in each tower, looking out, and one high in its far side
    slit(b, gx + s * o.apart, y + o.walk - 1.6, z + o.out * (o.r * 0.95), 0, o.out, s > 0);
    slit(b, gx + s * (o.apart + o.r * 0.95), y + o.walk + 0.2, z, s, 0, s < 0);
  }
  b.moved(gx, y, z, 0, () => arch(b, 0, -h, h, o.w, o.spring, o.rise, o.walk, o.color));
  b.box(gx - o.apart + 0.3, y + o.walk - 0.25, z - h, gx + o.apart - 0.3, y + o.walk, z + h, o.color, { top: o.shade, faces: 'T' });
  for (const mx of [-0.55, 0.55]) b.box(gx + mx - 0.28, y + o.walk, z + o.out * (h - 0.36) - 0.18, gx + mx + 0.28, y + o.walk + 0.72, z + o.out * (h - 0.36) + 0.18, o.color, { top: o.shade });
  // the doors, swung back against the sides of the way
  for (const s of [-1, 1]) {
    const x = gx + s * (o.w / 2 - 0.1);
    b.box(x - 0.08, y, z - o.out * h + o.out * 0.05 - 0.6, x + 0.08, y + o.spring - 0.05, z - o.out * h + o.out * 0.05 + 0.6, DOOR, { faces: 'NESWT' });
  }
  // the way through it, beaten earth a hair over the ground
  area(k, rect(gx - o.w / 2 + 0.05, z - h, gx + o.w / 2 - 0.05, z + h), 0xa8987c, y + 0.04);
  for (const s of [-1, 1]) {
    fire(k, gx + s * (o.apart - 0.55), y + o.spring + 0.6, z + o.out * (o.r * 0.95 + 0.15), 0.2, 7);
    figure(b, gx + s * (o.w / 2 + 0.5), z + o.out * (h + 0.75), y, GUARD);
  }
}

// ---------------------------------------------------------------------------
// Rosby: a square keep over a walled yard, its gate towards the road
// ---------------------------------------------------------------------------

/**
 * Rosby, a small castle on the road's north side: a tall square keep in its
 * north-west corner with its battlements at the lot's top, a curtain round a
 * small yard, a round tower at the north-east corner, and the gate between
 * two drum towers in the south wall, its east tower the yard's south-east
 * corner, looking out on the road. Slate and grey-brown stone.
 */
const rosby: Model = (k, l) => {
  const b = k.b, y = landAt((l.x0 + l.x1) / 2, (l.z0 + l.z1) / 2), r = rng(4401);
  const walk = 4.6, thick = 1.0, half = thick / 2;
  const X0 = l.x0 + 1.0, X1 = l.x1 - 1.4, Z0 = l.z0 + 1.4, Z1 = l.z1 - 1.4;
  // the keep, its battlements at the lot's top, on a plinth
  const kh = 2.3, kx = l.x0 + 0.4 + kh, kz = l.z0 + 0.4 + kh;
  b.box(kx - kh - 0.22, y - 0.3, kz - kh - 0.22, kx + kh + 0.22, y + 0.7, kz + kh + 0.22, SHS, { faces: 'NESWT' });
  squareTower(b, kx, kz, kh, l.top - 0.8, SH, { shade: SHS, win: NO_WIN, y0: y });
  boxSlits(b, kx, kz, kh, kh, [y + 2.4, y + 5.0, y + 7.1], 1);
  // its door, on its east face to the yard, warm at night
  doorway(b, kx + kh, y + 0.9, kz + 1.2, 1, 0, 0.9, 1.7, 1.4);
  b.box(kx + kh, y, kz + 0.6, kx + kh + 0.7, y + 0.9, kz + 1.8, SHS, { top: SH, faces: 'NEST' });
  flag(b, kx - 0.6, kz - 0.6, l.top - 0.8, PLAIN.rosby, 3.4, 0.85);

  // the curtain, its walk at `walk`, merlons on its outer edge; each stretch stops short of the one it meets
  const apart = 1.7, gx = X1 - apart;
  curtain(b, [kx + kh, Z0], [X1, Z0], y + walk, SH, SHS, -1, { thick });
  curtain(b, [X1, Z0], [X1, Z1], y + walk, SH, SHS, -1, { thick });
  curtain(b, [X0, kz + kh], [X0, Z1 - half], y + walk, SH, SHS, 1, { thick });
  curtain(b, [X0 - half, Z1], [gx - apart, Z1], y + walk, SH, SHS, 1, { thick });
  for (const [x, z, nx, nz] of [[(kx + kh + X1) / 2, Z0 - half, 0, -1], [X1 + half, (Z0 + Z1) / 2, 1, 0], [X0 - half, (kz + kh + Z1) / 2, -1, 0], [(X0 + gx) / 2 - 1, Z1 + half, 0, 1]] as [number, number, number, number][]) slit(b, x, y + 2.2, z, nx, nz, r() < 0.4);
  // the north-east tower, and the gate, whose east tower is the yard's south-east corner
  roundTower(b, X1, Z0, 1.1, y + walk + 1.7, SH, { shade: SHS, win: NO_WIN, sides: 8, y0: y });
  towerSlits(b, X1, Z0, 1.1, 8, y + 2.0, y + 4.4, 2, (nx, nz) => nx < -0.3 && nz > 0.3);
  towerGate(k, gx, Z1, y, { apart, r: 0.92, towerTop: y + walk + 1.9, walk, thick, w: 1.7, spring: 2.1, rise: 0.75, color: SH, shade: SHS, out: 1 });

  // the yard: beaten earth, a well, barrels, a brazier, and folk
  const yx0 = kx + kh + 0.1, yx1 = X1 - half - 0.1, yz0 = Z0 + half + 0.1, yz1 = Z1 - half - 0.1;
  area(k, rect(yx0, yz0, yx1, yz1), 0xb1a283, y + 0.04);
  area(k, rect(X0 + half + 0.1, kz + kh + 0.1, yx0, yz1), 0xb1a283, y + 0.04);
  well(b, yx1 - 1.0, yz0 + 1.1, y + 0.04, ROOF.slate);
  for (const [dx, dz] of [[0.4, 0.4], [1.05, 0.35], [0.7, 0.95]]) barrel(b, yx0 + dx, yz0 + dz, y + 0.04);
  brazier(k, yx0 + 0.5, yz1 - 0.5, y + 0.04);
  k.person(yx0 + 1.6, yz1 - 0.8, y + 0.04);
  k.person(yx1 - 0.6, yz1 - 1.6, y + 0.04);
  // a watchman on the walk of each wall that is seen
  k.person(X1, (Z0 + Z1) / 2 + 0.6, y + walk);
  k.person((X0 + gx) / 2 - 1.5, Z1, y + walk);
  k.lights.push({ x: (yx0 + yx1) / 2, z: (yz0 + yz1) / 2, r: 8, color: '#ffcf8a', k: 0.4 });
  k.lights.push({ x: gx, z: roadZ(gx) - 1.5, r: 11, color: '#ffcf8a', k: 0.5 });

  // the name, by the road west of the gate, where the view reads it across the road
  nameBoard(k, SIGN.rosby, X0 + 1.4, l.z1 + 0.45, landAt(X0 + 1.4, l.z1 + 0.45), [0, 0, 1], 1.0);
};

// ---------------------------------------------------------------------------
// Stokeworth: a round tower-house, its hall, and a walled orchard
// ---------------------------------------------------------------------------

/**
 * Stokeworth, unlike Rosby: a round tower-house in the north-west of its lot
 * under a tall cone of red tile, mended since Vhagar's fire took the old
 * roofs at the Conquest, with a slim stair turret on its east side; a hall of
 * stone along the north side under a roof of the same tile, its door to the
 * orchard; and the orchard itself, inside a low wall, its gate to the road.
 */
const stokeworth: Model = (k, l) => {
  const b = k.b, y = landAt((l.x0 + l.x1) / 2, (l.z0 + l.z1) / 2), r = rng(5507);
  const TILE = ROOF.tile;
  // the tower, its wall's top at the lot's top and its cone over that
  const tr = 2.35, tx = l.x0 + 0.35 + tr + 0.25, tz = l.z0 + 0.35 + tr + 0.25;
  b.cyl(tx, tz, y - 0.3, y + 1.0, tr + 0.3, tr + 0.12, 12, SHS, { cap: SHS });
  roundTower(b, tx, tz, tr, l.top, SH, { shade: SHS, win: NO_WIN, sides: 12, y0: y, flare: 0.25, cone: { color: TILE, h: 2.9 } });
  towerSlits(b, tx, tz, tr, 12, y + 3.2, y + 5.4, 0);
  // the top floor's windows, larger, one to each quarter, lit at night
  for (const [nx, nz] of [[0.5, 0.866], [0.966, -0.259], [-0.5, 0.866], [-0.866, -0.5]] as [number, number][]) pane(b, tx + nx * tr * 0.97, y + 7.3, tz + nz * tr * 0.97, nx, nz, 0.55, 1.0, 1.5);
  doorway(b, tx + 0.5, y, tz + tr * 0.98, 0.2, 0.98, 1.0, 1.9, 1.2);
  // the stair turret, on its east side
  const sx = tx + tr * 0.85, sz = tz + tr * 0.62;
  roundTower(b, sx, sz, 0.75, l.top - 0.6, SH, { shade: SHS, win: NO_WIN, sides: 8, y0: y, flare: 0.12, cone: { color: TILE, h: 1.8 } });
  for (const yy of [2.8, 5.0, 7.2]) slit(b, sx + 0.72, y + yy, sz, 1, 0, yy > 6);

  // the hall, east of the tower, its roof's ridge under the lot's top
  const hx0 = tx + tr - 0.6, hx1 = l.x1 - 0.4, hz0 = l.z0 + 0.4, hz1 = l.z0 + 3.8, hw = 4.0;
  b.box(hx0, y - 0.3, hz0, hx1, y + hw, hz1, SH, { faces: 'NESW', seed: 3 });
  roof(b, hx0, hz0, hx1, hz1, y + hw, 2.6, TILE, SH, false, 0.25);
  for (const x of [hx0 + 1.3, hx0 + 2.8, hx1 - 0.45]) pane(b, x, y + 1.6, hz1, 0, 1, 0.42, 1.5, 1.4);
  for (const z of [hz0 + 1.1, hz1 - 1.1]) pane(b, hx1, y + 1.6, z, 1, 0, 0.42, 1.5, 1.2);
  doorway(b, hx0 + 2.05, y, hz1, 0, 1, 0.8, 1.8, 1.3);
  // its chimney, on the east gable
  b.box(hx1 - 0.6, y + hw + 0.4, (hz0 + hz1) / 2 - 0.25, hx1 - 0.1, y + hw + 2.95, (hz0 + hz1) / 2 + 0.25, 0x8e7e6b, { top: 0x3b3633 });
  smoke(hx1 - 0.35, y + hw + 3.1, (hz0 + hz1) / 2, 0.4, 0.8, 0.6);
  // a vane of plain colours on the cone's tip
  flag(b, tx, tz, l.top + 2.85, PLAIN.stokeworth, 1.1, 0.6);

  // the orchard: grass inside a low wall, from the hall and the tower down to the road side, its gate in the south wall
  const ox0 = l.x0 + 0.35, ox1 = l.x1 - 0.35, oz0 = hz1, oz1 = l.z1 - 0.35, wy = y + 1.5, gx = (ox0 + ox1) / 2 + 1.0;
  area(k, rect(ox0 + 0.25, tz + tr - 0.4, ox1 - 0.25, oz1 - 0.25), 0x7da55a, y + 0.04);
  const wall = (a: P2, c: P2): void => {
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]), yaw = Math.atan2(c[1] - a[1], c[0] - a[0]);
    b.obox((a[0] + c[0]) / 2, (y - 0.2 + wy) / 2, (a[1] + c[1]) / 2, len / 2, (wy - y + 0.2) / 2, 0.22, yaw, SH, { top: SHS });
  };
  wall([ox0, tz + 1.0], [ox0, oz1 + 0.22]);
  wall([ox0 + 0.22, oz1], [gx - 0.9, oz1]);
  wall([gx + 0.9, oz1], [ox1 - 0.22, oz1]);
  wall([ox1, oz0], [ox1, oz1 + 0.22]);
  // the gate: two piers with balls on them, and an arch of stone over the way
  for (const s of [-1, 1]) {
    b.box(gx + s * 1.05 - 0.3, y - 0.2, oz1 - 0.3, gx + s * 1.05 + 0.3, y + 2.6, oz1 + 0.3, SH, { top: SHS });
    b.cyl(gx + s * 1.05, oz1, y + 2.6, y + 3.0, 0.22, 0.22, 6, SHS);
  }
  b.moved(gx, y, oz1, 0, () => arch(b, 0, -0.22, 0.22, 1.5, 2.05, 0.55, 2.6, SH, 6));
  b.box(gx - 0.75, y + 2.6 - 0.12, oz1 - 0.22, gx + 0.75, y + 2.6, oz1 + 0.22, SH, { top: SHS, faces: 'T' });
  fire(k, gx - 1.05, y + 3.35, oz1 + 0.35, 0.2, 7);
  fire(k, gx + 1.05, y + 3.35, oz1 + 0.35, 0.2, 7);
  // the trees, in rows where the tower, its turret, the hall and the gate leave room, low enough for its windows
  const free = (x: number, z: number): boolean =>
    Math.hypot(x - tx, z - tz) > tr + 1.0 && Math.hypot(x - sx, z - sz) > 1.6 && z > hz1 + 0.8 && x > ox0 + 0.7 && x < ox1 - 0.7 && z < oz1 - 0.7
    && !(Math.abs(x - gx) < 1.3 && z > oz1 - 2.0);
  const trees: P2[] = [];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
    const x = ox0 + 0.95 + i * 1.6 + (j % 2) * 0.8, z = oz1 - 0.95 - j * 1.35;
    if (free(x, z)) trees.push([x, z]);
  }
  for (const [x, z] of trees) k.tree(x, z, 0.34 + r() * 0.06, false, y + 0.04);
  // a ladder against a tree, a picker and her basket, a gardener, and two beehives against the west wall
  const [px, pz] = trees[trees.length - 1] ?? [ox1 - 1.5, oz1 - 1.5];
  b.beam([px - 0.55, y, pz + 0.4], [px - 0.15, y + 2.5, pz + 0.05], 0.05, 0.05, 0xa98a60);
  basket(b, px - 0.95, pz - 0.15, y + 0.04, 0xc84a3a);
  k.person(px - 1.0, pz + 0.75, y + 0.04);
  if (trees.length > 1) k.person(trees[0][0] + 0.8, trees[0][1] + 0.3, y + 0.04);
  for (const dx of [0.0, 0.85]) lathe(b, ox0 + 0.75 + dx, oz1 - 0.65, [[0.32, y + 0.04], [0.34, y + 0.35], [0.22, y + 0.65], [0.02, y + 0.8]], 6, 0xc9a85a);
  k.lights.push({ x: gx, z: roadZ(gx) - 1.5, r: 11, color: '#ffcf8a', k: 0.5 }, { x: hx0 + 1.5, z: hz1 + 1.5, r: 8, color: '#ffcf8a', k: 0.4 });

  // the name, by the road west of the gate, where the view reads it across the road
  nameBoard(k, SIGN.stokeworth, l.x0 + 2.0, l.z1 + 0.45, landAt(l.x0 + 2.0, l.z1 + 0.45), [0, 0, 1], 0.9);
};

// ---------------------------------------------------------------------------
// The fishing village, just above the water's edge
// ---------------------------------------------------------------------------

/** A gull, standing: a white body, a grey back and a pale bill. */
function gull(b: GeoBuilder, x: number, z: number, y: number, yaw: number): void {
  b.obox(x, y + 0.2, z, 0.22, 0.12, 0.1, yaw, 0xf4f2ec, { top: 0xb9bec4, faces: 'B' });
  b.obox(x + Math.cos(yaw) * 0.24, y + 0.36, z + Math.sin(yaw) * 0.24, 0.08, 0.07, 0.07, yaw, 0xf4f2ec, { top: 0xe9c25a });
}

/**
 * A fishing village on the shingle below the road: three low cottages of daub
 * and thatch, a smokehouse of tarred boards with smoke rising from its vent
 * and its board, FISH, over its door; racks of fish drying, nets on poles,
 * boats drawn up on the shingle and one upturned, baskets, barrels, gulls,
 * and the folk at work, under a lantern at night. Nothing is higher than the
 * lot's top; its west end, before the Iron Gate's name board, keeps lower still.
 */
const fishing: Model = (k, l) => {
  const b = k.b, r = rng(6611), y = landAt((l.x0 + l.x1) / 2, (l.z0 + l.z1) / 2), shore = SHORE.north;
  // the shingle, from the cottages' feet down to the water, a little way along the shore either side, and the wet stones at its edge
  area(k, [[l.x0 - 4.5, shore - 0.05], [l.x1 + 2.7, shore - 0.05], [l.x1 + 2.7, l.z1 - 1.6], [l.x1 - 2, l.z1 - 2.0], [(l.x0 + l.x1) / 2, l.z1 - 2.3], [l.x0 + 2, l.z1 - 2.0], [l.x0 - 4.5, l.z1 - 1.2]], SHINGLE, y + 0.04);
  area(k, [[l.x0 - 4.5, shore - 0.05], [l.x1 + 2.7, shore - 0.05], [l.x1 + 2.7, shore - 0.75], [l.x0 - 4.5, shore - 0.65]], SHINGLE_DARK, y + 0.052);
  // the cottages along the back of the shingle, their doors to the water, and the smokehouse among them
  const back = l.z0 + 0.25, front = l.z0 + 2.55;
  cottage(k, l.x0 + 0.4, back, l.x0 + 2.9, front, y, 1.75, l.top - 0.05, { face: 'S', win: true, lit: 0.6 });
  cottage(k, l.x0 + 4.8, back + 0.15, l.x0 + 7.4, front + 0.1, y, 1.8, l.top - 0.05, { face: 'S', win: true, lit: 0.55, walls: PLASTER });
  cottage(k, l.x0 + 12.3, back, l.x0 + 14.7, front, y, 1.75, l.top - 0.05, { face: 'S', win: true, lit: 0.6, walls: 0xc9b99a });
  // the smokehouse: tarred boards, a low door warm with its fire, a vent on its ridge, and its board
  const sx0 = l.x0 + 8.8, sx1 = l.x0 + 11.5, sz0 = l.z0 + 0.1, sz1 = l.z0 + 2.6, sw = 1.85, sr = l.top - 0.3;
  b.box(sx0, y - 0.3, sz0, sx1, y + sw, sz1, 0x4a3a2c, { faces: 'NESW' });
  roof(b, sx0, sz0, sx1, sz1, y + sw, sr - sw, 0x5e5448, 0x4a3a2c, false, 0.2);
  const vx = (sx0 + sx1) / 2, vz = (sz0 + sz1) / 2;
  b.box(vx - 0.45, y + sr - 0.25, vz - 0.3, vx + 0.45, y + sr + 0.2, vz + 0.3, 0x3a2e24, { top: 0x2c241d, faces: 'NESWT' });
  smoke(vx, y + sr + 0.35, vz, 0.55, 0.72, 0.3);
  smoke(vx + 0.3, y + sr + 0.3, vz, 0.45, 0.78, 0.45);
  doorway(b, sx0 + 0.75, y, sz1, 0, 1, 0.75, 1.5, 2.2, 0x5a2a12);
  b.box(sx0 + 1.3, y + 1.12, sz1, sx1 - 0.15, y + 1.6, sz1 + 0.05, TIMBER_DARK);
  k.sign(SIGN.fish, (sx0 + 1.3 + sx1 - 0.15) / 2, y + 1.36, sz1 + 0.08, 0, 1, 0.4, sx1 - sx0 - 1.55);
  k.glows.push({ x: sx0 + 0.75, y: y + 0.6, z: sz1 + 0.06, sx: 0.5, sy: 0.4, sz: 0.04, color: '#ff9a4a' });
  // the fishwife's table before it, with the catch on it, and baskets
  b.box(sx0 + 1.2, y, sz1 + 0.9, sx1 - 0.2, y + 0.78, sz1 + 1.45, TIMBER, { top: 0x8a6a48 });
  for (let i = 0; i < 4; i++) b.box(sx0 + 1.45 + i * 0.32, y + 0.78, sz1 + 1.05, sx0 + 1.65 + i * 0.32, y + 0.86, sz1 + 1.3, FISH);
  basket(b, sx1 + 0.1, sz1 + 1.1, y, FISH);
  basket(b, sx1 + 0.35, sz1 + 0.45, y, 0x8fa6ad);
  k.person(sx0 + 1.9, sz1 + 2.05, y);
  // racks of fish drying, and nets on poles
  fishRack(b, l.x0 + 3.4, l.x0 + 5.6, l.z1 - 2.5, y);
  fishRack(b, l.x0 + 12.4, l.x0 + 14.6, l.z1 - 2.7, y);
  net(b, [l.x0 + 0.6, l.z1 - 2.9], [l.x0 + 2.6, l.z1 - 2.6], y, 2.2);
  net(b, [l.x0 + 7.0, l.z1 - 3.0], [l.x0 + 8.7, l.z1 - 2.7], y, 2.2);
  // the boats, drawn up on the shingle with their bows up the beach, and one upturned to be tarred
  const bz = shore - 1.75;
  boat(b, l.x0 - 2.2, bz, y, -Math.PI / 2 + 0.08, 3.0, HULL);
  boat(b, l.x0 + 3.2, bz - 0.1, y, -Math.PI / 2 - 0.1, 3.2, 0x5f6e78);
  boat(b, l.x0 + 6.1, bz, y, -Math.PI / 2 + 0.05, 2.8, 0x7a5a3a);
  boat(b, l.x0 + 10.2, bz - 0.3, y, Math.PI * 0.1, 2.9, 0x4f5a4a, true);
  boat(b, l.x0 + 14.8, bz, y, -Math.PI / 2 - 0.06, 3.1, 0x6b4f36);
  boat(b, l.x0 + 17.6, bz + 0.1, y, -Math.PI / 2 + 0.1, 2.7, 0x5f6e78);
  // oars and a coil of rope by them, barrels and crates
  b.box(l.x0 + 4.3, y + 0.04, bz - 0.6, l.x0 + 4.42, y + 0.1, bz + 1.4, 0xa98a60);
  b.cyl(l.x0 + 8.1, bz - 0.4, y, y + 0.24, 0.4, 0.4, 8, ROPE, { cap: 0xc9bc98 });
  for (const [dx, dz, yy] of [[15.6, -3.5, 0], [16.2, -3.4, 0], [15.9, -3.45, 0.75]] as [number, number, number][]) barrel(b, l.x0 + dx, l.z1 + dz, y + yy);
  crate(b, l.x0 + 3.0, l.z0 + 3.4, 0.65, y);
  crate(b, l.x0 + 3.0, l.z0 + 3.4, 0.5, y + 0.65);
  // the gulls, on a boat, a post and the shingle
  gull(b, l.x0 + 3.2, bz - 1.2, y + 0.5, 0.4);
  gull(b, l.x0 + 0.6, l.z1 - 2.9, y + 2.2, 2.2);
  gull(b, l.x0 + 11.4, bz + 0.9, y + 0.04, -0.6);
  // the folk: at the boats, mending a net, at the racks, and two children on the shingle
  for (const [dx, dz] of [[-1.2, -0.4], [4.6, 0.6], [7.3, -0.9], [1.5, -3.0], [4.5, -3.2], [13.4, -3.4], [10.9, -1.3], [16.4, -1.0]] as [number, number][]) {
    const px = l.x0 + dx, pz = bz + dz;
    if (y + 2.7 <= underBoards(px, pz, 0.6)) k.person(px + (r() - 0.5) * 0.3, pz, y);
  }
  child(b, l.x0 + 8.4, bz + 0.8, y + 0.04, 0xd94f4f);
  child(b, l.x0 + 9.0, bz + 0.5, y + 0.04, 0x3f6fb5);
  // the lantern by the smokehouse, and the light of the cottages' doors
  lanternPost(k, sx1 + 0.9, sz1 + 2.2, y, 2.2, 10);
  k.lights.push({ x: l.x0 + 3, z: front + 1.5, r: 8, color: '#ffcf8a', k: 0.4 });
};

// ---------------------------------------------------------------------------
// Duskendale: a walled port, its two gates, its houses, its market and quay, and the Dun Fort
// ---------------------------------------------------------------------------

/** How far a thing stands from the laid road's middle at least: the road's 4, and 1 beyond, and a hair. */
const BAND = LANE + 1.15;
/** How far north or south of the road's middle at x its band reaches: BAND across the road, which is more along z where the road runs at a slant. */
const bandAt = (x: number): number => BAND * Math.hypot(1, roadMid(x + 0.5) - roadMid(x - 0.5));
/** The north and south edges of the road's band over a stretch of x: the least and the greatest that nothing may cross. */
function bandN(xa: number, xb: number): number {
  let z = Infinity;
  for (let i = 0; i <= 8; i++) {
    const x = xa + ((xb - xa) * i) / 8;
    z = Math.min(z, roadMid(x) - bandAt(x));
  }
  return z;
}
function bandS(xa: number, xb: number): number {
  let z = -Infinity;
  for (let i = 0; i <= 8; i++) {
    const x = xa + ((xb - xa) * i) / 8;
    z = Math.max(z, roadMid(x) + bandAt(x));
  }
  return z;
}

/** A tower that is a rectangle in plan, from `y` to `top`: its shaft, a crown a little wider, and merlons on it, two to a side. */
function block(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, top: number, color: number, shade: number): void {
  b.box(x0, y - 0.3, z0, x1, top - 0.8, z1, color, { faces: 'NESW' });
  b.box(x0 - 0.15, top - 0.8, z0 - 0.15, x1 + 0.15, top, z1 + 0.15, color, { top: shade, faces: 'NESWTB' });
  const X0 = x0 - 0.15, X1 = x1 + 0.15, Z0 = z0 - 0.15, Z1 = z1 + 0.15, m = 0.34;
  for (const [cx, cz] of [[X0, Z0], [X1 - m, Z0], [X0, Z1 - m], [X1 - m, Z1 - m]]) b.box(cx, top, cz, cx + m, top + 0.75, cz + m, color, { top: shade, faces: 'NESWT' });
}

/** A tall narrow house of the town, its gable to the street: a ground storey of stone, a jutting upper part of plaster, and a steep roof. Its front looks south. */
function townHouse(k: Build, x0: number, z0: number, x1: number, z1: number, y: number, walls: number, ridge: number, high: number, roofC: number, shop: boolean, chimney: boolean): void {
  const b = k.b, win: WinSpec = { cell: 0.95, storey: 2.3, lit: 0.55, kind: 0 }, j = 0.14, cx = (x0 + x1) / 2;
  b.box(x0, y - 0.3, z0, x1, y + 2.3, z1 - j, 0xb2a690, { faces: 'NESW', win: shop ? undefined : win, seed: x0 * 0.7 });
  b.box(x0 - 0.04, y + 2.3, z0, x1 + 0.04, y + walls, z1, high, { faces: 'NESWB', win, seed: x0 * 0.9 + 1 });
  b.box(x0 - 0.06, y + 2.22, z1 - j - 0.02, x1 + 0.06, y + 2.38, z1 + 0.02, TIMBER_DARK, { faces: 'NESWTB' });
  roof(b, x0 - 0.04, z0, x1 + 0.04, z1, y + walls, ridge - walls, roofC, high, true, 0.16);
  if (shop) {
    // an open front with its wares on a counter, warm at night
    b.quad([x0 + 0.2, y + 0.2, z1 - j + 0.03], [x1 - 0.2, y + 0.2, z1 - j + 0.03], [x1 - 0.2, y + 1.9, z1 - j + 0.03], [x0 + 0.2, y + 0.2 + 1.7, z1 - j + 0.03], [0, 0, 1], 0x2e231b, { win: interior(1.5) });
    b.box(x0 + 0.15, y, z1 - j, x1 - 0.15, y + 0.8, z1 - j + 0.3, TIMBER, { top: 0x8d6d4a, faces: 'ESWT' });
  } else {
    b.quad([cx - 0.36, y, z1 - j + 0.03], [cx + 0.36, y, z1 - j + 0.03], [cx + 0.36, y + 1.75, z1 - j + 0.03], [cx - 0.36, y + 1.75, z1 - j + 0.03], [0, 0, 1], DOOR);
  }
  if (chimney) {
    const top = ridge + 0.45;
    b.box(cx - 0.22, ridge - 0.8, z0 + 0.15, cx + 0.22, top, z0 + 0.55, 0x8e7e6b, { top: 0x3b3633 });
    smoke(cx, top + 0.15, z0 + 0.35, 0.38, 0.8, 0.7);
  }
}

/**
 * Duskendale, the bay's second port, which the Rosby road runs through: its
 * strong walls of a pale stone; a gate where the road comes in on the west,
 * between a slim tower and a drum tower, and one where it leaves on the east,
 * each a broad arch over the road; a row of tall narrow houses with steep
 * roofs against the north wall, their gables to the street; the market at the
 * west gate; a stone quay along the harbour, its edge clear but for bollards;
 * and over the harbour at the east end the Dun Fort, the Darklyns' castle: a
 * squat square castle of dun stone with a great round tower at each corner.
 */
const duskendale: Model = (k, l) => {
  const b = k.b, y = landAt((l.x0 + l.x1) / 2, l.z0 + 1), shore = SHORE.north;
  const C = CHALK, CS = CHALK_SHADE, walk = 5.0, gateWalk = 6.9;
  // --- the west gate ---
  const W0 = l.x0, W1 = l.x0 + 1.4, nW = bandN(W0, W1), sW = bandS(W0, W1);
  block(b, W0, l.z0, W1, nW, y, l.top - 0.8, C, CS);
  const dr = 1.1, dcx = W0 + 1.15, dcz = bandS(dcx - dr - 0.22, dcx + dr + 0.22) + dr + 0.27;
  roundTower(b, dcx, dcz, dr, l.top - 0.8, C, { shade: CS, win: NO_WIN, sides: 10, y0: y });
  towerSlits(b, dcx, dcz, dr, 10, y + 2.6, y + 5.2, 1, (nx) => nx > 0.6);
  b.box(W0, y - 0.3, sW, W1, y + gateWalk, dcz, C, { top: CS, faces: 'NEWT' });
  const gate = (x: number, z0: number, z1: number, thick: number, out: number): void => {
    const span = z1 - z0, cz = (z0 + z1) / 2;
    b.moved(x, y, cz, Math.PI / 2, () => arch(b, 0, -thick / 2, thick / 2, span, 4.5, Math.min(1.8, gateWalk - 5.0), gateWalk, C, 10));
    b.box(x - thick / 2, y + gateWalk - 0.25, z0, x + thick / 2, y + gateWalk, z1, C, { top: CS, faces: 'T' });
    // merlons along the outer face of the walk over the arch, and a low parapet on its inner face
    const n = Math.round(span / 1.9);
    for (let i = 0; i < n; i++) {
      const z = z0 + (span * (i + 0.5)) / n;
      b.box(x + out * (thick / 2 - 0.18) - 0.18, y + gateWalk, z - 0.3, x + out * (thick / 2 - 0.18) + 0.18, y + gateWalk + 0.72, z + 0.3, C, { top: CS });
    }
    b.box(x - out * (thick / 2 - 0.1) - 0.1, y + gateWalk, z0 + 0.2, x - out * (thick / 2 - 0.1) + 0.1, y + gateWalk + 0.35, z1 - 0.2, C, { top: CS });
    // torches either side of the way, outside and in, and the town's guard
    for (const s of [-1, 1]) {
      fire(k, x + s * (thick / 2 + 0.12), y + 3.6, z0 - 0.35, 0.2, 7);
      fire(k, x + s * (thick / 2 + 0.12), y + 3.6, z1 + 0.35, 0.2, 7);
    }
    k.person(x, cz, y + gateWalk);
  };
  gate((W0 + W1) / 2, nW, sW, W1 - W0, -1);
  figure(b, W0 - 0.5, sW + 0.55, y, GUARD);
  // the wall from the drum tower down to the water, and a small round tower at its foot
  const tz = shore - 1.25;
  curtain(b, [W0 + 0.6, dcz + dr], [W0 + 0.6, tz], y + walk, C, CS, 1, { thick: 1.2 });
  roundTower(b, W0 + 0.7, tz, 0.78, y + walk + 1.4, C, { shade: CS, win: NO_WIN, sides: 8, y0: y });

  // --- the east gate, its south side the Dun Fort's ---
  const E0 = l.x1 - 1.1, E1 = l.x1, nE = bandN(E0, E1), sE = bandS(E0, E1);
  block(b, E0, l.z0, E1, nE, y, l.top - 0.8, C, CS);
  // --- the Dun Fort: a squat square body of dun stone, a great round tower at each corner ---
  const fr = 0.95, FX1 = l.x1 - 1.4, FX0 = FX1 - 3.15, FZ0 = bandS(FX0 - fr - 0.2, FX1 + fr + 0.2) + fr + 0.25, FZ1 = FZ0 + 3.0, fwalk = 4.8, ftop = 6.0;
  b.box(E0, y - 0.3, sE, E1, y + gateWalk, FZ0, C, { top: CS, faces: 'NEWT' });
  gate((E0 + E1) / 2, nE, sE, E1 - E0, 1);
  figure(b, E1 + 0.5, sE + 0.55, y, GUARD);
  b.box(FX0, y - 0.3, FZ0, FX1, y + fwalk, FZ1, DUN, { top: DUN_SHADE, faces: 'NESWT' });
  // a merlon in the middle of each side, between the towers
  const fmx = (FX0 + FX1) / 2, fmz = (FZ0 + FZ1) / 2;
  for (const [x0, z0, x1, z1] of [[fmx - 0.26, FZ0, fmx + 0.26, FZ0 + 0.36], [fmx - 0.26, FZ1 - 0.36, fmx + 0.26, FZ1], [FX0, fmz - 0.26, FX0 + 0.36, fmz + 0.26], [FX1 - 0.36, fmz - 0.26, FX1, fmz + 0.26]]) b.box(x0, y + fwalk, z0, x1, y + fwalk + 0.7, z1, DUN, { top: DUN_SHADE });
  [[FX0, FZ0], [FX1, FZ0], [FX0, FZ1], [FX1, FZ1]].forEach(([x, z], i) => {
    roundTower(b, x, z, fr, y + ftop, DUN, { shade: DUN_SHADE, win: NO_WIN, sides: 8, y0: y, flare: 0.2 });
    towerSlits(b, x, z, fr, 8, y + 2.2, y + 4.4, i, (nx, nz) => (x - fmx) * nx + (z - fmz) * nz < 0);
  });
  const fcx = (FX0 + FX1) / 2, fcz = (FZ0 + FZ1) / 2;
  for (const [nx, nz] of [[0, 1], [1, 0], [0, -1]] as [number, number][]) slit(b, fcx + nx * 1.575, y + 3.0, fcz + nz * 1.5, nx, nz, nz >= 0);
  doorway(b, FX0, y, fcz, -1, 0, 0.85, 1.9, 1.4, 0x3a2b20);
  for (const s of [-1, 1]) fire(k, FX0 - 0.12, y + 2.5, fcz + s * 0.75, 0.18, 7);
  flag(b, fcx, fcz, y + fwalk, PLAIN.duskendale, 3.2, 0.8);
  k.person(fcx + 0.6, fcz - 0.6, y + fwalk);
  figure(b, FX0 - 0.7, fcz + 0.9, y, GUARD);

  // --- the north wall, and the row of tall narrow houses against it ---
  const nz1 = l.z0 + 0.6;
  curtain(b, [W1, (l.z0 + nz1) / 2], [E0, (l.z0 + nz1) / 2], y + walk, C, CS, -1, { thick: nz1 - l.z0 });
  const houses: { x0: number; x1: number; walls: number; ridge: number }[] = [
    { x0: W1 + 0.12, x1: W1 + 2.0, walls: 4.6, ridge: 6.7 },
    { x0: W1 + 2.12, x1: W1 + 4.05, walls: 6.9, ridge: 8.95 },
    { x0: W1 + 4.17, x1: W1 + 6.1, walls: 6.9, ridge: 8.95 },
    { x0: W1 + 6.22, x1: W1 + 8.1, walls: 6.9, ridge: 8.7 },
    { x0: W1 + 8.22, x1: E0 - 0.12, walls: 4.6, ridge: 6.6 },
  ];
  const highs = [0xe7dcc6, 0xdcc8a4, 0xe9e1d2, 0xd6c3a8, 0xe3d0b8], roofs = [ROOF.slate, ROOF.tile, ROOF.slate, ROOF.tileDark, ROOF.slate];
  houses.forEach((h, i) => {
    const front = bandN(h.x0 - 0.1, h.x1 + 0.1) - 0.05;
    if (front - nz1 < 0.8) return;
    townHouse(k, h.x0, nz1 + 0.02, h.x1, front, y, h.walls, h.ridge, highs[i], roofs[i], i === 2, i === 0 || i === 4);
  });

  // --- the paving: the street's sides and the market, cobbled; the quay, flagged ---
  const xs = (a: number, c: number, n: number): number[] => Array.from({ length: n + 1 }, (_, i) => a + ((c - a) * i) / n);
  const southEdge = xs(W1 + 0.05, FX0 - fr - 0.1, 6).map((x): GP2 => [x, roadMid(x) + ((LANE + 0.1) * bandAt(x)) / BAND]);
  area(k, [...southEdge, [FX0 - fr - 0.1, shore - 0.05], [W1 + 0.05, shore - 0.05]], 0xb3a68e, y + 0.04);
  const northEdge = xs(E0 - 0.05, W1 + 0.05, 8).map((x): GP2 => [x, roadMid(x) - ((LANE + 0.1) * bandAt(x)) / BAND]);
  area(k, [[W1 + 0.05, nz1 + 0.02], [E0 - 0.05, nz1 + 0.02], ...northEdge], 0xb3a68e, y + 0.04);
  const qz = shore - 3.0;
  area(k, rect(W1 + 0.05, qz, FX0 - fr - 0.1, shore - 0.05), 0xd3cbb8, y + 0.052);
  // the quay's edge: a kerb, its face down into the water, and bollards along it
  b.box(W1 + 0.05, y - 0.05, shore - 0.34, FX0 - fr - 0.1, y + 0.16, shore + 0.02, CS, { top: C, faces: 'NEWT' });
  b.quad([W1 + 0.05, -1.05, shore + 0.02], [FX0 - fr - 0.1, -1.05, shore + 0.02], [FX0 - fr - 0.1, y + 0.16, shore + 0.02], [W1 + 0.05, y + 0.16, shore + 0.02], [0, 0, 1], CS);
  for (const x of xs(W1 + 0.7, FX0 - fr - 0.7, 3)) bollard(b, x, shore - 0.62, y + 0.16);
  // on the quay, back from its edge: barrels, crates and sacks landed, porters, sailors and a fishwife
  for (const [dx, dz, yy] of [[0.5, 0.4, 0], [1.15, 0.45, 0], [0.8, 0.42, 0.75]] as [number, number, number][]) barrel(b, W1 + dx, qz + dz, y + 0.052 + yy);
  crate(b, W1 + 2.2, qz + 0.4, 0.7, y + 0.052);
  crate(b, W1 + 2.95, qz + 0.45, 0.7, y + 0.052);
  crate(b, W1 + 2.55, qz + 0.42, 0.6, y + 0.752);
  for (const [dx, dz] of [[3.65, 0.4], [4.2, 0.5]] as [number, number][]) b.box(W1 + dx - 0.3, y + 0.052, qz + dz - 0.22, W1 + dx + 0.3, y + 0.5, qz + dz + 0.22, 0xcdbb94, { top: 0xbfae88 });
  basket(b, W1 + 3.9, qz + 1.25, y + 0.052, FISH);
  for (const [dx, dz] of [[1.8, 1.6], [3.4, 2.0], [0.9, 1.9], [4.6, 1.6]] as [number, number][]) k.person(W1 + dx, qz + dz, y + 0.052);

  // --- the market at the west gate: stalls along the street's south side, their fronts to it ---
  const cloths = [0xb84a3a, 0x3f6ea8, 0xd9b24a], goods = [0xc98a48, 0x9fb3bd, 0x8fb04a];
  xs(W1 + 1.0, FX0 - fr - 1.0, 2).forEach((x, i) => {
    const z = bandS(x - 0.9, x + 0.9) + 0.8;
    if (z + 0.6 > qz) return;
    stall(b, x, z, -Math.PI / 2, y + 0.04, cloths[i], goods[i]);
    k.person(x + 0.5, z + 0.95, y + 0.04);
  });
  child(b, W1 + 1.2, qz - 1.6, y + 0.04, 0xf2c14e);
  // light along the street through the town, on the quay and at the fort's door
  for (const x of [W1 + 1.5, (W1 + E0) / 2, E0 - 1.5]) k.lights.push({ x, z: roadMid(x), r: 9, color: '#ffcf8a', k: 0.45 });
  k.lights.push({ x: W1 + 2.5, z: qz + 1.2, r: 9, color: '#ffcf8a', k: 0.4 });
  lanternPost(k, FX0 - fr - 0.45, qz + 0.9, y + 0.052, 2.3, 9);

  // the town's name, outside its west gate by the road, where the view reads it over the shingle
  const bx = l.x0 - 3.0, bzz = bandS(bx - 2.8, bx + 2.8) + 0.2;
  nameBoard(k, SIGN.duskendale, bx, bzz, landAt(bx, bzz), [0, 0, 1], 0.8);
};

// ---------------------------------------------------------------------------
// Rook's Rest: a tall keep behind a gate of two drum towers, and its rooks
// ---------------------------------------------------------------------------

/**
 * Rook's Rest, where the road ends in a ring before its gate: a curtain with
 * round towers at its south corners and a square one at the north-east; the
 * gate between two drum towers in the south wall, facing the ring; and in its
 * north-west corner a tall square keep, its battlements at the lot's top,
 * with a slender turret on its corner where the rooks gather. Rooks perch
 * along its battlements and wheel about its upper storeys. A hall in the
 * yard, its folk and a horse at the trough.
 */
const rooksRest: Model = (k, l) => {
  const b = k.b, r = rng(8821), y = landAt((l.x0 + l.x1) / 2, (l.z0 + l.z1) / 2);
  const walk = 5.6, thick = 1.0, half = thick / 2;
  const X0 = l.x0 + 1.25, X1 = l.x1 - 1.25, Z0 = l.z0 + 1.25, Z1 = l.z1 - 1.4, gx = TURNS.rooksRest.c[0], apart = 1.85;
  // the keep, its battlements at the lot's top, on a battered plinth
  const kh = 1.85, kx = l.x0 + 0.55 + kh, kz = l.z0 + 0.65 + kh;
  b.box(kx - kh - 0.25, y - 0.3, kz - kh - 0.25, kx + kh + 0.25, y + 0.85, kz + kh + 0.25, SHS, { faces: 'NESWT' });
  squareTower(b, kx, kz, kh, l.top - 0.8, SH, { shade: SHS, win: NO_WIN, y0: y });
  boxSlits(b, kx, kz, kh, kh, [y + 2.6, y + 5.2, y + 7.8], 2);
  pane(b, kx, y + 9.0, kz + kh, 0, 1, 0.5, 0.9, 1.6);
  pane(b, kx + kh, y + 9.0, kz, 1, 0, 0.5, 0.9, 1.6);
  doorway(b, kx + kh, y + 1.1, kz + 0.9, 1, 0, 0.9, 1.8, 1.4);
  b.box(kx + kh, y, kz + 0.3, kx + kh + 0.8, y + 1.1, kz + 1.5, SHS, { top: SH, faces: 'NEST' });
  // the turret on its south-east corner, corbelled out from it, under a slate cone
  const tx = kx + kh - 0.05, tz = kz + kh - 0.05, ty0 = y + 7.4;
  b.cyl(tx, tz, ty0 - 0.9, ty0, 0.08, 0.62, 8, SHS, { cap: false });
  roundTower(b, tx, tz, 0.62, l.top, SH, { shade: SHS, win: NO_WIN, sides: 8, y0: ty0, flare: 0.1, cone: { color: ROOF.slate, h: 2.4 } });
  slit(b, tx + 0.58, y + 9.6, tz, 1, 0, true);
  flag(b, kx - 0.9, kz - 0.9, l.top - 0.8, PLAIN.rooks, 3.4, 0.85);

  // the curtain and its towers
  curtain(b, [kx + kh, Z0], [X1, Z0], y + walk, SH, SHS, -1, { thick });
  curtain(b, [X1, Z0], [X1, Z1], y + walk, SH, SHS, -1, { thick });
  curtain(b, [X0, kz + kh], [X0, Z1], y + walk, SH, SHS, 1, { thick });
  curtain(b, [X0, Z1], [gx - apart, Z1], y + walk, SH, SHS, 1, { thick });
  curtain(b, [gx + apart, Z1], [X1, Z1], y + walk, SH, SHS, 1, { thick });
  squareTower(b, X1, Z0, 1.0, y + walk + 2.0, SH, { shade: SHS, win: NO_WIN, y0: y });
  boxSlits(b, X1, Z0, 1.0, 1.0, [y + 3.6], 1, 'NE');
  for (const [x, z, i] of [[X0, Z1, 0], [X1, Z1, 1]] as [number, number, number][]) {
    roundTower(b, x, z, 1.0, y + walk + 1.6, SH, { shade: SHS, win: NO_WIN, sides: 8, y0: y });
    towerSlits(b, x, z, 1.0, 8, y + 2.2, y + 4.6, i, (nx, nz) => nz < -0.3 && Math.abs(nx) < 0.8);
  }
  towerGate(k, gx, Z1, y, { apart, r: 1.12, towerTop: y + walk + 2.2, walk, thick, w: 1.95, spring: 2.5, rise: 0.95, color: SH, shade: SHS, out: 1, sides: 8 });
  for (const [x, z, nx, nz] of [[(kx + kh + X1) / 2, Z0 - half, 0, -1], [X1 + half, (Z0 + Z1) / 2, 1, 0], [X0 - half, (kz + kh + Z1) / 2, -1, 0], [(X0 + gx - apart) / 2, Z1 + half, 0, 1], [(X1 + gx + apart) / 2, Z1 + half, 0, 1]] as [number, number, number, number][]) slit(b, x, y + 2.6, z, nx, nz, r() < 0.4);

  // the yard, and the hall along its east wall
  const yx0 = X0 + half + 0.05, yx1 = X1 - half - 0.05, yz0 = Z0 + half + 0.05, yz1 = Z1 - half - 0.05;
  area(k, [[kx + kh + 0.05, yz0], [yx1, yz0], [yx1, yz1], [yx0, yz1], [yx0, kz + kh + 0.3], [kx + kh + 0.05, kz + kh + 0.3]], 0xb1a283, y + 0.04);
  const hx0 = yx1 - 2.6, hz0 = yz0 + 0.05, hz1 = yz0 + 3.4;
  b.box(hx0, y - 0.3, hz0, yx1, y + 3.4, hz1, SH, { faces: 'NSW' });
  roof(b, hx0, hz0, yx1, hz1, y + 3.4, 2.2, ROOF.slate, SH, true, 0.2);
  for (const z of [hz0 + 0.9, hz1 - 0.9]) pane(b, hx0, y + 1.3, z, -1, 0, 0.42, 1.3, 1.4);
  doorway(b, (hx0 + yx1) / 2, y, hz1, 0, 1, 0.8, 1.7, 1.3);
  b.box(hx0 - 0.9, y, hz1 + 0.6, hx0 - 0.1, y + 0.55, hz1 + 1.6, 0x9a907f, { top: 0x5b7f8f });
  cow(b, hx0 - 1.9, hz1 + 1.1, y + 0.04, 0, 0x6e4a32);
  well(b, (yx0 + hx0) / 2 + 0.4, yz1 - 1.2, y + 0.04, ROOF.slate);
  brazier(k, kx + kh + 0.9, yz1 - 0.7, y + 0.04);
  for (const [x, z] of [[gx - 0.4, yz1 - 1.6], [kx + kh + 1.6, kz + kh + 0.9], [hx0 - 0.6, hz0 + 0.8]] as P2[]) k.person(x, z, y + 0.04);
  k.person(X1, (Z0 + Z1) / 2, y + walk);
  k.person(X0, (kz + kh + Z1) / 2 + 0.4, y + walk);

  // the rooks: perched along the keep's battlements, the turret's foot and the gate towers, and a few wheeling round the keep
  const perch = kz - kh - 0.2, crown = l.top - 0.02;
  for (const [x, z, a] of [[kx - 1.0, perch, 1.2], [kx + 0.9, perch, 2.0], [kx - kh - 0.2, kz + 0.2, 0.3], [kx + kh + 0.2, kz - 0.9, 3.4], [kx - 0.3, kz + kh + 0.2, 4.4]] as [number, number, number][]) rook(b, x, crown, z, a, false);
  for (const s of [-1, 1]) rook(b, gx + s * apart + 0.3, y + walk + 3.0, Z1 + 0.6, 1.4 + s, false);
  rook(b, X1 - 0.4, y + walk + 2.8, Z0 + 0.5, 2.6, false);
  const wheel0 = r() * Math.PI * 2;
  for (let i = 0; i < 4; i++) {
    const a = wheel0 + (i / 4) * Math.PI * 2 + (r() - 0.5) * 0.5, rr = 2.5 + r() * 0.6;
    const x = Math.min(l.x1 - 0.8, Math.max(l.x0 + 0.8, kx + 0.6 + Math.cos(a) * rr)), z = Math.min(l.z1 - 0.8, Math.max(l.z0 + 0.8, kz + 0.4 + Math.sin(a) * rr));
    rook(b, x, y + 9.4 + r() * 1.8, z, a + Math.PI / 2, true);
  }
  k.lights.push({ x: gx, z: Z1 + 3.0, r: 11, color: '#ffcf8a', k: 0.5 }, { x: (yx0 + yx1) / 2, z: (yz0 + yz1) / 2, r: 8, color: '#ffcf8a', k: 0.4 });

  // the name, by the road west of the ring before the gate, read across the road
  const [bx, bz] = [l.x0 - 0.2, l.z1 + 1.7];
  nameBoard(k, SIGN.rooks, bx, bz, landAt(bx, bz), TO_VIEW, 0.7);
};

// ---------------------------------------------------------------------------
// Crackclaw Point: hills, pines and a bog, and a clan's hall in its palisade
// ---------------------------------------------------------------------------

/** Crackclaw Point's hills: rounded heights, none over 4, falling to nothing at the shore, at the road's end and at the board's edge, and none in the bog or under the hall. */
const HILLS = [
  { x: 50.5, z: -106.5, r: 7.5, h: 3.0 }, { x: 63.5, z: -108.5, r: 9.0, h: 4.0 }, { x: 80.5, z: -106.5, r: 7.5, h: 3.4 },
  { x: 87, z: -100, r: 4.5, h: 2.0 }, { x: 57, z: -111.5, r: 5, h: 2.4 }, { x: 72, z: -110.5, r: 4.5, h: 2.6 },
];
/** The bog, as an oval, and the hall's palisade, as a ring. */
const BOG = { x: 59.5, z: -98.0, rx: 6.8, rz: 3.4 };
const HALL = { x: 72, z: -98.6, r: 4.3 };
const smooth = (a: number, c: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (c - a)));
  return t * t * (3 - 2 * t);
};
/** The point's natural height at a place. */
function pointHeight(x: number, z: number): number {
  const L = lotOf('crackclaw');
  if (x < L.x0 || x > SHORE_EAST || z < -112.8 || z > SHORE.claw) return 0;
  let h = 0;
  for (const c of HILLS) {
    const d = Math.hypot(x - c.x, z - c.z);
    if (d < c.r) h += c.h * (0.5 + 0.5 * Math.cos((Math.PI * d) / c.r));
  }
  const fade = smooth(L.z1 - 0.5, L.z1 - 4, z) * smooth(-112.8, -111.2, z) * smooth(L.x0, L.x0 + 2.5, x) * smooth(SHORE_EAST, SHORE_EAST - 1.5, x);
  return Math.min(4, h) * fade;
}
/** The land's east edge on the point, where the Narrow Sea begins. */
const SHORE_EAST = 89.8;
let POINT: Field | null = null;
const pointField = (): Field => (POINT ??= field(lotOf('crackclaw').x0, -112.8, SHORE_EAST, SHORE.claw - 0.05, 2.7, pointHeight));
/** How high the point's ground is at a place, as it is drawn. */
const pointAt = (x: number, z: number): number => {
  const f = pointField();
  return x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1 ? heightOn(f, x, z) : 0;
};

/** A clump of reeds: thin pale blades, each a triangle seen from both sides. */
function reeds(b: GeoBuilder, x: number, z: number, y: number, r: () => number, n = 5): void {
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = r() * 0.35, bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d;
    const h = 0.8 + r() * 0.8, la = r() * Math.PI * 2, lean = 0.15 + r() * 0.3, px = -Math.sin(la) * 0.07, pz = Math.cos(la) * 0.07;
    const L: V3 = [bx - px, y, bz - pz], R: V3 = [bx + px, y, bz + pz], T: V3 = [bx + Math.cos(la) * lean, y + h, bz + Math.sin(la) * lean];
    const col = [0x9aa65a, 0xb3a862, 0x7f9450][Math.floor(r() * 3)];
    const n0: V3 = [Math.sin(la), 0, -Math.cos(la)];
    face3(b, L, R, T, n0, col);
    face3(b, L, R, T, [-n0[0], 0, -n0[2]], col);
  }
}

/**
 * Crackclaw Point, the bay's northern arm: low rounded hills of grass and
 * heather with pines on them, a bog in the hollow by the shore with dark
 * pools and reeds and a heron, a clan's long timber hall under a steep roof
 * inside a palisade of sharpened stakes, with its fire and its folk, a track
 * from the road's end to its gate, sheep and goats on the slopes, and a strip
 * of rocks and shingle along the shore.
 */
const crackclaw: Model = (k, l) => {
  const b = k.b, r = rng(9931), f = pointField();
  // grass low down, darker higher up, heather brown on the tops, and rock where it is steep
  drawField(b, f, {
    color: (h, level, x, z) => (level < 0.8 ? ROCK_GREY : h > 2.9 ? (Math.sin(x * 0.9 + z * 0.4) > 0 ? 0x8a7a5e : 0x7d7058) : h > 1.6 ? 0x6a9450 : level > 0.97 ? 0x86b066 : 0x78a35a),
    cut: ROCK_GREY, edges: '',
  });
  // --- the shore: a strip of shingle, and rocks along it ---
  area(k, [[l.x0 - 1.0, SHORE.claw - 0.05], [SHORE_EAST, SHORE.claw - 0.05], [SHORE_EAST, SHORE.claw - 1.6], [l.x0 + 20, SHORE.claw - 2.1], [l.x0 - 1.0, SHORE.claw - 1.7]], SHINGLE, 0.04);
  for (let i = 0; i < 12; i++) {
    const x = l.x0 + 1 + (i + r()) * ((SHORE_EAST - l.x0 - 2) / 12), z = SHORE.claw - 0.6 - r() * 1.1, s = 0.35 + r() * 0.55;
    b.obox(x, 0.02 + s * 0.35, z, s, s * 0.45, s * 0.7, r() * Math.PI, i % 3 ? ROCK_GREY : 0x6e6a64, { top: 0x847f78 });
  }
  // --- the bog: moss, dark pools, reeds, a few dead stumps, and a heron at a pool ---
  area(k, oval(BOG.x, BOG.z, BOG.rx, BOG.rz, 18), 0x627c48, 0.04);
  const pools: [number, number, number, number][] = [[BOG.x - 3.2, BOG.z - 0.6, 1.6, 0.9], [BOG.x + 0.4, BOG.z + 0.7, 2.0, 1.1], [BOG.x + 3.6, BOG.z - 0.9, 1.3, 0.8], [BOG.x - 0.6, BOG.z - 1.8, 0.9, 0.55]];
  for (const [x, z, rx, rz] of pools) {
    area(k, oval(x, z, rx + 0.25, rz + 0.25, 12), 0x4f5f3e, 0.052);
    area(k, oval(x, z, rx, rz, 12), 0x34433f, 0.064);
  }
  for (const [x, z, rx, rz] of pools) for (let i = 0; i < 3; i++) {
    const a = r() * Math.PI * 2;
    reeds(b, x + Math.cos(a) * (rx + 0.3), z + Math.sin(a) * (rz + 0.3), 0.04, r, 4);
  }
  for (const [x, z] of [[BOG.x - 5.2, BOG.z + 0.8], [BOG.x + 5.4, BOG.z + 0.2]] as P2[]) b.beam([x, 0, z], [x + 0.2, 1.3, z - 0.1], 0.16, 0.08, 0x8f877b);
  // the heron: long legs, a grey body, a long neck and a dark bill
  const hx = pools[1][0] + 1.6, hz = pools[1][1] - 0.2;
  for (const s of [-1, 1]) b.beam([hx + s * 0.08, 0.06, hz], [hx + s * 0.05, 0.85, hz], 0.03, 0.03, 0xc9a85a);
  b.obox(hx, 1.05, hz, 0.34, 0.2, 0.17, 0.3, 0x9aa2a8, { top: 0xb9c0c6, faces: 'B' });
  b.beam([hx + 0.25, 1.15, hz + 0.07], [hx + 0.42, 1.75, hz + 0.13], 0.06, 0.05, 0xd6dadc);
  b.obox(hx + 0.62, 1.78, hz + 0.19, 0.22, 0.04, 0.04, 0.3, 0x5a4a2a);

  // --- the clan's hall, inside its palisade ---
  const { x: cx, z: cz, r: pr } = HALL, gate = Math.PI; // the gate looks west, to the track from the road's end
  area(k, oval(cx, cz, pr - 0.2, pr - 0.2, 20), 0xa6966f, 0.04);
  const n = 22, stake = 2.1;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
    if (Math.abs(Math.atan2(Math.sin(am - gate), Math.cos(am - gate))) < 0.2) continue;
    const p: V3 = [cx + Math.cos(a0) * pr, 0, cz + Math.sin(a0) * pr], q: V3 = [cx + Math.cos(a1) * pr, 0, cz + Math.sin(a1) * pr];
    const nx = Math.cos(am), nz = Math.sin(am);
    for (const s of [1, -1]) {
      b.quad([p[0], -0.3, p[2]], [q[0], -0.3, q[2]], [q[0], stake, q[2]], [p[0], stake, p[2]], [nx * s, 0, nz * s], s > 0 ? 0x6e5236 : 0x5b4430);
      // the sharpened tops, one to a stretch
      face3(b, [p[0], stake, p[2]], [q[0], stake, q[2]], [(p[0] + q[0]) / 2, stake + 0.55, (p[2] + q[2]) / 2], [nx * s, 0, nz * s], 0x6e5236);
    }
  }
  // the gate's two posts, and a lintel over it
  for (const s of [-1, 1]) {
    const a = gate + s * 0.2;
    b.box(cx + Math.cos(a) * pr - 0.16, -0.3, cz + Math.sin(a) * pr - 0.16, cx + Math.cos(a) * pr + 0.16, stake + 0.6, cz + Math.sin(a) * pr + 0.16, TIMBER_DARK);
  }
  b.box(cx - pr - 0.16, stake + 0.25, cz - Math.sin(0.2) * pr - 0.1, cx - pr + 0.16, stake + 0.45, cz + Math.sin(0.2) * pr + 0.1, TIMBER_DARK, { faces: 'NESWTB' });
  fire(k, cx - pr - 0.3, 2.0, cz - Math.sin(0.2) * pr - 0.3, 0.2, 7);
  // the hall: walls of logs, a steep roof of thatch, crossed timbers at its gables, its door warm at night, smoke from its roof
  const hw = 2.6, hd = 1.35, wy = 2.1, ridge = 5.6;
  b.box(cx - hw, -0.3, cz - hd - 0.5, cx + hw, wy, cz + hd - 0.5, 0x6b4f34, { faces: 'NESW' });
  roof(b, cx - hw, cz - hd - 0.5, cx + hw, cz + hd - 0.5, wy, ridge - wy, 0x8a7a48, 0x5e4630, false, 0.3);
  for (const s of [-1, 1]) {
    const gx = cx + s * (hw + 0.05);
    b.beam([gx, ridge - 0.9, cz - 0.5 - 0.9], [gx, ridge + 0.6, cz - 0.5 + 0.55], 0.07, 0.07, TIMBER_DARK);
    b.beam([gx, ridge - 0.9, cz - 0.5 + 0.9], [gx, ridge + 0.6, cz - 0.5 - 0.55], 0.07, 0.07, TIMBER_DARK);
  }
  doorway(b, cx - 0.4, 0, cz + hd - 0.5, 0, 1, 0.95, 1.7, 1.8, 0x3a2414);
  for (const x of [cx - 1.7, cx + 1.3]) pane(b, x, 0.9, cz + hd - 0.5, 0, 1, 0.4, 0.6, 1.2);
  smoke(cx + 0.9, ridge + 0.1, cz - 0.5, 0.5, 0.75, 0.4);
  // a storehouse, a fire pit, a woodpile, goats and the clan's folk
  cottage(k, cx + 0.9, cz + 1.2, cx + 2.6, cz + 2.7, 0, 1.5, 3.0, { face: 'W', walls: 0x6b4f34, roof: 0x8a7a48 });
  fire(k, cx - 1.6, 0.35, cz + 2.0, 0.28, 9);
  b.cyl(cx - 1.6, cz + 2.0, 0, 0.2, 0.5, 0.5, 7, 0x6e6a64, { cap: 0x2a2420 });
  b.box(cx + 2.9, 0, cz - 1.8, cx + 3.5, 0.75, cz - 0.2, 0x7a5a3a, { top: 0x9a7a52 });
  for (const [dx, dz] of [[-2.4, 2.2], [-0.8, 2.8], [-2.9, 1.0], [0.4, 1.9]] as P2[]) k.person(cx + dx, cz + dz, 0.04);
  goat(b, cx + 0.3, cz - 3.1, 0.04, 0.4, 0xe8e0d0);
  goat(b, cx - 1.0, cz - 3.0, 0.04, 2.8, 0x7a5a3c);
  k.lights.push({ x: cx - 1.0, z: cz + 1.5, r: 10, color: '#ffbf75', k: 0.55 });
  // the track from the road's end to the gate, between the bog and the shingle, under the point's name board
  const ring = TURNS.rooksRest, track: P2[] = [[ring.c[0] + ring.r + 3.2, SHORE.claw - 3.6], [cx - pr - 2.2, SHORE.claw - 3.6], [cx - pr - 0.2, cz]];
  for (let i = 0; i + 1 < track.length; i++) {
    const [p, q] = [track[i], track[i + 1]], tl = Math.hypot(q[0] - p[0], q[1] - p[1]), tnx = (-(q[1] - p[1]) / tl) * 0.65, tnz = ((q[0] - p[0]) / tl) * 0.65;
    area(k, [[p[0] - tnx, p[1] - tnz], [q[0] - tnx, q[1] - tnz], [q[0] + tnx, q[1] + tnz], [p[0] + tnx, p[1] + tnz]], 0xa99a78, 0.046);
  }

  // --- the pines, the sheep and the goats, on the hills ---
  const onTrack = (x: number, z: number): boolean => toLine(x, z, track) < 1.6;
  const clear = (x: number, z: number, m: number): boolean =>
    x > l.x0 + m && x < SHORE_EAST - m && z > -112.6 + m && z < SHORE.claw - 2.4 - m
    && Math.hypot((x - BOG.x) / (BOG.rx + m), (z - BOG.z) / (BOG.rz + m)) > 1 && Math.hypot(x - cx, z - cz) > pr + 1.0 + m && !onTrack(x, z) && clearOfRoad(x, z, m);
  let pines = 0;
  for (let i = 0; i < 260 && pines < 46; i++) {
    const x = l.x0 + r() * (SHORE_EAST - l.x0), z = -112.4 + r() * 18.5, h = pointAt(x, z);
    // most on the hills, fewer on the low ground
    if (h < 0.6 && r() < 0.7) continue;
    if (!clear(x, z, 0.4)) continue;
    const s = Math.min(0.62, (l.top - h - 0.05) / 9.1, (underBoards(x, z, 0.5) - h) / 9.1) * (0.75 + r() * 0.25);
    if (s < 0.3) continue;
    k.tree(x, z, s, true, h);
    pines++;
  }
  for (let i = 0, got = 0; i < 80 && got < 7; i++) {
    const x = l.x0 + 4 + r() * (SHORE_EAST - l.x0 - 8), z = -110 + r() * 14, h = pointAt(x, z);
    if (h < 0.3 || !clear(x, z, 0.8)) continue;
    if (got % 2) goat(b, x, z, h, r() * Math.PI * 2, got % 3 ? 0xe8e0d0 : 0x6b4a32);
    else sheep(b, x, z, h, r() * Math.PI * 2);
    got++;
  }
  // a shepherd with his crook on the near hill, and a boulder or two
  const shx = 52, shz = -101.5;
  k.person(shx, shz, pointAt(shx, shz));
  b.beam([shx + 0.55, pointAt(shx, shz), shz + 0.2], [shx + 0.6, pointAt(shx, shz) + 2.7, shz + 0.25], 0.04, 0.04, 0x9a7a52);
  for (const [x, z, s] of [[66, -104.5, 0.9], [77, -101.5, 0.7], [83, -108, 1.0]] as [number, number, number][]) b.obox(x, pointAt(x, z) + s * 0.25, z, s, s * 0.55, s * 0.7, s * 3, ROCK_GREY, { top: 0x847f78 });

  // the point's name, by the road's end where the point begins
  nameBoard(k, SIGN.crackclaw, l.x0 + 2.5, SHORE.claw - 4.5, 0, TO_VIEW, 0.8);
};

// ---------------------------------------------------------------------------
// Claw Isle: House Celtigar's castle on its rock
// ---------------------------------------------------------------------------

const ISLE = ISLANDS['claw-isle'];
/** How far a place is inside the isle's outline: 0 at its edge, and less than nothing outside it. */
function inIsle(x: number, z: number): number {
  if (!inside(ISLE, x, z)) return -1;
  return toLine(x, z, [...ISLE, ISLE[0]]);
}
/** The isle's rock: a low hump of sea-worn rock over the isle's flat ground, highest under the castle. */
function isleHeight(x: number, z: number): number {
  const d = inIsle(x, z);
  if (d <= 0) return 0;
  return 1.15 * smooth(0, 1.9, d) + 0.12 * Math.sin(x * 2.3) * Math.cos(z * 1.9) * smooth(0.3, 1.2, d);
}
let ISLE_FIELD: Field | null = null;
const isleField = (): Field => {
  if (!ISLE_FIELD) {
    const xs = ISLE.map((p) => p[0]), zs = ISLE.map((p) => p[1]);
    ISLE_FIELD = field(Math.min(...xs) - 0.2, Math.min(...zs) - 0.2, Math.max(...xs) + 0.2, Math.max(...zs) + 0.2, 1.05, isleHeight);
  }
  return ISLE_FIELD;
};
const isleAt = (x: number, z: number): number => {
  const f = isleField();
  return x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1 ? heightOn(f, x, z) : 0;
};

/**
 * Claw Isle, the seat of House Celtigar: on its rock in the Narrow Sea, a
 * curtain of dark sea-worn stone round three towers: a tall round keep on the
 * north, a square tower on the east, and a round tower at the south-west over
 * the landing, with the gate beside it; a small hall in the yard. A landing
 * stage of timber runs out from the rock on its south-west side towards the
 * bay, with a boat tied up at it, the isle's name on a board along it, and a
 * lantern at its end. The house's arms were not checked, so its pennants are
 * plain, in the stone's greys and white.
 */
const clawIsle: Model = (k, l) => {
  const b = k.b, f = isleField();
  drawField(b, f, { color: (h, level, x, z) => (level > 0.93 && h > 0.9 ? (Math.sin(x * 3.1 + z * 2.3) > 0.3 ? 0x6f8a58 : 0x6a6f68) : level > 0.8 ? 0x616664 : 0x545957), cut: SEAS, edges: '' });
  // the curtain, from tower to tower, its merlons outward, with a turret at each bend that has no tower
  const keep: P2 = [l.x0 + 4.0, l.z0 + 1.8], east: P2 = [l.x1 - 1.3, l.z0 + 5.4], gate: P2 = [l.x0 + 2.0, l.z1 - 1.4];
  const se: P2 = [l.x0 + 5.4, l.z1 - 0.8], west: P2 = [l.x0 + 1.0, l.z0 + 4.4];
  const ring: P2[] = [keep, east, se, gate, west];
  const ccx = ring.reduce((s, p) => s + p[0], 0) / ring.length, ccz = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const walk = 4.8;
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length], yaw = Math.atan2(q[1] - p[1], q[0] - p[0]), nx = -Math.sin(yaw), nz = Math.cos(yaw);
    const out = nx * ((p[0] + q[0]) / 2 - ccx) + nz * ((p[1] + q[1]) / 2 - ccz) > 0 ? 1 : -1;
    curtain(b, p, q, walk, SEA, SEAS, out, { thick: 0.9, spacing: 1.6 });
    slit(b, (p[0] + q[0]) / 2 + nx * out * 0.45, 2.4, (p[1] + q[1]) / 2 + nz * out * 0.45, nx * out, nz * out, i % 2 === 0);
  });
  for (const p of [se, west]) roundTower(b, p[0], p[1], 0.62, walk + 1.0, SEA, { shade: SEAS, win: NO_WIN, sides: 6 });
  // the keep: tall and round, its battlements at the lot's top
  roundTower(b, keep[0], keep[1], 1.5, l.top - 0.8, SEA, { shade: SEAS, win: NO_WIN, sides: 10 });
  towerSlits(b, keep[0], keep[1], 1.5, 10, 4.0, 6.6, 1, (nx, nz) => nz < -0.6);
  pane(b, keep[0], 7.6, keep[1] + 1.43, 0, 1, 0.45, 0.8, 1.6);
  pennant(b, keep[0], keep[1], l.top - 0.8, 3.4, 0xeceae4);
  // the east tower, square, and the gate tower over the landing
  squareTower(b, east[0], east[1], 0.95, walk + 2.6, SEA, { shade: SEAS, win: NO_WIN });
  boxSlits(b, east[0], east[1], 0.95, 0.95, [3.4, 5.6], 0, 'NES');
  pennant(b, east[0], east[1], walk + 2.6, 2.6, 0x9ea3a1);
  roundTower(b, gate[0], gate[1], 1.0, walk + 2.0, SEA, { shade: SEAS, win: NO_WIN, sides: 8 });
  towerSlits(b, gate[0], gate[1], 1.0, 8, 3.0, 4.8, 2, (nx, nz) => nx > 0.5 && nz < -0.5);
  pennant(b, gate[0], gate[1], walk + 2.0, 2.4, 0xeceae4);
  // the gate, in the wall beside the tower, looking south over the landing, with steps down the rock to it
  const gdx = se[0] - gate[0], gdz = se[1] - gate[1], gl = Math.hypot(gdx, gdz), gpx = gate[0] + (gdx / gl) * 1.9, gpz = gate[1] + (gdz / gl) * 1.9;
  const gnx = gdz / gl, gnz = -gdx / gl, gs = gnx * (gpx - ccx) + gnz * (gpz - ccz) > 0 ? 1 : -1, gy = isleAt(gpx + gnx * gs * 0.9, gpz + gnz * gs * 0.9);
  b.quad(...((): [V3, V3, V3, V3] => {
    const ox = gpx + gnx * gs * 0.48, oz = gpz + gnz * gs * 0.48, ax = gdx / gl, az = gdz / gl;
    return [[ox - ax * 0.55, gy, oz - az * 0.55], [ox + ax * 0.55, gy, oz + az * 0.55], [ox + ax * 0.55, gy + 1.9, oz + az * 0.55], [ox - ax * 0.55, gy + 1.9, oz - az * 0.55]];
  })(), [gnx * gs, 0, gnz * gs], 0x2a2420, { win: interior(1.4) });
  fire(k, gpx + gnx * gs * 0.6 + (gdx / gl) * 0.9, gy + 2.3, gpz + gnz * gs * 0.6 + (gdz / gl) * 0.9, 0.18, 6);
  // the yard: a small hall of the same stone under slate, and its folk
  const hy = isleAt(ccx, ccz), hx0 = ccx - 1.1, hx1 = ccx + 1.2, hz0 = ccz - 1.6, hz1 = ccz;
  b.box(hx0, hy - 0.5, hz0, hx1, hy + 2.4, hz1, SEA, { faces: 'NESW' });
  roof(b, hx0, hz0, hx1, hz1, hy + 2.4, 1.5, ROOF.slate, SEA, true, 0.18);
  pane(b, (hx0 + hx1) / 2, hy + 0.9, hz1, 0, 1, 0.45, 0.9, 1.4);
  k.person(ccx - 0.4, ccz + 1.0, isleAt(ccx - 0.4, ccz + 1.0));
  for (const p of [ring[0], ring[2]]) {
    const q = ring[(ring.indexOf(p) + 1) % ring.length];
    k.person((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, walk);
  }
  k.lights.push({ x: ccx, z: ccz + 0.8, r: 8, color: '#ffcf8a', k: 0.4 });

  // the landing stage: a deck of planks on piles, out from the rock towards the bay, a boat at it, its lantern and the isle's name
  const J0: P2 = [l.x0 + 0.7, l.z1 - 0.3], J1: P2 = [J0[0] - 2.6, J0[1] + 2.6], dy = 0.4;
  const jl = Math.hypot(J1[0] - J0[0], J1[1] - J0[1]), jyaw = Math.atan2(J1[1] - J0[1], J1[0] - J0[0]), jux = (J1[0] - J0[0]) / jl, juz = (J1[1] - J0[1]) / jl;
  b.obox((J0[0] + J1[0]) / 2, dy - 0.08, (J0[1] + J1[1]) / 2, jl / 2 + 0.3, 0.08, 0.8, jyaw, 0x8a6e4c, { top: 0x9a7d58, faces: 'B' });
  for (const t of [0.15, 0.55, 0.95]) for (const s of [-1, 1]) {
    const px = J0[0] + jux * jl * t - juz * s * 0.68, pz = J0[1] + juz * jl * t + jux * s * 0.68;
    b.cyl(px, pz, -1.3, dy + (t > 0.9 ? 0.55 : 0.02), 0.13, 0.13, 4, TIMBER_DARK, { cap: t > 0.9 ? 0x4a3a2c : false });
  }
  boat(b, J1[0] + juz * 1.5 - jux * 0.6, J1[1] - jux * 1.5 - juz * 0.6, -1.02, jyaw, 2.6, 0x5f6e78);
  b.beam([J1[0] - juz * 0.68, dy + 0.5, J1[1] + jux * 0.68], [J1[0] + juz * 1.5 - jux * 0.2, -0.55, J1[1] - jux * 1.5 - juz * 0.2], 0.03, 0.03, ROPE);
  lanternPost(k, J1[0] - jux * 0.3 + juz * 0.45, J1[1] - juz * 0.3 - jux * 0.45, dy, 2.2, 9);
  k.person(J0[0] + jux * 1.2 - juz * 0.35, J0[1] + juz * 1.2 + jux * 0.35, dy);
  figure(b, J0[0] + jux * 0.3 - juz * 0.3, J0[1] + juz * 0.3 + jux * 0.3, dy, { coat: 0x6d7371, legs: 0x3a3c3e, hat: 0xa8afb6, hatH: 0.3 });
  const mx = (J0[0] + J1[0]) / 2 + 0.32, mz = (J0[1] + J1[1]) / 2 + 0.32;
  nameBoard(k, SIGN.claw, mx, mz, dy, TO_VIEW, 0.6);
  // steps from the landing up the rock to the gate
  const sx = J0[0] + 0.5, sz = J0[1] - 0.5;
  for (let i = 0; i < 3; i++) {
    const t = (i + 1) / 4, x = sx + (gpx + gnx * gs * 0.9 - sx) * t, z = sz + (gpz + gnz * gs * 0.9 - sz) * t, yy = isleAt(x, z) + 0.12;
    b.obox(x, yy / 2, z, 0.5, yy / 2, 0.45, Math.atan2(gpz - sz, gpx - sx), SEAS, { top: SEA });
  }
};

// ---------------------------------------------------------------------------
// The country between: fields in strips, hedges, cottages, a shrine, folk at work
// ---------------------------------------------------------------------------

/** How high a thing of this file may stand where no lot of its own is: 4 north of z -100, and 8 elsewhere. */
const outsideTop = (z: number): number => (z < -100 ? 4 : 8);

/** A field in strips, from x0 to x1 and z0 to z1, its strips running north and south in turn of colour, with now and then a hedge between. */
function strips(k: Build, x0: number, z0: number, x1: number, z1: number, colors: number[], r: () => number, hedges = true): void {
  const n = Math.max(1, Math.round((x1 - x0) / 2.5)), w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * w, c = a + w;
    area(k, rect(a + 0.06, z0, c - 0.06, z1), colors[Math.floor(r() * colors.length)], 0.04);
    // now and then a hedge between two strips
    if (hedges && i > 0 && r() < 0.35) hedge(k.b, [a, z0 + 0.4], [a, z1 - 0.4], 0, 0.7);
  }
}

/**
 * The farmed country north of the bay, between the castles and the town:
 * fields in strips, hedges, the wattle-and-daub huts of Rosby's village,
 * a farm with its well, a haystack and a scarecrow, a ploughman and his ox,
 * reapers, cattle, a shrine to the Seven by the road, and on the shore east of
 * Duskendale a fisherman's cottage with his nets. Nothing north of the
 * castles stands over 4, so that the view sees past it.
 */
function country(k: Build): void {
  const b = k.b, r = rng(2027);
  const RB = lotOf('rosby'), SK = lotOf('stokeworth'), DK = lotOf('duskendale'), RR = lotOf('rooks-rest');
  const WHEAT = 0xd8c06a, BARLEY = 0x9fbf5e, PLOUGH = 0x8c7354, MEADOW = 0x7fae5c, FALLOW = 0xa8b06a;
  const north = -112.7;
  // --- behind the two castles, and west of Rosby ---
  strips(k, RB.x0 - 3.4, north, RB.x0 + 3.2, RB.z0 - 0.4, [WHEAT, BARLEY, FALLOW], r);
  strips(k, RB.x1 - 1.2, north, SK.x1, SK.z0 - 0.4, [WHEAT, PLOUGH, BARLEY, MEADOW], r);
  // Rosby's village: huts of wattle and daub under thatch, round the castle
  const hut = (x0: number, z0: number, x1: number, z1: number, face: 'N' | 'E' | 'S' | 'W'): void =>
    cottage(k, x0, z0, x1, z1, 0, 1.55, Math.min(3.5, outsideTop(z0) - 0.4), { face, walls: DAUB, roof: THATCH, win: true, lit: 0.45, chimney: false });
  hut(RB.x0 + 3.6, north + 0.3, RB.x0 + 5.8, north + 2.5, 'S');
  hut(RB.x1 + 0.3, SK.z0 + 1.6, SK.x0 - 0.3, SK.z0 + 3.9, 'S');
  hut(RB.x0 - 3.3, RB.z0 + 2.0, RB.x0 - 1.1, RB.z0 + 4.2, 'E');
  // a kitchen garden by a hut, a woman at work in it, and washing on a line
  area(k, rect(RB.x1 + 0.35, SK.z0 + 4.3, SK.x0 - 0.35, SK.z1 - 1.3), 0x6b8a48, 0.05);
  for (let i = 0; i < 3; i++) b.box(RB.x1 + 0.6, 0.05, SK.z0 + 4.6 + i * 0.75, SK.x0 - 0.6, 0.22, SK.z0 + 4.9 + i * 0.75, 0x5e8a3e, { faces: 'NESWT' });
  worker(k, RB.x1 + 1.5, SK.z1 - 1.0, 0);
  // the wayside shrine to the Seven, by the road outside the Iron Gate
  const shx = RB.x0 - 1.8, shz = roadZ(RB.x0 - 1.8) - LANE - 2.3;
  shrine(k, shx, shz, 0);
  k.person(shx + 1.3, shz - 0.3);

  // --- the fields between Stokeworth and Rook's Rest, north of Duskendale's wall ---
  const fx0 = SK.x1 + 0.4, fx1 = RR.x0 - 0.4, fz1 = DK.z0 - 0.5;
  strips(k, fx0, north, fx1, fz1, [WHEAT, BARLEY, PLOUGH, WHEAT, MEADOW, FALLOW], r);
  hedge(b, [fx0, fz1 + 0.05], [fx1 - 0.9, fz1 + 0.05], 0, 0.6);
  // the farm: a house and a barn, its well and its haystack
  const hx = fx1 - 3.8, hz = -105.5;
  cottage(k, hx, hz, hx + 3.0, hz + 2.4, 0, 1.9, 3.8, { face: 'S', walls: PLASTER, roof: THATCH, win: true, lit: 0.55 });
  cottage(k, hx - 3.4, hz - 0.6, hx - 0.6, hz + 2.2, 0, 2.0, 3.7, { face: 'E', walls: 0x8a6a48, roof: ROOF.shingle, along: 'x' });
  area(k, rect(hx - 3.6, hz + 2.4, hx + 3.2, hz + 4.6), 0xa8987c, 0.05);
  well(b, hx + 1.0, hz + 3.6, 0.05, ROOF.shingle);
  haystack(b, hx - 1.6, hz + 3.5, 0.05, 0.9);
  cart(b, hx - 3.0, hz + 3.7, 0.05, Math.PI, 'hay');
  k.person(hx + 2.4, hz + 3.4, 0.05);
  child(b, hx + 0.1, hz + 3.0, 0.05, 0xc77dba);
  // a ploughman and his ox in a ploughed strip, reapers in the wheat, a scarecrow, and the haystacks
  const px = fx0 + 6.5, pz = -108.0;
  cow(b, px, pz, 0.04, -Math.PI / 2, 0x8a6a48);
  b.beam([px, 0.9, pz + 0.9], [px + 0.1, 0.4, pz + 2.4], 0.05, 0.05, TIMBER);
  b.obox(px + 0.1, 0.25, pz + 2.5, 0.12, 0.25, 0.5, 0, TIMBER_DARK);
  k.person(px + 0.2, pz + 3.2, 0.04);
  for (const [x, z] of [[fx0 + 1.2, -103.5], [fx0 + 1.9, -105.8], [fx0 + 11.6, -110.2], [fx0 + 12.4, -101.8]] as P2[]) worker(k, x, z, 0.04);
  scarecrow(b, fx0 + 9.2, -104.6, 0.04);
  haystack(b, fx0 + 4.0, -111.2, 0.04, 1.0);
  haystack(b, fx0 + 2.4, -100.6, 0.04, 0.8);
  // a few trees in the hedgerows, low enough for the view to see past them
  for (const [x, z] of [[fx0 + 2.6, -109.4], [fx1 - 0.6, -100.6], [RB.x0 - 2.6, north + 1.4], [SK.x1 - 0.8, north + 1.0]] as P2[]) k.tree(x, z, Math.min(0.46, (outsideTop(z) - 0.2) / 8.4), false, 0.04);
  // cattle grazing north of Rook's Rest
  strips(k, RR.x0, north, RR.x1, RR.z0 - 0.4, [MEADOW, MEADOW, BARLEY], r, false);
  cow(b, RR.x0 + 3.0, north + 1.6, 0.04, 0.3, 0xb98d5c);
  cow(b, RR.x0 + 6.5, north + 2.4, 0.04, 2.9, 0x3d332c);
  k.person(RR.x0 + 8.4, north + 1.3, 0.04);
  k.tree(RR.x1 + 1.5, -106.5, 0.42, false, 0.04);

  // --- on the shore east of Duskendale, between the road and the water: a fisherman's cottage, his nets and his boat ---
  const ex = DK.x1 + 1.2;
  const cz0 = Math.max(roadZ(ex), roadZ(ex + 2.4)) + LANE + 1.75;
  if (cz0 + 2.0 < SHORE.north - (ex + 2.4 - 26)) {
    cottage(k, ex, cz0, ex + 2.4, cz0 + 2.0, 0, 1.7, 3.2, { face: 'S', walls: DAUB, roof: THATCH, win: true, lit: 0.55 });
    net(b, [ex + 2.9, cz0 + 0.3], [ex + 3.4, cz0 + 1.8], 0, 2.0);
    boat(b, ex + 0.4, cz0 + 3.0, 0, 0.25, 2.4, 0x4f5a4a, true);
    k.person(ex + 1.6, cz0 + 2.6);
  }
  // --- west of the fishing village, before the Iron Gate's board: only what is low ---
  boat(b, -9.0, SHORE.north - 1.4, 0, -Math.PI / 2 + 0.2, 2.8, HULL, true);
  for (const [x, z] of [[-10.4, -80.2], [-10.9, -79.6]] as P2[]) lathe(b, x, z, [[0.32, 0.04], [0.34, 0.4], [0.2, 0.55]], 6, 0x9a7a4a);

  // light on the road between the places, where a lantern hangs at a hut's door
  k.lights.push({ x: RB.x1 + 1.5, z: roadZ(RB.x1 + 1.5) - 3, r: 9, color: '#ffcf8a', k: 0.35 });
}

// ---------------------------------------------------------------------------
// What the file hands over
// ---------------------------------------------------------------------------

export const SIGNS: SignDef[] = [
  nameSign(SIGN.rosby, lotOf('rosby').name),
  nameSign(SIGN.stokeworth, lotOf('stokeworth').name),
  nameSign(SIGN.duskendale, lotOf('duskendale').name),
  nameSign(SIGN.rooks, lotOf('rooks-rest').name),
  nameSign(SIGN.crackclaw, lotOf('crackclaw').name),
  nameSign(SIGN.claw, lotOf('claw-isle').name),
  { ...nameSign(SIGN.fish, 'Fish'), color: '#3d5f72', ink: '#f2ede0' },
];

export const MODELS: Record<string, Model> = {
  rosby,
  stokeworth,
  fishing,
  duskendale,
  'rooks-rest': rooksRest,
  crackclaw,
  'claw-isle': clawIsle,
};
export const COVERS: string[] = [];

/** Sets going the smoke that the places gathered: from the smokehouse, the chimneys and the clan's hall. */
function smokeRising(k: Build): void {
  if (!SMOKES.length) return;
  const s = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 90);
  k.group.add(s.mesh);
  const r = rng(3141), from = new THREE.Vector3(), drift = new THREE.Vector3(0.28, 0.3, 0.1), due = SMOKES.map(() => r());
  const at = SMOKES.map((p) => ({ ...p }));
  k.each((dt) => {
    at.forEach((p, i) => {
      due[i] -= dt;
      if (due[i] > 0) return;
      due[i] = p.every * (0.8 + r() * 0.5);
      s.puff(from.set(p.at[0] + (r() - 0.5) * 0.2, p.at[1], p.at[2] + (r() - 0.5) * 0.2), drift, p.size, p.shade);
    });
    s.update(dt);
  });
}

export function extras(k: Build): void {
  try {
    country(k);
    smokeRising(k);
  } finally {
    // what the models left for this is used once
    SMOKES.length = 0;
  }
}

/** The ground of this file's own: Crackclaw Point's hills and Claw Isle's rock. */
export function heightAt(x: number, z: number): number {
  const L = lotOf('crackclaw');
  if (x >= L.x0 && x <= SHORE_EAST && z >= -112.8 && z <= SHORE.claw) return pointAt(x, z);
  if (x > 92 && z < -92) return isleAt(x, z);
  return 0;
}
