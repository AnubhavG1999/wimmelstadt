// The houses of King's Landing in 129 AC, Visenya's Hill and its sept, the
// squares under the heads of Balerion and Vhagar, and the Street of the
// Sisters dressed for the Golden Wedding of 49 AC.
//
// The city is dense. Its houses stand close together in rows, each its own,
// back to back with alleys between, of timber and plaster on a ground storey of
// daub, plaster or rubble stone, their upper storeys jutting out over the lanes
// until they nearly meet, as the books have them, under steep gabled roofs of
// red tile, slate, thatch and shingle, with chimneys, and here and there a shop
// whose board says what is sold there. How many storeys a house has is set by
// its lot's top: two under a top of 8, one and a jutting knee wall or one and a
// high roof where the top is lower, so that the plan's heights are kept.
//
// On Visenya's Hill the houses step up the slopes in two rings, each with its
// back dug into the hill and its front to the lane below it, and on the crown,
// inside a low parapet, stands one plain sept of seven sides, of pale stone
// under a low dome of lead, its doors to the south at the head of a stair. It
// is no Great Sept: that was begun under Baelor, thirty years after this
// tile's year. Nothing of a fire stands near it.
//
// Everything takes its place from plan.ts. From the books' plain words only:
// nobody is portrayed, no arms are flown but the two the research note
// checked, and no board names anyone.

import * as THREE from 'three';
import { Smoke } from '../../engine/effects';
import { interior, rng, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { area, oval, rect } from '../../engine/ground';
import { figure, roundel, wheel, type Dress } from '../../engine/parts';
import { face3, prism, slab, type XZ } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import { field, heightOn } from '../../engine/terrain';
import type { Build } from '../../engine/tile';
import { landAt } from './land';
import { DAUB, DOOR, HOUSE_WIN, IRONWORK, PLASTER, ROOF, TIMBER, TIMBER_DARK, TO_VIEW, banner, nameBoard, nameSign } from './look';
import type { Model } from './models';
import { LANE, LOTS, ROADS, VISENYA, lotOf, type Lot } from './plan';
import { CLIMB } from './roads';
import { KEPT, toRoad } from './space';

// ---------------------------------------------------------------------------
// The ground, the colours and the signs
// ---------------------------------------------------------------------------

type Dir = [number, number];
interface Box { x0: number; z0: number; x1: number; z1: number }

const V = VISENYA, [VX, VZ] = V.c;
/** A storey of a house, as the shared look has it. */
const ST = HOUSE_WIN.storey;
/** How high anything of this file may stand where no lot of its own is. */
const OUTSIDE_TOP = 8;
/** The way the view the tile opens with looks back from, as an angle on the ground (0 east, a quarter turn south). */
const VIEW = Math.atan2(TO_VIEW[2], TO_VIEW[0]);

/** Visenya's Hill as land.ts draws it, on the same grid, so that what stands on its slopes neither floats nor sinks. */
const HILL = field(VX - V.foot, VZ - V.foot, VX + V.foot, VZ + V.foot, 2, (x, z) => {
  const d = Math.hypot(x - VX, z - VZ);
  if (d <= V.crown) return V.y;
  if (d >= V.foot) return 0;
  const t = (V.foot - d) / (V.foot - V.crown);
  return V.y * t * t * (3 - 2 * t);
});
/** How high the ground is at a place, as it is built. */
const ground = (x: number, z: number): number => Math.max(landAt(x, z), heightOn(HILL, x, z));

/** Ground storeys: rubble stone, daub, plaster, and washes of ochre, rose and grey-green. */
const LOW = [0xb4a790, 0xa99b84, DAUB, PLASTER, 0xd8c396, 0xdec5ae, 0xc9ccb8, 0xc3b497];
/** Upper storeys: plaster between the timbers, in a few washes. */
const HIGH = [PLASTER, 0xede5d3, 0xe7d7b5, 0xdfe0d2, 0xebd4c2, 0xe3d5b9, 0xd8c8a5];
/** Roofs: red tile above all, then slate, thatch and shingle. */
const ROOFS = [ROOF.tile, ROOF.tile, ROOF.tileDark, 0xb5693f, 0x9b4b35, ROOF.tile, ROOF.slate, 0x5e6b78, ROOF.thatch, ROOF.shingle];
const CHIMNEY = 0x8e7e6b, SOOT = 0x3b3633, FOOTING = 0x9d917d;
/** The setts of the squares, and the pale flags round their edges and their wells. */
const SETTS = 0xb0a188, FLAGS = 0xcdc2a9;
/** The sept: its pale stone, the stone's shade, its dome of lead, its glass. */
const SEPT_STONE = 0xe5dfcf, SEPT_SHADE = 0xc9c0ac, LEAD = 0x7f8a94, GILT = 0xd9b24a, CRYSTAL = 0xdfe8ec, SEPT_GLASS = 0x34465a;
const SKIN = 0xe8c4a0;
const SEPTON: Dress = { coat: 0xf1ede3, legs: 0xe6e1d5, hat: SKIN, hatH: 0.05 };
const SEPTA: Dress = { coat: 0x8e8a84, legs: 0x85817b, hat: 0xf2efe8, hatH: 0.28, hatR: 0.33 };
/** The colours of the Golden Wedding: the Targaryens' red and black, the Velaryons' sea green and silver, and gold. */
const RED = 0xb3141c, BLACK = 0x1d1d20, GOLD = 0xd9b24a, SEA = 0x2e8b74, SILVER = 0xd9dde2;

/** What a shop sells, and how its board is painted. */
type Trade = 'inn' | 'bread' | 'smith' | 'fish' | 'candles';
const TRADE: Record<Trade, { text: string; color: string; ink: string; cloth: number }> = {
  inn: { text: 'Inn', color: '#2f4a33', ink: '#efe2bf', cloth: 0x6f8a4a },
  bread: { text: 'Bread', color: '#e6c991', ink: '#4a2c14', cloth: 0xc9883a },
  smith: { text: 'Smith', color: '#3b3d40', ink: '#ebe5d6', cloth: 0x5e6670 },
  fish: { text: 'Fish', color: '#3d5f72', ink: '#f2ede0', cloth: 0x4f7f9a },
  candles: { text: 'Candles', color: '#7a2e2a', ink: '#f3e6c4', cloth: 0xb84a3a },
};
const signOf = (t: Trade): string => `houses-${t}`;
const tradeSign = (t: Trade): SignDef => ({ ...nameSign(signOf(t), TRADE[t].text), color: TRADE[t].color, ink: TRADE[t].ink });
const HILL_SIGN = 'houses-visenyas-hill';
/** Visenya's Hill's name on two lines, so that its board is narrow enough to stand among the houses on the slope. */
function hillSign(): SignDef {
  const name = lotOf('visenya').name.toUpperCase(), cut = name.lastIndexOf(' ');
  const lines = cut > 0 ? [name.slice(0, cut), name.slice(cut + 1)] : [name];
  const aspect = Math.max(2.4, (Math.max(...lines.map((s) => s.length)) * 0.62) / lines.length);
  return { id: HILL_SIGN, lines, color: '#e9dcc0', ink: '#2b2118', aspect, kind: 'board', size: [Math.round(aspect * 104), 104] };
}

export const SIGNS: SignDef[] = [...(Object.keys(TRADE) as Trade[]).map(tradeSign), hillSign()];
const aspectOf = (id: string): number => SIGNS.find((s) => s.id === id)?.aspect ?? 3;

const pick = <T>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length) % list.length];
/** How large a tree may be planted so that it stands no higher than `room` over its ground, at most `most`: the engine's crown reaches 6.93 times its size, and up to a fifth more. */
const treeFor = (room: number, most: number): number => Math.max(0.3, Math.min(most, (room - 0.1) / (6.93 * 1.2)));
const inBox = (b: Box, x: number, z: number, m = 0): boolean => x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m;

/** What the models leave for `extras`: chimneys that may smoke, and the house fronts along the Street of the Sisters. */
const CHIMNEYS: V3[] = [];
const STREET: { x: number; z0: number; z1: number; top: number; f: number }[] = [];

// ---------------------------------------------------------------------------
// A house
// ---------------------------------------------------------------------------

/** A house to be built: where its middle is, which way its front looks, how wide its front is and how deep it is, and how high it may stand. */
interface Spec {
  x: number; z: number; f: Dir; w: number; d: number; cap: number;
  /** One of the north blocks', which the view hardly sees: built plainer and cheaper. */
  plain?: boolean;
  /** What it sells, if it is a shop. */
  trade?: Trade;
  /** Whether its upper part may jut out over its front. It may, unless this says no. */
  jetty?: boolean;
  /** Whether its gable or its eaves look to the front. Chosen, if not given. */
  ridge?: 'gable' | 'eaves';
  /** Whether its sides are seen, as at the end of a row. */
  end?: boolean;
}

/** What a house turns out to be: its floor, its storeys over the ground storey, a knee wall, how far its upper part juts, and its roof. */
interface Form { y0: number; ups: number[]; knee: number; j: number; gable: boolean; rise: number }

/** A place given in a house's own frame (`u` across its front, `v` from its middle towards its front) on the ground. */
const at = (h: Spec, u: number, v: number): [number, number] => [h.x + u * h.f[1] + v * h.f[0], h.z - u * h.f[0] + v * h.f[1]];

/**
 * How a house fits under its top: three storeys, two, two with a lower upper
 * storey, one under a jutting knee wall, or one, each under a steep roof. Mostly
 * the tallest that fits, now and then the next one down, so that no two
 * neighbours stand alike. Null if none fits.
 */
function formOf(h: Spec, r: () => number): Form | null {
  const y0 = Math.min(...[-1, 0, 1].map((s) => ground(...at(h, s * (h.w / 2 - 0.05), h.d / 2 - 0.05))));
  const gable = h.ridge ? h.ridge === 'gable' : r() < (h.w <= h.d + 0.3 ? 0.66 : 0.3);
  const j = h.jetty === false ? 0 : 0.3 + r() * 0.18;
  const room = h.cap - y0 - r() * (h.plain ? 0.35 : 0.6);
  const riseFor = (walls: number, jj: number): number => {
    const half = (gable ? h.w : h.d + jj) / 2, rise = Math.min(room - walls, 1.45 * half);
    return rise >= Math.max(1.0, 0.76 * half) ? rise : -1;
  };
  const levels: [number[], number, number][][] = [
    [[[ST, ST], 0, j], [[ST, ST - 0.4], 0, j]],
    [[[ST], 0, j], [[ST - 0.3], 0, j], [[ST - 0.6], 0, j]],
    [[[], 1.0, j], [[], 0.75, j], [[], 0.5, j]],
    [[[], 0, 0]],
  ];
  const fits: Form[] = [];
  for (const level of levels) {
    for (const [ups, knee, jj] of level) {
      const rise = riseFor(ST + ups.reduce((s, u) => s + u, 0) + knee, jj);
      if (rise > 0) {
        fits.push({ y0, ups, knee, j: jj, gable, rise });
        break;
      }
    }
  }
  if (!fits.length) return null;
  return fits[fits.length > 1 && r() < 0.27 ? 1 : 0];
}

