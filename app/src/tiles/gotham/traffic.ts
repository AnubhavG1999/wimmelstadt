// Gotham's own traffic: police cruisers and a police van, yellow cabs with a
// chequered band, armoured trucks, the Gazette's vans, Ace Chemicals' tankers,
// ice lorries for the Iceberg Lounge, fat-fendered sedans of the 1940s and long
// low coupes in dark paint; and its boats on the harbour: the launch between
// the pier and Blackgate, a tug towing a barge of coal, and the police's
// harbour patrol.
//
// Each kind is one rigid shape with its nose along +x, standing on y = 0. Paint
// is given in white and takes one of the kind's colours; every other part keeps
// its own. Nothing is lettered: POLICE, GOTHAM SECURITY, ICE and the Gazette's
// name are a plain band or patch of colour. Everything is this tile's own
// drawing, from section 6 of the research note on the city.
//
// The boats are meshes of their own, moved in `k.each`. The harbour is narrow,
// so they keep apart by time as well as by place: the tug goes round twice in
// each of the launch's crossings, and starts where it never meets her.

import * as THREE from 'three';
import { rounded } from '../../engine/corners';
import { Smoke } from '../../engine/effects';
import { GeoBuilder, interior, type V3 } from '../../engine/geo';
import type { Build, TrafficKind } from '../../engine/tile';
import { PART, boxAt, lampsFor, shapeFrom, shapePart, sideProfile, wheelsFor } from '../../engine/vehicles';
import { BRIDGE, CASINO, LANDS, SHOW_LANES, SPRANG_ACROSS, SPRANG_ALONG, STAGES, Y, bySprang, inside, lotOf, sprang, toEdge, type P2 } from './plan';

// ===========================================================================
// The kinds of traffic
// ===========================================================================

const WHITE = 0xffffff, DARK = 0x2a2c31, GLASS = 0x1c2733, CHROME = 0xc4c8ce, PALE = 0xeeeeea;
type G = THREE.BufferGeometry;
const paint = (g: G): G => shapePart(g, PART.paint, WHITE);
const trim = (g: G, color: number): G => shapePart(g, PART.trim, color);
const glass = (g: G): G => shapePart(g, PART.glass, GLASS);
const head = (g: G, color = 0xfff4d6): G => shapePart(g, PART.head, color);
const tail = (g: G, color = 0xc81e1e): G => shapePart(g, PART.tail, color);
/** A square of colour on a vehicle's side, facing out on the side `s` (1 for +z), its middle at (x, y). */
const patch = (x: number, y: number, w: number, h: number, z: number, s: number, color: number): G => {
  const g = new THREE.PlaneGeometry(w, h);
  if (s < 0) g.rotateY(Math.PI);
  return trim(g.translate(x, y, z * s), color);
};

/** A police cruiser: black, with white doors and a white roof, a push bar, and a bar of lamps on its roof, one red and one blue. */
const CRUISER: TrafficKind = {
  name: 'cruiser', len: 7.3, wid: 3.1, wb: 4.4, colors: [0x15171b, 0x1a1c21, 0x121316],
  geo: shapeFrom([
    paint(sideProfile([[-3.6, 0.55], [3.5, 0.5], [3.6, 0.9], [3.45, 1.25], [1.3, 1.45], [-2.2, 1.5], [-3.6, 1.4]], 3.1)),
    glass(sideProfile([[1.2, 1.42], [0.35, 2.2], [-1.7, 2.2], [-2.5, 1.48]], 2.6)),
    trim(boxAt(2.15, 0.13, 2.5, -0.675, 2.26, 0), PALE), // the white roof
    trim(boxAt(3.0, 0.6, 3.14, -0.45, 1.05, 0), PALE), // the white doors
    trim(boxAt(0.55, 0.12, 2.3, -0.55, 2.38, 0), DARK), // the lamp bar
    tail(boxAt(0.45, 0.24, 1.05, -0.55, 2.56, -0.56), 0xff2a2a),
    trim(boxAt(0.45, 0.24, 1.05, -0.55, 2.56, 0.56), 0x2f6bff),
    trim(boxAt(0.18, 0.55, 1.9, 3.67, 0.88, 0), DARK), // the push bar
    ...wheelsFor(0.98, 3.1, [2.2, -2.2]),
    ...lampsFor(3.56, -3.58, 1.02, 1.2, 3.1),
  ]),
};

/** A police van: dark blue and boxy, a pale band along it, and two small barred windows in each side of its body. */
const POLICE_VAN: TrafficKind = {
  name: 'policeVan', len: 7.4, wid: 3.2, wb: 4.5, colors: [0x1c2a4c, 0x203056, 0x1a2644],
  geo: shapeFrom([
    paint(sideProfile([[-3.7, 0.55], [3.6, 0.5], [3.7, 1.0], [3.55, 1.7], [2.5, 1.85], [-3.7, 1.85]], 3.2)),
    glass(sideProfile([[2.5, 1.85], [1.95, 2.95], [0.9, 2.95], [0.9, 1.85]], 2.8)),
    paint(boxAt(4.6, 1.35, 3.2, -1.4, 2.52, 0)),
    paint(boxAt(1.15, 0.13, 2.7, 1.45, 3.01, 0)),
    trim(boxAt(7.42, 0.3, 3.24, 0, 1.5, 0), 0xe6e6e2), // the band
    ...[-2.6, -1.0].flatMap((x) => [
      glass(boxAt(0.9, 0.5, 3.24, x, 2.6, 0)),
      ...[-0.27, 0, 0.27].map((d) => trim(boxAt(0.07, 0.5, 3.28, x + d, 2.6, 0), 0xc8ccd2)),
    ]),
    ...wheelsFor(1.0, 3.2, [2.3, -2.3]),
    ...lampsFor(3.66, -3.68, 1.15, 1.4, 3.2),
  ]),
};

/** A yellow cab: a chequered band along each side and a lamp on its roof, lit. */
const CAB: TrafficKind = {
  name: 'cab', len: 7.0, wid: 3.0, wb: 4.3, colors: [0xe8b81f, 0xf0c228, 0xe2b21a],
  geo: shapeFrom([
    paint(sideProfile([[-3.5, 0.55], [3.4, 0.5], [3.5, 0.9], [3.35, 1.25], [1.2, 1.45], [-2.1, 1.5], [-3.5, 1.4]], 3.0)),
    glass(sideProfile([[1.1, 1.42], [0.3, 2.15], [-1.6, 2.15], [-2.4, 1.48]], 2.5)),
    paint(boxAt(2.05, 0.13, 2.4, -0.65, 2.21, 0)),
    trim(boxAt(5.44, 0.36, 3.04, -0.3, 1.13, 0), 0xf2f2ee), // the band, and its black squares
    ...[-1, 1].flatMap((s) => Array.from({ length: 17 }, (_, i) => i).flatMap((i) => [0, 1].filter((r) => (i + r) % 2 === 0).map((r) => patch(-2.86 + i * 0.32, 1.04 + r * 0.18, 0.32, 0.18, 1.53, s, 0x18181b)))),
    trim(boxAt(0.5, 0.1, 1.3, -0.6, 2.32, 0), DARK),
    head(boxAt(0.36, 0.3, 1.15, -0.6, 2.52, 0), 0xfff0b0), // the roof lamp
    ...wheelsFor(0.96, 3.0, [2.15, -2.15]),
    ...lampsFor(3.46, -3.48, 1.02, 1.2, 3.0),
  ]),
};

