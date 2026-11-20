// The small parts Delhi's landmarks are made of: a dome, a chhatri, an arch
// that is a dark opening and not a pane of glass, a row of such arches, an
// arched way through a wall, a minaret, battlements, a flight of steps and the
// flag. Every landmark on the tile is built from these, so that red sandstone
// is one red and a dome is one kind of dome from the Red Fort to Hauz Khas.
//
// A wall "faces" north, east, south or west. Along a wall that faces north or
// south, places are given by x and the wall's plane by z; along one that faces
// east or west, places are given by z and the plane by x.

import { interior, type GeoBuilder, type V3 } from '../../engine/geo';
import { tri } from '../../engine/parts';

// The stones of Delhi.
export const RED = 0xb5553c, RED_DARK = 0x98422e, RED_LIGHT = 0xc76a4e;
export const BUFF = 0xdcc096, BUFF_SHADE = 0xc9ad82, CREAM = 0xeadfc4;
export const MARBLE = 0xf3efe6, MARBLE_SHADE = 0xdfd9cc;
export const RUBBLE = 0x9a8f80, RUBBLE_LIGHT = 0xb5ab98;
export const GOLD = 0xd9b24a, RECESS = 0x4a3a30;

export type Facing = 'N' | 'E' | 'S' | 'W';
const NORMAL: Record<Facing, V3> = { N: [0, 0, -1], E: [1, 0, 0], S: [0, 0, 1], W: [-1, 0, 0] };
const SIGN: Record<Facing, number> = { N: -1, E: 1, S: 1, W: -1 };
const alongX = (f: Facing): boolean => f === 'N' || f === 'S';

/** A place on a wall: `a` along it, `y` up it, and `out` proud of its plane. */
const onWall = (f: Facing, plane: number, a: number, y: number, out = 0): V3 =>
  alongX(f) ? [a, y, plane + SIGN[f] * out] : [plane + SIGN[f] * out, y, a];

/**
 * The outline of an arch that is `w` wide and `h` high, as [across, up] from
 * the middle of its foot: straight sides, and a head that comes to a point as
 * a Mughal arch does, or is half a circle.
 */
function archOutline(w: number, h: number, pointed: boolean): [number, number][] {
  const rise = Math.min(h * 0.6, pointed ? w * 0.66 : w / 2), s = h - rise, r = w / 2;
  const head: [number, number][] = pointed
    ? [[r, s], [r * 0.9, s + rise * 0.48], [r * 0.56, s + rise * 0.82], [0, h]]
    : [[r, s], [r * 0.87, s + rise * 0.5], [r * 0.5, s + rise * 0.87], [0, h]];
  return [[-r, 0], [r, 0], ...head, ...head.slice(0, -1).reverse().map(([u, v]): [number, number] => [-u, v])];
}

export interface ArchOpts {
  /** How brightly it glows at night: a lamp-lit porch is 1 or more, a blind niche 0. */
  lit?: number;
  /** A round head in place of a pointed one. */
  round?: boolean;
  /** How far it stands proud of the wall. */
  proud?: number;
}

/**
 * An arch on a wall: a dark opening, drawn a hair proud of the wall's plane.
 * `a` is the middle of its foot along the wall and `y` the height of its foot.
 */
export function niche(b: GeoBuilder, f: Facing, plane: number, a: number, y: number, w: number, h: number, color: number = RECESS, o: ArchOpts = {}): void {
  const pts = archOutline(w, h, !o.round).map(([u, v]) => onWall(f, plane, a + u, y + v, o.proud ?? 0.06));
  const q = o.lit ? { win: interior(o.lit) } : {};
  for (let i = 1; i + 1 < pts.length; i++) tri(b, pts[0], pts[i], pts[i + 1], NORMAL[f], color, q);
}

/** A row of `n` arches along a wall, from `a0` to `a1`, each `h` high, with `gap` of wall between them. */
export function arcade(b: GeoBuilder, f: Facing, plane: number, a0: number, a1: number, y: number, n: number, h: number, color: number = RECESS, o: ArchOpts & { gap?: number } = {}): void {
  const bay = (a1 - a0) / n, w = bay - (o.gap ?? bay * 0.28);
  for (let i = 0; i < n; i++) niche(b, f, plane, a0 + (i + 0.5) * bay, y, w, h, color, o);
}

