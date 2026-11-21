// Lower Gotham under the upper city's wall: the Clock Tower, the Gotham Gazette with its giant typewriter, the
// Underground Highway's boarded mouth in the bastion and the court before it, and the dressing of Grand Avenue's
// ramp and the building that stands over it: shops in the ramp's wall, an arcade of pointed arches between its
// piers, a great arch where the avenue goes in, and crowded roofs.
//
// What is the comics' and what is this tile's own drawing:
// - Gotham Clock Tower (first in Showcase '94 #12): built by Wayne Enterprises, Oracle's home. The comics give it
//   no look beyond "a large clock tower", so its look is the tile's own: a slim tower of Pinkney's dark stone with
//   rounded corner shafts and gargoyles, four lit dials, an open belfry of pointed arches with a bell in it over a
//   ledge all round, deep eaves on its south-east side for Man-Bat to hang from, and a steep copper roof.
// - The Gotham Gazette (the city's paper since Batman #4, 1941): its building's look is not given, so it is the
//   tile's own: brick and stone, the name in plain capitals along its east cornice, a loading dock with a van and
//   bundled papers, and a giant typewriter on its roof after the giant props of the Golden Age's roofs.
// - The Underground Highway (Batman #471): begun from Fourth Avenue in the 1960s and abandoned. Only its boarded
//   portal is shown, with a green light behind the boards, as the task asks.
// - The shops in the ramp's wall, the arcade over the avenue, the roofs: the tile's own.

import type { V3 } from '../../engine/geo';
import { interior, rng, type GeoBuilder } from '../../engine/geo';
import { flat, rect } from '../../engine/ground';
import { lathe } from '../../engine/parts';
import { standingCar } from '../../engine/props';
import { chamfered, drum, face3, prism, railing, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import {
  AMBER, BRASS, BRICK, BRICK_DARK, COPPER, COPPER_DARK, DARK, GOTHIC_WIN, IRON, IRON_DARK, LEAD, SLATE, SODIUM, STEEL, STONE,
  STONE_DARK, STONE_LIGHT, STONE_TRIM, TENEMENT_WIN, TIMBER, TIMBER_DARK, TIMBER_PALE,
  fireEscape, gargoyle, gasLamp, nameSign, neon, waterTank,
} from './look';
import type { Model, Place } from './models';
import { LOTS, RAMP, TURNS, avenueY, lotOf, type Lot } from './plan';
import { open } from './space';

const H = Math.PI / 2, Q = Math.PI / 4;

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------

const board = (id: string, text: string, color: string, ink: string, px: number, hpx = 52): SignDef => ({ id, lines: [text], color, ink, aspect: px / hpx, kind: 'board', size: [px, hpx] });
const lit = (id: string, text: string, color: string, ink: string, px: number): SignDef => ({ id, lines: [text], color, ink, aspect: px / 52, kind: 'box', size: [px, 52] });

/** The shops in the ramp's wall, west to east, as the ramp falls: each a sign, and the colour of its lit window. */
const SHOPS: { sign: SignDef; glass: number }[] = [
  { sign: lit('bayside-bail', 'BAIL BONDS', '#f4e6b4', '#3a2a10', 300), glass: 0x6b4f2a },
  { sign: lit('bayside-pawn', 'PAWN', '#f0c98a', '#3d230c', 160), glass: 0x5f4630 },
  { sign: lit('bayside-oysters', 'OYSTERS', '#d9f0f2', '#163a44', 240), glass: 0x3f5a62 },
  { sign: lit('bayside-locksmith', 'LOCKSMITH', '#efe8d8', '#2b2620', 280), glass: 0x5a4a38 },
  { sign: lit('bayside-shoes', 'SHOE REPAIR', '#e8d8c0', '#4a2414', 320), glass: 0x604430 },
];

export const SIGNS: SignDef[] = [
  nameSign('bayside-clock-tower', 'Clock Tower'),
  nameSign('bayside-gazette', 'Gotham Gazette'),
  board('bayside-highway', 'UNDERGROUND HIGHWAY', '#8d8f95', '#1d1f24', 620),
  board('bayside-closed', 'CLOSED', '#e6dfcc', '#7a1f1a', 190, 60),
  board('bayside-hotel', 'HOTEL', '#e9e0c8', '#8a1f22', 260, 70),
  board('bayside-subway', 'SUBWAY', '#2f6a44', '#eef6e8', 200, 52),
  board('bayside-extra', 'EXTRA!', '#f4f1e8', '#1a1a1e', 160, 64),
  ...SHOPS.map((s) => s.sign),
];
const ASPECT = new Map(SIGNS.map((s) => [s.id, s.aspect]));

/** Hangs a sign on a wall whose face is at (x, z) and faces (nx, nz): a thin dark board just off the wall, and the sign 0.03 in front of it. */
function hang(k: Build, id: string, x: number, y: number, z: number, nx: number, nz: number, h: number, maxW = Infinity, backing = DARK): void {
  const w = k.sign(id, x + nx * 0.14, y, z + nz * 0.14, nx, nz, h, maxW);
  const hh = Math.min(h, w / (ASPECT.get(id) ?? 1));
  k.b.obox(x + nx * 0.06, y, z + nz * 0.06, w / 2 + 0.1, hh / 2 + 0.08, 0.05, Math.atan2(-nx, nz), backing, { faces: 'NESWTB' });
}

// ---------------------------------------------------------------------------
// Walls and arches
// ---------------------------------------------------------------------------

/** A wall's own frame: `u` runs along it, left to right as seen from outside, and `w` outwards from (x, z). */
interface Frame { x: number; z: number; ux: number; uz: number; wx: number; wz: number }
const at = (f: Frame, u: number, y: number, w: number): V3 => [f.x + f.ux * u + f.wx * w, y, f.z + f.uz * u + f.wz * w];
const dir = (f: Frame, nu: number, ny: number, nw: number): V3 => [f.ux * nu + f.wx * nw, ny, f.uz * nu + f.wz * nw];
function facing(x: number, z: number, face: 'N' | 'E' | 'S' | 'W'): Frame {
  if (face === 'S') return { x, z, ux: 1, uz: 0, wx: 0, wz: 1 };
  if (face === 'N') return { x, z, ux: -1, uz: 0, wx: 0, wz: -1 };
  if (face === 'E') return { x, z, ux: 0, uz: -1, wx: 1, wz: 0 };
  return { x, z, ux: 0, uz: 1, wx: -1, wz: 0 };
}

/** A box given in a wall's frame. */
function fbox(b: GeoBuilder, f: Frame, u0: number, u1: number, y0: number, y1: number, w0: number, w1: number, color: number, faces = 'NESWT', o: { win?: ReturnType<typeof interior> } = {}): void {
  const a = at(f, u0, y0, w0), c = at(f, u1, y1, w1);
  b.box(Math.min(a[0], c[0]), y0, Math.min(a[2], c[2]), Math.max(a[0], c[0]), y1, Math.max(a[2], c[2]), color, { faces, win: o.win });
}

type UY = [number, number];

/** An arch's line, from its left foot over its head to its right foot: round (a half ellipse) or pointed. */
function curve(ul: number, ur: number, ys: number, rise: number, pointed: boolean, n: number): UY[] {
  const pts: UY[] = [];
  if (!pointed) {
    for (let i = 0; i <= n; i++) {
      const a = Math.PI * (1 - i / n);
      pts.push([(ul + ur) / 2 + (Math.cos(a) * (ur - ul)) / 2, ys + Math.sin(a) * rise]);
    }
    return pts;
  }
  // two arcs, each drawn from the other foot, and squashed to the rise asked for
  const span = ur - ul, m = Math.max(2, Math.round(n / 2)), s60 = Math.sin(Math.PI / 3);
  for (let i = 0; i <= m; i++) { const a = (i / m) * (Math.PI / 3); pts.push([ur - span * Math.cos(a), ys + (rise * Math.sin(a)) / s60]); }
  for (let i = m - 1; i >= 0; i--) { const a = (i / m) * (Math.PI / 3); pts.push([ul + span * Math.cos(a), ys + (rise * Math.sin(a)) / s60]); }
  return pts;
}

/** The wall over an arch, from its line up to `top`, between `w0` and `w1`, with the soffit under it. */
function spandrel(b: GeoBuilder, f: Frame, pts: UY[], top: number, w0: number, w1: number, color: number, soffit: number, back = true): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ua, ya] = pts[i], [ub, yb] = pts[i + 1];
    if (top - Math.max(ya, yb) > -0.01) {
      b.quad(at(f, ua, ya, w1), at(f, ub, yb, w1), at(f, ub, top, w1), at(f, ua, top, w1), dir(f, 0, 0, 1), color);
      if (back) b.quad(at(f, ub, yb, w0), at(f, ua, ya, w0), at(f, ua, top, w0), at(f, ub, top, w0), dir(f, 0, 0, -1), color);
    }
    const du = ub - ua, dy = yb - ya, l = Math.hypot(du, dy) || 1;
    b.quad(at(f, ua, ya, w0), at(f, ub, yb, w0), at(f, ub, yb, w1), at(f, ua, ya, w1), dir(f, dy / l, -du / l, 0), soffit);
  }
}

