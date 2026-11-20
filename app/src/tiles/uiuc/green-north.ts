// Campustown, on Green Street's north side: Illinois Terminal, KAMS, Burnham
// 310, HERE Champaign, Legends, Murphy's Pub, and the shops between them, with
// Boneyard Creek behind the row and the town's buses standing at the terminal.
//
// Green Street is Campustown's main street, and its north side is what the
// opening view sees first: two storeys of shops and bars under awnings and
// signs, each front its own, people on the paving before them, and towers of
// flats rising behind. By night it is the liveliest street on the tile.
//
// Illinois Terminal (1999) is the town's transport centre: brick, with buff
// bands, a hipped roof, and a clock tower at its corner. The platform is on the
// embankment to its west, at the height of its upper floors, and a short
// covered bridge reaches from its west door to where the platform is built.

import { interior, rng, type V3, type WinSpec } from '../../engine/geo';
import { area, rect } from '../../engine/ground';
import { D, Q, parasol, roundel } from '../../engine/parts';
import { beacon, face3, hip, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { BASE, BRICK, DARK, FELT, GLASS, GLAZED, HALL, HALL_NARROW, IRON, STOREY, awning, dormer } from './look';
import { AREAS, RAIL, type LotDef, type Model } from './plan';

// --- colours of this file's own (worth moving to look.ts if another file wants them) ---

/** The terminal's brick, its buff bands and the dark green of its roofs. */
const T_BRICK = 0xa4553f, BUFF = BRICK.buff, T_ROOF = 0x3f5a4e;
/** Poured and precast concrete, the pale render of the towers, and the dark metal of shopfronts. */
const PRECAST = 0xd9d2c1, RENDER = 0xe9e6de, FRAME = 0x2c3037, BLACK = 0x1c1e23;
/** Plant on a roof, and the screen round it. */
const PLANT = 0xa7abaf, SCREEN = 0x8d939a;
/** The buses: white, a block of blue on the roof, black windows. */
const BUS_WHITE = 0xf4f4ef, BUS_BLUE = 0x2a5db0, TYRE = 0x18191d;
const STONE = 0xbfb7a6, DECK = 0x9b8a72;

/** Two storeys, as a shop row or a bar on Green Street is. */
const W2 = 2 * STOREY;

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------

/** A painted board, sized for its text. */
const board = (id: string, text: string, color: string, ink: string, real = false): SignDef => {
  const aspect = Math.max(2.2, text.length * 0.62);
  return { id, lines: [text], color, ink, aspect, kind: 'board', real, size: [Math.round(52 * aspect), 52] };
};
/** Neon lettering on a dark panel. */
const neon = (id: string, text: string, color: string, real = true): SignDef => {
  const aspect = Math.max(2, text.length * 0.66);
  return { id, lines: [text], color, aspect, real, size: [Math.round(60 * aspect), 60] };
};

export const SIGNS: SignDef[] = [
  board('green-north-terminal', 'ILLINOIS TERMINAL', '#f3f0e7', '#2a2d33', true),
  neon('green-north-kams', 'KAMS', '#ff6a3d'),
  { id: 'green-north-kams-blade', lines: ['KAMS'], color: '#ffd23d', vertical: true, aspect: 0.3, real: true, size: [48, 160] },
  neon('green-north-legends', 'LEGENDS', '#ff3b3b'),
  board('green-north-legends-grill', 'BAR & GRILL', '#1c1e23', '#f3f0e7', true),
  board('green-north-murphys', "MURPHY'S PUB", '#2f4f3a', '#f1e3bf', true),
  { id: 'green-north-murphys-hung', lines: ["MURPHY'S"], color: '#f1e3bf', ink: '#2f4f3a', aspect: 2.4, kind: 'board', real: true, size: [125, 52] },
  board('green-north-tacos', 'TACOS', '#c4462b', '#fbeedd'),
  board('green-north-chopstix', 'CHOPSTIX', '#a8282b', '#fbeedd', true),
  board('green-north-coffee', 'COFFEE', '#2f5d46', '#f4efe0'),
  board('green-north-bubble-tea', 'BUBBLE TEA', '#f3d6e1', '#7a2f55'),
  board('green-north-thai', 'THAI', '#5b3a6e', '#f4efe0'),
  board('green-north-pizza', 'PIZZA', '#b8392e', '#fbeedd'),
  board('green-north-barber', 'BARBER', '#27405f', '#f4efe0'),
  { id: 'green-north-tacos-blade', lines: ['TACOS'], color: '#ffb02e', vertical: true, aspect: 0.4, size: [48, 120] },
  { id: 'green-north-coffee-blade', lines: ['COFFEE'], color: '#7dffb0', vertical: true, aspect: 0.4, size: [48, 120] },
  { id: 'green-north-pizza-blade', lines: ['PIZZA'], color: '#ff5a4a', vertical: true, aspect: 0.4, size: [48, 120] },
  board('green-north-ramen','RAMEN', '#1c1e23', '#ffd9a0'),
  board('green-north-grocery', 'GROCERY', '#3c7a46', '#f4efe0'),
];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** A board on a wall that faces (nx, nz): a thin box proud of the wall, the sign 0.03 in front of it. */
function nameBoard(k: Build, id: string, x: number, y: number, z: number, nx: number, nz: number, h: number, w: number, color: number): void {
  const d = 0.1, hw = w / 2 + 0.12, hh = h / 2 + 0.08;
  if (nz !== 0) k.b.box(x - hw, y - hh, nz > 0 ? z : z - d, x + hw, y + hh, nz > 0 ? z + d : z, color, { faces: nz > 0 ? 'SEWTB' : 'NEWTB' });
  else k.b.box(nx > 0 ? x : x - d, y - hh, z - hw, nx > 0 ? x + d : x, y + hh, z + hw, color, { faces: nx > 0 ? 'ENSTB' : 'WNSTB' });
  k.sign(id, x + nx * (d + 0.03), y, z + nz * (d + 0.03), nx, nz, h, w);
}

/** A pane of glass in a south wall at `z`, lit from within. */
function paneS(k: Build, xa: number, xb: number, z: number, y0: number, y1: number, lit: number, color = GLASS): void {
  k.b.box(xa, y0, z, xb, y1, z + 0.05, color, { faces: 'S', win: interior(lit) });
}

/** A flat roof inside a low wall: the roof, and four thin walls round it, from `y` up to `top`. */
function parapet(k: Build, x0: number, z0: number, x1: number, z1: number, y: number, top: number, color: number, t = 0.25): void {
  const b = k.b;
  b.box(x0 + t, y, z0 + t, x1 - t, y + 0.05, z1 - t, FELT, { faces: 'T' });
  b.box(x0, y, z0, x1, top, z0 + t, color);
  b.box(x0, y, z1 - t, x1, top, z1, color);
  b.box(x0, y, z0 + t, x0 + t, top, z1 - t, color, { faces: 'EWT' });
  b.box(x1 - t, y, z0 + t, x1, top, z1 - t, color, { faces: 'EWT' });
}

/** A clock on a wall that looks `face`: a dark ring, a lit dial and two hands. */
function clock(k: Build, x: number, y: number, z: number, r: number, face: 'N' | 'E' | 'S' | 'W'): void {
  const n: V3 = face === 'E' ? [1, 0, 0] : face === 'W' ? [-1, 0, 0] : face === 'S' ? [0, 0, 1] : [0, 0, -1];
  const at = (d: number): V3 => [x + n[0] * d, y, z + n[2] * d];
  roundel(k.b, at(0.03), r, face, 0x23262c);
  roundel(k.b, at(0.06), r * 0.84, face, 0xf6efd9, { win: interior(1.5) });
  // its hands, at ten past ten
  const ax: V3 = n[0] !== 0 ? [0, 0, -n[0]] : [n[2], 0, 0];
  const p = (u: number, v: number): V3 => [x + n[0] * 0.09 + ax[0] * u, y + v, z + n[2] * 0.09 + ax[2] * u];
  k.b.quad(p(-0.04, 0), p(0.04, 0), p(0.04, r * 0.7), p(-0.04, r * 0.7), n, 0x23262c);
  k.b.quad(p(0, -0.04), p(r * 0.5, -0.04), p(r * 0.5, 0.04), p(0, 0.04), n, 0x23262c);
}

/** A half circle of triangles, upright in a wall that faces (nx, nz): the head of an arched window. */
function arch(k: Build, x: number, y: number, z: number, r: number, nx: number, nz: number, color: number, lit: number, n = 6): void {
  const ax = nz !== 0 ? 1 : 0, az = nx !== 0 ? 1 : 0;
  const p = (i: number): V3 => {
    const a = (Math.PI * i) / n;
    return [x + ax * Math.cos(a) * r, y + Math.sin(a) * r, z + az * Math.cos(a) * r];
  };
  for (let i = 0; i < n; i++) face3(k.b, [x, y, z], p(i), p(i + 1), [nx, 0, nz], color, { win: interior(lit) });
}

/** Piers or pilasters on a south wall at `z`: a thin upright box at each x. */
function piersS(k: Build, xs: number[], z: number, y0: number, y1: number, w: number, d: number, color: number): void {
  for (const x of xs) k.b.box(x - w / 2, y0, z, x + w / 2, y1, z + d, color, { faces: 'SEWT' });
}

/** Brackets under a cornice on a south wall at `z`, from `xa` to `xb`. */
function brackets(k: Build, xa: number, xb: number, z: number, y: number, n: number, color: number): void {
  for (let i = 0; i < n; i++) {
    const x = xa + ((xb - xa) * (i + 0.5)) / n;
    k.b.box(x - 0.09, y - 0.35, z, x + 0.09, y, z + 0.16, color, { faces: 'SEWB' });
  }
}

/** A few people standing about a point, from a run of numbers of this file's own. */
function crowd(k: Build, r: () => number, x: number, z: number, n: number, sx: number, sz: number, y = 0): void {
  for (let i = 0; i < n; i++) k.person(x + (r() - 0.5) * sx, z + (r() - 0.5) * sz, y);
}

/** A small round table on the paving: a top on a post. */
function table(k: Build, x: number, z: number, top = 0xf2efe6): void {
  k.b.box(x - 0.06, 0, z - 0.06, x + 0.06, 0.95, z + 0.06, FRAME, { faces: 'NESW' });
  k.b.box(x - 0.42, 0.95, z - 0.42, x + 0.42, 1.03, z + 0.42, top, { faces: 'NESWTB' });
}

// ---------------------------------------------------------------------------
// Illinois Terminal
// ---------------------------------------------------------------------------

function terminal(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l;
  const BODY = 3 * STOREY, EAVE = BODY + 0.35, RISE = 1.7;
  // the clock tower at the south-east corner, a little proud of the walls
  const T = 3.6, tx0 = x1 - T + 0.3, tx1 = x1 + 0.3, tz0 = z1 - T + 0.3, tz1 = z1 + 0.3, tcx = (tx0 + tx1) / 2, tcz = (tz0 + tz1) / 2;
  const TT = 4 * STOREY, TOP = l.h;

  // the body: three storeys of brick, a stone base, buff bands at each floor, a cornice and a hipped roof.
  // The top storey's windows are round-headed, and built: the two below have the ordinary kind.
  b.box(x0, 0, z0, x1, 2 * STOREY, z1, T_BRICK, { win: HALL, seed: 0.71, faces: 'NESW' });
  b.box(x0, 2 * STOREY, z0, x1, BODY, z1, T_BRICK, { faces: 'NESW' });
  {
    const y0 = 2 * STOREY + 0.45, y1 = 2 * STOREY + 1.85, hw = 0.42;
    const row = (a: number, c: number, fixed: number, face: 'N' | 'E' | 'S' | 'W', skip?: (u: number) => boolean): void => {
      const n = Math.max(1, Math.round((c - a) / 1.9));
      for (let i = 0; i < n; i++) {
        const u = a + ((c - a) * (i + 0.5)) / n;
        if (skip?.(u)) continue;
        const nx = face === 'E' ? 1 : face === 'W' ? -1 : 0, nz = face === 'S' ? 1 : face === 'N' ? -1 : 0;
        if (nz !== 0) {
          b.box(u - hw, y0, nz > 0 ? fixed : fixed - 0.04, u + hw, y1, nz > 0 ? fixed + 0.04 : fixed, GLASS, { faces: face, win: interior(0.9) });
          arch(k, u, y1, fixed + nz * 0.04, hw, 0, nz, GLASS, 0.9);
          b.box(u - hw - 0.12, y1 + hw, nz > 0 ? fixed : fixed - 0.09, u + hw + 0.12, y1 + hw + 0.16, nz > 0 ? fixed + 0.09 : fixed, BUFF, { faces: 'NSEWT' });
        } else {
          b.box(nx > 0 ? fixed : fixed - 0.04, y0, u - hw, nx > 0 ? fixed + 0.04 : fixed, y1, u + hw, GLASS, { faces: face, win: interior(0.9) });
          arch(k, fixed + nx * 0.04, y1, u, hw, nx, 0, GLASS, 0.9);
          b.box(nx > 0 ? fixed : fixed - 0.09, y1 + hw, u - hw - 0.12, nx > 0 ? fixed + 0.09 : fixed, y1 + hw + 0.16, u + hw + 0.12, BUFF, { faces: 'NSEWT' });
        }
      }
    };
    row(x0, tx0, z1, 'S');
    row(x0, x1, z0, 'N');
    row(z0, tz0, x1, 'E');
    row(z0, z1, x0, 'W', (u) => Math.abs(u - (z0 + z1) / 2) < 1.6);
    // buff piers between the bays of the south front, from the base to the cornice
    const n = Math.max(1, Math.round((tx0 - x0) / 1.9));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((tx0 - x0) * i) / n;
      if (i === n) continue;
      b.box(x - (i === 0 ? 0.05 : 0.17), 0.55, z1, x + 0.17, BODY, z1 + 0.09, BUFF, { faces: 'SEW' });
    }
  }
  b.box(x0 - 0.08, 0, z0 - 0.08, x1 + 0.08, 0.55, z1 + 0.08, BASE, { faces: 'NESWT' });
  for (const y of [STOREY, 2 * STOREY]) b.box(x0 - 0.06, y - 0.1, z0 - 0.06, x1 + 0.06, y + 0.1, z1 + 0.06, BUFF, { faces: 'NESWTB' });
  b.box(x0 - 0.25, BODY, z0 - 0.25, x1 + 0.25, EAVE, z1 + 0.25, BUFF, { faces: 'NESWB' });
  hip(b, x0, z0, x1, z1, EAVE, RISE, T_ROOF, 0.3);
  {
    // dormers on the long slopes, their sills on the roof a little way up from the eaves
    const up = 1.0, sill = EAVE + ((up + 0.3) * RISE) / ((z1 - z0) / 2 + 0.3) - 0.12;
    for (const x of [x0 + 2.6, x0 + 6.1, x0 + 9.6]) {
      dormer(b, x, z1 - up, sill, 'S', T_ROOF, 0.9, 0.85, 1.2);
      dormer(b, x, z0 + up, sill, 'N', T_ROOF, 0.9, 0.85, 1.2);
    }
  }

  // the tower: brick, a tall window of the stair on its two outer sides, a clock on each, a cornice and a pyramid cap
  b.box(tx0, 0, tz0, tx1, TT, tz1, T_BRICK, { faces: 'NESW' });
  b.box(tx0 - 0.08, 0, tz0 - 0.08, tx1 + 0.08, 0.55, tz1 + 0.08, BASE, { faces: 'NESWT' });
  for (const y of [STOREY, 2 * STOREY, 3 * STOREY]) b.box(tx0 - 0.07, y - 0.1, tz0 - 0.07, tx1 + 0.07, y + 0.1, tz1 + 0.07, BUFF, { faces: 'NESWTB' });
  // buff quoins up its three outer corners
  for (const [x, z] of [[tx1, tz1], [tx1, tz0], [tx0, tz1]]) b.box(x - 0.2, 0.55, z - 0.2, x + 0.2, 3 * STOREY + 0.1, z + 0.2, BUFF, { faces: 'NESW' });
  b.box(tcx - 0.45, 3.3, tz1, tcx + 0.45, 8.3, tz1 + 0.05, GLASS, { faces: 'S', win: interior(0.9) });
  arch(k, tcx, 8.3, tz1 + 0.05, 0.45, 0, 1, GLASS, 0.9);
  arch(k, tx1 + 0.05, 8.3, tcz, 0.45, 1, 0, GLASS, 0.9);
  b.box(tx1, 3.3, tcz - 0.45, tx1 + 0.05, 8.3, tcz + 0.45, GLASS, { faces: 'E', win: interior(0.9) });
  // the clock stage: buff, with a clock on each outer side
  b.box(tx0 - 0.05, 3 * STOREY + 0.1, tz0 - 0.05, tx1 + 0.05, TT, tz1 + 0.05, BUFF, { faces: 'NESW' });
  const cy = 3 * STOREY + 1.45;
  clock(k, tcx, cy, tz1 + 0.05, 0.92, 'S');
  clock(k, tx1 + 0.05, cy, tcz, 0.92, 'E');
  b.box(tx0 - 0.25, TT, tz0 - 0.25, tx1 + 0.25, TOP, tz1 + 0.25, BUFF, { faces: 'NESWB' });
  b.cyl(tcx, tcz, TOP, TOP + 2.5, (T / 2 + 0.25) * D, 0.05, 4, T_ROOF, { phase: Q, cap: false });
  b.cyl(tcx, tcz, TOP + 2.3, TOP + 3.3, 0.06, 0.03, 4, BUFF, { cap: false });
  k.glows.push({ x: tcx, y: cy, z: tz1 + 0.4, sx: 0.5, sy: 0.5, sz: 0.1, color: '#fff3d6' });
  k.glows.push({ x: tx1 + 0.4, y: cy, z: tcz, sx: 0.1, sy: 0.5, sz: 0.5, color: '#fff3d6' });

  // the south front, towards the creek and the buses: a concourse of glass, two doors, a canopy, and the name over it
  const ga = x0 + 0.6, gb = tx0 - 0.4, gc = (ga + gb) / 2;
  b.box(ga, 0.55, z1, gb, STOREY - 0.15, z1 + 0.12, GLASS, { faces: 'SEW', win: GLAZED, seed: 0.2 });
  for (const x of [gc - 2.2, gc + 2.2]) b.box(x - 0.7, 0.03, z1 + 0.12, x + 0.7, 2.4, z1 + 0.17, DARK, { faces: 'S', win: interior(1.5) });
  b.box(ga - 0.3, STOREY + 0.05, z1 + 0.08, gb + 0.3, STOREY + 0.32, z1 + 1.45, 0x4a4f57, { faces: 'ESWTB' });
  for (const x of [ga, gb]) b.box(x - 0.08, 0, z1 + 1.2, x + 0.08, STOREY + 0.05, z1 + 1.36, 0x4a4f57, { faces: 'NESW' });
  nameBoard(k, 'green-north-terminal', gc, STOREY + 1.3, z1 + 0.06, 0, 1, 0.82, gb - ga - 0.6, 0xf3f0e7);
  k.glows.push({ x: gc, y: STOREY - 0.05, z: z1 + 1.0, sx: gb - ga - 1, sy: 0.06, sz: 0.12, color: '#fff1d6' });
  k.lights.push({ x: gc, z: z1 + 2.2, r: 12, color: '#ffe2ae', k: 0.6 });
  k.lights.push({ x: tcx + 1, z: tcz + 1.5, r: 8, color: '#ffe2ae', k: 0.4 });

  // the west side: a door at the height of the platform, and a covered bridge out to the embankment
  const deck = RAIL.y - 0.5, zc = (z0 + z1) / 2, half = 1.4;
  b.box(x0 - 0.06, deck, zc - 0.8, x0, deck + 2.3, zc + 0.8, DARK, { faces: 'W', win: interior(1.4) });
  b.box(RAIL.x1, deck - 0.4, zc - half, x0, deck + 0.03, zc + half, PRECAST, { faces: 'NSTB' });
  for (const s of [-1, 1]) b.box(RAIL.x1, deck + 0.03, zc + s * half - (s > 0 ? 0.05 : 0), x0, deck + 2.6, zc + s * half + (s < 0 ? 0.05 : 0), GLASS, { faces: s > 0 ? 'S' : 'N', win: interior(0.8) });
  b.box(RAIL.x1, deck + 2.6, zc - half - 0.15, x0 - 0.02, deck + 2.85, zc + half + 0.15, 0x4a4f57, { faces: 'NSTB' });
  // the bridge's frame: a post at each end of each side, and a rail along it
  for (const s of [-1, 1]) {
    const z = zc + s * (half + 0.04);
    for (const x of [RAIL.x1 + 0.08, x0 - 0.1]) b.box(x - 0.07, deck, z - 0.07, x + 0.07, deck + 2.6, z + 0.07, 0x4a4f57, { faces: 'NESW' });
    b.box(RAIL.x1, deck + 1.0, z - 0.06, x0, deck + 1.1, z + 0.06, 0x4a4f57, { faces: 'NSTB' });
  }  k.glows.push({ x: (RAIL.x1 + x0) / 2, y: deck + 2.45, z: zc, sx: 0.3, sy: 0.08, sz: 1.6, color: '#fff1d6' });

  // on the roof, a skylight along the ridge over the hall where the tickets are sold
  b.box(x0 + 3, EAVE + RISE - 0.35, (z0 + z1) / 2 - 0.5, x0 + 7, EAVE + RISE + 0.25, (z0 + z1) / 2 + 0.5, GLASS, { faces: 'NESWT', win: interior(0.7) });

  // travellers at the doors
  const r = rng(9101);
  crowd(k, r, gc, z1 + 0.9, 4, 7, 0.8);
}

