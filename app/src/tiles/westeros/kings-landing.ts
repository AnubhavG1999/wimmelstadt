// King's Landing: its walls and gates, the Red Keep, the Great Sept, the
// Dragonpit, its houses, its quays, its ships and the Blackwater bridge.
//
// A city on three hills where the Blackwater meets the bay, inside a ring of
// pale wall: Visenya's Hill in the west with the Great Sept of Baelor on it,
// Aegon's High Hill in the south-east with the Red Keep, Rhaenys's Hill in the
// north-east with the ruin of the Dragonpit. Between them a jumble of houses
// with timber upper storeys. The kingsroad runs outside the east wall and along
// the river front, past the quays and the ships, and through three gates.
//
// Everything takes its place from plan.ts. From the books' descriptions only.

import { area, flat, rect, walls } from '../../engine/ground';
import { interior, rng, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { figure, lathe, SKIN, type Dress } from '../../engine/parts';
import { drum, face3, gable, hip, prism, slab, type XZ } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import { drawField, field, heightOn, smooth } from '../../engine/terrain';
import type { Build } from '../../engine/tile';
import { DARK, DAUB, DOOR, HOUSE_WIN, IRONWORK, LOOPS, LOOPS_CLOSE, PLASTER, ROOF, STONE, TIMBER, TIMBER_DARK, banner, brazier, fire, nameBoard, nameSign } from './look';
import type { Model } from './models';
import { HERO_SPOTS, KINGS_LANDING, lotOf, type Lot } from './plan';

// ---------------------------------------------------------------------------
// Where things are, all from the plan
// ---------------------------------------------------------------------------

interface R4 { x0: number; z0: number; x1: number; z1: number }

const KL = KINGS_LANDING, WL = KL.walls;
const LN = lotOf('kl-wall-n'), LW = lotOf('kl-wall-w'), LS = lotOf('kl-wall-s'), LE = lotOf('kl-wall-e');
/** The ground inside the walls. */
const IN: R4 = { x0: LW.x1, z0: LN.z1, x1: LE.x0, z1: LS.z0 };
const SEPT = lotOf('sept'), RK = lotOf('rk-walls'), MAE = lotOf('rk-maegor'), PIT = lotOf('dragonpit');
const HW = lotOf('kl-houses-w'), HM = lotOf('kl-houses-mid');
const DG = lotOf('kl-dragon-gate'), LG = lotOf('kl-lion-gate'), RG = lotOf('kl-river-gate');
const QUAY = HERO_SPOTS.find((s) => s.id === 'quay')!;

const RIVER_STONE = STONE.river, RIVER_SHADE = STONE.riverShade;
/** The iron of the Red Keep's ramparts: painted lighter than iron, since thin parts come out dark. */
const IRON = 0x80858b, IRON_DARK = 0x5f6368;
const BRONZE = 0xa8783c, BRONZE_DARK = 0x7d5628, OAK = 0x5e4127;
const MARBLE = STONE.white, MARBLE_SHADE = STONE.whiteShade;
const CRYSTAL = 0xd3ecf4, GLASS = 0x8cc3d8, GILT = ROOF.gilt;
const COBBLE = 0xa09583, PAVING = 0xd9d3c4;

/** The Sept: the middle of its lot, the hill's top, the radius of its seven-sided hall. */
const SC = { x: (SEPT.x0 + SEPT.x1) / 2, z: (SEPT.z0 + SEPT.z1) / 2 };
const SEPT_R = 4.6, SEPT_Y = KL.visenya.y;
/** The Dragonpit: its middle and its outer radius, kept clear of the east wall. */
const PIT_R = Math.min(PIT.x1 - PIT.x0, PIT.z1 - PIT.z0) / 2 - 0.8;
const PC = { x: Math.min((PIT.x0 + PIT.x1) / 2, IN.x1 - 0.1 - PIT_R), z: (PIT.z0 + PIT.z1) / 2 };
const PIT_Y = KL.rhaenys.y;
/** The Red Keep: its court stands at the hill's height; the hill under it, and the dry moat's floor, a little lower. */
const COURT = KL.aegon.y, FLOOR = COURT - 1.4;
/** The middles of the four corner drum towers, and the lines of the curtain walls through them. */
const DRUM = {
  nw: centreOf(lotOf('rk-tower-nw')), ne: centreOf(lotOf('rk-tower-ne')),
  sw: centreOf(lotOf('rk-tower-sw')), se: centreOf(lotOf('rk-tower-se')),
};
const DRUM_R = Math.min(lotOf('rk-tower-nw').x1 - lotOf('rk-tower-nw').x0, lotOf('rk-tower-nw').z1 - lotOf('rk-tower-nw').z0) / 2 - 0.05;
const CURTAIN = 1.6;
const RK_IN: R4 = { x0: DRUM.nw.x + CURTAIN / 2, z0: DRUM.nw.z + CURTAIN / 2, x1: DRUM.se.x - CURTAIN / 2, z1: DRUM.se.z - CURTAIN / 2 };
const MOAT: R4 = { x0: MAE.x0 - 0.9, z0: MAE.z0 - 0.9, x1: MAE.x1 + 0.9, z1: MAE.z1 + 0.9 };
/** The hill's top under the Red Keep, out to just inside the lot. */
const RK_TOP: R4 = { x0: RK.x0 + 0.5, z0: RK.z0 + 0.5, x1: RK.x1 - 0.5, z1: RK.z1 };
const SEPT_TOP: R4 = { x0: SC.x - SEPT_R - 0.4, z0: SC.z - SEPT_R - 0.4, x1: SC.x + SEPT_R + 0.4, z1: SC.z + SEPT_R + 0.4 };

function centreOf(l: R4): { x: number; z: number } {
  return { x: (l.x0 + l.x1) / 2, z: (l.z0 + l.z1) / 2 };
}
const inside = (r: R4, x: number, z: number, m = 0): boolean => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;
const overlaps = (a: R4, b: R4): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
const outside = (x: number, z: number, r: R4): number => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1));

// ---------------------------------------------------------------------------
// The three hills: one sheet of ground over the whole city inside the walls
// ---------------------------------------------------------------------------

function hill(x: number, z: number): number {
  const visenya = SEPT_Y * (1 - smooth(0, 4.5, outside(x, z, SEPT_TOP)));
  // Aegon's Hill falls steeply to the north and the east, so that Flea Bottom lies low at its foot
  const aegon = FLOOR * (1 - smooth(0, x > RK_TOP.x1 || z < RK_TOP.z0 ? 3.0 : 4.5, outside(x, z, RK_TOP)));
  const rhaenys = PIT_Y * (1 - smooth(0, 3.5, Math.max(0, Math.hypot(x - PC.x, z - PC.z) - PIT_R - 1)));
  return Math.max(0.04, visenya, aegon, rhaenys);
}

/** The city's ground, a hair inside the walls' inner faces so that its edge is hidden in them. */
const GROUND = field(IN.x0 - 0.1, IN.z0 - 0.1, IN.x1 + 0.1, IN.z1 + 0.1, 2.5, hill);

export function heightAt(x: number, z: number): number {
  if (inside(RK_IN, x, z, 0.05)) return inside(MOAT, x, z) && !inside(MAE, x, z) ? FLOOR : COURT;
  if (!inside(IN, x, z)) return 0;
  return heightOn(GROUND, x, z);
}

function drawHills(k: Build): void {
  drawField(k.b, GROUND, {
    color: (y, level, x, z) => {
      if (inside(RK_IN, x, z, 0.4)) return 0x6c5b4c; // the dry moat's floor
      if (level < 0.6) return y > 2 ? 0x9b7b66 : 0x8f8573; // the hills' steep faces: red earth and rock
      if (y > SEPT_Y - 0.5 && Math.hypot(x - SC.x, z - SC.z) < SEPT_R + 1.6) return PAVING; // the Sept's marble terrace
      if (level < 0.86) return y > 0.8 ? 0x86a262 : COBBLE; // grass on the flanks
      return COBBLE;
    },
    cut: 0x8f8573,
    edges: '',
  });
}

// ---------------------------------------------------------------------------
// Parts of the walls
// ---------------------------------------------------------------------------

/** A square tower over a rectangle, with a merlon at each corner and one in the middle of each side. */
function sqTower(b: GeoBuilder, r: R4, y0: number, top: number, color: number, shade: number, win?: WinSpec, mh = 0.8): void {
  b.box(r.x0, y0, r.z0, r.x1, top, r.z1, color, { win, seed: r.x0 * 0.13 + r.z0 * 0.07, top: shade });
  const m = 0.5, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, o = { top: shade };
  for (const [x, z] of [[r.x0, r.z0], [r.x1 - m, r.z0], [r.x0, r.z1 - m], [r.x1 - m, r.z1 - m]]) b.box(x, top, z, x + m, top + mh, z + m, color, o);
  if (r.x1 - r.x0 > 2.2) {
    b.box(cx - 0.3, top, r.z0, cx + 0.3, top + mh, r.z0 + 0.4, color, o);
    b.box(cx - 0.3, top, r.z1 - 0.4, cx + 0.3, top + mh, r.z1, color, o);
  }
  if (r.z1 - r.z0 > 2.2) {
    b.box(r.x0, top, cz - 0.3, r.x0 + 0.4, top + mh, cz + 0.3, color, o);
    b.box(r.x1 - 0.4, top, cz - 0.3, r.x1, top + mh, cz + 0.3, color, o);
  }
}

/**
 * A stretch of curtain wall along x (or z) from a0 to a1, between c0 and c1
 * across: merlons on its outer edge and a low parapet on its inner. Its ends
 * are left open, for towers to stand on.
 */
function wall(b: GeoBuilder, axis: 'x' | 'z', a0: number, a1: number, c0: number, c1: number, y0: number, top: number, outLow: boolean, color: number, shade: number, win?: WinSpec): void {
  const bx = (p0: number, p1: number, q0: number, q1: number, y1: number, y2: number, faces: string): void =>
    axis === 'x' ? b.box(p0, y1, q0, p1, y2, q1, color, { top: shade, faces, win, seed: p0 * 0.11 + q0 * 0.07 }) : b.box(q0, y1, p0, q1, y2, p1, color, { top: shade, faces: faces.replace('N', 'e').replace('S', 'w').replace('e', 'E').replace('w', 'W'), win, seed: q0 * 0.11 + p0 * 0.07 });
  bx(a0, a1, c0, c1, y0, top, 'NST');
  const len = a1 - a0, n = Math.max(1, Math.round(len / 2.2)), seg = len / n;
  const o0 = outLow ? c0 : c1 - 0.4;
  for (let i = 0; i < n; i++) {
    const p = a0 + seg * (i + 0.22);
    axis === 'x' ? b.box(p, top, o0, p + seg * 0.56, top + 0.8, o0 + 0.4, color, { top: shade }) : b.box(o0, top, p, o0 + 0.4, top + 0.8, p + seg * 0.56, color, { top: shade });
  }
  const i0 = outLow ? c1 - 0.3 : c0;
  bx(a0, a1, i0, i0 + 0.3, top, top + 0.35, 'NST');
}

/**
 * A closed doorway on a wall face: a ring of paler stone and an arched door,
 * each a hair proud of the face. The wall runs along `axis`; the face is at
 * `f` across, and looks towards `s` (+1 or -1).
 */
