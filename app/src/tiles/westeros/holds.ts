// The smaller holds of the North: the Shadow Tower, Eastwatch, Queenscrown,
// Mole's Town, White Harbor, Bear Island and Deepwood Motte. All of them stand
// in snow.
//
// Each is drawn from the books' plain descriptions, as the research notes give
// them, and is this tile's own drawing.

import * as THREE from 'three';
import { Smoke } from '../../engine/effects';
import { interior, rng, type BoxOpts, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { area, flat, oval, rect, walls, water, type P2 } from '../../engine/ground';
import { bandedFlag, D, figure, lantern, lathe, Q, type Dress } from '../../engine/parts';
import { face3, gable, prism, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { drawField, field, heightOn, smooth, type Field } from '../../engine/terrain';
import { SNOW } from './land';
import { banner, brazier, DARK, DOOR, fire, HOUSE_WIN, IRONWORK, LANCETS, LOOPS, LOOPS_CLOSE, nameBoard, nameSign, ROCK, ROCK_DARK, ROOF, roundTower, STONE, TIMBER, TIMBER_DARK } from './look';
import type { Model } from './models';
import { COAST_EAST, COAST_WEST, ISLANDS, WALL, WET, isWater, lotOf, type Lot } from './plan';

// ---------------------------------------------------------------------------
// What these holds share
// ---------------------------------------------------------------------------

/** What the street material is told about a stretch of plain ground, as land.ts lays it. */
const GROUND: WinSpec = { cell: 0, storey: 1, lit: 0, kind: 1 };

/** Colours of this file's own. */
const C = {
  /** The Shadow Tower's stone: the North's granite, darkened by the mountains' wet. */
  grim: 0x606368, grimShade: 0x4c4f54,
  /** Trodden snow, in a yard or on a path. */
  trodden: 0xc9cfd2,
  /** Earth showing through snow. */
  earth: 0x7c7262, earthDark: 0x625a4d,
  /** Logs: the pale cut ends and the dark weathered bark. */
  log: 0x6d533b, logDark: 0x5a4430, moss: 0x5d6a44,
  /** A turf roof under old snow. */
  turf: 0x7b7a5a,
  /** Whitewash, and the Manderlys' old black stone. */
  whitewash: 0xf1eee6, wolfsDen: 0x3b393e, wolfsDenShade: 0x2a282d,
  /** Ice floating in the sea. */
  floe: 0xe9f2f6, floeSide: 0xc2dbe6,
  /** The gilt of Queenscrown's merlons, and where it has worn away. */
  gilt: 0xcfae52, giltFaded: 0xb3a376, giltTop: 0xe2c76c,
  /** Fieldstone, for the cottages of an abandoned village. */
  fieldstone: 0x9d988c, fieldstoneTop: 0x86817a,
  /** A seal on a rock. */
  seal: 0x6f6d6a,
};

/** A brother of the Night's Watch: black from his boots to his hood. */
const BROTHER: Dress = { coat: 0x1d1d22, legs: 0x17171b, hat: 0x26262b, hatH: 0.16, hatR: 0.33 };
const MANDERLY = [0x2f8f8a, 0xf1efe6, 0x2f8f8a];
const MORMONT = [0x2f5a3a, 0x1d1d20, 0x2f5a3a];

/** The way the view the tile opens with looks from: 0.67 east and 0.74 south. */
const VIEW: V3 = [0.669, 0, 0.743];

function brother(b: GeoBuilder, x: number, z: number, y = 0): void {
  figure(b, x, z, y, BROTHER);
}

/** A thing flat on the face of a round tower, `dist` out from its middle at angle `a` (from east towards south): a door, a window. */
function onFace(b: GeoBuilder, x: number, z: number, dist: number, a: number, y0: number, y1: number, half: number, color: number, depth = 0.1, o: BoxOpts = {}): void {
  const c = Math.cos(a), s = Math.sin(a);
  b.obox(x + c * (dist + depth / 2 - 0.02), (y0 + y1) / 2, z + s * (dist + depth / 2 - 0.02), half, (y1 - y0) / 2, depth / 2, a + Math.PI / 2, color, o);
}

/** Merlons round the top of a box, on its four edges, standing on `y`. */
function crenel(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, color: number, top: number, h = 0.7, step = 1.4): void {
  const t = 0.34, w = 0.62;
  const nx = Math.max(1, Math.round((x1 - x0) / step)), nz = Math.max(1, Math.round((z1 - z0 - 2 * t) / step));
  for (let i = 0; i < nx; i++) {
    const m = x0 + ((i + 0.5) / nx) * (x1 - x0);
    b.box(m - w / 2, y, z0, m + w / 2, y + h, z0 + t, color, { top });
    b.box(m - w / 2, y, z1 - t, m + w / 2, y + h, z1, color, { top });
  }
  for (let i = 0; i < nz; i++) {
    const m = z0 + t + ((i + 0.5) / nz) * (z1 - z0 - 2 * t);
    b.box(x0, y, m - w / 2, x0 + t, y + h, m + w / 2, color, { top });
    b.box(x1 - t, y, m - w / 2, x1, y + h, m + w / 2, color, { top });
  }
}

/** A brazier on short legs, for the top of a tower where a tall one would stand above everything. */
function lowBrazier(k: Build, x: number, z: number, y: number): void {
  k.b.cyl(x, z, y + 0.45, y + 0.75, 0.3, 0.42, 6, IRONWORK, { cap: DARK });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    k.b.beam([x + Math.cos(a) * 0.34, y, z + Math.sin(a) * 0.34], [x + Math.cos(a) * 0.2, y + 0.5, z + Math.sin(a) * 0.2], 0.06, 0.06, 0x8a8d92);
  }
  fire(k, x, y + 1.0, z, 0.3, 9);
}

/**
 * A ship lying along its heading `yaw`: a hull with a pointed bow, a deck, a
 * raised stern, one mast whose top is at `mastTop`, and its sail furled on the
 * yard. Its keel is under the water.
 */
function ship(k: Build, cx: number, cz: number, yaw: number, len: number, beam: number, hull: number, sail: number, mastTop: number, lamp = true): void {
  const b = k.b, h = len / 2, w = beam / 2, bow = len * 0.24, deck = 0.5, DECK = 0x7a6650;
  b.moved(cx, 0, cz, yaw, () => {
    prism(b, [[-h, -w * 0.82], [-h + 0.5, -w], [h - bow, -w], [h, 0], [h - bow, w], [-h + 0.5, w], [-h, w * 0.82]], -1.1, deck, hull, { top: DECK });
    // the bulwarks along the waist, and a band of paint under them
    for (const s of [-1, 1]) {
      b.box(-h + 0.5, deck, s > 0 ? w - 0.12 : -w, h - bow, deck + 0.32, s > 0 ? w : -w + 0.12, hull, { faces: 'NESWT' });
      b.box(-h + 0.4, 0.1, s > 0 ? w : -w - 0.02, h - bow, 0.22, s > 0 ? w + 0.02 : -w, 0xb9ad8f, { faces: s > 0 ? 'S' : 'N' });
    }
    // the stern castle, with a door to its cabin
    b.box(-h + 0.05, deck, -w * 0.8, -h + 1.7, deck + 0.85, w * 0.8, hull, { top: DECK });
    b.box(-h + 1.7, deck + 0.05, -0.3, -h + 1.72, deck + 0.7, 0.3, DARK, { win: interior(0.4), faces: 'E' });
    // the mast, its yard, and the sail furled along it
    const mx = 0.25;
    b.cyl(mx, 0, deck, mastTop, 0.13, 0.08, 6, TIMBER_DARK, { cap: false });
    b.beam([mx, mastTop - 1.5, -beam * 0.85], [mx, mastTop - 1.5, beam * 0.85], 0.07, 0.07, TIMBER_DARK);
    b.beam([mx + 0.05, mastTop - 1.78, -beam * 0.78], [mx + 0.05, mastTop - 1.78, beam * 0.78], 0.2, 0.2, sail);
    // the bowsprit, and the stays from the masthead to the bow and the stern
    b.beam([h - 0.3, deck + 0.2, 0], [h + 1.3, deck + 0.9, 0], 0.07, 0.05, TIMBER_DARK);
    b.beam([mx, mastTop - 0.2, 0], [h + 1.2, deck + 0.85, 0], 0.03, 0.03, 0xb0a48c);
    b.beam([mx, mastTop - 0.2, 0], [-h + 0.4, deck + 0.9, 0], 0.03, 0.03, 0xb0a48c);
  });
  if (lamp) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    k.glows.push({ x: cx - c * (h - 0.3), y: deck + 1.3, z: cz - s * (h - 0.3), sx: 0.25, sy: 0.32, sz: 0.25, color: '#ffd28a' });
  }
}

/** Piles under a deck of planks that stands over the water. */
function piles(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, top: number, every = 1.6): void {
  const n = Math.max(1, Math.round((x1 - x0) / every));
  for (let i = 0; i <= n; i++) {
    const x = x0 + 0.15 + ((x1 - x0 - 0.3) * i) / n;
    for (const z of [z0 + 0.15, z1 - 0.15]) b.cyl(x, z, -1.5, top, 0.13, 0.13, 4, TIMBER_DARK, { cap: false, phase: Q });
  }
}

/** A barrel standing on `y`. */
function barrel(b: GeoBuilder, x: number, z: number, y = 0): void {
  b.cyl(x, z, y, y + 0.7, 0.28, 0.28, 6, 0x7a5a3a, { cap: 0x5e452e });
}

/** A crate standing on `y`. */
function crate(b: GeoBuilder, x: number, z: number, s: number, y = 0): void {
  b.box(x - s, y, z - s, x + s, y + s * 2, z + s, 0x9a7d55, { top: 0x8a6e48 });
}

/** A pine: the engine's, slender. */
function pine(k: Build, x: number, z: number, s: number, y = 0): void {
  k.tree(x, z, s, true, y);
}

