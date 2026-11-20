// Winterfell, and Winter Town at its gate.
//
// Two rings of grey granite with a moat between them. The inner castle stands
// in the water on a platform of masonry that rises to the ward, 6 above the
// ground, so that the view the tile opens with looks over the walls into the
// godswood, the hot pools and the glass gardens. The kingsroad passes the
// King's Gate on the east, and Winter Town stands across the road from it.
//
// From the books' plain descriptions (A Game of Thrones, A Clash of Kings),
// as the research notes give them. Everything is this tile's own drawing.

import * as THREE from 'three';
import { Smoke } from '../../engine/effects';
import { interior, rng, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { area, flat, oval, rect, water } from '../../engine/ground';
import { archway, lathe, roundel } from '../../engine/parts';
import { inStreet } from '../../engine/roads';
import { gable, hip, prism, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import {
  DARK, DOOR, HOUSE_WIN, ICE_TOP, IRONWORK, LOOPS, LOOPS_CLOSE, ROOF, SNOW, STONE, TIMBER, TIMBER_DARK,
  banner, brazier, fire, nameBoard, nameSign, rampart, roundTower, squareTower, weirwood,
} from './look';
import type { Model } from './models';
import { WET, WINTERFELL, lotOf, type Lot, type P2 } from './plan';

// ---------------------------------------------------------------------------
// The castle's numbers, all from the plan
// ---------------------------------------------------------------------------

const O = WINTERFELL.outer, I = WINTERFELL.inner, T = WINTERFELL.wall, Y = WINTERFELL.ward;
/** How deep the walls and the platform go: below the moat's bed. */
const FOOT = -1.7;
/** The walk along the top of each wall, and the top of each tower's shaft: the battlements stand on these and end at the lot's top. */
const OUT_WALK = O.top - 1.8, OUT_TOWER = O.top - 0.8;
const IN_WALK = I.top - 1.8, IN_TOWER = I.top - 0.8;
/** How far the platform's plinth stands out from the inner wall into the moat. */
const PLINTH = 0.25;
/** The way through the King's Gate and over the drawbridge: half its width, its floor at the moat end, and where its arch springs and ends. */
const PASS = 1.2, BRIDGE_Y = 0.52, SPRING = 2.7, ARCH_TOP = 3.9;

// ---------------------------------------------------------------------------
// Colours of this file's own. Worth moving to look.ts if another region wants them.
// ---------------------------------------------------------------------------

const G = STONE.north, GS = STONE.northShade;
/** Old, weathered granite: the First Keep and the broken tower. */
const OLD = 0x84878a;
/** Snow lying on a roof. */
const ROOF_SNOW = 0xe8eef2;
/** The moat: cold and dark. Its bed, darker. */
const MOAT = 0x2f4a56, MOAT_BED = 0x1c2629;
/** The ward's trodden snow, the godswood's floor of needles under snow, cobbles, and the mud of Winter Town's lanes. */
const WARD = 0xdfe5e8, WOOD_FLOOR = 0xbfc8c3, COBBLE = 0x9f998e, MUD = 0x9b8f7e, PAVE = 0xb2ab9f;
/** Stone and moss round the pools; the black pool; the hot pools. */
const MOSS = 0x6f7d62, BLACK_POOL = 0x14191b, HOT_POOL = 0x93d2c4;
/** Glass with green behind it: it glows warm and green at night. */
const GLASS = 0x9fcf98;
/** Fire-blackened stone inside the broken tower, and its charred rim. */
const CHAR = 0x2b2826, SCORCH = 0x45403c;
const BRONZE = 0xb28c45, CROW = 0x1d1d22, FRAME = 0xe2e7e4, STRAW = 0xd8bf72;
/** Undressed stone for the houses of Winter Town. */
const FIELDSTONE = 0x8c8984;

const DARK_LIT = (lit: number): WinSpec => interior(lit);

/**
 * Windows that fit a wall from `y0` to `y1`: rows are counted from the ground,
 * so the storey is chosen to end a whole number of rows at `y1`, with about
 * `n` rows on the wall itself.
 */
function rows(y0: number, y1: number, cell: number, lit: number, kind: number, n = 1): WinSpec {
  const want = (y1 - y0) / n;
  return { cell, storey: y1 / Math.max(1, Math.round(y1 / want)), lit, kind };
}

// ---------------------------------------------------------------------------
// Walls and battlements
// ---------------------------------------------------------------------------

/** A row of merlons along a line, their middles on it: the same size as look.ts's rampart gives. */
function merlonRow(b: GeoBuilder, a: P2, c: P2, y: number, color = G): void {
  const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dz, dx);
  const n = Math.max(1, Math.round(len / 1.9));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    b.obox(a[0] + dx * t, y + 0.42, a[1] + dz * t, (len / n) * 0.3, 0.42, 0.2, yaw, color, { top: SNOW });
  }
}

/** Merlons round the edge of a rectangle's flat top. */
function merlonRect(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, color = G): void {
  const i = 0.2;
  merlonRow(b, [x0 + i, z0 + i], [x1 - i, z0 + i], y, color);
  merlonRow(b, [x0 + i, z1 - i], [x1 - i, z1 - i], y, color);
  merlonRow(b, [x0 + i, z0 + i], [x0 + i, z1 - i], y, color);
  merlonRow(b, [x1 - i, z0 + i], [x1 - i, z1 - i], y, color);
}

/**
 * A curtain wall along x or along z: a body with snow on its walk, merlons
 * along its outer edge as look.ts's rampart has them, and a low parapet along
 * its inner edge. `out` is 1 if outwards is the side that rampart's
 * (−sin, cos) points to. The body is a plain box and not rampart's, because a
 * turned box gives its faces no length and its loops then stretch the whole
 * wall.
 */
function curtain(b: GeoBuilder, a: P2, c: P2, y0: number, walk: number, out: 1 | -1, win: WinSpec, thick = 1.6): void {
  const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dz, dx);
  const nx = -Math.sin(yaw), nz = Math.cos(yaw), half = thick / 2;
  const seed = a[0] * 0.13 + a[1] * 0.07;
  if (Math.abs(dz) < 1e-6) b.box(Math.min(a[0], c[0]), y0, a[1] - half, Math.max(a[0], c[0]), walk, a[1] + half, G, { top: SNOW, win, seed });
  else if (Math.abs(dx) < 1e-6) b.box(a[0] - half, y0, Math.min(a[1], c[1]), a[0] + half, walk, Math.max(a[1], c[1]), G, { top: SNOW, win, seed });
  else rampart(b, a, c, walk, G, { thick, y0, shade: SNOW, merlons: false });
  const off = (d: number): [P2, P2] => [[a[0] + nx * d, a[1] + nz * d], [c[0] + nx * d, c[1] + nz * d]];
  const [ma, mc] = off(out * (half - 0.2));
  merlonRow(b, ma, mc, walk);
  const [pa, pc] = off(-out * (half - 0.12));
  b.obox((pa[0] + pc[0]) / 2, walk + 0.2, (pa[1] + pc[1]) / 2, len / 2, 0.2, 0.12, yaw, G, { top: SNOW });
}

/** A roof of snow on a box, with a dark board along each eave: the slate showing under the snow. */
function snowRoof(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, rise: number, wall: number, along: 'x' | 'z', over = 0.35): void {
  gable(b, x0, z0, x1, z1, y, rise, ROOF_SNOW, wall, along, over);
  if (along === 'x') {
    for (const z of [z0 - over, z1 + over]) b.box(x0 - over, y - 0.16, z - 0.07, x1 + over, y - 0.01, z + 0.07, ROOF.slate, { faces: 'NESWB' });
  } else {
    for (const x of [x0 - over, x1 + over]) b.box(x - 0.07, y - 0.16, z0 - over, x + 0.07, y - 0.01, z1 + over, ROOF.slate, { faces: 'NESWB' });
  }
}

/** A small building: walls with windows, and a snowy roof. */
function hut(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, h: number, rise: number, color: number, along: 'x' | 'z', win?: WinSpec): void {
  b.box(x0, y, z0, x1, y + h, z1, color, { win: win ?? rows(y, y + h, 1.3, 0.5, 0, 1), faces: 'NESW', seed: x0 * 0.11 + z0 * 0.07 });
  snowRoof(b, x0, z0, x1, z1, y + h, rise, color, along);
}

/** A door: a dark leaf in a stone frame on the face of a wall that looks along `n`, its middle at (x, z). */
function door(b: GeoBuilder, x: number, z: number, y: number, w: number, h: number, n: 'N' | 'E' | 'S' | 'W', leaf = DOOR, lit = 0): void {
  const sx = n === 'E' ? 1 : n === 'W' ? -1 : 0, sz = n === 'S' ? 1 : n === 'N' ? -1 : 0;
  const along = sx === 0;
  const hw = w / 2, d = 0.07;
  const o = lit > 0 ? { win: DARK_LIT(lit) } : {};
  if (along) b.box(x - hw, y, Math.min(z, z + sz * d), x + hw, y + h, Math.max(z, z + sz * d), leaf, { ...o, faces: 'NESWT' });
  else b.box(Math.min(x, x + sx * d), y, z - hw, Math.max(x, x + sx * d), y + h, z + hw, leaf, { ...o, faces: 'NESWT' });
}

/** A crow or a raven, sitting, facing along `yaw`. */
function crow(b: GeoBuilder, x: number, y: number, z: number, yaw: number): void {
  b.obox(x, y + 0.13, z, 0.2, 0.13, 0.1, yaw, CROW);
  b.obox(x + Math.cos(yaw) * 0.2, y + 0.3, z + Math.sin(yaw) * 0.2, 0.08, 0.08, 0.07, yaw, CROW);
}