/** An armoured truck: dark green, a squat cab and a steel box, slits for windows, a pale patch on its side where a security firm's name would be. */
const ARMOURED: TrafficKind = {
  name: 'armoured', len: 7.4, wid: 3.2, wb: 4.6, colors: [0x2f4a35, 0x2b4431, 0x354f3a],
  geo: shapeFrom([
    paint(sideProfile([[1.0, 0.55], [3.6, 0.55], [3.7, 1.1], [3.6, 2.0], [3.1, 2.7], [1.0, 2.7]], 3.2)),
    glass(boxAt(0.25, 0.2, 2.4, 3.36, 2.3, 0)), // the windscreen, a slit
    glass(boxAt(0.8, 0.16, 3.24, 2.1, 2.3, 0)),
    paint(boxAt(4.7, 2.3, 3.2, -1.3, 1.75, 0)),
    paint(boxAt(1.0, 0.15, 1.2, -1.5, 2.97, 0)), // a hatch
    trim(boxAt(7.44, 0.25, 3.24, 0, 0.75, 0), 0x1b241d),
    trim(boxAt(2.2, 0.7, 3.24, -1.4, 1.85, 0), 0xc9b26a), // the patch
    ...[-2.8, 0.1].map((x) => glass(boxAt(0.6, 0.14, 3.24, x, 2.5, 0))),
    trim(boxAt(0.2, 0.4, 3.0, 3.72, 0.8, 0), DARK),
    ...wheelsFor(1.05, 3.2, [2.4, -2.3]),
    ...lampsFor(3.7, -3.72, 1.25, 1.2, 3.2),
  ]),
};

/** The Gazette's van: dark red, its body open at the back on bundles of the evening's papers. */
const NEWS_VAN: TrafficKind = {
  name: 'newsVan', len: 7.2, wid: 3.1, wb: 4.4, colors: [0x6e1b1d, 0x7a2022, 0x641a1c],
  geo: shapeFrom([
    paint(sideProfile([[0.9, 0.55], [3.5, 0.5], [3.6, 1.0], [3.45, 1.65], [2.4, 1.8], [0.9, 1.8]], 3.1)),
    glass(sideProfile([[2.4, 1.8], [1.9, 2.8], [0.95, 2.8], [0.95, 1.8]], 2.7)),
    paint(boxAt(1.0, 0.13, 2.6, 1.42, 2.86, 0)),
    trim(boxAt(4.5, 0.45, 2.8, -1.35, 0.72, 0), DARK), // the chassis
    trim(boxAt(4.5, 0.2, 2.82, -1.35, 1.05, 0), 0x4a3a2c), // the floor
    ...[-1, 1].map((s) => paint(boxAt(4.5, 1.9, 0.14, -1.35, 2.0, s * 1.48))),
    paint(boxAt(0.14, 1.9, 3.1, 0.79, 2.0, 0)),
    paint(boxAt(4.62, 0.12, 3.1, -1.35, 3.01, 0)),
    trim(boxAt(4.64, 0.22, 3.14, -1.35, 2.3, 0), 0xd9c9a0), // a pale band for the paper's name
    ...[-3.2, -2.5, -1.8].map((x, i) => trim(boxAt(0.62, 0.45, 2.3, x, 1.38, 0), i % 2 ? 0xd8d2c0 : 0xcfc8b4)), // the bundles
    trim(boxAt(0.62, 0.45, 0.95, -3.2, 1.83, 0.5), 0xe0dacb),
    ...wheelsFor(0.98, 3.1, [2.3, -2.2]),
    ...lampsFor(3.56, -3.62, 1.1, 1.3, 3.1),
  ]),
};

/** Ace Chemicals' tanker: a short cab, and a white tank with two green bands and a walkway along its top. */
const TANKER: TrafficKind = {
  name: 'tanker', len: 7.6, wid: 3.2, wb: 4.8, colors: [0x2c6e3c, 0x27623a],
  geo: shapeFrom([
    paint(sideProfile([[1.9, 0.55], [3.7, 0.55], [3.8, 1.1], [3.7, 1.9], [3.3, 2.75], [1.9, 2.75]], 3.2)),
    glass(sideProfile([[3.74, 1.9], [3.35, 2.68], [2.6, 2.68], [2.6, 1.9]], 2.9)),
    trim(boxAt(5.6, 0.35, 2.8, -1.0, 0.8, 0), DARK),
    trim(new THREE.CylinderGeometry(1.15, 1.15, 5.2, 8).rotateZ(Math.PI / 2).translate(-0.95, 2.05, 0), 0xeeeeea),
    ...[-2.6, 0.7].map((x) => trim(new THREE.CylinderGeometry(1.19, 1.19, 0.42, 8).rotateZ(Math.PI / 2).translate(x, 2.05, 0), 0x2f9a45)),
    trim(boxAt(4.0, 0.08, 0.5, -0.95, 3.24, 0), 0xb4bac2),
    ...wheelsFor(1.05, 3.2, [2.6, -2.5]),
    ...lampsFor(3.8, -3.6, 1.2, 1.0, 3.2),
  ]),
};

/** An ice lorry for the Iceberg Lounge: a pale blue cab, a white box body with a pale blue band, and its cold unit over the cab. */
const ICE_LORRY: TrafficKind = {
  name: 'iceLorry', len: 7.4, wid: 3.2, wb: 4.6, colors: [0x9ccbe3, 0xa9d3e8, 0x92c2dc],
  geo: shapeFrom([
    paint(sideProfile([[1.9, 0.55], [3.6, 0.55], [3.7, 1.1], [3.6, 1.9], [3.25, 2.75], [1.9, 2.75]], 3.2)),
    glass(sideProfile([[3.64, 1.9], [3.3, 2.68], [2.6, 2.68], [2.6, 1.9]], 2.9)),
    trim(boxAt(5.4, 2.45, 3.2, -0.95, 2.03, 0), 0xf0f3f5),
    trim(boxAt(5.44, 0.4, 3.24, -0.95, 1.4, 0), 0x7fb8d6),
    trim(boxAt(0.4, 0.8, 1.6, 1.95, 2.85, 0), 0xc8ccd0),
    ...wheelsFor(1.05, 3.2, [2.4, -2.4]),
    ...lampsFor(3.7, -3.66, 1.2, 1.0, 3.2),
  ]),
};

