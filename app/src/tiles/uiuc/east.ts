// Urbana: Krannert Center, the chemistry laboratories, Busey and Evans halls,
// the greenhouses and Illini Grove, the Pennsylvania Avenue halls with Oglesby
// and Trelease, and the Round Barns.
//
// Krannert Center (1969, Max Abramovitz) is the largest thing on this side: a
// terrace of brick paving over a long glazed lobby, reached by wide steps, with
// its theatres rising from it as plain masses of reddish-brown brick, and an
// amphitheatre of stepped seats cut into its south-west corner, between two
// brick towers that light it in colour at night. The rest are plainer: two
// laboratories of red brick, two Georgian halls joined by a porch, a head house
// with five glass houses lit by growing lamps, four low wings of rooms round a
// dining hall, two slabs of twelve storeys, and three round barns of the
// university's dairy farm, white under arched roofs.

import { interior, rng, type BoxOpts, type GeoBuilder, type WinSpec } from '../../engine/geo';
import { area, rect } from '../../engine/ground';
import { lantern, lathe } from '../../engine/parts';
import { face3, gable, hip } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { BRICK, DARK, FELT, GLASS, LIMESTONE, NAVY, SLATE, TRIM, chimney, column, dormer, steps } from './look';
import { AREAS, lot, type LotDef, type Model, type PartDef } from './plan';

type Side = 'N' | 'S' | 'E' | 'W';

// ---------------------------------------------------------------------------
// Colours and glazing of this file's own
// ---------------------------------------------------------------------------

/** Krannert's reddish-brown brick, the brick of its paving and its seats, and the pale coping on its walls. */
const K_BRICK = 0x8a4e3d, K_PAVE = 0xb27a62, K_SEAT = 0xa5634e, K_TREAD = 0xbd8c74, COPING = 0xcfc6b4;
/** The laboratories' brick, the precast of the newer one, and grey metal for what is on a roof. */
const LAB_BRICK = 0x9e5442, CLSL_BRICK = 0x97553f, PRECAST = 0xd6cdb9, PLANT = 0xb3b6ba, PLANT_TOP = 0x8f9399;
/** The Pennsylvania Avenue halls' brick, and the buff brick and pale concrete of the Florida Avenue towers. */
const PAR_BRICK = 0xa45c43, FAR_BRICK = 0xc4a27b, CONCRETE = 0xd9d3c6;
/** The greenhouses' glass, which is a little paler than a window's. */
const GREEN_GLASS = 0xc4dade;
/** The barns: white siding, a roof of weathered shingle, their doors, and the grey of a concrete silo. */
const BARN_WHITE = 0xefebe0, SHINGLE = 0x5f655e, BARN_DOOR = 0x7c3b2e, SILO = 0xb9b4a8;
const LAWN_GREEN = 0x6fa85a, WALK = 0xd8d2c4, WOOD = 0x8d6b4a, HAY = 0xd8b65e;

/** The lobby under Krannert's terrace: one row of tall panes, lit at night. */
const LOBBY: WinSpec = { cell: 1.4, storey: 2.0, lit: 0.85, kind: 1 };
/** The Great Hall's lobby windows: three rows of glass over the amphitheatre. */
const GREAT_GLASS: WinSpec = { cell: 1.05, storey: 2.5, lit: 0.9, kind: 1 };
/** A laboratory's storey is lower than the campus's, so that four fit in each lot's height. */
const LAB = 2.15, CL = 2.1;
const LAB_WIN: WinSpec = { cell: 1.6, storey: LAB, lit: 0.4, kind: 0 };
const CLSL_WIN: WinSpec = { cell: 1.3, storey: CL, lit: 0.45, kind: 0 };
const CLSL_GROUND: WinSpec = { cell: 1.9, storey: CL, lit: 0.55, kind: 0 };
/** A storey of a hall of residence, as in six-pack.ts, and its rows of bedroom windows. */
const RES = 2.2;
const ROOMS: WinSpec = { cell: 1.45, storey: RES, lit: 0.42, kind: 0 };
/** The Florida Avenue towers have twelve storeys in 18: a storey there is 1.42. */
const FAR = 1.42;
const FAR_ROOMS: WinSpec = { cell: 1.15, storey: FAR, lit: 0.45, kind: 0 };
/** The glass of a greenhouse, lit by its growing lamps at night. */
const GROWING: WinSpec = { cell: 0.75, storey: 2.4, lit: 0.95, kind: 1 };
/** A barn's few small windows. */
const BARN_WIN: WinSpec = { cell: 1.5, storey: 2.0, lit: 0.25, kind: 4 };

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** A box against a wall that looks `out`: from `a0` to `a1` along the wall, and from `o0` to `o1` out from it. */
function against(b: GeoBuilder, out: Side, a0: number, a1: number, wall: number, o0: number, o1: number, y0: number, y1: number, color: number, o: BoxOpts = {}): void {
  const s = out === 'S' || out === 'E' ? 1 : -1;
  const lo = Math.min(wall + s * o0, wall + s * o1), hi = Math.max(wall + s * o0, wall + s * o1);
  if (out === 'N' || out === 'S') b.box(a0, y0, lo, a1, y1, hi, color, o);
  else b.box(lo, y0, a0, hi, y1, a1, color, o);
}

/** A band that wraps a rectangle of walls at height `y`, `out` proud of them. */
function band(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, out: number, color: number): void {
  b.box(x0 - out, y0, z0 - out, x1 + out, y1, z1 + out, color, { faces: 'NESWTB' });
}

/** A low wall round the edge of a flat roof at `y`, with a cap of its own colour on top. */
function parapet(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, h: number, color: number, cap: number): void {
  const t = 0.26;
  b.box(x0, y, z0, x1, y + h, z0 + t, color, { top: cap });
  b.box(x0, y, z1 - t, x1, y + h, z1, color, { top: cap });
  b.box(x0, y, z0 + t, x0 + t, y + h, z1 - t, color, { faces: 'EWT', top: cap });
  b.box(x1 - t, y, z0 + t, x1, y + h, z1 - t, color, { faces: 'EWT', top: cap });
}

/** A university building's name on a plain board on a wall that looks `out`, centred at `a` along it and at height `y`. */
function nameBoard(k: Build, id: string, out: Side, a: number, wall: number, y: number, w: number, h: number): void {
  const s = out === 'S' || out === 'E' ? 1 : -1;
  against(k.b, out, a - w / 2 - 0.1, a + w / 2 + 0.1, wall, 0, 0.1, y - h / 2 - 0.1, y + h / 2 + 0.1, NAVY, { faces: 'NESWTB' });
  if (out === 'N' || out === 'S') k.sign(id, a, y, wall + s * 0.13, 0, s, h, w);
  else k.sign(id, wall + s * 0.13, y, a, s, 0, h, w);
}

/** A door: dark, lit from within at night, a hair proud of its wall. */
function door(b: GeoBuilder, out: Side, a: number, wall: number, w: number, y0: number, y1: number, lit = 1.3): void {
  against(b, out, a - w / 2, a + w / 2, wall, 0, 0.05, y0, y1, DARK, { faces: out, win: interior(lit) });
}

const part = (l: LotDef, id: string): PartDef => {
  const p = l.parts?.find((q) => q.id === id);
  if (!p) throw new Error(`${l.id} has no part called ${id}.`);
  return p;
};

/** A plain board with a university building's name: white, with navy lettering. */
function board(id: string, lines: string[]): SignDef {
  const longest = Math.max(...lines.map((t) => t.length));
  const aspect = Math.max(2.4, (longest * 0.62) / lines.length + 0.3);
  return { id: `east-${id}`, lines, color: '#f3f0e7', ink: '#13294b', aspect, kind: 'board', real: true, size: [Math.round(52 * lines.length * aspect), 52 * lines.length] };
}

export const SIGNS: SignDef[] = [
  board('krannert', ['KRANNERT CENTER', 'FOR THE', 'PERFORMING ARTS']),
  board('adams', ['ROGER ADAMS', 'LABORATORY']),
  board('clsl', ['CHEMICAL AND LIFE', 'SCIENCES LABORATORY']),
  board('busey', ['BUSEY HALL']),
  board('evans', ['EVANS HALL']),
  board('par', ['PENNSYLVANIA AVENUE', 'RESIDENCE HALLS']),
  board('oglesby', ['OGLESBY HALL']),
  board('trelease', ['TRELEASE HALL']),
  board('round-barns', ['ROUND BARNS']),
];