function doorway(b: GeoBuilder, axis: 'x' | 'z', c: number, f: number, s: number, y0: number, w: number, h: number, door: number, frame: number, lit = 0): void {
  const P = (u: number, y: number, d: number): V3 => (axis === 'x' ? [u, y, f + s * d] : [f + s * d, y, u]);
  const n: V3 = axis === 'x' ? [0, 0, s] : [s, 0, 0];
  for (const [ww, hh, d, col] of [[w + 0.5, h + 0.25, 0.05, frame], [w, h, 0.11, door]]) {
    const r = ww / 2, spring = y0 + hh - r, o = col === door && lit ? { win: interior(lit) } : {};
    b.quad(P(c - r, y0, d), P(c + r, y0, d), P(c + r, spring, d), P(c - r, spring, d), n, col, o);
    for (let i = 0; i < 6; i++) {
      const a0 = (Math.PI * i) / 6, a1 = (Math.PI * (i + 1)) / 6;
      face3(b, P(c, spring, d), P(c + Math.cos(a0) * r, spring + Math.sin(a0) * r, d), P(c + Math.cos(a1) * r, spring + Math.sin(a1) * r, d), n, col, o);
    }
  }
}

/**
 * The arch of a gate over a road that runs along `axis`: its two faces at a0
 * and a1, `w` wide round `c`, rising from `spring` by `rise` in a flattened
 * curve, with the masonry over it up to `top`, a soffit under it and a walk on
 * top of it with merlons along both faces.
 */
function vault(b: GeoBuilder, axis: 'x' | 'z', c: number, a0: number, a1: number, w: number, spring: number, rise: number, top: number, color: number, shade: number, soffit: number, n = 8): void {
  const P = (u: number, y: number, a: number): V3 => (axis === 'z' ? [u, y, a] : [a, y, u]);
  const N = (nu: number, ny: number, na: number): V3 => (axis === 'z' ? [nu, ny, na] : [na, ny, nu]);
  const at = (i: number): [number, number] => {
    const t = Math.PI * (1 - i / n);
    return [c + (Math.cos(t) * w) / 2, spring + Math.sin(t) * rise];
  };
  for (let i = 0; i < n; i++) {
    const [ua, ya] = at(i), [ub, yb] = at(i + 1);
    b.quad(P(ua, ya, a0), P(ub, yb, a0), P(ub, top, a0), P(ua, top, a0), N(0, 0, -1), color);
    b.quad(P(ua, ya, a1), P(ub, yb, a1), P(ub, top, a1), P(ua, top, a1), N(0, 0, 1), color);
    const t = Math.PI * (1 - (i + 0.5) / n), nu = -Math.cos(t) / (w / 2), ny = -Math.sin(t) / rise, l = Math.hypot(nu, ny);
    b.quad(P(ua, ya, a0), P(ub, yb, a0), P(ub, yb, a1), P(ua, ya, a1), N(nu / l, ny / l, 0), soffit);
  }
  // the walk over it
  const u0 = c - w / 2, u1 = c + w / 2;
  b.quad(P(u0, top, a1), P(u1, top, a1), P(u1, top, a0), P(u0, top, a0), [0, 1, 0], shade);
  const m = Math.max(2, Math.round(w / 1.9)), seg = w / m;
  for (let i = 0; i < m; i++) {
    const p = u0 + seg * (i + 0.22), q = p + seg * 0.56;
    for (const a of [a0, a1 - 0.4]) (axis === 'z' ? b.box(p, top, a, q, top + 0.8, a + 0.4, color, { top: shade }) : b.box(a, top, p, a + 0.4, top + 0.8, q, color, { top: shade }));
  }
}

/** A gold cloak of the City Watch: dark mail and a cloak of gold. */
const GOLD_CLOAK: Dress = { coat: 0xdcac30, legs: 0x3c3c42, hat: 0xa3a9ae, hatH: 0.3 };
const SEPTON: Dress = { coat: 0xf1ede3, legs: 0xe9e4d8, hat: SKIN, hatH: 0.05 };
const BEGGAR: Dress = { coat: 0x857158, legs: 0x6b5a47, hat: 0x5d4d3b, hatH: 0.14 };

// ---------------------------------------------------------------------------
// The city walls, with their towers and their blind gatehouses
// ---------------------------------------------------------------------------

const WALK = WL.top - 2.4, TOWER = WL.top - 0.8; // 6.6 and 8.2 on the land sides
const WALK_S = WL.river - 2.2, TOWER_S = WL.river - 0.8; // 4.8 and 6.2 along the river
const TWIN: WinSpec = { ...LOOPS, storey: TOWER / 2 }, TWIN_S: WinSpec = { ...LOOPS, storey: TOWER_S / 2 };

/** The corner towers. Those by the kingsroad's two bends are kept out of the road. */
const CORNER = {
  nw: { x0: LW.x0 - 1, z0: LN.z0 - 1, x1: LW.x1 + 1, z1: LN.z1 + 1 },
  ne: { x0: LE.x0 - 0.6, z0: LN.z0 - 0.7, x1: LE.x1 + 0.6, z1: LN.z1 + 1.1 },
  sw: { x0: LW.x0 - 0.7, z0: LS.z0 - 1.1, x1: LW.x1 + 0.8, z1: LS.z1 + 0.4 },
  se: { x0: LE.x0 - 0.6, z0: LS.z0 - 1.3, x1: LE.x1 + 0.3, z1: LS.z1 + 0.2 },
};

/** The gates the books give the city where this tile has no road: shut, with a gatehouse of two towers. */
const BLIND = {
  gods: { axis: 'x' as const, at: (LN.x0 + LN.x1) / 2 },
  old: { axis: 'z' as const, at: LW.z0 + (LW.z1 - LW.z0) * 0.66 },
  king: { axis: 'z' as const, at: LE.z0 + (LE.z1 - LE.z0) * 0.66 },
};

/** Builds one of the land walls: its stretches, its towers and its gatehouse if it has one. */
function landWall(k: Build, side: 'n' | 'w' | 'e'): void {
  const b = k.b, l = side === 'n' ? LN : side === 'w' ? LW : LE;
  const axis = side === 'n' ? 'x' : 'z';
  const a0 = axis === 'x' ? l.x0 : l.z0, a1 = axis === 'x' ? l.x1 : l.z1, c0 = axis === 'x' ? l.z0 : l.x0, c1 = axis === 'x' ? l.z1 : l.x1;
  const outLow = side !== 'e';
  const across = (a: number, b2: number, out: number, inn: number): R4 => {
    const lo = outLow ? c0 - out : c0 - inn, hi = outLow ? c1 + inn : c1 + out;
    return axis === 'x' ? { x0: a, z0: lo, x1: b2, z1: hi } : { x0: lo, z0: a, x1: hi, z1: b2 };
  };
  const along = (r: R4): [number, number] => (axis === 'x' ? [r.x0, r.x1] : [r.z0, r.z1]);
  // the towers along it, in order
  const towers: R4[] = [];
  const first = side === 'n' ? CORNER.nw : side === 'w' ? CORNER.nw : CORNER.ne;
  const last = side === 'n' ? CORNER.ne : side === 'w' ? CORNER.sw : CORNER.se;
  if (side === 'n') towers.push(CORNER.nw);
  const gate = side === 'n' ? BLIND.gods : side === 'w' ? BLIND.old : BLIND.king;
  const span = along(last)[0] - along(first)[1];
  for (const t of [0.25, 0.75]) {
    const mid = along(first)[1] + span * t;
    if (Math.abs(mid - gate.at) > 6) towers.push(across(mid - 1.5, mid + 1.5, 1.0, 0.5));
  }
  const g0 = across(gate.at - 3.7, gate.at - 1.1, 1.4, 0.8), g1 = across(gate.at + 1.1, gate.at + 3.7, 1.4, 0.8);
  towers.push(g0, g1);
  if (side === 'n') towers.push(CORNER.ne);
  towers.sort((p, q) => along(p)[0] - along(q)[0]);
  // the stretches between them, each running a little into the towers at its ends
  const ends = [side === 'n' ? null : first, ...towers, side === 'n' ? null : last];
  for (let i = 0; i + 1 < ends.length; i++) {
    const p = ends[i], q = ends[i + 1];
    const s0 = p ? along(p)[1] - 0.2 : a0, s1 = q ? along(q)[0] + 0.2 : a1;
    if (s1 > s0) wall(b, axis, s0, s1, c0, c1, 0, WALK, outLow, RIVER_STONE, RIVER_SHADE);
  }
  for (const t of towers) sqTower(b, t, 0, TOWER, RIVER_STONE, RIVER_SHADE, TWIN);
  // the shut gate between the gatehouse's towers, on both faces, and a torch either side
  const outF = outLow ? c0 : c1, inF = outLow ? c1 : c0, s = outLow ? -1 : 1;
  doorway(b, axis, gate.at, outF, s, 0, 1.7, 3.4, DOOR, 0xcfc6b4);
  doorway(b, axis, gate.at, inF, -s, heightAt(axis === 'x' ? gate.at : inF - s * 0.3, axis === 'x' ? inF - s * 0.3 : gate.at), 1.7, 3.0, DOOR, 0xcfc6b4);
  for (const d of [-1.6, 1.6]) {
    const p: [number, number] = axis === 'x' ? [gate.at + d, outF + s * 0.25] : [outF + s * 0.25, gate.at + d];
    fire(k, p[0], 3.6, p[1], 0.22, 7);
  }
  // a gold cloak outside it
  const gc: [number, number] = axis === 'x' ? [gate.at + 4.3, outF + s * 0.9] : [outF + s * 0.9, gate.at + 4.3];
  figure(b, gc[0], gc[1], 0, GOLD_CLOAK);
  // guards and a brazier on the walk
  const walkC = (c0 + c1) / 2;
  const r = rng(side === 'n' ? 71 : side === 'w' ? 72 : 73);
  for (let i = 0; i < 3; i++) {
    const a = a0 + 4 + r() * (a1 - a0 - 8);
    if (towers.some((t) => along(t)[0] - 0.5 < a && a < along(t)[1] + 0.5)) continue;
    axis === 'x' ? k.person(a, walkC, WALK) : k.person(walkC, a, WALK);
  }
  const bz = a0 + (a1 - a0) * 0.4;
  axis === 'x' ? brazier(k, bz, walkC, WALK) : brazier(k, walkC, bz, WALK);
}

/** The river wall: low, from the Lion Gate's corner to the Red Keep, and from the Red Keep to the corner by the quays. */
function riverWall(k: Build): void {
  const b = k.b, l = LS;
  const w1: R4 = { x0: l.x0 + (l.x1 - l.x0) * 0.22 - 1.5, z0: l.z0 - 1.1, x1: l.x0 + (l.x1 - l.x0) * 0.22 + 1.5, z1: l.z1 + 0.4 };
  // the tower next to the Red Keep stands where Aegon's Hill rises behind the wall
  const w2: R4 = { x0: RK.x0 - 3.2, z0: l.z0 - 1.1, x1: DRUM.sw.x - DRUM_R + 0.3, z1: l.z1 + 0.4 };
  const towers = [CORNER.sw, w1, w2];
  for (let i = 0; i + 1 < towers.length; i++) wall(b, 'x', towers[i].x1 - 0.2, towers[i + 1].x0 + 0.2, l.z0, l.z1, 0, WALK_S, false, RIVER_STONE, RIVER_SHADE);
  wall(b, 'x', DRUM.se.x + DRUM_R - 0.3, CORNER.se.x0 + 0.2, l.z0, l.z1, 0, WALK_S, false, RIVER_STONE, RIVER_SHADE);
  for (const t of [...towers, CORNER.se]) sqTower(b, t, 0, TOWER_S, RIVER_STONE, RIVER_SHADE, TWIN_S);
  // the west wall's last stretch, from its gatehouse down to this corner, is the west wall's; the east wall's likewise
  for (const x of [l.x0 + 8, l.x0 + 18]) k.person(x, (l.z0 + l.z1) / 2, WALK_S);
  brazier(k, (w1.x1 + w2.x0) / 2, (l.z0 + l.z1) / 2, WALK_S);
}

// ---------------------------------------------------------------------------
// The three gates on roads
// ---------------------------------------------------------------------------

