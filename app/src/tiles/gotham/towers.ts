// The Crown: Wayne Tower, the Kane Building, the Elliot Tower, Gotham Cathedral, the Wayne Foundation, and the Crown's walls and stairs.
//
// The Crown is the terrace at 13 on Old Gotham's upper city that the towers
// stand on, and this file is the tile's skyline. Each tower is told from the
// others by its outline alone:
//
// - Wayne Tower: a square shaft of dark stone with strong ribs, setbacks with
//   corner turrets, an octagon, a gallery of twelve great gargoyles, one to
//   each way into the city, and a glass dome over them, lit from inside.
// - the Kane Building: a slender neo-Gothic office tower that splits into two
//   towers, each with a steep four-sided spire, a bridge between them.
// - the Elliot Tower: a deco ziggurat, stepping back four times to a copper
//   pyramid with a lantern on it.
// - Gotham Cathedral: a cruciform church with one octagonal spire at its west
//   end, flying buttresses, and a rose window in its south transept.
// - the Wayne Foundation: a low block round an atrium, its glass roof open in
//   the middle for the crown of the great tree, a glass penthouse on its roof.
//
// Pinkney's walkways join them: covered bridges at three heights.

import { interior, type BoxOpts, type GeoBuilder, type QuadOpts, type V3 } from '../../engine/geo';
import { area, rect } from '../../engine/ground';
import { D, Q, lathe, pinnacle, tri } from '../../engine/parts';
import { beacon, chamfered, face3, prism, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import {
  AMBER, BRASS, COPPER, COPPER_DARK, DARK, GLASS, GLASS_WIN, GOTHIC_WIN, IRON, LEAD, OFFICE_WIN, SLATE, SODIUM,
  STEEL, STONE, STONE_DARK, STONE_LIGHT, STONE_TRIM, TO_VIEW, balustrade, gargoyle, gasLamp, nameSign, parapet, waterTank,
} from './look';
import type { Model, Place } from './models';
import { CROWN, HERO_SPOTS, Y, lotOf, type Lot } from './plan';
import { open } from './space';

// ---------------------------------------------------------------------------
// Colours of this file's own
// ---------------------------------------------------------------------------

/** The Kane Building's darker stone, the Elliot Tower's paler deco stone, the Foundation's. */
const KANE_STONE = 0x363a44, ELLIOT_STONE = 0x5d5f66, ELLIOT_DARK = 0x4a4c53, FOUNDATION_STONE = 0x4a4d55;
/** A lit window or doorway that is built: dark and warm by day, glowing at night. */
const WARM = 0x3d3226, STAINED = 0x3e2d3a, ROSE = 0x40304e;
const LIT = interior(2.4), LIT_SOFT = interior(1.5);
/** The flags of the forecourt, and the green of the Foundation's tree and roof garden. */
const FORECOURT = 0x8b8983, FORECOURT_BAND = 0x5f6068, LEAF = 0x3f6b3e, LEAF_DARK = 0x33573a, LAWN = 0x4f7a47, BARK = 0x5a4030;

/** The way the opening view looks back from, as a heading. */
const TO_VIEW_H = Math.atan2(TO_VIEW[2], TO_VIEW[0]);

// ---------------------------------------------------------------------------
// Small parts on walls
// ---------------------------------------------------------------------------

type Face = 'N' | 'E' | 'S' | 'W';
const NORMAL: Record<Face, V3> = { N: [0, 0, -1], E: [1, 0, 0], S: [0, 0, 1], W: [-1, 0, 0] };
/** A point on a wall that faces `f`: `at` is the wall's plane (z for N and S, x for E and W), `u` along it, `v` up. */
const onWall = (f: Face, at: number, u: number, v: number): V3 => (f === 'N' || f === 'S' ? [u, v, at] : [at, v, u]);

/** A flat rectangle on a wall. */
function panel(b: GeoBuilder, f: Face, at: number, u0: number, u1: number, v0: number, v1: number, color: number, o: QuadOpts = {}): void {
  b.quad(onWall(f, at, u0, v0), onWall(f, at, u1, v0), onWall(f, at, u1, v1), onWall(f, at, u0, v1), NORMAL[f], color, o);
}

/**
 * A pointed arch, flat on a wall: a window, a doorway, a blind arch. It is `w`
 * wide, upright from `y0` to `spring`, and pointed above: `sharp` 1 is the
 * equilateral arch, 0.5 a round one. Returns the height of its point.
 */
function arch(b: GeoBuilder, f: Face, at: number, u: number, y0: number, w: number, spring: number, color: number, o: QuadOpts = {}, sharp = 1, n = 3): number {
  const h = w / 2, R = w * sharp, am = Math.acos((R - h) / R);
  const pts: [number, number][] = [[u - h, y0], [u + h, y0], [u + h, spring]];
  for (let i = 1; i <= n; i++) { const a = (i / n) * am; pts.push([u + h - R + Math.cos(a) * R, spring + Math.sin(a) * R]); }
  for (let i = n - 1; i >= 0; i--) { const a = (i / n) * am; pts.push([u - h + R - Math.cos(a) * R, spring + Math.sin(a) * R]); }
  const P = pts.map(([pu, pv]) => onWall(f, at, pu, pv));
  for (let i = 1; i + 1 < P.length; i++) tri(b, P[0], P[i], P[i + 1], NORMAL[f], color, o);
  return spring + R * Math.sin(am);
}

/** A window of the old kind: a pointed arch of glass in a frame of pale stone, a hair proud of the wall. */
function lancet(b: GeoBuilder, f: Face, at: number, u: number, y0: number, w: number, spring: number, glass = WARM, lit = LIT, sharp = 1): void {
  const out = f === 'S' || f === 'E' ? 1 : -1;
  arch(b, f, at + out * 0.02, u, y0 - 0.2, w + 0.44, spring, STONE_TRIM, {}, sharp);
  arch(b, f, at + out * 0.04, u, y0, w, spring, glass, { win: lit }, sharp);
}

/** A box that stands out from a wall: a rib, a pilaster, a buttress, a band. `u0..u1` along the wall, `proud` how far out. */
function onFace(b: GeoBuilder, f: Face, at: number, u0: number, u1: number, y0: number, y1: number, proud: number, color: number, o: BoxOpts = {}): void {
  const faces = o.faces ?? (f === 'N' || f === 'S' ? `${f}EWT` : `${f}NST`);
  const q = { ...o, faces };
  if (f === 'S') b.box(u0, y0, at - 0.05, u1, y1, at + proud, color, q);
  if (f === 'N') b.box(u0, y0, at - proud, u1, y1, at + 0.05, color, q);
  if (f === 'E') b.box(at - 0.05, y0, u0, at + proud, y1, u1, color, q);
  if (f === 'W') b.box(at - proud, y0, u0, at + 0.05, y1, u1, color, q);
}

/** Ribs up every face of a box: one every `step` along each face, `w` wide and `proud` out. */
function ribs(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, step: number, color: number, w = 0.45, proud = 0.3): void {
  for (const f of ['N', 'E', 'S', 'W'] as Face[]) {
    const along = f === 'N' || f === 'S', a = along ? x0 : z0, c = along ? x1 : z1, at = f === 'N' ? z0 : f === 'S' ? z1 : f === 'E' ? x1 : x0;
    const n = Math.round((c - a) / step);
    for (let i = 1; i < n; i++) {
      const u = a + ((c - a) * i) / n;
      onFace(b, f, at, u - w / 2, u + w / 2, y0, y1, proud, color);
    }
  }
}

/** A band of pale stone round a box, `proud` out from it, from `y0` to `y1`, seen from above and below. */
function band(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, proud: number, color = STONE_TRIM, top?: number): void {
  b.box(x0 - proud, y0, z0 - proud, x1 + proud, y1, z1 + proud, color, { faces: 'NESWTB', top });
}

/** A flat many-sided disc that faces down: the underside of a ring. */
function under(b: GeoBuilder, cx: number, cz: number, y: number, r: number, sides: number, color: number): void {
  const ph = Math.PI / sides;
  for (let i = 0; i < sides; i++) {
    const a0 = ph + (i / sides) * Math.PI * 2, a1 = ph + ((i + 1) / sides) * Math.PI * 2;
    face3(b, [cx, y, cz], [cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r], [0, -1, 0], color);
  }
}

/** A pitched roof whose end walls close right up under its ridge, its slopes with an underside. The ridge runs along x or z. */
function pitched(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, rise: number, roof: number, wall: number, along: 'x' | 'z', over = 0.3, ends = 'both'): void {
  if (along === 'x') {
    const zc = (z0 + z1) / 2, half = (x1 - x0) / 2 + over, xm = (x0 + x1) / 2, run = (z1 - z0) / 2, drop = (over * rise) / run;
    slab(b, [xm, y + rise, zc], [xm, y - drop, z0 - over], half, 0.22, roof, { under: STONE_DARK });
    slab(b, [xm, y + rise, zc], [xm, y - drop, z1 + over], half, 0.22, roof, { under: STONE_DARK });
    if (ends !== 'east') face3(b, [x0, y, z0], [x0, y, z1], [x0, y + rise, zc], [-1, 0, 0], wall);
    if (ends !== 'west') face3(b, [x1, y, z0], [x1, y, z1], [x1, y + rise, zc], [1, 0, 0], wall);
  } else {
    const xc = (x0 + x1) / 2, half = (z1 - z0) / 2 + over, zm = (z0 + z1) / 2, run = (x1 - x0) / 2, drop = (over * rise) / run;
    slab(b, [xc, y + rise, zm], [x0 - over, y - drop, zm], half, 0.22, roof, { under: STONE_DARK });
    slab(b, [xc, y + rise, zm], [x1 + over, y - drop, zm], half, 0.22, roof, { under: STONE_DARK });
    face3(b, [x0, y, z0], [x1, y, z0], [xc, y + rise, z0], [0, 0, -1], wall);
    face3(b, [x0, y, z1], [x1, y, z1], [xc, y + rise, z1], [0, 0, 1], wall);
  }
}

/** The aspect of a name board's lettering, as `nameSign` sets it. */
const aspectOf = (text: string): number => Math.max(2.4, text.length * 0.62);

/** A name in pale capitals on a dark board fixed to a wall that faces `f`, centred at `u`, `y`. */
function wallSign(k: Build, id: string, text: string, f: Face, at: number, u: number, y: number, h: number, maxW: number): void {
  const n = NORMAL[f], out = n[0] + n[2];
  const hh = Math.min(h, maxW / aspectOf(text)), w = hh * aspectOf(text);
  const [sx, , sz] = onWall(f, at + out * 0.13, u, y);
  k.sign(id, sx, y, sz, n[0], n[2], hh, maxW);
  onFace(k.b, f, at, u - w / 2 - 0.14, u + w / 2 + 0.14, y - hh / 2 - 0.12, y + hh / 2 + 0.12, 0.1, DARK, { faces: f === 'N' || f === 'S' ? `${f}EWTB` : `${f}NSTB` });
}

// ---------------------------------------------------------------------------
// Wayne Tower
// ---------------------------------------------------------------------------
//
// A square shaft of dark stone, ribbed, with a buttress at each corner, to a
// first setback at 44; a narrower shaft with a turret at each corner to 68; an
// octagon to 84, ringed at its top by a gallery of twelve great gargoyles, one
// guarding each way into the city; and over them the glass dome of the
// observation deck, a lantern and a mast. The great gargoyle on the first
// setback's south-east corner is Batman's perch, and the thirteenth, for those
// who come by air, crouches on a corbel on the octagon's east face, under the
// gallery. Low wings at its foot, linked to it, are its escape routes; the
// door is a tall pointed arch in a porch on the south face, onto the
// forecourt.

interface WayneParts {
  cx: number; cz: number;
  /** The lower shaft, the upper shaft's half width, the octagon's half width. */
  A: { x0: number; x1: number; z0: number; z1: number };
  hB: number; hC: number;
  /** Where the plinth, the setbacks, the gallery and the dome end. */
  yP: number; yA: number; yB: number; yC: number; yDome: number;
  /** The great gargoyle on the first setback, and the thirteenth. */
  perch: { x: number; y: number; z: number; yaw: number; s: number };
  thirteenth: { x: number; y: number; z: number; s: number };
}

function wayneOf(l: Lot): WayneParts {
  const cx = (l.x0 + l.x1) / 2;
  const A = { x0: cx - 7, x1: cx + 7, z1: l.z1 - 1, z0: l.z1 - 15 };
  const cz = (A.z0 + A.z1) / 2;
  const yA = l.base + 31, yB = l.base + 55, yC = l.base + 71, hC = 4;
  return {
    cx, cz, A, hB: 5, hC,
    yP: l.base + 3, yA, yB, yC, yDome: l.top - 4.6,
    perch: { x: A.x1, y: yA + 1.02, z: A.z1, yaw: TO_VIEW_H, s: 2.2 },
    thirteenth: { x: cx + hC + 1.0, y: yC - 5.58, z: cz, s: 1.4 },
  };
}

const wayneTower: Model = (k, l) => {
  const b = k.b, W = wayneOf(l), { cx, cz, A, yP, yA, yB, yC } = W;
  const seed = 0.37;

  // ---- the wings at its foot: a low range along the north, and a taller one along the west, both linked to the shaft
  // each is inset from its plinth but on the side it shares with the shaft
  const wing = (x0: number, z0: number, x1: number, z1: number, top: number, shared: 'S' | 'E'): void => {
    b.box(x0, l.base, z0, x1, yP, z1, STONE_DARK, { top: STONE_TRIM });
    b.box(x0 + 0.2, yP, z0 + 0.2, shared === 'E' ? x1 : x1 - 0.2, top, shared === 'S' ? z1 : z1 - 0.2, STONE, { win: GOTHIC_WIN, seed: seed + x0 * 0.01 });
  };
  wing(l.x0, l.z0, l.x1, A.z0, l.base + 7, 'S');
  band(b, l.x0 + 0.2, l.z0 + 0.2, l.x1 - 0.2, A.z0 - 0.12, l.base + 7, l.base + 7.6, 0.12, STONE_TRIM, LEAD);
  wing(l.x0, A.z0, A.x0, A.z1, l.base + 15, 'E');
  // the west range's roof leans on the shaft
  const wTop = l.base + 15;
  slab(b, [A.x0 - 0.05, wTop + 1.5, cz], [l.x0 - 0.05, wTop + 0.1, cz], (A.z1 - A.z0) / 2 + 0.05, 0.22, LEAD, { under: STONE_DARK });
  for (const [z, n] of [[A.z1 - 0.2, 1], [A.z0 + 0.2, -1]] as const) face3(b, [l.x0 + 0.2, wTop, z], [A.x0, wTop, z], [A.x0, wTop + 1.4, z], [0, 0, n], STONE);
  // a gargoyle at each outer corner of the north range
  gargoyle(b, l.x1 - 0.5, l.base + 7.62, l.z0 + 0.5, -Math.PI / 4, 1.1);
  gargoyle(b, l.x0 + 0.5, l.base + 7.62, l.z0 + 0.5, (-3 * Math.PI) / 4, 1.1);

  // ---- the lower shaft, to the first setback
  b.box(A.x0 - 0.35, l.base, A.z0 - 0.35, A.x1 + 0.35, yP, A.z1 + 0.35, STONE_DARK, { top: STONE_TRIM });
  b.box(A.x0, yP, A.z0, A.x1, yA, A.z1, STONE, { win: GOTHIC_WIN, seed });
  ribs(b, A.x0, A.z0, A.x1, A.z1, yP, yA - 0.5, 2, STONE_LIGHT);
  for (const y of [l.base + 15, l.base + 23]) band(b, A.x0, A.z0, A.x1, A.z1, y - 0.2, y + 0.2, 0.15);
  // a buttress at each corner, rising past the setback, and a pinnacle on each but the south-east, which is the perch's
  const corners: [number, number][] = [[A.x0, A.z0], [A.x1, A.z0], [A.x0, A.z1], [A.x1, A.z1]];
  for (const [x, z] of corners) {
    b.box(x - 0.8, l.base, z - 0.8, x + 0.8, yA + 1, z + 0.8, STONE, { top: STONE_TRIM });
    for (const y of [l.base + 15, l.base + 23]) band(b, x - 0.8, z - 0.8, x + 0.8, z + 0.8, y - 0.25, y + 0.25, 0.12);
    if (!(x === A.x1 && z === A.z1)) pinnacle(b, x, z, yA + 1, 4.6, 0.55, STONE_TRIM);
  }
  // the cornice of the first setback, and a low parapet round its ledge between the buttresses
  band(b, A.x0, A.z0, A.x1, A.z1, yA - 0.6, yA + 0.3, 0.5, STONE_TRIM, LEAD);
  const ledge = yA + 0.3, e = 0.38;
  parapet(b, [[A.x0 + 0.8, A.z1 + e], [A.x1 - 0.8, A.z1 + e]], ledge, 0.5, 0.24, STONE_TRIM);
  parapet(b, [[A.x0 + 0.8, A.z0 - e], [A.x1 - 0.8, A.z0 - e]], ledge, 0.5, 0.24, STONE_TRIM);
  parapet(b, [[A.x1 + e, A.z0 + 0.8], [A.x1 + e, A.z1 - 0.8]], ledge, 0.5, 0.24, STONE_TRIM);
  parapet(b, [[A.x0 - e, A.z0 + 0.8], [A.x0 - e, A.z1 - 0.8]], ledge, 0.5, 0.24, STONE_TRIM);
  // a gargoyle in the middle of each face's parapet, Pinkney's on every cornice
  for (const [x, z, a] of [[cx, A.z1 + e, Math.PI / 2], [cx, A.z0 - e, -Math.PI / 2], [A.x1 + e, cz, 0], [A.x0 - e, cz, Math.PI]]) gargoyle(b, x, ledge + 0.52, z, a, 1.2);
  // Batman's perch: the great gargoyle on the south-east buttress, looking out over the forecourt towards the view
  const P = W.perch;
  gargoyle(b, P.x, P.y, P.z, P.yaw, P.s);

  // ---- the upper shaft, to the second setback, with a turret at each corner
  const B = { x0: cx - W.hB, x1: cx + W.hB, z0: cz - W.hB, z1: cz + W.hB };
  b.box(B.x0, ledge, B.z0, B.x1, yB, B.z1, STONE, { win: GOTHIC_WIN, seed: seed + 0.2 });
  ribs(b, B.x0, B.z0, B.x1, B.z1, ledge, yB - 0.5, 2, STONE_LIGHT);
  band(b, B.x0, B.z0, B.x1, B.z1, l.base + 43 - 0.2, l.base + 43 + 0.2, 0.15);
  for (const [x, z] of [[B.x0, B.z0], [B.x1, B.z0], [B.x0, B.z1], [B.x1, B.z1]]) b.box(x - 0.55, ledge, z - 0.55, x + 0.55, yB, z + 0.55, STONE_LIGHT);
  band(b, B.x0, B.z0, B.x1, B.z1, yB - 0.5, yB + 0.3, 0.45, STONE_TRIM, LEAD);
  for (const [x, z] of [[B.x0, B.z0], [B.x1, B.z0], [B.x0, B.z1], [B.x1, B.z1]]) {
    b.cyl(x, z, yB + 0.3, yB + 4, 0.8, 0.8, 8, STONE, { cap: STONE_TRIM, win: { cell: 1.2, storey: 4, lit: 0.8, kind: 6 } });
    b.cyl(x, z, yB + 4, yB + 4.4, 0.95, 0.95, 8, STONE_TRIM);
    b.cyl(x, z, yB + 4.4, yB + 7.4, 0.9, 0.04, 8, LEAD, { cap: false });
  }

  // ---- the octagon, to the gallery: tall lancets on each face, ribs at its corners
  const oct = chamfered(cx, cz, W.hC, 1.3);
  prism(b, oct, yB + 0.3, yC, STONE, { top: false });
  for (const p of oct) b.box(p[0] - 0.22, yB + 0.3, p[1] - 0.22, p[0] + 0.22, yC - 0.4, p[1] + 0.22, STONE_LIGHT);
  const h = W.hC, sOct = yB + 1.6, spring = yC - 5.2;
  for (const f of ['N', 'S', 'W'] as Face[]) {
    const at = f === 'N' ? cz - h : f === 'S' ? cz + h : cx - h, u = f === 'W' ? cz : cx;
    for (const du of [-0.75, 0.75]) lancet(b, f, at, u + du, sOct, 1.0, spring);
  }
  // the east face: two lancets either side of the thirteenth's corbel
  for (const du of [-1.35, 1.35]) lancet(b, 'E', cx + h, cz + du, sOct, 0.9, spring);
  // the four slanted faces: one narrow lancet each, built square to the slant
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const mx = cx + sx * (h - 0.65), mz = cz + sz * (h - 0.65), yaw = Math.atan2(sz, sx);
    b.moved(mx, 0, mz, yaw, () => {
      lancet(b, 'E', 0.01, 0, sOct + 1.5, 0.7, spring - 0.6);
    });
  }
  // the thirteenth gargoyle, for those who come by air: on a corbel under the gallery, facing east
  const T = W.thirteenth;
  b.box(cx + h - 0.1, T.y - 1.0, cz - 0.7, cx + h + 1.7, T.y - 0.02, cz + 0.7, STONE_TRIM, { faces: 'NESWTB' });
  b.box(cx + h - 0.1, T.y - 1.9, cz - 0.45, cx + h + 0.9, T.y - 1.0, cz + 0.45, STONE_TRIM, { faces: 'NESWB' });
  gargoyle(b, T.x, T.y, T.z, 0, T.s);

  // ---- the gallery of the twelve, on corbels
  const rRing = 6.1, rG = 5.3;
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    b.obox(cx + Math.cos(a) * 4.7, yC - 1.0, cz + Math.sin(a) * 4.7, 1.1, 0.4, 0.3, a, STONE_TRIM, { faces: 'B' });
  }
  b.cyl(cx, cz, yC - 0.6, yC + 0.4, rRing, rRing, 12, STONE_TRIM, { cap: LEAD });
  under(b, cx, cz, yC - 0.6, rRing, 12, STONE_DARK);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    gargoyle(b, cx + Math.cos(a) * rG, yC + 0.42, cz + Math.sin(a) * rG, a, 2);
  }

  // ---- the glass dome of the observation deck, lit from inside, with steel ribs, a lantern and a mast
  b.cyl(cx, cz, yC + 0.4, yC + 1.4, 4.5, 4.5, 12, STONE_TRIM, { cap: LEAD });
  const top = W.yDome, span = top - (yC + 1.4);
  const rings: [number, number][] = [[4.3, 0], [4.25, 0.2], [3.85, 0.43], [3.0, 0.64], [1.8, 0.83], [0.7, 0.96], [0.25, 1]].map(([r, t]) => [r, yC + 1.4 + t * span]);
  lathe(b, cx, cz, rings, 12, GLASS, { win: GLASS_WIN });
  for (let j = 0; j < 6; j++) {
    const a = Math.PI / 12 + (j * Math.PI) / 3;
    b.sweep(rings.map(([r, y]): V3 => [cx + Math.cos(a) * (r + 0.07), y, cz + Math.sin(a) * (r + 0.07)]), rings.map(() => 0.1), STEEL);
  }
  b.cyl(cx, cz, top - 0.15, top + 1.6, 0.8, 0.8, 8, WARM, { win: LIT, cap: false });
  b.cyl(cx, cz, top + 1.6, top + 1.9, 1.0, 1.0, 8, COPPER_DARK);
  b.cyl(cx, cz, top + 1.9, top + 3.5, 0.95, 0.06, 8, COPPER, { cap: false });
  b.beam([cx, top + 3.3, cz], [cx, l.top + 3.6, cz], 0.1, 0.05, STEEL);
  beacon(k, cx, l.top + 3.7, cz, 0.45);
  k.glows.push({ x: cx, y: top + 0.8, z: cz, sx: 1.0, sy: 1.2, sz: 1.0, color: '#ffe0a8' });

  // ---- the porch and its door: a tall pointed arch onto the forecourt
  const px0 = cx - 3, px1 = cx + 3, pz = l.z1, pTop = l.base + 11;
  b.box(px0, l.base, A.z1 - 0.2, px1, pTop, pz, STONE, { top: STONE_TRIM });
  for (const x of [px0, px1]) b.box(x - 0.45, l.base, pz - 0.9, x + 0.45, pTop + 1.4, pz + 0.25, STONE_LIGHT, { top: STONE_TRIM });
  for (const x of [px0, px1]) pinnacle(b, x, pz - 0.33, pTop + 1.4, 2.6, 0.32, STONE_TRIM);
  face3(b, [px0, pTop, pz], [px1, pTop, pz], [cx, pTop + 3.4, pz], [0, 0, 1], STONE);
  slab(b, [cx, pTop + 3.4 + 0.02, (A.z1 + pz) / 2], [px0 - 0.25, pTop - 0.25, (A.z1 + pz) / 2], (pz - A.z1) / 2 + 0.15, 0.22, LEAD, { under: STONE_DARK });
  slab(b, [cx, pTop + 3.4 + 0.02, (A.z1 + pz) / 2], [px1 + 0.25, pTop - 0.25, (A.z1 + pz) / 2], (pz - A.z1) / 2 + 0.15, 0.22, LEAD, { under: STONE_DARK });
  arch(b, 'S', pz + 0.02, cx, l.base, 4.0, l.base + 5.6, STONE_TRIM);
  arch(b, 'S', pz + 0.04, cx, l.base + 0.02, 3.1, l.base + 5.6, WARM, { win: LIT });
  for (const s of [-1, 1]) panel(b, 'S', pz + 0.06, cx + s * 0.06, cx + s * 1.45, l.base + 0.04, l.base + 4.8, 0x5b4a2c);
  wallSign(k, 'towers-wayne-tower', 'Wayne Tower', 'S', pz, cx, l.base + 9.9, 0.85, 5.0);
  for (const s of [-1, 1]) gasLamp(k, cx + s * 2.35, l.base + 5.4, pz + 0.45, 0, AMBER);
  k.lights.push({ x: cx, z: l.z1 + 3, r: 11, color: AMBER, k: 0.55 });
};

