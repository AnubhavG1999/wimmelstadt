// Game day: Gies Memorial Stadium, State Farm Center, the deck at Fourth and
// Pennsylvania, Illinois Field, the tailgate in Grange Grove and the practice
// fields.
//
// The stadium (Holabird & Roche, 1923) is two long stands of red brick and
// limestone on the east and west sides of the field, each with an upper deck
// above and behind the lower, a stair tower of brick at each end, and along the
// outside at the top a colonnade of limestone columns under a plain
// entablature. The columns are a memorial: each carries the name of one of the
// university's dead of the First World War. They are drawn plainly, with no
// lettering, and nothing stands against them or hangs on them. A low stand
// closes the north end, the horseshoe the south end, and over that the video
// board stands on its frame: its two faces are left blank for the screen.
//
// State Farm Center (Max Abramovitz, 1963) is a white concrete saucer: a
// shallow dome of folded plates on a bowl that flares out as it rises, with a
// band of glass round its foot. It carries no name.

import { interior, rng, type GeoBuilder, type V3 } from '../../engine/geo';
import { figure, tri, type Dress } from '../../engine/parts';
import { slope3 } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { BRICK, DARK, GLASS, LIMESTONE, NAVY, ORANGE, TRIM } from './look';
import { AREAS, lot as lotOf, type LotDef, type Model, type PartDef } from './plan';

// --- colours of this file's own (look.ts lacks them) ---

/** Concrete: of the stands' steps and walls, of the deck, and of the saucer. */
const CONCRETE = 0xb9b4aa, CONCRETE_DARK = 0x8f8c86, SAUCER = 0xeeebe3, SAUCER_SHADE = 0xd6d1c5;
/** The grey of the aluminium benches, the stadium's limestone made a little lighter (thin columns come out dark), and turf. */
const BENCH = 0xc4c6c8, COLUMN_STONE = 0xebe6d8, TURF = 0x4f9445, TURF_STRIPE = 0x5aa24e, CHALK = 0xf7f7f2;
/** The goal posts' yellow, the infield's dirt, the frames' steel, and the colours of a few cars. */
const POST_YELLOW = 0xf2d23a, DIRT = 0xb07a4c, STEEL = 0x8a9099;
const CAR_SHADES = [0x2a2e36, 0x3b4048, 0x22252b, 0x4a3a3a, 0x33404c];

/** A patch of ground from plan.ts. */
const areaOf = (id: string): { x0: number; z0: number; x1: number; z1: number } => {
  const a = AREAS.find((q) => q.id === id);
  if (!a) throw new Error(`There is no area called ${id}.`);
  return a;
};
const partOf = (l: LotDef, id: string): PartDef => {
  const p = l.parts?.find((q) => q.id === id);
  if (!p) throw new Error(`${l.id} has no part called ${id}.`);
  return p;
};

/** A level quad on the ground or a roof, facing the sky. */
function paint(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, color: number): void {
  b.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], color);
}

/**
 * A tall opening with a round head, on a wall that faces (nx, nz): dark, and
 * lit from within at night. (x, z) is the middle of its foot, on the wall's face.
 */
function arch(b: GeoBuilder, x: number, z: number, nx: number, nz: number, y0: number, y1: number, w: number, lit = 0.6): void {
  const r = w / 2, yc = y1 - r, tx = -nz, tz = nx, off = 0.04;
  const P = (a: number, y: number): V3 => [x + tx * a + nx * off, y, z + tz * a + nz * off];
  const n: V3 = [nx, 0, nz];
  const o = { win: interior(lit) };
  b.quad(P(-r, y0), P(r, y0), P(r, yc), P(-r, yc), n, DARK, o);
  const seg = 5;
  for (let i = 0; i < seg; i++) {
    const a0 = (Math.PI * i) / seg, a1 = (Math.PI * (i + 1)) / seg;
    tri(b, P(0, yc), P(Math.cos(a0) * r, yc + Math.sin(a0) * r), P(Math.cos(a1) * r, yc + Math.sin(a1) * r), n, DARK, o);
  }
}

/**
 * Rows of seats, in a frame where they face -x: the front of row i is at
 * u0 + i × w and its top at ys[i], and each row reaches back under the next.
 * The last reaches back to `back`. Each row is a box from `yb` up, with its
 * front, its top and whichever ends are asked for.
 */
function rows(b: GeoBuilder, u0: number, w: number, ys: number[], back: number, za: number, zb: number, ends: string, yb = 0, riser = CONCRETE_DARK, tread = BENCH): void {
  ys.forEach((y, i) => {
    const uf = u0 + i * w, ub = i === ys.length - 1 ? back : uf + w;
    b.box(uf, yb, za, ub, y, zb, riser, { faces: 'WT' + ends, top: tread });
  });
}

/** The height of each of n rows, evenly from the first to the last. */
const rise = (n: number, first: number, last: number): number[] => Array.from({ length: n }, (_, i) => first + ((last - first) * i) / Math.max(1, n - 1));

// ---------------------------------------------------------------------------
// Gies Memorial Stadium
// ---------------------------------------------------------------------------

export const SIGNS: SignDef[] = [
  { id: 'stadium-name', lines: ['GIES MEMORIAL STADIUM'], color: '#f3f0e7', ink: '#13294b', aspect: 12.6, kind: 'board', real: true, size: [656, 52] },
  { id: 'stadium-field-name', lines: ['ILLINOIS FIELD'], color: '#f3f0e7', ink: '#13294b', aspect: 8.4, kind: 'board', real: true, size: [437, 52] },
  { id: 'stadium-p', lines: ['P'], color: '#ffffff', aspect: 1, kind: 'p', size: [52, 52] },
];

/** The two teams on the field: the home side in orange, the guests in white. */
const HOME: Dress = { coat: ORANGE, legs: 0xf3f1ea, hat: NAVY, hatH: 0.42, hatR: 0.34 };
const GUESTS: Dress = { coat: 0xf6f6f2, legs: 0xf6f6f2, hat: 0x8a1f2b, hatH: 0.42, hatR: 0.34 };