// ---------------------------------------------------------------------------
// Krannert Center for the Performing Arts
// ---------------------------------------------------------------------------

function krannert(k: Build, l: LotDef): void {
  const b = k.b, T = l.h;
  const { x0, z0, x1, z1 } = l;
  const gh = part(l, 'krannert-great-hall'), fe = part(l, 'krannert-festival'), ph = part(l, 'krannert-playhouse');

  // Where the terrace is cut: the west steps along the Great Hall, the east steps
  // between the Festival Theatre and the Playhouse, the south steps east of the
  // amphitheatre, and the amphitheatre itself, south of the Great Hall.
  const xW = x0 + Math.min(0.8, gh.x0 - x0 - 0.05), xA1 = gh.x1 + 0.5, xE = x1 - 2.6;
  const zA = gh.z1 + 1, zS = z1 - 1.2;
  const wf0 = gh.z0 + 1, wf1 = gh.z1 - 1;
  const es0 = fe.z1 + 0.3, es1 = ph.z0 - 0.3;

  // -------------------------------------------------------------------------
  // The terrace: brick paving on top, and the walls under it, in pieces round the cuts
  // -------------------------------------------------------------------------
  const deck = (a0: number, c0: number, a1: number, c1: number, faces: string): void =>
    b.box(a0, 0, c0, a1, T, c1, K_BRICK, { top: K_PAVE, faces });
  deck(xW, z0, xE, zA, 'NEWT');
  deck(x0, z0, xW, wf0, 'NSWT');
  deck(x0, wf1, xW, zA, 'NWT');
  deck(xE, z0, x1, es0, 'NEST');
  deck(xE, es1, x1, zS, 'NEST');
  deck(xA1, zA, xE, zS, 'WST');

  // The lobby, which runs round the terrace under it: a band of glass in each outer wall, lit at night,
  // and a coping of brick over it that stands proud, with its underside
  const lobby = (out: Side, a0: number, a1: number, wall: number, seed: number): void => {
    if (a1 - a0 < 0.8) return;
    against(b, out, a0 + 0.3, a1 - 0.3, wall, 0, 0.05, 0.2, 2.0, GLASS, { faces: out, win: LOBBY, seed });
    against(b, out, a0, a1, wall, 0, 0.22, T - 0.42, T + 0.06, K_BRICK, { faces: `${out}TB`, top: COPING });
  };
  lobby('N', x0, x1, z0, 0.11);
  lobby('E', z0, es0, x1, 0.23);
  lobby('E', es1, zS, x1, 0.37);
  lobby('W', z0, wf0, x0, 0.41);
  lobby('W', wf1, zA, x0, 0.53);

  // The steps up to it: on the west, along the Great Hall, from Goodwin Avenue; on the east, from Gregory Street,
  // between the two theatres; and on the south, from Oregon Street, beside the amphitheatre
  steps(b, wf0, wf1, xW, T, 'W', K_TREAD, 0.28);
  steps(b, es0, es1, xE, T, 'E', K_TREAD, 0.3);
  steps(b, xA1, x1, zS, T, 'S', K_TREAD, 0.33);
  // a low wall of brick at each end of the west steps and the east steps
  for (const z of [wf0 - 0.3, wf1]) b.box(xW - 2.3, 0, z, xW, 0.9, z + 0.3, K_BRICK, { top: COPING });
  for (const z of [es0, es1 - 0.3]) b.box(xE, 0, z, x1 - 0.2, 0.9, z + 0.3, K_BRICK, { top: COPING });

  // -------------------------------------------------------------------------
  // The amphitheatre: rows of brick seats round a round stage, open to the south
  // -------------------------------------------------------------------------
  const ax0 = x0 + 0.5, acx = (ax0 + xA1) / 2, zC = z1 - 2.2, rows = 7;
  // its west wall, along Goodwin Avenue
  b.box(x0, 0, zA, ax0, T, z1, K_BRICK, { top: COPING, faces: 'EWST' });
  {
    const dz = (zC - zA - 2.3) / rows, segs = 8, sw = (xA1 - ax0) / segs, rise = (T - 0.32) / rows;
    for (let i = 0; i < rows; i++) {
      const r = zC - zA - (i + 1) * dz, top = T - i * rise;
      for (let j = 0; j < segs; j++) {
        const xa = ax0 + j * sw, xb = xa + sw, dx = Math.abs((xa + xb) / 2 - acx);
        const front = dx < r ? Math.min(zC - Math.sqrt(r * r - dx * dx), z1 - 0.5) : z1 - 0.5;
        if (front - zA < 0.25) continue;
        b.box(xa, 0, zA, xb, top, front, K_SEAT, { top: K_TREAD, faces: 'ESWT' });
      }
    }
    // the stage, and the paving before it
    area(k, rect(ax0, zC - 1.2, xA1, z1), 0xc9b7a0, 0.035);
    b.cyl(acx, zC, 0, 0.32, 2.05, 2.05, 12, COPING, { top: 0xd8cfbd });
    // people on the seats, in the sun
    const sit: [number, number][] = [[2, -2.6], [2, -1.9], [3, 1.4], [3, 2.0], [4, -3.4], [5, 0.6], [1, 3.1], [6, -0.9]];
    for (const [i, dx] of sit) {
      const r = zC - zA - (i + 1) * dz, front = zC - Math.sqrt(Math.max(0, r * r - dx * dx));
      if (front - zA < 0.6) continue;
      k.person(acx + dx, Math.min(front, z1 - 0.6) - 0.35, T - i * rise);
    }
    k.person(acx - 0.5, zC + 0.3, 0.32);
  }
  // the two brick towers at the front corners, with the lamps that light the amphitheatre in colour at night
  const towers: [number, string][] = [[x0 + 0.55, '#c58cff'], [xA1 - 0.55, '#6fb6ff']];
  for (const [tx, color] of towers) {
    b.box(tx - 0.55, 0, z1 - 1.1, tx + 0.55, 5.3, z1, K_BRICK, { top: COPING });
    b.box(tx - 0.65, 5.3, z1 - 1.2, tx + 0.65, 5.5, z1 + 0.1, COPING, { faces: 'NESWTB' });
    k.glows.push({ x: tx + (tx < acx ? 0.6 : -0.6), y: 4.9, z: z1 - 0.55, sx: 0.2, sy: 0.3, sz: 0.5, color });
    k.lights.push({ x: tx + (tx < acx ? 3 : -3), z: zC - 0.8, r: 6, color, k: 0.45 });
  }
  k.lights.push({ x: acx, z: zC - 2, r: 11, color: '#ffe2ae', k: 0.5 });

  // -------------------------------------------------------------------------
  // The theatres: plain masses of brick with few windows, each with a pale coping
  // -------------------------------------------------------------------------
  const coping = (a0: number, c0: number, a1: number, c1: number, y: number): void =>
    b.box(a0 - 0.14, y - 0.45, c0 - 0.14, a1 + 0.14, y, c1 + 0.14, COPING, { faces: 'NESWTB', top: FELT });
  /** Shallow piers of brick up a wall that looks `out`, which break its plainness into bays. */
  const piers = (out: Side, a0: number, a1: number, wall: number, y0: number, y1: number, n: number): void => {
    for (let i = 1; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      against(b, out, a - 0.3, a + 0.3, wall, 0, 0.16, y0, y1, 0x7b4535, { faces: out === 'N' || out === 'S' ? `${out}EW` : `${out}NS` });
    }
  };

  // The Great Hall: its mass, and in front of it, over the amphitheatre, a lower block that holds its lobby
  // behind three rows of glass
  {
    const front = gh.z1 - 3.4, fh = T + 3 * GREAT_GLASS.storey, top = gh.h;
    b.box(gh.x0, T, gh.z0, gh.x1, top - 0.45, front, K_BRICK, { faces: 'NEWS' });
    coping(gh.x0, gh.z0, gh.x1, front, top);
    b.box(gh.x0 + 2, top, gh.z0 + 2, gh.x1 - 2, top + 0.35, front - 2, FELT, { faces: 'NESWT' });
    piers('E', gh.z0, front, gh.x1, T, top - 0.45, 4);
    piers('W', gh.z0, front, gh.x0, T, top - 0.45, 4);
    piers('N', gh.x0, gh.x1, gh.z0, T, top - 0.45, 5);
    b.box(gh.x0, T, front, gh.x1, fh, gh.z1, K_BRICK, { faces: 'ESW' });
    b.box(gh.x0 - 0.12, fh, front - 0.12, gh.x1 + 0.12, fh + 0.5, gh.z1 + 0.12, COPING, { faces: 'NESWTB', top: FELT });
    // the glass, between piers of brick at its ends, with slender mullions
    against(b, 'S', gh.x0 + 0.7, gh.x1 - 0.7, gh.z1, 0, 0.06, T, fh, GLASS, { faces: 'S', win: GREAT_GLASS, seed: 0.61 });
    for (let i = 0; i <= 4; i++) {
      const x = gh.x0 + 0.7 + ((gh.x1 - gh.x0 - 1.4) * i) / 4;
      against(b, 'S', x - 0.09, x + 0.09, gh.z1, 0.06, 0.16, T, fh, 0x3a2a24, { faces: 'SEW' });
    }
    // its doors onto the east of the terrace
    door(b, 'E', (gh.z0 + front) / 2 + 1, gh.x1, 2.4, T, T + 2.2);
    k.glows.push({ x: (gh.x0 + gh.x1) / 2, y: fh - 0.6, z: gh.z1 + 0.3, sx: gh.x1 - gh.x0 - 2, sy: 0.12, sz: 0.2, color: '#ffe9c4' });
  }

  // The Festival Theatre: a body, and the fly tower over its stage, to the north
  {
    const body = fe.h - 2.6;
    b.box(fe.x0, T, fe.z0, fe.x1, body - 0.45, fe.z1, K_BRICK, { faces: 'NESW' });
    coping(fe.x0, fe.z0, fe.x1, fe.z1, body);
    const tz1 = fe.z0 + (fe.z1 - fe.z0) * 0.55;
    b.box(fe.x0 + 0.8, body, fe.z0 + 0.8, fe.x1 - 0.8, fe.h - 0.4, tz1, K_BRICK, { faces: 'NESW' });
    coping(fe.x0 + 0.8, fe.z0 + 0.8, fe.x1 - 0.8, tz1, fe.h);
    piers('E', fe.z0, fe.z1, fe.x1, T, body - 0.45, 3);
    piers('S', fe.x0, fe.x1, fe.z1, T, body - 0.45, 3);
    door(b, 'S', (fe.x0 + fe.x1) / 2, fe.z1, 2.6, T, T + 2.2);
    against(b, 'E', (fe.z0 + fe.z1) / 2 - 0.35, (fe.z0 + fe.z1) / 2 + 0.35, fe.x1, 0, 0.06, T + 2.5, body - 1.2, GLASS, { faces: 'E', win: interior(0.9) });
  }

  // The Playhouse: the same, lower, with its fly tower in the middle and the centre's name on its east side
  {
    const body = ph.h - 2.4;
    b.box(ph.x0, T, ph.z0, ph.x1, body - 0.45, ph.z1, K_BRICK, { faces: 'NESW' });
    coping(ph.x0, ph.z0, ph.x1, ph.z1, body);
    const tz0 = ph.z0 + 2.2, tz1 = ph.z1 - 2.6;
    b.box(ph.x0 + 0.8, body, tz0, ph.x1 - 0.8, ph.h - 0.4, tz1, K_BRICK, { faces: 'NESW' });
    coping(ph.x0 + 0.8, tz0, ph.x1 - 0.8, tz1, ph.h);
    piers('S', ph.x0, ph.x1, ph.z1, T, body - 0.45, 3);
    piers('W', ph.z0, ph.z1, ph.x0, T, body - 0.45, 3);
    door(b, 'N', (ph.x0 + ph.x1) / 2, ph.z0, 2.6, T, T + 2.2);
    nameBoard(k, 'east-krannert', 'E', (ph.z0 + ph.z1) / 2, ph.x1, T + 2.6, 4.6, 1.45);
  }

  // -------------------------------------------------------------------------
  // On the terrace: lamps, planters, banners, and people
  // -------------------------------------------------------------------------
  for (const [x, z] of [[xW + 0.4, wf0 - 0.6], [xW + 0.4, wf1 + 0.6], [xE - 0.4, es0 - 0.2], [xA1 + 0.6, zS - 0.4]] as const) lantern(k, x, z, T, 2.2, 0x9aa0a8);
  for (const [x, z] of [[xA1 + 0.15, zA + 0.4], [(xE + x1) / 2, zS - 0.6], [gh.x1 + 0.2, gh.z0 - 0.1]] as const) {
    b.box(x - 0.6, T, z - 0.45, x + 0.6, T + 0.55, z + 0.45, K_BRICK, { top: 0x5f8a4a });
  }
  // a few plain banners on poles along the Gregory Street side
  const banners: [number, number][] = [[fe.z0 + 1.5, 0x9b2335], [fe.z1 - 1.2, 0xd9a03a], [ph.z1 - 1.5, 0x2f4f8f]];
  for (const [z, color] of banners) {
    const x = (fe.x1 + x1) / 2;
    b.cyl(x, z, T, T + 4.2, 0.07, 0.06, 4, 0xc9ccd2, { cap: false });
    b.box(x - 0.05, T + 4.0, z - 0.04, x + 0.05, T + 4.08, z + 1.05, 0xc9ccd2, { faces: 'NESWTB' });
    b.box(x - 0.03, T + 1.7, z + 0.12, x + 0.03, T + 4.0, z + 1.0, color, { faces: 'NESWB' });
  }
  // people on the terrace, between the theatres, and on the steps
  const r = rng(4471);
  for (let i = 0; i < 6; i++) k.person(gh.x1 + 0.6 + r() * (xE - gh.x1 - 1.2), es0 + 0.1 + r() * (es1 - es0 - 0.2), T);
  k.person(xW + 0.3, (wf0 + wf1) / 2 - 1.5, T);
  k.person(x0 + 0.1, (wf0 + wf1) / 2 + 1.2, (T * 6) / 9);
  k.person(x0 - 1.1, (wf0 + wf1) / 2 - 2.2, 0);
  k.person(xE + 1.2, (es0 + es1) / 2 + 0.4, (T * 4) / 9);
  k.person((xA1 + x1) / 2 - 1, z1 + 0.8, (T * 2) / 9);
  k.person((xA1 + x1) / 2 + 2.2, zS - 0.5, T);

  // Light: the lobby glows all round, and pools at the steps
  k.lights.push({ x: x0 - 2.2, z: (wf0 + wf1) / 2, r: 10, color: '#ffe2ae', k: 0.5 });
  k.lights.push({ x: x1 + 0.8, z: (es0 + es1) / 2, r: 9, color: '#ffe2ae', k: 0.55 });
  k.lights.push({ x: (xA1 + x1) / 2, z: z1 + 1.5, r: 9, color: '#ffe2ae', k: 0.5 });
  k.lights.push({ x: (x0 + x1) / 2, z: z0 - 1.5, r: 10, color: '#ffe2ae', k: 0.4 });
  k.lights.push({ x: x1 + 0.6, z: (z0 + es0) / 2, r: 8, color: '#ffe2ae', k: 0.4 });
}