// ---------------------------------------------------------------------------
// The outer wall: 8 high, with towers, and a blind gate north and south
// ---------------------------------------------------------------------------

const OUT_LOOPS: WinSpec = { cell: 2.6, storey: OUT_WALK / 2, lit: 0.22, kind: 4 };
const IN_LOOPS: WinSpec = { cell: 2.4, storey: IN_WALK / 3, lit: 0.3, kind: 4 };

/** A gate that is shut: two square towers, and between them an arch with its doors closed. `out` is the way it faces: -1 north, 1 south. */
function blindGate(k: Build, x: number, z: number, out: 1 | -1): void {
  const b = k.b;
  for (const s of [-1, 1]) squareTower(b, x + s * 2.4, z, 1.25, OUT_TOWER, G, { y0: FOOT, shade: SNOW, win: LOOPS });
  // the gate's own block, a little deeper than the wall
  b.box(x - 1.15, FOOT, z - 1.1, x + 1.15, OUT_WALK + 0.9, z + 1.1, G, { top: SNOW });
  merlonRow(b, [x - 1.0, z + out * 0.9], [x + 1.0, z + out * 0.9], OUT_WALK + 0.9);
  // the arch on its outer face, the doors shut in it, and their iron bands
  const zf = z + out * 1.1, f = out > 0 ? 'S' : 'N';
  b.box(x - 1.05, 0, Math.min(zf, zf + out * 0.06), x + 1.05, 2.5, Math.max(zf, zf + out * 0.06), GS, { faces: 'NESWT' });
  roundel(b, [x, 2.5, zf + out * 0.04], 1.05, f, GS, {}, 10);
  b.box(x - 0.82, 0.05, Math.min(zf, zf + out * 0.12), x + 0.82, 2.5, Math.max(zf, zf + out * 0.12), DOOR, { faces: 'NESWT' });
  roundel(b, [x, 2.5, zf + out * 0.09], 0.82, f, DOOR, {}, 10);
  for (const y of [0.7, 1.7]) b.box(x - 0.82, y, Math.min(zf, zf + out * 0.15), x + 0.82, y + 0.12, Math.max(zf, zf + out * 0.15), 0xa7abb0, { faces: 'NESWT' });
  fire(k, x + 1.35, 2.6, zf + out * 0.25, 0.22, 6);
}

function outerWall(k: Build): void {
  const b = k.b, h = 0.8;
  const xw = O.x0 + h, xe = O.x1 - h, zn = O.z0 + h, zs = O.z1 - h, xm = (O.x0 + O.x1) / 2;
  const gate = lotOf('wf-gatehouse');
  curtain(b, [xw, zn], [xe, zn], FOOT, OUT_WALK, -1, OUT_LOOPS);
  curtain(b, [xw, zs], [xe, zs], FOOT, OUT_WALK, 1, OUT_LOOPS);
  // the west and east walls run between the north and south ones, so that no two walks lie over each other
  curtain(b, [xw, zn + h], [xw, zs - h], FOOT, OUT_WALK, 1, OUT_LOOPS);
  // the east wall stops at the gatehouse, on either side of it
  curtain(b, [xe, zn + h], [xe, gate.z0], FOOT, OUT_WALK, -1, OUT_LOOPS);
  curtain(b, [xe, gate.z1], [xe, zs - h], FOOT, OUT_WALK, -1, OUT_LOOPS);
  // a round tower at each corner, and a square one halfway along the west
  for (const [x, z] of [[xw, zn], [xe, zn], [xw, zs], [xe, zs]]) roundTower(b, x, z, 1.55, OUT_TOWER, G, { y0: FOOT, sides: 10, shade: SNOW, win: LOOPS });
  squareTower(b, xw, (zn + zs) / 2, 1.5, OUT_TOWER, G, { y0: FOOT, shade: SNOW, win: LOOPS });
  // the north gate and the south gate, both shut
  blindGate(k, xm, zn, -1);
  blindGate(k, xm, zs, 1);
  // guards on the walk, and a fire at two corners
  for (const [x, z] of [[-30, zs], [-4, zs], [xw, -66], [-24, zn], [xe, -50]]) k.person(x, z, OUT_WALK);
  brazier(k, xe - 3.2, zs, OUT_WALK);
  brazier(k, xw, zs - 3.2, OUT_WALK);
}

// ---------------------------------------------------------------------------
// The inner wall: 11 high, more towers, standing on the platform in the moat
// ---------------------------------------------------------------------------

function innerWall(k: Build): void {
  const b = k.b, h = T / 2;
  const xw = I.x0 + h, xe = I.x1 - h, zn = I.z0 + h, zs = I.z1 - h;
  const gl = lotOf('wf-gatehouse'), cz = (gl.z0 + gl.z1) / 2;
  const ledge = Y - 0.1;

  // The platform: masonry from below the water to the ward, a little proud of the wall above it, with snow on its ledge.
  b.box(I.x0 - PLINTH, FOOT, I.z0 - PLINTH, I.x1 + PLINTH, ledge, I.z0 + T, G, { top: SNOW });
  b.box(I.x0 - PLINTH, FOOT, I.z1 - T, I.x1 + PLINTH, ledge, I.z1 + PLINTH, G, { top: SNOW });
  b.box(I.x0 - PLINTH, FOOT, I.z0 + T, I.x0 + T, ledge, I.z1 - T, G, { top: SNOW, faces: 'EWT' });
  // the east side, with the inner gate through it at the drawbridge's level
  b.box(I.x1 - T, FOOT, I.z0 + T, I.x1 + PLINTH, ledge, cz - PASS, G, { top: SNOW, faces: 'ESWT' });
  b.box(I.x1 - T, FOOT, cz + PASS, I.x1 + PLINTH, ledge, I.z1 - T, G, { top: SNOW, faces: 'NEWT' });
  b.box(I.x1 - T, ARCH_TOP, cz - PASS, I.x1 + PLINTH, ledge, cz + PASS, G, { top: SNOW, faces: 'EWT' });
  const xf = I.x1 + PLINTH, xb = I.x1 - T + 0.05;
  b.moved(0, 0, 0, Math.PI / 2, () => archway(b, cz, -xf, -xb, PASS * 2, SPRING, ARCH_TOP, G, GS));
  // the way goes on into the dark, and up through the platform to the ward
  b.quad([xb, BRIDGE_Y, cz + PASS], [xb, BRIDGE_Y, cz - PASS], [xb, ARCH_TOP, cz - PASS], [xb, ARCH_TOP, cz + PASS], [1, 0, 0], 0x241f1b, { win: DARK_LIT(0.6) });
  b.box(xb, BRIDGE_Y - 0.3, cz - PASS, xf, BRIDGE_Y, cz + PASS, 0x8c877f, { faces: 'T' });
  // a portcullis, raised, its teeth showing under the arch
  for (let i = -2; i <= 2; i++) {
    const dz = i * 0.42, y1 = SPRING + Math.sqrt(PASS * PASS - dz * dz) - 0.03;
    b.box(xf - 0.55, y1 - 0.5, cz + dz - 0.05, xf - 0.45, y1, cz + dz + 0.05, 0x9ea2a7, { faces: 'NESW' });
  }
  fire(k, xf + 0.15, 2.9, cz - PASS - 0.35, 0.22, 6);
  fire(k, xf + 0.15, 2.9, cz + PASS + 0.35, 0.22, 0);

  // the wall itself, from the ledge up
  curtain(b, [xw, zn], [xe, zn], ledge, IN_WALK, -1, IN_LOOPS, T);
  curtain(b, [xw, zs], [xe, zs], ledge, IN_WALK, 1, IN_LOOPS, T);
  curtain(b, [xw, zn + h], [xw, zs - h], ledge, IN_WALK, 1, IN_LOOPS, T);
  curtain(b, [xe, zn + h], [xe, zs - h], ledge, IN_WALK, -1, IN_LOOPS, T);

  // round towers with snowy cones at the corners, square ones along the sides, and two at the gate
  for (const [x, z] of [[xw, zn], [xe, zn], [xw, zs], [xe, zs]]) {
    roundTower(b, x, z, 2.0, IN_TOWER, G, { y0: FOOT, sides: 10, shade: SNOW, win: LOOPS, cone: { color: ROOF_SNOW, h: 3.5 } });
  }
  const sq = (x: number, z: number, r = 1.3): void => squareTower(b, x, z, r, IN_TOWER, G, { y0: FOOT, shade: SNOW, win: LOOPS });
  const third = (I.x1 - I.x0) / 4;
  for (let i = 1; i <= 3; i++) sq(I.x0 + third * i, zs);
  sq(xw, (zn + zs) / 2);
  sq(I.x1 - third * 0.9, zn);
  sq(xe, cz - PASS - 1.55, 1.4);
  sq(xe, cz + PASS + 1.55, 1.4);

  // guards and fires on the walk
  for (const [x, z] of [[-29, zs], [-12, zs], [xw, -62], [xe, -54], [-13, zn]]) k.person(x, z, IN_WALK);
  brazier(k, -20, zs, IN_WALK);
  brazier(k, xe, -66, IN_WALK);
}

// ---------------------------------------------------------------------------
// The King's Gate, the drawbridge, and the apron out to the kingsroad
// ---------------------------------------------------------------------------