/** A moulded ring round an arch, `thick` wide, between `w0` and `w1`. */
function archivolt(b: GeoBuilder, f: Frame, pts: UY[], thick: number, w0: number, w1: number, color: number): void {
  const n = pts.length;
  const out = pts.map((p, i): UY => {
    const a = pts[Math.max(0, i - 1)], c = pts[Math.min(n - 1, i + 1)], tu = c[0] - a[0], ty = c[1] - a[1], l = Math.hypot(tu, ty) || 1;
    return [p[0] - (ty / l) * thick, p[1] + (tu / l) * thick];
  });
  for (let i = 0; i + 1 < n; i++) {
    const [ua, ya] = pts[i], [ub, yb] = pts[i + 1], [oa, za] = out[i], [ob, zb] = out[i + 1];
    b.quad(at(f, ua, ya, w1), at(f, ub, yb, w1), at(f, ob, zb, w1), at(f, oa, za, w1), dir(f, 0, 0, 1), color);
    const du = ub - ua, dy = yb - ya, l = Math.hypot(du, dy) || 1;
    b.quad(at(f, ua, ya, w0), at(f, ub, yb, w0), at(f, ub, yb, w1), at(f, ua, ya, w1), dir(f, dy / l, -du / l, 0), color);
    const eu = ob - oa, ey = zb - za, m = Math.hypot(eu, ey) || 1;
    b.quad(at(f, oa, za, w1), at(f, ob, zb, w1), at(f, ob, zb, w0), at(f, oa, za, w0), dir(f, -ey / m, eu / m, 0), color);
  }
}

/** The flat head of an arched opening, filled from the middle of its springing line. */
function head(b: GeoBuilder, f: Frame, pts: UY[], w: number, color: number, o: { win?: ReturnType<typeof interior> } = {}): void {
  const mid: UY = [(pts[0][0] + pts[pts.length - 1][0]) / 2, pts[0][1]];
  for (let i = 0; i + 1 < pts.length; i++) face3(b, at(f, mid[0], mid[1], w), at(f, pts[i][0], pts[i][1], w), at(f, pts[i + 1][0], pts[i + 1][1], w), dir(f, 0, 0, 1), color, o);
}

// ---------------------------------------------------------------------------
// The Clock Tower
// ---------------------------------------------------------------------------

/** The tower's heights, and how far each stage reaches from its middle. */
const CT = { base: 5.4, shaft: 4.6, stage: 4.8, ledge: 5.45, bel: 4.0, yBand: 12, yShaft: 12.5, yBand2: 32, yStage: 32.6, yLedge: 43.4, yBel: 44, yEave: 50, yRoof: 50.45, eaveSE: 6.1, eave: 4.7, dial: 3.0, dialY: 38 };
const DIAL = 0xe9dfc2;

/** A clock's face on a wall: a pale stone ring, a lit dial, twelve marks and two hands set to no hour in particular. */
function dial(k: Build, f: Frame, w0: number, cy: number, r: number, seed: number): void {
  const b = k.b, n = dir(f, 0, 0, 1), R = rng(seed);
  const disc = (rr: number, w: number, color: number, o: { win?: ReturnType<typeof interior> } = {}, sides = 16): void => {
    const p = (i: number): V3 => at(f, Math.cos((i / sides) * Math.PI * 2) * rr, cy + Math.sin((i / sides) * Math.PI * 2) * rr, w0 + w);
    for (let i = 1; i + 1 < sides; i++) face3(b, p(0), p(i), p(i + 1), n, color, o);
  };
  disc(r + 0.42, 0.04, STONE_TRIM);
  disc(r, 0.09, DIAL, { win: interior(1.9) });
  const spoke = (a: number, r0: number, r1: number, hw0: number, hw1: number, w: number, color: number): void => {
    const c = Math.cos(a), s = Math.sin(a), P = (rr: number, hw: number): V3 => at(f, c * rr - s * hw, cy + s * rr + c * hw, w0 + w);
    b.quad(P(r0, -hw0), P(r1, -hw1), P(r1, hw1), P(r0, hw0), n, color);
  };
  for (let i = 0; i < 12; i++) spoke((i / 12) * Math.PI * 2, r - (i % 3 === 0 ? 0.7 : 0.5), r - 0.14, 0.09, 0.09, 0.12, DARK);
  spoke(R() * Math.PI * 2, -0.3, r * 0.55, 0.13, 0.07, 0.14, DARK);
  spoke(R() * Math.PI * 2, -0.4, r * 0.86, 0.09, 0.04, 0.16, DARK);
  disc(0.22, 0.18, BRASS, {}, 6);
}

