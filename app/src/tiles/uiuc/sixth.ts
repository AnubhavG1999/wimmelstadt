// Between Fourth Street and Wright Street: the Armory, the Ice Arena, the
// bookstore, Illini Tower, Sherman Hall, the deck at Sixth and John, and the
// Illini Hall site.
//
// The Armory (1914) is the great one: a drill hall under one barrel vault of
// aluminium, with no support in its middle, its two ends glazed, and the
// two-storey ranges of red brick that Platt wrapped round it in 1927, with
// rusticated arched entries and a pavilion at each corner. On the paving south
// of it the marching band is forming up. The others are drawn as they stand:
// a rink of 1931 under a long roof with a Georgian front, a bookstore of 1994
// with shop windows on Wright Street, two towers of the 1960s, a parking deck
// whose roof carries two parked cars, and a building site with a tower crane.

import { interior, rng, type V3, type WinSpec } from '../../engine/geo';
import { area, rect } from '../../engine/ground';
import { figure, lantern, type Dress } from '../../engine/parts';
import { face3, gable, hip, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { BASE, BRICK, BRONZE, DARK, FELT, GLASS, GLAZED, HALL, HALL_NARROW, IRON, LIMESTONE, NAVY, ORANGE, SLATE, STOREY, TRIM, VERDIGRIS, chimney, dormer, steps } from './look';
import type { LotDef, Model } from './plan';

// --- colours of this file's own (worth moving to look.ts if another file wants them) ---

/** The Armory's roof of aluminium, its underside, and the light steel of its glazing bars. */
const ALUMINIUM = 0xbfc4c9, ALU_UNDER = 0x8e939a, FRAME = 0xe2e4e6;
/** Poured concrete, the top of a parking deck, and the concrete of the 1960s towers. */
const CONCRETE = 0xbdb8ae, DECK_TOP = 0x9d9a94, PRECAST = 0xd9d2c1;
/** The building site: plywood hoarding, raw earth, sand, primed steel, and the yellow of the crane and the digger. */
const PLYWOOD = 0xcdb68c, EARTH = 0x9a8466, SAND = 0xe0c98f, PRIMER = 0xc77a5f, CRANE = 0xf2c230, CABIN = 0xeef0ee;
/** The skin of the band's faces, and white. */
const SKIN = 0xe8c4a0, WHITE = 0xf6f4ee;

/** Names as plain lettering on plain boards: white with navy letters for the university's own buildings. */
const board = (id: string, text: string, color = '#f3f0e7', ink = '#13294b', real = true): SignDef => {
  const aspect = Math.max(1, text.length * 0.62);
  return { id, lines: [text], color, ink, aspect, kind: 'board', real, size: [Math.round(52 * aspect), 52] };
};

export const SIGNS: SignDef[] = [
  board('sixth-armory', 'ARMORY'),
  board('sixth-ice-arena', 'ICE ARENA'),
  board('sixth-bookstore', 'ILLINI UNION BOOKSTORE'),
  board('sixth-sherman', 'SHERMAN HALL'),
  // a private hall: its name in plain dark letters on a light board, no colours of its own
  board('sixth-illini-tower', 'ILLINI TOWER', '#ecebe6', '#2a2d33'),
  { id: 'sixth-deck-p', lines: ['P'], color: '#1f4f9c', ink: '#ffffff', aspect: 1, kind: 'board', size: [52, 52] },
];

/** A name board on a wall that faces (nx, nz): a thin white box proud of the wall, the sign 0.03 in front of it. */
function nameBoard(k: Build, id: string, x: number, y: number, z: number, nx: number, nz: number, h: number, w: number, color = TRIM): void {
  const d = 0.1, hw = w / 2 + 0.12, hh = h / 2 + 0.08;
  if (nz !== 0) k.b.box(x - hw, y - hh, nz > 0 ? z : z - d, x + hw, y + hh, nz > 0 ? z + d : z, color, { faces: nz > 0 ? 'SEWTB' : 'NEWTB' });
  else k.b.box(nx > 0 ? x : x - d, y - hh, z - hw, nx > 0 ? x + d : x, y + hh, z + hw, color, { faces: nx > 0 ? 'ENSTB' : 'WNSTB' });
  k.sign(id, x + nx * (d + 0.03), y, z + nz * (d + 0.03), nx, nz, h, w);
}

/** A half circle of triangles, upright in a wall that faces (nx, nz): the head of an arched door or window. */
function arch(k: Build, x: number, y: number, z: number, r: number, nx: number, nz: number, color: number, lit: number, n = 6): void {
  const ax = nz !== 0 ? 1 : 0, az = nx !== 0 ? 1 : 0;
  const p = (i: number): V3 => {
    const a = (Math.PI * i) / n;
    return [x + ax * Math.cos(a) * r, y + Math.sin(a) * r, z + az * Math.cos(a) * r];
  };
  for (let i = 0; i < n; i++) face3(k.b, [x, y, z], p(i), p(i + 1), [nx, 0, nz], color, { win: interior(lit) });
}

// ---------------------------------------------------------------------------
// The Armory
// ---------------------------------------------------------------------------

/**
 * The vault: half an ellipse across z, the same all along x, from `xa` to
 * `xb`. It stands on the ground in principle, `hs` to each side of `zc` and
 * `H` high at its crown, and is built only from height `from` up, where it
 * comes out of the roof of the ranges round it. `T` is how thick it is.
 */
const vaultAt = (zc: number, hs: number, H: number, t: number, inset = 0): [number, number] =>
  [zc - (hs - inset) * Math.cos(t), (H - inset) * Math.sin(t)];

function vault(k: Build, xa: number, xb: number, zc: number, hs: number, H: number, from: number, n: number, T: number): void {
  const b = k.b, t0 = Math.asin(from / H);
  for (let i = 0; i < n; i++) {
    const ta = t0 + ((Math.PI - 2 * t0) * i) / n, tb = t0 + ((Math.PI - 2 * t0) * (i + 1)) / n, tm = (ta + tb) / 2;
    const [za, ya] = vaultAt(zc, hs, H, ta), [zb, yb] = vaultAt(zc, hs, H, tb);
    const [zai, yai] = vaultAt(zc, hs, H, ta, T), [zbi, ybi] = vaultAt(zc, hs, H, tb, T);
    const nl = Math.hypot(hs * Math.sin(tm), H * Math.cos(tm));
    const nrm: V3 = [0, (hs * Math.sin(tm)) / nl, (-H * Math.cos(tm)) / nl];
    b.quad([xa, ya, za], [xb, ya, za], [xb, yb, zb], [xa, yb, zb], nrm, ALUMINIUM);
    b.quad([xa, yai, zai], [xb, yai, zai], [xb, ybi, zbi], [xa, ybi, zbi], [-nrm[0], -nrm[1], -nrm[2]], ALU_UNDER);
    for (const [x, s] of [[xa, -1], [xb, 1]] as const) b.quad([x, ya, za], [x, yb, zb], [x, ybi, zbi], [x, yai, zai], [s, 0, 0], ALUMINIUM);
  }
}

/** A rib across the vault at `x`: a band a little proud of the roof, where its sheets are joined over each arch inside. */
function rib(k: Build, x: number, zc: number, hs: number, H: number, from: number, n: number, color: number): void {
  const b = k.b, t0 = Math.asin(from / H), w = 0.09, up = 0.07;
  for (let i = 0; i < n; i++) {
    const ta = t0 + ((Math.PI - 2 * t0) * i) / n, tb = t0 + ((Math.PI - 2 * t0) * (i + 1)) / n, tm = (ta + tb) / 2;
    const [za, ya] = vaultAt(zc, hs, H, ta, -0.01), [zb, yb] = vaultAt(zc, hs, H, tb, -0.01);
    const [zA, yA] = vaultAt(zc, hs, H, ta, -up), [zB, yB] = vaultAt(zc, hs, H, tb, -up);
    const nl = Math.hypot(hs * Math.sin(tm), H * Math.cos(tm));
    b.quad([x - w, yA, zA], [x + w, yA, zA], [x + w, yB, zB], [x - w, yB, zB], [0, (hs * Math.sin(tm)) / nl, (-H * Math.cos(tm)) / nl], color);
    for (const s of [-1, 1]) b.quad([x + s * w, ya, za], [x + s * w, yb, zb], [x + s * w, yB, zB], [x + s * w, yA, zA], [s, 0, 0], color);
  }
}

/** A rusticated arched entry in limestone, standing out from a wall at `wall` that faces (nx, nz), with its door lit from within. */
function entry(k: Build, along: number, wall: number, nx: number, nz: number, w = 3.0, top = 4.6): void {
  const b = k.b, out = 0.25, half = w / 2, r = 0.85, spring = 2.55;
  const face = wall + (nx + nz) * out;
  if (nz !== 0) {
    const [za, zb] = nz > 0 ? [wall - 0.1, face] : [face, wall + 0.1];
    b.box(along - half, 0, za, along + half, top, zb, LIMESTONE, { faces: 'NESWT' });
    // the rustication: two deeper joints across the stone, and a keystone
    for (const y of [1.3, 2.4]) b.box(along - half - 0.04, y, nz > 0 ? face - 0.05 : face - 0.03, along + half + 0.04, y + 0.08, nz > 0 ? face + 0.03 : face + 0.05, BASE, { faces: nz > 0 ? 'SEWT' : 'NEWT' });
    const fz = face + nz * 0.02;
    b.box(along - r, 0, nz > 0 ? face : fz, along + r, spring, nz > 0 ? fz : face, DARK, { faces: nz > 0 ? 'S' : 'N', win: interior(1.3) });
    arch(k, along, spring, fz, r, 0, nz, DARK, 1.3);
    b.box(along - 0.22, spring + r - 0.1, nz > 0 ? face : face - 0.1, along + 0.22, spring + r + 0.15, nz > 0 ? face + 0.1 : face, LIMESTONE, { faces: nz > 0 ? 'SEWT' : 'NEWT' });
  } else {
    const [xa, xb] = nx > 0 ? [wall - 0.1, face] : [face, wall + 0.1];
    b.box(xa, 0, along - half, xb, top, along + half, LIMESTONE, { faces: 'NESWT' });
    for (const y of [1.3, 2.4]) b.box(nx > 0 ? face - 0.05 : face - 0.03, y, along - half - 0.04, nx > 0 ? face + 0.03 : face + 0.05, y + 0.08, along + half + 0.04, BASE, { faces: nx > 0 ? 'ENST' : 'WNST' });
    const fx = face + nx * 0.02;
    b.box(nx > 0 ? face : fx, 0, along - r, nx > 0 ? fx : face, spring, along + r, DARK, { faces: nx > 0 ? 'E' : 'W', win: interior(1.3) });
    arch(k, fx, spring, along, r, nx, 0, DARK, 1.3);
    b.box(nx > 0 ? face : face - 0.1, spring + r - 0.1, along - 0.22, nx > 0 ? face + 0.1 : face, spring + r + 0.15, along + 0.22, LIMESTONE, { faces: nx > 0 ? 'ENST' : 'WNST' });
  }
}

function armory(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1, h } = l, cx = (x0 + x1) / 2, zc = (z0 + z1) / 2;
  /** The ranges round the hall: two storeys of brick under a white cornice, standing a little in from the lot's edge. */
  const WR = 2 * STOREY, ROOF = WR + 0.45, IN = 0.2;
  /** The corner pavilions: how far each reaches along the sides, and how high it stands. */
  const PX = 2.4, PZ = 2.2, PH = 7.5;
  /** The vault: half its span, and where along x it begins and ends. It stops short of the corner pavilions. */
  const HS = (z1 - z0) / 2 - 0.6, VA = x0 + PX + 0.2, VB = x1 - PX - 0.2, T = 0.3, N = 16;

  // the ranges: brick with windows, a stone base, a white band where the upper storey begins, and the cornice whose top is their flat roof
  b.box(x0 + IN, 0, z0 + IN, x1 - IN, WR, z1 - IN, BRICK.red, { win: HALL, seed: 0.57, faces: 'NESW' });
  b.box(x0 + IN - 0.1, 0, z0 + IN - 0.1, x1 - IN + 0.1, 0.65, z1 - IN + 0.1, BASE, { faces: 'NESWT' });
  b.box(x0 + IN - 0.06, STOREY - 0.08, z0 + IN - 0.06, x1 - IN + 0.06, STOREY + 0.08, z1 - IN + 0.06, TRIM, { faces: 'NESWTB' });
  b.box(x0 + IN - 0.15, WR, z0 + IN - 0.15, x1 - IN + 0.15, ROOF, z1 - IN + 0.15, TRIM, { faces: 'NESWTB', top: FELT });
  // a low white balustrade along the cornice, between the pavilions
  for (const [za, zb] of [[z0 + IN, z0 + IN + 0.2], [z1 - IN - 0.2, z1 - IN]]) b.box(x0 + PX + 0.05, ROOF, za, x1 - PX - 0.05, ROOF + 0.45, zb, TRIM, { faces: 'NESWT' });
  for (const [xa, xb] of [[x0 + IN, x0 + IN + 0.2], [x1 - IN - 0.2, x1 - IN]]) b.box(xa, ROOF, z0 + PZ + 0.05, xb, ROOF + 0.45, z1 - PZ - 0.05, TRIM, { faces: 'NESWT' });

  // the pavilions at the four corners, a storey higher than the ranges, with stone quoins and a low roof of slate
  for (const [xa, xb, sx] of [[x0, x0 + PX, -1], [x1 - PX, x1, 1]] as const) {
    for (const [za, zb, sz] of [[z0, z0 + PZ, -1], [z1 - PZ, z1, 1]] as const) {
      b.box(xa, 0, za, xb, WR, zb, BRICK.red, { win: HALL_NARROW, seed: 0.21, faces: 'NESW' });
      b.box(xa, WR, za, xb, PH - 0.35, zb, BRICK.red, { faces: 'NESW' });
      b.box(xa - 0.08, 0, za - 0.08, xb + 0.08, 0.7, zb + 0.08, BASE, { faces: 'NESWT' });
      b.box(xa - 0.12, PH - 0.35, za - 0.12, xb + 0.12, PH, zb + 0.12, LIMESTONE, { faces: 'NESWTB' });
      hip(b, xa, za, xb, zb, PH, 1.1, SLATE, 0.05);
      // the quoins, on the two corners that face out
      const qx = sx < 0 ? xa : xb, qz = sz < 0 ? za : zb;
      b.box(qx - 0.18, 0.7, qz - 0.18 * (sz < 0 ? 1 : 1), qx + 0.18, PH - 0.35, qz + 0.18, LIMESTONE, { faces: 'NESW' });
      // and a stone panel on each outer face, where a window would be on the storey over the ranges
      const pz = sz < 0 ? za - 0.04 : zb, px = sx < 0 ? xa - 0.04 : xb;
      b.box((xa + xb) / 2 - 0.5, WR + 0.25, pz, (xa + xb) / 2 + 0.5, PH - 0.6, pz + 0.04, LIMESTONE, { faces: sz < 0 ? 'NEWT' : 'SEWT' });
      b.box(px, WR + 0.25, (za + zb) / 2 - 0.5, px + 0.04, PH - 0.6, (za + zb) / 2 + 0.5, LIMESTONE, { faces: sx < 0 ? 'WNST' : 'ENST' });
    }
  }

  // the vault, with its ribs, and the flat walk along its crown
  vault(k, VA, VB, zc, HS, h, ROOF - 0.15, N, T);
  const RIBS = 6;
  for (let i = 1; i < RIBS; i++) rib(k, VA + ((VB - VA) * i) / RIBS, zc, HS, h, ROOF - 0.1, N, FRAME);
  b.box(VA + 0.4, h - 0.02, zc - 0.32, VB - 0.4, h + 0.1, zc + 0.32, IRON, { faces: 'NESWT' });

  // the two ends: a half round of glass under the vault, in a grid of light steel, lit at night
  const G = 0.32, GH = h - G, GS = HS - G, base = ROOF + 0.02;
  for (const [xg, s] of [[VA + 0.3, -1], [VB - 0.3, 1]] as const) {
    const tg = Math.asin(base / GH), n = N;
    const pt = (i: number): V3 => {
      const t = tg + ((Math.PI - 2 * tg) * i) / n;
      return [xg, Math.max(base, GH * Math.sin(t)), zc - GS * Math.cos(t)];
    };
    for (let i = 0; i < n; i++) face3(b, [xg, base, zc], pt(i), pt(i + 1), [s, 0, 0], GLASS, { win: interior(1.1) });
    // the upright bars, and two across
    for (let j = -3; j <= 3; j++) {
      const z = zc + j * 1.45, top = GH * Math.sqrt(Math.max(0, 1 - ((z - zc) / GS) ** 2)) - 0.05;
      b.box(xg - 0.07, base, z - 0.07, xg + 0.07, top, z + 0.07, FRAME, { faces: 'NESW' });
    }
    for (const y of [base + 2.2, base + 4.1]) {
      const zw = GS * Math.sqrt(Math.max(0, 1 - (y / GH) ** 2)) - 0.08;
      b.box(xg - 0.07, y - 0.07, zc - zw, xg + 0.07, y + 0.07, zc + zw, FRAME, { faces: 'EWTB' });
    }
    // a stone sill under the glass
    b.box(xg - 0.2, ROOF, zc - GS * Math.cos(tg) - 0.1, xg + 0.2, ROOF + 0.12, zc + GS * Math.cos(tg) + 0.1, LIMESTONE, { faces: 'NESWT' });
  }

  // the arched entries: in the middle of each long side, and at each end
  entry(k, cx, z1 - IN, 0, 1);
  entry(k, cx, z0 + IN, 0, -1);
  entry(k, zc, x1 - IN, 1, 0);
  entry(k, zc, x0 + IN, -1, 0);
  // its name, over the south door, which is the side the opening view sees
  nameBoard(k, 'sixth-armory', cx, 4.05, z1 - IN + 0.25, 0, 1, 0.46, 2.4);
  // a lamp each side of the south door, on the wall
  for (const x of [cx - 1.85, cx + 1.85]) k.glows.push({ x, y: 3.0, z: z1 - IN + 0.3, sx: 0.28, sy: 0.4, sz: 0.2, color: '#ffe2ae' });
  k.lights.push({ x: cx, z: z1 + 2.5, r: 13, color: '#ffe2ae', k: 0.6 });
  k.lights.push({ x: x1 + 0.5, z: zc, r: 10, color: '#ffe2ae', k: 0.45 });
  k.lights.push({ x: x0 + 5, z: z1 + 2, r: 9, color: '#ffe2ae', k: 0.4 });

  band(k, l, IN);
}