// ---------------------------------------------------------------------------
// Wayne Tower's forecourt and the stair down to the rim road
// ---------------------------------------------------------------------------

/** The gap in the rim's balustrade at the head of the stair: its middle, and half its width. */
const stairOf = (): { cx: number; half: number; going: number; steps: number } => {
  const f = lotOf('wayne-forecourt');
  return { cx: (f.x0 + f.x1) / 2, half: 2, going: 0.8, steps: Math.round((Y.crown - Y.upper) / 0.5) - 1 };
};

const forecourt: Model = (k, l) => {
  const b = k.b, spot = HERO_SPOTS.find((s) => s.id === 'wayne-tower')!;
  // flags, with a darker band round them
  area(k, rect(l.x0, l.z0, l.x1, l.z1), FORECOURT, l.base + 0.04, { size: 1.2, bond: 0.5 });
  for (const [x0, z0, x1, z1] of [[l.x0, l.z0, l.x1, l.z0 + 0.4], [l.x0, l.z1 - 0.7, l.x1, l.z1], [l.x0, l.z0, l.x0 + 0.4, l.z1], [l.x1 - 0.4, l.z0, l.x1, l.z1]]) {
    area(k, rect(x0, z0, x1, z1), FORECOURT_BAND, l.base + 0.07);
  }
  // the low dais the car on show stands on
  b.box(spot.x - 5, l.base, spot.z - 2.4, spot.x + 5, spot.y, spot.z + 1.9, STONE_TRIM, { top: 0x9a978f });

  // the stair: a landing at the gap, and two flights down along the wall to the sidewalk
  const S = stairOf(), z0 = l.z1, z1 = l.z1 + 1.5, rise = (l.base - Y.upper) / (S.steps + 1);
  b.box(S.cx - S.half, Y.upper, z0, S.cx + S.half, l.base + 0.04, z1, STONE, { faces: 'SEWT', top: FORECOURT });
  for (const s of [-1, 1]) {
    const x0 = S.cx + s * S.half;
    for (let i = 0; i < S.steps; i++) {
      const a = x0 + s * S.going * i, c = x0 + s * S.going * (i + 1), top = l.base + 0.04 - rise * (i + 1);
      b.box(Math.min(a, c), Y.upper, z0, Math.max(a, c), top, z1 - 0.16, STONE_LIGHT, { faces: s < 0 ? 'SWT' : 'SET', top: 0x8f8d88 });
    }
    // the cheek wall on the outer side, sloping with the flight
    const xEnd = x0 + s * S.going * S.steps;
    slab(b, [x0, l.base + 0.95, z1 - 0.08], [xEnd, Y.upper + rise + 0.95, z1 - 0.08], 0.08, 1.6, STONE_TRIM);
    b.box(xEnd - 0.3, Y.upper, z1 - 0.3, xEnd + 0.3, Y.upper + 1.5, z1, STONE_TRIM, { faces: 'NESWT' });
    gasLamp(k, xEnd, Y.upper + 1.55, z1 - 0.15, 0, SODIUM);
  }
  // newels at the head of the stair, with lamps on them, no taller than a person
  for (const s of [-1, 1]) {
    const x = S.cx + s * (S.half + 0.2);
    b.box(x - 0.32, l.base, l.z1 - 0.62, x + 0.32, l.base + 1.35, l.z1 - 0.02, STONE_TRIM);
    gasLamp(k, x, l.base + 1.4, l.z1 - 0.32, 0, AMBER);
  }
};

