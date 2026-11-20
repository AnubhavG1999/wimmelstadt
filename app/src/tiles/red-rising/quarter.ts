// The centre and the lowColor quarter: the blocks east of the river, the shield park with its four pylons, the low dense blocks of the lowColors, the market, and the noise bubbles over a few blocks.
//
// From the books, as the research note gives them (docs/districts/research/
// red-rising.md, section 2, items 5, 12, 13 and 15; story 5 of section 4; and
// section 6, "Care"):
//
// - Agea is a city of twenty million (GS 39), where life is fast and cheap (RR 16);
// - farther south than the commercial district lie the lowColor districts (GS 41);
// - noise bubbles keep each block's sound in (RR 16);
// - the shield over the city has its generators in a park on the far side of
//   the city from Darrow's way in, and when Virginia blows them it shatters as
//   its nexuses overload one by one (GS 41);
// - the crowds are of every Color, known by their hair: Golds tall, Obsidians
//   the largest, Reds small, Grays in uniform, Blues bald (RR 12; DA 1).
//
// The books give none of their looks. Everything here is this tile's own
// drawing: the centre's blocks, the hospital, the hotel and the office tower;
// the park, its four white pylons with a nexus glowing blue in the cradle at
// each crown, and the low station between them; the quarter's tenements, with
// shops under awnings, balconies, washing, rooftop gardens and water tanks;
// its alleys strung with lanterns, its square and yards, the market under its
// awnings; and the shimmer of the noise bubbles.
//
// Care. The quarter is drawn as a lively place where every Color lives and
// works, side by side: no path is for one Color, and nothing is lettered
// "lowColor". A shop's sign says what is sold there, in plain capitals, and
// never whose shop it is.
//
// Heights count from the city's floor, F, so that the rows of windows and the
// shopfronts under them begin at the floor: every house is built inside
// `floored`, and whatever is not a shape (a sign, a glow, a person, a tree)
// is given F + its height. Every place and size comes from plan.ts.

import * as THREE from 'three';
import { GeoBuilder, interior, rng, type BoxOpts, type V3, type WinSpec } from '../../engine/geo';
import { area, flat, oval, rect, type P2 } from '../../engine/ground';
import { wheel } from '../../engine/parts';
import { Smoke } from '../../engine/effects';
import { slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { inWater } from './land';
import { COLD, GOLD, MARBLE, STEEL, STONE, STONE_DARK, TO_VIEW, WARM, nameBoard, nameSign } from './look';
import type { Model } from './models';
import { F, HERO_SPOTS, LOTS, lotOf, type Lot } from './plan';
import { ROAD_HALF, onStage, toRoad } from './space';

// ---------------------------------------------------------------------------
// Colours and windows
// ---------------------------------------------------------------------------

/** The quarter's plaster: warm, worn, and in many colours. */
const PLASTERS = [0xe6bf92, 0xd98f6a, 0xe3b268, 0xc97c6c, 0xe2a89e, 0x9fbf98, 0x8fb3c4, 0xe8d4a4, 0xc4a0c4, 0xd4ae66, 0xb6c89c, 0xe4c2ac, 0xa9b9c9, 0xd8895a];
/** Roofs: tarred, tiled, and leaded. */
const ROOFS = [0x8a8276, 0x9a6a52, 0x6e675d, 0x7d8a86];
/** The Colors' own colours, for awnings, shutters and cloth: red, gold, pink, green, blue, brown, orange, violet, gray, copper, yellow, silver. */
const HUES = [0xb83a2b, 0xd9a63a, 0xe58fb0, 0x4f8f5a, 0x3f6fae, 0x7a5236, 0xe07b33, 0x7c55a8, 0x8b9096, 0xb5703f, 0xe3c94b, 0xc4ccd4];
const TRIM = 0xefe7d6, CAPS = [0x8f8577, 0x9c8f7c, 0x7f786e, 0xa59a88], ROOF = 0x8a8276, BOARD = 0x1b1b23, RAIL = 0xe4e7ea;
const TANK = 0xb4bcc2, TANK_LEGS = 0x8e969c, DOOR = 0x4a3426, PLANTER = 0x8a6a4c, LEAF = 0x5f9a4a, CRATE = 0xb08a58, CRATE_DARK = 0x8a6a42;
const SOLAR = 0x2f4a78, AERIAL = 0xd5dadf, ACUNIT = 0xd9dcdf;
/** The park: its lawn, its gravel, its stone, and the white of the pylons. */
const LAWN = 0x72a356, GRAVEL = 0xdcd2bd, PLAZA = 0xe8e2d4, INLAY = 0xc9a45a, HEDGE = 0x557f45, BED = 0x6b4f37;
const CERAMIC = 0xeef1f5, CERAMIC_SHADE = 0xd5dde6, PYLON_RAIL = 0xa9bed3, COLLAR = 0x5f6973, INSULATOR = 0xcfe3f4, CUP = 0xc5cfda, PRONG = 0xbac6d2;
const NEXUS = '#58aaff';
/** Paving in the quarter: older, warmer and more worn than the centre's. */
const COBBLE = 0xb9a58a, COBBLE_DARK = 0xa8957c, PUDDLE = 0x5b6670, WALK = 0xcbbca4;
const SKINS = [0xe8c4a0, 0xd9a983, 0xc08a62, 0x8f5f40, 0xf0d2b4, 0xb07a55];
const CLOTHES = [0x8a6d4a, 0x5d6b7a, 0xa4523a, 0x6f7f4f, 0xc9b28a, 0x4e5966, 0x9a7d5c, 0x7d4b5c, 0x3f5f6f, 0xb98a4a, 0x6a5a7a, 0xd0c4a8];

/** A storey of the quarter's houses, counted from the floor. */
const ST = 3.2;
/** The quarter's walls: a shopfront along the ground storey and small windows above. */
const QWIN: WinSpec = { cell: 1.7, storey: ST, lit: 0.95, kind: 2 };
/** Flats over flats, with no shop under them. */
const FWIN: WinSpec = { cell: 1.6, storey: ST, lit: 0.9, kind: 0 };
/** The centre's offices over shops, in storeys of 4. */
const SHOP4: WinSpec = { cell: 1.7, storey: 4, lit: 0.85, kind: 3 };
/** The office tower's glass, in storeys of 4. */
const CURTAIN: WinSpec = { cell: 1.3, storey: 4, lit: 0.8, kind: 1 };
/** The hospital's windows, which are lit at every hour. */
const WARD: WinSpec = { cell: 1.5, storey: 3.6, lit: 1.0, kind: 0 };
/** The tall windows of an old stone building. */
const TALL: WinSpec = { cell: 1.4, storey: 4, lit: 0.75, kind: 6 };
/** The station's slits, which glow blue-white by night. */
const SLITS: WinSpec = { cell: 1.1, storey: 3.3, lit: 0.95, kind: 6 };

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------
//
// What each shop sells, in plain capitals: neon for the night, painted boards
// for the market's stalls, lit boxes for the hospital and the stop. Each is
// small on the sheet, and most are hung in more than one place.

const neon = (id: string, text: string, color: string): SignDef => {
  const w = Math.round(15.5 * text.length + 40);
  return { id, lines: [text], color, aspect: w / 48, size: [w, 48] };
};
const upright = (id: string, text: string, color: string): SignDef => {
  const h = 26 + 40 * text.length;
  return { id, lines: [text], color, vertical: true, aspect: 70 / h, size: [70, h] };
};
const painted = (id: string, text: string, color: string, ink: string): SignDef => {
  const w = Math.round(17 * text.length + 36);
  return { id, lines: [text], color, ink, kind: 'board', aspect: w / 48, size: [w, 48] };
};
const lit = (id: string, text: string, color: string, ink: string): SignDef => {
  const w = Math.round(17 * text.length + 34);
  return { id, lines: [text], color, ink, kind: 'box', aspect: w / 48, size: [w, 48] };
};

const SG = {
  noodles: 'quarter-noodles', dumplings: 'quarter-dumplings', tea: 'quarter-tea', baths: 'quarter-baths', repairs: 'quarter-repairs',
  clinic: 'quarter-clinic', laundry: 'quarter-laundry', boots: 'quarter-boots', soup: 'quarter-soup', rooms: 'quarter-rooms',
  beer: 'quarter-beer', coffee: 'quarter-coffee', barber: 'quarter-barber', parts: 'quarter-parts', cafe: 'quarter-cafe',
  fruit: 'quarter-fruit', fish: 'quarter-fish', cloth: 'quarter-cloth', spices: 'quarter-spices', bread: 'quarter-bread', tools: 'quarter-tools',
  vNoodles: 'quarter-v-noodles', vRooms: 'quarter-v-rooms', vTea: 'quarter-v-tea', vBaths: 'quarter-v-baths', hotel: 'quarter-hotel',
  hospital: 'quarter-hospital', stop: 'quarter-stop', news: 'quarter-news',
  park: 'quarter-shield-park', market: 'quarter-market',
};

/** Every sign this file hangs. Each id begins with this file's name and a hyphen. */
export const SIGNS: SignDef[] = [
  neon(SG.noodles, 'NOODLES', '#ff4f8b'),
  neon(SG.dumplings, 'DUMPLINGS', '#ff7a5c'),
  neon(SG.tea, 'TEA', '#57e3ff'),
  neon(SG.baths, 'BATHS', '#8fc4ff'),
  neon(SG.repairs, 'REPAIRS', '#ffb347'),
  neon(SG.clinic, 'CLINIC', '#6dffc0'),
  neon(SG.laundry, 'LAUNDRY', '#9be8ff'),
  neon(SG.boots, 'BOOTS', '#c48bff'),
  neon(SG.soup, 'HOT SOUP', '#ff9a4d'),
  neon(SG.rooms, 'ROOMS', '#ff5ec4'),
  neon(SG.beer, 'BEER', '#ffc64d'),
  neon(SG.coffee, 'COFFEE', '#ffb36b'),
  neon(SG.barber, 'BARBER', '#7ad7ff'),
  neon(SG.parts, 'PARTS', '#9dff7a'),
  neon(SG.cafe, 'CAFE', '#ffd27a'),
  painted(SG.fruit, 'FRUIT', '#e9d8b4', '#7a2e1a'),
  painted(SG.fish, 'FISH', '#cfe3ea', '#1d4a6a'),
  painted(SG.cloth, 'CLOTH', '#f0d9e2', '#6a2a4a'),
  painted(SG.spices, 'SPICES', '#f2cf8a', '#7a3a12'),
  painted(SG.bread, 'BREAD', '#f3e3c0', '#6a4422'),
  painted(SG.tools, 'TOOLS', '#d6dccf', '#2f3a2a'),
  upright(SG.vNoodles, 'NOODLES', '#ff4f8b'),
  upright(SG.vRooms, 'ROOMS', '#ff5ec4'),
  upright(SG.vTea, 'TEA', '#57e3ff'),
  upright(SG.vBaths, 'BATHS', '#8fc4ff'),
  upright(SG.hotel, 'HOTEL', '#ffd27a'),
  lit(SG.hospital, 'HOSPITAL', '#ffffff', '#1d5c7a'),
  lit(SG.stop, 'STOP', '#f2f4f6', '#1f4f8a'),
  lit(SG.news, 'NEWS', '#fff4d6', '#3a2a1a'),
  nameSign(SG.park, 'Shield Park'),
  nameSign(SG.market, 'Market'),
];

// ---------------------------------------------------------------------------
// Small sums
// ---------------------------------------------------------------------------

type Face = 'N' | 'E' | 'S' | 'W';
interface Box4 { x0: number; z0: number; x1: number; z1: number }
/** One side of a box: where it starts, the way along it to the right of someone facing it, the way out of it, and its length. */
interface Side { x: number; z: number; tx: number; tz: number; nx: number; nz: number; L: number; f: Face }

const OPPOSITE: Record<Face, Face> = { N: 'S', S: 'N', E: 'W', W: 'E' };

/** A side of a box, run the way the builder's wall coordinates run along it, so that windows can be found on it. */
function side(r: Box4, f: Face): Side {
  switch (f) {
    case 'S': return { x: r.x0, z: r.z1, tx: 1, tz: 0, nx: 0, nz: 1, L: r.x1 - r.x0, f };
    case 'N': return { x: r.x1, z: r.z0, tx: -1, tz: 0, nx: 0, nz: -1, L: r.x1 - r.x0, f };
    case 'E': return { x: r.x1, z: r.z1, tx: 0, tz: -1, nx: 1, nz: 0, L: r.z1 - r.z0, f };
    default: return { x: r.x0, z: r.z0, tx: 0, tz: 1, nx: -1, nz: 0, L: r.z1 - r.z0, f };
  }
}

/** A place `u` along a side and `d` out from it. */
const at = (s: Side, u: number, d: number): P2 => [s.x + s.tx * u + s.nx * d, s.z + s.tz * u + s.nz * d];

/** A box against a side: `u0` to `u1` along it, `d0` to `d1` out from it, `y0` to `y1` high. */
function onSide(b: GeoBuilder, s: Side, u0: number, u1: number, d0: number, d1: number, y0: number, y1: number, color: number, o: BoxOpts = {}): void {
  const [ax, az] = at(s, u0, d0), [cx, cz] = at(s, u1, d1);
  b.box(Math.min(ax, cx), y0, Math.min(az, cz), Math.max(ax, cx), y1, Math.max(az, cz), color, o);
}

/** The faces of a box set against a side, without the one that touches it, and with `extra`. */
const against = (s: Side, extra = ''): string => 'NESWT'.replace(OPPOSITE[s.f], '') + extra;

/** Where the windows of a side are, by the middle of each bay, as the city's material lays them out. */
function bays(s: Side, cell: number): number[] {
  const n = Math.max(1, Math.round(s.L / cell));
  return Array.from({ length: n }, (_, i) => ((i + 0.5) * s.L) / n);
}

/** Everything `fn` builds, with its heights over the city's floor: rows of windows and shopfronts count from the floor. */
const floored = (k: Build, fn: () => void): void => k.b.moved(0, F, 0, 0, fn);

/** How far a place is from a straight stretch between two others. */
function toSegment(x: number, z: number, a: P2, c: P2): number {
  const vx = c[0] - a[0], vz = c[1] - a[1], l = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l));
  return Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t);
}

/** A band `half` wide to either side of a straight stretch, as a shape. */
function band2(a: P2, c: P2, half: number): P2[] {
  const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, px = (-(c[1] - a[1]) / l) * half, pz = ((c[0] - a[0]) / l) * half;
  return [[a[0] + px, a[1] + pz], [c[0] + px, c[1] + pz], [c[0] - px, c[1] - pz], [a[0] - px, a[1] - pz]];
}

/** What the street material is told about a patch of plain paving. */
const PAVED: WinSpec = { cell: 0, storey: 1, lit: 0, kind: 1 };

/** Whether a place is inside a lot that is not one of this file's, or within `room` of it. */
const othersLot = (x: number, z: number, room: number): boolean =>
  LOTS.some((l) => !MINE.has(l.id) && x > l.x0 - room && x < l.x1 + room && z > l.z0 - room && z < l.z1 + room);

/** Whether a place on the ground between lots is clear of roads, water, stages and other files' lots: for whatever this file puts down there. */
const clear = (x: number, z: number, room = 0.6): boolean =>
  toRoad(x, z) >= ROAD_HALF + room && !inWater(x, z, room) && !onStage(x, z, room) && !othersLot(x, z, room);

// ---------------------------------------------------------------------------
// People of every Color
// ---------------------------------------------------------------------------

/**
 * The Colors, as the city's people are known by them (RR 12; DA 1; research
 * note, section 6): by the colour of their hair, Golds tall, Obsidians the
 * largest, Reds small, Grays in uniform and Blues bald. Their work clothes are
 * the tile's own.
 */
const COLORS: { hair: number; s: number; bald?: boolean; coat?: number; legs?: number }[] = [
  { hair: 0xc8452b, s: 0.86 },
  { hair: 0xc8452b, s: 0.84 },
  { hair: 0x6b4426, s: 0.95 },
  { hair: 0x3f8a4c, s: 1.0 },
  { hair: 0xf09cc4, s: 0.98 },
  { hair: 0x5b6067, s: 1.0, coat: 0x7d838b, legs: 0x4b5057 },
  { hair: 0xe8c4a0, s: 1.0, bald: true, coat: 0x3f6fae },
  { hair: 0xe5832f, s: 0.97 },
  { hair: 0xe6cf4a, s: 0.97 },
  { hair: 0x8a58c2, s: 1.0 },
  { hair: 0xb46f3a, s: 0.97 },
  { hair: 0xcfd4da, s: 1.0 },
  { hair: 0xe2b53e, s: 1.14 },
  { hair: 0x2a2a2e, s: 1.3, coat: 0x34353b },
];

