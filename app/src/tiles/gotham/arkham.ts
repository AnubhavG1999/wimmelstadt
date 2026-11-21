// Mercey Island: Arkham Asylum on its crag, its gate and its walls, and the Trigate Bridge.
//
// The island fills the board's north-west corner. land.ts lays its low ground
// at 4 with rock walls down to the water, and the crag at 9 that the asylum
// stands on, its sides sloping. This file builds what stands on them.
//
// The asylum is Eric Mercey's Gothic mansion among the island's wooded hills,
// as the comics have it from 1995, with the round main block of the later
// building, laid out as a panopticon, beside it: a complex and not a block.
// The ceiling along the board's north and west edges binds it, so what is tall
// stands in the south-east of the lot and the wings fall away to the north and
// the west: the clock tower whose clock has stopped, at the south-east corner;
// the mansion's great gable facing the view, its porch and its door; the drum
// with its low copper dome and lantern on the west; the chapel with its one
// traceried window facing east; two long low wings of different lengths
// behind, with rows of small high windows and a water tower on the roof. Its
// windows are lit few and cold at night, but for one warm room high in the
// tower. Nobody stands in it, and nothing is drawn at its windows: it is a
// grand old house that is a hospital.
//
// Below the crag, the drive comes up from the gate in a long slant across the
// slope and doubles back along the terrace before the façade. The gate is two
// stone piers with gargoyles on them and an iron arch that carries the name;
// its leaf is the show's, and the opening stands empty. A wall with iron
// railings runs from the piers round the low ground, with the gatehouse in it
// and a sentry box outside. Within the wall: two walled yards that stand empty
// and a glasshouse. Outside it: the woods on the island's north-east, a path
// through them to a boathouse and a quay on the east shore.
//
// The Trigate Bridge: a ring over the reach on one great round pier with three
// cutwaters, its deck cantilevered on steel brackets, and three arms from it to
// three shores, each on a pair of steel arch ribs.

import * as THREE from 'three';
import { interior, rng, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { lathe, pinnacle, roundel, tri } from '../../engine/parts';
import type { Path } from '../../engine/paths';
import { slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { landAt } from './land';
import {
  AMBER, BRASS, COLD, COPPER, COPPER_DARK, DARK, GLASS, IRON, IRON_DARK, LEAD, ROCK, ROCK_DARK, ROCK_LIGHT, RUST, SLATE, SODIUM, STEEL, STONE, STONE_DARK,
  STONE_LIGHT, STONE_TRIM, TIMBER, TIMBER_DARK, gargoyle, gasLamp, nameSign,
} from './look';
import type { Model, Place } from './models';
import { LANDS, TRIGATE, groundAt, lotOf, merceyAt, type Lot, type P2 } from './plan';
import { LANES, MIDDLES } from './roads';
import { ceilingAt, open } from './space';

const PI = Math.PI;

// ---------------------------------------------------------------------------
// Colours and windows of this file's own
// ---------------------------------------------------------------------------

/** A window's glass by day, dark. */
const PANE = 0x252930;
/** The crag's stone the asylum is built of: Pinkney's dark stone, a shade greener for the island's damp. */
const WALL = 0x41454d, WALL_DARK = 0x30333a;
/** The dial of the clock that has stopped. */
const DIAL = 0xd6d0bf;
/** Dead wood, the drive's gravel, the setts before the gate, the yards' beaten earth. */
const BARE = 0x3c3633, GRAVEL = 0x6e6a63, SETT = 0x56534e, YARD = 0x5c5650;
/** Chimney pots. */
const POT = 0x6a4a3e;

/** The asylum's tall narrow windows: few lit, and those dim. */
const ASYLUM_WIN: WinSpec = { cell: 2.2, storey: 4, lit: 0.35, kind: 6 };
/** The drum's windows. */
const DRUM_WIN: WinSpec = { cell: 1.9, storey: 4, lit: 0.4, kind: 6 };
/** The wings' rows of small high windows. */
const WING_WIN: WinSpec = { cell: 1.7, storey: 4, lit: 0.3, kind: 4 };
/** The gatehouse's windows. */
const LODGE_WIN: WinSpec = { cell: 1.8, storey: 4, lit: 0.6, kind: 4 };

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** A box with all six faces, or the ones given. */
const solid = (b: GeoBuilder, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number, faces = 'NESWTB'): void => b.box(x0, y0, z0, x1, y1, z1, c, { faces });

/** The lowest ground under a rectangle, as built. */
function lowest(x0: number, z0: number, x1: number, z1: number): number {
  let y = Infinity;
  for (let i = 0; i <= 3; i++) for (let j = 0; j <= 3; j++) y = Math.min(y, landAt(x0 + ((x1 - x0) * i) / 3, z0 + ((z1 - z0) * j) / 3));
  return y;
}

const unit = (a: P2, b: P2): P2 => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };

/** The yaw that turns a frame built facing +z so that it faces north, east, south or west. */
const FACE_YAW = { S: 0, N: PI, E: -PI / 2, W: PI / 2 } as const;
type Face = keyof typeof FACE_YAW;
const FACE_N: Record<Face, P2> = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] };

interface RoofOpts { over?: number; ends?: [string, string]; color?: number; under?: number; wall?: number }

/**
 * A pitched roof whose ridge runs along x, its slopes through the tops of the
 * walls at z0 and z1, so that a gable closes right up under it. Each end is a
 * gable ('g'), a hip ('h'), or left open ('o') where it meets another wall.
 * Undersides under every eave. Returns the ridge's height.
 */
function roof(b: GeoBuilder, x0: number, x1: number, z0: number, z1: number, y: number, rise: number, o: RoofOpts = {}): number {
  const over = o.over ?? 0.35, c = o.color ?? SLATE, under = o.under ?? STONE_DARK;
  const [e0, e1] = o.ends ?? ['g', 'g'];
  const zc = (z0 + z1) / 2, half = (z1 - z0) / 2, k = rise / half, top = y + rise;
  const ye = y - k * over, A = x0 - over, E = x1 + over, N = z0 - over, S = z1 + over, he = half + over;
  const r0 = e0 === 'h' ? Math.min(A + he, (A + E) / 2) : A, r1 = e1 === 'h' ? Math.max(E - he, (A + E) / 2) : E;
  const len = Math.hypot(he, rise);
  const nS: V3 = [0, he / len, rise / len], nN: V3 = [0, he / len, -rise / len];
  const neg = (n: V3): V3 => [-n[0], -n[1], -n[2]];
  const south: [V3, V3, V3, V3] = [[A, ye, S], [E, ye, S], [r1, top, zc], [r0, top, zc]];
  const north: [V3, V3, V3, V3] = [[E, ye, N], [A, ye, N], [r0, top, zc], [r1, top, zc]];
  b.quad(...south, nS, c);
  b.quad(...north, nN, c);
  b.quad(...south, neg(nS), under);
  b.quad(...north, neg(nN), under);
  for (const [e, xe, xr, s] of [[e0, A, r0, -1], [e1, E, r1, 1]] as [string, number, number, number][]) {
    if (e === 'h') {
      const n: V3 = [(s * rise) / len, he / len, 0];
      tri(b, [xe, ye, N], [xe, ye, S], [xr, top, zc], n, c);
      tri(b, [xe, ye, N], [xe, ye, S], [xr, top, zc], neg(n), under);
    } else if (e === 'g') {
      const xw = s < 0 ? x0 : x1;
      tri(b, [xw, y, z0], [xw, y, z1], [xw, top, zc], [s, 0, 0], o.wall ?? WALL);
    }
  }
  if (r1 - r0 > 0.05) solid(b, r0, top - 0.05, zc - 0.12, r1, top + 0.12, zc + 0.12, LEAD);
  return top;
}

/** The same roof with its ridge along z: its first end is the north one. */
function roofZ(b: GeoBuilder, x0: number, x1: number, z0: number, z1: number, y: number, rise: number, o: RoofOpts = {}): number {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  let top = 0;
  b.moved(cx, 0, cz, PI / 2, () => { top = roof(b, z0 - cz, z1 - cz, -(x1 - cx), -(x0 - cx), y, rise, o); });
  return top;
}

/**
 * A Gothic window in a frame that faces +z with the wall at z 0: a pane with a
 * pointed head, a sill, a hood mould over the head, and mullions of stone.
 * `lit` makes the pane a lit room's (warm); without it the pane is dark by day
 * and, if the wall's windows are lit, it is not.
 */
function lancet(b: GeoBuilder, w: number, y0: number, y1: number, o: { lit?: number; head?: number; lights?: number; tracery?: boolean } = {}): void {
  const hw = w / 2, h = w * (o.head ?? 0.75);
  const q = o.lit ? { win: interior(o.lit) } : {};
  b.quad([-hw, y0, 0.04], [hw, y0, 0.04], [hw, y1, 0.04], [-hw, y1, 0.04], [0, 0, 1], PANE, q);
  tri(b, [-hw, y1, 0.04], [hw, y1, 0.04], [0, y1 + h, 0.04], [0, 0, 1], PANE, q);
  solid(b, -hw - 0.15, y0 - 0.18, 0, hw + 0.15, y0, 0.18, STONE_TRIM, 'SEWTB');
  for (const s of [-1, 1]) b.beam([s * (hw + 0.12), y1 - 0.2, 0.08], [0, y1 + h + 0.14, 0.08], 0.07, 0.07, STONE_TRIM);
  const lights = o.lights ?? 1;
  for (let i = 1; i < lights; i++) {
    const x = -hw + (w * i) / lights, up = y1 + h * (1 - Math.abs(x) / hw) * 0.55;
    solid(b, x - 0.06, y0, 0.03, x + 0.06, up, 0.11, STONE_TRIM, 'SEWT');
  }
  if (o.tracery) {
    // a ring of stone in the head, and the mullions' arches meeting it
    const cy = y1 + h * 0.42, r = Math.min(hw * 0.42, h * 0.3);
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * PI * 2, a1 = ((i + 1) / 8) * PI * 2;
      b.beam([Math.cos(a0) * r, cy + Math.sin(a0) * r, 0.08], [Math.cos(a1) * r, cy + Math.sin(a1) * r, 0.08], 0.05, 0.05, STONE_TRIM);
    }
    if (lights > 1) for (const s of [-1, 1]) b.beam([s * hw * 0.98, y1, 0.08], [s * r * 0.7, cy - r * 0.7, 0.08], 0.05, 0.05, STONE_TRIM);
  }
}

/** A lancet on a wall that faces north, east, south or west, at (x, z) on the wall's face. */
function windowOn(b: GeoBuilder, face: Face, x: number, z: number, w: number, y0: number, y1: number, o: Parameters<typeof lancet>[4] = {}): void {
  b.moved(x, 0, z, FACE_YAW[face], () => lancet(b, w, y0, y1, o));
}

/** A cold light in a window, which shows at night: a thin glow just before the pane. */
function coldPane(k: Build, face: Face, x: number, z: number, w: number, y0: number, y1: number, color = COLD): void {
  const [nx, nz] = FACE_N[face];
  k.glows.push({ x: x + nx * 0.08, y: (y0 + y1) / 2, z: z + nz * 0.08, sx: nx ? 0.04 : w * 0.7, sy: (y1 - y0) * 0.85, sz: nz ? 0.04 : w * 0.7, color });
}

