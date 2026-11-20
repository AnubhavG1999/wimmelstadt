// The Augustan ground column, which is the tile's traffic (GS 39): hover
// skiffs carrying Gray infantry, speederbikes (gravBikes that float half a
// metre up on thrusters), and supply haulers, all floating, so that gliding
// along the roads is right for them; and spider tanks, which walk on legs that
// move, on paths of their own beside the roads. The books give none of their
// looks: they are the tile's own drawing, in the Augustan colours.
//
// Every kind floats: its hull hangs half a unit or more over the road on
// thruster pads, and nothing of it touches the road but a faint skirt of glow
// under each pad, which is bright by night. Each follows `TrafficKind` in
// tile.ts: nose along +x, standing on y = 0, its middle over (0, 0), paint
// given in white, trim in its own colours (the Grays' grey, dark metal, the
// red and gold of House Augustus).
//
// The spider tanks are meshes of their own: two walk a round on the south
// flank in a tripod gait, each foot planted on the ground as built while it
// carries weight, and two stand parked in the camp's motor pool.

import * as THREE from 'three';
import type { TrafficKind, Build } from '../../engine/tile';
import { PART, boxAt, shapeFrom, shapePart, sideProfile } from '../../engine/vehicles';
import { CAMP, SPIDER_PATROL, type P2 } from './plan';
import { landAt } from './land';
import { AUGUSTUS_GOLD, AUGUSTUS_RED } from './look';

type G = THREE.BufferGeometry;
type V3 = [number, number, number];

// ---------------------------------------------------------------------------
// Colours and pieces
// ---------------------------------------------------------------------------

/** The Augustan army's paint: greys and grey-greens, and one dark red. */
const ARMY = [0x6b6f63, 0x5d6158, 0x737a6a, 0x646b5c, 0x7a7c78, 0x6e211c];
const DARKRED = 0x6e211c;
/** Dark metal, the underside's darker still, and gunmetal. */
const METAL = 0x3a3d42, UNDER = 0x2c2e33, GUNMETAL = 0x4b4f55;
/** The Grays: grey uniforms, darker helmets, black visors. */
const GRAY = 0x8b9096, HELMET = 0x5a5f66, VISOR = 0x1d242c;
/** Thruster glow: pale blue, lit by the engine's lamp shader so that it burns bright by night. */
const GLOW = 0xa8dcff;
const OLIVE = 0x6a6a48, CRATE = 0x5e6448, CRATE_LIGHT = 0x7a7658, FUEL = 0xc9a23e;

const paint = (g: G): G => shapePart(g, PART.paint, 0xffffff);
const trim = (g: G, c: number): G => shapePart(g, PART.trim, c);
const glass = (g: G, c = 0x1c2733): G => shapePart(g, PART.glass, c);
const head = (g: G, c = 0xfff4d6): G => shapePart(g, PART.head, c);
const tail = (g: G): G => shapePart(g, PART.tail, 0xc81e1e);

const UP = new THREE.Vector3(0, 1, 0);

/** A tapered rod from one point to another, square in section unless given more sides. */
function rod(a: V3, b: V3, ra: number, rb: number, sides = 4): G {
  const from = new THREE.Vector3(...a), dir = new THREE.Vector3(...b).sub(from);
  const len = dir.length();
  return new THREE.CylinderGeometry(rb, ra, len, sides, 1)
    .rotateY(Math.PI / sides)
    .translate(0, len / 2, 0)
    .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()))
    .translate(from.x, from.y, from.z);
}

/** A side profile (x along, y up) pushed out to a width, standing at a place across. */
const side = (pts: P2[], width: number, z = 0): G => sideProfile(pts, width).translate(0, 0, z);

/** A plan (x along, z across) pushed up from y0 to y1. */
function plan(pts: P2[], y0: number, y1: number): G {
  const d = y1 - y0;
  return sideProfile(pts.map(([x, z]): P2 => [x, -z]), d).rotateX(-Math.PI / 2).translate(0, y0 + d / 2, 0);
}

/** A box turned about the across axis, so its top leans forward by `a` radians. */
const leaning = (sx: number, sy: number, sz: number, a: number, x: number, y: number, z: number): G =>
  new THREE.BoxGeometry(sx, sy, sz).rotateZ(-a).translate(x, y, z);

/**
 * A thin strip lying on a sloped face of a profile, from p0 (low and forward)
 * to p1 (high and back), between shares t0 and t1 of it, standing 0.04 proud:
 * a windscreen or a vision slit.
 */
function strip(p0: P2, p1: P2, t0: number, t1: number, width: number, z = 0): G {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy);
  const nx = dy / l, ny = -dx / l;
  const at = (t: number, o: number): P2 => [p0[0] + dx * t + nx * o, p0[1] + dy * t + ny * o];
  return side([at(t0, -0.03), at(t1, -0.03), at(t1, 0.04), at(t0, 0.04)], width, z);
}