/**
 * A pitched roof that sits on the tops of the walls of a rectangle, its ridge
 * `rise` over them, running along z if `alongZ` and along x if not. Its eaves
 * reach `eave` out past the walls and drop as the slope does, so that it sits
 * on the walls with no gap; its ends reach out `e0` past x0 or z0 and `e1` past
 * the other end. A wall of colour `wall` closes each gable.
 */
function pitched(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, rise: number, color: number, wall: number, alongZ: boolean, eave: number, e0: number, e1: number): void {
  if (alongZ) {
    const xc = (x0 + x1) / 2, half = (x1 - x0) / 2, drop = (eave * rise) / half, len = Math.hypot(half, rise), a = z0 - e0, c = z1 + e1;
    b.quad([x0 - eave, y - drop, c], [x0 - eave, y - drop, a], [xc, y + rise, a], [xc, y + rise, c], [-rise / len, half / len, 0], color);
    b.quad([x1 + eave, y - drop, a], [x1 + eave, y - drop, c], [xc, y + rise, c], [xc, y + rise, a], [rise / len, half / len, 0], color);
    face3(b, [x0, y, z0], [x1, y, z0], [xc, y + rise, z0], [0, 0, -1], wall);
    face3(b, [x0, y, z1], [x1, y, z1], [xc, y + rise, z1], [0, 0, 1], wall);
  } else {
    const zc = (z0 + z1) / 2, half = (z1 - z0) / 2, drop = (eave * rise) / half, len = Math.hypot(half, rise), a = x0 - e0, c = x1 + e1;
    b.quad([a, y - drop, z0 - eave], [c, y - drop, z0 - eave], [c, y + rise, zc], [a, y + rise, zc], [0, half / len, -rise / len], color);
    b.quad([c, y - drop, z1 + eave], [a, y - drop, z1 + eave], [a, y + rise, zc], [c, y + rise, zc], [0, half / len, rise / len], color);
    face3(b, [x0, y, z0], [x0, y, z1], [x0, y + rise, zc], [-1, 0, 0], wall);
    face3(b, [x1, y, z0], [x1, y, z1], [x1, y + rise, zc], [1, 0, 0], wall);
  }
}

/**
 * A small dormer in the front slope of a roof whose ridge runs along x, in a
 * house's own frame: the roof sits on walls from z0 to z1 whose tops are at
 * `y`, and rises `rise` to its ridge. The dormer's front wall stands a little
 * back from the eaves, with a window lit at night, under a little gable roof
 * that runs back into the slope; its sides are triangles down to the slope.
 */
function dormer(b: GeoBuilder, x: number, z0: number, z1: number, y: number, rise: number, roofC: number, wall: number): void {
  const half = (z1 - z0) / 2, zc = (z0 + z1) / 2, dw = 0.48;
  const at = (yy: number): number => zc + half * (1 - (yy - y) / rise);   // where the main roof is this high
  const zf = z1 - 0.38, ys = y + (rise * (z1 - zf)) / half, yf = ys + 0.62, yr = yf + 0.26;
  if (yr > y + rise - 0.12) return;
  const zs = at(yf), zb = at(yr + 0.04);
  b.quad([x - dw, ys - 0.06, zf], [x + dw, ys - 0.06, zf], [x + dw, yf, zf], [x - dw, yf, zf], [0, 0, 1], wall);
  b.quad([x - 0.27, ys + 0.08, zf + 0.02], [x + 0.27, ys + 0.08, zf + 0.02], [x + 0.27, yf - 0.1, zf + 0.02], [x - 0.27, yf - 0.1, zf + 0.02], [0, 0, 1], 0x3a3029, { win: interior(1.1) });
  for (const s of [-1, 1]) face3(b, [x + s * dw, ys - 0.06, zf], [x + s * dw, yf, zf], [x + s * dw, yf, zs], [s, 0, 0], wall);
  face3(b, [x - dw, yf, zf], [x + dw, yf, zf], [x, yr, zf], [0, 0, 1], wall);
  const e = dw + 0.1, len = Math.hypot(e, yr - yf + 0.04);
  for (const s of [-1, 1]) b.quad([x + s * e, yf - 0.04, zf + 0.1], [x + s * e, yf - 0.04, zb], [x, yr, zb], [x, yr, zf + 0.1], [(s * (yr - yf + 0.04)) / len, e / len, 0], roofC);
}

/** A strip of timber on a wall that looks along +z, a hair proud of it at `z`. */
function strip(b: GeoBuilder, x0: number, y0: number, x1: number, y1: number, z: number, color = TIMBER): void {
  b.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [0, 0, 1], color);
}
/** The same on a wall that looks along +x (s = 1) or -x (s = -1), at `x`, from z0 to z1. */
function stripX(b: GeoBuilder, x: number, s: number, z0: number, y0: number, z1: number, y1: number, color = TIMBER): void {
  b.quad([x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], [s, 0, 0], color);
}
/** A timber brace from one corner of a side wall to the other, a parallelogram 0.13 thick. */
function brace(b: GeoBuilder, x: number, s: number, za: number, ya: number, zc: number, yc: number): void {
  const t = 0.07;
  b.quad([x, ya, za - t], [x, ya, za + t], [x, yc, zc + t], [x, yc, zc - t], [s, 0, 0], TIMBER);
}

/**
 * An upper storey `u` high on the beam at `y`, in a frame where the house's
 * front looks along +z: plaster, its windows counted from its own floor, and on
 * its front a post at every bay, a rail under its windows and one over them.
 */
function upperStorey(b: GeoBuilder, h: Spec, W: number, D: number, F: number, y: number, u: number, color: number, seed: number): void {
  const win: WinSpec = { ...HOUSE_WIN, storey: u }, y0 = h.plain ? y : y + 0.03;
  const sides = !h.plain && h.end;
  b.moved(0, y0, 0, 0, () => {
    b.box(-W, 0, -D, W, y + u - y0, F, color, { win, seed: seed + y, faces: sides ? 'NS' : 'NESW' });
    if (sides) b.box(-W, 0, -D, W, y + u - y0, F, color, { faces: 'EW' });
  });
  if (h.plain) return;
  const n = Math.max(1, Math.round((2 * W) / win.cell)), fz = F + 0.02;
  strip(b, -W, y0 + 0.12 * u, W, y0 + 0.19 * u, fz);
  strip(b, -W, y0 + 0.82 * u, W, y0 + 0.88 * u, fz);
  for (let i = 0; i <= n; i++) {
    const x = -W + (2 * W * i) / n;
    strip(b, Math.max(-W, x - 0.07), y0, Math.min(W, x + 0.07), y + u, fz + 0.01);
  }
  if (sides) {
    for (const s of [-1, 1]) {
      const x = s * (W + 0.02);
      stripX(b, x, s, -D, y0, -D + 0.14, y + u);
      stripX(b, x, s, F - 0.14, y0, F, y + u);
      stripX(b, x + s * 0.005, s, -D, y + u - 0.16, F, y + u, TIMBER_DARK);
      brace(b, x + s * 0.01, s, -D + 0.25, y0 + 0.1, (F - D) / 2, y + u - 0.2);
      brace(b, x + s * 0.014, s, F - 0.25, y0 + 0.1, (F - D) / 2, y + u - 0.2);
    }
  }
}

/** A knee wall `kh` high on the beam at `y`: the jutting foot of the roof, with short posts on its front. */
function kneeWall(b: GeoBuilder, h: Spec, W: number, D: number, F: number, y: number, kh: number, color: number): void {
  const y0 = h.plain ? y : y + 0.03;
  b.box(-W, y0, -D, W, y + kh, F, color, { faces: 'NESW' });
  if (h.plain) return;
  const n = Math.max(2, Math.round((2 * W) / 1.1)), fz = F + 0.02;
  for (let i = 0; i <= n; i++) {
    const x = -W + (2 * W * i) / n;
    strip(b, Math.max(-W, x - 0.07), y0, Math.min(W, x + 0.07), y + kh, fz);
  }
}

/** A shop's front: its shutter let down as a counter with its wares on it, the room behind lit at night, an awning, and the board over it. */
function shopfront(k: Build, h: Spec, s: Form, W: number, D: number, r: () => number): void {
  const b = k.b, t = h.trade!, ow = Math.min(W - 0.3, 1.3);
  b.quad([-ow, 0.25, D + 0.03], [ow, 0.25, D + 0.03], [ow, 2.05, D + 0.03], [-ow, 2.05, D + 0.03], [0, 0, 1], 0x2e231b, { win: interior(1.5) });
  if (t === 'smith') {
    // the forge's glow at the back of the open front, and the anvil on its block outside
    b.quad([-0.5, 0.4, D + 0.05], [0.5, 0.4, D + 0.05], [0.5, 1.0, D + 0.05], [-0.5, 1.0, D + 0.05], [0, 0, 1], 0x8a3a12, { win: interior(2.4) });
    b.box(ow - 0.75, -0.05, D + 0.5, ow - 0.25, 0.55, D + 0.95, 0x5a4532);
    b.box(ow - 0.85, 0.55, D + 0.58, ow - 0.15, 0.82, D + 0.87, 0x55595e, { top: 0x6a6f75 });
    b.box(ow - 0.15, 0.62, D + 0.66, ow + 0.1, 0.78, D + 0.79, 0x55595e);
  } else {
    b.box(-ow - 0.05, -0.05, D, ow + 0.05, 0.86, D + 0.42, TIMBER, { top: 0x8d6d4a, faces: 'ESWT' });
    wares(b, t, -ow + 0.25, ow - 0.25, D + 0.21, 0.86, r);
  }
  slab(b, [0, 2.3, D + 0.02], [0, 1.95, D + 0.95], ow + 0.18, 0.05, TRADE[t].cloth, { under: 0xe6dac0 });
  // the board, on a dark backing, over the awning
  const bw = Math.min(0.42 * aspectOf(signOf(t)), 2 * W - 0.5) / 2;
  b.box(-bw - 0.06, 2.37, D, bw + 0.06, 2.87, D + 0.05, TIMBER_DARK);
  const [sx, sz] = at(h, 0, D + 0.08);
  k.sign(signOf(t), sx, s.y0 + 2.62, sz, h.f[0], h.f[1], 0.42, 2 * W - 0.5);
}

/** What a shop has on its counter, along x from x0 to x1 at `z`, on top of `y`. */
function wares(b: GeoBuilder, t: Trade, x0: number, x1: number, z: number, y: number, r: () => number): void {
  const n = t === 'candles' ? 6 : 4;
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / n;
    if (t === 'bread') b.box(x - 0.16, y, z - 0.11, x + 0.16, y + 0.16, z + 0.11, 0xc68a48, { top: 0xb5763a });
    else if (t === 'fish') b.box(x - 0.2, y, z - 0.07 + (r() - 0.5) * 0.1, x + 0.2, y + 0.07, z + 0.07, 0x9fb3bd, { top: 0xb7c7cf });
    else b.box(x - 0.04, y, z - 0.04, x + 0.04, y + 0.26 + r() * 0.12, z + 0.04, 0xf2ead0);
  }
}

/**
 * An inn's front: a wide door, warm inside, a bench and barrels beside it, and
 * its board hung out on a bracket from the front of its upper part, over the
 * heads of whoever stands at its door, so that it is read along the street.
 */
