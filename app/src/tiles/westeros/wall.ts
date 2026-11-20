// The Wall, Castle Black at its foot, the Frostfangs, and the weirwood grove
// beyond the Wall.
//
// The Wall is ice, 700 ft in the books and 42 here, leaning back as it climbs:
// its south face in long facets and bands, cracked, with a walk on top between
// parapets of ice blocks. The kingsroad goes through it in a tunnel at the gate.
// Castle Black has no wall of its own: towers and timber halls huddle at the
// Wall's foot, half of them in ruin, round a yard of trodden snow. The great
// switchback stair climbs the ice beside the gate, with the winch cage beside
// it. North of the Wall the kingsroad ends in a ring round a weirwood, in a
// grove of nine, and the haunted forest runs from the Frostfangs to the east.
//
// Everything is drawn from the books' plain descriptions (AGOT ch. 19, 21, 48;
// ADWD's Jon chapters), as the research notes read them, and is this tile's
// own drawing.

import * as THREE from 'three';
import { Flames, Smoke } from '../../engine/effects';
import { GeoBuilder, interior, rng, type V3, type WinSpec } from '../../engine/geo';
import { area, oval } from '../../engine/ground';
import { figure, lathe, type Dress } from '../../engine/parts';
import { drum, face3, hip, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import { drawField, field, heightOn } from '../../engine/terrain';
import type { Build } from '../../engine/tile';
import {
  DARK, DOOR, ICE, ICE_SHADE, ICE_TOP, IRONWORK, LOOPS_CLOSE, ROOF, SNOW, STONE, TIMBER, TIMBER_DARK,
  banner, brazier, fire, nameBoard, nameSign, squareTower, weirwood,
} from './look';
import type { Model } from './models';
import { TURNS, WALL, lotOf, type Lot, type P2 } from './plan';

// ---------------------------------------------------------------------------
// Colours of this file's own (see the report: some may belong in look.ts)
// ---------------------------------------------------------------------------

const GRANITE = STONE.north, GRANITE_SHADE = STONE.northShade;
/** The Shieldhall's dark stone. */
const DARK_STONE = 0x56585d;
/** A roof under snow. */
const SNOW_ROOF = 0xdfe5e9;
/** The stair's timber, a good deal lighter than it would be, since thin wood comes out dark. */
const WOOD = 0x8a6a4b, WOOD_TOP = 0xa98b69, WOOD_RAIL = 0xb0916c;
/** Iron that has to read as iron from far off. */
const IRON = 0x9a9ea5;
/** Inside the tunnel: the ice by the mouths, and the dark within. */
const TUNNEL_MOUTH = 0x6d8796, TUNNEL_DEEP = 0x141b21;
/** The yard: trodden snow, and frozen mud where the most feet go. */
const YARD = 0xcfd0cb, MUD = 0x8e8577;
const RAVEN = 0x141418;
/** A black brother: black from hood to boots. */
const BROTHER: Dress = { coat: 0x1f1f24, legs: 0x18181b, hat: 0x232328, hatH: 0.14, hatR: 0.27 };

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const sub = (a: V3, c: V3): V3 => [a[0] - c[0], a[1] - c[1], a[2] - c[2]];
const cross = (a: V3, c: V3): V3 => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
/** A normal, turned to face the side `hint` points to. */
function towards(n: V3, hint: V3): V3 {
  const l = Math.hypot(n[0], n[1], n[2]) || 1, s = n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0 ? -1 : 1;
  return [(n[0] * s) / l, (n[1] * s) / l, (n[2] * s) / l];
}
/** A quad whose corners need not lie square: it faces the side `hint` points to. */
function quadOut(b: GeoBuilder, p0: V3, p1: V3, p2: V3, p3: V3, hint: V3, color: number, o: { win?: WinSpec; L?: number; seed?: number } = {}): void {
  b.quad(p0, p1, p2, p3, towards(cross(sub(p1, p0), sub(p3, p0)), hint), color, o);
}
/** A triangle of a faceted surface, facing the side `hint` points to. */
function facet(b: GeoBuilder, p: V3, q: V3, r: V3, hint: V3, color: number): void {
  face3(b, p, q, r, towards(cross(sub(q, p), sub(r, p)), hint), color);
}
/** A colour a little lighter or darker. */
function tint(c: number, f: number): number {
  const ch = (s: number): number => Math.max(0, Math.min(255, Math.round(((c >> s) & 255) * f)));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
const mid = (l: Lot): { cx: number; cz: number; half: number } => ({ cx: (l.x0 + l.x1) / 2, cz: (l.z0 + l.z1) / 2, half: Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2 });

/**
 * A box that leans: every corner at height y is moved by (ax·y, az·y). For
 * Hardin's Tower, which the books have leaning.
 */
function leanBox(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, ax: number, az: number, color: number, o: { win?: WinSpec; top?: number; faces?: string; seed?: number } = {}): void {
  const P = (x: number, y: number, z: number): V3 => [x + ax * y, y, z + az * y];
  const f = o.faces ?? 'NESWT', q = { win: o.win, seed: o.seed };
  if (f.includes('S')) quadOut(b, P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1), [0, 0, 1], color, { ...q, L: x1 - x0 });
  if (f.includes('N')) quadOut(b, P(x1, y0, z0), P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0), [0, 0, -1], color, { ...q, L: x1 - x0 });
  if (f.includes('E')) quadOut(b, P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), [1, 0, 0], color, { ...q, L: z1 - z0 });
  if (f.includes('W')) quadOut(b, P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0), [-1, 0, 0], color, { ...q, L: z1 - z0 });
  if (f.includes('T')) b.quad(P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0), [0, 1, 0], o.top ?? color);
  if (f.includes('B')) b.quad(P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1), [0, -1, 0], color);
}

/**
 * A pitched roof with its ridge along x, over walls from (x0, z0) to (x1, z1)
 * whose tops are at `y`: two slabs with an underside, so that nothing is open
 * under the eaves, and the gable ends in the colour of the walls.
 */
function roof(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, rise: number, color: number, wall: number, over = 0.4): void {
  const xm = (x0 + x1) / 2, zc = (z0 + z1) / 2, slope = rise / ((z1 - z0) / 2), half = (x1 - x0) / 2 + over, eave = y - over * slope;
  slab(b, [xm, eave, z0 - over], [xm, y + rise, zc], half, 0.16, color, { under: TIMBER_DARK });
  slab(b, [xm, eave, z1 + over], [xm, y + rise, zc], half, 0.16, color, { under: TIMBER_DARK });
  face3(b, [x0, y, z0], [x0, y, z1], [x0, y + rise, zc], [-1, 0, 0], wall);
  face3(b, [x1, y, z0], [x1, y, z1], [x1, y + rise, zc], [1, 0, 0], wall);
}

/** A raven: a small dark box, facing `yaw`. */
function raven(b: GeoBuilder, x: number, y: number, z: number, yaw: number): void {
  b.obox(x, y + 0.13, z, 0.22, 0.13, 0.1, yaw, RAVEN);
}

/** A black brother, with a practice sword if he has one. */
function brother(b: GeoBuilder, x: number, z: number, y = 0.035, sword?: [number, number]): void {
  figure(b, x, z, y, BROTHER);
  if (sword) b.beam([x + sword[0] * 0.45, y + 1.25, z + sword[1] * 0.45], [x + sword[0] * 1.35, y + 1.75, z + sword[1] * 1.35], 0.05, 0.04, 0x9c8a6a);
}

// ---------------------------------------------------------------------------
// The Wall
// ---------------------------------------------------------------------------

const W = WALL;
/** The walk along the top, and the top of its parapets. Both stay under the Wall's top in the plan, so that what stands on the walk does too. */
const WALK = 40.2, PARAPET = 41.2;
/** Where the south face and the north face are, at height y. */
const zS = (y: number): number => W.south + ((W.topSouth - W.south) * y) / W.top;
const zN = (y: number): number => W.north + ((W.topNorth - W.north) * y) / W.top;