/** A chimney stack with its coping and two pots. */
function chimney(b: GeoBuilder, x: number, z: number, y0: number, y1: number, w = 0.9, d = 0.6): void {
  solid(b, x - w / 2, y0, z - d / 2, x + w / 2, y1, z + d / 2, WALL_DARK, 'NESWT');
  solid(b, x - w / 2 - 0.1, y1, z - d / 2 - 0.1, x + w / 2 + 0.1, y1 + 0.2, z + d / 2 + 0.1, STONE_TRIM);
  for (const s of [-1, 1]) b.cyl(x + s * w * 0.24, z, y1 + 0.2, y1 + 0.62, 0.13, 0.11, 6, POT, { cap: DARK });
}

/** Iron cresting along a ridge: a rail with spikes on it. */
function cresting(b: GeoBuilder, a: V3, c: V3, every = 0.6): void {
  const n = Math.max(1, Math.round(Math.hypot(c[0] - a[0], c[2] - a[2]) / every));
  b.beam([a[0], a[1] + 0.32, a[2]], [c[0], c[1] + 0.32, c[2]], 0.04, 0.04, IRON);
  for (let i = 0; i <= n; i++) {
    const x = a[0] + ((c[0] - a[0]) * i) / n, y = a[1] + ((c[1] - a[1]) * i) / n, z = a[2] + ((c[2] - a[2]) * i) / n;
    b.beam([x, y, z], [x, y + (i % 2 ? 0.45 : 0.62), z], 0.035, 0.015, IRON);
  }
}

/** A lightning rod from a place, up `h`. */
const rod = (b: GeoBuilder, x: number, y: number, z: number, h: number): void => b.beam([x, y, z], [x, y + h, z], 0.04, 0.02, IRON);

/** A bare tree, dead: a trunk and a few crooked limbs, standing on `y`, `h` tall. */
function bareTree(b: GeoBuilder, x: number, y: number, z: number, h: number, R: () => number): void {
  const trunk = h * (0.4 + R() * 0.12), lean = (R() - 0.5) * 0.25;
  const top: V3 = [x + lean * h * 0.3, y + trunk, z + lean * h * 0.2];
  b.beam([x, y - 0.25, z], top, 0.1 + h * 0.022, 0.07 + h * 0.01, BARE);
  const limbs = 3 + Math.floor(R() * 2);
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * PI * 2 + R() * 1.2, reach = h * (0.22 + R() * 0.16), rise = h * (0.3 + R() * 0.25);
    const from: V3 = [top[0], top[1] - R() * trunk * 0.3, top[2]];
    const end: V3 = [from[0] + Math.cos(a) * reach, from[1] + rise, from[2] + Math.sin(a) * reach];
    b.beam(from, end, 0.06 + h * 0.008, 0.025, BARE);
    if (i % 2 === 0) b.beam(end, [end[0] + Math.cos(a + 0.9) * reach * 0.45, end[1] + rise * 0.35, end[2] + Math.sin(a + 0.9) * reach * 0.45], 0.025, 0.012, BARE);
  }
}

// ---------------------------------------------------------------------------
// The gate, as a frame: where it stands and the way it faces
// ---------------------------------------------------------------------------
//
// The gate stands at the foot of the crag where the drive leaves the ring,
// facing the ring's middle, which is south-east of it and the way the view
// looks from. In the gate's own frame x runs along it from its west pier to its
// east one and z points out of it, towards the ring.

const GATE_LOT = lotOf('arkham-gate');
const RING_C = TRIGATE.arkham.c;
/** The middle of the gate's opening, on the ground. */
const G: P2 = [(GATE_LOT.x0 + GATE_LOT.x1) / 2 - 2.6, (GATE_LOT.z0 + GATE_LOT.z1) / 2 + 0.8];
/** The way it faces, out of the grounds, and the way along it. */
const F: P2 = unit(G, RING_C);
const X: P2 = [F[1], -F[0]];
const GATE_YAW = Math.atan2(X[1], X[0]);
/** A place in the gate's frame, on the board. */
const frame = (lx: number, lz: number): P2 => [G[0] + X[0] * lx + F[0] * lz, G[1] + X[1] * lx + F[1] * lz];
/** Half the opening, and where each pier's middle is from the gate's middle. */
const OPEN = 2.2, PIER = 0.6, PIER_AT = OPEN + PIER;
/** The gatehouse, along the wall west of the gate, and the sentry box outside the east pier. */
const LODGE = { x0: -7.9, x1: -PIER_AT - PIER - 0.05, z0: -2.6, z1: 0.6 };
const SENTRY = { x: PIER_AT + 1.0, z: 1.75, half: 0.62 };
/** The wall's line round the low ground, from each pier. */
const WALL_WEST: P2[] = [frame(LODGE.x0, 0), [-80.5, -70.6], [-84.5, -67.0], [-103.2, -67.0]];
const WALL_EAST: P2[] = [frame(PIER_AT + PIER, 0), frame(9.4, 2.7), [-57.5, -89], [-56, -100], [-56, -112.2]];
/** Where the drive runs, from the gate up the slope and back along the terrace to the door. */
const DRIVE: P2[] = [frame(0, 0.3), frame(0, -1.6), [-74.6, -83.0], [-80, -84.4], [-84.5, -85.5], [-86.4, -86.6], [-84.8, -87.25], [-80.4, -87.3]];
/** The terrace before the façade, on the crag's top. */
const TERRACE = { x0: -86.8, x1: -73.2, z0: -87.75, z1: -86.25 };

// ---------------------------------------------------------------------------
// The asylum's plan, from its lot
// ---------------------------------------------------------------------------

const ARK = lotOf('arkham');
/** The mansion's middle block, its great gable to the south. */
const MAIN = { x0: ARK.x0 + 12, x1: ARK.x1 - 6, z0: ARK.z0 + 5.4, z1: ARK.z1 - 1, eave: 20.1, rise: 7 };
/** The clock tower at the south-east corner. */
const TOWER = { x0: ARK.x1 - 6.4, x1: ARK.x1 - 1.4, z0: ARK.z1 - 5.5, z1: ARK.z1 - 0.5 };
/** The porch before the door. */
const PORCH = { x0: (MAIN.x0 + MAIN.x1) / 2 - 1.6, x1: (MAIN.x0 + MAIN.x1) / 2 + 1.6, z0: MAIN.z1, z1: MAIN.z1 + 1.2, top: 13.2 };
/** The panopticon: a drum west of the mansion. */
const DRUM = { x: ARK.x0 + 7, z: ARK.z1 - 6, r: 4.8 };

/** Where the lit room high in the tower has its window. */
const TOWER_ROOM = { x: (TOWER.x0 + TOWER.x1) / 2, y0: 20.6, y1: 23.0, z: TOWER.z1 };

// ---------------------------------------------------------------------------
// The places the show needs
// ---------------------------------------------------------------------------

function places(at: (x: number, z: number) => number): Record<string, Place> {
  const h = Math.atan2(F[1], F[0]);
  const p = (xz: P2, hh = h, dy = 0): Place => ({ x: xz[0], y: at(xz[0], xz[1]) + dy, z: xz[1], h: hh });
  const e = unit(WALL_EAST[0], WALL_EAST[1]), en: P2 = [-e[1], e[0]];
  // the outer face of the east wall's first stretch, four units along it
  const lean: P2 = [WALL_EAST[0][0] + e[0] * 4 + en[0] * 0.32, WALL_EAST[0][1] + e[1] * 4 + en[1] * 0.32];
  return {
    gateMiddle: p(G),
    gateInside: p(frame(0, -1.6)),
    gateOutside: p(frame(0, 3.0)),
    gateLean: p(lean, Math.atan2(en[1], en[0])),
    guard: p(frame(SENTRY.x + SENTRY.half + 0.7, SENTRY.z - 0.2)),
    strange: p(frame((LODGE.x0 + LODGE.x1) / 2, LODGE.z1 + 1.4)),
    asylumDoor: { x: (PORCH.x0 + PORCH.x1) / 2, y: ARK.base + 0.04, z: PORCH.z1 + 0.9, h: PI / 2 },
    towerRoom: { x: TOWER_ROOM.x, y: (TOWER_ROOM.y0 + TOWER_ROOM.y1) / 2, z: TOWER_ROOM.z + 0.05, h: PI / 2 },
    ringIsland: { x: TRIGATE.c[0], y: TRIGATE_ISLAND_TOP, z: TRIGATE.c[1], h: 0 },
  };
}

/** The top of the Trigate's ring island. */
const TRIGATE_ISLAND_TOP = 4.86;

// ---------------------------------------------------------------------------
// The exports
// ---------------------------------------------------------------------------

/** A model for each lot this file builds, by the lot's id. */
export const MODELS: Record<string, Model> = { arkham: asylum, 'arkham-gate': gate, trigate };

/** Lots that are built as part of another lot's model or by `extras`, and so get no box either. */
export const COVERS: string[] = [];

/** Every sign this file hangs. Each id begins with `arkham-`. */
export const SIGNS: SignDef[] = [
  { id: 'arkham-gate', lines: ['ARKHAM ASYLUM'], color: '#2a2d33', ink: '#d5d8dc', aspect: 8.4, kind: 'board', size: [437, 52] },
  nameSign('arkham-trigate', 'Trigate Bridge'),
];

/** Places on what this file builds that the show needs as built: its task names them. */
export const PLACES: Record<string, Place> = places(merceyAt);

// ---------------------------------------------------------------------------
// Arkham Asylum
// ---------------------------------------------------------------------------

