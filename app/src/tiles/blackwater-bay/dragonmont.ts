// The Dragonmont, the volcano Dragonstone is made of, as a mountain of lairs.
//
// Black and dark grey rock, steep and fissured, ash where it is level, and a
// ragged black rim at its top, warm by night, where Meraxes lies; hot vents
// that give off pale grey steam, and Grey Ghost's, high on the north-eastern
// flank, where a shy dragon laired. At the back of every lair's shelf a cave's
// mouth cut into the mountain's own rock: a ragged arch under an overhanging
// brow, blackened with soot round its edge, dark inside and faintly warm at
// night. Each shelf a broken ledge of the same rock, cracked, with a few loose
// stones on it, crumbling into scree where it is built out over the slope.
// Below Sheepstealer's shelf a live sheep penned in a fold of hurdles. And at
// the mountain's south-east foot the camp of the Sowing, where those who hope
// to win a dragon stand and look up at the lairs.
//
// The mountain's shape is the plan's: land.ts works out its heights as the
// field MOUNT, and this file draws it, level on every lair's shelf right to
// the shelf's edges, with a face of bedded rock wherever a shelf is cut into
// the slope and scree wherever it is built out over it. Everything at a lair
// is worked out from HOMES, LENGTH, LAIR, LAIR_IDS and lairAt in plan.ts as
// the tile is built, so the lairs may move and all of it follows them.
// Between the lairs nothing stands more than about 1 above the slope within
// 16 of any of them, for that ground is all under a wing somewhere.
//
// No smoke stands between the view and a dragon: every vent keeps 15 from
// every dragon's home on the mountain, and its steam starts thin and widens
// only as it rises; the summit does not smoke, for Meraxes lies over it; and
// only the smoking caverns breathe a thin wisp, from the rock above and
// behind the mouth, to one side of it.
//
// From the books' plain descriptions, as the research note gives them (items
// 22 to 27 and 37). Nothing is taken from the television series.

import * as THREE from 'three';
import { Smoke } from '../../engine/effects';
import { interior, rng, type GeoBuilder, type QuadOpts, type V3 } from '../../engine/geo';
import { area, flat } from '../../engine/ground';
import { lathe } from '../../engine/parts';
import { face3, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import { heightOn, type Field } from '../../engine/terrain';
import type { Build } from '../../engine/tile';
import { MOUNT, landAt } from './land';
import { DARK, TIMBER, TIMBER_DARK, banner, fire } from './look';
import type { Model } from './models';
import { DRAGONMONT, HOMES, LAIR, LAIR_IDS, LENGTH, ROADS, SOWING, TURNS, mountAt, onMount, type Home, type P2 } from './plan';
import { isLand, open } from './space';

// ---------------------------------------------------------------------------
// Colours of the mountain's own
// ---------------------------------------------------------------------------

/** The mountain's rock: black where it is steep, dark grey where it is less so, ash where it is level, near-black at the crater rim and in the fissures. */
const ROCK = {
  black: 0x262427, char: 0x2f2c2f, dark: 0x383537, grey: 0x434042, slate: 0x4e4a4a,
  ash: 0x6c6761, ashDark: 0x5f5a55, ashPale: 0x77716a,
  crack: 0x151316, glass: 0x1c1a1f, glassHi: 0x28262c,
  rim: 0x1d1b1d, rimHi: 0x262325, scorch: 0x232123, sulphur: 0x5a5749,
};
/** Beds of rock in the faces where a shelf is cut into the slope or built out over it. */
const BEDS = [0x2e2c2e, 0x393536, 0x262426, 0x413c3a, 0x333032];
/** A lair's shelf: ash, sooted before its cave, and broken where it crumbles at its edge. */
const SHELF = 0x6a645d, SHELF_ALT = 0x67615a, SOOT = 0x403c39, BROKEN = [0x4f4a46, 0x47423f, 0x56504b];
/** The scree a shelf crumbles into where it is built out over the slope: broken rock of the mountain's own, a little greyer. */
const SCREE = [0x353133, 0x3d393a, 0x2f2c2e, 0x45403e, 0x292628, 0x3a3637];
/** The rock round a cave's mouth: blackened with soot at its edge, scorched above it, and the mountain's own beyond. */
const SOOT_RIM = 0x1a1718, BROW = [0x232123, 0x2b282a, 0x1f1d1f, 0x2f2c2f], HOOD = [0x2f2c2f, 0x383537, 0x262427, 0x343133];
/** The dark inside a cave, which is faintly warm by night, and its floor. */
const INSIDE = 0x16110f, INSIDE_WARM = 0x22100a, FLOOR_IN = 0x1d1816;
/** Canvas, hide and wattle. */
const CANVAS = 0xd9ccaa, CANVAS_RED = 0x9c5a44, CANVAS_DUN = 0xb9a27a, HIDE = 0x7a5e44, WATTLE = 0x9b8257, WATTLE_TOP = 0x8a7249;
const EARTH = 0x6b6052, FLEECE = 0xefebe1, SHEEP_DARK = 0x2b2626, SKIN = 0xd9b08c;

/** How near a lair anything on the slope may stand more than this high, and how high anything may stand elsewhere. */
const WING = 16, LOW = 1.0, TALL = 1.7;

// ---------------------------------------------------------------------------
// The lairs, as the plan has them when the tile is built
// ---------------------------------------------------------------------------

/**
 * A lair, in its dragon's own frame: `u` ahead of its chest, `v` to its right.
 * Its shelf runs from `B` behind the chest to `F` ahead and `half` to each
 * side; its cave from the shelf's back to `deep` behind, `caveHalf` to each
 * side. The mouth this file cuts at the shelf's back is `H` high at least,
 * `wt` to each side near its head and `wb` at its foot, where the tips of the
 * folded wings pass in; its dark goes `D` in; and the ground cut level for it
 * behind the shelf reaches `Wm` to each side, a little wider than the opening.
 */
interface Lair {
  id: string; h: Home; L: number; y0: number;
  fx: number; fz: number; sx: number; sz: number;
  B: number; F: number; half: number; deep: number; caveHalf: number;
  H: number; wt: number; wb: number; D: number; Wm: number;
}

function lairOf(id: string): Lair {
  const h = HOMES[id], L = LENGTH[id], a = (h.facing * Math.PI) / 180, fx = Math.cos(a), fz = Math.sin(a);
  // about 2 × caveHalf × L + 1 wide near its head; a little wider at its foot, where the tips of the folded wings pass in
  const wt = LAIR.caveHalf * L + 0.5, wb = Math.max(wt, 0.128 * L);
  return {
    id, h, L, y0: h.y, fx, fz, sx: -fz, sz: fx,
    B: LAIR.back * L, F: LAIR.front * L, half: LAIR.half * L, deep: LAIR.cave * L, caveHalf: LAIR.caveHalf * L,
    H: 0.22 * L, wt, wb, D: 1.15 + 0.012 * L, Wm: 1.12 * wb + 0.3,
  };
}

/** Every lair on the mountain, in the order lairAt goes through them, so that where two overlap the same one wins here as there. */
const lairsNow = (): Lair[] => Object.keys(HOMES).filter((id) => LAIR_IDS[id] && LENGTH[id] !== undefined).map(lairOf);

const at2 = (l: Lair, u: number, v: number): P2 => [l.h.x + l.fx * u + l.sx * v, l.h.z + l.fz * u + l.sz * v];
const at3 = (l: Lair, u: number, v: number, y: number): V3 => [l.h.x + l.fx * u + l.sx * v, y, l.h.z + l.fz * u + l.sz * v];
const local = (l: Lair, x: number, z: number): [number, number] => {
  const dx = x - l.h.x, dz = z - l.h.z;
  return [dx * l.fx + dz * l.fz, dx * l.sx + dz * l.sz];
};
/** How far a place is from a lair's shelf. */
const fromShelf = (l: Lair, x: number, z: number): number => {
  const [u, v] = local(l, x, z);
  return Math.hypot(Math.max(-l.B - u, 0, u - l.F), Math.max(Math.abs(v) - l.half, 0));
};
/** How high a thing on the slope may stand there: low within a wing's reach of any lair. */
const capAt = (lairs: Lair[], x: number, z: number): number => (lairs.some((l) => fromShelf(l, x, z) < WING) ? LOW : TALL);

/**
 * What each lair's rock and scree take of the slope, as a box in its frame:
 * the rock over its mouth and the scree below its shelf's edges. Set as each
 * is built, which is before anything else is placed on the slope.
 */
const FOOT: { l: Lair; u0: number; u1: number; v: number }[] = [];

/**
 * Whether a place on the mountain's surface, or any place `room` round it, is
 * a lair's: its shelf and the scree below its edges, the ground its mouth is
 * cut in and the rock over it, and the slope before it as far as its dragon's
 * head hangs. The dragon's body and tail lie in the rock, under the slope
 * behind the mouth, which is free unless the rock over the mouth is carried
 * back over it.
 */
const atLair = (lairs: Lair[], x: number, z: number, room: number): boolean =>
  lairs.some((l) => {
    const [u, v] = local(l, x, z);
    return u > -l.B - l.D - 1.6 - room && u < Math.max(l.F, 0.34 * l.L) + room && Math.abs(v) < Math.max(l.half, l.Wm + 0.3) + room;
  }) ||
  FOOT.some((f) => {
    const [u, v] = local(f.l, x, z);
    return u > f.u0 - room && u < f.u1 + room && Math.abs(v) < f.v + room;
  });

/** Whether a place is under a dragon that does not lie in a lair, as space.ts's underDragon has it: from its head to its tail, as wide as its braced wings. */
const underOthers = (x: number, z: number, room: number): boolean => Object.entries(HOMES).some(([id, h]) => {
  if (LAIR_IDS[id] || LENGTH[id] === undefined) return false;
  const L = LENGTH[id], a = (h.facing * Math.PI) / 180, dx = x - h.x, dz = z - h.z;
  const along = dx * Math.cos(a) + dz * Math.sin(a), side = Math.abs(-dx * Math.sin(a) + dz * Math.cos(a));
  return along < 0.34 * L + room && along > -0.72 * L - room && side < 0.14 * L + room;
});

/** The dragons that lie on the mountain as it is, not in a lair: Meraxes, on the summit. */
const perchesOn = (): { id: string; h: Home; L: number }[] =>
  Object.entries(HOMES).filter(([id, h]) => !LAIR_IDS[id] && LENGTH[id] !== undefined && mountAt(h.x, h.z) > 0).map(([id, h]) => ({ id, h, L: LENGTH[id] }));

/** Whether a place is under the body of a dragon that lies on the mountain as it is: within the width of its body of its line, from its head to the tip of its tail. */
const underPerch = (x: number, z: number, room: number): boolean => perchesOn().some(({ h, L }) => {
  const a = (h.facing * Math.PI) / 180, dx = x - h.x, dz = z - h.z;
  const along = dx * Math.cos(a) + dz * Math.sin(a), side = Math.abs(-dx * Math.sin(a) + dz * Math.cos(a));
  return along < 0.34 * L + room && along > -0.72 * L - room && side < 0.07 * L + room;
});

/** Every dragon at home on the mountain, in a lair or on the slope as it is: where it is, which way it faces, and how long it is. Set when the tile is built. */
let dragonsHere: { x: number; z: number; a: number; L: number }[] = [];
/** How far a place is from the nearest dragon's home on the mountain, on the ground. */
const fromDragons = (x: number, z: number): number => dragonsHere.reduce((m, d) => Math.min(m, Math.hypot(x - d.x, z - d.z)), Infinity);
/** Whether a place is within `room` of where a dragon at home on the mountain lies, from its head to the tip of its tail and as wide as its braced wings: where its body or tail may lie in the open, if its cave leaves the rock. */
const byDragon = (x: number, z: number, room: number): boolean => dragonsHere.some((d) => {
  const dx = x - d.x, dz = z - d.z, along = dx * Math.cos(d.a) + dz * Math.sin(d.a), side = Math.abs(-dx * Math.sin(d.a) + dz * Math.cos(d.a));
  return along < 0.34 * d.L + room && along > -0.72 * d.L - room && side < 0.14 * d.L + room;
});

// ---------------------------------------------------------------------------
// The ground each lair takes, as regions of the mountain's surface
// ---------------------------------------------------------------------------
//
// A region is a rectangle in a lair's frame, as half-planes: the ground its
// mouth is built on (drawn level, as the floor of the mouth, and built over),
// its shelf (drawn level), and its cave (the slope over it, drawn as it is,
// but claimed, so that a later lair's shelf does not take it, as in lairAt).

interface Half { nx: number; nz: number; c: number }
/** A region, and its corners, where a face cut round it is not broken back, so that the faces that meet there agree. */
interface Region { kind: 'mouth' | 'shelf' | 'cave'; lair: Lair; y: number; halves: Half[]; box: [number, number, number, number]; corners: P2[] }

function rect(l: Lair, u0: number, u1: number, v0: number, v1: number, kind: Region['kind'], y: number): Region {
  const fc = l.fx * l.h.x + l.fz * l.h.z, sc = l.sx * l.h.x + l.sz * l.h.z;
  const halves: Half[] = [
    { nx: l.fx, nz: l.fz, c: fc + u1 }, { nx: -l.fx, nz: -l.fz, c: -fc - u0 },
    { nx: l.sx, nz: l.sz, c: sc + v1 }, { nx: -l.sx, nz: -l.sz, c: -sc - v0 },
  ];
  const cs = [at2(l, u0, v0), at2(l, u1, v0), at2(l, u1, v1), at2(l, u0, v1)];
  const xs = cs.map((p) => p[0]), zs = cs.map((p) => p[1]);
  return { kind, lair: l, y, halves, box: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)], corners: cs };
}