function innFront(k: Build, h: Spec, s: Form, W: number, D: number, F: number): void {
  const b = k.b;
  b.quad([-0.62, 0, D + 0.03], [0.62, 0, D + 0.03], [0.62, 2.0, D + 0.03], [-0.62, 2.0, D + 0.03], [0, 0, 1], 0x3a2a1c, { win: interior(1.6) });
  for (const x of [-0.62, 0.62]) strip(b, x - 0.07, 0, x + 0.07, 2.08, D + 0.05, TIMBER_DARK);
  strip(b, -0.69, 2.0, 0.69, 2.12, D + 0.06, TIMBER_DARK);
  // a bench and two barrels
  b.box(-W + 0.25, 0, D + 0.12, -0.9, 0.48, D + 0.5, TIMBER, { top: 0x7a5d40 });
  for (const x of [0.95, 1.5]) if (x < W - 0.3) b.cyl(x, D + 0.38, 0, 0.78, 0.3, 0.3, 6, 0x7a5a3a, { cap: 0x5a4128 });
  // the bracket, and the board hung from it, read from both ways along the street
  const bx = W - 0.35, upper = F > D + 0.01, by = upper ? ST + 0.3 : 2.75, bz = upper ? F : D;
  const bh = 0.5, bw = bh * aspectOf(signOf('inn')), top = by - 0.08, z1 = bz + 1.3;
  b.beam([bx, by, bz], [bx, by, z1 + 0.08], 0.05, 0.05, TIMBER_DARK);
  b.beam([bx, by, bz + 0.55], [bx, by - 0.5, bz], 0.035, 0.035, TIMBER_DARK);
  b.box(bx - 0.02, top - bh - 0.12, z1 - bw - 0.08, bx + 0.02, top, z1 + 0.02, TIMBER_DARK, { faces: 'NESWTB' });
  const along: Dir = [h.f[1], -h.f[0]];
  for (const sgn of [1, -1]) {
    const [sx, sz] = at(h, bx + sgn * 0.035, z1 - bw / 2 - 0.03);
    k.sign(signOf('inn'), sx, s.y0 + top - 0.06 - bh / 2, sz, along[0] * sgn, along[1] * sgn, bh);
  }
  // lanterns either side of the door
  for (const u of [-0.95, 0.95]) {
    const [lx, lz] = at(h, u, D + 0.18);
    k.glows.push({ x: lx, y: s.y0 + 2.15, z: lz, sx: 0.24, sy: 0.32, sz: 0.24, color: '#ffd38a' });
  }
}

/** Builds a house as its form says. */
function buildHouse(k: Build, h: Spec, s: Form, r: () => number): void {
  const b = k.b, W = h.w / 2, D = h.d / 2, yaw = Math.atan2(-h.f[0], h.f[1]);
  const upper = s.ups.length > 0 || s.knee > 0, F = upper ? D + s.j : D;
  const low = pick(r, upper ? LOW : [...LOW, ...HIGH]), high = pick(r, HIGH), roofC = pick(r, ROOFS);
  const seed = h.x * 0.37 + h.z * 0.11;
  // a footing of stone where the ground falls away under it
  const lo = Math.min(...[[-W, -D], [W, -D], [-W, D], [W, D]].map(([u, v]) => ground(...at(h, u, v))));
  let y = ST;
  b.moved(h.x, s.y0, h.z, yaw, () => {
    if (lo < s.y0 - 0.3) b.box(-W - 0.06, lo - s.y0 - 0.3, -D - 0.06, W + 0.06, 0.1, D + 0.06, FOOTING, { faces: 'NESWT' });
    b.box(-W, -0.45, -D, W, ST, D, low, { win: HOUSE_WIN, seed, faces: 'NESW' });
    if (upper) {
      // the beam it juts out on, with its underside; a plain house has only the underside
      if (h.plain) {
        if (s.j > 0) b.quad([-W, ST, D], [W, ST, D], [W, ST, F], [-W, ST, F], [0, -1, 0], TIMBER_DARK);
      } else {
        b.box(-W - 0.04, ST - 0.18, -D - 0.04, W + 0.04, ST + 0.03, F + 0.04, TIMBER, { faces: 'NESWB' });
      }
      for (const u of s.ups) {
        upperStorey(b, h, W, D, F, y, u, high, seed);
        y += u;
      }
      if (s.knee > 0) {
        kneeWall(b, h, W, D, F, y, s.knee, high);
        y += s.knee;
      }
    }
    const wall = upper ? high : low;
    if (s.gable) pitched(b, -W, -D, W, F, y, s.rise, roofC, wall, true, 0.22, 0.04, 0.16);
    else pitched(b, -W, -D, W, F, y, s.rise, roofC, wall, false, 0.24, 0.05, 0.05);
    // a little window in a gable that looks to the front, under a tie beam
    if (s.gable && !h.plain && s.rise > 1.25) {
      const gy = y + 0.2 * s.rise, gz = F + 0.025;
      b.quad([-0.27, gy, gz], [0.27, gy, gz], [0.27, gy + 0.58, gz], [-0.27, gy + 0.58, gz], [0, 0, 1], 0x3a3029, { win: interior(1.1) });
      strip(b, -W, y, W, y + 0.13, gz);
    }
    // a dormer in a roof whose eaves look to the front
    if (!s.gable && !h.plain && h.w >= 2.9 && r() < 0.55) dormer(b, (r() - 0.5) * (2 * W - 1.6), -D, F, y, s.rise, roofC, wall);
    // a chimney on the ridge, a little over it and never over the top
    if (r() < (h.plain ? 0.3 : 0.5)) {
      const ridge = y + s.rise, top = Math.min(ridge + 0.6, h.cap - s.y0 - 0.02);
      if (top > ridge + 0.22) {
        const cx = s.gable ? 0 : (r() < 0.5 ? -1 : 1) * (W - 0.55), cz = s.gable ? -D + 0.5 : (F - D) / 2;
        b.box(cx - 0.24, ridge - 1.0, cz - 0.24, cx + 0.24, top, cz + 0.24, CHIMNEY, { top: SOOT });
        if (!h.plain) {
          const [wx, wz] = at(h, cx, cz);
          CHIMNEYS.push([wx, s.y0 + top + 0.15, wz]);
        }
      }
    }
    // the front: a shop, an inn, or a door, and a lantern by some doors
    if (h.trade === 'inn') innFront(k, h, s, W, D, F);
    else if (h.trade) shopfront(k, h, s, W, D, r);
    else {
      const n = Math.max(1, Math.round((2 * W) / HOUSE_WIN.cell)), dc = Math.floor(r() * n), cell = (i: number): number => -W + (2 * W * (i + 0.5)) / n, du = cell(dc);
      b.quad([du - 0.42, 0, D + 0.03], [du + 0.42, 0, D + 0.03], [du + 0.42, 1.9, D + 0.03], [du - 0.42, 1.9, D + 0.03], [0, 0, 1], DOOR);
      if (!h.plain && r() < 0.35) {
        const side = du + (du < 0 ? 0.68 : -0.68), [lx, lz] = at(h, side, D + 0.2);
        k.glows.push({ x: lx, y: s.y0 + 2.1, z: lz, sx: 0.2, sy: 0.28, sz: 0.2, color: '#ffd38a' });
      }
      // a box of flowers under a window of the front: of the upper storey if there is one, else beside the door
      if (!h.plain && r() < 0.4) {
        const up = s.ups.length > 0, u = up ? cell(Math.floor(r() * n)) : n > 1 ? cell((dc + 1 + Math.floor(r() * (n - 1))) % n) : NaN;
        const sill = up ? ST + 0.03 + 0.22 * s.ups[0] : 0.22 * ST, fz = up ? F : D;
        if (!Number.isNaN(u)) b.box(u - 0.36, sill - 0.2, fz, u + 0.36, sill - 0.04, fz + 0.2, TIMBER, { top: pick(r, [0xd94f6a, 0xe8a23d, 0xc84a3a, 0xb36ad0, 0x6fae58]) });
      }
    }
  });
}

/** Builds each house that fits, and hands back those that were built, with their forms. */
function houses(k: Build, specs: Spec[], r: () => number): [Spec, Form][] {
  const built: [Spec, Form][] = [];
  for (const h of specs) {
    const s = formOf(h, r);
    if (!s) continue;
    buildHouse(k, h, s, r);
    built.push([h, s]);
  }
  return built;
}

// ---------------------------------------------------------------------------
// Rows of houses, and the blocks they make
// ---------------------------------------------------------------------------

const FACE: Record<'N' | 'E' | 'S' | 'W', Dir> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

interface RowOpts {
  /** Along which axis the row runs, and from where to where. */
  axis: 'x' | 'z'; a0: number; a1: number;
  /** Where the houses' backs are, across the row, how deep they are, and which way they look. */
  back: number; depth: number; face: 'N' | 'E' | 'S' | 'W';
  cap: number; plain?: boolean;
  /** How wide a house may be along the row. */
  width?: [number, number];
  /** How often a gap is left for an alley, and stretches along the row that must stay open. */
  alley?: number; gaps?: [number, number][];
  /** How far a house may stand back from the line of the others. */
  setback?: number;
}

/** A row of houses side by side, each its own, a hair apart, with now and then an alley between two. */
function row(out: Spec[], r: () => number, o: RowOpts): void {
  const [wMin, wMax] = o.width ?? [2.9, 4.0], f = FACE[o.face], sgn = o.face === 'S' || o.face === 'E' ? 1 : -1;
  const gaps = [...(o.gaps ?? [])].sort((p, q) => p[0] - q[0]);
  let a = o.a0, first = true;
  while (a < o.a1 - wMin * 0.85) {
    const gap = gaps.find(([g0, g1]) => a < g1 && a + wMin > g0);
    if (gap) {
      a = gap[1];
      first = true;
      continue;
    }
    const stop = Math.min(o.a1, ...gaps.filter(([g0]) => g0 >= a).map(([g0]) => g0));
    let w = wMin + r() * (wMax - wMin);
    if (stop - a - w < wMin) w = stop - a;
    if (w > wMax + 0.9) w = (stop - a) / 2 - 0.08;
    if (w < wMin * 0.85) {
      a = stop + 0.01;
      continue;
    }
    const d = o.depth - r() * (o.setback ?? 0.28), mid = a + w / 2, across = o.back + (sgn * d) / 2;
    const end = a + w >= stop - 0.02;
    out.push({ x: o.axis === 'x' ? mid : across, z: o.axis === 'x' ? across : mid, f, w, d, cap: o.cap, plain: o.plain, end: first || end });
    first = false;
    a += w + 0.12 + r() * 0.06;
    if (r() < (o.alley ?? 0.07) && a < stop - wMin - 1.3) {
      a += 1.3;
      first = true;
    }
  }
}

/** The house in a list whose middle is nearest a place. */
const nearest = (specs: Spec[], x: number, z: number): Spec | undefined =>
  specs.reduce<Spec | undefined>((best, s) => (!best || Math.hypot(s.x - x, s.z - z) < Math.hypot(best.x - x, best.z - z) ? s : best), undefined);

/**
 * A north block, behind the Dragonpit: rows back to back in pairs with alleys
 * between them, or, if the block is narrow, two long rows back to back, cut by
 * alleys. Its houses are plain, and a garden of a few trees is left in it.
 */
