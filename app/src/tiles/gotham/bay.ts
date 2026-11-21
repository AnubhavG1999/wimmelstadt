// The harbour: the Cobblepot Bridge, Blackgate on its isle, the Statue of Justice, the Iceberg Casino at her
// moorings, and what else lies on the water.
//
// The Cobblepot Bridge is one of the three bridges of 1881 that the comics name for the city's founding
// families (Wayne, Cobblepot and Elliot, in Batman: Gates of Gotham), and their map-maker likens the city's
// bridges to the Brooklyn and the Manhattan. So it is a suspension bridge on two Gothic stone towers. The road
// deck is roads.ts's; this file builds round it. Over the docks the deck runs on a brick arcade with blind
// pointed arches, then on riveted plate girders over the apron to an abutment at the quay's edge. Over the
// harbour two towers stand, each two slender piers with buttresses, lancet niches, a rose, pinnacles and
// gargoyles, joined over the road by a pointed arch with a gallery on it. The main cables hang from tower to
// tower, with hangers down to a promenade ledge outside the girders, and stays from the towers' tops as the
// Brooklyn has; behind each tower the cables come down to anchor pylons. On Tricorner the deck comes down a
// ramp between stone walls with a balustrade and lamps.
//
// The bridge lies square across the view the tile opens with, so the view sees it broadside: each tower is
// seen as its south-east pier, and that pier's face carries the Gothic work and the bridge's name. The arch
// over the road is seen from along the bridge.
//
// The east tower stands where it does because of three things the plan fixes: its north-west pier must stay
// off the docks' apron, and both its piers off the launch's line under the span. The west tower stands on
// Tricorner's quay, clear of the Iceberg Casino's bow, which lies under the bridge's edge.
//
// Blackgate is a low fort of dark stone on its isle: a battered plinth, battery walls with arrow loops and
// embrasures, round bastions, a square keep, a gatehouse to the jetty, and a watchtower with the searchlight's
// housing. Nobody is shown in it, and it says nothing but its name.
//
// The Statue of Justice is Lady Justice in pale stone on a stepped Gothic pedestal, blindfolded, a sword
// upright in her right hand and the scales hanging from her left, a crown of five spikes, facing the view and
// the sea.
//
// The Iceberg Casino is the Penguin's floating casino: a dark hull with a faceted iceberg of white and ice blue
// on her stern half, lit from within at night, and her open deck with the prize turntable before it.

import * as THREE from 'three';
import { placed } from '../../engine/build';
import { interior, rng, type GeoBuilder, type V3 } from '../../engine/geo';
import { flat } from '../../engine/ground';
import { D, Q, hipped, pinnacle, roundel, tri } from '../../engine/parts';
import { face3, hip, railing, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import {
  AMBER, BOARDS, DARK, ICE, IRON, IRON_DARK, LEAD, LOOP_WIN, NEON_CYAN, ROCK, ROCK_DARK, ROCK_LIGHT, SLATE, SODIUM, STEEL, STONE,
  STONE_DARK, STONE_LIGHT, STONE_TRIM, TIMBER, TIMBER_DARK, TIMBER_PALE, TO_VIEW, gargoyle, gasLamp, nameSign, parapet,
} from './look';
import type { Model, Place } from './models';
import { BRIDGE, CASINO, LANDS, SPRANG_ALONG, bridgeY, groundAt, lotOf, sprang, type Lot, type P2 } from './plan';
import { MIDDLES } from './roads';
import { BOAT_LINES } from './traffic';

const PI = Math.PI;

// ---------------------------------------------------------------------------
// Colours of this file's own
// ---------------------------------------------------------------------------

/** A lit Gothic niche or window: dark by day, warm at night. */
const NICHE = 0x2b241c;
/** The towers' stone: Pinkney's, a shade lighter so that the towers keep their shape against the water. */
const TOWER_STONE = 0x4b505b;
/** The bridge's brick over the docks, and the steel of its girders. */
const BRICK_VIADUCT = 0x5e3a30, GIRDER = 0x6f7680, GIRDER_DARK = 0x5a6069;
/** Blackgate's stone, darker than the city's. */
const BG = 0x33353b, BG_DARK = 0x2a2b30, BG_TRIM = 0x5e626b;
/** The statue's pale stone. */
const PALE = 0xbcb7aa, PALE_DARK = 0x9c978b, PALE_LIGHT = 0xd4cfc2;
/** The casino: her hull, her deck, her ice. */
const HULL = 0x1b1f28, HULL_RED = 0x6a2428, DECK = 0x4a3a2e, ICE_WHITE = 0xe4f1f6, ICE_BLUE = 0xa9d6ea, ICE_DEEP = 0x7fb8d4;

// ---------------------------------------------------------------------------
// The bridge's own numbers
// ---------------------------------------------------------------------------

const E = BRIDGE.east, SPAN = Math.hypot(BRIDGE.west[0] - E[0], BRIDGE.west[1] - E[1]);
/** Along the span from its east end to its west, and the way to the right of that: the north-west. */
const U: P2 = [(BRIDGE.west[0] - E[0]) / SPAN, (BRIDGE.west[1] - E[1]) / SPAN];
const N: P2 = [-U[1], U[0]];
/** A place by the span: `sp` along it from its east end, `r` to the north-west of the road's middle. */
const onSpan = (sp: number, r: number): P2 => [E[0] + U[0] * sp + N[0] * r, E[1] + U[1] * sp + N[1] * r];
/** Facing the view, and facing along the bridge. */
const SE_H = Math.atan2(-N[1], -N[0]), WEST_H = Math.atan2(U[1], U[0]), EAST_H = Math.atan2(-U[1], -U[0]);

/**
 * Where the towers stand along the span. The east one's north-west pier must stand in the water south of the
 * docks' apron (z 50.5), and both its piers clear of the launch's line under the span (about 6.5 north-east of
 * the Sprang's middle): that leaves about 13.2 to 14. The west one stands on Tricorner's quay, its north pier
 * clear of the casino's side.
 */
const TOWER = { east: 13.6, west: 44.4 };
/** A tower's pier: from `a` to `b` out from the road's middle, `t` to either side along the bridge. */
const PIER = { a: 6.3, b: 9.0, t: 1.5 };
/** The main cables' plane, out from the road's middle, and how high they pass over the towers. */
const CABLE_R = 7.65, SADDLE = 28;
/** The pointed arch over the road: where it springs, its radius, and the top of its spandrel. */
const ARCH = { spring: 12, R: PIER.a * 1.4, top: 22.6, t: 1.2 };

/** Along the span, where the Iceberg Casino's view to the south-east passes under the north-west cable: no hanger, lamp or stay stands there. */
const CASINO_SIGHT: [number, number] = [30.5, 43.5];

// ---------------------------------------------------------------------------
// The deck as roads.ts laid it
// ---------------------------------------------------------------------------

interface Frame { s: number; x: number; y: number; z: number; rx: number; rz: number }

const v0 = new THREE.Vector3(), va = new THREE.Vector3(), vb = new THREE.Vector3();
/** The road's middle at a distance along it, with the way to its right. */
function frameAt(s: number): Frame {
  const p = MIDDLES.bridge;
  p.at(s, v0); p.at(s + 0.6, va); p.at(s - 0.6, vb);
  const tx = va.x - vb.x, tz = va.z - vb.z, l = Math.hypot(tx, tz) || 1;
  return { s, x: v0.x, y: v0.y, z: v0.z, rx: -tz / l, rz: tx / l };
}

let SAMPLES: { path: unknown; fr: Frame[] } | null = null;
function samples(): Frame[] {
  const path = MIDDLES.bridge;
  if (!SAMPLES || SAMPLES.path !== path) {
    const fr: Frame[] = [];
    for (let s = 0; s <= path.length; s += 0.25) fr.push(frameAt(s));
    SAMPLES = { path, fr };
  }
  return SAMPLES.fr;
}
function nearest(x: number, z: number): Frame {
  let best = Infinity, out = samples()[0];
  for (const f of samples()) { const d = (f.x - x) ** 2 + (f.z - z) ** 2; if (d < best) { best = d; out = f; } }
  return out;
}
/** How high the deck's surface is nearest a place, and how far along the road that is. */
const deckY = (x: number, z: number): number => (MIDDLES.bridge ? nearest(x, z).y : bridgeY(x, z) ?? 0);
const sOf = (x: number, z: number): number => nearest(x, z).s;
/** How far along the span a frame is, from its east end. */
const spOf = (f: Frame): number => (f.x - E[0]) * U[0] + (f.z - E[1]) * U[1];

/**
 * A bar along the road, on one side of it (`side` 1 is the right, the north-west on the span), from `rIn` to
 * `rOut` out from its middle and from `lo` to `hi` in height: faces O(uter), I(nner), T(op), B(ottom), and S
 * and E for its two ends.
 */
function band(b: GeoBuilder, s0: number, s1: number, step: number, side: number, rIn: number, rOut: number, lo: (f: Frame) => number, hi: (f: Frame) => number, color: number, faces: string, top = color): void {
  const n = Math.max(1, Math.ceil((s1 - s0) / step));
  const fs = Array.from({ length: n + 1 }, (_, i) => frameAt(s0 + ((s1 - s0) * i) / n));
  const P = (f: Frame, r: number, y: number): V3 => [f.x + f.rx * r * side, y, f.z + f.rz * r * side];
  for (let i = 0; i < n; i++) {
    const fa = fs[i], fb = fs[i + 1], la = lo(fa), lb = lo(fb), ha = hi(fa), hb = hi(fb);
    if (ha - la < 0.02 && hb - lb < 0.02) continue;
    const nx = ((fa.rx + fb.rx) / 2) * side, nz = ((fa.rz + fb.rz) / 2) * side;
    if (faces.includes('O')) b.quad(P(fa, rOut, la), P(fb, rOut, lb), P(fb, rOut, hb), P(fa, rOut, ha), [nx, 0, nz], color);
    if (faces.includes('I')) b.quad(P(fa, rIn, la), P(fb, rIn, lb), P(fb, rIn, hb), P(fa, rIn, ha), [-nx, 0, -nz], color);
    if (faces.includes('T')) b.quad(P(fa, rIn, ha), P(fa, rOut, ha), P(fb, rOut, hb), P(fb, rIn, hb), [0, 1, 0], top);
    if (faces.includes('B')) b.quad(P(fa, rIn, la), P(fa, rOut, la), P(fb, rOut, lb), P(fb, rIn, lb), [0, -1, 0], color);
  }
  const cap = (f: Frame, out: number): void => {
    const tx = f.rz, tz = -f.rx, l = lo(f), h = hi(f);
    if (h - l > 0.02) b.quad(P(f, rIn, l), P(f, rOut, l), P(f, rOut, h), P(f, rIn, h), [tx * out, 0, tz * out], color);
  };
  if (faces.includes('S')) cap(fs[0], -1);
  if (faces.includes('E')) cap(fs[n], 1);
}

// ---------------------------------------------------------------------------
// The Cobblepot Bridge
// ---------------------------------------------------------------------------

/** How deep the girders reach below the deck, and never lower than the apron's or the casino's room allows. */
function girderFoot(f: Frame): number {
  const ff = spOf(f) / SPAN;
  const dep = ff > 0 && ff < 1 ? 1.3 + 1.1 * Math.sin(PI * ff) : 1.3;
  let y = f.y - dep;
  if (f.z < 50.8) y = Math.max(y, 3.25);
  if (ff > 0.6) y = Math.max(y, 3.7);
  return Math.min(y, f.y - 0.95);
}

/** A pointed arch in a wall that runs along x, its faces at z = ±t: the spandrel up to `top`, and the soffit. */
function pointedArch(b: GeoBuilder, a: number, t: number, ys: number, R: number, top: number, color: number, soffit: number, n = 8): void {
  const c = R - a, apex = Math.acos(-c / R);
  const left: [number, number][] = Array.from({ length: n + 1 }, (_, i) => { const th = PI + ((apex - PI) * i) / n; return [c + R * Math.cos(th), ys + R * Math.sin(th)]; });
  const pts = [...left, ...left.slice(0, -1).reverse().map(([x, y]): [number, number] => [-x, y])];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [xa, ya] = pts[i], [xb, yb] = pts[i + 1];
    for (const [z, nz] of [[-t, -1], [t, 1]]) b.quad([xa, ya, z], [xb, yb, z], [xb, top, z], [xa, top, z], [0, 0, nz], color);
    const cx = i < n ? c : -c, mx = (xa + xb) / 2, my = (ya + yb) / 2, l = Math.hypot(cx - mx, ys - my) || 1;
    b.quad([xa, ya, -t], [xb, yb, -t], [xb, yb, t], [xa, ya, t], [(cx - mx) / l, (ys - my) / l, 0], soffit);
  }
}