function regionsOf(lairs: Lair[]): Region[] {
  const out: Region[] = [];
  // the mouths first: their ground is this file's own, whatever lies under it
  for (const l of lairs) out.push(rect(l, -l.B - l.D, -l.B, -l.Wm, l.Wm, 'mouth', l.y0 + 0.01));
  for (const l of lairs) {
    const shelf = rect(l, -l.B, l.F, -l.half, l.half, 'shelf', l.y0 + 0.01);
    // its back face ends where the mouth's ground begins
    shelf.corners.push(at2(l, -l.B, -l.Wm), at2(l, -l.B, l.Wm));
    out.push(shelf);
    out.push(rect(l, -l.deep, -l.B, -l.caveHalf, l.caveHalf, 'cave', l.y0));
  }
  // a cave is drawn as the slope over it, so it matters only where it keeps a later lair's shelf off the ground it takes
  const overlaps = (a: Region, c: Region): boolean => a.box[0] < c.box[2] && a.box[2] > c.box[0] && a.box[1] < c.box[3] && a.box[3] > c.box[1];
  return out.filter((g, i) => g.kind !== 'cave' || out.slice(i + 1).some((later) => later.kind === 'shelf' && overlaps(g, later)));
}

const inBox = (r: Region, x: number, z: number): boolean => x >= r.box[0] - 1e-6 && x <= r.box[2] + 1e-6 && z >= r.box[1] - 1e-6 && z <= r.box[3] + 1e-6;
const inRegion = (r: Region, x: number, z: number): boolean => inBox(r, x, z) && r.halves.every((h) => h.nx * x + h.nz * z <= h.c + 1e-9);
/** The region a place is in, the first in order, or null. */
const claimOf = (regions: Region[], x: number, z: number): Region | null => regions.find((r) => inRegion(r, x, z)) ?? null;

/**
 * How high the ground is at a place as this file draws it: a shelf or a
 * mouth's floor where a lair takes it, the slope itself over a cave (where
 * landAt gives the cave's floor, deep inside), and landAt off the mountain.
 * Set when the tile is built.
 */
let surface: (x: number, z: number) => number = landAt;
function surfaceOf(f: Field, regions: Region[]): (x: number, z: number) => number {
  return (x, z) => {
    const g = claimOf(regions, x, z);
    if (g && g.kind !== 'cave') return g.y;
    if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1) {
      const h = heightOn(f, x, z);
      if (h > 0.02) return h;
    }
    return landAt(x, z);
  };
}

// ---------------------------------------------------------------------------
// Cutting a flat shape by a region
// ---------------------------------------------------------------------------

/** A shape cut by a half-plane: the part inside it, and the part outside. */
function cutBy(poly: P2[], h: Half): [P2[], P2[]] {
  const ins: P2[] = [], outs: P2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], c = poly[(i + 1) % poly.length];
    const da = h.nx * a[0] + h.nz * a[1] - h.c, dc = h.nx * c[0] + h.nz * c[1] - h.c;
    if (da <= 0) ins.push(a);
    if (da >= 0) outs.push(a);
    if ((da < 0 && dc > 0) || (da > 0 && dc < 0)) {
      const t = da / (da - dc), p: P2 = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t];
      ins.push(p);
      outs.push(p);
    }
  }
  return [ins, outs];
}

const areaOf = (p: P2[]): number => {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], c = p[(i + 1) % p.length];
    s += a[0] * c[1] - c[0] * a[1];
  }
  return Math.abs(s) / 2;
};

/** A shape that bulges outwards everywhere, split into the part inside a region and the parts outside it, each of which bulges outwards too. */
function splitBy(poly: P2[], r: Region): { inside: P2[] | null; outside: P2[][] } {
  const outside: P2[][] = [];
  let rest = poly;
  for (const h of r.halves) {
    const [ins, outs] = cutBy(rest, h);
    if (outs.length >= 3 && areaOf(outs) > 1e-7) outside.push(outs);
    rest = ins;
    // not in the region at all: left whole, not cut along the lines of a region it misses
    if (rest.length < 3 || areaOf(rest) <= 1e-7) return { inside: null, outside: [poly] };
  }
  return { inside: rest, outside };
}

// ---------------------------------------------------------------------------
// The colour of the rock
// ---------------------------------------------------------------------------

/** Fissures down the flanks, and old flows of black glass: each a line out from the summit on a bearing, from one share of the way down to another. */
const FISSURES = [-158, -121, -86, -52, -17, 14, 41, 67, 101, 133, 171].map((deg, i) => ({
  a: (deg * Math.PI) / 180, d0: 0.05 + 0.03 * (i % 3), d1: 0.4 + 0.08 * ((i * 7) % 4), w: 0.66, wig: 0.06 + 0.03 * (i % 2), k: i * 1.7,
}));
const FLOWS = [-66, 27, 118, 156].map((deg, i) => ({ a: (deg * Math.PI) / 180, d0: 0.1, d1: 0.62 + 0.06 * i, k: i * 2.3 }));

/** Where a place is round the summit: how far down the mountain, as a share of its reach that way; on which bearing; and how many units a share is on that bearing. */
function polar(x: number, z: number): { d: number; a: number; R: number } {
  const M = DRAGONMONT, dx = x - M.summit[0], dz = z - M.summit[1];
  const rx = dx < 0 ? M.reach.w : M.reach.e, rz = dz < 0 ? M.reach.n : M.reach.s, nx = dx / rx, nz = dz / rz, d = Math.hypot(nx, nz);
  return { d, a: Math.atan2(nz, nx), R: d > 1e-6 ? Math.hypot(dx, dz) / d : (rx + rz) / 2 };
}
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
const noise = (x: number, z: number): number => Math.sin(x * 1.37 + z * 0.61) + 0.7 * Math.sin(z * 2.03 - x * 1.21 + 1.3) + 0.45 * Math.sin(x * 3.7 + z * 2.9 + 0.4);

interface Look { top: number; lairs: Lair[]; vents: { x: number; z: number; r: number }[]; perches: { x: number; z: number; r: number }[] }

/** A facet of the slope: its colour, by how high and how steep it is and where. */
function rockColor(y: number, level: number, x: number, z: number, o: Look): number {
  const n = noise(x, z);
  if (y > o.top - 4) return n > 0.3 ? ROCK.rimHi : ROCK.rim;
  // a little scorched under a dragon that lies on the slope
  for (const p of o.perches) if (Math.hypot(x - p.x, z - p.z) < p.r) return n > 0.35 ? ROCK.char : ROCK.scorch;
  for (const v of o.vents) if (Math.hypot(x - v.x, z - v.z) < v.r) return n > 0.3 ? ROCK.sulphur : ROCK.grey;
  const p = polar(x, z);
  for (const f of FISSURES) {
    if (p.d < f.d0 || p.d > f.d1) continue;
    if (Math.abs(wrap(p.a - f.a - f.wig * Math.sin(p.d * 13 + f.k))) * p.d * p.R < f.w) return ROCK.crack;
  }
  for (const g of FLOWS) {
    if (p.d < g.d0 || p.d > g.d1) continue;
    const w = 0.9 + 1.6 * p.d;
    if (Math.abs(wrap(p.a - g.a - 0.05 * Math.sin(p.d * 9 + g.k))) * p.d * p.R < w) return level > 0.62 ? ROCK.glassHi : ROCK.glass;
  }
  // round each lair the rock is scorched, and up the slope above its mouth
  for (const l of o.lairs) {
    const [u, v] = local(l, x, z);
    if (u > -l.B - l.D - 3 && u < l.F + 2 && Math.abs(v) < l.half + 2.2) return n > 0.4 ? ROCK.char : ROCK.scorch;
    if (u <= -l.B && u > -l.B - l.D - 8 && Math.abs(v) < l.wb + 2.6 + 0.25 * (u + l.B)) return n > 0.1 ? ROCK.scorch : ROCK.char;
  }
  if (level > 0.87) return n > 0.5 ? ROCK.ashPale : n > -0.6 ? ROCK.ash : ROCK.ashDark;
  if (level > 0.72) return n > 0.2 ? ROCK.slate : ROCK.grey;
  if (level > 0.5) return n > -0.3 ? ROCK.dark : ROCK.char;
  return n > 0.6 ? ROCK.dark : n > -0.5 ? ROCK.char : ROCK.black;
}

const bedColor = (y: number, x: number, z: number): number => BEDS[(((Math.floor((y + 0.6 * Math.sin(x * 0.37 + z * 0.23)) / 2.3)) % BEDS.length) + BEDS.length) % BEDS.length];

// ---------------------------------------------------------------------------
// The mountain's surface
// ---------------------------------------------------------------------------

/** Whether both ends of a line lie on the line through p and q. */
const onLine = (a: P2, c: P2, p: P2, q: P2): boolean => {
  const ex = q[0] - p[0], ez = q[1] - p[1], l = Math.hypot(ex, ez) || 1;
  return Math.abs((a[0] - p[0]) * ez - (a[1] - p[1]) * ex) / l < 1e-6 && Math.abs((c[0] - p[0]) * ez - (c[1] - p[1]) * ex) / l < 1e-6;
};
const mix2 = (a: P2, c: P2, t: number): P2 => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t];