/** The tunnel: 9 wide between its walls, straight up to 6, and a flat vault over that. */
const GX0 = W.gateX - 4.5, GX1 = W.gateX + 4.5, SPRING = 6, CROWN = 2.2, ARC = 8;
/** How high the ice portal round each mouth stands, and how far it stands out from the face. */
const PORTAL_TOP = 10.5, PORTAL_OUT = 1.0;
/** A point on the vault's curve, from the west springing (0) to the east (ARC); `grow` is how far outside it. */
const arcPt = (i: number, grow = 0): [number, number] => {
  const a = Math.PI * (1 - i / ARC);
  return [W.gateX + Math.cos(a) * (4.5 + grow), SPRING + Math.sin(a) * (CROWN + grow)];
};
/** How high the vault is over a place across the tunnel, a little under its drawn chords. */
const vaultY = (x: number): number => SPRING + CROWN * Math.sqrt(Math.max(0, 1 - ((x - W.gateX) / 4.5) ** 2)) - 0.12;

/** The switchback stair on the south face, east of the gate: where its flights turn, and how they stand off the ice. */
const STAIR = { xa: 16.9, xb: 23.1, flights: 8, land: 1.2, off: 0.4, depth: 1.3 };
/** The winch cage, east of the stair: where it hangs, how high its floor is, how tall and wide it is. */
const CAGE = { x: 25.6, y0: 1.7, h: 2.6, w: 1.6 };

/** The south face as a grid, kept so that cracks can be laid on it. */
interface Grid { xs: number[]; ys: number[]; z: number[][] }

/** Rows of the south face: its dirty foot, its body, and three darker bands. */
const SOUTH_ROWS = [0, 9, 11.8, 13.2, 19, 24.6, 26, 32.5, 36.4, 37.8, WALK];
const SOUTH_BANDS = [0xa9b9c0, 0xcde0ea, 0x8faabb, 0xd8e8f0, 0xc5dbe8, 0x97b3c6, 0xd5e6ef, 0xc0d8e7, 0x9cbad0, 0xb6d2e5];
const NORTH_ROWS = [0, 9, 21, 31, WALK];
const NORTH_BANDS = [0x9fb3bd, 0xb6cedb, 0xa9c4d4, 0xbcd4e2];

/** Where the columns of a face's facets stand: about `step` apart, with the gate's two sides and middle among them. */
function columns(step: number, r: () => number): number[] {
  const out = [W.x0];
  let x = W.x0 + step * (0.6 + r() * 0.6);
  while (x < W.x1 - step * 0.5) {
    out.push(x);
    x += step * (0.7 + r() * 0.6);
  }
  out.push(W.x1);
  const gate = [GX0, W.gateX, GX1];
  return [...out.filter((v) => v < GX0 - 1.2 || v > GX1 + 1.2), ...gate].sort((a, c) => a - c);
}

/** One face of the Wall in facets, leaving the mouth of the tunnel open. */
function iceFace(b: GeoBuilder, side: 'S' | 'N'): Grid {
  const south = side === 'S', r = rng(south ? 7101 : 7102);
  const xs = columns(south ? 5.2 : 8.5, r), ys = south ? SOUTH_ROWS : NORTH_ROWS, bands = south ? SOUTH_BANDS : NORTH_BANDS;
  const base = south ? zS : zN, out = south ? 1 : -1, hint: V3 = [0, 0.1, out];
  const z = xs.map((x, i) => ys.map((y, j) => {
    // the ends, the top edge and the ice round the gate are true to the plan
    if (i === 0 || i === xs.length - 1 || j === ys.length - 1 || (Math.abs(x - W.gateX) < 6.6 && y < 11)) return base(y);
    let v = 0.45 * Math.sin(x * 0.17 + j * 0.9) - 0.3 + (r() - 0.5) * 0.4;
    // behind the stair and the cage the ice only ever falls back
    if (south && x > 14 && x < 28) v = Math.min(v, 0);
    return base(y) + out * v;
  }));
  for (let j = 0; j + 1 < ys.length; j++) {
    for (let i = 0; i + 1 < xs.length; i++) {
      if (xs[i] >= GX0 - 1e-6 && xs[i + 1] <= GX1 + 1e-6 && ys[j + 1] <= 9 + 1e-6) continue; // the mouth of the tunnel
      const color = tint(bands[j], 0.92 + r() * 0.12);
      const p00: V3 = [xs[i], ys[j], z[i][j]], p10: V3 = [xs[i + 1], ys[j], z[i + 1][j]];
      const p11: V3 = [xs[i + 1], ys[j + 1], z[i + 1][j + 1]], p01: V3 = [xs[i], ys[j + 1], z[i][j + 1]];
      facet(b, p00, p10, p11, hint, color);
      facet(b, p00, p11, p01, hint, tint(color, 0.985));
    }
  }
  return { xs, ys, z };
}

/** How far south the south face is at a place on it, on the very facet that is drawn there. */
function faceZ(g: Grid, x: number, y: number): number {
  let i = 0, j = 0;
  while (i + 2 < g.xs.length && g.xs[i + 1] < x) i++;
  while (j + 2 < g.ys.length && g.ys[j + 1] < y) j++;
  const u = Math.min(1, Math.max(0, (x - g.xs[i]) / (g.xs[i + 1] - g.xs[i]))), v = Math.min(1, Math.max(0, (y - g.ys[j]) / (g.ys[j + 1] - g.ys[j])));
  const z00 = g.z[i][j], z10 = g.z[i + 1][j], z01 = g.z[i][j + 1], z11 = g.z[i + 1][j + 1];
  return u >= v ? z00 + (z10 - z00) * u + (z11 - z10) * v : z00 + (z11 - z01) * u + (z01 - z00) * v;
}

/** Long cracks down the south face, laid a hair in front of its facets. */
function cracks(b: GeoBuilder, g: Grid): void {
  const r = rng(7177);
  for (let c = 0; c < 10; c++) {
    let x = W.x0 + 4 + r() * (W.x1 - W.x0 - 8);
    if (x > 2 && x < 29) x += 30; // not behind the gate, the stair or the cage
    let y = WALK - 0.4 - r() * 7;
    const end = Math.max(2, y - 12 - r() * 16), w = 0.08 + r() * 0.05;
    while (y > end) {
      const y2 = Math.max(end, y - 2.3), x2 = x + (r() - 0.5) * 1.1;
      const at = (px: number, py: number): V3 => [px, py, faceZ(g, px, py) + 0.12];
      b.quad(at(x2 - w, y2), at(x2 + w, y2), at(x + w, y), at(x - w, y), [0, 0.07, 1], 0x7f9fb2);
      x = x2;
      y = y2;
    }
  }
}

/** The top: the walk, the gravel strewn on it, and the parapets of ice blocks on both edges. */
function wallTop(b: GeoBuilder): void {
  const zs = zS(WALK), zn = zN(WALK);
  b.quad([W.x0, WALK, zs], [W.x1, WALK, zs], [W.x1, WALK, zn], [W.x0, WALK, zn], [0, 1, 0], ICE_TOP);
  // the ends: the west at the board's edge, the east a clean face where the Wall stops
  b.quad([W.x0, 0, W.north], [W.x0, 0, W.south], [W.x0, WALK, zs], [W.x0, WALK, zn], [-1, 0, 0], ICE_SHADE);
  b.quad([W.x1, 0, W.south], [W.x1, 0, W.north], [W.x1, WALK, zn], [W.x1, WALK, zs], [1, 0, 0], ICE_SHADE);

  // gravel down the middle of the walk, in patches, and a scatter of stones
  const r = rng(7203);
  for (let x = W.x0 + 1; x < W.x1 - 1; ) {
    const len = 4 + r() * 6, e = Math.min(W.x1 - 1, x + len);
    if (r() > 0.15) {
      const za = -94.5 + (r() - 0.5) * 0.8, zb = -94.5 + (r() - 0.5) * 0.8, ha = 0.6 + r() * 0.5, hb = 0.6 + r() * 0.5;
      b.quad([x, WALK + 0.02, za + ha], [e, WALK + 0.02, zb + hb], [e, WALK + 0.02, zb - hb], [x, WALK + 0.02, za - ha], [0, 1, 0], r() > 0.5 ? 0x9d978c : 0xa8a397);
    }
    x = e + 0.3 + r() * 1.5;
  }
  for (let i = 0; i < 24; i++) {
    const x = W.x0 + 1 + r() * (W.x1 - W.x0 - 2), z = -92.9 - r() * 3.3, s = 0.14 + r() * 0.12;
    b.up([x - s, WALK + 0.035, z], [x + s, WALK + 0.035, z + s * 0.6], [x, WALK + 0.035, z - s], 0x7f7a72);
  }

  // the parapets: ice blocks of uneven length, a gap where the stair comes up
  const parapet = (z0: number, z1: number, gaps: [number, number][], seed: number): void => {
    const q = rng(seed);
    for (let x = W.x0; x < W.x1 - 0.5; ) {
      let e = Math.min(W.x1, x + 4.5 + q() * 4);
      if (W.x1 - e < 1.5) e = W.x1;
      const gap = gaps.find(([a, c]) => e > a && x < c);
      const top = PARAPET - q() * 0.18;
      if (gap) {
        if (x < gap[0] - 0.4) b.box(x, WALK, z0, gap[0], top, z1, ICE, { top: ICE_TOP });
        x = gap[1];
        continue;
      }
      b.box(x, WALK, z0, e, top, z1, q() > 0.5 ? ICE : 0xc6dde9, { top: ICE_TOP });
      x = e + 0.4 + q() * 0.35;
    }
  };
  parapet(zs - 0.72, zs - 0.03, [[STAIR.xa - STAIR.land - 0.3, STAIR.xa + 0.3]], 7211);
  parapet(zn + 0.03, zn + 0.72, [], 7212);
}

