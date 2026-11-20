// West of Fourth Street, where students live: three chapter houses round
// Washington Park, Bromley Hall and three blocks of flats; and south of
// Gregory Drive, Huff Hall and the Krannert Art Museum.
//
// The chapter houses stand on the park's west side and face east, across it:
// one Georgian, of red brick with a white portico of tall columns; one Tudor,
// half-timbered over brick, with a steep cross gable and tall chimneys; one of
// grey stone under a steep slate roof, with a tower at its corner. None
// carries a letter or a name. In the park, a game of four against four on the
// sand court.
//
// Bromley Hall is a private hall of thirteen storeys, with its pool on its
// south side. The flats are the kind Campustown is full of: brick below,
// boards or panels above, balconies, outside stairs, a car port.
//
// Huff Hall (1925, Platt and White) is the old New Gymnasium: Georgian red
// brick, a long slate roof, tall arched windows down both sides, and three
// arched doors in a pedimented front on Fourth Street. The Krannert Art Museum
// is a low Miesian box of white Vermont marble (1961, Ambrose Richardson) with
// a gold screen across its south face and the gravel bed of its old reflecting
// pool before it, and east of it the Kinkead Pavilion (1988, Booth/Hansen) of
// marble and copper, its door on Sixth Street between two leaning pylons.

