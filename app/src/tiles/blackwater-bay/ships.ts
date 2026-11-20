// What lies on the water of Blackwater Bay in 129 AC, at anchor and under way.
//
// At anchor: the Velaryon fleet that closed the Gullet in the Dance, five ships
// in a line across it east of High Tide and two more off Hull, riding to their
// cables and waiting. War galleys, long and low, a bronze ram at the bow, one
// mast and their oars shipped; and great ships, round-bellied, a castle at the
// stern and two masts. Their sails are furled on the yards, sea-green pennants
// stream from the mastheads and the house's banner from the stern, and on the
// great ships' castles hangs the silver seahorse on sea green. At King's
// Landing's quays on the Rush a galley of the king's and two cogs lie
// alongside with their gangplanks out; two cogs are moored in Duskendale's
// harbour, one outside the other; a cog from the Free Cities lies off Spicetown
// with her bright sail loosed to dry; and fishing boats work the bay, three of
// them with their nets out.
//
// Under way, each a mesh of its own: the ferry over the Rush, poled from the
// water stairs at the foot of the Street of the Sisters to the end of the south
// landing's stage and back; a Velaryon galley on patrol, rowing her round east
// of Driftmark from under Dragonstone down to the fleet's line in the Gullet;
// and a merchant cog under sail, going round the open bay north of Vhagar's
// rock, clear of the dragon lying on it.
//
// From the books, as the research note gives them: the Gullet, the strait
// between Driftmark and Massey's Hook, which the Velaryon fleet closed; the
// Velaryons' arms, a silver seahorse on sea green; Hull, named for the hulls
// of the ships anchored below it; Duskendale, the bay's second port; and
// Spicetown's ships from the east. The ships are of the age, galleys, great
// ships with castles and cogs, and this tile's own drawing. Nothing is taken
// from the television series.