function gatehouse(k: Build, l: Lot): void {
  const b = k.b, x0 = l.x0, x1 = l.x1, cz = (l.z0 + l.z1) / 2, walk = l.top - 1.8;
  // two blocks either side of the way through, and the gatehouse over it
  b.box(x0, FOOT, l.z0, x1, ARCH_TOP, cz - PASS, G, { faces: 'NESW' });
  b.box(x0, FOOT, cz + PASS, x1, ARCH_TOP, l.z1, G, { faces: 'NESW' });
  b.box(x0, ARCH_TOP, l.z0, x1, walk, l.z1, G, { top: SNOW, win: rows(ARCH_TOP, walk, 1.6, 0.35, 4, 2) });
  merlonRect(b, x0, l.z0, x1, l.z1, walk);
  b.moved(0, 0, 0, Math.PI / 2, () => archway(b, cz, -x1, -x0, PASS * 2, SPRING, ARCH_TOP, G, GS));
  // the floor of the way, rising from the apron to the drawbridge
  slab(b, [x1, 0.06, cz], [x0, BRIDGE_Y, cz], PASS - 0.01, 0.4, 0x8f8a80);
  // the doors stand open, folded back against the walls of the way
  for (const s of [-1, 1]) {
    const zw = cz + s * (PASS - 0.08);
    b.box(x1 - 1.55, 0.1, Math.min(zw, zw - s * 0.12), x1 - 0.25, 3.0, Math.max(zw, zw - s * 0.12), DOOR, { faces: 'NESWT' });
    for (const y of [0.8, 2.1]) b.box(x1 - 1.55, y, Math.min(zw, zw - s * 0.15), x1 - 0.25, y + 0.12, Math.max(zw, zw - s * 0.15), 0xa7abb0, { faces: 'NESWT' });
  }
  // the two bastions that stand out towards the road
  for (const s of [-1, 1]) roundTower(b, x1 - 0.55, cz + s * 2.95, 1.5, l.top - 0.8, G, { sides: 10, shade: SNOW, win: LOOPS });
  banner(b, x1 - 0.55, cz - 2.95, l.top - 0.8, 'stark', 3.8);
  fire(k, x1 + 0.15, 2.6, cz - PASS - 0.15, 0.24, 7);
  fire(k, x1 + 0.15, 2.6, cz + PASS + 0.15, 0.24, 0);
  brazier(k, (x0 + x1) / 2, cz, walk);
  k.person((x0 + x1) / 2 + 0.6, cz + 1.6, walk);

  // the drawbridge, down, across the moat to the inner gate, and its chains
  const xi = I.x1 + PLINTH;
  b.box(xi, BRIDGE_Y - 0.32, cz - PASS + 0.05, x0, BRIDGE_Y, cz + PASS - 0.05, TIMBER, { top: 0x7d654b, faces: 'NESWTB' });
  for (const s of [-1, 1]) b.beam([x0 - 0.25, BRIDGE_Y + 0.05, cz + s * (PASS - 0.2)], [xi + 0.1, 5.2, cz + s * (PASS - 0.2)], 0.05, 0.05, 0xb9bdc2);
  k.person((xi + x0) / 2, cz + 0.4, BRIDGE_Y);

  // the apron out to the road, and the people and the wolf at the gate
  const road = 11.7;
  area(k, [[x1 + 0.02, cz - 4.4], [road, cz - 4.9], [road, cz + 4.9], [x1 + 0.02, cz + 4.4]], COBBLE, 0.04);
  k.person(x1 + 1.8, cz - 0.9);
  k.person(x1 + 1.4, cz + 1.6);
  direwolf(b, x1 + 1.5, l.z0 - 0.9);
  k.lights.push({ x: x1 + 1.5, z: cz, r: 9, color: '#ffcf8a', k: 0.55 });
}

/** A grey direwolf as big as a pony, sitting by the gate and looking out at the road. */
function direwolf(b: GeoBuilder, x: number, z: number): void {
  const FUR = 0x8e9399, PALE = 0xc9ccd0;
  b.box(x - 0.55, 0, z - 0.45, x + 0.35, 0.75, z + 0.45, FUR); // haunches
  b.box(x - 0.1, 0.4, z - 0.32, x + 0.55, 1.55, z + 0.32, FUR); // chest, upright
  b.box(x + 0.35, 0, z - 0.3, x + 0.6, 0.5, z + 0.3, PALE); // forelegs
  b.box(x + 0.25, 1.4, z - 0.27, x + 0.8, 1.95, z + 0.27, FUR); // head
  b.box(x + 0.8, 1.45, z - 0.13, x + 1.1, 1.7, z + 0.13, PALE); // muzzle
  for (const s of [-1, 1]) b.box(x + 0.3, 1.95, z + s * 0.2 - 0.07, x + 0.45, 2.2, z + s * 0.2 + 0.07, FUR); // ears
  b.beam([x - 0.5, 0.3, z + 0.3], [x - 1.0, 0.12, z + 0.75], 0.12, 0.08, FUR); // tail
}

// ---------------------------------------------------------------------------
// The Great Keep, and its covered bridge to the bell tower
// ---------------------------------------------------------------------------

function greatKeep(k: Build, l: Lot): void {
  const b = k.b, x0 = l.x0 + 0.4, x1 = l.x1 - 0.4, z0 = l.z0 + 0.4, z1 = l.z1 - 0.4;
  const deck = l.top - 1.6, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  b.box(x0 - 0.15, Y, z0 - 0.15, x1 + 0.15, Y + 1.2, z1 + 0.15, GS, { top: SNOW });
  b.box(x0, Y, z0, x1, deck, z1, G, { top: SNOW, win: { cell: 1.5, storey: deck / 8, lit: 0.55, kind: 4 }, seed: 0.37 });
  // two courses of stone that stand out, with snow on them
  for (const y of [Y + 7.6, deck - 2.6]) b.box(x0 - 0.12, y, z0 - 0.12, x1 + 0.12, y + 0.22, z1 + 0.12, GS, { top: SNOW, faces: 'NESWTB' });
  merlonRect(b, x0, z0, x1, z1, deck);
  // a drum turret at each corner, a little taller than the keep
  for (const [x, z] of [[x0 + 0.3, z0 + 0.3], [x1 - 0.3, z0 + 0.3], [x0 + 0.3, z1 - 0.3], [x1 - 0.3, z1 - 0.3]]) {
    roundTower(b, x, z, 1.15, l.top - 0.8, G, { y0: Y, sides: 8, shade: SNOW, win: LOOPS_CLOSE, flare: 0.2 });
  }
  // a low roof of lead under snow in the middle of the deck, and the Starks' banner over it
  hip(b, x0 + 1.6, z0 + 1.3, x1 - 1.6, z1 - 1.3, deck, 0.9, ROOF_SNOW, 0.1);
  banner(b, cx, z0 + 0.8, deck, 'stark', 4);
  // the door, up a few steps on the south side, with a torch either side
  b.box(cx - 1.05, Y, z1, cx + 1.05, Y + 0.32, z1 + 0.9, GS, { top: 0xd4dadd });
  b.box(cx - 0.95, Y + 0.32, z1, cx + 0.95, Y + 2.8, z1 + 0.1, GS, { faces: 'NESWT' });
  roundel(b, [cx, Y + 2.8, z1 + 0.05], 0.95, 'S', GS, {}, 10);
  b.box(cx - 0.65, Y + 0.32, z1 + 0.1, cx + 0.65, Y + 2.3, z1 + 0.16, 0x2a211a, { faces: 'NESWT', win: DARK_LIT(0.85) });
  roundel(b, [cx, Y + 2.3, z1 + 0.13], 0.65, 'S', 0x2a211a, { win: DARK_LIT(0.85) }, 8);
  for (const s of [-1, 1]) fire(k, cx + s * 1.3, Y + 2.5, z1 + 0.25, 0.22, s < 0 ? 8 : 0);
  k.person(cx + 1.7, z1 + 1.0, Y);
  crow(b, x1 - 0.3, l.top + 0.02, z0 + 0.3, 2.4);
  k.lights.push({ x: cx, z: z1 + 3, r: 11, color: '#ffcf8a', k: 0.5 });

  // the covered bridge, high above the yard, from the south-east turret to the bell tower
  const bl = lotOf('wf-bell');
  coveredBridge(b, [x1 - 0.3, z1 - 0.3], [bl.x1 - 1.0, bl.z1 - 1.0], Y + 8.2, Y + 9.6, 0.55);
}

/** A covered bridge between two places: a corridor with a floor seen from below, lit windows, and a roof of snow. */
function coveredBridge(b: GeoBuilder, a: P2, c: P2, y0: number, y1: number, half: number): void {
  const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dz, dx);
  b.moved((a[0] + c[0]) / 2, 0, (a[1] + c[1]) / 2, yaw, () => {
    b.box(-len / 2, y0, -half, len / 2, y1, half, G, { faces: 'NS', win: rows(y0, y1, 0.8, 0.6, 4, 1) });
    b.box(-len / 2, y0 - 0.25, -half - 0.08, len / 2, y0, half + 0.08, GS, { faces: 'NSTB', top: SNOW });
    gable(b, -len / 2, -half, len / 2, half, y1, 0.6, ROOF_SNOW, G, 'x', 0.15);
  });
}

// ---------------------------------------------------------------------------
// The Great Hall
// ---------------------------------------------------------------------------