import { interior, type BoxOpts, type GeoBuilder, type QuadOpts, type V3, type WinSpec } from '../../engine/geo';
import { area, rect } from '../../engine/ground';
import { D, Q, hipped, lantern, parasol, pinnacle, roundel } from '../../engine/parts';
import { face3, gable, hip, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { BASE, BRICK, DARK, FELT, GLASS, HALL, LIMESTONE, SLATE, STOREY, TRIM, VERDIGRIS, chimney, dormer, steps } from './look';
import { AREAS, type LotDef, type Model } from './plan';

// --- colours of this file's own (worth moving to look.ts if another file wants them) ---

/** The Tudor house's stucco, its timbers, its roof of dark tiles and its flagstones; the stone house's grey. */
const STUCCO = 0xeee4cc, TIMBER = 0x4a3528, TILE = 0x5b4a45, FLAG = 0xb9b2a2, STONE = 0xa9a69d, STONE_DARK = 0x86837b;
/** Window glass that reads dark by day; a door of oak. */
const PANE = 0x2a3440, OAK = 0x3b2a20;
/** The flats: lap siding, charcoal panels, buff brick, beige vinyl; concrete; the rails; a bin store's boards; asphalt. */
const SIDING = 0xc8c2b4, CHARCOAL = 0x5d6670, BUFF = 0xc79f72, VINYL = 0xd6ccb4, CONCRETE = 0xbdb8ae, RAIL = 0x6a717a, BOARDS = 0x8b6b4b, ASPHALT = 0x5b5d63;
/** Bromley Hall: its pale precast, its brown brick, and its pool. */
const PRECAST = 0xd8cdb6, POOL = 0x58b5d8, HEDGE = 0x4f7f45;
/** The art museum's white marble, its gold screen, the gravel of its old pool, and the sculpture's weathering steel. */
const MARBLE = 0xeeeae0, GOLD = 0xd9b24a, GRAVEL = 0xbdb6a8, RUST = 0xb5452f;
/** Ground and small things. */
const LAWN = 0x6fa85a, WALK = 0xd8d2c4, WHITE = 0xf2f0ea, TYRE = 0x3a3d44, IRON_LIGHT = 0x9a9fa6;

// --- how walls are glazed ---

/** The chapter houses: three storeys of 2.6, so that the walls stand 7.8 high. */
const FLOOR = 2.6, WALLS = 3 * FLOOR;
const HOUSE: WinSpec = { cell: 1.45, storey: FLOOR, lit: 0.45, kind: 0 };
const TOWER_SLITS: WinSpec = { cell: 1.3, storey: 2.8, lit: 0.4, kind: 4 };
/** Flats of three storeys at the campus's 2.9, and of four at 2.4. */
const FLAT: WinSpec = { cell: 1.6, storey: STOREY, lit: 0.45, kind: 0 };
const FLAT4: WinSpec = { cell: 1.5, storey: 2.4, lit: 0.45, kind: 0 };
/** Bromley Hall: a lobby of glass two rows high, and twelve floors of 1.3 above it, so that it reads as thirteen storeys. */
const BROM: WinSpec = { cell: 1.15, storey: 1.3, lit: 0.42, kind: 0 };
const LOBBY: WinSpec = { cell: 1.3, storey: 2.6, lit: 0.7, kind: 1 };
const MUSEUM_GLASS: WinSpec = { cell: 1.2, storey: STOREY, lit: 0.75, kind: 1 };

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------

const board = (id: string, text: string, color = '#f3f0e7', ink = '#13294b', real = true): SignDef => {
  const aspect = Math.max(1, text.length * 0.62);
  return { id, lines: [text], color, ink, aspect, kind: 'board', real, size: [Math.round(52 * aspect), 52] };
};

export const SIGNS: SignDef[] = [
  board('houses-huff', 'HUFF HALL'),
  board('houses-kam', 'KRANNERT ART MUSEUM'),
  // a private hall: its name in plain dark letters on a light board, as Illini Tower's is
  board('houses-bromley', 'BROMLEY HALL', '#ecebe6', '#2a2d33'),
  // a trade, not a name: what every block in Campustown hangs in August
  board('houses-leasing', 'NOW LEASING', '#2f6d4a', '#ffffff', false),
];

// ---------------------------------------------------------------------------
// Helpers: things against a wall that looks N, S, E or W
// ---------------------------------------------------------------------------

type Side = 'N' | 'S' | 'E' | 'W';
const sgn = (out: Side): number => (out === 'S' || out === 'E' ? 1 : -1);
/** Whether the wall runs along x (it looks north or south). */
const alongX = (out: Side): boolean => out === 'N' || out === 'S';
const nrm = (out: Side): [number, number] => (alongX(out) ? [0, sgn(out)] : [sgn(out), 0]);
/** The two faces at the ends of a thin thing on a wall. */
const ends = (out: Side): string => (alongX(out) ? 'EW' : 'NS');

/** A box against a wall that looks `out`: from `a0` to `a1` along the wall, and from `o0` to `o1` out from it. */
function against(b: GeoBuilder, out: Side, a0: number, a1: number, wall: number, o0: number, o1: number, y0: number, y1: number, color: number, o: BoxOpts = {}): void {
  const s = sgn(out);
  const lo = Math.min(wall + s * o0, wall + s * o1), hi = Math.max(wall + s * o0, wall + s * o1);
  if (alongX(out)) b.box(a0, y0, lo, a1, y1, hi, color, o);
  else b.box(lo, y0, a0, hi, y1, a1, color, o);
}

/** A point `a` along a wall, `o` out from it, at height `y`. */
const onWall = (out: Side, a: number, wall: number, o: number, y: number): V3 => (alongX(out) ? [a, y, wall + sgn(out) * o] : [wall + sgn(out) * o, y, a]);

/** A half disc upright on a wall: the head of an arched door or window. */
function half(b: GeoBuilder, out: Side, a: number, wall: number, o: number, y: number, r: number, color: number, q: QuadOpts = {}, n = 6): void {
  const [nx, nz] = nrm(out);
  const p = (i: number): V3 => onWall(out, a + Math.cos((Math.PI * i) / n) * r, wall, o, y + Math.sin((Math.PI * i) / n) * r);
  for (let i = 0; i < n; i++) face3(b, onWall(out, a, wall, o, y), p(i), p(i + 1), [nx, 0, nz], color, q);
}

/** A pointed head, for a Gothic door: one triangle. */
function pointed(b: GeoBuilder, out: Side, a: number, wall: number, o: number, y: number, r: number, color: number, q: QuadOpts = {}): void {
  const [nx, nz] = nrm(out);
  face3(b, onWall(out, a - r, wall, o, y), onWall(out, a + r, wall, o, y), onWall(out, a, wall, o, y + r * 1.5), [nx, 0, nz], color, q);
}

/** A strip of timber flat on a wall, from one point to another: a brace. */
function strip(b: GeoBuilder, out: Side, a0: number, y0: number, a1: number, y1: number, wall: number, o: number, w: number, color: number): void {
  const [nx, nz] = nrm(out), d = Math.hypot(a1 - a0, y1 - y0) || 1;
  const pa = (-(y1 - y0) / d) * (w / 2), py = ((a1 - a0) / d) * (w / 2);
  b.quad(onWall(out, a0 + pa, wall, o, y0 + py), onWall(out, a0 - pa, wall, o, y0 - py), onWall(out, a1 - pa, wall, o, y1 - py), onWall(out, a1 + pa, wall, o, y1 + py), [nx, 0, nz], color);
}

/**
 * A tall round-headed window, built: a frame of stone, the glass lit from
 * within at night, a bar up its middle and one across at the springing, and a
 * keystone. Its sides rise from `y0` to `spring`, and the arch on them is `r`.
 */
function archWin(b: GeoBuilder, out: Side, a: number, wall: number, y0: number, spring: number, r: number, lit: number): void {
  const f = r + 0.17;
  against(b, out, a - f, a + f, wall, 0, 0.03, y0 - 0.15, spring, LIMESTONE, { faces: out });
  half(b, out, a, wall, 0.03, spring, f, LIMESTONE);
  against(b, out, a - r, a + r, wall, 0.03, 0.06, y0, spring, PANE, { faces: out, win: interior(lit) });
  half(b, out, a, wall, 0.06, spring, r, PANE, { win: interior(lit) });
  against(b, out, a - 0.05, a + 0.05, wall, 0.06, 0.12, y0, spring + r - 0.06, TRIM, { faces: out });
  against(b, out, a - r, a + r, wall, 0.06, 0.09, spring - 0.05, spring + 0.05, TRIM, { faces: out });
  against(b, out, a - 0.16, a + 0.16, wall, 0, 0.1, spring + f - 0.22, spring + f + 0.1, LIMESTONE, { faces: out + ends(out) + 'T' });
}

/** A name board on a wall that faces (nx, nz): a thin box proud of the wall, the sign 0.03 in front of it. */
function nameBoard(k: Build, id: string, x: number, y: number, z: number, nx: number, nz: number, h: number, w: number, color = TRIM): void {
  const d = 0.1, hw = w / 2 + 0.12, hh = h / 2 + 0.08;
  if (nz !== 0) k.b.box(x - hw, y - hh, nz > 0 ? z : z - d, x + hw, y + hh, nz > 0 ? z + d : z, color, { faces: nz > 0 ? 'SEWTB' : 'NEWTB' });
  else k.b.box(nx > 0 ? x : x - d, y - hh, z - hw, nx > 0 ? x + d : x, y + hh, z + hw, color, { faces: nx > 0 ? 'ENSTB' : 'WNSTB' });
  k.sign(id, x + nx * (d + 0.03), y, z + nz * (d + 0.03), nx, nz, h, w);
}

/** A slim round column with a square capital, from `y0` to `y1`. */
function col(b: GeoBuilder, x: number, z: number, y0: number, y1: number, r: number, color = TRIM): void {
  b.cyl(x, z, y0, y1 - 0.24, r, r * 0.88, 6, color, { cap: false });
  b.box(x - r * 1.35, y1 - 0.24, z - r * 1.35, x + r * 1.35, y1, z + r * 1.35, color, { faces: 'NESWB' });
}

/** A garden chair that faces (cos yaw, sin yaw): a seat and a back. */
function chair(b: GeoBuilder, x: number, y: number, z: number, yaw: number, color: number): void {
  b.moved(x, y, z, yaw, () => {
    b.box(-0.3, 0, -0.3, 0.3, 0.45, 0.3, color, { faces: 'NESWT' });
    b.box(-0.34, 0.45, -0.3, -0.22, 1.15, 0.3, color, { faces: 'NESWT' });
  });
}

/** A bicycle that points along (cos yaw, sin yaw): two wheels and a frame, standing at `y`. */
function bike(b: GeoBuilder, x: number, y: number, z: number, yaw: number, color: number): void {
  b.moved(x, y, z, yaw, () => {
    for (const u of [-0.48, 0.48]) b.box(u - 0.34, 0.02, -0.03, u + 0.34, 0.7, 0.03, TYRE, { faces: 'NSEWT' });
    b.box(-0.5, 0.5, -0.05, 0.5, 0.66, 0.05, color, { faces: 'NSEWT' });
    b.box(0.32, 0.66, -0.2, 0.4, 0.95, 0.2, 0x2a2d33, { faces: 'NSEWT' });
  });
}

/** A balcony on a wall that looks `out`, its floor at `y`: a slab, and a solid rail across its front. */
function balcony(b: GeoBuilder, out: Side, a0: number, a1: number, wall: number, reach: number, y: number, rail: number, glass = false): void {
  against(b, out, a0, a1, wall, 0, reach, y - 0.15, y, CONCRETE, { faces: out + ends(out) + 'TB' });
  against(b, out, a0, a1, wall, reach - 0.06, reach, y, y + 0.85, rail, glass ? { faces: 'NSEWT', win: interior(0.25) } : { faces: 'NSEWT' });
}

/** A flat roof's edge: a box of trim over the whole roof, its top the felt. */
function roofCap(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, color: number): void {
  b.box(x0, y0, z0, x1, y1, z1, color, { faces: 'NESWTB', top: FELT });
}

/** A unit of plant on a flat roof. */
function plant(b: GeoBuilder, x: number, z: number, y: number, w: number, d: number, h: number): void {
  b.box(x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2, 0xa9adb3, { faces: 'NESWT', top: 0x8d9198 });
}

const park = (): { x0: number; z0: number; x1: number; z1: number } => {
  const a = AREAS.find((p) => p.id === 'washington-park');
  return a ?? { x0: -68, z0: -46, x1: -60, z1: -18 };
};

// ---------------------------------------------------------------------------
// The chapter houses round Washington Park, each facing east across it
// ---------------------------------------------------------------------------

/** A house's lawn, from the back of its lot to the park, and a walk from its steps to the park. */
function frontLawn(k: Build, l: LotDef, zc: number): void {
  const east = park().x0;
  area(k, rect(l.x0 + 0.1, l.z0 + 0.1, east, l.z1 - 0.1), LAWN, 0.035);
  area(k, rect(l.x1 - 0.3, zc - 0.7, east, zc + 0.7), WALK, 0.045);
}

/** The Georgian house: red brick under a slate hip roof, a white portico of four tall columns under a pediment. */
function georgian(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, zc = (z0 + z1) / 2;
  const fx = x1 - 2.0, bx0 = Math.max(x0 + 0.6, fx - 7), bz0 = z0 + 0.2, bz1 = z1 - 0.2;
  const EAVE = WALLS + 0.3, RISE = 2.8, OVER = 0.35;
  frontLawn(k, l, zc);

  b.box(bx0, 0, bz0, fx, WALLS, bz1, BRICK.red, { win: HOUSE, seed: 0.17, faces: 'NESW' });
  b.box(bx0 - 0.08, 0, bz0 - 0.08, fx + 0.08, 0.5, bz1 + 0.08, BASE, { faces: 'NESWT' });
  b.box(bx0 - 0.05, FLOOR - 0.06, bz0 - 0.05, fx + 0.05, FLOOR + 0.06, bz1 + 0.05, TRIM, { faces: 'NESWTB' });
  b.box(bx0 - 0.2, WALLS, bz0 - 0.2, fx + 0.2, EAVE, bz1 + 0.2, TRIM, { faces: 'NESWB' });
  hip(b, bx0, bz0, fx, bz1, EAVE, RISE, SLATE, OVER);
  // a chimney at each end, rising from the end slopes
  const cx = (bx0 + fx) / 2;
  for (const z of [bz0 + 0.45, bz1 - 0.45]) chimney(b, cx, z, EAVE + 0.4, EAVE + RISE + 0.3, BRICK.deep, 0.65, 0.35);
  // two dormers on the front slope, either side of the pediment
  const run = (Math.min(fx - bx0, bz1 - bz0) + 2 * OVER) / 2, at = 0.55;
  const sill = EAVE + ((at + OVER) * RISE) / run - 0.15;
  for (const dz of [-2.45, 2.45]) dormer(b, fx - at, zc + dz, sill, 'E', SLATE);

  // the portico: a floor of stone, steps, four columns two storeys tall, and a pediment with an oculus
  const pz0 = zc - 2.7, pz1 = zc + 2.7, px1 = x1 - 0.1, FLR = 0.6, TOP = 2 * FLOOR + 0.4;
  b.box(fx, 0, pz0, px1, FLR, pz1, LIMESTONE, { faces: 'NEST' });
  steps(b, zc - 1.5, zc + 1.5, px1, FLR, 'E', LIMESTONE, 0.4);
  for (const dz of [-2.3, -0.8, 0.8, 2.3]) col(b, px1 - 0.38, zc + dz, FLR, TOP, 0.2);
  b.box(fx, TOP, pz0, px1, TOP + 0.55, pz1, TRIM, { faces: 'NESTB' });
  gable(b, fx, pz0, px1, pz1, TOP + 0.55, 1.35, SLATE, TRIM, 'x', 0.15);
  roundel(b, [px1 + 0.03, TOP + 1.0, zc], 0.28, 'E', GLASS, { win: interior(0.8) }, 8);
  // the door, white-framed, with a fanlight over it
  against(b, 'E', zc - 0.85, zc + 0.85, fx, 0, 0.09, FLR, 2.9, TRIM, { faces: 'E' });
  half(b, 'E', zc, fx, 0.09, 2.9, 0.85, TRIM);
  against(b, 'E', zc - 0.6, zc + 0.6, fx, 0.09, 0.12, FLR, 2.9, DARK, { faces: 'E', win: interior(1.2) });
  half(b, 'E', zc, fx, 0.12, 2.9, 0.6, GLASS, { win: interior(1.0) });
  for (const dz of [-1.15, 1.15]) k.glows.push({ x: fx + 0.15, y: 2.3, z: zc + dz, sx: 0.22, sy: 0.36, sz: 0.22, color: '#ffe2ae' });
  k.lights.push({ x: x1 + 1.5, z: zc, r: 9, color: '#ffe2ae', k: 0.5 });
  // a balcony over the door, under the portico, with a white rail
  b.box(fx, 3.8, zc - 1.1, fx + 0.75, 3.92, zc + 1.1, TRIM, { faces: 'NESTB' });
  b.box(fx + 0.69, 3.92, zc - 1.1, fx + 0.75, 4.75, zc + 1.1, TRIM, { faces: 'NESWT' });
  against(b, 'E', zc - 0.5, zc + 0.5, fx, 0, 0.04, 3.92, 5.4, DARK, { faces: 'E', win: interior(0.9) });
  // white quoins at the corners
  for (const x of [bx0, fx]) for (const z of [bz0, bz1]) b.box(x - 0.12, 0.5, z - 0.12, x + 0.12, WALLS, z + 0.12, TRIM, { faces: 'NESW' });
  // two lamps on posts where the walk meets the park
  for (const dz of [-1.0, 1.0]) lantern(k, park().x0 - 0.4, zc + dz, 0.035, 1.6, 0x2a2d33);
  // and a door at the back, with a step
  against(b, 'W', zc - 0.5, zc + 0.5, bx0, 0, 0.04, 0.3, 2.4, DARK, { faces: 'W', win: interior(0.8) });
  steps(b, zc - 0.7, zc + 0.7, bx0, 0.3, 'W', LIMESTONE, 0.4);

  // on the porch and on the lawn: two chairs, a game of cornhole, and those playing it
  k.person(px1 - 1.0, zc - 1.6, FLR);
  k.person(px1 - 0.8, zc + 1.5, FLR);
  k.person(fx + 0.9, zc + 0.4, FLR);
  k.person(x1 + 0.9, zc - 0.3);
  chair(b, x1 + 2.3, 0.035, z1 - 1.0, Math.PI * 0.75, WHITE);
  chair(b, x1 + 3.3, 0.035, z1 - 1.3, Math.PI * 0.85, WHITE);
  for (const x of [x1 + 0.6, x1 + 4.0]) slab(b, [x, 0.12, z0 + 1.0], [x + (x < x1 + 2 ? 0.7 : -0.7), 0.42, z0 + 1.0], 0.3, 0.06, 0xc7a46b);
  k.person(x1 + 0.2, z0 + 1.9);
  k.person(x1 + 4.6, z0 + 1.6);
}

/** The Tudor house: brick below, stucco and timber above, a steep roof of dark tiles with a cross gable towards the park, and tall chimneys. */
function tudor(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, zc = (z0 + z1) / 2;
  const fx = x1 - 1.8, bx0 = Math.max(x0 + 0.6, fx - 7.2), bz0 = z0 + 0.2, bz1 = z1 - 0.2;
  const RISE = 3.3, OVER = 0.35;
  frontLawn(k, l, (bz0 + bz1 - 3.9) / 2);

  b.box(bx0, 0, bz0, fx, FLOOR, bz1, BRICK.deep, { win: HOUSE, seed: 0.41, faces: 'NESW' });
  b.box(bx0, FLOOR, bz0, fx, WALLS, bz1, STUCCO, { win: HOUSE, seed: 0.43, faces: 'NESW' });
  b.box(bx0 - 0.05, FLOOR - 0.08, bz0 - 0.05, fx + 0.05, FLOOR + 0.08, bz1 + 0.05, TIMBER, { faces: 'NESWTB' });
  gable(b, bx0, bz0, fx, bz1, WALLS, RISE, TILE, STUCCO, 'z', OVER);
  const cx = (bx0 + fx) / 2, run = (fx - bx0) / 2 + OVER, endTop = WALLS + (RISE * (fx - bx0)) / 2 / run;

  // the cross gable, towards the park
  const wz0 = bz1 - 3.9, wz1 = bz1 - 0.5, wx1 = x1 - 0.35, wzc = (wz0 + wz1) / 2;
  b.box(fx, 0, wz0, wx1, FLOOR, wz1, BRICK.deep, { win: HOUSE, seed: 0.47, faces: 'NES' });
  b.box(fx, FLOOR, wz0, wx1, WALLS, wz1, STUCCO, { faces: 'NES' });
  b.box(fx, FLOOR - 0.08, wz0 - 0.05, wx1 + 0.05, FLOOR + 0.08, wz1 + 0.05, TIMBER, { faces: 'NESTB' });
  const WRISE = 2.6, wrun = (wz1 - wz0) / 2 + 0.3, wTop = WALLS + (WRISE * (wz1 - wz0)) / 2 / wrun;
  gable(b, fx - 3.0, wz0, wx1, wz1, WALLS, WRISE, TILE, STUCCO, 'x', 0.3);
  // its half-timbering: rails, posts, braces, a king post in the gable, and leaded windows between
  const t = (a0: number, a1: number, y0: number, y1: number): void => against(b, 'E', a0, a1, wx1, 0, 0.05, y0, y1, TIMBER, { faces: 'E' });
  t(wz0, wz1, 5.13, 5.27);
  t(wz0, wz1, WALLS - 0.14, WALLS);
  for (const a of [wz0 + 0.07, wz0 + 1.0, wz1 - 1.0, wz1 - 0.07]) against(b, 'E', a - 0.07, a + 0.07, wx1, 0, 0.07, FLOOR + 0.08, WALLS, TIMBER, { faces: 'E' });
  for (const [y0, y1] of [[FLOOR + 0.08, 5.13], [5.27, WALLS - 0.14]]) {
    strip(b, 'E', wz0 + 0.14, y0, wz0 + 0.93, y1, wx1, 0.04, 0.12, TIMBER);
    strip(b, 'E', wz1 - 0.14, y0, wz1 - 0.93, y1, wx1, 0.04, 0.12, TIMBER);
    against(b, 'E', wz0 + 1.12, wz1 - 1.12, wx1, 0, 0.03, y0 + 0.4, y1 - 0.35, PANE, { faces: 'E', win: interior(0.9) });
    t(wzc - 0.04, wzc + 0.04, y0 + 0.4, y1 - 0.35);
  }
  t(wzc - 0.07, wzc + 0.07, WALLS, wTop - 0.1);
  strip(b, 'E', wz0 + 0.5, WALLS + 0.05, wzc - 0.12, wTop - 0.45, wx1, 0.04, 0.12, TIMBER);
  strip(b, 'E', wz1 - 0.5, WALLS + 0.05, wzc + 0.12, wTop - 0.45, wx1, 0.04, 0.12, TIMBER);
  // the main front's timbers, north of the cross gable
  for (const y of [5.13, WALLS - 0.14]) against(b, 'E', bz0, wz0, fx, 0, 0.04, y, y + 0.14, TIMBER, { faces: 'E' });
  against(b, 'E', bz0, bz0 + 0.14, fx, 0, 0.07, FLOOR + 0.08, WALLS, TIMBER, { faces: 'E' });
  // the south gable end: a rail, a king post and two braces, with the chimney to one side
  against(b, 'S', bx0, fx, bz1, 0, 0.04, WALLS - 0.14, WALLS, TIMBER, { faces: 'S' });
  against(b, 'S', cx - 0.07, cx + 0.07, bz1, 0, 0.04, WALLS, endTop - 0.1, TIMBER, { faces: 'S' });
  strip(b, 'S', cx + 0.6, WALLS + 0.05, cx + 2.6, WALLS + 1.6, bz1, 0.04, 0.12, TIMBER);
  strip(b, 'S', cx - 0.6, WALLS + 0.05, cx - 2.6, WALLS + 1.6, bz1, 0.04, 0.12, TIMBER);

  // the chimneys: a tall stack on the south end, outside the wall, with two pots; and one through the back slope
  const sc = cx - 1.7;
  against(b, 'S', sc - 0.7, sc + 0.7, bz1, -0.25, 0.2, 0, 6.6, BRICK.deep, { faces: 'ESWT' });
  against(b, 'S', sc - 0.42, sc + 0.42, bz1, -0.25, 0.2, 6.6, 11.0, BRICK.deep, { faces: 'NESW' });
  against(b, 'S', sc - 0.5, sc + 0.5, bz1, -0.33, 0.28, 10.75, 11.0, LIMESTONE, { faces: 'NESWTB' });
  for (const dx of [-0.2, 0.2]) b.cyl(sc + dx, bz1 - 0.02, 11.0, 11.45, 0.13, 0.11, 6, 0xb5683f, { cap: false });
  chimney(b, bx0 + 1.8, bz0 + 1.3, WALLS + 1.6, 11.2, BRICK.deep, 0.5, 0.45);

  // the terrace before the door: flagstones, a low wall of brick with a gap for the step, and chairs
  const dz = (bz0 + wz0) / 2, tz0 = bz0 + 0.1, tz1 = wz0 - 0.1, TF = 0.35;
  b.box(fx, 0, tz0, x1 - 0.2, TF, tz1, FLAG, { faces: 'NEST' });
  b.box(x1 - 0.42, TF, tz0, x1 - 0.2, 0.85, dz - 0.6, BRICK.deep, { faces: 'NESWT' });
  b.box(x1 - 0.42, TF, dz + 0.6, x1 - 0.2, 0.85, tz1, BRICK.deep, { faces: 'NESWT' });
  steps(b, dz - 0.6, dz + 0.6, x1 - 0.2, TF, 'E', FLAG, 0.45);
  // the door: oak, round-headed, in a frame of stone, under a little gabled hood
  against(b, 'E', dz - 0.75, dz + 0.75, fx, 0, 0.09, TF, 2.5, LIMESTONE, { faces: 'E' });
  half(b, 'E', dz, fx, 0.09, 2.5, 0.75, LIMESTONE);
  against(b, 'E', dz - 0.52, dz + 0.52, fx, 0.09, 0.12, TF, 2.5, OAK, { faces: 'E', win: interior(1.1) });
  half(b, 'E', dz, fx, 0.12, 2.5, 0.52, OAK, { win: interior(1.1) });
  b.box(fx, 3.4, dz - 0.95, fx + 0.75, 3.5, dz + 0.95, TIMBER, { faces: 'NESB' });
  gable(b, fx - 0.2, dz - 0.95, fx + 0.75, dz + 0.95, 3.5, 0.65, TILE, STUCCO, 'x', 0.08);
  k.glows.push({ x: fx + 0.2, y: 2.9, z: dz - 1.0, sx: 0.22, sy: 0.34, sz: 0.22, color: '#ffe2ae' });
  k.lights.push({ x: x1 + 1.2, z: dz, r: 9, color: '#ffe2ae', k: 0.5 });
  chair(b, fx + 0.8, TF, tz0 + 0.55, Math.PI / 2, 0x7d5a3c);
  chair(b, fx + 0.8, TF, tz1 - 0.55, -Math.PI / 2, 0x7d5a3c);
  k.person(fx + 1.4, tz0 + 0.6, TF);
  k.person(fx + 1.3, tz1 - 0.5, TF);
  k.person(x1 - 0.9, dz + 0.2, TF);

  // on the lawn: lamps where the walk meets the park, a grill and two chairs, and whoever is at the grill
  for (const s of [-1.0, 1.0]) lantern(k, park().x0 - 0.4, dz + s, 0.035, 1.6, 0x2a2d33);
  const gx = x1 + 2.6, gz = z1 - 1.3;
  b.cyl(gx, gz, 0.75, 1.0, 0.33, 0.33, 6, 0x24262b);
  b.cyl(gx, gz, 1.0, 1.2, 0.33, 0.12, 6, 0x24262b, { cap: false });
  b.box(gx - 0.05, 0.035, gz - 0.05, gx + 0.05, 0.75, gz + 0.05, IRON_LIGHT, { faces: 'NESW' });
  k.glows.push({ x: gx, y: 1.25, z: gz, sx: 0.15, sy: 0.1, sz: 0.15, color: '#ff9a4a' });
  k.person(gx - 0.8, gz);
  chair(b, x1 + 1.2, 0.035, z1 - 0.8, -Math.PI / 4, 0x2f66b3);
  chair(b, x1 + 3.8, 0.035, z1 - 0.4, -Math.PI * 0.7, 0x2f66b3);
  k.person(x1 + 1.5, z1 - 1.8);
}

/** The stone house: grey stone under a steep slate roof, a tower with a spire at its south-east corner, and a Gothic door in a gabled bay. */
function stone(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l;
  const fx = x1 - 1.9, bx0 = Math.max(x0 + 0.6, fx - 6.4), bz0 = z0 + 0.2;
  // the tower stands at the south end of the house, clear of its roof
  const tx0 = fx - 1.2, tx1 = fx + 1.45, tz1 = z1 - 0.1, tz0 = tz1 - 2.65, TH = 8.4, bz1 = tz0 + 0.05;
  const EAVE = WALLS + 0.25, RISE = 2.7, OVER = 0.3, zc = (bz0 + bz1) / 2;

  b.box(bx0, 0, bz0, fx, WALLS, bz1, STONE, { win: HOUSE, seed: 0.61, faces: 'NESW' });
  b.box(bx0 - 0.08, 0, bz0 - 0.08, fx + 0.08, 0.55, bz1 + 0.08, STONE_DARK, { faces: 'NESWT' });
  b.box(bx0 - 0.12, WALLS, bz0 - 0.12, fx + 0.12, EAVE, bz1 + 0.12, LIMESTONE, { faces: 'NESWB' });
  hip(b, bx0, bz0, fx, bz1, EAVE, RISE, SLATE, OVER);
  chimney(b, bx0 + 2.4, zc, WALLS + 1.2, 11.2, STONE_DARK, 0.5, 0.45);

  // the tower: three storeys of slit windows, a stone cornice, and a spire of slate
  const tcx = (tx0 + tx1) / 2, tcz = (tz0 + tz1) / 2, th = (tx1 - tx0) / 2 + 0.15;
  b.box(tx0, 0, tz0, tx1, TH, tz1, STONE, { win: TOWER_SLITS, seed: 0.66, faces: 'NESW' });
  b.box(tx0 - 0.08, 0, tz0 - 0.08, tx1 + 0.08, 0.62, tz1 + 0.08, STONE_DARK, { faces: 'NESWT' });
  b.box(tcx - th, TH - 0.3, tcz - th, tcx + th, TH, tcz + th, LIMESTONE, { faces: 'NESWTB' });
  b.cyl(tcx, tcz, TH, 11.45, (th - 0.38) * D, 0.05, 4, SLATE, { phase: Q, cap: false });
  // a pinnacle at each corner of the tower, and quoins of pale stone up its corners and the house's
  for (const x of [tcx - th + 0.18, tcx + th - 0.18]) for (const z of [tcz - th + 0.18, tcz + th - 0.18]) pinnacle(b, x, z, TH, 1.5, 0.17, LIMESTONE);
  for (const x of [tx0, tx1]) for (const z of [tz0, tz1]) if (!(x === tx0 && z === tz0)) b.box(x - 0.13, 0.55, z - 0.13, x + 0.13, TH - 0.3, z + 0.13, LIMESTONE, { faces: 'NESW' });
  for (const [x, z] of [[bx0, bz0], [fx, bz0], [bx0, bz1]]) b.box(x - 0.13, 0.55, z - 0.13, x + 0.13, WALLS, z + 0.13, LIMESTONE, { faces: 'NESW' });
  // a band of stone under the windows of the upper floors, and a buttress on the tower's south face
  b.box(bx0 - 0.06, FLOOR - 0.07, bz0 - 0.06, fx + 0.06, FLOOR + 0.07, bz1 + 0.06, LIMESTONE, { faces: 'NESWTB' });
  b.box(tx0 - 0.06, FLOOR - 0.09, tz0 - 0.06, tx1 + 0.06, FLOOR + 0.09, tz1 + 0.06, LIMESTONE, { faces: 'NESWTB' });

  // the bay with its gable, and the Gothic door in it
  const bq0 = bz0 + 0.8, bq1 = bz1 - 0.8, bc = (bq0 + bq1) / 2, bx1 = fx + 0.5;
  b.box(fx, 0, bq0, bx1, WALLS, bq1, STONE, { win: HOUSE, seed: 0.63, faces: 'NES' });
  gable(b, fx - 2.4, bq0, bx1, bq1, WALLS, 2.3, SLATE, STONE, 'x', 0.15);
  against(b, 'E', bc - 0.22, bc + 0.22, bx1, 0, 0.03, WALLS + 0.3, WALLS + 1.35, PANE, { faces: 'E', win: interior(0.8) });
  const TF = 0.45;
  against(b, 'E', bc - 0.8, bc + 0.8, bx1, 0, 0.03, TF, 2.4, LIMESTONE, { faces: 'E' });
  pointed(b, 'E', bc, bx1, 0.03, 2.4, 0.8, LIMESTONE);
  against(b, 'E', bc - 0.55, bc + 0.55, bx1, 0.03, 0.06, TF, 2.4, OAK, { faces: 'E', win: interior(1.1) });
  pointed(b, 'E', bc, bx1, 0.06, 2.4, 0.55, OAK, { win: interior(1.1) });

  // the terrace across the front, north of the tower, with a stone balustrade and a gap for the steps
  const tz = tz0 - 0.1;
  b.box(fx, 0, bz0 + 0.1, x1 - 0.2, TF, tz, FLAG, { faces: 'NEST' });
  b.box(x1 - 0.45, TF, bz0 + 0.1, x1 - 0.2, 1.05, bc - 0.75, LIMESTONE, { faces: 'NESWT' });
  b.box(x1 - 0.45, TF, bc + 0.75, x1 - 0.2, 1.05, tz, LIMESTONE, { faces: 'NESWT' });
  steps(b, bc - 0.75, bc + 0.75, x1 - 0.2, TF, 'E', FLAG, 0.45);
  k.glows.push({ x: bx1 + 0.12, y: 2.9, z: bc + 1.05, sx: 0.22, sy: 0.34, sz: 0.22, color: '#ffe2ae' });
  k.lights.push({ x: x1 + 1.3, z: bc, r: 9, color: '#ffe2ae', k: 0.5 });
  k.person(x1 - 0.9, bz0 + 0.6, TF);
  k.person(bx1 + 0.6, bq0 + 0.3, TF);

  // the lawn: lamps where the walk meets the park, a fire pit with chairs round it, and two people at it
  frontLawn(k, l, bc);
  for (const dz of [-1.0, 1.0]) lantern(k, park().x0 - 0.4, bc + dz, 0.035, 1.6, 0x2a2d33);
  const px = x1 + 2.6, pz = zc + 1.6;
  b.cyl(px, pz, 0.035, 0.35, 0.55, 0.5, 8, STONE_DARK, { cap: 0x2a2522 });
  k.glows.push({ x: px, y: 0.45, z: pz, sx: 0.4, sy: 0.15, sz: 0.4, color: '#ff8a3a' });
  k.lights.push({ x: px, z: pz, r: 4, color: '#ffb067', k: 0.45 });
  chair(b, px - 1.2, 0.035, pz, 0, 0x8a6a4a);
  chair(b, px + 1.1, 0.035, pz - 0.4, Math.PI, 0x8a6a4a);
  k.person(px + 0.2, pz + 1.1);
  k.person(px - 0.4, pz - 1.0);
}

// ---------------------------------------------------------------------------
// Bromley Hall
// ---------------------------------------------------------------------------

/**
 * Bromley Hall: a slab of thirteen storeys in pale precast, with brown brick
 * piers at its corners and up the middle of each end, a lobby of glass under
 * it, a crown with its name on the south, and its pool and sun deck on the
 * south side of the lot.
 */
function bromley(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1, h } = l;
  const tx0 = x0 + 0.5, tx1 = x1 - 0.5, tz0 = z0 + 0.5, tz1 = Math.min(z1 - 3.4, z0 + 6.8);
  const POD = 2 * BROM.storey, TOP = POD + 12 * BROM.storey, cx = (tx0 + tx1) / 2, cz = (tz0 + tz1) / 2;

  // the lobby, set back under the tower, and the posts that carry it
  b.box(tx0 + 0.35, 0, tz0 + 0.35, tx1 - 0.35, POD, tz1 - 0.35, GLASS, { win: LOBBY, seed: 0.2, faces: 'NESW' });
  for (const x of [tx0 + 0.2, cx, tx1 - 0.2]) for (const z of [tz0 + 0.2, tz1 - 0.2]) b.box(x - 0.2, 0, z - 0.2, x + 0.2, POD, z + 0.2, PRECAST, { faces: 'NESW' });
  // the tower, its underside over the lobby, the brick piers, two bands, and fins on its long sides
  b.box(tx0, POD, tz0, tx1, TOP, tz1, PRECAST, { win: BROM, seed: 0.52, faces: 'NESWB' });
  for (const x of [tx0, tx1]) for (const z of [tz0, tz1]) b.box(x - 0.3, POD, z - 0.3, x + 0.3, TOP + 0.15, z + 0.3, BRICK.brown, { faces: 'NESW' });
  for (const x of [tx0, tx1]) b.box(x - 0.22, POD, cz - 0.6, x + 0.22, TOP + 0.15, cz + 0.6, BRICK.brown, { faces: 'NESW' });
  for (const f of [4, 8]) b.box(tx0 - 0.08, POD + f * BROM.storey - 0.1, tz0 - 0.08, tx1 + 0.08, POD + f * BROM.storey + 0.1, tz1 + 0.08, WHITE, { faces: 'NESWTB' });
  for (const f of [1 / 3, 2 / 3]) {
    const x = tx0 + f * (tx1 - tx0);
    b.box(x - 0.1, POD, tz1, x + 0.1, TOP, tz1 + 0.16, WHITE, { faces: 'SEW' });
    b.box(x - 0.1, POD, tz0 - 0.16, x + 0.1, TOP, tz0, WHITE, { faces: 'NEW' });
  }
  // the crown, with the name on its south face, and the lift's head on the roof
  roofCap(b, tx0 - 0.35, tz0 - 0.35, tx1 + 0.35, tz1 + 0.35, TOP + 0.15, h - 0.1, PRECAST);
  nameBoard(k, 'houses-bromley', cx, (TOP + h) / 2, tz1 + 0.35, 0, 1, 0.42, 4.2, 0xecebe6);
  plant(b, cx - 1.2, tz0 + 2.0, h - 0.1, 2.6, 2.0, 0.7);
  b.cyl(tx1 - 0.9, tz0 + 0.9, h - 0.1, h + 1.6, 0.06, 0.04, 4, 0xd0d3d6, { cap: false });

  // the door, on the west, under a canopy
  b.box(x0 + 0.05, POD - 0.4, cz - 1.3, tx0 + 0.36, POD - 0.25, cz + 1.3, PRECAST, { faces: 'NESWTB' });
  k.lights.push({ x: x0 - 0.5, z: cz, r: 8, color: '#ffe2ae', k: 0.5 });
  k.person(x0 + 0.5, cz - 0.6);

  // the sun deck and the pool, and a hedge along the walk
  area(k, rect(x0 + 0.2, tz1 - 0.35, x1 - 0.2, z1 - 0.2), 0xd9d4c6, 0.035);
  const px0 = x0 + 1.0, px1 = x1 - 3.4, pz0 = tz1 + 0.8, pz1 = z1 - 0.75;
  b.box(px0, 0, pz0, px1, 0.25, pz1, WHITE, { faces: 'NESWT', top: POOL, win: interior(0.35) });
  k.lights.push({ x: (px0 + px1) / 2, z: (pz0 + pz1) / 2, r: 5, color: '#9fd8f0', k: 0.5 });
  b.box(x0 + 0.2, 0, z1 - 0.45, x1 - 0.2, 0.75, z1 - 0.15, HEDGE, { faces: 'NESWT' });
  for (const dz of [-0.4, 0.9]) slab(b, [x1 - 3.2, 0.32, tz1 + 1.4 + dz], [x1 - 1.9, 0.55, tz1 + 1.4 + dz], 0.32, 0.12, WHITE);
  parasol(b, x1 - 1.4, tz1 + 2.2, 0xf26a21);
  k.person(x1 - 1.7, tz1 + 0.6);
  k.person(px0 + 0.6, pz0 - 0.4);
  k.person(px0 + 2.3, (pz0 + pz1) / 2, -1.0);
}

