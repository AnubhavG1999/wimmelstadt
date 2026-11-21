// Tricorner: the fish market, Tricorner Yards and the harbour's west quay.
//
// Tricorner is the city's southern point in the comics (Robin vol. 2 #28; a roughly triangular island joined to
// the rest by three bridges). Here it is the south-east of Lower Gotham, at the quays' level, between South Street
// and the harbour, under the Cobblepot Bridge's west end. Its edge on the harbour is a straight quay that slants the
// way the Sprang runs, so most of what stands here is built in the quay's own frame: x along the quay to the
// south-east (`t`, how far along the Sprang's line), z inland to the south-west (`v`, how far in from the edge).
//
// What is the comics' and what is this tile's own drawing:
// - The fish market and the harbour wall are where the Joker's Laughing Fish story (Detective Comics, 1978) plays:
//   the timber jetty is that story's stage, and a crate stencilled PATENT PENDING is the one nod to it, as the
//   research proposes. The hall itself, an open shed of iron columns under a slate roof with a false front, is
//   the tile's own.
// - The comics give Tricorner no look. The yards (a slip with a hull half built, a floating dock with a tug in it,
//   a hammerhead crane, a travelling crane, a gasholder, the shops and a harbour light at the point) are the tile's
//   own drawing of a working shipyard.
// - The Iceberg Casino's landing (an awning in ice blue and white, a rope on stanchions, two lamps) is the tile's
//   own; the ship is the bay's.

import type { V3 } from '../../engine/geo';
import { interior } from '../../engine/geo';
import { flat } from '../../engine/ground';
import { lathe } from '../../engine/parts';
import { drum, face3, prism, slab, type XZ } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import {
  AMBER, BRASS, BRICK, BRICK_DARK, BRICK_RED, COPPER, DARK, GLASS, IRON, IRON_DARK, LEAD, SLATE, SMALL_WIN, SODIUM,
  STEEL, STONE, STONE_DARK, STONE_LIGHT, STONE_TRIM, TIMBER, TIMBER_DARK, TIMBER_PALE, gargoyle, gasLamp, nameSign,
} from './look';
import type { Model, Place } from './models';
import { HARBOUR, SPRANG, SPRANG_ACROSS, SPRANG_ALONG, STAGES, harbourQuay, lotOf, sprang, type Lot, type P2 } from './plan';
import { open } from './space';

// ---------------------------------------------------------------------------
// Colours of Tricorner's own
// ---------------------------------------------------------------------------

const CONCRETE = 0x6c6c68, CINDER = 0x3e3c3a, FLAGS = 0x75777c;
/** The hull: red oxide below, plating above, rust inside, and the frames lighter, as thin bars come out dark. */
const OXIDE = 0x7e3a2c, PLATE = 0x4c5159, RUSTY = 0x5a3729, RIB = 0x9c5a3e, DECK_PLATE = 0x606369;
/** The cranes: the hammerhead in red lead, the travelling crane in ochre. Both lighter than they should look. */
const CRANE_RED = 0xb4613f, CRANE_OCHRE = 0xc49c4d;
const DOCK = 0x596165, DOCK_TOP = 0x7d8489;
const GAS_FRAME = 0x9ba2ac, GAS_DRUM = 0x4b5852, GAS_BAND = 0x65736c, GAS_CROWN = 0x3f4944;
const TUG_BLACK = 0x202226, TUG_RED = 0x8f2b25, CREAM = 0xd5cbb2, LOCO = 0x2e5a46;
const ICE_BLUE = 0x8fd2ea, WHITE = 0xe6e1d4, CARPET = 0x6e1d24, ROPE_RED = 0xa32a32;
const AWN_A = 0x2f5e50, AWN_B = 0xe0d9c6, MARBLE = 0xd4d4cc;
const FISH = [0xb9c5ce, 0x8fa1ad, 0xc98f7a, 0x7d8f9b, 0xd8b56a];
const ICE_CRATE = 0xcfeaf0, NET = 0x45503f, FLOAT = 0xd9822b, ROPE = 0xb9a173;
const BOAT_HULLS = [0x2f5d7a, 0x3d6b4a, 0x8a3a2e];

/** The paving of a floor or an apron, in flags. */
const FLAGGED = { cell: 1.2, storey: 1, lit: 0.5, kind: 1 };

// ---------------------------------------------------------------------------
// The quay's frame
// ---------------------------------------------------------------------------

const AL = SPRANG_ALONG, AC = SPRANG_ACROSS, HW = HARBOUR.west;
/** The way the quay runs, as a yaw: in its frame x runs along it to the south-east, z inland to the south-west. */
const YAW = Math.atan2(AL[1], AL[0]);
/** The way out over the water, square to the quay, as a heading. */
const TO_WATER = YAW - Math.PI / 2;
const ORIGIN = sprang(0, -HW);
/** A place `t` along the quay and `v` inland of its edge (out over the water if negative), on the board. */
const Q = (t: number, v = 0): P2 => sprang(t, -HW - v);
/** How far along the quay its edge is at a place this far south. */
const tAt = (z: number): number => (z - SPRANG.a[1] + AC[1] * HW) / AL[1];
/** Builds in the quay's frame: x is `t`, z is `v`. */
const onQuay = (k: Build, fn: () => void): void => k.b.moved(ORIGIN[0], 0, ORIGIN[1], YAW, fn);
/** A patch of ground in the quay's frame. */
const quayPatch = (k: Build, t0: number, v0: number, t1: number, v1: number, y: number, color: number): void =>
  flat(k.street, [Q(t0, v0), Q(t1, v0), Q(t1, v1), Q(t0, v1)], y, color, { win: FLAGGED });

// ---------------------------------------------------------------------------
// Where everything is: the yards from their lot, the market from its, the jetty from its stage
// ---------------------------------------------------------------------------

const YL = lotOf('yards');
/** How far along the quay the yards begin. */
const T0 = tAt(YL.z0);
const YARD = {
  slip: { t0: T0 + 0.1, t1: T0 + 5.7, v0: -6, v1: 11.4 },
  /** The hull's middle line, its deck, and how far inland its bow is. */
  hull: { t: T0 + 2.9, deck: 5.0, bow: 10.5 },
  hammer: { t: T0 + 8.7, v: 4, top: 17.5 },
  dock: { t0: T0 + 13.7, t1: T0 + 27.7, v0: -6.4, v1: -0.4, wall: 3.0 },
  rails: { t0: T0 + 11.2, t1: T0 + 27.3, a: 0.8, b: 4.6, track: 2.7 },
  crane: T0 + 21.7,
  loco: T0 + 15.9,
  plate: { t0: T0 + 10.5, t1: T0 + 16.1, v0: 5.4, v1: 8.6 },
  shop: { t0: T0 + 17.3, t1: T0 + 22.7, v0: 5.4, v1: 11.2 },
  boiler: { t: T0 + 24.9, v: 6.35 },
  hut: { t0: T0 + 0.72, t1: T0 + 2.12, v0: 12.0, v1: 13.2 },
  /** The harbour light, at the point: its middle, a little inland of the quay's edge near the board's south edge. */
  light: Q(tAt(YL.z1) - 3.8, 1.0),
  /** The gasholder, at the yard's back, away from the quay. */
  gas: [YL.x0 + 6.6, YL.z1 - 6.8] as P2,
  gate: { x: YL.x0 + 0.1, z: YL.z0 + 6.6, half: 2.2 },
};
const GAS_R = 6, GAS_TOP = 10.7;
const LIGHT_GALLERY = 11.6;
const CAB_ROOF = 19.3;

const ML = lotOf('fish-market');
const JETTY = STAGES.fishJetty;
const JETTY_Z = (JETTY.z0 + JETTY.z1) / 2;
/** The Iceberg Casino's gangway, along the quay: what stays clear before it, and where it lands. */
const CASINO_T = 150, CASINO_CLEAR = 5;

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------

const board = (id: string, text: string, color: string, ink: string, px: number, h = 52): SignDef => ({ id, lines: [text], color, ink, aspect: px / h, kind: 'board', size: [px, h] });

export const SIGNS: SignDef[] = [
  nameSign('tricorner-fish-market', 'Fish Market'),
  nameSign('tricorner-yards', 'Tricorner Yards'),
  { ...nameSign('tricorner-yards-back', 'Tricorner Yards') },
  board('tricorner-oysters', 'OYSTERS', '#e3dccb', '#24343a', 200),
  board('tricorner-eels', 'EELS', '#e3dccb', '#24343a', 140),
  board('tricorner-chandler', 'SHIP CHANDLER', '#1d1f24', '#e9e2cf', 320),
  board('tricorner-patent', 'PATENT PENDING', '#b8a27a', '#2a2116', 300),
];
const ASPECT = new Map(SIGNS.map((s) => [s.id, s.aspect]));

/** Hangs a sign on a wall whose face is at (x, z) and faces (nx, nz): a thin dark board just off it, the sign 0.03 in front. */
function hang(k: Build, id: string, x: number, y: number, z: number, nx: number, nz: number, h: number, maxW = Infinity, backing = DARK): void {
  const w = k.sign(id, x + nx * 0.14, y, z + nz * 0.14, nx, nz, h, maxW);
  const hh = Math.min(h, w / (ASPECT.get(id) ?? 1));
  k.b.obox(x + nx * 0.06, y, z + nz * 0.06, w / 2 + 0.1, hh / 2 + 0.08, 0.05, Math.atan2(-nx, nz), backing, { faces: 'NESWTB' });
}

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

/** A quad and its back, each in a colour of its own: an awning, a net, a roof seen from under. */
function both(k: Build, p0: V3, p1: V3, p2: V3, p3: V3, n: V3, front: number, back = front): void {
  k.b.quad(p0, p1, p2, p3, n, front);
  k.b.quad(p0, p3, p2, p1, [-n[0], -n[1], -n[2]], back);
}