function greatHall(k: Build, l: Lot): void {
  const b = k.b, x0 = l.x0 + 0.3, x1 = l.x1 - 0.3, z0 = l.z0 + 0.2, z1 = l.z1 - 0.4;
  const eave = l.top - 3.8, rise = l.top - 0.3 - eave;
  const win: WinSpec = { cell: 1.5, storey: eave / 3, lit: 0.45, kind: 6 };
  b.box(x0, Y, z0, x1, eave, z1, G, { win, faces: 'NESW', seed: 0.21 });
  b.box(x0 - 0.12, Y, z0 - 0.12, x1 + 0.12, Y + 1.45, z1 + 0.12, GS, { top: SNOW });
  b.box(x0 - 0.1, eave - 0.3, z0 - 0.1, x1 + 0.1, eave, z1 + 0.1, GS, { faces: 'NESWB' });
  snowRoof(b, x0, z0, x1, z1, eave, rise, G, 'x', 0.4);
  // a louvre on the ridge, where the smoke of the hearth goes out
  const cx = (x0 + x1) / 2, zc = (z0 + z1) / 2, ridge = eave + rise;
  b.box(cx - 0.45, ridge - 0.7, zc - 0.35, cx + 0.45, ridge + 0.25, zc + 0.35, GS, { top: SNOW });
  // buttresses along the south face, between the windows
  const bay = (x1 - x0) / Math.max(1, Math.round((x1 - x0) / win.cell));
  const doorX = x0 + bay * Math.round((x1 - x0) / bay / 2);
  for (let x = x0 + bay; x < x1 - 0.1; x += bay) {
    if (Math.abs(x - doorX) < 0.1) continue;
    b.box(x - 0.2, Y, z1, x + 0.2, Y + 3.6, z1 + 0.45, GS, { top: SNOW });
    b.box(x - 0.2, Y + 3.6, z1, x + 0.2, Y + 4.6, z1 + 0.25, GS, { top: SNOW });
  }
  // the wide doors of oak and iron, under a round arch, up two steps
  const hw = 1.05;
  b.box(doorX - hw - 0.35, Y, z1, doorX + hw + 0.35, Y + 3.85, z1 + 0.14, GS, { faces: 'NESWT' });
  b.box(doorX - hw, Y + 0.22, z1 + 0.14, doorX + hw, Y + 2.6, z1 + 0.22, 0x5d4329, { faces: 'NESWT' });
  roundel(b, [doorX, Y + 2.6, z1 + 0.18], hw, 'S', 0x5d4329, {}, 10);
  b.box(doorX - 0.03, Y + 0.22, z1 + 0.22, doorX + 0.03, Y + 3.5, z1 + 0.25, 0x2b2119, { faces: 'NESWT' });
  for (const y of [Y + 0.7, Y + 1.5, Y + 2.3]) b.box(doorX - hw, y, z1 + 0.22, doorX + hw, y + 0.13, z1 + 0.27, 0xaeb2b7, { faces: 'NESWT' });
  b.box(doorX - hw - 0.4, Y, z1 + 0.14, doorX + hw + 0.4, Y + 0.22, z1 + 0.95, GS, { top: 0xd4dadd });
  for (const s of [-1, 1]) fire(k, doorX + s * (hw + 0.6), Y + 2.6, z1 + 0.3, 0.22, s > 0 ? 8 : 0);
  k.person(doorX - 2.4, z1 + 1.4, Y);
  k.person(doorX + 2.0, z1 + 2.2, Y);
}

// ---------------------------------------------------------------------------
// The First Keep: squat, round, old, with gargoyles round its top
// ---------------------------------------------------------------------------

function firstKeep(k: Build, l: Lot): void {
  const b = k.b, cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, r = Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2 - 0.15;
  const top = l.top - 0.8, sides = 12;
  b.cyl(cx, cz, Y, Y + 1.1, r + 0.3, r, sides, GS, { cap: false });
  roundTower(b, cx, cz, r, top, OLD, { y0: Y, sides, shade: SNOW, flare: 0.3, win: { cell: 2.6, storey: (top - 1) / 2, lit: 0.12, kind: 4 } });
  // the gargoyles: plain blocks that crouch out from under the parapet
  for (let i = 0; i < sides; i++) {
    const a = ((i + 0.5) / sides) * Math.PI * 2;
    b.obox(cx + Math.cos(a) * (r + 0.35), top - 1.25, cz + Math.sin(a) * (r + 0.35), 0.5, 0.2, 0.17, a, 0x6c706b, { top: SNOW });
    b.obox(cx + Math.cos(a) * (r + 0.78), top - 1.12, cz + Math.sin(a) * (r + 0.78), 0.12, 0.2, 0.2, a, 0x6c706b);
  }
  // its door, low and long shut
  const zf = cz + r * Math.cos(Math.PI / sides);
  b.box(cx - 0.75, Y, zf, cx + 0.75, Y + 1.1, zf + 0.9, GS, { top: SNOW });
  door(b, cx, zf, Y + 1.1, 1.0, 1.8, 'S', 0x3d3127);
  crow(b, cx - 1.2, top + 0.8, cz - r - 0.1, 1.2);
}

// ---------------------------------------------------------------------------
// The broken tower: its top third burned and fell long ago
// ---------------------------------------------------------------------------

function brokenTower(k: Build, l: Lot): void {
  const b = k.b, cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, r = Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2 - 0.25;
  const sides = 10, ph = Math.PI / sides, t = 0.4;
  const whole = Y + (l.top - Y) * 0.62;
  b.cyl(cx, cz, Y, whole, r + 0.15, r, sides, OLD, { cap: false, win: rows(Y, whole, 2.2, 0.12, 4, 3) });
  b.cyl(cx, cz, Y + 7, Y + 7.3, r + 0.14, r + 0.14, sides, GS, { cap: SNOW });
  // what is left above, ragged: low towards the view, highest to the north-west
  const hs = [l.top - 5.6, l.top - 6.6, l.top - 5.2, l.top - 3.4, l.top - 1.5, l.top, l.top - 0.6, l.top - 2.2, l.top - 1.0, l.top - 3.9];
  const at = (i: number, rr: number, y: number): V3 => {
    const a = ph + (i / sides) * Math.PI * 2;
    return [cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr];
  };
  const floor = whole - 0.6;
  for (let i = 0; i < sides; i++) {
    const h = hs[i], j = (i + 1) % sides, am = ph + ((i + 0.5) / sides) * Math.PI * 2;
    const out: V3 = [Math.cos(am), 0, Math.sin(am)], inn: V3 = [-out[0], 0, -out[2]];
    // outside: stone, blackened towards the break
    b.quad(at(i, r, whole), at(i + 1, r, whole), at(i + 1, r, h - 1.7), at(i, r, h - 1.7), out, OLD);
    b.quad(at(i, r, h - 1.7), at(i + 1, r, h - 1.7), at(i + 1, r, h), at(i, r, h), out, SCORCH);
    // inside: black from the fire
    b.quad(at(i + 1, r - t, floor), at(i, r - t, floor), at(i, r - t, h), at(i + 1, r - t, h), inn, CHAR);
    // the broken top of the wall
    b.quad(at(i, r, h), at(i + 1, r, h), at(i + 1, r - t, h), at(i, r - t, h), [0, 1, 0], SCORCH);
    // where this piece stands higher than the next, its broken end shows
    const hj = hs[j];
    if (Math.abs(h - hj) > 0.01) {
      const a1 = ph + ((i + 1) / sides) * Math.PI * 2, tx = -Math.sin(a1), tz = Math.cos(a1), s = h > hj ? 1 : -1;
      const lo = Math.min(h, hj), hi = Math.max(h, hj);
      b.quad(at(i + 1, r - t, lo), at(i + 1, r, lo), at(i + 1, r, hi), at(i + 1, r - t, hi), [tx * s, 0, tz * s], SCORCH);
    }
  }
  // the burnt floor inside, and what fell on it
  b.cyl(cx, cz, floor - 0.1, floor, r - t, r - t, sides, CHAR, { cap: 0x1f1c1b });
  b.obox(cx + 0.3, floor + 0.2, cz - 0.4, 0.5, 0.2, 0.3, 0.6, SCORCH);
  b.obox(cx - 0.5, floor + 0.15, cz + 0.4, 0.35, 0.15, 0.25, 1.9, SCORCH);
  // crows on the broken top
  for (const [i, yaw] of [[5, 0.6], [6, 2.0], [8, 3.6], [4, 5.1], [3, 1.0]]) {
    const p = at(i + 0.5, r - t / 2, hs[i]);
    crow(b, p[0], p[1], p[2], yaw);
  }
}

// ---------------------------------------------------------------------------
// The bell tower, and the rookery its bridge leads to
// ---------------------------------------------------------------------------

function bellTower(k: Build, l: Lot): void {
  const b = k.b, cx = l.x1 - 1.0, cz = l.z1 - 1.0, r = 0.95;
  const belfry = l.top - 3.6, lintel = l.top - 0.8;
  b.box(cx - r, Y, cz - r, cx + r, belfry, cz + r, G, { faces: 'NESW', win: rows(Y, belfry, 1.0, 0.35, 4, 3) });
  b.box(cx - r - 0.12, belfry, cz - r - 0.12, cx + r + 0.12, belfry + 0.18, cz + r + 0.12, GS, { top: 0x4a3d31, faces: 'NESWTB' });
  // four piers, and the lintel over the open arches, dark underneath
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    b.box(cx + sx * r - (sx > 0 ? 0.34 : 0), belfry + 0.18, cz + sz * r - (sz > 0 ? 0.34 : 0), cx + sx * r + (sx < 0 ? 0.34 : 0), lintel, cz + sz * r + (sz < 0 ? 0.34 : 0), G, { faces: 'NESW' });
  }
  b.box(cx - r - 0.05, lintel, cz - r - 0.05, cx + r + 0.05, lintel + 0.55, cz + r + 0.05, G, { top: SNOW, faces: 'NESWTB' });
  // the bell, on its beam
  b.box(cx - r, lintel - 0.3, cz - 0.08, cx + r, lintel - 0.12, cz + 0.08, TIMBER_DARK, { faces: 'NSB' });
  lathe(b, cx, cz, [[0.62, belfry + 0.95], [0.55, belfry + 1.15], [0.36, belfry + 1.9], [0.22, lintel - 0.3], [0.05, lintel - 0.28]], 8, BRONZE);
  // a pyramid roof under snow
  lathe(b, cx, cz, [[(r + 0.38) * Math.SQRT2, lintel + 0.55], [0.05, l.top + 2.7]], 4, ROOF_SNOW);
  crow(b, cx, l.top + 2.6, cz, 0.8);

  // the rookery: a small round tower just south of it, and the bridge between
  const rx = cx, rz = l.z1 + 2.6, rr = 0.95;
  roundTower(b, rx, rz, rr, Y + 3.8, G, { y0: Y, sides: 8, shade: SNOW, win: LOOPS_CLOSE, cone: { color: ROOF_SNOW, h: 2.4 } });
  coveredBridge(b, [cx, cz], [rx, rz], Y + 2.4, Y + 3.5, 0.45);
  // the bridge's roof is the ravens' perch
  crow(b, rx + 0.05, Y + 4.12, (cz + rz) / 2, 1.6);
}