function northBlock(k: Build, l: Lot, seed: number): void {
  const r = rng(seed), specs: Spec[] = [], lanes: Box[] = [];
  const W = l.x1 - l.x0, Dz = l.z1 - l.z0, top = l.top;
  let garden: Box | null = null;
  if (W >= 10) {
    const alley = 1.7, pairs = Math.max(1, Math.round((Dz + alley) / (7.8 + alley))), depth = (Dz - (pairs - 1) * alley) / (2 * pairs);
    const g = Math.floor(pairs / 2);
    for (let i = 0; i < pairs; i++) {
      const z = l.z0 + i * (2 * depth + alley);
      // in the middle pair, a garden takes the place of the houses at the west end of its south row
      const gx = l.x0 + 1.2 + r() * 1.5;
      if (i === g) garden = { x0: l.x0 + 0.2, z0: z + depth + 0.3, x1: gx + 4.6, z1: z + 2 * depth - 0.2 };
      row(specs, r, { axis: 'x', a0: l.x0 + r() * 0.3, a1: l.x1, back: z + depth, depth, face: 'N', cap: top, plain: true, width: [3.3, 4.7] });
      row(specs, r, { axis: 'x', a0: l.x0 + r() * 0.3, a1: l.x1, back: z + depth + 0.1, depth: depth - 0.1, face: 'S', cap: top, plain: true, width: [3.3, 4.7], gaps: i === g ? [[l.x0 - 1, gx + 4.8]] : [] });
      if (i + 1 < pairs) lanes.push({ x0: l.x0, z0: z + 2 * depth, x1: l.x1, z1: z + 2 * depth + alley });
    }
  } else {
    const mid = (l.x0 + l.x1) / 2, n = Math.max(1, Math.round(Dz / 11)), gaps: [number, number][] = [];
    for (let i = 1; i < n; i++) {
      const z = l.z0 + (Dz * i) / n;
      gaps.push([z - 0.8, z + 0.8]);
      lanes.push({ x0: l.x0, z0: z - 0.8, x1: l.x1, z1: z + 0.8 });
    }
    row(specs, r, { axis: 'z', a0: l.z0 + r() * 0.3, a1: l.z1, back: mid - 0.05, depth: mid - 0.05 - l.x0, face: 'W', cap: top, plain: true, width: [3.0, 4.4], gaps });
    row(specs, r, { axis: 'z', a0: l.z0 + r() * 0.3, a1: l.z1, back: mid + 0.05, depth: l.x1 - mid - 0.05, face: 'E', cap: top, plain: true, width: [3.0, 4.4], gaps });
  }
  houses(k, specs, r);
  if (garden) {
    const gd: Box = garden;
    area(k, rect(gd.x0, gd.z0, gd.x1, gd.z1), 0x7f9f5c, 0.04);
    for (const t of [0.25, 0.7]) k.tree(gd.x0 + (gd.x1 - gd.x0) * t, (gd.z0 + gd.z1) / 2 + (r() - 0.5), treeFor(top, 0.75), false);
  }
  // folk in the alleys, and a light in each
  for (const ln of lanes) {
    const n = Math.round(((ln.x1 - ln.x0) * (ln.z1 - ln.z0)) / 9);
    for (let i = 0; i < n; i++) stand(k, ln.x0 + 0.5 + r() * (ln.x1 - ln.x0 - 1), ln.z0 + 0.4 + r() * (ln.z1 - ln.z0 - 0.8));
    k.lights.push({ x: (ln.x0 + ln.x1) / 2, z: (ln.z0 + ln.z1) / 2, r: 9, color: '#ffcf8a', k: 0.35 });
  }
}

/**
 * A block built round a court: a row on each side, their backs to the court
 * and their fronts to the streets, and an alley into the court through one of
 * them. Hands back the court.
 */
function courtBlock(k: Build, l: Lot, seed: number, depth: number, entrance: 'S' | 'W', trades: Partial<Record<'N' | 'E' | 'S' | 'W', Trade>>): Box {
  const r = rng(seed), top = l.top, D = depth;
  const rows: Record<'N' | 'E' | 'S' | 'W', Spec[]> = { N: [], E: [], S: [], W: [] };
  const midX = (l.x0 + l.x1) / 2, midZ = (l.z0 + l.z1) / 2;
  const gS: [number, number][] = entrance === 'S' ? [[midX - 0.8, midX + 0.8]] : [];
  const gW: [number, number][] = entrance === 'W' ? [[midZ - 0.8, midZ + 0.8]] : [];
  row(rows.N, r, { axis: 'x', a0: l.x0 + 0.05, a1: l.x1 - 0.05, back: l.z0 + D, depth: D, face: 'N', cap: top, alley: 0 });
  row(rows.S, r, { axis: 'x', a0: l.x0 + 0.05, a1: l.x1 - 0.05, back: l.z1 - D, depth: D, face: 'S', cap: top, alley: 0, gaps: gS });
  row(rows.W, r, { axis: 'z', a0: l.z0 + D + 0.15, a1: l.z1 - D - 0.15, back: l.x0 + D, depth: D, face: 'W', cap: top, alley: 0, gaps: gW });
  row(rows.E, r, { axis: 'z', a0: l.z0 + D + 0.15, a1: l.z1 - D - 0.15, back: l.x1 - D, depth: D, face: 'E', cap: top, alley: 0 });
  // a shop in the middle of a row, where one is wanted
  for (const side of ['N', 'E', 'S', 'W'] as const) {
    const t = trades[side], h = t ? nearest(rows[side], midX, midZ) : undefined;
    if (h && t) h.trade = t;
  }
  houses(k, [...rows.N, ...rows.S, ...rows.W, ...rows.E], r);
  return { x0: l.x0 + D + 0.1, z0: l.z0 + D + 0.1, x1: l.x1 - D - 0.1, z1: l.z1 - D - 0.1 };
}

/** A block of two rows back to back along x, the north one looking north and the south one south, and at its east end a house or two looking east. */
function doubleRow(k: Build, l: Lot, seed: number, east: Trade | null): void {
  const r = rng(seed), specs: Spec[] = [], mid = (l.z0 + l.z1) / 2, endW = 4.3, x1 = l.x1 - endW - 0.15;
  row(specs, r, { axis: 'x', a0: l.x0 + 0.05 + r() * 0.2, a1: x1, back: mid - 0.05, depth: mid - 0.05 - l.z0, face: 'N', cap: l.top });
  row(specs, r, { axis: 'x', a0: l.x0 + 0.05 + r() * 0.2, a1: x1, back: mid + 0.05, depth: l.z1 - mid - 0.05, face: 'S', cap: l.top });
  if (east) {
    specs.push({ x: l.x1 - endW / 2, z: mid, f: FACE.E, w: l.z1 - l.z0 - 0.3, d: endW - 0.1, cap: l.top, trade: east, ridge: 'eaves', end: true });
  } else {
    row(specs, r, { axis: 'z', a0: l.z0 + 0.1, a1: l.z1 - 0.1, back: l.x1 - endW, depth: endW - 0.1, face: 'E', cap: l.top, width: [3.0, 4.6], alley: 0 });
  }
  houses(k, specs, r);
  // folk along the lanes before both rows, and a light at each end
  for (let i = 0; i < 10; i++) {
    const x = l.x0 + 1 + r() * (l.x1 - l.x0 - 2);
    stand(k, x, r() < 0.5 ? l.z0 - 1.0 - r() * 0.8 : l.z1 + 1.0 + r() * 0.8);
  }
  k.lights.push({ x: l.x0 + (l.x1 - l.x0) * 0.3, z: l.z1 + 1.5, r: 10, color: '#ffcf8a', k: 0.4 }, { x: l.x0 + (l.x1 - l.x0) * 0.75, z: l.z1 + 1.5, r: 10, color: '#ffcf8a', k: 0.4 });
}

// ---------------------------------------------------------------------------
// Small things
// ---------------------------------------------------------------------------

function barrel(b: GeoBuilder, x: number, z: number, y = 0): void {
  b.cyl(x, z, y, y + 0.78, 0.3, 0.3, 6, 0x7a5a3a, { cap: 0x5a4128 });
}
function crate(b: GeoBuilder, x: number, z: number, s = 0.7, y = 0): void {
  b.box(x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2, 0x9a7a52, { top: 0xa98a60 });
}
function basket(b: GeoBuilder, x: number, z: number, y: number, goods: number): void {
  b.cyl(x, z, y, y + 0.42, 0.3, 0.36, 6, 0x9a7a4a, { cap: goods });
}

/** A child: smaller than the tile's people, in a coat of some colour. */
function child(b: GeoBuilder, x: number, z: number, y: number, coat: number, hair: number): void {
  b.box(x - 0.2, y, z - 0.13, x + 0.2, y + 0.55, z + 0.13, 0x4a4038, { faces: 'NESW' });
  b.box(x - 0.25, y + 0.55, z - 0.16, x + 0.25, y + 1.22, z + 0.16, coat);
  b.box(x - 0.17, y + 1.24, z - 0.17, x + 0.17, y + 1.58, z + 0.17, SKIN, { top: hair });
}
const COATS = [0xd94f4f, 0x3f6fb5, 0xf2c14e, 0x4fa36b, 0xc77dba, 0xf08a4b, 0x7fd0c8];
const HAIR = [0x3a2a1c, 0x6b4a2a, 0xc9a25a, 0x2a2420, 0x8a5a32];

/** A person on the ground, but never on a road. */
function stand(k: Build, x: number, z: number, y = ground(x, z)): void {
  if (toRoad(x, z) < LANE + 0.6) return;
  k.person(x, z, y);
}

/** A well: a round kerb of stone, two posts, a beam with its rope and bucket, and a little roof, none of it 3 high. */
function well(b: GeoBuilder, x: number, z: number, y: number, roofC: number): void {
  b.cyl(x, z, y, y + 0.82, 0.78, 0.78, 10, 0x9d9484, { cap: 0x2a3540 });
  b.cyl(x, z, y + 0.82, y + 0.92, 0.84, 0.84, 10, 0xb3a996, { cap: false });
  for (const s of [-1, 1]) b.box(x + s * 0.72 - 0.07, y + 0.8, z - 0.07, x + s * 0.72 + 0.07, y + 2.1, z + 0.07, TIMBER_DARK);
  b.beam([x - 0.8, y + 1.75, z], [x + 0.8, y + 1.75, z], 0.06, 0.06, TIMBER);
  b.beam([x, y + 1.72, z], [x, y + 1.2, z], 0.02, 0.02, 0xcfc3a0);
  b.cyl(x, z, y + 0.95, y + 1.2, 0.14, 0.17, 6, 0x7a5a3a, { cap: 0x5a4128 });
  slab(b, [x, y + 2.55, z], [x, y + 2.05, z - 0.62], 0.98, 0.05, roofC, { under: TIMBER });
  slab(b, [x, y + 2.55, z], [x, y + 2.05, z + 0.62], 0.98, 0.05, roofC, { under: TIMBER });
}

/** A market stall: a counter with its wares, two posts at its back, and a sloping awning with its underside. Its front looks along `f`. */
function stall(b: GeoBuilder, x: number, z: number, f: Dir, y: number, cloth: number, goods: number): void {
  const yaw = Math.atan2(-f[0], f[1]);
  b.moved(x, y, z, yaw, () => {
    b.box(-0.75, 0, -0.35, 0.75, 0.85, 0.35, TIMBER, { top: 0x8a6a48 });
    for (const gx of [-0.45, 0, 0.45]) b.box(gx - 0.16, 0.85, -0.12, gx + 0.16, 0.97, 0.14, goods);
    for (const s of [-1, 1]) b.beam([s * 0.68, 0, -0.45], [s * 0.68, 2.25, -0.45], 0.06, 0.06, TIMBER_DARK);
    slab(b, [0, 2.25, -0.45], [0, 1.8, 0.75], 0.88, 0.05, cloth, { under: 0xe8dcc0 });
  });
}