/**
 * A pitched roof whose ridge runs along x, over walls from z0 to z1 whose tops are at `y`: its slopes run on past the
 * walls by `over` and are seen from under too, and its gable ends close right up under it.
 */
function pitched(k: Build, x0: number, z0: number, x1: number, z1: number, y: number, rise: number, over: number, roof: number, under: number, gable: number | null, inside = gable): void {
  const half = (z1 - z0) / 2, zc = (z0 + z1) / 2, s = rise / half, ye = y - over * s, len = Math.hypot(half, rise);
  const a = x0 - over, c = x1 + over, top = y + rise;
  both(k, [a, ye, z0 - over], [c, ye, z0 - over], [c, top, zc], [a, top, zc], [0, half / len, -rise / len], roof, under);
  both(k, [c, ye, z1 + over], [a, ye, z1 + over], [a, top, zc], [c, top, zc], [0, half / len, rise / len], roof, under);
  if (gable === null) return;
  for (const [x, n] of [[x0, -1], [x1, 1]] as const) {
    face3(k.b, [x, y, z0], [x, y, z1], [x, top, zc], [n, 0, 0], gable);
    if (inside !== null) face3(k.b, [x, y, z0], [x, y, z1], [x, top, zc], [-n, 0, 0], inside);
  }
}

/** A cast-iron bollard, standing on `y`. */
function bollard(k: Build, x: number, z: number, y = 0): void {
  k.b.box(x - 0.17, y, z - 0.17, x + 0.17, y + 0.45, z + 0.17, IRON);
  k.b.box(x - 0.24, y + 0.45, z - 0.24, x + 0.24, y + 0.58, z + 0.24, IRON, { faces: 'NESWTB' });
}

/** A barrel standing on `y`. */
function barrel(k: Build, x: number, z: number, y = 0, color = TIMBER): void {
  k.b.cyl(x, z, y, y + 0.9, 0.36, 0.36, 7, color, { cap: TIMBER_DARK });
}

/** A coil of rope lying on `y`. */
function coil(k: Build, x: number, z: number, r: number, y = 0): void {
  k.b.cyl(x, z, y, y + 0.32, r, r * 0.95, 7, ROPE, { cap: 0x8a764f });
}

/** A crate on `y`, `s` across. */
function crate(k: Build, x: number, z: number, y: number, s: number, color = TIMBER_PALE): void {
  k.b.box(x - s / 2, y, z - s / 2, x + s / 2, y + s * 0.8, z + s / 2, color);
}

/** An anchor of the old kind lying on the ground, its shank along `yaw`, `s` its size. */
function anchor(k: Build, x: number, z: number, yaw: number, s: number): void {
  const b = k.b;
  b.moved(x, 0, z, yaw, () => {
    const y = 0.14 * s;
    b.beam([-1.1 * s, y, 0], [1.0 * s, y, 0], 0.1 * s, 0.08 * s, IRON);
    // the arms, and a fluke on each
    for (const side of [-1, 1]) {
      b.beam([-1.1 * s, y, 0], [-0.55 * s, y, side * 0.75 * s], 0.09 * s, 0.07 * s, IRON);
      b.box(-0.75 * s, 0, side * 0.75 * s - 0.18 * s, -0.4 * s, 0.16 * s, side * 0.75 * s + 0.18 * s, IRON_DARK);
    }
    // the stock, across the shank's head, propping it up
    b.beam([0.85 * s, 0.05, -0.85 * s], [0.85 * s, 0.05, 0.85 * s], 0.07 * s, 0.07 * s, TIMBER_DARK);
  });
}

/** Whether a small thing of ours may stand here: open ground, off the roads, the stages and the water. */
const OWN = ['fish-market', 'yards'];
const free = (x: number, z: number, room = 0.5): boolean => open(x, z, room, OWN);

/** A person on open ground, or on whatever is `y` high where nothing else is asked. */
function stand(k: Build, x: number, z: number, y = 0, ask = y === 0): boolean {
  if (ask && !free(x, z, 0.4)) return false;
  k.person(x, z, y);
  return true;
}

// ---------------------------------------------------------------------------
// The fish market
// ---------------------------------------------------------------------------

function fishMarket(k: Build, l: Lot): void {
  const b = k.b;
  const x0 = l.x0 + 0.2, x1 = l.x1 - 0.2, z0 = l.z0 + 0.4, z1 = l.z1 - 0.4, zc = (l.z0 + l.z1) / 2;
  const eave = 4.0, rise = 1.4, office = x0 + 2.6;
  // the floor, in flags
  flat(k.street, [[x0, l.z0 + 0.2], [x1, l.z0 + 0.2], [x1, l.z1 - 0.2], [x0, l.z1 - 0.2]], 0.04, FLAGS, { win: FLAGGED });

  // the office at the west end, of brick, its door on the south
  b.box(x0, 0, z0, office, eave, z1, BRICK, { win: SMALL_WIN, faces: 'NESW' });
  b.box(x0 + 0.8, 0.04, z1, x0 + 1.8, 2.4, z1 + 0.06, DARK);
  k.glows.push({ x: x0 + 1.3, y: 2.75, z: z1 + 0.25, sx: 0.3, sy: 0.3, sz: 0.3, color: AMBER });

  // the hall: iron columns under the eaves, and a truss over each line of them
  const cols = [office + 0.6, office + 3.3, office + 6.0, x1 - 0.15];
  for (const x of cols) {
    for (const z of [z0, zc, z1]) b.beam([x, 0.04, z], [x, eave - 0.3, z], 0.13, 0.11, IRON);
    b.box(x - 0.12, eave - 0.32, z0 - 0.1, x + 0.12, eave - 0.05, z1 + 0.1, IRON, { faces: 'NESWTB' });
    b.beam([x, eave - 0.05, zc], [x, eave + rise - 0.1, zc], 0.07, 0.07, IRON);
  }
  // the wall plates along both sides
  for (const z of [z0, z1]) b.box(office, eave - 0.3, z - 0.15, x1, eave, z + 0.15, IRON_DARK, { faces: 'NESWTB' });
  pitched(k, x0, z0, x1, z1, eave, rise, 0.45, SLATE, 0x2c2a28, null);
  // the west gable over the office
  face3(b, [x0, eave, z0], [x0, eave, z1], [x0, eave + rise, zc], [-1, 0, 0], BRICK);
  face3(b, [x0, eave, z0], [x0, eave, z1], [x0, eave + rise, zc], [1, 0, 0], BRICK_DARK);
  // the louvred lantern along the ridge
  b.box(office + 1.5, eave + rise - 0.3, zc - 0.55, x1 - 2.2, eave + rise + 0.32, zc + 0.55, LEAD);
  pitched(k, office + 1.3, zc - 0.55, x1 - 2.0, zc + 0.55, eave + rise + 0.32, 0.25, 0.2, SLATE, 0x2c2a28, LEAD);

  // the false front on the east, to the water: a band across the gable and a raised panel with the name
  const fx = x1 + 0.05;
  b.box(fx, 3.3, z0 - 0.2, fx + 0.25, 4.6, z1 + 0.2, STONE, { faces: 'NESWTB' });
  b.box(fx, 4.6, zc - 2.7, fx + 0.25, 5.9, zc + 2.7, STONE, { faces: 'NESWT', top: STONE_TRIM });
  b.box(fx - 0.05, 5.9, zc - 2.85, fx + 0.32, 6.0, zc + 2.85, STONE_TRIM, { faces: 'NESWTB' });
  b.box(fx - 0.05, 4.5, z0 - 0.3, fx + 0.32, 4.68, z1 + 0.3, STONE_TRIM, { faces: 'NESWTB' });
  hang(k, 'tricorner-fish-market', fx + 0.25, 5.22, zc, 1, 0, 0.8, 5.0);
  hang(k, 'tricorner-oysters', fx + 0.25, 3.9, zc - 2.0, 1, 0, 0.42, 1.6);
  hang(k, 'tricorner-eels', fx + 0.25, 3.9, zc + 2.0, 1, 0, 0.42, 1.2);

  // striped awnings over the stalls on the east side
  const ax = fx + 0.25, ox = l.x1 + 1.45, n = 6, w = (z1 - z0) / n, len = Math.hypot(ox - ax, 0.7);
  for (let i = 0; i < n; i++) {
    const za = z0 + i * w, zb = za + w;
    both(k, [ax, 3.25, za], [ax, 3.25, zb], [ox, 2.55, zb], [ox, 2.55, za], [0.7 / len, (ox - ax) / len, 0], i % 2 ? AWN_A : AWN_B, 0x34302a);
  }
  b.box(ox - 0.04, 2.3, z0, ox + 0.04, 2.55, z1, AWN_A, { faces: 'NESWTB' });
  for (const z of [z0 + 0.2, z1 - 0.2]) b.beam([ax, 2.9, z], [ox - 0.1, 2.52, z], 0.05, 0.05, IRON);

  // the stalls: marble counters with fish on ice in the east bay, and two back to back in the middle
  const r = (s: number): number => { const v = Math.sin(s * 91.7 + 3.1) * 43758.5; return v - Math.floor(v); };
  const counter = (cx: number, cz: number, alongZ: boolean, seed: number): void => {
    const hx = alongZ ? 0.45 : 1.0, hz = alongZ ? 1.0 : 0.45;
    b.box(cx - hx, 0.04, cz - hz, cx + hx, 0.95, cz + hz, TIMBER_DARK, { top: MARBLE });
    // fish laid out in a row on it, and the ice they lie on
    b.box(cx - hx + 0.12, 0.95, cz - hz + 0.12, cx + hx - 0.12, 1.02, cz + hz - 0.12, ICE_CRATE);
    for (let j = 0; j < 4; j++) {
      const f = FISH[Math.floor(r(seed + j) * FISH.length)], u = -0.7 + j * 0.47;
      if (alongZ) b.box(cx - 0.3, 1.02, cz + u - 0.12, cx + 0.3, 1.1, cz + u + 0.12, f);
      else b.box(cx + u - 0.12, 1.02, cz - 0.3, cx + u + 0.12, 1.1, cz + 0.3, f);
    }
  };
  const sx = x1 - 0.9;
  counter(sx, z0 + 1.2, true, 1);
  counter(sx, zc, true, 2);
  counter(sx, z1 - 1.2, true, 3);
  counter(office + 2.0, zc - 0.5, false, 4);
  counter(office + 2.0, zc + 0.5, false, 5);
  // crates of ice, and a stack of fish boxes
  for (const [cx, cz, y] of [[office + 4.5, z0 + 0.7, 0.04], [office + 5.3, z0 + 0.7, 0.04], [office + 4.9, z0 + 0.7, 0.68]] as const) crate(k, cx, cz, y, 0.8, ICE_CRATE);
  for (const [cx, cz, y] of [[office + 4.6, z1 - 0.7, 0.04], [office + 4.6, z1 - 0.7, 0.68], [office + 5.4, z1 - 0.7, 0.04]] as const) crate(k, cx, cz, y, 0.8, TIMBER_PALE);
  // the scales on a post
  b.beam([sx - 0.2, 0.95, zc + 0.9], [sx - 0.2, 1.8, zc + 0.9], 0.04, 0.04, BRASS);
  b.box(sx - 0.45, 1.6, zc + 0.75, sx + 0.05, 1.66, zc + 1.05, BRASS);

  // fishwives behind the counters, buyers before them
  // (the middle counter's place is the show's: see PLACES.fishStall)
  for (const z of [z0 + 1.2, z1 - 1.2]) stand(k, sx - 1.0, z, 0.04, false);
  stand(k, office + 2.0, zc - 1.6, 0.04, false);
  stand(k, office + 3.2, zc + 1.6, 0.04, false);
  stand(k, office + 1.2, zc + 1.4, 0.04, false);
  for (const z of [z0 + 0.6, zc + 1.4, z1 - 0.4]) stand(k, l.x1 + 0.9, z);

  // lamps hung in the hall, and the light they throw
  for (const x of [office + 2.0, office + 4.8, sx]) k.glows.push({ x, y: eave - 0.7, z: zc, sx: 0.3, sy: 0.35, sz: 0.3, color: AMBER });
  k.lights.push({ x: (office + x1) / 2, z: zc, r: 10, color: AMBER, k: 0.55 });
  k.lights.push({ x: l.x1 + 2.5, z: zc, r: 8, color: SODIUM, k: 0.45 });
}