/** The low pier on the side of the road towards the view: no higher than 5 with its merlons. */
const LOW = 4.3;
/** The arch over a road: 9 wide, springing from the low pier's top and rising to 8.2, so that it is over 6 high across the whole 8 of the road. */
const ARCH = { w: 9, spring: LOW, rise: 3.9, top: 9.4 };

function dragonGate(k: Build, l: Lot): void {
  const b = k.b, x = KL.quayX, x0 = x - ARCH.w / 2, x1 = x + ARCH.w / 2;
  // the arch stands south of the kingsroad's bend, where the road already runs straight from north to south
  const z0 = l.z0 + 1.5, z1 = l.z1 + 0.5;
  // the tall tower, west of the road, against the city's corner tower
  const west: R4 = { x0: LE.x1 + 0.1, z0, x1: x0, z1 };
  sqTower(b, west, 0, l.top - 0.8, RIVER_STONE, RIVER_SHADE, { ...LOOPS, storey: (l.top - 0.8) / 3 });
  // the low pier east of it, on the quay's edge
  const east: R4 = { x0: x1, z0: z0 + 0.3, x1: x1 + 1.4, z1: z1 - 0.3 };
  sqTower(b, east, 0, LOW, RIVER_STONE, RIVER_SHADE, undefined, 0.7);
  vault(b, 'z', x, z0 + 0.15, z1 - 0.15, ARCH.w, ARCH.spring, ARCH.rise, ARCH.top, RIVER_STONE, RIVER_SHADE, 0x8f877a);
  // the arch's end over the low pier
  b.box(x1, LOW, z0 + 0.15, x1 + 0.4, ARCH.top, z1 - 0.15, RIVER_STONE, { faces: 'ENST', top: RIVER_SHADE });
  banner(b, (west.x0 + west.x1) / 2, (west.z0 + west.z1) / 2, l.top - 0.8, 'baratheon', 3.6);
  fire(k, x0 - 0.15, 4.2, z0 - 0.1, 0.24, 8);
  fire(k, x1 + 0.15, 3.6, z0 + 0.2, 0.24, 0);
  figure(b, x0 - 0.7, z1 + 0.8, 0, GOLD_CLOAK);
  figure(b, x1 + 0.7, z1 + 0.6, 0, GOLD_CLOAK);
  k.person(x0 - 0.6, west.z0 + 1.5, l.top - 0.8);
}

function lionGate(k: Build, l: Lot): void {
  const b = k.b, z = KL.quayZ, z0 = z - ARCH.w / 2, z1 = z + ARCH.w / 2;
  // the tall tower, north of the goldroad, joined to the city's south-west corner tower
  const north: R4 = { x0: l.x0 + 1.2, z0: LS.z0 - 0.5, x1: CORNER.sw.x0 + 0.1, z1: z0 };
  sqTower(b, north, 0, l.top - 0.8, RIVER_STONE, RIVER_SHADE, { ...LOOPS, storey: (l.top - 0.8) / 3 });
  // the low pier south of it, towards the river
  const south: R4 = { x0: l.x0 + 0.2, z0: z1, x1: l.x1 - 0.2, z1: z1 + 1.4 };
  sqTower(b, south, 0, LOW, RIVER_STONE, RIVER_SHADE, undefined, 0.7);
  vault(b, 'x', z, l.x0 + 0.35, l.x1 - 0.35, ARCH.w, ARCH.spring, ARCH.rise, ARCH.top, RIVER_STONE, RIVER_SHADE, 0x8f877a);
  b.box(l.x0 + 0.35, LOW, z1, l.x1 - 0.35, ARCH.top, z1 + 0.4, RIVER_STONE, { faces: 'SEWT', top: RIVER_SHADE });
  banner(b, (north.x0 + north.x1) / 2, (north.z0 + north.z1) / 2, l.top - 0.8, 'baratheon', 3.6);
  fire(k, l.x1 + 0.2, 4.2, z0 - 0.1, 0.24, 8);
  fire(k, l.x0 - 0.2, 4.2, z0 - 0.1, 0.24, 0);
  figure(b, l.x0 - 0.7, z0 - 0.6, 0, GOLD_CLOAK);
  figure(b, l.x1 + 0.6, z1 + 0.8, 0, GOLD_CLOAK);
}

function riverGate(k: Build, l: Lot): void {
  const b = k.b, x = (l.x0 + l.x1) / 2, x0 = x - ARCH.w / 2, x1 = x + ARCH.w / 2;
  const z0 = l.z0, z1 = l.z1, foot = -1.6;
  // the tall tower west of the road, standing in the river
  const west: R4 = { x0: x0 - 1.9, z0: z0 - 0.3, x1: x0, z1: z1 + 0.3 };
  sqTower(b, west, foot, l.top - 0.8, RIVER_STONE, RIVER_SHADE, { ...LOOPS, storey: (l.top - 0.8) / 3 });
  // the low pier east of it, on the end of the wharf
  const east: R4 = { x0: x1, z0: z0 + 0.3, x1: x1 + 1.4, z1: z1 - 0.3 };
  sqTower(b, east, foot, LOW, RIVER_STONE, RIVER_SHADE, undefined, 0.7);
  vault(b, 'z', x, z0 + 0.2, z1 - 0.2, ARCH.w, ARCH.spring, ARCH.rise, ARCH.top, RIVER_STONE, RIVER_SHADE, 0x8f877a);
  b.box(x1, LOW, z0 + 0.2, x1 + 0.4, ARCH.top, z1 - 0.2, RIVER_STONE, { faces: 'ENST', top: RIVER_SHADE });
  banner(b, (west.x0 + west.x1) / 2, (west.z0 + west.z1) / 2, l.top - 0.8, 'baratheon', 3.6);
  fire(k, x0 - 0.15, 4.2, z0 - 0.4, 0.24, 8);
  fire(k, x1 + 0.15, 3.6, z0 - 0.1, 0.24, 0);
  // gold cloaks on the quay at its foot, and on its walk
  figure(b, x0 - 1.4, z0 - 0.9, 0, GOLD_CLOAK);
  figure(b, x0 + 1.6, (z0 + z1) / 2, ARCH.top, GOLD_CLOAK);
  figure(b, x1 - 1.8, (z0 + z1) / 2, ARCH.top, GOLD_CLOAK);
}

/** The Blackwater bridge, which carries the kingsroad from the River Gate to the south shore. */
function bridge(k: Build): void {
  const b = k.b, x = (RG.x0 + RG.x1) / 2, x0 = x - 4.5, x1 = x + 4.5, z0 = RG.z0, z1 = RG.z0 + 7;
  b.box(x0, -1.6, z0, x1, -0.02, z1, RIVER_STONE, { faces: 'EWT', top: RIVER_SHADE });
  // its arches, low over the water, on both faces
  for (const [fx, s] of [[x0, -1], [x1, 1]] as [number, number][]) {
    for (const [a, c] of [[z0 + 0.5, z0 + 3.1], [z0 + 3.9, z1 - 0.5]]) {
      const m = (a + c) / 2, h = (c - a) / 2, f = fx + s * 0.03;
      b.quad([f, -0.9, a], [f, -0.9, c], [f, -0.55, c], [f, -0.55, a], [s, 0, 0], DARK);
      for (let i = 0; i < 4; i++) {
        const t0 = (Math.PI * i) / 4, t1 = (Math.PI * (i + 1)) / 4;
        face3(b, [f, -0.55, m], [f, -0.55 + Math.sin(t0) * 0.35, m + Math.cos(t0) * h], [f, -0.55 + Math.sin(t1) * 0.35, m + Math.cos(t1) * h], [s, 0, 0], DARK);
      }
    }
    // a cutwater at the pier between them
    const pz = z0 + 3.5, tip = fx + s * 0.9;
    face3(b, [fx, -0.25, pz - 0.4], [fx, -0.25, pz + 0.4], [tip, -0.25, pz], [0, 1, 0], RIVER_SHADE);
    b.quad([fx, -1.6, pz - 0.4], [tip, -1.6, pz], [tip, -0.25, pz], [fx, -0.25, pz - 0.4], [s * 0.4, 0, -0.9], RIVER_STONE);
    b.quad([tip, -1.6, pz], [fx, -1.6, pz + 0.4], [fx, -0.25, pz + 0.4], [tip, -0.25, pz], [s * 0.4, 0, 0.9], RIVER_STONE);
  }
  // the parapets, south of the gate, leaving the road its 8
  for (const [p0, p1] of [[x0, x0 + 0.45], [x1 - 0.45, x1]]) b.box(p0, -0.02, z1 - 3.7, p1, 0.9, z1, RIVER_STONE, { top: RIVER_SHADE });
  for (const px of [x0 + 0.22, x1 - 0.22]) fire(k, px, 1.25, z1 - 0.25, 0.18, 6);
}

// ---------------------------------------------------------------------------
// The Red Keep
// ---------------------------------------------------------------------------

/** A great drum tower of pale red stone, crowned with a rampart of iron. */
function drumTower(k: Build, x: number, z: number, r: number, y0: number, top: number, house?: string): void {
  const b = k.b, crown = top - 1.6;
  const win: WinSpec = { ...LOOPS, storey: crown / Math.round(crown / 3.9) };
  b.cyl(x, z, y0, crown - 0.3, r, r, 10, STONE.red, { win, seed: x * 0.13 + z * 0.07, cap: false });
  // the corbels under the crown, and the iron crown with its merlons
  b.cyl(x, z, crown - 0.3, crown, r, r + 0.25, 10, STONE.redShade, { cap: false });
  b.cyl(x, z, crown, crown + 0.7, r + 0.25, r + 0.25, 10, IRON, { cap: IRON_DARK });
  for (let i = 0; i < 10; i += 2) {
    const a = ((i + 0.5) / 10) * Math.PI * 2, w = (r + 0.25) * Math.sin(Math.PI / 10) * 0.9;
    b.obox(x + Math.cos(a) * (r + 0.05), crown + 1.15, z + Math.sin(a) * (r + 0.05), 0.2, 0.45, w, a, IRON, { top: IRON_DARK });
  }
  if (house) banner(b, x, z, crown + 0.7, house, 3.6);
}

function redKeepTower(id: keyof typeof DRUM, house?: string): Model {
  return (k, l) => {
    const c = DRUM[id];
    drumTower(k, c.x, c.z, DRUM_R, FLOOR - 1, l.top, house);
  };
}