// ---------------------------------------------------------------------------
// The blocks of flats
// ---------------------------------------------------------------------------

/**
 * Flats on Gregory Drive, west: three storeys, brown brick below and grey lap
 * siding above, three balconies on each upper floor of the south side, a
 * steel stair up the east end, and a car port and a bin store on the car park
 * in front.
 */
function flatsWest(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l;
  const fx0 = x0 + 0.3, fx1 = x1 - 2.0, fz0 = z0 + 0.3, fz1 = Math.min(z0 + 7.0, z1 - 4.0), H = 3 * STOREY;
  b.box(fx0, 0, fz0, fx1, STOREY, fz1, BRICK.brown, { win: FLAT, seed: 0.14, faces: 'NESW' });
  b.box(fx0, STOREY, fz0, fx1, H, fz1, SIDING, { win: FLAT, seed: 0.15, faces: 'NESW' });
  b.box(fx0 - 0.06, STOREY - 0.06, fz0 - 0.06, fx1 + 0.06, STOREY + 0.06, fz1 + 0.06, 0x4a4f56, { faces: 'NESWTB' });
  roofCap(b, fx0 - 0.1, fz0 - 0.1, fx1 + 0.1, fz1 + 0.1, H, H + 0.3, 0x4a4f56);
  plant(b, fx0 + 2.5, fz0 + 2.0, H + 0.3, 1.3, 1.1, 0.7);
  plant(b, fx1 - 3.5, fz0 + 2.4, H + 0.3, 1.3, 1.1, 0.7);

  // balconies on the south side, with a chair or a bicycle on some
  const xs = [fx0 + 2.4, (fx0 + fx1) / 2, fx1 - 2.4];
  for (const y of [STOREY, 2 * STOREY]) for (const x of xs) balcony(b, 'S', x - 0.95, x + 0.95, fz1, 1.1, y, RAIL);
  chair(b, xs[0] - 0.3, STOREY, fz1 + 0.5, Math.PI / 2, 0x2f66b3);
  bike(b, xs[2], STOREY, fz1 + 0.55, 0, 0xc8523f);
  bike(b, xs[1], 2 * STOREY, fz1 + 0.55, 0, 0x3f7f5f);
  chair(b, xs[2] + 0.3, 2 * STOREY, fz1 + 0.5, Math.PI / 2, 0xf2c14e);
  k.person(xs[1] - 0.4, fz1 + 0.5, STOREY);

  // the door, in the middle of the south side, under a canopy
  const dx = (xs[0] + xs[1]) / 2;
  against(b, 'S', dx - 0.7, dx + 0.7, fz1, 0, 0.04, 0, 2.3, GLASS, { faces: 'S', win: interior(1.2) });
  against(b, 'S', dx - 1.1, dx + 1.1, fz1, 0, 1.0, 2.45, 2.6, CONCRETE, { faces: 'NESWTB' });
  k.lights.push({ x: dx, z: fz1 + 1.8, r: 8, color: '#ffe2ae', k: 0.5 });

  // the stair up the east end: two steep flights of steel, a landing at each floor, and a rail
  const sx = (fx1 + x1) / 2, sw = 0.5, run = 2.4;
  const z1a = fz1 - 0.2, z1b = z1a - run, z2a = z1b - 1.0, z2b = z2a - run;
  slab(b, [sx, 0.12, z1a], [sx, STOREY, z1b], sw, 0.15, IRON_LIGHT);
  b.box(fx1, STOREY - 0.15, z2a, sx + sw, STOREY, z1b, IRON_LIGHT, { faces: 'NESWTB' });
  slab(b, [sx, STOREY, z2a], [sx, 2 * STOREY, z2b], sw, 0.15, IRON_LIGHT);
  b.box(fx1, 2 * STOREY - 0.15, fz0, sx + sw, 2 * STOREY, z2b, IRON_LIGHT, { faces: 'NESWTB' });
  for (const [ya, za, yb, zb] of [[0.12, z1a, STOREY, z1b], [STOREY, z2a, 2 * STOREY, z2b]]) b.beam([sx + sw, ya + 0.9, za], [sx + sw, yb + 0.9, zb], 0.04, 0.04, 0xc9ccd2);
  for (const [z, y] of [[(z1b + z2a) / 2, STOREY], [(z2b + fz0) / 2, 2 * STOREY]]) against(b, 'E', z - 0.5, z + 0.5, fx1, 0, 0.04, y, y + 2.1, 0x3a3f46, { faces: 'E', win: interior(0.9) });
  k.person(sx, (z1b + z2a) / 2, STOREY);

  // the car park: asphalt, its bays painted, a car port on posts, and a bin store of boards
  area(k, rect(x0 + 0.1, fz1, x1 - 0.1, z1 - 0.1), ASPHALT, 0.035);
  const cp0 = fx0 + 0.3, cp1 = fx0 + 9.3, cz0 = fz1 + 1.6, cz1 = z1 - 0.4;
  for (let i = 1; i < 3; i++) area(k, rect(cp0 + i * 3 - 0.06, cz0 + 0.2, cp0 + i * 3 + 0.06, cz1 - 0.2), 0xe9e6dd, 0.045);
  b.box(cp0, 2.45, cz0, cp1, 2.65, cz1, 0x9aa0a6, { faces: 'NESWTB' });
  for (const x of [cp0 + 0.15, cp1 - 0.15]) for (const z of [cz0 + 0.15, cz1 - 0.15]) b.box(x - 0.08, 0, z - 0.08, x + 0.08, 2.45, z + 0.08, IRON_LIGHT, { faces: 'NESW' });
  b.box(cp1 + 0.9, 0, cz1 - 1.6, cp1 + 3.1, 1.55, cz1, BOARDS, { faces: 'NESWT', top: 0x6d5238 });
  k.person(cp1 + 3.6, cz1 - 0.9);
}