/** A lancet: a dark panel with a pointed head, standing a hair proud of a wall that faces +x or -x. */
function lancet(b: GeoBuilder, x: number, out: number, z0: number, z1: number, y0: number, y1: number, tip: number): void {
  const w = interior(1.8);
  b.quad([x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], [out, 0, 0], NICHE, { win: w });
  tri(b, [x, y1, z0], [x, y1, z1], [x, tip, (z0 + z1) / 2], [out, 0, 0], NICHE, { win: w });
}

/** A local box from one x to another whichever way round they come. */
function bx(b: GeoBuilder, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: number, o: Parameters<GeoBuilder['box']>[7] = {}): void {
  b.box(Math.min(x0, x1), y0, z0, Math.max(x0, x1), y1, z1, color, o);
}

/** One tower: two piers and the arch between them, built square to the bridge with its piers along x. */
function tower(k: Build, sp: number, east: boolean): void {
  const b = k.b, [cx, cz] = onSpan(sp, 0), { a, b: pb, t } = PIER;
  b.moved(cx, 0, cz, Math.atan2(N[1], N[0]), () => {
    // the footing: in the water a caisson under both piers with a cutwater at each end, on the quay a plinth under each
    if (east) {
      b.box(-9.6, -1.2, -1.75, 9.6, 2.0, 1.75, STONE_DARK);
      for (const s of [-1, 1]) {
        const A: V3 = [s * 9.6, -1.2, -1.75], B: V3 = [s * 9.6, -1.2, 1.75], P: V3 = [s * 10.9, -1.2, 0];
        const up = (v: V3): V3 => [v[0], 2.0, v[2]];
        b.quad(A, P, up(P), up(A), [s * 1.75, 0, -1.3], STONE_DARK);
        b.quad(P, B, up(B), up(P), [s * 1.75, 0, 1.3], STONE_DARK);
        tri(b, up(A), up(P), up(B), [0, 1, 0], STONE_DARK);
      }
      b.box(-9.8, 2.0, -1.8, 9.8, 2.3, 1.8, STONE_TRIM);
      // a stone tie between the piers under the deck
      b.box(-a, 3.1, -0.9, a, 4.1, 0.9, STONE, { faces: 'NSTB' });
    } else {
      for (const s of [-1, 1]) {
        bx(b, s * (a - 0.2), -1.2, -1.75, s * (pb + 0.25), 2.0, 1.75, STONE_DARK);
        bx(b, s * (a - 0.3), 2.0, -1.8, s * (pb + 0.35), 2.3, 1.8, STONE_TRIM);
      }
    }
    for (const s of [-1, 1]) {
      const X = (r: number): number => s * r;
      // the shaft in three stages, each set back, with a band of pale stone at each setback
      bx(b, X(a), 2.3, -t, X(pb), 13, t, TOWER_STONE, { faces: 'NESW' });
      bx(b, X(a - 0.12), 13, -t - 0.12, X(pb + 0.12), 13.4, t + 0.12, STONE_TRIM);
      bx(b, X(a + 0.15), 13.4, -t + 0.15, X(pb - 0.15), 24, t - 0.15, TOWER_STONE, { faces: 'NESW' });
      bx(b, X(a), 24, -t, X(pb), 24.4, t, STONE_TRIM);
      bx(b, X(a + 0.3), 24.4, -t + 0.3, X(pb - 0.3), 29, t - 0.3, STONE_LIGHT, { faces: 'NESW' });
      bx(b, X(a + 0.15), 29, -t + 0.15, X(pb - 0.15), 29.4, t - 0.15, STONE_TRIM);
      // pinnacles at the corners of the top, which is flat between them for a figure
      for (const r of [a + 0.55, pb - 0.55]) for (const z of [-0.95, 0.95]) pinnacle(b, X(r), z, 29.4, 3.6, 0.28, STONE_LIGHT);
      // two buttresses up the outer face, each with a weathered top
      for (const [z0, z1] of [[0.85, 1.35], [-1.35, -0.85]]) {
        bx(b, X(pb - 0.2), 6, z0, X(pb + 0.7), 19, z1, TOWER_STONE, { faces: 'NESWB' });
        const n: V3 = [s * 1.6, 0.7, 0];
        b.quad([X(pb + 0.7), 19, z0], [X(pb + 0.7), 19, z1], [X(pb - 0.2), 20.6, z1], [X(pb - 0.2), 20.6, z0], n, STONE_TRIM);
        for (const [z, nz] of [[z0, -1], [z1, 1]]) face3(b, [X(pb - 0.2), 19, z], [X(pb + 0.7), 19, z], [X(pb - 0.2), 20.6, z], [0, 0, nz], TOWER_STONE);
      }
      // lancets on the outer face, and a rose under the top
      lancet(b, X(pb + 0.03), s, -0.6, 0.6, 7.2, 11.0, 12.0);
      lancet(b, X(pb - 0.12), s, -0.55, 0.55, 15.2, 20.4, 21.6);
      roundel(b, [X(pb - 0.27), 26.7, 0], 0.75, s > 0 ? 'E' : 'W', NICHE, { win: interior(1.6) }, 8);
      // pale quoins up the middle stage's corners, a blind arcade under its band, and a corbel table under that band
      for (const z of [-1.35, 1.05]) b.quad([X(pb - 0.12), 13.4, z], [X(pb - 0.12), 13.4, z + 0.3], [X(pb - 0.12), 24, z + 0.3], [X(pb - 0.12), 24, z], [s, 0, 0], STONE_TRIM);
      for (const z of [-0.75, 0, 0.75]) lancet(b, X(pb - 0.12), s, z - 0.22, z + 0.22, 22.2, 23.0, 23.5);
      for (const z of [-1.1, -0.37, 0.37, 1.1]) bx(b, X(pb - 0.2), 23.55, z - 0.14, X(pb + 0.12), 24, z + 0.14, STONE_TRIM, { faces: 'NESWB' });
      // a band of pale stone round the lower stage, over the plaque
      bx(b, X(a - 0.05), 5.6, -t - 0.05, X(pb + 0.05), 5.9, t + 0.05, STONE_TRIM, { faces: 'NESWTB' });
      // and lancets on the faces along the bridge, for the views along it
      for (const z of [-t - 0.03, t + 0.03]) {
        const w = interior(1.6), zz = z;
        b.quad([X(a + 0.9), 15.5, zz], [X(pb - 0.9), 15.5, zz], [X(pb - 0.9), 20.5, zz], [X(a + 0.9), 20.5, zz], [0, 0, Math.sign(z)], NICHE, { win: w });
        tri(b, [X(a + 0.9), 20.5, zz], [X(pb - 0.9), 20.5, zz], [X((a + pb) / 2), 21.7, zz], [0, 0, Math.sign(z)], NICHE, { win: w });
      }
    }
    // the gargoyles on the south-east pier, at its upper band, looking out over the harbour
    for (const z of [-1.05, 1.05]) { gargoyle(b, -(pb - 0.35), 24.4, z, PI, 1.0); gargoyle(b, -(pb - 0.05), 13.4, z * 0.52, PI, 0.8); }
    // the arch over the road, with a cornice and a gallery on it
    pointedArch(b, a, ARCH.t, ARCH.spring, ARCH.R, ARCH.top, STONE, STONE_DARK);
    b.box(-a, ARCH.top, -ARCH.t - 0.15, a, ARCH.top + 0.4, ARCH.t + 0.15, STONE_TRIM, { faces: 'NSTB' });
    for (const z of [-ARCH.t - 0.1, ARCH.t - 0.15]) b.box(-a, ARCH.top + 0.4, z, a, ARCH.top + 1.1, z + 0.25, STONE_LIGHT, { faces: 'NST' });
  });
  // a lantern under the arch's head, and its pool on the deck
  k.glows.push({ x: cx, y: ARCH.spring + 7.6, z: cz, sx: 0.4, sy: 0.6, sz: 0.4, color: AMBER });
  k.lights.push({ x: cx, z: cz, r: 10, color: SODIUM, k: 0.55 });
  // a warning lamp on each tower's top
  for (const s of [-1, 1]) { const [x, z] = onSpan(sp, s * (PIER.b - 0.55)); k.glows.push({ x, y: 33.1, z, sx: 0.3, sy: 0.3, sz: 0.3, color: '#ff3b3b' }); }
}