const clockTower: Model = (k, l) => {
  const b = k.b, R = rng(4417), cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, y0 = l.base;
  const faces = ['S', 'E', 'N', 'W'] as const;
  const corners: [number, number][] = [[1, 1], [-1, 1], [-1, -1], [1, -1]];

  // the base: three storeys of dark stone on a plinth course, a buttress at each corner
  b.box(cx - CT.base, y0, cz - CT.base, cx + CT.base, CT.yBand, cz + CT.base, STONE_DARK, { win: GOTHIC_WIN, seed: R(), faces: 'NESW' });
  b.box(cx - CT.base - 0.2, y0, cz - CT.base - 0.2, cx + CT.base + 0.2, y0 + 1.2, cz + CT.base + 0.2, STONE, { faces: 'NESWT' });
  for (const [sx, sz] of corners) {
    const px = cx + sx * CT.base, pz = cz + sz * CT.base;
    b.box(px - 0.8, y0, pz - 0.8, px + 0.8, 10.6, pz + 0.8, STONE, { faces: 'NESW' });
    b.cyl(px, pz, 10.6, 11.9, 0.8 * Math.SQRT2, 0.05, 4, SLATE, { phase: Q, cap: false });
  }
  b.box(cx - 5.75, CT.yBand, cz - 5.75, cx + 5.75, CT.yShaft, cz + 5.75, STONE_TRIM, { faces: 'NESWTB' });
  // a gargoyle at each corner of the band, looking out over Lower Gotham
  for (const [sx, sz] of corners) gargoyle(b, cx + sx * 5.05, CT.yShaft, cz + sz * 5.05, Math.atan2(sz, sx), 1.05);

  // doors on the south and the east, under round arches, with lanterns either side
  for (const face of ['S', 'E'] as const) {
    const f = facing(cx, cz, face), w = CT.base + 0.2;
    const arch = curve(-0.85, 0.85, 2.9, 0.85, false, 6);
    fbox(b, f, -0.85, 0.85, y0, 2.9, w, w + 0.04, 0x3a2a1c, face, { win: interior(1.4) });
    head(b, f, arch, w + 0.04, 0x3a2a1c, { win: interior(1.4) });
    archivolt(b, f, arch, 0.32, w, w + 0.32, STONE_TRIM);
    for (const s of [-1, 1]) fbox(b, f, s > 0 ? 0.85 : -1.17, s > 0 ? 1.17 : -0.85, y0, 2.9, w, w + 0.32, STONE_TRIM);
    fbox(b, f, -1.5, 1.5, y0, y0 + 0.3, w, w + 0.9, STONE_LIGHT);
    for (const s of [-1, 1]) {
      b.beam(at(f, s * 1.75, 3.5, w), at(f, s * 1.75, 3.3, w + 0.5), 0.06, 0.06, IRON);
      gasLamp(k, ...(at(f, s * 1.75, 3.0, w + 0.55) as [number, number, number]), 0, AMBER);
    }
  }
  hang(k, 'bayside-clock-tower', cx, 5.0, cz + CT.base, 0, 1, 0.8, 7.5);

  // the shaft: chamfered corners, Pinkney's rounded edges, tall windows, and two ribs up each face
  prism(b, chamfered(cx, cz, CT.shaft, 0.9), CT.yShaft, CT.yBand2, STONE, { win: GOTHIC_WIN, seed: R(), top: false });
  for (const face of faces) {
    const f = facing(cx, cz, face);
    for (const u of [-2.2, 2.2]) fbox(b, f, u - 0.25, u + 0.25, CT.yShaft, CT.yBand2, CT.shaft - 0.05, CT.shaft + 0.25, STONE_LIGHT, 'NESW');
  }
  b.box(cx - 5.2, CT.yBand2, cz - 5.2, cx + 5.2, CT.yStage, cz + 5.2, STONE_TRIM, { faces: 'NESWTB' });

  // the clock stage: round shafts at its corners, a dial on every face, a corbel table under the ledge
  b.box(cx - CT.stage, CT.yStage, cz - CT.stage, cx + CT.stage, CT.yLedge, cz + CT.stage, STONE, { faces: 'NESW' });
  for (const [sx, sz] of corners) b.cyl(cx + sx * CT.stage, cz + sz * CT.stage, CT.yStage, CT.yLedge, 0.58, 0.58, 8, STONE_LIGHT, { cap: false });
  faces.forEach((face, i) => {
    const f = facing(cx, cz, face);
    dial(k, f, CT.stage, CT.dialY, CT.dial, 77 + i * 13);
    for (const u of [-2.6, 2.6]) fbox(b, f, u - 0.3, u + 0.3, CT.yLedge - 0.8, CT.yLedge, CT.stage - 0.05, CT.ledge - 0.1, STONE_TRIM, 'NESWB');
  });
  // the ledge all round the belfry: the stage `belfry` is its top
  b.box(cx - CT.ledge, CT.yLedge, cz - CT.ledge, cx + CT.ledge, CT.yBel, cz + CT.ledge, STONE_TRIM, { faces: 'NESWTB' });

  // the belfry: open pointed arches, two to a face, on piers at its corners and a mullion in each face
  for (const [sx, sz] of corners) {
    const xa = cx + sx * (CT.bel - 1.1), xb = cx + sx * CT.bel, za = cz + sz * (CT.bel - 1.1), zb = cz + sz * CT.bel;
    b.box(Math.min(xa, xb), CT.yBel, Math.min(za, zb), Math.max(xa, xb), CT.yEave, Math.max(za, zb), STONE, { faces: 'NESW' });
  }
  for (const face of faces) {
    const f = facing(cx, cz, face);
    fbox(b, f, -0.35, 0.35, CT.yBel, CT.yEave, CT.bel - 0.6, CT.bel, STONE, 'NESW');
    for (const [ul, ur] of [[-(CT.bel - 1.1), -0.35], [0.35, CT.bel - 1.1]]) spandrel(b, f, curve(ul, ur, 47.0, 1.9, true, 6), CT.yEave, CT.bel - 0.6, CT.bel, STONE, STONE_DARK);
  }
  // the bell, on its headstock
  lathe(b, cx, cz, [[1.45, 45.4], [1.38, 45.8], [1.05, 47.3], [0.75, 48.0], [0.25, 48.25]], 8, 0x8a6a3a);
  b.cyl(cx, cz, 48.2, 48.4, 0.3, 0.3, 6, 0x8a6a3a);
  b.box(cx - CT.bel + 1.1, 48.4, cz - 0.25, cx + CT.bel - 1.1, 48.85, cz + 0.25, TIMBER_DARK, { faces: 'NESWTB' });
  k.glows.push({ x: cx, y: 49.4, z: cz, sx: 0.4, sy: 0.25, sz: 0.4, color: AMBER });

  // the eaves: deep over the ledge on the south-east, where something can hang from their underside
  b.box(cx - CT.eave, CT.yEave, cz - CT.eave, cx + CT.eaveSE, CT.yRoof, cz + CT.eaveSE, LEAD, { faces: 'NESWTB' });
  for (const face of ['S', 'E'] as const) {
    const f = facing(cx, cz, face);
    for (const u of [-2.3, 2.3]) b.beam(at(f, u, 48.5, CT.bel), at(f, u, CT.yEave - 0.05, CT.eaveSE - 0.4), 0.11, 0.11, TIMBER_DARK);
  }
  // the roof: a steep pyramid of copper, a lucarne in each face, and a finial with a vane
  b.cyl(cx, cz, CT.yRoof, l.top, 4.4 * Math.SQRT2, 0.12, 4, COPPER, { phase: Q, cap: false });
  for (const face of faces) {
    const f = facing(cx, cz, face), w1 = 3.9;
    fbox(b, f, -0.6, 0.6, 50.9, 52.3, 1.8, w1, COPPER_DARK, 'NESW');
    face3(b, at(f, -0.6, 52.3, w1), at(f, 0.6, 52.3, w1), at(f, 0, 53.0, w1), dir(f, 0, 0, 1), COPPER_DARK);
    for (const s of [-1, 1]) b.quad(at(f, s * 0.7, 52.25, w1 + 0.1), at(f, 0, 53.05, w1 + 0.1), at(f, 0, 53.05, 1.8), at(f, s * 0.7, 52.25, 1.8), dir(f, s * 0.7, 0.7, 0), COPPER);
    fbox(b, f, -0.3, 0.3, 51.2, 52.0, w1, w1 + 0.03, 0x4a3420, face, { win: interior(2) });
  }
  // the finial ends in a vane: an arrow at its very tip, with a tail fin, turned a little off the wind
  const vy = l.top + 3.5;
  b.cyl(cx, cz, l.top, vy, 0.2, 0.05, 6, BRASS, { cap: false });
  b.cyl(cx, cz, l.top + 1.0, l.top + 1.6, 0.34, 0.34, 6, BRASS);
  b.moved(cx, vy, cz, 0.5, () => {
    b.box(-1.0, 0, -0.03, 1.0, 0.16, 0.03, BRASS, { faces: 'NESWTB' });
    for (const s of [-1, 1]) {
      face3(b, [1.0, -0.2, s * 0.031], [1.0, 0.36, s * 0.031], [1.5, 0.08, s * 0.031], [0, 0, s], BRASS);
      b.quad([-1.0, -0.25, s * 0.031], [-0.55, -0.1, s * 0.031], [-0.55, 0.3, s * 0.031], [-1.0, 0.45, s * 0.031], [0, 0, s], BRASS);
    }
  });
  k.lights.push({ x: cx + 6.5, z: cz + 6.5, r: 11, color: AMBER, k: 0.5 });
  k.lights.push({ x: cx - 5, z: cz + 8, r: 8, color: SODIUM, k: 0.4 });
};

// ---------------------------------------------------------------------------
// The Gotham Gazette, and its typewriter
// ---------------------------------------------------------------------------

/** The Gazette's body within its lot, and where the typewriter stands on its roof. */
function gazetteOf(l: Lot): { x0: number; x1: number; z0: number; z1: number; roof: number; tx: number; tz: number } {
  const x0 = l.x0 + 0.2, x1 = l.x0 + 8, z0 = l.z0 + 0.8, z1 = l.z1 - 0.6;
  return { x0, x1, z0, z1, roof: 12.5, tx: (x0 + x1) / 2, tz: (z0 + z1) / 2 + 0.1 };
}

/** The typewriter's keyboard deck: how high it is over the roof this far towards its front. */
const deckY = (w: number): number => 1.0 + ((3.6 - w) / 3.2) * 2.0;
const KEY_ROWS = [3.1, 2.3, 1.5, 0.7];

/** A giant typewriter of the old kind, its keys towards the south: big enough for a figure to stand on its keys. */
function typewriter(k: Build, ox: number, y: number, oz: number): void {
  const b = k.b, BODY = 0x1c1d22, KEY = 0xe8e2cf;
  // the chassis, the sloping keyboard deck, and the housing of the typebars behind it
  b.box(ox - 2.6, y, oz - 2.6, ox + 2.6, y + 1.0, oz + 3.8, BODY, { faces: 'NESWT' });
  b.box(ox - 2.65, y + 0.75, oz + 3.8, ox + 2.65, y + 0.9, oz + 3.86, BRASS, { faces: 'NESWTB' });
  slab(b, [ox, y + deckY(3.6), oz + 3.6], [ox, y + deckY(0.4), oz + 0.4], 2.5, 0.25, BODY);
  b.box(ox - 2.6, y + 1.0, oz - 2.6, ox + 2.6, y + 4.0, oz + 0.4, BODY, { faces: 'NESWT' });
  b.quad([ox - 2.0, y + 3.05, oz + 0.43], [ox + 2.0, y + 3.05, oz + 0.43], [ox + 2.0, y + 3.85, oz + 0.43], [ox - 2.0, y + 3.85, oz + 0.43], [0, 0, 1], 0x5a5c63);
  // four rows of round keys, each row a step higher, and the space bar
  KEY_ROWS.forEach((w, row) => {
    const n = 6, off = row % 2 ? 0.33 : 0;
    for (let i = 0; i < n; i++) {
      const x = ox - 1.95 + off + i * 0.7, yd = y + deckY(w);
      b.cyl(x, oz + w, yd - 0.2, yd + 0.55, 0.3, 0.3, 5, KEY, { cap: KEY, phase: Math.PI / 2 });
    }
  });
  b.box(ox - 1.5, y + deckY(3.65) - 0.1, oz + 3.62, ox + 1.5, y + deckY(3.65) + 0.25, oz + 3.95, KEY, { faces: 'NESWT' });
  // the platen and its carriage, the knobs at its ends, the return lever, and a sheet of paper in it
  b.box(ox - 3.0, y + 4.0, oz - 1.9, ox + 3.0, y + 4.15, oz - 0.1, STEEL, { faces: 'NESWTB' });
  drum(b, [ox, y + 4.75, oz - 1.0], 0.72, 3.0, BODY);
  for (const s of [-1, 1]) drum(b, [ox + s * 3.22, y + 4.75, oz - 1.0], 0.5, 0.22, 0x2a2b30);
  b.beam([ox - 2.9, y + 5.1, oz - 0.6], [ox - 3.3, y + 5.8, oz + 0.7], 0.08, 0.06, BRASS);
  for (const s of [-1, 1]) b.cyl(ox + s * 1.7, oz - 2.0, y + 4.0, y + 4.25, 0.55, 0.55, 6, 0x7a2626);
  const pz = oz - 1.5;
  b.box(ox - 1.9, y + 4.9, pz - 0.02, ox + 1.9, y + 7.2, pz + 0.02, 0xf4f1e8, { faces: 'NESWT' });
  k.sign('bayside-extra', ox, y + 6.3, pz + 0.05, 0, 1, 1.1, 3.4);
}