/** A thruster pad under the hull at (x, z), its underside at `y`, and the cone of glow under it down to just above the road. */
function thruster(x: number, z: number, r: number, y: number): G[] {
  return [
    // both open at their ends: the pad's top is in the hull, the cone's top in the pad, and its foot faces the road
    trim(new THREE.CylinderGeometry(r, r * 0.9, 0.24, 8, 1, true).translate(x, y + 0.1, z), UNDER),
    head(new THREE.CylinderGeometry(r * 0.78, r * 1.15, y - 0.06, 8, 1, true).translate(x, 0.08 + (y - 0.06) / 2, z), GLOW),
  ];
}

/** A Gray sitting, facing forward: a body in the uniform, a helmet with its visor, and a rifle held upright. */
function gray(x: number, seat: number, z: number, rifleSide: number): G[] {
  return [
    trim(boxAt(0.5, 0.74, 0.56, x, seat + 0.37, z), GRAY),
    trim(boxAt(0.42, 0.4, 0.42, x + 0.02, seat + 0.92, z), HELMET),
    glass(boxAt(0.06, 0.14, 0.34, x + 0.23, seat + 0.9, z), VISOR),
    trim(rod([x + 0.32, seat + 0.1, z + rifleSide * 0.2], [x + 0.12, seat + 1.32, z + rifleSide * 0.24], 0.08, 0.06, 3), METAL),
  ];
}

/** A pair of lamps at the nose and a pair at the tail, `half` apart from the middle. */
function lamps(nose: number, tl: number, yh: number, yt: number, half: number): G[] {
  const out: G[] = [];
  for (const s of [-1, 1]) {
    out.push(head(boxAt(0.16, 0.24, 0.5, nose, yh, s * half)));
    out.push(tail(boxAt(0.16, 0.2, 0.55, tl, yt, s * half)));
  }
  return out;
}

/** House Augustus's red with a stripe of gold, on both flanks: a mark of the column. */
function mark(x: number, y: number, len: number, h: number, zFace: number): G[] {
  const out: G[] = [];
  for (const s of [-1, 1]) {
    out.push(trim(boxAt(len, h, 0.08, x, y, s * (zFace + 0.01)), AUGUSTUS_RED));
    out.push(trim(boxAt(len, 0.08, 0.1, x, y - h / 2 + 0.12, s * (zFace + 0.02)), AUGUSTUS_GOLD));
  }
  return out;
}

// ---------------------------------------------------------------------------
// The kinds
// ---------------------------------------------------------------------------

/** The lower hull every floating kind shares: a flat-bottomed armoured tub that rises to a blunt nose, its deck at `deck`. */
const tub = (L: number, W: number, deck: number): G =>
  paint(side([[-L, 0.78], [-L + 0.3, 0.55], [L - 1.0, 0.55], [L, 1.15], [L, deck], [-L, deck]], W));

/**
 * A hover skiff carrying Gray infantry: an open armoured hull with eight Grays
 * sitting in two rows behind a sloped bow plate, a pintle gun on the bow, and
 * four thrusters under it.
 */
function skiff(): G[] {
  const L = 3.6, W = 3.0, D = 1.5;
  const out: G[] = [tub(L, W, D)];
  // the walls, sloping down to the nose, and the bow plate between them
  for (const s of [-1, 1]) out.push(paint(side([[-3.5, D - 0.05], [3.5, D - 0.05], [2.3, 2.15], [-3.5, 2.15]], 0.22, s * 1.32)));
  out.push(
    paint(side([[2.25, D - 0.05], [3.48, D - 0.05], [2.28, 2.08], [2.02, 2.08]], 2.5)),
    paint(boxAt(0.22, 0.7, 2.5, -3.39, 1.8, 0)),
    // the rims of the walls, dark
    ...[-1, 1].map((s) => trim(boxAt(5.565, 0.08, 0.3, -0.4575, 2.19, s * 1.32), METAL)),
    trim(boxAt(0.3, 0.08, 2.9, -3.39, 2.19, 0), METAL),
    // the floor; the benches they sit on are hidden by the walls
    trim(boxAt(6.2, 0.06, 2.42, -0.2, D + 0.02, 0), UNDER),
  );
  // six Grays in two rows, rifles upright on the outer side
  for (const x of [-2.55, -1.3, -0.05]) for (const s of [-1, 1]) out.push(...gray(x, D + 0.26, s * 0.62, s));
  // the pintle gun on its post over the bow, behind a small shield
  out.push(
    trim(rod([1.65, D, 0], [1.65, 2.45, 0], 0.09, 0.08, 6), METAL),
    trim(boxAt(0.9, 0.26, 0.26, 1.95, 2.55, 0), GUNMETAL),
    trim(boxAt(0.08, 0.5, 0.8, 1.55, 2.62, 0), METAL),
    trim(rod([2.38, 2.56, 0], [3.35, 2.6, 0], 0.07, 0.06, 6), METAL),
  );
  out.push(...mark(-0.4, 1.86, 1.4, 0.36, 1.43));
  for (const x of [-2.3, 2.0]) for (const s of [-1, 1]) out.push(...thruster(x, s * 0.92, 0.45, 0.58));
  out.push(...lamps(3.62, -3.62, 1.33, 1.25, 0.9));
  return out;
}