/** A facet of three corners, lit as it lies: its normal worked out from them and turned towards `out`. Nothing if it has no area. */
function facet3(b: GeoBuilder, p: V3, q: V3, r: V3, out: V3, color: number, opts?: QuadOpts): void {
  const ax = q[0] - p[0], ay = q[1] - p[1], az = q[2] - p[2], cx = r[0] - p[0], cy = r[1] - p[1], cz = r[2] - p[2];
  let nx = ay * cz - az * cy, ny = az * cx - ax * cz, nz = ax * cy - ay * cx;
  const l = Math.hypot(nx, ny, nz);
  if (l < 1e-7) return;
  if (nx * out[0] + ny * out[1] + nz * out[2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
  face3(b, p, q, r, [nx / l, ny / l, nz / l], color, opts);
}
/** A facet of four corners, round in order, as two of three, each lit as it lies. */
function facet4(b: GeoBuilder, p: V3, q: V3, r: V3, s: V3, out: V3, color: number, opts?: QuadOpts): void {
  facet3(b, p, q, r, out, color, opts);
  facet3(b, p, r, s, out, color, opts);
}

/** How far a cut face bulges out halfway up it at a place along its foot, and how far that middle is moved up or down: by the place alone, so that two pieces of a face that meet there agree. */
const dentAt = (x: number, z: number): [number, number] => [
  0.06 + 0.12 * (1 + Math.sin(x * 2.31 + z * 1.17)) + 0.04 * Math.sin(x * 5.3 - z * 4.1),
  0.25 * Math.sin(x * 1.13 - z * 2.71 + 0.8),
];

/**
 * An upright face of rock along a line on the ground, between a level region
 * at `y` on one side and ground `h0` to `h1` high on the other, facing
 * whichever side is lower. `n` points out of the level region. Where the
 * ground is the higher, the face is a cut through bedded rock, and if
 * `corners` are given it bulges out a little halfway up, more in some places
 * than others and not at those corners, so that it is rough rock and not a
 * wall. (Out and not in, so that no part of it faces downwards where it can
 * be seen from above.)
 */
function face(b: GeoBuilder, p0: P2, p1: P2, y: number, h0: number, h1: number, n: P2, corners: P2[] | null = null): void {
  const d0 = h0 - y, d1 = h1 - y, e = 4e-3;
  if (Math.abs(d0) < e && Math.abs(d1) < e) return;
  const part = (a: P2, c: P2, ba: number, bc: number, ta: number, tc: number, nn: V3, cut: boolean): void => {
    if (ta - ba < e && tc - bc < e) return;
    const A0: V3 = [a[0], ba, a[1]], C0: V3 = [c[0], bc, c[1]], C1: V3 = [c[0], tc, c[1]], A1: V3 = [a[0], ta, a[1]];
    if (cut && corners && ta - ba > 0.5 && tc - bc > 0.5) {
      const mid = (p: P2, lo: number, hi: number): V3 => {
        const [dent, j] = dentAt(p[0], p[1]), d = Math.min(dent, 0.3 * (hi - lo));
        const k = Math.min(1, corners.reduce((m, q) => Math.min(m, Math.hypot(p[0] - q[0], p[1] - q[1])), Infinity) / 1.2);
        return [p[0] - n[0] * d * k, (lo + hi) / 2 + j * k * Math.min(1, (hi - lo) / 3), p[1] - n[1] * d * k];
      };
      const Am = mid(a, ba, ta), Cm = mid(c, bc, tc);
      facet4(b, A0, C0, Cm, Am, nn, bedColor((ba + bc + Am[1] + Cm[1]) / 4, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2));
      facet4(b, Am, Cm, C1, A1, nn, bedColor((Am[1] + Cm[1] + ta + tc) / 4, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2));
      return;
    }
    const color = bedColor((ba + ta + bc + tc) / 4, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2);
    if (ta - ba < e) face3(b, A0, C0, C1, nn, color);
    else if (tc - bc < e) face3(b, A0, C0, A1, nn, color);
    else b.quad(A0, C0, C1, A1, nn, color);
  };
  const up: V3 = [-n[0], 0, -n[1]], down: V3 = [n[0], 0, n[1]];
  if (d0 >= -e && d1 >= -e) return part(p0, p1, y, y, Math.max(h0, y), Math.max(h1, y), up, true);
  if (d0 <= e && d1 <= e) return part(p0, p1, Math.min(h0, y), Math.min(h1, y), y, y, down, false);
  const t = d0 / (d0 - d1), m = mix2(p0, p1, t);
  if (d0 > 0) {
    part(p0, m, y, y, h0, y, up, true);
    part(m, p1, y, h1, y, y, down, false);
  } else {
    part(p0, m, h0, y, y, y, down, false);
    part(m, p1, y, y, y, h1, up, true);
  }
}

/**
 * Draws the mountain from its field: every facet as land.ts has it, but cut
 * where a lair's ground is. A shelf is drawn level right to its edges, and the
 * ground of a mouth level as its floor; wherever either meets the slope, or a
 * lower shelf, an upright face of rock is drawn between them. Over a cave the
 * slope is drawn as it is.
 */
function drawMountain(b: GeoBuilder, f: Field, regions: Region[], o: Look): void {
  const W = f.nx + 1, X = (i: number): number => f.x0 + ((f.x1 - f.x0) * i) / f.nx, Z = (j: number): number => f.z0 + ((f.z1 - f.z0) * j) / f.nz;
  const at = (i: number, j: number): V3 => [X(i), f.y[j * W + i], Z(j)];

  const facet = (p: V3, q: V3, r: V3): void => {
    const low = p[1] < 0.03 && q[1] < 0.03 && r[1] < 0.03;
    const bx0 = Math.min(p[0], q[0], r[0]), bx1 = Math.max(p[0], q[0], r[0]), bz0 = Math.min(p[2], q[2], r[2]), bz1 = Math.max(p[2], q[2], r[2]);
    const near = regions.filter((g) => g.box[0] < bx1 && g.box[2] > bx0 && g.box[1] < bz1 && g.box[3] > bz0);
    // its slope, facing the sky, and its colour, which the whole facet keeps however it is cut
    const ax = q[0] - p[0], ay = q[1] - p[1], az = q[2] - p[2], cx = r[0] - p[0], cy = r[1] - p[1], cz = r[2] - p[2];
    let nx = ay * cz - az * cy, ny = az * cx - ax * cz, nz = ax * cy - ay * cx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const n: V3 = [nx / nl, ny / nl, nz / nl];
    const mx = (p[0] + q[0] + r[0]) / 3, mz = (p[2] + q[2] + r[2]) / 3;
    const color = rockColor((p[1] + q[1] + r[1]) / 3, n[1], mx, mz, o), opts: QuadOpts = {};
    if (near.length === 0) {
      if (!low) face3(b, p, q, r, n, color, opts);
      return;
    }
    const plane = (x: number, z: number): number => p[1] - (n[0] * (x - p[0]) + n[2] * (z - p[2])) / n[1];
    const sloped = (poly: P2[]): void => {
      const pts = poly.map((v): V3 => [v[0], plane(v[0], v[1]), v[1]]);
      if (pts.every((v) => v[1] < 0.03)) return;
      for (let i = 1; i + 1 < pts.length; i++) face3(b, pts[0], pts[i], pts[i + 1], n, color, opts);
    };
    // each region in turn takes what is left of the facet inside it
    let left: P2[][] = [[[p[0], p[2]], [q[0], q[2]], [r[0], r[2]]]];
    const taken: [P2[], Region][] = [];
    for (const g of near) {
      const next: P2[][] = [];
      for (const poly of left) {
        const s = splitBy(poly, g);
        if (s.inside) taken.push([s.inside, g]);
        next.push(...s.outside);
      }
      left = next;
      if (left.length === 0) break;
    }
    for (const poly of left) sloped(poly);
    const edges: [P2, P2][] = [[[p[0], p[2]], [q[0], q[2]]], [[q[0], q[2]], [r[0], r[2]]], [[r[0], r[2]], [p[0], p[2]]]];
    for (const [poly, g] of taken) {
      if (g.kind === 'cave') {
        sloped(poly);
        continue;
      }
      level(poly, g);
      // its edges inside the facet are where it meets something else
      const px = poly.reduce((s, v) => s + v[0], 0) / poly.length, pz = poly.reduce((s, v) => s + v[1], 0) / poly.length;
      for (let i = 0; i < poly.length; i++) {
        const A = poly[i], C = poly[(i + 1) % poly.length];
        if (Math.hypot(C[0] - A[0], C[1] - A[1]) < 1e-5 || edges.some(([e0, e1]) => onLine(A, C, e0, e1))) continue;
        let ex = C[1] - A[1], ez = -(C[0] - A[0]);
        const el = Math.hypot(ex, ez);
        ex /= el;
        ez /= el;
        if (ex * (px - (A[0] + C[0]) / 2) + ez * (pz - (A[1] + C[1]) / 2) > 0) { ex = -ex; ez = -ez; }
        // where what lies beyond it changes, along it
        const ts = [0, 1];
        for (const q2 of near) {
          for (const h of q2.halves) {
            const da = h.nx * A[0] + h.nz * A[1] - h.c, dc = h.nx * C[0] + h.nz * C[1] - h.c;
            if (!((da < -1e-7 && dc > 1e-7) || (da > 1e-7 && dc < -1e-7))) continue;
            // only where it crosses the region's own edge, not the line of it beyond the region
            const t = da / (da - dc), qx = A[0] + (C[0] - A[0]) * t, qz = A[1] + (C[1] - A[1]) * t;
            if (q2.halves.every((o) => o === h || o.nx * qx + o.nz * qz <= o.c + 1e-6)) ts.push(t);
          }
        }
        ts.sort((s1, s2) => s1 - s2);
        for (let k = 0; k + 1 < ts.length; k++) {
          if (ts[k + 1] - ts[k] < 1e-6) continue;
          const P0 = mix2(A, C, ts[k]), P1 = mix2(A, C, ts[k + 1]), M = mix2(A, C, (ts[k] + ts[k + 1]) / 2);
          const beyond = claimOf(near, M[0] + ex * 2e-4, M[1] + ez * 2e-4);
          if (beyond === g) continue;
          if (beyond && beyond.kind !== 'cave') {
            // a lower shelf or floor: the higher of the two draws the face between them
            if (g.y > beyond.y + 1e-3) face(b, P0, P1, g.y, beyond.y, beyond.y, [ex, ez]);
            continue;
          }
          // a shelf's own faces are rough rock; the faces round a mouth's ground are hidden under the rock over it
          face(b, P0, P1, g.y, plane(P0[0], P0[1]), plane(P1[0], P1[1]), [ex, ez], g.kind === 'shelf' ? g.corners : null);
        }
      }
    }
  };

  const level = (poly: P2[], g: Region): void => {
    // a shelf is ash, all of one colour or nearly, and the floor of a mouth is dark
    const color = g.kind === 'shelf' ? (g.lair.id.length % 2 ? SHELF : SHELF_ALT) : FLOOR_IN, opts: QuadOpts = g.kind === 'shelf' ? {} : { win: interior(0.5) };
    for (let i = 1; i + 1 < poly.length; i++) b.up([poly[0][0], g.y, poly[0][1]], [poly[i][0], g.y, poly[i][1]], [poly[i + 1][0], g.y, poly[i + 1][1]], color, opts);
  };

  for (let j = 0; j < f.nz; j++) {
    for (let i = 0; i < f.nx; i++) {
      // each square is cut from its north-west corner to its south-east, as heightOn reads it
      const p = at(i, j), q = at(i + 1, j), r = at(i + 1, j + 1), u = at(i, j + 1);
      facet(p, q, r);
      facet(p, r, u);
    }
  }
}

// ---------------------------------------------------------------------------
// Small solid shapes
// ---------------------------------------------------------------------------

/** A closed block from eight corners: four round its foot and four round its top, in the same order round. */
function block(b: GeoBuilder, c: V3[], color: number, top = color, bottom: number | false = color): void {
  const m: V3 = [0, 0, 0];
  for (const v of c) { m[0] += v[0] / 8; m[1] += v[1] / 8; m[2] += v[2] / 8; }
  const faces: [number, number, number, number, number | false][] = [
    [0, 1, 2, 3, bottom], [4, 5, 6, 7, top], [0, 1, 5, 4, color], [1, 2, 6, 5, color], [2, 3, 7, 6, color], [3, 0, 4, 7, color],
  ];
  for (const [i, j, p, q, col] of faces) {
    if (col === false) continue;
    const A = c[i], Bv = c[j], Q = c[q], P = c[p];
    // the face's normal, from its two diagonals, turned away from the middle
    const d1 = [P[0] - A[0], P[1] - A[1], P[2] - A[2]], d2 = [Q[0] - Bv[0], Q[1] - Bv[1], Q[2] - Bv[2]];
    let n: V3 = [d1[1] * d2[2] - d1[2] * d2[1], d1[2] * d2[0] - d1[0] * d2[2], d1[0] * d2[1] - d1[1] * d2[0]];
    const l = Math.hypot(...n) || 1;
    n = [n[0] / l, n[1] / l, n[2] / l];
    const fm = [(A[0] + Bv[0] + P[0] + Q[0]) / 4 - m[0], (A[1] + Bv[1] + P[1] + Q[1]) / 4 - m[1], (A[2] + Bv[2] + P[2] + Q[2]) / 4 - m[2]];
    if (n[0] * fm[0] + n[1] * fm[1] + n[2] * fm[2] < 0) n = [-n[0], -n[1], -n[2]];
    b.quad(A, Bv, P, Q, n, col);
  }
}

/**
 * A rough rock standing on the slope: its foot sunk below the ground all
 * round, its top `h` over the ground at its middle, narrower than its foot
 * and a little askew. `rx` and `rz` are half its size along and across `yaw`.
 * `on` is how high what it stands on is: the ground as drawn, unless told.
 */
function rock(b: GeoBuilder, x: number, z: number, rx: number, rz: number, h: number, yaw: number, r: () => number, color: number, top = color, on: (x: number, z: number) => number = surface): void {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const foot: P2[] = [[-rx, -rz], [rx, -rz], [rx, rz], [-rx, rz]].map(([a, d]): P2 => [x + a * c - d * s + (r() - 0.5) * rx * 0.3, z + a * s + d * c + (r() - 0.5) * rz * 0.3]);
  const g = on(x, z);
  let lowest = g;
  for (const [fx, fz] of foot) lowest = Math.min(lowest, on(fx, fz));
  const pull = 0.45 + r() * 0.25, lean: P2 = [(r() - 0.5) * rx * 0.4, (r() - 0.5) * rz * 0.4];
  const corners: V3[] = [
    ...foot.map(([fx, fz]): V3 => [fx, lowest - 0.35, fz]),
    ...foot.map(([fx, fz], i): V3 => [x + (fx - x) * pull + lean[0], g + h * (0.82 + 0.18 * ((i * 7 + 3) % 4) / 3), z + (fz - z) * pull + lean[1]]),
  ];
  block(b, corners, color, top, false);
}

/**
 * A fin of rock standing on edge along `yaw`, as a bed of harder rock stands
 * out of a slope: its foot sunk below the ground all along, its top ragged,
 * `h` over the ground at its higher end and thinner than its foot.
 */
function fin(b: GeoBuilder, x: number, z: number, len: number, thick: number, h: number, yaw: number, r: () => number, color: number, top = color): void {
  const c = Math.cos(yaw), s = Math.sin(yaw), ends: P2[] = [[x - (c * len) / 2, z - (s * len) / 2], [x + (c * len) / 2, z + (s * len) / 2]];
  const w = thick / 2, ox = -s * w, oz = c * w;
  const foot = Math.min(...ends.flatMap(([ex, ez]) => [surface(ex + ox, ez + oz), surface(ex - ox, ez - oz)])) - 0.4;
  const tops = ends.map(([ex, ez]) => surface(ex, ez) + h * (0.55 + 0.45 * r()));
  const lean = (r() - 0.5) * w;
  block(b, [
    [ends[0][0] - ox, foot, ends[0][1] - oz], [ends[1][0] - ox, foot, ends[1][1] - oz], [ends[1][0] + ox, foot, ends[1][1] + oz], [ends[0][0] + ox, foot, ends[0][1] + oz],
    [ends[0][0] - ox * 0.35 + c * len * 0.08 - s * lean, tops[0], ends[0][1] - oz * 0.35 + s * len * 0.08 + c * lean],
    [ends[1][0] - ox * 0.35 - c * len * 0.1 - s * lean, tops[1], ends[1][1] - oz * 0.35 - s * len * 0.1 + c * lean],
    [ends[1][0] + ox * 0.35 - c * len * 0.1 - s * lean, tops[1] - 0.05, ends[1][1] + oz * 0.35 - s * len * 0.1 + c * lean],
    [ends[0][0] + ox * 0.35 + c * len * 0.08 - s * lean, tops[0] - 0.05, ends[0][1] + oz * 0.35 + s * len * 0.08 + c * lean],
  ], color, top, false);
}

// ---------------------------------------------------------------------------
// Smoke and steam
// ---------------------------------------------------------------------------

/** A place that smokes or steams: how often it puffs, how large and how pale each puff is, which way they drift, and how far apart they start. */
interface Puffer { x: number; y: number; z: number; every: number; size: number; shade: number; drift: THREE.Vector3; spread: number; lift?: number }

function puffing(k: Build, puffers: Puffer[]): void {
  if (puffers.length === 0) return;
  const smoke = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 180);
  k.group.add(smoke.mesh);
  const r = rng(47021), from = new THREE.Vector3(), due = puffers.map(() => r() * 0.5);
  k.each((dt) => {
    puffers.forEach((p, i) => {
      due[i] -= dt;
      if (due[i] > 0) return;
      due[i] = p.every * (0.75 + r() * 0.5);
      smoke.puff(from.set(p.x + (r() - 0.5) * p.spread, p.y + (p.lift ?? 0) * r(), p.z + (r() - 0.5) * p.spread), p.drift, p.size * (0.85 + r() * 0.3), p.shade * (0.95 + r() * 0.05));
    });
    smoke.update(dt);
  });
}

// ---------------------------------------------------------------------------
// The crater
// ---------------------------------------------------------------------------

/**
 * Where the crater is: on the plan's summit, at the highest corner of the
 * field there, unless a lair takes that ground, and then the highest corner
 * of the field near the summit that no lair takes. Null if there is none.
 */
function craterAt(f: Field, lairs: Lair[]): { x: number; z: number; tip: number } | null {
  const [sx, sz] = DRAGONMONT.summit, W = f.nx + 1;
  let best: { x: number; z: number; tip: number } | null = null;
  const free = !atLair(lairs, sx, sz, 1.5);
  for (let j = 0; j <= f.nz; j++) {
    for (let i = 0; i <= f.nx; i++) {
      const x = f.x0 + ((f.x1 - f.x0) * i) / f.nx, z = f.z0 + ((f.z1 - f.z0) * j) / f.nz, d = Math.hypot(x - sx, z - sz), y = f.y[j * W + i];
      if (free ? d > 1.8 : d > 12 || atLair(lairs, x, z, 1.5)) continue;
      if (!best || y > best.tip) best = { x: free ? sx : x, z: free ? sz : z, tip: y };
    }
  }
  return best;
}

/**
 * The top of the mountain: a ragged rim of jagged black rock round its tip,
 * low, and none of it where a dragon lies over the top, for Meraxes lies there
 * with the tip under her; in the gaps of the rim embers that glow, a dull red
 * by day and faintly by night; a little warm light on the rock round it by
 * night; and a few cracks below it that glow, where no dragon lies over them.
 * No smoke rises from it: an effect must not stand between the view and a
 * dragon.
 */
function crater(k: Build, f: Field, lairs: Lair[], regions: Region[]): void {
  const b = k.b, r = rng(5023), c = craterAt(f, lairs);
  if (!c) {
    if (import.meta.env.DEV) console.warn('Dragonmont: a lair takes the whole top of the mountain, and the crater has no room.');
    return;
  }
  for (let i = 0; i < 22; i++) {
    const a = ((i + (r() - 0.5) * 0.6) / 22) * Math.PI * 2, rr = 2.4 + r() * 2.0;
    const x = c.x + Math.cos(a) * rr, z = c.z + Math.sin(a) * rr;
    if (atLair(lairs, x, z, 0.6) || underPerch(x, z, 0.9)) continue;
    // long round the rim, so that together they ring it
    const h = Math.min(capAt(lairs, x, z), 0.35 + r() * 0.4);
    rock(b, x, z, 0.45 + r() * 0.3, 0.28 + r() * 0.14, h, a + Math.PI / 2, r, i % 3 ? ROCK.rim : ROCK.black, ROCK.rimHi);
    if (r() < 0.5) {
      const ex = c.x + Math.cos(a + 0.12) * (rr - 0.45), ez = c.z + Math.sin(a + 0.12) * (rr - 0.45);
      if (!underPerch(ex, ez, 0.6)) k.glows.push({ x: ex, y: heightOn(f, ex, ez) + 0.03, z: ez, sx: 0.2, sy: 0.05, sz: 0.2, color: '#9c2e10' });
    }
  }
  k.lights.push({ x: c.x, z: c.z, r: 7, color: '#ff6a32', k: 0.35 });
  // cracks below the rim that glow, down three of the fissures
  for (const fi of [1, 5, 8]) {
    const fs = FISSURES[fi];
    for (let d = fs.d0 + 0.015; d < fs.d0 + 0.13; d += 0.035) {
      const a = fs.a + fs.wig * Math.sin(d * 13 + fs.k), rx = Math.cos(a) < 0 ? DRAGONMONT.reach.w : DRAGONMONT.reach.e, rz = Math.sin(a) < 0 ? DRAGONMONT.reach.n : DRAGONMONT.reach.s;
      const x = DRAGONMONT.summit[0] + Math.cos(a) * d * rx, z = DRAGONMONT.summit[1] + Math.sin(a) * d * rz;
      if (claimOf(regions, x, z) || atLair(lairs, x, z, 0.5) || underOthers(x, z, 0.5)) continue;
      k.glows.push({ x, y: heightOn(f, x, z) + 0.05, z, sx: 0.22, sy: 0.08, sz: 0.22, color: '#c2300f' });
    }
  }
}

// ---------------------------------------------------------------------------
// The vents, and Grey Ghost's
// ---------------------------------------------------------------------------

interface Vent { x: number; z: number; big: boolean }
type Taken = { x: number; z: number; r: number }[];

/**
 * Whether a place on the slope is clear: of every lair's shelf, mouth and
 * dragon's head, of any other dragon, of the roads and the ground cut down
 * beside them, of the crater, of the camp of the Sowing, and of what is
 * already placed there; and, if `far` is given, that far from every dragon's
 * home on the mountain.
 */
function clearOnSlope(lairs: Lair[], taken: Taken, x: number, z: number, room: number, far = 0): boolean {
  if (!isLand(x, z) || mountAt(x, z) < 0.5) return false;
  if (atLair(lairs, x, z, room + 0.8) || underOthers(x, z, room)) return false;
  if (far > 0 && (fromDragons(x, z) < far || byDragon(x, z, 2.5))) return false;
  if (offRoads(x, z) < 6.5 + room) return false;
  const [sx, sz] = DRAGONMONT.summit;
  if (Math.hypot(x - sx, z - sz) < 3.2 + room) return false;
  if (x > SOWING.x0 - 3 - room && x < SOWING.x1 + 3 + room && z > SOWING.z0 - 3 - room && z < SOWING.z1 + 3 + room) return false;
  return taken.every((t) => Math.hypot(x - t.x, z - t.z) > t.r + room);
}

/** How far a place is from the middle of the nearest road on the tile, counting the outer edge of a ring's paving as a road's edge. */
function offRoads(x: number, z: number): number {
  let d = Infinity;
  for (const line of Object.values(ROADS) as P2[][]) {
    for (let i = 0; i + 1 < line.length; i++) {
      const [ax, az] = line[i], [bx, bz] = line[i + 1], ux = bx - ax, uz = bz - az, l2 = ux * ux + uz * uz || 1;
      const t = Math.min(1, Math.max(0, ((x - ax) * ux + (z - az) * uz) / l2));
      d = Math.min(d, Math.hypot(x - ax - ux * t, z - az - uz * t));
    }
  }
  for (const t of Object.values(TURNS)) d = Math.min(d, Math.max(0, Math.hypot(x - t.c[0], z - t.c[1]) - t.r - 2.6) + 4);
  return d;
}

/**
 * How far every vent keeps from every dragon's home on the mountain, so that
 * its steam never stands between the view and a dragon; Grey Ghost's, the
 * largest, a little farther. Each keeps clear of where a dragon lies, head to
 * tail, as well (clearOnSlope).
 */
const VENT_CLEAR = 15, GHOST_CLEAR = 16;

/**
 * Where the vents are, found when the tile is built: Grey Ghost's, as high on
 * the eastern side as there is clear ground, nearest east-north-east; and a
 * few small ones, low round the mountain where it is clear of the dragons,
 * each where it is clear nearest its mark: two on the west face, one on the
 * north foot and one at the east foot.
 */
function placeVents(lairs: Lair[], taken: Taken): { vents: Vent[]; ghost: Vent | null } {
  let ghost: Vent | null = null, best = -Infinity;
  for (let bearing = -75; bearing <= 35; bearing += 2.5) {
    for (let y = 6; y <= 42; y += 1) {
      const [x, z] = onMount(bearing, y);
      if (!clearOnSlope(lairs, taken, x, z, 1.8, GHOST_CLEAR)) continue;
      const score = y - 0.12 * Math.abs(bearing + 15);
      if (score > best) { best = score; ghost = { x, z, big: true }; }
    }
  }
  if (ghost) taken.push({ x: ghost.x, z: ghost.z, r: 3 });
  const vents: Vent[] = [];
  const marks: [number, number][] = [[-150, 4], [132, 6], [-68, 6], [-15, 3]];
  for (const [bearing, y0] of marks) {
    let got: Vent | null = null;
    search: for (const dy of [0, 1.5, -1.5, 3, -3, 5]) {
      for (const db of [0, 6, -6, 12, -12, 18, -18]) {
        const y = y0 + dy;
        if (y < 2.5 || y > 38) continue;
        const [x, z] = onMount(bearing + db, y);
        if (clearOnSlope(lairs, taken, x, z, 1.4, VENT_CLEAR)) { got = { x, z, big: false }; break search; }
      }
    }
    if (!got) continue;
    vents.push(got);
    taken.push({ x: got.x, z: got.z, r: 2.4 });
  }
  return { vents, ghost };
}

/**
 * A vent: a low lip of rock round a dark throat, warm inside by night, with
 * pale grey steam rising from it: thin and small at the throat, and widening
 * only as it rises, in three stages one over another.
 */
function vent(k: Build, v: Vent, lairs: Lair[], puffers: Puffer[], r: () => number): void {
  const b = k.b, f = MOUNT!, cap = capAt(lairs, v.x, v.z), R = v.big ? 1.35 : 0.75, h = Math.min(cap * 0.8, v.big ? 0.75 : 0.5);
  let lowest = Infinity;
  const centre = heightOn(f, v.x, v.z);
  for (let i = 0; i < 8; i++) lowest = Math.min(lowest, heightOn(f, v.x + Math.cos(i * 0.785) * R, v.z + Math.sin(i * 0.785) * R));
  b.cyl(v.x, v.z, lowest - 0.25, centre + h, R, R * 0.6, 7, ROCK.dark, { cap: INSIDE, phase: r() * 3 });
  for (let i = 0; i < (v.big ? 5 : 3); i++) {
    const a = r() * Math.PI * 2, d = R + 0.25 + r() * 0.4;
    rock(b, v.x + Math.cos(a) * d, v.z + Math.sin(a) * d, 0.28 + r() * 0.2, 0.22 + r() * 0.15, Math.min(cap, 0.3 + r() * 0.35), a, r, ROCK.char, ROCK.dark);
  }
  k.glows.push({ x: v.x, y: centre + h - 0.04, z: v.z, sx: R * 0.5, sy: 0.06, sz: R * 0.5, color: '#9e3412' });
  const top = centre + h, g = v.big ? 1 : 0.62, often = 0.6 + 0.4 * g;
  puffers.push({ x: v.x, y: top + 0.1, z: v.z, every: 0.2, size: 0.34 * g + 0.08, shade: 0.94, drift: new THREE.Vector3(0.12, 1.25, 0.04), spread: 0.12 * g });
  puffers.push({ x: v.x + 0.15, y: top + 1.5 * g, z: v.z, lift: 1.2 * g, every: 0.42 / often, size: 0.62 * g + 0.12, shade: 0.94, drift: new THREE.Vector3(0.22, 1.1, 0.06), spread: 0.3 * g });
  puffers.push({ x: v.x + 0.35, y: top + 3.2 * g, z: v.z + 0.05, lift: 1.6 * g, every: 0.75 / often, size: 0.95 * g + 0.15, shade: 0.95, drift: new THREE.Vector3(0.32, 1.0, 0.08), spread: 0.5 * g });
}

// ---------------------------------------------------------------------------
// Ledges of rock on the flanks, and fallen rock at the foot
// ---------------------------------------------------------------------------

/**
 * The levees of the old flows of black glass: low ridges of rock down both
 * sides of each, as lava leaves them. Ledges of black rock jutting from the
 * flanks here and there, one to three together. Scree about the foot. All of
 * it low wherever a wing may pass.
 */
function crags(k: Build, lairs: Lair[], taken: Taken): void {
  const b = k.b, r = rng(77031), M = DRAGONMONT;
  const onMountain = (d: number): P2 => {
    const a = r() * Math.PI * 2;
    return [M.summit[0] + Math.cos(a) * d * (Math.cos(a) < 0 ? M.reach.w : M.reach.e), M.summit[1] + Math.sin(a) * d * (Math.sin(a) < 0 ? M.reach.n : M.reach.s)];
  };
  // a place on a flow: `d` down the mountain, `off` units to one side of its middle
  const onFlow = (g: (typeof FLOWS)[number], d: number, off: number): P2 => {
    const a = g.a + 0.05 * Math.sin(d * 9 + g.k), c = Math.cos(a), s = Math.sin(a);
    const x = M.summit[0] + c * d * (c < 0 ? M.reach.w : M.reach.e), z = M.summit[1] + s * d * (s < 0 ? M.reach.n : M.reach.s);
    return [x - s * off, z + c * off];
  };
  for (const g of FLOWS) {
    for (let d = g.d0 + 0.06; d + 0.1 < g.d1; d += 0.12 + r() * 0.05) {
      for (const side of [-1, 1]) {
        const w = 0.9 + 1.6 * (d + 0.05) + 0.45, a = onFlow(g, d, side * w), c = onFlow(g, d + 0.1, side * (w + 0.16));
        if (r() < 0.25 || !clearOnSlope(lairs, taken, a[0], a[1], 0.6) || !clearOnSlope(lairs, taken, c[0], c[1], 0.6)) continue;
        const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2, len = Math.hypot(c[0] - a[0], c[1] - a[1]) * (0.8 + r() * 0.15);
        fin(b, mx, mz, len, 0.8 + r() * 0.35, Math.min(capAt(lairs, mx, mz) * 0.7, 0.4 + r() * 0.25), Math.atan2(c[1] - a[1], c[0] - a[0]), r, ROCK.black, ROCK.glassHi);
      }
    }
  }
  let placed = 0;
  for (let tries = 0; tries < 320 && placed < 12; tries++) {
    const [x, z] = onMountain(0.12 + 0.74 * Math.sqrt(r()));
    if (mountAt(x, z) < 2 || !clearOnSlope(lairs, taken, x, z, 1.8)) continue;
    // long across the fall of the slope, so that each juts from it as a ledge
    const gx = mountAt(x + 0.5, z) - mountAt(x - 0.5, z), gz = mountAt(x, z + 0.5) - mountAt(x, z - 0.5), across = Math.atan2(gx, -gz);
    // one to three fins of harder rock, stepped down the slope one below another, as beds of rock stand out of it
    const cap = capAt(lairs, x, z), n = 1 + Math.floor(r() * 2.4), fallX = -Math.sin(across), fallZ = Math.cos(across);
    const down = gx * fallX + gz * fallZ > 0 ? -1 : 1;
    for (let i = 0; i < n; i++) {
      const d = i * (0.9 + r() * 0.5) * down, px = x + fallX * d + Math.cos(across) * (r() - 0.5) * 0.8, pz = z + fallZ * d + Math.sin(across) * (r() - 0.5) * 0.8;
      fin(b, px, pz, 1.6 + r() * 1.4, 0.4 + r() * 0.25, Math.min(cap * 0.9, 0.4 + r() * 0.5), across + (r() - 0.5) * 0.35, r, i % 2 ? ROCK.char : ROCK.black, r() > 0.5 ? ROCK.dark : ROCK.char);
    }
    taken.push({ x, z, r: 2 });
    placed++;
  }
  let scree = 0;
  for (let tries = 0; tries < 240 && scree < 24; tries++) {
    const [x, z] = onMountain(0.86 + r() * 0.16);
    if (!open(x, z, 1.2) || atLair(lairs, x, z, 1.5) || offRoads(x, z) < 5.5 || taken.some((t) => Math.hypot(x - t.x, z - t.z) < t.r + 0.6)) continue;
    const s = 0.3 + r() * 0.45;
    rock(b, x, z, s, s * (0.7 + r() * 0.4), Math.min(capAt(lairs, x, z), s * (0.9 + r() * 0.6)), r() * 6.3, r, r() > 0.5 ? ROCK.char : ROCK.dark, ROCK.grey);
    scree++;
  }
}

// ---------------------------------------------------------------------------
// At each lair: the cave's mouth, the shelf's ledge, the warm dark, a wisp
// ---------------------------------------------------------------------------

/** Which lairs breathe a thin wisp of smoke from the rock over their mouths, and how much: the smoking caverns. The rest none. */
const SMOKY: Record<string, number> = { vermithor: 1, cannibal: 0.8 };

/** What each lair's mouth stands up to over the ground, for heightAt. */
const MASSES: { l: Lair; u0: number; u1: number; v: number; top: number }[] = [];

/**
 * The outline of a cave's mouth, from its right foot over its crown: each
 * point as a share across of the half-width `wb` of its foot and a share up
 * of its height `H`, and which way is out from the opening there, in degrees
 * from its right (90 is up). Wider at every height than the folded wings that
 * pass in, and higher than the back between them.
 */
const ARCH: [number, number, number][] = [
  [1.05, -0.06, 0], [1.08, 0.32, 4], [1.04, 0.6, 14], [0.98, 0.79, 28], [0.87, 0.92, 42], [0.66, 1.03, 58], [0.36, 1.09, 75], [0, 1.12, 90],
];

/**
 * A cave's mouth at the back of a lair's shelf, facing the way its dragon
 * faces: a ragged arch cut into the mountain's own dark rock, a little wider
 * at its foot than near its crown, with no jamb, lintel or block about it.
 * Round the opening the rock is blackened with soot; above it a brow of rock
 * overhangs, scorched; and from there the rock runs up into the slope, or,
 * where the slope behind is low, is carried back over the cave as a ridge as
 * far as the dragon's folded wings reach up in it, and falls steeply back
 * into the slope behind them. Inside it is dark, and faintly warm by night,
 * with an ember's glow at the back and a warm light on the shelf. The ground
 * of the mouth is cut level into the slope (drawMountain draws it), and this
 * rock closes over it, so that the faces cut round it are hidden.
 */
function mouth(k: Build, l: Lair, puffers: Puffer[]): void {
  const b = k.b, f = MOUNT!, r = rng(9000 + Math.round(l.h.x * 37 + l.h.z * 11));
  const { y0, H, B, D, wb, Wm, L } = l, u0 = -B, uIn = u0 - D;
  const ground = (u: number, v: number): number => {
    const [x, z] = at2(l, u, v);
    return surface(x, z);
  };
  // the highest the slope stands over the mouth's ground at `v` across it, between two places going in
  const slopeOver = (v: number, from: number, to: number): number => {
    let top = -Infinity;
    for (let u = from; u >= to - 1e-6; u -= 0.3) {
      const [x, z] = at2(l, u, v);
      top = Math.max(top, heightOn(f, x, z));
    }
    return top;
  };
  // how far the rock juts out over the opening at a height: not at all near the floor, and the more the higher
  const jut = (y: number): number => (y - y0 < 0.3 ? -0.04 : 0.05 + Math.min(1, (y - y0) / (H + 1)) * (0.25 + r() * 0.3));

  // the outline from the left foot up over the crown and down to the right foot, ragged, but never smaller than ARCH
  const outline = [...ARCH.slice(0, 7).map(([s, t, a]): [number, number, number] => [-s, t, 180 - a]), ARCH[7], ...ARCH.slice(0, 7).reverse()];
  const N = outline.length, chips = new Set([3 + Math.floor(r() * 3), 9 + Math.floor(r() * 3)]);
  // the rings of rock round the opening, as places in the dragon's frame (ahead, to its right, up): the opening's
  // edge; the soot round it; the face of rock round that, the brow over it; the rock over the mouth's ground; the
  // rock carried on back over the cave as far as the dragon's folded wings reach up in it, so that they lie in rock
  // even where the slope there is low; where it goes down into the slope behind; and the back of the dark inside
  type At = [number, number, number];
  const edge: At[] = [], soot: At[] = [], brow: At[] = [], lid: At[] = [], ridge: At[] = [], tail: At[] = [], dark: At[] = [], out: P2[] = [];
  const wings = y0 + 0.285 * L, uWings = Math.min(uIn - 1.4, -0.4 * L);
  outline.forEach(([s0, t0, deg], i) => {
    const foot = i === 0 || i === N - 1, chip = chips.has(i) ? 0.1 : 0;
    const s = s0 + Math.sign(s0) * (r() * 0.07 + chip), t = t0 + (t0 > 0.7 ? r() * 0.05 + chip * 0.5 : 0);
    const a = (deg * Math.PI) / 180, dv = Math.cos(a), dy = Math.sin(a);
    out.push([dv, dy]);
    const v = s * wb, y = y0 + t * H;
    // the edge, its upper lip a little forward of its foot; and the dark going in from it, a little narrower
    const lip = t > 0.75 ? 0.06 + r() * 0.1 : 0;
    edge.push([u0 + lip, v, y]);
    dark.push([uIn + 0.03, v - dv * 0.04, foot ? y : y - dy * 0.04]);
    // the soot round it; at a foot, out over the side of the mouth's ground to the slope beside it
    const sw = 0.3 + r() * 0.16, ys = y + dy * sw;
    const vs = foot ? Math.sign(v) * Math.max(Math.abs(v + dv * sw), Wm + 0.06) : v + dv * sw;
    soot.push([u0 + (jut(ys) + lip) / 2, vs, foot ? Math.min(y, ground(u0 - 0.04, vs) - 0.25) : ys]);
    // the face of rock round that, ragged along its top, up to the slope over the mouth's ground where that is
    // higher; at a foot, out as far again as the slope beside it falls away, so that its side is not a wall
    const T = dy > 0.5 ? 0.9 + r() * 0.95 : 1.0 + r() * 0.55;
    let vf = vs + dv * T, yf = ys + dy * T;
    if (foot) vf += dv * Math.min(6, Math.max(0, y0 - ground(u0 - 0.04, vf)));
    if (dy > 0.25 && Math.abs(vf) < Wm + 0.6) yf = Math.max(yf, slopeOver(vf, u0, u0 - 0.6) + 0.3);
    if (foot) yf = Math.min(y, ground(u0 - 0.04, vf) - 0.25);
    brow.push([u0 + jut(yf), vf, yf]);
    // back over the mouth's ground, falling a little from the brow, but high enough to close over the faces cut round it
    const uo = uIn - 0.35, vo = vf + dv * 0.25;
    let yo = yf - dy * (0.2 + r() * 0.5);
    if (dy > 0.25 && Math.abs(vo) < Wm + 0.7) yo = Math.max(yo, slopeOver(vo, u0, uo) + 0.3);
    if (foot) yo = Math.min(y, ground(uo, vo) - 0.25);
    lid.push([uo, vo, yo]);
    // on back over the folded wings, as high as they reach over the back between them and lower to each side of
    // them, so that it is rounded over them and not flat
    const vr = vo + dv * 0.2;
    let yr = yo - dy * (0.3 + r() * 0.5) + (r() - 0.5) * 0.5;
    if (dy > 0.35 && Math.abs(vr) < 0.14 * L + 0.6) yr = Math.max(yr, wings + (r() - 0.3) * 0.5);
    if (foot) yr = Math.min(y, ground(uWings, vr) - 0.25);
    ridge.push([uWings - r() * 0.9, vr, yr]);
    // and down into the slope behind it, steeply, sunk a little
    const ur = ridge[i][0], run = Math.max(0.8, Math.min(4.5, (yr - ground(ur - 1, vr)) / 1.0)), ut = ur - run, vt = vr + dv * 0.35;
    tail.push([ut, vt, Math.min(yr - 0.2, ground(ut, vt) - 0.3)]);
  });
  // on a side where the slope falls away, the rock's side runs straight down from its shoulder to its foot, so that
  // it is a slope of rock and not a wall
  for (const [foot, side, shoulder] of [[0, [1, 2], 3], [N - 1, [N - 2, N - 3], N - 4]] as const) {
    for (const ring of [brow, lid, ridge, tail]) {
      const f0 = ring[foot], s0 = ring[shoulder];
      if (Math.abs(f0[1]) <= Math.abs(s0[1]) + 0.3 || s0[2] - f0[2] < 0.5) continue;
      for (const i of side) {
        const p = ring[i], k = Math.min(1, Math.max(0, (p[2] - f0[2]) / (s0[2] - f0[2]))), v = f0[1] + (s0[1] - f0[1]) * k;
        if (Math.abs(v) > Math.abs(p[1])) p[1] = v;
      }
    }
  }

  const W = (p: At): V3 => at3(l, p[0], p[1], p[2]);
  const towards = (du: number, dv: number, dy: number): V3 => [l.fx * du + l.sx * dv, dy, l.fz * du + l.sz * dv];
  const hood = (): number => HOOD[Math.floor(r() * HOOD.length)];
  for (let i = 0; i + 1 < N; i++) {
    const dv = (out[i][0] + out[i + 1][0]) / 2, dy = (out[i][1] + out[i + 1][1]) / 2;
    const mv = (edge[i][1] + edge[i + 1][1]) / 2, my = (edge[i][2] + edge[i + 1][2]) / 2;
    // the dark of its sides and roof going in, faintly warm by night
    facet4(b, W(edge[i]), W(edge[i + 1]), W(dark[i + 1]), W(dark[i]), towards(0.3, -mv, y0 + 0.4 * H - my), INSIDE, { win: interior(0.7) });
    // the soot round its edge
    facet4(b, W(edge[i]), W(edge[i + 1]), W(soot[i + 1]), W(soot[i]), towards(1, dv * 0.4, dy * 0.4), SOOT_RIM);
    // the rock round that, scorched, the brow over it jutting out
    facet4(b, W(soot[i]), W(soot[i + 1]), W(brow[i + 1]), W(brow[i]), towards(1, dv * 0.5, dy * 0.5), BROW[Math.floor(r() * BROW.length)]);
    // over the mouth's ground, back over the cave, and down into the slope behind
    facet4(b, W(brow[i]), W(brow[i + 1]), W(lid[i + 1]), W(lid[i]), towards(0.15, dv, dy + 0.25), hood());
    facet4(b, W(lid[i]), W(lid[i + 1]), W(ridge[i + 1]), W(ridge[i]), towards(-0.1, dv, dy + 0.4), hood());
    facet4(b, W(ridge[i]), W(ridge[i + 1]), W(tail[i + 1]), W(tail[i]), towards(-0.5, dv, dy + 0.6), hood());
  }
  // the dark at the back of it, faintly warm by night, closing it behind
  const mid = W([uIn + 0.03, 0, y0 - 0.06 * H]);
  for (let i = 0; i + 1 < N; i++) facet3(b, mid, W(dark[i]), W(dark[i + 1]), towards(1, 0, 0), INSIDE_WARM, { win: interior(2.2) });

  let top = y0, wide = 0, deepest = u0;
  for (const p of [...brow, ...lid, ...ridge]) {
    top = Math.max(top, p[2]);
    wide = Math.max(wide, Math.abs(p[1]));
  }
  for (const p of tail) {
    deepest = Math.min(deepest, p[0]);
    wide = Math.max(wide, Math.abs(p[1]));
  }
  MASSES.push({ l, u0: deepest, u1: u0 + 0.7, v: wide + 0.4, top });
  FOOT.push({ l, u0: deepest, u1: u0 + 0.7, v: wide + 0.4 });

  // an ember's glow on the floor at the back of the dark, and a warm light on the shelf by night
  const [gx, gz] = at2(l, uIn + 0.45, 0);
  k.glows.push({ x: gx, y: y0 + 0.08, z: gz, sx: 0.36, sy: 0.07, sz: 0.36, color: '#6a2a12' });
  const [lx, lz] = at2(l, (l.F - B) / 2, 0);
  k.lights.push({ x: lx, z: lz, r: 0.3 * L + 3, color: '#ff9a5a', k: 0.3 });

  // a smoking cavern breathes a thin wisp from the rock above and behind its mouth, over its right shoulder, clear of
  // the dragon lying in it, leaning back, away from the shelf
  const smoky = SMOKY[l.id];
  if (smoky) {
    const w = lid[10], [x, z] = at2(l, w[0] - 0.3, w[1] + 0.2);
    puffers.push({ x, y: w[2] + 0.05, z, every: 0.55 / smoky, size: 0.22, shade: 0.44, drift: new THREE.Vector3(-l.fx * 0.25, 1.0, -l.fz * 0.25), spread: 0.06 });
    puffers.push({ x: x - l.fx * 0.35, y: w[2] + 1.5, z: z - l.fz * 0.35, lift: 0.9, every: 0.95 / smoky, size: 0.4, shade: 0.47, drift: new THREE.Vector3(-l.fx * 0.3, 0.9, -l.fz * 0.3), spread: 0.18 });
  }
}

/**
 * A lair's shelf as a ledge of the mountain's rock: level, as the plan has
 * it, but broken at its edge. Where it is built out over the slope its edge
 * crumbles into scree that runs steeply down to the slope, and the ash along
 * that edge is broken; cracks run in from its edges; a few loose stones, none
 * higher than 0.4, lie about its rim and on the scree, scattered, clear of
 * its dragon; and before the mouth the ash is blackened with soot. Where it is
 * cut into the slope the face is the mountain's, drawn with it as rough
 * bedded rock.
 */
function ledge(k: Build, l: Lair, regions: Region[]): void {
  const b = k.b, r = rng(6100 + Math.round(l.h.x * 13 + l.h.z * 29)), shelf = regions.find((g) => g.lair === l && g.kind === 'shelf')!;
  const { y0, B, F, half, L } = l;
  const W = (u: number, v: number, y: number): V3 => at3(l, u, v, y);
  const ground = (u: number, v: number): number => {
    const [x, z] = at2(l, u, v);
    return surface(x, z);
  };
  // whether scree may lie there: on no other lair's ground, and off the roads
  const free = (u: number, v: number): boolean => {
    const [x, z] = at2(l, u, v), g = claimOf(regions, x, z);
    return (g === null || g.lair === l) && offRoads(x, z) > 4.5;
  };
  const towards = (du: number, dv: number, dy: number): V3 => [l.fx * du + l.sx * dv, dy, l.fz * du + l.sz * dv];

  // round the shelf's edge, from its back on the left, down its left side, across its front and back up its right
  // side: each place with the way out from it, and how much farther out a corner reaches; and the scree below it,
  // if the shelf is built out there: how far out it runs, two places on the way down it, and its foot on the slope
  interface Edge { u: number; v: number; nu: number; nv: number; st: number; d: number; m: At[]; qu: number; qv: number; qy: number; w: number }
  type At = [number, number, number];
  const way: P2[] = [[-B, -half], [F, -half], [F, half], [-B, half]];
  const edge: Edge[] = [];
  for (let c = 0; c + 1 < way.length; c++) {
    const [ua, va] = way[c], [uc, vc] = way[c + 1], len = Math.hypot(uc - ua, vc - va), du = (uc - ua) / len, dv = (vc - va) / len;
    const m = Math.max(1, Math.round(len / 0.8));
    for (let j = c === 0 ? 0 : 1; j <= m; j++) {
      let nu = dv, nv = -du, st = 1;
      if (j === m && c + 2 < way.length) {
        const [ud, vd] = way[c + 2], l2 = Math.hypot(ud - uc, vd - vc), eu = (ud - uc) / l2, ev = (vd - vc) / l2;
        nu = dv + ev;
        nv = -du - eu;
        const nl = Math.hypot(nu, nv);
        nu /= nl;
        nv /= nl;
        st = Math.SQRT2;
      }
      edge.push({ u: ua + (uc - ua) * (j / m), v: va + (vc - va) * (j / m), nu, nv, st, d: 0, m: [], qu: 0, qv: 0, qy: 0, w: 0 });
    }
  }
  for (const s of edge) {
    const drop = y0 - ground(s.u + s.nu * 0.3 * s.st, s.v + s.nv * 0.3 * s.st);
    if (drop < 0.3) continue;
    // out from the edge a little over half as far as the ground falls just below it, more in some places than
    // others, and no farther than 2.6: steep, as scree lies under a broken edge, and where the slope below falls
    // away as a cliff, falling with it as rough rock; and kept off the roads
    let d = Math.min(2.6, Math.max(0.6, drop * (0.45 + r() * 0.2) + 0.4));
    while (d > 0.6 && !free(s.u + s.nu * d * s.st, s.v + s.nv * d * s.st)) d *= 0.75;
    const qu = s.u + s.nu * d * s.st, qv = s.v + s.nv * d * s.st;
    if (!free(qu, qv)) continue;
    s.d = d;
    s.qu = qu + (r() - 0.5) * 0.4 * s.nv;
    s.qv = qv - (r() - 0.5) * 0.4 * s.nu;
    s.qy = Math.min(y0 - 0.3, ground(qu, qv) - 0.25);
    // two places on the way down, each a little proud of the straight line as scree lies, and not quite square to the edge
    for (const f of [0.3 + r() * 0.08, 0.64 + r() * 0.08]) {
      const along = (r() - 0.5) * 0.45, out = d * s.st * f;
      s.m.push([s.u + s.nu * out - s.nv * along, s.v + s.nv * out + s.nu * along, y0 + (s.qy - y0) * f + 0.05 + r() * 0.2]);
    }
    s.w = 0.12 + r() * 0.5;
  }
  const reachOut = edge.reduce((m, s) => Math.max(m, s.d * s.st), 0);
  FOOT.push({ l, u0: -B, u1: F + reachOut + 0.3, v: half + reachOut + 0.3 });
  const scree = (): number => SCREE[Math.floor(r() * SCREE.length)];
  for (let i = 0; i + 1 < edge.length; i++) {
    const s = edge[i], t = edge[i + 1];
    if (!s.d && !t.d) continue;
    // down the scree row by row, from the edge to the slope; where it has none, it tapers to the edge
    const rows = (e: Edge): V3[] => {
      const top = W(e.u, e.v, y0 + 0.004);
      return e.d ? [top, ...e.m.map((p) => W(p[0], p[1], p[2])), W(e.qu, e.qv, e.qy)] : [top, top, top, top];
    };
    const a = rows(s), c = rows(t), o = towards((s.nu + t.nu) / 2, (s.nv + t.nv) / 2, 0.8);
    for (let k2 = 0; k2 < 3; k2++) facet4(b, a[k2], c[k2], c[k2 + 1], a[k2 + 1], o, scree());
    // the ash at the edge above it broken, raggedly
    if (s.d && t.d) {
      const y = y0 + 0.018, color = BROKEN[Math.floor(r() * BROKEN.length)];
      const I0 = W(s.u - s.nu * s.w * s.st, s.v - s.nv * s.w * s.st, y), I1 = W(t.u - t.nu * t.w * t.st, t.v - t.nv * t.w * t.st, y);
      b.up(W(s.u, s.v, y), W(t.u, t.v, y), I1, color);
      b.up(W(s.u, s.v, y), I1, I0, color);
    }
  }

  // cracks running in from the edge, narrowing to nothing
  const cracks = 3 + (r() < 0.5 ? 1 : 0);
  for (let c = 0; c < cracks; c++) {
    const s = edge[1 + Math.floor(r() * (edge.length - 2))];
    let u = s.u - s.nu * 0.05, v = s.v - s.nv * 0.05, a = Math.atan2(-s.nv, -s.nu) + (r() - 0.5) * 0.9;
    const pts: P2[] = [[u, v]], n = 3 + Math.floor(r() * 3);
    for (let j = 0; j < n; j++) {
      const len = 0.35 + r() * 0.5;
      u += Math.cos(a) * len;
      v += Math.sin(a) * len;
      if (u < -B + 0.15 || u > F - 0.05 || Math.abs(v) > half - 0.05) break;
      pts.push([u, v]);
      a += (r() - 0.5) * 1.2;
    }
    const y = y0 + 0.024;
    for (let j = 0; j + 1 < pts.length; j++) {
      const [ua, va] = pts[j], [uz, vz] = pts[j + 1], len = Math.hypot(uz - ua, vz - va), pu = -(vz - va) / len, pv = (uz - ua) / len;
      const wa = 0.015 + 0.06 * (1 - j / pts.length), wz = 0.015 + 0.06 * (1 - (j + 1) / pts.length);
      b.up(W(ua + pu * wa, va + pv * wa, y), W(uz + pu * wz, vz + pv * wz, y), W(uz - pu * wz, vz - pv * wz, y), ROCK.crack);
      b.up(W(ua + pu * wa, va + pv * wa, y), W(uz - pu * wz, vz - pv * wz, y), W(ua - pu * wa, va - pv * wa, y), ROCK.crack);
    }
  }

  // a few loose stones about the rim and on the scree, scattered, none higher than 0.4, and clear of the dragon: of
  // its braced wings at its sides and its neck and head before it
  const stones: P2[] = [];
  for (let tries = 0; tries < 60 && stones.length < 4; tries++) {
    const s = edge[Math.floor(r() * edge.length)];
    let u: number, v: number, on: ((x: number, z: number) => number) | undefined;
    if (s.d > 0 && r() < 0.45) {
      // part way down the scree, standing on it as it falls away
      const [mu, mv, my] = s.m[0], g = 0.45 + r() * 0.5, reach = Math.hypot(mu - s.u, mv - s.v);
      u = s.u + (mu - s.u) * g;
      v = s.v + (mv - s.v) * g;
      on = (x, z) => {
        const [uu, vv] = local(l, x, z), dd = (uu - s.u) * s.nu + (vv - s.v) * s.nv;
        return y0 + ((my - y0) * Math.max(0, dd)) / reach;
      };
    } else {
      const inset = 0.3 + r() * 0.5;
      u = s.u - s.nu * inset * s.st;
      v = s.v - s.nv * inset * s.st;
    }
    if (u > -B - 0.1 && u < F + 2.5 && Math.abs(v) < 0.14 * L + 0.4) continue;
    if (stones.some(([a, c]) => Math.hypot(a - u, c - v) < 1.4)) continue;
    stones.push([u, v]);
    const [x, z] = at2(l, u, v), size = 0.18 + r() * 0.2;
    rock(b, x, z, size, size * (0.65 + r() * 0.4), 0.15 + r() * 0.22, r() * 6.3, r, [ROCK.char, ROCK.dark, ROCK.grey][Math.floor(r() * 3)], ROCK.slate, on);
  }

  // soot on the shelf before the mouth, where the fire of a dragon going in and out has blackened the ash
  const patch: P2[] = [];
  const reach = 0.08 * L + 1.2, wide = l.wb + 0.6;
  for (let i = 0; i <= 8; i++) {
    const v = -wide + (2 * wide * i) / 8, u = -B + reach * (0.55 + 0.45 * Math.sin((i / 8) * Math.PI)) * (0.8 + r() * 0.35);
    patch.push(at2(l, Math.min(u, F - 0.3), v));
  }
  patch.push(at2(l, -B + 0.02, wide), at2(l, -B + 0.02, -wide));
  // keep it to the shelf as drawn, where no other lair takes the ground
  if (patch.every(([x, z]) => claimOf(regions, x, z) === shelf)) flat(b, patch, y0 + 0.045, SOOT);
}

// ---------------------------------------------------------------------------
// Sheepstealer's sheep
// ---------------------------------------------------------------------------

/** A sheep: a white fleece on four dark legs, and a dark face. */
function sheep(b: GeoBuilder, x: number, z: number, y: number, yaw: number): void {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  b.obox(x, y + 0.62, z, 0.5, 0.3, 0.32, yaw, FLEECE, { top: 0xf6f3ea });
  b.obox(x + c * 0.6, y + 0.82, z + s * 0.6, 0.17, 0.16, 0.14, yaw, SHEEP_DARK);
  for (const [a, d] of [[0.3, 0.18], [0.3, -0.18], [-0.3, 0.18], [-0.3, -0.18]]) {
    const lx = x + c * a - s * d, lz = z + s * a + c * d;
    b.box(lx - 0.06, y - 0.05, lz - 0.06, lx + 0.06, y + 0.36, lz + 0.06, SHEEP_DARK, { faces: 'NESW' });
  }
}

/**
 * The girl who won Sheepstealer left a freshly killed sheep for him every
 * morning. Here, more gently, a live sheep waits in a small fold of hurdles on
 * the slope below and ahead of his shelf, clear of his head's reach, with hay
 * and a trough, and a lantern on a stake.
 */
function sheepFold(k: Build, l: Lair, lairs: Lair[]): void {
  const b = k.b, L = l.L;
  // the open ground nearest the front of his shelf and below it, beyond his head's reach, ahead of it if there is room there, on the slope if there is any
  let spot: { x: number; z: number } | null = null, best = Infinity;
  for (let u = -0.2 * L; u <= 0.34 * L + 16; u += 0.5) {
    for (let v = -0.9 * L; v <= 0.9 * L; v += 0.5) {
      const [x, z] = at2(l, u, v);
      if (!open(x, z, 2) || atLair(lairs, x, z, 2.2) || offRoads(x, z) < 7 || surface(x, z) > l.y0 - 1) continue;
      const score = Math.hypot(u - l.F, 1.6 * v) + (u < l.F ? 3 : 0) - (mountAt(x, z) > 0.4 ? 3 : 0);
      if (score < best) { best = score; spot = { x, z }; }
    }
  }
  if (!spot) {
    if (import.meta.env.DEV) console.warn('Dragonmont: no room for the sheepfold below Sheepstealer.');
    return;
  }
  const { x, z } = spot, yaw = Math.atan2(l.fz, l.fx), c = Math.cos(yaw), s = Math.sin(yaw);
  if (import.meta.env.DEV) console.info(`Dragonmont: Sheepstealer's sheep in its fold at (${x.toFixed(1)}, ${z.toFixed(1)}), ${surface(x, z).toFixed(1)} high.`);
  const corner = (a: number, d: number): P2 => [x + c * a - s * d, z + s * a + c * d];
  const ha = 1.2, hd = 1.6;
  const ring: P2[] = [corner(-ha, -hd), corner(ha, -hd), corner(ha, hd), corner(-ha, hd)];
  // hurdles of woven wattle round it, each as tall over the slope at both its ends; the one nearest him is the gate
  const stakes: P2[] = [];
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % 4], len = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.round(len / 1.6));
    for (let j = 0; j < n; j++) {
      const A = mix2(p, q, j / n), C = mix2(p, q, (j + 1) / n), ya = surface(A[0], A[1]), yc = surface(C[0], C[1]);
      const nx = -(C[1] - A[1]) / Math.hypot(C[0] - A[0], C[1] - A[1]) * 0.05, nz = (C[0] - A[0]) / Math.hypot(C[0] - A[0], C[1] - A[1]) * 0.05;
      const gate = i === 3 && j === 0, top = gate ? 0.95 : 0.85;
      block(b, [
        [A[0] - nx, ya - 0.15, A[1] - nz], [C[0] - nx, yc - 0.15, C[1] - nz], [C[0] + nx, yc - 0.15, C[1] + nz], [A[0] + nx, ya - 0.15, A[1] + nz],
        [A[0] - nx, ya + top, A[1] - nz], [C[0] - nx, yc + top, C[1] - nz], [C[0] + nx, yc + top, C[1] + nz], [A[0] + nx, ya + top, A[1] + nz],
      ], gate ? TIMBER : WATTLE, WATTLE_TOP, false);
      stakes.push(A);
    }
  });
  for (const [sx2, sz2] of stakes) {
    const y = surface(sx2, sz2);
    b.box(sx2 - 0.07, y - 0.1, sz2 - 0.07, sx2 + 0.07, y + 1.0, sz2 + 0.07, TIMBER_DARK);
  }
  // the sheep, looking up at the shelf, and its hay and water
  const sy = surface(x, z);
  sheep(b, x + c * 0.2, z + s * 0.2, sy, yaw + Math.PI + 0.4);
  const [hx, hz] = corner(-0.55, 0.85);
  b.cyl(hx, hz, surface(hx, hz) - 0.05, surface(hx, hz) + 0.32, 0.45, 0.2, 6, 0xc9ae6a, { cap: 0xd6bd7a });
  const [tx, tz] = corner(0.55, -0.9), ty = surface(tx, tz);
  b.obox(tx, ty + 0.15, tz, 0.45, 0.18, 0.18, yaw + Math.PI / 2, TIMBER, { top: 0x5f8aa0 });
  // a lantern on the stake at the gate
  const [gx, gz] = ring[3], gy = surface(gx, gz);
  k.glows.push({ x: gx, y: gy + 1.15, z: gz, sx: 0.22, sy: 0.28, sz: 0.22, color: '#ffd9a0' });
  k.lights.push({ x: gx, z: gz, r: 5.5, color: '#ffcf8a', k: 0.4 });
}