const gazette: Model = (k, l) => {
  const b = k.b, R = rng(5531), G = gazetteOf(l), y0 = l.base;
  const { x0, x1, z0, z1 } = G;
  // brick over a stone base course, stone quoins, a string course and a deep cornice
  b.box(x0, y0, z0, x1, 12, z1, BRICK, { win: TENEMENT_WIN, seed: R(), faces: 'NESW' });
  b.box(x0 - 0.15, y0, z0 - 0.15, x1 + 0.15, y0 + 1.0, z1 + 0.15, STONE_LIGHT, { faces: 'NESWT' });
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) b.box(x - 0.3, y0, z - 0.3, x + 0.3, 12, z + 0.3, STONE_LIGHT, { faces: 'NESW' });
  b.box(x0 - 0.12, 4, z0 - 0.12, x1 + 0.12, 4.3, z1 + 0.12, STONE_TRIM, { faces: 'NESWTB' });
  b.box(x0 - 0.35, 12, z0 - 0.35, x1 + 0.35, G.roof, z1 + 0.35, STONE_TRIM, { faces: 'NESWTB', top: LEAD });
  // the attic round the roof, the name along its east face where South Street's ring looks at it
  const t = 0.4, ya = G.roof, yb = G.roof + 1.3;
  b.box(x0, ya, z0, x1, yb, z0 + t, BRICK_DARK, { faces: 'NESWT' });
  b.box(x0, ya, z1 - t, x1, yb, z1, BRICK_DARK, { faces: 'NESWT' });
  b.box(x0, ya, z0 + t, x0 + t, yb, z1 - t, BRICK_DARK, { faces: 'NESWT' });
  b.box(x1 - t, ya, z0 + t, x1, yb, z1 - t, BRICK_DARK, { faces: 'NESWT' });
  hang(k, 'bayside-gazette', x1, (ya + yb) / 2, (z0 + z1) / 2, 1, 0, 0.95, z1 - z0 - 1.5);

  // the main door on the south, up three steps, with a lantern either side
  const mx = (x0 + x1) / 2;
  b.box(mx - 1.3, y0, z1, mx + 1.3, y0 + 0.45, z1 + 1.0, STONE_LIGHT, { faces: 'NESWT' });
  b.box(mx - 0.75, y0 + 0.45, z1 + 0.15, mx + 0.75, y0 + 3.4, z1 + 0.19, 0x4a3420, { faces: 'SEWT', win: interior(1.5) });
  b.box(mx - 1.0, y0 + 3.4, z1 + 0.15, mx + 1.0, y0 + 3.75, z1 + 0.3, STONE_TRIM, { faces: 'NESWTB' });
  for (const s of [-1, 1]) {
    b.beam([mx + s * 1.6, 3.6, z1 + 0.15], [mx + s * 1.6, 3.35, z1 + 0.6], 0.06, 0.06, IRON);
    gasLamp(k, mx + s * 1.6, 3.0, z1 + 0.65, 0, AMBER);
  }

  // the loading dock on the east: a platform, two lit doors, a canopy on brackets, and bundles of papers
  const dx0 = x1, dx1 = x1 + 1.6, dz0 = z0 + 2.2, dz1 = z1 - 1.4;
  b.box(dx0, y0, dz0, dx1, y0 + 1.1, dz1, STONE, { faces: 'NESWT' });
  for (const z of [dz0 + 2.0, dz1 - 2.0]) b.box(x1, y0 + 1.1, z - 1.0, x1 + 0.05, y0 + 4.0, z + 1.0, 0x5a4228, { faces: 'E', win: interior(1.7) });
  b.box(x1, 4.4, dz0 - 0.6, x1 + 2.5, 4.7, dz1 + 0.6, SLATE, { faces: 'NESWTB' });
  for (const z of [dz0, (dz0 + dz1) / 2, dz1]) b.beam([x1 + 0.05, 3.2, z], [x1 + 2.2, 4.38, z], 0.07, 0.07, IRON);
  k.glows.push({ x: x1 + 1.3, y: 4.25, z: (dz0 + dz1) / 2, sx: 0.8, sy: 0.12, sz: 0.4, color: AMBER });
  const PAPER = [0xd8d2c0, 0xcfc8b4, 0xe2dccb];
  for (const [z, n] of [[dz0 + 0.6, 3], [dz0 + 3.9, 2], [dz1 - 0.8, 3]] as [number, number][]) {
    for (let i = 0; i < n; i++) b.box(dx0 + 0.25, y0 + 1.1 + i * 0.42, z - 0.4, dx0 + 1.05, y0 + 1.1 + i * 0.42 + 0.4, z + 0.4, PAPER[i % 3], { faces: 'NESWT' });
  }
  k.person(dx0 + 0.9, dz0 + 5.5, y0 + 1.1);
  k.person(dx0 + 1.1, dz1 - 2.6, y0 + 1.1);
  // the yard before the dock, and a Gazette van backed up to it, with a box body for the papers
  flat(k.street, rect(dx1, l.z0 + 0.2, l.x1 - 0.1, l.z1 - 0.2), y0 + 0.04, 0x55534f, { win: { cell: 1.6, storey: 1, lit: 0.4, kind: 1 } });
  const vx = l.x1 - 1.75, vz = (dz0 + dz1) / 2 - 0.4;
  standingCar(k, vx, vz, -H, { body: 0x2e4a3c, y: y0 + 0.04 });
  b.box(vx - 1.5, y0 + 1.4, vz - 0.4, vx + 1.5, y0 + 3.3, vz + 3.5, 0x2e4a3c, { faces: 'NESWT' });
  b.box(vx - 1.25, y0 + 2.2, vz + 3.5, vx + 1.25, y0 + 2.9, vz + 3.53, 0xd9b23a, { faces: 'S' });
  k.person(vx - 0.4, vz + 5.0, y0);
  k.lights.push({ x: dx1 + 1.5, z: (dz0 + dz1) / 2, r: 10, color: SODIUM, k: 0.5 });

  // the newsboy at the door, with a stack of the late edition beside him
  k.person(mx + 2.1, z1 + 0.5, y0);
  b.box(mx + 2.6, y0, z1 + 0.15, mx + 3.3, y0 + 0.8, z1 + 0.85, PAPER[0], { faces: 'NESWT' });
  k.lights.push({ x: mx, z: z1 + 2.5, r: 8, color: AMBER, k: 0.45 });

  // the roof: a water tank, a chimney, and the typewriter
  waterTank(b, x0 + 1.4, G.roof, z0 + 1.5, 0.7);
  b.box(x0 + 0.5, G.roof, z1 - 1.6, x0 + 1.3, G.roof + 2.2, z1 - 0.6, BRICK_DARK, { faces: 'NESWT', top: DARK });
  typewriter(k, G.tx, G.roof, G.tz);
};

// ---------------------------------------------------------------------------
// The Underground Highway's mouth, the court before it, and the bastion's face
// ---------------------------------------------------------------------------

/** The portal: its middle, the wall it is in, how wide and high its opening is, and its ledge. */
function portalOf(l: Lot): { cx: number; wall: number; half: number; spring: number; rise: number; ledge0: number; ledge1: number; deep: number; reach: number } {
  return { cx: (l.x0 + l.x1) / 2, wall: RAMP.z1, half: 4.5, spring: 3.7, rise: 1.6, ledge0: 5.85, ledge1: 6.5, deep: 1.9, reach: 7.4 };
}
const ASSASSINS = [-5.4, -1.8, 1.8, 5.4];