/** A gnarled oak: a crooked trunk, two limbs, and lumps of dark leaf on them. */
function oak(b: GeoBuilder, x: number, z: number, s: number, turn: number): void {
  const c = Math.cos(turn), sn = Math.sin(turn);
  const at = (u: number, y: number, v = 0): V3 => [x + (c * u - sn * v) * s, y * s, z + (sn * u + c * v) * s];
  b.sweep([at(0, 0), at(0.25, 1.1), at(-0.1, 2.0), at(0.35, 2.7)], [0.36 * s, 0.3 * s, 0.24 * s, 0.17 * s], 0x5a4a3a);
  b.beam(at(-0.05, 1.9), at(-1.2, 2.9, 0.4), 0.17 * s, 0.1 * s, 0x5a4a3a);
  const LEAF = [0x4d6a3a, 0x5a7340, 0x46603a];
  const lump = (u: number, y: number, v: number, r: number, i: number): void =>
    lathe(b, at(u, 0, v)[0], at(u, 0, v)[2], [[0.2 * s, y * s], [r * s, (y + 0.45 * r) * s], [0.06 * s, (y + 1.3 * r) * s]], 5, LEAF[i % 3]);
  lump(0.4, 2.4, 0.1, 1.35, 0);
  lump(-1.25, 2.6, 0.45, 0.95, 1);

}


// ---------------------------------------------------------------------------
// Heights: the rise under the Shadow Tower, White Harbor's hill, the mound
// of Deepwood Motte and the bank round Bear Island's hall
// ---------------------------------------------------------------------------

const ST = lotOf('shadow-tower');
const WH = lotOf('white-harbor');
const DW = lotOf('deepwood');
const BI = lotOf('bear-island');

/** How high the rock under the Shadow Tower rises. */
const ST_RISE = 2;

/** How far a place lies inland of a stretch of coast, on the side where `ref` is: negative out at sea. */
function inland(x: number, z: number, a: P2, c: P2, ref: P2): number {
  const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz);
  const nx = -dz / len, nz = dx / len;
  const side = Math.sign((ref[0] - a[0]) * nx + (ref[1] - a[1]) * nz) || 1;
  return ((x - a[0]) * nx + (z - a[1]) * nz) * side;
}

/** The rise of rock the Shadow Tower stands on: level at the top, ragged where it falls to the snow and to the shore. */
function shadowRise(x: number, z: number): number {
  const x0 = ST.x0 - 0.5, x1 = ST.x1 + 0.5, z0 = WALL.south, z1 = ST.z1 - 0.55;
  const out = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
  const shore = inland(x, z, COAST_WEST[1], COAST_WEST[2], [(ST.x0 + ST.x1) / 2, (ST.z0 + ST.z1) / 2]);
  const rag = 0.35 * Math.sin(x * 2.3 + z * 1.7) * Math.cos(z * 2.9 - x * 0.7) * smooth(0, 0.5, out);
  return (ST_RISE + rag) * (1 - smooth(0, 1.7, out)) * smooth(0.05, 0.75, shore);
}
const ST_FIELD: Field = field(ST.x0 - 2.4, WALL.south, ST.x1 + 2.4, ST.z1 + 1.8, 0.8, shadowRise);

/** White Harbor's hill, which the New Castle stands on. */
const WH_HILL = { x: WH.x0 + 7.6, z: WH.z0 + 6.0, rx: 3.4, rz: 3.0, y: 2.2 };
function harbourHill(x: number, z: number): number {
  const e = Math.hypot((x - WH_HILL.x) / WH_HILL.rx, (z - WH_HILL.z) / WH_HILL.rz);
  return WH_HILL.y * (1 - smooth(0.55, 1.0, e));
}
const WH_FIELD: Field = field(WH_HILL.x - WH_HILL.rx - 0.4, WH_HILL.z - WH_HILL.rz - 0.4, WH_HILL.x + WH_HILL.rx + 0.4, WH_HILL.z + WH_HILL.rz + 0.4, 1.0, harbourHill);

/** Deepwood's motte: a steep round mound, its radius at each height from the foot to the top. */
const MOTTE = { x: DW.x0 + 2.0, z: DW.z0 + 2.0, rings: [[1.95, 0], [1.75, 1.0], [1.45, 2.4], [1.15, 3.6], [1.05, 4.0]] as [number, number][] };
function motteAt(x: number, z: number): number {
  const d = Math.hypot(x - MOTTE.x, z - MOTTE.z), R = MOTTE.rings;
  if (d >= R[0][0]) return 0;
  if (d <= R[R.length - 1][0]) return R[R.length - 1][1];
  for (let i = 0; i + 1 < R.length; i++) {
    const [r0, y0] = R[i], [r1, y1] = R[i + 1];
    if (d <= r0 && d >= r1) return y0 + ((y1 - y0) * (r0 - d)) / (r0 - r1);
  }
  return 0;
}

/** Bear Island's earthwork: a bank round the hall, with a gap for the gate in its south-east. */
const BANK = { x: BI.x0 + 4.6, z: BI.z0 + 4.4, r: 3.4, half: 0.95, y: 0.8, gate: Math.atan2(VIEW[2], VIEW[0]), gap: 0.36 };
function bankAt(x: number, z: number): number {
  const d = Math.hypot(x - BANK.x, z - BANK.z);
  let a = Math.atan2(z - BANK.z, x - BANK.x) - BANK.gate;
  a = Math.atan2(Math.sin(a), Math.cos(a));
  const across = 1 - smooth(0.25, BANK.half, Math.abs(d - BANK.r));
  return BANK.y * across * smooth(BANK.gap * 0.6, BANK.gap, Math.abs(a));
}
const BI_FIELD: Field = field(BANK.x - BANK.r - 1.2, BANK.z - BANK.r - 1.2, BANK.x + BANK.r + 1.2, BANK.z + BANK.r + 1.2, 0.85, bankAt);

// ---------------------------------------------------------------------------
// The Shadow Tower
// ---------------------------------------------------------------------------

/**
 * The Watch's castle at the west end of the Wall, where the Wall meets the
 * mountains: a tall grim round tower of dark stone on a rise of rock, against
 * the Wall's foot, with a hall and a stable at its foot, a brazier burning on
 * its top, and brothers in black.
 */
function shadowTower(k: Build, l: Lot): void {
  const b = k.b, y = ST_RISE, top = l.top;
  drawField(b, ST_FIELD, {
    color: (h, level) => (level > 0.86 ? (h > y - 0.2 ? SNOW : 0xdfe5e8) : level > 0.6 ? 0x9da2a4 : ROCK_DARK),
    cut: ROCK_DARK, edges: 'N',
  });

  // --- the tower: a plinth that batters out, the shaft, a band of stone half way up, and the fighting top ---
  const r = 1.55, tx = l.x0 + 1.75, tz = l.z0 + 1.7, roof = top - 0.8;
  b.cyl(tx, tz, y - 0.5, y + 1.4, r + 0.32, r + 0.05, 10, C.grimShade, { cap: false });
  roundTower(b, tx, tz, r, roof, C.grim, { y0: y + 1.3, sides: 10, shade: C.grimShade, flare: 0.32, win: { cell: 2.0, storey: (roof - 1) / 5, lit: 0.36, kind: 4 } });
  b.cyl(tx, tz, 11.0, 11.35, r + 0.12, r + 0.12, 10, C.grimShade, { cap: false });
  b.cyl(tx, tz, roof - 1.45, roof - 1.0, r + 0.02, r + 0.32, 10, C.grimShade, { cap: false });
  // its door, on the east, where the hall comes up to it
  onFace(b, tx, tz, r * 0.951, -0.62, y + 1.4, y + 2.9, 0.4, DOOR);
  // on the roof: a brazier, the Watch's black, and two brothers on guard
  lowBrazier(k, tx + 0.1, tz + 0.55, roof);
  banner(b, tx - 0.9, tz - 0.85, roof, 'watch', 3.8);
  brother(b, tx + 1.05, tz - 0.45, roof);
  brother(b, tx - 1.05, tz + 0.1, roof);

  // --- the hall, against the tower's east side ---
  const hx0 = tx + r - 0.25, hx1 = l.x1 - 0.05, hz0 = l.z0 + 0.3, hz1 = l.z0 + 2.65, hy = 5;
  b.box(hx0, y - 0.5, hz0, hx1, hy, hz1, C.grim, { win: { cell: 1.2, storey: hy, lit: 0.42, kind: 4 }, seed: 0.31, faces: 'NESW' });
  gable(b, hx0, hz0, hx1, hz1, hy, 1.3, ROOF.slate, C.grim, 'z', 0.25);
  b.box(hx1 - 0.6, hy + 0.4, hz0 + 0.25, hx1 - 0.2, hy + 1.8, hz0 + 0.65, C.grimShade);
  b.box(hx0 + 0.55, y, hz1, hx0 + 1.15, y + 1.3, hz1 + 0.06, DARK, { win: interior(0.5), faces: 'S' });

  // --- the stable, timber, south of the hall ---
  const sz0 = hz1 + 0.15, sz1 = l.z1 - 0.3;
  b.box(hx0 + 0.1, y - 0.5, sz0, hx1, y + 1.7, sz1, TIMBER, { faces: 'NESW' });
  gable(b, hx0 + 0.1, sz0, hx1, sz1, y + 1.7, 0.7, ROOF.shingle, TIMBER, 'x', 0.2);
  b.box(hx0 + 0.45, y, sz1, hx0 + 1.35, y + 1.35, sz1 + 0.05, 0x241c15, { faces: 'S' });
  // a horse looking out over the half door
  b.box(hx0 + 0.75, y + 0.95, sz1 + 0.02, hx0 + 1.05, y + 1.25, sz1 + 0.5, 0x5b3f2b);

  // --- the yard under the tower, with a brazier and brothers ---
  flat(b, rect(l.x0 + 0.1, tz + r + 0.15, hx0 + 0.05, l.z1 - 0.15), y + 0.03, C.trodden);
  brazier(k, l.x0 + 0.8, l.z1 - 0.9, y);
  brother(b, hx0 - 0.4, l.z1 - 0.6, y);
  brother(b, l.x0 + 1.7, l.z1 - 0.7, y);
  barrel(b, l.x0 + 0.45, tz + r + 0.5, y);

  k.lights.push({ x: tx + 1.2, z: tz + 3.2, r: 10, color: '#ffcf8a', k: 0.5 });
  // the name, east of it, clear of the shore
  nameBoard(k, 'holds-shadow-tower', l.x1 + 4.5, (l.z0 + l.z1) / 2 - 0.3, 0, VIEW, 1.3);
}

// ---------------------------------------------------------------------------
// Eastwatch-by-the-Sea
// ---------------------------------------------------------------------------

/**
 * The Watch's castle where the Wall ends at the Shivering Sea: a square stone
 * keep at the Wall's foot on its seaward side, a round tower, a timber quay
 * out into the sea, and at the quay a black-hulled ship of the Watch with her
 * sail furled. Floes of ice on the water.
 */