/** A person of one of the Colors, standing at `y` and facing `yaw`. */
function folk(b: GeoBuilder, x: number, z: number, y: number, r: () => number, which = Math.floor(r() * COLORS.length)): void {
  const c = COLORS[which % COLORS.length], s = c.s, skin = SKINS[Math.floor(r() * SKINS.length)];
  const coat = c.coat ?? CLOTHES[Math.floor(r() * CLOTHES.length)], legs = c.legs ?? CLOTHES[Math.floor(r() * CLOTHES.length)];
  b.moved(x, y, z, r() * Math.PI, () => {
    b.box(-0.3 * s, 0, -0.2 * s, 0.3 * s, 0.85 * s, 0.2 * s, legs, { faces: 'NESW' });
    b.box(-0.38 * s, 0.85 * s, -0.24 * s, 0.38 * s, 1.9 * s, 0.24 * s, coat);
    b.box(-0.24 * s, 1.9 * s, -0.24 * s, 0.24 * s, 2.3 * s, 0.24 * s, skin, { faces: c.bald ? 'NESWT' : 'NESW' });
    if (!c.bald) b.box(-0.27 * s, 2.2 * s, -0.27 * s, 0.27 * s, 2.36 * s, 0.27 * s, c.hair);
  });
}

// ---------------------------------------------------------------------------
// Parts of the quarter's houses
// ---------------------------------------------------------------------------

/** An awning over a shopfront on a side, from `u0` to `u1`: a slab sloping out from the wall, with a valance along its edge and a strip of light under it. */
function awning(k: Build, s: Side, u0: number, u1: number, depth: number, color: number, valance: number, light: string | null, y = 3.0): void {
  const b = k.b, um = (u0 + u1) / 2, drop = 0.42;
  const [ax, az] = at(s, um, 0.02), [cx, cz] = at(s, um, depth);
  slab(b, [ax, y, az], [cx, y - drop, cz], (u1 - u0) / 2, 0.07, color, { under: shade(color, 0.72) });
  // the valance: its front, its back and its hem; its ends are too small to see
  onSide(b, s, u0, u1, depth - 0.05, depth + 0.02, y - drop - 0.3, y - drop - 0.02, valance, { faces: (Math.abs(s.tx) > 0 ? 'NS' : 'EW') + 'B' });
  if (light) {
    const [gx, gz] = at(s, um, depth - 0.25);
    const along = Math.abs(s.tx) > 0;
    k.glows.push({ x: gx, y: F + y - drop - 0.12, z: gz, sx: along ? (u1 - u0) * 0.8 : 0.08, sy: 0.05, sz: along ? 0.08 : (u1 - u0) * 0.8, color: light });
  }
}

/** A colour made darker (k under 1) or lighter. */
function shade(color: number, k: number): number {
  const c = new THREE.Color(color);
  if (k <= 1) c.multiplyScalar(k);
  else c.lerp(new THREE.Color(0xffffff), k - 1);
  return c.getHex();
}

/**
 * A sign on a dark board flat against a side, its middle `u` along it at
 * height `y`, `h` tall and no wider than `maxW`. A board that hangs free, with
 * no wall behind it, is closed at the back. Returns how wide it is.
 */
function boardSign(k: Build, s: Side, id: string, u: number, y: number, h: number, maxW: number, free = false): number {
  const r = k.signs.atlas.rects.get(id);
  if (!r) return 0;
  let w = h * r.aspect;
  if (w > maxW) { w = maxW; h = w / r.aspect; }
  onSide(k.b, s, u - w / 2 - 0.1, u + w / 2 + 0.1, 0, 0.1, y - h / 2 - 0.08, y + h / 2 + 0.08, BOARD, { faces: free ? 'NESWTB' : against(s, 'B') });
  const [x, z] = at(s, u, 0.13);
  k.sign(id, x, F + y, z, s.nx, s.nz, h, w);
  return w;
}

/**
 * A sign hung out from a side, square to it, to be read from both ways along
 * the lane: two signs back to back on a thin dark board, on two short arms.
 * `u` is where along the side it hangs, `y` its middle and `h` its height.
 */
function bladeSign(k: Build, s: Side, id: string, u: number, y: number, h: number): void {
  const r = k.signs.atlas.rects.get(id);
  if (!r) return;
  const w = h * r.aspect, d0 = 0.35, d1 = d0 + w;
  // the board, square to the side
  const [ax, az] = at(s, u - 0.07, d0 - 0.08), [cx, cz] = at(s, u + 0.07, d1 + 0.08);
  k.b.box(Math.min(ax, cx), y - h / 2 - 0.08, Math.min(az, cz), Math.max(ax, cx), y + h / 2 + 0.08, Math.max(az, cz), BOARD, { faces: 'NESWTB' });
  // its arms
  for (const yy of [y + h / 2 - 0.25, y - h / 2 + 0.25]) onSide(k.b, s, u - 0.05, u + 0.05, 0, d0 - 0.08, yy - 0.05, yy + 0.05, 0x6a6f76, { faces: against(s, 'B') });
  const [mx, mz] = at(s, u, (d0 + d1) / 2);
  // each face looks along the side, one way and the other
  k.sign(id, mx + s.tx * 0.1, F + y, mz + s.tz * 0.1, s.tx, s.tz, h);
  k.sign(id, mx - s.tx * 0.1, F + y, mz - s.tz * 0.1, -s.tx, -s.tz, h);
  const [lx, lz] = at(s, u, d1 + 1.2);
  k.lights.push({ x: lx, z: lz, r: 6, color: r.color, k: 0.35 });
}

/** A balcony on a side, `u` along it, at the floor of a storey `y` high: a slab with a rail, and now and then washing on the rail. */
function balcony(k: Build, s: Side, u: number, y: number, w: number, r: () => number, wall: number): void {
  const b = k.b, d = 0.75;
  onSide(b, s, u - w / 2, u + w / 2, 0, d, y - 0.14, y + 0.02, shade(wall, 0.85), { faces: against(s, 'B') });
  onSide(b, s, u - w / 2, u + w / 2, d - 0.07, d, y + 0.02, y + 0.82, RAIL, { faces: 'NESWT' });
  if (r() < 0.55) {
    // washing over the rail, in the Colors' colours
    for (let i = 0; i < 2 + Math.floor(r() * 2); i++) {
      const cu = u - w / 2 + 0.3 + i * 0.42 + r() * 0.08;
      if (cu > u + w / 2 - 0.25) break;
      cloth(b, s, cu, d + 0.03, y + 0.25 + r() * 0.15, y + 0.84, HUES[Math.floor(r() * HUES.length)]);
    }
  }
  if (r() < 0.3) k.person(...at(s, u + (r() - 0.5) * (w - 0.8), d * 0.45), F + y + 0.02);
}

/** A cloth hung flat against a side, `d` out from it: two faces back to back, 0.34 wide. */
function cloth(b: GeoBuilder, s: Side, u: number, d: number, y0: number, y1: number, color: number): void {
  const [ax, az] = at(s, u - 0.17, d), [cx, cz] = at(s, u + 0.17, d);
  b.quad([ax, y0, az], [cx, y0, cz], [cx, y1, cz], [ax, y1, az], [s.nx, 0, s.nz], color);
  b.quad([cx, y0, cz], [ax, y0, az], [ax, y1, az], [cx, y1, cz], [-s.nx, 0, -s.nz], shade(color, 0.85));
}

/** A cooling unit on a wall, under a window. */
function acUnit(b: GeoBuilder, s: Side, u: number, y: number): void {
  onSide(b, s, u - 0.32, u + 0.32, 0, 0.36, y, y + 0.42, ACUNIT, { faces: against(s, 'B') });
}

/** A water tank on a stand, standing on a roof at `y`: about 1.2 high. */
function tank(b: GeoBuilder, x: number, z: number, y: number, rad: number): void {
  b.box(x - rad * 0.75, y, z - rad * 0.75, x + rad * 0.75, y + 0.3, z + rad * 0.75, TANK_LEGS);
  b.cyl(x, z, y + 0.3, y + 1.15, rad, rad, 8, TANK, { cap: shade(TANK, 0.86) });
  b.cyl(x, z, y + 1.15, y + 1.22, rad * 0.35, rad * 0.25, 6, TANK_LEGS);
}

/** A roof of planters, with a few small trees in them where there is height for them. */
function garden(k: Build, x0: number, z0: number, x1: number, z1: number, y: number, room: number, r: () => number): void {
  const b = k.b;
  b.box(x0, y, z0, x1, y + 0.35, z0 + 0.45, PLANTER, { top: LEAF });
  b.box(x0, y, z1 - 0.45, x1, y + 0.35, z1, PLANTER, { top: LEAF });
  if (z1 - z0 > 2) b.box(x0, y, (z0 + z1) / 2 - 0.3, x0 + 0.5, y + 0.35, (z0 + z1) / 2 + 0.3, PLANTER, { top: 0xd86a8a });
  const s = Math.min(0.32, (room - 0.4) / 7.4);
  if (s >= 0.18) {
    k.tree(x0 + 0.5 + r() * 0.3, z0 + 0.25, s, false, F + y + 0.35);
    if (x1 - x0 > 2.6) k.tree(x1 - 0.6, z1 - 0.25, s * 0.9, false, F + y + 0.35);
  }
}

/** A thin mast on a roof: an aerial, with a crossbar. Painted pale, since thin bars come out dark. */
function aerial(b: GeoBuilder, x: number, z: number, y: number, h: number): void {
  b.beam([x, y, z], [x, y + h, z], 0.06, 0.04, AERIAL);
  b.box(x - 0.45, y + h * 0.72, z - 0.03, x + 0.45, y + h * 0.72 + 0.06, z + 0.03, AERIAL, { faces: 'NESWTB' });
}

/** A line of washing on two posts on a roof, the line running along x or z. */
function roofLine(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, r: () => number): void {
  for (const [x, z] of [[x0, z0], [x1, z1]]) b.box(x - 0.05, y, z - 0.05, x + 0.05, y + 1.05, z + 0.05, AERIAL, { faces: 'NESW' });
  b.beam([x0, y + 1.0, z0], [x1, y + 1.0, z1], 0.025, 0.025, AERIAL);
  const n = Math.floor(Math.hypot(x1 - x0, z1 - z0) / 0.55);
  // a side that runs along the line, for its cloths
  const s: Side = Math.abs(x1 - x0) > Math.abs(z1 - z0) ? { x: x0, z: z0, tx: 1, tz: 0, nx: 0, nz: 1, L: x1 - x0, f: 'S' } : { x: x0, z: z0, tx: 0, tz: 1, nx: 1, nz: 0, L: z1 - z0, f: 'E' };
  for (let i = 1; i < n; i++) {
    if (r() < 0.25) continue;
    cloth(b, s, (i / n) * s.L, 0, y + 0.62 - r() * 0.25, y + 0.98, HUES[Math.floor(r() * HUES.length)]);
  }
}

/** A tilted panel of cells on a roof, facing south. */
function solar(b: GeoBuilder, x: number, z: number, y: number, w: number): void {
  slab(b, [x, y + 0.75, z - 0.35], [x, y + 0.25, z + 0.35], w / 2, 0.05, SOLAR, { under: 0x5a5f66 });
  b.box(x - 0.05, y, z - 0.3, x + 0.05, y + 0.72, z - 0.2, TANK_LEGS, { faces: 'NESW' });
}

// ---------------------------------------------------------------------------
// The quarter's houses
// ---------------------------------------------------------------------------

/** A plot of a block: its corners, the faces of it that are on a lane, and the faces it shares with a neighbour. */
interface Plot extends Box4 { lanes: string; shared: string }

/**
 * Cuts a block into houses: one row along its longer side, or two back to
 * back where it is deep, each row cut into houses of about `w` along it.
 * The faces on the block's edge are lanes.
 */
function plots(l: Box4, r: () => number, w = 4.4): Plot[] {
  const W = l.x1 - l.x0, D = l.z1 - l.z0, alongX = W >= D;
  const len = alongX ? W : D, deep = alongX ? D : W;
  const rowsN = deep >= 11 ? 2 : 1;
  const out: Plot[] = [];
  for (let ri = 0; ri < rowsN; ri++) {
    const a0 = (deep * ri) / rowsN, a1 = (deep * (ri + 1)) / rowsN;
    const n = Math.max(2, Math.round(len / w));
    const cuts = [0];
    for (let i = 1; i < n; i++) cuts.push((len * i) / n + (r() - 0.5) * 0.8);
    cuts.push(len);
    for (let i = 0; i < n; i++) {
      const p0 = cuts[i], p1 = cuts[i + 1];
      const box: Box4 = alongX ? { x0: l.x0 + p0, x1: l.x0 + p1, z0: l.z0 + a0, z1: l.z0 + a1 } : { x0: l.x0 + a0, x1: l.x0 + a1, z0: l.z0 + p0, z1: l.z0 + p1 };
      let lanes = '', shared = '';
      const edge = (f: Face, on: boolean): void => { if (on) lanes += f; else shared += f; };
      if (alongX) {
        edge('W', i === 0); edge('E', i === n - 1); edge('N', ri === 0); edge('S', ri === rowsN - 1);
      } else {
        edge('N', i === 0); edge('S', i === n - 1); edge('W', ri === 0); edge('E', ri === rowsN - 1);
      }
      out.push({ ...box, lanes, shared });
    }
  }
  return out;
}

/**
 * How much room there is before a side of a house, out to 3.2: less where a
 * road's verge, the water, another lot or another house is near. The lot the
 * house stands on does not count.
 */
function roomBefore(s: Side): { room: number; facing: boolean } {
  const [ix, iz] = at(s, s.L / 2, -0.15);
  const own = LOTS.filter((l) => ix > l.x0 && ix < l.x1 && iz > l.z0 && iz < l.z1);
  let d = 0;
  for (let t = 0.2; t <= 3.2 + 0.001; t += 0.2) {
    const pts = [at(s, s.L * 0.15, t), at(s, s.L * 0.5, t), at(s, s.L * 0.85, t)];
    if (pts.some(([x, z]) => toRoad(x, z) < ROAD_HALF || inWater(x, z))) return { room: d, facing: false };
    if (pts.some(([x, z]) => mineOther(x, z) || LOTS.some((l) => !own.includes(l) && x > l.x0 && x < l.x1 && z > l.z0 && z < l.z1))) return { room: d, facing: true };
    d = t;
  }
  return { room: d, facing: false };
}

/** How deep an awning may reach with `room` before it: as deep as it likes in the open, short of a road's verge, and less than half a lane where another house faces it. */
const awningDepth = (o: { room: number; facing: boolean }): number => (o.facing ? Math.min(1.1, o.room / 2 - 0.35) : Math.min(1.1, o.room - 0.15));

/** The shops whose flues steam: kitchens and baths. */
const STEAMY = new Set([SG.noodles, SG.soup, SG.dumplings, SG.baths]);
/** Where steam rises, gathered as the houses and stalls are built and set going by `extras`. */
const STEAM: V3[] = [];

/** The house being built, for `mineOther`. */
let BUILDING: Box4 | null = null;
/** Every house of this file built so far, so that one house's awning does not reach into another. */
const HOUSES: Box4[] = [];
/** Whether a place is inside another house of this file's. */
function mineOther(x: number, z: number): boolean {
  return HOUSES.some((h) => h !== BUILDING && x > h.x0 - 0.05 && x < h.x1 + 0.05 && z > h.z0 - 0.05 && z < h.z1 + 0.05);
}

interface HouseOpts {
  /** How high the lot lets it stand over the floor, roof clutter and all. */
  top: number;
  floors: number;
  /** How thick its cap is: neighbours differ, so that no two roofs lie in one plane. */
  cap: number;
  wall: number;
  win: WinSpec;
  seed: number;
  /** Signs it may hang, in order of preference. */
  signs: string[];
  /** Whether a sign is hung out from a corner. */
  blade?: string;
  /** Whether a big sign runs across its top storey. */
  big?: string;
  /** How its roof is used. */
  roof?: 'tanks' | 'garden' | 'plain';
  /** Whether its awnings are lit by night, and in what colour. */
  glow?: string;
}

