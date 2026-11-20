// King's Landing's walls and towers, the Iron Gate and the River Gate, the
// quays on the Blackwater Rush under the south wall, and the drovers' pen
// inside the Iron Gate.
//
// From the books, as the research note and A Wiki of Ice and Fire's pages give
// them: Aegon the Conqueror had the city walled from 19 AC, and the walls
// stood by 26 AC, high and thick, with seven gates, each a great gatehouse
// with towers of its own. The Rosby road leaves by the Iron Gate, in the
// north-east wall. The River Gate, which the city calls the Mud Gate, opens
// from the fish market onto the wharves along the Rush. The City Watch has
// worn gold cloaks since Prince Daemon gave them, some twenty-five years
// before 129 AC.
//
// The books give the walls' stone no colour and their towers no shape: the
// warm sandstone, the square towers along the walls and the round ones at the
// corners are this tile's own, as are the drovers' pen, where flocks and herds
// wait for the Dragonpit's dragons, and the two further gates that stand shut,
// whose names in 129 AC are not known. Nothing is taken from the television
// series.
//
// Every place and size comes from plan.ts.

import { NO_WIN, interior, rng, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { flat } from '../../engine/ground';
import { figure, type Dress } from '../../engine/parts';
import { drum, face3, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { DOOR, STONE, TIMBER, TIMBER_DARK, banner, brazier, fire, keeper, nameBoard, nameSign, roundTower, squareTower } from './look';
import type { Model } from './models';
import { KEEPERS, LANE, RHAENYS, ROADS, RUSH, TURNS, inside, lotOf, type Lot, type P2 } from './plan';

// ---------------------------------------------------------------------------
// Where things are, all from the plan
// ---------------------------------------------------------------------------

const LN = lotOf('kl-wall-n'), LW = lotOf('kl-wall-w'), LS = lotOf('kl-wall-s'), LE = lotOf('kl-wall-e');
const IG = lotOf('iron-gate'), RG = lotOf('river-gate');

const C = STONE.city, CS = STONE.cityShade;
/** The paler dressed stone round a doorway, and the shadowed stone under an arch. */
const FRAME = 0xdccaa8, SOFFIT = 0x8f7f68;
/** Iron, painted lighter than iron, since thin parts come out dark. */
const IRON = 0x8c9096;
/** The wattle of the drovers' hurdles. */
const WATTLE = 0xa47f4e;
/** What the plan's ground is paved with is the street material's: patches of it are told so. */
const GROUND: WinSpec = { cell: 0, storey: 1, lit: 0, kind: 1 };

/** How high a merlon is: a wall's walk is this far below its lot's top. */
const MERLON = 0.84;

/**
 * Arrow loops. The engine's windows are panes of glass, and on this pale
 * stone they made the walls an office block, so each loop is a narrow slit
 * of its own, a hair proud of its face: dark, and warm where a lamp burns
 * behind it, which glows at night.
 */
const SLIT = 0x3a2b20, SLIT_LIT = 0x5e3d20, LAMPLIT: WinSpec = interior(3.2);
function loop(b: GeoBuilder, x: number, y: number, z: number, nx: number, nz: number, lit: boolean, h = 1.15, w = 0.28): void {
  const ax = -nz, az = nx, o = 0.03;
  const p = (s: number, v: number): V3 => [x + nx * o + ax * s, y + v, z + nz * o + az * s];
  b.quad(p(-w / 2, 0), p(w / 2, 0), p(w / 2, h), p(-w / 2, h), [nx, 0, nz], lit ? SLIT_LIT : SLIT, lit ? { win: LAMPLIT } : {});
}

/**
 * Loops in a square tower that stands out from a wall towards `out`: two in
 * the face that looks out, one high in the face towards the city, and one in
 * each side where it stands clear of the wall.
 */
function towerSlits(b: GeoBuilder, x: number, z: number, r: number, walk: number, out: P2, n = 0): void {
  const hi = walk - 3.8, lo = Math.max(1.6, walk - 7.8);
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([nx, nz], i) => {
    const facing = nx * out[0] + nz * out[1], lit = (i + n) % 3 === 0;
    if (facing > 0.5) {
      loop(b, x + nx * r, hi, z + nz * r, nx, nz, lit);
      loop(b, x + nx * r, lo, z + nz * r, nx, nz, !lit && (i + n) % 2 === 1);
    } else if (facing < -0.5) {
      loop(b, x + nx * r, hi, z + nz * r, nx, nz, lit);
    } else {
      loop(b, x + nx * r + out[0] * 0.85, hi, z + nz * r + out[1] * 0.85, nx, nz, lit);
    }
  });
}

/** A gold cloak of the City Watch: dark mail and a cloak of gold. */
const GOLD_CLOAK: Dress = { coat: 0xd9a92e, legs: 0x3c3c42, hat: 0xa3a9ae, hatH: 0.3 };

/**
 * One of the four walls: which way it runs, from where to where, its inner
 * and outer faces across it, how high its merlons stand, and where along it
 * the ground inside is the Dragonpit's terrace, which it is the parapet of.
 */
interface Side {
  axis: 'x' | 'z';
  a0: number; a1: number;
  inner: number; outer: number;
  top: number;
  terrace?: [number, number];
  /** How far apart its merlons are. */
  spacing: number;
}

const sideOf = (l: Lot): Side => {
  // the north wall is behind the city from the opening view, and the west wall's outer face is never seen from it: their merlons stand wider apart
  if (l.id === 'kl-wall-n') return { axis: 'x', a0: l.x0, a1: l.x1, inner: l.z1, outer: l.z0, top: l.top, spacing: 2.8 };
  if (l.id === 'kl-wall-s') return { axis: 'x', a0: l.x0, a1: l.x1, inner: l.z0, outer: l.z1, top: l.top, spacing: 2.0 };
  if (l.id === 'kl-wall-w') return { axis: 'z', a0: l.z0, a1: l.z1, inner: l.x1, outer: l.x0, top: l.top, spacing: 2.6, terrace: [RHAENYS.apronW.z0, RHAENYS.apronW.z1] };
  return { axis: 'z', a0: l.z0, a1: l.z1, inner: l.x0, outer: l.x1, top: l.top, spacing: 2.0, terrace: [RHAENYS.apronE.z0, RHAENYS.apronE.z1] };
};
const NORTH = sideOf(LN), WEST = sideOf(LW), SOUTH = sideOf(LS), EAST = sideOf(LE);

const outOf = (s: Side): number => Math.sign(s.outer - s.inner);
/** The way out from a wall, as a direction on the ground. */
const outward = (s: Side): P2 => (s.axis === 'x' ? [0, outOf(s)] : [outOf(s), 0]);
/** A place on a wall, by how far along it, how far across it, and how high. */
const onWall = (s: Side, a: number, c: number, y: number): V3 => (s.axis === 'x' ? [a, y, c] : [c, y, a]);
/** The way across a wall, as a normal. */
const acrossN = (s: Side, d: number): V3 => (s.axis === 'x' ? [0, 0, d] : [d, 0, 0]);

/**
 * Where a wall is broken by a tower or a gate: `v0` to `v1` along it is
 * hidden behind it, and the stretches of wall either side run into it as far
 * as `b0` and `b1`, so that no seam shows.
 */
interface Stop { v0: number; v1: number; b0: number; b1: number }

/** A square tower on a wall, `half` either side of `at` along it, its body running 0.2 into the wall's ends. */
const square = (at: number, half: number, flush = false): Stop => ({ v0: at - half, v1: at + half, b0: at - half + (flush ? 0 : 0.2), b1: at + half - (flush ? 0 : 0.2) });

/** A round tower at a corner, its middle at (x, z), seen from one of the two walls that meet in it. */
function roundStop(s: Side, x: number, z: number, r: number): Stop {
  const [ca, cc] = s.axis === 'x' ? [x, z] : [z, x], R = r * Math.cos(Math.PI / 10);
  const chord = (c: number): number => Math.sqrt(Math.max(0, R * R - (c - cc) ** 2));
  const near = Math.min(chord(s.inner), chord(s.outer)), far = Math.max(chord(s.inner), chord(s.outer), chord(s.outer - outOf(s) * 0.42));
  return { v0: ca - far, v1: ca + far, b0: ca - near + 0.25, b1: ca + near - 0.25 };
}

/** Points that cut the way from `a` to `b` into stretches of about `span`. */
function between(a: number, b: number, span: number): number[] {
  const n = Math.max(1, Math.round(Math.abs(b - a) / span));
  return Array.from({ length: n - 1 }, (_, i) => a + ((b - a) * (i + 1)) / n);
}

// --- the corners, the ends, the towers along each wall and the shut gates ---

/** The round towers at three corners: on both walls' middle lines, set out a little beyond them. */
const CORNER = { r: 2.3, out: 0.4 };
const NW: P2 = [(LW.x0 + LW.x1) / 2 - CORNER.out, (LN.z0 + LN.z1) / 2 - CORNER.out];
const NE: P2 = [(LE.x0 + LE.x1) / 2 + CORNER.out, (LN.z0 + LN.z1) / 2 - CORNER.out];
const SW: P2 = [(LW.x0 + LW.x1) / 2 - CORNER.out, (LS.z0 + LS.z1) / 2 + CORNER.out];

/** A tower along a wall is this wide, stands 0.2 proud of its inner face and out beyond its outer face. */
const TOWER = { half: 1.6 };
/** The middle of a tower along a wall, across it. */
const towerAcross = (s: Side): number => s.inner - outOf(s) * 0.2 + outOf(s) * TOWER.half;
/** How high a tower's walk is: its merlons stand 0.8 over it, 2 over the wall's own, and at most 11. */
const towerWalkOf = (s: Side): number => s.top + 1.2;

/**
 * Where the west wall runs on past the corner down towards the river, it ends
 * in a tower of its own, its inner face in line with the wall's: the turning
 * ring at the quays' west end leaves it no room to stand proud.
 */
const SPUR = { x: LW.x1 - 1.4, z: LW.z1 - 2, r: 1.4 };
/** The south wall ends in a tower at Aegon's strand, and the east wall at the foot of Aegon's High Hill: along each, the middle of its last tower. */
const SOUTH_END = LS.x1 - 1.5, EAST_END = LE.z1 - TOWER.half;

/**
 * The two gates that stand shut, each a door between two towers: in the north
 * wall at the lane between two blocks of houses, and in the west wall at the
 * square under the Dragonpit's terrace.
 */
const SHUT = { north: (lotOf('h-n1').x1 + lotOf('h-n2').x0) / 2, west: (RHAENYS.apronW.z1 + lotOf('h-w2').z0) / 2, apart: 3.3 };

// ---------------------------------------------------------------------------
// The two gates the roads use
// ---------------------------------------------------------------------------

/**
 * A gatehouse in its own frame: `u` runs along the way through, outwards from
 * the wall's middle line, and `v` across it. The way is `half` to either side
 * of the road's middle, under an arch that springs at `spring` and rises
 * `rise`. Its inner face is at `u0` and its towers' fronts at `u2`; the arch's
 * outer face stands `front` back from them, under a bridge between the towers.
 */
interface Gate {
  x: number; z: number; yaw: number;
  half: number; spring: number; rise: number;
  u0: number; u2: number; front: number;
  /** How wide each tower is, across the way. */
  tw: number;
  /** The walk over the arch, and the towers' walk. */
  walk: number; towerWalk: number;
  portcullis?: boolean;
}

/** The Iron Gate, across the east wall where the Rosby road goes through it. */
const IRON_GATE: Gate = (() => {
  const x = (LE.x0 + LE.x1) / 2, [a, c] = ROADS.rosby, z = a[1] + ((c[1] - a[1]) * (x - a[0])) / (c[0] - a[0]);
  return { x, z, yaw: 0, half: 5, spring: 5.4, rise: 3, u0: IG.x0 + 0.4 - x, u2: IG.x1 - 0.4 - x, front: 1.35, tw: 2.75, walk: IG.top - 1.6, towerWalk: IG.top - 0.84, portcullis: true };
})();

/** The River Gate, across the south wall where the Street of the Sisters comes down to the quays. */
const RIVER_GATE: Gate = (() => {
  const x = ROADS.sisters[0][0], z = (LS.z0 + LS.z1) / 2;
  return { x, z, yaw: Math.PI / 2, half: 5, spring: 5, rise: 2.8, u0: RG.z0 + 0.4 - z, u2: RG.z1 + 0.6 - z, front: 1.15, tw: 3.4, walk: RG.top - 1.6, towerWalk: RG.top - 0.84 };
})();

/** Where a place in a gate's frame is on the board. */
const gateAt = (g: Gate, u: number, v: number): P2 => [g.x + u * Math.cos(g.yaw) - v * Math.sin(g.yaw), g.z + u * Math.sin(g.yaw) + v * Math.cos(g.yaw)];

/** The stretch of its wall a gate stands across, along the wall. */
const gateStop = (g: Gate, along: number): Stop => {
  const t = g.half + g.tw;
  return { v0: along - t, v1: along + t, b0: along - t + 0.2, b1: along + t - 0.2 };
};

// --- the stops along each wall, in order ---

const STOPS: Record<'n' | 'w' | 's' | 'e', Stop[]> = (() => {
  const sq = (at: number): Stop => square(at, TOWER.half);
  const n: Stop[] = [roundStop(NORTH, NW[0], NW[1], CORNER.r)];
  n.push(...between(NW[0], SHUT.north - SHUT.apart, 20).map(sq), sq(SHUT.north - SHUT.apart), sq(SHUT.north + SHUT.apart));
  n.push(...between(SHUT.north + SHUT.apart, NE[0], 20).map(sq), roundStop(NORTH, NE[0], NE[1], CORNER.r));

  const w: Stop[] = [roundStop(WEST, NW[0], NW[1], CORNER.r)];
  w.push(...between(NW[1], SHUT.west - SHUT.apart, 22).map(sq), sq(SHUT.west - SHUT.apart), sq(SHUT.west + SHUT.apart));
  w.push(...between(SHUT.west + SHUT.apart, SW[1], 22).map(sq), roundStop(WEST, SW[0], SW[1], CORNER.r), square(SPUR.z, SPUR.r, true));

  const rg = gateStop(RIVER_GATE, RIVER_GATE.x), rw = rg.v0 + RIVER_GATE.tw / 2, re = rg.v1 - RIVER_GATE.tw / 2;
  const s: Stop[] = [roundStop(SOUTH, SW[0], SW[1], CORNER.r), ...between(SW[0], rw, 20).map(sq), rg];
  s.push(...between(re, SOUTH_END, 20).map(sq), sq(SOUTH_END));

  const ig = gateStop(IRON_GATE, IRON_GATE.z), is = ig.v1 - IRON_GATE.tw / 2;
  const e: Stop[] = [roundStop(EAST, NE[0], NE[1], CORNER.r), ig, ...between(is, EAST_END, 19).map(sq), sq(EAST_END)];
  return { n, w, s, e };
})();

// ---------------------------------------------------------------------------
// Parts of the walls
// ---------------------------------------------------------------------------

/** Merlons along an edge that runs along x (or z) from `a0` to `a1`, between `c0` and `c1` across, standing on `y`. */
function merlonRow(b: GeoBuilder, axis: 'x' | 'z', a0: number, a1: number, c0: number, c1: number, y: number, spacing: number, h = MERLON): void {
  if (a1 - a0 < 0.8) return;
  const lo = Math.min(c0, c1), hi = Math.max(c0, c1), n = Math.max(1, Math.round((a1 - a0) / spacing)), seg = (a1 - a0) / n, o = { top: CS, faces: 'NESWT' };
  for (let i = 0; i < n; i++) {
    const p = a0 + seg * (i + 0.2), q = a0 + seg * (i + 0.8);
    if (axis === 'x') b.box(p, y, lo, q, y + h, hi, C, o);
    else b.box(lo, y, p, hi, y + h, q, C, o);
  }
}

/** Merlons round the edge of a level top: one at each corner, and others between them. */
function crown(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, spacing = 2.4, h = 0.8): void {
  const m = 0.45, o = { top: CS, faces: 'NESWT' };
  for (const [x, z] of [[x0, z0], [x1 - m, z0], [x0, z1 - m], [x1 - m, z1 - m]]) b.box(x, y, z, x + m, y + h, z + m, C, o);
  const fill = (a0: number, a1: number, place: (p: number, q: number) => void): void => {
    const free = a1 - a0 - 2 * m, n = Math.round(free / spacing);
    for (let i = 0; i < n; i++) {
      const c = a0 + m + (free * (i + 0.5)) / n;
      place(c - 0.3, c + 0.3);
    }
  };
  fill(x0, x1, (p, q) => {
    b.box(p, y, z0, q, y + h, z0 + 0.4, C, o);
    b.box(p, y, z1 - 0.4, q, y + h, z1, C, o);
  });
  fill(z0, z1, (p, q) => {
    b.box(x0, y, p, x0 + 0.4, y + h, q, C, o);
    b.box(x1 - 0.4, y, p, x1, y + h, q, C, o);
  });
}

/**
 * A stretch of curtain wall from `b0` to `b1` along it: its outer face with a
 * row of loops, its inner face from the ground (or from the Dragonpit's
 * terrace, where the wall is the terrace's parapet) up to a low parapet on the
 * walk's inner edge, the walk, and merlons along the outer edge from `m0` to
 * `m1`, between the towers it runs into.
 */
function curtain(b: GeoBuilder, s: Side, b0: number, b1: number, m0: number, m1: number): void {
  if (b1 - b0 < 0.05) return;
  const out = outOf(s), walk = s.top - MERLON, pt = walk + 0.42, pIn = s.inner + out * 0.3;
  const P = (a: number, c: number, y: number): V3 => onWall(s, a, c, y);
  b.quad(P(b0, s.outer, 0), P(b1, s.outer, 0), P(b1, s.outer, walk), P(b0, s.outer, walk), acrossN(s, out), C, { L: b1 - b0 });
  const loops = Math.max(0, Math.round((m1 - m0 - 1.6) / 4.2)), [nx, , nz] = acrossN(s, out);
  for (let i = 0; i < loops; i++) {
    const a = m0 + ((m1 - m0) * (i + 0.5)) / loops, [x, , z] = P(a, s.outer, 0);
    loop(b, x, walk - 2.75, z, nx, nz, Math.round(a * 7.3) % 3 === 0);
  }
  const cuts = [b0, ...(s.terrace ?? []).filter((t) => t > b0 + 0.01 && t < b1 - 0.01), b1];
  for (let i = 0; i + 1 < cuts.length; i++) {
    const p = cuts[i], q = cuts[i + 1], m = (p + q) / 2, y0 = s.terrace && m > s.terrace[0] && m < s.terrace[1] ? RHAENYS.y : 0;
    b.quad(P(p, s.inner, y0), P(q, s.inner, y0), P(q, s.inner, pt), P(p, s.inner, pt), acrossN(s, -out), C, { L: q - p });
  }
  b.quad(P(b0, pIn, walk), P(b1, pIn, walk), P(b1, pIn, pt), P(b0, pIn, pt), acrossN(s, out), C);
  b.quad(P(b0, s.inner, pt), P(b1, s.inner, pt), P(b1, pIn, pt), P(b0, pIn, pt), [0, 1, 0], CS);
  b.quad(P(b0, pIn, walk), P(b1, pIn, walk), P(b1, s.outer, walk), P(b0, s.outer, walk), [0, 1, 0], CS);
  merlonRow(b, s.axis, m0, m1, s.outer - out * 0.42, s.outer, walk, s.spacing);
}

/** A round tower at a corner, with corbels under its fighting top so that it is closed from below. */
function cornerTower(b: GeoBuilder, x: number, z: number, walk: number): void {
  const r = CORNER.r, flare = 0.22, sides = 10;
  roundTower(b, x, z, r, walk, C, { shade: CS, sides, flare, win: NO_WIN });
  b.cyl(x, z, walk - 1.45, walk - 1, r, r + flare, sides, CS, { cap: false });
  // loops in its faces, high and low by turns
  const apothem = r * Math.cos(Math.PI / sides);
  for (let i = 1; i <= sides; i++) {
    const a = (2 * Math.PI * i) / sides, nx = Math.cos(a), nz = Math.sin(a);
    loop(b, x + nx * apothem, i % 2 ? walk - 7.8 : walk - 3.8, z + nz * apothem, nx, nz, i % 3 === 0);
  }
}

/**
 * A door that stands shut in a wall's face: a ring of paler stone and an
 * arched door of oak, each a hair proud of the face, with two iron straps.
 */
function shutDoor(b: GeoBuilder, s: Side, at: number, face: number, dir: number, w: number, h: number): void {
  const P = (u: number, y: number, d: number): V3 => onWall(s, u, face + dir * d, y), n = acrossN(s, dir);
  for (const [ww, hh, d, col] of [[w + 0.6, h + 0.3, 0.04, FRAME], [w, h, 0.08, DOOR]]) {
    const r = ww / 2, spring = hh - r;
    b.quad(P(at - r, 0, d), P(at + r, 0, d), P(at + r, spring, d), P(at - r, spring, d), n, col);
    for (let i = 0; i < 6; i++) {
      const a0 = (Math.PI * i) / 6, a1 = (Math.PI * (i + 1)) / 6;
      face3(b, P(at, spring, d), P(at + Math.cos(a0) * r, spring + Math.sin(a0) * r, d), P(at + Math.cos(a1) * r, spring + Math.sin(a1) * r, d), n, col);
    }
  }
  for (const y of [0.8, h - 1.7]) b.quad(P(at - w / 2 + 0.12, y, 0.1), P(at + w / 2 - 0.12, y, 0.1), P(at + w / 2 - 0.12, y + 0.22, 0.1), P(at - w / 2 + 0.12, y + 0.22, 0.1), n, IRON);
}

/** Watchmen on a wall's walk, at shares of its length, kept out of its towers. */
function watch(k: Build, s: Side, stops: Stop[], shares: number[]): void {
  const out = outOf(s), c = (s.inner + out * 0.3 + s.outer) / 2, walk = s.top - MERLON;
  for (const f of shares) {
    const a = s.a0 + (s.a1 - s.a0) * f;
    if (stops.some((t) => a > t.v0 - 0.8 && a < t.v1 + 0.8)) continue;
    const [x, , z] = onWall(s, a, c, 0);
    k.person(x, z, walk);
  }
}

/**
 * One of the four walls: its stretches between its stops, the square towers
 * among those stops, and its watchmen. The corners, the gates and the ends
 * are built by whoever owns them.
 */
function wall(k: Build, s: Side, stops: Stop[], towers: number[], watchmen: number[], torches: number[] = []): void {
  for (let i = 0; i + 1 < stops.length; i++) curtain(k.b, s, stops[i].b1, stops[i + 1].b0, stops[i].v1, stops[i + 1].v0);
  const across = towerAcross(s), walk = towerWalkOf(s), out = outOf(s);
  towers.forEach((a, i) => {
    const [x, , z] = onWall(s, a, across, 0);
    squareTower(k.b, x, z, TOWER.half, walk, C, { shade: CS, win: NO_WIN });
    towerSlits(k.b, x, z, TOWER.half, walk, outward(s), i);
    // a torch on the face of a few, where the watch keeps a post
    if (torches.includes(i)) {
      const [tx, , tz] = onWall(s, a + 0.9, across + out * (TOWER.half + 0.22), 0);
      fire(k, tx, walk - 5, tz, 0.22, 7);
    }
  });
  watch(k, s, stops, watchmen);
}

/** The middles of the square towers along a wall: every stop that is a tower of TOWER's size. */
const towersOf = (stops: Stop[]): number[] => stops.filter((t) => Math.abs(t.v1 - t.v0 - 2 * TOWER.half) < 1e-6).map((t) => (t.v0 + t.v1) / 2);

/** A gate that stands shut, between two of a wall's towers: its door on both faces, and a torch either side outside. */
function shutGate(k: Build, s: Side, at: number): void {
  const out = outOf(s);
  shutDoor(k.b, s, at, s.outer, out, 2.2, 3.7);
  shutDoor(k.b, s, at, s.inner, -out, 2.0, 3.3);
  for (const d of [-1.52, 1.52]) {
    const [x, , z] = onWall(s, at + d, s.outer + out * 0.22, 0);
    fire(k, x, 3.9, z, 0.22, 6);
  }
}

// ---------------------------------------------------------------------------
// The walls, as models of their lots
// ---------------------------------------------------------------------------

function northWall(k: Build, l: Lot): void {
  const s = sideOf(l), walk = towerWalkOf(s);
  wall(k, s, STOPS.n, towersOf(STOPS.n), [0.12, 0.47, 0.8]);
  cornerTower(k.b, NW[0], NW[1], walk);
  shutGate(k, s, SHUT.north);
}

function westWall(k: Build, l: Lot): void {
  const s = sideOf(l);
  wall(k, s, STOPS.w, towersOf(STOPS.w), [0.06, 0.29, 0.52, 0.65, 0.84]);
  // the tower at the end of the wall's run down towards the river
  squareTower(k.b, SPUR.x, SPUR.z, SPUR.r, towerWalkOf(s), C, { shade: CS, win: NO_WIN });
  towerSlits(k.b, SPUR.x, SPUR.z, SPUR.r, towerWalkOf(s), outward(s), 1);
  shutGate(k, s, SHUT.west);
}

function southWall(k: Build, l: Lot): void {
  const s = sideOf(l);
  wall(k, s, STOPS.s, towersOf(STOPS.s), [0.1, 0.3, 0.62, 0.86], [0, 1]);
  // the corner over the quays' west end is as tall as the land walls' towers
  cornerTower(k.b, SW[0], SW[1], towerWalkOf(WEST));
  banner(k.b, SW[0], SW[1], towerWalkOf(WEST), 'targaryen', 3.6);
  // a brazier on the walk west of the River Gate
  brazier(k, RIVER_GATE.x - 15, (s.inner + s.outer) / 2 + 0.15, s.top - MERLON);
}

function eastWall(k: Build, l: Lot): void {
  const s = sideOf(l), walk = towerWalkOf(s);
  wall(k, s, STOPS.e, towersOf(STOPS.e), [0.24, 0.38, 0.52, 0.66, 0.8, 0.93], [1, 3, 5]);
  cornerTower(k.b, NE[0], NE[1], walk);
  banner(k.b, towerAcross(s), EAST_END, walk, 'targaryen', 3.6);
  brazier(k, (s.inner + s.outer) / 2 + 0.15, IRON_GATE.z + 12, s.top - MERLON);
}

// ---------------------------------------------------------------------------
// The gatehouses
// ---------------------------------------------------------------------------

/**
 * A gatehouse over a road: a tower either side of the way, with loops and a
 * corbelled top with merlons; between them the arch, its soffit, and a walk
 * over it; before the arch, a bridge between the towers' fronts; inside, the
 * doors of iron-bound oak standing open against the walls of the way, and for
 * the Iron Gate its portcullis, drawn up. Torches burn either side of the way
 * outside and in, and the Watch keeps it.
 */
function gatehouse(k: Build, g: Gate): void {
  const b = k.b, h = g.half, t = h + g.tw, u1 = g.u2 - g.front, top = g.spring + g.rise, bridge = top + 0.6;
  const hi = g.towerWalk - 3.8, lo = g.towerWalk - 7.8;
  b.moved(g.x, 0, g.z, g.yaw, () => {
    for (const s of [-1, 1]) {
      // in this frame N is towards -v and S towards +v
      const v0 = s < 0 ? -t : h, v1 = s < 0 ? -h : t, vm = s * (h + g.tw / 2);
      b.box(g.u0, 0, v0, g.u2, g.towerWalk - 1, v1, C, { faces: 'NESW' });
      b.box(g.u0 - 0.2, g.towerWalk - 1, v0 - 0.2, g.u2 + 0.2, g.towerWalk, v1 + 0.2, C, { top: CS, faces: 'NESWTB' });
      crown(b, g.u0 - 0.2, v0 - 0.2, g.u2 + 0.2, v1 + 0.2, g.towerWalk);
      // its loops: two in its front, one in its back, and one in its far side where the wall leaves it
      loop(b, g.u2, hi, vm, 1, 0, s > 0);
      loop(b, g.u2, lo, vm, 1, 0, s < 0);
      loop(b, g.u0, hi, vm, -1, 0, s < 0);
      loop(b, (0.75 + g.u2) / 2, hi, s * t, 0, s, s > 0);
    }
    // the arch: its face on the city's side up to the walk, its face outside up to the bridge, and its soffit
    const n = 10, arc = (i: number): [number, number] => {
      const a = Math.PI * (1 - i / n);
      return [Math.cos(a) * h, g.spring + Math.sin(a) * g.rise];
    };
    for (let i = 0; i < n; i++) {
      const [va, ya] = arc(i), [vb, yb] = arc(i + 1);
      b.quad([g.u0, ya, va], [g.u0, yb, vb], [g.u0, g.walk, vb], [g.u0, g.walk, va], [-1, 0, 0], C);
      b.quad([u1, ya, va], [u1, yb, vb], [u1, bridge, vb], [u1, bridge, va], [1, 0, 0], C);
      const m = Math.PI * (1 - (i + 0.5) / n), nv = -Math.cos(m) / h, ny = -Math.sin(m) / g.rise, l = Math.hypot(nv, ny);
      b.quad([g.u0, ya, va], [g.u0, yb, vb], [u1, yb, vb], [u1, ya, va], [0, ny / l, nv / l], SOFFIT);
    }
    // the bridge between the towers' fronts: its face and its underside; and the walk over it and the arch
    b.quad([g.u2, bridge, -h], [g.u2, bridge, h], [g.u2, g.walk, h], [g.u2, g.walk, -h], [1, 0, 0], C);
    b.quad([u1, bridge, -h], [g.u2, bridge, -h], [g.u2, bridge, h], [u1, bridge, h], [0, -1, 0], SOFFIT);
    b.quad([g.u0, g.walk, -h], [g.u2, g.walk, -h], [g.u2, g.walk, h], [g.u0, g.walk, h], [0, 1, 0], CS);
    merlonRow(b, 'z', -h + 0.3, h - 0.3, g.u0, g.u0 + 0.42, g.walk, 1.9);
    merlonRow(b, 'z', -h + 0.3, h - 0.3, g.u2 - 0.42, g.u2, g.walk, 1.9);
    // the doors, standing open against the walls of the way, each with three iron straps on its face
    const len = Math.min(h - 0.3, u1 - g.u0 - 0.7), dh = g.spring - 0.15, ua = g.u0 + 0.35, ub = ua + len;
    for (const s of [-1, 1]) {
      const d0 = s > 0 ? h - 0.24 : -h + 0.02, d1 = s > 0 ? h - 0.02 : -h + 0.24, f = s > 0 ? d0 - 0.02 : d1 + 0.02;
      b.box(ua, 0, d0, ub, dh, d1, DOOR, { faces: (s > 0 ? 'N' : 'S') + 'EWT', top: TIMBER_DARK });
      for (const y of [0.8, dh / 2 - 0.1, dh - 1.0]) b.quad([ua + 0.12, y, f], [ub - 0.12, y, f], [ub - 0.12, y + 0.26, f], [ua + 0.12, y + 0.26, f], [0, 0, -s], IRON);
    }
    if (g.portcullis) {
      // drawn up into its slot behind the outer arch: only its foot shows under the crown
      const u = u1 - 0.32, low = top - 0.95, archY = (v: number): number => g.spring + g.rise * Math.sqrt(Math.max(0, 1 - (v / h) ** 2));
      for (let i = -3; i <= 3; i++) {
        const v = i * 1.1, y1 = archY(v);
        if (y1 - low < 0.3) continue;
        b.box(u - 0.07, low - 0.3, v - 0.07, u + 0.07, y1, v + 0.07, IRON, { faces: 'NESWB' });
      }
      const reach = h * Math.sqrt(Math.max(0, 1 - ((low + 0.14 - g.spring) / g.rise) ** 2)) - 0.1;
      b.box(u - 0.06, low, -reach, u + 0.06, low + 0.14, reach, IRON, { faces: 'NESWB' });
    }
    // the king's banner over the tower on the left hand going out, and the Watch at the way out
    banner(b, (g.u0 + g.u2) / 2, -(h + g.tw / 2), g.towerWalk, 'targaryen', 3.6);
    for (const s of [-1, 1]) figure(b, g.u2 - 0.45, s * (h - 0.45), 0, GOLD_CLOAK);
  });
  for (const s of [-1, 1]) {
    const [ox, oz] = gateAt(g, g.u2 + 0.15, s * (h + 0.75));
    fire(k, ox, 4.7, oz, 0.24, 8);
    const [ix, iz] = gateAt(g, g.u0 - 0.15, s * (h + 0.75));
    fire(k, ix, 4.7, iz, 0.22, 6);
    const [px, pz] = gateAt(g, (g.u0 + g.u2) / 2, s * 1.6);
    k.person(px, pz, g.walk);
  }
}

function ironGate(k: Build, l: Lot): void {
  gatehouse(k, IRON_GATE);
  // its name, beside the Rosby road outside the gate, where the view the tile opens with reads it
  const [, c] = ROADS.rosby, x = l.x1 + 3.2, zRoad = IRON_GATE.z + ((c[1] - IRON_GATE.z) * (x - IRON_GATE.x)) / (c[0] - IRON_GATE.x);
  nameBoard(k, SIGN.iron, x, zRoad + LANE + 2.1, 0, [0, 0, 1], 1.0);
}

function riverGate(k: Build, _l: Lot): void {
  gatehouse(k, RIVER_GATE);
}

// ---------------------------------------------------------------------------
// The drovers' pen, inside the Iron Gate
// ---------------------------------------------------------------------------

/** How far a place is from the nearest edge of an outline. */
function toEdge(shape: P2[], x: number, z: number): number {
  let d = Infinity;
  shape.forEach((a, i) => {
    const c = shape[(i + 1) % shape.length], vx = c[0] - a[0], vz = c[1] - a[1], l = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l));
    d = Math.min(d, Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t));
  });
  return d;
}