/** The snow drifted against the foot of the south face, away from the castle. */
function drifts(b: GeoBuilder): void {
  const r = rng(7240);
  for (const [a, c] of [[W.x0, -16], [44, W.x1]] as const) {
    let x = a, h = 1 + r() * 0.8, f = -87.6 + (r() - 0.5) * 0.6;
    while (x < c - 0.5) {
      const x2 = Math.min(c, x + 4 + r() * 4), h2 = 1 + r() * 0.8, f2 = -87.6 + (r() - 0.5) * 0.6;
      quadOut(b, [x, 0, f], [x2, 0, f2], [x2, h2, zS(h2) + 0.3], [x, h, zS(h) + 0.3], [0, 0.6, 0.8], SNOW);
      x = x2;
      h = h2;
      f = f2;
    }
  }
}

/**
 * The ice round one mouth of the tunnel: two piers, the ice over the vault,
 * a ring of ice blocks round the arch, standing out from the face. `zf` is
 * its front and `zb` how far back it reaches into the ice; `s` is 1 for the
 * south mouth and -1 for the north.
 */
function portal(b: GeoBuilder, zf: number, zb: number, s: 1 | -1): void {
  const x0 = GX0 - 1, x1 = GX1 + 1, top = PORTAL_TOP, n: V3 = [0, 0, s];
  b.quad([x0, 0, zf], [GX0, 0, zf], [GX0, top, zf], [x0, top, zf], n, ICE);
  b.quad([GX1, 0, zf], [x1, 0, zf], [x1, top, zf], [GX1, top, zf], n, ICE);
  for (let i = 0; i < ARC; i++) {
    const [xa, ya] = arcPt(i), [xb, yb] = arcPt(i + 1);
    b.quad([xa, ya, zf], [xb, yb, zf], [xb, top, zf], [xa, top, zf], n, ICE);
  }
  b.quad([x0, 0, zb], [x0, 0, zf], [x0, top, zf], [x0, top, zb], [-1, 0, 0], ICE_SHADE);
  b.quad([x1, 0, zf], [x1, 0, zb], [x1, top, zb], [x1, top, zf], [1, 0, 0], ICE_SHADE);
  b.quad([x0, top, zf], [x1, top, zf], [x1, top, zb], [x0, top, zb], [0, 1, 0], SNOW);
  // the arch: a ring of ice blocks, a little proud of the portal
  const zv = zf + s * 0.28;
  for (let i = 0; i < ARC; i++) {
    const [xa, ya] = arcPt(i), [xb, yb] = arcPt(i + 1), [oa, pa] = arcPt(i, 0.95), [ob, pb] = arcPt(i + 1, 0.95);
    const am = Math.PI * (1 - (i + 0.5) / ARC), radial: V3 = [Math.cos(am) * CROWN, Math.sin(am) * 4.5, 0];
    quadOut(b, [xa, ya, zv], [xb, yb, zv], [ob, pb, zv], [oa, pa, zv], n, i % 2 ? ICE_TOP : ICE);
    quadOut(b, [xa, ya, zf], [xb, yb, zf], [xb, yb, zv], [xa, ya, zv], [-radial[0], -radial[1], 0], ICE_SHADE);
    quadOut(b, [oa, pa, zf], [ob, pb, zf], [ob, pb, zv], [oa, pa, zv], radial, ICE_TOP);
  }
  for (const [xi, xo] of [[GX0, GX0 - 0.95], [GX1, GX1 + 0.95]]) quadOut(b, [xi, SPRING, zf], [xo, SPRING, zf], [xo, SPRING, zv], [xi, SPRING, zv], [0, -1, 0], ICE_SHADE);
}

/** The tunnel: its two walls and its vault, the ice pale at each mouth and dark within. */
function tunnel(b: GeoBuilder, zSouth: number, zNorth: number): void {
  const zs = [zSouth, zSouth - 1.7, zNorth + 1.7, zNorth], colors = [TUNNEL_MOUTH, TUNNEL_DEEP, TUNNEL_MOUTH];
  for (let k = 0; k < 3; k++) {
    const za = zs[k], zb = zs[k + 1], c = colors[k];
    b.quad([GX0, 0, za], [GX0, 0, zb], [GX0, SPRING, zb], [GX0, SPRING, za], [1, 0, 0], c);
    b.quad([GX1, 0, zb], [GX1, 0, za], [GX1, SPRING, za], [GX1, SPRING, zb], [-1, 0, 0], c);
    for (let i = 0; i < ARC; i++) {
      const [xa, ya] = arcPt(i), [xb, yb] = arcPt(i + 1), am = Math.PI * (1 - (i + 0.5) / ARC);
      quadOut(b, [xa, ya, za], [xb, yb, za], [xb, yb, zb], [xa, ya, zb], [-Math.cos(am) * CROWN, -Math.sin(am) * 4.5, 0], c);
    }
  }
}

/** The portcullis at the south mouth, drawn up into the vault: only the foot of its grid and its teeth show. */
function portcullis(b: GeoBuilder, z: number): void {
  for (let x = GX0 + 0.5; x <= GX1 - 0.4; x += 0.9) {
    const top = vaultY(x);
    if (top < SPRING + 0.5) continue;
    b.box(x - 0.07, SPRING + 0.38, z - 0.07, x + 0.07, top, z + 0.07, IRON, { faces: 'NESW' });
    b.cyl(x, z, SPRING + 0.05, SPRING + 0.38, 0.01, 0.1, 4, IRON, { phase: Math.PI / 4, cap: false });
  }
  for (const y of [SPRING + 0.5, SPRING + 1.25]) {
    const reach = 4.5 * Math.sqrt(Math.max(0, 1 - ((y + 0.2 - SPRING) / CROWN) ** 2));
    b.box(W.gateX - reach, y - 0.07, z - 0.08, W.gateX + reach, y + 0.07, z + 0.08, IRON, { faces: 'NSTB' });
  }
}

/** The great wooden stair in zigzags up the south face, on beams frozen into the ice. */
function stair(k: Build): void {
  const b = k.b, S = STAIR, rise = WALK / S.flights;
  const zIn = (y: number): number => zS(y) + S.off, zMid = (y: number): number => zIn(y) + S.depth / 2;
  for (let f = 0; f < S.flights; f++) {
    const y0 = f * rise, y1 = (f + 1) * rise, east = f % 2 === 0;
    const xs = east ? S.xa : S.xb, xe = east ? S.xb : S.xa;
    slab(b, [xs, y0, zMid(y0)], [xe, y1, zMid(y1)], S.depth / 2, 0.22, WOOD_TOP, { under: WOOD });
    b.beam([xs, y0 + 0.85, zMid(y0) + 0.6], [xe, y1 + 0.85, zMid(y1) + 0.6], 0.045, 0.045, WOOD_RAIL);
    const xm = (xs + xe) / 2, ym = (y0 + y1) / 2;
    b.beam([xm, ym - 0.2, zMid(ym) + 0.45], [xm, ym - 2.2, zS(ym - 2.2) + 0.02], 0.1, 0.12, WOOD);
    // the landing at the top of the flight, where it turns
    const top = f === S.flights - 1;
    const lx0 = east ? S.xb : S.xa - S.land, lx1 = east ? S.xb + S.land : S.xa;
    const lz0 = top ? zS(WALK) + 0.02 : zIn(y1), lz1 = zIn(y1) + S.depth, ly = top ? WALK + 0.02 : y1;
    b.box(lx0, ly - 0.24, lz0, lx1, ly, lz1, WOOD, { faces: east ? 'NESTB' : 'NWSTB', top: WOOD_TOP });
    b.beam([lx0, ly + 0.85, lz1 - 0.05], [lx1, ly + 0.85, lz1 - 0.05], 0.045, 0.045, WOOD_RAIL);
    const lm = (lx0 + lx1) / 2;
    b.beam([lm, ly - 0.24, lz1 - 0.15], [lm, ly - 2.5, zS(ly - 2.5) + 0.02], 0.1, 0.12, WOOD);
  }
  // a brother on his way up the first flight
  const t = 0.5, x = S.xa + (S.xb - S.xa) * t, y = rise * t;
  brother(b, x, zMid(y), y + 0.02);
}