function stadium(k: Build, l: LotDef): void {
  const b = k.b;
  const field = areaOf('football-field');
  const west = partOf(l, 'stadium-west'), east = partOf(l, 'stadium-east');
  const north = partOf(l, 'stadium-north'), south = partOf(l, 'stadium-south');
  const press = partOf(l, 'stadium-press'), board = partOf(l, 'stadium-board');
  const rand = rng(1923);

  // -------------------------------------------------------------------------
  // The apron: what shows of it is the four corners, where the gates are
  // -------------------------------------------------------------------------
  const AP = l.h;
  b.box(l.x0, 0, l.z0, west.x1, AP, west.z0, LIMESTONE, { faces: 'NWT' });
  b.box(east.x0, 0, l.z0, l.x1, AP, east.z0, LIMESTONE, { faces: 'NET' });
  b.box(l.x0, 0, west.z1, south.x0, AP, l.z1 - 0.15, LIMESTONE, { faces: 'SWT' });
  b.box(south.x1, 0, east.z1, l.x1, AP, l.z1 - 0.15, LIMESTONE, { faces: 'SET' });
  for (const [x, z] of [[l.x0 + 2.5, l.z0 + 0.9], [l.x0 + 5.5, l.z0 + 1.3], [l.x1 - 2.5, l.z0 + 0.9], [l.x1 - 4.6, l.z0 + 1.2], [l.x0 + 0.9, l.z1 - 0.9], [l.x1 - 0.9, l.z1 - 0.9]]) k.person(x, z, AP);

  // -------------------------------------------------------------------------
  // The two side stands, each built in a frame of its own: u runs from the
  // field's edge outwards, and along the stand from one end to the other.
  // -------------------------------------------------------------------------

  /** The stand on one side: `p` its part, `out` 1 if it lies east of the field and -1 if west. */
  const side = (p: PartDef, out: 1 | -1, seed: number): void => {
    const D = p.x1 - p.x0, H = p.h, L = p.z1 - p.z0, half = L / 2, zc = (p.z0 + p.z1) / 2;
    const xf = out > 0 ? p.x0 : p.x1;
    const u = (v: number): number => (v * D) / 9, y = (v: number): number => (v * H) / 14;
    /** From the frame to the world. */
    const W = (uu: number, lz: number): [number, number] => [xf + out * uu, zc + out * lz];
    const za = -half, zb = half, TW = 2.3; // the stair towers' width along the stand
    const lower = rise(7, y(1.5), y(5.0));

    b.moved(xf, 0, zc, out > 0 ? 0 : Math.PI, () => {
      // the lower tier: from the wall at the field's edge up to the concourse
      rows(b, 0, u(0.62), lower, u(6.5), za, zb, 'NS');
      // the concourse under the upper deck: its back wall, lit, and the deck's underside over it
      b.quad([u(6.5), y(5.0), zb], [u(6.5), y(5.0), za], [u(6.5), y(6.4), za], [u(6.5), y(6.4), zb], [-1, 0, 0], 0x3a3d44, { win: interior(0.7) });
      b.quad([u(4.25), y(6.4), za], [u(6.5), y(6.4), za], [u(6.5), y(6.4), zb], [u(4.25), y(6.4), zb], [0, -1, 0], CONCRETE);
      // the ends closed below the upper deck
      for (const [z, nz] of [[za, -1], [zb, 1]] as const) {
        b.quad([u(6.5), 0, z], [u(8.15), 0, z], [u(8.15), y(6.4), z], [u(6.5), y(6.4), z], [0, 0, nz], CONCRETE_DARK);
        b.quad([u(4.25), y(5.0), z], [u(6.5), y(5.0), z], [u(6.5), y(6.4), z], [u(4.25), y(6.4), z], [0, 0, nz], CONCRETE_DARK);
      }
      // the upper deck: the band along its front, lit at night, and its rows up to the colonnade
      b.box(u(4.2), y(6.35), za, u(4.3), y(7.45), zb, NAVY, { faces: 'WNSB', win: interior(0.9) });
      rows(b, u(4.3), u(0.53), rise(7, y(7.4), y(12.9)), u(8.15), za, zb, 'NS', y(6.4));

      // the outside: a base of brick with tall arched openings, a limestone ledge, and the colonnade on it
      const c0 = za + TW, c1 = zb - TW, ledge = y(6.2), top = y(12.8);
      b.box(u(8.3), 0, c0, u(9), ledge, c1, BRICK.red, { faces: 'E' });
      const gates = 7;
      for (let i = 0; i < gates; i++) arch(b, u(9), c0 + ((i + 0.5) * (c1 - c0)) / gates, 1, 0, 0, y(4.6), 1.0, 0.55);
      b.box(u(8.2), ledge, c0, u(9.1), ledge + 0.3, c1, LIMESTONE, { faces: 'ETB' });
      // the back of the colonnade, softly lit at night, so that the columns stand against it
      b.quad([u(8.3), ledge + 0.3, zb], [u(8.3), ledge + 0.3, za], [u(8.3), top, za], [u(8.3), top, zb], [1, 0, 0], 0x5e342b, { win: interior(0.45) });
      // the columns: plain, round, evenly spaced, each on a plain base under a plain capital
      const n = Math.round((c1 - c0) / 0.66), step = (c1 - c0) / n, cu = u(8.72), r = 0.16;
      for (let i = 0; i < n; i++) {
        const cz = c0 + (i + 0.5) * step;
        b.box(cu - 0.25, ledge + 0.3, cz - 0.25, cu + 0.25, ledge + 0.5, cz + 0.25, COLUMN_STONE, { faces: 'NESWT' });
        b.cyl(cu, cz, ledge + 0.5, top - 0.22, r, r * 0.9, 6, COLUMN_STONE, { cap: false });
        b.box(cu - 0.26, top - 0.22, cz - 0.26, cu + 0.26, top, cz + 0.26, COLUMN_STONE, { faces: 'NESW' });
      }
      // the entablature: an architrave and a frieze, then a cornice, each with its underside
      b.box(u(8.05), top, za + TW - 0.05, u(9.08), y(13.55), zb - TW + 0.05, LIMESTONE, { faces: 'EWB' });
      b.box(u(8.0), y(13.55), za, u(9.18), H, zb, TRIM, { faces: 'EWTBNS' });

      // the stair towers at the two ends: brick, with a tall arched window on each outer face and a door
      for (const [t0, t1, nz] of [[za - 0.1, za + TW, -1], [zb - TW, zb + 0.1, 1]] as const) {
        const tc = (t0 + t1) / 2, tu0 = u(7.2), tu1 = u(9) + 0.15, ty = H + 0.2;
        b.box(tu0, 0, t0, tu1, ty, t1, BRICK.red, { faces: 'NESW' });
        b.box(tu0 - 0.1, ty, t0 - 0.1, tu1 + 0.1, ty + 0.25, t1 + 0.1, LIMESTONE, { faces: 'NESWTB' });
        b.box(tu0 - 0.06, ledge, t0 - 0.06, tu1 + 0.06, ledge + 0.3, t1 + 0.06, LIMESTONE, { faces: 'NESWTB' });
        arch(b, tu1, tc, 1, 0, y(7.4), y(12.2), 0.95, 0.5);
        arch(b, tu1, tc, 1, 0, 0, 2.7, 1.2, 0.8);
        arch(b, (tu0 + tu1) / 2, nz < 0 ? t0 : t1, 0, nz, y(7.4), y(12.2), 0.95, 0.5);
        arch(b, (tu0 + tu1) / 2, nz < 0 ? t0 : t1, 0, nz, 0, 2.7, 1.1, 0.8);
      }
    });

    // the crowd: thickest in the lower tier
    const pr = rng(seed);
    // (none on the last row of the lower tier, which runs on under the upper deck)
    lower.slice(0, -1).forEach((yy, i) => {
      const uu = u(0.62) * (i + 0.55);
      for (let j = 0; j < 13; j++) {
        const lz = za + 0.6 + pr() * (L - 1.2);
        const [x, z] = W(uu, lz);
        k.person(x, z, yy);
      }
    });
    rise(7, y(7.4), y(12.9)).forEach((yy, i) => {
      const uu = u(4.3) + u(0.53) * (i + 0.4);
      for (let j = 0; j < 5; j++) {
        const lz = za + 0.6 + pr() * (L - 1.2);
        const [x, z] = W(uu, lz);
        // (nobody under the press box who would stand up into it)
        if (out < 0 && yy + 2.6 > p.h && z > press.z0 - 0.5 && z < press.z1 + 0.5 && x < press.x1 + 0.5) continue;
        k.person(x, z, yy);
      }
    });
    // the lights along the top, and a lamp at the foot of each tower's door
    for (let i = 0; i < 4; i++) {
      const [x, z] = W(u(8.6), za + ((i + 0.5) * L) / 4);
      if (out > 0) k.glows.push({ x, y: H + 0.25, z, sx: 0.5, sy: 0.35, sz: 1.6, color: '#fff4dc' });
    }
    for (const lz of [za + TW / 2, zb - TW / 2]) {
      const [x, z] = W(u(9) + 0.6, lz);
      k.lights.push({ x, z, r: 8, color: '#ffe2ae', k: 0.45 });
    }
  };
  side(west, -1, 11);
  side(east, 1, 12);

  // -------------------------------------------------------------------------
  // The press box on the west stand: glass towards the field, on posts at its front
  // -------------------------------------------------------------------------
  {
    const y0 = west.h + 0.1, y1 = press.h - 0.3;
    b.box(press.x0 + 0.05, y0, press.z0, press.x1, y1, press.z1, 0xd9d6cf, { faces: 'NSWB' });
    b.box(press.x1 - 0.25, y0, press.z0 + 0.15, press.x1 - 0.2, y1 - 0.15, press.z1 - 0.15, GLASS, { faces: 'E', win: interior(1.0) });
    // the front: a frame round two long bands of glass
    b.box(press.x1 - 0.2, y0, press.z0, press.x1, y0 + 0.35, press.z1, 0xd9d6cf, { faces: 'ETB' });
    b.box(press.x1 - 0.2, (y0 + y1) / 2 - 0.1, press.z0, press.x1, (y0 + y1) / 2 + 0.1, press.z1, 0xd9d6cf, { faces: 'ETB' });
    b.box(press.x1 - 0.2, y1 - 0.25, press.z0, press.x1, y1, press.z1, 0xd9d6cf, { faces: 'EB' });
    b.box(press.x0 - 0.05, y1, press.z0 - 0.1, press.x1 + 0.15, press.h, press.z1 + 0.1, TRIM, { faces: 'NESWTB', top: 0x9d9a94 });
    // a band of windows on its back, over the colonnade
    b.box(press.x0 + 0.02, y0 + 1.0, press.z0 + 0.6, press.x0 + 0.05, y0 + 1.9, press.z1 - 0.6, GLASS, { faces: 'W', win: interior(0.7) });
    for (const z of [press.z0 + 0.5, (press.z0 + press.z1) / 2, press.z1 - 0.5]) b.box(press.x1 - 0.6, 8.0, z - 0.15, press.x1 - 0.3, y0, z + 0.15, 0xd9d6cf, { faces: 'NESW' });
    // the lights on its roof
    for (let i = 0; i < 4; i++) k.glows.push({ x: press.x1 - 0.4, y: press.h + 0.25, z: press.z0 + ((i + 0.5) * (press.z1 - press.z0)) / 4, sx: 0.5, sy: 0.35, sz: 1.6, color: '#fff4dc' });
  }

  // -------------------------------------------------------------------------
  // The north end: a low stand of a few rows, with a brick back
  // -------------------------------------------------------------------------
  {
    const cx = (north.x0 + north.x1) / 2, half = (north.x1 - north.x0) / 2, D = north.z1 - north.z0;
    // (its ends show only north of the side stands)
    const show = west.z0 - north.z0;
    b.moved(cx, 0, north.z1, -Math.PI / 2, () => {
      const ys = rise(4, 2.0, north.h - 1.0);
      ys.forEach((yy, i) => {
        const w = (D - 0.3) / 4, uf = i * w, ub = i === 3 ? D - 0.3 : uf + w;
        b.box(uf, 0, -half, ub, yy, half, CONCRETE_DARK, { faces: 'WT', top: BENCH });
        // its ends, as far as they show
        const a = Math.max(uf, D - show), c = ub;
        if (c > a) {
          for (const [z, nz] of [[-half, -1], [half, 1]] as const) b.quad([a, 0, z], [c, 0, z], [c, yy, z], [a, yy, z], [0, 0, nz], CONCRETE_DARK);
        }
      });
      b.box(D - 0.3, 0, -half, D, north.h, half, BRICK.red, { faces: 'NESWT', top: LIMESTONE });
      for (let i = 0; i < 4; i++) arch(b, D, -half + ((i + 0.5) * 2 * half) / 4, 1, 0, 0, 3.2, 1.0, 0.6);
    });
    rise(4, 2.0, north.h - 1.0).forEach((yy, i) => {
      for (let j = 0; j < 4; j++) k.person(north.x0 + 0.8 + rand() * (north.x1 - north.x0 - 1.6), north.z1 - ((D - 0.3) / 4) * (i + 0.5), yy);
    });
  }

  // -------------------------------------------------------------------------
  // The south end: the horseshoe, rising to a brick back with arches and the name over them
  // -------------------------------------------------------------------------
  const back = l.z1 - 0.15; // (its back wall stands a hair inside the lot, which ends at the sidewalk)
  {
    const ys = rise(5, 2.4, south.h - 1.4), front = field.z1, w = (back - 0.3 - front) / 5;
    // the middle, behind the end zone
    b.moved(0, 0, 0, Math.PI / 2, () => {
      // (in this frame u is z and the stand runs along -x)
      ys.forEach((yy, i) => {
        const uf = front + i * w, ub = i === 4 ? back - 0.3 : uf + w;
        b.box(uf, 0, -field.x1, ub, yy, -field.x0, CONCRETE_DARK, { faces: 'WT', top: BENCH });
      });
    });
    // the two corners, which run on behind the side stands' ends
    for (const [x0, x1] of [[south.x0, field.x0], [field.x1, south.x1]]) {
      ys.forEach((yy, i) => {
        const zf = Math.max(west.z1, front + i * w), zb = i === 4 ? back - 0.3 : front + (i + 1) * w;
        if (zb - zf < 0.2) return;
        b.box(x0, 0, zf, x1, yy, zb, CONCRETE_DARK, { faces: (zf === west.z1 ? '' : 'N') + 'T' + (x0 === south.x0 ? 'W' : 'E'), top: BENCH });
      });
    }
    // the back wall
    b.box(south.x0, 0, back - 0.3, south.x1, south.h, back, BRICK.red, { faces: 'NESW' });
    b.box(south.x0 - 0.06, south.h - 0.35, back - 0.36, south.x1 + 0.06, south.h, back + 0.04, LIMESTONE, { faces: 'NESWTB' });
    // a band of limestone over the arches
    b.box(south.x0 - 0.03, 4.75, back, south.x1 + 0.03, 5.0, back + 0.05, LIMESTONE, { faces: 'SEWTB' });
    const n = 8;
    for (let i = 0; i < n; i++) {
      const x = south.x0 + ((i + 0.5) * (south.x1 - south.x0)) / n;
      arch(b, x, back, 0, 1, 0, 4.4, 1.15, 0.6);
    }
    // its name, on a plain board above the arches
    const cx = (south.x0 + south.x1) / 2;
    b.box(cx - 5.4, 5.35, back, cx + 5.4, 6.45, back + 0.06, 0xd8d3c6, { faces: 'SEWTB' });
    k.sign('stadium-name', cx, 5.9, back + 0.09, 0, 1, 0.82, 10.4);
    ys.forEach((yy, i) => {
      for (let j = 0; j < 5; j++) k.person(field.x0 + 0.6 + rand() * (field.x1 - field.x0 - 1.2), front + w * (i + 0.5), yy);
    });
    k.lights.push({ x: cx - 7, z: back + 2, r: 10, color: '#ffe2ae', k: 0.5 });
    k.lights.push({ x: cx + 7, z: back + 2, r: 10, color: '#ffe2ae', k: 0.5 });
  }

  // -------------------------------------------------------------------------
  // The video board on its frame: a dark box with a bottom, its two faces left blank for the screen
  // -------------------------------------------------------------------------
  {
    const { x0, x1, z0, z1 } = board, y0 = board.y0 ?? 9.5, zc = (z0 + z1) / 2;
    b.box(x0, y0, z0, x1, board.h, z1, 0x1b1d22, { faces: 'NESWTB' });
    // two masts of steel, one at each end, and a girder under the board between them
    for (const x of [x0 - 0.5, x1 + 0.1]) b.box(x, 0, zc - 0.35, x + 0.4, board.h, zc + 0.35, STEEL, { faces: 'NESWT' });
    b.box(x0 - 0.1, y0 - 0.55, zc - 0.25, x1 + 0.1, y0 - 0.1, zc + 0.25, STEEL, { faces: 'NESWTB' });
  }

  // -------------------------------------------------------------------------
  // The field: turf, the end zones in plain orange, the lines, the goal posts, and the two teams
  // -------------------------------------------------------------------------
  {
    const cx = (field.x0 + field.x1) / 2, cz = (field.z0 + field.z1) / 2;
    const Lf = field.z1 - field.z0 - 2, yd = Lf / 120, hw = (53.3 * yd) / 2;
    const n0 = cz - Lf / 2, s0 = cz + Lf / 2, g0 = n0 + 10 * yd, g1 = s0 - 10 * yd;
    paint(b, cx - hw, g0, cx + hw, g1, 0.035, TURF);
    for (let i = 0; i < 10; i += 2) paint(b, cx - hw, g0 + i * 10 * yd, cx + hw, g0 + (i + 1) * 10 * yd, 0.04, TURF_STRIPE);
    paint(b, cx - hw, n0, cx + hw, g0, 0.04, ORANGE);
    paint(b, cx - hw, g1, cx + hw, s0, 0.04, ORANGE);
    const t = 0.08;
    paint(b, cx - hw - t, n0 - t, cx - hw, s0 + t, 0.05, CHALK);
    paint(b, cx + hw, n0 - t, cx + hw + t, s0 + t, 0.05, CHALK);
    paint(b, cx - hw, n0 - t, cx + hw, n0, 0.05, CHALK);
    paint(b, cx - hw, s0, cx + hw, s0 + t, 0.05, CHALK);
    for (let i = 0; i <= 10; i++) {
      const z = g0 + i * 10 * yd;
      paint(b, cx - hw, z - t / 2, cx + hw, z + t / 2, 0.05, CHALK);
    }
    // the goal posts: one post, set back, a crossbar and two uprights, in yellow
    for (const [z, s] of [[n0, -1], [s0, 1]] as const) {
      const zp = z + s * 0.35;
      b.cyl(cx, zp, 0, 1.3, 0.09, 0.09, 4, POST_YELLOW, { cap: false });
      b.beam([cx, 1.3, zp], [cx, 1.3, z], 0.07, 0.07, POST_YELLOW);
      b.beam([cx - 0.7, 1.3, z], [cx + 0.7, 1.3, z], 0.06, 0.06, POST_YELLOW);
      for (const x of [cx - 0.7, cx + 0.7]) b.cyl(x, z, 1.24, 3.7, 0.06, 0.05, 4, POST_YELLOW, { cap: false });
    }
    // the teams, lined up on the guests' side of the field: the home side going north
    const los = cz + 15 * yd;
    for (let i = -2; i <= 2; i++) figure(b, cx + i * 0.86, los + 0.45, 0.035, HOME);
    figure(b, cx, los + 1.7, 0.035, HOME);
    figure(b, cx - 1.1, los + 2.8, 0.035, HOME);
    for (const d of [-1.72, -0.43, 0.43, 1.72]) figure(b, cx + d, los - 0.45, 0.035, GUESTS);
    for (const d of [-2.6, 0, 2.6]) figure(b, cx + d, los - 2.2, 0.035, GUESTS);
    // and the rest of each team on its sideline
    for (let i = 0; i < 6; i++) k.person(cx - hw - 1.3 - (i % 2) * 0.7, cz - 3 + i * 1.2, 0.02);
    for (let i = 0; i < 6; i++) k.person(cx + hw + 1.3 + (i % 2) * 0.7, cz - 3 + i * 1.2, 0.02);
    // light on the field at night
    k.lights.push({ x: cx, z: cz - 5, r: 13, color: '#fff4dc', k: 0.6 });
    k.lights.push({ x: cx, z: cz + 5, r: 13, color: '#fff4dc', k: 0.6 });
  }
}