// ---------------------------------------------------------------------------
// The camp of the Sowing
// ---------------------------------------------------------------------------

/** A ridge tent of canvas, its ridge along `yaw`, its door open at the end it points to, its flap folded back. */
function ridgeTent(b: GeoBuilder, x: number, z: number, y: number, yaw: number, len: number, wid: number, high: number, canvas: number): void {
  const shade = new THREE.Color(canvas).multiplyScalar(0.82).getHex();
  b.moved(x, y, z, yaw, () => {
    const hl = len / 2, hw = wid / 2, nl = Math.hypot(hw, high);
    b.quad([-hl, 0, hw], [hl, 0, hw], [hl, high, 0], [-hl, high, 0], [0, hw / nl, high / nl], canvas);
    b.quad([hl, 0, -hw], [-hl, 0, -hw], [-hl, high, 0], [hl, high, 0], [0, hw / nl, -high / nl], canvas);
    face3(b, [-hl, 0, -hw], [-hl, 0, hw], [-hl, high, 0], [-1, 0, 0], shade);
    face3(b, [hl, 0, -hw], [hl, 0, hw], [hl, high, 0], [1, 0, 0], shade);
    // the door, open and dark inside, and its flap folded back against the side
    face3(b, [hl + 0.02, 0, -hw * 0.5], [hl + 0.02, 0, hw * 0.5], [hl + 0.02, high * 0.78, 0], [1, 0, 0], DARK, { win: interior(0.6) });
    face3(b, [hl - 0.35, 0.05, hw * 0.86], [hl + 0.02, 0.05, hw * 0.55], [hl - 0.1, high * 0.7, hw * 0.3 + 0.04], [0.3, 0.2, 0.93], shade);
    // the ridge pole, out a little at each end, and the poles at the ends
    b.beam([-hl - 0.18, high + 0.03, 0], [hl + 0.18, high + 0.03, 0], 0.05, 0.05, TIMBER_DARK);
    for (const e of [-1, 1]) b.box(e * (hl + 0.09) - 0.05, 0, -0.05, e * (hl + 0.09) + 0.05, high + 0.12, 0.05, TIMBER_DARK);
  });
}