function eastwatch(k: Build, l: Lot): void {
  const b = k.b, S = STONE.north, SH = STONE.northShade;
  const x0 = Math.max(l.x0, WALL.x1 + 0.3), x1 = l.x1 - 0.3, z0 = l.z0 + 1.55, z1 = l.z1 - 0.9, kh = 8.4;

  // --- the keep: square, with loops, and battlements round its roof ---
  b.box(x0, 0, z0, x1, kh, z1, S, { win: LOOPS, seed: 0.83, top: SH });
  crenel(b, x0 - 0.1, z0 - 0.1, x1 + 0.1, z1 + 0.1, kh, S, SH, 0.75, 1.8);
  b.box(x0 - 0.1, kh - 0.45, z0 - 0.1, x1 + 0.1, kh, z1 + 0.1, SH, { faces: 'NESWB' });
  // a forework on its south side, lower, with a walk on top
  b.box(x0, 0, z1, x1, 4.2, l.z1 - 0.05, S, { win: LOOPS, seed: 0.19, top: SH });
  crenel(b, x0, z1 + 0.05, x1, l.z1 - 0.05, 4.2, S, SH, 0.6, 1.9);
  // the gate, east, towards the quay, with a torch each side
  const gz = (z0 + z1) / 2 + 0.6;
  b.box(x1, 0, gz - 0.55, x1 + 0.08, 2.1, gz + 0.55, 0x2a2119, { faces: 'E' });
  b.box(x1, 2.1, gz - 0.75, x1 + 0.22, 2.4, gz + 0.75, SH, { faces: 'NESWTB' });
  fire(k, x1 + 0.25, 2.3, gz - 0.95, 0.22, 6);
  fire(k, x1 + 0.25, 2.3, gz + 0.95, 0.22, 0);
  // on the keep's roof, a brazier and the watch
  brazier(k, (x0 + x1) / 2, (z0 + z1) / 2 + 0.6, kh);
  brother(b, x0 + 0.7, z1 - 0.5, kh);
  brother(b, x1 - 0.6, (z0 + z1) / 2 - 0.4, kh);

  // --- the round tower, at the keep's north-east corner, to the lot's top ---
  const tx = x1 - 0.9, tz = l.z0 + 1.05, tr = 1.12, ttop = l.top - 0.8;
  roundTower(b, tx, tz, tr, ttop, S, { sides: 10, shade: SH, win: LOOPS_CLOSE, flare: 0.25 });
  banner(b, tx, tz, ttop, 'watch', 3.8);
  brother(b, tx + 0.45, tz + 0.55, ttop);

  // --- the quay: a boardwalk over the snow from the gate to the shore, and a pier out into the sea ---
  const shore = COAST_EAST[0][0], qz0 = gz - 0.85, qz1 = gz + 0.85, qy = 0.32, far = shore + 8.2;
  b.box(x1 + 0.1, 0, qz0 + 0.15, shore + 0.05, 0.2, qz1 - 0.15, 0x8a7458, { top: 0x9a8263 });
  b.box(shore - 0.25, qy - 0.25, qz0, far, qy, qz1, 0x7a6448, { top: 0x917a5c, faces: 'NESWTB' });
  piles(b, shore, qz0, far, qz1, qy - 0.25, 2.7);
  // the quayside: barrels, crates, a crane for the ship's stores
  for (const [x, z] of [[shore - 1.6, qz0 - 0.5], [shore - 1.0, qz0 - 0.4], [shore - 1.3, qz0 - 1.1]]) barrel(b, x, z);
  crate(b, shore - 2.6, qz1 + 0.5, 0.35);
  crate(b, shore - 2.0, qz1 + 0.6, 0.28);
  const cx = shore + 2.0;
  b.box(cx - 0.18, qy, qz0 + 0.1, cx + 0.18, qy + 3.6, qz0 + 0.46, TIMBER_DARK);
  b.beam([cx, qy + 3.3, qz0 + 0.28], [cx + 1.6, qy + 3.9, qz0 + 1.9], 0.1, 0.08, TIMBER_DARK);
  b.beam([cx + 1.55, qy + 3.85, qz0 + 1.85], [cx + 1.55, qy + 1.6, qz0 + 1.85], 0.025, 0.025, 0xb0a48c);
  crate(b, cx + 1.55, qz0 + 1.85, 0.25, qy + 1.1);
  brother(b, shore - 0.8, gz + 0.2, 0.2);
  brother(b, shore + 4.5, gz, qy);
  brother(b, shore + 3.3, gz - 0.3, qy);
  lantern(k, far - 0.3, qz0 + 0.2, qy, 1.6, TIMBER_DARK);

  // --- the Watch's ship, black-hulled, moored on the pier's south side ---
  const sx = shore + 4.6, sz = qz1 + 1.25;
  ship(k, sx, sz, 0, 7.6, 2.2, 0x1c1c20, 0x2f2f35, 9);
  brother(b, sx - 2.4, sz, 1.35);

  // --- floes of ice on the sea round it ---
  const rand = rng(0xea57);
  let placed = 0;
  for (let tries = 0; tries < 60 && placed < 8; tries++) {
    const fx = shore + 1.5 + rand() * 12.5, fz = -111 + rand() * 38, fr = 0.7 + rand() * 1.5;
    if (fx + fr > 103.5) continue;
    if (fx - fr < far + 1.5 && fz + fr > qz0 - 1 && fz - fr < sz + 2.2) continue;
    if (!isWater(fx - fr, fz) || !isWater(fx, fz - fr) || !isWater(fx, fz + fr) || fx - fr < shore + 0.4) continue;
    const pts: P2[] = Array.from({ length: 6 }, (_, i): P2 => {
      const a = (i / 6) * Math.PI * 2 + rand() * 0.6, rr = fr * (0.7 + rand() * 0.35);
      return [fx + Math.cos(a) * rr, fz + Math.sin(a) * rr * (0.75 + rand() * 0.3)];
    });
    prism(b, pts, -1.0, -0.77, C.floeSide, { top: C.floe });
    placed++;
  }

  k.lights.push({ x: x1 + 2.5, z: gz, r: 11, color: '#ffcf8a', k: 0.55 }, { x: sx, z: sz - 0.5, r: 9, color: '#ffcf8a', k: 0.4 });
  nameBoard(k, 'holds-eastwatch', shore - 2.6, l.z1 + 5.2, 0, VIEW, 1.4);
}

// ---------------------------------------------------------------------------
// Queenscrown
// ---------------------------------------------------------------------------

/**
 * A small lake, and on an islet in it a round holdfast tower whose merlons
 * were once gilded, so that it seems to wear a crown. A causeway just under
 * the water runs to the bank, where an abandoned village stands: roofless
 * cottages, an old inn with its sign fallen, and apple trees gone wild.
 */