// ---------------------------------------------------------------------------
// The Kane Building
// ---------------------------------------------------------------------------
//
// A podium, a slender ribbed shaft, and then two towers side by side, each
// with a steep four-sided spire and pinnacles at its corners, and a glazed
// bridge between them near the top that carries the building's name. No other
// tower on the tile has two.

function kaneOf(l: Lot) {
  const cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2;
  const S = { x0: l.x0 + 1, x1: l.x1 - 1, z0: cz - 4, z1: cz + 4 };
  return { cx, cz, S, tw: 3.6, yPod: l.base + 19, yS: l.base + 39, yT: l.top - 12, tip: l.top + 3 };
}

const kane: Model = (k, l) => {
  const b = k.b, K = kaneOf(l), { cx, cz, S, tw, yPod, yS, yT } = K, seed = 1.3;
  // the plinth and the podium
  b.box(l.x0, l.base, l.z0, l.x1, l.base + 3, l.z1, STONE_DARK, { top: STONE_TRIM });
  b.box(l.x0 + 0.25, l.base + 3, l.z0 + 0.25, l.x1 - 0.25, yPod, l.z1 - 0.25, KANE_STONE, { win: GOTHIC_WIN, seed });
  ribs(b, l.x0 + 0.25, l.z0 + 0.25, l.x1 - 0.25, l.z1 - 0.25, l.base + 3, yPod - 0.5, 2.7, STONE_LIGHT, 0.4, 0.25);
  band(b, l.x0 + 0.25, l.z0 + 0.25, l.x1 - 0.25, l.z1 - 0.25, yPod - 0.6, yPod + 0.1, 0.2, STONE_TRIM, LEAD);
  const roof = yPod + 0.1, e = l.x0 + 0.3;
  parapet(b, [[e, l.z0 + 0.3], [l.x1 - 0.3, l.z0 + 0.3], [l.x1 - 0.3, l.z1 - 0.3], [e, l.z1 - 0.3], [e, l.z0 + 0.3]], roof, 0.5, 0.2, STONE_TRIM);
  // its door, in a porch on the south front
  b.box(cx - 2, l.base, l.z1 - 0.4, cx + 2, l.base + 7, l.z1 + 0.5, STONE_LIGHT, { top: STONE_TRIM });
  arch(b, 'S', l.z1 + 0.52, cx, l.base, 2.9, l.base + 3.6, STONE_TRIM);
  arch(b, 'S', l.z1 + 0.54, cx, l.base + 0.02, 2.2, l.base + 3.6, WARM, { win: LIT });
  gasLamp(k, cx, l.base + 6.2, l.z1 + 0.75, 0, AMBER);
  k.lights.push({ x: cx, z: l.z1 + 2, r: 8, color: AMBER, k: 0.45 });
  // on the podium's roof, a water tank and a stair head
  waterTank(b, l.x0 + 2, roof, l.z0 + 1.6, 0.75);
  b.box(l.x1 - 3.2, roof, l.z0 + 0.7, l.x1 - 1.2, roof + 2.2, l.z0 + 2.4, KANE_STONE, { top: LEAD });

  // the shaft
  b.box(S.x0, roof, S.z0, S.x1, yS, S.z1, KANE_STONE, { win: GOTHIC_WIN, seed: seed + 0.3 });
  ribs(b, S.x0, S.z0, S.x1, S.z1, roof, yS - 0.5, 2, STONE_LIGHT);
  band(b, S.x0, S.z0, S.x1, S.z1, l.base + 27 - 0.2, l.base + 27 + 0.2, 0.15);
  band(b, S.x0, S.z0, S.x1, S.z1, yS - 0.6, yS + 0.2, 0.35, STONE_TRIM, LEAD);
  for (const [x, z, a] of [[S.x0, S.z0, -0.75], [S.x1, S.z0, -0.25], [S.x0, S.z1, 0.75], [S.x1, S.z1, 0.25]]) gargoyle(b, x + (x < cx ? 0.3 : -0.3), yS + 0.22, z + (z < cz ? 0.3 : -0.3), a * Math.PI, 1.0);

  // the twin towers, each with a spire, and the bridge between them
  for (const x0 of [S.x0, S.x1 - tw]) {
    const x1 = x0 + tw, z0 = cz - tw / 2, z1 = cz + tw / 2, tx = (x0 + x1) / 2;
    b.box(x0, yS + 0.2, z0, x1, yT, z1, KANE_STONE, { win: GOTHIC_WIN, seed: seed + x0 * 0.01 });
    for (const f of ['N', 'E', 'S', 'W'] as Face[]) {
      const at = f === 'N' ? z0 : f === 'S' ? z1 : f === 'E' ? x1 : x0, u = f === 'N' || f === 'S' ? tx : cz;
      onFace(b, f, at, u - 0.25, u + 0.25, yS + 0.2, yT - 0.4, 0.28, STONE_LIGHT);
    }
    band(b, x0, z0, x1, z1, yT - 0.6, yT + 0.2, 0.3, STONE_TRIM, LEAD);
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) pinnacle(b, px, pz, yT + 0.2, 3.4, 0.32, STONE_TRIM);
    b.cyl(tx, cz, yT + 0.2, K.tip, (tw / 2 - 0.1) * D, 0.05, 4, SLATE, { phase: Q, cap: false });
    // a band of lit lucarnes at the spire's foot, and a lamp at its tip
    for (const f of ['N', 'E', 'S', 'W'] as Face[]) {
      const at = f === 'N' ? cz - 1.63 : f === 'S' ? cz + 1.63 : f === 'E' ? tx + 1.63 : tx - 1.63, u = f === 'N' || f === 'S' ? tx : cz;
      const out = f === 'S' || f === 'E' ? 1 : -1;
      arch(b, f, at + out * 0.05, u, yT + 1.0, 0.7, yT + 1.9, WARM, { win: LIT });
    }
    beacon(k, tx, K.tip - 0.2, cz, 0.28);
  }
  const bx0 = S.x0 + tw, bx1 = S.x1 - tw, by0 = l.base + 47;
  b.box(bx0, by0, cz - 1.4, bx1, by0 + 4, cz + 1.4, KANE_STONE, { win: GOTHIC_WIN, faces: 'NSB', seed: seed + 0.7 });
  band(b, bx0, cz - 1.4, bx1, cz + 1.4, by0 - 0.4, by0 + 0.1, 0.12);
  b.box(bx0, by0 + 4, cz - 1.55, bx1, by0 + 4.6, cz + 1.55, STONE_TRIM, { faces: 'NSTB', top: LEAD });
  wallSign(k, 'towers-kane-building', 'Kane Building', 'S', cz + 1.4, cx, by0 + 2.2, 0.62, bx1 - bx0 - 0.6);
};