// ---------------------------------------------------------------------------
// State Farm Center: the saucer
// ---------------------------------------------------------------------------

function saucer(k: Build, l: LotDef): void {
  const b = k.b;
  const cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, R = Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2;
  const dome = l.parts?.find((p) => p.id === 'saucer-dome');
  const top = dome?.h ?? l.h + 2.5;
  const N = 24, M = 2 * N;
  const at = (i: number, r: number, y: number): V3 => {
    const a = (i / M) * Math.PI * 2;
    return [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
  };

  // the band of glass round its foot, lit at night
  const glassTop = l.h * 0.22, rGlass = R * 0.8, rG = rGlass * 0.93;
  b.cyl(cx, cz, 0, glassTop, rG, rG, N, GLASS, { cap: false, win: interior(1.0) });
  b.cyl(cx, cz, 0, 0.12, rG + 0.15, rG + 0.15, N, CONCRETE, { cap: false });
  /** A ring that faces down, at height y, between two radii: under the bowl, and under the rim. */
  const soffit = (y: number, r0: number, r1: number, color: number): void => {
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
      const P = (a: number, r: number): V3 => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
      b.quad(P(a0, r0), P(a1, r0), P(a1, r1), P(a0, r1), [0, -1, 0], color);
    }
  };
  soffit(glassTop, rG * 0.95, rGlass, SAUCER_SHADE);
  // the bowl, flaring out as it rises: folded plates, a ridge and a fold by turns
  const ring0 = l.h * 0.8, rBowl = R * 0.95;
  for (let i = 0; i < M; i++) {
    const f0 = i % 2 ? 0.95 : 1, f1 = (i + 1) % 2 ? 0.95 : 1;
    const A = at(i, rGlass * f0, glassTop), B = at(i + 1, rGlass * f1, glassTop), C = at(i + 1, rBowl * f1, ring0), D = at(i, rBowl * f0, ring0);
    const e: V3 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], g: V3 = [D[0] - A[0], D[1] - A[1], D[2] - A[2]];
    let n: V3 = [e[1] * g[2] - e[2] * g[1], e[2] * g[0] - e[0] * g[2], e[0] * g[1] - e[1] * g[0]];
    const mx = (A[0] + B[0]) / 2 - cx, mz = (A[2] + B[2]) / 2 - cz;
    if (n[0] * mx + n[2] * mz < 0) n = [-n[0], -n[1], -n[2]];
    const nl = Math.hypot(n[0], n[1], n[2]) || 1;
    b.quad(A, B, C, D, [n[0] / nl, n[1] / nl, n[2] / nl], i % 2 ? SAUCER_SHADE : SAUCER);
  }
  // the ring the dome sits on: it overhangs the bowl all round, and is seen from below
  const ring1 = l.h - 0.05;
  b.cyl(cx, cz, ring0, ring1, R, R, N, 0xf4f2ec, { phase: 0 });
  soffit(ring0, rBowl * 0.9, R, SAUCER_SHADE);
  // the dome: shallow, of 24 folded plates that meet at the crown
  const domeRise = top - ring1;
  const prof: [number, number, number][] = [
    // radius, height, how far a ridge stands above its fold
    [R * 0.97, ring1, 0],
    [R * 0.84, ring1 + domeRise * 0.34, 0.34],
    [R * 0.62, ring1 + domeRise * 0.66, 0.3],
    [R * 0.32, ring1 + domeRise * 0.9, 0.15],
  ];
  const pt = (i: number, j: number): V3 => {
    const [r, y, f] = prof[j];
    return at(i, r, y + (i % 2 ? 0 : f));
  };
  for (let j = 0; j + 1 < prof.length; j++) {
    for (let i = 0; i < M; i++) {
      const color = i % 2 ? SAUCER_SHADE : SAUCER;
      slope3(b, pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), color);
      slope3(b, pt(i, j), pt(i + 1, j + 1), pt(i, j + 1), color);
    }
  }
  const crown: V3 = [cx, top, cz];
  for (let i = 0; i < M; i++) slope3(b, pt(i, prof.length - 1), pt(i + 1, prof.length - 1), crown, i % 2 ? SAUCER_SHADE : SAUCER);

  // four entrances in the glass, each under a flat canopy, and a few people at them
  for (const [nx, nz] of [[0, 1], [1, 0], [0, -1], [-1, 0]] as const) {
    const ex = cx + nx * rGlass, ez = cz + nz * rGlass, tx = -nz, tz = nx, w = 1.6, d = 1.3;
    const xa = ex + tx * -w, xb = ex + tx * w + nx * d, za = ez + tz * -w, zb = ez + tz * w + nz * d;
    b.box(Math.min(xa, xb), glassTop - 0.05, Math.min(za, zb), Math.max(xa, xb), glassTop + 0.15, Math.max(za, zb), 0xf4f2ec, { faces: 'NESWTB' });
    k.glows.push({ x: ex + nx * d * 0.5, y: glassTop - 0.15, z: ez + nz * d * 0.5, sx: nz ? 2.4 : 0.2, sy: 0.08, sz: nx ? 2.4 : 0.2, color: '#ffe2ae' });
    k.lights.push({ x: ex + nx * 3, z: ez + nz * 3, r: 9, color: '#ffe2ae', k: 0.45 });
    if (nz >= 0) {
      k.person(ex + nx * (d + 0.6) + tx * 0.8, ez + nz * (d + 0.6) + tz * 0.8);
      k.person(ex + nx * (d + 1.2) - tx * 0.6, ez + nz * (d + 1.2) - tz * 0.6);
    }
  }
}