function queenscrown(k: Build, l: Lot): void {
  const b = k.b, cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, level = -0.7;
  const at = (dx: number, dz: number): P2 => [cx + dx, cz + dz];

  // --- the lake, and the bank round it, which floors the whole wet lot ---
  const lake: P2[] = [at(-3.6, -3.6), at(5.1, -3.7), at(6.9, 1.7), at(4.5, 5.0), at(-1.8, 5.1), at(-4.2, 2.5), at(-4.4, -0.6)];
  flat(k.street, WET.queenscrown, 0, SNOW, { win: GROUND, holes: [lake] });
  water(k, lake, { drop: -level, color: 0x5a8aa0, quay: 0x7f7a6c });

  // --- the islet ---
  const ix = cx - 0.05, iz = cz - 0.05;
  const islet: P2[] = Array.from({ length: 11 }, (_, i): P2 => {
    const a = (i / 11) * Math.PI * 2, rr = 2.15 + 0.25 * Math.sin(i * 2.7);
    return [ix + Math.cos(a) * rr * 1.08, iz + Math.sin(a) * rr * 0.95];
  });
  walls(b, islet, level - 0.6, 0.32, ROCK);
  flat(b, islet, 0.32, 0xdfe4e3);
  for (const [dx, dz, s] of [[2.1, 0.9, 0.35], [-1.6, -1.5, 0.3], [1.2, -1.85, 0.28], [-2.2, 0.6, 0.32]]) b.box(ix + dx - s, level - 0.1, iz + dz - s, ix + dx + s, 0.35, iz + dz + s * 0.8, ROCK_DARK, { top: 0xd6dcdc });

  // --- the causeway: a pale line of stones just under the water, from the islet to the bank in the south-west ---
  const from: P2 = [ix - 1.35, iz + 1.65], to: P2 = at(-3.25, 3.55);
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]), ux = (to[0] - from[0]) / len, uz = (to[1] - from[1]) / len;
  const stones = 7;
  for (let i = 0; i < stones; i++) {
    const t0 = i / stones, t1 = (i + 0.86) / stones, w = 0.42 + 0.06 * Math.sin(i * 1.9);
    const p = (t: number, s: number): P2 => [from[0] + ux * len * t - uz * w * s, from[1] + uz * len * t + ux * w * s];
    flat(b, [p(t0, -1), p(t1, -1), p(t1, 1), p(t0, 1)], level + 0.03, 0x9cbdc4);
  }
  area(k, [[to[0] - 0.4, to[1] - 0.45], [to[0] + 0.4, to[1] - 0.2], [to[0] - 0.9, to[1] + 1.4], [to[0] - 1.6, to[1] + 0.9]], C.trodden, 0.035);

  // --- the tower: grey stone, its door towards the causeway, and the crown of gilt merlons, faded ---
  const tx = ix - 0.1, tz = iz - 0.15, r = 1.45, sides = 10, door = Math.atan2(from[1] - tz, from[0] - tx);
  const ph = door - Math.PI / sides, flare = 0.24, band = l.top - 1.4, crown = l.top - 0.8;
  b.cyl(tx, tz, 0.2, band, r, r, sides, STONE.north, { phase: ph, cap: false, win: { cell: 1.9, storey: band / 2, lit: 0.18, kind: 4 }, seed: 0.57 });
  b.cyl(tx, tz, band, crown, r + flare, r + flare, sides, STONE.northShade, { phase: ph, cap: 0x8a8b86 });
  b.cyl(tx, tz, band - 0.35, band, r, r + flare, sides, STONE.northShade, { phase: ph, cap: false });
  onFace(b, tx, tz, r * Math.cos(Math.PI / sides), door, 0.32, 1.9, 0.38, 0x2a2119);
  for (let i = 0; i < sides; i++) {
    const a = ph + ((i + 0.5) / sides) * Math.PI * 2, R = (r + flare) * Math.cos(Math.PI / sides) - 0.19;
    const w = (r + flare) * Math.sin(Math.PI / sides) * 0.78, gilt = i % 3 === 1 ? C.giltFaded : C.gilt;
    b.obox(tx + Math.cos(a) * R, crown + 0.4, tz + Math.sin(a) * R, 0.19, 0.4, w, a, gilt, { top: i % 3 === 1 ? C.giltFaded : C.giltTop });
  }
  // a fire inside, where someone has sheltered: one window glows at the top
  const wa = door + Math.PI * 0.55;
  onFace(b, tx, tz, r * Math.cos(Math.PI / sides), wa, band - 1.5, band - 0.7, 0.18, 0x3a2a1c, 0.06, { win: interior(0.9) });
  k.lights.push({ x: tx + Math.cos(wa) * 3, z: tz + Math.sin(wa) * 3, r: 7, color: '#ffb877', k: 0.3 });

  // --- the village on the west bank: three roofless cottages and the old inn ---
  const cottage = (x0: number, z0: number, x1: number, z1: number, hgt: number, broken: number): void => {
    const t = 0.22, gx = (x0 + x1) / 2;
    b.box(x0, 0, z0, x1, hgt, z0 + t, C.fieldstone, { top: C.fieldstoneTop });
    b.box(x0, 0, z0 + t, x0 + t, hgt * broken, z1 - t, C.fieldstone, { top: C.fieldstoneTop });
    b.box(x1 - t, 0, z0 + t, x1, hgt, z1 - t, C.fieldstone, { top: C.fieldstoneTop });
    // the front, with the door's gap in it
    b.box(x0, 0, z1 - t, gx - 0.35, hgt * (0.6 + broken * 0.4), z1, C.fieldstone, { top: C.fieldstoneTop });
    b.box(gx + 0.35, 0, z1 - t, x1, hgt * 0.8, z1, C.fieldstone, { top: C.fieldstoneTop });
    // one gable end still stands to its peak
    face3(b, [x1 - t, hgt, z0 + t], [x1 - t, hgt, z1 - t], [x1 - t, hgt + 0.9, (z0 + z1) / 2], [-1, 0, 0], C.fieldstone);
    face3(b, [x1, hgt, z0 + t], [x1, hgt, z1 - t], [x1, hgt + 0.9, (z0 + z1) / 2], [1, 0, 0], C.fieldstone);
    b.box(x1 - t, hgt, z0 + t, x1, hgt + 0.02, z1 - t, C.fieldstone, { faces: 'B' });
    // inside, rubble and a fallen beam
    flat(b, rect(x0 + t, z0 + t, x1 - t, z1 - t), 0.05, 0x7a7266);
    b.beam([x0 + t + 0.1, 0.1, z0 + t + 0.2], [x1 - t - 0.1, hgt * 0.7, z1 - t - 0.3], 0.09, 0.09, TIMBER_DARK);
  };
  cottage(cx - 7.2, cz - 0.1, cx - 5.4, cz + 1.4, 1.5, 0.55);
  cottage(cx - 6.5, cz + 2.3, cx - 4.85, cz + 3.65, 1.4, 0.7);
  cottage(cx - 5.0, cz + 4.4, cx - 3.4, cz + 5.55, 1.3, 0.5);

  // the inn: a stone ground floor, a timber floor above it, and its roof half fallen in
  const n0x = cx - 7.0, n1x = cx - 4.7, n0z = cz - 2.85, n1z = cz - 0.75, ny = 2.6;
  b.box(n0x, 0, n0z, n1x, 1.4, n1z, C.fieldstone, { faces: 'NESW' });
  b.box(n0x + 0.05, 1.4, n0z + 0.05, n1x - 0.05, ny, n1z - 0.05, 0x8d7a62, { faces: 'NESW' });
  for (const [s, e] of [[n0x + 0.3, 0.55], [n1x - 0.85, 0.55]] as [number, number][]) b.box(s, 0.4, n1z, s + e, 1.15, n1z + 0.05, 0x2b241d, { faces: 'S' });
  b.box(n0x + 1.0, 0, n1z, n0x + 1.55, 1.25, n1z + 0.06, 0x241d17, { faces: 'S' });
  b.box(n0x + 0.4, 1.7, n1z - 0.05, n0x + 0.9, 2.2, n1z, 0x2b241d, { faces: 'S' });
  b.box(n1x - 0.9, 1.7, n1z - 0.05, n1x - 0.4, 2.2, n1z, 0x2b241d, { faces: 'S' });
  // the north slope of the roof still on, and its ceiling under it; the south slope only rafters
  const mz = (n0z + n1z) / 2, rise = 1.3;
  slab(b, [n0x - 0.2, ny + rise, mz], [n1x + 0.2, ny + rise, mz], 0.05, 0.08, ROOF.shingle);
  slab(b, [(n0x + n1x) / 2, ny + rise, mz], [(n0x + n1x) / 2, ny - 0.05, n0z - 0.35], (n1x - n0x) / 2 + 0.2, 0.09, ROOF.shingle, { under: TIMBER_DARK });
  for (const x of [n0x + 0.2, n0x + 0.95, n1x - 0.95, n1x - 0.2]) b.beam([x, ny + rise, mz], [x, ny, n1z + 0.3], 0.07, 0.07, TIMBER_DARK);
  face3(b, [n0x, ny, n0z], [n0x, ny, n1z], [n0x, ny + rise, mz], [-1, 0, 0], 0x8d7a62);
  face3(b, [n1x, ny, n0z], [n1x, ny, n1z], [n1x, ny + rise, mz], [1, 0, 0], 0x8d7a62);
  b.box(n0x + 0.05, ny - 0.04, n0z + 0.05, n1x - 0.05, ny - 0.02, n1z - 0.05, 0x5d4c3a, { faces: 'T' });
  // the post of its sign, and the sign lying in the snow at its foot
  const px = n1x + 0.55, pz = n1z + 0.55;
  b.box(px - 0.08, 0, pz - 0.08, px + 0.08, 2.2, pz + 0.08, TIMBER_DARK);
  b.beam([px, 2.05, pz], [px - 0.85, 2.05, pz], 0.05, 0.05, TIMBER_DARK);
  b.obox(px - 0.35, 0.07, pz + 0.55, 0.42, 0.06, 0.3, 0.4, 0x8a6a45, { top: 0x7c5f3e });

  // apple trees, gone wild, among the ruins and along the bank
  for (const [dx, dz, s] of [[-6.4, -4.0, 0.5], [-4.9, -3.6, 0.42], [-6.9, 2.0, 0.45], [-3.5, 3.7, 0.38], [-5.6, 4.8, 0.4], [-7.2, -1.2, 0.36]]) k.tree(cx + dx, cz + dz, s);

  nameBoard(k, 'holds-queenscrown', cx + 8.6, cz + 7.2, 0, VIEW, 1.3);
}

// ---------------------------------------------------------------------------
// Mole's Town
// ---------------------------------------------------------------------------

/**
 * The village south of the Wall that lives under the ground for the winter.
 * From above it is a few low mounds with doors and smoking pipes, huts no
 * bigger than a privy, cellar doors in the snow, a well, a lantern on a post,
 * a few people and a goat. Nothing stands higher than its top.
 */