/** A sedan of the 1940s: a tall round cabin, a long bonnet, fat fenders standing out from its sides, running boards and chrome. */
const OLD_SEDAN: TrafficKind = {
  name: 'oldSedan', len: 7.1, wid: 3.0, wb: 4.5, colors: [0x1b1b1f, 0x2b2522, 0x26352f, 0x3a2729, 0x28303e, 0x4a4338, 0x1f2a2a],
  geo: shapeFrom([
    paint(sideProfile([[-3.45, 0.75], [3.3, 0.75], [3.45, 1.15], [3.3, 1.45], [1.4, 1.6], [-2.0, 1.6], [-3.2, 1.4], [-3.5, 1.0]], 2.5)),
    glass(sideProfile([[1.3, 1.58], [0.75, 2.4], [-1.2, 2.45], [-2.1, 1.58]], 2.2)),
    paint(sideProfile([[0.85, 2.3], [0.55, 2.62], [-1.0, 2.66], [-1.6, 2.3]], 2.28)),
    ...[-1, 1].flatMap((s) => [
      paint(sideProfile([[1.2, 0.7], [3.4, 0.7], [3.3, 1.25], [2.7, 1.55], [1.9, 1.5], [1.4, 1.2]], 0.5).translate(0, 0, s * 1.2)),
      paint(sideProfile([[-3.3, 0.75], [-1.4, 0.75], [-1.6, 1.2], [-2.2, 1.45], [-2.9, 1.4], [-3.35, 1.1]], 0.5).translate(0, 0, s * 1.2)),
      head(boxAt(0.2, 0.3, 0.34, 3.3, 1.35, s * 1.2)),
      tail(boxAt(0.15, 0.22, 0.3, -3.32, 1.25, s * 1.2)),
    ]),
    trim(boxAt(2.6, 0.1, 3.0, -0.1, 0.74, 0), DARK), // the running boards
    trim(boxAt(0.12, 0.6, 0.9, 3.46, 1.05, 0), CHROME), // the grille
    trim(boxAt(0.16, 0.18, 2.9, 3.56, 0.72, 0), CHROME),
    trim(boxAt(0.16, 0.18, 2.9, -3.55, 0.78, 0), CHROME),
    ...wheelsFor(0.85, 3.0, [2.25, -2.25]),
  ]),
};

/** A long low coupe in dark paint: a long bonnet, a fastback, and a line of chrome along its side. */
const COUPE: TrafficKind = {
  name: 'coupe', len: 7.4, wid: 3.1, wb: 4.6, colors: [0x141518, 0x22262c, 0x2e2a30, 0x3a3f46, 0x3d1f22, 0x1e2a2a, 0x5a5e66],
  geo: shapeFrom([
    paint(sideProfile([[-3.7, 0.5], [3.6, 0.45], [3.7, 0.8], [3.55, 1.05], [0.9, 1.25], [-3.2, 1.3], [-3.7, 1.15]], 3.1)),
    glass(sideProfile([[0.8, 1.22], [-0.3, 1.95], [-1.6, 1.95], [-3.0, 1.3]], 2.6)),
    paint(boxAt(1.2, 0.12, 2.5, -0.95, 2.0, 0)),
    trim(boxAt(6.5, 0.08, 3.14, 0.1, 0.95, 0), 0xb9bcc2),
    ...wheelsFor(0.9, 3.1, [2.3, -2.3]),
    ...lampsFor(3.66, -3.72, 0.85, 1.0, 3.1),
  ]),
};

/** The tile's own kinds of traffic. */
export const KINDS: TrafficKind[] = [CRUISER, POLICE_VAN, CAB, ARMOURED, NEWS_VAN, TANKER, ICE_LORRY, OLD_SEDAN, COUPE];

/** For each of the tile's routes, by its id in roads.ts: which kinds drive it. A route that is not named here keeps plain traffic. */
export const MIX: Record<string, string[]> = {
  long: [
    'cab', 'cab', 'cab', 'cab', 'cruiser', 'cruiser', 'policeVan', 'newsVan', 'tanker', 'armoured', 'iceLorry',
    'oldSedan', 'oldSedan', 'coupe', 'coupe', 'coupe', 'sedan', 'sedan', 'hatch', 'van', 'pickup', 'bus', 'bus',
  ],
  canal: ['cruiser', 'cruiser', 'policeVan', 'oldSedan', 'oldSedan', 'coupe', 'sedan'],
  pool: ['cab', 'cab', 'coupe', 'coupe', 'newsVan', 'sedan', 'hatch'],
};

// ===========================================================================
// The boats
// ===========================================================================

/** A line on the water through corners, rounded in its bends: how long it is, where a place along it is, and which way it heads there. */
class Line {
  readonly pts: P2[];
  readonly length: number;
  private readonly s: number[] = [0];
  readonly corners: P2[];
  readonly closed: boolean;