function asylum(k: Build, l: Lot): void {
  const b = k.b, B = l.base, PLINTH = 12;
  const foot = (x0: number, z0: number, x1: number, z1: number): number => Math.min(B, lowest(x0, z0, x1, z1)) - 0.3;

  // ---- the mansion's middle block
  {
    const M = MAIN, cx = (M.x0 + M.x1) / 2;
    const f = foot(M.x0, M.z0, M.x1, M.z1 + 1);
    solid(b, M.x0 - 0.2, f, M.z0 - 0.2, M.x1 + 0.2, PLINTH, M.z1 + 0.2, WALL_DARK, 'NESWT');
    b.box(M.x0, PLINTH, M.z0, M.x1, 20, M.z1, WALL, { faces: 'NEW', win: ASYLUM_WIN, seed: 3.1 });
    // the south face is drawn window by window: two rows each side of the porch, and the great window over it
    b.box(M.x0, PLINTH, M.z1 - 0.01, M.x1, 20, M.z1, WALL, { faces: 'S' });
    // string course and cornice, broken on the south for the great window
    const gw = 2.6, gx0 = cx - gw / 2 - 0.35, gx1 = cx + gw / 2 + 0.35;
    for (const [y0, y1, p] of [[15.85, 16.1, 0.12], [M.eave - 0.35, M.eave, 0.25]]) {
      solid(b, M.x0 - p, y0, M.z0 - p, M.x1 + p, y1, M.z1 - 0.3, STONE_TRIM);
      solid(b, M.x0 - p, y0, M.z1 - 0.3, gx0, y1, M.z1 + p, STONE_TRIM);
      solid(b, gx1, y0, M.z1 - 0.3, M.x1 + p, y1, M.z1 + p, STONE_TRIM);
    }
    // quoins up the two front corners
    solid(b, M.x0 - 0.12, PLINTH, M.z1 - 0.3, M.x0 + 0.32, M.eave - 0.35, M.z1 + 0.12, STONE_TRIM, 'ESW');
    // the windows each side of the porch
    for (const x of [M.x0 + 1.6, M.x0 + 3.3, M.x1 - 3.0, TOWER.x0 - 1.4]) {
      windowOn(b, 'S', x, M.z1, 0.9, 12.6, 14.8);
      windowOn(b, 'S', x, M.z1, 0.9, 16.6, 18.8);
    }
    coldPane(k, 'S', M.x0 + 3.3, M.z1, 0.9, 16.6, 19.2);
    coldPane(k, 'S', M.x1 - 3.0, M.z1, 0.9, 12.6, 15.2);
    // the great window, rising from over the porch into the gable, with a round window over it
    windowOn(b, 'S', cx, M.z1, gw, 15.6, 21.4, { lights: 3, tracery: true, head: 0.72 });
    roundel(b, [cx, 24.75, M.z1 + 0.05], 0.62, 'S', STONE_TRIM);
    roundel(b, [cx, 24.75, M.z1 + 0.08], 0.44, 'S', PANE);
    // the steep slate roof: the great gable to the south, a hip to the north under the ceiling
    const top = roofZ(b, M.x0, M.x1, M.z0, M.z1, M.eave, M.rise, { ends: ['h', 'g'], over: 0.35 });
    // the gable's coping, its kneelers, the finial at its apex and the rod on it
    for (const s of [-1, 1]) {
      b.beam([cx + s * ((M.x1 - M.x0) / 2 + 0.2), M.eave - 0.05, M.z1 + 0.12], [cx, top + 0.2, M.z1 + 0.12], 0.2, 0.2, STONE_TRIM);
      solid(b, cx + s * ((M.x1 - M.x0) / 2) - 0.45, M.eave - 0.1, M.z1 - 0.3, cx + s * ((M.x1 - M.x0) / 2) + 0.45, M.eave + 0.45, M.z1 + 0.35, STONE_TRIM);
    }
    pinnacle(b, cx, M.z1, top, 1.3, 0.22, STONE_TRIM);
    rod(b, cx, top + 1.3, M.z1, 0.9);
    gargoyle(b, M.x0 - 0.1, M.eave + 0.45, M.z1 + 0.15, (3 * PI) / 4, 0.9);
    // iron cresting along the ridge
    cresting(b, [cx, top + 0.12, M.z1 + 0.3], [cx, top + 0.12, M.z0 + (M.x1 - M.x0) / 2 + 0.4]);
    // dormers on the two slopes, two on each
    for (const z of [M.z1 - 2.3, M.z1 - 5.6]) {
      for (const s of [-1, 1]) {
        const xf = s < 0 ? M.x0 + 0.25 : M.x1 - 0.25, xb = xf - s * 2.9, d0 = Math.min(xf, xb), d1 = Math.max(xf, xb);
        b.box(d0, M.eave - 0.2, z - 0.8, d1, M.eave + 2.2, z + 0.8, WALL, { faces: s < 0 ? 'WNS' : 'ENS' });
        roof(b, d0 - (s < 0 ? 0 : 0.3), d1 + (s < 0 ? 0.3 : 0), z - 0.8, z + 0.8, M.eave + 2.2, 0.95, { over: 0.15, ends: s < 0 ? ['g', 'o'] : ['o', 'g'] });
        b.moved(xf, 0, z, s < 0 ? FACE_YAW.W : FACE_YAW.E, () => {
          b.quad([-0.45, M.eave + 0.25, 0.04], [0.45, M.eave + 0.25, 0.04], [0.45, M.eave + 1.7, 0.04], [-0.45, M.eave + 1.7, 0.04], [0, 0, 1], PANE);
          solid(b, -0.6, M.eave + 0.08, 0, 0.6, M.eave + 0.25, 0.16, STONE_TRIM, 'SEWTB');
        });
      }
    }
    // the chimneys: two on the west wall, one on the east, one tall stack on the ridge
    chimney(b, M.x0 + 0.9, M.z1 - 2.6, M.eave - 1, 25.0);
    chimney(b, M.x0 + 0.9, M.z0 + 1.8, M.eave - 1, 24.6);
    chimney(b, M.x1 - 0.9, M.z0 + 2.1, M.eave - 1, 25.0);
    chimney(b, cx, M.z0 + 5.2, top - 1, top + 1.2, 1.2, 0.7);
  }

  // ---- the porch and the door
  {
    const P = PORCH, cx = (P.x0 + P.x1) / 2;
    b.box(P.x0, foot(P.x0, P.z0, P.x1, P.z1), P.z0 - 0.3, P.x1, P.top, P.z1, WALL, { faces: 'ESW' });
    solid(b, P.x0 - 0.15, P.top - 0.3, P.z0 - 0.3, P.x1 + 0.15, P.top, P.z1 + 0.15, STONE_TRIM, 'ESWB');
    roofZ(b, P.x0, P.x1, P.z0 - 0.3, P.z1, P.top, 1.6, { ends: ['o', 'g'], over: 0.2 });
    // the doorway: a pointed arch, lit from within
    b.moved(cx, 0, P.z1, 0, () => {
      b.quad([-0.75, B + 0.02, 0.04], [0.75, B + 0.02, 0.04], [0.75, B + 2.3, 0.04], [-0.75, B + 2.3, 0.04], [0, 0, 1], DARK, { win: interior(1.6) });
      tri(b, [-0.75, B + 2.3, 0.04], [0.75, B + 2.3, 0.04], [0, B + 3.35, 0.04], [0, 0, 1], DARK, { win: interior(1.6) });
      for (const s of [-1, 1]) {
        b.beam([s * 0.9, B, 0.1], [s * 0.9, B + 2.3, 0.1], 0.12, 0.12, STONE_TRIM);
        b.beam([s * 0.9, B + 2.25, 0.1], [0, B + 3.55, 0.1], 0.12, 0.12, STONE_TRIM);
      }
    });
    for (const x of [P.x0, P.x1]) pinnacle(b, x, P.z1, P.top, 1.4, 0.2, STONE_TRIM);
    // two steps down from the door to the terrace
    solid(b, P.x0 + 0.4, B - 0.2, P.z1, P.x1 - 0.4, B + 0.2, P.z1 + 0.45, STONE_LIGHT, 'NESWT');
    solid(b, P.x0 + 0.4, B - 0.2, P.z1 + 0.45, P.x1 - 0.4, B + 0.1, P.z1 + 0.85, STONE_LIGHT, 'ESWT');
    k.glows.push({ x: cx, y: B + 3.9, z: P.z1 + 0.25, sx: 0.32, sy: 0.4, sz: 0.32, color: AMBER });
  }

  // ---- the clock tower
  {
    const T = TOWER, cx = (T.x0 + T.x1) / 2, cz = (T.z0 + T.z1) / 2;
    const f = foot(T.x0, T.z0, T.x1 + 1, T.z1 + 1);
    solid(b, T.x0 - 0.2, f, T.z0 - 0.2, T.x1 + 0.2, PLINTH, T.z1 + 0.2, WALL_DARK, 'NESWT');
    b.box(T.x0, PLINTH, T.z0, T.x1, 24, T.z1, WALL, { faces: 'NESW' });
    for (const y of [16, 20]) solid(b, T.x0 - 0.12, y - 0.15, T.z0 - 0.12, T.x1 + 0.12, y + 0.1, T.z1 + 0.12, STONE_TRIM);
    // buttresses, stepped, at the south-east corner and the south-west
    for (const [x0, z0, x1, z1, east] of [[T.x1 - 1.0, T.z1, T.x1 - 0.3, T.z1 + 0.8, 0], [T.x1, T.z1 - 1.0, T.x1 + 0.8, T.z1 - 0.3, 1], [T.x0 + 0.3, T.z1, T.x0 + 1.0, T.z1 + 0.8, 0]]) {
      solid(b, x0, f, z0, x1, 17.5, z1, WALL_DARK, 'NESWT');
      // the upper stage stands out less
      solid(b, x0, 17.5, z0, east ? x1 - 0.35 : x1, 21.5, east ? z1 : z1 - 0.35, WALL_DARK, 'NESWT');
    }
    // its windows: three storeys on the south and the east, the top one on the north and the west, over the roofs
    for (const [y0, y1] of [[12.6, 14.8], [16.6, 18.8], [TOWER_ROOM.y0, TOWER_ROOM.y1]]) {
      const room = y0 === TOWER_ROOM.y0;
      windowOn(b, 'S', cx, T.z1, 1.0, y0, y1, room ? { lit: 2.8 } : {});
      windowOn(b, 'E', T.x1, cz, 1.0, y0, y1);
    }
    windowOn(b, 'N', cx, T.z0, 1.0, TOWER_ROOM.y0, TOWER_ROOM.y1);
    windowOn(b, 'W', T.x0, cz, 1.0, TOWER_ROOM.y0, TOWER_ROOM.y1);
    coldPane(k, 'E', T.x1, cz, 1.0, 16.6, 19.2);
    coldPane(k, 'S', cx, T.z1, 1.0, 12.6, 15.2);
    // the one warm room, high in the tower
    k.glows.push({ x: cx, y: (TOWER_ROOM.y0 + TOWER_ROOM.y1) / 2 + 0.2, z: T.z1 + 0.09, sx: 0.7, sy: 2.0, sz: 0.04, color: AMBER });
    // the clock stage, corbelled out, with a dial on each face whose hands have stopped at a quarter to midnight
    const C0 = 24.0, C1 = 26.9, o = 0.3;
    solid(b, T.x0 - o, C0 - 0.35, T.z0 - o, T.x1 + o, C0 + 0.05, T.z1 + o, STONE_TRIM);
    b.box(T.x0 - o + 0.05, C0 + 0.05, T.z0 - o + 0.05, T.x1 + o - 0.05, C1, T.z1 + o - 0.05, WALL, { faces: 'NESW' });
    const cy = (C0 + C1) / 2 + 0.05, hands = (p: V3, ax: V3): void => {
      // the minute hand at nine, the hour hand just short of twelve
      b.beam(p, [p[0] - ax[0] * 0.82, p[1], p[2] - ax[2] * 0.82], 0.06, 0.035, BRASS);
      b.beam(p, [p[0] - ax[0] * 0.1, p[1] + 0.55, p[2] - ax[2] * 0.1], 0.08, 0.045, BRASS);
    };
    for (const face of ['S', 'E', 'N', 'W'] as Face[]) {
      const [nx, nz] = FACE_N[face], w = T.x1 - T.x0 + 2 * o - 0.1;
      const px = cx + (nx * w) / 2, pz = cz + (nz * w) / 2;
      roundel(b, [px + nx * 0.03, cy, pz + nz * 0.03], 1.15, face, STONE_TRIM);
      roundel(b, [px + nx * 0.06, cy, pz + nz * 0.06], 0.98, face, DIAL);
      const along: V3 = nz ? [nz, 0, 0] : [0, 0, -nx];
      hands([px + nx * 0.1, cy, pz + nz * 0.1], along);
    }
    // gargoyles on the corbel's corners, one looking out each way
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      gargoyle(b, cx + sx * ((T.x1 - T.x0) / 2 + o - 0.1), C0 + 0.05, cz + sz * ((T.z1 - T.z0) / 2 + o - 0.1), Math.atan2(sz, sx), 0.75);
    }
    // the belfry: corner piers, louvred openings, and a cornice
    const L0 = C1, L1 = 28.4, hw = (T.x1 - T.x0) / 2;
    solid(b, cx - hw - 0.05, L0 - 0.15, cz - hw - 0.05, cx + hw + 0.05, L0 + 0.05, cz + hw + 0.05, STONE_TRIM, 'NESWT');
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) solid(b, cx + sx * hw - (sx > 0 ? 0.8 : 0), L0, cz + sz * hw - (sz > 0 ? 0.8 : 0), cx + sx * hw + (sx < 0 ? 0.8 : 0), L1, cz + sz * hw + (sz < 0 ? 0.8 : 0), WALL, 'NESW');
    solid(b, cx - hw + 0.75, L0, cz - hw + 0.75, cx + hw - 0.75, L1, cz + hw - 0.75, DARK, 'NESW');
    for (const y of [L0 + 0.45, L0 + 0.85, L0 + 1.25]) solid(b, cx - hw + 0.7, y, cz - hw + 0.7, cx + hw - 0.7, y + 0.1, cz + hw - 0.7, LEAD, 'NESWT');
    solid(b, cx - hw - 0.25, L1, cz - hw - 0.25, cx + hw + 0.25, L1 + 0.22, cz + hw + 0.25, STONE_TRIM);
    // the spire, pinnacles at its southern corners, and the weathervane on its tip
    const S0 = L1 + 0.22, S1 = 31.15;
    // a needle of lead, narrower than the belfry, so that it reads as a spire under the ceiling that binds it here
    b.cyl(cx, cz, S0 - 0.05, S0 + 0.35, 1.95 * Math.SQRT2, 1.95 * Math.SQRT2, 4, STONE_TRIM, { phase: PI / 4 });
    b.cyl(cx, cz, S0 + 0.35, S1, 1.75 * Math.SQRT2, 0.04, 4, LEAD, { phase: PI / 4, cap: false });
    // a little gabled lucarne on the spire's south face
    solid(b, cx - 0.35, S0 + 0.35, cz + 0.6, cx + 0.35, S0 + 1.2, cz + 1.55, LEAD, 'ESWT');
    b.quad([cx - 0.22, S0 + 0.45, cz + 1.57], [cx + 0.22, S0 + 0.45, cz + 1.57], [cx + 0.22, S0 + 1.05, cz + 1.57], [cx - 0.22, S0 + 1.05, cz + 1.57], [0, 0, 1], DARK);
    for (const sx of [-1, 1]) pinnacle(b, cx + sx * (hw + 0.05), cz + hw + 0.05, S0, 1.2, 0.2, STONE_TRIM);
    for (const sx of [-1, 1]) pinnacle(b, cx + sx * (hw + 0.05), cz - hw - 0.05, S0, 0.55, 0.2, STONE_TRIM);
    rod(b, cx, S1 - 0.1, cz, 0.62);
    b.beam([cx - 0.42, S1 + 0.32, cz], [cx + 0.42, S1 + 0.32, cz], 0.03, 0.03, IRON);
    b.beam([cx, S1 + 0.32, cz - 0.42], [cx, S1 + 0.32, cz + 0.42], 0.03, 0.03, IRON);
    b.beam([cx - 0.55, S1 + 0.5, cz + 0.2], [cx + 0.5, S1 + 0.5, cz - 0.18], 0.05, 0.02, IRON);
    solid(b, cx - 0.7, S1 + 0.42, cz + 0.17, cx - 0.4, S1 + 0.62, cz + 0.27, IRON);
  }

  // ---- the chapel, its one traceried window to the east
  {
    const x0 = ARK.x1 - 6.2, x1 = ARK.x1 - 0.6, z0 = MAIN.z0 - 0.2, z1 = TOWER.z0 + 0.2, eave = 16.1;
    const f = foot(x0, z0, x1 + 1, z1);
    solid(b, x0, f, z0, x1 + 0.15, PLINTH, z1, WALL_DARK, 'NESWT');
    b.box(x0, PLINTH, z0, x1, eave - 0.3, z1, WALL, { faces: 'NESW' });
    solid(b, x0, eave - 0.3, z0 - 0.2, x1 + 0.2, eave, z1 + 0.2, STONE_TRIM, 'NESWTB');
    roof(b, x0, x1, z0, z1, eave, 3.6, { ends: ['o', 'g'], over: 0.3 });
    const cz = (z0 + z1) / 2;
    windowOn(b, 'E', x1, cz, 2.4, 12.6, 16.5, { lights: 3, tracery: true, head: 0.85 });
    coldPane(k, 'E', x1, cz, 2.4, 12.6, 17.6, '#7fb8e8');
    for (const z of [z0, z1]) solid(b, x1 - 0.5, f, z - 0.35, x1 + 0.6, 14.6, z + 0.35, WALL_DARK, 'NESWT');
    for (const [z, yaw] of [[z0, -PI / 4], [z1, PI / 4]] as [number, number][]) gargoyle(b, x1 + 0.1, eave, z, yaw, 0.8);
    // a little bellcote on the gable's apex
    solid(b, x1 - 0.7, eave + 3.4, cz - 0.45, x1 - 0.1, eave + 4.4, cz + 0.45, WALL, 'NESWT');
    solid(b, x1 - 0.71, eave + 3.6, cz - 0.25, x1 - 0.09, eave + 4.15, cz + 0.25, DARK, 'NESW');
    roof(b, x1 - 0.7, x1 - 0.1, cz - 0.45, cz + 0.45, eave + 4.4, 0.5, { over: 0.1, ends: ['g', 'g'] });
  }

  // ---- the panopticon: a drum with a low copper dome and a lantern
  {
    const D = DRUM, f = foot(D.x - D.r, D.z - D.r, D.x + D.r, D.z + D.r);
    b.cyl(D.x, D.z, f, PLINTH, D.r + 0.15, D.r + 0.15, 12, WALL_DARK);
    b.cyl(D.x, D.z, PLINTH, 20, D.r, D.r, 12, WALL, { win: DRUM_WIN, cap: false, seed: 1.7 });
    b.cyl(D.x, D.z, 15.85, 16.1, D.r + 0.12, D.r + 0.12, 12, STONE_TRIM, { cap: false });
    b.cyl(D.x, D.z, 19.75, 20.15, D.r + 0.3, D.r + 0.3, 12, STONE_TRIM);
    // buttresses up every other corner
    for (let i = 0; i < 12; i += 2) {
      const a = (i / 12) * PI * 2 + PI / 12, cxb = D.x + Math.cos(a) * (D.r + 0.2), czb = D.z + Math.sin(a) * (D.r + 0.2);
      b.obox(cxb, (f + 18.8) / 2, czb, 0.3, (18.8 - f) / 2, 0.3, a, WALL_DARK);
    }
    lathe(b, D.x, D.z, [[D.r - 0.05, 20.15], [D.r - 0.4, 21.0], [D.r - 1.3, 21.8], [D.r - 2.7, 22.35], [1.25, 22.5]], 12, COPPER_DARK);
    // ribs down the dome
    for (let i = 0; i < 12; i += 2) {
      const a = (i / 12) * PI * 2 + PI / 12, c = Math.cos(a), s = Math.sin(a);
      b.sweep([[D.x + c * (D.r - 0.02), 20.2, D.z + s * (D.r - 0.02)], [D.x + c * (D.r - 0.38), 21.08, D.z + s * (D.r - 0.38)], [D.x + c * (D.r - 1.28), 21.88, D.z + s * (D.r - 1.28)], [D.x + c * 1.3, 22.55, D.z + s * 1.3]], [0.09, 0.09, 0.09, 0.09], COPPER);
    }
    b.cyl(D.x, D.z, 22.4, 23.7, 1.2, 1.2, 8, GLASS, { cap: false });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2 + PI / 8; b.beam([D.x + Math.cos(a) * 1.22, 22.4, D.z + Math.sin(a) * 1.22], [D.x + Math.cos(a) * 1.22, 23.7, D.z + Math.sin(a) * 1.22], 0.06, 0.06, IRON); }
    b.cyl(D.x, D.z, 23.7, 23.95, 1.45, 1.45, 8, STONE_TRIM);
    b.cyl(D.x, D.z, 23.95, 25.1, 1.3, 0.05, 8, LEAD, { cap: false });
    rod(b, D.x, 25.0, D.z, 1.0);
    k.glows.push({ x: D.x, y: 23.05, z: D.z, sx: 1.6, sy: 0.9, sz: 1.6, color: COLD });
    // gargoyles on the cornice, looking south and south-east
    for (const a of [PI / 2, PI / 4, (3 * PI) / 4]) gargoyle(b, D.x + Math.cos(a) * (D.r + 0.1), 20.15, D.z + Math.sin(a) * (D.r + 0.1), a, 0.8);
    // the link between the drum and the mansion
    const lx0 = D.x + D.r - 0.6, lx1 = MAIN.x0 + 0.2;
    solid(b, lx0, f, D.z - 1.8, lx1, 16, D.z + 1.8, WALL, 'NSWT');
    b.box(lx0, 12, D.z + 1.79, lx1, 16, D.z + 1.8, WALL, { faces: 'S', win: WING_WIN });
    solid(b, lx0, 16, D.z - 1.95, lx1, 16.3, D.z + 1.95, STONE_TRIM);
  }

  // ---- the two long low wings behind, of different lengths
  const wing = (x0: number, x1: number, z0: number, z1: number, faces: string, ends: [string, string], seed: number): void => {
    const f = foot(x0, z0, x1, z1);
    solid(b, x0 - 0.15, f, z0 - 0.15, x1 + 0.15, PLINTH, z1 + 0.15, WALL_DARK, 'NESWT');
    b.box(x0, PLINTH, z0, x1, 16, z1, WALL, { faces, win: WING_WIN, seed });
    solid(b, x0 - 0.15, 15.85, z0 - 0.15, x1 + 0.15, 16.1, z1 + 0.15, STONE_TRIM);
    roof(b, x0, x1, z0, z1, 16.1, (z1 - z0) / 2, { ends, over: 0.3 });
  };
  // the east wing runs from the mansion to the chapel's back, the west one behind the drum
  const NE = { x0: MAIN.x0, x1: ARK.x1 - 1.0, z0: ARK.z0 + 0.4, z1: MAIN.z0 + 0.2 };
  const W = { x0: ARK.x0 + 0.4, x1: MAIN.x0 + 0.4, z0: ARK.z0, z1: DRUM.z - DRUM.r - 0.45 };
  wing(NE.x0, NE.x1, NE.z0, NE.z1, 'NEW', ['g', 'g'], 4.3);
  wing(W.x0, W.x1, W.z0, W.z1, 'NSW', ['g', 'o'], 5.9);
  chimney(b, NE.x0 + 8.5, NE.z0 + 1.2, 15, 19.3);
  chimney(b, NE.x1 - 2.6, NE.z0 + 1.2, 15, 19.3);
  chimney(b, W.x0 + 5.6, W.z0 + 1.3, 15, 18.9);
  gargoyle(b, NE.x1 + 0.1, 16.1, NE.z0 - 0.1, -PI / 4, 0.7);
  gargoyle(b, W.x0 - 0.1, 16.1, W.z1 + 0.1, (3 * PI) / 4, 0.7);
  // the water tower, astride the east wing's roof: a stone stage and an iron tank with a cone for a lid
  {
    // under the ceiling, which here is about 20
    const x = NE.x0 + 5.0, z = NE.z1 - 2.8;
    solid(b, x - 1.1, 15.5, z - 1.1, x + 1.1, 18.0, z + 1.1, WALL, 'NESWT');
    solid(b, x - 1.25, 17.8, z - 1.25, x + 1.25, 18.05, z + 1.25, STONE_TRIM);
    b.cyl(x, z, 18.05, 19.5, 1.45, 1.45, 10, RUST, { cap: false });
    for (const y of [18.5, 19.1]) b.cyl(x, z, y, y + 0.1, 1.5, 1.5, 10, IRON_DARK, { cap: false });
    b.cyl(x, z, 19.5, 19.95, 1.55, 0.1, 10, LEAD);
  }
  // lightning rods on the drum's lantern and the tower are above; one more on the east wing's gable
  rod(b, NE.x1, 16.1 + (NE.z1 - NE.z0) / 2, (NE.z0 + NE.z1) / 2, 1.0);

  // light: a pool before the door; the windows' own few cold lights are above
  k.lights.push({ x: (PORCH.x0 + PORCH.x1) / 2, z: PORCH.z1 + 1.5, r: 9, color: AMBER, k: 0.45 });
  k.lights.push({ x: TOWER.x1 + 1, z: TOWER.z1 + 1, r: 8, color: SODIUM, k: 0.35 });
}