// ---------------------------------------------------------------------------
// The marching band, forming up on the paving south of the Armory
// ---------------------------------------------------------------------------

type Kit = 'horn' | 'snare' | 'bass' | 'tuba' | 'none';

/**
 * One of the band, facing east: a navy coat with orange shoulders and a white
 * front, a tall navy hat whose top is the white of its plume, and what it
 * carries. Built facing +z and turned, so its shoulders lie across its way.
 */
function bandsman(k: Build, x: number, z: number, kit: Kit): void {
  const b = k.b;
  b.moved(x, 0, z, -Math.PI / 2, () => {
    b.box(-0.36, 0, -0.22, 0.36, 1.9, 0.22, NAVY, { top: ORANGE });
    b.quad([-0.14, 1.0, 0.24], [0.14, 1.0, 0.24], [0.14, 1.82, 0.24], [-0.14, 1.82, 0.24], [0, 0, 1], WHITE);
    b.box(-0.21, 1.9, -0.21, 0.21, 2.28, 0.21, SKIN, { faces: 'NESW' });
    b.box(-0.24, 2.24, -0.24, 0.24, 3.0, 0.24, NAVY, { top: WHITE });
    if (kit === 'horn') b.box(-0.08, 1.48, 0.22, 0.08, 1.7, 0.75, 0xe2b84e, { faces: 'ESWT' });
    else if (kit === 'snare') b.cyl(0, 0.5, 0.95, 1.25, 0.27, 0.27, 6, WHITE, { cap: 0xdedad0 });
    else if (kit === 'bass') b.cyl(0, 0.55, 0.75, 1.5, 0.42, 0.42, 6, WHITE, { cap: NAVY });
    else if (kit === 'tuba') b.cyl(0.25, 0, 2.2, 2.95, 0.16, 0.5, 6, 0xe2b84e, { cap: 0x6b5520 });
  });
}