/** A lamp on a short post, lit at night, no higher than 3. */
function lampPost(k: Build, x: number, z: number, y: number): void {
  k.b.box(x - 0.09, y, z - 0.09, x + 0.09, y + 2.2, z + 0.09, IRONWORK);
  k.b.box(x - 0.24, y + 2.2, z - 0.24, x + 0.24, y + 2.62, z + 0.24, 0x4b4f57, { faces: 'NESWTB' });
  k.b.cyl(x, z, y + 2.62, y + 2.88, 0.3, 0.05, 4, 0x4b4f57, { phase: Math.PI / 4, cap: false });
  k.glows.push({ x, y: y + 2.41, z, sx: 0.36, sy: 0.3, sz: 0.36, color: '#ffe2ae' });
}

/** A two-wheeled cart, its shafts down on the ground, with a load of barrels or sacks. Its shafts point along `f`. */
function cart(b: GeoBuilder, x: number, z: number, f: Dir, y: number, sacks: boolean): void {
  const yaw = Math.atan2(f[1], f[0]);
  b.moved(x, y, z, yaw, () => {
    b.box(-1.0, 0.72, -0.62, 1.0, 0.86, 0.62, 0x8a6a48, { faces: 'NESWTB', top: 0x9a7a52 });
    for (const s of [-1, 1]) b.box(-1.0, 0.86, s * 0.62 - (s > 0 ? 0.08 : 0), 1.0, 1.2, s * 0.62 + (s < 0 ? 0.08 : 0), 0x7a5a3a);
    wheel(b, 0, 0.62, -0.72, 0.62, 0.07, -1, 0x5a4532, 0x8a6a48);
    wheel(b, 0, 0.62, 0.72, 0.62, 0.07, 1, 0x5a4532, 0x8a6a48);
    for (const s of [-1, 1]) b.beam([0.95, 0.8, s * 0.5], [2.4, 0.05, s * 0.4], 0.05, 0.05, TIMBER);
    if (sacks) for (const [sx, sz] of [[-0.5, -0.25], [0.1, 0.22], [0.55, -0.2]]) b.box(sx - 0.3, 0.86, sz - 0.22, sx + 0.3, 1.3, sz + 0.22, 0xcdbb94, { top: 0xbfae88 });
    else for (const [sx, sz] of [[-0.5, -0.28], [-0.5, 0.28], [0.2, 0]]) b.cyl(sx, sz, 0.86, 1.64, 0.26, 0.26, 6, 0x7a5a3a, { cap: 0x5a4128 });
  });
}

/** A horse standing, its head down to drink if `drinks`. It looks along `f`. */
function horse(b: GeoBuilder, x: number, z: number, f: Dir, y: number, color: number, drinks: boolean): void {
  const yaw = Math.atan2(f[1], f[0]);
  b.moved(x, y, z, yaw, () => {
    b.box(-0.82, 0.92, -0.28, 0.82, 1.62, 0.28, color);
    for (const [lx, lz] of [[-0.62, -0.17], [-0.62, 0.17], [0.62, -0.17], [0.62, 0.17]]) b.box(lx - 0.09, 0, lz - 0.08, lx + 0.09, 0.94, lz + 0.08, color, { faces: 'NESW' });
    if (drinks) {
      slab(b, [0.7, 1.5, 0], [1.25, 0.95, 0], 0.15, 0.36, color);
      b.box(1.12, 0.62, -0.13, 1.6, 0.98, 0.13, color, { top: 0x3a2a1c });
    } else {
      slab(b, [0.7, 1.45, 0], [1.05, 2.15, 0], 0.15, 0.36, color);
      b.box(0.98, 1.95, -0.13, 1.5, 2.3, 0.13, color, { top: 0x3a2a1c });
    }
    b.beam([-0.82, 1.5, 0], [-1.1, 0.75, 0], 0.07, 0.04, 0x3a2a1c);
  });
}

/** A line of washing between two places at one height: the line, sagging, and the clothes on it, seen from both sides. */
function washing(b: GeoBuilder, a: V3, c: V3, r: () => number): void {
  const m: V3 = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2 - 0.3, (a[2] + c[2]) / 2];
  b.sweep([a, m, c], [0.025, 0.025, 0.025], 0xe2dccb);
  const len = Math.hypot(c[0] - a[0], c[2] - a[2]), ux = (c[0] - a[0]) / len, uz = (c[2] - a[2]) / len, nx = -uz, nz = ux;
  for (let i = 1; i <= 4; i++) {
    const t = i / 5 + (r() - 0.5) * 0.05, sag = 0.3 * (1 - (2 * t - 1) ** 2), half = 0.18 + r() * 0.12, h = 0.45 + r() * 0.35;
    const px = a[0] + (c[0] - a[0]) * t, pz = a[2] + (c[2] - a[2]) * t, py = a[1] + (c[1] - a[1]) * t - sag;
    const p0: V3 = [px - ux * half, py - h, pz - uz * half], p1: V3 = [px + ux * half, py - h, pz + uz * half], p2: V3 = [px + ux * half, py, pz + uz * half], p3: V3 = [px - ux * half, py, pz - uz * half];
    const color = pick(r, [0xf2efe6, 0xd94f4f, 0x3f6fb5, 0xe8d8a8, 0x7fa86a, 0xc9b9e0]);
    b.quad(p0, p1, p2, p3, [nx, 0, nz], color);
    b.quad(p1, p0, p3, p2, [-nx, 0, -nz], color);
  }
}

/** Life in a court: a well or a tree, washing on lines, a cart, a woodpile, children at play, and its light. */
function court(k: Build, c: Box, seed: number, top: number): void {
  const r = rng(seed), b = k.b, cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2, w = c.x1 - c.x0, d = c.z1 - c.z0;
  area(k, rect(c.x0, c.z0, c.x1, c.z1), 0xb9ad94, 0.04);
  if (w > 7 && d > 7) {
    well(b, cx - w * 0.18, cz + d * 0.12, 0.04, ROOF.shingle);
    k.tree(cx + w * 0.22, cz - d * 0.2, treeFor(top - 0.04, 0.8), false, 0.04);
    cart(b, cx + w * 0.25, cz + d * 0.3, [-1, 0], 0.04, true);
    b.box(c.x0 + 0.2, 0.04, c.z0 + 0.3, c.x0 + 1.4, 0.7, c.z0 + 1.0, 0x8a6a48, { top: 0x9a7a52 });
  } else {
    k.tree(cx, cz - d * 0.15, treeFor(top - 0.04, 0.6), false, 0.04);
    b.box(c.x0 + 0.2, 0.04, c.z1 - 0.9, c.x0 + 1.3, 0.55, c.z1 - 0.2, 0x8a6a48, { top: 0x9a7a52 });
  }
  // washing between the backs of the houses, over the court: from the upper storeys where there are two, else under the eaves
  const hy = top >= 7 ? 4.3 : ST - 0.22;
  washing(b, [c.x0 - 0.05, hy, c.z0 + d * 0.3], [c.x1 + 0.05, hy, c.z0 + d * 0.3 + 0.4], r);
  if (d > 7) washing(b, [c.x0 + w * 0.6, hy - 0.2, c.z0 - 0.05], [c.x0 + w * 0.62, hy - 0.2, c.z1 + 0.05], r);
  for (let i = 0; i < 3; i++) child(b, c.x0 + 1 + r() * (w - 2), c.z0 + d * 0.55 + r() * d * 0.35, 0.04, pick(r, COATS), pick(r, HAIR));
  for (let i = 0; i < 2; i++) stand(k, c.x0 + 1 + r() * (w - 2), c.z0 + 1 + r() * (d - 2), 0.04);
  k.lights.push({ x: cx, z: cz, r: 9, color: '#ffcf8a', k: 0.4 });
}

// ---------------------------------------------------------------------------
// The blocks of the plan
// ---------------------------------------------------------------------------

/** How far back from the Street of the Sisters the houses on each side stand, inside their lots, so that the crowd has room under their jutting fronts. */
const SET_W = 1.6, SET_E = 0.6;
/** Where along the street the inn stands, in the west row near the River Gate. */
const innZ = (l: Lot): number => l.z1 - 7.5;

/** The houses on the west side of the Street of the Sisters, on Visenya's Hill's east foot: one row looking east, cut by the alley up to the hill's east stair. */
const sistersWest: Model = (k, l) => {
  const r = rng(7121), specs: Spec[] = [];
  STREET.length = 0;
  const iz = innZ(l), inn: [number, number] = [iz - 2.6, iz + 2.6];
  const gaps: [number, number][] = [[VZ - 1.1, VZ + 1.1], inn];
  const depth = l.x1 - l.x0 - SET_W;
  row(specs, r, { axis: 'z', a0: l.z0 + 0.1, a1: l.z1 - 0.1, back: l.x0, depth, face: 'E', cap: l.top, gaps, width: [2.9, 3.8], alley: 0.05 });
  specs.push({ x: l.x0 + depth / 2, z: iz, f: FACE.E, w: inn[1] - inn[0] - 0.24, d: depth, cap: l.top, trade: 'inn', ridge: 'eaves', end: true });
  // candles for the sept, sold at the foot of the stair up to it
  const c = nearest(specs.filter((s) => s.z > VZ + 1 && !s.trade), l.x0, VZ + 2.5);
  if (c) c.trade = 'candles';
  for (const [h, s] of houses(k, specs, r)) STREET.push({ x: h.x + h.d / 2 + (s.ups.length || s.knee ? s.j : 0), z0: h.z - h.w / 2, z1: h.z + h.w / 2, top: s.y0 + ST + s.ups.reduce((a, u) => a + u, 0) + s.knee, f: 1 });
  // the alley from the street up to the stair: a light at its foot
  k.lights.push({ x: l.x1, z: VZ, r: 8, color: '#ffcf8a', k: 0.4 });
};

/** The houses on the east side of the Street of the Sisters, under Aegon's High Hill: one row looking west, cut by an alley. */
const sistersEast: Model = (k, l) => {
  const r = rng(7343), specs: Spec[] = [], mz = (l.z0 + l.z1) / 2;
  const depth = l.x1 - l.x0 - SET_E;
  row(specs, r, { axis: 'z', a0: l.z0 + 0.1, a1: l.z1 - 0.1, back: l.x1, depth, face: 'W', cap: l.top, gaps: [[mz - 0.8, mz + 0.8]], width: [2.8, 3.6], alley: 0 });
  for (const [h, s] of houses(k, specs, r)) STREET.push({ x: h.x - h.d / 2 - (s.ups.length || s.knee ? s.j : 0), z0: h.z - h.w / 2, z1: h.z + h.w / 2, top: s.y0 + ST + s.ups.reduce((a, u) => a + u, 0) + s.knee, f: -1 });
};