/**
 * One house of the quarter: its walls with a shopfront along the ground and
 * windows above, a cap and a roof; an awning over the shop on each side that
 * is on a lane and has room for it, and a sign above the awning on the side
 * the view sees best; balconies, cooling units and washing on the upper
 * storeys; and on the roof water tanks, vents, aerials, a hut over the stair,
 * panels, washing lines or a garden, as high as the lot lets them stand.
 * Built in floor coordinates.
 */
function house(k: Build, p: Plot, o: HouseOpts, r: () => number): void {
  const b = k.b, wallTop = o.floors * o.win.storey, roofY = wallTop + o.cap;
  BUILDING = p;
  // the walls
  b.box(p.x0, 0, p.z0, p.x1, wallTop, p.z1, o.wall, { win: o.win, seed: o.seed });
  // the cap, proud of the walls on the lanes, flush where it meets a neighbour
  const out = (f: Face): number => (p.lanes.includes(f) ? 0.12 : 0);
  b.box(p.x0 - out('W'), wallTop, p.z0 - out('N'), p.x1 + out('E'), roofY, p.z1 + out('S'), CAPS[o.seed % CAPS.length], { faces: 'NESWTB', top: ROOFS[(o.seed * 7) % ROOFS.length] });
  // a string course between the shop and the storeys over it, on the sides the view sees
  if (o.floors >= 2 && o.win.kind === 2) {
    for (const f of p.lanes) {
      if (f !== 'S' && f !== 'E') continue;
      const s = side(p, f as Face);
      onSide(b, s, -0.04, s.L + 0.04, 0, 0.08, o.win.storey - 0.06, o.win.storey + 0.06, shade(o.wall, 1.25), { faces: against(s, 'B') });
    }
  }

  // the sides, best first: the view sees the south and the east
  const order: Face[] = (['S', 'E', 'W', 'N'] as Face[]).filter((f) => p.lanes.includes(f));
  let signed = 0;
  const hue = HUES[Math.floor(r() * HUES.length)], hue2 = r() < 0.5 ? TRIM : HUES[Math.floor(r() * HUES.length)];
  // a sign hung out from the corner of the best side, at its right-hand end
  const bladeH = Math.min(wallTop - 3.9, 3.2), bladeAt = order.length > 0 && o.blade && bladeH > 1.4 ? side(p, order[0]).L - 0.35 : -9;
  // a big sign across the top storey of the best side, as wide as it will go
  let bigW = 0;
  if (o.big && o.floors >= 2 && order.length > 0) {
    const s = side(p, order[0]), y = wallTop - 0.78;
    bigW = boardSign(k, s, o.big, (s.L - (bladeAt > 0 ? 0.9 : 0)) / 2, y, 1.0, s.L - (bladeAt > 0 ? 1.5 : 0.6));
    const [gx, gz] = at(s, s.L / 2, 2.0);
    k.lights.push({ x: gx, z: gz, r: 7, color: k.signs.atlas.rects.get(o.big)?.color ?? WARM, k: 0.4 });
  }
  for (const f of order) {
    const s = side(p, f);
    if (s.L < 2.2) continue;
    // a door in the middle of the shopfront, dark and lit from within at night
    if (o.win.kind === 2) {
      const [ax, az] = at(s, s.L / 2 - 0.45, 0.03), [cx, cz] = at(s, s.L / 2 + 0.45, 0.03);
      b.quad([ax, 0, az], [cx, 0, cz], [cx, 2.3, cz], [ax, 2.3, az], [s.nx, 0, s.nz], 0x3a2c22, { win: interior(1.6) });
    }
    const depth = awningDepth(roomBefore(s));
    let signW = 0;
    if (o.win.kind === 2 && depth >= 0.55) {
      awning(k, s, 0.25, s.L - 0.25, depth, hue, hue2, o.glow ?? (r() < 0.5 ? '#ffcf8a' : r() < 0.5 ? '#ff7ac0' : '#7ae8ff'));
      if (signed < 2 && o.signs.length > signed) {
        signW = boardSign(k, s, o.signs[signed], s.L / 2, 3.55, 0.62, s.L - 0.7);
        signed++;
      }
      const [lx, lz] = at(s, s.L / 2, 1.6);
      k.lights.push({ x: lx, z: lz, r: 5.5, color: WARM, k: 0.32 });
    }
    // balconies and cooling units on the storeys above the shop, clear of its sign and of the sign hung out at the corner
    const cols = bays(s, o.win.cell), bw = Math.min(1.5, (s.L / cols.length) * 0.85);
    for (let st = 1; st < o.floors; st++) {
      const y = st * o.win.storey;
      cols.forEach((u, i) => {
        const nearSign = st === 1 && signW > 0 && Math.abs(u - s.L / 2) < signW / 2 + bw / 2 + 0.2;
        const nearBlade = f === order[0] && Math.abs(u - bladeAt) < bw / 2 + 0.45;
        const underBig = f === order[0] && bigW > 0 && st === o.floors - 1;
        if (nearBlade || underBig) return;
        if (!nearSign && r() < 0.32 && (f === 'S' || f === 'E' || r() < 0.5)) balcony(k, s, u, y, bw, r, o.wall);
        else if (r() < 0.25 && i > 0 && !(st === 1 && signW > 0 && Math.abs((u + cols[i - 1]) / 2 - s.L / 2) < signW / 2 + 0.6)) acUnit(b, s, (u + cols[i - 1]) / 2, y + 0.35);
      });
    }
  }
  if (bladeAt > 0 && o.blade) bladeSign(k, side(p, order[0]), o.blade, bladeAt, 3.8 + bladeH / 2, bladeH);

  // the roof
  const room = o.top - roofY, cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2, w = p.x1 - p.x0, d = p.z1 - p.z0;
  const kind = o.roof ?? (room > 2.6 ? 'garden' : 'tanks');
  if (kind === 'garden' && room > 0.6) {
    garden(k, p.x0 + 0.25, p.z0 + 0.25, p.x1 - 0.25, p.z1 - 0.25, roofY, room, r);
    if (room > 2.8) k.person(cx + (r() - 0.5) * w * 0.3, cz + (r() - 0.5) * d * 0.3, F + roofY);
  } else if (kind === 'tanks') {
    // the tank keeps to the west, clear of a flue in the north-east corner
    if (room >= 1.25) tank(b, p.x0 + 0.9 + r() * Math.max(0, w - 3.0), p.z0 + 0.9 + r() * Math.max(0.1, d * 0.4 - 0.9), roofY, 0.5 + r() * 0.18);
    if (room >= 1.7 && r() < 0.6) {
      // a hut over the stair, with its door
      const hx = p.x1 - 1.5, hz = p.z1 - 1.6;
      b.box(hx, roofY, hz, hx + 1.2, roofY + 1.55, hz + 1.3, shade(o.wall, 0.92), { top: ROOF });
      b.box(hx + 0.35, roofY, hz + 1.3, hx + 0.85, roofY + 1.2, hz + 1.33, DOOR, { faces: 'SEW' });
    } else if (room >= 1.12 && r() < 0.7) {
      roofLine(b, p.x0 + 0.5, cz + 0.4, p.x1 - 0.5, cz + 0.4, roofY, r);
    }
    if (room >= 0.9 && r() < 0.5) solar(b, p.x0 + 1.1, p.z1 - 0.8, roofY, Math.min(1.6, w - 1.6));
  }
  // vents, and an aerial, but not on a roof that is a terrace
  if (kind !== 'plain') {
    for (let i = 0; i < 1 + Math.floor(r() * 2); i++) {
      const vx = p.x0 + 0.5 + r() * (w - 1.0), vz = p.z0 + 0.5 + r() * (d - 1.0);
      b.box(vx - 0.22, roofY, vz - 0.22, vx + 0.22, roofY + Math.min(0.5, room * 0.6), vz + 0.22, 0x9aa0a6);
    }
    if (r() < 0.45) aerial(b, p.x0 + 0.4, p.z0 + 0.4, roofY, Math.min(2.6, room + 2.2));
  }
  // a kitchen's or a bath's flue, steaming
  if (STEAMY.has(o.signs[0]) && room >= 0.9) {
    const fx = p.x1 - 0.6, fz = p.z0 + 0.6, fh = Math.min(1.1, room - 0.05);
    b.box(fx - 0.2, roofY, fz - 0.2, fx + 0.2, roofY + fh, fz + 0.2, 0x8e8478, { top: 0x2a2624 });
    STEAM.push([fx, F + roofY + fh, fz]);
  }
  HOUSES.push(p);
  BUILDING = null;
}

/**
 * A block of the quarter: its houses, each a height of its own under the
 * lot's top, with shops on every lane, and the signs given to it in turn.
 */
function block(k: Build, l: Lot, seed: number, o: { signs: string[]; blades: string[]; inset?: number; w?: number; roofs?: ('tanks' | 'garden' | 'plain')[] }): void {
  const r = rng(seed), top = l.top - F;
  // the block's ground, inside the lot and clear of the roads' verges
  const g: Box4 = { x0: l.x0 + 0.25, z0: l.z0 + 0.25, x1: l.x1 - 0.25, z1: l.z1 - 0.25 };
  const lots = (x: number, z: number): boolean => toRoad(x, z) < ROAD_HALF + 0.15;
  while (lots(g.x0, (g.z0 + g.z1) / 2) || lots(g.x0, g.z0 + 0.5) || lots(g.x0, g.z1 - 0.5)) g.x0 += 0.1;
  while (lots(g.x1, (g.z0 + g.z1) / 2) || lots(g.x1, g.z0 + 0.5) || lots(g.x1, g.z1 - 0.5)) g.x1 -= 0.1;
  while (lots((g.x0 + g.x1) / 2, g.z0) || lots(g.x0 + 0.5, g.z0) || lots(g.x1 - 0.5, g.z0)) g.z0 += 0.1;
  while (lots((g.x0 + g.x1) / 2, g.z1) || lots(g.x0 + 0.5, g.z1) || lots(g.x1 - 0.5, g.z1)) g.z1 -= 0.1;
  const ps = plots(g, r, o.w);
  const most = Math.floor((top - 1.25) / ST);
  let signIndex = 0, bladeIndex = 0, last = -1;
  floored(k, () => {
    ps.forEach((p, i) => {
      // most stand as high as the lot lets them; one in three a storey lower, never two neighbours alike
      let floors = r() < 0.32 ? most - 1 : most;
      if (floors === last && r() < 0.5) floors = floors === most ? most - 1 : most;
      floors = Math.max(1, floors);
      last = floors;
      const signs = [o.signs[signIndex % o.signs.length], o.signs[(signIndex + 1) % o.signs.length]];
      signIndex += 2;
      const blade = i % 3 === 1 && o.blades.length > 0 ? o.blades[bladeIndex++ % o.blades.length] : undefined;
      const big = i % 3 === 2 ? o.signs[(signIndex + 3) % o.signs.length] : undefined;
      house(k, p, {
        top, floors, cap: 0.25 + (i % 3) * 0.08, wall: PLASTERS[(seed + i * 5) % PLASTERS.length], win: floors === 1 || r() < 0.85 ? QWIN : FWIN,
        seed: seed + i, signs, blade, big, roof: o.roofs?.[i % o.roofs.length],
      }, r);
    });
  });
}

// ---------------------------------------------------------------------------
// The lowColor quarter's lots
// ---------------------------------------------------------------------------

const low1: Model = (k, l) => block(k, l, 101, { signs: [SG.noodles, SG.tea, SG.repairs, SG.bread, SG.laundry, SG.boots], blades: [SG.vNoodles], roofs: ['tanks', 'tanks', 'garden'] });
const low2: Model = (k, l) => block(k, l, 211, { signs: [SG.parts, SG.repairs, SG.tools, SG.soup], blades: [SG.vRooms], roofs: ['tanks', 'garden'] });
const low3: Model = (k, l) => block(k, l, 307, { signs: [SG.dumplings, SG.clinic, SG.rooms, SG.beer, SG.spices, SG.barber, SG.coffee, SG.noodles], blades: [SG.vTea, SG.vRooms], roofs: ['tanks', 'tanks', 'garden', 'tanks'] });
const low4: Model = (k, l) => block(k, l, 401, { signs: [SG.baths, SG.laundry, SG.soup, SG.tea, SG.beer], blades: [SG.vBaths], roofs: ['tanks', 'garden', 'tanks'] });
const low6: Model = (k, l) => block(k, l, 607, { signs: [SG.bread, SG.boots, SG.noodles, SG.clinic], blades: [SG.vNoodles], roofs: ['garden', 'tanks'] });

// ---------------------------------------------------------------------------
// The market
// ---------------------------------------------------------------------------

/** What a stall sells, by its sign, and the colours of its goods. */
const STALLS: { sign: string; goods: number[]; heaps?: boolean }[] = [
  { sign: SG.fruit, goods: [0xd8432b, 0xf0a030, 0x7fbf3f, 0xf2d03a, 0xc23a6a] },
  { sign: SG.spices, goods: [0xc8622a, 0xe0b030, 0x9a3a22, 0x6a7a2a, 0xd88a3a], heaps: true },
  { sign: SG.fish, goods: [0xb8c8d0, 0x9fb0b8, 0xd0dde2, 0x8a9aa2] },
  { sign: SG.cloth, goods: [0x7c55a8, 0xe58fb0, 0x3f6fae, 0xd9a63a, 0xb83a2b, 0x4f8f5a] },
  { sign: SG.bread, goods: [0xd9a05a, 0xc8883e, 0xe8c07a, 0xb87838] },
  { sign: SG.tea, goods: [0x5f8a4a, 0x8a6a3a, 0xc8b07a, 0x4a6a3a] },
  { sign: SG.noodles, goods: [0xf2e2b8, 0xe8d090, 0xd8432b] },
  { sign: SG.tools, goods: [0x8e969c, 0x6a7076, 0xb5703f, 0x4a4d52] },
  { sign: SG.soup, goods: [0xb5703f, 0x8e969c, 0xd8a03a] },
  { sign: SG.spices, goods: [0xe07b33, 0xb83a2b, 0xd9a63a, 0x7a5236], heaps: true },
];

/**
 * The market: two rows of stalls under striped awnings either side of an
 * aisle that runs its length, each stall with a counter of goods, a back
 * shelf, a painted board saying what it sells, and a lamp under its awning; a
 * string of lanterns down the aisle; and the crowd, of every Color.
 */