// ---------------------------------------------------------------------------
// The shops: a row of fronts, each its own
// ---------------------------------------------------------------------------

interface Shop {
  /** How wide its front is. */
  w: number;
  /** Its walls above the shop, its frame round the shopfront, and how high its parapet stands. */
  wall: number; trim: number; top: number;
  /** An awning of this cloth, or else a fascia board of this colour. */
  cloth?: number; fascia?: number;
  sign: string;
  /** Where its door is. */
  door: 'L' | 'R';
  /** A sign hung out on a blade at the east end of its front, read along the street; a bay window over the shop; a box of flowers under the flats' windows. */
  blade?: string; bay?: boolean; flowers?: boolean;
}

const UPPER: WinSpec = HALL_NARROW;

/** A row of shops with flats over them, from west to east along the lot's south side. */
function shopRow(k: Build, l: LotDef, shops: Shop[], seed: number): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l;
  const total = shops.reduce((s, p) => s + p.w, 0), scale = (x1 - x0) / total;
  const r = rng(seed * 1000);
  let xa = x0;
  shops.forEach((s, i) => {
    const xb = i === shops.length - 1 ? x1 : xa + s.w * scale, w = xb - xa, xc = (xa + xb) / 2;
    const ends = (i === 0 ? 'W' : '') + (i === shops.length - 1 ? 'E' : '');
    // its walls, two storeys, with the flats' windows; the shopfront covers the lower row
    b.box(xa, 0, z0, xb, W2, z1, s.wall, { win: UPPER, seed: seed + i * 0.17, faces: 'NS' + ends });
    // a cornice, and the roof inside a low wall
    b.box(xa, W2 - 0.05, z1, xb, W2 + 0.22, z1 + 0.14, s.trim, { faces: 'SEWTB' });
    parapet(k, xa + (i === 0 ? 0 : 0.02), z0, xb - (i === shops.length - 1 ? 0 : 0.02), z1, W2, s.top, s.wall, 0.22);
    // the shopfront: a frame of its own colour, a window and a door, lit from within
    b.box(xa + 0.12, 0, z1, xb - 0.12, STOREY + 0.2, z1 + 0.1, s.trim, { faces: 'SEWT' });
    const da = s.door === 'L' ? xa + 0.45 : xb - 1.45;
    const pa = s.door === 'L' ? da + 1.3 : xa + 0.45, pb = s.door === 'L' ? xb - 0.45 : da - 0.3;
    paneS(k, pa, pb, z1 + 0.1, 0.55, 2.35, 1.25);
    paneS(k, da, da + 1.0, z1 + 0.1, 0.03, 2.35, 1.6, 0x2c3037);
    if (s.cloth !== undefined) {
      const v = awning(b, 'S', xa + 0.2, xb - 0.2, z1 + 0.1, 3.3, 0.78, 0.35, 0.48, s.cloth);
      k.sign(s.sign, v.x, v.y, v.z, v.nx, v.nz, 0.4, w - 0.9);
    } else {
      const f = s.fascia ?? BLACK;
      b.box(xa + 0.2, 2.5, z1 + 0.1, xb - 0.2, 3.2, z1 + 0.24, f, { faces: 'SEWTB' });
      k.sign(s.sign, xc, 2.85, z1 + 0.27, 0, 1, 0.56, w - 0.6);
    }
    k.glows.push({ x: xc, y: 2.5, z: z1 + 0.35, sx: w - 0.9, sy: 0.06, sz: 0.1, color: '#ffe2ae' });
    k.lights.push({ x: xc, z: z1 + 1.6, r: 6, color: '#ffe2ae', k: 0.45 });
    // a pier of the wall's own colour at each end of the front, up to the cornice
    piersS(k, [xa + 0.14, xb - 0.14], z1 + 0.1, 0, W2 - 0.05, 0.28, 0.06, s.wall);
    if (s.blade) {
      const bx = xb - 0.45, bz = z1 + 0.55;
      b.box(bx - 0.06, 3.55, z1 + 0.1, bx + 0.06, 5.45, z1 + 0.95, BLACK, { faces: 'NESWTB' });
      k.sign(s.blade, bx + 0.09, 4.5, bz, 1, 0, 1.8, 0.75);
      k.sign(s.blade, bx - 0.09, 4.5, bz, -1, 0, 1.8, 0.75);
    }
    if (s.bay) {
      // a bay window over the shop, glazed on its three sides
      const ba = xc - 1.0, bb = xc + 1.0;
      b.box(ba, STOREY + 0.55, z1 + 0.1, bb, W2 - 0.35, z1 + 0.55, s.trim, { faces: 'SEWTB' });
      paneS(k, ba + 0.12, bb - 0.12, z1 + 0.55, STOREY + 0.75, W2 - 0.55, 0.8);
    } else if (s.flowers) {
      b.box(xa + 0.45, STOREY + 0.55, z1 + 0.1, xb - 0.45, STOREY + 0.85, z1 + 0.45, s.trim, { faces: 'SEWTB', top: 0x5f8f4e });
      for (let j = 0; j < 3; j++) b.box(xa + 0.7 + j * (w - 1.4) / 3, STOREY + 0.85, z1 + 0.15, xa + 0.95 + j * (w - 1.4) / 3, STOREY + 1.15, z1 + 0.4, [0xd8434b, 0xf2c230, 0xe58fb0][j], { faces: 'NESWT' });
    }
    // on its roof, the flats' cooling unit
    b.box(xc - 0.6 + (r() - 0.5), W2 + 0.05, z0 + 1.2, xc + 0.5 + (r() - 0.5), W2 + 0.75, z0 + 2.3, PLANT, { faces: 'NESWT' });
    // a board on the paving that says what is on today, at every other door
    if (i % 2 === 0) b.box(da + 1.2, 0, z1 + 0.6, da + 1.6, 0.95, z1 + 0.7, FRAME, { faces: 'NESWT' });
    // someone at the window, and someone going in
    k.person(xc + (r() - 0.5) * (w - 1.5), z1 + 0.55 + r() * 0.3);
    if (r() > 0.35) k.person(da + 0.5, z1 + 0.45);
    xa = xb;
  });
  // the back: a door to the flats' stairs, and a light over it
  const xm = (x0 + x1) / 2;
  b.box(xm - 0.5, 0.03, z0 - 0.05, xm + 0.5, 2.2, z0, 0x5a5f66, { faces: 'N' });
  k.glows.push({ x: xm, y: 2.45, z: z0 - 0.12, sx: 0.3, sy: 0.12, sz: 0.1, color: '#ffe2ae' });
}