// ---------------------------------------------------------------------------
// The yards: the slip and the hull on it
// ---------------------------------------------------------------------------

/**
 * The hull's stations from the stern, out over the water, to where its plating stops: how far inland, its half
 * breadth, and its bottom. The stern is rounded, a cruiser's.
 */
const STATIONS: [number, number, number][] = [[-3.6, 0.85, 2.9], [-3.0, 1.45, 2.1], [-2.0, 1.8, 1.35], [-0.5, 1.95, 0.9], [2.0, 1.95, 0.8], [4.5, 1.9, 0.8], [6.5, 1.72, 0.85]];
/** Where the deck stops, at a bulkhead: the plating runs on past it. */
const DECKED = 5;
/** Its frames beyond the plating, which show as ribs. */
const FRAMES: [number, number, number][] = [[7.5, 1.5, 0.92], [8.5, 1.15, 1.02], [9.5, 0.7, 1.2]];

function slipAndHull(k: Build): void {
  const b = k.b, S = YARD.slip, H = YARD.hull, T = H.t, D = H.deck;
  /** A station's outline, from the port deck edge round the bottom to the starboard's: red oxide below 2.6, plating above. */
  const section = ([v, w, bot]: [number, number, number]): V3[] => {
    const ys = Math.max(2.6, bot + 1.0);
    return [[T - w, D, v], [T - w, ys, v], [T - w, bot + 1.0, v], [T - 0.55 * w, bot, v], [T + 0.55 * w, bot, v], [T + w, bot + 1.0, v], [T + w, ys, v], [T + w, D, v]];
  };
  /** A frame's outline, which needs no split for the paint. */
  const frame = ([v, w, bot]: [number, number, number]): V3[] => [[T - w, D, v], [T - w, bot + 1.0, v], [T - 0.55 * w, bot, v], [T + 0.55 * w, bot, v], [T + w, bot + 1.0, v], [T + w, D, v]];
  const NORMALS: [number, number][] = [[-1, 0], [-1, 0], [-1, -0.9], [0, -1], [1, -0.9], [1, 0], [1, 0]];
  onQuay(k, () => {
    // the slip: its ramp down into the water, and the two ways the cradle runs on
    slab(b, [T, -0.03, -0.05], [T, -1.35, S.v0], (S.t1 - S.t0) / 2 - 0.2, 0.4, CONCRETE);
    for (const s of [-1.3, 1.3]) b.sweep([[T + s, 0.17, S.v1 - 0.6], [T + s, 0.17, 0], [T + s, -1.0, S.v0 + 0.4]], [0.13, 0.13, 0.13], TIMBER_DARK);

    // the plated hull, from the stern to where the plating stops
    for (let i = 0; i + 1 < STATIONS.length; i++) {
      const A = section(STATIONS[i]), B = section(STATIONS[i + 1]), dv = STATIONS[i + 1][0] - STATIONS[i][0], dw = STATIONS[i + 1][1] - STATIONS[i][1];
      for (let j = 0; j < 7; j++) {
        if (Math.abs(A[j][1] - A[j + 1][1]) + Math.abs(A[j][0] - A[j + 1][0]) < 1e-3 && Math.abs(B[j][1] - B[j + 1][1]) + Math.abs(B[j][0] - B[j + 1][0]) < 1e-3) continue;
        const [nx, ny] = NORMALS[j], lean = -Math.sign(nx) * dw / dv, l = Math.hypot(nx, ny, lean);
        const n: V3 = [nx / l, ny / l, nx === 0 ? 0 : (Math.abs(nx) * lean) / l];
        b.quad(A[j], A[j + 1], B[j + 1], B[j], n, j === 0 || j === 6 ? PLATE : OXIDE);
        // inside, where the deck is not yet laid
        if (i >= DECKED) b.quad(A[j], A[j + 1], B[j + 1], B[j], [-n[0], -n[1], -n[2]], RUSTY);
      }
    }
    // the stern's end, and the bulkhead where the deck stops
    const fan = (P: V3[], n: V3, col: number): void => {
      const c: V3 = [P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length, P[0][2]];
      for (let j = 0; j < P.length; j++) face3(b, c, P[j], P[(j + 1) % P.length], n, col);
    };
    fan(frame(STATIONS[0]), [0, 0, -1], OXIDE);
    fan(frame(STATIONS[DECKED]), [0, 0, 1], RUSTY);
    // the deck, laid as far as the bulkhead, with a rail round the stern
    for (let i = 0; i < DECKED; i++) {
      const [va, wa] = STATIONS[i], [vb, wb] = STATIONS[i + 1];
      b.quad([T - wa, D, va], [T + wa, D, va], [T + wb, D, vb], [T - wb, D, vb], [0, 1, 0], DECK_PLATE);
    }
    b.sweep(STATIONS.slice(0, 4).map(([v, w]): V3 => [T - w + 0.05, D + 0.45, v]).reverse().concat(STATIONS.slice(0, 4).map(([v, w]): V3 => [T + w - 0.05, D + 0.45, v])), Array(8).fill(0.04), STEEL);
    // a hatch, and the frame of the deckhouse going up
    b.box(T - 0.7, D, 0.2, T + 0.7, D + 0.35, 1.6, DECK_PLATE);
    for (const [a, c] of [[-1.0, -2.6], [1.0, -2.6], [-1.0, -0.8], [1.0, -0.8]]) b.beam([T + a, D, c], [T + a, D + 1.6, c], 0.06, 0.06, RIB);
    for (const c of [-2.6, -0.8]) b.beam([T - 1.0, D + 1.6, c], [T + 1.0, D + 1.6, c], 0.05, 0.05, RIB);
    for (const a of [-1.0, 1.0]) b.beam([T + a, D + 1.6, -2.6], [T + a, D + 1.6, -0.8], 0.05, 0.05, RIB);

    // the frames beyond the plating, bare: ribs, the keel and the stem, and a stringer each side
    const last = STATIONS[STATIONS.length - 1], ribs = [last, ...FRAMES];
    for (const f of FRAMES) b.sweep(frame(f), Array(6).fill(0.09), RIB);
    b.sweep([[T, last[2] + 0.02, last[0]], ...FRAMES.map(([v, , bot]): V3 => [T, bot + 0.02, v]), [T, 1.45, H.bow], [T, D + 0.55, H.bow + 0.4]], Array(6).fill(0.12), RIB);
    for (const y of [3.0, D - 0.05]) for (const s of [-1, 1]) b.sweep([...ribs.map(([v, w]): V3 => [T + s * w, y, v]), [T, y, H.bow + (y > 4 ? 0.35 : 0.15)]], Array(5).fill(0.07), RIB);

    // keel blocks under it, and shores against its sides
    for (const v of [-2.0, 0.5, 3.0, 5.5, 8.0]) {
      const st = [...STATIONS, ...FRAMES].reduce((best, s) => (Math.abs(s[0] - v) < Math.abs(best[0] - v) ? s : best));
      const y0 = v < 0 ? 0.22 * v : 0.04;
      b.box(T - 0.45, y0, v - 0.3, T + 0.45, st[2] + 0.02, v + 0.3, TIMBER_DARK);
    }
    for (const v of [0.5, 3.0, 5.5]) for (const s of [-1, 1]) b.beam([T + s * 3.5, 0.04, v], [T + s * 1.97, 2.5, v], 0.1, 0.09, TIMBER);

    // the staging along the side the view sees, with a ladder
    const sx = T + 1.95 + 0.3;
    b.box(sx, 2.6, -1.4, sx + 0.8, 2.72, 6.0, TIMBER_PALE, { faces: 'NESWTB' });
    for (const v of [-1.2, 2.3, 5.8]) b.beam([sx + 0.7, 0.04, v], [sx + 0.7, 2.6, v], 0.06, 0.06, TIMBER);
    b.beam([sx + 0.95, 0.04, 6.5], [sx + 0.75, 2.7, 5.8], 0.05, 0.05, TIMBER);
  });
  // the slip's apron on the quay
  quayPatch(k, S.t0, 0.05, S.t1, S.v1, 0.04, CONCRETE);

  // shipwrights on the deck and the staging, and one at the bow
  const at = (t: number, v: number): P2 => Q(t, v);
  k.person(...at(T + 0.5, -3.1), D);
  k.person(...at(T + 0.9, 3.7), D);
  k.person(...at(T + 1.95 + 0.7, 0.6), 2.72);
  k.person(...at(T + 1.95 + 0.7, 4.2), 2.72);
  k.person(...at(T - 2.8, 8.4), 0.04);
  // the light over the slip by night: lamps on posts at its head, and work lamps on the staging
  const m = Q(T, 4);
  k.lights.push({ x: m[0], z: m[1], r: 12, color: SODIUM, k: 0.6 });
  for (const [t, v] of [[S.t0 - 0.6, 6.4], [S.t1 + 0.6, 9.6]]) {
    const [x, z] = Q(t, v);
    gasLamp(k, x, 4.2, z, 4.2);
  }
  for (const v of [0.6, 4.6]) {
    const [x, z] = Q(T + 1.95 + 1.05, v);
    k.glows.push({ x, y: 3.2, z, sx: 0.22, sy: 0.22, sz: 0.22, color: '#fff1c4' });
  }
}