/**
 * An arched way through a wall: the wall above the arch on both of its faces,
 * and the vault between them. The way runs along `axis` through the middle
 * (cx, cz), `len` long, `w` wide and `h` high, and the wall is built up to
 * `top`. The piers either side of the way are the caller's.
 */
export function archThrough(b: GeoBuilder, axis: 'x' | 'z', cx: number, cz: number, len: number, w: number, y: number, h: number, top: number, color: number, soffit: number, round = false): void {
  const head = archOutline(w, h, !round).slice(2);
  const at = (u: number, v: number, along: number): V3 => (axis === 'z' ? [cx + u, y + v, cz + along] : [cx + along, y + v, cz + u]);
  const out = (s: number): V3 => (axis === 'z' ? [0, 0, s] : [s, 0, 0]);
  for (let i = 0; i + 1 < head.length; i++) {
    const [u0, v0] = head[i], [u1, v1] = head[i + 1];
    for (const s of [-1, 1]) b.quad(at(u0, v0, (s * len) / 2), at(u1, v1, (s * len) / 2), at(u1, top - y, (s * len) / 2), at(u0, top - y, (s * len) / 2), out(s), color);
    // the vault looks down and inwards
    const du = u1 - u0, dv = v1 - v0, l = Math.hypot(du, dv) || 1;
    const n: V3 = axis === 'z' ? [dv / l, -du / l, 0] : [0, -du / l, dv / l];
    if (n[1] > 0) { n[0] = -n[0]; n[1] = -n[1]; n[2] = -n[2]; }
    b.quad(at(u0, v0, -len / 2), at(u1, v1, -len / 2), at(u1, v1, len / 2), at(u0, v0, len / 2), n, soffit);
  }
}

const PROFILES = {
  /** The bulb of a Mughal dome, on a short neck. */
  onion: [[0.84, 0], [0.98, 0.2], [1.04, 0.48], [0.97, 0.8], [0.76, 1.1], [0.46, 1.34], [0.17, 1.5], [0.03, 1.58]],
  /** Half a ball, a little stilted. */
  round: [[1, 0], [0.98, 0.3], [0.87, 0.6], [0.66, 0.84], [0.38, 0.98], [0.04, 1.04]],
  /** The shallow dome of the Tughlaqs and the Lodis. */
  low: [[1, 0], [0.94, 0.22], [0.78, 0.42], [0.52, 0.57], [0.2, 0.65], [0.03, 0.67]],
} satisfies Record<string, [number, number][]>;

export interface DomeOpts {
  kind?: keyof typeof PROFILES;
  sides?: number;
  /** Every other facet in this colour: the stripes of Jama Masjid's domes. */
  stripe?: number;
  /** How tall its finial is, or false for none. */
  finial?: number | false;
  /** Stretches it upwards. */
  tall?: number;
}

/** A dome of radius `r` that stands on (x, y, z). Returns the height of its top, without the finial. */
export function dome(b: GeoBuilder, x: number, y: number, z: number, r: number, color: number, o: DomeOpts = {}): number {
  const prof = PROFILES[o.kind ?? 'onion'], sides = o.sides ?? 12, tall = o.tall ?? 1;
  for (let i = 0; i + 1 < prof.length; i++) {
    const [r0, h0] = prof[i], [r1, h1] = prof[i + 1];
    const y0 = y + h0 * r * tall, y1 = y + h1 * r * tall;
    if (o.stripe === undefined) { b.cyl(x, z, y0, y1, r0 * r, r1 * r, sides, color, { cap: false }); continue; }
    for (let s = 0; s < sides; s++) {
      const a0 = ((s + 0.5) / sides) * Math.PI * 2, a1 = ((s + 1.5) / sides) * Math.PI * 2, am = (a0 + a1) / 2;
      const slope = ((r0 - r1) * r) / Math.max(1e-6, y1 - y0), nl = Math.hypot(1, slope);
      const p = (a: number, rr: number, yy: number): V3 => [x + Math.cos(a) * rr * r, yy, z + Math.sin(a) * rr * r];
      b.quad(p(a0, r0, y0), p(a1, r0, y0), p(a1, r1, y1), p(a0, r1, y1), [Math.cos(am) / nl, slope / nl, Math.sin(am) / nl], s % 2 ? o.stripe : color);
    }
  }
  const top = y + prof[prof.length - 1][1] * r * tall;
  if (o.finial !== false) {
    const f = o.finial ?? r * 0.5;
    b.cyl(x, z, top - 0.05, top + f * 0.3, r * 0.1, r * 0.1, 6, GOLD);
    b.cyl(x, z, top + f * 0.3, top + f, r * 0.05, 0.02, 5, GOLD, { cap: false });
  }
  return top;
}