function molesTown(k: Build, l: Lot): void {
  const b = k.b, top = l.top;
  /** The Castle Black armoury's lot reaches into this one's north edge: keep clear of it. */
  const armoury = lotOf('cb-armoury');
  const z0 = Math.max(l.z0, armoury.z1 + 0.2);
  const chimneys: V3[] = [];

  const mound = (x: number, z: number, r: number, h: number, door: number, pipe: boolean): void => {
    lathe(b, x, z, [[r, 0], [r * 0.93, h * 0.35]], 9, C.earth);
    lathe(b, x, z, [[r * 0.93, h * 0.35], [r * 0.72, h * 0.72], [r * 0.4, h * 0.95], [0.05, h]], 9, 0xeef2f4);
    // the porch of its door, dug into its side
    const c = Math.cos(door), s = Math.sin(door), d = r * 0.82;
    b.obox(x + c * d, 0.5, z + s * d, 0.38, 0.5, 0.5, door, TIMBER, { top: 0xe8edef });
    b.obox(x + c * (d + 0.39), 0.42, z + s * (d + 0.39), 0.02, 0.4, 0.3, door, 0x2a2119);
    if (pipe) {
      const px = x - c * r * 0.3, pz = z - s * r * 0.3;
      b.cyl(px, pz, h * 0.6, top - 0.1, 0.12, 0.12, 6, 0x55504a, { cap: 0x222222 });
      chimneys.push([px, top - 0.1, pz]);
    }
  };
  const hut = (x: number, z: number, w: number, h: number): void => {
    b.box(x - w / 2, 0, z - w / 2, x + w / 2, h, z + w / 2, 0x7a604a, { faces: 'NESW' });
    slab(b, [x, h + 0.42, z - w / 2 - 0.15], [x, h - 0.02, z + w / 2 + 0.2], w / 2 + 0.12, 0.08, 0xe6ebee, { under: TIMBER_DARK });
    face3(b, [x - w / 2, h, z - w / 2], [x - w / 2, h, z + w / 2], [x - w / 2, h + 0.4, z - w / 2], [-1, 0, 0], 0x7a604a);
    face3(b, [x + w / 2, h, z - w / 2], [x + w / 2, h, z + w / 2], [x + w / 2, h + 0.4, z - w / 2], [1, 0, 0], 0x7a604a);
    b.box(x - 0.25, 0, z + w / 2, x + 0.25, h - 0.3, z + w / 2 + 0.04, 0x3a2c20, { faces: 'S' });
    b.cyl(x + w / 2 - 0.2, z - w / 2 + 0.2, h, top - 0.1, 0.1, 0.1, 6, 0x55504a, { cap: 0x222222 });
    chimneys.push([x + w / 2 - 0.2, top - 0.1, z - w / 2 + 0.2]);
  };
  const cellar = (x: number, z: number, yaw: number): void => {
    b.moved(x, 0, z, yaw, () => {
      b.box(-0.6, 0, -0.65, 0.6, 0.1, 0.65, C.earthDark, { top: C.earthDark });
      for (const s of [-1, 1]) slab(b, [s * 0.27, 0.42, -0.5], [s * 0.27, 0.13, 0.5], 0.25, 0.06, 0x7d6448, { under: TIMBER_DARK });
    });
  };

  const x0 = l.x0;
  mound(x0 + 3.6, z0 + 2.9, 1.6, 1.6, Math.PI * 0.45, true);
  mound(x0 + 7.2, z0 + 2.6, 1.35, 1.4, Math.PI * 0.3, true);
  mound(x0 + 1.4, z0 + 0.95, 1.0, 0.85, Math.PI * 0.9, false);
  hut(x0 + 5.9, l.z1 - 0.9, 1.1, 1.9);
  hut(x0 + 9.3, z0 + 1.7, 1.05, 1.8);
  cellar(x0 + 0.9, l.z1 - 2.6, 0);
  cellar(x0 + 3.3, l.z1 - 0.55, Math.PI / 2);
  cellar(x0 + 8.1, l.z1 - 0.6, 0.2);

  // the well
  const wx = l.x1 - 0.9, wz = l.z1 - 1.4;
  b.cyl(wx, wz, 0, 0.65, 0.55, 0.55, 8, 0x8f8a80, { cap: 0x1e2428 });
  for (const s of [-1, 1]) b.box(wx + s * 0.5 - 0.06, 0, wz - 0.06, wx + s * 0.5 + 0.06, 1.75, wz + 0.06, TIMBER_DARK);
  b.beam([wx - 0.55, 1.5, wz], [wx + 0.55, 1.5, wz], 0.06, 0.06, TIMBER_DARK);
  gable(b, wx - 0.6, wz - 0.45, wx + 0.6, wz + 0.45, 1.75, 0.55, 0xe6ebee, TIMBER, 'x', 0.1);
  b.box(wx - 0.55, 1.74, wz - 0.4, wx + 0.55, 1.75, wz + 0.4, TIMBER_DARK, { faces: 'B' });
  b.box(wx - 0.12, 0.9, wz - 0.12, wx + 0.12, 1.3, wz + 0.12, 0x7a5a3a);

  // paths trodden in the snow, from the kingsroad to the doors
  area(k, [[x0 - 3.2, l.z1 - 2.3], [x0 + 9.0, l.z1 - 2.0], [x0 + 9.0, l.z1 - 1.3], [x0 - 3.2, l.z1 - 1.5]], C.trodden, 0.035);

  lantern(k, x0 + 4.8, l.z1 - 0.6, 0, top - 0.85, TIMBER_DARK);

  // the goat, white, on its tether
  const gx = x0 + 1.8, gz = l.z1 - 0.8;
  b.box(gx - 0.35, 0.42, gz - 0.16, gx + 0.35, 0.78, gz + 0.16, 0xe3ddd0);
  for (const [lx, lz] of [[-0.27, -0.1], [0.27, -0.1], [-0.27, 0.1], [0.27, 0.1]]) b.box(gx + lx - 0.05, 0, gz + lz - 0.05, gx + lx + 0.05, 0.42, gz + lz + 0.05, 0x6b5a48, { faces: 'NESW' });
  b.box(gx + 0.32, 0.7, gz - 0.11, gx + 0.58, 0.95, gz + 0.11, 0xe3ddd0);
  for (const s of [-1, 1]) b.beam([gx + 0.42, 0.93, gz + s * 0.07], [gx + 0.3, 1.12, gz + s * 0.12], 0.03, 0.02, 0x5a4b3c);
  b.beam([gx - 0.1, 0.55, gz], [gx - 0.9, 0.05, gz + 0.3], 0.015, 0.015, 0xa6977c);
  k.person(x0 + 4.3, l.z1 - 1.0);
  k.person(wx - 0.9, wz + 0.3);
  k.person(x0 + 2.6, l.z1 - 0.45);

  // smoke from every pipe
  const smoke = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 90);
  k.group.add(smoke.mesh);
  const from = new THREE.Vector3(), drift = new THREE.Vector3(0.35, 0.25, 0.12), due = chimneys.map((_, i) => i * 0.13);
  k.each((dt) => {
    chimneys.forEach((c, i) => {
      due[i] -= dt;
      if (due[i] > 0) return;
      due[i] = 0.45 + Math.random() * 0.3;
      smoke.puff(from.set(c[0], c[1] + 0.1, c[2]), drift, 0.32, 0.78);
    });
    smoke.update(dt);
  });

  k.lights.push({ x: x0 + 5, z: l.z1 - 1, r: 9, color: '#ffcf8a', k: 0.45 });
  nameBoard(k, 'holds-moles-town', l.x0 + 4.0, l.z1 + 3.2, 0, VIEW, 1.1);
}

// ---------------------------------------------------------------------------
// White Harbor
// ---------------------------------------------------------------------------

/** A stretch of city wall with merlons on its outer edge: `out` says which side that is, 1 to the left of the way from a to c. */
function cityWall(b: GeoBuilder, a: P2, c: P2, top: number, out: number, color: number, shade: number, thick = 1.2): void {
  const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dz, dx);
  b.obox((a[0] + c[0]) / 2, top / 2, (a[1] + c[1]) / 2, len / 2, top / 2, thick / 2, yaw, color, { top: shade });
  const n = Math.max(1, Math.round(len / 2.6)), nx = -Math.sin(yaw), nz = Math.cos(yaw), h = thick / 2 - 0.18;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    b.obox(a[0] + dx * t + nx * out * h, top + 0.38, a[1] + dz * t + nz * out * h, (len / n) * 0.28, 0.38, 0.18, yaw, color, { top: shade });
  }
}

/**
 * The North's one city, on the Bite: thick white walls, whitewashed houses
 * with steep slate roofs, the New Castle pale on its hill in the middle, the
 * Wolf's Den old and black at the water's edge, the quay and its stone mole,
 * the Seal Rock out in the water, and two ships at the quay.
 */