// ---------------------------------------------------------------------------
// Roger Adams Laboratory, and the Chemical and Life Sciences Laboratory
// ---------------------------------------------------------------------------

/** Roger Adams Laboratory, of 1950: four storeys of plain red brick, a stone base, a stone cornice and a flat roof. */
function adams(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, H = 4 * LAB, zc = (z0 + z1) / 2;
  b.box(x0, 0, z0, x1, H, z1, LAB_BRICK, { win: LAB_WIN, seed: 0.17, faces: 'NESW' });
  // the ground floor: a base of limestone, and a band of it where the floor above begins
  b.box(x0 - 0.06, 0, z0 - 0.06, x1 + 0.06, 0.75, z1 + 0.06, LIMESTONE, { faces: 'NESW' });
  band(b, x0, z0, x1, z1, LAB - 0.08, LAB + 0.08, 0.06, LIMESTONE);
  // a pavilion a little proud in the middle of the east side, which is the side the Goodwin walk sees
  b.box(x1, 0, zc - 2.2, x1 + 0.35, H, zc + 2.2, LAB_BRICK, { win: LAB_WIN, seed: 0.29, faces: 'NES' });
  b.box(x1, 0, zc - 2.25, x1 + 0.41, 0.75, zc + 2.25, LIMESTONE, { faces: 'NES' });
  // stone at the corners
  for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) b.box(x - 0.12, 0.75, z - 0.12, x + 0.12, H, z + 0.12, LIMESTONE, { faces: 'NESW' });
  // the cornice, the flat roof, and a low wall round it
  b.box(x0 - 0.2, H, z0 - 0.2, x1 + 0.55, H + 0.32, z1 + 0.2, LIMESTONE, { faces: 'NESWTB', top: FELT });
  parapet(b, x0 - 0.1, z0 - 0.1, x1 + 0.45, z1 + 0.1, H + 0.32, 0.5, LAB_BRICK, LIMESTONE);
  // the doors: the main one on Mathews Avenue, to the west, in a frame of stone, and one on the east, with the name over it
  for (const [out, wall] of [['W', x0], ['E', x1 + 0.35]] as const) {
    against(b, out, zc - 1.2, zc + 1.2, wall, 0, 0.2, 0, 2.9, LIMESTONE, { faces: out === 'W' ? 'NSWT' : 'NSET' });
    door(b, out, zc, wall + (out === 'W' ? -0.2 : 0.2), 1.5, 0, 2.1);
    k.lights.push({ x: wall + (out === 'W' ? -1.5 : 1.5), z: zc, r: 7, color: '#ffe2ae', k: 0.45 });
  }
  nameBoard(k, 'east-adams', 'E', zc, x1 + 0.55, 3.75, 2.9, 0.82);
  k.person(x1 + 1.0, zc + 1.6);
  k.person(x0 - 0.9, zc - 1.4);
  // on the roof: the head of the lift and the stairs, and a row of hoods from the fume cupboards along each side
  b.box(x0 + 2.2, H + 0.32, zc - 2.4, x1 - 2.2, H + 1.55, zc + 1.2, PLANT, { top: PLANT_TOP });
  for (let i = 0; i < 5; i++) {
    const z = z0 + 1.6 + ((z1 - z0 - 3.2) * i) / 4;
    b.cyl(x0 + 1.3, z, H + 0.32, H + 1.5, 0.2, 0.2, 6, PLANT, { cap: DARK });
    if (i % 2 === 0) b.cyl(x1 - 1.3, z, H + 0.32, H + 1.3, 0.2, 0.2, 6, PLANT, { cap: DARK });
  }
}