function redKeepWalls(k: Build, l: Lot): void {
  const b = k.b, R = STONE.red, RS = STONE.redShade;
  const win: WinSpec = { ...LOOPS, storey: 3.8 };
  const top = l.top - 0.8; // 15.2, the walk; merlons to 16
  const y0 = FLOOR - 0.8;
  const h = CURTAIN / 2;
  // the four curtains, from drum to drum; the river side stands on the hill's cliff
  wall(b, 'x', DRUM.nw.x, DRUM.ne.x, DRUM.nw.z - h, DRUM.nw.z + h, y0, top, true, R, RS, win);
  wall(b, 'x', DRUM.sw.x, DRUM.se.x, DRUM.sw.z - h, DRUM.sw.z + h, y0, top, false, R, RS, win);
  wall(b, 'z', DRUM.nw.z, DRUM.sw.z, DRUM.nw.x - h, DRUM.nw.x + h, y0, top, true, R, RS, win);
  wall(b, 'z', DRUM.ne.z, DRUM.se.z, DRUM.ne.x - h, DRUM.ne.x + h, y0, top, false, R, RS, win);
  // the cliff of Aegon's High Hill under the river curtain, down to the river front
  // an upright face of red rock in two beds, the curtain and its drums standing on its top
  const foot = LS.z1 - 0.05;
  b.box(RK.x0, 0, DRUM.sw.z - 1.2, RK.x1, FLOOR * 0.5, foot, 0x7f685b, { faces: 'ESWT', top: 0x8a7364 });
  b.box(RK.x0 + 0.1, FLOOR * 0.5, DRUM.sw.z - 1.2, RK.x1 - 0.1, FLOOR - 0.05, foot - 0.02, 0x977c6c, { faces: 'ESWT', top: 0x8c7364 });
  // the three drums that have no lot of their own: two at the gate to the city, one over the river
  const gx = (DRUM.nw.x + DRUM.ne.x) / 2, small = DRUM_R - 0.1;
  drumTower(k, gx - 2.3, DRUM.nw.z, small, FLOOR - 1, l.top + 4.5);
  drumTower(k, gx + 2.3, DRUM.nw.z, small, FLOOR - 1, l.top + 4.5);
  drumTower(k, gx, DRUM.sw.z, small, FLOOR - 1, l.top + 5, 'baratheon');
  // the great gate of bronze between the two, and the way up to it from the city
  doorway(b, 'x', gx, DRUM.nw.z - h, -1, COURT, 1.5, 3.4, BRONZE, 0xd6a08a, 0.3);
  slab(b, [gx, COURT, DRUM.nw.z - h - 0.05], [gx, heightOn(GROUND, gx, HM.z1 + 0.6) + 0.1, HM.z1 + 0.6], 1.3, 4, 0xbfa190);
  fire(k, gx - 1.25, COURT + 3, DRUM.nw.z - h - 0.3, 0.24, 8);
  fire(k, gx + 1.25, COURT + 3, DRUM.nw.z - h - 0.3, 0.24, 0);
  figure(b, gx - 1.5, DRUM.nw.z - h - 1.0, heightAt(gx - 1.5, DRUM.nw.z - h - 1.0), GOLD_CLOAK);

  // --- the court, with the dry moat round Maegor's Holdfast ---
  const court = rect(RK_IN.x0 - 0.05, RK_IN.z0 - 0.05, RK_IN.x1 + 0.05, RK_IN.z1 + 0.05);
  flat(b, court, COURT, 0xc9b5a3, { holes: [rect(MOAT.x0, MOAT.z0, MOAT.x1, MOAT.z1)] });
  walls(b, rect(MOAT.x0, MOAT.z0, MOAT.x1, MOAT.z1), FLOOR, COURT, 0xa77562, { inward: true });

  // --- the throne hall: long and high, along the west curtain, its great doors to the south ---
  const hx0 = RK_IN.x0 + 0.1, hx1 = MOAT.x0 - 0.15, hz0 = RK_IN.z0 + 0.9, hz1 = MOAT.z1 - 1.2, eaves = COURT + 5.2;
  b.box(hx0, COURT, hz0, hx1, eaves, hz1, STONE.red, { win: { cell: 1.5, storey: eaves / 3, lit: 0.45, kind: 6 }, seed: 0.31, faces: 'NESW' });
  gable(b, hx0, hz0, hx1, hz1, eaves, 2.3, ROOF.slate, STONE.red, 'z', 0.25);
  doorway(b, 'x', (hx0 + hx1) / 2, hz1, 1, COURT, 1.5, 3.4, OAK, BRONZE, 0.2);
  b.box((hx0 + hx1) / 2 - 0.75, COURT + 1.4, hz1, (hx0 + hx1) / 2 + 0.75, COURT + 1.6, hz1 + 0.15, BRONZE, { faces: 'NESWTB' });
  b.box((hx0 + hx1) / 2 - 0.04, COURT, hz1 + 0.11, (hx0 + hx1) / 2 + 0.04, COURT + 2.8, hz1 + 0.16, BRONZE_DARK, { faces: 'S' });

  // --- the godswood: a few oaks in the north-east of the court, round a great old one ---
  const gw: R4 = { x0: gx + 2.4, z0: RK_IN.z0 + 0.05, x1: RK_IN.x1 - 0.05, z1: MOAT.z0 - 0.1 };
  area(k, rect(gw.x0, gw.z0, gw.x1, gw.z1), 0x6f9a52, COURT + 0.04);
  k.tree((gw.x0 + gw.x1) / 2, (gw.z0 + gw.z1) / 2, 1.3, false, COURT);
  k.tree(gw.x0 + 0.7, gw.z0 + 0.6, 0.75, false, COURT);
  k.tree(gw.x1 - 0.6, gw.z1 - 0.5, 0.7, false, COURT);

  // --- the serpentine steps: from a postern in the west curtain down the hill towards the river ---
  const pz = DRUM.sw.z - DRUM_R - 0.6, px = DRUM.sw.x - h;
  doorway(b, 'z', pz, px, -1, COURT, 0.9, 1.8, DOOR, 0xd6a08a, 0.3);
  const xs = [px - 0.7, px - 1.9, px - 3.1, px - 4.2], zN = pz - 2.8, zS = pz + 0.2;
  const ys = [COURT - 0.05, 6.0, 3.9, 1.7, 0.1];
  const STEP = 0xd3bfae;
  b.box(px - 1.3, ys[0] - 3, pz - 0.6, px, ys[0], pz + 0.6, STEP, { top: STEP });
  xs.forEach((sx, i) => {
    const north = i % 2 === 0, from = north ? zS + 0.1 : zN, to = north ? zN : zS + 0.1;
    const y1 = ys[i], y2 = i === 3 ? 0.1 : ys[i + 1];
    slab(b, [sx, y1, from], [sx, y2, to], 0.55, y1 + 0.3, STEP);
    if (i < 3) b.box(xs[i + 1] - 0.6, 0, to - 0.6, sx + 0.6, y2, to + 0.6, STEP, { top: STEP });
  });

  // --- life in the court, and its lights ---
  const r = rng(518);
  for (let i = 0; i < 6; i++) k.person(MOAT.x0 + r() * (RK_IN.x1 - MOAT.x0), RK_IN.z0 + 0.4 + r() * 1.2, COURT);
  for (let i = 0; i < 3; i++) k.person(hx0 + 0.4 + r() * 2, hz1 + 0.5 + r() * 1.2, COURT);
  for (const x of [DRUM.sw.x + 4, DRUM.se.x - 4]) k.person(x, DRUM.sw.z, top);
  for (const z of [DRUM.ne.z + 4, DRUM.se.z - 4]) k.person(DRUM.ne.x, z, top);
  brazier(k, hx1 - 0.5, hz1 + 1.2, COURT);
  brazier(k, MOAT.x1 + 0.6, MOAT.z0 + 1.2, COURT);
  k.lights.push({ x: (RK.x0 + RK.x1) / 2, z: (RK.z0 + RK.z1) / 2 + 3, r: 14, color: '#ffcf8a', k: 0.55 });
  k.lights.push({ x: (RK.x0 + RK.x1) / 2 + 2, z: RK.z1 + 3, r: 12, color: '#ffcf8a', k: 0.45 });
}

/** Maegor's Holdfast: a square castle inside the castle, behind its dry moat, with a drawbridge. */
function maegorsHoldfast(k: Build, l: Lot): void {
  const b = k.b, R = STONE.red, RS = STONE.redShade;
  const body = 23.8, turret = l.top - 1.8; // 7 and 8 storeys of LOOPS_CLOSE, and merlons to 28
  b.box(l.x0, FLOOR, l.z0, l.x1, body, l.z1, R, { win: LOOPS_CLOSE, seed: 0.73, top: RS });
  // merlons round its roof
  for (const [a, c, along] of [[l.z0, l.z0 + 0.4, 'x'], [l.z1 - 0.4, l.z1, 'x'], [l.x0, l.x0 + 0.4, 'z'], [l.x1 - 0.4, l.x1, 'z']] as [number, number, string][]) {
    const s0 = along === 'x' ? l.x0 + 1.9 : l.z0 + 1.9, s1 = along === 'x' ? l.x1 - 1.9 : l.z1 - 1.9, n = Math.max(1, Math.round((s1 - s0) / 1.6)), seg = (s1 - s0) / n;
    for (let i = 0; i < n; i++) {
      const p = s0 + seg * (i + 0.22), q = p + seg * 0.56;
      along === 'x' ? b.box(p, body, a, q, body + 0.8, c, R, { top: RS }) : b.box(a, body, p, c, body + 0.8, q, R, { top: RS });
    }
  }
  // a roof of slate over its hall in the middle
  hip(b, l.x0 + 1.9, l.z0 + 1.9, l.x1 - 1.9, l.z1 - 1.9, body + 0.02, 2.3, ROOF.slate, 0.1);
  // four square turrets at its corners
  const t = 1.0;
  for (const [x, z] of [[l.x0, l.z0], [l.x1 - 2 * t, l.z0], [l.x0, l.z1 - 2 * t], [l.x1 - 2 * t, l.z1 - 2 * t]]) {
    sqTower(b, { x0: x - 0.15, z0: z - 0.15, x1: x + 2 * t + 0.15, z1: z + 2 * t + 0.15 }, body - 0.4, turret, R, RS, { ...LOOPS_CLOSE, storey: turret / 8 });
  }
  banner(b, l.x1 - t, l.z1 - t, turret, 'baratheon', 3.8);
  banner(b, l.x0 + t, l.z1 - t, turret, 'lannister', 3.8);
  // the drawbridge over the moat to its door on the east
  const dz = (l.z0 + l.z1) / 2 - 1.5;
  doorway(b, 'z', dz, l.x1, 1, COURT, 1.1, 2.3, DOOR, RS, 0.5);
  b.box(l.x1, COURT - 0.12, dz - 0.65, MOAT.x1 + 0.15, COURT + 0.06, dz + 0.65, TIMBER, { faces: 'NESWTB', top: 0x7a5e44 });
  for (const s of [-0.55, 0.55]) b.beam([l.x1 + 0.05, COURT + 2.4, dz + s], [MOAT.x1 + 0.1, COURT + 0.1, dz + s], 0.04, 0.04, 0xb4b8bd);
  figure(b, MOAT.x1 + 0.6, dz - 0.9, COURT, GOLD_CLOAK);
  figure(b, MOAT.x1 + 0.6, dz + 0.9, COURT, { coat: 0xf2efe8, legs: 0xd8d8d8, hat: 0xd5d8dc, hatH: 0.34 });
}

/** The Tower of the Hand: a tall square tower in the east curtain, over the bay. */
function towerOfTheHand(k: Build, l: Lot): void {
  const b = k.b, cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, half = Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2 - 0.1, top = l.top - 0.4;
  b.box(cx - half, FLOOR, cz - half, cx + half, top, cz + half, STONE.red, { win: { ...LOOPS_CLOSE, storey: top / 9 }, seed: 0.57, faces: 'NESW' });
  b.box(cx - half - 0.2, top - 0.5, cz - half - 0.2, cx + half + 0.2, top, cz + half + 0.2, STONE.redShade, { faces: 'NESWTB' });
  lathe(b, cx, cz, [[(half + 0.3) * Math.SQRT2, top], [half * 0.9, top + 1.3], [0.05, top + 2.6]], 4, ROOF.slate);
  b.cyl(cx, cz, top + 2.5, top + 3.4, 0.05, 0.05, 4, GILT, { cap: false });
  k.lights.push({ x: cx + 3, z: cz, r: 9, color: '#ffcf8a', k: 0.4 });
}

// ---------------------------------------------------------------------------
// The Great Sept of Baelor
// ---------------------------------------------------------------------------