import * as THREE from 'three';
import { rounded } from '../../engine/corners';
import { GeoBuilder, interior, type QuadOpts, type V3, type WinSpec } from '../../engine/geo';
import { figure } from '../../engine/parts';
import { face3, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { BRONZE, BRONZE_DARK, HOUSE, banner } from './look';
import type { Model } from './models';
import { BOARD, FLEET, ISLANDS, ROADS, RUSH, SANDS, SHORE, VHAGAR_ROCK, WATER, WATER_LEVEL, inside, isWater, lotOf, type P2 } from './plan';
import { underDragon } from './space';

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/** The Velaryons' sea green and silver-white. */
const SEA = HOUSE.velaryon[0], SILVER = HOUSE.velaryon[1];
/** Hulls: tarred timber and its foot, a merchant's oiled oak and its foot. */
const TAR = 0x3b3430, TAR_FOOT = 0x2b2623, OAK = 0x7a5a3c, OAK_FOOT = 0x4e3b2b;
/** Decks, the inside of the bulwarks, a gunwale's cap, spars, and rope and oars (painted paler than they are, since thin bars come out dark). */
const DECK = 0xb39a6b, DECK_DARK = 0x8f7655, BULWARK = 0x6b5136, RAIL = 0x4a3c30, SPAR = 0x6b5539, ROPE = 0xdcd3bb, OARS = 0xccb88e;
/** Plain sailcloth, a lantern's glass, a lit window, and the dark of an oar port. */
const CANVAS = 0xe9dfc6, LANTERN = 0xf2c060, LANTERN_TOP = 0x2f2a26, WINDOW = 0x6a4a28, PORT = 0x2a2220;
/** The king's black and red, for his galley at the quays. */
const ROYAL_BLACK = 0x262224, ROYAL_RED = 0xb3141c;
/** Saffron and crimson: silk from the east, as High Tide's loggia has it. */
const SAFFRON = 0xe2a13a, CRIMSON = 0xb7322f;

/** A window lit from inside, and a lantern's glass: dark or pale by day, warm by night. */
const LIT: WinSpec = interior(2.6), GLOW: WinSpec = interior(1.15);
const WL = WATER_LEVEL;

// ---------------------------------------------------------------------------
// Faces
// ---------------------------------------------------------------------------

/** The normal of the face through a, b and c, turned to the side `hint` points to. */
function normalOf(a: V3, b: V3, c: V3, hint: V3): V3 {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz) || 1;
  if (nx * hint[0] + ny * hint[1] + nz * hint[2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
  return [nx / l, ny / l, nz / l];
}
/** A face of four corners, its normal worked out from them and turned towards `hint`. */
function face4(g: GeoBuilder, a: V3, b: V3, c: V3, d: V3, color: number, hint: V3, o: QuadOpts = {}): void {
  g.quad(a, b, c, d, normalOf(a, b, d, hint), color, o);
}
/** A triangle, the same. */
function tri3(g: GeoBuilder, a: V3, b: V3, c: V3, color: number, hint: V3): void {
  face3(g, a, b, c, normalOf(a, b, c, hint), color);
}
/** A face seen from both its sides: a sail, a cloth, a pennant. */
function both4(g: GeoBuilder, a: V3, b: V3, c: V3, d: V3, color: number, hint: V3): void {
  face4(g, a, b, c, d, color, hint);
  face4(g, a, b, c, d, color, [-hint[0], -hint[1], -hint[2]]);
}
/** A box given by any two opposite corners. */
function block(g: GeoBuilder, a: V3, c: V3, color: number, faces = 'NESWT', top?: number): void {
  g.box(Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.min(a[2], c[2]), Math.max(a[0], c[0]), Math.max(a[1], c[1]), Math.max(a[2], c[2]), color, { faces, top });
}

// ---------------------------------------------------------------------------
// Where a ship lies
// ---------------------------------------------------------------------------

/** A ship's frame: her middle on the water, and the way her bow points, in radians (0 east, a quarter turn south). Her own u runs ahead and v to starboard. */
interface Frame { x: number; z: number; yaw: number }
const frame = (x: number, z: number, deg: number): Frame => ({ x, z, yaw: (deg * Math.PI) / 180 });
/** A place in a ship's frame, on the board. */
const on = (f: Frame, u: number, v: number): P2 => [f.x + u * Math.cos(f.yaw) - v * Math.sin(f.yaw), f.z + u * Math.sin(f.yaw) + v * Math.cos(f.yaw)];
/** A point in a ship's frame, `y` over the water, on the board. */
const onBoard = (f: Frame, p: V3): V3 => {
  const [x, z] = on(f, p[0], p[2]);
  return [x, WL + p[1], z];
};
/** The way north in a ship's frame, as an angle from her bow towards her starboard: the wind is from the south, so flags at anchor stream north. */
const northOf = (f: Frame): number => Math.atan2(-Math.cos(f.yaw), -Math.sin(f.yaw));

/** Every ship that stands still, as it is placed: what moves is checked against them. */
interface Body { what: string; x: number; z: number; yaw: number; hl: number; hb: number }
const STILL: Body[] = [];
const keep = (what: string, f: Frame, hl: number, hb: number): void => void STILL.push({ what, x: f.x, z: f.z, yaw: f.yaw, hl, hb });

// ---------------------------------------------------------------------------
// The hull
// ---------------------------------------------------------------------------

/** One section of a hull: how far along it is, how far out its gunwale reaches to either side, and how high the gunwale stands over the water. */
interface Station { u: number; w: number; g: number }

/**
 * A hull through its sections, from the stern to the stem: how deep its keel
 * is, how high its bulwarks stand over its deck and how thick they are, the
 * strakes of its sides from the bilge up (to what share of the way to the
 * gunwale each reaches, and its colour), and the colours of its foot, the
 * gunwale's cap, the deck and the bulwarks' inside.
 */
interface Hull {
  st: Station[];
  keel: number;
  bulwark: number;
  thick: number;
  strakes: [number, number][];
  foot: number; cap: number; deck: number; inner: number;
}

/** Where a hull's side turns from its bottom to its side, over the water. */
const BILGE = 0.1;
/** How far out a side is at a share of the way from its bilge to its gunwale: a little fuller at the top. */
const outAt = (w: number, f: number): number => w * (0.9 + 0.1 * f);

/** A hull's section at a place along it. */
function station(h: Hull, u: number): Station {
  const s = h.st;
  if (u <= s[0].u) return s[0];
  for (let i = 1; i < s.length; i++) {
    if (u <= s[i].u) {
      const t = (u - s[i - 1].u) / (s[i].u - s[i - 1].u);
      return { u, w: s[i - 1].w + (s[i].w - s[i - 1].w) * t, g: s[i - 1].g + (s[i].g - s[i - 1].g) * t };
    }
  }
  return s[s.length - 1];
}

/** Where a hull's deck is at a place along it: how high, and how far out to either side, inside the bulwarks. */
function deckAt(h: Hull, u: number): { y: number; a: number } {
  const p = station(h, u), y = p.g - h.bulwark, f = (y - BILGE) / Math.max(1e-6, p.g - BILGE);
  return { y, a: Math.max(0.03, outAt(p.w, f) - h.thick - 0.01) };
}

/**
 * A hull in its own frame, its waterline at y = 0: its sides strake by strake
 * from the keel to the gunwale, the bulwarks' inside and their cap, the deck
 * between them, and its two ends closed. It is open only under the keel, in
 * the water.
 */
function hull(g: GeoBuilder, h: Hull): void {
  const n = h.st.length, fs = [0, ...h.strakes.map(([f]) => f)], colours = [h.foot, ...h.strakes.map(([, c]) => c)];
  const section = (p: Station, s: number): V3[] => [[p.u, -h.keel, s * p.w * 0.3], ...fs.map((f): V3 => [p.u, BILGE + (p.g - BILGE) * f, s * outAt(p.w, f)])];
  const inner = (p: Station, y: number, s: number): V3 => [p.u, y, s * (outAt(p.w, (y - BILGE) / (p.g - BILGE)) - h.thick)];
  for (const s of [-1, 1]) {
    for (let i = 0; i + 1 < n; i++) {
      const p = h.st[i], q = h.st[i + 1], a = section(p, s), b = section(q, s), top = a.length - 1;
      for (let j = 0; j < top; j++) face4(g, a[j], b[j], b[j + 1], a[j + 1], colours[j], [0, 0, s]);
      face4(g, inner(p, p.g - h.bulwark, s), inner(q, q.g - h.bulwark, s), inner(q, q.g, s), inner(p, p.g, s), h.inner, [0, 0, -s]);
      if (h.thick > 0) face4(g, a[top], b[top], inner(q, q.g, s), inner(p, p.g, s), h.cap, [0, 1, 0]);
    }
  }
  for (let i = 0; i + 1 < n; i++) {
    const u0 = h.st[i].u, u1 = h.st[i + 1].u, p = deckAt(h, u0), q = deckAt(h, u1);
    face4(g, [u0, p.y, -p.a], [u0, p.y, p.a], [u1, q.y, q.a], [u1, q.y, -q.a], h.deck, [0, 1, 0]);
  }
  // the stern and the stem, closed: outside from the keel to the gunwale, and inside above the deck
  for (const [i, e] of [[0, -1], [n - 1, 1]] as [number, number][]) {
    const p = h.st[i], L = section(p, -1), R = section(p, 1), d = deckAt(h, p.u);
    for (let j = 0; j + 1 < L.length; j++) face4(g, L[j], R[j], R[j + 1], L[j + 1], colours[j], [e, 0, 0]);
    face4(g, [p.u, d.y, -d.a], [p.u, d.y, d.a], [p.u, p.g, d.a], [p.u, p.g, -d.a], h.inner, [-e, 0, 0]);
  }
}

// ---------------------------------------------------------------------------
// Rigging and fittings, in a ship's own frame
// ---------------------------------------------------------------------------

/** A mast from `y0` to `y1`, tapering. */
const mast = (g: GeoBuilder, u: number, y0: number, y1: number, r: number): void => g.cyl(u, 0, y0, y1, r, r * 0.72, 6, SPAR, { cap: false });
/** A yard across a mast, just ahead of it, at `y`, reaching `half` to either side. */
const yardOn = (g: GeoBuilder, u: number, y: number, half: number): void => g.box(u + 0.06, y - 0.07, -half, u + 0.2, y + 0.07, half, SPAR, { faces: 'NESWTB' });

/** A sail furled on its yard: a roll of cloth along it, tied with two gaskets. */
function furled(g: GeoBuilder, u: number, y: number, half: number, cloth: number, ties: number): void {
  g.box(u + 0.12, y - 0.44, -half + 0.3, u + 0.46, y - 0.08, half - 0.3, cloth, { faces: 'NESWTB' });
  for (const v of [-half * 0.5, half * 0.5]) g.box(u + 0.1, y - 0.46, v - 0.07, u + 0.48, y - 0.06, v + 0.07, ties, { faces: 'NESWTB' });
}

/** A pennant streaming from a masthead towards `dir` (an angle in the ship's frame): long, narrow and pointed. */
function pennant(g: GeoBuilder, top: V3, dir: number, len: number, color: number): void {
  const dx = Math.cos(dir), dz = Math.sin(dir), n: V3 = [-dz, 0, dx];
  const a: V3 = [top[0], top[1] + 0.02, top[2]], b: V3 = [top[0], top[1] - 0.4, top[2]], m: V3 = [top[0] + dx * len * 0.5, top[1] - 0.24, top[2] + dz * len * 0.5];
  const t: V3 = [top[0] + dx * len, top[1] - 0.36, top[2] + dz * len];
  for (const s of [1, -1]) {
    const nn: V3 = [n[0] * s, 0, n[2] * s];
    face3(g, a, b, m, nn, color);
    face3(g, a, m, [m[0], m[1] + 0.2, m[2]], nn, color);
    face3(g, [m[0], m[1] + 0.2, m[2]], m, t, nn, color);
  }
}

/** A ship's lantern on a short post standing on `y`: its glass warm by night. Hands back where its light is. */
function lantern(g: GeoBuilder, u: number, v: number, y: number, post = 0.45): V3 {
  g.box(u - 0.035, y, v - 0.035, u + 0.035, y + post, v + 0.035, SPAR, { faces: 'NESW' });
  g.box(u - 0.15, y + post, v - 0.15, u + 0.15, y + post + 0.4, v + 0.15, LANTERN, { faces: 'NESWB', win: GLOW });
  g.box(u - 0.19, y + post + 0.4, v - 0.19, u + 0.19, y + post + 0.48, v + 0.19, LANTERN_TOP, { faces: 'NESWTB' });
  return [u, y + post + 0.2, v];
}

/** A window or a door a hair proud of a face that looks along `n`, from (u, y, v) corner to corner, lit from within. */
function lit(g: GeoBuilder, a: V3, c: V3, n: V3, glow = LIT): void {
  if (Math.abs(n[0]) > 0.5) g.quad([a[0], a[1], a[2]], [a[0], a[1], c[2]], [a[0], c[1], c[2]], [a[0], c[1], a[2]], n, WINDOW, { win: glow });
  else g.quad([a[0], a[1], a[2]], [c[0], a[1], a[2]], [c[0], c[1], a[2]], [a[0], c[1], a[2]], n, WINDOW, { win: glow });
}

/** What sailors wear: coats of blue, brown, green, undyed wool and grey, and the Velaryons' sea green. */
const COATS = [0x4f6f8f, 0x8a5a3a, 0x6f7f4f, 0xd9d0bc, 0x5f6670, SEA];
const CAPS = [0x4a3c30, 0x8a2f2a, 0x3f4f6a, 0xd9d0bc];

/**
 * A sailor standing on a deck at `y`: his body and his head under a cap. He is
 * smaller than the tile's folk ashore, so that a crew stands in proportion on
 * a squashed ship, as on the Westeros tile's ships.
 */
function sailor(g: GeoBuilder, u: number, v: number, y: number, i: number): void {
  g.box(u - 0.24, y, v - 0.17, u + 0.24, y + 1.15, v + 0.17, COATS[i % COATS.length], { faces: 'NESWT' });
  g.box(u - 0.15, y + 1.15, v - 0.15, u + 0.15, y + 1.45, v + 0.15, 0xe2bc96, { faces: 'NESWT', top: CAPS[i % CAPS.length] });
}

/** A bale of cloth, a barrel, and a crate, standing on `y`. */
const bale = (g: GeoBuilder, u: number, v: number, y: number, color: number): void => g.box(u - 0.4, y, v - 0.28, u + 0.4, y + 0.52, v + 0.28, color, { faces: 'NESWT' });
const barrel = (g: GeoBuilder, u: number, v: number, y: number): void => g.cyl(u, v, y, y + 0.7, 0.28, 0.28, 6, 0x7a5a3a, { cap: 0x5a4128 });
const crate = (g: GeoBuilder, u: number, v: number, y: number, s = 0.62): void => g.box(u - s / 2, y, v - s / 2, u + s / 2, y + s, v + s / 2, 0x9a7a52, { faces: 'NESWT', top: 0xa98a60 });

/** The Velaryons' seahorse, as driftmark.ts draws it on the island's banners: crown, snout, neck, belly, fin and curled tail, as triangles in shares of its box. */
const SEAHORSE: [P2, P2, P2][] = (() => {
  const H1: P2 = [0.42, 0.95], H2: P2 = [0.6, 0.93], S1: P2 = [0.88, 0.85], S2: P2 = [0.88, 0.79], C: P2 = [0.6, 0.78], B: P2 = [0.37, 0.82];
  const N1: P2 = [0.4, 0.7], N2: P2 = [0.55, 0.7], E1: P2 = [0.67, 0.55], E2: P2 = [0.58, 0.38], K1: P2 = [0.34, 0.58], K2: P2 = [0.4, 0.4], F: P2 = [0.2, 0.52];
  const T1: P2 = [0.5, 0.27], T2: P2 = [0.41, 0.28], T3: P2 = [0.45, 0.14], T4: P2 = [0.34, 0.08], T5: P2 = [0.25, 0.15], T6: P2 = [0.29, 0.23], T7: P2 = [0.37, 0.18];
  return [
    [H1, H2, C], [H1, C, B], [H2, S1, S2], [H2, S2, C], [B, C, N2], [B, N2, N1], [N1, N2, E1], [N1, E1, K1], [K1, E1, E2], [K1, E2, K2], [K1, K2, F],
    [K2, E2, T1], [K2, T1, T2], [T2, T1, T3], [T2, T3, T7], [T7, T3, T4], [T7, T4, T5], [T7, T5, T6],
  ];
})();

/** The seahorse drawn on a face: `at(su, sv)` is where a share across and up it is, and `n` the way the face looks. */
function seahorseOn(g: GeoBuilder, at: (su: number, sv: number) => V3, n: V3): void {
  for (const [p, q, r] of SEAHORSE) face3(g, at(p[0], p[1]), at(q[0], q[1]), at(r[0], r[1]), n, SILVER);
}

/**
 * A long cloth of the Velaryons hung from a rod on a face that looks along
 * (nu, nv) in a ship's frame: sea green, cut to a point at its foot, with the
 * silver seahorse on it.
 */
function seahorseCloth(g: GeoBuilder, u: number, v: number, nu: number, nv: number, top: number, w: number, h: number): void {
  const au = nv, av = -nu, n: V3 = [nu, 0, nv];
  const at = (s: number, t: number, out: number): V3 => [u + au * (s - 0.5) * w + nu * out, top - h + t * h, v + av * (s - 0.5) * w + nv * out];
  g.quad(at(0, 0.14, 0.05), at(1, 0.14, 0.05), at(1, 1, 0.05), at(0, 1, 0.05), n, SEA);
  face3(g, at(0, 0.14, 0.05), at(1, 0.14, 0.05), at(0.5, 0, 0.05), n, SEA);
  seahorseOn(g, (s, t) => at(0.1 + s * 0.8, 0.22 + t * 0.72, 0.07), n);
  g.beam(at(-0.08, 1, 0.09), at(1.08, 1, 0.09), 0.035, 0.035, 0xb4b8be);
}

/** A sail set and drawing: strips from the yard to its foot, bellied forward, each strip a colour of `cloth`. */
function setSail(g: GeoBuilder, u: number, top: number, foot: number, half: number, cloth: number[]): void {
  const n = cloth.length, belly = [0.12, 0.62, 0.86, 0.78, 0.42];
  const row = (i: number): { y: number; du: number; w: number } => {
    const t = i / n;
    return { y: top - (top - foot) * t, du: belly[Math.round(t * 4)] ?? 0.4, w: half * (1 - 0.06 * t) };
  };
  for (let i = 0; i < n; i++) {
    const a = row(i), b = row(i + 1);
    both4(g, [u + a.du, a.y, -a.w], [u + a.du, a.y, a.w], [u + b.du, b.y, b.w], [u + b.du, b.y, -b.w], cloth[i], [1, 0, 0]);
  }
}

// ---------------------------------------------------------------------------
// War galleys
// ---------------------------------------------------------------------------

/** A ship's colours: her hull and its foot, the band along her side and the strake over it, her gunwale, and the stripes of her awning. */
interface Paint { hull: number; foot: number; band: number; strake: number; cap: number; awning: [number, number] }
const VELARYON: Paint = { hull: TAR, foot: TAR_FOOT, band: SEA, strake: SILVER, cap: RAIL, awning: [SEA, SILVER] };
const KINGS: Paint = { hull: ROYAL_BLACK, foot: 0x1c1a1b, band: ROYAL_RED, strake: ROYAL_BLACK, cap: 0x3a3436, awning: [ROYAL_RED, ROYAL_BLACK] };

/** A war galley's hull: long, narrow and low, rising a little to the stem and more to the stern. */
function galleyHull(L: number, c: Paint): Hull {
  const h = L / 2, W = L * 0.1;
  return {
    st: [
      { u: -0.97 * h, w: 0.24 * W, g: 1.45 },
      { u: -0.8 * h, w: 0.7 * W, g: 0.98 },
      { u: -0.48 * h, w: 0.97 * W, g: 0.7 },
      { u: 0.02 * h, w: W, g: 0.6 },
      { u: 0.45 * h, w: 0.95 * W, g: 0.62 },
      { u: 0.7 * h, w: 0.64 * W, g: 0.74 },
      { u: 0.86 * h, w: 0.13 * W, g: 0.98 },
    ],
    keel: 0.42, bulwark: 0.24, thick: 0.08,
    strakes: [[0.25, c.hull], [0.72, c.band], [1, c.strake]],
    foot: c.foot, cap: c.cap, deck: DECK, inner: BULWARK,
  };
}

/** What a builder needs to know of a ship once her body is built: her hull, and where her mast stands, how high it reaches, and where her yard is. */
interface Rig { H: Hull; mastU: number; top: number; yardY: number; half: number }

/**
 * A war galley's body in her own frame, `L` long: her hull, a bronze ram at
 * the waterline ahead of the stem, her sternpost curling up and forward over
 * the stern, an awning on four posts over the stern in her colours, and her
 * mast and yard with a shroud to either side and a stay to the stem.
 */
function galleyBody(g: GeoBuilder, L: number, c: Paint): Rig {
  const h = L / 2, H = galleyHull(L, c), stern = H.st[0], bow = H.st[H.st.length - 1];
  hull(g, H);
  // the ram
  const bu = bow.u - 0.34, tip: V3 = [h, 0.1, 0], rw = 0.17, y0 = -0.12, y1 = 0.36;
  tri3(g, [bu, y1, -rw], [bu, y1, rw], tip, BRONZE, [0.3, 1, 0]);
  tri3(g, [bu, y0, -rw], [bu, y0, rw], tip, BRONZE_DARK, [0.3, -1, 0]);
  for (const s of [-1, 1]) tri3(g, [bu, y0, s * rw], [bu, y1, s * rw], tip, BRONZE, [0.2, 0, s]);
  // the stem, and the sternpost curling over the stern
  g.beam([bow.u - 0.12, bow.g - 0.35, 0], [bow.u + 0.14, bow.g + 0.5, 0], 0.09, 0.07, c.hull);
  g.sweep([[stern.u + 0.14, stern.g - 0.4, 0], [stern.u - 0.1, stern.g + 0.22, 0], [stern.u - 0.02, stern.g + 0.74, 0], [stern.u + 0.26, stern.g + 1.04, 0], [stern.u + 0.52, stern.g + 1.02, 0]], [0.11, 0.1, 0.09, 0.08, 0.06], c.hull);
  // the awning over the stern
  const a0 = -0.84 * h, a1 = -0.56 * h, d0 = deckAt(H, a0), d1 = deckAt(H, a1);
  const eaves = Math.max(d0.y, d1.y) + 2.55, ridge = eaves + 0.5, aw = Math.min(d0.a, d1.a) - 0.06;
  for (const u of [a0 + 0.08, a1 - 0.08]) for (const s of [-1, 1]) g.beam([u, deckAt(H, u).y, s * (aw - 0.05)], [u, eaves, s * (aw - 0.05)], 0.045, 0.045, SPAR);
  for (let i = 0; i < 4; i++) {
    const ua = a0 + ((a1 - a0) * i) / 4, ub = a0 + ((a1 - a0) * (i + 1)) / 4, col = c.awning[i % 2];
    for (const s of [-1, 1]) {
      const e0: V3 = [ua, eaves, s * (aw + 0.14)], e1: V3 = [ub, eaves, s * (aw + 0.14)], r1: V3 = [ub, ridge, 0], r0: V3 = [ua, ridge, 0];
      face4(g, e0, e1, r1, r0, col, [0, 1, s]);
      face4(g, e0, e1, r1, r0, col, [0, -1, -s]);
    }
  }
  // the mast, its yard, the shrouds and the stay
  const mastU = 0.1 * h, top = 0.62 * L, yardY = 0.55 * L, half = 0.22 * L;
  mast(g, mastU, deckAt(H, mastU).y - 0.05, top, 0.13);
  yardOn(g, mastU, yardY, half);
  const sh = station(H, mastU - 1.0);
  for (const s of [-1, 1]) g.beam([mastU, top - 0.7, 0], [mastU - 1.0, sh.g, s * (sh.w - 0.05)], 0.03, 0.03, ROPE);
  g.beam([mastU + 0.05, top - 0.5, 0], [bow.u + 0.12, bow.g + 0.42, 0], 0.03, 0.03, ROPE);
  return { H, mastU, top, yardY, half };
}

/** Oar ports along a galley's sides, in the strake under her gunwale. */
function oarPorts(g: GeoBuilder, H: Hull, L: number): void {
  const h = L / 2, n = Math.round(L * 0.7);
  for (let i = 0; i < n; i++) {
    const u = -0.44 * h + (0.86 * h * i) / (n - 1), p = station(H, u), y = BILGE + (p.g - BILGE) * 0.86, v = outAt(p.w, 0.86) + 0.025;
    for (const s of [-1, 1]) g.quad([u - 0.1, y - 0.045, s * v], [u + 0.1, y - 0.045, s * v], [u + 0.1, y + 0.045, s * v], [u - 0.1, y + 0.045, s * v], [0, 0, s], PORT);
  }
}

/** Where a galley's crew stand at anchor, as shares of her half length, on the gangway between her shipped oars. */
const GALLEY_CREW = [-0.45, 0.55];

/**
 * A war galley at anchor: her body, her sail furled on the yard, her oars
 * shipped (drawn in and laid along the deck to either side, the ports along
 * her sides dark), a pennant at the masthead, her banner at the stern, a
 * lantern at the stern, her cable down into the water ahead, and her crew.
 */
function galleyAtAnchor(k: Build, f: Frame, L: number, c: Paint, house: string, cable = true): void {
  const h = L / 2;
  let rig: Rig | null = null, light: V3 = [0, 0, 0];
  k.b.moved(f.x, WL, f.z, f.yaw, () => {
    const g = k.b, r = galleyBody(g, L, c), H = r.H;
    rig = r;
    furled(g, r.mastU, r.yardY, r.half, c.band, c.strake);
    oarPorts(g, H, L);
    const d = deckAt(H, 0);
    for (const s of [-1, 1]) {
      block(g, [-0.34 * h, d.y, s * (d.a - 0.5)], [0.42 * h, d.y + 0.15, s * (d.a - 0.13)], OARS);
      // the blades, at the bundles' after ends
      block(g, [-0.5 * h, d.y + 0.02, s * (d.a - 0.56)], [-0.34 * h, d.y + 0.11, s * (d.a - 0.07)], OARS);
    }
    pennant(g, [r.mastU, r.top, 0], northOf(f), 0.17 * L, c.band);
    const sd = deckAt(H, -0.9 * h);
    g.moved(-0.9 * h, 0, -0.3, northOf(f), () => banner(g, 0, 0, sd.y, house, 2.1, 0.42));
    light = lantern(g, -0.92 * h, 0.32, sd.y, 0.9);
    if (cable) g.beam([0.78 * h, H.st[H.st.length - 1].g - 0.3, 0.22], [h + 2.4, -1.25, 0.5], 0.04, 0.035, ROPE);
    GALLEY_CREW.forEach((su, i) => sailor(g, su * h, 0, deckAt(H, su * h).y, Math.abs(Math.round(f.x + f.z)) + i * 2));
  });
  if (!rig) return;
  const [lx, , lz] = onBoard(f, light);
  k.lights.push({ x: lx, z: lz, r: 6, color: '#ffcf8a', k: 0.38 });
  keep(`a galley of ${L}`, f, h, L * 0.1);
}

// ---------------------------------------------------------------------------
// Great ships
// ---------------------------------------------------------------------------

/** A great ship's hull: round-bellied and high-sided, rising to a high stern and a beaked bow. */
function greatHull(L: number): Hull {
  const h = L / 2, W = L * 0.135;
  return {
    st: [
      { u: -0.95 * h, w: 0.74 * W, g: 2.25 },
      { u: -0.78 * h, w: 0.93 * W, g: 1.86 },
      { u: -0.45 * h, w: W, g: 1.5 },
      { u: 0, w: W, g: 1.36 },
      { u: 0.4 * h, w: 0.95 * W, g: 1.42 },
      { u: 0.7 * h, w: 0.72 * W, g: 1.66 },
      { u: 0.9 * h, w: 0.14 * W, g: 2.05 },
    ],
    keel: 0.6, bulwark: 0.36, thick: 0.1,
    strakes: [[0.38, TAR], [0.62, SEA], [0.74, SILVER], [1, TAR]],
    foot: TAR_FOOT, cap: RAIL, deck: DECK, inner: BULWARK,
  };
}

/**
 * A castle on a ship's deck from `u0` to `u1`, as wide as the deck allows all
 * along it, standing on its lowest point, its top `top` over the water, with a
 * parapet round its top. Hands back how wide it is.
 */
function castle(g: GeoBuilder, H: Hull, u0: number, u1: number, top: number, wall: number, trim: number, front = true): number {
  let half = Infinity, y0 = Infinity;
  for (let i = 0; i <= 4; i++) {
    const d = deckAt(H, u0 + ((u1 - u0) * i) / 4);
    half = Math.min(half, d.a - 0.05);
    y0 = Math.min(y0, d.y);
  }
  g.box(u0, y0 - 0.02, -half, u1, top, half, wall, { faces: 'NESWT', top: DECK });
  const t = 0.1, p = 0.36, o = 'NESWT';
  g.box(u0, top, -half, u1, top + p, -half + t, trim, { faces: o });
  g.box(u0, top, half - t, u1, top + p, half, trim, { faces: o });
  g.box(u0, top, -half + t, u0 + t, top + p, half - t, trim, { faces: o });
  if (front) g.box(u1 - t, top, -half + t, u1, top + p, half - t, trim, { faces: o });
  return half;
}

/**
 * A great ship at anchor: her hull; a castle at the stern, sea green with a
 * silver parapet, its windows lit and the seahorse hanging on either side; a
 * forecastle; two masts with their sails furled, a fighting top on the main;
 * a bowsprit and her rigging; pennants, her banner, a lantern, two cables, a
 * hatch and her crew.
 */
function greatShipAtAnchor(k: Build, f: Frame, L: number): void {
  const h = L / 2, H = greatHull(L), stern = H.st[0], bow = H.st[H.st.length - 1];
  const cTop = 3.3, u0 = stern.u + 0.06, u1 = -0.5 * h, fTop = 2.5;
  const mainU = 0.04 * h, mainTop = Math.min(0.85 * L, 11.4), mizU = -0.74 * h, mizTop = 0.6 * L;
  let light: V3 = [0, 0, 0];
  k.b.moved(f.x, WL, f.z, f.yaw, () => {
    const g = k.b;
    hull(g, H);
    // the castle at the stern, silver-white with a sea-green parapet, its windows and its door, and the seahorse hanging on its sides
    const ch = castle(g, H, u0, u1, cTop, SILVER, SEA);
    for (const v of [-0.55, 0, 0.55]) lit(g, [u0 - 0.02, 2.45, v * ch - 0.16], [u0 - 0.02, 2.95, v * ch + 0.16], [-1, 0, 0]);
    for (const s of [-1, 1]) for (const u of [u0 + (u1 - u0) * 0.22, u0 + (u1 - u0) * 0.8]) lit(g, [u - 0.15, 2.5, s * (ch + 0.02)], [u + 0.15, 2.9, s * (ch + 0.02)], [0, 0, s]);
    const fd = deckAt(H, u1);
    lit(g, [u1 + 0.02, fd.y, -0.3], [u1 + 0.02, fd.y + 1.2, 0.3], [1, 0, 0], interior(1.6));
    for (const s of [-1, 1]) seahorseCloth(g, (u0 + u1) / 2, s * ch, 0, s, cTop - 0.08, 0.95, 1.5);
    // the forecastle
    castle(g, H, 0.52 * h, 0.76 * h, fTop, SILVER, SEA, true);
    // the masts, the fighting top, the yards with their sails furled, the bowsprit and the rigging
    mast(g, mainU, deckAt(H, mainU).y - 0.05, mainTop, 0.16);
    g.box(mainU - 0.48, mainTop - 2.15, -0.48, mainU + 0.48, mainTop - 1.8, 0.48, SPAR, { faces: 'NESWTB', top: DECK_DARK });
    const mainYard = 0.63 * L, mainHalf = Math.min(0.26 * L, 3.4);
    yardOn(g, mainU, mainYard, mainHalf);
    furled(g, mainU, mainYard, mainHalf, SILVER, SEA);
    mast(g, mizU, cTop, mizTop, 0.11);
    const mizYard = 0.52 * L, mizHalf = 0.13 * L;
    yardOn(g, mizU, mizYard, mizHalf);
    furled(g, mizU, mizYard, mizHalf, SILVER, SEA);
    const sprit: V3 = [h, bow.g + 0.85, 0];
    g.beam([bow.u - 0.6, bow.g - 0.1, 0], sprit, 0.09, 0.06, SPAR);
    g.beam([mainU, mainTop - 0.3, 0], sprit, 0.03, 0.03, ROPE);
    g.beam([mizU + 0.05, mizTop - 0.3, 0], [mainU - 0.1, mainTop - 3.0, 0], 0.03, 0.03, ROPE);
    const sh = station(H, mainU - 1.3);
    for (const s of [-1, 1]) {
      g.beam([mainU, mainTop - 2.2, s * 0.4], [mainU - 1.3, sh.g, s * (sh.w - 0.05)], 0.03, 0.03, ROPE);
      g.beam([mizU, mizTop - 0.6, 0], [mizU - 0.5, cTop + 0.36, s * (ch - 0.05)], 0.025, 0.025, ROPE);
    }
    // pennants, the banner at the stern, the lantern, the cables, and a hatch amidships
    pennant(g, [mainU, mainTop, 0], northOf(f), 0.17 * L, SEA);
    pennant(g, [mizU, mizTop, 0], northOf(f), 0.12 * L, SEA);
    g.moved(u0 + 0.3, 0, -ch + 0.3, northOf(f), () => banner(g, 0, 0, cTop, 'velaryon', 2.0, 0.5));
    light = lantern(g, u0 + 0.22, 0.3, cTop, 0.5);
    for (const s of [-1, 1]) g.beam([0.8 * h, bow.g - 0.25, s * 0.3], [h + 2.4, -1.3, s * 0.75], 0.04, 0.035, ROPE);
    const hd = deckAt(H, -0.18 * h);
    g.box(-0.3 * h, hd.y - 0.05, -0.55, -0.08 * h, hd.y + 0.24, 0.55, BULWARK, { faces: 'NESWT', top: DECK_DARK });
    // her boat, lying alongside her starboard quarter on its painter
    const bu = -0.42 * h, bv = station(H, bu).w + 1.05;
    g.moved(bu, 0, bv, 0, () => {
      hull(g, boatHull(3.4, 0x6a5a48));
      g.box(-0.1, 0.32, -0.55, 0.2, 0.4, 0.55, 0x8a6d4e, { faces: 'NESWTB' });
    });
    g.beam([bu + 1.5, 0.62, bv - 0.1], [bu + 2.4, station(H, bu + 2.4).g, station(H, bu + 2.4).w - 0.05], 0.03, 0.03, ROPE);
    // her crew: on the castle, at the waist, on the forecastle, and a lookout in the fighting top
    const crew: V3[] = [[u0 + 0.9, -0.4, cTop], [0.22 * h, 0.6, deckAt(H, 0.22 * h).y], [0.64 * h, 0.1, fTop], [mainU - 0.22, 0.3, mainTop - 1.8]];
    crew.forEach(([u, v, y], i) => sailor(g, u, v, y, Math.abs(Math.round(f.x)) + i));
  });
  STILL.push({ what: "a great ship's boat", ...(() => { const [x, z] = on(f, -0.42 * h, station(H, -0.42 * h).w + 1.05); return { x, z }; })(), yaw: f.yaw, hl: 1.7, hb: 0.6 });
  const [lx, , lz] = onBoard(f, light);
  k.lights.push({ x: lx, z: lz, r: 7, color: '#ffcf8a', k: 0.42 });
  keep(`a great ship of ${L}`, f, h, L * 0.135);
}

// ---------------------------------------------------------------------------
// Cogs
// ---------------------------------------------------------------------------

/** A cog's colours: her hull, the wale along her side, her gunwale, her castle and its parapet, and her pennant. */
interface CogPaint { hull: number; band: number; cap: number; castle: number; trim: number; pennant: number }
const COG_OAK: CogPaint = { hull: OAK, band: 0x5a4128, cap: 0x5a4430, castle: 0x8a6a48, trim: 0x6b5136, pennant: 0xb84a3a };
const COG_TARRED: CogPaint = { hull: 0x5a4636, band: 0x9a3a2e, cap: 0x4a3828, castle: 0x7a5c40, trim: 0x9a3a2e, pennant: 0xd6a12e };
const COG_EAST: CogPaint = { hull: 0x5e3f55, band: SAFFRON, cap: 0x3f2a3a, castle: 0x6a4560, trim: SAFFRON, pennant: CRIMSON };

/** A cog's hull: short, round and high-sided, with a straight stern and a raked stem. */
function cogHull(L: number, W: number, c: CogPaint): Hull {
  const h = L / 2;
  return {
    st: [
      { u: -0.94 * h, w: 0.66 * W, g: 1.95 },
      { u: -0.74 * h, w: 0.9 * W, g: 1.66 },
      { u: -0.36 * h, w: W, g: 1.46 },
      { u: 0.1 * h, w: W, g: 1.4 },
      { u: 0.5 * h, w: 0.93 * W, g: 1.48 },
      { u: 0.78 * h, w: 0.62 * W, g: 1.74 },
      { u: 0.97 * h, w: 0.1 * W, g: 2.1 },
    ],
    keel: 0.55, bulwark: 0.42, thick: 0.1,
    strakes: [[0.48, c.hull], [0.64, c.band], [1, c.hull]],
    foot: OAK_FOOT, cap: c.cap, deck: DECK, inner: BULWARK,
  };
}

/**
 * A cog's body in her own frame: her hull; the castle at her stern with its
 * parapet and two lit windows; the rudder hung on her sternpost; her mast and
 * yard, a bowsprit and her stays; and a lantern on the castle. Hands back her
 * rig and where her lantern's light is.
 */
function cogBody(g: GeoBuilder, L: number, W: number, c: CogPaint): Rig & { light: V3; cTop: number; ch: number; u0: number; u1: number } {
  const h = L / 2, H = cogHull(L, W, c), stern = H.st[0], bow = H.st[H.st.length - 1];
  hull(g, H);
  const u0 = stern.u + 0.06, u1 = -0.5 * h, cTop = 2.95;
  const ch = castle(g, H, u0, u1, cTop, c.castle, c.trim);
  for (const v of [-0.45, 0.45]) lit(g, [u0 - 0.02, 2.15, v * ch - 0.15], [u0 - 0.02, 2.6, v * ch + 0.15], [-1, 0, 0]);
  const fd = deckAt(H, u1);
  lit(g, [u1 + 0.02, fd.y, -0.28], [u1 + 0.02, fd.y + 1.15, 0.28], [1, 0, 0], interior(1.6));
  // the rudder, hung on the sternpost
  g.box(stern.u - 0.36, -0.5, -0.06, stern.u - 0.02, stern.g - 0.2, 0.06, c.hull, { faces: 'NESWT' });
  // the mast, the yard, the bowsprit and the stays
  const mastU = 0.06 * h, top = Math.min(0.92 * L, 10.5), yardY = 0.82 * L, half = 0.25 * L;
  mast(g, mastU, deckAt(H, mastU).y - 0.05, top, 0.15);
  yardOn(g, mastU, yardY, half);
  const sprit: V3 = [h + 0.1, bow.g + 0.6, 0];
  g.beam([bow.u - 0.5, bow.g - 0.15, 0], sprit, 0.08, 0.05, SPAR);
  g.beam([mastU + 0.05, top - 0.3, 0], sprit, 0.03, 0.03, ROPE);
  const sh = station(H, mastU - 1.2);
  for (const s of [-1, 1]) g.beam([mastU, top - 0.8, 0], [mastU - 1.2, sh.g, s * (sh.w - 0.05)], 0.03, 0.03, ROPE);
  const light = lantern(g, u0 + 0.2, 0.45, cTop, 0.45);
  return { H, mastU, top, yardY, half, light, cTop, ch, u0, u1 };
}

/**
 * A cog moored at a quay, her starboard side to it: her body; her sail
 * furled, or loosed to dry and hanging from the yard in stripes of `loose`;
 * her pennant; cargo on deck; and her crew. `ties` says where her mooring
 * lines go ashore.
 */
function cogMoored(k: Build, f: Frame, L: number, W: number, c: CogPaint, o: { loose?: number[]; cargo?: number[]; crew?: number; ties?: [V3, number, number][] } = {}): void {
  const h = L / 2;
  let rig: (Rig & { light: V3; cTop: number }) | null = null;
  k.b.moved(f.x, WL, f.z, f.yaw, () => {
    const g = k.b, r = cogBody(g, L, W, c), H = r.H;
    rig = r;
    if (o.loose) {
      // loosed to dry: hanging straight from the yard in stripes, stirring a little
      const n = o.loose.length, top = r.yardY - 0.1, foot = deckAt(H, r.mastU).y + 1.7, u = r.mastU + 0.24;
      for (let i = 0; i < n; i++) {
        const v0 = -r.half + 0.15 + ((2 * r.half - 0.3) * i) / n, v1 = -r.half + 0.15 + ((2 * r.half - 0.3) * (i + 1)) / n, mid = (top + foot) / 2;
        const bulge = (v: number): number => 0.22 * Math.cos((v / r.half) * Math.PI * 0.5);
        both4(g, [u, top, v0], [u, top, v1], [u + bulge(v1), mid, v1], [u + bulge(v0), mid, v0], o.loose[i], [1, 0, 0]);
        both4(g, [u + bulge(v0), mid, v0], [u + bulge(v1), mid, v1], [u + 0.08, foot, v1 * 0.96], [u + 0.08, foot, v0 * 0.96], o.loose[i], [1, 0, 0]);
      }
    } else furled(g, r.mastU, r.yardY, r.half, CANVAS, ROPE);
    pennant(g, [r.mastU, r.top, 0], northOf(f), 0.15 * L, c.pennant);
    // cargo: bales, barrels and crates on deck, before the castle
    const cargo = o.cargo ?? [];
    cargo.forEach((col, i) => {
      const u = -0.3 * h + (i % 3) * 0.95 + (i > 2 ? 0.4 : 0), v = i > 2 ? -0.55 : 0.5, d = deckAt(H, u);
      if (col < 0) barrel(g, u, v, d.y);
      else if (col === 0) crate(g, u, v, d.y);
      else bale(g, u, v, d.y, col);
    });
    // her crew: one on the castle, others on deck
    const crew: V3[] = [[-0.76 * h, -0.25, r.cTop], [0.6 * h, -0.4, deckAt(H, 0.6 * h).y], [0.36 * h, 0.62, deckAt(H, 0.36 * h).y]];
    crew.slice(0, o.crew ?? 2).forEach(([u, v, y], i) => sailor(g, u, v, y, Math.abs(Math.round(f.x * 3)) + i));
  });
  if (!rig) return;
  const R = rig as Rig & { light: V3; cTop: number }, H = R.H;
  // her mooring lines, from her bow and her quarter to the bollards ashore
  for (const [to, u, v] of o.ties ?? []) {
    const p = station(H, u);
    k.b.beam(onBoard(f, [u, p.g + 0.05, v * (p.w - 0.05)]), to, 0.035, 0.035, ROPE);
  }
  const [lx, , lz] = onBoard(f, R.light);
  k.lights.push({ x: lx, z: lz, r: 6, color: '#ffcf8a', k: 0.38 });
  keep(`a cog of ${L}`, f, h, W);
}

// ---------------------------------------------------------------------------
// Fishing boats
// ---------------------------------------------------------------------------

/** A small open boat's hull: a thin shell with a floor of boards inside. */
function boatHull(L: number, color: number): Hull {
  const h = L / 2, W = L * 0.17;
  return {
    st: [
      { u: -0.96 * h, w: 0.55 * W, g: 0.55 },
      { u: -0.4 * h, w: W, g: 0.44 },
      { u: 0.35 * h, w: 0.92 * W, g: 0.46 },
      { u: 0.97 * h, w: 0.08 * W, g: 0.68 },
    ],
    keel: 0.28, bulwark: 0.32, thick: 0,
    strakes: [[1, color]],
    foot: 0x3a2e24, cap: color, deck: 0x6b5340, inner: 0x8a6d4e,
  };
}

/** A fisherman sitting on a thwart, low in the boat: his body, his head and his cap, on the boards at `y`. */
function sitter(g: GeoBuilder, u: number, v: number, y: number, coat: number): void {
  g.box(u - 0.26, y, v - 0.34, u + 0.26, y + 0.95, v + 0.34, coat, { faces: 'NESWT' });
  g.box(u - 0.21, y + 0.95, v - 0.21, u + 0.21, y + 1.36, v + 0.21, 0xe0b994, { faces: 'NESWT' });
  g.box(u - 0.24, y + 1.36, v - 0.24, u + 0.24, y + 1.52, v + 0.24, 0x5a4a3a, { faces: 'NESWT' });
}

/**
 * A fishing boat, 4.4 long, lying where `f` says: her hull and a thwart, and
 * either a mast with a tanned lug sail or a pair of oars out with a man
 * rowing; or, with `net` (1 to starboard, -1 to port), her net out over the
 * side, its line of floats in a loop on the water, and men hauling it.
 */
function fishingBoat(k: Build, f: Frame, o: { hull: number; sail?: number; oars?: boolean; net?: 1 | -1 }): void {
  const L = 4.4, h = L / 2, H = boatHull(L, o.hull), floor = deckAt(H, 0).y, gun = station(H, 0).g;
  k.b.moved(f.x, WL, f.z, f.yaw, () => {
    const g = k.b;
    hull(g, H);
    g.box(-0.1, gun - 0.16, -0.68, 0.24, gun - 0.06, 0.68, 0x8a6d4e, { faces: 'NESWTB' });
    if (o.sail !== undefined) {
      const mu = 0.38 * h;
      mast(g, mu, floor, 3.7, 0.07);
      // the lug sail, its yard slanting up aft, tanned; and the man at the helm aft of it
      const tack: V3 = [mu + 0.12, gun + 0.25, 0], clew: V3 = [-0.45 * h, gun + 0.35, 0], peak: V3 = [-0.52 * h, 3.55, 0], throat: V3 = [mu + 0.25, 2.95, 0];
      both4(g, tack, clew, peak, throat, o.sail, [0, 0, 1]);
      g.beam([throat[0] + 0.15, throat[1] - 0.04, 0.04], [peak[0] - 0.1, peak[1] + 0.03, 0.04], 0.04, 0.04, SPAR);
      sitter(g, -0.74 * h, 0, floor, 0x3f6fb5);
    }
    if (o.oars) {
      sitter(g, 0.05, 0, floor, 0x8a5a3a);
      for (const s of [-1, 1]) {
        g.beam([0.1, gun + 0.04, s * 0.7], [-0.45, -0.05, s * 2.15], 0.035, 0.035, OARS);
        both4(g, [-0.35, 0.02, s * 1.85], [-0.5, -0.12, s * 2.25], [-0.62, -0.06, s * 2.22], [-0.46, 0.08, s * 1.83], OARS, [0, 1, 0]);
      }
    }
    if (o.net) {
      const s = o.net;
      // the net going over the side into the water, and its floats in a loop off it
      both4(g, [0.7, gun, s * 0.66], [-0.9, gun, s * 0.7], [-1.2, -0.25, s * 1.3], [0.9, -0.25, s * 1.25], 0x5f5b4b, [0, 0.4, s]);
      for (let i = 0; i <= 8; i++) {
        const t = i / 8, a = Math.PI * t, u = 0.95 * Math.cos(a) * 1.9 - 0.1, v = s * (1.3 + Math.sin(a) * 3.0);
        g.box(u - 0.11, -0.05, v - 0.11, u + 0.11, 0.07, v + 0.11, 0xd9b779, { faces: 'NESWT' });
      }
      // the men hauling it stand in her
      sailor(g, 0.4, s * 0.12, floor, 3);
      sailor(g, -0.8, s * 0.12, floor, 1);
    }
  });
  if (o.net) {
    const [nx, nz] = on(f, -0.1, o.net * 2.8);
    STILL.push({ what: 'a fishing boat\'s net', x: nx, z: nz, yaw: f.yaw, hl: 1.9, hb: 1.6 });
  }
  keep('a fishing boat', f, h, L * 0.17 + (o.oars ? 1.5 : 0));
}

// ---------------------------------------------------------------------------
// What stands still, placed
// ---------------------------------------------------------------------------

/**
 * The Velaryon fleet at anchor, each ship where `FLEET` has her, as long as it
 * says and heading as it says. In each line (across the Gullet, and off Hull)
 * a ship longer than those either side of her is a great ship; the rest are
 * war galleys.
 */
function fleet(k: Build): void {
  const lines = [FLEET.filter((s) => s.z > 40), FLEET.filter((s) => s.z <= 40)];
  for (const line of lines) {
    line.forEach((s, i) => {
      const before = line[i - 1]?.len ?? 0, after = line[i + 1]?.len ?? 0, f = frame(s.x, s.z, s.heading);
      if (s.len > before && s.len > after) greatShipAtAnchor(k, f, s.len);
      else galleyAtAnchor(k, f, s.len, VELARYON, 'velaryon');
    });
  }
}

/** The bollards on King's Landing's quay, as walls.ts stands them along the bank: where along it, how far in from its edge, and how high their tops are. */
const BOLLARDS = { x: [-85.5, -79, -73.6, -55, -45.8, -39.8, -33.4], z: RUSH.north - 0.75, top: 0.62 };
const bollard = (x: number): V3 => [x, BOLLARDS.top, BOLLARDS.z];

/**
 * King's Landing's quays on the Rush: a cog at the west end, and east of the
 * water stairs a galley of the king's and another cog, each lying alongside
 * with her starboard side to the quay and her bow upstream, made fast to the
 * bollards, with a gangplank to the quay and porters on it. They keep clear of
 * the stairs, of the crane's jib, and of the ferry's way by 4.
 */
function quays(k: Build): void {
  const bank = RUSH.north;
  // the cog at the west end: her stern 4.5 short of where the ferry lies at the stage
  const wL = 10, wW = 1.6, wx = FERRY_S[0] - FERRY.L - 4.5 - wL / 2, fw = frame(wx, bank + 0.25 + wW, 180);
  cogMoored(k, fw, wL, wW, COG_OAK, { cargo: [0x8a6a48, -1, 0, 0xc9b48a, -1], crew: 2, ties: [[bollard(-85.5), 0.8 * wL / 2, 1], [bollard(-79), -0.82 * wL / 2, 1]] });
  gangplank(k, fw, cogHull(wL, wW, COG_OAK), -0.1 * wL / 2, bank);
  // the king's galley, her bow 4.75 clear of where the ferry lies at the stairs
  const gL = 13, gx = FERRY_N[0] + FERRY.L + 4.75 + gL / 2, fg = frame(gx, bank + 0.25 + gL * 0.1, 180);
  galleyAtAnchor(k, fg, gL, KINGS, 'targaryen', false);
  const gH = galleyHull(gL, KINGS);
  for (const [bx, u] of [[-55, 0.78], [-45.8, 0.05], [-39.8, -0.85]] as P2[]) {
    const p = station(gH, (u * gL) / 2);
    k.b.beam(onBoard(fg, [(u * gL) / 2, p.g + 0.05, p.w - 0.05]), bollard(bx), 0.035, 0.035, ROPE);
  }
  gangplank(k, fg, gH, 0.25 * gL / 2, bank);
  // the cog east of her, 2 astern of her
  const eL = 9.5, eW = 1.52, ex = gx + gL / 2 + 2 + eL / 2, fe = frame(ex, bank + 0.25 + eW, 180);
  cogMoored(k, fe, eL, eW, COG_TARRED, { cargo: [0xa8242c, 0x2e3f7c, -1, -1, 0], crew: 3, ties: [[bollard(-39.8), 0.8 * eL / 2, 1], [bollard(-33.4), -0.6 * eL / 2, 1]] });
  gangplank(k, fe, cogHull(eL, eW, COG_TARRED), 0.15 * eL / 2, bank);
}

/**
 * A gangplank from a ship at `u` along her starboard side to the quay's kerb
 * at `bank`: down onto her deck if her gunwale is below the quay, or onto her
 * gunwale if it stands higher; and a porter on it with a sack on his shoulder.
 */
function gangplank(k: Build, f: Frame, H: Hull, u: number, bank: number): void {
  const d = deckAt(H, u), p = station(H, u), high = WL + p.g > 0.1;
  const deck = onBoard(f, high ? [u, p.g + 0.06, p.w - 0.06] : [u, d.y + 0.05, d.a - 0.3]), quay: V3 = [deck[0], 0.2, bank - 0.3];
  slab(k.b, deck, quay, 0.32, 0.06, 0x8a6a46, { under: 0x6b5136 });
  const m: V3 = [(deck[0] + quay[0]) / 2, (deck[1] + quay[1]) / 2, (deck[2] + quay[2]) / 2];
  k.person(m[0], m[2], m[1] + 0.02);
  k.b.box(m[0] - 0.3, m[1] + 2.25, m[2] - 0.2, m[0] + 0.3, m[1] + 2.6, m[2] + 0.2, 0xc8b48a, { faces: 'NESWT', top: 0xd2c09a });
}

/**
 * Duskendale's harbour: two cogs moored south of the town's quay, one
 * alongside it and one made fast outside her, all in the water. The town and
 * its quay are the north shore's.
 */
function duskendale(k: Build): void {
  const l = lotOf('duskendale'), x = (l.x0 + l.x1) / 2, shore = SHORE.north;
  const aL = 9.6, aW = 1.49, fa = frame(x, shore + 1.05 + aW, 0);
  cogMoored(k, fa, aL, aW, COG_TARRED, { cargo: [-1, -1, 0x9a7a52, 0, -1], crew: 2, ties: [[[x + aL / 2, 0.06, shore - 0.35], 0.8 * aL / 2, -1], [[x - aL / 2, 0.06, shore - 0.35], -0.8 * aL / 2, -1]] });
  const bL = 8.4, bW = 1.26, fb = frame(x + 0.6, fa.z + aW + 0.3 + bW, 0);
  cogMoored(k, fb, bL, bW, COG_OAK, { cargo: [0xc9b48a, 0, -1], crew: 2 });
  // made fast to her, bow and stern
  const ha = cogHull(aL, aW, COG_TARRED), hb = cogHull(bL, bW, COG_OAK);
  for (const s of [0.7, -0.75]) {
    const pa = station(ha, (s * bL) / 2), pb = station(hb, (s * bL) / 2);
    k.b.beam(onBoard(fa, [(s * bL) / 2 + 0.6, pa.g, pa.w - 0.05]), onBoard(fb, [(s * bL) / 2, pb.g, -(pb.w - 0.05)]), 0.03, 0.03, ROPE);
  }
}

/**
 * A cog from the Free Cities moored off Spicetown, alongside the east end of
 * its quay, her sail loosed to dry in stripes of saffron and crimson, bales
 * from the east on her deck. She lies where the island's south shore runs
 * level, east of the tide's sands.
 */
function spicetown(k: Build): void {
  const L = 10, W = 1.5, x = 68, x0 = x - L / 2, x1 = x + L / 2;
  // her north side 0.9 off the shore, where it reaches furthest south under her
  let shore = -Infinity;
  for (let i = 0; i <= 10; i++) shore = Math.max(shore, southShore(x0 + ((x1 - x0) * i) / 10));
  const f = frame(x, shore + 0.9 + W, 180);
  const edge = (bx: number): V3 => [bx, 0.6, southShore(bx) - 0.35];
  cogMoored(k, f, L, W, COG_EAST, { loose: [SAFFRON, CRIMSON, SAFFRON, CRIMSON, SAFFRON], cargo: [0xa8242c, 0xd6a12e, 0x2e3f7c, 0x3d7a4c, 0x6d3b7c], crew: 3, ties: [[edge(61.0), 0.85 * L / 2, 1], [edge(65.4), 0.1 * L / 2, 1]] });
  // a gangplank to the quay's east end, and a porter on it
  gangplank(k, f, cogHull(L, W, COG_EAST), 0.4 * L / 2, southShore(x - 0.4 * L / 2));
}

/** Where Driftmark's south shore is at a place along it. */
function southShore(x: number): number {
  const isle = ISLANDS.driftmark;
  let z = -Infinity;
  for (let i = 0; i < isle.length; i++) {
    const a = isle[i], c = isle[(i + 1) % isle.length];
    if (a[0] === c[0] || (a[0] - x) * (c[0] - x) > 0) continue;
    z = Math.max(z, a[1] + ((c[1] - a[1]) * (x - a[0])) / (c[0] - a[0]));
  }
  return z;
}

/**
 * Fishing boats: two off the fishing village on the north shore, one with her
 * net out; one under the Dragonmont's west flank with her net out; one in the
 * open water between the Red Keep and Driftmark; one rowing in the strait west
 * of Driftmark; one under sail off Aegon's strand; and one with her net out in
 * the Gullet south-west of High Tide.
 */
const FISHING: { x: number; z: number; heading: number; hull: number; sail?: number; oars?: boolean; net?: 1 | -1 }[] = [
  { x: -1.5, z: -73.6, heading: 90, hull: 0x6a5a48, net: -1 },
  { x: 8, z: -74.2, heading: 190, hull: 0x4f6a72, sail: 0xb46a3c },
  { x: 28.2, z: -50.5, heading: 95, hull: 0x8a5a3a, net: -1 },
  { x: 6, z: 15, heading: 30, hull: 0x5a6f7a, sail: 0xc98a4a },
  { x: -5.5, z: 40, heading: 95, hull: 0x6f7c52, oars: true },
  { x: -3.5, z: 57, heading: 250, hull: 0x7a5a3c, sail: 0xa8583e },
  { x: 5, z: 85.5, heading: 340, hull: 0x5a6f7a, net: -1 },
];

// ---------------------------------------------------------------------------
// What moves: the way a ship goes, and parts that swing
// ---------------------------------------------------------------------------

/**
 * A closed way on the water through corners, rounded in its bends, that a
 * ship goes round at `pace`, slowing in the bends: how far along it she is
 * after a time, where a place along it is, and which way it heads there.
 */
class Way {
  readonly pts: P2[];
  readonly length: number;
  readonly lap: number;
  private readonly s: number[] = [0];
  private readonly t: number[] = [0];

  constructor(corners: P2[], r: number, pace: number) {
    this.pts = rounded(corners, r, true, 0.5);
    const n = this.pts.length;
    for (let i = 1; i <= n; i++) this.s.push(this.s[i - 1] + Math.hypot(this.pts[i % n][0] - this.pts[i - 1][0], this.pts[i % n][1] - this.pts[i - 1][1]));
    this.length = this.s[n];
    // slower where the way turns: four tenths slower where it turns a radian in three units
    const speed = this.pts.map((_, i) => {
      const a = this.headingAt(this.s[i] - 1.5), b = this.headingAt(this.s[i] + 1.5);
      return pace * (1 - 0.4 * Math.min(1, Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)))));
    });
    for (let i = 1; i <= n; i++) this.t.push(this.t[i - 1] + (this.s[i] - this.s[i - 1]) / ((speed[i - 1] + speed[i % n]) / 2));
    this.lap = this.t[n];
  }

  /** How far along the way a ship is after `time` seconds. */
  along(time: number): number {
    const t = ((time % this.lap) + this.lap) % this.lap;
    let lo = 0, hi = this.t.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (this.t[m] <= t) lo = m;
      else hi = m;
    }
    return this.s[lo] + ((this.s[hi] - this.s[lo]) * (t - this.t[lo])) / Math.max(1e-9, this.t[hi] - this.t[lo]);
  }

  /** Where a place along the way is. */
  at(d: number): P2 {
    const n = this.pts.length, s = ((d % this.length) + this.length) % this.length;
    let lo = 0, hi = n;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (this.s[m] <= s) lo = m;
      else hi = m;
    }
    const a = this.pts[lo], b = this.pts[hi % n], u = (s - this.s[lo]) / Math.max(1e-9, this.s[hi] - this.s[lo]);
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  }

  /** Which way the way heads at a place along it, in radians, as a ship's bow there sees it. */
  headingAt(d: number): number {
    const a = this.at(d - 0.8), b = this.at(d + 0.8);
    return Math.atan2(b[1] - a[1], b[0] - a[0]);
  }
}