/** The Chemical and Life Sciences Laboratory, of the 1990s: brick over a ground floor of precast, glass, and rows of exhaust stacks. */
function clsl(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, H = 4 * CL, zc = (z0 + z1) / 2;
  // the ground floor of pale precast, with wider windows, and three storeys of brick on it
  b.box(x0, 0, z0, x1, CL, z1, PRECAST, { win: CLSL_GROUND, seed: 0.47, faces: 'NESW' });
  b.box(x0, CL, z0, x1, H, z1, CLSL_BRICK, { win: CLSL_WIN, seed: 0.47, faces: 'NESW' });
  band(b, x0, z0, x1, z1, CL - 0.06, CL + 0.12, 0.08, PRECAST);
  band(b, x0, z0, x1, z1, 3 * CL - 0.05, 3 * CL + 0.05, 0.05, PRECAST);
  // piers of brick that part the long east side into bays
  for (const f of [0.25, 0.5, 0.75]) against(b, 'E', z0 + f * (z1 - z0) - 0.22, z0 + f * (z1 - z0) + 0.22, x1, 0, 0.14, CL + 0.12, H, CLSL_BRICK, { faces: 'ENS' });
  // a stair of glass at the south-east corner, a little higher than the roof, and a strip of glass up the north of the east side
  b.box(x1 - 2.3, 0, z1 - 2.3, x1 + 0.3, H + 0.9, z1 + 0.3, GLASS, { win: { cell: 1.0, storey: CL, lit: 0.75, kind: 1 }, seed: 0.13, top: FELT });
  b.box(x1 - 2.4, H + 0.9, z1 - 2.4, x1 + 0.4, H + 1.1, z1 + 0.4, PRECAST, { faces: 'NESWTB' });
  against(b, 'E', z0 + 1.6, z0 + 3.2, x1, 0, 0.06, CL + 0.2, H - 0.2, GLASS, { faces: 'E', win: interior(0.8) });
  // the parapet, and the roof
  b.box(x0 + 0.26, H, z0 + 0.26, x1 - 0.26, H + 0.08, z1 - 0.26, FELT, { faces: 'T' });
  parapet(b, x0, z0, x1, z1, H, 0.6, CLSL_BRICK, PRECAST);
  // the doors on Goodwin Avenue, under a flat canopy
  const ez = zc + 1.5;
  against(b, 'E', ez - 1.4, ez + 1.4, x1, 0, 0.08, 0, CL - 0.3, GLASS, { faces: 'E', win: interior(1.3) });
  against(b, 'E', ez - 1.8, ez + 1.8, x1, 0, 1.1, CL - 0.25, CL - 0.05, PRECAST, { faces: 'NESWTB' });
  k.lights.push({ x: x1 + 1.6, z: ez, r: 8, color: '#ffe2ae', k: 0.5 });
  k.person(x1 + 0.8, ez - 1.0);
  // and the entrance on the south, where the opening view sees it past Manolo's: glass, a canopy, the name over it, and
  // fins of precast that part the south side into bays
  const sx = x0 + (x1 - x0 - 2.3) / 2;
  against(b, 'S', sx - 1.3, sx + 1.3, z1, 0, 0.08, 0, CL - 0.3, GLASS, { faces: 'S', win: interior(1.3) });
  against(b, 'S', sx - 1.7, sx + 1.7, z1, 0, 1.0, CL - 0.25, CL - 0.05, PRECAST, { faces: 'NESWTB' });
  for (const x of [x0 + 0.9, sx - 2.2, sx + 2.2]) against(b, 'S', x - 0.18, x + 0.18, z1, 0, 0.2, 0, H, PRECAST, { faces: 'SEW' });
  nameBoard(k, 'east-clsl', 'S', sx, z1 + 0.2, CL + 1.0, 3.6, 0.65);
  k.lights.push({ x: sx, z: z1 + 1.6, r: 8, color: '#ffe2ae', k: 0.5 });
  k.person(sx + 1.6, z1 + 1.2);
  k.person(sx - 0.8, z1 + 1.8);
  // on the roof: a penthouse of plant, and on it two rows of exhaust stacks
  const px0 = x0 + 1.4, px1 = x1 - 1.6, pz0 = z0 + 2.2, pz1 = z1 - 4.4;
  b.box(px0, H + 0.08, pz0, px1, H + 0.95, pz1, PLANT, { top: PLANT_TOP });
  for (const x of [px0 + 1.0, (px0 + px1) / 2, px1 - 1.0]) {
    for (let i = 0; i < 4; i++) {
      const z = pz0 + 1.0 + ((pz1 - pz0 - 2.0) * i) / 3;
      b.cyl(x, z, H + 0.95, H + 2.3, 0.22, 0.2, 6, 0xc2c5c9, { cap: DARK });
    }
  }
}

// ---------------------------------------------------------------------------
// Busey Hall and Evans Hall
// ---------------------------------------------------------------------------

/**
 * Busey Hall (1916) to the west and Evans Hall (1926) to the east: two Georgian
 * halls of red brick, three storeys under slate roofs with dormers, white trim,
 * joined by a lower range with a white porch on its south side.
 */