function sept(k: Build, l: Lot): void {
  const b = k.b, cx = SC.x, cz = SC.z, y = SEPT_Y;
  // seven sides, one of them looking south down the steps
  const poly = (r: number, phase = Math.PI / 2 + Math.PI / 7): XZ[] => Array.from({ length: 7 }, (_, i): XZ => [cx + Math.cos(phase + (i * 2 * Math.PI) / 7) * r, cz + Math.sin(phase + (i * 2 * Math.PI) / 7) * r]);
  const plinth = y + 0.3, wallTop = 15.6, cornice = 16.2, drumTop = 18.8;
  prism(b, poly(SEPT_R + 0.9), y - 1, plinth, MARBLE_SHADE, { top: MARBLE });
  prism(b, poly(SEPT_R), plinth, wallTop, MARBLE, { win: { cell: 1.5, storey: 5.2, lit: 0.5, kind: 6 }, seed: 0.21, top: false });
  prism(b, poly(SEPT_R + 0.25), wallTop, cornice, MARBLE_SHADE, { top: MARBLE });
  // the dome: a drum, then bands of gold and glass, then a lantern of crystal
  b.cyl(cx, cz, cornice, drumTop, 3.9, 3.9, 14, MARBLE, { win: { cell: 1.0, storey: drumTop / 4, lit: 0.6, kind: 6 }, seed: 0.4, cap: false });
  const rings: [number, number][] = [[4.0, drumTop], [3.9, 20.4], [3.45, 22.5], [2.65, 24.3], [1.55, 25.7], [0.62, 26.4]];
  for (let i = 0; i + 1 < rings.length; i++) {
    const glass = i % 2 === 1;
    b.cyl(cx, cz, rings[i][1], rings[i + 1][1], rings[i][0], rings[i + 1][0], 14, glass ? GLASS : GILT, { cap: i === rings.length - 2 ? GILT : false, win: glass ? interior(0.7) : undefined });
  }
  b.cyl(cx, cz, 26.4, 28.4, 0.6, 0.6, 8, CRYSTAL, { win: interior(0.9), cap: false });
  b.cyl(cx, cz, 28.4, 29.8, 0.78, 0.06, 8, GILT, { cap: false });
  b.cyl(cx, cz, 29.8, 31.0, 0.14, 0.03, 4, CRYSTAL, { cap: false });
  // seven slender towers of crystal, one at each corner, each with its bell
  const TWIN_C: WinSpec = { cell: 1.0, storey: 31 / 10, lit: 0.55, kind: 6 };
  poly(SEPT_R + 0.45).forEach(([x, z], i) => {
    const r = 0.5;
    b.cyl(x, z, plinth, 31, r, r * 0.85, 6, CRYSTAL, { win: TWIN_C, seed: i * 0.17, cap: CRYSTAL });
    for (let j = 0; j < 6; j += 2) {
      const a = Math.PI / 6 + (j * Math.PI) / 3;
      b.beam([x + Math.cos(a) * r * 0.75, 31, z + Math.sin(a) * r * 0.75], [x + Math.cos(a) * r * 0.75, 33.2, z + Math.sin(a) * r * 0.75], 0.07, 0.07, CRYSTAL);
    }
    lathe(b, x, z, [[0.06, 32.9], [0.3, 32.2], [0.32, 31.7]], 6, GILT);
    b.cyl(x, z, 33.2, 33.6, r * 0.85 + 0.1, r * 0.85 + 0.1, 6, CRYSTAL, { cap: false });
    b.cyl(x, z, 33.6, 36.6, r * 0.85 + 0.1, 0.12, 6, CRYSTAL, { cap: false });
    b.cyl(x, z, 36.6, 37.8, 0.12, 0.02, 4, GILT, { cap: false });
  });
  // the great doors, and the round window over them
  const fz = cz + SEPT_R * Math.cos(Math.PI / 7);
  doorway(b, 'x', cx, fz, 1, plinth, 1.9, 4.0, 0x6a4a2a, GILT, 0.35);
  b.quad([cx - 1.15, 11.5, fz + 0.06], [cx + 1.15, 11.5, fz + 0.06], [cx + 1.15, 13.8, fz + 0.06], [cx - 1.15, 13.8, fz + 0.06], [0, 0, 1], 0x3a4a5a, { win: interior(0.8) });

  // the wide flight of steps down to the plaza
  const s0z = cz + (SEPT_R + 0.9) * Math.cos(Math.PI / 7), s1z = PLAZA.z0 + 0.05;
  slab(b, [cx, plinth, s0z - 0.1], [cx, 0.12, s1z], 2.1, plinth + 0.2, MARBLE, { under: MARBLE_SHADE });
  const onStep = (t: number): [number, number] => [s0z + (s1z - s0z) * t, plinth + (0.12 - plinth) * t];
  for (const [u, t] of [[-1.2, 0.3], [0.9, 0.55], [-0.4, 0.8]]) {
    const [z, sy] = onStep(t);
    figure(b, cx + u, z, sy - 0.05, SEPTON);
  }
  for (const [u, t] of [[1.6, 0.2], [-1.7, 0.45], [1.5, 0.7], [-1.6, 0.9]]) {
    const [z, sy] = onStep(t);
    if (t > 0.6) figure(b, cx + u, z, sy - 0.05, BEGGAR);
    else k.person(cx + u, z, sy);
  }
  // a few trees on the terrace round it
  for (const [dx, dz] of [[-5.3, -3.5], [5.2, -3.8], [-5.6, 2.6]]) k.tree(cx + dx, cz + dz, 0.75, true, heightAt(cx + dx, cz + dz));
  k.lights.push({ x: cx, z: cz + 6, r: 11, color: '#ffe2ae', k: 0.55 }, { x: cx + 5, z: cz, r: 9, color: '#ffe2ae', k: 0.4 });
  void l;
}

/** The white plaza before the Sept's steps, and the square of the fish market beside it. */
const PLAZA: R4 = { x0: SEPT.x0 - 0.4, z0: SEPT.z1 + 3.8, x1: SEPT.x1 - 1.4, z1: IN.z1 - 0.15 };
const MARKET: R4 = { x0: PLAZA.x1 + 0.3, z0: PLAZA.z0, x1: RK.x0 - 3.8, z1: IN.z1 - 0.15 };

function plazas(k: Build): void {
  const b = k.b;
  area(k, rect(PLAZA.x0, PLAZA.z0, PLAZA.x1, PLAZA.z1), PAVING, 0.08);
  area(k, rect(MARKET.x0, MARKET.z0, MARKET.x1, MARKET.z1), 0xbdb3a2, 0.08);
  // the statue of a robed figure on its plinth
  const sx = SC.x - 0.3, sz = (PLAZA.z0 + PLAZA.z1) / 2 + 0.3;
  b.box(sx - 0.75, 0.08, sz - 0.75, sx + 0.75, 1.7, sz + 0.75, MARBLE_SHADE, { top: MARBLE });
  b.cyl(sx, sz, 1.7, 3.7, 0.62, 0.34, 7, 0xdcd6c8, { cap: false });
  b.cyl(sx, sz, 3.7, 4.0, 0.34, 0.3, 7, 0xdcd6c8, { cap: 0xdcd6c8 });
  b.cyl(sx, sz, 4.0, 4.5, 0.24, 0.2, 6, 0xdcd6c8, { cap: 0xdcd6c8 });
  b.beam([sx - 0.3, 3.4, sz + 0.2], [sx, 3.0, sz + 0.55], 0.12, 0.1, 0xdcd6c8);
  b.beam([sx + 0.3, 3.4, sz + 0.2], [sx, 3.0, sz + 0.55], 0.12, 0.1, 0xdcd6c8);
  for (const [x, z] of [[PLAZA.x0 + 0.8, PLAZA.z1 - 0.8], [PLAZA.x1 - 0.8, PLAZA.z1 - 0.8]]) brazier(k, x, z, 0.08);
  figure(b, PLAZA.x0 + 2, PLAZA.z1 - 1.2, 0.08, SEPTON);
  // the fish market: stalls of fish with awnings, and its baskets
  const r = rng(907);
  for (let i = 0; i < 3; i++) {
    const z0 = MARKET.z0 + 0.4 + i * 1.5;
    stall(b, MARKET.x0 + 0.3, z0, MARKET.x0 + 1.4, z0 + 1.2, [0xb84a3a, 0x3f6ea8, 0xd9b24a][i], 0.08, 'E');
  }
  for (let i = 0; i < 4; i++) basket(b, MARKET.x0 + 2 + r() * 1.5, MARKET.z0 + 0.5 + r() * 3.5, 0.08);
  for (let i = 0; i < 14; i++) k.person(PLAZA.x0 + 0.6 + r() * (MARKET.x1 - PLAZA.x0 - 1.2), PLAZA.z0 + 0.4 + r() * (PLAZA.z1 - PLAZA.z0 - 0.8), 0.08);
  k.lights.push({ x: (MARKET.x0 + MARKET.x1) / 2, z: (MARKET.z0 + MARKET.z1) / 2, r: 9, color: '#ffcf8a', k: 0.45 });
}

/** A market stall: a counter with fish on it, two posts at its back, and a sloping awning with its underside. */
function stall(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, cloth: number, y: number, front: 'E' | 'W' | 'S' | 'N'): void {
  b.box(x0, y, z0, x1, y + 0.85, z1, TIMBER, { top: 0x8a6a48 });
  for (const [fx, fz] of [[x0 + 0.25, z0 + 0.3], [x1 - 0.25, z1 - 0.3]]) b.box(fx - 0.15, y + 0.86, fz - 0.12, fx + 0.15, y + 0.98, fz + 0.12, 0xb9c4c9);
  const back = front === 'E' ? [x0, (z0 + z1) / 2] : front === 'W' ? [x1, (z0 + z1) / 2] : front === 'S' ? [(x0 + x1) / 2, z0] : [(x0 + x1) / 2, z1];
  const out = front === 'E' ? [1, 0] : front === 'W' ? [-1, 0] : front === 'S' ? [0, 1] : [0, -1];
  const along = out[0] !== 0 ? [0, 1] : [1, 0], half = out[0] !== 0 ? (z1 - z0) / 2 : (x1 - x0) / 2;
  for (const s of [-1, 1]) b.beam([back[0] + along[0] * s * (half - 0.1), y, back[1] + along[1] * s * (half - 0.1)], [back[0] + along[0] * s * (half - 0.1), y + 2.3, back[1] + along[1] * s * (half - 0.1)], 0.07, 0.07, TIMBER_DARK);
  const depth = out[0] !== 0 ? x1 - x0 : z1 - z0;
  slab(b, [back[0], y + 2.3, back[1]], [back[0] + out[0] * (depth + 0.3), y + 1.8, back[1] + out[1] * (depth + 0.3)], half + 0.1, 0.06, cloth, { under: 0xe8dcc0 });
}

function basket(b: GeoBuilder, x: number, z: number, y: number): void {
  b.cyl(x, z, y, y + 0.45, 0.32, 0.38, 6, 0x9a7a4a, { cap: 0xa9b6bb });
}

// ---------------------------------------------------------------------------
// The Dragonpit
// ---------------------------------------------------------------------------

/** The height each of its sixteen pieces of wall still stands to; the first looks towards the view, and has the doors. */
const PIT_TOPS = [16.5, 15.2, 17.6, 13.0, 10.2, 12.4, 16.8, 18.6, 14.6, 11.2, 13.6, 17.2, 18.2, 15.4, 12.2, 14.8];
/** Which pieces carry a broken rib of the fallen dome, and how far each still reaches. */
const RIBS: [number, number][] = [[2, 1], [6, 0.7], [7, 1], [11, 0.85], [12, 1], [15, 0.5]];