/**
 * A fence of hurdles round an outline: wattle panels between posts, with a
 * way in left open in the middle of edge `gate`.
 */
function hurdles(b: GeoBuilder, shape: P2[], gate: number): void {
  const post = (x: number, z: number): void => b.beam([x, 0, z], [x, 1.22, z], 0.075, 0.07, TIMBER_DARK);
  shape.forEach((a, i) => {
    const c = shape[(i + 1) % shape.length], len = Math.hypot(c[0] - a[0], c[1] - a[1]), dx = (c[0] - a[0]) / len, dz = (c[1] - a[1]) / len, yaw = Math.atan2(dz, dx);
    const runs: [number, number][] = i === gate ? [[0, len / 2 - 0.75], [len / 2 + 0.75, len]] : [[0, len]];
    for (const [s0, s1] of runs) {
      const n = Math.max(1, Math.ceil((s1 - s0) / 3.6)), seg = (s1 - s0) / n;
      for (let j = 0; j < n; j++) {
        const m = s0 + seg * (j + 0.5);
        b.obox(a[0] + dx * m, 0.55, a[1] + dz * m, seg / 2 - 0.09, 0.5, 0.05, yaw, WATTLE, { top: 0x8f6c40 });
        post(a[0] + dx * (s0 + seg * j), a[1] + dz * (s0 + seg * j));
      }
      // the post at a corner is the next edge's first; one at the way in is this run's own
      if (s1 < len - 0.01) post(a[0] + dx * s1, a[1] + dz * s1);
    }
  });
}