function buseyEvans(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, H = Math.round(l.h / RES) * RES, eave = H + 0.32, rise = 2.5, over = 0.25;
  const busey = { x0, x1: x0 + Math.round((x1 - x0) * 0.41) }, evans = { x0: x1 - Math.round((x1 - x0) * 0.44), x1 };
  const wing = (wx0: number, wx1: number, seed: number, id: string): void => {
    b.box(wx0, 0, z0, wx1, H, z1, BRICK.red, { win: ROOMS, seed, faces: 'NESW' });
    b.box(wx0 - 0.06, 0, z0 - 0.06, wx1 + 0.06, 0.5, z1 + 0.06, LIMESTONE, { faces: 'NESW' });
    band(b, wx0, z0, wx1, z1, RES - 0.07, RES + 0.07, 0.06, TRIM);
    b.box(wx0 - over, H, z0 - over, wx1 + over, eave, z1 + over, TRIM, { faces: 'NESWB' });
    hip(b, wx0, z0, wx1, z1, eave, rise, SLATE, over);
    // dormers on both slopes
    const up = 1.2, sill = eave + ((up + over) * rise) / ((z1 - z0) / 2 + over) - 0.15, n = 3;
    for (let i = 0; i < n; i++) {
      const x = wx0 + ((wx1 - wx0) * (i + 1)) / (n + 1);
      dormer(b, x, z1 - up, sill, 'S', SLATE);
      if (i !== 1) dormer(b, x, z0 + up, sill, 'N', SLATE);
    }
    for (const x of [wx0 + 2.4, wx1 - 2.4]) chimney(b, x, (z0 + z1) / 2, eave + rise - 1.2, eave + rise + 0.9, BRICK.deep);
    // the door, in the middle of its south side, in a white frame under a little pediment, and the hall's name over it
    const dx = (wx0 + wx1) / 2;
    b.box(dx - 1.0, 0, z1, dx + 1.0, 2.0, z1 + 0.18, TRIM, { faces: 'ESWT' });
    face3(b, [dx - 1.15, 2.0, z1 + 0.19], [dx + 1.15, 2.0, z1 + 0.19], [dx, 2.65, z1 + 0.19], [0, 0, 1], TRIM);
    b.box(dx - 1.15, 1.9, z1, dx + 1.15, 2.0, z1 + 0.19, TRIM, { faces: 'B' });
    door(b, 'S', dx, z1 + 0.18, 1.1, 0.5, 1.85, 1.2);
    nameBoard(k, id, 'S', dx, z1, RES + 0.95, 2.6, 0.6);
    k.lights.push({ x: dx, z: z1 + 1.0, r: 7, color: '#ffe2ae', k: 0.45 });
  };
  wing(busey.x0, busey.x1, 0.19, 'east-busey');
  wing(evans.x0, evans.x1, 0.43, 'east-evans');

  // the range between them, set back from both fronts and a storey lower
  const lz0 = z0 + 1.5, lz1 = z1 - 1.5, lh = 2 * RES, lx0 = busey.x1, lx1 = evans.x0;
  b.box(lx0, 0, lz0, lx1, lh, lz1, BRICK.red, { win: ROOMS, seed: 0.71, faces: 'NS' });
  b.box(lx0, lh, lz0 - 0.2, lx1, lh + 0.28, lz1 + 0.2, TRIM, { faces: 'NSB' });
  gable(b, lx0, lz0, lx1, lz1, lh + 0.28, 1.5, SLATE, BRICK.red, 'x', 0.2);

  // the porch on its south side: a floor of stone, four white columns, and a flat roof with a white rail on it
  const pz0 = lz1, pz1 = z1 - 0.1, py = 0.4, ptop = RES + 0.1;
  b.box(lx0 + 0.2, 0, pz0, lx1 - 0.2, py, pz1, LIMESTONE);
  const cols = 4;
  for (let i = 0; i < cols; i++) column(b, lx0 + 0.7 + ((lx1 - lx0 - 1.4) * i) / (cols - 1), pz1 - 0.35, py, ptop, 0.17);
  b.box(lx0 + 0.1, ptop, pz0, lx1 - 0.1, ptop + 0.35, pz1 + 0.05, TRIM, { faces: 'ESWTB' });
  b.box(lx0 + 0.15, ptop + 0.35, pz1 - 0.12, lx1 - 0.15, ptop + 0.85, pz1, TRIM, { faces: 'NESWT' });
  door(b, 'S', (lx0 + lx1) / 2, lz1, 1.4, py, py + 1.75);
  k.glows.push({ x: (lx0 + lx1) / 2, y: ptop - 0.15, z: (pz0 + pz1) / 2, sx: 0.4, sy: 0.12, sz: 0.4, color: '#ffe2ae' });
  k.lights.push({ x: (lx0 + lx1) / 2, z: z1 + 0.6, r: 7, color: '#ffe2ae', k: 0.5 });
  k.person((lx0 + lx1) / 2 - 0.6, pz0 + 0.6, py);
  k.person((lx0 + lx1) / 2 + 0.8, pz0 + 0.8, py);
  k.person(busey.x1 - 1.6, z1 + 0.3);
}

// ---------------------------------------------------------------------------
// The greenhouses, and Illini Grove
// ---------------------------------------------------------------------------

/** A low head house of brick along the north, and five glass houses side by side behind it, lit by growing lamps at night. */
function greenhouses(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, hd = 3, HW = 2.9;
  // the head house
  b.box(x0, 0, z0, x1, HW, z0 + hd, BRICK.red, { win: { cell: 1.6, storey: HW, lit: 0.4, kind: 0 }, seed: 0.33, faces: 'NEW' });
  b.box(x0 - 0.05, 0, z0 - 0.05, x1 + 0.05, 0.45, z0 + hd, LIMESTONE, { faces: 'NEW' });
  b.box(x0 - 0.18, HW, z0 - 0.18, x1 + 0.18, HW + 0.45, z0 + hd + 0.05, LIMESTONE, { faces: 'NESWTB', top: FELT });
  // its middle a little higher, with the door on the north, where the walk is
  const cx = (x0 + x1) / 2;
  b.box(cx - 1.8, 0, z0 - 0.3, cx + 1.8, HW + 1.0, z0 + hd - 0.5, BRICK.red, { faces: 'NEWS', top: FELT });
  b.box(cx - 1.95, HW + 1.0, z0 - 0.45, cx + 1.95, HW + 1.25, z0 + hd - 0.35, LIMESTONE, { faces: 'NESWTB', top: FELT });
  door(b, 'N', cx, z0 - 0.3, 1.4, 0, 2.2);
  chimney(b, x1 - 1.4, z0 + 1.4, HW + 0.45, HW + 1.5, BRICK.deep, 0.35, 0.35);
  k.lights.push({ x: cx, z: z0 - 1.6, r: 7, color: '#ffe2ae', k: 0.45 });

  // the glass houses: a knee wall of brick, walls of glass, a ridge roof of glass, and a white frame along the ridge
  const n = 5, gap = 0.25, w = (x1 - x0 - (n - 1) * gap) / n, gz0 = z0 + hd, wall = 2.4, rise = 1.5;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * (w + gap), c = a + w, m = (a + c) / 2;
    b.box(a, 0, gz0, c, wall, z1, GREEN_GLASS, { win: GROWING, seed: 0.1 + i * 0.13, faces: 'ESW' });
    b.box(a - 0.05, 0, gz0, c + 0.05, 0.6, z1 + 0.05, BRICK.red, { faces: 'ESWT', top: LIMESTONE });
    gable(b, a, gz0, c, z1, wall, rise, GREEN_GLASS, GREEN_GLASS, 'z', 0.06, { win: interior(1.0) });
    b.box(m - 0.07, wall + rise - 0.02, gz0, m + 0.07, wall + rise + 0.12, z1 + 0.1, TRIM, { faces: 'NESWT' });
    // a white frame at the south end, and a vent lifted open along the ridge
    b.box(a, wall - 0.06, z1, c, wall + 0.06, z1 + 0.06, TRIM, { faces: 'STB' });
    b.box(m - 0.05, 0.6, z1, m + 0.05, wall, z1 + 0.06, TRIM, { faces: 'SEW' });
    b.box(m + 0.1, wall + rise - 0.25, gz0 + 1.2, m + 0.9, wall + rise - 0.05, z1 - 1.2, GREEN_GLASS, { faces: 'NESWTB' });
    k.lights.push({ x: m, z: z1 + 1.2, r: 5, color: '#ffb36b', k: 0.35 });
  }
  // a water tank and a cart of pots by the west end, and two at work
  b.cyl(x0 - 0.9, z0 + 4, 0, 1.6, 0.6, 0.6, 8, 0x5f6b61);
  b.box(x1 + 0.3, 0.35, z1 - 3, x1 + 1.3, 0.75, z1 - 1.6, 0x7a7f86, { faces: 'NESWTB' });
  for (const z of [z1 - 2.9, z1 - 1.7]) b.box(x1 + 0.45, 0.75, z - 0.12, x1 + 1.15, 1.0, z + 0.12, 0x9a5b3a);
  k.person(x1 + 1.0, z1 - 0.8);
  k.person(x0 - 0.8, z1 - 1.5);
}