function band(k: Build, l: LotDef, inset: number): void {
  const b = k.b;
  // four rows of five, facing east, between the south wall and the edge of the paving
  const south = l.z1 - inset;
  const rows = [0, 1, 2, 3].map((i) => south + 0.75 + i * 0.85);
  const files = [0, 1, 2, 3, 4].map((j) => l.x0 + 2.6 + j * 1.2);
  // the back file has the tubas and the bass drums, then the snares, and the horns in front
  const kits: Kit[][] = [
    ['tuba', 'bass', 'bass', 'tuba'],
    ['snare', 'snare', 'snare', 'snare'],
    ['horn', 'horn', 'horn', 'horn'],
    ['horn', 'horn', 'horn', 'horn'],
    ['horn', 'none', 'horn', 'horn'],
  ];
  files.forEach((x, j) => rows.forEach((z, i) => bandsman(k, x, z, kits[j][i])));
  // the drum major in front, in white, with a tall hat and a mace
  const dx = files[4] + 1.7, dz = (rows[1] + rows[2]) / 2;
  b.moved(dx, 0, dz, -Math.PI / 2, () => {
    b.box(-0.36, 0, -0.22, 0.36, 0.9, 0.22, NAVY, { faces: 'NESW' });
    b.box(-0.4, 0.9, -0.24, 0.4, 1.95, 0.24, WHITE, { top: ORANGE });
    b.box(-0.21, 1.95, -0.21, 0.21, 2.33, 0.21, SKIN, { faces: 'NESW' });
    b.box(-0.27, 2.29, -0.27, 0.27, 3.35, 0.27, NAVY, { top: WHITE });
  });
  b.beam([dx + 0.1, 1.3, dz + 0.45], [dx + 0.55, 3.2, dz + 0.5], 0.05, 0.05, BRONZE);
  // and a few who have come to watch
  for (const [x, z] of [[-6.6, -1.4], [-7.4, -0.5], [-8.2, -1.9], [-9.1, -0.6]]) k.person(l.x1 + x + 5, l.z1 + 3 + z);
}

// ---------------------------------------------------------------------------
// The Ice Arena
// ---------------------------------------------------------------------------

/** The rink's walls: two rows of tall windows. */
const RINK: WinSpec = { cell: 2.2, storey: 3.8, lit: 0.4, kind: 0 };