const highway: Model = (k, l) => {
  const b = k.b, P = portalOf(l), f = facing(P.cx, P.wall, 'S'), R = rng(9902);
  // the court: flags, an old lamp at each corner, and nothing else, for the duel
  flat(k.street, rect(l.x0, P.wall + 0.02, l.x1, l.z1), 0.04, 0x605e5b, { win: { cell: 2.4, storey: 1, lit: 0.5, kind: 1 } });
  for (const [x, z] of [[l.x0 + 1.2, P.wall + 3.4], [l.x1 - 1.2, P.wall + 3.4], [l.x0 + 1.2, l.z1 - 1.2], [l.x1 - 1.2, l.z1 - 1.2]]) {
    b.cyl(x, z, 0, 0.5, 0.3, 0.22, 6, IRON_DARK);
    gasLamp(k, x, 4.3, z, 3.8, SODIUM);
    b.box(x - 0.28, 4.4, z - 0.28, x + 0.28, 4.5, z + 0.28, IRON_DARK, { faces: 'NESWTB' });
  }

  // the portal: a frame of stone proud of the bastion, an arch, and a dark green way in behind the boards
  const arch = curve(-P.half, P.half, P.spring, P.rise, false, 8);
  fbox(b, f, -P.half, P.half, 0, P.spring + P.rise, 0.05, 0.1, 0x2a6a36, 'S', { win: interior(3.2) });
  for (const s of [-1, 1]) fbox(b, f, s > 0 ? P.half : -P.half - 1.4, s > 0 ? P.half + 1.4 : -P.half, 0, P.ledge0, 0, 1.0, STONE, 'NESWT');
  spandrel(b, f, arch, P.ledge0, 0, 1.0, STONE, STONE_DARK, false);
  archivolt(b, f, arch, 0.42, 0.9, 1.18, STONE_TRIM);
  fbox(b, f, -0.4, 0.4, P.spring + P.rise - 0.1, P.ledge0, 0.9, 1.25, STONE_LIGHT, 'NESWT');
  // the planks across it, with gaps between them, cut to the arch, and two braces nailed over them
  for (let y = 0.25, i = 0; y + 0.44 <= P.spring + P.rise; y += 0.62, i++) {
    const yt = y + 0.44, over = Math.max(0, yt - P.spring) / P.rise, half = P.half * Math.sqrt(Math.max(0, 1 - over * over)) - 0.08;
    if (half < 0.6) break;
    const a = -half + R() * 0.25, c = half - R() * 0.25;
    fbox(b, f, a, c, y, yt, 0.5, 0.66, [TIMBER, TIMBER_DARK, TIMBER_PALE][i % 3], 'NESWT');
  }
  for (const u of [-2.6, 2.6]) fbox(b, f, u - 0.2, u + 0.2, 0.15, 4.6, 0.66, 0.76, TIMBER_DARK, 'NESWT');
  b.beam(at(f, -3.6, 0.6, 0.82), at(f, 3.4, 4.2, 0.82), 0.12, 0.12, TIMBER);
  b.beam(at(f, -3.4, 4.3, 0.82), at(f, 1.4, 0.4, 0.82), 0.12, 0.12, TIMBER_PALE);
  hang(k, 'bayside-closed', P.cx + 1.5, 2.3, P.wall + 0.95, 0, 1, 0.75, 2.6, TIMBER_DARK);
  k.lights.push({ x: P.cx, z: P.wall + 2.5, r: 9, color: '#5fd86a', k: 0.55 });
  k.glows.push({ x: P.cx, y: 1.2, z: P.wall + 0.3, sx: 6, sy: 0.15, sz: 0.2, color: '#4fd060' });

  // the ledge over it, on corbels, wide enough for figures to crouch on, with the name cut in its front
  fbox(b, f, -P.reach, P.reach, P.ledge0, P.ledge1, 0, P.deep, STONE_TRIM, 'NESWTB');
  for (const u of [-6.6, 6.6]) fbox(b, f, u - 0.35, u + 0.35, P.ledge0 - 0.9, P.ledge0, 0, P.deep - 0.2, STONE_TRIM, 'NESWB');
  for (const u of [-2.4, 2.4]) fbox(b, f, u - 0.3, u + 0.3, P.ledge0 - 0.5, P.ledge0, 1.0, P.deep - 0.2, STONE_TRIM, 'NESWB');
  k.sign('bayside-highway', P.cx, (P.ledge0 + P.ledge1) / 2, P.wall + P.deep + 0.03, 0, 1, 0.5, 2 * P.reach - 1);

  // the bastion's south face under the gatehouse: a buttress under each corner turret, a gargoyle on each, and a string course
  const gh = lotOf('gate-house');
  for (const tx of [gh.x0 + 0.9, gh.x1 - 0.9]) {
    b.box(tx - 1.8, 0, P.wall, tx + 1.8, 5.6, P.wall + 2.4, STONE_DARK, { faces: 'NESWT' });
    b.box(tx - 1.8, 5.6, P.wall, tx + 1.8, 7.96, P.wall + 1.65, STONE_DARK, { faces: 'NESWT' });
    b.box(tx - 1.95, 5.45, P.wall, tx + 1.95, 5.75, P.wall + 2.55, STONE_TRIM, { faces: 'NESWTB' });
  }
  gargoyle(b, gh.x0 + 0.9, 5.75, P.wall + 1.95, H, 0.95);
  b.box(gh.x0 + 2.7, 7.4, P.wall, gh.x1 - 2.7, 7.96, P.wall + 0.72, STONE_TRIM, { faces: 'NESWTB' });
};

// ---------------------------------------------------------------------------
// Grand Avenue's ramp, and the building over it
// ---------------------------------------------------------------------------

/** How high the ramp's top is at a place along its south face. */
const rampY = (x: number): number => avenueY(x, RAMP.z1);
const ARCADES = (): Lot[] => ['arcade-1', 'arcade-2', 'arcade-3'].map(lotOf);

/** Where the piers of the building over the ramp stand, as its builder stands them, west to east. */
function piers(): number[] {
  const xs: number[] = [];
  for (const l of ARCADES()) {
    const x0 = l.x0 + 0.06, x1 = l.x1, bays = Math.max(2, Math.round((x1 - x0) / 5.3)), bay = (x1 - x0) / bays;
    for (let i = 0; i < bays; i++) xs.push(x0 + i * bay + 0.7);
  }
  return xs.sort((a, b) => a - b);
}
/** The underside of the slab over the avenue at a place: the street's ceiling there. */
function slabUnder(x: number): number {
  const ls = ARCADES(), l = ls.find((a) => x >= a.x0 && x <= a.x1) ?? (x > ls[0].x1 ? ls[0] : ls[ls.length - 1]);
  return l.base - 0.6;
}

/** The ramp's south face: a pilaster under each pier, shops where the wall is tall enough, blind arches where it is low, a coping and a rail. */
function rampWall(k: Build, ps: number[]): void {
  const b = k.b, f = facing(0, 0, 'S'), Z = RAMP.z1, F = 0.4;
  for (const px of ps) {
    const h = rampY(px);
    if (h < 0.9) continue;
    b.box(px - 0.5, 0, Z, px + 0.5, h - 0.4, Z + F, STONE_LIGHT, { faces: 'ESWT' });
  }
  for (let i = 0; i + 1 < ps.length; i++) {
    const pa = ps[i], pb = ps[i + 1], c = (pa + pb) / 2, hc = rampY(pb), ow = (pb - pa) / 2 - 0.95;
    const shop = SHOPS[i];
    if (shop && hc >= 3.4) {
      // a shop: an arched window and door, lit at night, a stall riser, and its sign over it or on its glass
      const oh = Math.min(hc - 0.6, 5.0), rise = ow * 0.7, ys = oh - rise, arch = curve(c - ow, c + ow, ys, rise, false, 6);
      const door = Math.min(2.5, ys - 0.2);
      b.box(c - ow, 0.6, Z, c + ow, ys, Z + 0.05, shop.glass, { faces: 'S', win: interior(2.1) });
      head(b, f, arch, Z + 0.05, shop.glass, { win: interior(2.1) });
      b.box(c - ow, 0, Z, c + ow - 1.05, 0.6, Z + 0.28, STONE_DARK, { faces: 'SEWT' });
      b.box(c + ow - 1.0, 0, Z, c + ow - 0.08, door, Z + 0.09, 0x3a2a1c, { faces: 'SEWT', win: interior(1.2) });
      b.box(c - ow, ys - 0.15, Z, c + ow, ys, Z + 0.13, IRON, { faces: 'STB' });
      b.box(c - ow * 0.4 - 0.05, 0.6, Z, c - ow * 0.4 + 0.05, ys - 0.15, Z + 0.1, IRON, { faces: 'SEW' });
      for (const [u0, u1] of [[c - ow - 0.45, c - ow], [c + ow, c + ow + 0.45]]) b.box(u0, 0, Z, u1, ys, Z + F, STONE_LIGHT, { faces: 'ESWT' });
      archivolt(b, f, arch, 0.36, Z, Z + F, STONE_LIGHT);
      fbox(b, f, c - 0.25, c + 0.25, oh - 0.1, oh + 0.42, Z, Z + F + 0.06, STONE_TRIM, 'ESWT');
      const room = hc - 0.25 - (oh + 0.5);
      if (room >= 0.5) hang(k, shop.sign.id, c, oh + 0.5 + room / 2, Z + F, 0, 1, Math.min(0.75, room), 2 * ow + 0.6);
      else k.sign(shop.sign.id, c - 0.5, Math.min(1.9, ys - 0.5), Z + 0.09, 0, 1, 0.42, 2 * ow - 1.4);
      // a canvas awning over every other one
      if (i % 2 === 1) slab(b, [c, Math.min(oh + 0.25, hc - 0.4), Z + F], [c, Math.min(oh + 0.25, hc - 0.4) - 0.9, Z + 1.7], ow + 0.25, 0.06, i === 1 ? 0x7a2a2a : 0x2f5a4a);
      k.lights.push({ x: c, z: Z + 2.6, r: 6, color: AMBER, k: 0.45 });
    } else if (hc >= 0.8) {
      // a blind arch: pointed, its panel dark, and low down an iron grating
      const oh = Math.max(0.8, hc - 0.6), rise = Math.min(ow * 1.1, oh * 0.45), ys = oh - rise, arch = curve(c - ow, c + ow, ys, rise, true, 6);
      const panel = oh < 1.6 ? IRON_DARK : STONE_DARK;
      b.box(c - ow, 0, Z, c + ow, ys, Z + 0.04, panel, { faces: 'S' });
      head(b, f, arch, Z + 0.04, panel);
      for (const [u0, u1] of [[c - ow - 0.45, c - ow], [c + ow, c + ow + 0.45]]) b.box(u0, 0, Z, u1, ys, Z + F, STONE_LIGHT, { faces: 'ESWT' });
      archivolt(b, f, arch, 0.3, Z, Z + F, STONE_LIGHT);
    }
  }
  // lamps on brackets on the pilasters between the shops
  for (const px of ps) {
    if (rampY(px) < 4.2 || px < ps[0] + 1) continue;
    b.beam([px, 3.95, Z + F], [px, 3.5, Z + F + 0.65], 0.07, 0.06, IRON);
    gasLamp(k, px, 3.25, Z + F + 0.7, 0, SODIUM);
  }
  // the coping along the ramp's edge, and a low iron rail on it, following the slope from pier to pier
  const xa = RAMP.x0 + 0.1, xb = -35.95;
  slab(b, [xa, rampY(xa) + 0.08, Z + 0.15], [xb, rampY(xb) + 0.08, Z + 0.15], 0.5, 0.45, STONE_TRIM);
  const stops = [xa, ...ps, xb], zr = Z + 0.45;
  for (let i = 0; i + 1 < stops.length; i++) {
    const a = stops[i], c = stops[i + 1], ya = rampY(a) + 0.08, yc = rampY(c) + 0.08;
    b.beam([a, ya + 1.0, zr], [c, yc + 1.0, zr], 0.06, 0.06, IRON);
    b.beam([a, ya, zr], [a, ya + 1.05, zr], 0.07, 0.07, IRON);
  }
}