function dragonpit(k: Build, l: Lot): void {
  const b = k.b, cx = PC.x, cz = PC.z, R = PIT_R, Ri = R - 1.0, y0 = PIT_Y - 0.7, n = PIT_TOPS.length;
  const STONE_LOW = 0x7a6f67, SOOT = 0x4b4441, SOOT_IN = 0x3c3634, TOP = 0x5d5652;
  const towards = Math.atan2(0.743, 0.669), phase = towards - Math.PI / n;
  const ang = (i: number): number => phase + (i * 2 * Math.PI) / n;
  const P = (r: number, a: number, y: number): V3 => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
  const band = 8.4;
  for (let i = 0; i < n; i++) {
    const a0 = ang(i), a1 = ang(i + 1), am = (a0 + a1) / 2, top = PIT_TOPS[i];
    const nOut: V3 = [Math.cos(am), 0, Math.sin(am)], nIn: V3 = [-nOut[0], 0, -nOut[2]];
    if (i === 0) {
      pitDoors(k, a0, a1, top, R, Ri, y0, band);
    } else {
      b.quad(P(R, a0, y0), P(R, a1, y0), P(R, a1, band), P(R, a0, band), nOut, STONE_LOW);
      b.quad(P(R, a0, band), P(R, a1, band), P(R, a1, top), P(R, a0, top), nOut, SOOT);
      b.quad(P(Ri, a1, y0), P(Ri, a0, y0), P(Ri, a0, top), P(Ri, a1, top), nIn, SOOT_IN);
      // the ring of arches round its outside, dark and empty, in one tier or two
      const mid = P(R + 0.03, am, 0), t: V3 = [-Math.sin(am), 0, Math.cos(am)], w = R * Math.sin(Math.PI / n) * 0.42;
      const arch = (ya: number, yb: number): void => {
        const q = (s: number, yy: number): V3 => [mid[0] + t[0] * w * s, yy, mid[2] + t[2] * w * s];
        b.quad(q(-1, ya), q(1, ya), q(1, yb), q(-1, yb), nOut, DARK);
        face3(b, q(-1, yb), q(1, yb), [mid[0], yb + w * 1.1, mid[2]], nOut, DARK);
      };
      arch(PIT_Y + 1.0, 7.6);
      if (top > 12.6) arch(9.4, 11.4);
    }
    b.quad(P(Ri, a0, top), P(R, a0, top), P(R, a1, top), P(Ri, a1, top), [0, 1, 0], TOP);
    // where it breaks off higher or lower than the next piece, the broken end shows
    const next = PIT_TOPS[(i + 1) % n];
    if (next !== top) {
      const lo = Math.min(top, next), hi = Math.max(top, next), tn: V3 = [-Math.sin(a1), 0, Math.cos(a1)], s = next < top ? 1 : -1;
      b.quad(P(Ri, a1, lo), P(R, a1, lo), P(R, a1, hi), P(Ri, a1, hi), [tn[0] * s, 0, tn[2] * s], TOP);
    }
  }
  // the ribs of the fallen dome, standing against the sky
  for (const [i, reach] of RIBS) {
    const a = ang(i) + 0.05, top = PIT_TOPS[i] - 0.1, peak = l.top - 0.4;
    const pts: V3[] = [P(R - 0.5, a, top), P(R * 0.8, a, top + (peak - top) * 0.6), P(R * 0.62, a, peak - 0.3), P(R * 0.46, a, peak - 0.6)];
    const keep = Math.max(2, Math.round(pts.length * reach));
    b.sweep(pts.slice(0, keep), pts.slice(0, keep).map((_, j) => 0.34 - j * 0.05), SOOT);
  }
  // its floor: bare sand, empty, open to the sky
  const ring = Array.from({ length: n }, (_, i): [number, number] => [cx + Math.cos(ang(i)) * (Ri + 0.1), cz + Math.sin(ang(i)) * (Ri + 0.1)]);
  flat(b, ring, PIT_Y + 0.06, 0xd6c39c);
  // rubble from the dome at the foot of its walls, inside and out, and a piece of rib that fell
  const r = rng(2203);
  for (let i = 0; i < 9; i++) {
    const a = ang(3 + i * 1.4 + r() * 0.5), inner = i % 3 !== 0, rr = inner ? Ri - 0.5 - r() * 0.5 : R + 0.6 + r() * 0.8;
    const s = 0.25 + r() * 0.35, [x, , z] = P(rr, a, 0), yy = inner ? PIT_Y + 0.06 : heightAt(x, z);
    b.obox(x, yy + s * 0.5, z, s * 1.4, s * 0.6, s, a + r(), i % 2 ? 0x6b625c : 0x58504b);
  }
  slab(b, P(Ri - 0.2, ang(9.5), 9.6), P(Ri - 2.4, ang(9.2), PIT_Y + 0.3), 0.35, 0.5, SOOT);
  // weeds on the tops of its walls
  for (const i of [3, 8, 13]) {
    const [x, , z] = P(R - 0.5, ang(i + 0.5), 0);
    b.obox(x, PIT_TOPS[i] + 0.15, z, 0.4, 0.15, 0.25, ang(i), 0x6f8f4a);
  }
  const [lx, , lz] = P(R + 2.2, towards, 0);
  k.lights.push({ x: lx, z: lz, r: 8, color: '#ffcf8a', k: 0.35 });
}

/** The piece of the Dragonpit's wall with its doors: a great opening, and the two bronze leaves, one hanging askew. */
function pitDoors(k: Build, a0: number, a1: number, top: number, R: number, Ri: number, y0: number, band: number): void {
  const b = k.b, cx = PC.x, cz = PC.z, am = (a0 + a1) / 2;
  const P = (r: number, a: number, y: number): V3 => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
  const nOut: V3 = [Math.cos(am), 0, Math.sin(am)], nIn: V3 = [-nOut[0], 0, -nOut[2]], t: V3 = [-Math.sin(am), 0, Math.cos(am)];
  const f0 = 0.12, f1 = 0.88, oy0 = PIT_Y + 0.06, oy1 = PIT_Y + 5.6; // the opening's sides, as parts of the piece, and its height
  const lerp = (r: number, f: number, y: number): V3 => {
    const p = P(r, a0, y), q = P(r, a1, y);
    return [p[0] + (q[0] - p[0]) * f, y, p[2] + (q[2] - p[2]) * f];
  };
  const SOOT = 0x4b4441;
  for (const [r, n, col] of [[R, nOut, SOOT], [Ri, nIn, 0x3c3634]] as [number, V3, number][]) {
    b.quad(lerp(r, 0, y0), lerp(r, f0, y0), lerp(r, f0, top), lerp(r, 0, top), n, col);
    b.quad(lerp(r, f1, y0), lerp(r, 1, y0), lerp(r, 1, top), lerp(r, f1, top), n, col);
    b.quad(lerp(r, f0, oy1), lerp(r, f1, oy1), lerp(r, f1, top), lerp(r, f0, top), n, col);
  }
  // the opening's two sides, its soffit and its threshold
  b.quad(lerp(Ri, f0, y0), lerp(R, f0, y0), lerp(R, f0, oy1), lerp(Ri, f0, oy1), t, 0x5a524d);
  b.quad(lerp(R, f1, y0), lerp(Ri, f1, y0), lerp(Ri, f1, oy1), lerp(R, f1, oy1), [-t[0], 0, -t[2]], 0x5a524d);
  b.quad(lerp(R, f0, oy1), lerp(R, f1, oy1), lerp(Ri, f1, oy1), lerp(Ri, f0, oy1), [0, -1, 0], 0x3c3634);
  b.quad(lerp(R, f0, oy0), lerp(R, f1, oy0), lerp(Ri, f1, oy0), lerp(Ri, f0, oy0), [0, 1, 0], 0x8a7d70);
  void band;
  // the leaves: one swung out, one hanging from a single hinge, its foot in the sand
  const hingeA = lerp(R + 0.05, f0, 0), hingeB = lerp(R + 0.05, f1, 0), w = (f1 - f0) * 2 * R * Math.sin(Math.PI / PIT_TOPS.length) * 0.5;
  const swing = (h: V3, dir: number, ang: number): V3 => {
    const ca = Math.cos(ang), sa = Math.sin(ang), dx = t[0] * dir, dz = t[2] * dir;
    return [h[0] + (dx * ca + nOut[0] * sa) * w, 0, h[2] + (dz * ca + nOut[2] * sa) * w];
  };
  const A = swing(hingeA, 1, 0.9), B = swing(hingeB, -1, 0.35);
  slab(b, [hingeA[0], oy1 - 0.2, hingeA[2]], [A[0], oy1 - 0.35, A[2]], 0.08, oy1 - 0.2 - oy0, BRONZE, { under: BRONZE_DARK });
  slab(b, [hingeB[0], oy1 - 0.3, hingeB[2]], [B[0] + nOut[0] * 0.3, oy1 - 1.4, B[2] + nOut[2] * 0.3], 0.08, oy1 - 0.3 - oy0, BRONZE_DARK, { under: BRONZE });
  void k;
}

// ---------------------------------------------------------------------------
// The houses
// ---------------------------------------------------------------------------

const ST = HOUSE_WIN.storey;
const WALLS_LOW = [DAUB, PLASTER, 0xc9b89a, 0xb9a88c, 0xd6c6a6, 0xbfae96];
const WALLS_HIGH = [PLASTER, 0xe9dec4, 0xd9c49c, 0xcfd2c4, 0xe3c9b1, 0xd8cbb0, 0xc9b28e];
const ROOFS = [ROOF.tile, ROOF.slate, ROOF.thatch, ROOF.shingle, 0xb5683f, 0x8a3b2e, 0x7c8a5c, 0x9a6a4a, 0x5d6b7a, 0xc07a4a];

interface Plot extends R4 { cap: number; front: 'N' | 'S' }

/** Rows of plots, two back to back between lanes, filling a block. */
function plotsIn(B: R4, cap: number, seed: number, avoid: R4[], out: Plot[]): void {
  const r = rng(seed);
  let z = B.z0;
  while (z < B.z1 - 2.3) {
    for (let row = 0; row < 2; row++) {
      const d = 2.3 + r() * 0.8;
      if (z + d > B.z1) break;
      let x = B.x0 + r() * 0.4;
      while (x < B.x1 - 2.0) {
        const w = Math.min(2.1 + r() * 1.5, B.x1 - x);
        if (w < 1.9) break;
        const p: Plot = { x0: x, z0: z + (row === 0 ? r() * 0.3 : 0), x1: x + w, z1: z + d - (row === 1 ? r() * 0.3 : 0), cap, front: row === 0 ? 'N' : 'S' };
        if (!avoid.some((a) => overlaps(a, p))) out.push(p);
        x += w + 0.15 + (r() < 0.14 ? 1.1 : 0);
      }
      z += d + (row === 0 ? 0.14 : 0);
    }
    z += 1.5 + r() * 0.6;
  }
}