// ---------------------------------------------------------------------------
// The glass gardens
// ---------------------------------------------------------------------------

function glassGardens(k: Build, l: Lot): void {
  const b = k.b, x0 = l.x0 + 0.2, x1 = l.x1 - 0.3, z0 = l.z0 + 0.3, z1 = l.z1 - 0.3;
  const foot = Y + 0.7, eave = Y + 1.9, rise = l.top - 0.2 - eave, zc = (z0 + z1) / 2;
  const lit = DARK_LIT(0.8);
  b.box(x0, Y, z0, x1, foot, z1, GS, { top: SNOW });
  b.box(x0 + 0.1, foot, z0 + 0.1, x1 - 0.1, eave, z1 - 0.1, GLASS, { win: lit, faces: 'NESW' });
  gable(b, x0 + 0.1, z0 + 0.1, x1 - 0.1, z1 - 0.1, eave, rise, GLASS, GLASS, 'x', 0.12, { win: lit });
  // the frames of the panes: a ridge, the eaves, and ribs over the roof and down the walls
  const ridge = eave + rise, over = 0.12, za = z0 + 0.1 - over, zb = z1 - 0.1 + over;
  b.beam([x0 - 0.05, ridge + 0.04, zc], [x1 + 0.05, ridge + 0.04, zc], 0.07, 0.07, FRAME);
  const n = Math.round((x1 - x0) / 1.25);
  for (let i = 0; i <= n; i++) {
    const x = x0 + 0.12 + ((x1 - x0 - 0.24) * i) / n;
    b.beam([x, eave + 0.03, za], [x, ridge + 0.04, zc], 0.05, 0.05, FRAME);
    b.beam([x, eave + 0.03, zb], [x, ridge + 0.04, zc], 0.05, 0.05, FRAME);
    b.beam([x, foot, z1 - 0.06], [x, eave, z1 - 0.06], 0.045, 0.045, FRAME);
  }
  // a gardener at the door
  door(b, x1, zc, Y, 0.9, 2.0, 'E', 0x5c7d4f, 0.7);
  k.person(x1 + 0.8, zc + 0.7, Y);
  k.lights.push({ x: (x0 + x1) / 2, z: zc + 1.5, r: 9, color: '#d6f0a0', k: 0.5 });
}

// ---------------------------------------------------------------------------
// The ward: its yards, the godswood, and the small buildings between
// ---------------------------------------------------------------------------

/** A pool with a rim of mossy stone: its surface a hair above the rim. */
function pool(b: GeoBuilder, x: number, z: number, r: number, color: number, win?: WinSpec): void {
  b.cyl(x, z, Y, Y + 0.14, r + 0.32, r + 0.3, 10, MOSS, { cap: MOSS });
  b.cyl(x, z, Y + 0.14, Y + 0.17, r, r, 10, color, { cap: color, win });
}

/** A horse in its stall, facing along x (1 east, -1 west). */
function horse(b: GeoBuilder, x: number, z: number, y: number, dir: 1 | -1, coat: number): void {
  b.box(x - 0.7, y + 0.55, z - 0.25, x + 0.7, y + 1.15, z + 0.25, coat);
  for (const s of [-1, 1]) b.box(x + s * 0.55 - 0.1, y, z - 0.2, x + s * 0.55 + 0.1, y + 0.6, z + 0.2, coat, { faces: 'NESW' });
  b.box(x + dir * 0.55 - 0.15, y + 1.0, z - 0.15, x + dir * 0.55 + 0.15, y + 1.65, z + 0.15, coat);
  b.box(x + dir * 0.75 - 0.25, y + 1.45, z - 0.13, x + dir * 0.75 + 0.25, y + 1.75, z + 0.13, coat);
}