// ---------------------------------------------------------------------------
// The parking deck at Fourth and Pennsylvania
// ---------------------------------------------------------------------------

function deck(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1, h } = l, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const levels = 4, lv = h / levels, t = 0.3, wall = 1.0, th = 0.25;
  const rand = rng(415);
  // the ground floor, and the columns that run up through every level
  paint(b, x0 + 0.1, z0 + 0.1, x1 - 0.1, z1 - 0.1, 0.035, 0x8c8a86);
  for (const x of [x0 + 0.35, cx - 0.25, x1 - 0.85]) {
    for (const z of [z0 + 0.35, cz - 0.25, z1 - 0.85]) {
      if (x === cx - 0.25 && z === cz - 0.25) continue;
      b.box(x, 0, z, x + 0.5, h - t, z + 0.5, CONCRETE, { faces: 'NESW' });
    }
  }
  // the decks above: each a slab with a low wall round its edge, its ceiling lit at night
  for (let i = 1; i < levels; i++) {
    const y = i * lv;
    b.box(x0, y - t, z0, x1, y + wall, z1, CONCRETE, { faces: 'NESW' });
    paint(b, x0 + th, z0 + th, x1 - th, z1 - th, y, 0x9b9892);
    b.quad([x0, y - t, z0], [x1, y - t, z0], [x1, y - t, z1], [x0, y - t, z1], [0, -1, 0], CONCRETE, { win: interior(0.5) });
    // the inner faces and the top of the low wall
    b.quad([x1 - th, y, z0 + th], [x0 + th, y, z0 + th], [x0 + th, y + wall, z0 + th], [x1 - th, y + wall, z0 + th], [0, 0, 1], CONCRETE_DARK);
    b.quad([x0 + th, y, z1 - th], [x1 - th, y, z1 - th], [x1 - th, y + wall, z1 - th], [x0 + th, y + wall, z1 - th], [0, 0, -1], CONCRETE_DARK);
    b.quad([x0 + th, y, z0 + th], [x0 + th, y, z1 - th], [x0 + th, y + wall, z1 - th], [x0 + th, y + wall, z0 + th], [1, 0, 0], CONCRETE_DARK);
    b.quad([x1 - th, y, z1 - th], [x1 - th, y, z0 + th], [x1 - th, y + wall, z0 + th], [x1 - th, y + wall, z1 - th], [-1, 0, 0], CONCRETE_DARK);
    paint(b, x0, z0, x1, z0 + th, y + wall, CONCRETE);
    paint(b, x0, z1 - th, x1, z1, y + wall, CONCRETE);
    paint(b, x0, z0 + th, x0 + th, z1 - th, y + wall, CONCRETE);
    paint(b, x1 - th, z0 + th, x1, z1 - th, y + wall, CONCRETE);
  }
  // cars inside, as dark shapes nose to the walls
  for (let i = 0; i < levels; i++) {
    const y = i === 0 ? 0.035 : i * lv;
    for (const [z, s] of [[z0 + th + 0.3, 1], [z1 - th - 0.3, -1]] as const) {
      for (const x of [x0 + 2.4, x0 + 5.6, x1 - 5.6, x1 - 2.4]) {
        if (rand() < 0.3) continue;
        const za = s > 0 ? z : z - 4.6, zb = s > 0 ? z + 4.6 : z;
        b.box(x - 1.15, y, za, x + 1.15, y + 1.3, zb, CAR_SHADES[Math.floor(rand() * CAR_SHADES.length)], { faces: 'NESWT' });
      }
    }
  }
  // the roof: a flat deck at exactly the lot's height, a low wall on the south and east, a higher one on the north and west
  b.box(x0, h - t, z0, x1, h, z1, CONCRETE, { faces: 'NESWTB', top: 0x9b9892 });
  b.box(x0, h, z0, x1, h + wall, z0 + th, CONCRETE, { faces: 'NESWT' });
  b.box(x0, h, z0 + th, x0 + th, h + wall, z1, CONCRETE, { faces: 'ESWT' });
  b.box(x0 + th, h, z1 - th, x1, h + 0.6, z1, CONCRETE, { faces: 'NEST' });
  b.box(x1 - th, h, z0 + th, x1, h + 0.6, z1 - th, CONCRETE, { faces: 'EWT' });
  // the bays painted on it: a row along the north wall, where two vehicles stand, and one along the south, with the aisle between
  const bay = (x1 - x0 - 6) / 3;
  for (let i = 0; i <= 4; i++) {
    const x = x0 + 3 - bay / 2 + i * bay;
    paint(b, x - 0.06, z0 + 0.6, x + 0.06, z0 + 7.6, h + 0.02, CHALK);
    if (Math.abs(x - cx) > 2.5) paint(b, x - 0.06, z1 - 3.4, x + 0.06, z1 - th - 0.1, h + 0.02, CHALK);
  }
  // the stair tower in the north-west corner, its head above the roof with a lit door to it
  const sx1 = x0 + 1.4, sz1 = z0 + 3.0, sh = h + 2.6;
  b.box(x0 - 0.05, 0, z0 - 0.05, sx1, sh, sz1, 0xa9a49a, { faces: 'NESW' });
  b.box(x0 - 0.15, sh, z0 - 0.15, sx1 + 0.1, sh + 0.25, sz1 + 0.1, CONCRETE, { faces: 'NESWTB' });
  b.box(sx1, 0.3, z0 + 0.5, sx1 + 0.03, sh - 0.6, z0 + 2.5, GLASS, { faces: 'E', win: interior(0.9) });
  b.box(x0 - 0.08, 0.3, z0 + 0.5, x0 - 0.05, sh - 0.6, z0 + 2.5, GLASS, { faces: 'W', win: interior(0.9) });
  b.box(x0 + 0.2, h, sz1, x0 + 1.2, h + 2.0, sz1 + 0.03, DARK, { faces: 'S', win: interior(1.2) });
  // a parking sign on its east face, over the entrance
  k.sign('stadium-p', x1 + 0.03, lv + 0.35, z0 + 2.2, 1, 0, 1.0);
  // lamp masts on the north and west walls
  for (const [x, z] of [[x0 + 0.12, cz + 1], [cx + 1, z0 + 0.12]]) {
    b.box(x - 0.09, h + wall, z - 0.09, x + 0.09, h + 4.2, z + 0.09, 0x9aa0a8, { faces: 'NESW' });
    b.box(x - 0.35, h + 4.2, z - 0.35, x + 0.35, h + 4.4, z + 0.35, 0x9aa0a8, { faces: 'NESWTB' });
    k.glows.push({ x, y: h + 4.1, z, sx: 0.5, sy: 0.12, sz: 0.5, color: '#fff1d0' });
  }
  k.lights.push({ x: cx, z: z1 + 3, r: 10, color: '#ffe2ae', k: 0.4 });
  // the lamps under each deck, in two rows
  for (let i = 1; i <= levels; i++) {
    for (const z of [z0 + 3.5, z1 - 3.5]) k.glows.push({ x: cx, y: i * lv - t - 0.4, z, sx: x1 - x0 - 3, sy: 0.06, sz: 0.25, color: '#f4f0dc' });
  }
  k.person(x0 + 0.9, cz + 3.5, h);
}