// ---------------------------------------------------------------------------
// The Elliot Tower
// ---------------------------------------------------------------------------
//
// A deco ziggurat of paler stone: four setbacks, each with a band of pale
// stone that is lit along its edge at night and fins that rise past it, up to
// a pyramid of copper gone green, and a lantern and a spike on that.

function elliotOf(l: Lot) {
  const cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2;
  return { cx, cz, halves: [6.75, 5, 4, 3, 2], tops: [19, 31, 39, 43, 47].map((h) => l.base + h) };
}

const elliot: Model = (k, l) => {
  const b = k.b, E = elliotOf(l), { cx, cz, halves, tops } = E;
  b.box(l.x0, l.base, l.z0, l.x1, l.base + 3, l.z1, ELLIOT_DARK, { top: STONE_TRIM });
  for (let i = 0; i < halves.length; i++) {
    const h = halves[i], y0 = i === 0 ? l.base + 3 : tops[i - 1] + 0.3, y1 = tops[i];
    b.box(cx - h, y0, cz - h, cx + h, y1, cz + h, ELLIOT_STONE, { win: OFFICE_WIN, seed: 2.1 + i * 0.3 });
    band(b, cx - h, cz - h, cx + h, cz + h, y1 - 0.6, y1 + 0.3, 0.12, STONE_TRIM, LEAD);
    // fins: three to a face on the lower tiers, one on the upper, rising past the band
    const us = i < 2 ? [-h * 0.5, 0, h * 0.5] : [0];
    for (const f of ['N', 'E', 'S', 'W'] as Face[]) {
      const at = f === 'N' ? cz - h : f === 'S' ? cz + h : f === 'E' ? cx + h : cx - h, c = f === 'N' || f === 'S' ? cx : cz;
      // on the lowest tier they rise from over the name, which is on its south front
      const f0 = i === 0 ? l.base + 11.4 : y0;
      for (const du of us) onFace(b, f, at, c + du - 0.22, c + du + 0.22, f0, y1 + (du === 0 ? 2.0 : 1.2), 0.4, ELLIOT_DARK, { top: STONE_TRIM });
    }
    // the band's edge, lit at night
    const gy = y1 + 0.34, hb = h + 0.13;
    for (const [gx, gz, sx, sz] of [[cx, cz + hb, 2 * hb, 0.08], [cx, cz - hb, 2 * hb, 0.08], [cx + hb, cz, 0.08, 2 * hb], [cx - hb, cz, 0.08, 2 * hb]]) {
      k.glows.push({ x: gx, y: gy, z: gz, sx, sy: 0.08, sz, color: '#ffd9a0' });
    }
  }
  // the copper pyramid, a ridge of darker copper down each corner, a lantern and a spike
  const yTop = tops[tops.length - 1] + 0.3, hT = halves[halves.length - 1] + 0.05, tip = l.top - 1;
  b.cyl(cx, cz, yTop, tip, hT * D, 0.12, 4, COPPER, { phase: Q, cap: false });
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.beam([cx + sx * hT, yTop, cz + sz * hT], [cx + sx * 0.12, tip, cz + sz * 0.12], 0.12, 0.05, COPPER_DARK);
  b.cyl(cx, cz, tip - 0.2, tip + 1.2, 0.42, 0.42, 6, WARM, { win: LIT, cap: COPPER_DARK });
  b.beam([cx, tip + 1.2, cz], [cx, l.top + 2, cz], 0.1, 0.03, BRASS);
  beacon(k, cx, tip + 0.5, cz, 0.65, '#ffe6b0');

  // the entrance: a deco portal on the south front, with a sunburst over the door, and the name over it
  const fz = l.z1;
  b.box(cx - 2.3, l.base, fz - 0.5, cx + 2.3, l.base + 8.2, fz + 0.4, STONE_TRIM, { top: LEAD });
  b.box(cx - 1.9, l.base + 8.2, fz - 0.3, cx + 1.9, l.base + 8.9, fz + 0.25, ELLIOT_DARK, { top: STONE_TRIM });
  panel(b, 'S', fz + 0.42, cx - 1.3, cx + 1.3, l.base + 0.02, l.base + 5.0, WARM, { win: LIT });
  const sun: V3 = [cx, l.base + 5.15, fz + 0.43];
  for (let i = 0; i < 7; i++) {
    const a0 = (i / 7) * Math.PI, a1 = ((i + 1) / 7) * Math.PI, r = 1.75;
    tri(b, sun, [cx + Math.cos(a0) * r, sun[1] + Math.sin(a0) * r, sun[2]], [cx + Math.cos(a1) * r, sun[1] + Math.sin(a1) * r, sun[2]], [0, 0, 1], i % 2 ? BRASS : ELLIOT_DARK);
  }
  panel(b, 'S', fz + 0.42, cx - 1.3, cx + 1.3, l.base + 5.0, l.base + 5.15, BRASS);
  wallSign(k, 'towers-elliot-tower', 'Elliot Tower', 'S', cz + halves[0], cx, l.base + 10.2, 0.95, 9);
  for (const s of [-1, 1]) gasLamp(k, cx + s * 2.6, l.base + 4.6, fz + 0.55, 0, AMBER);
  k.lights.push({ x: cx, z: fz + 2.5, r: 9, color: AMBER, k: 0.5 });
};