const courtNE: Model = (k, l) => {
  const c = courtBlock(k, l, 8811, 3.6, 'S', { S: 'smith' });
  court(k, c, 8812, l.top);
  const r = rng(8813);
  // folk in the lanes round it
  for (let i = 0; i < 8; i++) stand(k, l.x0 + r() * (l.x1 - l.x0), l.z1 + 1.2 + r() * 1.6);
  for (let i = 0; i < 4; i++) stand(k, l.x1 + 0.9 + r() * 0.8, l.z0 + r() * (l.z1 - l.z0));
  k.lights.push({ x: (l.x0 + l.x1) / 2, z: l.z1 + 2, r: 11, color: '#ffcf8a', k: 0.45 });
};

const courtEast: Model = (k, l) => {
  const c = courtBlock(k, l, 9411, 3.3, 'W', { N: 'bread', S: 'fish' });
  court(k, c, 9412, l.top);
  const r = rng(9413);
  for (let i = 0; i < 5; i++) stand(k, l.x0 + r() * (l.x1 - l.x0), l.z1 + 1.0 + r() * 1.4);
  for (let i = 0; i < 4; i++) stand(k, l.x0 - 1.0 - r() * 2.5, l.z0 + 1 + r() * (l.z1 - l.z0 - 2));
  k.lights.push({ x: l.x0 - 2, z: (l.z0 + l.z1) / 2, r: 10, color: '#ffcf8a', k: 0.42 });
};

// ---------------------------------------------------------------------------
// Visenya's Hill: the close on its crown, its stairs, and its houses
// ---------------------------------------------------------------------------

/** How far out the crown's parapet runs, and the half widths of the two stairs. */
const PARAPET = V.crown - 0.45, STAIR_S = 1.25, STAIR_E = 0.85;

/**
 * A flight of steps down the hill from `a` to `c` along one axis, `half` wide
 * to each side: each step as high as the ground at its upper edge, so that the
 * flight follows the slope and is never buried, its risers and its sides down
 * into the ground. The first step is a little below `start`.
 */
function steps(b: GeoBuilder, axis: 'x' | 'z', line: number, from: number, to: number, half: number, start: number, color: number, top: number): void {
  const n = Math.max(2, Math.round(Math.abs(to - from) / 0.55)), dir = Math.sign(to - from);
  let last = start;
  for (let i = 0; i < n; i++) {
    const p0 = from + ((to - from) * i) / n, p1 = from + ((to - from) * (i + 1)) / n;
    const g0 = axis === 'z' ? ground(line, p0) : ground(p0, line), g1 = axis === 'z' ? ground(line, p1) : ground(p1, line);
    const y = Math.min(last - 0.05, Math.max(g0, g1) + 0.06);
    if (y < 0.08) break;
    last = y;
    const lo = Math.min(g0, g1) - 0.35, a0 = Math.min(p0, p1), a1 = Math.max(p0, p1);
    // the riser looks down the hill; the face up the hill is under the step above
    const riser = axis === 'z' ? (dir > 0 ? 'S' : 'N') : dir > 0 ? 'E' : 'W';
    const sides = axis === 'z' ? 'EW' : 'NS';
    if (axis === 'z') b.box(line - half, lo, a0, line + half, y, a1, color, { top, faces: riser + sides + 'T' });
    else b.box(a0, lo, line - half, a1, y, line + half, color, { top, faces: riser + sides + 'T' });
  }
}

const visenyaHill: Model = (k, l) => {
  const b = k.b, r = rng(6143), cy = V.y;
  // --- the close: paving inside a low parapet round the crown, open at the heads of the two stairs ---
  area(k, oval(VX, VZ, PARAPET - 0.12, PARAPET - 0.12, 28), 0xd3cab6, cy + 0.04);
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * Math.PI * 2;
    const px = VX + Math.cos(a) * PARAPET, pz = VZ + Math.sin(a) * PARAPET;
    if ((pz > VZ && Math.abs(px - VX) < STAIR_S + 0.35) || (px > VX && Math.abs(pz - VZ) < STAIR_E + 0.35)) continue;
    const len = (2 * Math.PI * PARAPET) / n;
    b.obox(px, cy - 0.12, pz, 0.17, 0.62, len * 0.52, a, SEPT_SHADE, { top: SEPT_STONE });
  }
  // --- the stairs: down the south slope from the sept's doors, and down the east slope to the street ---
  steps(b, 'z', VX, VZ + PARAPET + 0.15, VZ + V.foot + 0.6, STAIR_S, cy + 0.04, 0xcfc6b2, 0xddd5c3);
  steps(b, 'x', VZ, VX + PARAPET + 0.15, VX + V.foot + 0.4, STAIR_E, cy + 0.04, 0xcfc6b2, 0xddd5c3);
  // --- the hill's name, on the slope before its south-east side, where the view reads it over the street's houses ---
  const br = V.foot - 3.0, bx = VX + Math.cos(VIEW) * br, bz = VZ + Math.sin(VIEW) * br, along: Dir = [-TO_VIEW[2], TO_VIEW[0]];
  const by = Math.min(ground(bx + along[0] * 3.2, bz + along[1] * 3.2), ground(bx - along[0] * 3.2, bz - along[1] * 3.2), ground(bx, bz));
  nameBoard(k, HILL_SIGN, bx, bz, by, TO_VIEW, 2.0);
  /** Whether a place is at the board, or on the strip before it that the view reads it across. */
  const board = (x: number, z: number): boolean => {
    const ex = x - bx, ez = z - bz, fwd = ex * TO_VIEW[0] + ez * TO_VIEW[2];
    return Math.abs(ex * along[0] + ez * along[1]) < 3.6 && fwd > -1.0 && fwd < 11;
  };
  // --- the houses on the slopes: two rings, each house looking out down the hill ---
  const others = LOTS.filter((o) => !o.part && o.id !== 'sept');
  const wallX = lotOf('kl-wall-w').x1;
  const taken = (x: number, z: number): boolean =>
    x < wallX + 1.4 || toRoad(x, z) < LANE + 1 || others.some((o) => inBox(o, x, z, 0.6))
    || (z > VZ && Math.abs(x - VX) < STAIR_S + 0.7) || (x > VX && Math.abs(z - VZ) < STAIR_E + 0.6);
  const blocked = (x: number, z: number): boolean => taken(x, z) || board(x, z);
  /** The corners of a house's ground, its jutting front and eaves included. */
  const cornersOf = (q: Spec): [number, number][] => [[-q.w / 2, -q.d / 2], [q.w / 2, -q.d / 2], [-q.w / 2, q.d / 2 + 0.75], [q.w / 2, q.d / 2 + 0.75], [0, 0]].map(([u, v]) => at(q, u, v));
  const under = (q: Spec, x: number, z: number): boolean => {
    const ex = x - q.x, ez = z - q.z, u = ex * q.f[1] - ez * q.f[0], v = ex * q.f[0] + ez * q.f[1];
    return Math.abs(u) < q.w / 2 + 0.2 && v > -q.d / 2 - 0.2 && v < q.d / 2 + 0.95;
  };
  const specs: Spec[] = [];
  const clash = (h: Spec): boolean => specs.some((p) => cornersOf(h).some(([x, z]) => under(p, x, z)) || cornersOf(p).some(([x, z]) => under(h, x, z)));
  const rings = [{ rc: V.foot - 1.25, d: 2.5, outer: true }, { rc: V.crown + 3.75, d: 2.6, outer: false }];
  for (const ring of rings) {
    let a = r() * 0.4;
    const end = a + Math.PI * 2 - 0.1;
    while (a < end) {
      const w = 3.0 + r() * 0.8, am = a + w / 2 / ring.rc, fx = Math.cos(am), fz = Math.sin(am);
      // the inner ring steps out where its backs would stand in the crown's lot, at the corners of the crown's square
      for (const push of ring.outer ? [0] : [0, 0.4, 0.8, 1.2, 1.6]) {
        const rc = ring.rc + push;
        const h: Spec = { x: VX + fx * rc, z: VZ + fz * rc, f: [fx, fz], w, d: ring.d, cap: OUTSIDE_TOP, ridge: 'eaves', jetty: ring.outer || r() < 0.5, end: true };
        const corners = cornersOf(h);
        if (corners.some(([x, z]) => blocked(x, z))) break;
        if (!ring.outer && corners.some(([x, z]) => inBox(l, x, z, 0.05))) continue;
        if (!clash(h)) specs.push(h);
        break;
      }
      a += (w + 0.24 + (r() < 0.15 ? 1.3 : 0)) / ring.rc;
    }
  }
  houses(k, specs, r);
  // --- gardens stepped up the slope between the two stairs, where no house stands: low walls along the contours, and fruit trees ---
  const atBoard = (x: number, z: number): boolean => {
    const ex = x - bx, ez = z - bz;
    return Math.abs(ex * along[0] + ez * along[1]) < 3.6 && Math.abs(ex * TO_VIEW[0] + ez * TO_VIEW[2]) < 1.0;
  };
  const free = (x: number, z: number): boolean => !atBoard(x, z) && !taken(x, z) && !specs.some((s) => under(s, x, z));
  for (const rr of [V.crown + 2.4, V.crown + 4.9]) {
    const n = Math.ceil((Math.PI * 2 * rr) / 1.4), seg = (Math.PI * 2 * rr) / n;
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * Math.PI * 2;
      if (a < (STAIR_E + 1.0) / rr || a > Math.PI / 2 - (STAIR_S + 1.0) / rr) continue;
      const x = VX + Math.cos(a) * rr, z = VZ + Math.sin(a) * rr;
      if (!free(x, z) || !free(VX + Math.cos(a) * (rr + 0.6), VZ + Math.sin(a) * (rr + 0.6))) continue;
      const hi = ground(VX + Math.cos(a) * (rr - 0.2), VZ + Math.sin(a) * (rr - 0.2)) + 0.32, lo = ground(VX + Math.cos(a) * (rr + 0.2), VZ + Math.sin(a) * (rr + 0.2)) - 0.3;
      b.obox(x, (hi + lo) / 2, z, 0.17, (hi - lo) / 2, seg * 0.51, a, 0xb1a791, { top: 0xc6bda8 });
    }
  }
  for (const [rr, a] of [[V.crown + 3.6, 0.42], [V.crown + 3.4, 1.05], [V.crown + 6.0, 0.62], [V.crown + 6.1, 1.2]]) {
    const x = VX + Math.cos(a) * rr, z = VZ + Math.sin(a) * rr, y = ground(x, z);
    if (free(x, z)) k.tree(x, z, treeFor(OUTSIDE_TOP - y, 0.5), false, y);
  }
  // --- folk: going up the stairs, in the lanes between the rings, at the foot of the hill ---
  for (let i = 0; i < 7; i++) {
    const t = 0.12 + r() * 0.8, z = VZ + PARAPET + (V.foot - PARAPET) * t, x = VX + (r() - 0.5) * STAIR_S * 1.4;
    k.person(x, z, ground(x, z) + 0.12);
  }
  for (let i = 0; i < 3; i++) {
    const t = 0.15 + r() * 0.7, x = VX + PARAPET + (V.foot - PARAPET) * t, z = VZ + (r() - 0.5) * STAIR_E;
    k.person(x, z, ground(x, z) + 0.12);
  }
  const laneR = (rings[0].rc - rings[0].d / 2 + rings[1].rc + rings[1].d / 2 + 0.75) / 2;
  for (let i = 0; i < 18; i++) {
    const a = r() * Math.PI * 2, x = VX + Math.cos(a) * laneR, z = VZ + Math.sin(a) * laneR;
    if (blocked(x, z) || specs.some((s) => under(s, x, z))) continue;
    k.person(x, z, ground(x, z));
  }
  // lanterns up the south stair, and light at its foot and on the crown
  for (const t of [0.35, 0.75]) {
    const z = VZ + PARAPET + (V.foot - PARAPET) * t;
    lampPost(k, VX - STAIR_S - 0.35, z, ground(VX - STAIR_S - 0.35, z));
  }
  k.lights.push({ x: VX, z: VZ + V.foot - 1, r: 10, color: '#ffcf8a', k: 0.45 }, { x: VX + V.foot - 2, z: VZ, r: 9, color: '#ffcf8a', k: 0.4 }, { x: VX - 9, z: VZ - 9, r: 10, color: '#ffcf8a', k: 0.35 });
};