/** A gravBike: a narrow speederbike floating on two thrusters, its Gray rider leaning forward over the bars. */
function gravBike(): G[] {
  const out: G[] = [
    // the body, a wedge, and the wider fairing round the front thruster
    paint(side([[-1.8, 0.8], [-1.55, 0.6], [0.9, 0.6], [1.8, 0.85], [1.75, 1.05], [0.9, 1.22], [0.3, 1.42], [-0.6, 1.38], [-1.8, 1.24]], 0.86)),
    paint(side([[0.15, 0.62], [1.45, 0.7], [1.62, 0.95], [0.55, 1.18]], 1.3)),
    trim(side([[-1.75, 0.66], [-1.0, 0.62], [-1.1, 1.0], [-1.7, 1.1]], 1.16), UNDER),
    glass(side([[0.6, 1.3], [0.98, 1.2], [0.62, 1.72]], 0.7)),
    trim(boxAt(0.9, 0.12, 0.6, -0.55, 1.44, 0), UNDER),
    trim(boxAt(0.1, 0.1, 1.1, 0.45, 1.58, 0), METAL),
    // the rear nozzle, glowing
    trim(new THREE.CylinderGeometry(0.26, 0.3, 0.3, 8).rotateZ(Math.PI / 2).translate(-1.7, 0.9, 0), UNDER),
    head(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 8).rotateZ(Math.PI / 2).translate(-1.87, 0.9, 0), GLOW),
    // the rider: legs, body leaning forward, arms to the bars, helmet and a rifle slung across the back
    ...[-1, 1].flatMap((s) => [
      trim(rod([-0.45, 1.55, s * 0.28], [0.15, 1.25, s * 0.42], 0.15, 0.13), GRAY),
      trim(rod([0.15, 1.25, s * 0.42], [-0.1, 0.8, s * 0.48], 0.13, 0.11), METAL),
      trim(rod([0.1, 2.25, s * 0.3], [0.45, 1.6, s * 0.48], 0.1, 0.08), GRAY),
    ]),
    trim(leaning(0.46, 0.86, 0.62, 0.62, -0.15, 1.96, 0), GRAY),
    trim(boxAt(0.42, 0.4, 0.42, 0.32, 2.4, 0), HELMET),
    glass(boxAt(0.06, 0.14, 0.34, 0.54, 2.37, 0), VISOR),
    trim(rod([-0.55, 1.9, -0.36], [0.05, 2.5, 0.36], 0.06, 0.05), METAL),
    trim(boxAt(0.7, 0.06, 0.04, -0.6, 1.1, 0.45), AUGUSTUS_RED),
    trim(boxAt(0.7, 0.06, 0.04, -0.6, 1.1, -0.45), AUGUSTUS_RED),
    head(boxAt(0.12, 0.2, 0.42, 1.8, 0.96, 0)),
    tail(boxAt(0.1, 0.12, 0.6, -1.77, 1.18, 0)),
  ];
  out.push(...thruster(1.0, 0, 0.42, 0.62), ...thruster(-1.0, 0, 0.42, 0.62));
  return out;
}

/** A supply hauler: a floating flatbed behind an armoured cab, with crates, fuel cells and a load under a tarpaulin. */
function hauler(): G[] {
  const L = 3.65, W = 3.0, D = 1.4;
  const cab: P2[] = [[1.6, D - 0.05], [3.62, D - 0.05], [3.56, 1.75], [2.9, 2.75], [1.6, 2.85]];
  const out: G[] = [
    tub(L, W, D),
    paint(side(cab, 2.9)),
    glass(strip([3.56, 1.75], [2.9, 2.75], 0.12, 0.88, 2.4)),
    ...[-1, 1].map((s) => glass(boxAt(0.8, 0.5, 0.06, 2.3, 2.25, s * 1.475))),
    trim(boxAt(0.7, 0.2, 0.7, 2.1, 2.88, 0), METAL),
    trim(rod([1.8, 2.78, -1.1], [1.8, 3.25, -1.1], 0.04, 0.03), 0x9aa0a6),
    // the bed and its low rails
    trim(boxAt(5.2, 0.1, 2.9, -1.05, D + 0.04, 0), UNDER),
    ...[-1, 1].map((s) => paint(boxAt(5.2, 0.3, 0.12, -1.05, D + 0.2, s * 1.4))),
    paint(boxAt(0.12, 0.3, 2.86, -3.55, D + 0.2, 0)),
    // crates at the back, two below and one on top
    trim(boxAt(1.45, 0.9, 1.3, -2.8, D + 0.54, -0.66), CRATE),
    trim(boxAt(1.45, 0.9, 1.3, -2.8, D + 0.54, 0.66), CRATE_LIGHT),
    trim(boxAt(1.1, 0.68, 1.1, -2.75, D + 1.33, 0.1), CRATE),
    // fuel cells lying across, two below and one on top, with a red band each
    ...[-1.72, -0.98].map((x) => trim(new THREE.CylinderGeometry(0.34, 0.34, 2.6, 8).rotateX(Math.PI / 2).translate(x, D + 0.44, 0), FUEL)),
    trim(new THREE.CylinderGeometry(0.34, 0.34, 2.4, 8).rotateX(Math.PI / 2).translate(-1.35, D + 1.06, 0), FUEL),
    ...[-1.72, -0.98].map((x) => trim(new THREE.CylinderGeometry(0.36, 0.36, 0.2, 8, 1, true).rotateX(Math.PI / 2).translate(x, D + 0.44, 0.7), AUGUSTUS_RED)),
    // the tarpaulin over the load behind the cab, and its straps
    trim(side([[-0.55, D + 0.08], [1.5, D + 0.08], [1.5, D + 0.9], [1.15, D + 1.3], [-0.2, D + 1.3], [-0.55, D + 0.9]], 2.8), OLIVE),
    ...[0.05, 0.95].map((x) => trim(boxAt(0.14, 0.06, 2.86, x, D + 1.32, 0), UNDER)),
  ];
  out.push(...mark(2.3, 1.7, 1.0, 0.34, 1.45));
  for (const x of [-2.4, 0.2, 2.5]) for (const s of [-1, 1]) out.push(...thruster(x, s * 0.95, 0.42, 0.58));
  out.push(...lamps(3.66, -3.66, 1.25, 1.1, 0.95));
  // a warning lamp on the cab roof
  out.push(tail(boxAt(0.22, 0.16, 0.22, 2.4, 2.86, 0.75)));
  return out;
}