function iceArena(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1, h } = l, cx = (x0 + x1) / 2;
  const WALL = 2 * RINK.storey, EAVE = h, RISE = 2.3;
  b.box(x0, 0, z0, x1, WALL, z1, BRICK.red, { win: RINK, seed: 0.44, faces: 'NESW' });
  b.box(x0, WALL, z0, x1, EAVE - 0.3, z1, BRICK.red, { faces: 'NESW' });
  b.box(x0 - 0.08, 0, z0 - 0.08, x1 + 0.08, 0.6, z1 + 0.08, BASE, { faces: 'NESWT' });
  b.box(x0 - 0.22, EAVE - 0.3, z0 - 0.22, x1 + 0.22, EAVE, z1 + 0.22, TRIM, { faces: 'NESWTB' });
  gable(b, x0, z0, x1, z1, EAVE, RISE, SLATE, BRICK.red, 'x', 0.4);
  // brick piers between the bays of the long sides, and stone quoins at the corners
  const bays = Math.round((x1 - x0) / RINK.cell);
  for (let i = 1; i < bays; i++) {
    const x = x0 + ((x1 - x0) * i) / bays;
    for (const [za, zb] of [[z0 - 0.15, z0], [z1, z1 + 0.15]]) b.box(x - 0.18, 0.6, za, x + 0.18, EAVE - 0.3, zb, BRICK.deep, { faces: za < z0 ? 'NEW' : 'SEW' });
  }
  for (const x of [x0, x1]) for (const z of [z0, z1]) b.box(x - 0.15, 0.6, z - 0.15, x + 0.15, EAVE - 0.3, z + 0.15, LIMESTONE, { faces: 'NESW' });
  // a glazed lantern along the ridge, which lights the ice, and three vents on it
  const ridge = EAVE + (RISE * (z1 - z0)) / 2 / ((z1 - z0) / 2 + 0.4);
  // (in two lengths, either side of the cupola)
  for (const [xa, xb] of [[x0 + 2.4, cx - 1.1], [cx + 1.1, x1 - 2.4]]) {
    b.box(xa, ridge - 0.5, (z0 + z1) / 2 - 0.55, xb, ridge + 0.55, (z0 + z1) / 2 + 0.55, GLASS, { win: interior(0.6), faces: 'NESW' });
    b.box(xa - 0.15, ridge + 0.55, (z0 + z1) / 2 - 0.75, xb + 0.15, ridge + 0.72, (z0 + z1) / 2 + 0.75, SLATE, { faces: 'NESWTB' });
  }
  chimney(b, x1 - 1.6, z0 + 1.6, EAVE, ridge + 0.5, BRICK.deep);

  // the Georgian front on the south: a pavilion of brick under a white pediment, four pilasters, three arched doors
  {
    const half = 3.1, out = z1 + 0.45, top = EAVE + 0.2;
    b.box(cx - half, 0, z1 - 0.3, cx + half, top, out, BRICK.red, { faces: 'SEW' });
    b.box(cx - half - 0.08, 0, out - 0.4, cx + half + 0.08, 0.6, out + 0.08, BASE, { faces: 'SEWT' });
    b.box(cx - half - 0.2, top - 0.35, z1 - 0.3, cx + half + 0.2, top, out + 0.2, TRIM, { faces: 'SEWTB' });
    gable(b, cx - half - 0.2, z1 - 1.8, cx + half + 0.2, out + 0.2, top, 1.5, SLATE, TRIM, 'z', 0.25);
    for (const x of [cx - 2.7, cx - 0.95, cx + 0.95, cx + 2.7]) b.box(x - 0.2, 0.6, out, x + 0.2, top - 0.35, out + 0.12, TRIM, { faces: 'SEWT' });
    for (const [x, r] of [[cx - 1.85, 0.5], [cx, 0.62], [cx + 1.85, 0.5]] as const) {
      b.box(x - r, 0.6, out, x + r, 2.6, out + 0.03, DARK, { faces: 'S', win: interior(1.2) });
      arch(k, x, 2.6, out + 0.03, r, 0, 1, DARK, 1.2, 5);
    }
    steps(b, cx - 2.4, cx + 2.4, out + 0.12, 0.6, 'S', LIMESTONE, 0.35);
    // a round window in the pediment
    arch(k, cx, top + 0.35, out + 0.25, 0.4, 0, 1, GLASS, 0.9, 5);
    k.lights.push({ x: cx, z: out + 2, r: 9, color: '#ffe2ae', k: 0.45 });
    k.person(cx + 1.2, out + 1.2);
  }
  // its name, in the gable on the east end, where the opening view sees it
  nameBoard(k, 'sixth-ice-arena', x1, EAVE + 0.72, (z0 + z1) / 2, 1, 0, 0.62, 3.8);
  // brick pilasters on the east end, and doors on the north side, where the players come in
  for (const z of [z0 + 1.2, z1 - 1.2]) b.box(x1, 0.6, z - 0.2, x1 + 0.14, EAVE - 0.3, z + 0.2, BRICK.deep, { faces: 'ENS' });
  for (const x of [x0 + 3.3, x1 - 3.3]) {
    b.box(x - 0.55, 0, z0 - 0.04, x + 0.55, 2.3, z0, DARK, { faces: 'N', win: interior(0.9) });
    b.box(x - 0.8, 2.35, z0 - 0.7, x + 0.8, 2.5, z0, 0x3d4148, { faces: 'NESWTB' });
  }
  // an arched door at the east end, under the name
  b.box(x1, 0, (z0 + z1) / 2 - 0.7, x1 + 0.03, 2.3, (z0 + z1) / 2 + 0.7, DARK, { faces: 'E', win: interior(1.1) });
  arch(k, x1 + 0.03, 2.3, (z0 + z1) / 2, 0.7, 1, 0, DARK, 1.1, 5);
  b.box(x1, 3.2, (z0 + z1) / 2 - 1.2, x1 + 0.12, 3.4, (z0 + z1) / 2 + 1.2, TRIM, { faces: 'ENSTB' });
  k.lights.push({ x: x1 + 2, z: (z0 + z1) / 2, r: 8, color: '#ffe2ae', k: 0.4 });
  // a white band between the two rows of windows, all round
  b.box(x0 - 0.05, RINK.storey - 0.08, z0 - 0.05, x1 + 0.05, RINK.storey + 0.08, z1 + 0.05, TRIM, { faces: 'NESWTB' });
  // a white cupola on the ridge over the front, with louvres and a little roof
  {
    const ux = cx, uz = (z0 + z1) / 2, r = 0.55;
    b.box(ux - r, ridge - 0.6, uz - r, ux + r, ridge + 1.0, uz + r, TRIM, { faces: 'NESW' });
    for (const [f, nx, nz] of [['S', 0, 1], ['N', 0, -1], ['E', 1, 0], ['W', -1, 0]] as const) {
      b.box(ux + nx * (r + 0.01) - (nz ? 0.25 : 0.02), ridge + 0.1, uz + nz * (r + 0.01) - (nx ? 0.25 : 0.02), ux + nx * (r + 0.01) + (nz ? 0.25 : 0.02), ridge + 0.8, uz + nz * (r + 0.01) + (nx ? 0.25 : 0.02), 0x4a4f57, { faces: f });
    }
    b.box(ux - r - 0.1, ridge + 1.0, uz - r - 0.1, ux + r + 0.1, ridge + 1.15, uz + r + 0.1, TRIM, { faces: 'NESWTB' });
    hip(b, ux - r, uz - r, ux + r, uz + r, ridge + 1.15, 0.7, VERDIGRIS, 0.08);
  }
  // dormer vents along the south slope
  const sill = EAVE + 0.55;
  for (const x of [x0 + 2.2, x1 - 2.2]) dormer(b, x, z1 - 0.6, sill, 'S', SLATE, 0.9, 0.7, 1.2);
  // two lamps by the front steps
  for (const x of [cx - 3.6, cx + 3.6]) lantern(k, x, z1 + 0.9, 0, 2.0, IRON);
}

// ---------------------------------------------------------------------------
// The Illini Union Bookstore
// ---------------------------------------------------------------------------