/**
 * Flats on Gregory Drive, middle: four storeys, buff brick below and charcoal
 * panels above, stacked balconies with glass rails, a stair tower of glass at
 * the east end with the door at its foot, bicycles at a rack, and a banner.
 */
function flatsMiddle(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, F = FLAT4.storey;
  const bx0 = x0 + 0.3, bx1 = x1 - 2.4, bz0 = z0 + 0.3, bz1 = z1 - 2.6, H = 4 * F;
  b.box(bx0, 0, bz0, bx1, 2 * F, bz1, BUFF, { win: FLAT4, seed: 0.24, faces: 'NESW' });
  b.box(bx0, 2 * F, bz0, bx1, H, bz1, CHARCOAL, { win: FLAT4, seed: 0.25, faces: 'NESW' });
  b.box(bx0 - 0.06, 2 * F - 0.07, bz0 - 0.06, bx1 + 0.06, 2 * F + 0.07, bz1 + 0.06, 0xd7d3ca, { faces: 'NESWTB' });
  roofCap(b, bx0 - 0.1, bz0 - 0.1, bx1 + 0.1, bz1 + 0.1, H, H + 0.3, 0xd7d3ca);
  plant(b, bx0 + 3.0, bz0 + 2.2, H + 0.3, 1.6, 1.2, 0.8);

  // two stacks of balconies on the south side, with glass rails
  const xs = [bx0 + 2.6, bx1 - 3.2];
  for (let f = 1; f <= 3; f++) for (const x of xs) balcony(b, 'S', x - 1.0, x + 1.0, bz1, 1.15, f * F, 0xb7d0dc);
  chair(b, xs[0] + 0.4, F, bz1 + 0.55, Math.PI / 2, 0xc8523f);
  bike(b, xs[1], 2 * F, bz1 + 0.6, 0, 0x2f66b3);
  chair(b, xs[0] - 0.4, 3 * F, bz1 + 0.55, Math.PI / 2, 0xf2c14e);
  k.person(xs[1] + 0.5, bz1 + 0.5, F);
  // the banner on the top floor between the stacks
  const mx = (xs[0] + xs[1]) / 2;
  nameBoard(k, 'houses-leasing', mx, 3 * F + 1.2, bz1, 0, 1, 0.55, 3.4, 0x2f6d4a);

  // the stair tower, glass, at the east end, and the door at its foot
  const sz0 = bz0 + 1.2, sz1 = bz1 - 0.6;
  b.box(bx1, 0, sz0, x1 - 0.4, H + 0.6, sz1, GLASS, { win: interior(0.75), faces: 'NES' });
  for (const z of [sz0, sz1]) b.box(x1 - 0.55, 0, z - 0.12, x1 - 0.31, H + 0.6, z + 0.12, CHARCOAL, { faces: 'NESW' });
  roofCap(b, bx1 - 0.05, sz0 - 0.15, x1 - 0.25, sz1 + 0.15, H + 0.6, H + 0.85, CHARCOAL);
  for (let f = 1; f <= 3; f++) b.box(x1 - 0.4, f * F - 0.07, sz0 + 0.12, x1 - 0.36, f * F + 0.07, sz1 - 0.12, CHARCOAL, { faces: 'E' });
  against(b, 'E', sz1 - 1.6, sz1 - 0.4, x1 - 0.4, 0, 0.03, 0, 2.1, DARK, { faces: 'E', win: interior(1.3) });
  b.box(x1 - 0.4, 2.2, sz1 - 2.0, x1 + 0.4, 2.35, sz1 + 0.3, CONCRETE, { faces: 'NESWTB' });
  k.lights.push({ x: x1 + 0.6, z: sz1 - 0.8, r: 8, color: '#ffe2ae', k: 0.5 });

  // in front: a strip of lawn, the walk, and a rack of bicycles
  area(k, rect(x0 + 0.1, bz1, x1 - 0.1, z1 - 0.1), LAWN, 0.035);
  area(k, rect(bx1 - 0.2, bz1, x1 - 0.1, z1 - 0.1), WALK, 0.045);
  const rz = bz1 + 1.4;
  b.box(bx0 + 4.8, 0.5, rz - 0.04, bx0 + 8.2, 0.58, rz + 0.04, IRON_LIGHT, { faces: 'NESWTB' });
  for (const x of [bx0 + 5.6, bx0 + 7.2]) bike(b, x, 0.035, rz, Math.PI / 2, x < bx0 + 6 ? 0x3f7f5f : 0xc8523f);
  k.person(bx0 + 9.0, rz + 0.3);
}