/** A town house: a ground storey, often a timber upper storey jutting over the lane, a steep roof, and a chimney. */
function house(k: Build, p: Plot, r: () => number, smoke: [number, number, number][]): boolean {
  const b = k.b;
  const hs = [heightAt(p.x0, p.z0), heightAt(p.x1, p.z0), heightAt(p.x0, p.z1), heightAt(p.x1, p.z1), heightAt((p.x0 + p.x1) / 2, (p.z0 + p.z1) / 2)];
  const lo = Math.min(...hs), hi = Math.max(...hs);
  const base = Math.floor(lo / ST) * ST;
  let t1 = base + ST;
  while (t1 < hi + 1.6) t1 += ST;
  let rise = 1.0 + r() * 0.8, two = r() < 0.7;
  if (two && t1 + ST + rise > p.cap) two = false;
  if (t1 + rise > p.cap) rise = p.cap - t1;
  if (rise < 0.7) return false;
  const t2 = two ? t1 + ST : t1;
  const seed = p.x0 * 0.31 + p.z0 * 0.17;
  const low = WALLS_LOW[Math.floor(r() * WALLS_LOW.length)], high = WALLS_HIGH[Math.floor(r() * WALLS_HIGH.length)], roof = ROOFS[Math.floor(r() * ROOFS.length)];
  b.box(p.x0, base, p.z0, p.x1, t1, p.z1, two ? low : high, { win: HOUSE_WIN, seed, faces: 'NESW' });
  let u: R4 = p;
  if (two) {
    const j = 0.35;
    u = { x0: p.x0, z0: p.z0 - (p.front === 'N' ? j : 0), x1: p.x1, z1: p.z1 + (p.front === 'S' ? j : 0) };
    b.box(u.x0 - 0.03, t1 - 0.16, u.z0 - 0.03, u.x1 + 0.03, t1 + 0.02, u.z1 + 0.03, TIMBER, { faces: 'NESWB' });
    b.box(u.x0, t1 + 0.02, u.z0, u.x1, t2, u.z1, high, { win: HOUSE_WIN, seed: seed + 0.5, faces: 'NESW' });
    // the timbers of the upper storey: a post at each corner of its front
    const fz = p.front === 'N' ? u.z0 - 0.04 : u.z1 + 0.04;
    for (const x of [u.x0 + 0.05, u.x1 - 0.05]) b.beam([x, t1 + 0.02, fz], [x, t2, fz], 0.06, 0.06, TIMBER_DARK);
  }
  const along = u.x1 - u.x0 >= u.z1 - u.z0 - 0.3 || r() < 0.3 ? 'x' : 'z';
  gable(b, u.x0, u.z0, u.x1, u.z1, t2, rise, roof, high, along, 0.2);
  if (r() < 0.45) {
    const cxh = along === 'x' ? u.x1 - 0.55 : (u.x0 + u.x1) / 2 + 0.3, czh = along === 'x' ? (u.z0 + u.z1) / 2 + 0.3 : u.z1 - 0.55;
    b.box(cxh - 0.22, t2, czh - 0.22, cxh + 0.22, Math.min(t2 + rise + 0.5, p.cap), czh + 0.22, 0x8a7766, { top: 0x4a4440 });
    if (smoke.length < 4 && r() < 0.25) smoke.push([cxh, t2 + rise + 0.6, czh]);
  }
  return true;
}

/** A guild's tower: square, with a pointed roof of slate. */
function guildTower(b: GeoBuilder, x: number, z: number, y0: number, top: number): void {
  const h = 0.85;
  b.box(x - h, y0, z - h, x + h, top, z + h, 0xc9b89a, { win: { ...LOOPS_CLOSE, storey: top / Math.round(top / 3.4) }, seed: x * 0.2, faces: 'NESW' });
  b.box(x - h - 0.15, top - 0.35, z - h - 0.15, x + h + 0.15, top, z + h + 0.15, 0xb3a286, { faces: 'NESWB' });
  lathe(b, x, z, [[(h + 0.2) * Math.SQRT2, top], [0.05, top + 2.4]], 4, ROOF.slate);
  b.cyl(x, z, top + 2.35, top + 3.0, 0.04, 0.04, 4, GILT, { cap: false });
}

/** What the houses keep out of: everything else that stands inside the walls, and the street and the squares. */
function avoidList(): R4[] {
  const pad = (r: R4, m: number): R4 => ({ x0: r.x0 - m, z0: r.z0 - m, x1: r.x1 + m, z1: r.z1 + m });
  return [
    pad(SEPT, 0.3), pad(RK, 0.3), { x0: PC.x - PIT_R - 0.6, z0: PC.z - PIT_R - 0.6, x1: PC.x + PIT_R + 0.6, z1: PC.z + PIT_R + 0.6 },
    { x0: SEPT.x0 - 1, z0: SEPT.z1, x1: SEPT.x1 + 1, z1: IN.z1 }, // the steps, the plaza, the market
    { x0: MARKET.x0, z0: MARKET.z0 - 3, x1: RK.x0, z1: IN.z1 }, // the serpentine steps
    { x0: HW.x1 + 0.6, z0: IN.z0, x1: HM.x0 - 0.2, z1: SEPT.z1 }, // the straight street between the western hills
    { x0: (DRUM.nw.x + DRUM.ne.x) / 2 - 2.5, z0: HM.z1 - 0.2, x1: (DRUM.nw.x + DRUM.ne.x) / 2 + 2.5, z1: RK.z0 }, // the way up to the Red Keep's gate
    { x0: BLIND.gods.at - 4, z0: IN.z0, x1: BLIND.gods.at + 4, z1: IN.z0 + 1.0 },
    { x0: IN.x0, z0: BLIND.old.at - 4, x1: IN.x0 + 1.0, z1: BLIND.old.at + 4 },
    { x0: IN.x1 - 1.0, z0: BLIND.king.at - 4, x1: IN.x1, z1: BLIND.king.at + 4 },
    pad(CORNER.nw, 0.2), pad(CORNER.ne, 0.2), pad(CORNER.sw, 0.2), pad(CORNER.se, 0.2),
  ];
}

/** Where the houses outside the two blocks of the plan go, each with its height limit. */
function blocks(): [R4, number][] {
  const q = 0.5;
  return [
    [{ x0: HM.x0, z0: IN.z0 + q, x1: PC.x - PIT_R - 0.8, z1: HM.z0 - 0.2 }, 7], // under the north wall
    [{ x0: HM.x1 + 0.4, z0: HM.z0, x1: PC.x - PIT_R - 0.7, z1: PIT.z1 }, 7], // between the houses and the Dragonpit
    [{ x0: RK.x0 - 0.3, z0: PIT.z1 + 0.4, x1: IN.x1 - q, z1: RK.z0 - 0.3 }, 7], // Flea Bottom, under Rhaenys's Hill, and under the Red Keep's north side
    [{ x0: RK.x1 + 0.4, z0: RK.z0 - 0.3, x1: IN.x1 - q, z1: IN.z1 - q }, 7], // Flea Bottom, east of the Red Keep
    [{ x0: HM.x0 + 0.2, z0: HM.z1 + 0.3, x1: RK.x0 - 0.3, z1: MARKET.z0 - 3.2 }, 7], // under the Red Keep's west side
  ];
}

const PLOTS: Plot[] = [];
const LOT_PLOTS: Record<string, Plot[]> = {};
(() => {
  const avoid = avoidList();
  for (const l of [HW, HM]) {
    const out: Plot[] = [];
    plotsIn({ x0: l.x0 + 0.1, z0: l.z0 + 0.1, x1: l.x1 - 0.1, z1: l.z1 - 0.1 }, l.top, l.x0 * 13 + 5, avoid, out);
    LOT_PLOTS[l.id] = out;
  }
  blocks().forEach(([B, cap], i) => plotsIn(B, cap, 300 + i * 17, [...avoid, HW, HM], PLOTS));
})();

function buildHouses(k: Build, plots: Plot[], seed: number, towers: number): void {
  const r = rng(seed), smoke: [number, number, number][] = [];
  // the guildhalls' towers stand on the largest plots
  const big = [...plots].sort((a, c) => (c.x1 - c.x0) * (c.z1 - c.z0) - (a.x1 - a.x0) * (a.z1 - a.z0)).slice(0, towers);
  for (const p of plots) {
    if (big.includes(p)) {
      const x = (p.x0 + p.x1) / 2, z = (p.z0 + p.z1) / 2, y0 = Math.floor(heightAt(x, z) / ST) * ST;
      const top = Math.min(p.cap + 0.8, 3 * 3.4) - 0.01;
      guildTower(k.b, x, z, y0, Math.max(y0 + 3.4, Math.floor(top / 3.4) * 3.4));
      continue;
    }
    house(k, p, r, smoke);
  }
  void smoke;
}

// ---------------------------------------------------------------------------
// The quays, the ships and the wharf
// ---------------------------------------------------------------------------

function bollard(b: GeoBuilder, x: number, z: number): void {
  b.cyl(x, z, 0, 0.6, 0.2, 0.17, 6, 0x4d4f52, { cap: 0x3a3b3e });
}
function barrel(b: GeoBuilder, x: number, z: number, y = 0): void {
  b.cyl(x, z, y, y + 0.8, 0.32, 0.32, 6, 0x7a5a3a, { cap: 0x5a4128 });
}
function crate(b: GeoBuilder, x: number, z: number, s = 0.75, y = 0): void {
  b.box(x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2, 0x9a7a52, { top: 0xa98a60 });
}

/**
 * A ship moored with its bow to the north: a hull that narrows below the
 * water, a deck, castles fore and aft, one mast with its sail furled on the
 * yard, and its stays. A galley is long and low, with its oars out.
 */
function ship(b: GeoBuilder, cx: number, cz: number, len: number, wid: number, hull: number, sail: number, galley = false): void {
  const deck = galley ? 0.4 : 0.75, keel = -1.3;
  const W = wid / 2, L = len / 2;
  const at = (u: number, v: number, y: number): V3 => [cx + v, y, cz - u];
  const plan: [number, number][] = galley
    ? [[-L, 0], [-L + 1.2, -W], [L - 2.5, -W], [L, 0], [L - 2.5, W], [-L + 1.2, W]]
    : [[-L, -W * 0.55], [-L + 0.5, -W], [L - 1.8, -W], [L, 0], [L - 1.8, W], [-L + 0.5, W], [-L, W * 0.55]];
  const m = plan.length;
  for (let i = 0; i < m; i++) {
    const [u0, v0] = plan[i], [u1, v1] = plan[(i + 1) % m];
    const p0 = at(u0, v0, deck), p1 = at(u1, v1, deck);
    let nx = p1[2] - p0[2], nz = -(p1[0] - p0[0]);
    const l = Math.hypot(nx, nz) || 1;
    nx /= l; nz /= l;
    // outwards is away from the middle
    if (nx * ((p0[0] + p1[0]) / 2 - cx) + nz * ((p0[2] + p1[2]) / 2 - cz) < 0) { nx = -nx; nz = -nz; }
    b.quad(at(u0 * 0.85, v0 * 0.55, keel), at(u1 * 0.85, v1 * 0.55, keel), p1, p0, [nx * 0.95, -0.3, nz * 0.95], hull);
  }
  flat(b, plan.map(([u, v]): [number, number] => [cx + v, cz - u]), deck, 0x9a7b55);
  const castle = (u0: number, u1: number, h: number): void => {
    const w = W - 0.2;
    b.box(cx - w, deck - 0.01, cz - u1, cx + w, deck + h, cz - u0, hull, { top: 0x8a6c4a });
  };
  if (!galley) {
    castle(-L + 0.3, -L + 2.4, 1.2);
    castle(L - 2.9, L - 1.5, 0.85);
  } else {
    castle(-L + 1.0, -L + 2.6, 0.7);
  }
  const mu = galley ? 0.5 : 0.3, top = galley ? 7.6 : 8.8, yard = top - 0.9;
  b.cyl(cx, cz - mu, deck, top, 0.15, 0.11, 6, TIMBER, { cap: false });
  b.beam([cx - W - 0.6, yard, cz - mu], [cx + W + 0.6, yard, cz - mu], 0.07, 0.07, TIMBER_DARK);
  b.beam([cx - W - 0.4, yard - 0.25, cz - mu], [cx + W + 0.4, yard - 0.25, cz - mu], 0.22, 0.22, sail);
  b.beam([cx, top - 0.2, cz - mu], [cx, deck + 0.2, cz - L + 0.3], 0.03, 0.03, 0xd2c6a4);
  b.beam([cx, top - 0.2, cz - mu], [cx, deck + 1.2, cz + L - 0.6], 0.03, 0.03, 0xd2c6a4);
  if (galley) {
    for (let i = 0; i < 6; i++) {
      const u = -L + 2.8 + i * ((len - 5.5) / 5);
      for (const s of [-1, 1]) b.beam([cx + s * W, deck + 0.05, cz - u], [cx + s * (W + 2.1), -0.85, cz - u - 0.4], 0.05, 0.05, 0x8a6a48);
    }
  }
}