/** The lion of House Augustus as a silhouette, walking forward: a body on four legs, a maned head raised, a tail curled up. In a frame 1 wide and 0.8 high. */
const LION: P2[] = [
  [0.15, 0.3], [0.13, 0.02], [0.21, 0.02], [0.25, 0.2], [0.29, 0.02], [0.37, 0.02], [0.38, 0.24], [0.62, 0.24],
  [0.64, 0.02], [0.72, 0.02], [0.74, 0.2], [0.78, 0.02], [0.86, 0.02], [0.84, 0.32], [0.88, 0.42], [0.97, 0.48],
  [1.0, 0.58], [0.93, 0.7], [0.8, 0.8], [0.66, 0.66], [0.6, 0.48], [0.24, 0.48], [0.14, 0.6], [0.06, 0.66],
  [0.03, 0.6], [0.1, 0.56], [0.18, 0.42],
];

/** A command skiff: closed and armoured, with vision slits, a cupola, whip aerials, and the gold lion on red on each flank. */
function command(): G[] {
  const L = 3.6, W = 3.0, D = 1.4;
  const out: G[] = [
    tub(L, W, D),
    paint(side([[-3.55, D - 0.05], [3.55, D - 0.05], [2.3, 2.35], [-2.9, 2.5], [-3.55, 2.2]], 2.8)),
    paint(side([[-2.5, 2.3], [1.9, 2.3], [1.55, 2.75], [-2.3, 2.75]], 2.1)),
    glass(strip([3.55, D - 0.05], [2.3, 2.35], 0.6, 0.82, 2.0)),
    glass(strip([1.9, 2.3], [1.55, 2.75], 0.2, 0.8, 1.6)),
    ...[-1, 1].map((s) => glass(boxAt(1.4, 0.18, 0.06, 1.1, 2.08, s * 1.42))),
    // the cupola and its sensor
    trim(new THREE.CylinderGeometry(0.42, 0.46, 0.32, 8).translate(-0.9, 2.9, 0), METAL),
    glass(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 8).translate(-0.9, 3.08, 0), 0x2a4458),
    // whip aerials, painted pale so that their outlines do not make them black, and a pennant in the house colours
    trim(rod([-2.1, 2.7, 0.75], [-2.1, 3.28, 0.75], 0.05, 0.03), 0xa9afb5),
    trim(rod([-2.1, 2.7, -0.75], [-2.1, 3.12, -0.75], 0.05, 0.03), 0xa9afb5),
    trim(boxAt(0.36, 0.18, 0.03, -2.3, 3.16, 0.75), AUGUSTUS_RED),
    trim(boxAt(0.12, 0.18, 0.035, -2.17, 3.16, 0.75), AUGUSTUS_GOLD),
    // a gold band along the flanks
    ...[-1, 1].map((s) => trim(boxAt(6.0, 0.08, 0.06, -0.4, 1.47, s * 1.41), AUGUSTUS_GOLD)),
  ];
  // the lion on a red plate on each flank, facing the nose
  for (const s of [-1, 1]) {
    out.push(trim(boxAt(1.6, 0.86, 0.08, -0.9, 1.98, s * 1.4), AUGUSTUS_RED));
    out.push(trim(side(LION.map(([x, y]): P2 => [-1.58 + x * 1.32, 1.6 + y * 0.92]), 0.06, s * 1.45), AUGUSTUS_GOLD));
  }
  for (const x of [-2.3, 2.0]) for (const s of [-1, 1]) out.push(...thruster(x, s * 0.92, 0.45, 0.58));
  out.push(...lamps(3.62, -3.62, 1.28, 1.25, 0.9));
  return out;
}