/**
 * Flats on Fourth Street: three storeys, red brick below and beige siding
 * above, the ground floor's west half open for parking under the flats,
 * balconies on the street side, and a steel stair at the south end.
 */
function flatsFourth(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, H = 3 * STOREY;
  const ux0 = x0 + 0.3, ux1 = x1 - 1.4, uz0 = z0 + 0.3, uz1 = z1 - 2.2, gx = ux0 + 2.4;
  // the flats above, with their underside over the parking, and the brick ground floor in the east half
  b.box(ux0, STOREY, uz0, ux1, H, uz1, VINYL, { win: FLAT, seed: 0.34, faces: 'NESWB' });
  b.box(gx, 0, uz0, ux1, STOREY, uz1, BRICK.red, { win: FLAT, seed: 0.35, faces: 'NES' });
  b.quad([gx, 0, uz0], [gx, 0, uz1], [gx, STOREY, uz1], [gx, STOREY, uz0], [-1, 0, 0], 0x6d3a30);
  b.box(ux0 - 0.06, STOREY - 0.06, uz0 - 0.06, ux1 + 0.06, STOREY + 0.08, uz1 + 0.06, 0x4a4f56, { faces: 'NESWT' });
  roofCap(b, ux0 - 0.1, uz0 - 0.1, ux1 + 0.1, uz1 + 0.1, H, H + 0.3, 0x4a4f56);
  plant(b, (ux0 + ux1) / 2, uz0 + 3, H + 0.3, 1.4, 1.2, 0.7);
  b.cyl(ux0 + 1.0, uz1 - 2.0, H + 0.3, H + 0.9, 0.42, 0.05, 6, 0xdedfe0, { cap: false });
  // the parking under the flats: posts along the west edge, and asphalt
  area(k, rect(x0 + 0.1, uz0, gx, z1 - 0.1), ASPHALT, 0.035);
  for (let i = 0; i < 4; i++) {
    const z = uz0 + 0.2 + (i / 3) * (uz1 - uz0 - 0.4);
    b.box(ux0 + 0.05, 0, z - 0.15, ux0 + 0.35, STOREY, z + 0.15, CONCRETE, { faces: 'NESW' });
  }
  // balconies on the street side, with a chair or a bicycle on some
  const zs = [uz0 + 2.6, (uz0 + uz1) / 2, uz1 - 2.6];
  for (const y of [STOREY, 2 * STOREY]) for (const z of zs) balcony(b, 'E', z - 0.95, z + 0.95, ux1, 1.1, y, RAIL);
  chair(b, ux1 + 0.5, STOREY, zs[0] + 0.3, 0, 0x2f66b3);
  bike(b, ux1 + 0.55, 2 * STOREY, zs[1], Math.PI / 2, 0xf26a21);
  chair(b, ux1 + 0.5, 2 * STOREY, zs[2] - 0.3, 0, 0xc8523f);
  k.person(ux1 + 0.5, zs[2] + 0.4, STOREY);
  // the door on Fourth Street, under the middle balcony
  against(b, 'E', zs[1] - 0.65, zs[1] + 0.65, ux1, 0, 0.04, 0, 2.3, GLASS, { faces: 'E', win: interior(1.2) });
  k.lights.push({ x: x1 + 0.3, z: zs[1], r: 7, color: '#ffe2ae', k: 0.45 });

  // the stair at the south end: up one lane to a landing, and back up the other
  const laneA = (uz1 + z1 - 0.1) / 2 + 0.48, laneB = laneA - 0.96, sw = 0.42, xa = ux1 - 0.2, xb = xa - 2.6;
  slab(b, [xa, 0.12, laneA], [xb, STOREY, laneA], sw, 0.15, IRON_LIGHT);
  b.box(xb - 1.0, STOREY - 0.15, uz1, xb, STOREY, laneA + sw, IRON_LIGHT, { faces: 'NESWTB' });
  slab(b, [xb, STOREY, laneB], [xa, 2 * STOREY, laneB], sw, 0.15, IRON_LIGHT);
  b.box(xa - 0.8, 2 * STOREY - 0.15, uz1, xa + 0.3, 2 * STOREY, laneB + sw - 0.06, IRON_LIGHT, { faces: 'NESWTB' });
  b.beam([xa, 1.02, laneA + sw], [xb, STOREY + 0.9, laneA + sw], 0.04, 0.04, 0xc9ccd2);
  for (const [x, y] of [[xb - 0.5, STOREY], [xa - 0.4, 2 * STOREY]]) against(b, 'S', x - 0.45, x + 0.45, uz1, 0, 0.04, y, y + 2.1, 0x3a3f46, { faces: 'S', win: interior(0.9) });
  k.person(xb - 0.5, laneA, STOREY);
  k.person(ux0 + 1.2, z1 - 0.8);
}