/**
 * The winch cage on its chain, and the crane arm over it at the top. The cage
 * is a mesh of its own, because it goes: up the ice with a brother in it, a
 * while at the walk, and down again. Its chain is another, one bar that is
 * drawn as long as the cage hangs low.
 */
function cage(k: Build): void {
  const b = k.b, C = CAGE, x0 = C.x - C.w / 2, x1 = C.x + C.w / 2;
  const z0 = zS(C.y0 + C.h) + 0.45, z1 = z0 + C.w, zm = (z0 + z1) / 2;
  // the crane arm stands high enough over the walk that the cage's floor comes level with it
  const arm = WALK + C.h + 1.1, roof = C.h + 0.12;
  // the cage, with its floor at 0
  const g = new GeoBuilder();
  g.box(x0, -0.12, z0, x1, 0, z1, IRONWORK, { faces: 'NESWTB' });
  g.box(x0, C.h, z0, x1, roof, z1, IRONWORK, { faces: 'NESWTB', top: SNOW });
  for (const [x, z] of [[x0, z0], [x1 - 0.12, z0], [x0, z1 - 0.12], [x1 - 0.12, z1 - 0.12]]) g.box(x, 0, z, x + 0.12, C.h, z + 0.12, IRON, { faces: 'NESW' });
  for (const u of [-0.27, 0.27]) {
    for (const z of [z0 + 0.02, z1 - 0.1]) g.box(C.x + u - 0.04, 0, z, C.x + u + 0.04, C.h, z + 0.08, IRON, { faces: 'NESW' });
    for (const x of [x0 + 0.02, x1 - 0.1]) g.box(x, 0, zm + u - 0.04, x + 0.08, C.h, zm + u + 0.04, IRON, { faces: 'NESW' });
  }
  brother(g, C.x - 0.1, zm, 0);
  const material = k.mat.city();
  const lift = new THREE.Mesh(g.build(), material);
  lift.name = 'winch-cage';
  lift.castShadow = true;
  const link = new GeoBuilder();
  link.box(C.x - 0.05, 0, zm - 0.05, C.x + 0.05, 1, zm + 0.05, 0xb7bcc2, { faces: 'NESW' });
  const chain = new THREE.Mesh(link.build(), material);
  chain.name = 'winch-chain';
  k.group.add(lift, chain);
  // a slow round: a while at the foot, up, a while at the walk, down
  const low = C.y0, high = WALK, wait = 7, climb = 17, round = 2 * (wait + climb);
  let t = 3;
  k.each((dt) => {
    t = (t + dt) % round;
    const u = t < wait ? 0 : t < wait + climb ? (t - wait) / climb : t < 2 * wait + climb ? 1 : 1 - (t - 2 * wait - climb) / climb;
    const y = low + (high - low) * u * u * (3 - 2 * u);
    lift.position.y = y;
    chain.position.y = y + roof;
    chain.scale.y = Math.max(0.01, arm - 0.45 - (y + roof));
  });
  // the crane arm on the walk, and the winch that winds the chain
  b.box(C.x - 0.25, WALK, -93.3, C.x + 0.25, arm + 0.2, -92.8, WOOD, { top: SNOW });
  b.beam([C.x, arm, -94.3], [C.x, arm, zm], 0.14, 0.12, WOOD);
  // a strut from the post's foot out under the arm
  b.beam([C.x, WALK + 0.9, -93.05], [C.x, arm - 0.1, (zm - 93.05) / 2], 0.09, 0.08, WOOD);
  b.box(C.x - 0.18, arm - 0.45, zm - 0.18, C.x + 0.18, arm - 0.1, zm + 0.18, IRONWORK, { faces: 'NESWTB' });
  b.box(C.x - 0.4, 40.95, -94.75, C.x + 0.4, arm - 0.1, -94.05, GRANITE_SHADE, { faces: 'NESWTB', top: SNOW });
  drum(b, [C.x, 40.85, -95.5], 0.42, 0.7, WOOD, { cap: TIMBER_DARK });
  for (const s of [-1, 1]) b.box(C.x + s * 0.8 - 0.1, WALK, -95.8, C.x + s * 0.8 + 0.1, 41.15, -95.2, TIMBER_DARK);
}

/** A warming shed on the walk: timber, with a lit window and a roof under snow. */
function shed(b: GeoBuilder, x0: number, x1: number): void {
  const z0 = -96.2, z1 = -93.6, top = WALK + 1.7, xm = (x0 + x1) / 2;
  b.box(x0, WALK, z0, x1, top, z1, TIMBER, { faces: 'NESWT' });
  roof(b, x0, z0, x1, z1, top, 0.95, SNOW_ROOF, TIMBER, 0.3);
  b.box(xm - 1.3, WALK, z1, xm - 0.5, WALK + 1.35, z1 + 0.05, DOOR, { faces: 'SEW' });
  b.box(xm + 0.4, WALK + 0.65, z1, xm + 1.3, WALK + 1.25, z1 + 0.05, 0x2a2420, { faces: 'SEW', win: interior(0.8) });
}

/** A catapult on the walk, its arm laid back, made to throw north. */
function catapult(b: GeoBuilder, x: number, z: number): void {
  b.moved(x, WALK, z, -Math.PI / 2, () => {
    for (const s of [-1, 1]) b.box(-1.4, 0, s * 0.75 - 0.13, 1.4, 0.3, s * 0.75 + 0.13, TIMBER);
    b.box(-1.15, 0.05, -0.62, -0.9, 0.28, 0.62, TIMBER_DARK, { faces: 'EWT' });
    for (const s of [-1, 1]) {
      b.beam([-0.55, 0.3, s * 0.75], [0, 1.25, s * 0.72], 0.08, 0.07, TIMBER);
      b.beam([0.55, 0.3, s * 0.75], [0, 1.25, s * 0.72], 0.08, 0.07, TIMBER);
    }
    b.beam([0, 1.25, -0.8], [0, 1.25, 0.8], 0.06, 0.06, IRON);
    b.beam([-1.3, 0.5, 0], [0.75, 1.75, 0], 0.09, 0.07, WOOD);
    b.box(-1.65, 0.38, -0.25, -1.05, 0.72, 0.25, TIMBER_DARK);
  });
}

/** A scorpion: a great crossbow on a post, aimed north. */
function scorpion(b: GeoBuilder, x: number, z: number): void {
  b.moved(x, WALK, z, -Math.PI / 2, () => {
    b.box(-0.35, 0, -0.35, 0.35, 0.18, 0.35, TIMBER_DARK, { top: SNOW });
    b.cyl(0, 0, 0.18, 0.95, 0.14, 0.11, 6, TIMBER, { cap: false });
    b.beam([-0.95, 1.05, 0], [0.95, 1.05, 0], 0.1, 0.09, WOOD);
    for (const s of [-1, 1]) {
      b.beam([0.65, 1.07, 0], [0.32, 1.12, s * 0.95], 0.06, 0.04, TIMBER);
      b.beam([0.32, 1.12, s * 0.95], [-0.25, 1.12, 0], 0.025, 0.025, 0xd8d2c4);
    }
    b.beam([-0.3, 1.18, 0], [1.25, 1.18, 0], 0.04, 0.04, IRON);
  });
}