// ---------------------------------------------------------------------------
// Illinois Field: the grandstand behind home plate, and (in extras) the diamond
// ---------------------------------------------------------------------------

/** Where home plate is, and how far apart the bases are: home plate is just south-east of the grandstand. */
const diamond = (l: LotDef): { hx: number; hz: number; B: number } => ({ hx: l.x1 + 1.5, hz: l.z1 + 1.0, B: 4.2 });

function grandstand(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1, h } = l, d = 0.9;
  // rows that step back towards the north-west, so that they wrap round home plate
  const tops = [0.45, 0.8, 1.15, 1.5];
  tops.forEach((y, i) => b.box(x0, 0, z0, x1 - i * d, y, z1 - i * d, i === 0 ? NAVY : CONCRETE_DARK, { faces: 'EST', top: BENCH }));
  b.box(x0, 0, z0, x1 - 0.1, h - 0.4, z0 + 0.25, BRICK.red, { faces: 'NEWS' });
  b.box(x0, 0, z0 + 0.25, x0 + 0.25, h - 0.4, z1 - 0.1, BRICK.red, { faces: 'NEWS' });
  // the press box at the back, glass to the field
  b.box(x0 + 0.25, 1.5, z0 + 0.25, x0 + 3.2, h - 0.45, z0 + 2.2, 0xd9d6cf, { faces: 'ES' });
  b.box(x0 + 0.5, 1.9, z0 + 2.2, x0 + 3.0, h - 0.7, z0 + 2.23, GLASS, { faces: 'S', win: interior(0.9) });
  // the roof on its posts, deep at the front for the name
  for (const [x, z] of [[x1 - 0.1, z1 - 0.1], [x1 - 0.1, z0 + 0.5], [x0 + 0.5, z1 - 0.1]]) b.box(x - 0.08, 0, z - 0.08, x + 0.08, h - 0.4, z + 0.08, 0xd2d4d6, { faces: 'NESW' });
  b.box(x0 - 0.05, h - 0.4, z0 - 0.05, x1 + 0.25, h, z1 + 0.25, 0xe9e6de, { faces: 'NESWTB', top: 0x7d8288 });
  k.sign('stadium-field-name', (x0 + x1) / 2, h - 0.2, z1 + 0.28, 0, 1, 0.34, 4.5);
  const pr = rng(1988);
  // (on the two front rows only: on the higher ones a standing figure would put its head through the roof)
  tops.slice(0, 2).forEach((y, i) => {
    for (let j = 0; j < 5; j++) {
      const along = pr();
      // on the south-facing or the east-facing part of the row
      if (j % 2) k.person(x0 + 0.8 + along * (x1 - x0 - i * d - 1.6), z1 - i * d - d / 2, y);
      else k.person(x1 - i * d - d / 2, z0 + 1.0 + along * (z1 - z0 - i * d - 1.5), y);
    }
  });
  k.lights.push({ x: x1 + 3, z: z1 + 3, r: 11, color: '#fff4dc', k: 0.45 });
}