// ---------------------------------------------------------------------------
// Huff Hall
// ---------------------------------------------------------------------------

/**
 * Huff Hall: the gymnasium of 1925. A long hall of red brick, a storey of
 * small windows below and tall arched ones above along both sides, under a
 * long slate roof with an oculus in each gable; a pedimented front on Fourth
 * Street with three arched doors; a lower wing at the east end; and its name
 * over the door on the south side.
 */
function huff(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, zc = (z0 + z1) / 2;
  const hx0 = x0 + 1.6, hx1 = x1 - 2.6, hz0 = z0 + 0.4, hz1 = z1 - 0.4, cx = (hx0 + hx1) / 2;
  const UP = 9.3, EAVE = UP + 0.45, RISE = 2.4, OVER = 0.45;

  b.box(hx0, 0, hz0, hx1, STOREY, hz1, BRICK.red, { win: HALL, seed: 0.73, faces: 'NESW' });
  b.box(hx0, STOREY, hz0, hx1, UP, hz1, BRICK.red, { faces: 'NESW' });
  b.box(hx0 - 0.1, 0, hz0 - 0.1, hx1 + 0.1, 0.6, hz1 + 0.1, BASE, { faces: 'NESWT' });
  b.box(hx0 - 0.08, STOREY - 0.08, hz0 - 0.08, hx1 + 0.08, STOREY + 0.08, hz1 + 0.08, LIMESTONE, { faces: 'NESWTB' });
  b.box(hx0 - 0.25, UP, hz0 - 0.25, hx1 + 0.25, EAVE, hz1 + 0.25, TRIM, { faces: 'NESWB' });
  gable(b, hx0, hz0, hx1, hz1, EAVE, RISE, SLATE, BRICK.red, 'x', OVER);
  const ridge = EAVE + RISE;
  for (const x of [cx - 3.4, cx + 3.4]) b.box(x - 0.4, ridge - 0.4, zc - 0.4, x + 0.4, ridge + 0.45, zc + 0.4, LIMESTONE, { faces: 'NESWT', top: SLATE });
  // an oculus in each gable
  for (const [x, f, s] of [[hx1, 'E', 1], [hx0, 'W', -1]] as const) {
    roundel(b, [x + s * 0.02, EAVE + 0.95, zc], 0.62, f, LIMESTONE, {}, 10);
    roundel(b, [x + s * 0.05, EAVE + 0.95, zc], 0.45, f, PANE, { win: interior(0.7) }, 10);
  }

  // six tall arched windows down each side
  const n = 6, bay = (hx1 - hx0) / n;
  for (let i = 0; i < n; i++) {
    const x = hx0 + bay * (i + 0.5);
    archWin(b, 'S', x, hz1, 3.6, 7.0, 0.65, 0.95);
    archWin(b, 'N', x, hz0, 3.6, 7.0, 0.65, 0.95);
  }
  // brick quoins of stone at the corners
  for (const x of [hx0, hx1]) for (const z of [hz0, hz1]) b.box(x - 0.14, 0.6, z - 0.14, x + 0.14, UP, z + 0.14, LIMESTONE, { faces: 'NESW' });

  // the door on the south side, in the middle, and the name over it
  against(b, 'S', cx - 1.05, cx + 1.05, hz1, 0, 0.12, 0, 2.75, LIMESTONE, { faces: 'SEWT' });
  against(b, 'S', cx - 0.75, cx + 0.75, hz1, 0.12, 0.15, 0, 2.5, DARK, { faces: 'S', win: interior(1.3) });
  nameBoard(k, 'houses-huff', cx, 3.2, hz1 + 0.04, 0, 1, 0.42, 2.9);
  steps(b, cx - 1.0, cx + 1.0, hz1 + 0.15, 0.3, 'S', LIMESTONE, 0.4);
  k.lights.push({ x: cx, z: hz1 + 2.2, r: 10, color: '#ffe2ae', k: 0.55 });
  for (const dx of [-1.3, 1.3]) k.glows.push({ x: cx + dx, y: 2.3, z: hz1 + 0.2, sx: 0.22, sy: 0.34, sz: 0.2, color: '#ffe2ae' });

  // the front on Fourth Street: a pavilion under a pediment, three arched doors in stone, three arched windows over them
  const px0 = x0 + 1.3, pz0 = zc - 3, pz1 = zc + 3;
  b.box(px0, 0, pz0, hx0, 7.6, pz1, BRICK.red, { faces: 'NSW' });
  b.box(px0 - 0.1, 0, pz0 - 0.1, hx0, 0.6, pz1 + 0.1, BASE, { faces: 'NSWT' });
  b.box(px0 - 0.22, 7.6, pz0 - 0.22, hx0, 8.0, pz1 + 0.22, TRIM, { faces: 'NSWB' });
  gable(b, px0, pz0, hx0 + 1.2, pz1, 8.0, 1.4, SLATE, TRIM, 'x', 0.25);
  against(b, 'W', pz0 + 0.4, pz1 - 0.4, px0, 0, 0.12, 0, 4.4, LIMESTONE, { faces: 'WNST' });
  for (const dz of [-1.75, 0, 1.75]) {
    const z = zc + dz;
    against(b, 'W', z - 0.6, z + 0.6, px0, 0.12, 0.15, 0.4, 3.1, DARK, { faces: 'W', win: interior(1.3) });
    half(b, 'W', z, px0, 0.15, 3.1, 0.6, DARK, { win: interior(1.3) });
    archWin(b, 'W', z, px0, 5.0, 6.3, 0.45, 0.9);
  }
  b.box(px0 - 0.8, 0, pz0 + 0.5, px0, 0.4, pz1 - 0.5, LIMESTONE, { faces: 'NSWT' });
  steps(b, pz0 + 0.5, pz1 - 0.5, px0 - 0.8, 0.4, 'W', LIMESTONE, 0.35);
  k.lights.push({ x: px0 - 1.5, z: zc, r: 10, color: '#ffe2ae', k: 0.5 });
  k.person(px0 - 0.5, zc - 0.9, 0.4);
  k.person(px0 - 0.6, zc + 1.2, 0.4);

  // the lower wing at the east end, and a great arched window over it in the hall's end
  const ez0 = hz0 + 1.0, ez1 = hz1 - 1.0, EW = 2 * STOREY;
  b.box(hx1, 0, ez0, x1 - 0.2, EW, ez1, BRICK.red, { win: HALL, seed: 0.79, faces: 'NES' });
  b.box(hx1, 0, ez0 - 0.08, x1 - 0.12, 0.6, ez1 + 0.08, BASE, { faces: 'NEST' });
  b.box(hx1, EW, ez0 - 0.15, x1 - 0.05, EW + 0.35, ez1 + 0.15, TRIM, { faces: 'NESTB', top: FELT });
  archWin(b, 'E', zc, hx1, EW + 0.7, 8.2, 0.75, 0.9);

  // people: two on their way in at the south door, one at the east wing
  k.person(cx - 1.6, hz1 + 1.0);
  k.person(cx + 2.1, hz1 + 0.7);
  k.person(x1 + 0.4, zc + 1.5);
}