/** Illini Grove: a lawn with picnic tables, a small open shelter, and a few people. The main session plants its trees. */
function illiniGrove(k: Build): void {
  const g = AREAS.find((a) => a.id === 'illini-grove');
  if (!g) return;
  const b = k.b;
  const table = (x: number, z: number): void => {
    b.box(x - 0.9, 0.7, z - 0.38, x + 0.9, 0.78, z + 0.38, WOOD, { faces: 'NESWTB' });
    b.box(x - 0.1, 0, z - 0.1, x + 0.1, 0.7, z + 0.1, 0x6b5038, { faces: 'NESW' });
    for (const s of [-1, 1]) b.box(x - 0.85, 0, z + s * 0.68 - 0.14, x + 0.85, 0.44, z + s * 0.68 + 0.14, WOOD, { faces: 'NESWT' });
  };
  // the shelter, east of the middle: four posts, and a roof of two slopes with its underside
  const sx0 = g.x0 + (g.x1 - g.x0) * 0.58, sx1 = sx0 + 5.5, sz0 = g.z0 + 3, sz1 = sz0 + 4;
  for (const [x, z] of [[sx0, sz0], [sx1, sz0], [sx1, sz1], [sx0, sz1]]) b.box(x - 0.15, 0, z - 0.15, x + 0.15, 2.4, z + 0.15, WOOD, { faces: 'NESW' });
  b.box(sx0 - 0.4, 2.26, sz0 - 0.4, sx1 + 0.4, 2.38, sz1 + 0.4, 0x7a5c40, { faces: 'NESWB' });
  gable(b, sx0, sz0, sx1, sz1, 2.4, 1.1, 0x4f6b52, WOOD, 'x', 0.42);
  table((sx0 + sx1) / 2, (sz0 + sz1) / 2);
  k.person((sx0 + sx1) / 2 - 0.4, (sz0 + sz1) / 2 + 0.75);
  k.person((sx0 + sx1) / 2 + 0.5, (sz0 + sz1) / 2 - 0.75);
  // two tables out on the grass, and who is at them
  table(g.x0 + 5, g.z1 - 3.5);
  table(g.x0 + 10.5, g.z0 + 3.5);
  k.person(g.x0 + 4.4, g.z1 - 2.75);
  k.person(g.x0 + 5.8, g.z1 - 4.25);
  k.person(g.x0 + 11.2, g.z0 + 2.75);
  k.person(g.x1 - 3, g.z1 - 2.2);
  k.lights.push({ x: (sx0 + sx1) / 2, z: sz1 + 1.5, r: 8, color: '#ffe2ae', k: 0.35 });
}

// ---------------------------------------------------------------------------
// The Pennsylvania Avenue halls, and the Florida Avenue towers
// ---------------------------------------------------------------------------

/** Four low wings of rooms, one at each corner of the lot, round a dining hall of glass in the middle. */
function par(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, floors = Math.round(l.h / RES), H = floors * RES;
  const ww = Math.min(9.5, (x1 - x0) * 0.37), wd = Math.min(3.8, (z1 - z0) * 0.38);
  const wing = (wx0: number, wz0: number, wx1: number, wz1: number, seed: number, out: Side): void => {
    b.box(wx0, 0, wz0, wx1, H, wz1, PAR_BRICK, { win: ROOMS, seed, faces: 'NESW' });
    b.box(wx0 - 0.05, 0, wz0 - 0.05, wx1 + 0.05, 0.5, wz1 + 0.05, CONCRETE, { faces: 'NESW' });
    // a band of concrete at each floor, as such halls of the 1960s have
    for (let f = 1; f < floors; f++) band(b, wx0, wz0, wx1, wz1, f * RES - 0.06, f * RES + 0.06, 0.05, CONCRETE);
    b.box(wx0 - 0.12, H, wz0 - 0.12, wx1 + 0.12, H + 0.45, wz1 + 0.12, CONCRETE, { faces: 'NESWTB', top: FELT });
    // a tower of stairs at its outer end, a little higher than its roof, with a strip of glass up it
    const ex = wx0 < (x0 + x1) / 2 ? wx0 : wx1, s = ex === wx0 ? 'W' : 'E', zm = (wz0 + wz1) / 2;
    against(b, s, zm - 1.1, zm + 1.1, ex, -1.3, 0.3, 0, H + 0.8, PAR_BRICK, { faces: s === 'W' ? 'NSWT' : 'NSET', top: FELT });
    against(b, s, zm - 1.15, zm + 1.15, ex, -1.35, 0.35, H + 0.8, H + 1.0, CONCRETE, { faces: 'NESWTB' });
    against(b, s, zm - 0.45, zm + 0.45, ex, 0.3, 0.35, 0.5, H + 0.3, GLASS, { faces: s, win: interior(0.8) });
    // its door, on the courtyard side, under a flat canopy
    const wall = out === 'S' ? wz1 : wz0, a = (wx0 + wx1) / 2;
    against(b, out, a - 0.9, a + 0.9, wall, 0, 0.06, 0, RES - 0.3, GLASS, { faces: out, win: interior(1.2) });
    against(b, out, a - 1.3, a + 1.3, wall, 0, 0.9, RES - 0.28, RES - 0.1, CONCRETE, { faces: 'NESWTB' });
    // the lift's head on the roof
    b.box(wx0 + 1.5, H + 0.45, wz0 + 0.8, wx0 + 3, H + 1.0, wz1 - 0.8, PLANT, { top: PLANT_TOP });
  };
  wing(x0, z0, x0 + ww, z0 + wd, 0.12, 'S');
  wing(x0, z1 - wd, x0 + ww, z1, 0.34, 'N');
  wing(x1 - ww, z0, x1, z0 + wd, 0.56, 'S');
  wing(x1 - ww, z1 - wd, x1, z1, 0.78, 'N');
  // the dining hall: glass on every side under a broad white roof
  const dx0 = x0 + ww, dx1 = x1 - ww, dz0 = z0 + 1.2, dz1 = z1 - 1.2, dh = 3.2;
  b.box(dx0, 0, dz0, dx1, dh, dz1, GLASS, { win: { cell: 1.2, storey: dh, lit: 0.85, kind: 1 }, seed: 0.9, faces: 'NESW' });
  b.box(dx0 - 0.1, dh, dz0 - 0.5, dx1 + 0.1, dh + 0.4, dz1 + 0.5, TRIM, { faces: 'NESWTB', top: FELT });
  // the white posts that carry the roof's overhang
  for (let i = 0; i <= 3; i++) {
    const x = dx0 + 0.4 + ((dx1 - dx0 - 0.8) * i) / 3;
    for (const z of [dz0 - 0.35, dz1 + 0.35]) b.box(x - 0.1, 0, z - 0.1, x + 0.1, dh, z + 0.1, TRIM, { faces: 'NESW' });
  }
  b.box(dx0 + 1.5, dh + 0.4, dz0 + 1.5, dx1 - 1.5, dh + 1.0, dz1 - 1.5, PLANT, { top: PLANT_TOP });
  // the courtyards between the wings
  for (const [a, c] of [[x0 + 0.3, x0 + ww - 0.3], [x1 - ww + 0.3, x1 - 0.3]]) {
    area(k, rect(a, z0 + wd + 0.3, c, z1 - wd - 0.3), LAWN_GREEN, 0.035);
    area(k, rect((a + c) / 2 - 0.35, z0 + wd, (a + c) / 2 + 0.35, z1 - wd), WALK, 0.045);
    k.person(a + 1.5, z0 + wd + 0.9);
    k.person(c - 1.8, z1 - wd - 0.8);
  }
  // the name, high on the south side of the south-east wing, where the opening view sees it past Trelease
  nameBoard(k, 'east-par', 'S', x1 - ww / 2, z1, H - 1.8, 4.6, 1.1);
  k.lights.push({ x: (dx0 + dx1) / 2, z: dz1 + 1.2, r: 9, color: '#ffe9c4', k: 0.55 });
  k.lights.push({ x: (dx0 + dx1) / 2, z: dz0 - 1.2, r: 8, color: '#ffe9c4', k: 0.45 });
}