  constructor(corners: P2[], r: number, closed: boolean) {
    this.corners = corners;
    this.closed = closed;
    this.pts = rounded(corners, r, closed, 0.5);
    const n = this.pts.length, m = closed ? n : n - 1;
    for (let i = 1; i <= m; i++) {
      const a = this.pts[i - 1], b = this.pts[i % n];
      this.s.push(this.s[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    this.length = this.s[m];
  }

  at(d: number): P2 {
    const L = this.length, n = this.pts.length;
    const s = this.closed ? ((d % L) + L) % L : Math.min(L, Math.max(0, d));
    let lo = 0, hi = this.s.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (this.s[m] <= s) lo = m;
      else hi = m;
    }
    const a = this.pts[lo], b = this.pts[hi % n], u = (s - this.s[lo]) / Math.max(1e-9, this.s[hi] - this.s[lo]);
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  }

  heading(d: number): number {
    const a = this.at(d - 0.7), b = this.at(d + 0.7);
    return Math.atan2(b[1] - a[1], b[0] - a[0]);
  }
}

/** Where a boat is: its middle, the way its bow points (radians, 0 east, a quarter turn south), and how fast it goes ahead. */
interface Pose { x: number; z: number; yaw: number; v: number }

const ease = (u: number): number => u * u * (3 - 2 * u);
const PI = Math.PI;

// ---------------------------------------------------------------------------
// The lines
// ---------------------------------------------------------------------------

const PIER = lotOf('pier');

/**
 * The Blackgate launch's line: from her berth at the pier's end, where she lies
 * bow in along the landing's steps, out of the slip between the pier and the
 * docks' quay, down the middle of the harbour, under the middle of the
 * Cobblepot Bridge, east of the Statue of Justice, to Blackgate's jetty on the
 * isle's north shore.
 */
const LAUNCH_LINE = new Line([
  [PIER.x1 + 2.9, PIER.z1 - 2.4],
  [PIER.x1 + 2.5, PIER.z1 + 3.6],
  sprang(147, -2.5),
  sprang(154, 5.5),
  // a unit nearer the harbour's middle under the bridge, whose east tower stands in the water from 7.9 out
  sprang(BRIDGE.t, 5.5),
  sprang(178, 5.5),
  sprang(191, 6.2),
], 3, false);

/** The tug's round: down the harbour's west side under the bridge, across before the Statue of Justice, back up its east side and across again off the pier. */
const TUG_LINE = new Line([sprang(155, -3), sprang(173, -3), sprang(173, 2), sprang(155, 2)], 2.5, true);

/** The patrol's loop: in the harbour's mouth between the freighter at anchor and Blackgate's north shore. */
const PATROL_LINE = new Line([[92.5, 73], [100.5, 73], [100.5, 77.5], [92.5, 77.5]], 2.2, true);

/** Each boat's line on the water, as corners [x, z], so that the show can keep clear of it. */
export const BOAT_LINES: Record<string, [number, number][]> = {
  launch: LAUNCH_LINE.corners,
  tug: TUG_LINE.corners,
  patrol: PATROL_LINE.corners,
};

// ---------------------------------------------------------------------------
// How each goes
// ---------------------------------------------------------------------------

/** The launch: how long she waits at each end, how far she backs out of each berth before she turns, and how fast she goes. */
const LAUNCH = { L: 7, half: 1.3, wait: 8, backA: 14, backB: 6, vBack: 1.8, spin: 4.5, v: 3 };

/** How far the launch takes to get up to speed, and to slow to a stop. */
const RAMP = 5;
/** How long a run of `len` at top speed `v` takes, getting up to speed over RAMP at the start and slowing over RAMP at the end. */
const runTime = (len: number, v: number): number => (len + 2 * RAMP) / v;
/** How far along such a run it is after `t` seconds, and how fast it goes there. */
function run(len: number, v: number, t: number): [number, number] {
  const tr = (2 * RAMP) / v, T = runTime(len, v);
  if (t <= 0) return [0, 0];
  if (t >= T) return [len, 0];
  if (t < tr) return [(v * t * t) / (2 * tr), (v * t) / tr];
  if (t > T - tr) { const r = T - t; return [len - (v * r * r) / (2 * tr), (v * r) / tr]; }
  return [RAMP + v * (t - tr), v];
}

/** The parts of the launch's crossing, there and back, each with how long it takes. */
const LAUNCH_PARTS = (() => {
  const L = LAUNCH_LINE.length, { wait, backA, backB, vBack, spin, v } = LAUNCH;
  return [
    { what: 'waitA', t: wait },
    { what: 'backA', t: (1.5 * backA) / vBack },
    { what: 'spinA', t: spin },
    { what: 'out', t: runTime(L - backA, v) },
    { what: 'waitB', t: wait },
    { what: 'backB', t: (1.5 * backB) / vBack },
    { what: 'spinB', t: spin },
    { what: 'home', t: runTime(L - backB, v) },
  ];
})();
/** How long the launch's crossing there and back takes. */
const LAUNCH_CYCLE = LAUNCH_PARTS.reduce((a, p) => a + p.t, 0);

function launchAt(time: number): Pose {
  const P = LAUNCH_LINE, L = P.length, { backA, backB } = LAUNCH;
  let t = ((time % LAUNCH_CYCLE) + LAUNCH_CYCLE) % LAUNCH_CYCLE;
  let part = LAUNCH_PARTS[0];
  for (const p of LAUNCH_PARTS) {
    part = p;
    if (t < p.t) break;
    t -= p.t;
  }
  const u = Math.min(1, t / part.t), e = ease(u), speed = (len: number): number => (len / part.t) * 6 * u * (1 - u);
  const pose = (s: number, yaw: number, v: number): Pose => {
    const [x, z] = P.at(s);
    return { x, z, yaw, v };
  };
  switch (part.what) {
    case 'waitA': return pose(0, P.heading(0) + PI, 0);
    case 'backA': { const s = backA * e; return pose(s, P.heading(s) + PI, -speed(backA)); }
    case 'spinA': return pose(backA, P.heading(backA) + PI + PI * e, 0);
    case 'out': { const [d, v] = run(L - backA, LAUNCH.v, t), s = backA + d; return pose(s, P.heading(s), v); }
    case 'waitB': return pose(L, P.heading(L), 0);
    case 'backB': { const s = L - backB * e; return pose(s, P.heading(s), -speed(backB)); }
    case 'spinB': return pose(L - backB, P.heading(L - backB) + PI * e, 0);
    default: { const [d, v] = run(L - backB, LAUNCH.v, t), s = L - backB - d; return pose(s, P.heading(s) + PI, v); }
  }
}

/** The tug and her barge: their lengths and beams, how far apart their middles are along the line, and how many rounds she makes in each of the launch's crossings. */
const TUG = { L: 5.6, half: 1.2, bargeL: 7.4, bargeHalf: 1.45, gap: 9.0, rounds: 2, lap: LAUNCH_CYCLE / 2 };
let TUG_V = TUG_LINE.length / TUG.lap;
/** The patrol: her length and beam, and her speed. */
const PATROL = { L: 6.2, half: 1.15, v: 1.3 };

function tugAt(time: number, phase: number, back = 0): Pose {
  const s = (time + phase) * TUG_V - back, [x, z] = TUG_LINE.at(s);
  return { x, z, yaw: TUG_LINE.heading(s), v: TUG_V };
}
function patrolAt(time: number): Pose {
  const s = time * PATROL.v + 11, [x, z] = PATROL_LINE.at(s);
  return { x, z, yaw: PATROL_LINE.heading(s), v: PATROL.v };
}

// ---------------------------------------------------------------------------
// Keeping them apart
// ---------------------------------------------------------------------------

/** How far apart two boats are, each taken as a capsule along its length as wide as its beam. */
function between(a: Pose, aL: number, aH: number, b: Pose, bL: number, bH: number): number {
  const ends = (p: Pose, L: number, h: number): [P2, P2] => {
    const r = L / 2 - h, c = Math.cos(p.yaw), s = Math.sin(p.yaw);
    return [[p.x - c * r, p.z - s * r], [p.x + c * r, p.z + s * r]];
  };
  const [a0, a1] = ends(a, aL, aH), [b0, b1] = ends(b, bL, bH);
  const toSeg = (p: P2, q: P2, w: P2): number => {
    const vx = w[0] - q[0], vz = w[1] - q[1], l = vx * vx + vz * vz || 1, t = Math.max(0, Math.min(1, ((p[0] - q[0]) * vx + (p[1] - q[1]) * vz) / l));
    return Math.hypot(p[0] - q[0] - vx * t, p[1] - q[1] - vz * t);
  };
  const d = Math.min(toSeg(a0, b0, b1), toSeg(a1, b0, b1), toSeg(b0, a0, a1), toSeg(b1, a0, a1));
  return d - aH - bH;
}

/** How near the launch comes to the tug or her barge in a whole crossing, if the tug starts `phase` seconds into her round. */
function nearestToTug(phase: number, step = 0.25): number {
  let least = Infinity;
  for (let t = 0; t < LAUNCH_CYCLE; t += step) {
    const l = launchAt(t), g = tugAt(t, phase), b = tugAt(t, phase, TUG.gap);
    least = Math.min(least, between(l, LAUNCH.L, LAUNCH.half, g, TUG.L, TUG.half), between(l, LAUNCH.L, LAUNCH.half, b, TUG.bargeL, TUG.bargeHalf));
  }
  return least;
}

/**
 * How many rounds the tug makes in each of the launch's crossings, and where
 * in her round she starts: two rounds, or three, or one, whichever first
 * keeps her a unit clear of the launch, starting wherever she keeps furthest
 * from her. Worked out once, the same on every load.
 */
const TUG_PHASE = (() => {
  let best = { rounds: 2, p: 0, d: -Infinity };
  for (const rounds of [2, 3, 1]) {
    TUG.lap = LAUNCH_CYCLE / rounds;
    TUG_V = TUG_LINE.length / TUG.lap;
    for (let p = 0; p < TUG.lap; p += 0.5) {
      const d = nearestToTug(p, 0.5);
      if (d > best.d) best = { rounds, p, d };
    }
    if (best.d >= 0.8) break;
  }
  TUG.rounds = best.rounds;
  TUG.lap = LAUNCH_CYCLE / best.rounds;
  TUG_V = TUG_LINE.length / TUG.lap;
  return best.p;
})();

// ---------------------------------------------------------------------------
// Building a boat
// ---------------------------------------------------------------------------

function normalOf(a: V3, b: V3, c: V3, hint: V3): V3 {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz) || 1;
  if (nx * hint[0] + ny * hint[1] + nz * hint[2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
  return [nx / l, ny / l, nz / l];
}
const face = (g: GeoBuilder, a: V3, b: V3, c: V3, d: V3, color: number, hint: V3): void => g.quad(a, b, c, d, normalOf(a, b, d, hint), color);

/**
 * A hull in its own frame, its waterline at y = 0 and its bow along +x: its
 * sides in strakes from under the water to the gunwale, its transom, its bow,
 * and a deck at the gunwale that rises a little to the bow. `strakes` are
 * [top, colour] from the bottom up; a top at or below 0 is that far under the
 * gunwale. `bow` is how much of its beam its stem keeps: little for a boat,
 * much for a barge.
 */
function hull(g: GeoBuilder, o: { L: number; half: number; free: number; strakes: [number, number][]; deck: number; rise?: number; bow?: number }): void {
  const { L, half, free } = o, rise = o.rise ?? 0.25, bow = o.bow ?? 0.05;
  const xs = [-L / 2, -L / 2 + 0.45, L * 0.08, L / 2 - (bow > 0.3 ? 0.6 : L * 0.16), L / 2];
  const ws = [half * 0.88, half, half, half * (bow > 0.3 ? 0.95 : 0.74), Math.max(0.06, half * bow)];
  const gun = (i: number): number => free + rise * Math.max(0, (xs[i] - xs[2]) / (xs[4] - xs[2]));
  const top = (j: number, i: number): number => (o.strakes[j][0] > 0 ? o.strakes[j][0] : gun(i) + o.strakes[j][0]);
  const at = (i: number, y: number, s: number): V3 => [xs[i], y, s * ws[i]];
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      let y0 = -0.35, y1 = -0.35;
      o.strakes.forEach(([, color], j) => {
        const a = top(j, i), b = top(j, i + 1);
        face(g, at(i, y0, s), at(i + 1, y1, s), at(i + 1, b, s), at(i, a, s), color, [0, 0, s]);
        y0 = a;
        y1 = b;
      });
    }
  }
  for (const [i, e] of [[0, -1], [4, 1]] as [number, number][]) {
    let y0 = -0.35;
    o.strakes.forEach(([, color], j) => {
      const y1 = top(j, i);
      face(g, at(i, y0, -1), at(i, y0, 1), at(i, y1, 1), at(i, y1, -1), color, [e, 0, 0]);
      y0 = y1;
    });
  }
  for (let i = 0; i < 4; i++) face(g, at(i, gun(i), -1), at(i, gun(i), 1), at(i + 1, gun(i + 1), 1), at(i + 1, gun(i + 1), -1), o.deck, [0, 1, 0]);
}

/** One of a boat's crew, smaller than the tile's people so as to stand in proportion on a squashed boat: a body in a coat, a head, a cap. */
function crew(g: GeoBuilder, x: number, z: number, y: number, coat: number, cap: number): void {
  g.box(x - 0.22, y, z - 0.17, x + 0.22, y + 1.1, z + 0.17, coat, { faces: 'NESWT' });
  g.box(x - 0.15, y + 1.1, z - 0.15, x + 0.15, y + 1.38, z + 0.15, 0xd8b08c, { faces: 'NESW' });
  g.box(x - 0.18, y + 1.38, z - 0.18, x + 0.18, y + 1.5, z + 0.18, cap, { faces: 'NESWTB' });
}

const LIT_GLASS = 0x3e4c58, LAMP = 0xfff3d6;
/** A lamp that is lit at night, `faces` the sides of it that show. */
const lamp = (g: GeoBuilder, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: number, faces = 'NESWT', lit = 3): void =>
  g.box(x0, y0, z0, x1, y1, z1, color, { win: interior(lit), faces });

/**
 * The Blackgate launch: a grey hull with a pale band, a long cabin with its
 * windows lit, a searchlight and a mast with its lamp, rails round the
 * foredeck, and an officer at the stern. Nothing of her rises more than 4 over
 * the water, so she passes under the bridge.
 */
function launchBody(): GeoBuilder {
  const g = new GeoBuilder(), { L, half } = LAUNCH, F = 0.85;
  hull(g, { L, half, free: F, strakes: [[0.1, 0x6e2a26], [-0.3, 0x3a4450], [0, 0xb8bcc2]], deck: 0x5f646b });
  g.box(-1.7, F, -0.95, 1.3, 2.05, 0.95, 0xaeb3b9, { faces: 'NESW' });
  g.box(-1.5, 1.35, -0.97, 1.15, 1.8, 0.97, LIT_GLASS, { win: interior(1.4), faces: 'NS' });
  g.box(1.3, 1.3, -0.8, 1.33, 1.8, 0.8, LIT_GLASS, { win: interior(1.4), faces: 'E' });
  g.box(-1.73, 0.95, -0.4, -1.7, 1.85, 0.4, LIT_GLASS, { win: interior(1.2), faces: 'W' });
  g.box(-1.85, 2.05, -1.05, 1.45, 2.17, 1.05, 0x7d838b, { faces: 'NESWTB' });
  // the mast and its lamp, the searchlight, and the side lamps at the roof's front corners
  g.beam([-0.6, 2.17, 0], [-0.6, 3.85, 0], 0.05, 0.04, 0xc9ccd0);
  lamp(g, -0.68, 3.85, -0.08, -0.52, 4.0, 0.08, LAMP);
  g.cyl(0.8, 0, 2.17, 2.42, 0.18, 0.18, 8, 0x2c3036);
  lamp(g, 0.98, 2.2, -0.12, 1.0, 2.4, 0.12, LAMP, 'E', 2.5);
  lamp(g, 1.0, 2.17, -1.0, 1.3, 2.3, -0.8, 0xff3030);
  lamp(g, 1.0, 2.17, 0.8, 1.3, 2.3, 1.0, 0x30ff60);
  // the rails round the foredeck, on posts
  for (const s of [-1, 1]) {
    g.beam([1.4, F + 0.6, s * 1.05], [3.25, F + 0.82, s * 0.12], 0.035, 0.035, 0xd0d4d8);
    for (const u of [0, 0.5, 1]) {
      const x = 1.4 + 1.85 * u, z = s * (1.05 - 0.93 * u), y = F + 0.25 * Math.max(0, (x - 0.56) / 2.94);
      g.beam([x, y, z], [x, F + 0.6 + 0.22 * u, z], 0.03, 0.03, 0xd0d4d8);
    }
  }
  // a life ring on the cabin's back, and the officer at the stern
  g.box(-1.76, 1.35, 0.45, -1.73, 1.75, 0.85, 0xe8742a, { faces: 'W' });
  crew(g, -2.6, 0.2, F, 0x1d2a44, 0x1d2a44);
  return g;
}

/**
 * The tug: a black hull on a red bottom, a big rope fender at her bow and
 * tyres along her sides, a buff deckhouse with lit ports, a wheelhouse over
 * it, a stack banded red and black, a bitt at her stern for the towline, and a
 * deckhand. Her stack's top is 3.75 over the water.
 */
function tugBody(): GeoBuilder {
  const g = new GeoBuilder(), { L, half } = TUG, F = 0.7, BUFF = 0xd9ccb0;
  hull(g, { L, half, free: F, rise: 0.35, strakes: [[0.1, 0x8a2a24], [-0.22, 0x1d1f22], [0, 0x5a3a2a]], deck: 0x5a4a3c });
  g.box(2.55, 0.35, -0.38, 2.98, 1.05, 0.38, 0x3a332c, { faces: 'NESWTB' });
  for (const s of [-1, 1]) for (const x of [-1.5, -0.3, 0.9]) g.box(x - 0.22, 0.3, s * (half + 0.02) - 0.1, x + 0.22, 0.68, s * (half + 0.02) + 0.1, 0x202124, { faces: 'NESWTB' });
  g.box(-1.5, F, -0.8, 0.9, 1.65, 0.8, BUFF);
  for (const s of [-1, 1]) for (const x of [-1.1, -0.45]) lamp(g, x - 0.14, 1.05, s * 0.8 - 0.02, x + 0.14, 1.33, s * 0.8 + 0.02, 0x6a4a28, s > 0 ? 'S' : 'N', 1.6);
  g.box(-0.1, 1.65, -0.7, 0.9, 2.6, 0.7, BUFF, { faces: 'NESW' });
  lamp(g, -0.05, 2.0, -0.72, 0.85, 2.4, 0.72, LIT_GLASS, 'NS', 1.5);
  lamp(g, 0.9, 2.0, -0.6, 0.93, 2.4, 0.6, LIT_GLASS, 'E', 1.5);
  g.box(-0.2, 2.6, -0.8, 1.0, 2.7, 0.8, 0x2a2c31, { faces: 'NESWTB' });
  g.beam([0.4, 2.7, 0], [0.4, 3.4, 0], 0.04, 0.035, 0xc9ccd0);
  lamp(g, 0.32, 3.4, -0.08, 0.48, 3.55, 0.08, LAMP);
  // the stack
  g.cyl(-0.8, 0, 1.65, 2.9, 0.32, 0.31, 8, BUFF, { cap: false });
  g.cyl(-0.8, 0, 2.9, 3.25, 0.335, 0.335, 8, 0xa8302a, { cap: false });
  g.cyl(-0.8, 0, 3.25, 3.75, 0.335, 0.335, 8, 0x1a1b1d, { cap: 0x0e0e10 });
  g.box(-2.45, F, -0.16, -2.15, 1.02, 0.16, 0x2a2c31, { faces: 'NESWT' });
  crew(g, -1.9, 0.6, F, 0x3f5a7a, 0x8a2f2a);
  return g;
}

/** The barge: a rusty, blunt hull, a coaming round its hold, a heap of coal in it, and a red lamp on a post at its stern. */
function bargeBody(): GeoBuilder {
  const g = new GeoBuilder(), L = TUG.bargeL, half = TUG.bargeHalf, F = 0.55;
  hull(g, { L, half, free: F, rise: 0.1, bow: 0.75, strakes: [[0.1, 0x5a2a22], [0, 0x3a2e2a]], deck: 0x4a3f38 });
  const x0 = -L / 2 + 0.5, x1 = L / 2 - 0.8, w = half - 0.2, c = 0.85;
  g.box(x0, F, -w, x1, c, w, 0x6a4a36, { faces: 'NESWT', top: 0x5a3e2e });
  // the coal, heaped in the hold
  const b = (x: number, z: number, y: number): V3 => [x, y, z];
  const bx0 = x0 + 0.15, bx1 = x1 - 0.15, bw = w - 0.12, tx0 = x0 + 1.0, tx1 = x1 - 1.0, tw = 0.5, ty = 1.75, COAL = 0x26272a;
  face(g, b(bx0, bw, c), b(bx1, bw, c), b(tx1, tw, ty), b(tx0, tw, ty), COAL, [0, 1, 1]);
  face(g, b(bx0, -bw, c), b(bx1, -bw, c), b(tx1, -tw, ty), b(tx0, -tw, ty), COAL, [0, 1, -1]);
  face(g, b(bx1, -bw, c), b(bx1, bw, c), b(tx1, tw, ty), b(tx1, -tw, ty), COAL, [1, 1, 0]);
  face(g, b(bx0, -bw, c), b(bx0, bw, c), b(tx0, tw, ty), b(tx0, -tw, ty), COAL, [-1, 1, 0]);
  face(g, b(tx0, -tw, ty), b(tx1, -tw, ty), b(tx1, tw, ty), b(tx0, tw, ty), 0x2e2f33, [0, 1, 0]);
  g.box(-L / 2 + 0.15, F, -0.05, -L / 2 + 0.25, 1.5, 0.05, 0xb4bac2, { faces: 'NESW' });
  lamp(g, -L / 2 + 0.08, 1.5, -0.1, -L / 2 + 0.32, 1.72, 0.1, 0xff3a2a);
  g.box(L / 2 - 0.6, F, -0.18, L / 2 - 0.3, 0.85, 0.18, 0x2a2c31, { faces: 'NESWT' });
  return g;
}

/**
 * The police's harbour patrol: a dark navy hull with a white band where a word
 * would be, a cabin with its windows lit and a bar of lamps on its roof, red
 * and blue, a searchlight, a radar on a short mast, two outboards at her
 * transom, and an officer aft.
 */
function patrolBody(): GeoBuilder {
  const g = new GeoBuilder(), { L, half } = PATROL, F = 0.75, NAVY = 0x1c2840;
  hull(g, { L, half, free: F, strakes: [[0.1, 0x6e2a26], [-0.32, NAVY], [-0.12, 0xe8e8e4], [0, NAVY]], deck: 0x5a5f66 });
  g.box(-0.6, F, -0.85, 1.4, 1.9, 0.85, 0xc9cdd3, { faces: 'NESW' });
  lamp(g, -0.45, 1.3, -0.87, 1.25, 1.7, 0.87, LIT_GLASS, 'NS', 1.4);
  lamp(g, 1.4, 1.25, -0.7, 1.43, 1.7, 0.7, LIT_GLASS, 'E', 1.4);
  g.box(-0.75, 1.9, -0.95, 1.55, 2.0, 0.95, 0x262c36, { faces: 'NESWTB' });
  g.box(0.2, 2.0, -0.62, 0.5, 2.08, 0.62, 0x2a2c31, { faces: 'NESWT' });
  lamp(g, 0.22, 2.08, -0.6, 0.48, 2.3, -0.02, 0xff2a2a, 'NESWT', 3.2);
  lamp(g, 0.22, 2.08, 0.02, 0.48, 2.3, 0.6, 0x2f6bff, 'NESWT', 3.2);
  g.beam([-0.3, 2.0, 0], [-0.3, 2.9, 0], 0.04, 0.035, 0xc9ccd0);
  g.box(-0.36, 2.9, -0.5, -0.24, 2.98, 0.5, 0xd8dce0, { faces: 'NESWTB' });
  g.cyl(1.2, 0, 2.0, 2.22, 0.16, 0.16, 8, 0x2c3036);
  lamp(g, 1.36, 2.03, -0.1, 1.38, 2.2, 0.1, LAMP, 'E', 2.5);
  for (const s of [-0.5, 0.5]) g.box(-L / 2 - 0.35, 0.25, s - 0.2, -L / 2 + 0.05, 1.25, s + 0.2, 0x2a2c31, { faces: 'NESWTB' });
  crew(g, -1.9, 0.3, F, NAVY, NAVY);
  return g;
}

/** A boat's wake: two pale arms spreading back from its stern, flat on the water. Its own origin is at the stern, so it can be stretched by the boat's speed. */
function wakeBody(half: number): GeoBuilder {
  const g = new GeoBuilder(), y = 0.06, W = 0x93b2c4;
  for (const s of [-1, 1]) face(g, [0, y, s * half * 0.75], [0, y, s * half * 0.95], [-3.2, y, s * (half + 1.1)], [-3.2, y, s * (half + 0.8)], W, [0, 1, 0]);
  face(g, [0, y, -half * 0.55], [0, y, half * 0.55], [-2.2, y, half * 0.3], [-2.2, y, -half * 0.3], 0xa4bfcd, [0, 1, 0]);
  return g;
}

/** A mesh of its own for a thing that moves: lit as the tile is, casting no shadow, never culled. */
function mover(k: Build, mat: THREE.Material, g: GeoBuilder, name: string): THREE.Mesh {
  const mesh = new THREE.Mesh(g.build(), mat);
  mesh.name = name;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  k.group.add(mesh);
  return mesh;
}

/** Stands a boat where its pose says, rocking a little on the water. */
function stand(m: THREE.Object3D, p: Pose, t: number, seed: number): void {
  m.position.set(p.x, Y.water + 0.04 * Math.sin(t * 1.3 + seed), p.z);
  m.rotation.set(0.016 * Math.sin(t * 0.9 + seed), -p.yaw, 0.01 * Math.sin(t * 1.1 + seed * 2), 'YZX');
}

/** Builds the boats and sets them going. `hold(t)` stands them as they are at `t` seconds, and `hold(null)` lets them go. */
export function buildBoats(k: Build): { hold(t: number | null): void } {
  let held: number | null = null;
  const mat = k.mat.city();
  const launch = mover(k, mat, launchBody(), 'blackgate-launch');
  const tug = mover(k, mat, tugBody(), 'tug');
  const barge = mover(k, mat, bargeBody(), 'barge');
  const patrol = mover(k, mat, patrolBody(), 'harbour-patrol');
  const wakes = ([[launch, LAUNCH.L, LAUNCH.half], [tug, TUG.L, TUG.half], [barge, TUG.bargeL, TUG.bargeHalf], [patrol, PATROL.L, PATROL.half]] as [THREE.Mesh, number, number][]).map(([m, L, h]) => {
    const w = new THREE.Mesh(wakeBody(h).build(), mat);
    w.position.x = -L / 2;
    w.frustumCulled = false;
    m.add(w);
    return w;
  });
  // the towline: a bar a unit long along x, stretched from the tug's bitt to the barge's bow each frame
  const towG = new GeoBuilder();
  towG.box(0, -0.035, -0.035, 1, 0.035, 0.035, 0xd8cfb8, { faces: 'NSTB' });
  const tow = mover(k, mat, towG, 'towline');
  // smoke from the tug's stack
  const smoke = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 40);
  k.group.add(smoke.mesh);
  const puffAt = new THREE.Vector3(), drift = new THREE.Vector3();
  let puffIn = 0;