// ---------------------------------------------------------------------------
// The gate, its walls, the gatehouse and the sentry box
// ---------------------------------------------------------------------------

function gate(k: Build, _l: Lot): void {
  const b = k.b;
  const gy = (lx: number, lz: number): number => { const [x, z] = frame(lx, lz); return landAt(x, z); };
  const gLow = (x0: number, z0: number, x1: number, z1: number): number => Math.min(gy(x0, z0), gy(x1, z0), gy(x0, z1), gy(x1, z1), gy((x0 + x1) / 2, (z0 + z1) / 2));
  const yW = gy(-PIER_AT, 0), yE = gy(PIER_AT, 0), PT = Math.max(yW, yE) + 4.7;

  b.moved(G[0], 0, G[1], GATE_YAW, () => {
    // ---- the two piers: a plinth, a shaft, a cap, and a gargoyle on each looking out
    for (const s of [-1, 1]) {
      const x = s * PIER_AT, f = gLow(x - 0.8, -0.8, x + 0.8, 0.8) - 0.3, g = gy(x, 0);
      solid(b, x - 0.78, f, -0.78, x + 0.78, g + 0.7, 0.78, WALL_DARK, 'NESWT');
      b.box(x - PIER, g + 0.7, -PIER, x + PIER, PT - 0.3, PIER, WALL, { faces: 'NESW' });
      solid(b, x - 0.68, g + 2.6, -0.68, x + 0.68, g + 2.85, 0.68, STONE_TRIM, 'NESWB');
      solid(b, x - 0.78, PT - 0.3, -0.78, x + 0.78, PT, 0.78, STONE_TRIM);
      gargoyle(b, x - 0.1 * s, PT, 0.1, PI / 2 - s * 0.35, 0.95);
      // a lamp on a bracket on each pier's face, towards the ring
      b.beam([x, PT - 1.4, PIER], [x, PT - 1.1, PIER + 0.55], 0.06, 0.05, IRON_DARK);
    }
    // ---- the iron arch that carries the name: posts over the piers, a frame, a plate behind the letters, and an arch over all
    const AX = PIER_AT + 0.5;
    for (const s of [-1, 1]) b.beam([s * AX, PT, 0], [s * AX, PT + 1.45, 0], 0.08, 0.08, IRON);
    for (const y of [PT + 0.32, PT + 1.38]) b.beam([-AX, y, 0], [AX, y, 0], 0.06, 0.06, IRON);
    const arch: V3[] = [];
    for (let i = 0; i <= 10; i++) { const t = -1 + (2 * i) / 10; arch.push([t * AX, PT + 1.45 + 1.05 * (1 - t * t), 0]); }
    b.sweep(arch, arch.map(() => 0.07), IRON);
    // spikes along the arch, and the scrolls between the arch and the frame
    for (let i = 1; i < 10; i += 2) b.beam(arch[i], [arch[i][0], arch[i][1] + 0.45, 0], 0.04, 0.012, IRON);
    for (const t of [-0.55, 0, 0.55]) b.beam([t * AX, PT + 1.38, 0], [t * AX, PT + 1.45 + 1.05 * (1 - t * t), 0], 0.035, 0.035, IRON);
    solid(b, -AX + 0.15, PT + 0.38, -0.06, AX - 0.15, PT + 1.32, 0.04, IRON_DARK);
  });
  const [sx, sz] = frame(0, 0.07);
  k.sign('arkham-gate', sx, PT + 0.85, sz, F[0], F[1], 0.8, 2 * (PIER_AT + 0.5) - 0.5);
  for (const s of [-1, 1]) {
    const [lx, lz] = frame(s * PIER_AT, PIER + 0.55);
    gasLamp(k, lx, PT - 1.25, lz, 0, SODIUM);
  }
  k.lights.push({ x: frame(0, 2)[0], z: frame(0, 2)[1], r: 11, color: SODIUM, k: 0.55 });

  // ---- the gatehouse, in the wall's line west of the gate: its door and its windows face out, where the drive comes in
  b.moved(G[0], 0, G[1], GATE_YAW, () => {
    const L = LODGE, f = gLow(L.x0, L.z0, L.x1, L.z1) - 0.3, cx = (L.x0 + L.x1) / 2;
    solid(b, L.x0 - 0.12, f, L.z0 - 0.12, L.x1 + 0.12, 4.5, L.z1 + 0.12, WALL_DARK, 'NESWT');
    b.box(L.x0, 4.5, L.z0, L.x1, 8, L.z1, WALL, { faces: 'NEW', win: LODGE_WIN, seed: 9.2 });
    b.box(L.x0, 4.5, L.z1 - 0.01, L.x1, 8, L.z1, WALL, { faces: 'S' });
    solid(b, L.x0 - 0.15, 7.75, L.z0 - 0.15, L.x1 + 0.15, 8.0, L.z1 + 0.15, STONE_TRIM);
    roof(b, L.x0, L.x1, L.z0, L.z1, 8.0, 2.2, { ends: ['g', 'g'], over: 0.3 });
    // the door, a pointed arch lit within, with a window each side
    b.moved(cx, 0, L.z1, 0, () => {
      b.quad([-0.5, 4.52, 0.04], [0.5, 4.52, 0.04], [0.5, 6.2, 0.04], [-0.5, 6.2, 0.04], [0, 0, 1], DARK, { win: interior(1.4) });
      tri(b, [-0.5, 6.2, 0.04], [0.5, 6.2, 0.04], [0, 6.9, 0.04], [0, 0, 1], DARK, { win: interior(1.4) });
      for (const s of [-1, 1]) b.beam([s * 0.62, 6.15, 0.1], [0, 7.05, 0.1], 0.09, 0.09, STONE_TRIM);
      solid(b, -0.75, 4.45, 0, 0.75, 4.6, 0.5, STONE_LIGHT, 'NESWT');
    });
    for (const s of [-1, 1]) windowOn(b, 'S', cx + s * 1.45, L.z1, 0.75, 5.4, 6.9, { lit: 1.6 });
    chimney(b, L.x0 + 0.8, (L.z0 + L.z1) / 2 - 0.5, 8.5, 10.8, 0.8, 0.6);
    gargoyle(b, L.x1 + 0.05, 8.0, L.z1 + 0.1, PI / 4, 0.6);
  });
  const [lgx, lgz] = frame((LODGE.x0 + LODGE.x1) / 2, LODGE.z1 + 0.6);
  k.glows.push({ x: lgx, y: 7.25, z: lgz, sx: 0.3, sy: 0.38, sz: 0.3, color: AMBER });

  // ---- the sentry box outside the east pier: three walls, a dark way in, a little lead roof
  b.moved(G[0], 0, G[1], GATE_YAW, () => {
    const S = SENTRY, h = S.half, f = gLow(S.x - h, S.z - h, S.x + h, S.z + h);
    solid(b, S.x - h - 0.1, f - 0.3, S.z - h - 0.1, S.x + h + 0.1, f + 0.15, S.z + h + 0.1, STONE_DARK, 'NESWT');
    b.box(S.x - h, f + 0.15, S.z - h, S.x + h, f + 2.95, S.z + h, TIMBER_DARK, { faces: 'NEW' });
    for (const s of [-1, 1]) solid(b, S.x + s * h - (s > 0 ? 0.25 : 0), f + 0.15, S.z + h - 0.2, S.x + s * h + (s < 0 ? 0.25 : 0), f + 2.95, S.z + h, TIMBER_DARK, 'NESWT');
    b.quad([S.x - h + 0.25, f + 0.15, S.z + h - 0.35], [S.x + h - 0.25, f + 0.15, S.z + h - 0.35], [S.x + h - 0.25, f + 2.55, S.z + h - 0.35], [S.x - h + 0.25, f + 2.55, S.z + h - 0.35], [0, 0, 1], DARK, { win: interior(0.8) });
    solid(b, S.x - h + 0.25, f + 2.55, S.z + h - 0.35, S.x + h - 0.25, f + 2.95, S.z + h, TIMBER_DARK, 'SB');
    b.cyl(S.x, S.z, f + 2.95, f + 3.75, (h + 0.18) * Math.SQRT2, 0.05, 4, LEAD, { phase: PI / 4 });
  });

  // ---- the wall round the low ground, with iron railings on it and a pier now and then
  for (const line of [WALL_WEST, WALL_EAST]) fence(k, line);

  // ---- the ground before the gate: setts, where it is not the ring's road
  for (let x = -72; x < -62; x += 1) {
    for (let z = -85; z < -78; z += 1) {
      const corners: P2[] = [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]];
      if (corners.some(([px, pz]) => Math.hypot(px - RING_C[0], pz - RING_C[1]) < 8.85)) continue;
      // in the gate's frame: outside the wall, or in the opening, and clear of the gatehouse
      const local = corners.map(([px, pz]): P2 => [(px - G[0]) * X[0] + (pz - G[1]) * X[1], (px - G[0]) * F[0] + (pz - G[1]) * F[1]]);
      if (local.some(([, lz]) => lz < -0.25)) continue;
      if (local.some(([lx, lz]) => lx < LODGE.x1 + 0.3 && lz < LODGE.z1 + 0.1)) continue;
      const v = corners.map(([px, pz]): V3 => [px, landAt(px, pz) + 0.045, pz]);
      b.quad(v[3], v[2], v[1], v[0], [0, 1, 0], SETT);
    }
  }
}