function bookstore(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, F = 4, WALL = F * STOREY, TOP = WALL + 0.75;
  // the ground floor in stone, the four floors of brick over it (the fifth is the penthouse on the roof, set back)
  b.box(x0, 0, z0, x1, STOREY, z1, LIMESTONE, { faces: 'NESW' });
  b.box(x0, STOREY, z0, x1, WALL, z1, BRICK.red, { win: HALL, seed: 0.73, faces: 'NESW' });
  b.box(x0 - 0.06, STOREY - 0.12, z0 - 0.06, x1 + 0.06, STOREY + 0.18, z1 + 0.06, LIMESTONE, { faces: 'NESWTB' });
  b.box(x0 - 0.05, 3 * STOREY - 0.06, z0 - 0.05, x1 + 0.05, 3 * STOREY + 0.06, z1 + 0.05, LIMESTONE, { faces: 'NESWTB' });
  // the parapet, with the roof inside it
  b.box(x0 - 0.12, WALL, z0 - 0.12, x1 + 0.12, WALL + 0.25, z1 + 0.12, LIMESTONE, { faces: 'NESWB', top: FELT });
  for (const [za, zb] of [[z0, z0 + 0.25], [z1 - 0.25, z1]]) b.box(x0, WALL + 0.25, za, x1, TOP, zb, BRICK.red, { faces: 'NESWT', top: LIMESTONE });
  for (const [xa, xb] of [[x0, x0 + 0.25], [x1 - 0.25, x1]]) b.box(xa, WALL + 0.25, z0 + 0.25, xb, TOP, z1 - 0.25, BRICK.red, { faces: 'EWT', top: LIMESTONE });
  b.quad([x0 + 0.25, WALL + 0.3, z1 - 0.25], [x1 - 0.25, WALL + 0.3, z1 - 0.25], [x1 - 0.25, WALL + 0.3, z0 + 0.25], [x0 + 0.25, WALL + 0.3, z0 + 0.25], [0, 1, 0], FELT);
  // brick piers up the two street fronts, between the bays
  for (let i = 1; i < 4; i++) {
    const z = z0 + ((z1 - z0) * i) / 4, x = x0 + ((x1 - x0) * i) / 4;
    b.box(x1, STOREY + 0.18, z - 0.16, x1 + 0.14, WALL, z + 0.16, BRICK.deep, { faces: 'ENS' });
    b.box(x - 0.16, STOREY + 0.18, z1, x + 0.16, WALL, z1 + 0.14, BRICK.deep, { faces: 'SEW' });
  }
  // the corner on Wright Street: a bay of glass from the second floor up to above the parapet
  const c = 2.4;
  b.box(x1 - c, STOREY + 0.18, z1 - c, x1 + 0.2, WALL + 0.9, z1 + 0.2, GLASS, { win: GLAZED, seed: 0.9, faces: 'NESW' });
  b.box(x1 - c - 0.1, WALL + 0.9, z1 - c - 0.1, x1 + 0.3, WALL + 1.1, z1 + 0.3, LIMESTONE, { faces: 'NESWTB' });
  // the shop windows: big panes of glass between stone piers, on Wright Street and round the corner
  const panes = (a0: number, a1: number, n: number, east: boolean): void => {
    for (let i = 0; i < n; i++) {
      const p = a0 + ((a1 - a0) * (i + 0.12)) / n, q = a0 + ((a1 - a0) * (i + 0.88)) / n;
      if (east) b.box(x1, 0.35, p, x1 + 0.06, 2.25, q, GLASS, { faces: 'E', win: interior(1.2) });
      else b.box(p, 0.35, z1, q, 2.25, z1 + 0.06, GLASS, { faces: 'S', win: interior(1.2) });
    }
  };
  panes(z0 + 0.4, z1 - 3.4, 3, true);
  panes(x0 + 0.4, x1 - 2.6, 3, false);
  // the door on Wright Street, by the corner, under a dark canopy
  b.box(x1, 0, z1 - 2.4, x1 + 0.05, 2.25, z1 - 0.6, DARK, { faces: 'E', win: interior(1.4) });
  b.box(x1, 2.3, z1 - 2.9, x1 + 0.45, 2.45, z1 - 0.1, 0x3d4148, { faces: 'NESWTB' });
  // the name on a board along the fascia over the shop windows
  nameBoard(k, 'sixth-bookstore', x1, 2.62, (z0 + z1) / 2 - 1.3, 1, 0, 0.46, 6.6);
  // navy awnings over the shop windows round the corner, on the south
  for (let i = 0; i < 3; i++) {
    const a0 = x0 + 0.4 + ((x1 - 3 - x0) * (i + 0.1)) / 3, a1 = x0 + 0.4 + ((x1 - 3 - x0) * (i + 0.9)) / 3;
    slab(b, [(a0 + a1) / 2, 2.55, z1 + 0.02], [(a0 + a1) / 2, 2.15, z1 + 0.8], (a1 - a0) / 2, 0.06, NAVY);
  }
  // the corner bay of glass: its frames up the two faces, and a white band at each floor
  for (const x of [x1 - c + 0.6, x1 - c / 2 + 0.6]) b.box(x - 0.06, STOREY + 0.18, z1 + 0.2, x + 0.06, WALL + 0.9, z1 + 0.27, FRAME, { faces: 'SEW' });
  for (const z of [z1 - c + 0.6, z1 - c / 2 + 0.6]) b.box(x1 + 0.2, STOREY + 0.18, z - 0.06, x1 + 0.27, WALL + 0.9, z + 0.06, FRAME, { faces: 'ENS' });
  for (let f = 2; f <= F; f++) b.box(x1 - c - 0.02, f * STOREY - 0.1, z1 - c - 0.02, x1 + 0.24, f * STOREY + 0.1, z1 + 0.24, FRAME, { faces: 'NESWB' });
  // a second door on the north, for the offices upstairs, under a small canopy
  b.box(x1 - 3.4, 0, z0 - 0.04, x1 - 2.2, 2.2, z0, DARK, { faces: 'N', win: interior(1.2) });
  b.box(x1 - 3.7, 2.3, z0 - 0.9, x1 - 1.9, 2.45, z0, 0x3d4148, { faces: 'NESWTB' });
  // a loading door on the west, towards the deck
  b.box(x0 - 0.04, 0, (z0 + z1) / 2 - 1.1, x0, 2.4, (z0 + z1) / 2 + 1.1, 0x8a8d91, { faces: 'W' });
  // banners in the university's colours, plain, on the brick piers of the Wright Street front
  for (let i = 1; i < 4; i += 2) {
    const z = z0 + ((z1 - z0) * i) / 4;
    b.box(x1 + 0.14, 5.0, z - 0.04, x1 + 0.46, 7.6, z + 0.04, i === 1 ? ORANGE : NAVY, { faces: 'NESWTB' });
  }
  // awnings over the shop windows on Wright Street too, under the name
  for (let i = 0; i < 3; i++) {
    const a0 = z0 + 0.4 + ((z1 - 3.4 - z0 - 0.4) * (i + 0.1)) / 3, a1 = z0 + 0.4 + ((z1 - 3.4 - z0 - 0.4) * (i + 0.9)) / 3;
    slab(b, [x1 + 0.02, 2.3, (a0 + a1) / 2], [x1 + 0.45, 2.05, (a0 + a1) / 2], (a1 - a0) / 2, 0.06, NAVY);
  }
  // a band of stone sills under the third-floor windows, and a corbelled course of darker brick under the parapet
  b.box(x0 - 0.04, 2 * STOREY - 0.05, z0 - 0.04, x1 + 0.04, 2 * STOREY + 0.07, z1 + 0.04, LIMESTONE, { faces: 'NESWTB' });
  b.box(x0 - 0.08, WALL - 0.35, z0 - 0.08, x1 + 0.08, WALL - 0.02, z1 + 0.08, BRICK.deep, { faces: 'NESWB' });
  // planters by the door on Wright Street
  for (const z of [z1 - 3.0, z0 + 0.6]) b.box(x1 + 0.05, 0, z - 0.3, x1 + 0.45, 0.45, z + 0.3, LIMESTONE, { faces: 'NESWT', top: 0x5f8f4e });
  // on the roof: the penthouse, set back, and the plant
  b.box(x0 + 1.4, WALL + 0.3, z0 + 1.2, x1 - 3.2, WALL + 2.0, z1 - 3.6, BRICK.red, { faces: 'NESW', top: FELT });
  b.box(x0 + 1.3, WALL + 2.0, z0 + 1.1, x1 - 3.1, WALL + 2.15, z1 - 3.5, LIMESTONE, { faces: 'NESWTB' });
  b.box(x0 + 1.2, WALL + 0.3, z1 - 2.6, x0 + 2.6, WALL + 1.2, z1 - 1.0, 0xa7abaf, { faces: 'NESWT' });
  k.lights.push({ x: x1 + 1.5, z: (z0 + z1) / 2, r: 10, color: '#ffe9c4', k: 0.55 });
  k.person(x1 + 0.8, z1 - 1.5);
}

// ---------------------------------------------------------------------------
// Illini Tower and Sherman Hall
// ---------------------------------------------------------------------------

/** Illini Tower's sixteen storeys, and Sherman Hall's thirteen: their floors are lower than the halls', so that they read as towers. */
const TOWER: WinSpec = { cell: 1.3, storey: 1.2, lit: 0.42, kind: 0 };
const SLAB: WinSpec = { cell: 1.25, storey: 1.34, lit: 0.42, kind: 0 };