/** The bridge's name, on a plaque on the east tower's south-east pier, low over the water. */
function plaque(k: Build): void {
  const [x, z] = onSpan(TOWER.east, -(PIER.b + 0.1)), nx = -N[0], nz = -N[1];
  k.b.obox(x - nx * 0.06, 3.75, z - nz * 0.06, 1.35, 0.8, 0.05, Math.atan2(U[1], U[0]), DARK, { faces: 'B' });
  k.sign('bay-cobblepot', x + nx * 0.03, 3.75, z + nz * 0.03, nx, nz, 1.35, 2.5);
}

/** A cable's height at a place along the main span: from saddle to saddle, its lowest a little over the promenade. */
function cableY(sp: number, low: number): number {
  const mid = (TOWER.east + TOWER.west) / 2, half = (TOWER.west - TOWER.east) / 2;
  return low + (SADDLE - low) * ((sp - mid) / half) ** 2;
}

function cobblepot(k: Build): void {
  const b = k.b;
  // where along the road things begin and end
  const sArcade0 = sOf(80, 27.4), sGirder0 = sOf(80, 43.2), [qx, qz] = onSpan(SPAN, 0), sQuay = sOf(qx, qz);
  let sLand = sQuay;
  for (const f of samples()) if (f.s > sQuay && f.y > 0.25) sLand = f.s;

  // ---- over the docks: a brick arcade with blind pointed arches, its coping above the deck's low wall
  for (const side of [-1, 1]) {
    band(b, sArcade0, sGirder0, 1.5, side, 5.65, 6.0, () => 0, (f) => f.y + 0.95, BRICK_VIADUCT, 'OTS', STONE_TRIM);
    band(b, sArcade0, sGirder0, 1.5, side, 5.65, 6.0, (f) => f.y + 0.72, (f) => f.y + 0.95, BRICK_VIADUCT, 'I');
    // pilasters with caps, and a lamp on the two tallest
    for (const z of [30, 36.6, 43.2]) {
      const f = frameAt(sOf(80, z)), yaw = Math.atan2(-f.rx, f.rz), x = f.x + f.rx * 6.25 * side, zz = f.z + f.rz * 6.25 * side, h = f.y + 1.25;
      b.obox(x, h / 2, zz, 0.55, h / 2, 0.3, yaw, BRICK_VIADUCT);
      b.obox(x, h + 0.1, zz, 0.65, 0.1, 0.4, yaw, STONE_TRIM, { faces: 'B' });
      if (z > 31) gasLamp(k, x, h + 1.6, zz, 1.4);
    }
    // the blind arches between them, lit warm at night like the workshops let into a viaduct
    for (const [s0, s1, yr, yt] of [[sOf(80, 30.7), sOf(80, 35.9), 1.4, 2.0], [sOf(80, 37.3), sOf(80, 42.5), 2.6, 3.5]]) {
      const fa = frameAt(s0), fb = frameAt(s1), fm = frameAt((s0 + s1) / 2);
      const P = (f: Frame, y: number): V3 => [f.x + f.rx * 6.03 * side, y, f.z + f.rz * 6.03 * side];
      const n: V3 = [fm.rx * side, 0, fm.rz * side], w = interior(1.2);
      b.quad(P(fa, 0.25), P(fb, 0.25), P(fb, yr), P(fa, yr), n, 0x241e1a, { win: w });
      tri(b, P(fa, yr), P(fb, yr), P(fm, yt), n, 0x241e1a, { win: w });
    }
  }
  // the last pier of the arcade, a wall across under the deck, where the girders take over
  const fP = frameAt(sGirder0);
  b.box(KANE_X - 6.3, 0, 42.6, KANE_X + 6.3, fP.y - 0.93, 43.8, STONE_DARK, { faces: 'NSEW' });
  // the abutment at the quay's edge, in the water, that the girders over the apron come down on
  b.box(69.0, -1.2, 50.65, 86.6, 3.5, 52.6, STONE_DARK);
  b.box(68.8, 3.5, 50.65, 86.8, 3.75, 52.8, STONE_TRIM);

  // ---- riveted plate girders along both edges, from the arcade over the apron and the harbour to the west quay
  for (const side of [-1, 1]) {
    band(b, sGirder0, sQuay, 1.8, side, 5.65, 6.05, girderFoot, (f) => f.y + 1.2, GIRDER, 'OITBSE');
    // its stiffeners, a strip a hair proud of its outer face
    for (let s = sGirder0 + 0.9; s < sQuay - 0.3; s += 1.8) {
      const fa = frameAt(s), fb = frameAt(s + 0.18), P = (f: Frame, y: number): V3 => [f.x + f.rx * 6.08 * side, y, f.z + f.rz * 6.08 * side];
      b.quad(P(fa, girderFoot(fa)), P(fb, girderFoot(fb)), P(fb, fb.y + 1.2), P(fa, fa.y + 1.2), [fa.rx * side, 0, fa.rz * side], GIRDER_DARK);
    }
  }
  // cross-beams under the deck, between the girders
  for (let sp = 3; sp < SPAN - 1; sp += 3) {
    if (Math.abs(sp - TOWER.east) < 2.4 || Math.abs(sp - TOWER.west) < 2.4) continue;
    const [x, z] = onSpan(sp, 0), f = nearest(x, z), lo = girderFoot(f) + 0.25, hi = f.y - 0.93;
    if (hi - lo < 0.25) continue;
    b.obox(x, (lo + hi) / 2, z, 0.18, (hi - lo) / 2, 6.0, Math.atan2(U[1], U[0]), GIRDER_DARK, { faces: 'B' });
  }
  // the promenade: a ledge outside each girder between the towers, with an iron rail, that the hangers come down to
  const s0 = sOf(...onSpan(TOWER.east + 1.9, 0)), s1 = sOf(...onSpan(TOWER.west - 1.9, 0));
  // on the north-west side it stops short of the casino's view to the south-east, which passes over the girder there
  const sSight = sOf(...onSpan(CASINO_SIGHT[0], 0));
  for (const side of [-1, 1]) {
    const end = side > 0 ? sSight : s1;
    band(b, s0, end, 1.8, side, 6.05, 7.85, (f) => f.y + 0.85, (f) => f.y + 1.1, STONE_TRIM, 'OTBSE', STONE_LIGHT);
    band(b, s0, end, 1.8, side, 7.7, 7.85, (f) => f.y + 1.1, (f) => f.y + 1.75, IRON, 'OITSE');
  }

  // ---- the towers, the name, and the cables
  tower(k, TOWER.east, true);
  tower(k, TOWER.west, false);
  plaque(k);
  const mid = (TOWER.east + TOWER.west) / 2;
  for (const side of [-1, 1]) {
    const r = side * CABLE_R, low = deckY(...onSpan(mid, side * 6.9)) + 1.1 + 0.9;
    const at = (sp: number, y: number): V3 => { const [x, z] = onSpan(sp, r); return [x, y, z]; };
    const pts: V3[] = Array.from({ length: 15 }, (_, i) => { const sp = TOWER.east + ((TOWER.west - TOWER.east) * i) / 14; return at(sp, cableY(sp, low)); });
    b.sweep(pts, pts.map(() => 0.17), STEEL);
    // the backstays, down to the anchor pylons at either end
    b.beam(at(TOWER.east, SADDLE), at(1.5, 7.3), 0.17, 0.17, STEEL);
    b.beam(at(TOWER.west, SADDLE), at(60, 3.5), 0.17, 0.17, STEEL);
    // the hangers, down to the promenade's rail
    for (let sp = TOWER.east + 2.3; sp < TOWER.west - 2.2; sp += 2.35) {
      if (side > 0 && sp > CASINO_SIGHT[0] && sp < CASINO_SIGHT[1]) continue;
      const top = cableY(sp, low), [gx, gz] = onSpan(sp, r), foot = deckY(gx, gz) + 1.75;
      if (top - foot > 0.4) b.beam([gx, foot, gz], [gx, top, gz], 0.055, 0.055, STEEL);
    }
    // the stays, from the towers' tops out to the promenade, as the Brooklyn has
    for (const [from, to] of [[TOWER.east, TOWER.east + 6], [TOWER.east, TOWER.east + 11], [TOWER.west, TOWER.west - 6], [TOWER.west, TOWER.west - 11]]) {
      if (side > 0 && to > CASINO_SIGHT[0] - 1 && to < CASINO_SIGHT[1]) continue;
      const [ex, ez] = onSpan(to, side * 7.2);
      b.beam(at(from, 26.4), [ex, deckY(ex, ez) + 1.12, ez], 0.06, 0.05, STEEL);
    }
  }
  // the anchor pylons: at the east end on the girders' ends, the north-west one carried over the apron and the
  // south-east one on a pier of its own in the water; at the west end on the ground beside the ramp
  for (const side of [-1, 1]) {
    const [x, z] = onSpan(1.5, side * 7.95), yaw = Math.atan2(U[1], U[0]), foot = side > 0 ? 3.3 : -1.2;
    b.obox(x, (foot + 7.0) / 2, z, 0.7, (7.0 - foot) / 2, 0.7, yaw, STONE, { faces: 'B' });
    b.obox(x, 7.2, z, 0.85, 0.2, 0.85, yaw, STONE_TRIM, { faces: 'B' });
    b.cyl(x, z, 7.4, 9.0, 0.6 * D, 0.03, 4, STONE_LIGHT, { phase: Q + yaw, cap: false });
    k.glows.push({ x, y: 6.4, z, sx: 0.3, sy: 0.4, sz: 0.3, color: SODIUM });
    const [wx, wz] = onSpan(60, side * 7.9);
    b.obox(wx, 1.6, wz, 1.3, 1.6, 1.3, yaw, STONE_DARK);
    b.obox(wx, 3.38, wz, 1.45, 0.18, 1.45, yaw, STONE_TRIM, { faces: 'B' });
    pinnacle(b, wx, wz, 3.56, 2.4, 0.35, STONE_LIGHT);
  }

  // ---- the ramp on Tricorner: stone walls over the deck's sides, a balustrade on them, and lamps
  for (const side of [-1, 1]) {
    band(b, sQuay, sLand, 1.7, side, 5.65, 6.05, () => 0, (f) => f.y + 0.95, STONE, 'OTSE', STONE_TRIM);
    band(b, sQuay, sLand, 1.7, side, 5.65, 6.05, (f) => f.y + 0.72, (f) => f.y + 0.95, STONE, 'I');
    const tops: V3[] = [];
    for (let s = sQuay + 0.4; s < sLand - 0.3; s += 2.8) {
      const f = frameAt(s), x = f.x + f.rx * 5.85 * side, z = f.z + f.rz * 5.85 * side;
      b.obox(x, f.y + 1.4, z, 0.16, 0.45, 0.16, Math.atan2(-f.rx, f.rz), STONE_TRIM);
      tops.push([x, f.y + 1.85, z]);
    }
    if (tops.length > 1) b.sweep(tops, tops.map(() => 0.1), STONE_TRIM);
    for (const ds of [5.2, 11.4]) { const f = frameAt(sQuay + ds), x = f.x + f.rx * 5.85 * side, z = f.z + f.rz * 5.85 * side; gasLamp(k, x, f.y + 0.95 + 1.9, z, 1.9); }
  }
  // the ramp's hollow is closed at the quay
  const fq = frameAt(sQuay + 0.25);
  b.obox(fq.x, (fq.y - 0.93 - 1.2) / 2, fq.z, 0.25, (fq.y - 0.93 + 1.2) / 2, 6.05, Math.atan2(-fq.rx, fq.rz), STONE_DARK);

  // ---- lamps along the bridge: on the promenade's rail, on the girders beyond the towers
  for (const [sp, side, r] of [[20, 1, 7.78], [20, -1, 7.78], [27, 1, 7.78], [27, -1, 7.78], [34, -1, 7.78], [40.5, -1, 7.78], [7, 1, 5.85], [7, -1, 5.85]] as const) {
    const [x, z] = onSpan(sp, side * r), y = deckY(x, z) + (r > 7 ? 1.75 : 1.2);
    gasLamp(k, x, y + 1.5, z, 1.5);
  }
}