function illinoisField(k: Build): void {
  const b = k.b;
  const a = areaOf('illinois-field');
  const { hx, hz, B } = diamond(lotOf('illinois-field-stand'));
  // the fence: from the foul pole on the right-field line round to the one on the left-field line
  const rE = a.x1 - 0.4 - hx, rS = a.z1 - 0.4 - hz, seg = 9;
  const fence: [number, number][] = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, th = (t * Math.PI) / 2, r = rE + (rS - rE) * t + 2.2 * Math.sin(Math.PI * t);
    fence.push([Math.min(a.x1 - 0.4, hx + Math.cos(th) * r), Math.min(a.z1 - 0.4, hz + Math.sin(th) * r)]);
  }
  // the infield: dirt in a quarter round from home plate, grass inside the bases, the mound, and a ring of dirt round home
  const R = B * 1.5, fan = 8;
  for (let i = 0; i < fan; i++) {
    const a0 = (-0.06 + (i / fan) * 1.12) * (Math.PI / 2), a1 = (-0.06 + ((i + 1) / fan) * 1.12) * (Math.PI / 2);
    b.up([hx, 0.035, hz], [hx + Math.cos(a0) * R, 0.035, hz + Math.sin(a0) * R], [hx + Math.cos(a1) * R, 0.035, hz + Math.sin(a1) * R], DIRT);
  }
  paint(b, hx + 0.55, hz + 0.55, hx + B - 0.55, hz + B - 0.55, 0.045, 0x67ad57);
  b.cyl(hx + B / 2, hz + B / 2, 0, 0.16, 0.75, 0.6, 8, DIRT, { cap: DIRT });
  b.cyl(hx, hz, 0, 0.05, 0.85, 0.85, 8, DIRT, { cap: DIRT });
  // the warning track inside the fence
  for (let i = 0; i < seg; i++) {
    const [p, q] = [fence[i], fence[i + 1]];
    const inP: [number, number] = [p[0] - (p[0] - hx) * 0.06, p[1] - (p[1] - hz) * 0.06], inQ: [number, number] = [q[0] - (q[0] - hx) * 0.06, q[1] - (q[1] - hz) * 0.06];
    b.up([p[0], 0.035, p[1]], [q[0], 0.035, q[1]], [inQ[0], 0.035, inQ[1]], DIRT);
    b.up([p[0], 0.035, p[1]], [inQ[0], 0.035, inQ[1]], [inP[0], 0.035, inP[1]], DIRT);
  }
  // the lines from home plate to the foul poles, the bases, and home plate itself
  paint(b, hx, hz - 0.04, fence[0][0], hz + 0.04, 0.055, CHALK);
  paint(b, hx - 0.04, hz, hx + 0.04, fence[seg][1], 0.055, CHALK);
  for (const [x, z] of [[hx + B, hz], [hx + B, hz + B], [hx, hz + B]]) b.box(x - 0.17, 0.035, z - 0.17, x + 0.17, 0.12, z + 0.17, CHALK, { faces: 'NESWT' });
  paint(b, hx - 0.15, hz - 0.15, hx + 0.15, hz + 0.15, 0.06, CHALK);
  // the fence itself, in navy, and the two foul poles
  for (let i = 0; i < seg; i++) {
    const [p, q] = [fence[i], fence[i + 1]];
    const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2, len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    b.obox(mx, 0.6, mz, len / 2 + 0.06, 0.6, 0.07, Math.atan2(q[1] - p[1], q[0] - p[0]), 0x24365a);
  }
  for (const [x, z] of [fence[0], fence[seg]]) b.cyl(x, z, 0, 3.6, 0.09, 0.07, 4, POST_YELLOW, { cap: false });
  // the two dugouts, sunk a little, their fronts dark and open to the field
  const dugout = (xa: number, za: number, xb: number, zb: number, face: 'S' | 'E'): void => {
    b.box(xa, 0, za, xb, 0.9, zb, 0x6d6f73, { faces: face === 'S' ? 'NEW' : 'NSW' });
    if (face === 'S') b.box(xa + 0.1, 0.05, zb - 0.05, xb - 0.1, 0.85, zb, DARK, { faces: 'S', win: interior(0.4) });
    else b.box(xb - 0.05, 0.05, za + 0.1, xb, 0.85, zb - 0.1, DARK, { faces: 'E', win: interior(0.4) });
    b.box(xa - 0.1, 0.9, za - 0.1, xb + 0.15, 1.1, zb + 0.15, NAVY, { faces: 'NESWTB' });
  };
  dugout(hx + 1.2, hz - 2.1, hx + 3.8, hz - 1.1, 'S');
  dugout(hx - 2.1, hz + 1.2, hx - 1.1, hz + 3.8, 'E');
  // the teams: the home side in the field in white, the guests at bat in grey
  const field: Dress = { coat: 0xf6f6f2, legs: 0xf6f6f2, hat: NAVY, hatH: 0.24, hatR: 0.33 };
  const bat: Dress = { coat: 0xa9abae, legs: 0xa9abae, hat: 0x2b2d33, hatH: 0.3, hatR: 0.33 };
  const spots: [number, number, Dress][] = [
    [hx + B / 2 + 0.1, hz + B / 2 + 0.1, field], // the pitcher
    [hx - 0.7, hz - 0.7, field], // the catcher
    [hx + B + 0.4, hz + 0.8, field], // first base
    [hx + B + 0.9, hz + B * 0.62, field], // second
    [hx + B * 0.62, hz + B + 0.9, field], // short
    [hx + 8.6, hz + 8.4, field], // centre field
    [hx + 0.75, hz - 0.35, bat], // at bat
    [hx + B - 0.5, hz - 0.45, bat], // on first
  ];
  for (const [x, z, d] of spots) figure(b, x, z, 0.035, d);
  k.person(hx + 2.4, hz - 0.7, 0.02);
  k.person(hx - 0.7, hz + 2.6, 0.02);
}