/** A round pavilion in two plain colours, a pennon on its top and a dark door on the side it is told. */
function pavilion(b: GeoBuilder, x: number, z: number, y: number, r: number, c0: number, c1: number, door: number): void {
  const n = 8, wall = 1.9, peak = 3.5;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
    b.quad([x + Math.cos(a0) * r, y, z + Math.sin(a0) * r], [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r], [x + Math.cos(a1) * r, y + wall, z + Math.sin(a1) * r], [x + Math.cos(a0) * r, y + wall, z + Math.sin(a0) * r], [Math.cos(am), 0, Math.sin(am)], i % 2 ? c1 : c0);
  }
  lathe(b, x, z, [[r + 0.02, y + wall], [r * 0.5, y + wall + (peak - wall) * 0.62], [0.04, y + peak]], n, c0);
  const half = r * Math.sin(Math.PI / n) * 0.75, out = r * Math.cos(Math.PI / n) + 0.02, dx = Math.cos(door) * out, dz = Math.sin(door) * out;
  const tx = -Math.sin(door) * half, tz = Math.cos(door) * half;
  b.quad([x + dx - tx, y, z + dz - tz], [x + dx + tx, y, z + dz + tz], [x + dx + tx, y + 1.55, z + dz + tz], [x + dx - tx, y + 1.55, z + dz - tz], [Math.cos(door), 0, Math.sin(door)], DARK, { win: interior(0.7) });
  b.cyl(x, z, y + peak - 0.1, y + peak + 0.9, 0.04, 0.03, 4, TIMBER_DARK, { cap: false });
  for (const sd of [-1, 1]) face3(b, [x, y + peak + 0.88, z + sd * 0.012], [x, y + peak + 0.5, z + sd * 0.012], [x + 0.75, y + peak + 0.72, z + sd * 0.012], [0, 0, sd], c1);
}