// ---------------------------------------------------------------------------
// The yards: the hammerhead crane
// ---------------------------------------------------------------------------

function hammerhead(k: Build): void {
  const b = k.b, { t: T, v: V, top } = YARD.hammer, h = 1.1, base = 0.8, jy = top + 0.6;
  onQuay(k, () => {
    b.box(T - 1.6, 0, V - 1.6, T + 1.6, base, V + 1.6, CONCRETE, { top: STONE_LIGHT });
    // the tower: four legs, and a brace zigzagging up each face
    const corners: [number, number][] = [[-h, -h], [h, -h], [h, h], [-h, h]];
    for (const [a, c] of corners) b.beam([T + a, base, V + c], [T + a, top, V + c], 0.14, 0.14, CRANE_RED);
    const panels = 5, step = (top - base) / panels;
    for (let f = 0; f < 4; f++) {
      const [a0, c0] = corners[f], [a1, c1] = corners[(f + 1) % 4];
      for (let p = 0; p < panels; p++) {
        const flip = (p + f) % 2 === 0, ya = base + p * step, yb = ya + step;
        b.beam([T + (flip ? a0 : a1), ya, V + (flip ? c0 : c1)], [T + (flip ? a1 : a0), yb, V + (flip ? c1 : c0)], 0.06, 0.06, CRANE_RED);
      }
    }
    // the turntable on top
    b.box(T - 1.5, top, V - 1.5, T + 1.5, jy, V + 1.5, CRANE_RED, { faces: 'NESWTB' });
  });
  // what turns on it, slewed square across the quay so that its T is seen from the view: in its own frame x runs
  // along the jib, inland, and the short arm with the counterweight is out over the water
  const [hx, hz] = Q(T, V);
  k.b.moved(hx, 0, hz, YAW + Math.PI / 2, () => {
    const j0 = -5.4, j1 = 13, w = 0.55, jt = jy + 1.5;
    for (const s of [-w, w]) b.beam([j0, jy + 0.1, s], [j1, jy + 0.1, s], 0.1, 0.1, CRANE_RED);
    b.beam([j0, jt, 0], [j1 - 0.6, jt, 0], 0.1, 0.1, CRANE_RED);
    const bays = 9, bl = (j1 - j0) / bays;
    for (let i = 0; i < bays; i++) for (const s of [-w, w]) {
      const ta = j0 + i * bl, tb = ta + bl, up = i % 2 === 0;
      b.beam([up ? ta : tb, jy + 0.1, s], [up ? tb : ta, jt, 0], 0.05, 0.05, CRANE_RED);
    }
    b.beam([j1, jy + 0.1, -w], [j1 - 0.6, jt, 0], 0.06, 0.06, CRANE_RED);
    // the counterweight and the winch house on the short arm
    b.box(j0, jy - 1.1, -0.9, j0 + 2.2, jy + 0.5, 0.9, CONCRETE, { faces: 'NESWTB' });
    b.box(j0 + 2.5, jy + 0.1, -0.8, j0 + 4.6, jy + 1.3, 0.8, LEAD, { faces: 'NESWTB' });
    // the apex over the tower, and the ties to each end
    const ay = jt + 2.2;
    for (const s of [-w, w]) b.beam([0, jy + 0.1, s], [0, ay, 0], 0.08, 0.06, CRANE_RED);
    b.beam([0, ay, 0], [j1 - 0.6, jt, 0], 0.04, 0.04, STEEL);
    b.beam([0, ay, 0], [j0 + 0.4, jt, 0], 0.04, 0.04, STEEL);
    // the driver's cab, beside the jib on the side the view sees, its roof flat
    b.box(-0.6, top - 0.3, -2.4, 1.6, CAB_ROOF, -1.0, CREAM, { faces: 'NESWB' });
    b.box(-0.7, CAB_ROOF, -2.5, 1.7, CAB_ROOF + 0.1, -0.9, CRANE_RED, { faces: 'NESWTB' });
    b.box(-0.45, top + 0.3, -2.43, 1.45, CAB_ROOF - 0.3, -2.4, GLASS, { faces: 'N', win: interior(1.2) });
    // the trolley out over the timber stacks, and a plate slung from its hook
    const tt = 4.2;
    b.box(tt - 0.5, jy - 0.35, -0.5, tt + 0.5, jy + 0.05, 0.5, LEAD, { faces: 'NESWTB' });
    b.beam([tt, jy - 0.35, 0], [tt, 5.6, 0], 0.03, 0.03, IRON_DARK);
    b.box(tt - 0.25, 5.0, -0.18, tt + 0.25, 5.6, 0.18, CRANE_OCHRE, { faces: 'NESWTB' });
    for (const s of [-1, 1]) b.beam([tt, 5.0, 0], [tt + s * 0.8, 4.2, 0], 0.02, 0.02, IRON_DARK);
    b.box(tt - 0.95, 4.0, -0.6, tt + 0.95, 4.2, 0.6, 0x585d64, { faces: 'NESWTB' });
  });
  // a red lamp on the apex, and floodlights under the turntable
  const p = Q(T, V);
  k.glows.push({ x: p[0], y: YARD.hammer.top + 0.6 + 1.5 + 2.45, z: p[1], sx: 0.3, sy: 0.3, sz: 0.3, color: '#ff3b3b' });
  k.glows.push({ x: p[0], y: top - 0.2, z: p[1], sx: 0.5, sy: 0.2, sz: 0.5, color: AMBER });
}

// ---------------------------------------------------------------------------
// The yards: the floating dock and the tug in it
// ---------------------------------------------------------------------------

function floatingDock(k: Build): void {
  const b = k.b, D = YARD.dock, W = D.wall;
  onQuay(k, () => {
    b.box(D.t0, -1.3, D.v0, D.t1, -0.35, D.v1, DOCK, { top: 0x4a4f52 });
    for (const [va, vb] of [[D.v0, D.v0 + 1.1], [D.v1 - 1.1, D.v1]]) b.box(D.t0, -0.35, va, D.t1, W, vb, DOCK, { top: DOCK_TOP });
    // the dock master's cabin on the outer wall
    b.box(D.t1 - 3.0, W, D.v0 - 0.05, D.t1 - 0.8, W + 1.5, D.v0 + 1.15, CREAM);
    b.box(D.t1 - 3.15, W + 1.5, D.v0 - 0.2, D.t1 - 0.65, W + 1.65, D.v0 + 1.3, LEAD, { faces: 'NESWTB' });
    // the tug on her keel blocks
    const c = -3.4, t0 = D.t0 + 2.6, t1 = D.t1 - 3.6;
    for (const t of [t0 + 1.2, (t0 + t1) / 2, t1 - 1.6]) b.box(t - 0.3, -0.35, c - 0.35, t + 0.3, 0.02, c + 0.35, TIMBER_DARK);
    const plan: XZ[] = [[t0, c - 1.05], [t1 - 1.5, c - 1.3], [t1, c], [t1 - 1.5, c + 1.3], [t0, c + 1.05], [t0 - 0.4, c]];
    prism(b, plan, 0.02, 0.75, TUG_RED, { top: false });
    prism(b, plan, 0.75, 1.5, TUG_BLACK, { top: 0x5c4b3c });
    b.box(t0 + 2.6, 1.5, c - 0.75, t0 + 4.6, 2.7, c + 0.75, CREAM);
    b.box(t0 + 2.45, 2.7, c - 0.9, t0 + 4.75, 2.85, c + 0.9, DARK, { faces: 'NESWTB' });
    b.box(t0 + 4.6, 1.95, c - 0.6, t0 + 4.63, 2.5, c + 0.6, GLASS, { faces: 'E', win: interior(1.0) });
    b.cyl(t0 + 1.6, c, 1.5, 3.4, 0.42, 0.4, 8, TUG_BLACK);
    b.cyl(t0 + 1.6, c, 2.7, 2.95, 0.45, 0.45, 8, TUG_RED, { cap: false });
    b.beam([t0 + 3.6, 2.85, c], [t0 + 3.6, 4.5, c], 0.05, 0.04, IRON);
    // a fender of old tyres at her bow
    b.box(t1 - 0.15, 0.6, c - 0.45, t1 + 0.25, 1.3, c + 0.45, DARK);
  });
  const p = Q((D.t0 + D.t1) / 2, (D.v0 + D.v1) / 2);
  k.lights.push({ x: p[0], z: p[1], r: 10, color: SODIUM, k: 0.45 });
  const cab = Q(D.t1 - 1.9, D.v0 + 0.55);
  k.glows.push({ x: cab[0], y: W + 1.0, z: cab[1], sx: 0.4, sy: 0.3, sz: 0.4, color: AMBER });
  // lamps at the ends of its walls
  for (const t of [D.t0 + 0.3, D.t1 - 4.0]) for (const v of [D.v0 + 0.55, D.v1 - 0.55]) {
    const [x, z] = Q(t, v);
    k.glows.push({ x, y: W + 0.25, z, sx: 0.25, sy: 0.3, sz: 0.25, color: SODIUM });
  }
  // a rigger on the wall, and the tug's mate on her deck
  k.person(...Q(D.t0 + 3, D.v1 - 0.55), W);
  k.person(...Q(D.t1 - 7.2, -3.4), 1.5);
}