// ---------------------------------------------------------------------------
// Gotham Cathedral
// ---------------------------------------------------------------------------
//
// A plain Gothic church in the shape of a cross: a tower at its west end with
// an octagonal spire, a nave with aisles, flying buttresses on both sides, a
// transept whose south front, facing the view, has the door and the rose
// window, and an east end with a tall window. Plain pinnacles; no gargoyles.

function cathedralOf(l: Lot) {
  const cz = (l.z0 + l.z1) / 2;
  return {
    cz, tower: { x0: l.x0, x1: l.x0 + 5, z0: cz - 2.5, z1: cz + 2.5 },
    nave: { x0: l.x0 + 4.9, x1: l.x1 - 0.4, z0: cz - 3, z1: cz + 3 },
    tr: { x0: l.x1 - 5.8, x1: l.x1 - 2.6, z0: l.z0 + 0.4, z1: l.z1 - 0.5 },
    yWall: l.base + 15, yAisle: l.base + 7, yTower: l.base + 27, tip: l.top + 2,
  };
}

const cathedral: Model = (k, l) => {
  const b = k.b, C = cathedralOf(l), { cz, tower: Tw, nave: N, tr: X, yWall, yAisle, yTower } = C;
  const rise = 4.5;

  // ---- the nave and its aisles
  b.box(N.x0, l.base, N.z0, N.x1, yWall, N.z1, STONE, { faces: 'NESW' });
  band(b, N.x0, N.z0, N.x1, N.z1, yWall - 0.5, yWall, 0.12);
  pitched(b, N.x0, N.z0, N.x1, N.z1, yWall, rise, SLATE, STONE, 'x', 0.3);
  for (const [z0, z1, s] of [[N.z1, N.z1 + 2, 1], [N.z0 - 2, N.z0, -1]] as const) {
    b.box(N.x0, l.base, z0, N.x1, yAisle, z1, STONE, { faces: 'NESW' });
    const zIn = s > 0 ? N.z1 : N.z0, zOut = s > 0 ? z1 : z0;
    slab(b, [(N.x0 + N.x1) / 2, yAisle + 1.5, zIn - s * 0.05], [(N.x0 + N.x1) / 2, yAisle - 0.15, zOut + s * 0.3], (N.x1 - N.x0) / 2 + 0.15, 0.2, SLATE, { under: STONE_DARK });
    for (const [x, n] of [[N.x0, -1], [N.x1, 1]] as const) face3(b, [x, yAisle, zIn], [x, yAisle, zOut], [x, yAisle + 1.45, zIn], [n, 0, 0], STONE);
    // lancets in the aisle wall and in the clerestory over it
    const f: Face = s > 0 ? 'S' : 'N';
    for (const x of [N.x0 + 0.9, N.x0 + 2.7, X.x1 + 1.3]) {
      lancet(b, f, zOut, x, l.base + 1.4, 0.8, l.base + 4.6, STAINED, LIT_SOFT);
      lancet(b, f, zIn, x, yAisle + 2.0, 0.8, yWall - 2.3, STAINED, LIT_SOFT);
    }
    // flying buttresses: piers outside the aisle, with pinnacles, and arches over to the nave's wall
    for (const x of [N.x0 + 1.8, X.x1 + 0.3]) {
      const p0 = zOut, p1 = zOut + s * 1.3;
      b.box(x - 0.35, l.base, Math.min(p0, p1), x + 0.35, yAisle + 2.4, Math.max(p0, p1), STONE_LIGHT, { top: STONE_TRIM });
      pinnacle(b, x, (p0 + p1) / 2, yAisle + 2.4, 3.0, 0.3, STONE_TRIM);
      b.beam([x, yAisle + 2.1, p0 + s * 0.2], [x, yWall - 1.4, zIn + s * 0.05], 0.22, 0.18, STONE_LIGHT);
    }
  }

  // ---- the transept, its south front to the view: the door, two lancets and the rose window
  b.box(X.x0, l.base, X.z0, X.x1, yWall, X.z1, STONE, { faces: 'NESW' });
  band(b, X.x0, X.z0, X.x1, X.z1, yWall - 0.5, yWall, 0.12);
  pitched(b, X.x0, X.z0, X.x1, X.z1, yWall, rise, SLATE, STONE, 'z');
  const tx = (X.x0 + X.x1) / 2;
  for (const [z, f] of [[X.z1, 'S'], [X.z0, 'N']] as const) {
    const out = f === 'S' ? 1 : -1;
    for (const x of [X.x0, X.x1]) {
      b.box(x - 0.35, l.base, Math.min(z, z + out * 0.6), x + 0.35, yWall + 0.8, Math.max(z, z + out * 0.6), STONE_LIGHT, { top: STONE_TRIM });
      pinnacle(b, x, z + out * 0.3, yWall + 0.8, 3.4, 0.3, STONE_TRIM);
    }
    if (f === 'S') {
      arch(b, 'S', z + 0.02, tx, l.base, 2.3, l.base + 2.8, STONE_TRIM);
      arch(b, 'S', z + 0.04, tx, l.base + 0.02, 1.6, l.base + 2.8, WARM, { win: LIT });
      for (const du of [-0.7, 0.7]) lancet(b, 'S', z, tx + du, l.base + 5.6, 0.55, l.base + 7.6, STAINED, LIT_SOFT);
      // the rose window: a ring of pale stone, the glass, eight spokes of tracery and a boss
      const rc: V3 = [tx, l.base + 11.4, z], r = 1.35;
      roundelOn(b, rc, r + 0.22, 0.02, STONE_TRIM, {}, 16);
      roundelOn(b, rc, r, 0.04, ROSE, { win: interior(2.8) }, 16);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), w = 0.07;
        b.quad([tx - sa * w, rc[1] + ca * w, z + 0.06], [tx + ca * r - sa * w, rc[1] + sa * r + ca * w, z + 0.06], [tx + ca * r + sa * w, rc[1] + sa * r - ca * w, z + 0.06], [tx + sa * w, rc[1] - ca * w, z + 0.06], [0, 0, 1], STONE_TRIM);
      }
      roundelOn(b, rc, 0.32, 0.08, STONE_TRIM, {}, 8);
    } else {
      lancet(b, 'N', z, tx, l.base + 4, 1.2, l.base + 9.5, STAINED, LIT_SOFT);
    }
  }

  // ---- the east end: a tall window, and over it the name cut in a band of stone, which the view sees past the Foundation
  lancet(b, 'E', N.x1, cz, l.base + 3.2, 2.2, l.base + 10.0, STAINED, LIT_SOFT);
  wallSign(k, 'towers-cathedral', 'Gotham Cathedral', 'E', N.x1, cz, l.base + 13.2, 0.6, 5.0);
  for (const z of [N.z0 - 0.35, N.z1 + 0.35]) {
    b.box(N.x1 - 0.3, l.base, z - 0.35, N.x1 + 0.4, yWall + 0.6, z + 0.35, STONE_LIGHT, { top: STONE_TRIM });
    pinnacle(b, N.x1 + 0.05, z, yWall + 0.6, 3.0, 0.3, STONE_TRIM);
  }
  for (const z of [N.z1 + 1, N.z0 - 1]) lancet(b, 'E', N.x1, z, l.base + 1.4, 0.7, l.base + 4.4, STAINED, LIT_SOFT);

  // ---- the west tower and its spire
  b.box(Tw.x0, l.base, Tw.z0, Tw.x1, yTower - 0.1, Tw.z1, STONE, { faces: 'NESW' });
  for (const y of [l.base + 7.5, l.base + 15.5]) band(b, Tw.x0, Tw.z0, Tw.x1, Tw.z1, y - 0.2, y + 0.2, 0.12);
  for (const [x, z] of [[Tw.x0, Tw.z0], [Tw.x1, Tw.z0], [Tw.x0, Tw.z1], [Tw.x1, Tw.z1]]) {
    b.box(x - 0.45, l.base, z - 0.45, x + 0.45, yTower - 0.6, z + 0.45, STONE_LIGHT, { top: STONE_TRIM });
  }
  band(b, Tw.x0, Tw.z0, Tw.x1, Tw.z1, yTower - 0.7, yTower, 0.3, STONE_TRIM, LEAD);
  for (const [x, z] of [[Tw.x0, Tw.z0], [Tw.x1, Tw.z0], [Tw.x0, Tw.z1], [Tw.x1, Tw.z1]]) pinnacle(b, x, z, yTower, 4.0, 0.42, STONE_TRIM);
  const tcx = (Tw.x0 + Tw.x1) / 2;
  for (const f of ['N', 'E', 'S', 'W'] as Face[]) {
    const at = f === 'N' ? Tw.z0 : f === 'S' ? Tw.z1 : f === 'E' ? Tw.x1 : Tw.x0, u = f === 'N' || f === 'S' ? tcx : cz;
    // the belfry's openings, dark, and a window lower down
    lancet(b, f, at, u, yTower - 6.6, 1.5, yTower - 3.4, DARK, { cell: 0, storey: 5, lit: 0, kind: 0 });
    if (f !== 'E') lancet(b, f, at, u, l.base + 9.0, 1.0, l.base + 13.0, STAINED, LIT_SOFT);
  }
  // the west door, to the board's edge
  arch(b, 'W', Tw.x0 - 0.02, cz, l.base, 2.4, l.base + 2.8, STONE_TRIM);
  arch(b, 'W', Tw.x0 - 0.04, cz, l.base + 0.02, 1.7, l.base + 2.8, WARM, { win: LIT });
  // the spire, a band round it, a gablet on each side at its foot, and a cross at its tip
  const sBase = yTower + 0.02;
  b.cyl(tcx, cz, sBase, C.tip - 1.4, 2.45, 0.1, 8, SLATE, { cap: false });
  const at = (y: number): number => 2.45 + ((0.1 - 2.45) * (y - sBase)) / (C.tip - 1.4 - sBase);
  b.cyl(tcx, cz, sBase + 7.8, sBase + 8.3, at(sBase + 7.8) + 0.12, at(sBase + 8.3) + 0.12, 8, STONE_TRIM);
  for (const f of ['N', 'E', 'S', 'W'] as Face[]) {
    const n = NORMAL[f], r = 2.3;
    const c: V3 = [tcx + n[0] * r, sBase, cz + n[2] * r], side: V3 = [n[2], 0, -n[0]];
    face3(b, [c[0] - side[0] * 0.8, sBase, c[2] - side[2] * 0.8], [c[0] + side[0] * 0.8, sBase, c[2] + side[2] * 0.8], [c[0], sBase + 2.6, c[2]], n, STONE_TRIM);
    face3(b, [c[0] - side[0] * 0.35 + n[0] * 0.03, sBase + 0.3, c[2] - side[2] * 0.35 + n[2] * 0.03], [c[0] + side[0] * 0.35 + n[0] * 0.03, sBase + 0.3, c[2] + side[2] * 0.35 + n[2] * 0.03], [c[0] + n[0] * 0.03, sBase + 1.7, c[2] + n[2] * 0.03], n, DARK);
  }
  b.box(tcx - 0.07, C.tip - 1.5, cz - 0.07, tcx + 0.07, C.tip, cz + 0.07, IRON, { faces: 'NESWT' });
  b.box(tcx - 0.07, C.tip - 0.75, cz - 0.42, tcx + 0.07, C.tip - 0.6, cz + 0.42, IRON, { faces: 'NESWTB' });

  // a lantern by the south door
  gasLamp(k, X.x1 + 0.6, l.base + 3.2, X.z1 + 0.75, 0, AMBER);
  k.lights.push({ x: tx, z: X.z1 + 2, r: 8, color: AMBER, k: 0.5 });
};