const market: Model = (k, l) => {
  const r = rng(5501), b = k.b, top = l.top - F;
  // its floor of old tiles
  area(k, rect(l.x0 + 0.1, l.z0 + 0.1, l.x1 - 0.1, l.z1 - 0.1), 0xc4906c, F + 0.035, { size: 0.9, bond: 0 });
  const aisle0 = l.x0 + (l.x1 - l.x0) * 0.375, aisle1 = l.x1 - (l.x1 - l.x0) * 0.375;
  const n = 5, len = (l.z1 - l.z0 - 0.6) / n;
  floored(k, () => {
    for (const west of [true, false]) {
      for (let i = 0; i < n; i++) {
        const z0 = l.z0 + 0.3 + i * len + 0.06, z1 = z0 + len - 0.12, zm = (z0 + z1) / 2;
        const back = west ? l.x0 + 0.2 : l.x1 - 0.2, front = west ? aisle0 : aisle1, dir = west ? 1 : -1;
        const st = STALLS[(i * 2 + (west ? 0 : 1)) % STALLS.length];
        const xs = (a: number, c: number): [number, number] => [Math.min(a, c), Math.max(a, c)];
        // the back shelf, low, with goods on it, and two posts at the back carrying the awning
        const [sx0, sx1] = xs(back, back + dir * 0.5);
        b.box(sx0, 0, z0 + 0.12, sx1, 1.45, z1 - 0.12, 0x7a5a3c, { top: 0x6a4a30 });
        b.box(sx0 + 0.08, 1.45, zm - 0.5, sx1 - 0.08, 1.85, zm + 0.5, CRATE, { top: st.goods[2 % st.goods.length] });
        for (const pz of [z0 + 0.04, z1 - 0.12]) b.box(back - 0.05, 0, pz, back + 0.05, 3.75, pz + 0.08, 0x6a4a30, { faces: 'NESW' });
        // the counter at the aisle, its top laid with goods
        const [cx0, cx1] = xs(front - dir * 0.75, front - dir * 0.05);
        b.box(cx0, 0, z0 + 0.15, cx1, 0.95, z1 - 0.15, 0x9a6a42, { top: 0x6a4a30 });
        for (let g = 0; g < 3; g++) {
          const gz = z0 + 0.55 + (g * (len - 1.1)) / 2, gx = front - dir * 0.4, col = st.goods[g % st.goods.length];
          if (st.heaps) b.cyl(gx, gz, 0.95, 1.3, 0.32, 0.03, 5, col, { cap: false });
          else b.box(gx - 0.28, 0.95, gz - 0.36, gx + 0.28, 1.2, gz + 0.36, CRATE, { top: col });
        }
        // two posts at the aisle
        for (const pz of [z0 + 0.06, z1 - 0.14]) b.box(front - dir * 0.04 - 0.05, 0, pz, front - dir * 0.04 + 0.05, 3.0, pz + 0.08, 0x6a4a30, { faces: 'NESW' });
        // the awning, striped, sloping down over the aisle
        const stripe = [HUES[(i * 3 + (west ? 1 : 4)) % HUES.length], TRIM];
        const parts = 2;
        for (let s = 0; s < parts; s++) {
          const a0 = z0 + ((z1 - z0) * s) / parts, a1 = z0 + ((z1 - z0) * (s + 1)) / parts;
          slab(b, [back + dir * 0.1, 3.75, (a0 + a1) / 2], [front + dir * 0.55, 3.05, (a0 + a1) / 2], (a1 - a0) / 2 - 0.004, 0.06, stripe[s % 2], { under: shade(stripe[s % 2], 0.7) });
        }
        // the stall's board, hung under the awning's edge, facing the aisle
        const sr = k.signs.atlas.rects.get(st.sign);
        if (sr) {
          const h = 0.42, w = Math.min(len - 0.6, h * sr.aspect), hh = w / sr.aspect, bx = front + dir * 0.25, sy = 2.72;
          const [bx0, bx1] = xs(bx - dir * 0.03, bx + dir * 0.03);
          b.box(bx0, sy - hh / 2 - 0.06, zm - w / 2 - 0.06, bx1, sy + hh / 2 + 0.06, zm + w / 2 + 0.06, BOARD, { faces: 'NESWTB' });
          k.sign(st.sign, bx + dir * 0.06, F + sy, zm, dir, 0, hh, w);
          k.sign(st.sign, bx - dir * 0.06, F + sy, zm, -dir, 0, hh, w);
          b.box(bx - 0.02, sy + hh / 2 + 0.06, zm - 0.02, bx + 0.02, 3.12, zm + 0.02, 0x6a4a30, { faces: 'NESW' });
        }
        // a lamp under the awning, steam off a cook's pot, and the stallholder
        k.glows.push({ x: front - dir * 0.6, y: F + 2.75, z: zm, sx: 0.28, sy: 0.32, sz: 0.28, color: '#ffd9a0' });
        if (STEAMY.has(st.sign)) STEAM.push([front - dir * 0.4, F + 1.35, zm]);
        k.person(back + dir * 1.2, zm + (r() - 0.5) * 0.8, F + 0.035);
      }
    }
    // a string of lanterns down the aisle, between two posts at its ends
    const mx = (aisle0 + aisle1) / 2, y = top - 0.7;
    for (const pz of [l.z0 + 0.15, l.z1 - 0.15]) b.box(mx - 0.08, 0, pz - 0.08, mx + 0.08, y + 0.3, pz + 0.08, 0x5a4a3a, { faces: 'NESWT' });
    b.beam([mx, y + 0.2, l.z0 + 0.15], [mx, y + 0.2, l.z1 - 0.15], 0.025, 0.025, 0xd8d0c0);
    const lanternC = ['#ff6a4a', '#ffd06a', '#ff9a5a', '#ffe0a0'];
    for (let z = l.z0 + 1.2, i = 0; z < l.z1 - 1; z += 1.35, i++) k.glows.push({ x: mx, y: F + y - 0.02, z, sx: 0.26, sy: 0.3, sz: 0.26, color: lanternC[i % 4] });
    // the crowd in the aisle, of every Color
    for (let i = 0; i < 12; i++) {
      const z = l.z0 + 1 + (i / 12) * (l.z1 - l.z0 - 2) + (r() - 0.5) * 0.5, x = mx + (r() - 0.5) * 0.36;
      if (i % 3 === 0) folk(b, x, z, 0.035, r, i);
      else k.person(x, z, F + 0.035);
    }
  });
  k.lights.push({ x: (l.x0 + l.x1) / 2, z: l.z0 + 5, r: 10, color: WARM, k: 0.6 }, { x: (l.x0 + l.x1) / 2, z: l.z1 - 5, r: 10, color: WARM, k: 0.6 });
  // its name, before its south end, where the view reads it over the south wall
  nameBoard(k, SG.market, (l.x0 + l.x1) / 2, l.z1 + 1.7, F, TO_VIEW, 1.2);
  BUBBLES.push({ l, m: { n: 2.0, s: 2.0, w: 0.9, e: 1.6 } });
};

// ---------------------------------------------------------------------------
// The centre
// ---------------------------------------------------------------------------

/** A cornice round the top of a block, proud of it on every side, with its underside. */
function cornice(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, t: number, color: number, over = 0.18, top = ROOF): void {
  b.box(x0 - over, y, z0 - over, x1 + over, y + t, z1 + over, color, { faces: 'NESWTB', top });
}

/** A canopy over a door on a side, on two thin posts: a slab with its underside, lit under its edge. */
function canopy(k: Build, s: Side, u0: number, u1: number, depth: number, y: number, color: number, posts = true): void {
  const b = k.b, um = (u0 + u1) / 2;
  const [ax, az] = at(s, um, 0), [cx, cz] = at(s, um, depth);
  slab(b, [ax, y + 0.12, az], [cx, y, cz], (u1 - u0) / 2, 0.14, color, { under: shade(color, 0.8) });
  if (posts) for (const u of [u0 + 0.2, u1 - 0.2]) onSide(b, s, u - 0.07, u + 0.07, depth - 0.3, depth - 0.16, 0, y - 0.12, STEEL, { faces: 'NESW' });
  const [gx, gz] = at(s, um, depth * 0.5);
  k.glows.push({ x: gx, y: F + y - 0.16, z: gz, sx: Math.abs(s.tx) * (u1 - u0) * 0.6 + 0.2, sy: 0.05, sz: Math.abs(s.tz) * (u1 - u0) * 0.6 + 0.2, color: '#fff1d6' });
}

/** centre-1: a corner café and a barber's under flats, on the river walk by the grates. */
const centre1: Model = (k, l) => {
  const r = rng(1101), top = l.top - F, xm = l.x0 + (l.x1 - l.x0) * 0.48;
  floored(k, () => {
    house(k, { x0: l.x0 + 0.3, z0: l.z0 + 0.3, x1: xm, z1: l.z1 - 0.3, lanes: 'NSW', shared: 'E' }, { top, floors: 2, cap: 0.3, wall: 0xe6d8bf, win: QWIN, seed: 1101, signs: [SG.cafe], roof: 'tanks' }, r);
    house(k, { x0: xm, z0: l.z0 + 0.3, x1: l.x1 - 0.3, z1: l.z1 - 0.3, lanes: 'NSE', shared: 'W' }, { top, floors: 2, cap: 0.42, wall: 0xcdb08c, win: QWIN, seed: 1102, signs: [SG.barber], roof: 'garden' }, r);
  });
  // café tables on the walk before its west side
  for (let i = 0; i < 2; i++) table(k, l.x0 - 1.6, l.z1 - 2 - i * 2.6, rng(1120 + i));
  k.lights.push({ x: (l.x0 + l.x1) / 2, z: l.z1 + 2, r: 9, color: WARM, k: 0.45 });
};

/** centre-2: the office tower: a lobby of glass, a shaft of storeys in a curtain of glass with fins up its south and east faces, a lit crown and a mast. */
const centre2: Model = (k, l) => {
  const b = k.b, top = l.top - F;
  const x0 = l.x0 + 0.3, x1 = l.x1 - 0.3, z0 = l.z0 + 0.3, z1 = l.z1 - 0.3, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const shaftTop = Math.floor((top - 2) / 4) * 4;
  floored(k, () => {
    // the lobby, a storey of glass under a deep band
    b.box(x0 + 0.35, 0, z0 + 0.35, x1 - 0.35, 4, z1 - 0.35, 0x3a4652, { win: SHOP4, seed: 21 });
    b.box(x0, 4, z0, x1, 4.6, z1, 0xb8c2cc, { faces: 'NESWTB' });
    // the shaft
    b.box(x0 + 0.1, 4.6, z0 + 0.1, x1 - 0.1, shaftTop, z1 - 0.1, 0xaebccb, { win: CURTAIN, seed: 22 });
    // fins up its south and east faces
    for (let i = 1; i < 4; i++) {
      const fx = x0 + ((x1 - x0) * i) / 4;
      b.box(fx - 0.07, 4.6, z1 - 0.1, fx + 0.07, shaftTop + 0.3, z1 + 0.35, 0xdfe6ec, { faces: 'ESWT' });
      const fz = z0 + ((z1 - z0) * i) / 4;
      b.box(x1 - 0.1, 4.6, fz - 0.07, x1 + 0.35, shaftTop + 0.3, fz + 0.07, 0xdfe6ec, { faces: 'NSET' });
    }
    // the crown: a band of light under a gold rim, a setback, and the mast
    b.box(x0 - 0.05, shaftTop, z0 - 0.05, x1 + 0.05, shaftTop + 0.7, z1 + 0.05, 0x9fd8ff, { win: interior(2.2), faces: 'NESWB' });
    b.box(x0 - 0.15, shaftTop + 0.7, z0 - 0.15, x1 + 0.15, shaftTop + 0.95, z1 + 0.15, GOLD, { faces: 'NESWTB', top: 0x8a8f96 });
    b.box(cx - 1.3, shaftTop + 0.95, cz - 1.8, cx + 1.3, Math.min(top - 0.05, shaftTop + 2.0), cz + 1.8, 0x8f9aa6, { top: 0x707981 });
    b.beam([cx, top - 0.05, cz], [cx, top + 3.6, cz], 0.12, 0.05, AERIAL);
    // the lobby's doors on the east, under a canopy
    canopy(k, side({ x0, z0, x1, z1 }, 'E'), 2.6, 5.4, 1.4, 3.1, 0xc8d2da, false);
  });
  k.glows.push({ x: cx, y: l.top + 3.6, z: cz, sx: 0.3, sy: 0.3, sz: 0.3, color: '#ff3b3b' });
  k.lights.push({ x: x1 + 2, z: cz, r: 10, color: COLD, k: 0.45 });
};

/**
 * centre-3: the hospital, white with a stripe of green at each floor, its
 * doors on the south under a long canopy, a lit sign on its roof facing the
 * view, a plant room, and a hover ambulance at the doors.
 */
const centre3: Model = (k, l) => {
  const b = k.b, top = l.top - F;
  const x0 = l.x0 + 0.3, x1 = l.x1 - 0.3, z0 = l.z0 + 0.3, z1 = l.z1 - 0.3;
  const wallTop = Math.floor((top - 1.4) / WARD.storey) * WARD.storey;
  floored(k, () => {
    b.box(x0, 0, z0, x1, wallTop, z1, MARBLE, { win: WARD, seed: 31 });
    for (let y = WARD.storey; y < wallTop - 0.1; y += WARD.storey) {
      b.box(x0 - 0.06, y - 0.12, z0 - 0.06, x1 + 0.06, y + 0.12, z1 + 0.06, 0x4f9f8a, { faces: 'NESWB' });
    }
    cornice(b, x0, z0, x1, z1, wallTop, 0.3, 0xdcd8cf);
    // the plant room on the roof, and the sign's frame
    const rt = wallTop + 0.3;
    b.box(x0 + 1.2, rt, z0 + 1.0, x0 + 5.2, rt + 1.2, z0 + 4.4, 0xc9ccd0, { top: 0x8f959b });
    // doors on the south, under the canopy
    const s = side({ x0, z0, x1, z1 }, 'S');
    onSide(b, s, 3.0, 6.4, 0, 0.05, 0, 2.6, 0x9fd0e0, { win: interior(2.4), faces: against(s) });
    canopy(k, s, 2.4, 7.0, 1.65, 3.0, 0xf2f2ee);
    // the sign on the roof, facing the view's side
    const sr = k.signs.atlas.rects.get(SG.hospital);
    if (sr) {
      const h = Math.min(1.0, top - rt - 0.3), w = h * sr.aspect, sx = x1 - 0.4 - w / 2, sz = z1 - 0.6;
      b.box(sx - w / 2 - 0.1, rt, sz - 0.12, sx + w / 2 + 0.1, rt + h + 0.2, sz, 0x2a3036, { faces: 'NESWT' });
      k.sign(SG.hospital, sx, F + rt + 0.1 + h / 2, sz + 0.03, 0, 1, h, w);
    }
    // the ambulance at the doors
  });
  ambulance(k, (x0 + x1) / 2 + 0.5, z1 + 3.4);
  k.lights.push({ x: (x0 + x1) / 2, z: z1 + 2.5, r: 11, color: '#e8f4ff', k: 0.55 });
};

/** A hover ambulance standing still: white, with a stripe and blue lamps on its roof, floating a hand above the ground on its thrusters. */
function ambulance(k: Build, x: number, z: number): void {
  const b = k.b, y = F + 0.35;
  b.box(x - 3.0, y, z - 1.25, x + 3.0, y + 1.9, z + 1.25, 0xf4f4f2, { faces: 'NESWTB' });
  b.box(x + 1.6, y + 0.9, z - 1.27, x + 3.02, y + 1.75, z + 1.27, 0x2a3440, { faces: 'NESW' });
  b.box(x - 3.02, y + 0.75, z - 1.27, x + 1.6, y + 1.0, z + 1.27, 0xd8432b, { faces: 'NESW' });
  for (const sx of [-2.1, 2.1]) b.box(x + sx - 0.5, F + 0.05, z - 1.0, x + sx + 0.5, y, z + 1.0, 0x3a3f46, { faces: 'NESWT' });
  for (const sx of [-0.5, 0.5]) k.glows.push({ x: x + sx, y: y + 2.0, z, sx: 0.4, sy: 0.18, sz: 0.5, color: '#4aa8ff' });
  k.glows.push({ x: x - 2.4, y: F + 0.18, z, sx: 1.2, sy: 0.08, sz: 1.6, color: '#8fd0ff' });
}

/** centre-4: the hotel, warm stone, a lobby along the ground, balconies to the road, a lit pavilion on its roof and its name down the corner. */
const centre4: Model = (k, l) => {
  const b = k.b, r = rng(1401), top = l.top - F;
  const x0 = l.x0 + 0.3, x1 = l.x1 - 0.3, z0 = l.z0 + 0.3, z1 = l.z1 - 0.3;
  const wallTop = Math.floor((top - 1.8) / 4) * 4;
  floored(k, () => {
    b.box(x0, 0, z0, x1, wallTop, z1, 0xd8c3a0, { win: SHOP4, seed: 41 });
    cornice(b, x0, z0, x1, z1, wallTop, 0.32, 0xb59a74);
    const e = side({ x0, z0, x1, z1 }, 'E');
    for (let st = 1; st < wallTop / 4; st++) bays(e, SHOP4.cell).forEach((u, i) => { if (i % 2 === 1) balcony(k, e, u, st * 4, 1.3, r, 0xd8c3a0); });
    canopy(k, e, e.L / 2 - 1.6, e.L / 2 + 1.6, 1.3, 3.2, GOLD, false);
    // the pavilion on the roof: a bar of lit glass under a flat roof
    const rt = wallTop + 0.32, px0 = x0 + 1.0, px1 = x1 - 1.0, pz0 = z0 + 2.0, pz1 = z1 - 2.5;
    b.box(px0, rt, pz0, px1, top - 0.4, pz1, 0x6a5a40, { win: interior(1.6), faces: 'NESW' });
    b.box(px0 - 0.4, top - 0.4, pz0 - 0.4, px1 + 0.4, top - 0.1, pz1 + 0.4, 0xefe7d6, { faces: 'NESWTB' });
    // its name down the south-east corner
    // its name down the south-east corner, reaching out no more than a porch may
    const bh = Math.min(4.5, wallTop - 5);
    bladeSign(k, side({ x0, z0, x1, z1 }, 'S'), SG.hotel, side({ x0, z0, x1, z1 }, 'S').L - 0.4, 4.4 + bh / 2, bh);
    k.person(px1 + 0.2, pz1 + 1.0, F + rt);
  });
  k.lights.push({ x: x1 + 2, z: (z0 + z1) / 2, r: 9, color: WARM, k: 0.5 });
};