/** A barber's pole beside a door: a white post with a red and blue stripe, lit at night. */
function barberPole(k: Build, x: number, y: number, z: number): void {
  k.b.box(x - 0.1, y, z, x + 0.1, y + 0.9, z + 0.2, 0xf4f4ef, { faces: 'NESWTB' });
  k.b.box(x - 0.11, y + 0.2, z - 0.01, x + 0.11, y + 0.35, z + 0.21, 0xc8202c, { faces: 'NESW' });
  k.b.box(x - 0.11, y + 0.55, z - 0.01, x + 0.11, y + 0.7, z + 0.21, 0x23408f, { faces: 'NESW' });
  k.glows.push({ x, y: y + 0.45, z: z + 0.25, sx: 0.12, sy: 0.7, sz: 0.06, color: '#ffeef0' });
}

function shopsN1(k: Build, l: LotDef): void {
  shopRow(k, l, [
    { w: 3.6, wall: 0xe8dcc0, trim: 0x7a2f22, top: 6.6, cloth: 0xc4462b, sign: 'green-north-tacos', door: 'R', blade: 'green-north-tacos-blade', flowers: true },
    { w: 3.8, wall: 0xb26550, trim: 0x2c3037, top: 7.0, fascia: 0xa8282b, sign: 'green-north-chopstix', door: 'L', bay: true },
    { w: 3.6, wall: BRICK.brown, trim: 0x2f3a33, top: 6.75, cloth: 0x2f5d46, sign: 'green-north-coffee', door: 'L', blade: 'green-north-coffee-blade', flowers: true },
  ], 0.53);
  // tables outside the taco shop and the coffee shop, with people at them
  const { x0, x1, z1 } = l, r = rng(5307);
  for (const x of [x0 + 1.2, x1 - 1.0]) {
    table(k, x, z1 + 0.55);
    k.person(x - 0.7, z1 + 0.5 + r() * 0.2);
    k.person(x + 0.65, z1 + 0.65);
  }
  // bikes at a rack by the coffee shop
  for (const d of [0, 0.45, 0.9]) k.b.box(x1 + 0.4, 0, l.z1 - 2.2 - d, x1 + 1.6, 0.9, l.z1 - 2.15 - d, 0x6f8fa8, { faces: 'NESWT' });
}