/** A round flat thing on a wall that faces south, `out` in front of it: a rose window and its rings. */
function roundelOn(b: GeoBuilder, c: V3, r: number, out: number, color: number, o: QuadOpts, sides: number): void {
  const p = (i: number): V3 => {
    const a = (i / sides) * Math.PI * 2;
    return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, c[2] + out];
  };
  for (let i = 1; i + 1 < sides; i++) tri(b, p(0), p(i), p(i + 1), [0, 0, 1], color, o);
}

// ---------------------------------------------------------------------------
// The Wayne Foundation
// ---------------------------------------------------------------------------
//
// A lower block round an atrium, in which the great ornamental tree grows: its
// crown rises out of an opening in the atrium's glass roof. A glass penthouse
// stands on the west range's roof, and the rest of the roof is a garden.

function foundationOf(l: Lot) {
  const cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2;
  return { cx, cz, at: 3, yRoof: l.top - 4, X0: l.x0 + 0.2, X1: l.x1 - 0.2, Z0: l.z0 + 0.2, Z1: l.z1 - 0.2 };
}

const foundation: Model = (k, l) => {
  const b = k.b, F = foundationOf(l), { cx, cz, at, yRoof, X0, X1, Z0, Z1 } = F, yP = l.base + 3;
  b.box(l.x0, l.base, l.z0, l.x1, yP, l.z1, STONE_DARK, { top: STONE_TRIM });
  // four ranges round the atrium
  const ax0 = cx - at, ax1 = cx + at, az0 = cz - at, az1 = cz + at, win = { win: GOTHIC_WIN, seed: 3.3, top: 0x6f7178 };
  b.box(X0, yP, az1, X1, yRoof, Z1, FOUNDATION_STONE, win);
  b.box(X0, yP, Z0, X1, yRoof, az0, FOUNDATION_STONE, win);
  b.box(X0, yP, az0, ax0, yRoof, az1, FOUNDATION_STONE, { ...win, faces: 'WET' });
  b.box(ax1, yP, az0, X1, yRoof, az1, FOUNDATION_STONE, { ...win, faces: 'EWT' });
  parapet(b, [[X0, Z0], [X1, Z0], [X1, Z1], [X0, Z1], [X0, Z0]], yRoof, 0.6, 0.25, STONE_TRIM);
  band(b, X0, Z0, X1, Z1, l.base + 11 - 0.2, l.base + 11 + 0.2, 0.12);
  // gargoyles at the two corners the view sees
  gargoyle(b, X1 - 0.2, yRoof + 0.62, Z1 - 0.2, Math.PI / 4, 0.9);
  gargoyle(b, X1 - 0.2, yRoof + 0.62, Z0 + 0.2, -Math.PI / 4, 0.9);

  // the atrium: a garden floor, the tree, and the glass roof round the opening its crown rises through
  area(k, rect(ax0, az0, ax1, az1), 0x4a5a3c, yP + 0.04);
  b.beam([cx, yP, cz], [cx, yP + 7.6, cz], 0.5, 0.32, BARK);
  for (const [dx, dz] of [[1, 0.4], [-0.8, 0.7], [0.2, -1]]) b.beam([cx, yP + 5.6, cz], [cx + dx * 1.4, yP + 8.4, cz + dz * 1.4], 0.22, 0.12, BARK);
  const crown: [number, number][] = [[1.0, 5.6], [2.35, 7.4], [2.7, 9.6], [2.5, 11.8], [2.15, 13.2], [1.2, 14.8], [0.2, 15.6]].map(([r, y]) => [r, yP + y]);
  lathe(b, cx, cz, crown.slice(0, 3), 8, LEAF_DARK);
  lathe(b, cx, cz, crown.slice(2), 8, LEAF);
  const gy = yRoof + 0.05, oy = yRoof + 1.0, o = 2.45;
  const rim: V3[] = [[ax0, gy, az0], [ax1, gy, az0], [ax1, gy, az1], [ax0, gy, az1]], hole: V3[] = [[cx - o, oy, cz - o], [cx + o, oy, cz - o], [cx + o, oy, cz + o], [cx - o, oy, cz + o]];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4, mx = (rim[i][0] + rim[j][0]) / 2 - cx, mz = (rim[i][2] + rim[j][2]) / 2 - cz, l2 = Math.hypot(mx, mz);
    b.quad(rim[i], rim[j], hole[j], hole[i], [(mx / l2) * 0.75, 0.66, (mz / l2) * 0.75], GLASS, { win: LIT_SOFT });
    b.beam(hole[i], hole[j], 0.07, 0.07, STEEL);
  }

  // the penthouse, of glass in a frame of stone, on the west range
  const p = { x0: X0 + 0.3, x1: ax0 - 0.2, z0: Z0 + 0.3, z1: az1 - 0.6 };
  b.box(p.x0, yRoof, p.z0, p.x1, l.top, p.z1, GLASS, { win: GLASS_WIN, faces: 'NESW' });
  b.box(p.x0 - 0.15, l.top - 0.35, p.z0 - 0.15, p.x1 + 0.15, l.top, p.z1 + 0.15, STONE_TRIM, { faces: 'NESWTB', top: LEAD });
  for (const [x, z] of [[p.x0, p.z0], [p.x1, p.z0], [p.x0, p.z1], [p.x1, p.z1]]) b.box(x - 0.15, yRoof, z - 0.15, x + 0.15, l.top - 0.35, z + 0.15, STONE_TRIM, { faces: 'NESW' });

  // the roof garden, over the south and east ranges: lawns, planters, small trees and a flag
  area(k, rect(X0 + 0.5, az1 + 0.35, cx - 1.6, Z1 - 0.4), LAWN, yRoof + 0.04);
  area(k, rect(ax1 + 0.35, az0 + 0.3, X1 - 0.5, az1 - 0.3), LAWN, yRoof + 0.04);
  for (const [x0, z0, x1, z1] of [[cx + 1.6, Z1 - 0.9, X1 - 0.5, Z1 - 0.35], [ax1 + 0.35, Z0 + 0.4, X1 - 0.5, az0 - 0.3]]) b.box(x0, yRoof, z0, x1, yRoof + 0.5, z1, STONE_TRIM, { top: LEAF_DARK });
  k.tree(X0 + 1.4, Z1 - 1.2, 0.42, false, yRoof);
  k.tree(X1 - 1.3, az0 + 1.0, 0.4, false, yRoof);
  k.tree(X1 - 1.3, az1 - 1.0, 0.38, false, yRoof);
  b.beam([X1 - 0.8, yRoof, Z1 - 0.8], [X1 - 0.8, l.top - 0.2, Z1 - 0.8], 0.06, 0.04, STEEL);
  for (const s of [-1, 1]) b.quad([X1 - 0.78, l.top - 1.6, Z1 - 0.8 + s * 0.02], [X1 + 0.6, l.top - 1.6, Z1 - 0.8 + s * 0.02], [X1 + 0.6, l.top - 0.6, Z1 - 0.8 + s * 0.02], [X1 - 0.78, l.top - 0.6, Z1 - 0.8 + s * 0.02], [0, 0, s], 0x7a2a2a);
  for (const [x, z] of [[X0 + 2.6, Z1 - 1.0], [X1 - 1.6, cz]]) if (open(x, z, 0.2, ['foundation'])) k.person(x, z, yRoof);

  // the door and the name, on the east front, which the view sees over the rim
  b.box(X1 - 0.3, l.base, cz - 1.8, l.x1 + 0.5, l.base + 6.4, cz + 1.8, STONE_LIGHT, { top: STONE_TRIM });
  arch(b, 'E', l.x1 + 0.52, cz, l.base, 2.6, l.base + 3.2, STONE_TRIM);
  arch(b, 'E', l.x1 + 0.54, cz, l.base + 0.02, 1.9, l.base + 3.2, WARM, { win: LIT });
  wallSign(k, 'towers-foundation', 'Wayne Foundation', 'E', X1, cz, l.base + 8.6, 0.9, 9.5);
  gasLamp(k, l.x1 + 0.8, l.base + 5.0, cz + 2.2, 0, AMBER);
  k.lights.push({ x: l.x1 + 2, z: cz, r: 8, color: AMBER, k: 0.45 });
};