/**
 * Oglesby Hall and Trelease Hall: slabs of twelve storeys with flat roofs, alike.
 * A lobby of glass on the ground under a frame of concrete, the long sides a grid
 * of piers and bands with the rooms between, and the ends of plain brick with a
 * strip of windows up the middle.
 */
function tower(id: string, seed: number): Model {
  return (k, l) => {
    const b = k.b;
    const { x0, z0, x1, z1 } = l, H = 12 * FAR, xc = (x0 + x1) / 2, zc = (z0 + z1) / 2;
    // the lobby, set back under the floors above, and a pier of concrete at each corner
    b.box(x0 + 0.45, 0, z0 + 0.45, x1 - 0.45, FAR, z1 - 0.45, GLASS, { win: interior(1.1), faces: 'NESW' });
    for (const [x, z] of [[x0, z0], [x1 - 0.55, z0], [x1 - 0.55, z1 - 0.55], [x0, z1 - 0.55]]) b.box(x, 0, z, x + 0.55, FAR, z + 0.55, CONCRETE, { faces: 'NESW' });
    // the floors: the long sides with rooms, the ends plain, and the underside over the lobby
    b.box(x0, FAR, z0, x1, H, z1, FAR_BRICK, { win: FAR_ROOMS, seed, faces: 'EW' });
    b.box(x0, FAR, z0, x1, H, z1, FAR_BRICK, { faces: 'NSB' });
    // piers and bands of concrete on the long sides
    for (const [out, wall] of [['E', x1], ['W', x0]] as const) {
      for (let i = 0; i <= 4; i++) {
        const z = z0 + 0.15 + ((z1 - z0 - 0.3) * i) / 4;
        against(b, out, z - 0.15, z + 0.15, wall, 0, 0.16, FAR, H, CONCRETE, { faces: `${out}NS` });
      }
      for (let f = 2; f <= 11; f++) against(b, out, z0, z1, wall, 0, 0.1, f * FAR - 0.06, f * FAR + 0.06, CONCRETE, { faces: `${out}TB` });
    }
    // a strip of windows up the middle of each end, where the stairs and lounges are
    for (const [out, wall] of [['S', z1], ['N', z0]] as const) against(b, out, xc - 0.65, xc + 0.65, wall, 0, 0.05, FAR * 2, H - 0.1, GLASS, { faces: out, win: { cell: 1.3, storey: FAR, lit: 0.5, kind: 0 } });
    // the roof: a band of concrete, and the head of the lifts
    b.box(x0 - 0.08, H, z0 - 0.08, x1 + 0.08, H + 0.5, z1 + 0.08, CONCRETE, { faces: 'NESWTB', top: FELT });
    b.box(xc - 1.5, H + 0.5, zc - 2, xc + 1.5, H + 1.35, zc + 1.4, CONCRETE, { top: FELT });
    b.box(xc - 1.0, H + 0.5, zc + 2.0, xc + 1.0, H + 0.95, zc + 3.4, PLANT, { top: PLANT_TOP });
    b.cyl(xc + 0.9, zc - 1.2, H + 1.35, H + 2.6, 0.06, 0.04, 4, 0xc9ccd2, { cap: false });
    // the door on the south, under a canopy, and the hall's name over it
    against(b, 'S', xc - 1.6, xc + 1.6, z1, 0, 1.0, FAR - 0.02, FAR + 0.18, CONCRETE, { faces: 'NESWTB' });
    door(b, 'S', xc, z1 - 0.45, 1.6, 0, FAR - 0.1, 1.4);
    nameBoard(k, id, 'S', xc, z1 + 0.05, FAR + 0.62, 2.9, 0.55);
    k.lights.push({ x: xc, z: z1 + 1.6, r: 8, color: '#ffe2ae', k: 0.5 });
    k.person(xc - 1.0, z1 + 1.4);
    k.person(xc + 1.3, z1 + 0.9);
  };
}

/** The low hall between Oglesby and Trelease, where the two share their lobby and dining room. */
function farCommons(k: Build): void {
  const a = lot('oglesby'), c = lot('trelease');
  if (c.x0 - a.x1 < 3) return;
  const b = k.b, x0 = a.x1, x1 = c.x0, z0 = a.z0 + 2, z1 = a.z1 - 2.5, h = 3.2;
  b.box(x0, 0, z0, x1, h, z1, FAR_BRICK, { faces: 'NS' });
  against(b, 'S', x0 + 0.5, x1 - 0.5, z1, 0, 0.05, 0.3, h - 0.5, GLASS, { faces: 'S', win: { cell: 1.1, storey: h, lit: 0.85, kind: 1 } });
  against(b, 'N', x0 + 0.5, x1 - 0.5, z0, 0, 0.05, 0.3, h - 0.5, GLASS, { faces: 'N', win: { cell: 1.1, storey: h, lit: 0.85, kind: 1 } });
  b.box(x0, h, z0 - 0.3, x1, h + 0.35, z1 + 0.3, CONCRETE, { faces: 'NSTB', top: FELT });
  k.lights.push({ x: (x0 + x1) / 2, z: z1 + 1.4, r: 7, color: '#ffe9c4', k: 0.5 });
  k.person((x0 + x1) / 2 + 0.8, z1 + 1.1);
}

// ---------------------------------------------------------------------------
// The Round Barns
// ---------------------------------------------------------------------------

/**
 * One of the three round barns of the dairy farm: a wall of white siding on a
 * low base of concrete, a roof of shingle that curves up from its eaves to a
 * cupola, and a big door on its south side under a hood. They are built alike
 * but not the same: the first has its silo standing up through its roof, the
 * second a silo beside it, and the third, the largest, a wing.
 */