/** A part of a moving mesh that swings about a point of its own: an oar, a pole. Its corners are `from` to `to` in the mesh's geometry; `group` says which turn it takes. */
interface Swinging { from: number; to: number; pivot: V3; group: number }

/** Turns the swinging parts of a geometry, each about its own point, by the turn of its group: hands back what does it each frame. */
function swinger(geo: THREE.BufferGeometry, parts: Swinging[]): (turns: THREE.Matrix3[]) => void {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute, nor = geo.getAttribute('normal') as THREE.BufferAttribute;
  const rest = Float32Array.from(pos.array as Float32Array), restN = Float32Array.from(nor.array as Float32Array);
  pos.setUsage(THREE.DynamicDrawUsage);
  nor.setUsage(THREE.DynamicDrawUsage);
  const v = new THREE.Vector3();
  return (turns) => {
    for (const p of parts) {
      const m = turns[p.group];
      for (let i = p.from; i < p.to; i++) {
        v.set(rest[i * 3] - p.pivot[0], rest[i * 3 + 1] - p.pivot[1], rest[i * 3 + 2] - p.pivot[2]).applyMatrix3(m);
        pos.setXYZ(i, v.x + p.pivot[0], v.y + p.pivot[1], v.z + p.pivot[2]);
        v.set(restN[i * 3], restN[i * 3 + 1], restN[i * 3 + 2]).applyMatrix3(m);
        nor.setXYZ(i, v.x, v.y, v.z);
      }
    }
    pos.needsUpdate = true;
    nor.needsUpdate = true;
  };
}