// ---------------------------------------------------------------------------
// Grange Grove: the tailgate on the lawn west of the stadium
// ---------------------------------------------------------------------------

function grangeGrove(k: Build): void {
  const b = k.b;
  const a = areaOf('grange-grove');
  const rand = rng(2009);
  const colours = [ORANGE, NAVY, 0xf6f6f2, ORANGE, NAVY, 0xf6f6f2, ORANGE];
  const W = a.x1 - a.x0, cols = [a.x0 + W * 0.28, a.x0 + W * 0.72];
  const tents: [number, number][] = [];
  for (let i = 0; i < colours.length; i++) tents.push([cols[i % 2], a.z0 + 2.2 + (i * (a.z1 - a.z0 - 4.4)) / (colours.length - 1)]);
  const s = 1.15; // half a tent's width
  tents.forEach(([x, z], i) => {
    const c = colours[i];
    // four posts, a valance with its underside, and a low peak
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.box(x + dx * s - 0.05, 0, z + dz * s - 0.05, x + dx * s + 0.05, 2.0, z + dz * s + 0.05, 0xd8d8d8, { faces: 'NESW' });
    b.box(x - s - 0.05, 2.0, z - s - 0.05, x + s + 0.05, 2.25, z + s + 0.05, c, { faces: 'NESWB' });
    const p: V3 = [x, 2.8, z], A: V3 = [x - s - 0.05, 2.25, z - s - 0.05], B: V3 = [x + s + 0.05, 2.25, z - s - 0.05], C: V3 = [x + s + 0.05, 2.25, z + s + 0.05], D: V3 = [x - s - 0.05, 2.25, z + s + 0.05];
    slope3(b, A, B, p, c);
    slope3(b, B, C, p, c);
    slope3(b, C, D, p, c);
    slope3(b, D, A, p, c);
    // a folding table under it, and on every other one a grill beside it
    b.box(x - 0.75, 0.68, z - 0.3, x + 0.75, 0.76, z + 0.3, 0xeeeeea, { faces: 'NESWTB' });
    for (const dx of [-0.65, 0.65]) b.box(x + dx - 0.04, 0, z - 0.25, x + dx + 0.04, 0.68, z + 0.25, 0x9aa0a8, { faces: 'EW' });
    if (i % 2 === 0) {
      const gx = x + (x < (a.x0 + a.x1) / 2 ? s + 0.7 : -s - 0.7), gz = z + 0.6;
      b.box(gx - 0.35, 0.45, gz - 0.25, gx + 0.35, 0.85, gz + 0.25, 0x23252a, { faces: 'NESWT' });
      b.box(gx - 0.05, 0, gz - 0.05, gx + 0.05, 0.45, gz + 0.05, 0x23252a, { faces: 'NESW' });
    }
    // people round it
    for (let j = 0; j < 5; j++) {
      const ang = rand() * Math.PI * 2, r = 0.6 + rand() * 1.2;
      k.person(Math.max(a.x0 + 0.4, Math.min(a.x1 - 0.4, x + Math.cos(ang) * r)), z + Math.sin(ang) * r);
    }
  });
  // and more on their way to the gates
  for (let j = 0; j < 6; j++) k.person(a.x1 - 0.5, a.z0 + 1 + rand() * (a.z1 - a.z0 - 2));
  k.lights.push({ x: (a.x0 + a.x1) / 2, z: (a.z0 + a.z1) / 2 - 5, r: 9, color: '#ffe2ae', k: 0.4 });
  k.lights.push({ x: (a.x0 + a.x1) / 2, z: (a.z0 + a.z1) / 2 + 5, r: 9, color: '#ffe2ae', k: 0.4 });
}