function whiteHarbor(k: Build, l: Lot): void {
  const b = k.b, W = STONE.white, WS = STONE.whiteShade;
  const t = 1.2, wx0 = l.x0 + t / 2, wx1 = l.x1 - t / 2, wz0 = l.z0 + t / 2, wz1 = l.z1 - t / 2;

  // --- the ground inside the walls: cobbles, and the hill ---
  area(k, rect(l.x0 + 0.3, l.z0 + 0.3, l.x1 - 0.3, l.z1 - 0.3), 0xbab6ad, 0.035);
  drawField(b, WH_FIELD, {
    color: (h, level) => (level > 0.9 ? (h > WH_HILL.y - 0.1 ? 0xe4e8ea : 0xd9dedf) : level > 0.7 ? 0xc5ccca : 0x9a9a92),
    cut: 0x9a9a92, edges: '',
  });

  // --- the walls: tall to the land, a sea wall to the harbour ---
  const WD = { x0: l.x1 - 5.0, x1: l.x1 - 0.2, z0: l.z0 + 0.2, z1: l.z0 + 4.3 };
  cityWall(b, [wx0, wz0 + t / 2], [wx0, wz1 - t / 2], 5.6, 1, W, WS, t);
  cityWall(b, [wx0, wz0], [WD.x0 + 0.4, wz0], 5.6, -1, W, WS, t);
  cityWall(b, [wx0, wz1], [wx1, wz1], 3.8, 1, W, WS, t);
  cityWall(b, [wx1, WD.z1 - 0.4], [wx1, wz1 - t / 2], 3.2, -1, W, WS, t);
  // towers at the corners, and two at the gate in the south wall
  roundTower(b, wx0, wz0, 1.35, 7.4, W, { shade: WS, win: LOOPS, sides: 8 });
  roundTower(b, wx0, wz1, 1.25, 6.2, W, { shade: WS, win: LOOPS, sides: 8 });
  roundTower(b, wx1, wz1, 1.2, 5.2, W, { shade: WS, win: LOOPS, sides: 8 });
  const gx = l.x0 + 7.7;
  b.box(gx - 1.6, 0, wz1 - 0.9, gx + 1.6, 5.0, wz1 + 0.9, W, { win: LOOPS, seed: 0.74, top: WS });
  crenel(b, gx - 1.68, wz1 - 0.98, gx + 1.68, wz1 + 0.98, 5.0, W, WS, 0.6, 1.6);
  b.box(gx - 0.7, 0, wz1 + 0.9, gx + 0.7, 2.4, wz1 + 0.96, 0x2a2119, { faces: 'S' });
  for (const s of [-1, 1]) fire(k, gx + s * 0.95, 2.6, wz1 + 1.15, 0.22, s < 0 ? 7 : 0);
  // the sea gate, in the middle of the sea wall
  const sgz = (WD.z1 + wz1) / 2 + 0.6;
  b.box(wx1 + t / 2, 0, sgz - 0.6, wx1 + t / 2 + 0.06, 2.0, sgz + 0.6, 0x2a2119, { faces: 'E' });
  fire(k, wx1 + t / 2 + 0.2, 2.3, sgz - 0.85, 0.2, 6);

  // --- the Wolf's Den: the old castle, black, in the corner at the water ---
  const B = C.wolfsDen, BS = C.wolfsDenShade;
  const kx0 = WD.x1 - 2.9, kz1 = WD.z0 + 2.9;
  b.box(kx0, 0, WD.z0, WD.x1, 8.4, kz1, B, { win: LOOPS, seed: 0.66, top: BS });
  crenel(b, kx0 - 0.08, WD.z0 - 0.08, WD.x1 + 0.08, kz1 + 0.08, 8.4, B, BS, 0.7, 1.7);
  cityWall(b, [WD.x0, WD.z0 + 0.5], [kx0, WD.z0 + 0.5], 4.6, -1, B, BS, 1.0);
  cityWall(b, [WD.x0 + 0.5, WD.z0 + 0.5], [WD.x0 + 0.5, WD.z1 - 0.5], 4.6, 1, B, BS, 1.0);
  cityWall(b, [WD.x0 + 0.5, WD.z1 - 0.5], [WD.x1 - 0.5, WD.z1 - 0.5], 4.6, 1, B, BS, 1.0);
  cityWall(b, [WD.x1 - 0.5, kz1], [WD.x1 - 0.5, WD.z1 - 0.5], 4.6, -1, B, BS, 1.0);
  roundTower(b, WD.x0 + 0.6, WD.z1 - 0.6, 0.9, 6.2, B, { shade: BS, win: LOOPS, sides: 8 });
  flat(b, rect(WD.x0 + 1.0, kz1 + 0.05, WD.x1 - 1.0, WD.z1 - 1.0), 0.05, 0x6b6a68);
  b.box(WD.x0 + 1.4, 0, kz1, WD.x0 + 2.0, 1.6, kz1 + 0.05, 0x241d17, { faces: 'S' });
  fire(k, WD.x0 + 1.2, 1.8, kz1 + 0.3, 0.2, 5);

  // --- the New Castle: pale, on its hill, a keep, a tall round tower, and a hall to the south ---
  const hy = WH_HILL.y, nx = WH_HILL.x, nz = WH_HILL.z;
  const kw = 1.15, keepTop = 9.6;
  b.box(nx - kw, hy - 0.6, nz - kw, nx + kw, keepTop, nz + kw, W, { win: { cell: 1.4, storey: keepTop / 3, lit: 0.45, kind: 4 }, seed: 0.21, top: WS });
  crenel(b, nx - kw - 0.08, nz - kw - 0.08, nx + kw + 0.08, nz + kw + 0.08, keepTop, W, WS, 0.65, 1.6);
  const ntx = nx - kw + 0.1, ntz = nz - kw + 0.1, ntop = l.top - 0.8;
  roundTower(b, ntx, ntz, 0.85, ntop, W, { y0: 1.0, sides: 10, shade: WS, win: LOOPS_CLOSE });
  bandedFlag(b, ntx, ntz, ntop, 3.8, MANDERLY);
  // the hall, with tall windows to the south and steps down the hill
  const hz0 = nz + kw - 0.05, hz1 = nz + kw + 1.0;
  b.box(nx - 1.5, 0.8, hz0, nx + 1.5, 5.2, hz1, W, { win: LANCETS, seed: 0.44, faces: 'NESW' });
  gable(b, nx - 1.5, hz0, nx + 1.5, hz1, 5.2, 0.9, ROOF.slate, W, 'x', 0.2);
  b.box(nx - 0.3, 1.6, hz1, nx + 0.3, 3.0, hz1 + 0.05, DARK, { win: interior(0.6), faces: 'S' });
  slab(b, [nx, 1.6, hz1 + 0.1], [nx, 0.05, nz + WH_HILL.rz + 0.2], 0.4, 0.4, 0xd3cec2);
  lowBrazier(k, nx + 0.4, nz + 0.3, keepTop);
  k.person(nx + 0.7, nz - 0.6, keepTop);

  // --- the houses: whitewashed, with steep dark slate roofs ---
  const house = (x0: number, z0: number, x1: number, z1: number, storeys: number, rise: number, along: 'x' | 'z', seed: number): void => {
    const eaves = 2.6 * storeys;
    b.box(x0, 0, z0, x1, eaves, z1, C.whitewash, { win: HOUSE_WIN, seed, faces: 'NESW' });
    gable(b, x0, z0, x1, z1, eaves, rise, ROOF.slate, C.whitewash, along, 0.25);
    const cx = along === 'x' ? x0 + 0.5 : (x0 + x1) / 2, cz = along === 'x' ? (z0 + z1) / 2 : z0 + 0.5;
    if (storeys > 1) b.box(cx - 0.2, eaves + rise * 0.4, cz - 0.2, cx + 0.2, eaves + rise + 0.45, cz + 0.2, 0x8a8780);
  };
  const ix0 = l.x0 + t + 0.15, iz1 = l.z1 - t - 0.15;
  // along the west wall
  house(ix0, l.z0 + 1.4, ix0 + 2.1, l.z0 + 3.5, 2, 1.9, 'z', 0.11);
  house(ix0, l.z0 + 3.9, ix0 + 1.9, l.z0 + 6.3, 1, 1.5, 'z', 0.23);
  house(ix0, l.z0 + 6.7, ix0 + 2.2, l.z0 + 8.9, 2, 1.8, 'z', 0.37);
  // along the north wall, behind the hill
  house(l.x0 + 4.3, l.z0 + 1.4, l.x0 + 6.6, l.z0 + 2.9, 2, 1.3, 'x', 0.41);
  house(l.x0 + 6.8, l.z0 + 1.4, l.x0 + 9.2, l.z0 + 2.8, 1, 1.4, 'x', 0.53);
  house(l.x0 + 9.4, l.z0 + 1.4, WD.x0 - 0.2, l.z0 + 2.9, 2, 1.2, 'x', 0.67);
  // along the south wall, either side of the gate
  house(ix0, iz1 - 1.5, gx - 4.0, iz1, 1, 1.25, 'x', 0.71);
  house(gx - 3.8, iz1 - 1.5, gx - 1.1, iz1, 1, 1.45, 'x', 0.83);
  house(gx + 1.1, iz1 - 1.5, gx + 3.6, iz1, 1, 1.3, 'x', 0.97);
  // by the harbour, between the hill and the sea wall
  const ex1 = l.x1 - t - 0.15;
  house(ex1 - 3.0, l.z0 + 4.9, ex1, l.z0 + 6.9, 2, 1.6, 'x', 0.13);
  house(ex1 - 2.8, l.z0 + 7.3, ex1, l.z0 + 8.9, 1, 1.4, 'x', 0.29);

  // --- the merman in his yard, by the sea gate: a stone merman with a trident ---
  const mx = ex1 - 1.6, mz = iz1 - 0.9;
  area(k, rect(gx + 3.9, iz1 - 2.0, ex1, iz1), 0xd2cec4, 0.045);
  b.box(mx - 0.45, 0, mz - 0.45, mx + 0.45, 0.6, mz + 0.45, 0xb9b4a8, { top: 0xa9a498 });
  b.cyl(mx, mz, 0.6, 1.5, 0.32, 0.22, 6, 0x9aa49c, { cap: false });
  b.beam([mx, 0.7, mz], [mx + 0.55, 0.95, mz + 0.3], 0.14, 0.05, 0x9aa49c);
  b.box(mx - 0.3, 1.5, mz - 0.2, mx + 0.3, 2.3, mz + 0.2, 0x9aa49c);
  b.box(mx - 0.17, 2.3, mz - 0.17, mx + 0.17, 2.66, mz + 0.17, 0x9aa49c);
  b.beam([mx + 0.45, 0.6, mz], [mx + 0.45, 3.3, mz], 0.05, 0.05, 0x8a948c);
  for (const dz of [-0.18, 0, 0.18]) b.beam([mx + 0.45, 3.0, mz + dz], [mx + 0.45, 3.4, mz + dz], 0.035, 0.02, 0x8a948c);
  b.beam([mx + 0.45, 3.0, mz - 0.2], [mx + 0.45, 3.0, mz + 0.2], 0.035, 0.035, 0x8a948c);

  // --- the quay, along the shore outside the sea wall ---
  const coastAt = (z: number): number => {
    const a = COAST_EAST[1], c = COAST_EAST[2];
    return a[0] + ((c[0] - a[0]) * (z - a[1])) / (c[1] - a[1]);
  };
  area(k, [[l.x1 + 0.05, l.z0 - 0.5], [coastAt(l.z0 - 0.5) - 0.05, l.z0 - 0.5], [coastAt(l.z1 - 1.5) - 0.05, l.z1 - 1.5], [l.x1 + 0.05, l.z1 - 1.5]], 0xa8a499, 0.035);
  // the mole: a long arm of stone out into the Bite, with a lantern at its end
  const m0: P2 = [coastAt(sgz) - 0.6, sgz + 0.4], m1: P2 = [m0[0] + 8.6, m0[1] + 2.4];
  const myaw = Math.atan2(m1[1] - m0[1], m1[0] - m0[0]), mlen = Math.hypot(m1[0] - m0[0], m1[1] - m0[1]);
  b.obox((m0[0] + m1[0]) / 2, -0.55, (m0[1] + m1[1]) / 2, mlen / 2, 1.0, 0.8, myaw, 0xb4b0a6, { top: 0xc4c0b6 });
  b.cyl(m1[0], m1[1], -1.5, 0.6, 1.05, 1.05, 8, 0xb4b0a6, { cap: 0xc4c0b6 });
  lantern(k, m1[0], m1[1], 0.45, 2.0, 0x6b6b70);
  for (const s of [0.25, 0.55]) barrel(b, m0[0] + Math.cos(myaw) * mlen * s, m0[1] + Math.sin(myaw) * mlen * s + 0.3, 0.45);
  // two ships: one along the quay, one along the mole
  const shore0 = coastAt(l.z0);
  ship(k, shore0 + 1.9, l.z0 + 1.4, Math.PI / 2, 7.0, 2.2, 0x5b4634, 0xe8e1cf, 9);
  const mn = [Math.sin(myaw), -Math.cos(myaw)], mt = 0.62;
  ship(k, m0[0] + Math.cos(myaw) * mlen * mt + mn[0] * 2.0, m0[1] + Math.sin(myaw) * mlen * mt + mn[1] * 2.0, myaw, 6.4, 2.0, 0x2f5a55, 0xddd6c3, 8.6);
  // folk on the quay, and barrels and crates for the ships
  for (const [x, z] of [[l.x1 + 0.9, l.z0 + 2.2], [l.x1 + 1.1, l.z0 + 4.6], [l.x1 + 0.7, sgz + 1.4]]) k.person(x, z);
  barrel(b, l.x1 + 0.6, l.z0 + 0.4);
  barrel(b, l.x1 + 1.1, l.z0 + 0.7);
  crate(b, l.x1 + 0.55, l.z0 + 3.4, 0.3);

  // --- the Seal Rock, out in the water: a low grey rock, a ring of old stones, and seals ---
  const rx = m1[0] + 2.6, rz = m1[1] + 4.2;
  lathe(b, rx, rz, [[2.2, -1.3], [2.15, 0.05], [1.65, 0.45], [0.9, 0.7], [0.05, 0.78]], 9, 0x8c8a85);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3, rr = 0.68;
    b.obox(rx + Math.cos(a) * rr, 0.85 + (i % 3) * 0.06, rz + Math.sin(a) * rr, 0.09, 0.32 - (i % 2) * 0.08, 0.15, a, 0x5f5d5a, { top: 0x726f6b });
  }
  for (const [a, s] of [[0.5, 1], [1.9, 0.85], [3.3, 0.95], [4.6, 0.8]] as [number, number][]) {
    const sx = rx + Math.cos(a) * 1.75, sz = rz + Math.sin(a) * 1.75;
    b.obox(sx, 0.32, sz, 0.42 * s, 0.17 * s, 0.2 * s, a + Math.PI / 2, C.seal);
    b.obox(sx + Math.cos(a + Math.PI / 2) * 0.42 * s, 0.45, sz + Math.sin(a + Math.PI / 2) * 0.42 * s, 0.14 * s, 0.13 * s, 0.13 * s, a, 0x5f5d5a);
  }

  // --- people in the streets and on the walls ---
  k.person(gx, iz1 - 2.2);
  k.person(gx - 1.6, iz1 - 2.6);
  k.person(ix0 + 2.8, l.z0 + 7.2);
  k.person(wx0 + 0.2, l.z0 + 5.0, 5.6);
  k.person(l.x0 + 4.0, wz1, 3.8);

  k.lights.push({ x: nx, z: nz + 4, r: 13, color: '#ffcf8a', k: 0.55 }, { x: l.x1 + 1, z: sgz, r: 10, color: '#ffcf8a', k: 0.5 });
  nameBoard(k, 'holds-white-harbor', l.x0 - 1.4, l.z1 + 2.6, 0, VIEW, 1.4);
}