/** A mesh of its own for something that moves: lit as the tile is, casting no shadow (the shadows are drawn once), never culled. */
function mover(k: Build, g: GeoBuilder, name: string): THREE.Mesh {
  const mesh = new THREE.Mesh(g.build(), k.mat.city());
  mesh.name = name;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  k.group.add(mesh);
  return mesh;
}

/** For pictures: what moves stands as it is at this time, if it is set. */
let held: number | null = null;
const timeOf = (time: number): number => held ?? time;

// ---------------------------------------------------------------------------
// The ferry over the Rush
// ---------------------------------------------------------------------------

/** The ferry: half its length and half its width, how high its deck stands over the water, and how long it waits at each side and takes to cross. */
const FERRY = { L: 3.0, W: 1.3, deck: 0.35, wait: 8, cross: 13 };
/** The water stairs at the foot of the Street of the Sisters, as walls.ts builds them: six steps of 0.95 going down west along the bank from beside the street, their face 1 out from it. */
const STAIRS = { x1: ROADS.sisters[0][0] + 2.6, x0: ROADS.sisters[0][0] + 2.6 - 6 * 0.95, face: RUSH.north + 1.0 };
/** The end of the south landing's stage, which reaches out into the Rush to about 3 from the bank, in the middle of the landing's lot. */
const STAGE = (() => {
  const l = lotOf('ferry-landing');
  return { x: (l.x0 + l.x1) / 2, z: RUSH.south - 3 };
})();
/** Where the ferry lies at each side: along the foot of the stairs, and across the end of the stage. */
const FERRY_N: P2 = [(STAIRS.x0 + STAIRS.x1) / 2, STAIRS.face + 0.12 + FERRY.W];
const FERRY_S: P2 = [STAGE.x, STAGE.z - 0.3 - FERRY.W];