/** A sheep standing: a woolly body and a dark head, facing `yaw`. */
function sheep(b: GeoBuilder, x: number, z: number, yaw: number, wool: number): void {
  b.obox(x, 0.44, z, 0.48, 0.31, 0.3, yaw, wool, { faces: 'B' });
  b.obox(x + Math.cos(yaw) * 0.58, 0.64, z + Math.sin(yaw) * 0.58, 0.16, 0.15, 0.13, yaw, 0x2f2a28);
}

/** A beast of the herd: its legs, its body, its head and a pair of pale horns, facing `yaw`. */
function cow(b: GeoBuilder, x: number, z: number, yaw: number, hide: number): void {
  const fx = Math.cos(yaw), fz = Math.sin(yaw);
  b.obox(x, 0.24, z, 0.62, 0.24, 0.24, yaw, 0x3a302a);
  b.obox(x, 0.84, z, 0.8, 0.38, 0.34, yaw, hide, { faces: 'B' });
  b.obox(x + fx * 0.98, 1.04, z + fz * 0.98, 0.22, 0.2, 0.17, yaw, hide);
  b.obox(x + fx * 0.94, 1.27, z + fz * 0.94, 0.04, 0.04, 0.3, yaw, 0xe6dcc4);
}

function droversPen(k: Build, l: Lot): void {
  const b = k.b, r = rng(1291), ring = TURNS.pen, [cx, cz] = ring.c;
  // the ring's paving reaches this far from its middle; the pens keep clear of it
  const clear = ring.r + (LANE + 1.2) / 2 + 0.45;
  const at = (deg: number): P2 => [cx + Math.cos((deg * Math.PI) / 180) * clear, cz + Math.sin((deg * Math.PI) / 180) * clear];
  // the pens reach a little north of the yard, towards the wall
  const zN = l.z0 - 1.4, xW = l.x0 + 0.8;
  const [ra, rb] = ROADS.rosby, roadZ = (x: number): number => ra[1] + ((rb[1] - ra[1]) * (x - ra[0])) / (rb[0] - ra[0]);
  const sheepPen: P2[] = [[xW, zN], [cx + 0.8, zN], at(250), at(225), at(200), [xW, cz - 1]];
  const x0 = cx + 4, x1 = l.x1 - 0.4, zS = Math.min(roadZ(x0), roadZ(x1)) - LANE - 0.5;
  const cattlePen: P2[] = [[x0, zN], [x1, zN], [x1, zS], [x0, zS]];
  for (const [pen, ground] of [[sheepPen, 0xb9a676], [cattlePen, 0xa08d64]] as [P2[], number][]) {
    flat(k.street, pen, 0.04, ground, { win: GROUND });
    hurdles(b, pen, 3);
  }

  // the flock and the herd, each beast where there is room for it
  const wool = [0xece6d6, 0xe2dccb, 0xd9d1bd, 0xece6d6, 0x3a3532];
  const fill = (shape: P2[], count: number, edge: number, apart: number, taken: P2[], put: (x: number, z: number, yaw: number, i: number) => void): void => {
    const xs = shape.map((p) => p[0]), zs = shape.map((p) => p[1]);
    for (let i = 0, tries = 0; i < count && tries < 400; tries++) {
      const x = Math.min(...xs) + r() * (Math.max(...xs) - Math.min(...xs)), z = Math.min(...zs) + r() * (Math.max(...zs) - Math.min(...zs));
      if (!inside(shape, x, z) || toEdge(shape, x, z) < edge || taken.some(([px, pz]) => Math.hypot(px - x, pz - z) < apart)) continue;
      taken.push([x, z]);
      put(x, z, r() * Math.PI * 2, i++);
    }
  };
  // two of the herd in the west of the big pen, where the view the tile opens with sees them, and the flock round them;
  // the cattle pen inside the gate is behind the gatehouse from there
  const herd: [number, number, number, number][] = [[xW + 1.6, zN + 1.0, 0, 0x7a5034], [xW + 1.8, zN + 2.2, Math.PI, 0x8a4a2c]];
  const taken: P2[] = herd.flatMap(([x, z]) => [[x - 0.7, z], [x, z], [x + 0.7, z]] as P2[]);
  for (const [x, z, yaw, hide] of herd) cow(b, x, z, yaw, hide);
  fill(sheepPen, 8, 0.72, 1.15, taken, (x, z, yaw, i) => sheep(b, x, z, yaw, wool[i % wool.length]));
  // a trough along the cattle pen's east side, with two of the herd at it
  b.box(x1 - 0.75, 0, zN + 0.5, x1 - 0.2, 0.46, zN + 2.3, TIMBER, { top: 0x6f9cb2 });
  cow(b, x1 - 2.2, zN + 0.8, 0, 0x3d332c);
  cow(b, x1 - 2.2, zN + 1.95, 0, 0xb98d5c);

  // hay for them in the yard's south-west corner, and a brazier
  for (const [x, z, y] of [[l.x0 + 1.2, l.z1 - 1.3, 0], [l.x0 + 2.2, l.z1 - 1.1, 0], [l.x0 + 1.7, l.z1 - 1.2, 0.5]]) b.box(x - 0.45, y, z - 0.28, x + 0.45, y + 0.5, z + 0.28, 0xd2b866, { top: 0xdcc679 });
  brazier(k, l.x0 + 0.6, cz + 0.6);

  // the Dragonkeeper who chooses for the pit, at the sheep pen; drovers with their crooks, and a dog
  const K = KEEPERS[7];
  keeper(b, K.x, K.z, K.y, K.facing);
  for (const [x, z] of [[cx + 1.6, zN + 0.9], [l.x1 - 1.6, l.z1 - 1.2], [l.x0 + 0.9, l.z1 - 3.4]] as P2[]) {
    k.person(x, z);
    b.beam([x + 0.62, 0, z + 0.25], [x + 0.62, 2.6, z + 0.25], 0.04, 0.04, 0x9a7a52);
  }
  b.obox(cx + 2.6, 0.32, zN + 1.1, 0.36, 0.2, 0.13, 0.4, 0x2b2622, { faces: 'B' });
  b.obox(cx + 3.0, 0.52, zN + 1.26, 0.13, 0.12, 0.1, 0.4, 0x2b2622, { faces: 'B' });
  k.lights.push({ x: cx, z: cz - 4, r: 12, color: '#ffcf8a', k: 0.45 });
}