function illiniTower(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1, h } = l, cx = (x0 + x1) / 2;
  const POD = 2 * TOWER.storey, TOP = 16 * TOWER.storey, IN = 0.9;
  const tx0 = x0 + IN, tx1 = x1 - IN, tz0 = z0 + IN, tz1 = z1 - IN;
  // the podium: glass, under a band of concrete, the whole lot
  b.box(x0 + 0.2, 0, z0 + 0.2, x1 - 0.2, POD, z1 - 0.2, GLASS, { win: GLAZED, seed: 0.3, faces: 'NESW' });
  b.box(x0, POD, z0, x1, POD + 0.4, z1, PRECAST, { faces: 'NESWTB' });
  // the tower, and the concrete fins that run up it
  b.box(tx0, POD + 0.4, tz0, tx1, TOP, tz1, 0xcfc6b2, { win: TOWER, seed: 0.62, faces: 'NESW' });
  const fins = 5;
  for (let i = 0; i <= fins; i++) {
    const x = tx0 + ((tx1 - tx0) * i) / fins, z = tz0 + ((tz1 - tz0) * i) / fins;
    for (const [za, zb, f] of [[tz0 - 0.18, tz0 + 0.05, 'NEW'], [tz1 - 0.05, tz1 + 0.18, 'SEW']] as const) b.box(x - 0.13, POD + 0.4, za, x + 0.13, TOP, zb, PRECAST, { faces: f });
    if (i > 0 && i < fins) for (const [xa, xb, f] of [[tx0 - 0.18, tx0 + 0.05, 'WNS'], [tx1 - 0.05, tx1 + 0.18, 'ENS']] as const) b.box(xa, POD + 0.4, z - 0.13, xb, TOP, z + 0.13, PRECAST, { faces: f });
  }
  // the crown: a deep band of concrete with the name on its south face
  b.box(tx0 - 0.2, TOP, tz0 - 0.2, tx1 + 0.2, h, tz1 + 0.2, PRECAST, { faces: 'NESWB', top: FELT });
  nameBoard(k, 'sixth-illini-tower', cx, (TOP + h) / 2, tz1 + 0.2, 0, 1, 0.6, 5.2, 0xecebe6);
  b.box(cx - 1.6, h, tz0 + 1.2, cx + 1.4, h + 1.4, tz0 + 3.6, PRECAST, { faces: 'NESWT' });
  b.cyl(tx1 - 1, tz0 + 1, h, h + 2.3, 0.07, 0.05, 4, 0xd0d3d6, { cap: false });
  // the entrance on the south, under a canopy
  b.box(cx - 1.6, POD - 0.3, z1 - 0.2, cx + 1.6, POD - 0.12, z1 + 0.9, PRECAST, { faces: 'NESWTB' });
  b.box(cx - 0.9, 0, z1 - 0.2, cx + 0.9, 2.0, z1 - 0.15, DARK, { faces: 'S', win: interior(1.4) });
  for (const x of [cx - 1.45, cx + 1.45]) b.box(x - 0.08, 0, z1 + 0.7, x + 0.08, POD - 0.3, z1 + 0.86, PRECAST, { faces: 'NESW' });
  // the podium's roof, a terrace round the foot of the tower, with planters on it
  for (const [x, z] of [[x0 + 0.5, z1 - 0.5], [x1 - 0.5, z1 - 0.5], [x1 - 0.5, z0 + 0.5]]) {
    b.box(x - 0.35, POD + 0.4, z - 0.35, x + 0.35, POD + 0.85, z + 0.35, PRECAST, { faces: 'NESWT', top: 0x5f8f4e });
  }
  // a band of concrete round the tower half way up, where its plumbing floor is
  const mid = 9 * TOWER.storey;
  b.box(tx0 - 0.24, mid - 0.12, tz0 - 0.24, tx1 + 0.24, mid + 0.12, tz1 + 0.24, PRECAST, { faces: 'NESWTB' });
  // louvres on the penthouse
  b.box(cx - 1.2, h + 0.4, tz0 + 3.6, cx + 1.0, h + 1.1, tz0 + 3.64, 0x6d7279, { faces: 'S' });
  b.box(cx - 1.64, h + 0.4, tz0 + 1.5, cx - 1.6, h + 1.1, tz0 + 3.3, 0x6d7279, { faces: 'W' });
  // the plant on the roof: a water tank and its stand
  b.cyl(cx + 2.0, tz1 - 1.6, h, h + 1.1, 0.75, 0.75, 8, 0x9ea3a8, { cap: 0x8a8f94 });
  k.lights.push({ x: cx, z: z1 + 2, r: 9, color: '#ffe2ae', k: 0.45 });
  k.person(cx - 1.3, z1 + 0.7);
  k.person(cx + 0.6, z1 + 1.2);
}

function sherman(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, cz = (z0 + z1) / 2;
  const GROUND = 2 * SLAB.storey, TOP = 13 * SLAB.storey;
  // a slab that runs north and south: long walls of windows to east and west, plain brick at its ends
  const sx0 = x0 + 1.3, sx1 = x1 - 1.3, sz0 = z0 + 0.5, sz1 = z1 - 0.5;
  b.box(sx0, GROUND, sz0 + 0.3, sx1, TOP, sz1 - 0.3, PRECAST, { win: SLAB, seed: 0.18, faces: 'EW' });
  for (const [za, zb] of [[sz0, sz0 + 0.45], [sz1 - 0.45, sz1]]) b.box(sx0 - 0.15, GROUND, za, sx1 + 0.15, TOP + 0.35, zb, BRICK.brown, { faces: 'NESWT' });
  // fins of concrete up the long walls
  for (let i = 1; i < 6; i++) {
    const z = sz0 + 0.45 + ((sz1 - sz0 - 0.9) * i) / 6;
    b.box(sx1, GROUND, z - 0.1, sx1 + 0.12, TOP, z + 0.1, 0xe6e0d2, { faces: 'ENS' });
    b.box(sx0 - 0.12, GROUND, z - 0.1, sx0, TOP, z + 0.1, 0xe6e0d2, { faces: 'WNS' });
  }
  // the roof, inside a low parapet, with the plant on it
  b.box(sx0 - 0.05, TOP, sz0 + 0.3, sx1 + 0.05, TOP + 0.3, sz1 - 0.3, PRECAST, { faces: 'EWT', top: FELT });
  b.box(sx0 + 0.9, TOP + 0.3, cz - 1.6, sx1 - 0.9, TOP + 1.5 > l.h + 0.4 ? l.h + 0.4 : TOP + 1.5, cz + 1.2, BRICK.brown, { faces: 'NESWT', top: FELT });
  // the ground floor, set back behind its columns, all glass
  b.box(sx0 + 0.45, 0, sz0 + 0.3, sx1 - 0.45, GROUND, sz1 - 0.3, GLASS, { win: GLAZED, seed: 0.5, faces: 'NESW' });
  b.box(sx0 - 0.15, GROUND - 0.05, sz0, sx1 + 0.15, GROUND + 0.05, sz1, PRECAST, { faces: 'B' });
  for (const z of [sz0 + 0.25, cz - 2.1, cz, cz + 2.1, sz1 - 0.25]) for (const x of [sx0 + 0.1, sx1 - 0.1]) b.box(x - 0.17, 0, z - 0.17, x + 0.17, GROUND, z + 0.17, PRECAST, { faces: 'NESW' });
  // a low wing on the east, the lounge and the door, under a flat roof
  b.box(sx1 + 0.3, 0, cz - 2.2, x1, 2.4, cz + 2.2, BRICK.brown, { faces: 'NESW', top: FELT });
  b.box(sx1 + 0.2, 2.4, cz - 2.3, x1 + 0.1, 2.6, cz + 2.3, PRECAST, { faces: 'NESWTB' });
  b.box(x1, 0.3, cz - 1.6, x1 + 0.04, 2.1, cz + 1.6, GLASS, { faces: 'E', win: interior(1.2) });
  // its name, high on the plain brick of its south end
  nameBoard(k, 'sixth-sherman', (sx0 + sx1) / 2, TOP - 1.6, sz1, 0, 1, 0.6, 4.4);
  // a slit of glass up the middle of each brick end, where the stairs are, lit at night
  for (const [z, nz] of [[sz1 + 0.02, 1], [sz0 - 0.02, -1]] as const) {
    const xm = (sx0 + sx1) / 2;
    b.quad([xm - 0.3, GROUND + 0.5, z], [xm + 0.3, GROUND + 0.5, z], [xm + 0.3, TOP - 2.6, z], [xm - 0.3, TOP - 2.6, z], [0, 0, nz], GLASS, { win: interior(0.7) });
  }
  // a canopy over the east door, and planters along the wing
  b.box(x1 + 0.04, 2.0, cz - 1.0, x1 + 0.45, 2.12, cz + 1.0, PRECAST, { faces: 'NESWTB' });
  for (const z of [cz - 3.2, sz1 - 0.2]) b.box(x1 - 1.0, 0, z - 0.35, x1 - 0.1, 0.5, z + 0.35, PRECAST, { faces: 'NESWT', top: 0x5f8f4e });
  // a stone cap on each brick end, and a low wing on the west: the dining room, with a long window
  for (const [za, zb] of [[sz0 - 0.08, sz0 + 0.53], [sz1 - 0.53, sz1 + 0.08]]) b.box(sx0 - 0.23, TOP + 0.35, za, sx1 + 0.23, TOP + 0.5, zb, LIMESTONE, { faces: 'NESWTB' });
  b.box(x0, 0, cz - 2.8, sx0 - 0.2, 2.4, cz + 1.4, BRICK.brown, { faces: 'NESW', top: FELT });
  b.box(x0 - 0.06, 2.4, cz - 2.86, sx0 - 0.14, 2.6, cz + 1.46, PRECAST, { faces: 'NESWTB' });
  b.box(x0 + 0.1, 0.5, cz + 1.4, sx0 - 0.3, 2.0, cz + 1.44, GLASS, { faces: 'S', win: interior(1.0) });
  // the plant on the roof
  b.box(sx0 + 0.6, TOP + 0.3, sz1 - 1.8, sx0 + 1.6, TOP + 0.9, sz1 - 0.8, 0xa7abaf, { faces: 'NESWT' });
  b.cyl(sx1 - 0.6, sz0 + 1.2, TOP + 0.3, l.h + 1.8, 0.06, 0.04, 4, 0xd0d3d6, { cap: false });
  k.lights.push({ x: x1 + 1.5, z: cz, r: 9, color: '#ffe2ae', k: 0.45 });
  k.person(x1 - 0.2, cz + 2.8);
}