// ---------------------------------------------------------------------------
// The Crown's walls, its rim, and Pinkney's walkways
// ---------------------------------------------------------------------------

/** The Crown's extent. */
const crownBox = (): { x0: number; x1: number; z0: number; z1: number } => ({
  x0: Math.min(...CROWN.map((p) => p[0])), x1: Math.max(...CROWN.map((p) => p[0])),
  z0: Math.min(...CROWN.map((p) => p[1])), z1: Math.max(...CROWN.map((p) => p[1])),
});

/** A covered bridge between two buildings, one storey tall from `y0`, from `a` to `c` (each half a unit inside a building). */
function walkway(k: Build, a: [number, number], c: [number, number], y0: number, w = 2.4): void {
  const b = k.b, dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dz, dx), L = len / 2;
  b.moved((a[0] + c[0]) / 2, 0, (a[1] + c[1]) / 2, yaw, () => {
    b.box(-L, y0, -w / 2, L, y0 + 4, w / 2, STONE, { win: GOTHIC_WIN, faces: 'NS', seed: y0 * 0.1 });
    b.box(-L, y0 - 0.45, -w / 2 - 0.12, L, y0 + 0.15, w / 2 + 0.12, STONE_TRIM, { faces: 'NSB' });
    b.box(-L, y0 + 3.75, -w / 2 - 0.1, L, y0 + 4.05, w / 2 + 0.1, STONE_TRIM, { faces: 'NSB' });
    for (const s of [-1, 1]) slab(b, [0, y0 + 4.9, 0], [0, y0 + 3.85, s * (w / 2 + 0.3)], L, 0.18, LEAD, { under: STONE_DARK });
    // ribs between the bays, so that it reads as built of stone and not as a tube
    const n = Math.max(2, Math.round(len / 2.4));
    for (let i = 1; i < n; i++) {
      const u = -L + (len * i) / n;
      for (const s of [-1, 1]) b.box(u - 0.16, y0, s > 0 ? w / 2 - 0.05 : -w / 2 - 0.2, u + 0.16, y0 + 3.8, s > 0 ? w / 2 + 0.2 : -w / 2 + 0.05, STONE_LIGHT, { faces: s > 0 ? 'SEW' : 'NEW' });
    }
  });
  const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
  k.glows.push({ x: mx, y: y0 - 0.6, z: mz, sx: 0.3, sy: 0.15, sz: 0.3, color: '#ffd59a' });
}