// ---------------------------------------------------------------------------
// The Krannert Art Museum
// ---------------------------------------------------------------------------

/**
 * The Krannert Art Museum: the box of 1961 in white marble, its south face
 * glass behind a screen of gold on its upper storey, the gravel bed of its old
 * reflecting pool before it, and its name on its fascia; and the Kinkead
 * Pavilion of 1988 east of it, marble under a band of copper, with a skylight,
 * and its door on the east between two leaning pylons. A sculpture on the lawn.
 */
function artMuseum(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l;
  const ax0 = x0 + 0.5, ax1 = x0 + Math.min(9.5, (x1 - x0) * 0.58), az0 = z0 + 0.5, az1 = z1 - 3.0, acx = (ax0 + ax1) / 2;
  const WALL = 2 * STOREY, FASCIA = l.h + 0.2;
  area(k, rect(x0 + 0.1, z0 + 0.1, x1 - 0.1, z1 - 0.1), LAWN, 0.035);

  // the box of 1961: plain marble on three sides, glass recessed on the south, under a deep fascia
  b.box(ax0, 0, az0, ax1, WALL, az1, MARBLE, { faces: 'NW' });
  for (const x of [ax0, ax1 - 0.3]) b.box(x, 0, az1 - 0.6, x + 0.3, WALL, az1, MARBLE, { faces: x === ax0 ? 'SE' : 'SW' });
  b.box(ax0 + 0.3, 0, az1 - 0.62, ax1 - 0.3, WALL, az1 - 0.6, GLASS, { faces: 'S', win: MUSEUM_GLASS });
  b.box(ax0 - 0.2, WALL, az0 - 0.2, ax1, FASCIA, az1 + 0.2, MARBLE, { faces: 'NESWTB', top: FELT });
  // the gold screen across the upper storey
  const bars = Math.round((ax1 - ax0 - 0.6) / 0.5);
  for (let i = 0; i <= bars; i++) {
    const x = ax0 + 0.3 + (i / bars) * (ax1 - ax0 - 0.6);
    b.box(x - 0.07, STOREY, az1 - 0.3, x + 0.07, WALL, az1 - 0.2, GOLD, { faces: 'SEW' });
  }
  b.box(ax0 + 0.3, STOREY - 0.12, az1 - 0.32, ax1 - 0.3, STOREY, az1 - 0.18, GOLD, { faces: 'STB' });
  // the doors, a terrace of stone before them, and the old pool's gravel either side of the walk
  b.box(acx - 0.9, 0.3, az1 - 0.6, acx + 0.9, 2.5, az1 - 0.56, DARK, { faces: 'S', win: interior(1.3) });
  b.box(ax0 - 0.1, 0, az1 - 0.6, ax1, 0.3, az1 + 0.7, LIMESTONE, { faces: 'SWT' });
  for (const [a, c] of [[ax0, acx - 1.2], [acx + 1.2, ax1 - 0.1]]) b.box(a, 0, az1 + 0.9, c, 0.22, z1 - 0.3, MARBLE, { faces: 'NESWT', top: GRAVEL });
  area(k, rect(acx - 1.2, az1 + 0.7, acx + 1.2, z1 - 0.1), WALK, 0.045);
  nameBoard(k, 'houses-kam', acx, (WALL + FASCIA) / 2, az1 + 0.2, 0, 1, 0.4, 5.4);
  k.lights.push({ x: acx, z: az1 + 2.2, r: 10, color: '#ffe9c4', k: 0.6 });
  k.person(acx - 0.6, az1 + 0.3, 0.3);
  k.person(acx + 1.6, az1 + 1.8);

  // the Kinkead Pavilion: marble, a band of copper, a skylight, slit windows on the south
  const kx0 = ax1, kx1 = x1 - 1.3, kz0 = z0 + 0.3, kz1 = Math.min(az1 + 1.0, z1 - 1.6), kcz = (kz0 + kz1) / 2, kcx = (kx0 + kx1) / 2;
  const KW = 5.0, KT = 5.7;
  b.box(kx0, 0, kz0, kx1, KW, kz1, MARBLE, { faces: 'NESW' });
  b.box(kx0, KW, kz0 - 0.15, kx1 + 0.15, KT, kz1 + 0.15, VERDIGRIS, { faces: 'NESWTB', top: FELT });
  b.box(kx0, 0, kz0 - 0.06, kx1 + 0.06, 0.5, kz1 + 0.06, BASE, { faces: 'NEST' });
  for (const f of [0.25, 0.5, 0.75]) {
    const x = kx0 + f * (kx1 - kx0);
    against(b, 'S', x - 0.3, x + 0.3, kz1, 0, 0.04, 0.9, 4.4, PANE, { faces: 'S', win: interior(0.9) });
    against(b, 'S', x - 0.45, x + 0.45, kz1, 0, 0.08, 4.4, 4.6, VERDIGRIS, { faces: 'SEWTB' });
  }
  const sk = 1.1;
  b.box(kx0 + sk, KT, kz0 + sk, kx1 - sk, KT + 0.25, kz1 - sk, VERDIGRIS, { faces: 'NESW' });
  hipped(b, kx0 + sk, kz0 + sk, kx1 - sk, kz1 - sk, KT + 0.25, KT + 1.0, 0.9, 0.9, GLASS, GLASS, { win: interior(0.8) });
  // the door on the east, between two leaning pylons under a copper lintel
  b.box(kx1, 0, kcz - 1.0, kx1 + 0.04, 3.4, kcz + 1.0, GLASS, { faces: 'E', win: interior(1.3) });
  for (const s of [-1, 1]) b.cyl(kx1 + 0.55, kcz + s * 1.65, 0, KW - 0.05, 0.6 * D, 0.42 * D, 4, MARBLE, { phase: Q, cap: false });
  b.box(kx1, KW - 0.05, kcz - 2.35, kx1 + 1.2, KW + 0.55, kcz + 2.35, VERDIGRIS, { faces: 'NESTB' });
  k.lights.push({ x: kx1 + 2.0, z: kcz, r: 9, color: '#ffe9c4', k: 0.55 });
  k.person(kx1 + 1.2, kcz - 0.4);
  // a tall slit window either side of the pylons, under a copper hood
  for (const s of [-1, 1]) {
    against(b, 'E', kcz + s * 3.2 - 0.28, kcz + s * 3.2 + 0.28, kx1, 0, 0.04, 0.9, 4.2, PANE, { faces: 'E', win: interior(0.9) });
    against(b, 'E', kcz + s * 3.2 - 0.45, kcz + s * 3.2 + 0.45, kx1, 0, 0.1, 4.2, 4.45, VERDIGRIS, { faces: 'ENSTB' });
  }
  // the ground floor's glass, divided by slim marble mullions
  for (let i = 1; i < 6; i++) {
    const x = ax0 + 0.3 + (i / 6) * (ax1 - ax0 - 0.6);
    if (Math.abs(x - acx) > 1.0) b.box(x - 0.06, 0.3, az1 - 0.6, x + 0.06, STOREY - 0.12, az1 - 0.52, MARBLE, { faces: 'SEW' });
  }
  // two banners on poles by the walk, plain colour and no lettering, and a bench on the lawn
  for (const [x, c] of [[kx1 - 1.9, 0x8c2f39], [kx1 - 0.7, 0x2f4f6f]] as const) {
    const z = z1 - 0.6;
    b.cyl(x, z, 0.035, 4.2, 0.06, 0.05, 4, 0x8d9198, { cap: false });
    b.box(x + 0.06, 2.4, z - 0.02, x + 0.66, 4.0, z + 0.02, c, { faces: 'NSEWTB' });
  }
  bench(b, kx0 + 0.95, (kz1 + z1) / 2, Math.PI / 2);
  k.person(kx0 + 0.6, (kz1 + z1) / 2 + 0.75);

  // the sculpture on the south lawn: three blocks of weathering steel, each turned from the one below
  const sx = kcx - 0.4, sz = (kz1 + z1) / 2;
  b.box(sx - 0.55, 0, sz - 0.55, sx + 0.55, 0.2, sz + 0.55, LIMESTONE, { faces: 'NESWT' });
  for (const [i, yaw] of [[0, 0.25], [1, 0.95], [2, 1.65]] as const) b.obox(sx + i * 0.08, 0.2 + 0.5 + i * 0.95, sz, 0.42, 0.5, 0.11, yaw, RUST);
  k.lights.push({ x: sx, z: sz, r: 4, color: '#ffe2ae', k: 0.45 });
  k.person(sx - 1.4, sz + 0.2);
}