// ---------------------------------------------------------------------------
// The quays on the Rush, under the south wall
// ---------------------------------------------------------------------------

function bollard(b: GeoBuilder, x: number, z: number): void {
  b.cyl(x, z, 0, 0.62, 0.2, 0.17, 6, 0x4d4f52, { cap: 0x3a3b3e });
}
function barrel(b: GeoBuilder, x: number, z: number, y = 0): void {
  b.cyl(x, z, y, y + 0.8, 0.32, 0.32, 6, 0x7a5a3a, { cap: 0x5a4128 });
}
function crate(b: GeoBuilder, x: number, z: number, s = 0.75, y = 0): void {
  b.box(x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2, 0x9a7a52, { top: 0xa98a60 });
}

/** A fish stall facing south: its counter with the catch on it, two posts at its back and an awning, seen from below too. */
function stall(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, cloth: number): void {
  b.box(x0, 0, z1 - 1.0, x1, 0.85, z1, TIMBER, { top: 0x8a6a48 });
  b.box(x0 + 0.2, 0.85, z1 - 0.8, x1 - 0.2, 0.97, z1 - 0.2, 0xb9c4c9, { top: 0xc8d2d6 });
  for (const x of [x0 + 0.1, x1 - 0.1]) b.beam([x, 0, z0 + 0.1], [x, 2.4, z0 + 0.1], 0.07, 0.07, TIMBER_DARK);
  slab(b, [(x0 + x1) / 2, 2.45, z0], [(x0 + x1) / 2, 1.95, z1 + 0.35], (x1 - x0) / 2 + 0.1, 0.06, cloth, { under: 0xe8dcc0 });
}