function shopsN2(k: Build, l: LotDef): void {
  const shops: Shop[] = [
    { w: 4.2, wall: 0xdfe6e8, trim: 0xd77a9a, top: 6.5, fascia: 0xf3d6e1, sign: 'green-north-bubble-tea', door: 'R', flowers: true },
    { w: 3.6, wall: BRICK.red, trim: 0x2c3037, top: 6.95, cloth: 0x5b3a6e, sign: 'green-north-thai', door: 'L', bay: true },
    { w: 4.4, wall: BRICK.buff, trim: 0x7a2f22, top: 6.7, cloth: 0xb8392e, sign: 'green-north-pizza', door: 'R', blade: 'green-north-pizza-blade', flowers: true },
    { w: 3.8, wall: 0x7d8a92, trim: 0x27405f, top: 7.0, fascia: 0x27405f, sign: 'green-north-barber', door: 'L', bay: true },
  ];
  shopRow(k, l, shops, 0.61);
  const { x0, x1, z1 } = l;
  const scale = (x1 - x0) / shops.reduce((s, p) => s + p.w, 0);
  // the barber's pole, beside his door
  barberPole(k, x1 - 3.8 * scale + 1.75, 0.9, z1 + 0.1);
  // a table outside the pizza shop
  const xp = x0 + (4.2 + 3.6 + 1.6) * scale;
  table(k, xp, z1 + 0.55);
  k.person(xp - 0.7, z1 + 0.6);
  k.person(xp + 0.7, z1 + 0.45);
}

// ---------------------------------------------------------------------------
// KAMS, at First and Green
// ---------------------------------------------------------------------------

function kams(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1, h } = l;
  const bx0 = x0 + 2.6, cx = (bx0 + x1) / 2;
  const KBRICK = 0x7d4436;
  // two storeys of dark red brick, the ground floor painted black, a cornice and a flat roof behind a low wall
  b.box(bx0, 0, z0, x1, W2, z1, KBRICK, { win: HALL, seed: 0.23, faces: 'NESW' });
  b.box(bx0 - 0.1, 0, z0 + 1.2, x1 - 0.12, STOREY + 0.15, z1 + 0.1, BLACK, { faces: 'SEWT' });
  b.box(bx0 - 0.15, W2 - 0.05, z0 - 0.15, x1 + 0.15, W2 + 0.3, z1 + 0.15, 0x3a2a26, { faces: 'NESWTB' });
  parapet(k, bx0, z0, x1, z1, W2 + 0.3, h, KBRICK);
  // the front on Green Street: windows that roll up, open on a warm day, and the door
  for (const [a, c] of [[bx0 + 0.4, bx0 + 2.6], [bx0 + 2.9, bx0 + 5.1]]) {
    paneS(k, a, c, z1 + 0.1, 0.45, 2.45, 1.35);
    // the roll-up door's frame and its glazing bars
    b.box(a - 0.1, 2.45, z1 + 0.1, c + 0.1, 2.62, z1 + 0.22, 0x55585e, { faces: 'SEWTB' });
    for (const y of [1.1, 1.78]) b.box(a, y - 0.04, z1 + 0.15, c, y + 0.04, z1 + 0.19, 0x55585e, { faces: 'STB' });
    for (const x of [a + (c - a) / 3, a + (2 * (c - a)) / 3]) b.box(x - 0.04, 0.45, z1 + 0.15, x + 0.04, 2.45, z1 + 0.19, 0x55585e, { faces: 'SEW' });
  }
  // brick pilasters up the upper storey, and brackets under the cornice
  piersS(k, [bx0 + 0.2, bx0 + 2.75, cx + 2.75, x1 - 0.2], z1, STOREY + 0.15, W2 - 0.05, 0.4, 0.1, KBRICK);
  brackets(k, bx0, x1, z1 + 0.15, W2 - 0.05, 8, 0x3a2a26);
  paneS(k, x1 - 2.6, x1 - 1.4, z1 + 0.1, 0.03, 2.45, 1.7, 0x2c3037);
  // the door has a canopy, and someone checking ids at it
  b.box(x1 - 3.0, 2.6, z1 + 0.1, x1 - 1.0, 2.75, z1 + 0.9, BLACK, { faces: 'NESWTB' });
  k.glows.push({ x: x1 - 2.0, y: 2.55, z: z1 + 0.5, sx: 1.6, sy: 0.05, sz: 0.5, color: '#ffd9a0' });
  // its name in neon over the street, on a dark board across the upper floor
  b.box(cx - 2.6, 3.7, z1, cx + 2.6, 5.35, z1 + 0.12, BLACK, { faces: 'SEWTB' });
  k.sign('green-north-kams', cx, 4.52, z1 + 0.15, 0, 1, 1.3, 5);
  // and down a blade at the corner, read from east and west
  const bxz = z1 + 0.5;
  b.box(x1 - 0.85, 3.0, z1, x1 - 0.7, 6.6, z1 + 0.9, BLACK, { faces: 'NESWTB' });
  k.sign('green-north-kams-blade', x1 - 0.67, 4.8, bxz, 1, 0, 3.3, 0.8);
  k.sign('green-north-kams-blade', x1 - 0.88, 4.8, bxz, -1, 0, 3.3, 0.8);
  // the west side, onto the patio: a window and a side door
  b.box(bx0 - 0.15, 0.45, z0 + 2.5, bx0 - 0.1, 2.45, z0 + 6, GLASS, { faces: 'W', win: interior(1.3) });
  b.box(bx0 - 0.15, 0.03, z1 - 2, bx0 - 0.1, 2.4, z1 - 1, 0x2c3037, { faces: 'W', win: interior(1.5) });
  // the patio: a deck of boards inside a low black fence, tables, a lit string over it, and people
  area(k, rect(x0 + 0.1, z0 + 1.5, bx0 - 0.15, z1 - 0.1), DECK, 0.035);
  b.box(x0 + 0.1, 0, z0 + 1.5, x0 + 0.22, 1.0, z1 - 0.1, BLACK, { faces: 'NESWT' });
  b.box(x0 + 0.1, 0, z1 - 0.22, bx0 - 1.2, 1.0, z1 - 0.1, BLACK, { faces: 'NESWT' });
  b.box(x0 + 0.22, 0, z0 + 1.5, bx0 - 0.15, 1.0, z0 + 1.62, BLACK, { faces: 'NESWT' });
  b.box(x0 + 0.2, 0, z1 - 0.3, x0 + 0.3, 3.0, z1 - 0.2, IRON, { faces: 'NESW' });
  for (let i = 0; i < 6; i++) {
    const t = (i + 0.5) / 6;
    k.glows.push({ x: x0 + 0.25 + (bx0 - x0 - 0.4) * t, y: 2.9 - Math.sin(t * Math.PI) * 0.3, z: z1 - 0.25 - (z1 - z0 - 2) * t * 0.4, sx: 0.14, sy: 0.14, sz: 0.14, color: '#ffd27a' });
  }
  const r = rng(1022);
  for (const z of [z0 + 2.6, z0 + 4.4]) {
    b.box(x0 + 0.45, 0, z - 0.25, x0 + 0.75, 1.05, z + 0.25, 0x6a4a34, { faces: 'NESWT' });
    k.person(x0 + 0.55, z + 0.6);
  }
  parasol(b, x0 + 1.3, z1 - 1.6, 0x23262c);
  crowd(k, r, x0 + 1.3, z1 - 1.2, 2, 1.2, 0.6);
  // a bar of its own on the patio, against the wall, with stools, and two leaning on it
  b.box(bx0 - 0.85, 0, z0 + 2.2, bx0 - 0.15, 1.1, z0 + 6.4, 0x3a2a26, { faces: 'NESWT', top: 0x6a4a34 });
  for (const z of [z0 + 2.8, z0 + 4.3, z0 + 5.8]) b.box(bx0 - 1.35, 0, z - 0.17, bx0 - 1.05, 0.75, z + 0.17, IRON, { faces: 'NESWT' });
  k.person(bx0 - 1.25, z0 + 3.5);
  k.person(bx0 - 1.25, z0 + 5.1);
  k.glows.push({ x: bx0 - 0.5, y: 2.3, z: z0 + 4.3, sx: 0.1, sy: 0.08, sz: 3.6, color: '#ffd27a' });
  b.box(bx0 - 1.0, 2.45, z0 + 2.0, bx0 - 0.15, 2.55, z0 + 6.6, BLACK, { faces: 'NESWTB' });
  // on the street side: a queue at the door
  crowd(k, r, x1 - 4.0, z1 + 0.55, 4, 3, 0.4);
  k.person(x1 - 1.0, z1 + 0.5);
  // the roof: the cooling and the kitchen's fan
  b.box(bx0 + 1, W2 + 0.35, z0 + 1, bx0 + 2.6, W2 + 1.0, z0 + 2.4, PLANT, { faces: 'NESWT' });
  b.cyl(x1 - 1.5, z0 + 1.5, W2 + 0.35, W2 + 0.95, 0.35, 0.35, 6, PLANT);
  // the back door
  b.box(cx - 0.5, 0.03, z0 - 0.05, cx + 0.5, 2.2, z0, 0x5a5f66, { faces: 'N' });
  k.lights.push({ x: cx, z: z1 + 1.8, r: 10, color: '#ffb48a', k: 0.6 });
  k.lights.push({ x: x0 + 1.3, z: (z0 + z1) / 2 + 1, r: 8, color: '#ffe2ae', k: 0.5 });
}