/** A lean-to: a roof of hide sloping from two posts down to the ground, with a bedroll under it. */
function leanTo(b: GeoBuilder, x: number, z: number, y: number, yaw: number): void {
  b.moved(x, y, z, yaw, () => {
    for (const s of [-1, 1]) b.box(s * 1.05 - 0.06, 0, 0.92, s * 1.05 + 0.06, 1.85, 1.04, TIMBER_DARK);
    slab(b, [0, 1.9, 1.05], [0, 0.12, -1.0], 1.2, 0.06, HIDE, { under: 0x5f4835 });
    b.box(-0.6, 0, -0.35, 0.6, 0.24, 0.6, 0x7c6a8a, { top: 0x8a789a });
  });
}

/** Someone looking up at a lair and pointing at it. */
function gazer(b: GeoBuilder, x: number, z: number, y: number, to: V3, coat: number, legs: number): void {
  b.box(x - 0.3, y, z - 0.2, x + 0.3, y + 0.85, z + 0.2, legs, { faces: 'NESW' });
  b.box(x - 0.37, y + 0.85, z - 0.24, x + 0.37, y + 1.85, z + 0.24, coat);
  b.box(x - 0.24, y + 1.85, z - 0.24, x + 0.24, y + 2.3, z + 0.24, SKIN, { faces: 'NESW' });
  b.box(x - 0.26, y + 2.24, z - 0.26, x + 0.26, y + 2.4, z + 0.26, 0x3b2a20);
  // the arm, raised high towards the lair, so that it shows over the head from every side
  const dx = to[0] - x, dz = to[2] - z, hl = Math.hypot(dx, dz) || 1, side: P2 = [-dz / hl, dx / hl];
  const sh: V3 = [x + side[0] * 0.38, y + 1.72, z + side[1] * 0.38], hand: V3 = [sh[0] + (dx / hl) * 0.5 + side[0] * 0.12, sh[1] + 1.05, sh[2] + (dz / hl) * 0.5 + side[1] * 0.12];
  b.beam(sh, hand, 0.1, 0.09, coat);
  b.box(hand[0] - 0.08, hand[1] - 0.08, hand[2] - 0.08, hand[0] + 0.08, hand[1] + 0.08, hand[2] + 0.08, SKIN, { faces: 'NESWTB' });
}