// ---------------------------------------------------------------------------
// The yards: the rails along the quay, the travelling crane and the yard engine
// ---------------------------------------------------------------------------

function quayRails(k: Build): void {
  const b = k.b, R = YARD.rails, C = YARD.crane, L = YARD.loco, g = 0.65;
  quayPatch(k, R.t0 + 0.3, R.track - 0.75, R.t1 - 0.3, R.track + 0.75, 0.035, CINDER);
  onQuay(k, () => {
    for (const v of [R.a, R.b]) b.box(R.t0, 0, v - 0.07, R.t1, 0.13, v + 0.07, STEEL);
    for (const v of [R.track - 0.4, R.track + 0.4]) b.box(R.t0 + 0.4, 0.035, v - 0.05, R.t1 - 0.4, 0.11, v + 0.05, STEEL);

    // the travelling crane, straddling the yard's track on its own rails
    for (const s of [-1, 1]) for (const v of [R.a, R.b]) {
      b.box(C + s * 1.2 - 0.5, 0.13, v - 0.2, C + s * 1.2 + 0.5, 0.6, v + 0.2, CRANE_OCHRE);
      b.beam([C + s * 1.2, 0.6, v], [C + s * 1.0, 5.4, v + (v === R.a ? 0.1 : -0.1)], 0.11, 0.1, CRANE_OCHRE);
    }
    for (const s of [-1, 1]) b.box(C + s * 1.0 - 0.18, 5.4, R.a - 0.2, C + s * 1.0 + 0.18, 5.9, R.b + 0.2, CRANE_OCHRE, { faces: 'NESWTB' });
    b.box(C - 1.25, 5.9, R.a + 0.5, C + 1.25, 7.5, R.b - 0.2, CRANE_OCHRE, { faces: 'NESWB', top: LEAD });
    b.box(C - 1.35, 7.5, R.a + 0.4, C + 1.35, 7.62, R.b - 0.1, LEAD, { faces: 'NESWTB' });
    b.box(C - 0.5, 6.0, R.a - 0.3, C + 0.5, 7.3, R.a + 0.5, CREAM, { faces: 'NESWTB' });
    b.box(C - 0.45, 6.5, R.a - 0.33, C + 0.45, 7.1, R.a - 0.3, GLASS, { faces: 'N', win: interior(1.0) });
    // its jib, raised out over the dock, and the hook let down into it
    const tip = YARD.dock.v0 + 1.4, ty = 9.6;
    for (const s of [-0.35, 0.35]) b.beam([C + s, 6.9, R.a + 0.4], [C + s * 0.4, ty, tip], 0.08, 0.06, CRANE_OCHRE);
    for (const f of [0.3, 0.6]) b.beam([C - 0.35 + 0.21 * f, 6.9 + (ty - 6.9) * f, R.a + 0.4 + (tip - R.a - 0.4) * f], [C + 0.35 - 0.21 * f, 6.9 + (ty - 6.9) * f, R.a + 0.4 + (tip - R.a - 0.4) * f], 0.04, 0.04, CRANE_OCHRE);
    b.beam([C, ty, tip], [C, 2.4, tip], 0.025, 0.025, IRON_DARK);
    b.box(C - 0.2, 1.9, tip - 0.15, C + 0.2, 2.4, tip + 0.15, IRON_DARK, { faces: 'NESWTB' });

    // the yard engine: a small tank engine on the middle track
    const v = R.track;
    b.box(L - 1.6, 0.12, v - g, L + 1.7, 0.7, v + g, DARK);
    b.box(L - 1.8, 0.7, v - 0.8, L + 1.9, 0.85, v + 0.8, LOCO, { faces: 'NESWTB' });
    drum(b, [L + 0.75, 1.5, v], 0.62, 1.05, LOCO, { cap: IRON_DARK });
    b.box(L - 1.7, 0.85, v - 0.75, L - 0.4, 2.45, v + 0.75, LOCO);
    b.box(L - 1.85, 2.45, v - 0.85, L - 0.25, 2.6, v + 0.85, DARK, { faces: 'NESWTB' });
    b.cyl(L + 1.4, v, 2.0, 2.75, 0.17, 0.2, 6, IRON_DARK);
    b.cyl(L + 0.4, v, 2.0, 2.4, 0.22, 0.18, 6, BRASS);
    for (const t of [L - 1.95, L + 2.05]) b.box(t - 0.1, 0.45, v - 0.75, t + 0.1, 0.8, v + 0.75, TUG_RED);
  });
  const cab = Q(L - 1.05, YARD.rails.track);
  k.glows.push({ x: cab[0], y: 1.9, z: cab[1], sx: 0.25, sy: 0.25, sz: 0.25, color: AMBER });
  const cr = Q(C, R.a);
  k.glows.push({ x: cr[0], y: 6.75, z: cr[1], sx: 0.3, sy: 0.3, sz: 0.3, color: AMBER });
  k.person(...Q(L - 0.2, R.track + 1.3), 0.04);
}

// ---------------------------------------------------------------------------
// The yards: the shops, the stacks and the boiler
// ---------------------------------------------------------------------------

function shops(k: Build): void {
  const b = k.b, P = YARD.plate, S = YARD.shop, B = YARD.boiler;
  onQuay(k, () => {
    // the plate shop: open to the quay under a pitched roof, its back and ends of brick
    b.box(P.t0, 0, P.v1 - 0.3, P.t1, 4, P.v1, BRICK, { win: SMALL_WIN, faces: 'NESW' });
    for (const [ta, tb] of [[P.t0, P.t0 + 0.3], [P.t1 - 0.3, P.t1]]) b.box(ta, 0, P.v0, tb, 4, P.v1 - 0.3, BRICK, { faces: 'NESW' });
    b.box(P.t0 + 0.3, 3.6, P.v0, P.t1 - 0.3, 4.0, P.v0 + 0.25, IRON_DARK, { faces: 'NESWB' });
    for (const t of [P.t0 + 2.0, P.t1 - 2.0]) b.beam([t, 0.04, P.v0 + 0.12], [t, 3.6, P.v0 + 0.12], 0.12, 0.12, IRON);
    pitched(k, P.t0, P.v0, P.t1, P.v1, 4, 1.1, 0.35, SLATE, 0x2c2a28, BRICK, BRICK_DARK);
    // plates stacked in it, and on the bending rolls
    for (let i = 0; i < 4; i++) b.box(P.t0 + 0.8 + i * 0.04, 0.04 + i * 0.14, P.v0 + 0.8, P.t0 + 3.0 - i * 0.05, 0.18 + i * 0.14, P.v1 - 0.9, i % 2 ? 0x585d64 : 0x4d5258);
    drum(b, [P.t1 - 2.2, 0.65, P.v0 + 1.7], 0.35, 1.2, IRON);
    b.box(P.t1 - 3.6, 0.04, P.v0 + 1.2, P.t1 - 3.4, 1.2, P.v0 + 2.2, IRON_DARK);
    b.box(P.t1 - 1.0, 0.04, P.v0 + 1.2, P.t1 - 0.8, 1.2, P.v0 + 2.2, IRON_DARK);

    // the machine shop: brick, with a sawtooth roof whose glass faces the water
    b.box(S.t0, 0, S.v0, S.t1, 4, S.v1, BRICK_RED, { win: SMALL_WIN, faces: 'NESW' });
    b.box(S.t0 - 0.08, 4, S.v0 - 0.08, S.t1 + 0.08, 4.3, S.v1 + 0.08, STONE_TRIM, { faces: 'NESWTB' });
    b.box(S.t0, 4.3, S.v0, S.t1, 6.4, S.v1, BRICK_RED, { faces: 'NESW' });
    const teeth = 3, tw = (S.v1 - S.v0) / teeth, ty = 8.3, len = Math.hypot(tw, ty - 6.4);
    for (let i = 0; i < teeth; i++) {
      const va = S.v0 + i * tw, vb = va + tw;
      b.quad([S.t1, 6.4, va], [S.t0, 6.4, va], [S.t0, ty, va], [S.t1, ty, va], [0, 0, -1], GLASS, { win: interior(1.6) });
      b.quad([S.t0, ty, va], [S.t0, 6.4, vb], [S.t1, 6.4, vb], [S.t1, ty, va], [0, tw / len, (ty - 6.4) / len], SLATE);
      for (const [t, n] of [[S.t0, -1], [S.t1, 1]] as const) face3(b, [t, 6.4, va], [t, ty, va], [t, 6.4, vb], [n, 0, 0], BRICK_RED);
    }
    // its great door to the quay end, and a chimney
    b.box(S.t1, 0.04, S.v0 + 1.6, S.t1 + 0.06, 3.3, S.v0 + 4.2, DARK);
    b.box(S.t0 + 0.4, 6.4, S.v1 - 1.1, S.t0 + 1.1, 8.9, S.v1 - 0.4, BRICK_DARK);

    // the boiler lying on its trestles
    drum(b, [B.t, 1.4, B.v], 0.85, 1.55, IRON_DARK, { cap: IRON });
    for (const t of [B.t - 1.0, B.t + 1.0]) {
      for (const s of [-1, 1]) b.beam([t, 0.04, B.v + s * 0.9], [t, 0.75, B.v + s * 0.3], 0.07, 0.07, TIMBER);
      b.box(t - 0.15, 0.55, B.v - 0.7, t + 0.15, 0.75, B.v + 0.7, TIMBER_DARK);
    }

    // timber baulks stacked between the crane and the plate shop
    const tb = YARD.hammer.t;
    for (let i = 0; i < 3; i++) b.box(tb - 1.6 + i * 0.1, 0.04 + i * 0.35, 6.3 + i * 0.08, tb + 1.4 - i * 0.12, 0.39 + i * 0.35, 8.0 - i * 0.1, i % 2 ? TIMBER : TIMBER_PALE);
    // plates stacked on the strip by the slip
    const ps = YARD.slip.t0 - 1.4;
    for (let i = 0; i < 3; i++) b.box(ps - 0.9 + i * 0.05, 0.04 + i * 0.16, 2.6, ps + 0.9 - i * 0.06, 0.2 + i * 0.16, 5.6 - i * 0.1, i % 2 ? 0x585d64 : 0x4d5258);
  });
  const door = Q(S.t1 + 0.3, S.v0 + 2.9);
  k.glows.push({ x: door[0], y: 3.6, z: door[1], sx: 0.3, sy: 0.25, sz: 0.3, color: AMBER });
  k.lights.push({ x: door[0], z: door[1], r: 9, color: AMBER, k: 0.45 });
  k.person(...Q(S.t1 + 0.8, S.v0 + 2.2), 0.04);
  k.person(...Q(B.t + 0.4, B.v - 1.4), 0.04);
  k.person(...Q(P.t0 + 3.6, P.v0 + 1.2), 0.04);
}