// ---------------------------------------------------------------------------
// Legends and Murphy's Pub
// ---------------------------------------------------------------------------

function legends(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1, h } = l;
  const zf = z1 - 2.6, cx = (x0 + x1) / 2;
  const LBRICK = 0xc9b28c;
  // two storeys of tan brick, set back behind a patio; the ground floor black, under a black awning
  b.box(x0, 0, z0, x1, W2, zf, LBRICK, { win: HALL, seed: 0.41, faces: 'NESW' });
  b.box(x0 + 0.15, 0, zf, x1 - 0.15, STOREY + 0.2, zf + 0.1, BLACK, { faces: 'SEWT' });
  b.box(x0 - 0.12, W2 - 0.05, z0 - 0.12, x1 + 0.12, W2 + 0.25, zf + 0.12, 0x6d5a45, { faces: 'NESWTB' });
  parapet(k, x0, z0, x1, zf, W2 + 0.25, h - 0.45, LBRICK);
  // a raised middle to the parapet, which carries the name in red neon
  b.box(cx - 3.2, W2 + 0.25, zf - 0.25, cx + 3.2, h, zf, LBRICK, { faces: 'NESWT' });
  b.box(cx - 3.0, 3.9, zf, cx + 3.0, 6.6, zf + 0.12, BLACK, { faces: 'SEWTB' });
  k.sign('green-north-legends', cx, 5.25, zf + 0.15, 0, 1, 1.9, 5.8);
  // the front: three big windows with the screens inside them, and the door in the middle
  for (const [a, c] of [[x0 + 0.5, x0 + 3.6], [x1 - 3.6, x1 - 0.5]]) {
    paneS(k, a, c, zf + 0.1, 0.5, 2.4, 1.2);
    // the games on the screens inside, blue at night
    k.glows.push({ x: (a + c) / 2, y: 1.9, z: zf - 0.1, sx: 1.0, sy: 0.55, sz: 0.06, color: '#8fc0ff' });
  }
  paneS(k, cx - 0.7, cx + 0.7, zf + 0.1, 0.03, 2.4, 1.6, 0x2c3037);
  const v = awning(b, 'S', x0 + 0.3, x1 - 0.3, zf + 0.1, 3.3, 1.05, 0.4, 0.45, BLACK);
  k.sign('green-north-legends-grill', v.x, v.y, v.z, v.nx, v.nz, 0.38, 3.6);
  k.glows.push({ x: cx, y: 2.75, z: zf + 0.7, sx: x1 - x0 - 1, sy: 0.06, sz: 0.1, color: '#ffe2ae' });
  // the patio: brick paving, a low black fence with a way in, tables under umbrellas, a string of lights, and people
  area(k, rect(x0 + 0.05, zf + 0.15, x1 - 0.05, z1 - 0.05), 0x9a6a52, 0.035);
  b.box(x0 + 0.1, 0, z1 - 0.25, cx - 0.8, 0.95, z1 - 0.12, BLACK, { faces: 'NESWT' });
  b.box(cx + 0.8, 0, z1 - 0.25, x1 - 0.1, 0.95, z1 - 0.12, BLACK, { faces: 'NESWT' });
  for (const x of [x0 + 0.1, x1 - 0.22]) b.box(x, 0, zf + 0.2, x + 0.12, 0.95, z1 - 0.25, BLACK, { faces: 'NESWT' });
  const r = rng(5221);
  for (const x of [x0 + 1.8, x1 - 1.8]) {
    parasol(b, x, zf + 1.35, 0x2f3a5f);
    k.person(x - 0.85, zf + 1.2 + r() * 0.3);
    k.person(x + 0.8, zf + 1.5);
    k.person(x + 0.1, zf + 2.0);
  }
  for (let i = 0; i < 7; i++) k.glows.push({ x: x0 + 0.6 + ((x1 - x0 - 1.2) * i) / 6, y: 2.95 - (i % 2) * 0.12, z: z1 - 0.3, sx: 0.13, sy: 0.13, sz: 0.13, color: '#ffd27a' });
  for (const x of [x0 + 0.16, x1 - 0.16]) b.box(x - 0.05, 0.95, z1 - 0.24, x + 0.05, 3.0, z1 - 0.14, IRON, { faces: 'NESW' });
  // pilasters up the upper storey either side of the sign, and brackets under the cornice
  piersS(k, [x0 + 0.2, cx - 3.3, cx + 3.3, x1 - 0.2], zf, STOREY + 0.2, W2 - 0.05, 0.4, 0.1, 0xb39a75);
  brackets(k, x0, x1, zf + 0.12, W2 - 0.05, 9, 0x6d5a45);
  // posts in the fence, and a screen on the wall over the patio for those outside
  for (let i = 0; i <= 6; i++) {
    const x = x0 + 0.15 + ((x1 - x0 - 0.3) * i) / 6;
    if (Math.abs(x - cx) < 0.9) continue;
    b.box(x - 0.08, 0, z1 - 0.27, x + 0.08, 1.1, z1 - 0.1, BLACK, { faces: 'NESWT' });
  }
  // two high tables by the fence
  for (const x of [cx - 2.2, cx + 2.2]) {
    b.box(x - 0.05, 0, z1 - 0.75, x + 0.05, 1.15, z1 - 0.65, FRAME, { faces: 'NESW' });
    b.box(x - 0.35, 1.15, z1 - 0.95, x + 0.35, 1.22, z1 - 0.45, 0x6a4a34, { faces: 'NESWTB' });
    k.person(x + 0.55, z1 - 0.8);
  }
  // two at the way in, and someone on the paving outside
  k.person(cx - 0.4, z1 + 0.3);
  k.person(cx + 0.45, z1 + 0.55);
  k.person(cx + 2.6, z1 + 0.6);
  // the roof's plant, and the back door
  b.box(x0 + 1.5, W2 + 0.3, z0 + 1, x0 + 3.2, W2 + 1.0, z0 + 2.5, PLANT, { faces: 'NESWT' });
  b.box(x1 - 3, W2 + 0.3, z0 + 1.2, x1 - 2.0, W2 + 0.8, z0 + 2.0, PLANT, { faces: 'NESWT' });
  b.box(cx - 0.5, 0.03, z0 - 0.05, cx + 0.5, 2.2, z0, 0x5a5f66, { faces: 'N' });
  k.lights.push({ x: cx, z: z1 - 0.8, r: 10, color: '#ffd9a0', k: 0.6 });
}

function murphys(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1, h } = l;
  const zf = z1 - 1.3, cx = (x0 + x1) / 2;
  const MBRICK = 0x9c4a3a, GREEN = 0x2f4f3a, WOOD = 0x5a3a24, CREAM = 0xf1e3bf;
  // an old building of two storeys in red brick, with a corbelled cornice
  b.box(x0, 0, z0, x1, W2, zf, MBRICK, { win: HALL_NARROW, seed: 0.83, faces: 'NESW' });
  b.box(x0 - 0.1, W2 - 0.05, z0 - 0.1, x1 + 0.1, W2 + 0.3, zf + 0.18, 0x7a3a2e, { faces: 'NESWTB' });
  b.box(x0 - 0.05, W2 - 0.4, zf, x1 + 0.05, W2 - 0.05, zf + 0.1, CREAM, { faces: 'SEWTB' });
  parapet(k, x0, z0, x1, zf, W2 + 0.3, h, MBRICK);
  // its ground floor is painted green, with cream trim: two wide windows, open on a warm day, and the door between
  b.box(x0 + 0.1, 0, zf, x1 - 0.1, STOREY + 0.35, zf + 0.12, GREEN, { faces: 'SEWT' });
  for (const [a, c] of [[x0 + 0.5, cx - 0.85], [cx + 0.85, x1 - 0.5]]) {
    // (open: the room inside, dark wood lit warm)
    paneS(k, a, c, zf + 0.12, 0.85, 2.3, 1.0, 0x6a4a34);
    b.box(a - 0.08, 0.72, zf + 0.12, c + 0.08, 0.85, zf + 0.35, CREAM, { faces: 'NSEWTB' });
  }
  paneS(k, cx - 0.55, cx + 0.55, zf + 0.12, 0.03, 2.3, 1.4, WOOD);
  // cream posts between the open windows' leaves, and pilasters at the ends of the front
  for (const [a, c] of [[x0 + 0.5, cx - 0.85], [cx + 0.85, x1 - 0.5]]) {
    for (const x of [a + (c - a) / 3, a + (2 * (c - a)) / 3]) b.box(x - 0.05, 0.85, zf + 0.12, x + 0.05, 2.3, zf + 0.2, CREAM, { faces: 'SEW' });
    b.box(a - 0.08, 2.3, zf + 0.12, c + 0.08, 2.42, zf + 0.22, CREAM, { faces: 'SEWTB' });
  }
  piersS(k, [x0 + 0.3, x1 - 0.3], zf + 0.12, 0, STOREY + 0.35, 0.35, 0.1, CREAM);
  // the upper storey: stone lintels over its windows, a corbelled cornice
  brackets(k, x0, x1, zf + 0.18, W2 - 0.4, 10, 0x7a3a2e);
  // a bench against the front, under the west window
  b.box(x0 + 0.6, 0.42, zf + 0.25, cx - 1.0, 0.52, zf + 0.6, WOOD, { faces: 'NESWTB' });
  for (const x of [x0 + 0.75, cx - 1.15]) b.box(x - 0.05, 0, zf + 0.3, x + 0.05, 0.42, zf + 0.55, IRON, { faces: 'NESW' });
  k.person(x0 + 1.4, zf + 0.5, 0.0);
  nameBoard(k, 'green-north-murphys', cx, 2.75, zf + 0.12, 0, 1, 0.5, x1 - x0 - 1.2, GREEN);
  k.glows.push({ x: cx, y: 2.45, z: zf + 0.5, sx: x1 - x0 - 1.4, sy: 0.05, sz: 0.08, color: '#ffe2ae' });
  // a lamp either side of the door
  for (const x of [cx - 0.75, cx + 0.75]) {
    b.box(x - 0.1, 2.0, zf + 0.12, x + 0.1, 2.15, zf + 0.35, IRON, { faces: 'NESWTB' });
    k.glows.push({ x, y: 1.85, z: zf + 0.28, sx: 0.18, sy: 0.25, sz: 0.18, color: '#ffd9a0' });
  }
  // a sign hung out from the wall over the door, read from either way along the street
  const hx = x1 - 1.0, hy = 4.3, hz = zf + 0.75;
  b.box(hx - 0.05, hy + 0.55, zf, hx + 0.05, hy + 0.65, zf + 1.2, IRON, { faces: 'NESWTB' });
  b.box(hx - 0.04, hy - 0.5, hz - 0.62, hx + 0.04, hy + 0.5, hz + 0.62, GREEN, { faces: 'NESWTB' });
  k.sign('green-north-murphys-hung', hx + 0.07, hy, hz, 1, 0, 0.5, 1.15);
  k.sign('green-north-murphys-hung', hx - 0.07, hy, hz, -1, 0, 0.5, 1.15);
  // two tables out front, and people at them and leaning in at the open windows
  const r = rng(6040);
  for (const x of [x1 - 1.5]) {
    table(k, x, zf + 0.75, 0x7a5236);
    k.person(x - 0.7, zf + 0.7 + r() * 0.2);
    k.person(x + 0.7, zf + 0.85);
  }
  k.person(cx + 0.1, z1 + 0.35);
  k.person(cx - 1.8, z1 + 0.6);
  // the roof: a chimney stack from the old building, and the cooling
  b.box(x0 + 0.6, W2 + 0.3, z0 + 0.6, x0 + 1.5, h, z0 + 1.3, MBRICK, { faces: 'NESWT' });
  b.box(x1 - 3, W2 + 0.3, z0 + 1.5, x1 - 1.6, W2 + 0.9, z0 + 2.7, PLANT, { faces: 'NESWT' });
  b.box(cx - 0.5, 0.03, z0 - 0.05, cx + 0.5, 2.2, z0, 0x5a5f66, { faces: 'N' });
  k.lights.push({ x: cx, z: z1 + 0.2, r: 9, color: '#ffd9a0', k: 0.55 });
}