// ---------------------------------------------------------------------------
// The sept
// ---------------------------------------------------------------------------

/**
 * One plain sept of seven sides, on the crown of Visenya's Hill: a stepped
 * plinth, walls of pale stone with a buttress at each corner, a tall pointed
 * window in each of six faces and in the seventh, which looks south, the doors
 * under a round window, so that it has seven windows, one for each face of the
 * Seven; a cornice, a low dome of lead in seven facets, and a small lantern of
 * glass with a gilt finial. Lit warm from within at night, and quiet: a septon
 * and a septa at its doors and a few folk on its steps, and no fire near it.
 */
const sept: Model = (k, l) => {
  const b = k.b, cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, y = ground(cx, cz);
  const R = Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2 - 0.35;
  const PH = Math.PI / 2 + Math.PI / 7;
  const hept = (rr: number): XZ[] => Array.from({ length: 7 }, (_, i): XZ => [cx + Math.cos(PH + (i * 2 * Math.PI) / 7) * rr, cz + Math.sin(PH + (i * 2 * Math.PI) / 7) * rr]);
  // the plinth, in two steps, and the floor
  prism(b, hept(R + 0.78), y - 0.5, y + 0.2, SEPT_SHADE, { top: SEPT_STONE });
  prism(b, hept(R + 0.42), y + 0.2, y + 0.42, SEPT_SHADE, { top: SEPT_STONE });
  const yF = y + 0.42, WALL = 6.6, yC = yF + WALL;
  prism(b, hept(R), yF, yC, SEPT_STONE, { top: false });
  // a buttress at each corner, stepped back once, and a pinnacle on it that rises past the cornice
  for (let i = 0; i < 7; i++) {
    const a = PH + (i * 2 * Math.PI) / 7, ca = Math.cos(a), sa = Math.sin(a);
    b.obox(cx + ca * (R + 0.18), yF + 2.1, cz + sa * (R + 0.18), 0.36, 2.1, 0.27, a, SEPT_SHADE, { top: SEPT_STONE });
    b.obox(cx + ca * (R + 0.08), yF + 5.0, cz + sa * (R + 0.08), 0.24, 0.8, 0.22, a, SEPT_SHADE, { top: SEPT_STONE });
    b.cyl(cx + ca * (R + 0.1), cz + sa * (R + 0.1), yF + 5.8, yF + 7.6, 0.3, 0.02, 4, SEPT_STONE, { phase: a + Math.PI / 4, cap: false });
  }
  // the faces: a tall pointed window in six, and the doors in the one that looks south
  const A = R * Math.cos(Math.PI / 7);
  for (let m = 0; m < 7; m++) {
    const th = Math.PI / 2 + (m * 2 * Math.PI) / 7, nx = Math.cos(th), nz = Math.sin(th), tx = -nz, tz = nx;
    const P = (u: number, v: number, out: number): V3 => [cx + nx * (A + out) + tx * u, v, cz + nz * (A + out) + tz * u];
    const n: V3 = [nx, 0, nz];
    const pointed = (half: number, y0: number, y1: number, tip: number, out: number, color: number, lit: number): void => {
      const o = lit > 0 ? { win: interior(lit) } : {};
      b.quad(P(-half, y0, out), P(half, y0, out), P(half, y1, out), P(-half, y1, out), n, color, o);
      face3(b, P(-half, y1, out), P(half, y1, out), P(0, tip, out), n, color, o);
    };
    if (m === 0) {
      pointed(1.05, yF, yF + 2.75, yF + 3.75, 0.03, SEPT_SHADE, 0);
      pointed(0.78, yF, yF + 2.55, yF + 3.35, 0.06, 0x2a2018, 1.3);
      // the two leaves, swung back into the doorway
      for (const s of [-1, 1]) b.quad(P(s * 0.78, yF, 0.08), P(s * 0.45, yF, 0.08), P(s * 0.45, yF + 2.5, 0.08), P(s * 0.78, yF + 2.5, 0.08), n, DOOR);
      // the round window over the doors
      roundel(b, [cx, yF + 4.85, cz + A + 0.03], 0.82, 'S', SEPT_SHADE, {}, 12);
      roundel(b, [cx, yF + 4.85, cz + A + 0.06], 0.62, 'S', SEPT_GLASS, { win: interior(0.9) }, 12);
    } else {
      pointed(0.68, yF + 1.35, yF + 4.6, yF + 5.55, 0.03, SEPT_SHADE, 0);
      pointed(0.48, yF + 1.5, yF + 4.5, yF + 5.25, 0.06, SEPT_GLASS, 0.9);
    }
  }
  // the cornice, the dome in seven facets, the lantern and the finial
  prism(b, hept(R + 0.24), yC, yC + 0.34, SEPT_SHADE, { top: SEPT_STONE });
  const y0 = yC + 0.34;
  const rings: [number, number][] = [[R + 0.02, y0], [R - 0.06, y0 + 0.55], [R * 0.86, y0 + 1.45], [R * 0.65, y0 + 2.25], [R * 0.4, y0 + 2.85], [R * 0.14, y0 + 3.15]];
  for (let i = 0; i + 1 < rings.length; i++) b.cyl(cx, cz, rings[i][1], rings[i + 1][1], rings[i][0], rings[i + 1][0], 7, LEAD, { phase: PH, cap: false });
  const yL = y0 + 3.15, rl = R * 0.14;
  b.cyl(cx, cz, yL - 0.02, yL + 0.7, rl, rl, 7, CRYSTAL, { phase: PH, cap: false, win: interior(1.0) });
  b.cyl(cx, cz, yL + 0.7, yL + 1.15, rl + 0.12, 0.04, 7, LEAD, { phase: PH, cap: false });
  b.cyl(cx, cz, yL + 1.1, yL + 1.9, 0.06, 0.04, 4, GILT, { cap: false });
  b.cyl(cx, cz, yL + 1.4, yL + 1.58, 0.13, 0.13, 6, GILT, { cap: GILT });
  // on the finial, the seven-pointed star, gilt, looking south and north
  const sy = yL + 2.28, star = (i: number): V3 => {
    const a = Math.PI / 2 + (i * Math.PI) / 7, rr = i % 2 ? 0.2 : 0.46;
    return [cx + Math.cos(a) * rr, sy + Math.sin(a) * rr, cz];
  };
  for (let i = 0; i < 14; i++) {
    for (const s of [-1, 1]) face3(b, [cx, sy, cz + s * 0.02], [...star(i).slice(0, 2), cz + s * 0.02] as V3, [...star(i + 1).slice(0, 2), cz + s * 0.02] as V3, [0, 0, s], GILT);
  }
  // a septon and a septa at the doors, and folk on the steps
  const dz = cz + A + 1.1;
  figure(b, cx - 1.4, dz, y + 0.04, SEPTON);
  figure(b, cx + 1.5, dz + 0.2, y + 0.04, SEPTA);
  for (const [dx, ddz] of [[-2.6, 1.6], [2.4, 1.9], [0.4, 2.3], [-4.3, -0.8]]) k.person(cx + dx, cz + A + ddz, y + 0.04);
  // light from its doors and windows, on the close
  k.lights.push({ x: cx, z: cz + A + 2.5, r: 9, color: '#ffe2ae', k: 0.5 }, { x: cx + 4.5, z: cz, r: 8, color: '#ffe2ae', k: 0.35 });
};

// ---------------------------------------------------------------------------
// The squares under the dragons' heads
// ---------------------------------------------------------------------------

/**
 * A square at the foot of the Dragonpit's terrace: paved with setts, with pale
 * flags along the foot of the terrace and round its well; stalls, a trough, a
 * cart, lamps; and folk gathered in its north half round `gather`, looking up
 * at the dragons on the Pit. Nothing in it is 3 high, so that a dragon's head
 * may hang over it.
 */
function square(k: Build, sq: Box, seed: number, o: { well: [number, number]; stalls: [number, number, Dir][]; trough?: [number, number]; cart: [number, number, Dir]; lamps: [number, number][]; folk: number; gather: number; spread: number }): void {
  const b = k.b, r = rng(seed), y = 0.04;
  area(k, rect(sq.x0 + 0.05, sq.z0 + 0.05, sq.x1 - 0.05, sq.z1 - 0.05), SETTS, y);
  area(k, rect(sq.x0 + 0.05, sq.z0 + 0.05, sq.x1 - 0.05, sq.z0 + 0.85), FLAGS, y + 0.012);
  area(k, oval(o.well[0], o.well[1], 1.7, 1.7, 16), FLAGS, y + 0.012);
  well(b, o.well[0], o.well[1], y, ROOF.tile);
  const cloths = [0xb84a3a, 0x3f6ea8, 0xd9b24a, 0x5f8a4a, 0xa8583e];
  const goods = [0xc98a48, 0x9fb3bd, 0x8fb04a, 0xd94f4f, 0xe8d8a8];
  o.stalls.forEach(([x, z, f], i) => {
    stall(b, x, z, f, y, cloths[i % cloths.length], goods[(i + 2) % goods.length]);
    stand(k, x - f[0] * 0.9, z - f[1] * 0.9, y);
    stand(k, x + f[0] * 1.5 + (r() - 0.5), z + f[1] * 1.5 + (r() - 0.5), y);
  });
  for (let i = 0; i < 5; i++) {
    const [x, z] = o.stalls[i % o.stalls.length];
    if (i % 2) barrel(b, x + 1.3 + r() * 0.3, z + (r() - 0.5) * 0.6, y);
    else basket(b, x - 1.25, z + (r() - 0.5) * 0.6, y, pick(r, goods));
  }
  if (o.trough) {
    const [tx, tz] = o.trough;
    b.box(tx - 1.4, y, tz - 0.4, tx + 1.4, y + 0.66, tz + 0.4, 0x9a907f, { top: 0x5b7f8f });
    horse(b, tx + 0.4, tz + 1.55, [0, -1], y, 0x7a4e30, true);
  }
  cart(b, o.cart[0], o.cart[1], o.cart[2], y, r() < 0.5);
  crate(b, o.cart[0] - o.cart[2][0] * 1.6 + 0.4, o.cart[1] - o.cart[2][1] * 1.6 + 0.6, 0.7, y);
  for (const [x, z] of o.lamps) lampPost(k, x, z, y);
  // folk gathered in its north half, at the foot of the terrace, looking up at the dragons on the Pit, and children among them
  const cx = o.gather, hz = sq.z0 + Math.max(2.5, (sq.z1 - sq.z0) * 0.62);
  const clear = (x: number, z: number): boolean => inBox(sq, x, z, -0.6) && Math.hypot(x - o.well[0], z - o.well[1]) > 1.7 && !o.stalls.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 1.6)
    && Math.hypot(x - o.cart[0], z - o.cart[1]) > 2.6 && !(o.trough && Math.abs(x - o.trough[0]) < 2.4 && z > o.trough[1] - 1 && z < o.trough[1] + 3);
  for (let i = 0, n = 0; i < o.folk * 3 && n < o.folk; i++) {
    const x = cx + (r() + r() - 1) * o.spread, z = sq.z0 + 1.4 + r() * (hz - sq.z0 - 1.4);
    if (!clear(x, z)) continue;
    if (n % 5 === 4) child(b, x, z, y, pick(r, COATS), pick(r, HAIR));
    else stand(k, x, z, y);
    n++;
  }
  k.lights.push({ x: cx, z: (sq.z0 + sq.z1) / 2, r: 13, color: '#ffcf8a', k: 0.5 }, { x: o.well[0], z: o.well[1], r: 10, color: '#ffcf8a', k: 0.42 });
}