/** Where the ferry is a share `f` of the way across from the stairs to the stage, and which way its length lies there: west along the bank at each end, south-west in between. */
function ferryAt(f: number): { x: number; z: number; yaw: number } {
  const [ax, az] = FERRY_N, [dx, dz] = FERRY_S, pull = 5.5, bx = ax - pull, cx = dx + pull, m = 1 - f;
  const x = m * m * m * ax + 3 * m * m * f * bx + 3 * m * f * f * cx + f * f * f * dx;
  const z = m * m * m * az + 3 * m * m * f * az + 3 * m * f * f * dz + f * f * f * dz;
  const tx = 3 * m * m * (bx - ax) + 6 * m * f * (cx - bx) + 3 * f * f * (dx - cx), tz = 6 * m * f * (dz - az);
  return { x, z, yaw: Math.atan2(tz, tx) };
}

/** A goat, standing on `y` and facing along u. */
function goat(g: GeoBuilder, u: number, v: number, y: number): void {
  const COAT = 0xebe5d4, HOOF = 0x3a332e;
  for (const [du, dv] of [[-0.24, -0.1], [-0.24, 0.1], [0.22, -0.1], [0.22, 0.1]]) g.box(u + du - 0.05, y, v + dv - 0.05, u + du + 0.05, y + 0.44, v + dv + 0.05, HOOF, { faces: 'NESW' });
  g.box(u - 0.36, y + 0.42, v - 0.17, u + 0.34, y + 0.78, v + 0.17, COAT, { faces: 'NESWTB' });
  g.box(u + 0.3, y + 0.66, v - 0.1, u + 0.6, y + 0.96, v + 0.1, COAT, { faces: 'NESWTB' });
  for (const s of [-1, 1]) g.beam([u + 0.38, y + 0.94, v + s * 0.06], [u + 0.22, y + 1.16, v + s * 0.11], 0.035, 0.02, HOOF);
}