function ward(k: Build, l: Lot): void {
  const b = k.b;
  const fk = lotOf('wf-first-keep'), kp = lotOf('wf-keep'), gg = lotOf('wf-glass'), bl = lotOf('wf-bell'), br = lotOf('wf-broken'), gl = lotOf('wf-gatehouse');
  const cz = (gl.z0 + gl.z1) / 2;
  const R = rng(0x57f3a1);

  // the ground: trodden snow, the godswood's floor, and cobbles in the yards
  area(k, rect(l.x0, l.z0, l.x1, l.z1), WARD, Y);
  const wood: P2[] = [[l.x0, br.z1 + 0.1], [br.x1 + 0.1, br.z1 + 0.1], [br.x1 + 0.1, fk.z1 + 2.6], [gg.x0 - 1.3, fk.z1 + 2.6], [gg.x0 - 1.3, l.z1], [l.x0, l.z1]];
  area(k, wood, WOOD_FLOOR, Y + 0.035);
  const yardW = gg.x0 - 1.1, yardN = gg.z1 + 0.15, eastW = bl.x1 + 0.1;
  area(k, [[eastW, bl.z0 + 0.2], [l.x1, bl.z0 + 0.2], [l.x1, l.z1], [yardW, l.z1], [yardW, yardN], [eastW, yardN]], COBBLE, Y + 0.035);

  // --- the east yard: the stair up from the inner gate, the library tower, the kitchens, the armoury and smithy ---
  const ex = l.x1;
  hut(b, ex - 1.8, cz - 1.3, ex - 0.02, cz + 1.3, Y, 2.4, 0.9, G, 'x');
  door(b, ex - 1.8, cz, Y, 1.4, 1.9, 'W', 0x231d18, 0.7);
  k.person(ex - 2.5, cz + 1.0, Y);
  // the library tower and the stair that climbs its outside to the door
  const lx0 = bl.x1 + 0.3, lx1 = lx0 + 2.0, lz0 = bl.z0 + 0.2, lz1 = lz0 + 2.0;
  b.box(lx0, Y, lz0, lx1, Y + 3.4, lz1, G, { faces: 'NESW', win: rows(Y, Y + 3.4, 1.0, 0.5, 6, 1) });
  b.box(lx0 - 0.12, Y + 3.4, lz0 - 0.12, lx1 + 0.12, Y + 3.6, lz1 + 0.12, GS, { top: SNOW, faces: 'NESWTB' });
  lathe(b, (lx0 + lx1) / 2, (lz0 + lz1) / 2, [[1.25 * Math.SQRT2, Y + 3.6], [0.05, Y + 5.4]], 4, ROOF_SNOW);
  slab(b, [lx1 + 0.42, Y + 0.02, lz1 + 1.4], [lx1 + 0.42, Y + 2.3, lz0 + 0.55], 0.4, 0.3, GS, { under: GS });
  b.box(lx1, Y + 2.0, lz0 + 0.05, lx1 + 0.82, Y + 2.3, lz0 + 0.55, GS, { faces: 'NESWTB', top: SNOW });
  door(b, lx1, lz0 + 0.9, Y + 2.3, 0.7, 1.0, 'E', DOOR, 0.5);
  // the kitchens, with smoke from their chimney
  const kx0 = lx0 + 0.2, kx1 = ex - 1.9, kz0 = cz + 1.6, kz1 = kz0 + 2.1;
  hut(b, kx0, kz0, kx1, kz1, Y, 2.5, 1.0, FIELDSTONE, 'x');
  b.box(kx1 - 0.9, Y + 2.6, kz0 + 0.3, kx1 - 0.3, Y + 4.0, kz0 + 0.9, GS, { top: DARK });
  door(b, (kx0 + kx1) / 2, kz1, Y, 0.8, 1.7, 'S', DOOR, 0.6);
  // the armoury, and the smithy under a roof on its west end, its forge aglow
  const ax0 = kx0, ax1 = ex - 1.2, az0 = l.z1 - 3.25, az1 = l.z1 - 0.6;
  hut(b, ax0, az0, ax1, az1, Y, 2.7, 1.0, G, 'x', rows(Y, Y + 2.7, 1.4, 0.3, 4, 1));
  door(b, (ax0 + ax1) / 2 + 0.6, az0, Y, 1.1, 1.9, 'N', DOOR);
  const sx0 = ax0 - 1.4, sx1 = ax0;
  slab(b, [sx0 - 0.2, Y + 2.0, (az0 + az1) / 2], [sx1, Y + 2.6, (az0 + az1) / 2], (az1 - az0) / 2 + 0.2, 0.12, ROOF_SNOW, { under: TIMBER_DARK });
  for (const z of [az0 + 0.1, az1 - 0.1]) b.box(sx0 - 0.1, Y, z - 0.1, sx0 + 0.1, Y + 2.0, z + 0.1, TIMBER, { faces: 'NESW' });
  b.box(sx0 + 0.3, Y, az0 + 0.5, sx1 - 0.05, Y + 0.85, az0 + 1.4, GS, { top: 0x5a3a22 });
  k.glows.push({ x: (sx0 + sx1) / 2 + 0.1, y: Y + 0.95, z: az0 + 0.95, sx: 0.35, sy: 0.12, sz: 0.3, color: '#ff7a2a' });
  k.lights.push({ x: sx0, z: (az0 + az1) / 2, r: 7, color: '#ff9a4a', k: 0.6 });
  b.box(sx0 + 0.25, Y, az1 - 1.0, sx0 + 0.75, Y + 0.75, az1 - 0.7, 0x3b3d42);
  k.person(sx0 - 0.6, az0 + 1.4, Y);

  // --- the south yard: stables, kennels, the small sept, a well, a quintain and the butts ---
  const sz1 = l.z1 - 0.65;
  // the stables, a long lean-to against the wall, open to the yard
  const st0 = l.x0 + 13.6, st1 = st0 + 4.8, stz0 = sz1 - 2.3;
  b.box(st0, Y, sz1 - 0.25, st1, Y + 2.7, sz1, TIMBER, { faces: 'NEWT', top: TIMBER_DARK });
  b.box(st0, Y, sz1 - 0.24, st1, Y + 2.6, sz1 - 0.25, TIMBER_DARK, { faces: 'N' });
  for (const x of [st0, st1 - 0.22]) b.box(x, Y, stz0, x + 0.22, Y + 2.5, sz1 - 0.25, TIMBER, { faces: 'NESW' });
  b.box(st0 + 2.3, Y, stz0, st0 + 2.5, Y + 2.3, sz1 - 0.25, TIMBER, { faces: 'NESW' });
  slab(b, [(st0 + st1) / 2, Y + 2.3, stz0 - 0.35], [(st0 + st1) / 2, Y + 2.85, sz1 + 0.05], (st1 - st0) / 2 + 0.2, 0.12, ROOF_SNOW, { under: TIMBER_DARK });
  horse(b, st0 + 1.2, stz0 + 0.9, Y, -1, 0x6b4a32);
  horse(b, st0 + 3.6, stz0 + 0.9, Y, 1, 0xd6d0c4);
  k.person(st0 + 2.4, stz0 - 0.6, Y);
  // archery butts at the yard's west end, and an archer
  for (const dx of [0.6, 1.65]) {
    b.cyl(yardW + dx, yardN + 0.55, Y, Y + 1.3, 0.42, 0.42, 8, STRAW, { cap: STRAW });
    b.cyl(yardW + dx, yardN + 0.55, Y + 1.3, Y + 1.36, 0.2, 0.2, 8, 0xb3312a, { cap: 0xb3312a });
  }
  k.person(yardW + 3.4, yardN + 0.8, Y);
  // the small sept: seven walls, a cone of snow and a star on top
  const scx = st1 + 2.6, scz = sz1 - 1.45, sr = 1.4;
  const plan = Array.from({ length: 7 }, (_, i): [number, number] => [scx + Math.cos((i / 7) * Math.PI * 2 - Math.PI / 2) * sr, scz + Math.sin((i / 7) * Math.PI * 2 - Math.PI / 2) * sr]);
  prism(b, plan, Y, Y + 2.6, 0xa4a6a8, { win: rows(Y, Y + 2.6, 0.9, 0.55, 6, 1), seed: 0.8, top: false });
  lathe(b, scx, scz, [[sr + 0.25, Y + 2.6], [0.05, Y + 4.3]], 7, ROOF_SNOW);
  b.box(scx - 0.12, Y + 4.2, scz - 0.12, scx + 0.12, Y + 4.8, scz + 0.12, 0xe8d79a);
  door(b, scx, scz - sr * 0.95, Y, 0.8, 1.6, 'N', 0x2a221b, 0.8);
  k.person(scx + 0.4, scz - sr - 0.8, Y);
  // the kennels, and two of the dogs
  const kn0 = scx + 2.2, kn1 = kn0 + 2.0;
  hut(b, kn0, sz1 - 1.8, kn1, sz1, Y, 1.2, 0.6, TIMBER, 'x', HOUSE_WIN);
  for (const [dx, dz] of [[0.3, -2.15], [1.5, -2.05]]) {
    b.box(kn0 + dx - 0.35, Y + 0.25, sz1 + dz - 0.15, kn0 + dx + 0.35, Y + 0.6, sz1 + dz + 0.15, 0x7b7670);
    b.box(kn0 + dx + 0.3, Y + 0.5, sz1 + dz - 0.12, kn0 + dx + 0.6, Y + 0.8, sz1 + dz + 0.12, 0x7b7670);
  }
  // the well
  const wx = gg.x1 - 0.4, wz = yardN + 0.75;
  b.cyl(wx, wz, Y, Y + 0.7, 0.5, 0.5, 8, GS, { cap: 0x22292c });
  for (const s of [-1, 1]) b.box(wx + s * 0.45 - 0.06, Y + 0.7, wz - 0.06, wx + s * 0.45 + 0.06, Y + 1.7, wz + 0.06, TIMBER, { faces: 'NESW' });
  b.box(wx - 0.65, Y + 1.7, wz - 0.4, wx + 0.65, Y + 1.85, wz + 0.4, ROOF_SNOW, { faces: 'NESWTB' });
  k.person(wx + 0.9, wz + 0.2, Y);
  // the quintain: a post with a turning arm, a shield on one end and a sack on the other
  const qx = (st1 + scx) / 2 - 0.3, qz = yardN + 0.7;
  b.box(qx - 0.08, Y, qz - 0.08, qx + 0.08, Y + 2.1, qz + 0.08, TIMBER, { faces: 'NESWT' });
  b.box(qx - 1.1, Y + 1.85, qz - 0.06, qx + 1.1, Y + 1.97, qz + 0.06, TIMBER, { faces: 'NESWTB' });
  b.box(qx + 0.95, Y + 1.3, qz - 0.35, qx + 1.0, Y + 1.95, qz + 0.35, 0xe5e2da, { faces: 'NESWTB' });
  b.box(qx - 1.15, Y + 1.25, qz - 0.2, qx - 0.85, Y + 1.85, qz + 0.2, 0xb59c6a);

  // --- the north-west: the lichyard, the door of the crypts, the guest house ---
  // the lichyard: old graves on the slope south of the broken tower
  for (let i = 0; i < 6; i++) {
    const gx = l.x0 + 0.9 + (i % 3) * 0.95, gz = br.z1 + 0.9 + Math.floor(i / 3) * 1.1;
    b.obox(gx, Y + 0.32, gz, 0.22, 0.32, 0.07, 0.05 * (i - 2), GS, { top: SNOW });
  }
  // the crypts: a low arch with an iron-bound door in it, and a lantern
  const cx0 = fk.x0 - 0.3, cx1 = cx0 + 1.8, cz0 = fk.z1 + 0.15, cz1 = cz0 + 1.3;
  b.box(cx0, Y, cz0, cx1, Y + 1.5, cz1, GS, { faces: 'NESW' });
  snowRoof(b, cx0, cz0, cx1, cz1, Y + 1.5, 0.7, GS, 'z', 0.2);
  const dxm = (cx0 + cx1) / 2;
  b.box(dxm - 0.45, Y, cz1, dxm + 0.45, Y + 1.15, cz1 + 0.07, 0x3a2c20, { faces: 'NESWT' });
  roundel(b, [dxm, Y + 1.15, cz1 + 0.035], 0.45, 'S', 0x3a2c20, {}, 8);
  for (const y of [Y + 0.35, Y + 0.85]) b.box(dxm - 0.45, y, cz1 + 0.07, dxm + 0.45, y + 0.09, cz1 + 0.11, 0xb1b5ba, { faces: 'NESWT' });
  k.glows.push({ x: cx1 + 0.15, y: Y + 1.3, z: cz1 + 0.1, sx: 0.16, sy: 0.22, sz: 0.16, color: '#ffd9a0' });
  k.lights.push({ x: dxm, z: cz1 + 1.5, r: 5, color: '#ffcf8a', k: 0.4 });
  // the guest house, its windows over the hot pools
  const hx0 = cx1 + 1.0, hx1 = kp.x0 - 1.0, hz0 = fk.z1 + 0.3, hz1 = hz0 + 1.9;
  hut(b, hx0, hz0, hx1, hz1, Y, 2.8, 1.1, G, 'x', rows(Y, Y + 2.8, 1.1, 0.55, 0, 1));
  b.box(hx0 + 0.3, Y + 3.0, hz0 + 0.5, hx0 + 0.8, Y + 4.0, hz0 + 1.0, GS, { top: DARK });

  // --- the godswood ---
  const heart: P2 = [gg.x0 - 6.4, gg.z0 + 1.3];
  weirwood(k, heart[0], heart[1], Y, 1);
  const black: P2 = [heart[0] - 2.1, heart[1] - 0.2];
  pool(b, black[0], black[1], 1.0, BLACK_POOL);
  const hot: [number, number, number][] = [[gg.x0 - 3.0, gg.z0 + 0.95, 0.85], [gg.x0 - 1.6, gg.z0 + 2.2, 0.7], [gg.x0 - 3.4, gg.z0 + 2.65, 0.65]];
  for (const [x, z, r] of hot) pool(b, x, z, r, HOT_POOL, DARK_LIT(0.25));
  k.person(heart[0] + 1.3, heart[1] + 1.4, Y);
  k.lights.push({ x: heart[0] + 1, z: heart[1] + 1, r: 8, color: '#ffe2b0', k: 0.35 });

  // old dark trees packed close, kept clear of what stands among them and of the view to the heart tree and the pools
  const keep: [number, number, number][] = [
    [heart[0], heart[1], 2.1], [black[0], black[1], 1.6], ...hot.map(([x, z, r]): [number, number, number] => [x, z, r + 0.7]),
    [(br.x0 + br.x1) / 2, (br.z0 + br.z1) / 2, 2.9], [(fk.x0 + fk.x1) / 2, (fk.z0 + fk.z1) / 2, 3.6],
    // the towers of the inner wall, where they stand into the ward
    ...[1, 2, 3].map((i): [number, number, number] => [I.x0 + ((I.x1 - I.x0) / 4) * i, I.z1 - T / 2, 2.0]),
    [I.x0 + T / 2, (I.z0 + I.z1) / 2, 2.0], [I.x0 + T / 2, I.z1 - T / 2, 2.6],
  ];
  const boxes: [number, number, number, number][] = [[cx0 - 0.4, cz0 - 0.4, cx1 + 0.4, cz1 + 0.9], [hx0 - 0.4, hz0 - 0.4, hx1 + 0.4, hz1 + 0.9], [l.x0, br.z1, l.x0 + 3.2, br.z1 + 2.6]];
  const seen: P2[] = [heart, black, ...hot.map(([x, z]): P2 => [x, z])];
  const free = (x: number, z: number): boolean => {
    if (keep.some(([px, pz, r]) => Math.hypot(x - px, z - pz) < r + 0.6)) return false;
    if (boxes.some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1)) return false;
    // nothing between the camera of the opening view and what it must see: close by, the line of sight passes under a crown
    for (const [px, pz] of seen) {
      const dx = x - px, dz = z - pz, along = dx * 0.669 + dz * 0.743, across = Math.abs(dx * 0.743 - dz * 0.669);
      if (along > 2.6 && along < 11 && across < 1.35) return false;
    }
    return true;
  };
  const x0w = l.x0 + 0.9, x1w = gg.x0 - 1.7, z0w = br.z1 + 0.6, z1w = l.z1 - 0.8;
  let n = 0;
  for (let z = z0w; z <= z1w; z += 1.3) {
    for (let x = x0w + ((Math.round((z - z0w) / 1.3) % 2) * 0.7); x <= x1w; x += 1.35) {
      const px = x + (R() - 0.5) * 0.7, pz = z + (R() - 0.5) * 0.7;
      if (!inWood(wood, px, pz) || !free(px, pz)) continue;
      if (n++ % 9 === 4) k.tree(px, pz, 0.7 + R() * 0.15, false, Y);
      else k.tree(px, pz, 0.85 + R() * 0.3, true, Y);
    }
  }

  // steam over the hot pools
  for (const [x, z, r] of hot) steam.push({ x, y: Y + 0.3, z, r, size: 0.45, shade: 1, every: 0.3, due: 0 });

  // light in the yards by night
  k.lights.push({ x: (eastW + l.x1) / 2, z: cz + 1, r: 9, color: '#ffcf8a', k: 0.5 });
  k.lights.push({ x: (yardW + scx) / 2, z: yardN + 1.5, r: 10, color: '#ffcf8a', k: 0.45 });
  brazier(k, eastW + 1.2, cz + 0.2, Y);
}