// ---------------------------------------------------------------------------
// The towers of flats
// ---------------------------------------------------------------------------

/** A red lamp on a short mast at the corner of a tower's roof. */
function redLamp(k: Build, x: number, z: number, y: number): void {
  k.b.cyl(x, z, y, y + 1.2, 0.07, 0.05, 4, 0xd0d3d6, { cap: false });
  beacon(k, x, y + 1.35, z, 0.45);
}

/** A band of light round the top of a tower: a thin glow along each of its four sides. */
function litBand(k: Build, x0: number, z0: number, x1: number, z1: number, y: number, color: string): void {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, d = 0.08;
  k.glows.push({ x: cx, y, z: z1 + d, sx: x1 - x0, sy: 0.14, sz: 0.06, color });
  k.glows.push({ x: cx, y, z: z0 - d, sx: x1 - x0, sy: 0.14, sz: 0.06, color });
  k.glows.push({ x: x1 + d, y, z: cz, sx: 0.06, sy: 0.14, sz: z1 - z0, color });
  k.glows.push({ x: x0 - d, y, z: cz, sx: 0.06, sy: 0.14, sz: z1 - z0, color });
}

/**
 * Burnham 310: eighteen storeys of flats over a grocery, 2008. A slab of pale
 * render and glass, with corners of brown, and the grocery's low hall against
 * its east side.
 */
function burnham(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1, h } = l;
  const TS: WinSpec = { cell: 1.3, storey: 1.25, lit: 0.42, kind: 0 };
  const TOP = 18 * TS.storey, POD = 2 * TS.storey;
  const tx0 = x0 + 0.4, tx1 = x1 - 3.4, tz0 = z0 + 0.6, tz1 = z1 - 0.8, cx = (tx0 + tx1) / 2, cz = (tz0 + tz1) / 2;
  const TAN = 0xd8c7a6, BROWN = 0x8b6a52;
  // the tower, and its ground floor in brown stone, glazed
  b.box(tx0, 0, tz0, tx1, TOP, tz1, TAN, { win: TS, seed: 0.29, faces: 'NESW', top: FELT });
  b.box(tx0 - 0.12, 0, tz0 - 0.12, tx1 + 0.12, POD, tz1 + 0.12, BROWN, { faces: 'NESWT' });
  b.box(tx0 + 0.6, 0.3, tz1 + 0.12, tx1 - 0.6, POD - 0.3, tz1 + 0.16, GLASS, { faces: 'S', win: GLAZED });
  // brown piers up its corners, and a stack of glass up its south face where the lounges are
  for (const [x, z] of [[tx0, tz0], [tx1, tz0], [tx1, tz1], [tx0, tz1]]) b.box(x - 0.2, POD, z - 0.2, x + 0.2, TOP + 0.3, z + 0.2, BROWN, { faces: 'NESW' });
  b.box(cx - 1.0, POD, tz1, cx + 1.0, TOP, tz1 + 0.1, 0x7fa7c2, { faces: 'SEW', win: { cell: 1.0, storey: 1.25, lit: 0.6, kind: 1 } });
  b.box(tx1, POD, cz - 0.9, tx1 + 0.1, TOP, cz + 0.9, 0x7fa7c2, { faces: 'ENS', win: { cell: 1.0, storey: 1.25, lit: 0.6, kind: 1 } });
  // balconies either side of the glass on the south face, on every third floor, and glass up the north face too
  for (let f = 4; f < 18; f += 3) for (const x of [tx0 + 0.9, tx1 - 0.9]) {
    const y = f * TS.storey;
    b.box(x - 0.75, y - 0.1, tz1, x + 0.75, y + 0.04, tz1 + 0.6, PRECAST, { faces: 'NESWTB' });
    b.box(x - 0.75, y + 0.04, tz1 + 0.54, x + 0.75, y + 0.6, tz1 + 0.6, 0x9fb9c9, { faces: 'NSEW' });
  }
  b.box(cx - 1.0, POD, tz0 - 0.1, cx + 1.0, TOP, tz0, 0x7fa7c2, { faces: 'NEW', win: { cell: 1.0, storey: 1.25, lit: 0.6, kind: 1 } });
  // a band of brown round it every third floor
  for (let f = 5; f < 18; f += 3) b.box(tx0 - 0.08, f * TS.storey - 0.1, tz0 - 0.08, tx1 + 0.08, f * TS.storey + 0.06, tz1 + 0.08, BROWN, { faces: 'NESWTB' });
  // the ground floor's stone piers, and its windows on the west
  piersS(k, [tx0 + 0.35, tx0 + 2.0, tx1 - 2.0, tx1 - 0.35], tz1 + 0.12, 0, POD - 0.05, 0.4, 0.1, 0x6f523f);
  b.box(tx0 - 0.16, 0.3, tz0 + 0.8, tx0 - 0.12, POD - 0.3, tz1 - 0.8, GLASS, { faces: 'W', win: GLAZED });
  // the crown: a cornice, a lit band, and the plant behind a screen of metal
  b.box(tx0 - 0.25, TOP, tz0 - 0.25, tx1 + 0.25, TOP + 0.3, tz1 + 0.25, BROWN, { faces: 'NESWTB' });
  const sx0 = tx0 + 0.7, sx1 = tx1 - 0.7, sz0 = tz0 + 0.8, sz1 = tz1 - 0.8;
  b.box(sx0, TOP + 0.3, sz0, sx1, h - 0.5, sz0 + 0.15, SCREEN);
  b.box(sx0, TOP + 0.3, sz1 - 0.15, sx1, h - 0.5, sz1, SCREEN);
  b.box(sx0, TOP + 0.3, sz0 + 0.15, sx0 + 0.15, h - 0.5, sz1 - 0.15, SCREEN, { faces: 'EWT' });
  b.box(sx1 - 0.15, TOP + 0.3, sz0 + 0.15, sx1, h - 0.5, sz1 - 0.15, SCREEN, { faces: 'EWT' });
  b.box(sx0 + 0.5, TOP + 0.3, sz0 + 0.5, sx1 - 0.5, h - 0.8, sz1 - 0.5, PLANT, { faces: 'NESWT' });
  b.box(cx - 0.5, TOP + 0.3, sz0 + 0.3, cx + 0.5, h, sz0 + 1.2, BROWN, { faces: 'NESWT' });
  // upright fins on the screen's south and east faces
  for (let i = 1; i < 5; i++) b.box(sx0 + ((sx1 - sx0) * i) / 5 - 0.06, TOP + 0.3, sz1, sx0 + ((sx1 - sx0) * i) / 5 + 0.06, h - 0.35, sz1 + 0.18, 0xb9bec4, { faces: 'SEWT' });
  for (let i = 1; i < 4; i++) b.box(sx1, TOP + 0.3, sz0 + ((sz1 - sz0) * i) / 4 - 0.06, sx1 + 0.18, h - 0.35, sz0 + ((sz1 - sz0) * i) / 4 + 0.06, 0xb9bec4, { faces: 'ENST' });
  litBand(k, tx0 - 0.25, tz0 - 0.25, tx1 + 0.25, tz1 + 0.25, TOP + 0.15, '#ffe9c4');
  redLamp(k, tx1 - 0.2, tz0 + 0.2, TOP + 0.3);
  // the door to the flats, under a canopy
  b.box(cx - 1.4, POD - 0.25, tz1 + 0.12, cx + 1.4, POD - 0.1, tz1 + 1.0, BROWN, { faces: 'NESWTB' });
  paneS(k, cx - 0.6, cx + 0.6, tz1 + 0.16, 0.03, 2.1, 1.5, 0x2c3037);
  // the grocery: a low hall of brown brick against the east side, glazed along its south front
  const gx0 = tx1 + 0.12, gx1 = x1 - 0.1, gz0 = z0 + 0.8, gz1 = z1 - 0.1, GH = 4.2;
  b.box(gx0, 0, gz0, gx1, GH, gz1, BROWN, { faces: 'NESW' });
  b.box(gx0, GH, gz0, gx1, GH + 0.05, gz1, FELT, { faces: 'T' });
  b.box(gx0 - 0.05, GH - 0.4, gz0 - 0.05, gx1 + 0.05, GH + 0.35, gz1 + 0.05, TAN, { faces: 'NESWTB' });
  paneS(k, gx0 + 0.3, gx1 - 0.3, gz1, 0.4, 2.6, 1.3);
  b.box(gx0 + 0.1, 2.65, gz1, gx1 - 0.1, 2.8, gz1 + 0.9, 0x3c7a46, { faces: 'ESWTB' });
  b.box(gx1 + 0.05, 0.4, gz0 + 1.2, gx1 + 0.09, 2.6, gz1 - 1.4, GLASS, { faces: 'E', win: interior(1.0) });
  nameBoard(k, 'green-north-grocery', (gx0 + gx1) / 2, 3.25, gz1, 0, 1, 0.55, gx1 - gx0 - 0.6, 0x3c7a46);
  b.box(gx0 + 0.5, GH + 0.35, gz0 + 1, gx1 - 0.5, GH + 1.0, gz0 + 2.6, PLANT, { faces: 'NESWT' });
  // carts at the door, and people with their shopping
  b.box(gx1 - 1.1, 0, gz1 + 0.15, gx1 - 0.3, 0.9, gz1 + 0.9, 0xb9bcc0, { faces: 'NESWT' });
  const r = rng(3101);
  crowd(k, r, (gx0 + gx1) / 2, gz1 + 0.8, 3, 2.4, 0.6);
  crowd(k, r, cx, tz1 + 1.4, 2, 2, 0.5);
  k.lights.push({ x: cx + 2, z: z1 + 1.5, r: 10, color: '#ffe2ae', k: 0.5 });
}