const KANE_X = BRIDGE.east[0];

// ---------------------------------------------------------------------------
// Blackgate
// ---------------------------------------------------------------------------

/** The jetty on the isle's north shore, lying the way the Sprang runs, where the launch berths. */
const JETTY = { from: 189.9, to: 197.8, d: 8.5, half: 0.8, y: 2.05 };

/** How far a place is from the lines the harbour's boats sail. */
function toBoats(x: number, z: number): number {
  let d = Infinity;
  for (const [id, pts] of Object.entries(BOAT_LINES)) {
    const n = pts.length, closed = id !== 'launch';
    for (let i = 0; i + (closed ? 0 : 1) < n; i++) {
      const a = pts[i], c = pts[(i + 1) % n], vx = c[0] - a[0], vz = c[1] - a[1], l = vx * vx + vz * vz || 1;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l));
      d = Math.min(d, Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t));
    }
  }
  return d;
}

function blackgate(k: Build, l: Lot): void {
  const b = k.b, y0 = l.base;
  const X0 = l.x0 + 0.4, X1 = l.x1 - 0.4, Z0 = l.z0 + 0.4, Z1 = l.z1 - 0.4, T = 1.3, YW = 4, YT = 8;
  // the battered plinth the fort stands on, its top the parade ground
  hipped(b, X0 - 0.35, Z0 - 0.35, X1 + 0.35, Z1 + 0.35, y0, YW, 0.35, 0.35, BG_DARK, 0x45474d);
  // the battery walls, with arrow loops, a parapet on their outer edge and merlons with embrasures between
  const walls: [number, number, number, number, 'N' | 'S' | 'E' | 'W'][] = [[X0, Z0, X1, Z0 + T, 'N'], [X0, Z1 - T, X1, Z1, 'S'], [X0, Z0, X0 + T, Z1, 'W'], [X1 - T, Z0, X1, Z1, 'E']];
  for (const [x0, z0, x1, z1, side] of walls) {
    b.box(x0, YW, z0, x1, YT, z1, BG, { win: LOOP_WIN, seed: x0 + z0 });
    const along = side === 'N' || side === 'S';
    const [px0, pz0, px1, pz1] = along ? [x0, side === 'N' ? z0 : z1 - 0.45, x1, side === 'N' ? z0 + 0.45 : z1] : [side === 'W' ? x0 : x1 - 0.45, z0, side === 'W' ? x0 + 0.45 : x1, z1];
    b.box(px0, YT, pz0, px1, YT + 0.5, pz1, BG_TRIM, { faces: 'NESWT' });
    const len = along ? x1 - x0 : z1 - z0;
    for (let u = 2.6; u < len - 2.4; u += 1.6) {
      const c = (along ? x0 : z0) + u;
      if (side === 'N' && c > l.x0 + 5 && c < l.x0 + 9.8) continue;
      if (along) b.box(c - 0.4, YT + 0.5, pz0, c + 0.4, YT + 1.2, pz1, BG);
      else b.box(px0, YT + 0.5, c - 0.4, px1, YT + 1.2, c + 0.4, BG);
    }
  }
  // round bastions at three corners
  for (const [x, z] of [[X0, Z0], [X1, Z0], [X0, Z1]]) {
    b.cyl(x, z, y0, YT + 1.6, 1.8, 1.7, 8, BG, { win: LOOP_WIN, cap: BG_TRIM });
    b.cyl(x, z, YT + 1.6, YT + 2.0, 1.95, 1.95, 8, BG_TRIM);
    k.glows.push({ x, y: YT + 2.25, z, sx: 0.3, sy: 0.3, sz: 0.3, color: SODIUM });
  }
  // the keep
  const kx0 = l.x0 + 4.2, kx1 = kx0 + 6, kz0 = l.z0 + 3.4, kz1 = kz0 + 6;
  b.box(kx0, YW, kz0, kx1, 12, kz1, BG, { win: LOOP_WIN, seed: 3 });
  b.box(kx0, 12, kz0, kx1, 14, kz1, BG, { faces: 'NESW' });
  b.box(kx0 - 0.15, 14, kz0 - 0.15, kx1 + 0.15, 14.3, kz1 + 0.15, BG_TRIM);
  for (const u of [1.5, 3, 4.5]) {
    b.box(kx0 + u - 0.35, 14.3, kz0 - 0.15, kx0 + u + 0.35, 15.1, kz0 + 0.35, BG);
    b.box(kx0 + u - 0.35, 14.3, kz1 - 0.35, kx0 + u + 0.35, 15.1, kz1 + 0.15, BG);
    b.box(kx0 - 0.15, 14.3, kz0 + u - 0.35, kx0 + 0.35, 15.1, kz0 + u + 0.35, BG);
    b.box(kx1 - 0.35, 14.3, kz0 + u - 0.35, kx1 + 0.15, 15.1, kz0 + u + 0.35, BG);
  }
  for (const [x, z] of [[kx0, kz0], [kx1, kz0], [kx0, kz1], [kx1, kz1]]) {
    b.cyl(x, z, 11.2, 15.2, 0.65, 0.65, 6, BG_TRIM, { cap: false });
    b.cyl(x, z, 15.2, 16.0, 0.78, 0.05, 6, LEAD, { cap: false });
  }
  // a long range inside the west wall, under a slate roof
  b.box(X0 + T - 0.1, YW, l.z0 + 2, kx0 - 0.2, YT, l.z1 - 1.8, BG_DARK, { win: LOOP_WIN, seed: 7, faces: 'NESW' });
  hip(b, X0 + T - 0.1, l.z0 + 2, kx0 - 0.2, l.z1 - 1.8, YT, 1.4, SLATE, 0.25);
  // the gatehouse in the north wall, towards the jetty: two towers and a closed gate between them
  const gx = (l.x0 + l.x1) / 2;
  for (const s of [-1, 1]) {
    const x0 = gx + s * 0.7, x1 = gx + s * 2.1;
    bx(b, x0, y0, Z0 - 1.0, x1, YW, Z0 + T + 0.2, BG, { faces: 'NESW' });
    bx(b, x0, YW, Z0 - 1.0, x1, YT, Z0 + T + 0.2, BG, { win: LOOP_WIN });
    bx(b, x0, YT, Z0 - 1.0, x1, 10, Z0 + T + 0.2, BG, { faces: 'NESW' });
    bx(b, x0 - s * 0.1, 10, Z0 - 1.1, x1 + s * 0.1, 10.3, Z0 + T + 0.3, BG_TRIM);
    for (const z of [Z0 - 0.9, Z0 + T - 0.4]) bx(b, x0 + s * 0.3, 10.3, z, x1 - s * 0.1, 10.9, z + 0.5, BG);
  }
  b.box(gx - 0.7, y0, Z0 - 0.8, gx + 0.7, YT + 0.4, Z0 + 0.1, BG_DARK, { faces: 'NTEW' });
  const gz = Z0 - 0.83;
  b.quad([gx + 0.55, y0, gz], [gx - 0.55, y0, gz], [gx - 0.55, y0 + 2.6, gz], [gx + 0.55, y0 + 2.6, gz], [0, 0, -1], 0x1a1612, { win: interior(1.0) });
  tri(b, [gx + 0.55, y0 + 2.6, gz], [gx - 0.55, y0 + 2.6, gz], [gx, y0 + 3.3, gz], [0, 0, -1], 0x1a1612, { win: interior(1.0) });
  for (const dx of [-0.3, 0, 0.3]) b.beam([gx + dx, y0, gz - 0.06], [gx + dx, y0 + 2.9 - Math.abs(dx), gz - 0.06], 0.05, 0.05, IRON);
  b.beam([gx - 0.55, y0 + 1.3, gz - 0.08], [gx + 0.55, y0 + 1.3, gz - 0.08], 0.05, 0.05, IRON);
  gasLamp(k, gx, y0 + 4.0, Z0 - 1.25, 0);
  // the path from the gate to the jetty
  flat(b, [[gx - 0.8, Z0 - 0.85], [gx + 0.8, Z0 - 0.85], [gx + 0.8, l.z0 - 3.6], [gx - 0.8, l.z0 - 3.6]], y0 + 0.04, 0x55575d);
  // the watchtower at the south-east corner, with a gallery and the searchlight's housing
  const wx0 = X1 - 1.8, wz0 = Z1 - 1.8, wx1 = X1 + 1.2, wz1 = Z1 + 1.2, wcx = (wx0 + wx1) / 2, wcz = (wz0 + wz1) / 2;
  b.box(wx0, y0, wz0, wx1, YW, wz1, BG, { faces: 'NESW' });
  b.box(wx0, YW, wz0, wx1, 12, wz1, BG, { win: LOOP_WIN, seed: 11 });
  b.box(wx0 - 0.2, 12, wz0 - 0.2, wx1 + 0.2, 12.35, wz1 + 0.2, BG_TRIM, { faces: 'NESWTB' });
  railing(b, wx0 - 0.15, wz0 - 0.15, wx1 + 0.15, wz1 + 0.15, 12.35, IRON, 'NESW', 0.8);
  b.cyl(wcx, wcz, 12.35, 13.2, 0.8, 0.8, 8, IRON_DARK, { cap: false });
  b.cyl(wcx, wcz, 13.2, 15.0, 1.05, 1.05, 8, 0x41606e, { win: interior(1.2), cap: false });
  b.cyl(wcx, wcz, 15.0, 15.5, 1.25, 0.85, 8, LEAD);
  b.beam([wcx, 15.5, wcz], [wcx, 16.0, wcz], 0.06, 0.02, IRON_DARK);
  // the name, on a board on the south wall, where the view reads it
  const nx = gx, ny = 6.1, nz = Z1;
  b.box(nx - 2.75, ny - 0.55, nz, nx + 2.75, ny + 0.55, nz + 0.1, DARK, { faces: 'NESWTB' });
  k.sign('bay-blackgate', nx, ny, nz + 0.13, 0, 1, 0.85, 5.2);
  k.lights.push({ x: (l.x0 + l.x1) / 2, z: (l.z0 + l.z1) / 2, r: 13, color: SODIUM, k: 0.45 });
  k.lights.push({ x: gx, z: Z0 - 2.5, r: 8, color: SODIUM, k: 0.5 });

  // ---- the jetty, a stone mole with timber fenders on the launch's side, bollards and a lamp at its end
  const [jx, jz] = sprang((JETTY.from + JETTY.to) / 2, JETTY.d), yaw = Math.atan2(SPRANG_ALONG[1], SPRANG_ALONG[0]), half = (JETTY.to - JETTY.from) / 2;
  b.obox(jx, (JETTY.y - 1.2) / 2, jz, half, (JETTY.y + 1.2) / 2, JETTY.half, yaw, STONE_DARK, { top: STONE });
  for (const t of [JETTY.from + 0.6, JETTY.from + 3, JETTY.from + 5.4]) {
    const [px, pz] = sprang(t, JETTY.d - JETTY.half - 0.12);
    b.cyl(px, pz, -1.2, JETTY.y + 0.5, 0.16, 0.16, 6, TIMBER_DARK);
  }
  for (const t of [JETTY.from + 1.2, JETTY.from + 4.2]) {
    const [px, pz] = sprang(t, JETTY.d - 0.35);
    b.cyl(px, pz, JETTY.y, JETTY.y + 0.5, 0.2, 0.22, 6, IRON_DARK);
  }
  const [lx, lz] = sprang(JETTY.from + 0.5, JETTY.d + 0.45);
  gasLamp(k, lx, JETTY.y + 1.8, lz, 1.8, AMBER);

  // ---- rocks along the isle's shore, but where the jetty and the boats are
  const R = rng(0xb1ac6a7e), isle = LANDS.blackgate;
  const [jaX, jaZ] = sprang(JETTY.from, JETTY.d), [jbX, jbZ] = sprang(JETTY.to, JETTY.d);
  const toJetty = (x: number, z: number): number => {
    const vx = jbX - jaX, vz = jbZ - jaZ, t = Math.max(0, Math.min(1, ((x - jaX) * vx + (z - jaZ) * vz) / (vx * vx + vz * vz)));
    return Math.hypot(x - jaX - vx * t, z - jaZ - vz * t);
  };
  const cx = isle.reduce((s, p) => s + p[0], 0) / isle.length, cz = isle.reduce((s, p) => s + p[1], 0) / isle.length;
  for (let i = 0; i < isle.length; i++) {
    const p = isle[i], q = isle[(i + 1) % isle.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    let ox = (q[1] - p[1]) / len, oz = -(q[0] - p[0]) / len;
    if (ox * ((p[0] + q[0]) / 2 - cx) + oz * ((p[1] + q[1]) / 2 - cz) < 0) { ox = -ox; oz = -oz; }
    const n = Math.max(1, Math.floor(len / 2.3));
    for (let j = 0; j < n; j++) {
      const f = (j + 0.3 + R() * 0.4) / n, x = p[0] + (q[0] - p[0]) * f + ox * (0.35 + R() * 0.5), z = p[1] + (q[1] - p[1]) * f + oz * (0.35 + R() * 0.5);
      const r = 0.6 + R() * 0.9, top = 0.1 + R() * R() * 2.1, ph = R() * 6, taper = 0.35 + R() * 0.45;
      if (toJetty(x, z) < 2.4 || toBoats(x, z) < 2.6 + r || (Math.abs(x - gx) < 1.8 && z < l.z0)) continue;
      b.cyl(x, z, -1.3, top, r, r * taper, 5, [ROCK, ROCK_DARK, ROCK_LIGHT][Math.floor(R() * 3)], { phase: ph });
    }
  }
}

// ---------------------------------------------------------------------------
// The Statue of Justice
// ---------------------------------------------------------------------------

/** How far before her middle the pedestal's top step is, and its height. */
const JUSTICE_STEP = { r: 2.1, y: 3.3 };

function justice(k: Build, l: Lot): void {
  const b = k.b, cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, y0 = l.base;
  const yaw = Math.atan2(TO_VIEW[2], TO_VIEW[0]), c = Math.cos(yaw), s = Math.sin(yaw);
  const world = (x: number, z: number): P2 => [cx + x * c - z * s, cz + x * s + z * c];
  // Built facing +x, her right hand to +z.
  b.moved(cx, 0, cz, yaw, () => {
    // three steps, the die with its corner piers and panels, a cornice with pinnacles, and the plinth she stands on
    b.box(-3.6, y0, -3.6, 3.6, 2.1, 3.6, STONE_LIGHT);
    b.box(-3.0, 2.1, -3.0, 3.0, 2.7, 3.0, STONE_TRIM);
    b.box(-2.4, 2.7, -2.4, 2.4, 3.3, 2.4, STONE_LIGHT);
    b.box(-2.05, 3.3, -2.05, 2.05, 3.8, 2.05, PALE_DARK);
    b.box(-1.8, 3.8, -1.8, 1.8, 8.6, 1.8, PALE, { faces: 'NESW' });
    for (const [px, pz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bx(b, px * 1.55, 3.8, pz > 0 ? 1.55 : -2.05, px * 2.05, 8.6, pz > 0 ? 2.05 : -1.55, PALE_LIGHT, { faces: 'NESW' });
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const f = 1.83, a = 1.15;
      if (nx !== 0) b.quad([nx * f, 4.6, -a], [nx * f, 4.6, a], [nx * f, 7.8, a], [nx * f, 7.8, -a], [nx, 0, 0], PALE_DARK);
      else b.quad([-a, 4.6, nz * f], [a, 4.6, nz * f], [a, 7.8, nz * f], [-a, 7.8, nz * f], [0, 0, nz], PALE_DARK);
    }
    b.box(-2.15, 8.6, -2.15, 2.15, 9.15, 2.15, PALE_LIGHT);
    for (const [px, pz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) pinnacle(b, px * 1.85, pz * 1.85, 9.15, 1.8, 0.25, PALE_LIGHT);
    b.box(-1.45, 9.15, -1.45, 1.45, 10.4, 1.45, PALE_DARK);
    // the robe, falling from her shoulders to the plinth, a belt at the waist, and her feet under its hem
    const Y = 10.4;
    const robe: [number, number][] = [[1.55, Y], [1.45, Y + 0.8], [1.22, Y + 4.6], [1.0, Y + 8.0], [0.86, Y + 8.8], [0.95, Y + 10.2], [1.08, Y + 11.8], [1.0, Y + 12.6]];
    for (let i = 0; i + 1 < robe.length; i++) b.cyl(0.08, 0, robe[i][1], robe[i + 1][1], robe[i][0], robe[i + 1][0], 8, PALE, { cap: false });
    b.cyl(0.08, 0, Y + 8.55, Y + 8.85, 0.93, 0.93, 8, PALE_DARK, { cap: false });
    b.cyl(0.08, 0, Y + 12.6, Y + 12.95, 1.0, 0.42, 8, PALE);
    for (const z of [-0.45, 0.25]) b.box(1.2, Y, z, 1.75, Y + 0.32, z + 0.32, PALE_DARK);
    // a fold of the robe down her front, and her hair down her back
    b.obox(1.1, Y + 5.0, -0.2, 0.18, 4.6, 0.22, 0, PALE_LIGHT);
    b.obox(-0.45, Y + 13.3, 0, 0.28, 1.0, 0.48, 0, PALE_DARK);
    // the shoulders, the neck and the head
    b.obox(0.05, Y + 12.35, 0, 0.55, 0.42, 1.3, 0, PALE);
    b.cyl(0.08, 0, Y + 12.9, Y + 13.45, 0.32, 0.32, 8, PALE, { cap: false });
    const H = Y + 13.4;
    b.cyl(0.08, 0, H, H + 0.5, 0.5, 0.62, 8, PALE, { cap: false });
    b.cyl(0.08, 0, H + 0.5, H + 1.2, 0.62, 0.58, 8, PALE, { cap: false });
    b.cyl(0.08, 0, H + 1.2, H + 1.7, 0.58, 0.2, 8, PALE);
    // the blindfold, with its knot and tails behind
    b.cyl(0.08, 0, H + 0.62, H + 0.95, 0.67, 0.67, 8, PALE_LIGHT, { cap: false });
    b.box(-0.72, H + 0.55, -0.16, -0.56, H + 1.0, 0.16, PALE_LIGHT, { faces: 'NESWTB' });
    for (const z of [-0.12, 0.12]) b.beam([-0.66, H + 0.6, z], [-0.85, H - 0.5, z * 2.4], 0.08, 0.05, PALE_LIGHT);
    // the crown: a band and five spikes fanned across her brow
    b.cyl(0.08, 0, H + 1.12, H + 1.42, 0.64, 0.6, 8, PALE_LIGHT, { cap: false });
    for (const deg of [-64, -32, 0, 32, 64]) {
      const a = (deg * PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
      b.beam([0.08 + 0.5 * ca, H + 1.3, 0.5 * sa], [0.08 + 1.2 * ca, H + 2.75, 1.2 * sa], 0.13, 0.02, PALE_LIGHT);
    }
    // her right arm, bent, the hand holding the sword upright before her shoulder
    const RS: V3 = [0.1, Y + 12.3, 1.15], RE: V3 = [0.55, Y + 10.9, 1.38], RH: V3 = [1.25, Y + 11.6, 1.15];
    b.beam(RS, RE, 0.3, 0.26, PALE);
    b.beam(RE, RH, 0.26, 0.2, PALE);
    b.box(RH[0] - 0.2, RH[1] - 0.2, RH[2] - 0.2, RH[0] + 0.2, RH[1] + 0.2, RH[2] + 0.2, PALE, { faces: 'NESWTB' });
    b.beam([RH[0], RH[1] - 0.55, RH[2]], [RH[0], RH[1] + 0.25, RH[2]], 0.09, 0.09, PALE_DARK);
    b.beam([RH[0], RH[1] + 0.32, RH[2] - 0.48], [RH[0], RH[1] + 0.32, RH[2] + 0.48], 0.1, 0.1, PALE_DARK);
    const bl0 = RH[1] + 0.42, bl1 = 29.1;
    b.obox(RH[0], (bl0 + bl1) / 2, RH[2], 0.05, (bl1 - bl0) / 2, 0.19, 0, PALE_LIGHT);
    for (const sx of [-1, 1]) face3(b, [RH[0] + sx * 0.05, bl1, RH[2] - 0.19], [RH[0] + sx * 0.05, bl1, RH[2] + 0.19], [RH[0], bl1 + 0.32, RH[2]], [sx, 0, 0], PALE_LIGHT);
    // her left arm, held out to her side, the scales hanging from her hand, level
    const LS: V3 = [0.1, Y + 12.3, -1.15], LE: V3 = [0.35, Y + 11.1, -1.75], LH: V3 = [0.95, Y + 11.3, -2.5];
    b.beam(LS, LE, 0.3, 0.26, PALE);
    b.beam(LE, LH, 0.26, 0.2, PALE);
    b.box(LH[0] - 0.19, LH[1] - 0.19, LH[2] - 0.19, LH[0] + 0.19, LH[1] + 0.19, LH[2] + 0.19, PALE, { faces: 'NESWTB' });
    const bar = LH[1] - 0.5;
    b.beam([LH[0], LH[1] - 0.15, LH[2]], [LH[0], bar, LH[2]], 0.05, 0.05, PALE_DARK);
    b.beam([LH[0], bar, LH[2] - 0.95], [LH[0], bar, LH[2] + 0.85], 0.07, 0.07, PALE_DARK);
    for (const pz of [LH[2] - 0.9, LH[2] + 0.8]) {
      const py = bar - 1.75;
      for (const dx of [-0.36, 0.36]) b.beam([LH[0], bar, pz], [LH[0] + dx, py + 0.22, pz], 0.035, 0.035, PALE_DARK);
      b.cyl(LH[0], pz, py, py + 0.24, 0.25, 0.48, 7, PALE_LIGHT);
    }
  });
  // a lamp at each corner of the pedestal's second step, and a pool of light on her
  for (const [px, pz] of [[2.7, 2.7], [2.7, -2.7], [-2.7, 2.7], [-2.7, -2.7]]) { const [x, z] = world(px, pz); gasLamp(k, x, 2.7 + 2.0, z, 2.0, AMBER); }
  k.lights.push({ x: cx, z: cz, r: 10, color: AMBER, k: 0.6 });
  // the name, on a small board at the pedestal's foot, facing the view
  const [sx, sz] = world(4.3, 0), fx = TO_VIEW[0], fz = TO_VIEW[2];
  const w = k.sign('bay-justice', sx, y0 + 1.7, sz, fx, fz, 0.95, 2.8);
  BOARDS.push({ x: sx, z: sz, w });
  b.obox(sx - fx * 0.06, y0 + 1.7, sz - fz * 0.06, w / 2 + 0.12, 0.58, 0.05, Math.atan2(fx, -fz), DARK, { faces: 'B' });
  for (const sd of [-1, 1]) { const px = sx - fz * sd * (w / 2 + 0.12) - fx * 0.1, pz = sz + fx * sd * (w / 2 + 0.12) - fz * 0.1; b.beam([px, y0, pz], [px, y0 + 2.3, pz], 0.08, 0.07, IRON); }
}

// ---------------------------------------------------------------------------
// The Iceberg Casino
// ---------------------------------------------------------------------------

const CASINO_TURN = (Math.atan2(SPRANG_ALONG[1], SPRANG_ALONG[0]) * 180) / PI;
const CC = Math.cos((CASINO_TURN * PI) / 180), CS = Math.sin((CASINO_TURN * PI) / 180);
/** A place on the casino, in her own coordinates (x towards her bow, z towards the quay), on the board. */
const onCasino = (x: number, z: number): P2 => [CASINO.c[0] + x * CC - z * CS, CASINO.c[1] + x * CS + z * CC];
/** Whether a place on her is clear of the stage on her deck, with a little to spare. */
const offStage = (x: number, z: number): boolean => Math.max(Math.abs(x * CC - z * CS), Math.abs(x * CS + z * CC)) > 5.2;
/** Her deck's outline: a rounded stern, her full beam, and a pointed bow. */
const OUTLINE: P2[] = [[-10, -4.5], [-9.2, -5.5], [4, -5.5], [7.5, -3.4], [10, 0], [7.5, 3.4], [4, 5.5], [-9.2, 5.5], [-10, 4.5]];
const CASINO_DECK = 3.0;

/** A face of the iceberg, turned to look away from `c`. */
function facet(b: GeoBuilder, pts: V3[], c: V3, color: number, lit: number): void {
  const [p0, p1, p2] = pts, ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2], bx2 = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
  let n: V3 = [ay * bz - az * by, az * bx2 - ax * bz, ax * by - ay * bx2];
  const m = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length, s[2] + p[2] / pts.length] as V3, [0, 0, 0] as V3);
  if (n[0] * (m[0] - c[0]) + n[1] * (m[1] - c[1]) + n[2] * (m[2] - c[2]) < 0) n = [-n[0], -n[1], -n[2]];
  const l = Math.hypot(...n) || 1;
  n = [n[0] / l, n[1] / l, n[2] / l];
  if (pts.length === 4) b.quad(pts[0], pts[1], pts[2], pts[3], n, color, { win: interior(lit) });
  else face3(b, pts[0], pts[1], pts[2], n, color, { win: interior(lit) });
}

function casino(k: Build): void {
  const R = rng(0x1ceb3);
  placed(k, CASINO.c[0], CASINO.c[1], CASINO_TURN, (kk) => {
    const b = kk.b, Y = CASINO_DECK;
    // ---- the hull: dark, with a red boot-top at the waterline and a pale line at her sheer
    for (let i = 0; i < OUTLINE.length; i++) {
      const p = OUTLINE[i], q = OUTLINE[(i + 1) % OUTLINE.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      let nx = (q[1] - p[1]) / len, nz = -(q[0] - p[0]) / len;
      if (nx * (p[0] + q[0]) + nz * (p[1] + q[1]) < 0) { nx = -nx; nz = -nz; }
      const at = (v: P2, y: number, out = 0): V3 => [v[0] + nx * out, y, v[1] + nz * out];
      b.quad(at(p, -1.2), at(q, -1.2), at(q, Y), at(p, Y), [nx, 0, nz], HULL);
      b.quad(at(p, -0.85, 0.03), at(q, -0.85, 0.03), at(q, -0.55, 0.03), at(p, -0.55, 0.03), [nx, 0, nz], HULL_RED);
      b.quad(at(p, 2.45, 0.03), at(q, 2.45, 0.03), at(q, 2.72, 0.03), at(p, 2.72, 0.03), [nx, 0, nz], ICE_BLUE);
      // portholes, lit at night
      const n = Math.floor(len / 1.4);
      for (let j = 1; j < n; j++) { const f = j / n, x = p[0] + (q[0] - p[0]) * f + nx * 0.05, z = p[1] + (q[1] - p[1]) * f + nz * 0.05; kk.glows.push({ x, y: 1.35, z, sx: 0.18, sy: 0.18, sz: 0.18, color: '#ffe6b0' }); }
    }
    flat(b, OUTLINE, Y, DECK);
    parapet(b, [...OUTLINE, OUTLINE[0]], Y, 0.45, 0.16, 0xcfd8de);
    // ---- the prize turntable, its top where the hero's place is, ringed with lights
    b.cyl(0, 0, Y, Y + 0.3, 4.6, 4.6, 16, 0x3a3f48, { cap: 0x8c929c });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * PI * 2; kk.glows.push({ x: Math.cos(a) * 4.72, y: Y + 0.15, z: Math.sin(a) * 4.72, sx: 0.16, sy: 0.16, sz: 0.16, color: ICE }); }
    // ---- the iceberg on her stern half: a leaning mass with a V-shaped front that wraps round the deck, and
    // shards of ice rising from it, white and ice blue, lit from within at night
    const F: P2[] = [[-9.5, -4.9], [-3.6, -5.0], [-4.8, -2.8], [-7.4, 0], [-4.9, 2.9], [-3.6, 5.0], [-9.5, 4.9], [-10.0, 0]];
    const mc: V3 = [-8.6, 5, 0], TOP = 7.4;
    const topOf = (p: P2): V3 => [mc[0] + (p[0] - mc[0]) * 0.82, TOP, p[1] * 0.82];
    for (let i = 0; i < F.length; i++) {
      const p = F[i], q = F[(i + 1) % F.length];
      facet(b, [[p[0], Y, p[1]], [q[0], Y, q[1]], topOf(q), topOf(p)], [mc[0], Y, mc[2]], i % 2 ? ICE_WHITE : ICE_BLUE, i % 2 ? 0.5 : 0.85);
      facet(b, [topOf(p), topOf(q), [mc[0], TOP + 1.2, 0]], [mc[0], 0, 0], ICE_WHITE, 0.5);
    }
    const shards: [number, number, number, number, number][] = [
      [-9.3, 0, 1.8, 12.9, TOP], [-8.4, -3.2, 1.6, 11.2, TOP - 0.4], [-8.2, 3.3, 1.7, 11.7, TOP - 0.4], [-9.8, -1.9, 1.2, 10.6, TOP], [-9.6, 2.0, 1.15, 10.2, TOP],
      [-5.4, -4.2, 1.2, 9.4, Y], [-5.3, 4.2, 1.2, 9.9, Y], [-6.9, -2.3, 0.95, 8.3, Y + 2], [-6.9, 2.3, 0.95, 8.6, Y + 2], [-4.2, -4.6, 0.7, 6.4, Y], [-4.1, 4.6, 0.7, 6.8, Y],
      [-7.6, -4.5, 1.0, 9.0, Y + 1], [-7.4, 4.6, 1.0, 9.4, Y + 1],
    ];
    for (const [x, z, r, top, base] of shards) {
      const n = 5, ph = R() * 6, lx = (R() - 0.5) * 0.6 * r, lz = (R() - 0.5) * 0.6 * r, ym = base + (top - base) * (0.5 + R() * 0.15);
      const ring = (rr: number, y: number, ox: number, oz: number): V3[] => Array.from({ length: n }, (_, i) => { const a = ph + (i / n) * PI * 2, j = 0.82 + R() * 0.32; return [x + ox + Math.cos(a) * rr * j, y, z + oz + Math.sin(a) * rr * j]; });
      const r0 = ring(r, base, 0, 0);
      if (r0.some((p) => !offStage(p[0], p[2]))) continue;
      const r1 = ring(r * 0.62, ym, lx * 0.5, lz * 0.5), apex: V3 = [x + lx, top, z + lz], c: V3 = [x, (base + top) / 2, z];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        facet(b, [r0[i], r0[j], r1[j], r1[i]], c, i % 2 ? ICE_WHITE : ICE_BLUE, i % 2 ? 0.45 : 0.8);
        facet(b, [r1[i], r1[j], apex], c, (i + n) % 3 ? ICE_WHITE : ICE_DEEP, 0.6);
      }
    }
    // ---- her name, in neon on a dark board over the iceberg's front, facing the view
    b.obox(-7.02, 8.35, 0, 0.06, 0.78, 2.45, 0, DARK, { faces: 'B' });
    for (const z of [-2.1, 2.1]) b.beam([-7.1, TOP - 0.2, z], [-7.1, 7.6, z], 0.07, 0.07, IRON_DARK);
    kk.sign('bay-casino', -6.93, 8.35, 0, 1, 0, 1.3, 4.6);
    // ---- strings of lamps round her deck's edge, on posts no taller than a person
    const posts: P2[] = [[-2.6, -5.35], [0.6, -5.35], [3.6, -5.35], [6.0, -3.9], [-2.6, 5.35], [0.6, 5.35], [3.6, 5.35], [6.0, 3.9]];
    for (const [x, z] of posts) b.beam([x, Y + 0.45, z], [x, Y + 1.9, z], 0.06, 0.05, 0xd6dde2);
    const bulbs = (a: V3, c: V3, n: number, sag: number): void => {
      for (let i = 1; i < n; i++) { const f = i / n; kk.glows.push({ x: a[0] + (c[0] - a[0]) * f, y: a[1] + (c[1] - a[1]) * f - sag * 4 * f * (1 - f), z: a[2] + (c[2] - a[2]) * f, sx: 0.16, sy: 0.16, sz: 0.16, color: i % 3 === 0 ? NEON_CYAN : i % 3 === 1 ? ICE : '#ffffff' }); }
    };
    for (const sd of [0, 4]) for (let i = 0; i < 3; i++) bulbs([posts[sd + i][0], Y + 1.9, posts[sd + i][1]], [posts[sd + i + 1][0], Y + 1.9, posts[sd + i + 1][1]], 6, 0.35);
    // at her bow, which lies under the bridge's edge, the bulbs run along the bulwark
    for (const sd of [-1, 1]) bulbs([6.0, Y + 1.9, sd * 3.9], [9.8, Y + 0.55, 0], 7, 0.1);
    // ---- the gangway to the quay, with its rails
    const ga: V3 = [-2.6, Y + 0.02, 5.35], gc: V3 = [-7.6, 0.06, 7.95];
    slab(b, ga, gc, 0.55, 0.12, TIMBER, { under: TIMBER_DARK });
    const gl = Math.hypot(gc[0] - ga[0], gc[2] - ga[2]), px = (-(gc[2] - ga[2]) / gl) * 0.55, pz = ((gc[0] - ga[0]) / gl) * 0.55;
    for (const sd of [-1, 1]) {
      const A: V3 = [ga[0] + px * sd, ga[1], ga[2] + pz * sd], C: V3 = [gc[0] + px * sd, gc[1], gc[2] + pz * sd];
      b.beam([A[0], A[1] + 0.95, A[2]], [C[0], C[1] + 0.95, C[2]], 0.05, 0.05, 0xd6dde2);
      for (const P of [A, C]) b.beam(P, [P[0], P[1] + 0.95, P[2]], 0.05, 0.05, 0xd6dde2);
    }
    kk.glows.push({ x: gc[0], y: 1.2, z: gc[2] + 0.2, sx: 0.25, sy: 0.25, sz: 0.25, color: ICE });
    // ---- her moorings: bitts on deck, lines to bollards on the quay
    for (const [bx0, qx] of [[-8.6, -8.4], [3.0, 4.8]]) {
      b.cyl(bx0, 4.8, Y, Y + 0.45, 0.2, 0.2, 6, IRON_DARK);
      b.cyl(qx, 7.25, 0, 0.7, 0.24, 0.28, 6, IRON_DARK);
      b.beam([bx0, Y + 0.35, 4.8], [qx, 0.6, 7.25], 0.04, 0.04, TIMBER_PALE);
    }
    // ---- a few at her rail and at the gangway's foot
    for (const [x, z, y] of [[4.6, 3.2, Y], [4.6, -3.2, Y], [5.0, -2.4, Y], [-6.6, 8.5, 0], [-7.2, 9.0, 0], [-6.0, 9.2, 0]]) kk.person(x, z, y);
    // ---- the light she throws on the water and the quay
    kk.lights.push({ x: 0, z: 0, r: 14, color: ICE, k: 0.7 });
    kk.lights.push({ x: -7, z: 0, r: 11, color: NEON_CYAN, k: 0.55 });
    kk.lights.push({ x: -6, z: 8, r: 8, color: ICE, k: 0.5 });
    for (const [x, y, z] of [[-6.9, 6.0, -2.6], [-6.9, 6.0, 2.6], [-8.0, 9.5, 0], [-5.5, 5.5, -4.2], [-5.5, 5.5, 4.2]]) kk.glows.push({ x, y, z, sx: 0.5, sy: 0.5, sz: 0.5, color: ICE });
  });
}