/** The beacon in its great iron basket on the walk, with a fire that burns. */
function beacon(k: Build, x: number, z: number): void {
  const b = k.b;
  b.box(x - 1, WALK, z - 1, x + 1, WALK + 0.3, z + 1, GRANITE_SHADE, { top: SNOW });
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.beam([x + sx * 0.82, WALK + 0.3, z + sz * 0.82], [x + sx * 0.5, WALK + 0.95, z + sz * 0.5], 0.06, 0.06, IRON);
  lathe(b, x, z, [[0.55, WALK + 0.85], [1.05, WALK + 1.4], [1.2, WALK + 1.8]], 8, IRON);
  b.cyl(x, z, WALK + 1.15, WALK + 1.42, 0.92, 0.98, 8, 0x5a1e0c, { cap: 0xc4471a });
  fire(k, x, WALK + 2.0, z, 0.75, 14);

  const flames = new Flames(110);
  k.group.add(flames.mesh);
  const r = rng(7401), at = new THREE.Vector3(), dir = new THREE.Vector3(), side = new THREE.Vector3(0, 0, 1), still = new THREE.Vector3();
  let owed = 0;
  k.each((dt, _time, night) => {
    owed += Math.min(dt, 0.1) * 75;
    for (; owed >= 1; owed--) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.8;
      at.set(x + Math.cos(a) * d, WALK + 1.45, z + Math.sin(a) * d);
      dir.set((r() - 0.5) * 0.4, 1, (r() - 0.5) * 0.4).normalize();
      flames.tongue(at, dir, side, still, 0.35 + r() * 0.6);
    }
    flames.update(dt, night);
  });
}

const theWall: Model = (k) => {
  const b = k.b;
  const grid = iceFace(b, 'S');
  iceFace(b, 'N');
  cracks(b, grid);
  wallTop(b);
  drifts(b);

  // the gate: a portal of ice at each mouth, the tunnel between, the portcullis drawn up at the south
  const zSouth = zS(0) + PORTAL_OUT, zNorth = zN(0) - PORTAL_OUT;
  portal(b, zSouth, zS(PORTAL_TOP) - 0.9, 1);
  portal(b, zNorth, zN(PORTAL_TOP) + 0.9, -1);
  tunnel(b, zSouth, zNorth);
  portcullis(b, zSouth - 0.45);
  for (const x of [GX0 - 0.5, GX1 + 0.5]) {
    b.box(x - 0.1, 4.2, zSouth, x + 0.1, 4.5, zSouth + 0.3, IRONWORK);
    fire(k, x, 4.85, zSouth + 0.25, 0.26, 9);
  }
  nameBoard(k, 'wall-the-wall', W.gateX, zSouth - 0.5, PORTAL_TOP, [0, 0, 1], 1.6);

  stair(k);
  cage(k);

  // on the top above Castle Black: two warming sheds, a catapult, a scorpion, braziers, the beacon, and men on watch
  shed(b, -9.5, -4.5);
  shed(b, 31.5, 36.5);
  catapult(b, 0.3, -94.6);
  scorpion(b, 20.8, -94.4);
  beacon(k, 6, -94.0);
  for (const x of [-13, 12.8, 29.5, 40.5]) brazier(k, x, -93.0, WALK);
  for (const [x, z] of [[3.0, -93.0], [18.4, -93.4], [-16.5, -93.6]]) brother(b, x, z, WALK);
};

// ---------------------------------------------------------------------------
// Castle Black
// ---------------------------------------------------------------------------

/** The Tower of the Lance: the tallest, slender and crumbling, its top broken off higher on the north-west. */
const lance: Model = (k, l) => {
  const b = k.b, { cx, cz, half } = mid(l);
  const r0 = (half * 0.95) / Math.cos(Math.PI / 8), r1 = r0 * 0.86, top = Math.floor((l.top - 1.2) / 3.4) * 3.4;
  b.cyl(cx, cz, 0, top, r0, r1, 8, GRANITE, { win: LOOPS_CLOSE, seed: 0.31, cap: SNOW });
  const ym = top / 2, rm = r0 + ((r1 - r0) * ym) / top;
  b.cyl(cx, cz, ym, ym + 0.25, rm + 0.14, rm + 0.14, 8, GRANITE_SHADE, { cap: SNOW });
  // what is left of its wall: by the side it faces, from the south-east round to the east
  const left = [0, 0.2, 0.6, 1.1, l.top - top, 1.2, 0.7, 0.25];
  const side = 2 * r1 * Math.sin(Math.PI / 8) * 0.92, rr = r1 * Math.cos(Math.PI / 8) - 0.17;
  left.forEach((h, i) => {
    if (h <= 0) return;
    const a = Math.PI / 4 + (i * Math.PI) / 4;
    b.obox(cx + Math.cos(a) * rr, top + h / 2, cz + Math.sin(a) * rr, 0.17, h / 2, side / 2, a, GRANITE, { top: SNOW });
  });
  // the door, and stones fallen from the top
  const zf = cz + r0 * Math.cos(Math.PI / 8);
  b.box(cx - 0.4, 0, zf - 0.05, cx + 0.4, 1.7, zf + 0.06, DOOR, { faces: 'SEWT' });
  for (const [dx, dz, s, a] of [[1.5, 1.2, 0.32, 0.4], [1.1, 1.75, 0.22, 1.1], [1.85, 0.6, 0.18, 2.0]]) b.obox(cx + dx, s * 0.6, cz + dz, s, s * 0.6, s * 0.8, a, GRANITE_SHADE, { top: SNOW });
};

/** The Lord Commander's Tower: square and whole, with the Watch's plain black banner. */
const commander: Model = (k, l) => {
  const b = k.b, { cx, cz, half } = mid(l), r = half - 0.3, top = l.top - 0.8;
  squareTower(b, cx, cz, r, top, GRANITE, { win: LOOPS_CLOSE, shade: SNOW, seed: 0.52 });
  b.box(cx - 0.5, 0, cz + r - 0.02, cx + 0.5, 1.9, cz + r + 0.07, DOOR, { faces: 'SEWT' });
  b.box(cx - 0.8, 0, cz + r, cx + 0.8, 0.25, cz + r + 0.6, GRANITE_SHADE, { top: SNOW });
  banner(b, cx + 0.6, cz - 0.6, top, 'watch', 3.6, 0.65);
};

/** Hardin's Tower: it leans to the west, and its battlements are broken. */
const hardin: Model = (k, l) => {
  const b = k.b, { cx, cz } = mid(l), hx = Math.min(1.35, (l.x1 - l.x0) / 2 - 0.55), hz = Math.min(1.3, (l.z1 - l.z0) / 2 - 0.4);
  const ax = -0.06, az = -0.012, x0 = cx + 0.1 - hx, x1 = cx + 0.1 + hx, z0 = cz - hz, z1 = cz + hz;
  const shaft = 8.4, crown = shaft + 0.75, merlon = l.top - 0.05 - crown;
  leanBox(b, x0, z0, x1, z1, 0, shaft, ax, az, GRANITE, { win: { cell: 1.3, storey: 2.8, lit: 0.35, kind: 4 }, faces: 'NESW', seed: 0.61 });
  leanBox(b, x0 - 0.15, z0 - 0.15, x1 + 0.15, z1 + 0.15, shaft, crown, ax, az, GRANITE, { faces: 'NESWTB', top: SNOW });
  // what is left of the battlements: [along the side, which side, how much of a merlon]
  const w = 0.32, keep: [number, string, number][] = [
    [-0.5, 'N', 1], [0.5, 'N', 1], [-0.5, 'S', 1], [0.5, 'S', 0.35], [-0.5, 'W', 1], [0.5, 'E', 0.2],
  ];
  for (const [u, s, f] of keep) {
    const along = s === 'N' || s === 'S', ex = hx + 0.15, ez = hz + 0.15;
    const mx = along ? cx + 0.1 + u * hx : s === 'E' ? x1 + 0.15 - w : x0 - 0.15 + w;
    const mz = along ? (s === 'S' ? z1 + 0.15 - w : z0 - 0.15 + w) : cz + u * hz;
    const lx = along ? 0.36 * ex : w, lz = along ? w : 0.36 * ez;
    leanBox(b, mx - lx, mz - lz, mx + lx, mz + lz, crown, crown + merlon * f, ax, az, GRANITE, { faces: 'NESWT', top: SNOW });
  }
  // the door, on the leaning south face
  const P = (x: number, y: number): V3 => [x + ax * y, y, z1 + 0.04 + az * y];
  quadOut(b, P(cx - 0.35, 0), P(cx + 0.45, 0), P(cx + 0.45, 1.7), P(cx - 0.35, 1.7), [0, 0, 1], DOOR);
  // merlons fallen off the east side
  for (const [dx, dz, a] of [[0.55, 0.3, 0.3], [0.95, -0.6, 1.2]]) b.obox(x1 + dx, 0.22, cz + dz, 0.3, 0.22, 0.25, a, GRANITE_SHADE, { top: SNOW });
};