/** A stone wall along a line of corners, following the ground, with iron railings on it and a pier every so often. */
function fence(k: Build, line: P2[]): void {
  const b = k.b, rail: V3[] = [], bars: V3[] = [];
  let run = 0;
  for (let i = 0; i + 1 < line.length; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1], len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / 2.2)), yaw = Math.atan2(bz - az, bx - ax);
    for (let j = 0; j < n; j++) {
      const t0 = j / n, t1 = (j + 1) / n, x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
      const g0 = landAt(x0, z0), g1 = landAt(x1, z1), gm = landAt((x0 + x1) / 2, (z0 + z1) / 2), lo = Math.min(g0, g1, gm) - 0.4, top = Math.max(g0, g1, gm) + 1.0;
      b.obox((x0 + x1) / 2, (lo + top) / 2, (z0 + z1) / 2, len / n / 2, (top - lo) / 2, 0.25, yaw, WALL, { top: STONE_TRIM });
      rail.push([x0, Math.max(g0, gm) + 2.35, z0]);
      // bars every unit and a half or so
      const m = Math.max(1, Math.round(len / n / 1.5));
      for (let q = 0; q < m; q++) {
        const f = (q + 0.5) / m, x = x0 + (x1 - x0) * f, z = z0 + (z1 - z0) * f;
        bars.push([x, top, z]);
      }
      run += len / n;
      if (run > 6.5) {
        run = 0;
        b.obox(x0, g0 + 1.15, z0, 0.42, 1.55, 0.42, yaw, WALL_DARK, { top: STONE_TRIM });
      }
    }
  }
  const [ex, ez] = line[line.length - 1], ge = landAt(ex, ez);
  rail.push([ex, ge + 2.35, ez]);
  b.obox(ex, ge + 1.15, ez, 0.42, 1.55, 0.42, 0, WALL_DARK, { top: STONE_TRIM });
  b.sweep(rail, rail.map(() => 0.06), IRON);
  for (const p of bars) b.beam(p, [p[0], p[1] + 1.55, p[2]], 0.045, 0.02, IRON);
}