// ---------------------------------------------------------------------------
// The water: buoys, and rocks awash off Blackgate
// ---------------------------------------------------------------------------

/** Whether a place on the water is open for something of ours: water all round, clear of the boats, the freighter and the pier. */
function openWater(x: number, z: number, room: number): boolean {
  for (const [dx, dz] of [[0, 0], [room, 0], [-room, 0], [0, room], [0, -room]]) if (groundAt(x + dx, z + dz) >= 0) return false;
  if (toBoats(x, z) < 3 + room) return false;
  if (x > 81 && x < 106 && z > 57 && z < 69) return false;
  if (x > 20 && x < 50 && z > 32 && z < 52) return false;
  return true;
}

function buoy(k: Build, x: number, z: number, kind: 'red' | 'green' | 'bell' | 'mooring'): void {
  const b = k.b;
  if (kind === 'mooring') {
    b.cyl(x, z, -1.1, -0.45, 0.6, 0.55, 8, 0xd8d4c8);
    b.cyl(x, z, -0.45, -0.25, 0.3, 0.2, 6, IRON_DARK);
    return;
  }
  const body = kind === 'red' ? 0x9a2a2a : kind === 'green' ? 0x2f6b45 : 0xb08a2a;
  const r = kind === 'bell' ? 0.95 : 0.6;
  b.cyl(x, z, -1.2, -0.5, r, r, 8, body);
  b.cyl(x, z, -0.5, -0.38, r + 0.1, r + 0.1, 8, IRON_DARK);
  if (kind === 'bell') {
    for (const [dx, dz] of [[-0.55, -0.55], [0.55, -0.55], [0.55, 0.55], [-0.55, 0.55]]) b.beam([x + dx, -0.38, z + dz], [x + dx * 0.35, 1.6, z + dz * 0.35], 0.05, 0.05, body);
    b.cyl(x, z, 0.6, 1.2, 0.35, 0.25, 6, BRASS_DULL);
    b.cyl(x, z, 1.6, 1.75, 0.3, 0.3, 6, IRON_DARK);
    k.glows.push({ x, y: 1.95, z, sx: 0.25, sy: 0.25, sz: 0.25, color: '#ffffff' });
  } else if (kind === 'red') {
    b.cyl(x, z, -0.38, 0.75, 0.45, 0.08, 6, body, { cap: false });
    k.glows.push({ x, y: 0.95, z, sx: 0.22, sy: 0.22, sz: 0.22, color: '#ff3b3b' });
  } else {
    b.cyl(x, z, -0.38, 0.6, 0.38, 0.38, 6, body);
    k.glows.push({ x, y: 0.8, z, sx: 0.22, sy: 0.22, sz: 0.22, color: '#4dff7a' });
  }
}