const tris = (g: G): number => (g.index ? g.index.count : g.getAttribute('position').count) / 3;

export const KINDS: TrafficKind[] = [
  { name: 'skiff', len: 7.4, wid: 3.0, colors: ARMY, geo: shapeFrom(skiff()) },
  { name: 'gravBike', len: 3.8, wid: 1.3, wb: 2.2, colors: ARMY, geo: shapeFrom(gravBike()) },
  { name: 'hauler', len: 7.5, wid: 3.0, colors: ARMY, geo: shapeFrom(hauler()) },
  { name: 'command', len: 7.4, wid: 3.0, colors: [0x5d6158, 0x6b6f63, DARKRED, DARKRED], geo: shapeFrom(command()) },
];

// ---------------------------------------------------------------------------
// The spider tanks
// ---------------------------------------------------------------------------
//
// A heavy armoured body on six jointed legs, with a turret and a long gun. The
// body stands with its hips HIP above the ground; each leg is a thigh rising
// from its hip to a knee high over the body's side, and a shin from the knee
// down to a foot. The knee is found from the hip and the foot (two bones of
// fixed length), so a foot can stand wherever the ground is.

/** How high the hips stand over the ground, and the lengths of the thigh and the shin. */
const HIP = 2.05, THIGH = 1.55, SHIN = 2.65;
/** The foot's pad is this high: the end of the shin is this far over the ground. */
const PAD = 0.12;
/** Each leg's hip and its foot at rest, in the body's frame (x forward, z to the right). Legs 0, 3, 4 are one tripod and 1, 2, 5 the other. */
const LEGS: { hip: V3; foot: V3 }[] = [
  { hip: [2.25, -0.1, 2.0], foot: [3.15, 0, 2.95] },
  { hip: [2.25, -0.1, -2.0], foot: [3.15, 0, -2.95] },
  { hip: [0, -0.1, 2.25], foot: [0, 0, 3.2] },
  { hip: [0, -0.1, -2.25], foot: [0, 0, -3.2] },
  { hip: [-2.25, -0.1, 2.0], foot: [-3.15, 0, 2.95] },
  { hip: [-2.25, -0.1, -2.0], foot: [-3.15, 0, -2.95] },
];
const TRIPOD = [0, 1, 1, 0, 0, 1];
/** Where the turret turns on the body, and where the gun is hinged on the turret. */
const TURRET_AT: V3 = [-0.35, 0.6, 0], GUN_AT: V3 = [1.25, 0.34, 0];
/** How fast they walk, how far each foot steps in a cycle, how high it lifts. */
const SPEED = 2, STRIDE = 3.0, LIFT = 0.75;

function spiderBody(): G[] {
  const hull: P2[] = [[-3.25, -1.6], [-2.6, -2.25], [2.4, -2.25], [3.25, -1.25], [3.25, 1.25], [2.4, 2.25], [-2.6, 2.25], [-3.25, 1.6]];
  const deck: P2[] = [[-2.9, -1.3], [-2.25, -1.85], [2.0, -1.85], [2.75, -1.0], [2.75, 1.0], [2.0, 1.85], [-2.25, 1.85], [-2.9, 1.3]];
  const belly: P2[] = [[-2.8, -1.3], [-2.2, -1.75], [2.1, -1.75], [2.8, -1.0], [2.8, 1.0], [2.1, 1.75], [-2.2, 1.75], [-2.8, 1.3]];
  const out: G[] = [
    trim(plan(belly, -0.6, -0.22), UNDER),
    paint(plan(hull, -0.25, 0.28)),
    paint(plan(deck, 0.26, 0.62)),
    // the head at the front, low and wide, with its eyes: four red, two lamps
    paint(side([[2.9, -0.4], [3.55, -0.3], [3.62, 0.05], [3.3, 0.3], [2.9, 0.3]], 1.9)),
    ...[[-0.55, 0.08], [0.55, 0.08], [-0.25, -0.12], [0.25, -0.12]].map(([z, y]) => tail(boxAt(0.1, 0.12, 0.16, 3.6, y, z))),
    ...[-0.82, 0.82].map((z) => head(boxAt(0.12, 0.16, 0.24, 3.55, -0.14, z))),
    // the engine block behind, with two tail lamps
    trim(boxAt(0.25, 0.4, 2.6, -3.3, 0.0, 0), METAL),
    ...[-1.0, 1.0].map((z) => tail(boxAt(0.1, 0.12, 0.3, -3.45, 0.12, z))),
    // the house's red band along each flank of the deck
    ...[-1, 1].map((s) => trim(boxAt(3.6, 0.16, 0.06, -0.2, 0.42, s * 1.88), AUGUSTUS_RED)),
  ];
  // the hip knuckles, dark, round at the side
  for (const l of LEGS) {
    const [x, y, z] = l.hip;
    out.push(trim(new THREE.CylinderGeometry(0.36, 0.36, 0.6, 6).rotateX(Math.PI / 2).translate(x, y, z), METAL));
  }
  return out;
}