// ---------------------------------------------------------------------------
// The Trigate Bridge
// ---------------------------------------------------------------------------

interface Sample { x: number; y: number; z: number; tx: number; tz: number; d: number }

/** Points along an arm's middle from the ring outward, a unit and a half apart, with the way it runs. */
function armOf(path: Path, fromEnd: boolean, upTo: number): Sample[] {
  const v = new THREE.Vector3(), w = new THREE.Vector3(), out: Sample[] = [];
  for (let d = 2; d <= Math.min(upTo, path.length - 0.6); d += 1.5) {
    const s = fromEnd ? path.length - d : d;
    path.at(s, v);
    path.at(fromEnd ? s - 0.5 : s + 0.5, w);
    const l = Math.hypot(w.x - v.x, w.z - v.z) || 1;
    out.push({ x: v.x, y: v.y, z: v.z, tx: (w.x - v.x) / l, tz: (w.z - v.z) / l, d });
  }
  return out;
}

/** How far a place on the ground is from the middle of the nearest lane that runs on the ground near it. */
function toGroundLane(x: number, y: number, z: number): number {
  let d = Infinity;
  for (const line of Object.values(LANES)) for (const p of line) if (Math.abs(p[1] - y) < 2) d = Math.min(d, Math.hypot(p[0] - x, p[2] - z));
  return d;
}

function trigate(k: Build, l: Lot): void {
  const b = k.b, [cx, cz] = TRIGATE.c, Y0 = l.base, DECK = Y0 - 0.02, THICK = 0.85, UNDER = DECK - THICK - 0.2;
  const R_OUT = 11.6, R_PAR = 11.4, R_IN = 4.0;

  // ---- the arms, and the angles at which they leave the ring
  const arms: { id: string; s: Sample[] }[] = [
    { id: 'uptown', s: armOf(MIDDLES.river, false, 40) },
    { id: 'bristol', s: armOf(MIDDLES.circuit, true, 22) },
    { id: 'arkham', s: armOf(MIDDLES['arkham-arm'], false, 30) },
  ];
  const angles = arms.map((a) => Math.atan2(a.s[0].z - cz, a.s[0].x - cx));
  const GAP = Math.asin(5.9 / R_PAR);

  // ---- the pier: a great round drum of stone with three cutwaters, between the arms, and a corbel that flares out under the deck
  b.cyl(cx, cz, -1.6, 2.2, 5.0, 5.0, 12, STONE, { cap: false });
  b.cyl(cx, cz, -0.9, -0.45, 5.22, 5.22, 12, STONE_DARK, { cap: false });
  b.cyl(cx, cz, 1.0, 1.25, 5.12, 5.12, 12, STONE_TRIM, { cap: false });
  b.cyl(cx, cz, 2.2, UNDER - 0.02, 5.0, 6.4, 12, STONE_TRIM);
  const sorted = [...angles].sort((a, c) => a - c);
  for (let i = 0; i < 3; i++) {
    const a0 = sorted[i], a1 = i === 2 ? sorted[0] + PI * 2 : sorted[i + 1], a = (a0 + a1) / 2;
    const d: P2 = [Math.cos(a), Math.sin(a)], e: P2 = [-d[1], d[0]];
    const tip: V3 = [cx + d[0] * 7.8, 1.3, cz + d[1] * 7.8];
    const A: V3 = [cx + d[0] * 4.2 + e[0] * 2.3, 1.3, cz + d[1] * 4.2 + e[1] * 2.3], C: V3 = [cx + d[0] * 4.2 - e[0] * 2.3, 1.3, cz + d[1] * 4.2 - e[1] * 2.3];
    const low = (p: V3): V3 => [p[0], -1.6, p[2]];
    for (const [p, q] of [[A, tip], [tip, C]]) {
      // the side faces away from the cutwater's own middle line
      const mx = (p[0] + q[0]) / 2 - (cx + d[0] * 5.5), mz = (p[2] + q[2]) / 2 - (cz + d[1] * 5.5);
      const nx = -(q[2] - p[2]), nz = q[0] - p[0], nl = Math.hypot(nx, nz), sgn = nx * mx + nz * mz > 0 ? 1 : -1;
      b.quad(low(p), low(q), q, p, [(sgn * nx) / nl, 0, (sgn * nz) / nl], STONE);
    }
    // its cap slopes up to the drum
    const P: V3 = [cx + d[0] * 4.4, 2.15, cz + d[1] * 4.4];
    for (const [p, q] of [[A, tip], [tip, C]]) {
      const u: V3 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], w: V3 = [P[0] - p[0], P[1] - p[1], P[2] - p[2]];
      let n: V3 = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      if (n[1] < 0) n = [-n[0], -n[1], -n[2]];
      const nl = Math.hypot(...n);
      tri(b, p, q, P, [n[0] / nl, n[1] / nl, n[2] / nl], STONE_TRIM);
    }
  }

  // ---- the ring's deck, its fascia, its underside, and the steel brackets that carry it out from the corbel
  const N = 30;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * PI * 2, a1 = ((i + 1) / N) * PI * 2, am = (a0 + a1) / 2;
    const P = (r: number, a: number, y: number): V3 => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
    b.quad(P(R_IN, a0, DECK), P(R_OUT, a0, DECK), P(R_OUT, a1, DECK), P(R_IN, a1, DECK), [0, 1, 0], STONE_LIGHT);
    b.quad(P(6.2, a0, UNDER), P(R_OUT, a0, UNDER), P(R_OUT, a1, UNDER), P(6.2, a1, UNDER), [0, -1, 0], STONE_DARK);
    b.quad(P(R_OUT, a0, UNDER), P(R_OUT, a1, UNDER), P(R_OUT, a1, DECK), P(R_OUT, a0, DECK), [Math.cos(am), 0, Math.sin(am)], STONE);
    b.quad(P(R_OUT + 0.06, a0, UNDER + 0.25), P(R_OUT + 0.06, a1, UNDER + 0.25), P(R_OUT + 0.06, a1, UNDER + 0.42), P(R_OUT + 0.06, a0, UNDER + 0.42), [Math.cos(am), 0, Math.sin(am)], STONE_TRIM);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2 + PI / 12;
    if (angles.some((g) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < 0.5)) continue;
    const c = Math.cos(a), s = Math.sin(a);
    b.beam([cx + c * 5.05, 0.6, cz + s * 5.05], [cx + c * 10.9, UNDER - 0.05, cz + s * 10.9], 0.16, 0.12, STEEL);
    b.beam([cx + c * 6.6, UNDER - 0.05, cz + s * 6.6], [cx + c * 8.4, 1.75, cz + s * 8.4], 0.08, 0.08, STEEL);
  }

  // ---- the ring's outer parapet, open where the arms join it, with a lamp on each stretch
  const gaps = angles.map((g) => [g - GAP, g + GAP]).sort((p, q) => p[0] - q[0]);
  for (let i = 0; i < gaps.length; i++) {
    const from = gaps[i][1], to = gaps[(i + 1) % gaps.length][0] + (i + 1 === gaps.length ? PI * 2 : 0);
    const n = Math.max(1, Math.ceil(((to - from) * R_PAR) / 2));
    for (let j = 0; j < n; j++) {
      const a0 = from + ((to - from) * j) / n, a1 = from + ((to - from) * (j + 1)) / n;
      slab(b, [cx + Math.cos(a0) * R_PAR, DECK + 0.95, cz + Math.sin(a0) * R_PAR], [cx + Math.cos(a1) * R_PAR, DECK + 0.95, cz + Math.sin(a1) * R_PAR], 0.15, 0.95, STONE_TRIM, { under: STONE });
    }
    const am = (from + to) / 2;
    gasLamp(k, cx + Math.cos(am) * R_PAR, DECK + 0.95 + 2.3, cz + Math.sin(am) * R_PAR, 2.3, SODIUM);
  }

  // ---- the ring's island: a drum of stone with a coping, and a cluster of three old lamps on it
  b.cyl(cx, cz, DECK - 0.01, TRIGATE_ISLAND_TOP - 0.16, 4.2, 4.2, 20, STONE);
  b.cyl(cx, cz, TRIGATE_ISLAND_TOP - 0.16, TRIGATE_ISLAND_TOP, 4.35, 4.35, 20, STONE_TRIM, { cap: 0x6a6d74 });
  solid(b, cx - 0.55, TRIGATE_ISLAND_TOP, cz - 0.55, cx + 0.55, TRIGATE_ISLAND_TOP + 0.5, cz + 0.55, STONE_TRIM);
  b.beam([cx, TRIGATE_ISLAND_TOP + 0.5, cz], [cx, TRIGATE_ISLAND_TOP + 3.5, cz], 0.14, 0.09, IRON_DARK);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2 + angles[0] + PI / 3, x = cx + Math.cos(a) * 0.85, z = cz + Math.sin(a) * 0.85;
    b.beam([cx, TRIGATE_ISLAND_TOP + 3.1, cz], [x, TRIGATE_ISLAND_TOP + 3.45, z], 0.06, 0.05, IRON_DARK);
    b.box(x - 0.2, TRIGATE_ISLAND_TOP + 3.45, z - 0.2, x + 0.2, TRIGATE_ISLAND_TOP + 3.55, z + 0.2, IRON_DARK, { faces: 'NESWTB' });
    k.glows.push({ x, y: TRIGATE_ISLAND_TOP + 3.85, z, sx: 0.34, sy: 0.46, sz: 0.34, color: SODIUM });
    b.cyl(x, z, TRIGATE_ISLAND_TOP + 4.1, TRIGATE_ISLAND_TOP + 4.4, 0.28, 0.05, 6, IRON_DARK);
  }
  k.lights.push({ x: cx, z: cz, r: 13, color: SODIUM, k: 0.5 });

  // ---- each arm: its deck, its parapets and lamps, its abutment, its two steel arch ribs, and columns where it runs over low land
  const low = (x: number, z: number, y: number): boolean => groundAt(x, z) < y - 0.6;
  for (const arm of arms) {
    const S = arm.s, side = (p: Sample, across: number): P2 => [p.x - p.tz * across, p.z + p.tx * across];
    let last = -1, iw = -1;
    S.forEach((p, i) => {
      if ([-5.9, 0, 5.9].some((a) => { const [x, z] = side(p, a); return low(x, z, p.y); })) last = i;
      if (groundAt(p.x, p.z) < 0) iw = i;
    });
    const end = Math.min(last + 1, S.length - 1);
    // the deck lies a hair under the road, and under its lanes where they are eased lower than the road's middle
    const laneLow = S.map((p) => {
      let y = p.y;
      for (const line of Object.values(LANES)) for (const q of line) if (Math.abs(q[1] - p.y) < 1.5 && Math.hypot(q[0] - p.x, q[2] - p.z) < 4.5) y = Math.min(y, q[1]);
      return y;
    });
    const deckY = (p: Sample): number => Math.min(p.y, laneLow[S.indexOf(p)] ?? p.y) - 0.035;
    // the deck
    for (let i = 0; i < end; i++) {
      const p = S[i], q = S[i + 1];
      slab(b, [p.x, deckY(p), p.z], [q.x, deckY(q), q.z], 6.05, THICK, STONE_LIGHT, { under: STONE_DARK });
    }
    // the parapets, in runs where the ground under them is low, with a lamp every few units
    const runs: { s: number; i0: number; i1: number }[] = [];
    for (const s of [-1, 1]) {
      let i0 = -1;
      for (let i = 0; i <= end; i++) {
        const p = S[Math.min(i, end - 1)], q = S[Math.min(i + 1, end)];
        const [mx, mz] = side({ ...p, x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 }, s * 5.75);
        const want = i < end && low(mx, mz, (p.y + q.y) / 2);
        if (want && i0 < 0) i0 = i;
        if ((!want || i === end) && i0 >= 0) { runs.push({ s, i0, i1: want ? i + 1 : i }); i0 = -1; }
      }
    }
    for (const r of runs) {
      for (let i = r.i0; i < r.i1; i += 3) {
        const j = Math.min(i + 3, r.i1), p = S[i], q = S[j];
        // the run's first piece reaches back to meet the ring's parapet
        const back = i === 0 ? 0.35 : 0;
        const [ax, az] = side({ ...p, x: p.x - p.tx * back, z: p.z - p.tz * back }, r.s * 5.75), [qx, qz] = side(q, r.s * 5.75);
        slab(b, [ax, deckY(p) + 0.95, az], [qx, deckY(q) + 0.95, qz], 0.15, 0.95, STONE_TRIM, { under: STONE });
      }
      for (let i = r.i0 + 2; i < r.i1; i += 5) {
        const p = S[i], [x, z] = side(p, r.s * 5.75), y = deckY(p) + 0.95 + 2.3;
        // within the bridge's lot, or no more than 8 over the ground under it
        const inLot = x > l.x0 && x < l.x1 && z > l.z0 && z < l.z1;
        if (!inLot && y + 0.5 > Math.max(0, groundAt(x, z)) + 8) continue;
        gasLamp(k, x, y, z, 2.3, SODIUM);
      }
    }
    // the name, on the parapet of the arm that faces the view across the water
    if (arm.id === 'bristol') {
      const r = runs.filter((q) => q.s > 0).sort((p, q) => q.i1 - q.i0 - (p.i1 - p.i0))[0];
      if (r) {
        const p = S[r.i0], q = S[r.i1], len = Math.hypot(q.x - p.x, q.z - p.z);
        const m: Sample = { ...p, x: (p.x + q.x) / 2, z: (p.z + q.z) / 2, y: (p.y + q.y) / 2 };
        const nx = -m.tz, nz = m.tx, yc = deckY(m) + 0.12;
        // a dark board hung on the parapet and the deck's fascia, clear of both, and the letters a hair before it
        const [bx, bz] = side(m, 6.15), [sx, sz] = side(m, 6.23);
        const w = k.sign('arkham-trigate', sx, yc, sz, nx, nz, 0.95, len - 0.8);
        b.obox(bx, yc, bz, w / 2 + 0.15, 0.95 / 2 + 0.12, 0.05, Math.atan2(m.tz, m.tx), DARK, { faces: 'B' });
      }
    }
    // the abutment where the arm comes ashore, and the arch ribs from the pier to it
    if (iw >= 0 && iw + 1 < S.length) {
      const A = S[Math.min(iw + 1, end)], ab = deckY(A) - THICK - 0.05;
      slab(b, [A.x - A.tx * 0.9, ab, A.z - A.tz * 0.9], [A.x + A.tx * 0.9, ab, A.z + A.tz * 0.9], 6.25, ab + 1.6, STONE, { under: STONE });
      const dir: P2 = [S[0].tx, S[0].tz];
      const s0 = 5.25, s1 = 8 + A.d - 0.95;
      const deckAt = (s: number): number => {
        const d = s - 8;
        if (d <= S[0].d) return deckY(S[0]);
        for (let i = 0; i + 1 < S.length; i++) if (d <= S[i + 1].d) { const f = (d - S[i].d) / (S[i + 1].d - S[i].d); return deckY(S[i]) + (deckY(S[i + 1]) - deckY(S[i])) * f; }
        return deckY(S[S.length - 1]);
      };
      const crown = deckAt((s0 + s1) / 2) - THICK - 0.35;
      const ribs: V3[][] = [];
      for (const across of [-4.2, 4.2]) {
        const pts: V3[] = [];
        const footB = Math.max(0.15, groundAt(cx + dir[0] * s1 - dir[1] * across, cz + dir[1] * s1 + dir[0] * across) + 0.15);
        for (let i = 0; i <= 10; i++) {
          const u = i / 10, s = s0 + (s1 - s0) * u, foot = 0.15 + (footB - 0.15) * u;
          const y = Math.min(foot + (crown - foot) * (1 - (2 * u - 1) * (2 * u - 1)), deckAt(s) - THICK - 0.25);
          pts.push([cx + dir[0] * s - dir[1] * across, y, cz + dir[1] * s + dir[0] * across]);
        }
        b.sweep(pts, pts.map(() => 0.27), STEEL);
        ribs.push(pts);
        // the posts between the rib and the deck
        for (let i = 2; i <= 8; i += 2) {
          const p = pts[i], s = s0 + ((s1 - s0) * i) / 10, top = deckAt(s) - THICK;
          if (top - p[1] > 0.45) b.beam([p[0], p[1] + 0.2, p[2]], [p[0], top, p[2]], 0.1, 0.1, STEEL);
        }
      }
      for (const i of [3, 5, 7]) b.beam(ribs[0][i], ribs[1][i], 0.09, 0.09, STEEL);
    }
    // columns where the deck runs on beyond its abutment over low ground or water
    for (let i = Math.max(0, iw + 3); i <= end; i += 2) {
      const p = S[i], bottom = deckY(p) - THICK;
      for (const across of [-4.4, 4.4]) {
        const [x, z] = side(p, across), g = groundAt(x, z), base = g < 0 ? -1.4 : g - 0.1;
        if (bottom - Math.max(g, -0.9) < 1.0) continue;
        if (g >= 0 && toGroundLane(x, g, z) < 4.5) continue;
        b.box(x - 0.3, base, z - 0.3, x + 0.3, bottom, z + 0.3, STONE, { faces: 'NESW' });
        solid(b, x - 0.42, bottom - 0.3, z - 0.42, x + 0.42, bottom, z + 0.42, STONE_TRIM, 'NESWB');
      }
    }
  }
}