const BRASS_DULL = 0xa88a44;

/** The buoys, as [x, z, kind]: channel buoys along the fairway's edges, a bell buoy at the harbour's mouth, moorings off the yards. */
const BUOYS: [number, number, 'red' | 'green' | 'bell' | 'mooring'][] = [
  [79, 67.6, 'red'], [86.4, 75.6, 'red'], [60.6, 76.7, 'green'], [63.7, 84.7, 'green'],
  [73.8, 103.5, 'bell'], [57.8, 82.2, 'mooring'], [62, 90.5, 'mooring'],
];

/** Rocks awash off Blackgate's south and east shores. */
const AWASH: [number, number, number][] = [[80.5, 106.5, 1.0], [82.2, 108.2, 0.7], [91.5, 108.5, 1.1], [93.6, 110.2, 0.8], [97.2, 107.8, 0.9], [102.4, 100.8, 0.8], [101.6, 106.4, 0.6]];

export function extras(k: Build): void {
  for (const [x, z, kind] of BUOYS) {
    if (!openWater(x, z, 1.2)) { if (import.meta.env.DEV) console.warn(`Gotham: bay leaves out a buoy at (${x}, ${z}).`); continue; }
    buoy(k, x, z, kind);
  }
  const R = rng(0xa3a5);
  for (const [x, z, r] of AWASH) {
    if (!openWater(x, z, 0.2)) continue;
    k.b.cyl(x, z, -1.3, -0.55 + R() * 0.7, r, r * 0.5, 5, R() > 0.5 ? ROCK_DARK : ROCK, { phase: R() * 6 });
    k.b.cyl(x + r * 0.9, z - r * 0.4, -1.3, -0.75 + R() * 0.3, r * 0.6, r * 0.3, 5, ROCK_DARK, { phase: R() * 6 });
  }
}