/** Between the piers, under the slab: a pointed arch's two shoulders in each bay, so that the piers read as an arcade. */
function arcadeArches(k: Build, ps: number[]): void {
  const b = k.b, f = facing(0, 0, 'S'), w0 = 72.9, w1 = 73.8;
  const all = [...ps, EAST_PIER];
  for (let i = 0; i + 1 < all.length; i++) {
    const ul = all[i] + 0.65, ur = all[i + 1] - 0.65, mid = (ul + ur) / 2;
    const lo = Math.min(slabUnder(ul), slabUnder(ur)), hi = Math.max(slabUnder(ul), slabUnder(ur));
    const road = Math.max(avenueY(ul, 66.5), avenueY(ur, 66.5));
    const spring = Math.max(road + 3.6, lo - 2.6), rise = lo - 0.08 - spring;
    if (rise > 0.5) spandrel(b, f, curve(ul, ur, spring, rise, true, 6), lo + 0.02, w0, w1, STONE, STONE_DARK);
    // where the building steps up, the wall from the lower slab up to the higher one, with a round window in it
    if (hi - lo > 0.5) {
      const boundary = ARCADES().find((l) => l.x1 > ul && l.x1 < ur)?.x1 ?? mid;
      const xh0 = slabUnder(ul) > slabUnder(ur) ? ul : boundary - 0.15, xh1 = slabUnder(ul) > slabUnder(ur) ? boundary + 0.15 : ur;
      b.box(xh0, lo - 0.02, w0, xh1, hi + 0.05, w1, STONE, { faces: 'NESW' });
      const rc = (xh0 + xh1) / 2;
      const yc = (lo + hi) / 2, r = Math.min(1.0, (hi - lo) * 0.28);
      for (const [rr, w, col, lit] of [[r + 0.3, w1 + 0.02, STONE_TRIM, 0], [r, w1 + 0.05, 0x8a6a3a, 1.8]] as [number, number, number, number][]) {
        for (let j = 0; j < 8; j++) {
          const a0 = (j / 8) * Math.PI * 2, a1 = ((j + 1) / 8) * Math.PI * 2;
          face3(b, [rc, yc, w], [rc + Math.cos(a0) * rr, yc + Math.sin(a0) * rr, w], [rc + Math.cos(a1) * rr, yc + Math.sin(a1) * rr, w], [0, 0, 1], col, lit ? { win: interior(lit) } : {});
        }
      }
      fbox(b, f, rc - 0.06, rc + 0.06, yc - r, yc + r, w1 + 0.04, w1 + 0.1, IRON_DARK, 'SEWT');
      fbox(b, f, rc - r, rc + r, yc - 0.06, yc + 0.06, w1 + 0.04, w1 + 0.1, IRON_DARK, 'SEWT');
    }
    k.glows.push({ x: mid, y: lo - 0.35, z: 73.35, sx: 0.3, sy: 0.3, sz: 0.3, color: SODIUM });
  }
}

/** The pier the great arch stands on at the east end, on the ramp's south sidewalk. */
const EAST_PIER = -36.65;

/** Where the avenue goes in under the first length: a great pointed arch across it, and a lamp over it. */
function greatArch(k: Build): void {
  const b = k.b, l = lotOf('arcade-1'), xe = l.x1 + 0.2, f = facing(xe, 0, 'E'), slabLow = l.base - 0.6, road = avenueY(l.x1, 66.5);
  // its two feet: the pier on the south sidewalk, and a jamb against the upper city's wall
  b.box(EAST_PIER - 0.65, road - 0.2, 72.75, EAST_PIER + 0.65, slabLow, 73.95, STONE_DARK, { faces: 'NESW' });
  b.box(EAST_PIER - 1.25, slabLow - 0.9, 72.6, EAST_PIER + 1.25, slabLow, 74.1, STONE, { faces: 'NESWB' });
  const zs = 72.75, zn = RAMP.z0 + 1.2, spring = road + 4.6, top = l.base + 0.6;
  fbox(b, f, -RAMP.z1, -zs, road - 0.2, spring, 0, 0.9, STONE_DARK, 'NESWT');
  fbox(b, f, -zn, -RAMP.z0, 0, spring, 0, 0.9, STONE_DARK, 'NESWT');
  const arch = curve(-zs, -zn, spring, slabLow - 0.1 - spring, true, 10);
  spandrel(b, f, arch, top, 0, 0.9, STONE, STONE_DARK, false);
  archivolt(b, f, arch, 0.5, 0.85, 1.2, STONE_TRIM);
  fbox(b, f, -RAMP.z1, -RAMP.z0, top, top + 0.35, -0.05, 1.3, STONE_TRIM, 'NESWTB');
  // the keystone, and a lantern on a bracket over it
  const kz = -(zs + zn) / 2;
  fbox(b, f, kz - 0.5, kz + 0.5, slabLow - 0.7, top, 0.85, 1.3, STONE_LIGHT, 'NESWT');
  b.beam(at(f, kz, top + 1.6, 0), at(f, kz, top + 1.2, 1.2), 0.08, 0.07, IRON);
  gasLamp(k, ...(at(f, kz, top + 0.9, 1.25) as [number, number, number]), 0, SODIUM);
  b.box(l.x1, top + 0.35, -kz - 0.3, l.x1 + 0.25, top + 1.7, -kz + 0.3, IRON_DARK, { faces: 'NESWT' });
}