// ---------------------------------------------------------------------------
// The parking deck at Sixth and John
// ---------------------------------------------------------------------------

function deckC7(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1, h } = l, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const LEVELS = 4, SLABT = 0.35, WALLT = 0.22;
  const lv = (i: number): number => (h * i) / LEVELS;
  // the floor at the ground, a darker concrete
  area(k, rect(x0 + 0.2, z0 + 0.2, x1 - 0.2, z1 - 0.2), 0x8f8c86, 0.035);
  // the decks, each with its underside, and the roof at exactly the lot's height
  for (let i = 1; i <= LEVELS; i++) b.box(x0, lv(i) - SLABT, z0, x1, lv(i), z1, CONCRETE, { faces: 'NESWTB', top: DECK_TOP });
  // the low walls round each level; the roof's are lower, and the ground floor's are open to the north, where cars drive in
  for (let i = 0; i <= LEVELS; i++) {
    const y = lv(i), wh = i === LEVELS ? 0.75 : 0.95;
    if (i === 0) {
      b.box(x0, 0, z1 - WALLT, x1, wh, z1, CONCRETE, { faces: 'NESWT' });
      for (const [xa, xb] of [[x0, x0 + WALLT], [x1 - WALLT, x1]]) b.box(xa, 0, z0 + 3.4, xb, wh, z1 - WALLT, CONCRETE, { faces: 'NESWT' });
      continue;
    }
    b.box(x0, y, z0, x1, y + wh, z0 + WALLT, CONCRETE, { faces: 'NESWT' });
    b.box(x0, y, z1 - WALLT, x1, y + wh, z1, CONCRETE, { faces: 'NESWT' });
    for (const [xa, xb] of [[x0, x0 + WALLT], [x1 - WALLT, x1]]) b.box(xa, y, z0 + WALLT, xb, y + wh, z1 - WALLT, CONCRETE, { faces: 'EWT' });
  }
  // the columns, which stop under the roof
  for (const x of [x0 + 0.45, cx, x1 - 0.45]) for (const z of [z0 + 0.45, cz, z1 - 0.45]) b.box(x - 0.2, 0, z - 0.2, x + 0.2, h - SLABT, z + 0.2, CONCRETE, { faces: 'NESW' });
  // cars inside, as dark shapes, on the levels under the roof
  const r = rng(6417);
  for (let i = 0; i < LEVELS; i++) {
    for (const z of [z0 + 2.4, z1 - 2.4]) for (const x of [x0 + 2.6, x1 - 3.2]) {
      if (r() < 0.4) continue;
      const shade = [0x2b2f36, 0x3a3f47, 0x4a4d52, 0x5a2e2e][Math.floor(r() * 4)];
      b.box(x - 1.65, lv(i) + 0.05, z - 0.62, x + 1.65, lv(i) + 0.75, z + 0.62, shade, { faces: 'NESWT' });
      b.box(x - 0.95, lv(i) + 0.75, z - 0.55, x + 0.75, lv(i) + 1.2, z + 0.55, 0x23262c, { faces: 'NESWT' });
    }
  }
  // the roof: two bays painted for the two cars that stand there, facing east
  const y = h + 0.012, line = (ax: number, az: number, bx: number, bz: number): void =>
    b.quad([ax, y, bz], [bx, y, bz], [bx, y, az], [ax, y, az], [0, 1, 0], 0xeeeeea);
  const bx0 = x0 + 1.3, bx1 = x0 + 8.7;
  for (const z of [z0 + 0.95, z0 + 5, z0 + 9.05]) line(bx0, z - 0.06, bx1, z + 0.06);
  line(bx0 - 0.12, z0 + 0.95, bx0, z0 + 9.05);
  // the stair tower in the south-east corner, glazed and lit, with the parking sign on it
  const sx0 = x1 - 1.2, sz0 = z1 - 2.5;
  b.box(sx0, 0, sz0, x1 + 0.15, h + 0.2, z1 + 0.15, GLASS, { win: GLAZED, seed: 0.37, faces: 'NESW' });
  b.box(sx0 - 0.06, h + 0.2, sz0 - 0.06, x1 + 0.21, h + 0.45, z1 + 0.21, CONCRETE, { faces: 'NESWTB' });
  k.glows.push({ x: sx0 + 0.65, y: h - 1.4, z: z1 + 0.2, sx: 0.8, sy: 0.15, sz: 0.04, color: '#fff2d6' });
  const pz = z1 + 0.15;
  b.box(sx0 + 0.1, h - 1.25, pz, x1 + 0.05, h - 0.15, pz + 0.06, 0x1f4f9c, { faces: 'SEWTB' });
  k.sign('sixth-deck-p', sx0 + 0.65 + 0.025, h - 0.7, pz + 0.09, 0, 1, 0.9, 0.9);
  // a lamp on the roof, at its north-west corner, clear of the cars
  lantern(k, x0 + 0.6, z0 + 0.6, h, 2.2, IRON);
  k.lights.push({ x: x1 + 1.5, z: z1 - 1, r: 9, color: '#ffe2ae', k: 0.4 });
  k.person(sx0 - 0.4, z1 + 0.8);
}

// ---------------------------------------------------------------------------
// The Illini Hall site
// ---------------------------------------------------------------------------

/** A worker in an orange vest and a hard hat. */
const WORKER: Dress = { coat: ORANGE, legs: 0x39476a, hat: 0xf3f1ea, hatH: 0.28, hatR: 0.33 };