/** The Shieldhall: a long hall of dark stone, with the old shields on its front. */
const shieldhall: Model = (k, l) => {
  const b = k.b, x0 = l.x0 + 0.5, x1 = l.x1 - 0.5, z0 = l.z0 + 0.5, z1 = l.z1 - 0.5, wall = 4.4, xm = (x0 + x1) / 2;
  b.box(x0, 0, z0, x1, wall, z1, DARK_STONE, { win: { cell: 1.6, storey: wall, lit: 0.4, kind: 6 }, seed: 0.77 });
  roof(b, x0, z0, x1, z1, wall, l.top - wall, SNOW_ROOF, DARK_STONE, 0.4);
  for (const x of [x0 + 1.6, xm - 1.8, xm + 1.8, x1 - 1.6]) b.box(x - 0.28, 0, z1, x + 0.28, 3.0, z1 + 0.5, DARK_STONE, { faces: 'ESWT', top: SNOW });
  const shields = [0x7b2a26, 0x2f4d6e, 0x8a7a3a, 0x3d5a3a, 0x6a6a70, 0x5a3a5e];
  shields.forEach((c, i) => {
    const x = x0 + 0.9 + ((x1 - x0 - 1.8) * (i + 0.5)) / shields.length;
    b.obox(x, 3.55, z1 + 0.05, 0.3, 0.34, 0.04, 0, c);
  });
  b.box(xm - 0.6, 0, z1 - 0.02, xm + 0.6, 2.3, z1 + 0.06, 0x2a2420, { win: interior(0.55), faces: 'SEWT' });
};

/** The King's Tower: round, battlemented, with a merlon gone from the side the view looks at. */
const kingsTower: Model = (k, l) => {
  const b = k.b, { cx, cz, half } = mid(l), r = half - 0.25, R = r + 0.25, ring = l.top - 0.8, shaft = ring - 2, sides = 12;
  b.cyl(cx, cz, 0, shaft, r, r, sides, GRANITE, { win: LOOPS_CLOSE, cap: false, seed: 0.83 });
  b.cyl(cx, cz, shaft / 1.5, shaft / 1.5 + 0.25, r + 0.12, r + 0.12, sides, GRANITE_SHADE, { cap: SNOW });
  b.cyl(cx, cz, shaft - 0.45, shaft, r, R, sides, GRANITE_SHADE, { cap: false });
  b.cyl(cx, cz, shaft, ring, R, R, sides, GRANITE, { cap: SNOW });
  for (let i = 0; i < sides; i += 2) {
    const a = ((i + 0.5) / sides) * Math.PI * 2, w = R * Math.sin(Math.PI / sides) * 0.9, h = i === 2 ? 0.2 : 0.8;
    b.obox(cx + Math.cos(a) * (R - 0.2), ring + h / 2, cz + Math.sin(a) * (R - 0.2), 0.2, h / 2, w, a, GRANITE, { top: SNOW });
  }
  // the missing merlon, fallen on the roof
  b.obox(cx + 0.4, ring + 0.18, cz + 0.6, 0.3, 0.18, 0.22, 0.7, GRANITE_SHADE, { top: SNOW });
  const rr = r * Math.cos(Math.PI / sides);
  b.box(cx - rr - 0.06, 0, cz - 0.45, cx - rr + 0.04, 1.9, cz + 0.45, DOOR, { faces: 'NSWT' });
};

/** The common hall: a long timber hall on a stone footing, with a great chimney that smokes and a porch along its front. */
const commonHall: Model = (k, l) => {
  const b = k.b, x0 = l.x0 + 0.4, x1 = l.x1 - 0.4, z0 = l.z0 + 0.4, z1 = l.z1 - 0.3, xm = (x0 + x1) / 2, zc = (z0 + z1) / 2, eave = 3.8;
  b.box(x0 - 0.1, 0, z0 - 0.1, x1 + 0.1, 0.6, z1 + 0.1, GRANITE_SHADE, { top: SNOW });
  b.box(x0, 0.6, z0, x1, eave, z1, TIMBER, { win: { cell: 2.1, storey: eave, lit: 0.5, kind: 4 }, seed: 0.91 });
  roof(b, x0, z0, x1, z1, eave, l.top - 0.9 - eave, SNOW_ROOF, TIMBER, 0.35);
  b.box(x1 - 2.2, 0.6, zc - 0.65, x1 - 1.0, l.top, zc + 0.65, GRANITE, { top: DARK });
  for (let i = 0; i <= 4; i++) {
    const x = x0 + ((x1 - x0) * i) / 4;
    b.box(x - 0.1, 0.6, z1, x + 0.1, eave, z1 + 0.07, TIMBER_DARK, { faces: 'SEWT' });
  }
  b.box(xm - 0.6, 0, z1 - 0.02, xm + 0.6, 2.6, z1 + 0.14, 0x2a2017, { win: interior(0.7), faces: 'SEWT' });
  // the porch along its front
  slab(b, [xm, 3.1, z1 + 0.12], [xm, 2.65, z1 + 1.45], (x1 - x0) / 2 - 0.3, 0.12, SNOW_ROOF, { under: TIMBER_DARK });
  for (const x of [x0 + 0.5, xm - 2.5, xm + 2.5, x1 - 0.5]) b.beam([x, 0, z1 + 1.32], [x, 2.62, z1 + 1.32], 0.09, 0.09, TIMBER_DARK);
  k.lights.push({ x: xm, z: z1 + 2.5, r: 11, color: '#ffcf8a', k: 0.5 });
};

/** The armoury: low and stone, its forge glowing at the door on its east end. */
const armoury: Model = (k, l) => {
  const b = k.b, moles = lotOf('moles-town');
  // where Mole's Town's lot reaches into this one, the building stops short of it
  const x0 = l.x0 + 0.3, x1 = l.x1 - 0.3, z0 = l.z0 + 0.3, z1 = Math.min(l.z1, moles.z0) - 0.35, zc = (z0 + z1) / 2, wall = 3.4;
  b.box(x0, 0, z0, x1, wall, z1, GRANITE, { win: LOOPS_CLOSE, seed: 0.44 });
  hip(b, x0, z0, x1, z1, wall, l.top - 0.35 - wall, SNOW_ROOF, 0.25);
  b.box(x1 - 1.1, 0, z0 + 0.4, x1 - 0.45, l.top, z0 + 1.05, GRANITE_SHADE, { top: DARK });
  b.box(x1 - 0.02, 0, zc - 0.6, x1 + 0.06, 2.1, zc + 0.6, 0x2b1a10, { win: interior(0.95), faces: 'NSET' });
  k.glows.push({ x: x1 + 0.09, y: 0.85, z: zc, sx: 0.04, sy: 0.9, sz: 0.85, color: '#ff7a2e' });
  // the anvil on its stump, and the quenching tub
  b.box(x1 + 0.9, 0, zc - 0.25, x1 + 1.3, 0.55, zc + 0.25, TIMBER_DARK);
  b.box(x1 + 0.72, 0.55, zc - 0.36, x1 + 1.48, 0.82, zc + 0.36, 0x4a4c52);
  b.cyl(x1 + 0.75, zc + 1.05, 0, 0.75, 0.32, 0.32, 6, TIMBER, { cap: 0x4a6070 });
  k.lights.push({ x: x1 + 1.2, z: zc, r: 9, color: '#ff9a50', k: 0.6 });
};