  k.each((dt, time) => {
    const t = held ?? time;
    const l = launchAt(t), g = tugAt(t, TUG_PHASE), b = tugAt(t, TUG_PHASE, TUG.gap), p = patrolAt(t);
    stand(launch, l, t, 0);
    stand(tug, g, t, 1.7);
    stand(barge, b, t, 3.1);
    stand(patrol, p, t, 4.4);
    [l, g, b, p].forEach((q, i) => {
      const f = Math.min(1, Math.max(0, q.v) / 2.5);
      wakes[i].visible = f > 0.05;
      wakes[i].scale.set(f, 1, 0.6 + 0.4 * f);
    });
    // the towline, from the tug's bitt to the barge's bow, sagging a little below both
    const ax = g.x - Math.cos(g.yaw) * (TUG.L / 2 - 0.35), az = g.z - Math.sin(g.yaw) * (TUG.L / 2 - 0.35);
    const bx = b.x + Math.cos(b.yaw) * (TUG.bargeL / 2 - 0.45), bz = b.z + Math.sin(b.yaw) * (TUG.bargeL / 2 - 0.45);
    tow.position.set(ax, Y.water + 0.95, az);
    tow.rotation.set(0, -Math.atan2(bz - az, bx - ax), -0.06, 'YZX');
    tow.scale.set(Math.hypot(bx - ax, bz - az), 1, 1);
    // a puff of smoke from the stack now and then, but not under the bridge's deck
    puffIn -= dt;
    if (held === null && puffIn <= 0) {
      puffIn = 0.45;
      const sx = g.x - Math.cos(g.yaw) * 0.8, sz = g.z - Math.sin(g.yaw) * 0.8;
      if (Math.abs(bySprang(sx, sz).t - BRIDGE.t) > BRIDGE.half + 1.5) {
        smoke.puff(puffAt.set(sx, Y.water + 3.85, sz), drift.set(-Math.cos(g.yaw) * 0.4, 0.15, -Math.sin(g.yaw) * 0.4), 0.45, 0.5);
      }
    }
    smoke.update(dt);
  });