function roundBarn(kind: 1 | 2 | 3): Model {
  return (k, l) => {
    const b = k.b;
    const cx = (l.x0 + l.x1) / 2 + (kind === 3 ? 0.25 : 0), cz = (l.z0 + l.z1) / 2 + (kind === 3 ? 0.25 : 0);
    const r = Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2 - (kind === 3 ? 0.4 : 0.55), sides = 12;
    const wall = 3.9 + (kind === 3 ? 0.3 : 0), top = l.h - (kind === 2 ? 0.9 : 0.6);
    b.cyl(cx, cz, 0, 0.55, r + 0.08, r + 0.08, sides, SILO, { cap: false });
    b.cyl(cx, cz, 0.55, wall, r, r, sides, BARN_WHITE, { win: BARN_WIN, seed: kind * 0.21, cap: false });
    // the roof: it flares out over the eaves, then curves up, flattening towards the top
    const rise = top - wall;
    lathe(b, cx, cz, [[r + 0.38, wall - 0.05], [r * 0.86, wall + rise * 0.42], [r * 0.56, wall + rise * 0.78], [r * 0.22, top]], sides, SHINGLE);
    b.cyl(cx, cz, wall - 0.25, wall - 0.05, r + 0.38, r + 0.38, sides, BARN_WHITE, { cap: false });
    b.cyl(cx, cz, top - 0.02, top, r * 0.22, r * 0.22, sides, SHINGLE);
    if (kind === 1) {
      // the silo comes up through the roof, with a cap of its own
      b.cyl(cx, cz, top - 0.5, top + 0.65, 0.85, 0.85, 10, SILO, { cap: false });
      lathe(b, cx, cz, [[0.95, top + 0.65], [0.7, top + 1.1], [0.2, top + 1.4]], 10, SHINGLE);
    } else {
      // a cupola of white louvres with a pointed cap
      b.cyl(cx, cz, top, top + 0.7, 0.5, 0.5, 8, BARN_WHITE, { win: { cell: 0.3, storey: 0.35, lit: 0.1, kind: 6 }, cap: false });
      b.cyl(cx, cz, top + 0.7, top + 1.3, 0.7, 0.04, 8, SHINGLE, { cap: false });
    }
    // the big door on the south, and the hood over the hay door above it
    const fz = cz + r * Math.cos(Math.PI / sides);
    b.box(cx - 0.9, 0.05, fz - 0.05, cx + 0.9, 2.5, fz + 0.12, BARN_DOOR, { faces: 'NESWT' });
    b.box(cx - 0.95, 2.5, fz - 0.05, cx + 0.95, 2.62, fz + 0.15, BARN_WHITE, { faces: 'ESWTB' });
    for (const s of [-1, 1]) b.beam([cx - 0.85 * s, 0.1, fz + 0.13], [cx + 0.85 * s, 2.45, fz + 0.13], 0.05, 0.05, BARN_WHITE);
    dormer(b, cx, fz + 0.32, wall + 0.05, 'S', SHINGLE, 1.2, 1.0, 1.4);
    if (kind === 2) {
      // its silo, beside it to the north-east
      const sx = cx + r * 0.8, sz = cz - r * 0.8;
      b.cyl(sx, sz, 0, top + 0.1, 0.95, 0.95, 10, SILO, { cap: false });
      lathe(b, sx, sz, [[1.0, top + 0.1], [0.75, top + 0.55], [0.2, top + 0.85]], 10, SHINGLE);
    }
    if (kind === 3) {
      // its wing, to the west, under a roof of two slopes
      const wx0 = l.x0 + 0.1, wx1 = cx - r * 0.6, wz0 = cz - 1.4, wz1 = cz + 1.4;
      b.box(wx0, 0, wz0, wx1, 2.6, wz1, BARN_WHITE, { win: BARN_WIN, seed: 0.77, faces: 'NSW' });
      gable(b, wx0, wz0, wx1, wz1, 2.6, 1.2, SHINGLE, BARN_WHITE, 'x', 0.25);
      b.box(wx0 + 0.6, 0.05, wz1, wx0 + 1.7, 2.0, wz1 + 0.08, BARN_DOOR, { faces: 'SEWT' });
    }
    k.lights.push({ x: cx, z: fz + 1.8, r: 6, color: '#ffe2ae', k: 0.4 });
    k.glows.push({ x: cx, y: 2.85, z: fz + 0.35, sx: 0.25, sy: 0.2, sz: 0.2, color: '#ffe2ae' });
  };
}

/** The barns' yard: a white fence along its south and east, a gate with the board over it, cows, and bales. */
function barnyard(k: Build): void {
  const b = k.b;
  const a = lot('round-barn-1'), m = lot('round-barn-2'), c = lot('round-barn-3');
  const x0 = a.x0 - 1.5, x1 = c.x1 + 1.5, z0 = Math.min(a.z0, c.z0) - 1.8, z1 = m.z1 + 1.8;
  const FENCE = 0xf0ede4;
  // the pasture the barns stand in, and a track of beaten earth from the gate to the middle barn's door
  area(k, rect(x0, z0, x1, z1), 0x7fa760, 0.035);
  area(k, rect((m.x0 + m.x1) / 2 - 1.1, m.z1 - 0.5, (m.x0 + m.x1) / 2 + 1.1, z1), 0xb39b74, 0.045);
  const rail = (xa: number, za: number, xb: number, zb: number): void => {
    const along = Math.abs(xb - xa) > Math.abs(zb - za);
    for (const y of [0.45, 0.85]) {
      if (along) b.box(Math.min(xa, xb), y, za - 0.05, Math.max(xa, xb), y + 0.1, za + 0.05, FENCE, { faces: 'NSTB' });
      else b.box(xa - 0.05, y, Math.min(za, zb), xa + 0.05, y + 0.1, Math.max(za, zb), FENCE, { faces: 'EWTB' });
    }
    const n = Math.max(1, Math.round(Math.hypot(xb - xa, zb - za) / 4.5));
    for (let i = 0; i <= n; i++) {
      const x = xa + ((xb - xa) * i) / n, z = za + ((zb - za) * i) / n;
      b.box(x - 0.08, 0, z - 0.08, x + 0.08, 1.05, z + 0.08, FENCE, { faces: 'NESWT' });
    }
  };
  // the gate is in the south fence, before the middle barn
  const g = (m.x0 + m.x1) / 2, gw = 1.8;
  rail(x0, z1, g - gw, z1);
  rail(g + gw, z1, x1, z1);
  rail(x1, z0, x1, z1);
  // the gate, swung half open, and the board over the way in
  b.obox(g - gw + 0.9 * Math.cos(0.5), 0.65, z1 + 0.9 * Math.sin(0.5), 0.9, 0.3, 0.05, 0.5, FENCE);
  for (const s of [-1, 1]) b.box(g + s * gw - 0.1, 0, z1 - 0.1, g + s * gw + 0.1, 2.9, z1 + 0.1, WOOD, { faces: 'NESWT' });
  b.box(g - gw + 0.1, 2.25, z1 - 0.06, g + gw - 0.1, 2.85, z1 + 0.06, WOOD, { faces: 'NESWTB' });
  k.sign('east-round-barns', g, 2.55, z1 + 0.09, 0, 1, 0.5, 2 * gw - 0.4);

  // cows: a body, a head, legs, and patches of black on white
  const cow = (x: number, z: number, yaw: number, patch: number): void => {
    b.moved(x, 0, z, yaw, () => {
      b.box(-0.7, 0.55, -0.32, 0.7, 1.2, 0.32, 0xf2efe8, { faces: 'NESWTB' });
      b.box(-0.2, 0.9, -0.33, 0.35, 1.21, 0.33, patch, { faces: 'NSTB' });
      b.box(0.7, 0.85, -0.2, 1.1, 1.25, 0.2, patch, { faces: 'NESWTB' });
      for (const lx of [-0.55, 0.5]) b.box(lx - 0.1, 0, -0.27, lx + 0.1, 0.55, 0.27, 0xe8e4dc, { faces: 'NESW' });
    });
  };
  cow(a.x1 + 1.2, a.z1 + 1.6, 0.4, 0x24262a);
  cow(m.x1 + 1.4, c.z1 + 1.8, -2.6, 0x3a2f2a);
  cow(c.x0 + 1.0, c.z0 - 0.8, 3.0, 0x24262a);
  // bales of hay by the first barn
  for (const [x, z, y] of [[a.x0 + 0.3, a.z1 + 0.8, 0], [a.x0 + 1.4, a.z1 + 0.8, 0], [a.x0 + 0.85, a.z1 + 0.8, 0.55]]) {
    b.box(x - 0.5, y, z - 0.32, x + 0.5, y + 0.55, z + 0.32, HAY, { faces: 'NESWT' });
  }
  k.person(g + 0.6, z1 - 1.2);
  k.person(c.x0 - 0.6, c.z1 + 0.8);
}

// ---------------------------------------------------------------------------

export const MODELS: Record<string, Model> = {
  krannert,
  adams,
  clsl,
  'busey-evans': buseyEvans,
  greenhouses,
  par,
  oglesby: tower('east-oglesby', 0.27),
  trelease: tower('east-trelease', 0.63),
  'round-barn-1': roundBarn(1),
  'round-barn-2': roundBarn(2),
  'round-barn-3': roundBarn(3),
};

export function extras(k: Build): void {
  illiniGrove(k);
  farCommons(k);
  barnyard(k);
  // the link between Roger Adams Laboratory and the laboratory added to it: two storeys of glass across the walk
  const ad = lot('adams'), cl = lot('clsl');
  if (cl.z0 - ad.z1 > 0.5) {
    const xm = (Math.max(ad.x0, cl.x0) + Math.min(ad.x1, cl.x1)) / 2;
    k.b.box(xm - 1.5, 0, ad.z1, xm + 1.5, 2 * CL, cl.z0, GLASS, { win: { cell: 1.0, storey: CL, lit: 0.75, kind: 1 }, seed: 0.5, faces: 'EW' });
    k.b.box(xm - 1.6, 2 * CL, ad.z1, xm + 1.6, 2 * CL + 0.3, cl.z0, PRECAST, { faces: 'EWT', top: FELT });
  }
}