// ---------------------------------------------------------------------------
// The yards: the gasholder
// ---------------------------------------------------------------------------

function gasholder(k: Build): void {
  const b = k.b, [cx, cz] = YARD.gas, n = 8, ph = Math.PI / 8;
  // the tank's brick rim, the drum risen out of it, a paler band where its lifts meet, and its crown
  b.cyl(cx, cz, 0, 1.0, GAS_R - 0.25, GAS_R - 0.25, 12, BRICK_DARK, { cap: false });
  b.cyl(cx, cz, 0.6, 10, GAS_R - 0.75, GAS_R - 0.75, 12, GAS_DRUM, { cap: false });
  b.cyl(cx, cz, 5.0, 5.4, GAS_R - 0.68, GAS_R - 0.68, 12, GAS_BAND, { cap: false });
  lathe(b, cx, cz, [[GAS_R - 0.75, 10], [GAS_R - 1.9, 10.45], [2.2, GAS_TOP - 0.02]], 12, GAS_CROWN);
  b.cyl(cx, cz, GAS_TOP - 0.1, GAS_TOP, 2.2, 2.2, 12, GAS_CROWN);
  // the guide frame: standards round it, and two rings of girders
  const P = Array.from({ length: n }, (_, i): [number, number] => [cx + Math.cos(ph + (i * 2 * Math.PI) / n) * GAS_R, cz + Math.sin(ph + (i * 2 * Math.PI) / n) * GAS_R]);
  for (const [x, z] of P) b.beam([x, 0, z], [x, 12.6, z], 0.17, 0.13, GAS_FRAME);
  for (const y of [7.0, 12.4]) for (let i = 0; i < n; i++) {
    const [ax, az] = P[i], [bx, bz] = P[(i + 1) % n];
    b.beam([ax, y, az], [bx, y, bz], 0.09, 0.09, GAS_FRAME);
  }
  for (let i = 0; i < n; i++) {
    const [ax, az] = P[i], [bx, bz] = P[(i + 1) % n], up = i % 2 === 0;
    b.beam([up ? ax : bx, 1.0, up ? az : bz], [up ? bx : ax, 7.0, up ? bz : az], 0.05, 0.05, GAS_FRAME);
  }
  k.lights.push({ x: cx, z: cz, r: 10, color: SODIUM, k: 0.45 });
  // a red lamp on the standard that faces the view, and a lamp at the foot of the one by the yard's road
  const [rx, rz] = P[1];
  k.glows.push({ x: rx, y: 12.85, z: rz, sx: 0.3, sy: 0.3, sz: 0.3, color: '#ff3b3b' });
  const [fx, fz] = P[5];
  gasLamp(k, fx + 0.35, 3.0, fz, 0);
}

// ---------------------------------------------------------------------------
// The yards: the light at the point
// ---------------------------------------------------------------------------

function harbourLight(k: Build): void {
  const b = k.b, [cx, cz] = YARD.light, G = LIGHT_GALLERY;
  b.cyl(cx, cz, -1.5, 0.9, 2.0, 2.0, 10, STONE, { cap: STONE_TRIM });
  b.cyl(cx, cz, 0.9, 1.4, 1.6, 1.55, 8, STONE_TRIM);
  b.cyl(cx, cz, 1.4, G - 0.8, 1.25, 1.05, 8, STONE, { cap: false });
  b.cyl(cx, cz, 6.0, 6.35, 1.2, 1.18, 8, STONE_TRIM, { cap: false });
  // the gallery on its corbels, a rail round it, the lantern, and its copper roof
  b.cyl(cx, cz, G - 0.8, G - 0.2, 1.05, 1.75, 8, STONE_TRIM, { cap: false });
  b.cyl(cx, cz, G - 0.2, G, 1.75, 1.75, 8, STONE_LIGHT);
  b.cyl(cx, cz, G + 0.75, G + 0.9, 1.72, 1.72, 8, IRON, { cap: false });
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 2;
    b.beam([cx + Math.cos(a) * 1.68, G, cz + Math.sin(a) * 1.68], [cx + Math.cos(a) * 1.68, G + 0.85, cz + Math.sin(a) * 1.68], 0.04, 0.04, IRON);
  }
  b.cyl(cx, cz, G, G + 1.9, 0.82, 0.82, 8, 0xf3e6b4, { cap: false, win: interior(1.4) });
  b.cyl(cx, cz, G + 1.9, G + 2.9, 1.0, 0.12, 8, COPPER);
  b.beam([cx, G + 2.85, cz], [cx, G + 3.7, cz], 0.05, 0.03, IRON);
  // its door, to the land, and a gargoyle on the platform looking out to the view
  const dx = -AC[0], dz = -AC[1];
  b.obox(cx + dx * 1.2, 1.4 + 1.0, cz + dz * 1.2, 0.45, 1.0, 0.1, Math.atan2(dz, dx) + Math.PI / 2, DARK);
  gargoyle(b, cx + 0.95 * 1.3, 0.9, cz + 0.95 * 1.3, Math.PI / 4, 0.7);
  k.glows.push({ x: cx, y: G + 0.95, z: cz, sx: 1.0, sy: 1.3, sz: 1.0, color: '#ffe9a8' });
  k.lights.push({ x: cx, z: cz, r: 12, color: AMBER, k: 0.55 });
}

// ---------------------------------------------------------------------------
// The yards: the gate, the wall and the watchman's box
// ---------------------------------------------------------------------------

function gateAndWall(k: Build, l: Lot): void {
  const b = k.b, G = YARD.gate, x = G.x, t = 0.15;
  // the two piers, with a gargoyle on each looking out at the street
  for (const z of [G.z - G.half, G.z + G.half]) {
    b.box(x - 0.4, 0, z - 0.4, x + 0.4, 3.6, z + 0.4, BRICK);
    b.box(x - 0.5, 3.6, z - 0.5, x + 0.5, 3.85, z + 0.5, STONE_TRIM, { faces: 'NESWTB' });
    gargoyle(b, x - 0.1, 3.85, z, Math.PI, 0.55);
  }
  // the board over the gate, lettered both ways
  b.box(x - t, 3.95, G.z - G.half - 0.3, x + t, 4.1, G.z + G.half + 0.3, IRON_DARK, { faces: 'NESWTB' });
  b.box(x - 0.1, 4.1, G.z - G.half + 0.1, x + 0.1, 5.0, G.z + G.half - 0.1, DARK, { faces: 'NESWTB' });
  k.sign('tricorner-yards', x - 0.13, 4.55, G.z, -1, 0, 0.62, 4.1);
  k.sign('tricorner-yards-back', x + 0.13, 4.55, G.z, 1, 0, 0.62, 4.1);
  // the leaves, swung open inwards, each hinged on its pier
  for (const s of [-1, 1]) {
    const hz = G.z + s * (G.half - 0.4), dx = Math.sin(1.2), dz = -s * Math.cos(1.2), lf = 1.75;
    b.obox(x + 0.1 + (dx * lf) / 2, 1.15, hz + (dz * lf) / 2, lf / 2, 1.0, 0.04, Math.atan2(dz, dx), IRON, { faces: 'NESWTB' });
  }
  // the wall south of the gate, to the board's edge
  const z0 = G.z + G.half + 0.3, z1 = l.z1 - 0.5;
  b.box(x - t, 0, z0, x + t, 1.5, z1, BRICK_DARK, { faces: 'NESW' });
  b.box(x - t - 0.06, 1.5, z0, x + t + 0.06, 1.62, z1, STONE_TRIM, { faces: 'NESWTB' });
  for (let z = z0 + 4; z < z1 - 1; z += 4.5) b.box(x - 0.3, 0, z - 0.3, x + 0.3, 1.8, z + 0.3, BRICK);
  gasLamp(k, x + 0.6, 3.1, G.z - G.half, 0);
  b.beam([x + 0.4, 3.0, G.z - G.half], [x + 0.6, 3.05, G.z - G.half], 0.05, 0.05, IRON_DARK);

  // the watchman's box just inside, and the watchman at the gate
  const H = YARD.hut;
  onQuay(k, () => {
    b.box(H.t0, 0, H.v0, H.t1, 2.5, H.v1, TIMBER);
    b.box(H.t0 - 0.15, 2.5, H.v0 - 0.15, H.t1 + 0.15, 2.65, H.v1 + 0.15, LEAD, { faces: 'NESWTB' });
    b.box(H.t1, 1.4, H.v0 + 0.3, H.t1 + 0.03, 2.0, H.v1 - 0.3, GLASS, { faces: 'E', win: interior(1.0) });
  });
  k.person(x + 1.2, G.z + 0.6);
  // the yard's own paving from the gate to the quay, in cinders
  quayPatch(k, YARD.slip.t0 - 2.4, 2.0, YARD.slip.t0 - 0.2, YARD.hut.v1 - 0.8, 0.035, CINDER);
}