/**
 * The ferry over the Rush: a flat punt of timber with a rail along each side,
 * open in the middle where folk step on and off; a lantern on a post at one
 * end; the ferryman at the other with his pole; and three passengers, one of
 * them leading a goat. It lies along the foot of the water stairs, waits,
 * crosses slowly to the end of the south landing's stage, easing away and in,
 * waits there, and crosses back. The pole leans back from the way it goes and
 * stands upright while it waits. Each landing has a pool of light by night.
 */
function ferry(k: Build): void {
  const g = new GeoBuilder(), { L, W, deck: D } = FERRY;
  const PLANK = 0x8a6a46, SIDE = 0x5a4634;
  // the punt: its sides, its raked ends, its deck, and a curb along each side
  for (const s of [-1, 1]) face4(g, [-L + 0.45, -0.3, s * W], [L - 0.45, -0.3, s * W], [L, D, s * W], [-L, D, s * W], SIDE, [0, 0, s]);
  for (const e of [-1, 1]) face4(g, [e * (L - 0.45), -0.3, -W], [e * (L - 0.45), -0.3, W], [e * L, D, W], [e * L, D, -W], SIDE, [e * 0.8, -0.6, 0]);
  g.quad([-L, D, -W], [L, D, -W], [L, D, W], [-L, D, W], [0, 1, 0], PLANK);
  for (const s of [-1, 1]) block(g, [-L, D, s * (W - 0.12)], [L, D + 0.12, s * W], SIDE, 'NESWT');
  // the rails, with a way in at the middle of each side
  for (const s of [-1, 1]) {
    for (const u of [-L + 0.15, -0.95, 0.95, L - 0.15]) block(g, [u - 0.05, D + 0.12, s * (W - 0.11)], [u + 0.05, D + 0.95, s * (W - 0.01)], SPAR, 'NESW');
    for (const [a, b] of [[-L + 0.1, -0.9], [0.9, L - 0.1]]) block(g, [a, D + 0.83, s * (W - 0.12)], [b, D + 0.95, s * W], 0x7a5c40, 'NESWTB');
  }
  // the lantern at the west end
  lantern(g, L - 0.25, 0, D, 1.55);
  // the ferryman at the east end, his arm out to his pole; and the passengers
  figure(g, -L + 0.4, -0.75, D, { coat: 0x5a4a3a, legs: 0x3a3430, hat: 0x7a6a48, hatH: 0.26, hatR: 0.42 });
  g.beam([-L + 0.4, D + 1.75, -1.1], [-L + 0.4, D + 1.42, -1.5], 0.08, 0.07, 0x5a4a3a);
  figure(g, 1.5, 0.45, D, { coat: 0xb84a3a, legs: 0x5a3a3a, hat: 0xc9a86a, hatH: 0.34, hatR: 0.36 });
  figure(g, -0.7, 0.55, D, { coat: 0x3f6fb5, legs: 0x3a3a42, hat: 0x6b5136, hatH: 0.18 });
  figure(g, 0.55, -0.55, D, { coat: 0x6f7f4f, legs: 0x4a4038, hat: 0x8a8a84, hatH: 0.2 });
  g.box(0.35, D + 1.4, -0.95, 0.75, D + 1.95, -0.72, 0xc8b48a, { faces: 'NESWTB' });
  goat(g, -0.75, -0.45, D);
  g.beam([-0.35, D + 1.2, 0.3], [-0.2, D + 0.86, -0.38], 0.02, 0.02, ROPE);
  // the pole, last, so that it can swing about the ferryman's hand
  const from = g.triangles * 3, hand: V3 = [-L + 0.4, D + 1.42, -1.5];
  g.beam([hand[0], D + 2.7, -1.48], [hand[0], -1.8, -1.62], 0.05, 0.05, 0x9a7a52);
  const parts: Swinging[] = [{ from, to: g.triangles * 3, pivot: hand, group: 0 }];
  const mesh = mover(k, g, 'ferry'), swing = swinger(mesh.geometry, parts);
  const turn = new THREE.Matrix3(), m4 = new THREE.Matrix4();
  // a pool of light at each landing by night
  k.lights.push({ x: FERRY_N[0], z: STAIRS.face - 0.4, r: 9, color: '#ffcf8a', k: 0.5 }, { x: STAGE.x, z: STAGE.z + 0.9, r: 9, color: '#ffcf8a', k: 0.5 });
  const { wait, cross } = FERRY, cycle = 2 * (wait + cross);
  const ease = (t: number): number => t * t * (3 - 2 * t);
  k.each((_dt, time) => {
    const t = (((timeOf(time) + wait + cross / 2) % cycle) + cycle) % cycle;
    let f = 0, v = 0;
    if (t < wait) f = 0;
    else if (t < wait + cross) { const a = (t - wait) / cross; f = ease(a); v = 6 * a * (1 - a); }
    else if (t < 2 * wait + cross) f = 1;
    else { const a = (t - 2 * wait - cross) / cross; f = 1 - ease(a); v = -6 * a * (1 - a); }
    const p = ferryAt(f), tt = timeOf(time);
    mesh.position.set(p.x, WL + 0.03 * Math.sin(tt * 1.3), p.z);
    mesh.rotation.set(0.012 * Math.sin(tt * 0.9), -p.yaw, 0.01 * Math.sin(tt * 1.1), 'YZX');
    // the pole leans back from the way the ferry goes, pushing, and stands upright while it waits
    const lean = -Math.sign(v) * Math.min(1, Math.abs(v)) * (0.32 + 0.1 * Math.sin(tt * 2.4)) - 0.05;
    turn.setFromMatrix4(m4.makeRotationZ(lean));
    swing([turn]);
  });
}