function boat(b: GeoBuilder, x: number, z: number, yaw: number, color: number): void {
  b.obox(x, -0.75, z, 1.2, 0.3, 0.45, yaw, color, { top: 0x6b5236 });
}

function quays(k: Build): void {
  const b = k.b, r = rng(6113);
  const qx = KL.quayX + 4, edge = WL.x1 + 12; // the road's edge, and the east quay's edge at the water
  const qz = KL.quayZ + 4; // the river front road's edge
  // the east quay: a kerb at the water, bollards, barrels and crates, and the ships
  b.box(edge - 0.55, 0, LE.z0 + 3, edge - 0.02, 0.22, qz - 1, 0x9d9484, { top: 0xaaa191 });
  for (let z = LE.z0 + 5; z < qz - 4; z += 5.5) bollard(b, edge - 0.3, z + 0.1);
  for (const z of [DG.z1 + 9.45, 30.2, 31.0, 42.6]) barrel(b, qx + 0.85, z);
  for (const z of [29.5, 43.5, 44.4]) crate(b, qx + 0.8, z);
  // nets drying on a frame
  b.box(qx + 0.5, 0, 31.8, qx + 1.4, 1.1, 32.0, 0x6d6a5a, { faces: 'NESWT' });
  ship(b, edge + 3.0, 18, 9, 3.2, 0x5d4331, 0xe8dfc6);
  ship(b, edge + 3.2, 30.5, 9.5, 3.3, 0x4a3a2e, 0xb04838);
  ship(b, edge + 2.8, 44.5, 13, 2.6, 0x2f2b29, 0xe8dfc6, true);
  for (const [z, s] of [[14.5, 1], [21.5, 1], [26.5, 1], [34.5, 1]]) b.beam([edge - 0.3, 0.55, z], [edge + 1.5, 0.7 * s, z], 0.03, 0.03, 0xcfc3a0);
  slab(b, [edge - 0.4, 0.3, 30.5], [edge + 1.5, 0.8, 30.5], 0.4, 0.08, TIMBER);
  boat(b, edge + 7.2, 24.5, 0.4, 0x7a5a3a);
  boat(b, edge + 7.8, 37.5, -0.3, 0x3f5f7a);
  boat(b, 24.5, 58.4, 0.1, 0x7a5a3a);
  boat(b, 29.8, 60.3, -0.2, 0x8a4a3a);
  boat(b, 67, 58.6, 0.5, 0x5a6a4a);
  for (let i = 0; i < 9; i++) k.person(qx + 0.4 + r() * 1.2, LE.z0 + 4 + r() * 40);
  // the treadwheel crane at the corner of the quays, its jib over the water
  const kx = qx - 0.3, kz = qz - 0.8;
  b.box(kx - 1, 0, kz - 1, kx + 1, 0.3, kz + 1, TIMBER, { top: 0x8a6a48 });
  drum(b, [kx, 1.8, kz], 1.4, 0.4, 0x8a6a48, { cap: 0x6f5438 });
  for (const s of [-0.75, 0.75]) b.beam([kx + s, 0.3, kz], [kx + s * 0.4, 3.9, kz], 0.09, 0.09, TIMBER_DARK);
  b.beam([kx, 3.8, kz], [kx + 1.8, 6.0, kz + 2.9], 0.11, 0.08, TIMBER_DARK);
  b.beam([kx + 1.8, 6.0, kz + 2.9], [kx + 1.8, 2.3, kz + 2.9], 0.025, 0.025, 0xd2c6a4);
  crate(b, kx + 1.8, kz + 2.9, 0.7, 1.6);
  k.person(kx, kz, 1.0);
  fire(k, kx - 1.2, 2.2, kz - 1.2, 0.2, 9);
  // the river front: bollards and barrels east of the wharf
  for (let x = RG.x1 + 20; x < qx - 2; x += 4.5) bollard(b, x, KL.quayZ + 5.2);
  for (const x of [64.3, 65.0]) barrel(b, x, KL.quayZ + 4.9);
  // the wharf: paved, its middle kept clear for a hero, with stalls of fish at its two ends
  const wx0 = RG.x1 - 0.85, wx1 = 61.85, wz1 = 58.85;
  area(k, [[RG.x1 + 1.2, qz + 0.1], [wx1, qz + 0.1], [wx1, wz1], [wx0, wz1], [wx0, 56.4], [wx0 + 0.75, 55.5]], 0xb4aa98, 0.035);
  const mid = QUAY.x, clear = 6.2;
  stall(b, RG.x1 + 0.95, 56.2, mid - clear, 58.5, 0xb84a3a, 0.035, 'E');
  stall(b, mid + clear + 0.3, qz + 0.3, wx1 - 0.3, 55.9, 0x3f6ea8, 0.035, 'S');
  for (const [x, z] of [[mid + clear + 0.7, 57.4], [mid + clear + 1.5, 58.2], [mid + clear + 2.4, 57.6]]) basket(b, x, z, 0.035);
  for (const [x, z] of [[RG.x1 + 2.3, 55.2], [mid + clear + 1.0, 57.0], [mid + clear + 2.6, 56.9], [mid - clear - 0.2, 55.3]]) k.person(x, z, 0.035);
  k.lights.push({ x: mid, z: 56.5, r: 11, color: '#ffcf8a', k: 0.45 }, { x: qx + 1, z: 30, r: 11, color: '#ffcf8a', k: 0.4 });
  for (const x of [RG.x1 + 1.3, wx1 - 0.3]) {
    b.box(x - 0.08, 0.035, qz + 0.15, x + 0.08, 2.1, qz + 0.31, TIMBER_DARK);
    fire(k, x, 2.35, qz + 0.23, 0.2, 0);
  }
}

// ---------------------------------------------------------------------------
// Life in the lanes
// ---------------------------------------------------------------------------

function people(k: Build): void {
  const r = rng(8821), taken = [...PLOTS, ...Object.values(LOT_PLOTS).flat()], avoid = avoidList();
  let placed = 0;
  for (let i = 0; i < 600 && placed < 120; i++) {
    const x = IN.x0 + 0.6 + r() * (IN.x1 - IN.x0 - 1.2), z = IN.z0 + 0.6 + r() * (IN.z1 - IN.z0 - 1.2);
    if (taken.some((p) => inside(p, x, z, 0.45))) continue;
    if (avoid.slice(0, 3).some((a) => inside(a, x, z))) continue;
    if (inside(PLAZA, x, z) || inside(MARKET, x, z)) continue;
    k.person(x, z, heightAt(x, z));
    placed++;
  }
  // folk in the straight street, more than anywhere
  for (let i = 0; i < 14; i++) {
    const x = HW.x1 + 1.0 + r() * (HM.x0 - HW.x1 - 2.0), z = IN.z0 + 1 + r() * (SEPT.z1 - IN.z0 - 1);
    k.person(x, z, heightAt(x, z));
  }
  // a pot of stew over a fire in Flea Bottom, and folk round it with bowls
  const sx = PC.x - 2, sz = PIT.z1 + 2.4, sy = heightAt(sx, sz);
  k.b.cyl(sx, sz, sy, sy + 0.7, 0.55, 0.62, 8, 0x2e2c2c, { cap: 0x6a4a2a });
  fire(k, sx, sy + 0.25, sz, 0.3, 8);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    k.person(sx + Math.cos(a) * 1.2, sz + Math.sin(a) * 1.2, heightAt(sx + Math.cos(a) * 1.2, sz + Math.sin(a) * 1.2));
  }
  // a cart at a door, and a well
  const wx = (HW.x0 + HW.x1) / 2, wz = HW.z1 + 1.1, wy = heightAt(wx, wz);
  k.b.cyl(wx, wz, wy, wy + 0.8, 0.6, 0.6, 8, 0x9d9484, { cap: 0x2a3a48 });
  for (const s of [-0.5, 0.5]) k.b.beam([wx + s, wy + 0.8, wz], [wx + s, wy + 1.9, wz], 0.05, 0.05, TIMBER_DARK);
  k.b.beam([wx - 0.55, wy + 1.9, wz], [wx + 0.55, wy + 1.9, wz], 0.05, 0.05, TIMBER_DARK);
  // light from the lanes at night
  for (const [x, z] of [[24, 16], [39.5, 19.5], [54, 27.5], [59.5, 38], [36, 31], [48, 11]] as [number, number][]) k.lights.push({ x, z, r: 9, color: '#ffcf8a', k: 0.42 });
}

// ---------------------------------------------------------------------------
// The names
// ---------------------------------------------------------------------------

const SIGN = {
  city: 'kings-landing-city', keep: 'kings-landing-red-keep', sept: 'kings-landing-sept', pit: 'kings-landing-dragonpit',
  dragon: 'kings-landing-dragon-gate', lion: 'kings-landing-lion-gate', river: 'kings-landing-river-gate',
};

export const SIGNS: SignDef[] = [
  nameSign(SIGN.city, LN.name), nameSign(SIGN.keep, RK.name), nameSign(SIGN.sept, SEPT.name), nameSign(SIGN.pit, PIT.name),
  nameSign(SIGN.dragon, DG.name), nameSign(SIGN.lion, LG.name), nameSign(SIGN.river, RG.name),
];

function names(k: Build): void {
  const E: V3 = [1, 0, 0], S: V3 = [0, 0, 1], q = WL.x1 + 11.25, f = KL.quayZ + 4.85;
  // the city's own name, by the kingsroad where it comes down to the bay, across the bend from the Dragon Gate
  // the city's name stands on the Blackwater's south bank, before the city as the opening view sees it
  nameBoard(k, SIGN.city, 51, 67.5, 0, [0.669, 0, 0.743], 1.1);
  nameBoard(k, SIGN.dragon, q, DG.z1 + 5.2, 0, E, 1.2);
  nameBoard(k, SIGN.pit, q, PC.z + 7.5, 0, E, 1.4);
  nameBoard(k, SIGN.keep, q, (RK.z0 + RK.z1) / 2 - 0.5, 0, E, 1.4);
  nameBoard(k, SIGN.lion, LG.x0 - 5.5, f, 0, S, 1.5);
  nameBoard(k, SIGN.sept, SEPT.x0 + 1.6, f, 0, S, 1.5);
  nameBoard(k, SIGN.river, RG.x0 - 5.4, f, 0, S, 1.2);
}

// ---------------------------------------------------------------------------
// The models and the rest
// ---------------------------------------------------------------------------

export const MODELS: Record<string, Model> = {
  'kl-wall-n': (k) => landWall(k, 'n'),
  'kl-wall-w': (k) => landWall(k, 'w'),
  'kl-wall-e': (k) => landWall(k, 'e'),
  'kl-wall-s': (k) => riverWall(k),
  sept,
  'rk-walls': redKeepWalls,
  'rk-maegor': maegorsHoldfast,
  'rk-tower-nw': redKeepTower('nw'),
  'rk-tower-ne': redKeepTower('ne'),
  'rk-tower-sw': redKeepTower('sw', 'lannister'),
  'rk-tower-se': redKeepTower('se', 'baratheon'),
  'rk-tall': towerOfTheHand,
  dragonpit,
  'kl-houses-w': (k, l) => buildHouses(k, LOT_PLOTS[l.id], 41, 1),
  'kl-houses-mid': (k, l) => buildHouses(k, LOT_PLOTS[l.id], 42, 1),
  'kl-dragon-gate': dragonGate,
  'kl-lion-gate': lionGate,
  'kl-river-gate': riverGate,
};
export const COVERS: string[] = [];
export const FLOORED: string[] = [];

export function extras(k: Build): void {
  drawHills(k);
  plazas(k);
  buildHouses(k, PLOTS, 43, 0);
  bridge(k);
  quays(k);
  people(k);
  names(k);
}