// ---------------------------------------------------------------------------
// The island: the drive, the terrace, the yards, the glasshouse, the boathouse, the path, the woods and the rocks
// ---------------------------------------------------------------------------

/** Footprints this file builds outside its lots, which trees keep clear of. */
const BUILT: { x0: number; z0: number; x1: number; z1: number }[] = [];
/** Lines this file lays, which trees keep clear of: the walls, the drive, the path. */
const LINES: { pts: P2[]; room: number }[] = [];

function toLine(x: number, z: number, pts: P2[]): number {
  let d = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], vx = bx - ax, vz = bz - az, l = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l));
    d = Math.min(d, Math.hypot(x - ax - vx * t, z - az - vz * t));
  }
  return d;
}

const clearOfMine = (x: number, z: number, r: number): boolean =>
  !BUILT.some((q) => x > q.x0 - r && x < q.x1 + r && z > q.z0 - r && z < q.z1 + r) && !LINES.some((q) => toLine(x, z, q.pts) < q.room + r);

/** A band laid on the ground as built, along a line of corners: a drive, a path. */
function band(b: GeoBuilder, pts: P2[], half: number, lift: number, color: number): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / 0.8));
    const nx = (-(bz - az) / len) * half, nz = ((bx - ax) / len) * half;
    for (let j = 0; j < n; j++) {
      const p = (t: number, s: number): V3 => { const x = ax + (bx - ax) * t + nx * s, z = az + (bz - az) * t + nz * s; return [x, landAt(x, z) + lift, z]; };
      const t0 = j / n, t1 = (j + 1) / n;
      b.quad(p(t0, -1), p(t1, -1), p(t1, 1), p(t0, 1), [0, 1, 0], color);
    }
  }
}