function illiniHallSite(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1, h } = l;
  // the ground inside the hoarding: raw earth
  area(k, rect(x0 + 0.15, z0 + 0.15, x1 - 0.15, z1 - 0.15), EARTH, 0.035);
  // the hoarding: plywood all round, with a gate on Wright Street
  const FH = 1.35, t = 0.12, gz0 = (z0 + z1) / 2 - 1.6, gz1 = (z0 + z1) / 2 + 1.6;
  b.box(x0, 0, z0, x1, FH, z0 + t, PLYWOOD, { faces: 'NESWT' });
  b.box(x0, 0, z1 - t, x1, FH, z1, PLYWOOD, { faces: 'NESWT' });
  b.box(x0, 0, z0 + t, x0 + t, FH, z1 - t, PLYWOOD, { faces: 'EWT' });
  for (const [za, zb] of [[z0 + t, gz0], [gz1, z1 - t]]) b.box(x1 - t, 0, za, x1, FH, zb, PLYWOOD, { faces: 'NESWT' });
  for (const z of [gz0, gz1]) b.box(x1 - 0.25, 0, z - 0.1, x1 + 0.05, FH + 0.3, z + 0.1, 0xe6e4dc, { faces: 'NESWT' });

  // the foundation slab, and the steel of the new building rising from it to its first floor
  const fx0 = x0 + 1.6, fx1 = x1 - 2.2, fz0 = z0 + 1.2, fz1 = z1 - 3.0, SL = 0.3;
  b.box(fx0, 0, fz0, fx1, SL, fz1, CONCRETE, { faces: 'NESWT' });
  const xs = [fx0 + 0.3, (fx0 + fx1) / 2, fx1 - 0.3], zs = [fz0 + 0.3, (fz0 + fz1) / 2, fz1 - 0.3];
  for (const x of xs) for (const z of zs) b.box(x - 0.11, SL, z - 0.11, x + 0.11, h, z + 0.11, PRIMER, { faces: 'NESW' });
  for (const z of zs) b.box(xs[0] - 0.1, h - 0.24, z - 0.08, xs[2] + 0.1, h - 0.04, z + 0.08, PRIMER, { faces: 'NSTB' });
  for (const x of xs) b.box(x - 0.08, h - 0.24, zs[0] - 0.1, x + 0.08, h - 0.04, zs[2] + 0.1, PRIMER, { faces: 'EWTB' });
  // the first bay of floor decking laid
  b.box(xs[0], h - 0.32, zs[0], xs[1], h - 0.25, zs[1], 0xb3b6ba, { faces: 'NESWTB' });

  // the site hut: a cabin on the south side, with a window and a door
  const hx0 = x0 + 0.5, hz1 = z1 - 0.4;
  b.box(hx0, 0, hz1 - 1.3, hx0 + 2.4, 1.25, hz1, CABIN, { faces: 'NESWT', top: 0x9aa0a6 });
  b.box(hx0 + 0.3, 0.55, hz1, hx0 + 1.2, 1.0, hz1 + 0.03, GLASS, { faces: 'S', win: interior(1.0) });
  b.box(hx0 + 1.6, 0.05, hz1, hx0 + 2.1, 1.05, hz1 + 0.03, 0x3d5f8c, { faces: 'S' });
  // a heap of sand in the south-east corner, and a small digger beside the slab
  b.cyl(x1 - 1.6, z1 - 1.4, 0.035, 0.85, 1.05, 0.08, 7, SAND, { cap: false });
  {
    const dx = x1 - 1.2, dz = z0 + 2.6;
    b.box(dx - 0.7, 0, dz - 0.55, dx + 0.7, 0.35, dz + 0.55, 0x2c2e33, { faces: 'NESWT' });
    b.box(dx - 0.6, 0.35, dz - 0.5, dx + 0.6, 0.85, dz + 0.5, CRANE, { faces: 'NESWT' });
    b.box(dx - 0.55, 0.85, dz + 0.0, dx + 0.0, 1.55, dz + 0.48, GLASS, { faces: 'NESWT', top: CRANE, win: interior(0.4) });
    b.beam([dx - 0.3, 0.9, dz - 0.25], [dx - 1.3, 1.75, dz - 0.25], 0.12, 0.1, CRANE);
    b.beam([dx - 1.3, 1.75, dz - 0.25], [dx - 1.75, 0.6, dz - 0.25], 0.1, 0.08, CRANE);
    b.box(dx - 2.05, 0.3, dz - 0.5, dx - 1.6, 0.7, dz, 0x55585e, { faces: 'NESWT' });
  }

  // the tower crane, in the north-west corner: a slender mast, its jib out to the south over the site, and its counterweight north
  {
    const mx = x0 + 1.0, mz = z0 + 1.0, MAST = 21.2, m = 0.3;
    b.box(mx - 0.6, 0, mz - 0.6, mx + 0.6, 0.5, mz + 0.6, CONCRETE, { faces: 'NESWT' });
    b.box(mx - m, 0.5, mz - m, mx + m, MAST, mz + m, CRANE, { faces: 'NESW' });
    b.box(mx - 0.45, MAST, mz - 0.45, mx + 0.45, MAST + 0.85, mz + 0.45, CRANE, { faces: 'NESWTB' });
    b.box(mx + 0.45, MAST + 0.05, mz - 0.35, mx + 0.62, MAST + 0.75, mz + 0.35, GLASS, { faces: 'E', win: interior(0.8) });
    const jy = MAST + 0.85, J0 = mz + 0.45, J1 = mz + 15.5, C1 = mz - 5.5;
    b.box(mx - 0.22, jy, J0, mx + 0.22, jy + 0.45, J1, CRANE, { faces: 'NESWTB' });
    b.box(mx - 0.22, jy, C1, mx + 0.22, jy + 0.35, mz - 0.45, CRANE, { faces: 'NESWTB' });
    b.box(mx - 0.5, jy - 0.7, C1, mx + 0.5, jy + 0.3, C1 + 1.4, CONCRETE, { faces: 'NESWTB' });
    // the peak over the mast, and the ties from it to the jib's end and the counter-jib's
    b.cyl(mx, mz, jy, 24, 0.45 * Math.SQRT2, 0.06, 4, CRANE, { phase: Math.PI / 4, cap: false });
    b.beam([mx, 23.6, mz], [mx, jy + 0.45, J1 - 0.3], 0.04, 0.04, 0xdedfe0);
    b.beam([mx, 23.6, mz], [mx, jy + 0.35, C1 + 0.3], 0.04, 0.04, 0xdedfe0);
    // the trolley, its line, and a bundle of steel beams on the hook over the site
    const hz = (fz0 + fz1) / 2 + 0.5;
    b.box(mx - 0.3, jy - 0.2, hz - 0.3, mx + 0.3, jy, hz + 0.3, 0x55585e, { faces: 'NESWB' });
    b.box(mx - 0.03, 5.4, hz - 0.03, mx + 0.03, jy - 0.2, hz + 0.03, 0xdedfe0, { faces: 'NESW' });
    b.box(mx - 0.15, 5.0, hz - 0.15, mx + 0.15, 5.4, hz + 0.15, 0xe8c547, { faces: 'NESWB' });
    b.box(mx - 0.25, 4.3, hz - 1.6, mx + 0.25, 4.7, hz + 1.6, PRIMER, { faces: 'NESWTB' });
    k.glows.push({ x: mx, y: 24.15, z: mz, sx: 0.3, sy: 0.3, sz: 0.3, color: '#ff3b3b' });
    k.glows.push({ x: mx, y: jy + 0.6, z: J1 - 0.2, sx: 0.25, sy: 0.25, sz: 0.25, color: '#ff3b3b' });
  }

  // workers in vests and hard hats: two on the slab, one at the digger, one by the hut
  figure(b, xs[1] + 0.8, zs[1] + 0.4, SL, WORKER);
  figure(b, xs[2] - 0.2, zs[0] + 0.9, SL, WORKER);
  figure(b, x1 - 2.3, z0 + 3.9, 0.035, WORKER);
  figure(b, x0 + 3.4, z1 - 1.2, 0.035, WORKER);
  // a floodlight on a pole for the evening shift
  lantern(k, x1 - 0.6, z1 - 3.2, 0, 3.0, IRON);
}

// ---------------------------------------------------------------------------

/** The models, by the id of their lot in plan.ts. */
export const MODELS: Record<string, Model> = {
  armory,
  'ice-arena': iceArena,
  bookstore,
  'illini-tower': illiniTower,
  sherman,
  'deck-c7': deckC7,
  'illini-hall-site': illiniHallSite,
};

/** Whatever this file builds that is not a lot. */
export function extras(k: Build): void {
  void k;
}