/**
 * The camp of the Sowing, in 129 AC, when Prince Jacaerys promised
 * knighthood, lands and riches to anyone who could master a dragon: two
 * tents and a third, a hedge knight's pavilion, a lean-to, a cookfire, barrels,
 * crates and sacks, a herald's table under the Targaryen banner where names
 * are taken, washing on a line, and people standing at its north edge looking
 * up at the lairs and pointing. Nothing of the deaths. It keeps clear of the
 * ring the road turns in, just north of it, and of every other road.
 */
function sowing(k: Build, lairs: Lair[], puffers: Puffer[]): void {
  const b = k.b, S = SOWING, r = rng(12904), y = 0.05;
  const W = S.x1 - S.x0, Dp = S.z1 - S.z0;
  const at = (fx: number, fz: number): P2 => [S.x0 + W * fx, S.z0 + Dp * fz];
  // clear of every ring's paving and every road, and inside the camp
  const clear = (x: number, z: number, room: number): boolean => {
    for (const t of Object.values(TURNS)) if (Math.hypot(x - t.c[0], z - t.c[1]) < t.r + 2.6 + room) return false;
    return offRoads(x, z) > 4 + room && x > S.x0 + room - 0.3 && x < S.x1 - room + 0.3 && z > S.z0 + room - 0.3 && z < S.z1 - room + 0.3;
  };

  // the trampled ground: the camp's rectangle less a margin, kept off the rings
  const patch: P2[] = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    let px = S.x0 + W / 2 + Math.cos(a) * (W / 2 - 0.35) * 1.08, pz = S.z0 + Dp / 2 + Math.sin(a) * (Dp / 2 - 0.3) * 1.08;
    px = Math.min(S.x1 - 0.35, Math.max(S.x0 + 0.35, px));
    pz = Math.min(S.z1 - 0.3, Math.max(S.z0 + 0.3, pz));
    for (const t of Object.values(TURNS)) {
      const dx = px - t.c[0], dz = pz - t.c[1], d = Math.hypot(dx, dz), need = t.r + 2.6 + 0.35;
      if (d < need) { px = t.c[0] + (dx / d) * need; pz = t.c[1] + (dz / d) * need; }
    }
    patch.push([px, pz]);
  }
  area(k, patch, EARTH, y);

  const missed: string[] = [];
  const put = (what: string, fx: number, fz: number, room: number): P2 | null => {
    const [x, z] = at(fx, fz);
    if (clear(x, z, room)) return [x, z];
    missed.push(what);
    return null;
  };

  // the herald's table under the Targaryen banner, at the north-west corner, where names are taken
  const ban = put('banner', 0.06, 0.12, 0.3);
  if (ban) {
    banner(b, ban[0], ban[1], y, 'targaryen', 4.2, 0.8);
    for (let i = 0; i < 4; i++) rock(b, ban[0] + Math.cos(i * 1.7) * 0.32, ban[1] + Math.sin(i * 1.7) * 0.32, 0.2, 0.16, 0.25, i, r, ROCK.char, ROCK.grey);
  }
  const tab = put('table', 0.1, 0.62, 1.0);
  if (tab) {
    const [tx, tz] = tab;
    b.box(tx - 0.95, y + 0.82, tz - 0.42, tx + 0.95, y + 0.94, tz + 0.42, TIMBER, { faces: 'NESWTB' });
    for (const s of [-1, 1]) b.box(tx + s * 0.75 - 0.07, y, tz - 0.32, tx + s * 0.75 + 0.07, y + 0.82, tz + 0.32, TIMBER_DARK);
    b.box(tx - 0.3, y + 0.94, tz - 0.2, tx + 0.2, y + 1.0, tz + 0.15, 0xe6dcc4);
    b.box(tx - 0.8, y, tz - 1.0, tx + 0.8, y + 0.45, tz - 0.75, TIMBER_DARK);
    k.person(tx - 0.1, tz - 0.9, y);
  }

  // the tents and the pavilion along the south side, their doors to the south and the east, towards the view
  const tA = put('tent', 0.21, 0.3, 1.2);
  if (tA) ridgeTent(b, tA[0], tA[1], y, 0.15, 3.0, 2.3, 2.5, CANVAS);
  const pv = put('pavilion', 0.52, 0.32, 1.45);
  if (pv) {
    pavilion(b, pv[0], pv[1], y, 1.45, 0x8a9aa9, 0xe2d8c0, Math.PI / 2 - 0.5);
    b.box(pv[0] + 1.65, y, pv[1] + 1.05, pv[0] + 1.75, y + 2.0, pv[1] + 1.15, TIMBER_DARK);
    fire(k, pv[0] + 1.7, y + 2.15, pv[1] + 1.1, 0.2, 6);
  }
  const tB = put('tent', 0.82, 0.3, 1.1);
  if (tB) ridgeTent(b, tB[0], tB[1], y, Math.PI / 2 - 0.12, 2.8, 2.2, 2.4, CANVAS_RED);
  const tC = put('tent', 0.92, 0.74, 0.95);
  if (tC) ridgeTent(b, tC[0], tC[1], y, Math.PI - 0.3, 2.4, 1.9, 2.1, CANVAS_DUN);
  const lt = put('lean-to', 0.07, 0.88, 0.9);
  if (lt) leanTo(b, lt[0], lt[1], y, 0.6);

  // the cookfire: a ring of stones, the fire, a pot on a tripod, and logs to sit on, with folk round it
  const cf = put('cookfire', 0.4, 0.66, 1.3);
  if (cf) {
    const [fx, fz] = cf;
    b.cyl(fx, fz, y, y + 0.18, 0.62, 0.55, 7, 0x4a4542, { cap: 0x2c2523 });
    b.beam([fx - 0.4, y + 0.24, fz - 0.15], [fx + 0.4, y + 0.24, fz + 0.15], 0.07, 0.07, 0x5a4030);
    b.beam([fx - 0.25, y + 0.26, fz + 0.35], [fx + 0.25, y + 0.26, fz - 0.35], 0.07, 0.07, 0x4a3426);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.3;
      b.beam([fx + Math.cos(a) * 0.7, y, fz + Math.sin(a) * 0.7], [fx, y + 1.45, fz], 0.04, 0.04, 0x8a7a64);
    }
    b.cyl(fx, fz, y + 0.65, y + 1.0, 0.24, 0.28, 6, 0x2f2d2c, { cap: 0x1d1b1a });
    fire(k, fx, y + 0.42, fz, 0.32, 10);
    for (const [ox, oz, yaw] of [[-1.45, 0.1, 0.2], [1.4, 0.3, -0.3]] as const) {
      b.beam([fx + ox - Math.cos(yaw) * 0.7, y + 0.2, fz + oz - Math.sin(yaw) * 0.7], [fx + ox + Math.cos(yaw) * 0.7, y + 0.2, fz + oz + Math.sin(yaw) * 0.7], 0.18, 0.18, 0x5b4634);
    }
    for (const [ox, oz] of [[-1.4, 0.15], [1.35, 0.35], [0.1, 1.2]]) k.person(fx + ox, fz + oz, y);
    puffers.push({ x: fx, y: y + 1.1, z: fz, every: 0.5, size: 0.42, shade: 0.82, drift: new THREE.Vector3(0.25, 0.9, 0.1), spread: 0.2 });
  }

  // barrels and crates by the fire, and sacks by the first tent
  const st = put('stores', 0.67, 0.64, 0.9);
  if (st) {
    const [bx, bz] = st;
    for (const [ox, oz] of [[0, 0], [0.6, 0.12], [0.3, 0.55]]) b.cyl(bx + ox, bz + oz, y, y + 0.72, 0.28, 0.28, 6, 0x7a5a3a, { cap: 0x5e452e });
    b.box(bx - 1.2, y, bz - 0.25, bx - 0.55, y + 0.6, bz + 0.4, 0x9a7d55, { top: 0x8a6e48 });
    b.box(bx - 1.1, y + 0.6, bz - 0.15, bx - 0.65, y + 1.02, bz + 0.3, 0x9a7d55, { top: 0x8a6e48 });
  }
  const sk = put('sacks', 0.27, 0.9, 0.7);
  if (sk) for (const [ox, oz, yaw] of [[0, 0, 0.3], [0.55, -0.2, -0.4], [0.2, -0.55, 1.2]]) b.obox(sk[0] + ox, y + 0.25, sk[1] + oz, 0.32, 0.25, 0.22, yaw, 0xb8a27a, { top: 0xc9b38a });

  // washing on a line between two posts, behind the fire, between the first tent and the pavilion
  const w0 = put('washing', 0.33, 0.14, 0.2), w1 = put('washing', 0.43, 0.14, 0.2);
  if (w0 && w1) {
    const [x0, z0] = w0, [x1, z1] = w1, len = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / len, uz = (z1 - z0) / len;
    for (const [px, pz] of [w0, w1]) b.box(px - 0.06, y, pz - 0.06, px + 0.06, y + 2.0, pz + 0.06, TIMBER);
    b.beam([x0, y + 1.92, z0], [x1, y + 1.92, z1], 0.025, 0.025, 0xe8e4da);
    [0xf3f0e6, 0x7d8fa8, 0xa8896a].forEach((col, i) => {
      const a = 0.12 + i * (len - 0.3) / 3, c = a + (len - 0.3) / 3 - 0.12, yb = y + 1.12 + (i % 2) * 0.18;
      const P = (t: number, h: number, s: number): V3 => [x0 + ux * t - uz * s, h, z0 + uz * t + ux * s];
      b.quad(P(a, yb, 0.02), P(c, yb, 0.02), P(c, y + 1.9, 0.02), P(a, y + 1.9, 0.02), [-uz, 0, ux], col);
      b.quad(P(c, yb, -0.02), P(a, yb, -0.02), P(a, y + 1.9, -0.02), P(c, y + 1.9, -0.02), [uz, 0, -ux], col);
    });
  }

  // people at the camp's north edge, looking up at the lairs, each pointing at the one nearest
  const coats = [0x7a4a3a, 0x4f6a5a, 0x6a6a8a, 0x8a7a50];
  const look = (x: number, z: number): V3 => {
    let target: V3 = [DRAGONMONT.summit[0], DRAGONMONT.top, DRAGONMONT.summit[1]], near = Infinity;
    for (const l of lairs) {
      const [mx, mz] = at2(l, -l.B, 0), d = Math.hypot(mx - x, mz - z);
      if (d < near) { near = d; target = [mx, l.y0 + l.H * 0.6, mz]; }
    }
    return target;
  };
  [[0.45, 0.9], [0.53, 0.86], [0.6, 0.92], [0.78, 0.9]].forEach(([fx, fz], i) => {
    const p = put('gazer', fx, fz, 0.5);
    if (p) gazer(b, p[0], p[1], y, look(p[0], p[1]), coats[i], 0x3a3230);
  });
  for (const [fx, fz] of [[0.3, 0.55], [0.86, 0.55]]) {
    const p = put('person', fx, fz, 0.4);
    if (p) k.person(p[0], p[1], y);
  }
  k.lights.push({ x: S.x0 + W * 0.5, z: S.z0 + Dp * 0.55, r: 9, color: '#ffcf8a', k: 0.45 });
  if (import.meta.env.DEV && missed.length) console.warn(`Dragonmont: the camp of the Sowing had no room for ${missed.join(', ')}.`);
}