/** The three roofs, crowded: a pigeon loft, washing lines, a roof garden with a pergola, a billboard, ladders, vents. */
function arcadeRoofs(k: Build): void {
  const b = k.b, R = rng(2077);
  const ls = ARCADES();
  ls.forEach((l, i) => {
    const x0 = l.x0 + 0.06, x1 = l.x1, z0 = l.z0 + 0.6, z1 = l.z1, y = l.top;
    // a low parapet along the south edge, between the gargoyles
    b.box(x0 + 1.3, y, z1 - 0.3, x1 - 1.3, y + 0.7, z1, STONE_TRIM, { faces: 'NESWT' });
    // two vents
    for (const [vx, vz] of [[x0 + 7.4, z0 + 1.6], [x1 - 1.4, z1 - 4.2]]) {
      b.cyl(vx, vz, y, y + 1.0, 0.22, 0.22, 6, STEEL, { cap: false });
      b.cyl(vx, vz, y + 1.0, y + 1.35, 0.55, 0.1, 6, STEEL);
    }
    // an aerial on the stair head, crates between the chimneys, and a fan housing in the south-west corner
    const ax = x1 - 3.0, az = z0 + 2.4;
    b.beam([ax, y + 2.4, az], [ax, y + 4.0, az], 0.05, 0.04, STEEL);
    b.beam([ax - 0.9, y + 3.6, az], [ax + 0.9, y + 3.6, az], 0.035, 0.035, STEEL);
    b.box(x0 + 7.2, y, z1 - 2.9, x0 + 8.0, y + 0.8, z1 - 2.1, TIMBER, { faces: 'NESWT' });
    b.box(x0 + 7.4, y + 0.8, z1 - 2.8, x0 + 8.0, y + 1.4, z1 - 2.2, TIMBER_PALE, { faces: 'NESWT' });
    b.box(x0 + 1.0, y, z1 - 3.2, x0 + 2.8, y + 0.9, z1 - 1.6, LEAD, { faces: 'NESWT', top: IRON_DARK });
    if (i === 0) {
      // a pigeon loft on legs, with a sloping roof, a landing board and a trap
      const px0 = x0 + 0.8, px1 = x0 + 4.6, pz0 = z0 + 6.2, pz1 = z0 + 9.2, py = y + 0.9;
      for (const [lx, lz] of [[px0 + 0.2, pz0 + 0.2], [px1 - 0.2, pz0 + 0.2], [px0 + 0.2, pz1 - 0.2], [px1 - 0.2, pz1 - 0.2]]) b.beam([lx, y, lz], [lx, py, lz], 0.08, 0.08, TIMBER_DARK);
      b.box(px0, py, pz0, px1, py + 1.9, pz1, TIMBER_PALE, { faces: 'NESWB' });
      slab(b, [(px0 + px1) / 2, py + 2.4, pz0 - 0.3], [(px0 + px1) / 2, py + 1.8, pz1 + 0.5], (px1 - px0) / 2 + 0.3, 0.1, SLATE);
      for (const lx of [px0 + 0.8, px0 + 1.9, px0 + 3.0]) b.box(lx - 0.3, py + 0.6, pz1, lx + 0.3, py + 1.1, pz1 + 0.04, DARK, { faces: 'S' });
      b.box(px0, py + 0.5, pz1, px1, py + 0.58, pz1 + 0.7, TIMBER, { faces: 'NESWTB' });
      b.beam([px0 + 0.5, y, pz1 + 1.4], [px0 + 0.5, py + 0.5, pz1 + 0.75], 0.06, 0.06, TIMBER);
      k.glows.push({ x: px0 + 1.3, y: py + 0.9, z: pz1 + 0.5, sx: 0.12, sy: 0.12, sz: 0.12, color: '#c9c9cf' });
      washing(k, x0 + 6.5, x1 - 6.5, z0 + 2.4, y, R);
      ladder(b, l.x0, y, z0 + 4.4);
    } else if (i === 1) {
      // a billboard on a steel frame over the south edge, facing the opening view's side
      const bx = x0 + 9.0, bz = z1 - 1.1, by = y + 2.5;
      for (const s of [-1, 1]) b.beam([bx + s * 2.6, y, bz - 0.2], [bx + s * 2.6, by + 1.3, bz - 0.2], 0.1, 0.1, STEEL);
      b.beam([bx - 2.6, y + 1.0, bz - 0.2], [bx + 2.6, y + 1.0, bz - 0.2], 0.07, 0.07, STEEL);
      b.box(bx - 2.9, by - 1.2, bz - 0.1, bx + 2.9, by + 1.2, bz, IRON_DARK, { faces: 'NESWTB' });
      k.sign('bayside-hotel', bx, by, bz + 0.03, 0, 1, 2.2, 5.6);
      for (const s of [-1, 1]) {
        b.beam([bx + s * 1.8, by + 1.2, bz], [bx + s * 1.8, by + 1.55, bz + 0.6], 0.04, 0.04, STEEL);
        k.glows.push({ x: bx + s * 1.8, y: by + 1.5, z: bz + 0.65, sx: 0.3, sy: 0.15, sz: 0.3, color: AMBER });
      }
      washing(k, x0 + 1.0, x0 + 6.0, z0 + 5.6, y, R);
      ladder(b, l.x0, y, z0 + 9.0);
      k.person(x1 - 8.0, z0 + 4.2, y);
    } else {
      // a roof garden: planters, two small trees, a pergola with a bench under it
      const gx0 = x0 + 0.8, gx1 = x0 + 5.4, gz0 = z0 + 5.4, gz1 = z0 + 10.6;
      for (const [a, c, d, e] of [[gx0, gz0, gx0 + 0.8, gz1], [gx0, gz1 - 0.8, gx1, gz1], [gx1 - 0.8, gz0, gx1, gz1 - 2.2]]) b.box(a, y, c, d, y + 0.6, e, BRICK_DARK, { faces: 'NESWT', top: 0x3f5a3a });
      for (const [tx, tz] of [[gx0 + 0.4, gz0 + 1.0], [gx1 - 0.4, gz0 + 0.6]]) k.tree(tx, tz, 0.55, false, y + 0.6);
      for (const [lx, lz] of [[gx0 + 1.4, gz0 + 1.2], [gx1 - 1.4, gz0 + 1.2], [gx0 + 1.4, gz1 - 1.4], [gx1 - 1.4, gz1 - 1.4]]) b.beam([lx, y, lz], [lx, y + 2.6, lz], 0.08, 0.08, TIMBER);
      for (const lz of [gz0 + 1.2, gz1 - 1.4]) b.box(gx0 + 1.1, y + 2.6, lz - 0.08, gx1 - 1.1, y + 2.78, lz + 0.08, TIMBER, { faces: 'NESWTB' });
      for (let lx = gx0 + 1.5; lx < gx1 - 1.2; lx += 0.75) b.box(lx - 0.06, y + 2.78, gz0 + 0.9, lx + 0.06, y + 2.9, gz1 - 1.1, TIMBER_PALE, { faces: 'NESWTB' });
      b.box(gx0 + 2.2, y + 0.45, gz1 - 2.4, gx1 - 2.2, y + 0.55, gz1 - 1.9, TIMBER, { faces: 'NESWTB' });
      for (const s of [gx0 + 2.4, gx1 - 2.4]) b.box(s - 0.06, y, gz1 - 2.35, s + 0.06, y + 0.45, gz1 - 1.95, IRON_DARK, { faces: 'NESW' });
      neon(k, [gx0 + 1.4, y + 2.5, gz0 + 1.2], [gx1 - 1.4, y + 2.5, gz0 + 1.2], AMBER, 0.08);
      k.person(gx0 + 2.6, gz1 - 1.4, y);
    }
  });
}

/** A ladder up a wall at `x` that faces east, from a roof at `y0` to the next roof up. */
function ladder(b: GeoBuilder, x: number, y0: number, z: number): void {
  for (const dz of [-0.35, 0.35]) b.beam([x + 0.18, y0, z + dz], [x + 0.18, y0 + 4.6, z + dz], 0.05, 0.05, IRON);
  for (let y = y0 + 0.6; y < y0 + 4.4; y += 0.9) b.box(x + 0.1, y, z - 0.35, x + 0.26, y + 0.08, z + 0.35, IRON, { faces: 'NESWTB' });
}

/** Washing on a line between two poles, along x, or along z if `alongZ`. */
function washing(k: Build, a: number, c: number, at0: number, y: number, R: () => number, alongZ = false): void {
  const b = k.b, P = (u: number, h: number): V3 => (alongZ ? [at0, h, u] : [u, h, at0]);
  for (const u of [a, c]) b.beam(P(u, y), P(u, y + 2.4), 0.06, 0.06, TIMBER_DARK);
  b.beam(P(a, y + 2.3), P(c, y + 2.3), 0.025, 0.025, 0xb9b9b9);
  const CLOTH = [0xd9d4c8, 0x8a2f2a, 0x3f5f8a, 0xe2d79a, 0x5a7a4a, 0xc9c4b8];
  for (let u = a + 0.3; u < c - 0.5; u += 0.7 + R() * 0.3) {
    const w = 0.45 + R() * 0.35, h = 0.6 + R() * 0.6, col = CLOTH[Math.floor(R() * CLOTH.length)];
    const p0 = P(u, y + 2.28 - h), p1 = P(u + w, y + 2.28);
    b.box(Math.min(p0[0], p1[0]), p0[1], Math.min(p0[2], p1[2]) - (alongZ ? 0 : 0.02), Math.max(p0[0], p1[0]) + (alongZ ? 0.04 : 0), p1[1], Math.max(p0[2], p1[2]) + (alongZ ? 0 : 0.02), col, { faces: alongZ ? 'EW' : 'NS' });
  }
}

// ---------------------------------------------------------------------------
// The lane under the ramp, the ring's island, the subway, and people
// ---------------------------------------------------------------------------

/** The lane along the foot of the ramp's wall, and its manhole. */
const LANE_UNDER = { x0: -86, x1: -35, z0: 74.02, z1: 78.1, manhole: [-64, 76.5] as [number, number] };