/**
 * centre-5: three houses along the river walk: flats over a barber's and a
 * news shop, and between them an old stone building with tall windows and a
 * portico to the walk.
 */
const centre5: Model = (k, l) => {
  const r = rng(1501), top = l.top - F, b = k.b;
  const z1 = l.z0 + (l.z1 - l.z0) * 0.34, z2 = l.z0 + (l.z1 - l.z0) * 0.66;
  floored(k, () => {
    house(k, { x0: l.x0 + 0.3, z0: l.z0 + 0.3, x1: l.x1 - 0.3, z1, lanes: 'NEW', shared: 'S' }, { top, floors: 3, cap: 0.3, wall: 0xe3d3b8, win: QWIN, seed: 1501, signs: [SG.news], roof: 'tanks' }, r);
    // the old stone building
    const sx0 = l.x0 + 0.5, sx1 = l.x1 - 0.5, sTop = 8;
    b.box(sx0, 0, z1, sx1, sTop, z2, 0xcfc6b4, { win: TALL, seed: 1502 });
    cornice(b, sx0, z1, sx1, z2, sTop, 0.45, 0xb9b09c, 0.22);
    b.box(sx0 + 0.6, sTop + 0.45, z1 + 0.6, sx1 - 0.6, sTop + 1.4, z2 - 0.6, 0x7f8f88, { top: 0x6f7f78 });
    // its portico to the walk: four columns and a pediment-like beam
    for (let i = 0; i < 4; i++) {
      const zc = z1 + 1.0 + (i * (z2 - z1 - 2.0)) / 3;
      b.cyl(sx0 - 1.0, zc, 0, 4.2, 0.32, 0.28, 8, 0xe8e2d4);
    }
    b.box(sx0 - 1.5, 4.2, z1 + 0.5, sx0 + 0.02, 4.8, z2 - 0.5, 0xe8e2d4, { faces: 'NESWTB' });
    house(k, { x0: l.x0 + 0.3, z0: z2, x1: l.x1 - 0.3, z1: l.z1 - 0.3, lanes: 'SEW', shared: 'N' }, { top, floors: 3, cap: 0.38, wall: 0xd9a77e, win: QWIN, seed: 1503, signs: [SG.barber], roof: 'garden' }, r);
  });
  k.lights.push({ x: l.x0 - 2, z: (z1 + z2) / 2, r: 9, color: WARM, k: 0.45 });
};

/** centre-6: shops and flats along the road, with awnings to it, and the stop's shelter before them. */
const centre6: Model = (k, l) => {
  const r = rng(1601), top = l.top - F;
  const z1 = l.z0 + (l.z1 - l.z0) * 0.32, z2 = l.z0 + (l.z1 - l.z0) * 0.65;
  floored(k, () => {
    house(k, { x0: l.x0 + 0.3, z0: l.z0 + 0.3, x1: l.x1 - 0.3, z1, lanes: 'NEW', shared: 'S' }, { top, floors: 3, cap: 0.28, wall: 0xc98a6a, win: QWIN, seed: 1601, signs: [SG.bread, SG.coffee], roof: 'tanks' }, r);
    house(k, { x0: l.x0 + 0.3, z0: z1, x1: l.x1 - 0.3, z1: z2, lanes: 'EW', shared: 'NS' }, { top, floors: 2, cap: 0.36, wall: 0xb8c2c9, win: QWIN, seed: 1602, signs: [SG.tea], roof: 'garden' }, r);
    house(k, { x0: l.x0 + 0.3, z0: z2, x1: l.x1 - 0.3, z1: l.z1 - 0.3, lanes: 'SEW', shared: 'N' }, { top, floors: 3, cap: 0.33, wall: 0xe0c9a6, win: QWIN, seed: 1603, signs: [SG.cafe, SG.spices], roof: 'tanks' }, r);
  });
  shelter(k, l.x1 + 2.2, (z1 + z2) / 2 + 1);
};

/** The shelter of a stop by the road: a glass back, a roof, a bench, and the stop's lit sign. */
function shelter(k: Build, x: number, z: number): void {
  const b = k.b, y = F, half = 2.0;
  if (toRoad(x + 0.8, z) < ROAD_HALF) return;
  b.box(x - 0.75, y, z - half, x - 0.65, y + 2.4, z + half, 0x9fc4d8, { win: interior(0.6), faces: 'NESWT' });
  b.box(x - 0.85, y + 2.4, z - half - 0.15, x + 0.85, y + 2.58, z + half + 0.15, 0x59626c, { faces: 'NESWTB' });
  for (const dz of [-half + 0.05, half - 0.15]) b.box(x + 0.6, y, z + dz, x + 0.7, y + 2.4, z + dz + 0.1, 0x59626c, { faces: 'NESW' });
  b.box(x - 0.6, y + 0.45, z - 1.2, x - 0.15, y + 0.55, z + 1.2, 0x8a6a4c, { faces: 'NESWTB' });
  const sr = k.signs.atlas.rects.get(SG.stop);
  if (sr) {
    const h = 0.45, w = h * sr.aspect;
    b.box(x - w / 2 - 0.08, y + 2.58, z + half + 0.05, x + w / 2 + 0.08, y + 2.58 + h + 0.12, z + half + 0.15, BOARD, { faces: 'NESWT' });
    k.sign(SG.stop, x, y + 2.64 + h / 2, z + half + 0.18, 0, 1, h, w);
  }
  k.person(x - 0.3, z + 0.6, y);
  k.person(x + 0.2, z - 1.0, y);
  k.lights.push({ x: x + 0.5, z, r: 6, color: '#e6f4ff', k: 0.4 });
}

/** centre-7: a row on the lake's north shore: a coffee house and a beer hall, with a roof terrace between them and tables out on the shore. */
const centre7: Model = (k, l) => {
  const r = rng(1701), top = l.top - F, b = k.b;
  const xa = l.x0 + (l.x1 - l.x0) * 0.36, xb = l.x0 + (l.x1 - l.x0) * 0.66;
  floored(k, () => {
    house(k, { x0: l.x0 + 0.3, z0: l.z0 + 0.3, x1: xa, z1: l.z1 - 0.3, lanes: 'NSW', shared: 'E' }, { top, floors: 2, cap: 0.3, wall: 0xe2bfa0, win: QWIN, seed: 1701, signs: [SG.coffee], roof: 'tanks' }, r);
    house(k, { x0: xa, z0: l.z0 + 0.3, x1: xb, z1: l.z1 - 0.3, lanes: 'NS', shared: 'EW' }, { top, floors: 1, cap: 0.3, wall: 0xc2c8b0, win: QWIN, seed: 1702, signs: [SG.fish], roof: 'plain' }, r);
    house(k, { x0: xb, z0: l.z0 + 0.3, x1: l.x1 - 0.3, z1: l.z1 - 0.3, lanes: 'NSE', shared: 'W' }, { top, floors: 2, cap: 0.4, wall: 0xd7b9b0, win: QWIN, seed: 1703, signs: [SG.beer], roof: 'tanks' }, r);
    // the roof terrace: a rail round it, parasols and people
    const rt = 1 * ST + 0.3;
    for (const [x, z] of [[xa + 1.6, l.z0 + 2.2], [xb - 1.6, l.z1 - 2.2]]) {
      b.cyl(x, z, rt, rt + 2.1, 0.05, 0.05, 4, 0x8d8a83, { cap: false });
      b.cyl(x, z, rt + 1.85, rt + 2.4, 1.15, 0.06, 8, [0xd8432b, 0x3f6fae][x < (xa + xb) / 2 ? 0 : 1], { cap: false });
      b.cyl(x, z, rt + 1.84, rt + 1.85, 0.2, 1.15, 8, 0x5a4a3a, { cap: false });
      b.cyl(x, z, rt + 0.7, rt + 0.78, 0.45, 0.45, 6, 0xf2efe6);
    }
    for (const z of [l.z0 + 0.42, l.z1 - 0.42]) b.box(xa + 0.1, rt, z - 0.04, xb - 0.1, rt + 0.85, z + 0.04, RAIL, { faces: 'NESWT' });
    k.person(xa + 2.6, l.z0 + 3.0, F + rt);
    k.person(xb - 2.4, l.z1 - 1.4, F + rt);
  });
  // tables out on the shore, between the row and the water
  for (let i = 0; i < 4; i++) {
    const x = l.x0 + 3 + i * 4.2, z = l.z1 + 1.9;
    if (!inWater(x, z, 1.4)) table(k, x, z, rng(1720 + i), true);
  }
  k.lights.push({ x: (l.x0 + l.x1) / 2, z: l.z1 + 2, r: 12, color: WARM, k: 0.5 });
};

/** A table with two stools, and a parasol over it if `shade` is asked for, with people at it now and then. */
function table(k: Build, x: number, z: number, r: () => number, parasol = false): void {
  if (!clear(x, z, 0.4) && !parasol) return;
  const b = k.b, y = F;
  b.box(x - 0.06, y, z - 0.06, x + 0.06, y + 0.85, z + 0.06, 0x5a5550, { faces: 'NESW' });
  b.cyl(x, z, y + 0.85, y + 0.92, 0.55, 0.55, 6, 0xefe9dc);
  for (const d of [-0.95, 0.95]) b.box(x + d - 0.22, y, z - 0.22, x + d + 0.22, y + 0.55, z + 0.22, 0x7a5a3c);
  if (parasol) {
    b.box(x - 0.04, y + 0.92, z - 0.04, x + 0.04, y + 2.6, z + 0.04, 0x8d8a83, { faces: 'NESW' });
    const c = HUES[Math.floor(r() * HUES.length)];
    b.cyl(x, z, y + 2.35, y + 2.9, 1.4, 0.06, 6, c, { cap: false });
    b.cyl(x, z, y + 2.34, y + 2.35, 0.25, 1.4, 6, shade(c, 0.6), { cap: false });
  }
  if (r() < 0.7) k.person(x + 0.95, z + (r() - 0.5) * 0.3, y);
  if (r() < 0.5) k.person(x - 0.95, z + (r() - 0.5) * 0.3, y);
}

// ---------------------------------------------------------------------------
// The shield park
// ---------------------------------------------------------------------------
//
// The shield's generators stand in a park (GS 41): four tall white pylons,
// each with a nexus glowing blue in a cradle at its crown, in a lawn crossed
// by gravel paths, with a low station between them on the east. The show
// (story 5) has Mustang run from her mark to kneel by each pylon in turn and
// then to the middle, and her Obsidians stand and move in the park's north
// half: those places and the straight ways between them are kept to lawn,
// paths and low beds, and the trees and the station stand elsewhere. A place
// for a hero is on the drive in from the west gate.

/** Where the show has Mustang and her Obsidians (show.ts, story 5): the places, and the straight ways between them, which stay clear. */
const PARK = (() => {
  const c = ['pylon-nw', 'pylon-ne', 'pylon-sw', 'pylon-se'].map((id): P2 => {
    const l = lotOf(id);
    return [(l.x0 + l.x1) / 2, (l.z0 + l.z1) / 2];
  });
  const mid: P2 = [(c[0][0] + c[3][0]) / 2, (c[0][1] + c[3][1]) / 2];
  const kneel = c.map(([x, z]): P2 => [x + Math.sign(mid[0] - x) * 2.6, z + Math.sign(mid[1] - z) * 2.6]);
  // her mark and her Obsidians', as show.ts has them
  const mark: P2 = [64, -36];
  const guards: [P2, P2][] = [[[66.2, -33], [68.8, -27.6]], [[68.6, -34.6], [69.6, -24.2]]];
  const ways: [P2, P2][] = [[mark, kneel[0]], [kneel[0], kneel[1]], [kneel[1], kneel[2]], [kneel[2], kneel[3]], [kneel[3], mid], ...guards];
  return { c, mid, kneel, ways, spots: [mark, ...kneel, mid, ...guards.flat()] };
})();

/** How far a place is from the nearest of the park's ways and places. */
const fromWays = (x: number, z: number): number => Math.min(...PARK.ways.map(([a, c]) => toSegment(x, z, a, c)), ...PARK.spots.map(([sx, sz]) => Math.hypot(x - sx, z - sz)));

const HERO = HERO_SPOTS.find((s) => s.id === 'shield-park')!;
/** The car on the place for a hero: 7.8 by 3.1, along its heading. */
const CAR = { x0: HERO.x - 3.9, x1: HERO.x + 3.9, z0: HERO.z - 1.55, z1: HERO.z + 1.55 };
/** Whether something `h` tall may stand at a place without standing on the hero's car or before it: nothing taller than a person within eight south-east of it. */
function beforeHero(x: number, z: number, h: number, m = 0.6): boolean {
  if (x > CAR.x0 - m && x < CAR.x1 + m && z > CAR.z0 - m && z < CAR.z1 + m) return true;
  if (h <= 2.3) return false;
  for (let t = 0; t <= 8; t += 0.5) {
    const px = x - TO_VIEW[0] * t, pz = z - TO_VIEW[2] * t;
    if (px > CAR.x0 - 1.5 && px < CAR.x1 + 1.5 && pz > CAR.z0 - 1.5 && pz < CAR.z1 + 1.5) return true;
  }
  return false;
}

/** The station between the pylons, on the park's east side, clear of the ways. */
const station = (l: Lot): Box4 => ({ x0: l.x1 - 8.5, z0: PARK.mid[1] - 6, x1: l.x1 - 2.5, z1: PARK.mid[1] + 6 });

/**
 * The park: its lawn, its gravel paths (round three sides of the four
 * places where Mustang kneels, across it corner to corner, and in from
 * Quarter Street), the drive in from the west gate past the hero's place to
 * the station, a round of white stone in the middle with the Society's
 * pyramid laid in it, beds of flowers, low hedges along the south, trees
 * where no one runs, lanterns, benches, the lines of light that carry the
 * shield's power from the station to each pylon, and the station.
 */