// ---------------------------------------------------------------------------
// What the tile calls
// ---------------------------------------------------------------------------

/** A model for each lot this file builds, by the lot's id. */
export const MODELS: Record<string, Model> = {
  'cobblepot-bridge': (k) => { cobblepot(k); Object.assign(PLACES, places(deckY)); },
  blackgate,
  justice,
  casino: (k) => casino(k),
};

/** Lots that are built as part of another lot's model or by `extras`, and so get no box either. */
export const COVERS: string[] = [];

/** Every sign this file hangs. Each id begins with `bay-`. */
export const SIGNS: SignDef[] = [
  { id: 'bay-cobblepot', lines: ['COBBLEPOT', 'BRIDGE'], color: '#1d1f24', ink: '#e9e2cf', aspect: 2.1, kind: 'board', size: [110, 52] },
  nameSign('bay-blackgate', 'Blackgate'),
  { id: 'bay-justice', lines: ['STATUE OF', 'JUSTICE'], color: '#1d1f24', ink: '#e9e2cf', aspect: 2.4, kind: 'board', size: [116, 48] },
  { id: 'bay-casino', lines: ['ICEBERG', 'CASINO'], color: ICE, aspect: 2.2, kind: 'neon', size: [120, 56] },
];

/** The places the show needs on what this file builds, worked out from the plan and, once built, from the deck. */
function places(deck: (x: number, z: number) => number): Record<string, Place> {
  const p = (xz: P2, y: number, h: number): Place => ({ x: xz[0], y, z: xz[1], h });
  const crown = 23.8, [mx, mz] = onSpan(crown, -7.0);
  const jl = lotJustice(), jc: P2 = [(jl.x0 + jl.x1) / 2, (jl.z0 + jl.z1) / 2];
  const bg = lotBlackgate(), gx = (bg.x0 + bg.x1) / 2;
  const wx = bg.x1 - 0.4 - 0.3, wz = bg.z1 - 0.4 - 0.3;
  const casinoH = Math.atan2(SPRANG_ALONG[1], SPRANG_ALONG[0]);
  return {
    bridgeTowerEast: p(onSpan(TOWER.east, 0), ARCH.top + 0.4, WEST_H),
    bridgeTowerWest: p(onSpan(TOWER.west, 0), ARCH.top + 0.4, EAST_H),
    cableTop: p(onSpan(TOWER.west, -CABLE_R), 29.4, SE_H),
    bridgeMid: p([mx, mz], deck(mx, mz) + 1.1, SE_H),
    blackgateJetty: p(sprang(JETTY.from + 0.4, JETTY.d), JETTY.y, Math.atan2(-SPRANG_ALONG[1], -SPRANG_ALONG[0])),
    searchlight: p([wx, wz], 15.5, SE_H),
    blackgateGate: p([gx, bg.z0 - 2.0], bg.base + 0.04, -PI / 2),
    justiceFoot: p([jc[0] + TO_VIEW[0] * JUSTICE_STEP.r, jc[1] + TO_VIEW[2] * JUSTICE_STEP.r], JUSTICE_STEP.y, Math.atan2(TO_VIEW[2], TO_VIEW[0])),
    casinoDeck: p(onCasino(-1.2, 5.0), CASINO_DECK, casinoH),
    casinoBow: p(onCasino(8.6, 0), CASINO_DECK, casinoH),
    casinoGangway: p(onCasino(-7.9, 8.25), 0, Math.atan2(-CC, CS)),
  };
}

const lotJustice = (): Lot => lotOf('justice');
const lotBlackgate = (): Lot => lotOf('blackgate');

/** Places on what this file builds that the show needs as built: its task names them. */
export const PLACES: Record<string, Place> = places((x, z) => bridgeY(x, z) ?? 0);