export function extras(k: Build): void {
  const b = k.b, R = rng(0xa4c4a1);
  BUILT.length = 0;
  LINES.length = 0;
  Object.assign(PLACES, places(landAt));
  LINES.push({ pts: WALL_WEST, room: 0.8 }, { pts: WALL_EAST, room: 0.8 }, { pts: DRIVE, room: 1.6 });
  BUILT.push({ x0: TERRACE.x0, z0: TERRACE.z0, x1: TERRACE.x1, z1: TERRACE.z1 });

  // ---- the drive, from the gate up the slope and back along the terrace, and the terrace before the façade
  band(b, DRIVE, 1.0, 0.075, GRAVEL);
  flatPatch(b, TERRACE.x0, TERRACE.z0, TERRACE.x1, TERRACE.z1, landAt((TERRACE.x0 + TERRACE.x1) / 2, (TERRACE.z0 + TERRACE.z1) / 2) + 0.04, GRAVEL);
  // its kerb along the crag's edge, and lamps beside it
  for (let x = TERRACE.x0 + 0.6; x < TERRACE.x1 - 4; x += 2.4) solid(b, x, landAt(x, TERRACE.z1) - 0.1, TERRACE.z1 - 0.05, x + 2.1, landAt(x, TERRACE.z1) + 0.3, TERRACE.z1 + 0.2, STONE_TRIM, 'NESWT');
  for (const [x, z] of [[-75.9, -84.7], [-82.3, -86.4], [-72.6, -87.1]] as P2[]) gasLamp(k, x, landAt(x, z) + 2.5, z, 2.5, AMBER);

  // ---- two walled yards, on the low ground west of the drive, that stand empty
  for (const [x0, x1] of [[-102.4, -96.4], [-95.2, -89.2]]) {
    const z0 = -82.2, z1 = -74.6, g = lowest(x0, z0, x1, z1);
    BUILT.push({ x0, z0, x1, z1 });
    flatPatch(b, x0 + 0.3, z0 + 0.3, x1 - 0.3, z1 - 0.3, g + 0.05, YARD);
    const H = g + 2.7, t = 0.3;
    solid(b, x0, g - 0.4, z0, x1, H, z0 + t, WALL, 'NESWT');
    solid(b, x0, g - 0.4, z1 - t, x1, H, z1, WALL, 'NESWT');
    solid(b, x0, g - 0.4, z0 + t, x0 + t, H, z1 - t, WALL, 'EWT');
    // the east wall has its door, shut
    const zm = (z0 + z1) / 2;
    solid(b, x1 - t, g - 0.4, z0 + t, x1, H, zm - 0.7, WALL, 'EWT');
    solid(b, x1 - t, g - 0.4, zm + 0.7, x1, H, z1 - t, WALL, 'EWT');
    solid(b, x1 - t, g + 2.1, zm - 0.7, x1, H, zm + 0.7, WALL, 'EWTB');
    solid(b, x1 - t * 0.6, g, zm - 0.7, x1 - t * 0.4, g + 2.1, zm + 0.7, TIMBER_DARK, 'EW');
    for (const [p0, p1] of [[x0 - 0.06, x1 + 0.06]]) {
      solid(b, p0, H, z0 - 0.06, p1, H + 0.14, z0 + t + 0.06, STONE_TRIM);
      solid(b, p0, H, z1 - t - 0.06, p1, H + 0.14, z1 + 0.06, STONE_TRIM);
    }
  }

  // ---- the glasshouse: glass walls and a glass roof on an iron frame, on a low stone base
  {
    const x0 = -87, x1 = -80.4, z0 = -80.4, z1 = -76.2, g = lowest(x0, z0, x1, z1);
    BUILT.push({ x0, z0, x1, z1 });
    solid(b, x0 - 0.1, g - 0.4, z0 - 0.1, x1 + 0.1, g + 0.6, z1 + 0.1, WALL_DARK, 'NESWT');
    const e = g + 2.6;
    b.box(x0, g + 0.6, z0, x1, e, z1, GLASS, { faces: 'NESW' });
    const top = roof(b, x0, x1, z0, z1, e, 1.7, { color: GLASS, under: 0x3b4f5c, wall: GLASS, over: 0.12, ends: ['g', 'g'] });
    for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 6) {
      for (const z of [z0, z1]) b.beam([x, g + 0.6, z], [x, e, z], 0.05, 0.05, STEEL);
      b.beam([x, e, z0 - 0.05], [x, top, (z0 + z1) / 2], 0.04, 0.04, STEEL);
      b.beam([x, e, z1 + 0.05], [x, top, (z0 + z1) / 2], 0.04, 0.04, STEEL);
    }
    for (const x of [x0, x1]) for (const z of [z0 + 1.4, z1 - 1.4]) b.beam([x, g + 0.6, z], [x, e + 0.7 * (1 - Math.abs(z - (z0 + z1) / 2) / ((z1 - z0) / 2)), z], 0.05, 0.05, STEEL);
    // the plants inside, dark green against the glass
    for (let i = 0; i < 5; i++) solid(b, x0 + 0.6 + i * 1.2, g + 0.6, z0 + 0.8, x0 + 1.3 + i * 1.2, g + 1.3 + (i % 2) * 0.5, z1 - 0.8, 0x2e4a2c, 'NESWT');
  }

  // ---- the boathouse and the quay on the east shore, across the channel from Bristol
  {
    const sx = LANDS.mercey[1][0], x0 = sx - 6.2, x1 = sx - 0.4, z0 = -96.2, z1 = -91.6, g = lowest(x0, z0, x1, z1);
    BUILT.push({ x0, z0, x1: sx + 4.5, z1 });
    solid(b, x0 - 0.1, g - 0.4, z0 - 0.1, x1 + 0.1, g + 0.4, z1 + 0.1, WALL_DARK, 'NESWT');
    b.box(x0, g + 0.4, z0, x1, g + 3.2, z1, TIMBER_DARK, { faces: 'NSW' });
    b.box(x1 - 0.01, g + 0.4, z0, x1, g + 3.2, z1, TIMBER_DARK, { faces: 'E' });
    roof(b, x0, x1, z0, z1, g + 3.2, 1.7, { color: SLATE, wall: TIMBER, ends: ['g', 'g'], over: 0.35 });
    // its doors: one to the water, its arch lit within, and a small one on the path's side
    b.quad([x1 + 0.04, g + 0.45, z0 + 0.9], [x1 + 0.04, g + 0.45, z1 - 0.9], [x1 + 0.04, g + 2.7, z1 - 0.9], [x1 + 0.04, g + 2.7, z0 + 0.9], [1, 0, 0], DARK, { win: interior(0.9) });
    b.quad([x0 + 1.2, g + 0.45, z1 + 0.04], [x0 + 2.2, g + 0.45, z1 + 0.04], [x0 + 2.2, g + 2.3, z1 + 0.04], [x0 + 1.2, g + 2.3, z1 + 0.04], [0, 0, 1], DARK);
    gasLamp(k, x1 + 0.35, g + 3.0, (z0 + z1) / 2 + 2.6, 0, AMBER);
    // the quay: steps down the rock to a timber jetty on piles
    const jz0 = z0 - 2.2, jz1 = z0 - 0.9, jy = 0.65;
    slab(b, [sx - 2.4, g + 0.05, (jz0 + jz1) / 2], [sx + 0.2, jy + 0.05, (jz0 + jz1) / 2], (jz1 - jz0) / 2, 0.6, STONE_LIGHT, { under: STONE });
    solid(b, sx + 0.2, jy - 0.25, jz0, sx + 4.4, jy, jz1, TIMBER);
    for (const x of [sx + 1.2, sx + 2.8, sx + 4.2]) for (const z of [jz0 + 0.15, jz1 - 0.15]) b.cyl(x, z, -1.4, jy - 0.25, 0.14, 0.14, 6, TIMBER_DARK, { cap: false });
    for (const x of [sx + 2.0, sx + 4.1]) b.cyl(x, jz1 - 0.2, jy, jy + 0.45, 0.13, 0.11, 6, IRON_DARK);
    // a rowing boat at the jetty
    const bx = sx + 2.6, bz = jz1 + 0.9;
    b.box(bx - 1.3, -0.95, bz - 0.42, bx + 1.3, -0.45, bz + 0.42, TIMBER, { faces: 'NESW' });
    b.box(bx - 1.2, -0.62, bz - 0.34, bx + 1.2, -0.6, bz + 0.34, TIMBER_DARK, { faces: 'T' });
    for (const s of [-1, 1]) tri(b, [bx + s * 1.3, -0.95, bz - 0.42], [bx + s * 1.3, -0.95, bz + 0.42], [bx + s * 1.85, -0.42, bz], [s, 0.3, 0], TIMBER);
    for (const s of [-1, 1]) tri(b, [bx + s * 1.3, -0.45, bz - 0.42], [bx + s * 1.3, -0.45, bz + 0.42], [bx + s * 1.85, -0.42, bz], [0, 1, 0], TIMBER_DARK);
  }

  // ---- the path through the woods, from the ring's side to the boathouse
  const PATH: P2[] = [[-54.0, -82.6], [-50.5, -86.0], [-45.0, -89.4], [-40.0, -90.6], [-35.5, -90.9]];
  band(b, PATH, 0.6, 0.06, 0x5a5348);
  LINES.push({ pts: PATH, room: 1.0 });

  // ---- rocks along the shore: the south, under the arm, and the east
  {
    const shore = LANDS.mercey;
    for (let i = 0; i < shore.length; i++) {
      const [ax, az] = shore[i], [bx, bz] = shore[(i + 1) % shore.length], len = Math.hypot(bx - ax, bz - az);
      // the board's own edges have none
      if (Math.abs(az - bz) < 0.01 && az < -112) continue;
      if (Math.abs(ax - bx) < 0.01 && ax < -103) continue;
      const ox = (bz - az) / len, oz = -(bx - ax) / len;
      for (let s = 2; s < len - 1; s += 3.2 + R() * 2.5) {
        const x = ax + ((bx - ax) * s) / len + ox * (0.5 + R() * 0.6), z = az + ((bz - az) * s) / len + oz * (0.5 + R() * 0.6);
        if (!(groundAt(x, z) < 0)) continue;
        if (Math.hypot(x - TRIGATE.c[0], z - TRIGATE.c[1]) < 26 || !clearOfMine(x, z, 1.5)) continue;
        const r = 0.6 + R() * 0.8;
        b.cyl(x, z, -1.4, -0.4 + R() * 1.2, r, r * 0.55, 5, R() > 0.5 ? ROCK : ROCK_DARK, { phase: R() * PI, cap: ROCK_LIGHT });
      }
    }
  }

  // ---- the woods: pines on the low ground and the slopes, and dark bare trees among them
  const OWN: string[] = [];
  const room = (x: number, z: number, y: number): number => ceilingAt(x, z) - 0.4 - y;
  const plantPine = (x: number, z: number, s: number): boolean => {
    if (!open(x, z, 1.0, OWN) || !clearOfMine(x, z, 0.8)) return false;
    const y = landAt(x, z);
    const size = Math.min(s, room(x, z, y) / 9);
    if (size < 0.3) return false;
    k.tree(x, z, size, true, y);
    return true;
  };
  const plantBare = (x: number, z: number, h: number): boolean => {
    if (!open(x, z, 1.2, OWN) || !clearOfMine(x, z, 1.0)) return false;
    const y = landAt(x, z), hh = Math.min(h, room(x, z, y));
    if (hh < 3) return false;
    bareTree(b, x, y, z, hh, R);
    return true;
  };
  // the north-east woods, outside the wall
  for (let i = 0; i < 70; i++) plantPine(-55 + R() * 23.5, -112 + R() * 30, 0.55 + R() * 0.35);
  for (let i = 0; i < 9; i++) plantBare(-54 + R() * 21, -110 + R() * 24, 5 + R() * 2);
  // the grounds within the wall, south and west of the crag: a few, kept off the drive, the yards and the glasshouse
  for (let i = 0; i < 26; i++) plantPine(-103 + R() * 26, -86 + R() * 18.5, 0.5 + R() * 0.3);
  for (let i = 0; i < 6; i++) plantBare(-103 + R() * 27, -86 + R() * 18, 4.5 + R() * 2);
  // the crag's slopes and its back, under the ceiling
  for (let i = 0; i < 30; i++) {
    const x = -100 + R() * 40, z = -112 + R() * 12;
    plantPine(x, z, 0.45 + R() * 0.25);
  }
  for (let i = 0; i < 3; i++) plantBare(-62 + R() * 4, -102 + R() * 12, 4.5 + R());
  // the crag's west slope
  for (let i = 0; i < 12; i++) plantPine(-103.5 + R() * 6, -104 + R() * 18, 0.45 + R() * 0.25);
  for (let i = 0; i < 3; i++) plantBare(-103.5 + R() * 6, -102 + R() * 15, 4 + R() * 1.5);
  // between the ring and the wall, outside it
  for (let i = 0; i < 6; i++) plantPine(-79 + R() * 10, -72 + R() * 7, 0.5 + R() * 0.25);
}

/** A level patch of paving over a rectangle, at `y`, with its little kerb faces down to the ground. */
function flatPatch(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y: number, color: number): void {
  b.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], color);
}