function quays(k: Build): void {
  const b = k.b, r = rng(6129);
  const x0 = LW.x1, x1 = TURNS.strand.c[0] + TURNS.strand.r, bank = RUSH.north, road = ROADS.quays[0][1];
  const riverSide = road + LANE + 0.3, wallSide = LS.z1;
  const stairTop = ROADS.sisters[0][0] + 2.6, step = 0.95, steps = 6;

  // the quay's edge: a kerb of dressed stone along the top of the bank, open where the water stairs go down
  b.box(x0 + 0.1, 0, bank - 0.32, stairTop - 1.1, 0.14, bank + 0.06, C, { top: CS, faces: 'NESWTB' });
  b.box(stairTop + 0.15, 0, bank - 0.32, x1, 0.14, bank + 0.06, C, { top: CS, faces: 'NESWTB' });
  // the water stairs, at the foot of the Street of the Sisters, going down along the bank's face to the water
  for (let i = 0; i < steps; i++) {
    const xa = stairTop - step * (i + 1), xb = stairTop - step * i;
    b.box(xa, -1.4, bank + 0.02, xb, -0.12 * (i + 1), bank + 1.0, C, { top: CS, faces: 'SWT' + (i === 0 ? 'E' : '') });
  }

  // bollards along the edge, clear of the stairs, the crane and what stands on the quay
  const crane = { x: RIVER_GATE.x - 10.5, z: riverSide + 1.25 };
  for (const x of [-85.5, -79, -73.6, -55, -45.8, -39.8, -33.4]) bollard(b, x, bank - 0.75);

  // a treadwheel crane, its jib out over the water, and a bale on its rope
  const { x: kx, z: kz } = crane;
  b.box(kx - 1.3, 0, kz - 1.0, kx + 1.3, 0.3, kz + 1.0, TIMBER, { top: 0x8a6a48 });
  drum(b, [kx, 1.62, kz], 1.3, 0.4, 0x9a7a52, { cap: 0x7a5c3c });
  for (const s of [-0.7, 0.7]) {
    b.beam([kx + s, 0.3, kz - 0.85], [kx + s * 0.8, 4.0, kz], 0.09, 0.08, TIMBER_DARK);
    b.beam([kx + s, 0.3, kz + 0.85], [kx + s * 0.8, 4.0, kz], 0.09, 0.08, TIMBER_DARK);
  }
  b.beam([kx - 0.6, 4.0, kz], [kx + 0.6, 4.0, kz], 0.09, 0.09, TIMBER_DARK);
  const tip: V3 = [kx, 6.6, bank + 1.7];
  b.beam([kx, 3.9, kz - 0.4], tip, 0.13, 0.09, TIMBER_DARK);
  b.beam([kx, 0.3, kz + 0.9], [kx, 5.0, (kz + tip[2]) / 2 + 0.2], 0.07, 0.06, TIMBER_DARK);
  b.beam(tip, [tip[0], 3.0, tip[2]], 0.035, 0.035, 0xd8ccaa);
  b.box(tip[0] - 0.45, 2.4, tip[2] - 0.4, tip[0] + 0.45, 3.0, tip[2] + 0.4, 0xc9a96e, { top: 0xd4b77e, faces: 'NESWTB' });
  // sacks landed from the boats, by the barrels west of it
  for (const [x, z, y] of [[-82.7, riverSide + 0.55, 0], [-82.7, riverSide + 1.2, 0], [-82.6, riverSide + 0.88, 0.45]]) b.box(x - 0.36, y, z - 0.26, x + 0.36, y + 0.45, z + 0.26, 0xc8b48a, { top: 0xd2c09a });

  // barrels and crates stacked along the river side, and more against the wall
  for (const [dx, dz] of [[0, 0], [0.68, 0], [0, 0.68], [0.68, 0.68]]) barrel(b, -80.6 + dx, riverSide + 0.5 + dz);
  barrel(b, -80.26, riverSide + 0.84, 0.8);
  for (const [x, z, y] of [[crane.x + 2.1, riverSide + 0.6, 0], [crane.x + 2.9, riverSide + 0.6, 0], [crane.x + 2.5, riverSide + 0.6, 0.75], [crane.x + 2.5, riverSide + 1.45, 0]]) crate(b, x, z, 0.75, y);
  for (const x of [-44.2, -43.5, -42.8]) barrel(b, x, riverSide + 0.75);
  for (const [x, z, y] of [[-36.6, riverSide + 0.6, 0], [-35.8, riverSide + 0.7, 0], [-36.2, riverSide + 0.65, 0.75]]) crate(b, x, z, 0.75, y);
  for (const [x, z] of [[-87.2, wallSide + 1.2], [-86.5, wallSide + 1.3]]) barrel(b, x, z);
  crate(b, -50.6, wallSide + 1.1, 0.8);

  // nets hung to dry between poles
  const nz = bank - 1.25, poles = [-50.2, -48.7, -47.2];
  for (const x of poles) b.beam([x, 0, nz], [x, 2.3, nz], 0.06, 0.05, TIMBER_DARK);
  for (let i = 0; i + 1 < poles.length; i++) {
    // each net sags between its two poles, seen from both sides
    const a = poles[i] + 0.08, c = poles[i + 1] - 0.08, m = (a + c) / 2;
    for (const s of [-1, 1]) {
      const z = nz + s * 0.02;
      b.quad([a, 0.95, z], [m, 0.62, z], [m, 1.78, z], [a, 2.15, z], [0, 0, s], 0x5f5b4b);
      b.quad([m, 0.62, z], [c, 0.95, z], [c, 2.15, z], [m, 1.78, z], [0, 0, s], 0x5f5b4b);
    }
  }

  // the fish stall by the River Gate, as the fish market is, with baskets of the catch beside it
  const sx1 = RIVER_GATE.x - RIVER_GATE.half - RIVER_GATE.tw - 0.4, sx0 = sx1 - 2.4;
  stall(b, sx0, wallSide + 0.35, sx1, wallSide + 2.35, 0xb84a3a);
  for (const [x, z] of [[sx0 - 0.5, wallSide + 1.9], [sx0 - 0.4, wallSide + 1.1]]) b.cyl(x, z, 0, 0.45, 0.32, 0.38, 6, 0x9a7a4a, { cap: 0xa9b6bb });

  // braziers by night on the river side, and the quays' own light
  for (const x of [-76.4, -53.4, -38.4]) brazier(k, x, bank - 1.0);
  for (let x = -86; x <= -26; x += 12) k.lights.push({ x, z: road, r: 10, color: '#ffcf8a', k: 0.42 });

  // sailors and porters along the river side, at the stairs and the crane, and folk at the stall
  for (const [x, z] of [[-84.2, 72.4], [-77.6, 72.1], [-72.6, 72.6], [-66.2, 72.4], [stairTop - 0.4, 73.3], [-55.6, 72.3], [-46.2, 72.2], [-40.9, 72.6], [-33.6, 72.1]] as P2[]) {
    k.person(x + (r() - 0.5) * 0.4, z + (r() - 0.5) * 0.3);
  }
  k.person(stairTop - step * 3.5, bank + 0.5, -0.12 * 4);
  k.person((sx0 + sx1) / 2, wallSide + 0.75);
  k.person((sx0 + sx1) / 2 + 0.6, wallSide + 2.75);
  for (const [x, z] of [[-86.0, 62.3], [-50.8, 62.4], [-40.8, 62.2]] as P2[]) k.person(x, z);

  // the city's name on the quays, before the wall west of the River Gate
  nameBoard(k, SIGN.city, sx0 - 5.8, wallSide + 1.75, 0, [0, 0, 1], 1.2);
  // the gate's own name, beside the street that comes through it, east of it
  nameBoard(k, SIGN.river, RIVER_GATE.x + RIVER_GATE.half + RIVER_GATE.tw + 5.7, wallSide + 1.75, 0, [0, 0, 1], 1.2);
}

// ---------------------------------------------------------------------------
// The names, and what the file hands over
// ---------------------------------------------------------------------------

const SIGN = { iron: 'walls-iron-gate', river: 'walls-river-gate', city: 'walls-kings-landing' };

export const SIGNS: SignDef[] = [nameSign(SIGN.iron, IG.name), nameSign(SIGN.river, RG.name), nameSign(SIGN.city, LN.name)];

export const MODELS: Record<string, Model> = {
  'kl-wall-n': northWall,
  'kl-wall-w': westWall,
  'kl-wall-s': southWall,
  'kl-wall-e': eastWall,
  'iron-gate': ironGate,
  'river-gate': riverGate,
  'drovers-pen': droversPen,
};
export const COVERS: string[] = [];

export function extras(k: Build): void {
  quays(k);
}

export function heightAt(_x: number, _z: number): number {
  return 0;
}