/**
 * HERE Champaign: twenty-seven storeys of flats over a shop, 2015. White,
 * with panels of blue in a pattern of its own on every side, and a ground
 * floor of glass under the overhang.
 */
function here(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1, h } = l;
  const WS: WinSpec = { cell: 1.25, storey: 1.0, lit: 0.42, kind: 0 };
  const G = 3, TOP = 27 * WS.storey;
  const tx0 = x0 + 0.3, tx1 = x1 - 0.3, tz0 = z0 + 0.3, tz1 = z1 - 0.3, cx = (tx0 + tx1) / 2;
  const WHITE = 0xf1f1ee, BLUE = [0x2f5fa8, 0x7fa6d6, 0x4a7fc4, 0x9aa3ad];
  // the ground floor: the shop's glass, set in under the tower, and columns at the corners
  b.box(x0 + 1.0, 0, z0 + 1.0, x1 - 1.0, G, z1 - 1.0, GLASS, { win: { cell: 1.6, storey: G, lit: 0.8, kind: 1 }, seed: 0.4, faces: 'NESW' });
  for (const [x, z] of [[tx0 + 0.3, tz0 + 0.3], [tx1 - 0.3, tz0 + 0.3], [tx1 - 0.3, tz1 - 0.3], [tx0 + 0.3, tz1 - 0.3]]) b.box(x - 0.22, 0, z - 0.22, x + 0.22, G, z + 0.22, PRECAST, { faces: 'NESW' });
  // the tower, which overhangs the ground floor, its underside lit
  b.box(tx0, G, tz0, tx1, TOP, tz1, WHITE, { win: WS, seed: 0.37, faces: 'NESWTB', top: FELT });
  k.glows.push({ x: cx, y: G - 0.05, z: tz1 - 0.5, sx: tx1 - tx0 - 1.5, sy: 0.05, sz: 0.3, color: '#fff1d6' });
  // the shop's fascia, and what it sells
  b.box(tx0 + 0.6, G, tz1, tx1 - 0.6, G + 0.7, tz1 + 0.1, 0x1c1e23, { faces: 'SEWTB' });
  k.sign('green-north-ramen', cx - 1.2, G + 0.35, tz1 + 0.13, 0, 1, 0.55, 4);
  // the door to the flats, at the east end of the front
  paneS(k, x1 - 2.4, x1 - 1.4, z1 - 1.0, 0.03, 2.3, 1.6, 0x2c3037);
  // panels of blue, in a pattern up every side
  const r = rng(2203);
  const faces: { n: V3; len: number; count: number }[] = [
    { n: [0, 0, 1], len: tx1 - tx0, count: 34 }, { n: [1, 0, 0], len: tz1 - tz0, count: 30 },
    { n: [0, 0, -1], len: tx1 - tx0, count: 26 }, { n: [-1, 0, 0], len: tz1 - tz0, count: 26 },
  ];
  for (const f of faces) {
    const cells = Math.floor(f.len / WS.cell);
    // which cells of the face are taken, a row to each storey, so that no two panels overlap
    const taken = new Set<string>();
    for (let i = 0, placed = 0; i < f.count * 6 && placed < f.count; i++) {
      const c0 = Math.floor(r() * cells), wc = r() > 0.6 && c0 + 1 < cells ? 2 : 1, ya = 4 + Math.floor(r() * (TOP - 9)), hh = 2 + Math.floor(r() * 4);
      const keys: string[] = [];
      for (let c = c0; c < c0 + wc; c++) for (let y = ya; y < ya + hh; y++) keys.push(`${c},${y}`);
      if (keys.some((q) => taken.has(q))) continue;
      for (let c = c0; c < c0 + wc; c++) for (let y = ya; y < ya + hh; y++) taken.add(`${c},${y}`);
      placed++;
      const u0 = c0 * WS.cell + 0.05, u1 = Math.min(f.len, (c0 + wc) * WS.cell) - 0.05, d = 0.06;
      const col = BLUE[Math.floor(r() * BLUE.length)], y0 = ya, y1 = Math.min(TOP - 0.2, ya + hh);
      if (f.n[2] > 0) b.box(tx0 + u0, y0, tz1, tx0 + u1, y1, tz1 + d, col, { faces: 'S' });
      else if (f.n[2] < 0) b.box(tx1 - u1, y0, tz0 - d, tx1 - u0, y1, tz0, col, { faces: 'N' });
      else if (f.n[0] > 0) b.box(tx1, y0, tz1 - u1, tx1 + d, y1, tz1 - u0, col, { faces: 'E' });
      else b.box(tx0 - d, y0, tz0 + u0, tx0, y1, tz0 + u1, col, { faces: 'W' });
    }
  }
  // the crown: a white parapet with a band of light round it, the plant inside, and the red lamp
  for (const [a, c, e, f, s] of [
    [tx0, tz0, tx1, tz0 + 0.25, 'NESWT'], [tx0, tz1 - 0.25, tx1, tz1, 'NESWT'],
    [tx0, tz0 + 0.25, tx0 + 0.25, tz1 - 0.25, 'EWT'], [tx1 - 0.25, tz0 + 0.25, tx1, tz1 - 0.25, 'EWT'],
  ] as const) b.box(a, TOP, c, e, h, f, WHITE, { faces: s });
  b.box(tx0 + 1.4, TOP, tz0 + 1.6, tx1 - 2.4, h - 0.3, tz1 - 3.2, PLANT, { faces: 'NESWT' });
  b.box(tx1 - 2.0, TOP, tz1 - 2.6, tx1 - 0.8, h - 0.6, tz1 - 1.0, 0x7fa6d6, { faces: 'NESWT' });
  litBand(k, tx0, tz0, tx1, tz1, h - 0.45, '#d8e8ff');
  redLamp(k, tx1 - 0.15, tz0 + 0.15, h);
  // a white band round it where the floors of the pattern change, a third and two thirds of the way up
  for (const y of [12, 20]) b.box(tx0 - 0.1, y - 0.12, tz0 - 0.1, tx1 + 0.1, y + 0.08, tz1 + 0.1, WHITE, { faces: 'NESWTB' });
  // white fins up the corners, standing proud of the panels
  for (const [x, z] of [[tx0, tz0], [tx1, tz0], [tx1, tz1], [tx0, tz1]]) b.box(x - 0.22, G, z - 0.22, x + 0.22, h, z + 0.22, WHITE, { faces: 'NESW' });
  // the shop's glazing bars, and a canopy over the flats' door
  for (let i = 1; i < 5; i++) b.box(x0 + 1.0 + ((x1 - x0 - 2) * i) / 6 - 0.05, 0, z1 - 1.0, x0 + 1.0 + ((x1 - x0 - 2) * i) / 6 + 0.05, G, z1 - 0.94, FRAME, { faces: 'SEW' });
  b.box(x1 - 2.7, 2.45, z1 - 1.0, x1 - 1.1, 2.6, z1 - 0.1, 0x2f5fa8, { faces: 'NESWTB' });
  // two tables outside the ramen shop, under the overhang
  for (const x of [x0 + 1.6, x0 + 4.0]) {
    table(k, x, z1 - 0.5, 0x2c3037);
    k.person(x - 0.6, z1 - 0.3);
    k.person(x + 0.6, z1 - 0.55);
  }
  // a tank on the roof
  b.cyl(tx0 + 1.6, tz1 - 2.0, TOP, h - 0.35, 0.7, 0.7, 8, 0xc9ccd0, { cap: 0xa7abaf });
  // people at the shop, and at the flats' door
  crowd(k, r, cx - 1, z1 + 0.5, 4, 5, 0.5);
  k.person(x1 - 1.9, z1 - 0.3);
  k.lights.push({ x: cx, z: z1 + 1.2, r: 11, color: '#ffe9c4', k: 0.6 });
}