/**
 * A chhatri: a small dome on posts, with an eave that stands out all round.
 * It stands on (x, y, z), is `half` to each side and has posts `post` high.
 */
export function chhatri(b: GeoBuilder, x: number, y: number, z: number, half: number, post: number, stone: number, cap: number, o: { sides?: 4 | 6 | 8; kind?: DomeOpts['kind'] } = {}): void {
  const n = o.sides ?? 4, t = Math.max(0.12, half * 0.14), reach = n === 4 ? half * Math.SQRT2 : half;
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * Math.PI * 2, px = x + Math.cos(a) * (reach - t), pz = z + Math.sin(a) * (reach - t);
    b.box(px - t, y, pz - t, px + t, y + post, pz + t, stone, { faces: 'NESW' });
  }
  // the eave, and the low drum the dome sits on
  b.cyl(x, z, y + post, y + post + 0.18, reach + 0.32, reach + 0.32, n === 4 ? 4 : 8, stone, { faces: 'NESWTB' });
  b.cyl(x, z, y + post - 0.001, y + post, reach + 0.32, reach + 0.32, n === 4 ? 4 : 8, stone, { cap: false });
  b.cyl(x, z, y + post + 0.18, y + post + 0.4, half * 0.92, half * 0.92, 8, stone, { cap: false });
  dome(b, x, y + post + 0.4, z, half * 0.9, cap, { kind: o.kind ?? 'onion', sides: 8, finial: half * 0.55 });
}

export interface MinaretOpts {
  sides?: number;
  /** Every other facet in this colour: the white stripes of Jama Masjid's minarets. */
  stripe?: number;
  /** Where its balconies are, as parts of its height. */
  balconies?: number[];
  /** The colour of the dome on its top. */
  cap?: number;
}

/** A minaret: a tapering shaft from `y0` to `y1`, with a balcony or two and an open pavilion on top. */
export function minaret(b: GeoBuilder, x: number, z: number, y0: number, y1: number, r: number, color: number, o: MinaretOpts = {}): void {
  const sides = o.sides ?? 8, top = r * 0.72, h = y1 - y0, shaft = h - r * 2.6;
  const at = (f: number): number => r + (top - r) * f;
  const stops = [0, ...(o.balconies ?? [0.5, 1]).filter((f) => f > 0 && f <= 1)];
  for (let i = 0; i + 1 < stops.length; i++) {
    const f0 = stops[i], f1 = stops[i + 1], ya = y0 + shaft * f0, yb = y0 + shaft * f1;
    if (o.stripe === undefined) b.cyl(x, z, ya, yb, at(f0), at(f1), sides, color, { cap: false });
    else {
      for (let s = 0; s < sides * 2; s++) {
        const a0 = (s / (sides * 2)) * Math.PI * 2, a1 = ((s + 1) / (sides * 2)) * Math.PI * 2, am = (a0 + a1) / 2;
        const p = (a: number, rr: number, yy: number): V3 => [x + Math.cos(a) * rr, yy, z + Math.sin(a) * rr];
        b.quad(p(a0, at(f0), ya), p(a1, at(f0), ya), p(a1, at(f1), yb), p(a0, at(f1), yb), [Math.cos(am), 0, Math.sin(am)], s % 2 ? o.stripe : color);
      }
    }
    // the balcony at its head: a ring that stands out, on a swelling of the shaft
    b.cyl(x, z, yb - 0.45, yb, at(f1), at(f1) + 0.45, sides, color, { cap: false });
    b.cyl(x, z, yb, yb + 0.32, at(f1) + 0.5, at(f1) + 0.5, sides, o.stripe ?? color, { cap: o.stripe ?? color });
  }
  chhatri(b, x, y0 + shaft + 0.32, z, top * 0.95, r * 1.1, color, o.cap ?? MARBLE, { sides: 8 });
}

/**
 * Battlements along the top of a wall: a row of teeth over the rectangle
 * (x0, z0) to (x1, z1), which is the wall's own top, at height `y`.
 */