/** The rookery: a round tower with a timber loft for the birds, a cone roof, and ravens on it. */
const rookery: Model = (k, l) => {
  const b = k.b, { cx, cz, half } = mid(l), r = half - 0.35, sides = 10, loft = 6.8, ring = 8.0, eave = 8.6;
  b.cyl(cx, cz, 0, loft, r, r, sides, GRANITE, { win: LOOPS_CLOSE, cap: false, seed: 0.27 });
  b.cyl(cx, cz, loft, ring, r + 0.05, r + 0.05, sides, TIMBER_DARK, { cap: false });
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2, rr = (r + 0.05) * Math.cos(Math.PI / sides) + 0.02;
    b.obox(cx + Math.cos(a) * rr, (loft + ring) / 2, cz + Math.sin(a) * rr, 0.04, 0.32, 0.26, a, DARK);
  }
  b.cyl(cx, cz, ring - 0.3, ring, r + 0.05, r + 0.3, sides, GRANITE_SHADE, { cap: false });
  b.cyl(cx, cz, ring, eave, r + 0.3, r + 0.3, sides, GRANITE, { cap: SNOW });
  lathe(b, cx, cz, [[r + 0.45, eave], [(r + 0.3) * 0.55, eave + 1.4], [0.05, l.top + 2.6]], sides, ROOF.slate);
  for (const a of [0.3, 1.25, 2.4, 3.5, 4.5, 5.6]) raven(b, cx + Math.cos(a) * (r + 0.55), eave, cz + Math.sin(a) * (r + 0.55), a + Math.PI / 2);
  raven(b, cx + 0.6, eave + 1.0, cz + 0.6, 0.8);
  raven(b, cx + r + 0.9, 0.035, cz + 1.2, 2.2);
  raven(b, cx + r + 1.3, 0.035, cz + 0.6, 0.4);
};

// ---------------------------------------------------------------------------
// The yard, and what goes on in it
// ---------------------------------------------------------------------------

/**
 * The yard of trodden snow, on both sides of the kingsroad, clear of it by
 * half a unit. It stops short of Mole's Town's lot and of Winterfell.
 */
function yard(k: Build): void {
  const moles = lotOf('moles-town'), s = -76.6, n = -88.8;
  area(k, [[-15.5, n], [GX0, n], [GX0, -84], [6.05, -80.7], [7.6, -77.7], [8.3, s], [-15.5, s]], YARD, 0.035);
  area(k, [[GX1, n], [44.5, n], [44.5, s], [moles.x1 + 0.2, s], [moles.x1 + 0.2, moles.z0 - 0.1], [moles.x0 - 0.2, moles.z0 - 0.1], [moles.x0 - 0.2, s], [19.7, s], [15.0, -82.6], [GX1, -84]], YARD, 0.035);
  // frozen mud where the most feet go
  for (const [x, z, rx, rz] of [[18.6, -86.6, 3.0, 1.5], [32, -81.4, 3.5, 0.9], [-2, -81.8, 4, 1.2], [35.4, -79.7, 1.5, 1.7], [39.6, -80.6, 2.8, 1.5], [-9.5, -80.2, 2.2, 0.9]]) {
    area(k, oval(x, z, rx, rz, 12), MUD, 0.045);
  }
}

/** Covered timber walks between some of the buildings, and a gallery in the air. */
function walks(k: Build): void {
  const b = k.b, sh = lotOf('cb-shieldhall'), lc = lotOf('cb-commander'), kt = lotOf('cb-king'), ch = lotOf('cb-hall');
  // from the Shieldhall's east end to the Lord Commander's Tower, on the ground
  const xa = sh.x1 - 0.5, xb = mid(lc).cx - (mid(lc).half - 0.3), za = -83.75, zb = -82.25;
  b.box(xa, 2.5, za, xb, 2.65, zb, TIMBER_DARK, { faces: 'NSTB', top: SNOW });
  for (const x of [xa + 1.1, xb - 1.1]) for (const z of [za + 0.15, zb - 0.15]) b.beam([x, 0, z], [x, 2.5, z], 0.08, 0.08, TIMBER);
  // from the King's Tower to the common hall's gable, a storey up
  const ga = mid(kt).cx + 1.4, gb = ch.x0 + 0.4, gz0 = -85.1, gz1 = -83.9;
  b.box(ga, 2.9, gz0, gb, 3.1, gz1, TIMBER, { faces: 'NSTB', top: WOOD_TOP });
  for (const z of [gz0 + 0.05, gz1 - 0.05]) b.beam([ga + 0.3, 3.95, z], [gb, 3.95, z], 0.04, 0.04, WOOD_RAIL);
  b.box(ga, 4.6, gz0 - 0.15, gb, 4.72, gz1 + 0.15, TIMBER_DARK, { faces: 'NSTB', top: SNOW });
  for (const x of [ga + 0.35, gb - 0.12]) for (const z of [gz0 + 0.06, gz1 - 0.06]) b.beam([x, 3.1, z], [x, 4.6, z], 0.06, 0.06, TIMBER);
  // two trapdoors down to the wormways
  for (const [x, z] of [[-6.3, -79.4], [24.7, -81.3]]) {
    b.box(x - 0.5, 0.035, z - 0.45, x + 0.5, 0.1, z + 0.45, TIMBER_DARK, { faces: 'NESWT' });
    b.box(x - 0.52, 0.1, z - 0.06, x + 0.52, 0.13, z + 0.06, IRON, { faces: 'NSEWT' });
  }
}

/** The quintain, the archery butts and the woodpile, the brothers at their work, braziers and lights. */
function yardLife(k: Build): void {
  const b = k.b;
  // the quintain: a post with a turning arm, a shield on one end and a sack on the other
  const qx = 26.3, qz = -80.6;
  b.beam([qx, 0, qz], [qx, 2.4, qz], 0.1, 0.09, TIMBER);
  b.beam([qx - 1.0, 2.2, qz], [qx + 1.0, 2.2, qz], 0.06, 0.06, TIMBER_DARK);
  b.box(qx - 1.15, 1.6, qz - 0.3, qx - 0.95, 2.3, qz + 0.3, 0x6b4a3a);
  b.box(qx + 0.8, 1.15, qz - 0.22, qx + 1.2, 1.8, qz + 0.22, 0xb2a07a);
  // two butts of straw, and the brothers at the mark
  for (const z of [-81.8, -80.0]) {
    b.box(43.0, 0, z - 0.6, 43.6, 1.3, z + 0.6, 0xc9b06f, { top: SNOW });
    b.obox(42.97, 0.72, z, 0.02, 0.34, 0.34, 0, 0xa83a2a);
  }
  brother(b, 37.2, -81.5, 0.035, [1, 0]);
  // two brothers at practice with wooden swords
  brother(b, 37.6, -79.4, 0.045, [0.8, -0.6]);
  brother(b, 39.4, -80.6, 0.045, [-0.8, 0.6]);
  // the woodpile between the King's Tower and the hall, and a brother hauling from it
  const wx0 = 25.7, wx1 = 26.9;
  [[0, 0.35, 0], [0.35, 0.7, 0.12], [0.7, 0.95, 0.3]].forEach(([y0, y1, inset], i) => b.box(wx0 + inset, y0, -86.9 + inset, wx1 - inset, y1, -85.4 - inset, i % 2 ? 0x7d5f42 : 0x8a6a4b, { top: i === 2 ? SNOW : 0x8a6a4b }));
  brother(b, 24.8, -82.6, 0.035);
  b.box(25.3, 0.035, -83.4, 26.5, 0.35, -82.9, 0x7d5f42, { top: 0x8a6a4b });
  // the guards at the gate, and the smith at the forge
  brother(b, GX0 - 1.6, -87.3);
  brother(b, GX1 + 0.6, -86.6);
  const ar = lotOf('cb-armoury');
  brother(b, ar.x1 + 1.1, -80.4, 0.045);
  // braziers, and pools of light on the snow
  brazier(k, 19.6, -87.0, 0.035);
  brazier(k, -1.3, -80.6, 0.045);
  k.lights.push(
    { x: 18, z: -84.5, r: 12, color: '#ffcf8a', k: 0.5 },
    { x: 1.5, z: -82, r: 11, color: '#ffcf8a', k: 0.45 },
    { x: -9.5, z: -79.5, r: 10, color: '#ffcf8a', k: 0.4 },
    { x: 40, z: -81.5, r: 10, color: '#ffcf8a', k: 0.45 },
  );
}