/** A tower of flats of the 2010s: a podium of brick with a tower of grey panels on it, balconies, and plant on its roof. */
function towerN(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1, h } = l;
  const TS: WinSpec = { cell: 1.35, storey: 1.45, lit: 0.42, kind: 0 };
  const TOP = 12 * TS.storey, PODIUM = 4 * TS.storey;
  const px0 = x0 + 0.2, px1 = x1 - 0.2, pz0 = z0 + 0.2, pz1 = z1 - 0.2;
  const tx0 = x0 + 1.2, tx1 = x1 - 1.2, tz0 = z0 + 1.0, tz1 = z1 - 1.2, cx = (tx0 + tx1) / 2;
  // the podium: two storeys of red brick, with a roof terrace round the tower
  b.box(px0, 0, pz0, px1, PODIUM, pz1, BRICK.red, { win: { ...TS, storey: PODIUM / 2 }, seed: 0.55, faces: 'NESW', top: 0x8d9a8a });
  b.box(px0 - 0.1, PODIUM - 0.1, pz0 - 0.1, px1 + 0.1, PODIUM + 0.2, pz1 + 0.1, PRECAST, { faces: 'NESWTB' });
  // the tower, and a strip of dark panels up its south-east corner
  b.box(tx0, PODIUM, tz0, tx1, TOP, tz1, 0xd5d0c4, { win: TS, seed: 0.91, faces: 'NESW' });
  b.box(tx1 - 1.5, PODIUM + 0.2, tz1, tx1 + 0.08, TOP, tz1 + 0.08, 0x5d6a78, { faces: 'SEW' });
  b.box(tx1, PODIUM + 0.2, tz1 - 1.5, tx1 + 0.08, TOP, tz1, 0x5d6a78, { faces: 'EN' });
  // balconies on the south and east faces, every other floor
  for (let f = 5; f < 12; f += 2) {
    const y = f * TS.storey;
    b.box(tx0 + 0.6, y - 0.12, tz1, tx0 + 2.4, y + 0.02, tz1 + 0.8, PRECAST, { faces: 'NESWTB' });
    b.box(tx0 + 0.6, y + 0.02, tz1 + 0.74, tx0 + 2.4, y + 0.75, tz1 + 0.8, 0xbfd3df, { faces: 'NSEW' });
    b.box(tx1, y - 0.12, tz0 + 0.6, tx1 + 0.8, y + 0.02, tz0 + 2.4, PRECAST, { faces: 'NESWTB' });
    b.box(tx1 + 0.74, y + 0.02, tz0 + 0.6, tx1 + 0.8, y + 0.75, tz0 + 2.4, 0xbfd3df, { faces: 'NSEW' });
  }
  // the crown: a parapet, plant behind it, and the red lamp
  b.box(tx0 - 0.15, TOP, tz0 - 0.15, tx1 + 0.15, TOP + 0.25, tz1 + 0.15, PRECAST, { faces: 'NESWTB', top: FELT });
  b.box(tx0, TOP + 0.25, tz0, tx1, h - 0.2, tz0 + 0.2, 0xd5d0c4);
  b.box(tx0, TOP + 0.25, tz1 - 0.2, tx1, h - 0.2, tz1, 0xd5d0c4);
  b.box(tx0, TOP + 0.25, tz0 + 0.2, tx0 + 0.2, h - 0.2, tz1 - 0.2, 0xd5d0c4, { faces: 'EWT' });
  b.box(tx1 - 0.2, TOP + 0.25, tz0 + 0.2, tx1, h - 0.2, tz1 - 0.2, 0xd5d0c4, { faces: 'EWT' });
  b.box(tx0 + 0.8, TOP + 0.25, tz0 + 0.8, tx1 - 2.0, h, tz0 + 2.6, PLANT, { faces: 'NESWT' });
  redLamp(k, tx1 - 0.1, tz0 + 0.1, h - 0.2);
  litBand(k, tx0 - 0.15, tz0 - 0.15, tx1 + 0.15, tz1 + 0.15, TOP + 0.12, '#ffe9c4');
  // the door, under a canopy, on the south
  b.box(cx - 1.3, 2.4, pz1, cx + 1.3, 2.55, pz1 + 0.9, PRECAST, { faces: 'NESWTB' });
  paneS(k, cx - 0.7, cx + 0.7, pz1, 0.03, 2.3, 1.5, 0x2c3037);
  k.person(cx + 1.2, pz1 + 0.8);
  k.lights.push({ x: cx, z: z1 + 1.2, r: 8, color: '#ffe2ae', k: 0.45 });
}

export const MODELS: Record<string, Model> = {
  terminal, kams, burnham, here, 'tower-n': towerN, 'shops-n1': shopsN1, 'shops-n2': shopsN2, legends, murphys,
};

// ---------------------------------------------------------------------------
// Extras: the buses at the terminal, and Boneyard Creek
// ---------------------------------------------------------------------------

/** One of the town's buses, standing still, its nose to the south: white, a block of blue on its roof, a band of black windows. */
function bus(k: Build, x: number, za: number, zb: number): void {
  const b = k.b, hw = 1.4, xa = x - hw, xb = x + hw;
  b.box(xa, 0.45, za, xb, 3.4, zb, BUS_WHITE, { faces: 'NESWT' });
  b.box(xa + 0.12, 0.15, za + 0.2, xb - 0.12, 0.45, zb - 0.2, 0x3a3d44, { faces: 'NESW' });
  // the band of windows along each side, the windscreen, and the back window
  b.box(xa - 0.03, 1.65, za + 0.6, xb + 0.03, 2.85, zb - 1.3, BLACK, { faces: 'EW' });
  b.box(xa + 0.15, 1.15, zb, xb - 0.15, 2.95, zb + 0.03, BLACK, { faces: 'S' });
  b.box(xa + 0.3, 1.9, za - 0.03, xb - 0.3, 2.8, za, BLACK, { faces: 'N' });
  // the door, on its right-hand side, by the driver
  b.box(xb, 0.5, zb - 1.25, xb + 0.04, 2.85, zb - 0.35, BLACK, { faces: 'E' });
  // the block of blue at the front of the roof
  b.box(xa + 0.12, 3.4, zb - 3.0, xb - 0.12, 3.72, zb - 0.15, BUS_BLUE, { faces: 'NESWT' });
  // its wheels
  for (const z of [za + 1.8, zb - 1.7]) b.box(xa - 0.05, 0, z - 0.5, xb + 0.05, 0.95, z + 0.5, TYRE, { faces: 'EW' });
  // headlights, and the lit sign over the windscreen
  for (const s of [-1, 1]) k.glows.push({ x: x + s * 1.0, y: 0.8, z: zb + 0.05, sx: 0.32, sy: 0.16, sz: 0.06, color: '#fff6dc' });
  k.glows.push({ x, y: 3.12, z: zb + 0.05, sx: 2.0, sy: 0.22, sz: 0.06, color: '#ffb84a' });
}

export function extras(k: Build): void {
  const b = k.b;
  const creek = AREAS.find((a) => a.id === 'boneyard');

  // --- the buses, in two bays on the paving south of the creek, between the terminal and First Street ---
  {
    const za = -99.7, zb = za + 9.6;
    bus(k, -93.2, za, zb);
    bus(k, -89.2, za, zb);
    // the lines of the bays, and a kerb between them
    for (const x of [-95.0, -91.2, -87.2]) area(k, rect(x - 0.07, za - 0.2, x + 0.07, zb + 0.1), 0xf0efe8, 0.04);
    // a shelter on the east side of the bays, open to the west, and people waiting in it
    const sx0 = -86.6, sx1 = -85.2, s0 = za + 2, s1 = za + 7;
    b.box(sx0 - 0.15, 2.55, s0 - 0.15, sx1 + 0.15, 2.75, s1 + 0.15, 0x4a4f57, { faces: 'NESWTB' });
    b.box(sx1 - 0.06, 0.3, s0, sx1, 2.55, s1, GLASS, { faces: 'EW', win: interior(0.6) });
    for (const z of [s0, s1]) b.box(sx1 - 0.12, 0, z - 0.06, sx1, 2.55, z + 0.06, 0x4a4f57, { faces: 'NESW' });
    b.box(sx1 - 0.6, 0.45, s0 + 0.6, sx1 - 0.1, 0.55, s1 - 0.6, 0x8d6b4a, { faces: 'NESWTB' });
    k.glows.push({ x: (sx0 + sx1) / 2, y: 2.5, z: (s0 + s1) / 2, sx: 0.12, sy: 0.05, sz: 3.6, color: '#fff1d6' });
    const r = rng(7713);
    crowd(k, r, sx0 + 0.2, (s0 + s1) / 2, 5, 0.6, 4);
    // someone getting on each bus
    k.person(-93.2 + 1.85, zb - 0.8);
    k.person(-89.2 + 1.85, zb - 0.6);
    k.lights.push({ x: -89, z: za + 5, r: 12, color: '#ffe9c4', k: 0.5 });
  }

  // --- Boneyard Creek: low stone edges, and three footbridges ---
  if (creek) {
    const xa = -95, xb = 5;
    for (const [z0, z1] of [[creek.z0 - 0.3, creek.z0 + 0.05], [creek.z1 - 0.05, creek.z1 + 0.3]]) b.box(xa, 0, z0, xb, 0.35, z1, STONE);
    // a stone or two in the water
    const r = rng(4402);
    for (let i = 0; i < 4; i++) {
      const x = xa + 6 + i * 24 + r() * 10, z = creek.z0 + 0.8 + r() * 1.4;
      b.box(x - 0.35, 0, z - 0.25, x + 0.35, 0.22, z + 0.25, 0x8f8a80);
    }
    // the bridges: a low arch of concrete with a wall either side, from bank to bank
    const n0 = creek.z0 - 0.75, s1 = creek.z1 + 0.75, mz = (n0 + s1) / 2;
    for (const x of [-88, -57.5, -26.5]) {
      slab(b, [x, 0.36, n0], [x, 0.72, mz], 0.9, 0.3, PRECAST);
      slab(b, [x, 0.72, mz], [x, 0.36, s1], 0.9, 0.3, PRECAST);
      for (const s of [-1, 1]) {
        const wx = x + s * 0.83;
        slab(b, [wx, 1.2, n0], [wx, 1.56, mz], 0.07, 0.86, 0xcfc8b8);
        slab(b, [wx, 1.56, mz], [wx, 1.2, s1], 0.07, 0.86, 0xcfc8b8);
      }
    }
    k.person(-57.5, mz + 0.4, 0.72);
    k.person(-26.5 + 0.3, mz - 1.0, 0.6);
  }
}