  if (import.meta.env.DEV) {
    checkBoats();
    const w = window as unknown as { gothamTraffic: object; gothamBoats: object };
    w.gothamTraffic = trafficLine(k);
    w.gothamBoats = { hold: (t: number | null) => { held = t; }, launchAt, tugAt: (t: number) => tugAt(t, TUG_PHASE), bargeAt: (t: number) => tugAt(t, TUG_PHASE, TUG.gap), patrolAt, cycle: LAUNCH_CYCLE, triangles: () => Object.fromEntries([launch, tug, barge, patrol, tow, ...wakes].map((m) => [m.name || 'wake', m.geometry.getAttribute('position').count / 3])) };
  }
  return { hold(t) { held = t; } };
}

// ---------------------------------------------------------------------------
// Checking, on the development server
// ---------------------------------------------------------------------------

/** A boat's outline as points: round its hull and through its middle. */
function outline(p: Pose, L: number, h: number): P2[] {
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw), out: P2[] = [];
  for (let i = 0; i <= 6; i++) for (const v of [-h, 0, h]) {
    const u = -L / 2 + (L * i) / 6;
    out.push([p.x + u * c - v * s, p.z + u * s + v * c]);
  }
  return out;
}

/**
 * Goes round each boat's way and says in the console how near each comes to
 * the land, the Iceberg Casino, the freighter, the fish jetty, the pier, the
 * Statue of Justice's islet and Blackgate, and to each other; and warns where
 * one comes onto any of them.
 */