function spiderTurret(): G[] {
  const top: P2[] = [[-1.3, -0.9], [-0.9, -1.2], [0.9, -1.2], [1.45, -0.6], [1.45, 0.6], [0.9, 1.2], [-0.9, 1.2], [-1.3, 0.9]];
  const roof: P2[] = [[-1.1, -0.75], [-0.75, -1.0], [0.75, -1.0], [1.2, -0.5], [1.2, 0.5], [0.75, 1.0], [-0.75, 1.0], [-1.1, 0.75]];
  return [
    paint(plan(top, 0, 0.42)),
    paint(plan(roof, 0.4, 0.62)),
    trim(new THREE.CylinderGeometry(0.3, 0.34, 0.2, 6).translate(-0.4, 0.7, 0.45), METAL),
    glass(boxAt(0.08, 0.12, 0.3, 1.22, 0.52, -0.38), 0x2a4458),
    trim(boxAt(0.7, 0.36, 0.5, -1.55, 0.25, 0), METAL),
  ];
}

function spiderGun(): G[] {
  return [
    trim(boxAt(0.5, 0.42, 0.62, 0.05, 0, 0), GUNMETAL),
    trim(rod([0.2, 0, 0], [3.35, 0, 0], 0.15, 0.12, 6), METAL),
    trim(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 6, 1, true).rotateZ(Math.PI / 2).translate(1.3, 0, 0), GUNMETAL),
    trim(boxAt(0.4, 0.28, 0.28, 3.4, 0, 0), GUNMETAL),
  ];
}

/** The thigh, along +y from the hip to the knee: an armoured strut, and the knee's joint. Its ends are in the knuckle and the knee. */
function spiderThigh(): G[] {
  return [
    paint(new THREE.CylinderGeometry(0.24, 0.3, THIGH, 4, 1, true).rotateY(Math.PI / 4).translate(0, THIGH / 2, 0)),
    trim(new THREE.CylinderGeometry(0.3, 0.3, 0.56, 6).rotateX(Math.PI / 2).translate(0, THIGH, 0), METAL),
  ];
}

/** The shin, along +y from the knee to the foot: tapering, with an armoured sleeve, and a pad at the foot. */
function spiderShin(): G[] {
  return [
    trim(new THREE.CylinderGeometry(0.11, 0.21, SHIN - 0.1, 5, 1, true).translate(0, (SHIN - 0.1) / 2 + 0.05, 0), METAL),
    paint(new THREE.CylinderGeometry(0.2, 0.26, 0.9, 4, 1, true).rotateY(Math.PI / 4).translate(0, 0.6, 0)),
    trim(new THREE.CylinderGeometry(0.36, 0.26, PAD * 2, 4).rotateY(Math.PI / 4).translate(0, SHIN, 0), UNDER),
  ];
}

/** A closed loop through the corners, each corner rounded off to about radius `r`: a dense list of points. */
function roundedLoop(corners: P2[], r: number): P2[] {
  const out: P2[] = [];
  const n = corners.length;
  for (let i = 0; i < n; i++) {
    const p = corners[i], a = corners[(i + n - 1) % n], b = corners[(i + 1) % n];
    const ia = [p[0] - a[0], p[1] - a[1]], ib = [b[0] - p[0], b[1] - p[1]];
    const la = Math.hypot(ia[0], ia[1]), lb = Math.hypot(ib[0], ib[1]);
    const ang = Math.acos(Math.max(-1, Math.min(1, (ia[0] * ib[0] + ia[1] * ib[1]) / (la * lb))));
    const t = Math.min(r * Math.tan(ang / 2), la * 0.45, lb * 0.45);
    const s: P2 = [p[0] - (ia[0] / la) * t, p[1] - (ia[1] / la) * t], e: P2 = [p[0] + (ib[0] / lb) * t, p[1] + (ib[1] / lb) * t];
    for (let k = 0; k <= 10; k++) {
      const u = k / 10, w = 1 - u;
      out.push([w * w * s[0] + 2 * w * u * p[0] + u * u * e[0], w * w * s[1] + 2 * w * u * p[1] + u * u * e[1]]);
    }
  }
  return out;
}

/** A loop measured along its length: where on it, and which way, at a distance round it. */
function loopPath(pts: P2[]): { length: number; at(s: number): { x: number; z: number; h: number } } {
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1], b = pts[i % pts.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const length = cum[pts.length];
  const pos = (s: number): P2 => {
    s = ((s % length) + length) % length;
    let lo = 0, hi = pts.length;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= s) lo = mid;
      else hi = mid;
    }
    const a = pts[lo], b = pts[(lo + 1) % pts.length], f = (s - cum[lo]) / Math.max(1e-6, cum[lo + 1] - cum[lo]);
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  };
  return {
    length,
    at(s) {
      const [x, z] = pos(s), p0 = pos(s - 1.2), p1 = pos(s + 1.2);
      return { x, z, h: Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) };
    },
  };
}