// ---------------------------------------------------------------------------
// Bear Island
// ---------------------------------------------------------------------------

/**
 * The Mormonts' island: a hall of huge logs inside an earthen bank with a
 * palisade on it, its gate between two carved posts, longhouses, gnarled oaks
 * and tall pines all over the island, and a fishing boat drawn up on the shingle.
 */
function bearIsland(k: Build, l: Lot): void {
  const b = k.b, I = ISLANDS.bear, ir = Math.min(I.rx, I.rz);
  const onIsland = (x: number, z: number, m: number): boolean => Math.hypot(x - I.x, z - I.z) < ir - m;

  // --- the bank, and the palisade of logs along its crest, open at the gate ---
  drawField(b, BI_FIELD, {
    color: (_h, level) => (level > 0.85 ? 0xe2e7e8 : level > 0.6 ? 0xb9bcae : C.earth),
    cut: C.earth, edges: '',
  });
  const segs = 12;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2, am = (a0 + a1) / 2;
    let off = am - BANK.gate;
    off = Math.atan2(Math.sin(off), Math.cos(off));
    if (Math.abs(off) < BANK.gap) continue;
    const p0: P2 = [BANK.x + Math.cos(a0) * BANK.r, BANK.z + Math.sin(a0) * BANK.r], p1: P2 = [BANK.x + Math.cos(a1) * BANK.r, BANK.z + Math.sin(a1) * BANK.r];
    const yaw = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), half = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 2 + 0.06;
    b.obox((p0[0] + p1[0]) / 2, BANK.y + 0.6, (p0[1] + p1[1]) / 2, half, 0.95, 0.15, yaw, C.log, { top: C.moss });
    for (const s of [0]) {
      const x = (p0[0] + p1[0]) / 2 + Math.cos(yaw) * half * s, z = (p0[1] + p1[1]) / 2 + Math.sin(yaw) * half * s;
      b.cyl(x, z, BANK.y + 1.55, BANK.y + 1.95, 0.2, 0.02, 4, C.logDark, { cap: false, phase: yaw + Q });
    }
  }
  // the gate: a carved post each side, and a beam across them
  const ga = BANK.gate, gw = BANK.r * Math.sin(BANK.gap) * 0.95;
  const gcx = BANK.x + Math.cos(ga) * BANK.r * 0.98, gcz = BANK.z + Math.sin(ga) * BANK.r * 0.98, tx = -Math.sin(ga), tz = Math.cos(ga);
  for (const s of [-1, 1]) {
    const px = gcx + tx * s * gw, pz = gcz + tz * s * gw;
    b.cyl(px, pz, 0, 3.4, 0.33, 0.28, 6, 0x6a5038, { cap: false });
    for (const y of [1.2, 2.4]) b.cyl(px, pz, y, y + 0.25, 0.37, 0.37, 6, 0x4e3a28, { cap: false });
    b.cyl(px, pz, 3.4, 3.75, 0.36, 0.2, 6, 0x4e3a28, { cap: 0x4e3a28 });
    fire(k, px + Math.cos(ga) * 0.42, 2.25, pz + Math.sin(ga) * 0.42, 0.2, s < 0 ? 7 : 0);
  }
  b.beam([gcx - tx * (gw + 0.3), 3.1, gcz - tz * (gw + 0.3)], [gcx + tx * (gw + 0.3), 3.1, gcz + tz * (gw + 0.3)], 0.16, 0.16, 0x5a4430);
  // the yard inside, trodden
  flat(k.street, oval(BANK.x, BANK.z, BANK.r - 0.9, BANK.r - 0.9, 16), 0.035, C.trodden, { win: GROUND });

  // --- the hall of huge logs, its gable to the gate ---
  const hx = BANK.x - 0.15, hz = BANK.z - 0.3, hl = 2.3, hw = 1.15, course = 0.37, courses = 7, wallTop = course * courses;
  for (let i = 0; i < courses; i++) {
    const inset = i % 2 ? 0.04 : 0;
    b.box(hx - hl + inset, i * course, hz - hw + inset, hx + hl - inset, (i + 1) * course, hz + hw - inset, i % 2 ? C.log : C.logDark, { faces: 'NESW' });
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.box(hx + sx * hl - 0.2, 0, hz + sz * hw - 0.2, hx + sx * hl + 0.2, wallTop + 0.15, hz + sz * hw + 0.2, 0x5f4a35);
  gable(b, hx - hl, hz - hw, hx + hl, hz + hw, wallTop, 2.1, 0x5e5038, C.log, 'x', 0.4);
  // the gable boards, crossed above the ridge
  for (const s of [-1, 1]) {
    const ex = hx + s * (hl + 0.42);
    b.beam([ex, wallTop - 0.05, hz - hw - 0.45], [ex, wallTop + 2.6, hz + 0.4], 0.09, 0.09, 0x4e3a28);
    b.beam([ex, wallTop - 0.05, hz + hw + 0.45], [ex, wallTop + 2.6, hz - 0.4], 0.09, 0.09, 0x4e3a28);
  }
  b.box(hx + 0.5, 0, hz + hw, hx + 1.3, 1.6, hz + hw + 0.06, DARK, { win: interior(0.65), faces: 'S' });
  b.box(hx + 0.4, 1.6, hz + hw, hx + 1.4, 1.8, hz + hw + 0.14, 0x4e3a28, { faces: 'NESWTB' });
  bandedFlag(b, hx - hl - 0.42, hz, wallTop + 2.0, 3.6, MORMONT, 2.2, 1.4);
  k.person(hx + 1.8, hz + hw + 0.8);
  k.person(gcx - Math.cos(ga) * 0.9, gcz - Math.sin(ga) * 0.9);

  // --- longhouses outside the bank, roofed with turf ---
  const longhouse = (x: number, z: number, along: 'x' | 'z', len: number, wid: number): void => {
    const x0 = along === 'x' ? x - len / 2 : x - wid / 2, x1 = along === 'x' ? x + len / 2 : x + wid / 2;
    const z0 = along === 'x' ? z - wid / 2 : z - len / 2, z1 = along === 'x' ? z + wid / 2 : z + len / 2;
    b.box(x0, 0, z0, x1, 1.3, z1, C.logDark, { faces: 'NESW' });
    gable(b, x0, z0, x1, z1, 1.3, 1.3, C.turf, C.log, along, 0.3);
    const dx = along === 'x' ? (x0 + x1) / 2 : x1, dz = along === 'x' ? z1 : (z0 + z1) / 2;
    if (along === 'x') b.box(dx - 0.25, 0, dz, dx + 0.25, 1.0, dz + 0.05, 0x2a2119, { faces: 'S' });
    else b.box(dx, 0, dz - 0.25, dx + 0.05, 1.0, dz + 0.25, 0x2a2119, { faces: 'E' });
  };
  longhouse(I.x + 4.6, I.z - 2.4, 'z', 3.0, 1.4);
  longhouse(I.x - 4.9, I.z + 1.4, 'z', 2.8, 1.35);
  longhouse(I.x - 2.1, I.z + 5.1, 'x', 2.8, 1.3);

  // --- the shingle on the south shore, and a boat drawn up on it ---
  const shingle: P2[] = [];
  for (let i = 0; i <= 8; i++) shingle.push([I.x + Math.cos(1.05 + i * 0.12) * (ir - 0.25), I.z + Math.sin(1.05 + i * 0.12) * (ir - 0.25)]);
  for (let i = 8; i >= 0; i--) shingle.push([I.x + Math.cos(1.05 + i * 0.12) * (ir - 1.7), I.z + Math.sin(1.05 + i * 0.12) * (ir - 1.7)]);
  area(k, shingle, 0xa9a7a0, 0.035);
  const ba = 1.55, bx = I.x + Math.cos(ba) * (ir - 1.1), bz = I.z + Math.sin(ba) * (ir - 1.1);
  b.moved(bx, 0.05, bz, ba + 0.35, () => {
    prism(b, [[-1.3, -0.4], [0.7, -0.5], [1.4, 0], [0.7, 0.5], [-1.3, 0.4]], 0, 0.55, 0x6a5a48, { top: false });
    b.box(-1.15, 0.1, -0.36, 0.7, 0.14, 0.36, 0x4e4234, { faces: 'T' });
    for (const s of [-1, 1]) b.beam([-0.8, 0.3, s * 0.2], [0.8, 0.45, s * 0.1], 0.04, 0.04, 0x8a7458);
  });
  // a net drying on two poles beside it
  for (const s of [0, 1]) b.box(bx - 1.6 + s * 1.4 - 0.05, 0, bz - 1.4 - 0.05, bx - 1.6 + s * 1.4 + 0.05, 1.4, bz - 1.4 + 0.05, TIMBER_DARK, { faces: 'NESW' });
  b.box(bx - 1.6, 0.5, bz - 1.42, bx - 0.2, 1.3, bz - 1.38, 0x8f8a7a, { faces: 'NS' });
  k.person(bx - 0.9, bz - 0.7);

  // --- oaks and pines, all over the island but where the buildings are ---
  oak(b, I.x - 2.6, I.z - 4.6, 0.95, 0.6);
  oak(b, I.x + 5.5, I.z + 1.6, 0.8, 2.4);
  oak(b, I.x - 5.4, I.z - 2.0, 0.85, 4.1);
  const rand = rng(0xbea5);
  const keep: [number, number, number][] = [[BANK.x, BANK.z, BANK.r + 1.0], [I.x + 4.6, I.z - 2.4, 1.9], [I.x - 4.9, I.z + 1.4, 1.8], [I.x - 2.1, I.z + 5.1, 1.8], [bx, bz, 2.0], [I.x + 4.0, I.z + 4.5, 1.6], [I.x - 2.6, I.z - 4.6, 1.8], [I.x + 5.5, I.z + 1.6, 1.6], [I.x - 5.4, I.z - 2.0, 1.6]];
  let pines = 0;
  for (let tries = 0; tries < 120 && pines < 18; tries++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * (ir - 0.8), x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d;
    if (!onIsland(x, z, 0.8) || inFront(x, z, BANK.x, BANK.z, 1.0, 3.6) || keep.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr)) continue;
    pine(k, x, z, 0.66 + rand() * 0.2);
    keep.push([x, z, 1.0]);
    pines++;
  }

  k.lights.push({ x: gcx + Math.cos(ga) * 2, z: gcz + Math.sin(ga) * 2, r: 10, color: '#ffcf8a', k: 0.5 }, { x: hx, z: hz + 2, r: 8, color: '#ffcf8a', k: 0.4 });
  // the name, on the island's south-east, across the way from the gate to the shore
  nameBoard(k, 'holds-bear-island', I.x + 6.1 * VIEW[0], I.z + 6.1 * VIEW[2], -1.75, VIEW, 0.85);
  void l;
}