export function crownExtras(k: Build): void {
  const b = k.b, C = crownBox(), yU = Y.upper, yC = Y.crown, S = stairOf();
  const stairW = S.cx - S.half - S.going * S.steps - 0.6;

  // ---- the south face, west of the stair: pilasters, blind arches, lamps in every other one, and a band at its top
  {
    const x0 = C.x0 + 0.5, x1 = stairW, n = Math.max(1, Math.round((x1 - x0) / 4.2)), at = C.z1;
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      onFace(b, 'S', at, x - 0.28, x + 0.28, yU, yC - 0.4, 0.25, STONE_LIGHT);
    }
    for (let i = 0; i < n; i++) {
      const xm = x0 + ((x1 - x0) * (i + 0.5)) / n;
      arch(b, 'S', at + 0.02, xm, yU + 0.1, 2.9, yU + 2.4, STONE_TRIM, {}, 0.75);
      arch(b, 'S', at + 0.04, xm, yU + 0.3, 2.3, yU + 2.4, STONE_DARK, {}, 0.75);
      if (i % 2 === 0) gasLamp(k, xm, yU + 3.0, at + 0.35, 0, SODIUM);
    }
    onFace(b, 'S', at, x0 - 0.5, x1, yC - 0.4, yC - 0.05, 0.22, STONE_TRIM, { faces: 'SEWTB' });
  }

  // ---- the east face: buttresses, blind arches between them, lamps in every other bay, and a band at its top
  {
    const at = C.x1, z0 = C.z0 + 0.6, z1 = C.z1 - 0.6, n = 8;
    for (let i = 0; i <= n; i++) {
      const z = z0 + ((z1 - z0) * i) / n;
      onFace(b, 'E', at, z - 0.5, z + 0.5, yU, yU + 3.2, 1.2, STONE_LIGHT, { top: STONE_TRIM });
      onFace(b, 'E', at, z - 0.4, z + 0.4, yU + 3.2, yC - 0.4, 0.7, STONE_LIGHT, { top: STONE_TRIM });
    }
    for (let i = 0; i < n; i++) {
      const zm = z0 + ((z1 - z0) * (i + 0.5)) / n;
      arch(b, 'E', at + 0.02, zm, yU + 0.1, 3.4, yU + 2.2, STONE_TRIM, {}, 0.65);
      arch(b, 'E', at + 0.04, zm, yU + 0.3, 2.8, yU + 2.2, STONE_DARK, {}, 0.65);
      if (i % 2 === 1) gasLamp(k, at + 0.35, yU + 2.9, zm, 0, SODIUM);
    }
    onFace(b, 'E', at, C.z0, C.z1, yC - 0.4, yC - 0.05, 0.22, STONE_TRIM, { faces: 'ENSTB' });
  }

  // ---- the balustrade along the rim, with a gap at the head of the stair, and a gargoyle on each corner
  const e = 0.25;
  balustrade(b, [[C.x0 + e, C.z1 - e], [S.cx - S.half - 0.55, C.z1 - e]], yC);
  balustrade(b, [[S.cx + S.half + 0.55, C.z1 - e], [C.x1 - e, C.z1 - e], [C.x1 - e, C.z0 + e]], yC);
  gargoyle(b, C.x1 - e, yC + 1.22, C.z1 - e, Math.PI / 4, 1.3);
  gargoyle(b, C.x1 - e, yC + 1.22, C.z0 + e, -Math.PI / 4, 1.3);
  gargoyle(b, C.x0 + e + 0.2, yC + 1.22, C.z1 - e, Math.PI / 2, 1.3);

  // ---- Pinkney's walkways: the Foundation to Wayne Tower, Wayne Tower to the Kane Building, the Kane Building to the Elliot Tower
  const w = wayneOf(lotOf('wayne-tower')), F = foundationOf(lotOf('foundation')), K = kaneOf(lotOf('kane-building')), E = elliotOf(lotOf('elliot-tower'));
  walkway(k, [w.cx - 2, F.Z1 - 0.5], [w.cx - 2, w.A.z0 + 0.5], Y.crown + 11);
  walkway(k, [K.S.x1 - 0.5, K.cz + 1.5], [w.A.x0 + 0.5, w.A.z0 + 3.5], Y.crown + 27);
  walkway(k, [K.cx - 0.5, K.S.z1 - 0.5], [K.cx - 0.5, E.cz - E.halves[1] + 0.5], Y.crown + 23);
}

// ---------------------------------------------------------------------------
// What the tile calls
// ---------------------------------------------------------------------------

/** A model for each lot this file builds, by the lot's id. */
export const MODELS: Record<string, Model> = {
  'wayne-tower': wayneTower,
  'wayne-forecourt': forecourt,
  'kane-building': kane,
  'elliot-tower': elliot,
  cathedral,
  foundation,
};

/** Lots that are built as part of another lot's model or by `extras`, and so get no box either. */
export const COVERS: string[] = [];

/** Every sign this file hangs. Each id begins with `towers-`. */
export const SIGNS: SignDef[] = [
  nameSign('towers-wayne-tower', 'Wayne Tower'),
  nameSign('towers-kane-building', 'Kane Building'),
  nameSign('towers-elliot-tower', 'Elliot Tower'),
  nameSign('towers-cathedral', 'Gotham Cathedral'),
  nameSign('towers-foundation', 'Wayne Foundation'),
];

/** The places the show needs, worked out from the lots as the models are. */
function places(): Record<string, Place> {
  const w = wayneOf(lotOf('wayne-tower')), P = w.perch, T = w.thirteenth;
  const kl = lotOf('kane-building'), K = kaneOf(kl);
  const el = lotOf('elliot-tower'), E = elliotOf(el);
  const fl = lotOf('foundation'), F = foundationOf(fl);
  const along = 0.38;
  return {
    perch: { x: P.x + Math.cos(P.yaw) * along * P.s, y: P.y + 0.85 * P.s, z: P.z + Math.sin(P.yaw) * along * P.s, h: P.yaw },
    thirteenth: { x: T.x + along * T.s, y: T.y + 0.85 * T.s, z: T.z, h: 0 },
    towerDoor: { x: w.cx, y: Y.crown + 0.04, z: lotOf('wayne-forecourt').z0 + 0.35, h: Math.PI / 2 },
    watchKane: { x: K.S.x1 - 0.7, y: K.yPod + 0.1, z: (K.S.z1 + kl.z1) / 2 - 0.2, h: TO_VIEW_H },
    watchElliot: { x: E.cx + (E.halves[0] + E.halves[1]) / 2, y: E.tops[0] + 0.3, z: E.cz + (E.halves[0] + E.halves[1]) / 2, h: TO_VIEW_H },
    foundationRoof: { x: F.cx + 0.5, y: F.yRoof, z: F.cz + F.at + (F.Z1 - F.cz - F.at) / 2, h: TO_VIEW_H },
  };
}

/** Places on what this file builds that the show needs as built: its task names them. */
export const PLACES: Record<string, Place> = places();

/** Whatever is not one of the plan's lots. */
export function extras(k: Build): void {
  crownExtras(k);
}