/** Smoke from the common hall's great chimney and the armoury's forge. */
function chimneys(k: Build): void {
  const hall = lotOf('cb-hall'), ar = lotOf('cb-armoury');
  const at: [number, number, number, number][] = [
    [hall.x1 - 2.0, hall.top, (hall.z0 + hall.z1) / 2 + 0.1, 0.9],
    [ar.x1 - 1.08, ar.top, ar.z0 + 1.03, 0.55],
  ];
  const smoke = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 80);
  k.group.add(smoke.mesh);
  const r = rng(7311), from = new THREE.Vector3(), drift = new THREE.Vector3(0.45, 0.35, 0.15), due = at.map(() => 0);
  k.each((dt) => {
    at.forEach(([x, y, z, size], i) => {
      due[i] -= dt;
      if (due[i] > 0) return;
      due[i] = 0.28 + r() * 0.35;
      smoke.puff(from.set(x + (r() - 0.5) * 0.4, y + 0.2, z + (r() - 0.5) * 0.4), drift, size, 0.74);
    });
    smoke.update(dt);
  });
}

// ---------------------------------------------------------------------------
// The Frostfangs
// ---------------------------------------------------------------------------

const F1 = lotOf('frostfangs-1'), F2 = lotOf('frostfangs-2');
/** The peaks: where each stands, how high it would rise, and how far its foot reaches. */
const PEAKS: [number, number, number, number][] = [
  [-97.5, -109.5, 58, 11], [-91, -105.5, 42, 7.5], [-102.5, -104, 32, 6], [-93, -112, 48, 6.5], [-87.5, -110, 40, 6],
  [-80, -109.5, 47, 9], [-74, -110.5, 32, 6.5], [-84, -106, 34, 5.5], [-76.5, -106, 22, 5],
];
/** How high a mountain may stand at a place: its lot's top inside a lot, a foot of scree within 3 of one, nothing beyond or at the Wall. */
function frostCap(x: number, z: number): number {
  if (z > W.north - 0.3) return 0;
  let c = 0;
  for (const l of [F1, F2]) {
    const d = Math.hypot(Math.max(l.x0 - x, 0, x - l.x1), Math.max(l.z0 - z, 0, z - l.z1));
    c = Math.max(c, d === 0 ? l.top : d < 3 ? 2 * (1 - d / 3) : 0);
  }
  return c;
}
function frostShape(x: number, z: number): number {
  let h = 0;
  for (const [px, pz, ph, pr] of PEAKS) {
    const d = Math.hypot(x - px, (z - pz) * 1.15) / pr;
    if (d < 1) h = Math.max(h, ph * (1 - d ** 1.8));
  }
  if (h > 3) h += 1.8 * Math.sin(x * 1.3 + z * 0.7) * Math.cos(z * 1.7 - x * 0.4);
  return Math.min(h, frostCap(x, z));
}
const FROST = field(F1.x0, F1.z0, F2.x1 + 2, W.north, 2, frostShape);

const frostfangs: Model = (k) => {
  drawField(k.b, FROST, {
    color: (y, level, x, z) => {
      const n = Math.sin(x * 3.1 + z * 1.7) > 0;
      if (y > 30 && level > 0.12) return n ? SNOW : 0xe4eaee;
      if (level < 0.5) return y > 20 && level > 0.3 ? 0xdfe6ea : n ? 0x4d4b50 : 0x5a5752;
      if (y > 10 || level > 0.82) return n ? SNOW : 0xe4eaee;
      return n ? 0x8d877c : 0x9a958c;
    },
    cut: 0x5b5753,
    edges: '',
  });
  // the cut faces where the board ends them, bed above bed, each bed clipped to the ground above it
  const beds = [0x5b5753, 0x6e6962, 0x524f52, 0x7b756b, 0x625e5a], F = FROST;
  const X = (i: number): number => F.x0 + ((F.x1 - F.x0) * i) / F.nx, Z = (j: number): number => F.z0 + ((F.z1 - F.z0) * j) / F.nz;
  const Y = (i: number, j: number): number => F.y[j * (F.nx + 1) + i];
  const bedTop = (n: number, c: number): number => (n + 1) * 3.3 + 0.8 * Math.sin(c * 0.11 + n * 1.9);
  const cut = (p: [number, number, number], q: [number, number, number], along: (v: [number, number, number]) => number, n: V3): void => {
    for (let bed = 0; bed * 3.3 - 0.8 < Math.max(p[1], q[1]); bed++) {
      const lo = (v: [number, number, number]): number => Math.min(v[1], bed === 0 ? 0 : bedTop(bed - 1, along(v)));
      const hi = (v: [number, number, number]): number => Math.min(v[1], bedTop(bed, along(v)));
      const a0 = lo(p), a1 = hi(p), c0 = lo(q), c1 = hi(q);
      if (a1 - a0 < 0.01 && c1 - c0 < 0.01) continue;
      const color = beds[bed % beds.length];
      face3(k.b, [p[0], a0, p[2]], [q[0], c0, q[2]], [q[0], c1, q[2]], n, color);
      face3(k.b, [p[0], a0, p[2]], [q[0], c1, q[2]], [p[0], a1, p[2]], n, color);
    }
  };
  for (let i = 0; i < F.nx; i++) cut([X(i), Y(i, 0), F.z0], [X(i + 1), Y(i + 1, 0), F.z0], (v) => v[0], [0, 0, -1]);
  for (let j = 0; j < F.nz; j++) cut([F.x0, Y(0, j), Z(j)], [F.x0, Y(0, j + 1), Z(j + 1)], (v) => v[2], [-1, 0, 0]);
};

// ---------------------------------------------------------------------------
// Beyond the Wall: the grove round the ring, and the haunted forest
// ---------------------------------------------------------------------------

/** The eight small weirwoods round the clearing: at an angle round the ring's middle, and how far out. */
function grove(): P2[] {
  const [cx, cz] = TURNS.wall.c;
  return ([[-32, 8.4], [-2, 8.4], [30, 8.4], [212, 8.4], [182, 8.4], [150, 8.4], [-18, 10.6], [198, 10.6]] as [number, number][]).map(([deg, d]): P2 => {
    const a = (deg * Math.PI) / 180;
    return [cx + Math.cos(a) * d, cz + Math.sin(a) * d];
  });
}

function beyond(k: Build): void {
  const [cx, cz] = TURNS.wall.c, ring = TURNS.wall.r + (4 + 1.2) / 2, small = grove();
  weirwood(k, cx, cz, 0, 0.8);
  for (const [x, z] of small) weirwood(k, x, z, 0, 0.45);
  const r = rng(7517);
  for (let x = F2.x0; x < W.x1 - 1; x += 2.3) {
    for (let z = -100.8; z > -112.4; z -= 2.2) {
      const tx = x + (r() - 0.5) * 1.8, tz = z + (r() - 0.5) * 1.6, size = 0.8 + r() * 0.55, gap = r();
      if (tz > -100.5 || tz < -112.1 || tx > W.x1 - 1) continue;
      const y = heightOn(FROST, tx, tz);
      if (y > 0.8) continue;
      if (Math.abs(tx - W.gateX) < 4 + 3 && tz > cz) continue; // the road from the ring to the gate
      if (Math.hypot(tx - cx, tz - cz) < ring + 3) continue;
      if (small.some(([gx, gz]) => Math.hypot(tx - gx, tz - gz) < 2.4)) continue;
      if (gap < 0.1) continue;
      k.tree(tx, tz, size, true, y);
    }
  }
}

// ---------------------------------------------------------------------------
// What this file hands over
// ---------------------------------------------------------------------------

export const MODELS: Record<string, Model> = {
  'frostfangs-1': frostfangs,
  wall: theWall,
  'cb-lance': lance,
  'cb-commander': commander,
  'cb-hardin': hardin,
  'cb-shieldhall': shieldhall,
  'cb-king': kingsTower,
  'cb-hall': commonHall,
  'cb-armoury': armoury,
  'cb-rookery': rookery,
};
/** The second lot of the Frostfangs is drawn with the first, as one range. */
export const COVERS: string[] = ['frostfangs-2'];
export const SIGNS: SignDef[] = [nameSign('wall-the-wall', 'The Wall'), nameSign('wall-castle-black', 'Castle Black')];
export const FLOORED: string[] = [];

export function heightAt(x: number, z: number): number {
  return heightOn(FROST, x, z);
}

export function extras(k: Build): void {
  yard(k);
  walks(k);
  yardLife(k);
  chimneys(k);
  // the castle's name, before its south-east side, where the opening view reads it
  nameBoard(k, 'wall-castle-black', 41.6, -77.4, 0, undefined, 1.1);
  beyond(k);
}
