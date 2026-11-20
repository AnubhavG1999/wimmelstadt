// Old Delhi's monuments: the Red Fort, Jama Masjid, Fatehpuri Masjid, the row
// of faiths on Chandni Chowk, and Kashmere Gate with its motor parts market.
//
// The two mosques, the temples, the church and the gurdwara are places of
// worship. They are drawn plainly and from outside: a few visitors walk in
// their courts, nobody is at prayer, nothing is parked by them and nothing
// stands on their domes. The Red Fort is calm: the flag over the Lahori Gate,
// lawns, and people out for the day.
//
// Everything takes its place from its lot in plan.ts. Each thing's show side
// is the one it has in life: the fort's river front looks east and its Delhi
// Gate south, the mosques' great gates look east, the row of faiths looks
// north onto Chandni Chowk.

import { interior, rng, type GeoBuilder, type V3 } from '../../engine/geo';
import { LAWN, area, rect, type P2 } from '../../engine/ground';
import { figure, lathe, roundel, tri } from '../../engine/parts';
import { clearOfStreets } from '../../engine/roads';
import { gable, slab } from '../../engine/shapes';
import { DEVANAGARI, type SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import {
  BUFF, BUFF_SHADE, CREAM, GOLD, MARBLE, MARBLE_SHADE, RECESS, RED, RED_DARK, RED_LIGHT, RUBBLE_LIGHT,
  arcade, archThrough, dome, drum, merlons, minaret, niche, tiranga, type Facing,
} from './mughal';
import { CHANDNI, GROUNDS, KASHMERE_TURN, STOREY, TURN_R, type Thing } from './plan';
import { STREETS } from './roads';

export type Model = (k: Build, t: Thing) => void;

// ---------------------------------------------------------------------------
// Parts that mughal.ts has in a heavier kind, or not at all: an arch of few
// triangles, a light pavilion, a tiny dome, a dome with thin stripes. A fort
// has six dozen arches and a dozen pavilions, and a dome a quarter of a unit
// wide needs no twelve sides.
// ---------------------------------------------------------------------------

const OUT: Record<Facing, V3> = { N: [0, 0, -1], E: [1, 0, 0], S: [0, 0, 1], W: [-1, 0, 0] };
/** A place on a wall that faces `f`: `a` along it, `y` up it, and `out` proud of its plane. */
const onWall = (f: Facing, plane: number, a: number, y: number, out: number): V3 =>
  f === 'N' ? [a, y, plane - out] : f === 'S' ? [a, y, plane + out] : f === 'E' ? [plane + out, y, a] : [plane - out, y, a];

/**
 * An opening with a lamp behind it. A surface that glows gives off its own
 * colour, and mughal's RECESS is too dark to give off any: this is a shade
 * warmer and lighter, still dark by day, and amber by night. `LIT` is how
 * much a lit opening is asked to glow for each unit of its `lit`.
 */
const LAMPLIT = 0x6e4a32, LIT = 4;

/**
 * A pointed arch as a dark opening, in three triangles or, if `fine`, in five:
 * for a blind panel, a bay of a cloister, one arch of a hall of many. The
 * great arches are mughal's `niche`. One that is `lit` glows at night.
 */
function opening(b: GeoBuilder, f: Facing, plane: number, a: number, y: number, w: number, h: number, color: number = RECESS, lit = 0, fine = false): void {
  const r = w / 2, rise = Math.min(h * 0.5, w * 0.62), s = h - rise;
  const outline: [number, number][] = fine
    ? [[-r, 0], [r, 0], [r, s], [r * 0.6, s + rise * 0.7], [0, h], [-r * 0.6, s + rise * 0.7], [-r, s]]
    : [[-r, 0], [r, 0], [r, s], [0, h], [-r, s]];
  const p = outline.map(([u, v]) => onWall(f, plane, a + u, y + v, 0.05));
  const q = lit ? { win: interior(lit * LIT) } : {};
  for (let i = 1; i + 1 < p.length; i++) tri(b, p[0], p[i], p[i + 1], OUT[f], lit && color === RECESS ? LAMPLIT : color, q);
}

/** A row of `n` such arches along a wall, from `a0` to `a1`. */
function openings(b: GeoBuilder, f: Facing, plane: number, a0: number, a1: number, y: number, n: number, h: number, color: number = RECESS, lit = 0, fine = false): void {
  const bay = (a1 - a0) / n;
  for (let i = 0; i < n; i++) opening(b, f, plane, a0 + (i + 0.5) * bay, y, bay * 0.68, h, color, lit, fine);
}

/** A lamp: a small box that glows. */
const lamp = (k: Build, x: number, y: number, z: number, s = 0.3): void => { k.glows.push({ x, y, z, sx: s, sy: s * 1.2, sz: s, color: '#ffd9a0' }); };
/** A pool of warm light on the ground by night, which also lights the walls that stand in it. */
const pool = (k: Build, x: number, z: number, r: number, strength: number, color = '#ffdcae'): void => { k.lights.push({ x, z, r, color, k: strength }); };

/** A tiny dome: one of a row along a gate's top, or the cap of a slender turret. */
function cupola(b: GeoBuilder, x: number, y: number, z: number, r: number, color: number, sides = 4): void {
  lathe(b, x, z, [[r, y], [r * 0.82, y + r * 0.62], [0.02, y + r * 1.14]], sides, color);
}

/** A small dome that swells from its neck, with a spike of gold on it. */
function bulb(b: GeoBuilder, x: number, y: number, z: number, r: number, color: number, sides = 6): void {
  lathe(b, x, z, [[r * 0.66, y], [r, y + r * 0.44], [r * 0.9, y + r * 0.92], [r * 0.42, y + r * 1.4], [0.03, y + r * 1.62]], sides, color);
  b.cyl(x, z, y + r * 1.58, y + r * 2.2, r * 0.1, 0.015, 4, GOLD, { cap: false });
}

/** The outline of mughal's onion dome, with one ring fewer. */
const ONION: [number, number][] = [[0.84, 0], [0.98, 0.2], [1.04, 0.48], [0.97, 0.8], [0.76, 1.1], [0.44, 1.36], [0.03, 1.58]];
const BLACK = 0x2b2b30;

/**
 * A dome of white marble with thin stripes of black, as Jama Masjid's are.
 * mughal's `stripe` paints every other facet, which makes a dome half black:
 * here each of `n` broad white facets has a narrow black one beside it.
 * Returns the height of its top, without the finial.
 */
function stripedDome(b: GeoBuilder, x: number, y: number, z: number, r: number, n: number, thin = 0.24): number {
  const p = (a: number, rr: number, yy: number): V3 => [x + Math.cos(a) * rr * r, yy, z + Math.sin(a) * rr * r];
  for (let i = 0; i + 1 < ONION.length; i++) {
    const [r0, h0] = ONION[i], [r1, h1] = ONION[i + 1], y0 = y + h0 * r, y1 = y + h1 * r;
    const slope = ((r0 - r1) * r) / Math.max(1e-6, y1 - y0), nl = Math.hypot(1, slope);
    for (let s = 0; s < n; s++) {
      const a0 = (s / n) * Math.PI * 2, a1 = ((s + 1 - thin) / n) * Math.PI * 2, a2 = ((s + 1) / n) * Math.PI * 2;
      for (const [aa, ab, color] of [[a0, a1, MARBLE], [a1, a2, BLACK]]) {
        const am = (aa + ab) / 2;
        b.quad(p(aa, r0, y0), p(ab, r0, y0), p(ab, r1, y1), p(aa, r1, y1), [Math.cos(am) / nl, slope / nl, Math.sin(am) / nl], color);
      }
    }
  }
  const top = y + 1.58 * r;
  b.cyl(x, z, top - 0.05, top + r * 0.16, r * 0.1, r * 0.1, 6, GOLD);
  b.cyl(x, z, top + r * 0.16, top + r * 0.52, r * 0.05, 0.02, 4, GOLD, { cap: false });
  return top;
}

/**
 * An open pavilion on `n` posts, lighter than mughal's chhatri: an eave with
 * its underside, and one of mughal's domes with fewer sides, or a dome of
 * fewer rings still if `small`. It stands on (x, y, z) and is `half` to each
 * side.
 */
function kiosk(b: GeoBuilder, x: number, y: number, z: number, half: number, post: number, stone: number, cap: number, n: 4 | 6 = 4, small = false): void {
  const t = Math.max(0.07, half * 0.13), reach = n === 4 ? half * Math.SQRT2 : half, ph = Math.PI / n;
  const at = (i: number, r: number, yy: number): V3 => [x + Math.cos(ph + (i / n) * Math.PI * 2) * r, yy, z + Math.sin(ph + (i / n) * Math.PI * 2) * r];
  for (let i = 0; i < n; i++) {
    const [px, , pz] = at(i, reach - t * 1.3, 0);
    b.box(px - t, y, pz - t, px + t, y + post, pz + t, stone, { faces: 'NESW' });
  }
  const e = reach * 1.3, y1 = y + post, y2 = y1 + Math.max(0.1, half * 0.16);
  b.cyl(x, z, y1, y2, e, e, n, stone);
  for (let i = 1; i + 1 < n; i++) tri(b, at(0, e, y1), at(i, e, y1), at(i + 1, e, y1), [0, -1, 0], stone);
  if (small) {
    if (half < 0.45) cupola(b, x, y2, z, half * 0.84, cap, 5);
    else lathe(b, x, z, [[half * 0.84, y2], [half * 0.76, y2 + half * 0.44], [half * 0.44, y2 + half * 0.82], [0.02, y2 + half * 0.98]], 6, cap);
    return;
  }
  const top = dome(b, x, y2, z, half * 0.86, cap, { kind: 'round', sides: n === 4 ? 6 : n, finial: false });
  b.cyl(x, z, top - 0.04, top + half * 0.5, half * 0.08, 0.015, 4, GOLD, { cap: false });
}

/**
 * A slender minaret for a small mosque, in the manner of mughal's `minaret`
 * and a third of its weight: a tapering shaft, a balcony half-way up and
 * another at its head, and a small open pavilion under a dome.
 */
function slimMinaret(b: GeoBuilder, x: number, z: number, y0: number, y1: number, r: number, color: number, cap: number): void {
  const shaft = y1 - y0 - r * 2.3, f = 0.56, top = r * 0.74, mid = r + (top - r) * f;
  for (const [ya, yb, ra, rb] of [[y0, y0 + shaft * f, r, mid], [y0 + shaft * f, y0 + shaft, mid, top]]) {
    b.cyl(x, z, ya, yb, ra, rb, 8, color, { cap: false });
    b.cyl(x, z, yb - 0.4, yb, rb, rb + 0.4, 8, color, { cap: MARBLE_SHADE });
  }
  kiosk(b, x, y0 + shaft, z, top * 0.95, r * 1.05, color, cap, 6, true);
}

/**
 * A broad flight of steps down from a plinth, open on three sides: each step
 * is wider than the one above it. It leaves the wall that faces `f` at
 * `plane`, round `c` along it, `w` wide at its head.
 */
function flight(b: GeoBuilder, f: Facing, plane: number, c: number, w: number, n: number, tread: number, splay: number, y: number, color: number): void {
  for (let i = 0; i < n; i++) {
    const top = (y * (n - i)) / (n + 1), out = (i + 1) * tread, hw = w / 2 + (i + 1) * splay;
    if (f === 'E') b.box(plane, 0, c - hw, plane + out, top, c + hw, color, { faces: 'NEST' });
    else if (f === 'W') b.box(plane - out, 0, c - hw, plane, top, c + hw, color, { faces: 'NWST' });
    else if (f === 'S') b.box(c - hw, 0, plane, c + hw, top, plane + out, color, { faces: 'ESWT' });
    else b.box(c - hw, 0, plane - out, c + hw, top, plane, color, { faces: 'NEWT' });
  }
}

interface Bays { N?: number; E?: number; S?: number; W?: number }
interface HallOpts {
  stone?: number; shade?: number; roof?: number; lit?: number;
  /** The sides whose arches are drawn finely: the east, unless this says otherwise. */
  fine?: string;
  /** Without a parapet: its chajja is its roof. */
  plain?: boolean;
}

/**
 * A flat-roofed hall of arches: its walls, a chajja with its underside, a low
 * parapet, and a row of arches on every side that is given bays. Returns the
 * height of its roof.
 */
function pavilion(b: GeoBuilder, xa: number, za: number, xb: number, zb: number, y: number, h: number, bays: Bays, o: HallOpts = {}): number {
  const stone = o.stone ?? MARBLE, shade = o.shade ?? MARBLE_SHADE, e = 0.3;
  b.box(xa, y, za, xb, y + h, zb, stone, { faces: 'NESW' });
  b.box(xa - e, y + h, za - e, xb + e, y + h + 0.14, zb + e, shade, { faces: 'NESWTB', top: o.plain ? (o.roof ?? stone) : shade });
  if (!o.plain) b.box(xa + 0.1, y + h + 0.14, za + 0.1, xb - 0.1, y + h + 0.44, zb - 0.1, stone, { top: o.roof ?? shade });
  for (const f of ['N', 'E', 'S', 'W'] as const) {
    const n = bays[f];
    if (!n) continue;
    const ns = f === 'N' || f === 'S', plane = f === 'N' ? za : f === 'S' ? zb : f === 'E' ? xb : xa;
    openings(b, f, plane, (ns ? xa : za) + 0.18, (ns ? xb : zb) - 0.18, y + 0.1, n, h * 0.74, RECESS, o.lit ?? 0.7, (o.fine ?? 'E').includes(f));
  }
  return y + h + (o.plain ? 0.14 : 0.44);
}

// ---------------------------------------------------------------------------
// The Red Fort
// ---------------------------------------------------------------------------

const APRON = 0xd9c2a4, TERRACE = 0xdcd2bd, PASSAGE = 0x8f5f4c, STREAM = 0x7fa6a0, ELEPHANT = 0x4c4d52;
/** Half the width of a great gate's bay, between the middles of its two towers. */
const GATE_HALF = 2.65;

/**
 * One of the fort's two great gates, built round (0, 0) and facing south: an
 * arched way through a tall bay of three storeys between two eight-sided
 * towers, an open pavilion under a white dome on each tower, and between the
 * pavilions the screen of seven small white domes with a slender turret at
 * either end. `H` is how high the pavilions' domes stand. The wall it stands
 * in runs along x, and its outer face is half a unit south of the middle.
 */
function greatGate(b: GeoBuilder, H: number): void {
  const hw = GATE_HALF, zf = 1.2, zb = -1.9, aw = 2.2, roof = H * 0.8, ah = roof * 0.46, r = 1.2, tz = zf - 0.2, head = roof + 0.35;
  // the bay: two piers, the arched way between them, its floor and its roof
  for (const s of [-1, 1]) b.box(s < 0 ? -hw : aw / 2, 0, zb, s < 0 ? -aw / 2 : hw, roof, zf, RED, { top: RED_DARK });
  archThrough(b, 'z', 0, (zf + zb) / 2, zf - zb, aw, 0, ah, roof, RED, RED_DARK);
  b.box(-aw / 2, roof - 0.05, zb, aw / 2, roof, zf, RED_DARK, { faces: 'T' });
  b.box(-aw / 2, 0, zb, aw / 2, 0.05, zf, PASSAGE, { faces: 'T' });
  // three storeys of blind panels over the arch, or as many as there is room for
  const rows = Math.floor((roof - ah - 0.5) / 1.6);
  for (let i = 0; i < rows; i++) for (const x of [-0.95, 0, 0.95]) opening(b, 'S', zf, x, ah + 0.55 + i * 1.6, 0.56, 1.05, RED_DARK);
  for (const x of [-0.95, 0, 0.95]) opening(b, 'N', zb, x, ah + 0.55, 0.56, 1.05, RED_DARK);
  // the two towers, each with a collar and its pavilion
  for (const s of [-1, 1]) {
    b.cyl(s * hw, tz, 0, head - 0.4, r * 1.04, r, 8, RED, { cap: false });
    b.cyl(s * hw, tz, head - 0.4, head, r, r + 0.26, 8, RED_DARK, { cap: RED_DARK });
    kiosk(b, s * hw, head, tz, 0.85, 1.05, RED, MARBLE, 6);
  }
  // the screen: a low arcade in shadow with seven small domes on it, and a slender turret at either end
  const sz = zf - 0.34, span = 1.3;
  b.box(-span, roof, sz - 0.12, span, roof + 0.66, sz + 0.12, RECESS, { faces: 'NESW' });
  b.box(-span - 0.1, roof + 0.66, sz - 0.24, span + 0.1, roof + 0.8, sz + 0.24, RED, { faces: 'NESWTB' });
  for (let i = 0; i < 7; i++) cupola(b, -span + ((i + 0.5) / 7) * span * 2, roof + 0.8, sz, 0.2, MARBLE);
  for (const s of [-1, 1]) {
    b.cyl(s * (span + 0.02), sz - 0.52, roof, roof + 2, 0.15, 0.11, 6, RED, { cap: false });
    cupola(b, s * (span + 0.02), roof + 2, sz - 0.52, 0.17, MARBLE);
  }
}

/** A stone elephant on its plinth, as long as `s` makes it. It stands round (x, z) and looks along x, the way `dir` points. */
function elephant(b: GeoBuilder, x: number, z: number, dir: 1 | -1, s: number): void {
  const P = 0.8, u = (n: number): number => n * s;
  b.moved(x, 0, z, dir === 1 ? 0 : Math.PI, () => {
    b.box(u(-1.95), 0, u(-0.85), u(2.25), P, u(0.85), RED_LIGHT, { top: RED });
    for (const [lx, lz] of [[-0.95, -0.42], [-0.95, 0.42], [0.75, -0.42], [0.75, 0.42]]) b.box(u(lx - 0.25), P, u(lz - 0.23), u(lx + 0.25), P + u(1.05), u(lz + 0.23), ELEPHANT, { faces: 'NESW' });
    b.box(u(-1.3), P + u(1.0), u(-0.66), u(1.1), P + u(2.3), u(0.66), ELEPHANT, { faces: 'NESWTB' });
    b.box(u(0.95), P + u(1.4), u(-0.5), u(1.85), P + u(2.55), u(0.5), ELEPHANT, { faces: 'NESWTB' });
    for (const e of [-1, 1]) b.box(u(0.9), P + u(1.45), u(e < 0 ? -0.62 : 0.5), u(1.45), P + u(2.4), u(e < 0 ? -0.5 : 0.62), ELEPHANT);
    b.sweep([[u(1.85), P + u(2.0), 0], [u(2.12), P + u(1.2), 0], [u(2.14), P + u(0.25), 0]], [u(0.26), u(0.19), u(0.11)], ELEPHANT);
    for (const e of [-1, 1]) b.beam([u(1.82), P + u(1.5), u(e * 0.3)], [u(2.4), P + u(1.22), u(e * 0.34)], u(0.07), u(0.03), 0xf1ece0);
  });
}

function redFort(k: Build, t: Thing): void {
  const b = k.b, x0 = t.x, x1 = t.x + t.w, z0 = t.z, z1 = t.z + t.d, H = t.h;
  const [gx0, gz0, gx1, gz1] = GROUNDS['red-fort'];
  // the walls' thickness, the walk along their top, and the terrace of the river front
  const TW = 1.3, walk = H - 0.9, T = H - 2.6;
  const ix0 = x0 + TW, iz0 = z0 + TW, iz1 = z1 - TW, XT = x1 - 5.4;
  // the Lahori Gate stands in the west wall where Chandni Chowk meets it, the Delhi Gate in the middle of the south wall
  const lz = Math.min(Math.max(CHANDNI.z, z0 + 5), z1 - 12), dx = (x0 + x1) / 2;
  /** A place along the river front, from 0 at its south end to 1 at its north. */
  const v = (f: number): number => iz1 + (iz0 - iz1) * f;

  // --- the ground: the fort's own paving, cut back where the road's turning circle comes close, and lawns between its paths ---
  const turn = STREETS.find((s) => s.id === 'kashmere-turn');
  const reach = TURN_R + (turn?.opts?.width ?? 10) / 2 + (turn?.opts?.sidewalk ?? 3);
  const past = (d: number): number => Math.sqrt(Math.max(0, reach * reach - d * d));
  const apron: P2[] = [[gx0, KASHMERE_TURN[1] + past(gx0 - KASHMERE_TURN[0]) + 0.3], [KASHMERE_TURN[0] + past(gz0 - KASHMERE_TURN[1]) + 0.3, gz0], [gx1, gz0], [gx1, gz1], [gx0, gz1]];
  area(k, apron, APRON);
  const nz = v(0.3); // the line the drum house and the hall of audience stand on
  const lawn = (xa: number, za: number, xb: number, zb: number): void => area(k, rect(xa, za, xb, zb), LAWN, 0.032);
  lawn(ix0 + 0.7, lz + 2.4, ix0 + 5.7, nz - 4.7);
  lawn(ix0 + 7.1, lz + 2.4, XT - 2.2, nz - 5.4);
  lawn(ix0 + 6.6, lz - 3.4, XT - 0.4, lz - 1.6);
  lawn(ix0 + 4.6, nz - 3.7, XT - 5.0, nz - 0.7);
  lawn(ix0 + 4.6, nz + 0.7, XT - 5.0, nz + 3.7);
  lawn(ix0 + 0.7, nz + 5.2, dx - 1.7, iz1 - 0.9);
  lawn(dx + 1.7, nz + 5.2, XT - 0.6, iz1 - 0.9);
  // outside: the dry moat as a strip of grass under the west wall, and grass in the corners of the forecourt
  lawn(gx0 + 0.6, lz + 5.2, x0 - 0.5, z1 - 2.6);
  lawn(gx0 + 0.6, z1 + 6.5, dx - 8.6, gz1 - 0.6);
  lawn(dx + 8.4, z1 + 2.4, gx1 - 0.5, gz1 - 0.6);

  // --- the walls, with a course of stone under their battlements ---
  const wall = (xa: number, za: number, xb: number, zb: number, faces: string): void => b.box(xa, 0, za, xb, walk, zb, RED, { top: RED_DARK, faces });
  wall(x0, z0, x1, iz0, 'NESWT');
  wall(x0, iz0, ix0, lz - GATE_HALF + 0.2, 'EWT');
  wall(x0, lz + GATE_HALF - 0.2, ix0, iz1, 'EWT');
  wall(x0, iz1, dx - GATE_HALF + 0.2, z1, 'NSWT');
  wall(dx + GATE_HALF - 0.2, iz1, x1, z1, 'NSET');
  b.box(x0 - 0.12, walk - 0.55, lz + GATE_HALF, x0, walk - 0.3, z1, RED_DARK, { faces: 'WTB' });
  b.box(x0, walk - 0.55, z1, dx - GATE_HALF, walk - 0.3, z1 + 0.12, RED_DARK, { faces: 'STB' });
  b.box(dx + GATE_HALF, walk - 0.55, z1, x1, walk - 0.3, z1 + 0.12, RED_DARK, { faces: 'STB' });
  b.box(x0, walk - 0.55, z0 - 0.12, x1, walk - 0.3, z0, RED_DARK, { faces: 'NTB' });
  const teeth = { step: 2.6, h: 0.9 };
  merlons(b, x0 + 1.6, z0, x1 - 2.2, z0 + 0.4, walk, RED, teeth);
  merlons(b, x0, lz + GATE_HALF + 1.5, x0 + 0.4, z1 - 2.3, walk, RED, teeth);
  merlons(b, x0 + 2.3, z1 - 0.4, dx - GATE_HALF - 1.5, z1, walk, RED, teeth);
  merlons(b, dx + GATE_HALF + 1.5, z1 - 0.4, x1 - 2.3, z1, walk, RED, teeth);

  // --- bastions: eight-sided, with a white-domed chhatri on each of the three corners that have room for one ---
  const bastion = (cx: number, cz: number, r: number, top: number, crowned: boolean): void => {
    b.cyl(cx, cz, 0, top - 0.45, r * 1.05, r, 8, RED, { cap: crowned ? false : RED_DARK });
    if (crowned) {
      b.cyl(cx, cz, top - 0.45, top, r, r + 0.25, 8, RED_DARK, { cap: RED_DARK });
      kiosk(b, cx, top, cz, r * 0.56, 1.2, RED, MARBLE, 6, true);
    }
    clearOfStreets(k, 'a bastion of the Red Fort', cx - r - 0.1, cz - r - 0.1, cx + r + 0.1, cz + r + 0.1);
  };
  bastion(x0 + 0.5, z1 - 0.5, 1.55, H + 0.4, true);
  bastion(x1 - 0.5, z1 - 0.5, 1.55, H + 0.4, true);
  bastion(x1 - 0.5, z0 + 0.85, 1.55, H + 0.4, true);
  bastion(x0 + 0.4, z0 + 0.4, 1.0, walk + 1.0, false);
  for (const f of [0.36, 0.7]) bastion(x0 + 0.1, lz + GATE_HALF + (z1 - lz - GATE_HALF) * f, 1.2, walk + 0.95, false);

  // --- the two great gates, and the flag over the Lahori Gate ---
  const LAHORI = H + 6, DELHI = H + 4;
  b.moved(x0 + 0.5, 0, lz, Math.PI / 2, () => greatGate(b, LAHORI));
  b.moved(dx, 0, z1 - 0.5, 0, () => greatGate(b, DELHI));
  tiranga(b, x0 + 1.5, lz, LAHORI * 0.8, 5.2);
  // a lamp in each gate's archway, and one either side of it
  lamp(k, x0 + 0.2, LAHORI * 0.3, lz);
  lamp(k, dx, DELHI * 0.3, z1 - 0.2);
  for (const s of [-1, 1]) {
    lamp(k, x0 - 0.85, 2.6, lz + s * 1.2, 0.24);
    lamp(k, dx + s * 1.2, 2.6, z1 + 0.85, 0.24);
  }

  // --- their barbicans: a low walled court before each gate, entered from the side ---
  const BH = 3.4, BT = 0.7, low = { step: 2.5, h: 0.65 };
  const court = (xa: number, za: number, xb: number, zb: number, faces: string): void => b.box(xa, 0, za, xb, BH, zb, RED, { top: RED_DARK, faces });
  {
    // the Lahori Gate's, entered from the north
    const bz0 = lz - 4.4, bz1 = lz + 4.4, bx0 = Math.max(gx0 + 0.4, KASHMERE_TURN[0] + past(bz0 - KASHMERE_TURN[1]) + 0.15), ex = (bx0 + BT + x0) / 2;
    clearOfStreets(k, "the Lahori Gate's barbican", bx0, bz0, x0, bz1);
    court(bx0, bz0, bx0 + BT, bz1, 'NESWT');
    court(bx0 + BT, bz1 - BT, x0 + 0.2, bz1, 'NST');
    court(bx0 + BT, bz0, x0 + 0.2, bz0 + BT, 'NST');
    for (const [f, plane] of [['N', bz0], ['S', bz0 + BT]] as const) opening(b, f, plane, ex, 0, 1.6, 2.5, RECESS, 0.7, true);
    merlons(b, bx0, bz0 + 0.4, bx0 + 0.35, bz1 - 0.4, BH, RED, low);
    merlons(b, bx0 + 0.6, bz1 - 0.35, x0 - 0.3, bz1, BH, RED, low);
    pool(k, (bx0 + x0) / 2, lz, 13, 0.85);
  }
  const sx0 = dx - 7.5, sx1 = dx + 7.5, sz1 = gz1 - 1, ez = (z1 + sz1) / 2;
  {
    // the Delhi Gate's, entered from the west, with the two elephants either side of the way to the gate
    clearOfStreets(k, "the Delhi Gate's barbican", sx0, z1, sx1, sz1);
    court(sx0, sz1 - BT, sx1, sz1, 'NESWT');
    court(sx1 - BT, z1 - 0.2, sx1, sz1 - BT, 'EWT');
    court(sx0, z1 - 0.2, sx0 + BT, ez - 0.9, 'EWT');
    court(sx0, ez + 0.9, sx0 + BT, sz1 - BT, 'EWT');
    archThrough(b, 'x', sx0 + BT / 2, ez, BT, 1.8, 0, 2.6, BH, RED, RED_DARK);
    b.box(sx0, BH - 0.05, ez - 0.9, sx0 + BT, BH, ez + 0.9, RED_DARK, { faces: 'T' });
    merlons(b, sx0 + 1.2, sz1 - 0.35, sx1 - 1.2, sz1, BH, RED, low);
    merlons(b, sx1 - 0.35, z1 + 0.5, sx1, sz1 - 1.2, BH, RED, low);
    merlons(b, sx0, z1 + 0.5, sx0 + 0.35, sz1 - 1.2, BH, RED, low);
    for (const cx of [sx0 + 0.35, sx1 - 0.35]) b.cyl(cx, sz1 - 0.35, 0, BH + 0.9, 0.9, 0.85, 8, RED, { cap: RED_DARK });
    for (const s of [-1, 1] as const) elephant(b, dx + s * 2.95, z1 + 3.5, s === -1 ? 1 : -1, 0.9);
    pool(k, dx, z1 + 4.5, 15, 0.9);
  }

  // --- the river front: a terrace as high as the wall, a rail of marble along its edge, and the marble halls on it ---
  b.box(XT, 0, iz0, x1, T, iz1, RED, { top: TERRACE, faces: 'EWT' });
  b.box(x1 - 0.3, T, iz0, x1, T + 0.45, iz1, MARBLE_SHADE, { top: MARBLE, faces: 'EWT' });
  b.box(x1, T - 0.4, iz0 + 0.6, x1 + 0.12, T - 0.15, iz1 - 0.6, RED_DARK, { faces: 'ETB' });
  b.box(x1, 0, iz0 + 0.6, x1 + 0.16, 0.7, iz1 - 0.6, RED_DARK, { faces: 'ET' });
  openings(b, 'W', XT, iz0 + 0.6, lz - 0.4, 0.3, 2, 3.4, RED_DARK, 0, true);
  openings(b, 'W', XT, lz + 7.8, iz1 - 0.6, 0.3, 9, 3.4, RED_DARK, 0, true);
  for (const f of [0.22, 0.64, 0.82]) opening(b, 'E', x1, v(f), 0.7, 0.8, 1.5, RECESS);
  // the Stream of Paradise, which ran through every hall
  b.box(x1 - 2.5, T, v(0.92), x1 - 2.0, T + 0.012, v(0.06), STREAM, { faces: 'T' });
  const xe = x1 - 0.5;
  const hall = (f0: number, f1: number, deep: number, h: number, bays: Bays, plain = false): number => pavilion(b, xe - deep, v(f1), xe, v(f0), T, h, bays, { plain });
  hall(0.045, 0.13, 2.5, 2.3, { E: 3, W: 3, S: 1 }, true); // Mumtaz Mahal
  hall(0.165, 0.375, 3.3, 2.8, { E: 5, W: 5, S: 2, N: 2 }); // Rang Mahal
  hall(0.41, 0.505, 2.7, 2.5, { W: 3, S: 1, N: 1 }, true); // Khas Mahal
  {
    // the Musamman Burj: an eight-sided tower that stands out from the wall, red below and marble above, under a dome
    const mx = x1 - 0.15, mz = v(0.458), mr = 1.3, y1 = T + 2.72;
    b.cyl(mx, mz, 0, T + 0.5, mr * 1.08, mr, 8, RED, { cap: false });
    drum(b, mx, mz, T + 0.5, y1, mr, MARBLE, { sides: 8, arches: 8, lit: 5 });
    b.cyl(mx, mz, y1, y1 + 0.14, mr + 0.3, mr + 0.3, 8, MARBLE_SHADE);
    const at = (i: number): V3 => [mx + Math.cos(((i + 0.5) / 8) * Math.PI * 2) * (mr + 0.3), y1, mz + Math.sin(((i + 0.5) / 8) * Math.PI * 2) * (mr + 0.3)];
    for (let i = 1; i < 7; i++) tri(b, at(0), at(i), at(i + 1), [0, -1, 0], MARBLE_SHADE);
    const crown = dome(b, mx, y1 + 0.14, mz, mr * 0.9, MARBLE, { kind: 'round', sides: 8, finial: false });
    b.cyl(mx, mz, crown - 0.04, crown + 0.6, 0.1, 0.015, 4, GOLD, { cap: false });
    // the balcony on its river side
    b.box(mx + mr * 0.92, T + 0.95, mz - 0.4, mx + mr * 0.92 + 0.34, T + 1.8, mz + 0.4, MARBLE, { faces: 'NESTB' });
    // and the water gate in the wall beside it
    opening(b, 'E', x1, mz + 2.3, 0, 1.0, 1.9, RECESS, 0.5, true);
    clearOfStreets(k, 'the Musamman Burj', mx - 1, mz - 1.5, mx + mr + 0.3, mz + 1.5);
  }
  {
    // the Diwan-i-Khas, with a pillared chhatri on each corner of its roof
    const f0 = 0.54, f1 = 0.715, deep = 3.5, top = hall(f0, f1, deep, 2.9, { E: 5, W: 5, S: 3, N: 3 });
    for (const [x, z] of [[xe - deep + 0.5, v(f1) + 0.5], [xe - 0.5, v(f1) + 0.5], [xe - 0.5, v(f0) - 0.5], [xe - deep + 0.5, v(f0) - 0.5]]) kiosk(b, x, top, z, 0.36, 0.55, MARBLE, MARBLE, 4, true);
  }
  hall(0.74, 0.8, 2.1, 1.9, { E: 2, W: 1 }, true); // the baths
  {
    // the Moti Masjid, a little inside: high walls of red stone, and three white domes over them
    const ma = v(0.845), mb = v(0.735), xa = XT + 0.3, xb = xe - 2.5;
    b.box(xa, T, ma, xb, T + 2.2, mb, RED, { faces: 'NESW' });
    b.box(xa - 0.1, T + 2.2, ma - 0.1, xb + 0.1, T + 2.36, mb + 0.1, RED_DARK);
    for (let i = 0; i < 3; i++) bulb(b, xa + 0.8, T + 2.36, ma + ((i + 0.5) / 3) * (mb - ma), i === 1 ? 0.62 : 0.52, MARBLE, 5);
    opening(b, 'E', xb, (ma + mb) / 2, T + 0.1, 0.8, 1.6, RECESS, 0.5, true);
  }
  {
    // the pavilion by the Shah Burj, with a raised roof of its own
    const f0 = 0.875, f1 = 0.945, deep = 2.3, top = hall(f0, f1, deep, 2.1, { E: 3, S: 2, W: 2 }, true);
    b.box(xe - deep + 0.4, top, v(f1) + 0.4, xe - 0.4, top + 0.5, v(f0) - 0.4, MARBLE, { top: MARBLE_SHADE });
  }
  // a stair up to the terrace, along its inner face
  slab(b, [XT - 0.9, 0, lz + 7.5], [XT - 0.9, T, lz + 0.5], 0.9, T, RED_LIGHT);
  // the walls are lit from their foot by night: the river front most, then the south and the west
  for (const f of [0.12, 0.5, 0.88]) pool(k, x1 + 0.6, v(f), 13, 0.9);
  for (const f of [0.27, 0.63]) pool(k, x1 - 2.2, v(f), 9, 0.6, '#fff3dc');
  for (const x of [x0 + 3.2, x1 - 3.2]) pool(k, x, z1 + 1.2, 9, 0.75);
  for (const f of [0.3, 0.75]) pool(k, x0 - 1, lz + GATE_HALF + (z1 - lz - GATE_HALF) * f, 11, 0.7);
  // and a lamp stands on the rail before each hall
  for (const f of [0.09, 0.2, 0.34, 0.585, 0.67, 0.77, 0.91]) lamp(k, x1 - 0.15, T + 0.61, v(f), 0.26);

  // --- inside: the covered bazaar behind the Lahori Gate, the drum house, and the hall of public audience ---
  {
    const cx0 = x0 + 2.2, cx1 = cx0 + 5;
    b.box(cx0, 0, lz - 1.35, cx1, 3.3, lz + 1.35, RED, { top: RED_DARK, faces: 'NEST' });
    b.box(cx0, 3.3, lz - 0.8, cx1, 3.9, lz + 0.8, RED_DARK, { faces: 'NEST' });
    for (const f of ['N', 'S'] as const) openings(b, f, f === 'N' ? lz - 1.35 : lz + 1.35, cx0 + 1.2, cx1 - 0.2, 0.1, 4, 1.9, RECESS, 0.6);
    opening(b, 'E', cx1, lz, 0, 1.5, 2.6, RECESS, 0.9, true);
    const nx0 = ix0 + 2.3;
    b.box(nx0, 0, nz - 2, nx0 + 1.8, 5, nz + 2, RED, { top: RED_DARK });
    for (const f of ['W', 'E'] as const) {
      const plane = f === 'W' ? nx0 : nx0 + 1.8;
      opening(b, f, plane, nz, 0, 1.3, 2.7, RECESS, 0.9, true);
      openings(b, f, plane, nz - 1.8, nz + 1.8, 3.2, 3, 1.2, RECESS, 0.5);
    }
    const ax0 = XT - 4.4, ax1 = XT - 1;
    b.box(ax0 - 0.6, 0, nz - 4.4, ax1 + 0.3, 0.35, nz + 4.4, RED_LIGHT);
    pavilion(b, ax0, nz - 4, ax1, nz + 4, 0.35, 3.9, { W: 9, N: 3, S: 3 }, { stone: RED, shade: RED_DARK, roof: 0xc28a70, lit: 0.6, fine: '' });
    pool(k, ix0 + 5, (lz + nz) / 2, 16, 0.5);
    pool(k, ax0 - 2, nz, 10, 0.6);
  }
  // trees on the lawns and along the moat, and people out for the day
  for (const [x, z, s] of [[ix0 + 1.6, lz + 4, 0.55], [ix0 + 4.6, lz + 9, 0.6], [ix0 + 1.8, nz - 6, 0.5], [XT - 4.2, lz + 4.2, 0.55], [XT - 3, nz - 7, 0.6], [ix0 + 1.8, iz1 - 2.2, 0.55], [dx - 3.2, iz1 - 3, 0.5], [XT - 1.6, iz1 - 2.4, 0.5]]) k.tree(x, z, s);
  for (const f of [0.2, 0.5, 0.8]) k.tree(gx0 + 1.9, lz + 6 + (z1 - 4 - lz - 6) * f, 0.5);
  k.tree(gx0 + 2.2, gz1 - 2.4, 0.6);
  k.tree(gx1 - 1.6, gz1 - 3, 0.55);
  const rand = rng(16390);
  for (let i = 0; i < 9; i++) k.person(ix0 + 6.1 + rand() * 0.8, lz + 2 + rand() * (iz1 - lz - 4));
  for (let i = 0; i < 5; i++) k.person(ix0 + 1 + rand() * 7.5, lz + 1.95 + rand() * 0.4);
  for (let i = 0; i < 6; i++) k.person(dx - 1 + rand() * 2, z1 + 4.6 + rand() * 4.4);
}

// ---------------------------------------------------------------------------
// Jama Masjid
// ---------------------------------------------------------------------------

const COURT = 0xc98468, STEP = 0xc4705a;

/**
 * A gate of a mosque, built facing south with the middle of its outer face
 * at (0, y, 0): an arched way through a block of red stone, blind panels
 * beside the arch, a row of small white domes along its top and a slender
 * turret on each front corner.
 */
function mosqueGate(b: GeoBuilder, y: number, w: number, d: number, h: number, aw: number, ah: number, domes: number): void {
  for (const s of [-1, 1]) b.box(s < 0 ? -w / 2 : aw / 2, y, -d, s < 0 ? -aw / 2 : w / 2, y + h, 0, RED, { faces: 'NESW' });
  archThrough(b, 'z', 0, -d / 2, d, aw, y, ah, y + h, RED, RED_DARK);
  // the cornice, which is also the roof, and the small domes along its front
  b.box(-w / 2 - 0.15, y + h, -d - 0.15, w / 2 + 0.15, y + h + 0.24, 0.15, RED_DARK, { faces: 'NESWTB' });
  for (let i = 0; i < domes; i++) cupola(b, -w / 2 + 0.25 + ((i + 0.5) / domes) * (w - 0.5), y + h + 0.24, -0.3, Math.min(0.32, (w - 0.5) / domes / 2.3), MARBLE);
  const side = (w - aw) / 4 + aw / 2;
  for (const s of [-1, 1]) {
    for (const yy of [y + 0.3, y + ah * 0.5 + 0.2]) if (yy + 1.1 < y + h) opening(b, 'S', 0, s * side, yy, (w - aw) / 2 * 0.52, Math.min(1.5, ah * 0.36), RED_DARK);
    b.cyl(s * (w / 2 - 0.02), -0.02, y, y + h + 1.5, 0.21, 0.16, 6, MARBLE, { cap: false });
    cupola(b, s * (w / 2 - 0.02), y + h + 1.5, -0.02, 0.2, MARBLE);
  }
}

function jamaMasjid(k: Build, t: Thing): void {
  const b = k.b, x0 = t.x, x1 = t.x + t.w, z0 = t.z, z1 = t.z + t.d, P = 3;
  // the plinth, with room for the three flights of steps round it
  const px0 = x0 + 0.4, px1 = x1 - 3.7, pz0 = z0 + 3.2, pz1 = z1 - 3.2, cz = (pz0 + pz1) / 2;
  b.box(px0, 0, pz0, px1, P, pz1, RED, { top: COURT });
  b.box(px0 - 0.15, 0, pz0 - 0.15, px1 + 0.15, 0.45, pz1 + 0.15, RED_DARK, { faces: 'NESWT' });

  // --- the prayer hall, along the west side ---
  const hx0 = px0, hx1 = px0 + 4.6, cw = 1.3, hz0 = pz0 + cw, hz1 = pz1 - cw, roof = P + 5;
  const gxc = (hx1 + px1) / 2; // the middle of the court, where the north and south gates stand
  b.box(hx0, P, hz0, hx1, roof, hz1, RED, { faces: 'NESW' });
  b.box(hx0 - 0.1, roof, hz0 - 0.1, hx1 + 0.25, roof + 0.16, hz1 + 0.1, RED_DARK, { faces: 'NESWTB' });
  b.box(hx0, roof + 0.16, hz0, hx1, roof + 0.5, hz1, RED, { top: 0xc9a58f });
  // its front: five arches either side of the great portal, under a band of white marble
  const half = 1.9;
  for (const [a0, a1] of [[hz0 + 0.5, cz - half], [cz + half, hz1 - 0.5]]) {
    arcade(b, 'E', hx1, a0, a1, P + 0.1, 5, 2.9, LAMPLIT, { lit: 0.6 * LIT });
    b.box(hx1, P + 3.5, a0 + 0.1, hx1 + 0.06, P + 4.3, a1 - 0.1, MARBLE, { faces: 'E' });
  }
  b.box(hx1 - 0.3, P, cz - half, hx1 + 0.6, P + 7.6, cz + half, RED, { top: RED_DARK });
  niche(b, 'E', hx1 + 0.6, cz, P + 0.05, 2.5, 5.9, LAMPLIT, { lit: 0.8 * LIT });
  b.box(hx1 + 0.6, P + 6.3, cz - 1.55, hx1 + 0.66, P + 7.1, cz + 1.55, MARBLE, { faces: 'E' });
  for (const s of [-1, 1]) {
    b.cyl(hx1 + 0.6, cz + s * half, P, P + 8.7, 0.22, 0.17, 6, MARBLE, { cap: false });
    cupola(b, hx1 + 0.6, P + 8.7, cz + s * half, 0.21, MARBLE);
  }
  // the wall towards Mecca, with the bay of the mihrab standing out
  b.box(hx0 - 0.3, 0, cz - 1.6, hx0, roof + 0.5, cz + 1.6, RED, { top: RED_DARK, faces: 'NSWT' });
  openings(b, 'W', hx0, hz0 + 0.4, cz - 1.8, 0.8, 3, 2.4, RED_DARK);
  openings(b, 'W', hx0, cz + 1.8, hz1 - 0.4, 0.8, 3, 2.4, RED_DARK);
  // three domes of white marble, striped in black, each on its drum
  const dxm = (hx0 + hx1) / 2;
  for (const [z, r, up, n] of [[cz, 2.25, 0.9, 9], [cz - 5, 1.8, 0.6, 7], [cz + 5, 1.8, 0.6, 7]]) {
    b.cyl(dxm, z, roof + 0.5, roof + 0.5 + up, r * 0.86, r * 0.84, 8, MARBLE, { cap: false });
    stripedDome(b, dxm, roof + 0.5 + up, z, r, n);
  }
  // a minaret at each end of the front: red stone striped with white marble, three balconies, a pavilion on top
  for (const z of [hz0 - 0.45, hz1 + 0.45]) minaret(b, hx1 - 0.55, z, P, t.h - 0.5, 0.8, RED, { stripe: MARBLE, balconies: [0.36, 0.7, 1], cap: MARBLE });

  // --- the cloisters round the court, open to both sides, with a chhatri on each corner ---
  const CH = 2.3, top = P + CH;
  const cloister = (xa: number, za: number, xb: number, zb: number, outer: Facing, n: number, inner = n, from?: number): void => {
    b.box(xa, P, za, xb, top, zb, RED, { top: RED_DARK });
    const ns = outer === 'N' || outer === 'S', a0 = (ns ? xa : za) + 0.25, a1 = (ns ? xb : zb) - 0.25;
    const back: Facing = outer === 'N' ? 'S' : outer === 'S' ? 'N' : 'W';
    openings(b, outer, outer === 'N' ? za : outer === 'S' ? zb : xb, a0, a1, P + 0.12, n, CH * 0.76, RECESS, 0.4);
    openings(b, back, outer === 'N' ? zb : outer === 'S' ? za : xa, from ?? a0, a1, P + 0.12, inner, CH * 0.76, RECESS, 0.5);
  };
  const GN = 1.8, GE = 2.4; // half the width of the north and south gates, and of the east gate
  for (const [za, zb, f] of [[pz0, pz0 + cw, 'N'], [pz1 - cw, pz1, 'S']] as const) {
    cloister(px0, za, gxc - GN + 0.1, zb, f, 6, 2, hx1 + 0.9);
    cloister(gxc + GN - 0.1, za, px1, zb, f, 3);
  }
  cloister(px1 - cw, pz0 + cw, px1, cz - GE + 0.1, 'E', 3);
  cloister(px1 - cw, cz + GE - 0.1, px1, pz1 - cw, 'E', 3);
  for (const x of [px0 + 0.65, px1 - 0.65]) for (const z of [pz0 + 0.65, pz1 - 0.65]) kiosk(b, x, top, z, 0.58, 0.95, RED, MARBLE, 4, true);

  // --- the three gates, the east one the great one, and the flight of steps up to each ---
  b.moved(px1 - 0.1, 0, cz, -Math.PI / 2, () => mosqueGate(b, P, GE * 2, 2.1, 6.6, 2.6, 4.7, 5));
  b.moved(gxc, 0, pz1 - 0.1, 0, () => mosqueGate(b, P, GN * 2, 1.9, 4.8, 2, 3.4, 3));
  b.moved(gxc, 0, pz0 + 0.1, Math.PI, () => mosqueGate(b, P, GN * 2, 1.9, 4.8, 2, 3.4, 3));
  flight(b, 'E', px1, cz, GE * 2 + 1.4, 7, 0.5, 0.45, P, STEP);
  flight(b, 'S', pz1, gxc, GN * 2 + 1.4, 6, 0.5, 0.42, P, STEP);
  flight(b, 'N', pz0, gxc, GN * 2 + 1.4, 6, 0.5, 0.42, P, STEP);
  // cells in the plinth, where the steps leave its faces free
  for (const z of [pz0 + 1.25, pz1 - 1.25]) opening(b, 'E', px1, z, 0.5, 1.2, 1.9, RECESS, 0.35);
  for (const [f, plane] of [['N', pz0], ['S', pz1]] as const) {
    openings(b, f, plane, px0 + 0.4, gxc - 5.4, 0.5, 3, 1.9, RECESS, 0.35);
    opening(b, f, plane, px1 - 0.85, 0.5, 1.0, 1.9, RECESS, 0.35);
  }

  // --- the court: the marble tank in its middle, and a few visitors ---
  b.box(gxc - 1.7, P, cz - 1.5, gxc + 1.7, P + 0.34, cz + 1.5, MARBLE);
  b.box(gxc - 1.4, P + 0.34, cz - 1.2, gxc + 1.4, P + 0.352, cz + 1.2, STREAM, { faces: 'T' });
  b.cyl(gxc, cz, P + 0.3, P + 0.8, 0.16, 0.12, 6, MARBLE);
  const rand = rng(16560);
  for (let i = 0; i < 9; i++) {
    const x = hx1 + 1.6 + rand() * (px1 - cw - hx1 - 2.6), z = hz0 + 0.8 + rand() * (hz1 - hz0 - 1.6);
    if (Math.abs(x - gxc) > 2.3 || Math.abs(z - cz) > 2.1) k.person(x, z, P);
  }
  // (and a few on the steps: `d` out from the plinth, on a flight of `n` steps)
  const stepAt = (d: number, n: number): number => (P * (n - Math.min(n - 1, Math.floor(d / 0.5)))) / (n + 1);
  for (const [d, dz] of [[3.2, -1.5], [2.2, 2.3], [1.2, -0.4]]) k.person(px1 + d, cz + dz, stepAt(d, 7));
  for (const [d, dx] of [[2.7, 1.2], [1.7, -1.6]]) k.person(gxc + dx, pz1 + d, stepAt(d, 6));
  k.person(gxc - 2, pz0 - 2.7, stepAt(2.7, 6));
  // by night: light in the court and before the hall, on each flight of steps and on the wall behind, and a lamp in each gateway
  pool(k, gxc, cz, 15, 0.65);
  pool(k, hx1 + 1, cz, 10, 0.75, '#fff3dc');
  pool(k, x1 - 1.5, cz, 12, 0.85);
  pool(k, gxc, z1 - 1.5, 10, 0.75);
  pool(k, gxc, z0 + 1.5, 9, 0.6);
  pool(k, x0 + 0.4, cz, 10, 0.55);
  lamp(k, px1 - 1.1, P + 3.6, cz);
  for (const z of [pz0 + 1, pz1 - 1]) lamp(k, gxc, P + 2.6, z, 0.26);
}

// ---------------------------------------------------------------------------
// Fatehpuri Masjid
// ---------------------------------------------------------------------------

function fatehpuri(k: Build, t: Thing): void {
  const b = k.b, x0 = t.x, x1 = t.x + t.w, z0 = t.z, z1 = t.z + t.d;
  const cz = Math.min(Math.max(CHANDNI.z, z0 + 4), z1 - 4); // its gate is in line with the street it closes
  // the court, paved, and the low terrace the prayer hall stands on
  const hx0 = x0 + 0.3, hx1 = x0 + 3.8, hz0 = z0 + 1.6, hz1 = z1 - 1.6, base = 0.5, roof = 4.9;
  area(k, rect(hx1, z0 + 0.3, x1 - 0.3, z1 - 0.3), 0xd8b89a, 0.03);
  b.box(hx0, 0, hz0, hx1 + 0.9, base, hz1, RED_LIGHT);
  // the prayer hall: three arches either side of a tall portal, under one dome
  b.box(hx0, base, hz0, hx1, roof, hz1, RED, { faces: 'NESW' });
  b.box(hx0 - 0.1, roof, hz0 - 0.1, hx1 + 0.2, roof + 0.14, hz1 + 0.1, RED_DARK, { faces: 'NESWTB' });
  b.box(hx0, roof + 0.14, hz0, hx1, roof + 0.45, hz1, RED, { top: 0xc9a58f });
  const half = 1.3;
  arcade(b, 'E', hx1, hz0 + 0.45, cz - half, base + 0.1, 3, 2.5, LAMPLIT, { lit: 0.6 * LIT });
  arcade(b, 'E', hx1, cz + half, hz1 - 0.45, base + 0.1, 3, 2.5, LAMPLIT, { lit: 0.6 * LIT });
  b.box(hx1 - 0.3, base, cz - half, hx1 + 0.4, 6.5, cz + half, RED, { top: RED_DARK });
  niche(b, 'E', hx1 + 0.4, cz, base + 0.05, 1.7, 4.5, LAMPLIT, { lit: 0.8 * LIT });
  b.box(hx1 + 0.4, 5.5, cz - 1.05, hx1 + 0.46, 6.1, cz + 1.05, MARBLE, { faces: 'E' });
  openings(b, 'W', hx0, hz0 + 0.4, hz1 - 0.4, base + 0.4, 5, 2.2, RED_DARK);
  const dxm = (hx0 + hx1) / 2, r = 1.8;
  b.cyl(dxm, cz, roof + 0.45, roof + 1.0, r * 0.86, r * 0.84, 8, MARBLE_SHADE, { cap: false });
  stripedDome(b, dxm, roof + 1.0, cz, r, 8);
  for (const z of [hz0 - 0.4, hz1 + 0.4]) slimMinaret(b, hx1 - 0.45, z, 0, t.h, 0.62, RED, MARBLE);
  // rooms along the north and south of the court, of one storey
  const cw = 1.3, CH = 2.9;
  for (const [za, zb, f] of [[z0 + 0.2, z0 + 0.2 + cw, 'S'], [z1 - 0.2 - cw, z1 - 0.2, 'N']] as const) {
    b.box(hx1 + 0.3, 0, za, x1 - 0.9, CH, zb, RED, { top: RED_DARK });
    openings(b, f, f === 'S' ? zb : za, hx1 + 1.2, x1 - 1.1, 0.1, 4, 2.1, RECESS, 0.45);
  }
  // the wall to the street, and the gate in it
  const gw = 1.5, gh = 5.4, ex = x1 - 0.3;
  for (const [za, zb] of [[z0 + 0.2, cz - gw + 0.1], [cz + gw - 0.1, z1 - 0.2]]) {
    b.box(ex - 0.6, 0, za, ex, 3.2, zb, RED, { top: RED_DARK });
    openings(b, 'E', ex, za + 0.3, zb - 0.2, 0.2, 2, 2.2, RED_DARK);
  }
  b.moved(ex + 0.05, 0, cz, -Math.PI / 2, () => mosqueGate(b, 0, gw * 2, 1.4, gh, 1.7, 3.6, 3));
  // a small tank in the court
  const tx = (hx1 + 0.9 + ex - 1.4) / 2;
  b.box(tx - 0.9, 0, cz - 0.75, tx + 0.9, 0.3, cz + 0.75, MARBLE);
  b.box(tx - 0.65, 0.3, cz - 0.5, tx + 0.65, 0.312, cz + 0.5, STREAM, { faces: 'T' });
  for (const [x, z] of [[tx + 0.3, cz - 2.2], [tx - 0.8, cz + 2]]) k.person(x, z);
  pool(k, tx, cz, 9, 0.75);
  pool(k, x1 + 1, cz, 8, 0.7);
  pool(k, x0 + 0.6, cz, 8, 0.5);
  lamp(k, ex - 0.65, 2.7, cz, 0.26);
}

// ---------------------------------------------------------------------------
// The row of faiths on Chandni Chowk
// ---------------------------------------------------------------------------

const SAFFRON = 0xf28c28, TEMPLE_WHITE = 0xf1ece0, CHURCH = 0xefe4c8, TILE_ROOF = 0x9a5a48;

/** The spire of a temple, square in plan and curving in to its top: a shikhara, with its ribbed stone on it unless it is `small`, and a finial of gold. */
function shikhara(b: GeoBuilder, x: number, y: number, z: number, half: number, h: number, color: number, small = false): void {
  const r = half * Math.SQRT2;
  if (small) lathe(b, x, z, [[r, y], [r * 0.82, y + h * 0.36], [r * 0.5, y + h * 0.74], [r * 0.2, y + h]], 4, color);
  else {
    lathe(b, x, z, [[r, y], [r * 0.9, y + h * 0.27], [r * 0.7, y + h * 0.55], [r * 0.44, y + h * 0.8], [r * 0.24, y + h * 0.93]], 4, color);
    b.cyl(x, z, y + h * 0.93, y + h, half * 0.42, half * 0.42, 6, color);
  }
  b.cyl(x, z, y + h, y + h + half * 0.75, half * 0.15, 0.02, 4, GOLD, { cap: false });
}

function faiths(k: Build, t: Thing): void {
  const b = k.b, sw = t.w / 5, zs = t.z + 0.4, zb = t.z + t.d - 0.6, zm = (zs + zb) / 2;
  /** The ground of the i-th of the five, counted from the east end, by the Red Fort. */
  const slot = (i: number): [number, number] => [t.x + t.w - (i + 1) * sw + 0.4, t.x + t.w - i * sw - 0.4];
  /** Each of the five has the same light: a pool before its door, and one round its walls. */
  const light = (x: number): void => {
    pool(k, x, t.z - 0.5, 5.5, 0.55);
    pool(k, x, zm, 6, 0.6);
  };

  {
    // Sri Digambar Jain Lal Mandir: red sandstone, a cluster of spires, and the pillar of honour before it
    const [xa, xb] = slot(0), xw = xb - 1.5, xm = (xa + xw) / 2;
    b.box(xa, 0, zs, xw, 3.5, zb, RED, { faces: 'NESW' });
    b.box(xa - 0.08, 3.5, zs - 0.08, xw + 0.08, 3.68, zb + 0.08, MARBLE_SHADE);
    openings(b, 'N', zs, xa + 0.3, xw - 0.3, 0.1, 3, 2.3, RECESS, 0.6, true);
    openings(b, 'S', zb, xa + 0.3, xw - 0.3, 1.5, 3, 1.3, RED_DARK);
    openings(b, 'E', xw, zs + 0.3, zb - 0.3, 1.5, 3, 1.3, RED_DARK);
    b.box(xm - 2, 3.68, zm - 1.3, xm + 2, 4.5, zm + 1.3, RED, { top: RED_DARK });
    shikhara(b, xm, 4.5, zm, 0.95, 4.0, RED_LIGHT);
    for (const s of [-1, 1]) shikhara(b, xm + s * 1.4, 4.5, zm + 0.3, 0.62, 2.7, RED_LIGHT, true);
    for (const s of [-1, 1]) shikhara(b, xm + s * 0.75, 4.5, zm - 1.0, 0.36, 1.8, RED_LIGHT, true);
    // the manastambha
    const px = xb - 0.7, pz = zs + 1.1;
    b.box(px - 0.45, 0, pz - 0.45, px + 0.45, 0.5, pz + 0.45, TEMPLE_WHITE);
    b.cyl(px, pz, 0.5, 4.6, 0.19, 0.15, 6, TEMPLE_WHITE, { cap: false });
    b.box(px - 0.3, 4.6, pz - 0.3, px + 0.3, 5.0, pz + 0.3, TEMPLE_WHITE, { faces: 'NESWTB' });
    b.cyl(px, pz, 5.0, 5.6, 0.3, 0.03, 4, TEMPLE_WHITE, { cap: false });
    light(xm);
  }
  {
    // the Gauri Shankar temple: white, with one tall spire over its shrine and a lesser one before it
    const [xa, xb] = slot(1), xm = (xa + xb) / 2;
    b.box(xa, 0, zs, xb, 3.3, zb, CREAM, { faces: 'NESW' });
    b.box(xa - 0.08, 3.3, zs - 0.08, xb + 0.08, 3.48, zb + 0.08, TEMPLE_WHITE);
    opening(b, 'N', zs, xm, 0.1, 1.5, 2.5, RECESS, 0.7, true);
    for (const s of [-1, 1]) opening(b, 'N', zs, xm + s * 2.1, 0.5, 0.9, 1.7, RECESS, 0.5, true);
    openings(b, 'S', zb, xa + 0.4, xb - 0.4, 1.3, 4, 1.3, BUFF_SHADE);
    b.box(xm - 1.5, 3.48, zm - 0.2, xm + 1.5, 4.4, zb - 0.3, TEMPLE_WHITE, { top: MARBLE_SHADE });
    shikhara(b, xm, 4.4, (zm - 0.2 + zb - 0.3) / 2, 1.05, 4.1, TEMPLE_WHITE);
    shikhara(b, xm, 3.48, zs + 1.1, 0.7, 2.5, TEMPLE_WHITE, true);
    light(xm);
  }
  {
    // the Central Baptist Church: a hall under a pitched roof, a deep porch on thick columns, and a white cross
    const [xa, xb] = slot(2), xm = (xa + xb) / 2, wa = xa + 0.9, wb = xb - 0.9, zf = zs + 1.4, eave = 4.2, rise = 1.9;
    b.box(wa, 0, zf, wb, eave, zb, CHURCH, { faces: 'NESW' });
    gable(b, wa, zf, wb, zb, eave, rise, TILE_ROOF, CHURCH, 'z', 0.35);
    // the porch
    b.box(wa - 0.5, 0, zs, wb + 0.5, 0.3, zf, 0xd6ccb4);
    for (let i = 0; i < 4; i++) b.cyl(wa - 0.15 + (i / 3) * (wb - wa + 0.3), zs + 0.3, 0.3, 3.3, 0.25, 0.22, 6, TEMPLE_WHITE, { cap: false });
    b.box(wa - 0.5, 3.3, zs, wb + 0.5, 3.8, zf, CHURCH, { faces: 'NESWTB', top: 0xd6ccb4 });
    niche(b, 'N', zf, xm, 0.3, 1.2, 2.4, LAMPLIT, { round: true, lit: 0.7 * LIT });
    // the colonnades down its sides
    for (const s of [-1, 1]) {
      const xo = s < 0 ? wa - 0.75 : wb + 0.45;
      b.box(xo - 0.1, 3.1, zf, xo + 0.4, 3.25, zb, 0xd6ccb4, { faces: 'NESWTB' });
      for (let i = 0; i < 3; i++) b.box(xo, 0, zf + 0.3 + i * ((zb - zf - 0.9) / 2), xo + 0.3, 3.1, zf + 0.6 + i * ((zb - zf - 0.9) / 2), TEMPLE_WHITE, { faces: 'NESW' });
      for (let i = 0; i < 2; i++) niche(b, s < 0 ? 'W' : 'E', s < 0 ? wa : wb, zf + (zb - zf) * (0.3 + i * 0.4), 0.9, 0.7, 1.8, LAMPLIT, { round: true, lit: 0.5 * LIT });
    }
    roundel(b, [xm, eave + 0.2, zb + 0.05], 0.5, 'S', RECESS, {}, 8);
    // the cross, on the gable over the porch
    const cy = eave + rise * ((wb - wa) / 2) / ((wb - wa) / 2 + 0.35);
    b.box(xm - 0.09, cy - 0.1, zf - 0.09, xm + 0.09, cy + 1.6, zf + 0.09, TEMPLE_WHITE);
    b.box(xm - 0.48, cy + 0.9, zf - 0.09, xm + 0.48, cy + 1.08, zf + 0.09, TEMPLE_WHITE, { faces: 'NESWTB' });
    light(xm);
  }
  {
    // Gurdwara Sis Ganj Sahib: sandstone, golden domes, and the Nishan Sahib on its tall pole
    const [xa, xb] = slot(3), xw = xb - 1.2, xm = (xa + xw) / 2;
    b.box(xa, 0, zs, xw, 4.1, zb, BUFF, { faces: 'NESW' });
    b.box(xa - 0.1, 4.1, zs - 0.1, xw + 0.1, 4.3, zb + 0.1, CREAM);
    openings(b, 'N', zs, xa + 0.3, xw - 0.3, 0.1, 5, 2.2, RECESS, 0.6, true);
    openings(b, 'N', zs, xa + 0.3, xw - 0.3, 2.7, 5, 1.0, BUFF_SHADE);
    openings(b, 'S', zb, xa + 0.3, xw - 0.3, 1.2, 5, 1.5, BUFF_SHADE);
    openings(b, 'E', xw, zs + 0.3, zb - 0.3, 1.2, 4, 1.5, BUFF_SHADE);
    b.box(xm - 1.7, 4.3, zm - 1.4, xm + 1.7, 5.5, zm + 1.4, BUFF, { top: CREAM });
    b.cyl(xm, zm, 5.5, 5.9, 1.1, 1.05, 8, CREAM, { cap: false });
    dome(b, xm, 5.9, zm, 1.25, GOLD, { sides: 8, finial: 0.7 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx < 0 ? xa + 0.55 : xw - 0.55, z = sz < 0 ? zs + 0.55 : zb - 0.55;
      b.box(x - 0.36, 4.3, z - 0.36, x + 0.36, 4.85, z + 0.36, CREAM, { faces: 'NESW' });
      cupola(b, x, 4.85, z, 0.46, GOLD, 6);
    }
    // the Nishan Sahib: a pole wrapped in saffron, and the saffron flag at its head
    const px = xb - 0.5, pz = zs + 0.6, ph = t.h - 0.5;
    b.box(px - 0.5, 0, pz - 0.5, px + 0.5, 0.45, pz + 0.5, MARBLE);
    b.cyl(px, pz, 0.45, ph, 0.13, 0.09, 6, SAFFRON, { cap: false });
    for (const s of [-1, 1]) tri(b, [px + 0.1, ph - 0.25, pz + s * 0.02], [px + 0.1, ph - 1.55, pz + s * 0.02], [px + 1.75, ph - 1.15, pz + s * 0.02], [0, 0, s], SAFFRON);
    b.cyl(px, pz, ph, ph + 0.5, 0.11, 0.02, 4, 0xd4d6da, { cap: false });
    light(xm);
  }
  {
    // the Sunehri Masjid: small, raised over the street on a plinth, with three gilded domes
    const [xa, xb] = slot(4), P = 2.3, hx1 = xa + 2.9, hz0 = zs + 0.3, hz1 = zb - 0.3;
    const xs = xb - 1.3, tread = 0.55, PLINTH = 0xe6d3b1, PAVED = 0xd8c4a2;
    b.box(xa, 0, zs, xs, P, zb, PLINTH, { top: PAVED });
    b.box(xa - 0.06, P - 0.3, zs - 0.06, xs + 0.06, P - 0.12, zb + 0.06, 0x4f8a5c, { faces: 'NSW' });
    openings(b, 'N', zs, xa + 0.3, xs - 0.3, 0.1, 3, 1.5, RECESS, 0.5);
    // the stair up from the street, along its east side, and the landing at its head
    for (let i = 0; i < 4; i++) b.box(xs, 0, zs + i * tread, xb - 0.1, (P * (i + 1)) / 5, zs + (i + 1) * tread, PAVED, { faces: 'NET' });
    b.box(xs, 0, zs + 4 * tread, xb - 0.1, P, zb, PLINTH, { top: PAVED, faces: 'NEST' });
    const roof = P + 2.7;
    b.box(xa + 0.2, P, hz0, hx1, roof, hz1, CREAM, { faces: 'NESW' });
    b.box(xa + 0.1, roof, hz0 - 0.1, hx1 + 0.2, roof + 0.14, hz1 + 0.1, 0xd8c4a2, { faces: 'NESWTB' });
    b.box(xa + 0.2, roof + 0.14, hz0, hx1, roof + 0.4, hz1, CREAM, { top: 0xd8c4a2 });
    openings(b, 'E', hx1, hz0 + 0.25, hz1 - 0.25, P + 0.1, 3, 1.9, RECESS, 0.7, true);
    const dxm = (xa + 0.2 + hx1) / 2;
    for (let i = 0; i < 3; i++) bulb(b, dxm, roof + 0.4, hz0 + ((i + 0.5) / 3) * (hz1 - hz0), i === 1 ? 0.78 : 0.62, GOLD);
    for (const z of [hz0 - 0.05, hz1 + 0.05]) {
      b.cyl(hx1 - 0.1, z, P, roof + 1.9, 0.17, 0.13, 6, CREAM, { cap: false });
      cupola(b, hx1 - 0.1, roof + 1.9, z, 0.19, GOLD);
    }
    light((xa + xb) / 2);
  }
}

// ---------------------------------------------------------------------------
// Kashmere Gate, and its motor parts market
// ---------------------------------------------------------------------------

const BRICK = 0xa5604a, BRICK_DARK = 0x8a4c3a, TYRE = 0x1d1d21, CHROME = 0xcfd3d8, STEEL = 0x8f97a0, RAMP_YELLOW = 0xd8a02a;

/** A small car that stands still, square to the board with its nose to the east: for the mechanic's ramp, which a plain car is too long for. */
function hatch(b: GeoBuilder, x: number, y: number, z: number, body: number): void {
  b.box(x - 2.5, y + 0.42, z - 1.2, x + 2.5, y + 1.3, z + 1.2, body, { faces: 'NESWTB' });
  b.box(x - 2.1, y + 1.3, z - 1.05, x + 0.9, y + 2.0, z + 1.05, 0x1c2733, { faces: 'NESW' });
  b.box(x - 2.15, y + 2.0, z - 1.1, x + 0.95, y + 2.1, z + 1.1, body);
  for (const dx of [-1.6, 1.6]) for (const dz of [-1, 1]) b.box(x + dx - 0.45, y, z + dz * 1.22 - 0.16, x + dx + 0.45, y + 0.9, z + dz * 1.22 + 0.16, 0x17171a);
  for (const dz of [-0.75, 0.75]) {
    b.box(x + 2.5, y + 0.85, z + dz - 0.28, x + 2.53, y + 1.15, z + dz + 0.28, 0xfff4d6, { win: interior(2.2), faces: 'E' });
    b.box(x - 2.53, y + 0.9, z + dz - 0.28, x - 2.5, y + 1.2, z + dz + 0.28, 0xc81e1e, { win: interior(1.6), faces: 'W' });
  }
}

function kashmereGate(k: Build, t: Thing): void {
  const b = k.b, x0 = t.x, x1 = t.x + t.w, z0 = t.z, z1 = t.z + t.d;
  area(k, rect(x0, z0, x1, z1), 0xc9bda8, 0.025);
  // --- the gate, at the back of the lot: two arched ways side by side through a block of brick, with stone round its arches and battlements over them ---
  const gx0 = x0 + 3.7, gx1 = x1 - 0.5, gz0 = z0 + 0.5, gz1 = gz0 + 3.4, gzm = (gz0 + gz1) / 2, body = t.h - 1.1;
  const aw = (gx1 - gx0) * 0.32, pier = ((gx1 - gx0) - aw * 2) / 3, ah = body * 0.62;
  for (let i = 0; i < 3; i++) {
    const xa = gx0 + i * (pier + aw);
    b.box(xa, 0, gz0, xa + pier, body, gz1, BRICK, { top: BRICK_DARK });
  }
  for (let i = 0; i < 2; i++) {
    const cx = gx0 + pier + aw / 2 + i * (pier + aw);
    archThrough(b, 'z', cx, gzm, gz1 - gz0, aw, 0, ah, body, BRICK, BRICK_DARK);
    b.box(cx - aw / 2, body - 0.05, gz0, cx + aw / 2, body, gz1, BRICK_DARK, { faces: 'T' });
    b.box(cx - aw / 2, 0, gz0, cx + aw / 2, 0.05, gz1, 0x8d8273, { faces: 'T' });
    // a band of stone over each arch, and a small blind arch over that, on both faces
    for (const [f, plane] of [['S', gz1], ['N', gz0]] as const) {
      const s = f === 'S' ? 1 : -1;
      b.box(cx - aw / 2 - 0.3, ah + 0.25, Math.min(plane, plane + s * 0.07), cx + aw / 2 + 0.3, ah + 0.55, Math.max(plane, plane + s * 0.07), BUFF_SHADE, { faces: f + 'TB' });
      opening(b, f, plane, cx, ah + 0.9, 0.7, 1.1, BRICK_DARK);
    }
    lamp(k, cx, ah - 0.6, gzm);
  }
  // a buttress at each end, a course of stone under the battlements, and the battlements
  for (const xa of [gx0 - 0.35, gx1 - 0.35]) b.box(xa, 0, gz0 - 0.3, xa + 0.7, body + 0.45, gz1 + 0.3, BRICK, { top: BUFF_SHADE });
  b.box(gx0 + 0.35, body - 0.5, gz0 - 0.1, gx1 - 0.35, body - 0.25, gz1 + 0.1, BUFF_SHADE, { faces: 'NSTB' });
  merlons(b, gx0 + 0.4, gz1 - 0.4, gx1 - 0.4, gz1, body, BRICK, { step: 1.45, h: 1.1 });
  merlons(b, gx0 + 0.4, gz0, gx1 - 0.4, gz0 + 0.4, body, BRICK, { step: 1.45, h: 1.1 });
  // a length of the city's wall, broken off, to its west
  b.box(x0 + 1.6, 0, gzm - 0.5, gx0 - 0.3, 3.8, gzm + 0.5, RUBBLE_LIGHT, { top: 0x9a8f80, faces: 'NSWT' });
  b.box(x0 + 0.3, 0, gzm - 0.5, x0 + 1.6, 2.3, gzm + 0.5, RUBBLE_LIGHT, { top: 0x9a8f80, faces: 'NSWT' });
  pool(k, (gx0 + gx1) / 2, gz1 + 0.6, 9, 1);
  pool(k, (gx0 + gx1) / 2, gz0 - 0.4, 8, 0.7);

  // --- the parts market: three narrow shops along the west of the lot, south of the wall, their fronts to the east ---
  const sx1 = x0 + 3, n = 3, sd = (z1 - 0.2 - (gz1 + 0.5)) / n, zs = gz1 + 0.5;
  const SHOPS: [string, number, number][] = [['old-delhi-batteries', 0xcfd6d0, 2], ['old-delhi-auto-parts', 0xe6c9a4, 1.5], ['old-delhi-tyres', 0xd9b99a, 2]];
  SHOPS.forEach(([sign, paint, storeys], i) => {
    const za = zs + i * sd, zb = za + sd - 0.12, zc = (za + zb) / 2, top = storeys * STOREY;
    b.box(x0 + 0.2, 0, za, sx1, STOREY, zb, paint, { faces: 'NESW' });
    b.box(x0 + 0.2, STOREY, za, sx1, top, zb, paint, { win: storeys >= 2 ? { cell: 1.2, storey: STOREY, lit: 0.4, kind: 4 } : undefined, seed: i * 0.37 + 0.1, top: 0xb8ad9a });
    // the open front, dark inside and lit at night, a shutter rolled up over it, and the board that says what is sold
    b.box(sx1, 0.05, za + 0.25, sx1 + 0.05, 2.3, zb - 0.25, LAMPLIT, { win: interior(1.2 * LIT), faces: 'E' });
    b.box(sx1, 2.3, za + 0.15, sx1 + 0.16, 2.58, zb - 0.15, STEEL, { faces: 'NESTB' });
    b.box(sx1, 2.62, za + 0.1, sx1 + 0.1, 3.36, zb - 0.1, 0x2a211c, { faces: 'NESTB' });
    k.sign(sign, sx1 + 0.13, 2.99, zc, 1, 0, 0.62, zb - za - 0.3);
    pool(k, sx1 + 1.2, zc, 5, 0.6);
  });
  // batteries on a bench before the first shop
  b.box(sx1 + 0.25, 0, zs + 0.5, sx1 + 0.8, 0.7, zs + 2.0, 0x7a5a3a);
  for (let i = 0; i < 3; i++) b.box(sx1 + 0.3, 0.7, zs + 0.58 + i * 0.48, sx1 + 0.75, 1.0, zs + 0.94 + i * 0.48, i % 2 ? 0x2a2c31 : 0xc8202c, { top: 0xe9e6dc });
  // silencers hung from a rail before the second, and bumpers hung on its wall over the board
  const zp = zs + sd;
  b.beam([sx1 + 0.45, 2.45, zp + 0.2], [sx1 + 0.45, 2.45, zp + sd - 0.4], 0.05, 0.05, STEEL);
  for (let i = 0; i < 3; i++) b.cyl(sx1 + 0.45, zp + 0.45 + i * 0.5, 1.3, 2.4, 0.16, 0.13, 6, STEEL, { cap: false });
  for (let i = 0; i < 3; i++) b.box(sx1, 3.62 + i * 0.44, zp + 0.25 + i * 0.1, sx1 + 0.14, 3.82 + i * 0.44, zp + sd - 0.4 - i * 0.1, CHROME, { faces: 'NESTB' });
  // tyres stacked in columns before the third
  const zt = zs + 2 * sd;
  for (const [dx, dz, c] of [[0.55, 0.5, 6], [0.55, 1.4, 4], [1.4, 0.55, 5], [0.6, 2.2, 7], [1.4, 1.5, 3]]) b.cyl(sx1 + dx, zt + dz, 0, c * 0.3, 0.42, 0.42, 6, TYRE, { cap: 0x3c3c42 });

  // --- a mechanic's ramp on the pavement, a car driven up onto it, and the mechanic ---
  const rx0 = sx1 + 2.1, rx1 = x1 - 0.5, rz = z1 - 1.7, RAMP = 0.95, wz = 1.22;
  for (const dz of [-wz, wz]) {
    slab(b, [rx0, 0.03, rz + dz], [rx0 + 1.7, RAMP, rz + dz], 0.28, 0.12, RAMP_YELLOW);
    b.box(rx0 + 1.7, RAMP - 0.12, rz + dz - 0.28, rx1, RAMP, rz + dz + 0.28, RAMP_YELLOW, { faces: 'NESWTB' });
    for (const x of [rx0 + 1.9, rx1 - 0.3]) b.box(x - 0.12, 0, rz + dz - 0.2, x + 0.12, RAMP - 0.12, rz + dz + 0.2, 0x6a6f78, { faces: 'NESW' });
  }
  hatch(b, (rx0 + 1.7 + rx1) / 2, RAMP, rz, 0xf2f0ea);
  figure(b, rx0 + 0.9, rz - 2.3, 0, { coat: 0x2f4f7a, legs: 0x2f4f7a, hat: 0x2a211c, hatH: 0.1 });
  k.person(sx1 + 1.5, zp + 1.0);
  k.person(gx0 + pier + aw + pier / 2, gz1 + 1.6);
  pool(k, (rx0 + rx1) / 2, rz, 8, 0.6, '#fff3dc');
}

/** What this file builds, by the id of the thing in the plan. */
export const MODELS: Record<string, Model> = {
  'red-fort': redFort,
  'jama-masjid': jamaMasjid,
  fatehpuri,
  faiths,
  'kashmere-gate': kashmereGate,
};

const board = (id: string, lines: string[], color: string, ink: string, aspect: number, h: number): SignDef =>
  ({ id: `old-delhi-${id}`, lines, color, ink, aspect, size: [Math.round(h * aspect), h], kind: 'board', font: DEVANAGARI });

/** The signs this file hangs: what the parts market sells, in Hindi above and in English below. No place of worship carries a board. */
export const SIGNS: SignDef[] = [
  board('tyres', ['टायर', 'TYRES'], '#1b1b20', '#f2c14e', 3.2, 112),
  board('auto-parts', ['ऑटो पार्ट्स', 'AUTO PARTS'], '#f2c14e', '#1b1b20', 2.6, 132),
  board('batteries', ['बैटरी', 'BATTERIES'], '#b3202a', '#fbe9b7', 3.6, 112),
];

/** Lines that something moves along, as [x, y, z] points, for the check that nothing crosses a road on the level. */
export const RAILS: Record<string, [number, number, number][]> = {};

/** Whatever this file builds that is not one of the plan's things. */
export function extras(_k: Build): void {}