function underLane(k: Build): void {
  const b = k.b, L = LANE_UNDER, R = rng(3313);
  flat(k.street, rect(L.x0, L.z0, L.x1, L.z1), 0.045, 0x4f4d4b, { win: { cell: 1.4, storey: 1, lit: 0.45, kind: 1 } });
  // the manhole's iron cover
  b.cyl(L.manhole[0], L.manhole[1], 0.045, 0.085, 0.78, 0.78, 10, IRON_DARK, { cap: 0x4a4e55 });
  for (const dz of [-0.3, 0, 0.3]) b.box(L.manhole[0] - 0.55, 0.085, L.manhole[1] + dz - 0.04, L.manhole[0] + 0.55, 0.1, L.manhole[1] + dz + 0.04, IRON, { faces: 'NESWT' });
  // bins, one with a cat on its lid
  const bins: [number, number][] = [[-73.4, 75.1], [-72.2, 75.15], [-62.6, 75.1], [-47.0, 75.1]];
  bins.forEach(([x, z], i) => {
    b.cyl(x, z, 0.045, 1.05, 0.46, 0.4, 8, i % 2 ? 0x4a5048 : 0x5a5e64, { cap: false });
    b.cyl(x, z, 1.05, 1.2, 0.5, 0.48, 8, IRON_DARK);
  });
  const [cx, cz] = bins[0];
  b.box(cx - 0.25, 1.2, cz - 0.12, cx + 0.2, 1.5, cz + 0.12, 0x2a2a2e, { faces: 'NESWT' });
  b.box(cx + 0.15, 1.42, cz - 0.1, cx + 0.38, 1.64, cz + 0.1, 0x2a2a2e, { faces: 'NESWT' });
  for (const dz of [-0.06, 0.06]) b.beam([cx + 0.3, 1.64, cz + dz], [cx + 0.3, 1.74, cz + dz], 0.035, 0.01, 0x2a2a2e);
  b.beam([cx - 0.25, 1.3, cz], [cx - 0.5, 1.75, cz + 0.15], 0.04, 0.03, 0x2a2a2e);
  // crates by the porter's door, stacked
  for (const [x, z, n] of [[-55.6, 75.0, 2], [-54.6, 75.05, 1], [-50.6, 75.0, 3]] as [number, number, number][]) {
    for (let j = 0; j < n; j++) b.box(x - 0.42, 0.045 + j * 0.8, z - 0.42, x + 0.42, 0.045 + j * 0.8 + 0.78, z + 0.42, j % 2 ? TIMBER_PALE : TIMBER, { faces: 'NESWT' });
  }
  // a fire escape comes down the back of the row south of the lane
  const back = LOTS.find((l) => l.file === 'fabric' && l.z0 > L.z1 && l.z0 < L.z1 + 1 && l.x0 < -70 && l.x1 > -80 && l.top >= 8);
  if (back) fireEscape(b, (back.x0 + back.x1) / 2, back.z0, 'N', 0, back.top, 3, 4);
  // people: a porter at the crates, a man with a barrow, a woman by the shops
  k.person(-55.2, 76.2);
  const bx = -49.0, bz = 76.6;
  k.person(bx - 1.1, bz);
  b.box(bx - 0.6, 0.6, bz - 0.5, bx + 0.9, 1.1, bz + 0.5, TIMBER, { faces: 'NESWTB' });
  b.box(bx - 0.5, 1.1, bz - 0.4, bx + 0.8, 1.45, bz + 0.4, 0x7a5a3a, { faces: 'NESWT' });
  b.cyl(bx + 1.0, bz, 0.05, 0.6, 0.3, 0.3, 6, IRON_DARK, { cap: false });
  for (const dz of [-0.35, 0.35]) b.beam([bx - 0.6, 0.9, bz + dz], [bx - 1.3, 1.0, bz + dz], 0.04, 0.04, TIMBER_DARK);
  for (const x of [-79.4, -66.0, -60.0]) k.person(x, 75.7 + R() * 0.8);
  // two waiting on the ramp's sidewalk under the arches
  for (const x of [-46.6, -58.9, -74.6]) k.person(x, 72.25, avenueY(x, 72.25) + 0.02);
}

/** South Street's ring: its island, with one old lamp. */
function ringIsland(k: Build): void {
  const [x, z] = TURNS.south.c;
  k.b.cyl(x, z, 0.0, 0.22, 1.2, 1.2, 10, STONE_LIGHT, { cap: STONE });
  k.b.cyl(x, z, 0.22, 0.5, 0.32, 0.26, 6, IRON_DARK);
  gasLamp(k, x, 4.4, z, 3.9, SODIUM);
  k.b.cyl(x, z, 4.5, 4.9, 0.34, 0.05, 6, IRON_DARK, { cap: false });
}

/** A subway entrance: a stair down behind an iron rail, a green globe on a post at each side, and its board. */
const SUBWAY = { x: -48.5, z: 81.2, hw: 0.85, hl: 1.7 };
function subway(k: Build): void {
  const b = k.b, S = SUBWAY, x0 = S.x - S.hw, x1 = S.x + S.hw, z0 = S.z - S.hl, z1 = S.z + S.hl;
  if (!open(S.x, S.z, 0.6)) return;
  // the stair's mouth, darker step by step as it goes down to the north
  const steps = [0x6a6d74, 0x5a5d63, 0x4a4c52, 0x383a3f, 0x26272b, 0x17181c];
  steps.forEach((c, i) => {
    const za = z1 - ((i + 1) * (z1 - z0)) / steps.length, zb = z1 - (i * (z1 - z0)) / steps.length;
    b.quad([x0, 0.05, zb], [x1, 0.05, zb], [x1, 0.05, za], [x0, 0.05, za], [0, 1, 0], c);
  });
  b.box(x0 - 0.15, 0, z0 - 0.15, x1 + 0.15, 0.12, z0, STONE_LIGHT, { faces: 'NESWT' });
  for (const [a, c] of [[x0 - 0.15, x0], [x1, x1 + 0.15]]) b.box(a, 0, z0, c, 0.12, z1, STONE_LIGHT, { faces: 'NESWT' });
  railing(b, x0 - 0.1, z0 - 0.1, x1 + 0.1, z1, 0.12, STEEL, 'NEW', 0.9);
  for (const x of [x0 - 0.05, x1 + 0.05]) {
    b.beam([x, 0, z1 + 0.05], [x, 2.6, z1 + 0.05], 0.07, 0.06, IRON_DARK);
    b.cyl(x, z1 + 0.05, 2.6, 3.05, 0.26, 0.26, 6, 0x3f8f52, { win: interior(2.2) });
    k.glows.push({ x, y: 2.85, z: z1 + 0.05, sx: 0.4, sy: 0.4, sz: 0.4, color: '#6fe08a' });
  }
  b.box(S.x - 1.0, 1.15, z0 - 0.2, S.x + 1.0, 1.75, z0 - 0.12, IRON_DARK, { faces: 'NESWT' });
  k.sign('bayside-subway', S.x, 1.45, z0 - 0.09, 0, 1, 0.5, 1.9);
  k.lights.push({ x: S.x, z: z1 + 1.5, r: 7, color: '#8ff0a8', k: 0.4 });
}

// ---------------------------------------------------------------------------
// What the tile calls
// ---------------------------------------------------------------------------

export const MODELS: Record<string, Model> = {
  'clock-tower': clockTower,
  gazette,
  highway,
};

export const COVERS: string[] = [];

function places(): Record<string, Place> {
  const ct = lotOf('clock-tower'), cx = (ct.x0 + ct.x1) / 2, cz = (ct.z0 + ct.z1) / 2;
  const gz = lotOf('gazette'), G = gazetteOf(gz);
  const hw = lotOf('highway'), P = portalOf(hw), court = (hw.z0 + hw.z1) / 2;
  const out: Record<string, Place> = {
    belfryLedge: { x: cx + 4.7, y: CT.yBel, z: cz + 4.7, h: Q },
    manBat: { x: cx + 5.4, y: CT.yEave, z: cz + 5.4, h: Q },
    clockDoor: { x: cx, y: 0, z: cz + CT.base + 1.5, h: H },
    typewriter: { x: G.tx, y: G.roof + deckY(KEY_ROWS[1]) + 0.55, z: G.tz + KEY_ROWS[1], h: H },
    gazetteDoor: { x: (G.x0 + G.x1) / 2, y: 0, z: G.z1 + 1.5, h: H },
    ras: { x: P.cx, y: 0.04, z: P.wall + 3.0, h: Q },
    talia: { x: P.cx + 1.8, y: 0.04, z: P.wall + 3.4, h: Q },
    duelA: { x: P.cx - 1.3, y: 0.04, z: court + 1.5, h: 0 },
    duelB: { x: P.cx + 1.3, y: 0.04, z: court + 1.5, h: Math.PI },
    manhole: { x: LANE_UNDER.manhole[0], y: 0.085, z: LANE_UNDER.manhole[1], h: 0 },
    ringIsland: { x: TURNS.south.c[0], y: 0.22, z: TURNS.south.c[1], h: 0 },
  };
  ASSASSINS.forEach((u, i) => { out[`assassin${i}`] = { x: P.cx + u, y: P.ledge1, z: P.wall + 1.2, h: H }; });
  return out;
}

export const PLACES: Record<string, Place> = places();

export function extras(k: Build): void {
  const ps = piers();
  rampWall(k, ps);
  arcadeArches(k, ps);
  greatArch(k);
  arcadeRoofs(k);
  underLane(k);
  ringIsland(k);
  subway(k);
}