// ---------------------------------------------------------------------------
// The yards, whole
// ---------------------------------------------------------------------------

function yards(k: Build, l: Lot): void {
  slipAndHull(k);
  hammerhead(k);
  floatingDock(k);
  quayRails(k);
  shops(k);
  gasholder(k);
  harbourLight(k);
  gateAndWall(k, l);
}

// ---------------------------------------------------------------------------
// The quay: kerb, rails, bollards, rings and lamps, from the Battery's corner to the point
// ---------------------------------------------------------------------------

/** Stretches of the quay's edge with a kerb, by how far along it: the jetty, the casino's gangway, the bridge's foot, the slip and the light break it. */
function kerbs(): [number, number][] {
  const j0 = tAt(JETTY.z0), j1 = tAt(JETTY.z1);
  return [[122, j0 - 0.4], [j1 + 0.4, CASINO_T - 1.1], [CASINO_T + 1.1, 157.5], [168.5, YARD.slip.t0 - 0.1], [YARD.slip.t1 + 0.1, YARD.dock.t1 - 0.3]];
}

function quay(k: Build): void {
  const b = k.b, j0 = tAt(JETTY.z0), j1 = tAt(JETTY.z1);
  onQuay(k, () => {
    for (const [ta, tb] of kerbs()) b.box(ta, -0.12, -0.12, tb, 0.2, 0.5, STONE_LIGHT, { faces: 'NESWTB', top: STONE_TRIM });
    // a rail where no boat lies
    const rails: [number, number][] = [[122.4, j0 - 2.0], [j1 + 2.0, 139.0], [168.9, YARD.slip.t0 - 0.5], [YARD.slip.t1 + 0.5, YARD.dock.t0 - 0.4]];
    for (const [ta, tb] of rails) {
      b.box(ta, 1.0, 0.31, tb, 1.08, 0.39, STEEL, { faces: 'NESWTB' });
      b.box(ta, 0.6, 0.33, tb, 0.65, 0.37, STEEL, { faces: 'NESWTB' });
      const n = Math.max(1, Math.round((tb - ta) / 2.4));
      for (let i = 0; i <= n; i++) {
        const t = ta + ((tb - ta) * i) / n;
        b.box(t - 0.05, 0.2, 0.3, t + 0.05, 1.0, 0.4, STEEL, { faces: 'NESW' });
      }
    }
    // mooring rings let into the quay's face
    for (const t of [127, 144, 156, 171, YARD.dock.t0 + 2, YARD.dock.t1 - 2]) {
      b.box(t - 0.12, -0.55, -0.16, t + 0.12, -0.3, -0.02, IRON_DARK, { faces: 'NESWB' });
      b.beam([t - 0.22, -0.6, -0.18], [t + 0.22, -0.6, -0.18], 0.04, 0.04, IRON);
      b.beam([t - 0.22, -0.6, -0.18], [t, -0.95, -0.18], 0.04, 0.04, IRON);
      b.beam([t + 0.22, -0.6, -0.18], [t, -0.95, -0.18], 0.04, 0.04, IRON);
    }
  });
  // bollards at the berths, on the kerb
  for (const t of [j0 - 0.6, j1 + 0.6, 139.6, 160.4, YARD.dock.t0 + 0.6, (YARD.dock.t0 + YARD.dock.t1) / 2, YARD.dock.t1 - 0.6]) bollard(k, ...Q(t, 0.2), 0.2);
  // lamps along the walk, where they hide nothing the view must see
  for (const [t, v] of [[124.5, 2.2], [138, 2.2], [172.5, 1.8]]) {
    const [x, z] = Q(t, v);
    if (free(x, z, 0.3)) gasLamp(k, x, 3.4, z, 3.4);
  }
  // people on the walk
  for (const [t, v] of [[126.2, 1.6], [141.5, 3.2], [163.5, 3.0], [170.5, 3.6]]) stand(k, ...Q(t, v));
}

// ---------------------------------------------------------------------------
// The jetty, its boats and nets, and the men fishing at its foot
// ---------------------------------------------------------------------------

function jetty(k: Build): void {
  const b = k.b, J = JETTY, y = J.y, qa = harbourQuay(J.z0), qb = harbourQuay(J.z1);
  // the deck, on piles, and its abutment against the quay
  const deck: XZ[] = [[qa, J.z0], [J.x1, J.z0], [J.x1, J.z1], [qb, J.z1]];
  prism(b, deck, y - 0.25, y, TIMBER, { top: TIMBER_PALE });
  b.quad([qa, y - 0.25, J.z0], [qb, y - 0.25, J.z1], [J.x1, y - 0.25, J.z1], [J.x1, y - 0.25, J.z0], [0, -1, 0], TIMBER_DARK);
  for (const x of [J.x1 - 0.3, (J.x1 + Math.max(qa, qb)) / 2]) for (const z of [J.z0 + 0.2, J.z1 - 0.2]) b.beam([x, -1.5, z], [x, y - 0.25, z], 0.13, 0.13, TIMBER_DARK);
  // two steps up from the quay to it
  for (const [d0, d1, h] of [[1.2, 0.6, 0.27], [0.6, 0, 0.54]] as const) prism(b, [[qa - d0, J.z0], [qa - d1, J.z0], [qb - d1, J.z1], [qb - d0, J.z1]], 0, h, STONE_LIGHT, { top: STONE_TRIM });
  // cleats at its end
  for (const z of [J.z0 + 0.15, J.z1 - 0.15]) b.box(J.x1 - 0.5, y, z - 0.08, J.x1 - 0.2, y + 0.14, z + 0.08, IRON);

  // fishing boats tied up along its north side, and a skiff at its south
  const boat = (x: number, z: number, L: number, wd: number, hull: number, cabin: boolean): void => {
    const plan: XZ[] = [[x - L / 2, z - wd / 2], [x + L / 2 - 0.9, z - wd / 2], [x + L / 2, z], [x + L / 2 - 0.9, z + wd / 2], [x - L / 2, z + wd / 2]];
    prism(b, plan, -1.05, -0.3, hull, { top: TIMBER_PALE });
    b.box(x - L / 2 - 0.03, -0.55, z - wd / 2 - 0.03, x + L / 2 - 0.9, -0.42, z + wd / 2 + 0.03, WHITE, { faces: 'NESW' });
    if (cabin) {
      b.box(x - 0.6, -0.3, z - wd / 2 + 0.2, x + 0.5, 0.75, z + wd / 2 - 0.2, WHITE);
      b.box(x - 0.7, 0.75, z - wd / 2 + 0.1, x + 0.6, 0.85, z + wd / 2 - 0.1, DARK, { faces: 'NESWTB' });
      b.beam([x - L / 2 + 0.7, -0.3, z], [x - L / 2 + 0.7, 1.9, z], 0.05, 0.04, TIMBER_DARK);
      b.beam([x - L / 2 + 0.7, 1.1, z], [x + 0.5, 0.8, z], 0.03, 0.03, TIMBER_DARK);
    }
  };
  boat(J.x1 - 2.2, J.z0 - 1.05, 3.8, 1.5, BOAT_HULLS[0], true);
  boat(J.x1 - 2.4 - 3.6 + 1.2, J.z0 - 1.0, 2.8, 1.3, BOAT_HULLS[1], false);
  boat(J.x1 - 1.9, J.z1 + 0.75, 2.4, 1.1, BOAT_HULLS[2], false);
  b.beam([J.x1 - 0.35, y + 0.1, J.z0 + 0.1], [J.x1 - 0.7, -0.35, J.z0 - 0.4], 0.025, 0.025, ROPE);

  // nets hung to dry on poles at its foot, with their floats
  const n0 = Q(tAt(J.z0) - 3.6, 3.5), n1 = Q(tAt(J.z0) - 1.0, 3.5);
  for (const [x, z] of [n0, n1]) b.beam([x, 0, z], [x, 2.1, z], 0.07, 0.06, TIMBER_DARK);
  const mid: V3 = [(n0[0] + n1[0]) / 2, 1.55, (n0[1] + n1[1]) / 2], nn: V3 = [AC[0], 0, AC[1]];
  both(k, [n0[0], 0.4, n0[1]], [mid[0], 0.35, mid[2]], mid, [n0[0], 2.0, n0[1]], nn, NET, NET);
  both(k, [mid[0], 0.35, mid[2]], [n1[0], 0.4, n1[1]], [n1[0], 2.0, n1[1]], mid, nn, NET, NET);
  for (let i = 1; i < 5; i++) {
    const f = i / 5, px = n0[0] + (n1[0] - n0[0]) * f, pz = n0[1] + (n1[1] - n0[1]) * f, py = 2.0 - 0.45 * Math.sin(Math.PI * f);
    b.box(px - 0.1, py - 0.12, pz - 0.1, px + 0.1, py + 0.06, pz + 0.1, FLOAT, { faces: 'NESWTB' });
  }
  // crates of the catch by the steps, one of them stencilled
  const c0 = Q(tAt(J.z1) + 1.0, 1.6);
  crate(k, c0[0], c0[1], 0, 0.8);
  crate(k, c0[0] + 0.15, c0[1] + 0.05, 0.64, 0.7, ICE_CRATE);
  hang(k, 'tricorner-patent', c0[0] + 0.4, 0.32, c0[1], 1, 0, 0.18, 0.7, TIMBER_PALE);

  // two men fishing off the quay beside its foot, each with his rod out over the water
  for (const z of [J.z0 - 0.8, J.z1 + 0.9]) {
    const t = tAt(z), [x, zz] = Q(t, 0.75);
    if (!stand(k, x, zz, 0, false)) continue;
    const [tx, tz] = Q(t, -2.8);
    b.beam([x + AC[0] * 0.25, 1.2, zz + AC[1] * 0.25], [tx, 2.2, tz], 0.03, 0.015, TIMBER_DARK);
    b.beam([tx, 2.2, tz], [tx, -0.9, tz], 0.008, 0.008, 0xdedede);
    barrel(k, ...Q(t, 1.6), 0, TIMBER_DARK);
  }
  // a fishwife and a porter with a crate on his shoulder at the jetty's foot
  const fw = Q(tAt(J.z0) - 1.6, 2.2);
  stand(k, fw[0], fw[1]);
  const po = Q(tAt(J.z1) + 2.4, 2.6);
  if (stand(k, po[0], po[1])) crate(k, po[0] + 0.25, po[1], 1.75, 0.5);
  const j = Q(tAt(JETTY_Z), 0);
  k.lights.push({ x: j[0] - 1, z: j[1], r: 9, color: SODIUM, k: 0.45 });
}