export function merlons(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, color: number, o: { step?: number; h?: number } = {}): void {
  const step = o.step ?? 1.5, h = o.h ?? 0.9, long = x1 - x0 >= z1 - z0, len = long ? x1 - x0 : z1 - z0, n = Math.max(1, Math.round(len / step)), w = (len / n) * 0.62;
  for (let i = 0; i < n; i++) {
    const c = (long ? x0 : z0) + ((i + 0.5) / n) * len;
    if (long) b.box(c - w / 2, y, z0, c + w / 2, y + h, z1, color);
    else b.box(x0, y, c - w / 2, x1, y + h, c + w / 2, color);
  }
}

/**
 * A flight of `n` steps down from a wall, away from it: `a0` to `a1` along the
 * wall, from `y1` at the wall's plane down to `y0`, each tread `tread` deep.
 */
export function steps(b: GeoBuilder, f: Facing, plane: number, a0: number, a1: number, y0: number, y1: number, n: number, tread: number, color: number): void {
  for (let i = 0; i < n; i++) {
    const top = y1 - ((y1 - y0) * i) / n, d0 = i * tread, d1 = (i + 1) * tread, s = SIGN[f];
    const p0 = plane + s * d0, p1 = plane + s * d1;
    if (alongX(f)) b.box(a0, y0 - 0.02, Math.min(p0, p1), a1, top, Math.max(p0, p1), color);
    else b.box(Math.min(p0, p1), y0 - 0.02, a0, Math.max(p0, p1), top, a1, color);
  }
}

/** A drum: an upright ring of wall with `n` arches in it, as under a dome. */
export function drum(b: GeoBuilder, x: number, z: number, y0: number, y1: number, r: number, color: number, o: { sides?: number; arches?: number; lit?: number } = {}): void {
  const sides = o.sides ?? 12;
  b.cyl(x, z, y0, y1, r, r, sides, color, { cap: false });
  if (!o.arches) return;
  for (let i = 0; i < sides; i++) {
    const a = ((i + 1) / sides) * Math.PI * 2, ap = r * Math.cos(Math.PI / sides) + 0.05, hw = r * Math.sin(Math.PI / sides) * 0.5, h = (y1 - y0) * 0.72;
    const p = (u: number, v: number): V3 => [x + Math.cos(a) * ap - Math.sin(a) * u, y0 + (y1 - y0) * 0.12 + v, z + Math.sin(a) * ap + Math.cos(a) * u];
    const n: V3 = [Math.cos(a), 0, Math.sin(a)], q = o.lit ? { win: interior(o.lit) } : {};
    tri(b, p(-hw, 0), p(hw, 0), p(hw, h * 0.7), n, RECESS, q);
    tri(b, p(-hw, 0), p(hw, h * 0.7), p(0, h), n, RECESS, q);
    tri(b, p(-hw, 0), p(0, h), p(-hw, h * 0.7), n, RECESS, q);
  }
}

/** India's flag on a mast `staff` high that stands at height `y`: saffron above, white with the navy wheel, green below. It flies towards the east. */
export function tiranga(b: GeoBuilder, x: number, z: number, y: number, staff: number, fl = 3, fh = 2): void {
  const SAFFRON = 0xff9933, WHITE = 0xffffff, GREEN = 0x138808, NAVY = 0x000080;
  b.cyl(x, z, y, y + staff, Math.max(0.1, staff * 0.012), Math.max(0.06, staff * 0.007), 6, 0xd4d6da, { cap: false });
  const fy = y + staff - fh - 0.15, band = fh / 3, x0 = x + 0.12;
  for (const side of [-1, 1]) {
    const zz = z + side * 0.025;
    [GREEN, WHITE, SAFFRON].forEach((color, i) => b.quad([x0, fy + i * band, zz], [x0 + fl, fy + i * band, zz], [x0 + fl, fy + (i + 1) * band, zz], [x0, fy + (i + 1) * band, zz], [0, 0, side], color));
    // the wheel: a ring and its twenty-four spokes
    const cx = x0 + fl / 2, cy = fy + fh / 2, r = band * 0.42, zw = z + side * 0.04;
    for (let i = 0; i < 24; i++) {
      const a0 = (i / 24) * Math.PI * 2, a1 = ((i + 1) / 24) * Math.PI * 2, am = (a0 + a1) / 2;
      const p = (a: number, rr: number): V3 => [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, zw];
      b.quad(p(a0, r * 0.82), p(a1, r * 0.82), p(a1, r), p(a0, r), [0, 0, side], NAVY);
      tri(b, [cx, cy, zw], p(am - 0.05, r * 0.82), p(am + 0.05, r * 0.82), [0, 0, side], NAVY);
    }
  }
}