// ---------------------------------------------------------------------------
// Washington Park
// ---------------------------------------------------------------------------

/** A park bench that faces (cos yaw, sin yaw): a seat, a back, and two legs. */
function bench(b: GeoBuilder, x: number, z: number, yaw: number): void {
  b.moved(x, 0, z, yaw, () => {
    b.box(-0.25, 0.42, -0.85, 0.25, 0.55, 0.85, 0x8d6b4a, { faces: 'NESWTB' });
    b.box(-0.3, 0.55, -0.85, -0.2, 1.1, 0.85, 0x8d6b4a, { faces: 'NESWT' });
    for (const dz of [-0.7, 0.7]) b.box(-0.22, 0.035, dz - 0.06, 0.22, 0.42, dz + 0.06, 0x4b5058, { faces: 'NESW' });
  });
}

export function extras(k: Build): void {
  const b = k.b;
  const p = park(), sand = AREAS.find((a) => a.id === 'volleyball');
  if (!sand) return;
  const scx = (sand.x0 + sand.x1) / 2, scz = (sand.z0 + sand.z1) / 2;

  // the net across the middle of the sand, between two posts
  const nx0 = sand.x0 - 0.35, nx1 = sand.x1 + 0.35;
  for (const x of [nx0, nx1]) b.cyl(x, scz, 0.03, 3.0, 0.1, 0.09, 4, 0xd0d3d6, { cap: false });
  b.box(nx0, 2.25, scz - 0.02, nx1, 2.85, scz + 0.02, 0xe9eaec, { faces: 'NSB' });
  b.box(nx0, 2.85, scz - 0.04, nx1, 2.97, scz + 0.04, WHITE, { faces: 'NSTB' });
  // four against four, and the ball in the air over the net
  for (const s of [-1, 1]) {
    for (const [dx, dz] of [[-1.6, 1.0], [1.5, 1.2], [-0.8, 2.8], [1.0, 3.0]]) k.person(scx + dx, scz + s * dz);
  }
  b.box(scx + 0.6 - 0.16, 4.1, scz - 0.6 - 0.16, scx + 0.6 + 0.16, 4.42, scz - 0.6 + 0.16, WHITE, { faces: 'NESWTB' });

  // round it: two benches, a table, and a few on the grass
  bench(b, p.x1 - 0.8, scz - 0.5, Math.PI);
  bench(b, scx, p.z0 + 1.6, Math.PI / 2);
  k.person(p.x1 - 1.5, scz + 0.8);
  k.person(scx + 1.3, p.z0 + 2.0);
  // the table, with its two benches, north of the court
  const tx = scx - 0.5, tz = p.z0 + 5.5;
  b.box(tx - 1.0, 0.78, tz - 0.45, tx + 1.0, 0.88, tz + 0.45, 0x9a7a52, { faces: 'NESWTB' });
  for (const s of [-1, 1]) b.box(tx - 1.0, 0.42, tz + s * 0.85 - 0.2, tx + 1.0, 0.5, tz + s * 0.85 + 0.2, 0x9a7a52, { faces: 'NESWTB' });
  for (const s of [-1, 1]) b.box(tx + s * 0.75 - 0.08, 0.035, tz - 1.0, tx + s * 0.75 + 0.08, 0.78, tz + 1.0, 0x6d5238, { faces: 'EW' });
  k.person(tx - 0.4, tz + 1.3);
  k.person(tx + 0.6, tz - 1.3);
  // a cooler at the edge of the sand
  b.box(sand.x1 + 0.3, 0.035, sand.z1 - 1.0, sand.x1 + 0.9, 0.5, sand.z1 - 0.6, 0x2f66b3, { faces: 'NESWT', top: WHITE });
  // on the grass south of the court: two on a blanket, and one with a frisbee
  const blanket = (x: number, z: number, color: number): void => {
    area(k, rect(x - 0.9, z - 0.6, x + 0.9, z + 0.6), color, 0.04);
    k.person(x - 0.35, z + 0.1);
    k.person(x + 0.4, z - 0.15);
  };
  blanket(scx + 1.2, p.z1 - 3.0, 0xc8523f);
  blanket(scx - 1.6, sand.z1 + 3.4, 0xf2c14e);
  k.person(scx - 2.2, p.z1 - 1.6);
  k.person(scx + 2.4, sand.z1 + 1.6);
  b.cyl(scx + 0.2, p.z1 - 1.9, 1.9, 1.96, 0.18, 0.18, 6, 0xf26a21);
}

export const MODELS: Record<string, Model> = {
  'greek-1': georgian,
  'greek-2': tudor,
  'greek-3': stone,
  bromley,
  'flats-1': flatsWest,
  'flats-2': flatsMiddle,
  'flats-3': flatsFourth,
  huff,
  'art-museum': artMuseum,
};