const shieldPark: Model = (k, l) => {
  const b = k.b, r = rng(7001), P = PARK, st = station(l);
  area(k, rect(l.x0 + 0.15, l.z0 + 0.15, l.x1 - 0.15, l.z1 - 0.15), LAWN, F + 0.02);
  // the paths, all of one gravel and one height, so that where they meet they are one
  const path = (a: P2, c: P2, w: number): void => area(k, band2(a, c, w / 2), GRAVEL, F + 0.035);
  path(P.kneel[0], P.kneel[1], 1.8);
  path(P.kneel[2], P.kneel[3], 1.8);
  path(P.kneel[0], P.kneel[2], 1.8);
  path(P.kneel[0], P.kneel[3], 1.6);
  path(P.kneel[1], P.kneel[2], 1.6);
  path([P.mid[0], l.z1 - 0.15], [P.mid[0], P.kneel[2][1]], 1.8);
  // round each pylon's foot
  for (const [x, z] of P.c) area(k, rect(x - 2.6, z - 2.6, x + 2.6, z + 2.6), GRAVEL, F + 0.035);
  // the drive, from the road through the west gate past the hero's place to the station
  area(k, rect(52.6, HERO.z - 2.5, st.x0 - 0.05, HERO.z + 2.5), GRAVEL, F + 0.035);
  // the round in the middle, with a ring and the pyramid laid in it
  const [mx, mz] = P.mid;
  area(k, oval(mx, mz, 3.3, 3.3, 28), PLAZA, F + 0.05);
  flat(k.street, oval(mx, mz, 2.95, 2.95, 28), F + 0.065, INLAY, { win: PAVED, holes: [oval(mx, mz, 2.6, 2.6, 28).reverse()] });
  area(k, [[mx, mz - 1.5], [mx + 1.3, mz + 0.75], [mx - 1.3, mz + 0.75]], INLAY, F + 0.065);
  // the lines of light that carry the power: blue points along the ways from the station to each pylon
  for (const [px, pz] of P.c) {
    const sx = px < mx ? st.x0 : st.x0 + 1, sz = pz < mz ? st.z0 + 1.5 : st.z1 - 1.5, n = Math.floor(Math.hypot(sx - px, sz - pz) / 1.6);
    for (let i = 1; i < n; i++) {
      const x = px + ((sx - px) * i) / n, z = pz + ((sz - pz) * i) / n;
      if (Math.hypot(x - px, z - pz) < 2.8 || Math.hypot(x - mx, z - mz) < 3.4) continue;
      k.glows.push({ x, y: F + 0.06, z, sx: 0.16, sy: 0.05, sz: 0.16, color: '#6fc0ff' });
    }
  }

  floored(k, () => {
    // low hedges along the south, with a gap for the path; a hedge along the west, with the gate
    const hedge = (x0: number, z0: number, x1: number, z1: number): void => b.box(x0, 0, z0, x1, 0.85, z1, HEDGE, { top: 0x5f8f4e });
    hedge(l.x0 + 0.3, l.z1 - 0.9, P.mid[0] - 1.3, l.z1 - 0.3);
    hedge(P.mid[0] + 1.3, l.z1 - 0.9, l.x1 - 0.3, l.z1 - 0.3);
    hedge(l.x0 + 0.3, l.z0 + 0.3, l.x0 + 0.9, HERO.z - 3.4);
    hedge(l.x0 + 0.3, HERO.z + 3.4, l.x0 + 0.9, l.z1 - 0.9);
    // the gate: two piers with lamps
    for (const z of [HERO.z - 3.3, HERO.z + 2.6]) {
      b.box(l.x0 + 0.15, 0, z, l.x0 + 0.85, 2.9, z + 0.7, STONE, { top: STONE_DARK });
      k.glows.push({ x: l.x0 + 0.5, y: F + 3.1, z: z + 0.35, sx: 0.34, sy: 0.34, sz: 0.34, color: '#dff2ff' });
    }
    // beds of flowers, low, where no one runs
    const beds: [number, number, number, number][] = [
      [P.kneel[0][0] + 3.0, P.kneel[0][1] + 6.6, 2.2, 1.0], [P.mid[0] + 1.5, P.kneel[2][1] - 3.0, 2.0, 0.9], [P.mid[0] - 3.8, P.kneel[2][1] - 2.4, 1.6, 0.9],
      [P.mid[0] + 4.2, P.kneel[0][1] + 2.4, 1.8, 0.9], [P.kneel[0][0] - 1.7, P.mid[1] - 8, 0.9, 2.2], [P.mid[0] - 1.0, P.kneel[0][1] + 3.0, 1.6, 0.8],
    ];
    const blooms = [0xd8432b, 0xe58fb0, 0xf2d03a, 0x7c55a8, 0xf0a030, 0xffffff];
    beds.forEach(([x, z, hw, hd], i) => {
      if (fromWays(x, z) < Math.max(hw, hd) + 0.6 || beforeHero(x, z, 0.3, 0.9)) return;
      // a low bed edged with green, and the flowers banked up in its middle
      b.box(x - hw, 0, z - hd, x + hw, 0.22, z + hd, BED, { top: 0x5f8f4e });
      b.box(x - hw + 0.2, 0.22, z - hd + 0.2, x + hw - 0.2, 0.42, z + hd - 0.2, 0x5f8f4e, { top: blooms[i % blooms.length] });
    });
    // benches along the west path, facing in
    for (const z of [P.kneel[0][1] + 4.5, P.kneel[2][1] - 4.0]) bench(b, P.kneel[0][0] - 1.9, z, 'E');
  });
  // trees where no one runs: along the west and north edges, and in the park's north-west and north
  // the park's top lets a tree stand no higher than its own: a tree of size s is about 7.7 s high
  const most = (l.top - F - 0.1) / 7.7;
  const trees: [number, number, number][] = [
    [l.x0 + 1.4, P.c[0][1] + 7, 0.98], [l.x0 + 1.4, HERO.z + 7, 0.94],
    [P.c[0][0] + 5, l.z0 + 1.0, 1], [P.mid[0] - 1.5, l.z0 + 1.0, 0.95], [P.mid[0] + 3, l.z0 + 1.0, 1], [P.c[1][0] - 4, l.z0 + 1.0, 0.96],
    [P.kneel[0][0] - 2.8, P.mid[1] - 4.5, 1], [P.mid[0] + 1.5, P.kneel[0][1] + 3.2, 0.97], [l.x1 - 1.1, P.kneel[1][1] + 3.2, 0.9],
  ];
  for (const [x, z, s] of trees) {
    if (fromWays(x, z) < 2.0 || beforeHero(x, z, 4) || onRoadOrWater(x, z)) continue;
    k.tree(x, z, s * most, false, F + 0.02);
  }
  // lanterns at the corners of the paths
  for (const [x, z] of [[P.kneel[0][0] - 1.6, P.kneel[0][1] + 2.4], [P.kneel[1][0] - 2.6, P.kneel[1][1] - 1.5], [P.kneel[0][0] - 1.6, P.kneel[2][1] - 2.4], [P.mid[0] + 4.6, P.mid[1] - 0.6]]) {
    if (fromWays(x, z) < 1.2 || beforeHero(x, z, 3)) continue;
    lanternPost(k, x, z, 2.9, '#dff2ff');
  }
  // the station
  stationHouse(k, st);
  // guards of the city at the gate, outside the park
  for (const dz of [-3.9, 3.6]) {
    const x = l.x0 - 1.0, z = HERO.z + dz;
    if (clear(x, z, 0.3)) guard(b, x, z);
  }
  for (const [x, z] of P.c) k.lights.push({ x, z, r: 9, color: COLD, k: 0.55 });
  k.lights.push({ x: P.mid[0], z: P.mid[1], r: 10, color: '#bfe4ff', k: 0.4 }, { x: l.x0 + 1, z: HERO.z, r: 8, color: WARM, k: 0.45 });
  // the name, at the park's south-west corner, clear of the road
  nameBoard(k, SG.park, l.x0 - 0.6, l.z1 - 3.0, F, TO_VIEW, 1.0);
};

/** Whether a place is on a road's verge or in the water. */
const onRoadOrWater = (x: number, z: number): boolean => toRoad(x, z) < ROAD_HALF || inWater(x, z);

/** A bench of slats on two legs, facing `f`. */
function bench(b: GeoBuilder, x: number, z: number, f: Face): void {
  const alongX = f === 'N' || f === 'S', hw = 0.9, hd = 0.28, sgn = f === 'S' || f === 'E' ? -1 : 1;
  const bx = (a0: number, a1: number, d0: number, d1: number, y0: number, y1: number, c: number, faces = 'NESWTB'): void => {
    if (alongX) b.box(x + a0, y0, z + d0, x + a1, y1, z + d1, c, { faces });
    else b.box(x + d0, y0, z + a0, x + d1, y1, z + a1, c, { faces });
  };
  bx(-hw, hw, -hd, hd, 0.42, 0.52, 0x8a6a4c);
  bx(-hw, hw, sgn * hd - 0.05, sgn * hd + 0.05, 0.52, 0.95, 0x8a6a4c);
  for (const a of [-hw + 0.1, hw - 0.2]) bx(a, a + 0.1, -hd + 0.05, hd - 0.05, 0, 0.42, 0x4a4d52, 'NESW');
}

/** A lantern on a post, lit at night. */
function lanternPost(k: Build, x: number, z: number, h: number, color = '#ffe2ae'): void {
  k.b.box(x - 0.08, F, z - 0.08, x + 0.08, F + h, z + 0.08, 0x4a4d52, { faces: 'NESW' });
  k.b.box(x - 0.22, F + h, z - 0.22, x + 0.22, F + h + 0.1, z + 0.22, 0x4a4d52, { faces: 'NESWTB' });
  k.glows.push({ x, y: F + h + 0.35, z, sx: 0.32, sy: 0.42, sz: 0.32, color });
  k.b.box(x - 0.24, F + h + 0.6, z - 0.24, x + 0.24, F + h + 0.7, z + 0.24, 0x4a4d52, { faces: 'NESWTB' });
  k.lights.push({ x, z, r: 7, color: color === '#ffe2ae' ? WARM : '#cfe8ff', k: 0.4 });
}

/** A guard of the city, in grey. */
function guard(b: GeoBuilder, x: number, z: number): void {
  b.box(x - 0.3, F, z - 0.2, x + 0.3, F + 0.85, z + 0.2, 0x4b5057, { faces: 'NESW' });
  b.box(x - 0.38, F + 0.85, z - 0.24, x + 0.38, F + 1.9, z + 0.24, 0x7d838b);
  b.box(x - 0.24, F + 1.9, z - 0.24, x + 0.24, F + 2.25, z + 0.24, SKINS[0], { faces: 'NESW' });
  b.box(x - 0.3, F + 2.2, z - 0.3, x + 0.3, F + 2.5, z + 0.3, 0x5b6067);
}

/**
 * The station of the shield's generators: a low hall of white ceramic, slit
 * with windows that glow blue-white at night, under a cap with a lit
 * skylight, its door to the park under a canopy, and transformers along its
 * east side. One storey: the park's top lets it no higher.
 */
function stationHouse(k: Build, s: Box4): void {
  const b = k.b, top = lotOf('shield-park').top - F;
  floored(k, () => {
    b.box(s.x0 - 0.25, 0, s.z0 - 0.25, s.x1 + 0.25, 0.3, s.z1 + 0.25, STONE_DARK);
    b.box(s.x0, 0.3, s.z0, s.x1, 3.3, s.z1, CERAMIC, { win: SLITS, seed: 71 });
    b.box(s.x0 - 0.04, 2.75, s.z0 - 0.04, s.x1 + 0.04, 2.95, s.z1 + 0.04, 0x7fc8ff, { win: interior(2.4), faces: 'NESWB' });
    b.box(s.x0 - 0.3, 3.3, s.z0 - 0.3, s.x1 + 0.3, 3.6, s.z1 + 0.3, COLLAR, { faces: 'NESWTB', top: 0x8a939c });
    b.box(s.x0 + 1.0, 3.6, s.z0 + 1.6, s.x1 - 1.0, Math.min(top - 0.05, 3.95), s.z1 - 1.6, 0x9fd8ff, { win: interior(2.0) });
    // its door to the park
    const w = side(s, 'W');
    onSide(b, w, w.L / 2 - 0.9, w.L / 2 + 0.9, 0, 0.05, 0.3, 2.6, 0x9fd8ff, { win: interior(2.6), faces: against(w) });
    canopy(k, w, w.L / 2 - 1.6, w.L / 2 + 1.6, 1.2, 3.0, CERAMIC_SHADE, false);
    // transformers along its east side
    for (let i = 0; i < 3; i++) {
      const z = s.z0 + 2 + i * ((s.z1 - s.z0 - 4) / 2);
      b.box(s.x1 + 0.4, 0, z - 0.8, s.x1 + 1.5, 1.7, z + 0.8, 0x7d8790, { top: 0x5f6973 });
      for (let f = 0; f < 3; f++) b.box(s.x1 + 1.5, 0.2, z - 0.6 + f * 0.5, s.x1 + 1.75, 1.5, z - 0.5 + f * 0.5, 0x6a737c, { faces: 'NESWT' });
      k.glows.push({ x: s.x1 + 0.95, y: F + 1.75, z, sx: 0.2, sy: 0.08, sz: 0.2, color: '#6fc0ff' });
    }
  });
  // a technician at the transformers, off the stage
  const r = rng(7111);
  folk(b, s.x1 + 1.3, (s.z0 + s.z1) / 2 - 2, F, r, 11);
  k.lights.push({ x: s.x0 - 1.5, z: (s.z0 + s.z1) / 2, r: 9, color: '#bfe4ff', k: 0.5 });
}

// ---------------------------------------------------------------------------
// The pylons
// ---------------------------------------------------------------------------

/** How a pylon stands over the floor: its base, the top of its shaft, its insulators and the middle of its nexus. */
const PY = { base: 1.9, shaft: 16, nexus: 19.35, r: 1.15 };
/** Half the shaft's width at a height, as it narrows from the base to the top. */
const shaftHalf = (y: number): number => 1.25 + ((0.72 - 1.25) * (y - PY.base)) / (PY.shaft - PY.base);

/**
 * A pylon of the shield's generators: a white ceramic shaft that narrows as it
 * rises from a plinth and a base, steel rails up its corners, two collars, a
 * seam of blue light up each face, and a stack of insulators under the cup
 * at its crown. The crown itself, the cup, the cradle and the nexus, is a
 * mesh of its own (`buildPylonTops`), so that it can flare.
 */
const pylon: Model = (k, l) => {
  const b = k.b, cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2;
  floored(k, () => {
    b.box(l.x0 + 0.05, 0, l.z0 + 0.05, l.x1 - 0.05, 0.45, l.z1 - 0.05, STONE_DARK);
    b.box(cx - 1.6, 0.45, cz - 1.6, cx + 1.6, PY.base, cz + 1.6, CERAMIC);
    // a glowing panel on each face of the base
    for (const f of ['N', 'E', 'S', 'W'] as Face[]) {
      const s = side({ x0: cx - 1.6, z0: cz - 1.6, x1: cx + 1.6, z1: cz + 1.6 }, f);
      const [ax, az] = at(s, 0.9, 0.03), [qx, qz] = at(s, 2.3, 0.03);
      b.quad([ax, 0.75, az], [qx, 0.75, qz], [qx, 1.55, qz], [ax, 1.55, az], [s.nx, 0, s.nz], 0x7fc8ff, { win: interior(2.2) });
    }
    b.cyl(cx, cz, PY.base, PY.shaft, shaftHalf(PY.base) * Math.SQRT2, shaftHalf(PY.shaft) * Math.SQRT2, 4, CERAMIC, { phase: Math.PI / 4, cap: CERAMIC_SHADE });
    // the rails up its corners, and a fin at the foot of each, buttressing the shaft
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const a = shaftHalf(PY.base) + 0.05, c = shaftHalf(PY.shaft) + 0.05;
      b.beam([cx + sx * a, PY.base, cz + sz * a], [cx + sx * c, PY.shaft, cz + sz * c], 0.13, 0.09, PYLON_RAIL);
      const dx = sx * Math.SQRT1_2, dz = sz * Math.SQRT1_2, px = -dz * 0.1, pz = dx * 0.1, top = 8.2;
      const p = (r: number, y: number, s: number): V3 => [cx + dx * r + px * s, y, cz + dz * r + pz * s];
      for (const s of [-1, 1]) b.quad(p(1.0, PY.base, s), p(2.2, PY.base, s), p(1.55, top, s), p(1.0, top, s), [px * s * 10, 0, pz * s * 10], 0xdfe6ee);
      const out = Math.hypot(6.3, 0.65);
      b.quad(p(2.2, PY.base, -1), p(2.2, PY.base, 1), p(1.55, top, 1), p(1.55, top, -1), [(dx * 6.3) / out, 0.65 / out, (dz * 6.3) / out], 0xdfe6ee);
      b.quad(p(1.0, top, -1), p(1.55, top, -1), p(1.55, top, 1), p(1.0, top, 1), [0, 1, 0], 0xdfe6ee);
    }
    // a seam of light up each face
    for (const [nx, nz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const y0 = PY.base + 0.6, y1 = PY.shaft - 0.6, h0 = shaftHalf(y0) + 0.02, h1 = shaftHalf(y1) + 0.02, w = 0.14;
      const tx = -nz, tz = nx;
      const p = (h: number, y: number, s: number): V3 => [cx + nx * h + tx * w * s, y, cz + nz * h + tz * w * s];
      const n: V3 = [nx * 0.998, 0.06, nz * 0.998];
      b.quad(p(h0, y0, -1), p(h0, y0, 1), p(h1, y1, 1), p(h1, y1, -1), n, 0x8fd2ff, { win: interior(2.6) });
    }
    // two collars
    for (const y of [5.6, 10.2]) {
      const h = shaftHalf(y + 0.2) + 0.2;
      b.box(cx - h, y, cz - h, cx + h, y + 0.45, cz + h, COLLAR, { faces: 'NESWTB' });
    }
    // the insulators under the cup
    for (const y of [12.9, 13.9, 14.9]) {
      b.cyl(cx, cz, y, y + 0.18, 1.12, 1.12, 8, INSULATOR, { win: interior(0.5) });
      b.cyl(cx, cz, y - 0.02, y, shaftHalf(y) + 0.02, 1.12, 8, shade(INSULATOR, 0.8), { cap: false });
    }
  });
  k.lights.push({ x: cx, z: cz, r: 8, color: COLD, k: 0.45 });
};

/** The crowns once built, by the build they were built in, so that asking twice gives the same crowns. */
let CROWNS: { k: Build; tops: { flare(i: number, f: number): void } } | null = null;

/** The crowns of the last build, for a check from the console: `(await import('/src/tiles/red-rising/quarter.ts')).pylonTops()?.flare(0, 1)`. */
export const pylonTops = (): { flare(i: number, f: number): void } | null => CROWNS?.tops ?? null;