// ---------------------------------------------------------------------------
// Deepwood Motte
// ---------------------------------------------------------------------------

/**
 * The Glovers' wooden castle in the wolfswood: a steep motte with a mossy
 * palisade of logs round its top and a timber watchtower on it, a bailey
 * below with a longhall, a ditch, and pines thick all round.
 */
function deepwood(k: Build, l: Lot): void {
  const b = k.b, mx = MOTTE.x, mz = MOTTE.z, R = MOTTE.rings, top = R[R.length - 1][1], rt = R[R.length - 1][0];

  // --- the ditch round the motte's foot, and the motte ---
  flat(k.street, oval(mx, mz, 2.75, 2.75, 20), 0.035, 0x6c716f, { win: GROUND, holes: [oval(mx, mz, 1.99, 1.99, 20)] });
  for (let i = 0; i + 1 < R.length; i++) {
    b.cyl(mx, mz, R[i][1], R[i + 1][1], R[i][0], R[i + 1][0], 10, i < 2 ? C.earth : 0x8f8a78, { cap: i + 2 === R.length ? 0xdde2e1 : false });
  }

  // --- the palisade round the top: logs, mossy, with points ---
  const ring = oval(mx, mz, rt - 0.08, rt - 0.08, 10), inner = oval(mx, mz, rt - 0.3, rt - 0.3, 10);
  walls(b, ring, top - 0.1, top + 1.1, C.log);
  walls(b, inner, top, top + 1.1, C.logDark, { inward: true });
  flat(b, ring, top + 1.1, C.moss, { holes: [inner] });
  for (const [x, z] of ring) b.cyl(x, z, top + 1.1, top + 1.45, 0.16, 0.02, 4, C.moss, { cap: false });

  // --- the watchtower: fifty feet of timber, a gallery, a lookout, a roof ---
  const tw = 0.5, gy = top + 3.8;
  b.box(mx - tw, top, mz - tw, mx + tw, gy, mz + tw, TIMBER, { faces: 'NESW', win: { cell: 1.0, storey: gy / 3, lit: 0.35, kind: 4 }, seed: 0.9 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.box(mx + sx * tw - 0.08, top, mz + sz * tw - 0.08, mx + sx * tw + 0.08, gy, mz + sz * tw + 0.08, TIMBER_DARK, { faces: 'NESW' });
  b.box(mx - 0.78, gy, mz - 0.78, mx + 0.78, gy + 0.2, mz + 0.78, TIMBER_DARK, { faces: 'NESWTB' });
  const look = l.top;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.box(mx + sx * 0.66 - 0.06, gy + 0.2, mz + sz * 0.66 - 0.06, mx + sx * 0.66 + 0.06, look, mz + sz * 0.66 + 0.06, TIMBER_DARK, { faces: 'NESW' });
  b.box(mx - 0.72, gy + 0.2, mz - 0.72, mx + 0.72, gy + 0.55, mz + 0.72, TIMBER, { faces: 'NESW' });
  b.box(mx - 0.8, look - 0.02, mz - 0.8, mx + 0.8, look, mz + 0.8, TIMBER_DARK, { faces: 'B' });
  lathe(b, mx, mz, [[0.95 * D, look], [0.55 * D, look + 0.8], [0.05, look + 1.7]], 4, ROOF.shingle);
  k.glows.push({ x: mx, y: gy + 0.75, z: mz, sx: 0.3, sy: 0.3, sz: 0.3, color: '#ffc77a' });
  k.person(mx + 0.3, mz + 0.35, gy + 0.2);

  // --- the stair up the motte from the bailey ---
  const sa = Math.PI * 0.25;
  slab(b, [mx + Math.cos(sa) * 2.2, 0.15, mz + Math.sin(sa) * 2.2], [mx + Math.cos(sa) * (rt - 0.2), top + 0.05, mz + Math.sin(sa) * (rt - 0.2)], 0.32, 0.18, 0x7d6448, { under: TIMBER_DARK });

  // --- the bailey: its palisade, the yard, the longhall ---
  const bx = l.x1 - 2.25, bz = l.z1 - 2.2, br = 2.05, pts = 14, gate = Math.atan2(VIEW[2], VIEW[0]);
  area(k, oval(bx, bz, br - 0.25, br - 0.25, 14), C.trodden, 0.045);
  for (let i = 0; i < pts; i++) {
    const a0 = (i / pts) * Math.PI * 2, a1 = ((i + 1) / pts) * Math.PI * 2, am = (a0 + a1) / 2;
    const p0: P2 = [bx + Math.cos(a0) * br, bz + Math.sin(a0) * br], p1: P2 = [bx + Math.cos(a1) * br, bz + Math.sin(a1) * br];
    const midx = (p0[0] + p1[0]) / 2, midz = (p0[1] + p1[1]) / 2;
    if (Math.hypot(midx - mx, midz - mz) < 2.6) continue;
    let off = am - gate;
    off = Math.atan2(Math.sin(off), Math.cos(off));
    if (Math.abs(off) < 0.3) continue;
    const yaw = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), half = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 2 + 0.05;
    b.obox(midx, 0.8, midz, half, 0.8, 0.13, yaw, C.log, { top: C.moss });
    b.cyl(midx, midz, 1.6, 1.95, 0.17, 0.02, 4, C.moss, { cap: false, phase: yaw + Q });
  }
  const gcx = bx + Math.cos(gate) * br, gcz = bz + Math.sin(gate) * br;
  for (const s of [-1, 1]) {
    const px = gcx - Math.sin(gate) * s * 0.62, pz = gcz + Math.cos(gate) * s * 0.62;
    b.cyl(px, pz, 0, 2.1, 0.18, 0.18, 6, C.logDark, { cap: C.moss });
    if (s < 0) fire(k, px + Math.cos(gate) * 0.25, 1.9, pz + Math.sin(gate) * 0.25, 0.18, 6);
  }
  // the longhall
  const lx = bx + 0.2, lz = bz - 0.05;
  b.box(lx - 1.15, 0, lz - 0.55, lx + 1.15, 1.25, lz + 0.55, C.logDark, { faces: 'NESW' });
  gable(b, lx - 1.15, lz - 0.55, lx + 1.15, lz + 0.55, 1.25, 0.95, ROOF.shingle, C.log, 'x', 0.22);
  b.box(lx - 0.25, 0, lz + 0.55, lx + 0.25, 0.95, lz + 0.6, DARK, { win: interior(0.6), faces: 'S' });
  k.person(lx + 0.8, lz + 0.95);
  k.person(gcx + Math.cos(gate) * 0.6, gcz + Math.sin(gate) * 0.6);

  // --- the wolfswood: pines thick in the lot's free corners and for three units round it ---
  const rand = rng(0xdeeb);
  const board: [P2, P2] = [[l.x1 + 3.5 - 3.4, l.z1 + 3.4 - 3.0], [l.x1 + 3.5 + 3.4, l.z1 + 3.4 + 3.0]];
  const nearBoard = (x: number, z: number): boolean => {
    const [a, c] = board, dx = c[0] - a[0], dz = c[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < 1.8;
  };
  const taken: [number, number, number][] = [[mx, mz, 2.9], [bx, bz, br + 0.7]];
  let n = 0;
  for (let tries = 0; tries < 220 && n < 34; tries++) {
    const x = l.x0 - 3 + rand() * (l.x1 - l.x0 + 6), z = l.z0 - 3 + rand() * (l.z1 - l.z0 + 6);
    if (isWater(x, z) || isWater(x - 1, z) || nearBoard(x, z) || inFront(x, z, (MOTTE.x + bx) / 2, (MOTTE.z + bz) / 2, 0.5, 3.4)) continue;
    if (taken.some(([tx, tz, tr]) => Math.hypot(x - tx, z - tz) < tr)) continue;
    pine(k, x, z, 0.62 + rand() * 0.26);
    taken.push([x, z, 0.95]);
    n++;
  }

  k.lights.push({ x: gcx + 1.5, z: gcz + 1.5, r: 9, color: '#ffcf8a', k: 0.5 });
  nameBoard(k, 'holds-deepwood', l.x1 + 3.5, l.z1 + 3.4, 0, VIEW, 1.2);
}

// ---------------------------------------------------------------------------
// What this file hands over
// ---------------------------------------------------------------------------

export const MODELS: Record<string, Model> = {
  'shadow-tower': shadowTower,
  eastwatch,
  queenscrown,
  'moles-town': molesTown,
  'white-harbor': whiteHarbor,
  'bear-island': bearIsland,
  deepwood,
};
export const COVERS: string[] = [];
export const SIGNS: SignDef[] = [
  nameSign('holds-shadow-tower', 'The Shadow Tower'),
  nameSign('holds-eastwatch', 'Eastwatch'),
  nameSign('holds-queenscrown', 'Queenscrown'),
  nameSign('holds-moles-town', "Mole's Town"),
  nameSign('holds-white-harbor', 'White Harbor'),
  nameSign('holds-bear-island', 'Bear Island'),
  nameSign('holds-deepwood', 'Deepwood Motte'),
];
export const FLOORED: string[] = ['queenscrown'];

export function heightAt(x: number, z: number): number {
  return Math.max(heightOn(ST_FIELD, x, z), heightOn(WH_FIELD, x, z), heightOn(BI_FIELD, x, z), motteAt(x, z));
}

export function extras(_k: Build): void {}


/** Whether a place stands between a thing and the view the tile opens with: more than `from` towards the camera, and less than `side` to either side of the line. */
function inFront(x: number, z: number, cx: number, cz: number, from: number, side: number): boolean {
  const dx = x - cx, dz = z - cz;
  return dx * VIEW[0] + dz * VIEW[2] > from && Math.abs(-dx * VIEW[2] + dz * VIEW[0]) < side;
}