function checkBoats(): void {
  const A = SPRANG_ALONG, X = SPRANG_ACROSS, c = CASINO.c, hl = CASINO.length / 2, hb = CASINO.beam / 2;
  const rect = (cx: number, cz: number, a: number, b: number): P2[] => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]): P2 => [cx + A[0] * a * i + X[0] * b * j, cz + A[1] * a * i + X[1] * b * j]);
  const box = (x0: number, z0: number, x1: number, z1: number): P2[] => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  const J = STAGES.fishJetty;
  const things: [string, P2[]][] = [
    ['the land', LANDS.west], ['the docks', LANDS.east], ['the islet', LANDS.justice], ['Blackgate', LANDS.blackgate],
    ['the casino', rect(c[0], c[1], hl, hb)], ['the freighter', box(84, 60, 103, 66)], ['the fish jetty', box(J.x0, J.z0, J.x1, J.z1)], ['the pier', box(PIER.x0, PIER.z0, PIER.x1, PIER.z1)],
  ];
  const dist = (pts: P2[], shape: P2[]): number => Math.min(...pts.map(([x, z]) => (inside(shape, x, z) ? 0 : toEdge(shape, x, z))));
  const lines: string[] = [];
  const boats: [string, (t: number) => Pose, number, number, number][] = [
    ['the launch', launchAt, LAUNCH.L, LAUNCH.half, LAUNCH_CYCLE],
    ['the tug', (t) => tugAt(t, TUG_PHASE), TUG.L, TUG.half, TUG.lap],
    ['the barge', (t) => tugAt(t, TUG_PHASE, TUG.gap), TUG.bargeL, TUG.bargeHalf, TUG.lap],
    ['the patrol', patrolAt, PATROL.L, PATROL.half, PATROL_LINE.length / PATROL.v],
  ];
  for (const [what, at, L, h, T] of boats) {
    const least = new Map<string, number>();
    for (let t = 0; t < T; t += 0.5) {
      const p = at(t), pts = outline(p, L, h);
      // the launch at her berths and backing out of them lies alongside: only her way between is counted
      const berthing = what === 'the launch' && (Math.hypot(p.x - LAUNCH_LINE.corners[0][0], p.z - LAUNCH_LINE.corners[0][1]) < 6 || Math.hypot(p.x - LAUNCH_LINE.corners[6][0], p.z - LAUNCH_LINE.corners[6][1]) < 4);
      for (const [name, shape] of things) {
        const d = dist(pts, shape);
        if (!berthing) least.set(name, Math.min(least.get(name) ?? Infinity, d));
        if (d === 0 && !berthing) console.warn(`Gotham: ${what} comes onto ${name} at (${p.x.toFixed(1)}, ${p.z.toFixed(1)}).`);
      }
    }
    lines.push(`${what} comes ${[...least].map(([n, d]) => `${d.toFixed(1)} from ${n}`).join(', ')}`);
  }
  // and each other
  const pairs: [number, number][] = [[0, 1], [0, 2], [0, 3], [1, 3], [2, 3]];
  const near = pairs.map(([i, j]) => {
    let least = Infinity;
    for (let t = 0; t < LAUNCH_CYCLE * 2; t += 0.25) least = Math.min(least, between(boats[i][1](t), boats[i][2], boats[i][3], boats[j][1](t), boats[j][2], boats[j][3]));
    if (least < 0.5) console.warn(`Gotham: ${boats[i][0]} and ${boats[j][0]} come within ${least.toFixed(1)} of each other.`);
    return `${boats[i][0]} and ${boats[j][0]} ${least.toFixed(1)}`;
  });
  console.info(`Gotham, the boats: ${lines.join('; ')}. Between them, at least: ${near.join(', ')}. The launch's crossing takes ${LAUNCH_CYCLE.toFixed(0)} s; the tug makes ${TUG.rounds} rounds of ${TUG.lap.toFixed(0)} s in it at ${TUG_V.toFixed(2)} a second, and starts ${TUG_PHASE} s into her round.`);
}

/** For looking at the kinds: one of each, parked in a row on the docks' apron, facing south. */
function trafficLine(k: Build): { line(): void; clear(): void } {
  const shown: THREE.Object3D[] = [];
  const clear = (): void => {
    for (const m of shown) m.removeFromParent();
    shown.length = 0;
  };
  const line = (): void => {
    clear();
    const A = SHOW_LANES.apron, turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -PI / 2), one = new THREE.Vector3(1, 1, 1);
    KINDS.forEach((kind, i) => {
      const geo = kind.geo.clone();
      geo.setAttribute('aLit', new THREE.InstancedBufferAttribute(new Float32Array([0]), 1));
      const m = new THREE.InstancedMesh(geo, k.mat.vehicle(), 1);
      m.setMatrixAt(0, new THREE.Matrix4().compose(new THREE.Vector3(A.x0 + 2 + i * 4.4, A.y, A.z), turn, one));
      m.setColorAt(0, new THREE.Color(kind.colors[0]));
      m.frustumCulled = false;
      m.name = `show-${kind.name}`;
      k.group.add(m);
      shown.push(m);
    });
  };
  return { line, clear };
}