/** A crystal: a faceted ball whose faces are shaded as if lit from above, so that it reads as cut even where it glows. */
function crystal(radius: number): THREE.BufferGeometry {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(radius, 1);
  if (g.index) g = g.toNonIndexed();
  const pos = g.getAttribute('position'), n = pos.count, col = new Float32Array(n * 3);
  const L = new THREE.Vector3(0.35, 0.85, 0.4).normalize(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    const nrm = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const s = 0.55 + 0.45 * Math.max(0, nrm.dot(L)) + 0.08 * Math.sin(i * 1.7);
    for (let v = 0; v < 3; v++) col.set([s * 0.92, s, 1], (i + v) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/** A soft round glow, for the halo round a nexus. */
function glowTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.22, 'rgba(255,255,255,0.6)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.14)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * The tops of the shield park's four pylons, as meshes of their own that the
 * show makes flare when Mustang's charges blow (story 5): `flare(i, f)` with
 * `i` the pylon (0 north-west, 1 north-east, 2 south-west, 3 south-east) and
 * `f` from 0 still to 1 at its brightest.
 *
 * Each crown is a cup of steel on the shaft with a gold rim, four prongs that
 * curve up and in round the nexus, a band round the nexus's middle and a thin
 * finial over it: one mesh for all four, in the city's material. The nexus is
 * a faceted crystal of its own that glows blue and breathes slowly, with a
 * halo of light round it; when it flares it swells, turns white and blinding,
 * its halo spreads wide, and a ring of light runs out from it across the sky.
 * Asking twice in one build gives the same crowns.
 */
export function buildPylonTops(k: Build): { flare(i: number, f: number): void } | null {
  if (CROWNS && CROWNS.k === k) return CROWNS.tops;
  const ids = ['pylon-nw', 'pylon-ne', 'pylon-sw', 'pylon-se'];
  const g = new GeoBuilder();
  const at0 = ids.map((id): V3 => {
    const l = lotOf(id);
    return [(l.x0 + l.x1) / 2, F, (l.z0 + l.z1) / 2];
  });
  for (const [cx, , cz] of at0) {
    const y0 = F + PY.shaft;
    g.cyl(cx, cz, y0, y0 + 1.5, shaftHalf(PY.shaft) * Math.SQRT2 + 0.06, 1.75, 10, CUP, { cap: 0x46505a });
    g.cyl(cx, cz, y0 + 1.5, y0 + 1.72, 1.8, 1.8, 10, GOLD, { cap: false });
    g.cyl(cx, cz, y0 + 1.72, y0 + 1.74, 1.8, 1.6, 10, GOLD, { cap: false });
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2, ca = Math.cos(a), sa = Math.sin(a);
      const pts: [number, number][] = [[1.55, 1.6], [1.9, 2.5], [1.75, 3.5], [1.2, 4.35], [0.45, 4.85]];
      g.sweep(pts.map(([rr, y]): V3 => [cx + ca * rr, y0 + y, cz + sa * rr]), [0.17, 0.15, 0.13, 0.1, 0.07], PRONG);
    }
    const yn = F + PY.nexus;
    g.cyl(cx, cz, yn - 0.13, yn + 0.13, 1.62, 1.62, 12, PRONG, { cap: false });
    g.cyl(cx, cz, yn - 0.14, yn - 0.13, 1.4, 1.62, 12, shade(PRONG, 0.75), { cap: false });
    g.cyl(cx, cz, y0 + 4.8, y0 + 7.4, 0.14, 0.03, 6, PRONG, { cap: false });
  }
  const cradle = new THREE.Mesh(g.build(), k.mat.city());
  cradle.name = 'pylon crowns';
  cradle.castShadow = true;
  cradle.receiveShadow = true;
  k.group.add(cradle);

  const geo = crystal(PY.r), tex = glowTexture();
  const ringGeo = new THREE.RingGeometry(0.85, 1.25, 40).rotateX(-Math.PI / 2);
  const BLUE = new THREE.Color(NEXUS), WHITE = new THREE.Color(0xffffff), PALE = new THREE.Color(0xcfeaff), tmp = new THREE.Color();
  const crowns = at0.map(([x, , z]) => {
    const coreMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, color: BLUE });
    const core = new THREE.Mesh(geo, coreMat);
    core.position.set(x, F + PY.nexus, z);
    core.name = 'pylon nexus';
    const haloMat = new THREE.SpriteMaterial({ map: tex, color: BLUE, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
    const halo = new THREE.Sprite(haloMat);
    halo.position.copy(core.position);
    halo.renderOrder = 3;
    const ringMat = new THREE.MeshBasicMaterial({ color: PALE, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(core.position);
    ring.visible = false;
    ring.renderOrder = 3;
    k.group.add(core, halo, ring);
    return { core, coreMat, halo, haloMat, ring, ringMat, f: 0, fired: false, age: 9 };
  });
  let night = 0, clock = 0;
  const apply = (i: number): void => {
    const c = crowns[i], hot = c.f * c.f * (3 - 2 * c.f);
    const rest = (1.15 + 1.25 * night) * (1 + 0.08 * Math.sin(clock * 1.6 + i * 1.9));
    c.coreMat.color.copy(BLUE).multiplyScalar(rest).lerp(tmp.copy(WHITE).multiplyScalar(3.5 + 5 * c.f), hot);
    c.core.scale.setScalar(1 + 0.32 * hot);
    c.haloMat.color.copy(BLUE).lerp(PALE, hot);
    c.haloMat.opacity = Math.min(1, 0.32 + 0.38 * night + 0.7 * hot);
    c.halo.scale.setScalar(5.4 + 0.8 * night + 18 * hot);
  };
  k.each((dt, time, n) => {
    night = n;
    clock = time;
    crowns.forEach((c, i) => {
      if (c.fired && c.age < 1.6) {
        c.age += dt;
        const t = Math.min(1, c.age / 1.6);
        c.ring.visible = t < 1;
        c.ring.scale.setScalar(1.5 + 13 * Math.sqrt(t));
        c.ringMat.opacity = 0.85 * (1 - t);
      } else c.ring.visible = false;
      apply(i);
    });
  });
  const tops = {
    flare(i: number, f: number): void {
      const c = crowns[i];
      if (!c) return;
      c.f = Math.min(1, Math.max(0, f));
      if (c.f > 0.6 && !c.fired) { c.fired = true; c.age = 0; }
      if (c.f < 0.02) c.fired = false;
      apply(i);
    },
  };
  crowns.forEach((_, i) => apply(i));
  CROWNS = { k, tops };
  return tops;
}

// ---------------------------------------------------------------------------
// The noise bubbles
// ---------------------------------------------------------------------------

/** The blocks that have a noise bubble over them, with how far it reaches past each side of the lot. */
const BUBBLES: { l: Lot; m: { n: number; s: number; w: number; e: number } }[] = [];

/**
 * The noise bubbles that keep a block's sound in (RR 16): faint domes of
 * shimmer over the market and two of the quarter's blocks, square in plan
 * with round corners and nearly flat on top, drawn as light added to
 * whatever is behind them, a little stronger at the foot and in two thin
 * bands, and stronger by night. They shimmer slowly. One mesh for all.
 */
function noiseBubbles(k: Build): void {
  if (BUBBLES.length === 0) return;
  const pos: number[] = [], col: number[] = [];
  const S = 28, R = 7, base = new THREE.Color(0xb8a8f0);
  for (const { l, m } of BUBBLES) {
    const x0 = l.x0 - m.w, x1 = l.x1 + m.e, z0 = l.z0 - m.n, z1 = l.z1 + m.s;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, A = (x1 - x0) / 2, B = (z1 - z0) / 2, C = l.top - F + 3;
    // a rounded square in plan
    const reach = (a: number): number => Math.pow(Math.pow(Math.abs(Math.cos(a)) / A, 4) + Math.pow(Math.abs(Math.sin(a)) / B, 4), -0.25);
    const p = (i: number, j: number): V3 => {
      const a = (i / S) * Math.PI * 2, e = (j / R) * (Math.PI / 2), f = Math.pow(Math.cos(e), 0.4), rr = reach(a) * f;
      return [cx + Math.cos(a) * rr, F + 0.05 + Math.sin(e) * C, cz + Math.sin(a) * rr];
    };
    const shine = (j: number): number => (0.12 + 0.88 * Math.pow(1 - j / R, 2.4)) + (j === 2 || j === 4 ? 0.3 : 0);
    for (let i = 0; i < S; i++) {
      for (let j = 0; j < R; j++) {
        const q = [p(i, j), p(i + 1, j), p(i + 1, j + 1), p(i, j + 1)], f = [shine(j), shine(j), shine(j + 1), shine(j + 1)];
        for (const n of [0, 1, 2, 0, 2, 3]) {
          pos.push(...q[n]);
          col.push(base.r * f[n], base.g * f[n], base.b * f[n]);
        }
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'noise bubbles of the quarter';
  mesh.renderOrder = 2;
  k.group.add(mesh);
  k.each((_dt, time, night) => {
    mat.opacity = (0.06 + 0.025 * night) * (1 + 0.2 * Math.sin(time * 1.1));
  });
  BUBBLES.length = 0;
}

// ---------------------------------------------------------------------------
// The ground between the lots
// ---------------------------------------------------------------------------

/** A hand cart: a box on two wheels, with shafts to pull it by. */
function cart(b: GeoBuilder, x: number, z: number, yaw: number, load: number): void {
  b.moved(x, F, z, yaw, () => {
    b.box(-0.9, 0.55, -0.6, 0.9, 1.1, 0.6, 0x8a6a4c, { faces: 'NESWTB', top: load });
    b.box(-0.85, 1.1, -0.55, 0.3, 1.45, 0.55, load, { faces: 'NESWT' });
    for (const s of [-1, 1]) wheel(b, 0, 0.48, s * 0.68, 0.48, 0.07, s, 0x4a3a2a, 0x8a7a5a);
    for (const s of [-0.45, 0.45]) b.box(0.9, 0.62, s - 0.05, 2.0, 0.7, s + 0.05, 0x6a4a30, { faces: 'NESWTB' });
  });
}

/** A stack of crates, a sack or two, a barrel. */
function clutter(b: GeoBuilder, x: number, z: number, r: () => number): void {
  const n = 1 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const dx = (r() - 0.5) * 0.9, dz = (r() - 0.5) * 0.9, s = 0.28 + r() * 0.12, y = i === 2 ? 0.6 : 0;
    if (r() < 0.25) b.cyl(x + dx, z + dz, F + y, F + y + 0.75, 0.32, 0.32, 8, 0x7a5a3c, { cap: 0x5a4a3a });
    else b.box(x + dx - s, F + y, z + dz - s, x + dx + s, F + y + s * 1.8, z + dz + s, [CRATE, CRATE_DARK, 0xc8b48a][i % 3]);
  }
}

/** A food stall on the ground: a counter under an awning on four posts, a lamp, steam from its pot, and a cook behind it. */
function foodStall(k: Build, x: number, z: number, f: Face, sign: string, r: () => number, steam: V3[]): void {
  const b = k.b, w = 2.6, d = 1.4, alongX = f === 'N' || f === 'S';
  const x0 = x - (alongX ? w : d) / 2, x1 = x + (alongX ? w : d) / 2, z0 = z - (alongX ? d : w) / 2, z1 = z + (alongX ? d : w) / 2;
  const s = side({ x0, z0, x1, z1 }, f);
  const [px, pz] = at(s, s.L / 2, -0.35);
  floored(k, () => {
    // the counter along the front, its pot on it, and four posts carrying the roof
    onSide(b, s, 0, s.L, -0.7, 0, 0, 1.0, 0x8a5a3a, { top: 0x5a3a2a });
    b.cyl(px, pz, 1.0, 1.4, 0.3, 0.34, 8, 0x9aa0a6, { cap: 0x3a3a3a });
    for (const [qx, qz] of [[x0, z0], [x1 - 0.1, z0], [x1 - 0.1, z1 - 0.1], [x0, z1 - 0.1]]) b.box(qx, 0, qz, qx + 0.1, 2.6, qz + 0.1, 0x6a4a30, { faces: 'NESW' });
    const hue = HUES[Math.floor(r() * HUES.length)];
    b.box(x0 - 0.3, 2.6, z0 - 0.3, x1 + 0.3, 2.72, z1 + 0.3, hue, { faces: 'NESWTB' });
    b.box(x0 - 0.3, 2.72, z0 - 0.3, x1 + 0.3, 2.78, z1 + 0.3, shade(hue, 1.4), { faces: 'NESWT' });
    boardSign(k, side({ x0: x0 - 0.3, z0: z0 - 0.3, x1: x1 + 0.3, z1: z1 + 0.3 }, f), sign, s.L / 2 + 0.3, 2.25, 0.42, s.L - 0.2, true);
  });
  k.glows.push({ x, y: F + 2.45, z, sx: 0.3, sy: 0.22, sz: 0.3, color: '#ffd9a0' });
  k.lights.push({ x, z, r: 6.5, color: WARM, k: 0.5 });
  // the cook, behind the counter under the roof
  const [cx, cz] = at(s, s.L / 2 + 0.5, -(alongX ? d : d) + 0.35);
  k.person(cx, cz, F);
  steam.push([px, F + 1.45, pz]);
}

/**
 * The ground of the quarter between its lots: the square west of the first
 * block, with food stalls, tables, a fountain and lamps; the lantern alley
 * between the first and third blocks, strung with lanterns and with a noodle
 * stall in it; the washing alley between the third and sixth; the alley by
 * the market; the yards east of the road; the walk along the river's east
 * bank and the lake's east shore; and people everywhere, of every Color.
 */
function quarterGround(k: Build): void {
  const b = k.b, r = rng(9001), steam = STEAM;
  const L1 = lotOf('low-1'), L2 = lotOf('low-2'), L3 = lotOf('low-3'), L4 = lotOf('low-4'), L6 = lotOf('low-6'), M = lotOf('market'), C7 = lotOf('centre-7');

  // --- the square, west of the first block and north of the market
  const sq: Box4 = { x0: C7.x1 + 1.0, z0: L1.z0 + 1.0, x1: L1.x0 - 0.4, z1: M.z0 - 0.6 };
  area(k, rect(sq.x0, sq.z0, sq.x1, sq.z1), COBBLE, F + 0.035, { size: 1.1, bond: 0.5 });
  // a fountain: a round basin, its water, and a spout
  const fx = (sq.x0 + sq.x1) / 2 - 1, fz = (sq.z0 + sq.z1) / 2 + 2;
  b.cyl(fx, fz, F, F + 0.6, 1.7, 1.7, 12, 0xcfc6b4, { cap: 0x6f9fb8 });
  b.cyl(fx, fz, F + 0.6, F + 0.68, 1.75, 1.75, 12, 0xe0d8c8, { cap: false });
  b.cyl(fx, fz, F + 0.6, F + 1.6, 0.18, 0.12, 6, 0xb5a77f);
  k.glows.push({ x: fx, y: F + 0.62, z: fz, sx: 1.6, sy: 0.02, sz: 1.6, color: '#7fd0ff' });
  // food stalls and tables
  foodStall(k, sq.x0 + 2.2, sq.z0 + 2.4, 'S', SG.dumplings, r, steam);
  foodStall(k, sq.x1 - 2.0, sq.z1 - 2.0, 'W', SG.soup, r, steam);
  for (const [x, z] of [[fx + 3.4, fz - 3.2], [fx - 3.0, fz + 3.6], [fx + 3.6, fz + 2.6], [sq.x0 + 2.0, sq.z1 - 3.0]]) table(k, x, z, r);
  // lamps and a string of lights across the square
  for (const [x, z, yaw] of [[sq.x0 + 0.6, (sq.z0 + sq.z1) / 2, 0], [sq.x1 - 0.6, sq.z0 + 2.5, Math.PI]] as [number, number, number][]) if (clear(x, z, 0.5)) k.lamp(x, z, yaw, F);
  const posts: P2[] = [[sq.x0 + 0.5, sq.z0 + 0.5], [sq.x1 - 0.5, sq.z0 + 0.5], [sq.x1 - 0.5, sq.z1 - 0.5], [sq.x0 + 0.5, sq.z1 - 0.5]];
  for (const [x, z] of posts) b.box(x - 0.08, F, z - 0.08, x + 0.08, F + 5.6, z + 0.08, 0x5a5a5e, { faces: 'NESWT' });
  stringLights(k, posts[0], posts[2], 5.4, ['#ffd06a', '#ff7ac0', '#7ae8ff', '#ffe0a0']);
  stringLights(k, posts[1], posts[3], 5.4, ['#ffe0a0', '#ffd06a', '#ff9a5a']);
  k.lights.push({ x: (sq.x0 + sq.x1) / 2, z: (sq.z0 + sq.z1) / 2, r: 13, color: WARM, k: 0.55 });
  // crates, a cart and the crowd
  clutter(b, sq.x1 - 1.0, sq.z0 + 5.5, r);
  clutter(b, sq.x0 + 1.0, (sq.z0 + sq.z1) / 2 + 4, r);
  cart(b, sq.x1 - 2.8, (sq.z0 + sq.z1) / 2 - 1.5, Math.PI * 0.6, 0xd8a03a);
  crowd(k, sq, 16, r);

  // --- the lantern alley, between the first and third blocks
  const la: Box4 = { x0: L1.x0, z0: L1.z1 + 0.05, x1: L1.x1, z1: L3.z0 - 0.05 };
  area(k, rect(la.x0, la.z0, la.x1, la.z1), COBBLE_DARK, F + 0.035, { size: 0.8, bond: 0.5 });
  for (let x = la.x0 + 1.5, i = 0; x < la.x1 - 1; x += 2.6, i++) {
    stringLights(k, [x, la.z0 + 0.1], [x + (i % 2 ? 0.6 : -0.6), la.z1 - 0.1], 6.1 + (i % 2) * 0.4, ['#ff5a4a', '#ffb34a', '#ff7ac0'], true);
  }
  foodStall(k, (la.x0 + la.x1) / 2 + 2, (la.z0 + la.z1) / 2, 'N', SG.noodles, r, steam);
  puddle(k, la.x0 + 3.2, (la.z0 + la.z1) / 2 + 1.2, 1.4, 0.7);
  crowd(k, { x0: la.x0 + 0.4, z0: la.z0 + 1.2, x1: la.x1 - 0.4, z1: la.z1 - 1.2 }, 8, r);
  k.lights.push({ x: (la.x0 + la.x1) / 2, z: (la.z0 + la.z1) / 2, r: 10, color: '#ff9a6a', k: 0.5 });

  // --- the washing alley, between the third and sixth blocks
  const wa: Box4 = { x0: L3.x0, z0: L3.z1 + 0.05, x1: L3.x1, z1: L6.z0 - 0.05 };
  area(k, rect(wa.x0, wa.z0, wa.x1, wa.z1), COBBLE_DARK, F + 0.035, { size: 0.8, bond: 0.5 });
  for (let x = wa.x0 + 1.2; x < wa.x1 - 0.8; x += 2.4) washingLine(b, x, wa.z0 + 0.1, x + 0.4, wa.z1 - 0.1, 5.2 + r() * 0.8, r);
  clutter(b, wa.x1 - 1.2, (wa.z0 + wa.z1) / 2, r);
  puddle(k, (wa.x0 + wa.x1) / 2, (wa.z0 + wa.z1) / 2, 1.1, 0.6);
  crowd(k, { x0: wa.x0 + 0.5, z0: wa.z0 + 1.0, x1: wa.x1 - 0.5, z1: wa.z1 - 1.0 }, 4, r);
  k.lights.push({ x: (wa.x0 + wa.x1) / 2, z: (wa.z0 + wa.z1) / 2, r: 8, color: WARM, k: 0.45 });

  // --- the alley by the market, and the shore south of it
  const ma: Box4 = { x0: M.x1 + 0.1, z0: L3.z0, x1: L3.x0 - 0.1, z1: L6.z1 };
  area(k, rect(ma.x0, ma.z0, ma.x1, ma.z1), COBBLE, F + 0.035, { size: 1.1, bond: 0.5 });
  cart(b, (ma.x0 + ma.x1) / 2, L3.z0 + 4, Math.PI / 2, 0xe07b33);
  clutter(b, (ma.x0 + ma.x1) / 2 + 0.4, L6.z0 + 1.5, r);
  crowd(k, { x0: ma.x0 + 0.6, z0: ma.z0 + 1, x1: ma.x1 - 0.6, z1: ma.z1 - 1 }, 6, r);
  for (const z of [L3.z0 + 1.2, (L3.z1 + L6.z0) / 2]) lanternPost(k, (ma.x0 + ma.x1) / 2 - 1.0, z, 2.8);

  // --- the yard south of the fourth block: washing on poles, a water tank, and people at the tap
  const yd: Box4 = { x0: L4.x0, z0: L4.z1 + 0.5, x1: L4.x1, z1: L4.z1 + 9 };
  for (let i = 0; i < 3; i++) {
    const x = yd.x0 + 1 + i * 3.0;
    if (!onFloorClear(x, yd.z0 + 1) || !onFloorClear(x + 0.4, yd.z1 - 2)) continue;
    for (const z of [yd.z0 + 1, yd.z1 - 2]) b.box(x - 0.06, F, z - 0.06, x + 0.06, F + 3.3, z + 0.06, AERIAL, { faces: 'NESWT' });
    washingLine(b, x, yd.z0 + 1, x, yd.z1 - 2, 3.2, r);
  }
  {
    const tx = yd.x1 - 1.5, tz = yd.z0 + 2.5;
    if (onFloorClear(tx, tz)) {
      for (const [dx, dz] of [[-0.8, -0.8], [0.7, -0.8], [0.7, 0.7], [-0.8, 0.7]]) b.box(tx + dx, F, tz + dz, tx + dx + 0.12, F + 3.6, tz + dz + 0.12, TANK_LEGS, { faces: 'NESW' });
      b.box(tx - 1.0, F + 3.6, tz - 1.0, tx + 1.0, F + 3.75, tz + 1.0, TANK_LEGS, { faces: 'NESWTB' });
      b.cyl(tx, tz, F + 3.75, F + 5.6, 0.95, 0.95, 10, 0xa8b0b6, { cap: 0x8e969c });
      b.cyl(tx, tz, F + 5.6, F + 6.1, 0.95, 0.2, 10, 0x8e969c, { cap: false });
      b.box(tx - 0.05, F + 0.9, tz + 0.8, tx + 0.05, F + 3.6, tz + 0.9, 0x6a737c, { faces: 'NESW' });
      for (let i = 0; i < 3; i++) folk(b, tx - 1.2 + i * 0.9, tz + 1.9 + (i % 2) * 0.4, F, r);
    }
  }
  clutter(b, yd.x0 + 0.8, yd.z1 - 0.8, r);
  crowd(k, yd, 5, r);
  k.lights.push({ x: (yd.x0 + yd.x1) / 2, z: (yd.z0 + yd.z1) / 2, r: 9, color: WARM, k: 0.45 });

  // --- between the second and fourth blocks, and north of the second: a repair yard
  const ny: Box4 = { x0: L2.x0, z0: L2.z1 + 0.5, x1: L2.x1, z1: L4.z0 - 0.5 };
  crowd(k, ny, 3, r);
  clutter(b, ny.x1 - 1, (ny.z0 + ny.z1) / 2, r);
  {
    const x = (L2.x0 + L2.x1) / 2, z = L2.z0 - 3.2;
    if (onFloorClear(x, z)) {
      cart(b, x, z, 0, 0x7a5236);
      clutter(b, x + 2.6, z - 0.6, r);
      k.person(x - 2.0, z + 0.5, F);
      k.lights.push({ x, z, r: 8, color: WARM, k: 0.4 });
    }
  }

  // --- the walk along the river's east bank
  riverWalk(k, r);
  // --- the lake's east shore, by the market
  {
    for (let z = M.z0 + 1.5; z < M.z1 - 1; z += 4.2) {
      let x = M.x0 - 0.6;
      while (x > M.x0 - 3 && !inWater(x - 0.9, z)) x -= 0.2;
      if (inWater(x, z, 0.4) || x > M.x0 - 1.0) continue;
      floored(k, () => bench(b, x, z, 'W'));
      if (r() < 0.6) k.person(x + 0.1, z + 1.2, F);
    }
    lanternPost(k, M.x0 - 1.2, M.z0 + 0.4, 2.8);
    lanternPost(k, M.x0 - 1.2, M.z1 - 0.4, 2.8);
  }

  // --- steam from the stalls' pots and the flues of the kitchens and baths
  const vents = [...steam];
  STEAM.length = 0;
  if (vents.length > 0) {
    const smoke = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 80);
    k.group.add(smoke.mesh);
    const sr = rng(9031), from = new THREE.Vector3(), drift = new THREE.Vector3(0.2, 0.35, 0.1), due = vents.map(() => sr());
    k.each((dt) => {
      vents.forEach(([x, y, z], i) => {
        due[i] -= dt;
        if (due[i] > 0) return;
        due[i] = 0.5 + sr() * 0.6;
        smoke.puff(from.set(x + (sr() - 0.5) * 0.2, y, z + (sr() - 0.5) * 0.2), drift, 0.32, 0.96);
      });
      smoke.update(dt);
    });
  }
}

/** Whether a place on the floor is clear for something of this file's: on the trench's level floor, and clear of roads, water, stages and others' lots. */
const onFloorClear = (x: number, z: number): boolean => clear(x, z, 0.4) && LOTS.every((l) => !MINE.has(l.id) || !(x > l.x0 && x < l.x1 && z > l.z0 && z < l.z1)) && Math.abs(x) < 87.5 && inTrench(x, z);

/** Whether a place is on the trench's level floor. */
function inTrench(x: number, z: number): boolean {
  // the floor's south-east corner is rounded: see TRENCH in plan.ts
  const cx = 70, cz = 44, R = 18;
  if (x > cx && z > cz) return Math.hypot(x - cx, z - cz) < R - 1;
  return x < 87.5 && z < 61.5;
}

/** A string of lights between two places, `y` over the floor, sagging a little; lanterns hang from it if asked. */
function stringLights(k: Build, a: P2, c: P2, y: number, colors: string[], lanterns = false): void {
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]), sagAt = (t: number): number => Math.sin(t * Math.PI) * Math.min(0.5, len * 0.04);
  // the wire, in four lengths, sagging
  const pts: V3[] = [0, 0.25, 0.5, 0.75, 1].map((t): V3 => [a[0] + (c[0] - a[0]) * t, F + y - sagAt(t), a[1] + (c[1] - a[1]) * t]);
  k.b.sweep(pts, pts.map(() => 0.02), 0xd8d0c0);
  // a light, or a paper lantern, every unit or so along it
  const n = Math.max(3, Math.round(len / (lanterns ? 1.2 : 1.0)));
  for (let i = 1; i < n; i++) {
    const t = i / n, x = a[0] + (c[0] - a[0]) * t, z = a[1] + (c[1] - a[1]) * t, yy = F + y - sagAt(t);
    const s = lanterns ? 0.26 : 0.13;
    k.glows.push({ x, y: lanterns ? yy - 0.3 : yy - 0.08, z, sx: s, sy: lanterns ? 0.32 : s, sz: s, color: colors[i % colors.length] });
  }
}

/** A line of washing across an alley, from one wall to the other, `y` over the floor. */
function washingLine(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, r: () => number): void {
  b.beam([x0, F + y, z0], [x1, F + y - 0.15, z1], 0.025, 0.025, 0xd8d0c0);
  const n = Math.floor(Math.hypot(x1 - x0, z1 - z0) / 0.5);
  for (let i = 1; i < n; i++) {
    if (r() < 0.3) continue;
    const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, yy = F + y - 0.15 * t - Math.sin(t * Math.PI) * 0.2, h = 0.35 + r() * 0.35;
    b.box(x - 0.02, yy - h, z - 0.17, x + 0.02, yy, z + 0.17, HUES[Math.floor(r() * HUES.length)], { faces: 'NESWB' });
  }
}

/** A dark wet patch on the paving, which shines when it rains. */
function puddle(k: Build, x: number, z: number, rx: number, rz: number): void {
  flat(k.street, oval(x, z, rx, rz, 12), F + 0.05, PUDDLE, { win: { cell: 0, storey: 1, lit: 0, kind: 0 } });
}

/** People about in a place, half of them of the Colors by their hair and half the city's own: none in a lane or a stage, nor on a lot. */
function crowd(k: Build, a: Box4, n: number, r: () => number): void {
  for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) {
    const x = a.x0 + r() * (a.x1 - a.x0), z = a.z0 + r() * (a.z1 - a.z0);
    if (!onFloorClear(x, z) || LOTS.some((l) => x > l.x0 - 0.4 && x < l.x1 + 0.4 && z > l.z0 - 0.4 && z < l.z1 + 0.4)) continue;
    if (i % 3 === 0) folk(k.b, x, z, F, r);
    else k.person(x, z, F);
    i++;
  }
}

/**
 * The walk along the river's east bank, from below the mud banks to the
 * lake: a band of stone flags from the water's edge to the blocks, a low
 * kerb along the water, benches facing the river, lanterns and trees, and
 * people strolling. Nothing taller than a bench stands near the banks.
 */
function riverWalk(k: Build, r: () => number): void {
  const b = k.b, east = lotOf('centre-1').x0, z0 = lotOf('centre-1').z0 + 3.5, z1 = lotOf('centre-7').z0 - 0.5;
  /** Where the river's east bank is at a place along it. */
  const bank = (z: number): number => {
    let x = east - 0.2;
    while (x > east - 12 && !inWater(x, z)) x -= 0.1;
    return x + 0.1;
  };
  const pts: P2[] = [];
  for (let z = z0; z <= z1 + 0.01; z += 1.5) pts.push([bank(z) + 0.15, z]);
  // the flags, from the kerb to the blocks
  const shape: P2[] = [...pts, [east - 0.1, z1], [east - 0.1, z0]];
  area(k, shape, WALK, F + 0.035, { size: 1.0, bond: 0.5 });
  // the kerb along the water, a low bar of stone following the bank
  const kerb = pts.filter((_, i) => i % 2 === 0 || i === pts.length - 1).map(([x, z]): V3 => [x + 0.32, F + 0.2, z]);
  b.sweep(kerb, kerb.map(() => 0.2), 0xc9bda6);
  // benches, lanterns, trees and people along it
  floored(k, () => {
    for (let z = z0 + 4; z < z1 - 1; z += 6.5) {
      const x = bank(z) + 0.9;
      if (east - x > 1.6) bench(b, x, z, 'W');
    }
  });
  for (let z = z0 + 7; z < z1; z += 8) {
    const x = (bank(z) + east) / 2 + 0.6;
    if (z > -30) lanternPost(k, east - 0.5, z, 3.0);
    if (z > -27 && east - bank(z) > 3.2) k.tree(x, z + 3.5, 0.5 + r() * 0.1, false, F);
  }
  for (let z = z0 + 3; z < z1; z += 4.5) {
    const x = bank(z) + 1.2 + r() * Math.max(0.2, east - bank(z) - 2.4);
    if (!inWater(x, z, 0.3)) {
      if (r() < 0.3) folk(b, x, z, F, r);
      else k.person(x, z, F);
    }
  }
}

// ---------------------------------------------------------------------------
// What the tile calls
// ---------------------------------------------------------------------------

/** A model for each lot this file builds, by the id of the lot in plan.ts. */
export const MODELS: Record<string, Model> = {
  'centre-1': centre1,
  'centre-2': centre2,
  'centre-3': centre3,
  'centre-4': centre4,
  'centre-5': centre5,
  'centre-6': centre6,
  'centre-7': centre7,
  'shield-park': shieldPark,
  'pylon-nw': pylon,
  'pylon-ne': pylon,
  'pylon-sw': pylon,
  'pylon-se': pylon,
  'low-1': (k, l) => { low1(k, l); BUBBLES.push({ l, m: { n: 0.5, s: 2.3, w: 2.3, e: 1.3 } }); },
  'low-2': low2,
  'low-3': low3,
  'low-4': (k, l) => { low4(k, l); BUBBLES.push({ l, m: { n: 2.3, s: 2.3, w: 1.3, e: 1.5 } }); },
  'low-6': low6,
  market,
};

/** This file's lots. */
const MINE = new Set(Object.keys(MODELS));

/** Lots built as part of another lot's model or by `extras`, which get no box either. */
export const COVERS: string[] = [];

/** Whatever this file builds that is not one of the plan's lots: the ground of the quarter, the walks, the noise bubbles, and the pylons' crowns. */
export function extras(k: Build): void {
  quarterGround(k);
  noiseBubbles(k);
  HOUSES.length = 0;
  // the crowns, lit, so that they stand even if the show fails; the show asks for them again and is given these, and makes them flare
  buildPylonTops(k);
}