// ---------------------------------------------------------------------------
// The practice fields: two side by side, running north and south, with goal posts
// ---------------------------------------------------------------------------

function practiceFields(k: Build): void {
  const b = k.b;
  const a = areaOf('practice-fields');
  const cz = (a.z0 + a.z1) / 2, Lf = a.z1 - a.z0 - 1.5, yd = Lf / 120, hw = (53.3 * yd) / 2, t = 0.08;
  const gap = ((a.x1 - a.x0) - 4 * hw) / 3;
  for (const cx of [a.x0 + gap + hw, a.x1 - gap - hw]) {
    const n0 = cz - Lf / 2, s0 = cz + Lf / 2;
    paint(b, cx - hw - t, n0, cx - hw, s0, 0.05, CHALK);
    paint(b, cx + hw, n0, cx + hw + t, s0, 0.05, CHALK);
    for (let i = 0; i <= 12; i++) {
      const z = n0 + i * 10 * yd;
      paint(b, cx - hw, z - t / 2, cx + hw, z + t / 2, 0.05, CHALK);
    }
    for (const [z, s] of [[n0, -1], [s0, 1]] as const) {
      b.cyl(cx, z + s * 0.3, 0, 1.2, 0.08, 0.08, 3, POST_YELLOW, { cap: false });
      b.beam([cx - 0.65, 1.2, z + s * 0.3], [cx + 0.65, 1.2, z + s * 0.3], 0.05, 0.05, POST_YELLOW);
      for (const x of [cx - 0.65, cx + 0.65]) b.cyl(x, z + s * 0.3, 1.15, 3.2, 0.05, 0.04, 3, POST_YELLOW, { cap: false });
    }
  }
}

// ---------------------------------------------------------------------------

/** The models, by the id of their lot in plan.ts. */
export const MODELS: Record<string, Model> = {
  stadium,
  saucer,
  'deck-e15': deck,
  'illinois-field-stand': grandstand,
};

/** Whatever this file builds that is not a lot. */
export function extras(k: Build): void {
  illinoisField(k);
  grangeGrove(k);
  practiceFields(k);
}