// ---------------------------------------------------------------------------
// The Iceberg Casino's landing
// ---------------------------------------------------------------------------

function casinoLanding(k: Build): void {
  const b = k.b, t0 = CASINO_T - 4, t1 = CASINO_T + 4, v0 = CASINO_CLEAR + 0.2, v1 = 7.6, ya = 3.0, yb = 3.3;
  onQuay(k, () => {
    // the striped awning on its posts
    const n = 8, w = (t1 - t0) / n, len = Math.hypot(v1 - v0, yb - ya);
    for (let i = 0; i < n; i++) {
      const ta = t0 + i * w, tb = ta + w;
      both(k, [ta, ya, v0], [tb, ya, v0], [tb, yb, v1], [ta, yb, v1], [0, (v1 - v0) / len, -(yb - ya) / len], i % 2 ? ICE_BLUE : WHITE, 0x2c3036);
    }
    b.box(t0, ya - 0.28, v0 - 0.05, t1, ya, v0 + 0.03, ICE_BLUE, { faces: 'NESWTB' });
    for (const t of [t0 + 0.12, t1 - 0.12]) for (const [v, y] of [[v0 + 0.1, ya - 0.25], [v1 - 0.12, yb - 0.02]]) b.beam([t, 0, v], [t, y, v], 0.06, 0.06, BRASS);
    // the rope on its stanchions either side of the carpet
    for (const t of [CASINO_T - 1.0, CASINO_T + 1.0]) {
      const pts: V3[] = [];
      for (const v of [v0 + 0.3, 6.3, v1 - 0.3]) {
        b.beam([t, 0.045, v], [t, 0.95, v], 0.045, 0.04, BRASS);
        pts.push([t, 0.85, v]);
      }
      b.sweep([pts[0], [t, 0.72, (pts[0][2] + pts[1][2]) / 2], pts[1], [t, 0.72, (pts[1][2] + pts[2][2]) / 2], pts[2]], [0.035, 0.035, 0.035, 0.035, 0.035], ROPE_RED);
    }
  });
  // the carpet down to her gangway
  quayPatch(k, CASINO_T - 0.7, 0.15, CASINO_T + 0.7, v1 - 0.2, 0.045, CARPET);
  // two lamps under the awning's front, either side of the way in
  for (const t of [CASINO_T - 1.8, CASINO_T + 1.8]) {
    const [x, z] = Q(t, v0 + 0.25);
    gasLamp(k, x, 2.3, z, 2.3, AMBER);
  }
  // guests waiting under it, and a doorman at the gangway's head
  for (const [t, v] of [[CASINO_T - 2.4, 6.6], [CASINO_T - 2.0, 7.2], [CASINO_T + 2.3, 6.8], [CASINO_T + 3.2, 6.3]]) k.person(...Q(t, v), 0);
  k.person(...Q(CASINO_T + 1.4, 1.2), 0);
}

// ---------------------------------------------------------------------------
// The chandler's yard beside the bridge's ramp
// ---------------------------------------------------------------------------

/** Its shed: where it stands on the open ground between the rows and the ramp. */
const SHED = { x0: 28.0, z0: 78.7, x1: 31.0, z1: 81.2 };

function chandler(k: Build): void {
  const b = k.b, S = SHED;
  const corners: P2[] = [[S.x0, S.z0], [S.x1, S.z0], [S.x1, S.z1], [S.x0, S.z1]];
  if (!corners.every(([x, z]) => open(x, z, 0.2))) {
    console.warn("Gotham: the chandler's shed has no room beside the bridge's ramp.");
    return;
  }
  b.box(S.x0, 0, S.z0, S.x1, 3.0, S.z1, BRICK_DARK, { faces: 'NESW' });
  pitched(k, S.x0, S.z0, S.x1, S.z1, 3.0, 1.0, 0.3, SLATE, 0x2c2a28, BRICK_DARK, null);
  b.box(S.x1, 0, S.z0 + 0.5, S.x1 + 0.05, 2.1, S.z0 + 1.3, DARK);
  b.box(S.x1, 1.0, S.z0 + 1.6, S.x1 + 0.04, 2.0, S.z1 - 0.3, 0x3a3226, { faces: 'E', win: interior(1.6) });
  hang(k, 'tricorner-chandler', S.x1 + 0.05, 2.55, (S.z0 + S.z1) / 2, 1, 0, 0.42, 2.3);
  k.glows.push({ x: S.x1 + 0.35, y: 2.2, z: S.z0 + 0.9, sx: 0.25, sy: 0.25, sz: 0.25, color: AMBER });
  k.lights.push({ x: S.x1 + 1.5, z: (S.z0 + S.z1) / 2 + 1, r: 8, color: AMBER, k: 0.45 });
  // a great anchor stood up by the door as its sign
  const ax = S.x1 + 0.7, az = S.z0 - 0.5;
  if (open(ax, az, 0.3)) {
    b.beam([ax, 0, az], [ax, 2.4, az], 0.11, 0.09, IRON);
    for (const s of [-1, 1]) b.beam([ax, 0.15, az], [ax + s * 0.75, 0.75, az], 0.09, 0.07, IRON);
    b.beam([ax - 0.7, 2.1, az], [ax + 0.7, 2.1, az], 0.07, 0.07, TIMBER_DARK);
  }
  // coils of rope, a pile of anchors, and barrels, wherever the ground is open
  const stuff: [number, number, (x: number, z: number) => void][] = [
    [32.1, 79.2, (x, z) => { coil(k, x, z, 0.5); coil(k, x, z, 0.42, 0.32); }],
    [33.2, 79.6, (x, z) => coil(k, x, z, 0.45)],
    [32.4, 80.5, (x, z) => coil(k, x, z, 0.4)],
    [28.8, 82.4, (x, z) => anchor(k, x, z, 0.4, 0.8)],
    [29.4, 83.3, (x, z) => anchor(k, x, z, -0.3, 0.65)],
    [30.6, 82.2, (x, z) => barrel(k, x, z)],
    [31.4, 82.0, (x, z) => barrel(k, x, z)],
    [31.0, 82.8, (x, z) => barrel(k, x, z, 0, TIMBER_DARK)],
    [28.4, 77.9, (x, z) => barrel(k, x, z)],
  ];
  for (const [x, z, put] of stuff) if (open(x, z, 0.35)) put(x, z);
  stand(k, 32.6, 81.6);
}

// ---------------------------------------------------------------------------
// What the show needs, as built
// ---------------------------------------------------------------------------

const place = (p: P2, y: number, h: number): Place => ({ x: p[0], y, z: p[1], h });

export const PLACES: Record<string, Place> = {
  marketDoor: { x: ML.x0 + 1.5, y: 0, z: ML.z1 + 0.6, h: Math.PI / 2 },
  fishStall: { x: ML.x1 - 2.1, y: 0.04, z: (ML.z0 + ML.z1) / 2, h: 0 },
  jettyFoot: { x: harbourQuay(JETTY_Z) - 1.9, y: 0, z: JETTY_Z, h: 0 },
  jettyEnd: { x: JETTY.x1 - 0.6, y: JETTY.y, z: JETTY_Z, h: 0 },
  yardGate: { x: YARD.gate.x + 0.3, y: 0, z: YARD.gate.z, h: 0 },
  slipHead: place(Q(YARD.hull.t, YARD.hull.bow + 0.8), 0.04, TO_WATER),
  hullDeck: place(Q(YARD.hull.t - 0.6, 3.0), YARD.hull.deck, TO_WATER),
  craneTop: place(Q(YARD.hammer.t + 1.7, YARD.hammer.v + 0.5), CAB_ROOF + 0.1, YAW),
  gasholderTop: place(YARD.gas, GAS_TOP, Math.PI / 4),
  light: { x: YARD.light[0] + 1.3 * Math.SQRT1_2, y: LIGHT_GALLERY, z: YARD.light[1] + 1.3 * Math.SQRT1_2, h: Math.PI / 4 },
  casinoLanding: place(Q(CASINO_T, 1.0), 0.045, TO_WATER),
};

// ---------------------------------------------------------------------------
// The exports
// ---------------------------------------------------------------------------

/** A model for each lot this file builds, by the lot's id. */
export const MODELS: Record<string, Model> = {
  'fish-market': fishMarket,
  yards,
};

/** Lots that are built as part of another lot's model or by `extras`, and so get no box either. */
export const COVERS: string[] = [];

/** Whatever is not one of the plan's lots: the quay, the jetty, the casino's landing, the chandler's yard. */
export function extras(k: Build): void {
  quay(k);
  jetty(k);
  casinoLanding(k);
  chandler(k);
}