// ---------------------------------------------------------------------------
// The region's file
// ---------------------------------------------------------------------------

export const MODELS: Record<string, Model> = {};
export const COVERS: string[] = [];
export const SIGNS: SignDef[] = [];

export function extras(k: Build): void {
  const f = MOUNT;
  if (!f) return;
  const count = (): number => k.b.triangles;
  const cost: [string, number][] = [];
  const counted = (what: string, fn: () => void): void => {
    const before = count();
    try {
      fn();
    } catch (e) {
      console.error(`Dragonmont: ${what} failed.`, e);
    } finally {
      cost.push([what, count() - before]);
    }
  };

  const lairs = lairsNow(), regions = regionsOf(lairs), puffers: Puffer[] = [], taken: Taken = [];
  surface = surfaceOf(f, regions);
  dragonsHere = Object.entries(HOMES)
    .filter(([id, h]) => LENGTH[id] !== undefined && (LAIR_IDS[id] || mountAt(h.x, h.z) > 0))
    .map(([id, h]) => ({ x: h.x, z: h.z, a: (h.facing * Math.PI) / 180, L: LENGTH[id] }));
  MASSES.length = 0;
  FOOT.length = 0;
  let top = 0;
  for (const v of f.y) top = Math.max(top, v);

  // everything at a lair first, lair by lair, as the plan has them, so that what is placed on the slope after keeps off it
  for (const l of lairs) {
    counted(`${l.id}'s mouth`, () => mouth(k, l, puffers));
    counted(`${l.id}'s ledge`, () => ledge(k, l, regions));
  }
  const { vents, ghost } = placeVents(lairs, taken);
  const look: Look = {
    top, lairs,
    vents: [...vents.map((v) => ({ x: v.x, z: v.z, r: 1.3 })), ...(ghost ? [{ x: ghost.x, z: ghost.z, r: 2.0 }] : [])],
    perches: perchesOn().map(({ h, L }) => ({ x: h.x, z: h.z, r: 0.16 * L })),
  };
  counted('the mountain', () => drawMountain(k.b, f, regions, look));
  counted('the crater', () => crater(k, f, lairs, regions));
  counted('the vents', () => {
    const r = rng(2417);
    for (const v of vents) vent(k, v, lairs, puffers, r);
    if (ghost) vent(k, ghost, lairs, puffers, r);
  });
  counted('the crags and scree', () => crags(k, lairs, taken));
  const sheepstealer = lairs.find((l) => l.id === 'sheepstealer');
  if (sheepstealer) counted("Sheepstealer's sheep", () => sheepFold(k, sheepstealer, lairs));
  counted('the camp of the Sowing', () => sowing(k, lairs, puffers));
  puffing(k, puffers);

  if (import.meta.env.DEV) {
    const all = cost.reduce((s, [, n]) => s + n, 0);
    const at = (v: Vent): string => `(${v.x.toFixed(1)}, ${v.z.toFixed(1)}) ${surface(v.x, v.z).toFixed(1)} high, ${fromDragons(v.x, v.z).toFixed(1)} from the nearest dragon`;
    console.info(`Dragonmont: ${all} triangles. ${cost.map(([w, n]) => `${w} ${n}`).join(', ')}.`);
    console.info(`Dragonmont: lairs ${lairs.map((l) => l.id).join(', ')}; Grey Ghost's vent ${ghost ? at(ghost) : 'found no room'}; vents ${vents.map(at).join('; ')}.`);
  }
}

/** How high this file's own rock stands: the rock over each cave's mouth. 0 elsewhere: the mountain's heights are land.ts's. */
export function heightAt(x: number, z: number): number {
  let y = 0;
  for (const m of MASSES) {
    const [u, v] = local(m.l, x, z);
    if (u >= m.u0 && u <= m.u1 && Math.abs(v) <= m.v) y = Math.max(y, m.top);
  }
  return y;
}