// ---------------------------------------------------------------------------
// The galley on patrol
// ---------------------------------------------------------------------------

/**
 * Her round: east of Driftmark, down from under Dragonstone's south-east shore
 * to the fleet's line in the Gullet and back, 6 or more from every shore and
 * 4 from the fleet, her oars clear of the board's edge.
 */
const PATROL: P2[] = [[91.6, 17], [97.6, 17], [97.6, 62.2], [91.6, 62.2]];

/**
 * A Velaryon galley on patrol: her body, her sail set and drawing, sea green
 * with the silver seahorse, her banner at the stern, a pennant, a lantern,
 * her helmsman and a lookout, and her oars out, eight to a side, rowing: each
 * stroke pulls through the water and lifts out to swing forward again.
 */
function patrol(k: Build): void {
  const L = 11, h = L / 2, g = new GeoBuilder(), r = galleyBody(g, L, VELARYON), H = r.H;
  oarPorts(g, H, L);
  // the sail: hung from the yard, its foot drawn forward by the wind, the seahorse on both its faces
  const top = r.yardY - 0.1, foot = deckAt(H, r.mastU).y + 1.4, half = r.half - 0.15, ua = r.mastU + 0.24, ub = r.mastU + 0.95;
  const A: V3 = [ua, top, -half], B: V3 = [ua, top, half], C: V3 = [ub, foot, half - 0.2], Dp: V3 = [ub, foot, -half + 0.2];
  both4(g, A, B, C, Dp, SEA, [1, 0, 0]);
  const n = normalOf(A, B, Dp, [1, 0, 0]);
  for (const side of [1, -1]) {
    // a share across and up the seahorse's box, as a place on the sail a hair out from it: drawn the other way round on its back
    const nn: V3 = [n[0] * side, n[1] * side, n[2] * side];
    seahorseOn(g, (s, t) => {
      const sv = 0.1 + t * 0.8, w = half - 0.2 * (1 - sv) - 0.1, v = side * (-w + (0.2 + s * 0.6) * 2 * w);
      return [ub + (ua - ub) * sv + nn[0] * 0.03, foot + (top - foot) * sv + nn[1] * 0.03, v + nn[2] * 0.03];
    }, nn);
  }
  pennant(g, [r.mastU, r.top, 0], Math.PI, 0.17 * L, SEA);
  const sd = deckAt(H, -0.9 * h);
  g.moved(-0.9 * h, 0, -0.3, Math.PI, () => banner(g, 0, 0, sd.y, 'velaryon', 2.1, 0.42));
  lantern(g, -0.92 * h, 0.32, sd.y, 0.9);
  sailor(g, -0.7 * h, 0, deckAt(H, -0.7 * h).y, 5);
  sailor(g, 0.66 * h, 0, deckAt(H, 0.66 * h).y, 0);
  // the oars, last: each from its oarlock out and down into the water, its blade turned half to the sky
  const parts: Swinging[] = [], count = 8, reach = 2.05, drop = 0.36;
  for (let i = 0; i < count; i++) {
    const u = -0.42 * h + (0.86 * h * i) / (count - 1), p = station(H, u);
    for (const s of [-1, 1]) {
      const pivot: V3 = [u, p.g + 0.02, s * (p.w + 0.02)], dir: V3 = [0, -Math.sin(drop), s * Math.cos(drop)];
      const at = (d: number): V3 => [pivot[0] + dir[0] * d, pivot[1] + dir[1] * d, pivot[2] + dir[2] * d];
      const from = g.triangles * 3;
      g.beam(pivot, at(reach - 0.55), 0.035, 0.035, OARS);
      const wu = 0.7, wy = 0.7 * Math.cos(drop), wz = 0.7 * Math.sin(drop) * s, bw = 0.13;
      const e: V3 = [wu * bw, wy * bw, wz * bw];
      const r0 = at(reach - 0.6), r1 = at(reach);
      both4(g, [r0[0] - e[0], r0[1] - e[1], r0[2] - e[2]], [r1[0] - e[0], r1[1] - e[1], r1[2] - e[2]], [r1[0] + e[0], r1[1] + e[1], r1[2] + e[2]], [r0[0] + e[0], r0[1] + e[1], r0[2] + e[2]], OARS, [1, 0.3, 0]);
      parts.push({ from, to: g.triangles * 3, pivot, group: s > 0 ? 1 : 0 });
    }
  }
  const mesh = mover(k, g, 'patrol-galley'), swing = swinger(mesh.geometry, parts);
  const way = new Way(PATROL, 3, 2.1), port = new THREE.Matrix3(), star = new THREE.Matrix3(), ma = new THREE.Matrix4(), mb = new THREE.Matrix4();
  k.each((_dt, time) => {
    const t = timeOf(time), d = way.along(t + 17), [x, z] = way.at(d), yaw = way.headingAt(d);
    mesh.position.set(x, WL + 0.04 * Math.sin(t * 1.3), z);
    mesh.rotation.set(0.018 * Math.sin(t * 0.8), -yaw, 0.012 * Math.sin(t * 1.05 + 1), 'YZX');
    // the stroke: the blades pull aft through the water, then lift and swing forward
    const a = (t * Math.PI * 2) / 2.4, sweep = 0.42 * Math.cos(a), lift = 0.34 * Math.max(0, -Math.sin(a));
    star.setFromMatrix4(ma.makeRotationY(sweep).multiply(mb.makeRotationX(-lift)));
    port.setFromMatrix4(ma.makeRotationY(-sweep).multiply(mb.makeRotationX(lift)));
    swing([port, star]);
  });
}