/** How a body stands at a place, facing a way: the ground under it, its slope along and across. */
function stance(x: number, z: number, h: number, m: THREE.Matrix4): THREE.Matrix4 {
  const c = Math.cos(h), s = Math.sin(h);
  const fy = (landAt(x + c * 3, z + s * 3) - landAt(x - c * 3, z - s * 3)) / 6;
  const ry = (landAt(x - s * 2.6, z + c * 2.6) - landAt(x + s * 2.6, z - c * 2.6)) / 5.2;
  const X = new THREE.Vector3(c, fy, s).normalize();
  const Z = new THREE.Vector3(-s, ry, c);
  const Y = new THREE.Vector3().crossVectors(Z, X).normalize();
  Z.crossVectors(X, Y);
  const y = (landAt(x, z) + landAt(x + c * 2.5, z + s * 2.5) + landAt(x - c * 2.5, z - s * 2.5)) / 3;
  return m.makeBasis(X, Y, Z).setPosition(x, y + HIP, z);
}

/** Meshes of the spider tanks' parts, drawn instanced in the vehicles' material, each piece taking a tank's paint. */
function instanced(k: Build, pieces: G[], n: number, colors: THREE.Color[]): THREE.InstancedMesh {
  const geo = shapeFrom(pieces);
  geo.setAttribute('aLit', new THREE.InstancedBufferAttribute(new Float32Array(n), 1));
  const mesh = new THREE.InstancedMesh(geo, k.mat.vehicle(), n);
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  for (let i = 0; i < n; i++) mesh.setColorAt(i, colors[i % colors.length]);
  k.group.add(mesh);
  return mesh;
}

/** Triangles of each part of a spider tank, for the report. */
export const SPIDER_TRIANGLES = (): Record<string, number> => {
  const t = (p: G[]) => tris(shapeFrom(p));
  const body = t(spiderBody()), turret = t(spiderTurret()), gun = t(spiderGun()), thigh = t(spiderThigh()), shin = t(spiderShin());
  return { body, turret, gun, legs: 6 * (thigh + shin), tank: body + turret + gun + 6 * (thigh + shin) };
};

let held: number | null = null;