function squares(k: Build): void {
  const bal = KEPT.find((s) => s.what.includes('Balerion')), vha = KEPT.find((s) => s.what.includes('Vhagar'));
  if (bal) {
    const w = bal.x1 - bal.x0, d = bal.z1 - bal.z0, x = (t: number): number => bal.x0 + w * t, z = (t: number): number => bal.z0 + d * t;
    // its market on its west side, where the view sees it past the houses south of the square; the trough by the east wall
    square(k, bal, 5101, {
      well: [x(0.27), z(0.7)],
      stalls: [[x(0.05), z(0.28), [1, 0]], [x(0.05), z(0.62), [1, 0]], [x(0.14), z(0.9), [0, -1]], [x(0.42), z(0.88), [0, -1]], [x(0.62), z(0.88), [0, -1]]],
      trough: [x(0.88), z(0.12)],
      cart: [x(0.83), z(0.68), [-1, 0]],
      lamps: [[bal.x0 + 0.6, bal.z1 - 0.6], [x(0.52), bal.z1 - 0.6], [bal.x1 - 1.6, bal.z1 - 0.6]],
      folk: 34, gather: x(0.44), spread: 7,
    });
  }
  if (vha) {
    const w = vha.x1 - vha.x0, d = vha.z1 - vha.z0, x = (t: number): number => vha.x0 + w * t, z = (t: number): number => vha.z0 + d * t;
    square(k, vha, 5203, {
      well: [x(0.36), z(0.42)],
      stalls: [[x(0.1), z(0.76), [0, -1]], [x(0.58), z(0.78), [0, -1]], [x(0.74), z(0.78), [0, -1]]],
      trough: [x(0.9), z(0.3)],
      cart: [x(0.22), z(0.46), [1, 0]],
      lamps: [[vha.x0 + 1.9, vha.z1 - 0.5], [x(0.47), vha.z1 - 0.5], [vha.x1 - 0.6, vha.z1 - 0.5]],
      folk: 24, gather: x(0.55), spread: 6,
    });
  }
}

// ---------------------------------------------------------------------------
// The Golden Wedding's procession, 49 AC
// ---------------------------------------------------------------------------

/**
 * The Street of the Sisters on the seventh day of the seventh moon of 49 AC,
 * when the wedding party went from the rites in the Dragonpit to the feast in
 * the Red Keep: a crowd lining both sides of the street, Targaryen banners on
 * tall staffs at its edges, a few of the Velaryons' sea green, pennants strung
 * across it where it runs level, and streamers of red, black and gold hung
 * from the houses. The street itself is left clear, and nobody in the party is
 * shown.
 */
function procession(k: Build): void {
  const b = k.b, r = rng(4907);
  const SW = lotOf('h-sisters-w'), SE = lotOf('h-sisters-e');
  const mid = ROADS.sisters[0][0], xw = mid - LANE, xe = mid + LANE;
  const z0 = Math.max(SW.z0, SE.z0) + 2, z1 = Math.min(SW.z1, SE.z1) - 2, climb = CLIMB.foot[1];
  /** Where on each side the crowd and the staffs may stand: between the house fronts and the road, and north of the climb's foot, clear of the climb's walls. */
  const westOf = (z: number): [number, number] => [SW.x1 - SET_W + 0.55, (z < climb ? xw - 1.5 : xw) - 0.45];
  const eastOf = (z: number): [number, number] => [(z < climb ? xe + 1.5 : xe) + 0.45, SE.x0 + SET_E - 0.5];
  const staffs: { x: number; z: number; side: number }[] = [];
  for (let z = z0 + 1; z <= z1; z += 6) {
    // none before the inn's door
    if (Math.abs(z - innZ(SW)) > 3) staffs.push({ x: westOf(z)[1] - 0.05, z, side: -1 });
    if (z + 3 <= z1) staffs.push({ x: eastOf(z + 3)[0] + 0.05, z: z + 3, side: 1 });
  }
  staffs.forEach((s, i) => {
    const house = i % 5 === 3 ? 'velaryon' : 'targaryen';
    // the flag flies along the street, so that it never hangs over the road
    b.moved(s.x, ground(s.x, s.z), s.z, Math.PI / 2, () => banner(b, 0, 0, 0, house, 6, 0.95));
    k.glows.push({ x: s.x, y: ground(s.x, s.z) + 3.0, z: s.z - 0.25, sx: 0.22, sy: 0.3, sz: 0.22, color: '#ffd38a' });
  });
  // pennants strung across the street where it runs level, from staff top to staff top
  for (const s of staffs.filter((t) => t.side < 0 && t.z > climb + 2)) {
    const e = staffs.find((t) => t.side > 0 && Math.abs(t.z - (s.z + 3)) < 0.01);
    if (!e) continue;
    const a: V3 = [s.x, 5.85, s.z], c: V3 = [e.x, 5.85, e.z], m: V3 = [(a[0] + c[0]) / 2, 5.25, (a[2] + c[2]) / 2];
    b.sweep([a, m, c], [0.03, 0.03, 0.03], 0xe2d6b8);
    const len = Math.hypot(c[0] - a[0], c[2] - a[2]), ux = (c[0] - a[0]) / len, uz = (c[2] - a[2]) / len, n: V3 = [-uz, 0, ux];
    const count = Math.round(len / 0.95);
    for (let i = 1; i < count; i++) {
      const t = i / count, sag = 0.6 * (1 - (2 * t - 1) ** 2), px = a[0] + (c[0] - a[0]) * t, pz = a[2] + (c[2] - a[2]) * t, py = 5.85 - sag;
      const color = [RED, BLACK, GOLD][i % 3];
      const p0: V3 = [px - ux * 0.22, py, pz - uz * 0.22], p1: V3 = [px + ux * 0.22, py, pz + uz * 0.22], p2: V3 = [px, py - 0.5, pz];
      face3(b, p0, p1, p2, n, color);
      face3(b, p0, p1, p2, [-n[0], 0, -n[2]], color);
    }
  }
  // streamers hung from the fronts of the houses along the street
  for (const h of STREET) {
    const count = Math.max(1, Math.floor((h.z1 - h.z0) / 1.25));
    for (let i = 0; i < count; i++) {
      const z = h.z0 + ((h.z1 - h.z0) * (i + 0.5)) / count, x = h.x + h.f * 0.06, len = 1.5 + r() * 0.6, top = h.top - 0.25;
      const color = pick(r, [RED, BLACK, RED, GOLD, SEA, SILVER]);
      b.quad([x, top - len, z - 0.16], [x, top - len, z + 0.16], [x, top, z + 0.16], [x, top, z - 0.16], [h.f, 0, 0], color);
      face3(b, [x, top - len, z - 0.16], [x, top - len, z + 0.16], [x, top - len - 0.3, z], [h.f, 0, 0], color);
    }
  }
  // the crowd, one or two deep on each side, now and then a child at the front
  for (let z = z0; z <= z1; z += 0.72 + r() * 0.35) {
    for (const side of [westOf(z), eastOf(z)]) {
      const [lo, hi] = side;
      if (hi - lo < 0.3) continue;
      if (staffs.some((s) => Math.abs(s.z - z) < 0.45 && s.x > lo - 0.6 && s.x < hi + 0.6)) continue;
      const many = hi - lo > 1.4 && r() < 0.6 ? 2 : 1;
      for (let i = 0; i < many; i++) {
        const x = lo + (hi - lo) * (many === 1 ? r() : i === 0 ? 0.25 + r() * 0.2 : 0.75 + r() * 0.2), zz = z + (r() - 0.5) * 0.3;
        if (r() < 0.12) child(b, x, zz, ground(x, zz), pick(r, COATS), pick(r, HAIR));
        else stand(k, x, zz);
      }
    }
  }
  // light along the street at night
  for (let z = z0; z <= z1; z += 8) {
    k.lights.push({ x: xw - 1, z, r: 9, color: '#ffcf8a', k: 0.42 }, { x: xe + 1, z: z + 4, r: 9, color: '#ffcf8a', k: 0.42 });
  }
}

// ---------------------------------------------------------------------------
// Smoke from the chimneys
// ---------------------------------------------------------------------------

function chimneySmoke(k: Build): void {
  if (!CHIMNEYS.length) return;
  // a few, spread over the city
  const step = Math.max(1, Math.floor(CHIMNEYS.length / 7)), at: V3[] = CHIMNEYS.filter((_, i) => i % step === 0).slice(0, 7);
  const smoke = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 70);
  k.group.add(smoke.mesh);
  const r = rng(8123), from = new THREE.Vector3(), drift = new THREE.Vector3(0.3, 0.32, 0.12), due = at.map(() => r());
  k.each((dt) => {
    at.forEach(([x, y, z], i) => {
      due[i] -= dt;
      if (due[i] > 0) return;
      due[i] = 0.45 + r() * 0.5;
      smoke.puff(from.set(x + (r() - 0.5) * 0.2, y, z + (r() - 0.5) * 0.2), drift, 0.42, 0.78);
    });
    smoke.update(dt);
  });
}

// ---------------------------------------------------------------------------
// The models, and the rest
// ---------------------------------------------------------------------------

export const MODELS: Record<string, Model> = {
  visenya: visenyaHill,
  sept,
  'h-nw': (k, l) => northBlock(k, l, 1101),
  'h-n1': (k, l) => northBlock(k, l, 1203),
  'h-n2': (k, l) => northBlock(k, l, 1307),
  'h-n3': (k, l) => northBlock(k, l, 1409),
  'h-ne': courtNE,
  'h-w2': (k, l) => doubleRow(k, l, 2203, null),
  'h-sisters-w': sistersWest,
  'h-sisters-e': sistersEast,
  'h-river-w': (k, l) => doubleRow(k, l, 2309, null),
  'h-east': courtEast,
};
export const COVERS: string[] = [];

export function extras(k: Build): void {
  try {
    squares(k);
    procession(k);
    chimneySmoke(k);
  } finally {
    // what the models left for this is used once
    CHIMNEYS.length = 0;
    STREET.length = 0;
  }
}

export function heightAt(_x: number, _z: number): number {
  return 0;
}