/** Whether a place is inside a shape. */
function inWood(shape: P2[], x: number, z: number): boolean {
  let hit = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const a = shape[i], c = shape[j];
    if (a[1] > z !== c[1] > z && x < ((c[0] - a[0]) * (z - a[1])) / (c[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

// ---------------------------------------------------------------------------
// Winter Town
// ---------------------------------------------------------------------------

interface Source { x: number; y: number; z: number; r: number; size: number; shade: number; every: number; due: number }
/** Where smoke and steam rise: filled by the models, and blown by `extras`. */
const steam: Source[] = [];

/** A house of logs or of undressed stone, with a steep roof of snow, its door on the lane side. */
function townHouse(k: Build, x0: number, z0: number, x1: number, z1: number, doorSide: 'N' | 'S', R: () => number, smoke: boolean): void {
  const b = k.b;
  const log = R() < 0.55, wallC = log ? TIMBER : FIELDSTONE;
  const h = 2.6, along: 'x' | 'z' = x1 - x0 >= z1 - z0 ? 'x' : 'z';
  const rise = along === 'x' ? (z1 - z0) * 0.72 : (x1 - x0) * 0.72;
  b.box(x0, 0, z0, x1, h, z1, wallC, { win: HOUSE_WIN, faces: 'NESW', seed: x0 * 0.31 + z0 * 0.17 });
  if (log) for (const y of [0.85, 1.75]) b.box(x0 - 0.04, y, z0 - 0.04, x1 + 0.04, y + 0.08, z1 + 0.04, TIMBER_DARK, { faces: 'NESW' });
  snowRoof(b, x0, z0, x1, z1, h, rise, wallC, along, 0.3);
  const dz = doorSide === 'S' ? z1 : z0;
  door(b, x0 + (x1 - x0) * (0.3 + R() * 0.4), dz, 0, 0.75, 1.75, doorSide);
  // a chimney of stone at one end, above the ridge
  const cx = R() < 0.5 ? x0 + 0.5 : x1 - 0.5, cz = (z0 + z1) / 2 + (R() - 0.5) * 0.6, top = h + rise + 0.6;
  b.box(cx - 0.28, h + 0.4, cz - 0.28, cx + 0.28, top, cz + 0.28, GS, { top: DARK });
  if (smoke) steam.push({ x: cx, y: top + 0.1, z: cz, r: 0.2, size: 0.6, shade: 0.82, every: 0.45, due: R() });
  // logs stacked against one end
  if (R() < 0.6) {
    const wx = R() < 0.5 ? x0 - 0.55 : x1 + 0.05, wz = (z0 + z1) / 2;
    b.box(wx, 0, wz - 0.6, wx + 0.5, 0.75, wz + 0.6, 0xa47c50, { top: TIMBER });
  }
}

function winterTown(k: Build, l: Lot): void {
  const b = k.b, R = rng(0x2b71c4);
  const lane = l.z0 + 5, side = 1.05;
  // a lane along the town, and one down to the square
  const lx0 = l.x0 + 7.8, lx1 = lx0 + 1.8;
  area(k, rect(l.x0 - 0.6, lane - side, l.x1, lane + side), MUD, 0.035);
  area(k, rect(lx0, lane + side, lx1, l.z1 - 1.5), MUD, 0.035);
  const north: [number, number][] = [[0.4, 3.4], [3.9, 6.9], [7.5, 10.7], [11.2, 13.6], [14.0, 15.7]];
  const south: [number, number][] = [[0.4, 3.2], [3.7, lx0 - l.x0 - 0.3], [lx1 - l.x0 + 0.3, 12.9], [13.4, 15.7]];
  north.forEach(([a, c], i) => townHouse(k, l.x0 + a, l.z0 + 0.4, l.x0 + c, lane - side - 0.35, 'S', R, i % 2 === 0));
  south.forEach(([a, c], i) => townHouse(k, l.x0 + a, lane + side + 0.35, l.x0 + c, l.z1 - 1.6, 'N', R, i === 1));
  // a sledge in the lane, and barrels by a door
  const sx = l.x0 + 9.0, sz = lane + 0.2;
  for (const s of [-1, 1]) b.box(sx - 1.1, 0.04, sz + s * 0.45 - 0.06, sx + 1.1, 0.16, sz + s * 0.45 + 0.06, TIMBER_DARK, { faces: 'NESWT' });
  b.box(sx - 0.9, 0.16, sz - 0.55, sx + 0.8, 0.45, sz + 0.55, TIMBER);
  b.box(sx - 0.7, 0.45, sz - 0.45, sx + 0.5, 0.85, sz + 0.45, 0xa47c50);
  b.beam([sx + 1.1, 0.1, sz], [sx + 1.6, 0.3, sz], 0.06, 0.06, TIMBER_DARK);
  for (const [dx, dz] of [[3.2, -0.6], [3.6, -0.2]]) b.cyl(l.x0 + dx, lane + dz, 0, 0.8, 0.3, 0.3, 8, 0x7b5a3a, { cap: 0x6a4b30 });
  for (const [dx, dz] of [[1.5, 0.3], [6.2, -0.4], [12.5, 0.4], [14.6, -0.2]]) k.person(l.x0 + dx, lane + dz);
  k.lights.push({ x: (l.x0 + l.x1) / 2, z: lane, r: 12, color: '#ffcf8a', k: 0.5 });
  k.lights.push({ x: l.x0 + 3, z: lane, r: 8, color: '#ffcf8a', k: 0.4 });
}

/** The alehouse the books call the Smoking Log: a big timber house with a great chimney, a lantern at its door, and benches. */
function smokingLog(k: Build, l: Lot): void {
  const b = k.b, x0 = l.x0 + 0.4, x1 = l.x1 - 0.4, z0 = l.z0 + 0.2, z1 = l.z1 - 1.0;
  const eave = 4.6, rise = l.top - 1.0 - eave, zc = (z0 + z1) / 2;
  b.box(x0 - 0.08, 0, z0 - 0.08, x1 + 0.08, 0.6, z1 + 0.08, FIELDSTONE, { top: SNOW });
  b.box(x0, 0, z0, x1, eave, z1, TIMBER, { win: { cell: 1.5, storey: eave / 2, lit: 0.65, kind: 0 }, faces: 'NESW', seed: 0.66 });
  // the frame of the timbers on its south face and its east face
  const bays = Math.max(1, Math.round((x1 - x0) / 1.5)), bay = (x1 - x0) / bays;
  for (let i = 0; i <= bays; i++) b.box(x0 + i * bay - 0.08, 0.6, z1, x0 + i * bay + 0.08, eave, z1 + 0.06, TIMBER_DARK, { faces: 'NESWT' });
  b.box(x0, eave / 2 - 0.1, z1, x1, eave / 2 + 0.1, z1 + 0.06, TIMBER_DARK, { faces: 'NESWTB' });
  for (const z of [z0, z1]) b.box(x1, 0.6, z - 0.08, x1 + 0.06, eave, z + 0.08, TIMBER_DARK, { faces: 'NESWT' });
  snowRoof(b, x0, z0, x1, z1, eave, rise, TIMBER, 'x', 0.4);
  // the great chimney at the west end, and its smoke
  b.box(x0 - 0.7, 0, zc - 0.75, x0 + 0.3, l.top, zc + 0.75, FIELDSTONE, { top: DARK });
  steam.push({ x: x0 - 0.2, y: l.top + 0.1, z: zc, r: 0.4, size: 0.85, shade: 0.78, every: 0.25, due: 0 });
  // the door, the lantern beside it, and the board over it
  const dx = x0 + bay * 2;
  door(b, dx, z1 + 0.06, 0, 1.1, 1.85, 'S', 0x3a2a1c, 0.75);
  b.box(dx + 0.75, 1.75, z1 + 0.06, dx + 0.95, 1.95, z1 + 0.35, IRONWORK, { faces: 'NESWTB' });
  k.glows.push({ x: dx + 0.85, y: 1.55, z: z1 + 0.32, sx: 0.18, sy: 0.24, sz: 0.18, color: '#ffd28a' });
  k.lights.push({ x: dx, z: z1 + 2.2, r: 9, color: '#ffcf8a', k: 0.6 });
  const signW = x1 - x0 - 0.5;
  b.box((x0 + x1) / 2 - signW / 2 - 0.08, eave / 2 - 0.42, z1 + 0.06, (x0 + x1) / 2 + signW / 2 + 0.08, eave / 2 + 0.42, z1 + 0.16, TIMBER_DARK, { faces: 'NESWTB' });
  k.sign('winterfell-inn', (x0 + x1) / 2, eave / 2, z1 + 0.19, 0, 1, 0.66, signW);
  // benches along the front, and the people on them
  for (const bx of [x0 + 0.9, x1 - 1.4]) {
    b.box(bx - 0.7, 0.42, z1 + 0.25, bx + 0.7, 0.52, z1 + 0.65, TIMBER, { faces: 'NESWTB' });
    for (const s of [-1, 1]) b.box(bx + s * 0.55 - 0.06, 0, z1 + 0.35, bx + s * 0.55 + 0.06, 0.42, z1 + 0.55, TIMBER_DARK, { faces: 'NESW' });
  }
  k.person(x0 + 0.7, z1 + 0.95);
  k.person(x1 - 1.6, z1 + 1.1);
  k.person(dx + 1.6, z1 + 1.6);
}

/** Winter Town's market square: paved, with a well and stalls on its north and west edges, open to the south-east where a hero stands. */
function square(k: Build): void {
  const b = k.b, R = rng(0x91d5e3);
  const houses = lotOf('wt-houses'), inn = lotOf('wt-inn');
  const x0 = inn.x1 + 0.3, x1 = 43.0, z0 = houses.z1 - 1.4, z1 = -44.3;
  area(k, rect(x0, z0, x1, z1), PAVE, 0.04);
  // the well, in the square's north-west corner
  const wx = x0 + 0.65, wz = z0 + 1.1;
  b.cyl(wx, wz, 0, 0.7, 0.5, 0.5, 8, GS, { cap: 0x22292c });
  for (const s of [-1, 1]) b.box(wx + s * 0.45 - 0.06, 0.7, wz - 0.06, wx + s * 0.45 + 0.06, 1.7, wz + 0.06, TIMBER, { faces: 'NESW' });
  b.box(wx - 0.65, 1.7, wz - 0.4, wx + 0.65, 1.85, wz + 0.4, ROOF_SNOW, { faces: 'NESWTB' });
  // stalls with striped awnings
  const stall = (x: number, z: number, facing: 'S' | 'E', color: number): void => {
    const hx = facing === 'S' ? 1.0 : 0.6, hz = facing === 'S' ? 0.6 : 1.0;
    b.box(x - hx, 0, z - hz, x + hx, 0.85, z + hz, TIMBER);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(x + sx * hx - 0.05, 0.85, z + sz * hz - 0.05, x + sx * hx + 0.05, 2.0, z + sz * hz + 0.05, TIMBER_DARK, { faces: 'NESW' });
    const lo = 1.85, hi = 2.25;
    if (facing === 'S') slab(b, [x, hi, z - hz - 0.1], [x, lo, z + hz + 0.35], hx + 0.15, 0.06, color, { under: 0xe9e3d6 });
    else slab(b, [x - hx - 0.1, hi, z], [x + hx + 0.35, lo, z], hz + 0.15, 0.06, color, { under: 0xe9e3d6 });
    // what is for sale
    b.box(x - hx + 0.2, 0.85, z - hz + 0.2, x + hx - 0.2, 1.05, z + hz - 0.2, [0xc9853a, 0x8a9b5a, 0xd7c9a4][Math.floor(R() * 3)], { faces: 'NESWT' });
  };
  stall(x0 + 3.3, z0 + 0.75, 'S', 0xa8382f);
  stall(x0 + 5.6, z0 + 0.75, 'S', 0x3c6a8f);
  stall(x0 + 0.75, z1 - 3.0, 'E', 0x4f7d4a);
  stall(x0 + 0.75, z1 - 0.9, 'E', 0xa8382f);
  for (const [x, z] of [[x0 + 3.1, z0 + 2.0], [x0 + 6.0, z0 + 1.9], [x0 + 2.2, z1 - 2.2], [x0 + 1.6, z0 + 1.9]]) k.person(x, z);
  k.lights.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, r: 11, color: '#ffcf8a', k: 0.45 });
}

// ---------------------------------------------------------------------------
// What this file hands over
// ---------------------------------------------------------------------------

export const MODELS: Record<string, Model> = {
  'wf-outer-n': (k) => outerWall(k),
  'wf-inner-n': (k) => innerWall(k),
  'wf-ward': ward,
  'wf-keep': greatKeep,
  'wf-hall': greatHall,
  'wf-first-keep': firstKeep,
  'wf-broken': brokenTower,
  'wf-bell': bellTower,
  'wf-glass': glassGardens,
  'wf-gatehouse': gatehouse,
  'wt-houses': winterTown,
  'wt-inn': smokingLog,
};

export const COVERS: string[] = ['wf-outer-s', 'wf-outer-w', 'wf-outer-e', 'wf-inner-s', 'wf-inner-w', 'wf-inner-e'];

export const SIGNS: SignDef[] = [
  nameSign('winterfell-name', 'Winterfell'),
  nameSign('winterfell-town', 'Winter Town'),
  nameSign('winterfell-inn', 'The Smoking Log'),
];

export const FLOORED: string[] = ['winterfell'];

export function heightAt(x: number, z: number): number {
  if (x > I.x0 && x < I.x1 && z > I.z0 && z < I.z1) return Y;
  if (x > O.x0 + T && x < O.x1 - T && z > O.z0 + T && z < O.z1 - T) return -0.9;
  return 0;
}

export function extras(k: Build): void {
  const b = k.b;
  // the moat: cold dark water inside the outer wall, a bed under it, and a few floes of ice
  water(k, WET.winterfell, { color: MOAT, quay: GS, drop: 0.9 });
  flat(b, WET.winterfell, -1.65, MOAT_BED);
  for (const [x, z, rx, rz] of [[-36.2, -66, 1.1, 0.7], [-36.6, -56.5, 0.8, 0.6], [-22, -72.3, 1.3, 0.7], [-6, -72.6, 0.9, 0.55], [4.2, -67, 0.6, 0.9]]) {
    flat(b, oval(x, z, rx, rz, 7), -0.86, ICE_TOP);
  }

  // the names: Winterfell's beside the kingsroad, south of the gate's apron; Winter Town's at its square
  nameBoard(k, 'winterfell-name', 10.3, -54.4, 0, [0.94, 0, 0.34], 1.3);
  square(k);
  // north-east of the square, facing south: further east the Giant's Lance would hide it from the opening view
  nameBoard(k, 'winterfell-town', 41.0, -55.2, 0, [0.34, 0, 0.94], 1.3);

  // smoke from the chimneys and steam off the pools
  const smoke = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 180);
  k.group.add(smoke.mesh);
  const R = rng(0x6a09e6), at = new THREE.Vector3(), wind = new THREE.Vector3(0.35, 0.1, 0.15);
  const sources = steam.splice(0);
  k.each((dt) => {
    for (const s of sources) {
      s.due -= dt;
      if (s.due > 0) continue;
      s.due = s.every * (0.7 + R() * 0.6);
      smoke.puff(at.set(s.x + (R() - 0.5) * s.r * 2, s.y, s.z + (R() - 0.5) * s.r * 2), wind, s.size, s.shade);
    }
    smoke.update(dt);
  });

  // on the development server, say if anything of this file stands in a road
  if (import.meta.env.DEV) {
    const gl = lotOf('wf-gatehouse');
    const ask: [string, number, number, number, number][] = [
      ['the apron', gl.x1, gl.z0 - 2, 11.7, gl.z1 + 2], ['the board', 8.6, -58.8, 11.9, -50.0],
      ['the north-east tower', O.x1 - 2.6, O.z0 - 1.0, O.x1 + 1.0, O.z0 + 2.6], ['Winter Town', 23.4, -64, 40, -48],
    ];
    for (const [what, x0, z0, x1, z1] of ask) {
      const hit = inStreet(k, x0, z0, x1, z1);
      if (hit) console.warn(`Westeros: ${what} of Winterfell stands in a road at (${hit.x.toFixed(1)}, ${hit.z.toFixed(1)}).`);
    }
  }
}