/** Spider tanks: two walking their round on the south flank, half a round apart, and two parked in the camp's motor pool. */
export function buildSpiders(k: Build): void {
  const WALK = 2, N = WALK + CAMP.parked.length;
  // the walkers in the column's grey-greens; the parked pair one grey and one in the house's dark red
  const paints = [0x646b5c, 0x6b6f63, 0x5d6158, DARKRED].map((c) => new THREE.Color(c));
  const bodies = instanced(k, spiderBody(), N, paints);
  const turrets = instanced(k, spiderTurret(), N, paints);
  const guns = instanced(k, spiderGun(), N, paints);
  const legPaints = paints.flatMap((c) => Array<THREE.Color>(6).fill(c));
  const thighs = instanced(k, spiderThigh(), N * 6, legPaints);
  const shins = instanced(k, spiderShin(), N * 6, legPaints);

  const path = loopPath(roundedLoop(SPIDER_PATROL, 5));
  const cycle = STRIDE / SPEED;
  const M = new THREE.Matrix4(), B = new THREE.Matrix4(), T = new THREE.Matrix4(), R = new THREE.Matrix4();
  const hip = new THREE.Vector3(), foot = new THREE.Vector3(), knee = new THREE.Vector3();
  const dir = new THREE.Vector3(), pole = new THREE.Vector3(), n = new THREE.Vector3(), seg = new THREE.Vector3();
  const q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  const poseAt = (i: number, t: number, m: THREE.Matrix4): THREE.Matrix4 => {
    if (i >= WALK) {
      const [x, z] = CAMP.parked[i - WALK];
      return stance(x, z, 0, m);
    }
    const p = path.at(t * SPEED + (i * path.length) / WALK);
    return stance(p.x, p.z, p.h, m);
  };
  /** Where a foot stands at rest when the body stands so, on the ground as built. */
  const planted = (m: THREE.Matrix4, leg: number, out: THREE.Vector3): THREE.Vector3 => {
    const [fx, , fz] = LEGS[leg].foot;
    out.set(fx, 0, fz).applyMatrix4(m);
    out.y = landAt(out.x, out.z) + PAD;
    return out;
  };
  const a = new THREE.Vector3(), b = new THREE.Vector3(), PA = new THREE.Matrix4(), PB = new THREE.Matrix4();

  // each tank's part of the ground was laid by the time the show is built; the parked ones are worked out once
  let parkedDone = false;
  const place = (i: number, t: number): void => {
    const walking = i < WALK;
    if (!walking && parkedDone) return;
    poseAt(i, t, B);
    // a little bob as the weight shifts from one tripod to the other
    if (walking) B.elements[13] += 0.05 * Math.sin((t / cycle) * Math.PI * 4);
    bodies.setMatrixAt(i, B);
    // the turret watches the sky, slowly; the parked ones look ahead
    const yaw = walking ? 0.9 * Math.sin(0.19 * t + i * 2.1) + 0.35 * Math.sin(0.07 * t + i) : 0;
    const elev = walking ? 0.3 + 0.22 * Math.sin(0.15 * t + i * 1.3) : 0.08;
    T.makeTranslation(...TURRET_AT).multiply(R.makeRotationY(yaw));
    M.multiplyMatrices(B, T);
    turrets.setMatrixAt(i, M);
    T.makeTranslation(...GUN_AT).multiply(R.makeRotationZ(elev));
    guns.setMatrixAt(i, M.multiply(T));
    for (let l = 0; l < 6; l++) {
      // where the foot is: planted at the middle of each stance, swung through the air between
      if (walking) {
        const off = TRIPOD[l] * 0.5, u = t / cycle + off, c = Math.floor(u), f = u - c;
        if (f < 0.5) planted(poseAt(i, (c + 0.25 - off) * cycle, PA), l, foot);
        else {
          planted(poseAt(i, (c + 0.25 - off) * cycle, PA), l, a);
          planted(poseAt(i, (c + 1.25 - off) * cycle, PB), l, b);
          const w = (f - 0.5) / 0.5, e = w * w * (3 - 2 * w);
          foot.lerpVectors(a, b, e);
          foot.y += LIFT * Math.sin(Math.PI * w);
        }
      } else planted(B, l, foot);
      hip.set(...LEGS[l].hip).applyMatrix4(B);
      // the knee: two bones of fixed length, bending up and out
      dir.subVectors(foot, hip);
      const d = Math.min(Math.max(dir.length(), Math.abs(SHIN - THIGH) + 0.05), THIGH + SHIN - 0.02);
      dir.normalize();
      const ac = (THIGH * THIGH - SHIN * SHIN + d * d) / (2 * d), hk = Math.sqrt(Math.max(0, THIGH * THIGH - ac * ac));
      const [lx, , lz] = LEGS[l].foot, [hx, , hz] = LEGS[l].hip;
      pole.set(lx - hx, 0, lz - hz).normalize().transformDirection(B).add(n.set(B.elements[4], B.elements[5], B.elements[6]).multiplyScalar(1.2));
      n.copy(pole).addScaledVector(dir, -pole.dot(dir)).normalize();
      knee.copy(hip).addScaledVector(dir, ac).addScaledVector(n, hk);
      const j = i * 6 + l;
      seg.subVectors(knee, hip).normalize();
      thighs.setMatrixAt(j, M.compose(hip, q.setFromUnitVectors(UP, seg), one));
      // the shin from the knee towards the foot, its pad on the ground
      seg.subVectors(foot, knee).normalize();
      shins.setMatrixAt(j, M.compose(knee, q.setFromUnitVectors(UP, seg), one));
    }
  };

  k.each((_dt, time) => {
    const t = held ?? time;
    for (let i = 0; i < N; i++) place(i, t);
    parkedDone = true;
    for (const m of [bodies, turrets, guns, thighs, shins]) m.instanceMatrix.needsUpdate = true;
  });

  if (import.meta.env.DEV) {
    const shown: THREE.Object3D[] = [];
    (window as unknown as { rrTraffic: object }).rrTraffic = {
      kinds: KINDS,
      /** Stands the spider tanks as they are at `t` seconds; null lets them go. */
      hold(t: number | null) {
        held = t;
      },
      /** Each kind's length, width, height and triangles, and the spider tank's triangles. */
      sizes() {
        const out: Record<string, unknown> = {};
        for (const kd of KINDS) {
          kd.geo.computeBoundingBox();
          const bb = kd.geo.boundingBox!;
          out[kd.name] = { len: +(bb.max.x - bb.min.x).toFixed(2), wid: +(bb.max.z - bb.min.z).toFixed(2), high: +bb.max.y.toFixed(2), low: +bb.min.y.toFixed(2), mid: [+((bb.max.x + bb.min.x) / 2).toFixed(2), +((bb.max.z + bb.min.z) / 2).toFixed(2)], tris: tris(kd.geo) };
        }
        out.spider = SPIDER_TRIANGLES();
        return out;
      },
      /** Where each walking tank is now. */
      where: () => [0, 1].map((i) => { const p = path.at((held ?? 0) * SPEED + (i * path.length) / WALK); return { x: p.x, z: p.z, y: landAt(p.x, p.z) }; }),
      path: () => path.length,
      /** Stands a copy of each kind in a row along x from (x, z), each in its `paint`-th colour, for pictures; `stand(null)` takes them away. */
      stand(x: number | null, z = 0, paint = 0) {
        for (const m of shown) k.group.remove(m);
        shown.length = 0;
        if (x === null) return;
        KINDS.forEach((kd, i) => {
          const m = new THREE.InstancedMesh(kd.geo, k.mat.vehicle(), 1);
          const px = x + i * 10;
          m.setMatrixAt(0, new THREE.Matrix4().makeTranslation(px, landAt(px, z), z));
          m.setColorAt(0, new THREE.Color(kd.colors[paint % kd.colors.length]));
          m.frustumCulled = false;
          k.group.add(m);
          shown.push(m);
        });
      },
    };
  }
}