// ---------------------------------------------------------------------------
// The merchant cog under sail
// ---------------------------------------------------------------------------

/**
 * Her round in the open bay north of Vhagar's rock: along under the fishing
 * village and Duskendale, south down the water under the Dragonmont's west
 * flank, back west short of the rock, and north again, turning wide, clear of
 * the dragon's tail where it lies in the water.
 */
const MERCHANT: P2[] = [[-1.5, -65.5], [20.5, -64.2], [19.5, -42], [8, -43]];

/**
 * A merchant cog under sail: her body, her square sail set and drawing in
 * plain canvas with a red band, her pennant streaming aft, and her crew. She
 * goes round slowly, heeling a little to the wind.
 */
function merchant(k: Build): void {
  const L = 9.5, W = 1.52, g = new GeoBuilder(), r = cogBody(g, L, W, COG_OAK), H = r.H;
  setSail(g, r.mastU + 0.12, r.yardY - 0.1, deckAt(H, r.mastU).y + 1.3, r.half - 0.12, [CANVAS, 0xb84a3a, CANVAS, CANVAS]);
  pennant(g, [r.mastU, r.top, 0], Math.PI, 0.15 * L, 0xb84a3a);
  sailor(g, -0.72 * L / 2, -0.2, r.cTop, 1);
  sailor(g, 0.45 * L / 2, -0.5, deckAt(H, 0.45 * L / 2).y, 0);
  sailor(g, 0.62 * L / 2, 0.45, deckAt(H, 0.62 * L / 2).y, 3);
  for (const [u, v, col] of [[-0.1, 0.55, 0x9a7a52], [0.15, -0.5, 0xc9b48a]] as V3[]) bale(g, (u * L) / 2, v, deckAt(H, (u * L) / 2).y, col);
  const mesh = mover(k, g, 'merchant-cog'), way = new Way(MERCHANT, 8, 1.9);
  k.each((_dt, time) => {
    const t = timeOf(time), d = way.along(t + 5), [x, z] = way.at(d), yaw = way.headingAt(d);
    mesh.position.set(x, WL + 0.05 * Math.sin(t * 1.1 + 2), z);
    mesh.rotation.set(0.045 + 0.025 * Math.sin(t * 0.75), -yaw, 0.02 * Math.sin(t * 0.9), 'YZX');
  });
}

// ---------------------------------------------------------------------------
// Keeping what moves clear
// ---------------------------------------------------------------------------

/** The shores, as edges: the mainland's along the water, and every island's. The board's own edge is not a shore. */
const SHORES: [P2, P2][] = (() => {
  const out: [P2, P2][] = [], e = 0.5;
  const onEdge = (a: P2, c: P2): boolean =>
    (Math.abs(a[0] - c[0]) < 1e-6 && (Math.abs(a[0] - BOARD.x0) < e || Math.abs(a[0] - BOARD.x1) < e)) || (Math.abs(a[1] - c[1]) < 1e-6 && (Math.abs(a[1] - BOARD.z0) < e || Math.abs(a[1] - BOARD.z1) < e));
  for (let i = 0; i < WATER.length; i++) if (!onEdge(WATER[i], WATER[(i + 1) % WATER.length])) out.push([WATER[i], WATER[(i + 1) % WATER.length]]);
  for (const s of Object.values(ISLANDS)) for (let i = 0; i < s.length; i++) out.push([s[i], s[(i + 1) % s.length]]);
  return out;
})();
const toSeg = (x: number, z: number, a: P2, c: P2): number => {
  const vx = c[0] - a[0], vz = c[1] - a[1], l = vx * vx + vz * vz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l));
  return Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t);
};
const toEdges = (x: number, z: number, edges: [P2, P2][]): number => edges.reduce((d, [a, c]) => Math.min(d, toSeg(x, z, a, c)), Infinity);
const ring = (s: P2[]): [P2, P2][] => s.map((p, i): [P2, P2] => [p, s[(i + 1) % s.length]]);
/** Vhagar's rock as the plan has it now, as an outline. */
const rockRing = (): [P2, P2][] => {
  const V = VHAGAR_ROCK;
  return ring(Array.from({ length: 48 }, (_, i): P2 => [V.x + Math.cos((i / 48) * Math.PI * 2) * V.hx, V.z + Math.sin((i / 48) * Math.PI * 2) * V.hz]));
};
/** Points round and through a hull, `hl` either way along it and `hb` either way across. */
function hullPoints(x: number, z: number, yaw: number, hl: number, hb: number): P2[] {
  const out: P2[] = [], c = Math.cos(yaw), s = Math.sin(yaw);
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 2; j++) {
    const u = -hl + (2 * hl * i) / 6, v = -hb + hb * j;
    out.push([x + u * c - v * s, z + u * s + v * c]);
  }
  return out;
}
/** How far a place is from a ship that stands still. */
const toBody = (x: number, z: number, b: Body): number => {
  const dx = x - b.x, dz = z - b.z, c = Math.cos(b.yaw), s = Math.sin(b.yaw), u = Math.abs(dx * c + dz * s) - b.hl, v = Math.abs(-dx * s + dz * c) - b.hb;
  return Math.hypot(Math.max(0, u), Math.max(0, v));
};

/**
 * Goes round each moving ship's way, a unit at a time, and says in the
 * console where any part of her comes onto anything but open water, within 6
 * of a shore, within 16 of Vhagar's rock, within 8 of the tide's sands, under a
 * dragon at home, or within 4 of a ship that stands still; and how near each
 * comes. On the development server only.
 */
function checkWays(): void {
  const rock = rockRing(), rockOutline = rock.map(([p]) => p), sands = ring(SANDS);
  const toRock = (x: number, z: number): number => (inside(rockOutline, x, z) ? 0 : toEdges(x, z, rock));
  const ways: [string, Way, number, number][] = [['the galley on patrol', new Way(PATROL, 3, 2.1), 5.5, 1.25], ['the merchant cog', new Way(MERCHANT, 8, 1.9), 4.75, 1.6]];
  const lines: string[] = [];
  for (const [what, way, hl, hb] of ways) {
    const least = { shore: Infinity, rock: Infinity, sands: Infinity, ship: Infinity };
    const faults = new Set<string>();
    for (let d = 0; d < way.length; d += 1) {
      const [x, z] = way.at(d), yaw = way.headingAt(d), at = `(${x.toFixed(1)}, ${z.toFixed(1)})`;
      for (const [px, pz] of hullPoints(x, z, yaw, hl, hb)) {
        if (!isWater(px, pz)) faults.add(`off the water at ${at}`);
        const shore = toEdges(px, pz, SHORES), r = toRock(px, pz), s = inside(SANDS, px, pz) ? 0 : toEdges(px, pz, sands);
        least.shore = Math.min(least.shore, shore);
        least.rock = Math.min(least.rock, r);
        least.sands = Math.min(least.sands, s);
        for (const b of STILL) least.ship = Math.min(least.ship, toBody(px, pz, b));
        if (shore < 6) faults.add(`within 6 of a shore at ${at}`);
        if (r < 16) faults.add(`within 16 of Vhagar's rock at ${at}`);
        if (s < 8) faults.add(`within 8 of the tide's sands at ${at}`);
        if (underDragon(px, pz, 3)) faults.add(`under a dragon at home at ${at}`);
        if (STILL.some((b) => toBody(px, pz, b) < 4)) faults.add(`within 4 of a ship at anchor at ${at}`);
      }
    }
    if (faults.size) console.warn(`Blackwater Bay: ${what} goes ${[...faults].slice(0, 6).join('; ')}.`);
    lines.push(`${what} comes ${least.shore.toFixed(1)} from a shore, ${least.rock.toFixed(1)} from Vhagar's rock, ${least.sands.toFixed(1)} from the sands and ${least.ship.toFixed(1)} from a ship at anchor`);
  }
  for (const b of STILL) {
    const pts = hullPoints(b.x, b.z, b.yaw, b.hl, b.hb), at = `${b.what} at (${b.x.toFixed(1)}, ${b.z.toFixed(1)})`;
    if (pts.some(([x, z]) => !isWater(x, z))) console.warn(`Blackwater Bay: ${at} is not all on the water.`);
    if (pts.some(([x, z]) => toRock(x, z) < 16)) console.warn(`Blackwater Bay: ${at} is within 16 of Vhagar's rock.`);
    if (pts.some(([x, z]) => underDragon(x, z, 1))) console.warn(`Blackwater Bay: ${at} is under a dragon at home.`);
  }
  console.info(`Blackwater Bay, the ships: ${lines.join('; ')}.`);
}

// ---------------------------------------------------------------------------
// What this file hands over
// ---------------------------------------------------------------------------

export const MODELS: Record<string, Model> = {};
export const COVERS: string[] = [];
export const SIGNS: SignDef[] = [];

export function extras(k: Build): void {
  STILL.length = 0;
  fleet(k);
  quays(k);
  duskendale(k);
  spicetown(k);
  for (const b of FISHING) fishingBoat(k, frame(b.x, b.z, b.heading), b);
  ferry(k);
  patrol(k);
  merchant(k);
  if (import.meta.env.DEV) {
    checkWays();
    // for pictures: `blackwaterShips.hold(t)` stands what moves as it is at t seconds, and `hold(null)` lets it go
    (window as unknown as { blackwaterShips: object }).blackwaterShips = { hold: (t: number | null) => { held = t; } };
  }
}

export function heightAt(_x: number, _z: number): number {
  return 0;
}
